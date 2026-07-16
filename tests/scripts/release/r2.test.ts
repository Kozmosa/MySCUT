import { describe, expect, it } from 'vitest'
import {
  buildR2LatestVersionsObjectKey,
  buildR2PublicUrl,
  buildR2ReleaseObjectKey,
} from '../../../scripts/release/r2.mjs'

describe('r2 helper functions', () => {
  it('builds release object key with normalized prefix', () => {
    const objectKey = buildR2ReleaseObjectKey({
      keyPrefix: '/releases/',
      version: '0.4.2',
      fileName: 'qmm-v0.4.2.apk',
    })

    expect(objectKey).toBe('releases/v0.4.2/qmm-v0.4.2.apk')
  })

  it('builds encoded public url for object key', () => {
    const publicUrl = buildR2PublicUrl({
      publicBaseUrl: 'https://cdn.example.com',
      objectKey: 'releases/v0.4.2/My SCUT.apk',
    })

    expect(publicUrl).toBe('https://cdn.example.com/releases/v0.4.2/My%20SCUT.apk')
  })

  it('builds a stable versions manifest object key', () => {
    expect(buildR2LatestVersionsObjectKey({
      keyPrefix: '/releases/',
    })).toBe('releases/versions.json')
  })
})
