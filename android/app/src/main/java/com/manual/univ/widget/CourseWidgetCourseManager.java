package com.manual.univ.widget;

import android.graphics.Color;

import org.json.JSONArray;
import org.json.JSONObject;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

// Reads the schedule JSON stored for the widget. It knows nothing about how a widget looks.
final class CourseWidgetCourseManager {
    private CourseWidgetCourseManager() {}

    static JSONObject getScheduleData(JSONObject schedule) {
        return schedule == null ? null : schedule.optJSONObject("scheduleData");
    }

    static String getTimeSlotPresetId(JSONObject schedule) {
        return schedule == null ? "builtIn" : schedule.optString("timeSlotPresetId", "builtIn");
    }

    static String getScheduleName(JSONObject schedule) {
        return schedule == null ? "我的课表" : schedule.optString("name", "我的课表");
    }

    static CourseWidgetSemester getSemester(JSONObject schedule, LocalDate today) {
        JSONObject scheduleData = getScheduleData(schedule);
        JSONObject table = scheduleData == null ? null : scheduleData.optJSONObject("table");

        String startDateText = schedule == null ? "" : schedule.optString("semesterStartDate", "");
        if (startDateText.isEmpty() && table != null) {
            startDateText = table.optString("startDate", "");
        }

        int maxWeek = table == null ? 1 : table.optInt("maxWeek", 1);
        return CourseWidgetSemester.resolve(startDateText, maxWeek, today);
    }

    static List<JSONObject> getTodayLessons(JSONObject scheduleData, int weekday, int currentWeek) {
        List<JSONObject> lessonsForToday = new ArrayList<>();
        if (scheduleData == null) {
            return lessonsForToday;
        }

        JSONArray lessons = scheduleData.optJSONArray("lessons");
        if (lessons == null) {
            return lessonsForToday;
        }

        for (int index = 0; index < lessons.length(); index++) {
            JSONObject lesson = lessons.optJSONObject(index);
            if (lesson == null || lesson.optInt("day") != weekday) {
                continue;
            }

            int startWeek = lesson.optInt("startWeek", 1);
            int endWeek = lesson.optInt("endWeek", startWeek);
            int weekStep = Math.max(1, lesson.optInt("weekStep", 1));
            if (currentWeek >= startWeek
                    && currentWeek <= endWeek
                    && (currentWeek - startWeek) % weekStep == 0) {
                lessonsForToday.add(lesson);
            }
        }

        lessonsForToday.sort(Comparator.comparingInt(lesson -> lesson.optInt("startNode")));
        return lessonsForToday;
    }

    static String getLessonEndTime(
            JSONObject scheduleData, String timeSlotPresetId, JSONObject lesson) {
        return getLessonTimeParts(scheduleData, timeSlotPresetId, lesson)[1];
    }

    static String[] getLessonTimeParts(
            JSONObject scheduleData, String presetId, JSONObject lesson) {
        JSONArray timeSlots = scheduleData == null ? null : scheduleData.optJSONArray("timeSlots");
        JSONObject table = scheduleData == null ? null : scheduleData.optJSONObject("table");
        int selectedTimeTable =
                table == null ? Integer.MIN_VALUE : table.optInt("timeTable", Integer.MIN_VALUE);
        List<CourseWidgetTimeResolver.TimeSlot> scheduleTimeSlots = new ArrayList<>();
        if (timeSlots != null) {
            for (int index = 0; index < timeSlots.length(); index++) {
                JSONObject timeSlot = timeSlots.optJSONObject(index);
                if (timeSlot != null) {
                    scheduleTimeSlots.add(
                            new CourseWidgetTimeResolver.TimeSlot(
                                    timeSlot.optInt("node"),
                                    timeSlot.optString("startTime", ""),
                                    timeSlot.optString("endTime", ""),
                                    timeSlot.optInt("timeTable", Integer.MIN_VALUE)));
                }
            }
        }
        return CourseWidgetTimeResolver.resolveLessonTimeParts(
                presetId,
                lesson.optInt("startNode"),
                lesson.optInt("endNode"),
                lesson.optString("startTime", ""),
                lesson.optString("endTime", ""),
                scheduleTimeSlots,
                selectedTimeTable);
    }

    static JSONObject findCourse(JSONObject scheduleData, int courseId) {
        JSONArray courses = scheduleData == null ? null : scheduleData.optJSONArray("courses");
        if (courses == null) {
            return null;
        }

        for (int index = 0; index < courses.length(); index++) {
            JSONObject course = courses.optJSONObject(index);
            if (course != null && course.optInt("id") == courseId) {
                return course;
            }
        }
        return null;
    }

    static int getFallbackCourseColor(
            JSONObject scheduleTheme, int courseId, int weekday, int lessonNumber) {
        JSONArray fallbackColors =
                scheduleTheme == null ? null : scheduleTheme.optJSONArray("fallbackColors");
        if (fallbackColors == null || fallbackColors.length() == 0) {
            return Color.rgb(217, 232, 255);
        }

        String color =
                fallbackColors.optString(
                        Math.floorMod(courseId + weekday + lessonNumber, fallbackColors.length()));
        return CourseWidgetColorUtils.parseColor(color, Color.rgb(217, 232, 255));
    }
}
