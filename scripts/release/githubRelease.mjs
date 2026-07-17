import { basename } from 'node:path'
import { rootDir } from './constants.mjs'
import { calculateFileMetadata, runFile, runFileSilently } from './shared.mjs'

function releaseExists(tag, repoSlug) {
  try {
    runFileSilently('gh', ['release', 'view', tag, '--repo', repoSlug], rootDir)
    return true
  } catch {
    return false
  }
}

function buildReleaseNoteArgs(noteFilePath) {
  return noteFilePath ? ['--notes-file', noteFilePath] : ['--generate-notes']
}

export function publishGithubRelease({ tag, repoSlug, assetPaths, noteFilePath }) {
  if (releaseExists(tag, repoSlug)) {
    runFile('gh', ['release', 'upload', tag, ...assetPaths, '--clobber', '--repo', repoSlug], rootDir)
    if (noteFilePath) {
      runFile('gh', ['release', 'edit', tag, '--notes-file', noteFilePath, '--repo', repoSlug], rootDir)
    }
  } else {
    runFile(
      'gh',
      [
        'release',
        'create',
        tag,
        ...assetPaths,
        '--repo',
        repoSlug,
        '--title',
        tag,
        '--verify-tag',
        ...buildReleaseNoteArgs(noteFilePath),
      ],
      rootDir,
    )
  }

  verifyGithubReleaseAssets({ tag, repoSlug, assetPaths })
}

export function verifyGithubReleaseAssets({ tag, repoSlug, assetPaths }) {
  const releaseJson = JSON.parse(
    runFileSilently('gh', ['release', 'view', tag, '--repo', repoSlug, '--json', 'assets'], rootDir),
  )
  const assets = Array.isArray(releaseJson.assets) ? releaseJson.assets : []

  for (const assetPath of assetPaths) {
    const expected = calculateFileMetadata(assetPath)
    const assetName = basename(assetPath)
    const uploadedAsset = assets.find((asset) => asset?.name === assetName)
    if (!uploadedAsset) {
      throw new Error(`GitHub Release asset missing after upload: ${assetName}`)
    }

    if (uploadedAsset.size !== expected.size) {
      throw new Error(`GitHub Release asset size mismatch for ${assetName}`)
    }

    if (uploadedAsset.digest !== `sha256:${expected.sha256}`) {
      throw new Error(`GitHub Release asset SHA256 mismatch for ${assetName}`)
    }

    if (typeof uploadedAsset.url !== 'string' || !uploadedAsset.url.includes(`/download/${tag}/${assetName}`)) {
      throw new Error(`GitHub Release asset URL mismatch for ${assetName}`)
    }
  }
}
