export const SCUT_JW_CAMPUS_URL = 'https://xsjw2018.jw.scut.edu.cn/'
export const SCUT_JW_WEBVPN_URL = 'https://xsjw2018-jw.webvpn.scut.edu.cn/'

export type ScutJwAccessMode = 'campus' | 'webvpn' | 'custom'

export type ScutJwEntryUrlResult =
  | { ok: true; url: string }
  | { ok: false; error: string }

const URL_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z\d+.-]*:/

function resolveCustomUrl(customUrl: string): ScutJwEntryUrlResult {
  const trimmedUrl = customUrl.trim()
  if (!trimmedUrl) {
    return { ok: false, error: '请输入自定义教务系统网址' }
  }

  const candidateUrl = URL_SCHEME_PATTERN.test(trimmedUrl)
    ? trimmedUrl
    : `https://${trimmedUrl}`

  try {
    const parsedUrl = new URL(candidateUrl)
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return { ok: false, error: '仅支持 HTTP 或 HTTPS 网址' }
    }

    return { ok: true, url: parsedUrl.toString() }
  } catch {
    return { ok: false, error: '请输入有效的教务系统网址' }
  }
}

export function resolveScutJwEntryUrl(
  accessMode: ScutJwAccessMode,
  customUrl = '',
): ScutJwEntryUrlResult {
  switch (accessMode) {
    case 'campus':
      return { ok: true, url: SCUT_JW_CAMPUS_URL }
    case 'webvpn':
      return { ok: true, url: SCUT_JW_WEBVPN_URL }
    case 'custom':
      return resolveCustomUrl(customUrl)
  }

  const unsupportedAccessMode: never = accessMode
  throw new Error(`Unsupported SCUT JW access mode: ${unsupportedAccessMode}`)
}
