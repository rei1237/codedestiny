# Refactor Inventory (2026-05-27) - Phase 1 Start

## Scope
- Goal: begin safe cleanup implementation without changing product behavior.
- Policy: SAFE_DELETE only for candidates with no runtime/build references.
- Protected zones unchanged: payment/coin-gate, auth/session, premium PDF payment checks, worker entrypoint, wrangler/env bindings.

## Evidence Snapshot
- Branch: main
- Candidate reference check: no code/CI/script references found for `_git_push.cjs`.
- Temp bundle references: only in cleanup reports, not runtime paths.

## Classification

### SAFE_DELETE (applied)
1. `_git_push.cjs`
- Reason: one-off local git helper script; not used by `package.json`, `scripts/**`, `.github/workflows/**`.
- Safety basis: searched references with `rg`; no runtime/import reference found.

### SAFE_DELETE (applied, untracked artifacts)
1. Root temp scripts
- `_tmp_all_modals.mjs`
- `_tmp_check_sukuyo.mjs`
- `_tmp_comments.mjs`
- `_tmp_full_modal_check.mjs`
- `_tmp_modal_check.mjs`
- `_tmp_modal_content.mjs`
- `_tmp_modal_full.mjs`
- `_tmp_modal_ids.mjs`
- `_tmp_modal_ids2.mjs`
- `_tmp_modal_positions.mjs`
- `_tmp_modal_struct.mjs`
- `_tmp_newyear_fullchain_prod_smoke.mjs`
- `_tmp_rewrite_saju_love_pipeline.mjs`
- `_tmp_screens_check.mjs`
- `_tmp_update_saju_love_pipeline.mjs`
- `_tmp_ziwei2.mjs`
- `_tmp_ziwei_actual.mjs`
- `_tmp_ziwei_modal.mjs`
- `_tmp_ziwei_payload_check.mjs`
2. Script temp file
- `scripts/_tmp_lifebook_resume_download_smoke.mjs`
3. Worker temp bundle artifacts
- `worker/_tmp_worker_bundle/**`
- `worker/_tmp_worker_bundle2/**`

### MERGE_DUPLICATE (next target)
1. Duplicate premium/pdf chapter-like constants spread across:
- `worker/routes/premium.js`
- `worker/lib/premium-pdf-specs.js`
- `app/_lib/vedic/pdf/vedicPdfChapters.ts`

2. Duplicate fetch wrappers:
- `index.html` (inline fetch helpers)
- `app/_lib/auth-client.ts`
- `app/_lib/billing-client.ts`
- `js/destiny-profile.js`

## Applied Merge-Duplicate (this phase)
1. API base URL normalization utility unified
- Source of truth: `app/_lib/api-config.ts` `normalizeBaseUrl` (exported)
- Replaced duplicate implementation in `app/_lib/billing-client.ts`
- Behavioral intent: no API behavior change, only utility deduplication

2. Auth HTTP helpers unified
- Added shared utility file: `app/_lib/http-client.ts`
- Unified `toAbsoluteApiUrl` usage in `app/_lib/auth-client.ts`
- Unified timeout fetch helper usage in `app/_lib/auth-store.ts`
- Login API call in auth-store now uses shared URL join helper (same endpoint)

4. auth/me duplicate call guard (phase 3)
- Added short refresh cooldown in `app/_lib/auth-store.ts`:
	- `AUTH_REFRESH_COOLDOWN_MS = 1500`
	- `lastRefreshCompletedAt` timestamp gate in `refreshAuth()` for non-force calls
- Reduced immediate post-login duplicate me fetch pressure:
	- changed silent refresh from `force:true` to `force:false`
	- keeps eventual sync behavior while avoiding back-to-back me fetch bursts

5. me page auth path consolidation (phase 4)
- File: `app/me/page.tsx`
- Removed direct `authFetch('/api/auth/me')` bootstrap call.
- Replaced with `refreshAuth({ force:false, silent:true })` + `getAuthState()`.
- Keeps redirect-on-invalid behavior and profile state load flow.
- Purpose: route-level me fetch dedupe and auth-store single source path.

6. static shell guest auth probe dedupe (phase 5)
- File: `index.html` (root source only)
- Added guest auth probe guard state:
	- `__CD_GUEST_AUTH_PROBE_COOLDOWN_MS = 8000`
	- `__cdGuestAuthProbeState { checkedAt, pending }`
- Replaced unconditional guest-branch `/api/auth/me` fetch with guarded probe helper.
- Reset probe cache on `cd:auth-changed` and relevant `storage` events.
- Purpose: reduce repeated `/api/auth/me` calls from shell auth re-render triggers.

7. legacy duplicate block cleanup
- File: `app/_lib/legacyApiProxy.js`
- Removed an accidentally duplicated full module block (same functions/exports duplicated).
- Purpose: reduce source confusion and unnecessary bundle parse/size overhead.

8. low-risk lint cleanup (phase 6)
- Files:
	- `app/api/palm/analyze/route.ts`
	- `app/_lib/api-config.ts`
	- `app/_lib/billing-client.ts`
- Changes:
	- Replaced `window as any` with typed runtime window alias.
	- Replaced `require("sharp")` with dynamic `await import("sharp")`.
	- Removed unused catch parameter.
	- Tightened `unknown` result handling with runtime guards before property access.
- Purpose: reduce non-critical lint/type noise without changing runtime behavior.

3. Broken smoke script mapping fixed
- `package.json` `test:auth-session` pointed to missing file `scripts/auth-session-smoke.mjs`
- Updated to existing safe script `scripts/auth-wrong-password-smoke.mjs`

## Validation Results (this phase)
1. `npm run build`: PASS
2. `npm run typecheck`: PASS
3. `npm run lint`: FAIL (existing repository-wide warnings; not introduced by this change)
4. `npx eslint app/_lib/api-config.ts app/_lib/billing-client.ts`: 0 errors, warnings only
5. `npm run build:worker` (wrangler dry-run): PASS (non-blocking warning only)

## Validation Results (phase 3 auth/me dedupe)
1. `npm run typecheck`: PASS
2. `npx eslint app/_lib/auth-store.ts app/_lib/auth-client.ts app/_lib/http-client.ts`: PASS (no errors)
3. `npm run test:auth-session`: PASS
4. `npm run build`: PASS

## Validation Results (phase 4 me-page dedupe)
1. `npm run typecheck`: PASS
2. `npx eslint app/me/page.tsx app/_lib/auth-store.ts`: PASS (no errors)
3. `npm run test:auth-session`: PASS
4. `npm run build`: PASS

## Validation Results (phase 5+extra cleanup)
1. `npm run sync:public`: PASS
2. `npm run verify:locale-main-sync`: PASS
3. `npm run verify:runtime-cache-sync`: PASS
4. `npm run typecheck`: PASS
5. `npx eslint app/_lib/legacyApiProxy.js app/me/page.tsx app/_lib/auth-store.ts`: PASS (no errors)
6. `npm run build`: PASS

## Validation Results (phase 6 low-risk lint cleanup)
1. `npm run typecheck`: PASS
2. `npx eslint app/api/palm/analyze/route.ts app/_lib/api-config.ts app/_lib/billing-client.ts`: PASS (no errors)

## Smoke Results (non-destructive)
1. `npm run test:auth-session`: PASS
- `REGISTER_STATUS=201`
- `WRONG_PASSWORD_LOGIN_STATUS=401`
- `LOGIN_STATUS=200`

2. `GET /api/auth/me` on prod: PASS
- `200` with `authenticated:false` response shape

3. `POST /api/profile/list` without auth: PASS (guard)
- `401 Authentication is required`

4. `GET /api/billing/features?featureKey=tarot-year-fortune`: PASS
- `200` with pricing payload

5. `GET /api/billing/features?featureKey=coin-gate-per-use`: expected non-success for bare feature key
- `404 PRICE_NOT_FOUND` (reason/sub-feature required)

6. `GET /api/admin/ping` and `/api/admin/key-health` on prod
- `404 not_found` (no public ping route exposed in current deployment)

### DEPRECATE_KEEP (not deleted)
1. Legacy premium alias and adapter paths in `worker/routes/premium.js`
- Kept due potential string-based route compatibility.
2. Server auth fallback routes in `server/routes/auth.routes.js`
- Kept due active fallback/bridge risk.

### DO_NOT_TOUCH (kept)
- `worker/index.js`
- `worker/wrangler.toml`
- `wrangler.toml`
- payment/auth/premium core handlers under `worker/routes/**`

## Next Actions
1. Keep Worker/Pages generated cache-bust diffs for review or isolate them in a dedicated sync commit.
2. Continue duplicate reduction batch on auth-store/api-config timeout/fetch helper alignment.
3. Execute manual smoke checks for login/profile/coin-gate/PDF modal open paths without real coin deduction.
