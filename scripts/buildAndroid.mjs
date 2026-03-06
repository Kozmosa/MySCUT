import { rootDir, run } from './manualSubmoduleUtils.mjs'

run('node scripts/buildApp.mjs', rootDir, {
  VITE_OUT_DIR: 'dist/android',
  VITE_TARGET_PLATFORM: 'android',
})
run('node scripts/syncNativeVersion.mjs', rootDir)
run('npx cap sync android', rootDir, {
  CAP_WEB_DIR: 'dist/android',
})
