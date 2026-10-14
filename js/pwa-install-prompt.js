(function () {
  'use strict';

  /* 홈 하단 "앱으로 다운받기" 카드(#cdAppInstall)의 컨트롤러.
     2026-09-04: 초기 진입 전면 모달(#cdPwaInstallPrompt, position:fixed;inset:0)을 걷어내고
     이메일 구독 박스 아래 상시 카드로 옮겼다. 모달은 첫 화면을 막고 홈 카드 탭을 가로챈
     기록이 있다(docs/handoff/mobile-home-perf.md).
     카드는 마크업에서 hidden 으로 시작한다. Chromium 계열은 beforeinstallprompt 가 왔을 때,
     iOS/iPadOS 는 Safari 의 공유 메뉴 설치 안내를 제공할 수 있을 때만 연다. 이미 설치된 환경과
     네이티브 앱에서는 계속 숨겨진다. */

  var CARD_ID = 'cdAppInstall';
  var deferredInstallPrompt = null;
  var boundCta = null;
  var promptInFlight = false;
  var installMode = '';

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

  function isIOS() {
    try {
      var navigator = window.navigator || {};
      return /iPad|iPhone|iPod/i.test(navigator.userAgent || '')
        || (navigator.platform === 'MacIntel' && Number(navigator.maxTouchPoints) > 1);
    } catch (_) {
      return false;
    }
  }

  function isSafari() {
    try {
      var navigator = window.navigator || {};
      return /Safari/i.test(navigator.userAgent || '')
        && /Apple/i.test(navigator.vendor || '')
        && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(navigator.userAgent || '');
    } catch (_) {
      return false;
    }
  }

  function isKorean() {
    try {
      return /^ko\b/i.test(document.documentElement.getAttribute('lang') || '');
    } catch (_) {
      return false;
    }
  }

  function installText(key, korean, english) {
    var fallback = isKorean() ? korean : english;
    try {
      return typeof window.cdTranslate === 'function' ? window.cdTranslate(key, {}, fallback) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function hideCard() {
    var el = getCard();
    if (el) el.hidden = true;
  }

  function onCtaClick() {
    if (installMode === 'ios') {
      var iosCard = getCard();
      var note = iosCard && iosCard.querySelector('[data-cd-app-install-note]');
      if (note) note.hidden = false;
      if (boundCta) boundCta.setAttribute('aria-expanded', 'true');
      return;
    }
    var promptEvent = deferredInstallPrompt;
    if (promptInFlight || !promptEvent || typeof promptEvent.prompt !== 'function') return;
    promptInFlight = true;
    try {
      promptEvent.prompt();
    } catch (_) {
      promptInFlight = false;
      return;
    }
    deferredInstallPrompt = null;
    Promise.resolve(promptEvent.userChoice).then(function () {
      promptInFlight = false;
      /* BeforeInstallPromptEvent 는 prompt() 1회성이다. 취소된 이벤트를 재사용하지 않고,
         브라우저가 새 이벤트를 보낼 때까지 카드를 숨겨서 죽은 재시도 버튼을 만들지 않는다. */
      hideCard();
    }).catch(function () {
      promptInFlight = false;
      /* prompt() 자체가 성공했지만 결과를 읽지 못한 경우에도 이벤트는 재사용하지 않는다. */
      hideCard();
    });
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

  function showIOSGuidance() {
    if (!isIOS() || isNativeApp() || isStandalone()) return;
    var el = getCard();
    if (!el) return;
    installMode = 'ios';
    var cta = el.querySelector('[data-cd-app-install]');
    var body = el.querySelector('.cd-app-install__body');
    var note = el.querySelector('[data-cd-app-install-note]');
    if (body) {
      body.removeAttribute('data-cd-trans');
      body.removeAttribute('data-key');
      body.textContent = installText('home.appInstall.iosBody',
        'iPhone과 iPad에서는 Safari의 홈 화면 추가로 앱처럼 빠르게 열 수 있어요.',
        'On iPhone and iPad, add this site to your Home Screen in Safari to open it like an app.');
    }
    if (cta) {
      cta.removeAttribute('data-cd-trans');
      cta.removeAttribute('data-key');
      cta.textContent = installText('home.appInstall.iosCta', '핸드폰에 추가하기', 'Add to this phone');
      cta.setAttribute('aria-expanded', 'false');
      cta.setAttribute('aria-controls', 'cdAppInstallNote');
    }
    if (note) {
      note.textContent = isSafari()
        ? installText('home.appInstall.iosSafari',
          'Safari 하단의 공유 버튼을 누른 뒤 ‘홈 화면에 추가’를 선택해 주세요. App Store 다운로드 방식은 아직 제공하지 않아요.',
          'Tap Share in Safari, then choose Add to Home Screen. An App Store download is not available yet.')
        : installText('home.appInstall.iosOther',
          'Safari에서 이 페이지를 연 뒤 공유 버튼 → ‘홈 화면에 추가’를 선택해 주세요. App Store 다운로드 방식은 아직 제공하지 않아요.',
          'Open this page in Safari, tap Share, then choose Add to Home Screen. An App Store download is not available yet.');
    }
    showCard();
  }

  window.addEventListener('beforeinstallprompt', function (event) {
    if (isNativeApp() || isStandalone()) return;
    if (!event || typeof event.prompt !== 'function') return;
    event.preventDefault();
    installMode = 'prompt';
    deferredInstallPrompt = event;
    promptInFlight = false;
    showCard();
  });

  window.addEventListener('appinstalled', function () {
    deferredInstallPrompt = null;
    hideCard();
  });

  if (document.readyState === 'loading' && typeof document.addEventListener === 'function') {
    document.addEventListener('DOMContentLoaded', showIOSGuidance, { once: true });
  } else {
    showIOSGuidance();
  }

})();
