;(function () {
  'use strict';

  var HIDDEN_CLS   = 'fate-scroll-section-hidden';
  var VISIBLE_CLS  = 'fate-scroll-section-visible';
  var INDICATOR_ID = 'fateScrollNextIndicator';
  var ENABLE_SCROLL_INDICATOR = true;
  /* resultPage 최상위 섹션 + reportDashboard 내부 블록 매핑 */
  var TOP_LEVEL_SEL = '.card, .destiny-section, .letter-box, .share-section';

  /* ── 유틸 ── */
  function getSections() {
    var rp = document.getElementById('resultPage');
    if (!rp) return [];

    var sections = [];
    Array.from(rp.children).forEach(function (child) {
      if (!child || !child.matches || !child.matches(TOP_LEVEL_SEL)) return;

      if (child.id === 'reportDashboardCard') {
        var blocks = Array.from(child.querySelectorAll(':scope .rpt-v2-block')).filter(isDisplayed);
        if (blocks.length) {
          blocks.forEach(function (b) { sections.push(b); });
          return;
        }
      }

      sections.push(child);
    });

    return sections;
  }

  function isDisplayed(el) {
    return !!(el && el.offsetParent !== null &&
      getComputedStyle(el).display !== 'none');
  }

  /* ── 1. Reveal Observer (Intersection Observer) ── */
  var revealObserver = null;

  function initReveal() {
    if (!('IntersectionObserver' in window)) return;
    try {
      revealObserver = new IntersectionObserver(function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && entry.target) {
            entry.target.classList.remove(HIDDEN_CLS);
            entry.target.classList.add(VISIBLE_CLS);
            observer.unobserve(entry.target);
          }
        });
      }, {
        root: null,
        rootMargin: '0px 0px -50px 0px',
        threshold: 0.07
      });

      getSections().forEach(function (el) {
        if (el && !el.classList.contains(VISIBLE_CLS)) {
          el.classList.add(HIDDEN_CLS);
          revealObserver.observe(el);
        }
      });
    } catch(e) {
      console.error('[revealObserver] fail:', e);
    }
  }

  /* ── 2. 다음 섹션 인디케이터 ── */
  var indicatorEl    = null;
  var indicatorLabel = null;
  var currentSection = null;
  var sectionObserver = null;
  var lateRevealObserver = null;
  var resultPageObserver = null;
  var visibilityObserver = null;

  function isResultVisible() {
    var rp = document.getElementById('resultPage');
    return !!(rp && isDisplayed(rp));
  }

  function hideIndicator() {
    if (!indicatorEl) return;
    indicatorEl.classList.remove('fate-scroll-next-visible');
  }

  function setIndicatorArrow(isToTop) {
    var arrowBtn = document.getElementById('fateNextArrow');
    if (!arrowBtn) return;
    arrowBtn.innerHTML = isToTop ? '&#8593;' : '&#8595;';
    arrowBtn.setAttribute('aria-label', isToTop ? '맨 위로 이동' : '다음 섹션으로 이동');
  }

  function setIndicatorText(text) {
    if (!indicatorLabel) return;
    var t = (text || '').trim();
    indicatorLabel.textContent = t.length > 26 ? t.slice(0, 25) + '\u2026' : t;
  }

  function scrollToResultTop() {
    var rp = document.getElementById('resultPage');
    var top = 0;
    if (rp && rp.getBoundingClientRect) {
      top = Math.max(0, Math.round(window.scrollY + rp.getBoundingClientRect().top - 8));
    }
    window.scrollTo({ top: top, behavior: 'smooth' });
  }

  function getSectionTitle(sectionEl) {
    if (!sectionEl) return '';

    // 1) aria-labelledby 사용 시 해당 헤더를 최우선으로 사용
    var labelledBy = sectionEl.getAttribute('aria-labelledby');
    if (labelledBy) {
      var labelled = document.getElementById(labelledBy);
      if (labelled && labelled.textContent) {
        return labelled.textContent.trim();
      }
    }

    // 2) 섹션 직계 제목 우선 탐색
    var titleEl = null;
    try {
      titleEl = sectionEl.querySelector(':scope > .sec-title, :scope > h3.sec-title, :scope > h3, :scope > .fortune-sec-title, :scope > .destiny-title');
    } catch (e) {
      titleEl = null;
    }

    // 3) 하위 구조까지 확장 탐색
    if (!titleEl) {
      titleEl = sectionEl.querySelector('.sec-title, h3.sec-title, .fortune-sec-title, .destiny-title, h3');
    }

    var txt = (titleEl && titleEl.textContent) ? titleEl.textContent.trim() : '';
    if (!txt) txt = '다음 서비스 보기';
    return txt;
  }

  function createIndicator() {
    if (!ENABLE_SCROLL_INDICATOR) return;
    if (document.getElementById(INDICATOR_ID)) {
      indicatorEl    = document.getElementById(INDICATOR_ID);
      indicatorLabel = document.getElementById('fateNextLabel');
      return;
    }
    indicatorEl = document.createElement('div');
    indicatorEl.className = 'fate-scroll-next-indicator';
    indicatorEl.id = INDICATOR_ID;
    indicatorEl.innerHTML =
      '<button class="fate-scroll-next-arrow" id="fateNextArrow" aria-label="다음 섹션으로 이동">&#8595;</button>' +
      '<span class="fate-scroll-next-label" id="fateNextLabel">다음 서비스 보기</span>';
    if (document.body) document.body.appendChild(indicatorEl);
    indicatorLabel = document.getElementById('fateNextLabel');

    var arrowBtn = document.getElementById('fateNextArrow');
    if (arrowBtn) arrowBtn.addEventListener('click', function () {
      if (!currentSection) {
        scrollToResultTop();
        return;
      }
      var all = getSections().filter(isDisplayed);
      var idx = all.indexOf(currentSection);
      var next = (idx + 1 < all.length) ? all[idx + 1] : null;
      if (next) {
        next.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        scrollToResultTop();
      }
    });
  }

  function initSectionTracker() {
    if (!ENABLE_SCROLL_INDICATOR) return;
    if (!('IntersectionObserver' in window)) return;
    try {
      sectionObserver = new IntersectionObserver(function (entries) {
        if (!isResultVisible()) {
          hideIndicator();
          return;
        }
        entries.forEach(function (entry) {
          if (!entry.isIntersecting || !entry.target) return;
          currentSection = entry.target;
          var all = getSections().filter(isDisplayed);
          var idx = all.indexOf(currentSection);
          var hasNext = idx !== -1 && idx < all.length - 1;
          if (!indicatorEl) return;
          if (hasNext) {
            var nextEl   = all[idx + 1];
            if(!nextEl) return;
            var titleTxt = getSectionTitle(nextEl);
            setIndicatorArrow(false);
            setIndicatorText('다음: ' + titleTxt + ' (' + (idx + 2) + '/' + all.length + ')');
            indicatorEl.classList.add('fate-scroll-next-visible');
          } else {
            setIndicatorArrow(true);
            setIndicatorText('맨 위로 가기');
            indicatorEl.classList.add('fate-scroll-next-visible');
          }
        });
      }, {
        rootMargin: '-22% 0px -22% 0px',
        threshold: 0
      });

      getSections().filter(isDisplayed).forEach(function (el) {
        if(el) sectionObserver.observe(el);
      });
    } catch(e) {
      console.error('[sectionObserver] fail:', e);
    }
  }

  /* ── 3. 나중에 display:none → 표시되는 섹션 관찰 ── */
  function watchLateReveal() {
    var rp = document.getElementById('resultPage');
    if (!rp) return;
    lateRevealObserver = new MutationObserver(function (mutations) {
      mutations.forEach(function (mut) {
        var el = mut.target;
        if (!el) return;

        // 표시 대상이 동적으로 바뀌는 경우(대시보드 렌더 포함) 관찰 대상을 재동기화
        if (sectionObserver) {
          try { sectionObserver.disconnect(); } catch (e) {}
          getSections().filter(isDisplayed).forEach(function (sec) {
            if (sec) sectionObserver.observe(sec);
          });
        }

        if (revealObserver) {
          getSections().forEach(function (sec) {
            if (!sec) return;
            if (!sec.classList.contains(VISIBLE_CLS) && !sec.classList.contains(HIDDEN_CLS)) {
              sec.classList.add(HIDDEN_CLS);
            }
            revealObserver.observe(sec);
          });
        }
      });
    });
    lateRevealObserver.observe(rp, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'class'] });
  }

  /* ── 4. 결과 페이지 활성화 감지 후 전체 초기화 ── */
  function onResultVisible() {
    if (!isResultVisible()) {
      hideIndicator();
      return;
    }
    if (!ENABLE_SCROLL_INDICATOR) {
      var existing = document.getElementById(INDICATOR_ID);
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
      return;
    }
    disposeContentObservers();
    createIndicator();
    /* DOM 렌더링 완전 반영 후 초기화 (requestAnimationFrame 2프레임) */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        /* reveal 의 transform 적용 전 스크롤 최상단 고정 (부드러운 스크롤로 대체) */
        initReveal();
        initSectionTracker();
        watchLateReveal();
      });
    });
  }

  function init() {
    var rp = document.getElementById('resultPage');
    if (!rp) return;

    if (!ENABLE_SCROLL_INDICATOR) {
      var existing = document.getElementById(INDICATOR_ID);
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
      return;
    }

    // 결과 페이지 표시/숨김 전환 시 인디케이터를 항상 동기화
    visibilityObserver = new MutationObserver(function () {
      if (!isResultVisible()) {
        hideIndicator();
        disposeContentObservers();
        return;
      }
      onResultVisible();
    });
    visibilityObserver.observe(rp, { attributes: true, attributeFilter: ['style', 'class'] });

    /* 이미 표시 중인 경우 즉시 초기화 */
    if (rp.style.display !== 'none' && isDisplayed(rp)) onResultVisible();
  }

  function disposeContentObservers() {
    if (revealObserver) { revealObserver.disconnect(); revealObserver = null; }
    if (sectionObserver) { sectionObserver.disconnect(); sectionObserver = null; }
    if (lateRevealObserver) { lateRevealObserver.disconnect(); lateRevealObserver = null; }
    if (resultPageObserver) { resultPageObserver.disconnect(); resultPageObserver = null; }
  }

  function disposeObservers() {
    disposeContentObservers();
    if (visibilityObserver) { visibilityObserver.disconnect(); visibilityObserver = null; }
  }

  /* DOMContentLoaded or immediate */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('pagehide', disposeObservers, { once: true });

})();