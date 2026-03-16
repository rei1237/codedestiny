(function () {
  'use strict';

  var TAP_MAX_DX = 14;
  var TAP_MAX_DY = 10;
  var GHOST_CLICK_BLOCK_MS = 500;
  var suppressClickUntil = 0;
  var touchCtx = null;

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

  function findActionElement(origin, rule) {
    if (!origin || !rule) return null;
    var direct = origin.closest('[data-action="' + rule.action + '"]');
    if (direct) return direct;

    var card = origin.closest(rule.cardSelector);
    if (card && typeof card.querySelector === 'function') {
      var inCard = card.querySelector('[data-action="' + rule.action + '"]');
      if (inCard) return inCard;
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
    }

    return false;
  }

  function injectTouchActionStyle() {
    if (document.getElementById('cd-mobile-touch-bridge-style')) return;

    var css = [
      '.feature-card--face, .feature-card--tazza,',
      '.feature-card--face .feature-card__visual, .feature-card--tazza .feature-card__visual,',
      '.feature-card--face .feature-card__img-wrap, .feature-card--tazza .feature-card__img-wrap,',
      '.feature-card--face .feature-card__img, .feature-card--tazza .feature-card__img,',
      '.feature-card--face .feature-card__title, .feature-card--tazza .feature-card__title,',
      '.feature-card--face .feature-card__desc, .feature-card--tazza .feature-card__desc,',
      '[data-action="openPhysiognomyApp"], [data-action="openHwatuModal"] {',
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
      if (!event || !event.target || !event.target.closest) return;
      var rule = findRuleFromTarget(event.target);
      if (!rule) return;

      var pt = getPoint(event);
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
      if (!touchCtx) return;

      var ctx = touchCtx;
      touchCtx = null;

      var pt = getPoint(event);
      if (!pt) return;
      var dy = Math.abs(pt.y - ctx.startY);
      var dx = Math.abs(pt.x - ctx.startX);
      if (ctx.moved || dy >= TAP_MAX_DY || dx >= TAP_MAX_DX) return;

      probeTopNodeFromPoint(pt.x, pt.y, ctx.rule.action + ':touchend');
      var handled = invokeBusinessAction(ctx.rule, ctx.target, event);
      if (!handled) return;

      event.preventDefault();
      event.stopPropagation();
      suppressClickUntil = Date.now() + GHOST_CLICK_BLOCK_MS;
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
