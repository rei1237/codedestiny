/**
 * cd-lang-native.js  v4.0.0
 * 
 * 역할 분담 (순서 엄수):
 *  [Step 1] 페이지 로드 즉시
 *    - [data-cd-trans], .custom-trans 요소에 notranslate 마킹 → GT 제외, 초월 번역 전용
 *    - [data-krw] 요소는 GT가 라벨 텍스트 번역할 수 있도록 notranslate 미적용
 *    - googtrans 쿠키 설정
 *    - googleTranslateElementInit 전역 등록
 *    - Google Translate 스크립트 즉시 로드 (지연 없이)
 *
 *  [Step 2] GT 번역 완료 감지 후 (~1.5~3s)
 *    - [data-cd-trans][data-key] 요소: i18n JSON에서 값 찾아 텍스트 교체 (초월 번역)
 *    - .custom-trans[data-key] 요소: 동일하게 초월 번역 적용
 *
 *  [Step 3] 통화 변환
 *    - /api/geo 국가 감지  [data-krw] 요소 국가별 통화 포맷으로 변환
 *    - window.formatWon 오버라이드  ChargeModal 동적 가격 변환
 *    - MutationObserver  이후 동적 추가 요소도 자동 변환
 *
 * 지원 언어 (10개): ko, en, ja, zh-CN, hi, es, fr, de, nl, ms
 * 
 */
(function () {
  'use strict';

  /*  1. 매핑 테이블  */
  var LANG_TO_SLUG = {
    'ko': '', 'en': 'en-us', 'ja': 'ja-jp', 'zh-CN': 'zh-cn',
    'zh-TW': 'zh-tw', 'it': 'it-it', 'hu': 'hu-hu',
    'hi': 'hi-in', 'es': 'es-es', 'fr': 'fr-fr',
    'de': 'de-de', 'nl': 'nl-nl', 'ms': 'ms-my',
    'th': 'th-th', 'vi': 'vi-vn'
  };

  var SLUG_TO_LANG = {};
  Object.keys(LANG_TO_SLUG).forEach(function (k) {
    if (LANG_TO_SLUG[k]) SLUG_TO_LANG[LANG_TO_SLUG[k]] = k;
  });

  var LABEL_MAP = {
    'ko': 'KR', 'en': 'EN', 'ja': 'JP', 'zh-CN': 'CN',
    'zh-TW': 'TW', 'hi': 'HI', 'es': 'ES', 'fr': 'FR',
    'de': 'DE', 'it': 'IT', 'hu': 'HU', 'nl': 'NL', 'ms': 'MS',
    'th': 'TH', 'vi': 'VI'
  };

  var LANG_TO_GT = {
    'ko': 'ko', 'en': 'en', 'ja': 'ja', 'zh-CN': 'zh-CN',
    'zh-TW': 'zh-TW', 'hi': 'hi', 'es': 'es', 'fr': 'fr',
    'de': 'de', 'it': 'it', 'hu': 'hu', 'nl': 'nl', 'ms': 'ms',
    'th': 'th', 'vi': 'vi'
  };

  var LANG_TO_I18N = {
    'en': 'en', 'ja': 'ja', 'zh-CN': 'zh-cn',
    'hi': 'hi', 'es': 'es', 'fr': 'fr', 'de': 'de', 'nl': 'nl', 'ms': 'ms'
  };

  /*  2. 국가별 통화  */
  var COUNTRY_TO_CURRENCY = {
    US: 'USD', GB: 'GBP', AU: 'AUD', CA: 'CAD', NZ: 'NZD',
    DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR',
    BE: 'EUR', AT: 'EUR', PT: 'EUR', FI: 'EUR', GR: 'EUR',
    JP: 'JPY', CN: 'CNY', HK: 'HKD', TW: 'TWD',
    IN: 'INR', SG: 'SGD', MY: 'MYR', TH: 'THB',
    BR: 'BRL', MX: 'MXN', KR: 'KRW'
  };

  var CURRENCY_RATES = {
    KRW: { fmt: function (n) { return '\u20a9' + Math.round(n).toLocaleString(); } },
    USD: { rate: 0.00074, fmt: function (n) { return '$' + (n * 0.00074).toFixed(2); } },
    EUR: { rate: 0.00068, fmt: function (n) { return '\u20ac' + (n * 0.00068).toFixed(2); } },
    JPY: { rate: 0.11,    fmt: function (n) { return '\u00a5' + Math.round(n * 0.11).toLocaleString(); } },
    CNY: { rate: 0.0053,  fmt: function (n) { return '\u00a5' + (n * 0.0053).toFixed(2); } },
    GBP: { rate: 0.00058, fmt: function (n) { return '\u00a3' + (n * 0.00058).toFixed(2); } },
    AUD: { rate: 0.0012,  fmt: function (n) { return 'A$' + (n * 0.0012).toFixed(2); } },
    CAD: { rate: 0.0010,  fmt: function (n) { return 'C$' + (n * 0.0010).toFixed(2); } },
    NZD: { rate: 0.0013,  fmt: function (n) { return 'NZ$' + (n * 0.0013).toFixed(2); } },
    INR: { rate: 0.062,   fmt: function (n) { return '\u20b9' + Math.round(n * 0.062).toLocaleString(); } },
    SGD: { rate: 0.00099, fmt: function (n) { return 'S$' + (n * 0.00099).toFixed(2); } },
    MYR: { rate: 0.0035,  fmt: function (n) { return 'RM ' + (n * 0.0035).toFixed(2); } },
    THB: { rate: 0.026,   fmt: function (n) { return '\u0e3f' + Math.round(n * 0.026); } },
    HKD: { rate: 0.0058,  fmt: function (n) { return 'HK$' + (n * 0.0058).toFixed(2); } },
    TWD: { rate: 0.024,   fmt: function (n) { return 'NT$' + Math.round(n * 0.024); } },
    BRL: { rate: 0.0038,  fmt: function (n) { return 'R$' + (n * 0.0038).toFixed(2); } },
    MXN: { rate: 0.013,   fmt: function (n) { return 'MX$' + (n * 0.013).toFixed(2); } }
  };

  /*  3. 현재 언어 감지  */
  function normalizeLangCode(langCode) {
    var raw = String(langCode || 'ko').trim();
    if (!raw) return 'ko';
    var low = raw.toLowerCase();
    if (low === 'jp') return 'ja';
    if (low === 'zh' || low === 'zh-cn') return 'zh-CN';
    if (low === 'zh-tw') return 'zh-TW';
    if (low.indexOf('en-') === 0) return 'en';
    if (low.indexOf('fr-') === 0) return 'fr';
    if (low.indexOf('es-') === 0) return 'es';
    if (low.indexOf('de-') === 0) return 'de';
    if (low.indexOf('it-') === 0) return 'it';
    if (low.indexOf('hu-') === 0) return 'hu';
    if (low.indexOf('nl-') === 0) return 'nl';
    if (low.indexOf('ja-') === 0) return 'ja';
    if (low.indexOf('hi-') === 0) return 'hi';
    if (low.indexOf('ms-') === 0) return 'ms';
    if (low.indexOf('th-') === 0) return 'th';
    if (low.indexOf('vi-') === 0) return 'vi';
    if (LANG_TO_GT[raw]) return raw;
    if (LANG_TO_GT[low]) return low;
    return 'ko';
  }

  function detectCurrentLang() {
    try {
      var q = new URLSearchParams(window.location.search || '');
      var fromQuery = q.get('lang');
      if (fromQuery) return normalizeLangCode(fromQuery);
    } catch (_) {}

    var path = (window.location.pathname || '/').toLowerCase().replace(/^\//, '');
    var topSlug = path.split('/')[0] || '';
    if (SLUG_TO_LANG[topSlug]) return SLUG_TO_LANG[topSlug];

    try { var s = localStorage.getItem('cd_lang'); if (s) return normalizeLangCode(s); } catch (_) {}

    try {
      var gt = document.cookie.match(/(?:^|;\s*)googtrans=\/ko\/([^;]+)/i);
      if (gt && gt[1]) return normalizeLangCode(gt[1]);
    } catch (_) {}

    return 'ko';
  }

  /*  4. 쿠키 유틸  */
  function setCookie(name, val, days) {
    var exp = '';
    if (days) {
      var d = new Date();
      d.setTime(d.getTime() + days * 86400000);
      exp = '; expires=' + d.toUTCString();
    }
    document.cookie = name + '=' + val + exp + '; path=/; SameSite=Lax';
  }

  function _setGTCookie(langCode) {
    if (!langCode || langCode === 'ko') return;
    var gtCode = LANG_TO_GT[langCode] || langCode;
    var val = '/ko/' + gtCode;
    var host = window.location.hostname;
    var exp = 'expires=Fri, 31 Dec 9999 23:59:59 GMT';
    document.cookie = 'googtrans=' + val + '; ' + exp + '; path=/; SameSite=Lax';
    if (host) {
      document.cookie = 'googtrans=' + val + '; ' + exp + '; domain=' + host + '; path=/; SameSite=Lax';
      document.cookie = 'googtrans=' + val + '; ' + exp + '; domain=.' + host + '; path=/; SameSite=Lax';
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

  /*  5. UI 업데이트  */
  function updateUI(langCode) {
    var label = document.getElementById('langLabel') || document.getElementById('translateLangLabel');
    if (label) label.textContent = LABEL_MAP[langCode] || langCode.toUpperCase();
    document.querySelectorAll('.lang-btn').forEach(function (btn) {
      var bl = btn.getAttribute('data-lang');
      if (bl === langCode) {
        btn.classList.add('active');
        btn.setAttribute('aria-current', 'true');
      } else {
        btn.classList.remove('active');
        btn.removeAttribute('aria-current');
      }
    });
  }

  /*  6. STEP 1: notranslate 사전 마킹  */
  // GT 로드 전에 호출 - 초월 번역 전용 영역만 GT에서 제외
  // [data-krw] 가격 요소는 GT가 라벨 텍스트를 먼저 번역하도록 제외하지 않음
  function markNotranslate() {
    // [data-cd-trans], .custom-trans: 초월 번역 전용 영역 → GT 제외
    document.querySelectorAll('[data-cd-trans], .custom-trans').forEach(function (el) {
      el.classList.add('notranslate');
    });
    // google_translate_element 컨테이너는 항상 notranslate
    var gte = document.getElementById('google_translate_element');
    if (gte) gte.classList.add('notranslate');
  }

  /*  7. STEP 1: Google Translate 즉시 로드  */
  function loadGoogleTranslate(langCode) {
    if (window.__cdGTScriptLoaded) return;
    window.__cdGTScriptLoaded = true;

    // googleTranslateElementInit을 GT 스크립트 로드 전에 전역 등록
    window.googleTranslateElementInit = function () {
      if (!window.google || !window.google.translate) return;
      if (window.__cdGTInited) return;
      window.__cdGTInited = true;
      new window.google.translate.TranslateElement({
        pageLanguage: 'ko',
        includedLanguages: 'ko,en,ja,zh-CN,zh-TW,fr,es,hi,de,it,hu,nl,ms,th,vi',
        autoDisplay: false
      }, 'google_translate_element');
    };

    var s = document.createElement('script');
    s.type = 'text/javascript';
    s.async = true;
    s.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    s.onerror = function () { window.__cdGTScriptLoaded = false; };
    document.head.appendChild(s);

    // GT 언어 select 자동 설정 (GT UI 콤보박스)
    if (langCode && langCode !== 'ko') {
      _scheduleGTLangSelect(LANG_TO_GT[langCode] || langCode, 50);
    }
  }

  function _scheduleGTLangSelect(gtCode, maxAttempts) {
    var attempts = 0;
    var max = maxAttempts || 50;
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

  /*  8. STEP 2: GT 완료 감지  초월 번역 실행  */
  // GT가 번역을 마치면 <html> 태그에 "translated-ltr" 또는 "translated-rtl" 클래스가 붙음
  function waitForGTThenOverride(langCode) {
    var i18nFile = LANG_TO_I18N[langCode];
    if (!i18nFile) return;

    function runOverride() {
      fetch('/i18n/' + i18nFile + '.json')
        .then(function (r) { return r.ok ? r.json() : {}; })
        .then(function (data) {
          var dict = (data && typeof data.terms === 'object') ? data.terms : {};
          applyCustomTrans(dict, langCode);
          applyBrandStrings(data, langCode);
        })
        .catch(function () { /* 실패 시 GT 번역만 남김 */ });
    }

    // MutationObserver로 html 클래스 변화 감지
    var htmlEl = document.documentElement;
    var alreadyTranslated = htmlEl.classList.contains('translated-ltr') ||
                            htmlEl.classList.contains('translated-rtl');

    if (alreadyTranslated) {
      // 이미 번역됨 (재방문/hot-reload 등)
      setTimeout(runOverride, 300);
      return;
    }

    var observer = new MutationObserver(function (mutations) {
      var done = mutations.some(function (m) {
        if (m.attributeName !== 'class') return false;
        var cls = htmlEl.className || '';
        return cls.indexOf('translated-ltr') !== -1 || cls.indexOf('translated-rtl') !== -1;
      });
      if (done) {
        observer.disconnect();
        setTimeout(runOverride, 400); // GT 렌더 안정화 대기
      }
    });
    observer.observe(htmlEl, { attributes: true, attributeFilter: ['class'] });

    // 폴백: GT가 class를 안 붙이는 경우 3s 후 강제 실행
    setTimeout(function () {
      if (window.__cdTransOverrideDone) return;
      observer.disconnect();
      runOverride();
    }, 3000);
  }

  /*  8a. [data-cd-trans] / .custom-trans 초월 번역  */
  // GT가 이 요소를 건드리지 않도록 notranslate가 이미 마킹된 상태
  // i18n terms 딕셔너리에서 data-key 값으로 번역문 주입
  function applyCustomTrans(dict, langCode) {
    window.__cdTransOverrideDone = true;

    // 방법 A: [data-cd-trans][data-key]  data-key로 딕셔너리 조회
    document.querySelectorAll('[data-cd-trans][data-key], .custom-trans[data-key]').forEach(function (el) {
      var key = el.getAttribute('data-key');
      if (key && dict[key]) {
        el.textContent = dict[key];
      }
    });

    // 방법 B: [data-cd-trans] (data-key 없음)  현재 textContent를 딕셔너리 키로 조회
    document.querySelectorAll('[data-cd-trans]:not([data-key]), .custom-trans:not([data-key])').forEach(function (el) {
      var orig = (el.getAttribute('data-orig') || el.textContent || '').trim();
      if (orig && dict[orig]) {
        el.setAttribute('data-orig', orig); // 원문 보존
        el.textContent = dict[orig];
      }
    });
  }

  /*  8b. 브랜드/서비스 고유명사 보호 (선택적)  */
  // i18n JSON에 "brand" 섹션이 있으면 .cd-brand-name 등 특정 셀렉터에 적용
  function applyBrandStrings(data, langCode) {
    if (!data || !data.brand) return;
    // 브랜드명 요소 교체 (선택적)
    document.querySelectorAll('.cd-brand-tagline').forEach(function (el) {
      if (data.brand.tagline) el.textContent = data.brand.tagline;
    });
    document.querySelectorAll('.cd-brand-subtitle').forEach(function (el) {
      if (data.brand.subtitle) el.textContent = data.brand.subtitle;
    });
  }

  /*  9. STEP 3: 통화 변환  */
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
      .catch(function () { /* geo 실패  KRW 유지 */ });
  }

  function _doApplyCurrency(currency) {
    if (!currency || currency === 'KRW') return;
    var info = CURRENCY_RATES[currency];
    if (!info) return;
    window.__cdCurrencyApplied = true;
    var fmt = info.fmt;

    // pf-coin-note: GT가 번역한 라벨 텍스트 재사용 + 통화 변환 가격 교체
    // (GT가 "영구 해금"을 이미 번역했으므로 현재 텍스트에서 라벨 추출)
    document.querySelectorAll('.pf-coin-note[data-krw]').forEach(function (el) {
      var krw = parseInt(el.getAttribute('data-krw') || '0', 10);
      if (!krw) return;
      var currentText = (el.textContent || '').trim();
      // '·' 기준으로 라벨 파트 추출 (GT가 번역한 부분)
      var dotIdx = currentText.indexOf('\u00b7'); // ·
      var label = dotIdx > 0 ? currentText.substring(0, dotIdx).trim() : (el.getAttribute('data-label') || '');
      el.textContent = (label ? label + ' \u00b7 ' : '') + '\u2248 ' + fmt(krw);
      el.classList.add('notranslate'); // 통화 변환 후 잠금
    });

    // golden-grain 패키지 가격 (숫자만이므로 바로 교체)
    document.querySelectorAll('.golden-grain-package__price[data-krw]').forEach(function (el) {
      var krw = parseInt(el.getAttribute('data-krw') || '0', 10);
      if (!krw) return;
      el.textContent = fmt(krw);
      el.classList.add('notranslate'); // 통화 변환 후 잠금
    });

    // window.formatWon 오버라이드  동적 ChargeModal 가격에도 적용
    window.__cdCurrencyFmt = fmt;
    window.formatWon = function (value) { return fmt(Number(value) || 0); };

    // MutationObserver: 이후 동적으로 추가되는 [data-krw] 요소도 변환
    if (typeof MutationObserver !== 'undefined' && !window.__cdCurrencyObserver) {
      window.__cdCurrencyObserver = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          m.addedNodes.forEach(function (node) {
            if (node.nodeType !== 1) return;
            var els = node.querySelectorAll ? node.querySelectorAll('[data-krw]') : [];
            els.forEach(function (el) {
              var krw = parseInt(el.getAttribute('data-krw') || '0', 10);
              if (!krw) return;
              if (el.classList.contains('golden-grain-package__price')) {
                el.textContent = fmt(krw);
                el.classList.add('notranslate');
              } else if (el.classList.contains('pf-coin-note')) {
                var cur = (el.textContent || '').trim();
                var di = cur.indexOf('\u00b7');
                var lbl = di > 0 ? cur.substring(0, di).trim() : (el.getAttribute('data-label') || '');
                el.textContent = (lbl ? lbl + ' \u00b7 ' : '') + '\u2248 ' + fmt(krw);
                el.classList.add('notranslate');
              }
            });
          });
        });
      });
      window.__cdCurrencyObserver.observe(document.body, { childList: true, subtree: true });
    }
  }

  /*  10. 언어 변경 핸들러  */
  function nativeChangeLanguage(langCode, _btn) {
    langCode = normalizeLangCode(langCode);
    try { localStorage.setItem('cd_lang', langCode); } catch (_) {}
    setCookie('cd_locale_ack', '1', 365);

    if (langCode !== 'ko') {
      _setGTCookie(langCode);
    } else {
      _clearGTCookie();
    }

    updateUI(langCode);
    var wrap = document.getElementById('langWrap');
    if (wrap) wrap.classList.remove('open');
    var trigger = document.getElementById('langTrigger');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');

    if (langCode !== 'ko') {
      markNotranslate();
      loadGoogleTranslate(langCode);
      waitForGTThenOverride(langCode);
      setTimeout(applyCurrencyConversion, 1200);
      return;
    }

    // 한국어 복귀는 GT select가 준비된 경우 즉시 원복하고, 없으면 쿠키 제거만 유지한다.
    _scheduleGTLangSelect('ko', 12);
  }

  window.changeLanguage = nativeChangeLanguage;
  window.__cdNativeLangBound = true;
  window.__cdGoogleTranslateScriptRequested = false;
  window.__cdGoogleTranslateInited = false;

  /*  11. 초기화  */
  function init() {
    var lang = detectCurrentLang();
    updateUI(lang);

    // 클릭 델리게이션
    if (!window.__cdNativeLangClickBound) {
      window.__cdNativeLangClickBound = true;
      document.addEventListener('click', function (e) {
        var btn = e && e.target && e.target.closest && e.target.closest('.lang-btn[data-lang]');
        if (!btn) return;
        var lc = btn.getAttribute('data-lang');
        if (!lc) return;
        e.preventDefault();
        e.stopPropagation();
        nativeChangeLanguage(lc, btn);
      }, true);
    }

    if (lang !== 'ko') {
      // Step 1: notranslate 선점 마킹
      markNotranslate();
      // googtrans 쿠키 보장 (직접 URL 진입 시)
      _setGTCookie(lang);
      // Step 1: GT 즉시 로드 (초월 번역보다 먼저)
      loadGoogleTranslate(lang);
      // Step 2: GT 완료 감지 후 초월 번역
      waitForGTThenOverride(lang);
      // Step 3: 통화 변환 (GT와 독립적으로 실행)
      setTimeout(applyCurrencyConversion, 1000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
