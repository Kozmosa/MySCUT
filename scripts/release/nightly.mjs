// nightly 通道发布引擎：把已构建签名的 nightly APK 上传到 R2 并生成/上传 nightly 更新清单。
// 由 .github/workflows/nightly.yml 在构建签名、创建 GitHub prerelease 之后调用。
// 环境变量：R2_*（必需）、APK_PATH（已签名 APK 路径）、NIGHTLY_RELEASE_URL（GitHub
// prerelease 页面地址，写入清单供应用内跳转）、GITHUB_RUN_NUMBER / GITHUB_SHA（清单元数据）。
// R2 布局：nightly/history/<stamp>/ 存版本化产物（7 天生命周期规则清理），
// nightly/latest/qmm-nightly.apk 与 nightly/versions.json 为永久覆盖的当前指针。
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { releaseArtifactDir, rootDir } from './constants.mjs'
import {
  buildNightlyHistoryApkObjectKey,
  buildNightlyLatestApkObjectKey,
  buildNightlyManifestObjectKey,
  buildR2PublicUrl,
  uploadAndVerifyReleaseAssetToR2,
} from './r2.mjs'
import { loadR2Config } from './r2Config.mjs'
import { calculateFileMetadata } from './shared.mjs'

const REPO_SLUG = 'Kozmosa/MySCUT'

function requireEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function resolveCommitSha() {
  if (process.env.GITHUB_SHA?.trim()) {
    return process.env.GITHUB_SHA.trim()
  }
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: rootDir, encoding: 'utf8' }).trim()
}

function buildNightlyIdentity() {
  const sha = resolveCommitSha()
  const sha7 = sha.slice(0, 7)
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const stamp = `${date}-${sha7}`
  return {
    sha,
    stamp,
    tag: `nightly-${stamp}`,
    version: `0.0.0-nightly.${date}.${sha7}`,
  }
}

async function main() {
  const apkPath = resolve(rootDir, requireEnv('APK_PATH'))
  if (!existsSync(apkPath) || !apkPath.toLowerCase().endsWith('.apk')) {
    throw new Error(`Invalid APK path: ${apkPath}`)
  }

  const r2Config = loadR2Config()
  const releaseUrl = requireEnv('NIGHTLY_RELEASE_URL')
  const { sha, stamp, tag, version } = buildNightlyIdentity()

  const apkFileName = `qmm-nightly-${stamp}.apk`
  const historyKey = buildNightlyHistoryApkObjectKey({ keyPrefix: r2Config.keyPrefix, stamp, fileName: apkFileName })
  const latestKey = buildNightlyLatestApkObjectKey({ keyPrefix: r2Config.keyPrefix, fileName: 'qmm-nightly.apk' })
  const manifestKey = buildNightlyManifestObjectKey({ keyPrefix: r2Config.keyPrefix })
  const historyUrl = buildR2PublicUrl({ publicBaseUrl: r2Config.publicBaseUrl, objectKey: historyKey })
  const latestUrl = buildR2PublicUrl({ publicBaseUrl: r2Config.publicBaseUrl, objectKey: latestKey })
  const githubAssetUrl = `https://github.com/${REPO_SLUG}/releases/download/${tag}/${apkFileName}`

  const metadata = calculateFileMetadata(apkPath)
  const manifest = {
    latest: {
      version,
      tag,
      publishedAt: new Date().toISOString(),
      commit: sha,
      releaseUrl,
      assets: {
        apk: [
          { source: 'r2', url: latestUrl, size: metadata.size, sha256: metadata.sha256 },
          { source: 'github', url: githubAssetUrl, size: metadata.size, sha256: metadata.sha256 },
        ],
      },
    },
  }

  mkdirSync(releaseArtifactDir, { recursive: true })
  const manifestPath = resolve(releaseArtifactDir, 'nightly-versions.json')
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

  console.log(`nightly ${version} (${stamp})`)
  console.log(`Uploading history APK: ${historyUrl}`)
  await uploadAndVerifyReleaseAssetToR2({ localFilePath: apkPath, objectKey: historyKey, r2Config })
  console.log(`Uploading latest APK: ${latestUrl}`)
  await uploadAndVerifyReleaseAssetToR2({ localFilePath: apkPath, objectKey: latestKey, r2Config })
  const uploadedManifest = await uploadAndVerifyReleaseAssetToR2({
    localFilePath: manifestPath,
    objectKey: manifestKey,
    r2Config,
  })
  console.log(`Uploaded nightly manifest: ${uploadedManifest.url}`)

  rmSync(manifestPath, { force: true })
  console.log(`nightly published: ${releaseUrl}`)
  console.log(`local APK for release asset: ${basename(apkPath)}`)
}

await main()
