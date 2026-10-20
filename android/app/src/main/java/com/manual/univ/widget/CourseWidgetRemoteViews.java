package com.manual.univ.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.content.res.ColorStateList;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.DisplayMetrics;
import android.util.SizeF;
import android.view.View;
import android.widget.RemoteViews;

import androidx.annotation.RequiresApi;
import androidx.core.os.BundleCompat;

import com.manual.univ.R;

import java.util.List;

// Binding helpers shared by every course widget layout, which uses the same view ids.
final class CourseWidgetRemoteViews {
    private static final String LESSON_ADAPTER_URI_SCHEME = "myscut-widget";
    private static final String LESSON_ADAPTER_URI_AUTHORITY = "lessons";

    enum LessonStyle {
        BAR,
        CARD,
        COMPACT_BAR,
        COMPACT_CARD;

        boolean isCard() {
            return this == CARD || this == COMPACT_CARD;
        }

        boolean isCompact() {
            return this == COMPACT_BAR || this == COMPACT_CARD;
        }
    }

    // Course text colors, from the schedule theme on cards and from the widget appearance on bars.
    record LessonTextColors(int primary, int secondary) {}

    private CourseWidgetRemoteViews() {}

    // Rounded accent bitmap. Keep a non-zero size, and a height below the course text.
    static Bitmap createRoundedBitmap(
            Context context, int widthDp, int heightDp, float radiusDp, int color) {
        DisplayMetrics metrics = context.getResources().getDisplayMetrics();
        int width = Math.max(1, Math.round(widthDp * metrics.density));
        int height = Math.max(1, Math.round(heightDp * metrics.density));
        Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setColor(color);
        float radius = radiusDp * metrics.density;
        canvas.drawRoundRect(0f, 0f, width, height, radius, radius, paint);
        return bitmap;
    }

    static void bindClickTargets(
            Context context, RemoteViews views, int appWidgetId, int[] clickableViewIds) {
        PendingIntent launchPendingIntent =
                createLaunchPendingIntent(context, appWidgetId, false);
        if (launchPendingIntent == null) {
            return;
        }

        for (int viewId : clickableViewIds) {
            views.setOnClickPendingIntent(viewId, launchPendingIntent);
        }
        PendingIntent listTemplate =
                createLaunchPendingIntent(context, appWidgetId + 100_000, true);
        if (listTemplate != null) {
            views.setPendingIntentTemplate(R.id.course_widget_list, listTemplate);
        }
    }

    private static PendingIntent createLaunchPendingIntent(
            Context context, int requestCode, boolean mutable) {
        Intent launchIntent =
                context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launchIntent == null) {
            return null;
        }

        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int pendingIntentFlags =
                PendingIntent.FLAG_UPDATE_CURRENT
                        | (mutable ? PendingIntent.FLAG_MUTABLE : PendingIntent.FLAG_IMMUTABLE);
        return PendingIntent.getActivity(
                context,
                requestCode,
                launchIntent,
                pendingIntentFlags);
    }

    // Applied on every update, because a re-applied RemoteViews is not re-inflated.
    static void bindTextColors(RemoteViews views, CourseWidgetAppearance.Palette palette) {
        views.setTextColor(R.id.widget_schedule_name, palette.primaryTextColor());
        views.setTextColor(R.id.widget_date, palette.primaryTextColor());
        views.setTextColor(R.id.widget_week, palette.primaryTextColor());
        views.setTextColor(R.id.widget_status, palette.secondaryTextColor());
        views.setTextColor(R.id.widget_footer, palette.secondaryTextColor());
    }

    // Tints the rounded compact surface.
    // The tint API is 31+, so older hosts keep the default color.
    static void bindCompactSurface(RemoteViews views, CourseWidgetAppearance.Palette palette) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            views.setColorStateList(
                    R.id.widget_content,
                    "setBackgroundTintList",
                    ColorStateList.valueOf(palette.backgroundColor()));
        }
    }

    // Keeps the compact variants inside their original centered square.
    static void bindSquareContent(
            Context context,
            AppWidgetManager appWidgetManager,
            int appWidgetId,
            RemoteViews views) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            return;
        }

        WidgetSize size =
                resolveWidgetSize(
                        context, appWidgetManager.getAppWidgetOptions(appWidgetId));
        int sideDp = Math.min(size.widthDp(), size.heightDp());
        if (sideDp <= 0) {
            return;
        }

        views.setViewLayoutWidth(
                R.id.widget_content,
                sideDp,
                android.util.TypedValue.COMPLEX_UNIT_DIP);
        views.setViewLayoutHeight(
                R.id.widget_content,
                sideDp,
                android.util.TypedValue.COMPLEX_UNIT_DIP);
    }

    private record WidgetSize(int widthDp, int heightDp) {}

    private static WidgetSize resolveWidgetSize(Context context, Bundle options) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            SizeF current = pickCurrentSize(readWidgetSizes(options), isLandscape(context));
            if (current != null) {
                return new WidgetSize(
                        Math.round(current.getWidth()), Math.round(current.getHeight()));
            }
        }

        boolean landscape = isLandscape(context);
        return new WidgetSize(
                options.getInt(
                        landscape
                                ? AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH
                                : AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH),
                options.getInt(
                        landscape
                                ? AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT
                                : AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT));
    }

    @RequiresApi(api = Build.VERSION_CODES.S)
    private static List<SizeF> readWidgetSizes(Bundle options) {
        return BundleCompat.getParcelableArrayList(
                options, AppWidgetManager.OPTION_APPWIDGET_SIZES, SizeF.class);
    }

    private static SizeF pickCurrentSize(List<SizeF> sizes, boolean landscape) {
        if (sizes == null || sizes.isEmpty()) {
            return null;
        }

        SizeF fallback = null;
        for (SizeF size : sizes) {
            if (size == null || size.getWidth() <= 0 || size.getHeight() <= 0) {
                continue;
            }
            if (fallback == null) {
                fallback = size;
            }
            if ((size.getWidth() > size.getHeight()) == landscape) {
                return size;
            }
        }
        return fallback;
    }

    private static boolean isLandscape(Context context) {
        return context.getResources().getConfiguration().orientation
                == android.content.res.Configuration.ORIENTATION_LANDSCAPE;
    }

    static void bindHeader(
            RemoteViews views, CourseWidgetContent.Snapshot content, String dateLabel) {
        views.setViewVisibility(R.id.widget_header, View.VISIBLE);
        views.setTextViewText(R.id.widget_schedule_name, content.scheduleName());
        views.setTextViewText(R.id.widget_date, dateLabel);
        views.setTextViewText(R.id.widget_week, content.weekLabel());
    }

    static void bindScrollableLessons(
            Context context,
            RemoteViews views,
            int appWidgetId,
            CourseWidgetContent.Snapshot content,
            String dayFinishedText,
            LessonStyle style,
            CourseWidgetAppearance.Palette palette,
            boolean showsFooter) {
        List<CourseWidgetContent.Lesson> lessons = content.lessons();

        // Nothing has been synced yet, so the widget explains itself instead of sitting blank.
        if (!content.hasScheduleData()) {
            views.setViewVisibility(R.id.widget_header, View.GONE);
            hideLessonList(views);
            showStatus(views, context.getString(R.string.course_widget_no_data));
            return;
        }

        CourseWidgetSemester semester = content.semester();
        if (semester.state() == CourseWidgetSemester.State.INVALID_DATE) {
            hideLessonList(views);
            showStatus(views, context.getString(R.string.course_widget_invalid_semester_date));
            return;
        }

        if (semester.state() == CourseWidgetSemester.State.NOT_STARTED) {
            hideLessonList(views);
            showStatus(
                    views,
                    context.getString(
                            R.string.course_widget_semester_countdown, semester.daysUntilStart()));
            return;
        }

        if (semester.state() == CourseWidgetSemester.State.ENDED) {
            hideLessonList(views);
            showStatus(views, context.getString(R.string.course_widget_semester_ended));
            return;
        }

        if (lessons.isEmpty()) {
            hideLessonList(views);
            showStatus(
                    views,
                    content.hasLessonsToday()
                            ? dayFinishedText
                            : context.getString(R.string.course_widget_no_lessons));
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            views.setRemoteAdapter(
                    R.id.course_widget_list,
                    buildCollectionItems(context, content, style, palette));
        } else {
            bindLegacyRemoteAdapter(context, views, appWidgetId, style);
        }
        views.setViewVisibility(R.id.course_widget_list, View.VISIBLE);
        views.setViewVisibility(R.id.widget_status, View.GONE);
        bindFooter(context, views, content, showsFooter);
    }

    @RequiresApi(api = Build.VERSION_CODES.S)
    private static RemoteViews.RemoteCollectionItems buildCollectionItems(
            Context context,
            CourseWidgetContent.Snapshot content,
            LessonStyle style,
            CourseWidgetAppearance.Palette palette) {
        LessonTextColors textColors =
                CourseWidgetListFactory.resolveTextColors(style, content, palette);
        RemoteViews.RemoteCollectionItems.Builder builder =
                new RemoteViews.RemoteCollectionItems.Builder()
                        .setHasStableIds(false)
                        .setViewTypeCount(1);
        List<CourseWidgetContent.Lesson> lessons = content.lessons();
        for (int index = 0; index < lessons.size(); index++) {
            builder.addItem(
                    index,
                    CourseWidgetListFactory.createItemView(
                            context, style, lessons.get(index), textColors));
        }
        return builder.build();
    }

    // Android 8-11 has no RemoteCollectionItems API, so the service-backed overload is required.
    @SuppressWarnings("deprecation")
    private static void bindLegacyRemoteAdapter(
            Context context,
            RemoteViews views,
            int appWidgetId,
            LessonStyle style) {
        Intent adapterIntent = new Intent(context, CourseWidgetRemoteViewsService.class);
        adapterIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        adapterIntent.putExtra(
                CourseWidgetRemoteViewsService.EXTRA_LESSON_STYLE, style.name());
        adapterIntent.setData(
                new Uri.Builder()
                        .scheme(LESSON_ADAPTER_URI_SCHEME)
                        .authority(LESSON_ADAPTER_URI_AUTHORITY)
                        .appendPath(String.valueOf(appWidgetId))
                        .appendPath(style.name())
                        .build());
        views.setRemoteAdapter(R.id.course_widget_list, adapterIntent);
    }

    // Pre-12 widgets still use the service-backed adapter and need this refresh signal.
    @SuppressWarnings("deprecation")
    static void notifyLessonListChanged(AppWidgetManager appWidgetManager, int appWidgetId) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            appWidgetManager.notifyAppWidgetViewDataChanged(
                    appWidgetId, R.id.course_widget_list);
        }
    }

    private static void hideLessonList(RemoteViews views) {
        views.setViewVisibility(R.id.course_widget_list, View.GONE);
        views.setViewVisibility(R.id.widget_footer, View.GONE);
    }

    private static void showStatus(RemoteViews views, String text) {
        views.setViewVisibility(R.id.widget_status, View.VISIBLE);
        views.setTextViewText(R.id.widget_status, text);
        views.setViewVisibility(R.id.widget_footer, View.GONE);
    }

    // Counts the lessons still to come.
    private static void bindFooter(
            Context context,
            RemoteViews views,
            CourseWidgetContent.Snapshot content,
            boolean showsFooter) {
        int remaining = content.lessons().size();
        boolean visible = showsFooter && remaining > 0;
        views.setViewVisibility(R.id.widget_footer, visible ? View.VISIBLE : View.GONE);
        if (visible) {
            views.setTextViewText(
                    R.id.widget_footer,
                    context.getString(R.string.course_widget_remaining, remaining));
        }
    }
}
