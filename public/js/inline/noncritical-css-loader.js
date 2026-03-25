(function loadNonCriticalCss() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  if (typeof window.__runOnce === 'function') {
    var alreadyRan = false;
    window.__runOnce('noncritical-css-loader', function () {
      alreadyRan = true;
    });
    if (!alreadyRan) return;
  }

  var nonCriticalCss = [
    '/styles/animal-totem-mystic.css?v=20260315-mobile-opt1',
    '/styles/mobile-totem-flower-fix.css?v=20260317-scroll-fix',
    '/styles/saju-totem-generator.css?v=20260323',
    '/styles/tarot-love-mystic.css?v=20260316-mobile-opt2',
    '/styles/tarot-healing-dawn.css?v=20260317-luxury-sun',
    '/styles/tarot-reunion-lighthouse.css?v=20260316-mobile-opt2',
    '/styles/tarot-year-fortune.css?v=20260315-mobile-opt1',
    '/styles/tarot-self-esteem-quest.css?v=20260315-mobile-opt1',
    '/css/entertain-system.css'
  ];

  function isLoaded(href) {
    var links = document.querySelectorAll('link[rel="stylesheet"], link[rel="preload"][as="style"]');
    for (var i = 0; i < links.length; i += 1) {
      var cur = links[i].getAttribute('href') || '';
      if (cur === href) return true;
    }
    return false;
  }

  function appendStylesheet(href) {
    if (!href || isLoaded(href)) return;
    if (typeof window.__loadStylesheetOnce === 'function') {
      window.__loadStylesheetOnce(href);
      return;
    }
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.media = 'print';
    link.onload = function () {
      link.media = 'all';
    };
    document.head.appendChild(link);
  }

  function loadAll() {
    for (var i = 0; i < nonCriticalCss.length; i += 1) {
      appendStylesheet(nonCriticalCss[i]);
    }
  }

  function schedule() {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(loadAll, { timeout: 2600 });
      return;
    }
    setTimeout(loadAll, 1200);
  }

  if (document.readyState === 'complete') {
    schedule();
  } else {
    window.addEventListener('load', schedule, { once: true });
  }
})();
