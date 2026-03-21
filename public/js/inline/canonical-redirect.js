/**
 * Canonical domain redirect — runs at head parse time.
 * Non-canonical hosts redirect to "/" before render.
 */
(function redirectToCanonicalMain() {
  try {
    var loc = window.location;
    if (!loc) return;
    var path = loc.pathname || '';
    // Legacy static bundle under /static/ (e.g. iframe or direct open) must not redirect to "/"
    // on dev/preview hosts — otherwise /static/index.html becomes nested Next app or blank.
    if (path.indexOf('/static/') === 0) return;
    var host = (loc.hostname || '').toLowerCase();
    if (host === 'code-destiny.com' || host === 'www.code-destiny.com' || host.endsWith('.pages.dev')) return;
    var target = "/";
    if (path === target || path === '/index.html') return;
    var nextUrl = target + (loc.search || "") + (loc.hash || "");
    window.location.replace(nextUrl);
  } catch (e) {}
})();
