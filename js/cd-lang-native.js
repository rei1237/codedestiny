(function () {
  'use strict';

  var SUPPORTED_LANGS = ['ko', 'en', 'ja', 'zh-CN', 'zh-TW', 'vi', 'hi', 'es', 'fr', 'de', 'nl', 'ms'];
  var INCLUDED_GT_LANGUAGES = 'ko,en,ja,zh-CN,zh-TW,vi,fr,es,hi,de,nl,ms';
  var LABEL_BY_LANG = {
    ko: 'KR',
    en: 'ENG',
    ja: 'JPN',
    'zh-CN': 'CHN',
    'zh-TW': 'TWN',
    vi: 'VIE',
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
    'zh-TW': 'zh-tw',
    vi: 'vi',
    hi: 'hi',
    es: 'es',
    fr: 'fr',
    de: 'de',
    nl: 'nl',
    ms: 'ms'
  };
  var MISSING_TEXT_BY_LANG = {
    ko: '번역을 준비 중입니다',
    en: 'Translation pending',
    ja: '翻訳を準備しています',
    'zh-CN': '翻译准备中',
    'zh-TW': '翻譯準備中',
    vi: 'Đang chuẩn bị bản dịch',
    hi: 'अनुवाद तैयार हो रहा है',
    es: 'Traducción en preparación',
    fr: 'Traduction en préparation',
    de: 'Übersetzung wird vorbereitet',
    nl: 'Vertaling wordt voorbereid',
    ms: 'Terjemahan sedang disediakan'
  };
  var dictionaryCache = {};
  var activeDictionary = null;
  var activeDictionaryLang = 'ko';
  var missingKeyLog = {};
  var applying = false;

  function isSupportedLang(lang) {
    return SUPPORTED_LANGS.indexOf(lang) !== -1;
  }

  function normalizeLang(lang) {
    var next = String(lang || '').trim();
    var lower = next.toLowerCase().replace('_', '-');
    if (lower === 'zh' || lower === 'zh-cn' || lower === 'zh-hans') return 'zh-CN';
    if (lower === 'zh-tw' || lower === 'zh-hant' || lower === 'zh-hk' || lower === 'zh-mo') return 'zh-TW';
    if (lower === 'vi-vn') return 'vi';
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

  function readCookie(name) {
    try {
      var prefix = name + '=';
      var parts = String(document.cookie || '').split(';');
      for (var i = 0; i < parts.length; i += 1) {
        var item = parts[i].trim();
        if (item.indexOf(prefix) === 0) return decodeURIComponent(item.slice(prefix.length));
      }
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
    var cookieLang = readCookie('cd_locale');
    if (cookieLang) return normalizeLang(cookieLang);
    return 'ko';
  }

  function setSavedLang(lang) {
    try { localStorage.setItem('cd_lang', lang); } catch (_) {}
    writeCookie('cd_locale', lang, 315360000);
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
      document.documentElement.setAttribute('lang', lang === 'zh-CN' ? 'zh-CN' : lang === 'zh-TW' ? 'zh-TW' : lang);
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

  function interpolate(value, vars) {
    if (!vars || typeof vars !== 'object') return value;
    return String(value || '').replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}|\{\s*([a-zA-Z0-9_.-]+)\s*\}/g, function (_, doubleKey, singleKey) {
      var key = doubleKey || singleKey;
      return Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : '';
    });
  }

  function readVars(el) {
    var raw = el && el.getAttribute && el.getAttribute('data-cd-vars');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function missingText(lang) {
    return MISSING_TEXT_BY_LANG[lang] || MISSING_TEXT_BY_LANG.en;
  }

  function reportMissingKey(lang, key, attrName) {
    var id = [lang, key, attrName || 'text'].join('|');
    if (missingKeyLog[id]) return;
    missingKeyLog[id] = true;
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[cd-i18n-missing]', { lang: lang, key: key, attr: attrName || 'text' });
    }
  }

  function resolveValue(dictionary, key, lang, attrName) {
    var value = valueAtPath(dictionary, key);
    if (typeof value === 'string') return value;
    reportMissingKey(lang, key, attrName);
    return missingText(lang);
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

  function shouldTranslateText(el) {
    return !!(
      el &&
      (el.hasAttribute('data-cd-trans') ||
        el.hasAttribute('data-key') ||
        el.classList.contains('custom-trans'))
    );
  }

  function markNativeNodes() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-cd-trans], [data-cd-trans-attr], .custom-trans'), function (el) {
      el.classList.add('notranslate');
      if (shouldTranslateText(el) && !el.hasAttribute('data-cd-origin-text')) {
        el.setAttribute('data-cd-origin-text', el.textContent || '');
      }
      var attrSpec = el.getAttribute('data-cd-trans-attr') || '';
      attrSpec.split(',').map(function (item) { return item.trim(); }).filter(Boolean).forEach(function (item) {
        var attrName = item.split(':')[0].trim();
        if (!attrName) return;
        var originName = 'data-cd-origin-attr-' + attrName.replace(/[^a-zA-Z0-9_-]/g, '-');
        if (!el.hasAttribute(originName)) {
          el.setAttribute(originName, el.getAttribute(attrName) || '');
        }
      });
    });
  }

  function applyAttributeTranslations(el, dictionary, lang, vars) {
    var attrSpec = el.getAttribute('data-cd-trans-attr') || '';
    attrSpec.split(',').map(function (item) { return item.trim(); }).filter(Boolean).forEach(function (item) {
      var parts = item.split(':');
      var attrName = String(parts.shift() || '').trim();
      var attrKey = String(parts.join(':') || '').trim();
      if (!attrName || !attrKey) return;
      var value = interpolate(resolveValue(dictionary, attrKey, lang, attrName), vars);
      el.setAttribute(attrName, value);
    });
  }

  function applyNativeTranslations(lang) {
    markNativeNodes();
    if (lang === 'ko') {
      activeDictionary = null;
      activeDictionaryLang = 'ko';
      Array.prototype.forEach.call(document.querySelectorAll('[data-cd-trans], [data-cd-trans-attr], .custom-trans'), function (el) {
        if (shouldTranslateText(el) && el.hasAttribute('data-cd-origin-text')) {
          el.textContent = el.getAttribute('data-cd-origin-text') || '';
        }
        var attrSpec = el.getAttribute('data-cd-trans-attr') || '';
        attrSpec.split(',').map(function (item) { return item.trim(); }).filter(Boolean).forEach(function (item) {
          var attrName = item.split(':')[0].trim();
          if (!attrName) return;
          var originName = 'data-cd-origin-attr-' + attrName.replace(/[^a-zA-Z0-9_-]/g, '-');
          if (el.hasAttribute(originName)) el.setAttribute(attrName, el.getAttribute(originName) || '');
        });
      });
      return Promise.resolve();
    }
    return loadDictionary(lang).then(function (dictionary) {
      if (!dictionary) dictionary = {};
      activeDictionary = dictionary;
      activeDictionaryLang = lang;
      Array.prototype.forEach.call(document.querySelectorAll('[data-cd-trans], [data-cd-trans-attr], .custom-trans'), function (el) {
        var key = el.getAttribute('data-key') || el.getAttribute('data-cd-trans');
        var vars = readVars(el);
        if (key) el.textContent = interpolate(resolveValue(dictionary, key, lang, 'text'), vars);
        applyAttributeTranslations(el, dictionary, lang, vars);
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
  window.cdGetCurrentLanguage = getSavedLang;
  window.cdTranslate = function (key, vars, fallback) {
    var lang = getSavedLang();
    if (lang === 'ko') return typeof fallback === 'string' ? interpolate(fallback, vars || {}) : key;
    if (!activeDictionary || activeDictionaryLang !== lang) return typeof fallback === 'string' ? interpolate(fallback, vars || {}) : missingText(lang);
    return interpolate(resolveValue(activeDictionary, key, lang, 'text'), vars || {});
  };
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
