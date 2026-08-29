---
status: active
updated: 2026-08-15
next: "\"아직 안 본 파일\" 절의 파일부터 연다 — P0-1·P0-2·P1-2 는 이미 착륙했고 나머지가 미착수다"
---

# 인수인계 — 결제 409/503 · 재로그인 실패 P0 수정

작성 2026-08-15 · **이 문서만 읽고 시작할 수 있게** 쓴 것이다.
배경 조사 전문은 [docs/PAYMENT_AUTH_RELIABILITY_PLAN_2026-08-15.md](../PAYMENT_AUTH_RELIABILITY_PLAN_2026-08-15.md).

> 🔴 **2026-08-15 후속 갱신 — 아래 "미검증"·"보류" 표기는 그 시점의 상태다.**
> - P0-1·P0-2 는 `fix/payment-duplicate-key-503`, P0-3·P0-4a 는 `fix/auth-logout-relogin-race` 로
>   **검증까지 마치고 PR 로 나갔다.** 이 문서를 근거로 다시 착수하지 말 것.
> - **P1-2 는 보류가 아니라 이미 착륙했다** — `worker/payments/orders.js` 의 `createPayableOrder`
>   (세대 멱등키 방식). 상세는 [p1-2-order-attempt-branch.md](p1-2-order-attempt-branch.md) 머리말.
> - 아직 안 한 것: P0-1 의 `withMongoRetry` 래핑 · P0-4b(클라 abort) · P0-4c · P1-1·P1-3·P1-4 · `[vars]` 3개.

## 상태

- 조사: **완료** (원인 코드 확정, 인용 포함)
- 실측(Phase 1): **미실행** — HAR·`wrangler tail` 캡처 안 됨
- 코드 수정: **미착수** — 클라우드 세션에 셸이 없어 `git`/`lint`/`typecheck`/`verify:*` 를 못 돌렸다
- 사용자 승인: PR **2개로 분리** · wrangler.toml 은 **`[vars]` 추가만**

🔴 **아래 어떤 항목도 "완료"로 적지 말 것.** 전부 미착수다.

### 2026-08-15 갱신 — PR ① 착수함 (아직 미검증)

- 사용자 증상 보고: **"409·503 둘 다 난다. 모두 간헐적이고 실패해도 자동 복구된다."**
  → 레이스성 원인(후보 A·E) 확정적. 영구 409 인 후보 B 는 배제 → [P1-2 는 보류](p1-2-order-attempt-branch.md).
  → **다음 순위는 후보 D**(클라 in-flight 가드 우회 = 레이스를 만드는 방아쇠, 계획서 §2-D).
- **P0-2 코드 수정함** — `worker/payments/orders.js` `createOrder` 11000 복구.
- **P0-1 코드 수정함** — `worker/routes/payments.js` `handleSinglePaymentStart` upsert + 11000 복구.
- **범위 추가**: `worker/payments/passes.js` `createPassOrder` 에 **동일 결함**이 있어 함께 고침(사용자 승인).
- **의도적 미이행**: P0-1 을 `withMongoRetry` 로 감싸는 것은 **하지 않았다.** 감싸면
  `scripts/verify-portone-single-payment-regression.mjs` 가 Mongo 없이 도는 스크립트라 `connectDb` 에서
  죽는다. DB 지연발 503 은 레이스와 **별개 축**이므로 검증 배관과 함께 별도 PR 로 간다.
- **`config/payment-freeze.json` `maxLines` 5916 → 5950** (`worker/routes/payments.js`). 가드 문서가 지정한
  `--update` 경로이며, 가드가 요구하는 "신규 구현에도 같은 변경이 필요한가" 확인은 통과다 —
  V2 `worker/payments/orders.js` 에 같은 복구를 **같은 PR 에** 넣었다.
- 🔴 셸이 없어 `lint`·`typecheck`·`verify:*` 를 **하나도 못 돌렸다.** 전부 미검증.

### 2026-08-15 갱신 ② — PR ② 도 착수함 (아직 미검증)

- **P0-3 은 이 문서의 처방(`createdBefore`)을 쓰지 않았다.** 조사 결과 그 기준은 **공격자 세션을 정확히
  면제한다** — 훔친 토큰 T(t0) 로 공격자가 t1 에 세션을 만들면, "t0 이전만 폐기"가 그 세션을 살린다.
  탐지의 의미가 뒤집힌다. 대신 **`replacedByTokenHash` 판별**을 쓴다(사용자 승인):
  회전만 그 필드를 기록하고(`auth.js:3500-3503`) 로그아웃·탈퇴는 `""` 로 남기므로,
  **회전으로 죽은 토큰의 재생만 재사용**으로 보고 전 세션을 폐기한다. 진짜 탈취는 종전 그대로다.
- **`:3433`(UA 불일치)도 완화**(사용자 승인) — 제시된 토큰은 회전 선점(`:3373-3377`)에서 **이미 revoked**
  이므로 전 세션 일괄 폐기는 무력화에 불필요하고, 정당한 브라우저 업데이트에서 다른 기기만 끊었다.
- **문서에 없던 구멍을 하나 더 막았다** — 폐기를 건너뛰어도 `clearAuthCookies` 가 그대로 돌면 늦게
  도착한 응답의 `Set-Cookie` 가 새 세션 쿠키를 지워 **결국 튕긴다.** 낡은 토큰 분기에서는 쿠키도
  지우지 않는다.
- **P0-4a 완료** — `handleMe` 의 `unauthenticatedJson` 에서 `clearAuthCookies` 제거.
  전 3면(소스·`__tests__`·`scripts/verify-*`) 조사 결과 **의존처 0**. 덤으로 확인된 것: 이 삭제는
  `authFetch` 의 `retryOn401 → refresh` 회복 경로가 **자기 refresh 쿠키를 잃어** 확정 실패하던
  자기무력화도 함께 없앤다.
- **P0-4b(클라 abort)는 의도적으로 보류.** 4a + P0-3 으로 쿠키를 지우는 주체 자체가 사라져 실익이
  거의 없고, 전역 AbortController 레지스트리는 공유 GET 취소 시맨틱(`auth-client.ts:574` 주석)을
  건드리는 핫패스 회귀 위험이 있다. P0-4c 는 문서대로 별건(P2).
- 가드 추가: `scripts/verify-auth-p0p1-regression.mjs` 에 P0-3·P0-4a 정적 단언 5개.
  회귀 테스트 3건: `__tests__/worker/auth.refresh-reuse-grace-window.test.js`.

---

## 사용자가 이미 승인한 범위

1. P0 4건 수정 진행
2. PR 2개 분리: `fix/payment-duplicate-key-503`(P0-1·P0-2) / `fix/auth-logout-relogin-race`(P0-3·P0-4)
3. `[vars]` 3개 추가 (`WORKER_ROUTE_METRICS` · `WORKER_ROUTE_METRICS_TOKEN` · `WORKER_CLIENT_API_TRACE`) — 🔴 토큰 반드시 동봉, `worker/index.js:400-408` 게이트가 fail-open
4. `[observability]` · Analytics Engine 은 **보류** (재승인 필요)

사용자 코멘트: **"503은 고질적인 문제였다."** → P0-2 가 체감 우선순위 1위다.

---

## PR ①  `fix/payment-duplicate-key-503`

### P0-2 (최우선) — `createOrder` 의 E11000 이 503 `DB_UNAVAILABLE` 로 오분류된다

**파일** `worker/payments/orders.js:92-143` `createOrder`

**현상 경로 (코드 확인됨)**
`createOrder` 의 upsert 에 11000 catch 가 없다 → `errors.js:132-145` `classify` → `11000` 은 `PERMANENT_MONGO_ERROR_CODES`(`worker/lib/http.js:191-199`)에 **없음** → `error.name === "MongoServerError"` 가 `/^Mongo/`(`http.js:233`)에 매치 → `isDbUnavailableError = true` → **503 + `Retry-After: 2`**(`errors.js:94`) → 클라 `billing-client.ts:2047` 의 `status >= 500` 폴백 발동 → **결제창 재등장**.

즉 Atlas 는 멀쩡한데 중복키가 DB 장애로 둔갑한다. **"M10 스펙상 일어날 수 없다"는 사용자 판단이 정확히 이것을 가리킨다.**

**수정 방침** — 같은 레포에 정본 패턴이 3개 있다. 새로 설계하지 말고 그대로 따른다: `moonstone.js:122` · `entitlements.js:141` · `webhook.js:137`.

```js
// worker/payments/orders.js — createOrder 의 findOneAndUpdate 를 try 로 감싼다
  let result;
  try {
    result = await db.findOneAndUpdate(Payment, filter, update, { upsert: true, returnDocument: "after" });
  } catch (error) {
    // 동시 요청의 패자. merchantUid unique 와 {userId,idempotencyKey,paymentType} 부분 유니크
    // 두 면 모두에서 날 수 있다(위 deriveOrderId 주석의 "가드가 2중"). 승자의 문서를 그대로
    // 돌려주는 것이 멱등 계약이다 — 이것을 잡지 않으면 classify 가 11000 을 DB 장애로 오인해
    // 503 을 내고, 클라 폴백이 결제창을 다시 연다.
    if (Number(error?.code) !== 11000) throw error;
    result = null;
  }
  let order = unwrap(result);
  if (!order) {
    order = unwrap(await db.findOne(Payment, {
      userId: uid,
      paymentType,
      $or: [{ merchantUid: orderId }, { idempotencyKey: String(idempotencyKey).trim() }],
    }));
  }
  if (!order) throw paymentError("INTERNAL_ERROR", "주문을 생성하지 못했습니다.", { orderId });
  return order;
```

🔴 **확인할 것 (내가 검증 못 함)**
- `payments/db.js` 의 `makeCountingDb` 에 `findOne` 래퍼가 실제로 있는지. 없으면 시그니처를 맞추고, **재조회 1왕복이 `mongoOps` 예산에 추가된다는 사실을 로그 주석에 남길 것** (`payments/db.js:76-78` — 예산은 실측 축이다). 재조회는 **11000 이 난 경우에만** 도는 콜드 패스이므로 정상 경로 예산은 불변임을 명시.
- 반환 `order` 를 호출부(`payments/index.js:788` priceDrift 판정)가 그대로 쓸 수 있는 형태인지.

**회귀 위험 (원칙 7 — 선보고 대상)**: `createOrder` 는 단건·이용권·구독 prepare 가 공유한다. 재조회가 **다른 상태의 주문**을 물어올 수 있고, 그 경우 `payments/index.js:788-807` 의 priceDrift 판정으로 흘러가 **409 IDEMPOTENCY_CONFLICT** 가 된다 — 이건 503보다 정직한 결과지만 P0-2 만으로는 409 가 남는다는 뜻이다. **P1-2 없이는 완치가 아니다.** 사용자에게 이 점을 먼저 알릴 것.

**검증**
```
npm run verify:payment-concurrency-guards
npm run verify:portone-single-payment
npm run test:worker:auth-payments
node scripts/verify-payment-freeze.mjs --update   # 🔴 결과물을 같은 커밋에
```

### P0-1 — `/single/start` 에 E11000 복구가 없다 (형제 경로와 비대칭)

**파일** `worker/routes/payments.js:2225-2318` `handleSinglePaymentStart`

**현상**: `:2225-2231` `Payment.findOne` (읽기) → `:2275-2279` `Payment.create` (쓰기, upsert 아님, catch 없음). 두 요청이 동시에 null 을 보면 둘 다 create → 진 쪽 E11000 → 라우터 catch-all `:5888-5890` → `{"message":"Duplicate payment key."}` **409, `code` 필드 없음**.

**정본 패턴이 같은 파일에 있다** — `handlePrepare` `:3660-3701`:
- `$setOnInsert` 에서 필터 3키를 구조분해로 제거 (`:3673` — Mongo 가 필터 등식을 삽입 문서에 적용하므로 충돌)
- `findOneAndUpdate({userId, idempotencyKey, paymentType}, {$setOnInsert}, {upsert, new, includeResultMetadata, sort:{createdAt:-1}})`
- `lastErrorObject.updatedExisting === false` 로 신규 여부 판정
- catch 에서 `Number(error?.code) !== 11000` 이면 rethrow, 아니면 재조회 후 `buildIdempotentResponse`
- **전부 `withMongoRetry(env, ...)` 로 감쌀 것** — `:3676` 주석: 이 세 호출만 retry 없이 나가서 DB 일시 지연이 그대로 503 이 됐던 이력

**수정 방침**: `:2224-2273` 의 기존 `if (idempotencyKey) { findOne ... }` 블록에서 충돌 판정부를 `buildSingleIdempotentResponse(existing)` 함수로 추출한 뒤(멱등 재요청 경로와 E11000 복구 경로가 **같은 판정**을 써야 한다 — `:3598` 주석), create 를 upsert + catch 로 교체한다.

🔴 **주의 — `idempotencyKey` 가 빈 경우 upsert 금지.** `:3695-3697` 주석: 유니크 부분 인덱스는 `idempotencyKey: ""` 를 덮지 않으므로 그 사용자의 키 없는 모든 prepare 가 한 문서로 접힌다. `handlePrepare` 처럼 분기할 것.

🔴 **`merchantUid` 는 여기서 `buildSinglePaymentId(auth.userId)` 랜덤이다**(`:2274`). upsert 로 바꾸면 패자가 만든 랜덤 uid 가 버려진다 — 응답의 `paymentId`·`redirectUrl` 을 **반드시 승자 문서의 `merchantUid` 로 다시 계산**할 것(`buildSinglePaymentRedirectUrl` 재호출). 이걸 놓치면 사용자가 존재하지 않는 주문으로 PG 창을 연다.

**검증**: P0-2 와 동일 세트 + `npm run verify:test-account-payment-flow`

---

## PR ②  `fix/auth-logout-relogin-race`

### P0-3 — 재사용 탐지가 재로그인 세션까지 폐기한다

**파일** `worker/routes/auth.js:3424` (그리고 `:3433` 도 같은 결함)

```js
// :3424  — 옵션 없음 → {userId, revokedAt:null} 전체 폐기
await revokeAllUserRefreshSessions(userId);
```

`revokeAllUserRefreshSessions`(`:2175-2185`)는 옵션이 없으면 **방금 재로그인으로 만든 세션까지** 폐기한다. **로그아웃 경로(`:3566`)는 `{ createdBefore: revokedBefore }` 가드를 쓴다 — 비대칭이 결함이다.**

**수정**: `:3424`·`:3433` 을 `{ createdBefore: <이 refresh 요청이 제시한 토큰의 발급 시각> }` 으로 바꾼다. 그 시각은 `priorSession?.createdAt` 에서 얻는다 (`models.js:472` `timestamps: true` 확인됨). `priorSession` 이 없으면(문서 자체가 없음) 종전대로 옵션 없이 — 그때는 보수적으로 전부 끊는 것이 맞다.

**회귀 위험 (선보고)**: 이 완화는 **진짜 토큰 탈취 시 공격자가 만든 세션이 살아남을 수 있다**는 뜻이다. `createdBefore` 기준시각을 "제시된 토큰의 발급 시각" 으로 잡으면 그 이후 생성된 세션(= 정당한 재로그인 **또는** 공격자 세션)이 남는다. 보안 트레이드오프이므로 **사용자에게 먼저 알리고 승인받을 것.** 대안: `createdBefore` + "같은 UA/IP 가 아닌 세션은 폐기" 조합.

**검증**
```
npm run verify:auth-session-stability
npm run verify:auth-changed-coverage
npm run test:worker:auth-payments
npm run test:auth-session
```

### P0-4 — 늦게 도착한 401 의 `Set-Cookie: Max-Age=0` 이 새 세션을 지운다

증상은 `app/_lib/auth-store.ts:1119-1125` 주석에 문자 그대로 기록돼 있다. 방어(`await logoutWithServer`)는 **React 경로에만** 적용됐다.

🔴 **처음 계획한 "클라이언트 AbortController" 는 단독으로는 근본 수정이 아니다.**
`Set-Cookie` 적용은 브라우저가 한다. 응답 헤더가 이미 도착했으면 abort 해도 쿠키 자ar 는 이미 바뀐 뒤다. **창을 좁힐 뿐 닫지 못한다.** 그래서 순서를 바꾼다.

**P0-4a (서버 · 결정적 · 우선)** — 읽기 전용 401 이 쿠키를 지우지 않게 한다

`worker/routes/auth.js:3066-3070` `handleMe` 의 `unauthenticatedJson()` 이 `clearAuthCookies(res, request, env)` 를 부른다. **GET `/api/auth/me` 가 세션 상태를 변이시킬 이유가 없다.** `:3157-3164`(TokenExpired/JsonWebTokenError 분기)도 같다.

→ `handleMe` 의 두 경로에서 `clearAuthCookies` 호출을 제거한다. 세션 종료 의도가 있는 `logout` 과 재사용을 탐지한 `refresh` 만 쿠키를 지운다.

🔴 **착수 전 필수** — `deletion-auditor` / `regression-scout` 에이전트로 다음을 확인할 것 (원칙 8·9):
- `/api/auth/me` 의 쿠키 삭제에 **의존하는** 클라이언트·테스트·`verify:*` 가 있는가 (3면 grep: 소스 + `__tests__/` + `scripts/verify-*`)
- 특히 `verify:auth-changed-coverage`·`verify:auth-session-stability` 가 이 동작을 단언하는지
- 제거 시 **만료된 access 쿠키가 더 오래 남는다.** `auth-store` 의 `handleSessionInvalidated` 가 로컬 상태로 이미 처리하는지 확인 — 하고 있으면 실해는 없다

**P0-4b (클라이언트 · 심층방어 · 후순위)** — `clearClientAuthState()` 에 abort 추가

`app/_lib/auth-client.ts:374-377` 은 지금 참조만 버린다:
```ts
refreshInFlight = null;
authGetInFlight.clear();
```
`authGetInFlight`(`:41`)에 프로미스와 함께 `AbortController` 를 담고 `clear()` 전에 `abort()` 를 돈다. `performAuthFetch`/`fetchAuthRequest`(`:517-533`)에 이미 컨트롤러가 있으니 **새로 만들지 말고 그것을 맵에 올려 재사용**할 것 — 🔴 **원칙 6(중첩 사전검사)**: 타임아웃 컨트롤러가 이미 있는 자리에 두 번째 컨트롤러를 감싸지 말 것.

**P0-4c (별건, 같은 PR 에 넣지 말 것)** — `clearClientAuthState()` 의 `sessionStorage.clear()`(`:385`)가 `paid-attempt-session` 등 무관한 키까지 날린다. 인증 키만 선택 삭제로. P2 트랙.

---

## 착수 순서

1. `git switch -c fix/payment-duplicate-key-503`
2. **P0-2 먼저** (사용자 체감 1순위) → P0-1
3. `npm run lint` → `npm run typecheck` → 위 `verify:*` → `node scripts/verify-payment-freeze.mjs --update`
4. `git diff --name-only` 로 범위 확인, `git diff --numstat` 로 대량 변경 없는지 → 변경 파일만 `git add` → Conventional Commits → push → PR
5. 별도 브랜치로 PR ② 동일 절차
6. `[vars]` 3개는 **세 번째 작은 PR** 로 분리 (배포 검증이 다르다)

🔴 **`main` 직접 작업·직접 배포 금지. 머지는 사용자가 한다.**

---

## 실측이 아직 안 됐다는 사실

P0 4건은 전부 **코드로 확인된 결함**이라 실측 없이 고쳐도 되는 것들이다(고치면 나빠질 여지가 없는 비대칭·누락 복구). 다만:

- **어느 것이 실제 운영 장애의 주범인지는 아직 모른다.** 배포 후 효과 측정을 위해 `[vars]` PR 을 먼저 머지해 베이스라인을 잡는 편이 낫다.
- P1(결정적 requestId 구조 개선)은 **실측 없이 착수하지 말 것** — 멱등 계약을 바꾸는 변경이고 2026-08-12 실장애의 재발면이다.
- 판별표는 계획 문서 §4 에 있다. HAR 1건이면 후보가 즉시 갈린다.

## 아직 안 본 파일 (다음 세션이 먼저 열 것)

- `index.html` (2.6MB 정적 셸) — **결제창을 실제로 여는 `_cdRunDirectKrwCheckout`·`__cdPaidFeatureGate` 와 `_logoutRequest` 가 여기 있다.** P0-1 이 실제로 타는 경로인지가 여기서 결정된다
- `worker/routes/admin.js` — `/api/admin/orders` 조회 필드
- `app/hooks/useCoinGate.ts` — 스테이징만 하고 안 읽음. 결제 트리거의 StrictMode 이중 effect 여부
