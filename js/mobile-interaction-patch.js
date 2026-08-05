­r‡^Ñf¥–Ø¦{]¬yÊ'vÃ®¶›­(function () {
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
    ko: { locationSeoul: 'ëŒ€í•œë¯¼êµ­ (ì„œìš¸)' },
    en: { locationSeoul: 'South Korea (Seoul)' },
    ja: { locationSeoul: 'éŸ“å›½ï¼ˆã‚½ã‚¦ãƒ«ï¼‰' },
    zh: { locationSeoul: 'éŸ©å›½ï¼ˆé¦–å°”ï¼‰' }
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
    // ì£¼ì˜: ì—¬ê¸°ì„œ suppressClickUntil ì„ ë°€ì§€ ì•ŠëŠ”ë‹¤. ëª¨ë“  ìŠ¤í¬ë¡¤ ì´ë²¤íŠ¸ë§ˆë‹¤ í´ë¦­ ì–µì œì°½ì„
    // ì—°ì¥í•˜ë©´ í”Œë§/ìŠ¤í¬ë¡¤ ì§í›„ì˜ 'ì •ì§€ íƒ­'ì´ ê³ ìŠ¤íŠ¸ë¡œ ì˜¤ì¸ë¼ ì”¹íŒë‹¤. ì‹¤ì œ ìŠ¤í¬ë¡¤ ì œìŠ¤ì²˜ì˜
    // ê³ ìŠ¤íŠ¸ í´ë¦­ì€ move-gated recentScrollGuard(ë° shouldBlockCardTap=cardScrollLockUntil)ê°€
    // ê³„ì† ì°¨ë‹¨í•˜ë¯€ë¡œ ì•ˆì „í•˜ë‹¤.
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
        '.tarot-tile--animal-totem .tarot-tileÛ¶âÚ$z{-®éÜj×F–ÆS"ÒWfVçBçF&vWBæ6Æ÷6W7B‚u¶FF×F–ÆRÖÆö6²Ö¶W•ÒÅ¶FFÖ6ö–âÖ6÷7EÒr“°¢–b†vFUF–ÆS"bbvFUF–ÆS"ævWDGG&–'WFR‚vFF×grÖ'—72r’bbG—Vöbv–æF÷råö6D÷VåF–ÆU&Wf–WrÓÓÒvgVæ7F–öâr’°¢G'’°¢–b‡v–æF÷råö6D÷VåF–ÆU&Wf–Wr†vFUF–ÆS"’’°¢6†÷uFfVVF&6²†vFUF–ÆS"“°¢66†VGVÆT÷fW&Æ”Æ–fV7–6ÆTwV&Bƒ3c“°¢WfVçBç&WfVçDFVfVÇB‚“°¢WfVçBç7F÷&÷vF–öâ‚“°¢7W&W746Æ–6µVçF–ÂÒFFRææ÷r‚’²t„õ5Eô4Ä”4µô$Äô4µôÕ3°¢&WGW&ã°¢Ğ¢Ò6F6‚…ò’·Ğ¢Ğ¢Ğ¢–b†Æ7EF÷V6…7F'B’°¢f"F—&V7DGƒ"ÒÖF‚æ'2‡Bç‚ÒÆ7EF÷V6…7F'Bç‚“°¢f"F—&V7DG“"ÒÖF‚æ'2‡Bç’ÒÆ7EF÷V6…7F'Bç’“°¢f"F—&V7DvS"ÒFFRææ÷r‚’Ò†Æ7EF÷V6…7F'BæBÇÂ“°¢f"F—&V7DÆ–æ³"Òf–æDÖö&–ÆT6&DÆ–æ²†WfVçBçF&vWB“°¢–b†F—&V7DÆ–æ³"bbF—&V7DGƒ"ÂDôÔ…ôE‚bbF—&V7DG“"ÂDôÔ…ôE’bbF—&V7DvS"ÃÒÔ…õDôEU$D”ôåôÕ2bbÆ7EF÷V6„†DÖ÷fRbb6&E67&öÆÅF÷V6‚æÖ÷fVB’°¢–b†–çfö¶TÖö&–ÆT6&DÆ–æ²†F—&V7DÆ–æ³"’’°¢6†÷uFfVVF&6²†F—&V7DÆ–æ³"“°¢66†VGVÆT÷fW&Æ”Æ–fV7–6ÆTwV&Bƒ3c“°¢WfVçBç&WfVçDFVfVÇB‚“°¢WfVçBç7F÷&÷vF–öâ‚“°¢7W&W746Æ–6µVçF–ÂÒFFRææ÷r‚’²t„õ5Eô4Ä”4µô$Äô4µôÕ3°¢&WGW&ã°¢Ğ¢Ğ¢Ğ¢f"7G‚ÒF÷V6„7Gƒ°¢F÷V6„7G‚ÒçVÆÃ°¢–b†7G‚’°¢f"G’ÒÖF‚æ'2‡Bç’Ò7G‚ç7F'E’“°¢f"G‚ÒÖF‚æ'2‡Bç‚Ò7G‚ç7F'E‚“°¢f"æ÷rÒFFRææ÷r‚“°¢f"FGW&F–öâÒ7G‚ç7F'FVDBò†æ÷rÒ7G‚ç7F'FVDB’¢°¢f"fW'F–6ÄFöÖ–æçBÒG’ãÒDõdU%D”4Åô$Äô4µõ‚bbG’ãÒG‚¢ã#°¢f"&V6VçE67&öÆÄwV&BÒ†æ÷rÒÆ7E67&öÆÄB’ÃÒ45$ôÄÅô$Äô4µôÕ0¢bb†7G‚æ†DÖ÷fTWfVçBÇÂÆ7EF÷V6„†DÖ÷fR“°¢f"6†÷VÆD&Æö6µFÒ7G‚æÖ÷fV@¢ÇÂG‚ãÒDôÔ…ôE€¢ÇÂG’ãÒDôÔ…ôE¢ÇÂfW'F–6ÄFöÖ–æç@¢ÇÂFGW&F–öââÔ…õDôEU$D”ôåôÕ0¢ÇÂ&V6VçE67&öÆÄwV&C°¢–b‚6†÷VÆD&Æö6µF’°¢f"†æFÆVBÒ–çfö¶T'W6–æW747F–öâ†7G‚ç'VÆRÂ7G‚çF&vWBÂWfVçB“°¢–b††æFÆVB’°¢66†VGVÆT÷fW&Æ”Æ–fV7–6ÆTwV&Bƒ3c“°¢WfVçBç&WfVçDFVfVÇB‚“°¢WfVçBç7F÷&÷vF–öâ‚“°¢7W&W746Æ–6µVçF–ÂÒFFRææ÷r‚’²t„õ5Eô4Ä”4µô$Äô4µôÕ3°¢&WGW&ã°¢Ğ¢ÒVÇ6R°¢7W&W746Æ–6µVçF–ÂÒFFRææ÷r‚’²t„õ5Eô4Ä”4µô$Äô4µôÕ3°¢Ğ¢Ğ¢–b†—4æd÷væVEF†WfVçBçF&vWB’’°¢7W&W746Æ–6µVçF–ÂÒFFRææ÷r‚’²t„õ5Eô4Ä”4µô$Äô4µôÕ3°¢&WGW&ã°¢Ğ¢–b†Æ7EF÷V6…7F'B’°¢f"F÷V6„vRÒFFRææ÷r‚’Ò†Æ7EF÷V6…7F'BæBÇÂ“°¢–b‡F÷V6„vRâÔ…õDôEU$D”ôåôÕ2’°¢7W&W746Æ–6µVçF–ÂÒFFRææ÷r‚’²t„õ5Eô4Ä”4µô$Äô4µôÕ3°¢&WGW&ã°¢Ğ¢f"G‚ÒÖF‚æ'2‡Bç‚ÒÆ7EF÷V6…7F'Bç‚“°¢f"G’ÒÖF‚æ'2‡Bç’ÒÆ7EF÷V6…7F'Bç’“°¢–b†G‚ÂDôÔ…ôE‚bbG’ÂDôÔ…ôE’bbG’ÂDõdU%D”4Åô$Äô4µõ‚’°¢–b‚„FFRææ÷r‚’ÒÆ7E67&öÆÄBÃÒ45$ôÄÅô$Äô4µôÕ2’bbÆ7EF÷V6„†DÖ÷fR’°¢7W&W746Æ–6µVçF–ÂÒFFRææ÷r‚’²t„õ5Eô4Ä”4µô$Äô4µôÕ3°¢&WGW&ã°¢Ğ¢õö6E&d&F6‚†gVæ7F–öâ‚’°¢f"'VÆTg&öÕö–çBÒf–æE'VÆTg&öÕö–çB‡Bç‚ÂBç’’ÇÂf–æE'VÆTg&öÕö–çB†Æ7EF÷V6…7F'Bç‚ÂÆ7EF÷V6…7F'Bç’“°¢f"7F–öäg&öÕF&vWBÒf–æDFF7F–öäVÆVÖVçB†WfVçBçF&vWB“°¢f"7F–öäg&öÕö–çDVÂÒFö7VÖVçBæVÆVÖVçDg&öÕö–çB‡Bç‚ÂBç’’ÇÂFö7VÖVçBæVÆVÖVçDg&öÕö–çB†Æ7EF÷V6…7F'Bç‚ÂÆ7EF÷V6…7F'Bç’“°¢f"7F–öäg&öÕö–çBÒf–æDFF7F–öäVÆVÖVçB†7F–öäg&öÕö–çDVÂ“°¢f"Æ–æ´g&öÕF&vWBÒf–æDÖö&–ÆT6&DÆ–æ²†WfVçBçF&vWB“°¢f"Æ–æ´g&öÕö–çBÒf–æDÖö&–ÆT6&DÆ–æ²†7F–öäg&öÕö–çDVÂ“°¢f"VÄEö–çBÒ7F–öäg&öÕö–çDVÂÇÂFö7VÖVçBæ&öG“°¢&WGW&â°¢'VÆTg&öÕö–çC¢'VÆTg&öÕö–çBÀ¢7F–öäVÃ¢7F–öäg&öÕF&vWBÇÂ7F–öäg&öÕö–çBÀ¢Æ–æ´VÃ¢Æ–æ´g&öÕF&vWBÇÂÆ–æ´g&öÕö–çBÀ¢VÄEö–çC¢VÄEö–ç@¢Ó°¢ÒÂgVæ7F–öâ‡7FFR’°¢–b‚7FFR’&WGW&ã°¢–b‡7FFRç'VÆTg&öÕö–çB’°¢f"†æFÆVE'VÆRÒ–çfö¶T'W6–æW747F–öâ‡7FFRç'VÆTg&öÕö–çBÂ7FFRæVÄEö–çBÂWfVçB“°¢–b††æFÆVE'VÆR’°¢66†VGVÆT÷fW&Æ”Æ–fV7–6ÆTwV&Bƒ3c“°¢WfVçBç&WfVçDFVfVÇB‚“°¢WfVçBç7F÷&÷vF–öâ‚“°¢7W&W746Æ–6µVçF–ÂÒFFRææ÷r‚’²t„õ5Eô4Ä”4µô$Äô4µôÕ3°¢&WGW&ã°¢Ğ¢Ğ¢–b†–çfö¶TFF7F–öäfÆÆ&6²‡7FFRæ7F–öäVÂÂWfVçB’’°¢66†VGVÆT÷fW&Æ”Æ–fV7–6ÆTwV&Bƒ3c“°¢WfVçBç&WfVçDFVfVÇB‚“°¢WfVçBç7F÷&÷vF–öâ‚“°¢7W&W746Æ–6µVçF–ÂÒFFRææ÷r‚’²t„õ5Eô4Ä”4µô$Äô4µôÕ3°¢&WGW&ã°¢Ğ¢–b†–çfö¶TÖö&–ÆT6&DÆ–æ²‡7FFRæÆ–æ´VÂ’’°¢6†÷uFfVVF&6²‡7FFRæÆ–æ´VÂ“°¢66†VGVÆT÷fW&Æ”Æ–fV7–6ÆTwV&Bƒ3c“°¢WfVçBç&WfVçDFVfVÇB‚“°¢WfVçBç7F÷&÷vF–öâ‚“°¢7W&W746Æ–6µVçF–ÂÒFFRææ÷r‚’²t„õ5Eô4Ä”4µô$Äô4µôÕ3°¢Ğ¢Ò“°¢Ğ¢Ğ¢ÒÂ²76—fS¢fÇ6RÂ6GW&S¢G'VRÒ“° ¢&ö÷BæFDWfVçDÆ—7FVæW"‚wF÷V6†6æ6VÂrÂgVæ7F–öâ‚’°¢6&E67&öÆÅF÷V6‚æ7F—fRÒfÇ6S°¢6&E67&öÆÅF÷V6‚æÖ÷fVBÒfÇ6S°¢6ÆV%FfVVF&6²‚“°¢Ö&´6&E67&öÆÄÆö6²ƒƒ“°¢ÒÂ²76—fS¢G'VRÂ6GW&S¢G'VRÒ“° ¢&ö÷BæFDWfVçDÆ—7FVæW"‚v6Æ–6²rÂgVæ7F–öâ†WfVçB’°¢–b‚6†÷VÆDVæ&ÆTÖö&–ÆT–çFW&7F–öä'&–FvR‚’’&WGW&ã°¢–b‚WfVçBÇÂWfVçBçF&vWBÇÂWfVçBçF&vWBæ6Æ÷6W7B’&WGW&ã°¢–b††æFÆT6öÆÆV7F–öåFövvÆUF†WfVçBÂ²ƒ¢WfVçBæ6Æ–VçE‚Â“¢WfVçBæ6Æ–VçE’ÒÂv6Æ–6²r’’°¢WfVçBåõö6DÖö&–ÆT'&–FvT†æFÆVBÒG'VS°¢7W&W746Æ–6µVçF–ÂÒFFRææ÷r‚’²t„õ5Eô4Ä”4µô$Äô4µôÕ3°¢&WGW&ã°¢Ğ¢f"'VÆRÒf–æE'VÆTg&öÕF&vWB†WfVçBçF&vWB“°¢–b‚'VÆR’&WGW&ã° ¢òò67&öÆÂ÷F÷V6‚v†÷7B6Æ–6²7W&W76–öâ×W7BöæÇ’Ç’Fò'&–FvRÖÖævVB'VÆW2à¢f"æ÷rÒFFRææ÷r‚“°¢f"&V6VçE67&öÆÄwV&BÒ‚†æ÷rÒÆ7E67&öÆÄBÂ45$ôÄÅô$Äô4µôÕ2’ÇÂ6†÷VÆD&Æö6´6&EF‚’¢bb†Æ7EF÷V6„†DÖ÷fRÇÂ6&E67&öÆÅF÷V6‚æÖ÷fVB“°¢–b†æ÷rÂ7W&W746Æ–6µVçF–ÂÇÂ&V6VçE67&öÆÄwV&B’°¢WfVçBç&WfVçDFVfVÇB‚“°¢WfVçBç7F÷&÷vF–öâ‚“°¢&WGW&ã°¢Ğ ¢f"†æFÆVBÒ–çfö¶T'W6–æW747F–öâ‡'VÆRÂWfVçBçF&vWBÂWfVçB“°¢–b‚†æFÆVB’&WGW&ã° ¢WfVçBåõö6DÖö&–ÆT'&–FvT†æFÆVBÒG'VS°¢6†÷uFfVVF&6²†WfVçBçF&vWB“°¢66†VGVÆT÷fW&Æ”Æ–fV7–6ÆTwV&Bƒ3c“°¢WfVçBç&WfVçDFVfVÇB‚“°¢WfVçBç7F÷&÷vF–öâ‚“°¢ÒÂG'VR“° ¢&–æDÖö&–ÆTFF7F–öäfÆÆ&6²‡&ö÷B“°¢Ğ ¢gVæ7F–öâ–æ—B‚’°¢òòF†—2f–ÆR—2f÷"Öö&–ÆR–çFW&7F–öâ6fWG“²æWfW"–ç7FÆÂ—G2vÆö&À¢òòö'6W'fW'2÷"6GW&R†æFÆW'2f÷"FW6·F÷æB‡–'&–BFW6·F÷–çWBà¢–b‚6†÷VÆDVæ&ÆTÖö&–ÆT–çFW&7F–öä'&–FvR‚’’&WGW&ã° ¢†gVæ7F–öâ7–æ5f–Ww÷'D†V–v‡B‚’°¢f"&ö÷BÒFö7VÖVçBæFö7VÖVçDVÆVÖVçC°¢–b‚&ö÷B’&WGW&ã°¢gVæ7F–öâWFFR‚’°¢f"‚Ò°¢–b‡v–æF÷rçf—7VÅf–Ww÷'BbbçVÖ&W"‡v–æF÷rçf—7VÅf–Ww÷'Bæ†V–v‡B’â’°¢‚Òv–æF÷rçf—7VÅf–Ww÷'Bæ†V–v‡C°¢ÒVÇ6R–b„çVÖ&W"‡v–æF÷ræ–ææW$†V–v‡B’â’°¢‚Òv–æF÷ræ–ææW$†V–v‡C°¢Ğ¢–b†‚â’&ö÷Bç7G–ÆRç6WE&÷W'G’‚rÒÖ6B×6fR×f‚rÂ‚²w‚r“°¢Ğ¢WFFR‚“°¢v–æF÷ræFDWfVçDÆ—7FVæW"‚w&W6—¦RrÂWFFRÂ²76—fS¢G'VRÒ“°¢v–æF÷ræFDWfVçDÆ—7FVæW"‚v÷&–VçFF–öæ6†ævRrÂWFFRÂ²76—fS¢G'VRÒ“°¢–b‡v–æF÷rçf—7VÅf–Ww÷'B’°¢v–æF÷rçf—7VÅf–Ww÷'BæFDWfVçDÆ—7FVæW"‚w&W6—¦RrÂWFFRÂ²76—fS¢G'VRÒ“°¢v–æF÷rçf—7VÅf–Ww÷'BæFDWfVçDÆ—7FVæW"‚w67&öÆÂrÂWFFRÂ²76—fS¢G'VRÒ“°¢Ğ¢Ò’‚“° ¢vF6„Öö&–ÆTÖVF–W&f÷&Öæ6R‚“° ¢òòvÆö&Â67&öÆÂ7FFRG&6¶–ærà¢v–æF÷ræFDWfVçDÆ—7FVæW"‚w67&öÆÂrÂgVæ7F–öâ‚’°¢Æ7E67&öÆÄBÒFFRææ÷r‚“°¢6ÆV%FfVVF&6²‚“°¢Ö&´6&E67&öÆÄÆö6²ƒc“°¢ÒÂ²76—fS¢G'VRÒ“° ¢òòº™NÉÛ‚Ù™Nº›BËºÎºÈY‚ÈªNØÎºB«	ÊxÒÙHNºjÎºûÉxBÂ¸ùºËÂn«HÈ8Âº¨^È8ËºÎºÈY€¢f"6öÆÆV7F–öå6VÆV7F÷'2Ò°¢r7&VÖ—VÕgf—6öÆÆV7F–öârÀ¢r6æ–ÖÄ6öÆÆV7F–öârÀ¢r6ÖVF—FF–öä6öÆÆV7F–öârÀ¢r6–çWEvRæfVGW&RÖ6&BÖw&–BrÀ¢r6–çWEvRæfVBÖ6öÆÆV7F–öârÀ¢r6–çWEvRçF&÷BÖ6öÆÆV7F–öârÀ¢r6–çWEvRæfVBÖ6öÆÆV7F–öåõöw&–BrÀ¢r6–çWEvRçF&÷BÖ6öÆÆV7F–öåõöw&–BrÀ¢ræfVBÖ6öÆÆV7F–öåõöw&–BrÀ¢rçF&÷BÖ6öÆÆV7F–öåõöw&–BrÀ¢ræfrÖw&÷WÒÖæ–ÖÂrÀ¢ræfrÖw&÷WÒÖÆ÷fV&–&ÆRrÀ¢ræfrÖw&÷WÒ×&VÖ—VÒrÀ¢ræfrÖw&÷WÒÖÆ÷fW6–ÒrÀ¢ræfrÖw&÷WÒ×6–'–Âp¢Ó° ¢gVæ7F–öâ6WGW6öÆÆV7F–öå67&öÆÄÆ—7FVæW'2‚’°¢6öÆÆV7F–öå6VÆV7F÷'2æf÷$V6‚†gVæ7F–öâ‡6VÆV7F÷"’°¢f"6öçF–æW'2ÒFö7VÖVçBçVW'•6VÆV7F÷$ÆÂ‡6VÆV7F÷"“°¢6öçF–æW'2æf÷$V6‚†gVæ7F–öâ†6öçF–æW"’°¢–b†6öçF–æW"bb6öçF–æW"åõö6E67&öÆÄ&÷VæB’°¢6öçF–æW"åõö6E67&öÆÄ&÷VæBÒG'VS°¢6öçF–æW"æFDWfVçDÆ—7FVæW"‚w67&öÆÂrÂgVæ7F–öâ‚’°¢Æ7E67&öÆÄBÒFFRææ÷r‚“°¢Ö&´6&E67&öÆÄÆö6²ƒc“°¢ÒÂ²76—fS¢G'VRÒ“°¢Ğ¢Ò“°¢Ò“° ¢òòº™NÉÛ‚frÖw&÷WÈKÈY¹:NÉÙ‚ÈªNØÎºB«¸ª^ÙYÂ»hºª¸øB«	Êx ¢f"67&öÆÆ&ÆU&VçG2ÒFö7VÖVçBçVW'•6VÆV7F÷$ÆÂ‚ræfrÖw&÷WÂçF&÷BÖ6öÆÆV7F–öâÂæfVBÖ6öÆÆV7F–öâÂæfVGW&RÖ6&BÖw&–BÂæfVBÖ6öÆÆV7F–öåõöw&–BÂçF&÷BÖ6öÆÆV7F–öåõöw&–Br“°¢67&öÆÆ&ÆU&VçG2æf÷$V6‚†gVæ7F–öâ‡&VçB’°¢–b‡&VçBbb&VçBåõö6E67&öÆÄ&÷VæB’°¢&VçBåõö6E67&öÆÄ&÷VæBÒG'VS°¢&VçBæFDWfVçDÆ—7FVæW"‚w67&öÆÂrÂgVæ7F–öâ‚’°¢Æ7E67&öÆÄBÒFFRææ÷r‚“°¢Ö&´6&E67&öÆÄÆö6²ƒc“°¢ÒÂ²76—fS¢G'VRÒ“°¢Ğ¢Ò“° ¢&–æDF—&V7DfVGW&T6&D7F–öç2†Fö7VÖVçB“°¢Ğ ¢òòËH«‹ÈJNÊ	R»òDôÒ»8«+ÒÈ¹ÂÉêÎÈJNÊ	P¢6WGW6öÆÆV7F–öå67&öÆÄÆ—7FVæW'2‚“°¢f"67&öÆÄö'6W'fW"ÒæWr×WFF–öäö'6W'fW"†gVæ7F–öâ‚’°¢6WGW6öÆÆV7F–öå67&öÆÄÆ—7FVæW'2‚“°¢Ò“°¢67&öÆÄö'6W'fW"æö'6W'fR†Fö7VÖVçBæ&öG’Â²6†–ÆDÆ—7C¢G'VRÂ7V'G&VS¢G'VRÒ“° ¢–æ¦V7EF÷V6„7F–öå7G–ÆR‚“°¢G'’²7&VFT'VÆÆWG&öödFVÆVvF÷"†Fö7VÖVçB“²Ò6F6‚†W'"’²6öç6öÆRæW'&÷"‚u¶Öö&–ÆRÖ–çFW&7F–öâ×F6…ÒF÷V6‚'&–FvR&–æBf–ÆVC¢rÂW'"“²Ğ¢&–æDÖö&–ÆTFF7F–öäfÆÆ&6²†Fö7VÖVçB“°¢&–æDF—&V7DfVGW&T6&D7F–öç2†Fö7VÖVçB“°¢G'’²v–æF÷råõö6DÖö&–ÆUF÷V6„'&–FvU&VG’ÒFö7VÖVçBåõö6EF÷V6„'&–FvT&÷VæC²Ò6F6‚…ò’·Ğ¢&V6öæ6–ÆT÷fW&Æ”Æ–fV7–6ÆR‚“°¢v–æF÷ræFDWfVçDÆ—7FVæW"‚wvW6†÷rrÂgVæ7F–öâ‚’²66†VGVÆT÷fW&Æ”Æ–fV7–6ÆTwV&BƒC“²ÒÂ²76—fS¢G'VRÒ“°¢v–æF÷ræFDWfVçDÆ—7FVæW"‚wvV†–FRrÂgVæ7F–öâ‚’²6ÆV%FfVVF&6²‚“²66†VGVÆT÷fW&Æ”Æ–fV7–6ÆTwV&BƒC“²ÒÂ²76—fS¢G'VRÒ“°¢v–æF÷ræFDWfVçDÆ—7FVæW"‚w÷7FFRrÂgVæ7F–öâ‚’²66†VGVÆT÷fW&Æ”Æ–fV7–6ÆTwV&BƒC“²ÒÂ²76—fS¢G'VRÒ“°¢v–æF÷ræFDWfVçDÆ—7FVæW"‚v†6†6†ævRrÂgVæ7F–öâ‚’²66†VGVÆT÷fW&Æ”Æ–fV7–6ÆTwV&BƒC“²ÒÂ²76—fS¢G'VRÒ“°¢v–æF÷ræFDWfVçDÆ—7FVæW"‚v6öFRÖFW7F–ç“¦fVGW&R×FrÂgVæ7F–öâ‚’²66†VGVÆT÷fW&Æ”Æ–fV7–6ÆTwV&Bƒ3c“²ÒÂ²76—fS¢G'VRÒ“°¢Fö7VÖVçBæFDWfVçDÆ—7FVæW"‚wf—6–&–Æ—G–6†ævRrÂgVæ7F–öâ‚’°¢6ÆV%FfVVF&6²‚“°¢66†VGVÆT÷fW&Æ”Æ–fV7–6ÆTwV&BƒC“°¢ÒÂ²76—fS¢G'VRÒ“°¢Ğ ¢–b†Fö7VÖVçBç&VG•7FFRÓÓÒvÆöF–ærr’°¢Fö7VÖVçBæFDWfVçDÆ—7FVæW"‚tDôÔ6öçFVçDÆöFVBrÂ–æ—BÂ²öæ6S¢G'VRÒ“°¢ÒVÇ6R°¢–æ—B‚“°¢Ğ ¢òòÉÊº8Â«(ÎÉÛNØ«‚Øk^«;ÂÙ¸BÙ‹ËiÎ¹	¸©BÙZÈ‰‚ÒÉˆ«ZÒÙ˜ŞË
Ê	ØéÉÛNÊxÉÛN¸ù¢v–æF÷ræ÷Vå&÷–ÅFV÷&6ÆRÒgVæ7F–öâ‚’°¢v–æF÷ræÆö6F–öâæ‡&VbÒr÷&÷–Â×FVÖ÷&6ÆRæ‡FÖÂs°¢Ó° ¢òò«‹»;‚»*¸ºNÊ	«‹¸ªRÒÙHNºÎÙXB¸ÛÉÛNØKÊN¸ºÂ»òØéÉÛNÊxÉÛN¸ù¢v–æF÷rææf–vFUFõfVF–2ÒgVæ7F–öâ‡&öf–ÆT&r’°¢f"ÆöEFö¶VâÒ&Vv–äfVGW&TÆöF–ær‚væf–vFUFõfVF–2rÂ²Ö–ä×3¢cSÂÖ„×3¢“Ò“°¢G'’°¢f"&öf–ÆRÒ&öf–ÆT&rÇÂçVÆÃ°¢òòÙHNºÎÙXNÉÛBÉxnÉËÎº›BÊÉê^ÈhÎÉyÈIÂÉÛŞ«‹È¹Î¸ø@¢–b‚&öf–ÆRbbG—Vöbv–æF÷rå÷&VE&öf–ÆTg&öÕ7F÷&vRÓÓÒvgVæ7F–öâr’°¢&öf–ÆRÒv–æF÷rå÷&VE&öf–ÆTg&öÕ7F÷&vR‚“°¢Ğ¢òòÊ	^»;‚ÙHNºÎÙXBË›N¹9Â»ˆÎºjÎÊxÉ«ÈJÙ™^ÉÛ€¢–b‚&öf–ÆRbbG—Vöbv–æF÷råõö6DvWD7W'&VçDFW7F–ç•&öf–ÆRÓÓÒvgVæ7F–öâr’°¢G'’°¢f"'&–FvVBÒv–æF÷råõö6DvWD7W'&VçDFW7F–ç•&öf–ÆR‚“°¢–b†'&–FvVBbb'&–FvVBæ&—'F‚’&öf–ÆRÒ'&–FvVC°¢Ò6F6‚…ò’·Ğ¢Ğ¢–b‚&öf–ÆRbbG—VöbÆö6Å7F÷&vRÓÒwVæFVf–æVBr’°¢G'’°¢f"6æöæ–6ÂÒ¥4ôâç'6R†Æö6Å7F÷&vRævWD—FVÒ‚tdõ%ETäUôõU4U%õ$ôd”ÄRr’ÇÂvçVÆÂr“°¢–b†6æöæ–6Âbb6æöæ–6Âæ&—'F‚’&öf–ÆRÒ6æöæ–6Ã°¢Ò6F6‚…ò’·Ğ¢Ğ¢òòÆö6Å7F÷&v^ÉyÈIÎ¸øBÙ™^ÉÛ€¢–b‚&öf–ÆRbbG—VöbÆö6Å7F÷&vRÓÒwVæFVf–æVBr’°¢G'’°¢f"6fVBÒÆö6Å7F÷&vRævWD—FVÒ‚tdõ%ETäUõ$ôd”ÄUôDDr“°¢–b‡6fVB’&öf–ÆRÒ¥4ôâç'6R‡6fVB“°¢Ò6F6‚…ò’·Ğ¢Ğ¢òòÙHNºÎÙXNÉÛBÉèÉËÎº›BfVF–2ØéÉÛNÊxºÂÊN¸ºÎÙZÙ‰^È¹ŞÉËÎºÂÊÉêP¢–b‡&öf–ÆRbb&öf–ÆRæ&—'F‚’°¢f"fVF–5–ÆöBÒ°¢–C¢&öf–ÆRæ–BÇÂw&öf–ÆRrÀ¢æÖS¢&öf–ÆRææÖRÇÂrrÀ¢vVæFW#¢&öf–ÆRævVæFW"ÇÂtÒrÀ¢&—'Fƒ¢°¢–V#¢&öf–ÆRæ&—'F‚ç–V"À¢ÖöçFƒ¢&öf–ÆRæ&—'F‚æÖöçF‚À¢F“¢&öf–ÆRæ&—'F‚æF’À¢†÷W#¢&öf–ÆRæ&—'F‚æ†÷W"ÒçVÆÂò&öf–ÆRæ&—'F‚æ†÷W"¢"À¢Ö–çWFS¢&öf–ÆRæ&—'F‚æÖ–çWFRÒçVÆÂò&öf–ÆRæ&—'F‚æÖ–çWFR¢ ¢ÒÀ¢Æö6F–öã¢°¢ÆC¢&öf–ÆRæÆö6F–öâbb&öf–ÆRæÆö6F–öâæÆBÒçVÆÂò&öf–ÆRæÆö6F–öâæÆB¢3rãSccRÀ¢Ææs¢&öf–ÆRæÆö6F–öâbb&öf–ÆRæÆö6F–öâæÆærÒçVÆÂò&öf–ÆRæÆö6F–öâæÆær¢#bã“s‚À¢G¤öfg6WC¢&öf–ÆRæÆö6F–öâbb&öf–ÆRæÆö6F–öâçG¤öfg6WBÒçVÆÂò&öf–ÆRæÆö6F–öâçG¤öfg6WB¢’À¢&6UG¤öfg6WC¢&öf–ÆRæÆö6F–öâbb&öf–ÆRæÆö6F–öâæ&6UG¤öfg6WBÒçVÆÂò&öf–ÆRæÆö6F–öâæ&6UG¤öfg6WB¢’À¢Æ&VÃ¢&öf–ÆRæÆö6F–öâbb&öf–ÆRæÆö6F–öâæÆ&VÂò&öf–ÆRæÆö6F–öâæÆ&VÂ¢Öö&–ÆT–çFW&7F–öåF6…FW‡B‚vÆö6F–öå6V÷VÂr¢Ğ¢Ó°¢òò÷fVF–2Ö7G&öÆöw’æ‡FÖÎÉyÈIÂÉÛŞÉØBÈ‰‚Éè¸øNºÒÊÉêP¢–b‡G—VöbÆö6Å7F÷&vRÓÒwVæFVf–æVBr’°¢Æö6Å7F÷&vRç6WD—FVÒ‚tdõ%ETäUôõdTD”5õ”ÄôBrÂ¥4ôâç7G&–æv–g’‡fVF–5–ÆöB’“°¢Ğ¢–b‡G—Vöb6W76–öå7F÷&vRÓÒwVæFVf–æVBr’°¢6W76–öå7F÷&vRç6WD—FVÒ‚tdõ%ETäUôõdTD”5õ”ÄôBrÂ¥4ôâç7G&–æv–g’‡fVF–5–ÆöB’“°¢Ğ¢òòU$ÂØÈÎ¹ÛÎºûØKºÎ¸øBÊN¸ºÂ»ÉxR¢f"gÒVæ6öFUU$”6ö×öæVçB„¥4ôâç7G&–æv–g’‡fVF–5–ÆöB’“°¢v–æF÷ræÆö6F–öâæ‡&VbÒr÷fVF–2Ö7G&öÆöw’æ‡FÖÃ÷gÒr²g°¢&WGW&ã°¢Ğ¢òòÙHNºÎÙXNÉÛBÉxnÉËÎº›B«{¸:RÉÛN¸ù’Éè^º
RØéÉÛNÊxÙÎÈ¹Â¢v–æF÷ræÆö6F–öâæ‡&VbÒr÷fVF–2Ö7G&öÆöw’æ‡FÖÂs°¢Ò6F6‚†W'"’°¢6öç6öÆRæW'&÷"‚u¶æf–vFUFõfVF–5ÒW'&÷#¢rÂW'"“°¢VæDfVGW&TÆöF–ær†ÆöEFö¶Vâ“°¢òòÉŠNºY‚»	ÎÈ9ÒÈ¹ÎÉy¸øBØéÉÛNÊxÉÛN¸ùÉØÈ¹Î¸ø@¢v–æF÷ræÆö6F–öâæ‡&VbÒr÷fVF–2Ö7G&öÆöw’æ‡FÖÂs°¢Ğ¢Ó°§Ò’‚“° 