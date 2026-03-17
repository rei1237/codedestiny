/**
 * Canonical domain redirect — runs at head parse time.
 * Non-canonical hosts redirect to canonical "/" before render.
 */
(function redirectToCanonicalMain() {
  try {
    var loc = window.location;
    if (!loc) return;
    var host = (loc.hostname || '').toLowerCase();
    if (host === 'code-destiny.com' || host === 'www.code-destiny.com' || host.endsWith('.pages.dev')) return;
    var target = "/";
    if (loc.pathname === target || loc.pathname === '/index.html') return;
    var nextUrl = target + (loc.search || "") + (loc.hash || "");
    window.location.replace(nextUrl);
  } catch (e) {}
})();
