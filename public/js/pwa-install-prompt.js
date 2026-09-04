(function () {
  'use strict';

  /* 홈 하단 "앱으로 다운받기" 카드(#cdAppInstall)의 컨트롤러.
     2026-09-04: 초기 진입 전면 모달(#cdPwaInstallPrompt, position:fixed;inset:0)을 걷어내고
     이메일 구독 박스 아래 상시 카드로 옮겼다. 모달은 첫 화면을 막고 홈 카드 탭을 가로챈
     기록이 있다(docs/handoff/mobile-home-perf.md).
     카드는 마크업에서 hidden 으로 시작하고 beforeinstallprompt 가 와야 열린다 —
     iOS Safari 처럼 이벤트가 없는 브라우저·이미 설치된 환경·네이티브 앱에서는 계속 숨겨진다. */

  var CARD_ID = 'cdAppInstall';
  var deferredInstallPrompt = null;
  var boundCta = null;

  function isNativeApp() {
    /* 🔴 판별 정본은 js/core/app-context.js 하나다(docs/app-audit/APP_UIUX_SPEC.md §2). */
    try {
      var ctx = window.__cdAppContext;
      if (ctx && typeof ctx.isApp === 'function') return ctx.isApp();
    } catch (_) {}
    /* 정본 미로딩 폴백 — 정본과 같은 신호만 본다. `!!window.Capacitor` 로 넓히지 말 것(과대판정). */
    try {
      if (window.__CODE_DESTINY_RUNTIME_TARGET === 'mobile-app') return true;
      if (document.documentElement
        && document.documentElement.getAttribute('data-runtime-target') === 'mobile-app') return true;
      var cap = window.Capacitor;
      return !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
    } catch (_) {
      return false;
    }
  }

  function isStandalone() {
    try {
      return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
        || window.navigator.standalone === true;
    } catch (_) {
      return false;
    }
  }

  function getCard() {
    return document.getElementById(CARD_ID);
  }

  function hideCard() {
    var el = getCard();
    if (el) el.hidden = true;
  }

  function onCtaClick() {
    var promptEvent = deferredInstallPrompt;
    deferredInstallPrompt = null;
    hideCard();
    if (!promptEvent) return;
    try {
      promptEvent.prompt();
    } catch (_) {
      return;
    }
    Promise.resolve(promptEvent.userChoice).catch(function () {});
  }

  function showCard() {
    var el = getCard();
    if (!el) return;
    /* 🔴 원칙 6(중첩 사전검사) — 셸에는 이미 data-action 전역 델리게이션(js/core/uiBindings.js)이
       있다. 두 번째 document 리스너를 얹지 않고 이 버튼 하나에만 건다
       (deferredInstallPrompt 를 이 모듈이 쥐고 있어 uiBindings 로 뺄 이유가 없다). */
    var cta = el.querySelector('[data-cd-app-install]');
    if (cta && cta !== boundCta) {
      cta.addEventListener('click', onCtaClick);
      boundCta = cta;
    }
    el.hidden = false;
  }

  window.addEventListener('beforeinstallprompt', function (event) {
    if (isNativeApp() || isStandalone()) return;
    event.preventDefault();
    deferredInstallPrompt = event;
    showCard();
  });

  window.addEventListener('appinstalled', function () {
    deferredInstallPrompt = null;
    hideCard();
  });
})();
