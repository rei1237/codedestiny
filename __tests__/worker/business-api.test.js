/** @jest-environment node */
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  handlePaymentsContext,
  settleOrderFromReconcile,
} from "../../worker/payments/index.js";
import { signWebhookPayload } from "../../worker/payments/webhook.js";
import { regrantUnfulfilledOrders } from "../../worker/payments/reconcile.js";
import { signAuthToken } from "../../worker/lib/auth.js";
import { makeFakePaymentDb } from "../fixtures/fake-payment-db.mjs";
import { addBusinessCollections } from "../fixtures/business-meter-db.mjs";
import { handleBusinessApi } from "../../worker/business-api/routes.js";
import {
  addKstMonth,
  expiryForOrders,
  businessProducts,
} from "../../lib/business-api/products.mjs";
import samples from "../../lib/business-api/examples.json" with { type: "json" };
import { calculate } from "../../worker/business-api/calculate.js";

const owner = "64b000000000000000000001";
const env = {
  JWT_ACCESS_SECRET: "test-access-secret-value-0123456789",
  PORTONE_STORE_ID: "store-test",
  PORTONE_CHANNEL_KEY: "channel-test",
  PORTONE_API_SECRET: "test-secret",
  BUSINESS_API_SALES: "saju,ziwei,tarot,astrology,vedic,sukuyo",
};
const make = () => {
  const db = makeFakePaymentDb();
  db.rows.push({
    _id: owner,
    email: "buyer@example.test",
    name: "시험 계정",
    phoneNumber: "01012345678",
  });
  return { db, withDb: (_env, _ctx, fn) => fn(db) };
};
async function prepare(withDb, p, resumeOrderId) {
  const token = await signAuthToken(
    { _id: owner, email: "buyer@example.test", name: "테스터" },
    env,
  );
  const request = new Request("https://example.test/api/payments/prepare", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      productId: p.id,
      resumeOrderId,
      refundConsent: true,
      idempotencyKey: crypto.randomUUID(),
    }),
  });
  const res = await handlePaymentsContext(request, env, { withDb });
  return { status: res.status, ...(await res.json()) };
}
const pgFor = (o) => ({
  status: "paid",
  paymentId: o.merchantUid,
  currency: "KRW",
  amount: o.paymentAmount,
  paid_at: Math.floor(Date.now() / 1000),
});
test.each(businessProducts)("$name의 주문과 실제 허용 상태", async (p) => {
  const { db, withDb } = make();
  const data = await prepare(withDb, p);
  if (p.reason) {
    expect(data.status).toBeGreaterThanOrEqual(400);
    expect(db.rows.filter((r) => r.productId === p.id)).toHaveLength(0);
    return;
  }
  expect(data.order?.paymentAmount).toEqual(p.priceKRW);
  const o = data.order,
    pg = pgFor(o);
  // No browser confirmation. Both scheduled settlement and a replay use the PG-verified order.
  await settleOrderFromReconcile(
    env,
    { orderId: o.merchantUid, pgPayment: pg },
    { withDb },
  );
  await settleOrderFromReconcile(
    env,
    { orderId: o.merchantUid, pgPayment: pg },
    { withDb },
  );
  const rows = db.rows.filter((r) => r.productId === p.id);
  expect(rows).toHaveLength(1);
  expect(rows[0].entitlementGrantedAt).toBeTruthy();
  expect(expiryForOrders(rows)).toEqual(addKstMonth(pg.paid_at * 1000));
  if (["astrology","vedic","sukuyo"].includes(p.slug)) {
    addBusinessCollections(db);
    const deps = { withDb, authenticate: async () => ({ userId: owner }) };
    const keyResponse = await handleBusinessApi(
      new Request("https://example.test/api/business/key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
      env,
      deps,
    );
    expect(keyResponse.status).toBe(201);
    const { key } = await keyResponse.json();
    const response = await handleBusinessApi(
      new Request("https://example.test/api/business/v1/" + p.slug, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(p.input),
      }),
      env,
      deps,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(samples[p.slug]);
  }
});
test("지급 저장 장애 후 복구, 서명 웹훅 중복·연장 환불·다른 상품 보존", async () => {
  const { db, withDb } = make();
  const primary = (await prepare(withDb, businessProducts[0])).order;
  const extension = (await prepare(withDb, businessProducts[0])).order;
  const tarot = (await prepare(withDb, businessProducts[5])).order;
  const actualUpdate = db.updateOne.bind(db);
  let inject = true;
  db.updateOne = async (model, filter, update, opts) => {
    if (inject && update.$set?.entitlementGrantedAt)
      throw Error("mock grant interruption");
    return actualUpdate(model, filter, update, opts);
  };
  await settleOrderFromReconcile(
    env,
    { orderId: primary.merchantUid, pgPayment: pgFor(primary) },
    { withDb },
  );
  const first = db.rows.find((r) => r.merchantUid === primary.merchantUid);
  expect(first.status).toBe("paid");
  expect(first.entitlementGrantedAt).toBeFalsy();
  inject = false;
  await regrantUnfulfilledOrders(db, {
    minAgeMs: 0,
    now: new Date(Date.now() + 60000),
    grant: (row) =>
      settleOrderFromReconcile(
        env,
        { orderId: row.merchantUid, pgPayment: pgFor(primary) },
        { withDb },
      ),
  });
  expect(first.entitlementGrantedAt).toBeTruthy();
  const secret = "whsec_" + Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64");
  const deliver = async (type, order, eventId) => {
    const rawBody = JSON.stringify({
      type,
      data: { paymentId: order.merchantUid },
    });
    const ts = String(Math.floor(Date.now() / 1000));
    const request = new Request("https://example.test/api/payments/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "webhook-id": eventId,
        "webhook-timestamp": ts,
        "webhook-signature":
          "v1," + (await signWebhookPayload(secret, eventId, ts, rawBody)),
      },
      body: rawBody,
    });
    return handlePaymentsContext(
      request,
      { ...env, PORTONE_WEBHOOK_SECRET: secret },
      {
        withDb,
        pgDeps: {
          fetchPayment: async () => ({
            ...pgFor(order),
            status: type === "Transaction.Cancelled" ? "cancelled" : "paid",
          }),
        },
      },
    );
  };
  expect(
    (await deliver("Transaction.Paid", extension, "evt_biz_extend")).status,
  ).toBe(200);
  expect(
    (await deliver("Transaction.Paid", extension, "evt_biz_extend")).status,
  ).toBe(200);
  await settleOrderFromReconcile(
    env,
    { orderId: tarot.merchantUid, pgPayment: pgFor(tarot) },
    { withDb },
  );
  const rows = (id) => db.rows.filter((r) => r.productId === id);
  const tarotExpiry = expiryForOrders(rows(tarot.featureKey));
  expect(expiryForOrders(rows(primary.featureKey))).toEqual(
    addKstMonth(addKstMonth(first.paidAt)),
  );
  expect(
    (await deliver("Transaction.Cancelled", extension, "evt_biz_refund"))
      .status,
  ).toBe(200);
  expect(expiryForOrders(rows(primary.featureKey))).toEqual(
    addKstMonth(first.paidAt),
  );
  expect(expiryForOrders(rows(tarot.featureKey))).toEqual(tarotExpiry);
  await expect(
    settleOrderFromReconcile(
      env,
      { orderId: extension.merchantUid, pgPayment: pgFor(extension) },
      { withDb },
    ),
  ).rejects.toThrow();
  const racing = (await prepare(withDb, businessProducts[0])).order;
  const row = db.rows.find((item) => item.merchantUid === racing.merchantUid);
  const update = db.updateOne.bind(db);
  db.updateOne = async (model, filter, op, options) => {
    if (
      filter.merchantUid === racing.merchantUid &&
      op.$set?.failureCode === "PG_CANCELLED"
    ) {
      row.status = "paid";
      row.entitlementGrantedAt = new Date();
      row.paidAt = new Date();
    }
    return update(model, filter, op, options);
  };
  expect(
    (await deliver("Transaction.Cancelled", racing, "evt_biz_race")).status,
  ).toBe(200);
  expect(row.status).toBe("refunded");
  expect(expiryForOrders(rows(primary.featureKey))).toEqual(
    addKstMonth(first.paidAt),
  );
});
test("KST 말일, 조기 연장, 연장 환불, 만료 후 구매", () => {
  const order = (id, date) => ({
    merchantUid: id,
    status: "paid",
    paidAt: date,
    entitlementGrantedAt: date,
  });
  const jan = order("a", "2024-01-31T14:59:59Z"),
    early = order("b", "2024-02-01T03:00:00Z");
  expect(expiryForOrders([jan]).toISOString()).toBe("2024-02-29T14:59:59.000Z");
  expect(expiryForOrders([early, jan]).toISOString()).toBe(
    "2024-03-29T14:59:59.000Z",
  );
  expect(expiryForOrders([jan, { ...early, status: "refunded" }])).toEqual(
    expiryForOrders([jan]),
  );
  expect(addKstMonth("2025-01-31T14:59:59Z").toISOString()).toBe(
    "2025-02-28T14:59:59.000Z",
  );
  expect(
    expiryForOrders([jan, order("c", "2024-06-10T00:01:00Z")]).toISOString(),
  ).toBe("2024-07-10T00:01:00.000Z");
});
test.each(["saju", "tarot"])("%s 공개 예시 일치", async (slug) =>
  expect(
    await calculate(slug, businessProducts.find((p) => p.slug === slug).input),
  ).toEqual(samples[slug]),
);
test("출생시각 미상, 음력 윤달, 중복 카드", async () => {
  expect(
    (
      await calculate("saju", {
        birthDate: "2023-02-01",
        calendarType: "lunar_leap",
      })
    ).pillars.hour,
  ).toBe(null);
  await expect(
    calculate("tarot", {
      spread: "three_card_past_present_future",
      cards: Array(3).fill({ id: "M00", direction: "upright" }),
    }),
  ).rejects.toThrow();
});
test("화면 엔진과 동일한 스프레드 자리 및 카드명", async () => {
  const { getSpreadDefinition } = await import("../../lib/tarot/spreads.mjs");
  const { TAROT_CARDS } = await import("../../lib/tarot/tarot-cards.mjs");
  const spread = "three_card_past_present_future";
  const cards = ["M00", "W01", "P14"].map((id, i) => ({
    id,
    direction: i === 1 ? "reversed" : "upright",
  }));
  const response = await calculate("tarot", { spread, cards });
  expect(response.cards).toEqual(
    cards.map((c, i) => ({
      ...c,
      name: TAROT_CARDS.find((t) => t.code === c.id).nameKo,
      position: getSpreadDefinition(spread).positions[i].label,
    })),
  );
});
test("구가격의 대기 주문은 처음 확정된 금액으로 결제하고 승인한다", async () => {
  const { db, withDb } = make();
  const product = businessProducts[0];
  const order = (await prepare(withDb, product)).order;
  const stored = db.rows.find((row) => row.merchantUid === order.merchantUid);
  stored.paymentAmount = 99000;
  const resumed = (await prepare(withDb, product, order.merchantUid)).order;
  expect(resumed.merchantUid).toBe(order.merchantUid);
  expect(resumed.paymentAmount).toBe(99000);
  await settleOrderFromReconcile(
    env,
    { orderId: order.merchantUid, pgPayment: pgFor(resumed) },
    { withDb },
  );
  expect(stored.entitlementGrantedAt).toBeTruthy();
});
test("서양 기본 화면의 행성·상승점·Placidus 궁점과 파트너 응답", async () => {
  const { handleAstrologyRoutes } = await import(
    "../../worker/routes/astro.js"
  );
  const product = businessProducts.find((p) => p.slug === "astrology");
  const chart = await calculate(product.slug, product.input);
  const b = product.input;
  const req = new Request("https://example.test/api/astrology/basic", {
    method: "POST",
    body: JSON.stringify({
      date: b.birthDate,
      time: b.birthTime,
      timezone: b.timezoneOffsetHours,
      latitude: b.latitude,
      longitude: b.longitude,
    }),
  });
  const view = await (await handleAstrologyRoutes(req, {})).json();
  expect(view.engine.version).toBe(chart.providerVersion);
  expect(view.angles.ascendant.longitude).toBeCloseTo(chart.ascendant, 5);
  expect(view.houses).toHaveLength(12);
  for (const house of view.houses)
    expect(house.longitude).toBeCloseTo(chart.houseCusps[house.house - 1], 5);
  for (const body of view.planets)
    expect(body.longitude).toBeCloseTo(chart.planets[body.name].longitude, 5);
  expect(
    (await calculate("astrology", { ...b, latitude: 75 })).houseCusps,
  ).toBeNull();
  expect(chart).toEqual(samples.astrology);
});
test("PG 불일치는 권한을 부여하지 않는다", async () => {
  const { db, withDb } = make(),
    { order: o } = await prepare(withDb, businessProducts[0]);
  await expect(
    settleOrderFromReconcile(
      env,
      { orderId: o.merchantUid, pgPayment: { ...pgFor(o), currency: "USD" } },
      { withDb },
    ),
  ).rejects.toThrow();
  expect(
    db.rows.find((r) => r.productId === o.featureKey).entitlementGrantedAt,
  ).toBeFalsy();
});
test.each([["saju","tarot"],["vedic","sukuyo"]])("%s·%s 독립 상품 권한과 60회 제한", async (primary,secondary) => {
  const firstProduct = businessProducts.find(p => p.slug === primary);
  const secondProduct = businessProducts.find(p => p.slug === secondary);
  const { db, withDb } = make(),
    { order: o } = await prepare(withDb, firstProduct);
  await settleOrderFromReconcile(
    env,
    { orderId: o.merchantUid, pgPayment: pgFor(o) },
    { withDb },
  );
  const { credentials } = addBusinessCollections(db);
  const api = (path, method, key, input) =>
    handleBusinessApi(
      new Request("https://example.test/api/business/" + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: key ? "Bearer " + key : "",
        },
        body: method === "POST" ? JSON.stringify(input || {}) : undefined,
      }),
      env,
      { withDb, authenticate: async () => ({ userId: owner }) },
    );
  const issue = async () => {
    const r = await api("key", "POST");
    expect(r.status).toBe(201);
    return (await r.json()).key;
  };
  let key = await issue();
  expect(JSON.stringify([...credentials.values()])).not.toContain(key);
  const invoke = () => api("v1/" + primary, "POST", key, firstProduct.input);
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const request = new Request("http://127.0.0.1" + req.url, {
      method: req.method,
      headers: req.headers,
      body: Buffer.concat(chunks),
    });
    const answer = await handleBusinessApi(request, env, { withDb });
    res.writeHead(answer.status, Object.fromEntries(answer.headers));
    res.end(await answer.text());
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const client = spawn(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `
      const r=await fetch(process.env.PARTNER_URL,{method:'POST',headers:{'Authorization':'Bearer '+process.env.GGUL_FORTUNE_API_KEY,'Content-Type':'application/json'},body:process.env.PARTNER_INPUT});
      console.log(JSON.stringify({status:r.status,body:await r.json()}));
    `,
      ],
      {
        env: {
          ...process.env,
          GGUL_FORTUNE_API_KEY: key,
          PARTNER_INPUT: JSON.stringify(firstProduct.input),
          PARTNER_URL:
            "http://127.0.0.1:" +
            server.address().port +
            "/api/business/v1/" + primary,
        },
        stdio: ["ignore", "pipe", "inherit"],
      },
    );
    const chunks = [];
    client.stdout.on("data", (c) => chunks.push(c));
    const [code] = await once(client, "exit");
    expect(code).toBe(0);
    expect(JSON.parse(Buffer.concat(chunks).toString())).toEqual({
      status: 200,
      body: samples[primary],
    });
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  expect((await api("v1/" + secondary, "POST", key, {})).status).toBe(403);
  const oldKey = key;
  key = await issue();
  expect((await api("v1/" + primary, "POST", oldKey, {})).status).toBe(401);
  for (let i = 1; i < 60; i++) expect((await invoke()).status).toBe(200);
  expect((await invoke()).status).toBe(429);
  const { order: tarot } = await prepare(withDb, secondProduct);
  await settleOrderFromReconcile(
    env,
    { orderId: tarot.merchantUid, pgPayment: pgFor(tarot) },
    { withDb },
  );
  expect(
    (await api("v1/" + secondary, "POST", key, secondProduct.input)).status,
  ).toBe(200);
  // Move only the saju grant into the past. The other product remains active.
  db.rows.find((row) => row.merchantUid === o.merchantUid).paidAt = new Date(
    "2020-01-01T00:00:00Z",
  );
  expect((await invoke()).status).toBe(403);
  expect(
    (await api("v1/" + secondary, "POST", key, secondProduct.input)).status,
  ).toBe(200);
  for(let i=2;i<60;i++) expect((await api("v1/"+secondary,"POST",key,secondProduct.input)).status).toBe(200);
  expect((await api("v1/"+secondary,"POST",key,secondProduct.input)).status).toBe(429);
  await api("key", "DELETE");
  expect((await invoke()).status).toBe(401);
}, 30000);
