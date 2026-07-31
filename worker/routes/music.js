import { getOptionalUserFromRequest } from "../lib/auth.js";
import { canAccessPaidFeaturesBatch, PAID_FEATURE_ACCESS_USER_PROJECTION } from "../lib/paid-feature-access.js";
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound } from "../lib/http.js";
import {
  buildMusicTrackFeatureKey,
  getMusicTrackAccessPolicy,
  isValidMusicAudioSourceKey,
  normalizeMusicAudioSourceKey,
  MUSIC_PREVIEW_MAX_BYTES,
  MUSIC_PREVIEW_LIMIT_SECONDS,
  MUSIC_TRACK_UNLOCK_COIN_COST,
  MUSIC_TRACK_UNLOCK_PRICE_KRW,
} from "../../lib/music-access-policy.js";

const MUSIC_PREVIEW_CACHE_SECONDS = 3600;

// 업스트림이 Range를 무시하고 전체 파일을 보내더라도 maxBytes에서 스트림을 끊어 곡 전체 유출을 방지한다.
function capByteStream(readable, maxBytes) {
  if (!readable) return readable;
  let remaining = Math.max(0, Number(maxBytes) || 0);
  const transform = new TransformStream({
    transform(chunk, controller) {
      if (remaining <= 0) return;
      if (chunk.byteLength <= remaining) {
        controller.enqueue(chunk);
        remaining -= chunk.byteLength;
      } else {
        controller.enqueue(chunk.slice(0, remaining));
        remaining = 0;
        controller.terminate();
      }
    },
  });
  return readable.pipeThrough(transform);
}

function encodeR2ObjectKey(objectKey) {
  return String(objectKey || "")
    .replace(/^\/+/, "")
    .split("/")
    .map((segment) => {
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch {
        return encodeURIComponent(segment);
      }
    })
    .join("/");
}

function buildMusicPublicUrl(env, objectKey) {
  const baseUrl = String(
    env?.NEXT_PUBLIC_MUSIC_BASE_URL
      || env?.MUSIC_PUBLIC_BASE_URL
      || env?.MUSIC_BASE_URL
      || "https://music.code-destiny.com",
  ).trim().replace(/\/+$/, "");
  return `${baseUrl}/${encodeR2ObjectKey(objectKey)}`;
}

function resolveRequestTrack(request, body = {}) {
  const url = new URL(request.url);
  const key = normalizeMusicAudioSourceKey(body.audioSourceKey || body.key || url.searchParams.get("key"));
  const featureKey = String(body.featureKey || url.searchParams.get("featureKey") || "").trim();
  const trackId = String(body.trackId || url.searchParams.get("trackId") || "").trim();
  return { key, featureKey, trackId };
}

function buildMusicRouteUrl(path, key, featureKey) {
  const search = new URLSearchParams();
  search.set("key", key);
  if (featureKey) search.set("featureKey", featureKey);
  return `/api/music/${path}?${search.toString()}`;
}

// 이용권/월정구독처럼 "구매가 아닌 커버"로 열린 접근. 다운로드는 이 접근으로 허용하지 않는다.
const LICENSE_COVERED_TYPES = new Set(["license", "license_pass", "monthly_subscription"]);

function buildInvalidTrackEntry(input = {}) {
  return {
    trackId: String(input.trackId || ""),
    audioSourceKey: String(input.key || ""),
    featureKey: String(input.featureKey || ""),
    accessTier: "invalid",
    hasFullAccess: false,
    canDownload: false,
    previewLimitSeconds: MUSIC_PREVIEW_LIMIT_SECONDS,
    priceKRW: MUSIC_TRACK_UNLOCK_PRICE_KRW,
    coinCost: MUSIC_TRACK_UNLOCK_COIN_COST,
    code: "INVALID_TRACK",
  };
}

// 순수 계산 — DB를 건드리지 않고 트랙의 유효성·정책·featureKey만 확정한다.
function resolveTrackPlan(input = {}) {
  const trackId = String(input.trackId || "");
  const key = normalizeMusicAudioSourceKey(input.key);
  const requestedFeatureKey = String(input.featureKey || "").trim();
  const computedFeatureKey = buildMusicTrackFeatureKey(key);

  if (!isValidMusicAudioSourceKey(key) || (!computedFeatureKey && requestedFeatureKey)) {
    return { trackId, key, featureKey: "", entry: buildInvalidTrackEntry(input) };
  }

  const policy = getMusicTrackAccessPolicy(key);
  const featureKey = policy.purchaseFeatureKey || computedFeatureKey || "";

  if (featureKey && requestedFeatureKey && requestedFeatureKey !== featureKey) {
    return {
      trackId,
      key,
      featureKey: "",
      entry: {
        ...buildInvalidTrackEntry(input),
        audioSourceKey: key,
        featureKey: requestedFeatureKey,
        code: "FEATURE_KEY_MISMATCH",
      },
    };
  }

  if (policy.hasFreeFullAccess) {
    // 다운로드 결제 게이트가 켜진 트랙: 재생은 무료로 열되(freeFullPlayback) 다운로드 권한은 구매 판정으로 정한다.
    // featureKey를 남겨 canAccessPaidFeaturesBatch 경로(lockedPlans)로 흐르게 한다.
    if (policy.downloadRequiresPurchase && featureKey) {
      return { trackId, key, featureKey, policy, freeFullPlayback: true };
    }
    return {
      trackId,
      key,
      featureKey: "",
      entry: {
        trackId,
        audioSourceKey: key,
        featureKey: "",
        accessTier: policy.accessTier,
        hasFullAccess: true,
        canDownload: true,
        previewLimitSeconds: null,
        priceKRW: null,
        coinCost: null,
        audioUrl: buildMusicRouteUrl("audio", key, ""),
        downloadUrl: buildMusicRouteUrl("download", key, ""),
        code: "FREE_FULL_ACCESS",
      },
    };
  }

  return { trackId, key, featureKey, policy };
}

function buildLockedTrackEntry(plan, decision, authenticated) {
  const { trackId, key, featureKey, policy, freeFullPlayback } = plan;
  // 이용권/월정구독 커버는 "기간형 재생권"이다 — MP3 다운로드는 실제 구매(단건결제·월정석)에만 허용한다.
  const purchased = decision?.allowed === true && !LICENSE_COVERED_TYPES.has(String(decision?.licenseType || ""));
  // 재생: freeFullPlayback 트랙은 구매와 무관하게 항상 전곡 재생 가능. 그 외 잠금곡은 구매/커버로 열린다.
  const hasFullAccess = freeFullPlayback === true ? true : (decision?.allowed === true);
  const canDownload = purchased;

  return {
    trackId,
    audioSourceKey: key,
    featureKey,
    accessTier: hasFullAccess ? "free_full" : policy.accessTier,
    hasFullAccess,
    canDownload,
    previewLimitSeconds: hasFullAccess ? null : policy.previewLimitSeconds,
    priceKRW: policy.priceKRW,
    coinCost: policy.coinCost,
    audioUrl: hasFullAccess ? buildMusicRouteUrl("audio", key, featureKey) : "",
    downloadUrl: canDownload ? buildMusicRouteUrl("download", key, featureKey) : "",
    code: !hasFullAccess
      ? (authenticated ? "PAYMENT_REQUIRED" : "LOGIN_REQUIRED")
      : (canDownload
        ? (decision?.reason || "ALLOWED")
        : (freeFullPlayback === true ? "DOWNLOAD_PURCHASE_REQUIRED" : (decision?.reason || "ALLOWED"))),
  };
}

// 요청된 트랙 전체를 Mongo 왕복 2회(User 1 + Payment 1)로 판정한다.
// 곡마다 canAccessPaidFeature를 직렬로 부르던 구조(곡 수 × 2왕복)를 없앤 것이 음악실 로딩 지연의 핵심 수정.
async function resolveTracksAccess(inputs, auth, env) {
  const plans = inputs.map((input) => resolveTrackPlan(input));
  const lockedPlans = plans.filter((plan) => plan.featureKey);
  const decisions = lockedPlans.length && auth?.userId
    ? await canAccessPaidFeaturesBatch(auth.userId, lockedPlans.map((plan) => plan.featureKey), {
      env,
      categoryKey: "music-track",
      reason: "Code Destiny music full track unlock",
      // 인증 단계에서 이미 읽은 User 문서를 재사용한다(없으면 내부에서 종전대로 조회).
      userDoc: auth?.authUserDoc,
    })
    : {};

  const authenticated = Boolean(auth?.userId);
  const entries = plans.map((plan) => (
    plan.entry || buildLockedTrackEntry(plan, decisions[plan.featureKey] || null, authenticated)
  ));

  // 음악 트랙은 전곡이 같은 가격(lib/music-access-policy.js 정본)이라 이용권 커버 여부가 곡별로 갈리지 않는다.
  // 하나라도 "구매가 아닌 커버"로 열렸다면 이용권이 전곡을 덮는다는 뜻 — 클라이언트는 이 플래그로
  // 곡별 확인을 생략하고 전곡을 즉시 재생 가능 상태로 표시한다.
  const passCoversAll = Object.values(decisions).some((decision) => (
    decision?.allowed === true && LICENSE_COVERED_TYPES.has(String(decision?.licenseType || ""))
  ));

  return { entries, passCoversAll };
}

async function handleAccess(request, env) {
  if (!["GET", "POST"].includes(request.method.toUpperCase())) return methodNotAllowed();

  const body = request.method.toUpperCase() === "POST"
    ? await request.json().catch(() => ({}))
    : {};
  const auth = await getOptionalUserFromRequest(request, env, { userProjection: PAID_FEATURE_ACCESS_USER_PROJECTION });
  const requestedTracks = Array.isArray(body?.tracks) && body.tracks.length
    ? body.tracks
    : [resolveRequestTrack(request, body)];

  const { entries, passCoversAll } = await resolveTracksAccess(
    requestedTracks.slice(0, 200).map((item) => ({
      trackId: item?.trackId,
      key: item?.audioSourceKey || item?.key,
      featureKey: item?.featureKey,
    })),
    auth,
    env,
  );

  return json({
    ok: true,
    authenticated: Boolean(auth?.userId),
    passCoversAll,
    tracks: entries,
  });
}

function buildDownloadFileName(key) {
  const fileName = key.split("/").pop() || "code-destiny-music.mp3";
  return fileName.replace(/[\r\n"]/g, "").trim() || "code-destiny-music.mp3";
}

function buildContentDisposition(key) {
  const fileName = buildDownloadFileName(key);
  return `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

async function streamMusicPreview(env, audioSourceKey) {
  const headers = new Headers();
  headers.set("Range", `bytes=0-${Math.max(0, MUSIC_PREVIEW_MAX_BYTES - 1)}`);

  const upstream = await fetch(buildMusicPublicUrl(env, audioSourceKey), {
    headers,
    cf: { cacheTtl: MUSIC_PREVIEW_CACHE_SECONDS, cacheEverything: true },
  });
  if (!upstream.ok && upstream.status !== 206) {
    return json({ ok: false, code: "PREVIEW_UNAVAILABLE" }, { status: 502 });
  }

  const responseHeaders = new Headers();
  responseHeaders.set("Content-Type", "audio/mpeg");
  // 미리듣기는 seek/전체 다운로드를 막기 위해 Range를 노출하지 않고 짧은 클립으로만 제공한다.
  responseHeaders.set("Accept-Ranges", "none");
  // 이 클립은 비로그인 사용자에게 나가는 바이트와 동일한 공개 자산이라 사용자별 비밀이 없다.
  // 공개 캐시를 허용해 같은 곡을 다시 들을 때 워커·R2 왕복 없이 재생되게 한다.
  responseHeaders.set("Cache-Control", `public, max-age=${MUSIC_PREVIEW_CACHE_SECONDS}, immutable`);
  responseHeaders.set("X-Music-Access", "preview");

  return new Response(capByteStream(upstream.body, MUSIC_PREVIEW_MAX_BYTES), {
    status: 200,
    headers: responseHeaders,
  });
}

async function proxyMusicFile(request, env, options = {}) {
  if (request.method.toUpperCase() !== "GET") return methodNotAllowed();

  const url = new URL(request.url);
  const input = resolveRequestTrack(request);

  // 미리듣기 단축 경로: 클라이언트가 명시적으로 mode=preview를 요청한 잠금곡은
  // 인증·접근 판정(왕복 3회) 없이 곧바로 공개 클립을 보낸다 — 어차피 미인증 사용자에게 나가는 바이트와 같다.
  // 이 판단을 건너뛰지 않으면 미리듣기 재생마다 인증 1회 + Mongo 2회가 첫 바이트 앞에 붙는다.
  if (options.download !== true
    && String(url.searchParams.get("mode") || "").trim().toLowerCase() === "preview"
    && isValidMusicAudioSourceKey(input.key)
    && !getMusicTrackAccessPolicy(input.key).hasFreeFullAccess) {
    return streamMusicPreview(env, normalizeMusicAudioSourceKey(input.key));
  }

  const auth = await getOptionalUserFromRequest(request, env, { userProjection: PAID_FEATURE_ACCESS_USER_PROJECTION });
  const { entries } = await resolveTracksAccess([input], auth, env);
  const access = entries[0];

  const downloadBlocked = options.download === true && access.hasFullAccess && access.canDownload !== true;
  if (!access.hasFullAccess || downloadBlocked) {
    // 오디오 재생 요청이고 유효한 잠금곡이면 402 대신 바이트 제한 미리듣기를 제공한다.
    const previewEligible = options.download !== true
      && access.accessTier === "locked_preview"
      && isValidMusicAudioSourceKey(access.audioSourceKey);

    if (!previewEligible) {
      return json({
        ok: false,
        // 이용권으로 재생은 되지만 다운로드는 구매가 필요한 상태를 별도 코드로 구분한다.
        code: downloadBlocked ? "DOWNLOAD_PURCHASE_REQUIRED" : access.code,
        track: access,
      }, { status: access.code === "LOGIN_REQUIRED" && !downloadBlocked ? 401 : 402 });
    }

    return streamMusicPreview(env, access.audioSourceKey);
  }

  const headers = new Headers();
  const range = request.headers.get("Range");
  if (range) headers.set("Range", range);

  const upstream = await fetch(buildMusicPublicUrl(env, access.audioSourceKey), { headers });
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.set("Content-Type", "audio/mpeg");
  responseHeaders.set("Accept-Ranges", "bytes");
  // 해금된 전곡은 사용자별 권한이 걸린 자산이라 공개 캐시는 금지하되,
  // 브라우저가 seek 시 같은 구간을 다시 받지 않도록 private 캐시는 허용한다.
  responseHeaders.set("Cache-Control", "private, max-age=3600");
  responseHeaders.delete("Set-Cookie");

  if (options.download) {
    responseHeaders.set("Content-Disposition", buildContentDisposition(access.audioSourceKey));
  } else {
    responseHeaders.delete("Content-Disposition");
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export async function handleMusicRoutes(request, env) {
  try {
    const path = getRoutePath(request, "/api/music");

    if (path === "/access") return handleAccess(request, env);
    if (path === "/audio") return proxyMusicFile(request, env);
    if (path === "/download") return proxyMusicFile(request, env, { download: true });

    return notFound();
  } catch (error) {
    return handleRouteError(error, { request, env, trace: { route: "music" } });
  }
}
