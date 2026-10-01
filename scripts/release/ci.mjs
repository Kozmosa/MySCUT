// 非交互 CI 发版编排：在 GitHub Actions runner（或本地）复用 scripts/release 模块完成
// stable 版本发布。与 scripts/release/main.mjs 的差异：
// - 无任何交互确认点；APK 用 gradle CLI 构建并以 secret 提供的 keystore 签名
// - manual 子模块漂移自动预提交（todoSnapshot + gitlink），消除本地发版的人工纪律
// - 发版成功后清理 R2 上一版前缀，只保留最新 stable
// 环境变量：R2_*（必需）、KEYSTORE_STABLE（base64）、KEYSTORE_STABLE_PASS（必需），
// KEYSTORE_STABLE_CERT_SHA256（可选，提供时签名后校验证书指纹）、GH_TOKEN（gh 与推送凭证）。
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import {
  manualSubmodulePath,
  releaseArtifactDir,
  rootDir,
  versionsJsonPath,
  VERSION_PATTERN,
} from './constants.mjs'
import {
  ensureCleanWorktree,
  ensureGitHubAuth,
  ensureMainBranch,
  ensureTagNotExists,
  getGitStatusSnapshot,
  parseStatusPaths,
  stageCommitAndTag,
} from './gitFlow.mjs'
import { publishGithubRelease } from './githubRelease.mjs'
import { resolveReleaseNote, writeReleaseNoteFile } from './notes.mjs'
import {
  buildR2LatestVersionsObjectKey,
  buildR2PublicUrl,
  buildR2ReleaseObjectKey,
  deleteR2ObjectsWithPrefix,
  uploadAndVerifyReleaseAssetToR2,
} from './r2.mjs'
import { loadR2Config } from './r2Config.mjs'
import { calculateFileMetadata, runFile, runFileSilently } from './shared.mjs'
import {
  updatePackageVersionFiles,
  updateVersionsJson,
  validateTargetVersion,
} from './versioning.mjs'

const DRIFT_PATHS = ['external/survive-in-scut', 'src/generated/todoSnapshot.ts']

function parseCiArgs(argv) {
  let version = ''
  let noteFile = ''
  let minVersion = ''

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (!version && VERSION_PATTERN.test(arg)) {
      version = arg
      continue
    }
    if (arg.startsWith('--note-file=')) {
      noteFile = arg.slice('--note-file='.length)
      continue
    }
    if (arg.startsWith('--min-version=')) {
      minVersion = arg.slice('--min-version='.length)
    }
  }

  return { version, noteFile: noteFile || `.release-notes/v${version}.md`, minVersion }
}

function requireEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function runGradle(args, env = {}) {
  const gradlew = resolve(rootDir, 'android', process.platform === 'win32' ? 'gradlew.bat' : 'gradlew')
  if (process.platform === 'win32') {
    runFile('cmd.exe', ['/c', gradlew, ...args], resolve(rootDir, 'android'), env)
    return
  }
  runFile(gradlew, args, resolve(rootDir, 'android'), env)
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

function ensureGitIdentity() {
  const existingEmail = runFileSilently('git', ['config', 'user.email'], rootDir).trim()
  if (existingEmail) {
    return
  }

  process.env.GIT_AUTHOR_NAME ||= 'MySCUT Release CI'
  process.env.GIT_AUTHOR_EMAIL ||= '41898282+github-actions[bot]@users.noreply.github.com'
  process.env.GIT_COMMITTER_NAME ||= process.env.GIT_AUTHOR_NAME
  process.env.GIT_COMMITTER_EMAIL ||= process.env.GIT_AUTHOR_EMAIL
}

function commitManualDriftIfAny() {
  const changedPaths = parseStatusPaths(getGitStatusSnapshot())
  const drifted = DRIFT_PATHS.filter((path) => changedPaths.includes(path))
  if (drifted.length === 0) {
    return false
  }

  const unexpected = changedPaths.filter((path) => !DRIFT_PATHS.includes(path))
  if (unexpected.length > 0) {
    throw new Error(`Unexpected changes besides manual drift:\n${unexpected.join('\n')}`)
  }

  const manualShortSha = runFileSilently('git', ['rev-parse', '--short', 'HEAD'], manualSubmodulePath)
  runFile('git', ['add', '--', ...DRIFT_PATHS], rootDir)
  runFile('git', ['commit', '-m', `chore(manual): bump survive-in-scut to ${manualShortSha}`], rootDir)
  console.log(`Pre-committed manual drift (survive-in-scut ${manualShortSha})`)
  return true
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

async function main() {
  const { version: nextVersion, noteFile, minVersion } = parseCiArgs(process.argv.slice(2))
  if (!nextVersion) {
    throw new Error('Missing version code. Usage: npm run release:ci -- <version_code> [--note-file <path>] [--min-version <version>]')
  }
  const { packageJson, currentVersion } = validateTargetVersion(nextVersion)
  const tag = `v${nextVersion}`

  const note = resolveReleaseNote({ note: '', noteFile })
  const r2Config = loadR2Config()

  ensureMainBranch()
  ensureTagNotExists(tag)
  ensureCleanWorktree()
  ensureGitHubAuth()
  ensureGitIdentity()

  runFile('git', ['submodule', 'update', '--init', '--recursive'], rootDir)

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

  updatePackageVersionFiles(packageJson, nextVersion)
  updateVersionsJson({
    version: nextVersion,
    tag,
    owner: 'Kozmosa',
    repo: 'MySCUT',
    hasAndroidAsset: true,
    hasIosAsset: false,
    r2AssetUrls,
    minVersion,
    publishedAt,
  })
  runFile('node', ['scripts/syncNativeVersion.mjs'], rootDir)
  runFile('npm', ['run', 'check'], rootDir)

  commitManualDriftIfAny()

  runFile('npm', ['run', 'build:android'], rootDir)
  const signedApk = buildSignAndCollectApk(nextVersion)

  updateVersionsJson({
    version: nextVersion,
    tag,
    owner: 'Kozmosa',
    repo: 'MySCUT',
    hasAndroidAsset: true,
    hasIosAsset: false,
    r2AssetUrls,
    assetMetadata: { apk: calculateFileMetadata(signedApk) },
    minVersion,
    publishedAt,
  })

  const noteFilePath = writeReleaseNoteFile({ tag, content: note })

  console.log(`Uploading APK to R2: ${r2AssetUrls.apk}`)
  await uploadAndVerifyReleaseAssetToR2({ localFilePath: signedApk, objectKey: apkObjectKey, r2Config })
  await uploadAndVerifyReleaseAssetToR2({ localFilePath: versionsJsonPath, objectKey: versionedManifestKey, r2Config })
  await uploadAndVerifyReleaseAssetToR2({ localFilePath: versionsJsonPath, objectKey: latestManifestKey, r2Config })

  const repoSlug = 'Kozmosa/MySCUT'
  stageCommitAndTag({ version: nextVersion, tag, noteFilePath })
  publishGithubRelease({
    tag,
    repoSlug,
    assetPaths: [signedApk, versionsJsonPath],
    noteFilePath,
  })

  if (currentVersion !== nextVersion) {
    const previousPrefix = buildR2ReleaseObjectKey({ keyPrefix, version: currentVersion, fileName: '' })
    const removed = await deleteR2ObjectsWithPrefix({ r2Config, prefix: previousPrefix })
    console.log(`Removed ${removed} R2 objects of previous version prefix: ${previousPrefix}`)
  }

  rmSync(releaseArtifactDir, { recursive: true, force: true })
  console.log(`Release published and verified: https://github.com/${repoSlug}/releases/tag/${tag}`)
}

await main()
