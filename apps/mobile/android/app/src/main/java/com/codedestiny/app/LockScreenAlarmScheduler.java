package com.codedestiny.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;

/**
 * 알림 시간 설정({enabled, alarms:[{on,time,label}]})을 AlarmManager 로 예약한다.
 * 비정확 예약으로 배터리를 보호한다. 정각 실행은 보장하지 않는다.
 */
final class LockScreenAlarmScheduler {
    private static final int MAX_SLOTS = 8;

    private LockScreenAlarmScheduler() {}

    static void schedule(Context ctx, String json) {
        cancelAll(ctx);
        if (!ctx.getSharedPreferences(CodeDestinyLockScreenPlugin.PREFS, Context.MODE_PRIVATE).getBoolean(CodeDestinyLockScreenPlugin.KEY_ENABLED, false)) return;
        if (json == null || json.isEmpty()) return;
        try {
            JSONObject root = new JSONObject(json);
            if (!root.optBoolean("enabled", true)) return;
            JSONArray alarms = root.optJSONArray("alarms");
            if (alarms == null) return;
            AlarmManager am = ctx.getSystemService(AlarmManager.class);
            if (am == null) return;
            for (int i = 0; i < alarms.length() && i < MAX_SLOTS; i++) {
                JSONObject a = alarms.optJSONObject(i);
                if (a == null || !a.optBoolean("on", false)) continue;
                scheduleOne(ctx, am, i, a.optString("time", "09:00"), a.optString("label", "오늘의 문장"));
            }
        } catch (Exception ignored) {}
    }

    static void rescheduleFromPrefs(Context ctx) {
        SharedPreferences prefs = ctx.getSharedPreferences(CodeDestinyLockScreenPlugin.PREFS, Context.MODE_PRIVATE);
        String state = prefs.getString(CodeDestinyLockScreenPlugin.KEY_STATE, "");
        boolean enabled = prefs.getBoolean(CodeDestinyLockScreenPlugin.KEY_ENABLED, false);
        try {
            JSONObject root = new JSONObject(state);
            JSONObject p = root.optJSONObject("prefs");
            if (p == null) { cancelAll(ctx); return; }
            JSONObject payload = new JSONObject();
            payload.put("enabled", enabled && p.optBoolean("enabled", false));
            payload.put("alarms", p.optJSONArray("alarms"));
            schedule(ctx, payload.toString());
        } catch (Exception ignored) { cancelAll(ctx); }
    }

    private static void scheduleOne(Context ctx, AlarmManager am, int idx, String time, String label) {
        int minuteOfDay = LockScreenPolicy.minutes(time, 540);
        int hour = minuteOfDay / 60, min = minuteOfDay % 60;
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, hour);
        cal.set(Calendar.MINUTE, min);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        if (cal.getTimeInMillis() <= System.currentTimeMillis()) {
            cal.add(Calendar.DAY_OF_YEAR, 1);
        }
        PendingIntent pi = alarmIntent(ctx, idx, label);
        am.setWindow(AlarmManager.RTC_WAKEUP, cal.getTimeInMillis(), 30 * 60 * 1000L, pi);
    }

    private static void cancelAll(Context ctx) {
        AlarmManager am = ctx.getSystemService(AlarmManager.class);
        if (am == null) return;
        for (int i = 0; i < MAX_SLOTS; i++) {
            am.cancel(alarmIntent(ctx, i, ""));
        }
    }

    private static PendingIntent alarmIntent(Context ctx, int idx, String label) {
        Intent intent = new Intent(ctx, LockScreenAlarmReceiver.class)
                .putExtra(LockScreenAlarmReceiver.EXTRA_LABEL, label)
                .putExtra(LockScreenAlarmReceiver.EXTRA_ID, 2000 + idx);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getBroadcast(ctx, 2000 + idx, intent, flags);
    }
}
