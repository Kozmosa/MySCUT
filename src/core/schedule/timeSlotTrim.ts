import type { WakeupTimeSlot } from './types'

function parseTimeToMinutes(timeText: string) {
  const matched = timeText.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!matched) {
    return null
  }

  const hour = Number.parseInt(matched[1], 10)
  const minute = Number.parseInt(matched[2], 10)
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null
  }

  return hour * 60 + minute
}

export function trimRedundantTimeSlots(timeSlots: WakeupTimeSlot[]) {
  for (let index = 0; index < timeSlots.length - 1; index += 1) {
    const currentEnd = parseTimeToMinutes(timeSlots[index]?.endTime ?? '')
    const nextEnd = parseTimeToMinutes(timeSlots[index + 1]?.endTime ?? '')
    if (currentEnd === null || nextEnd === null) {
      continue
    }

    if (nextEnd - currentEnd === 10) {
      return timeSlots.slice(0, index)
    }
  }

  return timeSlots
}
