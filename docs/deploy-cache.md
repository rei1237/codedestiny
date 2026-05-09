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
2. Confirm HTML and version endpoints are `no-store`.
3. Confirm `/_next/static/*` responses are immutable.
4. Confirm non-hashed assets (logo/icons/js/css) are no-cache or no-store.

## Header probes

Use browser DevTools or curl-like probes.

```bash
curl -I https://code-destiny.com/
curl -I https://code-destiny.com/version.json
curl -I https://code-destiny.com/service-worker.js
curl -I https://code-destiny.com/icons/honeypig.webp
curl -I https://code-destiny.com/_next/static/chunks/<sample>.js
```

Expected:

- `/`, `/index.html`, `/*.html`, `/version.json`, `/service-worker.js`: `Cache-Control: no-cache, no-store, must-revalidate`
- `/_next/static/*`: `Cache-Control: public, max-age=31536000, immutable`
- `/icons/honeypig*`: `Cache-Control: no-cache, no-store, must-revalidate`

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
2. Compare response headers for `/` and `/icons/honeypig.webp`.
3. Verify deployed artifact commit from `dist/version.json` vs Git HEAD.
4. Check browser extensions/private proxy/VPN cache layers.
