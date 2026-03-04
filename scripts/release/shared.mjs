import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

export function run(command, cwd) {
  execSync(command, {
    cwd,
    stdio: 'inherit',
  })
}

export function runSilently(command, cwd) {
  return execSync(command, {
    cwd,
    encoding: 'utf8',
  }).trim()
}

export function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

export function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}
