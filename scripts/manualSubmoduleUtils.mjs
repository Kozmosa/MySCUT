import { execSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))

export const rootDir = resolve(currentDir, '..')
export const docsProjectDir = resolve(rootDir, 'external/survive-in-scut')

export function run(command, cwd = rootDir, envOverrides = undefined) {
  execSync(command, {
    cwd,
    stdio: 'inherit',
    env: envOverrides ? { ...process.env, ...envOverrides } : process.env,
  })
}

export function ensureManualSubmodule() {
  run('git submodule update --init external/survive-in-scut', rootDir)
}

export function getPinnedManualCommit() {
  const output = execSync('git ls-tree HEAD external/survive-in-scut', {
    cwd: rootDir,
    encoding: 'utf8',
  }).trim()

  const parts = output.split(/\s+/)
  return parts.length >= 3 ? parts[2] : ''
}

export function pullLatestManual() {
  run('git fetch origin', docsProjectDir)
  run('git checkout --detach origin/main', docsProjectDir)
}

export function restoreManualCommit(commitHash) {
  if (!commitHash) {
    return
  }

  run(`git checkout --detach ${commitHash}`, docsProjectDir)
}
