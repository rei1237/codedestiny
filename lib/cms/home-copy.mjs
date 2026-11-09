// 진입 웹툰의 컷별 대사 기본값.
import { entryCuts } from '../brand/entry-webtoon.mjs';


// 관리자가 고친 문장을 받아들이는 기준. apply-home-copy(꿀꿀 히어로·고민 제안)와 웹툰 렌더가 같은 값을 쓴다.
export const HOME_COPY_BANNED = /적중|1위|최고|100%|1년 전/;
export const HOME_COPY_MAX_LENGTH = 2000;

/** @returns {Record<string, Record<string, string>>} entry key → { 필드: 기본 문장 } */
export function homeCopyDefaults() {
  const webtoon = {};
  for (const cut of entryCuts()) cut.lines.forEach((line, index) => { webtoon[`line:${cut.id}:${index}`] = line.text; });
  return {
    'entry-webtoon': webtoon,
  };
}
