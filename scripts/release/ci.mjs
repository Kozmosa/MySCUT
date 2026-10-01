// 发版第二阶段（GitHub Actions runner 执行）：从已推送的 bump commit 构建、签名并发布。
// 前置：维护者已通过 scripts/release/prepare.mjs 提交 bump commit 并推送 tag vX。
// 本脚本不向 main 推送任何内容；versions.json 的最终 size/sha256 只写入 R2 清单与
// GitHub Release 资产，仓库中的骨架 versions.json 保持维护者提交的形态。
// 环境变量：R2_*（必需）、KEYSTORE_STABLE（base64）、KEYSTORE_STABLE_PASS（必需），
// KEYSTORE_STABLE_CERT_SHA256（可选，提供时签名后校验证书指纹）、GH_TOKEN（gh 凭证）。
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import {
  releaseArtifactDir,
  releaseNotesDir,
  rootDir,
  VERSION_PATTERN,
  versionsJsonPath,
} from './constants.mjs'
import {
  ensureCleanWorktree,
  ensureGitHubAuth,
  ensureMainBranch,
  ensureTagExists,
} from './gitFlow.mjs'
import { publishGithubRelease } from './githubRelease.mjs'
import {
  buildR2LatestVersionsObjectKey,
  buildR2PublicUrl,
  buildR2ReleaseObjectKey,
  deleteR2ObjectsWithPrefix,
  uploadAndVerifyReleaseAssetToR2,
} from './r2.mjs'
import { loadR2Config } from './r2Config.mjs'
import { calculateFileMetadata, readJson, runFile, runFileSilently } from './shared.mjs'
import { compareVersions, updateVersionsJson } from './versioning.mjs'

const REPO_SLUG = 'Kozmosa/MySCUT'

function requireEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function resolveTaggedVersion(argv) {
  const version = argv.find((arg) => VERSION_PATTERN.test(arg)) ?? ''
  if (!version) {
    throw new Error('Missing version code. Usage: npm run release:ci -- <version_code>')
  }
  return version
}

function assertBumpCommitReady({ nextVersion, tag }) {
  const packageVersion = String(readJson(resolve(rootDir, 'package.json')).version ?? '')
  if (packageVersion !== nextVersion) {
    throw new Error(`package.json version is ${packageVersion}, expected ${nextVersion}. HEAD 不是 v${nextVersion} 的 bump commit。`)
  }

  const versionsData = readJson(versionsJsonPath)
  const latestVersion = String(versionsData?.latest?.version ?? '')
  if (latestVersion !== nextVersion || versionsData?.latest?.tag !== tag) {
    throw new Error(`versions.json latest is ${latestVersion || '(empty)'}, expected ${nextVersion}/${tag}.`)
  }

  const noteFilePath = resolve(releaseNotesDir, `${tag}.md`)
  if (!existsSync(noteFilePath)) {
    throw new Error(`Release note not found: ${noteFilePath}`)
  }
  return noteFilePath
}

function checkoutTaggedCommitIfDiverged(tag) {
  const tagTarget = runFileSilently('git', ['rev-parse', `${tag}^{commit}`], rootDir)
  const head = runFileSilently('git', ['rev-parse', 'HEAD'], rootDir)
  if (tagTarget === head) {
    return
  }

  console.log(`HEAD is not the ${tag} commit; checking out the tagged tree ${tagTarget.slice(0, 8)}`)
  runFile('git', ['checkout', '--detach', tagTarget], rootDir)
}

function runGradle(args) {
  const gradlew = resolve(rootDir, 'android', process.platform === 'win32' ? 'gradlew.bat' : 'gradlew')
  if (process.platform === 'win32') {
    runFile('cmd.exe', ['/c', gradlew, ...args], resolve(rootDir, 'android'))
    return
  }
  runFile(gradlew, args, resolve(rootDir, 'android'))
}

function resolveBuildToolsDir() {
  const sdkRoot = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT
  if (!sdkRoot) {
    throw new Error('Missing ANDROID_HOME / ANDROID_SDK_ROOT for build-tools lookup')
  }

  const buildToolsRoot = resolve(sdkRoot, 'build-tools')
  const versions = readdirSync(buildToolsRoot)
    .filter((name) => /^\d+(\.\d+)*$/.test(name))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
  const latest = versions[versions.length - 1]
  if (!latest) {
    throw new Error(`No build-tools found under ${buildToolsRoot}`)
  }
  return resolve(buildToolsRoot, latest)
}

function runBuildToolsTool(toolName, args) {
  const buildToolsDir = resolveBuildToolsDir()
  const candidates = process.platform === 'win32'
    ? [resolve(buildToolsDir, `${toolName}.exe`), resolve(buildToolsDir, `${toolName}.bat`)]
    : [resolve(buildToolsDir, toolName), resolve(buildToolsDir, `${toolName}.sh`)]

  const executable = candidates.find((candidate) => existsSync(candidate))
  if (!executable) {
    throw new Error(`${toolName} not found under ${buildToolsDir}`)
  }

  const isBat = extname(executable).toLowerCase() === '.bat'
  if (process.platform === 'win32' && isBat) {
    runFile('cmd.exe', ['/c', executable, ...args], rootDir)
    return
  }
  runFile(executable, args, rootDir)
}

function runCertVerify(signedApk) {
  const buildToolsDir = resolveBuildToolsDir()
  const apksigner = process.platform === 'win32'
    ? resolve(buildToolsDir, 'apksigner.bat')
    : resolve(buildToolsDir, 'apksigner')
  const result = process.platform === 'win32'
    ? execFileSync('cmd.exe', ['/c', apksigner, 'verify', '--print-certs', signedApk], { encoding: 'utf8' })
    : execFileSync(apksigner, ['verify', '--print-certs', signedApk], { encoding: 'utf8' })
  console.log(result)
  return result
}

function buildSignAndCollectApk(nextVersion) {
  runGradle(['assembleStableRelease', '--console=plain'])

  const apkDir = resolve(rootDir, 'android/app/build/outputs/apk/stable/release')
  const unsignedApk = resolve(apkDir, 'app-stable-release-unsigned.apk')
  if (!existsSync(unsignedApk)) {
    throw new Error(`Gradle output not found: ${unsignedApk}`)
  }

  mkdirSync(releaseArtifactDir, { recursive: true })
  const keystorePath = resolve(releaseArtifactDir, 'stable.keystore')
  writeFileSync(keystorePath, Buffer.from(requireEnv('KEYSTORE_STABLE'), 'base64'))
  const keystorePass = requireEnv('KEYSTORE_STABLE_PASS')
  const alignedApk = resolve(releaseArtifactDir, 'app-stable-release-aligned.apk')
  const signedApk = resolve(releaseArtifactDir, `qmm-v${nextVersion}.apk`)

  runBuildToolsTool('zipalign', ['-p', '4', unsignedApk, alignedApk])
  runBuildToolsTool('apksigner', [
    'sign',
    '--ks', keystorePath,
    '--ks-pass', `pass:${keystorePass}`,
    '--key-pass', `pass:${keystorePass}`,
    '--out', signedApk,
    alignedApk,
  ])

  const expectedSha256 = process.env.KEYSTORE_STABLE_CERT_SHA256?.trim()
  if (expectedSha256) {
    const verify = runCertVerify(signedApk)
    if (!verify.replace(/:/g, '').toLowerCase().includes(expectedSha256.replace(/:/g, '').toLowerCase())) {
      throw new Error(`Signing certificate mismatch: expected ${expectedSha256}`)
    }
    console.log('Signing certificate verified')
  }

  rmSync(keystorePath, { force: true })
  rmSync(alignedApk, { force: true })
  return signedApk
}

function assertSkeletonMatchesR2Config({ nextVersion, r2Config }) {
  const versionsData = readJson(versionsJsonPath)
  const apkEntries = Array.isArray(versionsData?.latest?.assets?.apk) ? versionsData.latest.assets.apk : []
  const r2Entry = apkEntries.find((entry) => entry?.source === 'r2')
  const expectedUrl = buildR2PublicUrl({
    publicBaseUrl: r2Config.publicBaseUrl,
    objectKey: buildR2ReleaseObjectKey({
      keyPrefix: r2Config.keyPrefix,
      version: nextVersion,
      fileName: `qmm-v${nextVersion}.apk`,
    }),
  })

  if (r2Entry?.url !== expectedUrl) {
    throw new Error(`versions.json 骨架中的 r2 下载地址 (${r2Entry?.url ?? '(none)'}) 与 CI 的 R2 配置推导结果 (${expectedUrl}) 不一致，请核对本地 R2_ENV 与 repo secrets。`)
  }
}

function resolvePreviousVersion({ nextVersion }) {
  const versionsData = readJson(versionsJsonPath)
  const known = Object.keys(versionsData?.versions ?? {}).filter((version) => version !== nextVersion)
  if (known.length === 0) {
    return ''
  }
  return known.sort((left, right) => compareVersions(left, right))[known.length - 1]
}

async function main() {
  const nextVersion = resolveTaggedVersion(process.argv.slice(2))
  const tag = `v${nextVersion}`

  const r2Config = loadR2Config()

  ensureMainBranch()
  ensureTagExists(tag)
  ensureCleanWorktree()
  ensureGitHubAuth()
  checkoutTaggedCommitIfDiverged(tag)
  const noteFilePath = assertBumpCommitReady({ nextVersion, tag })
  assertSkeletonMatchesR2Config({ nextVersion, r2Config })

  runFile('git', ['submodule', 'update', '--init', '--recursive'], rootDir)
  runFile('npm', ['run', 'check'], rootDir)
  runFile('npm', ['run', 'build:android'], rootDir)
  const signedApk = buildSignAndCollectApk(nextVersion)

  const publishedAt = new Date().toISOString()
  const keyPrefix = r2Config.keyPrefix
  const apkObjectKey = buildR2ReleaseObjectKey({ keyPrefix, version: nextVersion, fileName: `qmm-v${nextVersion}.apk` })
  const versionedManifestKey = buildR2ReleaseObjectKey({ keyPrefix, version: nextVersion, fileName: 'versions.json' })
  const latestManifestKey = buildR2LatestVersionsObjectKey({ keyPrefix })
  const r2AssetUrls = {
    apk: buildR2PublicUrl({ publicBaseUrl: r2Config.publicBaseUrl, objectKey: apkObjectKey }),
    versions: buildR2PublicUrl({ publicBaseUrl: r2Config.publicBaseUrl, objectKey: versionedManifestKey }),
    latestVersions: buildR2PublicUrl({ publicBaseUrl: r2Config.publicBaseUrl, objectKey: latestManifestKey }),
  }
  const committedMinVersion = String(readJson(versionsJsonPath)?.latest?.minVersion ?? '')

  updateVersionsJson({
    version: nextVersion,
    tag,
    owner: REPO_SLUG.split('/')[0],
    repo: REPO_SLUG.split('/')[1],
    hasAndroidAsset: true,
    hasIosAsset: false,
    r2AssetUrls,
    assetMetadata: { apk: calculateFileMetadata(signedApk) },
    minVersion: committedMinVersion,
    publishedAt,
  })

  console.log(`Uploading APK to R2: ${r2AssetUrls.apk}`)
  await uploadAndVerifyReleaseAssetToR2({ localFilePath: signedApk, objectKey: apkObjectKey, r2Config })
  await uploadAndVerifyReleaseAssetToR2({ localFilePath: versionsJsonPath, objectKey: versionedManifestKey, r2Config })
  await uploadAndVerifyReleaseAssetToR2({ localFilePath: versionsJsonPath, objectKey: latestManifestKey, r2Config })

  publishGithubRelease({
    tag,
    repoSlug: REPO_SLUG,
    assetPaths: [signedApk, versionsJsonPath],
    noteFilePath,
  })

  const previousVersion = resolvePreviousVersion({ nextVersion })
  if (previousVersion) {
    const previousPrefix = buildR2ReleaseObjectKey({ keyPrefix, version: previousVersion, fileName: '' })
    const removed = await deleteR2ObjectsWithPrefix({ r2Config, prefix: previousPrefix })
    console.log(`Removed ${removed} R2 objects of previous version prefix: ${previousPrefix}`)
  }

  rmSync(releaseArtifactDir, { recursive: true, force: true })
  console.log(`Release published and verified: https://github.com/${REPO_SLUG}/releases/tag/${tag}`)
  console.log('仓库中的 versions.json 仍为骨架（不含 size/sha256）；如需回退通道也带校验和，可手动提交补全（参考历史 backfill commit）。')
}

await main()
