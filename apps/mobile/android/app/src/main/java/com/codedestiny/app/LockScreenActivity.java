package com.codedestiny.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;

import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

/**
 * 실제 폰 잠금화면 위에 오늘의 문장(웹 라우트 /lock-screen-fortune)을 표시하는 Activity.
 *
 * 화면이 켜질 때 LockScreenForegroundService 가 이 Activity 를 띄운다(YESSI 형 자동 오버레이).
 * setShowWhenLocked/setTurnScreenOn 으로 키가드 위에 뜨고, 사용자가 "Yes!" 를 스와이프하면
 * 플러그인 dismiss() 가 ACTION_DISMISS 브로드캐스트를 보내 이 Activity 를 닫는다(→ 원래 잠금화면 복귀).
 */
public class LockScreenActivity extends BridgeActivity {
    static final String ACTION_DISMISS = "com.codedestiny.app.LOCK_DISMISS";
    private static final String LOCK_URL = "https://localhost/lock-screen-fortune/index.html";

    private final BroadcastReceiver dismissReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            finish();
            overridePendingTransition(0, 0);
        }
    };

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CodeDestinyLockScreenPlugin.class);
        registerPlugin(CodeDestinyStatusBarPlugin.class);
        applyKeyguardFlags();
        super.onCreate(savedInstanceState);

        // 기본 시작 경로(/index.html) 대신 잠금화면 몰입 라우트를 로드한다(확장자 있는 실제 파일 경로).
        try {
            getBridge().getWebView().post(() -> {
                try { getBridge().getWebView().loadUrl(LOCK_URL); } catch (Exception ignored) {}
            });
        } catch (Exception ignored) {}

        IntentFilter filter = new IntentFilter(ACTION_DISMISS);
        ContextCompat.registerReceiver(this, dismissReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED);
    }

    private void applyKeyguardFlags() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                            | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                            | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        }
    }

    @Override
    public void onDestroy() {
        try { unregisterReceiver(dismissReceiver); } catch (Exception ignored) {}
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        // 잠금화면에서 하드웨어 뒤로가기는 오버레이 닫기로만 처리(홈으로 새지 않게).
        finish();
    }
}
