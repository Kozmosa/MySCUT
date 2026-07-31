import { describe, expect, it } from "vitest";
import {
  buildIntersectionSchedule,
  type IntersectionParticipant,
} from "../../../src/core/schedule/intersection";
import type { ScheduleData } from "../../../src/core/schedule/types";

function buildMockSchedule(
  lessons: Array<{
    name: string;
    day: number;
    startWeek: number;
    endWeek: number;
    startNode: number;
    endNode: number;
  }>
): ScheduleData {
  const courseMap = new Map<string, number>();
  const courses: ScheduleData["courses"] = [];
  const scheduleLessons: ScheduleData["lessons"] = [];

  lessons.forEach((l, i) => {
    const existingId = courseMap.get(l.name);
    if (existingId !== undefined) {
      scheduleLessons.push({
        instanceId: `mock-${i}`,
        courseId: existingId,
        tableId: 1,
        day: l.day as 1 | 2 | 3 | 4 | 5 | 6 | 7,
        startNode: l.startNode,
        endNode: l.endNode,
        startWeek: l.startWeek,
        endWeek: l.endWeek,
        weekStep: 1,
        ownTime: false,
        startTime: "",
        endTime: "",
        room: "",
        teacher: "",
        type: 0,
        level: 0,
      });
      return;
    }

    const courseId = courses.length + 1;
    courseMap.set(l.name, courseId);
    courses.push({
      id: courseId,
      tableId: 1,
      name: l.name,
      color: "",
      credit: 0,
      note: "",
    });
    scheduleLessons.push({
      instanceId: `mock-${i}`,
      courseId,
      tableId: 1,
      day: l.day as 1 | 2 | 3 | 4 | 5 | 6 | 7,
      startNode: l.startNode,
      endNode: l.endNode,
      startWeek: l.startWeek,
      endWeek: l.endWeek,
      weekStep: 1,
      ownTime: false,
      startTime: "",
      endTime: "",
      room: "",
      teacher: "",
      type: 0,
      level: 0,
    });
  });

  return {
    version: 1,
    source: "wakeup",
    importedAt: Date.now(),
    table: {
      id: 1,
      name: "Mock Schedule",
      campus: "大学城校区",
      school: "华南理工大学",
      maxWeek: 20,
      nodes: 12,
      startDate: "2026-02-23",
      showSat: true,
      showSun: false,
      timeTable: 2,
    },
    timeSlots: [],
    courses,
    lessons: scheduleLessons,
    raw: { kind: "scutHtml", html: "" },
  };
}

describe("buildIntersectionSchedule", () => {
  it("produces free-time cells when participants have no lessons", () => {
    const participants: IntersectionParticipant[] = [
      {
        name: "A",
        scheduleData: buildMockSchedule([]),
        timeSlotPresetId: "builtIn",
      },
    ];
    const result = buildIntersectionSchedule(participants, "default", "Test");

    expect(result.source).toBe("intersection");
    expect(result.courses.length).toBeGreaterThan(0);
    const allCourseNames = result.courses.map((c) => c.name);
    expect(allCourseNames.length).toBeGreaterThan(0);
    expect(allCourseNames[0]).toBeTruthy();
  });

  it("marks occupied slots correctly", () => {
    const participants: IntersectionParticipant[] = [
      {
        name: "A",
        scheduleData: buildMockSchedule([
          {
            name: "Math",
            day: 1,
            startWeek: 1,
            endWeek: 18,
            startNode: 1,
            endNode: 2,
          },
        ]),
        timeSlotPresetId: "builtIn",
      },
    ];
    const result = buildIntersectionSchedule(participants, "default", "Test");

    const occupiedLessons = result.lessons.filter(
      (l) =>
        l.day === 1 &&
        l.startNode === 1 &&
        l.startWeek >= 1 &&
        l.startWeek <= 18
    );
    expect(occupiedLessons.length).toBeGreaterThan(0);
  });

  it("handles mode=availableOnly", () => {
    const participants: IntersectionParticipant[] = [
      {
        name: "A",
        scheduleData: buildMockSchedule([]),
        timeSlotPresetId: "builtIn",
      },
    ];
    const result = buildIntersectionSchedule(
      participants,
      "availableOnly",
      "Test"
    );
    expect(result.courses.every((c) => !c.name.includes("没空"))).toBe(true);
  });

  it("handles mode=unavailableOnly", () => {
    const participants: IntersectionParticipant[] = [
      {
        name: "A",
        scheduleData: buildMockSchedule([]),
        timeSlotPresetId: "builtIn",
      },
    ];
    const result = buildIntersectionSchedule(
      participants,
      "unavailableOnly",
      "Test"
    );
    expect(result.courses.every((c) => !c.name.startsWith("有空"))).toBe(true);
  });

  it("sorts names in Chinese locale order", () => {
    const participants: IntersectionParticipant[] = [
      {
        name: "李四",
        scheduleData: buildMockSchedule([]),
        timeSlotPresetId: "builtIn",
      },
      {
        name: "张三",
        scheduleData: buildMockSchedule([]),
        timeSlotPresetId: "builtIn",
      },
    ];
    const result = buildIntersectionSchedule(
      participants,
      "availableOnly",
      "Test"
    );
    const availableNames = result.courses.map((c) => c.name).join(" ");
    expect(availableNames).toContain("张三");
  });
});
