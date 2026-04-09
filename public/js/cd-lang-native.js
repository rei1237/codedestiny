/**
 * cd-lang-native.js  v4.0.0 — GT-First + Custom Trans + Currency
 * ──────────────────────────────────────────────────────────────────────
 * 동작 순서:
 *  1. Google Translate 즉시 로드 → 페이지 전체 번역 (notranslate 제외)
 *  2. .custom-trans[data-key] 요소 → i18n JSON 초월 번역 (GT 이후 오버라이드)
 *  3. [data-krw] 요소 → /api/geo 국가별 통화 변환
 *
 * 초월 번역 마크업 예시 (GT가 이 요소를 건너뜀):
 *   <span class="custom-trans" data-key="사주">사주</span>
 *   → /i18n/{lang}.json 의 terms["사주"] 값으로 대체
 *
 * 통화 변환 마크업:
 *   <span class="pf-coin-note" data-krw="5000" data-label="영구 해금">영구 해금 · 약 5,000원</span>
 *   <span class="golden-grain-package__price" data-krw="9900">₩9,900</span>
 *
 * 지원 언어 (10개): ko, en, ja, zh-CN, hi, es, fr, de, nl, ms
 * ──────────────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  /* ── 1. 매핑 테이블 ─────────────────────────────────────────── */
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

  /* ── 6. Google Translate — 콜백 사전 정의 후 즉시 로드 ──────── */
  // ★ googleTranslateElementInit 은 GT 스크립트 삽입 전에 반드시 정의되어야 함
  if (!window.googleTranslateElementInit) {
    window.googleTranslateElementInit = function () {
      if (!window.google || !window.google.translate) return;
      if (window.__cdGTInited) return;
      window.__cdGTInited = true;
      try {
        new window.google.translate.TranslateElement({
          pageLanguage: 'ko',
          includedLanguages: 'ko,en,ja,zh-CN,zh-TW,fr,es,hi,de,nl,ms',
          autoDisplay: false,
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE
        }, 'google_translate_element');
      } catch (e) {}
      // GT 위젯 초기화 완료 후 언어 select 설정
      var lang = detectCurrentLang();
      if (lang !== 'ko') _scheduleGTLangSelect(lang, 60);
    };
  }

  function loadGoogleTranslate(langCode) {
    if (window.__cdGTScriptLoaded) {
      // 이미 로드된 경우: 언어 select만 재설정
      if (langCode && langCode !== 'ko') _scheduleGTLangSelect(langCode, 30);
      return;
    }
    window.__cdGTScriptLoaded = true;
    var s = document.createElement('script');
    s.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    s.async = true;
    s.onerror = function () { window.__cdGTScriptLoaded = false; };
    document.head.appendChild(s);
  }

  function _setGTCookie(langCode) {
    if (!langCode || langCode === 'ko') return;
    var gtCode = LANG_TO_GT[langCode] || langCode;
    var val = '/ko/' + gtCode;
    var exp = 'expires=Fri, 31 Dec 9999 23:59:59 GMT';
    var host = window.location.hostname;
    document.cookie = 'googtrans=' + val + '; ' + exp + '; path=/; SameSite=Lax';
    if (host) {
      document.cookie = 'googtrans=' + val + '; ' + exp + '; domain=' + host + '; path=/; SameSite=Lax';
      document.cookie = 'googtrans=' + val + '; ' + exp + '; domain=.' + host + '; path=/; SameSite=Lax';
    }
  }

  function _clearGTCookie() {
    var exp = 'expires=Thu, 01 Jan 1970 00:00:00 UTC';
    var host = window.location.hostname;
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
      if (sel && sel.value !== gtCode) {
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
    setTimeout(trySelect, 300);
  }

  /* ── 7. 초월 번역 — .custom-trans[data-key] 요소만 대상 ──────
   *
   * ▸ DOM 전체 텍스트 노드를 쪼개지 않음 → GT가 전체 페이지를 정상 번역
   * ▸ 명시적으로 class="custom-trans" + data-key 를 지정한 요소만 처리
   * ▸ notranslate 클래스를 자동 추가 → GT가 이 요소를 건너뜀
   * ▸ GT 로드 후 500ms 지연 → GT 번역 완료 시점 이후 오버라이드
   *
   * 마크업 예:
   *   <span class="custom-trans" data-key="사주">사주</span>
   * ─────────────────────────────────────────────────────────── */
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

  function applyCustomTrans(terms) {
    if (!terms || typeof terms !== 'object') return;
    var els = document.querySelectorAll('.custom-trans');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      // GT가 이 요소를 번역하지 않도록 notranslate 강제 추가
      el.classList.add('notranslate');
      var key = el.getAttribute('data-key');
      if (key && terms[key]) {
        el.textContent = terms[key];
        el.setAttribute('title', key); // hover 시 원문 확인
      }
    }
  }

  // 동적 렌더링 대응: MutationObserver
  function _observeCustomTrans(terms) {
    if (!window.MutationObserver || window.__cdCustomTransObserver) return;
    window.__cdCustomTransObserver = new MutationObserver(function (mutations) {
      var needsApply = false;
      for (var i = 0; i < mutations.length; i++) {
        var addedNodes = mutations[i].addedNodes;
        for (var j = 0; j < addedNodes.length; j++) {
          var node = addedNodes[j];
          if (node.nodeType !== 1) continue;
          if (node.classList && node.classList.contains('custom-trans')) { needsApply = true; break; }
          if (node.querySelector && node.querySelector('.custom-trans')) { needsApply = true; break; }
        }
        if (needsApply) break;
      }
      if (needsApply) applyCustomTrans(terms);
    });
    window.__cdCustomTransObserver.observe(document.body, { childList: true, subtree: true });
  }

  /* ── 8. 국가별 통화 변환 ────────────────────────────────────── */
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
      var label = el.getAttribute('data-label') || '';
      el.textContent = (label ? label + ' · ≈ ' : '') + fmt(krw);
    });

    // golden-grain 패키지 가격: data-krw 속성으로 변환
    var priceEls = document.querySelectorAll('.golden-grain-package__price[data-krw]');
    priceEls.forEach(function (el) {
      var krw = parseInt(el.getAttribute('data-krw') || '0', 10);
      if (!krw) return;
      el.textContent = fmt(krw);
    });

    // window.formatWon 전역 오버라이드 → 동적 ChargeModal 가격에도 적용
    window.__cdCurrencyFmt = fmt;
    window.formatWon = function (value) {
      return fmt(Number(value) || 0);
    };

    // MutationObserver: 동적으로 추가되는 가격 요소도 변환
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
        // ① GT 먼저 로드 (전체 번역)
        loadGoogleTranslate(langCode);
        // ② .custom-trans 요소에만 초월 번역 (GT 완료 후 오버라이드)
        fetchTerms(langCode).then(function (terms) {
          setTimeout(function () { applyCustomTrans(terms); }, 500);
          _observeCustomTrans(terms);
        });
        // ③ 국가별 통화 변환
        setTimeout(applyCurrencyConversion, 1000);
      }
      return;
    }

    // 다른 로케일 경로로 이동 (googtrans 쿠키는 위에서 설정됨)
    updateUI(langCode);
    window.location.href = targetPath;
  }

  /* ── 10. 전역 오버라이드 ───────────────────────────────────── */
  window.changeLanguage = nativeChangeLanguage;
  window.__cdNativeLangBound = true;

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

    // 비한국어 로케일 페이지: GT 먼저 → 초월 번역(.custom-trans만) → 통화 변환
    if (lang !== 'ko') {
      // googtrans 쿠키 보장 (직접 URL 접근 시)
      _setGTCookie(lang);

      // ① Google Translate 즉시 로드 → 전체 페이지 번역
      loadGoogleTranslate(lang);

      // ② i18n 사전 fetch → .custom-trans[data-key] 요소에만 초월 번역 오버라이드
      //    GT가 어느 정도 진행된 후 적용 (500ms 지연)
      fetchTerms(lang).then(function (terms) {
        setTimeout(function () { applyCustomTrans(terms); }, 500);
        _observeCustomTrans(terms);
      });

      // ③ 국가 감지 → 통화 변환
      setTimeout(applyCurrencyConversion, 1200);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
