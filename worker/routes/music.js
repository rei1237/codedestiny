import { getOptionalUserFromRequest } from "../lib/auth.js";
import { canAccessPaidFeature } from "../lib/paid-feature-access.js";
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound } from "../lib/http.js";
import {
  buildMusicTrackFeatureKey,
  getMusicTrackAccessPolicy,
  isValidMusicAudioSourceKey,
  normalizeMusicAudioSourceKey,
} from "../../lib/music-access-policy.js";

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
    accessTier: policy.accessTier,
    hasFullAccess,
    previewLimitSeconds: policy.previewLimitSeconds,
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

async function requireFullTrackAccess(request, env) {
  const auth = await getOptionalUserFromRequest(request, env);
  const input = resolveRequestTrack(request);
  const access = await resolveTrackAccess(input, auth, env);

  if (!access.hasFullAccess) {
    return {
      access,
      response: json({
        ok: false,
        code: access.code,
        track: access,
      }, { status: access.code === "LOGIN_REQUIRED" ? 401 : 402 }),
    };
  }

  return { access, response: null };
}

async function proxyMusicFile(request, env, options = {}) {
  if (request.method.toUpperCase() !== "GET") return methodNotAllowed();

  const { access, response } = await requireFullTrackAccess(request, env);
  if (response) return response;

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
