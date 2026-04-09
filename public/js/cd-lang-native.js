/**
 * cd-lang-native.js  v3.0.0 — Hybrid: 네이티브 라우팅 + Google Translate + 초월 번역
 * ──────────────────────────────────────────────────────────────────────
 * 동작 원리:
 *  1. 언어 버튼 클릭 → 해당 로케일 경로(/en-us, /ja-jp, …)로 navigate
 *     + googtrans 쿠키 설정 → 페이지 로드 후 Google Translate 자동 적용
 *  2. 로케일 페이지 진입 시:
 *     a. public/i18n/{lang}.json에서 용어 사전 fetch
 *     b. 핵심 동양 용어를 notranslate span으로 교체 (초월 번역)
 *     c. Google Translate 로드 → 나머지 한국어 자동 번역
 *  3. /api/geo로 국가 감지 → 각국 통화로 가격 표시
 *
 * 지원 언어 (10개): ko, en, ja, zh-CN, hi, es, fr, de, nl, ms
 * ──────────────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  /* ── 1. 언어코드 ↔ 로케일 슬러그 매핑 ─────────────────────── */
  var LANG_TO_SLUG = {
    'ko':    '',
    'en':    'en-us',
    'ja':    'ja-jp',
    'zh-CN': 'zh-cn',
    'hi':    'hi-in',
    'es':    'es-es',
    'fr':    'fr-fr',
    'de':    'de-de',
    'nl':    'nl-nl',
    'ms':    'ms-my'
  };

  var SLUG_TO_LANG = {};
  for (var k in LANG_TO_SLUG) {
    if (LANG_TO_SLUG[k]) SLUG_TO_LANG[LANG_TO_SLUG[k]] = k;
  }

  var LABEL_MAP = {
    'ko': 'KR', 'en': 'EN', 'ja': 'JP',
    'zh-CN': 'CN', 'hi': 'HI', 'es': 'ES',
    'fr': 'FR', 'de': 'DE', 'nl': 'NL', 'ms': 'MS'
  };

  // Google Translate 언어코드 (zh-CN 주의)
  var LANG_TO_GT = {
    'ko': 'ko', 'en': 'en', 'ja': 'ja', 'zh-CN': 'zh-CN',
    'hi': 'hi', 'es': 'es', 'fr': 'fr', 'de': 'de', 'nl': 'nl', 'ms': 'ms'
  };

  // i18n JSON 파일명 매핑
  var LANG_TO_I18N = {
    'en': 'en', 'ja': 'ja', 'zh-CN': 'zh-cn',
    'hi': 'hi', 'es': 'es', 'fr': 'fr', 'de': 'de', 'nl': 'nl', 'ms': 'ms'
  };

  /* ── 2. 통화 매핑 (국가별) ──────────────────────────────────── */
  var COUNTRY_TO_CURRENCY = {
    US:'USD', GB:'GBP', AU:'AUD', CA:'CAD', NZ:'NZD',
    DE:'EUR', FR:'EUR', IT:'EUR', ES:'EUR', NL:'EUR',
    BE:'EUR', AT:'EUR', PT:'EUR', FI:'EUR', GR:'EUR',
    JP:'JPY', CN:'CNY', HK:'HKD', TW:'TWD',
    IN:'INR', SG:'SGD', MY:'MYR', TH:'THB',
    BR:'BRL', MX:'MXN', KR:'KRW'
  };

  // KRW 기준 환율 (폴백용)
  var CURRENCY_RATES = {
    KRW: { symbol: '₩',   rate: 1,        fmt: function(n) { return '₩' + Math.round(n).toLocaleString(); } },
    USD: { symbol: '$',   rate: 0.00074,   fmt: function(n) { return '$' + (n * 0.00074).toFixed(2); } },
    EUR: { symbol: '€',   rate: 0.00068,   fmt: function(n) { return '€' + (n * 0.00068).toFixed(2); } },
    JPY: { symbol: '¥',   rate: 0.11,      fmt: function(n) { return '¥' + Math.round(n * 0.11).toLocaleString(); } },
    CNY: { symbol: '¥',   rate: 0.0053,    fmt: function(n) { return '¥' + (n * 0.0053).toFixed(2); } },
    GBP: { symbol: '£',   rate: 0.00058,   fmt: function(n) { return '£' + (n * 0.00058).toFixed(2); } },
    AUD: { symbol: 'A$',  rate: 0.0012,    fmt: function(n) { return 'A$' + (n * 0.0012).toFixed(2); } },
    CAD: { symbol: 'C$',  rate: 0.0010,    fmt: function(n) { return 'C$' + (n * 0.0010).toFixed(2); } },
    NZD: { symbol: 'NZ$', rate: 0.0013,    fmt: function(n) { return 'NZ$' + (n * 0.0013).toFixed(2); } },
    INR: { symbol: '₹',   rate: 0.062,     fmt: function(n) { return '₹' + Math.round(n * 0.062).toLocaleString(); } },
    SGD: { symbol: 'S$',  rate: 0.00099,   fmt: function(n) { return 'S$' + (n * 0.00099).toFixed(2); } },
    MYR: { symbol: 'RM',  rate: 0.0035,    fmt: function(n) { return 'RM ' + (n * 0.0035).toFixed(2); } },
    THB: { symbol: '฿',   rate: 0.026,     fmt: function(n) { return '฿' + Math.round(n * 0.026); } },
    HKD: { symbol: 'HK$', rate: 0.0058,    fmt: function(n) { return 'HK$' + (n * 0.0058).toFixed(2); } },
    TWD: { symbol: 'NT$', rate: 0.024,     fmt: function(n) { return 'NT$' + Math.round(n * 0.024); } },
    BRL: { symbol: 'R$',  rate: 0.0038,    fmt: function(n) { return 'R$' + (n * 0.0038).toFixed(2); } },
    MXN: { symbol: 'MX$', rate: 0.013,     fmt: function(n) { return 'MX$' + (n * 0.013).toFixed(2); } }
  };

  /* ── 3. 현재 활성 언어 감지 ─────────────────────────────────── */
  function detectCurrentLang() {
    var path = (window.location.pathname || '/').toLowerCase().replace(/^\//, '');
    var topSlug = path.split('/')[0] || '';
    if (SLUG_TO_LANG[topSlug]) return SLUG_TO_LANG[topSlug];
    try { var stored = localStorage.getItem('cd_lang'); if (stored) return stored; } catch (_) {}
    return 'ko';
  }

  /* ── 4. 쿠키 유틸 ──────────────────────────────────────────── */
  function setCookie(name, value, days) {
    var expires = '';
    if (days) {
      var d = new Date();
      d.setTime(d.getTime() + days * 86400000);
      expires = '; expires=' + d.toUTCString();
    }
    document.cookie = name + '=' + value + expires + '; path=/; SameSite=Lax';
  }

  /* ── 5. UI 업데이트 ─────────────────────────────────────────── */
  function updateUI(langCode) {
    var label = document.getElementById('langLabel') || document.getElementById('translateLangLabel');
    if (label) label.textContent = LABEL_MAP[langCode] || langCode.toUpperCase();

    var btns = document.querySelectorAll('.lang-btn');
    for (var i = 0; i < btns.length; i++) {
      var btn = btns[i];
      var btnLang = btn.getAttribute('data-lang');
      if (btnLang === langCode) {
        btn.classList.add('active');
        btn.setAttribute('aria-current', 'true');
      } else {
        btn.classList.remove('active');
        btn.removeAttribute('aria-current');
      }
    }
  }

  /* ── 6. Google Translate 로드 및 언어 설정 ─────────────────── */
  function ensureGoogleTranslate(langCode) {
    // googleTranslateElementInit 등록 (아직 없으면)
    if (!window.googleTranslateElementInit) {
      window.googleTranslateElementInit = function () {
        if (!window.google || !window.google.translate) return;
        if (window.__cdGTInited) return;
        window.__cdGTInited = true;
        new window.google.translate.TranslateElement({
          pageLanguage: 'ko',
          includedLanguages: 'ko,en,ja,zh-CN,zh-TW,fr,es,hi,de,nl,ms',
          autoDisplay: false
        }, 'google_translate_element');
      };
    }
    // 스크립트 중복 로드 방지
    if (window.__cdGTScriptLoaded) return;
    window.__cdGTScriptLoaded = true;
    var s = document.createElement('script');
    s.type = 'text/javascript';
    s.async = true;
    s.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    s.onerror = function () { window.__cdGTScriptLoaded = false; };
    document.head.appendChild(s);

    // GT 로드 후 언어 자동 적용 (select 변경)
    if (langCode && langCode !== 'ko') {
      _scheduleGTLangSelect(langCode, 40);
    }
  }

  function _setGTCookie(langCode) {
    if (!langCode || langCode === 'ko') return;
    var gtCode = LANG_TO_GT[langCode] || langCode;
    var cookieValue = '/ko/' + gtCode;
    var host = window.location.hostname;
    var exp = 'expires=Fri, 31 Dec 9999 23:59:59 GMT';
    document.cookie = 'googtrans=' + cookieValue + '; ' + exp + '; path=/; SameSite=Lax';
    if (host) {
      document.cookie = 'googtrans=' + cookieValue + '; ' + exp + '; domain=' + host + '; path=/; SameSite=Lax';
      document.cookie = 'googtrans=' + cookieValue + '; ' + exp + '; domain=.' + host + '; path=/; SameSite=Lax';
    }
  }

  function _clearGTCookie() {
    var host = window.location.hostname;
    var exp = 'expires=Thu, 01 Jan 1970 00:00:00 UTC';
    document.cookie = 'googtrans=; ' + exp + '; path=/;';
    if (host) {
      document.cookie = 'googtrans=; ' + exp + '; domain=' + host + '; path=/;';
      document.cookie = 'googtrans=; ' + exp + '; domain=.' + host + '; path=/;';
    }
  }

  function _scheduleGTLangSelect(langCode, maxAttempts) {
    var gtCode = LANG_TO_GT[langCode] || langCode;
    var attempts = 0;
    var max = typeof maxAttempts === 'number' ? maxAttempts : 40;
    function trySelect() {
      var sel = document.querySelector('.goog-te-combo');
      if (sel) {
        sel.value = gtCode;
        try {
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (_) {
          var ev = document.createEvent('HTMLEvents');
          ev.initEvent('change', true, false);
          sel.dispatchEvent(ev);
        }
        return;
      }
      if (++attempts < max) setTimeout(trySelect, 200);
    }
    trySelect();
  }

  /* ── 7. 초월 번역 — i18n JSON 용어 사전 오버라이드 ─────────── */
  var _termCache = {};

  function fetchTerms(langCode) {
    var file = LANG_TO_I18N[langCode];
    if (!file) return Promise.resolve({});
    if (_termCache[langCode]) return Promise.resolve(_termCache[langCode]);
    return fetch('/i18n/' + file + '.json')
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (data) {
        var terms = (data && typeof data.terms === 'object') ? data.terms : {};
        _termCache[langCode] = terms;
        return terms;
      })
      .catch(function () { return {}; });
  }

  function applyTermOverrides(terms) {
    if (!terms || typeof terms !== 'object') return;
    // 길이 내림차순 정렬 (긴 구문 우선)
    var keys = Object.keys(terms).sort(function (a, b) { return b.length - a.length; });
    if (!keys.length) return;

    var walker = document.createTreeWalker(
      document.body,
      // NodeFilter.SHOW_TEXT = 4
      4,
      {
        acceptNode: function (node) {
          var p = node.parentNode;
          if (!p) return 2; // FILTER_REJECT
          var tag = (p.tagName || '').toLowerCase();
          if (tag === 'script' || tag === 'style' || tag === 'noscript') return 2;
          if (p.getAttribute && p.getAttribute('data-cd-override')) return 2;
          if (p.classList && p.classList.contains('notranslate')) return 2;
          // skip if already translated by GT (has font wrappers inside)
          if (tag === 'font') return 2;
          return 1; // FILTER_ACCEPT
        }
      },
      false
    );

    var nodes = [];
    while (walker.nextNode()) {
      var nv = walker.currentNode.nodeValue;
      if (nv && nv.trim()) nodes.push(walker.currentNode);
    }

    nodes.forEach(function (textNode) {
      var text = textNode.nodeValue;
      var hasMatch = keys.some(function (k) { return text.indexOf(k) !== -1; });
      if (!hasMatch) return;

      // 단계적 교체 (여러 용어 처리)
      var parts = [text];
      keys.forEach(function (key) {
        var val = terms[key];
        if (!val) return;
        var newParts = [];
        parts.forEach(function (part) {
          if (typeof part !== 'string') { newParts.push(part); return; }
          var seg = part;
          var idx = seg.indexOf(key);
          while (idx !== -1) {
            if (idx > 0) newParts.push(seg.substring(0, idx));
            var span = document.createElement('span');
            span.className = 'notranslate';
            span.setAttribute('data-cd-override', '1');
            span.setAttribute('title', key); // 원문 표시 (hover)
            span.textContent = val;
            newParts.push(span);
            seg = seg.substring(idx + key.length);
            idx = seg.indexOf(key);
          }
          if (seg) newParts.push(seg);
        });
        parts = newParts;
      });

      var hasSpan = parts.some(function (p) { return typeof p !== 'string'; });
      if (!hasSpan) return;

      var frag = document.createDocumentFragment();
      parts.forEach(function (p) {
        frag.appendChild(typeof p === 'string' ? document.createTextNode(p) : p);
      });
      if (textNode.parentNode) textNode.parentNode.replaceChild(frag, textNode);
    });
  }

  /* ── 8. 국가별 통화 변환 ────────────────────────────────────── */
  function applyCurrencyConversion() {
    // 이미 적용됐으면 스킵
    if (window.__cdCurrencyApplied) return;
    // 캐시 확인
    try {
      var cached = sessionStorage.getItem('cd_currency');
      if (cached) { _doApplyCurrency(cached); return; }
    } catch (_) {}

    fetch('/api/geo', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (p) {
        var country = ((p && p.country) || 'KR').toUpperCase();
        var currency = COUNTRY_TO_CURRENCY[country] || 'USD';
        try { sessionStorage.setItem('cd_currency', currency); } catch (_) {}
        _doApplyCurrency(currency);
      })
      .catch(function () { /* geo 실패 시 KRW 유지 */ });
  }

  function _doApplyCurrency(currency) {
    if (!currency || currency === 'KRW') return;
    var info = CURRENCY_RATES[currency];
    if (!info) return;
    window.__cdCurrencyApplied = true;

    var fmt = info.fmt;

    // pf-coin-note: "영구 해금 · 약 5,000원" → "영구 해금 · ≈ $3.70"
    var noteEls = document.querySelectorAll('.pf-coin-note[data-krw]');
    noteEls.forEach(function (el) {
      var krw = parseInt(el.getAttribute('data-krw') || '0', 10);
      if (!krw) return;
      var label = el.getAttribute('data-label') || '영구 해금';
      el.textContent = label + ' · ≈ ' + fmt(krw);
    });

    // golden-grain 패키지 가격: data-krw 속성으로 변환
    var priceEls = document.querySelectorAll('.golden-grain-package__price[data-krw]');
    priceEls.forEach(function (el) {
      var krw = parseInt(el.getAttribute('data-krw') || '0', 10);
      if (!krw) return;
      el.textContent = fmt(krw);
    });

    // window.formatWon 오버라이드 → 동적으로 렌더되는 ChargeModal 가격에도 적용
    window.__cdCurrencyFmt = fmt;
    window.formatWon = function (value) {
      return fmt(Number(value) || 0);
    };

    // MutationObserver: 이후 동적으로 추가되는 가격 요소도 변환
    if (typeof MutationObserver !== 'undefined' && !window.__cdCurrencyObserver) {
      window.__cdCurrencyObserver = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          m.addedNodes.forEach(function (node) {
            if (node.nodeType !== 1) return;
            var els = node.querySelectorAll ? node.querySelectorAll('[data-krw]') : [];
            els.forEach(function (el) {
              var krw = parseInt(el.getAttribute('data-krw') || '0', 10);
              if (!krw) return;
              if (el.classList.contains('golden-grain-package__price') ||
                  el.classList.contains('pf-coin-note')) {
                var label = el.getAttribute('data-label') || '';
                el.textContent = label ? label + ' · ≈ ' + fmt(krw) : fmt(krw);
              }
            });
          });
        });
      });
      window.__cdCurrencyObserver.observe(document.body, { childList: true, subtree: true });
    }
  }

  /* ── 9. 언어 변경 (핵심) ────────────────────────────────────── */
  function nativeChangeLanguage(langCode, _btn) {
    try { localStorage.setItem('cd_lang', langCode); } catch (_) {}
    setCookie('cd_locale_ack', '1', 365);

    if (langCode !== 'ko') {
      // googtrans 쿠키 설정 → 이동 후 페이지에서 GT 자동 적용
      _setGTCookie(langCode);
    } else {
      _clearGTCookie();
    }

    var slug = LANG_TO_SLUG[langCode];
    var targetPath = slug ? '/' + slug : '/';
    var currentPath = window.location.pathname;
    var normalizedCurrent = currentPath.toLowerCase().replace(/\/$/, '') || '/';
    var normalizedTarget = targetPath.replace(/\/$/, '') || '/';

    // 이미 해당 로케일에 있으면 in-place 적용
    if (normalizedCurrent === normalizedTarget ||
        normalizedCurrent.startsWith(normalizedTarget + '/')) {
      updateUI(langCode);
      var wrap = document.getElementById('langWrap');
      if (wrap) wrap.classList.remove('open');
      if (langCode !== 'ko') {
        // 초월 번역 먼저, 그 뒤 GT 로드
        fetchTerms(langCode).then(function (terms) {
          applyTermOverrides(terms);
          ensureGoogleTranslate(langCode);
        });
        setTimeout(applyCurrencyConversion, 600);
      }
      return;
    }

    // 다른 로케일 경로로 이동 (googtrans 쿠키는 위에서 설정됨)
    updateUI(langCode);
    window.location.href = targetPath;
  }

  /* ── 10. 기존 changeLanguage 오버라이드 ────────────────────── */
  window.changeLanguage = nativeChangeLanguage;
  window.__cdNativeLangBound = true;
  // GT 비활성화 플래그 해제 (이전 버전과의 호환성)
  window.__cdGoogleTranslateScriptRequested = false;
  window.__cdGoogleTranslateInited = false;

  /* ── 11. 초기화 ─────────────────────────────────────────────── */
  function init() {
    var lang = detectCurrentLang();
    updateUI(lang);

    // 클릭 델리게이션
    if (!window.__cdNativeLangClickBound) {
      window.__cdNativeLangClickBound = true;
      document.addEventListener('click', function (e) {
        var target = e && e.target;
        if (!target) return;
        var btn = target.closest ? target.closest('.lang-btn[data-lang]') : null;
        if (!btn) return;
        var langCode = btn.getAttribute('data-lang');
        if (!langCode) return;
        e.preventDefault();
        e.stopPropagation();
        nativeChangeLanguage(langCode, btn);
      }, true);
    }

    // 비한국어 로케일 페이지: 초월 번역 → Google Translate → 통화 변환
    if (lang !== 'ko') {
      // googtrans 쿠키 보장 (직접 URL 접근 시)
      _setGTCookie(lang);

      // 초월 번역 먼저 적용, 완료 후 GT 로드
      fetchTerms(lang).then(function (terms) {
        applyTermOverrides(terms);
        ensureGoogleTranslate(lang);
      });

      // IP 기반 통화 변환 (별도 타이밍)
      setTimeout(applyCurrencyConversion, 800);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
