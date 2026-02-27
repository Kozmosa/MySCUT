import { execSync } from 'node:child_process'
import { docsProjectDir, ensureManualSubmodule, pullLatestManual, rootDir, run } from './manualSubmoduleUtils.mjs'

ensureManualSubmodule()
pullLatestManual()

const latestCommit = execSync('git rev-parse HEAD', {
  cwd: docsProjectDir,
  encoding: 'utf8',
}).trim()

run('git add external/survive-in-scut', rootDir)

console.log(`Manual submodule updated for release: ${latestCommit}`)
