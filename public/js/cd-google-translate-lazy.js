(function () {
  'use strict';

  var loaded = false;

  function loadTranslate() {
    if (loaded) return;
    loaded = true;

    // 일부 로케일 HTML에 있던 inline cleanup 호출을 안전하게 대체합니다.
    // cleanup이 없으면 아무 영향이 없습니다.
    if (typeof cleanup === 'function') cleanup();

    var s = document.createElement('script');
    s.type = 'text/javascript';
    s.async = true;
    s.defer = true;
    s.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    s.onerror = function () { loaded = false; };
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

