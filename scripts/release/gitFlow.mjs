import { execFileSync } from 'node:child_process'
import { relative } from 'node:path'
import {
  androidVersionFilePath,
  iosVersionFilePath,
  manualSubmodulePath,
  packageJsonPath,
  packageLockJsonPath,
  rootDir,
  thirdPartyLicensesPath,
  versionsJsonPath,
} from './constants.mjs'
import { runFile, runFileSilently } from './shared.mjs'

function toRepoPath(filePath) {
  return relative(rootDir, filePath).replace(/\\/g, '/')
}

export function getGitStatusSnapshot() {
  return execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], {
    cwd: rootDir,
    encoding: 'utf8',
  }).replace(/\r?\n$/, '')
}

export function ensureCleanWorktree() {
  const status = getGitStatusSnapshot()
  if (status) {
    throw new Error(`Release requires a clean Git worktree. Commit or stash these changes first:\n${status}`)
  }
}

export function ensureGitHubAuth() {
  try {
    execFileSync('gh', ['auth', 'status', '--hostname', 'github.com'], {
      cwd: rootDir,
      stdio: 'inherit',
    })
  } catch {
    throw new Error('GitHub CLI authentication is required. Run: gh auth login')
  }
}

export function ensureTagNotExists(tag) {
  try {
    execFileSync('git', ['rev-parse', '--verify', `refs/tags/${tag}`], {
      cwd: rootDir,
      stdio: 'pipe',
    })
  } catch {
    return
  }

  throw new Error(`Tag ${tag} already exists locally. Please use a new version.`)
}

export function ensureTagExists(tag) {
  try {
    return execFileSync('git', ['rev-parse', '--verify', `refs/tags/${tag}`], {
      cwd: rootDir,
      encoding: 'utf8',
    }).trim()
  } catch {
    throw new Error(`Tag ${tag} does not exist. Run release:bump first (it creates the tag).`)
  }
}

// manual 子模块漂移:buildApp 会把 gitlink 切到远端 tip 并重生成 todoSnapshot;
// 发版准备阶段若发现漂移,自动预提交,避免白名单检查中止
export function commitManualDriftIfAny() {
  const driftPaths = [toRepoPath(manualSubmodulePath), 'src/generated/todoSnapshot.ts']
  const changedPaths = parseStatusPaths(getGitStatusSnapshot())
  const drifted = driftPaths.filter((filePath) => changedPaths.includes(filePath))
  if (drifted.length === 0) {
    return false
  }

  const unexpected = changedPaths.filter((filePath) => !driftPaths.includes(filePath))
  if (unexpected.length > 0) {
    throw new Error(`Unexpected changes besides manual drift:\n${unexpected.join('\n')}`)
  }

  const manualShortSha = runFileSilently('git', ['rev-parse', '--short', 'HEAD'], manualSubmodulePath)
  runFile('git', ['add', '--', ...driftPaths], rootDir)
  runFile('git', ['commit', '-m', `chore(manual): bump survive-in-scut to ${manualShortSha}`], rootDir)
  console.log(`Pre-committed manual drift (survive-in-scut ${manualShortSha})`)
  return true
}

export function ensureMainBranch() {
  const rootBranch = runFileSilently('git', ['rev-parse', '--abbrev-ref', 'HEAD'], rootDir)
  if (rootBranch !== 'main') {
    throw new Error(`Release must run on main branch. Current branch: ${rootBranch}`)
  }
}

export function parseStatusPaths(status) {
  if (!status) {
    return []
  }

  return status.split(/\r?\n/).map((line) => {
    const path = line.slice(3).trim()
    const renameSeparator = path.lastIndexOf(' -> ')
    return renameSeparator >= 0 ? path.slice(renameSeparator + 4) : path
  })
}

function getExpectedReleasePaths(noteFilePath) {
  return [
    packageJsonPath,
    packageLockJsonPath,
    versionsJsonPath,
    thirdPartyLicensesPath,
    androidVersionFilePath,
    iosVersionFilePath,
    manualSubmodulePath,
    ...(noteFilePath ? [noteFilePath] : []),
  ].map(toRepoPath)
}

export function stageCommitAndTag({ version, tag, noteFilePath }) {
  const expectedPaths = getExpectedReleasePaths(noteFilePath)
  const expectedSet = new Set(expectedPaths)
  const changedPaths = parseStatusPaths(getGitStatusSnapshot())
  const unexpectedPaths = changedPaths.filter((filePath) => !expectedSet.has(filePath))
  if (unexpectedPaths.length > 0) {
    throw new Error(`Release produced unexpected tracked changes:\n${unexpectedPaths.map((path) => `- ${path}`).join('\n')}`)
  }

  runFile('git', ['add', '--', ...expectedPaths], rootDir)
  const stagedPaths = runFileSilently('git', ['diff', '--cached', '--name-only'], rootDir)
    .split(/\r?\n/)
    .filter(Boolean)
  const unexpectedStagedPaths = stagedPaths.filter((filePath) => !expectedSet.has(filePath))
  if (unexpectedStagedPaths.length > 0) {
    throw new Error(`Unexpected files were staged:\n${unexpectedStagedPaths.map((path) => `- ${path}`).join('\n')}`)
  }

  if (stagedPaths.some((filePath) => /\.(?:apk|ipa)$/i.test(filePath))) {
    throw new Error('Release commits must not contain APK or IPA files.')
  }

  runFile('git', ['commit', '-m', `chore(release): prepare v${version}`], rootDir)
  runFile('git', ['tag', tag], rootDir)
  runFile('git', ['push', 'origin', 'HEAD:main'], rootDir)
  runFile('git', ['push', 'origin', `refs/tags/${tag}`], rootDir)
}
