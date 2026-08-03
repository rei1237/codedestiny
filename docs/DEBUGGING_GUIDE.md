# Debugging Guide

작업 중 취약점, 보안 위험, 재현 가능한 버그를 발견하면 즉시 사용자에게 보고하고, 필요하면 다른 세션에서 분리 디버깅할 수 있도록 위험도와 짧은 제안도 함께 남긴다.

## 간헐적 503 폭주

- 증상: 로그인/결제/API 요청이 간헐적으로 503, timeout, temporarily unavailable을 반환한다.
- 가능한 원인: MongoDB pool checkout 지연, server selection timeout, Worker isolate I/O 격리, 중첩 retry/timeout, route-level DB 선검사 증가.
- 확인할 로그: Worker console, `worker/lib/db.js` Mongo op counter, `/api/health/route-metrics`, Cloudflare 5xx logs.
- 확인할 파일: `worker/lib/db.js`, `worker/lib/auth.js`, `worker/routes/billing.js`, `worker/index.js`.
- 안전한 재현 방법: 로컬 mock DB 또는 staging에서 동일 endpoint를 제한된 동시성으로 반복. 운영 부하 테스트 금지.
- mock 테스트 방법: DB helper를 stub하고 timeout/error branch를 unit test로 재현.
- 수정 전 주의사항: retry wrapper를 새로 감싸기 전에 기존 `withMongoRetry`, timeout, request memo를 확인한다.
- 503/504 응답에서 `X-Request-ID`, `X-CD-Error-Stage`, `Server-Timing`, `Retry-After`를 함께 기록한다. `X-CD-Error-Stage`는 `auth`, `db-op-admission`, `db-op-timeout`, `db`, `payment-provider`, `route` 중 하나다.
- 홈에서 `/api/access/unlocks`, `/api/sukuyo/yearly-fortune`, `/api/billing/checkout`가 보이면 잘못된 자동 호출이다. 각각 잠금 화면 진입, 숙요 1년운 보기, 단건 결제 클릭 전에는 0회여야 한다.
- `MONGO_SOCKET_TIMEOUT_MS`는 Worker 작업 제한보다 짧아야 한다. 현재 기준은 socket 11초, auth/operation 12초이며 풀 크기나 재시도 횟수를 장애 대응으로 늘리지 않는다.
- 운영 인덱스 점검은 `npm run verify:access-unlock-indexes`의 `--check` 성격으로 먼저 수행하고, 생성은 별도 운영 DB 쓰기 승인 뒤 실행한다.

## 결제·권한 복구 PR이 병합 불가로 남는 경우

- 증상: 최신 CI 실행은 통과했는데도 PR의 merge status에 이전 `Worktree / PR Policy` 실패가 남는다.
- 가능한 원인: PR 본문 필수 섹션(`Scope`, `Validation`, `No-regression Scope`, `Risk`, `Rollback`) 누락으로 같은 head SHA에 실패 check run이 기록된 뒤, 본문만 수정해 성공 run을 추가한 경우다.
- 안전한 해소: 누락 섹션을 보완한 뒤 새 커밋 SHA에서 정책 검사를 다시 실행한다. 이전 실패 check run을 우회하거나 보호 브랜치 규칙을 완화하지 않는다.
- 배포 전 확인: 새 head SHA의 `Worktree / PR Policy`, `paid-flow-gates`, Pages build, secret scan이 통과하고, Worker와 Pages가 같은 SHA로 배포될 준비가 되었는지 확인한다.

## 결제 성공 후 이용권 미반영

- 증상: PortOne 결제는 성공했지만 이용권, 월정석, unlock, 결과 접근이 열리지 않는다.
- 가능한 원인: webhook 미수신/검증 실패, confirm 실패, 금액/featureKey mismatch, orderState stuck, 월정석 lot 차감/복구 실패, entitlement upsert 누락.
- 확인할 로그: `Payment`, `PaymentWebhookEvent`, `PaymentFailureLog`, `PointHistory`, `MonthlyCreditLedger`, `ContentEntitlement`, Worker payment logs.
- 확인할 파일: `worker/routes/payments.js`, `worker/routes/billing.js`, `worker/lib/portone.js`, `worker/lib/payment-reconcile-task.js`, `worker/lib/content-unlocks.js`.
- 안전한 재현 방법: sandbox/mock 결제로 `prepare -> complete/webhook -> access` 흐름만 검증.
- mock 테스트 방법: PortOne fetch를 fake response로 주입하고 DB는 test DB 또는 mocked model 사용.
- 수정 전 주의사항: 운영 결제 취소/환불은 승인 전 실행 금지. 사용자 손해 방지를 위해 권한 지급/환불 가능성을 함께 검토한다.

## 로그인 만료 / 권한 확인 실패

- 증상: 로그인 상태가 풀리거나 유료 기능에서 auth_required, 401, 403이 발생한다.
- 가능한 원인: JWT 만료/refresh 실패, cookie SameSite/Secure 설정, OAuth callback mismatch, profile snapshot stale, Worker auth route와 legacy route 혼용.
- 확인할 로그: `/api/auth/session`, `/api/session`, Worker auth logs, browser cookie/storage.
- 확인할 파일: `worker/routes/auth.js`, `worker/lib/auth.js`, `worker/lib/jwt.js`, `app/_lib/auth-client.ts`, `app/_lib/auth-storage.ts`, `middleware.ts`.
- 안전한 재현 방법: test user로 local auth flow, expired token mock, OAuth callback URL dry check.
- mock 테스트 방법: signed fake token 또는 auth helper stub으로 권한 branch 확인.
- 수정 전 주의사항: 운영 OAuth 설정이나 JWT secret 변경은 승인 없이는 금지.

## 결제 성공 뒤 다시 잠기거나 로그인을 요구하는 경우

- 먼저 `GET /api/me/access-state?profileId=...` 응답의 `userId`, `currentProfileId`, `completeness`, `authority`, `unlockedFeatureIds`, `profileScopedAuthoritative`를 함께 확인한다.
- `completeness=full`, `authority=server`인데 기존 구매가 없다면 현재 프로필의 `ContentEntitlement.featureKey/scope/status/grantType`를 먼저 확인하고, `User.unlockedFeatures`와 `User.paidFeatures`는 레거시 호환 증거로만 대조한다. 일반 access-state 조회에서 `PointHistory`나 Payment 스캔이 발생하면 회귀다.
- Mongo 장애 때 `200 + degraded:true + authority:none`은 표시용 저하 응답이다. 클라이언트가 이를 401로 바꾸거나 마지막 정상 해금 Snapshot을 빈 값으로 덮어쓰면 안 된다.
- AccessStore가 `/api/access/unlocks`를 카드별로 반복 호출하거나 raw `fetch`로 인증 갱신을 우회하면 회귀다. React에서는 등록된 `authFetch` adapter, 정적 UI에서는 `fetchJsonWithAuth`를 사용해야 한다.
- `403 MISSING_PROFILE_ID`, `PROFILE_REQUIRED`, `CONTENT_LOCKED`는 로그아웃 근거가 아니다. 세션과 마지막 정상 스냅샷을 유지하고 권한·프로필 오류로 표시한다. 최종 `401`만 로그인 필요로 분류한다.
- 결제 직후 현재 탭은 optimistic grant, 다른 탭은 `code-destiny-access-sync`, 서버는 사용자 단위 access cache invalidation으로 반영된다. 이후 한 번의 complete snapshot 재검증으로 확정한다.
- 회귀 테스트: 기존 구매 bootstrap, 프로필 격리, 401/403 분리, 503 stale 복구, 결제 직후 optimistic grant, BroadcastChannel 다중 탭, 새로고침·로그아웃/재로그인 순서로 확인한다.

## 모바일에서 특정 페이지가 메인으로 튕김

- 증상: 모바일 WebView 또는 브라우저에서 특정 기능 진입 시 `/` 또는 앱 store/main으로 돌아간다.
- 가능한 원인: static route redirect, Capacitor pruned route, app payment guard, back handler, legacy static shell action mapping, `_redirects` canonical redirect.
- 확인할 로그: browser console, route navigation logs, Network 301/308, Android WebView logs.
- 확인할 파일: `public/_redirects`, `app/_lib/route-auth.ts`, `app/_lib/backHandler.ts`, `lib/navigation/backHandler.ts`, `app/app/**`, `scripts/app-payment-guard.js`, `js/core/checkout-entry.js`.
- 안전한 재현 방법: local mobile viewport + no real payment; Capacitor runtime flag mock.
- mock 테스트 방법: `NEXT_PUBLIC_RUNTIME_TARGET=mobile-app` 또는 runtime guard stub.
- 수정 전 주의사항: `/points` 프로그램 이동은 앱에서 빈 화면 위험이 있다. 결제 모달 entry를 우선 확인한다.

## LLM 상담 준비 중 문제

- 증상: “상담 준비 중 문제가 생겼어요”, `LLM_ERROR`, `GENERATION_FAILED`, 503/409.
- 가능한 원인: LLM key/binding 없음, provider timeout, schema parse 실패, fallbackMinChars 미달, idempotency collision, 결제/권한 선행 실패.
- 확인할 로그: `[llm provider_call]`, `[llm token_usage]`, route-specific generation logs, 상담 collection status.
- 확인할 파일: `lib/llm-client.ts`, `worker/lib/gemini.js`, `worker/lib/structured-consultation.js`, feature route under `worker/routes/*-ai.js`.
- 안전한 재현 방법: 실제 LLM 호출 없이 fake provider response로 route branch 검증.
- mock 테스트 방법: `fetchImpl`, fake `env.AI.run`, route test hook 사용.
- 수정 전 주의사항: 실제 LLM 호출 금지. 유료 route면 실패 시 차감/권한 복구를 함께 확인한다.

## PDF / 결과 생성 실패

- 증상: 결제 후 PDF 버튼 미노출, PDF 렌더 실패, 다운로드 실패, archive 조회 실패.
- 가능한 원인: 로컬 계산 JSON 누락, LLM 보강 실패, PDF runtime 오류, archive route alias mismatch, 권한 record 누락.
- 확인할 로그: AI route generation logs, `/api/billing/pdf-archive/*`, browser console, PDF rendering errors.
- 확인할 파일: `worker/lib/pdf-runtime.js`, `lib/pdf/export-result-pdf.ts`, `worker/lib/premium-chapter-json-contract.js`, feature result pages.
- 안전한 재현 방법: fixture JSON과 mock LLM text로 PDF render만 검증.
- mock 테스트 방법: 저장된 fixture/result object로 export function 실행.
- 수정 전 주의사항: 인생의 책 PDF 순서(권한 확인 → 로컬 계산 JSON → LLM 보강 → PDF 렌더)를 바꾸지 않는다.

## MongoDB 인덱스 문제

- 증상: 조회 지연, duplicate key, TTL 미작동, 월정석 만료/LLM cache cleanup 실패.
- 가능한 원인: migration 미실행, TTL drift, unique index mismatch, legacy model과 Worker model index 차이.
- 확인할 로그: Mongo duplicate key error, slow query, migration output.
- 확인할 파일: `worker/lib/models.js`, `server/models/**`, `app/_lib/models/**`, `scripts/migrations/**`.
- 안전한 재현 방법: local/test DB에서 migration `--check` 또는 createIndexes dry run만 수행.
- mock 테스트 방법: model schema index snapshot test 또는 migration script `--check`.
- 수정 전 주의사항: 운영 DB migration/write는 승인 없이 실행 금지.

## R2 에셋 경로 문제

- 증상: 이미지/폰트/음악 404, CORS 오류, 느린 로딩, 모바일에서 이미지 미표시.
- 가능한 원인: object key encoding, custom domain route, CORS Range header, cache metadata, manifest mismatch, public/local fallback 누락.
- 확인할 로그: Network status/CORS, Cloudflare R2 metrics, browser console.
- 확인할 파일: `lib/r2-public-url.ts`, `docs/r2-assets-cache-strategy.md`, `docs/music-player.md`, `app/music/_data/musicManifest.ts`, `scripts/generate-music-manifest.ts`, `_headers`.
- 안전한 재현 방법: 공개 URL HEAD/GET 확인. secret credential 없이 public access만 확인.
- mock 테스트 방법: manifest entry를 local fixture로 두고 URL builder unit test.
- 수정 전 주의사항: R2 secret 값 기록 금지. 대량 preload 금지.

## 대용량 이미지/오디오로 인한 모바일 성능 저하

- 증상: LCP 악화, 첫 화면 지연, 스크롤 버벅임, 오디오 첫 재생 지연.
- 가능한 원인: 숨겨진 탭 이미지 preload, R2 원본 이미지 직접 로딩, 음악 프록시 경유, IntersectionObserver와 `loading="lazy"` 중첩, service worker/cache stale.
- 확인할 로그: DevTools Network/Performance, Lighthouse/PSI reports, `reports/**`.
- 확인할 파일: `index.html`, `js/core/index-inline-runtime.js`, `js/core/uiBindings.js`, `app/music/**`, `lib/music-access-policy.js`, `_headers`.
- 안전한 재현 방법: mobile viewport, throttled network, no production writes.
- mock 테스트 방법: asset manifest fixture + canvas/image request count test.
- 수정 전 주의사항: 공용 모바일 래퍼를 재디자인하지 말고 해당 기능 자산 로딩만 최소 수정한다.

## Cloudflare 빌드 실패

- 증상: Pages build fail, Worker dry-run fail, `_next/static` 404, dist missing version/header.
- 가능한 원인: Node version mismatch, static export incompatibility, env 누락, double deployment, cache stale, Worker bundle limit, secret sync failure.
- 확인할 로그: Cloudflare Pages build log, GitHub Actions, `dist/version.json`, `dist/_headers`.
- 확인할 파일: `package.json`, `next.config.mjs`, `wrangler.toml`, `worker/wrangler.toml`, `scripts/build-cf-main.mjs`, `scripts/deploy-pages.mjs`, `docs/deploy-cache.md`.
- 안전한 재현 방법: 로컬 `npm run build:cf`, `npm run build:worker` dry-run.
- mock 테스트 방법: deploy scripts dry-run 또는 build artifact checks only.
- 수정 전 주의사항: 운영 배포, secret sync, purge everything은 사용자 승인 후 진행한다.

## Safe Auto Release가 preview 전에 lint warning으로 중단됨

- 증상: Cloudflare 자격 증명과 배포 정책 검사는 통과하지만 `changed-file lint`에서 `ESLint found too many warnings (maximum: 0)`으로 종료되고 preview URL이 생성되지 않는다.
- 원인: 린트 경고를 배포 오류로 승격하는 `--max-warnings=0`이 기존 CommonJS 또는 레거시 정적 JS 경고까지 운영 차단으로 처리한다.
- 안전한 해소: 배포 게이트는 ESLint `--quiet`으로 실제 오류만 차단한다. 타입 검사, mock 결제·인증 게이트, 전체 회귀 테스트, Worker dry-run과 preview smoke는 그대로 유지한다.
- 검증: `npm run verify:deploy-safe`, `npm run deploy:critical`, `npm test`, PR 필수 CI를 통과시킨 뒤 새 `main` SHA의 `Cloudflare Safe Auto Release`만 사용한다. 실패한 배포를 수동 Worker/Pages 명령으로 우회하지 않는다.

## Pages preview 업로드 후 배포 목록 조회가 400으로 중단됨

- 증상: Pages preview 파일 업로드와 alias 생성은 성공하지만 직후 `Invalid list options provided. Review the page or per_page parameter.`로 종료된다.
- 원인: Pages 배포 목록 API에 지원 범위를 확인하지 않은 `per_page` 값을 하드코딩했다.
- 안전한 해소: `env=preview|production` 필터만 전달하고 Cloudflare 기본 페이지를 사용한다. 방금 업로드한 commit SHA와 branch는 최신 기본 페이지에서 확인한다.
- 검증: URL 자체 테스트에서 `page`와 `per_page`가 없음을 고정하고, preview 조회·Worker preview·읽기 전용 smoke가 모두 성공한 뒤에만 운영 승격한다.

## 2026-08 Mongo pool burst 대응

- `wrangler tail`에서 `/api/profile`, `/api/billing/balance`, `/api/billing/coin-gate`가 같은 짧은 구간에 중복 호출되는지 먼저 확인한다.
- `[db-op-timeout]`의 `checkOutFailed`, `maxCheckoutWaitMs`, `inFlightOps`를 함께 본다. 저장 용량이 충분해도 connection pool checkout 포화로 503이 발생할 수 있다.
- `Possible EventEmitter memory leak detected`가 반복되면 timeout으로 종료된 Mongo 작업이 실제로 취소되지 않고 남아 있는지 확인한다. `Promise.race` timeout은 underlying query를 자동 취소하지 않는다.
- 동일 사용자 auth/snapshot 조회는 in-flight single-flight로 합치고, Mongo 작업 admission을 `MONGO_MAX_IN_FLIGHT_OPS`와 `MONGO_OP_ADMISSION_TIMEOUT_MS`로 제한한다.
- 복구 검증은 결제/LLM 실호출 없이 mock 또는 dry-run으로 진행하고, 배포 후 tail에서 checkout 실패율·503율·중복 호출 수를 다시 비교한다.
