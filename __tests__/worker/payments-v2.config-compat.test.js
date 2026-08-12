/**
 * @jest-environment node
 *
 * 결제 공개 설정 컷오버 어댑터(GET /config)의 응답-키 패리티.
 * 구 handlePaymentConfig(worker/routes/payments.js:5926, 동결)의 봉투를 그대로 승계해야 한다 —
 * 소비자는 셸 checkoutAssets 프리페치와 PointsClient 의 paymentConfig(storeId·channelKey·
 * currency·payMethod·noticeUrl)다. 키가 빠지면 결제창이 SDK 설정 없이 열리다 죽는다.
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

// 구 성공 봉투의 전체 키(payments.js:5950-5966). 하나라도 빠지면 값만 undefined 로 비는 부류.
const LEGACY_CONFIG_KEYS = [
  "ok", "configured", "serverVerificationConfigured", "inicisConfigured",
  "inicisMidConfigured", "inicisSignKeyConfigured", "inicisApiKeyConfigured", "inicisApiIvConfigured",
  "provider", "pg", "storeId", "channelKey", "currency", "payMethod", "noticeUrl",
];

test("설정 완비: 200 + 구 봉투 키 전부 + 무인증 + Mongo 0회", async () => {
  const { response, payload, ops } = await getConfig(CONFIGURED_ENV);
  expect(response.status).toBe(200);
  for (const key of LEGACY_CONFIG_KEYS) {
    expect(Object.prototype.hasOwnProperty.call(payload, key)).toBe(true);
  }
  expect(payload.ok).toBe(true);
  expect(payload.storeId).toBe("store-test-1");
  expect(payload.channelKey).toBe("channel-test-1");
  expect(payload.currency).toBe("CURRENCY_KRW");
  expect(ops).toBe(0);
});

test("설정 누락: 503 + PORTONE_V2_PUBLIC_CONFIG_MISSING + missing 상세(구 계약)", async () => {
  const { response, payload } = await getConfig({});
  expect(response.status).toBe(503);
  expect(payload.code).toBe("PORTONE_V2_PUBLIC_CONFIG_MISSING");
  expect(payload.missing).toMatchObject({ storeId: true, channelKey: true });
});
