import { rootDir, run } from './manualSubmoduleUtils.mjs'

run('npm run build:full', rootDir)
run('npx cap sync ios', rootDir)
