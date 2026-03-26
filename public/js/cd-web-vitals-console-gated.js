(function () {
  try {
    var q = new URLSearchParams(location.search || '');
    var debugVitals = window.__ENABLE_WEB_VITALS_CONSOLE__ === true
      || q.get('debugVitals') === '1'
      || localStorage.getItem('debug.vitals') === '1';
    if (!debugVitals) return;
  } catch (e) {
    if (window.__ENABLE_WEB_VITALS_CONSOLE__ !== true) return;
  }

  try {
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    var saveData = !!(conn && conn.saveData);
    var et = conn && conn.effectiveType ? String(conn.effectiveType).toLowerCase() : '';
    var isSlow = et === 'slow-2g' || et === '2g';
    var isMobile = window.matchMedia('(max-width: 900px)').matches || /android|iphone|ipad|ipod/i.test(navigator.userAgent);
    if ((isMobile && (saveData || isSlow)) || saveData) return;

    var loadVitals = function () {
      var s = document.createElement('script');
      s.type = 'module';
      s.src = '/js/web-vitals-console.js';
      document.body.appendChild(s);
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(loadVitals, { timeout: 3500 });
    } else {
      setTimeout(loadVitals, 1200);
    }
  } catch (e) {}
})();

