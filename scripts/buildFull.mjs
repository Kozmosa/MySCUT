import { execSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(currentDir, '..')
const docsProjectDir = resolve(rootDir, 'external/survive-in-scut')
const docsPlatformDistDir = resolve(docsProjectDir, 'vue-platform-dist')
const appDocsDistDir = resolve(rootDir, 'dist/docs')
const docsNodeModulesDir = resolve(docsProjectDir, 'node_modules')

function run(command, cwd) {
  execSync(command, {
    cwd,
    stdio: 'inherit',
  })
}

function copyDocsDist() {
  if (!existsSync(docsPlatformDistDir)) {
    throw new Error(`Docs build output not found: ${docsPlatformDistDir}`)
  }

  rmSync(appDocsDistDir, { recursive: true, force: true })
  mkdirSync(appDocsDistDir, { recursive: true })

  const entries = readdirSync(docsPlatformDistDir)
  for (const entry of entries) {
    cpSync(resolve(docsPlatformDistDir, entry), resolve(appDocsDistDir, entry), { recursive: true })
  }
}

function ensureDocsDependencies() {
  if (existsSync(docsNodeModulesDir)) {
    return
  }

  run('npm install', docsProjectDir)
}

run('npm run build', rootDir)
ensureDocsDependencies()
run('npm run docs:build:platform', docsProjectDir)
copyDocsDist()
