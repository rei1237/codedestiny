import test from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG_VERSION, CRYSTAL_CATALOG, CRYSTAL_ELEMENTS, recommendableCrystals, crystalsForElement } from '../../lib/saju/crystal-catalog.mjs';

const REQUIRED = ['id', 'nameKo', 'nameEn', 'aliases', 'variant', 'color', 'element', 'elementBasis', 'symbolicMeanings', 'description', 'sourceUrls', 'image', 'reviewedAt', 'recommendable', 'rank'];
const BASE_TEN = {
  amazonite: 'wood', 'green-phantom-quartz': 'wood', amethyst: 'fire', 'rose-quartz': 'fire', citrine: 'earth',
  'tiger-eye-gold': 'earth', 'clear-quartz': 'metal', 'gold-rutilated-quartz': 'metal', obsidian: 'water', aquamarine: 'water',
};

test('버전과 동결', () => {
  assert.equal(CATALOG_VERSION, 'crystal-catalog-v1');
  assert.ok(Object.isFrozen(CRYSTAL_CATALOG) && CRYSTAL_CATALOG.every((c) => Object.isFrozen(c) && Object.isFrozen(c.symbolicMeanings)));
});

test('필수 필드와 형식', () => {
  for (const c of CRYSTAL_CATALOG) {
    for (const key of REQUIRED) assert.ok(key in c, `${c.id}.${key}`);
    assert.match(c.id, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    assert.ok(CRYSTAL_ELEMENTS.includes(c.element), c.id);
    assert.ok(Array.isArray(c.aliases) && Array.isArray(c.symbolicMeanings) && c.symbolicMeanings.length >= 1, c.id);
    assert.ok(c.sourceUrls.length >= 1 && c.sourceUrls.every((u) => /^https:\/\//.test(u)), c.id);
    assert.equal(c.image, `/images/saju-crystals/stones/${c.id}`);
    assert.match(c.reviewedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(typeof c.elementBasis, 'string');
    assert.ok(c.description.length >= 10 && !/%/.test(c.description), c.id);
    // 의미(상징)와 오행 근거는 다른 필드다
    assert.ok(!c.symbolicMeanings.some((m) => /^(목|화|토|금|수)(\(.\))?$|wood|fire|earth|metal|water/.test(m)), c.id);
  }
});

test('기본 10종이 지정한 오행으로 추천 가능하다', () => {
  for (const [id, el] of Object.entries(BASE_TEN)) {
    const c = CRYSTAL_CATALOG.find((x) => x.id === id);
    assert.ok(c, id);
    assert.equal(c.element, el, id);
    assert.equal(c.recommendable, true, id);
  }
});

test('타이거아이 변종은 별도 항목이고 골드 루틸은 하나뿐이다', () => {
  const tiger = CRYSTAL_CATALOG.filter((c) => /tiger-eye/.test(c.id));
  assert.deepEqual(tiger.map((c) => [c.id, c.element]).sort(), [['tiger-eye-blue', 'water'], ['tiger-eye-gold', 'earth'], ['tiger-eye-red', 'fire']]);
  assert.equal(new Set(tiger.map((c) => c.variant)).size, 3);
  assert.equal(CRYSTAL_CATALOG.filter((c) => /gold.*rutile|rutile.*gold/.test(c.id) || c.nameKo.replace(/\s/g, '') === '골드루틸쿼츠').length, 1);
});

test('중복 없음, 월정석 코드명 충돌 없음', () => {
  assert.equal(new Set(CRYSTAL_CATALOG.map((c) => c.id)).size, CRYSTAL_CATALOG.length);
  assert.equal(new Set(CRYSTAL_CATALOG.map((c) => c.nameKo.replace(/\s/g, ''))).size, CRYSTAL_CATALOG.length);
  assert.ok(!CRYSTAL_CATALOG.some((c) => c.id.includes('moonstone')));
  for (const el of CRYSTAL_ELEMENTS) {
    const ranks = recommendableCrystals().filter((c) => c.element === el).map((c) => c.rank);
    assert.equal(new Set(ranks).size, ranks.length, el);
  }
});

test('추천 불가 항목은 추천 목록에서 빠지고, 오행마다 추천 가능 원석이 있다', () => {
  const off = CRYSTAL_CATALOG.filter((c) => !c.recommendable);
  assert.ok(off.length >= 1);
  const on = recommendableCrystals();
  assert.ok(off.every((c) => !on.includes(c)));
  for (const el of CRYSTAL_ELEMENTS) {
    const list = crystalsForElement(el);
    assert.ok(list.length >= 2, el);
    assert.ok(list.every((c, i) => c.recommendable && c.element === el && (i === 0 || list[i - 1].rank < c.rank)), el);
  }
});

test('가격·판매 필드가 없다', () => {
  for (const c of CRYSTAL_CATALOG) {
    for (const key of Object.keys(c)) assert.ok(!/price|cost|sale|buy|shop|krw|won/i.test(key), `${c.id}.${key}`);
    assert.ok(!/원\)|₩|\d+원/.test(JSON.stringify(c)), c.id);
  }
});
