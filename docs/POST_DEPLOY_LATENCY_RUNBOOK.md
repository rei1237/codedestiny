# 배포 후 응답 시간 측정 런북

이 런북은 결제 보안 정책 변경 후 Worker와 권한 조회 경로의 회귀를 빠르게 확인하기 위한 절차다. 모든 측정 요청은 `GET` 읽기 전용이며 주문 생성, 결제 검증, PG 호출, Google Play 검증, LLM 호출, DB 쓰기를 수행하지 않는다.

## 측정 대상

기본 대상은 다음 세 경로다.

- `/api/health`: Worker 기본 응답 및 라우팅 상태
- `/api/payments/me`: 로그인 사용자의 결제·이용권 요약 조회
- `/api/subscription/status`: 로그인 사용자의 월정석 상태 조회

`/api/payments/me`와 `/api/subscription/status`는 테스트 계정의 인증 Cookie가 필요하다. 운영 사용자 Cookie나 결제 인증값을 사용하지 않는다.

## 배포 전 게이트

PR에 다음 결과와 함께 기록한다.

```powershell
npm.cmd run typecheck
npm.cmd run verify:billing-pass-policy
npm.cmd run verify:app-store-pricing
npm.cmd run verify:app-store-billing-policy
npm.cmd run verify:portone-single-payment
npm.cmd run verify:paid-feature-billing-policy
npm.cmd run verify:checkout-pass-card
npm.cmd run verify:payment-choice-parity
npm.cmd run verify:entry-encoding -- --strict-core
npm.cmd run test:jest -- --roots __tests__ --runTestsByPath `
  __tests__/worker/entitlement-policy.test.js `
  __tests__/billing/pass-policy-static.test.js `
  __tests__/billing/checkout-entry.test.js `
  __tests__/billing/pass-verdict.test.js `
  __tests__/worker/payments.subscription-purchase.test.js `
  __tests__/worker/payments.prepare-idempotency.test.js `
  __tests__/worker/app-store.google-billing.test.js
npm.cmd run build:worker
```

`build:worker`는 `--dry-run`이어야 한다. 실제 PG, Google Play, LLM, 운영 DB, 운영 배포는 이 게이트에 포함하지 않는다.

## 측정 실행

배포가 완료되고 배포 ID/커밋을 확인한 뒤, 동일한 테스트 계정으로 다음을 실행한다. Cookie 값은 명령 기록이나 로그에 남기지 않는다.

```powershell
$env:CD_LATENCY_COOKIE = '<테스트 계정의 인증 Cookie>'
npm.cmd run measure:post-deploy-latency -- `
  --base https://code-destiny.com `
  --iterations 20 `
  --warmup 2
Remove-Item Env:CD_LATENCY_COOKIE
```

공개 health만 확인할 때는 Cookie 없이 실행할 수 있다. 이 경우 보호된 두 경로는 자동으로 건너뛴다.

```powershell
npm.cmd run measure:post-deploy-latency -- `
  --base https://code-destiny.com `
  --endpoint /api/health `
  --iterations 20
```

측정 스크립트는 endpoint별 `p50`, `p95`, `p99`, 최소/최대 시간, HTTP 상태별 개수, 오류 수를 출력한다. 응답에 `Server-Timing`이 있으면 서버 측 시간의 p95도 함께 출력한다. Cookie와 route-metrics token은 출력하지 않는다.

## 측정 시점과 판정

최소한 다음 시점에 같은 명령을 반복하고 배포 기록에 결과를 저장한다.

1. 배포 직후(T+5분): 기본 smoke 및 초기 캐시 상태 확인
2. T+15분: 정상 트래픽 후 권한 조회 p95 확인
3. T+60분: 캐시 만료·재검증 이후 확인

초기 배포에는 기존 baseline이 없을 수 있으므로 첫 결과를 baseline으로 저장한다. 이후 다음 중 하나라도 발생하면 배포를 중단하고 원인을 확인한다.

- `/api/payments/me` 또는 `/api/subscription/status`에 5xx/timeout 발생
- 같은 조건의 기존 baseline보다 p95가 30% 이상 증가
- route metrics에서 동일 화면 진입의 동일 권한 endpoint 중복 호출이 재발
- 인증 실패가 정상 사용자의 기능 실패로 나타남
- 정책 위반 감사 코드(`CANNOT_BUY_PASS_WITH_PASS`, `FAMILY_CANNOT_PURCHASE_HIGHER_TIER_PRODUCTS`, `INVALID_PAYMENT_METHOD_FOR_PASS_PRODUCT`, `CLIENT_PAYMENT_METHOD_TAMPERING_DETECTED`)가 비정상적으로 급증

30% 기준은 운영 SLO를 대체하지 않는 초기 회귀 가드레일이다. 서비스 소유자가 확정한 SLO가 있으면 그 기준을 우선한다.

## 중복 호출·서버 병목 확인

측정 결과가 나쁘거나 shop 진입 시간이 증가하면 preview/staging에서 먼저 trace를 확인하고, 운영에서는 최소 권한으로 route metrics만 조회한다.

```powershell
$env:CD_ROUTE_METRICS_TOKEN = '<route metrics token>'
npm.cmd run measure:post-deploy-latency -- `
  --base https://code-destiny.com `
  --endpoint /api/health/route-metrics `
  --iterations 3 `
  --warmup 0
Remove-Item Env:CD_ROUTE_METRICS_TOKEN
```

route metrics endpoint는 환경 플래그와 토큰이 필요하다. 토큰을 명령행 인자나 결과 문서에 기록하지 않는다. 응답에서 다음을 확인한다.

- `api/payments/me`, `api/subscription/status` 호출 수와 평균/최대 시간
- 5xx와 timeout 수
- 배포 후 route별 p95 증가 여부
- `requestId`, `cf-ray`, `durationMs`, Mongo `inFlightOps` 및 query counter 로그의 상관관계

클라이언트 중복 호출은 `docs/CLIENT_API_TRACE_RUNBOOK.md` 절차로 `clientSource + method + path + status`를 묶어 확인한다. shop 진입에서 상품 카드 수에 비례해 권한 API가 증가하면 회귀로 판정한다.

## 대응과 rollback

응답시간 또는 결제·권한 오류가 회귀하면 먼저 새 결제 준비/확정 요청을 중지하고 로그와 배포 ID를 보존한다. 그 다음 `npm run deploy:rollback -- --list` 로 대상을 확인하고 `-- --yes --to=<pagesDeploymentId> [--worker-version=<id>]` 로 Cloudflare Worker/Pages를 이전 버전으로 되돌린다(코드까지 되돌려야 하면 `main` 에서 `git revert`). 운영 결제 취소·환불·권한 복구 및 DB 변경은 별도 승인 없이 실행하지 않는다.

배포 기록에는 다음을 남긴다.

- 배포 커밋/Worker 버전/Cloudflare 배포 ID
- T+5/T+15/T+60 측정 결과
- 테스트 계정 사용 여부(식별정보 제외)
- route metrics 및 감사 로그의 이상 유무
- rollback 판단과 승인자
