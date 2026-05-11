# Cleanup Report

## Summary
- Date: 2026-05-11
- Scope: Safe cleanup of temporary artifacts and build/cache outputs only.
- Safety policy: No SEO, payment, auth, worker, routing, or runtime source files were deleted.
- Result: 13 candidates deleted, 0 remaining candidates after re-check.

## Deleted
Deleted by `npm run clean:repo:apply` (from `reports/cleanup-applied.json`):
- _tmp_cleanup_psychotest_and_splash_comment.mjs (temporary-artifact)
- _tmp_fix_saveTileLocks_dup.cjs (temporary-artifact)
- _tmp_palm_attached_smoke_with_clientlike_data.mjs (temporary-artifact)
- _tmp_palm_attached_smoke.mjs (temporary-artifact)
- _tmp_patch_auth_lock_indexes.cjs (temporary-artifact)
- _tmp_patch_splash_indexes.mjs (temporary-artifact)
- _tmp_premium_pdf_api_smoke_love.mjs (temporary-artifact)
- _tmp_premium_pdf_api_smoke.mjs (temporary-artifact)
- _tmp_scan_charset.mjs (temporary-artifact)
- .next (build-or-cache-directory)
- .wrangler (build-or-cache-directory)
- dist (build-or-cache-directory)
- tsconfig.tsbuildinfo (typescript-buildinfo)

## Merged
- No source consolidation or service-map merge was applied in this pass.
- Duplicate/service-code consolidation was deferred to avoid behavior risk.

## Deferred
Deferred from auto-audit findings and kept for safety:
- `js/saju-engine.js`, `public/js/saju-engine.js`
- `manifest.json`, `manifest-samba.json`, `service-worker.js`
- locale/static mirrors and sync-related files managed by `scripts/sync-legacy-static-to-public.mjs`
- all SEO-critical files and route metadata/middleware surfaces

Reason for defer:
- Audit output includes protected/unreached and duplicate candidates that can be false positives in this repo due to intentional static mirroring and runtime sync rules.

## SEO Checked
Confirmed as protected and not modified/deleted during cleanup:
- app/layout.js
- app/sitemap.ts
- app/robots.ts
- middleware.js
- scripts/sync-legacy-static-to-public.mjs

## Core Regression
Post-clean checks:
- `npm run clean:repo:dry` after apply: `candidates=0`
- Non-cleanup user artifacts were preserved (no forced reset/revert performed).

## Build Result
- `npm run build`: success
- Build pipeline passed `sync:public`, `verify:public-parity`, `verify:locale-main-sync`, and `verify:runtime-cache-sync`
- Next.js build/export completed successfully

## Lint and Typecheck
- `npm run lint`: failed due to existing repository-wide lint backlog (not introduced by this cleanup pass)
- `npm run typecheck`: failed due to existing repository-wide type backlog (not introduced by this cleanup pass)

## Audit Snapshot
From current reports:
- unusedCandidates: 299
- protectedButUnreached: 762
- duplicateGroups: 317
- duplicateFilesInGroups: 648
- largeFiles: 18
- imageOptCandidates: 81

## Risks
- Auto-audit candidate lists should not be directly deleted without reachability + runtime validation, especially for mirrored static files and engine aliases.
- Existing lint/type issues remain unresolved and should be handled in dedicated follow-up PRs.
