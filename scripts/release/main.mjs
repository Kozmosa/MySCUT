import { extname } from 'node:path'
import { versionsJsonPath, VERSION_PATTERN, rootDir } from './constants.mjs'
import { prepareAndroidReleaseAsset, findLatestIpa, prepareIosReleaseAsset } from './assets.mjs'
import { ensureMainBranch, ensureTagNotExists, stageCommitAndTag } from './gitFlow.mjs'
import { syncLatestAssetsToManual, ensureManualMainBranch, commitAndPushManualAssets } from './manualAssets.mjs'
import { writeReleaseNoteFile } from './notes.mjs'
import { parseReleaseOptions } from './options.mjs'
import { askText, askYesNo } from './prompt.mjs'
import { extractRepoInfo } from './repo.mjs'
import { buildR2PublicUrl, buildR2ReleaseObjectKey, uploadReleaseAssetToR2 } from './r2.mjs'
import { loadR2Config } from './r2Config.mjs'
import { run } from './shared.mjs'
import { updatePackageVersion, updateVersionsJson, validateTargetVersion } from './versioning.mjs'

async function main() {
  const releaseOptions = parseReleaseOptions()
  const nextVersion = releaseOptions.version
  const { packageJson } = validateTargetVersion(nextVersion)

  const tag = `v${nextVersion}`
  if (!VERSION_PATTERN.test(nextVersion)) {
    throw new Error(`Invalid version code: ${nextVersion}. Expected format: x.y.z`)
  }

  ensureTagNotExists(tag)
  ensureMainBranch()

  const targetPlatforms = []
  if (releaseOptions.platforms.android) {
    targetPlatforms.push('android')
  }

  if (releaseOptions.platforms.ios) {
    targetPlatforms.push('ios')
  }

  console.log(`Starting release process for version ${nextVersion}`)
  console.log(`Target platforms: ${targetPlatforms.join(', ')}`)

  const isR2Release = releaseOptions.assetSource === 'r2'
  const r2Config = isR2Release ? loadR2Config() : null
  const plannedR2AssetUrls = {}

  if (isR2Release && r2Config) {
    console.log('R2 asset source enabled, release assets will be uploaded to Cloudflare R2.')
    if (releaseOptions.platforms.android) {
      const objectKey = buildR2ReleaseObjectKey({
        keyPrefix: r2Config.keyPrefix,
        version: nextVersion,
        fileName: `qmm-v${nextVersion}.apk`,
      })
      plannedR2AssetUrls.apk = buildR2PublicUrl({
        publicBaseUrl: r2Config.publicBaseUrl,
        objectKey,
      })
    }

    if (releaseOptions.platforms.ios) {
      const objectKey = buildR2ReleaseObjectKey({
        keyPrefix: r2Config.keyPrefix,
        version: nextVersion,
        fileName: `qmm-v${nextVersion}.ipa`,
      })
      plannedR2AssetUrls.ipa = buildR2PublicUrl({
        publicBaseUrl: r2Config.publicBaseUrl,
        objectKey,
      })
    }
  }

  console.log('Updating submodules to latest remote commits...')
  run('git submodule update --init --recursive', rootDir)
  run('git submodule update --remote --recursive', rootDir)

  updatePackageVersion(packageJson, nextVersion)
  console.log(`Updated package.json version to ${nextVersion}`)

  const { owner, repo } = extractRepoInfo()
  updateVersionsJson({
    version: nextVersion,
    tag,
    owner,
    repo,
    hasAndroidAsset: releaseOptions.platforms.android,
    hasIosAsset: releaseOptions.platforms.ios,
    r2AssetUrls: plannedR2AssetUrls,
  })
  console.log('Updated versions.json')

  console.log('Running shared web build pipeline...')
  run('npm run build:full', rootDir)

  console.log('Syncing native versions...')
  run('node scripts/syncNativeVersion.mjs', rootDir)

  const preparedAssets = []

  if (releaseOptions.platforms.android) {
    console.log('Syncing Android platform...')
    run('npx cap sync android', rootDir)

    console.log('Opening Android Studio project...')
    run('npx cap open android', rootDir)

    const confirmed = await askYesNo('Have you finished building the APK in Android Studio? [y/N]: ')
    if (!confirmed) {
      throw new Error('APK build was not confirmed. Release process stopped.')
    }

    const apkPath = prepareAndroidReleaseAsset(nextVersion)
    preparedAssets.push(apkPath)
    console.log(`Prepared APK asset: ${apkPath}`)
  }

  if (releaseOptions.platforms.ios) {
    console.log('Syncing iOS platform...')
    run('npx cap sync ios', rootDir)

    console.log('Opening Xcode project...')
    run('npx cap open ios', rootDir)

    const confirmed = await askYesNo('Have you finished exporting the IPA in Xcode? [y/N]: ')
    if (!confirmed) {
      throw new Error('IPA export was not confirmed. Release process stopped.')
    }

    const manualIpaPath = await askText('Optional: enter IPA absolute path (press Enter to auto-detect): ')
    const builtIpaPath = manualIpaPath || findLatestIpa()
    const ipaPath = prepareIosReleaseAsset(nextVersion, builtIpaPath)
    preparedAssets.push(ipaPath)
    console.log(`Prepared IPA asset: ${ipaPath}`)
  }

  if (preparedAssets.length === 0) {
    throw new Error('No release assets prepared. Please select at least one platform.')
  }

  if (isR2Release && r2Config) {
    console.log('Uploading release assets to Cloudflare R2...')
    for (const assetPath of preparedAssets) {
      const fileName = assetPath.split(/[/\\]/).pop()
      if (!fileName) {
        throw new Error(`Unable to resolve asset file name from path: ${assetPath}`)
      }

      const objectKey = buildR2ReleaseObjectKey({
        keyPrefix: r2Config.keyPrefix,
        version: nextVersion,
        fileName,
      })

      const uploadedUrl = await uploadReleaseAssetToR2({
        localFilePath: assetPath,
        objectKey,
        r2Config,
      })
      console.log(`Uploaded ${fileName} to R2: ${uploadedUrl}`)
    }
  }

  const noteFilePath = writeReleaseNoteFile({
    tag,
    note: releaseOptions.note,
  })
  if (noteFilePath) {
    console.log(`Prepared release note: ${noteFilePath}`)
  }

  console.log('Syncing latest release assets to manual root-assets...')
  ensureManualMainBranch()
  const androidAssetPath = preparedAssets.find((filePath) => extname(filePath).toLowerCase() === '.apk') || ''
  syncLatestAssetsToManual({
    apkPath: androidAssetPath,
    versionsPath: versionsJsonPath,
  })
  commitAndPushManualAssets({
    version: nextVersion,
    hasApk: Boolean(androidAssetPath),
  })

  stageCommitAndTag({
    version: nextVersion,
    tag,
    noteFilePath,
  })

  const releaseUrl = `https://github.com/${owner}/${repo}/releases/tag/${tag}`
  console.log('Release commit and tag pushed. GitHub Actions will create the release and upload assets.')
  console.log(`Release URL: ${releaseUrl}`)
}

await main()
