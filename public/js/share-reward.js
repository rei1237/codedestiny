/* ═══════════════════════════════════════════════════════════════════════
   공유 래퍼  —  share-reward.js
   ─────────────────────────────────────────────────────────────────────
   • 파일명과 shareWithReward 라는 이름은 호출부 13곳(js/share.js, HwatuFortune.js)
     호환을 위해 유지한다. 폴백 정의가 레포에 없어 무가드로 불린다.
   • 코인 공유 보상은 폐지됐다. 서버는 항상 410 POINT_REWARD_DISABLED 이고
     클라이언트는 보상 요청·잔액 갱신·localStorage 한도 기록을 모두 하지 않는다.
   • 남은 책임은 두 가지뿐: 공유 함수를 실행하고, 완료 토스트를 띄운다.
   ═══════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  /* ══════════════════════════════════════════════════════════════════
     토스트 UI
  ══════════════════════════════════════════════════════════════════ */

  var _toastTimer = null;

  /** 토스트 엘리먼트를 body에 한 번만 주입합니다. */
  function _ensureToast() {
    if (document.getElementById('shareRewardToast')) return;
    var el = document.createElement('div');
    el.id = 'shareRewardToast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    var s = el.style;
    s.position       = 'fixed';
    s.bottom         = '88px';
    s.left           = '50%';
    s.transform      = 'translateX(-50%) translateY(16px)';
    s.background     = 'linear-gradient(135deg,rgba(40,24,8,0.96) 0%,rgba(90,50,10,0.96) 100%)';
    s.color          = '#ffe9b0';
    s.padding        = '13px 26px';
    s.borderRadius   = '999px';
    s.fontSize       = '0.94rem';
    s.fontWeight     = '600';
    s.whiteSpace     = 'nowrap';
    s.pointerEvents  = 'none';
    s.zIndex         = '99999';
    s.opacity        = '0';
    s.transition     = 'opacity 0.28s ease, transform 0.28s ease';
    s.maxWidth       = 'calc(100vw - 32px)';
    s.textAlign      = 'center';
    s.boxShadow      = '0 6px 24px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,220,100,0.18)';
    s.border         = '1px solid rgba(255,200,80,0.25)';
    document.body.appendChild(el);
  }

  /**
   * 하단 토스트 메시지를 표시합니다.
   * @param {string} msg
   */
  function showShareRewardToast(msg) {
    _ensureToast();
    var el = document.getElementById('shareRewardToast');
    if (!el) return;
    el.textContent = msg;
    el.style.opacity   = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';
    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(function () {
      el.style.opacity   = '0';
      el.style.transform = 'translateX(-50%) translateY(16px)';
    }, 2500);
  }

  /* ══════════════════════════════════════════════════════════════════
     메인 공개 API
  ══════════════════════════════════════════════════════════════════ */

  /**
   * 공유를 실행하고 완료 토스트를 띄우는 래퍼 함수.
   *
   * @param {Function} shareFn   - 실제 공유를 수행하는 함수 (동기)
   * @param {string}   contentId - 콘텐츠 식별자. 보상 폐지로 더 이상 쓰이지 않으나
   *                               호출부 13곳의 시그니처 호환을 위해 남긴다.
   *
   * @example
   *   shareWithReward(function() { Kakao.Share.sendDefault({...}); }, 'tarot');
   */
  function shareWithReward(shareFn, contentId) {
    void contentId;

    /* 공유 실행 */
    try { shareFn(); } catch (e) { console.warn('[share-reward] shareFn threw:', e); }

    setTimeout(function () { showShareRewardToast('공유가 완료되었습니다.'); }, 700);
  }

  /* ── 전역 노출 ── */
  global.shareWithReward      = shareWithReward;
  global.showShareRewardToast = showShareRewardToast;

}(typeof window !== 'undefined' ? window : this));
