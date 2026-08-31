package com.codedestiny.app;

import android.app.Notification;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;

import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;

/**
 * 잠금화면 기능의 상시 포그라운드 서비스.
 *
 * Android 8+ 는 ACTION_SCREEN_ON 을 매니페스트 리시버로 받을 수 없으므로, 실행 중인 서비스가
 * 런타임으로 등록한다. 화면이 켜지면(기능 ON일 때) LockScreenActivity 를 띄운다.
 * 백그라운드 Activity 시작은 SYSTEM_ALERT_WINDOW(다른 앱 위에 표시) 권한이 있어야 허용된다(런타임 요청).
 */
public class LockScreenForegroundService extends Service {
    private static final int NOTIF_ID = 4711;
    private ScreenReceiver screenReceiver;
    private boolean foregroundAsserted = false;

    static void start(Context ctx) {
        // 잠금화면은 부가 기능이다 — FGS 시작 제약(Android 12+ 백그라운드 시작 금지 등)에
        // 걸려도 앱을 죽이면 안 된다. Capacitor 브리지는 플러그인 메서드의 예외를
        // RuntimeException 으로 재던져 프로세스를 통째로 죽이고(Bridge.callPluginMethod),
        // BootReceiver 의 onReceive 도 무보호라 이 한 곳에서 흡수한다.
        // 실패해도 KEY_ENABLED 는 남으므로 다음 앱 실행(MainActivity)·부팅(BootReceiver)이 복구한다.
        try {
            Intent i = new Intent(ctx, LockScreenForegroundService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ctx.startForegroundService(i);
            } else {
                ctx.startService(i);
            }
        } catch (Exception ignored) {}
    }

    static void stop(Context ctx) {
        try {
            ctx.stopService(new Intent(ctx, LockScreenForegroundService.class));
        } catch (Exception ignored) {}
    }

    @Override
    public void onCreate() {
        super.onCreate();
        screenReceiver = new ScreenReceiver();
        IntentFilter filter = new IntentFilter();
        filter.addAction(Intent.ACTION_SCREEN_ON);
        filter.addAction(Intent.ACTION_USER_PRESENT);
        // Android 14+ 는 런타임 리시버에 export 플래그를 요구한다(시스템 브로드캐스트라 NOT_EXPORTED 로 충분).
        ContextCompat.registerReceiver(this, screenReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED);
    }

    private boolean startAsForeground() {
        if (foregroundAsserted) return true;
        try {
            Notification n = LockScreenNotify.buildServiceNotification(this);
            if (Build.VERSION.SDK_INT >= 34) {
                startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
            } else {
                startForeground(NOTIF_ID, n);
            }
            foregroundAsserted = true;
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // startForegroundService 의 계약(수 초 내 startForeground 호출)은 호출마다 생긴다.
        // onCreate 는 최초 1회뿐이라 여기서 보장한다(이미 실행 중일 때의 중복 시작 포함).
        if (!startAsForeground()) {
            // 실패를 삼킨 채 살아 있으면 시스템이 몇 초 뒤 "did not then call startForeground" 로
            // 프로세스를 강제 종료한다(설정 ON 직후 앱 튕김의 실체, 2026-09-01). 즉시 내려서 막는다.
            stopSelf(startId);
            return START_NOT_STICKY;
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        try { if (screenReceiver != null) unregisterReceiver(screenReceiver); } catch (Exception ignored) {}
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    static class ScreenReceiver extends BroadcastReceiver {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            if (!Intent.ACTION_SCREEN_ON.equals(action)) return;
            Context app = context.getApplicationContext();
            boolean enabled = app.getSharedPreferences(CodeDestinyLockScreenPlugin.PREFS, Context.MODE_PRIVATE)
                    .getBoolean(CodeDestinyLockScreenPlugin.KEY_ENABLED, false);
            if (!enabled) return;
            Intent i = new Intent(app, LockScreenActivity.class)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK
                            | Intent.FLAG_ACTIVITY_SINGLE_TOP
                            | Intent.FLAG_ACTIVITY_NO_ANIMATION);
            try { app.startActivity(i); } catch (Exception ignored) {}
        }
    }
}
