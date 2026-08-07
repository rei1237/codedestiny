import { requireAuth } from "../lib/auth.js";
import { connectDb, mongoose } from "../lib/db.js";
import {
  createHttpError,
  getRoutePath,
  handleRouteError,
  json,
  methodNotAllowed,
  notFound,
  readJson,
} from "../lib/http.js";
import { DestinyBiasCard, User } from "../lib/models.js";

const FEATURE_KEYS = Object.freeze({
  analyze: "destiny-bias-analyze",
  premiumTheme: "destiny-bias-theme-premium",
  collectionSave: "destiny-bias-collection-save",
  deepProfile: "destiny-bias-deep-profile",
});

const FREE_COLLECTION_LIMIT = 3;
// 회당 결제 정본은 worker/lib/paid-feature-registry.js 의 destiny-bias-analyze(=5,000원)다.
// 여기 상수는 OG 카드에 가격을 렌더할 때만 쓴다(buildDestinyBiasOgSvg).
const DESTINY_BIAS_ANALYZE_COST = 50;

function normalizeText(value, maxLen = 1200) {
  return String(value || "").trim().slice(0, maxLen);
}

function parsePositiveInt(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function normalizeThemeKey(value) {
  const key = normalizeText(value, 40).toLowerCase();
  return key || "moonlight_neon";
}

function isPremiumTier(value) {
  const tier = String(value || "free").toLowerCase();
  return tier === "premium" || tier === "vvip";
}

function normalizeFeatureList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeText(item, 80)).filter(Boolean);
}

function hasFeatureAccess(user, featureKey) {
  if (!user) return false;
  if (isPremiumTier(user?.profileSubscription?.tier)) return true;
  const unlocked = normalizeFeatureList(user?.unlockedFeatures);
  return unlocked.includes(featureKey);
}

function serializeCard(item) {
  return {
    id: String(item?._id || ""),
    userId: String(item?.userId || ""),
    title: normalizeText(item?.title, 160),
    headline: normalizeText(item?.headline, 240),
    summary: normalizeText(item?.summary, 1200),
    themeKey: normalizeThemeKey(item?.themeKey),
    score: Math.max(0, Math.min(100, Number(item?.score || 0))),
    grade: normalizeText(item?.grade, 8),
    reportText: String(item?.reportText || ""),
    canonical: item?.canonical || null,
    sharePayload: item?.sharePayload || null,
    createdAt: item?.createdAt || null,
    updatedAt: item?.updatedAt || null,
  };
}

function parseCardsQuery(request) {
  const url = new URL(request.url);
  return {
    page: parsePositiveInt(url.searchParams.get("page"), 1, 1, 100000),
    limit: parsePositiveInt(url.searchParams.get("limit"), 12, 1, 60),
  };
}

function buildGateState(auth, user) {
  const canUsePremiumTheme = hasFeatureAccess(user, FEATURE_KEYS.premiumTheme);
  const canSaveCollection = Boolean(auth);
  return {
    isLoggedIn: Boolean(auth),
    points: Number.isFinite(Number(user?.points)) ? Number(user.points) : 0,
    profileTier: String(user?.profileSubscription?.tier || "free"),
    canUsePremiumTheme,
    canSaveCollection,
    freeCollectionLimit: FREE_COLLECTION_LIMIT,
    featureKeys: FEATURE_KEYS,
  };
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeOgText(value, fallback, maxLen = 60) {
  const text = String(value || "").trim();
  if (!text) return fallback;
  return text.slice(0, maxLen);
}

function buildDestinyBiasOgSvg(request) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const title = normalizeOgText(params.get("title"), "최애운명 카드", 48);
  const score = normalizeOgText(params.get("score"), "88", 8);
  const grade = normalizeOgText(params.get("grade"), "A", 6);
  const relation = normalizeOgText(params.get("relation"), "운명 공명", 24);
  const price = normalizeOgText(params.get("price"), String(DESTINY_BIAS_ANALYZE_COST), 8);
  const priceWon = `${Math.max(0, Math.floor(Number(price || 0) * 100)).toLocaleString("ko-KR")}원`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Destiny Bias OG">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b132b"/>
      <stop offset="48%" stop-color="#1a2a51"/>
      <stop offset="100%" stop-color="#2a1946"/>
    </linearGradient>
    <radialGradient id="spotA" cx="0.18" cy="0.18" r="0.35">
      <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#fbbf24" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="spotB" cx="0.82" cy="0.2" r="0.34">
      <stop offset="0%" stop-color="#22d3ee" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#22d3ee" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#spotA)"/>
  <rect width="1200" height="630" fill="url(#spotB)"/>

  <rect x="72" y="64" rx="34" ry="34" width="1056" height="502" fill="rgba(13,23,49,0.74)" stroke="rgba(255,255,255,0.22)" stroke-width="2"/>

  <text x="122" y="132" fill="#fcd34d" font-size="28" font-weight="700" letter-spacing="3">MY DESTINY BIAS</text>
  <text x="122" y="198" fill="#ffffff" font-size="62" font-weight="800">${escapeXml(title)}</text>
  <text x="122" y="262" fill="#bfdbfe" font-size="32" font-weight="600">${escapeXml(relation)}</text>

  <g transform="translate(122,330)">
    <rect x="0" y="0" rx="18" ry="18" width="220" height="128" fill="rgba(0,0,0,0.22)" stroke="rgba(255,255,255,0.25)"/>
    <text x="26" y="44" fill="#e2e8f0" font-size="24" font-weight="700">공명 점수</text>
    <text x="26" y="92" fill="#ffffff" font-size="42" font-weight="800">${escapeXml(score)}점</text>
  </g>

  <g transform="translate(366,330)">
    <rect x="0" y="0" rx="18" ry="18" width="190" height="128" fill="rgba(0,0,0,0.22)" stroke="rgba(255,255,255,0.25)"/>
    <text x="24" y="44" fill="#e2e8f0" font-size="24" font-weight="700">등급</text>
    <text x="24" y="92" fill="#ffffff" font-size="42" font-weight="800">${escapeXml(grade)}</text>
  </g>

  <g transform="translate(580,330)">
    <rect x="0" y="0" rx="18" ry="18" width="330" height="128" fill="rgba(0,0,0,0.22)" stroke="rgba(255,255,255,0.25)"/>
    <text x="24" y="44" fill="#fef3c7" font-size="24" font-weight="700">이용 요금</text>
    <text x="24" y="92" fill="#fde68a" font-size="42" font-weight="800">1회 ${escapeXml(priceWon)}</text>
  </g>

  <text x="122" y="520" fill="#cbd5e1" font-size="22" font-weight="600">Code Destiny · 내부 명식 엔진 계산 / 전문가 해석 전용</text>
</svg>`;
}

function handleOgImage(request) {
  return new Response(buildDestinyBiasOgSvg(request), {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}

async function handleCreateCard(request, env) {
  const auth = await requireAuth(request, env);
  await connectDb(env);

  const [user, body] = await Promise.all([
    User.findById(auth.userId)
      .select("unlockedFeatures profileSubscription")
      .lean(),
    readJson(request),
  ]);

  if (!user) throw createHttpError(401, "로그인이 필요합니다.", { code: "UNAUTHORIZED" });

  const canSaveUnlimited = hasFeatureAccess(user, FEATURE_KEYS.collectionSave);
  if (!canSaveUnlimited) {
    const currentCount = await DestinyBiasCard.countDocuments({ userId: auth.userId });
    if (currentCount >= FREE_COLLECTION_LIMIT) {
      throw createHttpError(402, "무료 저장 한도를 초과했습니다. 저장 해금 후 계속 이용해 주세요.", {
        code: "FEATURE_LOCKED",
        featureKey: FEATURE_KEYS.collectionSave,
        freeCollectionLimit: FREE_COLLECTION_LIMIT,
      });
    }
  }

  const payload = {
    userId: new mongoose.Types.ObjectId(auth.userId),
    title: normalizeText(body?.title, 160) || "최애운명 카드",
    headline: normalizeText(body?.headline, 240),
    summary: normalizeText(body?.summary, 1200),
    themeKey: normalizeThemeKey(body?.themeKey),
    score: Math.max(0, Math.min(100, Number(body?.score || 0))),
    grade: normalizeText(body?.grade, 8),
    reportText: String(body?.reportText || "").slice(0, 30000),
    canonical: body?.canonical && typeof body.canonical === "object" ? body.canonical : null,
    sharePayload: body?.sharePayload && typeof body.sharePayload === "object" ? body.sharePayload : null,
    source: "destiny-bias-api",
  };

  if (!payload.reportText && !payload.summary) {
    throw createHttpError(400, "저장할 카드 내용이 비어 있습니다.", { code: "INVALID_CARD_PAYLOAD" });
  }

  const created = await DestinyBiasCard.create(payload);
  return json({ ok: true, item: serializeCard(created) }, { status: 201 });
}

async function handleListCards(request, env) {
  const auth = await requireAuth(request, env);
  await connectDb(env);
  const { page, limit } = parseCardsQuery(request);

  const [items, total, user] = await Promise.all([
    DestinyBiasCard.find({ userId: auth.userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    DestinyBiasCard.countDocuments({ userId: auth.userId }),
    User.findById(auth.userId).select("unlockedFeatures profileSubscription points").lean(),
  ]);

  return json({
    ok: true,
    items: items.map((item) => serializeCard(item)),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    gates: buildGateState(auth, user),
  });
}

async function handleDeleteCard(path, request, env) {
  const auth = await requireAuth(request, env);
  await connectDb(env);

  const id = String(path || "").replace(/^\/cards\//, "").trim();
  if (!mongoose.Types.ObjectId.isValid(id)) return notFound();

  const deleted = await DestinyBiasCard.deleteOne({
    _id: new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(auth.userId),
  });

  if (Number(deleted?.deletedCount || 0) < 1) return notFound();
  return json({ ok: true, deletedId: id });
}

export async function handleDestinyBiasRoutes(request, env) {
  try {
    const method = String(request.method || "GET").toUpperCase();
    const path = getRoutePath(request, "/api/destiny-bias");

    if (method === "GET" && path === "/og") {
      return handleOgImage(request);
    }

    if (method === "POST" && path === "/cards") {
      return await handleCreateCard(request, env);
    }

    if (method === "GET" && path === "/cards") {
      return await handleListCards(request, env);
    }

    if (method === "DELETE" && /^\/cards\/[^/]+$/.test(path)) {
      return await handleDeleteCard(path, request, env);
    }

    if (["GET", "POST", "PATCH", "PUT", "DELETE"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    // exposeMessage 를 켜지 않는다 — 이 라우트가 던지는 것은 전부 createHttpError 라
    // handleRouteError 의 HttpError 분기가 저자 메시지를 그대로 돌려준다(플래그와 무관).
    // 플래그가 실제로 여는 것은 예상 밖 오류의 원문뿐이고, 거기엔 Mongo 토폴로지가 섞인다.
    return handleRouteError(error, {
      request,
      env,
      trace: {
        route: "destiny-bias",
        method: request.method,
      },
    });
  }
}
