import { requireAuth } from "../lib/auth.js";
import { connectDb, mongoose } from "../lib/db.js";
import {
  getRoutePath,
  handleRouteError,
  json,
  methodNotAllowed,
  notFound,
} from "../lib/http.js";
import { DestinyBiasCard } from "../lib/models.js";
import { getSiteBaseUrl } from "../lib/og-card.js";
import {
  DESTINY_BIAS_OG_FALLBACK_PATH,
  DESTINY_BIAS_SHARE_LANDING_PATH,
  buildDestinyBiasOgImageUrl,
  buildDestinyBiasShareLandingUrl,
  buildDestinyBiasShareUrl,
  buildDestinyBiasSharePreviewHtml,
  findPublicDestinyBiasShare,
  isValidDestinyBiasShareId,
  resolveShareOrigin,
} from "../lib/destiny-bias-share.js";

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

function buildShareOgUrl(request, shareId) {
  return buildDestinyBiasOgImageUrl({ shareId, origin: new URL(request.url).origin });
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

function freeStorageDisabled() {
  return json({ ok: false, error: "FREE_RESULT_STORAGE_DISABLED", message: "무료 결과는 서버에 저장하지 않아요. 이미지는 기기에 저장해 주세요." }, { status: 410, headers: { "Cache-Control": "no-store" } });
}

export async function handleDestinyBiasRoutes(request, env) {
  try {
    const method = String(request.method || "GET").toUpperCase();
    const path = getRoutePath(request, "/api/destiny-bias");

    if (method === "GET" && path === "/og") {
      return handleOgImage(request);
    }

    if (method === "POST" && path === "/share") {
      return freeStorageDisabled();
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
      return freeStorageDisabled();
    }

    if (method === "GET" && path === "/cards") {
      return json({ ok: true, items: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 1 }, gates: { canSaveCollection: false, canUsePremiumTheme: true } }, { headers: { "Cache-Control": "no-store" } });
    }

    if (method === "DELETE" && /^\/cards\/[^/]+$/.test(path)) {
      return await handleDeleteCard(path, request, env);
    }

    if (["GET", "POST", "PATCH", "PUT", "DELETE"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    // 예상 밖 DB 오류의 원문은 응답에 노출하지 않는다.
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
