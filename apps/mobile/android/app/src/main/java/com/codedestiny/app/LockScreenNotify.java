package com.codedestiny.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.core.app.NotificationCompat;

/**
 * 잠금화면 운세 기능의 알림 채널/알림 생성 헬퍼.
 *   - 상시(포그라운드 서비스) 알림: IMPORTANCE_MIN, 조용한 필수 고지.
 *   - 시간 알림(오늘의 꽃/감정상담소): IMPORTANCE_HIGH 헤즈업 + 탭 진입. 전체화면 인텐트는
 *     Play 정책상 통화·알람시계 앱 전용이라 쓰지 않는다(화면 켜짐 자동 표시는 FGS 가 담당).
 */
final class LockScreenNotify {
    static final String CHANNEL_SERVICE = "cd_lockscreen_service";
    static final String CHANNEL_ALARM = "cd_lockscreen_alarm";

    private LockScreenNotify() {}

    static void ensureChannels(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        if (nm == null) return;
        NotificationChannel service = new NotificationChannel(
                CHANNEL_SERVICE, "잠금화면 운세", NotificationManager.IMPORTANCE_MIN);
        service.setDescription("화면을 켜면 오늘의 문장을 잠금화면에 표시합니다.");
        service.setShowBadge(false);
        nm.createNotificationChannel(service);
        NotificationChannel alarm = new NotificationChannel(
                CHANNEL_ALARM, "잠금화면 알림", NotificationManager.IMPORTANCE_HIGH);
        alarm.setDescription("설정한 시간에 오늘의 문장을 알려드립니다.");
        nm.createNotificationChannel(alarm);
    }

    static Notification buildServiceNotification(Context ctx) {
        ensureChannels(ctx);
        return new NotificationCompat.Builder(ctx, CHANNEL_SERVICE)
                .setSmallIcon(ctx.getApplicationInfo().icon)
                .setContentTitle("잠금화면 운세")
                .setContentText("화면을 켜면 오늘의 문장이 나타납니다.")
                .setPriority(NotificationCompat.PRIORITY_MIN)
                .setOngoing(true)
                .setContentIntent(appOpenIntent(ctx))
                .build();
    }

    static void postAlarm(Context ctx, int id, String title, String text) {
        ensureChannels(ctx);
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        if (nm == null) return;
        Intent lock = new Intent(ctx, LockScreenActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent tap = PendingIntent.getActivity(ctx, id, lock, piFlags());
        Notification n = new NotificationCompat.Builder(ctx, CHANNEL_ALARM)
                .setSmallIcon(ctx.getApplicationInfo().icon)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(text))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setAutoCancel(true)
                .setContentIntent(tap)
                .build();
        nm.notify(id, n);
    }

    private static PendingIntent appOpenIntent(Context ctx) {
        Intent intent = new Intent(ctx, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(ctx, 0, intent, piFlags());
    }

    private static int piFlags() {
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        return flags;
    }
}
