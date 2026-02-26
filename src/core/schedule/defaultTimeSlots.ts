import type { WakeupTimeSlot } from './types'

export const DEFAULT_SCUT_TIME_SLOTS: WakeupTimeSlot[] = [
  { node: 1, startTime: '08:50', endTime: '09:35', timeTable: 2 },
  { node: 2, startTime: '09:40', endTime: '10:25', timeTable: 2 },
  { node: 3, startTime: '10:40', endTime: '11:25', timeTable: 2 },
  { node: 4, startTime: '11:30', endTime: '12:15', timeTable: 2 },
  { node: 5, startTime: '14:00', endTime: '14:45', timeTable: 2 },
  { node: 6, startTime: '14:50', endTime: '15:35', timeTable: 2 },
  { node: 7, startTime: '15:45', endTime: '16:30', timeTable: 2 },
  { node: 8, startTime: '16:35', endTime: '17:20', timeTable: 2 },
  { node: 9, startTime: '18:30', endTime: '19:15', timeTable: 2 },
  { node: 10, startTime: '19:30', endTime: '20:15', timeTable: 2 },
  { node: 11, startTime: '20:30', endTime: '21:15', timeTable: 2 },
]
