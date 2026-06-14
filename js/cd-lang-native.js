(function () {
  'use strict';

  var SUPPORTED_LANGS = ['ko', 'en', 'ja', 'zh-CN', 'hi', 'es', 'fr', 'de', 'nl', 'ms'];
  var INCLUDED_GT_LANGUAGES = 'ko,en,ja,zh-CN,zh-TW,fr,es,hi,de,nl,ms';
  var LABEL_BY_LANG = {
    ko: 'KR',
    en: 'ENG',
    ja: 'JPN',
    'zh-CN': 'CHN',
    hi: 'HIN',
    es: 'ESP',
    fr: 'FRA',
    de: 'DEU',
    nl: 'NLD',
    ms: 'MYS'
  };
  var I18N_FILE_BY_LANG = {
    en: 'en',
    ja: 'ja',
    'zh-CN': 'zh-cn',
    hi: 'hi',
    es: 'es',
    fr: 'fr',
    de: 'de',
    nl: 'nl',
    ms: 'ms'
  };
  var GT_LANG_BY_LANG = {
    ko: 'ko',
    en: 'en',
    ja: 'ja',
    'zh-CN': 'zh-CN',
    hi: 'hi',
    es: 'es',
    fr: 'fr',
    de: 'de',
    nl: 'nl',
    ms: 'ms'
  };
  var dictionaryCache = {};
  var applying = false;

  function isSupportedLang(lang) {
    return SUPPORTED_LANGS.indexOf(lang) !== -1;
  }

  function normalizeLang(lang) {
    var next = String(lang || '').trim();
    if (next === 'zh' || next === 'zh-cn' || next === 'zh_CN') return 'zh-CN';
    return isSupportedLang(next) ? next : 'ko';
  }

  function getCookieLang() {
    var match = (document.cookie || '').match(/(?:^|;\s*)googtrans=([^;]+)/);
    if (!match || !match[1]) return '';
    var parsed = decodeURIComponent(match[1]).split('/').pop();
    return normalizeLang(parsed);
  }

  function getSavedLang() {
    try {
      var stored = localStorage.getItem('cd_lang');
      if (stored) return normalizeLang(stored);
    } catch (_) {}
    return getCookieLang() || 'ko';
  }

  function setSavedLang(lang) {
    try { localStorage.setItem('cd_lang', lang); } catch (_) {}
  }

  function writeCookie(name, value, maxAge) {
    var host = window.location.hostname;
    var encoded = encodeURIComponent(value);
    var attrs = '; path=/; SameSite=Lax';
    if (typeof maxAge === 'number') attrs += '; max-age=' + maxAge;
    document.cookie = name + '=' + encoded + attrs;
    if (host) {
      document.cookie = name + '=' + encoded + attrs + '; domain=' + host;
      document.cookie = name + '=' + encoded + attrs + '; domain=.' + host;
    }
  }

  function clearGoogleTranslateCookie() {
    writeCookie('googtrans', '', 0);
  }

  function setGoogleTranslateCookie(lang) {
    if (lang === 'ko') {
      clearGoogleTranslateCookie();
      return;
    }
    writeCookie('googtrans', '/ko/' + (GT_LANG_BY_LANG[lang] || lang), 315360000);
  }

  function updateLanguageUi(lang) {
    if (document.documentElement) {
      document.documentElement.setAttribute('data-cd-lang', lang);
    }
    var label = document.getElementById('langLabel') || document.getElementById('translateLangLabel');
    if (label) label.textContent = LABEL_BY_LANG[lang] || lang.toUpperCase();
    Array.prototype.forEach.call(document.querySelectorAll('.lang-btn'), function (btn) {
      var active = normalizeLang(btn.getAttribute('data-lang')) === lang;
      btn.classList.toggle('active', active);
      if (active) btn.setAttribute('aria-current', 'true');
      else btn.removeAttribute('aria-current');
    });
  }

  function closeLanguageMenu() {
    var wrap = document.getElementById('langWrap');
    var trigger = document.getElementById('langTrigger');
    if (wrap) wrap.classList.remove('open');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  }

  function dispatchChange(el) {
    if (!el) return;
    try {
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    } catch (_) {}
    try {
      var event = document.createEvent('HTMLEvents');
      event.initEvent('change', true, false);
      el.dispatchEvent(event);
    } catch (_) {}
  }

  function defineGoogleTranslateInit() {
    if (typeof window.googleTranslateElementInit === 'function') return;
    window.googleTranslateElementInit = function googleTranslateElementInit() {
      if (!window.google || !window.google.translate || !window.google.translate.TranslateElement) return;
      if (window.__cdGoogleTranslateInited || window.__cdGTInited) return;
      window.__cdGoogleTranslateInited = true;
      window.__cdGTInited = true;
      new window.google.translate.TranslateElement({
        pageLanguage: 'ko',
        includedLanguages: INCLUDED_GT_LANGUAGES,
        autoDisplay: false
      }, 'google_translate_element');
    };
  }

  function ensureGoogleTranslate() {
    defineGoogleTranslateInit();
    if (window.google && window.google.translate && window.google.translate.TranslateElement) {
      try { window.googleTranslateElementInit(); } catch (_) {}
      return;
    }
    if (window.__cdGTScriptLoaded || window.__cdGoogleTranslateScriptRequested) return;
    window.__cdGTScriptLoaded = true;
    window.__cdGoogleTranslateScriptRequested = true;
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.onerror = function () {
      window.__cdGTScriptLoaded = false;
      window.__cdGoogleTranslateScriptRequested = false;
    };
    document.head.appendChild(script);
  }

  function selectGoogleTranslateLanguage(lang, attempt) {
    var gtLang = GT_LANG_BY_LANG[lang] || lang;
    var currentAttempt = attempt || 0;
    var select = document.querySelector('#google_translate_element .goog-te-combo') || document.querySelector('.goog-te-combo');
    if (select) {
      select.value = gtLang;
      dispatchChange(select);
      return;
    }
    if (currentAttempt < 80) {
      setTimeout(function () {
        selectGoogleTranslateLanguage(lang, currentAttempt + 1);
      }, 80);
    }
  }

  function valueAtPath(source, path) {
    return String(path || '').replace(/\[(\d+)\]/g, '.$1').split('.').reduce(function (acc, key) {
      if (!acc || !key) return acc;
      return acc[key];
    }, source);
  }

  function loadDictionary(lang) {
    var file = I18N_FILE_BY_LANG[lang];
    if (!file) return Promise.resolve(null);
    if (dictionaryCache[file]) return dictionaryCache[file];
    dictionaryCache[file] = fetch('/i18n/' + file + '.json', { cache: 'force-cache' })
      .then(function (res) {
        if (!res.ok) throw new Error('i18n fetch failed: ' + file);
        return res.json();
      })
      .catch(function () {
        delete dictionaryCache[file];
        return null;
      });
    return dictionaryCache[file];
  }

  function markNativeNodes() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-cd-trans], .custom-trans'), function (el) {
      el.classList.add('notranslate');
      if (!el.hasAttribute('data-cd-origin-text')) {
        el.setAttribute('data-cd-origin-text', el.textContent || '');
      }
    });
  }

  function applyNativeTranslations(lang) {
    markNativeNodes();
    if (lang === 'ko') {
      Array.prototype.forEach.call(document.querySelectorAll('[data-cd-trans], .custom-trans'), function (el) {
        if (el.hasAttribute('data-cd-origin-text')) {
          el.textContent = el.getAttribute('data-cd-origin-text') || '';
        }
      });
      return Promise.resolve();
    }
    return loadDictionary(lang).then(function (dictionary) {
      if (!dictionary) return;
      Array.prototype.forEach.call(document.querySelectorAll('[data-cd-trans], .custom-trans'), function (el) {
        var key = el.getAttribute('data-key') || el.getAttribute('data-cd-trans');
        if (!key) return;
        var value = valueAtPath(dictionary, key);
        if (typeof value === 'string') el.textContent = value;
      });
    });
  }

  function applyGoogleTranslate(lang) {
    if (lang === 'ko') {
      if (typeof window.cdResetGoogleTranslateToKorean === 'function') {
        try { window.cdResetGoogleTranslateToKorean(); } catch (_) {}
      }
      clearGoogleTranslateCookie();
      selectGoogleTranslateLanguage('ko', 0);
      return;
    }
    setGoogleTranslateCookie(lang);
    ensureGoogleTranslate();
    if (typeof window.cdSetGoogleTranslateLanguage === 'function') {
      try {
        window.cdSetGoogleTranslateLanguage(GT_LANG_BY_LANG[lang] || lang, {
          maxAttempts: 90,
          retryDelay: 80,
          fallbackToCookieReload: true
        });
        return;
      } catch (_) {}
    }
    selectGoogleTranslateLanguage(lang, 0);
  }

  function nativeChangeLanguage(langCode, btn) {
    var lang = normalizeLang(langCode || (btn && btn.getAttribute && btn.getAttribute('data-lang')));
    if (applying) return;
    applying = true;
    setSavedLang(lang);
    updateLanguageUi(lang);
    closeLanguageMenu();
    applyGoogleTranslate(lang);
    applyNativeTranslations(lang).finally(function () {
      applying = false;
    });
  }

  window.changeLanguage = nativeChangeLanguage;
  window.cdApplyNativeTranslations = applyNativeTranslations;
  window.__cdNativeLangBound = true;
  window.__cdNativeIncludedLanguages = INCLUDED_GT_LANGUAGES;

  function init() {
    if (document.documentElement) {
      document.documentElement.setAttribute('data-cd-native-lang', 'ready');
    }
    markNativeNodes();
    var lang = getSavedLang();
    updateLanguageUi(lang);
    applyNativeTranslations(lang);
    if (!window.__cdNativeLangClickBound) {
      window.__cdNativeLangClickBound = true;
      document.addEventListener('click', function (event) {
        var target = event && event.target;
        if (!target || !target.closest) return;
        var btn = target.closest('.lang-btn[data-lang]');
        if (!btn) return;
        event.preventDefault();
        event.stopPropagation();
        nativeChangeLanguage(btn.getAttribute('data-lang'), btn);
      }, true);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
