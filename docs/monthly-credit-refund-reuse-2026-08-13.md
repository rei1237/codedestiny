# 월정석 환불 뒤 재구매 — 얽혀 있는 결함 3건 (2026-08-13)

> PR #577(사주 AI 상담 결제창 무한 재오픈 수정)에서 **의도적으로 분리한** 작업이다.
> 세 결함이 서로를 가리고 있어서 **하나만 고치면 지금보다 나빠진다.** 반드시 한 PR에서 순서대로 처리한다.
>
> 🔴 **줄 번호는 2026-08-13 기준이며 이미 낡았다.** 2026-08-20 실측으로 이 문서의 코드 인용
> 20곳 중 **14곳이 어긋났다**(대조: 작성 시점 커밋 `bcb811b85` ↔ 그날의 `origin/main`).
> 줄 번호가 아니라 **심볼 이름으로 찾을 것.** 같은 날 확인으로 `buildRefundedSpendSourceId` ·
> `releaseRefundedSpendSourceId` · `readIdempotentSpendResult` · `findAIPromptMonthlyCreditEvidence` ·
> `refundedForUnlockFailure` · `MEMBERSHIP_CREDIT_PER_COIN` 은 모두 그대로 있으므로
> **아래 분석과 권장 순서는 여전히 유효하다.** 재측정:
> `git grep -n '<심볼>' -- worker/ lib/ scripts/`

---

## 0. 세 줄 요약

- 월정석으로 결제한 유료 생성이 실패해 **환불되면, 그 차감 기록이 여전히 "결제 증거"로 통과한다** → 사용자는 환불받고도 같은 질문을 무료로 다시 생성할 수 있다(매출 누수).
- 그걸 막으려고 **증빙 조회 필터만 조이면 402 무한 루프**가 된다. 환불된 원장이 유니크 키를 계속 점유해 재결제가 불가능하기 때문이다.
- 따라서 **키를 먼저 풀고(1단계), 그 다음에 필터를 조여야 한다(2단계).** 순서가 뒤바뀌면 사용자가 그 질문을 영영 못 연다.

---

## 1. 지금 실제로 벌어지는 일

사주 AI 상담 기준(다른 월정석 유료 생성도 구조가 같다).

`requestId`는 **질문+도메인에서 결정적으로 파생**되므로(`_sajuPromptBuildCurrentRequestNonce`), 같은 질문은 언제나 같은 `purchaseId`를 만든다. 이게 아래 모든 얽힘의 전제다.

**결제 시점** — `consumeMembershipCreditIfAvailable`([worker/routes/billing.js:1638](../worker/routes/billing.js))

| 대상 | 값 |
|---|---|
| `MonthlyCreditLedger.sourceId` | `R` (= purchaseId = requestId) |
| `MonthlyCreditLedger.serviceKey` | canonical featureKey |
| `MonthlyCreditLedger.metadata.requestId` | `R` |
| `PointHistory` | `kind:"deduct"`, `delta:-200`, 같은 metadata |

**생성 실패 → 환불** — `refundSajuAIPromptMonthlyCredit`([worker/routes/fortune.js:883](../worker/routes/fortune.js))

- 원장에 `metadata.monthlyCreditRefundedForServiceExecution: true` + `metadata.refundedForServiceExecution: true` 표식
- `restoreMonthlyCreditLot`로 월정석 복원
- PointHistory deduct 행에도 같은 표식

**여기서 하지 않는 일이 문제다 — `sourceId`를 비켜 주지 않는다.**

**재시도 시점** — 두 경로 모두 **무료로 통과한다**

| 경로 | 무슨 일이 나는가 |
|---|---|
| 증거가 메모리에 남아 있음 | `/create`로 직행 → `findAIPromptPaymentEvidence`가 **환불된 deduct 행을 그대로 찾아 반환** → 생성 |
| 새 세션(증거 유실) | coin-gate → `readIdempotentSpendResult`가 **환불된 원장을 "이미 결제됨"으로 반환**(재차감 없음) → `/create` → 위와 같이 통과 → 생성 |

`findAIPromptPaymentEvidence`의 환불 무효화 검사([fortune.js:1327](../worker/routes/fortune.js))는 **`kind:"refund"` PointHistory 행**을 찾는데, 월정석 환불은 그런 행을 만들지 않는다(`restoreMonthlyCreditLot`은 lot만 복원한다). 그래서 이 검사는 월정석에 대해 **구조적으로 발동하지 않는다.**

> **현재 교착은 없다.** 사용자 입장에서 기능은 동작하고, 손해 방향도 사용자가 아니라 회사 쪽이다. 그래서 긴급도는 낮지만 방치하면 안 된다.

---

## 2. 왜 하나만 고치면 나빠지는가

| 만약 이것만 고치면 | 결과 |
|---|---|
| **증빙 필터만 조임** (`findAIPromptPaymentEvidence`에 환불 표식 배제 추가) | 증빙 미스 → 402. 재결제하려 해도 coin-gate가 환불된 원장을 "이미 결제됨"으로 되돌려 재차감을 안 한다 → **402 무한 루프. 그 질문은 영영 못 연다.** |
| **멱등 replay 필터만 조임** (`readIdempotentSpendResult`에 표식 배제 추가) | replay가 비켜가 실제 차감 시도 → 같은 `sourceId`로 **E11000**. 복구 경로(3장)가 붙어 있지만 그 복구도 같은 좁은 필터를 쓰므로 키를 못 비운다 → **영구 500.** 이건 코드에 이미 경고로 적혀 있다([billing.js:1630](../worker/routes/billing.js) `buildRefundedSpendSourceId` 위 주석). |
| **키만 비움** (`sourceId` 비켜 주기) | 재결제는 가능해지지만, 증빙 필터가 그대로라 **여전히 무료 통과**한다(환불된 deduct 행이 계속 유효한 증거) → 누수 미해결. |

유니크 인덱스: `{ userId, type, sourceId }` ([worker/lib/models.js:383](../worker/lib/models.js))

---

## 3. 이미 있는 정본 패턴 — 그리고 그것이 못 덮는 범위

키를 비켜 주는 헬퍼와 자가치유 장치가 **이미 존재한다.**

```js
// worker/routes/billing.js:1634
function buildRefundedSpendSourceId(sourceId, ledgerId) {
  return `refunded:${String(ledgerId || "")}:${String(sourceId || "")}`.slice(0, 180);
}
```

```js
// worker/routes/billing.js:1763
const releaseRefundedSpendSourceId = async () => {
  const refundedLedger = await MonthlyCreditLedger.findOne({
    userId: authUserId, type: "MONTHLY_CREDIT_SPEND", sourceId: purchaseId,
    "metadata.refundedForUnlockFailure": true,      // ← 여기가 좁다
  })…
```

**호출부는 E11000 복구 경로다**([billing.js:1917-1929](../worker/routes/billing.js)) — 설계 자체는 정확하다:

```js
try { spendOutcome = await runSpend(); }
catch (error) {
  if (Number(error?.code) !== 11000) throw error;
  const replayed = await readIdempotentSpendResult();
  if (replayed) return replayed;                      // 미환불 원장 = 진짜 재시도
  if (!await releaseRefundedSpendSourceId()) throw error;   // 환불 원장이면 키를 비우고
  spendOutcome = await runSpend();                    // 딱 1회 재시도
}
```

🔴 **문제는 이 구조가 아니라, 두 함수가 "환불"로 인정하는 표식이 좁다는 것이다.** `refundedForUnlockFailure` 하나뿐이고, 그 표식을 쓰는 곳은 두 군데밖에 없다:

- `worker/routes/love-secret-ai.js:1042`
- `worker/routes/naming-prompt.js:1524`

반면 **생성 실패 환불**은 다른 표식을 쓴다:

| 표식 | 쓰는 곳 |
|---|---|
| `metadata.monthlyCreditRefundedForServiceExecution` | `fortune.js:893` (사주 AI 상담) · `service-execution-task.js:728` |
| `metadata.refundedForServiceExecution` | `fortune.js:911` · `service-execution-task.js:741` |

→ **생성 실패로 환불된 원장은 자가치유 대상이 아니다.** 이건 사주만의 문제가 아니라 `service-execution-task`를 쓰는 모든 기능이 공유하는 구멍이다.

참고로 `service-execution-task`의 환불은 `MONTHLY_CREDIT_GRANT` 원장을 새로 만드는 방식이라(`type`이 달라 유니크 키 충돌 없음) 환불 기록 자체는 남지만, **원본 SPEND 행의 `sourceId`는 그대로 점유**한다.

🔴 **그래서 두 필터를 반드시 함께 넓혀야 한다.** 지금은 `readIdempotentSpendResult`가 생성-실패 환불 원장을 "미환불"로 오인해 위 코드 3번째 줄에서 그대로 반환해 버리므로, **키를 비우는 복구 경로에 아예 도달하지 않는다.** 둘 다 넓히면 이 구조가 설계대로 돈다 — 한쪽만 넓히면 2장 표의 사고가 난다.

---

## 4. 권장 수정 순서 (한 PR, 이 순서대로)

### 1단계 — 환불이 유니크 키를 놓게 한다 (**먼저**)

#### 추천 — 환불 쪽에서 `refundedForUnlockFailure` 를 함께 찍는다 (1줄)

**이미 이 레포에 선례가 있다.** `love-secret-ai.js:1036-1046` 은 자기 전용 표식과 함께 `refundedForUnlockFailure` 를 **나란히** 찍는다:

```js
$set: {
  "metadata.refundedForLoveSecretAiFailure": true,
  "metadata.refundedForUnlockFailure": true,   // ← 키 해제 계약에 편입
  "metadata.refundedAt": new Date(),
}
```

즉 이 표식은 이름과 달리 **"이 환불은 유니크 키를 놓는다"는 계약 마커**로 쓰이고 있다. 같은 방식을 사주 환불에 적용한다 — `refundSajuAIPromptMonthlyCredit`([fortune.js:892](../worker/routes/fortune.js))의 `marker` 객체에 한 줄을 더한다:

```js
const marker = {
  "metadata.monthlyCreditRefundedForServiceExecution": true,
  "metadata.refundedForUnlockFailure": true,   // ← 추가
  …
};
```

그러면 나머지는 **손대지 않아도 그대로 돈다**:

- `readIdempotentSpendResult`가 이미 이 표식을 배제 → 환불 원장을 "이미 결제됨"으로 되돌리지 않는다
- `releaseRefundedSpendSourceId`가 이미 이 표식을 인식 → E11000 복구가 키를 비운다
- **5장의 가드 단언을 건드릴 필요가 없다**

`service-execution-task.js:728` 의 환불에도 같은 한 줄을 더하면 그 경로를 쓰는 다른 기능까지 함께 덮인다.

#### 대안 — 두 필터를 함께 넓힌다

표식 이름의 의미가 어긋나는 게 마음에 걸린다면, `readIdempotentSpendResult`(배제)와 `releaseRefundedSpendSourceId`(선택) **양쪽에** 세 표식을 모두 넣는 방법도 있다. 다만 **5장의 가드 단언을 함께 고쳐야 하고**, 두 곳을 동시에 맞춰야 하는 부담이 있어 추천하지 않는다.

🔴 **어느 쪽을 택하든, 배제 쪽만 넓히고 선택 쪽을 빠뜨리면 영구 500이 된다.** 2장 표의 두 번째 행이 정확히 그 경우다. 추천안이 안전한 이유가 이것이다 — 표식 하나를 찍으면 양쪽이 자동으로 같이 움직인다.

🔴 **`releaseRefundedSpendSourceId`의 안전 계약을 깨지 말 것** — 그 필터는 언제나 "환불된 행만" 골라야 한다. 미환불 원장을 옮기면 유효한 차감의 원장이 유실된다.

### 2단계 — 환불된 증거를 증거로 인정하지 않는다

`findAIPromptPaymentEvidence`([fortune.js:1305](../worker/routes/fortune.js))의 쿼리에 표식 배제를 추가한다. 형제 함수 `findAIPromptMonthlyCreditEvidence`가 이미 네 종을 배제하고 있으니 **같은 목록으로 맞춘다**:

```
"metadata.refundedForUnlockFailure": { $ne: true },
"metadata.monthlyCreditRefundedForUnlockFailure": { $ne: true },
"metadata.monthlyCreditRefundedForLedgerFailure": { $ne: true },
"metadata.monthlyCreditRefundedForServiceExecution": { $ne: true },
```

기존 `kind:"refund"` 조회는 **그대로 둔다**(코인/카드 환불은 그 경로로 남는다). 이건 월정석 전용 구멍을 메우는 추가 조건이다.

### 3단계 — 월정석 증빙에도 금액 하한을 건다

`findAIPromptMonthlyCreditEvidence`는 **형제 둘과 달리 금액 검증이 아예 없다.**

| 함수 | 금액 하한 |
|---|---|
| `findAIPromptPaymentEvidence` | `delta $lte -cost` |
| `findAIPromptDirectPaymentEvidence` | `expectedChargedPoints/coinPrice/paymentAmount $gte` |
| `findAIPromptMonthlyCreditEvidence` | **없음** — `cost` 인자를 받지도 않는다 |

즉 같은 사용자의 **더 싼 다른 월정석 차감**이라도 `serviceKey`가 맞고 토큰이 겹치면 200코인 상담 증거로 통과한다. `c6a65842f`(월 한도/쿼터 우회 차단)의 취지와 어긋나는 잔여 구멍이다.

🔴 **단위 주의 — 여기서 가장 사고 나기 쉽다.** 원장의 `amount`는 **월정석 단위**이고 라우트가 들고 있는 `cost`는 **코인 단위**다.

```
MEMBERSHIP_CREDIT_PER_COIN = 10   // worker/lib/billing-policy.js:2
200코인 → amount $gte 2000
```

환산을 틀리면 **정상 결제가 402로 떨어진다**. PR #577이 고친 바로 그 증상을 되살리는 셈이므로, 이 3단계는 1·2단계와 분리해 마지막에 넣고 별도로 검증할 것. 자신이 없으면 3단계는 또 한 번 미뤄도 된다 — 1·2단계만으로 누수는 막힌다.

---

## 5. 함께 고쳐야 할 가드

🔴 `scripts/verify-payment-concurrency-guards.mjs:313-317`이 **현재 필터를 문자열로 고정**하고 있다:

```js
assert.match(billingSource,
  /releaseRefundedSpendSourceId = async \(\)[\s\S]{0,500}?"metadata\.refundedForUnlockFailure": true/,
  "releaseRefundedSpendSourceId는 refundedForUnlockFailure:true 로 좁혀 미환불 원장을 보호해야 한다");
```

**추천안(표식 1줄 추가)을 택하면 이 단언은 그대로 통과한다** — 필터를 안 건드리기 때문이다. 이것이 추천안을 권하는 두 번째 이유다.

대안(필터 확장)을 택하면 이 단언이 깨진다. 그때는 **단언의 문자열이 아니라 의도를 옮겨야 한다** — "미환불 원장은 건드리지 않는다"를 계속 강제하되 세 표식을 모두 허용하도록. 단언을 그냥 지우면 안 된다(그 보호가 이 작업의 핵심 안전선이다).

관련: `scripts/check-monthly-credit-ledger-indexes.mjs`도 `refunded:` 접두를 참조한다 — 영향 여부 확인할 것.

---

## 6. 검증

```bash
npm run verify:payment-concurrency-guards      # 5번 가드 — 반드시 갱신 후 통과
npm run verify:billing-pass-policy
npm run verify:ai-prompt-billing-policy
npm run verify:paid-feature-billing-policy
npm run verify:ai-consultation-flows
npm run test:jest -- __tests__/worker/saju-ai-consultation-stale.guard.test.js
npm run build:worker
```

**재현 시나리오(수동, mock DB 권장)** — 실제 결제·프로덕션 DB 쓰기 금지:

1. 월정석으로 상담 결제 → 원장 `sourceId = R` 확인
2. 생성 실패를 강제 → 환불 표식 + 월정석 복원 확인
3. **같은 질문**으로 재시도 → 기대: 결제창이 정상적으로 열리고, 재결제하면 새 원장이 생기며, 재결제 없이는 통과하지 못한다
4. 3단계까지 넣었다면: 200코인 상담이 2,000 월정석 원장으로 **정상 통과**하는지 반드시 확인(하한 환산 사고 방지)

🔴 **LLM 실호출 금지.** 생성 실패는 mock으로 강제한다(`scripts/verify-workers-ai-fallback.mjs`의 키 제거 방식 참고).

---

## 7. 범위 밖 / 열린 질문

- **`service-execution-task.js`를 쓰는 다른 기능들**도 같은 구멍을 공유한다. 1단계 추천안의 한 줄을 거기에도 넣으면 키 해제는 함께 덮이지만, 각 기능의 **증빙 조회**에 2단계에 해당하는 배제가 있는지는 **개별 확인이 필요하다**. `ziwei-island-ai.js:305`는 이미 `refundedForServiceExecution`을 배제하고 있어 참고가 된다.
- **이미 환불돼 굳어 있는 기존 원장**은 마이그레이션 없이 풀린다 — 1단계가 "재구매 시점에 키를 비우는" 기존 복구 경로를 넓히는 것이라, 그 사용자가 다음에 같은 질문을 결제하는 순간 자동으로 해소된다.
- 이 문서는 **코드를 읽어서** 작성했다. 프로덕션 데이터로 "환불 표식이 붙은 채 `sourceId`를 점유 중인 원장이 실제로 몇 건인지"는 세지 않았다. 착수 전에 그 카운트를 먼저 재면 영향 범위가 분명해진다.
