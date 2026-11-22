/* Home composition controller. Existing nodes and handlers are rehomed; no feature, auth or payment logic is duplicated. */
(function () {
  'use strict';
  var home = document.getElementById('cdHomeFunnel');
  if (!home) return;

  // Decorative CSS scenes run only while visible; the content never depends on motion.
  var moonlitTargets = home.querySelectorAll('.cdh-hero, .cd-choice__crest, .cd-sig__samples-link');
  if (moonlitTargets.length && typeof IntersectionObserver === 'function') {
    var moonlitObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.toggleAttribute('data-moonlit-visible', entry.isIntersecting && entry.intersectionRatio >= 0.35);
      });
    }, { threshold: [0, 0.35] });
    moonlitTargets.forEach(function (target) { moonlitObserver.observe(target); });
    function pauseMoonlight() { home.toggleAttribute('data-moonlit-paused', document.hidden); }
    document.addEventListener('visibilitychange', pauseMoonlight);
    pauseMoonlight();
  }

  // Progressive tabs retain the existing cards, links and tracking attributes.
  var consultationTabs = home.querySelector('[data-consult-tabs]');
  if (consultationTabs) {
    var tabs = Array.prototype.slice.call(consultationTabs.querySelectorAll('[data-consult-tab]'));
    var panels = tabs.map(function (tab) { return document.getElementById(tab.getAttribute('aria-controls')); });
    function selectConsultation(index, focus) {
      tabs.forEach(function (tab, i) {
        tab.setAttribute('aria-selected', String(i === index));
        tab.tabIndex = i === index ? 0 : -1;
        panels[i].hidden = i !== index;
      });
      if (focus) tabs[index].focus({ preventScroll: true });
    }
    if (panels.every(Boolean)) {
      panels.forEach(function (panel, i) { panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', tabs[i].id); });
      consultationTabs.hidden = false;
      tabs.forEach(function (tab, i) {
        tab.addEventListener('click', function () { selectConsultation(i, false); });
        tab.addEventListener('keydown', function (event) {
          var next = event.key === 'ArrowRight' ? (i + 1) % tabs.length : event.key === 'ArrowLeft' ? (i + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
          if (next < 0) return;
          event.preventDefault(); selectConsultation(next, true);
        });
      });
      function revealConsultationHash() {
        var target = document.getElementById(location.hash.slice(1));
        var index = panels.findIndex(function (panel) { return target && panel.contains(target); });
        if (index >= 0) selectConsultation(index, false);
      }
      selectConsultation(0, false);
      revealConsultationHash();
      window.addEventListener('hashchange', revealConsultationHash);
    }
  }
  var concernRail = home.querySelector('.cd-concern__cards');
  var concernControls = home.querySelector('[data-concern-scroll]');
  if (concernRail && concernControls) {
    var previousConcern = concernControls.querySelector('[data-concern-prev]');
    var nextConcern = concernControls.querySelector('[data-concern-next]');
    concernControls.hidden = false;
    function syncConcernArrows() {
      var left = concernRail.scrollLeft, width = concernRail.clientWidth, total = concernRail.scrollWidth;
      previousConcern.disabled = left <= 2;
      nextConcern.disabled = left + width >= total - 2;
    }
    function scrollConcerns(direction) {
      concernRail.scrollBy({ left: direction * concernRail.clientWidth * .9, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
    previousConcern.addEventListener('click', function () { scrollConcerns(-1); });
    nextConcern.addEventListener('click', function () { scrollConcerns(1); });
    var concernFrame = 0;
    concernRail.addEventListener('scroll', function () {
      if (!concernFrame) concernFrame = requestAnimationFrame(function () { concernFrame = 0; syncConcernArrows(); });
    }, { passive: true });
    window.addEventListener('resize', syncConcernArrows);
    syncConcernArrows();
  }

  // Signature banner: one consultation at a time, auto-advancing only while visible and idle.
  // The comparison list and the moonlight letter popup below keep their own controls.
  var signatureBanner = home.querySelector('[data-sig-banner]');
  var bannerSlides = signatureBanner ? Array.prototype.slice.call(signatureBanner.querySelectorAll('[data-sig-banner-slide]')) : [];
  var bannerControls = signatureBanner && signatureBanner.querySelector('[data-sig-banner-controls]');
  if (bannerSlides.length > 1 && bannerControls) {
    var bannerTrack = signatureBanner.querySelector('.cd-sig-banner__track');
    var bannerPrevious = bannerControls.querySelector('[data-sig-banner-prev]');
    var bannerNext = bannerControls.querySelector('[data-sig-banner-next]');
    var bannerPause = bannerControls.querySelector('[data-sig-banner-pause]');
    var bannerPosition = bannerControls.querySelector('[data-sig-banner-position]');
    var bannerDots = Array.prototype.slice.call(bannerControls.querySelectorAll('[data-sig-banner-dot]'));
    var bannerMotion = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    var BANNER_INTERVAL = 5000, BANNER_GRACE = 12000;
    var bannerIndex = 0, bannerPaused = false, bannerVisible = typeof IntersectionObserver !== 'function', bannerHover = false;
    var bannerTimer = 0, bannerManualUntil = 0, bannerTouch = null;
    function bannerBlockingModal() {
      return Array.prototype.some.call(document.querySelectorAll('dialog[open],[aria-modal="true"]:not([hidden])'), function (node) {
        return node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
      });
    }
    function bannerIdle() {
      return !bannerPaused && !bannerMotion.matches && bannerVisible && !bannerHover && !document.hidden && !bannerBlockingModal();
    }
    function renderBanner(nextIndex) {
      bannerIndex = (nextIndex + bannerSlides.length) % bannerSlides.length;
      bannerSlides.forEach(function (slide, index) {
        var active = index === bannerIndex;
        slide.toggleAttribute('data-active', active);
        if (active) slide.removeAttribute('inert'); else slide.setAttribute('inert', '');
      });
      bannerDots.forEach(function (dot, index) { dot.setAttribute('aria-pressed', String(index === bannerIndex)); });
      if (bannerPosition) bannerPosition.textContent = (bannerIndex + 1) + ' / ' + bannerSlides.length;
    }
    function scheduleBanner() {
      window.clearTimeout(bannerTimer); bannerTimer = 0;
      if (bannerPause) {
        bannerPause.hidden = !!bannerMotion.matches;
        bannerPause.setAttribute('aria-pressed', String(bannerPaused));
        bannerPause.setAttribute('aria-label', bannerPaused ? '대표 상담 자동 넘김 다시 시작' : '대표 상담 자동 넘김 멈추기');
      }
      if (bannerTrack) bannerTrack.setAttribute('aria-live', bannerPaused || bannerMotion.matches ? 'polite' : 'off');
      if (!bannerIdle()) return;
      var wait = Math.max(BANNER_INTERVAL, bannerManualUntil - Date.now());
      bannerTimer = window.setTimeout(function () {
        bannerTimer = 0;
        if (bannerIdle()) renderBanner(bannerIndex + 1);
        scheduleBanner();
      }, wait);
    }
    function moveBanner(index) {
      var focusInSlide = bannerSlides.some(function (slide) { return slide.contains(document.activeElement); });
      bannerManualUntil = Date.now() + BANNER_GRACE;
      renderBanner(index);
      // Keyboard users never land on an inert slide.
      if (focusInSlide) {
        var link = bannerSlides[bannerIndex].querySelector('a[href]');
        if (link) link.focus({ preventScroll: true });
      }
      scheduleBanner();
    }
    bannerControls.hidden = false;
    if (bannerPrevious) bannerPrevious.addEventListener('click', function () { moveBanner(bannerIndex - 1); });
    if (bannerNext) bannerNext.addEventListener('click', function () { moveBanner(bannerIndex + 1); });
    bannerDots.forEach(function (dot) { dot.addEventListener('click', function () { moveBanner(Number(dot.getAttribute('data-sig-banner-dot')) || 0); }); });
    var pausedBeforePointer;
    if (bannerPause) bannerPause.addEventListener('pointerdown', function () { pausedBeforePointer = bannerPaused; });
    if (bannerPause) bannerPause.addEventListener('click', function (event) {
      bannerPaused = !(event.detail && pausedBeforePointer !== undefined ? pausedBeforePointer : bannerPaused);
      pausedBeforePointer = undefined;
      if (!bannerPaused) bannerManualUntil = 0;
      scheduleBanner();
    });
    signatureBanner.addEventListener('keydown', function (event) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      moveBanner(bannerIndex + (event.key === 'ArrowRight' ? 1 : -1));
    });
    signatureBanner.addEventListener('touchstart', function (event) {
      var touch = event.changedTouches && event.changedTouches[0];
      bannerTouch = touch ? { x: touch.clientX, y: touch.clientY } : null;
    }, { passive: true });
    signatureBanner.addEventListener('touchend', function (event) {
      var touch = event.changedTouches && event.changedTouches[0];
      var start = bannerTouch; bannerTouch = null;
      if (!touch || !start) return;
      var dx = touch.clientX - start.x, dy = touch.clientY - start.y;
      if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return;
      moveBanner(bannerIndex + (dx < 0 ? 1 : -1));
    }, { passive: true });
    signatureBanner.addEventListener('mouseenter', function () { bannerHover = true; scheduleBanner(); });
    signatureBanner.addEventListener('mouseleave', function () { bannerHover = false; scheduleBanner(); });
    signatureBanner.addEventListener('focusin', function (event) {
      if (!signatureBanner.contains(event.relatedTarget)) bannerPaused = true;
      scheduleBanner();
    });
    signatureBanner.addEventListener('focusout', function () { requestAnimationFrame(scheduleBanner); });
    if (typeof bannerMotion.addEventListener === 'function') bannerMotion.addEventListener('change', scheduleBanner);
    else if (typeof bannerMotion.addListener === 'function') bannerMotion.addListener(scheduleBanner);
    document.addEventListener('visibilitychange', scheduleBanner);
    var bannerObserver = typeof IntersectionObserver === 'function' ? new IntersectionObserver(function (entries) {
      bannerVisible = entries[entries.length - 1].intersectionRatio >= 0.5;
      scheduleBanner();
    }, { threshold: [0, 0.5] }) : null;
    if (bannerObserver) bannerObserver.observe(signatureBanner);
    // Any dialog (the letter popup included) pauses the banner until it closes.
    var bannerOverlayObserver = typeof MutationObserver === 'function' ? new MutationObserver(function (changes) {
      if (changes.some(function (change) {
        if (change.type === 'childList') return Array.prototype.some.call(change.addedNodes, function (node) { return node.nodeType === 1 && (node.matches('dialog,[aria-modal="true"]') || !!node.querySelector('dialog,[aria-modal="true"]')); });
        return !!(change.target.matches && change.target.matches('dialog,[aria-modal="true"]'));
      })) scheduleBanner();
    }) : null;
    if (bannerOverlayObserver) bannerOverlayObserver.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open', 'hidden', 'aria-modal'] });
    window.addEventListener('pagehide', function () {
      window.clearTimeout(bannerTimer);
      if (bannerObserver) bannerObserver.disconnect();
      if (bannerOverlayObserver) bannerOverlayObserver.disconnect();
    }, { once: true });
    renderBanner(0);
    scheduleBanner();
  }

  function setupSignatureLetter() {
    var letter = home.querySelector('[data-signature-letter]');
    if (!letter) return;
    var path = String(location.pathname || '');
    var fixture = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /\/(?:static\/)?index\.html$/.test(path);
    if (path !== '/ggulggul/' && !fixture) return;
    var stage = letter.querySelector('[data-signature-letter-stage]');
    var slides = Array.prototype.slice.call(letter.querySelectorAll('[data-signature-letter-slide]'));
    var dots = Array.prototype.slice.call(letter.querySelectorAll('[data-signature-letter-dot]'));
    var previous = letter.querySelector('[data-signature-letter-prev]');
    var next = letter.querySelector('[data-signature-letter-next]');
    var position = letter.querySelector('[data-signature-letter-position]');
    var opener = home.querySelector('[data-signature-open]');
    var closeButton = letter.querySelector('[data-signature-letter-close]');
    var todayButton = letter.querySelector('[data-signature-letter-today]');
    if (!stage || !slides.length || !previous || !next || !position || !opener || !closeButton || !todayButton) return;
    var hideKey = 'cd_signature_consult_hide_until_v1';
    var seenKey = 'cd_signature_consult_seen_v3';
    var lockKey = 'signature-consult-popup';
    var previousFocus = null;
    var frame = 0;
    var memorySeen = '';
    var memoryHidden = 0;
    var index = 0;
    var returnDocument = isPaymentReturnDocument();
    var explicitEntry = !!location.hash || new URLSearchParams(location.search).has('action');
    function dayKey() { return new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10); }
    function read(store, key) { try { return window[store].getItem(key); } catch (_) { return null; } }
    function write(store, key, value) { try { window[store].setItem(key, value); return true; } catch (_) { return false; } }
    function isPaymentReturnDocument() {
      var RETURN_QUERY = /[?&](?:portone_redirect|paid_pass_resume|paymentId|payment_id|imp_uid)=/;
      var navigation = null;
      try { navigation = performance.getEntriesByType('navigation')[0]; } catch (_) {}
      if (RETURN_QUERY.test(location.search) || (navigation && RETURN_QUERY.test(navigation.name))) return true;
      var stores = [];
      try { stores = [localStorage, sessionStorage]; } catch (_) {}
      return stores.some(function (store) {
        try {
          var ticket = JSON.parse(store.getItem('cd_direct_payment_resume') || 'null');
          var age = Date.now() - (Number(ticket && ticket.at) || 0);
          return !!ticket && !!ticket.merchantUid && !!ticket.confirmBody && age >= 60000 && age <= 1800000;
        } catch (_) { return false; }
      });
    }
    function blocked(manual) {
      if ((!manual && document.hidden) || document.documentElement.classList.contains('cdh-input-open')) return true;
      return Array.prototype.some.call(document.querySelectorAll('dialog[open],[role="dialog"][aria-modal="true"],.payment-modal.active,#cdCookieConsent.is-visible,#tarotModalOverlay'), function (node) {
        return node !== letter && !node.hidden && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden' && getComputedStyle(node).display !== 'none';
      });
    }
    function render(nextIndex) {
      index = (nextIndex + slides.length) % slides.length;
      slides.forEach(function (slide, slideIndex) { slide.hidden = slideIndex !== index; });
      dots.forEach(function (dot, dotIndex) { dot.setAttribute('aria-pressed', String(dotIndex === index)); });
      position.textContent = (index + 1) + ' / ' + slides.length;
    }
    var desktopLetterEntry = false;
    window.addEventListener('popstate', function () {
      if (!desktopLetterEntry) return;
      desktopLetterEntry = false;
      closeLetter(true);
    });
    function closeLetter(restore) {
      if (!letter.open) return;
      letter.close();
      if (desktopLetterEntry) {
        desktopLetterEntry = false;
        if (history.state && history.state.cdSignatureLetter && restore !== false) history.back();
      }
      if (typeof window.__cdUnlockBodyScroll === 'function') window.__cdUnlockBodyScroll(lockKey);
      document.documentElement.removeAttribute('data-signature-popup-open');
      if (restore !== false && previousFocus && document.activeElement !== previousFocus && document.contains(previousFocus)) previousFocus.focus({ preventScroll: true });
      previousFocus = null;
    }
    function openLetter(manual) {
      if (letter.open) return;
      if (!manual) {
        if (returnDocument || explicitEntry || !/^ko(?:-|$)/i.test(document.documentElement.lang || 'ko')) return;
        if (memorySeen === dayKey() || read('sessionStorage', seenKey) === dayKey() || Math.max(memoryHidden, Number(read('localStorage', hideKey)) || 0) > Date.now()) return;
      }
      // A seen automatic letter must not force layout on every shell mutation.
      if (blocked(manual)) return;
      previousFocus = document.activeElement;
      memorySeen = dayKey();
      write('sessionStorage', seenKey, memorySeen);
      render(index);
      letter.showModal();
      // The mobile shell already owns its history guard. Desktop needs one entry per open letter.
      if (!window.__cdMobileNav && window.matchMedia && window.matchMedia('(min-width: 769px) and (hover: hover) and (pointer: fine)').matches) {
        try { history.pushState(Object.assign({}, history.state, { cdSignatureLetter: true }), ''); desktopLetterEntry = true; } catch (_) {}
      }
      document.documentElement.setAttribute('data-signature-popup-open', '');
      if (typeof window.__cdLockBodyScroll === 'function') window.__cdLockBodyScroll(lockKey, 'viewport');
      closeButton.focus({ preventScroll: true });
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(function () { frame = 0; openLetter(false); });
    }
    previous.addEventListener('click', function () { render(index - 1); });
    next.addEventListener('click', function () { render(index + 1); });
    dots.forEach(function (dot, dotIndex) { dot.addEventListener('click', function () { render(dotIndex); }); });
    stage.addEventListener('keydown', function (event) {
      var nextIndex = event.key === 'ArrowRight' ? index + 1 : event.key === 'ArrowLeft' ? index - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? slides.length - 1 : null;
      if (nextIndex === null) return;
      event.preventDefault(); render(nextIndex);
    });
    opener.addEventListener('click', function () { openLetter(true); });
    closeButton.addEventListener('click', function () { closeLetter(true); });
    todayButton.addEventListener('click', function () {
      var DAY = 86400000, KST = 9 * 3600000;
      memoryHidden = (Math.floor((Date.now() + KST) / DAY) + 1) * DAY - KST;
      var saved = write('localStorage', hideKey, String(memoryHidden));
      closeLetter(true);
      if (!saved && typeof window.showToast === 'function') window.showToast('이 화면에서는 닫았어요. 브라우저 저장이 차단되어 다음 방문에는 다시 보일 수 있어요.');
    });
    letter.addEventListener('cancel', function (event) { event.preventDefault(); closeLetter(true); });
    letter.addEventListener('click', function (event) {
      if (event.target.closest('a')) { closeLetter(false); return; }
      if (event.target !== letter) return;
      var rect = letter.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeLetter(true);
    });
    var observer = new MutationObserver(schedule);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'class', 'open', 'aria-hidden', 'aria-modal'] });
    document.addEventListener('visibilitychange', schedule);
    window.addEventListener('pageshow', function () { observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'class', 'open', 'aria-hidden', 'aria-modal'] }); schedule(); });
    window.addEventListener('pagehide', function () { closeLetter(false); observer.disconnect(); cancelAnimationFrame(frame); frame = 0; }, { once: true });
    render(0);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, { once: true }); else schedule();
  }
  setupSignatureLetter();

  var formPanel = document.getElementById('dpDestinyPanel');
  var form = document.getElementById('destinyCardForm');
  var doc = document.documentElement;
  // 운세 컬렉션(#cdhCollections)은 홈에 펼치지 않는다. 컬렉션으로 가는 진입점(체계 카드·하단 탭 등)이
  // __cdOpenGarden 으로 열고, '접기'가 닫는다. 상태는 hidden 하나뿐이고 저장하지 않는다.
  var more = document.getElementById('cdhCollectionsWrap');
  function openGarden() {
    if (more) more.hidden = false;
  }
  function closeGarden() {
    if (!more || more.hidden) return;
    var focusInside = more.contains(document.activeElement);
    more.hidden = true;
    // 닫힌 영역 안에 포커스를 남기지 않는다 — 같은 자리의 '모든 운세 보기' 버튼으로 돌려준다.
    // 700px 미만에서는 하단 버튼이 숨으므로 첫 줄의 '모든 운세 보기'로 돌려준다.
    var fallback = Array.prototype.filter.call(home.querySelectorAll('.cdh-all-cta__btn, .yh-all'), function (node) { return node.getClientRects().length > 0; })[0];
    if (focusInside && fallback) {
      try { fallback.focus({ preventScroll: true }); } catch (_) { fallback.focus(); }
    }
  }
  window.__cdOpenGarden = openGarden;
  window.__cdCloseGarden = closeGarden;
  if (more) {
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
  // The profile sheet borrows the card from its hidden storage.
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
  var guestAuthLinks = home.querySelectorAll('[data-cd-guest-auth]');
  var shellReturn = location.pathname === '/index.html' || location.pathname === '/' ? '/ggulggul/' : location.pathname;
  guestAuthLinks.forEach(function (link) {
    link.href = '/' + link.dataset.cdGuestAuth + '/?next=' + encodeURIComponent(shellReturn + location.search + location.hash);
  });
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
    if (description) description.textContent = profile ? gardenText('profileDescription', '내 프로필과 함께, 오늘의 좋은 흐름을 가꿔요.') : gardenText('emptyDescription', '프로필을 만들면 내 사주 풀이가 여기에 모여요.');
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
  var languageWidget = move('#langWrap', 'cdhLanguageSlot');
  if (languageWidget && typeof IntersectionObserver === 'function') {
    var header = home.querySelector('.cdh-top');
    new IntersectionObserver(function (entries) {
      languageWidget.parentElement.toggleAttribute('data-header-above', entries[0].boundingClientRect.bottom <= 0);
    }).observe(header);
  }
  move('#cdMobileHeader .theme-switch-wrapper--appbar', 'cdhThemeSlot');

  function revealInput() {
    doc.classList.add('cdh-input-open');
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

  // 예전 검색 섹션 해시(#services, #services/love, #cdFinder …)는 모든 운세 시트로 연다.
  // 시트 함수(cdOpenAllFortunes)는 셸 하단 스크립트가 정의하므로, 아직 없으면 load 뒤에 한 번 더 시도한다.
  function openAllFortunes(filter) {
    if (typeof window.cdOpenAllFortunes !== 'function') {
      if (document.readyState !== 'complete') window.addEventListener('load', function () { openAllFortunes(filter); }, { once: true });
      return;
    }
    window.cdOpenAllFortunes();
    var sheet = document.getElementById('cdAllFortunes');
    if (!filter || !sheet || !sheet.open) return;
    var chip = sheet.querySelector(filter === 'tarot' ? '[data-method="tarot"]' : '[data-purpose="' + filter.replace(/[^a-z]/g, '') + '"]');
    if (chip && chip.getAttribute('aria-pressed') !== 'true') chip.click();
  }

  function route() {
    var hash = location.hash.slice(1);
    var deepTarget = hash ? document.getElementById(hash) : null;
    for (var parent = deepTarget && deepTarget.parentElement; parent && parent !== home; parent = parent.parentElement) {
      if (parent.tagName === 'DETAILS') parent.open = true;
    }
    var isFinder = hash === 'services' || hash.indexOf('services/') === 0 || hash === 'cdServiceIndex' || hash === 'cdFinder';
    home.hidden = false;
    // 컬렉션 안의 앵커(#tarotCollection 등)로 들어오면 컬렉션 영역만 열고 대상으로 이동한다.
    var folded = hash && !isFinder ? document.getElementById(hash) : null;
    if (more && folded && more.contains(folded) && more.hidden) {
      openGarden();
      requestAnimationFrame(function () { folded.scrollIntoView({ block: 'start' }); });
    }
    if (isFinder) {
      doc.classList.remove('cdh-input-open');
      history.replaceState(null, '', location.pathname + location.search);
      openAllFortunes(hash.split('/')[1] || '');
    } else if (hash === 'home') {
      doc.classList.remove('cdh-input-open');
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

  document.addEventListener('click', function (event) {
    var target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    var inputReturn = target.closest('[data-cdh-input-return]');
    if (inputReturn && !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      if (formPanel) formPanel.classList.remove('is-form-open');
      var formToggle = document.getElementById('dpDestinyFormToggle');
      if (formToggle) formToggle.setAttribute('aria-expanded', 'false');
      doc.classList.remove('cdh-input-open');
      home.hidden = false;
      if (location.hash) history.replaceState(null, '', location.pathname + location.search);
      var homeAction = home.querySelector('.cdh-primary');
      if (homeAction) homeAction.focus({ preventScroll: true });
      window.scrollTo(0, 0);
      return;
    }
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
      if (location.hash.indexOf('services') !== -1) history.replaceState(null, '', location.pathname + location.search);
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
    var packs = myPassPacks.filter(function (pack) { return pack && pack.available && Number(pack.remainingUses) > 0; });
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
      item.appendChild(myPassNode('span', 'cdh-mypass__kind', 'home.passCopy.flowerPass', null, '🌸 꽃돼지 꿀단지 이용권'));
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
      if (first.expiresAt && Number.isFinite(Date.parse(first.expiresAt))) {
        var packDate = new Intl.DateTimeFormat(document.documentElement.lang || 'ko', { dateStyle: 'medium' }).format(new Date(first.expiresAt));
        packItem.appendChild(myPassNode('span', 'cdh-mypass__line cdh-mypass__line--muted', 'home.passCopy.packExpires', { date: packDate }, packDate + '까지'));
      } else {
        packItem.appendChild(myPassNode('span', 'cdh-mypass__line cdh-mypass__line--muted', 'home.passCopy.packNoExpiry', null, '사용 기한 없음'));
      }
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
  // 사주 계산 딥링크는 입력 화면을 먼저 연다. 숨은 폼 안의 #run-btn 은 성별·동의 오류를
  // 보여줄 자리가 없어 아무 변화 없이 멈춘다(옛 링크·로케일 소개의 checkPrivacyAndCalculate 포함).
  var routeAction = new URLSearchParams(location.search).get('action');
  if (routeAction === 'cdOneStepFreeSajuEntry' || routeAction === 'checkPrivacyAndCalculate') revealInput();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', route, { once: true });
  else route();
})();
