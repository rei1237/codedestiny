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
        if (p.requestOverlayPermission) { try { p.requestOverlayPermission(); } catch (e) {} }
        if (p.setEnabled) { try { p.setEnabled({ enabled: true }); } catch (e) {} }
        if (p.scheduleAlarms) {
          try {
            p.scheduleAlarms({ value: JSON.stringify({ enabled: true, alarms: [
              { on: true, time: "09:00", label: "오늘의 꽃" },
              { on: true, time: "15:00", label: "감정상담소" },
            ] }) });
          } catch (e) {}
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
      if (document.getElementById(AUTH_PROGRESS_ID)) return;
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

  async function postJson(path, body) {
    var response = await fetch(apiBase() + path, {
      method: "POST",
      headers: authHeaders(),
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify(body || {}),
    });
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
      trace("deepLink:noGrant", { url: appUrl.slice(0, 120) });
      return false;
    }

    var nextPath = parsed.searchParams.get("next") || "/";
    trace("deepLink:exchange", { nextPath: nextPath });
    var result = await postJson("/api/auth/oauth/complete", {
      socialGrant: socialGrant,
      nextPath: nextPath,
    });
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
    var target = (nextPath && nextPath.charAt(0) === "/" && nextPath.charAt(1) !== "/") ? nextPath : "/";
    var current = String(window.location.pathname || "/");
    if (/^\/(login|signup)(\/|$)/.test(current) || target !== "/") {
      window.setTimeout(function () { window.location.replace(target); }, 60);
    }
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
          trace("deepLink:failed", { message: String(error && error.message || error) });
          toast("로그인 처리에 실패했습니다. 다시 시도해 주세요.");
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

  function closeOverlayNode(rootEl) {
    // 각 오버레이의 자기 닫기 버튼을 그대로 누른다 — 정리 로직(스크롤락 해제 등)을 재사용.
    var closeEl = null;
    try {
      closeEl = rootEl.querySelector('[data-action^="close"], .modal-nav-close, [data-cd-login-close]');
    } catch (e) {}
    if (closeEl && typeof closeEl.click === "function") { closeEl.click(); return true; }
    return dispatchEscapeKey();
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
    // React 계열 모달(role=dialog/aria-modal)은 Escape 로 닫는 계약이다
    // (예: FeatureMarketingDetailModal 의 window keydown 핸들러).
    try {
      var dialogs = document.querySelectorAll('[aria-modal="true"]');
      for (var j = 0; j < dialogs.length; j += 1) {
        if (isOverlayVisible(dialogs[j])) return dispatchEscapeKey();
      }
    } catch (e) {}
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
