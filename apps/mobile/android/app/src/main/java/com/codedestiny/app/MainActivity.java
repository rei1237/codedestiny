package com.codedestiny.app;

import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.WindowManager;

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
    /** 웹 메인 화면이 실제로 보여줄 준비를 마쳤는지. 네이티브 스플래시를 걷는 조건이다. */
    private final boolean[] webViewDrawn = { false };

    /**
     * 웹 준비 신호가 끝내 오지 않아도 스플래시에 갇히지 않도록 하는 상한.
     * 스플래시를 붙잡는 동안에도 WebView 의 로딩·레이아웃은 계속 진행되므로(막히는 것은 draw 뿐)
     * 이 값은 앱이 준비되는 시각을 늦추지 않는다 — 어느 화면을 보여줄지만 정한다.
     */
    private static final long SPLASH_HANDOFF_CAP_MS = 3000L;

    /** 웹 부팅 게이트 상태를 되묻는 간격. */
    private static final long SPLASH_POLL_MS = 120L;

    private static final int SPLASH_BG_YEON = 0xFFFFFAF7;
    private static final int SPLASH_BG_NEO = 0xFF0A0818;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 마지막으로 쓰던 테마. 셸 applyTheme 이 매 부팅 StatusBar.setStyle 을 부르며 기록한다.
        boolean isNeo = false;
        try {
            isNeo = getSharedPreferences(CodeDestinyStatusBarPlugin.PREFS, MODE_PRIVATE)
                    .getBoolean(CodeDestinyStatusBarPlugin.KEY_NEO, false);
        } catch (Exception ignored) {}

        // 네오 사용자에게 크림색 스플래시를 띄우면 웹 베일(#0a0818)로 넘어갈 때 색이 튄다.
        // API 24~30(core-splashscreen 백포트)은 installSplashScreen 시점의 액티비티 테마에서
        // windowSplashScreenBackground 를 읽으므로 여기서 바꾸면 완전히 해결된다.
        // API 31+ 는 시스템이 앱 코드 실행 전에 매니페스트 테마로 시작 창을 이미 그려 놓아
        // 이 호출이 닿지 않는다 — 아래 창 배경색 지정 + 종료 페이드로 하드컷만 완화한다.
        if (isNeo) setTheme(R.style.AppTheme_NoActionBarLaunch_Neo);

        // Android 12+ 스플래시 API / minSdk24 core-splashscreen 백포트 활성화(앱버전 로고 스플래시).
        // super.onCreate 이전 호출 필수.
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        // 기본 동작은 "액티비티 첫 프레임 draw = 스플래시 종료"인데, 그 시점의 WebView 는 아직
        // 셸을 그리지 않아 흰 화면이 한 번 스친다. 웹 부팅 게이트(cd-boot-gate)는 <head> 에서
        // 동기로 붙으므로, WebView 가 그릴 준비를 마친 뒤 넘기면 그 틈이 사라진다.
        splashScreen.setKeepOnScreenCondition(() -> !webViewDrawn[0]);
        installSplashExitFade(splashScreen);
        registerPlugin(CodeDestinyBillingPlugin.class);
        // 자사 절대 URL 네비게이션이 외부 브라우저로 새는 것을 네이티브에서 최종 차단한다.
        registerPlugin(CodeDestinyNavigationPlugin.class);
        // 셸 applyTheme 이 부르는 Capacitor.Plugins.StatusBar.setStyle 의 실제 구현.
        // 이게 없으면 네오(다크) 전환 시 상태바 아이콘이 다크로 남아 보이지 않는다.
        registerPlugin(CodeDestinyStatusBarPlugin.class);
        // 잠금화면(네이티브 오버레이) 브리지 — 웹 /lock-screen-fortune 설정·첫 실행 동의 모달이 사용.
        registerPlugin(CodeDestinyLockScreenPlugin.class);
        // Zero-Tap Sign-In(Restore Credentials) 브리지 — 뼈대만. 서버 검증·호출부는 후속 PR.
        registerPlugin(CodeDestinyCredentialsPlugin.class);
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

        // 스플래시가 걷히는 순간 드러나는 창 배경. DayNight 테마에서 파생된 색이 새어나오지 않도록
        // 기억해 둔 테마 색으로 못박는다 — API 31+ 처럼 시작 창 색을 못 바꾸는 경우에도 이 지점부터는
        // 웹 베일과 같은 색이라 전환이 하드컷이 아니라 짧은 페이드로 읽힌다.
        try {
            getWindow().setBackgroundDrawable(new ColorDrawable(isNeo ? SPLASH_BG_NEO : SPLASH_BG_YEON));
        } catch (Exception ignored) {}

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

        // 시스템 바 아이콘 명암. 연이(밝은 배경)=어두운 아이콘, 네오(다크 배경)=밝은 아이콘.
        // 예전엔 무조건 연이 기본으로 시작하고 셸 applyTheme 이 나중에 뒤집었는데, 그 사이
        // 네오 사용자에게 어두운 아이콘이 어두운 배경 위에 잠깐 보이지 않았다.
        // 기억해 둔 테마로 첫 프레임부터 맞춘다(전환 시에는 setStyle 이 계속 담당).
        WindowInsetsControllerCompat insetsController =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        insetsController.setAppearanceLightStatusBars(!isNeo);
        insetsController.setAppearanceLightNavigationBars(!isNeo);

        // 셸은 연이/네오 두 팔레트를 CSS 로 직접 그린다. 시스템 다크모드에서 웹뷰가 알고리즘
        // 다크닝을 켜면 그 색을 임의로 반전시켜 어느 모드에서도 읽을 수 없게 된다 — 명시적으로 끈다.
        // (테마 선택 자체는 셸의 연이/네오 토글이 계속 담당한다.)
        if (WebViewFeature.isFeatureSupported(WebViewFeature.ALGORITHMIC_DARKENING)) {
            try {
                WebSettingsCompat.setAlgorithmicDarkeningAllowed(getBridge().getWebView().getSettings(), false);
            } catch (Exception ignored) {
                // 일부 기기의 WebView 구현에서 지원되지 않는다 — 셸 CSS 만으로도 색은 확정된다.
            }
        }

        // 잠금화면 기능이 켜져 있으면 앱 재실행 때 포그라운드 서비스를 복원한다(화면 켜짐 감지 재개).
        try {
            boolean lockEnabled = getSharedPreferences(CodeDestinyLockScreenPlugin.PREFS, MODE_PRIVATE)
                    .getBoolean(CodeDestinyLockScreenPlugin.KEY_ENABLED, false);
            if (lockEnabled) LockScreenForegroundService.start(getApplicationContext());
        } catch (Exception ignored) {}

        scheduleSplashHandoff();
    }

    /**
     * 네이티브 스플래시를 웹 부팅 게이트(cd-boot-gate)에 넘긴다.
     *
     * 예전 신호는 postVisualStateCallback("WebView 가 그릴 준비를 마쳤다")이었는데, 그건 셸이
     * 데이터를 받았다는 뜻이 아니다. 그래서 스플래시가 1.5초에 걷힌 뒤 아직 준비 안 된 메인이
     * 드러나고, 인증·이용권 확인이 끝나며 카드가 뒤늦게 통째로 교체되는 장면이 "다시 로딩"으로 읽혔다.
     *
     * 🔴 이건 게이트를 하나 더 얹는 게 아니다. 네이티브 스플래시와 웹 베일은 이미 둘 다 있었고,
     * 순차로 이어붙어 이음매가 보이던 것이 문제였다. 네이티브가 웹 게이트에 종속되면
     * 사용자가 보는 커버는 하나가 된다. 웹 쪽 하드캡(8초)은 건드리지 않는다 —
     * scripts/verify-auth-event-loop-guard.mjs 가 7500ms 이상을 강제한다.
     *
     * 게이트가 애초에 안 붙는 경우(cdBootGateShownV1 세션 래치)에도 readyState 항이 있어 즉시 걷힌다.
     */
    private void scheduleSplashHandoff() {
        Handler handler = new Handler(Looper.getMainLooper());
        handler.postDelayed(() -> webViewDrawn[0] = true, SPLASH_HANDOFF_CAP_MS);
        pollWebBootGate(handler, android.os.SystemClock.uptimeMillis() + SPLASH_HANDOFF_CAP_MS);
    }

    private void pollWebBootGate(Handler handler, long deadlineUptimeMs) {
        if (webViewDrawn[0]) return;
        if (android.os.SystemClock.uptimeMillis() >= deadlineUptimeMs) {
            webViewDrawn[0] = true;
            return;
        }
        try {
            getBridge().getWebView().evaluateJavascript(
                    "(function(){try{return document.readyState!=='loading'"
                            + "&&!document.documentElement.classList.contains('cd-boot-gate');}"
                            + "catch(e){return true;}})()",
                    value -> {
                        if ("true".equals(value)) {
                            webViewDrawn[0] = true;
                            return;
                        }
                        handler.postDelayed(() -> pollWebBootGate(handler, deadlineUptimeMs), SPLASH_POLL_MS);
                    });
        } catch (Exception ignored) {
            // 평가를 걸지 못하는 기기에서는 상한 타이머가 대신 걷는다.
            webViewDrawn[0] = true;
        }
    }

    /**
     * 스플래시를 하드컷 대신 짧은 페이드로 걷는다.
     *
     * API 31+ 는 시스템이 앱 코드 실행 전에 매니페스트 테마로 시작 창을 그려서, 네오 사용자에게도
     * 첫 프레임은 크림색이다(setTheme 이 닿지 않는 구간 — 완전 제거는 activity-alias 토글뿐인데
     * 런처 아이콘이 재등록되며 홈화면에서 앱이 사라질 수 있어 채택하지 않는다).
     * 아래 창 배경색 지정과 이 페이드로 색 전환을 "튐"에서 "짧은 크로스페이드"까지 낮춘다.
     */
    private void installSplashExitFade(SplashScreen splashScreen) {
        try {
            splashScreen.setOnExitAnimationListener(provider -> {
                try {
                    View splashView = provider.getView();
                    splashView.animate()
                            .alpha(0f)
                            .setDuration(220L)
                            .withEndAction(provider::remove)
                            .start();
                } catch (Exception ignored) {
                    provider.remove();
                }
            });
        } catch (Exception ignored) {
            // 리스너를 걸지 못하면 시스템 기본 종료 동작(즉시 제거)이 그대로 쓰인다.
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
        if (lastSegment.contains(".")) {
            // 예외: 라우트 문서(/route/index.html)가 없으면 홈 셸로 폴백한다.
            // 확장자 없는 경로는 아래에서 폴백되지만, CodeDestinyNavigationPlugin 이 이미
            // "/index.html" 을 붙여 보내므로 여기서도 같은 안전망을 둬야 404 가 새지 않는다.
            // 다른 자산(JS·CSS·이미지)까지 홈 셸로 바꾸면 안 되므로 index.html 에만 적용한다.
            if (path.endsWith("/index.html") && !assetExists(path)) return "/index.html";
            return path;
        }

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

    /**
     * 메모리 압박 대응(Google Play 메모리 품질 기준, 2027-02 집행).
     *
     * 화면이 가려진 뒤(UI_HIDDEN 이상)에만 WebView 의 RAM 리소스 캐시를 비운다 — 디스크 캐시는 남아
     * 복귀 시 네트워크 재요청은 없다. 보이는 중(RUNNING_*)에 비우면 재디코딩·깜빡임만 생긴다.
     * API 34 부터 살아 있는 레벨은 UI_HIDDEN(20)·BACKGROUND(40) 둘이고 나머지는 deprecated 라
     * 숫자 비교 하나로 충분하다.
     *
     * 🔴 쓰지 않는 것: WebView.onPause()/pauseTimers() 는 배경 음악·잠금화면 FGS 의 타이머를 멎게 하고,
     * setRendererPriorityPolicy(WAIVED) 는 렌더러가 죽으면 Capacitor 의 onRenderProcessGone 이 false 를
     * 돌려 프로세스가 통째로 죽는다. freeMemory() 는 deprecated(시스템 압박 시 자동 해제).
     *
     * 웹에는 "cd:app-memory-trim" 창 이벤트({level})를 보낸다. 현재 리스너는 없다 — 셸이 메모리 캐시를
     * 들고 있는 지점이 생기면 그때 붙인다.
     */
    @Override
    public void onTrimMemory(int level) {
        super.onTrimMemory(level);
        try {
            Bridge bridge = getBridge();
            if (bridge == null) return;
            if (level >= android.content.ComponentCallbacks2.TRIM_MEMORY_UI_HIDDEN && bridge.getWebView() != null) {
                bridge.getWebView().clearCache(false);
            }
            bridge.triggerWindowJSEvent("cd:app-memory-trim", "{\"level\":" + level + "}");
        } catch (Exception ignored) {
            // 브리지·WebView 소멸 직후 등. 메모리 정리는 최선 노력이고 예외를 밖으로 내지 않는다.
        }
    }

    @Override
    public void onLowMemory() {
        super.onLowMemory();
        onTrimMemory(android.content.ComponentCallbacks2.TRIM_MEMORY_COMPLETE);
    }
}
