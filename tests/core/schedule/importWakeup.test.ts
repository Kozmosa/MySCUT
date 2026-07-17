// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { parseWakeupScheduleText } from '../../../src/core/schedule/importWakeup'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURE_PATH = join(__dirname, '..', '..', 'fixtures', 'public', 'wakeupSchedule.synthetic.txt')

function loadFixture() {
  return readFileSync(FIXTURE_PATH, 'utf8')
}

describe('parseWakeupScheduleText', () => {
  it('parses a standard wakeup file without throwing', () => {
    const text = loadFixture()
    const data = parseWakeupScheduleText(text)
    expect(data.source).toBe('wakeup')
    expect(data.version).toBe(1)
    expect(data.lessons.length).toBe(3)
  })

  it('resolves lesson range correctly', () => {
    const data = parseWakeupScheduleText(loadFixture())

    // Lesson 1: day=1, startNode=1, step=2 -> should be startNode=1, endNode=2
    const lesson1 = data.lessons.find((l) => l.day === 1 && l.startNode === 1)
    expect(lesson1).toBeDefined()
    if (lesson1) {
      expect(lesson1.endNode).toBe(2)
      expect(lesson1.startTime).toBe('08:50')
      expect(lesson1.endTime).toBe('10:25')
      expect(lesson1.weekStep).toBe(1)
    }

    // Lesson 2: day=1, startNode=3, step=2 -> should be startNode=3, endNode=4
    const lesson2 = data.lessons.find((l) => l.day === 1 && l.startNode === 3)
    expect(lesson2).toBeDefined()
    if (lesson2) {
      expect(lesson2.endNode).toBe(4)
      expect(lesson2.startTime).toBe('10:40')
      expect(lesson2.endTime).toBe('12:15')
    }

    // Lesson 3: day=2, startNode=7, step=2 -> should be startNode=7, endNode=8
    const lesson3 = data.lessons.find((l) => l.day === 2 && l.startNode === 7)
    expect(lesson3).toBeDefined()
    if (lesson3) {
      expect(lesson3.endNode).toBe(8)
      expect(lesson3.startTime).toBe('15:45')
      expect(lesson3.endTime).toBe('16:30')
    }
  })

  it('stores time slots with correct timeTable', () => {
    const data = parseWakeupScheduleText(loadFixture())
    expect(data.timeSlots.length).toBeGreaterThan(0)
    expect(data.table.timeTable).toBe(2)
    // All slots should have matching timeTable for the built-in preset filter
    const builtInSlots = data.timeSlots.filter((s) => s.timeTable === data.table.timeTable)
    expect(builtInSlots.length).toBe(data.timeSlots.length)
  })

  it('builds course map correctly', () => {
    const data = parseWakeupScheduleText(loadFixture())
    expect(data.courses.length).toBe(3)
    const mathCourse = data.courses.find((c) => c.name === 'TEST-COURSE-ALPHA')
    expect(mathCourse).toBeDefined()
    expect(mathCourse?.color).toBe('#1890ff')
    expect(mathCourse?.credit).toBe(5)
  })

  it('sets table metadata correctly', () => {
    const data = parseWakeupScheduleText(loadFixture())
    expect(data.table.maxWeek).toBe(16)
    expect(data.table.nodes).toBe(11)
    expect(data.table.startDate).toBe('2026-02-23')
    expect(data.table.campus).toBe('TEST-UNIVERSITY')
    expect(data.table.school).toBe('TEST-UNIVERSITY')
    expect(data.table.name).toBe('TEST-SCHEDULE')
    expect(data.table.showSat).toBe(false)
    expect(data.table.showSun).toBe(false)
  })

  it('preserves raw wakeup data', () => {
    const data = parseWakeupScheduleText(loadFixture())
    expect(data.raw.kind).toBe('wakeup')
    if (data.raw.kind === 'wakeup') {
      expect(data.raw.meta.name).toBe('TEST-UNIVERSITY')
      expect(data.raw.courses.length).toBe(3)
      expect(data.raw.lessons.length).toBe(3)
    }
  })
})
