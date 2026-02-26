import type {
  ScheduleCourse,
  ScheduleData,
  ScheduleLesson,
  WakeupCourse,
  WakeupLesson,
  WakeupMeta,
  WakeupTableConfig,
  WakeupTimeSlot,
} from './types'

function parseJsonLine<T>(line: string, index: number) {
  try {
    return JSON.parse(line) as T
  } catch {
    throw new Error(`WakeUp 文件第 ${index} 行 JSON 解析失败`)
  }
}

function assertValidWakeupShape(
  meta: WakeupMeta,
  timeSlots: WakeupTimeSlot[],
  tableConfig: WakeupTableConfig,
  courses: WakeupCourse[],
  lessons: WakeupLesson[],
) {
  if (!meta || typeof meta !== 'object' || typeof meta.id !== 'number') {
    throw new Error('WakeUp 文件结构无效：基础配置缺失')
  }

  if (!Array.isArray(timeSlots) || !Array.isArray(courses) || !Array.isArray(lessons)) {
    throw new Error('WakeUp 文件结构无效：数组内容缺失')
  }

  if (!tableConfig || typeof tableConfig !== 'object' || typeof tableConfig.maxWeek !== 'number') {
    throw new Error('WakeUp 文件结构无效：课表配置缺失')
  }
}

export function normalizeWakeupStartDate(startDate: string) {
  const match = startDate.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (!match) {
    return ''
  }

  const [, year, month, day] = match
  const paddedMonth = month.padStart(2, '0')
  const paddedDay = day.padStart(2, '0')

  return `${year}-${paddedMonth}-${paddedDay}`
}

export function parseWakeupScheduleText(text: string): ScheduleData {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length < 5) {
    throw new Error('WakeUp 文件格式错误：需要至少 5 行 JSON')
  }

  const meta = parseJsonLine<WakeupMeta>(lines[0], 1)
  const timeSlots = parseJsonLine<WakeupTimeSlot[]>(lines[1], 2)
  const tableConfig = parseJsonLine<WakeupTableConfig>(lines[2], 3)
  const courses = parseJsonLine<WakeupCourse[]>(lines[3], 4)
  const lessons = parseJsonLine<WakeupLesson[]>(lines[4], 5)

  assertValidWakeupShape(meta, timeSlots, tableConfig, courses, lessons)

  const normalizedCourses: ScheduleCourse[] = courses.map((course) => ({
    id: course.id,
    tableId: course.tableId,
    name: course.courseName,
    color: course.color,
    credit: course.credit,
    note: course.note,
  }))

  const normalizedLessons: ScheduleLesson[] = lessons.map((lesson, index) => ({
    instanceId: `${lesson.id}-${lesson.day}-${lesson.startNode}-${lesson.startWeek}-${lesson.endWeek}-${index}`,
    courseId: lesson.id,
    tableId: lesson.tableId,
    day: lesson.day,
    startNode: lesson.startNode,
    startWeek: lesson.startWeek,
    endWeek: lesson.endWeek,
    weekStep: lesson.step,
    ownTime: lesson.ownTime,
    startTime: lesson.startTime,
    endTime: lesson.endTime,
    room: lesson.room,
    teacher: lesson.teacher,
    type: lesson.type,
    level: lesson.level,
  }))

  return {
    version: 1,
    source: 'wakeup',
    importedAt: Date.now(),
    table: {
      id: tableConfig.id,
      name: tableConfig.tableName,
      campus: meta.name,
      school: tableConfig.school,
      maxWeek: tableConfig.maxWeek,
      nodes: tableConfig.nodes,
      startDate: normalizeWakeupStartDate(tableConfig.startDate),
      showSat: tableConfig.showSat,
      showSun: tableConfig.showSun,
      timeTable: tableConfig.timeTable,
    },
    timeSlots,
    courses: normalizedCourses,
    lessons: normalizedLessons,
    raw: {
      kind: 'wakeup',
      meta,
      timeSlots,
      tableConfig,
      courses,
      lessons,
    },
  }
}
