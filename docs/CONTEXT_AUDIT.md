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

## Worktree and PR Policy

- Active rule: the primary repository worktree, `main`, `master`, and detached HEAD are not valid edit or commit locations. Normal changes must use a registered secondary worktree created from the latest `origin/main`.
- Active rule: delivery goes through a feature branch and a PR targeting `main`. Required checks, review approval, final-diff scope confirmation, and explicit user merge approval are required before merge. Production deployment remains a separate explicit approval.
- Enforcement: `scripts/verify-worktree-policy.mjs`, PreToolUse hooks, the worktree PR policy workflow, and the GitHub main branch ruleset enforce the rule at local, CI, and repository levels.
- Historical drift: older instructions that create a fresh branch in the current primary worktree or auto-deploy a Worker are superseded by this rule.

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

- Active rule: no production deploy without explicit approval, and production release work goes through a PR first.
- Historical drift: older deployment notes may describe direct or manual flows. Use the active approval-first rule instead.

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
