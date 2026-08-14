const INDEX_RUNTIME_TEXT_TRANSLATIONS = {
  ko: {
    "indexRuntime.message.001": "월정석 정보를 확인하는 중이에요",
    "indexRuntime.message.002": "월정석이 활성화되고 있어요\n곧 이용 가능해져요",
    "indexRuntime.message.003": "월정석이 활성화되고 있어요\n곧 이용 가능해져요",
    "indexRuntime.message.004": "단건으로 카드 결제를 준비 중이에요",
    "indexRuntime.message.005": "결제가 완료됐어요\n결과를 불러오는 중이에요",
    "indexRuntime.message.006": "이용권을 확인하는 중이에요",
    "indexRuntime.message.007": "처리 중이에요\n잠시만 기다려 주세요",
    "indexRuntime.message.008": "처리 중이에요\n잠시만 기다려 주세요",
    "indexRuntime.confirm.001": "🔒 로그인이 필요한 서비스입니다.\\\\n로그인 후 이용해 주세요.",
    "indexRuntime.aria-label.001": "시빌라 사주 시스템 열기",
    "indexRuntime.error.001": "SwissEph loader failed.",
    "indexRuntime.confirm.002": "🔒 로그인이 필요한 서비스입니다.\\\\n로그인 후 이용해 주세요.",
    "indexRuntime.label.001": "달 위상",
    "indexRuntime.label.002": "수호동물",
    "indexRuntime.label.003": "오늘의 강한 별",
    "indexRuntime.label.004": "별 밝기",
    "indexRuntime.label.005": "궁위",
    "indexRuntime.label.006": "태양궁",
    "indexRuntime.label.007": "상승궁",
    "indexRuntime.label.008": "달궁",
    "indexRuntime.label.009": "신강/신약",
    "indexRuntime.label.010": "용신",
    "indexRuntime.label.011": "조후",
    "indexRuntime.aria-label.002": "운명의 꽃 연동하기",
    "indexRuntime.confirm.003": "🔒 로그인이 필요한 서비스입니다.\\\\n로그인 후 이용해 주세요.",
    "indexRuntime.confirm.004": "저장된 운명의 꽃 기록을 모두 삭제할까요?",
    "indexRuntime.title.001": "애니멀 토템 리딩 결과",
    "indexRuntime.confirm.005": "🔒 로그인이 필요한 서비스입니다.\\\\n로그인 후 이용해 주세요.",
    "indexRuntime.confirm.006": "🔒 로그인이 필요한 서비스입니다.\\\\n로그인 후 이용해 주세요.",
    "indexRuntime.confirm.007": "🔒 로그인이 필요한 서비스입니다.\\\\n로그인 후 이용해 주세요.",
  },
};

function _indexRuntimeText(key) {
  var ko = INDEX_RUNTIME_TEXT_TRANSLATIONS.ko[key] || "";
  try {
    if (typeof window !== "undefined" && window && typeof window.cdTranslate === "function") {
      return window.cdTranslate(key, {}, ko);
    }
  } catch (_) {}
  return ko || "Translation pending";
}

function __cdPushPerfMetric(name, value, detail) {
  try {
    var root = window.__cdPerfMetrics = window.__cdPerfMetrics || {
      lcp: null,
      cls: 0,
      inp: null,
      collectionTapSamples: [],
      marks: []
    };

    root[name] = value;
    root.marks.push({
      name: name,
      value: value,
      detail: detail || null,
      ts: Date.now()
    });

    window.dispatchEvent(new CustomEvent('cd:perf-metric', {
      detail: {
        name: name,
        value: value,
        meta: detail || null
      }
    }));
  } catch (_) {}
}

function __cdInitCollectionPerfMetrics() {
  if (window.__cdCollectionPerfInited) return;
  window.__cdCollectionPerfInited = true;

  var supportsPO = typeof PerformanceObserver !== 'undefined';
  var lastLcp = null;
  var clsValue = 0;
  var maxInp = null;

  if (supportsPO) {
    try {
      var lcpObserver = new PerformanceObserver(function(list) {
        var entries = list.getEntries();
        if (!entries || !entries.length) return;
        lastLcp = entries[entries.length - 1];
        __cdPushPerfMetric('lcp', Math.round(lastLcp.startTime), {
          entryType: 'largest-contentful-paint'
        });
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden') {
          try { lcpObserver.disconnect(); } catch (_) {}
          if (lastLcp) {
            __cdPushPerfMetric('lcpFinal', Math.round(lastLcp.startTime), {
              reason: 'visibility-hidden'
            });
          }
        }
      }, { once: true });
    } catch (_) {}

    try {
      var clsObserver = new PerformanceObserver(function(list) {
        var entries = list.getEntries();
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].hadRecentInput) continue;
          clsValue += entries[i].value || 0;
        }
        __cdPushPerfMetric('cls', Number(clsValue.toFixed(4)), {
          entryType: 'layout-shift'
        });
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (_) {}

    try {
      var inpObserver = new PerformanceObserver(function(list) {
        var entries = list.getEntries();
        for (var i = 0; i < entries.length; i++) {
          var e = entries[i];
          if (!e || typeof e.duration !== 'number') continue;
          if (!maxInp || e.duration > maxInp.duration) {
            maxInp = e;
            __cdPushPerfMetric('inp', Math.round(e.duration), {
              entryType: 'event',
              interactionId: e.interactionId || 0,
              target: e.name || 'unknown'
            });
          }
        }
      });
      inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 16 });
    } catch (_) {}
  }

  var trackedSelector = '.fc-toggle-btn, .tarot-tile, [data-action="toggleCollection"]';
  var tapState = { ts: 0, key: '' };

  function getTargetKey(el) {
    if (!el || !el.closest) return '';
    var target = el.closest(trackedSelector);
    if (!target) return '';
    var action = target.getAttribute('data-action') || '';
    var id = target.id || target.getAttribute('data-target') || '';
    var cls = target.className || '';
    return [action, id, cls].join('|');
  }

  function onPressStart(event) {
    var key = getTargetKey(event.target);
    if (!key) return;
    tapState.ts = performance.now();
    tapState.key = key;
  }

  function onClick(event) {
    var key = getTargetKey(event.target);
    if (!key || !tapState.ts) return;
    var delta = performance.now() - tapState.ts;
    if (tapState.key !== key) return;
    if (!(delta >= 0 && delta < 10000)) return;

    var ms = Math.round(delta);
    var root = window.__cdPerfMetrics = window.__cdPerfMetrics || { collectionTapSamples: [] };
    if (!Array.isArray(root.collectionTapSamples)) root.collectionTapSamples = [];
    root.collectionTapSamples.push({ key: key, latencyMs: ms, ts: Date.now() });
    if (root.collectionTapSamples.length > 50) {
      root.collectionTapSamples.shift();
    }

    __cdPushPerfMetric('collectionTapLatencyLast', ms, {
      key: key
    });
  }

  document.addEventListener('pointerdown', onPressStart, { passive: true });
  document.addEventListener('touchstart', onPressStart, { passive: true });
  document.addEventListener('click', onClick, { passive: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', __cdInitCollectionPerfMetrics, { once: true });
} else {
  __cdInitCollectionPerfMetrics();
}

function __cdResolveRequestUrl(input) {
  try {
    if (typeof input === 'string') return new URL(input, window.location.origin);
    if (input && typeof input.url === 'string') {
      return new URL(input.url, window.location.origin);
    }
  } catch (_) {}
  return null;
}

function __cdResolveRequestMethod(input, init) {
  if (init && typeof init.method === 'string' && init.method.trim()) {
    return String(init.method).toUpperCase();
  }
  if (input && typeof input === 'object' && typeof input.method === 'string' && input.method.trim()) {
    return String(input.method).toUpperCase();
  }
  return 'GET';
}

function __cdShouldTrackPaymentRequest(pathname, method) {
  if (!pathname) return false;
  if (method === 'GET' || method === 'HEAD') return false;

  if (pathname.indexOf('/api/billing/coin-gate') === 0) return false;
  // 🔴 [regression-guard] 주문 발급(checkout/prepare)은 PG 결제창을 열기 **전** 단계이고, 결제수단
  // 선택창이 뜰 때 사용자 몰래 미리 발사되는 사전발급이기도 하다 — 여기에 대기 UI를 띄우면
  // 'PAYMENT CHECK · 결제 상태 확인 중 · 단건으로 카드 결제를 준비 중이에요' 전체화면이 결제창을
  // 덮는다(2026-08 재발). 셸 인라인 쌍둥이(index.html _cdResolvePendingPaymentMeta)에는 이 예외가
  // 이미 있었는데 외부화된 이 사본에만 빠져 있었다. 대기 UI는 결제창을 통과한 뒤의 승인 검증
  // (confirm)에서만 띄운다 — 바로 아래 분기.
  if (pathname.indexOf('/api/billing/checkout') === 0) return false;
  if (pathname.indexOf('/api/payments/prepare') === 0) return false;
  if (pathname.indexOf('/api/billing/purchase') === 0) return true;
  if (pathname.indexOf('/api/billing/charge') === 0) return true;
  if (pathname.indexOf('/api/billing/confirm') === 0) return true;
  if (pathname.indexOf('/api/payments/confirm') === 0) return true;
  if (pathname.indexOf('/api/payments/subscription/prepare') === 0) return true;
  if (pathname.indexOf('/api/payments/subscription/confirm') === 0) return true;
  if (pathname.indexOf('/api/premium/') === 0) return true;
  if (pathname.indexOf('/api/sibyl/report') === 0) return true;
  if (pathname.indexOf('/api/fortune/pig-coin/profile-subscription/subscribe') === 0) return true;
  return false;
}

function __cdResolvePaymentMeta(pathname) {
  if (pathname && pathname.indexOf('/api/payments/subscription/prepare') === 0) return { message: _indexRuntimeText("indexRuntime.message.001"), mode: 'monthly' };
  if (pathname && pathname.indexOf('/api/payments/subscription/confirm') === 0) return { message: _indexRuntimeText("indexRuntime.message.002"), mode: 'payment-complete' };
  if (pathname && pathname.indexOf('/api/fortune/pig-coin/profile-subscription/subscribe') === 0) return { message: _indexRuntimeText("indexRuntime.message.003"), mode: 'payment-complete' };
  // checkout/prepare 분기는 없다 — __cdShouldTrackPaymentRequest 가 애초에 추적하지 않는다(위 주석).
  if (pathname && (pathname.indexOf('/api/billing/confirm') === 0 || pathname.indexOf('/api/payments/confirm') === 0)) return { message: _indexRuntimeText("indexRuntime.message.005"), mode: 'payment-complete' };
  if (pathname && pathname.indexOf('/api/billing/coin-gate') === 0) return { message: _indexRuntimeText("indexRuntime.message.006"), mode: 'pass' };
  return { message: _indexRuntimeText("indexRuntime.message.007"), mode: 'payment' };
}

function __cdSetPaymentLoadingOverlay(open, message, mode) {
  if (typeof window !== 'undefined' && typeof window._cdSetCoinGateOverlay === 'function') {
    window._cdSetCoinGateOverlay(!!open, message, mode);
    return;
  }
  try {
    window.dispatchEvent(new CustomEvent('cd:payment-loading-state', {
      detail: { open: !!open, message: String(message || '').trim() || '처리 중이에요\n잠시만 기다려 주세요', mode: String(mode || '').trim() || 'payment' }
    }));
  } catch (_) {
  }
}

function __cdInitGlobalPaymentLoading() {
  if (window.__cdPaymentLoadingInited) return;
  window.__cdPaymentLoadingInited = true;

  var state = {
    depth: 0,
    message: _indexRuntimeText("indexRuntime.message.008"),
    mode: 'payment'
  };

  function startPayment(message, mode) {
    if (typeof message === 'string' && message.trim()) {
      state.message = message.trim();
    }
    if (typeof mode === 'string' && mode.trim()) {
      state.mode = mode.trim();
    }
    state.depth += 1;
    __cdSetPaymentLoadingOverlay(true, state.message, state.mode);
  }

  function endPayment() {
    state.depth = Math.max(0, state.depth - 1);
    if (state.depth === 0) {
      __cdSetPaymentLoadingOverlay(false, state.message, state.mode);
      state.message = '처리 중이에요\n잠시만 기다려 주세요';
      state.mode = 'payment';
    }
  }

  function setPaymentMessage(message, mode) {
    if (!message || !String(message).trim()) return;
    state.message = String(message).trim();
    if (typeof mode === 'string' && mode.trim()) state.mode = mode.trim();
    if (state.depth > 0) {
      __cdSetPaymentLoadingOverlay(true, state.message, state.mode);
    }
  }

  var api = {
    startPayment: startPayment,
    endPayment: endPayment,
    setPaymentMessage: setPaymentMessage,
    startProcessing: startPayment,
    stopProcessing: endPayment,
    setProcessingMessage: setPaymentMessage
  };

  try {
    Object.defineProperty(api, 'isPaymentLoading', {
      configurable: false,
      enumerable: true,
      get: function() {
        return state.depth > 0;
      }
    });
  } catch (_) {
    api.isPaymentLoading = false;
  }

  window.__cdPaymentLoading = api;

  if (window.__cdPaymentFetchPatched || typeof window.fetch !== 'function') return;
  window.__cdPaymentFetchPatched = true;

  var originalFetch = window.fetch.bind(window);

  function __cdReadPremiumAccessTokenForBridge() {
    var token = '';
    try { token = String(window.__cdPremiumAccessToken || '').trim(); } catch (_) { token = ''; }
    if (!token) {
      try { token = String(sessionStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { token = ''; }
    }
    if (!token) {
      try { token = String(localStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { token = ''; }
    }
    return token;
  }

  function __cdPersistPremiumAccessTokenForBridge(token) {
    var safeToken = String(token || '').trim();
    if (!safeToken) return;
    try { window.__cdPremiumAccessToken = safeToken; } catch (_) {}
    try { sessionStorage.setItem('cd_premium_access_token', safeToken); } catch (_) {}
    try { localStorage.setItem('cd_premium_access_token', safeToken); } catch (_) {}
  }

  function __cdExtractPremiumAccessTokenFromAny(payload) {
    if (!payload || typeof payload !== 'object') return '';
    var keys = ['premiumAccessToken', '_premiumAccessToken', 'accessToken', 'token'];
    for (var i = 0; i < keys.length; i += 1) {
      var v = payload[keys[i]];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    if (payload.data && typeof payload.data === 'object') {
      var nested = __cdExtractPremiumAccessTokenFromAny(payload.data);
      if (nested) return nested;
    }
    if (payload.payload && typeof payload.payload === 'object') {
      var nestedPayload = __cdExtractPremiumAccessTokenFromAny(payload.payload);
      if (nestedPayload) return nestedPayload;
    }
    return '';
  }

  function __cdTapPremiumTokenFromResponse(response, reqUrl) {
    if (!response || !reqUrl || !__cdIsOwnApiOrigin(reqUrl)) return;
    var pathname = String(reqUrl.pathname || '');
    if (pathname.indexOf('/api/') !== 0) return;
    var contentType = '';
    try { contentType = String(response.headers.get('content-type') || '').toLowerCase(); } catch (_) { contentType = ''; }
    if (contentType.indexOf('application/json') === -1) return;

    try {
      response.clone().json().then(function (payload) {
        var token = __cdExtractPremiumAccessTokenFromAny(payload);
        if (token) __cdPersistPremiumAccessTokenForBridge(token);
      }).catch(function () {});
    } catch (_) {}
  }

  /* 셸의 래퍼(fetchJsonWithAuth/_dpFetchJsonWithFallback)를 우회하는 raw fetch 가 401/403 을
     받아도 유령 로그인 UI 가 남지 않게 한다. 401 을 여기서 로그아웃으로 해석하지는 않는다 —
     리프레시 이전이거나 일시 장애일 수 있으므로 /api/auth/me 재검증만 예약하고 판정은 그쪽이 한다. */
  function __cdObserveApiAuthFailure(response, reqUrl) {
    try {
      if (!response || !reqUrl || !__cdIsOwnApiOrigin(reqUrl)) return;
      if (response.status !== 401 && response.status !== 403) return;
      var pathname = String(reqUrl.pathname || '');
      if (pathname.indexOf('/api/') !== 0) return;
      if (pathname.indexOf('/api/auth/') === 0) return;
      if (typeof window.__cdScheduleSessionRevalidation === 'function') {
        window.__cdScheduleSessionRevalidation();
      }
    } catch (_) {}
  }

  /* Capacitor 앱인가. 앱은 https://localhost 출처에서 돌고 API 는 자사 도메인으로 나간다. */
  function __cdIsMobileAppRuntime() {
    /* 🔴 판별 정본은 js/core/app-context.js 하나다(docs/app-audit/APP_UIUX_SPEC.md §2). */
    try {
      var ctx = window.__cdAppContext;
      if (ctx && typeof ctx.isApp === 'function') return ctx.isApp();
    } catch (_) {}
    /* 정본 미로딩 폴백 — 정본과 같은 신호만 본다. `!!window.Capacitor` 로 넓히지 말 것(과대판정). */
    try {
      if (window.__CODE_DESTINY_RUNTIME_TARGET === 'mobile-app') return true;
      if (document.documentElement
        && document.documentElement.getAttribute('data-runtime-target') === 'mobile-app') return true;
      var cap = window.Capacitor;
      return !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
    } catch (_) {
      return false;
    }
  }

  /* 토큰을 실어도 되는 자사 API 출처인가.
     웹은 동일 출처만 해당한다(기존 동작 그대로). 앱은 출처가 https://localhost 라 동일 출처 조건이
     항상 거짓이고 세션 쿠키도 SameSite=Lax 로 교차 전송되지 않는다 — 그래서 여기서 토큰을 붙이지
     않으면 셸의 모든 API 호출이 게스트로 취급된다. destiny-profile 이 aa018053 에서 자기 호출에만
     적용한 처방을 패치 레벨로 올려 셸 엔진 전체가 같은 혜택을 받게 한다. */
  function __cdIsOwnApiOrigin(reqUrl) {
    if (!reqUrl) return false;
    if (reqUrl.origin === window.location.origin) return true;
    if (!__cdIsMobileAppRuntime()) return false;
    var host = String(reqUrl.hostname || '').toLowerCase();
    return host === 'code-destiny.com'
      || host === 'www.code-destiny.com'
      || host === 'workers.dev'
      || host.slice(-12) === '.workers.dev';
  }

  window.fetch = function(input, init) {
    var reqUrl = __cdResolveRequestUrl(input);
    var reqMethod = __cdResolveRequestMethod(input, init);
    var pathname = reqUrl ? reqUrl.pathname : '';
    var patchedInit = init;

    // Keep legacy premium frontends working by forwarding auth/premium tokens to same-origin API calls.
    if (reqUrl && __cdIsOwnApiOrigin(reqUrl) && pathname.indexOf('/api/') === 0) {
      patchedInit = (init && typeof init === 'object') ? Object.assign({}, init) : {};
      var headers = new Headers((patchedInit && patchedInit.headers) || undefined);

      if (!headers.has('Authorization')) {
        var authToken = '';
        try { authToken = String(localStorage.getItem('fortune_auth_token') || '').trim(); } catch (_) { authToken = ''; }
        if (authToken) headers.set('Authorization', 'Bearer ' + authToken);
      }

      // 워커의 동일 출처 가드는 이 헤더를 든 앱 요청만 면제한다(worker/routes/auth.js isMobileAppAuthRequest).
      if (__cdIsMobileAppRuntime() && !headers.has('X-Code-Destiny-Runtime')) {
        headers.set('X-Code-Destiny-Runtime', 'mobile-app');
      }

      if (!headers.has('x-premium-access-token')) {
        var premiumToken = __cdReadPremiumAccessTokenForBridge();
        if (premiumToken) headers.set('x-premium-access-token', premiumToken);
      }

      var bodyToken = __cdReadPremiumAccessTokenForBridge();
      if (bodyToken && patchedInit && typeof patchedInit.body === 'string') {
        try {
          var parsedBody = JSON.parse(patchedInit.body);
          if (parsedBody && typeof parsedBody === 'object' && !Array.isArray(parsedBody) && !parsedBody.premiumAccessToken) {
            parsedBody.premiumAccessToken = bodyToken;
            patchedInit.body = JSON.stringify(parsedBody);
          }
        } catch (_) {}
      }

      patchedInit.headers = headers;
    }

    var shouldTrack = __cdShouldTrackPaymentRequest(pathname, reqMethod);

    if (!shouldTrack) {
      return originalFetch(input, patchedInit).then(function(response) {
        __cdTapPremiumTokenFromResponse(response, reqUrl);
        __cdObserveApiAuthFailure(response, reqUrl);
        return response;
      });
    }

    var paymentMeta = __cdResolvePaymentMeta(pathname);
    startPayment(paymentMeta.message, paymentMeta.mode);

    try {
      return originalFetch(input, patchedInit).then(
        function(response) {
          __cdTapPremiumTokenFromResponse(response, reqUrl);
          __cdObserveApiAuthFailure(response, reqUrl);
          endPayment();
          return response;
        },
        function(error) {
          endPayment();
          throw error;
        }
      );
    } catch (error) {
      endPayment();
      throw error;
    }
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', __cdInitGlobalPaymentLoading, { once: true });
} else {
  __cdInitGlobalPaymentLoading();
}

function cdNormalizeLang(langCode) {
  var raw = String(langCode || 'ko').trim();
  if (!raw) return 'ko';
  var low = raw.toLowerCase();
  if (low === 'jp') return 'ja';
  if (low === 'zh' || low === 'zh-cn') return 'zh-CN';
  if (low === 'en' || low === 'ja' || low === 'hi' || low === 'es' || low === 'fr' || low === 'de' || low === 'nl' || low === 'ms' || low === 'ko') {
    return low;
  }
  return 'ko';
}

function cdGetCurrentLang() {
  try {
    var q = new URLSearchParams(window.location.search || '');
    var fromQuery = q.get('lang');
    if (fromQuery) return cdNormalizeLang(fromQuery);
  } catch (_) {}

  try {
    var saved = localStorage.getItem('cd_lang');
    if (saved) return cdNormalizeLang(saved);
  } catch (_) {}

  try {
    var gt = document.cookie.match(/(?:^|;\s*)googtrans=\/ko\/([^;]+)/i);
    if (gt && gt[1]) return cdNormalizeLang(gt[1]);
  } catch (_) {}

  return 'ko';
}

function cdSaveCurrentLang(langCode) {
  var normalized = cdNormalizeLang(langCode);
  try { localStorage.setItem('cd_lang', normalized); } catch (_) {}
  return normalized;
}

var __cdCollectionToggleHintTextByLang = {
  ko: { open: '눌러서 열기', close: '닫기' },
  en: { open: 'Tap to open', close: 'Close' },
  ja: { open: 'タップして開く', close: '閉じる' },
  'zh-CN': { open: '点击展开', close: '收起' },
  hi: { open: 'खोलने के लिए टैप करें', close: 'बंद करें' },
  es: { open: 'Toca para abrir', close: 'Cerrar' },
  fr: { open: 'Touchez pour ouvrir', close: 'Fermer' },
  de: { open: 'Zum Oeffnen tippen', close: 'Schliessen' },
  nl: { open: 'Tik om te openen', close: 'Sluiten' },
  ms: { open: 'Ketuk untuk buka', close: 'Tutup' }
};

function cdGetCollectionToggleHintCopy(langCode) {
  var normalized = cdNormalizeLang(langCode || cdGetCurrentLang());
  return __cdCollectionToggleHintTextByLang[normalized] || __cdCollectionToggleHintTextByLang.ko;
}

function cdApplyCollectionToggleHintTexts(langCode) {
  var copy = cdGetCollectionToggleHintCopy(langCode);
  var collections = document.querySelectorAll('[data-collection-open]');
  for (var i = 0; i < collections.length; i++) {
    var collection = collections[i];
    var isOpen = collection.getAttribute('data-collection-open') === 'true';
    var hintText = collection.querySelector('.fc-toggle-hint__text');
    if (hintText) {
      hintText.textContent = isOpen ? copy.close : copy.open;
    }
  }
}

window.cdApplyCollectionToggleHintTexts = cdApplyCollectionToggleHintTexts;

var __cdLocalePrefixMap = {
  en: '/en-us',
  ja: '/ja-jp',
  'zh-CN': '/zh-cn',
  hi: '/hi-in',
  es: '/es-es',
  fr: '/fr-fr',
  de: '/de-de',
  nl: '/nl-nl',
  ms: '/ms-my'
};

function cdStripLocalePrefix(pathname) {
  var p = String(pathname || '/');
  var prefixes = Object.keys(__cdLocalePrefixMap).map(function(k) { return __cdLocalePrefixMap[k]; });
  for (var i = 0; i < prefixes.length; i++) {
    var pref = prefixes[i];
    if (p === pref) return '/';
    if (p.indexOf(pref + '/') === 0) return p.slice(pref.length);
  }
  return p;
}

function cdBuildLocalizedAppPath(basePath, langCode) {
  var normalized = cdNormalizeLang(langCode);
  if (normalized === 'ko') return basePath;
  var prefix = __cdLocalePrefixMap[normalized] || '';
  return prefix ? (prefix + basePath) : basePath;
}

function cdResolveLocalizedFeatureHref(rawHref, langCode) {
  if (!rawHref) return rawHref;
  var normalized = cdNormalizeLang(langCode || cdGetCurrentLang());
  var u;
  try {
    u = new URL(rawHref, window.location.origin);
  } catch (_) {
    return rawHref;
  }
  if (u.origin !== window.location.origin) return rawHref;

  var basePath = cdStripLocalePrefix(u.pathname);
  var isAppLocalized = (
    basePath === '/oracle/rune' ||
    basePath === '/oracle/sikojen-povailu' ||
    basePath === '/insights' ||
    basePath === '/olympus'
  );
  var isStandaloneHtml = (
    basePath === '/vedic-ai' ||
    basePath === '/geomancy-oracle-v4.html' ||
    basePath === '/royal-tea-oracle.html' ||
    basePath === '/destiny-poker.html'
  );

  if (isAppLocalized) {
    u.pathname = cdBuildLocalizedAppPath(basePath, normalized);
  }

  if (isStandaloneHtml) {
    u.pathname = basePath;
    if (normalized === 'ko') u.searchParams.delete('lang');
    else u.searchParams.set('lang', normalized);
  }

  return u.pathname + u.search + u.hash;
}

function cdRetargetLocaleSensitiveLinks() {
  var lang = cdGetCurrentLang();
  var selector = [
    'a[href^="/oracle/rune"]',
    'a[href^="/oracle/sikojen-povailu"]',
    'a[href^="/insights"]',
    'a[href^="/olympus"]',
    'a[href^="/vedic-ai"]',
    'a[href^="/geomancy-oracle-v4.html"]',
    'a[href^="/royal-tea-oracle.html"]',
    'a[href^="/destiny-poker.html"]'
  ].join(', ');
  var links = document.querySelectorAll(selector);
  for (var i = 0; i < links.length; i++) {
    var link = links[i];
    var raw = link.getAttribute('href');
    var nextHref = cdResolveLocalizedFeatureHref(raw, lang);
    if (nextHref && raw !== nextHref) {
      link.setAttribute('href', nextHref);
    }
  }
}

window.__cdResolveLocalizedFeatureHref = cdResolveLocalizedFeatureHref;
window.__cdRetargetLocaleSensitiveLinks = cdRetargetLocaleSensitiveLinks;

// 구글 번역 언어 선택 카드 토글 기능 (DOM 로드 대기)
function initTranslateLangUI() {
  var langWrap = document.querySelector('.translate-lang-wrap');
  var langBtn = document.getElementById('translateLangToggleBtn');
  var langCard = document.getElementById('translateLangCard');
  var langLabel = document.getElementById('translateLangLabel');
  var hideTimer = null;
  var HIDE_DELAY = 30000; // 30초
  window.__cdTranslateInitAttempts = (window.__cdTranslateInitAttempts || 0) + 1;
  
  // 요소가 없으면 제한적으로 재시도 (무한 루프 방지)
  if (!langBtn || !langCard || !langWrap) {
    if (window.__cdTranslateInitAttempts < 120) {
      setTimeout(initTranslateLangUI, 100);
    }
    return;
  }
  
  // 자동 숨김 시작
  function startHideTimer() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function() {
      if (langWrap) {
        langWrap.classList.add('translate-lang-wrap--hidden');
      }
    }, HIDE_DELAY);
  }
  
  // 버튼 표시 및 타이머 리셋
  function showTranslateButton() {
    clearTimeout(hideTimer);
    if (langWrap) {
      langWrap.classList.remove('translate-lang-wrap--hidden');
    }
  }
  
  // 버튼 클릭 시 카드 토글
  langBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    langCard.classList.toggle('active');
    showTranslateButton();
  });
  
  // 바깥 클릭 시 카드 닫기
  document.addEventListener('click', function(e) {
    if (langWrap && !langWrap.contains(e.target)) {
      langCard.classList.remove('active');
    }
  });
  
  // 언어 변경 카드 버튼 핸들러
  // NOTE: Google Translate includedLanguages와 라벨 매핑을 맞춘다.
  var langCodeMap = { 'ko': 'KR', 'en': 'EN', 'ja': 'JP', 'zh-CN': 'CN', 'zh-TW': 'TW', 'vi': 'VI', 'hi': 'HI', 'es': 'ES', 'fr': 'FR', 'de': 'DE', 'nl': 'NL', 'ms': 'MS' };
  var langCodeBtns = document.querySelectorAll('.translate-lang-code');
  Array.prototype.forEach.call(langCodeBtns, function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      var lang = btn.getAttribute('data-lang');
      if (!lang) return;
      cdSaveCurrentLang(lang);
      
      // 활성 상태 업데이트
      Array.prototype.forEach.call(langCodeBtns, function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      
      // 버튼 레이블 업데이트
      if (langLabel) langLabel.textContent = langCodeMap[lang] || lang.toUpperCase();
      
      // Google Translate 드롭다운 변경 (로딩 지연/중복 인스턴스 대응)
      cdSetGoogleTranslateLanguage(lang, {
        maxAttempts: 60,
        retryDelay: 200,
        fallbackToCookieReload: true
      });
      cdRetargetLocaleSensitiveLinks();
      cdApplyCollectionToggleHintTexts(lang);
      startHideTimer();
      
      // 카드 닫기
      if (langCard) langCard.classList.remove('active');
    });
  });
}

function cdDispatchNativeChangeEvent(el) {
  if (!el) return;
  try {
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  } catch (_) {}
  try {
    var legacyEvt = document.createEvent('HTMLEvents');
    legacyEvt.initEvent('change', true, false);
    el.dispatchEvent(legacyEvt);
  } catch (_) {}
}

window.__cdNativeOnlyLanguage = true;

function cdShouldSkipGoogleTranslate(langCode) {
  try {
    if (window.__cdNativeOnlyLanguage) return true;
    if (typeof window.__cdShouldSkipGoogleTranslate === 'function') {
      return !!window.__cdShouldSkipGoogleTranslate(langCode);
    }
    return !!window.__cdGoogleTranslateSuppressed;
  } catch (_) {}
  return false;
}

function cdClearLangUiBusy() {
  var wrap = document.getElementById('langWrap');
  var trigger = document.getElementById('langTrigger');
  if (wrap) wrap.classList.remove('is-loading');
  if (trigger) trigger.setAttribute('aria-busy', 'false');
}

function cdEnsureGoogleTranslateBootstrap() {
  cdClearLangUiBusy();
  return;
  var hasGoogleTranslateRuntime = !!(window.google && window.google.translate && window.google.translate.TranslateElement);
  if (hasGoogleTranslateRuntime) {
    cdSetLangUiLoading(false);
    if (typeof window.googleTranslateElementInit === 'function') {
      try { window.googleTranslateElementInit(); } catch (_) {}
    }
    return;
  }

  if (window.__cdGoogleTranslateScriptRequested) return;
  window.__cdGoogleTranslateScriptRequested = true;
  cdSetLangUiLoading(true, '언어 엔진 로딩 중...');

  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.async = true;
  script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  script.onerror = function() {
    window.__cdGoogleTranslateScriptRequested = false;
    cdSetLangUiLoading(false);
  };
  document.head.appendChild(script);
}

function cdSetGoogleTranslateLanguage(langCode, options) {
  if (!langCode) return Promise.resolve(false);
  cdClearLangUiBusy();
  return Promise.resolve(false);

  var opts = options || {};
  var attempts = 0;
  var maxAttempts = typeof opts.maxAttempts === 'number' ? opts.maxAttempts : 180;
  var retryDelay = typeof opts.retryDelay === 'number' ? opts.retryDelay : 80;
  var useCookieFallback = opts.fallbackToCookieReload === true;
  var maxWaitMs = typeof opts.maxWaitMs === 'number' ? opts.maxWaitMs : 15000;

  function pickGoogleTranslateSelect() {
    var scope = document.getElementById('google_translate_element') || document;
    var selects = scope.querySelectorAll('.goog-te-combo');
    if (selects && selects.length) return selects[0];
    return null;
  }

  function fallbackByCookieOnly() {
    if (!useCookieFallback || !langCode || langCode === 'ko') return;
    var host = window.location.hostname;
    var cookieValue = '/ko/' + langCode;
    var expires = 'expires=Fri, 31 Dec 9999 23:59:59 GMT';
    document.cookie = 'googtrans=' + cookieValue + '; ' + expires + '; path=/; SameSite=Lax';
    if (host) {
      document.cookie = 'googtrans=' + cookieValue + '; ' + expires + '; domain=' + host + '; path=/; SameSite=Lax';
      document.cookie = 'googtrans=' + cookieValue + '; ' + expires + '; domain=.' + host + '; path=/; SameSite=Lax';
    }
  }

  // language change가 실제 DOM 번역으로 반영되지 않는 케이스를 대비해,
  // select 변경 전에 cookie를 먼저 세팅한다.
  function setCookieForLang(code) {
    if (!code || code === 'ko') return;
    var host = window.location.hostname;
    var cookieValue = '/ko/' + code;
    var expires = 'expires=Fri, 31 Dec 9999 23:59:59 GMT';
    document.cookie = 'googtrans=' + cookieValue + '; ' + expires + '; path=/; SameSite=Lax';
    if (host) {
      document.cookie = 'googtrans=' + cookieValue + '; ' + expires + '; domain=' + host + '; path=/; SameSite=Lax';
      document.cookie = 'googtrans=' + cookieValue + '; ' + expires + '; domain=.' + host + '; path=/; SameSite=Lax';
    }
  }

  function clearCookieForKo() {
    var host = window.location.hostname;
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax;';
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=' + host + '; path=/; SameSite=Lax;';
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=.' + host + '; path=/; SameSite=Lax;';
  }

  function hasOptionValue(selectField, value) {
    if (!selectField || !selectField.options) return false;
    for (var i = 0; i < selectField.options.length; i++) {
      if (selectField.options[i] && selectField.options[i].value === value) return true;
    }
    return false;
  }

  function applyValueToSelect(selectField, value) {
    if (!selectField) return false;
    if (value !== 'ko' && !hasOptionValue(selectField, value)) return false;
    selectField.value = value;
    try { selectField.setAttribute('value', value); } catch (_) {}
    try { selectField.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
    try { selectField.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}
    cdDispatchNativeChangeEvent(selectField);
    return true;
  }

  if (langCode === 'ko') clearCookieForKo();
  else setCookieForLang(langCode);

  return new Promise(function(resolve) {
    var done = false;
    var observer = null;
    var startedAt = Date.now();

    function finish(result) {
      if (done) return;
      done = true;
      if (observer) {
        try { observer.disconnect(); } catch (_) {}
      }
      resolve(result);
    }

    function tryApply() {
      cdEnsureGoogleTranslateBootstrap();
      var selectField = pickGoogleTranslateSelect();
      if (!selectField) return false;
      if (!applyValueToSelect(selectField, langCode)) return false;
      return true;
    }

    function apply() {
      if (tryApply()) {
        // 일부 브라우저에서 첫 change 이벤트를 드랍하는 경우가 있어 짧게 1회 보강한다.
        setTimeout(function() {
          if (!done) {
            tryApply();
            finish(true);
          }
        }, 120);
        return;
      }
      if (attempts >= maxAttempts || (Date.now() - startedAt) >= maxWaitMs) {
        fallbackByCookieOnly();
        finish(false);
        return;
      }
      attempts++;
      setTimeout(apply, retryDelay);
    }

    if (typeof MutationObserver === 'function' && document.documentElement) {
      try {
        observer = new MutationObserver(function() {
          if (done) return;
          if (tryApply()) {
            setTimeout(function() {
              if (!done) {
                tryApply();
                finish(true);
              }
            }, 120);
          }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
      } catch (_) {
        observer = null;
      }
    }

    apply();
  });
}

function cdForceHideGoogleTranslateBanner() {
  try {
    var styleId = 'cd-hide-google-translate-banner-style';
    if (!document.getElementById(styleId)) {
      var st = document.createElement('style');
      st.id = styleId;
      st.textContent = ''
        + '.goog-te-banner-frame{display:none !important;visibility:hidden !important;height:0 !important;}'
        + '.goog-te-balloon-frame{display:none !important;visibility:hidden !important;height:0 !important;}'
        + '#goog-gt-tt{display:none !important;visibility:hidden !important;}'
        + '.goog-tooltip{display:none !important;visibility:hidden !important;}'
        + '.goog-text-highlight{background-color:transparent !important;box-shadow:none !important;}'
        + '.skiptranslate iframe{display:none !important;}'
        + 'body{top:0 !important;position:static !important;}'
        + 'html{margin-top:0 !important;}';
      document.head.appendChild(st);
    }
  } catch (_) {}

  try {
    var frames = document.querySelectorAll('.goog-te-banner-frame, iframe.goog-te-banner-frame, .goog-te-balloon-frame, iframe.goog-te-balloon-frame');
    for (var i = 0; i < frames.length; i++) {
      frames[i].style.setProperty('display', 'none', 'important');
      frames[i].style.setProperty('visibility', 'hidden', 'important');
      frames[i].style.setProperty('height', '0', 'important');
    }
    var gtTooltip = document.getElementById('goog-gt-tt');
    if (gtTooltip) {
      gtTooltip.style.setProperty('display', 'none', 'important');
      gtTooltip.style.setProperty('visibility', 'hidden', 'important');
    }
    var highlighted = document.querySelectorAll('.goog-text-highlight');
    for (var j = 0; j < highlighted.length; j++) {
      highlighted[j].classList.remove('goog-text-highlight');
    }
    document.body.style.setProperty('top', '0px', 'important');
    document.body.style.setProperty('position', 'static', 'important');
    document.documentElement.style.setProperty('margin-top', '0px', 'important');
  } catch (_) {}
}

function cdInstallGoogleTranslateBannerGuard() {
  cdForceHideGoogleTranslateBanner();
  setTimeout(cdForceHideGoogleTranslateBanner, 120);
  setTimeout(cdForceHideGoogleTranslateBanner, 600);
  setTimeout(cdForceHideGoogleTranslateBanner, 1600);
  if (window.__cdGtBannerGuardInstalled) return;
  window.__cdGtBannerGuardInstalled = true;

  if (typeof MutationObserver === 'function' && document.documentElement) {
    try {
      var scheduled = false;
      var obs = new MutationObserver(function() {
        if (scheduled) return;
        scheduled = true;
        __cdScheduleVisualTask(function() {
          scheduled = false;
          cdForceHideGoogleTranslateBanner();
        });
      });
      obs.observe(document.documentElement, { childList: true, subtree: true });
    } catch (_) {}
  }
}

// DOM 준비 완료 시 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    cdInstallGoogleTranslateBannerGuard();
    try { initTranslateLangUI(); } catch (err) { console.warn('[translate-ui] init failed:', err); }
    cdSaveCurrentLang(cdGetCurrentLang());
    cdRetargetLocaleSensitiveLinks();
    cdApplyCollectionToggleHintTexts(cdGetCurrentLang());
  });
} else {
  cdInstallGoogleTranslateBannerGuard();
  try { initTranslateLangUI(); } catch (err) { console.warn('[translate-ui] init failed:', err); }
  cdSaveCurrentLang(cdGetCurrentLang());
  cdRetargetLocaleSensitiveLinks();
  cdApplyCollectionToggleHintTexts(cdGetCurrentLang());
}

function initPerformanceDiagnosisObservers() {
  if (typeof window === 'undefined' || typeof PerformanceObserver !== 'function') return;
  var host = String(window.location && window.location.hostname || '').toLowerCase();
  var isLocalHost = (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local'));
  var debugEnabled = !!window.__CD_ENABLE_PERF_LOGS__;
  if (!isLocalHost && !debugEnabled) return;
  if (window.__cdPerfObserverInstalled) return;
  window.__cdPerfObserverInstalled = true;

  try {
    var longTaskObserver = new PerformanceObserver(function(entryList) {
      var entries = entryList.getEntries();
      for (var i = 0; i < entries.length; i += 1) {
        var entry = entries[i];
        if (entry && entry.duration > 50) {
          console.warn('[perf] Long task detected', {
            duration: Math.round(entry.duration),
            startTime: Math.round(entry.startTime)
          });
        }
      }
    });
    longTaskObserver.observe({ type: 'longtask', buffered: true });
  } catch (_) {}

  try {
    var clsValue = 0;
    var clsObserver = new PerformanceObserver(function(entryList) {
      var entries = entryList.getEntries();
      for (var i = 0; i < entries.length; i += 1) {
        var entry = entries[i];
        if (entry && !entry.hadRecentInput) {
          clsValue += entry.value || 0;
        }
      }
      if (clsValue >= 0.1) {
        console.warn('[perf] CLS warning', { cls: Number(clsValue.toFixed(4)) });
      }
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch (_) {}
}

initPerformanceDiagnosisObservers();

function __cdScheduleVisualTask(task) {
  if (typeof task !== 'function') return;
  var raf = window.requestAnimationFrame;
  if (typeof raf === 'function') {
    raf(function() { task(); });
    return;
  }
  setTimeout(task, 0);
}

function __cdScheduleIdleTask(task, timeout) {
  if (typeof task !== 'function') return;
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(function() { task(); }, { timeout: typeof timeout === 'number' ? timeout : 500 });
    return;
  }
  setTimeout(task, 0);
}

function __cdRunChunked(items, iteratee, options) {
  var list = Array.prototype.slice.call(items || []);
  if (!list.length || typeof iteratee !== 'function') return Promise.resolve();

  var opts = options || {};
  var i = 0;
  var minBatch = typeof opts.minBatch === 'number' ? opts.minBatch : 6;
  var maxBatch = typeof opts.maxBatch === 'number' ? opts.maxBatch : 32;
  var budgetMs = typeof opts.budgetMs === 'number' ? opts.budgetMs : 8;
  var perf = (typeof window !== 'undefined' && window.performance && typeof window.performance.now === 'function') ? window.performance : null;

  return new Promise(function(resolve) {
    function runBatch() {
      var started = perf ? perf.now() : Date.now();
      var processed = 0;
      while (i < list.length && processed < maxBatch) {
        iteratee(list[i], i);
        i += 1;
        processed += 1;
        if (processed >= minBatch) {
          var now = perf ? perf.now() : Date.now();
          if ((now - started) >= budgetMs) break;
        }
      }

      if (i >= list.length) {
        resolve();
        return;
      }
      setTimeout(runBatch, 0);
    }

    runBatch();
  });
}

function syncFeatureCardHeight(card) {
  if (!card) return;
  var detail = card.querySelector('.feature-card__detail');
  var inner = card.querySelector('.feature-card__detail-inner');
  if (!detail || !inner) return;
  if (card.classList.contains('feature-card--open')) {
    var buffer = card.classList.contains('feature-card--destiny-flower') ? 18 : 8;
    detail.style.setProperty('--fc-open-height', (inner.scrollHeight + buffer) + 'px');
  } else {
    detail.style.setProperty('--fc-open-height', '0px');
  }
}

(function() {
  var resizeTicking = false;
  function onResize() {
    if (resizeTicking) return;
    resizeTicking = true;
    requestAnimationFrame(function() {
      resizeTicking = false;
      document.querySelectorAll('.feature-card').forEach(syncFeatureCardHeight);
    });
  }
  window.addEventListener('resize', onResize, { passive: true });
})();

function fcToggle(btn) {
  var card = btn.closest('.feature-card');
  function openByAction(actionName) {
    if (!card || !actionName) return false;
    var fn = window[actionName];
    if (typeof fn === 'function') {
      fn();
      return true;
    }
    var launch = card.querySelector('.feature-card__launch[data-action="' + actionName + '"]');
    if (launch && typeof launch.click === 'function') {
      launch.click();
      return true;
    }
    return false;
  }

  if (card) {
    if (card.classList.contains('feature-card--face') && openByAction('openPhysiognomyApp')) { return; }
    if (card.classList.contains('feature-card--animal') && openByAction('openMbtiModal')) { return; }
    if (card.classList.contains('feature-card--tarot-love') && openByAction('openTarotLoveModal')) { return; }
    if (card.classList.contains('feature-card--tarot-healing') && openByAction('openTarotHealingModal')) { return; }
    if (card.classList.contains('feature-card--tarot-self-esteem') && openByAction('openTarotSelfEsteemModal')) { return; }
    if (card.classList.contains('feature-card--tarot-reunion') && openByAction('openTarotReunionModal')) { return; }
    if (card.classList.contains('feature-card--tarot-year') && openByAction('openTarotYearFortuneModal')) { return; }
    if (card.classList.contains('feature-card--tarot') && openByAction('openTarotModal')) { return; }
    if (card.classList.contains('feature-card--animal-totem') && openByAction('openAnimalTotemModal')) { return; }
    if (card.classList.contains('feature-card--tazza') && openByAction('openHwatuModal')) { return; }
    if (card.classList.contains('feature-card--egypt') && openByAction('openKemetModal')) { return; }
    if (card.classList.contains('feature-card--juyuk') && openByAction('openJuyukModal')) { return; }
    if (card.classList.contains('feature-card--sukuyo') && openByAction('openSukuyoModal')) { return; }
    if (card.classList.contains('feature-card--astro-fc') && openByAction('openAstroModal')) { return; }
    if (card.classList.contains('feature-card--ziwei') && openByAction('openZiweiModal')) { return; }
    if (card.classList.contains('feature-card--destiny-flower') && openByAction('openDestinyFlower')) { return; }
    if (card.classList.contains('feature-card--astrology-flower') && openByAction('openAstrologyFlower')) { return; }
    if (card.classList.contains('feature-card--jamidusu-flower') && openByAction('openJamidusuFlower')) { return; }
    if (card.classList.contains('feature-card--sukuyo-flower') && openByAction('openSukuyoFlower')) { return; }
    if (card.classList.contains('feature-card--dream') && openByAction('openDreamModal')) { return; }
  }

  var open = card.classList.toggle('feature-card--open');
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  var detail = card.querySelector('.feature-card__detail');
  if (detail) detail.setAttribute('aria-hidden', open ? 'false' : 'true');
  syncFeatureCardHeight(card);
  btn.querySelector('.feature-card__cta-label').textContent = open ? '닫기' : btn.dataset.label;
  btn.querySelector('.feature-card__cta-arrow').textContent = open ? '▲' : '▼';
}

function bindFeatureCardVisualActions() {
  var defs = [
    { cardClass: 'feature-card--face', action: 'openPhysiognomyApp' },
    { cardClass: 'feature-card--animal', action: 'openMbtiModal' },
    { cardClass: 'feature-card--tarot-love', action: 'openTarotLoveModal' },
    { cardClass: 'feature-card--tarot-healing', action: 'openTarotHealingModal' },
    { cardClass: 'feature-card--tarot-self-esteem', action: 'openTarotSelfEsteemModal' },
    { cardClass: 'feature-card--tarot-reunion', action: 'openTarotReunionModal' },
    { cardClass: 'feature-card--tarot-year', action: 'openTarotYearFortuneModal' },
    { cardClass: 'feature-card--tarot', action: 'openTarotModal' },
    { cardClass: 'feature-card--animal-totem', action: 'openAnimalTotemModal' },
    { cardClass: 'feature-card--tazza', action: 'openHwatuModal' },
    { cardClass: 'feature-card--egypt', action: 'openKemetModal' },
    { cardClass: 'feature-card--juyuk', action: 'openJuyukModal' },
    { cardClass: 'feature-card--sukuyo', action: 'openSukuyoModal' },
    { cardClass: 'feature-card--astro-fc', action: 'openAstroModal' },
    { cardClass: 'feature-card--ziwei', action: 'openZiweiModal' },
    { cardClass: 'feature-card--destiny-flower', action: 'openDestinyFlower' },
    { cardClass: 'feature-card--astrology-flower', action: 'openAstrologyFlower' },
    { cardClass: 'feature-card--jamidusu-flower', action: 'openJamidusuFlower' },
    { cardClass: 'feature-card--sukuyo-flower', action: 'openSukuyoFlower' },
    { cardClass: 'feature-card--dream', action: 'openDreamModal' }
  ];

  defs.forEach(function(def) {
    var card = document.querySelector('.feature-card.' + def.cardClass);
    if (!card) return;
    ['.feature-card__img-wrap', '.feature-card__img', '.feature-card__title', '.feature-card__desc'].forEach(function(sel) {
      var nodes = card.querySelectorAll(sel);
      __cdRunChunked(nodes, function(el) {
        if (!el.getAttribute('data-action')) {
          el.setAttribute('data-action', def.action);
        }
      }, { minBatch: 4, maxBatch: 20, budgetMs: 6 });
    });
  });
}

function bindFeatureCardImageFallbacks() {
  var defs = [
    { cardClass: 'feature-card--animal-totem', fileName: 'animaltotem-cute.svg' },
    { cardClass: 'feature-card--tarot-year', fileName: '12animals.webp' },
    { cardClass: 'feature-card--tarot-self-esteem', fileName: 'jajongam.webp' },
    { cardClass: 'feature-card--tarot-love', fileName: 'tarolove.webp' }
  ];

  defs.forEach(function(def) {
    var img = document.querySelector('.feature-card.' + def.cardClass + ' .feature-card__img');
    if (!img) return;

    var relativePath = 'fuctionassets/' + def.fileName;
    var absolutePath = '/fuctionassets/' + def.fileName;

    if (!img.dataset.fallbackBound) {
      img.dataset.fallbackBound = '1';
      img.addEventListener('error', function() {
        if (img.dataset.fallbackTried === '1') return;
        img.dataset.fallbackTried = '1';
        img.src = relativePath;
      });
    }

    img.src = absolutePath;
  });
}

function normalizeLegacyFuctionAssetImagePaths() {
  var imgs = document.querySelectorAll('img[src^="fuctionassets/"]');
  __cdRunChunked(imgs, function(img) {
    var raw = img.getAttribute('src') || '';
    if (!raw || raw.indexOf('fuctionassets/') !== 0) return;
    img.setAttribute('src', '/' + raw);
  }, { minBatch: 8, maxBatch: 30, budgetMs: 6 });
}

function __cdSortAnimalCollectionTitlesDesc() {
  var collection = document.getElementById('animalCollection');
  if (!collection || collection.dataset.cdTitleSortedDesc === '1') return;

  var grid = collection.querySelector('.feat-collection__grid');
  if (!grid) return;

  var tiles = [];
  for (var i = 0; i < grid.children.length; i++) {
    var child = grid.children[i];
    if (child && child.classList && child.classList.contains('tarot-tile')) {
      tiles.push(child);
    }
  }
  if (!tiles.length) return;

  var lang = (document.documentElement && document.documentElement.lang) || 'ko';
  var collator = (typeof Intl !== 'undefined' && typeof Intl.Collator === 'function')
    ? new Intl.Collator(lang, { numeric: true, sensitivity: 'base' })
    : null;

  function getTitleText(tile) {
    var titleEl = tile ? tile.querySelector('.tarot-tile__title') : null;
    var raw = titleEl && titleEl.textContent ? titleEl.textContent : '';
    return raw.replace(/\s+/g, ' ').trim();
  }

  tiles.sort(function(a, b) {
    var aTitle = getTitleText(a);
    var bTitle = getTitleText(b);
    if (collator) return collator.compare(bTitle, aTitle);
    return bTitle.localeCompare(aTitle);
  });

  var fragment = document.createDocumentFragment();
  tiles.forEach(function(tile) { fragment.appendChild(tile); });
  grid.appendChild(fragment);
  collection.dataset.cdTitleSortedDesc = '1';
}

function initFeatureCardBindings() {
  __cdSortAnimalCollectionTitlesDesc();
  __cdScheduleIdleTask(function() {
    normalizeLegacyFuctionAssetImagePaths();
    bindFeatureCardVisualActions();
    bindFeatureCardImageFallbacks();
  }, 700);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFeatureCardBindings, { once: true });
} else {
  initFeatureCardBindings();
}

function __cdResolveEventElement(event) {
  if (!event || !event.target) return null;
  if (event.target instanceof Element) return event.target;
  if (event.target.parentElement instanceof Element) return event.target.parentElement;
  return null;
}

/**
 * 오버레이 루트에 data-action이 있으면 모바일에서 event.target이 오버레이로만 잡힐 때
 * closest가 닫기로 처리한다. 히트 스택으로 시트 내부 실제 요소를 복구한다.
 */
function __cdDestinyFlowerPickHitFromElementsStack(event) {
  var sheet = document.getElementById('destinyFlowerStudioSheet');
  var ov = document.getElementById('destinyFlowerStudioOverlay');
  if (!sheet) return null;
  var x = event && event.clientX;
  var y = event && event.clientY;
  if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  try {
    if (typeof document.elementsFromPoint === 'function') {
      var stack = document.elementsFromPoint(x, y);
      for (var i = 0; i < stack.length && i < 28; i++) {
        var el = stack[i];
        if (!el) continue;
        if (ov && (el === ov || el.id === 'destinyFlowerStudioOverlay')) break;
        if (el === sheet || sheet.contains(el)) return el;
      }
    }
    if (typeof document.elementFromPoint === 'function') {
      var one = document.elementFromPoint(x, y);
      if (one && sheet.contains(one)) return one;
    }
  } catch (e) {}
  return null;
}

function __cdResolveDestinyFlowerClickTarget(event) {
  var t = __cdResolveEventElement(event);
  var picked = __cdDestinyFlowerPickHitFromElementsStack(event);
  if (picked) return picked;
  return t;
}

function __cdIsInsideDestinyFlowerSheet(event, el) {
  var sheet = document.getElementById('destinyFlowerStudioSheet');
  if (!sheet) return false;
  if (el && sheet.contains(el)) return true;
  var picked = __cdDestinyFlowerPickHitFromElementsStack(event);
  return !!(picked && sheet.contains(picked));
}

function __cdIsPointInsideElement(x, y, el) {
  if (!el || typeof x !== 'number' || typeof y !== 'number') return false;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  var rect = el.getBoundingClientRect();
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

if (typeof window !== 'undefined') {
  window.__cdIsInsideDestinyFlowerSheet = __cdIsInsideDestinyFlowerSheet;
  window.__cdResolveDestinyFlowerClickTarget = __cdResolveDestinyFlowerClickTarget;
}

function __cdParseActionArgs(raw) {
  if (!raw) return [];
  return raw
    .split(',')
    .map(function(v) { return v.trim(); })
    .filter(function(v) { return v.length > 0; });
}

function __cdCallGlobal(fnName) {
  var fn = window[fnName];
  if (typeof fn !== 'function') return undefined;
  var args = Array.prototype.slice.call(arguments, 1);
  return fn.apply(window, args);
}

function __cdHasAuthToken() {
  try {
    if (typeof window.hasAuthToken === 'function') return !!window.hasAuthToken();
  } catch (_) {}
  try {
    if (localStorage.getItem('fortune_auth_token') || '') return true;
    if (sessionStorage.getItem('fortune_auth_token') || '') return true;
    if (localStorage.getItem('fortune_auth_user') || '') return true;
  } catch (_) {}
  try {
    return document.cookie.indexOf('fortune_auth_role=') >= 0;
  } catch (_) {}
  return false;
}

function __cdResolveTileLockAliasKeys(lockKey) {
  var base = String(lockKey || '').trim();
  if (!base) return [];
  var map = Object.create(null);
  map[base] = true;
  if (base === 'olympus-profile-fc') map['olympus-fc'] = true;
  if (base === 'olympus-fc') map['olympus-profile-fc'] = true;
  var aliases = {
    flower_all: ['flower', 'flower-fc', 'flower-destiny', 'flower-astro', 'flower-ziwei', 'flower-sukuyo'],
    'flower-fc': ['flower', 'flower-destiny', 'flower-astro', 'flower-ziwei', 'flower-sukuyo'],
    flower: ['flower-fc', 'flower-destiny', 'flower-astro', 'flower-ziwei', 'flower-sukuyo'],
    'flower-destiny': ['flower-fc', 'flower'],
    'flower-astro': ['flower-fc', 'flower'],
    'flower-ziwei': ['flower-fc', 'flower'],
    'flower-sukuyo': ['flower-fc', 'flower'],
    allPaidSaju: ['all-paid-saju', 'rpgCharacter', 'travelDestiny', 'healthReport', 'secretHouseEpisodes', 'rpt_skillTreeCard', 'rpt_energyCoordCard', 'rpt_healthReportCard', 'rpt_secretHouseEntryCard'],
    'all-paid-saju': ['allPaidSaju', 'rpgCharacter', 'travelDestiny', 'healthReport', 'secretHouseEpisodes', 'rpt_skillTreeCard', 'rpt_energyCoordCard', 'rpt_healthReportCard', 'rpt_secretHouseEntryCard'],
    rpgCharacter: ['rpt_skillTreeCard'],
    rpt_skillTreeCard: ['rpgCharacter'],
    travelDestiny: ['rpt_energyCoordCard'],
    rpt_energyCoordCard: ['travelDestiny'],
    healthReport: ['health-report', 'rpt_healthReportCard', 'allPaidSaju', 'all-paid-saju'],
    'health-report': ['healthReport', 'rpt_healthReportCard', 'allPaidSaju', 'all-paid-saju'],
    rpt_healthReportCard: ['healthReport', 'health-report', 'allPaidSaju', 'all-paid-saju'],
    secretHouseEpisodes: ['rpt_secretHouseEntryCard'],
    rpt_secretHouseEntryCard: ['secretHouseEpisodes']
  }[base] || [];
  for (var i = 0; i < aliases.length; i += 1) map[aliases[i]] = true;
  return Object.keys(map);
}

function __cdMapHasTileLockUnlocked(mapObj, lockKey) {
  if (!mapObj || typeof mapObj !== 'object') return false;
  var aliases = __cdResolveTileLockAliasKeys(lockKey);
  for (var i = 0; i < aliases.length; i += 1) {
    if (mapObj[aliases[i]] === true) return true;
  }
  return false;
}

function __cdIsTileLockUnlocked(actionEl, lockKey) {
  if (!lockKey) return false;
  if (!__cdHasAuthToken()) return false;
  if (actionEl && actionEl.classList && actionEl.classList.contains('tarot-tile--tileUnlocked')) return true;
  if (!__cdTileLockServerSyncDone && !__cdTileLockServerSyncInFlight) {
    __cdSyncTileLocksFromServer();
  }
  try {
    if (window.unlockedFeatureMap && typeof window.unlockedFeatureMap === 'object') {
      if (__cdMapHasTileLockUnlocked(window.unlockedFeatureMap, lockKey)) return true;
    }
  } catch (_) {}
  try {
    var authRaw = localStorage.getItem('fortune_auth_user') || '';
    var auth = authRaw ? JSON.parse(authRaw) : null;
    var scopeRaw = auth && (auth.id || auth.userId || auth.email || auth.username || auth.loginId);
    var scope = String(scopeRaw || '').trim().toLowerCase();
    if (scope) {
      var scopedKey = 'cd_tile_locks_v2::' + scope;
      var scopedRaw = localStorage.getItem(scopedKey);
      if (scopedRaw) {
        var scopedMap = JSON.parse(scopedRaw);
        return __cdMapHasTileLockUnlocked(scopedMap, lockKey);
      }
      return false;
    }
  } catch (_) {}
  return false;
}

function __cdRequireTileLockGate(actionEl) {
  if (!actionEl) return true;
  if (actionEl.getAttribute('data-pvw-bypass')) return true;
  var lockKey = actionEl.getAttribute('data-tile-lock-key') || '';
  var lockCost = Number(actionEl.getAttribute('data-tile-lock-cost') || 0);
  if (!lockKey || lockCost <= 0) return true;

  if (!__cdHasAuthToken()) {
    if (window.confirm(_indexRuntimeText("indexRuntime.confirm.001"))) {
      window.location.href = '/login?next=%2F';
    }
    return false;
  }

  if (__cdIsTileLockUnlocked(actionEl, lockKey)) return true;

  if (typeof window._cdOpenTilePreview === 'function') {
    try {
      if (window._cdOpenTilePreview(actionEl)) return false;
    } catch (_) {}
  }

  window.alert('잠금된 서비스입니다. 해금 후 이용해 주세요.');
  return false;
}

var __cdTileLockServerSyncInFlight = false;
var __cdTileLockServerSyncDone = false;

function __cdGetAuthTokenForLockSync() {
  try {
    return String(localStorage.getItem('fortune_auth_token') || '');
  } catch (_) {}
  return '';
}

function __cdResolveApiBaseForLockSync() {
  try {
    if (window.CODE_DESTINY_API_BASE_URL) {
      return String(window.CODE_DESTINY_API_BASE_URL).replace(/\/+$/, '');
    }
  } catch (_) {}
  try {
    var custom = localStorage.getItem('fortune_api_base_url');
    if (custom) return String(custom).replace(/\/+$/, '');
  } catch (_) {}
  return window.location.origin;
}

function __cdGetTileLockScopeStorageKey() {
  try {
    var raw = localStorage.getItem('fortune_auth_user') || '';
    var user = raw ? JSON.parse(raw) : null;
    var scopeRaw = user && (user.id || user.userId || user.email || user.username || user.loginId);
    var scope = String(scopeRaw || '').trim().toLowerCase();
    if (!scope) return '';
    return 'cd_tile_locks_v2::' + scope;
  } catch (_) {}
  return '';
}

function __cdReadTileLockMapForSync() {
  var merged = Object.create(null);
  try {
    var scopedKey = __cdGetTileLockScopeStorageKey();
    if (scopedKey) {
      var scopedRaw = localStorage.getItem(scopedKey);
      if (scopedRaw) {
        var scopedMap = JSON.parse(scopedRaw);
        if (scopedMap && typeof scopedMap === 'object') {
          var scopedKeys = Object.keys(scopedMap);
          for (var i = 0; i < scopedKeys.length; i += 1) {
            if (scopedMap[scopedKeys[i]] === true) merged[scopedKeys[i]] = true;
          }
        }
      }
    }
  } catch (_) {}

  try {
    localStorage.removeItem('cd_tile_locks');
  } catch (_) {}

  var normalized = Object.create(null);
  var keys = Object.keys(merged);
  for (var k = 0; k < keys.length; k += 1) {
    var aliases = __cdResolveTileLockAliasKeys(keys[k]);
    for (var a = 0; a < aliases.length; a += 1) normalized[aliases[a]] = true;
  }
  return normalized;
}

function __cdNormalizeLockPayload(payload) {
  var data = null;
  var keys = Object.create(null);
  var list = [];
  try {
    if (payload && payload.ok === false) return list;
  } catch (_) {}

  try {
    if (payload && payload.data && typeof payload.data === 'object') {
      data = payload.data;
    } else if (payload && payload.raw && typeof payload.raw === 'object') {
      data = payload.raw;
    }

    if (!data || typeof data !== 'object') return list;

    if (data && Array.isArray(data.unlockedFeatures)) {
      for (var i = 0; i < data.unlockedFeatures.length; i += 1) {
        var feature = String(data.unlockedFeatures[i] || '').trim();
        if (feature && !keys[feature]) {
          keys[feature] = true;
          list.push(feature);
        }
      }
    }
    if (data && Array.isArray(data.unlockedContentKeys)) {
      for (var c = 0; c < data.unlockedContentKeys.length; c += 1) {
        var contentKey = String(data.unlockedContentKeys[c] || '').trim();
        if (contentKey && !keys[contentKey]) {
          keys[contentKey] = true;
          list.push(contentKey);
        }
      }
    }
    if (data && data.unlocks && typeof data.unlocks === 'object') {
      var contentMapKeys = Object.keys(data.unlocks);
      for (var u = 0; u < contentMapKeys.length; u += 1) {
        var contentMapKey = String(contentMapKeys[u] || '').trim();
        var unlockState = data.unlocks[contentMapKeys[u]];
        if (contentMapKey && unlockState && unlockState.unlocked === true && !keys[contentMapKey]) {
          keys[contentMapKey] = true;
          list.push(contentMapKey);
        }
      }
    }
    if (data && data.unlockMap && typeof data.unlockMap === 'object') {
      var mapKeys = Object.keys(data.unlockMap);
      for (var j = 0; j < mapKeys.length; j += 1) {
        var key = String(mapKeys[j] || '').trim();
        if (key && data.unlockMap[mapKeys[j]] === true && !keys[key]) {
          keys[key] = true;
          list.push(key);
        }
      }
    }
  } catch (_) {}

  return list;
}

function __cdWriteTileLockMapForSync(mapObj) {
  var safe = Object.create(null);
  if (mapObj && typeof mapObj === 'object') {
    var keys = Object.keys(mapObj);
    for (var i = 0; i < keys.length; i += 1) {
      if (mapObj[keys[i]] === true) safe[keys[i]] = true;
    }
  }

  try {
    var scopedKey = __cdGetTileLockScopeStorageKey();
    if (scopedKey) localStorage.setItem(scopedKey, JSON.stringify(safe));
  } catch (_) {}
  try {
    localStorage.removeItem('cd_tile_locks');
  } catch (_) {}
}

function __cdDispatchTileLockSyncEvent() {
  try {
    window.dispatchEvent(new CustomEvent('cd:tile-locks-updated'));
    return;
  } catch (_) {}
  try {
    var evt = document.createEvent('Event');
    evt.initEvent('cd:tile-locks-updated', true, true);
    window.dispatchEvent(evt);
  } catch (_) {}
}

function __cdMergeServerUnlockKeys(unlockKeys) {
  if (!Array.isArray(unlockKeys) || !unlockKeys.length) return false;
  var localMap = __cdReadTileLockMapForSync();
  var changed = false;
  try {
    if (!window.unlockedFeatureMap || typeof window.unlockedFeatureMap !== 'object') {
      window.unlockedFeatureMap = Object.create(null);
    }
  } catch (_) {}

  for (var i = 0; i < unlockKeys.length; i += 1) {
    var raw = String(unlockKeys[i] || '').trim();
    if (!raw) continue;
    var aliases = __cdResolveTileLockAliasKeys(raw);
    for (var a = 0; a < aliases.length; a += 1) {
      if (localMap[aliases[a]] !== true) {
        localMap[aliases[a]] = true;
        changed = true;
      }
      try {
        if (window.unlockedFeatureMap && typeof window.unlockedFeatureMap === 'object') {
          window.unlockedFeatureMap[aliases[a]] = true;
        }
      } catch (_) {}
    }
  }

  if (!changed) return false;
  __cdWriteTileLockMapForSync(localMap);
  return true;
}

function __cdSyncTileLocksFromServer() {
  if (!__cdHasAuthToken()) return;

  var currentProfile = window.__cdCurrentDestinyProfile && typeof window.__cdCurrentDestinyProfile === 'object'
    ? window.__cdCurrentDestinyProfile
    : {};
  var profileId = String(currentProfile.profileId || currentProfile.id || '').trim();
  if (!profileId) {
    __cdTileLockServerSyncDone = true;
    return;
  }

  var accessStore = window.CodeDestinyAccessStore;
  if (!accessStore || typeof accessStore.getSnapshot !== 'function') return;
  var snapshot = accessStore.getSnapshot() || {};
  if (snapshot.profileId && String(snapshot.profileId) !== profileId) return;
  var keys = Object.keys(snapshot.persistentUnlocks || {});
  if (!keys.length && snapshot.lastPayload) keys = __cdNormalizeLockPayload(snapshot.lastPayload);
  if (__cdMergeServerUnlockKeys(keys)) __cdDispatchTileLockSyncEvent();
  __cdTileLockServerSyncDone = Number(snapshot.checkedAt || 0) > 0;
}

function __cdScheduleTileLockServerSync() {
  if (__cdTileLockServerSyncDone) return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', __cdSyncTileLocksFromServer, { once: true });
  } else {
    __cdSyncTileLocksFromServer();
  }
}

// Locked-feature access is loaded only after an explicit lock/feature interaction or auth change.

var __cdTileLockAccessStore = window.CodeDestinyAccessStore;
if (__cdTileLockAccessStore && typeof __cdTileLockAccessStore.subscribe === 'function' && !window.__cdTileLockSnapshotUnsubscribe) {
  window.__cdTileLockSnapshotUnsubscribe = __cdTileLockAccessStore.subscribe(function() {
    __cdTileLockServerSyncDone = false;
    __cdSyncTileLocksFromServer();
  });
}

var __cdInlineRuntimeEvents = window.__cdInlineRuntimeEvents = window.__cdInlineRuntimeEvents || {};
// 인증 이벤트는 중앙 snapshot을 다시 읽기만 한다. 실제 네트워크 조회는 잠금 화면의 명시적 진입이 소유한다.
function __cdHandleRuntimeAuthChangedForTileLocks(event) {
  var detail = (event && event.detail && typeof event.detail === 'object') ? event.detail : {};
  var source = String(detail.source || '').toLowerCase();
  var ev = String(detail.event || '').toLowerCase();
  if ((source === 'subscription-sync' || source === 'membership-cache') && ev === 'subscription') return;
  __cdTileLockServerSyncDone = false;
  __cdSyncTileLocksFromServer();
}
if (typeof __cdInlineRuntimeEvents.authChangedForTileLocks === 'function') {
  window.removeEventListener('cd:auth-changed', __cdInlineRuntimeEvents.authChangedForTileLocks);
}
__cdInlineRuntimeEvents.authChangedForTileLocks = __cdHandleRuntimeAuthChangedForTileLocks;
window.addEventListener('cd:auth-changed', __cdInlineRuntimeEvents.authChangedForTileLocks);

function __cdEnsureSukuyoAIConsultationReady() {
  return new Promise(function(resolve) {
    var attempts = 0;
    function tick() {
      if (
        window.__sukyoAiConsultationPatchActive === true &&
        (typeof window.gotoSukuyoPremium === 'function' || typeof window.openSukuyoBookModal === 'function')
      ) {
        resolve(true);
        return;
      }
      attempts += 1;
      if (attempts >= 40) {
        resolve(false);
        return;
      }
      setTimeout(tick, 50);
    }
    tick();
  });
}

var __cdLazyActionLoaders = {
  openKemetModal: function() { return __cdLoadScriptOnce('/js/oracle-kcg.js?v=build-c4f38e10dd74'); },
  openDreamModal: function() { return __cdLoadScriptOnce('/js/dream-ledger.js?v=build-c4f38e10dd74'); },
  openPsychoDreamModal: function() { return __cdLoadScriptOnce('/js/psycho-dream-analyzer-freuds-study.js?v=build-c4f38e10dd74'); },
  openOlympusOracleModal: function() { return __cdLoadScriptOnce('/js/olympus-oracle.js'); },
  openHwatuModal: function() { return __cdLoadScriptOnce('/HwatuFortune.js?v=h5be3c5cb5489'); },
  openJuyukModal: function() { return __cdLoadScriptOnce('/js/iching-engine.js?v=build-c4f38e10dd74').then(function() { return __cdLoadScriptOnce('/js/iching-modal.js?v=build-c4f38e10dd74'); }); },
  openRuneOracle: function() { window.location.assign('/oracle/rune/'); return Promise.resolve(true); },
  openAnimalTotemModal: function() { return __cdLoadScriptOnce('/js/services/animal-totem-content-engine.js?v=build-c4f38e10dd74').then(function() { return __cdLoadScriptOnce('/js/animal-totem-experience.js?v=build-c4f38e10dd74'); }); },
  openDestinyEggPage: function() { return Promise.resolve(window.location.assign('/tadagochi.html')); },
  openTarotLoveModal: function() { return __cdLoadScriptOnce('/js/tarot-love-experience.js?v=build-c4f38e10dd74'); },
  openTarotReunionModal: function() { return __cdLoadScriptOnce('/js/tarot-reunion-experience.js?v=build-c4f38e10dd74'); },
  openTarotHealingModal: function() { return Promise.resolve(window.location.assign('/tarot/healing')); },
  openTarotHealingPage: function() { return Promise.resolve(window.location.assign('/tarot/healing')); },
  openTarotSelfEsteemModal: function() { return __cdLoadScriptOnce('/js/tarot-self-esteem-experience.js?v=build-c4f38e10dd74'); },
  openTarotYearFortuneModal: function() { return __cdLoadScriptOnce('/js/tarot-year-fortune-experience.js?v=build-c4f38e10dd74'); },
  openSibylModal: function() {
    return __cdLoadScriptOnce('/js/sibyl-system.js?v=build-c4f38e10dd74').then(function() {
      if (typeof window.openSibylModal === 'function') window.openSibylModal();
    });
  },
  goLoveSecretAi: function() { window.location.assign('/love-secret-ai'); return Promise.resolve(); },
  openLoveSecretModal: function() { window.location.assign('/love-secret-ai'); return Promise.resolve(); },
  closeLoveSecretModal: function() { return Promise.resolve(); },
  generateLoveSecret: function() { window.location.assign('/love-secret-ai'); return Promise.resolve(); },
  openLoveSecretLatestReport: function() { window.location.assign('/love-secret-ai'); return Promise.resolve(); },
  downloadLoveSecretPdf: function() { window.location.assign('/love-secret-ai'); return Promise.resolve(); },
  shareLoveSecretKakao: function() { return Promise.resolve(); },
  openLifeBookModal: function() { window.location.assign('/life-book-ai'); return Promise.resolve(); },
  closeLifeBookModal: function() { return Promise.resolve(); },
  generateLifeBook: function() { window.location.assign('/life-book-ai'); return Promise.resolve(); },
  openAstroBookModal: function() { window.location.assign('/astrology-ai'); return Promise.resolve(true); },
  closeAstroBookModal: function() { return Promise.resolve(true); },
  generateAstroBook: function() { window.location.assign('/astrology-ai'); return Promise.resolve(true); },
  downloadAstroBookPdf: function() { window.location.assign('/astrology-ai'); return Promise.resolve(true); },
  gotoAstrologyPremium: function() { window.location.assign('/astrology-ai'); return Promise.resolve(true); },
  gotoZiweiPremium: function() { return __cdGotoZiweiAi(); },
  openSajuNewYearModal: function() { window.location.assign('/new-year-ai-consultation'); return Promise.resolve(true); },
  closeSajuNewYearModal: function() { return Promise.resolve(true); },
  generateSajuNewYear: function() { window.location.assign('/new-year-ai-consultation'); return Promise.resolve(true); },
  downloadSajuNewYearPdf: function() { window.location.assign('/new-year-ai-consultation'); return Promise.resolve(true); },
  openVedicBookModal: function() { window.location.assign('/vedic-ai'); return Promise.resolve(true); },
  closeVedicBookModal: function() { window.location.assign('/vedic-ai'); return Promise.resolve(true); },
  generateVedicBook: function() { window.location.assign('/vedic-ai'); return Promise.resolve(true); },
  downloadVedicBookPdf: function() { window.location.assign('/vedic-ai'); return Promise.resolve(true); },
  gotoVedicPremium: function() { window.location.assign('/vedic-ai'); return Promise.resolve(true); },
  openSukuyoBookModal: function() { return __cdEnsureSukuyoAIConsultationReady(); },
  closeSukuyoBookModal: function() { return __cdEnsureSukuyoAIConsultationReady(); },
  generateSukuyoBook: function() { return __cdEnsureSukuyoAIConsultationReady(); },
  downloadSukuyoBookPdf: function() { return __cdEnsureSukuyoAIConsultationReady(); },
  gotoSukuyoPremium: function() { return __cdEnsureSukuyoAIConsultationReady(); },
  openLoveSimulation: function() { try { window.location.assign('/saju/love-simulation'); } catch(e) { window.open('/saju/love-simulation', '_self'); } return Promise.resolve(); },
  setTarotMode: function() { return __cdEnsureSajuCoreLoaded(); },
  selectTarotCategory: function() { return __cdEnsureSajuCoreLoaded(); },
  startTarotReading: function() { return __cdEnsureSajuCoreLoaded(); },
  flipTarotSpreadCard: function() { return __cdEnsureSajuCoreLoaded(); },
  showTarotFinalInterpretation: function() { return __cdEnsureSajuCoreLoaded(); },
  checkPrivacyAndCalculate: function() { return __cdEnsureSajuCoreLoaded(); },
  agreeAndCalculate: function() { return __cdEnsureSajuCoreLoaded(); },
  calculate: function() { return __cdEnsureSajuCoreLoaded(); },
  // 사주 입력 폼의 네 번째 액션. 형제들과 달리 이 레지스트리에도, 아래 스텁 목록에도 없어
  // 코어 로드 전 첫 탭이 버려졌다. 두 곳은 조회 경로가 달라(직접 window[action] 호출 vs
  // 레지스트리 조회) 서로를 대체하지 못하므로 형제들과 똑같이 양쪽에 둔다.
  setGender: function() { return __cdEnsureSajuCoreLoaded(); },
  runCompat: function() { return __cdEnsureSajuCoreLoaded(); },
  // 사주 결과 공유 버튼 3종. shareKakao/shareInstagram/shareSajuResultImage 는
  // js/share.js 안에 정의되는데 그 파일이 noncritical-defer-loader(첫 feature-intent
  // 탭/45초 타임아웃/백그라운드 전환 중 하나가 있어야 로드)로만 실려서, 결과 화면
  // 도달 후 첫 공유 탭이 아직 로드 전이면 조용히 아무 반응 없이 죽었다(setGender와
  // 같은 계열의 버그 — 위 주석 참고).
  shareKakao: function() { return __cdLoadScriptOnce('/js/share.js?v=build-c4f38e10dd74'); },
  shareInstagram: function() { return __cdLoadScriptOnce('/js/share.js?v=build-c4f38e10dd74'); },
  shareSajuResultImage: function() { return __cdLoadScriptOnce('/js/share.js?v=build-c4f38e10dd74'); }
};
window.__cdLazyActionLoaders = __cdLazyActionLoaders;
var __cdLazyActionState = {};

function __cdGotoZiweiAi() {
  window.location.assign('/ziwei-ai');
  return Promise.resolve(true);
}

window.gotoZiweiPremium = function gotoZiweiPremium() {
  return __cdGotoZiweiAi();
};

function __cdEnsureSibylSystemEntry() {
  try {
    var section = document.getElementById('sibylSystemSection');
    var modal = document.getElementById('sibylModal');

    if (section) {
      section.hidden = false;
      section.removeAttribute('hidden');
      if (section.style && section.style.display === 'none') section.style.display = '';

      var existingAction = section.querySelector('[data-action="openSibylModal"]');
      if (!existingAction && modal) {
        var fallbackTile = document.createElement('button');
        fallbackTile.type = 'button';
        fallbackTile.className = 'sibyl-entry-tile sibyl-entry-tile--fallback';
        fallbackTile.setAttribute('data-action', 'openSibylModal');
        fallbackTile.setAttribute('aria-label', '시빌라 사주 시스템 열기');
        fallbackTile.innerHTML = '<span>⚡ SIBYL SYSTEM 복원됨 · 탭하여 열기</span>';
        section.insertBefore(fallbackTile, section.firstChild || null);
      }
      return true;
    }

    if (!modal) return false;

    var fallbackSection = document.createElement('section');
    fallbackSection.className = 'saju-section-wrap';
    fallbackSection.id = 'sibylSystemSection';
    fallbackSection.innerHTML =
      '<button type="button" class="sibyl-entry-tile sibyl-entry-tile--fallback" data-action="openSibylModal" aria-label="' + _indexRuntimeText("indexRuntime.aria-label.001") + '">'
      + '<span>⚡ SIBYL SYSTEM 복원됨 · 탭하여 열기</span>'
      + '</button>';

    if (modal.parentNode) {
      modal.parentNode.insertBefore(fallbackSection, modal);
    } else {
      document.body.appendChild(fallbackSection);
    }
    return true;
  } catch (e) {
    console.warn('[SibylGuard] 섹션 복원 실패:', e);
    return false;
  }
}

if (typeof window !== 'undefined') {
  window.__cdEnsureSibylSystemEntry = __cdEnsureSibylSystemEntry;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      __cdEnsureSibylSystemEntry();
    }, { once: true });
  } else {
    __cdEnsureSibylSystemEntry();
  }
  window.addEventListener('pageshow', function() {
    __cdEnsureSibylSystemEntry();
  });
}

/**
 * INP: 클릭 직후 메인 스레드에서 동기 실행되던 무거운 핸들러(사주/궁합/리딩 등)를
 * setTimeout(0)으로 한 틱 미뤄 다음 페인트·입력 응답을 먼저 처리하게 한다.
 * (uiBindings.js 의 __CD_DEFER_INP_ACTIONS 와 동일 목록 유지)
 */
var __CD_DEFER_INP_ACTIONS = {
  checkPrivacyAndCalculate: 1,
  agreeAndCalculate: 1,
  calculate: 1,
  runCompat: 1,
  startTarotReading: 1,
  startTarotLoveReading: 1,
  startTarotHealingReading: 1,
  startTarotReunionReading: 1,
  startTarotSelfEsteemReading: 1,
  startDreamReading: 1,
  startKemetOracle: 1,
  startQuantumAnalysis: 1,
  startAnimalTotemRitual: 1,
  psychoDreamStartAnalysis: 1,
  showTarotFinalInterpretation: 1,
  showTarotLoveFinalReading: 1,
  showTarotHealingFinalReading: 1,
  showTarotReunionFinalReading: 1,
  showTarotSelfEsteemFinalReading: 1,
  dreamLibrarySearch: 1,
  dreamLibrarySearchByDream: 1,
  dreamLibraryLoadMore: 1,
  revealDreamStage: 1,
  nextDreamStage: 1
};

function __cdNormalizeScriptSrc(src) {
  var raw = String(src || '').trim().replace(/^\.\//, '');
  if (!raw) return '';
  if (/^(?:[a-z]+:)?\/\//i.test(raw) || raw.indexOf('data:') === 0 || raw.indexOf('blob:') === 0) return raw;
  if (raw.charAt(0) === '/') return raw;
  return '/' + raw;
}

function __cdLoadScriptOnce(src) {
  return new Promise(function(resolve, reject) {
    var norm = __cdNormalizeScriptSrc(src);
    if (!norm) {
      reject(new Error('missing src'));
      return;
    }

    var all = document.querySelectorAll('script[src]');
    var fileName = norm.split('?')[0].split('/').pop();
    var existing = null;
    for (var i = 0; i < all.length; i += 1) {
      var cur = all[i].getAttribute('src') || '';
      var curBase = cur.split('?')[0];
      if (cur === norm || curBase === norm.split('?')[0] || (fileName && curBase.indexOf('/' + fileName) !== -1)) {
        existing = all[i];
        break;
      }
    }

    if (existing) {
      if (existing.dataset.loaded === '1' || existing.readyState === 'complete' || existing.readyState === 'loaded') {
        resolve();
        return;
      }
      if (existing.dataset.loading !== '1') {
        resolve();
        return;
      }
      existing.addEventListener('load', function() { resolve(); }, { once: true });
      existing.addEventListener('error', function() { reject(new Error('load failed: ' + src)); }, { once: true });
      return;
    }

    var s = document.createElement('script');
    s.src = norm;
    s.defer = true;
    s.async = true;
    s.dataset.loading = '1';
    s.onload = function() {
      s.dataset.loading = '0';
      s.dataset.loaded = '1';
      resolve();
    };
    s.onerror = function() { reject(new Error('load failed: ' + src)); };
    document.head.appendChild(s);
  });
}

function __cdOpenZiweiPremiumFromCard(event) {
  var target = __cdResolveEventElement(event);
  if (!target || !target.closest) return;
  var card = target.closest('[data-action="gotoZiweiPremium"][data-ziwei-premium-card]');
  if (!card) return;
  if (event && event.cancelable) event.preventDefault();
  if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
  if (event && typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
  __cdGotoZiweiAi();
}

function __cdBindZiweiPremiumCardFallback() {
  if (window.__cdZiweiPremiumCardFallbackBound === 1) return;
  window.__cdZiweiPremiumCardFallbackBound = 1;
  document.addEventListener('click', __cdOpenZiweiPremiumFromCard, true);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', __cdBindZiweiPremiumCardFallback, { once: true });
} else {
  __cdBindZiweiPremiumCardFallback();
}

var __cdSajuCoreLoadPromise = null;
var __cdSwissEphLoadPromise = null;
var __cdLunarLibLoadPromise = null;
var __cdDestinyProfileLoadPromise = null;

function __cdHasLunarLibReady() {
  return (
    typeof window.Solar !== 'undefined' &&
    typeof window.Solar.fromYmdHms === 'function' &&
    typeof window.Lunar !== 'undefined' &&
    typeof window.Lunar.fromYmd === 'function'
  );
}

function __cdWaitForLunarLibReady(timeoutMs) {
  var ms = (typeof timeoutMs === 'number' && timeoutMs > 0) ? timeoutMs : 12000;
  return new Promise(function(resolve, reject) {
    if (__cdHasLunarLibReady()) {
      resolve(true);
      return;
    }
    var start = Date.now();
    var timer = setInterval(function() {
      if (__cdHasLunarLibReady()) {
        clearInterval(timer);
        resolve(true);
        return;
      }
      if (Date.now() - start >= ms) {
        clearInterval(timer);
        reject(new Error('lunar library timeout'));
      }
    }, 100);
  });
}

function __cdEnsureLunarLibReady() {
  if (__cdHasLunarLibReady()) return Promise.resolve(true);
  if (__cdLunarLibLoadPromise) return __cdLunarLibLoadPromise;

  __cdLunarLibLoadPromise = __cdLoadScriptOnce('/js/services/saju-library-loader.js')
    .then(function() {
      if (__cdHasLunarLibReady()) return true;

      var loader = window.SajuLibraryLoader;
      if (loader && typeof loader.loadNext === 'function') {
        var isLoading = (typeof loader.isLoading === 'function') ? loader.isLoading() : false;
        if (!isLoading) {
          loader.loadNext();
        }
        return __cdWaitForLunarLibReady(14000);
      }

      return __cdLoadScriptOnce('https://cdn.jsdelivr.net/npm/lunar-javascript@latest/lunar.min.js')
        .then(function() { return __cdWaitForLunarLibReady(7000); });
    })
    .then(function() { return true; })
    .catch(function(err) {
      __cdLunarLibLoadPromise = null;
      throw err;
    });

  return __cdLunarLibLoadPromise;
}

function __cdEnsureSajuCoreLoaded() {
  if (window.__cdSajuCoreReady === 1) return Promise.resolve(true);
  if (__cdSajuCoreLoadPromise) return __cdSajuCoreLoadPromise;

  var sajuAstroRolloutMarker = 'saju-astro-rollout-20260602';
  window.__cdSajuAstroRolloutMarker = sajuAstroRolloutMarker;

  var chain = [
    'https://cdn.jsdelivr.net/npm/lunar-javascript@latest/lunar.js',
    '/js/core/kasi-calendar-service.js?v=build-c4f38e10dd74',
    '/js/compat-llm-prompts.js?v=build-c4f38e10dd74',
    '/js/saju-engine.js?v=build-c4f38e10dd74',
      '/js/core/saju/extremeTResult.js?v=build-c4f38e10dd74',
      '/js/saju-engine-tarot-sukuyo-quantum.js?v=build-c4f38e10dd74',
    '/js/core/saju/modalProfileState.js?v=build-c4f38e10dd74',
    '/js/core/saju/reportDashboard.js?v=build-c4f38e10dd74',
    '/js/saju-engine-continuation.js?v=build-c4f38e10dd74',
    '/js/entertain-engine.js?v=build-c4f38e10dd74',
    /* 체인은 순차 reduce라 앞에 끼우면 이 파일의 실패가 뒤쪽 전체를 죽인다 — 신규 카드 스크립트는 맨 뒤에 둔다. */
    '/js/core/saju/dopamineResult.js?v=build-c4f38e10dd74'
  ];

  __cdSajuCoreLoadPromise = chain.reduce(function(promise, src) {
    return promise.then(function() { return __cdLoadScriptOnce(src); });
  }, Promise.resolve()).then(function() {
    window.__cdSajuCoreReady = 1;
    return true;
  }).catch(function(err) {
    __cdSajuCoreLoadPromise = null;
    throw err;
  });

  return __cdSajuCoreLoadPromise;
}

function __cdEnsureDestinyProfileLoaded() {
  if (window.DestinyProfileManager) return Promise.resolve(true);
  if (__cdDestinyProfileLoadPromise) return __cdDestinyProfileLoadPromise;

  __cdDestinyProfileLoadPromise = __cdLoadScriptOnce('/js/destiny-profile.js?v=build-c4f38e10dd74')
    .then(function() { return true; })
    .catch(function(err) {
      __cdDestinyProfileLoadPromise = null;
      throw err;
    });

  return __cdDestinyProfileLoadPromise;
}
// index.html 인라인 스코프(올림푸스 등 유료 잠금 진입)에서 정본 게이트 파일 로드를 보장하려면 window 노출 필요
window.__cdEnsureDestinyProfileLoaded = __cdEnsureDestinyProfileLoaded;

function __cdEnsureSwissEphLoaded() {
  if (window.__cdSwissEphReady === 1 && (window.swisseph || window.Swe || window.swe)) {
    window.__cdSwissEphReady = 1;
    return Promise.resolve(true);
  }
  if (__cdSwissEphLoadPromise) return __cdSwissEphLoadPromise;

  __cdSwissEphLoadPromise = new Promise(function(resolve, reject) {
    var src = '/js/swisseph-loader.js?v=build-c4f38e10dd74';
    var norm = __cdNormalizeScriptSrc(src);
    if (!norm) {
      reject(new Error('missing swisseph src'));
      return;
    }

    function bridgeReady() {
      return Boolean(
        (window.swisseph || window.Swe || window.swe) &&
        window.__swissephBridge &&
        window.__swissephBridge.ready === true &&
        window.__swissephSelfTest &&
        Number.isFinite(Number(window.__swissephSelfTest.sunLongitude)) &&
        Number.isFinite(Number(window.__swissephSelfTest.ascendant))
      );
    }

    function markReady() {
      window.__cdSwissEphReady = 1;
      resolve(true);
    }

    function waitForBridge() {
      if (bridgeReady()) {
        markReady();
        return;
      }

      var settled = false;
      var done = function(ok, reason) {
        if (settled) return;
        settled = true;
        window.removeEventListener('swisseph:ready', onReady);
        window.removeEventListener('swisseph:error', onError);
        if (ok && bridgeReady()) {
          markReady();
        } else {
          var detail = reason || (window.__swissephBridge && window.__swissephBridge.error) || 'SwissEph bridge did not become ready.';
          reject(new Error(detail));
        }
      };

      var onReady = function() { done(true); };
      var onError = function(event) {
        var error = event && event.detail && event.detail.error ? event.detail.error : _indexRuntimeText("indexRuntime.error.001");
        done(false, error);
      };
      window.addEventListener('swisseph:ready', onReady, { once: true });
      window.addEventListener('swisseph:error', onError, { once: true });
      setTimeout(function() { done(false, 'SwissEph loader timed out before self-test completed.'); }, 15000);
    }

    var all = document.querySelectorAll('script[src]');
    var existing = null;
    var normBase = norm.split('?')[0];
    for (var i = 0; i < all.length; i += 1) {
      var cur = all[i].getAttribute('src') || '';
      var curBase = cur.split('?')[0];
      if (curBase === normBase) {
        existing = all[i];
        break;
      }
    }

    if (existing) {
      if (existing.dataset.loaded === '1') {
        waitForBridge();
        return;
      }
      existing.addEventListener('load', waitForBridge, { once: true });
      existing.addEventListener('error', function() { reject(new Error('swisseph module load failed')); }, { once: true });
      return;
    }

    var s = document.createElement('script');
    s.type = 'module';
    s.src = norm;
    s.async = true;
    s.defer = true;
    s.dataset.loading = '1';
    s.onload = function() {
      s.dataset.loading = '0';
      s.dataset.loaded = '1';
      waitForBridge();
    };
    s.onerror = function() { reject(new Error('swisseph module load failed')); };
    document.head.appendChild(s);
  }).catch(function(err) {
    __cdSwissEphLoadPromise = null;
    throw err;
  });

  return __cdSwissEphLoadPromise;
}

if (typeof window !== 'undefined') {
  window.__cdEnsureSwissEphLoaded = __cdEnsureSwissEphLoaded;
}

function __cdInstallSajuActionStub(actionName) {
  if (!actionName) return;
  if (typeof window[actionName] === 'function') return;
  var stub = function() {
    var args = arguments;
    return __cdEnsureSajuCoreLoaded().then(function() {
      var fn = window[actionName];
      if (typeof fn === 'function' && fn !== stub) {
        return fn.apply(window, args);
      }
      return undefined;
    }).catch(function(err) {
      console.error('[index-inline-runtime] saju core lazy load failed:', actionName, err);
      return undefined;
    });
  };
  window[actionName] = stub;
}

function __cdBindSajuIntentPrefetch() {
  if (window.__cdSajuIntentPrefetchBound) return;
  window.__cdSajuIntentPrefetchBound = 1;

  var selectors = [
    '#birthDate',
    '#birthHour',
    '#birthMinute',
    '#birthCountry',
    '#btnF',
    '#btnM',
    '[data-action="checkPrivacyAndCalculate"]',
    '[data-action="agreeAndCalculate"]',
    '[data-action="calculate"]',
    '[data-action="runCompat"]'
  ].join(',');

  var trigger = function(event) {
    var target = __cdResolveEventElement(event);
    if (!target || !target.closest(selectors)) return;
    __cdEnsureSajuCoreLoaded().catch(function(err) {
      console.error('[index-inline-runtime] saju prefetch failed:', err);
    });
    document.removeEventListener('focusin', trigger, true);
    document.removeEventListener('pointerdown', trigger, true);
    document.removeEventListener('touchstart', trigger, true);
  };

  document.addEventListener('focusin', trigger, true);
  document.addEventListener('pointerdown', trigger, true);
  document.addEventListener('touchstart', trigger, true);
}

function __cdWarmupSajuInputsIfNeeded() {
  if (window.__cdSajuInputWarmupDone === 1) return;
  ['birthDate', 'birthHour', 'birthMinute', 'birthCountry', 'btnF', 'btnM'].forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    try {
      el.disabled = false;
      el.removeAttribute('disabled');
    } catch (e) {}
  });
  window.__cdSajuInputWarmupDone = 1;
}

function __cdNeedsSajuInputBootstrap() {
  var hourSel = document.getElementById('birthHour');
  var minuteSel = document.getElementById('birthMinute');
  var countrySel = document.getElementById('birthCountry');
  var infoDiv = document.getElementById('timeCorrectionInfo');

  var hourMissing = !!(hourSel && hourSel.options && hourSel.options.length === 0);
  var minuteMissing = !!(minuteSel && minuteSel.options && minuteSel.options.length === 0);
  var countryMissing = !!(countrySel && countrySel.options && countrySel.options.length <= 1);
  var infoBusy = !!(infoDiv && infoDiv.classList && infoDiv.classList.contains('time-correction-info--loading'));

  return hourMissing || minuteMissing || countryMissing || infoBusy;
}

function __cdRepairSajuInputsFallback() {
  __cdWarmupSajuInputsIfNeeded();

  var hourSel = document.getElementById('birthHour');
  var minuteSel = document.getElementById('birthMinute');
  var countrySel = document.getElementById('birthCountry');
  var infoDiv = document.getElementById('timeCorrectionInfo');

  if (hourSel && hourSel.options && hourSel.options.length === 0) {
    var hBuf = '';
    for (var h = 0; h < 24; h++) hBuf += '<option value="' + h + '">' + (h < 10 ? '0' : '') + h + '시</option>';
    hourSel.innerHTML = hBuf;
  }
  if (minuteSel && minuteSel.options && minuteSel.options.length === 0) {
    var mBuf = '';
    for (var m = 0; m < 60; m++) mBuf += '<option value="' + m + '">' + (m < 10 ? '0' : '') + m + '분</option>';
    minuteSel.innerHTML = mBuf;
  }

  if (hourSel) {
    var hVal = String(hourSel.value || '').trim();
    if (hVal === '' || isNaN(parseInt(hVal, 10))) hourSel.value = '12';
  }
  if (minuteSel) {
    var mVal = String(minuteSel.value || '').trim();
    if (mVal === '' || isNaN(parseInt(mVal, 10))) minuteSel.value = '0';
  }

  if (countrySel && countrySel.options && countrySel.options.length <= 1) {
    var first = countrySel.options[0] || null;
    if (!first) {
      first = document.createElement('option');
      countrySel.appendChild(first);
    }
    first.value = first.value || 'Asia/Seoul';
    first.textContent = '대한민국 · 서울';
    first.setAttribute('data-long', first.getAttribute('data-long') || '127.0');
    first.setAttribute('data-lat', first.getAttribute('data-lat') || '37.6');
    first.setAttribute('data-tz', first.getAttribute('data-tz') || '9');
    first.setAttribute('data-base-tz', first.getAttribute('data-base-tz') || first.getAttribute('data-tz') || '9');
    countrySel.selectedIndex = 0;
  }

  if (typeof window.updateCorrectedTimePreview === 'function') {
    try {
      window.updateCorrectedTimePreview();
      return;
    } catch (err) {
      console.error('[index-inline-runtime] fallback updateCorrectedTimePreview failed:', err);
    }
  }

  if (infoDiv) {
    infoDiv.classList.remove('time-correction-info--loading');
    infoDiv.setAttribute('aria-busy', 'false');
    if (!infoDiv.innerHTML || infoDiv.innerHTML.indexOf('불러오는 중') >= 0) {
      infoDiv.innerHTML = '🌍 <b>시간 보정 미리보기</b><br><span style="font-size:0.75rem;">기준 UTC+9, 기본 출생지(서울)로 계산됩니다.</span>';
    }
  }
}

function __cdBootstrapSajuInputsOnLoad() {
  if (window.__cdSajuBootstrapAttempted === 1) return;
  if (!__cdNeedsSajuInputBootstrap()) return;

  window.__cdSajuBootstrapAttempted = 1;
  // 홈 첫 진입에서 시간 보정 안내의 스켈레톤만으로 대형 사주 엔진 체인을 즉시 내려받으면,
  // 아직 운세 입력을 시작하지 않은 방문자도 계산용 JS 약 1MB를 파싱하게 된다. 정적 기본값으로
  // 입력을 즉시 사용할 수 있게 만든 뒤, 실제 focus/pointer intent는 __cdBindSajuIntentPrefetch가
  // 기존과 동일하게 전체 엔진을 보장한다. 이는 결제·계산·결과 흐름을 바꾸지 않는다.
  __cdRepairSajuInputsFallback();
}

window.__cdEnsureSajuCoreLoaded = __cdEnsureSajuCoreLoaded;
__cdInstallSajuActionStub('checkPrivacyAndCalculate');
__cdInstallSajuActionStub('agreeAndCalculate');
__cdInstallSajuActionStub('calculate');
__cdInstallSajuActionStub('runCompat');
// 성별 토글도 saju-engine.js(지연 로드)의 setGender 가 처리한다. 스텁이 없으면 코어가 오기 전의
// 첫 탭은 window.setGender 가 없어 그대로 버려지고, 'on' 클래스가 안 움직여 선택이 시각적으로도
// 먹지 않는다(그 클래스가 다른 소비자들의 성별 원천이다 — 이 파일 7856행).
__cdInstallSajuActionStub('setGender');
__cdInstallSajuActionStub('openAnimalDestinyRoute');
__cdInstallSajuActionStub('openDestinyMeetingPlaceRoute');
window.openFortunePlanner = function() {
  return __cdLoadScriptOnce('/js/luck-sync-diary.js?v=build-c4f38e10dd74').then(function() {
    if (window.LuckSyncDiary && typeof window.LuckSyncDiary.open === 'function') return window.LuckSyncDiary.open();
    throw new Error('fortune planner is unavailable');
  }).catch(function(err) {
    console.error('[index-inline-runtime] fortune planner open failed:', err);
  });
};
window.openLuckSyncDiary = window.openFortunePlanner;
(function openFortunePlannerFromLegacyRoute() {
  if (location.pathname !== '/' || !/[?&]fortunePlanner=1(?:&|$)/.test(location.search)) return;
  var open = function() { window.openFortunePlanner(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', open, { once:true }); else open();
})();
window.openNevilleMeditationPage = function() {
  try {
    window.location.href = '/neville-meditation.html';
  } catch (err) {
    console.error('[index-inline-runtime] openNevilleMeditationPage failed:', err);
  }
};
window.openCosmicSoulMeditation = function() {
  try {
    window.location.href = '/cosmic-soul-meditation.html';
  } catch (err) {
    console.error('[index-inline-runtime] openCosmicSoulMeditation failed:', err);
  }
};
window.openYogaGuru = function() {
  try {
    window.location.href = '/yoga-guru.html';
  } catch (err) {
    console.error('[index-inline-runtime] openYogaGuru failed:', err);
  }
};
window.openDestinyEggPage = function() {
  try {
    window.location.href = '/tadagochi.html';
  } catch (err) {
    console.error('[index-inline-runtime] openDestinyEggPage failed:', err);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    __cdEnsureDestinyProfileLoaded().catch(function(err) {
      console.error('[index-inline-runtime] destiny profile auto-load failed:', err);
    });
    __cdBindSajuIntentPrefetch();
    __cdWarmupSajuInputsIfNeeded();
    __cdBootstrapSajuInputsOnLoad();
  }, { once: true });
} else {
  __cdEnsureDestinyProfileLoaded().catch(function(err) {
    console.error('[index-inline-runtime] destiny profile auto-load failed:', err);
  });
  __cdBindSajuIntentPrefetch();
  __cdWarmupSajuInputsIfNeeded();
  __cdBootstrapSajuInputsOnLoad();
}

function __cdInvokeActionWithConfig(action, actionEl, event, args) {
  var passSelfMode = actionEl.getAttribute('data-action-pass-self');
  var passEvent = actionEl.getAttribute('data-action-pass-event') === '1';
  if (passSelfMode === 'append') return __cdCallGlobal.apply(null, [action].concat(args, [actionEl]));
  if (passSelfMode === '1' || passSelfMode === 'prepend') return __cdCallGlobal.apply(null, [action, actionEl].concat(args));
  if (passEvent) return __cdCallGlobal(action, event);
  if (args.length) return __cdCallGlobal.apply(null, [action].concat(args));
  return __cdCallGlobal(action);
}

function __cdScheduleAfterActionScroll(actionEl) {
  if (!actionEl || !actionEl.getAttribute) return;
  var targetId = actionEl.getAttribute('data-after-action-scroll-target');
  if (!targetId) return;
  window.setTimeout(function() {
    var focusTarget = document.getElementById(targetId);
    if (!focusTarget || typeof focusTarget.scrollIntoView !== 'function') return;
    focusTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
    var firstInput = focusTarget.querySelector('input, select, textarea, button');
    if (firstInput && typeof firstInput.focus === 'function') {
      try { firstInput.focus({ preventScroll: true }); } catch (_) { firstInput.focus(); }
    }
  }, 220);
}

function __cdInvokeAction(action, actionEl, event) {
  if (!action || !actionEl) return;
  if (!__cdRequireTileLockGate(actionEl)) return;

  var args = __cdParseActionArgs(actionEl.getAttribute('data-action-args'));

  function runInvoke() {
    var out = __cdInvokeActionWithConfig(action, actionEl, event, args);
    __cdScheduleAfterActionScroll(actionEl);

    var loader = __cdLazyActionLoaders[action];
    var hasFn = typeof window[action] === 'function';
    if (!loader || hasFn || out !== undefined) return;

    if (!__cdLazyActionState[action]) {
      __cdLazyActionState[action] = loader().catch(function(err) {
        __cdLazyActionState[action] = null;
        console.error('[index-inline-runtime] lazy action load failed:', action, err);
        throw err;
      });
    }

    __cdLazyActionState[action].then(function() {
      if (typeof window[action] !== 'function') {
        if (action === 'openOlympusOracleModal' && typeof window._dpOpenFortuneType === 'function') {
          window._dpOpenFortuneType('olympus');
        } else if (action === 'openLuckSyncDiary' && window.LuckSyncDiary && typeof window.LuckSyncDiary.open === 'function') {
          window.LuckSyncDiary.open();
        } else if (action === 'closeLuckSyncDiary' && window.LuckSyncDiary && typeof window.LuckSyncDiary.close === 'function') {
          window.LuckSyncDiary.close();
        }
        return;
      }
      try {
        __cdInvokeActionWithConfig(action, actionEl, event, args);
      } catch (err) {
        if (action === 'openOlympusOracleModal' && typeof window._dpOpenFortuneType === 'function') {
          window._dpOpenFortuneType('olympus');
          return;
        }
        throw err;
      }
    }).catch(function() {});
  }

  if (__CD_DEFER_INP_ACTIONS[action]) {
    setTimeout(runInvoke, 0);
    return;
  }
  runInvoke();
}

function __cdBindActionEventFallback(root, eventName, attrName) {
  root.addEventListener(eventName, function(event) {
    var target = __cdResolveEventElement(event);
    if (!target) return;
    var actionEl = target.closest('[' + attrName + ']');
    if (!actionEl) return;
    var action = actionEl.getAttribute(attrName);
    if (!action) return;
    __cdInvokeAction(action, actionEl, event);
  });
}

function __cdHydrateCollectionImagesChunked(collection, forceHydrateAll) {
  if (!collection) return;
  // 모바일에서도 데스크톱과 동일하게 전 컬렉션의 이미지를 하이드레이션한다.
  // 예전에는 목록형 7개 컬렉션을 여기서 걸러내 심볼만 남겼는데, 컬렉션은 접힌 상태로 시작하고
  // 펼칠 때만(__cdScheduleCollectionHydration) 이 함수가 돌며 IntersectionObserver 로
  // 뷰포트 진입분만 받아오므로, 한 번에 받는 이미지는 최대 12장(타로) 수준이다.
  var wraps = collection.querySelectorAll('.tarot-tile__img-wrap[data-img-src]');
  var ioEnabled = typeof IntersectionObserver !== 'undefined';
  var r2AssetBase = 'https://assets.code-destiny.com/';
  var localAssetKeys = {
    'saju-guardian-animal-v20260615.webp': true,
    // R2 에 올라가 있지 않아 리사이즈·원본이 모두 404 다. 로컬 경로로 바로 간다.
    'comprehensive-fortune-prompt.webp': true
  };

  function splitCollectionImagePath(src) {
    var raw = String(src || '').trim();
    var queryIndex = raw.indexOf('?');
    var hashIndex = raw.indexOf('#');
    var suffixIndex = -1;
    if (queryIndex >= 0 && hashIndex >= 0) suffixIndex = Math.min(queryIndex, hashIndex);
    else suffixIndex = Math.max(queryIndex, hashIndex);
    if (suffixIndex < 0) return { path: raw, suffix: '' };
    return { path: raw.slice(0, suffixIndex), suffix: raw.slice(suffixIndex) };
  }

  function encodeCollectionAssetKey(objectKey) {
    return String(objectKey || '').replace(/^\/+/, '').split('/').map(function(part) {
      try {
        return encodeURIComponent(decodeURIComponent(part));
      } catch (_) {
        return encodeURIComponent(part);
      }
    }).join('/');
  }

  function buildR2CollectionAssetUrl(objectKey, suffix) {
    var decodedKey = String(objectKey || '').replace(/^\/+/, '');
    try {
      decodedKey = decodeURIComponent(decodedKey);
    } catch (_) {}
    if (localAssetKeys[decodedKey]) return '';
    var encodedKey = encodeCollectionAssetKey(objectKey);
    if (!encodedKey) return '';
    return r2AssetBase + encodedKey + (suffix || '');
  }

  // R2 원본은 1300~1500px 가로 배너라 장당 150~200KB다. 카드에 그릴 실제 크기는 그 1/3 이하이므로
  // Cloudflare Image Resizing(/cdn-cgi/image/)으로 필요한 폭만 받아온다(장당 약 20~40KB).
  // 폭은 80px 버킷으로 반올림해 CDN 캐시 키가 잘게 쪼개지지 않게 한다.
  // 리사이즈가 실패하면 bindCollectionImageFallback 이 원본 R2 주소로 되돌린다.
  function buildResizedCollectionImageUrl(r2Url, wrap) {
    var raw = String(r2Url || '');
    if (raw.indexOf(r2AssetBase) !== 0) return '';
    if (raw.indexOf('/cdn-cgi/') >= 0) return '';
    var dpr = 1;
    var cssWidth = 0;
    var maxCss = 400;
    try {
      dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
      cssWidth = (wrap && wrap.clientWidth) || 0;
      // 하이드레이션은 2열 레이아웃이 확정되기 전에 돌 수 있어 clientWidth 가 1열 기준(≈뷰포트 폭)으로
      // 잡히곤 한다. 그대로 쓰면 필요보다 두 배 큰 이미지를 받는다 — 뷰포트로 상한을 건다.
      var isNarrow = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
      maxCss = isNarrow ? Math.ceil(window.innerWidth / 2) : window.innerWidth;
    } catch (_) {}
    if (!cssWidth) cssWidth = maxCss;
    cssWidth = Math.min(cssWidth, maxCss);
    var target = Math.ceil((cssWidth * dpr) / 80) * 80;
    if (target < 240) target = 240;
    if (target > 960) target = 960;
    return r2AssetBase + 'cdn-cgi/image/width=' + target + ',quality=72,format=auto/' + raw.slice(r2AssetBase.length);
  }

  function resolveCollectionImageSrc(src) {
    var raw = String(src || '').trim();
    if (!raw) return raw;
    if (raw.indexOf(r2AssetBase) === 0) return raw;
    var parts = splitCollectionImagePath(raw);
    var path = parts.path;
    if (path.indexOf('/fuctionassets/') === 0) return buildR2CollectionAssetUrl(path.slice('/fuctionassets/'.length), parts.suffix) || raw;
    if (path.indexOf('fuctionassets/') === 0) return buildR2CollectionAssetUrl(path.slice('fuctionassets/'.length), parts.suffix) || raw;
    if (path.indexOf('/images/') === 0) return buildR2CollectionAssetUrl(path.slice('/images/'.length), parts.suffix) || raw;
    if (path.indexOf('images/') === 0) return buildR2CollectionAssetUrl(path.slice('images/'.length), parts.suffix) || raw;
    try {
      var url = new URL(raw, window.location.href);
      if (url.origin === 'https://code-destiny.com' || url.origin === window.location.origin) {
        if (url.pathname.indexOf('/fuctionassets/') === 0) return buildR2CollectionAssetUrl(url.pathname.slice('/fuctionassets/'.length), url.search + url.hash) || raw;
        if (url.pathname.indexOf('/images/') === 0) return buildR2CollectionAssetUrl(url.pathname.slice('/images/'.length), url.search + url.hash) || raw;
      }
    } catch (_) {}
    return raw;
  }

  /* 폴백은 하나가 아니라 순서 있는 목록이다.
     예전에는 "리사이즈 → R2 원본" 한 단계뿐이라, R2 에 아직 올라가지 않은 자산은
     두 주소가 모두 404 가 되면서 마크업에 원래 박혀 있던(그리고 실제로는 200 인)
     /fuctionassets/… 경로로 되돌아갈 길이 없어 이미지가 통째로 사라졌다. */
  function bindCollectionImageFallback(img, fallbackSrc, placeholder, skeleton) {
    if (!img) return;
    var list = Object.prototype.toString.call(fallbackSrc) === '[object Array]' ? fallbackSrc : [fallbackSrc];
    var currentSrc = img.getAttribute('src');
    var chain = [];
    for (var i = 0; i < list.length; i += 1) {
      var candidate = String(list[i] || '').trim();
      if (!candidate || candidate === currentSrc) continue;
      if (chain.indexOf(candidate) < 0) chain.push(candidate);
    }
    img.__cdImgFallbackChain = chain;
    // 이 속성을 읽는 다른 코드가 있어 첫 후보는 그대로 노출한다.
    if (chain.length) img.setAttribute('data-cd-img-fallback-src', chain[0]);
    else img.removeAttribute('data-cd-img-fallback-src');
    if (skeleton) {
      img.addEventListener('load', function() { skeleton.remove(); }, { once: true });
    }
    if (img.dataset && img.dataset.cdCollectionFallbackBound === '1') return;
    if (img.dataset) img.dataset.cdCollectionFallbackBound = '1';
    img.addEventListener('error', function() {
      var rest = img.__cdImgFallbackChain || [];
      var next = rest.shift();
      if (next) {
        if (rest.length) img.setAttribute('data-cd-img-fallback-src', rest[0]);
        else img.removeAttribute('data-cd-img-fallback-src');
        img.src = next;
        return;
      }
      if (skeleton) skeleton.remove();
      img.remove();
      if (placeholder) placeholder.style.display = '';
    });
  }

  function hydrateWrap(wrap) {
    if (!wrap) return;
    var src = wrap.getAttribute('data-img-src');
    if (!src) return;
    var resolvedSrc = resolveCollectionImageSrc(src);
    var fallbackSrc = resolvedSrc === src ? '' : src;
    var alt = wrap.getAttribute('data-img-alt') || '';
    var placeholder = wrap.querySelector('.tarot-tile__img-placeholder');

    var existingImg = wrap.querySelector('img.tarot-tile__img');
    if (existingImg) {
      var existingSrc = existingImg.getAttribute('src') || src;
      var resolvedExistingSrc = resolveCollectionImageSrc(existingSrc);
      // 마크업에 박혀 있는 정적 <img> 도 같은 리사이즈 경로를 태운다 — 이쪽이 오히려 원본(80~200KB)을
      // 그대로 받고 있었다.
      var resizedExisting = buildResizedCollectionImageUrl(resolvedExistingSrc, wrap);
      // 리사이즈 → R2 원본 → 마크업에 박혀 있던 원래 경로 순으로 물러난다.
      var existingFallback = [resizedExisting ? resolvedExistingSrc : '', existingSrc];
      var nextSrc = resizedExisting || resolvedExistingSrc;
      if (nextSrc && nextSrc !== existingSrc) {
        // 체인은 "바인딩 시점의 src" 와 같은 후보를 중복으로 보고 걸러낸다. 먼저 바인딩하면
        // 마크업의 원래 경로(/fuctionassets/…)가 아직 현재 src 라 체인에서 빠지고, R2 에 없는
        // 자산은 리사이즈·R2 원본이 모두 404 가 되면서 물러날 곳이 없어 img 가 통째로 제거된다.
        // src 를 먼저 바꾼 뒤 바인딩해야 원래 경로가 마지막 후보로 남는다.
        existingImg.loading = 'eager';
        existingImg.src = nextSrc;
        bindCollectionImageFallback(existingImg, existingFallback, placeholder, null);
      } else if (nextSrc && !(existingImg.complete && existingImg.naturalWidth > 0)) {
        // 닫힌(=display:none) 컬렉션 안에서 파싱된 loading="lazy" 이미지는 나중에 컬렉션이 열려도
        // 크로미움이 요청을 다시 걸지 않는다. src 는 그대로 둔 채 노드만 새로 붙여 한 번 깨운다.
        var revived = existingImg.cloneNode(false);
        revived.loading = 'eager';
        if (revived.dataset) delete revived.dataset.cdCollectionFallbackBound;
        bindCollectionImageFallback(revived, existingFallback, placeholder, null);
        existingImg.parentNode.replaceChild(revived, existingImg);
      }
      return;
    }

    if (placeholder) placeholder.style.display = 'none';

    var skeleton = document.createElement('div');
    skeleton.className = 'tarot-tile__img-skeleton';
    wrap.insertBefore(skeleton, wrap.firstChild);

    var isPriorityImage = !!(wrap.closest && wrap.closest('.cd-prompt-feature-spotlight'));
    var img = document.createElement('img');
    img.className = 'tarot-tile__img';
    // 이 함수는 IntersectionObserver 가 뷰포트 진입을 확인한 뒤에만 불린다 — 즉 지연로딩은 이미
    // 우리 쪽에서 끝났다. 여기에 loading="lazy" 를 또 걸면 브라우저가 자체 판단으로 요청을
    // 미뤄 이미지가 영영 안 뜨는 경우가 생긴다(지연 장치 두 개가 서로를 기다림).
    img.loading = 'eager';
    img.fetchPriority = isPriorityImage ? 'high' : 'low';
    img.decoding = 'async';
    img.width = 200;
    img.height = 150;
    img.alt = alt;
    var resizedSrc = buildResizedCollectionImageUrl(resolvedSrc, wrap);
    // 리사이즈본 → 원본 R2 → 마크업의 원래 경로 → 그래도 안 되면 심볼 플레이스홀더.
    bindCollectionImageFallback(img, [resizedSrc ? resolvedSrc : '', fallbackSrc, src], placeholder, skeleton);
    img.src = resizedSrc || resolvedSrc;
    wrap.insertBefore(img, wrap.firstChild);
  }

  if (!ioEnabled || forceHydrateAll) {
    __cdRunChunked(wraps, function(wrap) {
      hydrateWrap(wrap);
    }, { minBatch: 2, maxBatch: 8, budgetMs: 7 });
    return;
  }

  var grid = collection.querySelector('.feat-collection__grid, .tarot-collection__grid');
  var observer = collection.__cdCollectionImageObserver;
  if (!observer) {
    observer = new IntersectionObserver(function(entries, obs) {
      for (var i = 0; i < entries.length; i++) {
        if (!entries[i].isIntersecting) continue;
        var wrap = entries[i].target;
        obs.unobserve(wrap);
        if (wrap && wrap.dataset) {
          delete wrap.dataset.cdImgObserved;
        }
        hydrateWrap(wrap);
      }
    }, {
      root: grid || null,
      rootMargin: '96px 0px',
      threshold: 0.01
    });
    collection.__cdCollectionImageObserver = observer;
  }

  __cdRunChunked(wraps, function(wrap) {
    if (!wrap || wrap.querySelector('img.tarot-tile__img')) return;
    if (wrap.dataset && wrap.dataset.cdImgObserved === '1') return;
    if (wrap.dataset) wrap.dataset.cdImgObserved = '1';
    observer.observe(wrap);
  }, { minBatch: 2, maxBatch: 10, budgetMs: 7 });
}

function __cdScheduleCollectionHydration(collection, forceHydrateAll) {
  var start = function() { __cdHydrateCollectionImagesChunked(collection, forceHydrateAll); };
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(start, { timeout: 350 });
    return;
  }
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(start);
    return;
  }
  setTimeout(start, 0);
}

function __cdReleaseCollectionImagesChunked(collection) {
  if (!collection) return;
  var observer = collection.__cdCollectionImageObserver;
  if (observer && typeof observer.disconnect === 'function') {
    observer.disconnect();
  }
  collection.__cdCollectionImageObserver = null;

  var observedWraps = collection.querySelectorAll('.tarot-tile__img-wrap[data-img-src][data-cd-img-observed]');
  __cdRunChunked(observedWraps, function(wrap) {
    if (!wrap || !wrap.dataset) return;
    delete wrap.dataset.cdImgObserved;
  }, { minBatch: 12, maxBatch: 30, budgetMs: 5 });

  var imgs = collection.querySelectorAll('.tarot-tile__img-wrap img.tarot-tile__img');
  var skeletons = collection.querySelectorAll('.tarot-tile__img-wrap .tarot-tile__img-skeleton');
  var placeholders = collection.querySelectorAll('.tarot-tile__img-wrap .tarot-tile__img-placeholder');

  __cdRunChunked(imgs, function(img) {
    img.remove();
  }, { minBatch: 8, maxBatch: 24, budgetMs: 6 }).then(function() {
    return __cdRunChunked(skeletons, function(sk) {
      sk.remove();
    }, { minBatch: 8, maxBatch: 24, budgetMs: 6 });
  }).then(function() {
    return __cdRunChunked(placeholders, function(placeholder) {
      placeholder.style.display = '';
    }, { minBatch: 8, maxBatch: 30, budgetMs: 6 });
  });
}

function __cdBindCollectionToggleHydration() {
  if (typeof document === 'undefined') return;
  if (window.__cdCollectionToggleHydrationBound) return;
  window.__cdCollectionToggleHydrationBound = true;
  document.addEventListener('cd:collection-toggle', function(event) {
    var detail = event && event.detail ? event.detail : {};
    var targetId = String(detail.targetId || '').trim();
    if (!targetId) return;
    var collection = document.getElementById(targetId);
    if (!collection) return;
    if (detail.isOpen === true) {
      __cdScheduleCollectionHydration(collection, true);
    } else if (detail.isOpen === false) {
      __cdReleaseCollectionImagesChunked(collection);
    }
  });
}

function __cdSchedulePromptSpotlightHydration() {
  if (typeof document === 'undefined') return;
  var start = function() {
    var spotlights = document.querySelectorAll('.cd-prompt-feature-spotlight');
    __cdRunChunked(spotlights, function(spotlight) {
      __cdScheduleCollectionHydration(spotlight, true);
    }, { minBatch: 1, maxBatch: 3, budgetMs: 4 });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
    return;
  }
  start();
}

__cdBindCollectionToggleHydration();
__cdSchedulePromptSpotlightHydration();

function __cdBindGlobalActionsFallback() {
  if (window.__codeDestinyGlobalActionsBound) return;
  window.__codeDestinyGlobalActionsBound = 'fallback';

  var root = document;
  root.addEventListener('click', function(event) {
    var target = __cdResolveEventElement(event);
    if (!target) return;
    var actionEl = target.closest('[data-action]');
    if (!actionEl) return;

    var action = actionEl.getAttribute('data-action');
    if (!action) return;

    if (actionEl.getAttribute('data-action-self-only') === '1' && target !== actionEl) {
      return;
    }

    if (actionEl.getAttribute('data-action-stop-propagation') === '1') {
      event.stopPropagation();
    }

    if (action === 'changeLanguage') {
      var lang = actionEl.getAttribute('data-lang');
      if (lang) {
        __cdCallGlobal('changeLanguage', lang, actionEl);
      }
      return;
    }

    if (action === 'toggleCollection') {
      // 모바일 "모든 운세" 오버레이가 이미 이 컬렉션을 열고 있으면 그쪽이 유일한 소유자다.
      if (window.cdMobileCollectionFullscreen && window.cdMobileCollectionFullscreen.isOpen()) return;
      var targetId = actionEl.getAttribute('data-target');
      var collection = targetId ? document.getElementById(targetId) : null;
      if (!collection) return;

      var isOpen = collection.getAttribute('data-collection-open') === 'true';
      var newState = !isOpen;

      collection.setAttribute('data-collection-open', String(newState));
      actionEl.setAttribute('aria-expanded', String(newState));
      if (typeof window.cdApplyCollectionToggleHintTexts === 'function') {
        window.cdApplyCollectionToggleHintTexts(cdGetCurrentLang());
      }

      document.dispatchEvent(new CustomEvent('cd:collection-toggle', {
        detail: { targetId: targetId, isOpen: newState }
      }));

      var currentLabel = actionEl.getAttribute('aria-label') || '';
      if (currentLabel) {
        actionEl.setAttribute('aria-label', currentLabel.replace(/열기|닫기/, newState ? '닫기' : '열기'));
      }

      if (newState) {
        __cdScheduleCollectionHydration(collection);
      } else {
        __cdReleaseCollectionImagesChunked(collection);
      }
      return;
    }

    // 시빌라 진입 타일과 타로/기능 컬렉션 타일은 SEO/크롤용 <a href>이지만 모달·프리뷰를
    // 제자리에서 열어야 한다. 앵커 기본 이동을 막지 않으면 클릭 시 제자리 오픈과 전체 페이지
    // 이동이 동시에 발생해 리딩이 안 열리는 회귀가 생긴다(커밋 49118133에서 button→a 전환 후 노출).
    // 단, 실제로 열어줄 모달/액션 핸들러가 없는 순수 이동형 타일(무료 심리테스트 허브 등)까지
    // preventDefault로 막으면 클릭이 아무 반응 없이 죽는다 — 핸들러 존재 여부를 함께 확인한다.
    var hasRealActionHandler = !!__cdLazyActionLoaders[action] || typeof window[action] === 'function';
    if (hasRealActionHandler
      && actionEl.tagName === 'A'
      && actionEl.getAttribute('href')
      && event && event.cancelable
      && !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      && (event.button === undefined || event.button === 0)
      && (action === 'openSibylModal'
        || __cdRouteActionAllowList[action]
        || actionEl.closest('.tarot-collection__grid, .feat-collection__grid'))) {
      event.preventDefault();
    }

    __cdInvokeAction(action, actionEl, event);
  });

  /* 모바일: modal-top-nav 닫기 버튼 touchend 폴백 (로딩 중 발동 방지: 해당 overlay가 실제 표시 중일 때만) */
  var _cdPageLoadTime = Date.now();
  root.addEventListener('touchend', function(event) {
    var target = __cdResolveEventElement(event);
    if (!target) return;
    var actionEl = target.closest('[data-action]');
    if (!actionEl) return;
    var nav = actionEl.closest('.modal-top-nav');
    if (!nav) return;
    var overlay = nav.closest('[id$="ModalOverlay"]');
    if (!overlay) return;
    var computed = window.getComputedStyle ? window.getComputedStyle(overlay) : null;
    if (computed && computed.display === 'none') return;
    if (Date.now() - _cdPageLoadTime < 600) return;
    var action = actionEl.getAttribute('data-action');
    if (!action) return;
    if (action !== 'closeCurrentPage' && action !== 'closeSukuyoModal' && action !== 'closeZiweiModal' && action !== 'closeAstroModal' && action !== 'closeJuyukModal') return;
    event.preventDefault();
    __cdInvokeAction(action, actionEl, event);
  }, { passive: false });

  root.addEventListener('change', function(event) {
    var target = event.target;
    if (!(target instanceof Element)) return;
    var action = target.getAttribute('data-change-action');
    if (!action) return;
    var args = __cdParseActionArgs(target.getAttribute('data-change-args'));
    __cdCallGlobal.apply(null, [action].concat(args));
  });

  __cdBindActionEventFallback(root, 'mousedown', 'data-mousedown-action');
  __cdBindActionEventFallback(root, 'mouseup', 'data-mouseup-action');
  __cdBindActionEventFallback(root, 'mouseleave', 'data-mouseleave-action');
  __cdBindActionEventFallback(root, 'touchstart', 'data-touchstart-action');
  __cdBindActionEventFallback(root, 'touchend', 'data-touchend-action');
  __cdBindActionEventFallback(root, 'touchcancel', 'data-touchcancel-action');
}

var __cdRouteActionAllowList = {
  runCompat: true,
  openZiweiModal: true,
  openAstroModal: true,
  openSibylModal: true,
  openTarotModal: true,
  openPhysiognomyApp: true,
  openPastLifeFaceApp: true,
  openTarotLoveModal: true,
  openTarotHealingModal: true,
  openTarotSelfEsteemModal: true,
  openTarotReunionModal: true,
  openTarotYearFortuneModal: true,
  openSukuyoModal: true,
  navigateToVedic: true,
  openDreamModal: true,
  openHwatuModal: true,
  openJuyukModal: true,
  openIfaOracle: true,
  openRoyalTeaOracle: true,
  openRuneOracle: true,
  openSikojenPovailu: true,
  checkPrivacyAndCalculate: true,
  // 모바일 하단 네비 탭이 React 페이지에서 셸로 넘어올 때 쓰는 액션
  cdSajuTabEntry: true,
  cdOpenAllFortunes: true,
  // 마이 탭 — 프로필 카드 관리는 셸의 하단 시트가 정본이라 React 에서 여기로 넘어온다.
  dpOpenList: true,
  openAnimalTotemModal: true,
  openSajuAnimalPage: true,
  openDestinyFlowerStudio: true,
  openAstrologyFlowerStudio: true,
  openJamidusuFlowerStudio: true,
  openSukuyoFlowerStudio: true,
  openPsychoDreamModal: true,
  startMindScanTarot: true,
  openLoveSimulation: true,
  openYogaGuru: true
};

var __cdStaticCanonicalPathActions = {
  '/saju/sibyl': 'openSibylModal',
  '/tarot/mingri': 'openTarotModal',
  '/tarot/love': 'openTarotLoveModal',
  '/tarot/reunion': 'openTarotReunionModal',
  '/tarot/self-esteem': 'openTarotSelfEsteemModal',
  '/tarot/year': 'openTarotYearFortuneModal',
  '/astrology/cosmic': 'openAstroModal',
  '/oracle/hwatu': 'openHwatuModal',
  '/oracle/juyuk': 'openJuyukModal',
  '/oracle/sukuyo': 'openSukuyoModal'
};

function __cdNormalizeRoutePath(pathname) {
  var path = String(pathname || '/').split('?')[0].split('#')[0] || '/';
  if (path.charAt(0) !== '/') path = '/' + path;
  path = path.replace(/\/{2,}/g, '/');
  // 앱은 확장자 없는 경로를 서빙하지 못해 CodeDestinyNavigationPlugin 이 /index.html 을 붙여 로드한다.
  // 그 상태로는 아래 canonical-path 표 조회가 빗나가 모달 자동 오픈이 죽는다.
  // 웹 pathname 에는 /index.html 이 붙지 않으므로 웹에는 영향이 없다.
  path = path.replace(/\/index\.html$/, '') || '/';
  return path === '/' ? '/' : path.replace(/\/+$/, '');
}

function __cdGetRouteActionParam() {
  try {
    var params = new URLSearchParams(window.location.search || '');
    var queryAction = String(params.get('action') || '').trim();
    if (queryAction) return queryAction;
  } catch (_) {
    return '';
  }
  return __cdStaticCanonicalPathActions[__cdNormalizeRoutePath(window.location.pathname || '/')] || '';
}

function __cdFindRouteActionElement(action) {
  var nodes = document.querySelectorAll('[data-action]');
  var fallback = null;
  for (var i = 0; i < nodes.length; i += 1) {
    var node = nodes[i];
    if (String(node.getAttribute('data-action') || '').trim() !== action) continue;
    if (!fallback) fallback = node;
    if (node.disabled) continue;
    var rect = node.getBoundingClientRect ? node.getBoundingClientRect() : null;
    if (rect && rect.width > 0 && rect.height > 0) return node;
  }
  return fallback;
}

// 딥링크 진입 커버(html.cd-deeplink-boot, 셸 head 에서 첫 프레임부터 깔린다)를 걷는다.
// 모달이 실제로 열린 뒤에 걷어야 홈이 잠깐 보이는 전환이 사라진다. 열리지 않는 경우를 대비해 상한을 둔다.
var CD_DEEPLINK_COVER_MAX_MS = 4000;

function __cdReleaseDeepLinkBootCover() {
  try { document.documentElement.classList.remove('cd-deeplink-boot'); } catch (_) {}
}

function __cdReleaseDeepLinkCoverWhenModalVisible() {
  if (!document.documentElement.classList.contains('cd-deeplink-boot')) return;
  var startedAt = Date.now();
  var timer = window.setInterval(function() {
    var opened = false;
    try {
      var nodes = document.querySelectorAll('.modal-overlay-shell, .modal, [role="dialog"]');
      for (var i = 0; i < nodes.length && !opened; i += 1) {
        var cs = window.getComputedStyle(nodes[i]);
        if (cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0') {
          var rect = nodes[i].getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) opened = true;
        }
      }
    } catch (_) { opened = true; }
    if (opened || (Date.now() - startedAt) > CD_DEEPLINK_COVER_MAX_MS) {
      window.clearInterval(timer);
      __cdReleaseDeepLinkBootCover();
    }
  }, 80);
}

function __cdRunRouteActionOnce() {
  if (window.__cdRouteActionHandled) return;
  var action = __cdGetRouteActionParam();
  if (!action || !__cdRouteActionAllowList[action]) {
    // 자동 오픈 대상이 아니면 커버를 붙잡고 있을 이유가 없다.
    __cdReleaseDeepLinkBootCover();
    return;
  }
  window.__cdRouteActionHandled = action;
  var actionEl = __cdFindRouteActionElement(action);
  if (actionEl) {
    __cdInvokeAction(action, actionEl, null);
    __cdReleaseDeepLinkCoverWhenModalVisible();
  } else {
    __cdReleaseDeepLinkBootCover();
  }
}

function __cdBindAnimalTotemTileDirect() {
  var sel = '.tarot-tile--animal-totem, [data-action="openAnimalTotemModal"]';
  var touchStart = null;
  var lastTouchStart = null;
  /* 모바일: 스크롤 시 미세 움직임 허용 (10px로 축소하여 스크롤 오동작 방지) */
  var TAP_THRESH = 10;

  function loadScriptOnce(src) {
    return new Promise(function(resolve, reject) {
      var norm = (src || '').replace(/^\.\//, '');
      var existing = document.querySelector('script[src*="' + norm.split('/').pop() + '"]');
      if (existing && (existing.dataset.loaded === '1' || existing.readyState === 'complete')) {
        resolve();
        return;
      }
      var s = document.createElement('script');
      s.src = norm;
      s.defer = true;
      s.async = true;
      s.onload = function() { resolve(); };
      s.onerror = function() { reject(new Error('load failed: ' + src)); };
      document.head.appendChild(s);
    });
  }

  function openTotemModal() {
    try {
      var overlay = document.getElementById('animalTotemOverlay');
      if (overlay && (overlay.classList.contains('is-open') || overlay.style.display === 'block')) return;
      // ── 유료 게이트 체크 ──
      var _tile = document.querySelector('.tarot-tile--animal-totem[data-coin-cost], [data-action="openAnimalTotemModal"][data-coin-cost]');
      var _coinCost = _tile ? Number(_tile.getAttribute('data-coin-cost') || 0) : 0;
      if (_coinCost > 0 && _tile && !_tile.getAttribute('data-pvw-bypass')) {
        if (typeof window._cdOpenTilePreview === 'function' && window._cdOpenTilePreview(_tile)) return;
        if (typeof window._cdCoinGatePerUse === 'function') {
          window._cdCoinGatePerUse(_coinCost, '애니멀 토템 리딩', function() { _doOpenTotem(); });
          return;
        }
        // ⚠️ 미로그인 상태: _cdCoinGatePerUse 미정의
        if (!__cdHasAuthToken()) {
          if (window.confirm(_indexRuntimeText("indexRuntime.confirm.002"))) {
            window.location.href = '/login?next=%2F';
          }
          return;
        }
        // 로그인 상태인데 _cdCoinGatePerUse가 없으면 오류로 간주
        window.alert('서비스 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        return;
      }
      // ── 유료 게이트 통과 ──
      _doOpenTotem();
    } catch (err) { console.error('[totem] openTotemModal error:', err); }
    function _doOpenTotem() {
      var raf = window.requestAnimationFrame || function(cb) { return setTimeout(cb, 0); };
      if (typeof window.openAnimalTotemModal === 'function') {
        raf(function() {
          try { window.openAnimalTotemModal(); } catch (e) { console.error('[totem] open error:', e); }
        });
        return;
      }
      raf(function() {
        loadScriptOnce('js/services/animal-totem-content-engine.js?v=build-c4f38e10dd74')
          .then(function() { return loadScriptOnce('js/animal-totem-experience.js?v=build-c4f38e10dd74'); })
          .then(function() {
            try {
              if (typeof window.openAnimalTotemModal === 'function') window.openAnimalTotemModal();
            } catch (e) { console.error('[totem] open error:', e); }
          })
          .catch(function(err) { console.error('[totem] load failed:', err); });
      });
    }
  }

  function isTotemTile(el) {
    return el && el.closest && el.closest(sel);
  }
  function handleClick(ev) {
    var target = ev && ev.target;
    if (!target || !isTotemTile(target)) return;
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();
    openTotemModal();
  }
  function handleTouchStart(ev) {
    var t = ev.touches && ev.touches[0];
    if (t) lastTouchStart = { x: t.clientX, y: t.clientY };
    if (!ev.target || !isTotemTile(ev.target)) return;
    touchStart = t ? { x: t.clientX, y: t.clientY } : null;
  }
  function handleTouchCancel() {
    touchStart = null;
  }
  function handleTouchEnd(ev) {
    if (!ev.changedTouches || !ev.changedTouches[0]) return;
    var t = ev.changedTouches[0];
    var x = t.clientX, y = t.clientY;
    var start = touchStart || lastTouchStart;
    touchStart = null;
    if (start) {
      var dx = Math.abs(x - start.x);
      var dy = Math.abs(y - start.y);
      if (dx > TAP_THRESH || dy > TAP_THRESH) return;
    }
    /* touchStart로 시작했거나, elementFromPoint로 터치 위치가 토템 타일인 경우 (모바일 event.target 부정확 대비) */
    var fromStart = start && isTotemTile(ev.target);
    var elAtPoint = null;
    if (typeof document.elementFromPoint === 'function') {
      elAtPoint = document.elementFromPoint(x, y);
      if ((!elAtPoint || !isTotemTile(elAtPoint)) && lastTouchStart) {
        elAtPoint = document.elementFromPoint(lastTouchStart.x, lastTouchStart.y);
      }
    }
    var fromPoint = elAtPoint && isTotemTile(elAtPoint);
    if (fromStart || fromPoint) {
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      openTotemModal();
    }
  }
  document.addEventListener('click', handleClick, { capture: true });
  document.addEventListener('touchstart', handleTouchStart, { capture: true, passive: true });
  document.addEventListener('touchcancel', handleTouchCancel, { capture: true, passive: true });
  document.addEventListener('touchend', handleTouchEnd, { capture: true, passive: false });

  /* 직접 바인딩: 위임이 실패하는 환경(오버레이/스택 컨텍스트) 대비 */
  function bindDirectToTiles() {
    var tiles = document.querySelectorAll(sel);
    tiles.forEach(function(tile) {
      if (tile._cdTotemDirectBound) return;
      tile._cdTotemDirectBound = true;
      var tileTouchStart = null;
      tile.addEventListener('click', function(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        openTotemModal();
      });
      tile.addEventListener('touchstart', function(ev) {
        var t = ev.touches && ev.touches[0];
        tileTouchStart = t ? { x: t.clientX, y: t.clientY } : null;
      }, { passive: true });
      tile.addEventListener('touchend', function(ev) {
        if (!ev.changedTouches || !ev.changedTouches[0]) return;
        var t = ev.changedTouches[0];
        var x = t.clientX, y = t.clientY;
        var start = tileTouchStart;
        tileTouchStart = null;
        if (start) {
          var dx = Math.abs(x - start.x);
          var dy = Math.abs(y - start.y);
          if (dx > TAP_THRESH || dy > TAP_THRESH) return;
        } else {
          /* touchstart 미수신 시 elementFromPoint로 터치 해제 위치 확인 (모바일 대응) */
          var elAt = (typeof document.elementFromPoint === 'function') ? document.elementFromPoint(x, y) : null;
          if (!elAt || !tile.contains(elAt)) return;
        }
        if (ev.cancelable) ev.preventDefault();
        openTotemModal();
      }, { passive: false });
    });
  }
  bindDirectToTiles();
  /* 동적 삽입 대비: 스플래시 제거 후 재바인딩 */
  var splash = document.getElementById('codeSplash');
  if (splash && splash.parentNode) {
    var obs = new MutationObserver(function() {
      if (!document.getElementById('codeSplash')) {
        obs.disconnect();
        bindDirectToTiles();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }
}

/**
 * 운명의 꽃 타일 — 모바일 터치 직접 바인딩
 * click 이벤트가 스크롤/스와이프와 충돌해 모바일에서 미발동하는 문제 해결
 */
function __cdBindDestinyFlowerTileDirect() {
  var sel = '.tarot-tile--bloom, .tarot-tile--astro-flower, .tarot-tile--jami-flower, .tarot-tile--sukuyo-fl, [data-action="openDestinyFlowerStudio"], [data-action="openAstrologyFlowerStudio"], [data-action="openJamidusuFlowerStudio"], [data-action="openSukuyoFlowerStudio"]';
  var touchStart = null;
  var lastTouchStart = null;
  var lastOpenTime = 0;
  var TAP_THRESH = 10;
  var DEBOUNCE_MS = 400;

  function isFlowerTile(el) {
    return el && el.closest && el.closest(sel);
  }

  function openFlowerStudio(actionEl) {
    var now = Date.now();
    if (now - lastOpenTime < DEBOUNCE_MS) return;
    lastOpenTime = now;
    var action = actionEl && actionEl.getAttribute('data-action');
    if (!action) return;
    __cdInvokeAction(action, actionEl, null);
  }

  function handleClick(ev) {
    var target = ev && ev.target;
    if (!target || !isFlowerTile(target)) return;
    var actionEl = target.closest(sel);
    if (!actionEl) return;
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();
    openFlowerStudio(actionEl);
  }

  function handleTouchStart(ev) {
    var t = ev.touches && ev.touches[0];
    if (t) lastTouchStart = { x: t.clientX, y: t.clientY };
    if (!ev.target || !isFlowerTile(ev.target)) return;
    touchStart = t ? { x: t.clientX, y: t.clientY } : null;
  }

  function handleTouchCancel() {
    touchStart = null;
  }

  function handleTouchEnd(ev) {
    if (!ev.changedTouches || !ev.changedTouches[0]) return;
    var t = ev.changedTouches[0];
    var x = t.clientX, y = t.clientY;
    var start = touchStart || lastTouchStart;
    touchStart = null;
    if (start) {
      var dx = Math.abs(x - start.x);
      var dy = Math.abs(y - start.y);
      if (dx > TAP_THRESH || dy > TAP_THRESH) return;
    }
    /* touchStart로 시작했거나, elementFromPoint로 터치 해제 위치가 꽃 타일인 경우 (모바일 event.target 부정확 대비) */
    var fromStart = start && isFlowerTile(ev.target);
    var elAtPoint = (typeof document.elementFromPoint === 'function') ? document.elementFromPoint(x, y) : null;
    var fromPoint = elAtPoint && isFlowerTile(elAtPoint);
    var actionEl = (fromStart && ev.target.closest(sel)) || (fromPoint && elAtPoint.closest(sel));
    if (actionEl) {
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      openFlowerStudio(actionEl);
    }
  }

  document.addEventListener('click', handleClick, { capture: true });
  document.addEventListener('touchstart', handleTouchStart, { capture: true, passive: true });
  document.addEventListener('touchcancel', handleTouchCancel, { capture: true, passive: true });
  document.addEventListener('touchend', handleTouchEnd, { capture: true, passive: false });

  function bindDirectToTiles() {
    var tiles = document.querySelectorAll(sel);
    tiles.forEach(function(tile) {
      if (tile._cdFlowerDirectBound) return;
      tile._cdFlowerDirectBound = true;
      var tileTouchStart = null;
      tile.addEventListener('click', function(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        openFlowerStudio(tile);
      });
      tile.addEventListener('touchstart', function(ev) {
        var t = ev.touches && ev.touches[0];
        tileTouchStart = t ? { x: t.clientX, y: t.clientY } : null;
      }, { passive: true });
      tile.addEventListener('touchend', function(ev) {
        if (!ev.changedTouches || !ev.changedTouches[0]) return;
        var t = ev.changedTouches[0];
        var x = t.clientX, y = t.clientY;
        var start = tileTouchStart;
        tileTouchStart = null;
        if (start) {
          var dx = Math.abs(x - start.x);
          var dy = Math.abs(y - start.y);
          if (dx > TAP_THRESH || dy > TAP_THRESH) return;
        } else {
          /* touchstart 미수신 시 elementFromPoint로 터치 해제 위치 확인 (모바일 대응) */
          var elAt = (typeof document.elementFromPoint === 'function') ? document.elementFromPoint(x, y) : null;
          if (!elAt || !tile.contains(elAt)) return;
        }
        if (ev.cancelable) ev.preventDefault();
        openFlowerStudio(tile);
      }, { passive: false });
    });
  }
  bindDirectToTiles();

  var splash = document.getElementById('codeSplash');
  if (splash && splash.parentNode) {
    var obs = new MutationObserver(function() {
      if (!document.getElementById('codeSplash')) {
        obs.disconnect();
        bindDirectToTiles();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }
}

function _cdEnsureMainScreenOnLoad() {
  var ids = ['juyukModalOverlay','sukuyoModalOverlay','astroModalOverlay','ziweiModalOverlay'];
  for (var j = 0; j < ids.length; j++) {
    var active = document.getElementById(ids[j]);
    if (active && active.style && active.style.display && active.style.display !== 'none') return;
  }
  for (var i = 0; i < ids.length; i++) {
    var el = document.getElementById(ids[i]);
    if (el) el.style.display = 'none';
  }

  var scrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
  if (_cdShouldSkipMainScrollReset(scrollY)) return;
  window.scrollTo(0, 0);
}

var _cdMainLoadUserMoved = false;

function _cdMarkMainLoadUserMoved() {
  _cdMainLoadUserMoved = true;
}

function _cdBindMainLoadScrollGuard() {
  if (window.__cdMainLoadScrollGuardBound) return;
  window.__cdMainLoadScrollGuardBound = true;

  function markByScrollY() {
    var y = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    if (y > 12) _cdMainLoadUserMoved = true;
  }

  window.addEventListener('scroll', markByScrollY, { passive: true });
  window.addEventListener('wheel', _cdMarkMainLoadUserMoved, { passive: true });
  window.addEventListener('touchmove', _cdMarkMainLoadUserMoved, { passive: true });
  window.addEventListener('keydown', _cdMarkMainLoadUserMoved, { passive: true });
}

function _cdIsHistoryRestoreNavigation() {
  try {
    if (performance && typeof performance.getEntriesByType === 'function') {
      var navs = performance.getEntriesByType('navigation');
      if (navs && navs.length > 0 && navs[0].type === 'back_forward') {
        return true;
      }
    }
  } catch (_) {}
  return false;
}

function _cdShouldSkipMainScrollReset(scrollY) {
  if (_cdMainLoadUserMoved) return true;
  if (_cdIsHistoryRestoreNavigation()) return true;
  if (scrollY > 12) return true;
  return false;
}

function _cdInitAfterSplash() {
  var splash = document.getElementById('codeSplash');
  if (splash && splash.parentNode) {
    var obs = new MutationObserver(function(mutations, observer) {
      if (!document.getElementById('codeSplash')) {
        observer.disconnect();
        _cdEnsureMainScreenOnLoad();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(function() {
      obs.disconnect();
      _cdEnsureMainScreenOnLoad();
    }, 3500);
  } else {
    _cdEnsureMainScreenOnLoad();
  }
}

/* 모바일 containment 해결: transform:translateZ(0) 부모 내 fixed가 뷰포트 대신 부모 기준으로 배치되는 이슈.
   이 오버레이들은 body 직계가 아니면 모바일에서 화면에 안 보임 → body로 이동 */
function __cdEnsureModalOverlaysInBody() {
  var ids = ['tarotLoveOverlay', 'tarotHealingOverlay', 'tarotReunionOverlay', 'tarotYearFortuneOverlay',
    'dreamModalOverlay', 'psychoDreamModalOverlay', 'kemetOracleOverlay', 'tarotModalOverlay'];
  for (var i = 0; i < ids.length; i++) {
    var el = document.getElementById(ids[i]);
    if (el && el.parentNode !== document.body) {
      try { document.body.appendChild(el); } catch (e) { /* ignore */ }
    }
  }
}
window.__cdEnsureModalOverlaysInBody = __cdEnsureModalOverlaysInBody;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    _cdBindMainLoadScrollGuard();
    __cdEnsureModalOverlaysInBody();
    _cdInitAfterSplash();
    __cdBindAnimalTotemTileDirect();
    __cdBindDestinyFlowerTileDirect();
    setTimeout(__cdBindGlobalActionsFallback, 0);
  }, { once: true });
} else {
  _cdBindMainLoadScrollGuard();
  __cdEnsureModalOverlaysInBody();
  _cdInitAfterSplash();
  __cdBindAnimalTotemTileDirect();
  __cdBindDestinyFlowerTileDirect();
  setTimeout(__cdBindGlobalActionsFallback, 0);
}

function _dfSafeColor(color, fallback) {
  if (typeof color !== 'string') return fallback;
  var trimmed = color.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed) ? trimmed : fallback;
}

function _dfHexToRgba(hex, alpha) {
  var raw = String(hex || '').replace('#', '');
  if (raw.length === 3) {
    raw = raw.charAt(0) + raw.charAt(0) + raw.charAt(1) + raw.charAt(1) + raw.charAt(2) + raw.charAt(2);
  }
  if (raw.length !== 6) {
    return 'rgba(244,114,182,' + alpha + ')';
  }
  var r = parseInt(raw.slice(0, 2), 16);
  var g = parseInt(raw.slice(2, 4), 16);
  var b = parseInt(raw.slice(4, 6), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

function _dfNormalizeHex6(hex, fallback) {
  var raw = String(hex || '').trim().replace('#', '');
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    raw = raw.charAt(0) + raw.charAt(0) + raw.charAt(1) + raw.charAt(1) + raw.charAt(2) + raw.charAt(2);
  }
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) {
    return _dfNormalizeHex6(fallback || '#f472b6', '#f472b6');
  }
  return '#' + raw.toLowerCase();
}

function _dfHexToRgbParts(hex) {
  var safe = _dfNormalizeHex6(hex, '#f472b6').replace('#', '');
  return {
    r: parseInt(safe.slice(0, 2), 16),
    g: parseInt(safe.slice(2, 4), 16),
    b: parseInt(safe.slice(4, 6), 16)
  };
}

function _dfMixHex(aHex, bHex, ratio) {
  var t = Number(ratio);
  if (!Number.isFinite(t)) t = 0.5;
  if (t < 0) t = 0;
  if (t > 1) t = 1;
  var a = _dfHexToRgbParts(aHex);
  var b = _dfHexToRgbParts(bHex);
  var r = Math.round(a.r * (1 - t) + b.r * t);
  var g = Math.round(a.g * (1 - t) + b.g * t);
  var bl = Math.round(a.b * (1 - t) + b.b * t);
  var toHex = function(v) { return v.toString(16).padStart(2, '0'); };
  return '#' + toHex(r) + toHex(g) + toHex(bl);
}

function _dfHashText(input) {
  var text = String(input || 'destiny-flower');
  var hash = 2166136261;
  for (var i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0);
}

function _dfBuildFlowerSvgMarkup(source, primaryHex, secondaryHex, seed, label) {
  var primary = _dfNormalizeHex6(primaryHex, '#f472b6');
  var secondary = _dfNormalizeHex6(secondaryHex, '#22d3ee');
  var accent = _dfMixHex(primary, secondary, 0.5);
  var deep = _dfMixHex(primary, '#0f172a', 0.24);
  var pale = _dfMixHex(secondary, '#ffffff', 0.42);
  var centerX = 160;
  var centerY = 130;
  var petalCount = 10;
  var petalRy = 66;
  var petalRx = 20;
  var baseSpin = seed % 360;

  if (source === 'astrology') {
    petalCount = 12;
    petalRy = 72;
    petalRx = 16;
  } else if (source === 'jamidusu') {
    petalCount = 14;
    petalRy = 62;
    petalRx = 15;
  } else if (source === 'sukuyo') {
    petalCount = 9;
    petalRy = 64;
    petalRx = 21;
  }

  var petals = '';
  for (var i = 0; i < petalCount; i++) {
    var angle = (360 / petalCount) * i + baseSpin;
    var localTone = (i % 2 === 0) ? primary : secondary;
    var localGlow = (i % 2 === 0) ? accent : pale;
    petals += '<ellipse cx="' + centerX + '" cy="' + centerY + '" rx="' + petalRx + '" ry="' + petalRy + '" '
      + 'fill="url(#petalGrad' + i + ')" transform="rotate(' + angle.toFixed(2) + ' ' + centerX + ' ' + centerY + ')" />'
      + '<defs><linearGradient id="petalGrad' + i + '" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0%" stop-color="' + localGlow + '" stop-opacity="0.95" />'
      + '<stop offset="100%" stop-color="' + localTone + '" stop-opacity="0.86" />'
      + '</linearGradient></defs>';
  }

  var extra = '';
  if (source === 'astrology') {
    for (var s = 0; s < 18; s++) {
      var sx = 18 + ((seed + s * 37) % 286);
      var sy = 12 + ((Math.floor(seed / (s + 3)) + s * 19) % 96);
      var sr = 1 + ((seed + s * 13) % 3);
      extra += '<circle cx="' + sx + '" cy="' + sy + '" r="' + sr + '" fill="' + pale + '" fill-opacity="0.72" />';
    }
  } else if (source === 'jamidusu') {
    extra += '<circle cx="' + centerX + '" cy="' + centerY + '" r="96" fill="none" stroke="' + _dfMixHex(accent, '#ffffff', 0.35) + '" stroke-opacity="0.45" stroke-width="1.8" />';
    extra += '<path d="M72 52 L98 34 L126 52 L160 30 L194 52 L222 34 L248 52" fill="none" stroke="' + pale + '" stroke-opacity="0.6" stroke-width="2.4" stroke-linecap="round" />';
  } else if (source === 'sukuyo') {
    extra += '<circle cx="242" cy="58" r="30" fill="' + pale + '" fill-opacity="0.56" />';
    extra += '<circle cx="254" cy="58" r="26" fill="' + _dfMixHex(deep, '#020617', 0.7) + '" fill-opacity="0.92" />';
    extra += '<circle cx="160" cy="130" r="104" fill="none" stroke="' + _dfMixHex(secondary, '#e2e8f0', 0.4) + '" stroke-opacity="0.36" stroke-width="1.4" />';
  }

  var symbol = source === 'astrology' ? 'ASTRO' : (source === 'jamidusu' ? 'ZIWEI' : (source === 'sukuyo' ? 'SUKUYO' : 'SAJU'));
  var safeLabel = String(label || '').replace(/[<>&"']/g, '');

  return ''
    + '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" role="img" aria-label="' + safeLabel + '">'
    + '<defs>'
    + '<radialGradient id="bg" cx="50%" cy="40%" r="70%">'
    + '<stop offset="0%" stop-color="' + _dfMixHex(primary, '#ffffff', 0.44) + '" stop-opacity="0.94" />'
    + '<stop offset="52%" stop-color="' + _dfMixHex(secondary, '#0ea5e9', 0.36) + '" stop-opacity="0.66" />'
    + '<stop offset="100%" stop-color="' + _dfMixHex(deep, '#020617', 0.6) + '" stop-opacity="0.84" />'
    + '</radialGradient>'
    + '<linearGradient id="coreGrad" x1="0" y1="0" x2="1" y2="1">'
    + '<stop offset="0%" stop-color="' + _dfMixHex(primary, '#ffffff', 0.4) + '" />'
    + '<stop offset="100%" stop-color="' + _dfMixHex(secondary, '#fde047', 0.24) + '" />'
    + '</linearGradient>'
    + '</defs>'
    + '<rect width="320" height="240" rx="20" fill="url(#bg)" />'
    + '<g opacity="0.96">' + petals + '</g>'
    + '<circle cx="' + centerX + '" cy="' + centerY + '" r="34" fill="url(#coreGrad)" />'
    + '<circle cx="' + centerX + '" cy="' + centerY + '" r="14" fill="' + _dfMixHex(accent, '#ffffff', 0.5) + '" fill-opacity="0.9" />'
    + extra
    + '<text x="16" y="222" fill="' + _dfMixHex(pale, '#ffffff', 0.3) + '" fill-opacity="0.82" font-size="14" font-family="Noto Sans KR, sans-serif" letter-spacing="2">' + symbol + '</text>'
    + '</svg>';
}

function _dfBuildFlowerDataUri(selection, sourceOverride) {
  var source = sourceOverride || (selection && selection.source) || 'saju';
  var flower = (selection && selection.flower) || {};
  var primary = (selection && selection.primary) || (flower && flower.primary_color) || '#f472b6';
  var secondary = (selection && selection.secondary) || (flower && flower.secondary_color) || '#22d3ee';
  var key = [
    source,
    flower.id || flower.name || '',
    flower.scientific_name || '',
    Array.isArray(selection && selection.keywords) ? selection.keywords.join('|') : '',
    (selection && selection.matched && selection.matched.narrative) || ''
  ].join('|');
  var seed = _dfHashText(key);
  var svg = _dfBuildFlowerSvgMarkup(source, primary, secondary, seed, flower.name || 'destiny flower');
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

function _dfApplyGeneratedFlowerImage(imageEl, selection, sourceOverride) {
  if (!imageEl || !selection) return;
  try {
    imageEl.src = _dfBuildFlowerDataUri(selection, sourceOverride);
    if (typeof imageEl.removeAttribute === 'function') {
      imageEl.removeAttribute('srcset');
      imageEl.removeAttribute('data-lazy-src');
      imageEl.removeAttribute('data-lazy-srcset');
      imageEl.removeAttribute('loading');
    }
    if (imageEl.classList && imageEl.classList.contains('io-lazy-img')) {
      imageEl.classList.remove('io-lazy-img');
    }
    imageEl.setAttribute('data-df-generated', '1');
  } catch (e) {
    console.warn('[DestinyFlower] 동적 SVG 생성 실패:', e);
  }
}

function _dfEnsureCardOpen(card) {
  if (!card) return;
  card.classList.add('feature-card--open');
  var detail = card.querySelector('.feature-card__detail');
  if (detail) detail.setAttribute('aria-hidden', 'false');
  var cta = card.querySelector('.feature-card__cta');
  if (cta) {
    cta.setAttribute('aria-expanded', 'true');
    var labelEl = cta.querySelector('.feature-card__cta-label');
    if (labelEl) labelEl.textContent = '🌸 운명의 꽃 다시 피우기';
    var arrowEl = cta.querySelector('.feature-card__cta-arrow');
    if (arrowEl) arrowEl.textContent = '✦';
  }
  syncFeatureCardHeight(card);
}

function _dfRenderPetals(container, primary, secondary) {
  if (!container) return;
  container.innerHTML = '';
  for (var i = 0; i < 14; i++) {
    var petal = document.createElement('span');
    petal.className = 'destiny-flower-petal';
    petal.style.setProperty('--x', (4 + Math.random() * 88).toFixed(2) + '%');
    petal.style.setProperty('--y', (8 + Math.random() * 72).toFixed(2) + '%');
    petal.style.setProperty('--rot', (Math.random() * 46 - 23).toFixed(1) + 'deg');
    petal.style.setProperty('--dur', (2.8 + Math.random() * 1.8).toFixed(2) + 's');
    petal.style.setProperty('--delay', (Math.random() * 1.6).toFixed(2) + 's');
    petal.style.setProperty('--petal-start', _dfHexToRgba(secondary, 0.92));
    petal.style.setProperty('--petal-end', _dfHexToRgba(primary, 0.72));
    container.appendChild(petal);
  }
}

var _DF_ASTRO_SIGNS_EN = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

function _dfPickNumber(candidates, fallback, requirePositive) {
  for (var i = 0; i < candidates.length; i++) {
    var n = Number(candidates[i]);
    if (!Number.isFinite(n)) continue;
    if (requirePositive && n <= 0) continue;
    return n;
  }
  return fallback;
}

function _dfHasBirthCore(birth) {
  return !!(birth && Number(birth.year) > 0 && Number(birth.month) > 0 && Number(birth.day) > 0);
}

function _dfNormalizeAstroSign(raw) {
  var text = String(raw || '').trim();
  if (!text) return '';

  var englishMatch = text.match(/Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces/i);
  if (englishMatch && englishMatch[0]) {
    var found = englishMatch[0].toLowerCase();
    return found.charAt(0).toUpperCase() + found.slice(1);
  }

  var map = {
    '양자리': 'Aries',
    '황소자리': 'Taurus',
    '쌍둥이자리': 'Gemini',
    '게자리': 'Cancer',
    '사자자리': 'Leo',
    '처녀자리': 'Virgo',
    '천칭자리': 'Libra',
    '전갈자리': 'Scorpio',
    '사수자리': 'Sagittarius',
    '염소자리': 'Capricorn',
    '물병자리': 'Aquarius',
    '물고기자리': 'Pisces'
  };
  var keys = Object.keys(map);
  for (var i = 0; i < keys.length; i++) {
    if (text.indexOf(keys[i]) !== -1) return map[keys[i]];
  }

  return '';
}

function _dfAstroSignFromNode(nodeLike) {
  if (!nodeLike) return '';
  var idx = Number(nodeLike.idx);
  if (Number.isFinite(idx) && idx >= 0 && idx < _DF_ASTRO_SIGNS_EN.length) {
    return _DF_ASTRO_SIGNS_EN[idx];
  }
  return _dfNormalizeAstroSign(nodeLike._baseSign || nodeLike.sign || '');
}

function _dfResolveBirthContext(payload) {
  var pBirth = (payload && payload.birth) || {};
  var iBirth = (payload && payload.identity && payload.identity.birth) || {};
  var location = (payload && payload.location) || {};
  var astroBirth = window._astroBirth || {};
  var ziweiBirth = window._ziweiBirth || {};

  var hasProfileCore = _dfHasBirthCore(pBirth) || _dfHasBirthCore(iBirth);
  var yearCandidates = hasProfileCore
    ? [pBirth.year, iBirth.year]
    : [pBirth.year, iBirth.year, astroBirth.year, ziweiBirth.year];
  var monthCandidates = hasProfileCore
    ? [pBirth.month, iBirth.month]
    : [pBirth.month, iBirth.month, astroBirth.month, ziweiBirth.month];
  var dayCandidates = hasProfileCore
    ? [pBirth.day, iBirth.day]
    : [pBirth.day, iBirth.day, astroBirth.day, ziweiBirth.day];
  var hourCandidates = hasProfileCore
    ? [pBirth.hour, iBirth.hour]
    : [pBirth.hour, iBirth.hour, astroBirth.hour, ziweiBirth.hour];
  var minuteCandidates = hasProfileCore
    ? [pBirth.minute, iBirth.minute]
    : [pBirth.minute, iBirth.minute, astroBirth.minute, ziweiBirth.minute];

  var year = _dfPickNumber(yearCandidates, 0, true);
  var month = _dfPickNumber(monthCandidates, 0, true);
  var day = _dfPickNumber(dayCandidates, 0, true);
  var hour = _dfPickNumber(hourCandidates, 12, false);
  var minute = _dfPickNumber(minuteCandidates, 0, false);
  var lat = _dfPickNumber([pBirth.lat, pBirth.latitude, iBirth.lat, iBirth.latitude, location.lat], 37.6, false);
  var lon = _dfPickNumber([pBirth.lon, pBirth.lng, iBirth.lon, iBirth.lng, location.lng, location.lon], 127, false);
  var tz = _dfPickNumber([pBirth.tz, pBirth.tzOffset, iBirth.tz, iBirth.tzOffset, location.tzOffset, location.baseTzOffset], 9, false);

  // 자미두수·점성술 등은 양력 기준. 음력 입력 시 양력으로 변환하여 명궁 등이 정확히 계산되도록 함.
  var calType = pBirth.calType || iBirth.calType || 'solar';
  if ((calType === 'lunar' || calType === 'lunar_leap') && year && month && day &&
      window.KasiEngine && typeof window.KasiEngine.lunarToSolar === 'function') {
    try {
      var conv = window.KasiEngine.lunarToSolar(year, month, day, calType === 'lunar_leap');
      if (conv && conv.year && conv.month && conv.day) {
        year = Number(conv.year);
        month = Number(conv.month);
        day = Number(conv.day);
      }
    } catch (e) {
      console.warn('[DestinyFlower] 음력→양력 변환 실패, 원본 사용:', e);
    }
  }

  return {
    year: year,
    month: month,
    day: day,
    hour: hour,
    minute: minute,
    lat: lat,
    lon: lon,
    tz: tz
  };
}

function _dfExtractAstroLiveData(birthCtx) {
  if (!_dfHasBirthCore(birthCtx)) return null;

  var chart = null;
  var localHour = Number(birthCtx.hour) + Number(birthCtx.minute) / 60;

  if (typeof window.calcAstroApiChartOrThrow === 'function') {
    try {
      chart = window.calcAstroApiChartOrThrow(
        Number(birthCtx.year),
        Number(birthCtx.month),
        Number(birthCtx.day),
        localHour,
        Number(birthCtx.lat),
        Number(birthCtx.lon),
        Number(birthCtx.tz),
        window.ASTRO_HOUSE_SYSTEM || 'P'
      );
    } catch (e) {
      // Strict SwissEph 모드 미준비 시에는 조용히 레거시 차트로 폴백 시도.
      if (!(window.AstroEngine && typeof window.AstroEngine.calcAll === 'function')) {
        console.warn('[DestinyFlower] 점성술 브리지 계산 실패:', e);
      }
    }
  }

  if (!chart && window.AstroEngine && typeof window.AstroEngine.calcAll === 'function') {
    try {
      chart = window.AstroEngine.calcAll(
        Number(birthCtx.year),
        Number(birthCtx.month),
        Number(birthCtx.day),
        localHour,
        Number(birthCtx.lat),
        Number(birthCtx.lon),
        Number(birthCtx.tz),
        { houseSystem: window.ASTRO_HOUSE_SYSTEM || 'P' }
      );
    } catch (e2) {
      console.warn('[DestinyFlower] 점성술 브리지 계산 실패:', e2);
      return null;
    }
  }

  if (!chart) return null;
  return {
    sunSign: _dfAstroSignFromNode(chart && chart.sun),
    moonSign: _dfAstroSignFromNode(chart && chart.moon),
    risingSign: _dfAstroSignFromNode(chart && chart.asc)
  };
}

function _dfExtractZiweiLiveRaw(birthCtx) {
  // 생년월일이 있으면 항상 해당 데이터로 재계산. _currentZiweiData는 이전 사용자/모달 조회 캐시이므로
  // 운명의 꽃 아틀리에에서는 사용하지 않음(잘못된 명궁 결과 방지).
  if (!_dfHasBirthCore(birthCtx) || typeof window.calcZiweiPalaces !== 'function') return null;
  try {
    return window.calcZiweiPalaces(
      Number(birthCtx.year),
      Number(birthCtx.month),
      Number(birthCtx.day),
      Number(birthCtx.hour),
      Number(birthCtx.minute)
    );
  } catch (e) {
    console.warn('[DestinyFlower] 자미두수 브리지 계산 실패:', e);
  }
  return null;
}

function _dfDeriveZiweiDomain(ziweiRaw) {
  if (!ziweiRaw || typeof ziweiRaw !== 'object') return null;

  var palaceIdx = -1;
  if (Array.isArray(ziweiRaw.palacesByIndex)) {
    palaceIdx = ziweiRaw.palacesByIndex.indexOf('명궁');
  }
  if (palaceIdx < 0) palaceIdx = 0;

  var palace = (Array.isArray(ziweiRaw.palacesByIndex) && ziweiRaw.palacesByIndex[palaceIdx]) || '명궁';
  var starRows = (ziweiRaw.palaceStarData && ziweiRaw.palaceStarData[palaceIdx] && ziweiRaw.palaceStarData[palaceIdx].stars) || [];
  var starNames = starRows.map(function(row) {
    return row && row.name ? String(row.name) : '';
  }).filter(Boolean);

  if (!starNames.length && ziweiRaw.stars && ziweiRaw.stars[palaceIdx] && Array.isArray(ziweiRaw.stars[palaceIdx].main)) {
    starNames = ziweiRaw.stars[palaceIdx].main.map(function(name) {
      return String(name || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }).filter(Boolean);
  }

  var brightness = '';
  if (starRows[0] && starRows[0].strength) brightness = String(starRows[0].strength);

  return {
    mainStar: starNames.join(' · '),
    palace: palace,
    brightness: brightness,
    stars: starNames
  };
}

function _dfExtractSukuyoLiveData(birthCtx) {
  if (!_dfHasBirthCore(birthCtx) || typeof window.calcSukuyoData !== 'function') return null;

  var lunarObj = null;
  try {
    if (window.KasiEngine && typeof window.KasiEngine.solarToLunar === 'function') {
      lunarObj = window.KasiEngine.solarToLunar(new Date(
        Number(birthCtx.year),
        Number(birthCtx.month) - 1,
        Number(birthCtx.day),
        Number(birthCtx.hour),
        Number(birthCtx.minute),
        0,
        0
      ));
    }
  } catch (e) {
    console.warn('[DestinyFlower] 숙요 달력 변환 실패:', e);
  }

  if (!lunarObj) return null;

  try {
    var sData = window.calcSukuyoData(lunarObj);
    if (!sData) return null;

    var phase = '';
    if (typeof window.getDailyKarmicGuidance === 'function') {
      var daily = window.getDailyKarmicGuidance(lunarObj, sData.mansion);
      phase = (daily && daily.moon && daily.moon.label) ? String(daily.moon.label) : '';
    }

    return {
      mansion: sData.mansion || '',
      mansionIndex: Number(sData.mansionIdx) + 1,
      phase: phase
    };
  } catch (e2) {
    console.warn('[DestinyFlower] 숙요 브리지 계산 실패:', e2);
  }

  return null;
}

function _dfApplyLiveDomainBridge(payload, birthCtx, options) {
  if (!payload || typeof payload !== 'object') return payload;
  var opts = options && typeof options === 'object' ? options : {};
  var rawHint = String(opts.sourceHint || '').trim();
  var sourceHint = rawHint ? _dfNormalizeSource(rawHint) : '';
  var applyAstro = !sourceHint || sourceHint === 'astrology';
  var applyZiwei = !sourceHint || sourceHint === 'jamidusu';
  var applySukuyo = !sourceHint || sourceHint === 'sukuyo';

  var astro = applyAstro ? _dfExtractAstroLiveData(birthCtx) : null;
  if (astro && (astro.sunSign || astro.moonSign || astro.risingSign)) {
    payload.astrology = Object.assign({}, payload.astrology || {}, {
      sunSign: astro.sunSign,
      sun_sign: astro.sunSign,
      moonSign: astro.moonSign,
      moon_sign: astro.moonSign,
      risingSign: astro.risingSign,
      rising_sign: astro.risingSign
    });
    if (payload.domains && payload.domains.astrology) {
      payload.domains.astrology = Object.assign({}, payload.domains.astrology, {
        enabled: true,
        sun_sign: astro.sunSign || payload.domains.astrology.sun_sign || '',
        moon_sign: astro.moonSign || payload.domains.astrology.moon_sign || '',
        rising_sign: astro.risingSign || payload.domains.astrology.rising_sign || ''
      });
    }
  }

  var ziweiRaw = applyZiwei ? _dfExtractZiweiLiveRaw(birthCtx) : null;
  var ziwei = _dfDeriveZiweiDomain(ziweiRaw);
  if (ziwei && (ziwei.mainStar || ziwei.palace)) {
    payload.ziwei = Object.assign({}, payload.ziwei || {}, {
      mainStar: ziwei.mainStar,
      main_star: ziwei.mainStar,
      palace: ziwei.palace,
      brightness: ziwei.brightness,
      stars: ziwei.stars
    });
    if (payload.domains && payload.domains.ziwei) {
      payload.domains.ziwei = Object.assign({}, payload.domains.ziwei, {
        enabled: true,
        main_star: ziwei.mainStar || payload.domains.ziwei.main_star || '',
        palace: ziwei.palace || payload.domains.ziwei.palace || '',
        brightness: ziwei.brightness || payload.domains.ziwei.brightness || '',
        stars: Array.isArray(ziwei.stars) ? ziwei.stars : (payload.domains.ziwei.stars || [])
      });
    }
  }

  var sukuyo = applySukuyo ? _dfExtractSukuyoLiveData(birthCtx) : null;
  if (sukuyo && (sukuyo.mansion || Number.isFinite(Number(sukuyo.mansionIndex)))) {
    payload.sukuyo = Object.assign({}, payload.sukuyo || {}, {
      mansion: sukuyo.mansion,
      name: sukuyo.mansion,
      mansionIndex: sukuyo.mansionIndex,
      index: sukuyo.mansionIndex,
      phase: sukuyo.phase
    });
    if (payload.domains && payload.domains.sukuyo) {
      payload.domains.sukuyo = Object.assign({}, payload.domains.sukuyo, {
        enabled: true,
        mansion: sukuyo.mansion || payload.domains.sukuyo.mansion || '',
        mansion_index: Number.isFinite(Number(sukuyo.mansionIndex))
          ? Number(sukuyo.mansionIndex)
          : Number(payload.domains.sukuyo.mansion_index || 0),
        phase: sukuyo.phase || payload.domains.sukuyo.phase || ''
      });
    }
  }

  return payload;
}

function _dfGetProfilePayload(options) {
  var opts = options && typeof options === 'object' ? options : {};
  function getCurrentProfile() {
    try {
      if (window.DestinyProfileManager && window.DestinyProfileManager.storage && typeof window.DestinyProfileManager.storage.current === 'function') {
        return window.DestinyProfileManager.storage.current() || {};
      }
    } catch (e) {
      console.warn('[DestinyFlower] 프로필 로드 실패:', e);
    }
    return {};
  }

  function sameBirth(a, b) {
    if (!a || !b) return false;
    var sameYmd = Number(a.year || 0) === Number(b.year || 0)
      && Number(a.month || 0) === Number(b.month || 0)
      && Number(a.day || 0) === Number(b.day || 0);
    if (!sameYmd) return false;

    // snapshot 데이터에 시/분/달력 타입이 없는 경우가 있어, 양쪽 값이 모두 있을 때만 엄격 비교한다.
    var aHour = Number(a.hour);
    var bHour = Number(b.hour);
    if (Number.isFinite(aHour) && Number.isFinite(bHour) && aHour !== bHour) return false;

    var aMinute = Number(a.minute);
    var bMinute = Number(b.minute);
    if (Number.isFinite(aMinute) && Number.isFinite(bMinute) && aMinute !== bMinute) return false;

    var aCal = String(a.calType || '').trim();
    var bCal = String(b.calType || '').trim();
    if (aCal && bCal && aCal !== bCal) return false;

    return true;
  }

  function buildProfileSignature(profile) {
    var p = profile || {};
    var b = (p.birth || (p.identity && p.identity.birth) || {});
    return [
      Number(b.year || 0),
      Number(b.month || 0),
      Number(b.day || 0),
      Number(b.hour || 0),
      Number(b.minute || 0),
      String(b.calType || 'solar'),
      String(p.name || ''),
      String(p.gender || '')
    ].join('|');
  }

  function syncStudioStateByProfile(profile) {
    if (typeof _dfStudioState !== 'object' || !_dfStudioState) return;
    var signature = buildProfileSignature(profile);
    if (!signature) return;
    if (_dfStudioState.profileSignature && _dfStudioState.profileSignature !== signature) {
      _dfStudioState.flowerData = null;
      _dfStudioState.selection = null;
    }
    _dfStudioState.profileSignature = signature;
  }

  function pickSajuSnapshot(baseProfile) {
    var snap = window.__destinyFlowerSajuSnapshot;
    if (!snap || typeof snap !== 'object') return null;
    var weights = snap.elementWeights || (snap.analysis && snap.analysis.elementWeights) || (snap.saju && snap.saju.elementWeights);
    if (!weights || typeof weights !== 'object') return null;
    var baseBirth = baseProfile && baseProfile.birth;
    var snapBirth = snap.birth;
    if (baseBirth && snapBirth && !sameBirth(baseBirth, snapBirth)) return null;
    return snap;
  }

  function isMeaningfulSnapshot(snapshot) {
    if (!snapshot) return false;
    var weights = snapshot.elementWeights || (snapshot.analysis && snapshot.analysis.elementWeights) || (snapshot.saju && snapshot.saju.elementWeights);
    if (!weights || typeof weights !== 'object') return false;
    var values = ['wood', 'fire', 'earth', 'metal', 'water'].map(function(key) {
      return Number(weights[key] || 0);
    });
    var allSame = values.every(function(v) { return Math.abs(v - values[0]) < 0.05; });
    var looksDefault = allSame && Math.abs(values[0] - 20) < 0.2;
    return !looksDefault;
  }

  function mergePayload(baseProfile, snapshot) {
    if (!snapshot) return baseProfile || {};
    var merged = Object.assign({}, baseProfile || {}, snapshot || {});
    merged.birth = Object.assign({}, (baseProfile && baseProfile.birth) || {}, snapshot.birth || {});
    merged.analysis = Object.assign({}, (baseProfile && baseProfile.analysis) || {}, snapshot.analysis || {});
    merged.saju = Object.assign({}, (baseProfile && baseProfile.saju) || {}, snapshot.saju || {});
    if (!merged.name && baseProfile && baseProfile.name) merged.name = baseProfile.name;
    if (!merged.gender && baseProfile && baseProfile.gender) merged.gender = baseProfile.gender;
    return merged;
  }

  var current = getCurrentProfile();
  syncStudioStateByProfile(current);
  var payload = current || {};
  var snapshot = pickSajuSnapshot(current);
  if (snapshot && isMeaningfulSnapshot(snapshot)) {
    payload = mergePayload(current, snapshot);
  }

  if (payload && payload.birth && typeof window.computeProfileForModal === 'function') {
    try {
      window.computeProfileForModal(payload);
      snapshot = pickSajuSnapshot(payload);
      if (snapshot) payload = mergePayload(payload, snapshot);
    } catch (e2) {
      console.warn('[DestinyFlower] 사주 재계산 실패:', e2);
    }
  }

  var birthCtx = _dfResolveBirthContext(payload || {});
  if (payload && typeof payload === 'object') {
    payload.birth = Object.assign({}, payload.birth || {}, {
      year: birthCtx.year,
      month: birthCtx.month,
      day: birthCtx.day,
      hour: birthCtx.hour,
      minute: birthCtx.minute
    });
    if (!Number.isFinite(Number(payload.birth.lat)) && Number.isFinite(Number(birthCtx.lat))) payload.birth.lat = birthCtx.lat;
    if (!Number.isFinite(Number(payload.birth.lon)) && Number.isFinite(Number(birthCtx.lon))) payload.birth.lon = birthCtx.lon;
    if (!Number.isFinite(Number(payload.birth.tz)) && Number.isFinite(Number(birthCtx.tz))) payload.birth.tz = birthCtx.tz;
  }

  if (opts.skipLiveBridge) return payload || {};
  return _dfApplyLiveDomainBridge(payload || {}, birthCtx, opts);
}

function _dfResolveSelection() {
  var payload = _dfGetProfilePayload({ sourceHint: 'saju' });
  var birthCtx = _dfResolveBirthContext(payload || {});
  var allowUserForcedFallback = !!(_dfStudioState.userRequestedLoad && _dfStudioState.userRequestedLoad.saju);

  // 생년월일 핵심 정보가 전혀 없으면 운명의 꽃을 계산하지 않는다.
  // (빈 상태에서는 어떤 꽃도 노출하지 않고 안내 문구만 보여주기 위함)
  if (!_dfHasBirthCore(birthCtx)) {
    console.warn('[DestinyFlower][Saju] resolve failed: missing birth core', {
      year: birthCtx && birthCtx.year,
      month: birthCtx && birthCtx.month,
      day: birthCtx && birthCtx.day
    });
    return null;
  }

  if (!_dfHasReadySourceData('saju', payload) && !allowUserForcedFallback) {
    console.warn('[DestinyFlower][Saju] resolve failed: saju domain not ready and fallback not allowed', {
      linked: _dfIsSourceLinked('saju'),
      userRequested: allowUserForcedFallback
    });
    return null;
  }

  var matched = null;
  var theme = null;
  var hasEngineMatcher = !!(
    (window.DestinyFlowerEngine && typeof window.DestinyFlowerEngine.matchDestinyFlower === 'function')
    || typeof window.matchDestinyFlower === 'function'
  );

  if (!hasEngineMatcher) {
    console.error('[DestinyFlower][Saju] resolve failed: matcher unavailable');
    return null;
  }

  try {
    if (window.DestinyFlowerEngine && typeof window.DestinyFlowerEngine.matchDestinyFlower === 'function') {
      matched = window.DestinyFlowerEngine.matchDestinyFlower(payload, { limit: 5 });
      if (typeof window.DestinyFlowerEngine.updateFlowerTheme === 'function') {
        theme = window.DestinyFlowerEngine.updateFlowerTheme(payload, {});
      }
    } else if (typeof window.matchDestinyFlower === 'function') {
      matched = window.matchDestinyFlower(payload, { limit: 5 });
    }
  } catch (e2) {
    console.warn('[DestinyFlower] 매칭 실패:', e2);
  }

  if (!matched) {
    console.error('[DestinyFlower][Saju] resolve failed: matcher returned empty result');
    return null;
  }

  var fallbackUsed = !!(matched.fallback_logic && matched.fallback_logic.used);
  if (fallbackUsed && !allowUserForcedFallback) {
    console.warn('[DestinyFlower][Saju] resolve blocked: fallback result requires user-initiated load');
    return null;
  }

  var matchedSaju = (matched.profile && matched.profile.domains && matched.profile.domains.saju) || {};
  var matchedDayMaster = String(matchedSaju.day_master || matchedSaju.dayMaster || '').trim();
  if (!matchedDayMaster && !allowUserForcedFallback) {
    console.warn('[DestinyFlower][Saju] resolve blocked: missing day master in matched profile');
    return null;
  }

  var flower = matched.flower || matched.flowerSymbology;
  if (!flower && allowUserForcedFallback && window.flowerSymbology) {
    flower = window.flowerSymbology.LOTUS || null;
  }
  if (!flower) return null;

  var primary = _dfSafeColor((flower.primary_color || (theme && theme.palette && theme.palette.primary)), '#f472b6');
  var secondary = _dfSafeColor((flower.secondary_color || (theme && theme.palette && theme.palette.secondary)), '#22d3ee');
  var keywords = Array.isArray(flower.keywords) && flower.keywords.length
    ? flower.keywords.slice(0, 4)
    : [flower.particle_type || 'petal', 'balance', 'bloom'];

  if (_dfStudioState.userRequestedLoad) {
    _dfStudioState.userRequestedLoad.saju = false;
  }

  return {
    source: 'saju',
    payload: payload,
    matched: matched,
    theme: theme,
    flowerData: matched && matched.flower_data ? matched.flower_data : null,
    flower: flower,
    primary: primary,
    secondary: secondary,
    keywords: keywords
  };
}

function _afResolveSelection() {
  var payload = _dfGetProfilePayload({ sourceHint: 'astrology' });
  if (!_dfHasReadySourceData('astrology', payload)) return null;
  var matched = null;

  try {
    if (window.DestinyFlowerEngine && typeof window.DestinyFlowerEngine.matchAstrologyFlower === 'function') {
      matched = window.DestinyFlowerEngine.matchAstrologyFlower(payload, { source: 'astrology' });
    } else if (typeof window.matchAstrologyFlower === 'function') {
      matched = window.matchAstrologyFlower(payload, { source: 'astrology' });
    } else if (typeof window.getAstrologyFlower === 'function') {
      matched = window.getAstrologyFlower((payload && payload.astrology) || {});
    }
  } catch (e) {
    console.warn('[AstrologyFlower] 매칭 실패:', e);
  }
  if (!matched) return null;

  var chart = matched && matched.chart ? matched.chart : {};
  var hasChartSignals = !!(
    String(chart.sun_sign || chart.sunSign || '').trim() ||
    String(chart.moon_sign || chart.moonSign || '').trim() ||
    String(chart.rising_sign || chart.risingSign || '').trim()
  );
  if (!hasChartSignals) return null;

  var flower = matched && matched.flower;
  if (!flower) {
    flower = {
      id: 'astro_lavender',
      name: '성운 라벤더',
      scientific_name: 'Lavandula nebula',
      symbolism: '별빛의 결을 따라 흐르는 청명한 직관',
      primary_color: '#8D99FF',
      secondary_color: '#C77DFF',
      keywords: ['nebula', 'zodiac', 'stardust'],
      particle_type: 'stardust_air',
      vibe_message: '별의 리듬을 따라 호흡하면 직관이 선명해집니다.'
    };
  }

  var theme = matched && matched.theme ? matched.theme : {};
  var primary = _dfSafeColor((flower.primary_color || (theme.palette && theme.palette.primary)), '#8D99FF');
  var secondary = _dfSafeColor((flower.secondary_color || (theme.palette && theme.palette.secondary)), '#C77DFF');
  var keywords = Array.isArray(flower.keywords) && flower.keywords.length
    ? flower.keywords.slice(0, 4)
    : ['zodiac', 'nebula', 'stardust'];

  return {
    source: 'astrology',
    payload: payload,
    matched: matched,
    theme: theme,
    flowerData: matched && matched.flower_data ? matched.flower_data : null,
    flower: flower,
    primary: primary,
    secondary: secondary,
    keywords: keywords
  };
}

function _afRenderStardust(container, primary, secondary) {
  if (!container) return;
  container.innerHTML = '';
  for (var i = 0; i < 22; i++) {
    var star = document.createElement('span');
    star.className = 'astrology-stardust';
    star.style.setProperty('--x', (4 + Math.random() * 92).toFixed(2) + '%');
    star.style.setProperty('--y', (6 + Math.random() * 80).toFixed(2) + '%');
    star.style.setProperty('--size', (2 + Math.random() * 3.4).toFixed(2) + 'px');
    star.style.setProperty('--dur', (2.6 + Math.random() * 2.6).toFixed(2) + 's');
    star.style.setProperty('--delay', (Math.random() * 2.2).toFixed(2) + 's');
    star.style.setProperty('--star-a', _dfHexToRgba(primary, 0.84));
    star.style.setProperty('--star-b', _dfHexToRgba(secondary, 0.94));
    container.appendChild(star);
  }
}

function _afEnsureCardOpen(card) {
  if (!card) return;
  card.classList.add('feature-card--open');
  var detail = card.querySelector('.feature-card__detail');
  if (detail) detail.setAttribute('aria-hidden', 'false');
  var cta = card.querySelector('.feature-card__cta');
  if (cta) {
    cta.setAttribute('aria-expanded', 'true');
    var labelEl = cta.querySelector('.feature-card__cta-label');
    if (labelEl) labelEl.textContent = '✨ 점성술 꽃 다시 소환하기';
    var arrowEl = cta.querySelector('.feature-card__cta-arrow');
    if (arrowEl) arrowEl.textContent = '✦';
  }
  syncFeatureCardHeight(card);
}

function _afApplyCardVisual(card, selection) {
  if (!card || !selection) return;
  var matched = selection.matched || {};
  var flowerData = selection.flowerData || matched.flower_data || {};
  var chart = matched.chart || {};
  var stage = card.querySelector('.astrology-flower-stage');
  var nameEl = document.getElementById('afCardName');
  var symbolismEl = document.getElementById('afCardSymbolism');
  var keywordsEl = document.getElementById('afCardKeywords');
  var sunBadgeEl = document.getElementById('afCardSunBadge');
  var risingBadgeEl = document.getElementById('afCardRisingBadge');
  var moonBadgeEl = document.getElementById('afCardMoonBadge');
  var dataLineEl = document.getElementById('afCardDataLine');
  var stardust = card.querySelector('.astrology-stardust-field');
  var nebula = card.querySelector('.astrology-flower-nebula');
  var image = card.querySelector('.astrology-flower-stage__image');
  var heroImage = card.querySelector('.astrology-flower-hero-image');
  if (!stage || !nameEl || !symbolismEl || !keywordsEl) return;

  card.style.setProperty('--af-primary', selection.primary);
  card.style.setProperty('--af-secondary', selection.secondary);
  if (matched.theme && matched.theme.palette) {
    if (matched.theme.palette.moonGlowInner) card.style.setProperty('--af-glow-inner', matched.theme.palette.moonGlowInner);
    if (matched.theme.palette.moonGlowOuter) card.style.setProperty('--af-glow-outer', matched.theme.palette.moonGlowOuter);
  }

  nameEl.textContent = selection.flower.name + ' · ' + (selection.flower.scientific_name || 'Unknown species');
  symbolismEl.textContent = matched.astro_verdict || matched.narrative || '점성술 차트 기반 운명꽃을 판독 중입니다.';
  keywordsEl.textContent = 'zodiac flower keywords · ' + selection.keywords.join(' • ');
  if (sunBadgeEl) sunBadgeEl.textContent = chart.sun_sign ? ('태양궁 ' + chart.sun_sign) : '태양궁 미확인';
  if (risingBadgeEl) risingBadgeEl.textContent = chart.rising_sign ? ('상승궁 ' + chart.rising_sign) : '상승궁 미확인';
  if (moonBadgeEl) moonBadgeEl.textContent = chart.moon_sign ? ('달궁 ' + chart.moon_sign) : '달궁 미확인';
  if (dataLineEl) {
    dataLineEl.textContent = (flowerData.focus_signal || '차트 시그널 대기') + ' · ' + (flowerData.ritual_tip || '별의 리듬을 고정 중입니다.');
  }

  if (nebula) {
    nebula.style.background =
      'radial-gradient(circle at 24% 40%, ' + _dfHexToRgba(selection.primary, 0.38) + ', transparent 58%),'
      + 'radial-gradient(circle at 72% 24%, ' + _dfHexToRgba(selection.secondary, 0.34) + ', transparent 56%),'
      + 'radial-gradient(circle at 50% 86%, var(--af-glow-inner, rgba(141,153,255,0.22)), transparent 60%)';
  }

  _afRenderStardust(stardust, selection.primary, selection.secondary);
  _dfApplyGeneratedFlowerImage(image, selection, 'astrology');
  _dfApplyGeneratedFlowerImage(heroImage, selection, 'astrology');

  if (!card.__afPointerBound) {
    card.__afPointerBound = true;
    card.addEventListener('mousemove', function(e) {
      var rect = card.getBoundingClientRect();
      var x = ((e.clientX - rect.left) / rect.width) * 100;
      var y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--af-pointer-x', x.toFixed(2) + '%');
      card.style.setProperty('--af-pointer-y', y.toFixed(2) + '%');
    });
    card.addEventListener('mouseleave', function() {
      card.style.setProperty('--af-pointer-x', '50%');
      card.style.setProperty('--af-pointer-y', '42%');
    });
  }

  stage.classList.remove('is-bloomed');
  void stage.offsetWidth;
  stage.classList.add('is-bloomed');
}

function _jfResolveSelection() {
  var payload = _dfGetProfilePayload({ sourceHint: 'jamidusu' });
  var birthCtx = _dfResolveBirthContext(payload || {});
  if (!_dfHasBirthCore(birthCtx)) return null;

  var matched = null;

  try {
    // 자미두수 데이터는 명궁뿐 아니라 각 궁의 주성 정보를 함께 유지한다.
    // (엔진/렌더가 궁별 별 정보를 참조할 때 누락되지 않도록 함)
    if (typeof window !== 'undefined' && typeof window.calcZiweiPalaces === 'function') {
      try {
        var zw = window.calcZiweiPalaces(
          Number(birthCtx.year),
          Number(birthCtx.month),
          Number(birthCtx.day),
          Number(birthCtx.hour),
          Number(birthCtx.minute)
        );
        if (zw && zw.palacesByIndex && zw.stars) {
          var cleanStarName = function(raw) {
            return String(raw || '')
              .replace(/<[^>]*>/g, ' ')
              .replace(/\(차성\)/g, ' ')
              .replace(/화록|화권|화과|화기/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
          };

          var palaceRows = [];
          var allStarSet = {};
          for (var pi = 0; pi < zw.palacesByIndex.length; pi++) {
            var pName = String(zw.palacesByIndex[pi] || '').trim();
            if (!pName) continue;
            var rawMain = (zw.stars[pi] && Array.isArray(zw.stars[pi].main)) ? zw.stars[pi].main : [];
            var mainStars = rawMain.map(cleanStarName).filter(Boolean);
            for (var si = 0; si < mainStars.length; si++) {
              allStarSet[mainStars[si]] = true;
            }
            var palaceBrightness = '';
            if (zw.palaceStarData && zw.palaceStarData[pi] && zw.palaceStarData[pi].stars && zw.palaceStarData[pi].stars[0]) {
              palaceBrightness = String(zw.palaceStarData[pi].stars[0].strength || '');
            }
            palaceRows.push({ palace: pName, stars: mainStars, brightness: palaceBrightness });
          }

          var mingIdx = zw.palacesByIndex.indexOf('명궁');
          var mingStars = [];
          var brightness = '';
          if (mingIdx >= 0 && zw.stars[mingIdx] && zw.stars[mingIdx].main && zw.stars[mingIdx].main.length) {
            mingStars = zw.stars[mingIdx].main.map(cleanStarName).filter(Boolean);
          }
          if (mingIdx >= 0 && zw.palaceStarData && zw.palaceStarData[mingIdx] && zw.palaceStarData[mingIdx].stars && zw.palaceStarData[mingIdx].stars[0]) {
            brightness = String(zw.palaceStarData[mingIdx].stars[0].strength || '');
          }
          var mainStar = mingStars.join(' · ');
          var allMainStars = Object.keys(allStarSet);
          payload = payload && typeof payload === 'object' ? payload : {};
          payload.ziwei = {
            mainStar: mainStar,
            palace: '명궁',
            brightness: brightness,
            stars: mingStars,
            palaces: palaceRows,
            allMainStars: allMainStars
          };
          payload.domains = payload.domains && typeof payload.domains === 'object' ? payload.domains : {};
          payload.domains.ziwei = {
            main_star: mainStar,
            palace: '명궁',
            brightness: brightness,
            stars: mingStars,
            palaces: palaceRows,
            all_main_stars: allMainStars
          };
        }
      } catch (eFix) {
        // ignore
      }
    }

    if (window.DestinyFlowerEngine && typeof window.DestinyFlowerEngine.matchJamidusuFlower === 'function') {
      matched = window.DestinyFlowerEngine.matchJamidusuFlower(payload, { source: 'jamidusu' });
    } else if (typeof window.matchJamidusuFlower === 'function') {
      matched = window.matchJamidusuFlower(payload, { source: 'jamidusu' });
    } else if (typeof window.getJamidusuFlower === 'function') {
      matched = window.getJamidusuFlower((payload && payload.ziwei) || {});
    }
  } catch (e) {
    console.warn('[JamidusuFlower] 매칭 실패:', e);
  }
  if (!_dfHasReadySourceData('jamidusu', payload)) return null;
  if (!matched) return null;

  var flower = matched && matched.flower;
  if (!flower) {
    flower = {
      id: 'peony_ziwei',
      name: '모란',
      scientific_name: 'Paeonia suffruticosa',
      symbolism: '제왕의 기품과 중심의 힘',
      primary_color: '#D946EF',
      secondary_color: '#F9A8D4',
      keywords: ['제왕', '기품', '중심'],
      particle_type: 'imperial_petal',
      vibe_message: '중심을 지키는 태도가 결국 가장 멀리 갑니다.'
    };
  }

  var theme = matched && matched.theme ? matched.theme : {};
  var primary = _dfSafeColor((flower.primary_color || (theme.palette && theme.palette.primary)), '#D946EF');
  var secondary = _dfSafeColor((flower.secondary_color || (theme.palette && theme.palette.secondary)), '#F9A8D4');
  var keywords = Array.isArray(flower.keywords) && flower.keywords.length
    ? flower.keywords.slice(0, 5)
    : ['ziwei', 'minggong', 'flower'];

  return {
    source: 'jamidusu',
    payload: payload,
    matched: matched,
    theme: theme,
    flowerData: matched && matched.flower_data ? matched.flower_data : null,
    flower: flower,
    primary: primary,
    secondary: secondary,
    keywords: keywords
  };
}

function _jfRenderPetals(container, primary, secondary, shouldFall) {
  if (!container) return;
  container.innerHTML = '';
  for (var i = 0; i < 18; i++) {
    var petal = document.createElement('span');
    petal.className = 'jamidusu-petal';
    if (shouldFall) petal.classList.add('is-fall');
    petal.style.setProperty('--x', (4 + Math.random() * 92).toFixed(2) + '%');
    petal.style.setProperty('--y', (6 + Math.random() * 72).toFixed(2) + '%');
    petal.style.setProperty('--size', (8 + Math.random() * 8).toFixed(2) + 'px');
    petal.style.setProperty('--dur', (2.6 + Math.random() * 2.2).toFixed(2) + 's');
    petal.style.setProperty('--delay', (Math.random() * 2.2).toFixed(2) + 's');
    petal.style.setProperty('--petal-a', _dfHexToRgba(primary, 0.76));
    petal.style.setProperty('--petal-b', _dfHexToRgba(secondary, 0.88));
    container.appendChild(petal);
  }
}

function _jfEnsureCardOpen(card) {
  if (!card) return;
  card.classList.add('feature-card--open');
  var detail = card.querySelector('.feature-card__detail');
  if (detail) detail.setAttribute('aria-hidden', 'false');
  var cta = card.querySelector('.feature-card__cta');
  if (cta) {
    cta.setAttribute('aria-expanded', 'true');
    var labelEl = cta.querySelector('.feature-card__cta-label');
    if (labelEl) labelEl.textContent = '🌺 자미두수 꽃 다시 소환하기';
    var arrowEl = cta.querySelector('.feature-card__cta-arrow');
    if (arrowEl) arrowEl.textContent = '✦';
  }
  syncFeatureCardHeight(card);
}

function _jfApplyCardVisual(card, selection) {
  if (!card || !selection) return;
  var matched = selection.matched || {};
  var flowerData = selection.flowerData || matched.flower_data || {};
  var ziwei = matched.ziwei || {};
  var intensity = matched.visual_intensity || { glow: 0.7, saturation: 0.8, mist: 0.2, brightness_label: '평(平)' };
  var stage = card.querySelector('.jamidusu-flower-stage');
  var nameEl = document.getElementById('jfCardName');
  var symbolismEl = document.getElementById('jfCardSymbolism');
  var keywordsEl = document.getElementById('jfCardKeywords');
  var starBadgeEl = document.getElementById('jfCardStarBadge');
  var brightBadgeEl = document.getElementById('jfCardBrightnessBadge');
  var palaceBadgeEl = document.getElementById('jfCardPalaceBadge');
  var dataLineEl = document.getElementById('jfCardDataLine');
  var petals = card.querySelector('.jamidusu-petal-field');
  var mist = card.querySelector('.jamidusu-mist');
  var image = card.querySelector('.jamidusu-flower-stage__image');
  var heroImage = card.querySelector('.jamidusu-flower-hero-image');
  if (!stage || !nameEl || !symbolismEl || !keywordsEl) return;

  card.style.setProperty('--jf-primary', selection.primary);
  card.style.setProperty('--jf-secondary', selection.secondary);
  card.style.setProperty('--jf-glow-strength', String(intensity.glow || 0.7));
  card.style.setProperty('--jf-mist-opacity', String(intensity.mist || 0.2));
  stage.style.setProperty('--jf-saturation', String(intensity.saturation || 0.8));

  nameEl.textContent = selection.flower.name + ' · ' + (selection.flower.scientific_name || 'Unknown species');
  symbolismEl.textContent = matched.jamidusu_verdict || matched.narrative || '오늘의 강한 별 기반 운명꽃을 판독 중입니다.';
  keywordsEl.textContent = 'ziwei flower keywords · ' + selection.keywords.join(' • ');
  if (starBadgeEl) {
    var starLine = Array.isArray(ziwei.primary_stars) ? ziwei.primary_stars.join('·') : '주성 미확인';
    starBadgeEl.textContent = '오늘의 강한 별 ' + starLine;
  }
  if (brightBadgeEl) brightBadgeEl.textContent = '별 밝기 ' + (ziwei.brightness || intensity.brightness_label || '평(平)');
  if (palaceBadgeEl) palaceBadgeEl.textContent = ziwei.palace || '미확인';
  if (dataLineEl) {
    dataLineEl.textContent = (flowerData.focus_signal || '주성 시그널 대기') + ' · ' + (flowerData.ritual_tip || '별의 기운을 정렬 중입니다.');
  }

  if (mist) {
    mist.style.background =
      'radial-gradient(circle at 22% 38%, ' + _dfHexToRgba(selection.primary, 0.24) + ', transparent 56%),'
      + 'radial-gradient(circle at 72% 64%, ' + _dfHexToRgba(selection.secondary, 0.22) + ', transparent 60%)';
  }

  var shouldFall = Array.isArray(ziwei.primary_stars) && ziwei.primary_stars.some(function(s) {
    return /천기|태음/.test(String(s || ''));
  });
  _jfRenderPetals(petals, selection.primary, selection.secondary, shouldFall);
  _dfApplyGeneratedFlowerImage(image, selection, 'jamidusu');
  _dfApplyGeneratedFlowerImage(heroImage, selection, 'jamidusu');

  card.__jfKeywords = selection.keywords || [];

  if (!card.__jfPopupBound) {
    card.__jfPopupBound = true;
    var popupEl = document.getElementById('jfCardKeywordPopup');
    stage.addEventListener('click', function() {
      if (!popupEl) return;
      popupEl.textContent = (card.__jfKeywords || []).join(' · ') || '제왕의 기품';
      popupEl.classList.add('is-show');
      setTimeout(function() {
        popupEl.classList.remove('is-show');
      }, 1800);
    });
  }

  stage.classList.remove('is-bloomed');
  void stage.offsetWidth;
  stage.classList.add('is-bloomed');
}

function _sfResolveSelection() {
  var payload = _dfGetProfilePayload({ sourceHint: 'sukuyo' });
  var birthCtx = _dfResolveBirthContext(payload || {});
  if (!_dfHasBirthCore(birthCtx)) return null;

  var matched = null;

  try {
    if (window.DestinyFlowerEngine && typeof window.DestinyFlowerEngine.matchSukuyoFlower === 'function') {
      matched = window.DestinyFlowerEngine.matchSukuyoFlower(payload, { source: 'sukuyo' });
    } else if (typeof window.matchSukuyoFlower === 'function') {
      matched = window.matchSukuyoFlower(payload, { source: 'sukuyo' });
    } else if (typeof window.calculateSukyoFlower === 'function') {
      var b = (payload && payload.birth) || (payload && payload.identity && payload.identity.birth) || {};
      var idx = (((Number(b.year || 2000) * 372 + Number(b.month || 1) * 31 + Number(b.day || 1) + 13) % 27) + 27) % 27 + 1;
      matched = window.calculateSukyoFlower(idx, payload && payload.sukuyo && payload.sukuyo.phase);
    }
  } catch (e) {
    console.warn('[SukuyoFlower] 매칭 실패:', e);
  }
  if (!_dfHasReadySourceData('sukuyo', payload)) return null;
  if (!matched) return null;

  var flower = matched && matched.flower;
  if (!flower) {
    flower = {
      id: 'moon_lily',
      name: '백합',
      scientific_name: 'Lilium candidum',
      symbolism: '달빛 속에서 맑게 피어나는 수호의 꽃',
      primary_color: '#F8FAFC',
      secondary_color: '#93C5FD',
      keywords: ['달빛', '수호', '정화'],
      particle_type: 'lunar_pollen',
      vibe_message: '오늘 밤 달의 호흡과 리듬을 맞추면 선택이 더 선명해집니다.'
    };
  }

  var theme = matched && matched.theme ? matched.theme : {};
  var primary = _dfSafeColor((flower.primary_color || (theme.palette && theme.palette.primary)), '#F8FAFC');
  var secondary = _dfSafeColor((flower.secondary_color || (theme.palette && theme.palette.secondary)), '#93C5FD');
  var sukuyo = (matched && matched.sukuyo) || {};
  var keywords = Array.isArray(flower.keywords) && flower.keywords.length
    ? flower.keywords.slice(0, 5)
    : [sukuyo.mansion_name || '숙요', sukuyo.guardian_animal || '수호동물', sukuyo.moon_phase || '달위상'];

  return {
    source: 'sukuyo',
    payload: payload,
    matched: matched,
    theme: theme,
    flowerData: matched && matched.flower_data ? matched.flower_data : null,
    flower: flower,
    primary: primary,
    secondary: secondary,
    keywords: keywords
  };
}

function _sfRenderStarfall(container, primary, secondary) {
  if (!container) return;
  container.innerHTML = '';
  for (var i = 0; i < 20; i++) {
    var star = document.createElement('span');
    star.className = 'sukuyo-starfall';
    star.style.setProperty('--x', (3 + Math.random() * 94).toFixed(2) + '%');
    star.style.setProperty('--y', (4 + Math.random() * 54).toFixed(2) + '%');
    star.style.setProperty('--len', (10 + Math.random() * 16).toFixed(2) + 'px');
    star.style.setProperty('--dur', (1.6 + Math.random() * 2.6).toFixed(2) + 's');
    star.style.setProperty('--delay', (Math.random() * 1.8).toFixed(2) + 's');
    star.style.setProperty('--star-a', _dfHexToRgba(primary, 0.72));
    star.style.setProperty('--star-b', _dfHexToRgba(secondary, 0.94));
    container.appendChild(star);
  }
}

function _sfRenderOrbit(container, primary, secondary) {
  if (!container) return;
  container.innerHTML = '';
  for (var i = 0; i < 27; i++) {
    var dot = document.createElement('span');
    dot.className = 'sukuyo-orbit-dot';
    dot.style.setProperty('--i', String(i));
    dot.style.setProperty('--orbit-color-a', _dfHexToRgba(primary, 0.76));
    dot.style.setProperty('--orbit-color-b', _dfHexToRgba(secondary, 0.84));
    container.appendChild(dot);
  }
}

function _sfEnsureCardOpen(card) {
  if (!card) return;
  card.classList.add('feature-card--open');
  var detail = card.querySelector('.feature-card__detail');
  if (detail) detail.setAttribute('aria-hidden', 'false');
  var cta = card.querySelector('.feature-card__cta');
  if (cta) {
    cta.setAttribute('aria-expanded', 'true');
    var labelEl = cta.querySelector('.feature-card__cta-label');
    if (labelEl) labelEl.textContent = '🌙 숙요 꽃 다시 소환하기';
    var arrowEl = cta.querySelector('.feature-card__cta-arrow');
    if (arrowEl) arrowEl.textContent = '✦';
  }
  syncFeatureCardHeight(card);
}

function _sfApplyCardVisual(card, selection) {
  if (!card || !selection) return;
  var matched = selection.matched || {};
  var flowerData = selection.flowerData || matched.flower_data || {};
  var sukuyo = matched.sukuyo || {};
  var intensity = matched.visual_intensity || { glow: 0.72, halo: 0.56, moon_style: 'lunar_flow', moon_label: '상현/하현달' };
  var theme = matched.theme || {};

  var stage = card.querySelector('.sukuyo-flower-stage');
  var nameEl = document.getElementById('sfCardName');
  var symbolismEl = document.getElementById('sfCardSymbolism');
  var keywordsEl = document.getElementById('sfCardKeywords');
  var mansionBadgeEl = document.getElementById('sfCardMansionBadge');
  var phaseBadgeEl = document.getElementById('sfCardPhaseBadge');
  var guardianBadgeEl = document.getElementById('sfCardGuardianBadge');
  var dataLineEl = document.getElementById('sfCardDataLine');
  var starfall = card.querySelector('.sukuyo-starfall-field');
  var orbit = card.querySelector('.sukuyo-orbit-field');
  var constellationPath = document.getElementById('sfCardConstellationPath');
  var image = card.querySelector('.sukuyo-flower-stage__image');
  var heroImage = card.querySelector('.sukuyo-flower-hero-image');
  if (!stage || !nameEl || !symbolismEl || !keywordsEl) return;

  card.style.setProperty('--sf-primary', selection.primary);
  card.style.setProperty('--sf-secondary', selection.secondary);
  card.style.setProperty('--sf-glow', String(intensity.glow || 0.72));
  card.style.setProperty('--sf-halo', String(intensity.halo || 0.56));
  if (theme.palette && theme.palette.bgGradient) {
    stage.style.setProperty('--sf-lunar-bg', theme.palette.bgGradient);
  }

  nameEl.textContent = selection.flower.name + ' · ' + (selection.flower.scientific_name || 'Unknown species');
  symbolismEl.textContent = matched.sukuyo_verdict || matched.narrative || '숙요 27숙 기반 운명꽃을 판독 중입니다.';
  keywordsEl.textContent = 'sukuyo flower keywords · ' + selection.keywords.join(' • ');
  if (mansionBadgeEl) {
    var mansionLabel = _dfNormalizeSukuyoMansionLabel(sukuyo.mansion_name);
    var groupLabel = _dfNormalizeSukuyoGroupLabel(sukuyo.group);
    mansionBadgeEl.textContent = (mansionLabel || '숙 미확인') + (groupLabel ? (' · ' + groupLabel) : '');
  }
  if (phaseBadgeEl) phaseBadgeEl.textContent = '달 위상 ' + (sukuyo.moon_phase || intensity.moon_label || '판정 대기');
  if (guardianBadgeEl) guardianBadgeEl.textContent = '수호동물 ' + (sukuyo.guardian_animal || '미확인');
  if (dataLineEl) {
    dataLineEl.textContent = (flowerData.focus_signal || '숙요 시그널 대기') + ' · ' + (flowerData.ritual_tip || '달의 리듬을 동기화 중입니다.');
  }

  if (constellationPath) {
    var points = (sukuyo.constellation_points || (theme && theme.constellation_points) || []).slice(0, 10);
    if (points.length >= 2) {
      var d = 'M ' + points[0][0] + ' ' + points[0][1];
      for (var i = 1; i < points.length; i++) d += ' L ' + points[i][0] + ' ' + points[i][1];
      constellationPath.setAttribute('d', d);
    }
  }

  _sfRenderStarfall(starfall, selection.primary, selection.secondary);
  _sfRenderOrbit(orbit, selection.primary, selection.secondary);
  _dfApplyGeneratedFlowerImage(image, selection, 'sukuyo');
  _dfApplyGeneratedFlowerImage(heroImage, selection, 'sukuyo');

  stage.classList.remove('is-eclipse', 'is-full-glow', 'is-lunar-flow', 'is-bloomed');
  if (intensity.moon_style === 'eclipse') stage.classList.add('is-eclipse');
  else if (intensity.moon_style === 'full_glow') stage.classList.add('is-full-glow');
  else stage.classList.add('is-lunar-flow');

  if (!card.__sfTiltBound) {
    card.__sfTiltBound = true;
    var image = card.querySelector('.sukuyo-flower-stage__image');
    card.addEventListener('mousemove', function(e) {
      if (!image) return;
      var rect = card.getBoundingClientRect();
      var rx = ((e.clientY - rect.top) / rect.height - 0.5) * -6;
      var ry = ((e.clientX - rect.left) / rect.width - 0.5) * 7;
      image.style.transform = 'rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) scale(1.02)';
    });
    card.addEventListener('mouseleave', function() {
      if (image) image.style.transform = '';
    });
    card.addEventListener('touchmove', function() {
      if (image) image.style.transform = 'scale(1.015)';
    }, { passive: true });
    card.addEventListener('touchend', function() {
      if (image) image.style.transform = '';
    }, { passive: true });
  }

  void stage.offsetWidth;
  stage.classList.add('is-bloomed');
}

function _dfApplyCardVisual(card, selection) {
  if (!card || !selection) return;
  var source = _dfNormalizeSource(selection.source || _dfStudioState.activeSource || 'saju');
  selection.source = source;
  var sourceMeta = _DF_SOURCE_META[source] || _DF_SOURCE_META.saju;
  var stageContent = _dfGetUnifiedStageContent(selection);
  var sajuVerdict = _dfGetSajuVerdict(selection);
  var flowerData = selection.flowerData || (selection.matched && selection.matched.flower_data) || {};
  var stage = card.querySelector('.destiny-flower-stage');
  var nameEl = card.querySelector('.destiny-flower-stage__name');
  var symbolismEl = card.querySelector('.destiny-flower-stage__symbolism');
  var keywordsEl = card.querySelector('.destiny-flower-stage__keywords');
  var descEl = document.getElementById('dfUnifiedCardDesc');
  var dayMasterBadgeEl = document.getElementById('dfCardDayMasterBadge');
  var seasonBadgeEl = document.getElementById('dfCardSeasonBadge');
  var environmentBadgeEl = document.getElementById('dfCardEnvironmentBadge');
  var scenarioTitleEl = document.getElementById('dfCardScenarioTitle');
  var dataLineEl = document.getElementById('dfCardDataLine');
  var backdrop = card.querySelector('.destiny-flower-backdrop');
  var glow = card.querySelector('.destiny-flower-glow');
  var particles = card.querySelector('.destiny-flower-particles');
  var image = card.querySelector('.destiny-flower-stage__image');
  var heroImage = card.querySelector('.destiny-flower-hero-image');
  if (!stage || !nameEl || !symbolismEl || !keywordsEl) return;

  _dfSyncSourceTabs(source);
  _dfSyncSourceStickers(source);

  card.style.setProperty('--df-primary', selection.primary);
  card.style.setProperty('--df-secondary', selection.secondary);
  stage.setAttribute('data-source', source);
  if (selection.theme && selection.theme.background && selection.theme.background.gradient) {
    card.style.setProperty('--df-env-gradient', selection.theme.background.gradient);
  }
  if (selection.theme && selection.theme.background && selection.theme.background.season_tint) {
    card.style.setProperty('--df-season-tint', selection.theme.background.season_tint);
  }

  nameEl.textContent = selection.flower.name + ' · ' + (selection.flower.scientific_name || 'Unknown species');
  symbolismEl.textContent = stageContent.symbolism || sajuVerdict;
  keywordsEl.textContent = sourceMeta.labelKo + ' 키워드 · ' + (_dfToArray(selection.keywords).join(' • ') || sourceMeta.fallbackKeyword);
  if (descEl) descEl.textContent = sourceMeta.description;
  if (dayMasterBadgeEl) dayMasterBadgeEl.textContent = stageContent.badge1;
  if (seasonBadgeEl) seasonBadgeEl.textContent = stageContent.badge2;
  if (environmentBadgeEl) environmentBadgeEl.textContent = stageContent.badge3;
  if (scenarioTitleEl) scenarioTitleEl.textContent = stageContent.scenarioTitle;
  if (dataLineEl) dataLineEl.textContent = stageContent.dataLine;

  if (backdrop) {
    backdrop.style.background =
      'radial-gradient(circle at 22% 50%, ' + _dfHexToRgba(selection.primary, 0.46) + ', transparent 56%),'
      + 'radial-gradient(circle at 72% 34%, ' + _dfHexToRgba(selection.secondary, 0.40) + ', transparent 60%)';
  }
  if (glow) {
    glow.style.background = 'radial-gradient(circle, ' + _dfHexToRgba(selection.secondary, 0.62) + ', rgba(255,255,255,0))';
  }

  _dfRenderPetals(particles, selection.primary, selection.secondary);
  _dfApplyGeneratedFlowerImage(image, selection, source);
  _dfApplyGeneratedFlowerImage(heroImage, selection, source);
  stage.classList.remove('is-motion-wood', 'is-motion-water', 'is-motion-fire');
  if (source === 'astrology' || source === 'sukuyo') {
    stage.classList.add('is-motion-water');
  } else if (source === 'jamidusu') {
    stage.classList.add('is-motion-fire');
  } else if (flowerData.motion_preset === 'water-flow') {
    stage.classList.add('is-motion-water');
  } else if (flowerData.motion_preset === 'fire-bloom') {
    stage.classList.add('is-motion-fire');
  } else {
    stage.classList.add('is-motion-wood');
  }
  stage.classList.remove('is-bloomed');
  void stage.offsetWidth;
  stage.classList.add('is-bloomed');
}

function _dfSetBodyLock(locked) {
  if (window._perf && typeof window._perf.lockBody === 'function' && typeof window._perf.unlockBody === 'function') {
    if (locked) window._perf.lockBody();
    else window._perf.unlockBody();
    return;
  }
  if (locked) {
    if (!document.body.dataset.dfPrevOverflow) {
      document.body.dataset.dfPrevOverflow = document.body.style.overflow || '';
    }
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = document.body.dataset.dfPrevOverflow || '';
    delete document.body.dataset.dfPrevOverflow;
  }
}

var _DF_STUDIO_HISTORY_KEY = 'destinyFlowerStudioHistory.v1';
var _DF_STUDIO_HISTORY_LIMIT = 12;
var _DF_ACTIVE_SOURCE_KEY = 'destinyFlowerActiveSource.v1';
var _DF_SOURCE_PROGRESS_KEY = 'destinyFlowerSourceProgress.v1';
var _DF_SOURCE_UNLOCK_MODE_KEY = 'destinyFlowerSourceUnlockMode.v1';
var _DF_SOURCE_UNLOCK_MODES = { sequential: true, cumulative: true };
var _DF_SOURCE_UNLOCK_DEFAULT_MODE = 'sequential';
var _DF_SOURCE_ORDER = ['saju', 'astrology', 'jamidusu', 'sukuyo'];
var _DF_SOURCE_ALIAS = {
  astro: 'astrology',
  zodiac: 'astrology',
  ziwei: 'jamidusu',
  jami: 'jamidusu',
  suk: 'sukuyo',
  lunar: 'sukuyo',
  bazi: 'saju',
  fourpillars: 'saju'
};
var _DF_SOURCE_META = {
  saju: {
    labelKo: '사주',
    stickerMain: '四柱',
    stickerSub: 'Native',
    description: '당신의 일간과 월령, 오행의 균형을 하나하나 읽어, 지금 이 계절 당신의 기운과 가장 깊이 맞닿는 꽃 한 송이를 골라 드립니다.',
    fallbackKeyword: 'saju • bloom • destiny'
  },
  astrology: {
    labelKo: '점성술',
    stickerMain: 'Zodiac',
    stickerSub: 'Star',
    description: '태양궁·상승궁·달궁이 그리는 세 갈래 별빛을 겹쳐 읽어, 지금 당신의 별자리와 가장 맑게 어우러지는 꽃을 피워 드립니다.',
    fallbackKeyword: 'zodiac • nebula • stardust'
  },
  jamidusu: {
    labelKo: '자미두수',
    stickerMain: '紫微',
    stickerSub: 'Purple Star',
    description: '명궁에 든 주성과 그 밝기, 사화의 흐름을 짚어, 지금 당신의 명반이 가장 또렷하게 피워 내는 꽃을 찾아 드립니다.',
    fallbackKeyword: 'ziwei • ming-gong • imperial bloom'
  },
  sukuyo: {
    labelKo: '숙요점',
    stickerMain: '27-Suk',
    stickerSub: '宿曜',
    description: '태어난 날의 27수와 오늘 밤 달의 위상을 맞대어, 지금 당신의 마음결과 가장 곱게 맞물리는 꽃을 건네 드립니다.',
    fallbackKeyword: 'sukuyo • lunar mansion • moon bloom'
  }
};

var _dfStudioState = {
  selection: null,
  history: [],
  flowerData: null,
  profileSignature: '',
  activeSource: 'saju',
  loadingSource: '',
  loadingTasks: {},
  userRequestedLoad: {},
  linkedSources: {},
  unlockMode: _DF_SOURCE_UNLOCK_DEFAULT_MODE,
  sourceProgress: {
    saju: false,
    astrology: false,
    jamidusu: false,
    sukuyo: false
  },
  sourceUnlockCache: {
    saju: true,
    astrology: false,
    jamidusu: false,
    sukuyo: false
  },
  coinGatePassed: false,
  coinGateInFlight: false,
  _coinGatePassToken: null  // 유료 게이트 토큰 (내부 콜백용, 외부 호출 방어)
};

var _DF_STUDIO_TITLE = '🌸 운명의 꽃 아틀리에';
var _dfOriginalTitle = null;

function _dfCaptureOriginalTitle() {
  if (!_dfOriginalTitle) {
    _dfOriginalTitle = document.title || '';
  }
}

function _dfApplyStudioTitle() {
  _dfCaptureOriginalTitle();
  document.title = _DF_STUDIO_TITLE;
}

function _dfRestoreOriginalTitle() {
  if (_dfOriginalTitle) {
    document.title = _dfOriginalTitle;
  }
}

function _dfMaybeRestoreTitleAfterNavigation() {
  var overlay = document.getElementById('destinyFlowerStudioOverlay');
  if (!overlay || overlay.style.display === 'none' || !overlay.classList.contains('is-show')) {
    _dfRestoreOriginalTitle();
  }
}

function _dfBindTitleRestoreGuards() {
  if (window.__dfTitleRestoreGuardsBound) return;
  window.__dfTitleRestoreGuardsBound = true;

  window.addEventListener('hashchange', _dfMaybeRestoreTitleAfterNavigation, true);
  window.addEventListener('popstate', _dfMaybeRestoreTitleAfterNavigation, true);

  if (window.history && !window.history.__dfTitleWrapped) {
    window.history.__dfTitleWrapped = true;
    var originalPushState = window.history.pushState;
    var originalReplaceState = window.history.replaceState;
    window.history.pushState = function() {
      var result = originalPushState.apply(this, arguments);
      _dfMaybeRestoreTitleAfterNavigation();
      return result;
    };
    window.history.replaceState = function() {
      var result = originalReplaceState.apply(this, arguments);
      _dfMaybeRestoreTitleAfterNavigation();
      return result;
    };
  }
}

function _dfToArray(v) {
  return Array.isArray(v) ? v.filter(function(item) { return !!item; }) : [];
}

function _dfNormalizeSource(source) {
  var value = String(source || '').trim().toLowerCase();
  if (_DF_SOURCE_ORDER.indexOf(value) >= 0) return value;
  if (_DF_SOURCE_ALIAS[value]) return _DF_SOURCE_ALIAS[value];
  return 'saju';
}

function _dfLoadActiveSource() {
  try {
    return _dfNormalizeSource(localStorage.getItem(_DF_ACTIVE_SOURCE_KEY) || 'saju');
  } catch (e) {
    return 'saju';
  }
}

function _dfPersistActiveSource(source) {
  try {
    localStorage.setItem(_DF_ACTIVE_SOURCE_KEY, _dfNormalizeSource(source));
  } catch (e) {}
}

function _dfCreateSourceProgressTemplate() {
  var template = {};
  for (var i = 0; i < _DF_SOURCE_ORDER.length; i += 1) {
    template[_DF_SOURCE_ORDER[i]] = false;
  }
  return template;
}

function _dfResolveSourceUnlockMode(rawMode) {
  var mode = String(rawMode || '').trim().toLowerCase();
  if (_DF_SOURCE_UNLOCK_MODES[mode]) return mode;
  return _DF_SOURCE_UNLOCK_DEFAULT_MODE;
}

function _dfLoadSourceUnlockMode() {
  try {
    if (typeof window !== 'undefined' && window.__dfSourceUnlockMode) {
      return _dfResolveSourceUnlockMode(window.__dfSourceUnlockMode);
    }
  } catch (_) {}
  try {
    return _dfResolveSourceUnlockMode(localStorage.getItem(_DF_SOURCE_UNLOCK_MODE_KEY));
  } catch (_) {
    return _DF_SOURCE_UNLOCK_DEFAULT_MODE;
  }
}

function _dfPersistSourceProgressState() {
  try {
    localStorage.setItem(_DF_SOURCE_UNLOCK_MODE_KEY, _dfResolveSourceUnlockMode(_dfStudioState.unlockMode));
    localStorage.setItem(_DF_SOURCE_PROGRESS_KEY, JSON.stringify({
      mode: _dfResolveSourceUnlockMode(_dfStudioState.unlockMode),
      progress: _dfStudioState.sourceProgress || _dfCreateSourceProgressTemplate()
    }));
  } catch (_) {}
}

function _dfLoadSourceProgressState() {
  var progress = _dfCreateSourceProgressTemplate();
  var mode = _dfLoadSourceUnlockMode();
  try {
    var raw = localStorage.getItem(_DF_SOURCE_PROGRESS_KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        var parsedProgress = (parsed.progress && typeof parsed.progress === 'object') ? parsed.progress : parsed;
        for (var i = 0; i < _DF_SOURCE_ORDER.length; i += 1) {
          var src = _DF_SOURCE_ORDER[i];
          progress[src] = parsedProgress[src] === true;
        }
        if (parsed.mode) mode = _dfResolveSourceUnlockMode(parsed.mode);
      }
    }
  } catch (_) {}
  _dfStudioState.unlockMode = _dfResolveSourceUnlockMode(mode);
  _dfStudioState.sourceProgress = progress;
  _dfRefreshSourceUnlockCache(true);
}

function _dfGetRequiredSourceForUnlock(source) {
  var normalized = _dfNormalizeSource(source);
  var idx = _DF_SOURCE_ORDER.indexOf(normalized);
  if (idx <= 0) return null;
  var progress = _dfStudioState.sourceProgress || _dfCreateSourceProgressTemplate();
  for (var i = idx - 1; i >= 0; i -= 1) {
    var prevSource = _DF_SOURCE_ORDER[i];
    if (!progress[prevSource]) return prevSource;
  }
  return _DF_SOURCE_ORDER[idx - 1] || null;
}

function _dfGetNextRecommendedSource() {
  var cache = _dfRefreshSourceUnlockCache();
  var progress = _dfStudioState.sourceProgress || _dfCreateSourceProgressTemplate();
  for (var i = 0; i < _DF_SOURCE_ORDER.length; i += 1) {
    var source = _DF_SOURCE_ORDER[i];
    if (cache[source] && !progress[source]) return source;
  }
  return null;
}

function _dfBuildSourceFlowGuide() {
  var nextSource = _dfGetNextRecommendedSource();
  if (!nextSource) return '모든 꽃이 개화되었습니다. 원하는 탭에서 다시 감상해 보세요.';
  if (nextSource === 'saju') return '다음 단계: 사주 꽃을 먼저 열어 개화를 시작해 보세요.';
  return '다음 단계: ' + _dfGetSourceLabel(nextSource) + ' 꽃으로 이동해 개화를 이어가세요.';
}

function _dfIsSourcePaidUnlocked(source) {
  var normalized = _dfNormalizeSource(source);
  if (normalized === 'saju') return true;
  var tile = _dfResolveLockTileBySource(normalized);
  if (!tile) return false;
  var lockKey = tile.getAttribute('data-tile-lock-key') || '';
  var lockCost = Number(tile.getAttribute('data-tile-lock-cost') || 0);
  if (!lockKey || lockCost <= 0) return true;
  if (_dfIsLockKeyUnlocked(lockKey)) return true;
  if (tile.classList && tile.classList.contains('tarot-tile--tileUnlocked')) return true;
  return false;
}

function _dfComputeSourceUnlockCache() {
  var cache = {
    saju: true,
    astrology: false,
    jamidusu: false,
    sukuyo: false
  };
  var mode = _dfResolveSourceUnlockMode(_dfStudioState.unlockMode);
  var progress = _dfStudioState.sourceProgress || _dfCreateSourceProgressTemplate();

  if (mode === 'cumulative') {
    var completedCount = 0;
    for (var i = 0; i < _DF_SOURCE_ORDER.length; i += 1) {
      if (progress[_DF_SOURCE_ORDER[i]]) completedCount += 1;
    }
    for (var j = 1; j < _DF_SOURCE_ORDER.length && j <= completedCount; j += 1) {
      cache[_DF_SOURCE_ORDER[j]] = true;
    }
  } else {
    for (var k = 1; k < _DF_SOURCE_ORDER.length; k += 1) {
      cache[_DF_SOURCE_ORDER[k]] = !!progress[_DF_SOURCE_ORDER[k - 1]];
    }
  }

  for (var p = 0; p < _DF_SOURCE_ORDER.length; p += 1) {
    var src = _DF_SOURCE_ORDER[p];
    if (_dfIsSourcePaidUnlocked(src)) cache[src] = true;
  }
  return cache;
}

function _dfRefreshSourceUnlockCache(forceRecalc) {
  if (!forceRecalc && _dfStudioState.sourceUnlockCache) {
    return _dfStudioState.sourceUnlockCache;
  }
  _dfStudioState.sourceUnlockCache = _dfComputeSourceUnlockCache();
  return _dfStudioState.sourceUnlockCache;
}

function _dfSyncSourceTabsLockState(options) {
  var opts = options && typeof options === 'object' ? options : {};
  var cache = _dfRefreshSourceUnlockCache(true);
  var tabs = document.querySelectorAll('.df-source-tab[data-df-source-tab]');
  if (!tabs || !tabs.length) return;
  var nextSource = _dfGetNextRecommendedSource();
  var highlightMap = Object.create(null);
  var highlights = Array.isArray(opts.highlightSources) ? opts.highlightSources : [];
  for (var h = 0; h < highlights.length; h += 1) {
    highlightMap[_dfNormalizeSource(highlights[h])] = true;
  }

  tabs.forEach(function(tab) {
    var src = _dfNormalizeSource(tab.getAttribute('data-df-source-tab'));
    var unlocked = cache[src] === true;
    tab.classList.toggle('is-locked', !unlocked);
    tab.classList.toggle('is-unlocked', unlocked);
    tab.classList.toggle('is-next-target', src === nextSource);
    tab.setAttribute('data-df-unlocked', unlocked ? 'true' : 'false');

    if (!unlocked) {
      var required = _dfGetRequiredSourceForUnlock(src);
      var lockLabel = required ? (_dfGetSourceLabel(required) + ' 완료 시 해금') : '해금 조건 필요';
      tab.setAttribute('aria-disabled', 'true');
      tab.setAttribute('data-df-lock-label', lockLabel);
      tab.title = lockLabel;
    } else {
      tab.removeAttribute('aria-disabled');
      tab.removeAttribute('data-df-lock-label');
      tab.removeAttribute('title');
    }

    if (highlightMap[src]) {
      tab.classList.remove('is-unlock-reveal');
      void tab.offsetWidth;
      tab.classList.add('is-unlock-reveal');
      if (tab.__dfUnlockRevealTimer) clearTimeout(tab.__dfUnlockRevealTimer);
      tab.__dfUnlockRevealTimer = setTimeout(function() {
        tab.classList.remove('is-unlock-reveal');
        tab.__dfUnlockRevealTimer = null;
      }, 960);
    }
  });
}

function _dfMarkSourceCompleted(source, options) {
  var opts = options && typeof options === 'object' ? options : {};
  var normalized = _dfNormalizeSource(source);
  if (_DF_SOURCE_ORDER.indexOf(normalized) < 0) {
    return { changed: false, newlyUnlocked: [] };
  }

  if (!_dfStudioState.sourceProgress || typeof _dfStudioState.sourceProgress !== 'object') {
    _dfStudioState.sourceProgress = _dfCreateSourceProgressTemplate();
  }

  var before = _dfRefreshSourceUnlockCache(true);
  var beforeMap = {};
  for (var i = 0; i < _DF_SOURCE_ORDER.length; i += 1) {
    var src = _DF_SOURCE_ORDER[i];
    beforeMap[src] = before[src] === true;
  }

  if (_dfStudioState.sourceProgress[normalized] === true) {
    _dfSyncSourceTabsLockState();
    return { changed: false, newlyUnlocked: [] };
  }

  _dfStudioState.sourceProgress[normalized] = true;
  _dfPersistSourceProgressState();

  var after = _dfRefreshSourceUnlockCache(true);
  var newlyUnlocked = [];
  for (var j = 0; j < _DF_SOURCE_ORDER.length; j += 1) {
    var sourceName = _DF_SOURCE_ORDER[j];
    if (after[sourceName] === true && beforeMap[sourceName] !== true) {
      newlyUnlocked.push(sourceName);
    }
  }

  _dfSyncSourceTabsLockState({ highlightSources: newlyUnlocked });
  if (!opts.silent && newlyUnlocked.length) {
    _dfSetStudioStatus('✨ ' + _dfGetSourceLabel(newlyUnlocked[0]) + ' 꽃이 새로 열렸습니다.');
  }
  return { changed: true, newlyUnlocked: newlyUnlocked };
}

function _dfSyncSourceTabs(source) {
  var normalized = _dfNormalizeSource(source);
  var tabs = document.querySelectorAll('.df-source-tab[data-df-source-tab]');
  if (!tabs || !tabs.length) return;
  tabs.forEach(function(tab) {
    var tabSource = _dfNormalizeSource(tab.getAttribute('data-df-source-tab'));
    var active = tabSource === normalized;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  _dfSyncSourceTabsLockState();
}

function _dfApplySourceBadgeStyles(el, baseClass, source, mainText, subText) {
  if (!el) return;
  var normalized = _dfNormalizeSource(source);
  var cls = baseClass === 'hero' ? 'df-source-badge--' : 'df-stage-source-sticker--';
  _DF_SOURCE_ORDER.forEach(function(src) {
    el.classList.remove(cls + src);
  });
  el.classList.add(cls + normalized);
  el.innerHTML = '<b>' + _dfEscapeHtml(mainText || '') + '</b><em>' + _dfEscapeHtml(subText || '') + '</em>';
}

function _dfSyncSourceStickers(source) {
  var normalized = _dfNormalizeSource(source);
  var meta = _DF_SOURCE_META[normalized] || _DF_SOURCE_META.saju;
  var heroSticker = document.getElementById('dfHeroSourceSticker');
  var stageSticker = document.getElementById('dfStageSourceSticker');
  _dfApplySourceBadgeStyles(heroSticker, 'hero', normalized, meta.stickerMain, meta.stickerSub);
  _dfApplySourceBadgeStyles(stageSticker, 'stage', normalized, meta.stickerMain, meta.stickerSub);
}

function _dfSetActiveSource(source) {
  var normalized = _dfNormalizeSource(source);
  _dfStudioState.activeSource = normalized;
  _dfPersistActiveSource(normalized);
  _dfSyncSourceTabs(normalized);
  _dfSyncSourceStickers(normalized);
  return normalized;
}

function _dfIsSourceLinked(source) {
  var normalized = _dfNormalizeSource(source);
  return !!(_dfStudioState.linkedSources && _dfStudioState.linkedSources[normalized]);
}

function _dfCanResolveSourceSelection(source, forceRefresh) {
  var normalized = _dfNormalizeSource(source);
  if (forceRefresh) return true;
  if (_dfStudioState.userRequestedLoad && _dfStudioState.userRequestedLoad[normalized]) return true;
  return _dfIsSourceLinked(normalized);
}

function _dfResolveSelectionBySource(source) {
  var normalized = _dfNormalizeSource(source);
  if (normalized === 'astrology') return _afResolveSelection();
  if (normalized === 'jamidusu') return _jfResolveSelection();
  if (normalized === 'sukuyo') return _sfResolveSelection();
  return _dfResolveSelection();
}

function _dfBuildUnifiedFlowerData(forceRefresh, source) {
  var normalizedSource = _dfNormalizeSource(source || _dfStudioState.activeSource || 'saju');
  var userRequested = !!(_dfStudioState.userRequestedLoad && _dfStudioState.userRequestedLoad[normalizedSource]);
  var hasCache = !!(_dfStudioState.flowerData && _dfStudioState.flowerData.sources);
  if (!hasCache) {
    _dfStudioState.flowerData = {
      updatedAt: 0,
      sources: {}
    };
  }

  var sources = _dfStudioState.flowerData.sources;
  // If cached selection exists and user did not request recalculation, reuse it.
  if (!forceRefresh && !userRequested && typeof sources[normalizedSource] !== 'undefined') {
    return _dfStudioState.flowerData;
  }

  try {
    var selection = _dfResolveSelectionBySource(normalizedSource);
    if (selection) selection.source = _dfNormalizeSource(selection.source || normalizedSource);
    sources[normalizedSource] = selection || null;
  } catch (e) {
    console.warn('[DestinyFlower] 통합 데이터 계산 실패 (' + normalizedSource + '):', e);
    sources[normalizedSource] = null;
  }

  _dfStudioState.flowerData.updatedAt = Date.now();
  return _dfStudioState.flowerData;
}

function _dfGetUnifiedSelection(source, forceRefresh) {
  var normalized = _dfNormalizeSource(source);
  if (!_dfCanResolveSourceSelection(normalized, !!forceRefresh)) {
    return null;
  }
  var userRequested = !!(_dfStudioState.userRequestedLoad && _dfStudioState.userRequestedLoad[normalized]);
  var shouldResolve = !!forceRefresh || userRequested;
  var data = _dfBuildUnifiedFlowerData(!!forceRefresh, normalized);
  var selection = data && data.sources ? data.sources[normalized] : null;
  if (!selection && shouldResolve) {
    selection = _dfResolveSelectionBySource(normalized);
  }
  if (!selection && normalized === 'saju' && shouldResolve) {
    selection = _dfResolveSelection();
  }
  if (selection) selection.source = _dfNormalizeSource(selection.source || normalized);
  return selection;
}

_dfStudioState.activeSource = _dfLoadActiveSource();
_dfLoadSourceProgressState();

function _dfGetSajuVerdict(selection) {
  if (!selection) return '운명의 꽃 판정을 준비 중입니다.';
  var matched = selection.matched || {};
  if (matched.sukuyo_verdict) return matched.sukuyo_verdict;
  if (matched.jamidusu_verdict) return matched.jamidusu_verdict;
  if (matched.astro_verdict) return matched.astro_verdict;
  if (matched.saju_verdict) return matched.saju_verdict;
  if (matched.verdict) return matched.verdict;
  var flower = selection.flower || {};
  var flowerName = flower.name || '운명의 꽃';
  var latin = flower.scientific_name ? ' (' + flower.scientific_name + ')' : '';
  if (selection.source === 'sukuyo') {
    return '숙요점으로 볼 때 당신의 꽃은 ' + flowerName + latin + ' 입니다.';
  }
  if (selection.source === 'jamidusu') {
    return '자미두수로 볼 때 당신의 꽃은 ' + flowerName + latin + ' 입니다.';
  }
  if (selection.source === 'astrology') {
    return '점성술로 볼 때 당신의 꽃은 ' + flowerName + latin + ' 입니다.';
  }
  return '사주로 볼 때 당신의 꽃은 ' + flowerName + latin + ' 입니다.';
}

function _dfElementLabelKo(raw) {
  var map = {
    wood: '목(木)',
    fire: '화(火)',
    earth: '토(土)',
    metal: '금(金)',
    water: '수(水)',
    Wood: '목(木)',
    Fire: '화(火)',
    Earth: '토(土)',
    Metal: '금(金)',
    Water: '수(水)'
  };
  return map[String(raw || '').trim()] || String(raw || '').trim();
}

function _dfJohuLabel(raw) {
  var v = String(raw || '').trim().toLowerCase();
  if (!v) return '판정 대기';
  if (v === 'hot' || v === 'warm') return '온조(溫燥)';
  if (v === 'cold' || v === 'cool') return '한습(寒濕)';
  if (v === 'temperate' || v === 'balanced') return '중화(中和)';
  return String(raw || '').trim();
}

function _dfJoinElementLabels(list) {
  var arr = _dfToArray(list).map(_dfElementLabelKo).filter(Boolean);
  return arr.length ? arr.join(' · ') : '판정 대기';
}

function _dfNormalizeSukuyoMansionLabel(raw) {
  var text = String(raw || '').trim();
  if (!text) return '';
  text = text.replace(/^숙\s+/, '').trim();
  if (text.indexOf('·') >= 0) text = text.split('·')[0].trim();
  if (text.indexOf('|') >= 0) text = text.split('|')[0].trim();
  return text;
}

function _dfNormalizeSukuyoGroupLabel(raw) {
  var text = String(raw || '').trim();
  if (!text) return '';
  text = text.replace(/^그룹\s+/, '').trim();
  if (/그룹$/.test(text)) return text;
  text = text.replace(/숙$/, '').trim();
  return text ? (text + ' 그룹') : '';
}

function _dfGetSajuBadges(selection) {
  var saved = selection && selection.saju_badges;
  if (saved && typeof saved === 'object' && saved.mode === 'sukuyo') {
    return {
      mode: 'sukuyo',
      mansion: _dfNormalizeSukuyoMansionLabel(saved.mansion) || '미확인',
      group: _dfNormalizeSukuyoGroupLabel(saved.group || ''),
      phase: saved.phase || '미확인',
      guardian: saved.guardian || '미확인'
    };
  }
  if (saved && typeof saved === 'object' && saved.mode === 'jamidusu') {
    return {
      mode: 'jamidusu',
      star: saved.star || '미확인',
      brightness: saved.brightness || '미확인',
      palace: saved.palace || '미확인'
    };
  }
  if (saved && typeof saved === 'object' && saved.mode === 'astrology') {
    return {
      mode: 'astrology',
      sun: saved.sun || '미확인',
      rising: saved.rising || '미확인',
      moon: saved.moon || '미확인'
    };
  }
  if (saved && typeof saved === 'object' && saved.mode !== 'astrology') {
    return {
      mode: 'saju',
      strength: saved.strength || '판정 대기',
      yongshin: saved.yongshin || '판정 대기',
      johu: saved.johu || '판정 대기'
    };
  }

  var matched = selection && selection.matched ? selection.matched : {};
  if ((selection && selection.source === 'sukuyo') || matched.source === 'sukuyo') {
    var sy = matched.sukuyo || {};
    return {
      mode: 'sukuyo',
      mansion: _dfNormalizeSukuyoMansionLabel(sy.mansion_name) || '미확인',
      group: _dfNormalizeSukuyoGroupLabel(sy.group || ''),
      phase: sy.moon_phase || (matched.visual_intensity && matched.visual_intensity.moon_label) || '미확인',
      guardian: sy.guardian_animal || '미확인'
    };
  }
  if ((selection && selection.source === 'jamidusu') || matched.source === 'jamidusu') {
    var ziwei = matched.ziwei || {};
    var stars = Array.isArray(ziwei.primary_stars) ? ziwei.primary_stars.join('·') : '';
    return {
      mode: 'jamidusu',
      star: stars || '미확인',
      brightness: ziwei.brightness || (matched.visual_intensity && matched.visual_intensity.brightness_label) || '미확인',
      palace: ziwei.palace || '미확인'
    };
  }
  if ((selection && selection.source === 'astrology') || matched.source === 'astrology') {
    var chart = matched.chart || {};
    return {
      mode: 'astrology',
      sun: chart.sun_sign || '미확인',
      rising: chart.rising_sign || '미확인',
      moon: chart.moon_sign || '미확인'
    };
  }

  var payload = selection && selection.payload ? selection.payload : {};
  var analysis = payload.analysis || {};
  var saju = payload.saju || {};

  var strength = '';
  if (analysis.power_label) strength = String(analysis.power_label);
  else if (saju.power_label) strength = String(saju.power_label);
  else if (typeof analysis.isStrong === 'boolean') strength = analysis.isStrong ? '신강' : '신약';
  else if (typeof saju.is_strong === 'boolean') strength = saju.is_strong ? '신강' : '신약';
  else strength = '판정 대기';

  var yongshin = _dfJoinElementLabels(saju.yongshin_elements || analysis.yongshin_elements || []);
  var johu = _dfJohuLabel(saju.johu_type || saju.johuType || analysis.johuType || analysis.johu_type || '');

  return {
    mode: 'saju',
    strength: strength,
    yongshin: yongshin,
    johu: johu
  };
}

function _dfGetUnifiedStageContent(selection) {
  var source = _dfNormalizeSource(selection && selection.source);
  var matched = (selection && selection.matched) || {};
  var flowerData = (selection && selection.flowerData) || matched.flower_data || {};
  var badges = _dfGetSajuBadges(selection || {});

  if (source === 'astrology') {
    return {
      badge1: '태양궁 ' + (badges.sun || '미확인'),
      badge2: '상승궁 ' + (badges.rising || '미확인'),
      badge3: '달궁 ' + (badges.moon || '미확인'),
      scenarioTitle: matched.astro_verdict || matched.narrative || '점성술 별자리 개화 시나리오를 계산 중입니다.',
      dataLine: (flowerData.focus_signal || '차트 시그널 대기') + ' · ' + (flowerData.ritual_tip || '성운 리듬을 정렬 중입니다.'),
      symbolism: matched.astro_verdict || matched.narrative || ''
    };
  }

  if (source === 'jamidusu') {
    return {
      badge1: '오늘의 강한 별 ' + (badges.star || '미확인'),
      badge2: '별 밝기 ' + (badges.brightness || '미확인'),
      badge3: '궁위 ' + (badges.palace || '미확인'),
      scenarioTitle: matched.jamidusu_verdict || matched.narrative || '자미두수 주성 개화 시나리오를 계산 중입니다.',
      dataLine: (flowerData.focus_signal || '주성 시그널 대기') + ' · ' + (flowerData.ritual_tip || '제왕의 기운을 조율 중입니다.'),
      symbolism: matched.jamidusu_verdict || matched.narrative || ''
    };
  }

  if (source === 'sukuyo') {
    return {
      badge1: badges.mansion || '미확인',
      badge2: '달 위상 ' + (badges.phase || '미확인'),
      badge3: '수호동물 ' + (badges.guardian || '미확인'),
      scenarioTitle: matched.sukuyo_verdict || matched.narrative || '숙요 달빛 개화 시나리오를 계산 중입니다.',
      dataLine: (flowerData.focus_signal || '숙요 시그널 대기') + ' · ' + (flowerData.ritual_tip || '달의 리듬을 동기화 중입니다.'),
      symbolism: matched.sukuyo_verdict || matched.narrative || ''
    };
  }

  return {
    badge1: flowerData.day_master_badge || '일간 판독 대기',
    badge2: (flowerData.season_label || '계절') + ' 결',
    badge3: (flowerData.environment_label || '환경') + ' 무드',
    scenarioTitle: flowerData.scenario_title || '일간-환경 개화 시나리오를 계산 중입니다.',
    dataLine: (flowerData.ritual_tip || '') + ((flowerData.ritual_tip && flowerData.focus_signal) ? ' · ' : '') + (flowerData.focus_signal || '꽃 데이터 시트를 준비 중입니다.'),
    symbolism: flowerData.scenario_reason || ''
  };
}

function _dfAnimateUnifiedCardSwitch(card, selection) {
  if (!card || !selection) return;
  var syncCardHeight = function() {
    if (typeof syncFeatureCardHeight === 'function') {
      syncFeatureCardHeight(card);
    }
  };
  var stage = card.querySelector('.destiny-flower-stage');
  if (!stage) {
    _dfApplyCardVisual(card, selection);
    syncCardHeight();
    return;
  }
  syncCardHeight();
  if (card.__dfSwitchTimer) clearTimeout(card.__dfSwitchTimer);
  stage.classList.remove('is-switching-in', 'is-switching-out', 'is-switching');
  stage.classList.add('is-switching', 'is-switching-out');
  card.__dfSwitchTimer = setTimeout(function() {
    _dfApplyCardVisual(card, selection);
    syncCardHeight();
    stage.classList.remove('is-switching-out');
    stage.classList.add('is-switching-in');
    setTimeout(function() {
      stage.classList.remove('is-switching-in', 'is-switching');
      syncCardHeight();
    }, 390);
  }, 170);
}

function _dfBurstButtonPetals(button) {
  if (!button || !button.getBoundingClientRect) return;
  var count = 7;
  for (var i = 0; i < count; i++) {
    var petal = document.createElement('span');
    petal.className = 'df-click-petal';
    var dx = (Math.random() * 42 - 21).toFixed(1) + 'px';
    var dy = (-18 - Math.random() * 34).toFixed(1) + 'px';
    var dr = (Math.random() * 80 - 40).toFixed(1) + 'deg';
    petal.style.setProperty('--dx', dx);
    petal.style.setProperty('--dy', dy);
    petal.style.setProperty('--dr', dr);
    petal.style.left = (24 + Math.random() * 52).toFixed(2) + '%';
    petal.style.top = (36 + Math.random() * 34).toFixed(2) + '%';
    button.appendChild(petal);
    setTimeout(function(node) {
      if (node && node.parentNode) node.parentNode.removeChild(node);
    }, 920, petal);
  }
}

function _dfBindBloomingInteractions() {
  if (window.__dfBloomBound) return;
  window.__dfBloomBound = true;

  document.addEventListener('click', function(e) {
    var target = e.target && e.target.closest ? e.target.closest('.df-bloom-btn') : null;
    if (!target) return;
    _dfBurstButtonPetals(target);
  });

  var card = document.querySelector('.feature-card.feature-card--destiny-flower');
  if (!card || card.__dfHoverBound) return;
  card.__dfHoverBound = true;

  card.addEventListener('mousemove', function(e) {
    var rect = card.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var nx = (e.clientX - rect.left) / rect.width;
    var ny = (e.clientY - rect.top) / rect.height;
    var tiltY = ((nx - 0.5) * 5.6).toFixed(2) + 'deg';
    var tiltX = ((0.5 - ny) * 4.6).toFixed(2) + 'deg';
    card.style.setProperty('--df-tilt-x', tiltX);
    card.style.setProperty('--df-tilt-y', tiltY);
  });
  card.addEventListener('mouseleave', function() {
    card.style.setProperty('--df-tilt-x', '0deg');
    card.style.setProperty('--df-tilt-y', '0deg');
  });
}

function _dfRunIntroBloom() {
  var card = document.querySelector('.feature-card.feature-card--destiny-flower');
  if (!card || card.classList.contains('is-intro-bloom')) return;
  card.classList.add('is-intro-bloom');
  setTimeout(function() {
    card.classList.remove('is-intro-bloom');
  }, 1800);
}

function _dfRenderSajuBadges(selection) {
  var wrap = document.getElementById('dfStudioSajuBadges');
  if (!wrap) return;

  var badges = _dfGetSajuBadges(selection);
  var rows = badges.mode === 'sukuyo'
    ? [
      { cls: 'is-strength', label: '숙', value: badges.mansion },
      { cls: 'is-yongshin', label: _indexRuntimeText("indexRuntime.label.001"), value: badges.phase },
      { cls: 'is-johu', label: _indexRuntimeText("indexRuntime.label.002"), value: badges.guardian }
    ]
    : (badges.mode === 'jamidusu'
      ? [
        { cls: 'is-strength', label: _indexRuntimeText("indexRuntime.label.003"), value: badges.star },
        { cls: 'is-yongshin', label: _indexRuntimeText("indexRuntime.label.004"), value: badges.brightness },
        { cls: 'is-johu', label: _indexRuntimeText("indexRuntime.label.005"), value: badges.palace }
      ]
      : (badges.mode === 'astrology'
        ? [
          { cls: 'is-strength', label: _indexRuntimeText("indexRuntime.label.006"), value: badges.sun },
          { cls: 'is-yongshin', label: _indexRuntimeText("indexRuntime.label.007"), value: badges.rising },
          { cls: 'is-johu', label: _indexRuntimeText("indexRuntime.label.008"), value: badges.moon }
        ]
        : [
          { cls: 'is-strength', label: _indexRuntimeText("indexRuntime.label.009"), value: badges.strength },
          { cls: 'is-yongshin', label: _indexRuntimeText("indexRuntime.label.010"), value: badges.yongshin },
          { cls: 'is-johu', label: _indexRuntimeText("indexRuntime.label.011"), value: badges.johu }
        ]));

  wrap.innerHTML = rows.map(function(row) {
    return '<span class="df-saju-badge ' + row.cls + '"><b>' + _dfEscapeHtml(row.label) + '</b><em>' + _dfEscapeHtml(row.value || '판정 대기') + '</em></span>';
  }).join('');
}

function _dfFormatSavedAt(ts) {
  var d = new Date(ts || Date.now());
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  var hh = String(d.getHours()).padStart(2, '0');
  var mm = String(d.getMinutes()).padStart(2, '0');
  return y + '.' + m + '.' + day + ' ' + hh + ':' + mm;
}

function _dfBuildSnapshot(selection) {
  if (!selection || !selection.flower) return null;
  var flower = selection.flower;
  var badges = _dfGetSajuBadges(selection);
  var flowerData = selection.flowerData || (selection.matched && selection.matched.flower_data) || null;
  var matched = selection.matched || {};
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    savedAt: Date.now(),
    savedAtLabel: _dfFormatSavedAt(Date.now()),
    name: flower.name || 'Unknown flower',
    scientific_name: flower.scientific_name || 'Unknown species',
    symbolism: flower.symbolism || '',
    keywords: _dfToArray(selection.keywords),
    primary: selection.primary || '#f472b6',
    secondary: selection.secondary || '#22d3ee',
    particle_type: flower.particle_type || 'petal',
    source: selection.source || 'saju',
    astrology_chart: matched.chart || null,
    ziwei_data: matched.ziwei || null,
    sukuyo_data: matched.sukuyo || null,
    visual_intensity: matched.visual_intensity || null,
    day_master_badge: flowerData && flowerData.day_master_badge ? flowerData.day_master_badge : '',
    flower_data: flowerData,
    saju_badges: badges,
    saju_verdict: _dfGetSajuVerdict(selection),
    narrative: (selection.matched && selection.matched.narrative) || '',
    guidance: flower.vibe_message || '오늘은 결과보다 리듬을 먼저 맞추면 개화 속도가 빨라집니다.'
  };
}

function _dfSelectionFromSnapshot(snapshot) {
  var keywords = _dfToArray(snapshot && snapshot.keywords);
  var savedBadges = (snapshot && snapshot.saju_badges && typeof snapshot.saju_badges === 'object') ? snapshot.saju_badges : null;
  return {
    source: (snapshot && snapshot.source) || 'saju',
    matched: {
      narrative: (snapshot && snapshot.narrative) || '',
      saju_verdict: (snapshot && snapshot.saju_verdict) || '',
      flower_data: (snapshot && snapshot.flower_data) || null,
      chart: (snapshot && snapshot.astrology_chart) || null,
      ziwei: (snapshot && snapshot.ziwei_data) || null,
      sukuyo: (snapshot && snapshot.sukuyo_data) || null,
      visual_intensity: (snapshot && snapshot.visual_intensity) || null
    },
    flower: {
      name: (snapshot && snapshot.name) || 'Unknown flower',
      scientific_name: (snapshot && snapshot.scientific_name) || 'Unknown species',
      symbolism: (snapshot && snapshot.symbolism) || '',
      keywords: keywords,
      particle_type: (snapshot && snapshot.particle_type) || 'petal',
      vibe_message: (snapshot && snapshot.guidance) || ''
    },
    primary: (snapshot && snapshot.primary) || '#f472b6',
    secondary: (snapshot && snapshot.secondary) || '#22d3ee',
    keywords: keywords,
    flowerData: (snapshot && snapshot.flower_data) || null,
    saju_badges: savedBadges
  };
}

function _dfLoadHistory() {
  try {
    var raw = localStorage.getItem(_DF_STUDIO_HISTORY_KEY);
    var parsed = raw ? JSON.parse(raw) : [];
    _dfStudioState.history = Array.isArray(parsed) ? parsed.slice(0, _DF_STUDIO_HISTORY_LIMIT) : [];
  } catch (e) {
    _dfStudioState.history = [];
  }
  return _dfStudioState.history;
}

function _dfPersistHistory() {
  try {
    localStorage.setItem(_DF_STUDIO_HISTORY_KEY, JSON.stringify(_dfStudioState.history.slice(0, _DF_STUDIO_HISTORY_LIMIT)));
  } catch (e) {
    console.warn('[DestinyFlower] 히스토리 저장 실패:', e);
  }
}

function _dfHasReadySourceData(source, payload) {
  var normalized = _dfNormalizeSource(source);
  var data = payload && typeof payload === 'object' ? payload : {};
  if (normalized === 'saju') {
    var hasEngineMatcher = !!(
      (window.DestinyFlowerEngine && typeof window.DestinyFlowerEngine.matchDestinyFlower === 'function')
      || typeof window.matchDestinyFlower === 'function'
    );
    if (!hasEngineMatcher) return false;

    var saju = data.saju || {};
    var sajuDomain = (data.domains && data.domains.saju) || {};
    var analysis = data.analysis || {};
    var dayMaster = String(
      saju.dayMaster
      || saju.day_master
      || saju.ilgan
      || sajuDomain.day_master
      || sajuDomain.dayMaster
      || analysis.day_master
      || analysis.dayMaster
      || ''
    ).trim();

    var hasPillar = !!(
      String(saju.yearPillar || sajuDomain.year_pillar || '').trim()
      || String(saju.monthPillar || sajuDomain.month_pillar || '').trim()
      || String(saju.dayPillar || sajuDomain.day_pillar || '').trim()
      || String(saju.hourPillar || sajuDomain.hour_pillar || '').trim()
    );

    var weights = analysis.elementalWeights || analysis.elements || saju.elementalWeights || saju.elements || {};
    var values = ['wood', 'fire', 'earth', 'metal', 'water'].map(function(key) {
      return Number(weights && weights[key]);
    }).filter(function(v) {
      return Number.isFinite(v);
    });
    var hasNonDefaultWeights = false;
    if (values.length === 5) {
      var allSame = values.every(function(v) { return Math.abs(v - values[0]) < 0.05; });
      var looksDefault = allSame && Math.abs(values[0] - 20) < 0.2;
      hasNonDefaultWeights = !looksDefault;
    }

    return !!(dayMaster || hasPillar || hasNonDefaultWeights);
  }

  if (normalized === 'astrology') {
    var astrology = data.astrology || {};
    var astroDomain = (data.domains && data.domains.astrology) || {};
    var sun = _dfNormalizeAstroSign(astrology.sunSign || astrology.sun_sign || astroDomain.sun_sign || '');
    var moon = _dfNormalizeAstroSign(astrology.moonSign || astrology.moon_sign || astroDomain.moon_sign || '');
    var rising = _dfNormalizeAstroSign(astrology.risingSign || astrology.rising_sign || astroDomain.rising_sign || '');
    return !!(sun || moon || rising);
  }

  if (normalized === 'jamidusu') {
    var ziwei = data.ziwei || {};
    var ziweiDomain = (data.domains && data.domains.ziwei) || {};
    var mainStar = String(ziwei.mainStar || ziwei.main_star || ziweiDomain.main_star || '').trim();
    var palace = String(ziwei.palace || ziwei.mainPalace || ziweiDomain.palace || '').trim();
    var stars = Array.isArray(ziwei.stars) ? ziwei.stars : (Array.isArray(ziweiDomain.stars) ? ziweiDomain.stars : []);
    return !!(mainStar || palace || stars.length);
  }

  if (normalized === 'sukuyo') {
    var sukuyo = data.sukuyo || {};
    var sukuyoDomain = (data.domains && data.domains.sukuyo) || {};
    var mansion = String(sukuyo.mansion || sukuyo.name || sukuyoDomain.mansion || '').trim();
    var idx = Number(sukuyo.mansionIndex || sukuyo.index || sukuyoDomain.mansion_index);
    return !!(mansion || Number.isFinite(idx));
  }

  return true;
}

function _dfHasBirthInfo(payload) {
  var birthCtx = _dfResolveBirthContext(payload || {});
  return _dfHasBirthCore(birthCtx);
}

function _dfGetNoDomainDataMessage(source) {
  var normalized = _dfNormalizeSource(source);
  var label = _dfGetSourceLabel(normalized);
  return '아직 연동된 ' + label + ' 데이터가 없어요. 아래 버튼을 누르면 지금 당신만의 운명의 꽃이 피어납니다.';
}

function _dfGetNotLinkedMessage(source) {
  var normalized = _dfNormalizeSource(source);
  var label = _dfGetSourceLabel(normalized);
  return label + ' 꽃은 연동하기 버튼을 누르는 순간 피어납니다. 아래 버튼을 눌러 지금 당신에게 온 한 송이를 만나보세요.';
}

function _dfCanShowLoadButton(source, missingDomain) {
  var normalized = _dfNormalizeSource(source);
  var linked = _dfIsSourceLinked(normalized);
  return !linked || !!missingDomain;
}

function _dfGetDataMissingUiState(source) {
  var normalized = _dfNormalizeSource(source);
  var payload = _dfGetProfilePayload({ skipLiveBridge: true }) || {};

  if (!_dfHasBirthInfo(payload)) {
    return {
      message: _dfGetNoBirthMessage(normalized),
      showLoadButton: false,
      source: normalized
    };
  }

  if (!_dfIsSourceLinked(normalized)) {
    return {
      message: _dfGetNotLinkedMessage(normalized),
      showLoadButton: true,
      source: normalized
    };
  }

  var missingDomain = !_dfHasReadySourceData(normalized, payload);
  return {
    message: missingDomain ? _dfGetNoDomainDataMessage(normalized) : _dfGetNoBirthMessage(normalized),
    showLoadButton: _dfCanShowLoadButton(normalized, missingDomain),
    source: normalized
  };
}

function _dfEnsureStudioEmptyState(main) {
  if (!main) return null;
  var emptyEl = main.querySelector('#dfStudioEmptyState');
  if (emptyEl) {
    var existingBtn = emptyEl.querySelector('#dfStudioEmptyLoadButton');
    if (existingBtn) _dfBindEmptyLoadButton(existingBtn);
    return emptyEl;
  }

  emptyEl = document.createElement('section');
  emptyEl.id = 'dfStudioEmptyState';
  emptyEl.className = 'df-studio-empty';
  emptyEl.hidden = true;
  emptyEl.innerHTML = ''
    + '<p id="dfStudioEmptyMessage" class="df-studio-empty-message"></p>'
    + '<button id="dfStudioEmptyLoadButton" type="button" class="df-studio-link-btn df-bloom-btn" aria-label="' + _indexRuntimeText("indexRuntime.aria-label.002") + '">운명의 꽃 연동하기</button>';
  main.appendChild(emptyEl);

  var loadBtn = emptyEl.querySelector('#dfStudioEmptyLoadButton');
  if (loadBtn) _dfBindEmptyLoadButton(loadBtn);

  return emptyEl;
}

function _dfBindEmptyLoadButton(loadBtn) {
  if (!loadBtn || loadBtn.__dfBound) return;
  loadBtn.__dfBound = true;
  loadBtn.addEventListener('click', function() {
    var source = loadBtn.getAttribute('data-df-source') || _dfStudioState.activeSource || 'saju';
    _dfSetEmptyLoadButtonState(true, source, true);
    _dfSetActiveSource(source);
    _dfFetchSourceOnDemand(source, { force: true, userInitiated: true });
  });
}

function _dfSetEmptyLoadButtonState(isLoading, source, canLoad) {
  var btn = document.getElementById('dfStudioEmptyLoadButton');
  if (!btn) return;
  var normalized = _dfNormalizeSource(source || _dfStudioState.activeSource || 'saju');
  var enable = !!canLoad;
  btn.hidden = !enable || !!isLoading;
  if (!enable) return;
  btn.disabled = !!isLoading;
  btn.classList.toggle('is-loading', !!isLoading);
  btn.setAttribute('data-df-source', normalized);
  btn.textContent = isLoading ? '연동 중...' : '운명의 꽃 연동하기';
}

function _dfShowStudioEmptyState(source, message, showLoadButton) {
  var normalized = _dfNormalizeSource(source || _dfStudioState.activeSource || 'saju');
  var main = document.querySelector('.df-studio-main');
  var panels = document.querySelector('.df-studio-panels');
  var historySection = document.querySelector('.df-studio-history');
  var narrativeEl = document.getElementById('dfStudioNarrative');
  var badgesEl = document.getElementById('dfStudioSajuBadges');
  var sourceDescEl = document.getElementById('dfStudioSourceDesc');
  var nameEl = document.getElementById('dfStudioName');
  var latinEl = document.getElementById('dfStudioLatin');
  var dayMasterEl = document.getElementById('dfStudioDayMasterBadge');
  var symbolismEl = document.getElementById('dfStudioSymbolism');
  var keywordsEl = document.getElementById('dfStudioKeywords');

  if (!main) return;
  var emptyEl = _dfEnsureStudioEmptyState(main);
  var messageEl = emptyEl ? emptyEl.querySelector('#dfStudioEmptyMessage') : null;

  if (sourceDescEl) {
    var meta = _DF_SOURCE_META[normalized] || _DF_SOURCE_META.saju;
    sourceDescEl.textContent = meta.description || '';
  }
  if (narrativeEl) narrativeEl.textContent = message || _dfGetNoDomainDataMessage(normalized);
  if (nameEl) nameEl.textContent = _dfGetSourceLabel(normalized) + ' 데이터 연동 대기';
  if (latinEl) latinEl.textContent = 'Data not linked';
  if (dayMasterEl) dayMasterEl.textContent = _dfGetSourceLabel(normalized) + ' 판독 대기';
  if (symbolismEl) symbolismEl.textContent = message || _dfGetNoDomainDataMessage(normalized);
  if (keywordsEl) keywordsEl.textContent = _dfGetSourceLabel(normalized) + ' keywords · loading';
  if (badgesEl) badgesEl.style.display = 'none';

  if (messageEl) messageEl.textContent = message || _dfGetNoDomainDataMessage(normalized);
  if (emptyEl) emptyEl.hidden = false;
  main.classList.add('is-empty');
  main.style.display = '';
  if (panels) panels.style.display = 'none';
  if (historySection) historySection.style.display = 'none';

  _dfSetEmptyLoadButtonState(_dfStudioState.loadingSource === normalized, normalized, !!showLoadButton);
}

function _dfHideStudioEmptyState() {
  var main = document.querySelector('.df-studio-main');
  var panels = document.querySelector('.df-studio-panels');
  var historySection = document.querySelector('.df-studio-history');
  var badgesEl = document.getElementById('dfStudioSajuBadges');
  if (!main) return;
  var emptyEl = main.querySelector('#dfStudioEmptyState');
  if (emptyEl) emptyEl.hidden = true;
  main.classList.remove('is-empty');
  if (badgesEl) badgesEl.style.display = '';
  if (panels) panels.style.display = '';
  if (historySection) historySection.style.display = '';
}

function _dfRefreshStudioForSource(source, forceRefresh) {
  var normalized = _dfNormalizeSource(source || _dfStudioState.activeSource || 'saju');
  var selection = _dfGetUnifiedSelection(normalized, !!forceRefresh);
  _dfStudioState.selection = selection;

  if (!selection) {
    var emptyState = _dfGetDataMissingUiState(normalized);
    _dfShowStudioEmptyState(normalized, emptyState.message, emptyState.showLoadButton);
    _dfSetStudioStatus(emptyState.message, {
      showLoadButton: emptyState.showLoadButton,
      source: normalized
    });
    return null;
  }

  _dfApplyStudioSelection(selection);
  _dfHideStudioEmptyState();
  var main = document.querySelector('.df-studio-main');
  if (main) main.style.display = '';
  _dfSetStudioStatus(_dfGetSajuVerdict(selection) + ' 결과를 저장하거나 카카오톡으로 공유할 수 있습니다.');
  return selection;
}

function _dfReloadSourceData(source, options) {
  var opts = options && typeof options === 'object' ? options : {};
  var normalized = _dfNormalizeSource(source || _dfStudioState.activeSource || 'saju');
  if (!opts.silentStatus) {
    _dfSetStudioStatus('데이터를 다시 불러오는 중입니다. 잠시만 기다려주세요.');
  }

  var loader = Promise.resolve(true);
  if (!(window.DestinyFlowerEngine && typeof window.DestinyFlowerEngine.matchDestinyFlower === 'function')) {
    loader = loader.then(function() {
      return import('/js/core/bootstrapDestinyFlower.js').then(function(mod) {
        if (mod && typeof mod.bootstrapDestinyFlower === 'function') {
          mod.bootstrapDestinyFlower(window);
        }
        return true;
      }).catch(function(err) {
        console.warn('[DestinyFlower] 엔진 부트스트랩 실패:', err);
        return false;
      });
    });
  }

  if (typeof __cdEnsureLunarLibReady === 'function') {
    loader = loader.then(function() {
      return __cdEnsureLunarLibReady().catch(function(err) {
        console.warn('[DestinyFlower] 음력 라이브러리 로드 실패:', err);
        return false;
      });
    });
  }

  if (normalized === 'astrology' && typeof __cdEnsureSwissEphLoaded === 'function') {
    loader = loader.then(function() {
      __cdEnsureSwissEphLoaded().catch(function(err) {
        console.warn('[DestinyFlower] SwissEph 로드 실패:', err);
        return false;
      });
      return true;
    });
  }

  if (typeof __cdEnsureSajuCoreLoaded === 'function') {
    loader = loader.then(function() {
      return __cdEnsureSajuCoreLoaded().catch(function(err) {
        console.warn('[DestinyFlower] 데이터 로드 준비 실패:', err);
        return false;
      });
    });
  }

  return loader.then(function() {
    if (normalized === 'saju') {
      try {
        if (window.DestinyProfileManager && window.DestinyProfileManager.storage && typeof window.DestinyProfileManager.storage.current === 'function') {
          var currentProfile = window.DestinyProfileManager.storage.current() || {};
          if (currentProfile && currentProfile.birth && typeof window.computeProfileForModal === 'function') {
            window.computeProfileForModal(currentProfile);
          }
        }
      } catch (e2) {
        console.warn('[DestinyFlower][Saju] pre-resolve recompute failed:', e2);
      }
    }
    _dfStudioState.flowerData = null;
    if (opts.skipUiRefresh) {
      return _dfGetUnifiedSelection(normalized, true);
    }
    return _dfRefreshStudioForSource(normalized, true);
  });
}

function _dfFetchSourceOnDemand(source, options) {
  var opts = options && typeof options === 'object' ? options : {};
  var normalized = _dfNormalizeSource(source || _dfStudioState.activeSource || 'saju');
  if (_dfStudioState.userRequestedLoad && (opts.force || opts.userInitiated)) {
    _dfStudioState.userRequestedLoad[normalized] = true;
  }
  var state = _dfGetDataMissingUiState(normalized);
  if (!state.showLoadButton && !opts.force) {
    _dfSetStudioStatus(state.message, {
      showLoadButton: state.showLoadButton,
      source: normalized
    });
    return Promise.resolve(null);
  }

  if (_dfStudioState.loadingTasks && _dfStudioState.loadingTasks[normalized]) {
    return _dfStudioState.loadingTasks[normalized];
  }

  _dfStudioState.loadingSource = normalized;
  _dfSetEmptyLoadButtonState(true, normalized, true);

  if (!opts.silentStatus) {
    _dfSetStudioStatus(_dfGetSourceLabel(normalized) + ' 데이터를 연동 중입니다. 잠시만 기다려주세요.', {
      showLoadButton: true,
      source: normalized,
      isLoading: true
    });
  }

  var task = _dfReloadSourceData(normalized, {
    silentStatus: true,
    skipUiRefresh: true
  }).then(function(selection) {
    if (selection) {
      _dfSetActiveSource(normalized);
      if (_dfStudioState.linkedSources) _dfStudioState.linkedSources[normalized] = true;
      // 클릭으로 얻은 1차 결과를 그대로 반영해야 fallback 플래그 소거 후
      // 재계산(null)로 덮어써지는 회귀를 막을 수 있다.
      _dfStudioState.selection = selection;
      _dfApplyStudioSelection(selection);
      _dfHideStudioEmptyState();
      var main = document.querySelector('.df-studio-main');
      if (main) main.style.display = '';
      _dfSetStudioStatus(_dfGetSourceLabel(normalized) + ' 데이터를 불러왔습니다.');
      return selection;
    }

    var retryState = _dfGetDataMissingUiState(normalized);
    if (normalized === 'saju') {
      console.error('[DestinyFlower][Saju] linkage failed: on-demand reload returned no selection', {
        stateMessage: retryState && retryState.message,
        showLoadButton: !!(retryState && retryState.showLoadButton)
      });
    }
    _dfSetStudioStatus(retryState.message, {
      showLoadButton: retryState.showLoadButton,
      source: retryState.source
    });
    return null;
  }).finally(function() {
    if (_dfStudioState.loadingTasks) delete _dfStudioState.loadingTasks[normalized];
    if (_dfStudioState.loadingSource === normalized) _dfStudioState.loadingSource = '';
    if (_dfStudioState.userRequestedLoad) _dfStudioState.userRequestedLoad[normalized] = false;
    var latestState = _dfGetDataMissingUiState(normalized);
    _dfSetEmptyLoadButtonState(false, normalized, latestState.showLoadButton);
  });

  _dfStudioState.loadingTasks[normalized] = task;
  return task;
}

function _dfSetStudioStatus(message, options) {
  var el = document.getElementById('dfStudioStatus');
  var text = message || '';
  var flowGuide = _dfBuildSourceFlowGuide();
  if (flowGuide) {
    text = text ? (text + ' · ' + flowGuide) : flowGuide;
  }
  if (el) el.textContent = text;
  if (options && options.showLoadButton) {
    var source = _dfNormalizeSource(options.source || _dfStudioState.activeSource || 'saju');
    var state = _dfGetDataMissingUiState(source);
    _dfSetEmptyLoadButtonState(
      !!options.isLoading || _dfStudioState.loadingSource === source,
      source,
      !!state.showLoadButton
    );
  }
}

function _dfEscapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _dfBuildShareText(snapshot) {
  if (!snapshot) return '운명의 꽃 결과를 준비 중입니다.';
  var sourceLabel = snapshot.source === 'sukuyo'
    ? '숙요점'
    : (snapshot.source === 'jamidusu' ? '자미두수' : (snapshot.source === 'astrology' ? '점성술' : '사주'));
  var sajuVerdict = snapshot.saju_verdict || (sourceLabel + '로 볼 때 당신의 꽃은 ' + snapshot.name + ' 입니다.');
  var lines = [
    '🌸 운명의 꽃 아틀리에 결과',
    '',
    sajuVerdict,
    snapshot.name + ' (' + snapshot.scientific_name + ')',
    snapshot.day_master_badge ? ((snapshot.source === 'astrology' ? '차트 배지: ' : (snapshot.source === 'jamidusu' ? '주성 배지: ' : (snapshot.source === 'sukuyo' ? '숙요 배지: ' : '일간 배지: '))) + snapshot.day_master_badge) : '',
    snapshot.symbolism,
    '키워드: ' + _dfToArray(snapshot.keywords).join(' • '),
    '팔레트: ' + snapshot.primary + ' / ' + snapshot.secondary,
    '입자 무드: ' + snapshot.particle_type
  ];
  if (snapshot.narrative) lines.push('', snapshot.narrative);
  lines.push('', window.location.href);
  return lines.join('\n');
}

function _dfOneLineText(value, fallback) {
  var line = String(value || '').replace(/\s+/g, ' ').trim();
  return line || (fallback || '');
}

function _dfGetSourceLabel(source) {
  return source === 'sukuyo'
    ? '숙요점'
    : (source === 'jamidusu' ? '자미두수' : (source === 'astrology' ? '점성술' : '사주'));
}

function _dfGetPromptArtDirection(source) {
  if (source === 'astrology') {
    return {
      mood: '별빛 성운과 네온 글로우가 감도는 몽환적 플로럴',
      lighting: 'moonlit rim light, cosmic dust volumetric light',
      background: 'deep navy nebula sky with subtle zodiac traces',
      composition: 'hero blossom centered, spiral petal motion, celestial particles'
    };
  }
  if (source === 'jamidusu') {
    return {
      mood: '제왕의 품격과 궁중의 정제미가 공존하는 플로럴',
      lighting: 'royal soft spotlight, silky ambient glow',
      background: 'imperial jade and plum gradient with star map motif',
      composition: 'symmetrical ceremonial bloom, layered velvet petals'
    };
  }
  if (source === 'sukuyo') {
    return {
      mood: '달빛 명상과 고요한 수면 같은 청명한 플로럴',
      lighting: 'silver moon halo, soft mist backlight',
      background: 'midnight blue sky with lunar mansion orbit lines',
      composition: 'single moon-bloom portrait, floating pollen and orbit arcs'
    };
  }
  return {
    mood: '오행의 결을 따라 피어나는 서정적 동양 플로럴',
    lighting: 'soft dawn light, translucent petal glow',
    background: 'seasonal gradient inspired by wood fire earth metal water',
    composition: 'centered blossom portrait, elegant negative space, subtle petal drift'
  };
}

function _dfAstroElementFromSign(sign) {
  var v = String(sign || '').trim().toLowerCase();
  if (!v) return '';
  if (/aries|leo|sagittarius|양자리|사자자리|사수자리/.test(v)) return 'fire';
  if (/taurus|virgo|capricorn|황소자리|처녀자리|염소자리/.test(v)) return 'earth';
  if (/gemini|libra|aquarius|쌍둥이자리|천칭자리|물병자리/.test(v)) return 'air';
  if (/cancer|scorpio|pisces|게자리|전갈자리|물고기자리/.test(v)) return 'water';
  return '';
}

function _dfExtractFiveElements(text) {
  var src = String(text || '');
  var list = [];
  ['목', '화', '토', '금', '수'].forEach(function(el) {
    if (src.indexOf(el) >= 0) list.push(el);
  });
  return list;
}

function _dfBuildYongshinCareLine(yongshinText) {
  var careByElement = {
    '목': '아침 햇살이 드는 동쪽 창가에서 8분 스트레칭으로 생장점을 깨우기',
    '화': '남향 빛을 5분 쬐며 오늘의 목표를 소리 내어 선언하기',
    '토': '작업 공간 한 구역을 정리해 중심 축을 단단히 세우기',
    '금': '우선순위 3가지를 적고 불필요한 약속을 과감히 가지치기',
    '수': '저녁 10분 산책과 수분 보충으로 감정의 순환로 열기'
  };
  var elements = _dfExtractFiveElements(yongshinText);
  if (!elements.length) {
    return '빛(오전)과 수분(저녁) 루틴을 고정해 기초 생육 리듬을 먼저 안정화하세요.';
  }
  return elements.slice(0, 2).map(function(el) {
    return careByElement[el] || '';
  }).filter(Boolean).join(' + ');
}

function _dfBuildSynergyPaletteText(source, primaryHex, secondaryHex) {
  var primary = _dfSafeColor(primaryHex, '#f472b6');
  var secondary = _dfSafeColor(secondaryHex, '#22d3ee');
  var accent = _dfMixHex(primary, secondary, 0.5);
  var materials = source === 'astrology'
    ? '유리 화기, 실버 프레임, 미세 조명'
    : (source === 'jamidusu'
      ? '새틴 패브릭, 브론즈 오브제, 대칭형 세라믹'
      : (source === 'sukuyo'
        ? '서리 유리, 달빛 톤 린넨, 물결 무늬 트레이'
        : '무광 세라믹, 내추럴 우드, 잔잔한 패턴 패브릭'));
  return '추천 컬러: Primary ' + primary + ', Secondary ' + secondary + ', Accent ' + accent + ' / 추천 소재: ' + materials + '.';
}

function _dfBuildAtelierExtension(selection, sourceLabel, badges, flowerData, sajuVerdict) {
  var source = _dfNormalizeSource(selection && selection.source);
  var flower = (selection && selection.flower) || {};
  var primary = _dfSafeColor(selection && selection.primary, '#f472b6');
  var secondary = _dfSafeColor(selection && selection.secondary, '#22d3ee');
  var scenarioTitle = flowerData.scenario_title || (sourceLabel + ' 개화 시나리오');
  var growthCycle = flowerData.growth_cycle || '개화 사이클 계산 대기';
  var ritualTip = flowerData.ritual_tip || '오늘의 실천 루틴을 계산 중입니다.';
  var relation = flowerData.relationship_theme || '';
  var career = flowerData.career_theme || '';
  var matrix = [];
  var sectionTitle = '';
  var observationLog = '';
  var secretRecipe = '';
  var flowerLanguage = '';
  var gardenerWord = '';
  var particleMood = '';

  if (source === 'astrology') {
    var sun = badges.sun || '미확인';
    var rising = badges.rising || sun;
    var moon = badges.moon || sun;
    var risingEl = _dfAstroElementFromSign(rising) || _dfAstroElementFromSign(sun) || 'air';
    var moonEl = _dfAstroElementFromSign(moon) || risingEl;
    var lighting = risingEl === 'fire'
      ? '한여름 정오처럼 각도가 높은 강렬한 태양광'
      : (risingEl === 'earth'
        ? '늦은 오후의 황금빛이 오래 머무는 안정형 광량'
        : (risingEl === 'water'
          ? '새벽녘의 차가운 푸른 빛이 천천히 번지는 조도'
          : '바람결처럼 기울어진 사선광이 공간을 가볍게 여는 조도'));
    var humidity = moonEl === 'water'
      ? '감성 습도가 높은 실버 미스트 상태'
      : (moonEl === 'fire'
        ? '열기를 품은 드라이 에어, 감정 반응이 빠른 상태'
        : (moonEl === 'earth'
          ? '안정적인 토분 습도, 감정이 서서히 농익는 상태'
          : '가볍고 유동적인 브리즈 습도, 아이디어가 빠르게 환기되는 상태'));
    var cosmicSeason = risingEl === 'fire'
      ? '개화 가속기: 실행과 발표가 꽃봉오리를 밀어 올리는 구간'
      : (risingEl === 'water'
        ? '내면 양분기: 휴식과 직관이 뿌리층을 채우는 구간'
        : '균형 조율기: 구조와 감성이 교차하며 다음 꽃눈을 준비하는 구간');

    sectionTitle = '천체의 조도와 에너지';
    matrix = [
      '☀️ 천체의 조도: ' + lighting,
      '💧 대기의 습도: ' + humidity,
      '🪐 우주의 계절: ' + cosmicSeason
    ];
    observationLog = '정원사의 관찰 일지: 태양궁 ' + sun + '의 방향성과 상승궁 ' + rising + '의 빛이 꽃대의 각도를 잡아줍니다. 달궁 ' + moon + '의 습도 조절이 감정 잎맥을 부드럽게 열며, 이번 주는 기회가 먼저 보이는 개화 전조 구간입니다.';
    secretRecipe = '비밀 레시피: 밤 9시 이후 창가 조명을 한 단계 낮추고, 내일 실행할 한 가지를 노트 첫 줄에 적어 두세요. 아침 첫 12분은 그 한 가지에만 집중하면 별빛 리듬이 가장 빠르게 맞춰집니다.';
    flowerLanguage = '운명의 꽃말: 별의 각도를 믿고 한 걸음을 먼저 내딛는 용기.';
    gardenerWord = '이 꽃을 위한 가드너의 한 마디: 오늘의 직감은 과장이 아니라 예보입니다. 작은 실행이 성운을 현실의 꽃밭으로 바꿉니다.';
    particleMood = sourceLabel + '의 광량을 입자로 번역하면 "' + (flower.particle_type || 'stardust') + '" 결이 가장 안정적으로 빛납니다.';
  } else if (source === 'jamidusu') {
    var star = badges.star || '미확인';
    var brightness = badges.brightness || '미확인';
    var palace = badges.palace || '미확인';
    var structure = /자미|zi ?wei/i.test(star)
      ? '자미성 계열의 황실 기품이 깃든 단단한 꽃대'
      : (/칠살|파군|qisha|pogun/i.test(star)
        ? '돌파형 장군 기질이 만든 굵고 강직한 줄기'
        : (/태음|tai ?yin|천기|tian ?ji/i.test(star)
          ? '유연하지만 쉽게 꺾이지 않는 세밀한 복층 꽃잎'
          : '균형형 주성이 만든 정제된 대칭 구조의 꽃골격'));
    var social = palace + ' 주변으로 나비와 벌이 순환하듯, 가까운 인연이 역할 분담을 나눠 성장을 돕는 흐름입니다.';
    var thorns = /함|陷|한|閑/.test(brightness)
      ? '방어력이 높은 짧은 가시가 촘촘해 경계를 세워주는 시기'
      : '빛을 반사하는 결 무늬가 가시 역할을 대신해 품격 있게 자신을 보호하는 시기';

    sectionTitle = '꽃의 품격과 형태';
    matrix = [
      '🏛️ 꽃의 골격: ' + structure,
      '🦋 나비와 벌: ' + social,
      '🌵 수호의 가시: ' + thorns
    ];
    observationLog = '정원사의 관찰 일지: 오늘의 강한 별 ' + star + '이 줄기 중심을 곧게 세우고, 별 밝기 ' + brightness + '가 꽃잎의 윤기를 조정합니다. 지금은 화려함보다 구조적 완성도가 성과를 키우는 시기입니다.';
    secretRecipe = '비밀 레시피: 책상 왼쪽에 메탈 계열 오브제를 하나 두고, 오늘의 기준 1개와 양보선 1개를 동시에 기록하세요. 경계가 선명해질수록 꽃은 더 우아하게 핍니다.';
    flowerLanguage = '운명의 꽃말: 품격은 단단한 구조에서 피어나는 가장 조용한 광채.';
    gardenerWord = '이 꽃을 위한 가드너의 한 마디: 화려함을 서두르지 마세요. 기준을 지킨 하루가 결국 가장 오래가는 꽃대를 만듭니다.';
    particleMood = sourceLabel + '의 위계를 입자로 번역하면 "' + (flower.particle_type || 'imperial') + '" 무드가 질서를 가장 아름답게 드러냅니다.';
  } else if (source === 'sukuyo') {
    var mansion = badges.mansion || '미확인';
    var phase = badges.phase || '미확인';
    var guardian = badges.guardian || '수호동물 미확인';
    var scent = /친|友|friend/i.test(mansion)
      ? '달빛 아래 번지는 은은한 화이트 머스크 계열'
      : (/업|危|danger/i.test(mansion)
        ? '짙고 깊은 침향 계열, 집중력을 끌어올리는 향'
        : '청명한 허브 플로럴 계열, 관계의 온도를 부드럽게 맞추는 향');
    var dew = /보름|full/i.test(phase)
      ? '밤이슬이 가장 충만해 영감과 감정 표현이 동시에 풍성한 상태'
      : (/삭|new/i.test(phase)
        ? '이슬이 얇게 맺히는 신월 구간으로, 관찰과 준비가 우선인 상태'
        : '적당한 이슬량으로 감정의 균형과 실행력이 함께 자라는 상태');
    var companion = /용|dragon/i.test(guardian)
      ? '등나무와 블루세이지 조합, 큰 확장 흐름을 지지'
      : (/개|dog/i.test(guardian)
        ? '로즈메리와 캐모마일 조합, 관계 안정과 회복 탄력 강화'
        : (/호랑이|tiger/i.test(guardian)
          ? '유칼립투스와 루드베키아 조합, 결단력과 보호 본능 강화'
          : '라벤더와 아이비 조합, 정서 안정과 장기 성장 동시 지원'));

    sectionTitle = '인연의 향기와 이슬';
    matrix = [
      '🌙 운명의 향기: ' + scent,
      '💦 밤이슬의 양: ' + dew,
      '🌿 동반 식물: ' + companion
    ];
    observationLog = '정원사의 관찰 일지: ' + mansion + '의 관계성은 향기로 먼저 드러나고, 달 위상 ' + phase + '은 이슬의 밀도로 감정 리듬을 조절합니다. 지금은 인연의 속도를 재촉하기보다 결을 맞추는 세심함이 꽃을 오래 지킵니다.';
    secretRecipe = '비밀 레시피: 자기 전 물 한 잔을 천천히 마신 뒤, 오늘 고마웠던 이름 1개를 조용히 적어두세요. 달의 수분 리듬이 안정되며 관계 운이 부드럽게 열립니다.';
    flowerLanguage = '운명의 꽃말: 조용한 공감이 가장 멀리 퍼지는 향기가 된다.';
    gardenerWord = '이 꽃을 위한 가드너의 한 마디: 서두르지 않아도 괜찮습니다. 밤이슬이 모이듯, 당신의 인연도 정확한 타이밍에 선명해집니다.';
    particleMood = sourceLabel + '의 달빛 리듬을 입자로 번역하면 "' + (flower.particle_type || 'lunar') + '" 무드가 가장 포근하게 감싸줍니다.';
  } else {
    var strength = badges.strength || '판정 대기';
    var johu = badges.johu || '판정 대기';
    var yongshin = badges.yongshin || '';
    var soil = johu.indexOf('한습') >= 0
      ? '수분을 머금은 습지형 옥토'
      : (johu.indexOf('온조') >= 0
        ? '배수성이 높은 따뜻한 자갈 혼합토'
        : '입자가 고르고 미네랄이 안정된 비옥한 옥토');
    var root = strength.indexOf('신강') >= 0
      ? '뿌리가 깊게 박혀 외부 변화에도 중심을 지키는 단계'
      : (strength.indexOf('신약') >= 0
        ? '섬세한 잔뿌리가 먼저 퍼지며 지지대를 필요로 하는 단계'
        : '중간 깊이 뿌리가 고르게 확장되는 균형 단계');
    var nutrient = _dfBuildYongshinCareLine(yongshin);

    sectionTitle = '성장의 토양과 뿌리';
    matrix = [
      '🪨 토양의 성분: ' + soil,
      '🌱 뿌리의 깊이: ' + root,
      '🧪 가드너의 영양제: ' + nutrient
    ];
    observationLog = '정원사의 관찰 일지: 오늘 정원은 ' + soil + '의 결을 띠며, ' + root + ' 흐름으로 생장 에너지가 움직입니다. 겉으로 조용해 보여도 뿌리층에서는 다음 개화를 위한 힘이 단단히 저장되고 있습니다.';
    secretRecipe = '비밀 레시피: 북쪽 또는 동쪽 창가에 푸른 잎 식물을 두고, 아침 10분은 몸을 풀고 저녁 10분은 호흡을 고르세요. 하루 두 번의 리듬 고정이 용신 기운을 가장 빠르게 끌어올립니다.';
    flowerLanguage = '운명의 꽃말: 단단한 뿌리는 늦어 보여도 결국 가장 높게 핀다.';
    gardenerWord = '이 꽃을 위한 가드너의 한 마디: 조급함보다 축적을 믿으세요. 오늘의 작은 관리가 다음 계절의 큰 결실을 만듭니다.';
    particleMood = sourceLabel + ' 기운의 미세한 움직임을 입자로 번역하면 "' + (flower.particle_type || 'petal') + '" 무드가 가장 조화롭습니다.';
  }

  return {
    dataSummary: '[' + sectionTitle + '] ' + scenarioTitle + ' · ' + growthCycle,
    ritualLine: ritualTip,
    themesLine: [relation, career].filter(Boolean).join(' · ') || '관계/일 테마를 분석 중입니다.',
    sourceMatrix: matrix,
    observationLog: observationLog,
    secretRecipe: secretRecipe,
    flowerLanguage: flowerLanguage,
    synergyPalette: _dfBuildSynergyPaletteText(source, primary, secondary),
    gardenerWord: gardenerWord,
    particleMood: particleMood,
    oneLineGuidance: sourceLabel + ' 운명꽃 실천 가이드: ' + (flower.vibe_message || sajuVerdict)
  };
}

function _dfBuildPromptBadgeLine(selection) {
  var badges = _dfGetSajuBadges(selection || {});
  if (badges.mode === 'sukuyo') {
    return '숙요 배지: ' + _dfOneLineText(badges.mansion, '미확인') + ' / 달 위상 ' + _dfOneLineText(badges.phase, '미확인') + ' / 수호동물 ' + _dfOneLineText(badges.guardian, '미확인');
  }
  if (badges.mode === 'jamidusu') {
    return '자미두수 배지: 오늘의 강한 별 ' + _dfOneLineText(badges.star, '미확인') + ' / 별 밝기 ' + _dfOneLineText(badges.brightness, '미확인') + ' / 궁위 ' + _dfOneLineText(badges.palace, '미확인');
  }
  if (badges.mode === 'astrology') {
    return '점성술 배지: 태양궁 ' + _dfOneLineText(badges.sun, '미확인') + ' / 상승궁 ' + _dfOneLineText(badges.rising, '미확인') + ' / 달궁 ' + _dfOneLineText(badges.moon, '미확인');
  }
  return '사주 배지: 신강/신약 ' + _dfOneLineText(badges.strength, '판정 대기') + ' / 용신 ' + _dfOneLineText(badges.yongshin, '판정 대기') + ' / 조후 ' + _dfOneLineText(badges.johu, '판정 대기');
}

function _dfBuildArtPrompt(selection) {
  if (!selection || !selection.flower) {
    return 'Elegant symbolic flower portrait, soft cinematic lighting, premium botanical illustration, centered composition, no text.';
  }

  var flower = selection.flower || {};
  var source = selection.source || 'saju';
  var sourceLabel = _dfGetSourceLabel(source);
  var direction = _dfGetPromptArtDirection(source);
  var flowerData = selection.flowerData || (selection.matched && selection.matched.flower_data) || {};
  var nameKo = _dfOneLineText(flower.name, '운명의 꽃');
  var latin = _dfOneLineText(flower.scientific_name, 'Unknown species');
  var symbolism = _dfOneLineText(flower.symbolism, '운명의 흐름을 상징하는 꽃');
  var narrative = _dfOneLineText((selection.matched && selection.matched.narrative) || _dfGetSajuVerdict(selection), '운명의 꽃 서사');
  var scenario = _dfOneLineText(flowerData.scenario_reason || flowerData.scenario_title, '개화 시나리오 기반 연출');
  var keywords = _dfToArray(selection.keywords).slice(0, 8).map(function(word) {
    return _dfOneLineText(word, '');
  }).filter(Boolean);
  var keywordLine = keywords.length ? keywords.join(', ') : 'bloom, destiny, aura';
  var palette = (_dfSafeColor(selection.primary, '#f472b6')) + ' and ' + (_dfSafeColor(selection.secondary, '#22d3ee'));
  var badgeLine = _dfBuildPromptBadgeLine(selection);

  return [
    'Korean premium floral editorial illustration, masterpiece, ultra-detailed petals, poetic and elegant tone-and-manner.',
    'Fortune source: ' + sourceLabel + '.',
    'Main subject: ' + nameKo + ' (' + latin + ') symbolic flower portrait.',
    'Symbolism: ' + symbolism + '.',
    'Narrative mood: ' + narrative + '.',
    'Scenario cue: ' + scenario + '.',
    badgeLine + '.',
    'Color palette focus: ' + palette + '.',
    'Keywords: ' + keywordLine + '.',
    'Art direction: ' + direction.mood + '; ' + direction.background + '; ' + direction.composition + '.',
    'Lighting: ' + direction.lighting + '.',
    'Render style: botanical painting + fantasy concept art hybrid, refined brush texture, high detail, 4k, clean background.',
    'Aspect ratio hint: 4:5 portrait.'
  ].join('\n');
}

function _dfBuildNegativePrompt() {
  return [
    'lowres, blurry, noisy, jpeg artifacts, pixelated, out of focus',
    'deformed flower, distorted petals, duplicate main flower, cropped subject, bad composition',
    'text, letters, logo, watermark, signature, frame, collage, split screen, ui overlay',
    'muddy color, overexposed highlight, harsh clipping, dirty background, horror, gore'
  ].join(', ');
}

function _dfBuildPromptPack(selection) {
  return '[Main Prompt]\n' + _dfBuildArtPrompt(selection) + '\n\n[Negative Prompt]\n' + _dfBuildNegativePrompt();
}

function _dfUpdateStudioPrompt(selection) {
  var guideEl = document.getElementById('dfStudioPromptGuide');
  var promptEl = document.getElementById('dfStudioArtPrompt');
  var negativeEl = document.getElementById('dfStudioNegativePrompt');
  if (!guideEl && !promptEl && !negativeEl) return;

  var source = (selection && selection.source) || 'saju';
  var sourceLabel = _dfGetSourceLabel(source);
  var direction = _dfGetPromptArtDirection(source);
  if (guideEl) {
    guideEl.textContent = sourceLabel + ' 톤 디렉션: ' + direction.mood + ' / ' + direction.background;
  }
  if (promptEl) promptEl.value = _dfBuildArtPrompt(selection);
  if (negativeEl) negativeEl.value = _dfBuildNegativePrompt();
}

function _dfClipboardWrite(text, onDoneMessage) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(function() { _dfSetStudioStatus(onDoneMessage || '클립보드에 복사되었습니다.'); })
      .catch(function() { _dfSetStudioStatus('복사 권한이 없어 수동 복사가 필요합니다.'); });
    return;
  }

  var ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', 'readonly');
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try {
    var ok = document.execCommand('copy');
    _dfSetStudioStatus(ok ? (onDoneMessage || '클립보드에 복사되었습니다.') : '복사에 실패했습니다.');
  } catch (e) {
    _dfSetStudioStatus('복사에 실패했습니다.');
  }
  document.body.removeChild(ta);
}

function _dfShareSnapshot(snapshot) {
  var text = _dfBuildShareText(snapshot);
  var isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent || '');
  if (!isMobile) {
    _dfClipboardWrite(text, 'PC 환경에서는 카카오톡 링크를 클립보드에 복사했습니다. 카카오톡에 붙여넣어 공유하세요.');
    return;
  }

  var encoded = encodeURIComponent(text);
  var kakaoUrl = 'kakaotalk://send?text=' + encoded;
  var anchor = document.createElement('a');
  anchor.href = kakaoUrl;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);

  var fallbackTimer = setTimeout(function() {
    _dfClipboardWrite(text, '카카오톡 실행이 확인되지 않아 요약을 클립보드에 복사했습니다. 카카오톡에 붙여넣어 공유하세요.');
  }, 1000);

  try {
    anchor.click();
    _dfSetStudioStatus('카카오톡 공유를 여는 중입니다...');
  } catch (e) {
    clearTimeout(fallbackTimer);
    _dfClipboardWrite(text, '카카오톡 공유를 열지 못해 요약을 클립보드에 복사했습니다.');
  }

  setTimeout(function() {
    if (anchor && anchor.parentNode) anchor.parentNode.removeChild(anchor);
  }, 1200);
}

function _dfRenderHistoryList() {
  var listEl = document.getElementById('dfStudioHistoryList');
  if (!listEl) return;
  var history = _dfStudioState.history;
  if (!history.length) {
    listEl.innerHTML = '';
    _dfSetStudioStatus('아직 저장된 개화 기록이 없습니다. 현재 결과를 저장해보세요.');
    return;
  }

  var html = history.map(function(item) {
    return '<article class="df-history-item" role="listitem">'
      + '<div class="df-history-item-head">'
      + '<p class="df-history-item-name">' + _dfEscapeHtml(item.name) + '</p>'
      + '<span class="df-history-item-time">' + _dfEscapeHtml(item.savedAtLabel || _dfFormatSavedAt(item.savedAt)) + '</span>'
      + '</div>'
      + '<p class="df-history-item-keywords">' + _dfEscapeHtml(_dfToArray(item.keywords).join(' • ')) + '</p>'
      + '<div class="df-history-item-actions">'
      + '<button type="button" class="df-history-btn df-history-btn--restore" data-action="restoreDestinyFlowerSnapshot" data-action-args="' + item.id + '">불러오기</button>'
        + '<button type="button" class="df-history-btn df-history-btn--share" data-action="shareDestinyFlowerSnapshotById" data-action-args="' + item.id + '">카카오 공유</button>'
        + '<button type="button" class="df-history-btn df-history-btn--delete" data-action="deleteDestinyFlowerSnapshot" data-action-args="' + item.id + '">삭제</button>'
      + '</div>'
      + '</article>';
  }).join('');

  listEl.innerHTML = html;
}

function _dfApplyStudioSelection(selection) {
  if (!selection || !selection.flower) return;
  _dfMarkSourceCompleted(selection.source || _dfStudioState.activeSource || 'saju', { silent: true });
  var flower = selection.flower;
  var sourceLabel = selection.source === 'sukuyo'
    ? '숙요점'
    : (selection.source === 'jamidusu' ? '자미두수' : (selection.source === 'astrology' ? '점성술' : '사주'));
  var sourceShort = selection.source === 'sukuyo'
    ? '숙요'
    : (selection.source === 'jamidusu' ? '자미두수' : (selection.source === 'astrology' ? '차트' : '사주'));
  var sajuVerdict = _dfGetSajuVerdict(selection);
  var badges = _dfGetSajuBadges(selection);
  var flowerData = selection.flowerData || (selection.matched && selection.matched.flower_data) || {};
  var extension = _dfBuildAtelierExtension(selection, sourceLabel, badges, flowerData, sajuVerdict);
  var nameEl = document.getElementById('dfStudioName');
  var latinEl = document.getElementById('dfStudioLatin');
  var dayMasterEl = document.getElementById('dfStudioDayMasterBadge');
  var sourceDescEl = document.getElementById('dfStudioSourceDesc');
  var symbolismEl = document.getElementById('dfStudioSymbolism');
  var keywordsEl = document.getElementById('dfStudioKeywords');
  var narrativeEl = document.getElementById('dfStudioNarrative');
  var dataSummaryEl = document.getElementById('dfStudioDataSummary');
  var dataRitualEl = document.getElementById('dfStudioDataRitual');
  var dataThemesEl = document.getElementById('dfStudioDataThemes');
  var sourceMatrixEl = document.getElementById('dfStudioSourceMatrix');
  var journalEl = document.getElementById('dfStudioJournal');
  var recipeEl = document.getElementById('dfStudioRecipe');
  var flowerLanguageEl = document.getElementById('dfStudioFlowerLanguage');
  var synergyEl = document.getElementById('dfStudioSynergy');
  var gardenerWordEl = document.getElementById('dfStudioGardenerWord');
  var auraEl = document.getElementById('dfStudioAura');
  var primaryDot = document.getElementById('dfStudioPrimaryDot');
  var secondaryDot = document.getElementById('dfStudioSecondaryDot');
  var primaryText = document.getElementById('dfStudioPrimaryText');
  var secondaryText = document.getElementById('dfStudioSecondaryText');
  var particleEl = document.getElementById('dfStudioParticle');
  var guidanceEl = document.getElementById('dfStudioGuidance');
  var imageEl = document.getElementById('dfStudioImage');

  if (nameEl) nameEl.textContent = flower.name;
  _dfRenderSajuBadges(selection);
  if (latinEl) latinEl.textContent = flower.scientific_name || 'Unknown species';
  if (sourceDescEl) {
    var meta = _DF_SOURCE_META[_dfNormalizeSource(selection.source || 'saju')] || _DF_SOURCE_META.saju;
    sourceDescEl.textContent = meta.description || '';
  }
  if (dayMasterEl) {
    dayMasterEl.textContent = flowerData.day_master_badge || (selection.source === 'jamidusu' ? '주성 판독 대기' : (selection.source === 'sukuyo' ? '숙요 판독 대기' : '일간 판독 대기'));
  }
  if (symbolismEl) {
    symbolismEl.textContent = sajuVerdict + ' ' + (flowerData.scenario_reason || (flower.symbolism ? ('이 꽃은 ' + flower.symbolism + '을 상징합니다.') : '이 꽃이 당신의 현재 운세 흐름과 강하게 공명합니다.'));
  }
  if (keywordsEl) keywordsEl.textContent = sourceLabel + ' 키워드 · ' + _dfToArray(selection.keywords).join(' • ');
  if (narrativeEl) {
    narrativeEl.textContent = (selection.matched && selection.matched.narrative)
      || (sajuVerdict + ' ' + sourceShort + ' 균형을 기준으로 지금의 개화 포인트를 정렬했습니다.');
  }
  if (dataSummaryEl) {
    dataSummaryEl.textContent = extension.dataSummary;
  }
  if (dataRitualEl) {
    dataRitualEl.textContent = extension.ritualLine;
  }
  if (dataThemesEl) {
    dataThemesEl.textContent = extension.themesLine;
  }
  if (sourceMatrixEl) {
    sourceMatrixEl.innerHTML = (extension.sourceMatrix || []).map(function(line) {
      return '<li>' + _dfEscapeHtml(line) + '</li>';
    }).join('');
  }
  if (journalEl) journalEl.textContent = extension.observationLog;
  if (recipeEl) recipeEl.textContent = extension.secretRecipe;
  if (flowerLanguageEl) flowerLanguageEl.textContent = extension.flowerLanguage;
  if (synergyEl) synergyEl.textContent = extension.synergyPalette;
  if (gardenerWordEl) gardenerWordEl.textContent = extension.gardenerWord;
  if (primaryDot) primaryDot.style.background = selection.primary;
  if (secondaryDot) secondaryDot.style.background = selection.secondary;
  if (primaryText) primaryText.textContent = 'Primary ' + selection.primary;
  if (secondaryText) secondaryText.textContent = 'Secondary ' + selection.secondary;
  if (particleEl) {
    particleEl.textContent = extension.particleMood;
  }
  if (guidanceEl) {
    guidanceEl.textContent = extension.oneLineGuidance;
  }
  _dfUpdateStudioPrompt(selection);
  _dfApplyGeneratedFlowerImage(imageEl, selection, selection.source || 'saju');
  if (auraEl) {
    auraEl.style.background =
      'radial-gradient(circle at 22% 50%, ' + _dfHexToRgba(selection.primary, 0.44) + ', transparent 58%),'
      + 'radial-gradient(circle at 74% 34%, ' + _dfHexToRgba(selection.secondary, 0.34) + ', transparent 60%)';
  }
  if (imageEl && imageEl.style) {
    imageEl.style.filter = 'drop-shadow(0 12px 26px ' + _dfHexToRgba(selection.primary, 0.24) + ') saturate(1.08)';
  }
}

function openAstrologyFlower() {
  _dfSetActiveSource('astrology');
  return openDestinyFlower(false);
}

function openJamidusuFlower() {
  _dfSetActiveSource('jamidusu');
  return openDestinyFlower(false);
}

function openSukuyoFlower() {
  _dfSetActiveSource('sukuyo');
  return openDestinyFlower(false);
}

function _dfResolveLockTileBySource(source) {
  var normalized = _dfNormalizeSource(source);
  var sourceLockMap = {
    saju: 'openDestinyFlowerStudio',
    astrology: 'openAstrologyFlowerStudio',
    jamidusu: 'openJamidusuFlowerStudio',
    sukuyo: 'openSukuyoFlowerStudio'
  };
  var actionName = sourceLockMap[normalized] || '';
  if (!actionName) return null;
  var tile = document.querySelector('[data-action="' + actionName + '"][data-tile-lock-key]');
  return tile;
}

function _dfIsLockKeyUnlocked(lockKey) {
  if (!lockKey) return false;
  try {
    if (window.unlockedFeatureMap && typeof window.unlockedFeatureMap === 'object') {
      return __cdMapHasTileLockUnlocked(window.unlockedFeatureMap, lockKey);
    }
  } catch (_) {}
  try {
    var authRaw = localStorage.getItem('fortune_auth_user') || '';
    var auth = authRaw ? JSON.parse(authRaw) : null;
    var scopeRaw = auth && (auth.id || auth.userId || auth.email || auth.username || auth.loginId);
    var scope = String(scopeRaw || '').trim().toLowerCase();
    if (scope) {
      var scopedKey = 'cd_tile_locks_v2::' + scope;
      var scopedRaw = localStorage.getItem(scopedKey);
      if (scopedRaw) {
        var scopedMap = JSON.parse(scopedRaw);
        if (__cdMapHasTileLockUnlocked(scopedMap, lockKey)) return true;
      }
    }
  } catch (_) {}
  try {
    localStorage.removeItem('cd_tile_locks');
  } catch (_) {}
  return false;
}

function _dfIsSourceUnlocked(source) {
  var normalized = _dfNormalizeSource(source);
  var cache = _dfRefreshSourceUnlockCache(true);
  if (cache[normalized] === true) return true;
  return _dfIsSourcePaidUnlocked(normalized);
}

function _dfRequirePaidSourceUnlock(source) {
  var normalized = _dfNormalizeSource(source);
  var lockTile = _dfResolveLockTileBySource(normalized);
  if (!lockTile) return true;

  var lockKey = lockTile.getAttribute('data-tile-lock-key') || '';
  var lockCost = Number(lockTile.getAttribute('data-tile-lock-cost') || 0);
  if (!lockKey || lockCost <= 0) return true;
  if (_dfIsLockKeyUnlocked(lockKey)) return true;
  if (lockTile.classList && lockTile.classList.contains('tarot-tile--tileUnlocked')) return true;

  if (!lockTile.getAttribute('data-pvw-bypass') && typeof window._cdOpenTilePreview === 'function') {
    try {
      if (window._cdOpenTilePreview(lockTile)) return false;
    } catch (_) {}
  }

  if (!__cdHasAuthToken()) {
    if (window.confirm(_indexRuntimeText("indexRuntime.confirm.003"))) {
      window.location.href = '/login?next=%2F';
    }
    return false;
  }

  window.alert(_dfGetSourceLabel(normalized) + ' 꽃은 해금 후 이용할 수 있습니다.');
  return false;
}

function _dfRequireSourceCoinPayment(source) {
  var normalized = _dfNormalizeSource(source);
  if (!_dfRequirePaidSourceUnlock(normalized)) return false;
  if (_dfIsSourceUnlocked(normalized)) return true;
  var required = _dfGetRequiredSourceForUnlock(normalized);
  var requiredLabel = required ? _dfGetSourceLabel(required) : '이전 단계';
  _dfSetStudioStatus(requiredLabel + '을 먼저 완료하면 ' + _dfGetSourceLabel(normalized) + ' 꽃이 열립니다.');
  _dfSyncSourceTabsLockState();
  return false;
}

function openAstrologyFlowerStudio() {
  return openDestinyFlowerStudio('astrology');
}

function openJamidusuFlowerStudio() {
  return openDestinyFlowerStudio('jamidusu');
}

function openSukuyoFlowerStudio() {
  return openDestinyFlowerStudio('sukuyo');
}

function openDestinyFlower(forceRefreshData) {
  var card = document.querySelector('.feature-card.feature-card--destiny-flower');
  if (!card) return;

  _dfEnsureCardOpen(card);
  var activeSource = _dfSetActiveSource(_dfStudioState.activeSource || 'saju');
  var refresh = forceRefreshData !== false;
  var selection = _dfGetUnifiedSelection(activeSource, refresh);
  if (selection) {
    _dfAnimateUnifiedCardSwitch(card, selection);
  } else {
    var stage = card.querySelector('.destiny-flower-stage');
    var nameEl = card.querySelector('.destiny-flower-stage__name');
    var symbolismEl = card.querySelector('.destiny-flower-stage__symbolism');
    var emptyState = _dfGetDataMissingUiState(activeSource);
    if (stage && nameEl && symbolismEl) {
      nameEl.textContent = '데이터 불러오기 대기';
      symbolismEl.textContent = emptyState.message;
    }
  }
  if (typeof syncFeatureCardHeight === 'function') {
    syncFeatureCardHeight(card);
    requestAnimationFrame(function() {
      syncFeatureCardHeight(card);
    });
  }
  _dfStudioState.selection = selection;

  document.body.classList.add('destiny-flower-focus');
  if (window.__destinyFlowerFocusTimer) {
    clearTimeout(window.__destinyFlowerFocusTimer);
  }
  window.__destinyFlowerFocusTimer = setTimeout(function() {
    document.body.classList.remove('destiny-flower-focus');
  }, 2800);

  return selection;
}

function openDestinyFlowerStudio(source, gatePassed) {
  _dfCaptureOriginalTitle();
  _dfBindTitleRestoreGuards();
  var requestedSource = _dfNormalizeSource(source || (_dfStudioState && _dfStudioState.activeSource) || 'saju');
  if (gatePassed !== true && !_dfRequireSourceCoinPayment(requestedSource)) {
    return;
  }
  var _dfActiveSource = _dfSetActiveSource(requestedSource);
  var overlay = document.getElementById('destinyFlowerStudioOverlay');
  if (!overlay) return;
  if (overlay.style.display === 'block' && overlay.classList.contains('is-show')) {
    setDestinyFlowerSourceTab(_dfActiveSource, true);
    return;
  }

  var sheet = document.getElementById('destinyFlowerStudioSheet');
  try {
  if (!overlay.__dfCloseBridgeBound) {
    overlay.__dfCloseBridgeBound = '1';
    overlay.addEventListener('click', function(e) {
      var rawTarget = __cdResolveEventElement(e);
      var clickTarget = __cdResolveDestinyFlowerClickTarget(e);
      if (!clickTarget) return;
      var closeTrigger = clickTarget.closest('[data-action="closeDestinyFlowerStudio"], .df-studio-close, .df-studio-btn--secondary');
      if (!closeTrigger && sheet && __cdIsPointInsideElement(e.clientX, e.clientY, sheet.querySelector('.df-studio-close'))) {
        closeTrigger = sheet.querySelector('.df-studio-close');
      }
      if (closeTrigger) {
        e.preventDefault();
        e.stopPropagation();
        closeDestinyFlowerStudio();
        return;
      }
      if (sheet && __cdIsInsideDestinyFlowerSheet(e, rawTarget)) return;
      if (clickTarget === overlay) {
        e.preventDefault();
        e.stopPropagation();
        closeDestinyFlowerStudio();
      }
    });
  }

  if (sheet && !sheet.__dfTabBound) {
    sheet.__dfTabBound = true;
    sheet.addEventListener('click', function(e) {
      var tab = e.target && e.target.closest ? e.target.closest('.df-source-tab[data-df-source-tab]') : null;
      if (!tab) return;
      var source = tab.getAttribute('data-df-source-tab');
      if (!source) return;
      e.preventDefault();
      e.stopPropagation();
      setDestinyFlowerSourceTab(source);
    }, true);
  }

  if (sheet && !sheet.__dfTouchActionBound) {
    sheet.__dfTouchActionBound = true;
    sheet.addEventListener('touchend', function(e) {
      var ov = document.getElementById('destinyFlowerStudioOverlay');
      if (!ov || ov.style.display === 'none') return;
      var touch = e.changedTouches && e.changedTouches[0];
      if (!touch) return;
      var x = touch.clientX;
      var y = touch.clientY;
      if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) return;
      var el = null;
      try {
        el = document.elementFromPoint(x, y);
      } catch (err) {
        return;
      }
      if (!el || !sheet.contains(el)) return;
      var closeBtn = sheet.querySelector('.df-studio-close');
      if (closeBtn && __cdIsPointInsideElement(x, y, closeBtn)) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        closeDestinyFlowerStudio();
        return;
      }
      var btn = el.closest && el.closest('[data-action]');
      if (!btn || !sheet.contains(btn)) return;
      var act = btn.getAttribute('data-action');
      if (!act) return;
      if (act === 'closeDestinyFlowerStudio') {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        closeDestinyFlowerStudio();
        return;
      }
      if (btn.classList && btn.classList.contains('df-source-tab')) return;
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      window.__dfStudioLastTouchActionAt = Date.now();
      __cdInvokeAction(act, btn, e);
    }, { passive: false, capture: true });
    sheet.addEventListener('click', function(e) {
      if (Date.now() - (window.__dfStudioLastTouchActionAt || 0) > 520) return;
      var t = __cdResolveEventElement(e);
      if (!t || !sheet.contains(t)) return;
      if (t.closest && t.closest('[data-action="closeDestinyFlowerStudio"]')) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    }, true);
  }

  var selection = openDestinyFlower(false) || _dfGetUnifiedSelection(_dfStudioState.activeSource || 'saju', false);

  if (!selection) {
    _dfStudioState.selection = null;
    var emptyState = _dfGetDataMissingUiState(_dfStudioState.activeSource || 'saju');
    _dfShowStudioEmptyState(emptyState.source, emptyState.message, emptyState.showLoadButton);
    _dfSetStudioStatus(emptyState.message, {
      showLoadButton: emptyState.showLoadButton,
      source: emptyState.source
    });
  } else {
    _dfStudioState.selection = selection;
    _dfApplyStudioSelection(selection);
    _dfHideStudioEmptyState();
    _dfLoadHistory();
    _dfRenderHistoryList();
    _dfSetStudioStatus(_dfGetSajuVerdict(selection) + ' 결과를 저장하거나 카카오톡으로 공유할 수 있습니다.');
  }

  overlay.style.display = 'block';
  overlay.scrollTop = 0;
  if (sheet) sheet.scrollTop = 0;
  _dfSetBodyLock(true);
  _dfApplyStudioTitle();
  requestAnimationFrame(function() {
    overlay.classList.add('is-show');
  });
  } catch (err) {
    if (typeof console !== 'undefined' && console.error) console.error('[DestinyFlower]', err);
    overlay.style.display = 'none';
    _dfSetBodyLock(false);
  }
}

/* 프로필 카드 → 운명의 꽃 진입용: 정의 직후 window에 노출 (스크립트 후반 오류 시에도 사용 가능) */
window.openDestinyFlowerStudio = openDestinyFlowerStudio;
window.openDestinyFlower = openDestinyFlower;

function _dfGetNoBirthMessage(source) {
  var normalized = _dfNormalizeSource(source);
  if (normalized === 'jamidusu') return '자미두수 꽃을 보려면 생년월일을 입력해주세요.';
  if (normalized === 'sukuyo') return '숙요점 꽃을 보려면 생년월일을 입력해주세요.';
  return '이름과 생년월일 정보를 먼저 입력하면, 나만의 운명의 꽃이 여기에서 피어납니다.';
}

function setDestinyFlowerSourceTab(source, gatePassed) {
  var normalized = _dfNormalizeSource(source);
  if (gatePassed !== true && !_dfRequireSourceCoinPayment(normalized)) {
    return _dfStudioState.selection || null;
  }
  normalized = _dfSetActiveSource(normalized);
  var overlay = document.getElementById('destinyFlowerStudioOverlay');
  var isStudioOpen = overlay && overlay.style.display !== 'none';
  var selection = _dfGetUnifiedSelection(normalized, false);
  _dfStudioState.selection = selection;

  if (isStudioOpen) {
    var studioSelection = _dfRefreshStudioForSource(normalized, false);
    if (studioSelection) {
      _dfMarkSourceCompleted(normalized, { silent: true });
      _dfSetStudioStatus(_dfGetSajuVerdict(studioSelection) + ' 기준으로 탭과 프롬프트를 갱신했습니다.');
    }
  } else {
    var card = document.querySelector('.feature-card.feature-card--destiny-flower');
    if (card) {
      _dfEnsureCardOpen(card);
      if (selection) {
        _dfAnimateUnifiedCardSwitch(card, selection);
        _dfMarkSourceCompleted(normalized, { silent: true });
      } else {
        var stage = card.querySelector('.destiny-flower-stage');
        var nameEl = card.querySelector('.destiny-flower-stage__name');
        var symbolismEl = card.querySelector('.destiny-flower-stage__symbolism');
        if (stage && nameEl && symbolismEl) {
          nameEl.textContent = '생년월일 입력 대기';
          symbolismEl.textContent = _dfGetDataMissingUiState(normalized).message;
        }
      }
      if (typeof syncFeatureCardHeight === 'function') {
        syncFeatureCardHeight(card);
        requestAnimationFrame(function() {
          syncFeatureCardHeight(card);
        });
      }
    }
  }

  return selection;
}

function closeDestinyFlowerStudio() {
  var overlay = document.getElementById('destinyFlowerStudioOverlay');
  if (!overlay) return;
  _dfStudioState.coinGatePassed = false;
  _dfStudioState.coinGateInFlight = false;
  _dfStudioState._coinGatePassToken = null;  // 토큰도 리셋
  _dfRestoreOriginalTitle();
  overlay.classList.remove('is-show');
  setTimeout(function() {
    if (!overlay.classList.contains('is-show')) {
      overlay.style.display = 'none';
      _dfRestoreOriginalTitle();
    }
  }, 220);
  _dfSetBodyLock(false);
}

function goHomeFromDestinyFlower() {
  closeDestinyFlowerStudio();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goAskAIFromDestinyFlower(button) {
  var url = (button && button.getAttribute && button.getAttribute('data-ai-url')) || 'https://chatgpt.com/';
  closeDestinyFlowerStudio();
  _dfSetStudioStatus('AI를 새 탭에서 엽니다. 열리지 않으면 팝업 허용 후 다시 시도해 주세요.');
  setTimeout(function() {
    var w = null;
    try {
      w = window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      w = null;
    }
    if (!w || (typeof w.closed !== 'undefined' && w.closed)) {
      try {
        window.open(url, '_blank', 'noopener');
      } catch (e2) {}
      _dfSetStudioStatus('새 탭이 차단된 것 같습니다. 브라우저에서 팝업을 허용하거나 원하는 AI 사이트를 직접 열어 주세요.');
    }
  }, 100);
}

function saveDestinyFlowerSnapshot() {
  var selection = _dfStudioState.selection || openDestinyFlower() || _dfResolveSelection();
  var snapshot = _dfBuildSnapshot(selection);
  if (!snapshot) return;

  _dfLoadHistory();
  _dfStudioState.history = _dfStudioState.history.filter(function(item) {
    return !(item.name === snapshot.name && item.primary === snapshot.primary && item.secondary === snapshot.secondary);
  });
  _dfStudioState.history.unshift(snapshot);
  _dfStudioState.history = _dfStudioState.history.slice(0, _DF_STUDIO_HISTORY_LIMIT);
  _dfPersistHistory();
  _dfRenderHistoryList();
  _dfSetStudioStatus('개화 기록이 저장되었습니다: ' + snapshot.name + ' (' + snapshot.savedAtLabel + ')');
}

function restoreDestinyFlowerSnapshot(snapshotId) {
  if (!snapshotId) return;
  _dfLoadHistory();
  var target = null;
  for (var i = 0; i < _dfStudioState.history.length; i++) {
    if (_dfStudioState.history[i].id === snapshotId) {
      target = _dfStudioState.history[i];
      break;
    }
  }
  if (!target) {
    _dfSetStudioStatus('해당 기록을 찾을 수 없습니다.');
    return;
  }

  var selection = _dfSelectionFromSnapshot(target);
  _dfSetActiveSource(selection.source || 'saju');
  _dfStudioState.selection = selection;
  _dfApplyStudioSelection(selection);
  var card = document.querySelector('.feature-card.feature-card--destiny-flower');
  if (card) {
    _dfEnsureCardOpen(card);
    _dfAnimateUnifiedCardSwitch(card, selection);
  }
  _dfSetStudioStatus('저장한 개화 기록을 불러왔습니다: ' + target.name);
}

function deleteDestinyFlowerSnapshot(snapshotId) {
  if (!snapshotId) return;
  _dfLoadHistory();
  var before = _dfStudioState.history.length;
  _dfStudioState.history = _dfStudioState.history.filter(function(item) {
    return item.id !== snapshotId;
  });
  if (_dfStudioState.history.length === before) {
    _dfSetStudioStatus('삭제할 기록을 찾지 못했습니다.');
    return;
  }
  _dfPersistHistory();
  _dfRenderHistoryList();
  _dfSetStudioStatus('선택한 개화 기록을 삭제했습니다.');
}

function clearDestinyFlowerSnapshots() {
  _dfLoadHistory();
  if (!_dfStudioState.history.length) {
    _dfSetStudioStatus('삭제할 개화 기록이 없습니다.');
    return;
  }
  var ok = window.confirm(_indexRuntimeText("indexRuntime.confirm.004"));
  if (!ok) return;
  _dfStudioState.history = [];
  _dfPersistHistory();
  _dfRenderHistoryList();
  _dfSetStudioStatus('저장된 개화 기록을 모두 삭제했습니다.');
}

function shareDestinyFlowerSnapshot() {
  var selection = _dfStudioState.selection || openDestinyFlower() || _dfResolveSelection();
  var snapshot = _dfBuildSnapshot(selection);
  _dfShareSnapshot(snapshot);
}

function shareDestinyFlowerSnapshotById(snapshotId) {
  if (!snapshotId) return;
  _dfLoadHistory();
  var target = null;
  for (var i = 0; i < _dfStudioState.history.length; i++) {
    if (_dfStudioState.history[i].id === snapshotId) {
      target = _dfStudioState.history[i];
      break;
    }
  }
  if (!target) {
    _dfSetStudioStatus('공유할 기록을 찾을 수 없습니다.');
    return;
  }
  _dfShareSnapshot(target);
}

function copyDestinyFlowerSummary() {
  var selection = _dfStudioState.selection || openDestinyFlower() || _dfResolveSelection();
  var snapshot = _dfBuildSnapshot(selection);
  var text = _dfBuildShareText(snapshot);
  _dfClipboardWrite(text, '요약을 클립보드에 복사했습니다.');
}

function copyDestinyFlowerArtPrompt() {
  var selection = _dfStudioState.selection || openDestinyFlower() || _dfResolveSelection();
  var text = _dfBuildArtPrompt(selection);
  _dfClipboardWrite(text, 'AI 꽃 메인 프롬프트를 클립보드에 복사했습니다.');
}

function copyDestinyFlowerPromptPack() {
  var selection = _dfStudioState.selection || openDestinyFlower() || _dfResolveSelection();
  var text = _dfBuildPromptPack(selection);
  _dfClipboardWrite(text, '메인/네거티브 프롬프트 세트를 클립보드에 복사했습니다.');
}

window.openDestinyFlower = openDestinyFlower;
window.openAstrologyFlower = openAstrologyFlower;
window.openJamidusuFlower = openJamidusuFlower;
window.openSukuyoFlower = openSukuyoFlower;
window.openDestinyFlowerStudio = openDestinyFlowerStudio;
window.openAstrologyFlowerStudio = openAstrologyFlowerStudio;
window.openJamidusuFlowerStudio = openJamidusuFlowerStudio;
window.openSukuyoFlowerStudio = openSukuyoFlowerStudio;
window.setDestinyFlowerSourceTab = setDestinyFlowerSourceTab;
window.closeDestinyFlowerStudio = closeDestinyFlowerStudio;
window.goHomeFromDestinyFlower = goHomeFromDestinyFlower;
window.goAskAIFromDestinyFlower = goAskAIFromDestinyFlower;
window.saveDestinyFlowerSnapshot = saveDestinyFlowerSnapshot;
window.restoreDestinyFlowerSnapshot = restoreDestinyFlowerSnapshot;
window.deleteDestinyFlowerSnapshot = deleteDestinyFlowerSnapshot;
window.clearDestinyFlowerSnapshots = clearDestinyFlowerSnapshots;
window.shareDestinyFlowerSnapshot = shareDestinyFlowerSnapshot;
window.shareDestinyFlowerSnapshotById = shareDestinyFlowerSnapshotById;
window.copyDestinyFlowerSummary = copyDestinyFlowerSummary;
window.copyDestinyFlowerArtPrompt = copyDestinyFlowerArtPrompt;
window.copyDestinyFlowerPromptPack = copyDestinyFlowerPromptPack;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    _dfSyncSourceTabs(_dfStudioState.activeSource || 'saju');
    _dfSyncSourceTabsLockState();
    _dfSyncSourceStickers(_dfStudioState.activeSource || 'saju');
    _dfBindBloomingInteractions();
    // [UX FIX] 자동 애니메이션 제거 — 버튼 클릭으로만 꽃 아틀리에 진입
    // _dfRunIntroBloom();
  }, { once: true });
} else {
  _dfSyncSourceTabs(_dfStudioState.activeSource || 'saju');
  _dfSyncSourceTabsLockState();
  _dfSyncSourceStickers(_dfStudioState.activeSource || 'saju');
  _dfBindBloomingInteractions();
  // [UX FIX] 자동 애니메이션 제거 — 버튼 클릭으로만 꽃 아틀리에 진입
  // _dfRunIntroBloom();
}

if (!window.__destinyFlowerEscBound) {
  window.__destinyFlowerEscBound = true;
  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') return;
    var overlay = document.getElementById('destinyFlowerStudioOverlay');
    if (!overlay || overlay.style.display === 'none') return;
    closeDestinyFlowerStudio();
  });
}

function _dpStorage() {
  return window.DestinyProfileManager ? window.DestinyProfileManager.storage : null;
}
function _dpEsc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function _dpZodiac(y) {
  return ['🐀', '🐂', '🐅', '🐇', '🐉', '🐍', '🐎', '🐑', '🐒', '🐓', '🐕', '🐖'][(y - 4 + 120) % 12];
}

function _dpParseBirthPartsForFeature(profile) {
  var birth = profile && profile.birth && typeof profile.birth === 'object' ? profile.birth : {};
  var year = parseInt(birth.year != null ? birth.year : profile && profile.birthYear, 10);
  var month = parseInt(birth.month != null ? birth.month : profile && profile.birthMonth, 10);
  var day = parseInt(birth.day != null ? birth.day : profile && profile.birthDay, 10);
  if (isFinite(year) && isFinite(month) && isFinite(day)) return { year: year, month: month, day: day };
  var text = String((profile && (profile.birthDate || profile.birthIso || profile.date || profile.birthday)) || '').trim();
  if (!text) return null;
  var datePart = text.split(/[T\s]/)[0] || text;
  var parts = datePart.indexOf('-') >= 0 || datePart.indexOf('/') >= 0 || datePart.indexOf('.') >= 0
    ? datePart.split(/[-/.]/)
    : [datePart.replace(/\D/g, '').slice(0, 4), datePart.replace(/\D/g, '').slice(4, 6), datePart.replace(/\D/g, '').slice(6, 8)];
  if (parts.length < 3) return null;
  year = parseInt(parts[0], 10);
  month = parseInt(parts[1], 10);
  day = parseInt(parts[2], 10);
  return (isFinite(year) && isFinite(month) && isFinite(day)) ? { year: year, month: month, day: day } : null;
}

function _dpNormalizeProfileForFeature(profile) {
  if (!profile || typeof profile !== 'object') return null;
  var parsed = _dpParseBirthPartsForFeature(profile);
  if (!parsed) return null;
  var b = profile.birth && typeof profile.birth === 'object' ? profile.birth : {};
  var timeText = String(profile.birthTime || profile.birthIso || '').trim();
  var timePart = timeText.indexOf('T') >= 0 || timeText.indexOf(' ') >= 0 ? (timeText.split(/[T\s]/)[1] || '') : timeText;
  var timePieces = timePart ? timePart.split(':') : [];
  var hour = parseInt(b.hour != null ? b.hour : (profile.birthHour != null ? profile.birthHour : timePieces[0]), 10);
  var minute = parseInt(b.minute != null ? b.minute : (profile.birthMinute != null ? profile.birthMinute : timePieces[1]), 10);
  if (!isFinite(hour) || hour < 0 || hour > 23) hour = 12;
  if (!isFinite(minute) || minute < 0 || minute > 59) minute = 0;
  var calType = String(b.calType || profile.calType || profile.calendarType || 'solar').trim();
  if (calType !== 'lunar' && calType !== 'lunar_leap') calType = 'solar';
  var l = profile.location && typeof profile.location === 'object' ? profile.location : {};
  var normalized = Object.assign({}, profile);
  normalized.id = String(profile.id || profile.profileId || '').trim() || normalized.id;
  normalized.profileId = String(profile.profileId || profile.id || '').trim() || normalized.profileId;
  normalized.birth = Object.assign({}, b, {
    year: parsed.year,
    month: parsed.month,
    day: parsed.day,
    hour: hour,
    minute: minute,
    calType: calType
  });
  normalized.birthYear = parsed.year;
  normalized.birthMonth = parsed.month;
  normalized.birthDay = parsed.day;
  normalized.birthHour = hour;
  normalized.birthMinute = minute;
  normalized.calType = calType;
  normalized.birthDate = parsed.year + '-' + String(parsed.month).padStart(2, '0') + '-' + String(parsed.day).padStart(2, '0');
  normalized.birthTime = String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0');
  normalized.location = Object.assign({}, l);
  return normalized;
}

function _dpNormalizeProfileListForFeature(profiles) {
  if (!Array.isArray(profiles)) return [];
  return profiles.map(_dpNormalizeProfileForFeature).filter(function(profile) { return !!profile; });
}

var _dpSwitchPending = null;
var _dpSwitchTrigger = null;
var _dpSwitchUnmountTimer = null;

function _dpEnsureSwitchConfirmOverlayMounted() {
  var existing = document.getElementById('dpSwitchConfirmOverlay');
  if (existing) return existing;
  var tpl = document.getElementById('dpSwitchConfirmOverlayTemplate');
  if (!tpl || !tpl.content) return null;
  var frag = tpl.content.cloneNode(true);
  document.body.appendChild(frag);
  return document.getElementById('dpSwitchConfirmOverlay');
}

function _dpUnmountSwitchConfirmOverlayAfterClose() {
  if (_dpSwitchUnmountTimer) {
    clearTimeout(_dpSwitchUnmountTimer);
    _dpSwitchUnmountTimer = null;
  }
  _dpSwitchUnmountTimer = setTimeout(function() {
    var ov = document.getElementById('dpSwitchConfirmOverlay');
    if (!ov || ov.classList.contains('dp-switch-overlay--in')) return;
    if (ov.parentNode) ov.parentNode.removeChild(ov);
  }, 320);
}

function _dpRestoreSwitchConfirmFocus() {
  var target = _dpSwitchTrigger;
  _dpSwitchTrigger = null;
  if (target && typeof target.focus === 'function' && document.contains(target)) {
    try { target.focus({ preventScroll: true }); return; } catch (_) {}
  }
  var fallback = document.querySelector('#dpListSheet button, #profileHub button, button, [href], [tabindex]:not([tabindex="-1"])');
  if (fallback && typeof fallback.focus === 'function') {
    try { fallback.focus({ preventScroll: true }); } catch (_) {}
  }
}

function _dpCloseSwitchConfirmOverlay() {
  var ov = document.getElementById('dpSwitchConfirmOverlay');
  if (ov) {
    ov.classList.remove('dp-switch-overlay--in');
    ov.setAttribute('aria-hidden', 'true');
    setTimeout(function() {
      var node = document.getElementById('dpSwitchConfirmOverlay');
      if (node) node.style.display = 'none';
    }, 300);
    _dpUnmountSwitchConfirmOverlayAfterClose();
  }
  _dpRestoreSwitchConfirmFocus();
}

function _dpShowSwitchConfirm(profile, onYes) {
  profile = _dpNormalizeProfileForFeature(profile) || profile;
  _dpSwitchPending = { profile: profile, onYes: onYes };
  _dpSwitchTrigger = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
  if (_dpSwitchUnmountTimer) {
    clearTimeout(_dpSwitchUnmountTimer);
    _dpSwitchUnmountTimer = null;
  }
  var ov = _dpEnsureSwitchConfirmOverlayMounted();
  if (!ov) return;
  var b = profile.birth || {}, l = profile.location || {};
  var cal = b.calType === 'solar' ? '양력' : (b.calType === 'lunar_leap' ? '음력(윤)' : '음력');
  var dateStr = cal + ' ' + b.year + '.'
    + String(b.month || 1).padStart(2, '0') + '.' + String(b.day || 1).padStart(2, '0')
    + ' · ' + String(b.hour != null ? b.hour : 12).padStart(2, '0')
    + ':' + String(b.minute != null ? b.minute : 0).padStart(2, '0');
  var iconEl = document.getElementById('dpSwIcon');
  var nameEl = document.getElementById('dpSwName');
  var detailEl = document.getElementById('dpSwDetail');
  var locEl = document.getElementById('dpSwLoc');
  if (iconEl) iconEl.textContent = _dpZodiac(b.year);
  if (nameEl) nameEl.textContent = profile.name || '';
  if (detailEl) detailEl.textContent = dateStr;
  if (locEl) locEl.textContent = l.label ? '📍 ' + l.label : '';
  ov.style.display = 'flex';
  ov.setAttribute('aria-hidden', 'false');
  ov.classList.remove('dp-switch-overlay--in');
  requestAnimationFrame(function() { ov.classList.add('dp-switch-overlay--in'); });
  var focusTarget = ov.querySelector('.dp-switch-no, button, [href], [tabindex]:not([tabindex="-1"])');
  if (focusTarget && typeof focusTarget.focus === 'function') {
    try { focusTarget.focus({ preventScroll: true }); } catch (_) {}
  }
}

function dpSwitchConfirmYes() {
  _dpCloseSwitchConfirmOverlay();
  if (_dpSwitchPending) {
    var cb = _dpSwitchPending.onYes, p = _dpSwitchPending.profile;
    _dpSwitchPending = null;
    try { cb(p); } catch (e) { console.error('[dpSwitchConfirm] 콜백 오류:', e); }
  }
}

function dpSwitchConfirmNo() {
  _dpCloseSwitchConfirmOverlay();
  _dpSwitchPending = null;
}

function _dpSelect(id, type) {
  var s = _dpStorage(); if (!s) return;
  var list = _dpNormalizeProfileListForFeature(s.list()), profile = null;
  for (var i = 0; i < list.length; i++) { if (list[i].id === id) { profile = list[i]; break; } }
  if (!profile) return;
  _dpShowSwitchConfirm(profile, function(p) {
    s.setCurrent(id);
    if (type === 'saju') {
      if (typeof window.dpRunWithProfile === 'function') window.dpRunWithProfile(id);
    } else {
      _ModalProfileState.dispatch(p, type);
    }
  });
}

function closeAllMysticModalsToHome() {
  if (typeof closeSukuyoModal === 'function') closeSukuyoModal();
  if (typeof closeZiweiModal === 'function') closeZiweiModal();
  if (typeof closeAstroModal === 'function') closeAstroModal();
  if (typeof closeSibylModal === 'function') closeSibylModal();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function _dpPickerHTML(profiles, type, theme, backFn) {
  profiles = _dpNormalizeProfileListForFeature(profiles);
  var h = '<div style="padding:16px 0 8px;">'
    + '<div style="text-align:center;margin-bottom:22px;padding:0 8px;">'
    + '<div style="font-size:2.5rem;margin-bottom:10px;">' + theme.icon + '</div>'
    + '<div style="font-family:\'Gowun Dodum\',serif;font-size:1rem;color:' + theme.ac + ';letter-spacing:2px;font-weight:700;margin-bottom:6px;">' + theme.title + '</div>'
    + '<div style="font-size:0.8rem;color:rgba(255,255,255,0.4);line-height:1.6;">' + (theme.sub || '운명 카드를 선택하면 바로 결과를 확인할 수 있습니다') + '</div>'
    + '</div><div style="display:flex;flex-direction:column;gap:10px;">';
  profiles.forEach(function(p) {
    var b = p.birth, l = p.location || {};
    var zodiac = _dpZodiac(b.year);
    var cal = b.calType === 'solar' ? '양력' : (b.calType === 'lunar_leap' ? '음력(윤)' : '음력');
    var gbadge = p.gender === 'M'
      ? '<span style="font-size:0.63rem;color:#93c5fd;background:rgba(96,165,250,0.15);border:1px solid rgba(96,165,250,0.3);padding:1px 6px;border-radius:10px;">♂</span>'
      : '<span style="font-size:0.63rem;color:#f9a8d4;background:rgba(244,114,182,0.15);border:1px solid rgba(244,114,182,0.3);padding:1px 6px;border-radius:10px;">♀</span>';
    h += '<button type="button" data-action="_dpSelect" data-action-args="' + _dpEsc(p.id) + ',' + _dpEsc(type) + '" '
      + 'style="display:flex;align-items:center;gap:13px;width:100%;padding:13px 15px;cursor:pointer;text-align:left;font:inherit;'
      + 'background:rgba(255,255,255,0.03);border:1px solid rgba(' + theme.br + ',0.22);'
      + 'border-radius:14px;touch-action:pan-y;-webkit-tap-highlight-color:transparent;">'
      + '<div style="font-size:1.9rem;flex-shrink:0;">' + zodiac + '</div>'
      + '<div style="flex:1;min-width:0;">'
      + '<div style="font-family:\'Gowun Dodum\',serif;font-size:0.92rem;color:rgba(255,255,255,0.88);font-weight:700;margin-bottom:3px;">'
      + _dpEsc(p.name) + '&nbsp;' + gbadge + '</div>'
      + '<div style="font-size:0.76rem;color:rgba(255,255,255,0.45);">'
      + cal + '&nbsp;' + b.year + '.' + String(b.month).padStart(2, '0') + '.' + String(b.day).padStart(2, '0')
      + '&nbsp;&middot;&nbsp;' + String(b.hour != null ? b.hour : 12).padStart(2, '0') + ':' + String(b.minute != null ? b.minute : 0).padStart(2, '0') + '</div>'
      + (l.label ? '<div style="font-size:0.7rem;color:rgba(255,255,255,0.28);margin-top:2px;">📍&nbsp;' + _dpEsc(l.label) + '</div>' : '')
      + '</div>'
      + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + theme.ac + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;opacity:0.7;"><polyline points="9 18 15 12 9 6"/></svg>'
      + '</button>';
  });
  h += '</div>'
    + '<div style="text-align:center;margin-top:18px;">'
    + '<button data-action="' + (backFn || 'closeAllMysticModalsToHome') + '" '
    + 'style="background:transparent;border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.4);'
    + 'padding:9px 18px;border-radius:10px;font-family:\'Gowun Dodum\',serif;font-size:0.8rem;cursor:pointer;touch-action:manipulation;">' + (backFn ? '← 닫기' : '← 홈으로') + '</button>'
    + '</div></div>';
  return h;
}

function _dpEmptyHTML(theme) {
  return '<div style="text-align:center;padding:60px 20px;">'
    + '<div style="font-size:3rem;margin-bottom:16px;">' + theme.icon + '</div>'
    + '<h3 style="color:' + theme.ac + ';margin-bottom:8px;font-family:\'Gowun Dodum\',serif;">나의 운명 카드 필요</h3>'
    + '<p style="color:#9ca3af;line-height:1.6;margin-bottom:24px;">' + theme.desc + '</p>'
    + '<button data-action="closeAllMysticModalsToHome" data-after-action-scroll-target="destinyCardForm" '
    + 'style="background:' + theme.bb + ';border:1px solid rgba(' + theme.br + ',0.5);color:' + theme.ac + ';'
    + 'padding:12px 24px;border-radius:12px;font-family:\'Gowun Dodum\',serif;font-size:0.9rem;cursor:pointer;touch-action:manipulation;">운명 카드 만들기</button>'
    + '</div>';
}

function __cdForceUnlockBodyScroll() {
  try {
    if (window._perf && typeof window._perf.unlockBody === 'function') {
      window._perf.unlockBody();
    }
  } catch (e) {}
  // 키드 레퍼런스 카운트 락도 함께 0으로 리셋 — 짝 unlock 누락으로 lockCount가
  // 남아있으면 아래 인라인 복원이 이후 재-락에 덮여 스크롤이 계속 막힘.
  try {
    if (typeof window.__cdResetBodyScrollLock === 'function') {
      window.__cdResetBodyScrollLock();
    }
  } catch (e) {}
  try {
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
  } catch (e) {}
}

function __cdBirthModalDepsMissing() {
  return (
    typeof _ModalProfileState === 'undefined' ||
    typeof _renderSukuyoSection !== 'function' ||
    typeof _renderZiweiSection !== 'function' ||
    typeof _renderAstroSection !== 'function' ||
    typeof window.Solar === 'undefined' ||
    typeof window.Solar.fromYmdHms !== 'function' ||
    typeof window.Lunar === 'undefined' ||
    typeof window.Lunar.fromYmd !== 'function' ||
    typeof window.renderSukuyo !== 'function' ||
    typeof window.renderZiwei !== 'function'
  );
}

function __cdEnsureSukuyoZiweiCoreLoaded() {
  var needsCore = (
    typeof window.Solar === 'undefined' ||
    typeof window.Solar.fromYmdHms !== 'function' ||
    typeof window.Lunar === 'undefined' ||
    typeof window.Lunar.fromYmd !== 'function' ||
    typeof window.renderSukuyo !== 'function' ||
    typeof window.renderZiwei !== 'function' ||
    typeof window.calcSukuyoData !== 'function' ||
    typeof window.calcZiweiPalaces !== 'function'
  );

  if (!needsCore) return Promise.resolve(true);

  var chain = [
    '/js/compat-llm-prompts.js?v=build-c4f38e10dd74',
      '/js/saju-engine.js?v=build-c4f38e10dd74',
      '/js/saju-engine-tarot-sukuyo-quantum.js?v=build-c4f38e10dd74'
  ];

  return __cdEnsureLunarLibReady().then(function() {
    return chain.reduce(function(promise, src) {
      return promise.then(function() { return __cdLoadScriptOnce(src); });
    }, Promise.resolve());
  }).then(function() {
    return true;
  });
}

function __cdEnsureBirthModalDepsLoaded() {
  var tasks = [];
  if (
    typeof _ModalProfileState === 'undefined' ||
    typeof _renderSukuyoSection !== 'function' ||
    typeof _renderZiweiSection !== 'function' ||
    typeof _renderAstroSection !== 'function'
  ) {
    tasks.push(__cdLoadScriptOnce('/js/core/saju/modalProfileState.js?v=build-c4f38e10dd74'));
  }
  tasks.push(__cdEnsureSukuyoZiweiCoreLoaded());
  if (!tasks.length) return Promise.resolve(true);
  return Promise.all(tasks).then(function() { return true; });
}

function openSukuyoModal(_retried) {
  if (!_retried && __cdBirthModalDepsMissing()) {
    __cdEnsureBirthModalDepsLoaded()
      .then(function() { openSukuyoModal(true); })
      .catch(function(err) { console.error('[openSukuyoModal] dependency load failed:', err); });
    return;
  }
  var overlay = document.getElementById('sukuyoModalOverlay');
  if (!overlay) return;
  __cdForceUnlockBodyScroll();
  var s = _dpStorage();
  var profiles = _dpNormalizeProfileListForFeature(s ? s.list() : []);
  var profile = _dpNormalizeProfileForFeature(s ? s.current() : null);
  overlay.style.display = 'flex';
  overlay.style.overflow = 'hidden';
  var sh = document.getElementById('sukuyoModalSheet');
  if (sh) { sh.scrollTop = 0; sh.style.overflowY = 'auto'; }
  var noProfile = document.getElementById('sukuyoNoProfile');
  var card = document.getElementById('sukuyoCard');
  var theme = { icon: '💫', ac: '#c4b5fd', br: '167,139,250', bb: 'linear-gradient(135deg,#1a0e3b,#2d1b6b)', title: '💫 宿曜占 · 숙요점', desc: '숙요점을 보려면 메인 화면에서<br>나의 운명 카드를 먼저 설정해주세요' };
  if (typeof _ModalProfileState === 'undefined' || typeof _ModalProfileState.subscribe !== 'function' || typeof _renderSukuyoSection !== 'function') {
    console.error('[openSukuyoModal] missing modal profile dependencies');
    if (card) card.style.display = 'none';
    if (noProfile) { noProfile.style.display = 'block'; noProfile.innerHTML = _dpEmptyHTML(theme); }
    return;
  }
  _ModalProfileState.subscribe('sukuyo', _renderSukuyoSection);
  if (!profile || !profile.birth) {
    if (card) card.style.display = 'none';
    if (noProfile) { noProfile.style.display = 'block'; noProfile.innerHTML = profiles.length > 0 ? _dpPickerHTML(profiles, 'sukuyo', theme) : _dpEmptyHTML(theme); }
    return;
  }
  _ModalProfileState.dispatch(profile, 'sukuyo');
}
function closeSukuyoModal() {
  var o = document.getElementById('sukuyoModalOverlay'); if (o) o.style.display = 'none';
  _ModalProfileState.unsubscribe('sukuyo');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function navigateToVedic() {
  if (typeof window.openFortuneFromProfile === 'function') {
    try {
      var bridged = window.openFortuneFromProfile('vedic');
      if (bridged) return;
    } catch (_) {}
  }
  function normalizeVedicProfile(profile) {
    if (!profile) return null;
    var parsedBirth = null;
    if (typeof profile.birthDate === 'string') {
      var dparts = profile.birthDate.split(/[-/]/);
      if (dparts.length >= 3) {
        parsedBirth = {
          year: parseInt(dparts[0], 10),
          month: parseInt(dparts[1], 10),
          day: parseInt(dparts[2], 10)
        };
      } else if (dparts.length === 1 && dparts[0].length >= 8) {
        parsedBirth = {
          year: parseInt(dparts[0].slice(0, 4), 10),
          month: parseInt(dparts[0].slice(4, 6), 10),
          day: parseInt(dparts[0].slice(6, 8), 10)
        };
      }
    }
    var b = profile.birth || {
      year: profile.birthYear != null ? profile.birthYear : (parsedBirth && parsedBirth.year),
      month: profile.birthMonth != null ? profile.birthMonth : (parsedBirth && parsedBirth.month),
      day: profile.birthDay != null ? profile.birthDay : (parsedBirth && parsedBirth.day),
      hour: profile.birthHour,
      minute: profile.birthMinute,
      calType: profile.calType
    };
    if (!b || (b.year == null && b.month == null && b.day == null && profile.birthDate == null)) return null;
    if ((b.hour == null || b.hour === '') && profile.birthHour != null && profile.birthHour !== '') b.hour = profile.birthHour;
    if ((b.minute == null || b.minute === '') && profile.birthMinute != null && profile.birthMinute !== '') b.minute = profile.birthMinute;
    if ((b.hour == null || b.hour === '' || b.minute == null || b.minute === '') && typeof profile.birthTime === 'string') {
      var tparts = profile.birthTime.split(':');
      if (tparts.length >= 2) {
        if (b.hour == null || b.hour === '') b.hour = parseInt(tparts[0], 10);
        if (b.minute == null || b.minute === '') b.minute = parseInt(tparts[1], 10);
      }
    }
    var year = parseInt(b.year, 10);
    var month = parseInt(b.month, 10);
    var day = parseInt(b.day, 10);
    if (!isFinite(year) || !isFinite(month) || !isFinite(day)) return null;
    var l = profile.location || {};
    var lat = (typeof l.lat === 'number' && !isNaN(l.lat)) ? l.lat : parseFloat(l.lat);
    var lng = (typeof l.lng === 'number' && !isNaN(l.lng)) ? l.lng : (typeof l.lon === 'number' && !isNaN(l.lon) ? l.lon : (parseFloat(l.lng) || parseFloat(l.lon)));
    var tzHours = (typeof l.baseTzOffset === 'number' && !isNaN(l.baseTzOffset)) ? l.baseTzOffset
      : ((typeof l.tzOffset === 'number' && !isNaN(l.tzOffset)) ? (Math.abs(l.tzOffset) <= 24 ? l.tzOffset : l.tzOffset / 60) : 9);
    return {
      id: profile.id,
      name: profile.name,
      gender: profile.gender,
      birth: {
        year: year,
        month: month,
        day: day,
        hour: b.hour != null ? b.hour : 12,
        minute: b.minute != null ? b.minute : 0,
        calType: b.calType || 'solar'
      },
      location: {
        label: l.label || '대한민국 (서울)',
        tz: l.tz || 'Asia/Seoul',
        lat: (!isNaN(lat) ? lat : 37.5665),
        lng: (!isNaN(lng) ? lng : 126.978),
        tzOffset: tzHours,
        baseTzOffset: tzHours,
        dstMinutes: l.dstMinutes
      }
    };
  }

  function _vedicPad2(value) {
    var n = parseInt(value, 10);
    if (!isFinite(n)) n = 0;
    return String(n).padStart(2, '0');
  }

  function buildVedicBridgePayload(profile) {
    var normalized = normalizeVedicProfile(profile);
    if (!normalized) return null;

    var b = normalized.birth || {};
    var l = normalized.location || {};
    var year = parseInt(b.year, 10);
    var month = parseInt(b.month, 10);
    var day = parseInt(b.day, 10);
    var hour = parseInt(b.hour, 10);
    var minute = parseInt(b.minute, 10);
    if (!isFinite(year)) year = 1990;
    if (!isFinite(month)) month = 1;
    if (!isFinite(day)) day = 1;
    if (!isFinite(hour)) hour = 12;
    if (!isFinite(minute)) minute = 0;

    var lat = parseFloat(l.lat);
    var lng = parseFloat(l.lng);
    if (!isFinite(lng)) lng = parseFloat(l.lon);
    if (!isFinite(lat)) lat = 37.5665;
    if (!isFinite(lng)) lng = 126.978;

    var tzHours = parseFloat(l.baseTzOffset);
    if (!isFinite(tzHours)) {
      tzHours = parseFloat(l.tzOffset);
      if (isFinite(tzHours) && Math.abs(tzHours) > 24) tzHours = tzHours / 60;
    }
    if (!isFinite(tzHours)) tzHours = 9;

    normalized.birthYear = year;
    normalized.birthMonth = month;
    normalized.birthDay = day;
    normalized.birthHour = hour;
    normalized.birthMinute = minute;
    normalized.calType = normalized.birth && normalized.birth.calType ? normalized.birth.calType : 'solar';
    normalized.birthDate = year + '-' + _vedicPad2(month) + '-' + _vedicPad2(day);
    normalized.birthTime = _vedicPad2(hour) + ':' + _vedicPad2(minute);
    normalized.lat = lat;
    normalized.lng = lng;
    normalized.lon = lng;
    normalized.timezone = tzHours;
    normalized.tzOffset = tzHours;
    normalized.baseTzOffset = tzHours;

    return normalized;
  }

  function readMainFormProfileFallback() {
    try {
      var bdEl = document.getElementById('birthDate');
      var bd = bdEl ? String(bdEl.value || '').trim() : '';
      if (!bd) return null;
      var digits = bd.replace(/\D/g, '');
      var parts = digits.length === 8 ? [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)] : bd.split(/[-/.]/);
      if (parts.length < 3) return null;
      var year = parseInt(parts[0], 10);
      var month = parseInt(parts[1], 10);
      var day = parseInt(parts[2], 10);
      if (!isFinite(year) || !isFinite(month) || !isFinite(day)) return null;
      var hourRaw = parseInt((document.getElementById('birthHour') || {}).value, 10);
      var minuteRaw = parseInt((document.getElementById('birthMinute') || {}).value, 10);
      var hour = (isFinite(hourRaw) && hourRaw >= 0 && hourRaw <= 23) ? hourRaw : 12;
      var minute = (isFinite(minuteRaw) && minuteRaw >= 0 && minuteRaw <= 59) ? minuteRaw : 0;
      var gender = 'F';
      var btnM = document.getElementById('btnM');
      var btnF = document.getElementById('btnF');
      if (btnM && btnM.classList.contains('on')) gender = 'M';
      else if (btnF && btnF.classList.contains('on')) gender = 'F';
      var countrySel = document.getElementById('birthCountry');
      var opt = countrySel ? countrySel.options[countrySel.selectedIndex] : null;
      var tz = opt ? countrySel.value : 'Asia/Seoul';
      var lng = opt ? parseFloat(opt.getAttribute('data-long') || '127') : 127.0;
      var lat = opt ? parseFloat(opt.getAttribute('data-lat') || '37.6') : 37.6;
      var tzOff = opt ? parseFloat(opt.getAttribute('data-base-tz') || opt.getAttribute('data-tz') || '9') : 9;
      var locationLabel = opt ? opt.text : '대한민국 (서울)';
      return {
        id: 'vedic_main_form',
        name: '(메인 입력)',
        gender: gender,
        birth: { year: year, month: month, day: day, hour: hour, minute: minute, calType: 'solar' },
        location: { label: locationLabel, tz: tz, lng: lng, lat: lat, tzOffset: tzOff, baseTzOffset: tzOff }
      };
    } catch (_) { return null; }
  }

  var profile = typeof window.dpGetDataForVedic === 'function' ? window.dpGetDataForVedic() : null;
  profile = _dpNormalizeProfileForFeature(profile) || profile;
  profile = normalizeVedicProfile(profile);
  if (!profile) {
    try {
      var storage = window.DestinyProfileManager && window.DestinyProfileManager.storage;
      var currentProfile = window.__cdCurrentDestinyProfile
        || (storage && typeof storage.current === 'function' ? storage.current() : null);
      profile = normalizeVedicProfile(_dpNormalizeProfileForFeature(currentProfile) || currentProfile);
      if (!profile && storage && typeof storage.list === 'function') {
        var arr = storage.list();
        if (Array.isArray(arr)) {
          for (var i = 0; i < arr.length; i++) {
            profile = normalizeVedicProfile(_dpNormalizeProfileForFeature(arr[i]) || arr[i]);
            if (profile) break;
          }
        }
      }
    } catch (e) {}
  }
  if (!profile) {
    var mainFormFallback = readMainFormProfileFallback();
    profile = normalizeVedicProfile(_dpNormalizeProfileForFeature(mainFormFallback) || mainFormFallback);
  }
  if (profile) {
    profile = buildVedicBridgePayload(profile) || profile;
    try {
      sessionStorage.setItem('FORTUNE_APP_VEDIC_PAYLOAD', JSON.stringify(profile));
      localStorage.setItem('FORTUNE_APP_VEDIC_PAYLOAD', JSON.stringify(profile));
      sessionStorage.setItem('FORTUNE_APP_USER_PROFILE', JSON.stringify(profile));
      localStorage.setItem('FORTUNE_APP_USER_PROFILE', JSON.stringify(profile));
      window.FORTUNE_APP_VEDIC_PAYLOAD = profile;
    } catch (e) {}
  }
  var _vedicTarget = '/vedic-astrology.html';
  if (profile) {
    try {
      var _vp = encodeURIComponent(JSON.stringify(profile));
      _vedicTarget += (_vedicTarget.indexOf('?') >= 0 ? '&' : '?') + 'vp=' + _vp;
    } catch (_) {}
  }
  window.location.href = _vedicTarget;
}

function navigateToZiweiChart() {
  // 메인 화면 운명 카드 프로필에서 생년월일 추출
  var profile = null;
  try {
    var storage = window.DestinyProfileManager && window.DestinyProfileManager.storage;
    profile = _dpNormalizeProfileForFeature(window.__cdCurrentDestinyProfile)
      || (storage && typeof storage.current === 'function' ? storage.current() : null);
    profile = _dpNormalizeProfileForFeature(profile) || profile;
    if ((!profile || !profile.birth || profile.birth.year == null) && storage && typeof storage.list === 'function') {
      var arr = storage.list();
      if (Array.isArray(arr)) {
        for (var i = 0; i < arr.length; i++) {
          var row = arr[i] || null;
          row = _dpNormalizeProfileForFeature(row) || row;
          if (row && row.birth && row.birth.year != null) {
            profile = row;
            break;
          }
        }
      }
    }
  } catch (e) {}
  // 운명 카드 프로필이 있으면 /ziwei/chart 입력 폼 자동 세팅 후 이동
  if (profile && profile.birth) {
    try {
      var b = profile.birth;
      var preSession = {
        step: 'form',
        birthYear: String(b.year || ''),
        birthMonth: String(b.month || ''),
        birthDay: String(b.day || ''),
        birthHour: String(b.hour != null ? b.hour : 12),
        unknownHour: false
      };
      localStorage.setItem('premium:ziwei:session:v1', JSON.stringify(preSession));
    } catch (e) {}
  }
  // 자미두수 심화 본체는 /ziwei/chart 다. 기본 자미두수 셸 모달(/index.html?action=openZiweiModal)
  // 로 보내면 심화 카드가 기본 명반 화면으로 잘못 연결된다.
  window.location.href = '/ziwei/chart';
}

function openGeomancyOracle() {
  window.location.href = cdResolveLocalizedFeatureHref('/geomancy-oracle-v4.html', cdGetCurrentLang());
}

function openZiweiModal(_retried) {
  if (!_retried && __cdBirthModalDepsMissing()) {
    __cdEnsureBirthModalDepsLoaded()
      .then(function() { openZiweiModal(true); })
      .catch(function(err) { console.error('[openZiweiModal] dependency load failed:', err); });
    return;
  }
  var overlay = document.getElementById('ziweiModalOverlay');
  if (!overlay) return;
  __cdForceUnlockBodyScroll();
  var s = _dpStorage();
  var profiles = _dpNormalizeProfileListForFeature(s ? s.list() : []);
  var profile = _dpNormalizeProfileForFeature(s ? s.current() : null);
  overlay.style.display = 'flex';
  overlay.style.overflow = 'hidden';
  var sh = document.getElementById('ziweiModalSheet');
  if (sh) { sh.scrollTop = 0; sh.style.overflowY = 'auto'; }
  var noProfile = document.getElementById('ziweiNoProfile');
  var card = document.getElementById('ziweiModalCard');
  var theme = { icon: '🌌', ac: '#e879f9', br: '232,121,249', bb: 'linear-gradient(135deg,#2b0545,#4a0a7a)', title: '🌌 紫微斗數 · 자미두수', desc: '자미두수 명반을 보려면<br>메인 화면에서 나의 운명 카드를 먼저 설정해주세요' };
  if (typeof _ModalProfileState === 'undefined' || typeof _ModalProfileState.subscribe !== 'function' || typeof _renderZiweiSection !== 'function') {
    console.error('[openZiweiModal] missing modal profile dependencies');
    if (card) card.style.display = 'none';
    if (noProfile) { noProfile.style.display = 'block'; noProfile.innerHTML = _dpEmptyHTML(theme); }
    return;
  }
  _ModalProfileState.subscribe('ziwei', _renderZiweiSection);
  if (!profile || !profile.birth) {
    if (card) card.style.display = 'none';
    if (noProfile) { noProfile.style.display = 'block'; noProfile.innerHTML = profiles.length > 0 ? _dpPickerHTML(profiles, 'ziwei', theme) : _dpEmptyHTML(theme); }
    return;
  }
  _ModalProfileState.dispatch(profile, 'ziwei');
}
function closeZiweiModal() {
  var o = document.getElementById('ziweiModalOverlay'); if (o) o.style.display = 'none';
  _ModalProfileState.unsubscribe('ziwei');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openAstroModal(_retried) {
  if (!_retried) {
    Promise.resolve()
      .then(function() {
        return __cdBirthModalDepsMissing() ? __cdEnsureBirthModalDepsLoaded() : true;
      })
      .then(function() {
        return __cdEnsureSwissEphLoaded().catch(function(err) {
          console.warn('[openAstroModal] swisseph lazy load failed:', err);
          throw err;
        });
      })
      .then(function() {
        // 프로필 게이트가 읽는 DestinyProfileManager(destiny-profile.js)는 defer 로드라
        // 탭 시점에 아직 없을 수 있다. 프로필을 읽기 전에 매니저 로드를 보장한다.
        return (typeof __cdEnsureDestinyProfileLoaded === 'function')
          ? __cdEnsureDestinyProfileLoaded().catch(function() { return true; })
          : true;
      })
      .then(function() { openAstroModal(true); })
      .catch(function(err) {
        console.error('[openAstroModal] dependency load failed:', err);
        var overlay = document.getElementById('astroModalOverlay');
        var cardWrap = document.getElementById('astroCardWrap');
        var noProfile = document.getElementById('astroNoProfile');
        if (overlay) overlay.style.display = 'flex';
        if (cardWrap) cardWrap.style.display = 'block';
        if (noProfile) noProfile.style.display = 'none';
        if (typeof window.renderAstroSwissUnavailable === 'function') {
          window.renderAstroSwissUnavailable((err && err.message) || err || 'SwissEph loader failed.');
        }
      });
    return;
  }
  var overlay = document.getElementById('astroModalOverlay');
  if (!overlay) return;
  _cdAstroEnsureCosmos(overlay);
  __cdForceUnlockBodyScroll();
  var s = _dpStorage();
  var profiles = _dpNormalizeProfileListForFeature(s ? s.list() : []);
  var profile = _dpNormalizeProfileForFeature(s ? s.current() : null);
  overlay.style.display = 'flex';
  overlay.style.overflow = 'hidden';
  var sh = document.getElementById('astroModalSheet');
  if (sh) { sh.scrollTop = 0; sh.style.overflowY = 'auto'; }
  var noProfile = document.getElementById('astroNoProfile');
  var cardWrap = document.getElementById('astroCardWrap');
  var theme = { icon: '✨', ac: '#e8d5a3', br: '196,181,253', bb: 'linear-gradient(135deg,#13102a,#0a0818)', title: '✨ 서양 점성술 기본 차트', desc: '서양 점성술 기본 출생차트를 보려면<br>생년월일과 출생 시간·출생지를 먼저 설정해주세요' };
  if (typeof _ModalProfileState === 'undefined' || typeof _ModalProfileState.subscribe !== 'function' || typeof _renderAstroSection !== 'function') {
    console.error('[openAstroModal] missing modal profile dependencies');
    if (cardWrap) cardWrap.style.display = 'none';
    if (noProfile) { noProfile.style.display = 'block'; noProfile.innerHTML = _dpEmptyHTML(theme); }
    return;
  }
  _ModalProfileState.subscribe('astro', _renderAstroSection);
  var rerenderAstroInsight = (typeof window.renderAstroInsight === 'function')
    ? window.renderAstroInsight
    : (typeof renderAstroInsight === 'function' ? renderAstroInsight : null);
  var rerenderAstroFromCurrentBirth = function() {
    if (!rerenderAstroInsight || !(window._astroBirth || window._ziweiBirth)) return false;
    try {
      rerenderAstroInsight();
      return true;
    } catch (err) {
      console.warn('[openAstroModal] astro rerender skipped:', err);
      return false;
    }
  };
  if (!profile || !profile.birth) {
    if (rerenderAstroFromCurrentBirth()) {
      if (cardWrap) cardWrap.style.display = 'block';
      if (noProfile) noProfile.style.display = 'none';
      return;
    }
    // 프로필/명단이 전혀 없으면 defer 로드·비동기 인증 하이드레이션이 탭보다 늦게
    // 끝난 레이스일 수 있으므로, 즉시 "미설정"으로 확정하지 않고 하이드레이션을 기다린다.
    // 서버 응답 전일 때만 대기한다 — 응답이 확정됐는데도 목록이 비었으면 진짜 미설정이므로 즉시 표시.
    if (profiles.length === 0 && !window.__cdDestinyProfileServerReady && _cdAstroWaitForProfileHydration(overlay, theme)) return;
    if (cardWrap) cardWrap.style.display = 'none';
    if (noProfile) { noProfile.style.display = 'block'; noProfile.innerHTML = profiles.length > 0 ? _dpPickerHTML(profiles, 'astro', theme) : _dpEmptyHTML(theme); }
    return;
  }
  _ModalProfileState.dispatch(profile, 'astro');
  rerenderAstroFromCurrentBirth();
}
function _cdAstroEnsureCosmos(overlay) {
  // 서양 점성술 모달에 우주 배경(별밭·성운·별의 비) 장식 레이어를 1회 주입한다.
  // 순수 장식이므로 aria-hidden, pointer-events:none. 스타일은 styles/fortune-ui.css의 .astro-cosmos* 규칙.
  if (!overlay || overlay.querySelector('.astro-cosmos')) return;
  var layer = document.createElement('div');
  layer.className = 'astro-cosmos';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML =
    '<div class="astro-cosmos__nebula"></div>' +
    '<div class="astro-cosmos__stars"></div>' +
    '<i class="astro-meteor astro-meteor-1"></i>' +
    '<i class="astro-meteor astro-meteor-2"></i>' +
    '<i class="astro-meteor astro-meteor-3"></i>' +
    '<i class="astro-meteor astro-meteor-4"></i>' +
    '<i class="astro-meteor astro-meteor-5"></i>';
  overlay.insertBefore(layer, overlay.firstChild);
}
function _cdAstroCleanupHydrationWait(overlay) {
  if (!overlay || !overlay.__cdAstroHydrateWait) return;
  var w = overlay.__cdAstroHydrateWait;
  try { if (w.timer) clearTimeout(w.timer); } catch (_) {}
  try { window.removeEventListener('cd:destiny-profile-server-ready', w.onReady); } catch (_) {}
  try { document.removeEventListener('destinyProfileChanged', w.onReady); } catch (_) {}
  overlay.__cdAstroHydrateWait = null;
}
function _cdAstroWaitForProfileHydration(overlay, theme) {
  if (!overlay || overlay.__cdAstroHydrateWaited) return false;
  overlay.__cdAstroHydrateWaited = true;
  var noProfile = document.getElementById('astroNoProfile');
  var cardWrap = document.getElementById('astroCardWrap');
  if (cardWrap) cardWrap.style.display = 'none';
  if (noProfile) {
    noProfile.style.display = 'block';
    noProfile.innerHTML = '<div role="status" aria-live="polite" style="padding:48px 24px;text-align:center;color:' + theme.ac + ';">'
      + '<div style="font-size:32px;margin-bottom:12px;" aria-hidden="true">' + theme.icon + '</div>'
      + '<div style="font-size:15px;opacity:.85;">프로필을 불러오는 중이에요…</div></div>';
  }
  // 고정 3500ms 1회 대기 대신, 프로필 도착/서버 응답 확정까지 클라 폴링(fetch 없음, 하드캡 12s).
  // 서버 응답(__cdDestinyProfileServerReady)이 뜨는 시점엔 프로필이 이미 저장돼 있으므로(destiny-profile.js
  // _dpSetProfileState→_dpNotifyProfileServerReady 순서), 그때 재렌더하면 카드가 정상 인식된다.
  var settled = false;
  var startedAt = Date.now();
  var HARD_CAP_MS = 12000;
  var finish = function() {
    if (settled) return;
    settled = true;
    _cdAstroCleanupHydrationWait(overlay);
    openAstroModal(true);
  };
  var poll = function() {
    if (settled || !overlay.__cdAstroHydrateWait) return;
    var s = _dpStorage();
    var prof = s ? _dpNormalizeProfileForFeature(s.current()) : null;
    var list = _dpNormalizeProfileListForFeature(s ? s.list() : []);
    if ((prof && prof.birth) || list.length > 0) { finish(); return; }
    if (window.__cdDestinyProfileServerReady === true) { finish(); return; }
    if (Date.now() - startedAt > HARD_CAP_MS) { finish(); return; }
    overlay.__cdAstroHydrateWait.timer = setTimeout(poll, 250);
  };
  var onSignal = function() {
    if (settled || !overlay.__cdAstroHydrateWait) return;
    try { clearTimeout(overlay.__cdAstroHydrateWait.timer); } catch (_) {}
    overlay.__cdAstroHydrateWait.timer = setTimeout(poll, 30);
  };
  overlay.__cdAstroHydrateWait = { onReady: onSignal, timer: setTimeout(poll, 200) };
  try { window.addEventListener('cd:destiny-profile-server-ready', onSignal); } catch (_) {}
  try { document.addEventListener('destinyProfileChanged', onSignal); } catch (_) {}
  return true;
}
function closeAstroModal() {
  var o = document.getElementById('astroModalOverlay');
  if (o) { o.style.display = 'none'; _cdAstroCleanupHydrationWait(o); o.__cdAstroHydrateWaited = false; }
  _ModalProfileState.unsubscribe('astro');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.openAstroModal = openAstroModal;
window.closeAstroModal = closeAstroModal;

function closeCurrentPage() {
  var overlayMap = [
    { id: 'tarotLoveOverlay', closeFn: 'closeTarotLoveModal' },
    { id: 'tarotHealingOverlay', closeFn: 'closeTarotHealingModal' },
    { id: 'tarotReunionOverlay', closeFn: 'closeTarotReunionModal' },
    { id: 'tarotSelfEsteemOverlay', closeFn: 'closeTarotSelfEsteemModal' },
    { id: 'tarotYearFortuneOverlay', closeFn: 'closeTarotYearFortuneModal' },
    { id: 'animalTotemOverlay', closeFn: 'closeAnimalTotemModal' },
    { id: 'dreamModalOverlay', closeFn: 'closeDreamModal' },
    { id: 'psychoDreamModalOverlay', closeFn: 'closePsychoDreamModal' },
    { id: 'kemetOracleOverlay', closeFn: 'closeKemetModal' },
    { id: 'destinyFlowerStudioOverlay', closeFn: 'closeDestinyFlowerStudio' },
    { id: 'juyukModalOverlay', closeFn: 'closeJuyukModal' },
    { id: 'sukuyoModalOverlay', closeFn: 'closeSukuyoModal' },
    { id: 'olympusOracleOverlay', closeFn: 'closeOlympusOracleModal' },
    { id: 'astroModalOverlay', closeFn: 'closeAstroModal' },
    { id: 'ziweiModalOverlay', closeFn: 'closeZiweiModal' }
  ];

  for (var i = 0; i < overlayMap.length; i++) {
    var item = overlayMap[i];
    var overlay = document.getElementById(item.id);
    if (!overlay) continue;
    var computed = window.getComputedStyle ? window.getComputedStyle(overlay) : null;
    var isHidden = overlay.style.display === 'none' || (computed && computed.display === 'none');
    if (isHidden) continue;

    if (typeof window[item.closeFn] === 'function') {
      window[item.closeFn]();
    } else {
      overlay.style.display = 'none';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    return;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.closeCurrentPage = closeCurrentPage;

var _animalTotemPool = [
  { category: '기본', name: '고양이', icon: '🐱', keyword: '독립심과 직관', advice: '당신만의 페이스로 걸어가도 괜찮아요. 야옹!' },
  { category: '기본', name: '다람쥐', icon: '🐿️', keyword: '준비와 활기', advice: '작은 노력이 큰 결실이 될 거예요. 도토리를 모으듯 차근차근!' },
  { category: '기본', name: '파랑새', icon: '🐦', keyword: '희망과 소식', advice: '행운은 멀리 있지 않아요. 바로 당신의 어깨 위에 있죠.' },
  { category: '기본', name: '강아지', icon: '🐶', keyword: '충성심과 사랑', advice: '당신은 혼자가 아니에요. 곁에 있는 소중한 인연을 믿으세요.' },
  { category: '기본', name: '토끼', icon: '🐰', keyword: '도약과 풍요', advice: '겁내지 말고 폴짝 뛰어보세요. 새로운 세상이 기다려요!' },
  { category: '지상', name: '늑대', icon: '🐺', keyword: '직관, 자유', advice: '자신의 본능을 믿으세요. 공동체와 함께하되 개성을 잃지 마세요.' },
  { category: '지상', name: '곰', icon: '🐻', keyword: '성찰, 치유', advice: '지금은 내면으로 들어갈 시간입니다. 휴식을 통해 힘을 회복하세요.' },
  { category: '지상', name: '사슴', icon: '🦌', keyword: '부드러움, 민감', advice: '강함보다 부드러움이 필요한 때입니다. 주변의 변화를 예민하게 살피세요.' },
  { category: '지상', name: '호랑이', icon: '🐯', keyword: '용기, 의지력', advice: '당신은 충분한 힘을 가졌습니다. 목표를 향해 집중하고 돌진하세요.' },
  { category: '공중', name: '올빼미', icon: '🦉', keyword: '지혜, 통찰', advice: '겉모습 너머의 진실을 보세요. 밤의 어둠 속에서도 길을 찾을 수 있습니다.' },
  { category: '공중', name: '독수리', icon: '🦅', keyword: '고결, 시야', advice: '사소한 문제에서 벗어나 더 넓은 시야로 인생의 큰 그림을 그리세요.' },
  { category: '공중', name: '나비', icon: '🦋', keyword: '변화, 가벼움', advice: '변화는 아름다운 것입니다. 과거의 허물을 벗고 새로운 모습으로 날아오르세요.' },
  { category: '공중', name: '까마귀', icon: '🐦‍⬛', keyword: '마법, 창조', advice: '우연한 일들에 주목하세요. 지금 당신 주변에는 변화의 마법이 일어나고 있습니다.' },
  { category: '물/기타', name: '돌고래', icon: '🐬', keyword: '조화, 유희', advice: '삶을 너무 심각하게 생각하지 마세요. 호흡하고, 즐기고, 소통하세요.' },
  { category: '물/기타', name: '거북이', icon: '🐢', keyword: '인내, 보호', advice: '천천히 가도 괜찮습니다. 자신의 속도를 유지하며 꾸준히 나아가세요.' },
  { category: '물/기타', name: '뱀', icon: '🐍', keyword: '재생, 생명력', advice: '낡은 감정을 벗어던질 때입니다. 생명 에너지를 회복하고 다시 태어나세요.' },
  { category: '물/기타', name: '여우', icon: '🦊', keyword: '기지, 적응', advice: '상황에 맞춰 유연하게 대처하세요. 지혜로운 관찰이 문제를 해결해 줄 것입니다.' }
];
var _animalTotemDeck = [];
var _animalTotemMeditationTimer = null;
var _animalTotemMeditationRunning = false;
var _animalTotemReadLocked = false;
var _animalTotemSelected = null;
var _animalTotemCategoryWeights = {
  '기본': 0.2,
  '지상': 0.33,
  '공중': 0.27,
  '물/기타': 0.2
};

function _pickAnimalTotemDeck(size) {
  var grouped = {};
  _animalTotemPool.forEach(function(item) {
    var cat = item.category || '기본';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  Object.keys(grouped).forEach(function(cat) {
    var list = grouped[cat];
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
  });

  var picked = [];
  var guard = 0;
  while (picked.length < size && guard < 120) {
    guard += 1;
    var candidates = [];
    var total = 0;
    Object.keys(grouped).forEach(function(cat) {
      if (!grouped[cat] || grouped[cat].length === 0) return;
      var w = _animalTotemCategoryWeights[cat];
      var weight = typeof w === 'number' && w > 0 ? w : 0.1;
      candidates.push({ cat: cat, weight: weight });
      total += weight;
    });
    if (!candidates.length) break;
    var r = Math.random() * total;
    var selectedCat = candidates[0].cat;
    var acc = 0;
    for (var c = 0; c < candidates.length; c++) {
      acc += candidates[c].weight;
      if (r <= acc) {
        selectedCat = candidates[c].cat;
        break;
      }
    }
    var card = grouped[selectedCat].pop();
    if (card) picked.push(card);
  }
  return picked;
}

function _clearAnimalTotemTimer() {
  if (_animalTotemMeditationTimer) {
    clearInterval(_animalTotemMeditationTimer);
    _animalTotemMeditationTimer = null;
  }
  _animalTotemMeditationRunning = false;
}

function _renderAnimalTotemDeck() {
  _animalTotemDeck = _pickAnimalTotemDeck(5);
  for (var i = 0; i < 5; i++) {
    var iconEl = document.querySelector('[data-animal-totem-icon="' + i + '"]');
    var nameEl = document.querySelector('[data-animal-totem-name="' + i + '"]');
    var item = _animalTotemDeck[i] || _animalTotemPool[i];
    if (iconEl) iconEl.textContent = item.icon;
    if (nameEl) nameEl.textContent = item.name;
  }
}

function _setAnimalTotemMeditationStatus(text) {
  var statusEl = document.getElementById('animalTotemMeditationStatus');
  if (statusEl) statusEl.textContent = text;
}

function resetAnimalTotemFlow() {
  _clearAnimalTotemTimer();
  _animalTotemReadLocked = false;
  _animalTotemSelected = null;
  var meditationStage = document.getElementById('animalTotemMeditationStage');
  var drawStage = document.getElementById('animalTotemDrawStage');
  var result = document.getElementById('animalTotemResult');
  var btn = document.getElementById('animalTotemMeditationBtn');
  if (meditationStage) meditationStage.style.display = 'block';
  if (drawStage) drawStage.style.display = 'none';
  if (result) result.style.display = 'none';
  if (btn) {
    btn.disabled = false;
    btn.textContent = '🧘 10초 명상 시작하기';
  }
  _setAnimalTotemMeditationStatus('아직 명상을 시작하지 않았어요.');
  document.querySelectorAll('.animal-totem-card').forEach(function(card) {
    card.classList.remove('is-flipped');
    card.classList.remove('is-muted');
    card.disabled = false;
  });
  _renderAnimalTotemDeck();
}
window.resetAnimalTotemFlow = resetAnimalTotemFlow;

function startAnimalTotemMeditation() {
  if (_animalTotemMeditationRunning) return;
  var btn = document.getElementById('animalTotemMeditationBtn');
  var drawStage = document.getElementById('animalTotemDrawStage');
  var meditationStage = document.getElementById('animalTotemMeditationStage');
  if (!btn || !drawStage || !meditationStage) return;

  _animalTotemMeditationRunning = true;
  btn.disabled = true;
  var remain = 10;
  _setAnimalTotemMeditationStatus('명상 진행 중... ' + remain + '초');
  btn.textContent = '호흡 유지 중...';

  _animalTotemMeditationTimer = setInterval(function() {
    remain -= 1;
    if (remain > 0) {
      _setAnimalTotemMeditationStatus('명상 진행 중... ' + remain + '초');
      return;
    }
    _clearAnimalTotemTimer();
    _setAnimalTotemMeditationStatus('명상 완료! 이제 타로 카드를 선택해 주세요.');
    meditationStage.style.display = 'none';
    drawStage.style.display = 'block';
  }, 1000);
}
window.startAnimalTotemMeditation = startAnimalTotemMeditation;

function drawAnimalTotemCard(btn, idxRaw) {
  var idx = parseInt(idxRaw, 10);
  if (_animalTotemReadLocked || Number.isNaN(idx)) return;
  var drawStage = document.getElementById('animalTotemDrawStage');
  var result = document.getElementById('animalTotemResult');
  if (!drawStage || drawStage.style.display === 'none' || !result) return;

  var picked = _animalTotemDeck[idx];
  if (!picked) return;
  _animalTotemReadLocked = true;
  _animalTotemSelected = picked;
  if (btn) btn.classList.add('is-flipped');

  document.querySelectorAll('.animal-totem-card').forEach(function(card) {
    if (card !== btn) {
      card.classList.add('is-muted');
      card.disabled = true;
    }
  });

  setTimeout(function() {
    var nameEl = document.getElementById('animalTotemName');
    var keywordEl = document.getElementById('animalTotemKeyword');
    var adviceEl = document.getElementById('animalTotemAdvice');
    if (nameEl) nameEl.textContent = picked.icon + ' ' + picked.name;
    if (keywordEl) keywordEl.textContent = (picked.category || '토템') + ' · ' + picked.keyword;
    if (adviceEl) adviceEl.textContent = '“' + picked.advice + '”';
    result.style.display = 'block';
  }, 450);
}
window.drawAnimalTotemCard = drawAnimalTotemCard;

function shareAnimalTotemResult() {
  if (!_animalTotemSelected) return;
  var picked = _animalTotemSelected;
  var text =
    '🧸 오늘의 애니멀 토템\n\n' +
    picked.icon + ' ' + picked.name + '\n' +
    '분류: ' + (picked.category || '토템') + '\n' +
    '키워드: ' + picked.keyword + '\n' +
    '메시지: "' + picked.advice + '"\n\n' +
    'https://code-destiny.com';

  if (navigator.share) {
    navigator.share({
      title: _indexRuntimeText("indexRuntime.title.001"),
      text: text
    }).catch(function() {});
    return;
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(function() { alert('토템 결과 문구를 복사했어요!'); })
      .catch(function() { alert(text); });
    return;
  }

  alert(text);
}
window.shareAnimalTotemResult = shareAnimalTotemResult;

function openAnimalTotemModal() {
  var currentOpenFn = openAnimalTotemModal;
  var hasFullTotemFlow =
    typeof window.startAnimalTotemRitual === 'function' &&
    typeof window.drawAnimalTotemSpread === 'function';

  if (!hasFullTotemFlow && typeof __cdLoadScriptOnce === 'function') {
    __cdLoadScriptOnce('/js/services/animal-totem-content-engine.js?v=build-c4f38e10dd74')
      .then(function() { return __cdLoadScriptOnce('/js/animal-totem-experience.js?v=build-c4f38e10dd74'); })
      .then(function() {
        var upgradedOpen = window.openAnimalTotemModal;
        if (typeof upgradedOpen === 'function' && upgradedOpen !== currentOpenFn) {
          upgradedOpen();
          return;
        }
        var overlay = document.getElementById('animalTotemOverlay');
        if (!overlay) return;
        overlay.style.display = 'block';
        if (overlay.classList) overlay.classList.add('is-open');
        resetAnimalTotemFlow();
        if (window._perf && window._perf.lockBody) window._perf.lockBody();
        else document.body.style.overflow = 'hidden';
      })
      .catch(function(err) {
        console.error('[animal-totem] lazy load failed in inline runtime:', err);
      });
    return;
  }

  var overlay = document.getElementById('animalTotemOverlay');
  if (!overlay) return;
  overlay.style.display = 'block';
  if (overlay.classList) overlay.classList.add('is-open');
  resetAnimalTotemFlow();
  if (window._perf && window._perf.lockBody) window._perf.lockBody();
  else document.body.style.overflow = 'hidden';
}
window.openAnimalTotemModal = openAnimalTotemModal;

function closeAnimalTotemModal() {
  var overlay = document.getElementById('animalTotemOverlay');
  if (!overlay) return;
  overlay.style.display = 'none';
  if (overlay.classList) overlay.classList.remove('is-open');
  _clearAnimalTotemTimer();
  if (window._perf && window._perf.unlockBody) window._perf.unlockBody();
  else document.body.style.overflow = '';
}
window.closeAnimalTotemModal = closeAnimalTotemModal;

function _resetTarotUI() {
  if (typeof window.invalidateTarotFlow === 'function') window.invalidateTarotFlow();
  var tarotResultEl = document.getElementById('tarotResultContainer');
  if (tarotResultEl) tarotResultEl.classList.add('is-empty');
  var cardEl = document.getElementById('tarotCardEl');
  if (cardEl) cardEl.classList.remove('flipped');
  var ritualMsgEl = document.getElementById('tarotRitualMsg');
  if (ritualMsgEl) ritualMsgEl.innerText = '"고민의 문을 하나 선택하면 카드의 결을 펼칩니다."';
  document.querySelectorAll('.oracle-cat-btn-m').forEach(function(btn) { btn.classList.remove('active'); });
  document.querySelectorAll('.tarot-spread-card').forEach(function(el) { el.classList.remove('flipped'); });
  var finalBtn = document.getElementById('tarotFinalBtn');
  if (finalBtn) finalBtn.disabled = true;
  window.curTarotCat = null;
  window.isReading = false;
  if (window.tarotThreeCardState) window.tarotThreeCardState = { cards: [], revealedIndex: -1 };
}
function resetTarotForCategorySelection() {
  var overlay = document.getElementById('tarotModalOverlay');
  if (!overlay || overlay.style.display === 'none') return;
  _resetTarotUI();
  if (typeof window.setTarotMode === 'function') window.setTarotMode(window.tarotSpreadMode || 'one');
}
window.resetTarotForCategorySelection = resetTarotForCategorySelection;
function openTarotModal() {
  var overlay = document.getElementById('tarotModalOverlay');
  if (!overlay) return;
  var didShow = false;
  var showOverlay = function() {
    if (didShow) return;
    didShow = true;
    overlay.style.display = 'block';
    if (typeof window.setTarotMode === 'function') window.setTarotMode(window.tarotSpreadMode || 'one');
    if (window._perf && window._perf.lockBody) window._perf.lockBody();
    else document.body.style.overflow = 'hidden';
    var w = window.innerWidth || document.documentElement.clientWidth;
    var req = overlay.requestFullscreen || overlay.webkitRequestFullscreen || overlay.mozRequestFullScreen || overlay.msRequestFullscreen;
    if (req && w > 768) {
      req.call(overlay).catch(function() {});
    }
  };

  // 타로 엔진이 늦게 로드되면 카테고리/카드 클릭이 무반응이 될 수 있어 모달 오픈 전에 보장한다.
  if (typeof __cdEnsureSajuCoreLoaded === 'function') {
    __cdEnsureSajuCoreLoaded()
      .then(function() {
        if (overlay.style.display !== 'none' && typeof window.setTarotMode === 'function') {
          window.setTarotMode(window.tarotSpreadMode || 'one');
        }
      })
      .catch(function(err) {
        console.error('[tarot] core preload failed:', err);
      });
  }

  showOverlay();
}
function closeTarotModal() {
  var isFs = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
  if (isFs) {
    var exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
    if (exit) exit.call(document);
  } else {
    var overlay = document.getElementById('tarotModalOverlay');
    if (overlay) overlay.style.display = 'none';
    if (window._perf && window._perf.unlockBody) window._perf.unlockBody();
    else document.body.style.overflow = '';
    _resetTarotUI();
  }
}
// Ensure uiBindings `data-action` routing can always find these handlers on `window`.
window.openTarotModal = openTarotModal;
window.closeTarotModal = closeTarotModal;

/* ═══════════════════════════════════════════════════════════════
   세 타로 메인 화면 클릭 시 유료 처리 핸들러
   이직 운명의 카드 · 속마음 알아보기 · 원석 소울 타로
═══════════════════════════════════════════════════════════════ */
function startIjikTarot() {
  if (!__cdHasAuthToken()) {
    if (window.confirm(_indexRuntimeText("indexRuntime.confirm.005"))) {
      window.location.href = '/login?next=%2Ftarot-ijik.html';
    }
    return;
  }
  window.location.href = '/tarot-ijik.html';
}
function startMindScanTarot() {
  if (!__cdHasAuthToken()) {
    if (window.confirm(_indexRuntimeText("indexRuntime.confirm.006"))) {
      window.location.href = '/login?next=%2Ftarot%2Fmindscan%2F';
    }
    return;
  }
  window.location.href = '/tarot/mindscan/';
}
function startCrystalSoulTarot() {
  if (!__cdHasAuthToken()) {
    if (window.confirm(_indexRuntimeText("indexRuntime.confirm.007"))) {
      window.location.href = '/login?next=%2Ftarot%2Fcrystal-soul%2F';
    }
    return;
  }
  window.location.href = '/tarot/crystal-soul/';
}
window.startIjikTarot = startIjikTarot;
window.startMindScanTarot = startMindScanTarot;
window.startCrystalSoulTarot = startCrystalSoulTarot;

function openSajuLifeBookBuilder() {
  window.location.assign('/life-book-ai');
}

window.openSajuLifeBookBuilder = openSajuLifeBookBuilder;

(function() {
  function onFsChange() {
    // 명리 타로 3카드 결제는 결제창을 띄우려 의도적으로 풀스크린을 종료한다. 이때는 사용자가 모달을 닫은
    // 것이 아니므로 타로 화면을 닫지 않는다(결제 후 _myeongriTarotRestoreFullscreen이 복원). 실제 닫기는
    // 플래그가 false라 아래 로직이 그대로 동작한다.
    if (window.__cdMyeongriTarotPaymentInFlight) return;
    var isFs = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
    if (!isFs) {
      var overlay = document.getElementById('tarotModalOverlay');
      if (overlay && overlay.style.display !== 'none') {
        overlay.style.display = 'none';
        if (window._perf && window._perf.unlockBody) window._perf.unlockBody();
        else document.body.style.overflow = '';
        _resetTarotUI();
      }
    }
  }
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);
  document.addEventListener('mozfullscreenchange', onFsChange);
  document.addEventListener('MSFullscreenChange', onFsChange);
})();

function switchMysticTab(tabId, btnTarget) {
  if (typeof closeJuyukModal === 'function') closeJuyukModal();
  var container = btnTarget.closest('.mystic-tabs-wrapper');
  container.querySelectorAll('.mystic-tab-content').forEach(function(el) { el.classList.remove('active'); });
  container.querySelectorAll('.mystic-tab-btn').forEach(function(el) { el.classList.remove('active'); });

  document.getElementById(tabId).classList.add('active');
  btnTarget.classList.add('active');
}

function updateCompatUI() {
  var t = document.getElementById('compatType');
  var desc = document.getElementById('compatTypeDesc');
  var btn = document.getElementById('compatRunBtn');
  if (!t || !desc || !btn) return;
  var v = t.value || 'love';
  if (v === 'love') {
    desc.textContent = '연애/결혼: 감정, 온기, 일지·십성 간의 조화가 중심에 머뭅니다.';
    btn.innerHTML = '💗 연애 궁합 분석하기';
  } else if (v === 'business') {
    desc.textContent = '사업/동업: 역할·책임·용신·상극을 중심으로 실무적·재무적 적합성을 평가합니다.';
    btn.innerHTML = '💼 사업 궁합 분석하기';
  } else {
    desc.textContent = '친구/동료: 우정·협업·에너지 호흡을 중심으로 편안함과 시너지 포인트를 안내합니다.';
    btn.innerHTML = '🤝 우정/동료 궁합 분석하기';
  }
}
var compatTypeEl = document.getElementById('compatType');
if (compatTypeEl) compatTypeEl.addEventListener('change', updateCompatUI);
if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(updateCompatUI, 50);

window.googleTranslateElementInit = window.googleTranslateElementInit || function googleTranslateElementInit() {
  if (!window.google || !google.translate || !google.translate.TranslateElement) return;
  if (window.__cdGoogleTranslateInited) return;
  window.__cdGoogleTranslateInited = true;
  new google.translate.TranslateElement({
    pageLanguage: 'ko',
    includedLanguages: 'ko,en,ja,zh-CN,zh-TW,vi,fr,es,hi,de,nl,ms',
    autoDisplay: false
  }, 'google_translate_element');
  cdSetLangUiLoading(false);
};

/* 기능(로더/모달/오버레이) 동작 중에는 언어 버튼 자동 숨김, 종료 시 다시 표시 */
var _langWrapFeatureOverlayIds = [
  'sajuLoaderOverlay', 'privacy-modal-overlay', 'destinyFlowerStudioOverlay',
  'tarotModalOverlay', 'tarotFocusOverlay', 'tarotSelfEsteemOverlay',
  'tarotLoveOverlay', 'tarotHealingOverlay', 'tarotReunionOverlay', 'tarotYearFortuneOverlay',
  'animalTotemOverlay', 'dreamModalOverlay', 'dreamLoader', 'psychoDreamModalOverlay',
  'juyukModalOverlay', 'sukuyoModalOverlay', 'astroModalOverlay', 'ziweiModalOverlay',
  'dpSwitchConfirmOverlay', 'dpListOverlay', 'kemetOracleOverlay', 'kemetLoader',
  'astralModal'
];

var _langLabelMap = { 'ko': 'KR', 'en': 'ENG', 'ja': 'JPN', 'zh-CN': 'CHN', 'hi': 'HIN', 'es': 'ESP', 'fr': 'FRA', 'de': 'DEU', 'nl': 'NLD', 'ms': 'MYS' };
var __cdLangUiApplying = false;

function cdGetLangLabel(code) {
  return _langLabelMap[code] || String(code || 'KR').toUpperCase();
}

function cdNormalizeTranslateLang(code) {
  var next = String(code || '').trim();
  if (next === 'zh' || next === 'zh-cn' || next === 'zh_CN') return 'zh-CN';
  return Object.prototype.hasOwnProperty.call(_langLabelMap, next) ? next : 'ko';
}

function cdReadUrlTranslateLang() {
  try {
    var params = new URLSearchParams(window.location.search || '');
    var lang = params.get('lang');
    return lang ? cdNormalizeTranslateLang(lang) : '';
  } catch (_) {}
  return '';
}

function cdReadExplicitTranslateLang() {
  try {
    if (localStorage.getItem('cd_lang_explicit') !== '1') return '';
    var stored = localStorage.getItem('cd_lang');
    return stored ? cdNormalizeTranslateLang(stored) : '';
  } catch (_) {}
  return '';
}

function cdGetExplicitTranslateIntentLang() {
  var urlLang = cdReadUrlTranslateLang();
  if (urlLang && urlLang !== 'ko') return urlLang;
  var storedLang = cdReadExplicitTranslateLang();
  if (storedLang && storedLang !== 'ko') return storedLang;
  return '';
}

function cdClearGoogleTranslateCookies() {
  var host = window.location.hostname;
  document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax;';
  if (host) {
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=' + host + '; path=/; SameSite=Lax;';
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=.' + host + '; path=/; SameSite=Lax;';
  }
}

function cdClearImplicitTranslateState() {
  try {
    if (localStorage.getItem('cd_lang_explicit') === '1') return;
    localStorage.removeItem('cd_lang');
  } catch (_) {}
  cdClearGoogleTranslateCookies();
}

function cdMarkExplicitLanguageChoice(langCode) {
  try {
    localStorage.setItem('cd_lang_explicit', '1');
    if (langCode) localStorage.setItem('cd_lang', cdNormalizeTranslateLang(langCode));
  } catch (_) {}
}

cdClearImplicitTranslateState();

if (!window.__cdExplicitLangChoiceBound) {
  window.__cdExplicitLangChoiceBound = true;
  document.addEventListener('click', function(event) {
    var target = event && event.target;
    if (!target || !target.closest) return;
    var btn = target.closest('.lang-btn[data-lang]');
    if (!btn) return;
    cdMarkExplicitLanguageChoice(btn.getAttribute('data-lang'));
  }, true);
}

function cdGetCurrentLangFromCookie() {
  var googCookie = document.cookie.match(/(^|;\\s*)googtrans=([^;]*)/);
  if (googCookie && googCookie[2]) {
    var parsed = googCookie[2].split('/').pop();
    if (parsed) return parsed;
  }
  return 'ko';
}

function cdRefreshLangLabel() {
  var label = document.getElementById('langLabel');
  if (!label) return;
  label.textContent = cdGetLangLabel(cdGetCurrentLangFromCookie());
}

function cdSetLangUiLoading(isLoading, message) {
  var wrap = document.getElementById('langWrap');
  var trigger = document.getElementById('langTrigger');
  var label = document.getElementById('langLabel');
  if (wrap) {
    if (isLoading) wrap.classList.add('is-loading');
    else wrap.classList.remove('is-loading');
  }
  if (trigger) trigger.setAttribute('aria-busy', isLoading ? 'true' : 'false');
  if (label && isLoading) {
    label.textContent = message || '언어 엔진 로딩 중...';
    return;
  }
  if (!isLoading) {
    cdRefreshLangLabel();
  }
}

function cdIsGoogleTranslateReady() {
  if (window.google && window.google.translate && window.google.translate.TranslateElement) return true;
  var selectField = document.querySelector('#google_translate_element .goog-te-combo');
  return !!selectField;
}

// 언어 선택(구글 번역 서비스 사용) 후 일정 시간 뒤 위젯 자동 숨김
var __cdLangWrapHideTimer = null;
var __cdLangWrapHideDelayMs = 20000;

function __cdCancelLangWrapHide() {
  if (__cdLangWrapHideTimer) clearTimeout(__cdLangWrapHideTimer);
  __cdLangWrapHideTimer = null;
  var wrap = document.getElementById('langWrap');
  if (wrap) wrap.classList.remove('lang-wrap--hidden');
}

function __cdScheduleLangWrapHide() {
  if (__cdLangWrapHideTimer) clearTimeout(__cdLangWrapHideTimer);
  var wrap = document.getElementById('langWrap');
  if (!wrap) return;
  wrap.classList.remove('lang-wrap--hidden');
  var trigger = document.getElementById('langTrigger');
  if (trigger) trigger.setAttribute('aria-expanded', 'false');
  __cdLangWrapHideTimer = setTimeout(function() {
    var currentWrap = document.getElementById('langWrap');
    if (!currentWrap) return;
    currentWrap.classList.remove('open');
    currentWrap.classList.add('lang-wrap--hidden');
    var currentTrigger = document.getElementById('langTrigger');
    if (currentTrigger) currentTrigger.setAttribute('aria-expanded', 'false');
    __cdLangWrapHideTimer = null;
  }, __cdLangWrapHideDelayMs);
}

function cdGetContentTranslateTargets() {
  return Array.prototype.slice.call(document.querySelectorAll('[data-cd-translate="content"]'));
}

function cdAllowGoogleTranslateForContent() {
  var nodes = cdGetContentTranslateTargets();
  nodes.forEach(function(el) {
    if (!el) return;
    el.classList.remove('notranslate');
    try { el.removeAttribute('data-cd-translate'); } catch (_) {}
  });
}

function cdResetGoogleTranslateToKorean() {
  var host = window.location.hostname;
  var expires = 'expires=Fri, 31 Dec 9999 23:59:59 GMT';
  var cookieValue = '/ko/ko';
  try {
    document.cookie = 'googtrans=' + cookieValue + '; ' + expires + '; path=/; SameSite=Lax';
    if (host) {
      document.cookie = 'googtrans=' + cookieValue + '; ' + expires + '; domain=' + host + '; path=/; SameSite=Lax';
      document.cookie = 'googtrans=' + cookieValue + '; ' + expires + '; domain=.' + host + '; path=/; SameSite=Lax';
    }
  } catch (_) {}

  try {
    var selectField = document.querySelector('#google_translate_element .goog-te-combo');
    if (selectField) {
      selectField.value = 'ko';
      selectField.dispatchEvent(new Event('change', { bubbles: true }));
      cdDispatchNativeChangeEvent(selectField);
    }
  } catch (_) {}
}

function cdFinalizeKoreanLanguageSwitch(prevLangCode) {
  if (!prevLangCode || prevLangCode === 'ko') return;
  cdForceHideGoogleTranslateBanner();
  setTimeout(cdForceHideGoogleTranslateBanner, 120);
  setTimeout(cdForceHideGoogleTranslateBanner, 480);
}

function changeLanguage(langCode, btn) {
  // cd-lang-native.js 가 로드되면 해당 함수가 window.changeLanguage 를 덮어씀.
  // 이 기본 구현은 native 모드 파일 로드 전 또는 폴백으로만 실행됨.
  if (window.__cdNativeLangBound) {
    return;
  }
  if (__cdLangUiApplying) return;
  __cdLangUiApplying = true;
  var prevLangCode = cdGetCurrentLangFromCookie();
  cdEnsureGoogleTranslateBootstrap();
  if (!cdIsGoogleTranslateReady()) {
    cdSetLangUiLoading(true, '언어 엔진 로딩 중...');
  }
  __cdCancelLangWrapHide();

  var btns = document.querySelectorAll('.lang-btn');
  btns.forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');

  var label = document.getElementById('langLabel');
  var wrapForLoading = document.getElementById('langWrap');
  if (label && !(wrapForLoading && wrapForLoading.classList.contains('is-loading'))) {
    label.textContent = cdGetLangLabel(langCode);
  }

  cdMarkExplicitLanguageChoice(langCode);

  var applyPromise = cdSetGoogleTranslateLanguage(langCode, {
    maxAttempts: 90,
    retryDelay: 50,
    fallbackToCookieReload: true
  });
  if (applyPromise && typeof applyPromise.then === 'function') {
    applyPromise.then(function() {
      if (langCode === 'ko') {
        cdResetGoogleTranslateToKorean();
      }
      cdAllowGoogleTranslateForContent();
      cdApplyCollectionToggleHintTexts(langCode);
      cdSetLangUiLoading(false);
      __cdLangUiApplying = false;

      if (langCode === 'ko') {
        cdFinalizeKoreanLanguageSwitch(prevLangCode);
      }
    }).catch(function() {
      cdSetLangUiLoading(false);
      __cdLangUiApplying = false;
    });
  } else {
    if (langCode === 'ko') {
      cdResetGoogleTranslateToKorean();
    }
    cdAllowGoogleTranslateForContent();
    cdApplyCollectionToggleHintTexts(langCode);
    cdSetLangUiLoading(false);
    __cdLangUiApplying = false;

    if (langCode === 'ko') {
      cdFinalizeKoreanLanguageSwitch(prevLangCode);
    }
  }

  if (langCode === 'ko') {
    var domain = window.location.hostname;
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=' + domain + '; path=/;';
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=.' + domain + '; path=/;';
  }

  // 번역 선택 후에는 드롭다운만 닫고, 메인 토글은 계속 노출한다.
  var wrap = document.getElementById('langWrap');
  if (wrap) {
    wrap.classList.remove('open');
  }
  var trigger = document.getElementById('langTrigger');
  if (trigger) trigger.setAttribute('aria-expanded', 'false');

  __cdScheduleLangWrapHide();
}

function toggleLangDropdown() {
  var wrap = document.getElementById('langWrap');
  if (!wrap) return;

  if (!cdShouldSkipGoogleTranslate()) {
    if (!cdIsGoogleTranslateReady()) {
      cdSetLangUiLoading(true, '언어 엔진 로딩 중...');
      cdEnsureGoogleTranslateBootstrap();
      return;
    }
    cdSetLangUiLoading(false);
  } else {
    cdClearLangUiBusy();
  }

  var isOpen = wrap.classList.contains('open');
  if (isOpen) {
    wrap.classList.remove('open');
    __cdScheduleLangWrapHide();
  } else {
    __cdCancelLangWrapHide();
    wrap.classList.remove('lang-wrap--hidden');
    wrap.classList.add('open');
  }

  var trigger = document.getElementById('langTrigger');
  if (trigger) trigger.setAttribute('aria-expanded', String(!isOpen));

  if (!window.__cdLangDropdownOutsideBound) {
    window.__cdLangDropdownOutsideBound = true;
    document.addEventListener('click', function(e) {
      if (!wrap.classList.contains('open')) return;
      if (wrap.contains(e.target)) return;
      wrap.classList.remove('open');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
      __cdScheduleLangWrapHide();
    }, true);

    document.addEventListener('keydown', function(e) {
      if (!wrap.classList.contains('open')) return;
      if (e && (e.key === 'Escape' || e.key === 'Esc')) {
        wrap.classList.remove('open');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
        __cdScheduleLangWrapHide();
      }
    }, true);
  }
}

(function() {
  function scheduleRouteAction() {
    setTimeout(__cdRunRouteActionOnce, 0);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleRouteAction, { once: true });
  } else {
    scheduleRouteAction();
  }
})();

window.addEventListener('load', function() {
  var explicitLang = cdGetExplicitTranslateIntentLang();
  if (explicitLang && !cdShouldSkipGoogleTranslate(explicitLang)) {
    cdSetGoogleTranslateLanguage(explicitLang, {
      maxAttempts: 90,
      retryDelay: 50,
      fallbackToCookieReload: true
    });
  }
  if (!window.__cdLangWrapAutoHideScheduled) {
    window.__cdLangWrapAutoHideScheduled = true;
    __cdScheduleLangWrapHide();
  }

  var wrap = document.getElementById('langWrap');
  if (wrap && !window.__cdLangWrapInteractionBound) {
    window.__cdLangWrapInteractionBound = true;
    var rescheduleHide = function() {
      if (wrap.classList.contains('open')) return;
      __cdScheduleLangWrapHide();
    };
    wrap.addEventListener('pointerenter', __cdCancelLangWrapHide, { passive: true });
    wrap.addEventListener('pointerleave', rescheduleHide, { passive: true });
    wrap.addEventListener('touchstart', __cdCancelLangWrapHide, { passive: true });
    wrap.addEventListener('touchend', rescheduleHide, { passive: true });
  }

  setTimeout(function() {
    var googCookie = document.cookie.match(/(^|;\\s*)googtrans=([^;]*)/);
    var lang = 'ko';
    if (googCookie && googCookie[2]) {
      lang = googCookie[2].split('/').pop();
    }

    var btns = document.querySelectorAll('.lang-btn');
    btns.forEach(function(b) {
      b.classList.remove('active');
      if (b.getAttribute('data-lang') === lang) b.classList.add('active');
    });
    var label = document.getElementById('langLabel');
    if (label) label.textContent = cdGetLangLabel(lang || 'ko');
  }, 1000);
});

(function() {
  var isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  var modal = document.getElementById('ios-install-modal');
  if (modal) {
    var iosGuide = document.getElementById('ios-guide');
    var andGuide = document.getElementById('android-guide');
    if (isIos) {
      if (iosGuide) iosGuide.style.display = 'block';
    } else {
      if (andGuide) andGuide.style.display = 'block';
    }
  }
})();
