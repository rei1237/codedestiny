# Verified legacy cleanup audit

Audited: 2026-08-05 KST
Base: `origin/main` at `78df0265c`
Scope: repository files only. No production database, payment, LLM, deployment, or R2 object mutation was performed.

## Baseline

| Area | Finding | Classification |
| --- | --- | --- |
| Runtime | Next.js 15 / React 18 with a root static home shell, Cloudflare Pages build, and Worker-native `/api/*` routing | A: required |
| Entry points | `index.html` is the live home source; `public/**/index.html` are generated mirrors; Worker entry is `worker/index.js` | A: required |
| Package manager | npm with root `package-lock.json`; no root pnpm, Yarn, or Bun lockfile | A: required |
| Build/deploy | `package.json`, `next.config.mjs`, `wrangler.toml`, `wrangler.assets.toml`, and `worker/wrangler.toml` are active configuration | A: required |
| Public assets | `public/**`, root static pages, `fuctionassets/**`, and R2 URL references require dynamic-reference review | B: indirect reference possible |
| PDFs | Zero tracked `.pdf` files. Current PDF export/archive code, route rewrites, translations, and tests are actively referenced | A: required |
| Payment/access | Server authority is concentrated in `worker/routes/{billing,payments}.js` and `worker/lib/{entitlement-policy,paid-feature-registry,billing-policy,profile-limits}.js` | A: required |
| Audit tool output | 1,712 unreachable candidates, including 1,073 protected paths; the tool cannot prove dynamic/R2/CMS references | E: manual review |

The static audit was run with `npm run audit:cleanup`; it scanned 3,871 files, found 62 large files, 106 image-optimization candidates, and 272 duplicate-content groups. These are discovery signals, not deletion authorization.

## PDF decision

No repository PDF binary is eligible for deletion. `worker/lib/pdf-runtime.js`, `lib/pdf/export-result-pdf.ts`, `/api/billing/pdf-archive/*`, its `/api/premium/pdf-archive/*` compatibility rewrite, PDF translations, and feature-specific export buttons are current runtime paths. Existing purchaser download records may be backed by MongoDB/R2 and were not queried or changed.

## Candidate disposition

| Path | Type | Current reference | Live use | Risk | Action | Validation |
| --- | --- | --- | --- | --- | --- | --- |
| `dev-prompt-hub-3002.err` | local dev error log | no repository reference | unused | low | delete | `rg` exact-name scan; clean install/build unaffected |
| `dev-prompt-hub-3003.err` | local dev error log | no repository reference | unused | low | delete | same |
| `dev-prompt-hub-3004.err` | local dev error log | no repository reference | unused | low | delete | same |
| `dev-server.err` | local dev error log | no repository reference | unused | low | delete | same |
| `dev-test-window.err` | local dev error log | no repository reference | unused | low | delete | same |
| `worker-dev.err` | local dev error log | no repository reference | unused | low | delete | same |
| `public/**`, R2 paths, store assets, mobile resources | public/dynamic assets | static and dynamic references possible | confirm required | high | retain | manual route/R2/CMS review |
| legacy pass/coin/Family strings | policy code/copy | payment and static-shell paths | active/uncertain | high | retain | server-policy and UI parity tests |
| tracked audit/history documents | operations evidence | documentation may be needed for recovery | uncertain | medium | retain | explicit retention decision |
| dependencies | Node build/test/deploy tooling | scripts and dynamic CLI usage possible | active/uncertain | medium | retain | per-package clean-install validation |

## R2 candidates

See `docs/r2-cleanup-candidates.json`. It intentionally contains no deletion candidates: this audit did not list R2, query MongoDB, or inspect purchase history.

## Rollback

The only deletion commit in this cleanup is independently revertible. Revert that commit to restore the six development logs and the `.gitignore` rule.
