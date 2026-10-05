(function () {
  'use strict';

  function getClosestClickable(el) {
    if (!el || !el.closest) return null;
    return el.closest('[data-cd-inline-click], [data-cd-history-back]');
  }

  function invokeInlineClick(target) {
    if (!target) return;

    if (target.hasAttribute('data-cd-history-back')) {
      history.back();
      return;
    }

    var fnName = target.getAttribute('data-cd-inline-click');
    if (!fnName) return;
    var fn = window[fnName];
    if (typeof fn !== 'function') return;

    var argsRaw = target.getAttribute('data-cd-inline-click-args');
    if (argsRaw == null || argsRaw === '') {
      fn();
      return;
    }

    // 단순 문자열 인자만 필요로 하는 케이스 중심 (기존 onclick 인자와 무결성 유지)
    fn(argsRaw);
  }

  document.addEventListener('click', function (e) {
    var t = getClosestClickable(e.target);
    if (!t) return;
    invokeInlineClick(t);
  }, { passive: true });
})();

