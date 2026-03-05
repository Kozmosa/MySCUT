import { describe, expect, it } from 'vitest'
import { buildProviderUrl } from '../../../src/services/update/providers'

describe('buildProviderUrl', () => {
  it('returns original url for github provider', () => {
    const sourceUrl = 'https://example.com/a.apk'
    expect(buildProviderUrl('github', sourceUrl)).toBe(sourceUrl)
  })

  it('builds fastgit proxy url', () => {
    const sourceUrl = 'https://github.com/org/repo/releases/download/v1/a.apk'
    expect(buildProviderUrl('fastgit', sourceUrl)).toBe(`https://fastgit.cc/${sourceUrl}`)
  })

  it('transforms github raw url to jsdelivr gh url', () => {
    const rawUrl =
      'https://raw.githubusercontent.com/Kozmosa/survive-in-scut/refs/heads/main/docs/.vuepress/public/root-assets/versions.json'

    expect(buildProviderUrl('jsdelivr', rawUrl)).toBe(
      'https://cdn.jsdelivr.net/gh/Kozmosa/survive-in-scut@main/docs/.vuepress/public/root-assets/versions.json',
    )
  })

  it('falls back to original url for non raw github input in jsdelivr provider', () => {
    const sourceUrl = 'https://github.com/Kozmosa/MySCUT/releases/download/v0.4.2/qmm-v0.4.2.apk'
    expect(buildProviderUrl('jsdelivr', sourceUrl)).toBe(sourceUrl)
  })

  it('returns original url for raw provider', () => {
    const sourceUrl = 'https://r2.example.com/releases/v0.4.2/qmm-v0.4.2.apk'
    expect(buildProviderUrl('raw', sourceUrl)).toBe(sourceUrl)
  })
})
