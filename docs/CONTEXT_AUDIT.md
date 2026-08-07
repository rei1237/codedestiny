# Context Audit

## Purpose

This file is no longer a duplicate current-state summary.
Use it only for:

- documenting conflicts between active documents
- recording exceptions that cannot live in `docs/CURRENT_DEV_BASELINE.md`
- marking older material as historical-only evidence

## Active Document Precedence

1. `AGENTS.md`
2. `docs/CURRENT_DEV_BASELINE.md`
3. `CLAUDE.md`
4. `docs/CONTEXT_AUDIT.md`

If the first three documents disagree, do not merge rules silently. Record the mismatch here, then resolve it before coding.

## Delivery Policy

- Active rule: work on `main` directly. Ship with `npm run deploy:preview`, let the user inspect the preview, then `npm run deploy:production`. Pushing to `main` deploys nothing.
- Active rule: production promotion needs explicit user approval for that exact run. Preview does not.
- Enforcement: `scripts/deploy-safe.mjs` (artifact fingerprint, shared lock, auto-rollback), `scripts/lib/change-risk.mjs` (`deepRequired` forces the full regression on auth/payment/DB/pipeline paths), `scripts/lib/worker-deploy-base-guard.mjs` (stale-base block), `scripts/verify-worker-single-deploy-guard.mjs` (no second deploy path).
- **2026-08-08 — PR-first policy retired.** The branch → PR → review → merge → deploy chain was removed for a single-developer repository: it cost time and agent tokens without preventing regressions, and `main` never had branch protection or a ruleset enforcing it anyway. Deleted with it: the worktree-policy judge, the release-fast direct lane, the release-PR-overlap check, the Pages PR contract check, the CI-gate waiter, the Codex PR helper directory, and the worktree-pr-policy / pages-build-gate / cloudflare-safe-auto-release workflows. Recover any of them from git history before 2026-08-08 if needed. What replaced review is verification depth, not less checking.
- Historical drift: any document describing a PR lane, `release:fast`, `verify:worktree-policy`, or a push-triggered production deploy predates this change.

## Current Conflict Resolutions

### Static home source of truth

- Active rule: root `index.html` is the live home source.
- Related detail: `public/**/index.html` files are generated mirrors and should not be patched directly unless explicitly requested.

### Runtime API source of truth

- Active rule: `worker/**` is the primary runtime API surface.
- Exception note: `server/**` remains legacy or fallback only when no Worker equivalent exists.

### Payment wording and access model

- Active rule: user-facing payment terms stay `이용권`, `월정석`, `단건 결제`.
- Historical drift: older docs and code comments may still mention coins or legacy payment phrasing. Treat those as implementation residue, not current product copy.

### Deployment safety

- Active rule: no production deploy without explicit approval for that exact run. The preview stage runs freely; only promotion is gated.
- Historical drift: older deployment notes may describe a PR-gated or push-triggered release. Use the preview-then-promote rule instead.

## Historical-Only References

The following may still be useful as evidence, but they are not active coding baselines:

- `PROJECT_STRUCTURE.md`
- `PAYMENT_POLICY.md`
- `PAYMENT_CONCURRENCY_AUDIT.md`
- `CLOUDFLARE_PAGES_SETUP.md`
- `DEPLOY_CHECKLIST.md`
- `docs/payment-policy-overview.md`
- `docs/payment-policy-content-access.md`
- `docs/payment-policy-flow.md`
- `docs/deploy-cache.md`
- `docs/r2-assets-cache-strategy.md`
- `docs/admin-subscription-tier-simulation-checklist-2026-04-22.md`
- `docs/portone-resubmission-checklist-2026-04-16.md`

## Notes Requiring Care

- `docs/payment-policy-flow.md` contains a title date older than its latest referenced revision history. Treat current content and active billing docs as authoritative over the title date alone.
- `worker/wrangler.toml` may describe public vars and placeholders, but production secrets still live outside the repo.
- `app/api/*` can exist for Next/App Router needs, but the deployed runtime path must always be verified against `worker/index.js` and the active Pages routing model.

## Maintenance Rule

When a new stale reference or document conflict is found:

1. update `docs/CURRENT_DEV_BASELINE.md` if the current baseline changed
2. remove the stale link from active docs when possible
3. record the exception here only if the older material must remain for evidence
