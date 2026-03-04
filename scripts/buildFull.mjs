import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import {
  docsProjectDir,
  ensureManualSubmodule,
  getPinnedManualCommit,
  pullLatestManual,
  restoreManualCommit,
  rootDir,
  run,
} from './manualSubmoduleUtils.mjs'

const docsPlatformDistDir = resolve(docsProjectDir, 'vue-platform-dist')
const appDocsDistDir = resolve(rootDir, 'dist/docs')
const docsNodeModulesDir = resolve(docsProjectDir, 'node_modules')
const docsIgnoredExtensions = new Set(['.apk', '.ipa', '.map'])

function shouldCopyDocsFile(filePath) {
  return !docsIgnoredExtensions.has(extname(filePath).toLowerCase())
}

function copyDocsDist() {
  if (!existsSync(docsPlatformDistDir)) {
    throw new Error(`Docs build output not found: ${docsPlatformDistDir}`)
  }

  rmSync(appDocsDistDir, { recursive: true, force: true })
  mkdirSync(appDocsDistDir, { recursive: true })

  const entries = readdirSync(docsPlatformDistDir)
  for (const entry of entries) {
    cpSync(resolve(docsPlatformDistDir, entry), resolve(appDocsDistDir, entry), {
      recursive: true,
      filter: (srcPath) => shouldCopyDocsFile(srcPath),
    })
  }
}

function ensureDocsDependencies() {
  if (existsSync(docsNodeModulesDir)) {
    return
  }

  run('npm install --no-package-lock', docsProjectDir)
}

function cleanupDocsArtifacts() {
  rmSync(docsPlatformDistDir, { recursive: true, force: true })
}

const pinnedManualCommit = getPinnedManualCommit()

ensureManualSubmodule()
pullLatestManual()

try {
  run('npm run build:todo-snapshot', rootDir)
  run('tsc -b && vite build', rootDir)
  ensureDocsDependencies()
  run('npm run docs:build:platform', docsProjectDir)
  copyDocsDist()
  cleanupDocsArtifacts()
} finally {
  restoreManualCommit(pinnedManualCommit)
}
