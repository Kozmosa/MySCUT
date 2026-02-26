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

export function buildWeekCellCourseMap(scheduleData: ScheduleData, currentWeek: number, maxNode = 11) {
  const courseMap = new Map<number, { name: string; color: string }>()
  scheduleData.courses.forEach((course) => {
    courseMap.set(course.id, {
      name: course.name,
      color: course.color,
    })
  })

  const weekCellMap = new Map<string, WeekCellCourse[]>()

  scheduleData.lessons.forEach((lesson) => {
    if (!isLessonInWeek(currentWeek, lesson.startWeek, lesson.endWeek, lesson.weekStep)) {
      return
    }

    if (lesson.startNode > maxNode) {
      return
    }

    const course = courseMap.get(lesson.courseId)
    const key = createCellKey(lesson.day, lesson.startNode)
    const existing = weekCellMap.get(key) ?? []

    existing.push({
      courseId: lesson.courseId,
      name: course?.name ?? '未命名课程',
      color: course?.color ?? '',
      teacher: lesson.teacher,
      room: lesson.room,
      lesson,
    })

    weekCellMap.set(key, existing)
  })

  return weekCellMap
}

export function getCellCourses(
  weekCellMap: Map<string, WeekCellCourse[]>,
  day: number,
  node: number,
) {
  return weekCellMap.get(createCellKey(day, node)) ?? []
}
