import { existsSync } from 'node:fs'
import {
  packageJsonPath,
  packageLockJsonPath,
  VERSION_PATTERN,
  versionsJsonPath,
} from './constants.mjs'
import { readJson, writeJson } from './shared.mjs'

export function compareVersions(left, right) {
  const leftParts = left.split('.').map((part) => Number(part))
  const rightParts = right.split('.').map((part) => Number(part))

  for (let index = 0; index < 3; index += 1) {
    const leftValue = leftParts[index]
    const rightValue = rightParts[index]

    if (leftValue > rightValue) {
      return 1
    }

    if (leftValue < rightValue) {
      return -1
    }
  }

  return 0
}

function readVersionsData() {
  if (!existsSync(versionsJsonPath)) {
    return {
      latest: null,
      versions: {},
    }
  }

  const content = readJson(versionsJsonPath)
  const versions = typeof content.versions === 'object' && content.versions ? content.versions : {}
  return {
    latest: content.latest ?? null,
    versions,
  }
}

export function validateTargetVersion(nextVersion) {
  if (!nextVersion) {
    throw new Error(
      'Missing version code. Usage: npm run release -- <version_code> --android --ios --note-file <path>',
    )
  }

  if (!VERSION_PATTERN.test(nextVersion)) {
    throw new Error(`Invalid version code: ${nextVersion}. Expected format: x.y.z`)
  }

  const packageJson = readJson(packageJsonPath)
  const currentVersion = String(packageJson.version || '')
  if (!VERSION_PATTERN.test(currentVersion)) {
    throw new Error(`Current package.json version is invalid: ${currentVersion}`)
  }

  if (compareVersions(nextVersion, currentVersion) <= 0) {
    throw new Error(
      `Version must be greater than current version. Current: ${currentVersion}, requested: ${nextVersion}. Please check and rerun.`,
    )
  }

  return {
    packageJson,
    currentVersion,
  }
}

export function updatePackageVersionFiles(packageJson, nextVersion) {
  packageJson.version = nextVersion
  writeJson(packageJsonPath, packageJson)

  const packageLockJson = readJson(packageLockJsonPath)
  packageLockJson.version = nextVersion
  if (packageLockJson.packages?.['']) {
    packageLockJson.packages[''].version = nextVersion
  }
  writeJson(packageLockJsonPath, packageLockJson)
}

function toAssetEntry(source, url, metadata) {
  if (!url) {
    return null
  }

  return {
    source,
    url,
    ...(metadata ? {
      size: metadata.size,
      sha256: metadata.sha256,
    } : {}),
  }
}

export function updateVersionsJson({
  version,
  tag,
  owner,
  repo,
  hasAndroidAsset,
  hasIosAsset,
  r2AssetUrls,
  assetMetadata,
  publishedAt = new Date().toISOString(),
}) {
  const baseDownloadUrl = `https://github.com/${owner}/${repo}/releases/download/${tag}`
  const apkName = `qmm-v${version}.apk`
  const ipaName = `qmm-v${version}.ipa`
  const versionsName = 'versions.json'
  const githubVersionsUrl = `${baseDownloadUrl}/${versionsName}`

  const assets = {
    versions: r2AssetUrls?.versions || githubVersionsUrl,
  }

  if (hasAndroidAsset) {
    const apkEntries = [
      toAssetEntry('r2', r2AssetUrls?.apk || '', assetMetadata?.apk),
      toAssetEntry('github', `${baseDownloadUrl}/${apkName}`, assetMetadata?.apk),
    ].filter(Boolean)

    if (apkEntries.length > 0) {
      assets.apk = apkEntries
    }
  }

  if (hasIosAsset) {
    const ipaEntries = [
      toAssetEntry('r2', r2AssetUrls?.ipa || '', assetMetadata?.ipa),
      toAssetEntry('github', `${baseDownloadUrl}/${ipaName}`, assetMetadata?.ipa),
    ].filter(Boolean)

    if (ipaEntries.length > 0) {
      assets.ipa = ipaEntries
    }
  }

  const nextVersionData = {
    version,
    tag,
    publishedAt,
    releaseUrl: `https://github.com/${owner}/${repo}/releases/tag/${tag}`,
    assets,
  }

  const previous = readVersionsData()
  const next = {
    latest: {
      version,
      tag,
      publishedAt,
      releaseUrl: nextVersionData.releaseUrl,
      assets: {
        ...nextVersionData.assets,
        versions: r2AssetUrls?.latestVersions || nextVersionData.assets.versions,
      },
    },
    versions: {
      ...previous.versions,
      [version]: nextVersionData,
    },
  }

  writeJson(versionsJsonPath, next)
}
