(function () {
  'use strict';

  /* 모바일 터치: 손가락 미세 움직임 허용 (36px ≈ 2.5mm, 스크롤 시 탭 오인 방지) */
  var TAP_MAX_DX = 36;
  var TAP_MAX_DY = 36;
  var GHOST_CLICK_BLOCK_MS = 500;
  var ACTION_DEDUP_MS = 650;
  var suppressClickUntil = 0;
  var touchCtx = null;
  var lastTouchStart = null;
  var lastActionAt = Object.create(null);

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
    }
  ];

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

  /* 모바일: touchend 시 event.target이 부정확한 경우 elementFromPoint로 실제 터치 위치의 요소 확인 */
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

  var LAZY_LOAD_ACTIONS = {
    openAnimalTotemModal: [
      'js/services/animal-totem-content-engine.js',
      'js/animal-totem-experience.js'
    ],
    // NOTE: uiBindings는 `js/...` 경로를 사용합니다. 모바일 patch도 동일 경로로 맞춰
    // 런타임에서 최신 스크립트를 정확히 로드되도록 합니다.
    openTarotLoveModal: ['js/tarot-love-experience.js?v=20260320-tarot-uifix2'],
    openTarotReunionModal: ['js/tarot-reunion-experience.js?v=20260320-tarot-uifix2'],
    openTarotSelfEsteemModal: ['js/tarot-self-esteem-experience.js?v=20260320-tarot-uifix2'],
    openTarotHealingModal: ['js/tarot-healing-experience.js?v=20260320-tarot-uifix2'],
    openTarotYearFortuneModal: ['js/tarot-year-fortune-experience.js?v=20260320-tarot-uifix2'],
    openDreamModal: ['js/dream-ledger.js'],
    openPsychoDreamModal: ['js/psycho-dream-analyzer-freuds-study.js'],
    openKemetModal: ['js/oracle-kcg.js']
  };

  // open 액션별 대표 오버레이 ID (다른 잔존 오버레이 정리 시 예외 처리용)
  var OPEN_ACTION_OVERLAY_MAP = {
    openTarotLoveModal: 'tarotLoveOverlay',
    openTarotHealingModal: 'tarotHealingOverlay',
    openTarotSelfEsteemModal: 'tarotSelfEsteemOverlay',
    openTarotReunionModal: 'tarotReunionOverlay',
    openTarotYearFortuneModal: 'tarotYearFortuneOverlay',
    openAnimalTotemModal: 'animalTotemOverlay',
    openDreamModal: 'dreamModalOverlay',
    openPsychoDreamModal: 'psychoDreamModalOverlay',
    openKemetModal: 'kemetOracleOverlay'
  };
  var OPEN_ACTION_OVERLAY_CLASS_MAP = {
    openTarotLoveModal: 'is-open',
    openTarotHealingModal: 'is-open',
    openTarotSelfEsteemModal: 'is-open',
    openTarotReunionModal: 'is-open',
    openTarotYearFortuneModal: 'is-open',
    openAnimalTotemModal: 'is-open',
    openDreamModal: 'dream-ledger-overlay--show',
    openPsychoDreamModal: 'ps-overlay--show'
  };

  // Esc에서 닫히지 않던 케이스까지 포함해, "보이진 않지만 클릭을 막는" 오버레이를 정리
  var OVERLAY_CLOSE_MAP = [
    { id: 'tarotLoveOverlay', closeFn: 'closeTarotLoveModal' },
    { id: 'tarotHealingOverlay', closeFn: 'closeTarotHealingModal' },
    { id: 'tarotSelfEsteemOverlay', closeFn: 'closeTarotSelfEsteemModal' },
    { id: 'tarotReunionOverlay', closeFn: 'closeTarotReunionModal' },
    { id: 'tarotYearFortuneOverlay', closeFn: 'closeTarotYearFortuneModal' },
    { id: 'animalTotemOverlay', closeFn: 'closeAnimalTotemModal' },
    { id: 'dreamModalOverlay', closeFn: 'closeDreamModal' },
    { id: 'psychoDreamModalOverlay', closeFn: 'closePsychoDreamModal' },
    { id: 'kemetOracleOverlay', closeFn: 'closeKemetModal' },
    { id: 'tarotModalOverlay', closeFn: 'closeTarotModal' },
    { id: 'destinyFlowerStudioOverlay', closeFn: 'closeDestinyFlowerStudio' },
    { id: 'juyukModalOverlay', closeFn: 'closeJuyukModal' },
    { id: 'sukuyoModalOverlay', closeFn: 'closeSukuyoModal' },
    { id: 'astroModalOverlay', closeFn: 'closeAstroModal' },
    { id: 'ziweiModalOverlay', closeFn: 'closeZiweiModal' },
    { id: 'dpSwitchConfirmOverlay', closeFn: 'dpSwitchConfirmNo' },
    { id: 'dpListOverlay', closeFn: '' },
    { id: 'tarotFocusOverlay', closeFn: 'exitDivineFocus' }
  ];

  function isOverlayVisible(el) {
    if (!el) return false;
    var computed = window.getComputedStyle ? window.getComputedStyle(el) : null;
    if (el.style.display === 'none') return false;
    if (computed && computed.display === 'none') return false;
    if (computed && computed.visibility === 'hidden') return false;
    return true;
  }

  function cleanupBlockingOverlays(exceptOverlayId) {
    var cleaned = false;
    for (var i = 0; i < OVERLAY_CLOSE_MAP.length; i += 1) {
      var item = OVERLAY_CLOSE_MAP[i];
      if (!item || !item.id || item.id === exceptOverlayId) continue;
      var overlay = document.getElementById(item.id);
      if (!isOverlayVisible(overlay)) continue;
      try {
        if (item.closeFn && typeof window[item.closeFn] === 'function') {
          window[item.closeFn]();
        } else if (overlay) {
          overlay.style.display = 'none';
        }
        cleaned = true;
      } catch (err) {
        console.warn('[mobile-interaction-patch] overlay cleanup failed:', item.id, err);
      }
    }
    return cleaned;
  }

  function shouldSkipDuplicateAction(actionName) {
    if (!actionName) return false;
    var now = Date.now();
    var last = Number(lastActionAt[actionName] || 0);
    if (last > 0 && now - last < ACTION_DEDUP_MS) return true;
    lastActionAt[actionName] = now;
    return false;
  }

  function ensureOverlayOpen(actionName) {
    var overlayId = OPEN_ACTION_OVERLAY_MAP[actionName];
    if (!overlayId) return;
    var overlay = document.getElementById(overlayId);
    if (!overlay) return;
    overlay.style.display = 'block';
    var className = OPEN_ACTION_OVERLAY_CLASS_MAP[actionName];
    if (className && overlay.classList) overlay.classList.add(className);
  }

  function scheduleOverlayOpenGuard(actionName) {
    if (!/^open[A-Z]/.test(String(actionName || ''))) return;
    setTimeout(function() { ensureOverlayOpen(actionName); }, 90);
    setTimeout(function() { ensureOverlayOpen(actionName); }, 240);
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

  function invokeActionWithRetry(actionName, maxAttempts, retryMs) {
    var attempts = 0;
    var max = Number(maxAttempts) > 0 ? Number(maxAttempts) : 10;
    var delay = Number(retryMs) > 0 ? Number(retryMs) : 50;
    var raf = window.requestAnimationFrame || function(cb) { return setTimeout(cb, 0); };

    function tryInvoke() {
      var fn = window[actionName];
      if (typeof fn === 'function') {
        try {
          raf(function() {
            try { fn(); } catch (err) {
              console.error('[mobile-interaction-patch] action execution failed:', actionName, err);
            }
          });
          return;
        } catch (err) {
          console.error('[mobile-interaction-patch] action execution failed:', actionName, err);
          return;
        }
      }

      if (attempts >= max) return;
      attempts += 1;
      setTimeout(tryInvoke, delay);
    }

    tryInvoke();
  }

  function invokeBusinessAction(rule, origin, sourceEvent) {
    if (!rule) return false;
    if (shouldSkipDuplicateAction(rule.action)) return true;

    // 모바일 회귀: 이전 오버레이가 잔존하면 새 모달이 안 열린 것처럼 보일 수 있음.
    // open 액션 직전에 현재 액션 대상 외 오버레이를 먼저 정리한다.
    if (/^open[A-Z]/.test(rule.action)) {
      var keepOverlayId = OPEN_ACTION_OVERLAY_MAP[rule.action] || '';
      cleanupBlockingOverlays(keepOverlayId);
      scheduleOverlayOpenGuard(rule.action);
    }

    dispatchFeatureTapEvent(rule, origin, sourceEvent);

    var fn = window[rule.action];
    var lazyPaths = LAZY_LOAD_ACTIONS[rule.action];

    /* lazy-load: 스크립트 미로드 시 로드 후 재호출 */
    if (typeof fn !== 'function' && lazyPaths && lazyPaths.length) {
      var raf = window.requestAnimationFrame || function(cb) { return setTimeout(cb, 0); };
      raf(function() {
        var chain = Promise.resolve();
        lazyPaths.forEach(function(src) {
          chain = chain.then(function() { return loadScript(src); });
        });
        chain.then(function() {
          // 모바일 저사양/느린 환경에서는 onload 직후에도 전역 함수 노출이 늦을 수 있어 재시도 보강
          invokeActionWithRetry(rule.action, 12, 60);
        }).catch(function(err) {
          console.error('[mobile-interaction-patch] lazy load failed:', rule.action, err);
        });
      });
      return true;
    }

    if (typeof fn !== 'function') return false;

    /* 모바일: 동기 실행 시 브라우저가 터치 처리 중 UI 업데이트를 막아 화면 멈춤 발생. rAF로 지연 */
    var raf = window.requestAnimationFrame || function(cb) { return setTimeout(cb, 0); };
    try {
      raf(function() {
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
    return origin.closest('[data-action]');
  }

  function invokeDataActionFallback(actionEl, sourceEvent) {
    if (!actionEl) return false;
    var action = actionEl.getAttribute('data-action');
    if (!action) return false;

    // 모바일에서 가장 빈번한 회귀는 "모든 data-action을 터치 브리지가 가로채는" 경우입니다.
    // 카드 진입(open...) 액션은 브리지가 보완 처리해도 안전하지만,
    // 모달 내부 액션(분석/공유/닫기/시작)은 원래 클릭 흐름을 보존해야
    // iOS Safari/Android Chrome에서 사용자 제스처 컨텍스트가 유지되어 안정적으로 동작합니다.
    var isOpenAction = /^open[A-Z]/.test(action);
    if (isOpenAction && invokeBusinessAction({ action: action }, actionEl, sourceEvent)) return true;

    // 중요: 모달 내부 액션(분석/공유/닫기/시작 등)은 모바일 브리지가 가로채지 않고
    // 기존 click/data-action 바인딩 체인에서 처리되도록 그대로 통과시킨다.
    // (iOS/Android에서 사용자 제스처 컨텍스트 보존)
    if (action === 'changeLanguage') {
      var fn = window[action];
      if (typeof fn === 'function') {
        try {
          var lang = actionEl.getAttribute('data-lang');
          if (lang) {
            fn(lang, actionEl);
            return true;
          }
        } catch (err) {
          console.error('[mobile-interaction-patch] changeLanguage execution failed:', err);
        }
      }
    }
    return false;
  }

  function injectTouchActionStyle() {
    if (document.getElementById('cd-mobile-touch-bridge-style')) return;

    var css = [
      '.feature-card--face, .feature-card--tazza,',
      '.tarot-tile--healing, .tarot-tile--year, .tarot-tile--love, .tarot-tile--reunion, .tarot-tile--self-esteem, .tarot-tile--animal-totem,',
      '.tarot-tile--dream-tile, .tarot-tile--psycho-freud-tile,',
      '.tarot-tile--hwatu, .tarot-tile--egypt-fc,',
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
      '.tarot-tile--animal-totem .tarot-tile__img-wrap, .tarot-tile--animal-totem .tarot-tile__img, .tarot-tile--animal-totem .tarot-tile__badge, .tarot-tile--animal-totem .tarot-tile__body, .tarot-tile--animal-totem .tarot-tile__title, .tarot-tile--animal-totem .tarot-tile__desc,',
      '.tarot-tile--bloom .tarot-tile__img-wrap, .tarot-tile--bloom .tarot-tile__img, .tarot-tile--bloom .tarot-tile__badge, .tarot-tile--bloom .tarot-tile__body, .tarot-tile--bloom .tarot-tile__title, .tarot-tile--bloom .tarot-tile__desc,',
      '.tarot-tile--astro-flower .tarot-tile__img-wrap, .tarot-tile--astro-flower .tarot-tile__img, .tarot-tile--astro-flower .tarot-tile__badge, .tarot-tile--astro-flower .tarot-tile__body, .tarot-tile--astro-flower .tarot-tile__title, .tarot-tile--astro-flower .tarot-tile__desc,',
      '.tarot-tile--jami-flower .tarot-tile__img-wrap, .tarot-tile--jami-flower .tarot-tile__img, .tarot-tile--jami-flower .tarot-tile__badge, .tarot-tile--jami-flower .tarot-tile__body, .tarot-tile--jami-flower .tarot-tile__title, .tarot-tile--jami-flower .tarot-tile__desc,',
      '.tarot-tile--sukuyo-fl .tarot-tile__img-wrap, .tarot-tile--sukuyo-fl .tarot-tile__img, .tarot-tile--sukuyo-fl .tarot-tile__badge, .tarot-tile--sukuyo-fl .tarot-tile__body, .tarot-tile--sukuyo-fl .tarot-tile__title, .tarot-tile--sukuyo-fl .tarot-tile__desc,',
      '[data-action="openPhysiognomyApp"], [data-action="openHwatuModal"], [data-action="openKemetModal"], [data-action="openDreamModal"], [data-action="openPsychoDreamModal"], [data-action="openTarotHealingModal"], [data-action="openTarotYearFortuneModal"], [data-action="openTarotLoveModal"], [data-action="openTarotSelfEsteemModal"], [data-action="openTarotReunionModal"],',
      '[data-action="openAnimalTotemModal"], [data-action="openDestinyFlowerStudio"], [data-action="openAstrologyFlowerStudio"], [data-action="openJamidusuFlowerStudio"], [data-action="openSukuyoFlowerStudio"] {',
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
      '#kemetOracleOverlay, #psychoDreamModalOverlay, #tarotHealingOverlay {',
      '  min-height: var(--cd-safe-vh);',
      '  max-height: var(--cd-safe-vh);',
      '  overflow-x: hidden;',
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
          var handled = invokeBusinessAction(ctx.rule, ctx.target, event);
          if (handled) {
            event.preventDefault();
            event.stopPropagation();
            suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
            return;
          }
        }
      }

      /* 모바일 폴백: touchCtx 없거나 처리 실패 시 elementFromPoint로 터치 위치의 요소를 확인 (애니멀 토템 등) */
      if (lastTouchStart) {
        var dx = Math.abs(pt.x - lastTouchStart.x);
        var dy = Math.abs(pt.y - lastTouchStart.y);
        if (dx < TAP_MAX_DX && dy < TAP_MAX_DY) {
          var ruleFromPoint = findRuleFromPoint(pt.x, pt.y) || findRuleFromPoint(lastTouchStart.x, lastTouchStart.y);
          if (ruleFromPoint) {
            var elAtPoint = document.elementFromPoint(pt.x, pt.y) || document.elementFromPoint(lastTouchStart.x, lastTouchStart.y);
            var handled = invokeBusinessAction(ruleFromPoint, elAtPoint || document.body, event);
            if (handled) {
              event.preventDefault();
              event.stopPropagation();
              suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
            }
          }
          if (!ruleFromPoint) {
            var actionFromTarget = findDataActionElement(event.target);
            var actionFromPointEl = document.elementFromPoint(pt.x, pt.y) || document.elementFromPoint(lastTouchStart.x, lastTouchStart.y);
            var actionFromPoint = findDataActionElement(actionFromPointEl);
            var actionEl = actionFromTarget || actionFromPoint;
            if (invokeDataActionFallback(actionEl, event)) {
              event.preventDefault();
              event.stopPropagation();
              suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
            }
          }
        }
      }
    }, { passive: false, capture: true });

    /* pointer 이벤트 폴백: 일부 모바일 브라우저에서 touch 대신 pointer 사용 */
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
          var ruleFromPoint = findRuleFromPoint(pt.x, pt.y) || findRuleFromPoint(lastTouchStart.x, lastTouchStart.y);
          if (ruleFromPoint) {
            var elAtPoint = document.elementFromPoint(pt.x, pt.y) || document.elementFromPoint(lastTouchStart.x, lastTouchStart.y);
            var handled = invokeBusinessAction(ruleFromPoint, elAtPoint || document.body, event);
            if (handled) {
              event.preventDefault();
              event.stopPropagation();
              suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
            }
          }
          if (!ruleFromPoint) {
            var actionFromTarget = findDataActionElement(event.target);
            var actionFromPointEl = document.elementFromPoint(pt.x, pt.y) || document.elementFromPoint(lastTouchStart.x, lastTouchStart.y);
            var actionFromPoint = findDataActionElement(actionFromPointEl);
            var actionEl = actionFromTarget || actionFromPoint;
            if (invokeDataActionFallback(actionEl, event)) {
              event.preventDefault();
              event.stopPropagation();
              suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
            }
          }
        }
      }
    }, { passive: false, capture: true });

    root.addEventListener('click', function (event) {
      if (!event || !event.target || !event.target.closest) return;
      var rule = findRuleFromTarget(event.target);
      if (!rule) return;

      if (Date.now() < suppressClickUntil) {
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

    injectTouchActionStyle();
    createBulletproofDelegator(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
