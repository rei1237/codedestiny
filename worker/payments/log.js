/**
 * 결제 컨텍스트의 **로그 한 줄**. 형식도 하나, 방출기도 하나.
 *
 * 구 결제 코드는 logPaidAccessStage · logBillingRouteError · console.error 가 제각각 다른 필드를
 * 찍어서, "결제 503 이 어느 계층에서 몇 % 나는가" 같은 질문에 답하려면 매번 새로 grep 을 짜야 했다.
 * 여기서는 모든 결제 요청이 성공·실패 무관하게 **정확히 한 줄**을 남기고, 그 줄의 키가 고정이다.
 *
 * 개인정보는 넣지 않는다 — 전화번호·카드번호·이메일·이름·생년월일은 어떤 필드로도 들어오면 안 된다.
 * 식별자는 상관관계 추적에 필요하므로 남기되 레포 기존 관례(maskSajuUnlockLogId)대로 뒤 8자만 남긴다.
 */

/** 뒤 8자만. 로그끼리 잇기에는 충분하고, 통째로 유출되지는 않는다. */
export function maskId(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return text.length <= 8 ? text : `...${text.slice(-8)}`;
}

/* 로그에 절대 실리면 안 되는 키. 호출부가 실수로 넘겨도 여기서 떨어뜨린다 —
   "안 넣기로 했다"는 약속보다 "넣어도 안 나간다"는 구조가 낫다. */
const FORBIDDEN_KEYS = Object.freeze([
  "phone", "phonenumber", "tel", "mobile",
  "email", "useremail",
  "name", "username", "customername",
  "card", "cardnumber", "cardno", "pan", "cvc", "birth", "birthdate", "birthday",
]);

/* 값 하나를 로그에 실을 수 있는 형태로. 실패해도 절대 던지지 않는다 —
   순환 참조·getter throw 같은 입력 하나 때문에 결제 요청이 죽으면 안 된다. */
function safeValue(value) {
  if (typeof value !== "object") return value;
  try {
    return JSON.stringify(value).slice(0, 200);
  } catch {
    return "[unserializable]";
  }
}

function stripForbidden(extra) {
  if (!extra || typeof extra !== "object") return {};
  const out = {};
  try {
    for (const [key, value] of Object.entries(extra)) {
      if (FORBIDDEN_KEYS.includes(key.toLowerCase())) continue;
      if (value === undefined || value === null || value === "") continue;
      out[key] = safeValue(value);
    }
  } catch {
    // Object.entries 조차 실패하는 프록시 등. 부가 정보를 버리고 본 줄은 남긴다.
  }
  return out;
}

/**
 * 결제 요청 한 건의 종결 로그. index.js 의 단일 try/finally 에서만 부른다.
 * @param {object} entry
 * @param {string} entry.route      "POST /api/payments/orders"
 * @param {string} entry.requestId
 * @param {string} [entry.userId]
 * @param {string} [entry.orderId]
 * @param {string} [entry.productId]
 * @param {string} [entry.paymentStatus] PENDING|PAID|FAILED|CANCELLED|REFUNDED
 * @param {string} [entry.pgTransactionId]
 * @param {number} entry.status     HTTP 상태
 * @param {string} [entry.errorCode]
 * @param {string} [entry.stage]    503 계층 라벨
 * @param {number} entry.durationMs
 * @param {number} [entry.mongoOps] 이 요청이 쓴 Mongo 왕복 수 — 예산 회귀를 눈으로 잡는 축
 * @param {object} [entry.extra]
 */
export function logPayment(entry) {
  const payload = {
    requestId: String(entry.requestId || ""),
    route: String(entry.route || ""),
    userId: maskId(entry.userId),
    orderId: maskId(entry.orderId),
    productId: String(entry.productId || ""),
    paymentStatus: String(entry.paymentStatus || ""),
    pgTransactionId: maskId(entry.pgTransactionId),
    status: Number(entry.status || 0),
    errorCode: String(entry.errorCode || ""),
    stage: String(entry.stage || ""),
    durationMs: Number(entry.durationMs || 0),
    mongoOps: Number(entry.mongoOps || 0),
    ...stripForbidden(entry.extra),
  };
  try {
    // 접두사 고정 — `wrangler tail | grep '[pay]'` 하나로 결제 트래픽 전체가 잡힌다.
    console.log("[pay]", JSON.stringify(payload));
  } catch {
    // 진단은 절대 요청 경로를 바꾸지 않는다.
  }
}

export const __paymentLogTestUtils = { stripForbidden, FORBIDDEN_KEYS };
