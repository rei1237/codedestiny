---
status: done
updated: 2026-08-16
next: "착수 대상 아님 — `worker/payments/orders.js` 의 `createPayableOrder` 가 이 설계의 현행 구현이다"
---

# P1-2 설계안 — 종료 상태 주문의 409 를 없애는 "시도 회차" 분기

> 🔴 **상태 (2026-08-15 갱신): 이 설계는 이미 착륙했다. 아래는 이력·근거 보존용이다.**
> `worker/payments/orders.js` 의 **`createPayableOrder`** 가 이 문서의 설계를 다른 이름으로 구현한다 —
> `attempt` 스키마 필드 대신 멱등키에 세대를 붙이는 방식(`generationKey` → `` `${key}#${generation}` ``,
> `MAX_ORDER_GENERATIONS = 3`)이라 스키마 추가 없이 같은 결과를 낸다. 재사용 가능 판정은
> `isPayableOrder`(`status === "pending"` 정확 일치)이고, 세대를 다 쓰면 종전대로
> `IDEMPOTENCY_CONFLICT` 로 fail-closed 한다.
> → **아래 "착수 금지"·"보류" 표현은 그 시점의 판단이다. 새로 착수할 것이 아니라 현행 구현을 읽을 것.**

작성 2026-08-15 · **설계만이다. 착수 금지.**
전제 문서: [payment-auth-p0-fixes.md](payment-auth-p0-fixes.md) · [../PAYMENT_AUTH_RELIABILITY_PLAN_2026-08-15.md](../PAYMENT_AUTH_RELIABILITY_PLAN_2026-08-15.md) §2-B · §5

> 🔴 **정정 (2026-08-16): 아래 "후보 B 배제" 판정은 틀렸다.** 배제 근거였던 "자동 복구되므로 B 가 아니다"
> 가 성립하지 않는다 — 셸(`index.html:24350`)과 dp(`js/destiny-profile.js:4222`) **양쪽에** 409
> IDEMPOTENCY_CONFLICT 새-키 1회 재시도가 이미 있어서 **후보 B 도 자동 복구된다**. 이 문서가
> "자력 복구 불가"라고 적은 환경은 실재하지 않았다.
> 실제 원인은 후보 B 였다: 정적 셸 전용 번들이 영구 결정적 `requestId` 를 넘기고
> (`js/saju-engine-tarot-sukuyo-quantum.js:7413`·`:14511`, `js/saju-engine.js:7272`),
> 셸 게이트가 거기서 멱등키까지 파생해(`index.html` `_cdAttemptIdempotencyKey`) 세대가 소진된 뒤부터
> **매 결제가 409 로 시작**했다. 복구가 checkout 왕복 하나를 더 쓰므로 증상은 "PG 결제창이 늦게 뜬다".
> 수정: 게이트 진입 스코프를 멱등키에 곱하고(`js/core/checkout-entry.js` `mintPaymentAttemptScope`),
> 서버는 고정 세대 소진 시 409 대신 난수 세대를 발급한다(`worker/payments/orders.js`).
> 가드: `verify:pg-window-no-conflict` ⑦⑧ · `payments-v2.orders.test.js` T1' ·
> `payments-v2.prepare-conflict.test.js`.

## 🔴 현재 판정: **보류 (착수 대상 아님)** — 2026-08-15 사용자 증상 보고 반영

사용자 보고: **"409·503 둘 다 난다. 모두 간헐적이고, 실패해도 자동으로 복구된다."**

이 형태가 후보 B 를 사실상 배제한다. 후보 B(결정적 requestId + 종료 상태 주문)는 **결정적**이라
같은 사용자·같은 기능이 **매번 같은 409** 에 갇힌다 — 계획서 §2-B 가 "클라이언트 새-키 재시도가 없는
환경은 **자력 복구 불가**"라고 적은 그 성질이다. 간헐적이지도, 자동 복구되지도 않는다.

반면 **레이스성 원인은 정확히 이 형태**다 — 동시 클릭일 때만 터지고(간헐), 재시도하면 문서가 이미
있어 멱등 응답이 나간다(자동 복구):

| 후보 | 증상 일치 | 대응 |
|---|---|---|
| A `/single/start` read-then-create 레이스 → 409 `Duplicate payment key.` | ★★★★★ | **P0-1 수정 완료** |
| E `createOrder` 11000 → 503 오분류 | ★★★★★ | **P0-2 수정 완료** |
| D 클라 in-flight 가드 우회(동시 요청을 만드는 방아쇠) | ★★★★☆ | **미수정 — 아래 참고** |
| B 결정적 키 + 종료 상태 주문 → 영구 409 | ☆☆☆☆☆ (자동 복구와 모순) | 이 문서 |

→ **P1-2 는 지금 고칠 문제가 아니다.** 아래 설계는 나중에 후보 B 의 판별 지문(같은 사용자의 여러
409 가 전부 동일한 `orderId` 마스크값 · 자동 복구 **안 됨**)이 실제로 관측될 때 꺼내 쓴다.

🔴 **대신 다음 순위는 후보 D 다.** A·E 는 레이스의 *결과*를 정직하게 만들 뿐이고, **레이스 자체를
만드는 것은 클라이언트가 같은 순간에 요청을 두 번 보내는 것**이다(`billing-client.ts` 가드 3중이
모두 새는 구멍 — 계획서 §2-D). 간헐 빈도를 실제로 낮추는 것은 P1-3·P1-4 다.

---

## 🔴 착수 전제 (계획서 §5 리스크 그대로)

1. **실측(HAR 1건) 없이 착수하지 않는다.** 멱등 계약을 바꾸는 변경이고 2026-08-12 실장애의 재발면이다.
2. 판별 지문 — 같은 사용자의 여러 409 가 **전부 동일한 `orderId` 마스크값**이면 후보 B 확정이고 이 설계가 필요하다. 마스크값이 매번 다르면 후보 B 가 아니므로 **이 설계는 폐기**한다.
3. **P1-1 을 먼저 검토할 것.** P1-1(클라 `requestId` 조합에 `mode`·`reportMode`·`categoryKey`·`amountKRW` 포함, `billing-client.ts:2992-3006`)은 서버 계약을 건드리지 않고 priceDrift 자체를 없앤다. P1-1 이 통하면 P1-2 가 다루는 잔여 면은 훨씬 좁아진다.
4. 별도 PR · 스테이징 검증 필수.

---

## 1. 남는 409 의 정확한 형태

P0-2(E11000 복구) 이후 `POST /prepare` 의 409 는 **한 갈래**만 남는다.

`deriveOrderId`(`worker/payments/orders.js:83-88`)는 `(userId, idempotencyKey)` 의 순수 파생이고, 클라이언트는 requestId 를 세션 단위로 캐시한다. 따라서 **같은 사용자·같은 기능은 Payment 문서 하나를 영구히 재사용**한다. 그 문서가 한 번 `pending` 을 벗어나면:

```
createOrder upsert 필터 {userId, idempotencyKey, paymentType} → 옛 문서 적중
  → priceDrift/featureDrift 판정 (payments/index.js:788-791)
    → repricePendingOrder CAS {merchantUid, status:"pending"} 불일치 (orders.js:182-204)
      → null → 409 IDEMPOTENCY_CONFLICT (payments/index.js:802)
```

드리프트가 없으면 409 는 안 나지만, **종료된 주문 문서가 새 결제인 척 반환된다.** (지금은 `markOrderPaid` 의 `$nin` 이 `failed` 를 포함하지 않아 우연히 복구되지만, 우연에 기대는 상태다.)

즉 근본 원인은 가격이 아니라 **"멱등키 하나 : 주문 하나"라는 영구 결속**이다.

## 2. 설계 — 종료 상태에서만 시도 회차를 올린다

### 2.1 원칙

멱등이 실제로 막아야 하는 것은 **진행 중인 결제의 중복 생성**(= 이중과금)이다. **이미 끝난 결제의 재시도를 막는 것은 멱등이 아니라 부작용**이다. 그래서 분기 조건을 상태로 정확히 좁힌다.

| 기존 주문 상태 | 처리 | 근거 |
|---|---|---|
| `PENDING` | **종전 그대로** — 같은 문서 재사용, 드리프트면 `repricePendingOrder` | 이중과금 방지의 본체. 절대 건드리지 않는다 |
| `FAILED` · `CANCELLED` | **새 시도 회차 발급** | 돈이 오가지 않은 종료. 재시도는 정당하고 현재 유일한 409 원인 |
| `PAID` | **새 시도 발급 금지** — 기존 already-unlocked 경로로 인계 | 영구 해금 기능이면 정답은 새 주문이 아니라 무료 재열람이다. 여기서 새 주문을 만들면 **이중과금을 우리가 만든다** |
| `REFUNDED` | **범위 밖(P2)** — 종전대로 409 | 환불 검토 중일 수 있다. 보수적으로 둔다 |

🔴 표의 3행이 이 설계에서 가장 중요하다. "종료 상태면 새로 만든다"로 뭉뚱그리면 PAID 가 섞여 들어간다.

### 2.2 식별자

```js
// orders.js — 형식 불변(cd + hex 38 = 40자, PortOne paymentId 제한 안쪽)
export async function deriveOrderId(userId, idempotencyKey, attempt = 0) {
  const key = String(idempotencyKey || "").trim();
  if (!key) throw paymentError("IDEMPOTENCY_KEY_REQUIRED", "…");
  const seed = attempt > 0 ? `${userId}:${key}:${attempt}` : `${userId}:${key}`;
  const hex = await sha256Hex(seed);
  return `cd${hex.slice(0, 38)}`;
}
```

- `attempt = 0` 은 **현재와 바이트 단위로 같은 값**을 낸다 → 기존 주문·정산·관리자 화면 전부 무영향.
- 부분 유니크 `{userId, idempotencyKey, paymentType}`(`models.js:314-318`)를 피하려면 새 문서의 저장 `idempotencyKey` 를 `` `${key}#${attempt}` `` 로 쓰고, 원본을 `idempotencyKeyRoot` 로 함께 저장한다.

### 2.3 흐름 (왕복 비용)

```
① createOrder upsert                        ← 1왕복 (정상 경로 예산 불변)
② 반환 문서 상태 판정 (메모리)
   PENDING  → 종전 경로 (드리프트면 ③ reprice)
   PAID     → 종전 경로 (already-unlocked 인계)
   FAILED/CANCELLED → ④
④ attempt = (doc.attempt || 0) + 1 로 새 문서 upsert   ← +1왕복 (충돌 경로에서만)
```

정상 경로 `mongoOps` 는 1회 그대로다(`payments/db.js:76-78` 카운터가 실측한다). +1 은 "종료된 주문을 재시도하는" 콜드 패스에서만 발생한다.

### 2.4 스키마

`paymentSchema` 에 **추가만** 한다(`models.js` — `notFrozen` 에 "스키마는 추가만 하며" 명시됨).

```js
attempt: { type: Number, default: 0 },
idempotencyKeyRoot: { type: String, default: "", trim: true, index: true },
```

마이그레이션 없음 — 기존 행은 `attempt` 미존재 = 0 으로 읽힌다.

---

## 3. 착수 전 반드시 확인할 것 (원칙 8·9)

`regression-scout` 에이전트로 다음을 전수 추적한 뒤에 코드를 건드린다. **하나라도 미확인이면 착수하지 않는다.**

1. 🔴 **`idempotencyKey` 로 주문을 찾는 소비자 전수** — `#${attempt}` 접미사가 붙으면 그 조회가 조용히 빗나간다. 최소 확인 대상(예비 조사에서 이미 보인 것): `worker/routes/astrology-ai.js:527-528` `hasPaidPayment` · `worker/routes/billing.js:2490-2494` · `worker/routes/admin.js` 주문 조회. **`idempotencyKeyRoot` 로 함께 보게 고치는 것이 이 PR 의 절반이다.**
2. `deriveOrderId` 호출부 전수 — 3번째 인자 없는 호출이 전부 `attempt=0` 으로 남는지.
3. `verify:payment-concurrency-guards` · `verify:portone-single-payment` 가 "멱등키 1 : 주문 1" 을 단언하는지. 단언한다면 **그 가드를 뒤집는 것이 정책 변경**이므로 사용자 승인이 따로 필요하다.
4. `config/payment-freeze.json` — 2026-08-15 실측상 `worker/payments/**` 는 동결 대상이 **아니다**(regions·wholeFiles 어디에도 없음). 그래도 `node scripts/verify-payment-freeze.mjs` 를 돌려 no-op 임을 확인하고 착수한다.

## 4. 이 설계가 만드는 새 위험 (선보고 대상)

- **이중과금 표면이 넓어진다.** 지금은 "멱등키 1 : 주문 1" 이 물리적으로 이중과금을 막는다. 이 변경 후에는 **상태 판정이 유일한 방어선**이 된다. `toOrderStatus`(`orders.js:53-60`)의 레거시 매핑(`success`·`fulfilled` → PAID)이 하나라도 새면 결제된 주문 위에 새 주문이 생긴다. → **`toOrderStatus` 전 분기의 단위 테스트가 이 PR 의 진입 조건이다.**
- **`attempt` 무한 증가.** 실패를 반복하면 회차가 계속 오른다. 상한(예: 5)을 두고 초과 시 종전대로 409 를 내는 편이 안전하다 — 상한이 없으면 클라이언트 루프가 주문 문서를 무한 생성한다.
- **크론·webhook 재생과의 상호작용.** 같은 `idempotencyKeyRoot` 아래 여러 문서가 생기므로, 미지급 주문을 찾는 크론이 **어느 회차를 지급 대상으로 보는지** 명시해야 한다(정답: 문서별로 독립. 지급은 주문 단위이지 키 단위가 아니다). `worker/payments/reconcile.js` 를 함께 읽을 것.

## 5. 검증 (착수 시)

```
npm run verify:payment-concurrency-guards
npm run verify:portone-single-payment
npm run verify:billing-pass-policy
npm run test:worker:auth-payments
npx jest __tests__/worker/payments-v2.orders.test.js __tests__/worker/payments-v2.prepare-compat.test.js
node scripts/verify-payment-freeze.mjs        # no-op 확인
```

추가할 테스트 (재현 → 통과, 원칙 4):

- FAILED 주문 + 같은 멱등키 → 새 merchantUid, 409 아님
- **PAID 주문 + 같은 멱등키 → 새 주문이 생기지 않는다** (이중과금 회귀 가드)
- PENDING 주문 + 같은 멱등키 → 같은 merchantUid (기존 계약 불변)
- `attempt` 상한 초과 → 409
