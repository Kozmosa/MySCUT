import { execSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, basename, extname, resolve } from 'node:path'
import readline from 'node:readline'
import { Writable } from 'node:stream'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(currentDir, '..')

const packageJsonPath = resolve(rootDir, 'package.json')
const versionsJsonPath = resolve(rootDir, 'versions.json')
const apkOutputDir = resolve(rootDir, 'android/app/build/outputs/apk')
const releaseArtifactDir = rootDir
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

function parseVersionArg() {
  if (process.argv[2]) {
    return process.argv[2].trim()
  }

  const npmConfigArgv = process.env.npm_config_argv
  if (!npmConfigArgv) {
    return ''
  }

  try {
    const parsed = JSON.parse(npmConfigArgv)
    const original = Array.isArray(parsed.original) ? parsed.original : []
    for (const item of original) {
      if (typeof item === 'string' && VERSION_PATTERN.test(item.trim())) {
        return item.trim()
      }
    }
  } catch {
    return ''
  }

  return ''
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

  cpSync(apkPath, latestApkPath)
  cpSync(versionsPath, manualVersionsPath)

  return {
    latestApkPath,
    manualVersionsPath,
  }
}

function ensureManualMainBranch() {
  run('git fetch origin', manualSubmoduleDir)
  run('git checkout main', manualSubmoduleDir)
  run('git pull --ff-only origin main', manualSubmoduleDir)
}

function commitAndPushManualAssets({ version }) {
  const relativeApkPath = 'docs/.vuepress/public/root-assets/qmm-latest.apk'
  const relativeVersionsPath = 'docs/.vuepress/public/root-assets/versions.json'

  run(`git add "${relativeApkPath}" "${relativeVersionsPath}"`, manualSubmoduleDir)

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

function updateVersionsJson({ version, tag, owner, repo }) {
  const baseDownloadUrl = `https://github.com/${owner}/${repo}/releases/download/${tag}`
  const apkName = `qmm-v${version}.apk`
  const versionsName = 'versions.json'
  const publishedAt = new Date().toISOString()

  const nextVersionData = {
    version,
    tag,
    publishedAt,
    releaseUrl: `https://github.com/${owner}/${repo}/releases/tag/${tag}`,
    assets: {
      apk: `${baseDownloadUrl}/${apkName}`,
      versions: `${baseDownloadUrl}/${versionsName}`,
    },
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

function stageCommitAndTag({ version, tag, apkPath }) {
  const apkName = basename(apkPath)
  run(`git add package.json versions.json "${apkName}"`, rootDir)
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
  const nextVersion = parseVersionArg()
  if (!nextVersion) {
    throw new Error('Missing version code. Usage: npm run release <version_code> (example: npm run release 0.2.3)')
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

  console.log(`Starting release process for version ${nextVersion}`)

  console.log('Updating submodules to latest remote commits...')
  run('git submodule update --init --recursive', rootDir)
  run('git submodule update --remote --recursive', rootDir)

  packageJson.version = nextVersion
  writeJson(packageJsonPath, packageJson)
  console.log(`Updated package.json version to ${nextVersion}`)

  console.log('Running full build pipeline...')
  run('npm run build:android', rootDir)

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
  console.log(`Prepared APK asset: ${renamedApkPath}`)

  const { owner, repo } = extractRepoInfo()
  updateVersionsJson({
    version: nextVersion,
    tag,
    owner,
    repo,
  })
  console.log('Updated versions.json')

  console.log('Syncing latest release assets to manual root-assets...')
  ensureManualMainBranch()
  syncLatestAssetsToManual({
    apkPath: renamedApkPath,
    versionsPath: versionsJsonPath,
  })
  commitAndPushManualAssets({ version: nextVersion })

  stageCommitAndTag({
    version: nextVersion,
    tag,
    apkPath: renamedApkPath,
  })

  const releaseUrl = `https://github.com/${owner}/${repo}/releases/tag/${tag}`
  console.log('Release commit and tag pushed. GitHub Actions will create the release and upload assets.')
  console.log(`Release URL: ${releaseUrl}`)
}

await main()
