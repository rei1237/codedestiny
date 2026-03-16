/* ═══════════════════════════════════════════
   Touch Performance Layer v2
   ═══════════════════════════════════════════ */
(function() {
  'use strict';

  /* ── 1. 300ms 지연 완전 제거 ── */
  if ('ontouchstart' in window) {
    document.addEventListener('touchstart', function(){}, { passive: true });
  }

  /* ── 2. Throttle 유틸 (메인 스레드 과부하 방지) ── */
  function throttle(fn, ms) {
    var last = 0, tid;
    return function() {
      var now = Date.now(), rem = ms - (now - last);
      var ctx = this, args = arguments;
      clearTimeout(tid);
      if (rem <= 0) { last = now; fn.apply(ctx, args); }
      else { tid = setTimeout(function(){ last = Date.now(); fn.apply(ctx, args); }, rem); }
    };
  }

  /* ── 3. Debounce 유틸 ── */
  function debounce(fn, ms) {
    var tid;
    return function() {
      var ctx = this, args = arguments;
      clearTimeout(tid);
      tid = setTimeout(function(){ fn.apply(ctx, args); }, ms);
    };
  }

  function safeVibrate(pattern) {
    if (!navigator || typeof navigator.vibrate !== 'function') return;
    var ua = navigator.userActivation;
    if (ua && !ua.isActive) return;
    try {
      navigator.vibrate(pattern);
    } catch (e) {}
  }

  /* ── 4. Resize 쓰로틀링 (200ms) + optimizedResize 커스텀 이벤트 ── */
  window.addEventListener('resize', throttle(function() {
    window.dispatchEvent(new CustomEvent('optimizedResize'));
  }, 200), { passive: true });

  /* ── 5. touchstart → is-touching 즉각 시각 피드백 (0ms) ── */
  var TOUCH_SEL = 'button,.btn-main,.btn-sub,.tog-btn,.feature-card,' +
    '.dw-item,.ts-card,.celeb-tab-btn,.celeb-btn,.oracle-cat-btn-m,.ctg-btn,' +
    '.mystic-tab-btn,.fortune-tab,.iching-btn,.tarot-cat-btn,.og-cat-btn,' +
    '.saju-btn,.fate-btn,.tab-btn,.nav-btn,.menu-btn';
  document.addEventListener('touchstart', function(e) {
    var el = e.target.closest(TOUCH_SEL);
    if (!el) return;
    el.classList.add('is-touching');
    /* once:true 미지원 구형 브라우저 호환: named function + removeEventListener */
    function cleanup() {
      el.classList.remove('is-touching');
      el.removeEventListener('touchend', cleanup);
      el.removeEventListener('touchcancel', cleanup);
    }
    el.addEventListener('touchend', cleanup, { passive: true });
    el.addEventListener('touchcancel', cleanup, { passive: true });
    /* 햅틱 피드백 */
    safeVibrate(8);
  }, { passive: true });

  /* ── 6. Lazy Loading — Intersection Observer ── */
  var imgObs = null;
  if ('IntersectionObserver' in window) {
    var allImgs = document.querySelectorAll('img');
    allImgs.forEach(function(img, idx) {
      if (!img) return;
      if (!img.getAttribute('loading')) {
        // Keep the first few images eager for faster first paint.
        img.setAttribute('loading', idx < 3 ? 'eager' : 'lazy');
      }
      if (!img.getAttribute('decoding')) {
        img.setAttribute('decoding', 'async');
      }
    });
    var lazyImgs = document.querySelectorAll('img[loading="lazy"]');
    imgObs = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry || !entry.target) return;
        if (entry.isIntersecting) {
          var img = entry.target;
          if (img.dataset.src) { img.src = img.dataset.src; img.removeAttribute('data-src'); }
          imgObs.unobserve(img);
        }
      });
    }, { rootMargin: '200px 0px' });
    lazyImgs.forEach(function(img) { if (img) imgObs.observe(img); });

    window.addEventListener('pagehide', function() {
      if (imgObs) {
        imgObs.disconnect();
        imgObs = null;
      }
    }, { once: true });
  }

  /* ── 7. 전역 이벤트 위임 — 비활성화된 버튼 클릭 차단 ── */
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('button:disabled,[disabled]');
    if (btn) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  /* ── 전역 노출 (페이지 내 다른 코드에서 재사용) ── */
  var _scrollY = 0;
  var _isBodyLocked = false;

  /* iOS scroll-freeze 없이 body 스크롤 잠금/해제 */
  function lockBody() {
    if (_isBodyLocked) return;
    _isBodyLocked = true;
    _scrollY = window.pageYOffset || document.documentElement.scrollTop;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = '-' + _scrollY + 'px';
    document.body.style.width = '100%';
  }
  function unlockBody() {
    if (!_isBodyLocked) return;
    _isBodyLocked = false;
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo(0, _scrollY);
  }

  window._perf = { throttle: throttle, debounce: debounce, lockBody: lockBody, unlockBody: unlockBody };

})();