#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
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
import { createManualDependencyStamp, resolveManualBuildProtocol } from './manualBuildProtocol.mjs'
import { buildManualVitePress } from './manualVitePressBuild.mjs'

const appOutDir = resolve(rootDir, process.env.VITE_OUT_DIR || 'dist/web')
const appDocsDistDir = resolve(appOutDir, 'docs')
const docsNodeModulesDir = resolve(docsProjectDir, 'node_modules')
const docsDependencyStampPath = resolve(docsNodeModulesDir, '.myscut-manual-dependencies')
const docsIgnoredExtensions = new Set(['.apk', '.ipa', '.map'])
const configFileNames = ['config.ts', 'config.js', 'config.mjs', 'config.cjs']

function shouldCopyDocsFile(filePath) {
  return !docsIgnoredExtensions.has(extname(filePath).toLowerCase())
}

function copyDocsDist(docsPlatformDistDir) {
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

function hasDocsConfig(configDirectoryName) {
  return configFileNames.some((fileName) => (
    existsSync(resolve(docsProjectDir, 'docs', configDirectoryName, fileName))
  ))
}

function getManualBuildProtocol() {
  return resolveManualBuildProtocol({
    hasPackageLock: existsSync(resolve(docsProjectDir, 'package-lock.json')),
    hasVitePressConfig: hasDocsConfig('.vitepress'),
  })
}

function ensureDocsDependencies(protocol) {
  const lockFileContent = readFileSync(resolve(docsProjectDir, protocol.lockFileName), 'utf8')
  const expectedStamp = createManualDependencyStamp(protocol.installCommand, lockFileContent)

  if (
    existsSync(docsNodeModulesDir) &&
    existsSync(docsDependencyStampPath) &&
    readFileSync(docsDependencyStampPath, 'utf8') === expectedStamp
  ) {
    return
  }

  run(protocol.installCommand, docsProjectDir, {
    SKIP_INSTALL_SIMPLE_GIT_HOOKS: '1',
  })
  writeFileSync(docsDependencyStampPath, expectedStamp, 'utf8')
}

function buildManual(protocol) {
  const outputDir = resolve(docsProjectDir, protocol.outputDirectoryName)
  buildManualVitePress({ docsProjectDir, outputDir })
}

function cleanupDocsArtifacts() {
  rmSync(resolve(docsProjectDir, 'vite-platform-dist'), { recursive: true, force: true })
}

// Submodule operations may fail offline; the app build itself does not
// depend on them — only the docs copy step does.
try {
  ensureManualSubmodule()
} catch {
  console.warn('[buildApp]  子模块检出失败，跳过（不影响 App 本体）')
}

const pinnedManualCommit = getPinnedManualCommit()

try {
  pullLatestManual()
} catch {
  console.warn('[buildApp]  子模块拉取失败，使用已检出版本（不影响 App 本体）')
}

try {
  const viteTargetPlatform = process.env.VITE_TARGET_PLATFORM || 'web'
  run('npm run build:todo-snapshot', rootDir)
  run('tsc -b && vite build', rootDir, {
    VITE_OUT_DIR: appOutDir,
    VITE_TARGET_PLATFORM: viteTargetPlatform,
  })
  const manualBuildProtocol = getManualBuildProtocol()
  ensureDocsDependencies(manualBuildProtocol)
  buildManual(manualBuildProtocol)
  copyDocsDist(resolve(docsProjectDir, manualBuildProtocol.outputDirectoryName))
  cleanupDocsArtifacts()
} finally {
  cleanupDocsArtifacts()
  restoreManualCommit(pinnedManualCommit)
}
