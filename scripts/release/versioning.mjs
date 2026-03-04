import { existsSync } from 'node:fs'
import { packageJsonPath, VERSION_PATTERN, versionsJsonPath } from './constants.mjs'
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
      'Missing version code. Usage: npm run release <version_code> --android --ios --note "- New UI"',
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

export function updatePackageVersion(packageJson, nextVersion) {
  packageJson.version = nextVersion
  writeJson(packageJsonPath, packageJson)
}

export function updateVersionsJson({ version, tag, owner, repo, hasAndroidAsset, hasIosAsset }) {
  const baseDownloadUrl = `https://github.com/${owner}/${repo}/releases/download/${tag}`
  const apkName = `qmm-v${version}.apk`
  const ipaName = `qmm-v${version}.ipa`
  const versionsName = 'versions.json'
  const publishedAt = new Date().toISOString()

  const assets = {
    versions: `${baseDownloadUrl}/${versionsName}`,
  }

  if (hasAndroidAsset) {
    assets.apk = `${baseDownloadUrl}/${apkName}`
  }

  if (hasIosAsset) {
    assets.ipa = `${baseDownloadUrl}/${ipaName}`
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
      },
    },
    versions: {
      ...previous.versions,
      [version]: nextVersionData,
    },
  }

  writeJson(versionsJsonPath, next)
}
