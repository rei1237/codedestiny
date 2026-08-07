# AGENTS.md

## Project Identity

- Code Destiny is a Korean fortune and AI consultation service.
- It combines Saju, Zi Wei Dou Shu, Sukuyo, astrology, Vedic astrology, tarot, AI consultation, music, PDF reports, reviews, admin tools, and paid access.
- The product voice must feel professional, mystical, emotionally natural, and grounded. Never use deterministic fear marketing or guaranteed outcomes.

## Tech Stack

- Frontend: Next.js 15 App Router, React 18, TypeScript, JavaScript, Tailwind CSS.
- Runtime: Node.js 20+, Cloudflare Pages, Cloudflare Workers.
- API: Worker-native `/api/*` routing from `worker/index.js`; some `app/api/*`; legacy Express under `server/**`.
- DB: MongoDB Atlas with Mongoose models, primarily `worker/lib/models.js`.
- Payment: PortOne V2 with KG Inicis channel.
- LLM: Gemini REST primary, Cloudflare Workers AI fallback.
- Assets: `public/**`, root static HTML, R2 public assets, music R2 custom domain.
- UI/UX적으로 중요한 신규 이미지 에셋은 직접 제작하거나 기존 승인 에셋에서 파생해 repo-local WebP로 최적화한다. 외부 핫링크나 임시 생성 경로를 production UI에 직접 참조하지 않는다.
- Mobile: Capacitor Android wrapper under `apps/mobile/**`.

## Non-Negotiable Rules

- Do not run real payments without explicit user approval.
- Do not call real LLM APIs without explicit user approval.
- Do not write to production MongoDB without explicit user approval.
- Do not deploy to production without explicit user approval.
- Do not make real LLM API calls, run real payments, write to production DB, or deploy to production during ordinary coding work. Use mock/fake/stub, sandbox, local DB, or test DB validation only unless the user explicitly approves the exact live action.
- Production promotion always needs explicit user approval for that exact run — the `[y/N]` prompt in `deploy:safe` is that approval.
- Create a Cloudflare preview only when a release is actually intended; each run leaves a Pages deployment and a Worker version behind. `npm run deploy:check` is the no-upload way to inspect a change set.
- Pushing to `main` deploys nothing. Git is backup, history, and the rollback reference; production is reached only by `npm run deploy:safe` (or the `deploy:production` half of the split) or the manual GitHub Actions dispatch.
- Do not expose secrets, API keys, tokens, MongoDB URIs, R2 credentials, OAuth secrets, JWT secrets, or PortOne secrets.
- Approved public-contact exception: `worker/routes/fortune.js` and `app/points/history/PointHistoryClient.tsx` may contain the homepage owner's designated contact metadata. The user has explicitly approved publishing these two files through the normal deployment workflow. Treat only that pre-approved project contact metadata as allowed; newly discovered personal data, credentials, payment data, auth material, or unrelated contact information remains blocked and must not be uploaded or logged.
- Do not delete existing features, routes, badges, or content unless the user explicitly asks.
- Do not remove `준비중` badges without user approval.
- Do not change payment policy, prices, access order, refund behavior, auth, DB schema, Worker bindings, or deployment config casually.
- Payment wording must keep these product terms: `이용권`, `월정석`, `단건 결제`.
- Do not introduce new user-facing coin-centered payment copy. Coins are legacy internal calculation units.
- Static shell and React routes are not interchangeable. The live home source is root `index.html`.
- Mirror files under `public/**/index.html` are generated mirrors. Do not patch them directly unless explicitly requested.
- Mobile UI regressions are high risk. Preserve route behavior, safe areas, touch targets, and app payment routing.
- 몰입형 React 운세 경험은 공용 헤더·푸터·모바일 하단 내비게이션을 렌더하지 않고, 페이지 안에서 접근 가능한 홈·뒤로가기 이탈 제어를 제공한다.

## Delivery: Preview First, Then One Command

PR-first delivery was retired on 2026-08-08. This is a single-developer repository; the branch → PR → review → merge → deploy chain cost time and agent tokens without preventing regressions. What prevents regressions now is the pipeline: risk-scaled checks, a real preview the user inspects, and a production promotion that verifies itself and rolls back on failure.

Work happens on `main` by default. `main` has no branch protection and no ruleset — nothing rejects a direct push.

```
edit on main → commit
   ↓
npm run deploy:safe         checks → build → Pages preview + Worker preview version → smoke
                            → opens the browser → WAITS at a [y/N] prompt
   ↓                        (the user inspects the preview, then answers)
                            y → Worker 100% → Pages production → health check (auto-rollback on failure)
                            N → nothing is promoted; the preview URL stays available
   ↓
git push origin main        backup
```

🔴 **A preview is created only as part of an actual release.** Do not run `deploy:preview` as a routine verification step — every run uploads a Pages deployment and a Worker version to Cloudflare. `deploy:safe` is the default because it puts the preview immediately before the promotion decision, with a human gate in between. Use `deploy:check` when you only want to inspect a change set.

- `npm run deploy:check` prints the change set, risk, deep-verification hits, and the live Cloudflare configuration. It uploads nothing.
- `npm run deploy:preview` / `npm run deploy:production` split the same pipeline across two commands. Reach for the split only when the inspection has to happen in a separate session from the promotion; otherwise use `deploy:safe`.
- `npm run deploy:production` requires the recorded preview to match `HEAD` and to have passed smoke. It prompts before promoting unless `--yes` is passed. Declining is a clean exit, not an error.
- `npm run deploy:rollback -- --list` shows recent Pages deployments and Worker versions; `-- --yes --to=<pagesDeploymentId> [--worker-version=<id>]` rolls back and then smokes production.
- The GitHub Actions **Release Cloudflare Pages and Worker** workflow is the backup path — `Run workflow` with `mode: preview` or `mode: production`. It has no push trigger.

### Verification depth instead of review

`scripts/lib/change-risk.mjs` remains the single source of truth and still judges two independent axes. Run `node scripts/lib/change-risk.mjs <file...>` to see the verdict for a change set.

| Axis | Meaning |
|---|---|
| `level` (low/medium/high) | How deep the ordinary checks go |
| `deepRequired` | Paths a preview smoke cannot validate — auth/login, payment/entitlement, DB schema and migrations, and the deployment pipeline itself |

`deepRequired` used to mean "a human must review this". It now means the pipeline runs the full `deploy:critical` regression regardless of `level`, and `deploy:production` names the offending paths and asks before promoting. The reasoning is unchanged: auth and payment bugs return HTTP 200 while being wrong, migrations cannot be rolled back, and a broken pipeline destroys the recovery path.

The two axes stay independent. `worker/**` remains `level=high`, so `deploy:critical` runs on it either way.

### Parallel sessions, independent deploys

Run each concurrent session in its own worktree:

```powershell
powershell -File scripts/create-safe-worktree.ps1 -Slug <name>
```

Work there, ship from there, and merge back with a plain `git merge` — no PR. Sessions never wait on each other to build or preview.

**What is parallel and what is serial:**

| Stage | Concurrency | Why |
|---|---|---|
| `deploy:check`, checks, `build:cf` | fully parallel | each worktree has its own `dist/`, `out/`, `.next/` |
| Preview upload + smoke | fully parallel | every worktree gets its own `safe-preview-<sha>` Pages URL and Worker preview alias |
| **Production promotion** | **serialized** | there is exactly one production. Two promotions cannot both win |

- `.deploy-state/state.json` is **per-worktree** — it records *your* preview artifact. Sharing it would let one worktree's preview overwrite another's, and the next promotion would ship the wrong artifact with a valid-looking fingerprint.
- `promote.lock` lives in the **primary** worktree and is held only during promotion and rollback, never during build or preview, and never while the `[y/N]` prompt is waiting. A blocked worktree is told which pid, which worktree, and since when.

**The regression guard is the important part.** Serialization alone does not prevent worktree B from erasing what worktree A just shipped — `wrangler` uploads the working tree, not a commit, so B's clean tree and green tests say nothing about A's work. Before promoting, `deploy-safe` reads the live commit from `/version.json` and `/api/version` and refuses unless your HEAD contains it:

```
Worker is live at 4f2a1c9b3d51, and your HEAD does not contain it.
  Promoting now would roll production back to before that deploy — another worktree shipped it.
  Run: git fetch origin && git merge 4f2a1c9b3d51
```

This is what actually stops the 2026-08-01 failure, where four merged changes vanished. Live is the reference, not `origin/main`, because local-first deploys mean production can be ahead of `origin/main`. `--allow-regression` overrides it and is only correct for a deliberate revert. The older `assertWorkerBaseIsFresh` (`--allow-stale`) still runs at the preview stage against `origin/main` as the earlier, cheaper warning.

After promoting, push so the other worktrees can merge you: `git push origin main`.

## Development Workflow

1. Read the relevant docs first.
2. Start with `AGENTS.md` -> `docs/CURRENT_DEV_BASELINE.md` -> `CLAUDE.md` -> `docs/CONTEXT_AUDIT.md`, then move to the most specific feature docs.
3. Treat `docs/CURRENT_DEV_BASELINE.md` as the only time-sensitive working summary for active development focus.
4. Treat `docs/CONTEXT_AUDIT.md` as the conflict, exception, and historical-only log, not as a duplicate current-state summary.
5. If those docs disagree, do not combine them ad hoc; follow the most specific active rule set and report the mismatch before editing.
6. Ignore snapshot, archive, and one-off audit paths unless the user explicitly asks for them:
   `.claude/worktrees/**`, `.codex-worktrees/**`, `.cleanup/**`, `reports/**`, `docs/performance-audit/results/**`
7. Identify the live source of truth before editing.
8. Search by exact route, featureKey, component, error text, or API path.
9. Keep the change minimal and scoped.
10. Explain risk before touching payment, auth, LLM, DB, R2, or deployment code.
11. Use mock/sandbox/test DB only unless the user approves otherwise.
12. Run the smallest meaningful validation.
13. Report changed files, intent, untouched risk areas, validation commands, and rollback path.

Before code changes, if the user asks for prior approval or the task touches LLM, payment, production DB, deployment, auth, Worker routing, R2, billing/access, or other high-risk areas, report these items first and wait for approval:

1. Related file list
2. Current structure summary
3. Expected cause
4. Proposed change scope
5. Regression risk
6. Mock validation plan
7. Rollback method

For main static shell changes:

1. Edit root `index.html`.
2. Run `npm run sync:public`.
3. Run `npm run verify:locale-main-sync`.
4. Run `npm run verify:runtime-cache-sync`.
5. If fixed URL assets changed, bump cache keys in `index.html` and synced mirrors.

## Testing Rules

- LLM tests must use mock/fake/stub responses.
- Payment tests must use sandbox/mock flows.
- DB writes must use test DB, local DB, or mocks.
- Do not use production environment variables for tests.
- Do not run cost-incurring tests without explicit approval.
- For Korean or multilingual text changes, check encoding:
  - search changed text files for `U+FFFD`, `\\uFFFD`, `Ã`, `Â`, `ì`, `í`, `ê`, `ë`, `ð`
  - run `npm run verify:entry-encoding -- --strict-core` when applicable
- For payment changes, prefer:
  - `npm run verify:billing-pass-policy`
  - `npm run verify:portone-single-payment`
  - `npm run verify:paid-gate-ui`
  - `npm run verify:payment-choice-parity`
  - `npm run verify:checkout-pass-card`
  - `npm run verify:paid-feature-billing-policy`
  - `npm run verify:ai-prompt-billing-policy`
- For Worker/API changes, include relevant route tests and `npm run build:worker` when appropriate.

## Payment Safety Rules

- Read `docs/PAYMENT_AND_ACCESS.md` and the payment policy trilogy before payment work.
- Payment source of truth:
  - `worker/routes/billing.js`
  - `worker/routes/payments.js`
  - `worker/lib/paid-feature-registry.js`
  - `worker/lib/billing-policy.js`
  - `worker/lib/profile-limits.js`
  - `worker/lib/payment-refund.js`
- All paid flows must preserve the current access options: 이용권, 단건 결제, 월정석.
- The client must not hardcode final billing decisions. Server registry/policy decides.
- The server checks pass coverage only for an explicit `MEMBERSHIP_PASS` command. `DIRECT_KRW` and `MONTHLY` must not query pass state; their server-authoritative pricing, balance, payment, and entitlement checks still apply.
- If a user paid but service was not delivered, consider entitlement repair, monthly credit restore, or refund path.
- Never perform live cancel/refund/reconcile against production without explicit approval.

## LLM Safety Rules

- Read `docs/LLM_AND_AI_POLICY.md` before AI work.
- LLM source of truth:
  - `lib/llm-client.ts`
  - `worker/lib/gemini.js`
  - `worker/lib/structured-consultation.js`
  - `worker/lib/llm-cache-store.js`
  - feature routes under `worker/routes/*-ai.js`
- Do not use `--live` or real provider keys unless the user explicitly approves that exact call.
- Estimate call count, provider, model, and cost/timeout risk before any approved live call.
- Confirm cache keys, idempotency keys, retry limits, and `fallbackMinChars`.
- Paid AI routes must check payment/access before generation and handle restore/refund on failure.

## Documentation Rules

- Structure changes: update `docs/SERVICE_STRUCTURE.md`.
- New feature: update `docs/FEATURE_MAP.md`.
- New route/API: update `docs/ROUTE_MAP.md`.
- Payment/access change: update `docs/PAYMENT_AND_ACCESS.md`.
- LLM/provider/prompt flow change: update `docs/LLM_AND_AI_POLICY.md`.
- Infra/deploy/R2/env change: update `docs/DEPLOYMENT_AND_INFRA.md`.
- New recurring issue or incident response: update `docs/DEBUGGING_GUIDE.md`.
- Active-document drift or stale reference policy change: update `docs/CURRENT_DEV_BASELINE.md` first, then record any exception in `docs/CONTEXT_AUDIT.md`.
- If information is uncertain, write `확인 필요` instead of guessing.

## Important Docs

- `docs/CURRENT_DEV_BASELINE.md`
- `docs/SERVICE_STRUCTURE.md`
- `docs/FEATURE_MAP.md`
- `docs/ROUTE_MAP.md`
- `docs/PAYMENT_AND_ACCESS.md`
- `docs/LLM_AND_AI_POLICY.md`
- `docs/DEPLOYMENT_AND_INFRA.md`
- `docs/DEBUGGING_GUIDE.md`
- `CLAUDE.md`
- `docs/CONTEXT_AUDIT.md`
- `docs/payment-policy-overview.md`
- `docs/payment-policy-content-access.md`
- `docs/payment-policy-flow.md`
- `docs/deploy-cache.md`
- `docs/r2-assets-cache-strategy.md`

## Content Voice Rules

- UI copy should be short, clear, and action-centered.
- Result/report copy can be rich but must stay structured and readable on mobile.
- Saju copy should explain Five Elements, Ten Gods, day stem, luck cycles, and conflicts in plain language.
- Tarot copy should describe emotional flow and choices, not absolute mind-reading.
- Astrology, Vedic, and Sukuyo systems must not be mixed.
- Yeon / 운명의 찻집: warm, gentle, letter-like tone.
- Neo / 팩폭 전략실: direct strategist tone, never insulting.
- For UI/UX moments where existing visuals do not support the desired emotion, character identity, or consultation immersion, create the needed original asset and ship it as optimized WebP. Reuse verified existing assets first, but do not leave important UX moments visually underpowered merely because an asset is missing.

## Source Of Truth

- Worker runtime API: `worker/**`
- Next/App UI: `app/**`, `components/**`
- Static home shell: `index.html`
- Runtime JS/CSS for shell: `js/**`, `styles/**`
- Build/deploy scripts: `scripts/**`, `package.json`
- Generated mirrors: `public/**/index.html` are not primary source.
- Legacy server: `server/**` is fallback/legacy when Worker equivalent exists.

## How To Answer The User

- Answer in Korean unless the user asks otherwise.
- When presenting options, always lead with one explicitly recommended choice. Label it as `추천`, state why it is the best default for this situation, and then mention the alternatives. Do not leave the user with an unranked neutral list unless they explicitly ask for a neutral comparison.
- The user may not be a developer. Provide concrete file paths, commands, validation results, and rollback guidance.
- Keep explanations concise and practical.
- Warn before dangerous work and offer a safe mock/sandbox alternative.
- If uncertain, mark it as `확인 필요`.
- Final reports should include:
  - 수정한 파일
  - 수정 의도
  - 건드리지 않은 영역
  - 검증한 명령
  - 추가 확인이 필요한 부분
- 작업 중 취약점, 보안 위험, 재현 가능한 버그를 발견하면 즉시 사용자에게 보고하고, 필요 시 다른 세션에서 분리 디버깅할 수 있도록 짧은 제안과 함께 현재 위험도를 명시한다.
