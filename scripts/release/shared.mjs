import { execFileSync, execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

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
  let executable = command
  let executableArgs = args
  if (command === 'npm' || command === 'npx') {
    const cliFileName = command === 'npm' ? 'npm-cli.js' : 'npx-cli.js'
    const bundledCliPath = resolve(dirname(process.execPath), 'node_modules/npm/bin', cliFileName)
    if (existsSync(bundledCliPath)) {
      executable = process.execPath
      executableArgs = [bundledCliPath, ...args]
    } else if (process.platform === 'win32') {
      executable = `${command}.cmd`
    }
  }

  execFileSync(executable, executableArgs, {
    cwd,
    env: {
      ...process.env,
      ...env,
    },
    shell: process.platform === 'win32' && executable.endsWith('.cmd'),
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
