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

  // 캐릭터를 정하지 않은 상담 입구(하단 상담 탭)는 연이 상담으로 연다. 라이트·다크 모드와 상관없이 상담 캐릭터는 연이 하나다.
  // 정적 href(/fortune-chat/)는 그대로 두고, 홈 상담 카드(#fortuneGatewayEntry)는 data-chat-character 로 고정돼 있어 여기서 바꾸지 않는다.
  var chatDoors = document.querySelectorAll('[data-cdh-chat-entry]:not([data-chat-character])');
  for (var i = 0; i < chatDoors.length; i += 1) chatDoors[i].setAttribute('href', '/fortune-chat/?character=yeoni');

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
    var benefit = document.getElementById('cdhSignupBenefit');
    if (benefit) {
      var hiddenToday = false;
      try { hiddenToday = Number(localStorage.getItem('cd_signup_benefit_exit_hide_until_v1') || 0) > Date.now(); } catch (_) {}
      benefit.hidden = authCard.dataset.authState !== 'guest' || hiddenToday;
    }
  }
  syncAccountState();
  if (authCard && window.MutationObserver) new MutationObserver(syncAccountState).observe(authCard, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-auth-state'] });
  // 마이는 읽기 전용 요약이다. 프로필/퀘스트 조작은 단일 원본 카드에서만 한다.
  var accountSheet = document.getElementById('cdAccountSheet');
  function gardenText(key, fallback, vars) {
    return typeof window.cdTranslate === 'function' ? window.cdTranslate('home.myGarden.' + key, vars || {}, fallback) : fallback.replace(/\{(\w+)\}/g, function(match, name) { return vars && vars[name] != null ? vars[name] : match; });
  }
  function syncGardenProfile() {
    if (!accountSheet) return;
    var profile = window.__cdCurrentDestinyProfile;
    var name = accountSheet.querySelector('[data-my-profile-name]');
    var description = accountSheet.querySelector('[data-my-profile-description]');
    var growth = accountSheet.querySelector('[data-my-growth]');
    if (name) name.textContent = profile && profile.name ? profile.name : gardenText('garden', '나의 달빛 정원');
    if (description) description.textContent = profile ? gardenText('profileDescription', '내 프로필과 함께, 오늘의 좋은 흐름을 가꿔요.') : gardenText('emptyDescription', '프로필을 만들고 나를 알아가는 여정을 시작해요.');
    if (!growth) return;
    var snap = window.CDLevel && window.CDLevel.snapshot();
    growth.hidden = !snap;
    if (!snap) return;
    growth.querySelector('strong').textContent = 'Lv. ' + snap.currentLevel;
    var progress = growth.querySelector('progress');
    progress.max = snap.nextLevelExp || 1;
    progress.value = snap.currentLevel >= window.CDLevel.maxLevel ? progress.max : snap.currentLevelExp;
    growth.querySelector('p').textContent = snap.currentLevel < window.CDLevel.maxLevel
      ? gardenText('next', '다음 레벨까지 경험치 {exp}', { exp: Math.max(0, snap.nextLevelExp - snap.currentLevelExp).toLocaleString() }) + ' · ' + gardenText('today', '오늘의 실천 {done}/{total}', { done: snap.completedQuestIds.length, total: snap.quests.length })
      : gardenText('max', '마지막 레벨에 도달했어요. 오늘도 나의 흐름을 가꿔요.');
    var settings = accountSheet.querySelector('.my-garden-settings');
    if (settings && !snap.loggedIn) settings.open = true;
  }
  if (accountSheet) accountSheet.addEventListener('cd:sheet-open', syncGardenProfile);
  document.addEventListener('cd:profile-card-published', syncGardenProfile);
  syncGardenProfile();
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
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.innerHTML = '<div class="cd-yn-portal-overlay__scene"><span class="cd-yn-portal-overlay__moon" aria-hidden="true"></span><span class="cd-yn-portal-overlay__portrait"><img src="/assets/yeongnyangi/original/hero-480.webp" width="480" height="480" alt="" decoding="async"></span><p class="cd-yn-portal-overlay__title">영냥이의 달빛 점술방</p><p class="cd-yn-portal-overlay__note">달빛을 따라, 이야기가 이어지는 곳으로</p><span class="cd-yn-portal-overlay__line" aria-hidden="true"></span></div>';
    // Use textContent: translations must never become executable markup.
    if (typeof window.cdTranslate === 'function') {
      overlay.querySelector('.cd-yn-portal-overlay__title').textContent = window.cdTranslate('home.globalReading.title', {}, '영냥이의 달빛 점술방');
      overlay.querySelector('.cd-yn-portal-overlay__note').textContent = window.cdTranslate('home.globalReading.arrival', {}, '달빛을 따라, 당신의 질문이 닿는 곳으로');
    }
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

  // 최애 케미 카드가 절반 이상 보였을 때 한 번만 노출을 센다. 개인정보는 싣지 않는다.
  (function trackChemiCardImpression() {
    var card = document.querySelector('[data-cdh-chemi]');
    if (!card || typeof window.IntersectionObserver !== 'function') return;
    var observer = new window.IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.5) return;
        observer.disconnect();
        if (typeof window.cdTrack === 'function') window.cdTrack('home_card_impression', { card: 'destiny_bias_chemi', placement: 'home_top' });
      });
    }, { threshold: [0.5] });
    observer.observe(card);
  })();

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
    if (target.closest('[data-cd-service-index-jump]')) {
      event.preventDefault();
      location.hash = 'cdFinder';
    }
  }, true);

  // "내 이용권" 줄 — 표시 전용이다. 상담 한 건을 무엇으로 차감할지는 서버(consumePassForFeature·영냥이 funding claim)가 정한다.
  // 꽃돼지 이용권은 /api/me/access-state 의 passUsage(서버 계산 건당 한도·남은 한도), 영냥이 세트는 지갑 API 값을 그대로 보여 준다.
  // 구 한도표(vvip 20,000원 등)로 다시 계산하지 않는다 — 정책 버전마다 건당 한도가 달라서 화면이 실제 차감과 어긋난다.
  var myPass = document.getElementById('cdhMyPass');
  var myPassList = document.getElementById('cdhMyPassList');
  var PASS_TIER_COPY = { standard: ['passStandard', '작은 꿀단지'], premium: ['passPremium', '중간 꿀단지'], vvip: ['passVvip', '큰 꿀단지'], family: ['passFamily', '패밀리 꿀단지'] };
  var FISH_COPY = { mackerel: ['fishMackerel', '고등어'], salmon: ['fishSalmon', '연어'], flounder: ['fishFlounder', '광어'], tuna: ['fishTuna', '참치'] };
  var myPassUserId = '';
  var myPassFlower = null;
  var myPassPacks = [];
  var myPassWalletFor = '';
  var myPassSignature = '';
  function wonText(value) { return Number(value || 0).toLocaleString('en-US'); }
  function myPassNode(tag, className, key, vars, ko) {
    var node = document.createElement(tag);
    node.className = className;
    node.setAttribute('data-cd-trans', key);
    if (vars) node.setAttribute('data-cd-vars', JSON.stringify(vars));
    node.textContent = typeof window.cdTranslate === 'function' ? window.cdTranslate(key, vars || {}, ko) : ko;
    return node;
  }
  function myPassDate(value) {
    var time = Date.parse(value);
    if (!Number.isFinite(time)) return '';
    var lang = typeof window.cdGetCurrentLanguage === 'function' ? window.cdGetCurrentLanguage() : 'ko';
    try { return new Intl.DateTimeFormat(lang || 'ko', { dateStyle: 'medium' }).format(new Date(time)); } catch (_) { return new Date(time).toISOString().slice(0, 10); }
  }
  function flowerFromSnapshot(snapshot) {
    var ent = snapshot && snapshot.entitlementSnapshot;
    var tier = ent && String(ent.tier || '').toLowerCase();
    if (!ent || !PASS_TIER_COPY[tier] || !Array.isArray(ent.activePasses) || !ent.activePasses.length) return null;
    var usage = ent.passUsage && ent.passUsage.tier === tier ? ent.passUsage : null;
    return { tier: tier, usage: usage };
  }
  function renderMyPass() {
    if (!myPass || !myPassList) return;
    var packs = myPassPacks.filter(function (pack) { return pack && pack.available && Number(pack.remainingUses) > 0; })
      .sort(function (a, b) { return Date.parse(a.expiresAt) - Date.parse(b.expiresAt); });
    var signature = JSON.stringify([myPassFlower, packs, typeof window.cdGetCurrentLanguage === 'function' ? window.cdGetCurrentLanguage() : 'ko']);
    if (signature === myPassSignature) return;
    myPassSignature = signature;
    myPassList.textContent = '';
    if (myPassFlower) {
      var item = document.createElement('li');
      item.className = 'cdh-mypass__item';
      item.setAttribute('data-my-pass', 'flower');
      item.setAttribute('data-pass-tier', myPassFlower.tier);
      var tierCopy = PASS_TIER_COPY[myPassFlower.tier];
      var usage = myPassFlower.usage;
      item.appendChild(myPassNode('span', 'cdh-mypass__kind', 'home.passCopy.flowerPass', null, '🌸 꽃돼지 달빛 이용권'));
      item.appendChild(myPassNode('strong', 'cdh-mypass__name', 'home.overseasCopy.' + tierCopy[0], null, tierCopy[1]));
      if (usage) {
        if (usage.perItemLimitKRW === null) item.appendChild(myPassNode('span', 'cdh-mypass__line', 'home.overseasCopy.passNoLimit', null, '유료 리딩 건당 한도 없음'));
        else item.appendChild(myPassNode('span', 'cdh-mypass__line', 'home.overseasCopy.passPerLimit', { amount: wonText(usage.perItemLimitKRW) }, '건당 ' + wonText(usage.perItemLimitKRW) + '원 이하'));
        item.appendChild(myPassNode('span', 'cdh-mypass__line cdh-mypass__line--muted', 'home.passCopy.budgetLeft', { amount: wonText(usage.remainingKRW) }, '남은 한도 ' + wonText(usage.remainingKRW) + '원'));
      }
      myPassList.appendChild(item);
    }
    if (packs.length) {
      var first = packs[0];
      var fish = FISH_COPY[first.fishId];
      var packItem = document.createElement('li');
      packItem.className = 'cdh-mypass__item';
      packItem.setAttribute('data-my-pass', 'yeongnyangi');
      packItem.setAttribute('data-pack-fish', String(first.fishId || ''));
      packItem.appendChild(myPassNode('span', 'cdh-mypass__kind', 'home.passCopy.packPass', null, '영냥이 전용 이용권'));
      if (fish) packItem.appendChild(myPassNode('strong', 'cdh-mypass__name', 'home.passCopy.packName', { fish: '@home.passCopy.' + fish[0], total: String(first.totalUses) }, fish[1] + ' 세트 ' + first.totalUses + '회'));
      else {
        var name = document.createElement('strong');
        name.className = 'cdh-mypass__name';
        name.textContent = String(first.label || '');
        packItem.appendChild(name);
      }
      packItem.appendChild(myPassNode('span', 'cdh-mypass__line', 'home.passCopy.packRemaining', { total: String(first.totalUses), remaining: String(first.remainingUses) }, first.totalUses + '회 중 ' + first.remainingUses + '회 남음'));
      var until = myPassDate(first.expiresAt);
      if (until) packItem.appendChild(myPassNode('span', 'cdh-mypass__line cdh-mypass__line--muted', 'home.passCopy.packExpires', { date: until }, until + '까지'));
      if (packs.length > 1) packItem.appendChild(myPassNode('span', 'cdh-mypass__line cdh-mypass__line--muted', 'home.passCopy.packOthers', { count: String(packs.length - 1) }, '외 ' + (packs.length - 1) + '개 세트 보유'));
      myPassList.appendChild(packItem);
    }
    myPass.hidden = !myPassList.children.length;
  }
  function loadPackWallet(userId) {
    myPassWalletFor = userId;
    fetch('/api/payments/service-packs/wallet', { credentials: 'include', cache: 'no-store' }).then(function (response) {
      return response.ok ? response.json() : null;
    }).then(function (payload) {
      if (myPassUserId !== userId) return;
      myPassPacks = payload && payload.ok && Array.isArray(payload.packs) ? payload.packs : [];
      renderMyPass();
    }).catch(function () {
      if (myPassUserId !== userId) return;
      myPassPacks = [];
      renderMyPass();
    });
  }
  function syncMyPass(snapshot) {
    var userId = snapshot && String(snapshot.userId || '');
    if (userId !== myPassUserId) {
      myPassUserId = userId;
      myPassPacks = [];
      myPassWalletFor = '';
    }
    myPassFlower = userId ? flowerFromSnapshot(snapshot) : null;
    if (userId && myPassWalletFor !== userId) loadPackWallet(userId);
    renderMyPass();
  }
  if (myPass && window.CodeDestinyAccessStore && typeof window.CodeDestinyAccessStore.subscribe === 'function') {
    window.CodeDestinyAccessStore.subscribe(syncMyPass);
    // 상담에서 돌아오면(bfcache) 영냥이 세트 잔여 횟수가 바뀌었을 수 있다.
    window.addEventListener('pageshow', function (event) {
      if (event.persisted && myPassUserId) loadPackWallet(myPassUserId);
    });
  }

  window.addEventListener('hashchange', route);
  window.addEventListener('pageshow', clearPortalOverlay);
  if (new URLSearchParams(location.search).get('action') === 'cdOneStepFreeSajuEntry') revealInput();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', route, { once: true });
  else route();
})();
