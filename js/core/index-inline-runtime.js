const INDEX_RUNTIME_TEXT_TRANSLATIONS = {
  ko: {
    "indexRuntime.message.001": "?붿젙???뺣낫瑜??뺤씤?섎뒗 以묒씠?먯슂",
    "indexRuntime.message.002": "?붿젙?앹씠 ?쒖꽦?붾릺怨??덉뼱??n怨??댁슜 媛?ν빐?몄슂",
    "indexRuntime.message.003": "?붿젙?앹씠 ?쒖꽦?붾릺怨??덉뼱??n怨??댁슜 媛?ν빐?몄슂",
    "indexRuntime.message.004": "?④굔?쇰줈 移대뱶 寃곗젣瑜?以鍮?以묒씠?먯슂",
    "indexRuntime.message.005": "寃곗젣媛 ?꾨즺?먯뼱??n寃곌낵瑜?遺덈윭?ㅻ뒗 以묒씠?먯슂",
    "indexRuntime.message.006": "?댁슜沅뚯쓣 ?뺤씤?섎뒗 以묒씠?먯슂",
    "indexRuntime.message.007": "泥섎━ 以묒씠?먯슂\n?좎떆留?湲곕떎??二쇱꽭??,
    "indexRuntime.message.008": "泥섎━ 以묒씠?먯슂\n?좎떆留?湲곕떎??二쇱꽭??,
    "indexRuntime.confirm.001": "?뵏 濡쒓렇?몄씠 ?꾩슂???쒕퉬?ㅼ엯?덈떎.\\\\n濡쒓렇?????댁슜??二쇱꽭??",
    "indexRuntime.aria-label.001": "?쒕퉴???ъ＜ ?쒖뒪???닿린",
    "indexRuntime.error.001": "SwissEph loader failed.",
    "indexRuntime.confirm.002": "?뵏 濡쒓렇?몄씠 ?꾩슂???쒕퉬?ㅼ엯?덈떎.\\\\n濡쒓렇?????댁슜??二쇱꽭??",
    "indexRuntime.label.001": "???꾩긽",
    "indexRuntime.label.002": "?섑샇?숇Ъ",
    "indexRuntime.label.003": "?ㅻ뒛??媛뺥븳 蹂?,
    "indexRuntime.label.004": "蹂?諛앷린",
    "indexRuntime.label.005": "沅곸쐞",
    "indexRuntime.label.006": "?쒖뼇沅?,
    "indexRuntime.label.007": "?곸듅沅?,
    "indexRuntime.label.008": "?ш턿",
    "indexRuntime.label.009": "?좉컯/?좎빟",
    "indexRuntime.label.010": "?⑹떊",
    "indexRuntime.label.011": "議고썑",
    "indexRuntime.aria-label.002": "?대챸??苑??곕룞?섍린",
    "indexRuntime.confirm.003": "?뵏 濡쒓렇?몄씠 ?꾩슂???쒕퉬?ㅼ엯?덈떎.\\\\n濡쒓렇?????댁슜??二쇱꽭??",
    "indexRuntime.confirm.004": "??λ맂 ?대챸??苑?湲곕줉??紐⑤몢 ??젣?좉퉴??",
    "indexRuntime.title.001": "?좊땲硫 ?좏뀥 由щ뵫 寃곌낵",
    "indexRuntime.confirm.005": "?뵏 濡쒓렇?몄씠 ?꾩슂???쒕퉬?ㅼ엯?덈떎.\\\\n濡쒓렇?????댁슜??二쇱꽭??",
    "indexRuntime.confirm.006": "?뵏 濡쒓렇?몄씠 ?꾩슂???쒕퉬?ㅼ엯?덈떎.\\\\n濡쒓렇?????댁슜??二쇱꽭??",
    "indexRuntime.confirm.007": "?뵏 濡쒓렇?몄씠 ?꾩슂???쒕퉬?ㅼ엯?덈떎.\\\\n濡쒓렇?????댁슜??二쇱꽭??",
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
  // ?뵶 [regression-guard] 二쇰Ц 諛쒓툒(checkout/prepare)? PG 寃곗젣李쎌쓣 ?닿린 **??* ?④퀎?닿퀬, 寃곗젣?섎떒
  // ?좏깮李쎌씠 ?????ъ슜??紐곕옒 誘몃━ 諛쒖궗?섎뒗 ?ъ쟾諛쒓툒?닿린???섎떎 ???ш린???湲?UI瑜??꾩슦硫?  // 'PAYMENT CHECK 쨌 寃곗젣 ?곹깭 ?뺤씤 以?쨌 ?④굔?쇰줈 移대뱶 寃곗젣瑜?以鍮?以묒씠?먯슂' ?꾩껜?붾㈃??寃곗젣李쎌쓣
  // ??뒗??2026-08 ?щ컻). ???몃씪???띾뫁??index.html _cdResolvePendingPaymentMeta)?먮뒗 ???덉쇅媛
  // ?대? ?덉뿀?붾뜲 ?몃??붾맂 ???щ낯?먮쭔 鍮좎졇 ?덉뿀?? ?湲?UI??寃곗젣李쎌쓣 ?듦낵???ㅼ쓽 ?뱀씤 寃利?  // (confirm)?먯꽌留??꾩슫????諛붾줈 ?꾨옒 遺꾧린.
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
  // checkout/prepare 遺꾧린???녿떎 ??__cdShouldTrackPaymentRequest 媛 ?좎큹??異붿쟻?섏? ?딅뒗????二쇱꽍).
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
      detail: { open: !!open, message: String(message || '').trim() || '泥섎━ 以묒씠?먯슂\n?좎떆留?湲곕떎??二쇱꽭??, mode: String(mode || '').trim() || 'payment' }
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
      state.message = '泥섎━ 以묒씠?먯슂\n?좎떆留?湲곕떎??二쇱꽭??;
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

  /* ?몄쓽 ?섑띁(fetchJsonWithAuth/_dpFetchJsonWithFallback)瑜??고쉶?섎뒗 raw fetch 媛 401/403 ??     諛쏆븘???좊졊 濡쒓렇??UI 媛 ?⑥? ?딄쾶 ?쒕떎. 401 ???ш린??濡쒓렇?꾩썐?쇰줈 ?댁꽍?섏????딅뒗????     由ы봽?덉떆 ?댁쟾?닿굅???쇱떆 ?μ븷?????덉쑝誘濡?/api/auth/me ?ш?利앸쭔 ?덉빟?섍퀬 ?먯젙? 洹몄そ???쒕떎. */
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

  /* Capacitor ?깆씤媛. ?깆? https://localhost 異쒖쿂?먯꽌 ?뚭퀬 API ???먯궗 ?꾨찓?몄쑝濡??섍컙?? */
  function __cdIsMobileAppRuntime() {
    try {
      if (window.__CODE_DESTINY_RUNTIME_TARGET === 'mobile-app') return true;
      if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function') {
        return !!window.Capacitor.isNativePlatform();
      }
      return !!window.Capacitor;
    } catch (_) {
      return false;
    }
  }

  /* ?좏겙???ㅼ뼱???섎뒗 ?먯궗 API 異쒖쿂?멸?.
     ?뱀? ?숈씪 異쒖쿂留??대떦?쒕떎(湲곗〈 ?숈옉 洹몃?濡?. ?깆? 異쒖쿂媛 https://localhost ???숈씪 異쒖쿂 議곌굔??     ??긽 嫄곗쭞?닿퀬 ?몄뀡 荑좏궎??SameSite=Lax 濡?援먯감 ?꾩넚?섏? ?딅뒗????洹몃옒???ш린???좏겙??遺숈씠吏
     ?딆쑝硫??몄쓽 紐⑤뱺 API ?몄텧??寃뚯뒪?몃줈 痍④툒?쒕떎. destiny-profile ??aa018053 ?먯꽌 ?먭린 ?몄텧?먮쭔
     ?곸슜??泥섎갑???⑥튂 ?덈꺼濡??щ젮 ???붿쭊 ?꾩껜媛 媛숈? ?쒗깮??諛쏄쾶 ?쒕떎. */
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

      // ?뚯빱???숈씪 異쒖쿂 媛?쒕뒗 ???ㅻ뜑瑜??????붿껌留?硫댁젣?쒕떎(worker/routes/auth.js isMobileAppAuthRequest).
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

    var shouldTrack = __cdShouldTrackPaymentRequest(pathname…86916 tokens truncated…of window.setTarotMode === 'function') {
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

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   ???濡?硫붿씤 ?붾㈃ ?대┃ ???좊즺 泥섎━ ?몃뱾??   ?댁쭅 ?대챸??移대뱶 쨌 ?띾쭏???뚯븘蹂닿린 쨌 ?먯꽍 ?뚯슱 ?濡??먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
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
    // 紐낅━ ?濡?3移대뱶 寃곗젣??寃곗젣李쎌쓣 ?꾩슦???섎룄?곸쑝濡???ㅽ겕由곗쓣 醫낅즺?쒕떎. ?대븣???ъ슜?먭? 紐⑤떖???レ?
    // 寃껋씠 ?꾨땲誘濡??濡??붾㈃???レ? ?딅뒗??寃곗젣 ??_myeongriTarotRestoreFullscreen??蹂듭썝). ?ㅼ젣 ?リ린??    // ?뚮옒洹멸? false???꾨옒 濡쒖쭅??洹몃?濡??숈옉?쒕떎.
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
    desc.textContent = '?곗븷/寃고샎: 媛먯젙, ?④린, ?쇱?쨌??꽦 媛꾩쓽 議고솕媛 以묒떖??癒몃춦?덈떎.';
    btn.innerHTML = '?뮉 ?곗븷 沅곹빀 遺꾩꽍?섍린';
  } else if (v === 'business') {
    desc.textContent = '?ъ뾽/?숈뾽: ??븷쨌梨낆엫쨌?⑹떊쨌?곴레??以묒떖?쇰줈 ?ㅻТ?겶룹옱臾댁쟻 ?곹빀?깆쓣 ?됯??⑸땲??';
    btn.innerHTML = '?뮳 ?ъ뾽 沅곹빀 遺꾩꽍?섍린';
  } else {
    desc.textContent = '移쒓뎄/?숇즺: ?곗젙쨌?묒뾽쨌?먮꼫吏 ?명씉??以묒떖?쇰줈 ?몄븞?④낵 ?쒕꼫吏 ?ъ씤?몃? ?덈궡?⑸땲??';
    btn.innerHTML = '?쩃 ?곗젙/?숇즺 沅곹빀 遺꾩꽍?섍린';
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

/* 湲곕뒫(濡쒕뜑/紐⑤떖/?ㅻ쾭?덉씠) ?숈옉 以묒뿉???몄뼱 踰꾪듉 ?먮룞 ?④?, 醫낅즺 ???ㅼ떆 ?쒖떆 */
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
    label.textContent = message || '?몄뼱 ?붿쭊 濡쒕뵫 以?..';
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

// ?몄뼱 ?좏깮(援ш? 踰덉뿭 ?쒕퉬???ъ슜) ???쇱젙 ?쒓컙 ???꾩젽 ?먮룞 ?④?
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
  // cd-lang-native.js 媛 濡쒕뱶?섎㈃ ?대떦 ?⑥닔媛 window.changeLanguage 瑜???뼱?.
  // ??湲곕낯 援ы쁽? native 紐⑤뱶 ?뚯씪 濡쒕뱶 ???먮뒗 ?대갚?쇰줈留??ㅽ뻾??
  if (window.__cdNativeLangBound) {
    return;
  }
  if (__cdLangUiApplying) return;
  __cdLangUiApplying = true;
  var prevLangCode = cdGetCurrentLangFromCookie();
  cdEnsureGoogleTranslateBootstrap();
  if (!cdIsGoogleTranslateReady()) {
    cdSetLangUiLoading(true, '?몄뼱 ?붿쭊 濡쒕뵫 以?..');
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

  // 踰덉뿭 ?좏깮 ?꾩뿉???쒕∼?ㅼ슫留??リ퀬, 硫붿씤 ?좉?? 怨꾩냽 ?몄텧?쒕떎.
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
      cdSetLangUiLoading(true, '?몄뼱 ?붿쭊 濡쒕뵫 以?..');
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
