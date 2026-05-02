(function () {
  'use strict';

  /* Î™®Î∞î???∞Ïπò: ?êÍ???ÎØ∏ÏÑ∏ ?ÄÏßÅÏûÑ ?àÏö© (10pxÎ°?Ï∂ïÏÜå?òÏó¨ ?§ÌÅ¨Î°??§Îèô??Î∞©Ï?) */
  var TAP_MAX_DX = 10;
  var TAP_MAX_DY = 10;
  var GHOST_CLICK_BLOCK_MS = 500;
  var ACTION_DEDUPE_MS = 650;
  var SCROLL_BLOCK_MS = 250; // ?§ÌÅ¨Î°?ÏßÅÌõÑ ?¥Î¶≠ Ï∞®Îã® ?úÍ∞Ñ
  var suppressClickUntil = 0;
  var lastScrollAt = 0;
  var touchCtx = null;
  var lastTouchStart = null;
  var lastActionInvoke = { action: '', at: 0 };

  /* INP: index-inline-runtime / uiBindings Í≥??ôÏùº ??Î¨¥Í±∞??data-action ?ôÍ∏∞ ?∏Ï∂ú???§Ïùå ?úÏä§?¨Î°ú */
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
      action: 'gotoZiweiPremium',
      cardSelector: '.prem-card--ziwei',
      targetSelector: [
        '[data-action="gotoZiweiPremium"]',
        '.prem-card--ziwei',
        '.prem-card--ziwei img'
      ].join(',')
    },
    {
      action: 'gotoAstrologyPremium',
      cardSelector: '.prem-card--astro',
      targetSelector: [
        '[data-action="gotoAstrologyPremium"]',
        '.prem-card--astro',
        '.prem-card--astro img'
      ].join(',')
    },
    {
      action: 'gotoSukuyoPremium',
      cardSelector: '.prem-card--sukuyo',
      targetSelector: [
        '[data-action="gotoSukuyoPremium"]',
        '.prem-card--sukuyo',
        '.prem-card--sukuyo img'
      ].join(',')
    },
    {
      action: 'gotoVedicPremium',
      cardSelector: '.prem-card--veda',
      targetSelector: [
        '[data-action="gotoVedicPremium"]',
        '.prem-card--veda',
        '.prem-card--veda img'
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

  /* Î™®Î∞î?? touchend ??event.target??Î∂Ä?ïÌôï??Í≤ΩÏö∞ elementFromPointÎ°??§Ï†ú ?∞Ïπò ?ÑÏπò???îÏÜå ?ïÏù∏ */
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

  function invokeConfiguredDataAction(actionEl, sourceEvent) {
    if (!actionEl) return false;
    var action = actionEl.getAttribute('data-action');
    if (!action) return false;
    var fn = window[action];
    if (typeof fn !== 'function') return false;

    var args = parseActionArgs(actionEl.getAttribute('data-action-args'));
    var passSelfMode = actionEl.getAttribute('data-action-pass-self');
    var passEvent = actionEl.getAttribute('data-action-pass-event') === '1';

    function runInvoke() {
      try {
        if (passSelfMode === 'append') {
          fn.apply(window, args.concat([actionEl]));
        } else if (passSelfMode === '1' || passSelfMode === 'prepend') {
          fn.apply(window, [actionEl].concat(args));
        } else if (passEvent) {
          fn.call(window, sourceEvent);
        } else if (args.length) {
          fn.apply(window, args);
        } else {
          fn.call(window);
        }
        return true;
      } catch (err) {
        console.error('[mobile-interaction-patch] data-action invoke failed:', action, err);
        return false;
      }
    }

    if (__CD_DEFER_INP_ACTIONS[action]) {
      setTimeout(runInvoke, 0);
      return true;
    }
    return runInvoke();
  }

  var LAZY_LOAD_ACTIONS = {
    openAnimalTotemModal: [
      'js/services/animal-totem-content-engine.js',
      'js/animal-totem-experience.js'
    ],
    openHwatuModal: ['HwatuFortune.js'],
    // NOTE: uiBindings??`js/...` Í≤ΩÎ°úÎ•??¨Ïö©?©Îãà?? Î™®Î∞î??patch???ôÏùº Í≤ΩÎ°úÎ°?ÎßûÏ∂∞
    // ?∞Ì??ÑÏóê??ÏµúÏã† ?§ÌÅ¨Î¶ΩÌä∏Î•??ïÌôï??Î°úÎìú?òÎèÑÎ°??©Îãà??
    openTarotHealingModal: ['js/tarot-healing-experience.js?v=20260414-tarot-qualityfix2'],
    openTarotLoveModal: ['js/tarot-love-experience.js?v=20260414-tarot-qualityfix2'],
    openTarotReunionModal: ['js/tarot-reunion-experience.js?v=20260414-tarot-qualityfix2'],
    openTarotSelfEsteemModal: ['js/tarot-self-esteem-experience.js?v=20260414-tarot-qualityfix2'],

    openTarotYearFortuneModal: ['js/tarot-year-fortune-experience.js?v=20260414-tarot-qualityfix2'],
    openDreamModal: ['lib/ai-engine.js', 'js/dream-ledger.js'],
    openPsychoDreamModal: ['js/psycho-dream-analyzer-freuds-study.js'],
    openKemetModal: ['js/oracle-kcg.js'],
    openOlympusOracleModal: ['js/olympus-oracle.js'],
    openLoveSecretModal: ['js/love-secret-v2.js'],
    openLifeBookModal: ['js/life-book.js?v=20260410-v2'],
    gotoZiweiPremium: ['js/ziwei-book.js?v=20260408-v3'],
    gotoAstrologyPremium: ['js/astro-book.js?v=20260409-v1'],
    gotoSukuyoPremium: ['js/sukuyo-book.js?v=20260409-v1'],
    gotoVedicPremium: ['js/vedic-book.js?v=20260409-v1'],
    gotoNamingPremium: [],
    openSibylModal: ['js/sibyl-system.js?v=20260413-sibylfix1']
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
    // Preview CTA?êÏÑú data-pvw-bypassÎ°??¨ÌÅ¥Î¶?êò??Í≤ΩÏö∞???ïÏÉÅ ?ÑÏÜç ?åÎ°ú?∞Ïù¥ÎØÄÎ°?    // dedupe??Í±∏Î¶¨ÏßÄ ?äÍ≤å ?¥Ïïº ?ÑÎ¶¨ÎØ∏ÏóÑ ?°ÏÖò??Î¨¥Î∞ò?ëÏúºÎ°??åÎ™®?òÏ? ?äÎäî??
    var _fromPreviewBypass = false;
    if (origin && typeof origin.closest === 'function') {
      _fromPreviewBypass = !!origin.closest('[data-pvw-bypass]');
    }
    if (!_fromPreviewBypass && shouldSkipDuplicateAction(rule.action)) return true;

    // ?Ä?Ä ÏΩîÏù∏/?†Í∏à Í≤åÏù¥??Ï≤¥ÌÅ¨ ?Ä?Ä
    // ?∞Ïπò ?¥Î≤§?∏Í? ÏΩîÏù∏/?†Í∏à Í≤åÏù¥?∏Î? ?∞Ìöå?òÏ? ?äÎèÑÎ°? ?¥Îãπ ?çÏÑ±??Í∞ÄÏß??Ä?ºÏ?
    // ?ÑÎ¶¨Î∑??®ÎÑê???ÑÏûÑ???ïÏÉÅ?ÅÏù∏ Í≤åÏù¥???êÎ¶Ñ??Í±∞ÏπòÍ≤??úÎã§.
    // ?? pvw-bypass ?çÏÑ±???àÎäî Í≤ΩÏö∞(Preview CTA?êÏÑú ÏßÅÏ†ë ?¥Î¶≠)??Í≤åÏù¥??Í±¥ÎÑà?Ä
    var _coinGateTile = null;
    if (origin && typeof origin.closest === 'function') {
      _coinGateTile = origin.closest('[data-tile-lock-key],[data-coin-cost]');
    }
    // pvw-bypass ?§Ï†ï???Ä?ºÏ? ?¥Î? Preview CTAÎ•??µÍ≥º??Í≤ÉÏù¥ÎØÄÎ°?Í≤åÏù¥???§ÌÇµ
    if (_coinGateTile && _coinGateTile.getAttribute('data-pvw-bypass')) _coinGateTile = null;
    if (!_coinGateTile) {
      _coinGateTile = document.querySelector(
        '[data-action="' + rule.action + '"][data-tile-lock-key],' +
        '[data-action="' + rule.action + '"][data-coin-cost]'
      );
      // fallback?ºÎ°ú Ï∞æÏ? ?Ä?ºÎèÑ pvw-bypass Ï≤¥ÌÅ¨
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
    // ?Ä?Ä ÏΩîÏù∏/?†Í∏à Í≤åÏù¥??Ï≤¥ÌÅ¨ ???Ä?Ä

    if (rule.action === 'openNevilleMeditationPage') {
      try {
        window.location.href = '/neville-meditation.html';
        return true;
      } catch (err) {
        console.error('[mobile-interaction-patch] meditation navigation failed:', err);
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
    }

    if (rule.action === 'openCosmicSoulMeditation') {
      try {
        window.location.href = '/cosmic-soul-meditation.html';
        return true;
      } catch (err) {
        console.error('[mobile-interaction-patch] cosmic soul meditation navigation failed:', err);
        var fallbackHref2 = (origin && origin.getAttribute && origin.getAttribute('data-fallback-href')) || '/cosmic-soul-meditation.html';
        if (fallbackHref2) {
          try { window.location.assign(fallbackHref2); return true; } catch (_) {}
        }
      }
    }

    if (rule.action === 'openYogaGuru') {
      try {
        window.location.href = '/yoga-guru.html';
        return true;
      } catch (err) {
        console.error('[mobile-interaction-patch] yoga guru navigation failed:', err);
        var fallbackHref3 = (origin && origin.getAttribute && origin.getAttribute('data-fallback-href')) || '/yoga-guru.html';
        if (fallbackHref3) {
          try { window.location.assign(fallbackHref3); return true; } catch (_) {}
        }
      }
    }

    if (rule.action === 'openRoyalTeaOracle') {
      try {
        window.location.href = '/royal-tea-oracle.html';
        return true;
      } catch (err) {
        console.error('[mobile-interaction-patch] royal tea navigation failed:', err);
        var fallbackHref4 = (origin && origin.getAttribute && origin.getAttribute('href')) || '/royal-tea-oracle.html';
        if (fallbackHref4) {
          try { window.location.assign(fallbackHref4); return true; } catch (_) {}
        }
      }
    }

    if (rule.action === 'openTarotHealingModal') {
      try {
        window.location.href = '/tarot/healing';
        return true;
      } catch (err) {
        console.error('[mobile-interaction-patch] tarot healing navigation failed:', err);
        try {
          window.location.assign('/tarot/healing');
          return true;
        } catch (_) {}
      }
    }

    dispatchFeatureTapEvent(rule, origin, sourceEvent);

    var fn = window[rule.action];
    var lazyPaths = LAZY_LOAD_ACTIONS[rule.action];
    if (rule.action === 'gotoNamingPremium' && typeof fn !== 'function') {
      window.location.href = '/myungwun_final.html';
      return true;
    }

    /* lazy-load: ?§ÌÅ¨Î¶ΩÌä∏ ÎØ∏Î°ú????Î°úÎìú ???¨Ìò∏Ï∂?*/
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
            try { f(); } catch (err) {
              console.error('[mobile-interaction-patch] post-load action failed:', rule.action, err);
            }
          }
        }).catch(function(err) {
          console.error('[mobile-interaction-patch] lazy load failed:', rule.action, err);
        });
      });
      return true;
    }

    if (typeof fn !== 'function') return false;

    /* Î™®Î∞î?? ?ôÍ∏∞ ?§Ìñâ ??Î∏åÎùº?∞Ï?Í∞Ä ?∞Ïπò Ï≤òÎ¶¨ Ï§?UI ?ÖÎç∞?¥Ìä∏Î•?ÎßâÏïÑ ?îÎ©¥ Î©àÏ∂§ Î∞úÏÉù. rAFÎ°?ÏßÄ??*/
    var raf = window.requestAnimationFrame || function(cb) { return setTimeout(cb, 0); };
    try {
      raf(function() {
        if (typeof window.__cdEnsureModalOverlaysInBody === 'function') window.__cdEnsureModalOverlaysInBody();
        try {
          fn();
        } catch (err) {
          console.error('[mobile-interaction-patch] action execution failed:', rule.action, err);
        }
      });
      return true;
    } catch (err) {
      console.error('[mobile-interaction-patch] action execution failed:', rule.action, err);
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

    // ?ÑÎ¶¨ÎØ∏ÏóÑ 4Ï¢?ÏΩîÏù∏ ?Ä?ºÏ? ?¨Í∏∞???©ÏÑ± click?ºÎ°ú ?åÎπÑ?òÏ? ?äÍ≥†,
    // ?ÑÏó≠ ?¥Î¶≠ ?∏Îì§?¨Î°ú ?òÍ≤® Preview/Í≤åÏù¥?∏Î? ?ïÏÉÅ Í≤ΩÏú†?úÌÇ®??
    var isPremGateAction = (
      action === 'gotoZiweiPremium'
      || action === 'gotoAstrologyPremium'
      || action === 'gotoSukuyoPremium'
      || action === 'gotoVedicPremium'
      || action === 'gotoNamingPremium'
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
      '/* ?∏ÏÉù??Ï±?Î∞??úÎπå???úÏä§???§ÌÅ¨Î°?ÏµúÏ†Å??*/',
      '.lifebook-tile, .lovebible-tile, .lovesim-tile, .sibyl-entry-tile,',
      '.lifebook-tile__inner, .lovebible-tile__inner, .lovesim-tile__inner, .sibyl-entry-inner,',
      '.lifebook-tile__img-wrap, .lifebook-tile__img, .lifebook-tile__body, .lifebook-tile__title, .lifebook-tile__desc, .lifebook-tile__features, .lifebook-tile__cta,',
      '.lovebible-tile__inner, .lovebible-tile__body, .lovebible-tile__title, .lovebible-tile__desc, .lovebible-tile__features, .lovebible-tile__cta,',
      '.lovesim-tile__inner, .lovesim-tile__body, .lovesim-tile__title, .lovesim-tile__desc, .lovesim-tile__features, .lovesim-tile__cta,',
      '.sibyl-entry-inner, .sibyl-entry-img-col, .sibyl-entry-img, .sibyl-entry-content,',
      '[data-action="openLifeBookModal"], [data-action="openLoveSecretModal"], [data-action="openLoveSimulation"], [data-action="openSibylModal"] {',
      '  touch-action: manipulation;',
      '  -webkit-tap-highlight-color: transparent;',
      '  cursor: pointer;',
      '}',
      '.fc-toggle-btn {',
      '  touch-action: manipulation;',
      '  -webkit-tap-highlight-color: transparent;',
      '  cursor: pointer;',
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
      if (pt) lastTouchStart = { x: pt.x, y: pt.y };
      if (!event || !event.target || !event.target.closest) return;
      var rule = findRuleFromTarget(event.target);
      if (!rule) return;
      if (!pt) return;

      touchCtx = {
        rule: rule,
        startX: pt.x,
        startY: pt.y,
        target: event.target,
        moved: false
      };
    }, { passive: true, capture: true });

    root.addEventListener('touchmove', function (event) {
      if (!touchCtx) return;
      var pt = getPoint(event);
      if (!pt) return;
      if (Math.abs(pt.x - touchCtx.startX) > TAP_MAX_DX || Math.abs(pt.y - touchCtx.startY) > TAP_MAX_DY) {
        touchCtx.moved = true;
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
        if (!ctx.moved && dy < TAP_MAX_DY && dx < TAP_MAX_DX) {
          // ?§ÌÅ¨Î°?Ï§ëÏù¥ ?ÑÎãê ?åÎßå ?§Ìñâ
          if (Date.now() - lastScrollAt > SCROLL_BLOCK_MS) {
            var handled = invokeBusinessAction(ctx.rule, ctx.target, event);
            if (handled) {
              event.preventDefault();
              event.stopPropagation();
              suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
              return;
            }
          }
        } else {
          // ?ÄÏßÅÏûÑ??Í∞êÏ???(?§ÌÅ¨Î°??òÎèÑ) -> ?ÑÏÜç ?¥Î¶≠ Ï∞®Îã®
          suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
        }
      }

      /* Î™®Î∞î???¥Î∞±: touchCtx ?ÜÍ±∞??Ï≤òÎ¶¨ ?§Ìå® ??elementFromPointÎ°??∞Ïπò ?ÑÏπò???îÏÜåÎ•??ïÏù∏ (?†ÎãàÎ©Ä ?†ÌÖú ?? */
      if (lastTouchStart) {
        var dx = Math.abs(pt.x - lastTouchStart.x);
        var dy = Math.abs(pt.y - lastTouchStart.y);
        if (dx < TAP_MAX_DX && dy < TAP_MAX_DY) {
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

    /* pointer ?¥Î≤§???¥Î∞±: ?ºÎ? Î™®Î∞î??Î∏åÎùº?∞Ï??êÏÑú touch ?Ä??pointer ?¨Ïö© */
    root.addEventListener('pointerdown', function (event) {
      if (event.pointerType !== 'touch') return;
      var pt = getPoint(event);
      if (pt) lastTouchStart = { x: pt.x, y: pt.y };
      if (!event || !event.target || !event.target.closest) return;
      var rule = findRuleFromTarget(event.target);
      if (!rule) return;
      if (!pt) return;
      touchCtx = {
        rule: rule,
        startX: pt.x,
        startY: pt.y,
        target: event.target,
        moved: false
      };
    }, { passive: true, capture: true });

    root.addEventListener('pointermove', function (event) {
      if (event.pointerType !== 'touch' || !touchCtx) return;
      var pt = getPoint(event);
      if (!pt) return;
      if (Math.abs(pt.x - touchCtx.startX) > TAP_MAX_DX || Math.abs(pt.y - touchCtx.startY) > TAP_MAX_DY) {
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
        if (!ctx.moved && dy < TAP_MAX_DY && dx < TAP_MAX_DX) {
          var handled = invokeBusinessAction(ctx.rule, ctx.target, event);
          if (handled) {
            event.preventDefault();
            event.stopPropagation();
            suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
            return;
          }
        }
      }
      if (lastTouchStart) {
        var dx = Math.abs(pt.x - lastTouchStart.x);
        var dy = Math.abs(pt.y - lastTouchStart.y);
        if (dx < TAP_MAX_DX && dy < TAP_MAX_DY) {
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

    root.addEventListener('click', function (event) {
      if (!event || !event.target || !event.target.closest) return;
      
      // ?§ÌÅ¨Î°?ÏßÅÌõÑ?¥Í±∞???∞Ïπò Î¨¥Ïãú ?úÍ∞Ñ ?¥Ïóê ?¥Î¶≠??Í≤ΩÏö∞ Ï∞®Îã®
      var now = Date.now();
      if (now < suppressClickUntil || (now - lastScrollAt < SCROLL_BLOCK_MS)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      var rule = findRuleFromTarget(event.target);
      if (!rule) return;

      var handled = invokeBusinessAction(rule, event.target, event);
      if (!handled) return;

      event.preventDefault();
      event.stopPropagation();
    }, true);
  }

  function init() {
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

    // Í∏ÄÎ°úÎ≤å ?§ÌÅ¨Î°??ÅÌÉú Ï∂îÏ†Å
    window.addEventListener('scroll', function() {
      lastScrollAt = Date.now();
    }, { passive: true });

    injectTouchActionStyle();
    createBulletproofDelegator(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
