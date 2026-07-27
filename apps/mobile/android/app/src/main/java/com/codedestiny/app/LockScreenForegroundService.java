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

    static void start(Context ctx) {
        Intent i = new Intent(ctx, LockScreenForegroundService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ctx.startForegroundService(i);
        } else {
            ctx.startService(i);
        }
    }

    static void stop(Context ctx) {
        ctx.stopService(new Intent(ctx, LockScreenForegroundService.class));
    }

    @Override
    public void onCreate() {
        super.onCreate();
        startAsForeground();
        screenReceiver = new ScreenReceiver();
        IntentFilter filter = new IntentFilter();
        filter.addAction(Intent.ACTION_SCREEN_ON);
        filter.addAction(Intent.ACTION_USER_PRESENT);
        // Android 14+ 는 런타임 리시버에 export 플래그를 요구한다(시스템 브로드캐스트라 NOT_EXPORTED 로 충분).
        ContextCompat.registerReceiver(this, screenReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED);
    }

    private void startAsForeground() {
        Notification n = LockScreenNotify.buildServiceNotification(this);
        try {
            if (Build.VERSION.SDK_INT >= 34) {
                startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
            } else {
                startForeground(NOTIF_ID, n);
            }
        } catch (Exception ignored) {
            // 알림 권한 미허용 등으로 실패해도 앱 크래시는 막는다.
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
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
