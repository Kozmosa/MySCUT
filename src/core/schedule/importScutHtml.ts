import { DEFAULT_SCUT_TIME_SLOTS } from './defaultTimeSlots'
import { normalizeWakeupStartDate } from './importWakeup'
import type { ScheduleCourse, ScheduleData, ScheduleLesson } from './types'

type ParseScutHtmlOptions = {
  fallbackSemesterStartDate: string
}

function cleanText(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

function parseWeekRange(text: string) {
  const rangeMatch = text.match(/(\d+)\s*-\s*(\d+)\s*周/)
  if (rangeMatch) {
    return {
      startWeek: Number.parseInt(rangeMatch[1], 10),
      endWeek: Number.parseInt(rangeMatch[2], 10),
    }
  }

  const singleMatch = text.match(/(\d+)\s*周/)
  if (singleMatch) {
    const week = Number.parseInt(singleMatch[1], 10)
    return {
      startWeek: week,
      endWeek: week,
    }
  }

  return {
    startWeek: 1,
    endWeek: 20,
  }
}

function parseNodeRange(text: string, fallbackNode: number, fallbackSpan: number) {
  const match = text.match(/\((\d+)\s*(?:-\s*(\d+))?\s*节\)/)
  if (!match) {
    return {
      startNode: fallbackNode,
      endNode: fallbackNode + Math.max(1, fallbackSpan) - 1,
    }
  }

  const startNode = Number.parseInt(match[1], 10)
  const endNode = match[2]
    ? Number.parseInt(match[2], 10)
    : startNode + Math.max(1, fallbackSpan) - 1

  return {
    startNode,
    endNode,
  }
}

export function parseScutScheduleHtml(html: string, options: ParseScutHtmlOptions): ScheduleData {
  const parser = new DOMParser()
  const document = parser.parseFromString(html, 'text/html')

  const tableRoot =
    document.querySelector('#kbgrid_table_0') ??
    document.querySelector('#ylkbTable #table1 table') ??
    document.querySelector('#table1 table')

  if (!tableRoot) {
    throw new Error('未找到华工课表表格，请确认导入的是教务系统课表 HTML')
  }

  const titleWrap = tableRoot.querySelector('.timetable_title')
  const titleText = cleanText(titleWrap?.textContent ?? '')
  const semesterMatch = titleText.match(/(\d{4}-\d{4}学年第\d学期)/)
  const ownerMatch = titleText.match(/([\u4e00-\u9fa5A-Za-z]+)的课表/)

  const semesterText = semesterMatch?.[1] ?? '华工教务导入课表'
  const ownerText = ownerMatch?.[1] ?? '未知用户'
  const tableName = `${ownerText}的课表（${semesterText}）`

  const courseMap = new Map<string, ScheduleCourse>()
  const lessons: ScheduleLesson[] = []

  const cells = Array.from(tableRoot.querySelectorAll<HTMLTableCellElement>('td.td_wrap[id]'))

  for (const cell of cells) {
    const idText = cell.getAttribute('id') ?? ''
    const idMatch = idText.match(/^(\d+)-(\d+)$/)
    if (!idMatch) {
      continue
    }

    const day = Number.parseInt(idMatch[1], 10)
    const fallbackNode = Number.parseInt(idMatch[2], 10)
    const rowSpan = Number.parseInt(cell.getAttribute('rowspan') ?? '1', 10)

    const blocks = Array.from(cell.querySelectorAll<HTMLElement>('.timetable_con'))
    if (blocks.length === 0) {
      continue
    }

    for (const [index, block] of blocks.entries()) {
      const titleElement = block.querySelector('.title')
      const courseName = cleanText(titleElement?.textContent ?? '未命名课程')
      const blockText = cleanText(block.textContent ?? '')

      if (!courseMap.has(courseName)) {
        const newCourseId = courseMap.size + 1
        courseMap.set(courseName, {
          id: newCourseId,
          tableId: 1,
          name: courseName,
          color: '',
          credit: 0,
          note: '',
        })
      }

      const course = courseMap.get(courseName)
      if (!course) {
        continue
      }

      const weekInfo = parseWeekRange(blockText)
      const nodeInfo = parseNodeRange(blockText, fallbackNode, rowSpan)

      const roomElement = Array.from(block.querySelectorAll('p')).find((p) => p.querySelector('.glyphicon-map-marker'))
      const teacherElement = Array.from(block.querySelectorAll('p')).find((p) => p.querySelector('.glyphicon-user'))

      const room = cleanText(roomElement?.textContent ?? '')
      const teacher = cleanText(teacherElement?.textContent ?? '')

      lessons.push({
        instanceId: `scut-${day}-${nodeInfo.startNode}-${weekInfo.startWeek}-${weekInfo.endWeek}-${lessons.length}-${index}`,
        courseId: course.id,
        tableId: 1,
        day: Math.min(7, Math.max(1, day)) as 1 | 2 | 3 | 4 | 5 | 6 | 7,
        startNode: nodeInfo.startNode,
        startWeek: weekInfo.startWeek,
        endWeek: weekInfo.endWeek,
        weekStep: 1,
        ownTime: false,
        startTime: '',
        endTime: '',
        room,
        teacher,
        type: 0,
        level: 0,
      })
    }
  }

  if (lessons.length === 0) {
    throw new Error('未解析到课程内容，请确认导入的是完整的课表周视图 HTML')
  }

  const maxWeek = lessons.reduce((max, lesson) => Math.max(max, lesson.endWeek), 20)
  const hasSat = lessons.some((lesson) => lesson.day === 6)
  const hasSun = lessons.some((lesson) => lesson.day === 7)

  return {
    version: 1,
    source: 'scutHtml',
    importedAt: Date.now(),
    table: {
      id: 1,
      name: tableName,
      campus: '华南理工大学',
      school: '华南理工大学',
      maxWeek,
      nodes: 11,
      startDate: normalizeWakeupStartDate(options.fallbackSemesterStartDate),
      showSat: hasSat,
      showSun: hasSun,
      timeTable: 2,
    },
    timeSlots: DEFAULT_SCUT_TIME_SLOTS,
    courses: Array.from(courseMap.values()),
    lessons,
    raw: {
      kind: 'scutHtml',
      html,
    },
  }
}
