// 이용권 커버로 무료 통과를 내주는 **coin-gate 밖** 경로의 공용 차감 지점.
//
// 왜 필요한가: 이용권 한도 판정 기계(evaluatePassCoverage)와 소비 기계(consumePassCoverage)는
// 이미 완성돼 있지만, 소스 호출부가 worker/payments/index.js 의 이용권 결제 핸들러 하나뿐이었다.
// 그래서 coin-gate 를 거치지 않고 자체 게이트로 이용권 통과를 내주던 경로들
// (worker/lib/nakshatra-paid-access.js 의 4)분기 · worker/routes/master-love-codex.js)에서는
// monthlySpendCoin 이 **한 번도 증가하지 않았다**. 누적이 안 쌓이니 월 누적 한도에 도달하는 것이
// 구조적으로 불가능했고, 그 자리에서 읽던 resolveMonthlySpendQuota 검사는 참이 될 수 없는
// 조건이었으며, 소진 종료(terminatePassOnBudgetExhaustion)도 영원히 트리거되지 않았다.
//
// 🔴 여기서 판정 로직을 새로 만들지 않는다. 정본은 worker/payments/passes.js 하나이고 이 파일은
//    그 정본을 부르는 얇은 어댑터다. 등급·한도·소진 규칙의 사본을 여기 두지 말 것.
//
// 🔴 소진 플래그를 새로 만들지 않는다. consumePassCoverage 가 차감 직후 소진을 판정해
//    expiresAt 을 now 로 당기고, 활성 판정이 전부 expiresAt 을 보므로 하위 게이트가 자동으로
//    전부 닫힌다(passes.js applyBudgetExhaustionTermination 주석).
import { User } from "./models.js";

/* 🔴 정본은 **동적 임포트**로 가져온다. 이 파일을 부르는 nakshatra-paid-access.js 는 라우트 9곳이
   정적으로 물고 있어서, payments/* 를 정적으로 끌어오면 그 그래프(passes → orders → db)가
   통째로 워커 메인 청크에 들어간다(verify:worker-size 예산). worker/index.js 가
   `await import("./payments/index.js")` 로 결제 모듈을 지연 로드하는 것과 같은 이유·같은 형태다. */
function loadPassPolicy() {
  return import("../payments/passes.js");
}

/* worker/payments/db.js 의 makeCountingDb 와 같은 모양의 최소 어댑터.
   이 두 라우트는 결제 컨텍스트(withPaymentDb)를 만들지 않고 mongoose 모델을 직접 쓰므로
   슬롯 부기 없는 얇은 판을 쓴다 — 네이티브 드라이버라 mongoose strict 가 필드를 버리는
   함정을 통과하지 않는다(같은 파일 머리주석의 이유와 동일). */
const nativeDb = {
  updateOne(Model, filter, update, options) {
    return Model.collection.updateOne(filter, update, options);
  },
  findOneAndUpdate(Model, filter, update, options) {
    return Model.collection.findOneAndUpdate(filter, update, options);
  },
};

/**
 * 이용권으로 이 건을 커버하고 **누적 사용량을 실제로 차감**한다.
 *
 * @param {{ user:object, entitlement:object, userId:string, featureKey:string,
 *           requestId?:string, coinCost:number, db?:object }} input
 *   db — 결제 모듈과 같은 모양의 컬렉션 어댑터. 생략하면 위 nativeDb 를 쓴다. 이 인자는
 *        테스트가 인메모리 픽스처(__tests__/fixtures/fake-payment-db.mjs)를 그대로 꽂기 위한
 *        것이고, 라우트는 넘기지 않는다(payments/* 함수들이 db 를 첫 인자로 받는 것과 같은 형태).
 * @returns {Promise<{covered:boolean, reason:string, replayed:boolean, coverage:object, user?:object}>}
 *   covered=false 면 호출부는 결제 인계(402)로 간다. 일시 장애는 여기서 삼키지 않고 **던진다** —
 *   호출부의 기존 catch 가 DB 블립을 503 으로 돌려주는 계약을 지켜야 하기 때문이다.
 *   🔴 절대 catch 해서 covered:false 로 바꾸지 말 것(결제한 사용자를 402 로 잠그는 경로다).
 */
/* 커버 실패 사유 → 402 봉투 코드. 어휘는 V2 봉투(worker/payments/index.js PASS_DECISION_REASONS)와
   같아야 한다 — 클라이언트 판정기 pass-verdict.isMonthlyLimitPayload 가 이 문자열만 보고 "한도 초과"와
   "이용권 없음"을 가르며, 어긋나면 한도 초과가 이용권 상점으로 튕긴다.

   🔴 빈 문자열("")은 **차단하지 말라**는 뜻이다. no_active_pass·invalid_price 는 정본이 이 사용자의
   이용권을 아예 못 보는(= 사이클 키가 없어 예산을 셀 수 없는) 상태라 강제할 한도 자체가 없다.
   이때 호출부는 예전 통과 판정을 그대로 존중하고 차감만 건너뛴다 — 여기서 막으면 정본과
   호출부의 활성 판정이 어긋나는 사용자(예: 취소했지만 만료 전)의 접근을 조용히 뺏는다. */
export function passDenialCode(reason) {
  const key = String(reason || "");
  if (key === "monthly_pass_limit_exceeded") return "MONTHLY_PASS_LIMIT_EXCEEDED";
  if (key === "price_exceeds_pass_limit") return "PRICE_EXCEEDS_PASS_LIMIT";
  // CAS 패배 = 그 사이 예산이 소진됐거나 이용권이 바뀌었다. 커버를 단정하지 않고 결제로 인계한다.
  if (key === "pass_access_conflict") return "PAYMENT_REQUIRED";
  return "";
}

export async function consumePassForFeature({ user, entitlement, userId, featureKey, requestId = "", coinCost = 0, db = nativeDb }) {
  const { buildPassConsumeMarker, consumePassCoverage, evaluatePassCoverage } = await loadPassPolicy();
  const cost = Math.max(0, Math.floor(Number(coinCost) || 0));
  const coverage = evaluatePassCoverage({ user, entitlement, coinCost: cost });
  if (!coverage.covered) {
    return { covered: false, reason: String(coverage.reason || "pass_not_covered"), replayed: false, coverage };
  }

  // 멱등: 같은 (기능, requestId) 재시도가 예산을 두 번 깎지 않는다.
  // 정본과 같은 마커·같은 배열을 쓰므로 coin-gate 경로와도 서로 중복 차감하지 않는다.
  const markers = Array.isArray(user?.recentConsumeRequestIds) ? user.recentConsumeRequestIds : [];
  const marker = buildPassConsumeMarker(featureKey, requestId);
  if (marker && markers.includes(marker)) {
    return { covered: true, reason: "", replayed: true, coverage, user };
  }

  const updated = await consumePassCoverage(db, { userId, coverage, marker, existingMarkers: markers });
  if (!updated) {
    // CAS 패배 = 그 사이 예산이 소진됐거나 이용권이 바뀌었다. 커버를 단정하지 않고 인계한다.
    return { covered: false, reason: "pass_access_conflict", replayed: false, coverage };
  }
  return { covered: true, reason: "", replayed: false, coverage, user: updated };
}
