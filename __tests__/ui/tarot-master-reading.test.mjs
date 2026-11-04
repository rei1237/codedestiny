import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { buildSource, BANNED_SENTENCE, OUTPUT_PATH, toHaeyo } from '../../scripts/build-tarot-master-data.mjs';
import {
  buildMasterReading,
  caretaroImageUrl,
  MASTER_READING_CATEGORIES,
  MODAL_POSITIONS,
  sipsinNote,
} from '../../js/core/tarot/master-reading.mjs';
import { MASTER_READING_CARDS } from '../../js/core/tarot/master-reading-data.mjs';
import { buildCaretaroCardImageUrl, CARETARO_BASENAME_BY_CODE } from '../../lib/tarot/caretaro-card-images.mjs';

const CODES = Object.keys(MASTER_READING_CARDS);
const CATEGORIES = Object.keys(MASTER_READING_CATEGORIES);
const reading = (codes, category = 'daily', reversed = [false, false, false], surface = 'modal') => buildMasterReading({
  cards: codes.map((code, i) => ({ code, reversed: reversed[i] })),
  category,
  surface,
  positions: MODAL_POSITIONS,
});
const flatten = (r) => [
  r.verdict, r.between, r.close, r.synthesis.flow, r.synthesis.caution, r.synthesis.action,
  ...r.positions.map((p) => p.text),
  ...r.energy.flatMap((e) => [e.head, e.body]),
].join(' ');
// 78장을 세 장씩 겹치지 않게 돌려 전 카드·전 분야·정역을 훑는다.
const samples = () => {
  const rows = [];
  for (let i = 0; i < CODES.length; i += 1) {
    const codes = [CODES[i], CODES[(i + 29) % 78], CODES[(i + 53) % 78]];
    const category = CATEGORIES[i % CATEGORIES.length];
    rows.push([codes, category, [i % 2 === 0, i % 3 === 0, i % 5 === 0]]);
    rows.push([codes, CATEGORIES[(i + 3) % CATEGORIES.length], [i % 2 === 1, false, i % 3 === 1]]);
  }
  return rows;
};

test('전 카드 조합에 금칙 표현과 합쇼체가 없다', () => {
  for (const [codes, category, reversed] of samples()) {
    const text = flatten(reading(codes, category, reversed));
    assert.equal(BANNED_SENTENCE.test(text), false, `${codes} ${category}: ${text.match(BANNED_SENTENCE)?.[0]}`);
    assert.equal(/[가-힣]니다(?=[\s.!?,]|$)/.test(text), false, `${codes} ${category}: 합쇼체`);
    assert.equal(/undefined|null|NaN/.test(text), false, `${codes} ${category}: 빈 값`);
  }
});

test('메이저 번호 숫자를 화면 문구에 쓰지 않는다', () => {
  const r = reading(['M18', 'M17', 'M19']);
  const row = r.energy.find((e) => e.label === '숫자 흐름');
  assert.equal(/\d/.test(row.head + row.body), false);
});

test('같은 입력이면 같은 풀이가 나온다', () => {
  assert.deepEqual(reading(['M18', 'C02', 'M17'], 'love', [true, false, false]), reading(['M18', 'C02', 'M17'], 'love', [true, false, false]));
});

test('분야가 바뀌면 결론과 자리별 읽기가 달라진다', () => {
  const results = CATEGORIES.map((c) => reading(['M18', 'C02', 'M17'], c, [true, false, false]));
  assert.equal(new Set(results.map((r) => r.verdict)).size, CATEGORIES.length);
  assert.equal(new Set(results.map((r) => r.positions[1].text)).size > 4, true);
});

test('방향이 바뀌면 자리별 읽기와 결론이 달라진다', () => {
  const up = reading(['M16', 'C02', 'M17'], 'daily', [false, false, false]);
  const down = reading(['M16', 'C02', 'M17'], 'daily', [true, false, false]);
  assert.notEqual(up.positions[0].text, down.positions[0].text);
  assert.notEqual(up.verdict, down.verdict);
  assert.equal(down.positions[0].dirLabel, '역행');
});

test('건강과 재물 풀이에는 안전 문구가 들어간다', () => {
  assert.match(reading(['M16', 'C02', 'M17'], 'health').synthesis.caution, /전문가/);
  assert.match(reading(['M16', 'C02', 'M17'], 'money').synthesis.caution, /확인된 정보/);
});

test('마이너가 없으면 우세 수트 행을 만들지 않는다', () => {
  const labels = (r) => r.energy.map((e) => e.label);
  assert.equal(labels(reading(['M18', 'M17', 'M19'])).includes('우세 수트'), false);
  assert.equal(labels(reading(['M18', 'C02', 'M17'])).includes('우세 수트'), true);
});

test('오늘의 타로는 넘겨준 자리별 문구를 쓰고 방향을 표시하지 않는다', () => {
  const r = buildMasterReading({
    cards: [{ code: 'M09' }, { code: 'M14' }, { code: 'M19' }],
    category: 'daily',
    surface: 'today',
    positions: ['오늘의 마음', '마주할 흐름', '작은 실천'],
    positionTexts: ['하나', '둘', '셋'],
  });
  assert.deepEqual(r.positions.map((p) => p.text), ['하나', '둘', '셋']);
  assert.deepEqual(r.positions.map((p) => p.dirLabel), ['', '', '']);
  assert.equal(r.energy.some((e) => e.label === '우세 수트'), false);
  assert.equal(flatten(r).includes('역행'), false);
});

test('없는 카드 코드는 오류로 알린다', () => {
  assert.throws(() => reading(['M99', 'C02', 'M17']));
});

test('십성 문구는 태그별로 나오고 없는 태그도 비지 않는다', () => {
  const note = sipsinNote([{ name: '달', tenGod: '편인' }, { name: '컵 2', tenGod: '' }, { name: '별', tenGod: '식신' }]);
  assert.match(note, /달의 편인은/);
  assert.match(note, /별의 식신은/);
  assert.match(note, /컵 2/);
  assert.equal(/[가-힣]니다(?=[\s.!?,]|$)/.test(note), false);
});

test('찻집 카드 주소는 정본 규칙과 같다', () => {
  for (const code of Object.keys(CARETARO_BASENAME_BY_CODE)) {
    assert.equal(caretaroImageUrl(code, { width: 400 }), buildCaretaroCardImageUrl(code, { width: 400 }));
  }
  assert.equal(caretaroImageUrl('M18'), buildCaretaroCardImageUrl('M18'));
  assert.equal(caretaroImageUrl('X'), '');
});

test('모달의 찻집 카드 표는 정본과 일치하고 모달의 모든 카드를 덮는다', () => {
  const source = readFileSync(new URL('../../js/saju-engine-tarot-sukuyo-quantum.js', import.meta.url), 'utf8');
  const section = (start, end) => source.slice(source.indexOf(start), source.indexOf(end));
  const context = {};
  vm.runInNewContext(`${section('/* caretaro-table:start */', '/* caretaro-table:end */')}
this.table = TAROT_CARETARO_BY_SHORT;`, context);
  const entries = Object.values(context.table);
  assert.deepEqual(
    Object.fromEntries(entries.map((entry) => [entry.code, entry.basename])),
    CARETARO_BASENAME_BY_CODE,
  );
  const filenames = section('var TAROT_SHORT_TO_FILENAME = {', 'function getTarotImageCandidates');
  const shorts = [...filenames.matchAll(/(\w+):\s*'/g)].map((match) => match[1]);
  assert.equal(shorts.length, 79);
  assert.deepEqual(shorts.filter((short) => !context.table[short]), []);
});

test('말투 변환은 불규칙 활용을 지킨다', () => {
  const cases = {
    '흐름입니다.': '흐름이에요.',
    '시기입니다.': '시기예요.',
    '마음이 흐릅니다.': '마음이 흘러요.',
    '길을 엽니다.': '길을 열어요.',
    '일이 쉽습니다.': '일이 쉬워요.',
    '주위를 맴돕니다.': '주위를 맴돌아요.',
    '마음이 혼란스럽습니다.': '마음이 혼란스러워요.',
    "'소원의 카드'입니다.": "'소원의 카드'예요.",
    "'아직 아니다'라고 말합니다.": "'아직 아니다'라고 말해요.",
  };
  for (const [from, to] of Object.entries(cases)) assert.equal(toHaeyo(from), to);
});

test('생성물이 정본 데이터와 일치한다', async () => {
  assert.equal(readFileSync(OUTPUT_PATH, 'utf8'), await buildSource());
});
