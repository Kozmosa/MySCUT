// 发版第一阶段（维护者本地执行）：提交 bump commit 并打 tag，不做任何构建、签名与上传。
// versions.json 在此阶段写入骨架（版本、tag、下载 URL、minVersion），最终 APK 的 size/sha256
// 由 CI 阶段（scripts/release/ci.mjs）补全并写入 R2 与 GitHub Release 资产，不回推仓库。
// 用法：npm run release:bump -- <version> [--note-file <path>] [--min-version <version>]
import {
  rootDir,
  VERSION_PATTERN,
} from './constants.mjs'
import {
  commitManualDriftIfAny,
  ensureCleanWorktree,
  ensureMainBranch,
  ensureTagNotExists,
  stageCommitAndTag,
} from './gitFlow.mjs'
import { resolveReleaseNote, writeReleaseNoteFile } from './notes.mjs'
import {
  buildR2LatestVersionsObjectKey,
  buildR2PublicUrl,
  buildR2ReleaseObjectKey,
} from './r2.mjs'
import { loadR2Config } from './r2Config.mjs'
import { runFile } from './shared.mjs'
import {
  updatePackageVersionFiles,
  updateVersionsJson,
  validateTargetVersion,
} from './versioning.mjs'

function parsePrepareArgs(argv) {
  let version = ''
  let noteFile = ''
  let minVersion = ''

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (!version && VERSION_PATTERN.test(arg)) {
      version = arg
      continue
    }
    if (arg.startsWith('--note-file=')) {
      noteFile = arg.slice('--note-file='.length)
      continue
    }
    if (arg.startsWith('--min-version=')) {
      minVersion = arg.slice('--min-version='.length)
    }
  }

  return { version, noteFile: noteFile || `.release-notes/v${version}.md`, minVersion }
}

async function main() {
  const { version: nextVersion, noteFile, minVersion } = parsePrepareArgs(process.argv.slice(2))
  if (!nextVersion) {
    throw new Error('Missing version code. Usage: npm run release:bump -- <version_code> [--note-file <path>] [--min-version <version>]')
  }
  const { packageJson } = validateTargetVersion(nextVersion)
  const tag = `v${nextVersion}`

  const note = resolveReleaseNote({ note: '', noteFile })
  const r2Config = loadR2Config()

  ensureMainBranch()
  ensureTagNotExists(tag)
  ensureCleanWorktree()

  runFile('git', ['submodule', 'update', '--init', '--recursive'], rootDir)

  const publishedAt = new Date().toISOString()
  const keyPrefix = r2Config.keyPrefix
  const apkObjectKey = buildR2ReleaseObjectKey({ keyPrefix, version: nextVersion, fileName: `qmm-v${nextVersion}.apk` })
  const versionedManifestKey = buildR2ReleaseObjectKey({ keyPrefix, version: nextVersion, fileName: 'versions.json' })
  const latestManifestKey = buildR2LatestVersionsObjectKey({ keyPrefix })

  updatePackageVersionFiles(packageJson, nextVersion)
  updateVersionsJson({
    version: nextVersion,
    tag,
    owner: 'Kozmosa',
    repo: 'MySCUT',
    hasAndroidAsset: true,
    hasIosAsset: false,
    r2AssetUrls: {
      apk: buildR2PublicUrl({ publicBaseUrl: r2Config.publicBaseUrl, objectKey: apkObjectKey }),
      versions: buildR2PublicUrl({ publicBaseUrl: r2Config.publicBaseUrl, objectKey: versionedManifestKey }),
      latestVersions: buildR2PublicUrl({ publicBaseUrl: r2Config.publicBaseUrl, objectKey: latestManifestKey }),
    },
    minVersion,
    publishedAt,
  })
  runFile('node', ['scripts/syncNativeVersion.mjs'], rootDir)
  runFile('npm', ['run', 'check'], rootDir)

  commitManualDriftIfAny()

  const noteFilePath = writeReleaseNoteFile({ tag, content: note })
  stageCommitAndTag({ version: nextVersion, tag, noteFilePath })

  console.log(`Bump commit and tag pushed: v${nextVersion}`)
  console.log('Next: Actions → Stable Release → Run workflow, 输入相同版本号完成构建与发布。')
}

await main()
