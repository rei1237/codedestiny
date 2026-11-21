// /tarot/mingri/ 무료 세 장(5단계 ①, 2026-11-21 승인) — 셸 무료 세 장 의식(js/saju-engine-tarot-sukuyo-quantum.js)의
// 덱·자리·분야·십성 대체 규칙을 옮긴 순수 모듈. 풀이 문장은 js/core/tarot/master-reading.mjs 가 그대로 만든다.
// 🔴 셸과 같아야 하는 것: 78장 덱(메이저 22 + 마이너 56), 자리 이름, 분야 8종, 카드별 정·역(뽑을 때 0.5 확률),
// 십성 대체(카드 sipsinTag → 별칭 정규화 → 수트 친화 첫째). 셸은 계산된 일간(G_PILLARS)이 있으면 그것을 먼저 쓰지만
// 이 페이지에는 사주 세션이 없어 그 단계가 없다. __tests__/ui/mingri-free-three.test.mjs 가 셸 원본과 묶는다.
import {buildCaretaroCardImageUrl} from './caretaro-card-images.mjs';

export const MINGRI_POSITIONS = ['지금까지의 흐름', '현재의 결', '다음 선택 기준'];
// master-reading.mjs MASTER_READING_CATEGORIES 와 같은 키·순서(셸 분야 칩 순서).
export const MINGRI_CATEGORIES = ['daily', 'love', 'reunion', 'career', 'money', 'health', 'exam', 'people'];

const pad = (n) => (n < 10 ? '0' : '') + n;
// 셸 TAROT_DATA 의 메이저 22장(ar00~ar21) short·name_kr·sipsinTag 그대로.
export const MINGRI_MAJORS = [
  ['thefool', '바보', '식상'], ['themagician', '마법사', '비겁'], ['thehighpriestess', '여사제', '편인'],
  ['theempress', '여황제', '재성'], ['theemperor', '황제', '정관'], ['thehierophant', '교황', '정인'],
  ['TheLovers', '연인', '식상'], ['thechariot', '전차', '비겁'], ['thestrength', '힘', '정인'],
  ['thehermit', '은둔자', '편인'], ['wheeloffortune', '운명의 수레바퀴', '역마'], ['justice', '정의', '정관'],
  ['thehangedman', '매달린 사람', '편인'], ['death', '죽음', '편관'], ['temperance', '절제', '식신'],
  ['thedevil', '악마', '겁재'], ['thetower', '탑', '편관'], ['thestar', '별', '식신'],
  ['themoon', '달', '편인'], ['thesun', '태양', '식신'], ['judgement', '심판', '정관'], ['theworld', '세계', '재성'],
];
const RANKS = ['ace', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'page', 'knight', 'queen', 'king'];
const COURT = {1: '에이스', 11: '페이지', 12: '기사', 13: '퀸', 14: '킹'};
const SUITS = [['wands', 'W', '완드'], ['cups', 'C', '컵'], ['swords', 'S', '소드'], ['pentacles', 'P', '펜타클']];

const TEN_GODS = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'];
const TEN_GOD_ALIAS = {식상: '식신', 비겁: '비견', 재성: '정재', 관성: '정관', 인성: '정인', 역마: '편재'};
// 셸 SUIT_TEN_GOD_AFFINITY 의 primary 첫째. 메이저는 'contextual' 이라 셸이 '정인'으로 둔다.
const SUIT_TEN_GOD = {wands: '식신', cups: '정인', swords: '정관', pentacles: '정재', major: '정인'};

export function normalizeTenGod(raw) {
  const value = String(raw || '').trim();
  return TEN_GODS.includes(value) ? value : (TEN_GOD_ALIAS[value] || '');
}

/** 셸 tarotRitualFullDeck 순서의 78장. code 는 master-reading 코드(M00·W01…). */
export const MINGRI_DECK = (() => {
  const deck = MINGRI_MAJORS.map(([short, name, tag], i) => ({code: 'M' + pad(i), short, name, suit: 'major', tag}));
  for (const [suit, letter, label] of SUITS) {
    RANKS.forEach((rank, i) => {
      deck.push({code: letter + pad(i + 1), short: rank + 'of' + suit, name: label + ' ' + (COURT[i + 1] || i + 1), suit, tag: ''});
    });
  }
  return deck;
})();
const BY_CODE = new Map(MINGRI_DECK.map((card) => [card.code, card]));

export function mingriCard(code) {
  return BY_CODE.get(String(code || '').toUpperCase()) || null;
}

/** 셸 resolveMainTenGod 의 사주 없는 경로: 카드 태그 → 수트 친화. */
export function mingriTenGod(code) {
  const card = mingriCard(code);
  if (!card) return '정인';
  return normalizeTenGod(card.tag) || SUIT_TEN_GOD[card.suit] || '정인';
}

/** 셸과 같은 순서: 찻집 그림(480 축소) → 공개 덱 webp. */
export function mingriCardImages(code) {
  const card = mingriCard(code);
  if (!card) return [];
  const remote = buildCaretaroCardImageUrl(card.code, {width: 480});
  const local = '/tarot-cards/' + (card.short === 'TheLovers' ? 'TheLovers' : card.short.toLowerCase()) + '.webp';
  return [remote, local].filter(Boolean);
}

/** 덱 번호(0~77)를 섞는다. random 은 [0,1) 함수(테스트에서 고정). */
export function shuffleMingriDeck(random = Math.random) {
  const order = MINGRI_DECK.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** 한 장을 고를 때 정·역을 정한다(셸 tarotRitualPick 과 같은 0.5). */
export function drawMingriOrientation(random = Math.random) {
  return random() < 0.5;
}
