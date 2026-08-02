# Deployment and Infra

## Cloudflare Pages 구조

- Pages config: `wrangler.toml`
- Build output: `dist`
- Build scripts: `npm run build`, `npm run build:cf`
- Cache headers: `_headers`, `public/_headers`
- Redirects: `public/_redirects`
- Static home source: `index.html`
- Static mirrors: `public/index.html`, `public/static/index.html`, `public/{en,ja,zh}/index.html`

운영 Pages 배포는 사용자 명시 승인 후에만 진행한다.

## Cloudflare Workers 구조

- Worker config: `worker/wrangler.toml`
- Entry: `worker/index.js`
- Routes: `worker/routes/**`
- Shared Worker libs: `worker/lib/**`
- Worker name/custom routes는 `worker/wrangler.toml`에서 확인한다.
- AI binding, R2 bucket binding, cron triggers가 Worker config에 있다.

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

Codex deployment rule:

- Do not deploy directly to production during normal coding work.
- Put deployable changes into a PR first.
- The PR must record regression risks, mock/sandbox validation results, no-regression checks, and rollback method.
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
