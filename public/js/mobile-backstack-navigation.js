(function () {
  'use strict';

  if (typeof window === 'undefined' || window.__cdMobileBackNavBooted) return;
  window.__cdMobileBackNavBooted = true;

  var BACK_GUARD_FLAG = '__cdStaticBackGuardV1';
  var BACK_SURFACE_FLAG = '__cdStaticBackSurfaceV1';
  var BACK_STAMP_FLAG = '__cdStaticBackStampV1';

  var MAIN_DOUBLE_BACK_MS = 2000;
  var POP_DEBOUNCE_MS = 170;
  var TRANSITION_LOCK_MS = 180;

  var state = {
    surface: 'main',
    feature: '',
    firstMainBackAt: 0,
    lastPopAt: 0,
    lastTransitionAt: 0,
    allowNativeBackOnce: false,
    toastTimer: null
  };

  // 사주 화면은 오버레이가 아니라 셸 안에서 자리를 바꾸는 #resultPage 다. 그래서 여기에 여는
  // 액션만 있고 대응하는 오버레이 id 는 없다 — KNOWN_OVERLAY_IDS 에 없으니 아래 일괄 닫기에도
  // 걸리지 않아 하위 기능을 열어도 사주 결과는 그대로 남는다.
  var SAJU_MAIN_ACTIONS = {
    checkPrivacyAndCalculate: true,
    agreeAndCalculate: true,
    calculate: true,
    runCompat: true
  };

  var SAJU_SUB_ACTIONS = {
    openSajuFunFeature: true,
    openLuckSyncDiary: true
  };

  var FEATURE_OPEN_ACTIONS = {
    openPhysiognomyApp: true,
    openPastLifeFaceApp: true,
    openMbtiModal: true,
    openTarotLoveModal: true,
    openTarotHealingModal: true,
    openTarotSelfEsteemModal: true,
    openTarotReunionModal: true,
    openTarotYearFortuneModal: true,
    openTarotModal: true,
    openAnimalTotemModal: true,
    openHwatuModal: true,
    openKemetModal: true,
    openJuyukModal: true,
    openSukuyoModal: true,
    openAstroModal: true,
    openZiweiModal: true,
    openDestinyFlower: true,
    openAstrologyFlower: true,
    openJamidusuFlower: true,
    openSukuyoFlower: true,
    openDreamModal: true,
    openPsychoDreamModal: true,
    openOlympusOracleModal: true,
    openRuneOracle: true,
    openIfaOracle: true,
    openRoyalTeaOracle: true,
    openSibylModal: true,
    gotoNamingPremium: true,
    startIjikTarot: true,
    startMindScanTarot: true,
    startCrystalSoulTarot: true,
    openDestinyFlowerStudio: true,
    openAstrologyFlowerStudio: true,
    openJamidusuFlowerStudio: true,
    openSukuyoFlowerStudio: true,
    openGoldenGrainCharge: true
  };

  var CLOSE_ACTIONS = {
    closeCurrentPage: true,
    closeModal: true,
    closeTarotModal: true,
    closeTarotLoveModal: true,
    closeTarotHealingModal: true,
    closeTarotReunionModal: true,
    closeTarotSelfEsteemModal: true,
    closeTarotYearFortuneModal: true,
    closeAnimalTotemModal: true,
    closeDreamModal: true,
    closePsychoDreamModal: true,
    closeKemetModal: true,
    closeJuyukModal: true,
    closeSukuyoModal: true,
    closeZiweiModal: true,
    closeAstroModal: true,
    closeOlympusOracleModal: true,
    closeSajuNewYearModal: true,
    closeLifeBookModal: true,
    closeLoveSecretModal: true,
    closeSibylModal: true,
    closeDestinyFlowerStudio: true,
    closeLuckSyncDiary: true
  };

  var ACTION_TO_OVERLAY_ID = {
    openSukuyoModal: 'sukuyoModalOverlay',
    openZiweiModal: 'ziweiModalOverlay',
    openAstroModal: 'astroModalOverlay',
    openTarotLoveModal: 'tarotLoveOverlay',
    openTarotHealingModal: 'tarotHealingOverlay',
    openTarotReunionModal: 'tarotReunionOverlay',
    openTarotSelfEsteemModal: 'tarotSelfEsteemOverlay',
    openTarotYearFortuneModal: 'tarotYearFortuneOverlay',
    openAnimalTotemModal: 'animalTotemOverlay',
    openDreamModal: 'dreamModalOverlay',
    openPsychoDreamModal: 'psychoDreamModalOverlay',
    openKemetModal: 'kemetOracleOverlay',
    openJuyukModal: 'juyukModalOverlay',
    openOlympusOracleModal: 'olympusOracleOverlay',
    openSibylModal: 'sibylModal',
    openDestinyFlowerStudio: 'destinyFlowerStudioOverlay',
    openMbtiModal: 'mbtiModalOverlay',
    openHwatuModal: 'hwatuModalOverlay',
    openGoldenGrainCharge: 'goldenGrainChargeModal',
    gotoNamingPremium: 'namingBookModal'
  };

  var KNOWN_OVERLAY_IDS = [
    'tilePvwOverlay',
    'tsModal',
    'sukuyoModalOverlay',
    'ziweiModalOverlay',
    'astroModalOverlay',
    'tarotModalOverlay',
    'tarotLoveOverlay',
    'tarotHealingOverlay',
    'tarotReunionOverlay',
    'tarotSelfEsteemOverlay',
    'tarotYearFortuneOverlay',
    'animalTotemOverlay',
    'dreamModalOverlay',
    'psychoDreamModalOverlay',
    'kemetOracleOverlay',
    'juyukModalOverlay',
    'destinyFlowerStudioOverlay',
    'olympusOracleOverlay',
    'sibylModal',
    'mbtiModalOverlay',
    'hwatuModalOverlay',
    'privacy-modal-overlay',
    'sajuLoaderOverlay',
    'tarotFocusOverlay',
    'dpListOverlay',
    'dpSwitchConfirmOverlay',
    'sbLockOverlay',
    'cdLoginRequiredModal',
    'cdPaymentLoadingOverlay',
    'ios-install-modal',
    'astralModal',
    'goldenGrainChargeModal',
    'coinChargeModal',
    'namingBookModal',
    'ziweiBookOverlay',
    'astroBookOverlay',
    'sukuyoBookOverlay',
    'vedicBookOverlay'
  ];

  function now() {
    return Date.now();
  }

  function isMobileRuntime() {
    try {
      var hasMatchMedia = typeof window.matchMedia === 'function';
      var coarse = hasMatchMedia && (
        window.matchMedia('(pointer:coarse)').matches ||
        window.matchMedia('(any-pointer:coarse)').matches
      );
      var maxTouchPoints = typeof navigator.maxTouchPoints === 'number' ? navigator.maxTouchPoints : 0;
      var touchCapable = coarse || maxTouchPoints > 0;
      if (touchCapable) return true;
      return /android|iphone|ipad|ipod|mobile/i.test(String(navigator.userAgent || ''));
    } catch (_) {
      return false;
    }
  }

  function getHistoryState() {
    var s = window.history.state;
    if (!s || typeof s !== 'object') return {};
    return s;
  }

  function buildHistoryState(isGuard) {
    var base = getHistoryState();
    base[BACK_SURFACE_FLAG] = state.surface;
    base[BACK_GUARD_FLAG] = !!isGuard;
    base[BACK_STAMP_FLAG] = now();
    return base;
  }

  function isGuardState() {
    var s = getHistoryState();
    return !!(s && s[BACK_GUARD_FLAG] === true);
  }

  function ensureGuardState() {
    try {
      if (isGuardState()) return;
      window.history.replaceState(buildHistoryState(false), '', window.location.href);
      window.history.pushState(buildHistoryState(true), '', window.location.href);
    } catch (_) {}
  }

  function rearmGuardState() {
    try {
      if (isGuardState()) return;
      window.history.pushState(buildHistoryState(true), '', window.location.href);
    } catch (_) {}
  }

  function hideOverlayNode(node) {
    if (!node) return;
    try {
      node.classList.remove('open');
      node.classList.remove('is-open');
      node.classList.remove('pvw-open');
      node.classList.remove('pvw-prem');
      // 시빌라 모달의 개봉 클래스. 빼 주지 않으면 인라인 display:none 으로 감춰졌는데도
      // 클래스상으론 계속 "열림"이라 다음 개봉·스크롤락 해제 판정이 모두 어긋난다.
      node.classList.remove('sb-open');
      node.style.display = 'none';
      node.style.visibility = 'hidden';
      node.style.pointerEvents = 'none';
      node.setAttribute('aria-hidden', 'true');
      if (node.hasAttribute('inert')) node.removeAttribute('inert');
    } catch (_) {}
  }

  function closeAllKnownOverlays(exceptId) {
    for (var i = 0; i < KNOWN_OVERLAY_IDS.length; i += 1) {
      var id = KNOWN_OVERLAY_IDS[i];
      if (exceptId && id === exceptId) continue;
      var node = document.getElementById(id);
      if (!node) continue;
      hideOverlayNode(node);
    }

    try {
      document.body.classList.remove('lb-modal-open');
      // 상세 팝업은 열릴 때 body 자식 전체에 inert 를 건다. 여기서 노드만 감추고 끝내면
      // 그 inert 가 남아 화면은 보이는데 아무것도 안 눌리는 상태가 된다.
      if (typeof window._cdReleaseTilePreviewInert === 'function') window._cdReleaseTilePreviewInert();
      // 키드 스크롤 락(lockCount)까지 초기화 + position/top/width 복원 —
      // overflow만 지우면 남아있는 키드 카운트가 다음 락에서 다시 hidden을 씌운다.
      if (typeof window.__cdForceUnlockBodyScroll === 'function') {
        window.__cdForceUnlockBodyScroll();
      } else {
        if (typeof window.__cdResetBodyScrollLock === 'function') window.__cdResetBodyScrollLock();
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
      }
    } catch (_) {}
  }

  function replaceToMainUrl() {
    try {
      var next = new URL(window.location.href);
      next.pathname = '/index.html';
      next.search = '';
      next.hash = '';
      window.history.replaceState(buildHistoryState(false), '', next.toString());
    } catch (_) {}
  }

  function setSurface(nextSurface, feature) {
    if (!nextSurface) return;
    state.surface = nextSurface;
    state.feature = feature || '';
    state.lastTransitionAt = now();
  }

  function resetToMain() {
    closeAllKnownOverlays();
    setSurface('main', '');
    replaceToMainUrl();
    state.firstMainBackAt = 0;
  }

  function resetToSaju() {
    closeAllKnownOverlays();
    setSurface('saju', 'saju');
  }

  function ensureToastNode() {
    var toast = document.getElementById('cdExitIntentToast');
    if (toast) return toast;

    toast = document.createElement('div');
    toast.id = 'cdExitIntentToast';
    toast.style.position = 'fixed';
    toast.style.left = '50%';
    toast.style.bottom = '96px';
    toast.style.transform = 'translateX(-50%) translateY(10px)';
    toast.style.background = 'rgba(15, 23, 42, 0.92)';
    toast.style.color = '#f8fafc';
    toast.style.padding = '11px 16px';
    toast.style.borderRadius = '999px';
    toast.style.fontSize = '13px';
    toast.style.fontWeight = '600';
    toast.style.letterSpacing = '0.01em';
    toast.style.zIndex = '100160';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity .18s ease, transform .18s ease';
    toast.style.pointerEvents = 'none';
    document.body.appendChild(toast);
    return toast;
  }

  function showMainExitToast() {
    if (typeof window.showToast === 'function') {
      try {
        window.showToast('한 번 더 누르면 종료됩니다');
        return;
      } catch (_) {}
    }

    var toast = ensureToastNode();
    toast.textContent = '한 번 더 누르면 종료됩니다';
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';

    if (state.toastTimer) {
      clearTimeout(state.toastTimer);
      state.toastTimer = null;
    }

    state.toastTimer = setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(10px)';
      state.toastTimer = null;
    }, MAIN_DOUBLE_BACK_MS);
  }

  function attemptAppExit() {
    try {
      if (window.Android && typeof window.Android.exitApp === 'function') {
        window.Android.exitApp();
        return true;
      }

      if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.exitApp && typeof window.webkit.messageHandlers.exitApp.postMessage === 'function') {
        window.webkit.messageHandlers.exitApp.postMessage({ source: 'code-destiny' });
        return true;
      }

      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App && typeof window.Capacitor.Plugins.App.exitApp === 'function') {
        window.Capacitor.Plugins.App.exitApp();
        return true;
      }

      if (window.cordova && window.cordova.plugins && window.cordova.plugins.App && typeof window.cordova.plugins.App.exitApp === 'function') {
        window.cordova.plugins.App.exitApp();
        return true;
      }

      if (window.navigator && window.navigator.app && typeof window.navigator.app.exitApp === 'function') {
        window.navigator.app.exitApp();
        return true;
      }

      if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'EXIT_APP', source: 'code-destiny', ts: now() }));
        return true;
      }
    } catch (_) {}

    try {
      if (window.history.length > 1) {
        state.allowNativeBackOnce = true;
        window.history.back();
        return true;
      }
    } catch (_) {}

    try {
      window.close();
      if (window.closed) return true;
    } catch (_) {}

    try {
      if (window.navigator && typeof window.navigator.vibrate === 'function') {
        window.navigator.vibrate(18);
      }
    } catch (_) {}

    return false;
  }

  function handleMainBack() {
    var t = now();
    if (t - state.firstMainBackAt <= MAIN_DOUBLE_BACK_MS) {
      state.firstMainBackAt = 0;
      var handled = attemptAppExit();
      if (!handled) {
        rearmGuardState();
      }
      return;
    }

    state.firstMainBackAt = t;
    showMainExitToast();
    rearmGuardState();
  }

  function handleSurfaceBack() {
    if (state.surface === 'saju-feature') {
      resetToSaju();
      rearmGuardState();
      return;
    }

    if (state.surface === 'saju' || state.surface === 'feature') {
      resetToMain();
      rearmGuardState();
      return;
    }

    handleMainBack();
  }

  function parseActionPrimaryArg(actionEl) {
    if (!actionEl || typeof actionEl.getAttribute !== 'function') return '';
    var raw = String(actionEl.getAttribute('data-action-args') || '').trim();
    if (!raw) return '';
    return raw.split(',')[0].trim();
  }

  function onActionInvoke(action, actionEl) {
    if (!action) return;

    if (CLOSE_ACTIONS[action]) {
      if (state.surface === 'saju-feature') {
        resetToSaju();
      } else if (state.surface === 'saju' || state.surface === 'feature') {
        resetToMain();
      }
      return;
    }

    var keepOverlay = ACTION_TO_OVERLAY_ID[action] || '';
    if (FEATURE_OPEN_ACTIONS[action] || SAJU_MAIN_ACTIONS[action] || SAJU_SUB_ACTIONS[action]) {
      closeAllKnownOverlays(keepOverlay || null);
    }

    if (SAJU_SUB_ACTIONS[action]) {
      var targetId = parseActionPrimaryArg(actionEl);
      setSurface('saju-feature', targetId || 'saju-feature');
      return;
    }

    if (SAJU_MAIN_ACTIONS[action]) {
      setSurface('saju', 'saju');
      return;
    }

    if (FEATURE_OPEN_ACTIONS[action]) {
      setSurface('feature', action);
      return;
    }
  }

  function wrapFunction(fnName, onBefore, onAfter) {
    var retries = 0;
    var maxRetries = 80;
    var timer = setInterval(function () {
      var original = window[fnName];
      if (typeof original !== 'function') {
        retries += 1;
        if (retries >= maxRetries) clearInterval(timer);
        return;
      }
      if (original.__cdBackWrapped) {
        clearInterval(timer);
        return;
      }

      var wrapped = function () {
        var args = Array.prototype.slice.call(arguments);
        if (typeof onBefore === 'function') {
          try { onBefore(args); } catch (_) {}
        }
        var result = original.apply(this, args);
        if (typeof onAfter === 'function') {
          try { onAfter(args, result); } catch (_) {}
        }
        return result;
      };

      wrapped.__cdBackWrapped = true;
      wrapped.__cdBackOriginal = original;
      window[fnName] = wrapped;
      clearInterval(timer);
    }, 120);
  }

  function bindFunctionHooks() {
    wrapFunction('_dpOpenFortuneType', null, function (args) {
      var type = args && args.length ? String(args[0] || '') : '';
      if (!type) return;
      if (type === 'saju') {
        setSurface('saju', 'saju');
        return;
      }
      setSurface('feature', type);
    });

    wrapFunction('openSajuFunFeature', function (args) {
      var targetId = args && args.length ? String(args[0] || '') : '';
      setSurface('saju-feature', targetId || 'saju-feature');
    }, null);

    wrapFunction('closeCurrentPage', null, function () {
      if (state.surface === 'saju-feature') {
        resetToSaju();
      } else if (state.surface === 'saju' || state.surface === 'feature') {
        resetToMain();
      }
    });
  }

  function onPopState() {
    if (!isMobileRuntime()) return;

    if (state.allowNativeBackOnce) {
      state.allowNativeBackOnce = false;
      return;
    }

    var t = now();
    if (t - state.lastPopAt < POP_DEBOUNCE_MS) {
      rearmGuardState();
      return;
    }
    state.lastPopAt = t;

    if (t - state.lastTransitionAt < TRANSITION_LOCK_MS) {
      rearmGuardState();
      return;
    }

    handleSurfaceBack();
  }

  function bootstrap() {
    bindFunctionHooks();

    window.__cdMobileNav = {
      onActionInvoke: onActionInvoke,
      resetToMain: resetToMain,
      resetToSaju: resetToSaju,
      markFeature: function (name) { setSurface('feature', name || 'feature'); },
      markSajuMain: function () { setSurface('saju', 'saju'); },
      markSajuFeature: function (name) { setSurface('saju-feature', name || 'saju-feature'); },
      getState: function () {
        return {
          surface: state.surface,
          feature: state.feature
        };
      }
    };

    if (!isMobileRuntime()) return;

    setSurface('main', '');
    ensureGuardState();
    window.addEventListener('popstate', onPopState);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  } else {
    bootstrap();
  }
})();
