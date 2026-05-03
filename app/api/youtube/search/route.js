import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") || "lofi";
    const force = searchParams.get("force") === "true";

    // YouTube API 키 확인
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, message: "YouTube API 키가 설정되지 않았습니다." },
        { status: 500 }
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

    const response = await fetch(searchUrl.toString());
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[youtube/search] API error:", errorData);
      return NextResponse.json(
        { ok: false, message: "YouTube API 요청 실패" },
        { status: 500 }
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
        { ok: false, message: "조건에 맞는 재생 목록을 찾지 못했습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      items,
      mode
    });
  } catch (error) {
    console.error("[youtube/search] Error:", error);
    return NextResponse.json(
      { ok: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
