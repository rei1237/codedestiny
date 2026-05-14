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

## 7) Deployment Reflection & Cache Guard (Must Follow)
- Before editing UI, identify live-render source first:
	- Static main screen users see first: `index.html` (not auxiliary React home).
	- React route UI: `app/**` only when that route is actually served.
- If request targets main shell UX/cards, modify `index.html` and any referenced runtime styles in `styles/**`.
- After `index.html` or static-style edits, always run in order:
	1. `npm run sync:public`
	2. `npm run verify:locale-main-sync`
	3. `npm run verify:runtime-cache-sync`
- Cache-bust rule for static assets:
	- When changing a file loaded by fixed URL (for example `/styles/core-ui.css`), bump the query version in `index.html` (for example `?v=YYYYMMDD-tag`) in the same commit.
	- When changing an already versioned runtime/static file (for example `/js/core/index-inline-runtime.js` or `/js/saju-engine-tarot-sukuyo-quantum.js`), always bump to a NEW cache key in the same commit (never reuse the previous `?v=` value).
	- If the changed file is loaded through another loader map, bump BOTH levels together:
		1. entry include key (for example `index.html` script `?v=`)
		2. loader target key (for example runtime map URL `?v=`)
	- Verify the new key exists in root source and synced mirrors after `npm run sync:public`.
- Reflection verification before reporting "done":
	- Confirm changed marker text/attribute exists in root `index.html` and mirrored `public/static/index.html` after sync.
	- Include the exact changed marker in commit message/body or report so production verification is immediate.

## 8) Login UI Regression Guard (Must Follow)
- For logged-in main-shell card changes, treat `index.html` auth hero/card block as a protected block.
- After any `index.html` or `scripts/sync-legacy-static-to-public.mjs` edits, verify these markers exist in root + mirrors:
	- `id="authQuickLinks"`
	- `.cd-user-card__avatar-ring::before`
	- `animation:cdPlanetRingDrift 5.4s ease-in-out infinite`
	- `id="cdAuthLogoutBtn" class="auth-btn auth-btn--logout"`
- Mandatory check command before commit:
	- `npm run verify:locale-main-sync`
