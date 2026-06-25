# Cloudflare Pages Deployment Checklist

Detailed cache/version runbook: [docs/deploy-cache.md](docs/deploy-cache.md)

## 1) Build and artifact validation

1. Run `npm run build`.
2. Confirm build log shows commit and branch (`[build-context]` lines).
3. Confirm `dist/_headers` exists.
4. Confirm `dist/version.json` exists and contains current commit hash.
5. Confirm `dist/static/version.json` exists.
6. Confirm `.next/static` does not contain local API origins: `rg "127\\.0\\.0\\.1:8790|localhost:8790" .next/static`.

## 1.1) Required Cloudflare Pages environment variables

Set these in Cloudflare Pages -> Settings -> Environment variables -> Production:

```env
NEXT_PUBLIC_API_URL=https://code-destiny.com
NEXT_PUBLIC_API_BASE_URL=https://code-destiny.com
NEXT_PUBLIC_AUTH_API_BASE_URL=https://code-destiny.com
```

Do not set any Production public API variable to `http://127.0.0.1:8790` or `http://localhost:8790`.

## 2) Cloudflare Pages deployment validation

1. In Cloudflare Pages deployment logs, confirm the latest Git commit is used.
2. Confirm build logs include:
   - `[build-context] commit=...`
   - `[write-version-json] commit=...`
3. Open both domains and compare versions:
   - `https://code-destiny.com/version.json`
   - `https://codedestiny.pages.dev/version.json`
4. Verify `commit` or `commitShort` matches the deployed Git commit.

## 3) Cache policy validation

1. Check response headers for these paths and verify `Cache-Control: no-cache, no-store, must-revalidate`:
   - `/`
   - `/index.html`
   - `/static/index.html`
   - `/api/health`
   - `/version.json`
2. Check hashed Next.js static files (`/_next/static/...`) return:
   - `Cache-Control: public, max-age=31536000, immutable`
3. Check non-hashed legacy assets (`/js/*.js`, `/styles/*.css`, `/icons/*`) return no-cache/no-store.

## 4) Purge and browser verification

1. In Cloudflare dashboard, run **Purge Everything**.
2. Hard refresh both custom domain and pages.dev domain.
3. In browser DevTools > Application:
   - Service Workers: no old worker should remain registered.
   - Cache Storage: old keys (for example `kkul-mansaeryeok-*`, `fortune-tama-*`) should be removed.
4. Confirm UI and static assets reflect the latest deployment.

## 5) Rollback safety check

1. If stale content still appears, compare custom domain vs pages.dev `/version.json` output.
2. If versions differ, inspect Cloudflare Pages project connection/branch settings.
3. If versions match but UI differs, inspect browser extensions, SW registration, and local cache state.
