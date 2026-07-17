import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkForAppUpdate } from '../../../src/services/update/checkForUpdate'

describe('checkForAppUpdate', () => {
  afterEach(() => {
    vi.restoreAllMocks()
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
})
