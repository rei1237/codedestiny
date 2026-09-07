/* Presentation controller. No entitlement, auth, profile storage or payment implementation. */
(function () {
  'use strict';
  var home = document.getElementById('cdHomeFunnel');
  if (!home) return;
  var services = document.getElementById('cdhServices');
  var formPanel = document.getElementById('dpDestinyPanel');
  var input = document.getElementById('fortuneGatewaySearch');
  var form = document.getElementById('destinyCardForm');
  var doc = document.documentElement;
  var lastFilter = null;
  // Keep the original consent choices and handlers; place their existing region in flow.
  var cookie = document.getElementById('cdCookieConsent');
  var cookieSlot = document.getElementById('cdhCookieSlot');
  if (cookie && cookieSlot) cookieSlot.appendChild(cookie);
  var account = document.getElementById('authQuickLinks');
  var accountSlot = document.getElementById('cdhAccountSlot');
  if (account && accountSlot) accountSlot.appendChild(account);
  function revealInput() {
    doc.classList.add('cdh-input-open');
    services.hidden = true;
    if (window.__cdOpenDestinyForm) window.__cdOpenDestinyForm();
    requestAnimationFrame(function () { if (form && form.getBoundingClientRect().height) form.scrollIntoView({ block: 'start' }); });
  }
  // The existing profile controller may open the original form from a deep link or a sheet.
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
    var isServices = hash === 'services' || hash.indexOf('services/') === 0 || hash === 'cdServiceIndex' || hash === 'cdFinder';
    home.hidden = isServices;
    services.hidden = !isServices;
    if (isServices) {
      doc.classList.remove('cdh-input-open');
      document.dispatchEvent(new Event('cd:home-finder-open'));
      var filter = hash.split('/')[1] || '';
      if (filter !== lastFilter) {
        services.querySelectorAll('[aria-pressed="true"]').forEach(function (chip) { chip.click(); });
        var chip = services.querySelector(filter === 'tarot' ? '[data-method="tarot"]' : '[data-purpose="' + filter.replace(/[^a-z]/g, '') + '"]');
        if (chip) chip.click();
        lastFilter = filter;
      }
      document.getElementById('cdhServicesTitle').focus({ preventScroll: true });
      window.scrollTo(0, 0);
    } else if (hash === 'home') {
      doc.classList.remove('cdh-input-open');
      if (window.__cdCollapseHome) window.__cdCollapseHome();
      window.scrollTo(0, 0);
    } else if (hash === 'destinyCardForm') {
      revealInput();
    } else if (hash === 'cdhFeatured' || hash === 'cdhPass') {
      doc.classList.remove('cdh-input-open');
      document.getElementById(hash).scrollIntoView({ block: 'start' });
    }
  }
  document.addEventListener('click', function (event) {
    var target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    if (target.closest('[data-cdh-free]')) {
      event.preventDefault();
      revealInput();
      if (typeof window.cdOneStepFreeSajuEntry === 'function') window.cdOneStepFreeSajuEntry();
      else if (form) { form.scrollIntoView({ block: 'start' }); form.querySelector('input')?.focus({ preventScroll: true }); }
    }
    if (target.closest('#cdMobileBottomNav [data-nav-key="home"]')) {
      doc.classList.remove('cdh-input-open');
      home.hidden = false;
      services.hidden = true;
      if (location.hash.indexOf('services') !== -1) history.replaceState(null, '', location.pathname + location.search);
    }
    if (target.closest('[data-cd-service-index-jump]')) {
      event.preventDefault();
      location.hash = 'services';
    }
  }, true);
  document.getElementById('cdhSearchForm').addEventListener('submit', function (event) {
    event.preventDefault();
    if (input) input.value = document.getElementById('cdhSearchInput').value;
    location.hash = 'services';
    route();
    if (input) input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  window.addEventListener('hashchange', route);
  if (new URLSearchParams(location.search).get('action') === 'cdOneStepFreeSajuEntry') revealInput();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', route, { once: true });
  else route();
})();
