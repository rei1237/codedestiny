/* Home composition controller. Existing nodes and handlers are rehomed; no feature, auth or payment logic is duplicated. */
(function () {
  'use strict';
  var home = document.getElementById('cdHomeFunnel');
  if (!home) return;
  var services = document.getElementById('cdhServices');
  var formPanel = document.getElementById('dpDestinyPanel');
  var form = document.getElementById('destinyCardForm');
  var doc = document.documentElement;
  var lastFilter = null;
  var finderDisclosure = document.getElementById('cdhFinderDisclosure');
  var more = document.getElementById('cdhMore');
  var bubble = home.querySelector('[data-cdh-bubble]');
  var bubbleIndex = 0;
  // [사전 키, ko 원문]. 키와 원문을 요소에 같이 옮겨야 언어 전환이 지금 줄을 번역·복원한다.
  var bubbleLines = bubble ? [
    ['home.gardenCopy.bubble1', '안녕하세요! 꽃돼지 연이예요.'],
    ['home.gardenCopy.bubble2', '오늘 마음은 어떤 색이에요?'],
    ['home.gardenCopy.bubble3', '타로 세 장부터 가볍게 펼쳐 봐요!'],
    ['home.gardenCopy.bubble4', '고민은 천천히, 끝까지 들을게요.']
  ] : [];
  var collectionToggle = document.getElementById('cdHomeExpandToggle');
  if (collectionToggle) collectionToggle.setAttribute('aria-controls', 'cdhCollections');
  if (finderDisclosure) finderDisclosure.addEventListener('toggle', function () {
    if (finderDisclosure.open) document.dispatchEvent(new Event('cd:home-finder-open'));
  });

  function move(selector, slotId) {
    var node = document.querySelector(selector);
    var slot = document.getElementById(slotId);
    if (!node || !slot || slot.contains(node)) return node;
    slot.appendChild(node);
    return node;
  }

  // Keep one authoritative instance of every established home surface.
  // These start hidden, so relocating them preserves initial layout and script order.
  move('#featureBegin', 'cdhCollections');
  move('#inputPage > .feature-card-grid', 'cdhCollections');
  // Fullscreen cards need their original top-level parent, outside home containment.
  if (window.CodeDestinyNavigationStore) {
    window.CodeDestinyNavigationStore.subscribe(function (state) {
      move('.feature-card-grid', state.fullscreenPage === 'all-fortunes' ? 'inputPage' : 'cdhCollections');
    });
  }
  move('#cdCookieConsent', 'cdhCookieSlot');
  move('#authQuickLinks', 'cdhAccountSlot');
  move('#langWrap', 'cdhLanguageSlot');
  move('#cdMobileHeader .theme-switch-wrapper--appbar', 'cdhThemeSlot');
  move('#dpKakaoReferralShareBtn', 'cdhShareControls');
  move('#dpKakaoReferralNote', 'cdhShareControls');
  var reviews = document.getElementById('cdReviews');
  var reviewSlot = document.getElementById('cdhReviewsSlot');
  if (reviews && reviewSlot && (reviews.hidden || reviews.getAttribute('aria-hidden') === 'true')) reviewSlot.hidden = true;

  function revealInput() {
    doc.classList.add('cdh-input-open');
    services.hidden = true;
    if (window.__cdOpenDestinyForm) window.__cdOpenDestinyForm();
    requestAnimationFrame(function () {
      if (form && form.getBoundingClientRect().height) form.scrollIntoView({ block: 'start' });
    });
  }

  if (formPanel && window.MutationObserver) {
    new MutationObserver(function () {
      if (formPanel.classList.contains('is-form-open') && form && formPanel.contains(form)) {
        doc.classList.add('cdh-input-open');
        requestAnimationFrame(function () { form.scrollIntoView({ block: 'start' }); });
      }
    }).observe(formPanel, { attributes: true, attributeFilter: ['class'] });
  }

  function route() {
    var hash = location.hash.slice(1);
    var isFinder = hash === 'services' || hash.indexOf('services/') === 0 || hash === 'cdServiceIndex' || hash === 'cdFinder';
    // 검색 섹션(#cdFinder)은 홈 안에 있다. 홈을 숨기면 해시 진입이 빈 화면이 된다.
    home.hidden = false;
    var folded = document.getElementById(isFinder ? 'cdFinder' : hash);
    // "더 둘러보기" 접힘 안의 앵커(#cdhFeatured 등)로 들어오면 접힘을 열고 대상으로 이동한다.
    if (more && folded && more.contains(folded) && !more.open) {
      more.open = true;
      if (!isFinder) requestAnimationFrame(function () { folded.scrollIntoView({ block: 'start' }); });
    }
    if (isFinder) {
      doc.classList.remove('cdh-input-open');
      if (finderDisclosure) finderDisclosure.open = true;
      document.dispatchEvent(new Event('cd:home-finder-open'));
      var filter = hash.split('/')[1] || '';
      if (filter !== lastFilter) {
        services.querySelectorAll('[aria-pressed="true"]').forEach(function (chip) { chip.click(); });
        var chip = services.querySelector(filter === 'tarot'
          ? '[data-method="tarot"]'
          : '[data-purpose="' + filter.replace(/[^a-z]/g, '') + '"]');
        if (chip) chip.click();
        lastFilter = filter;
      }
      requestAnimationFrame(function () {
        var finder = document.getElementById('cdFinder');
        var input = document.getElementById('fortuneGatewaySearch');
        if (finder) finder.scrollIntoView({ block: 'start' });
        try { if (input) input.focus({ preventScroll: true }); } catch (_) {}
      });
    } else if (hash === 'home') {
      doc.classList.remove('cdh-input-open');
      services.hidden = false;
      if (finderDisclosure) finderDisclosure.open = false;
      if (window.__cdCollapseHome) window.__cdCollapseHome();
      window.scrollTo(0, 0);
    } else if (hash === 'destinyCardForm') {
      revealInput();
    }
  }

  document.addEventListener('click', function (event) {
    var target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    // data-action 진입점(퀵 서비스 사주 카드)은 공용 디스패처가 실행한다. 여기서도 부르면 두 번 돈다.
    var freeEntry = target.closest('[data-cdh-free]');
    if (freeEntry && !freeEntry.hasAttribute('data-action')) {
      event.preventDefault();
      revealInput();
      if (typeof window.cdOneStepFreeSajuEntry === 'function') window.cdOneStepFreeSajuEntry();
      else if (form) {
        form.scrollIntoView({ block: 'start' });
        var firstInput = form.querySelector('input');
        if (firstInput) firstInput.focus({ preventScroll: true });
      }
    }
    if (target.closest('#cdMobileBottomNav [data-nav-key="home"]')) {
      doc.classList.remove('cdh-input-open');
      home.hidden = false;
      services.hidden = false;
      if (location.hash.indexOf('services') !== -1) history.replaceState(null, '', location.pathname + location.search);
    }
    if (bubble && target.closest('[data-cdh-bubble], #honeypigLogo')) {
      bubbleIndex = (bubbleIndex + 1) % bubbleLines.length;
      var line = bubbleLines[bubbleIndex];
      bubble.setAttribute('data-cd-trans', line[0]);
      bubble.setAttribute('data-cd-origin-text', line[1]);
      bubble.textContent = typeof window.cdTranslate === 'function' ? window.cdTranslate(line[0], null, line[1]) : line[1];
    }
    if (target.closest('[data-cd-service-index-jump]')) {
      event.preventDefault();
      location.hash = 'cdFinder';
    }
  }, true);

  window.addEventListener('hashchange', route);
  if (new URLSearchParams(location.search).get('action') === 'cdOneStepFreeSajuEntry') revealInput();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', route, { once: true });
  else route();
})();
