import { describe, expect, it } from 'vitest'
import {
  createManualDependencyStamp,
  resolveManualBuildProtocol,
} from '../../scripts/manualBuildProtocol.mjs'

describe('resolveManualBuildProtocol', () => {
  it('uses npm and the VitePress output for the current manual project', () => {
    expect(resolveManualBuildProtocol({
      hasPackageLock: true,
      hasVitePressConfig: true,
    })).toEqual({
      installCommand: 'npm ci --ignore-scripts',
      lockFileName: 'package-lock.json',
      outputDirectoryName: 'vite-platform-dist',
    })
  })

  it('fails fast when the manual build contract is incomplete', () => {
    expect(() => resolveManualBuildProtocol({
      hasPackageLock: false,
      hasVitePressConfig: true,
    })).toThrow('package-lock.json')

    expect(() => resolveManualBuildProtocol({
      hasPackageLock: true,
      hasVitePressConfig: false,
    })).toThrow('VitePress config')
  })
})

describe('createManualDependencyStamp', () => {
  it('changes when the package manager or lock content changes', () => {
    const initial = createManualDependencyStamp('npm ci --ignore-scripts', 'lock-content')

    expect(createManualDependencyStamp('npm ci --ignore-scripts', 'lock-content')).toBe(initial)
    expect(createManualDependencyStamp('npm ci --ignore-scripts', 'updated-lock')).not.toBe(initial)
    expect(createManualDependencyStamp('npm ci', 'lock-content')).not.toBe(initial)
    expect(createManualDependencyStamp('npm install', 'lock-content')).not.toBe(initial)
  })
})
