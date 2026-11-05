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

  // One native-scroll rail; all other home content stays still.
  var signatureViewport = home.querySelector('#cdSigViewport');
  var signatureControls = home.querySelector('.cd-sig__controls');
  if (signatureViewport && signatureControls) {
    var signatureCards = Array.prototype.slice.call(signatureViewport.querySelectorAll('.cd-sig-card'));
    var signaturePrevious = signatureControls.querySelector('[data-sig-prev]');
    var signatureNext = signatureControls.querySelector('[data-sig-next]');
    var signaturePosition = signatureControls.querySelector('[data-sig-position]');
    var signaturePause = signatureControls.querySelector('[data-sig-pause]');
    var signatureDots = signatureControls.querySelector('[data-sig-dots]');
    var signatureMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var signaturePaused = false, signatureIndex = 0, signatureFrame = 0, signatureAnchor = null;
    var signatureTimer = 0, signatureResumeTimer = 0, signatureManualUntil = 0;
    var signatureVisible = false, signatureHover = false;
    var signatureInteraction = signatureViewport.parentElement;
    function signatureCount() { return window.innerWidth > 1000 ? 3 : window.innerWidth > 760 ? 2 : 1; }
    function signatureLast() { return Math.max(0, signatureCards.length - signatureCount()); }
    function setSignatureInert(card, value) {
      card.inert = value;
      // A consultation and its webtoon link occupy the same carousel position.
      var entry = card.closest('.cd-story-entry');
      if (entry) entry.inert = value;
    }
    function signatureHasBlockingModal() {
      return Array.prototype.some.call(document.querySelectorAll('dialog[open],[aria-modal="true"]:not([hidden])'), function (node) {
        return node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
      });
    }
    function syncSignature() {
      signatureFrame = 0;
      if (signatureResize && signatureWidth !== signatureViewport.clientWidth) return;
      var edge = signatureViewport.getBoundingClientRect().left;
      var best = Infinity;
      signatureCards.forEach(function (card, index) {
        var distance = Math.abs(card.getBoundingClientRect().left - edge - 4);
        if (distance < best) { best = distance; signatureIndex = index; }
      });
      signatureIndex = Math.min(signatureIndex, signatureLast());
      var end = Math.min(signatureCards.length, signatureIndex + signatureCount());
      signaturePosition.textContent = String(signatureIndex + 1).padStart(2, '0') + (end > signatureIndex + 1 ? '–' + String(end).padStart(2, '0') : '') + ' / ' + String(signatureCards.length).padStart(2, '0');
      signatureCards.forEach(function (card, index) { setSignatureInert(card, index < signatureIndex || index >= end); });
      if (signatureDots && signatureDots.children.length !== signatureLast() + 1) {
        signatureDots.replaceChildren();
        for (var i = 0; i <= signatureLast(); i++) {
          var dot = document.createElement('button'); dot.type = 'button'; dot.dataset.sigSlide = String(i);
          dot.setAttribute('data-cd-trans-attr', 'aria-label:home.choice.position');
          dot.setAttribute('data-cd-vars', JSON.stringify({number: String(i + 1)}));
          dot.setAttribute('aria-label', typeof window.cdTranslate === 'function' ? window.cdTranslate('home.choice.position', {number: String(i + 1)}, '상담 카드 ' + (i + 1) + '번부터 보기') : '상담 카드 ' + (i + 1) + '번부터 보기');
          signatureDots.append(dot);
        }
      }
      if (signatureDots) Array.prototype.forEach.call(signatureDots.children, function (dot, index) { dot.setAttribute('aria-pressed', String(index === signatureIndex)); });
    }
    function scheduleSignature() {
      window.clearInterval(signatureTimer); signatureTimer = 0;
      window.clearTimeout(signatureResumeTimer); signatureResumeTimer = 0;
      signaturePause.hidden = signatureMotion.matches;
      signaturePause.setAttribute('aria-pressed', String(signaturePaused));
      var pauseKey = signaturePaused ? 'home.choice.resume' : 'home.choice.pause';
      var pauseCopy = signaturePaused ? '상담 카드 자동 넘김 다시 시작하기' : '상담 카드 넘김 멈추기';
      signaturePause.setAttribute('data-cd-trans-attr', 'aria-label:' + pauseKey);
      signaturePause.setAttribute('aria-label', typeof window.cdTranslate === 'function' ? window.cdTranslate(pauseKey, {}, pauseCopy) : pauseCopy);
      if (signaturePaused || signatureMotion.matches || !signatureVisible || signatureHover || document.hidden || signatureViewport.contains(document.activeElement) || signatureHasBlockingModal()) return;
      var remaining = signatureManualUntil - Date.now();
      if (remaining > 0) {
        signatureResumeTimer = window.setTimeout(function () {
          signatureManualUntil = 0;
          if (signaturePaused || signatureMotion.matches || !signatureVisible || signatureHover || document.hidden || signatureViewport.contains(document.activeElement) || signatureHasBlockingModal()) { scheduleSignature(); return; }
          moveSignature(signatureIndex + 1, false);
        }, remaining + 40);
        return;
      }
      signatureTimer = window.setInterval(function () { moveSignature(signatureIndex + 1, false); }, 6000);
    }
    function moveSignature(index, manual) {
      if (manual) signatureManualUntil = Date.now() + 12000;
      var nextIndex = (index + signatureLast() + 1) % (signatureLast() + 1);
      var card = signatureCards[nextIndex];
      if (!card) return;
      signatureAnchor = nextIndex;
      // Release inert before moving so pointer/keyboard use never targets a hidden card.
      signatureCards.forEach(function (item) { setSignatureInert(item, false); });
      signatureViewport.scrollTo({left: signatureViewport.scrollLeft + card.getBoundingClientRect().left - signatureViewport.getBoundingClientRect().left - 4, behavior: signatureMotion.matches ? 'instant' : 'smooth'});
      if (Math.abs(card.getBoundingClientRect().left - signatureViewport.getBoundingClientRect().left - 4) < 1) syncSignature();
      scheduleSignature();
    }
    if (signatureCards.length && signaturePrevious && signatureNext && signaturePause) {
      signatureControls.hidden = false;
      signaturePrevious.addEventListener('click', function () { moveSignature(signatureIndex - 1, true); });
      signatureNext.addEventListener('click', function () { moveSignature(signatureIndex + 1, true); });
      signaturePause.addEventListener('click', function () {
        signaturePaused = !signaturePaused;
        if (!signaturePaused) signatureManualUntil = 0;
        scheduleSignature();
      });
      if (signatureDots) signatureDots.addEventListener('click', function (event) { var dot = event.target.closest('[data-sig-slide]'); if (dot) moveSignature(Number(dot.dataset.sigSlide), true); });
      signatureViewport.addEventListener('scroll', function () { if (!signatureFrame) signatureFrame = requestAnimationFrame(syncSignature); }, {passive:true});
      signatureViewport.addEventListener('scrollend', syncSignature);
      signatureViewport.addEventListener('keydown', function (event) {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault(); moveSignature(signatureIndex + (event.key === 'ArrowRight' ? 1 : -1), true);
      });
      ['pointerdown','touchstart','wheel'].forEach(function (name) { signatureViewport.addEventListener(name, function () { signatureAnchor = null; signatureManualUntil = Date.now() + 12000; scheduleSignature(); }, {passive:true}); });
      signatureInteraction.addEventListener('mouseenter', function () { signatureHover = true; scheduleSignature(); });
      signatureInteraction.addEventListener('mouseleave', function () { signatureHover = false; scheduleSignature(); });
      signatureInteraction.addEventListener('focusin', scheduleSignature);
      signatureInteraction.addEventListener('focusout', function () { requestAnimationFrame(scheduleSignature); });
      signatureMotion.addEventListener('change', scheduleSignature);
      document.addEventListener('visibilitychange', scheduleSignature);
      var signatureWidth = signatureViewport.clientWidth;
      var signatureResize = window.ResizeObserver ? new ResizeObserver(function () {
        if (signatureViewport.clientWidth === signatureWidth) return;
        signatureWidth = signatureViewport.clientWidth;
        // Keep the requested card as the resize anchor; a native drag releases it.
        var card = signatureCards[Math.min(signatureAnchor === null ? signatureIndex : signatureAnchor, signatureLast())];
        signatureViewport.scrollTo({left: signatureViewport.scrollLeft + card.getBoundingClientRect().left - signatureViewport.getBoundingClientRect().left - 4, behavior:'instant'});
        syncSignature(); scheduleSignature();
      }) : null;
      if (signatureResize) signatureResize.observe(signatureViewport);
      window.addEventListener('resize', function () { if (!signatureResize) syncSignature(); scheduleSignature(); });
      var signatureObserver = new IntersectionObserver(function (entries) { signatureVisible = entries[0].intersectionRatio >= 0.5; scheduleSignature(); }, {threshold:[0,0.5]});
      signatureObserver.observe(signatureViewport);
      var signatureOverlayObserver = new MutationObserver(function (changes) {
        if (changes.some(function (change) { return (change.type === 'childList' && Array.prototype.some.call(change.addedNodes, function (node) { return node.nodeType === 1 && (node.matches('dialog,[aria-modal="true"]') || node.querySelector('dialog,[aria-modal="true"]')); })) || (change.target.matches && change.target.matches('dialog,[aria-modal="true"]')); })) scheduleSignature();
      });
      signatureOverlayObserver.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open','hidden','aria-modal']});
      window.addEventListener('pagehide', function () { window.clearInterval(signatureTimer); window.clearTimeout(signatureResumeTimer); signatureObserver.disconnect(); signatureOverlayObserver.disconnect(); if (signatureResize) signatureResize.disconnect(); }, {once:true});
      syncSignature(); scheduleSignature();
    }
  }

  setupSignatureConsultPopup(Array.prototype.slice.call(home.querySelectorAll('#cdSigGrid [data-cd-service-id]')));

  // 결제 복귀 문서에서는 대표 상담 팝업이 결제한 콘텐츠를 덮으면 안 된다. 재개(js/destiny-profile.js)가
  // 먼저 돌아 복귀 쿼리와 티켓을 지울 수 있으므로, 쿼리는 문서가 처음 받은 주소에서도 읽는다.
  // 티켓 판정은 쿼리 없는 복귀를 재개하는 조건(_dpResumeDirectPaymentAfterRedirect)과 맞춘다.
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

  function setupSignatureConsultPopup(cards) {
    var pathname = String(location.pathname || '');
    var localFixture = /^(?:localhost|127\.0\.0\.1)$/i.test(location.hostname) && /\/(?:static\/)?index\.html$/.test(pathname);
    if ((!/^ko(?:-|$)/i.test(document.documentElement.lang || 'ko')) || (pathname !== '/ggulggul/' && !localFixture) || cards.length !== 6 || location.hash) return;
    // 고객이 닫은 것이 아니므로 닫음 기록은 남기지 않는다. 다음 일반 방문에서는 그대로 열린다.
    if (isPaymentReturnDocument()) return;

    var HIDE_UNTIL_KEY = 'cd_signature_consult_hide_until_v1';
    var SESSION_CLOSED_KEY = 'cd_signature_consult_session_closed_v1';
    var LOCK_KEY = 'signature-consult-popup';
    var popup = null, sheet = null, previousFocus = null, popupIndex = 0;
    var popupPaused = false, popupHover = false, popupFocus = false;
    var popupTimer = 0, popupResumeTimer = 0, popupManualUntil = 0;
    var eligibilityObserver = null, eligibilityFrame = 0, delayElapsed = false;
    var popupMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function sessionClosed() {
      try { return sessionStorage.getItem(SESSION_CLOSED_KEY) === '1'; } catch (_) { return false; }
    }
    function hiddenToday() {
      try { return Number(localStorage.getItem(HIDE_UNTIL_KEY) || 0) > Date.now(); } catch (_) { return false; }
    }
    function markSessionClosed() {
      try { sessionStorage.setItem(SESSION_CLOSED_KEY, '1'); } catch (_) {}
    }
    function hasBlockingSurface() {
      return Array.prototype.some.call(document.querySelectorAll('dialog[open],[role="dialog"][aria-modal="true"]:not([hidden]),.payment-modal.active,#cdCookieConsent.is-visible'), function (node) {
        return node !== popup && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
      });
    }
    function popupItems() {
      return cards.map(function (card) {
        var image = card.querySelector('.cd-sig-card__img');
        return {
          id: card.getAttribute('data-cd-service-id') || '',
          title: card.querySelector('.cd-sig-card__title')?.textContent.trim() || '',
          copy: card.getAttribute('data-cd-popup-copy') || card.querySelector('.cd-sig-card__q')?.textContent.trim() || '',
          price: card.querySelector('.cd-sig-card__price')?.textContent.trim() || '',
          href: card.getAttribute('href') || '#cdSignatureConsult',
          cta: card.querySelector('.cd-sig-card__cta span')?.textContent.trim() || '상담 시작하기',
          image: image?.getAttribute('src') || '',
          srcset: image?.getAttribute('srcset') || '',
          alt: (card.querySelector('.cd-sig-card__title')?.textContent.trim() || '대표 상담') + ' 대표 이미지'
        };
      });
    }
    var items = popupItems();

    function buildPopup() {
      if (popup) return popup;
      popup = document.createElement('div');
      popup.id = 'cdSignatureConsultPopup';
      popup.className = 'cd-signature-popup';
      popup.hidden = true;
      popup.lang = 'ko';
      popup.innerHTML = '<section class="cd-signature-popup__sheet" role="dialog" aria-modal="true" aria-labelledby="cdSignaturePopupTitle" aria-describedby="cdSignaturePopupIntro" tabindex="-1">' +
        '<button type="button" class="cd-signature-popup__close" data-signature-popup-close aria-label="대표 상담 안내 닫기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
        '<div class="cd-signature-popup__visual"><img data-signature-popup-image src="/images/service-introductions/fortune-tea-house-640.webp" width="640" height="360" alt="대표 상담 이미지" decoding="async"></div>' +
        '<div class="cd-signature-popup__content"><h2 id="cdSignaturePopupTitle">오늘, 어떤 상담이 필요하세요?</h2><p class="cd-signature-popup__intro" id="cdSignaturePopupIntro">지금 마음에 가장 가까운 고민부터 골라보세요. 상담 구성과 이용 조건은 시작 전에 확인할 수 있어요.</p>' +
        '<div class="cd-signature-popup__service" aria-live="off"><p class="cd-signature-popup__name" data-signature-popup-name></p><p class="cd-signature-popup__copy" data-signature-popup-copy></p><p class="cd-signature-popup__price" data-signature-popup-price></p><a class="cd-signature-popup__cta" data-signature-popup-cta><span></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg></a></div>' +
        '<div class="cd-signature-popup__controls"><button type="button" data-signature-popup-prev aria-label="이전 상담"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6"/></svg></button><div class="cd-signature-popup__dots" data-signature-popup-dots aria-label="대표 상담 위치"></div><span data-signature-popup-position></span><button type="button" data-signature-popup-next aria-label="다음 상담"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></button><button type="button" data-signature-popup-pause aria-pressed="false" aria-label="상담 팝업 자동 넘김 멈추기"><svg class="cd-signature-popup__pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6v12m6-12v12"/></svg><svg class="cd-signature-popup__play" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 6 10 6-10 6Z"/></svg></button></div>' +
        '<button type="button" class="cd-signature-popup__today" data-signature-popup-today>오늘 하루 보지 않기</button></div></section>';
      document.body.appendChild(popup);
      sheet = popup.querySelector('.cd-signature-popup__sheet');
      var dots = popup.querySelector('[data-signature-popup-dots]');
      items.forEach(function (item, index) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.dataset.signaturePopupSlide = String(index);
        dot.setAttribute('aria-label', item.title + ' 보기');
        dots.appendChild(dot);
      });
      popup.querySelector('[data-signature-popup-close]').addEventListener('click', function () { closePopup(true); });
      popup.querySelector('[data-signature-popup-today]').addEventListener('click', hidePopupToday);
      popup.querySelector('[data-signature-popup-prev]').addEventListener('click', function () { movePopup(popupIndex - 1, true); });
      popup.querySelector('[data-signature-popup-next]').addEventListener('click', function () { movePopup(popupIndex + 1, true); });
      popup.querySelector('[data-signature-popup-pause]').addEventListener('click', function () {
        popupPaused = !popupPaused;
        if (!popupPaused) popupManualUntil = 0;
        schedulePopup();
      });
      dots.addEventListener('click', function (event) {
        var dot = event.target.closest('[data-signature-popup-slide]');
        if (dot) movePopup(Number(dot.dataset.signaturePopupSlide), true);
      });
      popup.querySelector('[data-signature-popup-cta]').addEventListener('click', markSessionClosed);
      popup.addEventListener('click', function (event) { if (event.target === popup) closePopup(true); });
      popup.addEventListener('pointerdown', function () { popupFocus = false; }, { passive: true });
      popup.addEventListener('keydown', trapPopupFocus);
      sheet.addEventListener('mouseenter', function () { popupHover = true; schedulePopup(); });
      sheet.addEventListener('mouseleave', function () { popupHover = false; schedulePopup(); });
      sheet.addEventListener('focusout', function () { requestAnimationFrame(function () { if (!sheet.contains(document.activeElement)) popupFocus = false; schedulePopup(); }); });
      popupMotion.addEventListener('change', schedulePopup);
      document.addEventListener('visibilitychange', schedulePopup);
      renderPopup();
      return popup;
    }
    function renderPopup() {
      if (!popup) return;
      var item = items[popupIndex];
      var image = popup.querySelector('[data-signature-popup-image]');
      popup.dataset.serviceId = item.id;
      image.src = item.image;
      image.parentElement.style.backgroundImage = 'url(' + JSON.stringify(item.image) + ')';
      if (item.srcset) image.srcset = item.srcset; else image.removeAttribute('srcset');
      image.sizes = '(max-width: 760px) calc(100vw - 32px), 340px';
      image.alt = item.alt;
      popup.querySelector('[data-signature-popup-name]').textContent = item.title;
      popup.querySelector('[data-signature-popup-copy]').textContent = item.copy;
      popup.querySelector('[data-signature-popup-price]').textContent = item.price;
      var cta = popup.querySelector('[data-signature-popup-cta]');
      cta.href = item.href;
      cta.querySelector('span').textContent = item.cta;
      popup.querySelector('[data-signature-popup-position]').textContent = (popupIndex + 1) + ' / ' + items.length;
      Array.prototype.forEach.call(popup.querySelector('[data-signature-popup-dots]').children, function (dot, index) { dot.setAttribute('aria-pressed', String(index === popupIndex)); });
    }
    function schedulePopup() {
      window.clearInterval(popupTimer); popupTimer = 0;
      window.clearTimeout(popupResumeTimer); popupResumeTimer = 0;
      if (!popup || popup.hidden) return;
      var pause = popup.querySelector('[data-signature-popup-pause]');
      pause.hidden = popupMotion.matches;
      pause.setAttribute('aria-pressed', String(popupPaused));
      pause.setAttribute('aria-label', popupPaused ? '상담 팝업 자동 넘김 다시 시작하기' : '상담 팝업 자동 넘김 멈추기');
      if (popupPaused || popupMotion.matches || popupHover || popupFocus || document.hidden) return;
      var remaining = popupManualUntil - Date.now();
      if (remaining > 0) {
        popupResumeTimer = window.setTimeout(function () {
          popupManualUntil = 0;
          if (popupPaused || popupMotion.matches || popupHover || popupFocus || document.hidden) { schedulePopup(); return; }
          movePopup(popupIndex + 1, false);
        }, remaining + 40);
        return;
      }
      popupTimer = window.setInterval(function () { movePopup(popupIndex + 1, false); }, 6000);
    }
    function movePopup(index, manual) {
      if (manual) popupManualUntil = Date.now() + 12000;
      popupIndex = (index + items.length) % items.length;
      renderPopup();
      schedulePopup();
    }
    function trapPopupFocus(event) {
      if (event.key === 'Escape') { event.preventDefault(); closePopup(true); return; }
      if (event.key === 'Tab' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') { popupFocus = true; schedulePopup(); }
      if (event.key !== 'Tab') return;
      var focusable = popup.querySelectorAll('button:not([hidden]):not([disabled]),a[href]');
      if (!focusable.length) return;
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    function openPopup() {
      if (sessionClosed() || hiddenToday() || hasBlockingSurface() || document.hidden) return false;
      buildPopup();
      previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      popup.hidden = false;
      document.documentElement.setAttribute('data-signature-popup-open', '');
      if (typeof window.__cdLockBodyScroll === 'function') window.__cdLockBodyScroll(LOCK_KEY);
      requestAnimationFrame(function () { sheet.focus({ preventScroll: true }); });
      schedulePopup();
      if (eligibilityObserver) eligibilityObserver.disconnect();
      return true;
    }
    function closePopup(rememberSession) {
      if (!popup || popup.hidden) return;
      if (rememberSession !== false) markSessionClosed();
      popup.hidden = true;
      document.documentElement.removeAttribute('data-signature-popup-open');
      window.clearInterval(popupTimer); window.clearTimeout(popupResumeTimer);
      if (typeof window.__cdUnlockBodyScroll === 'function') window.__cdUnlockBodyScroll(LOCK_KEY);
      if (previousFocus && document.contains(previousFocus)) previousFocus.focus({ preventScroll: true });
      previousFocus = null;
    }
    function hidePopupToday() {
      try {
        var tomorrow = new Date();
        tomorrow.setHours(24, 0, 0, 0);
        localStorage.setItem(HIDE_UNTIL_KEY, String(tomorrow.getTime()));
      } catch (_) {}
      closePopup(true);
    }
    function tryOpenPopup() {
      eligibilityFrame = 0;
      if (sessionClosed() || hiddenToday()) { if (eligibilityObserver) eligibilityObserver.disconnect(); return; }
      if (!delayElapsed) return;
      openPopup();
    }
    eligibilityObserver = new MutationObserver(function () {
      if (!eligibilityFrame) eligibilityFrame = requestAnimationFrame(tryOpenPopup);
    });
    eligibilityObserver.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open','hidden','class','aria-hidden','aria-modal'] });
    window.setTimeout(function () { delayElapsed = true; tryOpenPopup(); }, 1500);
    window.addEventListener('pagehide', function () {
      window.clearInterval(popupTimer); window.clearTimeout(popupResumeTimer);
      if (eligibilityObserver) eligibilityObserver.disconnect();
    }, { once: true });
  }

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
    var fallback = home.querySelector('.cdh-all-cta__btn');
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
  if (new URLSearchParams(location.search).get('action') === 'cdOneStepFreeSajuEntry') revealInput();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', route, { once: true });
  else route();
})();
