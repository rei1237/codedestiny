/**
 * cd-lang-native.js  v4.0.0 — GT-First + Targeted Overrides
 * ──────────────────────────────────────────────────────────────────────
 * 번역 순서 (v4 핵심 변경):
 *  1. [data-term], .custom-trans, [data-krw] 요소에만 즉시 notranslate 마킹
 *  2. Google Translate 즉시 로드 → 나머지 전체 페이지 번역
 *     (v3의 전체 body TextNode 스캔 제거 → GT 정상 전체 번역 보장)
 *  3. i18n fetch 완료 후 [data-term]/.custom-trans 요소에 초월 번역
 *  4. /api/geo 국가 감지 → [data-krw] 통화 변환
 *  5. MutationObserver: 동적 추가 요소(React modal 등)에도 적용
 *
 * v3 → v4 핵심 변경:
 *  - applyTermOverrides(전체 body Walker) 제거 → GT가 페이지 전체를 번역
 *  - 초월 번역 대상: [data-term] 속성 / .custom-trans 클래스 명시 요소만
 *  - GT를 i18n fetch 완료 대기 없이 즉시 로드
 *  - googleTranslateElementInit 을 스크립트 삽입 전에 미리 등록
 *
 * 사용법 (초월 번역):
 *  <span data-term="사주">사주</span>          → i18n["사주"] 로 교체 + notranslate
 *  <span class="custom-trans" data-key="사주"> → 동일 처리
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
  /**
   * googleTranslateElementInit 을 스크립트 삽입 전에 미리 등록.
   * GT 스크립트 로드 완료 즉시 콜백 실행 보장.
   */
  function registerGTInit() {
    if (window.googleTranslateElementInit) return;
    window.googleTranslateElementInit = function () {
      if (!window.google || !window.google.translate) return;
      if (window.__cdGTInited) return;
      window.__cdGTInited = true;
      try {
        new window.google.translate.TranslateElement({
          pageLanguage: 'ko',
          includedLanguages: 'ko,en,ja,zh-CN,zh-TW,fr,es,hi,de,nl,ms',
          autoDisplay: false
        }, 'google_translate_element');
      } catch (_) {}
    };
  }

  function ensureGoogleTranslate(langCode) {
    registerGTInit();
    // 이미 로드된 경우 언어 선택만 트리거
    if (window.__cdGTScriptLoaded) {
      if (langCode && langCode !== 'ko') _scheduleGTLangSelect(langCode, 50);
      return;
    }
    window.__cdGTScriptLoaded = true;
    var s = document.createElement('script');
    s.type = 'text/javascript';
    s.async = true;
    s.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    s.onerror = function () { window.__cdGTScriptLoaded = false; };
    document.head.appendChild(s);
    if (langCode && langCode !== 'ko') {
      _scheduleGTLangSelect(langCode, 50);
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
    var max = typeof maxAttempts === 'number' ? maxAttempts : 50;
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
    // GT 스크립트 로드 후 toolbar 렌더까지 300ms 대기
    setTimeout(trySelect, 300);
  }

  /* ── 7. i18n 용어 사전 fetch ─────────────────────────────────── */
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

  /* ── 8. GT 로드 전 notranslate 사전 마킹 ────────────────────────
   * GT가 번역하면 안 되는 요소들에 미리 notranslate 클래스를 부여.
   * 실제 번역 내용은 fetchTerms 완료 후 applyTargetedOverrides 에서 채워짐.
   * ─────────────────────────────────────────────────────────────── */
  function preMarkNotranslate() {
    // [data-krw]: 통화 변환 대상 — GT가 숫자/원화 기호 건드리지 않도록
    var krwEls = document.querySelectorAll('[data-krw]');
    for (var i = 0; i < krwEls.length; i++) {
      krwEls[i].classList.add('notranslate');
    }
    // [data-term], .custom-trans: 초월 번역 대상
    var overrideEls = document.querySelectorAll('[data-term], .custom-trans');
    for (var j = 0; j < overrideEls.length; j++) {
      overrideEls[j].classList.add('notranslate');
    }
  }

  /* ── 9. 초월 번역 — [data-term] / .custom-trans 요소만 처리 ────
   *
   * 전체 body TextNode 스캔 없음 → GT 번역 방해 제거 (v3 → v4 핵심 변경)
   *
   * 대상:
   *  [data-term="사주"]      → i18n["사주"] 로 교체 + notranslate
   *  .custom-trans[data-key] → data-key 값으로 i18n 조회 + notranslate
   * ─────────────────────────────────────────────────────────────── */
  function applyTargetedOverrides(terms) {
    if (!terms || typeof terms !== 'object') return;

    // [data-term] 요소
    var termEls = document.querySelectorAll('[data-term]:not([data-cd-overridden])');
    for (var i = 0; i < termEls.length; i++) {
      var el = termEls[i];
      var key = el.getAttribute('data-term');
      var translation = terms[key];
      if (translation) {
        el.classList.add('notranslate');
        el.setAttribute('data-cd-overridden', '1');
        el.setAttribute('title', key); // 원문 호버 표시
        el.textContent = translation;
      }
    }

    // .custom-trans 요소 (data-key 또는 data-term 으로 키 지정)
    var customEls = document.querySelectorAll('.custom-trans:not([data-cd-overridden])');
    for (var j = 0; j < customEls.length; j++) {
      var cel = customEls[j];
      var ckey = cel.getAttribute('data-key') || cel.getAttribute('data-term');
      cel.classList.add('notranslate');
      cel.setAttribute('data-cd-overridden', '1');
      if (ckey && terms[ckey]) {
        cel.setAttribute('title', ckey);
        cel.textContent = terms[ckey];
      }
    }
  }

  /* ── 10. 국가별 통화 변환 ────────────────────────────────────── */
  function applyCurrencyConversion() {
    if (window.__cdCurrencyApplied) return;
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

  /* ── 11. 언어 변경 ──────────────────────────────────────────── */
  function nativeChangeLanguage(langCode, _btn) {
    try { localStorage.setItem('cd_lang', langCode); } catch (_) {}
    setCookie('cd_locale_ack', '1', 365);

    if (langCode !== 'ko') {
      _setGTCookie(langCode);
    } else {
      _clearGTCookie();
    }

    var slug = LANG_TO_SLUG[langCode];
    var targetPath = slug ? '/' + slug : '/';
    var currentPath = window.location.pathname;
    var normalizedCurrent = currentPath.toLowerCase().replace(/\/$/, '') || '/';
    var normalizedTarget = targetPath.replace(/\/$/, '') || '/';

    // 이미 해당 로케일 → in-place 적용
    if (normalizedCurrent === normalizedTarget ||
        normalizedCurrent.startsWith(normalizedTarget + '/')) {
      updateUI(langCode);
      var wrap = document.getElementById('langWrap');
      if (wrap) wrap.classList.remove('open');
      if (langCode !== 'ko') {
        preMarkNotranslate();              // ① notranslate 마킹
        ensureGoogleTranslate(langCode);   // ② GT 즉시 로드 (전체 번역)
        fetchTerms(langCode).then(function (terms) {
          applyTargetedOverrides(terms);   // ③ 지정 요소만 초월 번역
        });
        setTimeout(applyCurrencyConversion, 600);
      }
      return;
    }

    // 다른 로케일 경로로 이동
    updateUI(langCode);
    window.location.href = targetPath;
  }

  /* ── 12. 초기화 ─────────────────────────────────────────────── */
  function init() {
    var lang = detectCurrentLang();
    updateUI(lang);

    // 클릭 델리게이션 (언어 버튼)
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

    // 비한국어 로케일 페이지 초기화
    if (lang !== 'ko') {
      _setGTCookie(lang); // googtrans 쿠키 보장 (직접 URL 접근 시)

      // ① notranslate 사전 마킹 (GT 로드 전)
      preMarkNotranslate();

      // ② Google Translate 즉시 로드 → 전체 페이지 번역
      ensureGoogleTranslate(lang);

      // ③ i18n fetch → [data-term] / .custom-trans 요소만 초월 번역
      fetchTerms(lang).then(function (terms) {
        applyTargetedOverrides(terms);
      });

      // ④ 국가별 통화 변환 (geo API, GT와 독립)
      setTimeout(applyCurrencyConversion, 800);
    }
  }

  /* ── 12. 기존 API 호환 + 외부 유틸 ─────────────────────────── */
  window.changeLanguage = nativeChangeLanguage;
  window.__cdNativeLangBound = true;
  window.__cdGoogleTranslateScriptRequested = false;
  window.__cdGoogleTranslateInited = false;

  /**
   * getCurrencyDisplay(krwAmount)
   * KRW 금액을 현재 사용자 통화로 변환해 표시 문자열 반환.
   * 통화 변환 전이면 원화(₩) 그대로 반환.
   */
  window.getCurrencyDisplay = function (krwAmount) {
    var n = Number(krwAmount) || 0;
    if (window.__cdCurrencyFmt) return window.__cdCurrencyFmt(n);
    return '₩' + Math.round(n).toLocaleString();
  };

  // googleTranslateElementInit 최대한 일찍 등록
  registerGTInit();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
