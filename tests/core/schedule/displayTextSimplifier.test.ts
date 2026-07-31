import { describe, expect, it } from "vitest";
import {
  simplifyCourseName,
  simplifyRoomText,
  simplifyTeacherText,
} from "../../../src/core/schedule/displayTextSimplifier";

describe("displayTextSimplifier", () => {
  describe("simplifyRoomText", () => {
    it("removes campus prefix from room text", () => {
      expect(simplifyRoomText("大学城校区 A1301")).toBe("A1301");
      expect(simplifyRoomText("五山校区 34201")).toBe("34201");
      expect(simplifyRoomText("广州国际校区 101")).toBe("101");
    });

    it("returns trimmed text when no prefix matches", () => {
      expect(simplifyRoomText("  A1301")).toBe("A1301");
      expect(simplifyRoomText("A1301")).toBe("A1301");
    });

    it("handles empty string", () => {
      expect(simplifyRoomText("")).toBe("");
      expect(simplifyRoomText("  ")).toBe("");
    });
  });

  describe("simplifyCourseName", () => {
    it("removes campus prefix from course name", () => {
      expect(simplifyCourseName("大学城校区 高等数学")).toBe("高等数学");
      expect(simplifyCourseName("五山校区 线性代数")).toBe("线性代数");
      expect(simplifyCourseName("广州国际校区 大学物理")).toBe("大学物理");
    });

    it("returns trimmed name when no prefix matches", () => {
      expect(simplifyCourseName(" 高等数学")).toBe("高等数学");
      expect(simplifyCourseName("高等数学")).toBe("高等数学");
    });

    it("handles empty string", () => {
      expect(simplifyCourseName("")).toBe("");
      expect(simplifyCourseName("  ")).toBe("");
    });
  });

  describe("simplifyTeacherText", () => {
    it("trims whitespace from teacher text", () => {
      expect(simplifyTeacherText("  张三")).toBe("张三");
      expect(simplifyTeacherText("李四  ")).toBe("李四");
      expect(simplifyTeacherText("  王五  ")).toBe("王五");
    });

    it("handles empty string", () => {
      expect(simplifyTeacherText("")).toBe("");
    });
  });
});
