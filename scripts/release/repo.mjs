import { execSync } from 'node:child_process'
import { rootDir } from './constants.mjs'

export function extractRepoInfo() {
  const remoteUrl = execSync('git remote get-url origin', {
    cwd: rootDir,
    encoding: 'utf8',
  }).trim()

  const httpsMatch = remoteUrl.match(/^https:\/\/github\.com\/([^/]+)\/([^/.]+)(?:\.git)?$/)
  if (httpsMatch) {
    return {
      owner: httpsMatch[1],
      repo: httpsMatch[2],
    }
  }

  const sshMatch = remoteUrl.match(/^git@github\.com:([^/]+)\/([^/.]+)(?:\.git)?$/)
  if (sshMatch) {
    return {
      owner: sshMatch[1],
      repo: sshMatch[2],
    }
  }

  const sshProtocolMatch = remoteUrl.match(/^ssh:\/\/git@github\.com\/([^/]+)\/([^/.]+)(?:\.git)?$/)
  if (sshProtocolMatch) {
    return {
      owner: sshProtocolMatch[1],
      repo: sshProtocolMatch[2],
    }
  }

  throw new Error(`Unsupported GitHub remote URL: ${remoteUrl}`)
}
