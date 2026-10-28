(function () {
  'use strict';

  if (typeof window === 'undefined' || window.__cdMobileBackNavBooted) return;
  window.__cdMobileBackNavBooted = true;

  const BACK_GUARD_FLAG = '__cdStaticBackGuardV1';
  const BACK_SURFACE_FLAG = '__cdStaticBackSurfaceV1';
  const BACK_STAMP_FLAG = '__cdStaticBackStampV1';

  const POP_DEBOUNCE_MS = 170;

  const state = {
    surface: 'main',
    feature: '',
    lastPopAt: 0,
    allowNativeBackOnce: false
  };

  // 사주 화면은 오버레이가 아니라 셸 안에서 자리를 바꾸는 #resultPage 다. 그래서 여기에 여는
  // 액션만 있고 대응하는 오버레이 id 는 없다 — KNOWN_OVERLAY_IDS 에 없으니 아래 일괄 닫기에도
  // 걸리지 않아 하위 기능을 열어도 사주 결과는 그대로 남는다.
  const SAJU_MAIN_ACTIONS = {
    checkPrivacyAndCalculate: true,
    agreeAndCalculate: true,
    calculate: true,
    runCompat: true
  };

  const SAJU_SUB_ACTIONS = {
    openSajuFunFeature: true,
    openLuckSyncDiary: true,
    // 사주 결과 화면 안에서 여는 이전 버전 다이어리 모달. 사주 결과 위에 얹히는 하위 화면이라
    // 뒤로가기가 결과 화면으로 돌아와야 한다(위 openSajuFunFeature 와 같은 처지다).
    openLegacyLuckSyncDiary: true
  };

  const FEATURE_OPEN_ACTIONS = {
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

  const CLOSE_ACTIONS = {
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

  const ACTION_TO_OVERLAY_ID = {
    openSukuyoModal: 'sukuyoModalOverlay',
    openZiweiModal: 'ziweiModalOverlay',
    openAstroModal: 'astroModalOverlay',
    openTarotModal: 'tarotModalOverlay',
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

  const KNOWN_OVERLAY_IDS = [
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

  function getHistoryState() {
    const s = window.history.state;
    if (!s || typeof s !== 'object') return {};
    return s;
  }

  function buildHistoryState(isGuard) {
    const base = getHistoryState();
    base[BACK_SURFACE_FLAG] = state.surface;
    base[BACK_GUARD_FLAG] = !!isGuard;
    base[BACK_STAMP_FLAG] = now();
    return base;
  }

  function isGuardState() {
    const s = getHistoryState();
    return !!(s && s[BACK_GUARD_FLAG] === true);
  }

  function ensureGuardState() {
    try {
      if (isGuardState()) return;
      window.history.replaceState(buildHistoryState(false), '', window.location.href);
      window.history.pushState(buildHistoryState(true), '', window.location.href);
    } catch {}
  }

  function rearmGuardState() {
    try {
      if (isGuardState()) return;
      window.history.pushState(buildHistoryState(true), '', window.location.href);
    } catch {}
  }

  // 시빌라 모달의 sb-open 등 개봉 클래스. 빼 주지 않으면 감춰졌는데도 클래스상으론
  // 계속 "열림"이라 다음 개봉·스크롤락 해제 판정이 모두 어긋난다.
  const OPEN_CLASSES = ['open', 'is-open', 'pvw-open', 'pvw-prem', 'sb-open', 'active'];

  function isOverlayOpen(node) {
    for (let i = 0; i < OPEN_CLASSES.length; i += 1) {
      if (node.classList.contains(OPEN_CLASSES[i])) return true;
    }
    const inline = node.style.display;
    return !!inline && inline !== 'none';
  }

  function isRendered(node) {
    try {
      const cs = window.getComputedStyle(node);
      return cs.display !== 'none' && cs.visibility !== 'hidden';
    } catch {
      return true;
    }
  }

  // 열려 있는 노드만 닫는다. 닫힌 오버레이에 visibility/pointer-events 를 박으면
  // display 만 되돌리는 개봉 함수(자미두수·수쿠요·점성술 등)로 다시 열어도
  // 보이지도 눌리지도 않는다 — 타로를 닫은 뒤 다른 기능이 안 열리던 원인.
  function hideOverlayNode(node) {
    if (!node) return;
    try {
      if (!isOverlayOpen(node)) return;
      for (let i = 0; i < OPEN_CLASSES.length; i += 1) node.classList.remove(OPEN_CLASSES[i]);
      // 클래스로만 보이던 막(tarotFocusOverlay 등)은 클래스 제거로 충분하다.
      // 거기에 display:none 을 박으면 클래스만 다시 붙이는 개봉 경로가 영구히 막힌다.
      if (isRendered(node)) node.style.display = 'none';
      node.setAttribute('aria-hidden', 'true');
      if (node.hasAttribute('inert')) node.removeAttribute('inert');
    } catch {}
  }

  function closeAllKnownOverlays(exceptId) {
    for (let i = 0; i < KNOWN_OVERLAY_IDS.length; i += 1) {
      const id = KNOWN_OVERLAY_IDS[i];
      if (exceptId && id === exceptId) continue;
      const node = document.getElementById(id);
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
    } catch {}
  }

  function setSurface(nextSurface, feature) {
    if (!nextSurface) return;
    state.surface = nextSurface;
    state.feature = feature || '';
  }

  function resetToMain() {
    closeAllKnownOverlays();
    setSurface('main', '');
    // 인페이지 기능/오버레이를 닫는 동작은 URL 이동이 아니다. 여기서 /index.html 로
    // 강제로 바꾸면 /, locale 경로, 외부에서 들어온 실제 이전 페이지가 모두 사라져
    // "뒤로가면 홈으로 튄다"가 된다. 현재 문서의 history entry 는 그대로 두고 화면
    // 상태만 원래 홈 표면으로 돌린다.
    try {
      window.history.replaceState(buildHistoryState(false), '', window.location.href);
    } catch {}
  }

  function resetToSaju() {
    closeAllKnownOverlays();
    setSurface('saju', 'saju');
  }

  function leaveToPreviousPage() {
    try {
      if (window.history.length > 1) {
        state.allowNativeBackOnce = true;
        // 더 돌아갈 기록이 없으면 popstate 가 오지 않는다 — 플래그가 남아 다음 뒤로가기를 삼키지 않게 푼다.
        setTimeout(function () { state.allowNativeBackOnce = false; }, 1000);
        window.history.back();
        return true;
      }
    } catch {}
    return false;
  }

  function handleMainBack() {
    // 셸 가드만 소비한 뒤 웹·PWA의 원래 이탈을 이어 간다. 루트 가드를 다시 쌓지 않는다.
    // 실제 앱 종료는 app-native-bridge 한 곳이 맡는다.
    leaveToPreviousPage();
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
    const raw = String(actionEl.getAttribute('data-action-args') || '').trim();
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

    const keepOverlay = ACTION_TO_OVERLAY_ID[action] || '';
    if (FEATURE_OPEN_ACTIONS[action] || SAJU_MAIN_ACTIONS[action] || SAJU_SUB_ACTIONS[action]) {
      closeAllKnownOverlays(keepOverlay || null);
    }

    if (SAJU_SUB_ACTIONS[action]) {
      const targetId = parseActionPrimaryArg(actionEl);
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
    let retries = 0;
    const maxRetries = 80;
    const timer = setInterval(function () {
      const original = window[fnName];
      if (typeof original !== 'function') {
        retries += 1;
        if (retries >= maxRetries) clearInterval(timer);
        return;
      }
      if (original.__cdBackWrapped) {
        clearInterval(timer);
        return;
      }

      const wrapped = function () {
        const args = Array.prototype.slice.call(arguments);
        if (typeof onBefore === 'function') {
          try { onBefore(args); } catch {}
        }
        const result = original.apply(this, args);
        if (typeof onAfter === 'function') {
          try { onAfter(args, result); } catch {}
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
      const type = args && args.length ? String(args[0] || '') : '';
      if (!type) return;
      if (type === 'saju') {
        setSurface('saju', 'saju');
        return;
      }
      setSurface('feature', type);
    });

    wrapFunction('openSajuFunFeature', function (args) {
      const targetId = args && args.length ? String(args[0] || '') : '';
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

  // 표면(main/saju/feature)과 따로 떠 있는 임시 창. 열 때 기록을 쌓지 않으므로 여기서 먼저 닫지 않으면
  // 뒤로가기가 창은 그대로 둔 채 홈 종료 처리나 표면 전환으로 넘어간다.
  // 위에 뜨는 것부터 본다: 결제 선택창 → 셸 시트 → 타일 미리보기. 돌려주는 값은 그 창을 닫는 함수다.
  function findTopTransientSurface() {
    try {
      // 결제 선택창: 2단계면 1단계로, 1단계면 [취소](checkout-entry 의 세 렌더러 공용 버튼 계약).
      // 고른 뒤 잠긴 동안에도 이번 뒤로가기는 결제창이 소비한다 — 처리 중에 표면이 바뀌면 안 된다.
      const checkoutEntry = window.__cdCheckoutEntry;
      if (checkoutEntry && typeof checkoutEntry.hasOpenPaymentChoiceModal === 'function'
        && typeof checkoutEntry.stepBackOpenPaymentChoice === 'function'
        && checkoutEntry.hasOpenPaymentChoiceModal()) {
        return function () { checkoutEntry.stepBackOpenPaymentChoice(); };
      }
    } catch {}
    try {
      const sheet = document.querySelector('dialog[data-cd-sheet][open]');
      const sheets = window.CodeDestinyShellSheet;
      if (sheet && sheets && typeof sheets.close === 'function') {
        return function () { sheets.close(sheet.id); };
      }
    } catch {}
    try {
      const preview = document.getElementById('tilePvwOverlay');
      if (preview && preview.classList.contains('pvw-open') && typeof window._cdCloseTilePreview === 'function') {
        return function () { window._cdCloseTilePreview(); };
      }
    } catch {}
    try {
      const dialogs = document.querySelectorAll('dialog[open]');
      const dialog = dialogs[dialogs.length - 1];
      if (dialog) return function () {
        if (dialog.dispatchEvent(new Event('cancel', { cancelable: true }))) dialog.close();
      };
    } catch {}
    return null;
  }

  function closeTopTransientSurface() {
    const close = findTopTransientSurface();
    if (!close) return false;
    try { close(); } catch {}
    return true;
  }

  function onPopState(event) {

    if (state.allowNativeBackOnce) {
      state.allowNativeBackOnce = false;
      return;
    }

    // 루트 이탈에는 연속 입력 방지용 가드도 다시 쌓지 않는다.
    if (state.surface === 'main' && !(event && event.__cdBackConsumed) && !findTopTransientSurface()) {
      handleMainBack();
      return;
    }
    const t = now();
    if (t - state.lastPopAt < POP_DEBOUNCE_MS) {
      rearmGuardState();
      return;
    }
    state.lastPopAt = t;

    // 자기 popstate 리스너로 먼저 닫힌 창(전체 운세 컬렉션)이 이번 뒤로가기를 이미 썼다.
    if ((event && event.__cdBackConsumed) || closeTopTransientSurface()) {
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
      // 전체 운세 컬렉션은 자기 popstate 로 닫힌다. 그 위에 임시 창이 떠 있으면 이번 뒤로가기는 그 창 몫이다.
      hasTopTransientSurface: function () { return !!findTopTransientSurface(); },
      getState: function () {
        return {
          surface: state.surface,
          feature: state.feature
        };
      }
    };


    setSurface('main', '');
    ensureGuardState();
    window.addEventListener('popstate', onPopState);
    window.addEventListener('cd:app-back', function (event) {
      const overlay = event.detail && event.detail.scope === 'overlay';
      if (overlay ? !findTopTransientSurface() : state.surface === 'main') return;
      event.preventDefault();
      // 기존 popstate 경로가 결제 단계/잠금과 화면 복원을 소유한다.
      ensureGuardState();
      window.history.back();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  } else {
    bootstrap();
  }
})();
