import { describe, expect, it } from "vitest";
import {
  buildWakeupExportText,
  buildQmsExportText,
  sanitizeScheduleForExport,
  applyTimeSlotPresetForExport,
  type ExportSanitizeOptions,
} from "../../../src/core/schedule/export";
import type {
  SavedSchedule,
  ScheduleData,
  WakeupTimeSlot,
} from "../../../src/core/schedule/types";

function buildMockSavedSchedule(
  overrides: Partial<SavedSchedule> = {}
): SavedSchedule {
  const timeSlots: WakeupTimeSlot[] = [
    { node: 1, startTime: "08:00", endTime: "08:45", timeTable: 2 },
    { node: 2, startTime: "08:55", endTime: "09:40", timeTable: 2 },
  ];

  const scheduleData: ScheduleData = {
    version: 1,
    source: "wakeup",
    importedAt: Date.now(),
    table: {
      id: 1,
      name: "Test Schedule",
      campus: "大学城校区",
      school: "华南理工大学",
      maxWeek: 20,
      nodes: 12,
      startDate: "2026-02-23",
      showSat: true,
      showSun: false,
      timeTable: 2,
    },
    timeSlots,
    courses: [
      {
        id: 1,
        tableId: 1,
        name: "高等数学",
        color: "#1890ff",
        credit: 5,
        note: "",
      },
      {
        id: 2,
        tableId: 1,
        name: "线性代数",
        color: "#52c41a",
        credit: 4,
        note: "",
      },
    ],
    lessons: [
      {
        instanceId: "lesson-1",
        courseId: 1,
        tableId: 1,
        day: 1 as const,
        startNode: 1,
        endNode: 2,
        startWeek: 1,
        endWeek: 18,
        weekStep: 1,
        ownTime: false,
        startTime: "08:00",
        endTime: "09:40",
        room: "A1301",
        teacher: "张老师",
        type: 0,
        level: 0,
      },
    ],
    raw: {
      kind: "wakeup",
      meta: {
        id: 1,
        name: "Test",
        courseLen: 2,
        sameBreakLen: false,
        sameLen: false,
        theBreakLen: 10,
      },
      timeSlots,
      tableConfig: {
        background: "",
        courseTextColor: -1,
        id: 1,
        itemAlpha: 60,
        itemHeight: 64,
        itemTextSize: 12,
        maxWeek: 20,
        nodes: 12,
        school: "华南理工大学",
        showOtherWeekCourse: false,
        showSat: true,
        showSun: false,
        showTime: true,
        startDate: "2026-02-23",
        strokeColor: -2368549,
        sundayFirst: false,
        tableName: "Test",
        textColor: -13619152,
        tid: "test",
        timeTable: 2,
        type: 0,
        updateTime: Date.now(),
        widgetCourseTextColor: -1,
        widgetItemAlpha: 60,
        widgetItemHeight: 60,
        widgetItemTextSize: 12,
        widgetStrokeColor: -2368549,
        widgetTextColor: -13619152,
      },
      courses: [
        {
          id: 1,
          tableId: 1,
          courseName: "高等数学",
          color: "#1890ff",
          credit: 5,
          note: "",
        },
      ],
      lessons: [
        {
          id: 1,
          tableId: 1,
          day: 1,
          startNode: 1,
          startWeek: 1,
          endWeek: 18,
          step: 2,
          ownTime: false,
          startTime: "08:00",
          endTime: "09:40",
          room: "A1301",
          teacher: "张老师",
          type: 0,
          level: 0,
        },
      ],
    },
  };

  return {
    id: "test-schedule-1",
    name: "Test Schedule",
    source: "wakeup",
    themeId: "skyBlue",
    timeSlotPresetId: "builtIn",
    semesterStartDate: "2026-02-23",
    createdAt: Date.now(),
    scheduleData,
    ...overrides,
  };
}

describe("buildWakeupExportText", () => {
  it("produces 5-line WakeUp format output", () => {
    const saved = buildMockSavedSchedule();
    const text = buildWakeupExportText(saved);
    const lines = text.split("\n");
    expect(lines).toHaveLength(5);
    expect(() => JSON.parse(lines[0])).not.toThrow();
    expect(() => JSON.parse(lines[4])).not.toThrow();
  });

  it("includes course name in WakeUp export", () => {
    const saved = buildMockSavedSchedule();
    const text = buildWakeupExportText(saved);
    expect(text).toContain("高等数学");
  });
});

describe("buildQmsExportText", () => {
  it("produces valid QMS JSON", () => {
    const saved = buildMockSavedSchedule();
    const text = buildQmsExportText(saved);
    const parsed = JSON.parse(text);
    expect(parsed.schema).toBe("qms");
    expect(parsed.version).toBe(2);
    expect(parsed.schedule.name).toBe("Test Schedule");
    expect(parsed.schedule.scheduleData.courses).toHaveLength(2);
  });
});

describe("sanitizeScheduleForExport", () => {
  it("removes course names when option is set", () => {
    const saved = buildMockSavedSchedule();
    const options: ExportSanitizeOptions = {
      removeBoundTimeSlots: false,
      removeCourseName: true,
      removeTeacherName: false,
      removeRoom: false,
    };
    const sanitized = sanitizeScheduleForExport(saved, options);
    const course = sanitized.scheduleData.courses[0];
    expect(course.name).toBe("");
  });

  it("removes teacher names when option is set", () => {
    const saved = buildMockSavedSchedule();
    const options: ExportSanitizeOptions = {
      removeBoundTimeSlots: false,
      removeCourseName: false,
      removeTeacherName: true,
      removeRoom: false,
    };
    const sanitized = sanitizeScheduleForExport(saved, options);
    const lesson = sanitized.scheduleData.lessons[0];
    expect(lesson.teacher).toBe("");
  });

  it("removes room when option is set", () => {
    const saved = buildMockSavedSchedule();
    const options: ExportSanitizeOptions = {
      removeBoundTimeSlots: false,
      removeCourseName: false,
      removeTeacherName: false,
      removeRoom: true,
    };
    const sanitized = sanitizeScheduleForExport(saved, options);
    const lesson = sanitized.scheduleData.lessons[0];
    expect(lesson.room).toBe("");
  });
});

describe("applyTimeSlotPresetForExport", () => {
  it("applies union time slot preset to saved schedule", () => {
    const saved = buildMockSavedSchedule();
    const applied = applyTimeSlotPresetForExport(saved, "union");
    expect(applied.timeSlotPresetId).toBe("union");
  });

  it("preserves courses after applying preset", () => {
    const saved = buildMockSavedSchedule();
    const applied = applyTimeSlotPresetForExport(saved, "universityTown");
    expect(applied.scheduleData.courses).toHaveLength(2);
  });
});
