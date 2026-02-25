const SEMESTER_START_DATE_STORAGE_KEY = 'semesterStartDate'
const DEFAULT_SEMESTER_START_DATE = '2026-02-23'

function isValidDateText(dateText: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateText)
}

export function getSemesterStartDate() {
  try {
    const storedDate = localStorage.getItem(SEMESTER_START_DATE_STORAGE_KEY)
    if (!storedDate) {
      return DEFAULT_SEMESTER_START_DATE
    }

    if (isValidDateText(storedDate)) {
      return storedDate
    }

    return DEFAULT_SEMESTER_START_DATE
  } catch {
    return DEFAULT_SEMESTER_START_DATE
  }
}

export function saveSemesterStartDate(dateText: string) {
  if (!isValidDateText(dateText)) {
    return false
  }

  try {
    localStorage.setItem(SEMESTER_START_DATE_STORAGE_KEY, dateText)
    return true
  } catch {
    return false
  }
}
