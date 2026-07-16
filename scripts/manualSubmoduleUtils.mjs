import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))

export const rootDir = resolve(currentDir, '..')
export const docsProjectDir = resolve(rootDir, 'external/survive-in-scut')

export function run(command, cwd = rootDir, envOverrides = undefined, timeoutMs = undefined) {
  execSync(command, {
    cwd,
    stdio: 'inherit',
    timeout: timeoutMs,
    env: envOverrides ? { ...process.env, ...envOverrides } : process.env,
  })
}
export function ensureManualSubmodule({
  manualDir = docsProjectDir,
  initialize = () => run(
    'git submodule update --init external/survive-in-scut',
    rootDir,
    undefined,
    60_000,
  ),
} = {}) {
  if (existsSync(resolve(manualDir, '.git'))) {
    return false
  }

  initialize()
  return true
}

export function getPinnedManualCommit() {
  return execSync('git rev-parse HEAD', {
    cwd: docsProjectDir,
    encoding: 'utf8',
  }).trim()
}

export function pullLatestManual() {
  run('git fetch --depth=1 origin main', docsProjectDir, undefined, 120_000)
  run('git switch --detach FETCH_HEAD', docsProjectDir)
}

export function restoreManualCommit(commitHash) {
  if (!commitHash) {
    return
  }

  run(`git switch --detach ${commitHash}`, docsProjectDir)
}
