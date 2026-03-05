import { resolveScheduleTimeSlotsByPreset } from './timeSlotPresets'
import type { ScheduleCourse, ScheduleData, ScheduleLesson, TimeSlotPresetId, WakeupTimeSlot } from './types'

export type IntersectionDisplayMode = 'default' | 'availableOnly' | 'unavailableOnly'

export type IntersectionParticipant = {
  name: string
  scheduleData: ScheduleData
  timeSlotPresetId: TimeSlotPresetId
}

type TimeInterval = {
  start: number
  end: number
}

const UNAVAILABLE_COLOR = '#d4380d'
const ALL_AVAILABLE_COLOR = '#52c41a'

function createCellKey(week: number, day: number, node: number) {
  return `${week}-${day}-${node}`
}

function parseTimeToMinutes(timeText: string) {
  const match = timeText.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) {
    return null
  }

  const hour = Number.parseInt(match[1], 10)
  const minute = Number.parseInt(match[2], 10)
  return hour * 60 + minute
}

function buildTimeSlotIntervalMap(timeSlots: WakeupTimeSlot[]) {
  const timeSlotMap = new Map<number, TimeInterval>()

  timeSlots.forEach((slot) => {
    const start = parseTimeToMinutes(slot.startTime)
    const end = parseTimeToMinutes(slot.endTime)
    if (start === null || end === null || end <= start) {
      return
    }

    timeSlotMap.set(slot.node, { start, end })
  })

  return timeSlotMap
}

function resolveLessonInterval(lesson: ScheduleLesson, timeSlotMap: Map<number, TimeInterval>) {
  const explicitStart = parseTimeToMinutes(lesson.startTime)
  const explicitEnd = parseTimeToMinutes(lesson.endTime)

  if (explicitStart !== null && explicitEnd !== null && explicitEnd > explicitStart) {
    return {
      start: explicitStart,
      end: explicitEnd,
    }
  }

  const startSlot = timeSlotMap.get(lesson.startNode)
  const endSlot = timeSlotMap.get(lesson.endNode)
  if (!startSlot || !endSlot || endSlot.end <= startSlot.start) {
    return null
  }

  return {
    start: startSlot.start,
    end: endSlot.end,
  }
}

function isWeekMatched(week: number, lesson: ScheduleLesson) {
  if (week < lesson.startWeek || week > lesson.endWeek) {
    return false
  }

  const step = Math.max(1, lesson.weekStep)
  return (week - lesson.startWeek) % step === 0
}

function isIntervalOverlapped(left: TimeInterval, right: TimeInterval) {
  return left.start < right.end && right.start < left.end
}

function sortNames(names: string[]) {
  return [...names].sort((left, right) => left.localeCompare(right, 'zh-Hans-CN'))
}

function buildIntersectionCellLabel(mode: IntersectionDisplayMode, available: string[], unavailable: string[]) {
  if (mode === 'availableOnly') {
    return available.length > 0 ? available.join(' ') : '无人有空'
  }

  if (mode === 'unavailableOnly') {
    return unavailable.length > 0 ? unavailable.join(' ') : '都有空'
  }

  if (available.length <= unavailable.length) {
    return `有空：${available.length > 0 ? available.join(' ') : '无'}`
  }

  return `没空：${unavailable.length > 0 ? unavailable.join(' ') : '无'}`
}

export function buildIntersectionSchedule(
  participants: IntersectionParticipant[],
  mode: IntersectionDisplayMode,
  preferredTableName: string,
): ScheduleData {
  const unionTemplateParticipant = participants[0]
  const unionTimeSlots = resolveScheduleTimeSlotsByPreset(unionTemplateParticipant.scheduleData, 'union')
  const unionIntervalByNode = buildTimeSlotIntervalMap(unionTimeSlots)
  const maxWeek = Math.max(1, ...participants.map((participant) => participant.scheduleData.table.maxWeek || 1))
  const allNames = participants.map((participant) => participant.name)
  const occupiedByCell = new Map<string, Set<string>>()

  participants.forEach((participant) => {
    const participantTimeSlots = resolveScheduleTimeSlotsByPreset(participant.scheduleData, participant.timeSlotPresetId)
    const participantIntervalByNode = buildTimeSlotIntervalMap(participantTimeSlots)

    participant.scheduleData.lessons.forEach((lesson) => {
      const lessonInterval = resolveLessonInterval(lesson, participantIntervalByNode)
      if (!lessonInterval) {
        return
      }

      for (let week = lesson.startWeek; week <= lesson.endWeek; week += 1) {
        if (!isWeekMatched(week, lesson)) {
          continue
        }

        unionTimeSlots.forEach((unionSlot) => {
          const unionInterval = unionIntervalByNode.get(unionSlot.node)
          if (!unionInterval || !isIntervalOverlapped(lessonInterval, unionInterval)) {
            return
          }

          const cellKey = createCellKey(week, lesson.day, unionSlot.node)
          const occupied = occupiedByCell.get(cellKey) ?? new Set<string>()
          occupied.add(participant.name)
          occupiedByCell.set(cellKey, occupied)
        })
      }
    })
  })

  const courses: ScheduleCourse[] = []
  const lessons: ScheduleLesson[] = []
  const courseIdByLabel = new Map<string, number>()

  for (let week = 1; week <= maxWeek; week += 1) {
    for (let day = 1; day <= 7; day += 1) {
      unionTimeSlots.forEach((slot) => {
        const occupied = occupiedByCell.get(createCellKey(week, day, slot.node)) ?? new Set<string>()
        const unavailable = sortNames(Array.from(occupied))
        const available = sortNames(allNames.filter((name) => !occupied.has(name)))
        const label = buildIntersectionCellLabel(mode, available, unavailable)

        let color = ''
        if (mode === 'unavailableOnly') {
          color = unavailable.length > 0 ? UNAVAILABLE_COLOR : ALL_AVAILABLE_COLOR
        }

        const courseMapKey = `${label}|${color}`
        let courseId = courseIdByLabel.get(courseMapKey)
        if (!courseId) {
          courseId = courses.length + 1
          courseIdByLabel.set(courseMapKey, courseId)
          courses.push({
            id: courseId,
            tableId: 1,
            name: label,
            color,
            credit: 0,
            note: '',
          })
        }

        lessons.push({
          instanceId: `intersection-${week}-${day}-${slot.node}`,
          courseId,
          tableId: 1,
          day: day as 1 | 2 | 3 | 4 | 5 | 6 | 7,
          startNode: slot.node,
          endNode: slot.node,
          startWeek: week,
          endWeek: week,
          weekStep: 1,
          ownTime: false,
          startTime: slot.startTime,
          endTime: slot.endTime,
          room: '',
          teacher: '',
          type: 99,
          level: 0,
        })
      })
    }
  }

  return {
    version: 1,
    source: 'intersection',
    importedAt: Date.now(),
    table: {
      id: 1,
      name: preferredTableName,
      campus: '并集预设',
      school: '华南理工大学',
      maxWeek,
      nodes: unionTimeSlots.length,
      startDate: participants[0]?.scheduleData.table.startDate ?? '',
      showSat: true,
      showSun: true,
      timeTable: 9004,
    },
    timeSlots: unionTimeSlots,
    courses,
    lessons,
    raw: {
      kind: 'scutHtml',
      html: '',
    },
  }
}
