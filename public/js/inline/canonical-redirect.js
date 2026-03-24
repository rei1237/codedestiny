/**
 * Canonical domain redirect — runs at head parse time.
 * Non-canonical hosts redirect to "/" before render.
 */
(function silenceTailwindCdnProdWarning() {
  try {
    if (!window.console || typeof window.console.warn !== 'function') return;
    if (window.__TAILWIND_WARN_FILTER_APPLIED__) return;
    var rawWarn = window.console.warn;
    window.console.warn = function () {
      try {
        var first = arguments && arguments.length ? String(arguments[0] || '') : '';
        if (first.indexOf('cdn.tailwindcss.com should not be used in production') !== -1) return;
      } catch (e) {}
      return rawWarn.apply(this, arguments);
    };
    window.__TAILWIND_WARN_FILTER_APPLIED__ = true;
  } catch (e) {}
})();

(function redirectToCanonicalMain() {
  try {
    var loc = window.location;
    if (!loc) return;
    var path = loc.pathname || '';
    if (path.indexOf('/static/') === 0) return;
    var host = (loc.hostname || '').toLowerCase();
    if (host === 'code-destiny.com' || host === 'www.code-destiny.com' || host.endsWith('.pages.dev')) return;
    var target = "/";
    if (path === target || path === '/index.html') return;
    var nextUrl = target + (loc.search || "") + (loc.hash || "");
    window.location.replace(nextUrl);
  } catch (e) {}
})();
