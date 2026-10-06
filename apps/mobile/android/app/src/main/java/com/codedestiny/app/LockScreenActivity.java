package com.codedestiny.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;

import androidx.core.content.ContextCompat;
import androidx.activity.OnBackPressedCallback;

/** Notification detail. The system keyguard must be dismissed before this Activity is visible. */
public class LockScreenActivity extends MainActivity {
    static final String ACTION_DISMISS = "com.codedestiny.app.LOCK_DISMISS";
    private static final String LOCK_URL = "https://localhost/lock-screen-fortune/index.html";
    private boolean ready;

    private final BroadcastReceiver dismissReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            finish();
            overridePendingTransition(0, 0);
        }
    };

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Share the main Activity's route resolver, SDK registration and safe WebView setup.
        super.onCreate(savedInstanceState);
        ready = true;

        // 기본 시작 경로(/index.html) 대신 잠금화면 몰입 라우트를 로드한다(확장자 있는 실제 파일 경로).
        openContent(getIntent());

        IntentFilter filter = new IntentFilter(ACTION_DISMISS);
        ContextCompat.registerReceiver(this, dismissReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED);
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() { handleDetailBack(); }
        });
    }

    private void openContent(Intent intent) {
        try {
            getBridge().getWebView().post(() -> {
                try { String kind = intent.getStringExtra("contentKind");
                    if (!"quote".equals(kind) && !"affirmation".equals(kind) && !"daily".equals(kind)) kind = "daily";
                    getBridge().getWebView().loadUrl(LOCK_URL + "?content=" + kind); } catch (Exception ignored) {}
            });
        } catch (Exception ignored) {}

    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (ready) openContent(intent);
    }

    @Override
    public void onDestroy() {
        try { unregisterReceiver(dismissReceiver); } catch (Exception ignored) {}
        super.onDestroy();
    }

    private void handleDetailBack() {
        getBridge().getWebView().evaluateJavascript("Boolean(window.__cdLockBack && window.__cdLockBack())", handled -> {
            if ("true".equals(handled)) return;
            if (getBridge().getWebView().canGoBack()) getBridge().getWebView().goBack();
            else finish();
        });
    }
}
