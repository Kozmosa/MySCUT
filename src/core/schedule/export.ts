import type {
  SavedSchedule,
  ScheduleCourse,
  ScheduleData,
  ScheduleLesson,
  WakeupCourse,
  WakeupLesson,
  WakeupMeta,
  WakeupTableConfig,
  WakeupTimeSlot,
} from './types'

type QmsExportPayload = {
  schema: 'qms'
  version: 1
  exportedAt: number
  schedule: SavedSchedule
}

export type ExportSanitizeOptions = {
  removeBoundTimeSlots: boolean
  removeCourseName: boolean
  removeTeacherName: boolean
  removeRoom: boolean
}

function formatWakeupStartDate(dateText: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    return dateText
  }

  return '2026-02-23'
}

function buildWakeupMeta(scheduleData: ScheduleData): WakeupMeta {
  return {
    id: scheduleData.table.id,
    name: scheduleData.table.campus || scheduleData.table.name || '启梦课表',
    courseLen: scheduleData.courses.length,
    sameBreakLen: false,
    sameLen: false,
    theBreakLen: 10,
  }
}

function buildWakeupTimeSlots(scheduleData: ScheduleData): WakeupTimeSlot[] {
  if (scheduleData.timeSlots.length > 0) {
    return scheduleData.timeSlots
  }

  return [
    { node: 1, startTime: '08:00', endTime: '08:45', timeTable: scheduleData.table.timeTable || 2 },
    { node: 2, startTime: '08:55', endTime: '09:40', timeTable: scheduleData.table.timeTable || 2 },
  ]
}

function buildWakeupTableConfig(scheduleData: ScheduleData): WakeupTableConfig {
  return {
    background: '',
    courseTextColor: -1,
    id: scheduleData.table.id,
    itemAlpha: 60,
    itemHeight: 64,
    itemTextSize: 12,
    maxWeek: scheduleData.table.maxWeek,
    nodes: scheduleData.table.nodes,
    school: scheduleData.table.school || '华南理工大学',
    showOtherWeekCourse: false,
    showSat: scheduleData.table.showSat,
    showSun: scheduleData.table.showSun,
    showTime: true,
    startDate: formatWakeupStartDate(scheduleData.table.startDate),
    strokeColor: -2368549,
    sundayFirst: false,
    tableName: scheduleData.table.name || '启梦课表',
    textColor: -13619152,
    tid: 'qimeng-export',
    timeTable: scheduleData.table.timeTable || 2,
    type: 0,
    updateTime: Date.now(),
    widgetCourseTextColor: -1,
    widgetItemAlpha: 60,
    widgetItemHeight: 60,
    widgetItemTextSize: 12,
    widgetStrokeColor: -2368549,
    widgetTextColor: -13619152,
  }
}

function convertCourseToWakeup(course: ScheduleCourse): WakeupCourse {
  return {
    id: course.id,
    tableId: course.tableId,
    courseName: course.name,
    color: course.color,
    credit: course.credit,
    note: course.note,
  }
}

function lessonTimeFromNode(timeSlots: WakeupTimeSlot[], node: number) {
  const slot = timeSlots.find((item) => item.node === node)
  return {
    startTime: slot?.startTime ?? '',
    endTime: slot?.endTime ?? '',
  }
}

function convertLessonToWakeup(lesson: ScheduleLesson, timeSlots: WakeupTimeSlot[]): WakeupLesson {
  const fallbackTimes = lessonTimeFromNode(timeSlots, lesson.startNode)

  return {
    id: lesson.courseId,
    tableId: lesson.tableId,
    day: lesson.day,
    startNode: lesson.startNode,
    startWeek: lesson.startWeek,
    endWeek: lesson.endWeek,
    step: lesson.weekStep,
    ownTime: lesson.ownTime,
    startTime: lesson.startTime || fallbackTimes.startTime,
    endTime: lesson.endTime || fallbackTimes.endTime,
    room: lesson.room,
    teacher: lesson.teacher,
    type: lesson.type,
    level: lesson.level,
  }
}

function buildWakeupRawFromSchedule(scheduleData: ScheduleData) {
  const meta = buildWakeupMeta(scheduleData)
  const timeSlots = buildWakeupTimeSlots(scheduleData)
  const tableConfig = buildWakeupTableConfig(scheduleData)
  const courses = scheduleData.courses.map(convertCourseToWakeup)
  const lessons = scheduleData.lessons.map((lesson) => convertLessonToWakeup(lesson, timeSlots))

  return {
    meta,
    timeSlots,
    tableConfig,
    courses,
    lessons,
  }
}

export function sanitizeScheduleForExport(savedSchedule: SavedSchedule, options: ExportSanitizeOptions): SavedSchedule {
  const scheduleData: ScheduleData = {
    ...savedSchedule.scheduleData,
    table: {
      ...savedSchedule.scheduleData.table,
      timeTable: options.removeBoundTimeSlots ? 2 : savedSchedule.scheduleData.table.timeTable,
    },
    timeSlots: options.removeBoundTimeSlots ? [] : savedSchedule.scheduleData.timeSlots,
    courses: options.removeCourseName
      ? savedSchedule.scheduleData.courses.map((course) => ({
          ...course,
          name: '',
        }))
      : savedSchedule.scheduleData.courses,
    lessons:
      options.removeTeacherName || options.removeRoom
        ? savedSchedule.scheduleData.lessons.map((lesson) => ({
            ...lesson,
            teacher: options.removeTeacherName ? '' : lesson.teacher,
            room: options.removeRoom ? '' : lesson.room,
          }))
        : savedSchedule.scheduleData.lessons,
    raw: savedSchedule.scheduleData.raw,
  }

  if (savedSchedule.scheduleData.raw.kind === 'wakeup') {
    const wakeupRaw = savedSchedule.scheduleData.raw
    scheduleData.raw = {
      ...wakeupRaw,
      timeSlots: options.removeBoundTimeSlots ? [] : wakeupRaw.timeSlots,
      tableConfig: {
        ...wakeupRaw.tableConfig,
        timeTable: options.removeBoundTimeSlots ? 2 : wakeupRaw.tableConfig.timeTable,
      },
      courses: options.removeCourseName
        ? wakeupRaw.courses.map((course) => ({
            ...course,
            courseName: '',
          }))
        : wakeupRaw.courses,
      lessons:
        options.removeTeacherName || options.removeRoom
          ? wakeupRaw.lessons.map((lesson) => ({
              ...lesson,
              teacher: options.removeTeacherName ? '' : lesson.teacher,
              room: options.removeRoom ? '' : lesson.room,
            }))
          : wakeupRaw.lessons,
    }
  }

  return {
    ...savedSchedule,
    timeSlotPresetId: options.removeBoundTimeSlots ? 'builtIn' : savedSchedule.timeSlotPresetId,
    scheduleData,
  }
}

export function buildWakeupExportText(savedSchedule: SavedSchedule) {
  const wakeupRaw =
    savedSchedule.scheduleData.raw.kind === 'wakeup'
      ? savedSchedule.scheduleData.raw
      : buildWakeupRawFromSchedule(savedSchedule.scheduleData)

  return [
    JSON.stringify(wakeupRaw.meta),
    JSON.stringify(wakeupRaw.timeSlots),
    JSON.stringify(wakeupRaw.tableConfig),
    JSON.stringify(wakeupRaw.courses),
    JSON.stringify(wakeupRaw.lessons),
  ].join('\n')
}

export function buildQmsExportText(savedSchedule: SavedSchedule) {
  const payload: QmsExportPayload = {
    schema: 'qms',
    version: 1,
    exportedAt: Date.now(),
    schedule: savedSchedule,
  }

  return JSON.stringify(payload, null, 2)
}

export function downloadTextFile(fileName: string, content: string, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType })
  const objectUrl = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = fileName
  anchor.style.display = 'none'

  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)

  URL.revokeObjectURL(objectUrl)
}
