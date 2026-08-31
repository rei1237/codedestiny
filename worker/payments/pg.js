/**
 * 단계 ③ PG 결제 · ④ 서버 결제 검증. **아무것도 쓰지 않는다.**
 *
 * worker/lib/portone.js 는 config/payment-freeze.json 의 notFrozen 이다(해시 동결 대상이 아니다).
 * 다만 PG credentials·webhook 계약·Idempotency-Key 정규화가 거기 있어 재작성 대상이 아니라
 * 보존 대상이라는 뜻이고, 이 파일은 그 위의 얇은 어댑터로,
 * **PG 가 말하는 사실**과 **우리 주문**을 대조하는 책임만 갖는다.
 *
 * ## 검증은 네 가지 전부가 성립해야 한다
 *
 *   status === "paid"  ∧  paymentId === orderId  ∧  amount === 주문금액  ∧  currency === "KRW"
 *
 * 하나라도 어긋나면 422 다 — 형식은 맞는데 사실이 다르다는 뜻이고, **자동 재시도 대상이 아니다.**
 * 특히 금액 불일치를 재시도 가능으로 두면 클라이언트가 조작한 금액을 반복 제출하게 된다.
 * 반대로 PG 에 **닿지 못한 것**은 사실 불일치가 아니라 의존 장애이므로 503 이다. 이 구분이
 * 이 파일의 존재 이유다.
 *
 * ## raw 응답을 그대로 저장하지 않는다
 *
 * PortOne 응답에는 customer(이름·전화번호·이메일)가 들어 있다. 구 코드는 rawPortOne 에 통째로
 * 넣었는데, 그건 결제 DB 에 PII 사본을 하나 더 만드는 일이다. 여기서는 대조·정산에 필요한
 * 필드만 추린 summary 를 남긴다.
 */
import { fetchPortOnePayment, getPortOneConfig } from "../lib/portone.js";
import { paymentError } from "./errors.js";

/** PG 응답에서 남길 것. 여기 없는 필드는 저장되지 않는다 — 특히 customer 는 통째로 빠진다. */
function summarize(pg) {
  return {
    paymentId: String(pg?.paymentId || ""),
    status: String(pg?.status || ""),
    amount: Number(pg?.amount || 0),
    currency: String(pg?.currency || ""),
    payMethod: String(pg?.pay_method || ""),
    paidAt: pg?.paid_at ? new Date(Number(pg.paid_at) * 1000) : null,
    receiptUrl: String(pg?.receipt_url || "") || null,
  };
}

/* PortOne 호출이 "닿지 못한" 것인지 판정한다. requestJson 은 타임아웃도 HTTP 오류도 전부
   평범한 Error 로 던지므로(worker/lib/portone.js:159-186) 메시지 접두사로 가른다.
   접두사는 fetchPortOnePayment 가 넘기는 상수라 드리프트 위험이 낮다. */
function isPgUnreachable(error) {
  const message = String(error?.message || "");
  return error?.name === "AbortError"
    || /request timed out after/i.test(message)
    || /PortOne payment lookup failed/i.test(message)
    || /PortOne payment response was empty/i.test(message);
}

/** PG 설정이 갖춰져 있는가. 없으면 결제창 자체를 열 수 없다(503 이 아니라 500 — 재시도로 안 고쳐진다). */
export function assertPgConfigured(env) {
  // 키 이름은 portone.js 가 별칭 9군을 흡수해 정규화한 뒤의 것이다(portoneApiSecret / portoneStoreId).
  // env 이름을 여기서 직접 읽지 말 것 — 별칭 처리가 두 벌이 되면 시크릿 이름이 바뀔 때 한쪽만 따라간다.
  const config = getPortOneConfig(env);
  if (!config?.portoneApiSecret || !config?.portoneStoreId) {
    throw paymentError("PG_NOT_CONFIGURED", "결제 설정이 완료되지 않았습니다.", {
      hasApiSecret: Boolean(config?.portoneApiSecret),
      hasStoreId: Boolean(config?.portoneStoreId),
    });
  }
  return config;
}

/**
 * 단계 ④. PG 에 물어 우리 주문과 대조한다. **Mongo 를 건드리지 않으므로 admission 슬롯을 쓰지 않는다.**
 *
 * @param {object} env
 * @param {{ orderId: string, expectedAmountKRW: number }} expectation
 * @param {{ fetchPayment?: typeof fetchPortOnePayment }} [deps] 테스트용 주입.
 *   레포의 mock 정본 패턴(fetchImpl 주입, CLAUDE.md 코딩 원칙 8번)을 그대로 따른다 —
 *   네 가지 대조는 결제 정확성의 핵심이라 **실제 PG 를 부르지 않고** 전부 검증할 수 있어야 한다.
 * @returns {Promise<{ pgTransactionId: string, paidAt: Date|null, method: string, summary: object }>}
 */
export async function verifyPgPayment(env, { orderId, expectedAmountKRW }, deps = {}) {
  assertPgConfigured(env);
  const fetchPayment = deps.fetchPayment || fetchPortOnePayment;

  let pg;
  try {
    pg = await fetchPayment(env, orderId);
  } catch (error) {
    if (isPgUnreachable(error)) {
      // 우리도 사용자도 잘못한 게 없다. 유일하게 정당한 503 중 하나.
      throw paymentError("PG_UNAVAILABLE", "결제사 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.", {
        orderId,
        reason: String(error?.message || "").slice(0, 160),
      });
    }
    throw error;
  }

  // ① 우리가 물어본 주문에 대한 답이 맞는가. PG 가 다른 결제를 돌려주면 그 위의 모든 대조가 무의미하다.
  if (String(pg.paymentId || "") !== String(orderId)) {
    throw paymentError("PAYMENT_ID_MISMATCH", "결제 정보가 주문과 일치하지 않습니다.", {
      orderId,
      pgPaymentId: String(pg.paymentId || ""),
    });
  }

  // ② 실제로 결제됐는가. ready(가상계좌 발급) · failed · cancelled 전부 여기서 걸린다.
  if (String(pg.status || "") !== "paid") {
    throw paymentError("PG_PAYMENT_NOT_PAID", "아직 결제가 완료되지 않았습니다.", {
      orderId,
      pgStatus: String(pg.status || ""),
    });
  }

  // ③ 금액. 클라이언트가 보낸 값이 아니라 **우리 주문 문서**의 금액과 댄다.
  const expected = Math.floor(Number(expectedAmountKRW) || 0);
  const actual = Math.floor(Number(pg.amount) || 0);
  if (expected <= 0 || actual !== expected) {
    throw paymentError("AMOUNT_MISMATCH", "결제 금액이 주문 금액과 다릅니다.", {
      orderId,
      expected,
      actual,
    });
  }

  // ④ 통화. 원화 상품에 외화 결제가 붙는 것을 막는다.
  if (String(pg.currency || "").toUpperCase() !== "KRW") {
    throw paymentError("CURRENCY_MISMATCH", "결제 통화가 올바르지 않습니다.", {
      orderId,
      currency: String(pg.currency || ""),
    });
  }

  const summary = summarize(pg);
  return {
    pgTransactionId: summary.paymentId,
    paidAt: summary.paidAt,
    method: summary.payMethod,
    summary,
  };
}

export const __pgTestUtils = { summarize, isPgUnreachable };
