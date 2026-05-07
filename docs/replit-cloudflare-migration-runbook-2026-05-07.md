# Replit to Cloudflare Migration Runbook (Commercial Ready)

## 1) App type decision (static vs backend)

Current repository is **not frontend-only**.

- Frontend static:
  - Next.js export output (`dist/`)
  - Legacy static entries (`public/index.html`, localized static files)
- Backend logic present:
  - Cloudflare Worker API (`worker/index.js`, `worker/routes/*`)
  - Legacy Node/Express server (`server/*`) still exists as fallback code

Final classification:
- whole service: hybrid-static-plus-backend

## 2) Cloudflare-incompatible Node module policy

Cloudflare target runtime must be split:

- Pages runtime: static only (`dist/`, `public/*`)
- Worker runtime: `worker/*` only
- Legacy Node server (`server/*`) is not deployed to Worker

Automated checker added:

- Script: `scripts/verify-cloudflare-migration-readiness.mjs`
- Command: `npm run verify:cf:migration`

What it validates:

- Required deployment files exist
- `wrangler.toml` and `worker/wrangler.toml` core keys are aligned
- Worker source does not import blocked Node-only modules (`fs`, `path`, `child_process`, etc.)
- Legacy Express server presence warning

Use this check before production deploy.

## 3) Wrangler strategy for this project

Recommended production topology:

- Cloudflare Pages for frontend static hosting
- Cloudflare Worker for API routing and business logic

Existing config to keep:

- Pages config: `wrangler.toml` with `pages_build_output_dir = "dist"`
- Worker config: `worker/wrangler.toml` with `main = "index.js"`

Do not merge both workloads into one Worker unless migration to full SSR/edge runtime is planned.

## 4) Database and environment variable strategy

### Current production-safe baseline

- DB: MongoDB Atlas via Worker (`MONGO_URI`, `MONGO_DB_NAME`)
- Secrets: set in Cloudflare Worker secrets
- Frontend public envs: keep minimal, avoid secret leak

Required Worker env/secrets (minimum):

- `JWT_SECRET`
- `MONGO_URI`
- `MONGO_DB_NAME`
- `AUTH_FRONTEND_BASE_URL`
- `AUTH_API_BASE_URL`
- payment/oauth keys only if that flow is enabled

### D1 migration option (optional)

If you want pure Cloudflare-native data plane:

- Move auth/session/payment tables to D1
- Replace Mongoose repository code with SQL repository adapters
- Keep a dual-write migration window if existing Atlas data must be preserved

Do not switch to D1 in one shot without data validation + rollback plan.

## 5) Production deploy checklist

1. `npm run verify:cf:migration`
2. `npm run build:cf`
3. `npm run build:worker`
4. `npm run deploy:cf:worker`
5. `npm run deploy:cf:pages`
6. Smoke test:
   - frontend page load
   - `/api/health`
   - login/register
   - payment callback (if active)
   - social oauth callback (if active)

## 6) External feature links

If a feature is hosted externally (for example, on Replit), keep the main-page banner CTA as an external link and avoid in-repo static route dependencies for that feature.
