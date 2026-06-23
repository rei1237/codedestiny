import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound } from "../lib/http.js";

const FALLBACK_PLAYLISTS = {
  lofi: [],
  theta: [],
  ambient: [],
};

const MAX_VERIFIED_ITEMS = 6;
const MIN_DURATION_SECONDS = 180;
const MAX_DURATION_SECONDS = 7200;
const BLOCKED_KEYWORD_RE = /(private video|deleted video|unavailable|removed|blocked|24\/?7|live\s*radio|livestream|\blive\b|\bradio\b|\bshorts\b|#shorts|premiere|뉴스|실시간|라이브|라디오|쇼츠)/i;
const MEDITATION_KEYWORD_RE = /(meditation|sleep|lofi|lo-fi|focus|study|relax|relaxing|ambient|theta|binaural|calm|instrumental|healing|명상|수면|집중|로파이|힐링|앰비언트|안정|휴식)/i;
const LEGAL_NOTICE = "YouTube 공개 영상 중 Creative Commons 라이선스와 임베드 가능 상태가 확인된 명상 음악만 추천합니다.";

function getFallbackItems(mode, excludeIds = new Set()) {
  return (FALLBACK_PLAYLISTS[mode] || FALLBACK_PLAYLISTS.lofi)
    .filter((item) => !excludeIds.has(String(item.videoId || "")))
    .map((item) => ({
      ...item,
      verified: false,
      sourceTier: "unverified",
      licenseLabel: "검증된 트랙 없음",
    }));
}

function pickYoutubeApiKey(env) {
  return [
    env?.YOUTUBE_DATA_API_KEY,
    env?.YOUTUBE_API_KEY,
    env?.GOOGLE_YOUTUBE_API_KEY,
  ]
    .map((key) => String(key || "").trim())
    .find(Boolean) || "";
}

function normalizeMode(value) {
  const mode = String(value || "lofi").trim().toLowerCase();
  return FALLBACK_PLAYLISTS[mode] ? mode : "lofi";
}

function normalizeLanguage(value) {
  const lang = String(value || "en").trim().toLowerCase();
  return lang === "ko" ? "ko" : "en";
}

function parseExcludeIds(value) {
  return new Set(
    String(value || "")
      .split(",")
      .map((id) => id.trim())
      .filter((id) => /^[a-zA-Z0-9_-]{6,32}$/.test(id))
      .slice(0, 80),
  );
}

function parseIsoDurationSeconds(value) {
  const m = String(value || "").match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!m) return 0;
  return (Number(m[1] || 0) * 86400)
    + (Number(m[2] || 0) * 3600)
    + (Number(m[3] || 0) * 60)
    + Number(m[4] || 0);
}

function normalizeThumb(snippet) {
  const thumbnails = snippet?.thumbnails || {};
  return String((thumbnails.medium || thumbnails.high || thumbnails.default || {})?.url || "");
}

function mapYoutubeSearchIds(data, excludeIds) {
  const seen = new Set();
  return (Array.isArray(data?.items) ? data.items : [])
    .map((item) => String(item?.id?.videoId || "").trim())
    .filter((id) => {
      if (!id || excludeIds.has(id) || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
}

function isStableMeditationVideo(item, requireCreativeCommon) {
  const snippet = item?.snippet || {};
  const status = item?.status || {};
  const contentDetails = item?.contentDetails || {};
  const durationSeconds = parseIsoDurationSeconds(contentDetails?.duration);
  const haystack = `${snippet.title || ""} ${snippet.description || ""} ${snippet.channelTitle || ""}`;

  if (status.privacyStatus !== "public") return false;
  if (status.embeddable !== true) return false;
  if (requireCreativeCommon && status.license !== "creativeCommon") return false;
  if (snippet.liveBroadcastContent && snippet.liveBroadcastContent !== "none") return false;
  if (item?.liveStreamingDetails) return false;
  if (durationSeconds < MIN_DURATION_SECONDS || durationSeconds > MAX_DURATION_SECONDS) return false;
  if (BLOCKED_KEYWORD_RE.test(haystack)) return false;
  if (!MEDITATION_KEYWORD_RE.test(haystack)) return false;
  return true;
}

function mapVerifiedYoutubeItems(data, options = {}) {
  const requireCreativeCommon = options.requireCreativeCommon === true;
  const sourceTier = requireCreativeCommon ? "cc" : "candidate";
  const licenseLabel = requireCreativeCommon
    ? "Creative Commons 확인 · 재생 가능"
    : "무료 사용 후보 · 채널 안내 확인";

  return (Array.isArray(data?.items) ? data.items : [])
    .filter((item) => isStableMeditationVideo(item, requireCreativeCommon))
    .slice(0, MAX_VERIFIED_ITEMS)
    .map((item) => {
      const snippet = item?.snippet || {};
      const contentDetails = item?.contentDetails || {};
      return {
        videoId: String(item.id),
        title: String(snippet.title || "명상 음악"),
        channel: String(snippet.channelTitle || "YouTube"),
        thumb: normalizeThumb(snippet),
        durationSeconds: parseIsoDurationSeconds(contentDetails.duration),
        verified: true,
        sourceTier,
        licenseLabel,
      };
    });
}

function mapYoutubeItems(data) {
  return (Array.isArray(data?.items) ? data.items : [])
    .map((item) => {
      const videoId = item?.id?.videoId;
      const snippet = item?.snippet || {};
      const thumb = snippet?.thumbnails?.medium || snippet?.thumbnails?.default || {};
      if (!videoId) return null;
      return {
        videoId: String(videoId),
        title: String(snippet?.title || "제목 없음"),
        channel: String(snippet?.channelTitle || "YouTube"),
        thumb: String(thumb?.url || ""),
      };
    })
    .filter(Boolean)
    .filter((item) => {
      // Exclude 24/7 live/radio style results for stable meditation playback cards.
      const title = String(item.title || "");
      return !/(24\/?7|live\s*radio|livestream|\blive\b|\bshorts\b|#shorts)/i.test(title);
    });
}

function buildQuery(mode) {
  const queryMap = {
    lofi: "lofi meditation instrumental",
    theta: "theta binaural beats meditation",
    ambient: "ambient meditation sleep focus music",
  };
  return queryMap[mode] || queryMap.lofi;
}

function buildSearchUrl(mode, apiKey, strictMode = true, language = "en") {
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("videoEmbeddable", "true");
  searchUrl.searchParams.set("videoSyndicated", "true");
  searchUrl.searchParams.set("videoCategoryId", "10");
  searchUrl.searchParams.set("videoDuration", mode === "lofi" ? "long" : "medium");
  searchUrl.searchParams.set("maxResults", strictMode ? "12" : "16");
  searchUrl.searchParams.set("order", "relevance");
  searchUrl.searchParams.set("safeSearch", strictMode ? "strict" : "moderate");
  searchUrl.searchParams.set("relevanceLanguage", language);
  if (strictMode) {
    searchUrl.searchParams.set("videoLicense", "creativeCommon");
  }
  searchUrl.searchParams.set("key", apiKey);
  searchUrl.searchParams.set("q", buildQuery(mode));
  return searchUrl;
}

function buildVideosUrl(ids, apiKey) {
  const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  videosUrl.searchParams.set("part", "snippet,contentDetails,status,liveStreamingDetails");
  videosUrl.searchParams.set("id", ids.join(","));
  videosUrl.searchParams.set("key", apiKey);
  return videosUrl;
}

async function fetchYoutubeSearch(url, force) {
  return fetch(url.toString(), {
    cache: force ? "no-store" : "force-cache",
    cf: {
      cacheEverything: !force,
      cacheTtl: force ? undefined : 1800,
    },
  });
}

async function fetchYoutubeJson(url, force) {
  const response = await fetchYoutubeSearch(url, force);
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

async function fetchVerifiedItems(mode, apiKey, force, language, excludeIds, strictMode) {
  // 1차 search.list는 후보 ID 수집만 담당하고, 실제 재생 가능 여부는 videos.list 세부 상태로 다시 검증한다.
  const searchUrl = buildSearchUrl(mode, apiKey, strictMode, language);
  const search = await fetchYoutubeJson(searchUrl, force);
  if (!search.ok) {
    return { ok: false, status: search.status, items: [] };
  }

  const ids = mapYoutubeSearchIds(search.data, excludeIds);
  if (!ids.length) {
    return { ok: true, status: search.status, items: [] };
  }

  const videos = await fetchYoutubeJson(buildVideosUrl(ids, apiKey), force);
  if (!videos.ok) {
    return { ok: false, status: videos.status, items: [] };
  }

  return {
    ok: true,
    status: videos.status,
    items: mapVerifiedYoutubeItems(videos.data, { requireCreativeCommon: strictMode }),
  };
}

async function handleSearch(request, env) {
  const { searchParams } = new URL(request.url);
  const mode = normalizeMode(searchParams.get("mode"));
  const force = searchParams.get("force") === "true";
  const apiKey = pickYoutubeApiKey(env);

  if (!apiKey) {
    return json({
      ok: true,
      mode,
      source: "fallback",
      licensePolicy: "creative-commons-priority",
      items: getFallbackItems(mode),
      message:
        "YouTube API 키가 없어 Creative Commons 명상 음악을 검증할 수 없습니다.",
    });
  }

  const strictSearchUrl = buildSearchUrl(mode, apiKey, true);
  const strictResponse = await fetchYoutubeSearch(strictSearchUrl, force);
  const strictData = strictResponse.ok ? await strictResponse.json().catch(() => ({})) : {};
  let items = mapYoutubeItems(strictData);

  if (!items.length) {
    const relaxedSearchUrl = buildSearchUrl(mode, apiKey, false);
    const relaxedResponse = await fetchYoutubeSearch(relaxedSearchUrl, force);
    const relaxedData = relaxedResponse.ok ? await relaxedResponse.json().catch(() => ({})) : {};
    items = mapYoutubeItems(relaxedData);
  }

  if (!items.length) {
    return json({
      ok: true,
      mode,
      source: "fallback",
      licensePolicy: "creative-commons-priority",
      items: getFallbackItems(mode),
      message:
        "Creative Commons 조건에 맞는 재생 가능 트랙을 찾지 못했습니다.",
    });
  }

  return json({
    ok: true,
    mode,
    source: "youtube-api",
    licensePolicy: "creative-commons-priority",
    items,
  });
}

async function handleStableSearch(request, env) {
  const { searchParams } = new URL(request.url);
  const mode = normalizeMode(searchParams.get("mode"));
  const force = searchParams.get("force") === "true";
  const language = normalizeLanguage(searchParams.get("lang"));
  const excludeIds = parseExcludeIds(searchParams.get("exclude"));
  const apiKey = pickYoutubeApiKey(env);

  if (!apiKey) {
    return json({
      ok: true,
      mode,
      source: "youtube-api-missing-key",
      licensePolicy: "creative-commons-verified",
      items: getFallbackItems(mode, excludeIds),
      excludedFailedCount: excludeIds.size,
      message: "YouTube API 키가 없어 Creative Commons 명상 음악을 검증할 수 없습니다.",
    });
  }

  // CC 라이선스가 확인된 공개/임베드 가능 영상이 있으면 최우선으로 내려준다.
  const strict = await fetchVerifiedItems(mode, apiKey, force, language, excludeIds, true);
  if (strict.items.length) {
    return json({
      ok: true,
      mode,
      source: "youtube-api-verified",
      licensePolicy: "creative-commons-verified",
      items: strict.items,
      excludedFailedCount: excludeIds.size,
      message: LEGAL_NOTICE,
    });
  }

  return json({
    ok: true,
    mode,
    source: "youtube-api-empty",
    licensePolicy: "creative-commons-verified",
    items: getFallbackItems(mode, excludeIds),
    excludedFailedCount: excludeIds.size,
    message: "Creative Commons 라이선스와 재생 가능 상태가 함께 확인된 트랙을 찾지 못했습니다.",
  });
}

export async function handleYoutubeRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    if (method !== "GET") {
      if (["GET", "POST"].includes(method)) return notFound();
      return methodNotAllowed();
    }

    const path = getRoutePath(request, "/api/youtube");
    if (path !== "/search") return notFound();

    return await handleStableSearch(request, env);
  } catch (error) {
    return handleRouteError(error);
  }
}
