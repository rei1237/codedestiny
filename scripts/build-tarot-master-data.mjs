#!/usr/bin/env node
// 무료 타로 풀이 문구 데이터 생성기.
// 정본 TAROT_CARDS 에서 분야별 문장만 뽑아 해요체로 바꿔 js/core/tarot/master-reading-data.mjs 로 쓴다.
// 사람이 쓴 문구는 이 파일이 아니라 js/core/tarot/master-reading.mjs 에 둔다.
//   node scripts/build-tarot-master-data.mjs          생성
//   node scripts/build-tarot-master-data.mjs --check  생성물이 최신인지만 확인
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const OUTPUT_PATH = resolve(ROOT, 'js/core/tarot/master-reading-data.mjs');

const HANGUL_BASE = 0xac00;
const parts = (ch) => {
  const code = ch.charCodeAt(0) - HANGUL_BASE;
  if (code < 0 || code > 11171) return null;
  return { cho: Math.floor(code / 588), jung: Math.floor((code % 588) / 28), jong: code % 28 };
};
const compose = (cho, jung, jong = 0) => String.fromCharCode(HANGUL_BASE + cho * 588 + jung * 28 + jong);

// 'ㅂ니다' 앞 음절의 받침을 떼고 어미를 붙일 때 규칙으로 안 풀리는 단어.
const WORD_EXCEPTIONS = {
  보입니다: '보여요', 쌓입니다: '쌓여요', 움직입니다: '움직여요', 줄입니다: '줄여요', 기울입니다: '기울여요',
  아닙니다: '아니에요', 엽니다: '열어요', 풉니다: '풀어요', 겉돕니다: '겉돌아요', 헛돕니다: '헛돌아요',
  느낍니다: '느껴요', 떠오릅니다: '떠올라요', 타오릅니다: '타올라요', 흐릅니다: '흘러요', 다릅니다: '달라요',
  이릅니다: '일러요', 부릅니다: '불러요', 누릅니다: '눌러요', 따릅니다: '따라요', 큽니다: '커요', 아픕니다: '아파요',
  바뀝니다: '바뀌어요', 쉽습니다: '쉬워요', 어렵습니다: '어려워요', 무겁습니다: '무거워요', 조화롭습니다: '조화로워요',
  낫습니다: '나아요', 잇습니다: '이어요', 이끕니다: '이끌어요', 차오릅니다: '차올라요', 앞지릅니다: '앞질러요', 애씁니다: '애써요',
};
// 어간이 다른 활용을 쓰는 복합어(끝이 같은 긴 단어까지 함께 잡는다).
const SUFFIX_EXCEPTIONS = [
  ['듭니다', '들어요'], ['돕니다', '돌아요'], ['스럽습니다', '스러워요'], ['가깝습니다', '가까워요'], ['모릅니다', '몰라요'], ['합니다', '해요'], ['됩니다', '돼요'], ['뗍니다', '떼요'],
];

const VOWEL_A = 0, VOWEL_AE = 1, VOWEL_EO = 4, VOWEL_E = 5, VOWEL_YEO = 6, VOWEL_O = 8, VOWEL_WA = 9, VOWEL_U = 13, VOWEL_WEO = 14, VOWEL_I = 20;
const JONG_SS = 20;

function haeyoWord(word) {
  if (WORD_EXCEPTIONS[word]) return WORD_EXCEPTIONS[word];
  for (const [from, to] of SUFFIX_EXCEPTIONS) {
    if (word.endsWith(from)) return word.slice(0, -from.length) + to;
  }
  // 복합어 끝이 예외 단어와 같으면 그 활용을 따른다(되찾습니다는 규칙으로, 돌아다릅니다 류는 표로).
  for (const [from, to] of Object.entries(WORD_EXCEPTIONS)) {
    if (word.length > from.length && word.endsWith(from)) return word.slice(0, -from.length) + to;
  }
  if (word.endsWith('습니다')) {
    const stem = word.slice(0, -3);
    const last = parts(stem.at(-1));
    if (!last) return null;
    if (last.jong === JONG_SS) return `${stem}어요`;
    return `${stem}${last.jung === VOWEL_A || last.jung === VOWEL_O ? '아요' : '어요'}`;
  }
  if (word.endsWith('입니다')) {
    const stem = word.slice(0, -3);
    if (!stem) return null;
    const last = parts(stem.at(-1));
    return `${stem}${last && last.jong ? '이에요' : '예요'}`;
  }
  if (word.endsWith('니다')) {
    const stem = word.slice(0, -2);
    const last = parts(stem.at(-1));
    if (!last || last.jong !== 17) return null; // 받침 ㅂ
    const head = stem.slice(0, -1);
    const map = { [VOWEL_A]: VOWEL_A, [VOWEL_AE]: VOWEL_AE, [VOWEL_EO]: VOWEL_EO, [VOWEL_E]: VOWEL_E, [VOWEL_O]: VOWEL_WA, [VOWEL_U]: VOWEL_WEO, [VOWEL_I]: VOWEL_YEO };
    const next = map[last.jung];
    if (next === undefined) return null;
    return `${head}${compose(last.cho, next)}요`;
  }
  return null;
}

/** 합쇼체 문장을 해요체로 바꾼다. 변환할 수 없으면 null. */
export function toHaeyo(sentence) {
  const text = String(sentence || '').trim().replace(/역방향/g, '역행').replace(/정방향/g, '순행');
  if (!text) return '';
  let failed = false;
  // 따옴표 안의 '아니다' 같은 평서형 인용은 어미가 아니므로 두고, 따옴표 뒤에 붙은 '입니다'는 앞 글자 받침을 본다.
  const out = text
    .replace(/([가-힣])(['"”’])입니다/g, (_, ch, quote) => `${ch}${quote}${parts(ch).jong ? '이에요' : '예요'}`)
    .replace(/([가-힣]+니다)(?=[\s.!?,]|$)/g, (match) => {
      const next = haeyoWord(match);
      if (!next) failed = true;
      return next || match;
    });
  if (failed || /[가-힣]니다(?=[\s.!?,]|$)|십시오|합시다/.test(out)) return null;
  return out;
}

/** 검수용: 규칙으로 바뀐 단어 목록을 돌려준다. */
export const haeyoWordForReview = haeyoWord;

// 예언 단정, 수익 약속, 공포 조장으로 읽히는 문장은 싣지 않는다.
const BANNED_CORE = /(상대[는가]\s[^.!?]*(싶어|원하고|원합니다|원해요|그리워|후회하|기다리고)|보상으로 이어|온전한 성과로|반드시|틀림없|무조건|100%|\d+\s*%|\d+\s*(일|주|개월|달|년)\s*(안|내|뒤|후)|재회합니다|재회해요|수익을 만들|믿어도 좋|가능성은 열려|가능성이 열려|당첨|합격합니다|합격해요|파산|이혼|외도|질병|발각|돌아옵니다|돌아와요|찾아옵니다|찾아와요|기회가 와|결실을 맺|큰돈|횡재|대박|성공합니다|성공해요|승리합니다|승리해요|이깁니다|이겨요)/;

// 정본 문장 중 결과를 약속하거나, 상대의 반응을 정하거나, 겁을 주는 표현. 무료 풀이에서만 거른다.
const BANNED_OUTCOME = [
  '성공이 따라', '성공적으로 완성', '성공을 완성', '성공은 계속 미뤄', '인정과 기회가 따라', '인정받아요', '인정받는 시기', '좋은 평가를 얻는 시기',
  '충만한 성취로 마무리', '좋은 결실을 얻', '좋은 결과로 이어져', '좋은 결과가 와', '신뢰와 이익을 가져',
  '재물이 늘어나', '재물의 흐름이 열려', '재물의 흐름이 밝고', '재물로 돌아오', '재물로 이어지', '재물의 기회가 돼', '재정이 서서히 회복', '풍요가 완성', '기반이 완성',
  '기다리던 소식이 오거나', '기다리던 연락이나 만남이 성사', '좋은 소식이 오는', '소식이나 연락이 올', '반가운 소식이 올', '고백의 소식이 있는', '연락이 엇갈려',
  '바라던 것이 이뤄지고 있', '바라던 마음이 이뤄져', '바라던 흐름이 이뤄질', '재회의 실마리가 돼', '관계가 회복돼', '관계가 정리돼', '진실이 드러나',
  '상대의 마음을 움직여', '상대의 마음을 열어', '상대를 끌어당겨', '상대의 반응이 살아나', '상대에게 닿아', '상대에게 신뢰를 줘', '상대는 부담을', '서로 고립되어',
  '멀어져요', '곁을 떠나기', '사고로 이어져', '충격이 와', '충격이 올', '무너져요', '더 크게 터져', '붕괴로 이어져', '통제 불가능한 사태', '최악의 생각', '최악은 지났',
  '다툼이 생겨요', '이별의 아픔이 큰 시기', '아쉬움이 큰 시기', '후회가 있는 시기', '아픈 결정이 있는 시기', '균열이 생겨요', '금이 가요',
];
export const BANNED_SENTENCE = new RegExp(`${BANNED_CORE.source}|${BANNED_OUTCOME.join('|')}`);

const sentencesOf = (value) => [].concat(value || [])
  .flatMap((row) => String(row).split(/(?<=[.!?])\s+/))
  .map((s) => s.trim())
  .filter(Boolean);

function pick(values, card, field, issues) {
  // 후보 값을 차례로 보며 금칙 없는 문장을 모은다. 첫 후보에서 살아남은 문장이 있으면 거기서 멈춘다.
  for (const value of values) {
    const kept = [];
    for (const raw of sentencesOf(value)) {
      if (BANNED_SENTENCE.test(raw)) continue;
      const converted = toHaeyo(raw);
      if (converted === null) {
        issues.push(`${card.code} ${field}: ${raw}`);
        continue;
      }
      if (BANNED_SENTENCE.test(converted)) continue;
      kept.push(converted);
    }
    // 앞 문장이 걸러지면 받을 말이 없어지므로 첫머리의 '다만'을 뗀다.
    if (kept.length) return kept.join(' ').replace(/^다만\s+/, '');
  }
  issues.push(`${card.code} ${field}: 쓸 수 있는 문장 없음`);
  return '';
}

const RANK_LABEL = { 1: '에이스', 11: '페이지', 12: '기사', 13: '퀸', 14: '킹' };
const SUIT_LABEL = { wands: '완드', cups: '컵', swords: '소드', pentacles: '펜타클' };
export function displayName(card) {
  if (card.arcana === 'major') return card.nameKo;
  return `${SUIT_LABEL[card.suit]} ${RANK_LABEL[card.number] || card.number}`;
}

function entryFor(card, side, issues) {
  const d = card[side];
  const core = sentencesOf(d.core);
  const fallback = [d.coreMeaning, d.advice];
  return {
    line: pick([core[0], d.coreMeaning], card, 'line', issues),
    core: pick(fallback, card, 'core', issues),
    mind: pick([d.psychologicalMeaning, d.currentMind, ...fallback], card, 'mind', issues),
    daily: pick([d.daily, ...fallback], card, 'daily', issues),
    love: pick([d.love, ...fallback], card, 'love', issues),
    people: pick([d.relationship, ...fallback], card, 'people', issues),
    reunion: pick([d.reunion, ...fallback], card, 'reunion', issues),
    career: pick([d.career, ...fallback], card, 'career', issues),
    money: pick([d.money, d.advice], card, 'money', issues),
    advice: pick([d.advice, d.adviceText, d.coreMeaning], card, 'advice', issues),
    caution: pick([d.caution, d.shadowText, d.advice], card, 'caution', issues),
    // 카드 사이의 이야기에 그대로 인용되므로 금칙 낱말을 뺀다.
    words: (d.keywords || []).filter((word) => !BANNED_SENTENCE.test(word)).slice(0, 3),
  };
}

export async function buildSource() {
  const { TAROT_CARDS } = await import(pathToFileURL(resolve(ROOT, 'lib/tarot/tarot-cards.mjs')).href);
  const issues = [];
  const cards = {};
  for (const card of TAROT_CARDS) {
    cards[card.code] = {
      name: displayName(card),
      number: card.number,
      arcana: card.arcana,
      suit: card.suit,
      element: card.element,
      u: entryFor(card, 'upright', issues),
      r: entryFor(card, 'reversed', issues),
    };
  }
  if (issues.length) {
    throw new Error(`해요체로 바꾸지 못한 문장 ${issues.length}건:\n${issues.join('\n')}`);
  }
  const { CARETARO_BASENAME_BY_CODE } = await import(pathToFileURL(resolve(ROOT, 'lib/tarot/caretaro-card-images.mjs')).href);
  return `// 자동 생성 파일이다. 직접 고치지 말고 scripts/build-tarot-master-data.mjs 를 고쳐 다시 만든다.\nexport const CARETARO_BASENAMES = ${JSON.stringify(CARETARO_BASENAME_BY_CODE)};\nexport const MASTER_READING_CARDS = ${JSON.stringify(cards)};\n`;
}

const isDirectRun = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isDirectRun) {
  const source = await buildSource();
  if (process.argv.includes('--check')) {
    if (readFileSync(OUTPUT_PATH, 'utf8') !== source) {
      console.error('master-reading-data.mjs 가 최신이 아닙니다. node scripts/build-tarot-master-data.mjs 를 실행하세요.');
      process.exit(1);
    }
    console.log('master-reading-data.mjs 최신');
  } else {
    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    writeFileSync(OUTPUT_PATH, source);
    console.log(`생성 ${OUTPUT_PATH} ${Buffer.byteLength(source)} bytes`);
  }
}
