const AUTO_SIMPLIFY_SCHEDULE_HINT_STORAGE_KEY = 'scheduleAutoSimplifyHint'

export function getAutoSimplifyScheduleHintEnabled() {
  try {
    const storedValue = localStorage.getItem(AUTO_SIMPLIFY_SCHEDULE_HINT_STORAGE_KEY)
    if (storedValue === null) {
      return true
    }

    return storedValue === '1'
  } catch {
    return true
  }
}

export function setAutoSimplifyScheduleHintEnabled(enabled: boolean) {
  try {
    localStorage.setItem(AUTO_SIMPLIFY_SCHEDULE_HINT_STORAGE_KEY, enabled ? '1' : '0')
    return true
  } catch {
    return false
  }
}
