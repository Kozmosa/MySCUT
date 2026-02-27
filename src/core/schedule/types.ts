export type WakeupMeta = {
  courseLen: number
  id: number
  name: string
  sameBreakLen: boolean
  sameLen: boolean
  theBreakLen: number
}

export type WakeupTimeSlot = {
  endTime: string
  node: number
  startTime: string
  timeTable: number
}

export type WakeupTableConfig = {
  background: string
  courseTextColor: number
  id: number
  itemAlpha: number
  itemHeight: number
  itemTextSize: number
  maxWeek: number
  nodes: number
  school: string
  showOtherWeekCourse: boolean
  showSat: boolean
  showSun: boolean
  showTime: boolean
  startDate: string
  strokeColor: number
  sundayFirst: boolean
  tableName: string
  textColor: number
  tid: string
  timeTable: number
  type: number
  updateTime: number
  widgetCourseTextColor: number
  widgetItemAlpha: number
  widgetItemHeight: number
  widgetItemTextSize: number
  widgetStrokeColor: number
  widgetTextColor: number
}

export type WakeupCourse = {
  color: string
  courseName: string
  credit: number
  id: number
  note: string
  tableId: number
}

export type WakeupLesson = {
  day: 1 | 2 | 3 | 4 | 5 | 6 | 7
  endTime: string
  endWeek: number
  id: number
  level: number
  ownTime: boolean
  room: string
  startNode: number
  startTime: string
  startWeek: number
  step: number
  tableId: number
  teacher: string
  type: number
}

export type ScheduleCourse = {
  id: number
  tableId: number
  name: string
  color: string
  credit: number
  note: string
}

export type ScheduleLesson = {
  instanceId: string
  courseId: number
  tableId: number
  day: 1 | 2 | 3 | 4 | 5 | 6 | 7
  startNode: number
  endNode: number
  startWeek: number
  endWeek: number
  weekStep: number
  ownTime: boolean
  startTime: string
  endTime: string
  room: string
  teacher: string
  type: number
  level: number
}

export type ScheduleData = {
  version: 1
  source: 'wakeup' | 'scutHtml'
  importedAt: number
  table: {
    id: number
    name: string
    campus: string
    school: string
    maxWeek: number
    nodes: number
    startDate: string
    showSat: boolean
    showSun: boolean
    timeTable: number
  }
  timeSlots: WakeupTimeSlot[]
  courses: ScheduleCourse[]
  lessons: ScheduleLesson[]
  raw:
    | {
        kind: 'wakeup'
        meta: WakeupMeta
        timeSlots: WakeupTimeSlot[]
        tableConfig: WakeupTableConfig
        courses: WakeupCourse[]
        lessons: WakeupLesson[]
      }
    | {
        kind: 'scutHtml'
        html: string
      }
}

export type WeekCellCourse = {
  courseId: number
  name: string
  color: string
  teacher: string
  room: string
  lesson: ScheduleLesson
}

export type SavedSchedule = {
  id: string
  name: string
  source: ScheduleData['source']
  themeId: string
  semesterStartDate: string
  createdAt: number
  scheduleData: ScheduleData
}
