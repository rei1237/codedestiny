// 공개 리뷰 API.
//
// 공개 조회는 status:"approved"만 노출한다. 작성은 항상 pending으로 저장되어
// 관리자 승인(worker/routes/admin.js의 /reviews/:id/status)을 거쳐야 보인다.

import { connectDb, withMongoRetry } from "../lib/db.js";
import { readCmsThroughCache } from "../lib/cms-cache.js";
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
  resolveUsageVerification,
} from "../lib/review-eligibility.js";
import { redactReviewPersonalInfo, screenReviewText } from "../lib/review-moderation.js";
import { REVIEW_REWARD_AMOUNT, REVIEW_REWARD_KRW } from "../lib/review-reward.js";

import { normalizeReviewSocialProof } from "../../js/review-sharing.mjs";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const PUBLIC_CACHE_HEADERS = Object.freeze({ "Cache-Control": "public, max-age=60" });
const REVIEW_BASE_FIELDS = "productId productName rating title body quickTags locale isVerifiedPurchase usageSource displayedAt";
// 공개 응답은 보상 지급 여부(boolean)만 쓴다 — 금액·지급자·원장 id 는 읽지도 않는다.
const PUBLIC_REVIEW_PROJECTION = `${REVIEW_BASE_FIELDS} reviewReward.granted`;
// 🔴 본인 응답은 reviewReward 전체를 읽는다. 여기에 reviewReward.granted 를 함께 넣으면 Mongo 가
//    path collision 으로 쿼리를 거부하므로 공개 프로젝션을 그대로 이어 붙이지 않는다.
const OWN_REVIEW_PROJECTION = `${REVIEW_BASE_FIELDS} authorName status adminNote createdAt socialProof reviewReward publicConsent publicConsentAt privacyHold`;
const ANONYMOUS_REVIEW_AUTHOR = "익명의 운세손님";
// 작성기(app/components/review/review-ui.ts)는 이 목록의 부분집합만 보여 준다
// (__tests__/ui/review-consent-flow.test.mjs 가 정적으로 맞춰 본다). 기존 태그는 지우지 않는다 —
// 이미 저장된 후기의 태그가 공개 응답에서 사라진다.
const REVIEW_QUICK_TAGS = new Set([
  "소름 돋게 잘 맞아요",
  "제 성격을 잘 짚었어요",
  "과거 이야기가 정확해요",
  "앞으로의 방향에 도움 됐어요",
  "풀이가 자세해서 좋아요",
  "설명이 이해하기 쉬웠어요",
  "조금 아쉬웠어요",
  "기대와 달랐어요",
  "더 구체적이면 좋겠어요",
]);

// 공개 조회(목록·요약)는 엣지 캐시를 지난다. TTL 은 위 Cache-Control 과 같은 60초라 클라이언트가
// 보던 신선도 계약은 그대로다. 바뀌는 것은 "그 60초를 누가 지키느냐" 뿐이다 — 지금까지는 아무도
// 지키지 않았다. Workers 라우트 응답은 Cloudflare 가 기본적으로 캐시하지 않는다(실측 2026-08-21:
// code-destiny.com/api/reviews 응답에 cf-cache-status 헤더 자체가 없고, 빈 배열 82바이트를
// 돌려주는 데 매번 3.8~5.5초가 걸렸다).
//
// 🔴 캐시 조회는 반드시 connectDb 보다 **앞**이어야 한다. 이 캐시의 목적은 쿼리 시간이 아니라
//    콜드 아이솔레이트의 Mongo 핸드셰이크(워커 실측 833ms)와 왕복(415ms/건)을 통째로 건너뛰는
//    것이기 때문이다. 그래서 connectDb 를 load() 안으로 옮겼다 — 위로 되돌리면 효과가 사라진다.
const PUBLIC_CACHE_TTL_SECONDS = 60;
// 실패했을 때만 쓰는 여유분. DB 가 흔들려도 마지막 성공 응답으로 화면을 살린다.
const PUBLIC_CACHE_STALE_TTL_SECONDS = 900;
const SUPPORTED_LOCALES = new Set(["ko", "ja", "zh", "en"]);

function toText(value) {
  return String(value || "").trim();
}

function parsePositiveInt(value, fallback, max) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return max ? Math.min(parsed, max) : parsed;
}

// 🔴 캐시 키에는 쿼리 파라미터만 들어간다. userId·쿠키·Authorization 이 섞이면 그 순간
//    공개 캐시가 아니라 남의 응답을 나눠주는 장치가 된다(verify:public-api-edge-cache 가 막는다).
function publicCacheHeaders(state) {
  return { ...PUBLIC_CACHE_HEADERS, "X-CD-Cache": state };
}

// stale 은 "DB 가 실패해 옛 값을 내보냈다" 는 뜻이다. 헤더로 구분해 두지 않으면 엣지 캐시가
// 장애를 정상처럼 가린다.
function cacheState(loaded, stale) {
  if (loaded) return "miss";
  return stale ? "stale" : "hit";
}

function buildSort(sortKey) {
  if (sortKey === "rating_desc") return { rating: -1, displayedAt: -1 };
  if (sortKey === "rating_asc") return { rating: 1, displayedAt: -1 };
  return { displayedAt: -1 };
}

// 공개 응답에는 createdByAdmin·adminNote·autoFlagReasons 등 내부 필드를 절대 싣지 않는다.
//
// 🔴 export 하는 이유는 __tests__/worker/review-author-masking.test.js 가 이 함수를 직접
//    불러 "공개 응답에 원본 표시 이름이 실리지 않는다"를 단언하기 때문이다.
export function toPublicReview(doc) {
  return {
    id: String(doc?._id || ""),
    // 공개 후기에는 이름의 일부나 프로필 이미지도 내보내지 않는다. 길이·첫 글자·이미지 URL도
    // 계정 단서가 될 수 있으므로 모든 작성자를 같은 비식별 표기로 고정한다.
    authorName: ANONYMOUS_REVIEW_AUTHOR,
    productId: toText(doc?.productId),
    productName: toText(doc?.productName),
    rating: Number(doc?.rating || 0),
    title: redactReviewPersonalInfo(doc?.title),
    body: redactReviewPersonalInfo(doc?.body),
    quickTags: Array.isArray(doc?.quickTags) ? doc.quickTags.filter((tag) => REVIEW_QUICK_TAGS.has(tag)) : [],
    locale: toText(doc?.locale) || "ko",
    isVerifiedPurchase: Boolean(doc?.isVerifiedPurchase),
    usageSource: toText(doc?.usageSource),
    displayedAt: doc?.displayedAt ? new Date(doc.displayedAt).toISOString() : "",
    // 작성 보상(월정석)을 받은 후기인지 — 카드마다 경제적 이해를 표시하는 데만 쓴다.
    // 🔴 금액·지급 시각·지급자 같은 다른 보상 필드는 공개 응답에 싣지 않는다.
    rewarded: Boolean(doc?.reviewReward?.granted),
  };
}

export function toOwnReview(doc) {
  return {
    ...toPublicReview(doc),
    // 🔴 본인 화면(/api/reviews/mine)은 원본 이름으로 되돌린다 — 자기가 쓴 자기 데이터라
    //    가릴 이유가 없고, 가리면 "내 후기" 목록에서 어느 것이 무엇인지 식별이 어려워진다.
    //    이 한 줄이 spread 뒤에 와야 마스킹을 덮는다.
    authorName: toText(doc?.authorName),
    publicConsent: doc?.publicConsent === true,
    publicConsentAt: doc?.publicConsentAt || null,
    privacyHold: Boolean(doc?.privacyHold),
    socialProof: normalizeReviewSocialProof(doc?.socialProof?.platform, doc?.socialProof?.url),
    reviewReward: { granted: Boolean(doc?.reviewReward?.granted), amount: Number(doc?.reviewReward?.amount || 0), grantedAt: doc?.reviewReward?.grantedAt || null },
    status: toText(doc?.status),
    adminNote: toText(doc?.adminNote),
    createdAt: doc?.createdAt ? new Date(doc.createdAt).toISOString() : "",
  };
}

async function aggregateSummary(env, matchStage) {
  const rows = await withMongoRetry(env, () => Review.aggregate([
    { $match: { status: PUBLIC_REVIEW_STATUS, publicConsent: { $ne: false }, privacyHold: { $ne: true }, ...matchStage } },
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
  const url = new URL(request.url);
  const productId = toText(url.searchParams.get("productId"));
  const sortKey = toText(url.searchParams.get("sort")) || "latest";
  const verifiedOnly = ["1", "true", "yes"].includes(toText(url.searchParams.get("verifiedOnly")).toLowerCase());
  const page = parsePositiveInt(url.searchParams.get("page"), 1);
  const limit = parsePositiveInt(url.searchParams.get("limit"), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

  if (productId && !getReviewProduct(productId)) {
    throw createHttpError(400, "존재하지 않는 상품입니다.", { code: "UNKNOWN_PRODUCT" });
  }

  const filter = { status: PUBLIC_REVIEW_STATUS, publicConsent: { $ne: false }, privacyHold: { $ne: true } };
  if (productId) filter.productId = productId;
  if (verifiedOnly) filter.isVerifiedPurchase = true;

  let loaded = false;
  const { value, stale } = await readCmsThroughCache({
    // v2: toPublicReview 에 usageSource 가 생겼다. 키를 올리지 않으면 배포 직후 최대
    // stale 창(15분) 동안 그 필드가 빠진 옛 응답이 나간다.
    // 🔴 v3: authorName 을 마스킹했다. 여기를 안 올리면 배포 직후 stale 창 동안
    //    **마스킹 안 된 원본 이름이 그대로 서빙된다** — 캐시가 개인정보 조치를 무효화한다.
    // v5: toPublicReview 에 rewarded 가 생겼다. 안 올리면 stale 창 동안 보상 표시가 빠진 카드가 나간다.
    key: `reviews:list:v5:${productId}:${sortKey}:${verifiedOnly ? "verified" : "all"}:${page}:${limit}`,
    ttlSeconds: PUBLIC_CACHE_TTL_SECONDS,
    staleTtlSeconds: PUBLIC_CACHE_STALE_TTL_SECONDS,
    load: async () => {
      loaded = true;
      await connectDb(env);
      // 이 요청 하나가 공유 admission 슬롯을 2개 동시에 먹는다(withMongoRetry 가 두 번 불린다).
      // 캐시 히트면 슬롯을 아예 건드리지 않는다.
      const [items, total] = await Promise.all([
        withMongoRetry(env, () => Review.find(filter)
          .select(PUBLIC_REVIEW_PROJECTION)
          .sort(buildSort(sortKey))
          .skip((page - 1) * limit)
          .limit(limit)
          .lean()),
        withMongoRetry(env, () => Review.countDocuments(filter)),
      ]);

      return {
        ok: true,
        items: (Array.isArray(items) ? items : []).map(toPublicReview),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      };
    },
  });

  return json(value, { headers: publicCacheHeaders(cacheState(loaded, stale)) });
}

async function handleSummary(request, env) {
  const url = new URL(request.url);
  const productId = toText(url.searchParams.get("productId"));
  // 결정 지점 신뢰 블록은 구매 인증 후기만 센다. 운영진 등록 후기는 isVerifiedPurchase:false 로
  // 저장되므로(admin.js) 이 조건 하나로 빠진다. 목록(handleList)의 verifiedOnly 와 같은 뜻이다.
  const verifiedOnly = ["1", "true", "yes"].includes(toText(url.searchParams.get("verifiedOnly")).toLowerCase());
  if (productId && !getReviewProduct(productId)) {
    throw createHttpError(400, "존재하지 않는 상품입니다.", { code: "UNKNOWN_PRODUCT" });
  }

  let loaded = false;
  const { value, stale } = await readCmsThroughCache({
    // v3: verifiedOnly 가 생겼다. 키에 넣지 않으면 전체 집계와 인증 집계가 서로의 캐시를 덮는다.
    key: `reviews:summary:v3:${productId}:${verifiedOnly ? 1 : 0}`,
    ttlSeconds: PUBLIC_CACHE_TTL_SECONDS,
    staleTtlSeconds: PUBLIC_CACHE_STALE_TTL_SECONDS,
    load: async () => {
      loaded = true;
      await connectDb(env);
      const summary = await aggregateSummary(env, {
        ...(productId ? { productId } : {}),
        ...(verifiedOnly ? { isVerifiedPurchase: true } : {}),
      });
      return { ok: true, productId, verifiedOnly, ...summary };
    },
  });

  return json(value, { headers: publicCacheHeaders(cacheState(loaded, stale)) });
}

async function handleProducts(env) {
  await connectDb(env);

  const products = listReviewProductSummaries();

  let statsByProduct = new Map();
  try {
    const rows = await withMongoRetry(env, () => Review.aggregate([
      { $match: { status: PUBLIC_REVIEW_STATUS, publicConsent: { $ne: false }, privacyHold: { $ne: true } } },
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
    rewardPolicy: { amount: REVIEW_REWARD_AMOUNT, valueKRW: REVIEW_REWARD_KRW, currency: "moonstone", trigger: "approved" },
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
    .select(OWN_REVIEW_PROJECTION)
    .sort({ createdAt: -1 })
    .limit(MAX_PAGE_SIZE)
    .lean());

  return json({ ok: true, items: (Array.isArray(items) ? items : []).map(toOwnReview) });
}

async function handleCreate(request, env) {
  const auth = await resolveAuth(request, env);
  await connectDb(env);

  const body = await readJson(request);
  const submissionId = toText(body?.submissionId);
  if (submissionId && !/^[a-f0-9]{24}$/.test(submissionId)) throw createHttpError(400, "신청 정보를 새로고침한 뒤 다시 제출해 주세요.", { code: "INVALID_SUBMISSION_ID" });
  const socialProof = normalizeReviewSocialProof(body?.socialProof?.platform, body?.socialProof?.url);
  if (!socialProof) throw createHttpError(400, "선택한 SNS의 HTTPS 후기 게시글 주소를 입력해 주세요.", { code: "INVALID_SOCIAL_PROOF" });
  if (socialProof.url && body?.socialProof?.disclosed !== true) throw createHttpError(400, "SNS 후기에 보상 이벤트 참여 사실을 표시해 주세요.", { code: "DISCLOSURE_REQUIRED" });
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
  if (reviewBody.length > REVIEW_BODY_MAX_LENGTH) {
    throw createHttpError(400, `후기는 ${REVIEW_BODY_MAX_LENGTH}자 이하로 작성해 주세요.`, { code: "BODY_TOO_LONG" });
  }

  const title = toText(body?.title).slice(0, REVIEW_TITLE_MAX_LENGTH);
  const quickTags = [...new Set(Array.isArray(body?.quickTags) ? body.quickTags.map(toText) : [])]
    .filter((tag) => REVIEW_QUICK_TAGS.has(tag))
    .slice(0, REVIEW_QUICK_TAGS.size);
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
  // 🔴 true 를 박지 않는다 — 어떤 기록으로 자격을 얻었는지에 따라 배지가 갈려야 한다.
  // 판정 정본은 review-eligibility 에 있다(소스 이름이 거기서만 정의되기 때문).
  const { isVerifiedPurchase, usageSource } = resolveUsageVerification(usage);
  const screening = screenReviewText({ title, body: reviewBody, isVerifiedPurchase });
  const requestedPublicConsent = body?.publicConsent === true;
  const privacyHold = screening.flags.includes("personal_info");
  const publicConsent = requestedPublicConsent && !privacyHold;

  try {
    const doc = await Review.create({
      ...(submissionId ? { _id: submissionId } : {}),
      socialProof: { ...socialProof, disclosed: Boolean(socialProof.url && body?.socialProof?.disclosed === true) },
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
      quickTags,
      publicConsent,
      publicConsentAt: publicConsent ? new Date() : null,
      privacyHold,
      locale,
      status: "pending",
      isVerifiedPurchase,
      usageSource,
      createdByAdmin: false,
      autoFlagReasons: screening.flags,
      displayedAt: new Date(),
    });

    return json({
      ok: true,
      status: "pending",
      id: String(doc?._id || ""),
      message: "리뷰가 등록되었습니다. 검토 후 반영됩니다.",
      publicConsent,
      privacyHold,
      rewardStatus: publicConsent || socialProof.url ? "pending_review" : "public_consent_required",
    }, { status: 201 });
  } catch (error) {
    if (Number(error?.code) === 11000) {
      if (submissionId) {
        const existing = await Review.findOne({ _id: submissionId, userId: String(auth.userId) }).select("productId rating title body quickTags publicConsent status socialProof").lean();
        if (existing && existing.productId === productId && existing.rating === rating && existing.title === title && existing.body === reviewBody && JSON.stringify(existing.quickTags || []) === JSON.stringify(quickTags) && Boolean(existing.publicConsent) === publicConsent && (existing.socialProof?.url || "") === socialProof.url && (existing.socialProof?.platform || "") === socialProof.platform) {
          return json({ ok: true, id: submissionId, status: existing.status, idempotent: true });
        }
      }
      throw createHttpError(409, "이미 접수된 신청인지 내역을 확인해 주세요. 새 후기 제출이 계속 안 되면 고객센터로 문의해 주세요.", { code: "DUPLICATE_REVIEW" });
    }
    throw error;
  }
}

function reviewIdFromPath(path) {
  const matched = String(path || "").match(/^\/([a-f0-9]{24})$/i);
  return matched ? matched[1] : "";
}

async function handleOwnUpdate(path, request, env) {
  const auth = await resolveAuth(request, env);
  await connectDb(env);
  const id = reviewIdFromPath(path);
  if (!id) return notFound();
  const current = await withMongoRetry(env, () => Review.findOne({ _id: id, userId: String(auth.userId) }).lean());
  if (!current) return notFound();
  const body = await readJson(request);
  const update = {};
  let contentChanged = false;

  if (body?.rating !== undefined) {
    const rating = Number.parseInt(String(body.rating), 10);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) throw createHttpError(400, "별점을 1~5 사이로 선택해 주세요.", { code: "INVALID_RATING" });
    update.rating = rating; contentChanged = rating !== current.rating;
  }
  if (typeof body?.body === "string") {
    const nextBody = toText(body.body);
    if (nextBody.length > REVIEW_BODY_MAX_LENGTH) throw createHttpError(400, `후기는 ${REVIEW_BODY_MAX_LENGTH}자 이하로 작성해 주세요.`, { code: "BODY_TOO_LONG" });
    update.body = nextBody; contentChanged = contentChanged || nextBody !== toText(current.body);
  }
  if (Array.isArray(body?.quickTags)) {
    const nextTags = [...new Set(body.quickTags.map(toText))].filter((tag) => REVIEW_QUICK_TAGS.has(tag)).slice(0, REVIEW_QUICK_TAGS.size);
    update.quickTags = nextTags; contentChanged = contentChanged || JSON.stringify(nextTags) !== JSON.stringify(current.quickTags || []);
  }
  if (body?.socialProof !== undefined) {
    const proof = normalizeReviewSocialProof(body.socialProof?.platform, body.socialProof?.url);
    if (!proof) throw createHttpError(400, "선택한 SNS의 HTTPS 후기 게시글 주소를 입력해 주세요.", { code: "INVALID_SOCIAL_PROOF" });
    if (proof.url && body.socialProof?.disclosed !== true) throw createHttpError(400, "SNS 후기에 보상 이벤트 참여 사실을 표시해 주세요.", { code: "DISCLOSURE_REQUIRED" });
    update.socialProof = { ...proof, disclosed: Boolean(proof.url && body.socialProof?.disclosed === true) };
  }

  if (body?.publicConsent !== undefined) {
    const consent = body.publicConsent === true;
    if (consent) {
      const screening = screenReviewText({ title: current.title, body: update.body ?? current.body, isVerifiedPurchase: Boolean(current.isVerifiedPurchase) });
      if (screening.flags.includes("personal_info")) {
        update.publicConsent = false; update.publicConsentAt = null; update.privacyHold = true;
      } else {
        update.publicConsent = true; update.publicConsentAt = new Date(); update.privacyHold = false;
        if (current.publicConsent !== true && current.status === PUBLIC_REVIEW_STATUS) update.status = "pending";
      }
    } else {
      update.publicConsent = false; update.publicConsentAt = null;
    }
  }

  if (contentChanged) {
    const screening = screenReviewText({ title: current.title, body: update.body ?? current.body, isVerifiedPurchase: Boolean(current.isVerifiedPurchase) });
    update.autoFlagReasons = screening.flags;
    update.privacyHold = screening.flags.includes("personal_info");
    if (current.status === PUBLIC_REVIEW_STATUS) update.status = "pending";
  }
  if (!Object.keys(update).length) throw createHttpError(400, "수정할 내용이 없습니다.", { code: "NO_CHANGES" });
  const doc = await withMongoRetry(env, () => Review.findOneAndUpdate({ _id: id, userId: String(auth.userId) }, { $set: update }, { new: true }).lean());
  return json({ ok: true, item: toOwnReview(doc), privacyHold: Boolean(doc?.privacyHold) });
}

async function handleOwnDelete(path, request, env) {
  const auth = await resolveAuth(request, env);
  await connectDb(env);
  const id = reviewIdFromPath(path);
  if (!id) return notFound();
  // 보상 원장과 중복 검증 이력은 보존하고 공개·본인 목록에서 숨기는 소프트 삭제다.
  const doc = await withMongoRetry(env, () => Review.findOneAndUpdate(
    { _id: id, userId: String(auth.userId) },
    { $set: { status: "hidden", publicConsent: false, publicConsentAt: null } },
    { new: true },
  ).lean());
  if (!doc) return notFound();
  return json({ ok: true, item: toOwnReview(doc) });
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

    if (reviewIdFromPath(path)) {
      if (method === "PATCH") return await handleOwnUpdate(path, request, env);
      if (method === "DELETE") return await handleOwnDelete(path, request, env);
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
