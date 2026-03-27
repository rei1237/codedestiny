/**
 * cd-aria-modal-manager.js
 * ─────────────────────────────────────────────────────────────
 * "Blocked aria-hidden on an element because its descendant
 *  retained focus" 경고를 근본적으로 해소합니다.
 *
 * 접근 방식:
 *   - 모달이 열릴 때: 배경 DOM에 `inert` 속성을 추가하고,
 *     모달 내 첫 번째 포커스 가능 요소로 포커스를 이동합니다.
 *   - 모달이 닫힐 때: `inert`를 제거하고 이전 포커스 위치로
 *     복귀합니다.
 *   - `aria-hidden` 요소가 포커스를 보유하는 상황 자체를 방지합니다.
 *
 * 대상 모달: style.display 또는 hidden 속성으로 토글되는
 *            role="dialog" / aria-modal="true" 요소들.
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  var FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    'summary',
    'details'
  ].join(',');

  /** 모달 열릴 때 기억할 트리거 포커스 위치 */
  var _prevFocus = null;

  /** body 직속 자식에 inert를 추가하고 제외 요소(모달)를 보호 */
  function lockBackground(exceptEl) {
    Array.prototype.forEach.call(document.body.children, function (child) {
      if (child === exceptEl) return;
      if (child.hasAttribute('inert')) return; // 이미 잠긴 경우 유지
      child.setAttribute('inert', '');
      child.dataset.cdAriaLocked = '1';
    });
  }

  /** lockBackground가 추가한 inert만 제거 */
  function unlockBackground() {
    Array.prototype.forEach.call(document.body.children, function (child) {
      if (child.dataset.cdAriaLocked === '1') {
        child.removeAttribute('inert');
        delete child.dataset.cdAriaLocked;
      }
    });
  }

  /** 모달 내 첫 번째 포커스 가능 요소 반환 */
  function firstFocusable(el) {
    // 닫기 버튼을 우선
    var closeBtn = el.querySelector(
      '[data-action*="close"],[aria-label*="닫기"],[aria-label*="Close"]'
    );
    if (closeBtn && !closeBtn.disabled) return closeBtn;
    return el.querySelector(FOCUSABLE);
  }

  /** 모달 열기 처리 */
  function onOpen(dialog) {
    var active = document.activeElement;
    if (active && active !== document.body) {
      _prevFocus = active;
    }
    lockBackground(dialog);
    // aria-hidden이 실수로 붙어있을 경우 제거
    dialog.removeAttribute('aria-hidden');
    var target = firstFocusable(dialog);
    if (target) {
      // 다음 프레임에 포커스 (CSS transition 완료 후)
      requestAnimationFrame(function () {
        try { target.focus({ preventScroll: false }); } catch (e) {}
      });
    }
  }

  /** 모달 닫기 처리 */
  function onClose() {
    unlockBackground();
    if (_prevFocus && document.body.contains(_prevFocus)) {
      try { _prevFocus.focus({ preventScroll: true }); } catch (e) {}
    }
    _prevFocus = null;
  }

  /** display style 또는 hidden 속성으로 토글되는 모달 감시 */
  function watchModal(el) {
    // 초기 상태 확인
    var wasVisible = isVisible(el);

    var observer = new MutationObserver(function (mutations) {
      var nowVisible = isVisible(el);
      if (!wasVisible && nowVisible) {
        wasVisible = true;
        onOpen(el);
      } else if (wasVisible && !nowVisible) {
        wasVisible = false;
        onClose();
      }
    });

    observer.observe(el, {
      attributes: true,
      attributeFilter: ['style', 'hidden', 'class']
    });

    return observer;
  }

  function isVisible(el) {
    if (el.hidden) return false;
    var s = el.style.display;
    if (s === 'none') return false;
    // class로 숨겨진 경우 (예: .is-hidden, .hidden)
    if (el.classList.contains('is-hidden') || el.classList.contains('hidden')) return false;
    return true;
  }

  /**
   * aria-hidden 요소 내에 포커스가 남아있는 경우를 실시간으로 감지하여
   * 안전한 위치로 포커스를 이동시키는 안전망.
   */
  function installAriaHiddenFocusGuard() {
    document.addEventListener('focusin', function (e) {
      var target = e.target;
      if (!target || target === document.body) return;
      // 부모 체인에서 aria-hidden="true"를 찾는다
      var node = target.parentElement;
      while (node && node !== document.body) {
        if (node.getAttribute('aria-hidden') === 'true') {
          // aria-hidden 영역에 포커스가 들어왔다 → body로 이동
          try { document.body.focus(); } catch (err) {}
          return;
        }
        node = node.parentElement;
      }
    }, true);
  }

  /** 초기화 */
  function init() {
    installAriaHiddenFocusGuard();

    // 현재 DOM에서 모달을 찾아 감시 시작
    var dialogs = document.querySelectorAll('[role="dialog"],[aria-modal="true"]');
    Array.prototype.forEach.call(dialogs, watchModal);

    // body-level 오버레이 중 display:none → block으로 전환되는 요소 감시
    var overlaySelectors = [
      '#destinyFlowerStudioOverlay',
      '#tarotSelfEsteemOverlay',
      '#astralModal',
      '#ios-install-modal',
      '#privacy-modal-overlay',
      '#sajuLoaderOverlay',
      '#dpListOverlay',
      '.tarot-focus-overlay'
    ];
    overlaySelectors.forEach(function (sel) {
      var el = document.querySelector(sel);
      if (el && !el.dataset.cdAriaWatched) {
        el.dataset.cdAriaWatched = '1';
        watchModal(el);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
