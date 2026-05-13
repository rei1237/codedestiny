import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound } from "../lib/http.js";

const SUPPORTED_MODES = new Set(["lofi", "theta", "ambient"]);

function pickYoutubeApiKey(env) {
  return [
    env?.YOUTUBE_DATA_API_KEY,
    env?.YOUTUBE_API_KEY,
    env?.GOOGLE_YOUTUBE_API_KEY,
    env?.GOOGLE_API_KEY,
  ]
    .map((key) => String(key || "").trim())
    .find(Boolean) || "";
}

function normalizeMode(value) {
  const mode = String(value || "lofi").trim().toLowerCase();
  return SUPPORTED_MODES.has(mode) ? mode : "lofi";
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
      return !/(24\/?7|live\s*radio|livestream|\blive\b)/i.test(title);
    });
}

function buildQuery(mode) {
  const queryMap = {
    lofi: "creative commons lofi instrumental meditation no copyright claim -live -radio",
    theta: "creative commons theta binaural meditation no copyright -live -radio",
    ambient: "creative commons ambient meditation music no copyright -live -radio",
  };
  return queryMap[mode] || queryMap.lofi;
}

function buildSearchUrl(mode, apiKey, strictMode = true) {
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("videoEmbeddable", "true");
  searchUrl.searchParams.set("videoCategoryId", "10");
  searchUrl.searchParams.set("maxResults", strictMode ? "8" : "10");
  searchUrl.searchParams.set("order", "relevance");
  searchUrl.searchParams.set("safeSearch", strictMode ? "strict" : "moderate");
  if (strictMode) {
    searchUrl.searchParams.set("videoLicense", "creativeCommon");
  }
  searchUrl.searchParams.set("key", apiKey);
  searchUrl.searchParams.set("q", buildQuery(mode));
  return searchUrl;
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

async function handleSearch(request, env) {
  const { searchParams } = new URL(request.url);
  const mode = normalizeMode(searchParams.get("mode"));
  const force = searchParams.get("force") === "true";
  const apiKey = pickYoutubeApiKey(env);

  if (!apiKey) {
    return json({
      ok: false,
      mode,
      message: "YouTube API 키가 설정되지 않아 플레이리스트를 불러올 수 없습니다.",
    }, { status: 503 });
  }

  const strictSearchUrl = buildSearchUrl(mode, apiKey, true);
  const strictResponse = await fetchYoutubeSearch(strictSearchUrl, force);
  const strictData = await strictResponse.json().catch(() => ({}));
  let items = strictResponse.ok ? mapYoutubeItems(strictData) : [];
  let lastError = "";

  if (!strictResponse.ok) {
    lastError = String(strictData?.error?.message || `YouTube API 요청 실패 (${strictResponse.status})`);
  }

  if (!items.length) {
    const relaxedSearchUrl = buildSearchUrl(mode, apiKey, false);
    const relaxedResponse = await fetchYoutubeSearch(relaxedSearchUrl, force);
    const relaxedData = await relaxedResponse.json().catch(() => ({}));
    items = relaxedResponse.ok ? mapYoutubeItems(relaxedData) : [];
    if (!relaxedResponse.ok) {
      lastError = String(relaxedData?.error?.message || `YouTube API 요청 실패 (${relaxedResponse.status})`);
    }
  }

  if (!items.length) {
    return json({
      ok: false,
      mode,
      message: lastError || "조건에 맞는 무료 플레이리스트를 찾지 못했습니다. 잠시 후 다시 시도해 주세요.",
    }, { status: 404 });
  }

  return json({
    ok: true,
    mode,
    source: "youtube-api",
    licensePolicy: "creative-commons-priority",
    items,
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

    return await handleSearch(request, env);
  } catch (error) {
    return handleRouteError(error);
  }
}
