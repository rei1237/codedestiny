import { getOptionalUserFromRequest } from "../lib/auth.js";
import { canAccessPaidFeature } from "../lib/paid-feature-access.js";
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound } from "../lib/http.js";
import {
  buildMusicTrackFeatureKey,
  getMusicTrackAccessPolicy,
  isValidMusicAudioSourceKey,
  normalizeMusicAudioSourceKey,
  MUSIC_PREVIEW_MAX_BYTES,
} from "../../lib/music-access-policy.js";

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

function buildInvalidTrackEntry(input = {}) {
  return {
    trackId: String(input.trackId || ""),
    audioSourceKey: String(input.key || ""),
    featureKey: String(input.featureKey || ""),
    accessTier: "invalid",
    hasFullAccess: false,
    previewLimitSeconds: 40,
    priceKRW: 300,
    coinCost: 3,
    code: "INVALID_TRACK",
  };
}

async function resolveTrackAccess(input, auth, env) {
  const key = normalizeMusicAudioSourceKey(input.key);
  const requestedFeatureKey = String(input.featureKey || "").trim();
  const computedFeatureKey = buildMusicTrackFeatureKey(key);

  if (!isValidMusicAudioSourceKey(key) || (!computedFeatureKey && requestedFeatureKey)) {
    return buildInvalidTrackEntry(input);
  }

  const policy = getMusicTrackAccessPolicy(key);
  const featureKey = policy.purchaseFeatureKey || computedFeatureKey || "";
  const featureMatches = !featureKey || !requestedFeatureKey || requestedFeatureKey === featureKey;

  if (!featureMatches) {
    return {
      ...buildInvalidTrackEntry(input),
      audioSourceKey: key,
      featureKey: requestedFeatureKey,
      code: "FEATURE_KEY_MISMATCH",
    };
  }

  if (policy.hasFreeFullAccess) {
    return {
      trackId: String(input.trackId || ""),
      audioSourceKey: key,
      featureKey: "",
      accessTier: policy.accessTier,
      hasFullAccess: true,
      previewLimitSeconds: null,
      priceKRW: null,
      coinCost: null,
      audioUrl: buildMusicRouteUrl("audio", key, ""),
      downloadUrl: buildMusicRouteUrl("download", key, ""),
      code: "FREE_FULL_ACCESS",
    };
  }

  const decision = auth?.userId && featureKey
    ? await canAccessPaidFeature(auth.userId, featureKey, {
      env,
      categoryKey: "music-track",
      reason: "Code Destiny music full track unlock",
    })
    : null;
  const hasFullAccess = decision?.allowed === true;

  return {
    trackId: String(input.trackId || ""),
    audioSourceKey: key,
    featureKey,
    accessTier: hasFullAccess ? "free_full" : policy.accessTier,
    hasFullAccess,
    previewLimitSeconds: hasFullAccess ? null : policy.previewLimitSeconds,
    priceKRW: policy.priceKRW,
    coinCost: policy.coinCost,
    audioUrl: hasFullAccess ? buildMusicRouteUrl("audio", key, featureKey) : "",
    downloadUrl: hasFullAccess ? buildMusicRouteUrl("download", key, featureKey) : "",
    code: hasFullAccess ? (decision?.reason || "ALLOWED") : (auth?.userId ? "PAYMENT_REQUIRED" : "LOGIN_REQUIRED"),
  };
}

async function handleAccess(request, env) {
  if (!["GET", "POST"].includes(request.method.toUpperCase())) return methodNotAllowed();

  const body = request.method.toUpperCase() === "POST"
    ? await request.json().catch(() => ({}))
    : {};
  const auth = await getOptionalUserFromRequest(request, env);
  const requestedTracks = Array.isArray(body?.tracks) && body.tracks.length
    ? body.tracks
    : [resolveRequestTrack(request, body)];

  const tracks = [];
  for (const item of requestedTracks.slice(0, 120)) {
    tracks.push(await resolveTrackAccess({
      trackId: item?.trackId,
      key: item?.audioSourceKey || item?.key,
      featureKey: item?.featureKey,
    }, auth, env));
  }

  return json({
    ok: true,
    authenticated: Boolean(auth?.userId),
    tracks,
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

async function streamMusicPreview(env, access) {
  const headers = new Headers();
  headers.set("Range", `bytes=0-${Math.max(0, MUSIC_PREVIEW_MAX_BYTES - 1)}`);

  const upstream = await fetch(buildMusicPublicUrl(env, access.audioSourceKey), { headers });
  if (!upstream.ok && upstream.status !== 206) {
    return json({ ok: false, code: "PREVIEW_UNAVAILABLE" }, { status: 502 });
  }

  const responseHeaders = new Headers();
  responseHeaders.set("Content-Type", "audio/mpeg");
  // 미리듣기는 seek/전체 다운로드를 막기 위해 Range를 노출하지 않고 짧은 클립으로만 제공한다.
  responseHeaders.set("Accept-Ranges", "none");
  responseHeaders.set("Cache-Control", "private, no-store");
  responseHeaders.set("X-Music-Access", "preview");

  return new Response(capByteStream(upstream.body, MUSIC_PREVIEW_MAX_BYTES), {
    status: 200,
    headers: responseHeaders,
  });
}

async function proxyMusicFile(request, env, options = {}) {
  if (request.method.toUpperCase() !== "GET") return methodNotAllowed();

  const auth = await getOptionalUserFromRequest(request, env);
  const input = resolveRequestTrack(request);
  const access = await resolveTrackAccess(input, auth, env);

  if (!access.hasFullAccess) {
    // 오디오 재생 요청이고 유효한 잠금곡이면 402 대신 바이트 제한 미리듣기를 제공한다.
    const previewEligible = options.download !== true
      && access.accessTier === "locked_preview"
      && isValidMusicAudioSourceKey(access.audioSourceKey);

    if (!previewEligible) {
      return json({
        ok: false,
        code: access.code,
        track: access,
      }, { status: access.code === "LOGIN_REQUIRED" ? 401 : 402 });
    }

    return streamMusicPreview(env, access);
  }

  const headers = new Headers();
  const range = request.headers.get("Range");
  if (range) headers.set("Range", range);

  const upstream = await fetch(buildMusicPublicUrl(env, access.audioSourceKey), { headers });
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.set("Content-Type", "audio/mpeg");
  responseHeaders.set("Accept-Ranges", "bytes");
  responseHeaders.set("Cache-Control", "private, no-store");
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
