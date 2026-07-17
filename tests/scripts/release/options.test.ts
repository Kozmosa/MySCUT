import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parseReleaseOptions } from '../../../scripts/release/options.mjs'

const originalArgv = [...process.argv]
const originalNpmConfigArgv = process.env.npm_config_argv
const npmConfigKeys = [
  'npm_config_android',
  'npm_config_ios',
  'npm_config_note_file',
  'npm_config_asset_source',
  'npm_config_dry_run',
] as const
const originalNpmConfigValues = Object.fromEntries(npmConfigKeys.map((key) => [key, process.env[key]]))

function setArgv(args: string[]) {
  process.argv = ['node', 'scripts/release.mjs', ...args]
}

describe('parseReleaseOptions', () => {
  beforeEach(() => {
    delete process.env.npm_config_argv
    for (const key of npmConfigKeys) {
      delete process.env[key]
    }
  })

  afterEach(() => {
    process.argv = [...originalArgv]
    if (typeof originalNpmConfigArgv === 'string') {
      process.env.npm_config_argv = originalNpmConfigArgv
    } else {
      delete process.env.npm_config_argv
    }
    for (const key of npmConfigKeys) {
      const originalValue = originalNpmConfigValues[key]
      if (typeof originalValue === 'string') {
        process.env[key] = originalValue
      } else {
        delete process.env[key]
      }
    }
  })

  it('defaults to android when no platform flag is provided', () => {
    setArgv(['0.4.2'])
    const options = parseReleaseOptions()
    expect(options.version).toBe('0.4.2')
    expect(options.platforms).toEqual({ android: true, ios: false })
  })

  it('parses ios and android flags with note file, R2 and dry run', () => {
    setArgv(['0.4.2', '--android', '--ios', '--note-file', 'notes.md', '--asset-source', 'r2', '--dry-run'])
    const options = parseReleaseOptions()

    expect(options.noteFile).toBe('notes.md')
    expect(options.assetSource).toBe('r2')
    expect(options.dryRun).toBe(true)
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

  it('rejects note text and note file used together', () => {
    setArgv(['0.4.2', '--note', 'hello', '--note-file', 'notes.md'])
    expect(() => parseReleaseOptions()).toThrow('either --note or --note-file')
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

  it('reads flags that npm 11 exposes through npm_config environment variables', () => {
    setArgv(['0.4.2', 'notes.md'])
    process.env.npm_config_android = 'true'
    process.env.npm_config_note_file = 'notes.md'
    process.env.npm_config_asset_source = 'r2'
    process.env.npm_config_dry_run = 'true'

    const options = parseReleaseOptions()
    expect(options.platforms).toEqual({ android: true, ios: false })
    expect(options.noteFile).toBe('notes.md')
    expect(options.assetSource).toBe('r2')
    expect(options.dryRun).toBe(true)
  })
})
