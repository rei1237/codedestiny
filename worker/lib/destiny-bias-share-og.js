/**
 * 최애운명 공유 OG PNG 렌더. workers-og(.wasm) 를 import 하므로 플레인 node 테스트에서는
 * 이 파일을 직접 import 하지 않는다 — 라우트가 동적 import 로 감싸고 실패 시 정적 카드로 폴백한다.
 */
import { ImageResponse, loadGoogleFont } from "workers-og";
import { buildDestinyBiasOgHtml, collectDestinyBiasOgGlyphs } from "./destiny-bias-share.js";

export async function renderDestinyBiasOgPng(snapshot, brandDomain) {
  const glyphs = collectDestinyBiasOgGlyphs(snapshot, brandDomain);
  const [bold, regular] = await Promise.all([
    loadGoogleFont({ family: "Noto Sans KR", weight: 700, text: glyphs }),
    loadGoogleFont({ family: "Noto Sans KR", weight: 400, text: glyphs }),
  ]);
  return new ImageResponse(buildDestinyBiasOgHtml(snapshot, brandDomain), {
    width: 1200,
    height: 630,
    format: "png",
    fonts: [
      { name: "Noto Sans KR", data: regular, weight: 400, style: "normal" },
      { name: "Noto Sans KR", data: bold, weight: 700, style: "normal" },
    ],
  });
}
