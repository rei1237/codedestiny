# Deployment and Infra

## Current release policy (2026-08-08)

PR-first delivery was retired. `scripts/deploy-safe.mjs` is the single release engine, and it is driven from the developer's machine.

```
edit on main → commit
   ↓
npm run deploy:safe         risk-scaled checks → build:cf → Pages preview + Worker preview version
                            → smoke → opens the browser → WAITS at [y/N]
   ↓                        (the user inspects the preview, then answers)
                            y → artifact sha256 re-checked → Worker 100% → Pages production → health check
                            N → clean exit; nothing promoted, preview URL still live
   ↓
git push origin main        backup only; pushing deploys nothing
```

**A preview is created only as part of a real release.** Each `deploy:preview` run leaves a Pages deployment and a Worker version on Cloudflare, so it is not a routine check. `deploy:safe` is the default precisely because the preview sits immediately before the promotion decision. To inspect a change set without uploading anything, use `deploy:check`.

- **Commands.** `deploy:safe` (the default), `deploy:check` (inspect only, no upload), `deploy:rollback -- --list`, and the `deploy:preview` + `deploy:production` split for when inspection and promotion happen in separate sessions. `deploy:smoke -- --base <url>` smokes an arbitrary origin.
- **Nothing deploys on push.** `.github/workflows/cloudflare-pages-deploy.yml` is `workflow_dispatch` only, with a `mode` input of `preview` or `production`. It is the backup path for when the local build cannot run. Re-adding a push trigger would double-deploy every commit; `verify:worker-single-deploy` fails the build if one appears.
- **Verification depth replaced review.** `scripts/lib/change-risk.mjs` judges `level` (how deep ordinary checks go) and `deepRequired` (auth/login, payment/entitlement, DB schema and migrations, `.github/workflows/**`, `wrangler.toml`, `.env*`, `config/env.contract.json`, `scripts/deploy*`). `deepRequired` forces the full `deploy:critical` regression regardless of `level`, and `deploy:production` names the risky paths before asking to promote.
- **Ordering is a transaction.** Worker is promoted to 100% first, then Pages. The Worker only serves `api.code-destiny.com` and `code-destiny.com/api/*` (see `worker/wrangler.toml` `routes`), so it never serves HTML or `_next/static` — backend-first is the safe order for API contract skew, and reversing it would not affect asset availability. A failed release rolls **both** back, Pages first (LIFO).
- **Post-deploy health runs in three stages, and only two of them may roll back.**
  1. `verify-deployed-assets.mjs` in `artifact` mode against the **deployment-unique** `*.pages.dev` URL. That URL serves one immutable deployment, so the result is deterministic — a 404 here is a real build/upload defect and rolls the release back.
  2. The same script in `alias` mode against `code-destiny.com`. This one is **observation only and never rolls back.** The production alias serves two deployment generations during a cutover; reading HTML from one and assets from the other produces 404s on exactly the chunks whose hash changed. Rolling back on that does not fix it — it starts another cutover, which is how failures chained across releases on 2026-08-07/08 (one run's rollback target was the previous failed run's deployment).
  3. Production smoke (`deploy-smoke.mjs`) plus Pages/Worker commit parity (`verify-pages-worker-parity.mjs`). These keep rollback authority.
- **How the alias check tells the two apart.** `CD_DEPLOY_EXPECTED_DIR` points at the build that was just deployed. A route whose HTML references assets absent from that build is still on the old generation, so its assets are excluded rather than counted dead; a route missing from the build entirely is skipped outright. That second rule matters: `/me` moved to the static shell in `bd54e99eb` and disappeared from the build, yet the origin kept returning its old HTML with `Age: 5256` (`?cdcb=` gave 404). Every release then reported that dead page's chunks as missing assets.
- **Still hard failures:** an asset missing from the immutable deployment, and an edge-cached 404 (`bare=404` + `?cdcb=` 200). The latter carries a two-day TTL and does not heal on its own or on rollback.
- **Secret scanning.** `verify:no-secret-leak` runs immediately before promotion, replacing the old "wait for the gitleaks check" step that only existed in CI.
- `check:quick` is range-based; `check:full` is lint, typecheck, core mock smoke, node tests, and one Pages build; `check:critical` retains the payment/access mock gates.
- Git uses HTTPS with Git Credential Manager. gh uses its own interactive encrypted host login. Do not configure Git to use `gh auth git-credential`.

### Rollback

```bash
npm run deploy:rollback -- --list                                   # recent Pages deployments + Worker versions
npm run deploy:rollback -- --yes --to=<pagesDeploymentId>           # Pages only
npm run deploy:rollback -- --yes --worker-version=<versionId>       # Worker only
npm run deploy:rollback -- --yes                                    # whatever the last production deploy recorded
```

`--list` is read-only and does not take the deploy lock, so it works while a release is running. Every rollback smokes production afterwards — an unverified rollback is just a second outage.

Note that a rollback does **not** fix an edge-cached `_next/static` 404: identical content hashes to the same URL. See the cache-poisoning section below.

## Worker 단일 배포 경로

- Worker 와 Pages 를 올리는 코드는 `scripts/deploy-safe.mjs` 하나다. 로컬 `npm run deploy:production` 과 백업 워크플로 `.github/workflows/cloudflare-pages-deploy.yml` 이 같은 함수를 부른다.
- 백업 워크플로는 `github.sha` 를 checkout 한 뒤 `mode` 입력에 따라 `deploy:safe -- --ci --preview-only` 또는 `-- --ci --yes` 를 실행한다. push 트리거는 없다.
- 중복 Worker production workflow인 `.github/workflows/cloudflare-worker-deploy.yml`은 제거했다. 수동 Worker 단독 배포는 더 이상 지원하지 않는다.
- `.github/workflows/worker-deploy-path-guard.yml`와 `scripts/verify-worker-single-deploy-guard.mjs`는 정본 workflow 외 Worker 업로드 명령이 생기거나, 정본에 push 트리거가 되살아나거나, `Workers Builds:` 외부 체크가 다시 나타나는 경우 검증을 실패시킨다.
- Cloudflare Workers Builds Git trigger는 운영 Worker의 중복 배포를 만들 수 있으므로 `code-destiny-web`에서는 제거한다. Worker 자체, route, custom domain, cron, R2 binding, runtime secret은 이 정리의 대상이 아니다.
- `scripts/deploy-worker.mjs`는 배포 커밋 SHA를 비밀값이 아닌 Worker runtime variable `COMMIT_SHA`로 주입한다. 배포 후 `/api/version`의 `commit`으로 Worker 코드 기준점을 확인한다.
- `app/_lib/billing-client.ts`, `js/core/access-store.js`, `worker/routes/access.js`, `worker/routes/billing.js`, `worker/routes/payments.js` 중 하나가 바뀌면 `deploy:production` 이 승격 후 `verify-pages-worker-parity.mjs` 로 `/api/version` 의 Worker SHA 와 배포 커밋이 같은지 확인한다. Worker 를 Pages 보다 먼저 올리는 순서가 이 검사의 전제다.

## Cloudflare Pages 구조

### Guardian Fortune production-safe activation

The static home enables the Guardian Fortune UI and API-backed flow through
`window.__CD_FEATURE_FLAGS__`. Worker production vars enable the usage,
generate, and share endpoints with `ENABLE_GUARDIAN_FORTUNE_API=true` and
`ENABLE_GUARDIAN_FORTUNE_SHARE=true`.

2026-08-04 운영 승인에 따라 `ENABLE_GUARDIAN_FORTUNE_REAL_LLM`,
`ALLOW_REAL_GUARDIAN_FORTUNE_LLM`을 각각 `true`로 활성화했다. 오늘의 귀인은 사용자가
고른 단일 카테고리만 provider에 전달한다.

2026-08-08 전용 재화(대화권)를 폐지하고 표준 회당 결제로 옮겼다. 무료 3회 이후는
`fortune-chat-consultation`(50코인 · 5,000원)이며 공용 결제 게이트를 그대로 탄다.
`ENABLE_GUARDIAN_FORTUNE_CREDITS` 를 읽는 코드는 남아 있지 않다(수정 금지 파일인
`worker/wrangler.toml` 에 선언만 남아 있어 별도 정리가 필요하다).

### Fusion Fortune activation

- 기능/실 LLM은 `ENABLE_FUSION_FORTUNE_UI`, `ENABLE_FUSION_FORTUNE_API`, `ENABLE_FUSION_FORTUNE_REAL_LLM`, `ALLOW_FUSION_FORTUNE_REAL_LLM`을 서로 독립적으로 제어한다. 전용 상담권 판매 플래그(`ENABLE_FUSION_FORTUNE_TICKET_SALES`)는 재화 폐지와 함께 사라졌다. 테스트는 `ENABLE_FUSION_FORTUNE_MOCK_FLOW=true`와 fake provider만 사용한다.
- 2026-08-04 운영 승인과 전용 인덱스 검증 후 UI/API/실 LLM 플래그를 `true`로 활성화했다. 운영 mock 플래그는 `false`를 유지한다.
- 2026-08-08 전용 상담권을 폐지하고 `fusion-fortune-consultation`(300코인 · 30,000원) 회당 결제로 옮겼다. 30,000원은 `PASS_LIMITS` 상 family 이용권만 커버한다.
- 판매 전 `npm run verify:fusion-fortune-indexes`로 전용 balance, transaction, daily limit, attempt 인덱스를 확인한다. 누락 시 별도 운영 DB 승인 후 `npm run migrate:fusion-fortune-indexes`를 한 번 실행한다.
- 운영 활성화 순서는 전용 인덱스 확인 → Worker 배포 → `/api/version` 동일 SHA 확인 → status/catalog 확인 → Pages 배포다. 결제 성공 전에 ticket을 적립하지 않으며 생성 성공 transaction 안에서만 ticket과 KST daily count를 함께 commit한다.
- 롤백은 판매 → API → 실 LLM → UI 플래그 순으로 끄고 이전 Worker/Pages SHA로 되돌린다. 기존 ticket balance와 원장은 삭제하거나 일반 entitlement로 변환하지 않는다.
- R2 asset config에서 검증 가능한 fusion 전용 prefix를 찾지 못하면 외부 hotlink를 만들지 않고 repo-local 최적화 WebP와 CSS/SVG fallback을 사용한다.

Rollback: remove the static UI/API flags or set the Worker API/share vars to
`false`, then redeploy through the same CI paths. No provider key, payment, or
database write is required for this activation.

- Pages config: `wrangler.toml`
- Build output: `dist`
- Build scripts: `npm run build`, `npm run build:cf`
- Cache headers: `_headers`, `public/_headers`
- Redirects: `public/_redirects`
- Static home source: `index.html`
- Static mirrors: `public/index.html`, `public/static/index.html`, `public/{en,ja,zh}/index.html`

운영 Pages 배포는 사용자 명시 승인 후에만 진행한다.

### Pages 자동 배포 단일화

- Cloudflare 대시보드의 `Deployments paused`는 이 저장소에서는 정상 운영 상태다. Pages Git 자동/프리뷰 배포를 끄고 GitHub Actions의 명시적 배포만 정본으로 쓴다.
- Cloudflare Git preview 배포를 쓰지 않는다. preview 는 `deploy-safe.mjs` 의 preview 단계가 `wrangler pages deploy --branch preview-<branch>-<sha>` 로 직접 만든다. Git 연동을 되살리면 이중 배포로 청크 해시가 어긋난다.
- Pages 프로젝트의 Git source config는 다음 세 값을 명시적으로 비활성화한다.
  - `deployments_enabled=false` (legacy 호환 필드)
  - `production_deployments_enabled=false`
  - `preview_deployment_setting="none"`
- `scripts/ensure-pages-single-deploy.mjs`가 세 값을 함께 검사하고, 자동 수정 시 전체 `source.config`를 보존 병합한 뒤 GET으로 재검증한다.
- `--check`와 CI에서는 Cloudflare 인증 누락 또는 API 조회 실패를 성공으로 처리하지 않는다. 로컬에서 토큰이 없을 때만 안내 후 건너뛴다.
- 기존에 취소되거나 pending으로 남은 배포는 자동 삭제하지 않는다. 삭제하려면 Pages Write 권한과 별도 승인이 필요하다.
- `main` 에는 branch protection 도 ruleset 도 없다(2026-08-08 확인). required check 개념 자체를 쓰지 않으며, 배포 가부는 `deploy-safe.mjs` 가 로컬에서 판정한다.

재발 방지 계층:

1. `npm run deploy:safe` 의 preview 단계: `build:cf` 를 실제로 돌려 빌드가 깨지면 승격 프롬프트에 도달하지 못한다. 프로덕션에는 닿지 않는다.
2. `pages-config-guard.yml`: `main` push·매일 schedule·수동 실행에서 Pages 설정 drift 를 read-only 로 감시한다.
3. `verify:pages-single-deploy`: `deploy:production` 이 discover() 로 라이브 Pages 설정(build command·output dir·source type)을 매번 대조하고, 백업 워크플로도 승격 전에 같은 guard 를 다시 실행한다.
4. `Cloudflare Pages` external check 는 배포 성공의 기준으로 쓰지 않는다. 취소된 deployment 가 pending 으로 남을 수 있다.
5. 베이스가 낡으면 `assertWorkerBaseIsFresh` 가 preview 단계에서 막는다 — 최신 main 의 `worker/`·`lib/` 변경을 덮어쓰는 것을 방지한다.

## Parallel sessions and worktrees

Worktrees are filesystem isolation, not a review gate. They remain useful when two sessions must edit the repository at once; they are not required for ordinary work.

```powershell
powershell -File scripts/create-safe-worktree.ps1 -Slug <name>
```

Each worktree previews independently and gets its own preview URL. Merge back with a plain `git merge` — there is no PR step.

Concurrency is split by stage, because only one of them contends:

| Stage | Concurrency |
|---|---|
| checks, `build:cf`, preview upload, smoke | fully parallel — separate build dirs, separate `preview-<branch>-<sha>` URLs |
| production promotion, rollback | serialized by `promote.lock` in the primary worktree |

Three failure modes the tooling handles:

- **Cross-worktree state corruption.** `.deploy-state/state.json` is per-worktree. It records the sha256 of *your* preview artifact; sharing it across worktrees would let one preview overwrite another's record, and the next promotion would ship the wrong build while `assertArtifact` still passed — the fingerprint would match the record, just not the release anyone intended.
- **Concurrent promotion.** `promote.lock` (primary worktree, resolved via `git worktree list --porcelain`) is taken only around promotion and rollback — never during build, preview, or while the `[y/N]` prompt waits. It is released only by the process that took it; an earlier version unlocked unconditionally in the top-level catch, so a worktree that failed to acquire the lock deleted somebody else's. `deploy:rollback -- --list` skips the lock so it stays readable during a release.
- **Promotion that regresses production.** `wrangler` uploads the working tree, not a commit, so worktree B promoting after worktree A silently reverts A's work — B's tree is clean and B's tests pass, so nothing signals it. Before promoting, `assertPromotionIsNotRegression` reads the live commit from `/version.json` and `/api/version` and requires HEAD to contain it, naming the merge command when it does not. Live is the reference rather than `origin/main`, because a local-first deploy can put production ahead of `origin/main`. `--allow-regression` overrides it, and is only correct for a deliberate revert. `assertWorkerBaseIsFresh` still runs earlier at the preview stage against `origin/main` (`--allow-stale`) as the cheaper first warning.

Production promotion still requires explicit user approval for that exact run. Preview does not — it never touches `code-destiny.com`.

## Cloudflare Workers 구조

- Worker config: `worker/wrangler.toml`
- Entry: `worker/index.js`
- Routes: `worker/routes/**`
- Shared Worker libs: `worker/lib/**`
- Worker name/custom routes는 `worker/wrangler.toml`에서 확인한다.
- AI binding, R2 bucket binding, cron triggers가 Worker config에 있다.
- 운영 API Worker는 `code-destiny-web` 하나다. 임시 디버그 Worker는 custom domain, routes, cron, R2, payment/LLM secret이 없는지 확인한 뒤 운영 트래픽이 없으면 Cloudflare에서 삭제한다.
- 임시 디버그 Worker 설정 파일은 기본적으로 레포에 추적하지 않는다. 재사용이 필요하면 파일명과 주석에 임시 목적, 만료일, 실서비스 라우트 금지, `LLM_DRY_RUN=true`, `WORKERS_AI_ENABLED=false`를 명시한다.
- `Workers Builds: code-destiny-web` GitHub check가 PR에 생기면 Cloudflare Worker Git integration이 연결된 상태다. 이 프로젝트는 GitHub Actions/manual Worker deploy만 허용하므로 Cloudflare dashboard의 Worker `Settings > Builds > Disconnect`로 Workers Builds를 끈다. 이 조치는 Cloudflare 운영 설정 변경이므로 사용자 승인 후 수행한다.

`worker/wrangler.toml`은 기존 규칙상 수정 금지 영역이다. 변경이 필요하면 사전 계획과 사용자 승인이 필요하다.

## R2 assets 구조

- 일반 공개 asset base: `NEXT_PUBLIC_ASSETS_BASE_URL`
- 음악 asset base: `NEXT_PUBLIC_MUSIC_BASE_URL`
- R2 public URL helper: `lib/r2-public-url.ts`
- 음악 manifest: `app/music/_data/musicManifest.ts`, `public/music-manifest.json`, `scripts/generate-music-manifest.ts`
- Feedback image bucket binding: `FEEDBACK_IMAGES_BUCKET`
- Insight image bucket binding: `INSIGHT_IMAGES_BUCKET`

R2 S3 access key, secret key, account token, account id는 문서에 값 기록 금지다.

## MongoDB Atlas 구조

- Worker connection: `worker/lib/db.js`
- Shared app connection: `lib/mongodb.ts`
- App Mongoose connection: `app/_lib/dbConnect.js`
- Main Worker models: `worker/lib/models.js`
- Legacy models: `server/models/**`, `app/_lib/models/**`
- Index/migration scripts: `scripts/migrations/**`, `npm run verify:mongo-launch-indexes`, feature-specific `migrate:*`

운영 DB 쓰기, migration, seed는 사용자 승인 없이 실행하지 않는다.

## 환경변수/시크릿 목록

값은 기록하지 않는다. 이름만 관리한다.

Public/client-safe:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_AUTH_API_BASE_URL`
- `NEXT_PUBLIC_ASSETS_BASE_URL`
- `NEXT_PUBLIC_MUSIC_BASE_URL`
- `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`
- `NEXT_PUBLIC_PORTONE_IMP_CODE`
- `NEXT_PUBLIC_PORTONE_STORE_ID`
- `NEXT_PUBLIC_PORTONE_CHANNEL_KEY`
- `NEXT_PUBLIC_PORTONE_TOSS_CHANNEL_KEY`
- `NEXT_PUBLIC_PORTONE_PG_CARD`
- `NEXT_PUBLIC_PORTONE_MOBILE_REDIRECT_PATH`
- `NEXT_PUBLIC_RUNTIME_TARGET`

Server/Worker secrets or vars:

- `AUTH_FRONTEND_BASE_URL`
- `SITE_BASE_URL`
- `AUTH_API_BASE_URL`
- `AUTH_URL`
- `NEXTAUTH_URL`
- `JWT_SECRET`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `ACCESS_TOKEN_EXPIRES_IN`
- `REFRESH_TOKEN_EXPIRES_IN`
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `MONGO_URI`
- `MONGODB_URI`
- `MONGO_DB_NAME`
- `MONGODB_DB_NAME`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `NAVER_OAUTH_CLIENT_ID`
- `NAVER_OAUTH_CLIENT_SECRET`
- `KAKAO_OAUTH_CLIENT_ID`
- `KAKAO_OAUTH_CLIENT_SECRET`
- `PORTONE_API_BASE_URL`
- `PORTONE_API_Secret`
- `PORTONE_Store`
- `PORTONE_channel`
- `PORTONE_webhook_URL`
- `PORTONE_webhook_Secret`
- `GEMINIF_API_KEY`
- `GEMINI_API_KEY`
- `GOOGLE_GEMINI_API_KEY`
- `WORKERS_AI_ENABLED`
- `ADMIN_MONTHLY_CREDIT_GRANT_ENABLED`
- `LLM_DRY_RUN`
- `PDF_LLM_PROVIDER`
- `WORKERS_AI_MODEL`
- `WORKERS_AI_PDF_MODEL`
- `TURNSTILE_SECRET_KEY`
- `RESEND_API_KEY`
- `PEXELS_API_KEY`
- `R2_MUSIC_BUCKET`
- `S3_API`
- `Account_ID`

## 로컬 개발

- 전체 local auth 포함: `npm run dev`
- Next만: `npm run dev:next`
- 레거시 Express API: `npm run api`
- Worker preview: `npm run preview:worker`
- 정적 셸 변경 시: `npm run sync:public` 후 sync 검증

실제 LLM, 실결제, 운영 DB를 연결한 로컬 테스트는 금지다.

## 빌드

- 기본: `npm run build`
- Cloudflare Pages용: `npm run build:cf`
- Worker dry run: `npm run build:worker`
- TypeScript: `npm run typecheck`
- Lint: `npm run lint`
- Encoding: `npm run verify:entry-encoding -- --strict-core`

문서만 변경한 경우 전체 build는 보통 불필요하나, 모지바케/Markdown diff 검증은 수행한다.

## 배포

- Pages: `npm run deploy:cf:pages`
- Worker: `npm run deploy:cf:worker`
- OpenNext: `npm run deploy:cf:opennext`
- Worker versions upload: `npm run deploy:cf:versions`

### Local safe deployment — what each stage guarantees

Cloudflare read-only API inspection on 2026-08-04 confirmed the live Pages
project settings: project `codedestiny`, GitHub source, production branch
`main`, automatic production and preview deployments disabled, build command
`npm run build:cf`, and output directory `dist`. The Pages Function is the
tracked `public/_worker.js` plus `public/_routes.json`; it proxies `/api/*` to
the `code-destiny-web` Worker. The Worker config is `worker/wrangler.toml`,
with AI, R2, routes, and cron bindings. Worker Versions/Deployments API is
available and the current deployment can be identified by its 100% version ID.

Stage guarantees:

1. `deploy:check` requires `origin/main`, Cloudflare project discovery, and a
   clean committed tree by default, then prints the changed-file risk
   classification and any deep-verification hits. It deploys nothing.
2. `deploy:preview` runs the risk-based mock checks, builds Pages once, records
   a SHA-256 artifact fingerprint, uploads the same `dist` to a Pages preview,
   and uploads a Worker Version with a preview alias when Worker parity is
   required.
3. `deploy:smoke` runs browser, asset, API, mobile-route, access-boundary, and
   payment-dialog-open smoke checks. The payment check never selects a method
   or creates an order.
4. `deploy:production` only accepts the exact fingerprinted artifact after a
   passed preview smoke. Worker Version promotion happens before Pages
   production upload, preserving the existing Worker-first parity rule.
5. `deploy:safe` connects all steps and asks for confirmation immediately
   before production. `--yes` is the explicit non-interactive approval.
6. Promotion also runs `verify:no-secret-leak` first, and afterwards
   `verify-pages-worker-parity.mjs` and `verify-deployed-assets.mjs` as the
   post-deploy health check.

```text
npm run deploy:check                                        # inspect only, uploads nothing
npm run deploy:safe                                         # preview -> browser -> [y/N] -> promote
npm run deploy:rollback -- --list
npm run deploy:rollback -- --yes --to=<pagesDeploymentId>
```

The same decision path is available in GitHub Actions as the backup route —
`Release Cloudflare Pages and Worker`, `Run workflow`, `mode: preview` or
`mode: production`. It is manual only; nothing deploys on push. A failed smoke
or a missing Cloudflare setting blocks production automatically.

Local release identifiers are stored in ignored `.deploy-state/state.json`:
commit SHA, risk, artifact hash, Pages deployment IDs/URLs, Worker version
IDs, preview smoke status, and rollback targets. Secrets are never written.
`--allow-dirty` is an explicit exception and marks the release dirty; the
default remains a committed tree. `.deploy-state/active.lock` prevents
concurrent local releases.

Pages deployment discovery filters by `env` and uses Cloudflare's default
pagination. Do not hardcode an assumed `per_page` maximum: the live API may
reject unsupported list options after an otherwise successful preview upload.
The newest default page is sufficient for matching the just-uploaded commit
SHA and branch.

Risk routing:

- low: changed-file lint errors, typecheck, production build, preview smoke;
- medium: low-risk checks plus `smoke:core` and Node regression tests;
- high: mock payment/access/auth gates, typecheck, Worker dry-run, core and
  Node regression tests, production build, preview smoke, and Worker Version
  validation. No real PG, LLM, or production DB call is made.

The release changed-file lint runs ESLint with `--quiet`: lint errors block the
release, while existing warning debt does not become a production outage.
Warnings remain subject to the normal lint and audit workflows. Typecheck,
mock gates, regression tests, Worker dry-run, preview smoke, and artifact
fingerprint checks remain mandatory for their risk tier.

Pages rollback uses the Cloudflare Pages deployment rollback API and Worker
rollback uses the recorded Version ID at 100%. A production failure attempts
automatic Worker rollback; Pages rollback is executed only with the recorded
target and explicit `deploy:rollback -- --yes`. KV/R2/D1/Durable Objects state
is not versioned by Workers, so schema/data changes remain separate expand-
and-contract migrations and are never bundled into `deploy:safe`.

Deployment rule:

- Run `deploy:check` freely — it uploads nothing. Create a preview only when a release is actually intended.
- Get explicit user approval before every `deploy:production` run.
- Report the deployed commit, Worker version ID, and Pages deployment ID afterwards so a rollback target is on record.
- Real LLM API calls, real payments, production DB writes, production deploys, and production cancel/refund/reconcile actions require explicit user approval for that exact action.
- Validation must use fake/stub LLM responses, sandbox/mock payment flows, and local/test DB or mocked models by default.

운영 배포는 사용자 명시 승인 후에만 한다. Worker 배포는 현재 working tree를 그대로 밀 수 있으므로 stale base guard와 최신 main 여부를 확인한다.

## 로그 확인

- Worker logs: Cloudflare dashboard 또는 wrangler tail 경로 확인 필요
- Route metrics: `/api/health/route-metrics`는 env flag와 admin access 필요 여부 확인
- LLM usage logs: `[llm provider_call]`, `[llm token_usage]`
- Mongo metrics: `worker/lib/db.js`의 checkout/command counter logs
- Payment logs: `PaymentFailureLog`, `PaymentWebhookEvent`, route console warnings

운영 로그 조회도 권한/개인정보 노출에 주의한다.

## 롤백

- Pages: 이전 Cloudflare Pages deployment로 rollback 또는 Git revert 후 재배포
- Worker: Cloudflare deployment/version rollback 또는 이전 commit에서 승인 후 재배포
- R2: 새 hashed object/manifest 전략이면 manifest rollback, overwrite된 object는 복구 가능성 확인 필요
- DB migration: 되돌리기 스크립트가 없으면 임의 실행 금지
- 결제: 환불/권한 revoke는 `worker/lib/payment-refund.js` 기준으로 안전 계획 후 진행

## 운영 반영 전 체크리스트

- 변경 범위가 문서인지 코드인지 분리
- 결제/LLM/DB/배포/R2 영향 여부 확인
- 실제 secret 값이 diff에 없는지 확인
- `git status`로 기존 사용자 변경과 내 변경 구분
- 관련 docs 업데이트 확인
- mock/sandbox 검증 결과 기록
- 정적 셸 변경 시 `sync:public`, `verify:locale-main-sync`, `verify:runtime-cache-sync`
- Worker 변경 시 stale base guard와 관련 `verify:*`
- Pages/Worker 배포는 사용자 승인 후 진행
- 배포 후 응답 시간 측정은 [`docs/POST_DEPLOY_LATENCY_RUNBOOK.md`](./POST_DEPLOY_LATENCY_RUNBOOK.md) 절차와 `npm run measure:post-deploy-latency` 사용
