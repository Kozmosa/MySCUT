import { describe, expect, it } from 'vitest'
import { parseStatusPaths } from '../../scripts/release/gitFlow.mjs'

describe('parseStatusPaths', () => {
  it('preserves the first character of an unstaged path', () => {
    expect(parseStatusPaths([
      ' M android/app/build.gradle',
      '?? .release-notes/v0.6.2.md',
    ].join('\n'))).toEqual([
      'android/app/build.gradle',
      '.release-notes/v0.6.2.md',
    ])
  })

  it('returns no paths for a clean worktree', () => {
    expect(parseStatusPaths('')).toEqual([])
  })
})
