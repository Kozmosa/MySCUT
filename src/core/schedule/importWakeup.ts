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

function normalizeWakeupTimeText(timeText: string) {
  return timeText.trim()
}

function parseWakeupTimeToMinutes(timeText: string) {
  const matched = normalizeWakeupTimeText(timeText).match(/^(\d{1,2}):(\d{2})$/)
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

function isWakeupTimeTextPresent(value: string) {
  return normalizeWakeupTimeText(value).length > 0
}

function buildWakeupTimeSlotNodeMap(timeSlots: WakeupTimeSlot[]) {
  const slotMap = new Map<number, WakeupTimeSlot>()
  timeSlots.forEach((slot) => {
    slotMap.set(slot.node, slot)
  })
  return slotMap
}

function buildWakeupStartNodeLookup(timeSlots: WakeupTimeSlot[]) {
  const map = new Map<string, number>()
  timeSlots.forEach((slot) => {
    const key = normalizeWakeupTimeText(slot.startTime)
    if (key && !map.has(key)) {
      map.set(key, slot.node)
    }
  })
  return map
}

function buildWakeupEndNodeLookup(timeSlots: WakeupTimeSlot[]) {
  const map = new Map<string, number>()
  timeSlots.forEach((slot) => {
    const key = normalizeWakeupTimeText(slot.endTime)
    if (key && !map.has(key)) {
      map.set(key, slot.node)
    }
  })
  return map
}

function clampWakeupNode(node: number, maxNode: number) {
  return Math.max(1, Math.min(maxNode, node))
}

function getWakeupSpanFromStep(step: number) {
  if (!Number.isFinite(step)) {
    return 1
  }

  return Math.max(1, Math.floor(step))
}

function resolveWakeupLessonRange(lesson: WakeupLesson, timeSlots: WakeupTimeSlot[], tableMaxNode: number) {
  const maxNodeFromSlots = timeSlots.reduce((max, slot) => Math.max(max, slot.node), 1)
  const maxNode = Math.max(1, tableMaxNode, maxNodeFromSlots)
  const span = getWakeupSpanFromStep(lesson.step)
  const timeSlotNodeMap = buildWakeupTimeSlotNodeMap(timeSlots)
  const startNodeLookup = buildWakeupStartNodeLookup(timeSlots)
  const endNodeLookup = buildWakeupEndNodeLookup(timeSlots)

  const hasStartTime = isWakeupTimeTextPresent(lesson.startTime)
  const hasEndTime = isWakeupTimeTextPresent(lesson.endTime)

  let startNode = Number.isInteger(lesson.startNode) && lesson.startNode > 0 ? lesson.startNode : null
  let endNode: number | null = null
  let startTime = hasStartTime ? normalizeWakeupTimeText(lesson.startTime) : ''
  let endTime = hasEndTime ? normalizeWakeupTimeText(lesson.endTime) : ''

  if (startNode === null && hasStartTime) {
    const matchedStartNode = startNodeLookup.get(startTime)
    if (typeof matchedStartNode === 'number') {
      startNode = matchedStartNode
    }
  }

  if (startNode === null && hasEndTime) {
    const matchedEndNode = endNodeLookup.get(endTime)
    if (typeof matchedEndNode === 'number') {
      startNode = Math.max(1, matchedEndNode - span + 1)
    }
  }

  if (startNode === null) {
    startNode = 1
  }

  startNode = clampWakeupNode(startNode, maxNode)
  endNode = clampWakeupNode(startNode + span - 1, maxNode)

  if (!hasStartTime) {
    startTime = timeSlotNodeMap.get(startNode)?.startTime ?? ''
  }

  if (!hasEndTime) {
    endTime = timeSlotNodeMap.get(endNode)?.endTime ?? ''
  }

  if (hasStartTime && !hasEndTime) {
    const startMinutes = parseWakeupTimeToMinutes(startTime)
    const startSlot = timeSlotNodeMap.get(startNode)
    const startSlotMinutes = parseWakeupTimeToMinutes(startSlot?.startTime ?? '')

    if (startMinutes !== null && startSlotMinutes !== null && startMinutes !== startSlotMinutes) {
      const nextNode = clampWakeupNode(startNode + span, maxNode)
      endTime = timeSlotNodeMap.get(nextNode)?.startTime ?? endTime
    }
  }

  return {
    startNode,
    endNode,
    startTime,
    endTime,
    weekStep: 1,
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

  const normalizedLessons: ScheduleLesson[] = lessons.map((lesson, index) => {
    const range = resolveWakeupLessonRange(lesson, timeSlots, tableConfig.nodes)

    return {
      instanceId: `${lesson.id}-${lesson.day}-${range.startNode}-${lesson.startWeek}-${lesson.endWeek}-${index}`,
      courseId: lesson.id,
      tableId: lesson.tableId,
      day: lesson.day,
      startNode: range.startNode,
      endNode: range.endNode,
      startWeek: lesson.startWeek,
      endWeek: lesson.endWeek,
      weekStep: range.weekStep,
      ownTime: lesson.ownTime,
      startTime: range.startTime,
      endTime: range.endTime,
      room: lesson.room,
      teacher: lesson.teacher,
      type: lesson.type,
      level: lesson.level,
    }
  })

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
