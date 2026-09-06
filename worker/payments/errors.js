/**
 * 결제 컨텍스트의 **단일 오류 분류표**.
 *
 * 이 파일은 결제 컨텍스트에서 503 을 낼 수 있는 유일한 곳이다. 그리고 503 은 정확히 셋뿐이다:
 * PG_UNAVAILABLE · DB_UNAVAILABLE · DB_BUSY. 나머지는 전부 4xx 이거나 500 이다.
 *
 * ## 왜 표인가
 *
 * 구 결제 코드는 호출부마다 상태코드를 직접 골랐고, 그 결과 같은 성격의 실패가 라우트마다 다른
 * 코드로 나갔다. 특히 두 가지가 나빴다:
 *
 *   ① **자기 예산 초과·락 경합처럼 서버가 멀쩡한 실패까지 503** 이었다. 503 은 "의존 서비스가
 *      죽었다"는 뜻인데 실제로는 우리 쪽 동시성 문제라, 클라이언트가 재시도 폭풍을 만들어
 *      admission 포화를 **더** 키웠다(worker/lib/db.js:101-134 의 실측 참고).
 *   ② **돈이 빠진 뒤의 지급 실패가 `503 + retryable:false`** 였다. 503 은 "나중에 다시 오라",
 *      retryable:false 는 "오지 마라" — 클라이언트가 행동할 수 없는 모순이다. 실제 상태는
 *      *서버 정상 + 카드 승인됨 + 주문 PAID 기록됨* 이므로 장애가 아니라 **부작용이 덜 끝난 성공**이고,
 *      그래서 여기서는 오류가 아니라 200 GRANT_PENDING 으로 나간다(orders.js).
 *
 * ## 분류기는 하나다
 *
 * "이 오류가 Mongo 일시 장애인가"의 정의를 여기서 새로 만들지 않는다. db.js 의
 * isTransientMongoError 와 http.js 의 isDbUnavailableError(확정 거부 코드 allowlist 포함)를
 * 그대로 **가져다 쓴다**. 판정기가 여러 벌이 되면 어떤 오류는 어느 쪽에도 안 걸려 500 으로 샌다 —
 * 실제로 worker/index.js 의 인라인 정규식이 op-타임아웃을 놓쳐 그렇게 됐다.
 */
import { isTransientMongoError } from "../lib/db.js";
import { isDbUnavailableError } from "../lib/http.js";

/**
 * code → HTTP 계약. 이 표에 없는 코드는 존재하지 않는 코드다.
 * retryable 은 응답 본문과 Retry-After 헤더를 동시에 결정한다 — 둘이 어긋나면 클라이언트에
 * 정반대 지시를 보내게 되므로 한 곳에서만 정한다.
 */
export const PAYMENT_ERROR_TABLE = Object.freeze({
  // 400 — 요청 자체가 틀렸다. 재시도해도 같다.
  INVALID_REQUEST: { status: 400 },
  IDEMPOTENCY_KEY_REQUIRED: { status: 400 },

  // 401 — 신원이 없다.
  UNAUTHORIZED: { status: 401 },
  WEBHOOK_SIGNATURE_INVALID: { status: 401 },
  // 서명은 맞는데 서명된 시각이 너무 오래됐다. 서명 불일치와 **코드를 나눈다** — 합쳐 두면
  // 다음 사람이 시크릿·서명 알고리즘을 뒤지게 되고, 실제 원인은 시각이라 영영 안 나온다.
  WEBHOOK_TIMESTAMP_STALE: { status: 401 },

  // 400 — 이용권(구독) 요청 검증(구 계약 승계). 전부 "요청이 틀렸다"이지 서버 장애가 아니다.
  INVALID_SUBSCRIPTION_DURATION: { status: 400 },
  INVALID_SUBSCRIPTION_TIER: { status: 400 },
  SUBSCRIPTION_PLAN_MISMATCH: { status: 400 },
  SUBSCRIPTION_PRICE_MISMATCH: { status: 400 },
  SUBSCRIPTION_MONTHLY_CREDIT_UNSUPPORTED: { status: 400 },

  // 402 — 신원은 맞는데 낼 것이 부족하다.
  INSUFFICIENT_MOONSTONE: { status: 402 },

  // 403 — 신원은 맞는데 이 자원에 대한 권한이 없다.
  ORDER_FORBIDDEN: { status: 403 },
  PASS_NOT_APPLICABLE: { status: 403 },
  // 구매 정책 거부(entitlement-policy.validatePurchasePolicy). 구체 사유는 meta.reason 에 싣는다.
  PURCHASE_POLICY_DENIED: { status: 403 },

  // 404 — 대상이 없다.
  PRODUCT_NOT_FOUND: { status: 404 },
  ORDER_NOT_FOUND: { status: 404 },

  // 409 — 대상은 있는데 지금 그 상태에서는 못 한다.
  ORDER_NOT_CONFIRMABLE: { status: 409 },
  DUPLICATE_ORDER: { status: 409 },
  // 구 prepare 계약 승계(컷오버 어댑터): 같은 멱등키의 기존 주문이 현재 가격·기능과 다르다.
  // 클라이언트의 새-키 1회 재시도(index.html `:c<ts>` 키)가 정확히 이 코드에 걸려 있다 —
  // retryable 이 아니다(같은 요청 재전송이 아니라 **새 키**로 다시 와야 풀린다).
  IDEMPOTENCY_CONFLICT: { status: 409 },
  // 활성 이용권 보유 중 하위 등급 구매 — 클라이언트는 409 를 "이미 활성 이용권"으로 안내한다.
  SUBSCRIPTION_DOWNGRADE_BLOCKED: { status: 409 },
  // 아래 셋은 "지금은 안 되지만 곧 된다" — 장애가 아니라 동시성이라 409 이면서 retryable 이다.
  REFUND_IN_PROGRESS: { status: 409, retryable: true },
  // 같은 웹훅 이벤트를 살아 있는 형제가 처리 중 — non-2xx 라야 PortOne 재전송 사다리가 살아 있다.
  WEBHOOK_IN_PROGRESS: { status: 409, retryable: true },
  MOONSTONE_CONTENDED: { status: 409, retryable: true },
  MOONSTONE_IN_PROGRESS: { status: 409, retryable: true },

  // 422 — 형식은 맞는데 PG 가 말하는 사실과 우리 주문이 안 맞는다. 절대 자동 재시도하지 않는다.
  AMOUNT_MISMATCH: { status: 422 },
  // 구 prepare 계약 승계: 클라이언트가 낡은 가격으로 주문을 요청했다(가격 개정 직후 스테일 화면).
  // 400 이다 — 그 금액으로는 어떤 재시도도 성립하지 않고, 화면 갱신이 유일한 해법이다.
  CLIENT_AMOUNT_MISMATCH: { status: 400 },
  CURRENCY_MISMATCH: { status: 422 },
  PAYMENT_ID_MISMATCH: { status: 422 },
  PG_PAYMENT_NOT_PAID: { status: 422 },

  // 500 — 우리 잘못. 재시도해도 같으므로 눈에 띄어야 한다.
  PG_NOT_CONFIGURED: { status: 500 },
  INTERNAL_ERROR: { status: 500 },

  // 503 — 외부 의존이 실제로 응답하지 않는다. 이 셋이 전부다.
  PG_UNAVAILABLE: { status: 503, retryable: true, retryAfterSec: 2, stage: "pg" },
  DB_UNAVAILABLE: { status: 503, retryable: true, retryAfterSec: 2, stage: "db" },
  // admission 포화·waitQueue 대기는 "죽었다"가 아니라 "붐빈다"다. 짧게 다시 오라고 말한다.
  DB_BUSY: { status: 503, retryable: true, retryAfterSec: 1, stage: "db-busy" },
});

/** 결제 컨텍스트가 503 을 낼 수 있는 코드의 전부. 가드가 이 집합을 강제한다. */
export const ALLOWED_503_CODES = Object.freeze(["PG_UNAVAILABLE", "DB_UNAVAILABLE", "DB_BUSY"]);

export class PaymentError extends Error {
  /**
   * @param {string} code PAYMENT_ERROR_TABLE 의 키
   * @param {string} [message] 사용자에게 보일 수 있는 한 줄. 내부 상세는 meta 로 보낸다.
   * @param {object} [meta] 로그·응답 본문에 실을 부가 정보(개인정보 금지)
   */
  constructor(code, message, meta = {}) {
    super(message || code);
    this.name = "PaymentError";
    this.code = PAYMENT_ERROR_TABLE[code] ? code : "INTERNAL_ERROR";
    this.meta = meta && typeof meta === "object" ? meta : {};
  }
}

export function paymentError(code, message, meta) {
  return new PaymentError(code, message, meta);
}

/* Mongo 가 "붐빈다"고 말하는 두 가지. 둘 다 아무것도 쓰지 않은 상태라 재시도가 안전하다.
   db.js:756-758 이 MongoOperationOverloadedError 를 withMongoRetry 재시도에서 **제외**하므로
   여기까지 그대로 올라온다 — 그래서 이걸 DB_UNAVAILABLE 과 구분해 짧은 Retry-After 를 준다. */
function isDbBusyError(error) {
  const name = String(error?.name || "");
  return name === "MongoOperationOverloadedError" || name === "MongoWaitQueueTimeoutError";
}

/**
 * 어떤 throw 든 HTTP 계약으로 접는다.
 * @returns {{ code: string, status: number, retryable: boolean, retryAfterSec: number|null, stage: string|null, meta: object }}
 */
export function classify(error) {
  if (error instanceof PaymentError) return contractFor(error.code, error.meta);

  // 붐빔이 먼저다 — isDbUnavailableError 가 이름 정규식(/^Mongo/)으로 둘 다 삼키기 때문에
  // 순서를 뒤집으면 DB_BUSY 가 영영 나오지 않는다.
  if (isDbBusyError(error)) return contractFor("DB_BUSY");

  // 확정 거부 코드(BadValue/FailedToParse/ConflictingUpdateOperators/DocumentValidationFailure)는
  // isDbUnavailableError 의 allowlist 가 이미 걸러 false 를 준다 → 아래 500 으로 떨어진다.
  // 그게 맞다: 그건 인프라 신호가 아니라 우리 코드 버그다.
  if (isDbUnavailableError(error) || isTransientMongoError(error)) return contractFor("DB_UNAVAILABLE");

  return contractFor("INTERNAL_ERROR");
}

export function contractFor(code, meta = {}) {
  const spec = PAYMENT_ERROR_TABLE[code] || PAYMENT_ERROR_TABLE.INTERNAL_ERROR;
  const resolvedCode = PAYMENT_ERROR_TABLE[code] ? code : "INTERNAL_ERROR";
  return {
    code: resolvedCode,
    status: spec.status,
    retryable: spec.retryable === true,
    retryAfterSec: Number.isFinite(spec.retryAfterSec) ? spec.retryAfterSec : null,
    stage: spec.stage || null,
    meta: meta && typeof meta === "object" ? meta : {},
  };
}

/** 503 응답에만 붙는 진단 헤더. 어느 계층이 냈는지를 tail 없이 가릴 수 있게 한다. */
export function responseHeadersFor(contract) {
  if (contract.status !== 503) return undefined;
  return {
    "X-CD-Error-Stage": contract.stage || "db",
    "Retry-After": String(contract.retryAfterSec ?? 2),
  };
}

export const __paymentErrorTestUtils = { isDbBusyError };
