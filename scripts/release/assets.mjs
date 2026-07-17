import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, extname, resolve } from 'node:path'
import { apkOutputDir, releaseArtifactDir, rootDir } from './constants.mjs'

function walkFiles(dirPath) {
  if (!existsSync(dirPath)) {
    return []
  }

  const entries = readdirSync(dirPath, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = resolve(dirPath, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath))
      continue
    }

    files.push(fullPath)
  }

  return files
}

function ensureNoReleaseAssetConflict(filePath) {
  if (!existsSync(dirname(filePath))) {
    mkdirSync(dirname(filePath), { recursive: true })
  }
}

export function findLatestApk() {
  const files = walkFiles(apkOutputDir)

  const releaseCandidates = []
  const debugCandidates = []

  for (const filePath of files) {
    const fileName = basename(filePath)
    if (fileName === 'app-release.apk') {
      releaseCandidates.push(filePath)
      continue
    }

    if (fileName === 'app-debug.apk') {
      debugCandidates.push(filePath)
    }
  }

  const pickByMtime = (paths) => {
    if (paths.length === 0) {
      return ''
    }

    return [...paths].sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs)[0]
  }

  const preferredRelease = pickByMtime(releaseCandidates)
  if (preferredRelease) {
    return preferredRelease
  }

  const preferredDebug = pickByMtime(debugCandidates)
  if (preferredDebug) {
    return preferredDebug
  }

  throw new Error(
    `No APK file found under ${apkOutputDir}. Build one in Android Studio and try again.`,
  )
}

export function findLatestIpa() {
  const searchRoots = [
    resolve(rootDir, 'ios/App/output'),
    resolve(rootDir, 'ios'),
  ]

  const ipaFiles = []
  for (const dirPath of searchRoots) {
    if (!existsSync(dirPath)) {
      continue
    }

    const files = walkFiles(dirPath)
    for (const filePath of files) {
      if (extname(filePath).toLowerCase() === '.ipa') {
        ipaFiles.push(filePath)
      }
    }
  }

  if (ipaFiles.length === 0) {
    throw new Error('No IPA file found under ios/. Export IPA in Xcode and try again.')
  }

  return [...ipaFiles].sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs)[0]
}

export function prepareAndroidReleaseAsset(nextVersion) {
  const builtApkPath = findLatestApk()
  const renamedApkName = `qmm-v${nextVersion}.apk`
  const renamedApkPath = resolve(releaseArtifactDir, renamedApkName)
  ensureNoReleaseAssetConflict(renamedApkPath)
  cpSync(builtApkPath, renamedApkPath)
  return renamedApkPath
}

export function prepareIosReleaseAsset(nextVersion, builtIpaPath) {
  if (!existsSync(builtIpaPath) || extname(builtIpaPath).toLowerCase() !== '.ipa') {
    throw new Error(`Invalid IPA path: ${builtIpaPath}`)
  }

  const renamedIpaName = `qmm-v${nextVersion}.ipa`
  const renamedIpaPath = resolve(releaseArtifactDir, renamedIpaName)
  ensureNoReleaseAssetConflict(renamedIpaPath)
  cpSync(builtIpaPath, renamedIpaPath)
  return renamedIpaPath
}
