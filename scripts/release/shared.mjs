import { execFileSync, execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
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

export function runFile(command, args, cwd, env = {}) {
  const executable = process.platform === 'win32' && (command === 'npm' || command === 'npx')
    ? `${command}.cmd`
    : command
  execFileSync(executable, args, {
    cwd,
    env: {
      ...process.env,
      ...env,
    },
    stdio: 'inherit',
  })
}

export function runFileSilently(command, args, cwd) {
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
  }).trim()
}

export function calculateFileMetadata(filePath) {
  const content = readFileSync(filePath)
  return {
    size: content.byteLength,
    sha256: createHash('sha256').update(content).digest('hex'),
  }
}

export function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

export function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}
