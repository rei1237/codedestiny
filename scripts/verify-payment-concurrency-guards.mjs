import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

// 결제/락 동시성·부분쓰기 가드 회귀 테스트.
// 대상 결함:
//   F1 웹훅 핸들러가 비-2xx를 반환해도 processed로 마킹돼 PortOne 재전송이 영구 차단되던 문제
//   F2 "processing"에서 죽은 웹훅 이벤트가 재전송 시 중복 취급돼 영구 스킵되던 문제
//   F3 pig-coin 포인트 차감과 PointHistory 기록이 비트랜잭션 2-write라 부분쓰기 시 복구 불가하던 문제
// 회귀 시나리오: 동일 웹훅 2회 처리 / 웹훅·콜백(실패 응답) 재시도 유지 / 트랜잭션 중간 실패 롤백.

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const fortuneSource = readFileSync(resolve(root, "worker/routes/fortune.js"), "utf8");
const paymentsSource = readFileSync(resolve(root, "worker/routes/payments.js"), "utf8");
const billingSource = readFileSync(resolve(root, "worker/routes/billing.js"), "utf8");
const modelsSource = readFileSync(resolve(root, "worker/lib/models.js"), "utf8");
const monthlyCreditStoreSource = readFileSync(resolve(root, "worker/lib/monthly-credit-store.js"), "utf8");

// 멱등 마커를 직접 write하는 소스 전량 — payments.js는 이용권 월정석 구매 경로 제거 후
// 해당 마커를 직접 write하지 않으므로 대상에서 제외한다.
const MARKER_WRITE_SOURCES = {
  "billing.js": billingSource,
  "fortune.js": fortuneSource,
  "monthly-credit-store.js": monthlyCreditStoreSource,
};

const paymentsMod = await import("../worker/routes/payments.js");
const {
  isWebhookEventReclaimable,
  isSuccessfulWebhookResponse,
  WEBHOOK_STALE_PROCESSING_MS,
} = paymentsMod.__paymentsTestUtils;

const billingMod = await import("../worker/routes/billing.js");
const { buildRefundedSpendSourceId } = billingMod.__billingTestUtils;
const { RECENT_CONSUME_REQUEST_ID_CAP } = await import("../worker/lib/models.js");

const now = 1_710_000_000_000;

// ── 시나리오 1: 동일 웹훅 2회 처리 (F2 재클레임 판정) ──────────────────────────
// 첫 웹훅이 방금 "processing"을 삽입한 상태에서 동시에 도착한 두 번째는 재클레임 불가여야 한다
// (진행 중인 처리를 이중 반영하지 않음).
assert.equal(
  isWebhookEventReclaimable({ status: "processing", lastAttemptAt: new Date(now) }, now),
  false,
  "방금 시작된 processing 이벤트는 재클레임되면 안 된다(동시 이중 처리 방지)",
);

// 첫 처리가 isolate kill로 stale "processing"에 멈춘 뒤 PortOne이 재전송하면 재클레임 가능해야 한다.
assert.equal(
  isWebhookEventReclaimable(
    { status: "processing", lastAttemptAt: new Date(now - WEBHOOK_STALE_PROCESSING_MS - 1) },
    now,
  ),
  true,
  "stale processing 이벤트는 재전송 시 재클레임 가능해야 한다(영구 스킵 방지)",
);

// lastAttemptAt 이 없거나 손상된 processing 은 나이를 알 수 없으므로 재클레임 허용(보수적 복구).
assert.equal(
  isWebhookEventReclaimable({ status: "processing", lastAttemptAt: null }, now),
  true,
  "lastAttemptAt 부재 processing 은 재클레임 허용",
);

// 실패 이벤트는 즉시 재처리 가능해야 한다.
assert.equal(
  isWebhookEventReclaimable({ status: "failed", lastAttemptAt: new Date(now) }, now),
  true,
  "failed 이벤트는 재처리 가능해야 한다",
);

// 이미 처리 완료된 이벤트는 절대 재클레임되면 안 된다(진짜 멱등 성공 보존).
assert.equal(
  isWebhookEventReclaimable({ status: "processed", lastAttemptAt: new Date(now - 10 * 60 * 1000) }, now),
  false,
  "processed 이벤트는 재클레임 금지",
);

// ── 시나리오 2: 웹훅·콜백 실패 응답 시 재시도 유지 (F1) ────────────────────────
// 핸들러가 2xx 를 반환할 때만 processed 로 확정, 그 외(4xx/5xx/202)는 processed 로 마킹하지 않아
// PortOne 재전송이 우리 멱등성 계층에서 다시 처리될 수 있어야 한다.
assert.equal(isSuccessfulWebhookResponse({ status: 200 }), true, "200 은 성공");
assert.equal(isSuccessfulWebhookResponse({ status: 201 }), true, "201 은 성공");
assert.equal(isSuccessfulWebhookResponse({ status: 202 }), false, "202(pending)은 processed 확정 금지");
assert.equal(isSuccessfulWebhookResponse({ status: 400 }), false, "400 은 processed 확정 금지");
assert.equal(isSuccessfulWebhookResponse({ status: 404 }), false, "404 는 processed 확정 금지");
assert.equal(isSuccessfulWebhookResponse({ status: 502 }), false, "502(PortOne 조회 실패)는 processed 확정 금지");
assert.equal(isSuccessfulWebhookResponse({}), false, "status 부재는 성공으로 간주 금지");

// handleWebhook 이 성공 여부에 따라 processed/failed 를 분기하는지 소스로 재확인.
assert.match(
  paymentsSource,
  /if \(isSuccessfulWebhookResponse\(response\)\)\s*\{\s*await markPortOneWebhookEventProcessed/,
  "handleWebhook 은 2xx 응답에서만 processed 로 마킹해야 한다",
);
assert.match(
  paymentsSource,
  /\}\s*else\s*\{\s*await markPortOneWebhookEventFailed\(\s*event\b/,
  "handleWebhook 은 비-2xx 응답을 failed 로 마킹해 재시도를 유지해야 한다",
);

// ── 시나리오 3: 트랜잭션 중간 실패 롤백 (F3) ──────────────────────────────────
// 3a. 구현이 차감+이력을 트랜잭션으로 묶고 미지원 시 보상 saga 로 폴백하는지 소스로 확인.
assert.match(
  fortuneSource,
  /runCoinSpendWithTransaction[\s\S]*session\.withTransaction[\s\S]*PointHistory\.create\(\[buildCoinHistoryDoc/,
  "pig-coin 차감은 차감+PointHistory 를 한 트랜잭션으로 묶어야 한다",
);
assert.match(
  fortuneSource,
  /runCoinSpendWithCompensation[\s\S]*compensateCoinDeduct\(\)/,
  "트랜잭션 미지원 환경에서는 보상 saga 로 차감을 되돌려야 한다",
);
assert.match(
  fortuneSource,
  /if \(!isTransactionUnsupported\(error\)\) throw error;\s*coinSpend = await runCoinSpendWithCompensation\(\);/,
  "트랜잭션 미지원 오류에서만 보상 경로로 폴백해야 한다",
);

// 3b. 보상 saga 불변식 자체를 인메모리 페이크로 시뮬레이션: 이력 기록이 실패하면 차감이 원복되고
//     recentConsumeRequestIds 가 해제돼 재시도가 다시 가능해야 한다(구현된 패턴과 동일 구조).
{
  const cost = 3;
  const reqId = "coin:test:req-1";
  const userDoc = { points: 10, recentConsumeRequestIds: [] };

  const fakeUser = {
    async findOneAndUpdate(filter, update) {
      const hasBalance = userDoc.points >= (filter.points?.$gte ?? 0);
      // 구현과 동일하게, 중복 방지는 필터의 $ne 가드가 담당한다($push는 스스로 못 막는다).
      const notConsumed = !userDoc.recentConsumeRequestIds.includes(filter.recentConsumeRequestIds?.$ne ?? reqId);
      if (!hasBalance || !notConsumed) return { lean: async () => null };
      userDoc.points += update.$inc.points;
      // $push + $each + $slice(-N) 의미론을 그대로 재현한다(구현이 $addToSet에서 이걸로 바뀌었다).
      const push = update.$push?.recentConsumeRequestIds;
      if (push) {
        userDoc.recentConsumeRequestIds.push(...(push.$each ?? []));
        if (Number.isFinite(push.$slice)) {
          userDoc.recentConsumeRequestIds = push.$slice < 0
            ? userDoc.recentConsumeRequestIds.slice(push.$slice)
            : userDoc.recentConsumeRequestIds.slice(0, push.$slice);
        }
      }
      return { lean: async () => ({ points: userDoc.points }) };
    },
    async findByIdAndUpdate(_id, update) {
      userDoc.points += update.$inc.points;
      if (update.$pull) {
        userDoc.recentConsumeRequestIds = userDoc.recentConsumeRequestIds.filter((k) => k !== reqId);
      }
      return { catch: async () => {} };
    },
  };
  const fakeHistory = {
    async create() {
      throw new Error("simulated point-history write failure");
    },
  };

  // 구현된 runCoinSpendWithCompensation 과 동일한 순서·형태의 보상 로직.
  const deductFilter = { points: { $gte: cost }, recentConsumeRequestIds: { $ne: reqId } };
  const deductUpdate = {
    $inc: { points: -cost },
    $push: { recentConsumeRequestIds: { $each: [reqId], $slice: -RECENT_CONSUME_REQUEST_ID_CAP } },
  };
  const compensate = async () => {
    await fakeUser.findByIdAndUpdate("u1", {
      $inc: { points: cost },
      $pull: { recentConsumeRequestIds: reqId },
    });
  };

  const user = await fakeUser.findOneAndUpdate(deductFilter, deductUpdate).then((q) => q.lean());
  assert.ok(user, "차감은 먼저 성공한다");
  assert.equal(userDoc.points, 7, "차감 직후 잔액은 7");

  let threw = false;
  try {
    await fakeHistory.create().catch(async (error) => {
      await compensate();
      throw error;
    });
  } catch {
    threw = true;
  }

  assert.equal(threw, true, "이력 기록 실패는 상위로 전파돼야 한다");
  assert.equal(userDoc.points, 10, "보상 후 잔액이 원복되어야 한다(부분쓰기 방지)");
  assert.deepEqual(
    userDoc.recentConsumeRequestIds,
    [],
    "보상 후 requestId 가 해제돼 재시도가 다시 가능해야 한다",
  );
}

// ── 시나리오 4: 단건결제 가격 정합성 (canonical amountKRW) ────────────────────
// resolveSinglePaymentPricing 은 레지스트리 정본 amountKRW 를 우선 사용해야 하며 coinPrice*100
// 하드코딩을 쓰면 안 된다(100의 배수가 아닌 가격에서 반올림 과금 → 다른 경로와 불일치).
assert.doesNotMatch(
  paymentsSource,
  /amountKRW:\s*coinPrice\s*\*\s*100/,
  "단건 가격은 coinPrice*100 하드코딩을 쓰면 안 된다",
);
assert.match(
  paymentsSource,
  /const amountKRW = normalizeKrwAmount\(pricing\.amountKRW\) \|\| calculateKrwAmountFromCoins\(coinPrice\)/,
  "단건 가격은 정본 amountKRW(레지스트리) 우선, 없으면 coin 환산으로 산정해야 한다",
);

{
  const { normalizeKrwAmount, calculateKrwAmountFromCoins } = await import("../worker/lib/billing-policy.js");
  const deriveAmountKRW = (pricing, coinPrice) =>
    normalizeKrwAmount(pricing.amountKRW) || calculateKrwAmountFromCoins(coinPrice);
  // 레지스트리 정본가가 있으면 그대로(100의 배수 아님도 보존).
  assert.equal(deriveAmountKRW({ amountKRW: 990 }, 10), 990, "정본 990원은 990원으로 청구되어야 한다");
  assert.equal(deriveAmountKRW({ amountKRW: 30000 }, 300), 30000, "정본 30000원 보존");
  // 정본가 부재 시에만 coin 환산(1코인=100원).
  assert.equal(deriveAmountKRW({}, 10), 1000, "정본 부재 시 coin*100 환산");
  assert.equal(deriveAmountKRW({ amountKRW: 0 }, 50), 5000, "amountKRW 0 은 coin 환산으로 폴백");
}

// PG 실제 승인액 대조 가드가 유지되는지 확인(서버 저장 amount ↔ PortOne amount.total).
assert.match(
  paymentsSource,
  /portOneAmount !== expectedAmount[\s\S]*?code: "AMOUNT_MISMATCH"/,
  "단건 완료 시 PortOne 실제 승인액이 서버 저장액과 다르면 AMOUNT_MISMATCH 로 차단해야 한다",
);

// ── 시나리오 5: pig-coin 멱등성 키 결정성 (F4) ───────────────────────────────
// requestId 부재 시에도 Date.now() 폴백 금지 — 동시 더블클릭이 서로 다른 키를 얻어 이중 차감되면 안 된다.
assert.doesNotMatch(
  fortuneSource,
  /coinRequestId = requestId \|\| `coin:[^`]*Date\.now\(\)/,
  "coinRequestId 는 Date.now() 로 폴백하면 안 된다(이중 차감 방지)",
);
assert.match(
  fortuneSource,
  /const coinRequestScope = String\(\s*payloadHash \|\| `\$\{categoryKey\}:\$\{subFeatureKey\}:\$\{cost\}`/,
  "coinRequestId 는 요청 내용으로만 파생한 결정적 스코프를 써야 한다",
);

// ── 시나리오 6: 월정석 원장 실패 롤백 안전성 (F5) ────────────────────────────
// 6a. 이용권은 월정석 구매를 지원하지 않으므로 payments.js가 월정석 원장을
//     생성하거나 이용권을 활성화하는 경로를 다시 갖지 않아야 한다.
assert.doesNotMatch(
  paymentsSource,
  /MonthlyCreditLedger\.create\(/,
  "payments.js는 이용권 월정석 구매 원장을 생성하지 않아야 한다",
);
assert.doesNotMatch(
  paymentsSource,
  /monthly-credit membership pass purchase/,
  "payments.js에는 월정석 이용권 구매 경로가 남아 있지 않아야 한다",
);
// 6b. 월정석 이용권 구매 경로가 제거된 뒤, 해당 보상 롤백 패턴도 남아 있지 않아야 한다.
assert.doesNotMatch(
  paymentsSource,
  /User\.updateOne\(\s*\{ _id: auth\.userId, "profileSubscription\.expiresAt": expiresAt \}/,
  "payments.js에는 삭제된 월정석 이용권 구매 롤백 경로가 남아 있지 않아야 한다",
);
assert.doesNotMatch(
  paymentsSource,
  /await User\.findByIdAndUpdate\(auth\.userId, \{\s*\$set: \{ profileSubscription: existingUser\.profileSubscription \|\| \{\} \},\s*\$pull: \{ recentConsumeRequestIds: requestId \},\s*\}\)\.catch/,
  "무조건적 profileSubscription 전체 치환 롤백은 제거되어야 한다",
);

// ── 시나리오 6c: billing.js 월정석 원장 — 환불 후 재구매가 영구 500이 되면 안 된다 ──────────
// 배경: 환불은 원장을 삭제하지 않고 플래그만 찍는데, {userId,type,sourceId} unique 인덱스는 그 플래그를
// 모른다. sourceId를 비워주지 않으면 같은 purchaseId 재구매가 원장 create에서 영원히 E11000 → 500이 되어
// 사용자가 결과를 영영 못 받는다(6a는 payments.js만 검사해 billing.js는 무방비였다).

// 행위: 표식 sourceId 생성기 (소스 정규식보다 강한 계약 고정)
assert.equal(
  buildRefundedSpendSourceId("p1", "64f0a1"),
  buildRefundedSpendSourceId("p1", "64f0a1"),
  "표식 sourceId는 결정적이어야 한다(Date.now 금지 — 재실행/self-heal이 멱등해야 함)",
);
assert.ok(
  buildRefundedSpendSourceId("x".repeat(160), "a".repeat(24)).length <= 180,
  "표식 sourceId는 스키마 maxlength(180)를 넘으면 안 된다(updateOne은 validator를 안 돌려 조용히 드리프트)",
);
assert.notEqual(
  buildRefundedSpendSourceId("p1", "id1"),
  buildRefundedSpendSourceId("p1", "id2"),
  "유일성은 ledgerId가 담당해야 한다",
);
assert.notEqual(
  buildRefundedSpendSourceId("p1", "id1"),
  "p1",
  "표식 sourceId는 원본과 달라야 유니크 키가 실제로 해제된다",
);
assert.notEqual(
  buildRefundedSpendSourceId("x".repeat(300), "idA"),
  buildRefundedSpendSourceId("x".repeat(300), "idB"),
  "180자 절단이 유일성을 깨면 안 된다(ledgerId를 앞에 두는 이유)",
);

// 6c-1. 월정석 차감·이력·원장·권한은 하나의 트랜잭션에서 함께 커밋되어야 한다.
assert.match(
  billingSource,
  /runAtomicMonthlyPayment\(\{[\s\S]{0,1200}?PointHistory\.create\([\s\S]{0,400}?MonthlyCreditLedger\.create\([\s\S]{0,400}?atomicUnlock\(\{ session/,
  "월정석 차감, 이력, 원장, 권한 부여는 하나의 트랜잭션에서 처리해야 한다",
);
// 6c-2. 중복 원장(11000)은 롤백 없이 기존 원장 재사용 (payments 6a와 대칭).
assert.match(
  billingSource,
  /if \(Number\(error\?\.code\) !== 11000\) throw error;[\s\S]{0,600}?readIdempotentSpendResult\(\)/,
  "billing.js도 중복 원장(11000)을 재차감이 아니라 기존 원장 재사용으로 처리해야 한다",
);
// 6c-3. self-heal은 '환불된' 원장만 건드려야 한다 — 미환불 행을 옮기면 유효한 차감의 원장이 유실된다.
assert.match(
  billingSource,
  /releaseRefundedSpendSourceId = async \(\)[\s\S]{0,500}?"metadata\.refundedForUnlockFailure": true/,
  "releaseRefundedSpendSourceId는 refundedForUnlockFailure:true 로 좁혀 미환불 원장을 보호해야 한다",
);
// 6c-4. 원장 write 실패로 보상된 이력도 멱등 가드에서 제외해야 한다(무상 해금 방지, fortune.js와 대칭).
assert.match(
  billingSource,
  /"metadata\.monthlyCreditRefundedForUnlockFailure": \{ \$ne: true \},[\s\S]{0,400}?"metadata\.monthlyCreditRefundedForLedgerFailure": \{ \$ne: true \}/,
  "보상된(ForLedgerFailure) 이력도 제외해야 무상 해금이 안 생긴다",
);
// 6c-5. 환불은 삭제가 아니라 재기입+플래그여야 한다(감사 추적 보존).
assert.doesNotMatch(
  billingSource,
  /MonthlyCreditLedger\.(deleteOne|deleteMany|findByIdAndDelete)/,
  "환불이 원장을 삭제하면 안 된다(감사 추적 보존 — 재기입+플래그로 처리)",
);

// ── 시나리오 7: 멱등 마커 배열 상한 (무한 누적 병목) ──────────────────────────
// recentConsumeRequestIds는 결제 차감 핫패스에서 매 재시도마다 통째로 조회된다. 상한이 없으면
// 무한 누적된다(특히 이용권 무료 통과도 마커를 남겨 지출 없이 커진다).
assert.match(
  modelsSource,
  /export const RECENT_CONSUME_REQUEST_ID_CAP = 200;/,
  "마커 상한은 models.js의 단일 정본(200 — server/routes/fortune.routes.js와 동일)이어야 한다",
);
for (const [label, source] of Object.entries(MARKER_WRITE_SOURCES)) {
  assert.doesNotMatch(
    source,
    /\$addToSet: \{ recentConsumeRequestIds/,
    `${label}: $addToSet은 $slice를 지원하지 않아 상한을 못 건다 — $push+$each+$slice로 전환해야 한다`,
  );
  assert.match(
    source,
    /\$slice: -RECENT_CONSUME_REQUEST_ID_CAP/,
    `${label}: 마커 push에 상한($slice)이 걸려 있어야 한다`,
  );
  // 페어링 락: $push는 스스로 중복을 못 막으므로 짝이 되는 $ne 가드가 반드시 있어야 한다.
  const pushes = (source.match(/\$push: \{\s*recentConsumeRequestIds/g) || []).length;
  const guards = (source.match(/recentConsumeRequestIds: \{ \$ne:/g) || []).length;
  assert.ok(
    pushes <= guards,
    `${label}: 마커 $push(${pushes})마다 $ne 가드(${guards})가 있어야 한다 — 없으면 즉시 이중 차감`,
  );
}
// 파이프라인 경로(이용권 무료 통과)는 업데이트 연산자를 못 써 집계 표현식을 쓴다.
// $setUnion은 순서를 보장하지 않아 $slice(-N)과 조합하면 '최근 N개'가 아니게 된다.
assert.doesNotMatch(
  billingSource.replace(/\/\/[^\n]*/g, ""),
  /\$setUnion/,
  "마커 파이프라인은 $setUnion(순서 미보장)이 아니라 $concatArrays를 써야 한다",
);
assert.match(
  billingSource,
  /\$slice: \[\s*\{\s*\$concatArrays: \[[\s\S]{0,200}?recentConsumeRequestIds[\s\S]{0,200}?-RECENT_CONSUME_REQUEST_ID_CAP/,
  "이용권 무료 통과 파이프라인도 $concatArrays + $slice로 순서 보존 + 상한을 지켜야 한다",
);
// 행위: 상한이 실제로 최고참을 축출하고 최신을 남기며 순서를 보존하는가.
{
  let arr = [];
  for (let i = 0; i < RECENT_CONSUME_REQUEST_ID_CAP + 1; i += 1) {
    arr.push(`req-${i}`);
    arr = arr.slice(-RECENT_CONSUME_REQUEST_ID_CAP);
  }
  assert.equal(arr.length, RECENT_CONSUME_REQUEST_ID_CAP, "상한을 넘겨도 길이는 CAP으로 유지돼야 한다");
  assert.equal(arr[arr.length - 1], `req-${RECENT_CONSUME_REQUEST_ID_CAP}`, "최신 마커가 남아야 한다");
  assert.equal(arr[0], "req-1", "최고참부터 축출돼야 한다(순서 보존)");
  assert.ok(!arr.includes("req-0"), "축출된 최고참은 사라져야 한다");
}

console.log("[verify-payment-concurrency-guards] OK");
