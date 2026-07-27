package com.codedestiny.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * AlarmManager 가 설정 시각에 깨우는 리시버 — 오늘의 문장 알림을 띄우고 다음 날로 재예약한다.
 */
public class LockScreenAlarmReceiver extends BroadcastReceiver {
    static final String EXTRA_LABEL = "cd_label";
    static final String EXTRA_ID = "cd_id";

    @Override
    public void onReceive(Context context, Intent intent) {
        String label = intent.getStringExtra(EXTRA_LABEL);
        int id = intent.getIntExtra(EXTRA_ID, 2001);
        if (label == null || label.isEmpty()) label = "오늘의 문장";
        LockScreenNotify.postAlarm(context.getApplicationContext(), id, label, "오늘의 문장이 도착했어요. 눌러서 확인해요.");
        // 하루 주기 반복 — 다음 날 같은 시각으로 다시 예약.
        LockScreenAlarmScheduler.rescheduleFromPrefs(context.getApplicationContext());
    }
}
