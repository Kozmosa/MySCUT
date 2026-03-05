import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { rootDir } from './manualSubmoduleUtils.mjs'

const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/

const packageJsonPath = resolve(rootDir, 'package.json')
const versionsJsonPath = resolve(rootDir, 'versions.json')
const androidBuildGradlePath = resolve(rootDir, 'android/app/build.gradle')
const iosPbxprojPath = resolve(rootDir, 'ios/App/App.xcodeproj/project.pbxproj')

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function parseSemver(version) {
  const match = version.match(VERSION_PATTERN)
  if (!match) {
    throw new Error(`Invalid version "${version}". Expected x.y.z`)
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  }
}

function toVersionCode({ major, minor, patch }) {
  return major * 1000000 + minor * 1000 + patch
}

function assertPackageAndVersionsConsistency(packageVersion) {
  const versionsJson = readJson(versionsJsonPath)
  const latestVersion = String(versionsJson?.latest?.version ?? '')

  if (!latestVersion) {
    throw new Error('versions.json latest.version is missing')
  }

  if (latestVersion !== packageVersion) {
    throw new Error(
      `Version mismatch: package.json=${packageVersion}, versions.json latest.version=${latestVersion}`,
    )
  }
}

function replaceOrThrow(content, pattern, replacement, fieldName, filePath) {
  if (!pattern.test(content)) {
    throw new Error(`Unable to locate ${fieldName} in ${filePath}`)
  }

  return content.replace(pattern, replacement)
}

function updateAndroidBuildGradle({ versionName, versionCode }) {
  const filePath = androidBuildGradlePath
  let content = readFileSync(filePath, 'utf8')

  content = replaceOrThrow(
    content,
    /(\bversionCode\s+)\d+/,
    `$1${versionCode}`,
    'Android versionCode',
    filePath,
  )

  content = replaceOrThrow(
    content,
    /(\bversionName\s+")([^"]+)(")/,
    `$1${versionName}$3`,
    'Android versionName',
    filePath,
  )

  writeFileSync(filePath, content)
}

function updateIosProject({ marketingVersion, projectVersion }) {
  const filePath = iosPbxprojPath
  let content = readFileSync(filePath, 'utf8')

  content = replaceOrThrow(
    content,
    /(\bMARKETING_VERSION\s*=\s*)([^;]+)(;)/g,
    `$1${marketingVersion}$3`,
    'iOS MARKETING_VERSION',
    filePath,
  )

  content = replaceOrThrow(
    content,
    /(\bCURRENT_PROJECT_VERSION\s*=\s*)([^;]+)(;)/g,
    `$1${projectVersion}$3`,
    'iOS CURRENT_PROJECT_VERSION',
    filePath,
  )

  writeFileSync(filePath, content)
}

function main() {
  const packageJson = readJson(packageJsonPath)
  const packageVersion = String(packageJson.version ?? '')
  const semverParts = parseSemver(packageVersion)
  const versionCode = toVersionCode(semverParts)

  assertPackageAndVersionsConsistency(packageVersion)
  updateAndroidBuildGradle({
    versionName: packageVersion,
    versionCode,
  })
  updateIosProject({
    marketingVersion: packageVersion,
    projectVersion: versionCode,
  })

  console.log(`Synced native versions to ${packageVersion} (${versionCode})`)
}

main()
