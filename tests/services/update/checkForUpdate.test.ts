import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkForAppUpdate } from '../../../src/services/update/checkForUpdate'

describe('checkForAppUpdate', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns update-available and uses r2 asset url directly', async () => {
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
    })

    expect(result.status).toBe('update-available')
    if (result.status !== 'update-available') {
      return
    }

    expect(result.latestVersion).toBe('0.4.3')
    expect(result.downloadUrl).toBe('https://r2.example.com/releases/v0.4.3/qmm-v0.4.3.apk')
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
    })

    expect(result.status).toBe('up-to-date')
    expect(result.latestVersion).toBe('0.4.2')
  })

  it('throws when all providers fail to fetch manifest', async () => {
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
        providerOrder: ['github', 'raw'],
      }),
    ).rejects.toThrow('无法获取远程版本信息')
  })
})
