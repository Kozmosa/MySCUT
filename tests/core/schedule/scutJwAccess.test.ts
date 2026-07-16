import { describe, expect, it } from 'vitest'
import {
  SCUT_JW_CAMPUS_URL,
  SCUT_JW_WEBVPN_URL,
  resolveScutJwEntryUrl,
} from '../../../src/core/schedule/scutJwAccess'

describe('resolveScutJwEntryUrl', () => {
  it('resolves the campus network preset', () => {
    expect(resolveScutJwEntryUrl('campus')).toEqual({
      ok: true,
      url: SCUT_JW_CAMPUS_URL,
    })
  })

  it('resolves the WebVPN preset', () => {
    expect(resolveScutJwEntryUrl('webvpn')).toEqual({
      ok: true,
      url: SCUT_JW_WEBVPN_URL,
    })
  })

  it('adds HTTPS to a custom URL without a scheme', () => {
    expect(resolveScutJwEntryUrl('custom', ' jw.example.edu.cn/student?k=1 ')).toEqual({
      ok: true,
      url: 'https://jw.example.edu.cn/student?k=1',
    })
  })

  it('preserves a complete custom HTTP URL', () => {
    expect(resolveScutJwEntryUrl('custom', 'http://10.0.2.2:8080/schedule#week')).toEqual({
      ok: true,
      url: 'http://10.0.2.2:8080/schedule#week',
    })
  })

  it('preserves a complete custom HTTPS URL', () => {
    expect(resolveScutJwEntryUrl('custom', 'https://jw.example.edu.cn/schedule?semester=1#week')).toEqual({
      ok: true,
      url: 'https://jw.example.edu.cn/schedule?semester=1#week',
    })
  })

  it('rejects an empty custom URL', () => {
    expect(resolveScutJwEntryUrl('custom', '   ')).toEqual({
      ok: false,
      error: '请输入自定义教务系统网址',
    })
  })

  it.each([
    ['javascript:alert(1)', '仅支持 HTTP 或 HTTPS 网址'],
    ['file:///tmp/schedule', '仅支持 HTTP 或 HTTPS 网址'],
    ['://invalid', '请输入有效的教务系统网址'],
  ])('rejects unsupported or invalid custom URL %s', (customUrl, error) => {
    expect(resolveScutJwEntryUrl('custom', customUrl)).toEqual({
      ok: false,
      error,
    })
  })
})
