package com.manual.univ.widget;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

public class CourseWidgetSemesterTest {
    @Test
    public void countsCalendarDaysBeforeOpening() {
        assertSemester("2026-09-01", 20, "2026-08-30", CourseWidgetSemester.State.NOT_STARTED, 1, 2);
        assertSemester("2026-09-01", 20, "2026-08-31", CourseWidgetSemester.State.NOT_STARTED, 1, 1);
    }

    @Test
    public void startsOnTheConfiguredDateEvenWhenItIsNotMonday() {
        assertSemester("2026-09-01", 20, "2026-09-01", CourseWidgetSemester.State.ACTIVE, 1, 0);
        assertSemester("2026-09-01", 20, "2026-09-07", CourseWidgetSemester.State.ACTIVE, 1, 0);
        assertSemester("2026-09-01", 20, "2026-09-08", CourseWidgetSemester.State.ACTIVE, 2, 0);
    }

    @Test
    public void endsOnlyAfterAllConfiguredWeeks() {
        assertSemester("2026-09-01", 2, "2026-09-14", CourseWidgetSemester.State.ACTIVE, 2, 0);
        assertSemester("2026-09-01", 2, "2026-09-15", CourseWidgetSemester.State.ENDED, 2, 0);
        assertSemester("2026-09-01", 2, "2027-01-01", CourseWidgetSemester.State.ENDED, 2, 0);
    }

    @Test
    public void appliesAnUpdatedMaximumWeekWithoutChangingTheStartDate() {
        assertSemester("2026-09-01", 1, "2026-09-08", CourseWidgetSemester.State.ENDED, 1, 0);
        assertSemester("2026-09-01", 2, "2026-09-08", CourseWidgetSemester.State.ACTIVE, 2, 0);
    }

    @Test
    public void normalizesNonPositiveMaximumWeeksLikeTheCoursePage() {
        assertSemester("2026-09-01", 0, "2026-09-07", CourseWidgetSemester.State.ACTIVE, 1, 0);
        assertSemester("2026-09-01", -1, "2026-09-08", CourseWidgetSemester.State.ENDED, 1, 0);
    }

    @Test
    public void countsAcrossMonthYearAndLeapDayBoundaries() {
        assertSemester("2027-01-01", 20, "2026-12-31", CourseWidgetSemester.State.NOT_STARTED, 1, 1);
        assertSemester("2028-03-01", 20, "2028-02-28", CourseWidgetSemester.State.NOT_STARTED, 1, 2);
        assertSemester("2028-02-29", 1, "2028-03-06", CourseWidgetSemester.State.ACTIVE, 1, 0);
        assertSemester("2028-02-29", 1, "2028-03-07", CourseWidgetSemester.State.ENDED, 1, 0);
    }

    @Test
    public void rejectsMissingMalformedAndImpossibleDates() {
        for (String value : new String[] {
            null, "", "2026-02-30", "2025-02-29", "2026-9-01", "2026-09-01junk",
            "2026-09-01T00:00:00", " 2026-09-01", "0000-09-01", "0099-09-01"
        }) {
            assertSemester(value, 20, "2026-09-01", CourseWidgetSemester.State.INVALID_DATE, 0, 0);
        }
    }

    @Test
    public void usesTheLocalDateOnEachSideOfMidnightAndAfterTimezoneChanges() {
        Instant before = Instant.parse("2026-08-31T15:59:59Z");
        Instant midnight = before.plusSeconds(1);
        ZoneId shanghai = ZoneId.of("Asia/Shanghai");
        assertEquals(CourseWidgetSemester.State.NOT_STARTED,
                CourseWidgetSemester.resolve("2026-09-01", 20, before.atZone(shanghai).toLocalDate()).state());
        assertEquals(CourseWidgetSemester.State.ACTIVE,
                CourseWidgetSemester.resolve("2026-09-01", 20, midnight.atZone(shanghai).toLocalDate()).state());
        assertEquals(CourseWidgetSemester.State.NOT_STARTED,
                CourseWidgetSemester.resolve("2026-09-01", 20,
                        midnight.atZone(ZoneId.of("America/Los_Angeles")).toLocalDate()).state());
    }

    @Test
    public void daylightSavingTransitionsStillAdvanceByCalendarDays() {
        ZoneId newYork = ZoneId.of("America/New_York");
        LocalDate spring = Instant.parse("2026-03-09T04:00:00Z").atZone(newYork).toLocalDate();
        LocalDate autumn = Instant.parse("2026-11-02T05:00:00Z").atZone(newYork).toLocalDate();
        assertEquals(2, CourseWidgetSemester.resolve("2026-03-02", 2, spring).week());
        assertEquals(2, CourseWidgetSemester.resolve("2026-10-26", 2, autumn).week());
    }

    private static void assertSemester(
            String start, int maxWeek, String today, CourseWidgetSemester.State state,
            int week, long remainingDays) {
        CourseWidgetSemester actual = CourseWidgetSemester.resolve(start, maxWeek, LocalDate.parse(today));
        assertEquals(state, actual.state());
        assertEquals(week, actual.week());
        assertEquals(remainingDays, actual.daysUntilStart());
    }
}
