/**
 * Optional site verification meta injector for static index.html.
 *
 * Rationale:
 * - public/index.html cannot read server env vars at runtime.
 * - Some deployments expose env/config to the client via window.__ENV__ (used by tarotApi).
 * - When tokens are present, we inject matching <meta name="..."> tags safely.
 *
 * Supported keys on window.__ENV__:
 * - NEXT_PUBLIC_SITE_VERIFY_GOOGLE  -> meta name="google-site-verification"
 * - NEXT_PUBLIC_SITE_VERIFY_NAVER   -> meta name="naver-site-verification"
 * - NEXT_PUBLIC_SITE_VERIFY_BING    -> meta name="msvalidate.01"
 * - NEXT_PUBLIC_SITE_VERIFY_BAIDU   -> meta name="baidu-site-verification"
 * - NEXT_PUBLIC_SITE_VERIFY_YANDEX  -> meta name="yandex-verification"
 */
(function injectSiteVerificationMetas() {
  try {
    var env = window.__ENV__;
    if (!env || typeof env !== 'object') return;

    var entries = [
      { name: 'google-site-verification', value: env.NEXT_PUBLIC_SITE_VERIFY_GOOGLE },
      { name: 'naver-site-verification', value: env.NEXT_PUBLIC_SITE_VERIFY_NAVER },
      { name: 'msvalidate.01', value: env.NEXT_PUBLIC_SITE_VERIFY_BING },
      { name: 'baidu-site-verification', value: env.NEXT_PUBLIC_SITE_VERIFY_BAIDU },
      { name: 'yandex-verification', value: env.NEXT_PUBLIC_SITE_VERIFY_YANDEX },
    ];

    var head = document.head || document.getElementsByTagName('head')[0];
    if (!head) return;

    entries.forEach(function (e) {
      if (!e || !e.name || !e.value) return;
      if (String(e.value).trim().length === 0) return;

      var existing = head.querySelector('meta[name="' + e.name + '"]');
      if (existing) {
        existing.setAttribute('content', String(e.value));
        return;
      }
      var meta = document.createElement('meta');
      meta.setAttribute('name', e.name);
      meta.setAttribute('content', String(e.value));
      head.appendChild(meta);
    });
  } catch (e) {}
})();

