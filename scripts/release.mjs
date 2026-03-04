import { execSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, basename, extname, resolve, relative } from 'node:path'
import readline from 'node:readline'
import { Writable } from 'node:stream'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(currentDir, '..')

const packageJsonPath = resolve(rootDir, 'package.json')
const versionsJsonPath = resolve(rootDir, 'versions.json')
const apkOutputDir = resolve(rootDir, 'android/app/build/outputs/apk')
const releaseArtifactDir = rootDir
const releaseNotesDir = resolve(rootDir, '.release-notes')
const manualSubmoduleDir = resolve(rootDir, 'external/survive-in-scut')
const manualRootAssetsDir = resolve(manualSubmoduleDir, 'docs/.vuepress/public/root-assets')

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/

function run(command, cwd = rootDir) {
  execSync(command, {
    cwd,
    stdio: 'inherit',
  })
}

function runSilently(command, cwd = rootDir) {
  return execSync(command, {
    cwd,
    encoding: 'utf8',
  }).trim()
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function compareVersions(left, right) {
  const leftParts = left.split('.').map((part) => Number(part))
  const rightParts = right.split('.').map((part) => Number(part))

  for (let index = 0; index < 3; index += 1) {
    const leftValue = leftParts[index]
    const rightValue = rightParts[index]

    if (leftValue > rightValue) {
      return 1
    }

    if (leftValue < rightValue) {
      return -1
    }
  }

  return 0
}

function parseNpmOriginalArgs() {
  const npmConfigArgv = process.env.npm_config_argv
  if (!npmConfigArgv) {
    return []
  }

  try {
    const parsed = JSON.parse(npmConfigArgv)
    const original = Array.isArray(parsed.original) ? parsed.original : []
    return original
      .filter((item) => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
  } catch {
    return []
  }
}

function parsePlatformList(input) {
  return input
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0)
}

function parseReleaseOptions() {
  const directArgs = process.argv.slice(2).map((item) => item.trim()).filter((item) => item.length > 0)
  const rawArgs = directArgs.length > 0 ? directArgs : parseNpmOriginalArgs()

  let version = ''
  let note = ''
  let android = false
  let ios = false
  let hasPlatformFlag = false

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index]

    if (!version && VERSION_PATTERN.test(arg)) {
      version = arg
      continue
    }

    if (arg === '--android') {
      hasPlatformFlag = true
      android = true
      continue
    }

    if (arg === '--ios') {
      hasPlatformFlag = true
      ios = true
      continue
    }

    if (arg === '--platform') {
      const next = rawArgs[index + 1]
      if (!next) {
        throw new Error('Missing value for --platform. Example: --platform android,ios')
      }

      hasPlatformFlag = true
      index += 1
      const platforms = parsePlatformList(next)
      for (const platform of platforms) {
        if (platform === 'android') {
          android = true
          continue
        }

        if (platform === 'ios') {
          ios = true
          continue
        }

        throw new Error(`Unsupported platform "${platform}". Use android or ios.`)
      }

      continue
    }

    if (arg.startsWith('--platform=')) {
      hasPlatformFlag = true
      const value = arg.slice('--platform='.length)
      const platforms = parsePlatformList(value)
      for (const platform of platforms) {
        if (platform === 'android') {
          android = true
          continue
        }

        if (platform === 'ios') {
          ios = true
          continue
        }

        throw new Error(`Unsupported platform "${platform}". Use android or ios.`)
      }

      continue
    }

    if (arg === '--note') {
      const next = rawArgs[index + 1]
      if (!next) {
        throw new Error('Missing value for --note. Example: --note "- New UI"')
      }

      note = next
      index += 1
      continue
    }

    if (arg.startsWith('--note=')) {
      note = arg.slice('--note='.length)
    }
  }

  if (!hasPlatformFlag) {
    android = true
  }

  if (!android && !ios) {
    throw new Error('No platform selected. Use --android and/or --ios.')
  }

  return {
    version,
    note,
    platforms: {
      android,
      ios,
    },
  }
}

function readVersionsData() {
  if (!existsSync(versionsJsonPath)) {
    return {
      latest: null,
      versions: {},
    }
  }

  const content = readJson(versionsJsonPath)
  const versions = typeof content.versions === 'object' && content.versions ? content.versions : {}
  return {
    latest: content.latest ?? null,
    versions,
  }
}

function walkFiles(dirPath) {
  if (!existsSync(dirPath)) {
    return []
  }

  const entries = readdirSync(dirPath, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = resolve(dirPath, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath))
      continue
    }

    files.push(fullPath)
  }

  return files
}

function findLatestApk() {
  const files = walkFiles(apkOutputDir)

  const releaseCandidates = []
  const debugCandidates = []

  for (const filePath of files) {
    const fileName = basename(filePath)
    if (fileName === 'app-release.apk') {
      releaseCandidates.push(filePath)
      continue
    }

    if (fileName === 'app-debug.apk') {
      debugCandidates.push(filePath)
    }
  }

  const pickByMtime = (paths) => {
    if (paths.length === 0) {
      return ''
    }

    return [...paths].sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs)[0]
  }

  const preferredRelease = pickByMtime(releaseCandidates)
  if (preferredRelease) {
    return preferredRelease
  }

  const preferredDebug = pickByMtime(debugCandidates)
  if (preferredDebug) {
    return preferredDebug
  }

  throw new Error(
    `No APK file found under ${apkOutputDir}. Build one in Android Studio and try again.`,
  )
}

function findLatestIpa() {
  const searchRoots = [
    resolve(rootDir, 'ios/App/output'),
    resolve(rootDir, 'ios'),
  ]

  const ipaFiles = []
  for (const dirPath of searchRoots) {
    if (!existsSync(dirPath)) {
      continue
    }

    const files = walkFiles(dirPath)
    for (const filePath of files) {
      if (extname(filePath).toLowerCase() === '.ipa') {
        ipaFiles.push(filePath)
      }
    }
  }

  if (ipaFiles.length === 0) {
    throw new Error('No IPA file found under ios/. Export IPA in Xcode and try again.')
  }

  return [...ipaFiles].sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs)[0]
}

function extractRepoInfo() {
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

function askYesNo(prompt) {
  return new Promise((resolveAnswer) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    rl.question(prompt, (answer) => {
      rl.close()
      const normalized = answer.trim().toLowerCase()
      resolveAnswer(normalized === 'y' || normalized === 'yes')
    })
  })
}

function askText(prompt) {
  return new Promise((resolveAnswer) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    rl.question(prompt, (answer) => {
      rl.close()
      resolveAnswer(answer.trim())
    })
  })
}

class MutableStdout extends Writable {
  constructor() {
    super()
    this.muted = false
  }

  _write(chunk, encoding, callback) {
    if (!this.muted) {
      process.stdout.write(chunk, encoding)
    }

    callback()
  }
}

function askHidden(prompt) {
  return new Promise((resolveAnswer) => {
    const mutableStdout = new MutableStdout()
    const rl = readline.createInterface({
      input: process.stdin,
      output: mutableStdout,
      terminal: true,
    })

    mutableStdout.muted = false
    rl.question(prompt, (answer) => {
      rl.close()
      process.stdout.write('\n')
      resolveAnswer(answer.trim())
    })
    mutableStdout.muted = true
  })
}

function ensureTagNotExists(tag) {
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

function ensureNoReleaseAssetConflict(filePath) {
  if (extname(filePath).toLowerCase() !== '.apk') {
    return
  }

  if (!existsSync(dirname(filePath))) {
    mkdirSync(dirname(filePath), { recursive: true })
  }
}

function syncLatestAssetsToManual({ apkPath, versionsPath }) {
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

function ensureManualMainBranch() {
  run('git fetch origin', manualSubmoduleDir)
  run('git checkout main', manualSubmoduleDir)
  run('git pull --ff-only origin main', manualSubmoduleDir)
}

function commitAndPushManualAssets({ version, hasApk }) {
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

function updateVersionsJson({ version, tag, owner, repo, hasAndroidAsset, hasIosAsset }) {
  const baseDownloadUrl = `https://github.com/${owner}/${repo}/releases/download/${tag}`
  const apkName = `qmm-v${version}.apk`
  const ipaName = `qmm-v${version}.ipa`
  const versionsName = 'versions.json'
  const publishedAt = new Date().toISOString()

  const assets = {
    versions: `${baseDownloadUrl}/${versionsName}`,
  }

  if (hasAndroidAsset) {
    assets.apk = `${baseDownloadUrl}/${apkName}`
  }

  if (hasIosAsset) {
    assets.ipa = `${baseDownloadUrl}/${ipaName}`
  }

  const nextVersionData = {
    version,
    tag,
    publishedAt,
    releaseUrl: `https://github.com/${owner}/${repo}/releases/tag/${tag}`,
    assets,
  }

  const previous = readVersionsData()
  const next = {
    latest: {
      version,
      tag,
      publishedAt,
      releaseUrl: nextVersionData.releaseUrl,
      assets: {
        ...nextVersionData.assets,
      },
    },
    versions: {
      ...previous.versions,
      [version]: nextVersionData,
    },
  }

  writeJson(versionsJsonPath, next)
}

function tryGetEnvToken() {
  const candidates = [
    process.env.GITHUB_TOKEN,
    process.env.GH_TOKEN,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim()
    }
  }

  return ''
}

async function githubRequest(url, { token, method = 'GET', body, isBinary = false }) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  if (!isBinary) {
    headers['Content-Type'] = 'application/json'
  } else {
    headers['Content-Type'] = 'application/octet-stream'
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? (isBinary ? body : JSON.stringify(body)) : undefined,
  })

  if (response.status === 204) {
    return null
  }

  const responseText = await response.text()
  const data = responseText ? JSON.parse(responseText) : null

  if (!response.ok) {
    throw new Error(`GitHub API request failed (${response.status}): ${responseText}`)
  }

  return data
}

async function createOrUpdateReleaseWithApi({ token, owner, repo, tag, title, assetFiles }) {
  const releaseByTagUrl = `https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`

  let releaseData = null
  try {
    releaseData = await githubRequest(releaseByTagUrl, { token })
  } catch (error) {
    const message = String(error)
    if (!message.includes('(404)')) {
      throw error
    }
  }

  if (!releaseData) {
    releaseData = await githubRequest(`https://api.github.com/repos/${owner}/${repo}/releases`, {
      token,
      method: 'POST',
      body: {
        tag_name: tag,
        name: title,
        generate_release_notes: true,
      },
    })
  }

  const existingAssets = Array.isArray(releaseData.assets) ? releaseData.assets : []
  const existingByName = new Map(existingAssets.map((asset) => [asset.name, asset]))

  for (const filePath of assetFiles) {
    const fileName = basename(filePath)
    const existingAsset = existingByName.get(fileName)
    if (existingAsset) {
      await githubRequest(`https://api.github.com/repos/${owner}/${repo}/releases/assets/${existingAsset.id}`, {
        token,
        method: 'DELETE',
      })
    }
  }

  const uploadBase = String(releaseData.upload_url).replace('{?name,label}', '')

  for (const filePath of assetFiles) {
    const fileName = basename(filePath)
    const binary = readFileSync(filePath)
    const uploadUrl = `${uploadBase}?name=${encodeURIComponent(fileName)}`
    await githubRequest(uploadUrl, {
      token,
      method: 'POST',
      body: binary,
      isBinary: true,
    })
  }
}

function createOrUpdateReleaseWithGh({ tag, title, assetFiles }) {
  let releaseExists = false
  try {
    execSync(`gh release view ${tag}`, {
      cwd: rootDir,
      stdio: 'pipe',
    })
    releaseExists = true
  } catch {
    releaseExists = false
  }

  const quotedAssets = assetFiles.map((assetPath) => `"${assetPath}"`).join(' ')

  if (!releaseExists) {
    run(`gh release create ${tag} ${quotedAssets} --title "${title}" --generate-notes`, rootDir)
    return
  }

  run(`gh release upload ${tag} ${quotedAssets} --clobber`, rootDir)
}

function writeReleaseNoteFile({ tag, note }) {
  if (!note) {
    return ''
  }

  if (!existsSync(releaseNotesDir)) {
    mkdirSync(releaseNotesDir, { recursive: true })
  }

  const noteFilePath = resolve(releaseNotesDir, `${tag}.md`)
  writeFileSync(noteFilePath, `${note.trim()}\n`)
  return noteFilePath
}

function stageCommitAndTag({ version, tag, assetPaths, noteFilePath }) {
  const filesToAdd = ['package.json', 'versions.json']

  for (const assetPath of assetPaths) {
    filesToAdd.push(basename(assetPath))
  }

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

async function resolveGithubToken() {
  const token = tryGetEnvToken()
  if (token) {
    return token
  }

  const inputToken = await askHidden('Please provide a valid GITHUB_TOKEN (input hidden): ')
  if (!inputToken) {
    throw new Error('No GITHUB_TOKEN provided. Release upload cannot continue.')
  }

  return inputToken
}

async function main() {
  const releaseOptions = parseReleaseOptions()
  const nextVersion = releaseOptions.version
  if (!nextVersion) {
    throw new Error(
      'Missing version code. Usage: npm run release <version_code> --android --ios --note "- New UI"',
    )
  }

  if (!VERSION_PATTERN.test(nextVersion)) {
    throw new Error(`Invalid version code: ${nextVersion}. Expected format: x.y.z`)
  }

  const packageJson = readJson(packageJsonPath)
  const currentVersion = String(packageJson.version || '')
  if (!VERSION_PATTERN.test(currentVersion)) {
    throw new Error(`Current package.json version is invalid: ${currentVersion}`)
  }

  if (compareVersions(nextVersion, currentVersion) <= 0) {
    throw new Error(
      `Version must be greater than current version. Current: ${currentVersion}, requested: ${nextVersion}. Please check and rerun.`,
    )
  }

  const tag = `v${nextVersion}`
  ensureTagNotExists(tag)

  const rootBranch = runSilently('git rev-parse --abbrev-ref HEAD', rootDir)
  if (rootBranch !== 'main') {
    throw new Error(`Release must run on main branch. Current branch: ${rootBranch}`)
  }

  const targetPlatforms = []
  if (releaseOptions.platforms.android) {
    targetPlatforms.push('android')
  }

  if (releaseOptions.platforms.ios) {
    targetPlatforms.push('ios')
  }

  console.log(`Starting release process for version ${nextVersion}`)
  console.log(`Target platforms: ${targetPlatforms.join(', ')}`)

  console.log('Updating submodules to latest remote commits...')
  run('git submodule update --init --recursive', rootDir)
  run('git submodule update --remote --recursive', rootDir)

  packageJson.version = nextVersion
  writeJson(packageJsonPath, packageJson)
  console.log(`Updated package.json version to ${nextVersion}`)

  const { owner, repo } = extractRepoInfo()
  updateVersionsJson({
    version: nextVersion,
    tag,
    owner,
    repo,
    hasAndroidAsset: releaseOptions.platforms.android,
    hasIosAsset: releaseOptions.platforms.ios,
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

    const builtApkPath = findLatestApk()
    const renamedApkName = `qmm-v${nextVersion}.apk`
    const renamedApkPath = resolve(releaseArtifactDir, renamedApkName)
    ensureNoReleaseAssetConflict(renamedApkPath)
    cpSync(builtApkPath, renamedApkPath)
    preparedAssets.push(renamedApkPath)
    console.log(`Prepared APK asset: ${renamedApkPath}`)
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
    if (!existsSync(builtIpaPath) || extname(builtIpaPath).toLowerCase() !== '.ipa') {
      throw new Error(`Invalid IPA path: ${builtIpaPath}`)
    }

    const renamedIpaName = `qmm-v${nextVersion}.ipa`
    const renamedIpaPath = resolve(releaseArtifactDir, renamedIpaName)
    cpSync(builtIpaPath, renamedIpaPath)
    preparedAssets.push(renamedIpaPath)
    console.log(`Prepared IPA asset: ${renamedIpaPath}`)
  }

  if (preparedAssets.length === 0) {
    throw new Error('No release assets prepared. Please select at least one platform.')
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
    assetPaths: preparedAssets,
    noteFilePath,
  })

  const releaseUrl = `https://github.com/${owner}/${repo}/releases/tag/${tag}`
  console.log('Release commit and tag pushed. GitHub Actions will create the release and upload assets.')
  console.log(`Release URL: ${releaseUrl}`)
}

await main()
