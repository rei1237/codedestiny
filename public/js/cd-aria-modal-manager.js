/**
 * cd-aria-modal-manager.js (v2 — 안전 재작성)
 * ─────────────────────────────────────────────────────────────
 * "Blocked aria-hidden on an element because its descendant
 *  retained focus" 경고를 해소합니다.
 *
 * v1 대비 변경:
 *   - lockBackground / inert 배경 잠금 제거 (오진 시 전체 페이지 비활성화 위험)
 *   - isVisible 판단 오류 제거 (CSS 클래스 기반 숨김 미감지 버그 수정)
 *   - 2가지 안전한 가드만 유지:
 *       1. focusin 가드: aria-hidden 영역에 포커스 진입 시 즉각 이동
 *       2. MutationObserver 가드: aria-hidden 속성 추가 시 포커스 이동
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  /**
   * [가드 1] focusin 이벤트 가드
   * aria-hidden="true" 요소 안으로 포커스가 진입하면 즉시 안전한 곳으로 이동.
   */
  function installAriaHiddenFocusGuard() {
    document.addEventListener('focusin', function (e) {
      var target = e.target;
      if (!target || target === document.body || !target.parentElement) return;

      // 부모 체인에서 aria-hidden="true" 찾기
      var node = target.parentElement;
      while (node && node !== document.body) {
        if (node.getAttribute('aria-hidden') === 'true') {
          // 열려있는 다이얼로그 탐색 (computedStyle 기반 정확한 가시성 판단)
          var openDialog = null;
          var dialogs = document.querySelectorAll('[role="dialog"],[aria-modal="true"]');
          for (var i = 0; i < dialogs.length; i++) {
            var d = dialogs[i];
            if (d.getAttribute('aria-hidden') === 'true') continue;
            var cs = window.getComputedStyle(d);
            if (cs.display !== 'none' && cs.visibility !== 'hidden') {
              openDialog = d;
              break;
            }
          }
          var focusTarget = openDialog
            ? openDialog.querySelector('button:not([disabled]),[tabindex="0"],[href],input:not([disabled])')
            : null;
          try {
            if (focusTarget) {
              focusTarget.focus();
            } else {
              document.body.tabIndex = -1;
              document.body.focus();
            }
          } catch (err) {}
          return;
        }
        node = node.parentElement;
      }
    }, true);
  }

  /**
   * [가드 2] MutationObserver 가드
   * 요소에 aria-hidden="true"가 추가되는 시점에 포커스가 내부에 있으면
   * 안전한 위치로 이동.
   */
  function installAriaHiddenMutationGuard() {
    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type !== 'attributes' || m.attributeName !== 'aria-hidden') continue;
        var el = m.target;
        if (el.getAttribute('aria-hidden') !== 'true') continue;

        var active = document.activeElement;
        if (!active || active === document.body) continue;
        if (!el.contains(active)) continue;

        // 포커스가 aria-hidden 영역 내에 있음 → 이동
        var candidates = document.querySelectorAll(
          '[role="dialog"]:not([aria-hidden="true"]) button:not([disabled]),' +
          '[aria-modal="true"]:not([aria-hidden="true"]) button:not([disabled])'
        );
        try {
          if (candidates.length > 0) {
            candidates[0].focus();
          } else {
            document.body.tabIndex = -1;
            document.body.focus();
          }
        } catch (err) {}
      }
    });

    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-hidden']
    });
  }

  function init() {
    installAriaHiddenFocusGuard();
    installAriaHiddenMutationGuard();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
