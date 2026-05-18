import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound } from "../lib/http.js";

const FALLBACK_PLAYLISTS = {
  lofi: [
    { videoId: "jfKfPfyJRdk", title: "Lofi Hip Hop Radio", channel: "Lofi Girl", thumb: "https://i.ytimg.com/vi/jfKfPfyJRdk/mqdefault.jpg" },
    { videoId: "4xDzrJKXOOY", title: "Chillhop Radio", channel: "Chillhop Music", thumb: "https://i.ytimg.com/vi/4xDzrJKXOOY/mqdefault.jpg" },
    { videoId: "5qap5aO4i9A", title: "LoFi Beats to Relax/Study", channel: "Lofi Girl", thumb: "https://i.ytimg.com/vi/5qap5aO4i9A/mqdefault.jpg" },
  ],
  theta: [
    { videoId: "lE6RYpe9IT0", title: "Theta Binaural Beats Meditation", channel: "Greenred Productions", thumb: "https://i.ytimg.com/vi/lE6RYpe9IT0/mqdefault.jpg" },
    { videoId: "EEObuDrwGW4", title: "Deep Theta Waves for Focus", channel: "Meditative Mind", thumb: "https://i.ytimg.com/vi/EEObuDrwGW4/mqdefault.jpg" },
    { videoId: "ygEzI7nfRgE", title: "Theta Healing Meditation Music", channel: "Yellow Brick Cinema", thumb: "https://i.ytimg.com/vi/ygEzI7nfRgE/mqdefault.jpg" },
  ],
  ambient: [
    { videoId: "IRzBQl_QDXM", title: "Space Ambient Meditation", channel: "Ambient Worlds", thumb: "https://i.ytimg.com/vi/IRzBQl_QDXM/mqdefault.jpg" },
    { videoId: "n61ULEU7CO0", title: "Calm Ambient Focus Music", channel: "Soothing Relaxation", thumb: "https://i.ytimg.com/vi/n61ULEU7CO0/mqdefault.jpg" },
    { videoId: "hHW1oY26kxQ", title: "Deep Ambient Relax Session", channel: "The Guild of Ambience", thumb: "https://i.ytimg.com/vi/hHW1oY26kxQ/mqdefault.jpg" },
  ],
};

function getFallbackItems(mode) {
  return FALLBACK_PLAYLISTS[mode] || FALLBACK_PLAYLISTS.lofi;
}

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
  return FALLBACK_PLAYLISTS[mode] ? mode : "lofi";
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
    lofi: "creative commons lofi meditation instrumental no copyright -live -radio -shorts",
    theta: "creative commons theta binaural beats meditation no copyright -live -radio -shorts",
    ambient: "creative commons ambient meditation music no copyright -live -radio -shorts",
  };
  return queryMap[mode] || queryMap.lofi;
}

function buildSearchUrl(mode, apiKey, strictMode = true) {
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("videoEmbeddable", "true");
  searchUrl.searchParams.set("videoCategoryId", "10");
  searchUrl.searchParams.set("videoDuration", mode === "lofi" ? "long" : "medium");
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
      ok: true,
      mode,
      source: "fallback",
      licensePolicy: "creative-commons-priority",
      items: getFallbackItems(mode),
      message:
        "YouTube API 키가 없어 크리에이티브 커먼즈 필터 검색을 수행하지 못했습니다. 임시 샘플 트랙을 제공하므로 사용 전 라이선스를 확인해 주세요.",
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
        "크리에이티브 커먼즈 조건 결과가 없어 임시 샘플 트랙을 제공합니다. 사용 전 라이선스를 확인해 주세요.",
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
