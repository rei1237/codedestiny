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

(function installCoreLayoutStabilityGuards() {
  try {
    if (!document || !document.head) return;
    var styleId = 'cd-layout-stability-guard';
    if (document.getElementById(styleId)) return;
    var st = document.createElement('style');
    st.id = styleId;
    st.textContent = ''
      + 'html{scrollbar-gutter:stable both-edges;}'
      + 'img[width][height]{height:auto;}'
      + '.feature-card__img-wrap,.tarot-tile__img-wrap{aspect-ratio:4 / 3;min-height:150px;overflow:hidden;}'
      + '.feature-card__detail,.feature-card__detail-inner{min-height:120px;}'
      + '[data-fortune-result],.fortune-result,.destiny-result,.oracle-result,#fortuneResult,#result{min-height:320px;contain-intrinsic-size:320px;}'
      + 'body{font-synthesis-weight:none;text-size-adjust:100%;-webkit-text-size-adjust:100%;}';
    document.head.appendChild(st);
  } catch (e) {}
})();

(function redirectToCanonicalMain() {
  try {
    var loc = window.location;
    if (!loc) return;
    var protocol = String(loc.protocol || '').toLowerCase();
    if (protocol !== 'http:' && protocol !== 'https:') return;
    var path = loc.pathname || '';
    if (path.indexOf('/static/') === 0) return;
    var host = (loc.hostname || '').toLowerCase();
    var isCanonicalHost = (host === 'code-destiny.com' || host === 'www.code-destiny.com' || host.endsWith('.pages.dev'));
    var canonicalHost = 'code-destiny.com';
    var next = new URL(loc.href);

    if (isCanonicalHost && protocol === 'https:') return;

    next.protocol = 'https:';
    next.port = '';

    if (!isCanonicalHost) {
      next.hostname = canonicalHost;
      if (next.pathname === '/index.html') {
        next.pathname = '/';
      }
    }

    var nextHref = next.toString();
    if (nextHref && nextHref !== loc.href) {
      window.location.replace(nextHref);
    }
  } catch (e) {}
})();
