import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))

export const rootDir = resolve(currentDir, '../..')
export const packageJsonPath = resolve(rootDir, 'package.json')
export const versionsJsonPath = resolve(rootDir, 'versions.json')
export const r2EnvFilePath = resolve(rootDir, 'R2_ENV')
export const apkOutputDir = resolve(rootDir, 'android/app/build/outputs/apk')
export const releaseArtifactDir = rootDir
export const releaseNotesDir = resolve(rootDir, '.release-notes')
export const manualSubmoduleDir = resolve(rootDir, 'external/survive-in-scut')
export const manualRootAssetsDir = resolve(manualSubmoduleDir, 'docs/.vuepress/public/root-assets')

export const VERSION_PATTERN = /^\d+\.\d+\.\d+$/
