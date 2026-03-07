import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { rootDir, run } from './manualSubmoduleUtils.mjs'

const ohosProjectDir = resolve(rootDir, 'ohos')
const ohosDistDir = resolve(rootDir, 'dist/ohos')
const ohosAppScopePath = resolve(rootDir, 'ohos/AppScope/app.json5')

function readBundleNameFromAppScope(appScopePath) {
  const content = readFileSync(appScopePath, 'utf8')
  const match = content.match(/"bundleName"\s*:\s*"([^"]+)"/)

  if (!match || !match[1]) {
    throw new Error(`Failed to resolve bundleName from ${appScopePath}`)
  }

  return match[1]
}

if (!existsSync(ohosProjectDir)) {
  throw new Error(`OHOS project directory not found: ${ohosProjectDir}`)
}

if (!existsSync(ohosAppScopePath)) {
  throw new Error(`OHOS app scope config not found: ${ohosAppScopePath}`)
}

const bundleName = readBundleNameFromAppScope(ohosAppScopePath)
const ohosResfileWwwDir = resolve(rootDir, `ohos/entry/src/main/resources/resfile/apps/${bundleName}/www`)

run('node scripts/buildApp.mjs', rootDir, {
  VITE_OUT_DIR: 'dist/ohos',
  VITE_TARGET_PLATFORM: 'ohos',
})

if (!existsSync(ohosDistDir)) {
  throw new Error(`OHOS web dist not found: ${ohosDistDir}`)
}

rmSync(ohosResfileWwwDir, { recursive: true, force: true })
mkdirSync(ohosResfileWwwDir, { recursive: true })
cpSync(ohosDistDir, ohosResfileWwwDir, { recursive: true })
