import { rootDir, run } from './manualSubmoduleUtils.mjs'

run('node scripts/buildPwa.mjs', rootDir)
run('npx vite preview --host 0.0.0.0 --port 4174', rootDir, {
  VITE_OUT_DIR: 'dist/pwa',
  VITE_TARGET_PLATFORM: 'web',
  VITE_PWA: '1',
})
