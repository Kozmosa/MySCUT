import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

export const MANUAL_VITEPRESS_BASE = '/docs/'

export function createManualVitePressBuildArguments({
  vitePressCliPath,
  tempDocsDir,
  outputDir,
}) {
  return [
    vitePressCliPath,
    'build',
    tempDocsDir,
    '--base',
    MANUAL_VITEPRESS_BASE,
    '--outDir',
    outputDir,
  ]
}

function syncLegacyPublicDirectory(tempDocsDir) {
  const sourceDir = resolve(tempDocsDir, '.vuepress/public')
  if (!existsSync(sourceDir)) {
    return
  }

  const targetDir = resolve(tempDocsDir, 'public')
  rmSync(targetDir, { recursive: true, force: true })
  cpSync(sourceDir, targetDir, { recursive: true })
}

export function buildManualVitePress({ docsProjectDir, outputDir }) {
  const docsSourceDir = resolve(docsProjectDir, 'docs')
  const vitePressCliPath = resolve(docsProjectDir, 'node_modules/vitepress/bin/vitepress.js')

  if (!existsSync(docsSourceDir)) {
    throw new Error(`Manual docs source not found: ${docsSourceDir}`)
  }

  if (!existsSync(vitePressCliPath)) {
    throw new Error(`Manual VitePress CLI not found: ${vitePressCliPath}`)
  }

  const tempRootDir = mkdtempSync(resolve(docsProjectDir, '.platform-build-tmp-'))
  const tempDocsDir = resolve(tempRootDir, 'docs')

  rmSync(outputDir, { recursive: true, force: true })

  try {
    cpSync(docsSourceDir, tempDocsDir, { recursive: true })
    syncLegacyPublicDirectory(tempDocsDir)

    execFileSync(process.execPath, createManualVitePressBuildArguments({
      vitePressCliPath,
      tempDocsDir,
      outputDir,
    }), {
      cwd: docsProjectDir,
      env: process.env,
      stdio: 'inherit',
    })
  } finally {
    rmSync(tempRootDir, { recursive: true, force: true })
  }
}
