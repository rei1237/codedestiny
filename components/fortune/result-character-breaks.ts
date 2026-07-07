// 장문 결과 사이에 끼워 넣는 배경 제거 캐릭터 삽화 설정.
// 규칙: 네오/연이 캐릭터의 배경 제거 WEBP만 사용한다 (무거운 CDN PNG 금지).
import type { ResultBreakImage, ResultViewerPage } from "./PagedResultViewer";

export type CharacterBreakConfig = {
  images: ResultBreakImage[];
  /** N페이지마다 1장 삽입 (2면 2, 4번째... 페이지 하단) */
  cadence: number;
};

const NEO_SPRITE_BASE = "/neo-operation-room/sprites/transparent";

// 1차 작전 브리핑 덱 — 시퀀스별 첫 프레임(서로 다른 포즈 5종)
export const neoInitialBreaks: CharacterBreakConfig = {
  cadence: 2,
  images: ["s1", "s2", "s3", "s4", "s5"].map((sequence) => ({
    src: `${NEO_SPRITE_BASE}/neo-transparent-${sequence}-f01.webp`,
    width: 362,
    height: 543,
  })),
};

// 2차 수정 명령서 덱 — f05 프레임 세트(1차와 다른 포즈로 문서 구분)
export const neoRefinedBreaks: CharacterBreakConfig = {
  cadence: 2,
  images: ["s1", "s2", "s3", "s4"].map((sequence) => ({
    src: `${NEO_SPRITE_BASE}/neo-transparent-${sequence}-f05.webp`,
    width: 362,
    height: 543,
  })),
};

// 연이 — 단일 스틸 webp만 사용 (1774x887짜리 *-photoroom.webp는 스프라이트 시트라 제외)
export const yeoniBreaks: CharacterBreakConfig = {
  cadence: 3,
  images: [
    { src: "/images/fortune-tea-house/mobile/yeoni-thanks-still-mobile.webp", width: 720, height: 720 },
    { src: "/images/fortune-tea-house/flower-pig-honey-hug.webp", width: 361, height: 411 },
    { src: "/images/fortune-tea-house/mobile/yeoni-cup-pose-still-mobile.webp", width: 720, height: 720 },
    { src: "/images/fortune-tea-house/mobile/flower-pig-result-still-mobile.webp", width: 720, height: 720 },
  ],
};

/** cadence에 따라 페이지 하단에 캐릭터 삽화를 순환 배정한다 (이미 지정된 페이지는 건너뜀). */
export function withCharacterBreaks(
  pages: ResultViewerPage[],
  config: CharacterBreakConfig,
  imageClassName?: string,
): ResultViewerPage[] {
  if (!config.images.length || config.cadence < 1) return pages;
  let used = 0;
  return pages.map((page, index) => {
    if (page.breakImage) return page;
    if ((index + 1) % config.cadence !== 0) return page;
    const image = config.images[used % config.images.length];
    used += 1;
    return { ...page, breakImage: imageClassName ? { ...image, className: imageClassName } : image };
  });
}
