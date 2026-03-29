import { NextResponse } from "next/server";

const YOUTUBE_SEARCH_ENDPOINT = "https://www.googleapis.com/youtube/v3/search";

const SATS_SOURCE_META = {
  lofi: { query: "copyright free lofi playlist beats to study and relax", label: "LoFi" },
  theta: { query: "theta binaural beats no copyright meditation playlist", label: "Theta" },
};

function pickYouTubeApiKey() {
  return [
    process.env.YOUTUBE_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.GOOGLE_API_KEY_2,
    process.env.GOOGLE_API_KEY_3,
  ]
    .map((v) => String(v || "").trim())
    .find(Boolean);
}

function shapePlaylistItems(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return items
    .map((item) => {
      const videoId = item?.id?.videoId;
      if (!videoId) return null;
      const sn = item?.snippet || {};
      const thumb = sn?.thumbnails?.medium || sn?.thumbnails?.default || sn?.thumbnails?.high || {};
      return {
        videoId: String(videoId),
        title: String(sn.title || "제목 없음"),
        channel: String(sn.channelTitle || "YouTube"),
        thumb: String(thumb.url || ""),
      };
    })
    .filter(Boolean);
}

export async function GET(req) {
  try {
    const key = pickYouTubeApiKey();
    if (!key) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "서버 YouTube API 키가 설정되지 않았습니다. YOUTUBE_API_KEY 또는 GOOGLE_API_KEY를 설정해 주세요.",
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") === "theta" ? "theta" : "lofi";
    const meta = SATS_SOURCE_META[mode] || SATS_SOURCE_META.lofi;

    const url =
      `${YOUTUBE_SEARCH_ENDPOINT}?part=snippet&type=video&videoEmbeddable=true&videoLicense=creativeCommon` +
      `&maxResults=8&safeSearch=strict&key=${encodeURIComponent(key)}&q=${encodeURIComponent(meta.query)}`;

    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload?.error?.message || payload?.message || `YouTube API 요청 실패 (${response.status})`;
      return NextResponse.json({ ok: false, message }, { status: response.status });
    }

    const items = shapePlaylistItems(payload);
    if (!items.length) {
      return NextResponse.json(
        { ok: false, message: `${meta.label} 조건에 맞는 재생 목록을 찾지 못했습니다.` },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, mode, items }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: String(error?.message || "재생목록 요청 처리에 실패했습니다.") },
      { status: 500 }
    );
  }
}
