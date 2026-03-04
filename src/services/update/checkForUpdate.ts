import {
  buildProviderUrl,
  DEFAULT_UPDATE_PROVIDER_ORDER,
  getUpdateLinkProvider,
  type UpdateLinkProviderId,
} from './providers'

const REMOTE_VERSION_MANIFEST_URL =
  'https://raw.githubusercontent.com/Kozmosa/survive-in-scut/refs/heads/main/docs/.vuepress/public/root-assets/versions.json'

type RemoteVersionAssets = {
  apk?: string
}

type RemoteVersionItem = {
  version: string
  releaseUrl?: string
  assets?: RemoteVersionAssets
}

type RemoteVersionManifest = {
  latest: RemoteVersionItem
}

type CheckedManifest = {
  providerId: UpdateLinkProviderId
  providerName: string
  latestVersion: string
  downloadUrl: string | null
}

type UpdateCheckInput = {
  localVersion: string
  providerOrder?: UpdateLinkProviderId[]
}

type UpdateAvailableResult = {
  status: 'update-available'
  localVersion: string
  latestVersion: string
  providerId: UpdateLinkProviderId
  providerName: string
  downloadUrl: string | null
}

type UpToDateResult = {
  status: 'up-to-date'
  localVersion: string
  latestVersion: string
  providerId: UpdateLinkProviderId
  providerName: string
}

export type AppUpdateCheckResult = UpdateAvailableResult | UpToDateResult

function normalizeVersion(version: string) {
  const trimmedVersion = version.trim()
  return trimmedVersion.startsWith('v') ? trimmedVersion.slice(1) : trimmedVersion
}

function parseVersionSegments(version: string) {
  return normalizeVersion(version)
    .split('.')
    .map((segment) => {
      const matched = segment.match(/^\d+/)
      return matched ? Number(matched[0]) : 0
    })
}

function compareVersion(left: string, right: string) {
  const leftSegments = parseVersionSegments(left)
  const rightSegments = parseVersionSegments(right)
  const maxLength = Math.max(leftSegments.length, rightSegments.length)

  for (let index = 0; index < maxLength; index += 1) {
    const leftValue = leftSegments[index] ?? 0
    const rightValue = rightSegments[index] ?? 0

    if (leftValue > rightValue) {
      return 1
    }

    if (leftValue < rightValue) {
      return -1
    }
  }

  return 0
}

function isRemoteVersionManifest(value: unknown): value is RemoteVersionManifest {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const latest = (value as { latest?: unknown }).latest
  if (typeof latest !== 'object' || latest === null) {
    return false
  }

  return typeof (latest as { version?: unknown }).version === 'string'
}

function resolveGithubDownloadUrl(sourceUrl: string, providerOrder: UpdateLinkProviderId[]) {
  for (const providerId of providerOrder) {
    const providerUrl = buildProviderUrl(providerId, sourceUrl).trim()
    if (providerUrl) {
      return providerUrl
    }
  }

  return sourceUrl
}

function resolveDownloadUrl(item: RemoteVersionItem, providerOrder: UpdateLinkProviderId[]) {
  const apkUrl = typeof item.assets?.apk === 'string' ? item.assets.apk.trim() : ''
  if (apkUrl) {
    const normalizedApkUrl = apkUrl.toLowerCase()

    if (normalizedApkUrl.includes('manual')) {
      return buildProviderUrl('raw', apkUrl)
    }

    if (normalizedApkUrl.includes('github')) {
      return resolveGithubDownloadUrl(apkUrl, providerOrder)
    }

    return buildProviderUrl('raw', apkUrl)
  }

  if (typeof item.releaseUrl === 'string' && item.releaseUrl.trim()) {
    return buildProviderUrl('raw', item.releaseUrl.trim())
  }

  return null
}

async function loadVersionManifest(providerOrder: UpdateLinkProviderId[]): Promise<CheckedManifest> {
  const errors: string[] = []

  for (const providerId of providerOrder) {
    const requestUrl = buildProviderUrl(providerId, REMOTE_VERSION_MANIFEST_URL)

    try {
      const response = await fetch(requestUrl, {
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(`请求失败 (${response.status})`)
      }

      const responseJson: unknown = await response.json()
      if (!isRemoteVersionManifest(responseJson)) {
        throw new Error('远程版本数据格式无效')
      }

      return {
        providerId,
        providerName: getUpdateLinkProvider(providerId).name,
        latestVersion: responseJson.latest.version,
        downloadUrl: resolveDownloadUrl(responseJson.latest, providerOrder),
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : '未知错误'
      errors.push(`${providerId}: ${reason}`)
    }
  }

  throw new Error(`无法获取远程版本信息（${errors.join('；')}）`)
}

export async function checkForAppUpdate({ localVersion, providerOrder }: UpdateCheckInput): Promise<AppUpdateCheckResult> {
  const result = await loadVersionManifest(providerOrder ?? DEFAULT_UPDATE_PROVIDER_ORDER)
  const compared = compareVersion(result.latestVersion, localVersion)

  if (compared > 0) {
    return {
      status: 'update-available',
      localVersion,
      latestVersion: result.latestVersion,
      providerId: result.providerId,
      providerName: result.providerName,
      downloadUrl: result.downloadUrl,
    }
  }

  return {
    status: 'up-to-date',
    localVersion,
    latestVersion: result.latestVersion,
    providerId: result.providerId,
    providerName: result.providerName,
  }
}
