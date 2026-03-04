import { execSync } from 'node:child_process'
import { relative } from 'node:path'
import { rootDir } from './constants.mjs'
import { run } from './shared.mjs'

export function ensureTagNotExists(tag) {
  try {
    execSync(`git rev-parse --verify refs/tags/${tag}`, {
      cwd: rootDir,
      stdio: 'pipe',
    })
  } catch {
    return
  }

  throw new Error(`Tag ${tag} already exists locally. Please use a new version.`)
}

export function ensureMainBranch() {
  const rootBranch = execSync('git rev-parse --abbrev-ref HEAD', {
    cwd: rootDir,
    encoding: 'utf8',
  }).trim()

  if (rootBranch !== 'main') {
    throw new Error(`Release must run on main branch. Current branch: ${rootBranch}`)
  }
}

export function stageCommitAndTag({ version, tag, noteFilePath }) {
  const filesToAdd = ['package.json', 'versions.json']

  if (noteFilePath) {
    filesToAdd.push(relative(rootDir, noteFilePath).replace(/\\/g, '/'))
  }

  const quotedFiles = filesToAdd.map((filePath) => `"${filePath}"`).join(' ')
  run(`git add ${quotedFiles}`, rootDir)
  run(`git commit -m "chore(release): prepare v${version}"`, rootDir)
  run(`git tag ${tag}`, rootDir)
  run('git push', rootDir)
  run(`git push origin ${tag}`, rootDir)
}
