package com.codedestiny.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * 웹 UI(/lock-screen-fortune)와 네이티브 잠금화면 사이의 브리지.
 *   getState/setState  — 설정·통계·읽은목록을 SharedPreferences 로 공유(네이티브가 예약/표시에 사용).
 *   setEnabled         — 마스터 ON/OFF → 포그라운드 서비스 시작/중지(ON 시 13+ 알림 권한 요청 포함).
 *   scheduleAlarms     — 알림 시간 예약(AlarmManager).
 *   dismiss            — "Yes!" 스와이프 → LockScreenActivity 닫기.
 *   requestOverlayPermission — '다른 앱 위에 표시' 권한 설정 화면 열기(자동 오버레이 필수).
 */
@CapacitorPlugin(
        name = "CodeDestinyLockScreen",
        permissions = {
                @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
        }
)
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
            // Android 13+ 는 POST_NOTIFICATIONS 를 런타임으로 받아야 시간 알림이 보인다.
            // 서비스는 권한과 무관하게 돌므로 먼저 켜 두고, 미허용이면 여기서 한 번 묻는다.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                    && getPermissionState("notifications") != PermissionState.GRANTED) {
                requestPermissionForAlias("notifications", call, "onNotificationsPermission");
                return;
            }
        } else {
            LockScreenForegroundService.stop(app);
        }
        call.resolve();
    }

    @PermissionCallback
    private void onNotificationsPermission(PluginCall call) {
        // 거부돼도 기능 자체(화면 켜짐 오버레이)는 동작하므로 결과와 무관하게 성공으로 닫는다.
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
