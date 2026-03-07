import { rootDir, run } from './manualSubmoduleUtils.mjs'

run('node scripts/buildApp.mjs', rootDir, {
  VITE_OUT_DIR: 'dist/pwa',
  VITE_TARGET_PLATFORM: 'web',
  VITE_PWA: '1',
})
