import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const FALLBACK_YOUTUBE_API_KEY = "AIzaSyAYtZJZzNHWWciMDgaleLv7IFudqLBoBkw";

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
  ]
};

function getFallbackItems(mode) {
  return FALLBACK_PLAYLISTS[mode] || FALLBACK_PLAYLISTS.lofi;
}

function pickYoutubeApiKey() {
  const keys = [
    process.env.YOUTUBE_API_KEY,
    process.env.GOOGLE_API_KEY,
    FALLBACK_YOUTUBE_API_KEY,
  ]
    .map((key) => String(key || "").trim())
    .filter(Boolean);

  return keys[0] || null;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") || "lofi";
    const force = searchParams.get("force") === "true";

    // YouTube API 키 확인 (.env.local의 YOUTUBE_API_KEY 우선)
    const apiKey = pickYoutubeApiKey();
    if (!apiKey) {
      return NextResponse.json(
        {
          ok: true,
          mode,
          source: "fallback",
          items: getFallbackItems(mode),
          message: "YouTube API 키가 없어 기본 무료 플레이리스트를 제공합니다."
        }
      );
    }

    const queryMap = {
      lofi: "copyright free lofi playlist beats to study and relax no copyright",
      theta: "theta binaural beats meditation no copyright creative commons",
      ambient: "ambient meditation music no copyright free to use"
    };

    const query = queryMap[mode] || queryMap.lofi;
    
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("videoEmbeddable", "true");
    searchUrl.searchParams.set("videoLicense", "creativeCommon");
    searchUrl.searchParams.set("maxResults", "8");
    searchUrl.searchParams.set("safeSearch", "strict");
    searchUrl.searchParams.set("key", apiKey);
    searchUrl.searchParams.set("q", query);

    const response = await fetch(searchUrl.toString(), {
      cache: force ? "no-store" : "force-cache",
      next: { revalidate: force ? 0 : 1800 },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[youtube/search] API error:", errorData);
      return NextResponse.json(
        {
          ok: true,
          mode,
          source: "fallback",
          items: getFallbackItems(mode),
          message: "YouTube API 요청 실패로 기본 무료 플레이리스트를 제공합니다."
        }
      );
    }

    const data = await response.json();
    
    const items = (data.items || [])
      .map((item) => {
        const id = item.id?.videoId;
        const sn = item.snippet;
        const thumb = sn?.thumbnails?.medium || sn?.thumbnails?.default;
        if (!id) return null;
        return {
          videoId: id,
          title: String(sn?.title || "제목 없음"),
          channel: String(sn?.channelTitle || "YouTube"),
          thumb: String(thumb?.url || "")
        };
      })
      .filter(Boolean);

    if (!items.length) {
      return NextResponse.json(
        {
          ok: true,
          mode,
          source: "fallback",
          items: getFallbackItems(mode),
          message: "조건에 맞는 결과가 없어 기본 무료 플레이리스트를 제공합니다."
        }
      );
    }

    return NextResponse.json({
      ok: true,
      items,
      source: "youtube-api",
      mode,
    });
  } catch (error) {
    console.error("[youtube/search] Error:", error);
    return NextResponse.json(
      {
        ok: true,
        mode: "lofi",
        source: "fallback",
        items: getFallbackItems("lofi"),
        message: "서버 오류로 기본 무료 플레이리스트를 제공합니다."
      }
    );
  }
}
