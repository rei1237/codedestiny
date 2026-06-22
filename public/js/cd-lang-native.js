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

  function getUrlLang() {
    try {
      var params = new URLSearchParams(window.location.search || '');
      var lang = params.get('lang');
      return lang ? normalizeLang(lang) : '';
    } catch (_) {}
    return '';
  }

  function getSavedLang() {
    var urlLang = getUrlLang();
    if (urlLang) return urlLang;
    try {
      var stored = localStorage.getItem('cd_lang');
      if (stored) return normalizeLang(stored);
    } catch (_) {}
    return 'ko';
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

  function clearLegacyTranslateCookie() {
    writeCookie('goog' + 'trans', '', 0);
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

  function shouldSkipGoogleTranslate() {
    return true;
  }

  function setNativeOnlyLanguageMode() {
    window.__cdNativeOnlyLanguage = true;
    window.__cdGoogleTranslateSuppressed = true;
    if (document.documentElement) {
      document.documentElement.setAttribute('data-cd-language-engine', 'native');
      document.documentElement.toggleAttribute('data-cd-gt-suppressed', true);
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

  function nativeChangeLanguage(langCode, btn) {
    var lang = normalizeLang(langCode || (btn && btn.getAttribute && btn.getAttribute('data-lang')));
    if (applying) return;
    applying = true;
    setNativeOnlyLanguageMode();
    clearLegacyTranslateCookie();
    setSavedLang(lang);
    writeCookie('cd_locale_ack', '1', 315360000);
    updateLanguageUi(lang);
    closeLanguageMenu();
    applyNativeTranslations(lang).finally(function () {
      applying = false;
    });
  }

  window.changeLanguage = nativeChangeLanguage;
  window.cdApplyNativeTranslations = applyNativeTranslations;
  window.__cdShouldSkipGoogleTranslate = shouldSkipGoogleTranslate;
  window.__cdNativeLangBound = true;
  window.__cdNativeIncludedLanguages = INCLUDED_GT_LANGUAGES;

  function init() {
    setNativeOnlyLanguageMode();
    clearLegacyTranslateCookie();
    if (document.documentElement) {
      document.documentElement.setAttribute('data-cd-native-lang', 'ready');
    }
    markNativeNodes();
    var lang = getSavedLang();
    if (getUrlLang()) setSavedLang(lang);
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
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
        else event.stopPropagation();
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
