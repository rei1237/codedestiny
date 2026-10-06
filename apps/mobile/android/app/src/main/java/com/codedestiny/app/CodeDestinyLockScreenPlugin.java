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
 *   setEnabled         — 마스터 ON/OFF → 비정확 알림 예약/취소(ON 시 13+ 알림 권한 요청 포함).
 *   scheduleAlarms     — 알림 시간 예약(AlarmManager).
 *   dismiss            — 기존 브리지 호환: LockScreenActivity 닫기.
 *   requestOverlayPermission — 기존 브리지 호환 no-op.
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
        ret.put("enabled", prefs().getBoolean(KEY_ENABLED, false));
        ret.put("notificationsAllowed", LockScreenNotify.allowed(getContext()));
        ret.put("presentation", "notification");
        call.resolve(ret);
    }

    @PluginMethod
    public void setState(PluginCall call) {
        String value = call.getString("value", "");
        try {
            org.json.JSONObject next = new org.json.JSONObject(value);
            org.json.JSONObject previous = new org.json.JSONObject(prefs().getString(KEY_STATE, "{}"));
            org.json.JSONObject oldOptions = previous.optJSONObject("prefs");
            org.json.JSONObject options = next.optJSONObject("prefs");
            if (options == null) { call.reject("INVALID_SETTINGS"); return; }
            if (oldOptions != null && !oldOptions.toString().equals(options.toString())) LockScreenNotify.cancelContent(getContext());
            prefs().edit().putString(KEY_STATE, value).apply();
        } catch (org.json.JSONException e) { call.reject("INVALID_SETTINGS"); return; }
        LockScreenAlarmScheduler.rescheduleFromPrefs(getContext().getApplicationContext());
        call.resolve();
    }

    @PluginMethod
    public void setEnabled(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", Boolean.TRUE));
        prefs().edit().putBoolean(KEY_ENABLED, enabled).apply();
        Context app = getContext().getApplicationContext();
        if (enabled) {
            LockScreenForegroundService.stop(app);
            LockScreenAlarmScheduler.rescheduleFromPrefs(app);
            // Android 13+ 는 POST_NOTIFICATIONS 를 런타임으로 받아야 시간 알림이 보인다.
            // 기능 선택은 보존하되 미허용이면 여기서 한 번 묻는다.
            // getPermissionState 까지 try 안에 둔다: vc41 릴리스에서 R8 이 이 호출을
            // `throw null` 로 접어 설정 ON 즉시 앱이 죽었다(2026-09-01, proguard-rules.pro 참조).
            // 근본원인은 keep 규칙으로 고쳤지만, Capacitor 브리지가 플러그인 예외를
            // 프로세스 크래시로 바꾸므로 권한 UX 는 어떤 실패에도 기능 활성을 막으면 안 된다.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                try {
                    if (getPermissionState("notifications") != PermissionState.GRANTED) {
                        requestPermissionForAlias("notifications", call, "onNotificationsPermission");
                        return;
                    }
                } catch (Exception ignored) {
                    // 다이얼로그를 못 띄워도(액티비티 소멸 직후 등) 기능 활성 자체는 성공이다.
                }
            }
        } else {
            LockScreenForegroundService.stop(app);
            LockScreenAlarmScheduler.rescheduleFromPrefs(app);
            LockScreenNotify.cancelContent(app);
        }
        call.resolve();
    }

    @PermissionCallback
    private void onNotificationsPermission(PluginCall call) {
        // 거부해도 상세 카드와 다른 앱 기능은 계속 사용할 수 있다.
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
        // Legacy web bundles may call this. No overlay permission is requested anymore.
        call.resolve();
    }

    @PluginMethod
    public void setPublicContent(PluginCall call) {
        String value = call.getString("value", "{}");
        if (value.length() > 100000) { call.reject("CONTENT_TOO_LARGE"); return; }
        try { new org.json.JSONObject(value); }
        catch (org.json.JSONException e) { call.reject("INVALID_CONTENT"); return; }
        prefs().edit().putString(LockScreenNotify.SNAPSHOT, value).apply();
        call.resolve();
    }

    @PluginMethod
    public void testNotification(PluginCall call) {
        JSObject result = new JSObject();
        result.put("posted", LockScreenNotify.postContent(getContext(), 4800, true));
        call.resolve(result);
    }

    @PluginMethod
    public void clearNotifications(PluginCall call) {
        LockScreenNotify.cancelContent(getContext());
        prefs().edit().remove(LockScreenNotify.SNAPSHOT).apply();
        call.resolve();
    }

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        Intent settings = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                .putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
        if (Build.VERSION.SDK_INT < 26) settings = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.parse("package:" + getContext().getPackageName()));
        getActivity().startActivity(settings);
        call.resolve();
    }
}
