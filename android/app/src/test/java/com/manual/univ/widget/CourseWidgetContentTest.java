package com.manual.univ.widget;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

import java.time.LocalDate;

public class CourseWidgetContentTest {
    @Test
    public void blankLessonHasNoTimeSeparator() {
        CourseWidgetContent.Lesson lesson =
                new CourseWidgetContent.Lesson("", "", "", "", 0);

        assertEquals("", lesson.timeRangeLabel());
    }

    @Test
    public void lessonTimeRangeUsesSeparator() {
        CourseWidgetContent.Lesson lesson =
                new CourseWidgetContent.Lesson("Course", "Room", "08:50", "10:25", 0);

        assertEquals("08:50–10:25", lesson.timeRangeLabel());
    }

    @Test
    public void weekdayNumberMatchesScheduleDayNumbers() {
        assertEquals(1, CourseWidgetCourseManager.weekdayNumber(LocalDate.of(2026, 10, 19)));
        assertEquals(5, CourseWidgetCourseManager.weekdayNumber(LocalDate.of(2026, 10, 23)));
        assertEquals(6, CourseWidgetCourseManager.weekdayNumber(LocalDate.of(2026, 10, 24)));
        assertEquals(7, CourseWidgetCourseManager.weekdayNumber(LocalDate.of(2026, 10, 18)));
    }

    @Test
    public void tomorrowRollsFromSundayToMonday() {
        LocalDate sunday = LocalDate.of(2026, 10, 18);

        assertEquals(7, CourseWidgetCourseManager.weekdayNumber(sunday));
        assertEquals(1, CourseWidgetCourseManager.weekdayNumber(sunday.plusDays(1)));
    }

    @Test
    public void tomorrowRollsOverMonthEnd() {
        LocalDate sunday = LocalDate.of(2026, 10, 31).plusDays(1);

        assertEquals(11, sunday.getMonthValue());
        assertEquals(1, sunday.getDayOfMonth());
        assertEquals(7, CourseWidgetCourseManager.weekdayNumber(sunday));
    }
}
