import type { CSSProperties } from "react";

export type PigSpriteFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
  sheetWidth: number;
  sheetHeight: number;
};

/**
 * 꽃돼지 스프라이트 프레임 → .pigSpriteFrame 이 읽는 CSS 변수.
 *
 * 🔴 비율 계산은 반드시 여기(JS)에서 끝내고 CSS 에는 순수 % 만 넘긴다.
 * 예전에는 CSS 쪽에서 calc(var(--x) / var(--width) * -100%) 로 계산했는데,
 * 길이 ÷ 길이 나눗셈은 CSS Values Level 4 문법이라 구형 엔진
 * (네이버 인앱 웹뷰·구형 Samsung Internet·iOS 16 이하)에서 통째로 무효가 된다.
 * 무효가 되면 next/image 의 fill 이 인라인으로 넣은 right:0;bottom:0 만 남아
 * 시트가 원본 크기로 프레임 우하단에 붙어버린다(2026-08-25 실사고).
 * 같은 계산을 JS 로 하는 SpriteCrop.tsx 가 이 레포의 정본 패턴이다.
 */
export function pigSpriteFrameStyle(frame: PigSpriteFrame): CSSProperties {
  const width = Math.max(frame.width, 1);
  const height = Math.max(frame.height, 1);
  return {
    "--pig-sprite-aspect-width": frame.width,
    "--pig-sprite-aspect-height": frame.height,
    "--pig-sprite-left": `${(-frame.x / width) * 100}%`,
    "--pig-sprite-top": `${(-frame.y / height) * 100}%`,
    "--pig-sprite-img-width": `${(frame.sheetWidth / width) * 100}%`,
    "--pig-sprite-img-height": `${(frame.sheetHeight / height) * 100}%`,
  } as CSSProperties;
}
