import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkForAppUpdate, compareVersion } from '../../../src/services/update/checkForUpdate'

const STABLE_MANIFEST_URL =
  'https://pub-2d4ca40983644b4295125ec388670de9.r2.dev/kozmos/releases/versions.json'
const NIGHTLY_MANIFEST_URL =
  'https://pub-2d4ca40983644b4295125ec388670de9.r2.dev/kozmos/releases/nightly/versions.json'

function stubManifestFetch(body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => body,
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function buildManifest({ version, minVersion }: { version: string; minVersion?: string }) {
  return {
    latest: {
      version,
      ...(minVersion ? { minVersion } : {}),
      releaseUrl: `https://github.com/Kozmosa/MySCUT/releases/tag/v${version}`,
      assets: {
        apk: [
          {
            source: 'r2',
            url: `https://r2.example.com/releases/v${version}/qmm-v${version}.apk`,
            size: 123,
            sha256: 'ab'.repeat(32),
          },
          {
            source: 'github',
            url: `https://github.com/Kozmosa/MySCUT/releases/download/v${version}/qmm-v${version}.apk`,
            size: 123,
            sha256: 'ab'.repeat(32),
          },
        ],
      },
    },
  }
}

describe('checkForAppUpdate', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('uses the primary manifest directly and returns an R2 asset URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          latest: {
            version: '0.4.3',
            assets: {
              apk: [
                { source: 'r2', url: 'https://r2.example.com/releases/v0.4.3/qmm-v0.4.3.apk' },
                {
                  source: 'github',
                  url: 'https://github.com/Kozmosa/MySCUT/releases/download/v0.4.3/qmm-v0.4.3.apk',
                },
              ],
            },
          },
        }),
      }),
    )

    const result = await checkForAppUpdate({
      localVersion: '0.4.2',
      providerOrder: ['github'],
      manifestUrls: ['https://r2.example.com/releases/versions.json'],
    })

    expect(result.status).toBe('update-available')
    if (result.status !== 'update-available') {
      return
    }

    expect(result.latestVersion).toBe('0.4.3')
    expect(result.downloadUrl).toBe('https://r2.example.com/releases/v0.4.3/qmm-v0.4.3.apk')
    expect(fetch).toHaveBeenCalledWith('https://r2.example.com/releases/versions.json', { cache: 'no-store' })
  })

  it('prefers r2 asset when github appears first in list', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          latest: {
            version: '0.4.4',
            assets: {
              apk: [
                {
                  source: 'github',
                  url: 'https://github.com/Kozmosa/MySCUT/releases/download/v0.4.4/qmm-v0.4.4.apk',
                },
                { source: 'r2', url: 'https://r2.example.com/releases/v0.4.4/qmm-v0.4.4.apk' },
              ],
            },
          },
        }),
      }),
    )

    const result = await checkForAppUpdate({
      localVersion: '0.4.2',
      providerOrder: ['fastgit', 'github'],
      manifestUrls: ['https://r2.example.com/releases/versions.json'],
    })

    expect(result.status).toBe('update-available')
    if (result.status !== 'update-available') {
      return
    }

    expect(result.latestVersion).toBe('0.4.4')
    expect(result.downloadUrl).toBe('https://r2.example.com/releases/v0.4.4/qmm-v0.4.4.apk')
  })

  it('supports legacy string asset and applies github provider transformation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          latest: {
            version: '1.0.0',
            assets: {
              apk: 'https://github.com/Kozmosa/MySCUT/releases/download/v1.0.0/qmm-v1.0.0.apk',
            },
          },
        }),
      }),
    )

    const result = await checkForAppUpdate({
      localVersion: '0.9.0',
      providerOrder: ['fastgit', 'github'],
      manifestUrls: ['https://example.com/versions.json'],
    })

    expect(result.status).toBe('update-available')
    if (result.status !== 'update-available') {
      return
    }

    expect(result.downloadUrl).toBe(
      'https://fastgit.cc/https://github.com/Kozmosa/MySCUT/releases/download/v1.0.0/qmm-v1.0.0.apk',
    )
  })

  it('returns up-to-date when latest version is not newer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          latest: {
            version: '0.4.2',
            assets: {
              apk: [{ source: 'r2', url: 'https://r2.example.com/releases/v0.4.2/qmm-v0.4.2.apk' }],
            },
          },
        }),
      }),
    )

    const result = await checkForAppUpdate({
      localVersion: '0.4.2',
      providerOrder: ['github'],
      manifestUrls: ['https://r2.example.com/releases/versions.json'],
    })

    expect(result.status).toBe('up-to-date')
    expect(result.latestVersion).toBe('0.4.2')
  })

  it('falls back to the repository manifest when the primary source fails', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          latest: {
            version: '0.5.0',
            assets: {},
          },
        }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const result = await checkForAppUpdate({
      localVersion: '0.4.9',
      manifestUrls: [
        'https://r2.example.com/releases/versions.json',
        'https://raw.githubusercontent.com/Kozmosa/MySCUT/refs/heads/main/versions.json',
      ],
    })

    expect(result.status).toBe('update-available')
    if (result.status === 'update-available') {
      expect(result.providerName).toBe('GitHub')
      expect(result.downloadUrl).toBeNull()
    }
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('falls back when the primary manifest is invalid', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ latest: {} }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ latest: { version: '0.5.0' } }) }),
    )

    const result = await checkForAppUpdate({
      localVersion: '0.5.0',
      manifestUrls: ['https://primary.example.com/versions.json', 'https://fallback.example.com/versions.json'],
    })

    expect(result.status).toBe('up-to-date')
  })

  it('throws when all manifest sources fail', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      }),
    )

    await expect(
      checkForAppUpdate({
        localVersion: '0.4.2',
        manifestUrls: ['https://primary.example.com/versions.json', 'https://fallback.example.com/versions.json'],
      }),
    ).rejects.toThrow('无法获取远程版本信息')
  })

  it('prefers the r2 asset carrying a checksum via the default stable manifest', async () => {
    const fetchMock = stubManifestFetch(buildManifest({ version: '0.9.0' }))

    const result = await checkForAppUpdate({ localVersion: '0.7.3' })

    expect(fetchMock.mock.calls[0]?.[0]).toBe(STABLE_MANIFEST_URL)
    expect(result.status).toBe('update-available')
    if (result.status === 'update-available') {
      expect(result.apkAsset?.url).toBe('https://r2.example.com/releases/v0.9.0/qmm-v0.9.0.apk')
      expect(result.apkAsset?.sha256).toBe('ab'.repeat(32))
    }
  })

  it('requires migration when local is below minVersion', async () => {
    stubManifestFetch(buildManifest({ version: '0.9.0', minVersion: '0.8.0' }))

    const result = await checkForAppUpdate({ localVersion: '0.7.3' })

    expect(result.status).toBe('migration-required')
    if (result.status === 'migration-required') {
      expect(result.minVersion).toBe('0.8.0')
      expect(result.latestVersion).toBe('0.9.0')
      expect(result.releaseUrl).toBe('https://github.com/Kozmosa/MySCUT/releases/tag/v0.9.0')
    }
  })

  it('does not require migration when local equals minVersion', async () => {
    stubManifestFetch(buildManifest({ version: '0.9.0', minVersion: '0.8.0' }))

    const result = await checkForAppUpdate({ localVersion: '0.8.0' })

    expect(result.status).toBe('update-available')
  })

  it('uses the single nightly manifest source when channel is nightly', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_UPDATE_CHANNEL', 'nightly')
    const { checkForAppUpdate: freshCheckForAppUpdate } = await import(
      '../../../src/services/update/checkForUpdate'
    )

    const fetchMock = stubManifestFetch({ latest: { version: '0.0.0-nightly.20261002.abc1234' } })

    const result = await freshCheckForAppUpdate({ localVersion: '0.0.0-nightly.20261001.abc1234' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(NIGHTLY_MANIFEST_URL)
    expect(result.status).toBe('update-available')
  })
})

describe('compareVersion', () => {
  it('compares numeric segments instead of strings', () => {
    expect(compareVersion('0.7.9', '0.7.10')).toBeLessThan(0)
    expect(compareVersion('0.7.10', '0.7.9')).toBeGreaterThan(0)
  })

  it('treats segments with suffixes by their leading digits', () => {
    expect(compareVersion('0.0.0-nightly.20261001.abc1234', '0.0.0-nightly.20261002.abc1234')).toBeLessThan(0)
    expect(compareVersion('0.0.0-nightly.20261002.abc1234', '0.0.0-nightly.20261001.def5678')).toBeGreaterThan(0)
  })

  it('strips the v prefix and treats missing segments as zero', () => {
    expect(compareVersion('v0.8.0', '0.8.0')).toBe(0)
    expect(compareVersion('0.8', '0.8.1')).toBeLessThan(0)
  })
})
