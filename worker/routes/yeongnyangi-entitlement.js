/**
 * 영냥이(SoulCat) 결제 증빙 조회·소비 — Service Binding 전용.
 *
 * SoulCat 워커는 자기 결제 경로가 없다. 사용자는 CD `/checkout/?featureKey=yeongnyangi-…` 에서
 * 단건 결제(카드·카카오페이)만 하고, SoulCat 은 이 라우트로 "아직 안 쓴 결제가 있나"를 묻고
 * 책을 만든 뒤 "이 결제를 이 requestId 로 썼다"고 표시한다. 정본은 Payment 한 행이다 —
 * 소비 표식은 `metadata.consumedBy` 하나이고 같은 requestId 재요청은 멱등하게 성공한다.
 *
 * 인증은 사용자 쿠키/토큰 그대로다(SoulCat `sharedIdentity()` 가 그대로 넘긴다). 다른 서비스가
 * 이 상품 키로 증빙을 읽지 못하도록 featureKey 는 `yeongnyangi-` 접두만 받는다.
 */
import { createHttpError, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireUserFromRequest } from "../lib/auth.js";
import { connectDb, mongoose, withMongoRetry } from "../lib/db.js";
import { Payment } from "../lib/models.js";
import { isDirectOnlyPaidFeatureKey, normalizePaidFeatureKey } from "../lib/paid-feature-registry.js";

export const YEONGNYANGI_ENTITLEMENT_PREFIX = "/api/yeongnyangi-entitlement";
const FEATURE_KEY_PATTERN = /^yeongnyangi-[a-z0-9-]+$/;
const PAID_STATUSES = Object.freeze(["paid", "success", "fulfilled"]);
const CONSUMED_SCOPE = "soulcat-book";

function cleanText(value) {
  return String(value ?? "").trim();
}

function objectId(userId) {
  const id = cleanText(userId);
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
}

function resolveFeatureKey(raw) {
  const key = normalizePaidFeatureKey(raw) || cleanText(raw);
  if (!FEATURE_KEY_PATTERN.test(key) || !isDirectOnlyPaidFeatureKey(key)) {
    throw createHttpError(400, "영냥이 상품 키가 아닙니다.", { code: "INVALID_FEATURE_KEY", featureKey: key });
  }
  return key;
}

function presentProof(row) {
  const metadata = row?.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    source: "direct-payment",
    id: cleanText(row.merchantUid) || String(row._id),
    requestId: cleanText(row.requestId) || cleanText(row.idempotencyKey),
    featureKey: cleanText(row.featureKey),
    amountKRW: Number(row.paymentAmount) || 0,
    paidAt: row.paidAt || row.updatedAt || row.createdAt || null,
    consumedBy: cleanText(metadata.consumedBy) || null,
    consumedAt: metadata.consumedAt || null,
  };
}

function baseQuery(userObjectId, featureKey) {
  return {
    userId: userObjectId,
    featureKey,
    paymentType: "digital_content",
    purchaseType: { $ne: "GIFT" },
    status: { $in: PAID_STATUSES },
  };
}

async function listProofs(env, auth, url) {
  const featureKey = resolveFeatureKey(url.searchParams.get("featureKey"));
  const userObjectId = objectId(auth.userId);
  if (!userObjectId) throw createHttpError(401, "Authentication is required.", { code: "UNAUTHORIZED" });
  await connectDb(env);
  const rows = await withMongoRetry(env, () => Payment.find({
    ...baseQuery(userObjectId, featureKey),
    $or: [{ "metadata.consumedBy": { $exists: false } }, { "metadata.consumedBy": null }, { "metadata.consumedBy": "" }],
  }).sort({ paidAt: -1, createdAt: -1 }).limit(20).lean());
  return json({
    ok: true,
    userId: String(auth.userId),
    featureKey,
    proofs: (rows || []).map(presentProof),
  });
}

async function consumeProof(env, auth, request) {
  const body = await readJson(request);
  const paymentId = cleanText(body.paymentId);
  const requestId = cleanText(body.requestId);
  if (!paymentId) throw createHttpError(400, "paymentId 가 필요합니다.", { code: "PAYMENT_ID_REQUIRED" });
  if (!requestId || requestId.length > 160) throw createHttpError(400, "requestId 가 필요합니다.", { code: "REQUEST_ID_REQUIRED" });
  const userObjectId = objectId(auth.userId);
  if (!userObjectId) throw createHttpError(401, "Authentication is required.", { code: "UNAUTHORIZED" });

  const idClauses = [{ merchantUid: paymentId }];
  if (mongoose.Types.ObjectId.isValid(paymentId)) idClauses.push({ _id: new mongoose.Types.ObjectId(paymentId) });
  const ownerQuery = {
    userId: userObjectId,
    featureKey: FEATURE_KEY_PATTERN,
    paymentType: "digital_content",
    purchaseType: { $ne: "GIFT" },
    status: { $in: PAID_STATUSES },
    $or: idClauses,
  };

  await connectDb(env);
  const now = new Date();
  // 1) 미소비 행만 원자적으로 소비한다 — 같은 결제를 두 요청이 동시에 쓰지 못한다.
  const consumed = await withMongoRetry(env, () => Payment.findOneAndUpdate(
    {
      ...ownerQuery,
      $and: [{ $or: [{ "metadata.consumedBy": { $exists: false } }, { "metadata.consumedBy": null }, { "metadata.consumedBy": "" }] }],
    },
    { $set: { "metadata.consumedBy": requestId, "metadata.consumedAt": now, "metadata.consumedScope": CONSUMED_SCOPE } },
    { new: true },
  ).lean());
  if (consumed) {
    return json({ ok: true, idempotent: false, proof: presentProof(consumed) });
  }
  // 2) 이미 소비된 행 — 같은 requestId 면 멱등 성공, 다르면 409.
  const existing = await withMongoRetry(env, () => Payment.findOne(ownerQuery).lean());
  if (!existing) throw createHttpError(404, "결제 증빙을 찾을 수 없습니다.", { code: "PROOF_NOT_FOUND" });
  const consumedBy = cleanText(existing?.metadata?.consumedBy);
  if (consumedBy === requestId) {
    return json({ ok: true, idempotent: true, proof: presentProof(existing) });
  }
  throw createHttpError(409, "이미 다른 요청에 사용된 결제입니다.", { code: "ALREADY_CONSUMED", proof: presentProof(existing) });
}

export async function handleYeongnyangiEntitlementRoutes(request, env) {
  const method = String(request.method || "GET").toUpperCase();
  const path = getRoutePath(request, YEONGNYANGI_ENTITLEMENT_PREFIX);
  try {
    if (path !== "/") return notFound();
    if (method === "GET") {
      const auth = await requireUserFromRequest(request, env);
      return await listProofs(env, auth, new URL(request.url));
    }
    if (method === "POST") {
      const auth = await requireUserFromRequest(request, env);
      return await consumeProof(env, auth, request);
    }
    return methodNotAllowed();
  } catch (error) {
    return handleRouteError(error, { request, env });
  }
}
