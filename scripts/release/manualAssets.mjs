import { execSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { manualRootAssetsDir, manualSubmoduleDir } from './constants.mjs'
import { run } from './shared.mjs'

export function syncLatestAssetsToManual({ apkPath, versionsPath }) {
  if (!existsSync(manualRootAssetsDir)) {
    mkdirSync(manualRootAssetsDir, { recursive: true })
  }

  const latestApkPath = resolve(manualRootAssetsDir, 'qmm-latest.apk')
  const manualVersionsPath = resolve(manualRootAssetsDir, 'versions.json')

  if (apkPath) {
    cpSync(apkPath, latestApkPath)
  }

  cpSync(versionsPath, manualVersionsPath)

  return {
    latestApkPath: apkPath ? latestApkPath : '',
    manualVersionsPath,
  }
}

export function ensureManualMainBranch() {
  run('git fetch origin', manualSubmoduleDir)
  run('git checkout main', manualSubmoduleDir)
  run('git pull --ff-only origin main', manualSubmoduleDir)
}

export function commitAndPushManualAssets({ version, hasApk }) {
  const relativeApkPath = 'docs/.vuepress/public/root-assets/qmm-latest.apk'
  const relativeVersionsPath = 'docs/.vuepress/public/root-assets/versions.json'

  if (hasApk) {
    run(`git add "${relativeApkPath}" "${relativeVersionsPath}"`, manualSubmoduleDir)
  } else {
    run(`git add "${relativeVersionsPath}"`, manualSubmoduleDir)
  }

  let hasChanges = true
  try {
    execSync('git diff --cached --quiet', {
      cwd: manualSubmoduleDir,
      stdio: 'pipe',
    })
    hasChanges = false
  } catch {
    hasChanges = true
  }

  if (!hasChanges) {
    console.log('Manual root-assets unchanged, skip submodule commit.')
    return
  }

  run(`git commit -m "chore: sync release root-assets for v${version}"`, manualSubmoduleDir)
  run('git push origin main', manualSubmoduleDir)
}
