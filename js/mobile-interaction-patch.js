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
    ko: { locationSeoul: '??쒕?援?(?쒖슱)' },
    en: { locationSeoul: 'South Korea (Seoul)' },
    ja: { locationSeoul: '?볟쎖竊덀궫?╉꺂竊? },
    zh: { locationSeoul: '?⒴쎖竊덆쫿弱뷂펹' }
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
    // 二쇱쓽: ?ш린??suppressClickUntil ??諛吏 ?딅뒗?? 紐⑤뱺 ?ㅽ겕濡??대깽?몃쭏???대┃ ?듭젣李쎌쓣
    // ?곗옣?섎㈃ ?뚮쭅/?ㅽ겕濡?吏곹썑??'?뺤? ????怨좎뒪?몃줈 ?ㅼ씤???뱁엺?? ?ㅼ젣 ?ㅽ겕濡??쒖뒪泥섏쓽
    // 怨좎뒪???대┃? move-gated recentScrollGuard(諛?shouldBlockCardTap=cardScrollLockUntil)媛
    // 怨꾩냽 李⑤떒?섎?濡??덉쟾?섎떎.
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
        '.taro…16097 tokens truncated…en touchCtx delayed handling fails (minimal fallback). */
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
      if (event && event.target) {
        showTapFeedback(event.target);
        scheduleOverlayLifecycleGuard(260);
      }
      if (!event || !event.target || !event.target.closest) return;
      var rule = findRuleFromTarget(event.target);
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
      if (handleCollectionToggleTap(event, pt, 'pointer')) {
        event.__cdMobileBridgeHandled = true;
        suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
        return;
      }
      if (event.target && event.target.closest) {
        var gateTile2 = event.target.closest('[data-tile-lock-key],[data-coin-cost]');
        if (gateTile2 && !gateTile2.getAttribute('data-pvw-bypass') && typeof window._cdOpenTilePreview === 'function') {
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
      if (now < suppressClickUntil || recentScrollGuard) {
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
      function update() {
        var h = 0;
        if (window.visualViewport && Number(window.visualViewport.height) > 0) {
          h = window.visualViewport.height;
        } else if (Number(window.innerHeight) > 0) {
          h = window.innerHeight;
        }
        if (h > 0) root.style.setProperty('--cd-safe-vh', h + 'px');
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

    // 硫붿씤 ?붾㈃ 而щ젆???ㅽ겕濡?媛먯? - ?꾨━誘몄뾼, ?숇Ъ&愿?? 紐낆긽 而щ젆??    var collectionSelectors = [
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

      // 硫붿씤 fg-group ?뱀뀡?ㅼ쓽 ?ㅽ겕濡?媛?ν븳 遺紐⑤룄 媛먯?
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

    // 珥덇린 ?ㅼ젙 諛?DOM 蹂寃????ъ꽕??    setupCollectionScrollListeners();
    var scrollObserver = new MutationObserver(function() {
      setupCollectionScrollListeners();
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

  // ?좊즺 寃뚯씠???듦낵 ???몄텧?섎뒗 ?⑥닔 - ?곴뎅 ?띿감???섏씠吏 ?대룞
  window.openRoyalTeaOracle = function() {
    window.location.href = '/royal-tea-oracle.html';
  };

  // 湲곕낯 踰좊떎??湲곕뒫 - ?꾨줈???곗씠???꾨떖 諛??섏씠吏 ?대룞
  window.navigateToVedic = function(profileArg) {
    var loadToken = beginFeatureLoading('navigateToVedic', { minMs: 650, maxMs: 9000 });
    try {
      var profile = profileArg || null;
      // ?꾨줈?꾩씠 ?놁쑝硫???μ냼?먯꽌 ?쎄린 ?쒕룄
      if (!profile && typeof window._readProfileFromStorage === 'function') {
        profile = window._readProfileFromStorage();
      }
      // ?뺣낯 ?꾨줈??移대뱶 釉뚮━吏 ?곗꽑 ?뺤씤
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
      // localStorage?먯꽌???뺤씤
      if (!profile && typeof localStorage !== 'undefined') {
        try {
          var saved = localStorage.getItem('FORTUNE_PROFILE_DATA');
          if (saved) profile = JSON.parse(saved);
        } catch (_) {}
      }
      // ?꾨줈?꾩씠 ?덉쑝硫?Vedic ?섏씠吏濡??꾨떖???뺤떇?쇰줈 ???      if (profile && profile.birth) {
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
        // /vedic-astrology.html?먯꽌 ?쎌쓣 ???덈룄濡????        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('FORTUNE_APP_VEDIC_PAYLOAD', JSON.stringify(vedicPayload));
        }
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('FORTUNE_APP_VEDIC_PAYLOAD', JSON.stringify(vedicPayload));
        }
        // URL ?뚮씪誘명꽣濡쒕룄 ?꾨떖 (諛깆뾽)
        var vp = encodeURIComponent(JSON.stringify(vedicPayload));
        window.location.href = '/vedic-astrology.html?vp=' + vp;
        return;
      }
      // ?꾨줈?꾩씠 ?놁쑝硫?洹몃깷 ?대룞 (?낅젰 ?섏씠吏 ?쒖떆)
      window.location.href = '/vedic-astrology.html';
    } catch (err) {
      console.error('[navigateToVedic] Error:', err);
      endFeatureLoading(loadToken);
      // ?ㅻ쪟 諛쒖깮 ?쒖뿉???섏씠吏 ?대룞? ?쒕룄
      window.location.href = '/vedic-astrology.html';
    }
  };
})();
