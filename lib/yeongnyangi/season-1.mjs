// 영냥이 시즌 1 연재표 · 연이의 운명 노벨 웹툰 7편. 1화 「아무도 재촉하지 않았다」는 프롤로그
// (lib/yeongnyangi/prologue.mjs, 항상 공개)가 맡고 2화부터 이어진다. 모두 1122×1402 페이지형(대사가 그림 안에 있다).
// 매주 토요일 21:00 KST 공개. status가 'ready'이고 쪽·alt·이미지가 모두 갖춰진 회차만 publishAt 이후 공개된다.
// 'draft' 회차는 시각이 지나도 공개되지 않는다 — 일정 때문에 미완성 회차를 자동 공개하지 않는다.
// 새 회차: node scripts/import-yeoni-webtoon-episode.mjs --ep N 으로 그림을 content/에 들인 뒤 status를 'ready'로 바꾼다.
// 설계: docs/design/yeongnyangi-season1.md · 발행: .github/workflows/yeongnyangi-weekly-publish.yml

import { PROLOGUE } from './prologue.mjs';
import { SEASON_ONE_PAGES } from './season-1-pages.mjs';

/** @typedef {{ no: number, slug: string, title: string, status: 'ready' | 'draft', publishAt: string, logline: string, format: 'pages', w: number, h: number, pages: Array<{ n: number, alt: string }> }} SerialEpisode */

/** @returns {SerialEpisode} */
function episode(no, status, publishAt) {
  const slug = `ep${no}`;
  const { title, logline, pages } = SEASON_ONE_PAGES[slug];
  return { no, slug, title, status, publishAt, logline, format: 'pages', w: 1122, h: 1402, pages };
}

export const SEASON_ONE = {
  slug: 'season-1',
  title: '영냥이의 점술방 · 시즌 1',
  schedule: { label: '매주 토요일 밤 9시', weekday: 6, hour: 21, timeZone: 'Asia/Seoul' },
  prologue: { href: PROLOGUE.href, title: PROLOGUE.title },
  // 빈 목록이어도 서가·목차·프롤로그 끝 카드·[episode] 라우트·주간 발행이 모두 조용히 동작해야 한다.
  /** @type {SerialEpisode[]} */
  episodes: [
    episode(2, 'ready', '2026-11-21T21:00:00+09:00'),
    episode(3, 'ready', '2026-11-28T21:00:00+09:00'),
    episode(4, 'ready', '2026-12-05T21:00:00+09:00'),
    episode(5, 'ready', '2026-12-12T21:00:00+09:00'),
    episode(6, 'ready', '2026-12-19T21:00:00+09:00'),
    episode(7, 'draft', '2026-12-26T21:00:00+09:00'),
  ],
};
