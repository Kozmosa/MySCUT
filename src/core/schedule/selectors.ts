import type { ScheduleData, WeekCellCourse } from './types'

function isLessonInWeek(currentWeek: number, startWeek: number, endWeek: number, weekStep: number) {
  if (currentWeek < startWeek || currentWeek > endWeek) {
    return false
  }

  const safeWeekStep = Math.max(1, weekStep)
  return (currentWeek - startWeek) % safeWeekStep === 0
}

function createCellKey(day: number, node: number) {
  return `${day}-${node}`
}

function normalizeLessonEndNode(startNode: number, endNode: number, maxNode: number) {
  const safeEndNode = Number.isFinite(endNode) ? endNode : startNode
  return Math.max(startNode, Math.min(maxNode, safeEndNode))
}

export type WeekScheduleRenderData = {
  cellCoursesMap: Map<string, WeekCellCourse[]>
  coveredCellSet: Set<string>
  rowSpanMap: Map<string, number>
}

export function createEmptyWeekScheduleRenderData(): WeekScheduleRenderData {
  return {
    cellCoursesMap: new Map(),
    coveredCellSet: new Set(),
    rowSpanMap: new Map(),
  }
}

export function buildWeekScheduleRenderData(scheduleData: ScheduleData, currentWeek: number, maxNode = 12) {
  const courseMap = new Map<number, { name: string; color: string; credit: number }>()
  scheduleData.courses.forEach((course) => {
    courseMap.set(course.id, {
      name: course.name,
      color: course.color,
      credit: course.credit,
    })
  })

  const renderData = createEmptyWeekScheduleRenderData()

  scheduleData.lessons.forEach((lesson) => {
    if (!isLessonInWeek(currentWeek, lesson.startWeek, lesson.endWeek, lesson.weekStep)) {
      return
    }

    if (lesson.startNode > maxNode) {
      return
    }

    const course = courseMap.get(lesson.courseId)
    const normalizedEndNode = normalizeLessonEndNode(lesson.startNode, lesson.endNode, maxNode)
    const key = createCellKey(lesson.day, lesson.startNode)
    const existing = renderData.cellCoursesMap.get(key) ?? []

    existing.push({
      courseId: lesson.courseId,
      name: course?.name ?? '未命名课程',
      color: course?.color ?? '',
      credit: course?.credit ?? 0,
      teacher: lesson.teacher,
      room: lesson.room,
      lesson: {
        ...lesson,
        endNode: normalizedEndNode,
      },
    })

    renderData.cellCoursesMap.set(key, existing)

    const nextRowSpan = normalizedEndNode - lesson.startNode + 1
    const currentRowSpan = renderData.rowSpanMap.get(key) ?? 1
    renderData.rowSpanMap.set(key, Math.max(currentRowSpan, nextRowSpan))

    for (let node = lesson.startNode + 1; node <= normalizedEndNode; node += 1) {
      renderData.coveredCellSet.add(createCellKey(lesson.day, node))
    }
  })

  return renderData
}

export function getCellCourses(renderData: WeekScheduleRenderData, day: number, node: number) {
  return renderData.cellCoursesMap.get(createCellKey(day, node)) ?? []
}

export function getCellRowSpan(renderData: WeekScheduleRenderData, day: number, node: number) {
  return renderData.rowSpanMap.get(createCellKey(day, node)) ?? 1
}

export function isCellCovered(renderData: WeekScheduleRenderData, day: number, node: number) {
  return renderData.coveredCellSet.has(createCellKey(day, node))
}
