import { describe, expect, it } from 'vitest'
import { trimRedundantTimeSlots } from '../../../src/core/schedule/timeSlotTrim'
import type { WakeupTimeSlot } from '../../../src/core/schedule/types'

describe('trimRedundantTimeSlots', () => {
  it('cuts slots when detecting 10-minute boundary pattern', () => {
    const slots: WakeupTimeSlot[] = [
      { node: 1, startTime: '08:00', endTime: '08:45', timeTable: 1 },
      { node: 2, startTime: '08:55', endTime: '09:40', timeTable: 1 },
      { node: 3, startTime: '09:50', endTime: '09:50', timeTable: 1 },
    ]

    const trimmed = trimRedundantTimeSlots(slots)
    expect(trimmed).toEqual([{ node: 1, startTime: '08:00', endTime: '08:45', timeTable: 1 }])
  })

  it('returns original array when no pattern is found', () => {
    const slots: WakeupTimeSlot[] = [
      { node: 1, startTime: '08:00', endTime: '08:45', timeTable: 1 },
      { node: 2, startTime: '08:55', endTime: '09:40', timeTable: 1 },
      { node: 3, startTime: '10:00', endTime: '10:50', timeTable: 1 },
    ]

    const trimmed = trimRedundantTimeSlots(slots)
    expect(trimmed).toBe(slots)
  })

  it('skips invalid time strings safely', () => {
    const slots: WakeupTimeSlot[] = [
      { node: 1, startTime: '08:00', endTime: 'invalid', timeTable: 1 },
      { node: 2, startTime: '08:55', endTime: '09:40', timeTable: 1 },
    ]

    const trimmed = trimRedundantTimeSlots(slots)
    expect(trimmed).toBe(slots)
  })
})
