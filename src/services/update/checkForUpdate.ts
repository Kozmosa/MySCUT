import { UPDATE_CHANNEL } from './channel'
import {
  buildProviderUrl,
  DEFAULT_UPDATE_PROVIDER_ORDER,
  type UpdateLinkProviderId,
} from './providers'

const DEFAULT_PRIMARY_MANIFEST_URL =
  'https://pub-2d4ca40983644b4295125ec388670de9.r2.dev/kozmos/releases/versions.json'
const DEFAULT_FALLBACK_MANIFEST_URL =
  'https://cdn.jsdelivr.net/gh/Kozmosa/MySCUT@main/versions.json'
const DEFAULT_NIGHTLY_MANIFEST_URL =
  'https://pub-2d4ca40983644b4295125ec388670de9.r2.dev/kozmos/releases/nightly/versions.json'

type RemoteVersionAssets = {
  apk?: string | RemoteAssetLink[]
}

type RemoteAssetLink = {
  source?: string
  url?: string
  size?: number
  sha256?: string
}

type RemoteVersionItem = {
  version: string
  releaseUrl?: string
  minVersion?: string
  assets?: RemoteVersionAssets
}

type NormalizedAssetLink = {
  source: string
  url: string
  sha256?: string
  size?: number
}

type RemoteVersionManifest = {
  latest: RemoteVersionItem
}

export type ApkAssetDescriptor = {
  url: string
  sha256?: string
  size?: number
}

type CheckedManifest = {
  providerId: UpdateLinkProviderId
  providerName: string
  latestVersion: string
  minVersion: string | null
  releaseUrl: string | null
  downloadUrl: string | null
  apkAsset: ApkAssetDescriptor | null
}

type UpdateCheckInput = {
  localVersion: string
  providerOrder?: UpdateLinkProviderId[]
  manifestUrls?: string[]
}

type UpdateAvailableResult = {
  status: 'update-available'
  localVersion: string
  latestVersion: string
  providerId: UpdateLinkProviderId
  providerName: string
  downloadUrl: string | null
  apkAsset: ApkAssetDescriptor | null
}

type UpToDateResult = {
  status: 'up-to-date'
  localVersion: string
  latestVersion: string
  providerId: UpdateLinkProviderId
  providerName: string
}

// 本地版本低于清单声明的 minVersion 时返回：应用内直接更新到 latest 已不可行
// （如更换签名密钥后的存量版本），需引导用户走卸载重装的迁移路径。
type MigrationRequiredResult = {
  status: 'migration-required'
  localVersion: string
  latestVersion: string
  minVersion: string
  providerId: UpdateLinkProviderId
  providerName: string
  releaseUrl: string | null
  downloadUrl: string | null
}

export type AppUpdateCheckResult = UpdateAvailableResult | UpToDateResult | MigrationRequiredResult

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

export function compareVersion(left: string, right: string) {
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
  const apkUrl = resolveAssetUrl(item.assets?.apk, providerOrder)
  if (apkUrl) {
    return apkUrl
  }

  if (typeof item.releaseUrl === 'string' && item.releaseUrl.trim()) {
    return buildProviderUrl('raw', item.releaseUrl.trim())
  }

  return null
}

function normalizeAssetLinks(assetField: string | RemoteAssetLink[] | undefined) {
  if (typeof assetField === 'string') {
    const legacyUrl = assetField.trim()
    return legacyUrl ? [{ source: 'legacy', url: legacyUrl }] : []
  }

  if (!Array.isArray(assetField)) {
    return []
  }

  const links: NormalizedAssetLink[] = []
  for (const entry of assetField) {
    if (!entry || typeof entry !== 'object') {
      continue
    }

    const source = typeof entry.source === 'string' ? entry.source.trim().toLowerCase() : ''
    const url = typeof entry.url === 'string' ? entry.url.trim() : ''
    if (!url) {
      continue
    }

    links.push({
      source: source || 'unknown',
      url,
      sha256: typeof entry.sha256 === 'string' ? entry.sha256.trim().toLowerCase() : undefined,
      size: typeof entry.size === 'number' ? entry.size : undefined,
    })
  }

  return links
}

function resolveDefaultManifestUrls() {
  if (UPDATE_CHANNEL === 'nightly') {
    // nightly 清单不进仓库，无 jsDelivr 回退源，为 R2 单源；R2 不可达时直接报错，
    // 测试者可到 GitHub Releases 页人工下载。
    const nightlyUrl = import.meta.env.VITE_UPDATE_MANIFEST_URL?.trim() || DEFAULT_NIGHTLY_MANIFEST_URL
    return nightlyUrl ? [nightlyUrl] : []
  }

  const primaryUrl = import.meta.env.VITE_UPDATE_MANIFEST_URL?.trim() || DEFAULT_PRIMARY_MANIFEST_URL
  const fallbackUrl = import.meta.env.VITE_UPDATE_MANIFEST_FALLBACK_URL?.trim() || DEFAULT_FALLBACK_MANIFEST_URL
  return [...new Set([primaryUrl, fallbackUrl].filter(Boolean))]
}

function getManifestSourceName(url: string, index: number) {
  if (url.includes('.r2.dev/')) {
    return 'Cloudflare R2'
  }

  if (url.includes('cdn.jsdelivr.net/')) {
    return 'jsDelivr CDN'
  }

  if (url.includes('raw.githubusercontent.com/')) {
    return 'GitHub'
  }

  return index === 0 ? '主版本源' : `备用版本源 ${index}`
}

function resolveApkAssetDescriptor(
  assetField: string | RemoteAssetLink[] | undefined,
  providerOrder: UpdateLinkProviderId[],
): ApkAssetDescriptor | null {
  const links = normalizeAssetLinks(assetField)
  const preferredLink =
    links.find((link) => link.source === 'r2' && link.sha256) ??
    links.find((link) => link.source === 'r2') ??
    links.find((link) => link.sha256) ??
    links[0]

  if (!preferredLink) {
    return null
  }

  const url = preferredLink.url.toLowerCase().includes('github')
    ? resolveGithubDownloadUrl(preferredLink.url, providerOrder)
    : preferredLink.url

  if (!url) {
    return null
  }

  return {
    url,
    sha256: preferredLink.sha256,
    size: preferredLink.size,
  }
}

function resolveAssetUrl(assetField: string | RemoteAssetLink[] | undefined, providerOrder: UpdateLinkProviderId[]) {
  const links = normalizeAssetLinks(assetField)
  const preferredR2Link = links.find((link) => link.source === 'r2')
  if (preferredR2Link) {
    return buildProviderUrl('raw', preferredR2Link.url)
  }

  const preferredGithubLink = links.find((link) => link.source === 'github')
  if (preferredGithubLink) {
    return resolveGithubDownloadUrl(preferredGithubLink.url, providerOrder)
  }

  for (const link of links) {
    const normalizedUrl = link.url.toLowerCase()
    if (normalizedUrl.includes('github')) {
      return resolveGithubDownloadUrl(link.url, providerOrder)
    }

    return buildProviderUrl('raw', link.url)
  }

  return ''
}

async function loadVersionManifest(
  providerOrder: UpdateLinkProviderId[],
  manifestUrls: string[],
): Promise<CheckedManifest> {
  const errors: string[] = []

  for (const [index, requestUrl] of manifestUrls.entries()) {
    const sourceName = getManifestSourceName(requestUrl, index)

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
        providerId: 'raw',
        providerName: sourceName,
        latestVersion: responseJson.latest.version,
        minVersion: typeof responseJson.latest.minVersion === 'string' && responseJson.latest.minVersion.trim()
          ? responseJson.latest.minVersion.trim()
          : null,
        releaseUrl: typeof responseJson.latest.releaseUrl === 'string' && responseJson.latest.releaseUrl.trim()
          ? responseJson.latest.releaseUrl.trim()
          : null,
        downloadUrl: resolveDownloadUrl(responseJson.latest, providerOrder),
        apkAsset: resolveApkAssetDescriptor(responseJson.latest.assets?.apk, providerOrder),
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : '未知错误'
      errors.push(`${sourceName}: ${reason}`)
    }
  }

  throw new Error(`无法获取远程版本信息（${errors.join('；')}）`)
}

export async function checkForAppUpdate({
  localVersion,
  providerOrder,
  manifestUrls,
}: UpdateCheckInput): Promise<AppUpdateCheckResult> {
  const result = await loadVersionManifest(
    providerOrder ?? DEFAULT_UPDATE_PROVIDER_ORDER,
    manifestUrls ?? resolveDefaultManifestUrls(),
  )
  const compared = compareVersion(result.latestVersion, localVersion)

  if (result.minVersion && compareVersion(localVersion, result.minVersion) < 0) {
    return {
      status: 'migration-required',
      localVersion,
      latestVersion: result.latestVersion,
      minVersion: result.minVersion,
      providerId: result.providerId,
      providerName: result.providerName,
      releaseUrl: result.releaseUrl,
      downloadUrl: result.downloadUrl,
    }
  }

  if (compared > 0) {
    return {
      status: 'update-available',
      localVersion,
      latestVersion: result.latestVersion,
      providerId: result.providerId,
      providerName: result.providerName,
      downloadUrl: result.downloadUrl,
      apkAsset: result.apkAsset,
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
