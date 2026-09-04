/**
 * 앱 전용 네이티브 브릿지 — Android 빌드에만 주입된다(scripts/build-mobile-app.mjs).
 * 웹 번들에는 절대 포함되지 않는다.
 *
 * 왜 바닐라인가:
 *   원래 이 로직은 React 컴포넌트(app/app/MobileAppRuntimeBridge.tsx)에 있었고, 그래서
 *   /app 레이아웃이 마운트된 화면에서만 window.CodeDestinyNative 가 생겼다. 앱의 메인 UI 는
 *   클래식 웹 셸(index.html 계열)이라 거기서는 브릿지가 없어 app-payment-guard.js 가
 *   NATIVE_BILLING_UNAVAILABLE 로 즉시 죽었다 — 즉 셸의 모든 결제가 불가능했다.
 *   가드와 같은 방식으로 모든 HTML <head> 에 주입해 어느 화면에서든 살아 있게 한다.
 *
 * 구현은 하나만 둔다. React 쪽은 "이미 있으면 재정의하지 않음"으로 이 구현을 재사용한다.
 *
 * 담당:
 *   1) window.CodeDestinyNative (구매/복원/소비/상품조회/소셜로그인)
 *   2) appUrlOpen 딥링크 → /api/auth/oauth/complete 토큰 교환 → 커스텀탭 닫기
 *   3) 미완료(고아) 구매 복구 — 부팅 + 포그라운드 복귀마다
 *   4) 안드로이드 하드웨어 백버튼 — 뒤로가기, 루트에서 2초 내 두 번 누르면 종료
 */
(function () {
  "use strict";
  if (window.__cdAppNativeBridgeInstalled) return;
  window.__cdAppNativeBridgeInstalled = true;

  window.__CODE_DESTINY_RUNTIME_TARGET = "mobile-app";
  try {
    document.documentElement.dataset.runtimeTarget = "mobile-app";
  } catch (e) { /* noop */ }

  // ── 앱 /api/* 리타게팅 (2026-08-29) ─────────────────────────────────────────────
  // 앱 번들은 https://localhost 출처에서 서빙되고 그 출처엔 서버가 없다(scripts/build-mobile-app.mjs).
  // 상대 경로 '/api/*' 를 그대로 두면 죽은 출처로 나가 인증·이용권·결제 확인이 통째로 실패한다.
  //
  // 🔴 고칠 지점은 호출부가 아니라 여기다. 호출부 31곳은 전부 웹과 공유하는 파일이라
  //    거기서 고치면 웹 동작까지 바뀐다. 이 브릿지는 앱 HTML 에만 주입되므로 웹 blast radius 가 0이다.
  //
  // 🔴 중첩 아님 — 셸(index.html)의 인라인 런타임에 같은 리타게팅이 있지만 이건 그 **안쪽** 층이다.
  //    가드 태그가 <meta charset> 바로 뒤에 들어가므로(build-mobile-app.mjs injectGuardTag)
  //    이 래퍼가 먼저 설치되고 셸의 fetchWithCache 가 그 위를 감싼다. 셸이 이미 절대 URL 로 바꿔
  //    넘기면 여기서는 교차 출처라 손대지 않고 통과한다(멱등). 셸 쪽을 지우지 않는 이유는 그 코드가
  //    앱 전용이 아니라 웹 스테이징(workers.dev 출처)에서도 살아 있는 경로이기 때문이다.
  //
  // 판정: 기기에서 fetch('/api/version') 이 셸 HTML 200 이 아니라 워커 JSON 을 준다.
  (function installAppApiRetarget() {
    if (window.__cdAppApiRetargetInstalled) return;
    if (typeof window.fetch !== "function" || typeof Headers !== "function") return;
    window.__cdAppApiRetargetInstalled = true;

    var passthroughFetch = window.fetch.bind(window);

    function readStoredToken(key) {
      try {
        return String(window.localStorage.getItem(key) || "").trim();
      } catch (e) { return ""; }
    }

    // exp 를 못 읽으면 "곧 만료"로 본다 — 그래야 리프레시 폴백이 열린다. 최종 판정은 서버가 한다.
    function accessTokenIsExpiring(token) {
      try {
        var payload = String(token).split(".")[1];
        if (!payload) return true;
        var b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
        while (b64.length % 4) b64 += "=";
        var exp = Number(JSON.parse(atob(b64)).exp);
        if (!isFinite(exp) || exp <= 0) return true;
        return (exp * 1000) - Date.now() <= 60000;
      } catch (e) { return true; }
    }

    // 호출 시점에 읽는다 — 셸의 rememberSuccessfulApiBase 가 부팅 뒤 이 값을 갈아치운다.
    function retargetBase() {
      try {
        var base = String(window.CODE_DESTINY_API_BASE_URL || "").replace(/\/+$/, "");
        if (!base || base === window.location.origin) return "";
        return base;
      } catch (e) { return ""; }
    }

    window.fetch = function (input, init) {
      var base = retargetBase();
      // Request 객체는 본문이 스트림이라 URL 만 바꿔 옮길 수 없다 — 손대지 않고 통과시킨다.
      if (!base || (typeof Request !== "undefined" && input instanceof Request)) {
        return passthroughFetch(input, init);
      }
      var url;
      try {
        url = new URL(String(input == null ? "" : input), window.location.href);
      } catch (e) { return passthroughFetch(input, init); }
      if (url.origin !== window.location.origin || url.pathname.indexOf("/api/") !== 0) {
        return passthroughFetch(input, init);
      }
      var nextInit = (init && typeof init === "object") ? Object.assign({}, init) : {};
      var headers = new Headers();
      try {
        if (init && init.headers) {
          new Headers(init.headers).forEach(function (value, key) { headers.set(key, value); });
        }
      } catch (e) { /* noop */ }
      // 워커의 교차 출처 가드는 이 헤더를 든 앱 요청만 면제한다(worker/lib/auth.js isMobileAppAuthRequest).
      if (!headers.has("X-Code-Destiny-Runtime")) headers.set("X-Code-Destiny-Runtime", "mobile-app");
      // 🔴 여기서 토큰을 싣지 않으면 앱의 **어떤** 요청도 인증되지 않는다. 출처가 https://localhost 라
      //    SameSite=Lax 인 access 쿠키가 교차 사이트로 나가지 않는데, 셸의 호출부는 Authorization 을
      //    붙이지 않는다(index.html 전체에서 Bearer 를 직접 다는 곳은 구독 조회와 /api/auth/refresh
      //    둘뿐이다). 2026-08-29 기기 트레이스가 그 결과다: 소셜 로그인 교환이 두 번 성공(deepLink:
      //    exchangeOk)했는데도 부팅 프로브 __cdProbeGuestSession 의 /api/auth/me 가 401 을 받아
      //    __cdForceSignOut('auth-me-probe') 이 저장된 토큰 3종을 전부 지웠고, localStorage 에는
      //    cd_app_trace_v1 만 남아 있었다.
      //    🔴 고칠 지점이 호출부가 아니라 여기인 이유는 이 파일 위쪽 리타게팅 주석과 같다 —
      //    호출부는 웹과 공유하는 파일이고, 이 브릿지는 앱 HTML 에만 주입돼 웹 blast radius 가 0이다.
      //    이미 Authorization 을 단 호출(구독 조회·리프레시)은 그대로 존중한다.
      if (!headers.has("Authorization")) {
        var accessToken = readStoredToken("fortune_auth_token");
        if (accessToken) headers.set("Authorization", "Bearer " + accessToken);
        // access 만료 뒤에도 세션이 살아 있게 한다. 웹은 refresh **쿠키**로 워커의 리프레시 폴백
        // (worker/lib/auth.js verifyRefreshSessionToAuth)을 타는데 앱엔 그 쿠키가 없어 액세스 TTL
        // (기본 30분)마다 로그아웃됐다. 상시 싣지 않고 부재·만료 임박일 때만 싣는다.
        if (!accessToken || accessTokenIsExpiring(accessToken)) {
          var refreshToken = readStoredToken("fortune_auth_refresh_token");
          if (refreshToken && !headers.has("X-Code-Destiny-Refresh-Token")) {
            headers.set("X-Code-Destiny-Refresh-Token", refreshToken);
          }
        }
      }
      nextInit.headers = headers;
      // 앱은 SameSite=Lax 쿠키를 못 싣지만 워커가 Allow-Credentials 를 주므로 자격증명 경로는 열어 둔다.
      if (!nextInit.credentials) nextInit.credentials = "include";
      return passthroughFetch(base + url.pathname + url.search, nextInit);
    };
  })();

  // Google 번역 위젯을 앱에서는 띄우지 않는다.
  // //translate.google.com 스크립트를 물어 와 앱 안에서 예측 불가한 이동을 만들고,
  // 번역 오버레이가 결제 문구까지 갈아치울 수 있다. 로더에 이미 억제 훅이 있어 그것만 켠다
  // (js/cd-google-translate-lazy.js 의 shouldSkipGoogleTranslate).
  window.__cdGoogleTranslateSuppressed = true;

  // 웹 전용 크롬 숨김 — 언어 선택기와 구글 번역 위젯만.
  //
  // 연이/네오 토글은 숨기지 않는다. 한동안 앱에서 들어냈는데, 셸의 마지막 테마 적용
  // (js/share.js 의 window.load 핸들러)이 #themeCheckbox 존재 여부로 감싸여 있어서
  // 토글이 없으면 <html>·<body> 테마 상태가 어긋난 채 남는다("반쪽 오버라이드").
  // 그게 로딩 중 다크→연이 번쩍임과 흰 화면의 원인이었다.
  try {
    var appChromeStyle = document.createElement("style");
    appChromeStyle.id = "cdAppChromeStyle";
    appChromeStyle.textContent = [
      'html[data-runtime-target="mobile-app"] .lang-toggle-wrap,',
      'html[data-runtime-target="mobile-app"] #google_translate_element{display:none!important}',
      // 상태바 아래로 밀어 넣기.
      //
      // MainActivity 가 edge-to-edge(setDecorFitsSystemWindows(false))로 그리므로 웹뷰가 상태바
      // 아래까지 차지한다. 셸의 body 규칙은 left/right/bottom 만 env() 로 잡고 top 이 빠져 있어
      // 상단 앱바(연이/네오 토글이 있는 줄)가 상태바·노치에 가린다.
      // 웹은 그대로 두고 앱에서만 top 을 채운다 — 셸 규칙(0,0,1)보다 특이도가 높아 확실히 이긴다.
      'html[data-runtime-target="mobile-app"] body{padding-top:env(safe-area-inset-top,0px)}',

      // 길게 눌러 "이미지 저장/링크 열기" 메뉴가 뜨면 앱 같지 않다. 텍스트 선택은 건드리지
      // 않는다 — 사용자가 운세 결과를 복사해 저장하는 경로라 user-select 로 막으면 안 된다.
      'html[data-runtime-target="mobile-app"]{-webkit-touch-callout:none}',
      'html[data-runtime-target="mobile-app"] img{-webkit-user-drag:none;user-drag:none}',

      // 하단 네비(#cdMobileBottomNav, 고정 56px+inset)에 마지막 줄이 가리는 것을 막는다.
      // 셸은 #inputPage 에만 여백을 줬는데 네비는 결과 화면에서도 떠 있다.
      'html[data-runtime-target="mobile-app"] #resultPage{padding-bottom:calc(136px + env(safe-area-inset-bottom,0px))}',
      // sticky CTA 는 제스처바 위로 올린다(셸 규칙에 inset 이 빠져 있다).
      'html[data-runtime-target="mobile-app"] .tile-pvw-cta-sticky{padding-bottom:calc(20px + env(safe-area-inset-bottom,0px))}',
      // 라벨이 길면(en/ja) 잘리기만 하고 끝나므로 말줄임을 준다.
      'html[data-runtime-target="mobile-app"] .cd-mobile-bottom-nav__item{text-overflow:ellipsis}',

      // 화면 전환 — 이 사이트는 다중 페이지 정적 export 라 문서 간 이동이 풀 페이지 로드다.
      // JS 로 슬라이드를 넣을 수 없으므로 크로스도큐먼트 View Transition 으로 흰 화면 깜빡임만
      // 없앤다. 미지원 웹뷰는 이 규칙을 통째로 무시하고 지금과 똑같이 동작한다(점진적 향상).
      // 이 스타일은 앱 번들 HTML 에만 주입되므로 @view-transition 이 문서 전역이어도 웹은 무관하다.
      "@view-transition{navigation:auto}",
      "::view-transition-old(root),::view-transition-new(root){animation-duration:240ms;animation-timing-function:cubic-bezier(.2,0,0,1)}",
      "@media (prefers-reduced-motion:reduce){@view-transition{navigation:none}}",
    ].join("");
    (document.head || document.documentElement).appendChild(appChromeStyle);
  } catch (e) { /* noop */ }

  // R2: 설치 후 첫 실행 시 "잠금화면 운세" 동의 화면을 1회 노출한다.
  // 네이티브 KEY_ENABLED는 기본 false이고, 오버레이 권한은 OS상 시스템 설정 이동이 필수라
  // 사용자 동의 없이는 잠금화면이 켜지지 않는다. 동의하면 권한요청+활성+알림예약을 한 번에 처리한다.
  var LOCK_CONSENT_FLAG = "cd_lockscreen_consent_v1";
  function cdLockPlugin() {
    try {
      var cap = window.Capacitor;
      var p = cap && cap.Plugins && cap.Plugins.CodeDestinyLockScreen;
      return p || null;
    } catch (e) { return null; }
  }
  function acceptLockScreenConsent(overlay) {
    try {
      var p = cdLockPlugin();
      if (p) {
        // 순서가 안전 조건이다: 오버레이 권한 설정 화면으로 나가면 앱이 백그라운드가 되는데,
        // Android 12+ 는 백그라운드에서 포그라운드 서비스 시작을 금지한다. 설정 이동 전,
        // 앱이 아직 포그라운드인 지금 setEnabled(서비스 시작)를 끝내야 한다 — 반대 순서는
        // startForeground 가 거부돼 몇 초 뒤 프로세스가 강제 종료됐다(동의 직후 앱 튕김).
        var enablePromise = null;
        if (p.setEnabled) { try { enablePromise = p.setEnabled({ enabled: true }); } catch (e) {} }
        if (p.scheduleAlarms) {
          try {
            p.scheduleAlarms({ value: JSON.stringify({ enabled: true, alarms: [
              { on: true, time: "09:00", label: "오늘의 꽃" },
              { on: true, time: "15:00", label: "감정상담소" },
            ] }) });
          } catch (e) {}
        }
        var openOverlaySettings = function () {
          if (p.requestOverlayPermission) { try { p.requestOverlayPermission(); } catch (e) {} }
        };
        // setEnabled 는 Android 13+ 알림 권한 다이얼로그가 닫혀야 resolve 된다. 그 뒤에
        // 설정으로 이동해야 다이얼로그가 설정 화면에 깔려 묻히지 않는다. 실패해도 이동은 한다.
        if (enablePromise && typeof enablePromise.then === "function") {
          enablePromise.then(openOverlaySettings, openOverlaySettings);
        } else {
          openOverlaySettings();
        }
      }
    } catch (e) { /* noop */ }
    try { window.localStorage.setItem(LOCK_CONSENT_FLAG, "1"); } catch (e) {}
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }
  function declineLockScreenConsent(overlay) {
    try { window.localStorage.setItem(LOCK_CONSENT_FLAG, "1"); } catch (e) {}
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }
  function showLockScreenConsentOnce() {
    try {
      if (window.localStorage.getItem(LOCK_CONSENT_FLAG) === "1") return;
      if (!cdLockPlugin()) return; // 네이티브 플러그인 없으면(비앱) 노출 안 함
      if (!document.getElementById("inputPage")) return; // 홈에서만
      if (document.getElementById("cdLockConsent")) return;
      var ov = document.createElement("div");
      ov.id = "cdLockConsent";
      ov.style.cssText = [
        "position:fixed", "inset:0", "z-index:2147483200",
        "display:flex", "align-items:center", "justify-content:center", "padding:24px",
        "background:rgba(6,6,18,.72)", "backdrop-filter:blur(6px)", "-webkit-backdrop-filter:blur(6px)",
      ].join(";");
      var card = document.createElement("div");
      card.style.cssText = [
        "width:100%", "max-width:22rem", "border-radius:24px", "padding:26px 22px 22px",
        "background:radial-gradient(circle at 78% 8%,rgba(196,181,253,.28),transparent 42%),linear-gradient(160deg,#13102a,#1b1745 60%,#2f0a4f)",
        "border:1px solid rgba(196,181,253,.32)", "box-shadow:0 30px 80px -30px rgba(0,0,0,.7)",
        "color:#fff", "text-align:center",
      ].join(";");
      card.innerHTML =
        '<div style="font-size:2.4rem;line-height:1">🌙</div>'
        + '<h2 style="margin:12px 0 8px;font-size:1.25rem;font-weight:900">잠금화면 운세를 켤까요?</h2>'
        + '<p style="margin:0;font-size:.9rem;line-height:1.6;color:rgba(255,255,255,.82)">폰 화면을 켤 때마다 잠금화면 위에 오늘의 운세·긍정 확언·꽃말을 살며시 보여드려요. 오른쪽으로 밀면 바로 잠금이 풀립니다.</p>'
        + '<p style="margin:10px 0 0;font-size:.76rem;line-height:1.55;color:rgba(196,181,253,.9)">켜려면 <b>‘다른 앱 위에 표시’</b> 권한이 필요해요. 허용을 누르면 설정 화면으로 안내해 드립니다. (언제든 설정에서 끌 수 있어요.)</p>'
        + '<button id="cdLockConsentYes" type="button" style="margin-top:18px;width:100%;padding:14px;border:none;border-radius:16px;font-weight:900;font-size:1rem;color:#1a1230;background:linear-gradient(135deg,#f6e4ad,#e8c977);box-shadow:0 12px 30px -12px rgba(232,201,119,.7);cursor:pointer">허용하고 켜기</button>'
        + '<button id="cdLockConsentNo" type="button" style="margin-top:10px;width:100%;padding:12px;border:1px solid rgba(255,255,255,.2);border-radius:14px;font-weight:700;font-size:.9rem;color:rgba(255,255,255,.82);background:rgba(255,255,255,.06);cursor:pointer">나중에 할게요</button>';
      ov.appendChild(card);
      document.body.appendChild(ov);
      var yes = document.getElementById("cdLockConsentYes");
      var no = document.getElementById("cdLockConsentNo");
      if (yes) yes.addEventListener("click", function () { acceptLockScreenConsent(ov); });
      if (no) no.addEventListener("click", function () { declineLockScreenConsent(ov); });
    } catch (e) { /* noop */ }
  }
  function scheduleLockScreenConsent() {
    // 로그인/부트 오버레이와 겹치지 않도록 홈 안정화 후 노출한다.
    window.setTimeout(showLockScreenConsentOnce, 2800);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleLockScreenConsent);
  } else {
    scheduleLockScreenConsent();
  }

  var PURCHASE_STATE_PENDING = 2;

  // --- 0) 진단 추적 ---------------------------------------------------------
  //
  // 로그인 이탈을 세 번 고쳤는데 세 번 다 실패했다. 원인은 매번 "코드에 있다"까지만 확인하고
  // "실제로 실행됐다"를 확인하지 못한 것이었다. adb 없이도 증거가 남도록 각 단계를 기록한다.
  // 홈 하단 버전 표기를 5회 탭하면 오버레이로 볼 수 있다(installDiagnosticsGesture).
  var TRACE_KEY = "cd_app_trace_v1";
  var TRACE_MAX = 40;

  function trace(step, detail) {
    var entry = { at: new Date().toISOString(), step: String(step), detail: detail || null };
    try {
      var list = JSON.parse(localStorage.getItem(TRACE_KEY) || "[]");
      if (!Array.isArray(list)) list = [];
      list.push(entry);
      while (list.length > TRACE_MAX) list.shift();
      localStorage.setItem(TRACE_KEY, JSON.stringify(list));
    } catch (e) { /* noop */ }
    try { console.info("[CD-APP]", entry.step, entry.detail || ""); } catch (e) { /* noop */ }
  }

  function readTrace() {
    try {
      var list = JSON.parse(localStorage.getItem(TRACE_KEY) || "[]");
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  // 테마를 뒤집는 범인 추적.
  //
  // 셸의 테마는 네 곳에서 각각 정해진다(조기 hoist / pwa-theme-init / index.html 끝의 applyTheme /
  // 지연 로드되는 share.js 의 window.load 핸들러). 로딩 중 다크→연이로 뒤집히는 증상이 남으면
  // 어느 쪽이 범인인지 눈으로는 못 가린다. classList 조작을 감싸 호출 스택을 남긴다.
  function installThemeMutationProbe() {
    try {
      var seen = 0;
      ["add", "remove"].forEach(function (method) {
        var original = DOMTokenList.prototype[method];
        DOMTokenList.prototype[method] = function () {
          var hitsTheme = Array.prototype.indexOf.call(arguments, "neo-mode") !== -1;
          if (hitsTheme && seen < 12) {
            seen += 1;
            var owner = "?";
            try { owner = (this === document.documentElement.classList) ? "html" : (document.body && this === document.body.classList ? "body" : "other"); } catch (e) { /* noop */ }
            var where = "";
            try { where = String(new Error().stack || "").split("\n").slice(1, 4).join(" | "); } catch (e) { /* noop */ }
            trace("theme:" + method, { on: owner, at: Math.round(performance.now()), stack: where.slice(0, 300) });
          }
          return original.apply(this, arguments);
        };
      });
    } catch (e) { /* noop */ }
  }

  // 로그인 진행 화면.
  //
  // 웹은 /login 의 StarlightLoginPortal 이 "우주의 좌표를 동기화하는 중..." 을 띄운 채 이동한다.
  // 앱은 커스텀탭이 뜨는 순간과 딥링크로 돌아와 토큰을 교환하는 구간에 **아무 화면도 없어서**
  // 멈춘 것처럼 보였다. 브릿지는 어느 페이지에나 주입되므로 여기에 같은 문구의 오버레이를 둔다.
  var AUTH_PROGRESS_ID = "cdAppAuthProgress";

  function showAuthProgress(message) {
    try {
      var existing = document.getElementById(AUTH_PROGRESS_ID);
      if (existing) {
        // 겹쳐 만들지 않되 문구는 갱신한다. 예전에는 여기서 그냥 돌아갔기 때문에 딥링크 복귀 직후의
        // "로그인 정보를 확인하는 중이에요..." 가 화면에 한 번도 나타나지 못했다(커스텀탭을 열 때
        // 이미 오버레이가 떠 있으므로 항상 이 분기였다).
        if (message) {
          var currentLabel = existing.querySelector("[data-cd-auth-progress-label]");
          if (currentLabel) currentLabel.textContent = String(message);
        }
        return;
      }
      var host = document.body || document.documentElement;
      if (!host) return;
      var overlay = document.createElement("div");
      overlay.id = AUTH_PROGRESS_ID;
      overlay.setAttribute("role", "status");
      overlay.setAttribute("aria-live", "polite");
      overlay.style.cssText = [
        "position:fixed", "inset:0", "z-index:2147483000",
        "display:flex", "flex-direction:column", "align-items:center", "justify-content:center", "gap:18px",
        "padding:24px", "text-align:center",
        // 로그인 화면(별빛 포털)과 같은 밤하늘 톤 — 웹과 앱의 인상을 맞춘다.
        "background:radial-gradient(circle at 50% 30%,#1b1745 0%,#0b1225 55%,#07091a 100%)",
        "color:#ede9fe", "font-size:14px", "font-weight:700", "line-height:1.7",
        "-webkit-backdrop-filter:blur(2px)", "backdrop-filter:blur(2px)",
      ].join(";");

      var ring = document.createElement("div");
      ring.style.cssText = [
        "width:54px", "height:54px", "border-radius:50%",
        "border:3px solid rgba(237,233,254,.22)", "border-top-color:#f4bed1",
        "animation:cdAppAuthSpin .9s linear infinite",
      ].join(";");

      var label = document.createElement("div");
      label.setAttribute("data-cd-auth-progress-label", "");
      label.textContent = String(message || "우주의 좌표를 동기화하는 중... 잠시만 기다려 주세요.");
      label.style.cssText = "max-width:22rem";

      if (!document.getElementById("cdAppAuthProgressKeyframes")) {
        var style = document.createElement("style");
        style.id = "cdAppAuthProgressKeyframes";
        style.textContent = "@keyframes cdAppAuthSpin{to{transform:rotate(360deg)}}"
          + "@media (prefers-reduced-motion: reduce){#" + AUTH_PROGRESS_ID + " div{animation:none!important}}";
        (document.head || document.documentElement).appendChild(style);
      }

      overlay.appendChild(ring);
      overlay.appendChild(label);
      host.appendChild(overlay);
    } catch (e) { /* noop */ }
  }

  function hideAuthProgress() {
    try {
      var node = document.getElementById(AUTH_PROGRESS_ID);
      if (node) node.remove();
    } catch (e) { /* noop */ }
  }

  // 인증이 성공 없이 끝났음을 화면 쪽에 알린다.
  //
  // 오버레이를 걷는 것만으로는 부족하다 — React 로그인 화면(AuthShell)은 소셜 버튼을
  // "인증 화면으로 이동 중…" 상태로 잠가 두는데, 커스텀탭을 그냥 닫고 돌아오면 그 잠금을 풀 계기가
  // 없어 버튼 3개가 영구히 굳는다. 🔴 화면 쪽에 visibilitychange 리스너를 새로 달지 말 것 —
  // 취소 판정은 openAuthStartedAt 을 가진 이 파일에만 있고, 여기서 한 번만 쏜다.
  function notifyAuthCancelled(reason) {
    try {
      window.dispatchEvent(new CustomEvent("cd:auth-cancelled", {
        detail: { reason: String(reason || "cancelled"), at: Date.now() },
      }));
    } catch (e) { /* noop */ }
  }

  // 서버가 딥링크로 넘긴 social_error 를 사람이 읽을 수 있는 문장으로 바꾼다.
  // 정본은 worker/routes/auth.js 의 실패 사유 문자열이고, 모르는 값은 원문을 그대로 보여 준다
  // (조용히 "알 수 없는 오류"로 뭉개면 다음 세션이 사유를 잃는다).
  function describeSocialError(reason) {
    var code = String(reason || "").trim();
    if (/underage/i.test(code)) return "만 14세 미만은 가입할 수 없어요.";
    if (/guardian/i.test(code)) return "법정대리인 동의가 필요해요. 웹에서 이어서 진행해 주세요.";
    if (/database|temporarily unavailable|timeout/i.test(code)) return "서버가 잠시 불안정해요. 잠시 후 다시 시도해 주세요.";
    if (/duplicate|already/i.test(code)) return "이미 처리된 로그인이에요. 다시 시도해 주세요.";
    return "로그인에 실패했습니다: " + code.slice(0, 80);
  }

  // 사용자에게 보이는 짧은 안내. 로그인 실패가 조용히 삼켜지지 않게 한다.
  function toast(message) {
    try {
      var existing = document.getElementById("cdAppToast");
      if (existing) existing.remove();
      var node = document.createElement("div");
      node.id = "cdAppToast";
      node.setAttribute("role", "status");
      node.textContent = String(message || "");
      node.style.cssText = [
        "position:fixed", "left:50%", "transform:translateX(-50%)",
        "top:calc(16px + env(safe-area-inset-top,0px))",
        "z-index:2147483001", "max-width:86vw", "padding:12px 18px", "border-radius:16px",
        "background:#3c1830", "color:#fffaf7", "font-size:13px", "font-weight:700",
        "line-height:1.5", "text-align:center",
        "box-shadow:0 12px 24px rgba(150,72,104,.18)",
      ].join(";");
      (document.body || document.documentElement).appendChild(node);
      window.setTimeout(function () { node.remove(); }, 4200);
    } catch (e) { /* noop */ }
  }

  function apiBase() {
    return String(window.CODE_DESTINY_API_BASE_URL || "").replace(/\/+$/, "");
  }

  // 플러그인은 호출 시점에 읽는다 — Capacitor 런타임 주입이 이 스크립트보다 늦을 수 있다.
  function plugins() {
    return (window.Capacitor && window.Capacitor.Plugins) || null;
  }
  function billingPlugin() {
    var p = plugins();
    return (p && p.CodeDestinyBilling) || null;
  }
  function credentialsPlugin() {
    var p = plugins();
    return (p && p.CodeDestinyCredentials) || null;
  }
  function appPlugin() {
    var p = plugins();
    return (p && p.App) || null;
  }
  function browserPlugin() {
    var p = plugins();
    return (p && p.Browser) || null;
  }

  function unavailable(message, extra) {
    var result = { ok: false, code: "NATIVE_BILLING_UNAVAILABLE", message: message };
    if (extra) Object.assign(result, extra);
    return result;
  }

  function authHeaders() {
    var headers = { "Content-Type": "application/json" };
    try {
      var token = localStorage.getItem("fortune_auth_token");
      if (token) headers.Authorization = "Bearer " + token;
    } catch (e) { /* noop */ }
    // 앱은 https://localhost 출처라 워커 CSRF 가드가 cross-site 로 본다. 이 헤더가 있어야 통과한다.
    headers["X-Code-Destiny-Runtime"] = "mobile-app";
    return headers;
  }

  async function postJson(path, body, options) {
    var opts = options || {};
    var init = {
      method: "POST",
      headers: authHeaders(),
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify(body || {}),
    };
    // 🔴 상한은 호출부가 정한다 — 기본은 종전대로 무제한이다.
    //
    // 이 함수는 구매 복구(runPurchaseRecovery)도 쓰는데, 거기서 조기에 끊으면 "돈은 나갔는데
    // 콘텐츠가 없는" 상태를 되살릴 유일한 경로가 느린 망에서 죽는다. 그래서 여기에 일괄 타임아웃을
    // 두지 않고, 사용자가 진행 화면을 보며 기다리는 로그인 교환에만 상한을 건다.
    // (이 경로 안팎에 다른 타임아웃·재시도는 없다 — 브릿지의 fetch 재타게팅도 셸의
    // index-inline-runtime.js 래퍼도 signal 을 걸지 않는다. 2026-08-30 확인.)
    if (opts.timeoutMs > 0 && typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
      init.signal = AbortSignal.timeout(opts.timeoutMs);
    }
    var response = await fetch(apiBase() + path, init);
    var payload = await response.json().catch(function () { return {}; });
    return { ok: response.ok && payload && payload.ok !== false, status: response.status, payload: payload };
  }

  // --- 1) window.CodeDestinyNative ----------------------------------------
  function buildOAuthStartUrl(input) {
    var opts = input || {};
    var provider = String(opts.provider || "").trim().toLowerCase();
    var url = new URL(apiBase() + "/api/auth/oauth/" + provider + "/start", window.location.href);
    url.searchParams.set("runtimeTarget", "mobile-app");
    url.searchParams.set("appRedirect", "com.codedestiny.app://auth");
    url.searchParams.set("next", opts.nextPath || "/");
    // 로그인/회원가입 구분. 워커가 flow 를 읽어 신규 가입 처리와 리퍼럴 지급을 나눈다.
    url.searchParams.set("flow", String(opts.flow || "login"));
    // 리퍼럴(referralCode/referralShareToken/referralSource) 등 화면이 실어 보내는 값.
    // 빠뜨리면 카카오 추천 가입 보상이 지급되지 않는다.
    var extra = opts.extraParams || null;
    if (extra) {
      Object.keys(extra).forEach(function (key) {
        var value = String(extra[key] == null ? "" : extra[key]).trim();
        if (value) url.searchParams.set(key, value);
      });
    }
    return url.toString();
  }

  // 커스텀탭이 뜨는 데 시간이 걸려 사용자가 두 번 누르는 일이 잦다. 중복 실행 방지용.
  var openAuthStartedAt = 0;

  var nativeApi = {
    async purchase(input) {
      var plugin = billingPlugin();
      if (!plugin || !plugin.purchase) return unavailable("Native billing is not available yet.");
      return plugin.purchase(input);
    },
    async restore(input) {
      var plugin = billingPlugin();
      if (!plugin || !plugin.restore) return unavailable("Native billing restore is not available yet.", { purchases: [] });
      return plugin.restore(input || { productType: "all" });
    },
    async consume(input) {
      var plugin = billingPlugin();
      if (!plugin || !plugin.consume) return unavailable("Native billing consume is not available yet.");
      return plugin.consume(input);
    },
    async queryProducts(input) {
      var plugin = billingPlugin();
      if (!plugin || !plugin.queryProducts) return unavailable("Native billing product query is not available yet.", { products: [] });
      return plugin.queryProducts(input);
    },
    /**
     * Zero-Tap Sign-In(Restore Credentials) 뼈대 — 네이티브 CodeDestinyCredentialsPlugin 을 그대로 감싼다.
     * requestJson/responseJson 은 WebAuthn 규격 문자열이고 발급·검증은 서버(후속 PR)가 한다.
     * 🔴 이 PR 에는 호출부가 없다 — 로그인 성공 뒤 create, 첫 실행 restore, 로그아웃 clear 는
     * 서버 challenge/assert 엔드포인트와 함께 붙인다. 설계: docs/app-audit/ZERO_TAP_SIGNIN_DESIGN.md
     */
    credentials: {
      async isAvailable() {
        var plugin = credentialsPlugin();
        if (!plugin || !plugin.isAvailable) return { ok: true, available: false, code: "NATIVE_CREDENTIALS_UNAVAILABLE" };
        return plugin.isAvailable();
      },
      async create(input) {
        var plugin = credentialsPlugin();
        if (!plugin || !plugin.create) return { ok: false, code: "NATIVE_CREDENTIALS_UNAVAILABLE" };
        return plugin.create({ requestJson: String((input && input.requestJson) || "") });
      },
      async restore(input) {
        var plugin = credentialsPlugin();
        if (!plugin || !plugin.restore) return { ok: false, code: "NATIVE_CREDENTIALS_UNAVAILABLE" };
        return plugin.restore({ requestJson: String((input && input.requestJson) || "") });
      },
      async clear() {
        var plugin = credentialsPlugin();
        if (!plugin || !plugin.clear) return { ok: false, code: "NATIVE_CREDENTIALS_UNAVAILABLE" };
        return plugin.clear();
      },
    },
    /**
     * 소셜 로그인. 반드시 커스텀탭으로 연다 —
     * Google 은 임베디드 WebView 의 OAuth 를 disallowed_useragent 로 차단하고,
     * window.location 으로 프로덕션 URL 을 열면 Capacitor 가 외부 Chrome 으로 던져
     * 사용자가 앱 밖 웹사이트에 갇힌다(딥링크로 돌아오지 못한다).
     */
    async openAuth(input) {
      var provider = String((input && input.provider) || "").trim().toLowerCase();
      if (["google", "naver", "kakao"].indexOf(provider) === -1) {
        trace("openAuth:unsupported", { provider: provider });
        return { ok: false, code: "OAUTH_PROVIDER_UNSUPPORTED", message: "Unsupported provider." };
      }
      // 앵커 캡처 핸들러와 React onClick 이 겹칠 때 탭이 두 번 뜨지 않게 한다.
      var now = Date.now();
      if (now - openAuthStartedAt < 3000) {
        trace("openAuth:deduped", { provider: provider });
        return { ok: true, provider: provider, deduped: true };
      }
      openAuthStartedAt = now;

      var startUrl = buildOAuthStartUrl({
        provider: provider,
        nextPath: (input && input.nextPath) || "/",
        flow: (input && input.flow) || "login",
        extraParams: (input && input.extraParams) || null,
      });
      var browser = browserPlugin();
      if (!browser || !browser.open) {
        openAuthStartedAt = 0;
        trace("openAuth:noBrowserPlugin", { hasCapacitor: !!window.Capacitor, plugins: Object.keys(plugins() || {}) });
        toast("앱 로그인 창을 열지 못했습니다. 앱을 다시 시작해 주세요.");
        return { ok: false, code: "NATIVE_BROWSER_UNAVAILABLE", message: "앱 로그인 창을 열지 못했습니다. 앱을 다시 시작해 주세요." };
      }
      trace("openAuth:open", { provider: provider, url: startUrl });
      // 커스텀탭이 뜨기 전과, 사용자가 탭을 닫고 돌아왔을 때 모두 이 화면이 깔려 있어야
      // 웹처럼 "진행 중"으로 보인다. 성공 시에는 nextPath 이동이 이 화면을 대체한다.
      showAuthProgress();
      try {
        await browser.open({ url: startUrl });
      } catch (e) {
        openAuthStartedAt = 0;
        hideAuthProgress();
        trace("openAuth:openFailed", { provider: provider, message: String(e && e.message || e) });
        toast("앱 로그인 창을 열지 못했습니다.");
        return { ok: false, code: "NATIVE_BROWSER_OPEN_FAILED", message: "앱 로그인 창을 열지 못했습니다." };
      }
      return { ok: true, provider: provider };
    },
  };

  window.CodeDestinyNative = Object.assign({}, window.CodeDestinyNative, nativeApi);

  // --- 2) 딥링크 → 토큰 교환 ----------------------------------------------
  async function completeMobileOAuth(appUrl) {
    var parsed;
    try {
      parsed = new URL(appUrl);
    } catch (e) {
      return false;
    }
    if (parsed.protocol !== "com.codedestiny.app:" || parsed.host !== "auth") return false;
    var socialGrant = parsed.searchParams.get("social_grant") || parsed.searchParams.get("socialGrant") || "";
    if (!socialGrant) {
      // 🔴 서버는 실패한 콜백도 이 딥링크로 돌려보낸다(worker/routes/auth.js 의 catch 블록이
      // social_error 를 실어 buildAppOAuthHandoffResponse 를 반환한다). 예전에는 여기서
      // noGrant 로 조용히 끝나 그 사유가 화면 어디에도 나타나지 않았고, 사용자는 진행 화면만 봤다.
      var socialError = parsed.searchParams.get("social_error") || parsed.searchParams.get("socialError") || "";
      if (socialError) {
        trace("deepLink:socialError", { reason: socialError.slice(0, 120) });
        hideAuthProgress();
        notifyAuthCancelled("social_error");
        toast(describeSocialError(socialError));
        // 우리 딥링크가 맞으므로 true 다 — 호출부가 커스텀탭을 닫아 앱으로 되돌린다.
        return true;
      }
      trace("deepLink:noGrant", { url: appUrl.slice(0, 120) });
      return false;
    }

    var nextPath = parsed.searchParams.get("next") || "/";
    trace("deepLink:exchange", { nextPath: nextPath });
    // 교환이 멎으면 진행 화면이 영구히 남는다 — 사용자가 보는 화면이므로 상한을 건다.
    var result = await postJson("/api/auth/oauth/complete", {
      socialGrant: socialGrant,
      nextPath: nextPath,
    }, { timeoutMs: 20000 });
    if (!result.ok || !result.payload || !result.payload.accessToken) {
      trace("deepLink:exchangeFailed", { status: result.status, message: (result.payload && result.payload.message) || "" });
      throw new Error(String((result.payload && result.payload.message) || "Mobile OAuth completion failed."));
    }

    try {
      localStorage.setItem("fortune_auth_token", String(result.payload.accessToken));
      // 앱은 리프레시 쿠키를 못 받는다. 서버가 본문으로 내려준 이 토큰이 없으면
      // 액세스 토큰(기본 30분) 만료 후 세션을 되살릴 수단이 사라진다.
      if (result.payload.refreshToken) {
        localStorage.setItem("fortune_auth_refresh_token", String(result.payload.refreshToken));
      }
      if (result.payload.user) localStorage.setItem("fortune_auth_user", JSON.stringify(result.payload.user));
    } catch (e) { /* noop */ }
    window.dispatchEvent(new CustomEvent("cd:auth-changed", {
      detail: { source: "mobile-app-oauth", event: "login", at: Date.now() },
    }));
    trace("deepLink:exchangeOk", { nextPath: nextPath });

    // 여기서 이동하지 않으면 사용자는 로그인 화면 그대로 돌아온다 —
    // 토큰은 저장됐는데 화면은 그대로라 "로그인이 안 된다"고 느낀다.
    //
    // 🔴 2026-08-29 기기 트레이스에서 확정된 사고: 예전 조건은 현재 경로가 /login·/signup 이거나
    // target 이 "/" 가 아닐 때만 이동했다. 그런데 앱은 딥링크로 콜드 스타트하면 셸 홈
    // (/index.html)에서 깨어나고 next 도 "/" 라 **두 조건이 모두 거짓**이었다. 결과는 이동도
    // 오버레이 해제도 없는 상태 — exchangeOk 가 두 번 찍혔는데도 사용자는 진행 화면만 보고
    // 로그인이 실패했다고 판단해 재시도했다. 이제 어디로 돌아오든 반드시 셸을 다시 그린다.
    var target = (nextPath && nextPath.charAt(0) === "/" && nextPath.charAt(1) !== "/") ? nextPath : "/";
    var current = String(window.location.pathname || "/");
    var alreadyThere = target === "/" && (current === "/" || current === "/index.html");
    window.setTimeout(function () {
      if (alreadyThere) window.location.reload();
      else window.location.replace(target);
    }, 60);
    // 이동이 막히거나 늦어도 진행 화면이 남아서는 안 된다. 이동이 성공하면 이 타이머는 문서와 함께 사라진다.
    window.setTimeout(hideAuthProgress, 4000);
    return true;
  }

  function installAppUrlListener() {
    var app = appPlugin();
    if (!app || !app.addListener) {
      trace("appUrlListener:unavailable", { hasCapacitor: !!window.Capacitor });
      return;
    }
    app.addListener("appUrlOpen", function (event) {
      var appUrl = String((event && event.url) || "");
      trace("appUrlOpen", { url: appUrl.slice(0, 60) });
      if (!appUrl) return;
      openAuthStartedAt = 0;
      // 딥링크로 돌아온 직후 토큰 교환은 네트워크 왕복이다. 그 사이가 비어 있으면 멈춘 것처럼 보인다.
      showAuthProgress("로그인 정보를 확인하는 중이에요...");
      completeMobileOAuth(appUrl)
        .then(function (handled) {
          // 우리 딥링크가 아니면(다른 앱 링크 등) 진행 화면을 남겨두면 안 된다.
          if (!handled) {
            hideAuthProgress();
            return undefined;
          }
          var browser = browserPlugin();
          // 커스텀탭을 닫아 앱으로 돌아온다. 진행 화면은 nextPath 이동이 걷어간다.
          return browser && browser.close ? browser.close() : undefined;
        })
        .catch(function (error) {
          // 조용히 삼키면 사용자는 "아무 일도 안 일어났다"고만 느낀다.
          hideAuthProgress();
          notifyAuthCancelled("exchange_failed");
          var message = String(error && error.message || error);
          trace("deepLink:failed", { message: message });
          // 사유를 그대로 버리지 않는다 — 기기 트레이스에서 실제로 나온 실패는
          // 503 "Database is temporarily unavailable." 였고, 고정 문구로는 재시도해야 할지 알 수 없었다.
          toast(/abort|signal|timed? ?out/i.test(message)
            ? "로그인 확인이 지연되고 있어요. 다시 시도해 주세요."
            : describeSocialError(message));
        });
    });
  }

  // --- 3) 미완료(고아) 구매 복구 -------------------------------------------
  //
  // Play 결제는 앱 밖 결제 시트에서 끝나므로, 직후 앱이 죽거나 네트워크가 끊기면
  // "돈은 나갔는데 콘텐츠가 없는" 상태가 남는다. 부팅·포그라운드 복귀마다 훑는 것이 유일한 안전망이다.
  var recoveryRunning = false;
  async function runPurchaseRecovery() {
    if (recoveryRunning) return;
    var plugin = billingPlugin();
    if (!plugin || !plugin.restore) return;
    recoveryRunning = true;
    try {
      var restored = await plugin.restore({ productType: "all" });
      var purchases = (restored && restored.purchases) || [];
      if (!purchases.length) return;

      // PENDING(편의점·계좌이체)은 아직 결제 확정 전이라 서버로 보내지 않는다(402로 떨어진다).
      var settled = purchases.filter(function (purchase) {
        return Number(purchase.purchaseState) !== PURCHASE_STATE_PENDING;
      });
      if (!settled.length) return;

      var result = await postJson("/api/app-store/google/restore", { purchases: settled });
      if (!result.ok) return;

      var data = result.payload.data || {};
      // 소비하지 않으면 그 가격대 티어 SKU 전체가 ITEM_ALREADY_OWNED 로 잠긴다.
      var list = data.purchases || [];
      for (var i = 0; i < list.length; i += 1) {
        if (list[i] && list[i].shouldConsume === true && list[i].purchaseToken && plugin.consume) {
          try {
            await plugin.consume({ purchaseToken: list[i].purchaseToken });
          } catch (e) { /* 다음 복구에서 다시 시도된다 */ }
        }
      }

      if (Array.isArray(data.restoredFeatures) && data.restoredFeatures.length) {
        window.dispatchEvent(new CustomEvent("cd:unlocks-changed", {
          detail: { source: "app-purchase-recovery", features: data.restoredFeatures },
        }));
      }
    } catch (e) {
      // 복구 실패는 사용자에게 알리지 않는다 — 다음 포그라운드 복귀에서 다시 시도된다.
    } finally {
      recoveryRunning = false;
    }
  }

  // --- 4) 안드로이드 하드웨어 백버튼 ---------------------------------------
  //
  // 처리하지 않으면 어느 화면에서든 백버튼이 앱을 즉시 종료시킨다.
  // 계약: ① 열린 모달/오버레이가 있으면 '뒤로'는 닫기다 ② 페이지 레이어(React 앱 셸)가
  // 등록한 인터셉트가 있으면 그다음 ③ 뒤로 갈 곳이 있으면 뒤로 ④ 루트에서만 2회 종료.
  //
  // 오버레이 id 목록·가시성 판정은 셸의 mobile-bottom-navigation 스크립트(overlayOpen)와
  // 같은 규칙을 따른다 — 로더 오버레이(sajuLoaderOverlay)는 "닫기" 대상이 아니라 제외.
  var BACK_CLOSE_OVERLAY_IDS = [
    "tilePvwOverlay", "privacy-modal-overlay", "goldenGrainChargeModalRoot",
    "cdPaidFeatureGate", "dreamModalOverlay", "psychoDreamModalOverlay",
    "juyukModalOverlay", "sukuyoModalOverlay", "astroModalOverlay", "ziweiModalOverlay",
    "tarotModalOverlay", "tarotLoveOverlay", "tarotReunionOverlay", "tarotYearFortuneOverlay",
    "animalTotemOverlay", "kemetOracleOverlay", "destinyFlowerStudioOverlay",
    "cdLoginRequiredModal",
  ];

  function isOverlayVisible(node) {
    if (!node || !node.ownerDocument || !node.ownerDocument.documentElement.contains(node)) return false;
    if (node.getAttribute && node.getAttribute("aria-hidden") === "true") return false;
    var style;
    try { style = window.getComputedStyle(node); } catch (e) {}
    if (!style || style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
    return !!(node.offsetWidth || node.offsetHeight || (node.getClientRects && node.getClientRects().length));
  }

  function dispatchEscapeKey() {
    try {
      document.dispatchEvent(new KeyboardEvent("keydown", {
        key: "Escape", code: "Escape", keyCode: 27, which: 27, bubbles: true, cancelable: true,
      }));
      return true;
    } catch (e) { return false; }
  }

  // 🔴 실제로 닫혔을 때만 true 를 돌려준다. 예전에는 Escape 를 쏘고 무조건 true 였는데,
  // Escape 핸들러가 없는 오버레이(예: destiny-island.html 의 .sheet 들 — aria-modal 이지만
  // Escape 배선은 dlgWrap 에만 있다)에서는 백 이벤트만 삼키고 아무 일도 일어나지 않아
  // 사용자가 그 화면에 갇힌다. 못 닫으면 false 를 돌려 평소의 뒤로가기가 이어지게 한다.
  function closeOverlayNode(rootEl) {
    var closeEl = null;
    try {
      closeEl = rootEl.querySelector(
        '[data-action^="close"], [data-close], .sheet-close, .modal-nav-close, [data-cd-login-close]'
      );
    } catch (e) { /* noop */ }
    if (closeEl && typeof closeEl.click === "function") {
      closeEl.click();
      return true;
    }
    dispatchEscapeKey();
    return !isOverlayVisible(rootEl);
  }

  function closeTopOverlay() {
    // 결제수단 선택 모달 — 상태 전역이 정본. 닫기 = 취소 버튼과 동일 경로.
    try {
      var choice = window.__cdDirectPaymentChoiceActive;
      if (choice && choice.modal && document.body.contains(choice.modal)) {
        var cancel = choice.modal.querySelector(".cd-direct-payment-cancel");
        if (cancel) { cancel.click(); return true; }
      }
    } catch (e) {}
    for (var i = 0; i < BACK_CLOSE_OVERLAY_IDS.length; i += 1) {
      try {
        var rootEl = document.getElementById(BACK_CLOSE_OVERLAY_IDS[i]);
        if (isOverlayVisible(rootEl)) return closeOverlayNode(rootEl);
      } catch (e) {}
    }
    // 나머지 모달(React 의 role=dialog/aria-modal, 정적 페이지의 시트 등).
    // 뒤에 붙은 것이 위에 있을 가능성이 높으므로 역순으로 본다.
    try {
      var dialogs = document.querySelectorAll('[aria-modal="true"]');
      for (var j = dialogs.length - 1; j >= 0; j -= 1) {
        if (!isOverlayVisible(dialogs[j])) continue;
        return closeOverlayNode(dialogs[j]);
      }
    } catch (e) { /* noop */ }
    return false;
  }

  function isRootScreen() {
    var path = String(window.location.pathname || "/").replace(/\/index\.html$/, "").replace(/\/+$/, "");
    return path === "" || path === "/";
  }

  function showExitHint() {
    var existing = document.getElementById("cdAppExitHint");
    if (existing) return;
    var hint = document.createElement("div");
    hint.id = "cdAppExitHint";
    hint.setAttribute("role", "status");
    hint.textContent = "한 번 더 누르면 종료됩니다";
    hint.style.cssText = [
      "position:fixed", "left:50%", "transform:translateX(-50%)",
      "bottom:calc(88px + env(safe-area-inset-bottom,0px))",
      "z-index:2147483000", "padding:10px 18px", "border-radius:999px",
      // DESIGN.md 연이 Ink(#3c1830) + Glow-Not-Shadow(로즈 틴트 그림자).
      "background:#3c1830", "color:#fffaf7", "font-size:13px", "font-weight:700",
      "box-shadow:0 12px 24px rgba(150,72,104,.12)", "pointer-events:none",
    ].join(";");
    document.body.appendChild(hint);
    window.setTimeout(function () { hint.remove(); }, 2000);
  }

  // --- 4-b) 오프라인 안내 ----------------------------------------------------
  //
  // 앱은 번들 자산을 https://localhost 에서 서빙하므로 오프라인에서도 화면 자체는 그대로 뜬다.
  // 끊기는 것은 /api/* 뿐이다. 그래서 "오프라인 전용 화면"으로 본문을 덮지 않는다 — 저장된
  // 결과·정적 콘텐츠는 계속 볼 수 있어야 하고, 덮으면 그것까지 못 보게 된다.
  // 대신 하단 네비 위에 안내 바를 띄워 상태와 재시도만 제공한다.
  function cdAppText(key, fallback) {
    try {
      if (typeof window.cdTranslate === "function") return window.cdTranslate(key, {}, fallback);
    } catch (e) { /* 사전 미로딩 */ }
    return fallback;
  }

  function offlineNoticeNode() {
    var existing = document.getElementById("cdAppOfflineNotice");
    if (existing) return existing;

    var bar = document.createElement("div");
    bar.id = "cdAppOfflineNotice";
    bar.setAttribute("role", "status");
    bar.setAttribute("aria-live", "polite");
    bar.style.cssText = [
      "position:fixed", "left:12px", "right:12px",
      "bottom:calc(72px + env(safe-area-inset-bottom,0px))",
      "z-index:2147482000", "display:flex", "align-items:center", "gap:10px",
      "padding:10px 14px", "border-radius:14px",
      // DESIGN.md 연이 Ink(#3c1830) + Glow-Not-Shadow. 잉크 위 크림 글자로 대비를 확보한다.
      "background:#3c1830", "color:#fffaf7", "font-size:13px", "font-weight:700",
      "line-height:1.5", "word-break:keep-all",
      "box-shadow:0 12px 24px rgba(150,72,104,.18)",
    ].join(";");

    var message = document.createElement("span");
    message.style.cssText = "flex:1;min-width:0";
    // 연이 톤: 따뜻하게 상황만 알리고 단정하지 않는다.
    message.textContent = cdAppText("app.offline.message", "인터넷 연결이 끊겼어요. 연결되면 이어서 볼 수 있어요.");

    var retry = document.createElement("button");
    retry.type = "button";
    retry.textContent = cdAppText("app.offline.retry", "다시 시도");
    retry.style.cssText = [
      "flex:0 0 auto", "min-height:44px", "padding:0 14px", "border-radius:999px",
      "border:1px solid rgba(244,190,209,.5)", "background:transparent", "color:#ffd9e7",
      "font:inherit", "font-weight:800", "touch-action:manipulation",
      "-webkit-tap-highlight-color:transparent",
    ].join(";");
    retry.addEventListener("click", function () {
      try { window.location.reload(); } catch (e) { /* noop */ }
    });

    bar.appendChild(message);
    bar.appendChild(retry);
    document.body.appendChild(bar);
    return bar;
  }

  function syncOfflineNotice() {
    try {
      if (!document.body) return;
      var offline = window.navigator && window.navigator.onLine === false;
      var existing = document.getElementById("cdAppOfflineNotice");
      if (!offline) {
        if (existing) existing.remove();
        return;
      }
      offlineNoticeNode();
    } catch (e) { /* noop */ }
  }

  function installOfflineNotice() {
    window.addEventListener("online", syncOfflineNotice);
    window.addEventListener("offline", syncOfflineNotice);
    syncOfflineNotice();
  }

  var exitArmedAt = 0;
  function installBackButton() {
    var app = appPlugin();
    if (!app || !app.addListener) return;
    app.addListener("backButton", function (event) {
      // ① 열린 모달/오버레이가 있으면 '뒤로'는 닫기다 — 이탈·종료보다 먼저.
      if (closeTopOverlay()) return;
      // ② React 앱 셸(useAndroidBackButton)이 등록한 인터셉트 — /app 라우트의 루트 판정을
      //    페이지 레이어가 소유한다. 여기서 리스너를 하나 더 달면 백 1회에 2단계 후퇴한다.
      try {
        if (typeof window.__cdAppBackIntercept === "function" && window.__cdAppBackIntercept() === true) return;
      } catch (e) {}
      if (event && event.canGoBack && !isRootScreen()) {
        window.history.back();
        return;
      }
      if (!isRootScreen()) {
        window.history.back();
        return;
      }
      var now = Date.now();
      if (now - exitArmedAt < 2000) {
        if (app.exitApp) app.exitApp();
        return;
      }
      exitArmedAt = now;
      showExitHint();
    });
  }

  // --- 5) 앱 이탈 차단 (백스톱) --------------------------------------------
  //
  // Capacitor 는 앱 출처(https://localhost)와 다른 호스트를 웹뷰에 로드하지 않고
  // Intent.ACTION_VIEW 로 외부 Chrome 에 던진다(Bridge.launchIntent). 그래서 코드에 남은
  // 자사 절대 URL 앵커를 한 번만 눌러도 사용자가 앱 밖 웹사이트에 갇힌다 —
  // 로그인·세션이 끊길 뿐 아니라, 그 페이지엔 결제 가드가 없어 Play 정책상 안티스티어링
  // 위반 소지까지 생긴다.
  //
  // 빌드 후처리가 앵커를 상대경로로 바꾸지만 동적으로 만들어지는 링크는 놓친다.
  // 여기서 클릭을 캡처 단계에서 받아 최종적으로 막는다.
  var OWN_HOSTS = ["code-destiny.com", "www.code-destiny.com", "api.code-destiny.com"];

  function isOwnHost(hostname) {
    return OWN_HOSTS.indexOf(String(hostname || "").toLowerCase()) !== -1;
  }

  function installExternalLinkGuard() {
    document.addEventListener("click", function (event) {
      var anchor = event.target && event.target.closest ? event.target.closest("a[href]") : null;
      if (!anchor) return;
      var href = anchor.getAttribute("href") || "";
      if (!href || href.charAt(0) === "#") return;
      if (/^(javascript|mailto|tel|sms|intent|com\.codedestiny\.app):/i.test(href)) return;

      var url;
      try {
        url = new URL(href, window.location.href);
      } catch (e) {
        return;
      }
      if (url.origin === window.location.origin) return; // 이미 앱 내부

      event.preventDefault();
      event.stopPropagation();

      if (isOwnHost(url.hostname)) {
        // 자사 페이지는 번들 안에 같은 경로가 있다 — 앱 안에서 연다.
        window.location.assign(url.pathname + url.search + url.hash);
        return;
      }
      // 진짜 외부 링크는 커스텀탭으로 — 앱을 벗어나지 않고 닫으면 제자리로 돌아온다.
      var browser = browserPlugin();
      if (browser && browser.open) void browser.open({ url: url.href });
    }, true);
  }

  // --- 6) OAuth 앵커 선점 (하이드레이션 레이스 제거) -------------------------
  //
  // 로그인/회원가입 화면의 소셜 버튼은 <a href="/api/auth/oauth/…/start">이고,
  // 앱 분기는 React onClick 안에 있다. 그런데 이 사이트는 정적 export 라 하이드레이션 전에는
  // onClick 이 없다 — 그 사이에 누르면 브라우저가 href 를 그대로 따라간다.
  // 이 스크립트는 <head> 동기 스크립트라 항상 React 보다 먼저 살아 있으므로 여기서 선점한다.
  // (셸·회원가입 등 같은 링크를 쓰는 다른 화면도 함께 커버된다.)
  var OAUTH_PATH_RE = /^\/api\/auth\/oauth\/(google|naver|kakao)\/start/;

  function installOAuthAnchorGuard() {
    document.addEventListener("click", function (event) {
      var anchor = event.target && event.target.closest ? event.target.closest("a[href]") : null;
      if (!anchor) return;
      var href = anchor.getAttribute("href") || "";
      if (href.indexOf("/api/auth/oauth/") === -1) return;

      var url;
      try {
        url = new URL(href, window.location.href);
      } catch (e) {
        return;
      }
      var match = OAUTH_PATH_RE.exec(url.pathname);
      if (!match) return;

      event.preventDefault();
      event.stopPropagation();
      trace("anchorGuard:hit", { href: href });
      void nativeApi.openAuth({
        provider: match[1],
        nextPath: url.searchParams.get("next") || "/",
        flow: url.searchParams.get("flow") || "login",
      });
    }, true);
  }

  // --- 6-b) 하단 네비 "마이" 계측 ------------------------------------------
  //
  // 시트(#dpListSheet)와 여는 함수(window.dpOpenList)는 앱 번들에 둘 다 들어 있다.
  // 그런데 기기에서는 눌러도 아무 일이 없다 — 핸들러가 안 걸리는 것인지, 열리는데 화면 밖인지
  // 코드만 봐서는 못 가린다. 동작을 바꾸지 않고 결과만 기록해 다음 라운드에서 확정한다.
  function installProfileSheetProbe() {
    document.addEventListener("click", function (event) {
      var origin = event.target && event.target.closest
        ? event.target.closest("[data-cd-mobile-profile-list]")
        : null;
      if (!origin) return;
      trace("myTab:click", { dpOpenList: typeof window.dpOpenList });
      window.setTimeout(function () {
        var sheet = document.getElementById("dpListSheet");
        if (!sheet) {
          trace("myTab:sheetMissing", null);
          return;
        }
        var rect = sheet.getBoundingClientRect();
        trace("myTab:sheetState", {
          open: sheet.classList.contains("dp-sheet--open"),
          top: Math.round(rect.top),
          height: Math.round(rect.height),
          visibility: window.getComputedStyle(sheet).visibility,
        });
      }, 500);
    }, true);
  }

  // --- 7) 진단 오버레이 (버전 표기 5회 탭) ---------------------------------
  function renderDiagnostics() {
    var existing = document.getElementById("cdAppDiag");
    if (existing) { existing.remove(); return; }
    var pluginNames = Object.keys(plugins() || {}).join(", ") || "(none)";
    var lines = readTrace().slice(-20).map(function (entry) {
      return entry.at.slice(11, 19) + "  " + entry.step + "  " + (entry.detail ? JSON.stringify(entry.detail) : "");
    }).join("\n");
    var summary = [
      "CodeDestinyNative: " + typeof window.CodeDestinyNative,
      "openAuth: " + typeof (window.CodeDestinyNative && window.CodeDestinyNative.openAuth),
      "Browser plugin: " + (browserPlugin() ? "ok" : "MISSING"),
      "App plugin: " + (appPlugin() ? "ok" : "MISSING"),
      "Billing plugin: " + (billingPlugin() ? "ok" : "MISSING"),
      "plugins: " + pluginNames,
      "apiBase: " + (apiBase() || "(empty)"),
      "token: " + (function () { try { return localStorage.getItem("fortune_auth_token") ? "present" : "none"; } catch (e) { return "?"; } }()),
      "path: " + window.location.pathname,
    ].join("\n");

    var box = document.createElement("div");
    box.id = "cdAppDiag";
    box.style.cssText = "position:fixed;inset:0;z-index:2147483002;background:#fffaf7;color:#3c1830;"
      + "padding:calc(20px + env(safe-area-inset-top,0px)) 16px calc(20px + env(safe-area-inset-bottom,0px));"
      + "overflow:auto;font:12px/1.6 ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap;word-break:break-all";
    var close = document.createElement("button");
    close.type = "button";
    close.textContent = "닫기";
    close.style.cssText = "position:sticky;top:0;float:right;padding:8px 16px;border:0;border-radius:999px;"
      + "background:#b31955;color:#fffaf7;font-weight:800;font-size:13px";
    close.addEventListener("click", function () { box.remove(); });
    box.appendChild(close);
    box.appendChild(document.createTextNode("── 앱 진단 ──\n" + summary + "\n\n── 최근 단계 ──\n" + (lines || "(기록 없음)")));
    document.body.appendChild(box);
  }

  function installDiagnosticsGesture() {
    var taps = 0;
    var lastTapAt = 0;
    document.addEventListener("click", function (event) {
      var node = event.target && event.target.closest
        ? event.target.closest("[data-cd-app-version],.cd-app-version,#cdAppVersion,footer")
        : null;
      if (!node) return;
      var now = Date.now();
      taps = (now - lastTapAt < 900) ? taps + 1 : 1;
      lastTapAt = now;
      if (taps >= 5) {
        taps = 0;
        renderDiagnostics();
      }
    }, true);
    // 쿼리스트링으로도 열 수 있게 둔다(원격 안내가 쉬워진다).
    try {
      if (/[?&]cddiag=1(&|$)/.test(window.location.search)) {
        window.setTimeout(renderDiagnostics, 600);
      }
    } catch (e) { /* noop */ }
  }

  // --- 부팅 --------------------------------------------------------------
  // 앵커 선점만은 부팅을 기다리지 않는다 — DOMContentLoaded 전에 눌리는 경우가 실제 증상이었다.
  installOAuthAnchorGuard();
  // 테마 추적도 가장 먼저 걸어야 첫 적용을 놓치지 않는다.
  installThemeMutationProbe();

  function boot() {
    installAppUrlListener();
    installBackButton();
    installOfflineNotice();
    installExternalLinkGuard();
    installDiagnosticsGesture();
    installProfileSheetProbe();
    trace("boot", { path: window.location.pathname, hasBrowser: !!browserPlugin() });
    // 브릿지·플러그인이 준비될 여유를 두고 복구를 태운다.
    window.setTimeout(function () { void runPurchaseRecovery(); }, 800);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState !== "visible") return;
      void runPurchaseRecovery();
      // 사용자가 인증하지 않고 커스텀탭을 닫은 경우. 딥링크가 오면 openAuthStartedAt 이 0 이 되므로,
      // 여전히 남아 있으면 취소로 본다 — 그대로 두면 진행 화면에 갇힌다.
      if (!openAuthStartedAt) return;
      window.setTimeout(function () {
        if (!openAuthStartedAt) return;
        openAuthStartedAt = 0;
        hideAuthProgress();
        // 오버레이만 걷으면 React 소셜 버튼은 잠긴 채 남는다.
        notifyAuthCancelled("tab_closed");
        trace("openAuth:cancelled", null);
      }, 1500);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.__cdAppNativeBridge = {
    installed: true,
    completeMobileOAuth: completeMobileOAuth,
    runPurchaseRecovery: runPurchaseRecovery,
  };
})();
