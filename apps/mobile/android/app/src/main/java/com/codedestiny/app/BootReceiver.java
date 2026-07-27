package com.codedestiny.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

/**
 * 재부팅/앱 업데이트 후 잠금화면 기능이 켜져 있으면 포그라운드 서비스와 알람을 복원한다.
 */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (action == null) return;
        if (!Intent.ACTION_BOOT_COMPLETED.equals(action) && !Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) return;
        Context app = context.getApplicationContext();
        SharedPreferences prefs = app.getSharedPreferences(CodeDestinyLockScreenPlugin.PREFS, Context.MODE_PRIVATE);
        if (prefs.getBoolean(CodeDestinyLockScreenPlugin.KEY_ENABLED, false)) {
            LockScreenForegroundService.start(app);
            LockScreenAlarmScheduler.rescheduleFromPrefs(app);
        }
    }
}
