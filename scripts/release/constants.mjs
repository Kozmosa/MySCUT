import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))

export const rootDir = resolve(currentDir, '../..')
export const packageJsonPath = resolve(rootDir, 'package.json')
export const packageLockJsonPath = resolve(rootDir, 'package-lock.json')
export const versionsJsonPath = resolve(rootDir, 'versions.json')
export const r2EnvFilePath = resolve(rootDir, 'R2_ENV')
export const apkOutputDir = resolve(rootDir, 'android/app/build/outputs/apk')
export const releaseArtifactDir = resolve(rootDir, 'artifacts/release')
export const releaseNotesDir = resolve(rootDir, '.release-notes')
export const androidVersionFilePath = resolve(rootDir, 'android/app/build.gradle')
export const iosVersionFilePath = resolve(rootDir, 'ios/App/App.xcodeproj/project.pbxproj')
export const manualSubmodulePath = resolve(rootDir, 'external/survive-in-scut')

export const VERSION_PATTERN = /^\d+\.\d+\.\d+$/
