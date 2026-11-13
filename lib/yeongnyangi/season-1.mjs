// 영냥이 시즌 1 연재표. 프롤로그 「운명을 알고 싶다」(lib/yeongnyangi/prologue.mjs, 항상 공개)가 1화 자리를 맡고
// 2화부터 이어진다. 1화 「데운 방석」은 2026-11-13 연재에서 내리고 그림을 이용 안내 웹툰(lib/brand/moonlight-guide.mjs)에 쓴다.
// 매주 토요일 21:00 KST 공개. status가 'ready'이고 컷·이미지가 모두 갖춰진 회차만 publishAt 이후 공개된다.
// 'draft' 회차는 시각이 지나도 공개되지 않는다 — 일정 때문에 미완성 회차를 자동 공개하지 않는다.
// 설계: docs/design/yeongnyangi-season1.md · 발행: .github/workflows/yeongnyangi-weekly-publish.yml

import { PROLOGUE } from './prologue.mjs';

export const SEASON_ONE = {
  slug: 'season-1',
  title: '영냥이의 점술방 · 시즌 1',
  schedule: { label: '매주 토요일 밤 9시', weekday: 6, hour: 21, timeZone: 'Asia/Seoul' },
  prologue: { href: PROLOGUE.href, title: PROLOGUE.title },
  // 2026-11-13 옛 2~6화(젖은 봉투 등)를 내렸다. 새 2~7화(페이지형)는 작화가 끝나면 다시 채운다.
  // 빈 목록이어도 서가·목차·프롤로그 끝 카드·[episode] 라우트·주간 발행이 모두 조용히 동작해야 한다.
  /** @type {Array<{ no: number, slug: string, title: string, status: 'ready' | 'draft', publishAt: string, logline: string, nextQuestion: string }>} */
  episodes: [],
};
