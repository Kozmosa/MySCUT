package com.manual.univ.widget;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.os.Build;
import android.util.TypedValue;
import android.widget.RemoteViews;

import com.manual.univ.R;

// Compact bar style, two courses with the lesson time as one label on a third line.
final class CompactBarWidgetRenderer {
    private static final int[] CLICKABLE_VIEW_IDS = {
        R.id.widget_root,
        R.id.widget_header,
        R.id.widget_date,
        R.id.widget_week,
        R.id.widget_status,
        R.id.widget_footer
    };

    private CompactBarWidgetRenderer() {}

    static void refreshAll(Context context) {
        int[] widgetIds =
                CourseWidgetRefresh.getWidgetIds(context, CompactBarWidgetProvider.class);
        if (widgetIds.length > 0) {
            update(context, AppWidgetManager.getInstance(context), widgetIds);
        }
    }

    static void update(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        CourseWidgetStore.WidgetData data = CourseWidgetStore.load(context);
        CourseWidgetContent.Snapshot content = CourseWidgetContent.resolve(data);
        CourseWidgetAppearance.Palette palette =
                CourseWidgetAppearance.resolvePalette(context, data.appearance());
        CourseWidgetRefresh.scheduleNextRefresh(
                context, CompactBarWidgetProvider.class, content.nextRefreshAt());

        for (int appWidgetId : appWidgetIds) {
            RemoteViews views =
                    new RemoteViews(context.getPackageName(), R.layout.compact_bar_widget_layout);
            CourseWidgetRemoteViews.bindClickTargets(
                    context, views, appWidgetId, CLICKABLE_VIEW_IDS);
            CourseWidgetRemoteViews.bindTextColors(views, palette);
            CourseWidgetRemoteViews.bindCompactSurface(views, palette);
            CourseWidgetRemoteViews.bindHeader(views, content, content.shortDateLabel());
            CourseWidgetRemoteViews.bindScrollableLessons(
                    context,
                    views,
                    appWidgetId,
                    content,
                    context.getString(R.string.course_widget_day_finished),
                    CourseWidgetRemoteViews.LessonStyle.COMPACT_BAR,
                    palette,
                    false);
            applySquareContent(context, appWidgetManager, appWidgetId, views);
            appWidgetManager.updateAppWidget(appWidgetId, views);
            CourseWidgetRemoteViews.notifyLessonListChanged(
                    appWidgetManager, appWidgetId);
        }
    }

    // Pins the block to a square of the reported size, skipped when it would clip the courses.
    private static void applySquareContent(
            Context context, AppWidgetManager appWidgetManager, int appWidgetId, RemoteViews views) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            return;
        }

        CourseWidgetRemoteViews.WidgetSize size =
                CourseWidgetRemoteViews.resolveWidgetSize(
                        context, appWidgetManager.getAppWidgetOptions(appWidgetId));
        int sideDp = Math.min(size.widthDp(), size.heightDp());
        if (sideDp <= 0) {
            return;
        }

        int sidePx =
                Math.round(sideDp * context.getResources().getDisplayMetrics().density);
        int contentHeightPx =
                CourseWidgetRemoteViews.measureContentHeight(
                        context, R.layout.compact_bar_widget_layout, sidePx);
        if (contentHeightPx > sidePx) {
            return;
        }

        views.setViewLayoutWidth(android.R.id.background, sideDp, TypedValue.COMPLEX_UNIT_DIP);
        views.setViewLayoutHeight(android.R.id.background, sideDp, TypedValue.COMPLEX_UNIT_DIP);
    }
}
