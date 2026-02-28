import type { ScheduleData, TimeSlotPresetId, WakeupTimeSlot } from './types'

type TimeSlotPresetOption = {
  id: TimeSlotPresetId
  name: string
}

type TimeSlotRange = {
  node: number
  startTime: string
  endTime: string
}

const INTERNATIONAL_AND_UNIVERSITY_TOWN_RANGES: TimeSlotRange[] = [
  { node: 1, startTime: '08:50', endTime: '09:35' },
  { node: 2, startTime: '09:40', endTime: '10:25' },
  { node: 3, startTime: '10:40', endTime: '11:25' },
  { node: 4, startTime: '11:30', endTime: '12:15' },
  { node: 5, startTime: '14:00', endTime: '14:45' },
  { node: 6, startTime: '14:50', endTime: '15:35' },
  { node: 7, startTime: '15:45', endTime: '16:30' },
  { node: 8, startTime: '16:35', endTime: '17:20' },
  { node: 9, startTime: '19:00', endTime: '19:45' },
  { node: 10, startTime: '19:55', endTime: '20:40' },
  { node: 11, startTime: '20:50', endTime: '21:35' },
]

const WUSHAN_RANGES: TimeSlotRange[] = [
  { node: 1, startTime: '08:00', endTime: '08:45' },
  { node: 2, startTime: '08:55', endTime: '09:40' },
  { node: 3, startTime: '10:00', endTime: '10:45' },
  { node: 4, startTime: '10:55', endTime: '11:40' },
  { node: 5, startTime: '14:30', endTime: '15:15' },
  { node: 6, startTime: '15:25', endTime: '16:10' },
  { node: 7, startTime: '16:20', endTime: '17:05' },
  { node: 8, startTime: '17:15', endTime: '18:00' },
  { node: 9, startTime: '19:00', endTime: '19:45' },
  { node: 10, startTime: '19:55', endTime: '20:40' },
  { node: 11, startTime: '20:50', endTime: '21:35' },
]

function createPresetTimeSlots(ranges: TimeSlotRange[], timeTableId: number): WakeupTimeSlot[] {
  return ranges.map((range) => ({
    node: range.node,
    startTime: range.startTime,
    endTime: range.endTime,
    timeTable: timeTableId,
  }))
}

const UNIVERSITY_TOWN_TIME_SLOTS = createPresetTimeSlots(INTERNATIONAL_AND_UNIVERSITY_TOWN_RANGES, 9001)
const WUSHAN_TIME_SLOTS = createPresetTimeSlots(WUSHAN_RANGES, 9002)
const INTERNATIONAL_TIME_SLOTS = createPresetTimeSlots(INTERNATIONAL_AND_UNIVERSITY_TOWN_RANGES, 9003)

export const TIME_SLOT_PRESET_OPTIONS: TimeSlotPresetOption[] = [
  { id: 'universityTown', name: '大学城时间' },
  { id: 'wushan', name: '五山时间' },
  { id: 'international', name: '国际时间' },
  { id: 'builtIn', name: '课表自带预设' },
]

export function getTimeSlotPresetName(presetId: TimeSlotPresetId) {
  return TIME_SLOT_PRESET_OPTIONS.find((option) => option.id === presetId)?.name ?? '课表自带预设'
}

function getBuiltInTimeSlots(scheduleData: ScheduleData) {
  const matched = scheduleData.timeSlots.filter((slot) => slot.timeTable === scheduleData.table.timeTable)
  return (matched.length > 0 ? matched : scheduleData.timeSlots).sort((left, right) => left.node - right.node)
}

export function resolveScheduleTimeSlotsByPreset(scheduleData: ScheduleData, presetId: TimeSlotPresetId) {
  switch (presetId) {
    case 'universityTown':
      return UNIVERSITY_TOWN_TIME_SLOTS
    case 'wushan':
      return WUSHAN_TIME_SLOTS
    case 'international':
      return INTERNATIONAL_TIME_SLOTS
    case 'builtIn':
    default:
      return getBuiltInTimeSlots(scheduleData)
  }
}
