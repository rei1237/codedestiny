/**
 * GA4 계측 — 정적 셸과 Next 라우트가 함께 쓰는 단일 진입점.
 *
 * 측정 ID 정본은 아래 DEFAULT_MEASUREMENT_ID 상수 하나다. 셸과 Next 라우트가 이 파일을
 * 함께 로드하므로 여기만 고치면 두 표면이 같은 속성에 쏜다. 표면별로 값을 나눠 두면
 * 한쪽만 갱신됐을 때 조용히 갈라지므로 그렇게 하지 말 것.
 * GA4 측정 ID 는 공개 식별자라 페이지 소스에 노출되어도 무방하다(모든 GA4 사이트가 그렇다).
 *
 * 오버라이드가 필요하면(스테이징 속성 분리 등) window.__CD_GA_ID 를 이 스크립트보다 먼저
 * 설정한다 — 정적 셸은 <head> 인라인, Next 는 NEXT_PUBLIC_GA_MEASUREMENT_ID 경유.
 *
 * 🔴 ID 형식이 깨지면 스크립트를 아예 받지 않고 cdTrack 은 no-op 이 된다 —
 *    호출부가 존재 여부를 검사하지 않아도 되게 하기 위해서다.
 *
 * 🔴 CSP 선행 조건: _headers 의 script-src/script-src-elem 에 www.googletagmanager.com,
 *    connect-src 에 google-analytics 엔드포인트가 있어야 한다. 없으면 조용히 차단된다.
 */
(function () {
  "use strict";
  if (typeof location !== "undefined" && /^\/gift(?:\/|$)/.test(location.pathname)) return;

  var global = typeof window !== "undefined" ? window : null;
  if (!global) return;
  if (global.cdTrack) return; // 셸과 layout 양쪽에서 로드돼도 한 번만 설치한다

  function noop() {}

  // 🔴 측정 ID 정본은 이 상수 하나다. GA4 측정 ID 는 공개 식별자라 레포에 두는 것이 맞고
  // (naver-site-verification·AdSense pub ID 와 같은 취급), 표면별로 값이 갈리면 셸과 React
  // 라우트가 서로 다른 속성에 쏘게 되므로 여기서만 정의한다.
  var DEFAULT_MEASUREMENT_ID = "G-FMHV4ZHY3G";

  var measurementId = "";
  try {
    // window.__CD_GA_ID 는 오버라이드 훅이다(스테이징 속성 분리 등). 비어 있으면 정본을 쓴다.
    measurementId = String(global.__CD_GA_ID || "").trim() || DEFAULT_MEASUREMENT_ID;
  } catch (_idReadError) {
    measurementId = DEFAULT_MEASUREMENT_ID;
  }

  // 형식이 깨진 오버라이드가 배포되는 사고를 막는다 — 실제 ID 는 항상 "G-" 로 시작한다.
  if (!/^G-[A-Z0-9]+$/i.test(measurementId)) {
    global.cdTrack = noop;
    global.cdSyncConsent = noop;
    return;
  }

  global.dataLayer = global.dataLayer || [];
  function gtag() {
    global.dataLayer.push(arguments);
  }
  global.gtag = global.gtag || gtag;

  /**
   * 동의 상태. 값은 "accepted" | "essential" 두 가지뿐이고 카테고리 분리가 없다.
   * 정적 셸에는 CodeDestinyCookiePolicy(index.html <head>)가 먼저 파싱돼 있으므로 그것을 쓰고,
   * React 라우트에는 그 객체가 없으니 같은 쿠키를 직접 읽는다.
   */
  function readConsent() {
    try {
      var policy = global.CodeDestinyCookiePolicy;
      if (policy && typeof policy.getConsent === "function") {
        return String(policy.getConsent() || "").trim();
      }
    } catch (_policyError) { /* noop */ }
    try {
      var match = String(document.cookie || "").match(/(?:^|;\s*)cd_cookie_consent=([^;]*)/);
      return match ? decodeURIComponent(match[1]).trim() : "";
    } catch (_cookieError) {
      return "";
    }
  }

  function analyticsStorageState() {
    return readConsent() === "accepted" ? "granted" : "denied";
  }

  /*
   * 🔴 gtag.js 는 window load 뒤 idle 에 주입한다. 바로 주입하면 첫 페인트 전에 171KB 가 끝나
   * Lighthouse 시뮬 LCP 의 선행 조건이 된다(/saju/ 차단 실측 −2.0초,
   * docs/handoff/global-css-render-blocking-2026-09-17.md 2-4). 아래 consent·config·이벤트는
   * dataLayer 에 먼저 쌓였다가 태그가 뜨면 그대로 전송된다.
   * 대가: load 전에 떠나는 방문은 page_view 가 남지 않는다 — 사용자 승인(2026-09-17).
   */
  function injectTag() {
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(measurementId);
    (document.head || document.documentElement).appendChild(script);
  }
  function injectWhenIdle() {
    if (typeof global.requestIdleCallback === "function") {
      global.requestIdleCallback(injectTag, { timeout: 2000 });
    } else {
      global.setTimeout(injectTag, 1);
    }
  }
  if (document.readyState === "complete") {
    injectWhenIdle();
  } else {
    global.addEventListener("load", injectWhenIdle, { once: true });
  }

  // 🔴 동의 기본값은 config 보다 먼저 dataLayer 에 들어가야 한다. 순서가 뒤집히면 거부 상태에서도
  // 첫 요청에 쿠키가 써진다. denied 여도 계측이 꺼지는 것은 아니고, 쿠키 없는 익명 집계로 내려간다
  // — 배너를 누르지 않은 사용자를 통째로 잃지 않으면서 동의 없이 식별자를 심지도 않는 절충이다.
  //
  // ad_* 는 일부러 선언하지 않는다. 같은 Google 태그를 쓰는 AdSense 의 현재 동작까지 바뀌는데
  // 그건 이 변경의 범위가 아니다(선언하지 않으면 종전과 같다).
  gtag("consent", "default", { analytics_storage: analyticsStorageState() });
  gtag("js", new Date());
  gtag("config", measurementId, {page_location: global.location.origin + global.location.pathname});

  /**
   * 이벤트 전송. 실패해도 절대 던지지 않는다 — 계측이 기능을 깨뜨려선 안 된다.
   * @param {string} eventName
   * @param {Object} [params]
   */
  global.cdTrack = function cdTrack(eventName, params) {
    if (!eventName) return;
    try {
      var safeParams = Object.assign({}, params || {});
      if (eventName === 'page_view') safeParams.page_location = global.location.origin + global.location.pathname;
      global.gtag("event", String(eventName), safeParams);
    } catch (_sendError) {
      /* 계측 실패는 무시한다 */
    }
  };

  var purchaseEvents = Object.create(null);
  // Browser-observed server state; no profile, question, result text or request ID is sent.
  global.cdTrackFortuneDelivery = function (record) {
    if (!record || record.paid !== true || record.state !== 'COMPLETED' || !/^[a-f0-9]{64}$/.test(record.id || '')) return;
    var item = String(record.productId || 'fortune');
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(item)) return;
    ['fortune_completed', 'fortune_first_open'].forEach(function (eventName) {
      var key = 'cd:delivery:' + eventName + ':' + record.id;
      var persisted = readConsent() === 'accepted';
      var seen = purchaseEvents[key];
      if (persisted) { try { seen = seen || global.localStorage.getItem(key); } catch (_) {} }
      if (seen) return;
      global.cdTrack(eventName, {item_id:item,observation:'browser_server_response'});
      purchaseEvents[key] = true;
      if (persisted) { try { global.localStorage.setItem(key, '1'); } catch (_) {} }
    });
  };
  // Call only with a successful server confirmation, never the PG popup callback.
  global.cdTrackConfirmedPurchase = function (payload) {
    try {
      var payment = payload && (payload.payment || payload.order);
      if (!payment || !/^(paid|success|fulfilled)$/i.test(String(payment.status || ''))) return false;
      var id = String(payment.merchantUid || payment.orderId || '');
      var value = Number(payment.paymentAmount == null ? payment.amountKRW : payment.paymentAmount);
      var item = String(payload.featureKey || payment.featureKey || payment.productId || payment.paymentType || 'fortune');
      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(item)) item = 'fortune';
      if (!/^[a-zA-Z0-9_-]{1,160}$/.test(id) || !Number.isFinite(value) || value <= 0) return false;
      var key = 'cd:purchase:' + id;
      var persisted = readConsent() === 'accepted';
      var seen = purchaseEvents[key];
      if (persisted) { try { seen = seen || global.localStorage.getItem(key); } catch (_) {} }
      if (!seen) {
        global.cdTrack('purchase', {transaction_id:id,value:value,currency:'KRW',items:[{item_id:item,price:value,quantity:1}]});
        purchaseEvents[key] = true;
        if (persisted) { try { global.localStorage.setItem(key, '1'); } catch (_) {} }
      }
      var granted = !/^(GRANT_PENDING|PENDING_CONFIRMATION)$/.test(String(payload.code || '').toUpperCase()) && payload.activationPending !== true && payload.recoveryRequired !== true && payment.entitlementGranted !== false;
      var grantSeen = purchaseEvents[key + ':grant'];
      if (persisted) { try { grantSeen = grantSeen || global.localStorage.getItem(key + ':grant'); } catch (_) {} }
      if (granted && !grantSeen) {
        global.cdTrack('entitlement_granted', {transaction_id:id,item_id:item});
        purchaseEvents[key + ':grant'] = true;
        if (persisted) { try { global.localStorage.setItem(key + ':grant', '1'); } catch (_) {} }
      }
      return true;
    } catch (_) { return false; }
  };

  /**
   * 동의 배너에서 선택이 바뀐 뒤 호출된다(index.html 의 commit()).
   * 배너를 누른 그 순간부터 반영되어야 하므로 페이지를 새로 고칠 때까지 기다리지 않는다.
   */
  global.cdSyncConsent = function cdSyncConsent() {
    try {
      global.gtag("consent", "update", { analytics_storage: analyticsStorageState() });
    } catch (_consentError) {
      /* 계측 실패는 무시한다 */
    }
  };

  /**
   * 앵커 클릭 위임 — 크로스셀과 홈 섹션 귀속을 한 리스너에서 받는다.
   *
   * 🔴 축마다 리스너를 새로 달지 말 것. 같은 노드·같은 이벤트에 위임을 겹쳐 놓으면 실행 순서가
   * 암묵적으로 정해지고, 한쪽에서 stopImmediatePropagation 이 나면 나머지가 조용히 죽는다.
   * 축을 늘릴 때는 아래에 try 블록을 하나 더 붙인다 — 블록을 나눠 두는 이유는 한 축의 실패가
   * 다른 축의 발화를 막지 않게 하기 위해서다.
   *
   * capture 단계에서 듣는 이유는 라우터가 클릭을 가로채기 전에 기록하기 위해서다.
   * 두 축 모두 표식이 붙은 컨테이너 안의 앵커만 대상이라 일반 내비게이션 링크는 걸리지 않는다.
   */
  document.addEventListener("click", function (event) {
    var anchor = null;
    try {
      anchor = event.target && event.target.closest ? event.target.closest("a[href]") : null;
    } catch (_anchorError) {
      return;
    }
    if (!anchor) return;

    /*
     * 크로스셀 클릭. 정본 렌더러 app/components/SeoLandingTemplate.jsx 는 서버 컴포넌트라 onClick 을
     * 달 수 없어, 목록 컨테이너에 data-cd-cross-sell 표식만 남기고 여기서 위임으로 받는다.
     */
    try {
      var container = anchor.closest("[data-cd-cross-sell]");
      if (container) {
        global.cdTrack("cross_sell_click", {
          from_service: String(container.getAttribute("data-cd-cross-sell") || ""),
          to_service: new URL(anchor.getAttribute("href"), global.location.href).pathname
        });
      }
    } catch (_crossSellError) {
      /* 계측 실패는 무시한다 */
    }

    /*
     * 홈 섹션 귀속. 홈은 정적 셸이라 React 훅(app/hooks/useAnalytics.ts)을 쓸 수 없고, 어느 면이
     * 클릭을 만들었는지 남는 기록이 없어 홈 구조를 바꿔도 효과를 판정할 수 없었다.
     *
     * 🔴 앵커만 센다. 탭 전환·펼치기 버튼은 화면을 떠나지 않아 퍼널 이탈이 아니고, 같이 세면
     * 목적지별 분해가 흐려진다. 무료 사주 시작과 결제창 단계는 이미 다른 채널이 잡으므로
     * (js/saju-engine.js 의 free_saju_*, js/core/checkout-entry.js 의 checkout_*) 여기서 다시
     * 쏘지 않는다 — 두 지점이 한 행동을 쏘면 분해가 불가능해진다.
     */
    try {
      var section = anchor.closest("[data-cd-funnel-section]");
      if (section) {
        global.cdTrack("home_section_click", {
          section: String(section.getAttribute("data-cd-funnel-section") || ""),
          destination: String(anchor.getAttribute("href") || "")
        });
      }
    } catch (_homeSectionError) {
      /* 계측 실패는 무시한다 */
    }
  }, true);

  /**
   * 공유 링크를 타고 들어온 유입. 파라미터는 js/share.js 의 cdAppendReferralQuery 가 붙이는
   * ref/via 를 그대로 읽는다 — 계측 전용 파라미터를 새로 만들면 기존 공유 링크가 전부 누락된다.
   */
  try {
    if (typeof global.URLSearchParams === "function") {
      var shareParams = new global.URLSearchParams(global.location.search || "");
      var publicShare = shareParams.get("utm_medium") === "share" && shareParams.get("utm_campaign") === "public_share";
      if (shareParams.get("ref") || publicShare) {
        var publicChannel = shareParams.get("utm_source");
        var knownChannel = /^(native|copy|kakao|x|facebook|linkedin|email|share)$/.test(publicChannel || "") ? publicChannel : "unknown";
        var introduction = global.location.pathname.match(/^\/features\/([a-z0-9-]+)\/?$/);
        global.cdTrack("share_receive", {
          referral_channel: shareParams.get("ref") ? String(shareParams.get("via") || "unknown") : knownChannel,
          ...(publicShare ? { content_id: introduction ? introduction[1] : global.location.pathname === "/" ? "site" : "public-content" } : {})
        });
      }
    }
  } catch (_shareReceiveError) {
    /* 계측 실패는 무시한다 */
  }

  /**
   * 재방문 간격. 🔴 첫 방문에는 발화하지 않는다 — 비교 대상이 없는 방문까지 세면 리텐션이
   * 신규 유입만큼 부풀어 올라 지표가 쓸모없어진다. 기록은 항상 갱신한다.
   */
  try {
    var lastVisitKey = "cd_ga_last_visit_v1";
    var previousVisit = Number(localStorage.getItem(lastVisitKey) || 0);
    var nowMs = Date.now();
    localStorage.setItem(lastVisitKey, String(nowMs));
    var elapsedMs = nowMs - previousVisit;
    if (previousVisit && elapsedMs >= 86400000) {
      global.cdTrack("retention_visit", { days_since_last_visit: Math.floor(elapsedMs / 86400000) });
    }
  } catch (_retentionError) {
    /* 저장소가 막혀 있으면(사파리 비공개 등) 조용히 포기한다 */
  }
})();
