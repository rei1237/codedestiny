/**
 * @jest-environment node
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const historyClient = fs.readFileSync(path.join(root, "app/points/history/PointHistoryClient.tsx"), "utf8");
const paymentsRoute = fs.readFileSync(path.join(root, "worker/routes/payments.js"), "utf8");
const authClient = fs.readFileSync(path.join(root, "app/_lib/auth-client.ts"), "utf8");
// GET /api/payments/orders/:id 는 V2 가 답한다(worker/index.js 가 이 경로만 따로 가로챈다).
// 구 handleOrderDetail 은 그래서 도달 불가였고 삭제됐다 — 소유권 단언은 살아 있는 쪽에 건다.
const paymentsV2Route = fs.readFileSync(path.join(root, "worker/payments/index.js"), "utf8");
const paymentsV2Orders = fs.readFileSync(path.join(root, "worker/payments/orders.js"), "utf8");

test("history list uses summary view and opens detail only after an order click", () => {
  assert.match(historyClient, /\/api\/payments\/me\?view=history/);
  assert.match(historyClient, /\/api\/payments\/orders\/\$\{encodeURIComponent\(order\.id\)\}/);
  assert.match(historyClient, /onClick=\{\(\) => \{ void loadOrderDetail\(p\); \}\}/);
  assert.match(historyClient, /OrderDetailModal/);
});

test("order detail route is user-scoped and the common GET client deduplicates it", () => {
  // 이력 목록(/me)은 구 라우트가 계속 답한다.
  assert.match(paymentsRoute, /path === "\/me"/);

  // 🔴 지켜야 할 것은 "남의 주문이 보이지 않는다" 하나다. 그 판정이 V2 로 옮겨갔을 뿐이라
  //    단언도 함께 옮긴다 — 구 핸들러를 되살려 여기서 다시 재면 죽은 사본을 지키게 된다.
  const detailRoute = paymentsV2Route.slice(paymentsV2Route.indexOf('"GET /orders/:id": {'));
  assert.ok(detailRoute.startsWith('"GET /orders/:id": {'), "V2 에 주문 상세 라우트가 있어야 한다");
  assert.match(detailRoute.slice(0, 400), /auth: "required"/);
  assert.match(detailRoute.slice(0, 400), /assertOrderOwner\(order, userId\)/);
  // 소유권은 users 조회가 아니라 주문 문서로 판정하고, 불일치는 통과가 아니라 throw 여야 한다.
  assert.match(paymentsV2Orders, /export function assertOrderOwner\(order, userId\)/);
  assert.match(paymentsV2Orders, /if \(String\(order\.userId\) !== String\(userId\)\)/);
  assert.match(paymentsV2Orders, /throw paymentError\("ORDER_FORBIDDEN"/);

  assert.match(authClient, /parsed\.pathname === "\/api\/payments\/orders"/);
  assert.match(authClient, /withCallerAbort\(pending, init\.signal \?\? undefined\)/);
});
