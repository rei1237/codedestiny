/**
 * @jest-environment node
 *
 * 구 /api/payments 라우터의 닫힌 표면(B2d·B2b).
 *
 * - POST /webhook: 웹훅은 worker/index.js 가 V2 로 가로챈다. 이 라우터에 등록이 남아 있으면 별도 서명 검증을
 *   가진 구 핸들러가 인증 앞에서 도달 가능해진다. 등록하지 않으면 일반 인증 게이트(401)가 먼저 답한다.
 * - POST /single/start · /single/complete: V2 prepare 의 지역·해외카드·환불동의 게이트를 건너뛰던 경로. 프런트
 *   호출자가 없고, 핸들러는 재조정 크론이 쓰므로 함수만 남기고 라우트는 410 으로 닫는다.
 */
import { jest } from "@jest/globals";
import { handlePaymentRoutes } from "../../worker/routes/payments.js";
import { Payment } from "../../worker/lib/models.js";

// key-health("auth-basic") 게이트를 통과할 만큼만 채운다. Mongo 는 닿지 않는 주소 — 닫힌 경로는 DB 앞에서 끝나야 한다.
const ENV = {
  NODE_ENV: "production",
  JWT_SECRET: "test-jwt-secret-value-0123456789",
  JWT_ACCESS_SECRET: "test-access-secret-value-0123456789",
  JWT_REFRESH_SECRET: "test-refresh-secret-value-0123456789",
  MONGO_URI: "mongodb://127.0.0.1:1/never-connected",
  SECURITY_GUARD_MODE: "off",
};
const SITE = "https://code-destiny.com";

function post(path, body = {}) {
  return new Request(`${SITE}/api/payments${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("POST /webhook 은 구 핸들러에 닿지 않고 인증 게이트에서 401 로 끝난다", async () => {
  const response = await handlePaymentRoutes(post("/webhook", { type: "Transaction.Paid", data: { paymentId: "pay_x" } }), ENV, {});
  expect(response.status).toBe(401);
});

test.each(["/single/start", "/single/complete"])("POST %s 는 410 으로 닫혀 있고 결제 문서를 건드리지 않는다", async (path) => {
  const findOne = jest.spyOn(Payment, "findOne");
  const create = jest.spyOn(Payment, "create");
  const response = await handlePaymentRoutes(
    post(path, { serviceId: "saju", impUid: "imp_1", merchantUid: "pay_1" }),
    ENV,
    { preverifiedAuth: { userId: "64f0a1b2c3d4e5f678901234", role: "user" } },
  );
  const payload = await response.json();

  expect(response.status).toBe(410);
  expect(payload).toMatchObject({ ok: false, code: "LEGACY_ENDPOINT_RETIRED" });
  expect(findOne).not.toHaveBeenCalled();
  expect(create).not.toHaveBeenCalled();
  findOne.mockRestore();
  create.mockRestore();
});
