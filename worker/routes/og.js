import { ImageResponse, loadGoogleFont } from "workers-og";
import {
  OG_HEIGHT,
  OG_WIDTH,
  buildOgCardHtml,
  collectGlyphs,
  getSiteBaseUrl,
  parseOgParams,
} from "../lib/og-card.js";

/**
 * 동적 OG 카드 (`GET /api/og`).
 *
 * 명세서는 `app/api/og/route.tsx` + `@vercel/og` 였지만 이 레포의 프로덕션 빌드는
 * next.config.mjs 의 `output:"export"` 라 서버가 없다 — Next API 라우트는 빌드에서 사라진다.
 * API 표면은 이 워커 하나뿐이라 여기로 옮겼고, `@vercel/og` 는 Vercel Edge 전용이므로
 * Cloudflare Workers 용 `workers-og`(satori + resvg wasm)를 쓴다.
 *
 * 파라미터 해석·마크업 조립은 worker/lib/og-card.js 에 있다 — 그쪽은 wasm 을 import 하지 않아
 * 검증 스크립트가 실제 로직을 돌려 볼 수 있다. 여기 남은 것은 요청 처리와 렌더뿐이다.
 *
 * 🔴 기존 고정 OG URL(`/og/code-destiny-og-vvip.png`)을 대체하지 않는다. 카카오는 **페이지 URL**
 * 을 키로 스크랩 결과를 캐시하고 이미지를 자기 CDN 에 복사해 두므로, 이미 공유된 페이지의
 * og:image 를 갈아 끼워도 옛 카드가 남는다(scripts/og/render-og-card.mjs 주석의 실측).
 * 이 라우트는 **새 페이지**의 카드를 만드는 용도다.
 *
 * 캐시: `_headers` 의 `/api/*` no-store 블록은 이 경로에 **적용되지 않는다.**
 * 실측 2026-08-28 `curl -sS -D - https://code-destiny.com/api/health` — 응답에
 * `proxy-revalidate` 도 `CDN-Cache-Control` 도 없었고 worker/lib/http.js 가 붙인 값만 나왔다.
 * `/api/*` 는 존 라우트로 이 독립 워커에 바로 가므로 Pages 의 `_headers` 를 거치지 않는다.
 * 그래서 여기서 붙이는 Cache-Control 이 그대로 살아 있고 `_headers` 규칙을 더할 필요가 없다.
 * worker/index.js 의 withCorsHeaders 도 우회한다 — 이미지에 CORS 가 필요 없고, 그 래퍼는
 * Cache-Control 이 없을 때 no-store 를 기본으로 붙인다.
 */

// 렌더가 실패해도 공유 카드가 비어 나가면 안 된다. 이미 배포된 정적 카드로 넘긴다.
const FALLBACK_OG_PATH = "/og/code-destiny-og-vvip.png";

export async function handleOgRoutes(request, env) {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const siteBaseUrl = getSiteBaseUrl(env);

  if (method !== "GET" && method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
  }

  const params = parseOgParams(url.searchParams);
  const brandDomain = siteBaseUrl.replace(/^https?:\/\//, "");

  try {
    const glyphs = collectGlyphs(params, brandDomain);
    // 굵기 둘을 따로 받는다. 제목만 700 이고 본문·도메인은 400 이라 하나로 합치면 제목이
    // 얇아지거나 본문이 뭉개진다. 쓰인 글자만 담은 서브셋이라 각각 수 KB 수준이다.
    const [bold, regular] = await Promise.all([
      loadGoogleFont({ family: "Noto Sans KR", weight: 700, text: glyphs }),
      loadGoogleFont({ family: "Noto Sans KR", weight: 400, text: glyphs }),
    ]);

    const image = new ImageResponse(buildOgCardHtml(params, brandDomain), {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      format: "png",
      fonts: [
        { name: "Noto Sans KR", data: regular, weight: 400, style: "normal" },
        { name: "Noto Sans KR", data: bold, weight: 700, style: "normal" },
      ],
    });

    const response = new Response(image.body, image);
    response.headers.set("Content-Type", "image/png");
    // URL 자체가 캐시 키다 — 제목·설명이 바뀌면 다른 URL 이 된다. 그래서 immutable 로 둔다.
    response.headers.set("Cache-Control", "public, max-age=31536000, immutable");
    return response;
  } catch (error) {
    // 🔴 빈 이미지나 500 을 돌려주면 공유 미리보기가 통째로 깨진다. 스크래퍼는 대개 재시도하지
    // 않고 그 결과를 캐시하므로, 실패는 반드시 쓸 수 있는 카드로 착지시킨다.
    console.error("[OG] 렌더 실패 — 정적 카드로 폴백:", error?.message || error);
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${siteBaseUrl}${FALLBACK_OG_PATH}`,
        // 실패는 굳히지 않는다. 다음 요청에 다시 그려 볼 기회를 남긴다.
        "Cache-Control": "public, max-age=60",
      },
    });
  }
}
