import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { ensureManualSubmodule } from '../../scripts/manualSubmoduleUtils.mjs'

const tempDirectories: string[] = []

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

function createTempDirectory() {
  const directory = mkdtempSync(resolve(tmpdir(), 'myscut-manual-submodule-'))
  tempDirectories.push(directory)
  return directory
}

describe('ensureManualSubmodule', () => {
  it('does not reset an already initialized manual checkout', () => {
    const manualDir = createTempDirectory()
    writeFileSync(resolve(manualDir, '.git'), 'gitdir: test')
    let initializeCalls = 0

    expect(ensureManualSubmodule({
      manualDir,
      initialize: () => {
        initializeCalls += 1
      },
    })).toBe(false)
    expect(initializeCalls).toBe(0)
  })

  it('initializes a missing manual checkout', () => {
    const manualDir = createTempDirectory()
    let initializeCalls = 0

    expect(ensureManualSubmodule({
      manualDir,
      initialize: () => {
        initializeCalls += 1
      },
    })).toBe(true)
    expect(initializeCalls).toBe(1)
  })
})
