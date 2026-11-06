package com.manual.univ.widget;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.widget.RemoteViews;

import com.manual.univ.R;

// Bar style, every course shows a rounded color bar on its left instead of a filled card.
final class BarWidgetRenderer {
    private static final int[] CLICKABLE_VIEW_IDS = {
        android.R.id.background,
        R.id.widget_header,
        R.id.widget_schedule_name,
        R.id.widget_date,
        R.id.widget_week,
        R.id.widget_status,
        R.id.widget_footer
    };

    private BarWidgetRenderer() {}

    static void refreshAll(Context context) {
        int[] widgetIds = CourseWidgetRefresh.getWidgetIds(context, BarWidgetProvider.class);
        if (widgetIds.length > 0) {
            update(context, AppWidgetManager.getInstance(context), widgetIds);
        }
    }

    static void update(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        CourseWidgetStore.WidgetData data = CourseWidgetStore.load(context);
        CourseWidgetContent.Snapshot content = CourseWidgetContent.resolve(data);
        CourseWidgetAppearance.Palette palette =
                CourseWidgetAppearance.resolvePalette(context, data.appearance());
        boolean showsRemaining =
                CourseWidgetAppearance.showsRemainingLessons(data.appearance());
        CourseWidgetRefresh.scheduleNextRefresh(
                context, BarWidgetProvider.class, content.nextRefreshAt());

        for (int appWidgetId : appWidgetIds) {
            RemoteViews views =
                    new RemoteViews(context.getPackageName(), R.layout.bar_widget_layout);
            CourseWidgetRemoteViews.bindClickTargets(
                    context, views, appWidgetId, CLICKABLE_VIEW_IDS);
            CourseWidgetRemoteViews.bindTextColors(views, palette);
            CourseWidgetRemoteViews.bindWideSurface(views, palette);
            CourseWidgetRemoteViews.bindHeader(views, content, content.dateLabel());
            CourseWidgetRemoteViews.bindScrollableLessons(
                    context,
                    views,
                    appWidgetId,
                    content,
                    context.getString(R.string.course_widget_day_finished),
                    CourseWidgetRemoteViews.LessonStyle.BAR,
                    palette,
                    showsRemaining);
            appWidgetManager.updateAppWidget(appWidgetId, views);
            CourseWidgetRemoteViews.notifyLessonListChanged(
                    appWidgetManager, appWidgetId);
        }
    }
}
