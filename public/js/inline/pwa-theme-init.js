/**
 * PWA theme init — neo/samba manifest & favicon switching.
 * Runs before body; must execute before favicon render.
 */
(function () {
  try {
    var isNeo = localStorage.getItem('fortuneThemeModeStateV1') === 'neo';
    window.__INITIAL_THEME_NEO__ = isNeo;
    if (!isNeo) return;
    var manifestLink = document.getElementById('pwa-manifest');
    if (manifestLink) manifestLink.setAttribute('href', '/manifest-samba.json?v=20260511-mobile-logo-fix1');
    var faviconLink = document.getElementById('pwa-favicon');
    if (faviconLink) {
      faviconLink.setAttribute('href', '/icons/꿀꿀 운세 로고.webp?v=20260511-mobile-logo-fix1');
      faviconLink.setAttribute('type', 'image/webp');
      faviconLink.setAttribute('sizes', '192x192');
    }
    var appleIconLink = document.getElementById('pwa-apple-icon');
    if (appleIconLink) appleIconLink.setAttribute('href', '/icons/꿀꿀 운세 로고.webp?v=20260511-mobile-logo-fix1');
  } catch (_) {
    window.__INITIAL_THEME_NEO__ = false;
  }
})();
