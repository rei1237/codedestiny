import {
  businessProducts,
  businessProduct,
  expiryForOrders,
  saleReason,
  perMinute,
} from "../../lib/business-api/products.mjs";
import examples from "../../lib/business-api/examples.json" with { type: "json" };
import { Payment, BusinessCredential, BusinessMeter } from "../lib/models.js";
import { requireUserFromRequest } from "../lib/auth.js";
import { readBoundedText } from "../lib/request-body.js";
import {
  createPaymentContext,
  withPaymentDb,
  toObjectId,
} from "../payments/db.js";
import { calculate, InvalidInput } from "./calculate.js";

const respond = (body, status = 200, headers = {}) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", ...headers },
  });
const problem = (status, code, message, headers) =>
  respond({ code, message }, status, headers);
const ids = businessProducts.map((p) => p.id);
const orderProjection = {
  merchantUid: 1,
  productId: 1,
  paidAt: 1,
  entitlementGrantedAt: 1,
  status: 1,
};
const hex = (bytes) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
async function digest(key) {
  return hex(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key)),
    ),
  );
}
async function grantedOrders(db, owner, productId) {
  return db.find(
    Payment,
    {
      userId: toObjectId(owner),
      productId,
      status: "paid",
      entitlementGrantedAt: { $ne: null },
    },
    { projection: orderProjection },
  );
}
async function consume(db, owner, productId, limit, now) {
  const key = owner + ":" + productId;
  try {
    await db.updateOne(
      BusinessMeter,
      { _id: key },
      { $setOnInsert: { calls: [], total: 0 } },
      { upsert: true },
    );
  } catch (e) {
    if (e.code !== 11000) throw e;
  }
  const recent = {
    $filter: {
      input: "$calls",
      as: "call",
      cond: { $gt: ["$$call", now - 60000] },
    },
  };
  const result = await db.updateOne(
    BusinessMeter,
    { _id: key, $expr: { $lt: [{ $size: recent }, limit] } },
    [
      {
        $set: {
          calls: { $concatArrays: [recent, [now]] },
          total: { $add: ["$total", 1] },
        },
      },
    ],
  );
  return result.modifiedCount === 1;
}
export async function handleBusinessApi(
  request,
  env,
  { withDb = withPaymentDb, authenticate = requireUserFromRequest } = {},
) {
  const path = new URL(request.url).pathname.slice("/api/business/".length);
  const run = (fn) =>
    withDb(
      env,
      createPaymentContext({
        route: "business-api",
        requestId: crypto.randomUUID(),
      }),
      fn,
    );
  try {
    if (path === "catalog" && request.method === "GET")
      return respond({
        perMinute: perMinute(env),
        products: businessProducts.map((p) => ({
          ...p,
          reason: saleReason(p, env),
          example: examples[p.slug] || null,
        })),
      });
    if (path.startsWith("v1/") && request.method === "POST") {
      const p = businessProduct("business-api-" + path.slice(3));
      if (!p)
        return problem(404, "UNKNOWN_PRODUCT", "상품을 찾을 수 없습니다.");
      if (p.reason) return problem(403, "UNAVAILABLE", p.reason);
      const match = /^Bearer (ggul_([a-f0-9]{24})_[a-f0-9]{64})$/.exec(
        request.headers.get("Authorization") || "",
      );
      if (!match)
        return problem(401, "INVALID_KEY", "서버 API 키를 확인해 주세요.");
      const hash = await digest(match[1]);
      const owner = match[2];
      const rejected = await run(async (db) => {
        if (!(await db.findOne(BusinessCredential, { _id: owner, hash })))
          return problem(
            401,
            "INVALID_KEY",
            "키가 만료되었거나 폐기되었습니다.",
          );
        const expiry = expiryForOrders(await grantedOrders(db, owner, p.id));
        if (!expiry || expiry <= new Date())
          return problem(
            403,
            "NO_ENTITLEMENT",
            "이 상품의 이용 기간을 확인해 주세요.",
          );
        if (!(await consume(db, owner, p.id, perMinute(env), Date.now())))
          return problem(429, "RATE_LIMIT", "분당 호출 한도에 도달했습니다.", {
            "Retry-After": "60",
          });
        return null;
      });
      if (rejected) return rejected;
      const input = JSON.parse(await readBoundedText(request, 8192));
      return respond(await calculate(p.slug, input));
    }
    if (!["dashboard", "key"].includes(path))
      return problem(404, "NOT_FOUND", "경로를 확인해 주세요.");
    const { userId } = await authenticate(request, env);
    const owner = String(userId);
    if (path === "dashboard" && request.method === "GET") {
      return respond(
        await run(async (db) => {
          const orders = await db.find(
            Payment,
            {
              userId: toObjectId(owner),
              productId: { $in: ids },
              status: { $in: ["pending", "paid"] },
            },
            { projection: orderProjection },
          );
          const meters = await db.find(
            BusinessMeter,
            { _id: { $in: ids.map((id) => owner + ":" + id) } },
            { projection: { total: 1 } },
          );
          const key = await db.findOne(
            BusinessCredential,
            { _id: owner },
            { projection: { issuedAt: 1 } },
          );
          return {
            keyIssuedAt: key?.issuedAt || null,
            products: ids.map((id) => {
              const own = orders.filter((o) => o.productId === id);
              return {
                id,
                expiresAt: expiryForOrders(own),
                usage:
                  meters.find((m) => m._id === owner + ":" + id)?.total || 0,
                pending: own
                  .filter((o) => !o.entitlementGrantedAt)
                  .map((o) => o.merchantUid),
              };
            }),
          };
        }),
      );
    }
    if (path === "key" && ["POST", "DELETE"].includes(request.method)) {
      if (!request.headers.get("Content-Type")?.startsWith("application/json"))
        return problem(415, "JSON_REQUIRED", "JSON 요청을 사용해 주세요.");
      if (request.method === "DELETE") {
        await run((db) => db.deleteOne(BusinessCredential, { _id: owner }));
        return respond({ revoked: true });
      }
      const key =
        "ggul_" + owner + "_" + hex(crypto.getRandomValues(new Uint8Array(32)));
      const hash = await digest(key);
      const issued = await run(async (db) => {
        const orders = await db.find(
          Payment,
          {
            userId: toObjectId(owner),
            productId: { $in: ids },
            status: "paid",
            entitlementGrantedAt: { $ne: null },
          },
          { projection: orderProjection },
        );
        if (
          !ids.some(
            (id) =>
              expiryForOrders(orders.filter((o) => o.productId === id)) >
              new Date(),
          )
        )
          return false;
        await db.updateOne(
          BusinessCredential,
          { _id: owner },
          { $set: { hash, issuedAt: new Date() } },
          { upsert: true },
        );
        return true;
      });
      return issued
        ? respond({ key }, 201)
        : problem(403, "NO_ENTITLEMENT", "활성 상품이 필요합니다.");
    }
    return problem(405, "METHOD_NOT_ALLOWED", "요청 방식을 확인해 주세요.");
  } catch (e) {
    if (
      e instanceof SyntaxError ||
      e instanceof InvalidInput ||
      e.code === "REQUEST_BODY_TOO_LARGE"
    )
      return problem(
        400,
        "INVALID_INPUT",
        e instanceof InvalidInput ? e.message : "입력 JSON을 확인해 주세요.",
      );
    if (e.status === 401 || e.statusCode === 401)
      return problem(401, "LOGIN_REQUIRED", "로그인이 필요합니다.");
    return problem(503, "TEMPORARY_FAILURE", "잠시 후 다시 시도해 주세요.");
  }
}
