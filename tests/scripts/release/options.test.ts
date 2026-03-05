import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parseReleaseOptions } from '../../../scripts/release/options.mjs'

const originalArgv = [...process.argv]
const originalNpmConfigArgv = process.env.npm_config_argv

function setArgv(args: string[]) {
  process.argv = ['node', 'scripts/release.mjs', ...args]
}

describe('parseReleaseOptions', () => {
  beforeEach(() => {
    delete process.env.npm_config_argv
  })

  afterEach(() => {
    process.argv = [...originalArgv]
    if (typeof originalNpmConfigArgv === 'string') {
      process.env.npm_config_argv = originalNpmConfigArgv
    } else {
      delete process.env.npm_config_argv
    }
  })

  it('defaults to android when no platform flag is provided', () => {
    setArgv(['0.4.2'])
    const options = parseReleaseOptions()
    expect(options.version).toBe('0.4.2')
    expect(options.platforms).toEqual({ android: true, ios: false })
  })

  it('parses ios and android flags with note and asset source', () => {
    setArgv(['0.4.2', '--android', '--ios', '--note', 'hello', '--asset-source', 'r2'])
    const options = parseReleaseOptions()

    expect(options.note).toBe('hello')
    expect(options.assetSource).toBe('r2')
    expect(options.platforms).toEqual({ android: true, ios: true })
  })

  it('parses platform list syntax', () => {
    setArgv(['0.4.2', '--platform=android,ios'])
    const options = parseReleaseOptions()
    expect(options.platforms).toEqual({ android: true, ios: true })
  })

  it('throws on unsupported asset source', () => {
    setArgv(['0.4.2', '--asset-source', 'oss'])
    expect(() => parseReleaseOptions()).toThrow('Unsupported asset source')
  })

  it('throws when platform flag is present but no platform selected', () => {
    setArgv(['0.4.2', '--platform='])
    expect(() => parseReleaseOptions()).toThrow('No platform selected')
  })

  it('falls back to npm_config_argv when direct argv is empty', () => {
    process.argv = ['node', 'scripts/release.mjs']
    process.env.npm_config_argv = JSON.stringify({
      original: ['run', 'release', '0.4.2', '--ios'],
    })

    const options = parseReleaseOptions()
    expect(options.version).toBe('0.4.2')
    expect(options.platforms).toEqual({ android: false, ios: true })
  })
})
