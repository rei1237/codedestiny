/**
 * @jest-environment node
 *
 * 결제 V2 오류 응답이 내부 사정을 클라이언트에 싣지 않는다(B6).
 *
 * 예전 응답은 `message: error.message` 와 `details: <PaymentError.meta>` 를 그대로 실었다.
 * 앞의 것은 Mongo 드라이버·JS 런타임 예외 원문(호스트·IP·쿼리 조각)이고, 뒤의 것은 PG 업스트림 사유·
 * pgPaymentId·기대/실제 금액이다. 둘 다 본인 주문을 두드리는 것만으로 읽혔다.
 * 지금은 사람이 쓴 PaymentError 문구만 내보내고, 진단용 meta 는 `[pay]` 로그 한 줄에만 남는다.
 */
import { jest } from "@jest/globals";
import { handlePaymentsContext } from "../../worker/payments/index.js";
import { paymentError } from "../../worker/payments/errors.js";
import { listProducts } from "../../worker/payments/catalog.js";

const USER = "64b000000000000000000001";
const ENV = {
  JWT_ACCESS_SECRET: "test-access-secret-value-0123456789",
  PORTONE_STORE_ID: "store-test-1",
  PORTONE_CHANNEL_KEY: "channel-test-1",
  PORTONE_API_SECRET: "portone-secret-test",
};
const PRODUCT = listProducts()[0];

async function postPrepareWithFailingDb(error) {
  const { signAuthToken } = await import("../../worker/lib/auth.js");
  const token = await signAuthToken({ _id: USER, email: "t@e.st", role: "user", name: "t" }, ENV);
  const request = new Request("https://code-destiny.com/api/payments/prepare", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ paymentType: "digital_content", featureKey: PRODUCT.featureKey, idempotencyKey: "exposure-key" }),
  });
  const response = await handlePaymentsContext(request, ENV, {
    prefix: "/api/payments",
    legacyEnvelope: "prepare",
    withDb: async () => { throw error; },
  });
  return { response, payload: await response.json() };
}

let logSpy;
beforeEach(() => { logSpy = jest.spyOn(console, "log").mockImplementation(() => {}); });
afterEach(() => { logSpy.mockRestore(); });

test("비-PaymentError 예외의 원문 message 는 응답에 나가지 않는다", async () => {
  const raw = new Error("connection <monitor> to 10.1.2.3:27017 timed out (shard-00-01.abcde.mongodb.net)");
  raw.name = "MongoNetworkTimeoutError";
  const { response, payload } = await postPrepareWithFailingDb(raw);
  expect(response.status).toBe(503);
  expect(payload.code).toBe("DB_UNAVAILABLE");
  expect(JSON.stringify(payload)).not.toMatch(/10\.1\.2\.3|mongodb\.net|monitor/);
});

test("PaymentError meta(PG 사유·금액·pgPaymentId)는 응답 본문에 없고 로그 한 줄에만 있다", async () => {
  const error = paymentError("AMOUNT_MISMATCH", "결제 금액이 주문과 일치하지 않습니다.", {
    orderId: "cd-order-1",
    expected: 1100,
    actual: 100,
    pgPaymentId: "pg-secret-id-777",
    reason: "upstream says: INICIS_9999 internal reason",
  });
  const { response, payload } = await postPrepareWithFailingDb(error);

  expect(response.status).toBe(422);
  expect(payload.code).toBe("AMOUNT_MISMATCH");
  // 사람이 쓴 문구는 그대로 — 클라이언트 안내는 유지된다.
  expect(payload.message).toBe("결제 금액이 주문과 일치하지 않습니다.");
  expect(payload).not.toHaveProperty("details");
  expect(JSON.stringify(payload)).not.toMatch(/pg-secret-id-777|INICIS_9999|1100/);

  const payLine = logSpy.mock.calls.map((call) => call.join(" ")).find((line) => line.startsWith("[pay]"));
  expect(payLine).toContain("pg-secret-id-777");
});

test("500 계열은 내부 사유 문구 대신 일반 문구로 답한다", async () => {
  const { response, payload } = await postPrepareWithFailingDb(
    paymentError("INTERNAL_ERROR", "entitlement grant failed: E11000 duplicate key index: userId_1", { orderId: "cd-order-2" }),
  );
  expect(response.status).toBe(500);
  expect(payload.code).toBe("INTERNAL_ERROR");
  expect(payload.message).toBe("요청을 처리하지 못했습니다.");
  expect(JSON.stringify(payload)).not.toMatch(/E11000|userId_1/);
});
