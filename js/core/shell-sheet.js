/* 셸 시트(계정·보관함) 공용 열고 닫기 — 2026-10-02 연이 정원 개편.
 *
 * 왜 <dialog>.showModal() 인가 — 옛 계정 패널은 헤더 nav 안의 position:absolute 상자였다.
 * 모바일에서 nav 가 가운데 2행으로 내려가면 상자 왼쪽이 화면 밖(390px 에서 left −102px, 실측)으로
 * 나가고, body·.wrap·#inputPage 의 overflow-x 가 그 부분을 잘랐다. showModal 은 요소를 최상위
 * 레이어로 올려 어떤 조상의 overflow·transform 에도 갇히지 않고, 바깥(배경·하단 탭)을 inert 로
 * 만들며, Escape 를 cancel 로 바꿔 준다. 그래서 위치를 음수 여백이나 transform 으로 보정하지 않는다.
 *
 * 마크업: <dialog data-cd-sheet id="..."> 안에 [data-cd-sheet-close] 버튼.
 * 여는 쪽: [data-cd-sheet-open="<dialog id>"] 를 누르거나 CodeDestinyShellSheet.open(id, opener).
 * 스크롤 잠금은 공용 참조 카운트 락(__cdLockBodyScroll)만 쓴다 — body.style 을 직접 만지면
 * 결제창·로그인 모달과 겹칠 때 잠금이 풀리거나 남는다.
 * 시트는 history 항목을 넣지 않는다(셸의 popstate 처리기들과 충돌하지 않게).
 */
(function () {
  'use strict';
  if (window.CodeDestinyShellSheet) return;

  var openers = {};
  var scrollYAtOpen = {};

  function lockKey(id) { return 'shell-sheet:' + id; }

  function sheetOf(id) {
    var el = document.getElementById(id);
    return el && el.hasAttribute('data-cd-sheet') ? el : null;
  }

  // 홈 묶음이 숨겨져도(다른 전체 화면이 열려도) 시트는 떠야 하므로 body 직속으로 옮긴다.
  function hoist(sheet) {
    if (sheet.parentNode !== document.body) document.body.appendChild(sheet);
  }

  function setFallbackInert(sheet, on) {
    // showModal 이 없는 브라우저: 형제 노드를 직접 inert 로 만든다.
    var kids = document.body.children;
    for (var i = 0; i < kids.length; i++) {
      var kid = kids[i];
      if (kid === sheet || kid.tagName === 'SCRIPT') continue;
      if (on) {
        if (!kid.inert) { kid.inert = true; kid.setAttribute('data-cd-sheet-inert', '1'); }
      } else if (kid.getAttribute('data-cd-sheet-inert') === '1') {
        kid.inert = false;
        kid.removeAttribute('data-cd-sheet-inert');
      }
    }
  }

  function open(id, opener) {
    var sheet = sheetOf(id);
    if (!sheet) return false;
    if (sheet.open) return true;
    hoist(sheet);
    openers[id] = opener || document.activeElement || null;
    scrollYAtOpen[id] = window.scrollY || 0;
    if (typeof window.__cdLockBodyScroll === 'function') window.__cdLockBodyScroll(lockKey(id));
    if (typeof sheet.showModal === 'function') {
      try { sheet.showModal(); } catch (_) { sheet.setAttribute('open', ''); setFallbackInert(sheet, true); }
    } else {
      sheet.setAttribute('open', '');
      setFallbackInert(sheet, true);
    }
    sheet.setAttribute('data-cd-modal-open', 'true');
    if (openers[id] && openers[id].setAttribute) openers[id].setAttribute('aria-expanded', 'true');
    var first = sheet.querySelector('[data-cd-sheet-close]');
    if (first) { try { first.focus({ preventScroll: true }); } catch (_) { first.focus(); } }
    try { sheet.dispatchEvent(new CustomEvent('cd:sheet-open', { detail: { id: id } })); } catch (_) {}
    return true;
  }

  function finishClose(sheet) {
    var id = sheet.id;
    sheet.removeAttribute('data-cd-modal-open');
    setFallbackInert(sheet, false);
    if (typeof window.__cdUnlockBodyScroll === 'function') window.__cdUnlockBodyScroll(lockKey(id));
    var y = scrollYAtOpen[id];
    // html{scroll-behavior:smooth} 라 기본 scrollTo 는 애니메이션이 된다 — 복원은 즉시.
    if (typeof y === 'number' && Math.abs((window.scrollY || 0) - y) > 1) {
      try { window.scrollTo({ top: y, left: 0, behavior: 'instant' }); } catch (_) { window.scrollTo(0, y); }
    }
    var opener = openers[id];
    openers[id] = null;
    if (opener && opener.setAttribute) opener.setAttribute('aria-expanded', 'false');
    if (opener && typeof opener.focus === 'function' && document.contains(opener)) {
      try { opener.focus({ preventScroll: true }); } catch (_) { opener.focus(); }
    }
    try { sheet.dispatchEvent(new CustomEvent('cd:sheet-close', { detail: { id: id } })); } catch (_) {}
  }

  function close(id) {
    var sheet = sheetOf(id);
    if (!sheet || !sheet.hasAttribute('open')) return false;
    if (typeof sheet.close === 'function' && sheet.open) sheet.close();
    else { sheet.removeAttribute('open'); finishClose(sheet); }
    return true;
  }

  function bind(sheet) {
    if (sheet.__cdSheetBound) return;
    sheet.__cdSheetBound = true;
    // 'close' 는 Escape·form[method=dialog]·close() 모두에서 한 번 온다 — 정리는 여기서만.
    sheet.addEventListener('close', function () { finishClose(sheet); });
    sheet.addEventListener('click', function (event) {
      if (event.target.closest && event.target.closest('[data-cd-sheet-close]')) { close(sheet.id); return; }
      // 시트 안 링크·셸 액션(dpOpenList 등)은 먼저 시트를 닫는다 — 최상위 레이어에 남으면
      // 그 액션이 연 화면이나 모달을 덮는다. 기본 동작·다른 처리기는 그대로 진행한다.
      var go = event.target.closest && event.target.closest('a[href],[data-action]');
      if (go && sheet.contains(go) && !go.hasAttribute('data-cd-sheet-keep')) { close(sheet.id); return; }
      // 배경(::backdrop) 클릭은 dialog 자신을 target 으로 온다. 패널 밖 좌표일 때만 닫는다.
      if (event.target !== sheet) return;
      var panel = sheet.querySelector('.cd-sheet__panel') || sheet;
      var r = panel.getBoundingClientRect();
      var inside = event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom;
      if (!inside) close(sheet.id);
    });
    // 폴백 경로(showModal 없음)는 Escape 를 직접 받는다.
    sheet.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && typeof sheet.showModal !== 'function') { event.preventDefault(); close(sheet.id); }
    });
  }

  function init() {
    var sheets = document.querySelectorAll('dialog[data-cd-sheet]');
    for (var i = 0; i < sheets.length; i++) { hoist(sheets[i]); bind(sheets[i]); }
  }

  document.addEventListener('click', function (event) {
    var trigger = event.target.closest && event.target.closest('[data-cd-sheet-open]');
    if (!trigger) return;
    var id = trigger.getAttribute('data-cd-sheet-open');
    var sheet = sheetOf(id);
    if (!sheet) return; // 시트가 없으면 링크의 href(폴백 페이지)로 그대로 간다.
    event.preventDefault();
    bind(sheet);
    open(id, trigger);
  });

  window.CodeDestinyShellSheet = {
    open: function (id, opener) { var s = sheetOf(id); if (s) bind(s); return open(id, opener); },
    close: close,
    isOpen: function (id) { var s = sheetOf(id); return !!(s && s.hasAttribute('open')); },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
