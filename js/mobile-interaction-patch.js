(function () {
  'use strict';

  /* mobile touch: direct tap only (scroll/move/long-press blocked) */
  var TAP_MAX_DX = 16;
  var TAP_MAX_DY = 16;
  var TAP_MOVE_DETECT_PX = 4;
  var TAP_VERTICAL_BLOCK_PX = 18;
  var MAX_TAP_DURATION_MS = 650;
  var GHOST_CLICK_BLOCK_MS = 500;
  var ACTION_DEDUPE_MS = 650;
  var SCROLL_BLOCK_MS = 200;
  var suppressClickUntil = 0;
  var lastScrollAt = 0;
  var touchCtx = null;
  var lastTouchStart = null;
  var lastTouchHadMove = false;
  var lastActionInvoke = { action: '', at: 0 };
  var cardScrollLockUntil = 0;
  var cardScrollTouch = { active: false, moved: false };
  var tapFeedbackEl = null;
  var tapFeedbackTimer = 0;
  var overlayGuardTimer = 0;
  var TAP_FEEDBACK_CLASS = 'cd-mobile-tap-feedback';
  var CARD_SCROLL_SELECTORS = [
    '.feature-card-grid',
    '.feat-collection',
    '.tarot-collection',
    '.feat-collection__grid',
    '.tarot-collection__grid',
    '.tarot-tile',
    '.lifebook-tile',
    '.lovebible-tile',
    '.lovesim-tile',
    '.sibyl-entry-tile',
    '.prem-card',
    '.fc-toggle-btn'
  ].join(',');
  var GENERIC_CARD_ACTION_SELECTORS = [
    '.moon-preview-card',
    '.cd-comprehensive-prompt-entry',
    '.feature-card-grid .feature-card',
    '.feature-card-grid .tarot-tile',
    '.feature-card-grid .lifebook-tile',
    '.feature-card-grid .lovebible-tile',
    '.feature-card-grid .lovesim-tile',
    '.feature-card-grid .sibyl-entry-tile',
    '.feature-card-grid .prem-card',
    '.lifebook-tile',
    '.lovebible-tile',
    '.lovesim-tile',
    '.sibyl-entry-tile',
    '.prem-card',
    '.feat-collection__grid .tarot-tile',
    '.tarot-collection__grid .tarot-tile',
    '.pvc-prem-grid .tarot-tile'
  ].join(',');
  var MOBILE_INTERACTION_PATCH_COPY = {
    ko: { locationSeoul: '대한민국 (서울)' },
    en: { locationSeoul: 'South Korea (Seoul)' },
    ja: { locationSeoul: '韓国（ソウル）' },
    zh: { locationSeoul: '韩国（首尔）' }
  };

  function getMobileInteractionLocale() {
    try {
      var cookieMatch = document.cookie.match(/(?:^|;\s*)(?:cd_locale|NEXT_LOCALE|lang)=([^;]+)/);
      var raw = cookieMatch ? decodeURIComponent(cookieMatch[1] || '') : '';
      if (!raw && window.localStorage) raw = localStorage.getItem('cd_locale') || localStorage.getItem('code-destiny-locale') || '';
      raw = String(raw || '').toLowerCase();
      if (raw.indexOf('ja') === 0) return 'ja';
      if (raw.indexOf('zh') === 0) return 'zh';
      if (raw.indexOf('en') === 0) return 'en';
    } catch (_) {}
    return 'ko';
  }

  function mobileInteractionPatchText(key) {
    var locale = getMobileInteractionLocale();
    var copy = MOBILE_INTERACTION_PATCH_COPY[locale] || MOBILE_INTERACTION_PATCH_COPY.ko;
    return copy[key] || MOBILE_INTERACTION_PATCH_COPY.ko[key] || 'Translation pending';
  }

  function markCardScrollLock(durationMs) {
    var until = Date.now() + (durationMs || 220);
    if (until > cardScrollLockUntil) cardScrollLockUntil = until;
    // 주의: 여기서 suppressClickUntil 을 밀지 않는다. 모든 스크롤 이벤트마다 클릭 억제창을
    // 연장하면 플링/스크롤 직후의 '정지 탭'이 고스트로 오인돼 씹힌다. 실제 스크롤 제스처의
    // 고스트 클릭은 move-gated recentScrollGuard(및 shouldBlockCardTap=cardScrollLockUntil)가
    // 계속 차단하므로 안전하다.
  }

  /* 스크롤/탭 판정 정본은 js/inline/gesture-arbiter.js 하나다. 이 파일의 기존 임계값
     (TAP_MAX_DX 등)은 그대로 두되, 그것들이 놓치는 경우 — 특히 RULES 30개 밖의 카드에서
     lastTouchHadMove 가 영영 서지 않는 구멍 — 를 중재자가 덮는다.
     중재자가 아직 없거나 판단이 안 서면 false 를 돌려 통과시킨다(fail-open). */
  function gestureBlocksActivation() {
    try {
      var arbiter = window.__cdGesture;
      return !!(arbiter && arbiter.blocksActivation());
    } catch (_) {
      return false;
    }
  }

  /**
   * 이 클릭은 우리가 쏜 인계인가.
   *
   * 🔴 판정을 한 곳으로 모으는 함수다. 2026-08-14 13cc7e6d7 은 "고스트 클릭 억제가 유료 진입 탭을
   * 삼킨다"를 고쳤지만, 예외를 document 캡처 게이트 한 곳에만 인라인으로 넣었다. 조건식이 같은
   * 게이트가 두 벌 더 있었고(bindMobileDataActionFallback, 노드 직접 바인딩) 거기엔 예외가 없어
   * 같은 결함이 그대로 남았다 — rule 매칭이 안 되는 타일에서 인계 클릭이 500ms 억제창에 걸려 죽는다.
   * "결제는 됐는데 기능이 안 열린다"가 그 경로다.
   *
   * 인계를 쏘는 곳은 두 군데이고 둘 다 사용자 제스처 핸들러 안에서 실행된다 —
   * 상세 팝업 CTA(_onCta) 와 코인 게이트 승인(_cdDispatchSyntheticActionClick). 그 제스처는
   * 이미 심판을 받았으므로 여기서 다시 심판하면 이중 판정이다.
   *
   * 표식(data-pvw-cta-bypass)과 합성 여부(isTrusted/detail)를 함께 본다 — 브라우저마다
   * 합성 클릭 판정이 달라서 한쪽만으로는 새는 경우가 있다.
   */
  function isSyntheticHandoffClick(event) {
    if (!event || event.type !== 'click') return false;
    if (event.isTrusted === false || event.detail === 0) return true;
    var target = event.target;
    return !!(target && typeof target.closest === 'function' && target.closest('[data-pvw-cta-bypass]'));
  }

  function isCardScrollTarget(node) {
    return !!(node && node.closest && node.closest(CARD_SCROLL_SELECTORS));
  }

  function isGenericCardActionElement(node) {
    return !!(node && node.closest && node.closest(GENERIC_CARD_ACTION_SELECTORS));
  }

  function shouldBlockCardTap() {
    return Date.now() < cardScrollLockUntil;
  }

  function getTapFeedbackElement(node) {
    if (!node || typeof node.closest !== 'function') return null;
    var el = node.closest('[data-action],a[href],button,[role="button"],.MobileFeatureCard,.MobileCompactCard,.MobileQuickAction,.tarot-tile,.feature-card,.prem-card,.moon-preview-card,.cd-comprehensive-prompt-entry');
    if (!el) return null;
    if (el.matches && el.matches('input,textarea,select,label')) return null;
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') return null;
    return el;
  }

  function clearTapFeedback() {
    if (tapFeedbackTimer) {
      clearTimeout(tapFeedbackTimer);
      tapFeedbackTimer = 0;
    }
    if (tapFeedbackEl && tapFeedbackEl.classList) {
      tapFeedbackEl.classList.remove(TAP_FEEDBACK_CLASS);
    }
    tapFeedbackEl = null;
  }

  function showTapFeedback(node) {
    var el = getTapFeedbackElement(node);
    if (!el) return;
    if (tapFeedbackEl && tapFeedbackEl !== el) clearTapFeedback();
    tapFeedbackEl = el;
    el.classList.add(TAP_FEEDBACK_CLASS);
    tapFeedbackTimer = setTimeout(clearTapFeedback, 220);
  }

  /* 아래 정리 블록이 **실제로 되돌릴 것이 있는 상태인가.**
     reconcileOverlayLifecycle 의 정리 블록이 하는 일은 딱 셋이고 전부 조건부 쓰기다:
       ① body.style.overflow 가 'hidden' 일 때만 '' 로 되돌림
       ② classList.remove('lb-modal-open')      — 없으면 no-op
       ③ classList.remove('naming-prompt-open') — 없으면 no-op
     셋의 전제가 모두 거짓이면 그 블록은 hasOpenMobileOverlay() 의 반환값과 **무관하게** 전부
     no-op 이다(형식적 동치). 그런데 hasOpenMobileOverlay 는 셀렉터 10개짜리 문서 전수
     querySelectorAll 이고, 🔴 **매치가 0개일 때가 오히려 가장 비싸다** — 조기 종료가 없어
     문서 끝까지 순회하고, `[aria-hidden="false"]` 같은 속성 셀렉터라 클래스 검사보다 느리다.
     프로퍼티 조회 3번으로 그 순회를 대신한다.
     ⚠ 이 게이트를 inert 해제 블록 위로 올리지 말 것 — 그건 body 상태와 무관하게 돌아야 한다. */
  function hasOverlayLifecycleResidue() {
    var body = document.body;
    if (!body) return false;
    if (body.style && body.style.overflow === 'hidden') return true;
    var classes = body.classList;
    return !!(classes && (classes.contains('lb-modal-open') || classes.contains('naming-prompt-open')));
  }

  function hasOpenMobileOverlay() {
    var selectors = [
      '#tilePvwOverlay.pvw-open',
      '#sajuLoaderOverlay[aria-hidden="false"]',
      '#cdPaidFeatureGate.is-open',
      '#cdLoginRequiredModal.is-open',
      '#privacy-modal-overlay[aria-hidden="false"]',
      '#goldenGrainChargeModalRoot[aria-hidden="false"]',
      '#namingPromptModal[aria-hidden="false"]',
      '.saju-loader-overlay[aria-hidden="false"]',
      '.modal[aria-hidden="false"]',
      '[role="dialog"][aria-modal="true"][aria-hidden="false"]'
    ].join(',');
    try {
      var nodes = document.querySelectorAll(selectors);
      for (var i = 0; i < nodes.length; i += 1) {
        var node = nodes[i];
        var style = window.getComputedStyle ? window.getComputedStyle(node) : null;
        if (style && (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0')) continue;
        var rect = node.getBoundingClientRect ? node.getBoundingClientRect() : null;
        if (!rect || rect.width > 20 || rect.height > 20) return true;
      }
    } catch (_) {}
    return false;
  }

  function reconcileOverlayLifecycle() {
    try {
      // 상세 팝업이 닫혔는데 배경 inert 스냅샷이 남아 있으면 되돌린다 — 화면은 보이는데
      // 아무것도 안 눌리는 프리징의 최후 방어선. 스냅샷에 기록된 원래 값으로 복원하므로
      // 하단 네비처럼 다른 주체가 건 inert 는 건드리지 않는다.
      // 판정은 pvw-open 이 아니라 aria-hidden 으로 한다 — pvw-open 은 rAF 뒤에 붙어서
      // 여는 도중에 잠깐 비어 있고, aria-hidden 은 _open/_close 가 동기로 세운다.
      var pvwOverlay = document.getElementById('tilePvwOverlay');
      if ((!pvwOverlay || pvwOverlay.getAttribute('aria-hidden') !== 'false')
        && typeof window._cdReleaseTilePreviewInert === 'function') {
        window._cdReleaseTilePreviewInert();
      }
      // 되돌릴 잔여물이 없으면 아래 블록은 통째로 no-op 이다 — 문서 전수 스캔을 하지 않는다.
      if (!hasOverlayLifecycleResidue()) return;
      if (!hasOpenMobileOverlay()) {
        if (document.body && document.body.style && document.body.style.overflow === 'hidden') {
          document.body.style.overflow = '';
        }
        if (document.body && document.body.classList) {
          document.body.classList.remove('lb-modal-open');
          if (!document.querySelector('#namingPromptModal[aria-hidden="false"]')) {
            document.body.classList.remove('naming-prompt-open');
          }
        }
      }
    } catch (_) {}
  }

  function scheduleOverlayLifecycleGuard(delayMs) {
    if (overlayGuardTimer) clearTimeout(overlayGuardTimer);
    overlayGuardTimer = setTimeout(function() {
      overlayGuardTimer = 0;
      reconcileOverlayLifecycle();
    }, typeof delayMs === 'number' ? delayMs : 80);
  }

  function shouldEnableMobileInteractionBridge() {
    try {
      var hasMatchMedia = typeof window.matchMedia === 'function';
      var mobileViewport = hasMatchMedia && window.matchMedia('(max-width: 768px)').matches;
      var primaryCoarse = hasMatchMedia && window.matchMedia('(pointer: coarse)').matches;
      var primaryNoHover = hasMatchMedia && window.matchMedia('(hover: none)').matches;
      var mobileUserAgent = /android|iphone|ipad|ipod/i.test(navigator.userAgent || '');

      // A touch-capable desktop is still a desktop when its primary input is a
      // mouse/trackpad. maxTouchPoints intentionally does not participate here:
      // hybrid laptops expose it even while their desktop click path is active.
      return !!(mobileViewport || mobileUserAgent || (primaryCoarse && primaryNoHover));
    } catch (_) {
      return false;
    }
  }

  function isMobileRuntime() {
    return shouldEnableMobileInteractionBridge();
  }

  function applyMobileMediaPerformance(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var mobile = isMobileRuntime();
    var imgs = [];
    if (scope.matches && scope.matches('img')) imgs.push(scope);
    if (scope.querySelectorAll) imgs = imgs.concat(Array.prototype.slice.call(scope.querySelectorAll('img')));
    imgs.forEach(function(img) {
      if (!img || img.dataset.cdMobilePerfMedia === '1') return;
      var className = String(img.className || '');
      var isLcp = img.getAttribute('data-lcp-candidate') === '1';
      var isMobileHubLogo = className.indexOf('cd-mobile-hub__logo') !== -1;
      if (!isLcp && !isMobileHubLogo) {
        img.setAttribute('loading', 'lazy');
        if (!img.hasAttribute('fetchpriority')) img.setAttribute('fetchpriority', 'low');
      }
      if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
      if (!img.hasAttribute('sizes')) {
        if (className.indexOf('tarot-tile__img') !== -1) img.setAttribute('sizes', '(max-width: 768px) 92px, 200px');
        else if (className.indexOf('tarot-face-img') !== -1) img.setAttribute('sizes', '(max-width: 768px) 31vw, 200px');
        else if (isMobileHubLogo) img.setAttribute('sizes', '46px');
        else if (className.indexOf('sibyl-entry-img') !== -1) img.setAttribute('sizes', '(max-width: 768px) 116px, 320px');
        else if (className.indexOf('sb-logo-img') !== -1) img.setAttribute('sizes', '(max-width: 768px) 72px, 160px');
        else if (className.indexOf('honey-membership-mini__pass-img') !== -1) img.setAttribute('sizes', '86px');
        else if (className.indexOf('membership-recap-cta__mascot-img') !== -1) img.setAttribute('sizes', '(max-width: 768px) 128px, 240px');
        else if (className.indexOf('tile-pvw-hero-img') !== -1) img.setAttribute('sizes', '(max-width: 768px) 100vw, 500px');
        else if (img.closest && img.closest('.moon-music-entry__cover-stack')) img.setAttribute('sizes', '(max-width: 768px) 260px, 320px');
        else if (Number(img.getAttribute('width') || 0) >= 1000) img.setAttribute('sizes', '(max-width: 768px) 88vw, 720px');
        else if (Number(img.getAttribute('width') || 0) >= 400) img.setAttribute('sizes', '(max-width: 768px) 42vw, 420px');
        else if (Number(img.getAttribute('width') || 0) > 0) img.setAttribute('sizes', img.getAttribute('width') + 'px');
      }
      if (mobile && img.id === 'neoLogo') {
        img.setAttribute('loading', 'lazy');
        img.setAttribute('fetchpriority', 'low');
      }
      img.dataset.cdMobilePerfMedia = '1';
    });

    var mediaNodes = [];
    if (scope.matches && scope.matches('audio,video')) mediaNodes.push(scope);
    if (scope.querySelectorAll) mediaNodes = mediaNodes.concat(Array.prototype.slice.call(scope.querySelectorAll('audio,video')));
    mediaNodes.forEach(function(node) {
      if (!node || node.dataset.cdMobilePerfMedia === '1') return;
      if (!node.hasAttribute('data-user-media-started')) node.setAttribute('preload', 'none');
      node.autoplay = false;
      node.removeAttribute('autoplay');
      node.dataset.cdMobilePerfMedia = '1';
    });
  }

  function watchMobileMediaPerformance() {
    applyMobileMediaPerformance(document);
    try { window.__cdMobilePerformanceMediaGuardReady = true; } catch (_) {}
    if (!document.body || typeof MutationObserver === 'undefined') return;
    var mediaObserver = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        Array.prototype.forEach.call(mutation.addedNodes || [], function(node) {
          if (node && node.nodeType === 1) applyMobileMediaPerformance(node);
        });
      });
    });
    mediaObserver.observe(document.body, { childList: true, subtree: true });
  }

  /* INP: defer heavy data-action handlers in index-inline-runtime / uiBindings to the next task. */
  var __CD_DEFER_INP_ACTIONS = {
    checkPrivacyAndCalculate: 1,
    agreeAndCalculate: 1,
    calculate: 1,
    runCompat: 1,
    startTarotReading: 1,
    startTarotLoveReading: 1,
    startTarotHealingReading: 1,
    startTarotReunionReading: 1,
    startTarotSelfEsteemReading: 1,
    startDreamReading: 1,
    startKemetOracle: 1,
    startQuantumAnalysis: 1,
    startAnimalTotemRitual: 1,
    psychoDreamStartAnalysis: 1,
    showTarotFinalInterpretation: 1,
    showTarotLoveFinalReading: 1,
    showTarotHealingFinalReading: 1,
    showTarotReunionFinalReading: 1,
    showTarotSelfEsteemFinalReading: 1,
    dreamLibrarySearch: 1,
    dreamLibrarySearchByDream: 1,
    dreamLibraryLoadMore: 1,
    revealDreamStage: 1,
    nextDreamStage: 1
  };

  var RULES = [
    {
      action: 'openPhysiognomyApp',
      cardSelector: '.feature-card--face, .tarot-tile--physio',
      targetSelector: [
        '[data-action="openPhysiognomyApp"]',
        '.tarot-tile--physio',
        '.tarot-tile--physio .tarot-tile__img-wrap',
        '.tarot-tile--physio .tarot-tile__img',
        '.tarot-tile--physio .tarot-tile__badge',
        '.tarot-tile--physio .tarot-tile__title',
        '.tarot-tile--physio .tarot-tile__desc',
        '.tarot-tile--physio .tarot-tile__body',
        '.feature-card--face .feature-card__visual',
        '.feature-card--face .feature-card__img-wrap',
        '.feature-card--face .feature-card__img',
        '.feature-card--face .feature-card__title',
        '.feature-card--face .feature-card__desc',
        '.feature-card--face .feature-card__cta',
        '.feature-card--face .feature-card__launch'
      ].join(',')
    },
    {
      action: 'openPastLifeFaceApp',
      cardSelector: '.tarot-tile--pastlife-face',
      targetSelector: [
        '[data-action="openPastLifeFaceApp"]',
        '.tarot-tile--pastlife-face',
        '.tarot-tile--pastlife-face .tarot-tile__img-wrap',
        '.tarot-tile--pastlife-face .tarot-tile__img',
        '.tarot-tile--pastlife-face .tarot-tile__badge',
        '.tarot-tile--pastlife-face .tarot-tile__title',
        '.tarot-tile--pastlife-face .tarot-tile__desc',
        '.tarot-tile--pastlife-face .tarot-tile__body'
      ].join(',')
    },
    {
      action: 'openMbtiModal',
      cardSelector: '.tarot-tile--mbti',
      targetSelector: [
        '[data-action="openMbtiModal"]',
        '.tarot-tile--mbti',
        '.tarot-tile--mbti .tarot-tile__img-wrap',
        '.tarot-tile--mbti .tarot-tile__img',
        '.tarot-tile--mbti .tarot-tile__badge',
        '.tarot-tile--mbti .tarot-tile__title',
        '.tarot-tile--mbti .tarot-tile__desc',
        '.tarot-tile--mbti .tarot-tile__body'
      ].join(',')
    },
    {
      action: 'openHwatuModal',
      cardSelector: '.feature-card--tazza, .tarot-tile--hwatu',
      targetSelector: [
        '[data-action="openHwatuModal"]',
        '.tarot-tile--hwatu',
        '.tarot-tile--hwatu .tarot-tile__img-wrap',
        '.tarot-tile--hwatu .tarot-tile__img',
        '.tarot-tile--hwatu .tarot-tile__title',
        '.tarot-tile--hwatu .tarot-tile__desc',
        '.tarot-tile--hwatu .tarot-tile__body',
        '.feature-card--tazza .feature-card__visual',
        '.feature-card--tazza .feature-card__img-wrap',
        '.feature-card--tazza .feature-card__img',
        '.feature-card--tazza .feature-card__title',
        '.feature-card--tazza .feature-card__desc',
        '.feature-card--tazza .feature-card__cta',
        '.feature-card--tazza .feature-card__launch'
      ].join(',')
    },
    {
      action: 'openAnimalTotemModal',
      cardSelector: '.tarot-tile--animal-totem',
      targetSelector: [
        '[data-action="openAnimalTotemModal"]',
        '.tarot-tile--animal-totem',
        '.tarot-tile--animal-totem .tarot-tile__img-wrap',
        '.tarot-tile--animal-totem .tarot-tile__img',
        '.tarot-tile--animal-totem .tarot-tile__badge',
        '.tarot-tile--animal-totem .tarot-tile__title',
        '.tarot-tile--animal-totem .tarot-tile__desc',
        '.tarot-tile--animal-totem .tarot-tile__body'
      ].join(',')
    },
    {
      action: 'openTarotModal',
      cardSelector: '.feature-card--tarot, .tarot-tile--classic',
      targetSelector: [
        '[data-action="openTarotModal"]',
        '.tarot-tile--classic',
        '.tarot-tile--classic .tarot-tile__img-wrap',
        '.tarot-tile--classic .tarot-tile__img',
        '.tarot-tile--classic .tarot-tile__badge',
        '.tarot-tile--classic .tarot-tile__title',
        '.tarot-tile--classic .tarot-tile__desc',
        '.tarot-tile--classic .tarot-tile__body',
        '.feature-card--tarot .feature-card__visual',
        '.feature-card--tarot .feature-card__img-wrap',
        '.feature-card--tarot .feature-card__img',
        '.feature-card--tarot .feature-card__title',
        '.feature-card--tarot .feature-card__desc',
        '.feature-card--tarot .feature-card__cta',
        '.feature-card--tarot .feature-card__launch'
      ].join(',')
    },
    {
      action: 'openCelestialHarmony',
      cardSelector: '.tarot-tile--celestial-harmony',
      targetSelector: [
        '[data-action="openCelestialHarmony"]',
        '.tarot-tile--celestial-harmony',
        '.tarot-tile--celestial-harmony .tarot-tile__img-wrap',
        '.tarot-tile--celestial-harmony .tarot-tile__img',
        '.tarot-tile--celestial-harmony .tarot-tile__badge',
        '.tarot-tile--celestial-harmony .tarot-tile__title',
        '.tarot-tile--celestial-harmony .tarot-tile__desc',
        '.tarot-tile--celestial-harmony .tarot-tile__body'
      ].join(',')
    },
    {
      action: 'openDestinyFlowerStudio',
      cardSelector: '.tarot-tile--bloom',
      targetSelector: [
        '[data-action="openDestinyFlowerStudio"]',
        '.tarot-tile--bloom',
        '.tarot-tile--bloom .tarot-tile__img-wrap',
        '.tarot-tile--bloom .tarot-tile__img',
        '.tarot-tile--bloom .tarot-tile__badge',
        '.tarot-tile--bloom .tarot-tile__title',
        '.tarot-tile--bloom .tarot-tile__desc',
        '.tarot-tile--bloom .tarot-tile__body'
      ].join(',')
    },
    {
      action: 'openAstrologyFlowerStudio',
      cardSelector: '.tarot-tile--astro-flower',
      targetSelector: [
        '[data-action="openAstrologyFlowerStudio"]',
        '.tarot-tile--astro-flower',
        '.tarot-tile--astro-flower .tarot-tile__img-wrap',
        '.tarot-tile--astro-flower .tarot-tile__img',
        '.tarot-tile--astro-flower .tarot-tile__badge',
        '.tarot-tile--astro-flower .tarot-tile__title',
        '.tarot-tile--astro-flower .tarot-tile__desc',
        '.tarot-tile--astro-flower .tarot-tile__body'
      ].join(',')
    },
    {
      action: 'openJamidusuFlowerStudio',
      cardSelector: '.tarot-tile--jami-flower',
      targetSelector: [
        '[data-action="openJamidusuFlowerStudio"]',
        '.tarot-tile--jami-flower',
        '.tarot-tile--jami-flower .tarot-tile__img-wrap',
        '.tarot-tile--jami-flower .tarot-tile__img',
        '.tarot-tile--jami-flower .tarot-tile__badge',
        '.tarot-tile--jami-flower .tarot-tile__title',
        '.tarot-tile--jami-flower .tarot-tile__desc',
        '.tarot-tile--jami-flower .tarot-tile__body'
      ].join(',')
    },
    {
      action: 'openSukuyoFlowerStudio',
      cardSelector: '.tarot-tile--sukuyo-fl',
      targetSelector: [
        '[data-action="openSukuyoFlowerStudio"]',
        '.tarot-tile--sukuyo-fl',
        '.tarot-tile--sukuyo-fl .tarot-tile__img-wrap',
        '.tarot-tile--sukuyo-fl .tarot-tile__img',
        '.tarot-tile--sukuyo-fl .tarot-tile__badge',
        '.tarot-tile--sukuyo-fl .tarot-tile__title',
        '.tarot-tile--sukuyo-fl .tarot-tile__desc',
        '.tarot-tile--sukuyo-fl .tarot-tile__body'
      ].join(',')
    },
    {
      action: 'openNevilleMeditationPage',
      cardSelector: '.tarot-tile--meditation[data-action="openNevilleMeditationPage"], .tarot-tile--meditation[href*="neville-meditation"]',
      targetSelector: [
        '[data-action="openNevilleMeditationPage"]',
        '.tarot-tile--meditation[href*="neville-meditation"]',
        '.tarot-tile--meditation[href*="neville-meditation"] .tarot-tile__img-wrap',
        '.tarot-tile--meditation[href*="neville-meditation"] .tarot-tile__img',
        '.tarot-tile--meditation[href*="neville-meditation"] .tarot-tile__badge',
        '.tarot-tile--meditation[href*="neville-meditation"] .tarot-tile__title',
        '.tarot-tile--meditation[href*="neville-meditation"] .tarot-tile__desc',
        '.tarot-tile--meditation[href*="neville-meditation"] .tarot-tile__body'
      ].join(',')
    },
    {
      action: 'openCosmicSoulMeditation',
      cardSelector: '.tarot-tile--meditation[data-action="openCosmicSoulMeditation"], .tarot-tile--meditation[href*="cosmic-soul-meditation"]',
      targetSelector: [
        '[data-action="openCosmicSoulMeditation"]',
        '.tarot-tile--meditation[href*="cosmic-soul-meditation"]',
        '.tarot-tile--meditation[href*="cosmic-soul-meditation"] .tarot-tile__img-wrap',
        '.tarot-tile--meditation[href*="cosmic-soul-meditation"] .tarot-tile__img',
        '.tarot-tile--meditation[href*="cosmic-soul-meditation"] .tarot-tile__badge',
        '.tarot-tile--meditation[href*="cosmic-soul-meditation"] .tarot-tile__title',
        '.tarot-tile--meditation[href*="cosmic-soul-meditation"] .tarot-tile__desc',
        '.tarot-tile--meditation[href*="cosmic-soul-meditation"] .tarot-tile__body'
      ].join(',')
    },
    {
      action: 'openTarotHealingModal',
      cardSelector: '.tarot-tile--healing',
      targetSelector: [
        '[data-action="openTarotHealingModal"]',
        '.tarot-tile--healing',
        '.tarot-tile--healing .tarot-tile__img-wrap',
        '.tarot-tile--healing .tarot-tile__img',
        '.tarot-tile--healing .tarot-tile__title',
        '.tarot-tile--healing .tarot-tile__desc',
        '.tarot-tile--healing .tarot-tile__body'
      ].join(',')
    },
    {
      action: 'openRoyalTeaOracle',
      cardSelector: '[data-action="openRoyalTeaOracle"]',
      targetSelector: [
        '[data-action="openRoyalTeaOracle"]'
      ].join(',')
    },
    {
      action: 'openTarotYearFortuneModal',
      cardSelector: '.tarot-tile--year',
      targetSelector: [
        '[data-action="openTarotYearFortuneModal"]',
        '.tarot-tile--year',
        '.tarot-tile--year .tarot-tile__img-wrap',
        '.tarot-tile--year .tarot-tile__img',
        '.tarot-tile--year .tarot-tile__title',
        '.tarot-tile--year .tarot-tile__desc',
        '.tarot-tile--year .tarot-tile__body'
      ].join(',')
    },
    {
      action: 'openTarotLoveModal',
      cardSelector: '.tarot-tile--love',
      targetSelector: [
        '[data-action="openTarotLoveModal"]',
        '.tarot-tile--love',
        '.tarot-tile--love .tarot-tile__img-wrap',
        '.tarot-tile--love .tarot-tile__img',
        '.tarot-tile--love .tarot-tile__badge',
        '.tarot-tile--love .tarot-tile__title',
        '.tarot-tile--love .tarot-tile__desc',
        '.tarot-tile--love .tarot-tile__body'
      ].join(',')
    },
    {
      action: 'openTarotSelfEsteemModal',
      cardSelector: '.tarot-tile--self-esteem',
      targetSelector: [
        '[data-action="openTarotSelfEsteemModal"]',
        '.tarot-tile--self-esteem',
        '.tarot-tile--self-esteem .tarot-tile__img-wrap',
        '.tarot-tile--self-esteem .tarot-tile__img',
        '.tarot-tile--self-esteem .tarot-tile__badge',
        '.tarot-tile--self-esteem .tarot-tile__title',
        '.tarot-tile--self-esteem .tarot-tile__desc',
        '.tarot-tile--self-esteem .tarot-tile__body'
      ].join(',')
    },
    {
      action: 'openTarotReunionModal',
      cardSelector: '.tarot-tile--reunion',
      targetSelector: [
        '[data-action="openTarotReunionModal"]',
        '.tarot-tile--reunion',
        '.tarot-tile--reunion .tarot-tile__img-wrap',
        '.tarot-tile--reunion .tarot-tile__img',
        '.tarot-tile--reunion .tarot-tile__badge',
        '.tarot-tile--reunion .tarot-tile__title',
        '.tarot-tile--reunion .tarot-tile__desc',
        '.tarot-tile--reunion .tarot-tile__body'
      ].join(',')
    },
    {
      action: 'startMindScanTarot',
      cardSelector: '.tarot-tile--mindscan',
      targetSelector: [
        '[data-action="startMindScanTarot"]',
        '.tarot-tile--mindscan',
        '.tarot-tile--mindscan .tarot-tile__img-wrap',
        '.tarot-tile--mindscan .tarot-tile__img',
        '.tarot-tile--mindscan .tarot-tile__badge',
        '.tarot-tile--mindscan .tarot-tile__title',
        '.tarot-tile--mindscan .tarot-tile__desc',
        '.tarot-tile--mindscan .tarot-tile__body'
      ].join(',')
    },
    {
      action: 'startCrystalSoulTarot',
      cardSelector: '.tarot-tile--crystal-soul',
      targetSelector: [
        '[data-action="startCrystalSoulTarot"]',
        '.tarot-tile--crystal-soul',
        '.tarot-tile--crystal-soul .tarot-tile__img-wrap',
        '.tarot-tile--crystal-soul .tarot-tile__img',
        '.tarot-tile--crystal-soul .tarot-tile__badge',
        '.tarot-tile--crystal-soul .tarot-tile__title',
        '.tarot-tile--crystal-soul .tarot-tile__desc',
        '.tarot-tile--crystal-soul .tarot-tile__body'
      ].join(',')
    },
    {
      action: 'openZiweiModal',
      cardSelector: '.tarot-tile--ziwei-fc',
      targetSelector: [
        '[data-action="openZiweiModal"]',
        '.tarot-tile--ziwei-fc',
        '.tarot-tile--ziwei-fc .tarot-tile__img-wrap',
        '.tarot-tile--ziwei-fc .tarot-tile__img',
        '.tarot-tile--ziwei-fc .tarot-tile__badge',
        '.tarot-tile--ziwei-fc .tarot-tile__title',
        '.tarot-tile--ziwei-fc .tarot-tile__desc',
        '.tarot-tile--ziwei-fc .tarot-tile__body'
      ].join(',')
    },
    {
      action: 'navigateToZiweiChart',
      cardSelector: '.tarot-tile--ziwei-deep',
      targetSelector: [
        '[data-action="navigateToZiweiChart"]',
        '.tarot-tile--ziwei-deep',
        '.tarot-tile--ziwei-deep .tarot-tile__img-wrap',
        '.tarot-tile--ziwei-deep .tarot-tile__img',
        '.tarot-tile--ziwei-deep .tarot-tile__badge',
        '.tarot-tile--ziwei-deep .tarot-tile__title',
        '.tarot-tile--ziwei-deep .tarot-tile__desc',
        '.tarot-tile--ziwei-deep .tarot-tile__body'
      ].join(',')
    },
    {
      action: 'openDreamModal',
      cardSelector: '.tarot-tile--dream-tile',
      targetSelector: [
        '[data-action="openDreamModal"]',
        '.tarot-tile--dream-tile',
        '.tarot-tile--dream-tile .tarot-tile__img-wrap',
        '.tarot-tile--dream-tile .tarot-tile__img',
        '.tarot-tile--dream-tile .tarot-tile__badge',
        '.tarot-tile--dream-tile .tarot-tile__title',
        '.tarot-tile--dream-tile .tarot-tile__desc',
        '.tarot-tile--dream-tile .tarot-tile__body'
      ].join(',')
    },
    {
      action: 'openPsychoDreamModal',
      cardSelector: '.tarot-tile--psycho-freud-tile',
      targetSelector: [
        '[data-action="openPsychoDreamModal"]',
        '.tarot-tile--psycho-freud-tile',
        '.tarot-tile--psycho-freud-tile .tarot-tile__img-wrap',
        '.tarot-tile--psycho-freud-tile .tarot-tile__img',
        '.tarot-tile--psycho-freud-tile .tarot-tile__badge',
        '.tarot-tile--psycho-freud-tile .tarot-tile__title',
        '.tarot-tile--psycho-freud-tile .tarot-tile__desc',
        '.tarot-tile--psycho-freud-tile .tarot-tile__body'
      ].join(',')
    },
    {
      action: 'openKemetModal',
      cardSelector: '.tarot-tile--egypt-fc, .feature-card--egypt',
      targetSelector: [
        '[data-action="openKemetModal"]',
        '.tarot-tile--egypt-fc',
        '.tarot-tile--egypt-fc .tarot-tile__img-wrap',
        '.tarot-tile--egypt-fc .tarot-tile__img',
        '.tarot-tile--egypt-fc .tarot-tile__title',
        '.tarot-tile--egypt-fc .tarot-tile__desc',
        '.tarot-tile--egypt-fc .tarot-tile__body',
        '.feature-card--egypt .feature-card__visual',
        '.feature-card--egypt .feature-card__img-wrap',
        '.feature-card--egypt .feature-card__img',
        '.feature-card--egypt .feature-card__title',
        '.feature-card--egypt .feature-card__desc',
        '.feature-card--egypt .feature-card__cta',
        '.feature-card--egypt .feature-card__launch'
      ].join(',')
    },
    {
      action: 'openJuyukModal',
      cardSelector: '.tarot-tile--juyuk-fc, .feature-card--juyuk',
      targetSelector: [
        '[data-action="openJuyukModal"]',
        '.tarot-tile--juyuk-fc',
        '.tarot-tile--juyuk-fc .tarot-tile__img-wrap',
        '.tarot-tile--juyuk-fc .tarot-tile__img',
        '.tarot-tile--juyuk-fc .tarot-tile__title',
        '.tarot-tile--juyuk-fc .tarot-tile__desc',
        '.tarot-tile--juyuk-fc .tarot-tile__body',
        '.feature-card--juyuk .feature-card__visual',
        '.feature-card--juyuk .feature-card__img-wrap',
        '.feature-card--juyuk .feature-card__img',
        '.feature-card--juyuk .feature-card__title',
        '.feature-card--juyuk .feature-card__desc',
        '.feature-card--juyuk .feature-card__cta',
        '.feature-card--juyuk .feature-card__launch'
      ].join(',')
    },
    {
      action: 'openOlympusOracleModal',
      cardSelector: '.tarot-tile--olympus-oracle',
      targetSelector: [
        '[data-action="openOlympusOracleModal"]',
        '.tarot-tile--olympus-oracle',
        '.tarot-tile--olympus-oracle .tarot-tile__img-wrap',
        '.tarot-tile--olympus-oracle .tarot-tile__img',
        '.tarot-tile--olympus-oracle .tarot-tile__badge',
        '.tarot-tile--olympus-oracle .tarot-tile__title',
        '.tarot-tile--olympus-oracle .tarot-tile__desc',
        '.tarot-tile--olympus-oracle .tarot-tile__body'
      ].join(',')
    },
    {
      action: 'openGeomancyOracle',
      cardSelector: '.tarot-tile--geomancy-fc',
      targetSelector: [
        '[data-action="openGeomancyOracle"]',
        '.tarot-tile--geomancy-fc',
        '.tarot-tile--geomancy-fc .tarot-tile__img-wrap',
        '.tarot-tile--geomancy-fc .tarot-tile__img',
        '.tarot-tile--geomancy-fc .tarot-tile__badge',
        '.tarot-tile--geomancy-fc .tarot-tile__title',
        '.tarot-tile--geomancy-fc .tarot-tile__desc',
        '.tarot-tile--geomancy-fc .tarot-tile__body'
      ].join(',')
    },
    {
      action: 'navigateToVedic',
      cardSelector: '.tarot-tile--vedic-fc',
      targetSelector: [
        '[data-action="navigateToVedic"]',
        '.tarot-tile--vedic-fc',
        '.tarot-tile--vedic-fc .tarot-tile__img-wrap',
        '.tarot-tile--vedic-fc .tarot-tile__img',
        '.tarot-tile--vedic-fc .tarot-tile__title',
        '.tarot-tile--vedic-fc .tarot-tile__desc',
        '.tarot-tile--vedic-fc .tarot-tile__body'
      ].join(',')
    },
    {
      action: 'gotoNamingPremium',
      cardSelector: '.prem-card--naming',
      targetSelector: [
        '[data-action="gotoNamingPremium"]',
        '.prem-card--naming',
        '.prem-card--naming img'
      ].join(',')
    },
    {
      action: 'openSibylModal',
      cardSelector: '#sibylSystemSection .sibyl-entry-tile',
      targetSelector: [
        '[data-action="openSibylModal"]',
        '#sibylSystemSection .sibyl-entry-tile',
        '#sibylSystemSection .sibyl-entry-inner',
        '#sibylSystemSection .sibyl-entry-img-col',
        '#sibylSystemSection .sibyl-entry-img',
        '#sibylSystemSection .sibyl-entry-content'
      ].join(',')
    }
  ];
  var FEATURE_ACTION_SET = RULES.reduce(function(acc, rule) {
    if (rule && rule.action) acc[rule.action] = true;
    return acc;
  }, {});

  function nodeLabel(el) {
    if (!el || !el.tagName) return '(null)';
    var id = el.id ? '#' + el.id : '';
    var cls = '';
    if (el.classList && el.classList.length) {
      cls = '.' + Array.prototype.slice.call(el.classList, 0, 4).join('.');
    }
    return el.tagName.toLowerCase() + id + cls;
  }

  function getPoint(event) {
    if (!event) return null;
    var t = null;
    if (event.changedTouches && event.changedTouches.length) {
      t = event.changedTouches[0];
    } else if (event.touches && event.touches.length) {
      t = event.touches[0];
    }
    if (t) return { x: t.clientX, y: t.clientY };
    if (typeof event.clientX === 'number' && typeof event.clientY === 'number') {
      return { x: event.clientX, y: event.clientY };
    }
    return null;
  }

  /* RULES 각 복합 셀렉터의 **맨 왼쪽 컴파운드**에서 class / id / data-action 키만 뽑아 둔다.
     `.tarot-tile--physio .tarot-tile__img` 같은 자손 셀렉터가 매치하려면, 매치된 요소의
     조상-또는-자기 중 하나가 반드시 맨 왼쪽 컴파운드의 키를 갖는다. 따라서 origin 의 조상
     사슬 어디에도 그 키가 하나도 없으면 **어떤 규칙도 매치할 수 없다**(거짓 음성 불가).
     실측: 규칙 32개 · 고유 leftmost compound 75개, 키를 못 뽑는 head **0개**(2026-08-16).
     🔴 fail-open — 키를 못 뽑는 head 가 하나라도 생기면 게이트를 통째로 끈다. 나중에 누가
        태그 셀렉터나 `*` 를 규칙에 넣어도 탭이 조용히 죽지 않게 하는 유일한 장치다. */
  var RULE_GATE_SOUND = true;
  var RULE_GATE = (function () {
    var classes = Object.create(null);
    var ids = Object.create(null);
    var actions = Object.create(null);
    RULES.forEach(function (rule) {
      String(rule.targetSelector).split(',').forEach(function (complex) {
        var head = complex.trim().split(/[\s>+~]+/)[0];
        if (!head) { RULE_GATE_SOUND = false; return; }
        var pattern = /\.([A-Za-z0-9_-]+)|#([A-Za-z0-9_-]+)|\[data-action="([^"]+)"\]/g;
        var match;
        var found = false;
        while ((match = pattern.exec(head))) {
          found = true;
          if (match[1]) classes[match[1]] = true;
          else if (match[2]) ids[match[2]] = true;
          else actions[match[3]] = true;
        }
        if (!found) RULE_GATE_SOUND = false;
      });
    });
    return { classes: classes, ids: ids, actions: actions };
  })();

  /* 조상 사슬을 한 번만 올라가며 **순수 프로퍼티 조회만** 한다 — 선택자 엔진을 부르지 않는다.
     핸들러가 없는 헤더를 탭하면 사슬이 5개(div → header → #inputPage → body → html)뿐이라
     조회 ~15회로 끝난다. 그 전에는 규칙 32개 × 조상 5개 × 컴파운드 ~8개였다. */
  function couldMatchAnyRule(origin) {
    if (!RULE_GATE_SOUND) return true;
    for (var el = origin; el && el.nodeType === 1; el = el.parentElement) {
      if (el.id && RULE_GATE.ids[el.id]) return true;
      var list = el.classList;
      if (list) {
        for (var i = 0; i < list.length; i += 1) {
          if (RULE_GATE.classes[list[i]]) return true;
        }
      }
      if (el.hasAttribute && el.hasAttribute('data-action')
        && RULE_GATE.actions[el.getAttribute('data-action')]) return true;
    }
    return false;
  }

  /* 손가락 한 번 내림에 pointerdown 과 touchstart 가 **둘 다** 온다(순서는 브라우저마다 다르고,
     한쪽만 오는 경우도 있다). 두 이벤트는 같은 하드웨어 입력에서 나오므로 timeStamp 가 사실상 같다.
     그래서 "먼저 온 쪽이 공유 작업을 하고, 16ms 창 안의 같은 타깃 이벤트는 그 결과를 재사용한다".
     🔴 타이머로 다른 쪽을 기다리지 않는다 — 한쪽만 오는 브라우저에서는 그 한쪽이 '먼저 온 쪽'이
        되므로 아무것도 잃지 않는다. 창 판정이 실패하면 예전처럼 2번 도는 것뿐이다(fail-open). */
  var GESTURE_DOWN_DEDUPE_MS = 16;
  var gestureDown = { stamp: -1, at: 0, target: null, rule: null, ruleResolved: false };

  function beginGestureDown(event) {
    var stamp = (event && typeof event.timeStamp === 'number') ? event.timeStamp : NaN;
    var sameTarget = !!(gestureDown.target && gestureDown.target === event.target);
    var withinWindow = (gestureDown.stamp >= 0 && stamp === stamp)
      ? Math.abs(stamp - gestureDown.stamp) <= GESTURE_DOWN_DEDUPE_MS
      : (Date.now() - gestureDown.at) <= GESTURE_DOWN_DEDUPE_MS;
    if (sameTarget && withinWindow) return false;   // 같은 제스처의 두 번째 신호
    gestureDown = {
      stamp: (stamp === stamp ? stamp : -1),
      at: Date.now(),
      target: event.target,
      rule: null,
      ruleResolved: false
    };
    return true;                                     // 이번 제스처의 첫 신호
  }

  function ruleForGestureDown(event) {
    if (gestureDown.target === event.target && gestureDown.ruleResolved) return gestureDown.rule;
    var rule = findRuleFromTarget(event.target);
    if (gestureDown.target === event.target) {
      gestureDown.rule = rule;
      gestureDown.ruleResolved = true;
    }
    return rule;
  }

  function findRuleFromTarget(origin) {
    if (!origin || typeof origin.closest !== 'function') return null;
    /* 🔴 아래 루프를 **재구조화하지 않는다.** 지금 의미론은 "배열 순서가 이른 규칙 우선"이고,
       결합 셀렉터 1회 closest 로 바꾸면 "가장 가까운 조상 우선"이 되어 결과가 갈릴 수 있다.
       게이트는 매치 가능성이 0인 경우만 걸러내므로 우선순위를 건드리지 않는다(무손실). */
    if (!couldMatchAnyRule(origin)) return null;
    for (var i = 0; i < RULES.length; i += 1) {
      if (origin.closest(RULES[i].targetSelector)) return RULES[i];
    }
    return null;
  }

  /* When touchend event.target is unreliable, re-scan the actual target with elementFromPoint. */
  function findRuleFromPoint(x, y) {
    if (!document.elementFromPoint || !Number.isFinite(x) || !Number.isFinite(y)) return null;
    var el = document.elementFromPoint(x, y);
    return el ? findRuleFromTarget(el) : null;
  }

  /* 하단 네비·허브 칩·컬렉션 크롬바는 index.html 의 전용 핸들러가 소유한다.
     이들은 탭 즉시 풀스크린 컬렉션 오버레이를 여는데, 아래 좌표 재스캔은 rAF 한 프레임 뒤에
     돌기 때문에 그때 같은 좌표에는 방금 열린 컬렉션 타일이 놓여 있다. 그 타일을 탭 대상으로
     오인해 엉뚱한 타로로 하드 내비게이션(=새로고침 후 오연결)해 버린다. */
  var NAV_OWNED_TAP_SELECTOR = '#cdMobileBottomNav,.cd-mobile-hub__chips,.cd-mobile-collection-chrome';
  function isNavOwnedTap(target) {
    return !!(target && target.closest && target.closest(NAV_OWNED_TAP_SELECTOR));
  }

  function findActionElement(origin, rule) {
    if (!origin || !rule) return null;
    var direct = origin.closest('[data-action="' + rule.action + '"]');
    if (direct) return direct;

    var card = origin.closest(rule.cardSelector);
    if (card && typeof card.querySelector === 'function') {
      var inCard = card.querySelector('[data-action="' + rule.action + '"]');
      if (inCard) return inCard;
    }

    if (rule.action === 'openTarotYearFortuneModal') {
      var tile = origin.closest('.tarot-tile--year');
      if (tile) return tile;
    }

    if (rule.action === 'openTarotHealingModal') {
      var tile = origin.closest('.tarot-tile--healing');
      if (tile) return tile;
    }

    if (rule.action === 'openRoyalTeaOracle') {
      var teaTile = origin.closest('.tarot-tile--royal-tea');
      if (teaTile) return teaTile;
    }

    if (rule.action === 'openAnimalTotemModal') {
      var tile = origin.closest('.tarot-tile--animal-totem');
      if (tile) return tile;
    }

    return document.querySelector('[data-action="' + rule.action + '"]');
  }

  function probeTopNodeFromPoint(x, y, reason) {
    var top = document.elementFromPoint(x, y);
    var stack = [];
    if (typeof document.elementsFromPoint === 'function') {
      stack = document.elementsFromPoint(x, y).slice(0, 8);
    }

    console.groupCollapsed('[overlay-probe] ' + (reason || 'tap') + ' @ (' + x + ', ' + y + ')');
    console.log('top node:', nodeLabel(top), top);
    console.log('stack:', stack.map(nodeLabel), stack);
    console.groupEnd();

    return { top: top, stack: stack };
  }

  window.debugTopNodeAtTap = function (x, y, reason) {
    var px = Number(x);
    var py = Number(y);
    if (!Number.isFinite(px) || !Number.isFinite(py)) {
      console.warn('[overlay-probe] invalid coordinates:', x, y);
      return null;
    }
    return probeTopNodeFromPoint(px, py, reason || 'manual');
  };

  function dispatchFeatureTapEvent(rule, origin, sourceEvent) {
    var detail = {
      action: rule.action,
      sourceType: sourceEvent ? sourceEvent.type : 'manual',
      target: origin || null,
      timestamp: Date.now()
    };
    window.dispatchEvent(new CustomEvent('code-destiny:feature-tap', { detail: detail }));
  }

  function blockCollectionToggleEvent(event) {
    if (event && event.cancelable && typeof event.preventDefault === 'function') event.preventDefault();
    if (event && typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    else if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
  }

  /* 컬렉션 소유자. 🔴 occludedByOtherLayer 와 좌표 폴백 게이트가 **반드시 같은 정의**를 써야 한다 —
     둘이 갈라지면 "게이트는 통과했는데 후보는 전부 occluded" 같은 조용한 죽은 구간이 생긴다. */
  var COLLECTION_OWNER_SELECTOR = '.feat-collection[id],.tarot-collection[id]';

  function findCollectionToggleFromOrigin(origin) {
    return origin instanceof Element ? origin.closest('[data-action="toggleCollection"][data-target]') : null;
  }

  function findCollectionToggleFromPoint(x, y) {
    var px = Number(x);
    var py = Number(y);
    if (!Number.isFinite(px) || !Number.isFinite(py)) return null;
    var top = typeof document.elementFromPoint === 'function' ? document.elementFromPoint(px, py) : null;
    var direct = findCollectionToggleFromOrigin(top);
    if (direct) return direct;
    // 🔴 아래 두 폴백은 "좌표에 걸리기만 하면" 토글로 인정한다 — elementsFromPoint 는 가려진 요소까지
    // 전부 돌려주고, rect 스캔은 스태킹을 아예 보지 않는다. 그래서 기능 모달(예: #hwatuModalOverlay,
    // z-index 100000)이 열린 상태에서 그 아래 깔린 컬렉션 헤더(min-height 142px, 가로 전체)와 좌표가
    // 겹치면, 모달 안의 버튼 탭이 컬렉션 토글로 오판돼 toggleMobileCollection 이 touchend 를
    // preventDefault+stopPropagation 으로 삼켰다 — click 이 아예 합성되지 않아 기능 화면의 버튼이
    // 통째로 죽었다(650ms 가드 때문에 연타해도 계속 막힘).
    // 폴백의 원래 목적은 "같은 컬렉션 안의 장식 요소가 헤더를 덮어 closest 가 실패한 경우" 구제이므로,
    // 최상단 실히트가 그 컬렉션 밖이면 다른 레이어가 주인이라고 보고 넘긴다.
    function occludedByOtherLayer(candidate) {
      if (!top || !candidate || !candidate.closest) return false;
      var owner = candidate.closest(COLLECTION_OWNER_SELECTOR);
      return !!(owner && !owner.contains(top));
    }
    if (typeof document.elementsFromPoint === 'function') {
      var stack = document.elementsFromPoint(px, py);
      for (var i = 0; i < stack.length; i += 1) {
        var stacked = findCollectionToggleFromOrigin(stack[i]);
        if (stacked && !occludedByOtherLayer(stacked)) return stacked;
      }
    }
    var toggles = document.querySelectorAll('[data-action="toggleCollection"][data-target]');
    for (var j = 0; j < toggles.length; j += 1) {
      var toggle = toggles[j];
      var rect = toggle.getBoundingClientRect();
      if (!rect || rect.width <= 0 || rect.height <= 0) continue;
      if (px < rect.left || px > rect.right || py < rect.top || py > rect.bottom) continue;
      var style = window.getComputedStyle ? window.getComputedStyle(toggle) : null;
      if (style && (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none')) continue;
      if (occludedByOtherLayer(toggle)) continue;
      return toggle;
    }
    return null;
  }

  function toggleMobileCollection(toggle, event, source) {
    if (!toggle) return false;
    var targetId = String(toggle.getAttribute('data-target') || '').trim();
    var collection = targetId ? document.getElementById(targetId) : null;
    if (!collection) return false;
    var guard = window.__cdMobileCollectionToggleGuard;
    if (guard && guard.targetId === targetId && (Date.now() - guard.at) < 650) {
      blockCollectionToggleEvent(event);
      return true;
    }
    window.__cdMobileCollectionToggleGuard = { targetId: targetId, at: Date.now(), source: source || 'mobile-patch' };
    window.__cdLastMobileAction = { action: 'toggleCollection', sourceType: source || 'mobile-patch', at: Date.now() };
    blockCollectionToggleEvent(event);
    var nextState = collection.getAttribute('data-collection-open') !== 'true';
    collection.setAttribute('data-collection-open', String(nextState));
    toggle.setAttribute('aria-expanded', String(nextState));
    try {
      document.dispatchEvent(new CustomEvent('cd:collection-toggle', {
        detail: { targetId: targetId, isOpen: nextState }
      }));
    } catch (_) {}
    return true;
  }

  function handleCollectionToggleTap(event, point, source) {
    if (!event || !point) return false;
    var start = lastTouchStart;
    if (start && (Date.now() - (start.at || 0)) <= MAX_TAP_DURATION_MS) {
      var dx = Math.abs(Number(point.x) - Number(start.x));
      var dy = Math.abs(Number(point.y) - Number(start.y));
      if (dx >= TAP_MAX_DX || dy >= TAP_MAX_DY || (dy >= TAP_VERTICAL_BLOCK_PX && dy >= dx)) return false;
    }
    // 🔴 좌표 폴백은 "탭이 시트/모달 안에서 시작한 경우" 절대 쓰면 안 된다.
    // 상세 팝업 ✕ 는 pointerup 에서 시트를 먼저 닫는데, 뒤이어 오는 touchend 시점엔 시트가
    // pointer-events:none 이라 elementFromPoint 가 그 아래 컬렉션 헤더를 최상단으로 돌려준다.
    // 그러면 닫기 한 번에 컬렉션이 통째로 접히고 카드가 전부 사라졌다(운세 목록이 빈 화면).
    // occludedByOtherLayer 는 이 경우를 못 잡는다 — 헤더가 실제로 최상단이기 때문이다.
    var toggleOrigin = event.target;
    if (toggleOrigin && toggleOrigin.closest
      && toggleOrigin.closest('.tile-pvw-overlay,.cd-direct-payment-modal,[role="dialog"]')) {
      return false;
    }
    /* 🔴 좌표 폴백의 존재 이유는 위 947-954 에 적힌 단 하나 — "같은 컬렉션 안의 장식 요소가
       헤더를 덮어 closest 가 실패한 경우"의 구제다(실제 마크업: .feat-collection__cosmos 안의
       .fc-star 들이 헤더 버튼 위에 깔린다). 그 전제를 그대로 선행 조건으로 쓴다 — origin 이
       컬렉션 서브트리 밖이면 구제할 대상 자체가 없으므로 elementFromPoint · elementsFromPoint ·
       토글 전수 rect 스캔을 아예 하지 않는다.

       🔴 이 게이트는 폴백을 **좁히기만 한다. 넓히지 않는다.** 그래서 위 두 실사고
          (모달 버튼이 컬렉션 토글로 오판 / ✕ 한 번에 컬렉션이 통째로 접힘)는 구조적으로 재발할
          수 없다 — 두 경우 모두 origin 이 오버레이·시트 안이라 게이트에서 먼저 걸린다.
          기존 방어(occludedByOtherLayer · .tile-pvw-overlay 명시 차단)는 그대로 살려 둔다(2중).

       실측 효과: 컬렉션 밖(헤더·하단 내비·오늘의 운세·검색·푸터) 탭에서 제스처당
       elementsFromPoint 3회 · elementFromPoint 3회 · querySelectorAll 3회 ·
       getBoundingClientRect 39회가 전부 0 이 된다. 필드 최악인 header.logo-area 가 이 경우다. */
    var toggle = findCollectionToggleFromOrigin(toggleOrigin);
    if (!toggle && toggleOrigin && toggleOrigin.closest && toggleOrigin.closest(COLLECTION_OWNER_SELECTOR)) {
      toggle = findCollectionToggleFromPoint(point.x, point.y);
    }
    return toggleMobileCollection(toggle, event, source);
  }

  function shouldSkipDuplicateAction(action) {
    if (!action) return false;
    var now = Date.now();
    if (lastActionInvoke.action === action && (now - lastActionInvoke.at) < ACTION_DEDUPE_MS) {
      return true;
    }
    lastActionInvoke = { action: action, at: now };
    return false;
  }

  // 한 번의 탭에 touchend 와 pointerup 이 모두 발화한다. 서로 다른 이벤트라 한쪽의
  // stopPropagation()·__cdMobileBridgeHandled 가 다른 쪽을 막지 못해, 두 핸들러의 동일한
  // _cdOpenTilePreview 블록이 상세 팝업을 두 번 연다. 두 번째 열기는 배경 inert 스냅샷을
  // 오염시켜 닫을 때 화면 전체가 안 눌리는 프리징으로 이어졌다. 기존 액션 디듀프를 그대로 쓴다.
  function shouldSkipTilePreview(tile) {
    if (!tile || typeof tile.getAttribute !== 'function') return false;
    var key = tile.getAttribute('data-feature-key')
      || tile.getAttribute('data-action')
      || tile.getAttribute('data-tile-lock-key')
      || 'tile';
    return shouldSkipDuplicateAction('tile-preview::' + key);
  }

  function parseActionArgs(raw) {
    if (!raw) return [];
    return String(raw)
      .split(',')
      .map(function(v) { return v.trim(); })
      .filter(function(v) { return v.length > 0; });
  }

  var __CD_USE_FEATURE_SPLASH = false;
  var __CD_SERVICE_SPLASH_MESSAGES = {
    openNevilleMeditationPage: '명상 화면을 준비하고 있습니다.',
    openCosmicSoulMeditation: '코스믹 소울 명상 화면을 준비하고 있습니다.',
    openYogaGuru: '요가 가이드 화면을 준비하고 있습니다.',
    openTarotHealingModal: '타로 힐링 화면을 준비하고 있습니다.',
    openTarotLoveModal: '타로 결과 화면을 준비하고 있습니다.',
    openTarotReunionModal: '타로 결과 화면을 준비하고 있습니다.',
    openTarotSelfEsteemModal: '타로 결과 화면을 준비하고 있습니다.',
    openTarotYearFortuneModal: '타로 연간 운세 화면을 준비하고 있습니다.',
    openDreamModal: '드림 타로 화면을 준비하고 있습니다.',
    openPsychoDreamModal: '심리 해석 화면을 준비하고 있습니다.',
    openKemetModal: '오라클 분석 화면을 준비하고 있습니다.',
    openRoyalTeaOracle: '로얄티 오라클 화면을 준비하고 있습니다.',
    openGeomancyOracle: '지맨시 분석 화면을 준비하고 있습니다.',
    openSibylModal: '사이빌 화면을 준비하고 있습니다.',
    openAnimalTotemModal: '동물 토템 화면을 준비하고 있습니다.',
    openHwatuModal: '화투 분석 화면을 준비하고 있습니다.',
    openSajuguiModal: '사주 동물 분석 화면을 준비하고 있습니다.',
    openAstrologyFlowerStudio: '꽃 스튜디오 화면을 준비하고 있습니다.',
    openDestinyFlowerStudio: '꽃 스튜디오 화면을 준비하고 있습니다.',
    openJamidusuFlowerStudio: '꽃 스튜디오 화면을 준비하고 있습니다.',
    openSukuyoFlowerStudio: '꽃 스튜디오 화면을 준비하고 있습니다.',
    openSajuAnimalPage: '동물 심리 화면을 준비하고 있습니다.',
    openLoveSimulation: '연애 시뮬레이션 화면을 준비하고 있습니다.',
    navigateToVedic: '별자리 차트 화면을 준비하고 있습니다.',
    gotoNamingPremium: '유료 기능 화면을 준비하고 있습니다.'
  };
  var __cdFeatureLoadingToken = 0;

  function getServiceSplash() {
    if (window.__cdServiceSplash) return window.__cdServiceSplash;
    if (typeof window.__cdShowServiceSplash === 'function' || typeof window.__cdHideServiceSplash === 'function') {
      return {
        show: window.__cdShowServiceSplash,
        hide: window.__cdHideServiceSplash
      };
    }
    return null;
  }

  function beginFeatureLoading(action, options) {
    if (!__CD_USE_FEATURE_SPLASH) return 0;
    var serviceSplash = getServiceSplash();
    if (!serviceSplash || typeof serviceSplash.show !== 'function') return 0;
    var token = ++__cdFeatureLoadingToken;
    var message = (options && options.message) || __CD_SERVICE_SPLASH_MESSAGES[action] || '서비스 화면을 준비하고 있습니다.';
    var shown = serviceSplash.show(message, {
      forceMobile: true,
      minMs: options && typeof options.minMs === 'number' ? options.minMs : 400,
      maxMs: options ? options.maxMs : undefined
    });
    return shown ? token : 0;
  }

  function endFeatureLoading(token) {
    if (!token || token !== __cdFeatureLoadingToken) return;
    var serviceSplash = getServiceSplash();
    if (serviceSplash && typeof serviceSplash.hide === 'function') {
      serviceSplash.hide();
    }
  }

  function finalizeFeatureLoading(result, token) {
    if (!token) return;
    if (result && typeof result.then === 'function') {
      result.then(function () {
        endFeatureLoading(token);
      }).catch(function () {
        endFeatureLoading(token);
      });
      return;
    }
    endFeatureLoading(token);
  }

  function ensureMobileBackstackRuntime() {
    if (window.__cdMobileNav) return;
    loadScript('/js/mobile-backstack-navigation.js?v=build-3442f784d406').catch(function(err) {
      console.error('[mobile-interaction-patch] mobile backstack load failed:', err);
    });
  }

  function invokeConfiguredDataAction(actionEl, sourceEvent) {
    if (!actionEl) return false;
    var action = actionEl.getAttribute('data-action');
    if (!action) return false;
    var loadToken = beginFeatureLoading(action, { minMs: 250, maxMs: 3000 });
    ensureMobileBackstackRuntime();
    try {
      if (window.__cdMobileNav && typeof window.__cdMobileNav.onActionInvoke === 'function') {
        window.__cdMobileNav.onActionInvoke(action, actionEl);
      }
    } catch (_) {}
    var fn = window[action];
    if (typeof fn !== 'function') {
      endFeatureLoading(loadToken);
      return false;
    }

    var args = parseActionArgs(actionEl.getAttribute('data-action-args'));
    var passSelfMode = actionEl.getAttribute('data-action-pass-self');
    var passEvent = actionEl.getAttribute('data-action-pass-event') === '1';

    function runInvoke() {
      var result = undefined;
      try {
        if (passSelfMode === 'append') {
          result = fn.apply(window, args.concat([actionEl]));
        } else if (passSelfMode === '1' || passSelfMode === 'prepend') {
          result = fn.apply(window, [actionEl].concat(args));
        } else if (passEvent) {
          result = fn.call(window, sourceEvent);
        } else if (args.length) {
          result = fn.apply(window, args);
        } else {
          result = fn.call(window);
        }
        finalizeFeatureLoading(result, loadToken);
        return true;
      } catch (err) {
        console.error('[mobile-interaction-patch] data-action invoke failed:', action, err);
        endFeatureLoading(loadToken);
        return false;
      }
    }

    if (__CD_DEFER_INP_ACTIONS[action]) {
      setTimeout(runInvoke, 0);
      return true;
    }
    return runInvoke();
  }

  function detectMobileBuildVersion() {
    try {
      var scripts = document.querySelectorAll('script[src]');
      for (var i = 0; i < scripts.length; i += 1) {
        var src = String(scripts[i].getAttribute('src') || '');
        if (!src) continue;
        if (src.indexOf('index-inline-runtime.js?v=') !== -1 || src.indexOf('mobile-interaction-patch.js?v=') !== -1) {
          var m = src.match(/[?&]v=([^&]+)/);
          if (m && m[1]) return m[1];
        }
      }
    } catch (_) {}
    return '';
  }

  var __CD_MOBILE_BUILD_VERSION = detectMobileBuildVersion();
  function withMobileBuild(path) {
    var p = String(path || '').trim();
    if (!p) return p;
    if (!__CD_MOBILE_BUILD_VERSION) return p;
    return p + (p.indexOf('?') === -1 ? '?v=' : '&v=') + __CD_MOBILE_BUILD_VERSION;
  }

  var LAZY_LOAD_ACTIONS = {
    openPhysiognomyApp: [
      'AnalysisEngine.js?v=h96b7981840e2',
      'PhysiognomyUI.js?v=hfe1d5855449d'
    ],
    openPastLifeFaceApp: [
      'AnalysisEngine.js?v=h96b7981840e2',
      'PastLifeFaceUI.js?v=hc1c3840957e8'
    ],
    openMbtiModal: ['js/astral-soul.js'],
    openAnimalTotemModal: [
      'js/services/animal-totem-content-engine.js',
      'js/animal-totem-experience.js?v=build-3442f784d406'
    ],
    openHwatuModal: ['HwatuFortune.js?v=h9ee7eacf3957'],
    // NOTE: uiBindings uses the js/... path; keep the mobile patch path aligned.
    // ensure the latest script is loaded on launch.
    openTarotLoveModal: ['js/tarot-love-experience.js?v=build-3442f784d406'],
    openTarotReunionModal: ['js/tarot-reunion-experience.js?v=build-3442f784d406'],
    openTarotSelfEsteemModal: ['js/tarot-self-esteem-experience.js?v=build-3442f784d406'],

    openTarotYearFortuneModal: ['js/tarot-year-fortune-experience.js?v=build-3442f784d406'],
    openDreamModal: ['js/dream-ledger.js?v=build-3442f784d406'],
    openPsychoDreamModal: ['js/psycho-dream-analyzer-freuds-study.js?v=build-3442f784d406'],
    openKemetModal: ['js/oracle-kcg.js'],
    openJuyukModal: ['js/iching-engine.js', 'js/iching-modal.js'],
    openRoyalTeaOracle: [],
    openOlympusOracleModal: ['js/olympus-oracle.js'],
    gotoNamingPremium: [],
    openSibylModal: ['js/sibyl-system.js?v=build-3442f784d406']
  };

  // 제자리(in-place)에서 모달을 여는 액션인지 판정한다.
  // 정본은 데스크탑 클릭 위임이 쓰는 __cdRouteActionAllowList (js/core/index-inline-runtime.js) 하나이며,
  // 여기서 목록을 새로 만들지 않는다 — 두 경로가 어긋나면 한쪽만 고쳐지는 반쪽 수정이 재발한다.
  // 핸들러(또는 지연 로더)가 실제로 있는 액션만 인정한다. 목록에만 있고 여는 코드가 없으면
  // 앵커 이동을 막는 순간 "탭했는데 아무 일도 없음"이 되므로, 그때는 기존 이동을 그대로 둔다.
  function isInPlaceModalAction(action) {
    if (!action) return false;
    var allowList = window.__cdRouteActionAllowList;
    if (!allowList || !allowList[action]) return false;
    if (typeof window[action] === 'function') return true;
    var lazyPaths = LAZY_LOAD_ACTIONS[action];
    if (lazyPaths && lazyPaths.length) return true;
    return !!(window.__cdLazyActionLoaders && window.__cdLazyActionLoaders[action]);
  }

  function normalizeScriptSrc(src) {
    var raw = String(src || '').trim().replace(/^\.\//, '');
    if (!raw) return '';
    if (/^(?:[a-z]+:)?\/\//i.test(raw) || raw.indexOf('data:') === 0 || raw.indexOf('blob:') === 0) return raw;
    if (raw.charAt(0) === '/') return raw;
    return '/' + raw;
  }

  function loadScript(src) {
    return new Promise(function(resolve, reject) {
      var norm = normalizeScriptSrc(src);
      var normBase = norm.split('?')[0];
      var fileName = normBase.split('/').pop();
      var all = document.querySelectorAll('script[src]');
      var existing = null;
      for (var i = 0; i < all.length; i++) {
        var a = all[i].getAttribute('src') || '';
        var aBase = a.split('?')[0];
        if (a === norm || aBase === normBase || (fileName && aBase.indexOf('/' + fileName) !== -1)) { existing = all[i]; break; }
      }
      if (existing) {
        if (existing.dataset.loaded === '1' || existing.readyState === 'complete' || existing.readyState === 'loaded') {
          resolve();
          return;
        }
        if (existing.dataset.loading !== '1') {
          resolve();
          return;
        }
        existing.addEventListener('load', function() { resolve(); }, { once: true });
        existing.addEventListener('error', function() { reject(new Error('load failed: ' + src)); }, { once: true });
        return;
      }
      var s = document.createElement('script');
      s.src = norm;
      s.defer = true;
      s.async = true;
      s.dataset.loading = '1';
      s.onload = function() {
        s.dataset.loading = '0';
        s.dataset.loaded = '1';
        resolve();
      };
      s.onerror = function() { reject(new Error('load failed: ' + src)); };
      document.head.appendChild(s);
    });
  }

  function invokeBusinessAction(rule, origin, sourceEvent) {
    if (!rule) return false;
    try {
      window.__cdLastMobileAction = {
        action: rule.action,
        sourceType: sourceEvent ? sourceEvent.type : 'manual',
        at: Date.now()
      };
    } catch (_) {}
    ensureMobileBackstackRuntime();
    try {
      if (window.__cdMobileNav && typeof window.__cdMobileNav.onActionInvoke === 'function') {
        window.__cdMobileNav.onActionInvoke(rule.action, origin || null);
      }
    } catch (_) {}
    // Preview CTA with data-pvw-bypass is a normal direct path.
    var _fromPreviewBypass = false;
    if (origin && typeof origin.closest === 'function') {
      _fromPreviewBypass = !!origin.closest('[data-pvw-bypass]');
    }
    if (!_fromPreviewBypass && shouldSkipDuplicateAction(rule.action)) return true;

    // Coin/payment gate checks
    // Prevent touch events from bypassing the coin/payment gate into premium actions.
    // Premium panels still need to pass through the upstream gate flow.
    // If pvw-bypass is active (direct click from Preview CTA), skip the gate.
    var _coinGateTile = null;
    if (origin && typeof origin.closest === 'function') {
      _coinGateTile = origin.closest('[data-tile-lock-key],[data-coin-cost]');
    }
    // When pvw-bypass is set, Preview CTA direct entry should skip the gate.
    if (_coinGateTile && _coinGateTile.getAttribute('data-pvw-bypass')) _coinGateTile = null;
    if (!_coinGateTile) {
      _coinGateTile = document.querySelector(
        '[data-action="' + rule.action + '"][data-tile-lock-key],' +
        '[data-action="' + rule.action + '"][data-coin-cost]'
      );
      // Fallback tile also needs the pvw-bypass check
      if (_coinGateTile && _coinGateTile.getAttribute('data-pvw-bypass')) _coinGateTile = null;
    }
    if (_coinGateTile) {
      var _coinGateCost = Number(_coinGateTile.getAttribute('data-coin-cost') || 0);
      if (_coinGateCost > 0 && !_fromPreviewBypass && typeof window._cdOpenTilePreview === 'function') {
        try {
          if (window._cdOpenTilePreview(_coinGateTile)) {
            return true;
          }
        } catch (_) {}
      }
      if (typeof window.__cdRequireTileLockGate === 'function') {
        if (!window.__cdRequireTileLockGate(_coinGateTile)) {
          return true;
        }
      } else if (typeof window._cdOpenTilePreview === 'function' && !_coinGateTile.getAttribute('data-pvw-bypass')) {
        if (window._cdOpenTilePreview(_coinGateTile)) {
          return true;
        }
        return false;
      }
    }
    // Coin/payment gate check complete.

    var directLinkEl = origin && typeof origin.closest === 'function'
      ? origin.closest('a[href]')
      : null;
    // 시빌라/자미두수/숙요/점성술/타로 진입 타일은 SEO·크롤용으로 <a href> 이지만 모달은 제자리에서
    // 열려야 한다. 이 지름길이 그 앵커까지 삼키면 탭 한 번에 셸이 통째로 재로드되고, 사주 결과가
    // 살아있어야 동작하는 시빌라는 데이터를 잃은 채 열려 "메인으로 튕긴" 것처럼 보인다.
    // 데스크탑 클릭 위임은 같은 액션을 이미 preventDefault 하고 있다 — 그 짝을 여기에 맞춘다.
    if (directLinkEl && isInPlaceModalAction(rule.action)) {
      directLinkEl = null;
    }
    if (directLinkEl) {
      var directCoinCost = Number(directLinkEl.getAttribute('data-coin-cost') || 0);
      var directLockCost = Number(directLinkEl.getAttribute('data-tile-lock-cost') || 0);
      var directHref = directLinkEl.getAttribute('href') || directLinkEl.getAttribute('data-direct-href') || directLinkEl.getAttribute('data-fallback-href') || '';
      var normalizedHref = String(directHref || '').trim();
      if (
        directCoinCost <= 0 &&
        directLockCost <= 0 &&
        normalizedHref &&
        normalizedHref !== '#' &&
        normalizedHref.indexOf('javascript:') !== 0
      ) {
        try {
          window.location.href = normalizedHref;
          return true;
        } catch (directErr) {
          try {
            window.location.assign(normalizedHref);
            return true;
          } catch (assignErr) {
            console.error('[mobile-interaction-patch] direct link navigation failed:', assignErr || directErr);
          }
        }
      }
    }

    var loadToken = beginFeatureLoading(rule.action, { minMs: 350, maxMs: 7000 });

    if (rule.action === 'openNevilleMeditationPage') {
      try {
        window.location.href = '/neville-meditation.html';
        return true;
      } catch (err) {
        console.error('[mobile-interaction-patch] meditation navigation failed:', err);
        endFeatureLoading(loadToken);
        var fallbackHref = (origin && origin.getAttribute && origin.getAttribute('data-fallback-href')) || '/neville-meditation.html';
        if (fallbackHref) {
          try {
            window.location.assign(fallbackHref);
            return true;
          } catch (fallbackErr) {
            console.error('[mobile-interaction-patch] meditation fallback navigation failed:', fallbackErr);
          }
        }
      }
      endFeatureLoading(loadToken);
      return false;
    }

    if (rule.action === 'openCosmicSoulMeditation') {
      try {
        window.location.href = '/cosmic-soul-meditation.html';
        return true;
      } catch (err) {
        console.error('[mobile-interaction-patch] cosmic soul meditation navigation failed:', err);
        endFeatureLoading(loadToken);
        var fallbackHref2 = (origin && origin.getAttribute && origin.getAttribute('data-fallback-href')) || '/cosmic-soul-meditation.html';
        if (fallbackHref2) {
          try { window.location.assign(fallbackHref2); return true; } catch (_) {}
        }
      }
      endFeatureLoading(loadToken);
      return false;
    }

    if (rule.action === 'openYogaGuru') {
      try {
        window.location.href = '/yoga-guru.html';
        return true;
      } catch (err) {
        console.error('[mobile-interaction-patch] yoga guru navigation failed:', err);
        endFeatureLoading(loadToken);
        var fallbackHref3 = (origin && origin.getAttribute && origin.getAttribute('data-fallback-href')) || '/yoga-guru.html';
        if (fallbackHref3) {
          try { window.location.assign(fallbackHref3); return true; } catch (_) {}
        }
      }
      endFeatureLoading(loadToken);
      return false;
    }

    if (rule.action === 'openTarotHealingModal') {
      try {
        window.location.href = '/tarot/healing';
        return true;
      } catch (err) {
        console.error('[mobile-interaction-patch] tarot healing navigation failed:', err);
        endFeatureLoading(loadToken);
        try {
          window.location.assign('/tarot/healing');
          return true;
        } catch (_) {}
      }
      endFeatureLoading(loadToken);
      return false;
    }

    dispatchFeatureTapEvent(rule, origin, sourceEvent);

    var fn = window[rule.action];
    var lazyPaths = LAZY_LOAD_ACTIONS[rule.action];
    if (rule.action === 'gotoNamingPremium' && typeof fn !== 'function') {
      window.location.href = '/myungwun_final.html';
      return true;
    }

    /* lazy-load: keep routing through even if the script is not ready yet. */
    if (typeof fn !== 'function' && lazyPaths && lazyPaths.length) {
      var raf = window.requestAnimationFrame || function(cb) { return setTimeout(cb, 0); };
      raf(function() {
        var chain = Promise.resolve();
        lazyPaths.forEach(function(src) {
          chain = chain.then(function() { return loadScript(src); });
        });
        chain.then(function() {
          if (typeof window.__cdEnsureModalOverlaysInBody === 'function') window.__cdEnsureModalOverlaysInBody();
          var f = window[rule.action];
          if (typeof f === 'function') {
            var result;
            try { 
              result = f();
              finalizeFeatureLoading(result, loadToken);
            } catch (err) {
              console.error('[mobile-interaction-patch] post-load action failed:', rule.action, err);
              endFeatureLoading(loadToken);
            }
          } else {
            endFeatureLoading(loadToken);
          }
        }).catch(function(err) {
          console.error('[mobile-interaction-patch] lazy load failed:', rule.action, err);
          endFeatureLoading(loadToken);
        });
      });
      return true;
    }

    if (typeof fn !== 'function') {
      endFeatureLoading(loadToken);
      return false;
    }

    /* If a heavy browser gets stuck while handling touch, defer with rAF. */
    var raf = window.requestAnimationFrame || function(cb) { return setTimeout(cb, 0); };
    try {
      raf(function() {
        if (typeof window.__cdEnsureModalOverlaysInBody === 'function') window.__cdEnsureModalOverlaysInBody();
        try {
          var result = fn();
          finalizeFeatureLoading(result, loadToken);
        } catch (err) {
          console.error('[mobile-interaction-patch] action execution failed:', rule.action, err);
          endFeatureLoading(loadToken);
        }
      });
      return true;
    } catch (err) {
      console.error('[mobile-interaction-patch] action execution failed:', rule.action, err);
      endFeatureLoading(loadToken);
      return false;
    }
  }

  function findDataActionElement(origin) {
    if (!origin || typeof origin.closest !== 'function') return null;
    var el = origin.closest('[data-action]');
    if (!el) return null;
    var action = el.getAttribute('data-action');
    if (!action || action === 'toggleCollection') return null;
    if (!FEATURE_ACTION_SET[action] && !isGenericCardActionElement(el)) return null;
    return el;
  }

  function invokeDataActionFallback(actionEl, sourceEvent) {
    if (!actionEl) return false;
    var action = actionEl.getAttribute('data-action');
    if (!action) return false;
    var actionArgsRaw = actionEl.getAttribute('data-action-args') || '';
    // 🔴 인계는 디듀프 대상이 아니다. invokeBusinessAction 에는 같은 예외가 있는데
    // (_fromPreviewBypass) 여기에는 없어서, 사용자 탭 → 인계 클릭이 ACTION_DEDUPE_MS(650ms)
    // 안에 연달아 들어오면 두 번째가 "이미 처리함"(return true)으로 위장돼 호출부가
    // preventDefault 까지 하고 끝났다. 겉으로는 눌러도 아무 일이 없는 것과 같다.
    var _fromPreviewBypass = !!(actionEl.closest && actionEl.closest('[data-pvw-bypass]'));
    if (!_fromPreviewBypass && shouldSkipDuplicateAction(action + '::' + actionArgsRaw)) return true;

    var hasActionConfig = !!actionArgsRaw
      || !!actionEl.getAttribute('data-action-pass-self')
      || actionEl.getAttribute('data-action-pass-event') === '1';

    // Generic data-action route must preserve args/self/event config.
    if (hasActionConfig) {
      if (invokeConfiguredDataAction(actionEl, sourceEvent)) return true;
    } else if (invokeBusinessAction({ action: action }, actionEl, sourceEvent)) {
      return true;
    }

    // 유료 게이트가 필요한 액션은 전역 핸들러로 전달한다.
    // Route through the global click handler to keep Preview/gates stable.
    var isPremGateAction = (
      action === 'gotoNamingPremium'
    );
    if (isPremGateAction && Number(actionEl.getAttribute('data-coin-cost') || 0) > 0) {
      return false;
    }

    // Let the global data-action binder handle generic actions.
    if (typeof actionEl.click === 'function') {
      actionEl.click();
      return true;
    }
    return false;
  }

  function findMobileCardLink(origin) {
    if (!origin || typeof origin.closest !== 'function') return null;
    var link = origin.closest(
      'a[href].tarot-tile,' +
      'a[href].premium-card,' +
      'a[href].service-card,' +
      'a[href].MobileFeatureCard,' +
      'a[href].MobileLockedCard,' +
      'a[href].moon-preview-card'
    );
    if (!link) return null;
    var href = String(link.getAttribute('href') || '').trim();
    if (!href || href.charAt(0) === '#' || /^javascript:/i.test(href)) return null;
    // 이 링크 탐색은 아래 rule 기반 액션 처리보다 먼저 돈다. 홈의 자미두수·숙요·점성술·타로
    // 진입 카드는 .moon-preview-card 이면서 동시에 제자리 개봉 액션을 들고 있으므로,
    // 여기서 걸러 주지 않으면 액션이 실행되기 전에 셸이 통째로 재로드된다.
    if (isInPlaceModalAction(link.getAttribute('data-action'))) return null;
    return link;
  }

  function invokeMobileCardLink(link) {
    if (!link) return false;
    var href = String(link.getAttribute('href') || '').trim();
    if (!href || shouldSkipDuplicateAction('link::' + href)) return false;
    try {
      window.__cdLastMobileAction = {
        action: 'navigateLink',
        href: href,
        sourceType: 'touch',
        at: Date.now()
      };
    } catch (_) {}
    window.location.href = href;
    return true;
  }

  function injectTouchActionStyle() {
    if (document.getElementById('cd-mobile-touch-bridge-style')) return;

    var css = [
      '.feature-card--face, .feature-card--tazza,',
      '.tarot-tile--healing, .tarot-tile--year, .tarot-tile--love, .tarot-tile--reunion, .tarot-tile--self-esteem, .tarot-tile--animal-totem, .tarot-tile--meditation,',
      '.tarot-tile--dream-tile, .tarot-tile--psycho-freud-tile,',
      '.tarot-tile--hwatu, .tarot-tile--egypt-fc, .tarot-tile--vedic-fc, .tarot-tile--olympus-oracle, .tarot-tile--geomancy-fc,',
      '.tarot-tile--bloom, .tarot-tile--astro-flower, .tarot-tile--jami-flower, .tarot-tile--sukuyo-fl,',
      '.feature-card--face .feature-card__visual, .feature-card--tazza .feature-card__visual,',
      '.feature-card--face .feature-card__img-wrap, .feature-card--tazza .feature-card__img-wrap,',
      '.feature-card--face .feature-card__img, .feature-card--tazza .feature-card__img,',
      '.feature-card--face .feature-card__title, .feature-card--tazza .feature-card__title,',
      '.feature-card--face .feature-card__desc, .feature-card--tazza .feature-card__desc,',
      '.tarot-tile--love .tarot-tile__img-wrap, .tarot-tile--love .tarot-tile__img, .tarot-tile--love .tarot-tile__badge, .tarot-tile--love .tarot-tile__body, .tarot-tile--love .tarot-tile__title, .tarot-tile--love .tarot-tile__desc,',
      '.tarot-tile--self-esteem .tarot-tile__img-wrap, .tarot-tile--self-esteem .tarot-tile__img, .tarot-tile--self-esteem .tarot-tile__badge, .tarot-tile--self-esteem .tarot-tile__body, .tarot-tile--self-esteem .tarot-tile__title, .tarot-tile--self-esteem .tarot-tile__desc,',
      '.tarot-tile--reunion .tarot-tile__img-wrap, .tarot-tile--reunion .tarot-tile__img, .tarot-tile--reunion .tarot-tile__badge, .tarot-tile--reunion .tarot-tile__body, .tarot-tile--reunion .tarot-tile__title, .tarot-tile--reunion .tarot-tile__desc,',
      '.tarot-tile--dream-tile .tarot-tile__img-wrap, .tarot-tile--dream-tile .tarot-tile__img, .tarot-tile--dream-tile .tarot-tile__badge, .tarot-tile--dream-tile .tarot-tile__body, .tarot-tile--dream-tile .tarot-tile__title, .tarot-tile--dream-tile .tarot-tile__desc,',
      '.tarot-tile--psycho-freud-tile .tarot-tile__img-wrap, .tarot-tile--psycho-freud-tile .tarot-tile__img, .tarot-tile--psycho-freud-tile .tarot-tile__badge, .tarot-tile--psycho-freud-tile .tarot-tile__body, .tarot-tile--psycho-freud-tile .tarot-tile__title, .tarot-tile--psycho-freud-tile .tarot-tile__desc,',
      '.tarot-tile--healing .tarot-tile__img-wrap, .tarot-tile--healing .tarot-tile__img, .tarot-tile--healing .tarot-tile__body, .tarot-tile--healing .tarot-tile__title, .tarot-tile--healing .tarot-tile__desc,',
      '.tarot-tile--year .tarot-tile__img-wrap, .tarot-tile--year .tarot-tile__img, .tarot-tile--year .tarot-tile__body, .tarot-tile--year .tarot-tile__title, .tarot-tile--year .tarot-tile__desc,',
      '.tarot-tile--hwatu .tarot-tile__img-wrap, .tarot-tile--hwatu .tarot-tile__img, .tarot-tile--hwatu .tarot-tile__body, .tarot-tile--hwatu .tarot-tile__title, .tarot-tile--hwatu .tarot-tile__desc,',
      '.tarot-tile--egypt-fc .tarot-tile__img-wrap, .tarot-tile--egypt-fc .tarot-tile__img, .tarot-tile--egypt-fc .tarot-tile__body, .tarot-tile--egypt-fc .tarot-tile__title, .tarot-tile--egypt-fc .tarot-tile__desc,',
      '.tarot-tile--vedic-fc .tarot-tile__img-wrap, .tarot-tile--vedic-fc .tarot-tile__img, .tarot-tile--vedic-fc .tarot-tile__body, .tarot-tile--vedic-fc .tarot-tile__title, .tarot-tile--vedic-fc .tarot-tile__desc,',
      '.tarot-tile--olympus-oracle .tarot-tile__img-wrap, .tarot-tile--olympus-oracle .tarot-tile__img, .tarot-tile--olympus-oracle .tarot-tile__badge, .tarot-tile--olympus-oracle .tarot-tile__body, .tarot-tile--olympus-oracle .tarot-tile__title, .tarot-tile--olympus-oracle .tarot-tile__desc,',
      '.tarot-tile--geomancy-fc .tarot-tile__img-wrap, .tarot-tile--geomancy-fc .tarot-tile__img, .tarot-tile--geomancy-fc .tarot-tile__badge, .tarot-tile--geomancy-fc .tarot-tile__body, .tarot-tile--geomancy-fc .tarot-tile__title, .tarot-tile--geomancy-fc .tarot-tile__desc,',
      '.tarot-tile--animal-totem .tarot-tile__img-wrap, .tarot-tile--animal-totem .tarot-tile__img, .tarot-tile--animal-totem .tarot-tile__badge, .tarot-tile--animal-totem .tarot-tile__body, .tarot-tile--animal-totem .tarot-tile__title, .tarot-tile--animal-totem .tarot-tile__desc,',
      '.tarot-tile--saju-guardian .tarot-tile__img-wrap, .tarot-tile--saju-guardian .tarot-tile__img, .tarot-tile--saju-guardian .tarot-tile__badge, .tarot-tile--saju-guardian .tarot-tile__body, .tarot-tile--saju-guardian .tarot-tile__title, .tarot-tile--saju-guardian .tarot-tile__desc,',
      '.tarot-tile--bloom .tarot-tile__img-wrap, .tarot-tile--bloom .tarot-tile__img, .tarot-tile--bloom .tarot-tile__badge, .tarot-tile--bloom .tarot-tile__body, .tarot-tile--bloom .tarot-tile__title, .tarot-tile--bloom .tarot-tile__desc,',
      '.tarot-tile--astro-flower .tarot-tile__img-wrap, .tarot-tile--astro-flower .tarot-tile__img, .tarot-tile--astro-flower .tarot-tile__badge, .tarot-tile--astro-flower .tarot-tile__body, .tarot-tile--astro-flower .tarot-tile__title, .tarot-tile--astro-flower .tarot-tile__desc,',
      '.tarot-tile--jami-flower .tarot-tile__img-wrap, .tarot-tile--jami-flower .tarot-tile__img, .tarot-tile--jami-flower .tarot-tile__badge, .tarot-tile--jami-flower .tarot-tile__body, .tarot-tile--jami-flower .tarot-tile__title, .tarot-tile--jami-flower .tarot-tile__desc,',
      '.tarot-tile--sukuyo-fl .tarot-tile__img-wrap, .tarot-tile--sukuyo-fl .tarot-tile__img, .tarot-tile--sukuyo-fl .tarot-tile__badge, .tarot-tile--sukuyo-fl .tarot-tile__body, .tarot-tile--sukuyo-fl .tarot-tile__title, .tarot-tile--sukuyo-fl .tarot-tile__desc,',
      '.tarot-tile--meditation .tarot-tile__img-wrap, .tarot-tile--meditation .tarot-tile__img, .tarot-tile--meditation .tarot-tile__badge, .tarot-tile--meditation .tarot-tile__body, .tarot-tile--meditation .tarot-tile__title, .tarot-tile--meditation .tarot-tile__desc,',
      '[data-action="openPhysiognomyApp"], [data-action="openPastLifeFaceApp"], [data-action="openHwatuModal"], [data-action="openKemetModal"], [data-action="openDreamModal"], [data-action="openPsychoDreamModal"], [data-action="openTarotHealingModal"], [data-action="openTarotYearFortuneModal"], [data-action="openTarotLoveModal"], [data-action="openTarotSelfEsteemModal"], [data-action="openTarotReunionModal"], [data-action="openRoyalTeaOracle"],',
      '[data-action="openAnimalTotemModal"], [data-action="openSajuAnimalPage"], [data-action="openDestinyFlowerStudio"], [data-action="openAstrologyFlowerStudio"], [data-action="openJamidusuFlowerStudio"], [data-action="openSukuyoFlowerStudio"], [data-action="openNevilleMeditationPage"], [data-action="navigateToVedic"], [data-action="openOlympusOracleModal"], [data-action="openGeomancyOracle"],',
      '/* Reader/service tile touch optimization */',
      '.lifebook-tile, .lovebible-tile, .lovesim-tile, .sibyl-entry-tile,',
      '.lifebook-tile__inner, .lovebible-tile__inner, .lovesim-tile__inner, .sibyl-entry-inner,',
      '.lifebook-tile__img-wrap, .lifebook-tile__img, .lifebook-tile__body, .lifebook-tile__title, .lifebook-tile__desc, .lifebook-tile__features, .lifebook-tile__cta,',
      '.lovebible-tile__inner, .lovebible-tile__body, .lovebible-tile__title, .lovebible-tile__desc, .lovebible-tile__features, .lovebible-tile__cta,',
      '.lovesim-tile__inner, .lovesim-tile__body, .lovesim-tile__title, .lovesim-tile__desc, .lovesim-tile__features, .lovesim-tile__cta,',
      '.sibyl-entry-inner, .sibyl-entry-img-col, .sibyl-entry-img, .sibyl-entry-content,',
      '[data-action="openLoveSimulation"], [data-action="openSibylModal"] {',
      '  touch-action: manipulation;',
      '  -webkit-tap-highlight-color: transparent;',
      '  cursor: pointer;',
      '}',
      '.fc-toggle-btn {',
      '  touch-action: manipulation;',
      '  -webkit-tap-highlight-color: transparent;',
      '  cursor: pointer;',
      '}',
      '.moon-preview-card, .cd-comprehensive-prompt-entry,',
      '.lang-trigger, .cd-mobile-hub__chip, .cd-mobile-hub__section-more, .cd-mobile-bottom-nav__chip, .moon-music-entry__cta,',
      '.feature-card-grid .feature-card, .feature-card-grid .tarot-tile, .feature-card-grid .lifebook-tile,',
      '.feature-card-grid .lovebible-tile, .feature-card-grid .lovesim-tile, .feature-card-grid .sibyl-entry-tile,',
      '.feature-card-grid .prem-card, .lifebook-tile, .lovebible-tile, .lovesim-tile, .sibyl-entry-tile, .prem-card {',
      '  touch-action: manipulation;',
      '  -webkit-tap-highlight-color: transparent;',
      '  cursor: pointer;',
      '  min-height: 44px;',
      '  min-width: 44px;',
      '}',
      '.lang-trigger, .cd-mobile-hub__chip, .cd-mobile-hub__section-more, .cd-mobile-bottom-nav__chip, .moon-music-entry__cta {',
      '  min-height: 44px !important;',
      '  min-width: 44px !important;',
      '}',
      '.lang-trigger {',
      '  height: 44px !important;',
      '}',
      '.moon-preview-card__sigil, .moon-preview-card__meta,',
      '.feature-card-grid .tarot-tile__img-wrap, .feature-card-grid .tarot-tile__img,',
      '.feature-card-grid .tarot-tile__body, .feature-card-grid .tarot-tile__title,',
      '.feature-card-grid .tarot-tile__desc, .feature-card-grid .tarot-tile__badge,',
      '.feature-card-grid .tarot-tile__coin-badge, .feature-card-grid .tarot-tile__lock-icon,',
      '.feature-card-grid .tarot-tile__img-placeholder, .feature-card-grid .tarot-tile__img-skeleton,',
      '.tarot-tile__img-wrap, .tarot-tile__img, .tarot-tile__body,',
      '.tarot-tile__title, .tarot-tile__desc, .tarot-tile__badge,',
      '.tarot-tile__coin-badge, .tarot-tile__lock-icon,',
      '.tarot-tile__img-placeholder, .tarot-tile__img-skeleton,',
      '.lifebook-tile__bg, .lifebook-tile__particles,',
      '.lovebible-tile__bg, .lovebible-tile__particles {',
      '  pointer-events: none;',
      '}',
      '.feature-card-grid, .feat-collection, .tarot-collection, .feat-collection__grid, .tarot-collection__grid {',
      '  touch-action: pan-y;',
      '}',
      ':root {',
      '  --cd-safe-vh: 100vh;',
      '}',
      '.cd-mobile-tap-feedback {',
      '  transform: translateY(1px) scale(.992);',
      '  filter: brightness(1.06);',
      '  transition: transform .12s ease, filter .12s ease;',
      '}',
      '#tilePvwOverlay:not(.pvw-open), #sajuLoaderOverlay[aria-hidden="true"], #privacy-modal-overlay[aria-hidden="true"], #goldenGrainChargeModalRoot[aria-hidden="true"], #namingPromptModal[aria-hidden="true"], #cdLoginRequiredModal[aria-hidden="true"], .saju-loader-overlay[aria-hidden="true"], .modal[aria-hidden="true"] {',
      '  pointer-events: none !important;',
      '}',
      '#namingPromptModal[aria-hidden="false"] {',
      '  min-height: var(--cd-safe-vh);',
      '}',
      '@supports (height: 100dvh) {',
      '  :root { --cd-safe-vh: 100dvh; }',
      '}',
      '#kemetOracleOverlay, #psychoDreamModalOverlay, #tarotHealingOverlay, #tarotLoveOverlay, #tarotReunionOverlay, #tarotYearFortuneOverlay, #dreamModalOverlay {',
      '  min-height: var(--cd-safe-vh);',
      '  max-height: var(--cd-safe-vh);',
      '  overflow-x: hidden;',
      '  -webkit-overflow-scrolling: touch;',
      '}',
      '@media (max-width: 767px), (hover: none) and (pointer: coarse) {',
      '  #sajuLoaderOverlay[aria-hidden="true"] .saju-loader-visual,',
      '  #sajuLoaderOverlay[aria-hidden="true"] .saju-loader-yeon-sprite,',
      '  #sajuLoaderOverlay[aria-hidden="true"] .saju-loader-yeon-sprite::before,',
      '  #sajuLoaderOverlay[aria-hidden="true"] .saju-loader-progress::after {',
      '    animation-play-state: paused !important;',
      '    -webkit-animation-play-state: paused !important;',
      '  }',
      '  #sajuLoaderOverlay[aria-hidden="true"] .saju-loader-yeon-sprite::before {',
      '    background-image: none !important;',
      '  }',
      '  #sajuLoaderOverlay[aria-hidden="false"][data-marker~="honey-fortune-logo-payment-ux-v20260618"],',
      '  #cdPaidFeatureGate {',
      '    backdrop-filter: blur(6px) saturate(1.02) !important;',
      '    -webkit-backdrop-filter: blur(6px) saturate(1.02) !important;',
      '  }',
      '  .tile-pvw-bd, .tile-pvw-close, .tile-pvw-hero-cat, .tile-pvw-hero-cost {',
      '    backdrop-filter: none !important;',
      '    -webkit-backdrop-filter: none !important;',
      '  }',
      '}',
      '@media (prefers-reduced-motion: reduce) {',
      '  .moon-music-entry__stars, .moon-music-entry__stars-crescent,',
      '  #sajuLoaderOverlay .saju-loader-yeon-sprite::before,',
      '  .tile-pvw-hero-img.pvw-img-enter {',
      '    animation: none !important;',
      '    -webkit-animation: none !important;',
      '  }',
      '}'
    ].join('\n');

    var style = document.createElement('style');
    style.id = 'cd-mobile-touch-bridge-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function bindMobileDataActionFallback(root) {
    if (!root || root.__cdMobileDataActionFallbackBound) return;
    root.__cdMobileDataActionFallbackBound = true;
    root.addEventListener('click', function (event) {
      if (!shouldEnableMobileInteractionBridge()) return;
      if (!event || event.__cdMobileBridgeHandled || !event.target || !event.target.closest) return;
      var actionEl = findDataActionElement(event.target);
      if (!actionEl) return;
      var now = Date.now();
      var recentScrollGuard = ((now - lastScrollAt < SCROLL_BLOCK_MS) || shouldBlockCardTap())
        && (lastTouchHadMove || cardScrollTouch.moved);
      // 🔴 막기로 판정했으면 실제로 막아야 한다. 예전에는 여기서 그냥 return 해서 클릭이 계속
      // 전파됐고, 아래 bindDirectFeatureCardActions 가 노드에 직접 건 무가드 클릭 핸들러가
      // 그 클릭을 받아 액션을 실행했다 — 판정을 내려놓고 버리는 구조였다.
      // 🔴 인계 클릭은 예외다. 아래 2284 의 document 게이트에는 이 예외가 2026-08-14 에 들어갔는데
      // 조건식이 똑같은 여기에는 안 들어가서, rule 매칭이 안 되는 타일에서는 인계가 그대로 죽었다.
      if (!isSyntheticHandoffClick(event) && (now < suppressClickUntil || recentScrollGuard || gestureBlocksActivation())) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (!invokeDataActionFallback(actionEl, event)) return;
      event.__cdMobileBridgeHandled = true;
      showTapFeedback(actionEl);
      scheduleOverlayLifecycleGuard(360);
      event.preventDefault();
      event.stopPropagation();
    }, true);
  }

  function bindDirectFeatureCardActions(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var nodes = scope.querySelectorAll('.feature-card-grid [data-action], .moon-collection-nav [data-action], #cdMobileDestinyHub [data-action]');
    nodes.forEach(function(node) {
      if (!node || node.__cdMobileDirectActionBound) return;
      var action = node.getAttribute('data-action');
      if (!action || action === 'toggleCollection') return;
      if (!FEATURE_ACTION_SET[action] && !isGenericCardActionElement(node)) return;
      node.__cdMobileDirectActionBound = true;
      var directTouch = null;
      node.addEventListener('touchstart', function(event) {
        var pt = getPoint(event);
        directTouch = pt ? { x: pt.x, y: pt.y, moved: false, at: Date.now() } : null;
      }, { passive: true });
      node.addEventListener('touchmove', function(event) {
        if (!directTouch) return;
        var pt = getPoint(event);
        if (!pt) return;
        if (Math.abs(pt.x - directTouch.x) > TAP_MOVE_DETECT_PX || Math.abs(pt.y - directTouch.y) > TAP_MOVE_DETECT_PX) {
          directTouch.moved = true;
        }
      }, { passive: true });
      node.addEventListener('touchend', function(event) {
        if (!directTouch || directTouch.moved || Date.now() - directTouch.at > MAX_TAP_DURATION_MS) {
          directTouch = null;
          return;
        }
        directTouch = null;
        if (event && event.__cdMobileBridgeHandled) return;
        if (gestureBlocksActivation()) return;
        if (!invokeDataActionFallback(node, event)) return;
        event.__cdMobileBridgeHandled = true;
        showTapFeedback(node);
        scheduleOverlayLifecycleGuard(360);
        event.preventDefault();
        event.stopPropagation();
      }, { passive: false });
      node.addEventListener('pointerup', function(event) {
        if (!event || event.pointerType !== 'touch' || event.__cdMobileBridgeHandled) return;
        if (directTouch && directTouch.moved) return;
        if (gestureBlocksActivation()) return;
        if (!invokeDataActionFallback(node, event)) return;
        event.__cdMobileBridgeHandled = true;
        showTapFeedback(node);
        scheduleOverlayLifecycleGuard(360);
        event.preventDefault();
        event.stopPropagation();
      }, { passive: false });
      node.addEventListener('click', function(event) {
        if (!shouldEnableMobileInteractionBridge()) return;
        if (!event || event.__cdMobileBridgeHandled) return;
        // 이 핸들러엔 원래 스크롤 검사가 하나도 없었다 — 위 fallback 이 "막자"고 판정한 클릭도
        // 여기까지 흘러와 그대로 실행됐다. 인계 클릭은 위 게이트와 같은 기준으로 예외다.
        if (!isSyntheticHandoffClick(event) && gestureBlocksActivation()) return;
        if (!invokeDataActionFallback(node, event)) return;
        event.__cdMobileBridgeHandled = true;
        showTapFeedback(node);
        scheduleOverlayLifecycleGuard(360);
        event.preventDefault();
        event.stopPropagation();
      }, true);
    });
  }

  function createBulletproofDelegator(root) {
    if (!root || root.__cdTouchBridgeBound) return;
    root.__cdTouchBridgeBound = true;

    function __cdRafBatch(readPhase, writePhase) {
      var readResult = null;
      if (typeof readPhase === 'function') readResult = readPhase();
      requestAnimationFrame(function () {
        if (typeof writePhase === 'function') writePhase(readResult);
      });
    }

    root.addEventListener('touchstart', function (event) {
      var pt = getPoint(event);
      if (pt) {
        lastTouchStart = { x: pt.x, y: pt.y, at: Date.now() };
        lastTouchHadMove = false;
      }
      // 공유 작업은 이번 제스처의 첫 신호에서만 — pointerdown 이 이미 했으면 건너뛴다.
      if (event && event.target && beginGestureDown(event)) {
        showTapFeedback(event.target);
        scheduleOverlayLifecycleGuard(260);
      }
      if (!event || !event.target || !event.target.closest) return;
      var rule = ruleForGestureDown(event);
      if (!rule) return;
      if (!pt) return;
      /* 🔴 아래 두 줄은 touchstart 고유라 **절대 건너뛰지 않는다.** 이걸 공유 작업으로 묶으면
         pointerdown 이 먼저 오는 브라우저에서 cardScrollTouch 가 영영 서지 않고, 그러면
         touchmove 의 markCardScrollLock 이 안 돌아 "스크롤 직후 고스트 탭이 카드를 연다"가 된다. */
      cardScrollTouch.active = isCardScrollTarget(event.target);
      cardScrollTouch.moved = false;

      touchCtx = {
        rule: rule,
        startX: pt.x,
        startY: pt.y,
        target: event.target,
        startedAt: Date.now(),
        moved: false,
        hadMoveEvent: false,
        maxDx: 0,
        maxDy: 0
      };
    }, { passive: true, capture: true });

    root.addEventListener('touchmove', function (event) {
      if (!touchCtx) return;
      var pt = getPoint(event);
      if (!pt) return;
      var dx = Math.abs(pt.x - touchCtx.startX);
      var dy = Math.abs(pt.y - touchCtx.startY);
      if (dx > touchCtx.maxDx) touchCtx.maxDx = dx;
      if (dy > touchCtx.maxDy) touchCtx.maxDy = dy;
      if (dx > TAP_MOVE_DETECT_PX || dy > TAP_MOVE_DETECT_PX) {
        touchCtx.hadMoveEvent = true;
        lastTouchHadMove = true;
        clearTapFeedback();
      }
      if (dx > TAP_MAX_DX || dy > TAP_MAX_DY || (dy >= TAP_VERTICAL_BLOCK_PX && dy >= dx)) {
        touchCtx.moved = true;
        if (cardScrollTouch.active) {
          cardScrollTouch.moved = true;
          markCardScrollLock(240);
        }
      }
    }, { passive: false, capture: true });

    root.addEventListener('touchend', function (event) {
      var pt = getPoint(event);
      if (!pt) return;

      // 이 핸들러는 합성 클릭보다 먼저 기능을 연다 — 중재자의 클릭 게이트만으로는 못 막으므로
      // 여기서 직접 묻는다. 아래 자체 판정(ctx.moved 등)은 RULES 매칭 타일에서만 유효하다.
      if (gestureBlocksActivation()) {
        touchCtx = null;
        return;
      }

      if (handleCollectionToggleTap(event, pt, 'touch')) {
        event.__cdMobileBridgeHandled = true;
        suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
        return;
      }

      if (event.target && event.target.closest) {
        var gateTile = event.target.closest('[data-tile-lock-key],[data-coin-cost]');
        if (gateTile && !gateTile.getAttribute('data-pvw-bypass') && typeof window._cdOpenTilePreview === 'function' && !shouldSkipTilePreview(gateTile)) {
          try {
            if (window._cdOpenTilePreview(gateTile)) {
              showTapFeedback(gateTile);
              scheduleOverlayLifecycleGuard(360);
              event.preventDefault();
              event.stopPropagation();
              suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
              return;
            }
          } catch (_) {}
        }
      }

      if (lastTouchStart) {
        var directDx = Math.abs(pt.x - lastTouchStart.x);
        var directDy = Math.abs(pt.y - lastTouchStart.y);
        var directAge = Date.now() - (lastTouchStart.at || 0);
        var directLink = findMobileCardLink(event.target);
        if (directLink && directDx < TAP_MAX_DX && directDy < TAP_MAX_DY && directAge <= MAX_TAP_DURATION_MS && !lastTouchHadMove && !cardScrollTouch.moved) {
          if (invokeMobileCardLink(directLink)) {
            showTapFeedback(directLink);
            scheduleOverlayLifecycleGuard(360);
            event.preventDefault();
            event.stopPropagation();
            suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
            return;
          }
        }
      }

      var ctx = touchCtx;
      touchCtx = null;

      if (ctx) {
        var dy = Math.abs(pt.y - ctx.startY);
        var dx = Math.abs(pt.x - ctx.startX);
        var now = Date.now();
        var tapDuration = ctx.startedAt ? (now - ctx.startedAt) : 0;
        var verticalDominant = dy >= TAP_VERTICAL_BLOCK_PX && dy >= dx * 1.2;
        var recentScrollGuard = ((now - lastScrollAt) <= SCROLL_BLOCK_MS || shouldBlockCardTap())
          && (ctx.hadMoveEvent || lastTouchHadMove || cardScrollTouch.moved);
        var shouldBlockTap = ctx.moved
          || dx >= TAP_MAX_DX
          || dy >= TAP_MAX_DY
          || verticalDominant
          || tapDuration > MAX_TAP_DURATION_MS
          || recentScrollGuard;

        if (!shouldBlockTap) {
          var handled = invokeBusinessAction(ctx.rule, ctx.target, event);
          if (handled) {
            scheduleOverlayLifecycleGuard(360);
            event.preventDefault();
            event.stopPropagation();
            suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
            return;
          }
        } else {
          suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
        }
      }

      /* Mobile callback: re-scan with elementFromPoint when touchCtx delayed handling fails (minimal fallback). */
      if (isNavOwnedTap(event.target)) {
        suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
        return;
      }
      if (lastTouchStart) {
        var touchAge = Date.now() - (lastTouchStart.at || 0);
        if (touchAge > MAX_TAP_DURATION_MS) {
          suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
          return;
        }
        var dx = Math.abs(pt.x - lastTouchStart.x);
        var dy = Math.abs(pt.y - lastTouchStart.y);
        if (dx < TAP_MAX_DX && dy < TAP_MAX_DY && dy < TAP_VERTICAL_BLOCK_PX) {
          if ((Date.now() - lastScrollAt <= SCROLL_BLOCK_MS) && lastTouchHadMove) {
            suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
            return;
          }
          __cdRafBatch(function () {
            var ruleFromPoint = findRuleFromPoint(pt.x, pt.y) || findRuleFromPoint(lastTouchStart.x, lastTouchStart.y);
            var actionFromTarget = findDataActionElement(event.target);
            var actionFromPointEl = document.elementFromPoint(pt.x, pt.y) || document.elementFromPoint(lastTouchStart.x, lastTouchStart.y);
            var actionFromPoint = findDataActionElement(actionFromPointEl);
            var linkFromTarget = findMobileCardLink(event.target);
            var linkFromPoint = findMobileCardLink(actionFromPointEl);
            var elAtPoint = actionFromPointEl || document.body;
            return {
              ruleFromPoint: ruleFromPoint,
              actionEl: actionFromTarget || actionFromPoint,
              linkEl: linkFromTarget || linkFromPoint,
              elAtPoint: elAtPoint
            };
          }, function (state) {
            if (!state) return;
            if (state.ruleFromPoint) {
              var handledRule = invokeBusinessAction(state.ruleFromPoint, state.elAtPoint, event);
              if (handledRule) {
                scheduleOverlayLifecycleGuard(360);
                event.preventDefault();
                event.stopPropagation();
                suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
                return;
              }
            }
            if (invokeDataActionFallback(state.actionEl, event)) {
              scheduleOverlayLifecycleGuard(360);
              event.preventDefault();
              event.stopPropagation();
              suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
              return;
            }
            if (invokeMobileCardLink(state.linkEl)) {
              showTapFeedback(state.linkEl);
              scheduleOverlayLifecycleGuard(360);
              event.preventDefault();
              event.stopPropagation();
              suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
            }
          });
        }
      }
    }, { passive: false, capture: true });

    /* pointer event callback: allow pointer input on touch browsers too. */
    root.addEventListener('pointerdown', function (event) {
      if (event.pointerType !== 'touch') return;
      var pt = getPoint(event);
      if (pt) {
        lastTouchStart = { x: pt.x, y: pt.y, at: Date.now() };
        lastTouchHadMove = false;
      }
      // 공유 작업은 이번 제스처의 첫 신호에서만 — touchstart 가 이미 했으면 건너뛴다.
      if (event && event.target && beginGestureDown(event)) {
        showTapFeedback(event.target);
        scheduleOverlayLifecycleGuard(260);
      }
      if (!event || !event.target || !event.target.closest) return;
      var rule = ruleForGestureDown(event);
      if (!rule) return;
      if (!pt) return;
      touchCtx = {
        rule: rule,
        startX: pt.x,
        startY: pt.y,
        target: event.target,
        startedAt: Date.now(),
        moved: false,
        hadMoveEvent: false,
        maxDx: 0,
        maxDy: 0
      };
    }, { passive: true, capture: true });

    root.addEventListener('pointermove', function (event) {
      if (event.pointerType !== 'touch' || !touchCtx) return;
      var pt = getPoint(event);
      if (!pt) return;
      var dx = Math.abs(pt.x - touchCtx.startX);
      var dy = Math.abs(pt.y - touchCtx.startY);
      if (dx > touchCtx.maxDx) touchCtx.maxDx = dx;
      if (dy > touchCtx.maxDy) touchCtx.maxDy = dy;
      if (dx > TAP_MOVE_DETECT_PX || dy > TAP_MOVE_DETECT_PX) {
        touchCtx.hadMoveEvent = true;
        lastTouchHadMove = true;
        clearTapFeedback();
      }
      if (dx > TAP_MAX_DX || dy > TAP_MAX_DY || (dy >= TAP_VERTICAL_BLOCK_PX && dy >= dx)) {
        touchCtx.moved = true;
      }
    }, { passive: true, capture: true });

    root.addEventListener('pointerup', function (event) {
      if (event.pointerType !== 'touch') return;
      var pt = getPoint(event);
      if (!pt) return;
      if (gestureBlocksActivation()) {
        touchCtx = null;
        return;
      }
      if (handleCollectionToggleTap(event, pt, 'pointer')) {
        event.__cdMobileBridgeHandled = true;
        suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
        return;
      }
      if (event.target && event.target.closest) {
        var gateTile2 = event.target.closest('[data-tile-lock-key],[data-coin-cost]');
        if (gateTile2 && !gateTile2.getAttribute('data-pvw-bypass') && typeof window._cdOpenTilePreview === 'function' && !shouldSkipTilePreview(gateTile2)) {
          try {
            if (window._cdOpenTilePreview(gateTile2)) {
              showTapFeedback(gateTile2);
              scheduleOverlayLifecycleGuard(360);
              event.preventDefault();
              event.stopPropagation();
              suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
              return;
            }
          } catch (_) {}
        }
      }
      if (lastTouchStart) {
        var directDx2 = Math.abs(pt.x - lastTouchStart.x);
        var directDy2 = Math.abs(pt.y - lastTouchStart.y);
        var directAge2 = Date.now() - (lastTouchStart.at || 0);
        var directLink2 = findMobileCardLink(event.target);
        if (directLink2 && directDx2 < TAP_MAX_DX && directDy2 < TAP_MAX_DY && directAge2 <= MAX_TAP_DURATION_MS && !lastTouchHadMove && !cardScrollTouch.moved) {
          if (invokeMobileCardLink(directLink2)) {
            showTapFeedback(directLink2);
            scheduleOverlayLifecycleGuard(360);
            event.preventDefault();
            event.stopPropagation();
            suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
            return;
          }
        }
      }
      var ctx = touchCtx;
      touchCtx = null;
      if (ctx) {
        var dy = Math.abs(pt.y - ctx.startY);
        var dx = Math.abs(pt.x - ctx.startX);
        var now = Date.now();
        var tapDuration = ctx.startedAt ? (now - ctx.startedAt) : 0;
        var verticalDominant = dy >= TAP_VERTICAL_BLOCK_PX && dy >= dx * 1.2;
        var recentScrollGuard = (now - lastScrollAt) <= SCROLL_BLOCK_MS
          && (ctx.hadMoveEvent || lastTouchHadMove);
        var shouldBlockTap = ctx.moved
          || dx >= TAP_MAX_DX
          || dy >= TAP_MAX_DY
          || verticalDominant
          || tapDuration > MAX_TAP_DURATION_MS
          || recentScrollGuard;
        if (!shouldBlockTap) {
          var handled = invokeBusinessAction(ctx.rule, ctx.target, event);
          if (handled) {
            scheduleOverlayLifecycleGuard(360);
            event.preventDefault();
            event.stopPropagation();
            suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
            return;
          }
        } else {
          suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
        }
      }
      if (isNavOwnedTap(event.target)) {
        suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
        return;
      }
      if (lastTouchStart) {
        var touchAge = Date.now() - (lastTouchStart.at || 0);
        if (touchAge > MAX_TAP_DURATION_MS) {
          suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
          return;
        }
        var dx = Math.abs(pt.x - lastTouchStart.x);
        var dy = Math.abs(pt.y - lastTouchStart.y);
        if (dx < TAP_MAX_DX && dy < TAP_MAX_DY && dy < TAP_VERTICAL_BLOCK_PX) {
          if ((Date.now() - lastScrollAt <= SCROLL_BLOCK_MS) && lastTouchHadMove) {
            suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
            return;
          }
          __cdRafBatch(function () {
            var ruleFromPoint = findRuleFromPoint(pt.x, pt.y) || findRuleFromPoint(lastTouchStart.x, lastTouchStart.y);
            var actionFromTarget = findDataActionElement(event.target);
            var actionFromPointEl = document.elementFromPoint(pt.x, pt.y) || document.elementFromPoint(lastTouchStart.x, lastTouchStart.y);
            var actionFromPoint = findDataActionElement(actionFromPointEl);
            var linkFromTarget = findMobileCardLink(event.target);
            var linkFromPoint = findMobileCardLink(actionFromPointEl);
            var elAtPoint = actionFromPointEl || document.body;
            return {
              ruleFromPoint: ruleFromPoint,
              actionEl: actionFromTarget || actionFromPoint,
              linkEl: linkFromTarget || linkFromPoint,
              elAtPoint: elAtPoint
            };
          }, function (state) {
            if (!state) return;
            if (state.ruleFromPoint) {
              var handledRule = invokeBusinessAction(state.ruleFromPoint, state.elAtPoint, event);
              if (handledRule) {
                scheduleOverlayLifecycleGuard(360);
                event.preventDefault();
                event.stopPropagation();
                suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
                return;
              }
            }
            if (invokeDataActionFallback(state.actionEl, event)) {
              scheduleOverlayLifecycleGuard(360);
              event.preventDefault();
              event.stopPropagation();
              suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
              return;
            }
            if (invokeMobileCardLink(state.linkEl)) {
              showTapFeedback(state.linkEl);
              scheduleOverlayLifecycleGuard(360);
              event.preventDefault();
              event.stopPropagation();
              suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
            }
          });
        }
      }
    }, { passive: false, capture: true });

    root.addEventListener('touchcancel', function () {
      cardScrollTouch.active = false;
      cardScrollTouch.moved = false;
      clearTapFeedback();
      markCardScrollLock(180);
    }, { passive: true, capture: true });

    root.addEventListener('click', function (event) {
      if (!shouldEnableMobileInteractionBridge()) return;
      if (!event || !event.target || !event.target.closest) return;
      if (handleCollectionToggleTap(event, { x: event.clientX, y: event.clientY }, 'click')) {
        event.__cdMobileBridgeHandled = true;
        suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
        return;
      }
      var rule = findRuleFromTarget(event.target);
      if (!rule) return;

      // Scroll/touch ghost click suppression must only apply to bridge-managed rules.
      var now = Date.now();
      var recentScrollGuard = ((now - lastScrollAt < SCROLL_BLOCK_MS) || shouldBlockCardTap())
        && (lastTouchHadMove || cardScrollTouch.moved);
      // 🔴 상세 팝업 CTA 가 쏘는 합성 클릭은 고스트 클릭이 아니다 — 예외로 둔다.
      // _onCta 는 타일에 data-pvw-cta-bypass 를 달고 즉시 tile.click() 하는데, 바로 직전
      // CTA 를 누른 손가락 터치가 suppressClickUntil 을 now+500ms 로 밀어 놓은 상태다.
      // 그래서 이 합성 클릭이 자기 터치가 만든 고스트로 오인돼 stopPropagation 으로 죽고,
      // 클릭이 타일까지 못 가 액션이 영영 실행되지 않는다(실측: 스크립트 로드 0회).
      // 증상은 유료 진입 타일을 눌러도 아무 반응 없음 — 이동도 에러도 없다.
      // 판정은 isSyntheticHandoffClick 하나로 모았다. 예전에는 이 조건이 여기에만 인라인으로
      // 있어서, 조건식이 같은 다른 게이트 두 벌에는 예외가 없는 채로 남아 있었다.
      if (!isSyntheticHandoffClick(event) && (now < suppressClickUntil || recentScrollGuard)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      var handled = invokeBusinessAction(rule, event.target, event);
      if (!handled) return;

      event.__cdMobileBridgeHandled = true;
      showTapFeedback(event.target);
      scheduleOverlayLifecycleGuard(360);
      event.preventDefault();
      event.stopPropagation();
    }, true);

    bindMobileDataActionFallback(root);
  }

  function init() {
    // This file is for mobile interaction safety; never install its global
    // observers or capture handlers for desktop and hybrid desktop input.
    if (!shouldEnableMobileInteractionBridge()) return;

    (function syncViewportHeight() {
      var root = document.documentElement;
      if (!root) return;
      /* 🔴 값이 바뀔 때만 쓴다. `--cd-safe-vh` 는 :root 커스텀 프로퍼티라 **쓸 때마다 문서 전체
         스타일이 무효화**되는데, 아래에서 visualViewport 의 **scroll** 에도 물려 있어 스크롤
         한 번마다 같은 값을 다시 쓰고 있었다. 스크롤 직후의 탭이 필드 INP 상위 3건의 상황이라
         정확히 그 자리에서 다음 탭의 입력 대기를 늘리고 있었다. */
      var lastSafeVh = '';
      function update() {
        var h = 0;
        if (window.visualViewport && Number(window.visualViewport.height) > 0) {
          h = window.visualViewport.height;
        } else if (Number(window.innerHeight) > 0) {
          h = window.innerHeight;
        }
        if (h <= 0) return;
        var next = h + 'px';
        if (next === lastSafeVh) return;
        lastSafeVh = next;
        root.style.setProperty('--cd-safe-vh', next);
      }
      update();
      window.addEventListener('resize', update, { passive: true });
      window.addEventListener('orientationchange', update, { passive: true });
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', update, { passive: true });
        window.visualViewport.addEventListener('scroll', update, { passive: true });
      }
    })();

    watchMobileMediaPerformance();

    // Global scroll state tracking.
    window.addEventListener('scroll', function() {
      lastScrollAt = Date.now();
      clearTapFeedback();
      markCardScrollLock(160);
    }, { passive: true });

    // 메인 화면 컬렉션 스크롤 감지 - 프리미엄, 동물&관상, 명상 컬렉션
    var collectionSelectors = [
      '#premiumVvipCollection',
      '#animalCollection',
      '#meditationCollection',
      '#inputPage .feature-card-grid',
      '#inputPage .feat-collection',
      '#inputPage .tarot-collection',
      '#inputPage .feat-collection__grid',
      '#inputPage .tarot-collection__grid',
      '.feat-collection__grid',
      '.tarot-collection__grid',
      '.fg-group--animal',
      '.fg-group--lovebible',
      '.fg-group--premium',
      '.fg-group--lovesim',
      '.fg-group--sibyl'
    ];

    function setupCollectionScrollListeners() {
      collectionSelectors.forEach(function(selector) {
        var containers = document.querySelectorAll(selector);
        containers.forEach(function(container) {
          if (container && !container.__cdScrollBound) {
            container.__cdScrollBound = true;
            container.addEventListener('scroll', function() {
              lastScrollAt = Date.now();
              markCardScrollLock(160);
            }, { passive: true });
          }
        });
      });

      // 메인 fg-group 섹션들의 스크롤 가능한 부모도 감지
      var scrollableParents = document.querySelectorAll('.fg-group, .tarot-collection, .feat-collection, .feature-card-grid, .feat-collection__grid, .tarot-collection__grid');
      scrollableParents.forEach(function(parent) {
        if (parent && !parent.__cdScrollBound) {
          parent.__cdScrollBound = true;
          parent.addEventListener('scroll', function() {
            lastScrollAt = Date.now();
            markCardScrollLock(160);
          }, { passive: true });
        }
      });

      bindDirectFeatureCardActions(document);
    }

    // 초기 설정 및 DOM 변경 시 재설정.
    // 🔴 body 전역(childList+subtree) 관찰이라 로딩 중 DOM 변경 배치마다 깨어나는데,
    //    setupCollectionScrollListeners 는 매번 6종 셀렉터로 문서 전체를 훑는다. 그대로 두면
    //    첫 로드의 카드 마운트 구간에서만 수십 번 반복돼 메인 스레드를 붙든다. 결과가 멱등이고
    //    (이미 바인딩된 노드는 __cdScrollBound 로 건너뛴다) 몇십 ms 늦어도 무해하므로 디바운스한다.
    setupCollectionScrollListeners();
    var scrollSetupTimer = 0;
    var scrollObserver = new MutationObserver(function() {
      if (scrollSetupTimer) return;
      scrollSetupTimer = window.setTimeout(function() {
        scrollSetupTimer = 0;
        setupCollectionScrollListeners();
      }, 150);
    });
    scrollObserver.observe(document.body, { childList: true, subtree: true });

    injectTouchActionStyle();
    try { createBulletproofDelegator(document); } catch (err) { console.error('[mobile-interaction-patch] touch bridge bind failed:', err); }
    bindMobileDataActionFallback(document);
    bindDirectFeatureCardActions(document);
    try { window.__cdMobileTouchBridgeReady = !!document.__cdTouchBridgeBound; } catch (_) {}
    reconcileOverlayLifecycle();
    window.addEventListener('pageshow', function() { scheduleOverlayLifecycleGuard(40); }, { passive: true });
    window.addEventListener('pagehide', function() { clearTapFeedback(); scheduleOverlayLifecycleGuard(40); }, { passive: true });
    window.addEventListener('popstate', function() { scheduleOverlayLifecycleGuard(40); }, { passive: true });
    window.addEventListener('hashchange', function() { scheduleOverlayLifecycleGuard(40); }, { passive: true });
    window.addEventListener('code-destiny:feature-tap', function() { scheduleOverlayLifecycleGuard(360); }, { passive: true });
    document.addEventListener('visibilitychange', function() {
      clearTapFeedback();
      scheduleOverlayLifecycleGuard(40);
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  // 유료 게이트 통과 후 호출되는 함수 - 영국 홍차점 페이지 이동
  window.openRoyalTeaOracle = function() {
    window.location.href = '/royal-tea-oracle.html';
  };

  // 기본 베다점 기능 - 프로필 데이터 전달 및 페이지 이동
  window.navigateToVedic = function(profileArg) {
    var loadToken = beginFeatureLoading('navigateToVedic', { minMs: 650, maxMs: 9000 });
    try {
      var profile = profileArg || null;
      // 프로필이 없으면 저장소에서 읽기 시도
      if (!profile && typeof window._readProfileFromStorage === 'function') {
        profile = window._readProfileFromStorage();
      }
      // 정본 프로필 카드 브리지 우선 확인
      if (!profile && typeof window.__cdGetCurrentDestinyProfile === 'function') {
        try {
          var bridged = window.__cdGetCurrentDestinyProfile();
          if (bridged && bridged.birth) profile = bridged;
        } catch (_) {}
      }
      if (!profile && typeof localStorage !== 'undefined') {
        try {
          var canonical = JSON.parse(localStorage.getItem('FORTUNE_APP_USER_PROFILE') || 'null');
          if (canonical && canonical.birth) profile = canonical;
        } catch (_) {}
      }
      // localStorage에서도 확인
      if (!profile && typeof localStorage !== 'undefined') {
        try {
          var saved = localStorage.getItem('FORTUNE_PROFILE_DATA');
          if (saved) profile = JSON.parse(saved);
        } catch (_) {}
      }
      // 프로필이 있으면 Vedic 페이지로 전달할 형식으로 저장
      if (profile && profile.birth) {
        var vedicPayload = {
          id: profile.id || 'profile',
          name: profile.name || '',
          gender: profile.gender || 'M',
          birth: {
            year: profile.birth.year,
            month: profile.birth.month,
            day: profile.birth.day,
            hour: profile.birth.hour != null ? profile.birth.hour : 12,
            minute: profile.birth.minute != null ? profile.birth.minute : 0
          },
          location: {
            lat: profile.location && profile.location.lat != null ? profile.location.lat : 37.5665,
            lng: profile.location && profile.location.lng != null ? profile.location.lng : 126.978,
            tzOffset: profile.location && profile.location.tzOffset != null ? profile.location.tzOffset : 9,
            baseTzOffset: profile.location && profile.location.baseTzOffset != null ? profile.location.baseTzOffset : 9,
            label: profile.location && profile.location.label ? profile.location.label : mobileInteractionPatchText('locationSeoul')
          }
        };
        // /vedic-astrology.html에서 읽을 수 있도록 저장
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('FORTUNE_APP_VEDIC_PAYLOAD', JSON.stringify(vedicPayload));
        }
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('FORTUNE_APP_VEDIC_PAYLOAD', JSON.stringify(vedicPayload));
        }
        // URL 파라미터로도 전달 (백업)
        var vp = encodeURIComponent(JSON.stringify(vedicPayload));
        window.location.href = '/vedic-astrology.html?vp=' + vp;
        return;
      }
      // 프로필이 없으면 그냥 이동 (입력 페이지 표시)
      window.location.href = '/vedic-astrology.html';
    } catch (err) {
      console.error('[navigateToVedic] Error:', err);
      endFeatureLoading(loadToken);
      // 오류 발생 시에도 페이지 이동은 시도
      window.location.href = '/vedic-astrology.html';
    }
  };
})();
