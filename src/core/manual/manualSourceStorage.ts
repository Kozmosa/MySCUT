const MANUAL_SOURCE_STORAGE_KEY = 'manualUseLocal'

export const LOCAL_MANUAL_URL = '/docs/index.html'
export const REMOTE_MANUAL_URL = 'https://manual.xn--xkrsa0ti6rf4cf98d.com/'

export function getUseLocalManual() {
  try {
    return localStorage.getItem(MANUAL_SOURCE_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function setUseLocalManual(enabled: boolean) {
  try {
    localStorage.setItem(MANUAL_SOURCE_STORAGE_KEY, enabled ? '1' : '0')
    return true
  } catch {
    return false
  }
}
