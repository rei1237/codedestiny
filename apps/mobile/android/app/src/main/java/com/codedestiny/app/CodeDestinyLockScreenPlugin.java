package com.codedestiny.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * 웹 UI(/lock-screen-fortune)와 네이티브 잠금화면 사이의 브리지.
 *   getState/setState  — 설정·통계·읽은목록을 SharedPreferences 로 공유(네이티브가 예약/표시에 사용).
 *   setEnabled         — 마스터 ON/OFF → 포그라운드 서비스 시작/중지.
 *   scheduleAlarms     — 알림 시간 예약(AlarmManager).
 *   dismiss            — "Yes!" 스와이프 → LockScreenActivity 닫기.
 *   requestOverlayPermission — '다른 앱 위에 표시' 권한 설정 화면 열기(자동 오버레이 필수).
 */
@CapacitorPlugin(name = "CodeDestinyLockScreen")
public class CodeDestinyLockScreenPlugin extends Plugin {
    static final String PREFS = "cd_lockscreen";
    static final String KEY_STATE = "state_json";
    static final String KEY_ENABLED = "enabled";

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    @PluginMethod
    public void getState(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("value", prefs().getString(KEY_STATE, ""));
        ret.put("canOverlay", Settings.canDrawOverlays(getContext()));
        call.resolve(ret);
    }

    @PluginMethod
    public void setState(PluginCall call) {
        prefs().edit().putString(KEY_STATE, call.getString("value", "")).apply();
        LockScreenAlarmScheduler.rescheduleFromPrefs(getContext().getApplicationContext());
        call.resolve();
    }

    @PluginMethod
    public void setEnabled(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", Boolean.TRUE));
        prefs().edit().putBoolean(KEY_ENABLED, enabled).apply();
        Context app = getContext().getApplicationContext();
        if (enabled) {
            LockScreenForegroundService.start(app);
        } else {
            LockScreenForegroundService.stop(app);
        }
        call.resolve();
    }

    @PluginMethod
    public void scheduleAlarms(PluginCall call) {
        LockScreenAlarmScheduler.schedule(getContext().getApplicationContext(), call.getString("value", ""));
        call.resolve();
    }

    @PluginMethod
    public void dismiss(PluginCall call) {
        Intent intent = new Intent(LockScreenActivity.ACTION_DISMISS).setPackage(getContext().getPackageName());
        getContext().sendBroadcast(intent);
        call.resolve();
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        Context ctx = getContext();
        try {
            if (!Settings.canDrawOverlays(ctx)) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:" + ctx.getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(intent);
            }
        } catch (Exception ignored) {}
        call.resolve();
    }
}
