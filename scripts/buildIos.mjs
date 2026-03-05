import { rootDir, run } from './manualSubmoduleUtils.mjs'

run('npm run build:full', rootDir)
run('node scripts/syncNativeVersion.mjs', rootDir)
run('npx cap sync ios', rootDir)
