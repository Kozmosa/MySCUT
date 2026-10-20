package com.manual.univ.widget;

import android.graphics.Color;

import org.json.JSONObject;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;

// Every course widget style renders this snapshot, so lesson picking and colors live here.
final class CourseWidgetContent {
    private static final String DEFAULT_COURSE_NAME = "课程";
    private static final String[] CAMPUS_PREFIXES = {"大学城校区 ", "五山校区 ", "广州国际校区 "};
    private static final String[] WEEKDAY_LABELS = {"日", "一", "二", "三", "四", "五", "六"};
    private static final int DEFAULT_PRIMARY_TEXT_COLOR = Color.rgb(31, 42, 60);
    private static final int DEFAULT_SECONDARY_TEXT_COLOR = Color.rgb(58, 94, 124);

    record Lesson(String name, String place, String startTime, String endTime, int accentColor) {
        String timeRangeLabel() {
            if (startTime.isEmpty()) {
                return endTime;
            }
            if (endTime.isEmpty()) {
                return startTime;
            }
            return startTime + "–" + endTime;
        }
    }

    record Snapshot(
            String scheduleName,
            String dateLabel,
            String shortDateLabel,
            String weekLabel,
            List<Lesson> lessons,
            boolean hasLessonsToday,
            boolean hasScheduleData,
            CourseWidgetSemester semester,
            int primaryTextColor,
            int secondaryTextColor,
            long nextRefreshAt) {}

    private CourseWidgetContent() {}

    static Snapshot resolve(CourseWidgetStore.WidgetData data) {
        JSONObject schedule = data.schedule();
        JSONObject scheduleTheme = data.scheduleTheme();
        JSONObject scheduleData = CourseWidgetCourseManager.getScheduleData(schedule);
        String timeSlotPresetId = CourseWidgetCourseManager.getTimeSlotPresetId(schedule);
        Calendar now = Calendar.getInstance();
        LocalDate today = now.toInstant().atZone(now.getTimeZone().toZoneId()).toLocalDate();
        CourseWidgetSemester semester = CourseWidgetCourseManager.getSemester(schedule, today);
        boolean semesterActive = semester.state() == CourseWidgetSemester.State.ACTIVE;
        int dayOfWeek = now.get(Calendar.DAY_OF_WEEK);
        int weekdayNumber = dayOfWeek == Calendar.SUNDAY ? 7 : dayOfWeek - 1;
        long timeOfDayMillis = getTimeOfDayMillis(now);

        // Outside the semester, only show its status and refresh again after midnight.
        List<JSONObject> todayLessons =
                semesterActive
                        ? CourseWidgetCourseManager.getTodayLessons(
                                scheduleData, weekdayNumber, semester.week())
                        : new ArrayList<>();
        List<Lesson> visibleLessons = new ArrayList<>();
        long nextLessonEndAt = Long.MAX_VALUE;

        for (JSONObject lesson : todayLessons) {
            String endTime =
                    CourseWidgetCourseManager.getLessonEndTime(
                            scheduleData, timeSlotPresetId, lesson);
            long lessonEndAt = toAbsoluteMillis(now, endTime);
            if (lessonEndAt > now.getTimeInMillis()) {
                nextLessonEndAt = Math.min(nextLessonEndAt, lessonEndAt);
            }

            if (!CourseWidgetTimeResolver.isEndTimePassed(endTime, timeOfDayMillis)) {
                visibleLessons.add(
                        resolveLesson(
                                scheduleData,
                                scheduleTheme,
                                timeSlotPresetId,
                                lesson,
                                weekdayNumber));
            }
        }

        return new Snapshot(
                CourseWidgetCourseManager.getScheduleName(schedule),
                formatDateLabel(now, dayOfWeek),
                formatShortDateLabel(now, dayOfWeek),
                semesterActive ? "第" + semester.week() + "周" : "",
                visibleLessons,
                !todayLessons.isEmpty(),
                scheduleData != null,
                semester,
                CourseWidgetColorUtils.readColor(
                        scheduleTheme, "textColorPrimary", DEFAULT_PRIMARY_TEXT_COLOR),
                CourseWidgetColorUtils.readColor(
                        scheduleTheme, "textColorSecondary", DEFAULT_SECONDARY_TEXT_COLOR),
                resolveNextRefreshAt(now, nextLessonEndAt));
    }

    private static Lesson resolveLesson(
            JSONObject scheduleData,
            JSONObject scheduleTheme,
            String timeSlotPresetId,
            JSONObject lesson,
            int weekday) {
        JSONObject course =
                CourseWidgetCourseManager.findCourse(scheduleData, lesson.optInt("courseId"));
        String name =
                course == null ? DEFAULT_COURSE_NAME : course.optString("name", DEFAULT_COURSE_NAME);
        String[] timeParts =
                CourseWidgetCourseManager.getLessonTimeParts(scheduleData, timeSlotPresetId, lesson);
        int fallbackColor =
                CourseWidgetCourseManager.getFallbackCourseColor(
                        scheduleTheme,
                        lesson.optInt("courseId"),
                        weekday,
                        lesson.optInt("startNode"));
        int accentColor =
                CourseWidgetColorUtils.parseColor(
                        course == null ? "" : course.optString("color", ""), fallbackColor);

        return new Lesson(
                name,
                simplifyRoom(lesson.optString("room", "")),
                timeParts[0],
                timeParts[1],
                accentColor);
    }

    private static String simplifyRoom(String room) {
        String trimmedRoom = room.trim();
        for (String prefix : CAMPUS_PREFIXES) {
            if (trimmedRoom.startsWith(prefix)) {
                return trimmedRoom.substring(prefix.length()).trim();
            }
        }

        return trimmedRoom;
    }

    private static long toAbsoluteMillis(Calendar now, String time) {
        long timeOfDayMillis = CourseWidgetTimeResolver.parseTimeOfDayMillis(time);
        if (timeOfDayMillis < 0) {
            return -1;
        }

        Calendar moment = (Calendar) now.clone();
        moment.set(Calendar.HOUR_OF_DAY, (int) (timeOfDayMillis / 3_600_000L));
        moment.set(Calendar.MINUTE, (int) (timeOfDayMillis / 60_000L % 60L));
        moment.set(Calendar.SECOND, 0);
        moment.set(Calendar.MILLISECOND, 0);
        return moment.getTimeInMillis();
    }

    private static long resolveNextRefreshAt(Calendar now, long nextLessonEndAt) {
        if (nextLessonEndAt != Long.MAX_VALUE) {
            return nextLessonEndAt;
        }

        // The day rollover cannot rely on DATE_CHANGED alone, so refresh just after midnight.
        Calendar nextMidnight = (Calendar) now.clone();
        nextMidnight.add(Calendar.DAY_OF_MONTH, 1);
        nextMidnight.set(Calendar.HOUR_OF_DAY, 0);
        nextMidnight.set(Calendar.MINUTE, 0);
        nextMidnight.set(Calendar.SECOND, 5);
        nextMidnight.set(Calendar.MILLISECOND, 0);
        return nextMidnight.getTimeInMillis();
    }

    private static String formatDateLabel(Calendar now, int dayOfWeek) {
        return (now.get(Calendar.MONTH) + 1)
                + "月"
                + now.get(Calendar.DAY_OF_MONTH)
                + "日 星期"
                + WEEKDAY_LABELS[dayOfWeek - 1];
    }

    // The two cell header has no room for the month and day characters.
    private static String formatShortDateLabel(Calendar now, int dayOfWeek) {
        return (now.get(Calendar.MONTH) + 1)
                + "."
                + now.get(Calendar.DAY_OF_MONTH)
                + " 星期"
                + WEEKDAY_LABELS[dayOfWeek - 1];
    }

    private static long getTimeOfDayMillis(Calendar calendar) {
        return calendar.get(Calendar.HOUR_OF_DAY) * 3_600_000L
                + calendar.get(Calendar.MINUTE) * 60_000L
                + calendar.get(Calendar.SECOND) * 1_000L
                + calendar.get(Calendar.MILLISECOND);
    }
}
