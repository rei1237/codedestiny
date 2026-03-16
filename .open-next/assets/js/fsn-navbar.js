;(function () {
  'use strict';

  var PIG_DECO = '\uD83C\uDF38'; /* 꽃 */
  var NEO_DECO = '\uD83D\uDC3E'; /* 발바닥 */

  var navBar     = null;
  var titleEl    = null;
  var progressEl = null;
  var decoEls    = [];
  var secObs     = null;
  var rafId      = null;
  var isNeo      = false;

  /* ─ 모드 동기화 ─ */
  function syncMode () {
    isNeo = document.body.classList.contains('neo-mode');
    if (!navBar) return;
    if (isNeo) {
      navBar.classList.add('fsn-neo');
      navBar.classList.remove('fsn-pig');
    } else {
      navBar.classList.add('fsn-pig');
      navBar.classList.remove('fsn-neo');
    }
    decoEls.forEach(function (el) { el.textContent = isNeo ? NEO_DECO : PIG_DECO; });
  }

  /* ─ 표시 / 숨김 ─ */
  function showNav () { if (navBar) navBar.classList.add('fsn-visible'); }
  function hideNav () {
    if (navBar) navBar.classList.remove('fsn-visible');
    if (titleEl) titleEl.textContent = '\uc6b4\uba85\uc758 \uc9c0\ub3c4';
  }

  /* ─ 대상 섹션 목록 ─ */
  function getSections () {
    var rp = document.getElementById('resultPage');
    return rp ? Array.from(rp.querySelectorAll(
      '.card, .destiny-section, .letter-box, .top-hero'
    )) : [];
  }

  /* ─ 설명 텍스트 추출 ─ */
  function getTitle (el) {
    if (el.classList.contains('top-hero')) return '\uD83D\uDD2E \uc6b4\uba85\uc758 \uc2dc\uc791';
    var t = el.querySelector('.sec-title, .destiny-title, .fortune-sec-title, h3');
    if (!t) return '';
    var txt = (t.textContent || '').trim();
    return txt.length > 20 ? txt.slice(0, 19) + '\u2026' : txt;
  }

  /* ─ 섹션 감지 Observer ─ */
  function initSecObs () {
    if (secObs) secObs.disconnect();
    if (!('IntersectionObserver' in window)) return;
    secObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var txt = getTitle(entry.target);
        if (txt && titleEl) titleEl.textContent = txt;
      });
    }, { rootMargin: '-18% 0px -62% 0px', threshold: 0 });
    getSections().forEach(function (el) { secObs.observe(el); });
  }

  /* ─ 스크롤 진행률 리본 ─ */
  function startProgress () {
    if (rafId) cancelAnimationFrame(rafId);
    function tick () {
      var st  = window.pageYOffset || document.documentElement.scrollTop;
      var dh  = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      var pct = dh > 0 ? Math.min(100, (st / dh) * 100) : 0;
      if (progressEl) progressEl.style.width = pct + '%';
      rafId = requestAnimationFrame(tick);
    }
    tick();
  }

  function stopProgress () {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (progressEl) progressEl.style.width = '0%';
  }

  /* ─ 결과 페이지 상태 감시 ─ */
  function watchResultPage () {
    var rp = document.getElementById('resultPage');
    if (!rp) return;
    function check () {
      var visible = rp.style.display !== 'none' &&
                    getComputedStyle(rp).display !== 'none';
      if (visible) {
        showNav();
        setTimeout(function () { initSecObs(); startProgress(); }, 150);
      } else {
        hideNav(); stopProgress();
      }
    }
    new MutationObserver(check).observe(rp, { attributes: true, attributeFilter: ['style'] });
    check(); /* 초기 상태 확인 */
  }

  /* ─ 인스턴스 는리 변화 감시 (late reveal 컴플) ─ */
  function watchLateSections () {
    var rp = document.getElementById('resultPage');
    if (!rp) return;
    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        var el = m.target;
        if (el.matches && el.matches('.card, .destiny-section, .letter-box')) {
          if (getComputedStyle(el).display !== 'none') {
            if (secObs) secObs.observe(el);
          }
        }
      });
    }).observe(rp, { subtree: true, attributes: true, attributeFilter: ['style'] });
  }

  /* ─ 엔트리 ─ */
  function init () {
    navBar     = document.getElementById('fsnNavBar');
    titleEl    = document.getElementById('fsnTitle');
    progressEl = document.getElementById('fsnProgress');
    decoEls    = [
      document.getElementById('fsnDecoL'),
      document.getElementById('fsnDecoR')
    ].filter(Boolean);
    if (!navBar) return;
    syncMode();
    /* body 클래스 변화 (neo 모드 전환) 감지 */
    new MutationObserver(syncMode).observe(
      document.body, { attributes: true, attributeFilter: ['class'] }
    );
    watchResultPage();
    watchLateSections();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();