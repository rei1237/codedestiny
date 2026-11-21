import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MASTER_READING_CARDS, CARETARO_BASENAMES} from '../../js/core/tarot/master-reading-data.mjs';
import {MASTER_READING_CATEGORIES, MODAL_POSITIONS} from '../../js/core/tarot/master-reading.mjs';
import {
  MINGRI_CATEGORIES, MINGRI_DECK, MINGRI_MAJORS, MINGRI_POSITIONS,
  drawMingriOrientation, mingriCardImages, mingriTenGod, normalizeTenGod, shuffleMingriDeck,
} from '../../lib/tarot/mingri-free-three.mjs';

const SHELL = readFileSync(new URL('../../js/saju-engine-tarot-sukuyo-quantum.js', import.meta.url), 'utf8');

test('메이저 22장의 short·이름·십성 태그가 셸 TAROT_DATA 와 같다', () => {
  const rows = [...SHELL.matchAll(/\{id:'ar(\d\d)', name:'[^']*', name_kr:'([^']*)', short:'([^']*)', type:'major', sipsinTag:'([^']*)'/g)]
    .map((m) => [Number(m[1]), m[3], m[2], m[4]]);
  assert.equal(rows.length, 22);
  rows.forEach(([i, short, name, tag]) => assert.deepEqual(MINGRI_MAJORS[i], [short, name, tag], `ar${i}`));
});

test('자리·분야가 셸 의식·풀이 엔진과 같다', () => {
  assert.deepEqual(MINGRI_POSITIONS, MODAL_POSITIONS);
  assert.match(SHELL, /TAROT_RITUAL_POSITIONS = \['지금까지의 흐름', '현재의 결', '다음 선택 기준'\]/);
  assert.deepEqual(MINGRI_CATEGORIES, Object.keys(MASTER_READING_CATEGORIES));
});

test('78장 덱의 코드가 풀이 엔진·찻집 그림과 모두 맞는다', () => {
  assert.equal(MINGRI_DECK.length, 78);
  assert.equal(new Set(MINGRI_DECK.map((c) => c.code)).size, 78);
  for (const card of MINGRI_DECK) {
    assert.ok(MASTER_READING_CARDS[card.code], card.code);
    assert.ok(CARETARO_BASENAMES[card.code], card.code);
    const [remote, local] = mingriCardImages(card.code);
    assert.ok(remote.includes(encodeURIComponent(CARETARO_BASENAMES[card.code] + '.webp')), card.code);
    assert.match(local, /^\/tarot-cards\/[A-Za-z]+\.webp$/);
  }
  // 셸 마이너 이름 규칙(완드 에이스·컵 퀸·소드 10)
  assert.equal(MINGRI_DECK.find((c) => c.code === 'W01').name, '완드 에이스');
  assert.equal(MINGRI_DECK.find((c) => c.code === 'C13').name, '컵 퀸');
  assert.equal(MINGRI_DECK.find((c) => c.code === 'S10').name, '소드 10');
});

test('십성 대체가 셸 resolveMainTenGod 의 사주 없는 경로와 같다', () => {
  assert.equal(normalizeTenGod('식상'), '식신');
  assert.equal(normalizeTenGod('역마'), '편재');
  assert.equal(normalizeTenGod('없음'), '');
  assert.equal(mingriTenGod('M00'), '식신');
  assert.equal(mingriTenGod('M15'), '겁재');
  assert.equal(mingriTenGod('W03'), '식신');
  assert.equal(mingriTenGod('C07'), '정인');
  assert.equal(mingriTenGod('S14'), '정관');
  assert.equal(mingriTenGod('P02'), '정재');
  assert.match(SHELL, /wands: \{ primary: \['식신'/);
  assert.match(SHELL, /cups: \{ primary: \['정인'/);
  assert.match(SHELL, /swords: \{ primary: \['정관'/);
  assert.match(SHELL, /pentacles: \{ primary: \['정재'/);
  assert.match(SHELL, /'역마': '편재'/);
});

test('섞기는 78장 순열이고 정·역은 0.5 기준이다', () => {
  let seed = 7;
  const random = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const order = shuffleMingriDeck(random);
  assert.deepEqual([...order].sort((a, b) => a - b), MINGRI_DECK.map((_, i) => i));
  assert.equal(drawMingriOrientation(() => 0.49), true);
  assert.equal(drawMingriOrientation(() => 0.5), false);
});
