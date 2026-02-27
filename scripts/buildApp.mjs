import {
  ensureManualSubmodule,
  getPinnedManualCommit,
  pullLatestManual,
  restoreManualCommit,
  rootDir,
  run,
} from './manualSubmoduleUtils.mjs'

const pinnedManualCommit = getPinnedManualCommit()

ensureManualSubmodule()
pullLatestManual()

try {
  run('npm run build:todo-snapshot', rootDir)
  run('tsc -b && vite build', rootDir)
} finally {
  restoreManualCommit(pinnedManualCommit)
}
