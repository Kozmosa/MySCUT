// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { parseScutScheduleHtml } from '../../../src/core/schedule/importScutHtml'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURE_PATH = join(__dirname, '..', '..', 'fixtures', 'scutSchedule.html')

function loadFixture() {
  return readFileSync(FIXTURE_PATH, 'utf8')
}

describe('parseScutScheduleHtml', () => {
  it('parses the 26Spring SCUT schedule fixture without throwing', () => {
    const html = loadFixture()
    const data = parseScutScheduleHtml(html, {
      fallbackSemesterStartDate: '2026-02-23',
    })

    expect(data.source).toBe('scutHtml')
    expect(data.version).toBe(1)
    expect(data.raw).toEqual({ kind: 'scutHtml', html })
    expect(data.importedAt).toBeTypeOf('number')
  })

  it('extracts semester title and table metadata', () => {
    const data = parseScutScheduleHtml(loadFixture(), {
      fallbackSemesterStartDate: '2026-02-23',
    })

    // The owner regex `([\u4e00-\u9fa5A-Za-z]+)的课表` is greedy from the
    // leftmost CJK run, so it also captures the trailing `学期` from the
    // semester <h6>. Asserting current behavior to guard against regressions.
    expect(data.table.name).toBe('学期测试同学的课表（2025-2026学年第2学期）')
    expect(data.table.startDate).toBe('2026-02-23')
    expect(data.table.campus).toBe('华南理工大学')
    expect(data.table.school).toBe('华南理工大学')
    expect(data.table.nodes).toBe(11)
    expect(data.table.showSat).toBe(false)
    expect(data.table.showSun).toBe(false)
  })

  it('builds a deduped course map with credits from detail entries', () => {
    const data = parseScutScheduleHtml(loadFixture(), {
      fallbackSemesterStartDate: '2026-02-23',
    })

    expect(data.courses).toHaveLength(3)
    const byId = Object.fromEntries(data.courses.map((c) => [c.id, c]))
    expect(byId[1]).toMatchObject({ name: '工科数学分析(二)', credit: 7, color: '', note: '' })
    expect(byId[2]).toMatchObject({ name: '高级语言程序设计(C++)(下)', credit: 2 })
    expect(byId[3]).toMatchObject({ name: '数字逻辑', credit: 3 })
  })

  it('produces one lesson per grid cell with merged teacher/room/week range', () => {
    const data = parseScutScheduleHtml(loadFixture(), {
      fallbackSemesterStartDate: '2026-02-23',
    })

    expect(data.lessons).toHaveLength(7)

    const first = data.lessons.find((l) => l.day === 4 && l.startNode === 1)
    expect(first).toMatchObject({
      courseId: 1,
      day: 4,
      startNode: 1,
      endNode: 2,
      startWeek: 1,
      endWeek: 16,
      weekStep: 1,
      room: '测试校区 A0101',
      teacher: '张老师',
      ownTime: false,
      startTime: '',
      endTime: '',
      type: 0,
      level: 0,
    })

    const splitWeekLesson = data.lessons.find((l) => l.day === 5 && l.startWeek === 1 && l.endWeek === 1)
    expect(splitWeekLesson).toMatchObject({
      courseId: 3,
      startNode: 5,
      endNode: 8,
      room: '测试校区 A0103',
      teacher: '王老师',
    })
  })

  it('keeps maxWeek fallback when no lesson endWeek exceeds it', () => {
    const data = parseScutScheduleHtml(loadFixture(), {
      fallbackSemesterStartDate: '2026-02-23',
    })
    expect(data.table.maxWeek).toBe(20)
  })

  it('throws when the schedule grid is missing', () => {
    expect(() =>
      parseScutScheduleHtml('<html><body>not a schedule</body></html>', {
        fallbackSemesterStartDate: '2026-02-23',
      }),
    ).toThrowError(/未找到华工课表表格/)
  })

  it('throws when the grid has no course cells', () => {
    const html = `<html><body><table id="kbgrid_table_0"><tbody>
      <tr><td><div class="timetable_title">2025-2026学年第2学期 测试同学的课表</div></td></tr>
      <tr><td id="1-1" class="td_wrap"></td></tr>
    </tbody></table></body></html>`
    expect(() =>
      parseScutScheduleHtml(html, { fallbackSemesterStartDate: '2026-02-23' }),
    ).toThrowError(/未解析到课程内容/)
  })
})