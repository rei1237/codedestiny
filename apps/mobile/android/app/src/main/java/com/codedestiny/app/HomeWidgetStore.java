package com.codedestiny.app;

import android.content.Context;
import android.content.SharedPreferences;

/** 위젯별 선택값과 마지막 선택. 위젯을 그리거나 플러그인을 부를 때만 읽는다(앱 시작 시 읽지 않는다). */
final class HomeWidgetStore {
    static final String PREFS = "cd_home_widget";
    private static final String KEY_LAST = "last";
    private static final String KEY_PENDING = "pending";
    private static final String KEY_PENDING_AT = "pendingAt";
    private static final String KEY_PENDING_TOKEN = "pendingToken";
    private static final String KEY_ADDED_TOKEN = "addedToken";
    private static final String KEY_ADDED_ID = "addedId";

    private HomeWidgetStore() {}

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static String widgetKey(int widgetId) { return "w." + widgetId; }

    static HomeWidgetPolicy.Choice get(Context context, int widgetId) {
        return HomeWidgetPolicy.decode(prefs(context).getString(widgetKey(widgetId), null));
    }

    static HomeWidgetPolicy.Choice last(Context context) {
        return HomeWidgetPolicy.decode(prefs(context).getString(KEY_LAST, null));
    }

    /** 확정된 선택. 그 위젯과 "마지막 선택"을 함께 바꾼다. */
    static void put(Context context, int widgetId, HomeWidgetPolicy.Choice choice) {
        String encoded = HomeWidgetPolicy.encode(choice);
        prefs(context).edit().putString(widgetKey(widgetId), encoded).putString(KEY_LAST, encoded).apply();
    }

    /** 시스템 확인창을 띄우기 직전의 선택. 사용자가 취소하면 확정되지 않고 그대로 만료된다. */
    static void setPending(Context context, HomeWidgetPolicy.Choice choice, String token, long now) {
        prefs(context).edit()
                .putString(KEY_PENDING, HomeWidgetPolicy.encode(choice))
                .putString(KEY_PENDING_TOKEN, token)
                .putLong(KEY_PENDING_AT, now)
                .apply();
    }

    /** 토큰이 맞는 확인창의 선택만 돌려준다. */
    static HomeWidgetPolicy.Choice pending(Context context, String token) {
        SharedPreferences p = prefs(context);
        if (token == null || !token.equals(p.getString(KEY_PENDING_TOKEN, null))) return null;
        return HomeWidgetPolicy.decode(p.getString(KEY_PENDING, null));
    }

    /** 이 위젯에 보여줄 선택을 정하고, 저장된 값이 없던 위젯에는 그 결과를 저장해 둔다. */
    static HomeWidgetPolicy.Choice resolveFor(Context context, int widgetId, HomeWidgetPolicy.Choice fallback, long now) {
        SharedPreferences p = prefs(context);
        HomeWidgetPolicy.Choice stored = get(context, widgetId);
        HomeWidgetPolicy.Choice choice = HomeWidgetPolicy.resolve(
                stored,
                HomeWidgetPolicy.decode(p.getString(KEY_PENDING, null)),
                p.getLong(KEY_PENDING_AT, 0L),
                now,
                last(context),
                fallback);
        if (stored == null) p.edit().putString(widgetKey(widgetId), HomeWidgetPolicy.encode(choice)).apply();
        return choice;
    }

    static void markAdded(Context context, String token, int widgetId) {
        prefs(context).edit()
                .putString(KEY_ADDED_TOKEN, token == null ? "" : token)
                .putInt(KEY_ADDED_ID, widgetId)
                .remove(KEY_PENDING).remove(KEY_PENDING_TOKEN).remove(KEY_PENDING_AT)
                .apply();
    }

    static String addedToken(Context context) { return prefs(context).getString(KEY_ADDED_TOKEN, ""); }

    static int addedId(Context context) { return prefs(context).getInt(KEY_ADDED_ID, 0); }

    static void remove(Context context, int[] widgetIds) {
        SharedPreferences.Editor editor = prefs(context).edit();
        for (int id : widgetIds) editor.remove(widgetKey(id));
        editor.apply();
    }
}
