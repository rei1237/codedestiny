# Deploy Cache and Version Runbook

## Goal

Ensure every production deployment serves the latest HTML, logo/images, and JS/CSS without stale-cache regressions.

## Source of truth

- Build artifact root: `dist/`
- Runtime version endpoint: `/version.json`
- Cache policy source: `public/_headers`
- Emergency direct deploy script: `scripts/deploy-pages.mjs`

## Release flow

1. Build fresh artifacts.
2. Verify `dist/version.json` commit matches current Git HEAD commit.
3. Deploy Pages (manual dashboard path or emergency script only).
4. Deploy Worker separately if API changes exist.
5. Run cache verification on both domains.

## Mandatory checks after deploy

1. Compare `/version.json` on both domains.
2. Confirm HTML is `no-cache` and `/version.json` / `/service-worker.js` are `no-store, …`.
3. Confirm `/_next/static/*` responses are immutable.
4. Confirm non-hashed assets carry the policy `public/_headers` declares for their path.

## Header probes

Use browser DevTools or curl-like probes.

```bash
curl -I https://code-destiny.com/
curl -I https://code-destiny.com/version.json
curl -I https://code-destiny.com/service-worker.js
curl -I https://code-destiny.com/icons/꿀꿀 운세 로고.webp
curl -I https://code-destiny.com/_next/static/chunks/<sample>.js
```

Expected (matches `public/_headers`; that file is the source of truth):

- `/`, `/index.html`, `/*.html`, `/*/`: `Cache-Control: no-cache`
- `/version.json`, `/service-worker.js`: `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`
- `/_next/static/*`: `Cache-Control: public, max-age=31536000, immutable`
- `/icons/*`: `Cache-Control: public, max-age=604800, stale-while-revalidate=2592000`

🔴 **HTML never carries `ETag` or `Last-Modified`, so `no-cache` can never produce a 304 here.**
Cloudflare JavaScript Detections rewrites every HTML body at the edge to inject
`/cdn-cgi/challenge-platform/scripts/jsd/main.js`, which drops `Content-Length` and `ETag`
(`Transfer-Encoding: chunked`). Non-HTML assets keep their validators. This is a dashboard
toggle, not a `_headers` or code problem, and the owner chose to keep bot protection on
(2026-09-02). Do not re-diagnose — see
`docs/handoff/app-optimization-remaining-2026-09-02.md` §2 for the comparison table and the
four hypotheses already ruled out.

## Browser-side stale cleanup (when needed)

1. Cloudflare dashboard -> Caching -> Purge Everything.
2. Browser DevTools -> Application -> unregister service workers.
3. Browser DevTools -> Application -> clear Cache Storage.
4. Hard refresh both `code-destiny.com` and `codedestiny.pages.dev`.

## Safety policy for auto version refresh

- During payment/input/PDF critical work, automatic forced reload must be blocked.
- In blocked state, show a user prompt/banner and allow manual refresh.
- Once operation is safe, refresh can proceed.

## Incident triage

If latest logo/page still does not appear:

1. Compare `/version.json` between domains.
2. Compare response headers for `/` and `/icons/꿀꿀 운세 로고.webp`.
3. Verify deployed artifact commit from `dist/version.json` vs Git HEAD.
4. Check browser extensions/private proxy/VPN cache layers.
