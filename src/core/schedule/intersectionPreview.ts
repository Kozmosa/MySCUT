import type { ScheduleData } from './types'

const INTERSECTION_PREVIEW_STORAGE_KEY = 'intersectionPreviewPayload'

export type IntersectionPreviewPayload = {
  scheduleData: ScheduleData
  defaultSaveName: string
}

export function saveIntersectionPreviewPayload(payload: IntersectionPreviewPayload) {
  try {
    sessionStorage.setItem(INTERSECTION_PREVIEW_STORAGE_KEY, JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}

export function loadIntersectionPreviewPayload() {
  try {
    const raw = sessionStorage.getItem(INTERSECTION_PREVIEW_STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as IntersectionPreviewPayload
    if (!parsed || typeof parsed !== 'object' || !parsed.scheduleData || typeof parsed.defaultSaveName !== 'string') {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export function clearIntersectionPreviewPayload() {
  try {
    sessionStorage.removeItem(INTERSECTION_PREVIEW_STORAGE_KEY)
  } catch {
    return
  }
}
