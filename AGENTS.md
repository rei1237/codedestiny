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
- Production release work must go through a PR first. Before any production deploy, document regression risks, run the relevant no-regression checks, and confirm there is no known regression in the PR notes.
- Codex may merge a PR only after the user explicitly approves the merge in the current task, required CI checks are green, required approvals are present, there are no unresolved blocking reviews or conflicts, and the final diff still matches the approved scope. Never bypass required checks, force-merge, or merge a PR whose scope changed after approval. If GitHub authentication is unavailable, stop and ask the user to re-authenticate.
- After a permitted merge, Codex may continue to the explicitly approved deployment workflow, verify the deployed commit/version, and run the post-deploy latency runbook. A merge alone never authorizes production deployment, payment, LLM, or production DB actions.
- Do not expose secrets, API keys, tokens, MongoDB URIs, R2 credentials, OAuth secrets, JWT secrets, or PortOne secrets.
- Approved public-contact exception: `worker/routes/fortune.js` and `app/points/history/PointHistoryClient.tsx` may contain the homepage owner's designated contact metadata. The user has explicitly approved publishing these two files through the GitHub PR/deployment workflow. Treat only that pre-approved project contact metadata as allowed; newly discovered personal data, credentials, payment data, auth material, or unrelated contact information remains blocked and must not be uploaded or logged.
- Do not delete existing features, routes, badges, or content unless the user explicitly asks.
- Do not remove `준비중` badges without user approval.
- Do not change payment policy, prices, access order, refund behavior, auth, DB schema, Worker bindings, or deployment config casually.
- Payment wording must keep these product terms: `이용권`, `월정석`, `단건 결제`.
- Do not introduce new user-facing coin-centered payment copy. Coins are legacy internal calculation units.
- Static shell and React routes are not interchangeable. The live home source is root `index.html`.
- Mirror files under `public/**/index.html` are generated mirrors. Do not patch them directly unless explicitly requested.
- Mobile UI regressions are high risk. Preserve route behavior, safe areas, touch targets, and app payment routing.

## Worktree-Only Development and PR Delivery

The primary repository worktree is protected. All repository edits, commits, pushes, and local production deployment attempts must happen in a registered secondary worktree.

- Never edit or commit from the primary worktree, `main`, `master`, or a detached HEAD.
- Before editing, create a sibling worktree from the latest `origin/main` with `scripts/create-safe-worktree.ps1`.
- Run `npm run verify:worktree-policy -- --mode=edit` before the first edit. The PreToolUse hooks and this guard are fail-closed when the current worktree cannot be identified safely.
- Keep each worktree's feature scope and `.work-locks/<session-id>.md` registration explicit. If another `IN_PROGRESS` lock overlaps the target files or feature, stop and report `LOCK DETECTED`.
- Before opening a PR, fetch `origin/main`, confirm the feature branch contains the latest base, run the relevant checks, and use `npm run verify:worktree-policy -- --mode=pr`.
- Push only the feature branch and create or update a PR targeting `main`. Direct pushes to `main`, force pushes, and PR-less production changes are prohibited.
- A PR must contain `## Validation`, `## Risk`, `## No-regression Scope`, and `## Rollback` sections. Merge requires green required checks, required review approval, no blocking conflict/review, final-diff scope confirmation, and the user's explicit merge approval for that task.
- Production Pages/Worker deployment is CI-only from `main` after merge and still requires explicit user approval for that exact deployment. Local `npm run deploy:*` commands are blocked by the worktree policy guard.

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
