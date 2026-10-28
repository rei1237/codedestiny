/* Display-only navigation for the existing five free reading sections. */
(function () {
  'use strict';
  var nav = document.querySelector('.saju-reading-nav');
  if (!nav) return;
  function readEntries() {
    return Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]')).map(function (link) { return { link: link, section: document.getElementById(link.hash.slice(1)) }; }).filter(function (entry) { return entry.section; });
  }
  var queued = false;
  function update() {
    queued = false;
    nav = document.querySelector('.saju-reading-nav');
    if (!nav) return;
    if (!nav.getClientRects().length) return;
    var entries = readEntries();
    var header = document.getElementById('cdMobileHeader');
    var headerRect = header && header.getBoundingClientRect();
    var top = headerRect && header.getClientRects().length && headerRect.top <= 1 ? Math.max(0, headerRect.bottom) : 0;
    nav.style.setProperty('--saju-nav-top', top + 'px');
    var boundary = top + nav.offsetHeight + 24;
    var scrollPadding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    var active = entries.find(function (entry) { return entry.section.getClientRects().length; });
    entries.forEach(function (entry) {
      if (entry.section.getClientRects().length && entry.section.getBoundingClientRect().top <= boundary + scrollPadding + 10) active = entry;
    });
    entries.forEach(function (entry) {
      entry.section.style.scrollMarginTop = (boundary + 8) + 'px';
      if (entry === active) entry.link.setAttribute('aria-current', 'location');
      else entry.link.removeAttribute('aria-current');
    });
    if (active && !nav.contains(document.activeElement)) {
      var left = active.link.offsetLeft, right = left + active.link.offsetWidth;
      if (left < nav.scrollLeft || right > nav.scrollLeft + nav.clientWidth) nav.scrollLeft = left - 12;
    }
  }
  function schedule() { if (!queued) { queued = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('hashchange', schedule);
  document.addEventListener('click', function (event) {
    var link = event.target.closest('.saju-reading-nav a[href^="#"]');
    if (!link) return;
    nav = link.closest('.saju-reading-nav');
    var entry = readEntries().find(function (item) { return item.link === link; });
    if (!entry) return;
    // The legacy shell delegates hash links to its own page router.
    // Reading anchors remain within the currently visible result.
    event.preventDefault();
    event.stopPropagation();
    update();
    entry.section.setAttribute('data-saju-reading-target', '');
    if (!entry.section.hasAttribute('tabindex')) entry.section.tabIndex = -1;
    entry.section.focus({ preventScroll: true });
    entry.section.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    requestAnimationFrame(schedule);
  }, true);
  var result = document.getElementById('resultPage');
  if (result && window.MutationObserver) new MutationObserver(schedule).observe(result, { attributes: true, attributeFilter: ['style', 'class'] });
  update();
})();
