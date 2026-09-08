/* Home composition controller. Existing nodes and handlers are rehomed; no feature, auth or payment logic is duplicated. */
(function () {
  'use strict';
  var home = document.getElementById('cdHomeFunnel');
  if (!home) return;
  var formPanel = document.getElementById('dpDestinyPanel');
  var form = document.getElementById('destinyCardForm');
  var doc = document.documentElement;
  var lastFilter = null;

  function move(selector, slotId) {
    var node = document.querySelector(selector);
    var slot = document.getElementById(slotId);
    if (!node || !slot || slot.contains(node)) return node;
    slot.appendChild(node);
    return node;
  }

  // Keep one authoritative instance of every established home surface.
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
    home.hidden = false;
    if (isFinder) {
      doc.classList.remove('cdh-input-open');
      document.dispatchEvent(new Event('cd:home-finder-open'));
      var filter = hash.split('/')[1] || '';
      if (filter !== lastFilter) {
        home.querySelectorAll('#cdFinder [aria-pressed="true"]').forEach(function (chip) { chip.click(); });
        var chip = home.querySelector(filter === 'tarot'
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
      if (window.__cdCollapseHome) window.__cdCollapseHome();
      window.scrollTo(0, 0);
    } else if (hash === 'destinyCardForm') {
      revealInput();
    }
  }

  document.addEventListener('click', function (event) {
    var target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    if (target.closest('[data-cdh-free]')) {
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
