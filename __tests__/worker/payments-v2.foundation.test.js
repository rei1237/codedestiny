/**
 * @jest-environment node
 *
 * 신규 결제 컨텍스트(worker/payments/)의 토대 3종 — errors · log · catalog.
 *
 * 이 세 파일은 I/O 가 없어서 Mongo 없이 전부 검증된다. 상태기계(orders.js)가 db 핸들을 주입받도록
 * 설계된 것과 같은 이유다: 결제 로직의 정확성을 인프라 없이 확인할 수 있어야 한다.
 *
 * 여기서 지키는 계약은 셋이다.
 *   ① 결제 컨텍스트가 503 을 낼 수 있는 코드는 정확히 3개뿐이다.
 *   ② 로그 한 줄에 개인정보가 실릴 수 없다(약속이 아니라 구조로).
 *   ③ 가격·이용권 제외 판정은 등록소/기존 billing.js 와 **한 글자도 어긋나지 않는다**.
 */
import {
  ALLOWED_503_CODES,
  PAYMENT_ERROR_TABLE,
  PaymentError,
  classify,
  contractFor,
  paymentError,
  responseHeadersFor,
} from "../../worker/payments/errors.js";
import { logPayment, maskId, __paymentLogTestUtils } from "../../worker/payments/log.js";
import { PASS_EXCLUDED_FEATURE_KEYS, listProducts, resolveProduct } from "../../worker/payments/catalog.js";

describe("errors: 503 은 정확히 셋뿐이다", () => {
  test("표 전체에서 status 503 인 코드는 ALLOWED_503_CODES 와 일치한다", () => {
    const found = Object.entries(PAYMENT_ERROR_TABLE)
      .filter(([, spec]) => spec.status === 503)
      .map(([code]) => code)
      .sort();
    expect(found).toEqual([...ALLOWED_503_CODES].sort());
  });

  test("503 셋은 모두 retryable 이고 Retry-After 를 갖는다", () => {
    for (const code of ALLOWED_503_CODES) {
      const contract = contractFor(code);
      expect(contract.retryable).toBe(true);
      expect(contract.retryAfterSec).toBeGreaterThan(0);
      expect(responseHeadersFor(contract)["X-CD-Error-Stage"]).toBeTruthy();
    }
  });

  test("🔴 503 이 아닌 응답에는 Retry-After 헤더가 붙지 않는다", () => {
    // 본문 retryable 과 헤더가 어긋나면 클라이언트에 정반대 지시를 두 개 보내게 된다.
    for (const code of ["ORDER_NOT_FOUND", "REFUND_IN_PROGRESS", "INTERNAL_ERROR", "AMOUNT_MISMATCH"]) {
      expect(responseHeadersFor(contractFor(code))).toBeUndefined();
    }
  });

  test("동시성 실패는 409 retryable 이지 503 이 아니다", () => {
    // 락 경합·차감 중복은 의존 서비스 장애가 아니다. 503 으로 내면 클라 재시도 폭풍이
    // admission 포화를 더 키운다(db.js:101-134).
    for (const code of ["REFUND_IN_PROGRESS", "MOONSTONE_CONTENDED", "MOONSTONE_IN_PROGRESS"]) {
      const contract = contractFor(code);
      expect(contract.status).toBe(409);
      expect(contract.retryable).toBe(true);
    }
  });
});

describe("errors: classify", () => {
  test("PaymentError 는 자기 코드를 그대로 쓴다", () => {
    const contract = classify(paymentError("ORDER_NOT_FOUND", "없음", { orderId: "cd1" }));
    expect(contract.status).toBe(404);
    expect(contract.code).toBe("ORDER_NOT_FOUND");
    expect(contract.meta.orderId).toBe("cd1");
  });

  test("표에 없는 코드는 조용히 INTERNAL_ERROR 가 된다", () => {
    expect(new PaymentError("NOPE_NOT_A_CODE").code).toBe("INTERNAL_ERROR");
    expect(classify(paymentError("NOPE_NOT_A_CODE")).status).toBe(500);
  });

  test("🔴 admission 포화는 DB_BUSY 이지 DB_UNAVAILABLE 이 아니다", () => {
    // isDbUnavailableError 의 /^Mongo/ 이름 정규식이 둘 다 삼키므로 분기 순서가 뒤집히면
    // DB_BUSY 가 영영 나오지 않는다. 붐빔과 장애는 Retry-After 가 달라야 한다.
    const overloaded = Object.assign(new Error("MongoDB operation capacity is temporarily saturated."), {
      name: "MongoOperationOverloadedError",
    });
    const contract = classify(overloaded);
    expect(contract.code).toBe("DB_BUSY");
    expect(contract.retryAfterSec).toBe(1);

    const waitQueue = Object.assign(new Error("wait queue timed out"), { name: "MongoWaitQueueTimeoutError" });
    expect(classify(waitQueue).code).toBe("DB_BUSY");
  });

  test("진짜 인프라 장애는 DB_UNAVAILABLE", () => {
    const poolCleared = Object.assign(new Error("pool was cleared"), { name: "MongoPoolClearedError" });
    expect(classify(poolCleared).code).toBe("DB_UNAVAILABLE");
    expect(classify(new Error("MongoDB operation timed out in Worker.")).code).toBe("DB_UNAVAILABLE");
  });

  test("🔴 확정 거부 Mongo 코드는 500 이다 — 재시도 가능 503 으로 위장되지 않는다", () => {
    // http.js 의 PERMANENT_MONGO_ERROR_CODES allowlist 를 재사용하는지 본다. 예전에 이게 없어
    // ConflictingUpdateOperators(40)가 며칠간 'DB 일시 장애'로 보였고 그동안 기능은 100% 죽어 있었다.
    const conflicting = Object.assign(new Error("ConflictingUpdateOperators"), {
      name: "MongoServerError",
      code: 40,
    });
    expect(classify(conflicting).status).toBe(500);
  });

  test("일반 코드 버그는 500 이다", () => {
    expect(classify(new TypeError("Cannot read properties of undefined")).code).toBe("INTERNAL_ERROR");
    expect(classify(new Error("payment provider connect failed")).status).toBe(500);
  });
});

describe("log: 개인정보는 구조적으로 실리지 않는다", () => {
  test("식별자는 뒤 8자만 남는다", () => {
    expect(maskId("507f1f77bcf86cd799439011")).toBe("...99439011");
    expect(maskId("short")).toBe("short");
    expect(maskId(null)).toBe("");
  });

  test("🔴 금지 키는 넘겨도 떨어진다", () => {
    const kept = __paymentLogTestUtils.stripForbidden({
      phoneNumber: "010-1234-5678",
      email: "a@b.com",
      customerName: "홍길동",
      cardNumber: "4111111111111111",
      birthDate: "1990-01-01",
      attempt: 2,
    });
    expect(kept).toEqual({ attempt: 2 });
  });

  test("로그 방출은 어떤 입력에도 던지지 않는다", () => {
    const circular = {};
    circular.self = circular;
    expect(() => logPayment({ route: "POST /x", requestId: "r1", extra: { circular } })).not.toThrow();
  });
});

describe("catalog: 가격 정본과 어긋나지 않는다", () => {
  test("회당결제 상품", () => {
    const product = resolveProduct({ featureKey: "master-love-codex" });
    expect(product.priceCoins).toBe(200);
    expect(product.priceKRW).toBe(20000);
    expect(product.monthlyCost).toBe(2000); // MEMBERSHIP_CREDIT_PER_COIN = 10
    expect(product.passExcluded).toBe(false);
  });

  test("해금 상품은 productId 로도 featureKey 로도 같은 답이 나온다", () => {
    const byId = resolveProduct({ productId: "unlock.premium_ziwei" });
    const byKey = resolveProduct({ featureKey: "premium-ziwei" });
    expect(byId.priceCoins).toBe(200);
    expect(byId.priceKRW).toBe(20000); // KRW_PER_COIN = 100
    expect(byKey.productId).toBe(byId.productId);
    expect(byKey.priceKRW).toBe(byId.priceKRW);
  });

  test("별칭 featureKey 도 정규화된다", () => {
    expect(resolveProduct({ featureKey: "openSajuGuardianPage" }).featureKey).toBe("saju-guardian-unlock");
  });

  test("없는 상품과 가격 0 인 항목은 PRODUCT_NOT_FOUND", () => {
    expect(() => resolveProduct({ featureKey: "totally-made-up" })).toThrow(PaymentError);
    expect(classify(catchError(() => resolveProduct({ featureKey: "" }))).status).toBe(404);
  });

  test("listProducts 는 전부 결제 가능한 가격을 갖는다", () => {
    const items = listProducts();
    expect(items.length).toBeGreaterThan(20);
    for (const item of items) {
      expect(item.priceKRW).toBeGreaterThan(0);
      expect(item.priceCoins).toBeGreaterThan(0);
    }
  });
});

describe("catalog: 이용권 제외 판정이 기존 billing.js 와 동일하다", () => {
  let isPassExcludedPricing;

  beforeAll(async () => {
    const mod = await import("../../worker/routes/billing.js");
    isPassExcludedPricing = mod.__billingTestUtils.isPassExcludedPricing;
  });

  /* 🔴 두 구현이 공존하는 동안의 드리프트 가드. 문자열 비교가 아니라 **기존 판정 함수를 실제로 호출**해
     맞춘다. 구 billing.js 가 삭제되면 이 describe 도 함께 지운다(그때는 catalog 가 유일 정본이다). */
  test("제외 집합이 양쪽에서 같다", () => {
    for (const featureKey of PASS_EXCLUDED_FEATURE_KEYS) {
      expect(isPassExcludedPricing({ featureKey })).toBe(true);
      expect(resolveProduct({ featureKey }).passExcluded).toBe(true);
    }
  });

  test("제외 대상이 아닌 기능은 양쪽 모두 false", () => {
    for (const featureKey of ["master-love-codex", "premium-ziwei", "ziwei-island-deep-report"]) {
      expect(isPassExcludedPricing({ featureKey })).toBe(false);
      expect(resolveProduct({ featureKey }).passExcluded).toBe(false);
    }
  });
});

function catchError(fn) {
  try {
    fn();
    return new Error("expected a throw");
  } catch (error) {
    return error;
  }
}
