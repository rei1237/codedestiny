package com.codedestiny.app;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;

import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Android 12+ 스플래시 API / minSdk24 core-splashscreen 백포트 활성화(앱버전 로고 스플래시).
        // super.onCreate 이전 호출 필수.
        SplashScreen.installSplashScreen(this);
        registerPlugin(CodeDestinyBillingPlugin.class);
        super.onCreate(savedInstanceState);

        // Draw edge-to-edge so the WebView receives real system-bar/display-cutout insets.
        // This is what makes CSS env(safe-area-inset-*) resolve to non-zero values at first
        // paint, so the top app bar / theme toggle can clear the status bar and notch.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams layoutParams = getWindow().getAttributes();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                layoutParams.layoutInDisplayCutoutMode =
                        WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS;
            } else {
                layoutParams.layoutInDisplayCutoutMode =
                        WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            }
            getWindow().setAttributes(layoutParams);
        }

        // Default status-bar icons for the light "연이" theme (default / first install):
        // dark icons over the light background. Neo (dark) mode flips these to light icons
        // via @capacitor/status-bar in the shell's applyTheme().
        WindowInsetsControllerCompat insetsController =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        insetsController.setAppearanceLightStatusBars(true);
    }
}
