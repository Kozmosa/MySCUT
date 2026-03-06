import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { rootDir, run } from './manualSubmoduleUtils.mjs'

const ohosRawfileAppDir = resolve(rootDir, 'ohos/entry/src/main/resources/rawfile/app')
const ohosProjectDir = resolve(rootDir, 'ohos')
const ohosDistDir = resolve(rootDir, 'dist/ohos')

if (!existsSync(ohosProjectDir)) {
  throw new Error(`OHOS project directory not found: ${ohosProjectDir}`)
}

run('node scripts/buildApp.mjs', rootDir, {
  VITE_OUT_DIR: 'dist/ohos',
  VITE_TARGET_PLATFORM: 'ohos',
})

if (!existsSync(ohosDistDir)) {
  throw new Error(`OHOS web dist not found: ${ohosDistDir}`)
}

rmSync(ohosRawfileAppDir, { recursive: true, force: true })
mkdirSync(ohosRawfileAppDir, { recursive: true })
cpSync(ohosDistDir, ohosRawfileAppDir, { recursive: true })
