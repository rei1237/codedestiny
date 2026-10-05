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
import { createHash } from 'node:crypto';
import { incrementRateLimit } from "../lib/rate-limit.js";
import { getSiteBaseUrl } from "../lib/og-card.js";
import {
  DESTINY_BIAS_OG_FALLBACK_PATH,
  DESTINY_BIAS_SHARE_LANDING_PATH,
  DESTINY_BIAS_SHARE_RATE_LIMIT_WINDOW_MS,
  DestinyBiasShareError,
  buildDestinyBiasOgImageUrl,
  buildDestinyBiasShareLandingUrl,
  buildDestinyBiasShareUrl,
  buildDestinyBiasSharePreviewHtml,
  createDestinyBiasShare,
  destinyBiasShareRateLimitSubject,
  destinyBiasShareRateLimitVerdict,
  findPublicDestinyBiasShare,
  isValidDestinyBiasShareId,
  resolveShareOrigin,
} from "../lib/destiny-bias-share.js";

const FEATURE_KEYS = Object.freeze({
  analyze: "destiny-bias-analyze",
  premiumTheme: "destiny-bias-theme-premium",
  collectionSave: "destiny-bias-collection-save",
  deepProfile: "destiny-bias-deep-profile",
});

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
  // 최애운명은 전면 무료 기능이라 프리미엄 테마도 항상 열려 있다.
  const canUsePremiumTheme = true;
  const canSaveCollection = Boolean(auth);
  return {
    isLoggedIn: Boolean(auth),
    points: Number.isFinite(Number(user?.points)) ? Number(user.points) : 0,
    profileTier: String(user?.profileSubscription?.tier || "free"),
    canUsePremiumTheme,
    canSaveCollection,
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
    <text x="24" y="92" fill="#fde68a" font-size="42" font-weight="800">무료 리딩</text>
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
    User.findById(auth.userId).select("_id").lean(),
    readJson(request),
  ]);

  if (!user) throw createHttpError(401, "로그인이 필요합니다.", { code: "UNAUTHORIZED" });

  // 최애운명은 전면 무료 기능이라 컬렉션 저장 개수 제한도 두지 않는다.

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

  const requestId = String(body?.recordRequestId || '');
  if (requestId && !/^[a-zA-Z0-9_-]{8,100}$/.test(requestId)) throw createHttpError(400, '저장 요청을 확인해 주세요.', { code: 'INVALID_RECORD_REQUEST' });
  // Default _id uniqueness makes the same owner's save request repeatable.
  // Clients predating recordRequestId retain their existing save contract.
  const created = requestId ? await DestinyBiasCard.findOneAndUpdate({
    _id: new mongoose.Types.ObjectId(createHash('sha256').update(`${auth.userId}:${requestId}`).digest('hex').slice(0,24)), userId: payload.userId,
  }, { $setOnInsert: payload }, { upsert: true, new: true }).lean() : await DestinyBiasCard.create(payload);
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
    User.findById(auth.userId).select("profileSubscription points").lean(),
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


/* ---------------- 최애운명(K-POP 케미) 공유 스냅샷 — 게스트 허용 ---------------- */

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(text)));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function shareErrorResponse(error) {
  return json({ ok: false, error: error.code, message: error.message }, { status: error.status || 400 });
}

function buildShareOgUrl(request, shareId) {
  return buildDestinyBiasOgImageUrl({ shareId, origin: new URL(request.url).origin });
}

// 순서: 레이트리밋 → 본문 → 서버 재계산·저장(result-share 라우트와 동일. 본문 파싱 전에 유량을 막는다).
async function handleCreateShare(request, env) {
  await connectDb(env);
  const subject = destinyBiasShareRateLimitSubject(request);
  const limit = await incrementRateLimit({
    subjectHash: await sha256Hex(`destiny-bias-share:${subject}`),
    endpoint: "destiny_bias_share_create",
    windowMs: DESTINY_BIAS_SHARE_RATE_LIMIT_WINDOW_MS,
    env,
  });
  const verdict = destinyBiasShareRateLimitVerdict({ count: limit.count, resetAt: limit.resetAt });
  if (verdict) {
    return json(
      { ok: false, error: verdict.error, message: verdict.message, retryAfterSeconds: verdict.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(verdict.retryAfterSeconds) } },
    );
  }

  const body = await readJson(request);
  try {
    const created = await createDestinyBiasShare({ input: body, requestUrl: request.url, env });
    return json(
      {
        ok: true,
        shareId: created.snapshot.shareId,
        shareUrl: created.shareUrl,
        ogUrl: buildShareOgUrl(request, created.snapshot.shareId),
        snapshot: created.snapshot,
        reused: created.reused,
      },
      { status: created.reused ? 200 : 201 },
    );
  } catch (error) {
    if (error instanceof DestinyBiasShareError) return shareErrorResponse(error);
    throw error;
  }
}

async function handleGetShare(shareId, request, env) {
  if (!isValidDestinyBiasShareId(shareId)) return notFound();
  await connectDb(env);
  const snapshot = await findPublicDestinyBiasShare({ shareId });
  if (!snapshot) return notFound();
  return json(
    { ok: true, snapshot, ogUrl: buildShareOgUrl(request, shareId) },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } },
  );
}

// 크롤러용 미리보기: 결과별 og 메타를 담은 HTML. 사람은 스크립트로 정적 랜딩에 넘어간다.
// 없는·만료된 id 도 랜딩으로 보낸다(랜딩이 만료 안내를 그린다).
async function handleSharePreview(request, env) {
  const url = new URL(request.url);
  const shareId = String(url.searchParams.get("s") || "");
  const origin = resolveShareOrigin({ requestUrl: request.url, env });
  if (!isValidDestinyBiasShareId(shareId)) {
    return new Response(null, { status: 302, headers: { Location: `${origin}${DESTINY_BIAS_SHARE_LANDING_PATH}`, "Cache-Control": "no-store" } });
  }
  const landingUrl = buildDestinyBiasShareLandingUrl({ shareId, origin, searchParams: url.searchParams });
  await connectDb(env);
  const snapshot = await findPublicDestinyBiasShare({ shareId });
  if (!snapshot) {
    return new Response(null, { status: 302, headers: { Location: landingUrl, "Cache-Control": "no-store" } });
  }
  const html = buildDestinyBiasSharePreviewHtml({
    snapshot,
    previewUrl: buildDestinyBiasShareUrl({ shareId, requestUrl: request.url, env }),
    landingUrl,
    ogImageUrl: buildDestinyBiasOgImageUrl({ shareId, origin }),
  });
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=300",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
    },
  });
}

function ogFallbackRedirect(env) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${getSiteBaseUrl(env)}${DESTINY_BIAS_OG_FALLBACK_PATH}`,
      "Cache-Control": "public, max-age=60",
    },
  });
}

// workers-og 는 동적 import — 플레인 node(테스트)에서 .wasm 로딩이 깨지므로 호출 시점에만 올린다.
async function handleShareOgImage(shareId, request, env) {
  if (!isValidDestinyBiasShareId(shareId)) return ogFallbackRedirect(env);
  try {
    await connectDb(env);
    const snapshot = await findPublicDestinyBiasShare({ shareId });
    if (!snapshot) return ogFallbackRedirect(env);
    const { renderDestinyBiasOgPng } = await import("../lib/destiny-bias-share-og.js");
    const brandDomain = new URL(getSiteBaseUrl(env)).hostname;
    const image = await renderDestinyBiasOgPng(snapshot, brandDomain);
    return new Response(image.body, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.warn("[destiny-bias] share og render failed", { shareId, message: String(error?.message || error) });
    return ogFallbackRedirect(env);
  }
}

export async function handleDestinyBiasRoutes(request, env) {
  try {
    const method = String(request.method || "GET").toUpperCase();
    const path = getRoutePath(request, "/api/destiny-bias");

    if (method === "GET" && path === "/og") {
      return handleOgImage(request);
    }

    if (method === "POST" && path === "/share") {
      return await handleCreateShare(request, env);
    }

    if ((method === "GET" || method === "HEAD") && path === "/s") {
      return await handleSharePreview(request, env);
    }

    const shareOgMatch = method === "GET" ? path.match(/^\/share\/([^/]+)\/og\.png$/) : null;
    if (shareOgMatch) {
      return await handleShareOgImage(decodeURIComponent(shareOgMatch[1]), request, env);
    }

    const shareMatch = method === "GET" ? path.match(/^\/share\/([^/]+)$/) : null;
    if (shareMatch) {
      return await handleGetShare(decodeURIComponent(shareMatch[1]), request, env);
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
