import { DEFAULT_SCUT_TIME_SLOTS } from './defaultTimeSlots'
import { normalizeWakeupStartDate } from './importWakeup'
import type { ScheduleCourse, ScheduleData, ScheduleLesson } from './types'

type ParseScutHtmlOptions = {
  fallbackSemesterStartDate: string
}

type WeekRange = {
  startWeek: number
  endWeek: number
  weekStep: number
}

function cleanText(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

function normalizeParityValue(input: string | undefined) {
  if (!input) {
    return ''
  }

  if (input.includes('单')) {
    return 'single'
  }

  if (input.includes('双')) {
    return 'double'
  }

  return ''
}

function normalizeWeekRange(startWeek: number, endWeek: number, parity: string): WeekRange | null {
  const safeStart = Math.max(1, Math.min(startWeek, endWeek))
  const safeEnd = Math.max(safeStart, Math.max(startWeek, endWeek))

  if (parity === 'single') {
    const normalizedStart = safeStart % 2 === 1 ? safeStart : safeStart + 1
    if (normalizedStart > safeEnd) {
      return null
    }

    return {
      startWeek: normalizedStart,
      endWeek: safeEnd,
      weekStep: 2,
    }
  }

  if (parity === 'double') {
    const normalizedStart = safeStart % 2 === 0 ? safeStart : safeStart + 1
    if (normalizedStart > safeEnd) {
      return null
    }

    return {
      startWeek: normalizedStart,
      endWeek: safeEnd,
      weekStep: 2,
    }
  }

  return {
    startWeek: safeStart,
    endWeek: safeEnd,
    weekStep: 1,
  }
}

function parseWeekRanges(text: string): WeekRange[] {
  const normalizedText = text
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/，/g, ',')
  const matches = normalizedText.matchAll(/(\d+)(?:\s*-\s*(\d+))?\s*周(?:\s*\((单|双)\))?(?:\s*(单周|双周))?/g)

  const ranges: WeekRange[] = []
  const seen = new Set<string>()

  for (const match of matches) {
    const rawStart = Number.parseInt(match[1], 10)
    const rawEnd = match[2] ? Number.parseInt(match[2], 10) : rawStart
    const parity = normalizeParityValue(match[3] || match[4])
    const range = normalizeWeekRange(rawStart, rawEnd, parity)
    if (!range) {
      continue
    }

    const dedupeKey = `${range.startWeek}-${range.endWeek}-${range.weekStep}`
    if (seen.has(dedupeKey)) {
      continue
    }

    seen.add(dedupeKey)
    ranges.push(range)
  }

  if (ranges.length > 0) {
    return ranges
  }

  return [
    {
      startWeek: 1,
      endWeek: 20,
      weekStep: 1,
    },
  ]
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

      const weekRanges = parseWeekRanges(blockText)
      const nodeInfo = parseNodeRange(blockText, fallbackNode, rowSpan)

      const roomElement = Array.from(block.querySelectorAll('p')).find((p) => p.querySelector('.glyphicon-map-marker'))
      const teacherElement = Array.from(block.querySelectorAll('p')).find((p) => p.querySelector('.glyphicon-user'))

      const room = cleanText(roomElement?.textContent ?? '')
      const teacher = cleanText(teacherElement?.textContent ?? '')

      for (const [rangeIndex, weekRange] of weekRanges.entries()) {
        lessons.push({
          instanceId: `scut-${day}-${nodeInfo.startNode}-${weekRange.startWeek}-${weekRange.endWeek}-${weekRange.weekStep}-${lessons.length}-${index}-${rangeIndex}`,
          courseId: course.id,
          tableId: 1,
          day: Math.min(7, Math.max(1, day)) as 1 | 2 | 3 | 4 | 5 | 6 | 7,
          startNode: nodeInfo.startNode,
          endNode: nodeInfo.endNode,
          startWeek: weekRange.startWeek,
          endWeek: weekRange.endWeek,
          weekStep: weekRange.weekStep,
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
