# ① 연결 계층과 상시 비용

> 실측: `worker/lib/db.js` 코드 기본값 + `worker/wrangler.toml [vars]` 대조, 2026-08-16

## 연결 구조 (결론 먼저)

> 🔴 **정정 (2026-08-16 같은 날, 프로덕션 실측 후).** 아래 원문은 **코드를 읽고 쓴 것**이고,
> 같은 날 프로덕션에서 잰 결과가 그 결론을 뒤집었다. 상세는
> [docs/handoff/pg-window-latency-2026-08-16.md](../handoff/pg-window-latency-2026-08-16.md).
>
> - "**실제 핸드셰이크는 드물다**" — **틀렸다.** `cdconn` 이 요청마다 ~1,300ms 나온다.
>   Mongo 읽기 1건짜리 라우트를 간격만 바꿔 7회 불렀더니 **300ms 뒤 요청도 죽은 소켓을 밟았다.**
>   유휴 시간과 무관하므로 `maxIdleTimeMS` 는 이 상황의 방어선이 아니다(요청 컨텍스트가 끝나면
>   그 컨텍스트에서 연 소켓이 못 쓰게 되는 Cloudflare 의 성질 — 아래 문단이 말하는 그 성질과 같은 뿌리다).
> - "**소켓 1생애당 ping 1회에 수렴한다**" — 수렴하는 것은 맞지만, 그 결과가 **절감이 아니라 손해**였다.
>   ping 을 건너뛴 요청은 대신 **쿼리에서 7.8초**를 태웠다(죽은 소켓 발견 비용).
> - 그래서 2·3·4번 항목은 **더 이상 현행 코드가 아니다**: `MONGO_PING_MIN_INTERVAL_MS` 0(매 요청 검증) ·
>   ping 타임아웃 1,000ms · 검증 실패 시 리셋 후 재수립(단 동시 요청이 있으면 끊지 않는다).
>   아래 줄번호도 그 커밋 이후로는 맞지 않는다.
>
> 원문은 **감사 시점의 기록으로 남긴다** — 지우면 "왜 그렇게 튜닝돼 있었는지"가 사라진다.

**요청마다 `connectDb()` 를 부르지만 실제 핸드셰이크는 드물다.** 웜 게이트가 3중이다:

1. `readyState === 1` 이면 즉시 재사용 (`worker/lib/db.js:490`)
2. 마지막 정상 확인 후 `MONGO_PING_MIN_INTERVAL_MS`(50,000ms) 이내면 **ping 조차 생략** (`:510-513`)
3. 그 밖이면 `db.command({ping:1})` 1회, 타임아웃 3,500ms (`:514-522`)

ping 실패해도 `readyState === 1` 이면 절대 disconnect 하지 않는다(`:530-533`).
`maxIdleTimeMS` 60,000 과 한 세트로 **"소켓 1생애당 ping 1회"** 에 수렴한다.

Cloudflare Worker 에서 Data API 나 프록시를 쓰지 않는다. `nodejs_compat`(`worker/wrangler.toml:7`)
위에서 mongoose 가 TCP 로 Atlas 에 직접 붙는다. 드라이버 기본 `stream` 모니터가 요청 수명을 넘는
ReadableStream 을 만들어 *"Cannot perform I/O on behalf of a different request"* 를 유발했기 때문에
`serverMonitoringMode: "poll"` 로 회피한다(`worker/lib/db.js:634-638`).

## 실측 옵션값

코드 기본값과 `worker/wrangler.toml [vars]` 가 **한 세트로 일치해야** 하며
`__tests__/worker/db.vars-code-default-parity.test.js` 가 이를 강제한다.
🔴 env 가 코드를 이기므로 한쪽만 고치면 조용히 무효가 된다(2026-08-12 `283afff11` 실사고).

| 옵션 | 공유 레인 | 결제 레인 | 위치 |
|---|---:|---:|---|
| `maxPoolSize` | 10 | 6 | `db.js:604`, `:785` |
| `minPoolSize` | 0 | 0 | `:609` |
| `maxConnecting` | 2 | — | `:614` |
| `maxIdleTimeMS` | 60,000 | 동일 | `:486` |
| `serverSelectionTimeoutMS` | 3,000 | 동일 | `:453` |
| `connectTimeoutMS` | 5,000 | 동일 | `:455` |
| `socketTimeoutMS` | 7,000 | 동일 | `:463` |
| `waitQueueTimeoutMS` | 4,000 | 동일 | `:468` |
| `heartbeatFrequencyMS` | 30,000 | 동일 | `:646`, `:806-808` |
| `serverMonitoringMode` | `poll` | 동일 | `:638` |
| `bufferCommands` | false | false | `:632`, `:802` |
| **`autoIndex`** | **false** | **false** | `:633`, `:803` |
| `retryWrites` / `retryReads` | true | true | `:622-623` |
| admission 상한 | 24 | 12 | `:160`, `:171` |
| op 시도 상한 | 8,000 (하한 `serverSelection + 3500`) | confirm 만 15,000 | `:967`, `worker/payments/db.js` |

`app/_lib/dbConnect.js` 도 `autoIndex:false`(`:76`)다. **이 헬퍼는 프로덕션 요청 경로에 없다** —
`output: "export"` 정적 빌드라 `app/api/**` 라우트 핸들러가 0개이고, 실제 임포터는 스크립트 4개뿐이다
(`scripts/seed-test-account.mjs` 외 3개).

## 상시 비용 (트래픽과 무관하게 발생)

```
heartbeat 30초 간격 × 노드 수 × 살아있는 아이솔레이트 수 × 클라이언트 2개(공유 + 결제 레인)
```

M10 고정요금 아래서는 이것이 보이지 않는다. **ops/sec 과금 티어로 내려가면 이 값이 요금의
바닥값이 된다.** 강등을 검토할 때 결제 전용 레인(`connectPaymentDb`, `db.js:760-869`)을 유지할지
함께 판단해야 하는 이유다 — 레인 분리는 클라이언트를 2벌 띄우므로 heartbeat 도 2배다.

## `autoIndex:false` 의 양면

**이득**: 연결당 인덱스 빌드 비용이 0이다. 그리고 실수 방지 장치이기도 하다 —
`app/_lib/dbConnect.js:70-76` 주석에 근거가 적혀 있다. 이 헬퍼를 쓰는 스크립트가
`worker/lib/models.js` 를 통째로 import 하는데, `autoIndex` 가 켜져 있으면 **미생성 인덱스 81개가
로컬 실행 한 번에 프로덕션으로 나가고**, unique `permanent_unlock_identity` 는 기존 중복 때문에
실패하며 `checkout_funnel_events` 의 90일 TTL 은 그 즉시 문서를 지우기 시작한다.

**대가**: 스키마 선언이 곧 실재를 뜻하지 않는다. 실제로 드리프트가 살아 있다 →
[03-index-and-ttl.md](03-index-and-ttl.md)

## 런타임 인덱스 생성 — 1곳 있었고, 이번에 조회 경로에서 제거했다

`worker/routes/ziwei-daehan.js` 의 `ensureDaehanIndexes()` 가 요청 경로에서 `createIndex` 를 부른다.
모듈 스코프 프로미스라 아이솔레이트당 1회지만, **아이솔레이트가 새로 뜰 때마다 최초 요청 1건이
왕복을 지불**한다.

조회(`handleDaehanStatus`) 경로의 호출은 제거하고 `scripts/migrations/20260816-add-daehan-purchase-index.mjs`
로 이관했다. 🔴 **unlock(쓰기) 경로의 호출은 그대로 뒀다** — `{userId, profileId}` unique 가 곧
대한 구매 중복 방지이고, 이 컬렉션은 mongoose 모델이 없어 `verify:mongo-launch-indexes` 의
사각지대이기 때문이다.

## 요청당 왕복 (대표 경로)

| 경로 | Mongo 왕복 | 비고 |
|---|---:|---|
| 비로그인 홈 진입 | **0** | 클라이언트 힌트 게이트가 요청 자체를 막는다(`index.html:327`, `:375`) |
| 로그인 홈 진입 (cold) | ~7-9 | `/api/auth/me` · `/api/me/access-state` · `/api/subscription/status` · `/api/billing/unlock-status` |
| 로그인 React 라우트 (cold) | ~9-12 | 위 + `?profileId=` 붙은 access-state **중복 1회** → [02](02-query-inventory.md) |
| 세션 하트비트 | 5분마다 ~2 | `app/_lib/auth-store.ts:703`, 보이는 탭만 |
| 인증 (모든 요청) | **1 고정** | `worker/lib/auth.js:378`, projection 적용됨 |
| 인증 (access 만료 → refresh 폴백) | 2 | `:450` refresh_tokens + `:468` users |

인증이 JWT 서명만으로 끝나지 않는 이유는 `isWithdrawnUser(user)` 탈퇴 판정이다.
요청 간 dedup 은 **일부러 제거**돼 있다(`worker/lib/auth.js:365-371`) — Cloudflare Workers 가
요청 간 Promise 승계를 금지하기 때문이며, 되살리면 안 된다.
