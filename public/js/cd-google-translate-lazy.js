(function () {
  'use strict';

  var loaded = false;

  function shouldSkipGoogleTranslate() {
    try {
      if (typeof window.__cdShouldSkipGoogleTranslate === 'function') {
        return !!window.__cdShouldSkipGoogleTranslate();
      }
      return !!window.__cdGoogleTranslateSuppressed;
    } catch (_) {}
    return false;
  }

  function loadTranslate() {
    if (shouldSkipGoogleTranslate()) return;
    // cd-lang-native.js v4+가 이미 GT를 로드한 경우 중복 로드 방지
    if (loaded || window.__cdGTScriptLoaded) return;
    loaded = true;
    window.__cdGTScriptLoaded = true;

    // googleTranslateElementInit이 아직 없으면 기본 등록
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

    var s = document.createElement('script');
    s.type = 'text/javascript';
    s.async = true;
    s.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    s.onerror = function () { loaded = false; window.__cdGTScriptLoaded = false; };
    document.head.appendChild(s);
  }

  function normalizeLang(lang) {
    var next = String(lang || '').trim();
    if (next === 'zh' || next === 'zh-cn' || next === 'zh_CN') return 'zh-CN';
    if (/^(ko|en|ja|zh-CN|hi|es|fr|de|nl|ms)$/.test(next)) return next;
    return 'ko';
  }

  function getUrlLang() {
    try {
      var params = new URLSearchParams(window.location.search || '');
      var lang = params.get('lang');
      return lang ? normalizeLang(lang) : '';
    } catch (_) {}
    return '';
  }

  function getExplicitSavedLang() {
    try {
      if (localStorage.getItem('cd_lang_explicit') !== '1') return '';
      var lang = localStorage.getItem('cd_lang');
      return lang ? normalizeLang(lang) : '';
    } catch (_) {}
    return '';
  }

  function hasTranslateIntent() {
    if (shouldSkipGoogleTranslate()) return false;
    var urlLang = getUrlLang();
    if (urlLang && urlLang !== 'ko') return true;
    var savedLang = getExplicitSavedLang();
    if (savedLang && savedLang !== 'ko') return true;
    return false;
  }

  function loadTranslateForExplicitIntent() {
    if (hasTranslateIntent()) loadTranslate();
  }

  document.addEventListener('click', function (e) {
    var t = e && e.target;
    if (!t || !t.closest) return;
    if (t.closest('.translate-lang-wrap, #translateLangToggleBtn, #translateLangCard, #google_translate_element, .lang-toggle-wrap, #langWrap, #langTrigger, .lang-btn')) {
      loadTranslate();
    }
  }, { passive: true });

  window.addEventListener('pointerdown', function () {
    loadTranslateForExplicitIntent();
  }, { once: true, passive: true });

  window.addEventListener('load', function () {
    loadTranslateForExplicitIntent();
  }, { once: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadTranslateForExplicitIntent, { once: true });
  } else {
    loadTranslateForExplicitIntent();
  }
})();
