package com.codedestiny.app;

import android.net.Uri;

import androidx.browser.customtabs.CustomTabsIntent;

import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * 앱이 웹으로 새는 것을 네이티브에서 최종 차단한다.
 *
 * 왜 필요한가:
 *   Capacitor 는 앱 출처(https://localhost)와 다른 호스트로의 네비게이션을 웹뷰에 로드하지 않고
 *   Intent.ACTION_VIEW 로 외부 Chrome 에 던진다(Bridge.launchIntent). 그 순간 사용자는 앱 밖
 *   웹사이트에 갇히고, 세션도 앱에 남지 않으며, 그 페이지엔 결제 가드가 없어 웹 가격과 외부 PG 가
 *   그대로 노출된다(Play 안티스티어링 위반 소지).
 *
 *   JS 쪽에도 방어가 있지만 원리적 한계가 있다 — 클릭 백스톱은 <a> 앵커만 가로챌 수 있고,
 *   window.location.href 대입 같은 프로그램적 이동은 잡지 못한다. 게다가 로그인 화면은 정적 export
 *   라 React 하이드레이션 전에는 앵커의 href 가 그대로 따라가진다.
 *
 *   Bridge 는 launchIntent 로 넘기기 **직전에** 각 플러그인의 shouldOverrideLoad 를 물어본다
 *   (Bridge.java:389-413). 그래서 여기가 마지막이자 확실한 차단 지점이다.
 *
 * 원칙: **http(s) 네비게이션에는 null 을 돌려주지 않는다.** null 은 "Capacitor 기본 동작(외부 Chrome)"
 *       을 뜻하므로, 하나라도 새면 앱을 벗어난다. 모든 경우를 여기서 결정한다.
 *
 * 주의: shouldOverrideUrlLoading 은 **최상위 네비게이션에만** 걸린다. fetch/XHR 은 통과하지 않으므로
 *       /api/* 호출은 이 훅의 영향을 받지 않는다.
 */
@CapacitorPlugin(name = "CodeDestinyNavigation")
public class CodeDestinyNavigationPlugin extends Plugin {

    private static final String OWN_HOST_SUFFIX = "code-destiny.com";
    // capacitor.config.ts 의 server.androidScheme=https + Capacitor 기본 hostname=localhost.
    private static final String APP_ORIGIN = "https://localhost";
    private static final String PROD_ORIGIN = "https://code-destiny.com";
    private static final String APP_OAUTH_REDIRECT = "com.codedestiny.app://auth";

    @Override
    public Boolean shouldOverrideLoad(Uri url) {
        if (url == null) return null;

        String scheme = url.getScheme();
        // 딥링크(com.codedestiny.app://auth)는 Android 가 intent-filter 로 우리 앱에 되돌려준다.
        // 여기서 가로채면 복귀가 깨지므로 손대지 않는다.
        if (scheme == null || !(scheme.equals("http") || scheme.equals("https"))) return null;

        String host = url.getHost();
        if (host == null) return null;
        host = host.toLowerCase();

        boolean isOwnHost = host.equals(OWN_HOST_SUFFIX) || host.endsWith("." + OWN_HOST_SUFFIX);
        if (!isOwnHost) {
            // 앱 출처(localhost)는 웹뷰가 스스로 처리하므로 여기까지 오지 않는다.
            // 그 외 진짜 외부 호스트(OAuth 공급자 포함)는 커스텀탭으로 연다 —
            // 외부 Chrome 으로 던져 앱을 벗어나는 일이 절대 없도록.
            return openCustomTab(url.toString());
        }

        String path = url.getPath();
        if (path == null || path.isEmpty()) path = "/";

        // 소셜 로그인 시작 URL. 여기로 '네비게이션' 이 온다는 것은 JS 브리지의 커스텀탭 경로를
        // 타지 못했다는 뜻이다(하이드레이션 전 앵커 클릭, window.location 대입 등).
        // 예전에는 여기서 return true 만 하고 아무것도 하지 않아 "눌러도 아무 일이 없는" 상태였다.
        // 이제는 앱 복귀용 파라미터를 붙여 커스텀탭으로 직접 연다.
        if (path.startsWith("/api/auth/oauth/")) {
            return openCustomTab(buildAppOAuthStartUrl(url));
        }

        // 그 외 API 경로는 화면이 아니다 — 열지 않고 무시한다.
        if (path.startsWith("/api/")) return true;

        StringBuilder target = new StringBuilder(path);
        if (url.getEncodedQuery() != null) target.append('?').append(url.getEncodedQuery());
        if (url.getEncodedFragment() != null) target.append('#').append(url.getEncodedFragment());

        // 앱 출처(capacitor.config 의 androidScheme=https + 기본 hostname=localhost)로 다시 연다.
        final String appUrl = APP_ORIGIN + target;
        getBridge().getWebView().post(() -> getBridge().getWebView().loadUrl(appUrl));
        return true;
    }

    /**
     * OAuth 시작 URL 에 앱 복귀 파라미터를 보강한다.
     * 워커(worker/routes/auth.js)가 appRedirect 를 state 에 실어 두었다가 콜백에서 앱으로 되돌린다.
     * 이 값이 없으면 웹 페이지로 리다이렉트되어 사용자가 브라우저 안에 갇힌다.
     */
    private String buildAppOAuthStartUrl(Uri url) {
        Uri.Builder builder = Uri.parse(PROD_ORIGIN + url.getPath()).buildUpon();
        boolean hasAppRedirect = false;
        try {
            for (String key : url.getQueryParameterNames()) {
                if (key == null || key.isEmpty()) continue;
                if (key.equals("runtimeTarget")) continue;
                if (key.equals("appRedirect")) hasAppRedirect = true;
                builder.appendQueryParameter(key, url.getQueryParameter(key));
            }
        } catch (UnsupportedOperationException e) {
            // opaque URI — 파라미터 없이 진행한다.
        }
        if (!hasAppRedirect) builder.appendQueryParameter("appRedirect", APP_OAUTH_REDIRECT);
        builder.appendQueryParameter("runtimeTarget", "mobile-app");
        return builder.build().toString();
    }

    private Boolean openCustomTab(String url) {
        // @capacitor/browser 플러그인 준비 시점에 의존하지 않도록 androidx.browser 를 직접 쓴다
        // (해당 의존성은 @capacitor/browser 가 이미 끌어온다).
        getBridge().getActivity().runOnUiThread(() -> {
            try {
                CustomTabsIntent intent = new CustomTabsIntent.Builder().setShowTitle(true).build();
                intent.launchUrl(getBridge().getActivity(), Uri.parse(url));
            } catch (Exception e) {
                // 커스텀탭을 지원하는 브라우저가 없는 기기. 이 경우에만 시스템에 맡긴다.
                try {
                    getBridge().getActivity().startActivity(
                            new android.content.Intent(android.content.Intent.ACTION_VIEW, Uri.parse(url)));
                } catch (Exception ignored) {
                    // 열 수 있는 브라우저가 전혀 없다 — 앱에 그대로 머무른다.
                }
            }
        });
        return true;
    }
}
