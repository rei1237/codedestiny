// 영냥이 시즌 1 · 연이의 운명 노벨 웹툰 1화(프롤로그) 「아무도 재촉하지 않았다」. 18쪽 완성 원고(1122×1402)로, 대사가 그림 안에 들어 있다.
// 그래서 각 쪽의 alt에 그 쪽의 구도와 대사·내레이션·화면 글자를 그대로 담는다(스크린리더용, lib/yeongnyangi/season-1-pages.mjs 생성물).
// 이미지: public/images/webtoons/yeoni-prologue/NN-{720,1122}.{avif,webp}. 항상 공개라 연재 게이트를 거치지 않는다.
// 그림 교체: node scripts/import-yeoni-webtoon-episode.mjs --ep 1

import { SEASON_ONE_PAGES } from './season-1-pages.mjs';

export const PROLOGUE_DIR = '/images/webtoons/yeoni-prologue';
export const PROLOGUE_WIDTHS = [720, 1122];

export const PROLOGUE = {
  slug: 'prologue',
  no: 1,
  title: SEASON_ONE_PAGES.ep1.title,
  subtitle: '1화',
  logline: SEASON_ONE_PAGES.ep1.logline,
  href: '/yeongnyangi/season-1/prologue/',
  w: 1122,
  h: 1402,
  pages: SEASON_ONE_PAGES.ep1.pages,
};

/** n쪽 이미지의 경로(확장자·너비 없이). */
export function prologuePage(n) {
  return `${PROLOGUE_DIR}/${String(n).padStart(2, '0')}`;
}
