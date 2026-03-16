(function () {
  'use strict';

  /* 모바일 터치: 손가락 미세 움직임 허용 (36px ≈ 2.5mm, 스크롤 시 탭 오인 방지) */
  var TAP_MAX_DX = 36;
  var TAP_MAX_DY = 36;
  var GHOST_CLICK_BLOCK_MS = 500;
  var suppressClickUntil = 0;
  var touchCtx = null;
  var lastTouchStart = null;

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
      cardSelector: '.feature-card--tazza',
      targetSelector: [
        '[data-action="openHwatuModal"]',
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
        '.tarot-tile--sukuyo-fl .tarot-tile__title',
        '.tarot-tile--sukuyo-fl .tarot-tile__desc',
        '.tarot-tile--sukuyo-fl .tarot-tile__body'
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

  function invokeBusinessAction(rule, origin, sourceEvent) {
    if (!rule) return false;

    dispatchFeatureTapEvent(rule, origin, sourceEvent);

    var fn = window[rule.action];
    if (typeof fn === 'function') {
      try {
        fn();
        return true;
      } catch (err) {
        console.error('[mobile-interaction-patch] action execution failed:', rule.action, err);
      }
      return false;
    }

    return false;
  }

  function injectTouchActionStyle() {
    if (document.getElementById('cd-mobile-touch-bridge-style')) return;

    var css = [
      '.feature-card--face, .feature-card--tazza,',
      '.tarot-tile--year, .tarot-tile--animal-totem,',
      '.tarot-tile--bloom, .tarot-tile--astro-flower, .tarot-tile--jami-flower, .tarot-tile--sukuyo-fl,',
      '.feature-card--face .feature-card__visual, .feature-card--tazza .feature-card__visual,',
      '.feature-card--face .feature-card__img-wrap, .feature-card--tazza .feature-card__img-wrap,',
      '.feature-card--face .feature-card__img, .feature-card--tazza .feature-card__img,',
      '.feature-card--face .feature-card__title, .feature-card--tazza .feature-card__title,',
      '.feature-card--face .feature-card__desc, .feature-card--tazza .feature-card__desc,',
      '.tarot-tile--year .tarot-tile__img-wrap, .tarot-tile--year .tarot-tile__img, .tarot-tile--year .tarot-tile__body, .tarot-tile--year .tarot-tile__title, .tarot-tile--year .tarot-tile__desc,',
      '.tarot-tile--animal-totem .tarot-tile__img-wrap, .tarot-tile--animal-totem .tarot-tile__img, .tarot-tile--animal-totem .tarot-tile__body, .tarot-tile--animal-totem .tarot-tile__title, .tarot-tile--animal-totem .tarot-tile__desc,',
      '.tarot-tile--bloom .tarot-tile__img-wrap, .tarot-tile--bloom .tarot-tile__img, .tarot-tile--bloom .tarot-tile__body, .tarot-tile--bloom .tarot-tile__title, .tarot-tile--bloom .tarot-tile__desc,',
      '.tarot-tile--astro-flower .tarot-tile__img-wrap, .tarot-tile--astro-flower .tarot-tile__img, .tarot-tile--astro-flower .tarot-tile__body, .tarot-tile--astro-flower .tarot-tile__title, .tarot-tile--astro-flower .tarot-tile__desc,',
      '.tarot-tile--jami-flower .tarot-tile__img-wrap, .tarot-tile--jami-flower .tarot-tile__img, .tarot-tile--jami-flower .tarot-tile__body, .tarot-tile--jami-flower .tarot-tile__title, .tarot-tile--jami-flower .tarot-tile__desc,',
      '.tarot-tile--sukuyo-fl .tarot-tile__img-wrap, .tarot-tile--sukuyo-fl .tarot-tile__img, .tarot-tile--sukuyo-fl .tarot-tile__body, .tarot-tile--sukuyo-fl .tarot-tile__title, .tarot-tile--sukuyo-fl .tarot-tile__desc,',
      '[data-action="openPhysiognomyApp"], [data-action="openHwatuModal"], [data-action="openTarotYearFortuneModal"],',
      '[data-action="openAnimalTotemModal"], [data-action="openDestinyFlowerStudio"], [data-action="openAstrologyFlowerStudio"], [data-action="openJamidusuFlowerStudio"], [data-action="openSukuyoFlowerStudio"] {',
      '  touch-action: manipulation;',
      '  -webkit-tap-highlight-color: transparent;',
      '  cursor: pointer;',
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
          var ruleFromPoint = findRuleFromPoint(pt.x, pt.y);
          if (ruleFromPoint) {
            var elAtPoint = document.elementFromPoint(pt.x, pt.y);
            var handled = invokeBusinessAction(ruleFromPoint, elAtPoint, event);
            if (handled) {
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
    injectTouchActionStyle();
    createBulletproofDelegator(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
