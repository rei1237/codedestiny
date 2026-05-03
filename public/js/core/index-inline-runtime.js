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

// ?êÎèô Í¥ÄÎ¶¨Ïûê Î™®Îìú Î∞©Ï?: localStorage???®ÏïÑ?àÎäî admin token???ïÎ¶¨ (?∏ÏÖò ?ÑÏö©Îß??àÏö©)
function __cdCleanLegacyAdminLocalStorage() {
  try { localStorage.removeItem('flower_admin_token'); } catch (_) {}
  try { localStorage.removeItem('flower_admin_password_ok'); } catch (_) {}
}

__cdCleanLegacyAdminLocalStorage();

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

  if (pathname.indexOf('/api/premium/') === 0) return true;
  if (pathname.indexOf('/api/tarot/reading') === 0) return true;
  if (pathname.indexOf('/api/sibyl/report') === 0) return true;
  if (pathname.indexOf('/api/fortune/pig-coin/profile-subscription/subscribe') === 0) return true;
  return false;
}

function __cdResolvePaymentMessage(pathname) {
  if (pathname && pathname.indexOf('/api/fortune/pig-coin/profile-subscription/subscribe') === 0) {
    return 'Í≤∞Ï†úÍ∞Ä ÏßÑÌñâ Ï§ëÏûÖ?àÎã§.';
  }
  return '?¥Î™Ö???ΩÏñ¥?§Îäî Ï§ëÏûÖ?àÎã§...';
}

function __cdEnsurePaymentLoadingStyle() {
  if (document.getElementById('cdPaymentLoadingStyle')) return;
  var style = document.createElement('style');
  style.id = 'cdPaymentLoadingStyle';
  style.textContent = [
    '@keyframes cdPaymentSpin {',
    '  from { transform: rotate(0deg); }',
    '  to { transform: rotate(360deg); }',
    '}',
    '#cdPaymentLoadingOverlay {',
    '  position: fixed;',
    '  inset: 0;',
    '  z-index: 1400;',
    '  display: none;',
    '  align-items: center;',
    '  justify-content: center;',
    '  background: rgba(2, 6, 23, 0.58);',
    '  backdrop-filter: blur(6px);',
    '  padding: 16px;',
    '}',
    '#cdPaymentLoadingOverlay .cd-payment-card {',
    '  width: min(420px, 100%);',
    '  border-radius: 20px;',
    '  border: 1px solid rgba(253, 230, 138, 0.28);',
    '  background: rgba(2, 6, 23, 0.88);',
    '  box-shadow: 0 28px 72px rgba(0, 0, 0, 0.42);',
    '  text-align: center;',
    '  color: #ffffff;',
    '  padding: 24px 20px;',
    '}',
    '#cdPaymentLoadingOverlay .cd-payment-spinner-wrap {',
    '  width: 74px;',
    '  height: 74px;',
    '  margin: 0 auto 14px;',
    '  border-radius: 999px;',
    '  border: 1px solid rgba(253, 230, 138, 0.25);',
    '  display: grid;',
    '  place-items: center;',
    '}',
    '#cdPaymentLoadingOverlay .cd-payment-spinner {',
    '  width: 44px;',
    '  height: 44px;',
    '  border-radius: 999px;',
    '  border: 3px solid rgba(251, 191, 36, 0.25);',
    '  border-top-color: rgba(251, 191, 36, 1);',
    '  animation: cdPaymentSpin 0.9s linear infinite;',
    '}',
    '#cdPaymentLoadingOverlay .cd-payment-title {',
    '  margin: 0;',
    '  font-size: 20px;',
    '  font-weight: 800;',
    '  letter-spacing: -0.02em;',
    '}',
    '#cdPaymentLoadingOverlay .cd-payment-desc {',
    '  margin: 8px 0 0;',
    '  font-size: 14px;',
    '  color: rgba(226, 232, 240, 0.9);',
    '}',
    '#cdPaymentLoadingOverlay .cd-payment-status {',
    '  margin: 12px 0 0;',
    '  border-radius: 10px;',
    '  border: 1px solid rgba(255, 255, 255, 0.14);',
    '  background: rgba(255, 255, 255, 0.07);',
    '  padding: 8px 10px;',
    '  color: rgba(254, 243, 199, 0.95);',
    '  font-size: 13px;',
    '  font-weight: 600;',
    '}',
    '@media (max-width: 480px) {',
    '  #cdPaymentLoadingOverlay .cd-payment-card { padding: 20px 16px; border-radius: 18px; }',
    '  #cdPaymentLoadingOverlay .cd-payment-title { font-size: 18px; }',
    '}'
  ].join('\n');
  document.head.appendChild(style);
}

function __cdEnsurePaymentLoadingOverlay() {
  var existing = document.getElementById('cdPaymentLoadingOverlay');
  if (existing) return existing;

  __cdEnsurePaymentLoadingStyle();

  var overlay = document.createElement('div');
  overlay.id = 'cdPaymentLoadingOverlay';
  overlay.innerHTML = [
    '<div class="cd-payment-card" role="alertdialog" aria-modal="true" aria-live="assertive">',
    '  <div class="cd-payment-spinner-wrap"><div class="cd-payment-spinner"></div></div>',
    '  <p class="cd-payment-title">?¥Î™Ö???ΩÏñ¥?§Îäî Ï§ëÏûÖ?àÎã§...</p>',
    '  <p class="cd-payment-desc">Í≤∞Ï†úÍ∞Ä ÏßÑÌñâ Ï§ëÏûÖ?àÎã§.</p>',
    '  <p class="cd-payment-status" id="cdPaymentLoadingStatus">Í≤∞Ï†úÍ∞Ä ÏßÑÌñâ Ï§ëÏûÖ?àÎã§.</p>',
    '</div>'
  ].join('');
  document.body.appendChild(overlay);
  return overlay;
}

function __cdSetPaymentLoadingOverlay(open, message) {
  if (typeof document === 'undefined') return;
  var overlay = __cdEnsurePaymentLoadingOverlay();
  var statusNode = document.getElementById('cdPaymentLoadingStatus');
  if (statusNode && typeof message === 'string' && message.trim()) {
    statusNode.textContent = message.trim();
  }
  overlay.style.display = open ? 'flex' : 'none';
}

function __cdInitGlobalPaymentLoading() {
  if (window.__cdPaymentLoadingInited) return;
  window.__cdPaymentLoadingInited = true;

  var state = {
    depth: 0,
    message: 'Í≤∞Ï†úÍ∞Ä ÏßÑÌñâ Ï§ëÏûÖ?àÎã§.'
  };

  function startPayment(message) {
    if (typeof message === 'string' && message.trim()) {
      state.message = message.trim();
    }
    state.depth += 1;
    __cdSetPaymentLoadingOverlay(true, state.message);
  }

  function endPayment() {
    state.depth = Math.max(0, state.depth - 1);
    if (state.depth === 0) {
      __cdSetPaymentLoadingOverlay(false, state.message);
    }
  }

  function setPaymentMessage(message) {
    if (!message || !String(message).trim()) return;
    state.message = String(message).trim();
    if (state.depth > 0) {
      __cdSetPaymentLoadingOverlay(true, state.message);
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
  window.fetch = function(input, init) {
    var reqUrl = __cdResolveRequestUrl(input);
    var reqMethod = __cdResolveRequestMethod(input, init);
    var pathname = reqUrl ? reqUrl.pathname : '';
    var shouldTrack = __cdShouldTrackPaymentRequest(pathname, reqMethod);

    if (!shouldTrack) {
      return originalFetch(input, init);
    }

    startPayment(__cdResolvePaymentMessage(pathname));

    try {
      return originalFetch(input, init).then(
        function(response) {
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
  ko: { open: '?åÎü¨???¥Í∏∞', close: '?´Í∏∞' },
  en: { open: 'Tap to open', close: 'Close' },
  ja: { open: '?ø„ÉÉ?ó„Åó??ñã??, close: '?â„Åò?? },
  'zh-CN': { open: '?πÂáªÂ±ïÂ?', close: '?∂Ëµ∑' },
  hi: { open: '‡§ñ‡•ã‡§≤‡§®‡•?‡§ï‡•á ‡§≤‡§ø‡§?‡§ü‡•à‡§?‡§ï‡§∞‡•á‡§Ç', close: '‡§¨‡§Ç‡§?‡§ï‡§∞‡•á‡§Ç' },
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
    basePath === '/vedic-astrology.html' ||
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
    'a[href^="/vedic-astrology.html"]',
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

// Íµ¨Í? Î≤àÏó≠ ?∏Ïñ¥ ?†ÌÉù Ïπ¥Îìú ?†Í? Í∏∞Îä• (DOM Î°úÎìú ?ÄÍ∏?
function initTranslateLangUI() {
  var langWrap = document.querySelector('.translate-lang-wrap');
  var langBtn = document.getElementById('translateLangToggleBtn');
  var langCard = document.getElementById('translateLangCard');
  var langLabel = document.getElementById('translateLangLabel');
  var hideTimer = null;
  var HIDE_DELAY = 30000; // 30Ï¥?  window.__cdTranslateInitAttempts = (window.__cdTranslateInitAttempts || 0) + 1;
  
  // ?îÏÜåÍ∞Ä ?ÜÏúºÎ©??úÌïú?ÅÏúºÎ°??¨Ïãú??(Î¨¥Ìïú Î£®ÌîÑ Î∞©Ï?)
  if (!langBtn || !langCard || !langWrap) {
    if (window.__cdTranslateInitAttempts < 120) {
      setTimeout(initTranslateLangUI, 100);
    }
    return;
  }
  
  // ?êÎèô ?®Í? ?úÏûë
  function startHideTimer() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function() {
      if (langWrap) {
        langWrap.classList.add('translate-lang-wrap--hidden');
      }
    }, HIDE_DELAY);
  }
  
  // Î≤ÑÌäº ?úÏãú Î∞??Ä?¥Î®∏ Î¶¨ÏÖã
  function showTranslateButton() {
    clearTimeout(hideTimer);
    if (langWrap) {
      langWrap.classList.remove('translate-lang-wrap--hidden');
    }
  }
  
  // Î≤ÑÌäº ?¥Î¶≠ ??Ïπ¥Îìú ?†Í?
  langBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    langCard.classList.toggle('active');
    showTranslateButton();
  });
  
  // Î∞îÍπ• ?¥Î¶≠ ??Ïπ¥Îìú ?´Í∏∞
  document.addEventListener('click', function(e) {
    if (langWrap && !langWrap.contains(e.target)) {
      langCard.classList.remove('active');
    }
  });
  
  // ?∏Ïñ¥ Î≥ÄÍ≤?Ïπ¥Îìú Î≤ÑÌäº ?∏Îì§??  // NOTE: Google Translate includedLanguages?Ä ?ºÎ≤® Îß§Ìïë??ÎßûÏ∂ò??
  var langCodeMap = { 'ko': 'KR', 'en': 'EN', 'ja': 'JP', 'zh-CN': 'CN', 'hi': 'HI', 'es': 'ES', 'fr': 'FR', 'de': 'DE', 'nl': 'NL', 'ms': 'MS' };
  var langCodeBtns = document.querySelectorAll('.translate-lang-code');
  Array.prototype.forEach.call(langCodeBtns, function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      var lang = btn.getAttribute('data-lang');
      if (!lang) return;
      cdSaveCurrentLang(lang);
      
      // ?úÏÑ± ?ÅÌÉú ?ÖÎç∞?¥Ìä∏
      Array.prototype.forEach.call(langCodeBtns, function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      
      // Î≤ÑÌäº ?àÏù¥Î∏??ÖÎç∞?¥Ìä∏
      if (langLabel) langLabel.textContent = langCodeMap[lang] || lang.toUpperCase();
      
      // Google Translate ?úÎ°≠?§Ïö¥ Î≥ÄÍ≤?(Î°úÎî© ÏßÄ??Ï§ëÎ≥µ ?∏Ïä§?¥Ïä§ ?Ä??
      cdSetGoogleTranslateLanguage(lang, {
        maxAttempts: 60,
        retryDelay: 200,
        fallbackToCookieReload: true
      });
      cdRetargetLocaleSensitiveLinks();
      cdApplyCollectionToggleHintTexts(lang);
      startHideTimer();
      
      // Ïπ¥Îìú ?´Í∏∞
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

function cdEnsureGoogleTranslateBootstrap() {
  var hasGoogleTranslateRuntime = !!(window.google && window.google.translate && window.google.translate.TranslateElement);
  if (hasGoogleTranslateRuntime) {
    if (typeof window.googleTranslateElementInit === 'function') {
      try { window.googleTranslateElementInit(); } catch (_) {}
    }
    return;
  }

  if (window.__cdGoogleTranslateScriptRequested) return;
  window.__cdGoogleTranslateScriptRequested = true;

  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.async = true;
  script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  script.onerror = function() {
    window.__cdGoogleTranslateScriptRequested = false;
  };
  document.head.appendChild(script);
}

function cdSetGoogleTranslateLanguage(langCode, options) {
  if (!langCode) return Promise.resolve(false);

  var opts = options || {};
  var attempts = 0;
  var maxAttempts = typeof opts.maxAttempts === 'number' ? opts.maxAttempts : 60;
  var retryDelay = typeof opts.retryDelay === 'number' ? opts.retryDelay : 80;
  var useCookieFallback = opts.fallbackToCookieReload === true;

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

  // language changeÍ∞Ä ?§Ï†ú DOM Î≤àÏó≠?ºÎ°ú Î∞òÏòÅ?òÏ? ?äÎäî ÏºÄ?¥Ïä§Î•??ÄÎπÑÌï¥,
  // select Î≥ÄÍ≤??ÑÏóê cookieÎ•?Î®ºÏ? ?∏ÌåÖ?úÎã§.
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

  if (langCode === 'ko') clearCookieForKo();
  else setCookieForLang(langCode);

  return new Promise(function(resolve) {
    function apply() {
      cdEnsureGoogleTranslateBootstrap();
      var selectField = pickGoogleTranslateSelect();
      if (selectField) {
        selectField.value = langCode;
        // Ï∂îÍ? ?∏Î¶¨Í±? ?¥Î? ?ôÏûë ?Ä?¥Î∞ç???∞Îùº 'change'ÎßåÏúºÎ°???≤å Î∞òÏòÅ?òÎäî Í≤ΩÏö∞Í∞Ä ?àÎã§.
        try { selectField.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
        cdDispatchNativeChangeEvent(selectField);
        resolve(true);
        return;
      }
      if (attempts >= maxAttempts) {
        fallbackByCookieOnly();
        resolve(false);
        return;
      }
      attempts++;
      setTimeout(apply, retryDelay);
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

// DOM Ï§ÄÎπ??ÑÎ£å ??Ï¥àÍ∏∞??if (document.readyState === 'loading') {
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
  btn.querySelector('.feature-card__cta-label').textContent = open ? '?´Í∏∞' : btn.dataset.label;
  btn.querySelector('.feature-card__cta-arrow').textContent = open ? '?? : '??;
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
 * ?§Î≤Ñ?àÏù¥ Î£®Ìä∏??data-action???àÏúºÎ©?Î™®Î∞î?ºÏóê??event.target???§Î≤Ñ?àÏù¥Î°úÎßå ?°Ìûê ?? * closestÍ∞Ä ?´Í∏∞Î°?Ï≤òÎ¶¨?úÎã§. ?àÌä∏ ?§ÌÉù?ºÎ°ú ?úÌä∏ ?¥Î? ?§Ï†ú ?îÏÜåÎ•?Î≥µÍµ¨?úÎã§.
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

function __cdHasFlowerAdminPasswordSession() {
  try {
    return String(sessionStorage.getItem('flower_admin_password_ok') || '') === '1';
  } catch (_) {}
  return false;
}

function __cdIsAdminLikeUser() {
  var FLOWER_ADMIN_TOKEN_RE = /^[A-Za-z0-9_-]{20,}\.[0-9a-f]{64}$/;
  if (!__cdHasFlowerAdminPasswordSession()) return false;
  try {
    var sessionAdminToken = String(sessionStorage.getItem('flower_admin_token') || '').trim();
    if (sessionAdminToken && FLOWER_ADMIN_TOKEN_RE.test(sessionAdminToken)) return true;
  } catch (_) {}
  return false;
}

try {
  window.__cdIsAdminLikeUser = __cdIsAdminLikeUser;
} catch (_) {}

try {
  window.__cdAdminBypass = !!__cdIsAdminLikeUser();
} catch (_) {}

function __cdHasAuthToken() {
  if (__cdIsAdminLikeUser()) return true;
  try {
    if (typeof window.hasAuthToken === 'function') return !!window.hasAuthToken();
  } catch (_) {}
  try {
    return !!(localStorage.getItem('fortune_auth_token') || '');
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
  // Í∞??¥Î™Ö??ÍΩ?Í∏∞Îä•?Ä Í∞úÎ≥Ñ 50ÏΩîÏù∏ ?¥Í∏à (flower-fc ÍµêÏ∞® alias ?úÍ±∞)
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

  if (__cdIsAdminLikeUser()) return true;

  if (!__cdHasAuthToken()) {
    if (window.confirm('?îí Î°úÍ∑∏?∏Ïù¥ ?ÑÏöî???úÎπÑ?§ÏûÖ?àÎã§.\nÎ°úÍ∑∏?????¥Ïö©??Ï£ºÏÑ∏??')) {
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

  window.alert('?†Í∏à???úÎπÑ?§ÏûÖ?àÎã§. ?¥Í∏à ???¥Ïö©??Ï£ºÏÑ∏??');
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
    var legacyRaw = localStorage.getItem('cd_tile_locks');
    if (legacyRaw) {
      var legacyMap = JSON.parse(legacyRaw);
      if (legacyMap && typeof legacyMap === 'object') {
        var legacyKeys = Object.keys(legacyMap);
        for (var j = 0; j < legacyKeys.length; j += 1) {
          if (legacyMap[legacyKeys[j]] === true) merged[legacyKeys[j]] = true;
        }
      }
    }
  } catch (_) {}

  var normalized = Object.create(null);
  var keys = Object.keys(merged);
  for (var k = 0; k < keys.length; k += 1) {
    var aliases = __cdResolveTileLockAliasKeys(keys[k]);
    for (var a = 0; a < aliases.length; a += 1) normalized[aliases[a]] = true;
  }
  return normalized;
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
    localStorage.setItem('cd_tile_locks', JSON.stringify(safe));
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
  var token = __cdGetAuthTokenForLockSync();
  if (!token || __cdTileLockServerSyncInFlight) return;

  __cdTileLockServerSyncInFlight = true;
  var url = __cdResolveApiBaseForLockSync() + '/api/flower/unlock/status?all=1';

  fetch(url, {
    method: 'GET',
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/json'
    }
  }).then(function(response) {
    return response.json().catch(function() { return {}; });
  }).then(function(payload) {
    var keys = [];
    if (payload && Array.isArray(payload.unlockedFeatures)) keys = payload.unlockedFeatures;
    if (payload && payload.unlockMap && typeof payload.unlockMap === 'object') {
      var mapKeys = Object.keys(payload.unlockMap);
      for (var i = 0; i < mapKeys.length; i += 1) {
        if (payload.unlockMap[mapKeys[i]] === true) keys.push(mapKeys[i]);
      }
    }

    if (__cdMergeServerUnlockKeys(keys)) {
      __cdDispatchTileLockSyncEvent();
    }
  }).catch(function() {
    // ignore sync failures
  }).finally(function() {
    __cdTileLockServerSyncInFlight = false;
    __cdTileLockServerSyncDone = true;
  });
}

function __cdScheduleTileLockServerSync() {
  if (__cdTileLockServerSyncDone) return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', __cdSyncTileLocksFromServer, { once: true });
  } else {
    __cdSyncTileLocksFromServer();
  }
}

__cdScheduleTileLockServerSync();

window.addEventListener('cd:auth-changed', function() {
  __cdTileLockServerSyncDone = false;
  __cdSyncTileLocksFromServer();
});

var __cdLazyActionLoaders = {
  openHwatuModal: function() { return __cdLoadScriptOnce('/HwatuFortune.js'); },
  openJuyukModal: function() { return __cdLoadScriptOnce('/js/iching-modal.js'); },
  openKemetModal: function() { return __cdLoadScriptOnce('/js/oracle-kcg.js'); },
  openDreamModal: function() { return __cdLoadScriptOnce('/lib/ai-engine.js').then(function() { return __cdLoadScriptOnce('/js/dream-ledger.js'); }); },
  openPsychoDreamModal: function() { return __cdLoadScriptOnce('/js/psycho-dream-analyzer-freuds-study.js'); },
  openOlympusOracleModal: function() { return __cdLoadScriptOnce('/js/olympus-oracle.js'); },
  openLuckSyncDiary: function() { return __cdLoadScriptOnce('/js/luck-sync-diary.js'); },
  closeLuckSyncDiary: function() { return __cdLoadScriptOnce('/js/luck-sync-diary.js'); },
  openAnimalTotemModal: function() { return __cdLoadScriptOnce('/js/services/animal-totem-content-engine.js?v=20260328-dreamcute-v2').then(function() { return __cdLoadScriptOnce('/js/animal-totem-experience.js?v=20260328-dreamcute-v2'); }); },
  openDestinyEggPage: function() { return Promise.resolve(window.location.assign('/tadagochi.html')); },
  openTarotLoveModal: function() { return __cdLoadScriptOnce('/js/tarot-love-experience.js?v=20260414-tarot-qualityfix2'); },
  openTarotReunionModal: function() { return __cdLoadScriptOnce('/js/tarot-reunion-experience.js?v=20260414-tarot-qualityfix2'); },
  openTarotHealingModal: function() { return Promise.resolve(window.location.assign('/tarot/healing')); },
  openTarotSelfEsteemModal: function() { return __cdLoadScriptOnce('/js/tarot-self-esteem-experience.js?v=20260414-tarot-qualityfix2'); },
  openTarotYearFortuneModal: function() { return __cdLoadScriptOnce('/js/tarot-year-fortune-experience.js?v=20260414-tarot-qualityfix2'); },
  openRuneOracle: function() { return Promise.resolve(window.location.assign('/oracle/rune')); },
  gotoZiweiPremium: function() { return __cdLoadScriptOnce('/js/ziwei-book.js?v=20260410-v2'); },
  openLoveSecretModal: function() { return __cdLoadScriptOnce('/js/love-secret-v2.js'); },
  openLifeBookModal: function() { return __cdLoadScriptOnce('/js/life-book.js?v=20260410-v2'); },
  openSibylModal: function() {
    return __cdLoadScriptOnce('/js/sibyl-system.js?v=20260413-sibylfix1').then(function() {
      if (typeof window.openSibylModal === 'function') window.openSibylModal();
    });
  },
  openLoveSimulation: function() { try { window.location.assign('/saju/love-simulation'); } catch(e) { window.open('/saju/love-simulation', '_self'); } return Promise.resolve(); },
  setTarotMode: function() { return __cdEnsureSajuCoreLoaded(); },
  selectTarotCategory: function() { return __cdEnsureSajuCoreLoaded(); },
  startTarotReading: function() { return __cdEnsureSajuCoreLoaded(); },
  flipTarotSpreadCard: function() { return __cdEnsureSajuCoreLoaded(); },
  showTarotFinalInterpretation: function() { return __cdEnsureSajuCoreLoaded(); },
  checkPrivacyAndCalculate: function() { return __cdEnsureSajuCoreLoaded(); },
  agreeAndCalculate: function() { return __cdEnsureSajuCoreLoaded(); },
  calculate: function() { return __cdEnsureSajuCoreLoaded(); },
  runCompat: function() { return __cdEnsureSajuCoreLoaded(); }
};
var __cdLazyActionState = {};

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
        fallbackTile.setAttribute('aria-label', '?úÎπå???¨Ï£º ?úÏä§???¥Í∏∞');
        fallbackTile.innerHTML = '<span>??SIBYL SYSTEM Î≥µÏõê??¬∑ ??ïò???¥Í∏∞</span>';
        section.insertBefore(fallbackTile, section.firstChild || null);
      }
      return true;
    }

    if (!modal) return false;

    var fallbackSection = document.createElement('section');
    fallbackSection.className = 'saju-section-wrap';
    fallbackSection.id = 'sibylSystemSection';
    fallbackSection.innerHTML =
      '<button type="button" class="sibyl-entry-tile sibyl-entry-tile--fallback" data-action="openSibylModal" aria-label="?úÎπå???¨Ï£º ?úÏä§???¥Í∏∞">'
      + '<span>??SIBYL SYSTEM Î≥µÏõê??¬∑ ??ïò???¥Í∏∞</span>'
      + '</button>';

    var anchor = document.getElementById('ziweiBookModal');
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(fallbackSection, anchor);
    } else if (modal.parentNode) {
      modal.parentNode.insertBefore(fallbackSection, modal);
    } else {
      document.body.appendChild(fallbackSection);
    }
    return true;
  } catch (e) {
    console.warn('[SibylGuard] ?πÏÖò Î≥µÏõê ?§Ìå®:', e);
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
 * INP: ?¥Î¶≠ ÏßÅÌõÑ Î©îÏù∏ ?§Î†à?úÏóê???ôÍ∏∞ ?§Ìñâ?òÎçò Î¨¥Í±∞???∏Îì§???¨Ï£º/Í∂ÅÌï©/Î¶¨Îî© ??Î•? * setTimeout(0)?ºÎ°ú ????ÎØ∏Î§Ñ ?§Ïùå ?òÏù∏?∏¬∑ÏûÖ???ëÎãµ??Î®ºÏ? Ï≤òÎ¶¨?òÍ≤å ?úÎã§.
 * (uiBindings.js ??__CD_DEFER_INP_ACTIONS ?Ä ?ôÏùº Î™©Î°ù ?†Ï?)
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

  var chain = [
    '/js/core/kasi-calendar-service.js?v=20260407-kst-fix',
    '/js/compat-llm-prompts.js?v=20260321-llm5-sukuyo',
    '/js/saju-engine.js?v=20260502-saju-nullstyle-fix1',
    '/js/saju-engine-tarot-sukuyo-quantum.js?v=20260414-tarot-hotfix1',
    '/js/core/saju/modalProfileState.js?v=20260326-modaldeps1',
    '/js/core/saju/reportDashboard.js?v=20260414-saju-rpt4',
    '/js/saju-engine-continuation.js?v=20260329-saju-rpt3',
    '/js/entertain-engine.js'
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

  __cdDestinyProfileLoadPromise = __cdLoadScriptOnce('/js/destiny-profile.js')
    .then(function() { return true; })
    .catch(function(err) {
      __cdDestinyProfileLoadPromise = null;
      throw err;
    });

  return __cdDestinyProfileLoadPromise;
}

function __cdEnsureSwissEphLoaded() {
  if (window.__cdSwissEphReady === 1 || window.swisseph || window.Swe || window.swe) {
    window.__cdSwissEphReady = 1;
    return Promise.resolve(true);
  }
  if (__cdSwissEphLoadPromise) return __cdSwissEphLoadPromise;

  __cdSwissEphLoadPromise = new Promise(function(resolve, reject) {
    var src = '/js/swisseph-loader.js?v=20260328-lazy1';
    var norm = __cdNormalizeScriptSrc(src);
    if (!norm) {
      reject(new Error('missing swisseph src'));
      return;
    }

    function markReady() {
      window.__cdSwissEphReady = 1;
      resolve(true);
    }

    function waitForBridge() {
      if (window.swisseph || window.Swe || window.swe) {
        markReady();
        return;
      }

      var settled = false;
      var done = function(ok) {
        if (settled) return;
        settled = true;
        window.removeEventListener('swisseph:ready', onReady);
        if (ok) {
          markReady();
        } else {
          resolve(false);
        }
      };

      var onReady = function() { done(true); };
      window.addEventListener('swisseph:ready', onReady, { once: true });
      setTimeout(function() { done(false); }, 12000);
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
    for (var h = 0; h < 24; h++) hBuf += '<option value="' + h + '">' + (h < 10 ? '0' : '') + h + '??/option>';
    hourSel.innerHTML = hBuf;
  }
  if (minuteSel && minuteSel.options && minuteSel.options.length === 0) {
    var mBuf = '';
    for (var m = 0; m < 60; m++) mBuf += '<option value="' + m + '">' + (m < 10 ? '0' : '') + m + 'Î∂?/option>';
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
    first.textContent = '?Ä?úÎ?Íµ?¬∑ ?úÏö∏';
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
    if (!infoDiv.innerHTML || infoDiv.innerHTML.indexOf('Î∂àÎü¨?§Îäî Ï§?) >= 0) {
      infoDiv.innerHTML = '?åç <b>?úÍ∞Ñ Î≥¥Ï†ï ÎØ∏Î¶¨Î≥¥Í∏∞</b><br><span style="font-size:0.75rem;">Í∏∞Ï? UTC+9, Í∏∞Î≥∏ Ï∂úÏÉùÏßÄ(?úÏö∏)Î°?Í≥ÑÏÇ∞?©Îãà??</span>';
    }
  }
}

function __cdBootstrapSajuInputsOnLoad() {
  if (window.__cdSajuBootstrapAttempted === 1) return;
  if (!__cdNeedsSajuInputBootstrap()) return;

  window.__cdSajuBootstrapAttempted = 1;
  __cdEnsureSajuCoreLoaded().then(function() {
    __cdWarmupSajuInputsIfNeeded();
    if (__cdNeedsSajuInputBootstrap()) {
      __cdRepairSajuInputsFallback();
    }
  }).catch(function(err) {
    console.error('[index-inline-runtime] saju bootstrap load failed:', err);
    __cdRepairSajuInputsFallback();
  });
}

window.__cdEnsureSajuCoreLoaded = __cdEnsureSajuCoreLoaded;
__cdInstallSajuActionStub('checkPrivacyAndCalculate');
__cdInstallSajuActionStub('agreeAndCalculate');
__cdInstallSajuActionStub('calculate');
__cdInstallSajuActionStub('runCompat');
window.openLuckSyncDiary = function() {
  return __cdLoadScriptOnce('/js/luck-sync-diary.js').then(function() {
    if (window.LuckSyncDiary && typeof window.LuckSyncDiary.open === 'function') {
      return window.LuckSyncDiary.open();
    }
    return undefined;
  });
};
window.closeLuckSyncDiary = function() {
  return __cdLoadScriptOnce('/js/luck-sync-diary.js').then(function() {
    if (window.LuckSyncDiary && typeof window.LuckSyncDiary.close === 'function') {
      return window.LuckSyncDiary.close();
    }
    return undefined;
  });
};
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

function __cdInvokeAction(action, actionEl, event) {
  if (!action || !actionEl) return;
  if (!__cdRequireTileLockGate(actionEl)) return;

  var args = __cdParseActionArgs(actionEl.getAttribute('data-action-args'));

  function runInvoke() {
    var out = __cdInvokeActionWithConfig(action, actionEl, event, args);

    var loader = __cdLazyActionLoaders[action];
    var hasFn = typeof window[action] === 'function';
    if (!loader || hasFn || out !== undefined) return;

    // prem-gate 4Ï¢? ÏΩîÏù∏ Ï∞®Í∞ê ??_cdInvokeActionDirectÍ∞Ä Ï≤òÎ¶¨?òÎ?Î°?    // ?Ä??ÏµúÏ¥à ?¥Î¶≠ ???¨Í∏∞??lazy-load/?¨Ìò∏Ï∂?Ï§ëÎ≥µ Î∞©Ï?
    if (!hasFn && actionEl && Number(actionEl.getAttribute('data-coin-cost') || 0) > 0) {
      if (action === 'gotoZiweiPremium' || action === 'gotoAstrologyPremium' ||
          action === 'gotoSukuyoPremium' || action === 'gotoVedicPremium') return;
    }

    if (!__cdLazyActionState[action]) {
      __cdLazyActionState[action] = loader().catch(function(err) {
        console.error('[index-inline-runtime] lazy action load failed:', action, err);
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
        } else if (action === 'gotoZiweiPremium' && typeof window.openZiweiBookModal === 'function') {
          window.openZiweiBookModal();
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
    });
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

function __cdHydrateCollectionImagesChunked(collection) {
  if (!collection) return;
  var wraps = collection.querySelectorAll('.tarot-tile__img-wrap[data-img-src]');
  var ioEnabled = typeof IntersectionObserver !== 'undefined';

  function hydrateWrap(wrap) {
    if (!wrap || wrap.querySelector('img.tarot-tile__img')) return;
    var src = wrap.getAttribute('data-img-src');
    if (!src) return;
    var alt = wrap.getAttribute('data-img-alt') || '';
    var placeholder = wrap.querySelector('.tarot-tile__img-placeholder');
    if (placeholder) placeholder.style.display = 'none';

    var skeleton = document.createElement('div');
    skeleton.className = 'tarot-tile__img-skeleton';
    wrap.insertBefore(skeleton, wrap.firstChild);

    var img = document.createElement('img');
    img.className = 'tarot-tile__img';
    img.loading = 'lazy';
    img.fetchPriority = 'low';
    img.decoding = 'async';
    img.width = 200;
    img.height = 150;
    img.alt = alt;
    img.onload = function() { skeleton.remove(); };
    img.onerror = function() { skeleton.remove(); };
    img.src = src;
    wrap.insertBefore(img, wrap.firstChild);
  }

  if (!ioEnabled) {
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

function __cdScheduleCollectionHydration(collection) {
  var start = function() { __cdHydrateCollectionImagesChunked(collection); };
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
        actionEl.setAttribute('aria-label', currentLabel.replace(/?¥Í∏∞|?´Í∏∞/, newState ? '?´Í∏∞' : '?¥Í∏∞'));
      }

      if (newState) {
        __cdScheduleCollectionHydration(collection);
      } else {
        __cdReleaseCollectionImagesChunked(collection);
      }
      return;
    }

    __cdInvokeAction(action, actionEl, event);
  });

  /* Î™®Î∞î?? modal-top-nav ?´Í∏∞ Î≤ÑÌäº touchend ?¥Î∞± (Î°úÎî© Ï§?Î∞úÎèô Î∞©Ï?: ?¥Îãπ overlayÍ∞Ä ?§Ï†ú ?úÏãú Ï§ëÏùº ?åÎßå) */
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

function __cdBindAnimalTotemTileDirect() {
  var sel = '.tarot-tile--animal-totem, [data-action="openAnimalTotemModal"]';
  var touchStart = null;
  var lastTouchStart = null;
  /* Î™®Î∞î?? ?§ÌÅ¨Î°???ÎØ∏ÏÑ∏ ?ÄÏßÅÏûÑ ?àÏö© (10pxÎ°?Ï∂ïÏÜå?òÏó¨ ?§ÌÅ¨Î°??§Îèô??Î∞©Ï?) */
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
      // ?Ä?Ä ÏΩîÏù∏ Í≤åÏù¥??Ï≤¥ÌÅ¨ ?Ä?Ä
      var _tile = document.querySelector('.tarot-tile--animal-totem[data-coin-cost], [data-action="openAnimalTotemModal"][data-coin-cost]');
      var _coinCost = _tile ? Number(_tile.getAttribute('data-coin-cost') || 0) : 0;
      if (_coinCost > 0 && _tile && !_tile.getAttribute('data-pvw-bypass')) {
        if (typeof window._cdOpenTilePreview === 'function' && window._cdOpenTilePreview(_tile)) return;
        if (typeof window._cdCoinGatePerUse === 'function') {
          window._cdCoinGatePerUse(_coinCost, '?†ÎãàÎ©Ä ?†ÌÖú Î¶¨Îî©', function() { _doOpenTotem(); });
          return;
        }
        // ?†Ô∏è ÎØ∏Î°úÍ∑∏Ïù∏ ?ÅÌÉú: _cdCoinGatePerUse ÎØ∏Ï†ï??        var token = '';
        if (__cdIsAdminLikeUser()) {
          _doOpenTotem();
          return;
        }
        var token = '';
        try { token = localStorage.getItem('fortune_auth_token') || ''; } catch(_) {}
        if (!token) {
          if (window.confirm('?îí Î°úÍ∑∏?∏Ïù¥ ?ÑÏöî???úÎπÑ?§ÏûÖ?àÎã§.\nÎ°úÍ∑∏?????¥Ïö©??Ï£ºÏÑ∏??')) {
            window.location.href = '/login?next=%2F';
          }
          return;
        }
        // Î°úÍ∑∏???ÅÌÉú?∏Îç∞ _cdCoinGatePerUseÍ∞Ä ?ÜÏúºÎ©??§Î•òÎ°?Í∞ÑÏ£º
        window.alert('?úÎπÑ???§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§. ?†Ïãú ???§Ïãú ?úÎèÑ??Ï£ºÏÑ∏??');
        return;
      }
      // ?Ä?Ä ÏΩîÏù∏ Í≤åÏù¥???µÍ≥º ?Ä?Ä
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
        loadScriptOnce('js/services/animal-totem-content-engine.js?v=20260328-dreamcute-v2')
          .then(function() { return loadScriptOnce('js/animal-totem-experience.js?v=20260328-dreamcute-v2'); })
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
    /* touchStartÎ°??úÏûë?àÍ±∞?? elementFromPointÎ°??∞Ïπò ?ÑÏπòÍ∞Ä ?†ÌÖú ?Ä?ºÏù∏ Í≤ΩÏö∞ (Î™®Î∞î??event.target Î∂Ä?ïÌôï ?ÄÎπ? */
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

  /* ÏßÅÏ†ë Î∞îÏù∏?? ?ÑÏûÑ???§Ìå®?òÎäî ?òÍ≤Ω(?§Î≤Ñ?àÏù¥/?§ÌÉù Ïª®ÌÖç?§Ìä∏) ?ÄÎπ?*/
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
          /* touchstart ÎØ∏Ïàò????elementFromPointÎ°??∞Ïπò ?¥Ï†ú ?ÑÏπò ?ïÏù∏ (Î™®Î∞î???Ä?? */
          var elAt = (typeof document.elementFromPoint === 'function') ? document.elementFromPoint(x, y) : null;
          if (!elAt || !tile.contains(elAt)) return;
        }
        if (ev.cancelable) ev.preventDefault();
        openTotemModal();
      }, { passive: false });
    });
  }
  bindDirectToTiles();
  /* ?ôÏ†Å ?ΩÏûÖ ?ÄÎπ? ?§Ìîå?òÏãú ?úÍ±∞ ???¨Î∞î?∏Îî© */
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
 * ?¥Î™Ö??ÍΩ??Ä????Î™®Î∞î???∞Ïπò ÏßÅÏ†ë Î∞îÏù∏?? * click ?¥Î≤§?∏Í? ?§ÌÅ¨Î°??§Ï??¥ÌîÑ?Ä Ï∂©Îèå??Î™®Î∞î?ºÏóê??ÎØ∏Î∞ú?ôÌïò??Î¨∏Ï†ú ?¥Í≤∞
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
    /* touchStartÎ°??úÏûë?àÍ±∞?? elementFromPointÎ°??∞Ïπò ?¥Ï†ú ?ÑÏπòÍ∞Ä ÍΩ??Ä?ºÏù∏ Í≤ΩÏö∞ (Î™®Î∞î??event.target Î∂Ä?ïÌôï ?ÄÎπ? */
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
          /* touchstart ÎØ∏Ïàò????elementFromPointÎ°??∞Ïπò ?¥Ï†ú ?ÑÏπò ?ïÏù∏ (Î™®Î∞î???Ä?? */
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
  for (var i = 0; i < ids.length; i++) {
    var el = document.getElementById(ids[i]);
    if (el) el.style.display = 'none';
  }
  window.scrollTo(0, 0);
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

/* Î™®Î∞î??containment ?¥Í≤∞: transform:translateZ(0) Î∂ÄÎ™???fixedÍ∞Ä Î∑∞Ìè¨???Ä??Î∂ÄÎ™?Í∏∞Ï??ºÎ°ú Î∞∞Ïπò?òÎäî ?¥Ïäà.
   ???§Î≤Ñ?àÏù¥?§Ï? body ÏßÅÍ≥ÑÍ∞Ä ?ÑÎãàÎ©?Î™®Î∞î?ºÏóê???îÎ©¥????Î≥¥ÏûÑ ??bodyÎ°??¥Îèô */
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
    __cdEnsureModalOverlaysInBody();
    _cdInitAfterSplash();
    __cdBindAnimalTotemTileDirect();
    __cdBindDestinyFlowerTileDirect();
    setTimeout(__cdBindGlobalActionsFallback, 0);
  }, { once: true });
} else {
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
    console.warn('[DestinyFlower] ?ôÏ†Å SVG ?ùÏÑ± ?§Ìå®:', e);
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
    if (labelEl) labelEl.textContent = '?å∏ ?¥Î™Ö??ÍΩ??§Ïãú ?ºÏö∞Í∏?;
    var arrowEl = cta.querySelector('.feature-card__cta-arrow');
    if (arrowEl) arrowEl.textContent = '??;
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
    '?ëÏûêÎ¶?: 'Aries',
    '?©ÏÜå?êÎ¶¨': 'Taurus',
    '?çÎë•?¥ÏûêÎ¶?: 'Gemini',
    'Í≤åÏûêÎ¶?: 'Cancer',
    '?¨Ïûê?êÎ¶¨': 'Leo',
    'Ï≤òÎ??êÎ¶¨': 'Virgo',
    'Ï≤úÏπ≠?êÎ¶¨': 'Libra',
    '?ÑÍ∞à?êÎ¶¨': 'Scorpio',
    '?¨Ïàò?êÎ¶¨': 'Sagittarius',
    '?ºÏÜå?êÎ¶¨': 'Capricorn',
    'Î¨ºÎ≥ë?êÎ¶¨': 'Aquarius',
    'Î¨ºÍ≥†Í∏∞ÏûêÎ¶?: 'Pisces'
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

  // ?êÎ??êÏàò¬∑?êÏÑ±???±Ï? ?ëÎ†• Í∏∞Ï?. ?åÎ†• ?ÖÎ†• ???ëÎ†•?ºÎ°ú Î≥Ä?òÌïò??Î™ÖÍ∂Å ?±Ïù¥ ?ïÌôï??Í≥ÑÏÇ∞?òÎèÑÎ°???
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
      console.warn('[DestinyFlower] ?åÎ†•?íÏñë??Î≥Ä???§Ìå®, ?êÎ≥∏ ?¨Ïö©:', e);
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
      // Strict SwissEph Î™®Îìú ÎØ∏Ï?Îπ??úÏóê??Ï°∞Ïö©???àÍ±∞??Ï∞®Ìä∏Î°??¥Î∞± ?úÎèÑ.
      if (!(window.AstroEngine && typeof window.AstroEngine.calcAll === 'function')) {
        console.warn('[DestinyFlower] ?êÏÑ±??Î∏åÎ¶¨ÏßÄ Í≥ÑÏÇ∞ ?§Ìå®:', e);
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
      console.warn('[DestinyFlower] ?êÏÑ±??Î∏åÎ¶¨ÏßÄ Í≥ÑÏÇ∞ ?§Ìå®:', e2);
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
  // ?ùÎÖÑ?îÏùº???àÏúºÎ©???ÉÅ ?¥Îãπ ?∞Ïù¥?∞Î°ú ?¨Í≥Ñ?? _currentZiweiData???¥Ï†Ñ ?¨Ïö©??Î™®Îã¨ Ï°∞Ìöå Ï∫êÏãú?¥Î?Î°?  // ?¥Î™Ö??ÍΩ??ÑÌ?Î¶¨Ïóê?êÏÑú???¨Ïö©?òÏ? ?äÏùå(?òÎ™ª??Î™ÖÍ∂Å Í≤∞Í≥º Î∞©Ï?).
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
    console.warn('[DestinyFlower] ?êÎ??êÏàò Î∏åÎ¶¨ÏßÄ Í≥ÑÏÇ∞ ?§Ìå®:', e);
  }
  return null;
}

function _dfDeriveZiweiDomain(ziweiRaw) {
  if (!ziweiRaw || typeof ziweiRaw !== 'object') return null;

  var palaceIdx = -1;
  if (Array.isArray(ziweiRaw.palacesByIndex)) {
    palaceIdx = ziweiRaw.palacesByIndex.indexOf('Î™ÖÍ∂Å');
  }
  if (palaceIdx < 0) palaceIdx = 0;

  var palace = (Array.isArray(ziweiRaw.palacesByIndex) && ziweiRaw.palacesByIndex[palaceIdx]) || 'Î™ÖÍ∂Å';
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
    mainStar: starNames.join(' ¬∑ '),
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
    console.warn('[DestinyFlower] ?ôÏöî ?¨Î†• Î≥Ä???§Ìå®:', e);
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
    console.warn('[DestinyFlower] ?ôÏöî Î∏åÎ¶¨ÏßÄ Í≥ÑÏÇ∞ ?§Ìå®:', e2);
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
      console.warn('[DestinyFlower] ?ÑÎ°ú??Î°úÎìú ?§Ìå®:', e);
    }
    return {};
  }

  function sameBirth(a, b) {
    if (!a || !b) return false;
    var sameYmd = Number(a.year || 0) === Number(b.year || 0)
      && Number(a.month || 0) === Number(b.month || 0)
      && Number(a.day || 0) === Number(b.day || 0);
    if (!sameYmd) return false;

    // snapshot ?∞Ïù¥?∞Ïóê ??Î∂??¨Î†• ?Ä?ÖÏù¥ ?ÜÎäî Í≤ΩÏö∞Í∞Ä ?àÏñ¥, ?ëÏ™Ω Í∞íÏù¥ Î™®Îëê ?àÏùÑ ?åÎßå ?ÑÍ≤© ÎπÑÍµê?úÎã§.
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
      console.warn('[DestinyFlower] ?¨Ï£º ?¨Í≥Ñ???§Ìå®:', e2);
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

  // ?ùÎÖÑ?îÏùº ?µÏã¨ ?ïÎ≥¥Í∞Ä ?ÑÌ? ?ÜÏúºÎ©??¥Î™Ö??ÍΩÉÏùÑ Í≥ÑÏÇ∞?òÏ? ?äÎäî??
  // (Îπ??ÅÌÉú?êÏÑú???¥Îñ§ ÍΩÉÎèÑ ?∏Ï∂ú?òÏ? ?äÍ≥† ?àÎÇ¥ Î¨∏Íµ¨Îß?Î≥¥Ïó¨Ï£ºÍ∏∞ ?ÑÌï®)
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
    console.warn('[DestinyFlower] Îß§Ïπ≠ ?§Ìå®:', e2);
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
    console.warn('[AstrologyFlower] Îß§Ïπ≠ ?§Ìå®:', e);
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
      name: '?±Ïö¥ ?ºÎ≤§??,
      scientific_name: 'Lavandula nebula',
      symbolism: 'Î≥ÑÎπõ??Í≤∞ÏùÑ ?∞Îùº ?êÎ•¥??Ï≤?™Ö??ÏßÅÍ?',
      primary_color: '#8D99FF',
      secondary_color: '#C77DFF',
      keywords: ['nebula', 'zodiac', 'stardust'],
      particle_type: 'stardust_air',
      vibe_message: 'Î≥ÑÏùò Î¶¨Îì¨???∞Îùº ?∏Ìù°?òÎ©¥ ÏßÅÍ????†Î™Ö?¥Ïßë?àÎã§.'
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
    if (labelEl) labelEl.textContent = '???êÏÑ±??ÍΩ??§Ïãú ?åÌôò?òÍ∏∞';
    var arrowEl = cta.querySelector('.feature-card__cta-arrow');
    if (arrowEl) arrowEl.textContent = '??;
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

  nameEl.textContent = selection.flower.name + ' ¬∑ ' + (selection.flower.scientific_name || 'Unknown species');
  symbolismEl.textContent = matched.astro_verdict || matched.narrative || '?êÏÑ±??Ï∞®Ìä∏ Í∏∞Î∞ò ?¥Î™ÖÍΩÉÏùÑ ?êÎèÖ Ï§ëÏûÖ?àÎã§.';
  keywordsEl.textContent = 'zodiac flower keywords ¬∑ ' + selection.keywords.join(' ??');
  if (sunBadgeEl) sunBadgeEl.textContent = chart.sun_sign ? ('?úÏñëÍ∂?' + chart.sun_sign) : '?úÏñëÍ∂?ÎØ∏Ìôï??;
  if (risingBadgeEl) risingBadgeEl.textContent = chart.rising_sign ? ('?ÅÏäπÍ∂?' + chart.rising_sign) : '?ÅÏäπÍ∂?ÎØ∏Ìôï??;
  if (moonBadgeEl) moonBadgeEl.textContent = chart.moon_sign ? ('?¨Í∂Å ' + chart.moon_sign) : '?¨Í∂Å ÎØ∏Ìôï??;
  if (dataLineEl) {
    dataLineEl.textContent = (flowerData.focus_signal || 'Ï∞®Ìä∏ ?úÍ∑∏???ÄÍ∏?) + ' ¬∑ ' + (flowerData.ritual_tip || 'Î≥ÑÏùò Î¶¨Îì¨??Í≥†Ï†ï Ï§ëÏûÖ?àÎã§.');
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
    // ?êÎ??êÏàò ?∞Ïù¥?∞Îäî Î™ÖÍ∂ÅÎø??ÑÎãà??Í∞?Í∂ÅÏùò Ï£ºÏÑ± ?ïÎ≥¥Î•??®Íªò ?†Ï??úÎã§.
    // (?îÏßÑ/?åÎçîÍ∞Ä Í∂ÅÎ≥Ñ Î≥??ïÎ≥¥Î•?Ï∞∏Ï°∞?????ÑÎùΩ?òÏ? ?äÎèÑÎ°???
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
              .replace(/\(Ï∞®ÏÑ±\)/g, ' ')
              .replace(/?îÎ°ù|?îÍ∂å|?îÍ≥º|?îÍ∏∞/g, ' ')
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

          var mingIdx = zw.palacesByIndex.indexOf('Î™ÖÍ∂Å');
          var mingStars = [];
          var brightness = '';
          if (mingIdx >= 0 && zw.stars[mingIdx] && zw.stars[mingIdx].main && zw.stars[mingIdx].main.length) {
            mingStars = zw.stars[mingIdx].main.map(cleanStarName).filter(Boolean);
          }
          if (mingIdx >= 0 && zw.palaceStarData && zw.palaceStarData[mingIdx] && zw.palaceStarData[mingIdx].stars && zw.palaceStarData[mingIdx].stars[0]) {
            brightness = String(zw.palaceStarData[mingIdx].stars[0].strength || '');
          }
          var mainStar = mingStars.join(' ¬∑ ');
          var allMainStars = Object.keys(allStarSet);
          payload = payload && typeof payload === 'object' ? payload : {};
          payload.ziwei = {
            mainStar: mainStar,
            palace: 'Î™ÖÍ∂Å',
            brightness: brightness,
            stars: mingStars,
            palaces: palaceRows,
            allMainStars: allMainStars
          };
          payload.domains = payload.domains && typeof payload.domains === 'object' ? payload.domains : {};
          payload.domains.ziwei = {
            main_star: mainStar,
            palace: 'Î™ÖÍ∂Å',
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
    console.warn('[JamidusuFlower] Îß§Ïπ≠ ?§Ìå®:', e);
  }
  if (!_dfHasReadySourceData('jamidusu', payload)) return null;
  if (!matched) return null;

  var flower = matched && matched.flower;
  if (!flower) {
    flower = {
      id: 'peony_ziwei',
      name: 'Î™®Î?',
      scientific_name: 'Paeonia suffruticosa',
      symbolism: '?úÏôï??Í∏∞ÌíàÍ≥?Ï§ëÏã¨????,
      primary_color: '#D946EF',
      secondary_color: '#F9A8D4',
      keywords: ['?úÏôï', 'Í∏∞Ìíà', 'Ï§ëÏã¨'],
      particle_type: 'imperial_petal',
      vibe_message: 'Ï§ëÏã¨??ÏßÄ?§Îäî ?úÎèÑÍ∞Ä Í≤∞Íµ≠ Í∞Ä??Î©ÄÎ¶?Í∞ëÎãà??'
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
    if (labelEl) labelEl.textContent = '?å∫ ?êÎ??êÏàò ÍΩ??§Ïãú ?åÌôò?òÍ∏∞';
    var arrowEl = cta.querySelector('.feature-card__cta-arrow');
    if (arrowEl) arrowEl.textContent = '??;
  }
  syncFeatureCardHeight(card);
}

function _jfApplyCardVisual(card, selection) {
  if (!card || !selection) return;
  var matched = selection.matched || {};
  var flowerData = selection.flowerData || matched.flower_data || {};
  var ziwei = matched.ziwei || {};
  var intensity = matched.visual_intensity || { glow: 0.7, saturation: 0.8, mist: 0.2, brightness_label: '??Âπ?' };
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

  nameEl.textContent = selection.flower.name + ' ¬∑ ' + (selection.flower.scientific_name || 'Unknown species');
  symbolismEl.textContent = matched.jamidusu_verdict || matched.narrative || '?§Îäò??Í∞ïÌïú Î≥?Í∏∞Î∞ò ?¥Î™ÖÍΩÉÏùÑ ?êÎèÖ Ï§ëÏûÖ?àÎã§.';
  keywordsEl.textContent = 'ziwei flower keywords ¬∑ ' + selection.keywords.join(' ??');
  if (starBadgeEl) {
    var starLine = Array.isArray(ziwei.primary_stars) ? ziwei.primary_stars.join('¬∑') : 'Ï£ºÏÑ± ÎØ∏Ìôï??;
    starBadgeEl.textContent = '?§Îäò??Í∞ïÌïú Î≥?' + starLine;
  }
  if (brightBadgeEl) brightBadgeEl.textContent = 'Î≥?Î∞ùÍ∏∞ ' + (ziwei.brightness || intensity.brightness_label || '??Âπ?');
  if (palaceBadgeEl) palaceBadgeEl.textContent = ziwei.palace || 'ÎØ∏Ìôï??;
  if (dataLineEl) {
    dataLineEl.textContent = (flowerData.focus_signal || 'Ï£ºÏÑ± ?úÍ∑∏???ÄÍ∏?) + ' ¬∑ ' + (flowerData.ritual_tip || 'Î≥ÑÏùò Í∏∞Ïö¥???ïÎ†¨ Ï§ëÏûÖ?àÎã§.');
  }

  if (mist) {
    mist.style.background =
      'radial-gradient(circle at 22% 38%, ' + _dfHexToRgba(selection.primary, 0.24) + ', transparent 56%),'
      + 'radial-gradient(circle at 72% 64%, ' + _dfHexToRgba(selection.secondary, 0.22) + ', transparent 60%)';
  }

  var shouldFall = Array.isArray(ziwei.primary_stars) && ziwei.primary_stars.some(function(s) {
    return /Ï≤úÍ∏∞|?úÏùå/.test(String(s || ''));
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
      popupEl.textContent = (card.__jfKeywords || []).join(' ¬∑ ') || '?úÏôï??Í∏∞Ìíà';
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
    console.warn('[SukuyoFlower] Îß§Ïπ≠ ?§Ìå®:', e);
  }
  if (!_dfHasReadySourceData('sukuyo', payload)) return null;
  if (!matched) return null;

  var flower = matched && matched.flower;
  if (!flower) {
    flower = {
      id: 'moon_lily',
      name: 'Î∞±Ìï©',
      scientific_name: 'Lilium candidum',
      symbolism: '?¨Îπõ ?çÏóê??ÎßëÍ≤å ?ºÏñ¥?òÎäî ?òÌò∏??ÍΩ?,
      primary_color: '#F8FAFC',
      secondary_color: '#93C5FD',
      keywords: ['?¨Îπõ', '?òÌò∏', '?ïÌôî'],
      particle_type: 'lunar_pollen',
      vibe_message: '?§Îäò Î∞??¨Ïùò ?∏Ìù°Í≥?Î¶¨Îì¨??ÎßûÏ∂îÎ©??†ÌÉù?????†Î™Ö?¥Ïßë?àÎã§.'
    };
  }

  var theme = matched && matched.theme ? matched.theme : {};
  var primary = _dfSafeColor((flower.primary_color || (theme.palette && theme.palette.primary)), '#F8FAFC');
  var secondary = _dfSafeColor((flower.secondary_color || (theme.palette && theme.palette.secondary)), '#93C5FD');
  var sukuyo = (matched && matched.sukuyo) || {};
  var keywords = Array.isArray(flower.keywords) && flower.keywords.length
    ? flower.keywords.slice(0, 5)
    : [sukuyo.mansion_name || '?ôÏöî', sukuyo.guardian_animal || '?òÌò∏?ôÎ¨º', sukuyo.moon_phase || '?¨ÏúÑ??];

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
    if (labelEl) labelEl.textContent = '?åô ?ôÏöî ÍΩ??§Ïãú ?åÌôò?òÍ∏∞';
    var arrowEl = cta.querySelector('.feature-card__cta-arrow');
    if (arrowEl) arrowEl.textContent = '??;
  }
  syncFeatureCardHeight(card);
}

function _sfApplyCardVisual(card, selection) {
  if (!card || !selection) return;
  var matched = selection.matched || {};
  var flowerData = selection.flowerData || matched.flower_data || {};
  var sukuyo = matched.sukuyo || {};
  var intensity = matched.visual_intensity || { glow: 0.72, halo: 0.56, moon_style: 'lunar_flow', moon_label: '?ÅÌòÑ/?òÌòÑ?? };
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

  nameEl.textContent = selection.flower.name + ' ¬∑ ' + (selection.flower.scientific_name || 'Unknown species');
  symbolismEl.textContent = matched.sukuyo_verdict || matched.narrative || '?ôÏöî 27??Í∏∞Î∞ò ?¥Î™ÖÍΩÉÏùÑ ?êÎèÖ Ï§ëÏûÖ?àÎã§.';
  keywordsEl.textContent = 'sukuyo flower keywords ¬∑ ' + selection.keywords.join(' ??');
  if (mansionBadgeEl) {
    var mansionLabel = _dfNormalizeSukuyoMansionLabel(sukuyo.mansion_name);
    var groupLabel = _dfNormalizeSukuyoGroupLabel(sukuyo.group);
    mansionBadgeEl.textContent = (mansionLabel || '??ÎØ∏Ìôï??) + (groupLabel ? (' ¬∑ ' + groupLabel) : '');
  }
  if (phaseBadgeEl) phaseBadgeEl.textContent = '???ÑÏÉÅ ' + (sukuyo.moon_phase || intensity.moon_label || '?êÏ†ï ?ÄÍ∏?);
  if (guardianBadgeEl) guardianBadgeEl.textContent = '?òÌò∏?ôÎ¨º ' + (sukuyo.guardian_animal || 'ÎØ∏Ìôï??);
  if (dataLineEl) {
    dataLineEl.textContent = (flowerData.focus_signal || '?ôÏöî ?úÍ∑∏???ÄÍ∏?) + ' ¬∑ ' + (flowerData.ritual_tip || '?¨Ïùò Î¶¨Îì¨???ôÍ∏∞??Ï§ëÏûÖ?àÎã§.');
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

  nameEl.textContent = selection.flower.name + ' ¬∑ ' + (selection.flower.scientific_name || 'Unknown species');
  symbolismEl.textContent = stageContent.symbolism || sajuVerdict;
  keywordsEl.textContent = sourceMeta.labelKo + ' ?§Ïõå??¬∑ ' + (_dfToArray(selection.keywords).join(' ??') || sourceMeta.fallbackKeyword);
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
    labelKo: '?¨Ï£º',
    stickerMain: '?õÊü±',
    stickerSub: 'Native',
    description: '',
    fallbackKeyword: 'saju ??bloom ??destiny'
  },
  astrology: {
    labelKo: '?êÏÑ±??,
    stickerMain: 'Zodiac',
    stickerSub: 'Star',
    description: '',
    fallbackKeyword: 'zodiac ??nebula ??stardust'
  },
  jamidusu: {
    labelKo: '?êÎ??êÏàò',
    stickerMain: 'Á¥´ÂæÆ',
    stickerSub: 'Purple Star',
    description: '',
    fallbackKeyword: 'ziwei ??ming-gong ??imperial bloom'
  },
  sukuyo: {
    labelKo: '?ôÏöî??,
    stickerMain: '27-Suk',
    stickerSub: 'ÂÆøÊõú',
    description: '',
    fallbackKeyword: 'sukuyo ??lunar mansion ??moon bloom'
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
  _coinGatePassToken: null  // ÏΩîÏù∏ Í≤åÏù¥???†ÌÅ∞ (?¥Î? ÏΩúÎ∞±?? ?∏Î? ?∏Ï∂ú Î∞©Ïñ¥)
};

var _DF_STUDIO_TITLE = '?å∏ ?¥Î™Ö??ÍΩ??ÑÌ?Î¶¨Ïóê';
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
  if (!nextSource) return 'Î™®Îì† ÍΩÉÏù¥ Í∞úÌôî?òÏóà?µÎãà?? ?êÌïò????óê???§Ïãú Í∞êÏÉÅ??Î≥¥ÏÑ∏??';
  if (nextSource === 'saju') return '?§Ïùå ?®Í≥Ñ: ?¨Ï£º ÍΩÉÏùÑ Î®ºÏ? ?¥Ïñ¥ Í∞úÌôîÎ•??úÏûë??Î≥¥ÏÑ∏??';
  return '?§Ïùå ?®Í≥Ñ: ' + _dfGetSourceLabel(nextSource) + ' ÍΩÉÏúºÎ°??¥Îèô??Í∞úÌôîÎ•??¥Ïñ¥Í∞Ä?∏Ïöî.';
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
      var lockLabel = required ? (_dfGetSourceLabel(required) + ' ?ÑÎ£å ???¥Í∏à') : '?¥Í∏à Ï°∞Í±¥ ?ÑÏöî';
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
    _dfSetStudioStatus('??' + _dfGetSourceLabel(newlyUnlocked[0]) + ' ÍΩÉÏù¥ ?àÎ°ú ?¥Î†∏?µÎãà??');
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
    console.warn('[DestinyFlower] ?µÌï© ?∞Ïù¥??Í≥ÑÏÇ∞ ?§Ìå® (' + normalizedSource + '):', e);
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
  if (!selection) return '?¥Î™Ö??ÍΩ??êÏ†ï??Ï§ÄÎπ?Ï§ëÏûÖ?àÎã§.';
  var matched = selection.matched || {};
  if (matched.sukuyo_verdict) return matched.sukuyo_verdict;
  if (matched.jamidusu_verdict) return matched.jamidusu_verdict;
  if (matched.astro_verdict) return matched.astro_verdict;
  if (matched.saju_verdict) return matched.saju_verdict;
  if (matched.verdict) return matched.verdict;
  var flower = selection.flower || {};
  var flowerName = flower.name || '?¥Î™Ö??ÍΩ?;
  var latin = flower.scientific_name ? ' (' + flower.scientific_name + ')' : '';
  if (selection.source === 'sukuyo') {
    return '?ôÏöî?êÏúºÎ°?Î≥????πÏã†??ÍΩÉÏ? ' + flowerName + latin + ' ?ÖÎãà??';
  }
  if (selection.source === 'jamidusu') {
    return '?êÎ??êÏàòÎ°?Î≥????πÏã†??ÍΩÉÏ? ' + flowerName + latin + ' ?ÖÎãà??';
  }
  if (selection.source === 'astrology') {
    return '?êÏÑ±?†Î°ú Î≥????πÏã†??ÍΩÉÏ? ' + flowerName + latin + ' ?ÖÎãà??';
  }
  return '?¨Ï£ºÎ°?Î≥????πÏã†??ÍΩÉÏ? ' + flowerName + latin + ' ?ÖÎãà??';
}

function _dfElementLabelKo(raw) {
  var map = {
    wood: 'Î™???',
    fire: '????',
    earth: '????',
    metal: 'Í∏???',
    water: '??Ê∞?',
    Wood: 'Î™???',
    Fire: '????',
    Earth: '????',
    Metal: 'Í∏???',
    Water: '??Ê∞?'
  };
  return map[String(raw || '').trim()] || String(raw || '').trim();
}

function _dfJohuLabel(raw) {
  var v = String(raw || '').trim().toLowerCase();
  if (!v) return '?êÏ†ï ?ÄÍ∏?;
  if (v === 'hot' || v === 'warm') return '?®Ï°∞(Ê∫´Áá•)';
  if (v === 'cold' || v === 'cool') return '?úÏäµ(ÂØíÊøï)';
  if (v === 'temperate' || v === 'balanced') return 'Ï§ëÌôî(‰∏?íå)';
  return String(raw || '').trim();
}

function _dfJoinElementLabels(list) {
  var arr = _dfToArray(list).map(_dfElementLabelKo).filter(Boolean);
  return arr.length ? arr.join(' ¬∑ ') : '?êÏ†ï ?ÄÍ∏?;
}

function _dfNormalizeSukuyoMansionLabel(raw) {
  var text = String(raw || '').trim();
  if (!text) return '';
  text = text.replace(/^??s+/, '').trim();
  if (text.indexOf('¬∑') >= 0) text = text.split('¬∑')[0].trim();
  if (text.indexOf('|') >= 0) text = text.split('|')[0].trim();
  return text;
}

function _dfNormalizeSukuyoGroupLabel(raw) {
  var text = String(raw || '').trim();
  if (!text) return '';
  text = text.replace(/^Í∑∏Î£π\s+/, '').trim();
  if (/Í∑∏Î£π$/.test(text)) return text;
  text = text.replace(/??/, '').trim();
  return text ? (text + ' Í∑∏Î£π') : '';
}

function _dfGetSajuBadges(selection) {
  var saved = selection && selection.saju_badges;
  if (saved && typeof saved === 'object' && saved.mode === 'sukuyo') {
    return {
      mode: 'sukuyo',
      mansion: _dfNormalizeSukuyoMansionLabel(saved.mansion) || 'ÎØ∏Ìôï??,
      group: _dfNormalizeSukuyoGroupLabel(saved.group || ''),
      phase: saved.phase || 'ÎØ∏Ìôï??,
      guardian: saved.guardian || 'ÎØ∏Ìôï??
    };
  }
  if (saved && typeof saved === 'object' && saved.mode === 'jamidusu') {
    return {
      mode: 'jamidusu',
      star: saved.star || 'ÎØ∏Ìôï??,
      brightness: saved.brightness || 'ÎØ∏Ìôï??,
      palace: saved.palace || 'ÎØ∏Ìôï??
    };
  }
  if (saved && typeof saved === 'object' && saved.mode === 'astrology') {
    return {
      mode: 'astrology',
      sun: saved.sun || 'ÎØ∏Ìôï??,
      rising: saved.rising || 'ÎØ∏Ìôï??,
      moon: saved.moon || 'ÎØ∏Ìôï??
    };
  }
  if (saved && typeof saved === 'object' && saved.mode !== 'astrology') {
    return {
      mode: 'saju',
      strength: saved.strength || '?êÏ†ï ?ÄÍ∏?,
      yongshin: saved.yongshin || '?êÏ†ï ?ÄÍ∏?,
      johu: saved.johu || '?êÏ†ï ?ÄÍ∏?
    };
  }

  var matched = selection && selection.matched ? selection.matched : {};
  if ((selection && selection.source === 'sukuyo') || matched.source === 'sukuyo') {
    var sy = matched.sukuyo || {};
    return {
      mode: 'sukuyo',
      mansion: _dfNormalizeSukuyoMansionLabel(sy.mansion_name) || 'ÎØ∏Ìôï??,
      group: _dfNormalizeSukuyoGroupLabel(sy.group || ''),
      phase: sy.moon_phase || (matched.visual_intensity && matched.visual_intensity.moon_label) || 'ÎØ∏Ìôï??,
      guardian: sy.guardian_animal || 'ÎØ∏Ìôï??
    };
  }
  if ((selection && selection.source === 'jamidusu') || matched.source === 'jamidusu') {
    var ziwei = matched.ziwei || {};
    var stars = Array.isArray(ziwei.primary_stars) ? ziwei.primary_stars.join('¬∑') : '';
    return {
      mode: 'jamidusu',
      star: stars || 'ÎØ∏Ìôï??,
      brightness: ziwei.brightness || (matched.visual_intensity && matched.visual_intensity.brightness_label) || 'ÎØ∏Ìôï??,
      palace: ziwei.palace || 'ÎØ∏Ìôï??
    };
  }
  if ((selection && selection.source === 'astrology') || matched.source === 'astrology') {
    var chart = matched.chart || {};
    return {
      mode: 'astrology',
      sun: chart.sun_sign || 'ÎØ∏Ìôï??,
      rising: chart.rising_sign || 'ÎØ∏Ìôï??,
      moon: chart.moon_sign || 'ÎØ∏Ìôï??
    };
  }

  var payload = selection && selection.payload ? selection.payload : {};
  var analysis = payload.analysis || {};
  var saju = payload.saju || {};

  var strength = '';
  if (analysis.power_label) strength = String(analysis.power_label);
  else if (saju.power_label) strength = String(saju.power_label);
  else if (typeof analysis.isStrong === 'boolean') strength = analysis.isStrong ? '?†Í∞ï' : '?†ÏïΩ';
  else if (typeof saju.is_strong === 'boolean') strength = saju.is_strong ? '?†Í∞ï' : '?†ÏïΩ';
  else strength = '?êÏ†ï ?ÄÍ∏?;

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
      badge1: '?úÏñëÍ∂?' + (badges.sun || 'ÎØ∏Ìôï??),
      badge2: '?ÅÏäπÍ∂?' + (badges.rising || 'ÎØ∏Ìôï??),
      badge3: '?¨Í∂Å ' + (badges.moon || 'ÎØ∏Ìôï??),
      scenarioTitle: matched.astro_verdict || matched.narrative || '?êÏÑ±??Î≥ÑÏûêÎ¶?Í∞úÌôî ?úÎÇòÎ¶¨Ïò§Î•?Í≥ÑÏÇ∞ Ï§ëÏûÖ?àÎã§.',
      dataLine: (flowerData.focus_signal || 'Ï∞®Ìä∏ ?úÍ∑∏???ÄÍ∏?) + ' ¬∑ ' + (flowerData.ritual_tip || '?±Ïö¥ Î¶¨Îì¨???ïÎ†¨ Ï§ëÏûÖ?àÎã§.'),
      symbolism: matched.astro_verdict || matched.narrative || ''
    };
  }

  if (source === 'jamidusu') {
    return {
      badge1: '?§Îäò??Í∞ïÌïú Î≥?' + (badges.star || 'ÎØ∏Ìôï??),
      badge2: 'Î≥?Î∞ùÍ∏∞ ' + (badges.brightness || 'ÎØ∏Ìôï??),
      badge3: 'Í∂ÅÏúÑ ' + (badges.palace || 'ÎØ∏Ìôï??),
      scenarioTitle: matched.jamidusu_verdict || matched.narrative || '?êÎ??êÏàò Ï£ºÏÑ± Í∞úÌôî ?úÎÇòÎ¶¨Ïò§Î•?Í≥ÑÏÇ∞ Ï§ëÏûÖ?àÎã§.',
      dataLine: (flowerData.focus_signal || 'Ï£ºÏÑ± ?úÍ∑∏???ÄÍ∏?) + ' ¬∑ ' + (flowerData.ritual_tip || '?úÏôï??Í∏∞Ïö¥??Ï°∞Ïú® Ï§ëÏûÖ?àÎã§.'),
      symbolism: matched.jamidusu_verdict || matched.narrative || ''
    };
  }

  if (source === 'sukuyo') {
    return {
      badge1: badges.mansion || 'ÎØ∏Ìôï??,
      badge2: '???ÑÏÉÅ ' + (badges.phase || 'ÎØ∏Ìôï??),
      badge3: '?òÌò∏?ôÎ¨º ' + (badges.guardian || 'ÎØ∏Ìôï??),
      scenarioTitle: matched.sukuyo_verdict || matched.narrative || '?ôÏöî ?¨Îπõ Í∞úÌôî ?úÎÇòÎ¶¨Ïò§Î•?Í≥ÑÏÇ∞ Ï§ëÏûÖ?àÎã§.',
      dataLine: (flowerData.focus_signal || '?ôÏöî ?úÍ∑∏???ÄÍ∏?) + ' ¬∑ ' + (flowerData.ritual_tip || '?¨Ïùò Î¶¨Îì¨???ôÍ∏∞??Ï§ëÏûÖ?àÎã§.'),
      symbolism: matched.sukuyo_verdict || matched.narrative || ''
    };
  }

  return {
    badge1: flowerData.day_master_badge || '?ºÍ∞Ñ ?êÎèÖ ?ÄÍ∏?,
    badge2: (flowerData.season_label || 'Í≥ÑÏ†à') + ' Í≤?,
    badge3: (flowerData.environment_label || '?òÍ≤Ω') + ' Î¨¥Îìú',
    scenarioTitle: flowerData.scenario_title || '?ºÍ∞Ñ-?òÍ≤Ω Í∞úÌôî ?úÎÇòÎ¶¨Ïò§Î•?Í≥ÑÏÇ∞ Ï§ëÏûÖ?àÎã§.',
    dataLine: (flowerData.ritual_tip || '') + ((flowerData.ritual_tip && flowerData.focus_signal) ? ' ¬∑ ' : '') + (flowerData.focus_signal || 'ÍΩ??∞Ïù¥???úÌä∏Î•?Ï§ÄÎπ?Ï§ëÏûÖ?àÎã§.'),
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
      { cls: 'is-strength', label: '??, value: badges.mansion },
      { cls: 'is-yongshin', label: '???ÑÏÉÅ', value: badges.phase },
      { cls: 'is-johu', label: '?òÌò∏?ôÎ¨º', value: badges.guardian }
    ]
    : (badges.mode === 'jamidusu'
      ? [
        { cls: 'is-strength', label: '?§Îäò??Í∞ïÌïú Î≥?, value: badges.star },
        { cls: 'is-yongshin', label: 'Î≥?Î∞ùÍ∏∞', value: badges.brightness },
        { cls: 'is-johu', label: 'Í∂ÅÏúÑ', value: badges.palace }
      ]
      : (badges.mode === 'astrology'
        ? [
          { cls: 'is-strength', label: '?úÏñëÍ∂?, value: badges.sun },
          { cls: 'is-yongshin', label: '?ÅÏäπÍ∂?, value: badges.rising },
          { cls: 'is-johu', label: '?¨Í∂Å', value: badges.moon }
        ]
        : [
          { cls: 'is-strength', label: '?†Í∞ï/?†ÏïΩ', value: badges.strength },
          { cls: 'is-yongshin', label: '?©Ïã†', value: badges.yongshin },
          { cls: 'is-johu', label: 'Ï°∞ÌõÑ', value: badges.johu }
        ]));

  wrap.innerHTML = rows.map(function(row) {
    return '<span class="df-saju-badge ' + row.cls + '"><b>' + _dfEscapeHtml(row.label) + '</b><em>' + _dfEscapeHtml(row.value || '?êÏ†ï ?ÄÍ∏?) + '</em></span>';
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
    guidance: flower.vibe_message || '?§Îäò?Ä Í≤∞Í≥ºÎ≥¥Îã§ Î¶¨Îì¨??Î®ºÏ? ÎßûÏ∂îÎ©?Í∞úÌôî ?çÎèÑÍ∞Ä Îπ®ÎùºÏßëÎãà??'
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
    console.warn('[DestinyFlower] ?àÏä§?†Î¶¨ ?Ä???§Ìå®:', e);
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
  return '?ÑÏßÅ ?∞Îèô??' + label + ' ?∞Ïù¥?∞Í? ?ÜÏäµ?àÎã§. ?ÑÎûò Î≤ÑÌäº???åÎü¨ ?πÏã†ÎßåÏùò ?¥Î™Ö??ÍΩÉÏùÑ ?ºÏõåÎ≥¥ÏÑ∏??';
}

function _dfGetNotLinkedMessage(source) {
  var normalized = _dfNormalizeSource(source);
  var label = _dfGetSourceLabel(normalized);
  return label + ' ?¥Î™Ö??ÍΩ??ÑÌ?Î¶¨Ïóê???∞Îèô?òÍ∏∞ Î≤ÑÌäº???åÎü¨??Í≥ÑÏÇ∞?©Îãà?? ?ÑÎûò Î≤ÑÌäº???åÎü¨ Í≤∞Í≥ºÎ•?Î∂àÎü¨?§ÏÑ∏??';
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
    + '<button id="dfStudioEmptyLoadButton" type="button" class="df-studio-link-btn df-bloom-btn" aria-label="?¥Î™Ö??ÍΩ??∞Îèô?òÍ∏∞">?¥Î™Ö??ÍΩ??∞Îèô?òÍ∏∞</button>';
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
  btn.textContent = isLoading ? '?∞Îèô Ï§?..' : '?¥Î™Ö??ÍΩ??∞Îèô?òÍ∏∞';
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
  if (nameEl) nameEl.textContent = _dfGetSourceLabel(normalized) + ' ?∞Ïù¥???∞Îèô ?ÄÍ∏?;
  if (latinEl) latinEl.textContent = 'Data not linked';
  if (dayMasterEl) dayMasterEl.textContent = _dfGetSourceLabel(normalized) + ' ?êÎèÖ ?ÄÍ∏?;
  if (symbolismEl) symbolismEl.textContent = message || _dfGetNoDomainDataMessage(normalized);
  if (keywordsEl) keywordsEl.textContent = _dfGetSourceLabel(normalized) + ' keywords ¬∑ loading';
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
  _dfSetStudioStatus(_dfGetSajuVerdict(selection) + ' Í≤∞Í≥ºÎ•??Ä?•ÌïòÍ±∞ÎÇò Ïπ¥Ïπ¥?§ÌÜ°?ºÎ°ú Í≥µÏú†?????àÏäµ?àÎã§.');
  return selection;
}

function _dfReloadSourceData(source, options) {
  var opts = options && typeof options === 'object' ? options : {};
  var normalized = _dfNormalizeSource(source || _dfStudioState.activeSource || 'saju');
  if (!opts.silentStatus) {
    _dfSetStudioStatus('?∞Ïù¥?∞Î? ?§Ïãú Î∂àÎü¨?§Îäî Ï§ëÏûÖ?àÎã§. ?†ÏãúÎß?Í∏∞Îã§?§Ï£º?∏Ïöî.');
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
        console.warn('[DestinyFlower] ?îÏßÑ Î∂Ä?∏Ïä§?∏Îû© ?§Ìå®:', err);
        return false;
      });
    });
  }

  if (typeof __cdEnsureLunarLibReady === 'function') {
    loader = loader.then(function() {
      return __cdEnsureLunarLibReady().catch(function(err) {
        console.warn('[DestinyFlower] ?åÎ†• ?ºÏù¥Î∏åÎü¨Î¶?Î°úÎìú ?§Ìå®:', err);
        return false;
      });
    });
  }

  if (normalized === 'astrology' && typeof __cdEnsureSwissEphLoaded === 'function') {
    loader = loader.then(function() {
      return __cdEnsureSwissEphLoaded().catch(function(err) {
        console.warn('[DestinyFlower] SwissEph Î°úÎìú ?§Ìå®:', err);
        return false;
      });
    });
  }

  if (typeof __cdEnsureSajuCoreLoaded === 'function') {
    loader = loader.then(function() {
      return __cdEnsureSajuCoreLoaded().catch(function(err) {
        console.warn('[DestinyFlower] ?∞Ïù¥??Î°úÎìú Ï§ÄÎπ??§Ìå®:', err);
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
    _dfSetStudioStatus(_dfGetSourceLabel(normalized) + ' ?∞Ïù¥?∞Î? ?∞Îèô Ï§ëÏûÖ?àÎã§. ?†ÏãúÎß?Í∏∞Îã§?§Ï£º?∏Ïöî.', {
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
      // ?¥Î¶≠?ºÎ°ú ?ªÏ? 1Ï∞?Í≤∞Í≥ºÎ•?Í∑∏Î?Î°?Î∞òÏòÅ?¥Ïïº fallback ?åÎûòÍ∑??åÍ±∞ ??      // ?¨Í≥Ñ??null)Î°???ñ¥?®Ï????åÍ?Î•?ÎßâÏùÑ ???àÎã§.
      _dfStudioState.selection = selection;
      _dfApplyStudioSelection(selection);
      _dfHideStudioEmptyState();
      var main = document.querySelector('.df-studio-main');
      if (main) main.style.display = '';
      _dfSetStudioStatus(_dfGetSourceLabel(normalized) + ' ?∞Ïù¥?∞Î? Î∂àÎü¨?îÏäµ?àÎã§.');
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
    text = text ? (text + ' ¬∑ ' + flowGuide) : flowGuide;
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
  if (!snapshot) return '?¥Î™Ö??ÍΩ?Í≤∞Í≥ºÎ•?Ï§ÄÎπ?Ï§ëÏûÖ?àÎã§.';
  var sourceLabel = snapshot.source === 'sukuyo'
    ? '?ôÏöî??
    : (snapshot.source === 'jamidusu' ? '?êÎ??êÏàò' : (snapshot.source === 'astrology' ? '?êÏÑ±?? : '?¨Ï£º'));
  var sajuVerdict = snapshot.saju_verdict || (sourceLabel + 'Î°?Î≥????πÏã†??ÍΩÉÏ? ' + snapshot.name + ' ?ÖÎãà??');
  var lines = [
    '?å∏ ?¥Î™Ö??ÍΩ??ÑÌ?Î¶¨Ïóê Í≤∞Í≥º',
    '',
    sajuVerdict,
    snapshot.name + ' (' + snapshot.scientific_name + ')',
    snapshot.day_master_badge ? ((snapshot.source === 'astrology' ? 'Ï∞®Ìä∏ Î∞∞Ï?: ' : (snapshot.source === 'jamidusu' ? 'Ï£ºÏÑ± Î∞∞Ï?: ' : (snapshot.source === 'sukuyo' ? '?ôÏöî Î∞∞Ï?: ' : '?ºÍ∞Ñ Î∞∞Ï?: '))) + snapshot.day_master_badge) : '',
    snapshot.symbolism,
    '?§Ïõå?? ' + _dfToArray(snapshot.keywords).join(' ??'),
    '?îÎ†à?? ' + snapshot.primary + ' / ' + snapshot.secondary,
    '?ÖÏûê Î¨¥Îìú: ' + snapshot.particle_type
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
    ? '?ôÏöî??
    : (source === 'jamidusu' ? '?êÎ??êÏàò' : (source === 'astrology' ? '?êÏÑ±?? : '?¨Ï£º'));
}

function _dfGetPromptArtDirection(source) {
  if (source === 'astrology') {
    return {
      mood: 'Î≥ÑÎπõ ?±Ïö¥Í≥??§Ïò® Í∏ÄÎ°úÏö∞Í∞Ä Í∞êÎèÑ??Î™ΩÌôò???åÎ°ú??,
      lighting: 'moonlit rim light, cosmic dust volumetric light',
      background: 'deep navy nebula sky with subtle zodiac traces',
      composition: 'hero blossom centered, spiral petal motion, celestial particles'
    };
  }
  if (source === 'jamidusu') {
    return {
      mood: '?úÏôï???àÍ≤©Í≥?Í∂ÅÏ§ë???ïÏ†úÎØ∏Í? Í≥µÏ°¥?òÎäî ?åÎ°ú??,
      lighting: 'royal soft spotlight, silky ambient glow',
      background: 'imperial jade and plum gradient with star map motif',
      composition: 'symmetrical ceremonial bloom, layered velvet petals'
    };
  }
  if (source === 'sukuyo') {
    return {
      mood: '?¨Îπõ Î™ÖÏÉÅÍ≥?Í≥†Ïöî???òÎ©¥ Í∞ôÏ? Ï≤?™Ö???åÎ°ú??,
      lighting: 'silver moon halo, soft mist backlight',
      background: 'midnight blue sky with lunar mansion orbit lines',
      composition: 'single moon-bloom portrait, floating pollen and orbit arcs'
    };
  }
  return {
    mood: '?§Ìñâ??Í≤∞ÏùÑ ?∞Îùº ?ºÏñ¥?òÎäî ?úÏ†ï???ôÏñë ?åÎ°ú??,
    lighting: 'soft dawn light, translucent petal glow',
    background: 'seasonal gradient inspired by wood fire earth metal water',
    composition: 'centered blossom portrait, elegant negative space, subtle petal drift'
  };
}

function _dfAstroElementFromSign(sign) {
  var v = String(sign || '').trim().toLowerCase();
  if (!v) return '';
  if (/aries|leo|sagittarius|?ëÏûêÎ¶??¨Ïûê?êÎ¶¨|?¨Ïàò?êÎ¶¨/.test(v)) return 'fire';
  if (/taurus|virgo|capricorn|?©ÏÜå?êÎ¶¨|Ï≤òÎ??êÎ¶¨|?ºÏÜå?êÎ¶¨/.test(v)) return 'earth';
  if (/gemini|libra|aquarius|?çÎë•?¥ÏûêÎ¶?Ï≤úÏπ≠?êÎ¶¨|Î¨ºÎ≥ë?êÎ¶¨/.test(v)) return 'air';
  if (/cancer|scorpio|pisces|Í≤åÏûêÎ¶??ÑÍ∞à?êÎ¶¨|Î¨ºÍ≥†Í∏∞ÏûêÎ¶?.test(v)) return 'water';
  return '';
}

function _dfExtractFiveElements(text) {
  var src = String(text || '');
  var list = [];
  ['Î™?, '??, '??, 'Í∏?, '??].forEach(function(el) {
    if (src.indexOf(el) >= 0) list.push(el);
  });
  return list;
}

function _dfBuildYongshinCareLine(yongshinText) {
  var careByElement = {
    'Î™?: '?ÑÏπ® ?áÏÇ¥???úÎäî ?ôÏ™Ω Ï∞ΩÍ??êÏÑú 8Î∂??§Ìä∏?àÏπ≠?ºÎ°ú ?ùÏû•?êÏùÑ Íπ®Ïö∞Í∏?,
    '??: '?®Ìñ• ÎπõÏùÑ 5Î∂?Ï¨êÎ©∞ ?§Îäò??Î™©ÌëúÎ•??åÎ¶¨ ?¥Ïñ¥ ?†Ïñ∏?òÍ∏∞',
    '??: '?ëÏóÖ Í≥µÍ∞Ñ ??Íµ¨Ïó≠???ïÎ¶¨??Ï§ëÏã¨ Ï∂ïÏùÑ ?®Îã®???∏Ïö∞Í∏?,
    'Í∏?: '?∞ÏÑ†?úÏúÑ 3Í∞ÄÏßÄÎ•??ÅÍ≥† Î∂àÌïÑ?îÌïú ?ΩÏÜç??Í≥ºÍ∞ê??Í∞ÄÏßÄÏπòÍ∏∞',
    '??: '?Ä??10Î∂??∞Ï±ÖÍ≥??òÎ∂Ñ Î≥¥Ï∂©?ºÎ°ú Í∞êÏ†ï???úÌôòÎ°??¥Í∏∞'
  };
  var elements = _dfExtractFiveElements(yongshinText);
  if (!elements.length) {
    return 'Îπ??§Ï†Ñ)Í≥??òÎ∂Ñ(?Ä?? Î£®Ìã¥??Í≥†Ï†ï??Í∏∞Ï¥à ?ùÏú° Î¶¨Îì¨??Î®ºÏ? ?àÏ†ï?îÌïò?∏Ïöî.';
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
    ? '?†Î¶¨ ?îÍ∏∞, ?§Î≤Ñ ?ÑÎ†à?? ÎØ∏ÏÑ∏ Ï°∞Î™Ö'
    : (source === 'jamidusu'
      ? '?àÌã¥ ?®Î∏åÎ¶? Î∏åÎ°†Ï¶??§Î∏å?? ?ÄÏπ?òï ?∏ÎùºÎØ?
      : (source === 'sukuyo'
        ? '?úÎ¶¨ ?†Î¶¨, ?¨Îπõ ??Î¶∞ÎÑ®, Î¨ºÍ≤∞ Î¨¥Îä¨ ?∏Î†à??
        : 'Î¨¥Í¥ë ?∏ÎùºÎØ? ?¥Ï∂î???∞Îìú, ?îÏûî???®ÌÑ¥ ?®Î∏åÎ¶?));
  return 'Ï∂îÏ≤ú Ïª¨Îü¨: Primary ' + primary + ', Secondary ' + secondary + ', Accent ' + accent + ' / Ï∂îÏ≤ú ?åÏû¨: ' + materials + '.';
}

function _dfBuildAtelierExtension(selection, sourceLabel, badges, flowerData, sajuVerdict) {
  var source = _dfNormalizeSource(selection && selection.source);
  var flower = (selection && selection.flower) || {};
  var primary = _dfSafeColor(selection && selection.primary, '#f472b6');
  var secondary = _dfSafeColor(selection && selection.secondary, '#22d3ee');
  var scenarioTitle = flowerData.scenario_title || (sourceLabel + ' Í∞úÌôî ?úÎÇòÎ¶¨Ïò§');
  var growthCycle = flowerData.growth_cycle || 'Í∞úÌôî ?¨Ïù¥??Í≥ÑÏÇ∞ ?ÄÍ∏?;
  var ritualTip = flowerData.ritual_tip || '?§Îäò???§Ï≤ú Î£®Ìã¥??Í≥ÑÏÇ∞ Ï§ëÏûÖ?àÎã§.';
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
    var sun = badges.sun || 'ÎØ∏Ìôï??;
    var rising = badges.rising || sun;
    var moon = badges.moon || sun;
    var risingEl = _dfAstroElementFromSign(rising) || _dfAstroElementFromSign(sun) || 'air';
    var moonEl = _dfAstroElementFromSign(moon) || risingEl;
    var lighting = risingEl === 'fire'
      ? '?úÏó¨Î¶??ïÏò§Ï≤òÎüº Í∞ÅÎèÑÍ∞Ä ?íÏ? Í∞ïÎ†¨???úÏñëÍ¥?
      : (risingEl === 'earth'
        ? '??? ?§ÌõÑ???©Í∏àÎπõÏù¥ ?§Îûò Î®∏Î¨¥???àÏ†ï??Í¥ëÎüâ'
        : (risingEl === 'water'
          ? '?àÎ≤Ω?òÏùò Ï∞®Í????∏Î•∏ ÎπõÏù¥ Ï≤úÏ≤ú??Î≤àÏ???Ï°∞ÎèÑ'
          : 'Î∞îÎûåÍ≤∞Ï≤ò??Í∏∞Ïö∏?¥ÏßÑ ?¨ÏÑ†Í¥ëÏù¥ Í≥µÍ∞Ñ??Í∞ÄÎ≥çÍ≤å ?¨Îäî Ï°∞ÎèÑ'));
    var humidity = moonEl === 'water'
      ? 'Í∞êÏÑ± ?µÎèÑÍ∞Ä ?íÏ? ?§Î≤Ñ ÎØ∏Ïä§???ÅÌÉú'
      : (moonEl === 'fire'
        ? '?¥Í∏∞Î•??àÏ? ?úÎùº???êÏñ¥, Í∞êÏ†ï Î∞òÏùë??Îπ†Î•∏ ?ÅÌÉú'
        : (moonEl === 'earth'
          ? '?àÏ†ï?ÅÏù∏ ?†Î∂Ñ ?µÎèÑ, Í∞êÏ†ï???úÏÑú???çÏùµ???ÅÌÉú'
          : 'Í∞ÄÎ≥çÍ≥† ?†Îèô?ÅÏù∏ Î∏åÎ¶¨Ï¶??µÎèÑ, ?ÑÏù¥?îÏñ¥Í∞Ä Îπ†Î•¥Í≤??òÍ∏∞?òÎäî ?ÅÌÉú'));
    var cosmicSeason = risingEl === 'fire'
      ? 'Í∞úÌôî Í∞Ä?çÍ∏∞: ?§ÌñâÍ≥?Î∞úÌëúÍ∞Ä ÍΩÉÎ¥â?§Î¶¨Î•?Î∞Ä???¨Î¶¨??Íµ¨Í∞Ñ'
      : (risingEl === 'water'
        ? '?¥Î©¥ ?ëÎ∂ÑÍ∏? ?¥ÏãùÍ≥?ÏßÅÍ???ÎøåÎ¶¨Ï∏µÏùÑ Ï±ÑÏö∞??Íµ¨Í∞Ñ'
        : 'Í∑†Ìòï Ï°∞Ïú®Í∏? Íµ¨Ï°∞?Ä Í∞êÏÑ±??ÍµêÏ∞®?òÎ©∞ ?§Ïùå ÍΩÉÎàà??Ï§ÄÎπÑÌïò??Íµ¨Í∞Ñ');

    sectionTitle = 'Ï≤úÏ≤¥??Ï°∞ÎèÑ?Ä ?êÎÑàÏßÄ';
    matrix = [
      '?ÄÔ∏?Ï≤úÏ≤¥??Ï°∞ÎèÑ: ' + lighting,
      '?íß ?ÄÍ∏∞Ïùò ?µÎèÑ: ' + humidity,
      '?™ê ?∞Ï£º??Í≥ÑÏ†à: ' + cosmicSeason
    ];
    observationLog = '?ïÏõê?¨Ïùò Í¥ÄÏ∞??ºÏ?: ?úÏñëÍ∂?' + sun + '??Î∞©Ìñ•?±Í≥º ?ÅÏäπÍ∂?' + rising + '??ÎπõÏù¥ ÍΩÉÎ???Í∞ÅÎèÑÎ•??°ÏïÑÏ§çÎãà?? ?¨Í∂Å ' + moon + '???µÎèÑ Ï°∞Ï†à??Í∞êÏ†ï ?éÎß•??Î∂Ä?úÎüΩÍ≤??¥Î©∞, ?¥Î≤à Ï£ºÎäî Í∏∞ÌöåÍ∞Ä Î®ºÏ? Î≥¥Ïù¥??Í∞úÌôî ?ÑÏ°∞ Íµ¨Í∞Ñ?ÖÎãà??';
    secretRecipe = 'ÎπÑÎ? ?àÏãú?? Î∞?9???¥ÌõÑ Ï∞ΩÍ? Ï°∞Î™Ö?????®Í≥Ñ ??∂îÍ≥? ?¥Ïùº ?§Ìñâ????Í∞ÄÏßÄÎ•??∏Ìä∏ Ï≤?Ï§ÑÏóê ?ÅÏñ¥ ?êÏÑ∏?? ?ÑÏπ® Ï≤?12Î∂ÑÏ? Í∑???Í∞ÄÏßÄ?êÎßå ÏßëÏ§ë?òÎ©¥ Î≥ÑÎπõ Î¶¨Îì¨??Í∞Ä??Îπ†Î•¥Í≤?ÎßûÏ∂∞ÏßëÎãà??';
    flowerLanguage = '?¥Î™Ö??ÍΩÉÎßê: Î≥ÑÏùò Í∞ÅÎèÑÎ•?ÎØøÍ≥† ??Í±∏Ïùå??Î®ºÏ? ?¥Îîõ???©Í∏∞.';
    gardenerWord = '??ÍΩÉÏùÑ ?ÑÌïú Í∞Ä?úÎÑà????ÎßàÎîî: ?§Îäò??ÏßÅÍ∞ê?Ä Í≥ºÏû•???ÑÎãà???àÎ≥¥?ÖÎãà?? ?ëÏ? ?§Ìñâ???±Ïö¥???ÑÏã§??ÍΩÉÎ∞≠?ºÎ°ú Î∞îÍøâ?àÎã§.';
    particleMood = sourceLabel + '??Í¥ëÎüâ???ÖÏûêÎ°?Î≤àÏó≠?òÎ©¥ "' + (flower.particle_type || 'stardust') + '" Í≤∞Ïù¥ Í∞Ä???àÏ†ï?ÅÏúºÎ°?ÎπõÎÇ©?àÎã§.';
  } else if (source === 'jamidusu') {
    var star = badges.star || 'ÎØ∏Ìôï??;
    var brightness = badges.brightness || 'ÎØ∏Ìôï??;
    var palace = badges.palace || 'ÎØ∏Ìôï??;
    var structure = /?êÎ?|zi ?wei/i.test(star)
      ? '?êÎ???Í≥ÑÏó¥???©Ïã§ Í∏∞Ìíà??ÍπÉÎì† ?®Îã®??ÍΩÉÎ?'
      : (/Ïπ†ÏÇ¥|?åÍµ∞|qisha|pogun/i.test(star)
        ? '?åÌåå???•Íµ∞ Í∏∞Ïßà??ÎßåÎì† ÍµµÍ≥† Í∞ïÏßÅ??Ï§ÑÍ∏∞'
        : (/?úÏùå|tai ?yin|Ï≤úÍ∏∞|tian ?ji/i.test(star)
          ? '?†Ïó∞?òÏ?Îß??ΩÍ≤å Í∫æÏù¥ÏßÄ ?äÎäî ?∏Î???Î≥µÏ∏µ ÍΩÉÏûé'
          : 'Í∑†Ìòï??Ï£ºÏÑ±??ÎßåÎì† ?ïÏ†ú???ÄÏπ?Íµ¨Ï°∞??ÍΩÉÍ≥®Í≤?));
    var social = palace + ' Ï£ºÎ??ºÎ°ú ?òÎπÑ?Ä Î≤åÏù¥ ?úÌôò?òÎìØ, Í∞ÄÍπåÏö¥ ?∏Ïó∞????ï† Î∂ÑÎã¥???òÎà† ?±Ïû•???ïÎäî ?êÎ¶Ñ?ÖÎãà??';
    var thorns = /????????.test(brightness)
      ? 'Î∞©Ïñ¥?•Ïù¥ ?íÏ? ÏßßÏ? Í∞Ä?úÍ? Ï¥òÏ¥ò??Í≤ΩÍ≥ÑÎ•??∏ÏõåÏ£ºÎäî ?úÍ∏∞'
      : 'ÎπõÏùÑ Î∞òÏÇ¨?òÎäî Í≤?Î¨¥Îä¨Í∞Ä Í∞Ä????ï†???Ä?†Ìï¥ ?àÍ≤© ?àÍ≤å ?êÏã†??Î≥¥Ìò∏?òÎäî ?úÍ∏∞';

    sectionTitle = 'ÍΩÉÏùò ?àÍ≤©Í≥??ïÌÉú';
    matrix = [
      '?èõÔ∏?ÍΩÉÏùò Í≥®Í≤©: ' + structure,
      '?¶ã ?òÎπÑ?Ä Î≤? ' + social,
      '?åµ ?òÌò∏??Í∞Ä?? ' + thorns
    ];
    observationLog = '?ïÏõê?¨Ïùò Í¥ÄÏ∞??ºÏ?: ?§Îäò??Í∞ïÌïú Î≥?' + star + '??Ï§ÑÍ∏∞ Ï§ëÏã¨??Í≥ßÍ≤å ?∏Ïö∞Í≥? Î≥?Î∞ùÍ∏∞ ' + brightness + 'Í∞Ä ÍΩÉÏûé???§Í∏∞Î•?Ï°∞Ï†ï?©Îãà?? ÏßÄÍ∏àÏ? ?îÎ†§?®Î≥¥??Íµ¨Ï°∞???ÑÏÑ±?ÑÍ? ?±Í≥ºÎ•??§Ïö∞???úÍ∏∞?ÖÎãà??';
    secretRecipe = 'ÎπÑÎ? ?àÏãú?? Ï±ÖÏÉÅ ?ºÏ™Ω??Î©îÌÉà Í≥ÑÏó¥ ?§Î∏å?úÎ? ?òÎÇò ?êÍ≥†, ?§Îäò??Í∏∞Ï? 1Í∞úÏ? ?ëÎ≥¥??1Í∞úÎ? ?ôÏãú??Í∏∞Î°ù?òÏÑ∏?? Í≤ΩÍ≥ÑÍ∞Ä ?†Î™Ö?¥Ïßà?òÎ°ù ÍΩÉÏ? ???∞ÏïÑ?òÍ≤å ?çÎãà??';
    flowerLanguage = '?¥Î™Ö??ÍΩÉÎßê: ?àÍ≤©?Ä ?®Îã®??Íµ¨Ï°∞?êÏÑú ?ºÏñ¥?òÎäî Í∞Ä??Ï°∞Ïö©??Í¥ëÏ±Ñ.';
    gardenerWord = '??ÍΩÉÏùÑ ?ÑÌïú Í∞Ä?úÎÑà????ÎßàÎîî: ?îÎ†§?®ÏùÑ ?úÎëêÎ•¥Ï? ÎßàÏÑ∏?? Í∏∞Ï???ÏßÄ???òÎ£®Í∞Ä Í≤∞Íµ≠ Í∞Ä???§ÎûòÍ∞Ä??ÍΩÉÎ?Î•?ÎßåÎì≠?àÎã§.';
    particleMood = sourceLabel + '???ÑÍ≥ÑÎ•??ÖÏûêÎ°?Î≤àÏó≠?òÎ©¥ "' + (flower.particle_type || 'imperial') + '" Î¨¥ÎìúÍ∞Ä ÏßàÏÑúÎ•?Í∞Ä???ÑÎ¶Ñ?µÍ≤å ?úÎü¨?ÖÎãà??';
  } else if (source === 'sukuyo') {
    var mansion = badges.mansion || 'ÎØ∏Ìôï??;
    var phase = badges.phase || 'ÎØ∏Ìôï??;
    var guardian = badges.guardian || '?òÌò∏?ôÎ¨º ÎØ∏Ìôï??;
    var scent = /Ïπ???friend/i.test(mansion)
      ? '?¨Îπõ ?ÑÎûò Î≤àÏ????Ä?Ä???îÏù¥??Î®∏Ïä§??Í≥ÑÏó¥'
      : (/????danger/i.test(mansion)
        ? 'ÏßôÍ≥† ÍπäÏ? Ïπ®Ìñ• Í≥ÑÏó¥, ÏßëÏ§ë?•ÏùÑ ?åÏñ¥?¨Î¶¨????
        : 'Ï≤?™Ö???àÎ∏å ?åÎ°ú??Í≥ÑÏó¥, Í¥ÄÍ≥ÑÏùò ?®ÎèÑÎ•?Î∂Ä?úÎüΩÍ≤?ÎßûÏ∂î????);
    var dew = /Î≥¥Î¶Ñ|full/i.test(phase)
      ? 'Î∞§Ïù¥?¨Ïù¥ Í∞Ä??Ï∂©Îßå???ÅÍ∞êÍ≥?Í∞êÏ†ï ?úÌòÑ???ôÏãú???çÏÑ±???ÅÌÉú'
      : (/??new/i.test(phase)
        ? '?¥Ïä¨???áÍ≤å Îß∫Ìûà???†Ïõî Íµ¨Í∞Ñ?ºÎ°ú, Í¥ÄÏ∞∞Í≥º Ï§ÄÎπÑÍ? ?∞ÏÑ†???ÅÌÉú'
        : '?ÅÎãπ???¥Ïä¨?âÏúºÎ°?Í∞êÏ†ï??Í∑†ÌòïÍ≥??§Ìñâ?•Ïù¥ ?®Íªò ?êÎùº???ÅÌÉú');
    var companion = /??dragon/i.test(guardian)
      ? '?±ÎÇòÎ¨¥Ï? Î∏îÎ£®?∏Ïù¥ÏßÄ Ï°∞Ìï©, ???ïÏû• ?êÎ¶Ñ??ÏßÄÏßÄ'
      : (/Í∞?dog/i.test(guardian)
        ? 'Î°úÏ¶àÎ©îÎ¶¨?Ä Ï∫êÎ™®ÎßàÏùº Ï°∞Ìï©, Í¥ÄÍ≥??àÏ†ïÍ≥??åÎ≥µ ?ÑÎ†• Í∞ïÌôî'
        : (/?∏Îûë??tiger/i.test(guardian)
          ? '?†ÏπºÎ¶ΩÌà¨?§Ï? Î£®ÎìúÎ≤†ÌÇ§??Ï°∞Ìï©, Í≤∞Îã®?•Í≥º Î≥¥Ìò∏ Î≥∏Îä• Í∞ïÌôî'
          : '?ºÎ≤§?îÏ? ?ÑÏù¥Îπ?Ï°∞Ìï©, ?ïÏÑú ?àÏ†ïÍ≥??•Í∏∞ ?±Ïû• ?ôÏãú ÏßÄ??));

    sectionTitle = '?∏Ïó∞???•Í∏∞?Ä ?¥Ïä¨';
    matrix = [
      '?åô ?¥Î™Ö???•Í∏∞: ' + scent,
      '?í¶ Î∞§Ïù¥?¨Ïùò ?? ' + dew,
      '?åø ?ôÎ∞ò ?ùÎ¨º: ' + companion
    ];
    observationLog = '?ïÏõê?¨Ïùò Í¥ÄÏ∞??ºÏ?: ' + mansion + '??Í¥ÄÍ≥ÑÏÑ±?Ä ?•Í∏∞Î°?Î®ºÏ? ?úÎü¨?òÍ≥†, ???ÑÏÉÅ ' + phase + '?Ä ?¥Ïä¨??Î∞Ä?ÑÎ°ú Í∞êÏ†ï Î¶¨Îì¨??Ï°∞Ï†à?©Îãà?? ÏßÄÍ∏àÏ? ?∏Ïó∞???çÎèÑÎ•??¨Ï¥â?òÍ∏∞Î≥¥Îã§ Í≤∞ÏùÑ ÎßûÏ∂î???∏Ïã¨?®Ïù¥ ÍΩÉÏùÑ ?§Îûò ÏßÄ?µÎãà??';
    secretRecipe = 'ÎπÑÎ? ?àÏãú?? ?êÍ∏∞ ??Î¨????îÏùÑ Ï≤úÏ≤ú??ÎßàÏã† ?? ?§Îäò Í≥†Îßà?†Îçò ?¥Î¶Ñ 1Í∞úÎ? Ï°∞Ïö©???ÅÏñ¥?êÏÑ∏?? ?¨Ïùò ?òÎ∂Ñ Î¶¨Îì¨???àÏ†ï?òÎ©∞ Í¥ÄÍ≥??¥Ïù¥ Î∂Ä?úÎüΩÍ≤??¥Î¶Ω?àÎã§.';
    flowerLanguage = '?¥Î™Ö??ÍΩÉÎßê: Ï°∞Ïö©??Í≥µÍ∞ê??Í∞Ä??Î©ÄÎ¶??ºÏ????•Í∏∞Í∞Ä ?úÎã§.';
    gardenerWord = '??ÍΩÉÏùÑ ?ÑÌïú Í∞Ä?úÎÑà????ÎßàÎîî: ?úÎëêÎ•¥Ï? ?äÏïÑ??Í¥úÏ∞Æ?µÎãà?? Î∞§Ïù¥?¨Ïù¥ Î™®Ïù¥?? ?πÏã†???∏Ïó∞???ïÌôï???Ä?¥Î∞ç???†Î™Ö?¥Ïßë?àÎã§.';
    particleMood = sourceLabel + '???¨Îπõ Î¶¨Îì¨???ÖÏûêÎ°?Î≤àÏó≠?òÎ©¥ "' + (flower.particle_type || 'lunar') + '" Î¨¥ÎìúÍ∞Ä Í∞Ä???¨Í∑º?òÍ≤å Í∞êÏã∏Ï§çÎãà??';
  } else {
    var strength = badges.strength || '?êÏ†ï ?ÄÍ∏?;
    var johu = badges.johu || '?êÏ†ï ?ÄÍ∏?;
    var yongshin = badges.yongshin || '';
    var soil = johu.indexOf('?úÏäµ') >= 0
      ? '?òÎ∂Ñ??Î®∏Í∏à?Ä ?µÏ????•ÌÜ†'
      : (johu.indexOf('?®Ï°∞') >= 0
        ? 'Î∞∞Ïàò?±Ïù¥ ?íÏ? ?∞Îúª???êÍ∞à ?ºÌï©??
        : '?ÖÏûêÍ∞Ä Í≥†Î•¥Í≥?ÎØ∏ÎÑ§?ÑÏù¥ ?àÏ†ï??ÎπÑÏò•???•ÌÜ†');
    var root = strength.indexOf('?†Í∞ï') >= 0
      ? 'ÎøåÎ¶¨Í∞Ä ÍπäÍ≤å Î∞ïÌ? ?∏Î? Î≥Ä?îÏóê??Ï§ëÏã¨??ÏßÄ?§Îäî ?®Í≥Ñ'
      : (strength.indexOf('?†ÏïΩ') >= 0
        ? '?¨ÏÑ∏???îÎøåÎ¶¨Í? Î®ºÏ? ?ºÏ?Î©?ÏßÄÏßÄ?ÄÎ•??ÑÏöîÎ°??òÎäî ?®Í≥Ñ'
        : 'Ï§ëÍ∞Ñ ÍπäÏù¥ ÎøåÎ¶¨Í∞Ä Í≥†Î•¥Í≤??ïÏû•?òÎäî Í∑†Ìòï ?®Í≥Ñ');
    var nutrient = _dfBuildYongshinCareLine(yongshin);

    sectionTitle = '?±Ïû•???†ÏñëÍ≥?ÎøåÎ¶¨';
    matrix = [
      '?™® ?†Ïñë???±Î∂Ñ: ' + soil,
      '?å± ÎøåÎ¶¨??ÍπäÏù¥: ' + root,
      '?ß™ Í∞Ä?úÎÑà???ÅÏñë?? ' + nutrient
    ];
    observationLog = '?ïÏõê?¨Ïùò Í¥ÄÏ∞??ºÏ?: ?§Îäò ?ïÏõê?Ä ' + soil + '??Í≤∞ÏùÑ ?†Î©∞, ' + root + ' ?êÎ¶Ñ?ºÎ°ú ?ùÏû• ?êÎÑàÏßÄÍ∞Ä ?ÄÏßÅÏûÖ?àÎã§. Í≤âÏúºÎ°?Ï°∞Ïö©??Î≥¥Ïó¨??ÎøåÎ¶¨Ï∏µÏóê?úÎäî ?§Ïùå Í∞úÌôîÎ•??ÑÌïú ?òÏù¥ ?®Îã®???Ä?•ÎêòÍ≥??àÏäµ?àÎã§.';
    secretRecipe = 'ÎπÑÎ? ?àÏãú?? Î∂ÅÏ™Ω ?êÎäî ?ôÏ™Ω Ï∞ΩÍ????∏Î•∏ ???ùÎ¨º???êÍ≥†, ?ÑÏπ® 10Î∂ÑÏ? Î™∏ÏùÑ ?ÄÍ≥??Ä??10Î∂ÑÏ? ?∏Ìù°??Í≥†Î•¥?∏Ïöî. ?òÎ£® ??Î≤àÏùò Î¶¨Îì¨ Í≥†Ï†ï???©Ïã† Í∏∞Ïö¥??Í∞Ä??Îπ†Î•¥Í≤??åÏñ¥?¨Î¶Ω?àÎã§.';
    flowerLanguage = '?¥Î™Ö??ÍΩÉÎßê: ?®Îã®??ÎøåÎ¶¨????ñ¥ Î≥¥Ïó¨??Í≤∞Íµ≠ Í∞Ä???íÍ≤å ?Ä??';
    gardenerWord = '??ÍΩÉÏùÑ ?ÑÌïú Í∞Ä?úÎÑà????ÎßàÎîî: Ï°∞Í∏â?®Î≥¥??Ï∂ïÏ†Å??ÎØøÏúº?∏Ïöî. ?§Îäò???ëÏ? Í¥ÄÎ¶¨Í? ?§Ïùå Í≥ÑÏ†à????Í≤∞Ïã§??ÎßåÎì≠?àÎã§.';
    particleMood = sourceLabel + ' Í∏∞Ïö¥??ÎØ∏ÏÑ∏???ÄÏßÅÏûÑ???ÖÏûêÎ°?Î≤àÏó≠?òÎ©¥ "' + (flower.particle_type || 'petal') + '" Î¨¥ÎìúÍ∞Ä Í∞Ä??Ï°∞ÌôîÎ°?äµ?àÎã§.';
  }

  return {
    dataSummary: '[' + sectionTitle + '] ' + scenarioTitle + ' ¬∑ ' + growthCycle,
    ritualLine: ritualTip,
    themesLine: [relation, career].filter(Boolean).join(' ¬∑ ') || 'Í¥ÄÍ≥????åÎßàÎ•?Î∂ÑÏÑù Ï§ëÏûÖ?àÎã§.',
    sourceMatrix: matrix,
    observationLog: observationLog,
    secretRecipe: secretRecipe,
    flowerLanguage: flowerLanguage,
    synergyPalette: _dfBuildSynergyPaletteText(source, primary, secondary),
    gardenerWord: gardenerWord,
    particleMood: particleMood,
    oneLineGuidance: sourceLabel + ' ?¥Î™ÖÍΩ??§Ï≤ú Í∞Ä?¥Îìú: ' + (flower.vibe_message || sajuVerdict)
  };
}

function _dfBuildPromptBadgeLine(selection) {
  var badges = _dfGetSajuBadges(selection || {});
  if (badges.mode === 'sukuyo') {
    return '?ôÏöî Î∞∞Ï?: ' + _dfOneLineText(badges.mansion, 'ÎØ∏Ìôï??) + ' / ???ÑÏÉÅ ' + _dfOneLineText(badges.phase, 'ÎØ∏Ìôï??) + ' / ?òÌò∏?ôÎ¨º ' + _dfOneLineText(badges.guardian, 'ÎØ∏Ìôï??);
  }
  if (badges.mode === 'jamidusu') {
    return '?êÎ??êÏàò Î∞∞Ï?: ?§Îäò??Í∞ïÌïú Î≥?' + _dfOneLineText(badges.star, 'ÎØ∏Ìôï??) + ' / Î≥?Î∞ùÍ∏∞ ' + _dfOneLineText(badges.brightness, 'ÎØ∏Ìôï??) + ' / Í∂ÅÏúÑ ' + _dfOneLineText(badges.palace, 'ÎØ∏Ìôï??);
  }
  if (badges.mode === 'astrology') {
    return '?êÏÑ±??Î∞∞Ï?: ?úÏñëÍ∂?' + _dfOneLineText(badges.sun, 'ÎØ∏Ìôï??) + ' / ?ÅÏäπÍ∂?' + _dfOneLineText(badges.rising, 'ÎØ∏Ìôï??) + ' / ?¨Í∂Å ' + _dfOneLineText(badges.moon, 'ÎØ∏Ìôï??);
  }
  return '?¨Ï£º Î∞∞Ï?: ?†Í∞ï/?†ÏïΩ ' + _dfOneLineText(badges.strength, '?êÏ†ï ?ÄÍ∏?) + ' / ?©Ïã† ' + _dfOneLineText(badges.yongshin, '?êÏ†ï ?ÄÍ∏?) + ' / Ï°∞ÌõÑ ' + _dfOneLineText(badges.johu, '?êÏ†ï ?ÄÍ∏?);
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
  var nameKo = _dfOneLineText(flower.name, '?¥Î™Ö??ÍΩ?);
  var latin = _dfOneLineText(flower.scientific_name, 'Unknown species');
  var symbolism = _dfOneLineText(flower.symbolism, '?¥Î™Ö???êÎ¶Ñ???ÅÏßï?òÎäî ÍΩ?);
  var narrative = _dfOneLineText((selection.matched && selection.matched.narrative) || _dfGetSajuVerdict(selection), '?¥Î™Ö??ÍΩ??úÏÇ¨');
  var scenario = _dfOneLineText(flowerData.scenario_reason || flowerData.scenario_title, 'Í∞úÌôî ?úÎÇòÎ¶¨Ïò§ Í∏∞Î∞ò ?∞Ï∂ú');
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
    guideEl.textContent = sourceLabel + ' ???îÎ†â?? ' + direction.mood + ' / ' + direction.background;
  }
  if (promptEl) promptEl.value = _dfBuildArtPrompt(selection);
  if (negativeEl) negativeEl.value = _dfBuildNegativePrompt();
}

function _dfClipboardWrite(text, onDoneMessage) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(function() { _dfSetStudioStatus(onDoneMessage || '?¥Î¶ΩÎ≥¥Îìú??Î≥µÏÇ¨?òÏóà?µÎãà??'); })
      .catch(function() { _dfSetStudioStatus('Î≥µÏÇ¨ Í∂åÌïú???ÜÏñ¥ ?òÎèô Î≥µÏÇ¨Í∞Ä ?ÑÏöî?©Îãà??'); });
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
    _dfSetStudioStatus(ok ? (onDoneMessage || '?¥Î¶ΩÎ≥¥Îìú??Î≥µÏÇ¨?òÏóà?µÎãà??') : 'Î≥µÏÇ¨???§Ìå®?àÏäµ?àÎã§.');
  } catch (e) {
    _dfSetStudioStatus('Î≥µÏÇ¨???§Ìå®?àÏäµ?àÎã§.');
  }
  document.body.removeChild(ta);
}

function _dfShareSnapshot(snapshot) {
  var text = _dfBuildShareText(snapshot);
  var isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent || '');
  if (!isMobile) {
    _dfClipboardWrite(text, 'PC ?òÍ≤Ω?êÏÑú??Ïπ¥Ïπ¥?§ÌÜ° ÎßÅÌÅ¨Î•??¥Î¶ΩÎ≥¥Îìú??Î≥µÏÇ¨?àÏäµ?àÎã§. Ïπ¥Ïπ¥?§ÌÜ°??Î∂ôÏó¨?£Ïñ¥ Í≥µÏú†?òÏÑ∏??');
    return;
  }

  var encoded = encodeURIComponent(text);
  var kakaoUrl = 'kakaotalk://send?text=' + encoded;
  var anchor = document.createElement('a');
  anchor.href = kakaoUrl;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);

  var fallbackTimer = setTimeout(function() {
    _dfClipboardWrite(text, 'Ïπ¥Ïπ¥?§ÌÜ° ?§Ìñâ???ïÏù∏?òÏ? ?äÏïÑ ?îÏïΩ???¥Î¶ΩÎ≥¥Îìú??Î≥µÏÇ¨?àÏäµ?àÎã§. Ïπ¥Ïπ¥?§ÌÜ°??Î∂ôÏó¨?£Ïñ¥ Í≥µÏú†?òÏÑ∏??');
  }, 1000);

  try {
    anchor.click();
    _dfSetStudioStatus('Ïπ¥Ïπ¥?§ÌÜ° Í≥µÏú†Î•??¨Îäî Ï§ëÏûÖ?àÎã§...');
  } catch (e) {
    clearTimeout(fallbackTimer);
    _dfClipboardWrite(text, 'Ïπ¥Ïπ¥?§ÌÜ° Í≥µÏú†Î•??¥Ï? Î™ªÌï¥ ?îÏïΩ???¥Î¶ΩÎ≥¥Îìú??Î≥µÏÇ¨?àÏäµ?àÎã§.');
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
    _dfSetStudioStatus('?ÑÏßÅ ?Ä?•Îêú Í∞úÌôî Í∏∞Î°ù???ÜÏäµ?àÎã§. ?ÑÏû¨ Í≤∞Í≥ºÎ•??Ä?•Ìï¥Î≥¥ÏÑ∏??');
    return;
  }

  var html = history.map(function(item) {
    return '<article class="df-history-item" role="listitem">'
      + '<div class="df-history-item-head">'
      + '<p class="df-history-item-name">' + _dfEscapeHtml(item.name) + '</p>'
      + '<span class="df-history-item-time">' + _dfEscapeHtml(item.savedAtLabel || _dfFormatSavedAt(item.savedAt)) + '</span>'
      + '</div>'
      + '<p class="df-history-item-keywords">' + _dfEscapeHtml(_dfToArray(item.keywords).join(' ??')) + '</p>'
      + '<div class="df-history-item-actions">'
      + '<button type="button" class="df-history-btn df-history-btn--restore" data-action="restoreDestinyFlowerSnapshot" data-action-args="' + item.id + '">Î∂àÎü¨?§Í∏∞</button>'
        + '<button type="button" class="df-history-btn df-history-btn--share" data-action="shareDestinyFlowerSnapshotById" data-action-args="' + item.id + '">Ïπ¥Ïπ¥??Í≥µÏú†</button>'
        + '<button type="button" class="df-history-btn df-history-btn--delete" data-action="deleteDestinyFlowerSnapshot" data-action-args="' + item.id + '">??†ú</button>'
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
    ? '?ôÏöî??
    : (selection.source === 'jamidusu' ? '?êÎ??êÏàò' : (selection.source === 'astrology' ? '?êÏÑ±?? : '?¨Ï£º'));
  var sourceShort = selection.source === 'sukuyo'
    ? '?ôÏöî'
    : (selection.source === 'jamidusu' ? '?êÎ??êÏàò' : (selection.source === 'astrology' ? 'Ï∞®Ìä∏' : '?¨Ï£º'));
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
    dayMasterEl.textContent = flowerData.day_master_badge || (selection.source === 'jamidusu' ? 'Ï£ºÏÑ± ?êÎèÖ ?ÄÍ∏? : (selection.source === 'sukuyo' ? '?ôÏöî ?êÎèÖ ?ÄÍ∏? : '?ºÍ∞Ñ ?êÎèÖ ?ÄÍ∏?));
  }
  if (symbolismEl) {
    symbolismEl.textContent = sajuVerdict + ' ' + (flowerData.scenario_reason || (flower.symbolism ? ('??ÍΩÉÏ? ' + flower.symbolism + '???ÅÏßï?©Îãà??') : '??ÍΩÉÏù¥ ?πÏã†???ÑÏû¨ ?¥ÏÑ∏ ?êÎ¶ÑÍ≥?Í∞ïÌïòÍ≤?Í≥µÎ™Ö?©Îãà??'));
  }
  if (keywordsEl) keywordsEl.textContent = sourceLabel + ' ?§Ïõå??¬∑ ' + _dfToArray(selection.keywords).join(' ??');
  if (narrativeEl) {
    narrativeEl.textContent = (selection.matched && selection.matched.narrative)
      || (sajuVerdict + ' ' + sourceShort + ' Í∑†Ìòï??Í∏∞Ï??ºÎ°ú ÏßÄÍ∏àÏùò Í∞úÌôî ?¨Ïù∏?∏Î? ?ïÎ†¨?àÏäµ?àÎã§.');
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
    var legacyRaw = localStorage.getItem('cd_tile_locks');
    if (legacyRaw) {
      var legacy = JSON.parse(legacyRaw);
      if (__cdMapHasTileLockUnlocked(legacy, lockKey)) return true;
    }
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

  if (__cdIsAdminLikeUser()) return true;

  if (_dfIsLockKeyUnlocked(lockKey)) return true;
  if (lockTile.classList && lockTile.classList.contains('tarot-tile--tileUnlocked')) return true;

  if (!lockTile.getAttribute('data-pvw-bypass') && typeof window._cdOpenTilePreview === 'function') {
    try {
      if (window._cdOpenTilePreview(lockTile)) return false;
    } catch (_) {}
  }

  if (!__cdHasAuthToken()) {
    if (window.confirm('?îí Î°úÍ∑∏?∏Ïù¥ ?ÑÏöî???úÎπÑ?§ÏûÖ?àÎã§.\nÎ°úÍ∑∏?????¥Ïö©??Ï£ºÏÑ∏??')) {
      window.location.href = '/login?next=%2F';
    }
    return false;
  }

  window.alert(_dfGetSourceLabel(normalized) + ' ÍΩÉÏ? ?¥Í∏à ???¥Ïö©?????àÏäµ?àÎã§.');
  return false;
}

function _dfRequireSourceCoinPayment(source) {
  var normalized = _dfNormalizeSource(source);
  if (!_dfRequirePaidSourceUnlock(normalized)) return false;
  if (_dfIsSourceUnlocked(normalized)) return true;
  var required = _dfGetRequiredSourceForUnlock(normalized);
  var requiredLabel = required ? _dfGetSourceLabel(required) : '?¥Ï†Ñ ?®Í≥Ñ';
  _dfSetStudioStatus(requiredLabel + '??Î®ºÏ? ?ÑÎ£å?òÎ©¥ ' + _dfGetSourceLabel(normalized) + ' ÍΩÉÏù¥ ?¥Î¶Ω?àÎã§.');
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
      nameEl.textContent = '?∞Ïù¥??Î∂àÎü¨?§Í∏∞ ?ÄÍ∏?;
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
    _dfSetStudioStatus(_dfGetSajuVerdict(selection) + ' Í≤∞Í≥ºÎ•??Ä?•ÌïòÍ±∞ÎÇò Ïπ¥Ïπ¥?§ÌÜ°?ºÎ°ú Í≥µÏú†?????àÏäµ?àÎã§.');
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

/* ?ÑÎ°ú??Ïπ¥Îìú ???¥Î™Ö??ÍΩ?ÏßÑÏûÖ?? ?ïÏùò ÏßÅÌõÑ window???∏Ï∂ú (?§ÌÅ¨Î¶ΩÌä∏ ?ÑÎ∞ò ?§Î•ò ?úÏóê???¨Ïö© Í∞Ä?? */
window.openDestinyFlowerStudio = openDestinyFlowerStudio;
window.openDestinyFlower = openDestinyFlower;

function _dfGetNoBirthMessage(source) {
  var normalized = _dfNormalizeSource(source);
  if (normalized === 'jamidusu') return '?êÎ??êÏàò ÍΩÉÏùÑ Î≥¥Î†§Î©??ùÎÖÑ?îÏùº???ÖÎ†•?¥Ï£º?∏Ïöî.';
  if (normalized === 'sukuyo') return '?ôÏöî??ÍΩÉÏùÑ Î≥¥Î†§Î©??ùÎÖÑ?îÏùº???ÖÎ†•?¥Ï£º?∏Ïöî.';
  return '?¥Î¶ÑÍ≥??ùÎÖÑ?îÏùº ?ïÎ≥¥Î•?Î®ºÏ? ?ÖÎ†•?òÎ©¥, ?òÎßå???¥Î™Ö??ÍΩÉÏù¥ ?¨Í∏∞?êÏÑú ?ºÏñ¥?©Îãà??';
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
      _dfSetStudioStatus(_dfGetSajuVerdict(studioSelection) + ' Í∏∞Ï??ºÎ°ú ??≥º ?ÑÎ°¨?ÑÌä∏Î•?Í∞±Ïã†?àÏäµ?àÎã§.');
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
          nameEl.textContent = '?ùÎÖÑ?îÏùº ?ÖÎ†• ?ÄÍ∏?;
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
  _dfStudioState._coinGatePassToken = null;  // ?†ÌÅ∞??Î¶¨ÏÖã
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

function goAskAIFromDestinyFlower() {
  closeDestinyFlowerStudio();
  _dfSetStudioStatus('ChatGPTÎ•?????óê???ΩÎãà?? ?¥Î¶¨ÏßÄ ?äÏúºÎ©??ùÏóÖ ?àÏö© ???§Ïãú ?úÎèÑ??Ï£ºÏÑ∏??');
  setTimeout(function() {
    var url = 'https://chatgpt.com/';
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
      _dfSetStudioStatus('????ù¥ Ï∞®Îã®??Í≤?Í∞ôÏäµ?àÎã§. Î∏åÎùº?∞Ï??êÏÑú ?ùÏóÖ???àÏö©?òÍ±∞??Ï£ºÏÜåÏ∞ΩÏóê chatgpt.com ???ÖÎ†•??Ï£ºÏÑ∏??');
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
  _dfSetStudioStatus('Í∞úÌôî Í∏∞Î°ù???Ä?•Îêò?àÏäµ?àÎã§: ' + snapshot.name + ' (' + snapshot.savedAtLabel + ')');
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
    _dfSetStudioStatus('?¥Îãπ Í∏∞Î°ù??Ï∞æÏùÑ ???ÜÏäµ?àÎã§.');
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
  _dfSetStudioStatus('?Ä?•Ìïú Í∞úÌôî Í∏∞Î°ù??Î∂àÎü¨?îÏäµ?àÎã§: ' + target.name);
}

function deleteDestinyFlowerSnapshot(snapshotId) {
  if (!snapshotId) return;
  _dfLoadHistory();
  var before = _dfStudioState.history.length;
  _dfStudioState.history = _dfStudioState.history.filter(function(item) {
    return item.id !== snapshotId;
  });
  if (_dfStudioState.history.length === before) {
    _dfSetStudioStatus('??†ú??Í∏∞Î°ù??Ï∞æÏ? Î™ªÌñà?µÎãà??');
    return;
  }
  _dfPersistHistory();
  _dfRenderHistoryList();
  _dfSetStudioStatus('?†ÌÉù??Í∞úÌôî Í∏∞Î°ù????†ú?àÏäµ?àÎã§.');
}

function clearDestinyFlowerSnapshots() {
  _dfLoadHistory();
  if (!_dfStudioState.history.length) {
    _dfSetStudioStatus('??†ú??Í∞úÌôî Í∏∞Î°ù???ÜÏäµ?àÎã§.');
    return;
  }
  var ok = window.confirm('?Ä?•Îêú ?¥Î™Ö??ÍΩ?Í∏∞Î°ù??Î™®Îëê ??†ú?†Íπå??');
  if (!ok) return;
  _dfStudioState.history = [];
  _dfPersistHistory();
  _dfRenderHistoryList();
  _dfSetStudioStatus('?Ä?•Îêú Í∞úÌôî Í∏∞Î°ù??Î™®Îëê ??†ú?àÏäµ?àÎã§.');
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
    _dfSetStudioStatus('Í≥µÏú†??Í∏∞Î°ù??Ï∞æÏùÑ ???ÜÏäµ?àÎã§.');
    return;
  }
  _dfShareSnapshot(target);
}

function copyDestinyFlowerSummary() {
  var selection = _dfStudioState.selection || openDestinyFlower() || _dfResolveSelection();
  var snapshot = _dfBuildSnapshot(selection);
  var text = _dfBuildShareText(snapshot);
  _dfClipboardWrite(text, '?îÏïΩ???¥Î¶ΩÎ≥¥Îìú??Î≥µÏÇ¨?àÏäµ?àÎã§.');
}

function copyDestinyFlowerArtPrompt() {
  var selection = _dfStudioState.selection || openDestinyFlower() || _dfResolveSelection();
  var text = _dfBuildArtPrompt(selection);
  _dfClipboardWrite(text, 'AI ÍΩ?Î©îÏù∏ ?ÑÎ°¨?ÑÌä∏Î•??¥Î¶ΩÎ≥¥Îìú??Î≥µÏÇ¨?àÏäµ?àÎã§.');
}

function copyDestinyFlowerPromptPack() {
  var selection = _dfStudioState.selection || openDestinyFlower() || _dfResolveSelection();
  var text = _dfBuildPromptPack(selection);
  _dfClipboardWrite(text, 'Î©îÏù∏/?§Í±∞?∞Î∏å ?ÑÎ°¨?ÑÌä∏ ?∏Ìä∏Î•??¥Î¶ΩÎ≥¥Îìú??Î≥µÏÇ¨?àÏäµ?àÎã§.');
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
    // [UX FIX] ?êÎèô ?†ÎãàÎ©îÏù¥???úÍ±∞ ??Î≤ÑÌäº ?¥Î¶≠?ºÎ°úÎß?ÍΩ??ÑÌ?Î¶¨Ïóê ÏßÑÏûÖ
    // _dfRunIntroBloom();
  }, { once: true });
} else {
  _dfSyncSourceTabs(_dfStudioState.activeSource || 'saju');
  _dfSyncSourceTabsLockState();
  _dfSyncSourceStickers(_dfStudioState.activeSource || 'saju');
  _dfBindBloomingInteractions();
  // [UX FIX] ?êÎèô ?†ÎãàÎ©îÏù¥???úÍ±∞ ??Î≤ÑÌäº ?¥Î¶≠?ºÎ°úÎß?ÍΩ??ÑÌ?Î¶¨Ïóê ÏßÑÏûÖ
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
  return ['??', '?êÇ', '?êÖ', '?êá', '?êâ', '?êç', '?êé', '?êë', '?êí', '?êì', '?êï', '?êñ'][(y - 4 + 120) % 12];
}

var _dpSwitchPending = null;

function _dpShowSwitchConfirm(profile, onYes) {
  _dpSwitchPending = { profile: profile, onYes: onYes };
  var b = profile.birth || {}, l = profile.location || {};
  var cal = b.calType === 'solar' ? '?ëÎ†•' : (b.calType === 'lunar_leap' ? '?åÎ†•(??' : '?åÎ†•');
  var dateStr = cal + ' ' + b.year + '.'
    + String(b.month || 1).padStart(2, '0') + '.' + String(b.day || 1).padStart(2, '0')
    + ' ¬∑ ' + String(b.hour != null ? b.hour : 12).padStart(2, '0')
    + ':' + String(b.minute != null ? b.minute : 0).padStart(2, '0');
  var iconEl = document.getElementById('dpSwIcon');
  var nameEl = document.getElementById('dpSwName');
  var detailEl = document.getElementById('dpSwDetail');
  var locEl = document.getElementById('dpSwLoc');
  if (iconEl) iconEl.textContent = _dpZodiac(b.year);
  if (nameEl) nameEl.textContent = profile.name || '';
  if (detailEl) detailEl.textContent = dateStr;
  if (locEl) locEl.textContent = l.label ? '?ìç ' + l.label : '';
  var ov = document.getElementById('dpSwitchConfirmOverlay');
  if (!ov) return;
  ov.style.display = 'flex';
  ov.classList.remove('dp-switch-overlay--in');
  requestAnimationFrame(function() { ov.classList.add('dp-switch-overlay--in'); });
}

function dpSwitchConfirmYes() {
  var ov = document.getElementById('dpSwitchConfirmOverlay');
  if (ov) {
    ov.classList.remove('dp-switch-overlay--in');
    setTimeout(function() { ov.style.display = 'none'; }, 300);
  }
  if (_dpSwitchPending) {
    var cb = _dpSwitchPending.onYes, p = _dpSwitchPending.profile;
    _dpSwitchPending = null;
    try { cb(p); } catch (e) { console.error('[dpSwitchConfirm] ÏΩúÎ∞± ?§Î•ò:', e); }
  }
}

function dpSwitchConfirmNo() {
  var ov = document.getElementById('dpSwitchConfirmOverlay');
  if (ov) {
    ov.classList.remove('dp-switch-overlay--in');
    setTimeout(function() { ov.style.display = 'none'; }, 300);
  }
  _dpSwitchPending = null;
}

function _dpSelect(id, type) {
  var s = _dpStorage(); if (!s) return;
  var list = s.list(), profile = null;
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
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function _dpPickerHTML(profiles, type, theme, backFn) {
  var h = '<div style="padding:16px 0 8px;">'
    + '<div style="text-align:center;margin-bottom:22px;padding:0 8px;">'
    + '<div style="font-size:2.5rem;margin-bottom:10px;">' + theme.icon + '</div>'
    + '<div style="font-family:\'Gowun Dodum\',serif;font-size:1rem;color:' + theme.ac + ';letter-spacing:2px;font-weight:700;margin-bottom:6px;">' + theme.title + '</div>'
    + '<div style="font-size:0.8rem;color:rgba(255,255,255,0.4);line-height:1.6;">' + (theme.sub || '?¥Î™Ö Ïπ¥ÎìúÎ•??†ÌÉù?òÎ©¥ Î∞îÎ°ú Í≤∞Í≥ºÎ•??ïÏù∏?????àÏäµ?àÎã§') + '</div>'
    + '</div><div style="display:flex;flex-direction:column;gap:10px;">';
  profiles.forEach(function(p) {
    var b = p.birth, l = p.location || {};
    var zodiac = _dpZodiac(b.year);
    var cal = b.calType === 'solar' ? '?ëÎ†•' : (b.calType === 'lunar_leap' ? '?åÎ†•(??' : '?åÎ†•');
    var gbadge = p.gender === 'M'
      ? '<span style="font-size:0.63rem;color:#93c5fd;background:rgba(96,165,250,0.15);border:1px solid rgba(96,165,250,0.3);padding:1px 6px;border-radius:10px;">??/span>'
      : '<span style="font-size:0.63rem;color:#f9a8d4;background:rgba(244,114,182,0.15);border:1px solid rgba(244,114,182,0.3);padding:1px 6px;border-radius:10px;">?Ä</span>';
    h += '<div data-action="_dpSelect" data-action-args="' + p.id + ',' + type + '" '
      + 'style="display:flex;align-items:center;gap:13px;padding:13px 15px;cursor:pointer;'
      + 'background:rgba(255,255,255,0.03);border:1px solid rgba(' + theme.br + ',0.22);'
      + 'border-radius:14px;touch-action:pan-y;-webkit-tap-highlight-color:transparent;">'
      + '<div style="font-size:1.9rem;flex-shrink:0;">' + zodiac + '</div>'
      + '<div style="flex:1;min-width:0;">'
      + '<div style="font-family:\'Gowun Dodum\',serif;font-size:0.92rem;color:rgba(255,255,255,0.88);font-weight:700;margin-bottom:3px;">'
      + _dpEsc(p.name) + '&nbsp;' + gbadge + '</div>'
      + '<div style="font-size:0.76rem;color:rgba(255,255,255,0.45);">'
      + cal + '&nbsp;' + b.year + '.' + String(b.month).padStart(2, '0') + '.' + String(b.day).padStart(2, '0')
      + '&nbsp;&middot;&nbsp;' + String(b.hour != null ? b.hour : 12).padStart(2, '0') + ':' + String(b.minute != null ? b.minute : 0).padStart(2, '0') + '</div>'
      + (l.label ? '<div style="font-size:0.7rem;color:rgba(255,255,255,0.28);margin-top:2px;">?ìç&nbsp;' + _dpEsc(l.label) + '</div>' : '')
      + '</div>'
      + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + theme.ac + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;opacity:0.7;"><polyline points="9 18 15 12 9 6"/></svg>'
      + '</div>';
  });
  h += '</div>'
    + '<div style="text-align:center;margin-top:18px;">'
    + '<button data-action="' + (backFn || 'closeAllMysticModalsToHome') + '" '
    + 'style="background:transparent;border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.4);'
    + 'padding:9px 18px;border-radius:10px;font-family:\'Gowun Dodum\',serif;font-size:0.8rem;cursor:pointer;touch-action:manipulation;">' + (backFn ? '???´Í∏∞' : '???àÏúºÎ°?) + '</button>'
    + '</div></div>';
  return h;
}

function _dpEmptyHTML(theme) {
  return '<div style="text-align:center;padding:60px 20px;">'
    + '<div style="font-size:3rem;margin-bottom:16px;">' + theme.icon + '</div>'
    + '<h3 style="color:' + theme.ac + ';margin-bottom:8px;font-family:\'Gowun Dodum\',serif;">?òÏùò ?¥Î™Ö Ïπ¥Îìú ?ÑÏöî</h3>'
    + '<p style="color:#9ca3af;line-height:1.6;margin-bottom:24px;">' + theme.desc + '</p>'
    + '<button data-action="closeAllMysticModalsToHome" '
    + 'style="background:' + theme.bb + ';border:1px solid rgba(' + theme.br + ',0.5);color:' + theme.ac + ';'
    + 'padding:12px 24px;border-radius:12px;font-family:\'Gowun Dodum\',serif;font-size:0.9rem;cursor:pointer;touch-action:manipulation;">??Ïπ¥Îìú ?§Ï†ï?òÎü¨ Í∞ÄÍ∏?/button>'
    + '</div>';
}

function __cdForceUnlockBodyScroll() {
  try {
    if (window._perf && typeof window._perf.unlockBody === 'function') {
      window._perf.unlockBody();
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
    '/js/compat-llm-prompts.js?v=20260321-llm5-sukuyo',
    '/js/saju-engine.js?v=20260502-saju-nullstyle-fix1',
    '/js/saju-engine-tarot-sukuyo-quantum.js?v=20260321-sukuyo-llm-prompt1'
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
    tasks.push(__cdLoadScriptOnce('/js/core/saju/modalProfileState.js?v=20260326-modaldeps1'));
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
  var profiles = s ? s.list() : [];
  var profile = s ? s.current() : null;
  overlay.style.display = 'flex';
  overlay.style.overflow = 'hidden';
  var sh = document.getElementById('sukuyoModalSheet');
  if (sh) { sh.scrollTop = 0; sh.style.overflowY = 'auto'; }
  var noProfile = document.getElementById('sukuyoNoProfile');
  var card = document.getElementById('sukuyoCard');
  var theme = { icon: '?í´', ac: '#c4b5fd', br: '167,139,250', bb: 'linear-gradient(135deg,#1a0e3b,#2d1b6b)', title: '?í´ ÂÆøÊõú??¬∑ ?ôÏöî??, desc: '?ôÏöî?êÏùÑ Î≥¥Î†§Î©?Î©îÏù∏ ?îÎ©¥?êÏÑú<br>?òÏùò ?¥Î™Ö Ïπ¥ÎìúÎ•?Î®ºÏ? ?§Ï†ï?¥Ï£º?∏Ïöî' };
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
        label: l.label || '?Ä?úÎ?Íµ?(?úÏö∏)',
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
      var parts = bd.split('-');
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
      var locationLabel = opt ? opt.text : '?Ä?úÎ?Íµ?(?úÏö∏)';
      return {
        id: 'vedic_main_form',
        name: '(Î©îÏù∏ ?ÖÎ†•)',
        gender: gender,
        birth: { year: year, month: month, day: day, hour: hour, minute: minute, calType: 'solar' },
        location: { label: locationLabel, tz: tz, lng: lng, lat: lat, tzOffset: tzOff, baseTzOffset: tzOff }
      };
    } catch (_) { return null; }
  }

  var profile = typeof window.dpGetDataForVedic === 'function' ? window.dpGetDataForVedic() : null;
  profile = normalizeVedicProfile(profile);
  if (!profile) {
    try {
      var listRaw = localStorage.getItem('FORTUNE_APP_USER_PROFILES.list');
      var currentId = localStorage.getItem('FORTUNE_APP_USER_PROFILES.current');
      if (listRaw) {
        var arr = JSON.parse(listRaw);
        if (Array.isArray(arr) && arr.length) {
          var currentProfile = currentId ? arr.find(function(p) { return p.id === currentId; }) : null;
          profile = normalizeVedicProfile(currentProfile);
          if (!profile) {
            for (var i = 0; i < arr.length; i++) {
              profile = normalizeVedicProfile(arr[i]);
              if (profile) break;
            }
          }
        }
      }
    } catch (e) {}
  }
  if (!profile) {
    profile = normalizeVedicProfile(readMainFormProfileFallback());
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
  // Î©îÏù∏ ?îÎ©¥ ?¥Î™Ö Ïπ¥Îìú ?ÑÎ°ú?ÑÏóê???ùÎÖÑ?îÏùº Ï∂îÏ∂ú
  var profile = null;
  try {
    var listRaw = localStorage.getItem('FORTUNE_APP_USER_PROFILES.list');
    var currentId = localStorage.getItem('FORTUNE_APP_USER_PROFILES.current');
    if (listRaw) {
      var arr = JSON.parse(listRaw);
      if (Array.isArray(arr) && arr.length) {
        var cur = currentId ? arr.find(function(p) { return p.id === currentId; }) : null;
        profile = cur || arr[0] || null;
        if (profile && (!profile.birth || profile.birth.year == null)) profile = null;
      }
    }
  } catch (e) {}
  // ?¥Î™Ö Ïπ¥Îìú ?ÑÎ°ú?ÑÏù¥ ?àÏúºÎ©?/ziwei/chart ?ÖÎ†• ???êÎèô ?∏ÌåÖ ???¥Îèô
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
  var profiles = s ? s.list() : [];
  var profile = s ? s.current() : null;
  overlay.style.display = 'flex';
  overlay.style.overflow = 'hidden';
  var sh = document.getElementById('ziweiModalSheet');
  if (sh) { sh.scrollTop = 0; sh.style.overflowY = 'auto'; }
  var noProfile = document.getElementById('ziweiNoProfile');
  var card = document.getElementById('ziweiModalCard');
  var theme = { icon: '?åå', ac: '#e879f9', br: '232,121,249', bb: 'linear-gradient(135deg,#2b0545,#4a0a7a)', title: '?åå Á¥´ÂæÆ?óÊï∏ ¬∑ ?êÎ??êÏàò', desc: '?êÎ??êÏàò Î™ÖÎ∞ò??Î≥¥Î†§Î©?br>Î©îÏù∏ ?îÎ©¥?êÏÑú ?òÏùò ?¥Î™Ö Ïπ¥ÎìúÎ•?Î®ºÏ? ?§Ï†ï?¥Ï£º?∏Ïöî' };
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
          console.warn('[openAstroModal] swisseph lazy load failed; using legacy fallback.', err);
          return false;
        });
      })
      .then(function() { openAstroModal(true); })
      .catch(function(err) { console.error('[openAstroModal] dependency load failed:', err); });
    return;
  }
  var overlay = document.getElementById('astroModalOverlay');
  if (!overlay) return;
  __cdForceUnlockBodyScroll();
  var s = _dpStorage();
  var profiles = s ? s.list() : [];
  var profile = s ? s.current() : null;
  overlay.style.display = 'flex';
  overlay.style.overflow = 'hidden';
  var sh = document.getElementById('astroModalSheet');
  if (sh) { sh.scrollTop = 0; sh.style.overflowY = 'auto'; }
  var noProfile = document.getElementById('astroNoProfile');
  var cardWrap = document.getElementById('astroCardWrap');
  var theme = { icon: '??, ac: '#d1c4e9', br: '125,42,232', bb: 'linear-gradient(135deg,#1e003b,#300063)', title: '??Cosmic Chart ¬∑ ?êÏÑ±??, desc: '?êÏÑ±??Î∂ÑÏÑù??Î≥¥Î†§Î©?Î©îÏù∏ ?îÎ©¥?êÏÑú<br>?òÏùò ?¥Î™Ö Ïπ¥ÎìúÎ•?Î®ºÏ? ?§Ï†ï?¥Ï£º?∏Ïöî' };
  if (typeof _ModalProfileState === 'undefined' || typeof _ModalProfileState.subscribe !== 'function' || typeof _renderAstroSection !== 'function') {
    console.error('[openAstroModal] missing modal profile dependencies');
    if (cardWrap) cardWrap.style.display = 'none';
    if (noProfile) { noProfile.style.display = 'block'; noProfile.innerHTML = _dpEmptyHTML(theme); }
    return;
  }
  _ModalProfileState.subscribe('astro', _renderAstroSection);
  if (!profile || !profile.birth) {
    if (cardWrap) cardWrap.style.display = 'none';
    if (noProfile) { noProfile.style.display = 'block'; noProfile.innerHTML = profiles.length > 0 ? _dpPickerHTML(profiles, 'astro', theme) : _dpEmptyHTML(theme); }
    return;
  }
  _ModalProfileState.dispatch(profile, 'astro');
}
function closeAstroModal() {
  var o = document.getElementById('astroModalOverlay'); if (o) o.style.display = 'none';
  _ModalProfileState.unsubscribe('astro');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

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
  { category: 'Í∏∞Î≥∏', name: 'Í≥†Ïñë??, icon: '?ê±', keyword: '?ÖÎ¶Ω?¨Í≥º ÏßÅÍ?', advice: '?πÏã†ÎßåÏùò ?òÏù¥?§Î°ú Í±∏Ïñ¥Í∞Ä??Í¥úÏ∞Æ?ÑÏöî. ?ºÏòπ!' },
  { category: 'Í∏∞Î≥∏', name: '?§ÎûåÏ•?, icon: '?êøÔ∏?, keyword: 'Ï§ÄÎπÑÏ? ?úÍ∏∞', advice: '?ëÏ? ?∏Î†•????Í≤∞Ïã§????Í±∞Ïòà?? ?ÑÌÜ†Î¶¨Î? Î™®Ïúº??Ï∞®Í∑ºÏ∞®Í∑º!' },
  { category: 'Í∏∞Î≥∏', name: '?åÎûë??, icon: '?ê¶', keyword: '?¨ÎßùÍ≥??åÏãù', advice: '?âÏö¥?Ä Î©ÄÎ¶??àÏ? ?äÏïÑ?? Î∞îÎ°ú ?πÏã†???¥Íπ® ?ÑÏóê ?àÏ£†.' },
  { category: 'Í∏∞Î≥∏', name: 'Í∞ïÏïÑÏßÄ', icon: '?ê∂', keyword: 'Ï∂©ÏÑ±?¨Í≥º ?¨Îûë', advice: '?πÏã†?Ä ?ºÏûêÍ∞Ä ?ÑÎãà?êÏöî. Í≥ÅÏóê ?àÎäî ?åÏ§ë???∏Ïó∞??ÎØøÏúº?∏Ïöî.' },
  { category: 'Í∏∞Î≥∏', name: '?†ÎÅº', icon: '?ê∞', keyword: '?ÑÏïΩÍ≥??çÏöî', advice: 'Í≤ÅÎÇ¥ÏßÄ ÎßêÍ≥† ?¥Ïßù ?∞Ïñ¥Î≥¥ÏÑ∏?? ?àÎ°ú???∏ÏÉÅ??Í∏∞Îã§?§Ïöî!' },
  { category: 'ÏßÄ??, name: '?ëÎ?', icon: '?ê∫', keyword: 'ÏßÅÍ?, ?êÏú†', advice: '?êÏã†??Î≥∏Îä•??ÎØøÏúº?∏Ïöî. Í≥µÎèôÏ≤¥Ï? ?®Íªò?òÎêò Í∞úÏÑ±???ÉÏ? ÎßàÏÑ∏??' },
  { category: 'ÏßÄ??, name: 'Í≥?, icon: '?êª', keyword: '?±Ï∞∞, ÏπòÏú†', advice: 'ÏßÄÍ∏àÏ? ?¥Î©¥?ºÎ°ú ?§Ïñ¥Í∞??úÍ∞Ñ?ÖÎãà?? ?¥Ïãù???µÌï¥ ?òÏùÑ ?åÎ≥µ?òÏÑ∏??' },
  { category: 'ÏßÄ??, name: '?¨Ïä¥', icon: '?¶å', keyword: 'Î∂Ä?úÎü¨?Ä, ÎØºÍ∞ê', advice: 'Í∞ïÌï®Î≥¥Îã§ Î∂Ä?úÎü¨?Ä???ÑÏöî???åÏûÖ?àÎã§. Ï£ºÎ???Î≥Ä?îÎ? ?àÎ??òÍ≤å ?¥Ìîº?∏Ïöî.' },
  { category: 'ÏßÄ??, name: '?∏Îûë??, icon: '?êØ', keyword: '?©Í∏∞, ?òÏ???, advice: '?πÏã†?Ä Ï∂©Î∂Ñ???òÏùÑ Í∞ÄÏ°åÏäµ?àÎã§. Î™©ÌëúÎ•??•Ìï¥ ÏßëÏ§ë?òÍ≥† ?åÏßÑ?òÏÑ∏??' },
  { category: 'Í≥µÏ§ë', name: '?¨ÎπºÎØ?, icon: '?¶â', keyword: 'ÏßÄ?? ?µÏ∞∞', advice: 'Í≤âÎ™®???àÎ®∏??ÏßÑÏã§??Î≥¥ÏÑ∏?? Î∞§Ïùò ?¥Îë† ?çÏóê?úÎèÑ Í∏∏ÏùÑ Ï∞æÏùÑ ???àÏäµ?àÎã§.' },
  { category: 'Í≥µÏ§ë', name: '?ÖÏàòÎ¶?, icon: '?¶Ö', keyword: 'Í≥†Í≤∞, ?úÏïº', advice: '?¨ÏÜå??Î¨∏Ï†ú?êÏÑú Î≤óÏñ¥?????ìÏ? ?úÏïºÎ°??∏ÏÉù????Í∑∏Î¶º??Í∑∏Î¶¨?∏Ïöî.' },
  { category: 'Í≥µÏ§ë', name: '?òÎπÑ', icon: '?¶ã', keyword: 'Î≥Ä?? Í∞ÄÎ≤ºÏ?', advice: 'Î≥Ä?îÎäî ?ÑÎ¶Ñ?§Ïö¥ Í≤ÉÏûÖ?àÎã§. Í≥ºÍ±∞???àÎ¨º??Î≤óÍ≥† ?àÎ°ú??Î™®Ïäµ?ºÎ°ú ?†ÏïÑ?§Î•¥?∏Ïöî.' },
  { category: 'Í≥µÏ§ë', name: 'ÍπåÎßàÍ∑Ä', icon: '?ê¶?ç‚¨õ', keyword: 'ÎßàÎ≤ï, Ï∞ΩÏ°∞', advice: '?∞Ïó∞???ºÎì§??Ï£ºÎ™©?òÏÑ∏?? ÏßÄÍ∏??πÏã† Ï£ºÎ??êÎäî Î≥Ä?îÏùò ÎßàÎ≤ï???ºÏñ¥?òÍ≥† ?àÏäµ?àÎã§.' },
  { category: 'Î¨?Í∏∞Ì?', name: '?åÍ≥†??, icon: '?ê¨', keyword: 'Ï°∞Ìôî, ?†Ìù¨', advice: '?∂ÏùÑ ?àÎ¨¥ ?¨Í∞Å?òÍ≤å ?ùÍ∞Å?òÏ? ÎßàÏÑ∏?? ?∏Ìù°?òÍ≥†, Ï¶êÍ∏∞Í≥? ?åÌÜµ?òÏÑ∏??' },
  { category: 'Î¨?Í∏∞Ì?', name: 'Í±∞Î∂Å??, icon: '?ê¢', keyword: '?∏ÎÇ¥, Î≥¥Ìò∏', advice: 'Ï≤úÏ≤ú??Í∞Ä??Í¥úÏ∞Æ?µÎãà?? ?êÏã†???çÎèÑÎ•??†Ï??òÎ©∞ Íæ∏Ï????òÏïÑÍ∞Ä?∏Ïöî.' },
  { category: 'Î¨?Í∏∞Ì?', name: 'Î±Ä', icon: '?êç', keyword: '?¨ÏÉù, ?ùÎ™Ö??, advice: '?°Ï? Í∞êÏ†ï??Î≤óÏñ¥?òÏßà ?åÏûÖ?àÎã§. ?ùÎ™Ö ?êÎÑàÏßÄÎ•??åÎ≥µ?òÍ≥† ?§Ïãú ?úÏñ¥?òÏÑ∏??' },
  { category: 'Î¨?Í∏∞Ì?', name: '?¨Ïö∞', icon: '?¶ä', keyword: 'Í∏∞Ï?, ?ÅÏùë', advice: '?ÅÌô©??ÎßûÏ∂∞ ?†Ïó∞?òÍ≤å ?ÄÏ≤òÌïò?∏Ïöî. ÏßÄ?úÎ°ú??Í¥ÄÏ∞∞Ïù¥ Î¨∏Ï†úÎ•??¥Í≤∞??Ï§?Í≤ÉÏûÖ?àÎã§.' }
];
var _animalTotemDeck = [];
var _animalTotemMeditationTimer = null;
var _animalTotemMeditationRunning = false;
var _animalTotemReadLocked = false;
var _animalTotemSelected = null;
var _animalTotemCategoryWeights = {
  'Í∏∞Î≥∏': 0.2,
  'ÏßÄ??: 0.33,
  'Í≥µÏ§ë': 0.27,
  'Î¨?Í∏∞Ì?': 0.2
};

function _pickAnimalTotemDeck(size) {
  var grouped = {};
  _animalTotemPool.forEach(function(item) {
    var cat = item.category || 'Í∏∞Î≥∏';
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
    btn.textContent = '?ßò 10Ï¥?Î™ÖÏÉÅ ?úÏûë?òÍ∏∞';
  }
  _setAnimalTotemMeditationStatus('?ÑÏßÅ Î™ÖÏÉÅ???úÏûë?òÏ? ?äÏïò?¥Ïöî.');
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
  _setAnimalTotemMeditationStatus('Î™ÖÏÉÅ ÏßÑÌñâ Ï§?.. ' + remain + 'Ï¥?);
  btn.textContent = '?∏Ìù° ?†Ï? Ï§?..';

  _animalTotemMeditationTimer = setInterval(function() {
    remain -= 1;
    if (remain > 0) {
      _setAnimalTotemMeditationStatus('Î™ÖÏÉÅ ÏßÑÌñâ Ï§?.. ' + remain + 'Ï¥?);
      return;
    }
    _clearAnimalTotemTimer();
    _setAnimalTotemMeditationStatus('Î™ÖÏÉÅ ?ÑÎ£å! ?¥Ï†ú ?ÄÎ°?Ïπ¥ÎìúÎ•??†ÌÉù??Ï£ºÏÑ∏??');
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
    if (keywordEl) keywordEl.textContent = (picked.category || '?†ÌÖú') + ' ¬∑ ' + picked.keyword;
    if (adviceEl) adviceEl.textContent = '?? + picked.advice + '??;
    result.style.display = 'block';
  }, 450);
}
window.drawAnimalTotemCard = drawAnimalTotemCard;

function shareAnimalTotemResult() {
  if (!_animalTotemSelected) return;
  var picked = _animalTotemSelected;
  var text =
    '?ß∏ ?§Îäò???†ÎãàÎ©Ä ?†ÌÖú\n\n' +
    picked.icon + ' ' + picked.name + '\n' +
    'Î∂ÑÎ•ò: ' + (picked.category || '?†ÌÖú') + '\n' +
    '?§Ïõå?? ' + picked.keyword + '\n' +
    'Î©îÏãúÏßÄ: "' + picked.advice + '"\n\n' +
    'https://code-destiny.com';

  if (navigator.share) {
    navigator.share({
      title: '?†ÎãàÎ©Ä ?†ÌÖú Î¶¨Îî© Í≤∞Í≥º',
      text: text
    }).catch(function() {});
    return;
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(function() { alert('?†ÌÖú Í≤∞Í≥º Î¨∏Íµ¨Î•?Î≥µÏÇ¨?àÏñ¥??'); })
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
    __cdLoadScriptOnce('/js/services/animal-totem-content-engine.js?v=20260328-dreamcute-v2')
      .then(function() { return __cdLoadScriptOnce('/js/animal-totem-experience.js?v=20260328-dreamcute-v2'); })
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
  if (ritualMsgEl) ritualMsgEl.innerText = '"?πÏã†??Í∞ÑÏ†à??Í≥†Î????†ÌÉù?¥Ï£º?∏Ïöî..."';
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
  var showOverlay = function() {
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

  // ?ÄÎ°??îÏßÑ????≤å Î°úÎìú?òÎ©¥ Ïπ¥ÌÖåÍ≥†Î¶¨/Ïπ¥Îìú ?¥Î¶≠??Î¨¥Î∞ò?ëÏù¥ ?????àÏñ¥ Î™®Îã¨ ?§Ìîà ?ÑÏóê Î≥¥Ïû•?úÎã§.
  if (typeof __cdEnsureSajuCoreLoaded === 'function') {
    __cdEnsureSajuCoreLoaded()
      .then(showOverlay)
      .catch(function(err) {
        console.error('[tarot] core preload failed:', err);
        showOverlay();
      });
    return;
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
function openRuneOracle() {
  try {
    window.location.assign('/oracle/rune');
  } catch (err) {
    console.error('[index-inline-runtime] openRuneOracle failed:', err);
  }
}
window.openRuneOracle = openRuneOracle;

/* ?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê??   ???ÄÎ°?Î©îÏù∏ ?îÎ©¥ ?¥Î¶≠ ??ÏΩîÏù∏ Ï∞®Í∞ê ?∏Îì§??   ?¥ÏßÅ ?¥Î™Ö??Ïπ¥Îìú ¬∑ ?çÎßà???åÏïÑÎ≥¥Í∏∞ ¬∑ ?êÏÑù ?åÏö∏ ?ÄÎ°??ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê??*/
function startIjikTarot() {
  if (__cdIsAdminLikeUser()) {
    window.location.href = '/tarot-ijik.html';
    return;
  }
  var token = '';
  try { token = localStorage.getItem('fortune_auth_token') || ''; } catch(_) {}
  if (!token) {
    if (window.confirm('?îí Î°úÍ∑∏?∏Ïù¥ ?ÑÏöî???úÎπÑ?§ÏûÖ?àÎã§.\nÎ°úÍ∑∏?????¥Ïö©??Ï£ºÏÑ∏??')) {
      window.location.href = '/login?next=%2Ftarot-ijik.html';
    }
    return;
  }
  window.location.href = '/tarot-ijik.html';
}
function startMindScanTarot() {
  if (__cdIsAdminLikeUser()) {
    window.location.href = '/tarot/mindscan/';
    return;
  }
  var token = '';
  try { token = localStorage.getItem('fortune_auth_token') || ''; } catch(_) {}
  if (!token) {
    if (window.confirm('?îí Î°úÍ∑∏?∏Ïù¥ ?ÑÏöî???úÎπÑ?§ÏûÖ?àÎã§.\nÎ°úÍ∑∏?????¥Ïö©??Ï£ºÏÑ∏??')) {
      window.location.href = '/login?next=%2Ftarot%2Fmindscan%2F';
    }
    return;
  }
  window.location.href = '/tarot/mindscan/';
}
function startCrystalSoulTarot() {
  if (__cdIsAdminLikeUser()) {
    window.location.href = '/tarot/crystal-soul/';
    return;
  }
  var token = '';
  try { token = localStorage.getItem('fortune_auth_token') || ''; } catch(_) {}
  if (!token) {
    if (window.confirm('?îí Î°úÍ∑∏?∏Ïù¥ ?ÑÏöî???úÎπÑ?§ÏûÖ?àÎã§.\nÎ°úÍ∑∏?????¥Ïö©??Ï£ºÏÑ∏??')) {
      window.location.href = '/login?next=%2Ftarot%2Fcrystal-soul%2F';
    }
    return;
  }
  window.location.href = '/tarot/crystal-soul/';
}
window.startIjikTarot = startIjikTarot;
window.startMindScanTarot = startMindScanTarot;
window.startCrystalSoulTarot = startCrystalSoulTarot;

(function() {
  function onFsChange() {
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
    desc.textContent = '?∞Ïï†/Í≤∞Ìòº: Í∞êÏ†ï, ?®Í∏∞, ?ºÏ?¬∑??Ñ± Í∞ÑÏùò Ï°∞Ìôî??Ï¥àÏ†ê??ÎßûÏ∂ò Î∂ÑÏÑù???úÍ≥µ?©Îãà??';
    btn.innerHTML = '?íó ?∞Ïï† Í∂ÅÌï© Î∂ÑÏÑù?òÍ∏∞';
  } else if (v === 'business') {
    desc.textContent = '?¨ÏóÖ/?ôÏóÖ: ??ï†¬∑Ï±ÖÏûÑ¬∑?©Ïã†¬∑?ÅÍ∑π??Ï§ëÏã¨?ºÎ°ú ?§Î¨¥?Å¬∑Ïû¨Î¨¥Ï†Å ?ÅÌï©?±ÏùÑ ?âÍ??©Îãà??';
    btn.innerHTML = '?íº ?¨ÏóÖ Í∂ÅÌï© Î∂ÑÏÑù?òÍ∏∞';
  } else {
    desc.textContent = 'ÏπúÍµ¨/?ôÎ£å: ?∞Ï†ï¬∑?ëÏóÖ¬∑?êÎÑàÏßÄ ?∏Ìù°??Ï§ëÏã¨?ºÎ°ú ?∏Ïïà?®Í≥º ?úÎÑàÏßÄ ?¨Ïù∏?∏Î? ?àÎÇ¥?©Îãà??';
    btn.innerHTML = '?§ù ?∞Ï†ï/?ôÎ£å Í∂ÅÌï© Î∂ÑÏÑù?òÍ∏∞';
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
    includedLanguages: 'ko,en,ja,zh-CN,zh-TW,fr,es,hi,de,nl,ms',
    autoDisplay: false
  }, 'google_translate_element');
};

/* Í∏∞Îä•(Î°úÎçî/Î™®Îã¨/?§Î≤Ñ?àÏù¥) ?ôÏûë Ï§ëÏóê???∏Ïñ¥ Î≤ÑÌäº ?êÎèô ?®Í?, Ï¢ÖÎ£å ???§Ïãú ?úÏãú */
var _langWrapFeatureOverlayIds = [
  'sajuLoaderOverlay', 'privacy-modal-overlay', 'destinyFlowerStudioOverlay',
  'tarotModalOverlay', 'tarotFocusOverlay', 'tarotSelfEsteemOverlay',
  'tarotLoveOverlay', 'tarotHealingOverlay', 'tarotReunionOverlay', 'tarotYearFortuneOverlay',
  'animalTotemOverlay', 'dreamModalOverlay', 'dreamLoader', 'psychoDreamModalOverlay',
  'juyukModalOverlay', 'sukuyoModalOverlay', 'astroModalOverlay', 'ziweiModalOverlay',
  'dpSwitchConfirmOverlay', 'dpListOverlay', 'kemetOracleOverlay', 'kemetLoader',
  'astralModal'
];

var _langLabelMap = { 'ko': 'KR', 'en': 'EN', 'ja': 'JP', 'zh-CN': 'CN', 'hi': 'HI', 'es': 'ES', 'fr': 'FR', 'de': 'DE', 'nl': 'NL', 'ms': 'MS' };

// ?∏Ïñ¥ ?†ÌÉù(Íµ¨Í? Î≤àÏó≠ ?úÎπÑ???¨Ïö©) ???ºÏ†ï ?úÍ∞Ñ ???ÑÏ†Ø ?êÎèô ?®Í?
var __cdLangWrapHideTimer = null;
var __cdLangWrapHideDelayMs = 30000; // 30Ï¥?
function __cdCancelLangWrapHide() {
  if (__cdLangWrapHideTimer) clearTimeout(__cdLangWrapHideTimer);
  __cdLangWrapHideTimer = null;
  var wrap = document.getElementById('langWrap');
  if (wrap) wrap.classList.remove('lang-wrap--hidden');
}

function __cdScheduleLangWrapHide() {
  if (__cdLangWrapHideTimer) clearTimeout(__cdLangWrapHideTimer);
  __cdLangWrapHideTimer = setTimeout(function() {
    var wrap = document.getElementById('langWrap');
    if (wrap) {
      wrap.classList.add('lang-wrap--hidden');
      wrap.classList.remove('open');
    }
    var trigger = document.getElementById('langTrigger');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  }, __cdLangWrapHideDelayMs);
}

function cdGetContentTranslateTargets() {
  return Array.prototype.slice.call(document.querySelectorAll('[data-cd-translate="deepl"]'));
}

function cdAllowGoogleTranslateForContent() {
  var nodes = cdGetContentTranslateTargets();
  nodes.forEach(function(el) {
    if (!el) return;
    el.classList.remove('notranslate');
    try { el.removeAttribute('data-cd-translate'); } catch (_) {}
  });
}

function changeLanguage(langCode, btn) {
  // cd-lang-native.js Í∞Ä Î°úÎìú?òÎ©¥ ?¥Îãπ ?®ÏàòÍ∞Ä window.changeLanguage Î•???ñ¥?Ä.
  // ??Í∏∞Î≥∏ Íµ¨ÌòÑ?Ä native Î™®Îìú ?åÏùº Î°úÎìú ???êÎäî ?¥Î∞±?ºÎ°úÎß??§Ìñâ??
  if (window.__cdNativeLangBound) {
    return;
  }
  __cdCancelLangWrapHide();

  var btns = document.querySelectorAll('.lang-btn');
  btns.forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');

  var label = document.getElementById('langLabel');
  if (label) label.textContent = _langLabelMap[langCode] || langCode.toUpperCase();

  try { localStorage.setItem('cd_lang', langCode); } catch (_) {}

  var applyPromise = cdSetGoogleTranslateLanguage(langCode, {
    maxAttempts: 60,
    retryDelay: 80,
    fallbackToCookieReload: true
  });
  if (applyPromise && typeof applyPromise.then === 'function') {
    applyPromise.then(function() {
      cdAllowGoogleTranslateForContent();
      cdApplyCollectionToggleHintTexts(langCode);
    });
  } else {
    cdAllowGoogleTranslateForContent();
    cdApplyCollectionToggleHintTexts(langCode);
  }

  if (langCode === 'ko') {
    var domain = window.location.hostname;
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=' + domain + '; path=/;';
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=.' + domain + '; path=/;';
  }

  // Î≤àÏó≠ ?†ÌÉù ÏßÅÌõÑ ?úÎ°≠?§Ïö¥ ?´Í≥†, 30Ï¥????ÑÏ†Ø???êÎèô ?®Í?
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

  var isOpen = wrap.classList.contains('open');
  if (isOpen) {
    wrap.classList.remove('open');
  } else {
    // ?ÑÏ†Ø???§Ïãú ?¨Ïö©?òÎ†§???úÏ†ê?¥Î?Î°??®Í?/?Ä?¥Î®∏Î•??¥Ï†ú?òÍ≥†, ?§Ïãú 30Ï¥????®Í? ?àÏïΩ
    __cdCancelLangWrapHide();
    wrap.classList.add('open');
    __cdScheduleLangWrapHide();
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
    }, true);

    document.addEventListener('keydown', function(e) {
      if (!wrap.classList.contains('open')) return;
      if (e && (e.key === 'Escape' || e.key === 'Esc')) {
        wrap.classList.remove('open');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      }
    }, true);
  }
}

window.addEventListener('load', function() {
  if (!window.__cdLangWrapAutoHideScheduled) {
    window.__cdLangWrapAutoHideScheduled = true;
    __cdScheduleLangWrapHide();
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
    if (label) label.textContent = _langLabelMap[lang] || 'KR';
  }, 1000);
});

// Auto-select language by IP/region on first visit (no saved preference)
window.addEventListener('load', function() {
  setTimeout(function() {
    try {
      var saved = localStorage.getItem('cd_lang');
      if (saved) return;
    } catch (_) {}

    fetch('/api/geo', { cache: 'no-store' })
      .then(function(r) { return r.json(); })
      .then(function(p) {
        if (!p || !p.widgetLang) return;
        var nextLang = String(p.widgetLang);
        if (!nextLang || nextLang === 'ko') return;
        try { localStorage.setItem('cd_lang', nextLang); } catch (_) {}
        changeLanguage(nextLang);
      })
      .catch(function() {});
  }, 1200);
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
