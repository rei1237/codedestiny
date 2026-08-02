# Client API trace runbook

## 목적

프론트의 분리 호출 출처와 동일 endpoint의 동시 요청을 staging/preview에서 확인한다. 운영 배포와 실제 결제·LLM·운영 DB 쓰기는 이 절차에 포함하지 않는다.

## 계측 활성화

Worker 환경변수 `WORKER_CLIENT_API_TRACE=true`를 staging 또는 preview에만 설정한다. 기본값은 비활성화다. 허용된 `X-Code-Destiny-Client` 값만 구조화 로그에 기록되며 토큰, 이메일, 결제정보, 프로필 내용은 기록하지 않는다.

허용 source:

- `static:index-session-cache`
- `app:user-session-cache`
- `app:auth-store`
- `app:billing-client`
- `app:points`
- `app:points-history`
- `app:me`
- `legacy:destiny-profile`
- `feature:coin-gate`

## Tail 실행

토큰을 출력하지 않고 `.env.cloudflare.local`을 Wrangler에 직접 전달한다.

```powershell
$env:XDG_CONFIG_HOME = Join-Path ([IO.Path]::GetTempPath()) "code-destiny-tail-xdg"
New-Item -ItemType Directory -Path $env:XDG_CONFIG_HOME -Force | Out-Null

.\node_modules\.bin\wrangler.cmd tail code-destiny-web `
  --config worker\wrangler.toml `
  --env-file .env.cloudflare.local `
  --format json `
  --sampling-rate 0.99
```

`Connected` 이후 동일 로그인 세션에서 다음 순서로 재현한다.

1. 하드 새로고침 후 5초 대기
2. 프로필 페이지 진입 및 프로필 전환
3. 프로필 저장 또는 현재 프로필 변경
4. 유료 기능 게이트를 결제 선택창 직전까지 진입한 뒤 취소

결제 버튼, 실제 PortOne/KG이니시스 호출, LLM 실행은 하지 않는다.

## 확인할 지표

- `clientSource + method + path + status`별 요청 수와 실패율
- `/api/profile`, `/api/profile/current`, `/api/billing/coin-gate`, `/api/billing/balance`, `/api/payments/me`, `/api/subscription/status` 중복 수
- 같은 사용자·endpoint의 동시 요청 수
- 503/504 이후 재시도 횟수와 간격
- `requestId`, `cf-ray`, `colo`, `durationMs`
- Mongo `inFlightOps`, checkout wait/timeout, EventEmitter warning

정상 기준은 bootstrap endpoint의 동일 사용자 동시 중복 0건, 503/504 재시도 최대 1회, 5xx를 auth 실패로 변환하지 않는 것이다. trace가 보이지 않으면 해당 배포본에 `WORKER_CLIENT_API_TRACE=true`가 설정됐는지와 staging/preview Worker가 최신 코드인지 먼저 확인한다.
