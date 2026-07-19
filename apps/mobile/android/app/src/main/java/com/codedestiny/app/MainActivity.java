package com.codedestiny.app;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;

import androidx.appcompat.app.AppCompatDelegate;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.webkit.WebSettingsCompat;
import androidx.webkit.WebViewFeature;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.ProcessedRoute;
import com.getcapacitor.RouteProcessor;

import java.io.IOException;
import java.io.InputStream;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Android 12+ 스플래시 API / minSdk24 core-splashscreen 백포트 활성화(앱버전 로고 스플래시).
        // super.onCreate 이전 호출 필수.
        SplashScreen.installSplashScreen(this);
        // 앱은 연이 라이트 한 가지만 쓴다. 시스템 다크모드를 따라가면 웹뷰가 첫 페인트를 다크로
        // 그렸다가 셸 CSS 가 라이트로 덮어 번쩍인다. super.onCreate 이전에 고정한다.
        AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO);
        registerPlugin(CodeDestinyBillingPlugin.class);
        // 자사 절대 URL 네비게이션이 외부 브라우저로 새는 것을 네이티브에서 최종 차단한다.
        registerPlugin(CodeDestinyNavigationPlugin.class);
        // 라우트 해석기도 super.onCreate 이전에 등록해야 한다 —
        // BridgeActivity.onCreate 가 bridgeBuilder.create() 로 브리지를 만들어 버린다.
        installRouteProcessor();
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

        // Android 13+ 는 앱 테마가 라이트여도 웹뷰 자체의 알고리즘 다크닝이 켜질 수 있다.
        // 켜지면 연이 팔레트가 반전돼 읽을 수 없는 화면이 된다 — 명시적으로 끈다.
        if (WebViewFeature.isFeatureSupported(WebViewFeature.ALGORITHMIC_DARKENING)) {
            try {
                WebSettingsCompat.setAlgorithmicDarkeningAllowed(getBridge().getWebView().getSettings(), false);
            } catch (Exception ignored) {
                // 일부 기기의 WebView 구현에서 지원되지 않는다 — 테마 고정만으로도 충분하다.
            }
        }
    }

    /**
     * 확장자 없는 라우트를 실제 파일로 결정론적으로 해석한다.
     *
     * 이 사이트는 다중 페이지 정적 export 라 각 라우트가 "/route/index.html" 이다. 예전에는
     * Capacitor 의 html5mode 폴백에 기대고 있었는데, 그건 확장자 없는 경로를 전부 루트 셸로
     * 돌려보내 "탭을 누르면 홈으로 튕기는" 증상을 만들었다(원래 경로를 잃어버린다).
     * html5mode 를 끄고(capacitor.config.ts) 여기서 직접 해석하면, 빌드 시 링크 문자열을
     * 재작성하는 방식으로는 못 잡던 '변수로 조립되는 네비게이션'까지 서버단에서 해결된다.
     */
    private void installRouteProcessor() {
        bridgeBuilder.setRouteProcessor(new RouteProcessor() {
            @Override
            public ProcessedRoute process(String basePath, String path) {
                ProcessedRoute route = new ProcessedRoute();
                // 번들 자산만 서빙한다. isAsset=false 로 두면 openFile 경로로 새어 전부 깨진다.
                route.setAsset(true);
                route.setIgnoreAssetPath(false);

                String resolved = resolveRoute(path);
                // 호출부가 둘이고 경로 의미가 다르다(WebViewLocalServer).
                //   자산 핸들러: process("", path)      → 서버가 assetPath 를 앞에 붙인다
                //   "/" 폴백   : process(basePath, …)   → 반환값을 그대로 openAsset 에 쓴다
                route.setPath(basePath == null || basePath.isEmpty() ? resolved : basePath + resolved);
                return route;
            }
        });
    }

    private String resolveRoute(String rawPath) {
        String path = (rawPath == null || rawPath.isEmpty()) ? "/" : rawPath;

        // Capacitor 내부 스킴(content/file 브리지)은 손대지 않는다.
        if (path.contains("_capacitor_")) return path;

        // 확장자가 있으면 실제 파일 요청이다(JS·CSS·이미지·폰트) — 그대로 통과시킨다.
        int lastSlash = path.lastIndexOf('/');
        String lastSegment = lastSlash >= 0 ? path.substring(lastSlash + 1) : path;
        if (lastSegment.contains(".")) return path;

        String candidate = path.replaceAll("/+$", "") + "/index.html";
        if (assetExists(candidate)) return candidate;

        // 없는 라우트는 홈 셸로 — html5mode 가 하던 폴백을 유지해 404 폭발을 막는다.
        return "/index.html";
    }

    private boolean assetExists(String path) {
        try (InputStream stream = getAssets().open(Bridge.DEFAULT_WEB_ASSET_DIR + path)) {
            return stream != null;
        } catch (IOException e) {
            return false;
        }
    }
}
