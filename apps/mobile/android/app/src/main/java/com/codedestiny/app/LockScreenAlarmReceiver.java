package com.codedestiny.app;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
public class LockScreenAlarmReceiver extends BroadcastReceiver {
    static final String EXTRA_LABEL = "cd_label";
    static final String EXTRA_ID = "cd_id";
    @Override public void onReceive(Context context, Intent intent) {
        LockScreenNotify.postContent(context, intent.getIntExtra(EXTRA_ID, 2000), false);
        LockScreenAlarmScheduler.rescheduleFromPrefs(context.getApplicationContext());
    }
}
