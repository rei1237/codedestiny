# Agent Working Rules (Deployment-Only)

## 1) Goal
- Always modify deploy-target source files first.
- Never patch legacy mirror files directly unless explicitly requested.

## 2) Source of Truth (Edit These)
- Worker runtime API: `worker/**`
- Next.js app/runtime UI: `app/**`, `components/**`, top-level runtime modules imported by app routes (for example `StonehengeRune.jsx`)
- Main static shell source: `index.html`
- Build/deploy pipeline scripts: `scripts/**`, `package.json`

## 3) Legacy / Mirror Paths (Do Not Edit Directly)
- `public/static/index.html`
- `public/ja/index.html`
- `public/en/index.html`
- `public/zh/index.html`
- Any other generated mirror under `public/**` that is synced from root source
- Node server fallback routes for production billing/auth behavior when equivalent worker route exists: `server/**`

## 4) Required Sync Flow for Main Shell
1. Edit only `index.html`.
2. Run `npm run sync:public` to propagate to `public/*` mirrors.
3. Run `npm run verify:locale-main-sync` and `npm run verify:runtime-cache-sync`.

## 5) Payment/Coin/Auth Policy
- New payment/coin/auth logic must be implemented in worker-native routes (`worker/routes/**`).
- Frontend must call worker-backed runtime endpoints (for example `/api/billing/*`) and avoid direct legacy server endpoints.
- Feature pricing must be resolved server-side from registry, not hardcoded in frontend for final billing decision.

## 6) PR Safety Checklist
- No direct edits in mirror locales unless explicitly requested.
- No behavior-only fix applied exclusively under `server/**` when worker route is active.
- Build and runtime sync checks pass before commit.
