(function () {
  'use strict';

  /* 모바???�치: direct tap only (스크롤/이동/롱터치 차단) */
  var TAP_MAX_DX = 8;
  var TAP_MAX_DY = 8;
  var TAP_MOVE_DETECT_PX = 2;
  var TAP_VERTICAL_BLOCK_PX = 6;
  var MAX_TAP_DURATION_MS = 500;
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

  function markCardScrollLock(durationMs) {
    var until = Date.now() + (durationMs || 220);
    if (until > cardScrollLockUntil) cardScrollLockUntil = until;
    suppressClickUntil = Math.max(suppressClickUntil, until);
  }

  function isCardScrollTarget(node) {
    return !!(node && node.closest && node.closest(CARD_SCROLL_SELECTORS));
  }

  function shouldBlockCardTap() {
    return Date.now() < cardScrollLockUntil;
  }

  function isDesktopNoTouch() {
    try {
      var hasMatchMedia = typeof window.matchMedia === 'function';
      var finePointer = hasMatchMedia && (
        window.matchMedia('(pointer:fine)').matches ||
        window.matchMedia('(any-pointer:fine)').matches ||
        window.matchMedia('(hover:hover)').matches
      );
      var coarsePointer = hasMatchMedia && (
        window.matchMedia('(pointer:coarse)').matches ||
        window.matchMedia('(any-pointer:coarse)').matches
      );
      var maxTouchPoints = (navigator && typeof navigator.maxTouchPoints === 'number')
        ? navigator.maxTouchPoints
        : 0;
      var hasTouchCapability = coarsePointer || maxTouchPoints > 0;
      return !!(finePointer && !hasTouchCapability);
    } catch (_) {
      return false;
    }
  }

  /* INP: index-inline-runtime / uiBindings �??�일 ??무거??data-action ?�기 ?�출???�음 ?�스?�로 */
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
      cardSelector: '.feature-card--face',
      targetSelector: [
        '[data-action="openPhysiognomyApp"]',
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
      cardSelector: '.tarot-tile--royal-tea',
      targetSelector: [
        '[data-action="openRoyalTeaOracle"]',
        '.tarot-tile--royal-tea',
        '.tarot-tile--royal-tea .tarot-tile__img-wrap',
        '.tarot-tile--royal-tea .tarot-tile__img',
        '.tarot-tile--royal-tea .tarot-tile__badge',
        '.tarot-tile--royal-tea .tarot-tile__title',
        '.tarot-tile--royal-tea .tarot-tile__desc',
        '.tarot-tile--royal-tea .tarot-tile__body'
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

  function findRuleFromTarget(origin) {
    if (!origin || typeof origin.closest !== 'function') return null;
    for (var i = 0; i < RULES.length; i += 1) {
      if (origin.closest(RULES[i].targetSelector)) return RULES[i];
    }
    return null;
  }

  /* 모바?? touchend ??event.target??부?�확??경우 elementFromPoint�??�제 ?�치 ?�치???�소 ?�인 */
  function findRuleFromPoint(x, y) {
    if (!document.elementFromPoint || !Number.isFinite(x) || !Number.isFinite(y)) return null;
    var el = document.elementFromPoint(x, y);
    return el ? findRuleFromTarget(el) : null;
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

  function shouldSkipDuplicateAction(action) {
    if (!action) return false;
    var now = Date.now();
    if (lastActionInvoke.action === action && (now - lastActionInvoke.at) < ACTION_DEDUPE_MS) {
      return true;
    }
    lastActionInvoke = { action: action, at: now };
    return false;
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
    openDreamModal: '꿈 해몽 분석 화면을 준비하고 있습니다.',
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
    loadScript('/js/mobile-backstack-navigation.js?v=build-8cfc753e0598').catch(function(err) {
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
    openAnimalTotemModal: [
      'js/services/animal-totem-content-engine.js',
      'js/animal-totem-experience.js'
    ],
    openHwatuModal: ['HwatuFortune.js'],
    // NOTE: uiBindings??`js/...` 경로??용?니?? 모바??patch???일 경로?맞춰
    // ???에??최신 ?크립트??확??로드?도??니??
    openTarotLoveModal: ['js/tarot-love-experience.js?v=build-8cfc753e0598'],
    openTarotReunionModal: ['js/tarot-reunion-experience.js?v=build-8cfc753e0598'],
    openTarotSelfEsteemModal: ['js/tarot-self-esteem-experience.js?v=build-8cfc753e0598'],

    openTarotYearFortuneModal: ['js/tarot-year-fortune-experience.js?v=build-8cfc753e0598'],
    openDreamModal: ['lib/ai-engine.js', 'js/dream-ledger.js'],
    openPsychoDreamModal: ['js/psycho-dream-analyzer-freuds-study.js'],
    openKemetModal: ['js/oracle-kcg.js'],
    openRoyalTeaOracle: [],
    openOlympusOracleModal: ['js/olympus-oracle.js'],
    gotoNamingPremium: [],
    openSibylModal: ['js/sibyl-system.js?v=build-8cfc753e0598']
  };

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
    ensureMobileBackstackRuntime();
    try {
      if (window.__cdMobileNav && typeof window.__cdMobileNav.onActionInvoke === 'function') {
        window.__cdMobileNav.onActionInvoke(rule.action, origin || null);
      }
    } catch (_) {}
    // Preview CTA?�서 data-pvw-bypass�??�클�?��??경우???�상 ?�속 ?�로?�이므�?    // dedupe??걸리지 ?�게 ?�야 ?�리미엄 ?�션??무반?�으�??�모?��? ?�는??
    var _fromPreviewBypass = false;
    if (origin && typeof origin.closest === 'function') {
      _fromPreviewBypass = !!origin.closest('[data-pvw-bypass]');
    }
    if (!_fromPreviewBypass && shouldSkipDuplicateAction(rule.action)) return true;

    // ?�?� 코인/?�금 게이??체크 ?�?�
    // ?�치 ?�벤?��? 코인/?�금 게이?��? ?�회?��? ?�도�? ?�당 ?�성??가�??�?��?
    // ?�리�??�널???�임???�상?�인 게이???�름??거치�??�다.
    // ?? pvw-bypass ?�성???�는 경우(Preview CTA?�서 직접 ?�릭)??게이??건너?�
    var _coinGateTile = null;
    if (origin && typeof origin.closest === 'function') {
      _coinGateTile = origin.closest('[data-tile-lock-key],[data-coin-cost]');
    }
    // pvw-bypass ?�정???�?��? ?��? Preview CTA�??�과??것이므�?게이???�킵
    if (_coinGateTile && _coinGateTile.getAttribute('data-pvw-bypass')) _coinGateTile = null;
    if (!_coinGateTile) {
      _coinGateTile = document.querySelector(
        '[data-action="' + rule.action + '"][data-tile-lock-key],' +
        '[data-action="' + rule.action + '"][data-coin-cost]'
      );
      // fallback?�로 찾�? ?�?�도 pvw-bypass 체크
      if (_coinGateTile && _coinGateTile.getAttribute('data-pvw-bypass')) _coinGateTile = null;
    }
    if (_coinGateTile) {
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
    // ?�?� 코인/?�금 게이??체크 ???�?�

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

    /* lazy-load: ?�크립트 미로????로드 ???�호�?*/
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

    /* 모바?? ?�기 ?�행 ??브라?��?가 ?�치 처리 �?UI ?�데?�트�?막아 ?�면 멈춤 발생. rAF�?지??*/
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
    if (!action || !FEATURE_ACTION_SET[action]) return null;
    return el;
  }

  function invokeDataActionFallback(actionEl, sourceEvent) {
    if (!actionEl) return false;
    var action = actionEl.getAttribute('data-action');
    if (!action) return false;
    var actionArgsRaw = actionEl.getAttribute('data-action-args') || '';
    if (shouldSkipDuplicateAction(action + '::' + actionArgsRaw)) return true;

    var hasActionConfig = !!actionArgsRaw
      || !!actionEl.getAttribute('data-action-pass-self')
      || actionEl.getAttribute('data-action-pass-event') === '1';

    // Generic data-action route must preserve args/self/event config.
    if (hasActionConfig) {
      if (invokeConfiguredDataAction(actionEl, sourceEvent)) return true;
    } else if (invokeBusinessAction({ action: action }, actionEl, sourceEvent)) {
      return true;
    }

    // 코인 게이트가 필요한 액션은 전역 핸들러로 전달한다.
    // ?�역 ?�릭 ?�들?�로 ?�겨 Preview/게이?��? ?�상 경유?�킨??
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
      '.tarot-tile--saju-picture .tarot-tile__img-wrap, .tarot-tile--saju-picture .tarot-tile__img, .tarot-tile--saju-picture .tarot-tile__badge, .tarot-tile--saju-picture .tarot-tile__body, .tarot-tile--saju-picture .tarot-tile__title, .tarot-tile--saju-picture .tarot-tile__desc,',
      '.tarot-tile--bloom .tarot-tile__img-wrap, .tarot-tile--bloom .tarot-tile__img, .tarot-tile--bloom .tarot-tile__badge, .tarot-tile--bloom .tarot-tile__body, .tarot-tile--bloom .tarot-tile__title, .tarot-tile--bloom .tarot-tile__desc,',
      '.tarot-tile--astro-flower .tarot-tile__img-wrap, .tarot-tile--astro-flower .tarot-tile__img, .tarot-tile--astro-flower .tarot-tile__badge, .tarot-tile--astro-flower .tarot-tile__body, .tarot-tile--astro-flower .tarot-tile__title, .tarot-tile--astro-flower .tarot-tile__desc,',
      '.tarot-tile--jami-flower .tarot-tile__img-wrap, .tarot-tile--jami-flower .tarot-tile__img, .tarot-tile--jami-flower .tarot-tile__badge, .tarot-tile--jami-flower .tarot-tile__body, .tarot-tile--jami-flower .tarot-tile__title, .tarot-tile--jami-flower .tarot-tile__desc,',
      '.tarot-tile--sukuyo-fl .tarot-tile__img-wrap, .tarot-tile--sukuyo-fl .tarot-tile__img, .tarot-tile--sukuyo-fl .tarot-tile__badge, .tarot-tile--sukuyo-fl .tarot-tile__body, .tarot-tile--sukuyo-fl .tarot-tile__title, .tarot-tile--sukuyo-fl .tarot-tile__desc,',
      '.tarot-tile--meditation .tarot-tile__img-wrap, .tarot-tile--meditation .tarot-tile__img, .tarot-tile--meditation .tarot-tile__badge, .tarot-tile--meditation .tarot-tile__body, .tarot-tile--meditation .tarot-tile__title, .tarot-tile--meditation .tarot-tile__desc,',
      '[data-action="openPhysiognomyApp"], [data-action="openHwatuModal"], [data-action="openKemetModal"], [data-action="openDreamModal"], [data-action="openPsychoDreamModal"], [data-action="openTarotHealingModal"], [data-action="openTarotYearFortuneModal"], [data-action="openTarotLoveModal"], [data-action="openTarotSelfEsteemModal"], [data-action="openTarotReunionModal"], [data-action="openRoyalTeaOracle"],',
      '[data-action="openAnimalTotemModal"], [data-action="openSajuAnimalPage"], [data-action="openDestinyFlowerStudio"], [data-action="openAstrologyFlowerStudio"], [data-action="openJamidusuFlowerStudio"], [data-action="openSukuyoFlowerStudio"], [data-action="openNevilleMeditationPage"], [data-action="navigateToVedic"], [data-action="openOlympusOracleModal"], [data-action="openGeomancyOracle"],',
      '/* ?�생??�?�??�빌???�스???�크�?최적??*/',
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
      '.feature-card-grid, .feat-collection, .tarot-collection, .feat-collection__grid, .tarot-collection__grid {',
      '  touch-action: pan-y;',
      '}',
      ':root {',
      '  --cd-safe-vh: 100vh;',
      '}',
      '@supports (height: 100dvh) {',
      '  :root { --cd-safe-vh: 100dvh; }',
      '}',
      '#kemetOracleOverlay, #psychoDreamModalOverlay, #tarotHealingOverlay, #tarotLoveOverlay, #tarotReunionOverlay, #tarotYearFortuneOverlay, #dreamModalOverlay {',
      '  min-height: var(--cd-safe-vh);',
      '  max-height: var(--cd-safe-vh);',
      '  overflow-x: hidden;',
      '  -webkit-overflow-scrolling: touch;',
      '}'
    ].join('\n');

    var style = document.createElement('style');
    style.id = 'cd-mobile-touch-bridge-style';
    style.textContent = css;
    document.head.appendChild(style);
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
      if (!event || !event.target || !event.target.closest) return;
      var rule = findRuleFromTarget(event.target);
      if (!rule) return;
      if (!pt) return;
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
      }
      if (dx > TAP_MAX_DX || dy > TAP_MAX_DY || (dy >= TAP_VERTICAL_BLOCK_PX && dy >= dx)) {
        touchCtx.moved = true;
        if (cardScrollTouch.active) {
          cardScrollTouch.moved = true;
          markCardScrollLock(240);
        }
      }
    }, { passive: true, capture: true });

    root.addEventListener('touchend', function (event) {
      var pt = getPoint(event);
      if (!pt) return;

      var ctx = touchCtx;
      touchCtx = null;

      if (ctx) {
        var dy = Math.abs(pt.y - ctx.startY);
        var dx = Math.abs(pt.x - ctx.startX);
        var now = Date.now();
        var tapDuration = ctx.startedAt ? (now - ctx.startedAt) : 0;
        var verticalDominant = dy >= TAP_VERTICAL_BLOCK_PX && dy >= dx;
        var shouldBlockTap = ctx.moved
          || ctx.hadMoveEvent
          || dx >= TAP_MAX_DX
          || dy >= TAP_MAX_DY
          || verticalDominant
          || tapDuration > MAX_TAP_DURATION_MS
          || (now - lastScrollAt) <= SCROLL_BLOCK_MS
          || shouldBlockCardTap();

        if (!shouldBlockTap) {
          var handled = invokeBusinessAction(ctx.rule, ctx.target, event);
          if (handled) {
            event.preventDefault();
            event.stopPropagation();
            suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
            return;
          }
        } else {
          suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
        }
      }

      /* 모바???�백: touchCtx ?�거??처리 ?�패 ??elementFromPoint�??�치 ?�치???�소�??�인 (?�니멀 ?�템 ?? */
      if (lastTouchStart) {
        var touchAge = Date.now() - (lastTouchStart.at || 0);
        if (touchAge > MAX_TAP_DURATION_MS || lastTouchHadMove) {
          suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
          return;
        }
        var dx = Math.abs(pt.x - lastTouchStart.x);
        var dy = Math.abs(pt.y - lastTouchStart.y);
        if (dx < TAP_MAX_DX && dy < TAP_MAX_DY && dy < TAP_VERTICAL_BLOCK_PX) {
          if (Date.now() - lastScrollAt <= SCROLL_BLOCK_MS) {
            suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
            return;
          }
          __cdRafBatch(function () {
            var ruleFromPoint = findRuleFromPoint(pt.x, pt.y) || findRuleFromPoint(lastTouchStart.x, lastTouchStart.y);
            var actionFromTarget = findDataActionElement(event.target);
            var actionFromPointEl = document.elementFromPoint(pt.x, pt.y) || document.elementFromPoint(lastTouchStart.x, lastTouchStart.y);
            var actionFromPoint = findDataActionElement(actionFromPointEl);
            var elAtPoint = actionFromPointEl || document.body;
            return {
              ruleFromPoint: ruleFromPoint,
              actionEl: actionFromTarget || actionFromPoint,
              elAtPoint: elAtPoint
            };
          }, function (state) {
            if (!state) return;
            if (state.ruleFromPoint) {
              var handledRule = invokeBusinessAction(state.ruleFromPoint, state.elAtPoint, event);
              if (handledRule) {
                event.preventDefault();
                event.stopPropagation();
                suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
                return;
              }
            }
            if (invokeDataActionFallback(state.actionEl, event)) {
              event.preventDefault();
              event.stopPropagation();
              suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
            }
          });
        }
      }
    }, { passive: true, capture: true });

    /* pointer ?�벤???�백: ?��? 모바??브라?��??�서 touch ?�??pointer ?�용 */
    root.addEventListener('pointerdown', function (event) {
      if (event.pointerType !== 'touch') return;
      var pt = getPoint(event);
      if (pt) {
        lastTouchStart = { x: pt.x, y: pt.y, at: Date.now() };
        lastTouchHadMove = false;
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
      }
      if (dx > TAP_MAX_DX || dy > TAP_MAX_DY || (dy >= TAP_VERTICAL_BLOCK_PX && dy >= dx)) {
        touchCtx.moved = true;
      }
    }, { passive: true, capture: true });

    root.addEventListener('pointerup', function (event) {
      if (event.pointerType !== 'touch') return;
      var pt = getPoint(event);
      if (!pt) return;
      var ctx = touchCtx;
      touchCtx = null;
      if (ctx) {
        var dy = Math.abs(pt.y - ctx.startY);
        var dx = Math.abs(pt.x - ctx.startX);
        var now = Date.now();
        var tapDuration = ctx.startedAt ? (now - ctx.startedAt) : 0;
        var verticalDominant = dy >= TAP_VERTICAL_BLOCK_PX && dy >= dx;
        var shouldBlockTap = ctx.moved
          || ctx.hadMoveEvent
          || dx >= TAP_MAX_DX
          || dy >= TAP_MAX_DY
          || verticalDominant
          || tapDuration > MAX_TAP_DURATION_MS
          || (now - lastScrollAt) <= SCROLL_BLOCK_MS;
        if (!shouldBlockTap) {
          var handled = invokeBusinessAction(ctx.rule, ctx.target, event);
          if (handled) {
            event.preventDefault();
            event.stopPropagation();
            suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
            return;
          }
        } else {
          suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
        }
      }
      if (lastTouchStart) {
        var touchAge = Date.now() - (lastTouchStart.at || 0);
        if (touchAge > MAX_TAP_DURATION_MS || lastTouchHadMove) {
          suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
          return;
        }
        var dx = Math.abs(pt.x - lastTouchStart.x);
        var dy = Math.abs(pt.y - lastTouchStart.y);
        if (dx < TAP_MAX_DX && dy < TAP_MAX_DY && dy < TAP_VERTICAL_BLOCK_PX) {
          if (Date.now() - lastScrollAt <= SCROLL_BLOCK_MS) {
            suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
            return;
          }
          __cdRafBatch(function () {
            var ruleFromPoint = findRuleFromPoint(pt.x, pt.y) || findRuleFromPoint(lastTouchStart.x, lastTouchStart.y);
            var actionFromTarget = findDataActionElement(event.target);
            var actionFromPointEl = document.elementFromPoint(pt.x, pt.y) || document.elementFromPoint(lastTouchStart.x, lastTouchStart.y);
            var actionFromPoint = findDataActionElement(actionFromPointEl);
            var elAtPoint = actionFromPointEl || document.body;
            return {
              ruleFromPoint: ruleFromPoint,
              actionEl: actionFromTarget || actionFromPoint,
              elAtPoint: elAtPoint
            };
          }, function (state) {
            if (!state) return;
            if (state.ruleFromPoint) {
              var handledRule = invokeBusinessAction(state.ruleFromPoint, state.elAtPoint, event);
              if (handledRule) {
                event.preventDefault();
                event.stopPropagation();
                suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
                return;
              }
            }
            if (invokeDataActionFallback(state.actionEl, event)) {
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
      markCardScrollLock(180);
    }, { passive: true, capture: true });

    root.addEventListener('click', function (event) {
      if (!event || !event.target || !event.target.closest) return;
      var rule = findRuleFromTarget(event.target);
      if (!rule) return;

      // Scroll/touch ghost click suppression must only apply to bridge-managed rules.
      var now = Date.now();
      if (now < suppressClickUntil || (now - lastScrollAt < SCROLL_BLOCK_MS) || shouldBlockCardTap()) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      var handled = invokeBusinessAction(rule, event.target, event);
      if (!handled) return;

      event.preventDefault();
      event.stopPropagation();
    }, true);
  }

  function init() {
    // This file is for mobile interaction safety; skip heavy observers/listeners on desktop no-touch.
    if (isDesktopNoTouch()) return;

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

    // 글로벌 ?�크�??�태 추적
    window.addEventListener('scroll', function() {
      lastScrollAt = Date.now();
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
    }

    // 초기 설정 및 DOM 변경 시 재설정
    setupCollectionScrollListeners();
    var scrollObserver = new MutationObserver(function() {
      setupCollectionScrollListeners();
    });
    scrollObserver.observe(document.body, { childList: true, subtree: true });

    injectTouchActionStyle();
    createBulletproofDelegator(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  // 코인 게이트 통과 후 호출되는 함수 - 영국 홍차점 페이지 이동
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
            label: profile.location && profile.location.label ? profile.location.label : '대한민국 (서울)'
          }
        };
        // vedic-astrology.html에서 읽을 수 있도록 저장
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
