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
    env?.YOUTUBE_API_KEY,
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
    .filter(Boolean);
}

function buildQuery(mode) {
  const queryMap = {
    lofi: "copyright free lofi playlist beats to study and relax no copyright",
    theta: "theta binaural beats meditation no copyright creative commons",
    ambient: "ambient meditation music no copyright free to use",
  };
  return queryMap[mode] || queryMap.lofi;
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
      items: getFallbackItems(mode),
      message: "YouTube API 키가 없어 기본 무료 플레이리스트를 제공합니다.",
    });
  }

  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("videoEmbeddable", "true");
  searchUrl.searchParams.set("videoLicense", "creativeCommon");
  searchUrl.searchParams.set("maxResults", "8");
  searchUrl.searchParams.set("safeSearch", "strict");
  searchUrl.searchParams.set("key", apiKey);
  searchUrl.searchParams.set("q", buildQuery(mode));

  const response = await fetch(searchUrl.toString(), {
    cache: force ? "no-store" : "force-cache",
    cf: {
      cacheEverything: !force,
      cacheTtl: force ? undefined : 1800,
    },
  });

  if (!response.ok) {
    return json({
      ok: true,
      mode,
      source: "fallback",
      items: getFallbackItems(mode),
      message: "YouTube API 요청 실패로 기본 무료 플레이리스트를 제공합니다.",
    });
  }

  const data = await response.json().catch(() => ({}));
  const items = mapYoutubeItems(data);

  if (!items.length) {
    return json({
      ok: true,
      mode,
      source: "fallback",
      items: getFallbackItems(mode),
      message: "조건에 맞는 결과가 없어 기본 무료 플레이리스트를 제공합니다.",
    });
  }

  return json({
    ok: true,
    mode,
    source: "youtube-api",
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
