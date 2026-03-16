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
    if (manifestLink) manifestLink.setAttribute('href', '/manifest-samba.json');
    var faviconLink = document.getElementById('pwa-favicon');
    if (faviconLink) {
      faviconLink.setAttribute('href', '/icons/samba.svg');
      faviconLink.setAttribute('type', 'image/svg+xml');
    }
    var appleIconLink = document.getElementById('pwa-apple-icon');
    if (appleIconLink) appleIconLink.setAttribute('href', '/icons/samba.svg');
  } catch (_) {
    window.__INITIAL_THEME_NEO__ = false;
  }
})();
