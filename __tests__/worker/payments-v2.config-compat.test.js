/**
 * @jest-environment node
 *
 * 결제 공개 설정 컷오버 어댑터(GET /config)의 응답 계약.
 * 소비자는 셸 checkoutAssets 프리페치와 PointsClient 의 paymentConfig(storeId·channelKey·
 * currency·payMethod·noticeUrl)다. 비밀 설정의 개별 준비 상태는 공개하지 않는다.
 */
import { handlePaymentsContext } from "../../worker/payments/index.js";
import { makeFakePaymentDb } from "../fixtures/fake-payment-db.mjs";

const CONFIGURED_ENV = {
  PORTONE_STORE_ID: "store-test-1",
  PORTONE_CHANNEL_KEY: "channel-test-1",
  PORTONE_API_SECRET: "portone-secret-test",
};

async function getConfig(env) {
  const db = makeFakePaymentDb();
  const request = new Request("https://code-destiny.com/api/payments/config", { method: "GET" });
  const response = await handlePaymentsContext(request, env, {
    prefix: "/api/payments",
    withDb: (_env, _ctx, fn) => fn(db),
  });
  return { response, payload: await response.json(), ops: db.ctx.ops };
}

const PUBLIC_CONFIG_KEYS = [
  "ok", "configured",
  "provider", "pg", "storeId", "channelKey", "currency", "payMethod", "noticeUrl",
];
const PRIVATE_STATUS_KEYS = [
  "serverVerificationConfigured", "inicisConfigured", "inicisMidConfigured",
  "inicisSignKeyConfigured", "inicisApiKeyConfigured", "inicisApiIvConfigured", "missing",
];

test("설정 완비: 200 + 결제창 공개 키 + 무인증 + Mongo 0회", async () => {
  const { response, payload, ops } = await getConfig(CONFIGURED_ENV);
  expect(response.status).toBe(200);
  for (const key of PUBLIC_CONFIG_KEYS) {
    expect(Object.prototype.hasOwnProperty.call(payload, key)).toBe(true);
  }
  for (const key of PRIVATE_STATUS_KEYS) expect(payload).not.toHaveProperty(key);
  expect(payload.ok).toBe(true);
  expect(payload.storeId).toBe("store-test-1");
  expect(payload.channelKey).toBe("channel-test-1");
  expect(payload.currency).toBe("CURRENCY_KRW");
  expect(ops).toBe(0);
});

test("설정 누락: 503은 비밀 설정의 개별 준비 상태를 노출하지 않는다", async () => {
  const { response, payload } = await getConfig({});
  expect(response.status).toBe(503);
  expect(payload.code).toBe("PORTONE_V2_PUBLIC_CONFIG_MISSING");
  expect(payload).not.toHaveProperty("missing");
  for (const key of PRIVATE_STATUS_KEYS) expect(payload).not.toHaveProperty(key);
});
