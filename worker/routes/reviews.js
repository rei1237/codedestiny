// 공개 리뷰 API.
//
// 공개 조회는 status:"approved"만 노출한다. 작성은 항상 pending으로 저장되어
// 관리자 승인(worker/routes/admin.js의 /reviews/:id/status)을 거쳐야 보인다.

import { connectDb, withMongoRetry } from "../lib/db.js";
import { isAuthDbInfraError, requireUserFromRequest } from "../lib/auth.js";
import { User } from "../lib/models.js";
import {
  createHttpError,
  getRoutePath,
  handleRouteError,
  json,
  methodNotAllowed,
  notFound,
  readJson,
} from "../lib/http.js";
import {
  PUBLIC_REVIEW_STATUS,
  REVIEW_BODY_MAX_LENGTH,
  REVIEW_BODY_MIN_LENGTH,
  REVIEW_TITLE_MAX_LENGTH,
  Review,
} from "../lib/review-models.js";
import {
  getReviewProduct,
  listReviewProductSummaries,
} from "../lib/review-product-catalog.js";
import {
  findUsedReviewProduct,
  listReviewableProducts,
} from "../lib/review-eligibility.js";
import { screenReviewText } from "../lib/review-moderation.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const PUBLIC_CACHE_HEADERS = Object.freeze({ "Cache-Control": "public, max-age=60" });
const SUPPORTED_LOCALES = new Set(["ko", "ja", "zh", "en"]);

function toText(value) {
  return String(value || "").trim();
}

function parsePositiveInt(value, fallback, max) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return max ? Math.min(parsed, max) : parsed;
}

function buildSort(sortKey) {
  if (sortKey === "rating_desc") return { rating: -1, displayedAt: -1 };
  if (sortKey === "rating_asc") return { rating: 1, displayedAt: -1 };
  return { displayedAt: -1 };
}

// 공개 응답에는 createdByAdmin·adminNote·autoFlagReasons 등 내부 필드를 절대 싣지 않는다.
function toPublicReview(doc) {
  return {
    id: String(doc?._id || ""),
    authorName: toText(doc?.authorName),
    authorImage: toText(doc?.authorImage),
    productId: toText(doc?.productId),
    productName: toText(doc?.productName),
    rating: Number(doc?.rating || 0),
    title: toText(doc?.title),
    body: toText(doc?.body),
    locale: toText(doc?.locale) || "ko",
    isVerifiedPurchase: Boolean(doc?.isVerifiedPurchase),
    displayedAt: doc?.displayedAt ? new Date(doc.displayedAt).toISOString() : "",
  };
}

function toOwnReview(doc) {
  return {
    ...toPublicReview(doc),
    status: toText(doc?.status),
    adminNote: toText(doc?.adminNote),
    createdAt: doc?.createdAt ? new Date(doc.createdAt).toISOString() : "",
  };
}

async function aggregateSummary(env, matchStage) {
  const rows = await withMongoRetry(env, () => Review.aggregate([
    { $match: { status: PUBLIC_REVIEW_STATUS, ...matchStage } },
    { $group: { _id: "$rating", count: { $sum: 1 } } },
  ]));

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  let sum = 0;

  for (const row of Array.isArray(rows) ? rows : []) {
    const rating = Number(row?._id || 0);
    const count = Number(row?.count || 0);
    if (rating < 1 || rating > 5) continue;
    distribution[rating] = count;
    total += count;
    sum += rating * count;
  }

  return {
    total,
    average: total ? Math.round((sum / total) * 10) / 10 : 0,
    distribution,
  };
}

async function handleList(request, env) {
  await connectDb(env);

  const url = new URL(request.url);
  const productId = toText(url.searchParams.get("productId"));
  const sortKey = toText(url.searchParams.get("sort")) || "latest";
  const verifiedOnly = ["1", "true", "yes"].includes(toText(url.searchParams.get("verifiedOnly")).toLowerCase());
  const page = parsePositiveInt(url.searchParams.get("page"), 1);
  const limit = parsePositiveInt(url.searchParams.get("limit"), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

  if (productId && !getReviewProduct(productId)) {
    throw createHttpError(400, "존재하지 않는 상품입니다.", { code: "UNKNOWN_PRODUCT" });
  }

  const filter = { status: PUBLIC_REVIEW_STATUS };
  if (productId) filter.productId = productId;
  if (verifiedOnly) filter.isVerifiedPurchase = true;

  const [items, total] = await Promise.all([
    withMongoRetry(env, () => Review.find(filter)
      .sort(buildSort(sortKey))
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()),
    withMongoRetry(env, () => Review.countDocuments(filter)),
  ]);

  return json({
    ok: true,
    items: (Array.isArray(items) ? items : []).map(toPublicReview),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  }, { headers: PUBLIC_CACHE_HEADERS });
}

async function handleSummary(request, env) {
  await connectDb(env);

  const url = new URL(request.url);
  const productId = toText(url.searchParams.get("productId"));
  if (productId && !getReviewProduct(productId)) {
    throw createHttpError(400, "존재하지 않는 상품입니다.", { code: "UNKNOWN_PRODUCT" });
  }

  const summary = await aggregateSummary(env, productId ? { productId } : {});
  return json({ ok: true, productId, ...summary }, { headers: PUBLIC_CACHE_HEADERS });
}

async function handleProducts(env) {
  await connectDb(env);

  const products = listReviewProductSummaries();

  let statsByProduct = new Map();
  try {
    const rows = await withMongoRetry(env, () => Review.aggregate([
      { $match: { status: PUBLIC_REVIEW_STATUS } },
      { $group: { _id: "$productId", total: { $sum: 1 }, sum: { $sum: "$rating" } } },
    ]));
    statsByProduct = new Map((Array.isArray(rows) ? rows : []).map((row) => [
      toText(row?._id),
      {
        total: Number(row?.total || 0),
        average: Number(row?.total) ? Math.round((Number(row.sum) / Number(row.total)) * 10) / 10 : 0,
      },
    ]));
  } catch {
    // 집계 실패 시 카탈로그만이라도 내려준다 — 관리자 상품 선택 드롭다운이 죽지 않게.
    statsByProduct = new Map();
  }

  return json({
    ok: true,
    items: products.map((product) => ({
      ...product,
      total: statsByProduct.get(product.productId)?.total || 0,
      average: statsByProduct.get(product.productId)?.average || 0,
    })),
  }, { headers: PUBLIC_CACHE_HEADERS });
}

async function resolveAuth(request, env) {
  // 🔴 requireUserFromRequest를 withMongoRetry로 감싸지 말 것 — 내부에서 이미 재시도한다.
  const auth = await requireUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth?.userId) throw createHttpError(401, "로그인이 필요합니다.", { code: "UNAUTHORIZED" });
  return auth;
}

async function handleEligibility(request, env) {
  const auth = await resolveAuth(request, env);
  await connectDb(env);

  const items = await listReviewableProducts({ userId: auth.userId, env });
  return json({ ok: true, items });
}

async function handleMine(request, env) {
  const auth = await resolveAuth(request, env);
  await connectDb(env);

  const items = await withMongoRetry(env, () => Review.find({ userId: String(auth.userId) })
    .sort({ createdAt: -1 })
    .limit(MAX_PAGE_SIZE)
    .lean());

  return json({ ok: true, items: (Array.isArray(items) ? items : []).map(toOwnReview) });
}

async function handleCreate(request, env) {
  const auth = await resolveAuth(request, env);
  await connectDb(env);

  const body = await readJson(request);
  const productId = toText(body?.productId);
  const product = getReviewProduct(productId);
  if (!product) {
    throw createHttpError(400, "존재하지 않는 상품입니다.", { code: "UNKNOWN_PRODUCT" });
  }

  const rating = Number.parseInt(String(body?.rating || ""), 10);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw createHttpError(400, "별점을 1~5 사이로 선택해 주세요.", { code: "INVALID_RATING" });
  }

  const reviewBody = toText(body?.body);
  if (reviewBody.length < REVIEW_BODY_MIN_LENGTH) {
    throw createHttpError(400, `후기는 ${REVIEW_BODY_MIN_LENGTH}자 이상 작성해 주세요.`, { code: "BODY_TOO_SHORT" });
  }
  if (reviewBody.length > REVIEW_BODY_MAX_LENGTH) {
    throw createHttpError(400, `후기는 ${REVIEW_BODY_MAX_LENGTH}자 이하로 작성해 주세요.`, { code: "BODY_TOO_LONG" });
  }

  const title = toText(body?.title).slice(0, REVIEW_TITLE_MAX_LENGTH);
  const localeRaw = toText(body?.locale).toLowerCase();
  const locale = SUPPORTED_LOCALES.has(localeRaw) ? localeRaw : "ko";

  // 🔴 구매 여부는 클라이언트 입력을 믿지 않고 서버가 다시 조회한다.
  // 두 조회는 서로 독립이라 병렬로 실행한다.
  const [usage, userDoc] = await Promise.all([
    findUsedReviewProduct({ userId: auth.userId, productId, env }),
    withMongoRetry(env, () => User.findById(auth.userId)
      .select("name profileImage")
      .lean()).catch(() => null),
  ]);
  if (!usage) {
    throw createHttpError(403, "이 상품을 구매한 사용자만 리뷰를 작성할 수 있습니다.", { code: "PURCHASE_REQUIRED" });
  }

  const authorName = toText(userDoc?.name) || toText(auth.name) || "코드데스티니 이용자";
  const screening = screenReviewText({ title, body: reviewBody, isVerifiedPurchase: true });

  try {
    const doc = await Review.create({
      userId: String(auth.userId),
      authorName: authorName.slice(0, 40),
      authorImage: toText(userDoc?.profileImage).slice(0, 500),
      productId: product.productId,
      productName: product.name,
      featureKey: toText(usage.featureKey).slice(0, 120),
      orderId: toText(usage.orderId).slice(0, 160),
      rating,
      title,
      body: reviewBody,
      locale,
      status: "pending",
      isVerifiedPurchase: true,
      createdByAdmin: false,
      autoFlagReasons: screening.flags,
      displayedAt: new Date(),
    });

    return json({
      ok: true,
      status: "pending",
      id: String(doc?._id || ""),
      message: "리뷰가 등록되었습니다. 검토 후 반영됩니다.",
    }, { status: 201 });
  } catch (error) {
    if (Number(error?.code) === 11000) {
      throw createHttpError(409, "이미 이 상품에 리뷰를 남기셨습니다.", { code: "DUPLICATE_REVIEW" });
    }
    throw error;
  }
}

export async function handleReviewRoutes(request, env) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/reviews");

    if (path === "/") {
      if (method === "GET") return await handleList(request, env);
      if (method === "POST") return await handleCreate(request, env);
      return methodNotAllowed();
    }

    if (path === "/summary") {
      if (method === "GET") return await handleSummary(request, env);
      return methodNotAllowed();
    }

    if (path === "/products") {
      if (method === "GET") return await handleProducts(env);
      return methodNotAllowed();
    }

    if (path === "/eligibility") {
      if (method === "GET") return await handleEligibility(request, env);
      return methodNotAllowed();
    }

    if (path === "/mine") {
      if (method === "GET") return await handleMine(request, env);
      return methodNotAllowed();
    }

    if (["GET", "POST", "PATCH", "PUT", "DELETE"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    // 일시적 DB 장애를 확정 401로 세탁하면 로그인 사용자가 로그아웃된다(ghost login 회귀).
    if (isAuthDbInfraError(error)) {
      return json({
        ok: false,
        error: "service_unavailable",
        message: "일시적으로 리뷰 서비스를 이용할 수 없습니다. 잠시 후 다시 시도해 주세요.",
      }, { status: 503 });
    }
    return handleRouteError(error);
  }
}
