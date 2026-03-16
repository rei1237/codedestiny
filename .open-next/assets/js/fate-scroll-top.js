;(function () {
  'use strict';

  var TOP_INDICATOR_ID = 'fateScrollTopIndicator';
  var topIndicatorEl = null;
  var ticking = false;
  var resultObserver = null;

  function isDisplayed(el) {
    return !!(el && el.offsetParent !== null && getComputedStyle(el).display !== 'none');
  }

  function getResultPage() {
    return document.getElementById('resultPage');
  }

  function ensureTopIndicator() {
    if (document.getElementById(TOP_INDICATOR_ID)) {
      topIndicatorEl = document.getElementById(TOP_INDICATOR_ID);
      return;
    }

    topIndicatorEl = document.createElement('div');
    topIndicatorEl.id = TOP_INDICATOR_ID;
    topIndicatorEl.className = 'fate-scroll-next-indicator fate-scroll-top-indicator';
    topIndicatorEl.innerHTML =
      '<button class="fate-scroll-next-arrow" id="fateTopArrow" aria-label="맨 위로 이동">&#8593;</button>' +
      '<span class="fate-scroll-next-label">맨 위로 이동</span>';

    document.body.appendChild(topIndicatorEl);

    /* 컨테이너 전체(버튼+라벨 포함)에 클릭 등록 — 어느 지점을 눌러도 동작 */
    topIndicatorEl.addEventListener('click', function (e) {
      e.stopPropagation();
      e.preventDefault();
      scrollToVeryTop();
    });
  }

  /* ── 확실한 최상단 스크롤 ───────────────────────── */
  function scrollToVeryTop() {
    /* 1. 기본 부드러운 스크롤 시도 */
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch(err) {}

    /* 2. iOS/구형 브라우저 등에서 부드러운 스크롤이 안 먹히는 경우를 위한 강제 폴백 
          충분한 시간을 두고 여러 속성을 초기화 */
    setTimeout(function () {
      var safeY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      if (safeY > 50) {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        
        var rp = document.getElementById('resultPage');
        if (rp) rp.scrollTop = 0;
      }
    }, 400); // 400ms: 부드러운 스크롤이 대략 끝났거나 작동 안 했을 시간
  }

  /* 현재 스크롤 Y 값 – iOS Safari 호환 */
  function getScrollY() {
    return window.pageYOffset
      || document.documentElement.scrollTop
      || document.body.scrollTop
      || 0;
  }

  /* 문서 전체 높이 */
  function getDocHeight() {
    return Math.max(
      document.body.scrollHeight, document.documentElement.scrollHeight,
      document.body.offsetHeight,  document.documentElement.offsetHeight
    );
  }

  function shouldShowTopIndicator() {
    var rp = getResultPage();
    if (!rp || !isDisplayed(rp)) return false;

    var viewportH = window.innerHeight || document.documentElement.clientHeight;
    var st = getScrollY();
    var docH = getDocHeight();

    /* 페이지가 충분히 긴지 */
    var longEnough = docH > viewportH * 1.5;
    /* 하단 120px 이내로 스크롤됐는지 */
    var reachedBottom = (st + viewportH) >= (docH - 120);

    return longEnough && reachedBottom;
  }

  function updateTopIndicator() {
    if (!topIndicatorEl) return;
    if (shouldShowTopIndicator()) {
      topIndicatorEl.classList.add('fate-scroll-next-visible');
    } else {
      topIndicatorEl.classList.remove('fate-scroll-next-visible');
    }
  }

  function requestUpdate() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      updateTopIndicator();
    });
  }

  function init() {
    ensureTopIndicator();
    updateTopIndicator();

    /* iOS Safari: overflow-x:hidden on <html> 시 scroll 이벤트가
       window 대신 document/body에 붙을 수 있으므로 모두 리스닝 */
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });

    var rp = getResultPage();
    if (rp) {
      resultObserver = new MutationObserver(requestUpdate);
      resultObserver.observe(rp, {
        attributes: true,
        attributeFilter: ['style', 'class'],
        childList: true,
        subtree: true
      });
    }

    window.addEventListener('pagehide', function () {
      if (resultObserver) {
        resultObserver.disconnect();
        resultObserver = null;
      }
    }, { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();