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

  // 홈의 유일한 접기는 "연이의 정원"(<details id="cdhMore">)이다. 상태는 details.open 하나뿐이고
  // 저장하지 않는다 — 재방문은 늘 닫힌 채 시작한다. 정원을 여닫는 다른 코드는 이 두 함수를 부른다.
  var gardenSummary = more ? more.querySelector(':scope > summary') : null;
  function syncGarden() {
    if (!gardenSummary) return;
    gardenSummary.setAttribute('aria-expanded', more.open ? 'true' : 'false');
  }
  function openGarden() {
    if (!more) return;
    if (!more.open) more.open = true;
    syncGarden();
  }
  function closeGarden() {
    if (!more || !more.open) return;
    var focusInside = more.contains(document.activeElement) && document.activeElement !== gardenSummary;
    more.open = false;
    syncGarden();
    if (!gardenSummary) return;
    // 닫힌 정원 안에 포커스를 남기지 않는다. 내용이 접혀 문서가 줄어든 뒤 요약 줄이 화면 밖이면
    // 가장 가까운 가장자리로만 맞춘다(맨 위로 튀지 않게).
    if (focusInside) {
      try { gardenSummary.focus({ preventScroll: true }); } catch (_) { gardenSummary.focus(); }
    }
    var rect = gardenSummary.getBoundingClientRect();
    if (rect.top < 0 || rect.bottom > window.innerHeight) gardenSummary.scrollIntoView({ block: 'nearest' });
  }
  window.__cdOpenGarden = openGarden;
  window.__cdCloseGarden = closeGarden;
  if (more) {
    if (gardenSummary) gardenSummary.setAttribute('aria-controls', 'cdhGardenBody');
    syncGarden();
    more.addEventListener('toggle', syncGarden);
    more.addEventListener('click', function (event) {
      if (event.target instanceof Element && event.target.closest('[data-cdh-garden-close]')) closeGarden();
    });
  }

  // 캐릭터를 정하지 않은 상담 입구(하단 상담 탭)는 지금 홈 테마(연이·네오)의 상담 캐릭터로 연다. 정적 href(/fortune-chat/)는 그대로 둔다.
  // 홈의 두 상담 카드(#fortuneGatewayEntry)는 data-chat-character 로 캐릭터가 고정돼 있어 여기서 바꾸지 않는다.
  var chatDoors = document.querySelectorAll('[data-cdh-chat-entry]:not([data-chat-character])');
  function syncChatDoor() {
    var href = '/fortune-chat/?character=' + (doc.classList.contains('neo-mode') ? 'neo' : 'yeoni');
    for (var i = 0; i < chatDoors.length; i += 1) chatDoors[i].setAttribute('href', href);
  }
  if (chatDoors.length) {
    syncChatDoor();
    if (window.MutationObserver) new MutationObserver(syncChatDoor).observe(doc, { attributes: true, attributeFilter: ['class'] });
  }

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
  var authCard = move('#authQuickLinks', 'cdAccountSheetCard');
  // 헤더 계정 버튼 글자(로그인/내 계정)는 시트 안 로그인 카드가 회원 카드인지로 정한다.
  var accountBtn = document.getElementById('cdhAccountBtn');
  function syncAccountState() {
    if (!accountBtn || !authCard) return;
    accountBtn.setAttribute('data-auth', authCard.querySelector('.cd-user-card') ? 'member' : 'guest');
  }
  syncAccountState();
  if (authCard && window.MutationObserver) new MutationObserver(syncAccountState).observe(authCard, { childList: true, subtree: true });
  move('#langWrap', 'cdhLanguageSlot');
  move('#cdMobileHeader .theme-switch-wrapper--appbar', 'cdhThemeSlot');
  move('#dpKakaoReferralShareBtn', 'cdhShareControls');
  move('#dpKakaoReferralNote', 'cdhShareControls');

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
    // 정원 안의 앵커(#cdhPass 등)로 들어오면 정원만 열고 대상으로 이동한다. 검색은 정원 밖이다.
    if (more && folded && more.contains(folded) && !more.open) {
      openGarden();
      if (!isFinder) requestAnimationFrame(function () { folded.scrollIntoView({ block: 'start' }); });
    }
    if (isFinder) {
      doc.classList.remove('cdh-input-open');
      services.hidden = false;
      var filter = hash.split('/')[1] || '';
      if (filter !== lastFilter) {
        services.querySelectorAll('[aria-pressed="true"]').forEach(function (chip) { chip.click(); });
        var chip = services.querySelector(filter === 'tarot'
          ? '[data-method="tarot"]'
          : '[data-purpose="' + filter.replace(/[^a-z]/g, '') + '"]');
        // 필터 패널 안의 칩(가족·인생 등)은 패널을 열어 눌린 상태가 보이게 한다.
        if (chip && chip.closest('.fortune-gateway__filter-panel')) chip.closest('.fortune-gateway__filter-panel').open = true;
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
      window.scrollTo(0, 0);
    } else if (hash === 'destinyCardForm') {
      revealInput();
    }
  }

  var portalMoving = false;
  function portalReducedMotion() {
    try {
      return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (_) {
      return false;
    }
  }
  function markPortalJourney(link) {
    try {
      window.sessionStorage.setItem('cd:yeongnyangi:portal-entry', JSON.stringify({
        at: Date.now(),
        from: 'ggulggul',
        placement: link.getAttribute('data-cd-portal-placement') || 'home'
      }));
    } catch (_) {}
  }
  function clearPortalOverlay() {
    portalMoving = false;
    doc.classList.remove('cd-yn-portal-active');
    document.querySelectorAll('.cd-yn-portal-overlay').forEach(function (node) { node.remove(); });
    document.querySelectorAll('.cdh-yn-portal.is-entering').forEach(function (node) { node.classList.remove('is-entering'); });
  }
  function enterYeongnyangiPortal(link) {
    if (portalMoving) return;
    portalMoving = true;
    markPortalJourney(link);
    link.classList.add('is-entering');
    doc.classList.add('cd-yn-portal-active');
    var overlay = document.createElement('div');
    overlay.className = 'cd-yn-portal-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = '<div class="cd-yn-portal-overlay__scene"><span class="cd-yn-portal-overlay__moon" aria-hidden="true"></span><span class="cd-yn-portal-overlay__portrait"><img src="/assets/yeongnyangi/original/avatar.webp" width="160" height="160" alt="" decoding="async"></span><p class="cd-yn-portal-overlay__title">영냥이의 달빛 점술방</p><p class="cd-yn-portal-overlay__note">달빛을 따라, 이야기가 이어지는 곳으로</p><span class="cd-yn-portal-overlay__line" aria-hidden="true"></span></div>';
    document.body.appendChild(overlay);
    window.setTimeout(function () {
      try {
        window.location.assign(link.href);
      } catch (_) {
        clearPortalOverlay();
      }
    }, 640);
    window.setTimeout(clearPortalOverlay, 2500);
  }

  document.addEventListener('click', function (event) {
    var target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    var portal = target.closest('[data-cd-portal-link]');
    if (portal && portal.href && !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      markPortalJourney(portal);
      if (!portalReducedMotion()) {
        event.preventDefault();
        enterYeongnyangiPortal(portal);
      }
      return;
    }
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
  window.addEventListener('pageshow', clearPortalOverlay);
  if (new URLSearchParams(location.search).get('action') === 'cdOneStepFreeSajuEntry') revealInput();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', route, { once: true });
  else route();
})();
