package com.codedestiny.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

/**
 * 홈 화면 부적·확언 위젯. 주기 갱신(updatePeriodMillis=0)과 네트워크가 없다 —
 * 기기에 저장된 선택과 앱에 들어 있는 작은 그림 한 장만으로 그리므로 오프라인·재부팅 뒤에도 그대로다.
 * 누르면 앱의 /app/home-widget/ 화면이 열려 그 위젯의 내용을 바꿀 수 있다.
 */
public class HomeWidgetProvider extends AppWidgetProvider {
    static final String ACTION_EDIT = "com.codedestiny.app.HOME_WIDGET_EDIT";
    static final String EXTRA_WIDGET_ID = "homeWidgetId";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] widgetIds) {
        for (int id : widgetIds) render(context, manager, id);
    }

    @Override
    public void onDeleted(Context context, int[] widgetIds) {
        HomeWidgetStore.remove(context, widgetIds);
    }

    static ComponentName component(Context context) {
        return new ComponentName(context, HomeWidgetProvider.class);
    }

    static HomeWidgetPolicy.Choice fallback(Context context) {
        return new HomeWidgetPolicy.Choice(HomeWidgetPolicy.KIND_AFFIRMATION, HomeWidgetPolicy.DEFAULT_AFFIRMATION_ID,
                context.getString(R.string.home_widget_default_affirmation));
    }

    static void render(Context context, AppWidgetManager manager, int widgetId) {
        HomeWidgetPolicy.Choice choice = HomeWidgetStore.resolveFor(context, widgetId, fallback(context), System.currentTimeMillis());
        RemoteViews views = views(context, choice);
        views.setOnClickPendingIntent(R.id.home_widget_root, editIntent(context, widgetId));
        manager.updateAppWidget(widgetId, views);
    }

    /** 위젯 모양 — 홈 화면 위젯과 시스템 추가 확인창의 미리보기가 같은 것을 쓴다. */
    static RemoteViews views(Context context, HomeWidgetPolicy.Choice choice) {
        RemoteViews views;
        if (choice.isTalisman()) {
            views = new RemoteViews(context.getPackageName(), R.layout.widget_talisman);
            views.setImageViewResource(R.id.home_widget_image, talismanDrawable(choice.itemId));
            views.setContentDescription(R.id.home_widget_image, context.getString(R.string.home_widget_talisman_description));
        } else {
            boolean fortune = "fortune".equals(choice.kind);
            views = new RemoteViews(context.getPackageName(), fortune ? R.layout.widget_fortune : R.layout.widget_affirmation);
            String text = choice.text;
            if (HomeWidgetPolicy.isDaily(choice.kind, choice.itemId)) {
                String raw = choice.text;
                text = "";
                try {
                    org.json.JSONArray lines = new org.json.JSONArray(raw);
                    if (lines.length() > 0) text = lines.optString(HomeWidgetPolicy.dailyIndex(System.currentTimeMillis(), choice.kind, lines.length()));
                } catch (org.json.JSONException ignored) { /* Use the bundled default if storage is damaged. */ }
            }
            int artwork = choice.itemId.startsWith("cat-") ? R.drawable.widget_friend_cat : R.drawable.widget_friend_yeoni;
            if (fortune) artwork = "cat-daily-tea".equals(choice.itemId)
                    ? R.drawable.widget_pig_moon_tea_fortune : R.drawable.widget_cat_star_chart_fortune;
            if ("flower".equals(choice.kind)) artwork = R.drawable.widget_pig_moon_tea_face;
            views.setImageViewResource(R.id.home_widget_friend, artwork);
            views.setTextViewText(R.id.home_widget_text, text.isEmpty() ? context.getString(R.string.home_widget_default_affirmation) : text);
        }
        return views;
    }

    static int talismanDrawable(String itemId) {
        switch (itemId) {
            case "study": return R.drawable.widget_talisman_study;
            case "study-flower-pig-v2": return R.drawable.widget_talisman_study_flower_pig_v2;
            case "study-yeoni-v2": return R.drawable.widget_talisman_study_yeoni_v2;
            case "wealth": return R.drawable.widget_talisman_wealth;
            case "wealth-flower-pig-v2": return R.drawable.widget_talisman_wealth_flower_pig_v2;
            case "wealth-yeoni-v2": return R.drawable.widget_talisman_wealth_yeoni_v2;
            case "love": return R.drawable.widget_talisman_love;
            case "love-flower-pig-v2": return R.drawable.widget_talisman_love_flower_pig_v2;
            case "love-yeoni-v2": return R.drawable.widget_talisman_love_yeoni_v2;
            case "contact": return R.drawable.widget_talisman_contact;
            case "contact-flower-pig-v2": return R.drawable.widget_talisman_contact_flower_pig_v2;
            case "contact-yeoni-v2": return R.drawable.widget_talisman_contact_yeoni_v2;
            case "success": return R.drawable.widget_talisman_success;
            case "success-flower-pig-v2": return R.drawable.widget_talisman_success_flower_pig_v2;
            case "success-yeoni-v2": return R.drawable.widget_talisman_success_yeoni_v2;
            case "peace": return R.drawable.widget_talisman_peace;
            case "peace-flower-pig-v3": return R.drawable.widget_talisman_peace_flower_pig_v3;
            case "peace-yeoni-v3": return R.drawable.widget_talisman_peace_yeoni_v3;
            case "yeoni-hanbok": return R.drawable.widget_talisman_yeoni_hanbok;
            case "yeoni-moon": return R.drawable.widget_talisman_yeoni_moon;
            case "yeoni-tea": return R.drawable.widget_talisman_yeoni_tea;
            case "pig-gold-seed": return R.drawable.widget_talisman_pig_gold_seed;
            case "pig-camellias": return R.drawable.widget_talisman_pig_camellias;
            case "pig-reunion-knot": return R.drawable.widget_talisman_pig_reunion_knot;
            case "cat-star-chart": return R.drawable.widget_talisman_cat_star_chart;
            case "pig-moon-tea": return R.drawable.widget_talisman_pig_moon_tea;
            case "yeoni-pig-moon": return R.drawable.widget_talisman_yeoni_pig_moon;
            default: return R.drawable.widget_talisman_wealth;
        }
    }

    private static PendingIntent editIntent(Context context, int widgetId) {
        Intent intent = new Intent(context, MainActivity.class)
                .setAction(ACTION_EDIT)
                .putExtra(EXTRA_WIDGET_ID, widgetId)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        // requestCode 를 위젯 id 로 둬 위젯마다 다른 PendingIntent 가 되게 한다(extra 는 동등성 비교에서 빠진다).
        return PendingIntent.getActivity(context, widgetId, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
