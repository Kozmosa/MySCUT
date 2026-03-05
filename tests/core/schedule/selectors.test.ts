import { describe, expect, it } from 'vitest'
import {
  buildWeekScheduleRenderData,
  getCellCourses,
  getCellRowSpan,
  isCellCovered,
} from '../../../src/core/schedule/selectors'
import type { ScheduleData } from '../../../src/core/schedule/types'

function createScheduleData(): ScheduleData {
  return {
    version: 1,
    source: 'scutHtml',
    importedAt: 0,
    table: {
      id: 1,
      name: 'Test',
      campus: 'Test',
      school: 'Test',
      maxWeek: 16,
      nodes: 12,
      startDate: '2026-02-23',
      showSat: true,
      showSun: false,
      timeTable: 1,
    },
    timeSlots: [],
    courses: [
      {
        id: 1,
        tableId: 1,
        name: 'Math',
        color: '#000',
        credit: 2,
        note: '',
      },
    ],
    lessons: [
      {
        instanceId: 'a',
        courseId: 1,
        tableId: 1,
        day: 1,
        startNode: 2,
        endNode: 4,
        startWeek: 1,
        endWeek: 16,
        weekStep: 2,
        ownTime: false,
        startTime: '',
        endTime: '',
        room: 'A101',
        teacher: 'T1',
        type: 0,
        level: 0,
      },
      {
        instanceId: 'b',
        courseId: 1,
        tableId: 1,
        day: 2,
        startNode: 10,
        endNode: 20,
        startWeek: 1,
        endWeek: 16,
        weekStep: 1,
        ownTime: false,
        startTime: '',
        endTime: '',
        room: 'B201',
        teacher: 'T2',
        type: 0,
        level: 0,
      },
      {
        instanceId: 'c',
        courseId: 1,
        tableId: 1,
        day: 3,
        startNode: 13,
        endNode: 14,
        startWeek: 1,
        endWeek: 16,
        weekStep: 1,
        ownTime: false,
        startTime: '',
        endTime: '',
        room: 'C301',
        teacher: 'T3',
        type: 0,
        level: 0,
      },
    ],
    raw: {
      kind: 'scutHtml',
      html: '',
    },
  }
}

describe('buildWeekScheduleRenderData', () => {
  it('builds rowSpan and covered cells for matched week', () => {
    const renderData = buildWeekScheduleRenderData(createScheduleData(), 1, 12)
    expect(getCellRowSpan(renderData, 1, 2)).toBe(3)
    expect(isCellCovered(renderData, 1, 3)).toBe(true)
    expect(isCellCovered(renderData, 1, 4)).toBe(true)

    const courses = getCellCourses(renderData, 1, 2)
    expect(courses).toHaveLength(1)
    expect(courses[0]?.name).toBe('Math')
  })

  it('filters out lessons by week step', () => {
    const renderData = buildWeekScheduleRenderData(createScheduleData(), 2, 12)
    expect(getCellCourses(renderData, 1, 2)).toHaveLength(0)
  })

  it('clamps end node and ignores lessons starting after max node', () => {
    const renderData = buildWeekScheduleRenderData(createScheduleData(), 1, 12)
    expect(getCellRowSpan(renderData, 2, 10)).toBe(3)
    expect(isCellCovered(renderData, 2, 11)).toBe(true)
    expect(isCellCovered(renderData, 2, 12)).toBe(true)
    expect(getCellCourses(renderData, 3, 13)).toHaveLength(0)
  })
})
