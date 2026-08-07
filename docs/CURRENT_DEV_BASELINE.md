# Current Dev Baseline

Last curated: `2026-08-02`

## Curation Rules

1. This document is the only time-sensitive working summary for current development.
2. Keep only repo facts that are directly useful for the current working tree and the active service roadmap.
3. Prefer current code, current tests, and root operating docs over historical audits or generated reports.
4. Exclude these paths from default reference unless the user explicitly asks for them:
   `.claude/worktrees/**`, `.codex-worktrees/**`, `.cleanup/**`, `reports/**`, `docs/performance-audit/results/**`
5. If a detail is no longer actionable for current development, remove it here and keep it only as historical evidence elsewhere when needed.

## Active Sources

- Execution contract: `AGENTS.md`
- Current working summary: `docs/CURRENT_DEV_BASELINE.md`
- Project operating context: `CLAUDE.md`
- Conflict and exception log: `docs/CONTEXT_AUDIT.md`
- Structure references: `docs/SERVICE_STRUCTURE.md`, `docs/FEATURE_MAP.md`, `docs/ROUTE_MAP.md`
- Risk and platform references: `docs/PAYMENT_AND_ACCESS.md`, `docs/LLM_AND_AI_POLICY.md`, `docs/DEPLOYMENT_AND_INFRA.md`, `docs/DEBUGGING_GUIDE.md`

## Current Focus

### 1. Billing, access, and pass safety

- Source files: `worker/routes/billing.js`, `worker/routes/payments.js`, `worker/lib/paid-feature-registry.js`, `worker/lib/billing-policy.js`, `worker/lib/profile-limits.js`, `worker/lib/payment-refund.js`
- Why it matters now: current work keeps touching purchase entry, pass coverage, entitlement repair, and access-policy enforcement. Server policy remains the final authority.

### 2. Session, profile, and points state consistency

- Source files: `app/_lib/auth-client.ts`, `app/_lib/auth-store.ts`, `app/_lib/user-session-cache.ts`, `app/_lib/consultationResultPolling.ts`, `app/me/MeClient.tsx`, `app/points/PointsClient.tsx`, `app/points/history/PointHistoryClient.tsx`, `worker/lib/auth.js`, `worker/lib/db.js`
- Why it matters now: sign-in state, profile hydration, points history, and client/server state repair are still active regression areas.

### 3. Premium tarot yearly experience

- Source files: `lib/tarot/tarot-year-premium.mjs`, `worker/routes/tarot.js`, `app/tarot/year/page.tsx`, `js/tarot-year-fortune-experience.js`, `styles/tarot-year-fortune.css`, `__tests__/worker/tarot-year-premium.test.js`
- Why it matters now: the yearly tarot premium flow spans content generation, UI entry, server response shape, and regression tests as one active surface.

### 4. Static shell and runtime sync

- Source files: `index.html`, `js/core/index-inline-runtime.js`, `js/core/uiBindings.js`
- Why it matters now: the root shell is still the live home source of truth, and mirror sync remains a recurring regression risk.

### 5. Preview-first delivery safety

- Source files: `AGENTS.md`, `scripts/deploy-safe.mjs`, `scripts/lib/change-risk.mjs`, `scripts/lib/worker-deploy-base-guard.mjs`, `.github/workflows/cloudflare-pages-deploy.yml`
- PR-first delivery was retired on 2026-08-08. Work on `main`; ship with `npm run deploy:safe`, which previews, opens the browser, and waits at a `[y/N]` prompt before promoting. Pushing to `main` deploys nothing, and a preview is only created as part of a real release.
- `deepRequired` in `change-risk.mjs` replaces the old PR lane: auth, payment, DB schema, and deployment-pipeline paths force the full `deploy:critical` regression and an explicit confirmation before promotion.
- Worktrees remain available for parallel sessions. The deploy lock and `.deploy-state/` live in the primary worktree, so only one worktree can promote at a time, and `assertWorkerBaseIsFresh` blocks a stale base from erasing upstream `worker/`/`lib/` commits.

## Working Rules For Current Tasks

1. Start with this file only for what is current right now. If it drifts, update it instead of adding another summary document.
2. For billing, access, or pass work, read this file together with `docs/PAYMENT_AND_ACCESS.md`.
3. For shell-entry or home runtime work, check `index.html` and `js/core/**` before touching mirrored outputs.
4. Immersive React fortune routes must own their home/back controls and must not render the shared header, footer, or mobile bottom navigation.
5. For premium tarot yearly work, verify both `lib/tarot/tarot-year-premium.mjs` and `worker/routes/tarot.js` before editing UI copy or flow logic.
6. Treat historical audit outputs as evidence only, not as active coding instructions.
7. When presenting options to the user, always state one recommended path first, mark it clearly as the recommendation, and briefly explain why it is the best default. Do not present a flat neutral list unless the user explicitly asks for neutral comparison only.
