/**
 * 월정석 차감 증빙 조회 — **레포 유일 정본**.
 *
 * ## 왜 이 파일이 생겼나
 *
 * 월정석의 회계 정본은 `MonthlyCreditLedger` 한 컬렉션이고, 그것을 쓰는 곳도
 * `worker/payments/moonstone.js` 하나다. 그런데 **읽는 곳은 15곳**이었고 전부 각자
 * 쿼리를 손으로 적어 두고 있었다. writer 가 한 번 바뀔 때마다 그중 몇 곳이 조용히
 * 죽었고, 죽은 자리에서는 **월정석이 차감된 사용자가 402(미결제)를 받았다.**
 *
 *   · 2026-08-12 V2 컷오버가 PointHistory 쓰기를 없애고 멱등키를 `sourceId` 로 옮김
 *     → `nakshatra-paid-access.js` 가 스키마에 없는 top-level `requestId` 를 계속 찾음
 *     → 초융합 운세 ₩30,000 실사고 (PR #690 에서 그 파일만 고침)
 *   · 같은 컷오버로 `spendMoonstone` 이 성공 경로에서 `ledgerId: ""` 를 돌려줌
 *     → ObjectId 를 되돌려 받아야 조회하는 구현 3곳(neo-operation-room · astrology-ai ·
 *       nakshatra-ai)이 **항상** 증빙 실패 → 네오 팩폭 전략실 실사고
 *   · `metadata.featureKey` 로 필터하던 3곳(new-year-ai · karma-destiny-ai ·
 *     master-love-codex)은 V2 원장 metadata 에 그 필드가 없어 영영 매치되지 않음
 *
 * 그래서 쿼리를 여기 하나로 모은다. **새 사본을 만들지 말고 여기를 고칠 것.**
 * writer↔reader 왕복 계약은 `__tests__/worker/per-use-proof-roundtrip.test.js` 가 고정한다.
 *
 * ## 🔴 재시도하지 않는다 · 연결하지 않는다
 *
 * 호출부 다수가 이미 `withMongoRetry(env, () => …)` 로 감싸고 `connectDb` 를 먼저 부른다.
 * 여기서 또 감싸면 중첩 재시도(CLAUDE.md 코딩 원칙 6)가 된다. 이 함수는 **순수 조회**다.
 */
import mongoose from "mongoose";
import { MonthlyCreditLedger, User } from "./models.js";

const SPEND = "MONTHLY_CREDIT_SPEND";
const ID_MAX = 180;
/** 토큰 하나가 여러 행에 걸릴 일은 사실상 없지만, 미정산 잔상이 섞였을 때를 위해 몇 줄만 본다. */
const CANDIDATE_LIMIT = 5;

/**
 * 환불·되돌림 표식. 하나라도 true 면 증빙이 아니다.
 * 🔴 이름이 파일마다 갈려 있었다 — 합집합을 정본으로 삼는다. writer 가 안 쓰는 필드라도
 * `$ne: true` 는 항상 참이므로 넣어서 손해가 없고, 빼면 구 환불 행이 증빙으로 되살아난다.
 */
const REFUND_MARKERS = Object.freeze([
  "metadata.refundedForUnlockFailure",
  "metadata.monthlyCreditRefundedForUnlockFailure",
  "metadata.monthlyCreditRefundedForLedgerFailure",
  "metadata.refundedForServiceExecution",
  "metadata.monthlyCreditRefundedForServiceExecution",
  // 라우트 전용 되돌림 표식(love-secret-ai). 합집합이므로 다른 기능에서는 항상 참이다.
  "metadata.refundedForLoveSecretAiFailure",
]);

function clean(value, max = ID_MAX) {
  return String(value ?? "").trim().slice(0, max);
}

function uniqueTokens(tokens) {
  const seen = new Set();
  for (const token of Array.isArray(tokens) ? tokens : [tokens]) {
    const value = clean(token);
    if (value) seen.add(value);
  }
  return Array.from(seen);
}

/**
 * 토큰 하나가 원장에서 나타날 수 있는 모든 자리.
 * `sourceId` 가 V2 정본이고 나머지는 구 `billing.js` 행 호환이다.
 */
function tokenClauses(token) {
  const clauses = [
    { sourceId: token },
    { "metadata.purchaseId": token },
    { "metadata.requestId": token },
    { "metadata.idempotencyKey": token },
    { "metadata.orderId": token },
    { "metadata.ledgerId": token },
    { "metadata.monthlyCreditLedgerId": token },
    { "metadata.pointHistoryId": token },
  ];
  if (mongoose.Types.ObjectId.isValid(token)) clauses.push({ _id: token });
  return clauses;
}

/**
 * 🔴 차감이 실제로 일어났는가 — `settledAt` 단독으로 판정하지 않는다.
 *
 * V2 는 트랜잭션 없이 `예약 → lot 차감 → 정산` 순으로 돈다(worker/payments/moonstone.js).
 * `settledAt` 만 보면 **차감은 끝났는데 정산 write 가 아직 안 내려앉은 창**에서 돈 낸
 * 사용자가 402 를 맞는다 — 크론 settleOrphanSpends 는 5~10분 뒤라 요청 타임라인에 안 맞는다.
 *
 *   1. settledAt 있음               → 정산 완료
 *   2. settledAt 없고 afterBalance 있음 → 구 billing.js 행(settledAt 을 아예 안 쓴다).
 *                                      이 갈래가 없으면 과거 결제 이력이 전부 미정산으로 오판된다.
 *   3. 둘 다 없음                   → 판단 보류. 호출부가 recentConsumeRequestIds 로 확인한다.
 */
function settlementState(row) {
  if (row?.settledAt) return "settled";
  if (Number.isFinite(Number(row?.afterBalance))) return "legacy";
  return "unsettled";
}

function toEvidence(row) {
  const afterBalance = Number(row?.afterBalance);
  return {
    ledgerId: String(row?._id || ""),
    sourceId: String(row?.sourceId || ""),
    // amount 는 **월정석 단위**다(코인이 아니다). 가격 하한을 검사하는 호출부는
    // calculateMembershipCreditCost 로 환산한 값과 비교할 것 — worker/routes/fortune.js 참고.
    amount: Math.max(0, Math.floor(Number(row?.amount || 0))),
    serviceKey: String(row?.serviceKey || ""),
    // 미정산 예약행을 recentConsumeRequestIds 로 인정한 경우에는 없다(정산 전이라 원장에 안 적혔다).
    afterBalance: Number.isFinite(afterBalance) ? afterBalance : null,
  };
}

/**
 * 월정석 차감 증빙을 찾는다.
 *
 * @param {{ userId: any, featureKeys: string[]|string, tokens: string[]|string }} input
 *   userId      — 문자열/ObjectId 모두 가능(mongoose 가 캐스팅한다)
 *   featureKeys — 이 요청이 인정할 기능키(별칭·SERVICE_KEY 포함해서 넘길 것)
 *   tokens      — requestId·idempotencyKey·purchaseId 등 클라이언트가 준 식별자 후보
 * @returns {Promise<{ledgerId:string, sourceId:string, amount:number, serviceKey:string}|null>}
 *   null 은 "증빙 없음"이다. DB 장애는 예외로 던지므로 호출부가 402 가 아닌 503 으로 다뤄야 한다.
 */
export async function findMoonstoneSpendEvidence(_env, { userId, featureKeys, tokens } = {}) {
  const uid = clean(userId, 64);
  const keys = uniqueTokens(featureKeys).map((key) => clean(key, 120)).filter(Boolean);
  const ids = uniqueTokens(tokens);
  if (!uid || !keys.length || !ids.length) return null;

  const refundFilter = Object.fromEntries(REFUND_MARKERS.map((marker) => [marker, { $ne: true }]));
  const rows = await MonthlyCreditLedger.find({
    userId: uid,
    type: SPEND,
    ...refundFilter,
    $and: [
      // 기능 매칭: V2 는 serviceKey 에, 구 billing.js 일부 경로는 metadata.featureKey 에 적었다.
      { $or: [{ serviceKey: { $in: keys } }, { "metadata.featureKey": { $in: keys } }] },
      { $or: ids.flatMap(tokenClauses) },
    ],
  })
    .select("_id amount sourceId serviceKey afterBalance settledAt")
    .sort({ createdAt: -1 })
    .limit(CANDIDATE_LIMIT)
    .lean();

  if (!rows.length) return null;

  const undecided = [];
  for (const row of rows) {
    const state = settlementState(row);
    if (state === "settled" || state === "legacy") return toEvidence(row);
    undecided.push(row);
  }

  // 남은 것은 전부 미정산 예약행이다. 차감의 정본 증거는 사용자 문서의 recentConsumeRequestIds 다
  // — lot CAS 가 차감과 **같은 갱신에서** 넣으므로 둘은 한 세트이고, writer 자신과 크론이 쓰는
  // 판정(moonstone.js readSpendEvidence)과 동일하다. 차감이 없으면 배열에도 없으니 무료 열람은 새지 않는다.
  const user = await User.findById(uid).select("recentConsumeRequestIds").lean();
  const consumed = Array.isArray(user?.recentConsumeRequestIds) ? user.recentConsumeRequestIds : [];
  if (!consumed.length) return null;
  const deducted = undecided.find((row) => consumed.includes(String(row.sourceId || "")));
  return deducted ? toEvidence(deducted) : null;
}

export const __moonstoneSpendProofTestUtils = { settlementState, tokenClauses, REFUND_MARKERS };
