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
- Production is reached only by merging a PR into `main`. Merging is the user's action, and it is the approval.
- Never push to `main` directly, never force-push a shared branch, and never bypass the branch ruleset or a failing required check.
- Never run a production deploy locally (`wrangler deploy`, `wrangler pages deploy`, `deploy:production`, `deploy:rollback`). `scripts/lib/production-deploy-guard.mjs` blocks these — do not work around it.
- Create a Cloudflare preview only by adding the `preview` label to a PR, and only when a preview is actually needed; each run leaves a Pages deployment and a Worker version behind. `npm run deploy:check` is the no-upload way to inspect a change set.
- Do not re-deploy production to test something, and do not re-run a release because a step failed. Fix it on a branch and open another PR.
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

## Delivery: Branch, PR, Merge, Deploy

The 2026-08-08 "work on main, ship with `deploy:safe`" contract is **retired**. It made the working tree the deployable unit, and `wrangler` pushes a working tree rather than a commit — so what production ran could not be named, and merged work vanished more than once. Production is now defined by a commit that exists on `main`, and `main` is only reachable through a merged PR. GitHub is the source of truth for what is deployed.

```
git checkout -b fix/xxx → 코드 수정 → commit → push
   ↓
Pull Request
   ↓
PR CI (자동 · 변경 경로에 따라 강도가 갈린다 · 배포하지 않는다)
   fast     문구·CSS·이미지·문서          → typecheck · lint
   standard 일반 프론트엔드               → + build
   critical 결제·인증·Worker·DB·배포설정   → + 전체 테스트 · 배포 가드
   ↓
(선택) `preview` 라벨      화면 확인이 필요할 때만. 기본 흐름에는 없다
   ↓
사용자가 Merge            ← 이 행동이 프로덕션 배포 승인이다
   ↓
push to main
   ↓
Release Cloudflare Pages and Worker (자동)
   github.sha 체크아웃 → 1회 빌드 → Worker 100% → Pages production
   → 스모크 → Pages/Worker SHA 대조 → PR 에 결과 코멘트
   실패하면 Pages·Worker 를 함께 자동 롤백
```

`main` has a branch ruleset: direct pushes are rejected, force-pushes and deletion are blocked, and the PR CI checks are required.

### Verification tiers

Every PR is not worth the same amount of CI. A copy tweak and a payment-route change get different treatment, decided by **changed file paths** — never by an agent's judgement of how risky something feels.

| Tier | Paths | What runs |
|---|---|---|
| `fast` | copy, CSS, images, docs, `index.html`, sitemap/robots/ads.txt | typecheck · lint |
| `standard` | `app/` `components/` `src/` `lib/` `js/`, `package.json`, `next.config`, `tsconfig` | + `build:cf` · `build:worker` · worker size budget |
| `critical` | payment, auth, `worker/`, `server/`, DB schema and migrations, `wrangler.*`, `.env*`, `.github/workflows/`, `package-lock.json` | + full test suite · deployment-config guards · ads.txt · secret scan |

- **`scripts/lib/change-risk.mjs` is the only classifier.** `scripts/resolve-ci-tier.mjs` maps its two axes (`level`, `deepRequired`) onto a tier and nothing more. `deploy-safe` and `check-changed` read the same module. Writing a second path list anywhere means CI and the release can disagree about the same commit.
- Both axes are consulted. `app/hooks/useCoinGate.ts` is `level=medium` because it lives under `app/`, but it is the single-purchase hook, so `deepRequired` lifts it to `critical`. Either axis alone leaves a hole.
- **If the changed-file list cannot be resolved, the tier is `critical`.** "Unknown" is not "safe".
- 🔴 All four jobs (`Risk tier`, `Typecheck and lint`, `Build Pages and Worker`, `Critical checks`) **always run**. What the tier skips is steps, not jobs. A job gated by a top-level `if` never reports, and a required check that never reports blocks every merge forever. The job names are the ruleset's required check names — `verify:worker-single-deploy` fails if they drift.
- The `full-ci` label lifts a PR to `critical`. Use it for changes the paths cannot see but you can — a shared utility edit that reaches payment or auth indirectly, for instance. There is no label that lowers a tier; that would be a button for turning the gate off.
- `paid-flow-gates.yml` is separate from the tiers: on `pull_request` it runs the 36 payment/auth/fortune verifiers when those specific files change. It is not a required check.
  - 🔴 The six static shells (`index.html` plus its five `public/**` mirrors) were added to its paths on 2026-08-11. The payment dialog has three renderers and the **source of truth is the shell inline one** (`_cdChooseServicePaymentMode`, styles in `_cdEnsureDirectPaymentStyles`) — yet that was the one renderer missing from the trigger list, so deleting the pass card or rewording the three options never woke `verify:payment-choice-parity`. The shell doubles as home content, so its PR CI tier stays `fast`; only the payment verifiers are woken here.

### What runs where

| Command | Local | CI |
|---|---|---|
| `npm run deploy:check` | ✅ inspect a change set, uploads nothing | — |
| `npm run deploy:preview` | ✅ but prefer the PR `preview` label | ✅ via the label workflow |
| `npm run deploy:smoke -- --base <url>` | ✅ read-only | ✅ |
| `npm run deploy:production` / `deploy:rollback --yes` | ❌ blocked | ✅ |
| `npm run deploy:cf:worker` / `deploy:cf:pages` / `deploy:cf:opennext` | ❌ blocked | ✅ |

`scripts/lib/production-deploy-guard.mjs` enforces the ❌ rows: anything that writes to production exits unless `GITHUB_ACTIONS=true`. The break-glass path, for when GitHub Actions itself is unavailable, needs **both** `CD_BREAK_GLASS=1` and an explicit `--break-glass` flag, and prints a warning telling you to re-land the change through a PR. Skip that step and the next real release silently reverts your hotfix.

Production Cloudflare credentials live in GitHub Actions secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_CACHE_PURGE_TOKEN`, `CLOUDFLARE_ZONE_ID`). Do not add them to repository files.

### One SHA for both layers

Pages and Worker must never point at different code — that is the shape of every payment and access-state incident this repo has had. Three things hold the invariant:

1. The release checks out `ref: ${{ github.sha }}`, not a branch name, so a merge landing mid-release cannot change what ships.
2. `CD_ALLOW_EMPTY_CHANGESET=true` makes the release treat the whole tip as the change set, so the Worker is always uploaded and promoted alongside Pages instead of being skipped by a change-set heuristic.
3. After deploying, `npm run verify:deployed-sha` reads `<origin>/version.json` (Pages) and `<origin>/api/version` (Worker) and fails the release unless both report the release SHA. It retries for edge propagation; a mismatch that survives the retries is a real mismatch.

Both SHAs are injectable and inspectable:

- Pages: `NEXT_PUBLIC_GIT_SHA` comes from `GITHUB_SHA` in `next.config.mjs`; `scripts/write-version-json.mjs` writes `/version.json`. In a browser, `/version.json` answers "what is deployed", and on React routes `window.__cdBuild` answers the same.
- Worker: the release passes `--var COMMIT_SHA:<sha>`; `/api/version` returns `{ gitSha, commit, commitShort, environment }` and contains no secrets.

### Verifying paid features on a preview

A preview's `/api` is not a sandbox. `public/_worker.js` proxies it to the production Worker, which reads the production database — there is no staging DB. So a signed-out preview shows the payment dialog on every paid screen and nothing can be verified.

A local `deploy:preview` opens the preview **already signed in** as a FAMILY-pass account when `CD_PREVIEW_TEST_EMAIL` and `CD_PREVIEW_TEST_PASSWORD` are in `.env.local`. `openPreviewSignedIn()` in `scripts/deploy-safe.mjs` re-runs `scripts/seed-preview-test-account.mjs` as an isolated child process before every signed-in preview open, so the account is fresh every time. It upserts one user with a FAMILY pass and moonstones, and is idempotent — the moonstone grant is keyed by lot id, so re-running never double-credits. It also seeds one `ProfileCard` with a fixed birth date (1990-01-01 09:00, solar) and selects it, so paid screens have real profile data on first load. This is the one scoped exception to "the pipeline never performs database writes": the child process loads its own `MONGO_URI` from `.env.local`, and `deploy-safe.mjs`'s own process env never sees it. Login happens by calling `/api/auth/login` from inside the page rather than driving the form, because auth cookies are httpOnly; the cookie carries no `Domain`, so it binds to the preview host only. The CI label-gated preview does not sign in — it reports the URL and you sign in yourself.

What that account does **not** cover:

- Profile card add/delete is `passExcluded` for every tier including family, so it still opens the payment dialog. That is the policy, not a bug.
- Premium consultations above 300 coins are fair-use limited per pass cycle (`resolveFamilyPremiumQuota`).
- **`points` is not a currency.** Nothing in `worker/lib/access-control.js` reads it and no path deducts it. Only the pass (`profileSubscription`) and moonstones (`membershipCreditLots`) open access. Granting points to a test account buys nothing.

Anything you do on a preview writes to production: real unlock records, real ledger rows. Treat it as production with a comfortable account, not as a test environment.

### Verification depth

`scripts/lib/change-risk.mjs` remains the single source of truth and judges two independent axes. Run `node scripts/lib/change-risk.mjs <file...>` to see the verdict for a change set.

| Axis | Meaning |
|---|---|
| `level` (low/medium/high) | How deep the ordinary checks go |
| `deepRequired` | Paths a preview smoke cannot validate — auth/login, payment/entitlement, DB schema and migrations, and the deployment pipeline itself |

`deepRequired` forces the full `deploy:critical` regression regardless of `level`. The reasoning is unchanged: auth and payment bugs return HTTP 200 while being wrong, migrations cannot be rolled back, and a broken pipeline destroys the recovery path. `worker/**` remains `level=high`, so `deploy:critical` runs on it either way.

### Failure and rollback

A release reports each stage separately in the Actions job summary and on the merged PR — Pages, Worker, smoke, SHA verification. One layer succeeding is never reported as success.

- **During a release**: `deploy-safe` rolls Pages back first, then the Worker (the reverse of the promotion order), and says so loudly if only one side could be reverted.
- **After a release**: Actions → *Release Cloudflare Pages and Worker* → Run workflow → `mode: rollback`, with `pages_deployment_id` and/or `worker_version_id`. The rollback smokes production afterwards. List candidate targets locally with the read-only `npm run deploy:rollback -- --list`.
- Every production deployment is labelled `prod <sha7> <commit subject>`, so `npx wrangler deployments list` and the Pages dashboard both answer "which commit is live".
- Tag known-good payment/auth states (`git tag -a stable-payments-<date>`) so a rollback target is nameable months later.

### Parallel sessions

Run each concurrent session in its own worktree so builds and previews never block each other.

```powershell
powershell -File scripts/create-safe-worktree.ps1 -Slug <name>
```

Each worktree gets its own branch and its own PR. They merge through GitHub, not through a local `git merge` into `main`.

- `node_modules` is linked, not copied. It is 1.2 GB here, so nine worktrees with real copies would be 11 GB.
- `.env.local` and `.env.cloudflare.local` are **hard-linked**, not copied, so there is one copy of each secret on disk and a rotation reaches every worktree at once.
- `worktree.baseRef` is `fresh`, so a new worktree branches from `origin/main` rather than inheriting a stale local HEAD.

**Removing a worktree: break the link first.** `node_modules` is a junction to the primary worktree's real directory, so deleting the worktree without unlinking risks taking the shared 1.2 GB — and every other worktree — with it.

```powershell
$w = 'D:\Development\codedestiny-worktrees\<name>'
(Get-Item -LiteralPath "$w\node_modules" -Force).Delete()   # unlink only, never Remove-Item -Recurse
git worktree remove --force $w
git branch -D wt/<name>
```

**Check for overlap before splitting work:**

```bash
npm run worktree:status
```

It reads real git state — uncommitted changes plus commits not yet in `origin/main` — across every worktree and reports files touched by more than one. Overlap is not automatically wrong; it means those branches will conflict and should be merged in a deliberate order.

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
