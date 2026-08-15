/**
 * gesture-arbiter.js
 * 스크롤과 탭을 가르는 단일 판정기.
 *
 * 왜 필요한가 — 이 셸에는 같은 탭 하나를 놓고 경쟁하는 리스너 스택이 8벌 있고
 * (index.html 인라인 5벌 + js/core 2벌 + js/mobile-interaction-patch.js),
 * 각자 자기 임계값(10/12/14/16px)을 갖고 있으며 그중 셋은 아무 판정도 하지 않는다.
 * 그래서 한 스택이 "스크롤이니 막자"고 판정해도 다른 스택이 그대로 기능을 열었다.
 * 스택마다 가드를 덧대면 다음에 추가되는 위임자에서 또 뚫리므로(지금 상태가 그 결과다),
 * 판정을 여기 한 곳으로 모으고 나머지는 이 결과를 묻기만 한다.
 *
 * 왜 window capture 인가 — 캡처 경로가 window → document 이므로, 등록 시점과 무관하게
 * document 에 걸린 모든 스택보다 먼저 돈다. window 레벨에도 인라인 리스너가 있어
 * (index.html 의 openWindowTap) 이 파일은 <head> 에서 동기 로드해 선두를 잡는다.
 *
 * 왜 좌표가 아니라 스크롤 이벤트인가 — 손가락 이동 픽셀만 보면 (a) 스크롤로 나갔다
 * 시작점으로 돌아오면 뚫리고 (b) 가로·세로 축마다 임계값을 따로 튜닝해야 하고
 * (c) 관성이 흐르는 중에 손을 대 멈추는 동작을 못 잡는다. "이 제스처 동안 스크롤러가
 * 실제로 움직였는가"는 그 셋을 한 번에 해결하고 셀렉터 목록이 아예 필요 없다.
 *
 * 🔴 정책은 fail-open 이다 — "스크롤이었다"가 명시적으로 참일 때만 자르고, 판단이 서지
 * 않으면 통과시킨다. 오탭은 사용자가 되돌릴 수 있지만 죽은 UI 는 우회할 방법이 없다.
 * 이 파일에서 과차단은 오탭보다 훨씬 비싼 실수다.
 */
(function () {
  'use strict';

  if (window.__cdGesture) return;

  /* 손가락이 이만큼 움직였으면 스크롤 의도로 본다. 스크롤 이벤트가 안 잡히는 경우
     (이미 끝까지 스크롤된 목록에서의 드래그 등)를 위한 보조 신호다. */
  var SLOP_PX = 12;
  /* 이보다 오래 누르고 있었으면 탭이 아니다(롱프레스·주저). */
  var MAX_TAP_MS = 700;
  /* 판정이 합성 클릭까지 살아 있어야 하는 시간. 터치가 끝나고 클릭이 오기까지의 간격. */
  var VERDICT_TTL_MS = 700;

  var active = null;
  var verdict = null;
  var lastBlock = null;
  var blockLog = [];

  /* 🔴 관성 캐치(흐르는 리스트에 손가락을 대 멈추는 동작)는 의도적으로 잡지 않는다.
     세 가지 신호를 실측으로 시도했고 셋 다 멀쩡한 탭을 죽였다:
       1) "직전에 스크롤이 있었나"(시간) — scrollIntoView 같은 프로그램적 점프와 관성을
          구분 못 해 게이트 타일 탭이 reason:"fling-catch" 로 죽었다(상세 시트가 안 열림).
       2) 제스처 중 scroll 이벤트 수 — 하이드레이션 잡음이 손가락을 전혀 안 움직인
          30ms 탭에 scrollTicks=2 를 만들어 카드가 안 열렸다.
       3) 제스처 중 문서 변위(여러 프레임 + 8px 초과) — 앱 자신이 스크롤하는 순간
          (컬렉션 전환 직후)과 구분되지 않아, 정지한 손가락의 49ms 탭이 변위 53px·3프레임으로
          막혀 전체화면 컬렉션의 탭 전환과 닫기가 통째로 죽었다.
     앱이 스스로 스크롤하는 화면에서는 "문서가 움직였다"가 사용자 제스처의 증거가 되지 못한다.
     그래서 판정은 손가락 자체의 움직임(maxDx/maxDy)과 지속시간만 쓴다 — 둘 다 모호하지 않다.
     이 정책은 fail-open 결정의 직접적 귀결이다: 오탭은 되돌릴 수 있지만 죽은 UI 는 못 되돌린다.
     새 신호를 넣으려면 위 세 사례를 재현하는 검증부터 통과시킬 것. */

  function now() {
    return Date.now();
  }

  function pointOf(event) {
    if (!event) return null;
    if (event.changedTouches && event.changedTouches.length) return event.changedTouches[0];
    if (event.touches && event.touches.length) return event.touches[0];
    if (typeof event.clientX === 'number' && typeof event.clientY === 'number') return event;
    return null;
  }

  /* 막아야 하는 이유를 돌려준다. 빈 문자열이면 통과(= 탭으로 인정). */
  function blockReason(gesture) {
    if (!gesture) return '';
    if (gesture.maxDx > SLOP_PX || gesture.maxDy > SLOP_PX) return 'slop';
    if ((now() - gesture.at) > MAX_TAP_MS) return 'duration';
    return '';
  }

  function begin(event) {
    var point = pointOf(event);
    if (!point) return;
    active = {
      x: point.clientX,
      y: point.clientY,
      maxDx: 0,
      maxDy: 0,
      at: now(),
      target: event.target || null
    };
    /* 새 제스처가 시작되면 직전 판정은 무효다. 스크롤 직후에 의도해서 누른 탭이
       앞 제스처의 판정에 걸려 씹히던 회귀가 여기서 끊긴다. */
    verdict = null;
  }

  function move(event) {
    if (!active) return;
    var point = pointOf(event);
    if (!point) return;
    var dx = Math.abs(point.clientX - active.x);
    var dy = Math.abs(point.clientY - active.y);
    if (dx > active.maxDx) active.maxDx = dx;
    if (dy > active.maxDy) active.maxDy = dy;
  }

  function describe(node) {
    if (!node || !node.tagName) return '(none)';
    var out = node.tagName.toLowerCase();
    if (node.id) out += '#' + node.id;
    if (node.classList && node.classList.length) {
      out += '.' + Array.prototype.slice.call(node.classList, 0, 3).join('.');
    }
    return out;
  }

  function end() {
    if (!active) return;
    var reason = blockReason(active);
    verdict = { blocked: !!reason, at: now(), reason: reason };
    if (reason) {
      lastBlock = {
        reason: reason,
        at: now(),
        target: describe(active.target),
        maxDx: active.maxDx,
        maxDy: active.maxDy,
        heldMs: now() - active.at
      };
      blockLog.push(lastBlock);
      if (blockLog.length > 24) blockLog.shift();
    }
    active = null;
  }

  /* 터치에서 비롯한 활성화를 막아야 하는가.
     제스처가 진행 중이면 현재까지의 상태로, 끝났으면 확정 판정으로 답한다. */
  function blocksActivation() {
    if (active) return !!blockReason(active);
    if (!verdict) return false;
    if ((now() - verdict.at) > VERDICT_TTL_MS) return false;
    return verdict.blocked;
  }

  window.addEventListener('touchstart', function (event) {
    begin(event);
  }, { capture: true, passive: true });

  window.addEventListener('touchmove', function (event) {
    move(event);
  }, { capture: true, passive: true });

  window.addEventListener('touchend', function () {
    end();
  }, { capture: true, passive: true });

  /* touchcancel 은 그 자체로 차단 사유가 아니다 — 브라우저가 스크롤로 가져간 경우라면
     sawScroll 이나 slop 이 이미 서 있고, 그렇지 않은 산발적 취소까지 막으면 fail-open 위반이다. */
  window.addEventListener('touchcancel', function () {
    end();
  }, { capture: true, passive: true });

  /* 터치 이벤트를 안 쏘고 포인터만 쏘는 브라우저 대응. 두 계열이 모두 오면 먼저 온 쪽이
     제스처를 확정하고 나머지는 active 가 비어 있어 자연히 no-op 이 된다. */
  window.addEventListener('pointerdown', function (event) {
    if (event.pointerType !== 'touch') return;
    begin(event);
  }, { capture: true, passive: true });

  window.addEventListener('pointermove', function (event) {
    if (event.pointerType !== 'touch') return;
    move(event);
  }, { capture: true, passive: true });

  window.addEventListener('pointerup', function (event) {
    if (event.pointerType !== 'touch') return;
    end();
  }, { capture: true, passive: true });

  window.addEventListener('pointercancel', function (event) {
    if (event.pointerType !== 'touch') return;
    end();
  }, { capture: true, passive: true });

  /* 스크롤로 판정된 제스처가 만든 합성 클릭을 여기서 끊는다. window capture 라
     8개 스택 중 어느 것도 이 클릭을 보지 못한다. */
  window.addEventListener('click', function (event) {
    if (!event) return;
    /* 사람이 만들지 않은 클릭은 제스처 판정 대상이 아니다. 상세 시트 CTA 가
       tile.click() 으로 넘기는 인계가 여기 해당한다 — 이걸 막으면 유료 진입이 통째로
       죽는다(2026-08-14 13cc7e6d7 이 고친 결함이 정확히 그것이었다). */
    if (event.isTrusted === false) return;
    if (!blocksActivation()) return;
    var target = event.target;
    /* 같은 인계를 표식으로도 한 번 더 통과시킨다 — 합성 클릭 판정이 브라우저마다 다를 수 있다. */
    if (target && typeof target.closest === 'function' && target.closest('[data-pvw-cta-bypass]')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  window.__cdGesture = {
    /* 이 클릭/터치엔드를 활성화로 처리해도 되는가. 각 스택이 이것만 물으면 된다. */
    blocksActivation: blocksActivation,
    /* 진단용 — CDP 스모크가 마지막 차단 사유를 읽는다. */
    lastBlock: function () { return lastBlock; },
    blockLog: function () { return blockLog.slice(); },
    state: function () {
      return { active: active, verdict: verdict };
    }
  };
})();
