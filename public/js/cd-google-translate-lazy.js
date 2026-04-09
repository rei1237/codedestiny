(function () {
  'use strict';

  var loaded = false;

  function loadTranslate() {
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

  function hasTranslateIntent() {
    try {
      if ((document.cookie || '').indexOf('googtrans=') !== -1) return true;
      if ((location.search || '').indexOf('lang=') !== -1) return true;
    } catch (_) {}
    return false;
  }

  document.addEventListener('click', function (e) {
    var t = e && e.target;
    if (!t || !t.closest) return;
    if (t.closest('.translate-lang-wrap, #translateLangToggleBtn, #translateLangCard, #google_translate_element, .lang-toggle-wrap, #langWrap, #langTrigger, .lang-btn')) {
      loadTranslate();
    }
  }, { passive: true });

  window.addEventListener('pointerdown', function () {
    if (hasTranslateIntent()) loadTranslate();
  }, { once: true, passive: true });

  window.addEventListener('load', function () {
    if (hasTranslateIntent()) {
      loadTranslate();
      return;
    }
  }, { once: true });
})();

