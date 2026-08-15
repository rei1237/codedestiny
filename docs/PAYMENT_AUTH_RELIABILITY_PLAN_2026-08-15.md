# 결제·로그인 간헐 장애 — 실측 및 최적화 계획

작성 2026-08-15 · 대상 `worker/payments/**`, `worker/routes/{payments,auth,billing}.js`, `app/_lib/{billing-client,auth-client,auth-store}.ts`
승인 사항: **wrangler.toml 은 `[vars]` 추가만** · 실측은 **HAR 캡처 + `wrangler tail` 병행** · 이번 산출물은 **본 문서까지**

---

## 0. 세 줄 요약

1. **결제 409 는 MongoDB M10 스펙 문제가 아니다.** 사용자 판단이 맞다 — 원인은 두 가지 로직 결함이고, 둘 다 코드로 확인됐다. ① 구 `/api/payments/single/start` 에 형제 경로(`/prepare`)에는 있는 E11000 복구가 **누락**돼 있고, ② 클라이언트 `requestId` 가 **난수가 아니라 결정적(deterministic) 문자열**이라 같은 사용자·같은 기능은 영원히 같은 주문 문서 하나를 재사용한다.
2. **로그인 오류도 M10 과 무관하다.** 로그아웃 시 **in-flight 인증 요청을 취소하지 않아서**, 그 요청의 401 응답에 실린 `Set-Cookie: Max-Age=0` 이 **재로그인으로 방금 발급된 세션 쿠키를 뒤늦게 지운다.** 코드 주석(`auth-store.ts:1119-1125`)이 이 증상을 이미 문자 그대로 기록해 두었고, 방어는 **일부 경로에만** 적용돼 있다.
3. **지금 이 서비스는 장애를 사후에 조사할 수 없다.** `wrangler.toml` 에 `[observability]` 블록이 없어 훌륭한 `[pay]` 로그가 `wrangler tail` 이 붙어 있던 시간에만 존재한다. 그래서 계획의 1단계는 수정이 아니라 **관측을 켜는 것**이다.

---

## 1. 확정된 사실 (코드 인용)

### 1-1. `requestId` 는 난수가 아니다 — 이것이 결제 문제의 축

```ts
// app/_lib/billing-client.ts:4614
const requestId = toText(input.requestId || resolvePaidFeatureInFlightKey(input));
```

`resolvePaidFeatureInFlightKey`(`billing-client.ts:2968-3015`)는 난수·타임스탬프를 **전혀 쓰지 않고** `featureId | mode: | request: | session: | profile: | content: | product:` 만 이어붙인다. 즉 **같은 기능 + 같은 프로필이면 브라우저 세션·리로드·재클릭과 무관하게 영구히 동일한 문자열**이다.

이 값이 그대로 흐른다:

| 소비처 | 위치 | 결과 |
|---|---|---|
| coin-gate `body.requestId` | `billing-client.ts:4273` | 월정석 원장 `sourceId` (`moonstone.js:92`) |
| prepare `idempotencyKey` / `orderId` | `billing-client.ts:2306-2307` | — |
| `deriveOrderId(userId,key)=cd+sha256(...)` | `payments/orders.js:83-88` | **항상 같은 merchantUid** |

`payments/orders.js:177-180`, `moonstone.js:136`, `payments/index.js:793-797` 세 곳의 주석이 모두 "세션 고정 requestId 때문에 결제창이 영구 409 에 갇힌 **2026-08-12 실장애**"를 언급한다. 즉 **이미 한 번 터진 문제이고, 그때의 수정은 PENDING 케이스만 막았다.**

한편 정반대 생성기도 공존한다 — `openPaidFeatureGate`(`billing-client.ts:3080`)는 `${featureId}:${Date.now().toString(36)}-${Math.random()...}` 난수를 만든다. **두 생성기가 한 코드베이스에 공존한다는 것 자체가 in-flight 가드를 무력화하는 원인이다**(§2-4).

### 1-2. 인덱스 실측 (`worker/lib/models.js` 확인 완료)

```js
// models.js:245-246
merchantUid: { type: String, unique: true, sparse: true, index: true, trim: true },
idempotencyKey: { type: String, trim: true, default: "", index: true },

// models.js:313-322
paymentSchema.index({ userId:1, idempotencyKey:1, paymentType:1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $exists:true, $type:"string", $gt:"" } } });
```

→ 결제 주문에 **unique 충돌면이 2개**다. 결정적 키와 만나면 동시 요청의 패자는 반드시 E11000 을 맞는다.

반대로 **인증 쪽은 무혐의로 확정됐다**:

```js
// models.js:463-474
}, { timestamps: true, collection: "refresh_tokens" });
refreshTokenSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshTokenSessionSchema.index({ userId: 1, revokedAt: 1, expiresAt: -1 });
```

`userId` 단일 unique 인덱스가 **없다** → "재로그인 시 세션 문서 E11000" 가설은 **기각**. `timestamps: true` 도 있으므로 로그아웃의 `createdBefore` 필터(`auth.js:2179`)도 정상 동작한다. 이 두 가설은 더 파지 않는다.

### 1-3. 신/구 로직 분기 — 결제창 발급 경로가 아직 구 코드다

`worker/index.js:1271-1378` 기준, V2(`worker/payments/`)로 가는 것은 **5개 경로뿐**이다: `GET /orders/:id`(1279) · `POST /webhook`(1289) · `POST /prepare`(1295) · `GET /config`(1304) · `POST /subscription/*`(1311). 나머지는 `:1316` 에서 구 `handlePaymentRoutes` 로 폴스루한다.

아직 구 로직: **`POST /api/payments/single/start`** · `/single/complete` · `/single/cancel` · `/confirm` · `/cancel` · `/report-failure` · `POST /api/billing/coin-gate` 의 DIRECT_KRW 케이스.

추가 위험 — `worker/index.js:1362` 의 `resolvePaymentCommandFromBody(JSON.parse(...))` 가 try/catch 안이라 **JSON 파싱이 실패하면 `coinGateMethod=""` 가 되어 조용히 구 핸들러로 폴스루**한다. `:1355-1361` 주석이 바로 이 종류의 사고를 기록하고 있는데 이 구멍만 남아 있다.

---

## 2. 결제 409 — 원인 후보와 판별표

| # | 후보 | 상태 | 증상 설명력 |
|---|---|---|---|
| A | 구 `/single/start` 의 read-then-create 레이스 → E11000 → 409 | **코드 확인** | ★★★★★ |
| B | 결정적 requestId + 비-PENDING 기존 주문 → `IDEMPOTENCY_CONFLICT` | **코드 확인** | ★★★★★ |
| C | 월정석 `MOONSTONE_IN_PROGRESS` / `CONTENDED` (90초 벽) | **코드 확인** | ★★★☆☆ |
| D | 클라이언트 in-flight 가드가 requestId 분기로 우회됨 | **코드 확인** | ★★★★☆ (A·C의 방아쇠) |
| E | V2 `createOrder` 에 11000 복구 누락 → **409 가 아니라 503** | **코드 확인** | ★★★★☆ (별개 증상) |

### 후보 A — `/single/start` 만 E11000 복구가 없다 (비대칭)

```js
// worker/routes/payments.js:2225-2231  읽기
const existing = await Payment.findOne({ userId, idempotencyKey, paymentType:"digital_content" })
                              .sort({ createdAt:-1 }).lean();
// ... 사이가 비어 있음 ...
// worker/routes/payments.js:2275-2279  쓰기 — upsert 아님, catch 없음
await Payment.create({ userId, merchantUid: paymentId, idempotencyKey, ... });
```

형제 경로 `handlePrepare` 에는 **있다** — `:3673-3677` upsert + `:3687-3701` E11000 → `buildIdempotentResponse`. `/single/start` 만 빠졌다. 진 쪽은 라우터 catch-all 로 간다:

```js
// worker/routes/payments.js:5888-5890
if (error && error.code === 11000) {
  return json({ message: "Duplicate payment key." }, { status: 409 });
}
```

**판별 지문**: 응답 본문이 정확히 `{"message":"Duplicate payment key."}` 이고 **`code` 필드가 없다.** 다른 모든 409 는 `code` 를 싣는다. 그리고 구 핸들러는 `payments/log.js` 를 쓰지 않으므로 **`[pay]` 로그가 아예 없다.**

### 후보 B — 결정적 키가 reprice 그물을 빠져나간다

```js
// worker/payments/index.js:788-807
const repriced = !featureDrift && toOrderStatus(created) === "PENDING"
  ? await repricePendingOrder(db, { orderId, product }) : null;
if (!repriced) throw paymentError("IDEMPOTENCY_CONFLICT", ...);   // :802
```

`repricePendingOrder`(`orders.js:182-204`)의 CAS 필터는 `{merchantUid, status:"pending"}` **정확 일치**다. 따라서 두 경우에 409:

- **기존 주문이 이미 PENDING 을 벗어남** — 결정적 키라 같은 사용자·같은 기능은 문서 하나를 영구 재사용한다. 한 번 결제하거나 결제창을 닫아 `failed` 가 되면 그 문서가 남고, 다음 시도는 reprice 대상이 아니다.
- **createOrder ↔ repricePendingOrder 레이스** — 둘은 별개 왕복이고 트랜잭션이 없다(`payments/index.js:933-937` 주석이 명시).

왜 애초에 priceDrift 가 생기는가 — `payments/index.js:748-749` 주석: 가격은 body 의 `mode`/`reportMode`/`categoryKey` 에 따라 달라진다. 그런데 **requestId 조합(`billing-client.ts:2992-3006`)에는 `reason`·`mode`·`reportMode`·`cost`·`amountKRW` 가 들어 있지 않다.** 즉 **가격이 다른 두 요청이 같은 idempotencyKey 를 갖는 것이 구조적으로 가능하다.**

**판별 지문**: `[pay]` 한 줄에 `"route":"POST /prepare"`, `"status":409`, `"errorCode":"IDEMPOTENCY_CONFLICT"`. 결정적 확인 — **같은 사용자의 여러 409 가 전부 동일한 `orderId` 마스크값**이면 세션 고정 키 재사용 확정(`deriveOrderId` 가 결정적이므로).

### 후보 C — 월정석 90초 벽

`moonstone.js` 는 원장 unique `{userId,type,sourceId}` 에 예약을 먼저 넣고(`:107-119`), 11000 이면 기존 행을 본다. 409 지점 4곳: `:139`(예약 나이 < `STALE_RESERVATION_TAKEOVER_MS`=90초, `:52`) · `:156` · `:157` · `:181`(`MOONSTONE_CONTENDED`).

**중요 — 이 후보는 "결제창 재등장"을 설명하지 못한다.** `shouldOpenRuntimePaymentFallback`(`billing-client.ts:2021-2048`)에 **409 는 없다**(402·특정 코드·`status>=500` 만). 월정석은 `explicitPaymentMode===true`(`:3897`)라 폴백 조건 `:4472` 도 못 넘는다. 즉 이 경우 재등장은 자동 재시도가 아니라 **사용자가 다시 클릭한 것**이다. 다만 결정적 requestId 때문에 사용자는 **90초 내내 같은 벽**에 부딪힌다.

**판별 지문**: 브라우저 Network 에 **같은 `body.requestId` 로 coin-gate 3연속 409, 250ms/500ms 간격**(`billing-client.ts:4294-4307` 의 좁은 재시도).

### 후보 D — in-flight 가드는 3중인데 셋 다 새는 구멍이 있다

가드는 존재한다: `billingCoinGateInFlight` Map(`:3832-3842`) · `billingCoinGateRecent` TTL(`:3843-3854`) · `paymentService.executePayment` single-flight(`:4616`). 결함 3개:

1. **가드 키에 `requestId` 가 들어간다**(`:2994`). 한쪽이 `openPaidFeatureGate` 의 난수를 넘기고 다른 쪽이 안 넘기면 **키가 갈라져 통과한다.**
2. **실패는 캐시되지 않는다.** `shouldCacheBillingCoinGateResult`(`:2111-2116`)는 `ok && hasVerifiedBillingAccess` 일 때만 참. 409 를 받으면 `:4597` 이 recent 를 지우고 `:4605-4607` finally 가 in-flight 를 즉시 지운다 → **409 직후 재클릭 억제가 0.**
3. **바깥(`:4614`)과 안쪽(`:3830`)의 in-flight 키가 서로 다르다** — `request:` 세그먼트만큼. 실질 방어선은 `executePayment` 하나뿐이다.

`PaymentProcessingContext.tsx` 는 오버레이 상태만 다루며 결제 호출을 트리거하지 않는다 — **무혐의.**

**판별 지문**: 콘솔에 `[paid-flow] {stage:"DUPLICATE_CLIENT_FLOW_BLOCKED"}`(`:3835`, `:3846`)가 **찍히지 않은 채** 같은 초에 요청이 2건 나갔다면 우회 확정. 두 요청의 `body.requestId` 형태를 비교 — `<feature>:<base36>-<rand>`(난수) vs `<feature>|mode:...|profile:...`(결정적)이면 키 분기 확정.

### 후보 E — V2 `createOrder` 의 11000 이 503 으로 오분류된다

`orders.js:103-141` 의 `createOrder` 는 upsert 하나뿐이고 **11000 catch 가 없다.** 구 `handlePrepare` 에 있던 복구가 V2 로 오면서 사라졌다(`moonstone.js:122`·`entitlements.js:141`·`webhook.js:137` 은 다 잡는데 `orders.js` 만 없다). 그 예외는:

`11000` ∉ `PERMANENT_MONGO_ERROR_CODES`(`lib/http.js:191-199`) → `error.name==="MongoServerError"` → `/^Mongo/` 매치(`lib/http.js:233`) → `isDbUnavailableError=true` → **`DB_UNAVAILABLE` = 503 + Retry-After: 2**(`errors.js:94`).

그리고 503 은 `shouldOpenRuntimePaymentFallback`(`:2047`)의 `status>=500` 에 걸려 **결제창이 다시 열린다.**

→ **사용자가 본 것이 "409" 가 아니라 "에러 후 결제창 재등장" 이라면, 실제 상태코드가 503 일 가능성이 상당하다.** 이 서비스에서 "M10 인데 DB_UNAVAILABLE 이 뜬다"는 사용자의 위화감과도 정확히 맞는다 — **Atlas 는 멀쩡한데 중복키가 DB 장애로 둔갑한 것.** 실측 1순위가 상태코드 확정인 이유다.

---

## 3. 로그인 — 원인 후보와 판별표

`app/_lib/auth-store.ts:1119-1125` 가 증상을 문자 그대로 기록하고 있다:

> access/refresh 는 HttpOnly 라 **서버 응답의 Set-Cookie(Max-Age=0)로만** 지워진다. 기다리지 않고 화면을 이동하면 그 응답이 뒤늦게 도착해, 그 사이에 끝난 재로그인의 세션 쿠키까지 지운다 … 증상은 **"로그아웃 후 재로그인이 됐다 안 됐다" + 이용권 조회 401**이었다.

이 방어(`await logoutWithServer`)는 **React 경로에만** 적용됐다. 아래 셋은 같은 부류인데 다른 경로로 남아 있다.

| # | 후보 | 상태 | 설명력 |
|---|---|---|---|
| 1 | in-flight 인증 요청 미취소 → 늦은 `Set-Cookie: Max-Age=0` | **코드 확인** | ★★★★★ |
| 2 | refresh 싱글톤 파괴 + `revokeAllUserRefreshSessions` 무조건 호출 | **코드 확인** | ★★★★★ |
| 3 | 정착 대기 800ms < 요청 상한 3500ms (정적 셸 경로) | 코드 확인 (셸 미검증) | ★★★★☆ |
| 4 | 세션 발급 실패가 "비밀번호 틀림" 401 로 위장 | **코드 확인** (발생 조건은 별건) | ★★☆☆☆ |
| 5 | OAuth code dedup 가드가 isolate-local Map | **코드 확인** | ★★★☆☆ (소셜 한정) |
| — | 레이트리밋 | **기각** | ★☆☆☆☆ |

### 후보 1 — AbortController 가 없다

```ts
// app/_lib/auth-client.ts:374-400  clearClientAuthState()
refreshInFlight = null;      // 376  ← 프로미스 참조만 버림
authGetInFlight.clear();     // 377  ← 맵만 비움
```

`AbortController` 가 **어디에도 없다.** 이미 나간 `/api/auth/me`·`/api/auth/refresh` 는 살아서 응답을 받고, 서버는 그 401 응답에 쿠키 삭제를 붙인다 — `auth.js:3066-3070`(handleMe) · `:3157-3164` · `:3326-3348, 3426-3428, 3434-3436, 3443-3445`(handleRefresh) → `appendClearAuthCookies`(`:734-771`)가 access·refresh(2 path)·`fortune_auth_role`·csrf 를 전부 `Max-Age=0`.

**재현 조건**: 로그아웃 직전/직후에 위젯(useCoinGate, billing, 세션 하트비트 `auth-store.ts:685-690`, 탭 복귀 `:672-683`)이 이미 쏜 요청이 있고 → 사용자가 즉시 재로그인 성공 → 그 요청이 **나중에** 401 로 도착. Mongo 지연(`AUTH_OPERATION_TIMEOUT_MS` 12초, `auth.js:955-959`)일수록 창이 넓어진다 — **"한 번씩"이라는 간헐성과 정확히 맞는다.**

### 후보 2 — refresh 재사용 탐지가 재로그인 세션을 죽인다

`refreshSession()`(`auth-client.ts:414-465`)은 싱글톤인데 `clearClientAuthState()` 이 `refreshInFlight=null` 로 강제 해제하고, 로그아웃이 이걸 **두 번**(fetch 전 `:594`, 후 `:608`) 호출한다 → **싱글톤이 깨진다.** 게다가 401/403 이면 400ms 자고 한 번 더 쏜다(`:420-425`) → refresh 가 **로그아웃 후 1초 이상 살아 움직인다.**

서버의 두 결말이 모두 재로그인을 깬다:

- **(가) grace 안** — `auth.js:3408-3422`: `withinInFlightRotationTolerance`(3초, `:3413`)에 걸려 **폐기된 세션이 부활**하고 `:3521` 이 새 쿠키를 발급한다. 이 응답이 재로그인 뒤 도착하면 이전 계정 쿠키로 덮어쓴다.
- **(나) grace 밖** — `auth.js:3424`: `await revokeAllUserRefreshSessions(userId)` — **`createdBefore` 옵션이 없다.** `:2175-2185` 는 옵션이 없으면 `{userId, revokedAt:null}` 전체를 폐기한다 → **방금 재로그인으로 만든 세션도 함께 죽는다.** 로그아웃 경로(`:3566`)는 `createdBefore` 가드를 쓰는데 이 경로만 안 쓴다. **비대칭이 결함이다.**

**판별 지문**: 워커 로그의 `timer.log("reuse_detected")`(`:3425`), 응답 본문 `"Refresh token reuse detected. Please sign in again."`(`:3426`).

### 후보 3 — 800ms 캡 < 3500ms 상한

```ts
const LOGOUT_TIMEOUT_MS = 3500;                 // auth-client.ts:23
const PERSISTED_LOGOUT_SETTLE_CAP_MS = 800;     // auth-client.ts:30
```

같은 탭에 프로미스가 있으면 완전 대기(`:244-251`)라 안전하다. 문제는 **문서가 파괴되는 경로** — 로그아웃 fetch 는 `keepalive: true`(`:596-602`)라 문서가 사라져도 살아남는데, `clearLogoutInFlightMarker()` 는 `finally`(`:605-607`)에 있어 **영영 호출되지 않는다.** 다음 로그인은 마커를 보고 800ms 만 기다리고 진행한다(`:256-264`).

남은 위험은 정적 셸 `index.html` 의 `_logoutRequest` 경로다 — **스테이징 범위 밖이라 미검증.** 실측 항목으로 남긴다.

### 후보 4 — "비밀번호가 틀렸습니다" 로 위장되는 서버 오류

`auth.js:2853-2882` 의 catch 는 `isAuthInfraFailure`(`:2095-2111`, **문자열 매칭**)에 안 걸리면 `recordFailedLoginAttempt` 후 `buildInvalidLoginResponse()` → 401 invalid_credentials. 세션 발급(`:2841-2849` → `createRefreshSession` `:2146-2155`)이 이 try 안에 있으므로 **세션 write 실패가 "이메일/비밀번호가 틀렸다"로 표시되고 실패 카운터까지 올린다.**

§1-2 에서 unique 인덱스 부재를 확인했으므로 E11000 경로는 기각되지만, **오분류 자체는 남는 결함**이다(운영 중 원인 은폐).

### 후보 5 — OAuth dedup 이 isolate-local

```js
const OAUTH_CODE_EXCHANGE_GUARDS = new Map();   // auth.js:75  모듈 스코프
```

Workers 는 isolate 가 갈리면 Map 이 공유되지 않는다. 코드가 스스로 인정한다(`auth.js:4152-4154`). state JWT 의 `jti`(`:1392`)는 있으나 **1회용 소비 기록이 없다** — `verifySocialState`(`:1400-1406`)는 서명·purpose 만 본다. 콜백에서 뒤로가기·새로고침·프리페치·안드로이드 커스텀탭 이중 요청 시 `<provider>_token_exchange_failed` → AuthShell 이 `copy.unavailable` 로 렌더(`AuthShell.tsx:147-151`).

### 레이트리밋 — 기각

`20회/60초`(`auth.js:65-66`), 키는 `${IP}:${sha256(email)}`(`:1921-1926`), 저장소는 Mongo `abuse_scores`(`lib/rate-limit.js:1-15`), **실패만 카운트**. 정상 사용자가 재로그인으로 걸릴 수 없다. 다만 `readRateLimitState`(`rate-limit.js:66-81`)에 `maxTimeMS` 가 없어 **Mongo 가 느리면 로그인이 시작도 못 한 채 1.2초를 버린다**(`auth.js:970-974`) — 지연 항목으로만 추적.

---

## 4. 실측 계획

### Phase 0 — 관측 켜기 (반나절, 코드 0줄)

`worker/wrangler.toml` 의 `[vars]` 에 3개 추가 (승인된 범위):

```toml
WORKER_ROUTE_METRICS = "1"
WORKER_ROUTE_METRICS_TOKEN = "<32자 이상 랜덤>"   # 🔴 필수
WORKER_CLIENT_API_TRACE = "1"
```

이미 구현된 계측 3종이 켜진다 — 라우트별 count/avg/min/max/errors 집계(`worker/index.js:291-348`), 조회 엔드포인트 `/api/health/route-metrics`(`:1108-1140`), 클라이언트 소스별 latency/status/retryable `[client-api-trace]`(`:257-289`).

**🔴 토큰을 반드시 같이 넣을 것.** `worker/index.js:400-408` 의 게이트는 토큰이 비면 `return true` — **fail-open** 이다. 메트릭만 켜면 `/api/health/route-metrics` 가 무인증 공개된다.

**해석 주의**: `ROUTE_METRICS_STATE`(`index.js:8-11`)는 **아이솔레이트 로컬**이다. 응답은 그 요청을 받은 아이솔레이트 것뿐이므로 **절대 수치로 쓰지 말고 분포·비율의 표본으로만** 쓴다.

런북은 이미 있다 — `docs/CLIENT_API_TRACE_RUNBOOK.md`.

> **보류 항목 (승인 시 재검토)**: `[observability] enabled = true`. 이게 없으면 아래 모든 로그가 `wrangler tail` 이 붙어 있던 시간에만 존재한다. Phase 1 에서 재현이 안 잡히면 이 제약이 원인이므로 그때 다시 제안한다.

### Phase 1 — 재현 1건 확보 (HAR + tail 병행)

**목표: 단 하나의 질문에 답한다 — 그 에러의 URL·status·body.code 는 무엇인가.** 이 하나로 후보가 즉시 갈린다:

| 관측 | 확정되는 후보 |
|---|---|
| `/api/payments/single/start` · 409 · body에 `code` 없음 · `{"message":"Duplicate payment key."}` | **A** |
| `/api/payments/prepare` · 409 · `code:"IDEMPOTENCY_CONFLICT"` | **B** |
| `/api/billing/coin-gate` · 409 · `code:"MONTHLY_CREDIT_CONSUME_IN_PROGRESS"` | **C** |
| `/api/payments/prepare` · **503** · `code:"DB_UNAVAILABLE"` · `X-CD-Error-Stage: db` | **E** |

**A. HAR 캡처 (사용자 측)**
1. Chrome DevTools → Network → **Preserve log 체크**
2. 결제 흐름 재현 (409 만 나면 충분 — 실결제 불필요)
3. `Export HAR` 저장
4. 같은 방식으로 **로그아웃 → 즉시 재로그인** 시퀀스도 1건

HAR 에서 볼 것:
- 결제: 결제창 직전 요청의 **URL·status·응답 body 의 `code`**, 응답 헤더 `X-Request-ID`·`X-CD-Error-Stage`·`Server-Timing`, 그리고 **요청 body 의 `requestId` 문자열 형태**(난수형 vs 결정형)
- 로그인: `POST /api/auth/login` 의 `Set-Cookie` **이후 타임스탬프**에 `Set-Cookie: ...Max-Age=0` 를 가진 응답이 있는가. 있으면 그 URL 이 `/api/auth/me`(후보1) / `/api/auth/refresh`(후보2) / `/api/auth/logout`(후보3) 인지로 **즉시 갈린다**
- 콘솔 로그에 `[paid-flow] DUPLICATE_CLIENT_FLOW_BLOCKED` 유무 (후보 D)

**B. `wrangler tail` (개발자 측)**

```bash
wrangler tail --format json | grep -E '\[pay\]|\[worker-route-error\]|\[db-op-timeout\]|reuse_detected'
```

`[pay]` 한 줄(`payments/log.js:71-93`)에 `requestId · route · orderId · status · errorCode · stage · durationMs · mongoOps` 가 다 있다. 집계할 것:

- 라우트별 409/503 비율과 `errorCode` 분포
- **`[pay]` 줄이 아예 없는 결제 실패** → 구 핸들러 = **후보 A 확정**
- 동일 사용자의 409 들이 **같은 `orderId` 마스크값**을 공유하는가 → **후보 B 확정**
- `stage` 라벨(`pg`/`db`/`db-busy`, `errors.js:93-96`)로 503 계층 분해
- `mongoOps` 예산 회귀 (`payments/db.js:79`) — "orders 1회 · confirm cold 3회"

**C. Atlas 측 (읽기만)**
- Query Profiler 를 `MONGO_PAYMENT_APP_NAME="code-destiny-payments"`(`wrangler.toml:141-142`)로 필터 → 결제 부하만 분리
- E11000 로그에서 **인덱스명** 확보 — `merchantUid_1` vs `userId_1_idempotencyKey_1_paymentType_1` → 후보 A/E 구분
- Metrics → Connections 그래프 (톱니=churn, 계단=누수). **M10 의 진짜 제약은 총 연결 1490 이 아니라 신규 커넥션 생성률 노드당 15/s**(`wrangler.toml:109-112`)

**D. 로컬 검증 (실결제 없음)**
```
npm run verify:payment-concurrency-guards
npm run verify:portone-single-payment
npm run verify:auth-session-stability
npm run test:worker:auth-payments
```

**성공 기준**: 후보 A~E, 1~5 중 **어느 것이 실제로 발생 중인지 최소 1건씩 지문으로 확정**. 확정 안 된 후보는 수정하지 않는다.

### Phase 2 — 계측 보강 (Phase 1 이 비면 실행)

| 항목 | 위치 | 변경 |
|---|---|---|
| 서버→PG correlation | `worker/lib/portone.js:147-157` `getPortOneHeaders` | `X-Request-ID` 1줄. 지금은 우리 requestId ↔ PortOne 콘솔 거래를 잇는 키가 **없다** |
| PG 왕복 시간 | `worker/lib/portone.js:159` `requestJson` | 타이머 → `ctx.pgMs` → `[pay].extra`(`log.js:85` 가 이미 받음). 지금 `Server-Timing` 의 `cd` 에 PG 왕복이 섞여 들어가 "순수 CPU" 라는 주석(`payments/index.js:1336`)이 사실과 다르다 |
| E11000 인덱스명 로깅 | `worker/routes/payments.js:5888` | 현재 어느 인덱스가 충돌했는지 구분 없이 같은 메시지 — 디버깅 불가 |

🔴 **결제 감사 로그를 DB 컬렉션으로 만들지 말 것.** 쓰기 1회 = `mongoOps` +1 이고, `payments/db.js:76-78` 이 "예산이 지켜지는지 실측으로 보기 위한 것"이라고 못박은 축이 오염된다. 시계열이 필요하면 Analytics Engine 쪽이 맞다(별도 승인).

---

## 5. 수정 계획 (Phase 1 확정 후 착수)

### P0 — 확정되면 즉시 (동작 변경 최소, 회귀 위험 낮음)

| 수정 | 위치 | 내용 | 대응 후보 |
|---|---|---|---|
| **P0-1** | `worker/routes/payments.js:2275` | `Payment.create` → **upsert + E11000 catch**. `handlePrepare:3673-3701` 의 검증된 패턴을 그대로 이식 (새 코드 아님, **비대칭 해소**) | A |
| **P0-2** | `worker/payments/orders.js:103-141` `createOrder` | 11000 catch 추가 → 기존 문서 재조회 후 멱등 응답. `moonstone.js:122`·`entitlements.js:141`·`webhook.js:137` 과 동일 패턴 | E |
| **P0-3** | `worker/routes/auth.js:3424` | `revokeAllUserRefreshSessions(userId)` → `{ createdBefore: <해당 refresh 토큰의 발급 시각> }`. 로그아웃 경로(`:3566`)와 **동일 가드**를 붙이는 것 | 로그인 2 |
| **P0-4** | `app/_lib/auth-client.ts:374-400` | `AbortController` 도입 — `authGetInFlight`/`refreshInFlight` 에 컨트롤러를 물리고 `clearClientAuthState()` 에서 `abort()`. 늦게 도착하는 401 자체를 없앤다 | 로그인 1 |

### P1 — 구조적 (설계 결정 필요, PR 분리)

| 수정 | 내용 | 대응 |
|---|---|---|
| **P1-1** | `requestId` 조합(`billing-client.ts:2992-3006`)에 **가격 결정 필드**(`mode`·`reportMode`·`categoryKey`·`amountKRW`) 포함 → 가격이 다르면 키도 달라져 priceDrift 자체가 사라짐 | B |
| **P1-2** | `repricePendingOrder`(`orders.js:182-204`)를 **비-PENDING 최종 상태**(paid/failed/cancelled)까지 다루도록 확장 — 최종 상태면 **새 orderId 로 분기**(`deriveOrderId` 에 시도 회차 추가) | B |
| **P1-3** | in-flight 가드 키에서 `requestId` 분리(`:2994`) + **409 실패도 짧은 TTL 로 캐시**(`:2111-2116`) → 409 직후 재클릭 억제 | D |
| **P1-4** | `openPaidFeatureGate`(`:3080`) 난수 생성기와 `resolvePaidFeatureInFlightKey`(`:2968`) **결정 생성기 중 하나로 통일** — 공존 자체가 가드 우회의 뿌리 | D |
| **P1-5** | OAuth `state.jti` **1회용 소비 기록**을 Mongo 에 (isolate-local Map 대체, `auth.js:75`) | 로그인 5 |
| **P1-6** | `isAuthInfraFailure`(`auth.js:2095-2111`) 문자열 매칭 → **에러 코드 기반 판정**. 서버 오류가 "비밀번호 틀림"으로 위장되는 것 차단 | 로그인 4 |
| **P1-7** | `worker/index.js:1362` JSON 파싱 실패 시 **구 핸들러 조용한 폴스루 차단** — 명시적 400 | 신/구 분기 |

### P2 — 정리 (별도 트랙)

- `/single/start` 를 V2 로 컷오버 (P0-1 은 그 전까지의 임시 방어)
- 정적 셸 `index.html` 의 `_logoutRequest` 가 응답을 await 하는지 확인 → 아니면 `auth-store.ts:1128-1129` 와 동일 처리
- `PERSISTED_LOGOUT_SETTLE_CAP_MS`(800) 와 `LOGOUT_TIMEOUT_MS`(3500) 정합 — 캡을 늘리거나 마커를 `keepalive` 경로에서도 정리
- `clearClientAuthState()` 의 `sessionStorage.clear()`(`:385`) → **인증 키만 선택 삭제**. 지금은 `paid-attempt-session` 등 무관한 키까지 날린다

### 각 PR 공통 절차

1. `npm run check:critical` + 해당 `verify:*`
2. `npm run verify:payment-freeze` — `config/payment-freeze.json` 동결 매니페스트 (결제 파일 수정 시 필수)
3. `npm run test:worker:auth-payments`
4. **main 직접 배포 금지** — PR → CI → 머지 = 라이브 (`CLAUDE.md:35`)
5. 배포 후 `/api/health/route-metrics` + `wrangler tail` 로 24시간 관측, 지표 악화 시 즉시 revert

---

## 6. 성공 기준

Phase 0 에서 베이스라인을 찍고 P0 배포 후 재측정한다.

| 지표 | 측정법 | 목표 |
|---|---|---|
| 결제창 발급 요청의 4xx/5xx 비율 | `[pay]` 의 `status` (route=prepare/single-start) | 베이스라인 대비 **90% 감소** |
| `code` 없는 409 (`Duplicate payment key.`) | tail grep | **0건** |
| `DB_UNAVAILABLE` 503 중 Atlas 정상 시각의 건수 | `[pay]` `errorCode`+`stage` × Atlas Metrics | **0건** |
| 재로그인 후 60초 내 `Set-Cookie: Max-Age=0` | HAR / `[client-api-trace]` | **0건** |
| `reuse_detected` 발생 | tail grep | 로그아웃→재로그인 구간 **0건** |
| prepare p95 `durationMs` | `[pay]` | 악화 없음 (회귀 감시) |
| `mongoOps` (orders 1 / confirm cold 3) | `[pay]` | 예산 유지 |

---

## 7. 리스크와 열린 질문

**리스크**
- **P0-2 가 실제로는 P0-1 보다 급할 수 있다.** 사용자가 "409" 라고 인지했지만 결제창 재등장을 유발하는 것은 **503 경로**다(§2-E). Phase 1 전에 순서를 확정하지 않는다.
- **P1-1/P1-2 는 멱등 계약을 바꾼다.** `verify:payment-freeze` 동결 대상이고 2026-08-12 실장애의 재발면이다. 반드시 별도 PR + 스테이징 검증.
- **`ROUTE_METRICS_STATE` 는 아이솔레이트 로컬** — 절대 수치를 SLA 로 쓰면 오판한다.
- **관측 미보존** — `[observability]` 없이 진행하므로 Phase 1 의 tail 창을 놓치면 처음부터 다시다.

**미해결 (별건, 조용히 합치지 말 것)**
`Rules/agent-regression-guard.md` 10항(①단건 ②월정석 ③이용권) vs `CLAUDE.md`/`docs/payment-policy-*.md`(①이용권 ②월정석 ③코인) 충돌. 실제 코드와 `verify:billing-pass-policy`·`verify:checkout-pass-card` 가 강제하는 것은 **이용권 우선**이다. 본 계획은 이 충돌을 건드리지 않는다 — `docs/CONTEXT_AUDIT.md` "Active Document Precedence" 규칙.

**추가 확인 필요 (스테이징 범위 밖)**
- `index.html` — 정적 셸의 `_logoutRequest`, `_cdRunDirectKrwCheckout`. **결제창을 실제로 여는 코드가 여기 있다.** 후보 A/B 중 어느 URL 을 쓰는지가 여기서 결정된다
- `worker/routes/admin.js` — `/api/admin/orders` 의 실제 조회 필드·필터
- 배포 이력상 `AUTH_COOKIE_DOMAIN` 이 켜졌다 꺼진 적이 있는지 (쿠키 중복 → `readCookieFromRequest:2119-2129` 첫 매치 문제)

---

## 8. 다음 액션

1. **[사용자]** HAR 2건 캡처 — 결제 409 재현 1건, 로그아웃→재로그인 1건 (Preserve log 필수)
2. **[사용자]** `[vars]` 3개 추가 PR — 토큰 반드시 동봉
3. **[Claude]** HAR 도착 즉시 §4 판별표로 후보 확정 → P0 범위 확정 → PR 초안
4. **[Claude]** `index.html` 스테이징 후 결제창 발급 URL 확정
