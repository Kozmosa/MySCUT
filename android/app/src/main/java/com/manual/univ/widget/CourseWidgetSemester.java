package com.manual.univ.widget;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;

// Uses calendar dates, matching the course page without 23/25-hour DST day errors.
record CourseWidgetSemester(State state, int week, long daysUntilStart) {
    enum State {
        INVALID_DATE,
        NOT_STARTED,
        ACTIVE,
        ENDED
    }

    static CourseWidgetSemester resolve(String startDateText, int maxWeek, LocalDate today) {
        if (startDateText == null || !startDateText.matches("\\d{4}-\\d{2}-\\d{2}")) {
            return new CourseWidgetSemester(State.INVALID_DATE, 0, 0);
        }

        LocalDate startDate;
        try {
            startDate = LocalDate.parse(startDateText);
        } catch (DateTimeParseException error) {
            return new CourseWidgetSemester(State.INVALID_DATE, 0, 0);
        }
        // The course-page parser rejects the JS Date constructor's special 0-99 years.
        if (startDate.getYear() < 100) {
            return new CourseWidgetSemester(State.INVALID_DATE, 0, 0);
        }

        long elapsedDays = ChronoUnit.DAYS.between(startDate, today);
        if (elapsedDays < 0) {
            return new CourseWidgetSemester(State.NOT_STARTED, 1, -elapsedDays);
        }

        int lastWeek = Math.max(1, maxWeek);
        long currentWeek = elapsedDays / 7 + 1;
        if (currentWeek > lastWeek) {
            return new CourseWidgetSemester(State.ENDED, lastWeek, 0);
        }
        return new CourseWidgetSemester(State.ACTIVE, (int) currentWeek, 0);
    }
}
