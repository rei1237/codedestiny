// CMS ns "home-copy" 의 기본값 — 관리자 편집 화면의 기준점이자 소비 지점의 허용 목록.
//
// 세 묶음(entry)이 있고 값은 모두 `{ 필드: 문장 }` 평면 표다. 관리자는 문장만 고치고, 키는 늘리지 못한다.
//   entry-webtoon   첫 화면(/) 웹툰 대사. 필드 `line:<cutId>:<index>` (lib/brand/entry-webtoon.mjs 가 정본)
//   ggulggul-hero   꿀꿀 홈 히어로. 정본 lib/marketing/yehwa-home.mjs, 셸의 data-cms 가 가리킨다
//   concern-offer   무료 결과의 고민 답·제안. 정본 js/core/saju/concern-answer.js 의 COPY (같은 값을 테스트가 대조)
//
// 가격·환불 한 줄·링크·기록/후기 원문은 여기에 두지 않는다. 가격은 worker/lib/paid-feature-registry.js 에서 생성되고
// 환불 한 줄은 lib/marketing/home-concerns.mjs 의 승인 문구다. 고민 제안의 {label} {stem} 자리는 런타임이 채운다.
import { entryCuts } from '../brand/entry-webtoon.mjs';
import { YEHWA_HERO_COPY } from '../marketing/yehwa-home.mjs';

const CONCERN_OFFER_COPY = Object.freeze({
  'flow-with-stem': "올해 들어오는 {stem} 기운을 내 사주와 맞춰 보면 '{label}' 쪽으로 읽혀요.",
  flow: "올해 기운을 내 사주와 맞춰 보면 '{label}' 쪽으로 읽혀요.",
  'flow-plain': '올해 기운을 내 사주와 차분히 맞춰 봤어요.',
  'field-plain': '서두르기보다 지금 할 수 있는 작은 일부터 살펴보세요.',
  bridge: '{label} 고민을 한 번 더 자세히 짚어 보고 싶다면 아래 풀이가 이어서 도와줄 수 있어요.',
  'bridge-plain': '더 궁금한 고민이 있다면 아래에서 이어서 읽어 볼 수 있어요.',
  'answer-title': '{label} 고민에 대한 짧은 답',
  'answer-title-plain': '올해 흐름에 대한 짧은 답',
  'offer-title': '{label} 고민만 자세히 보기',
  'offer-cta': '풀이 내용 먼저 보기',
});

/** @returns {Record<string, Record<string, string>>} entry key → { 필드: 기본 문장 } */
export function homeCopyDefaults() {
  const webtoon = {};
  for (const cut of entryCuts()) cut.lines.forEach((line, index) => { webtoon[`line:${cut.id}:${index}`] = line.text; });
  return {
    'entry-webtoon': webtoon,
    'ggulggul-hero': { ...YEHWA_HERO_COPY },
    'concern-offer': { ...CONCERN_OFFER_COPY },
  };
}
