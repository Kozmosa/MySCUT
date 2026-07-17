// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { getPreferredAiProvider, getStoredAiProvider } from '../../../src/core/ai/storage'

describe('AI provider storage migration', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('downgrades the removed builtin gateway preference to the local provider', () => {
    localStorage.setItem('aiProvider', 'builtinGateway')

    expect(getStoredAiProvider()).toBe('localModel')
    expect(getPreferredAiProvider()).toBe('localModel')
    expect(localStorage.getItem('aiProvider')).toBe('localModel')
  })

  it('keeps supported provider preferences unchanged', () => {
    localStorage.setItem('aiProvider', 'openaiCompatible')

    expect(getStoredAiProvider()).toBe('openaiCompatible')
    expect(localStorage.getItem('aiProvider')).toBe('openaiCompatible')
  })
})
