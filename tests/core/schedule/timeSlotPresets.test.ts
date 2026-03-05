import { describe, expect, it } from 'vitest'
import {
  getTimeSlotPresetName,
  resolveNearestCampusTimeSlotPresetId,
  resolveScheduleTimeSlotsByPreset,
} from '../../../src/core/schedule/timeSlotPresets'
import type { ScheduleData, WakeupTimeSlot } from '../../../src/core/schedule/types'

function createScheduleData(timeSlots: WakeupTimeSlot[]): ScheduleData {
  return {
    version: 1,
    source: 'scutHtml',
    importedAt: 0,
    table: {
      id: 1,
      name: 'Test',
      campus: 'Test',
      school: 'Test',
      maxWeek: 20,
      nodes: 11,
      startDate: '2026-02-23',
      showSat: true,
      showSun: true,
      timeTable: 2,
    },
    timeSlots,
    courses: [],
    lessons: [],
    raw: {
      kind: 'scutHtml',
      html: '',
    },
  }
}

describe('timeSlotPresets', () => {
  it('resolves nearest preset as wushan', () => {
    const sourceSlots: WakeupTimeSlot[] = [
      { node: 1, startTime: '08:00', endTime: '08:45', timeTable: 1 },
      { node: 2, startTime: '08:55', endTime: '09:40', timeTable: 1 },
    ]
    expect(resolveNearestCampusTimeSlotPresetId(sourceSlots)).toBe('wushan')
  })

  it('resolves nearest preset as universityTown', () => {
    const sourceSlots: WakeupTimeSlot[] = [
      { node: 1, startTime: '08:50', endTime: '09:35', timeTable: 1 },
      { node: 2, startTime: '09:40', endTime: '10:25', timeTable: 1 },
    ]
    expect(resolveNearestCampusTimeSlotPresetId(sourceSlots)).toBe('universityTown')
  })

  it('returns built-in slots sorted and filtered by timetable when available', () => {
    const scheduleData = createScheduleData([
      { node: 2, startTime: '09:00', endTime: '09:45', timeTable: 2 },
      { node: 1, startTime: '08:00', endTime: '08:45', timeTable: 2 },
      { node: 1, startTime: '08:50', endTime: '09:35', timeTable: 9 },
    ])

    const slots = resolveScheduleTimeSlotsByPreset(scheduleData, 'builtIn')
    expect(slots.map((slot) => slot.node)).toEqual([1, 2])
    expect(slots.every((slot) => slot.timeTable === 2)).toBe(true)
  })

  it('returns union preset time slots', () => {
    const scheduleData = createScheduleData([])
    const slots = resolveScheduleTimeSlotsByPreset(scheduleData, 'union')
    expect(slots.length).toBeGreaterThan(0)
    expect(slots[0]?.node).toBe(1)
  })

  it('maps international name to shared display label', () => {
    expect(getTimeSlotPresetName('international')).toBe('大学城 / 国际时间')
  })
})
