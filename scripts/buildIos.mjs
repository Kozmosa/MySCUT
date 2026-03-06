import { rootDir, run } from './manualSubmoduleUtils.mjs'

run('node scripts/buildApp.mjs', rootDir, {
  VITE_OUT_DIR: 'dist/ios',
  VITE_TARGET_PLATFORM: 'ios',
})
run('node scripts/syncNativeVersion.mjs', rootDir)
run('npx cap sync ios', rootDir, {
  CAP_WEB_DIR: 'dist/ios',
})
