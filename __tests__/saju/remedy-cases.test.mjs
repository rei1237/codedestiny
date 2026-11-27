// 액땜 정본 모듈(lib/saju/remedy/) 판정·직렬화·카드 계약 테스트.
// 케이스마다 켜지는 입력과 꺼지는 입력을 짝으로 두고, 골든 차트(30건)로 분포를 잰다. 엔진 파일은 고치지 않는다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { correctLine } from '../../lib/webtoon-result/narrator.mjs';
import {
  computeRemedyCases, serializeRemedyForPrompt, buildRemedyCardModel, normalizeRemedyLocale,
  REMEDY_VERSION, REMEDY_NARRATORS, REMEDY_IMAGES, DEFAULT_REMEDY_LIMIT, DEFAULT_REMEDY_VISIBLE,
  REMEDY_CASE_IDS, CASE_META, REMEDY_DISCLAIMER_KO,
} from '../../lib/saju/remedy/index.mjs';
import { readSajuChart } from '../../lib/saju/remedy/detect-saju.mjs';
import { calculateLifeBookAiSaju } from '../../worker/lib/life-book-ai-saju.js';
import { calculateZiweiAiChart } from '../../worker/lib/ziwei-ai-chart.js';

const plain = (value) => JSON.parse(JSON.stringify(value));
const all = (input) => computeRemedyCases(input, { limit: 99 });
const ids = (result) => result.cases.map((row) => row.caseId);
const find = (result, caseId) => result.cases.find((row) => row.caseId === caseId);

// ── 합성 사주: 고정 natalCore(쓸 오행 水, 꺼리는 오행 金)로 판정만 본다. 기본 원국은 2026 丙午 해에 원진(丑-午)만 낸다.
const core = ({ avoid = ['metal'], byEl = {}, johu = { status: 'ok', urgent: false } } = {}) => ({
  status: 'ok',
  counts: { byEl: { wood: 2, fire: 2, earth: 2, metal: 2, water: 1, ...byEl } },
  yongsinMethods: { final: { yongsin: 'water', useful: ['water'], avoid }, johu },
});
const BASE = { year: '乙丑', month: '戊寅', day: '乙卯', hour: '丁亥' };
const saju = (patch = {}, extra = {}) => ({ pillars: { ...BASE, ...patch }, natalCore: core(extra.core), ...(extra.daewoon ? { daewoon: extra.daewoon } : {}) });
const sajuCase = (input, refYear) => ({ saju: input, refYear });

// ── 합성 자미 명반: 12궁 모두 주성 하나, 살성·화기 없음. 음력 1990년생 → 2026년 37세.
const PALACES = ['명궁', '형제궁', '부처궁', '자녀궁', '재백궁', '질액궁', '천이궁', '노복궁', '관록궁', '전택궁', '복덕궁', '부모궁'];
const ziwei = (patch = {}, extra = {}) => ({
  palaces: PALACES.map((name) => ({ name, mainStars: ['자미'], maleficStars: [], transformations: [], ...(patch[name] || {}) })),
  lunar: { year: 1990 },
  majorLuck: [],
  uncertainty: { birthTimeUnknown: false },
  ...extra,
});
const ziweiCase = (input) => ({ ziwei: input, refYear: 2026 });
const decade = (startAge, palaceName, transformations) => ({ majorLuck: [{ startAge, endAge: startAge + 9, palaceName, transformations }] });

// 케이스마다 켜지는 입력(pos)과 한 곳만 바꿔 꺼지는 입력(neg). evidence 는 근거 값 하나와 같아야 한다.
const CASES = [
  { caseId: 'day-clash', pos: sajuCase(saju({ day: '甲子' }), 2026), neg: sajuCase(saju(), 2026), evidence: '일지 子와 충' },
  { caseId: 'month-clash', pos: sajuCase(saju({ month: '丙子' }), 2026), neg: sajuCase(saju(), 2026), evidence: '월지 子와 충' },
  { caseId: 'year-clash', pos: sajuCase(saju({ year: '甲子' }), 2026), neg: sajuCase(saju({ hour: '丙子' }), 2026), evidence: '년지 子와 충' },
  { caseId: 'hyeong', pos: sajuCase(saju({ hour: '丙戌' }), 2027), neg: sajuCase(saju(), 2026), evidence: '시지 戌과 형(삼형)' },
  { caseId: 'wonjin', pos: sajuCase(saju(), 2026), neg: sajuCase(saju({ year: '甲寅' }), 2026), evidence: '년지 丑과 원진' },
  { caseId: 'baekho', pos: sajuCase(saju({}, { daewoon: { pillar: '丁丑', startYear: 2022, endYear: 2031 } }), 2026), neg: sajuCase(saju({}, { daewoon: { pillar: '丙子', startYear: 2022, endYear: 2031 } }), 2026), evidence: '丁丑 대운(2022~2031)', period: '2022~2031 대운' },
  { caseId: 'yangin', pos: sajuCase(saju({ day: '丙寅' }), 2026), neg: sajuCase(saju(), 2026), evidence: '양인살' },
  { caseId: 'yeokma', pos: sajuCase(saju({ day: '甲午' }), 2028), neg: sajuCase(saju(), 2028), evidence: '역마살' },
  { caseId: 'sangmun-jogaek', pos: sajuCase(saju({ year: '甲辰' }), 2026), neg: sajuCase(saju(), 2026), evidence: '상문살' },
  { caseId: 'sangmun-jogaek', pos: sajuCase(saju({ year: '甲申' }), 2026), neg: sajuCase(saju(), 2026), evidence: '조객살' },
  { caseId: 'gongmang-year', pos: sajuCase(saju({ day: '甲申' }), 2026), neg: sajuCase(saju(), 2026), evidence: '공망' },
  { caseId: 'samjae', pos: sajuCase(saju({ year: '乙亥' }), 2026), neg: sajuCase(saju({ year: '乙亥' }), 2028), evidence: '2026 눌삼재(삼재 2년 차)' },
  { caseId: 'daewoon-shift', pos: sajuCase(saju({}, { daewoon: { pillar: '丙子', startYear: 2026, endYear: 2035 } }), 2026), neg: sajuCase(saju({}, { daewoon: { pillar: '丙子', startYear: 2022, endYear: 2031 } }), 2026), evidence: '2026년부터 丙子 대운' },
  { caseId: 'daewoon-shift', pos: sajuCase(saju({}, { daewoon: { pillar: '丙子', startYear: 2017, endYear: 2026 } }), 2026), neg: sajuCase(saju({}, { daewoon: { pillar: '丙子', startYear: 2017, endYear: 2027 } }), 2026), evidence: '2027년 대운 교체' },
  // 기신 해는 세운 천간·지지가 모두 꺼리는 오행일 때만(GISIN_YEAR_RULE='both'): 2026 丙午는 둘 다 火, 2027 丁未는 하나만.
  { caseId: 'gisin-year', pos: sajuCase(saju({}, { core: { avoid: ['fire'] } }), 2026), neg: sajuCase(saju({}, { core: { avoid: ['fire'] } }), 2027), evidence: '꺼리는 오행 화(火)' },
  // 오행 과다는 꺼리는 오행이 원국 4칸 이상(ELEMENT_EXCESS_MIN).
  { caseId: 'element-excess', pos: sajuCase(saju({}, { core: { avoid: ['wood'], byEl: { wood: 4 } } }), 2026), neg: sajuCase(saju({}, { core: { avoid: ['wood'], byEl: { wood: 3 } } }), 2026), evidence: '원국 목(木) 4칸' },
  { caseId: 'johu-urgent', variant: 'warm', pos: sajuCase(saju({}, { core: { johu: { status: 'ok', urgent: true, type: '한습', useful: ['fire'] } } }), 2026), neg: sajuCase(saju({}, { core: { johu: { status: 'ok', urgent: false, type: '한습', useful: ['fire'] } } }), 2026), evidence: '원국 조후 한습' },
  { caseId: 'johu-urgent', variant: 'hydrate', pos: sajuCase(saju({}, { core: { johu: { status: 'ok', urgent: true, type: '조열', useful: ['water'] } } }), 2026), neg: sajuCase(saju(), 2026), evidence: '원국 조후 조열' },
  { caseId: 'zw-decade-hwagi', variant: 'wealth', pos: ziweiCase(ziwei({}, decade(34, '관록궁', ['화록:태양(명궁)', '화기:문곡(재백궁)']))), neg: ziweiCase(ziwei({}, decade(24, '관록궁', ['화기:문곡(재백궁)']))), evidence: '재백궁에 화기(문곡)', period: '34~43세 대한' },
  { caseId: 'zw-decade-hwagi', variant: 'spouse', pos: ziweiCase(ziwei({}, decade(34, '부처궁', ['화기:문곡(부처궁)']))), neg: ziweiCase(ziwei({}, decade(34, '관록궁', ['화기:문곡(형제궁)']))), evidence: '부부궁에 화기(문곡)' },
  { caseId: 'zw-natal-hwagi', variant: 'health', pos: ziweiCase(ziwei({ 질액궁: { transformations: ['화기:태음'] } })), neg: ziweiCase(ziwei({ 형제궁: { transformations: ['화기:태음'] } })), evidence: '질액궁 화기(태음)' },
  { caseId: 'zw-yang-tuo', pos: ziweiCase(ziwei({ 명궁: { maleficStars: ['경양'] } })), neg: ziweiCase(ziwei({ 재백궁: { maleficStars: ['경양'] } })), evidence: '명궁 경양' },
  { caseId: 'zw-huo-ling', pos: ziweiCase(ziwei({ 천이궁: { maleficStars: ['영성'] } })), neg: ziweiCase(ziwei({ 재백궁: { maleficStars: ['화성'] } })), evidence: '천이궁 영성' },
  { caseId: 'zw-kong-jie', pos: ziweiCase(ziwei({ 전택궁: { maleficStars: ['지겁'] } })), neg: ziweiCase(ziwei({ 명궁: { maleficStars: ['지공'] } })), evidence: '전택궁 지겁' },
  { caseId: 'zw-travel-malefic', pos: ziweiCase(ziwei({ 천이궁: { maleficStars: ['타라'] } })), neg: ziweiCase(ziwei({ 명궁: { maleficStars: ['타라'] } })), evidence: '천이궁 타라' },
  { caseId: 'zw-empty-ming', pos: ziweiCase(ziwei({ 명궁: { mainStars: [] }, 천이궁: { mainStars: ['태양', '거문'] } })), neg: ziweiCase(ziwei()), evidence: '마주 보는 천이궁 태양·거문' },
];

test('케이스 22개 모두 켜지는 입력과 꺼지는 입력이 있다', () => {
  const covered = new Set(CASES.map((row) => row.caseId));
  assert.deepEqual(REMEDY_CASE_IDS.filter((id) => id !== 'everyday-balance' && !covered.has(id)), []);
  assert.equal(REMEDY_CASE_IDS.length, 23);
  assert.equal(REMEDY_CASE_IDS.filter((id) => CASE_META[id].system === 'saju' && id !== 'everyday-balance').length, 15);
  assert.equal(REMEDY_CASE_IDS.filter((id) => CASE_META[id].system === 'ziwei').length, 7);
});

for (const row of CASES) {
  test(`${row.caseId}${row.variant ? `:${row.variant}` : ''} — ${row.evidence}`, () => {
    const on = all(row.pos);
    assert.equal(on.valid, true);
    const hit = find(on, row.caseId);
    assert.ok(hit, `켜져야 한다: ${ids(on).join(',')}`);
    assert.equal(hit.variant, row.variant || '');
    assert.equal(hit.system, CASE_META[row.caseId].system);
    assert.equal(hit.priority, CASE_META[row.caseId].priority);
    assert.ok(hit.evidence.some((item) => item.value === row.evidence), JSON.stringify(hit.evidence));
    if (row.period) assert.equal(hit.period.label, row.period);
    assert.ok(hit.methodIds.length >= 3, hit.methodIds.join(','));
    const off = all(row.neg);
    assert.equal(off.valid, true);
    assert.equal(find(off, row.caseId), undefined, `꺼져야 한다: ${ids(off).join(',')}`);
  });
}

test('삼재 케이스는 그해 단계와 세 해를 싣는다', () => {
  const hit = find(all(sajuCase(saju({ year: '乙亥' }), 2026)), 'samjae');
  assert.deepEqual(plain(hit.samjae), { stage: '눌삼재', years: [2025, 2026, 2027] });
  assert.deepEqual(plain(hit.evidence[0]), { label: '띠', value: '돼지띠(亥)' });
});

test('시를 모르면 시지 근거를 쓰지 않고, 자미는 케이스를 내지 않는다', () => {
  const known = all(sajuCase(saju({ hour: '丙戌' }), 2027));
  assert.ok(find(known, 'hyeong').evidence.some((item) => item.value.startsWith('시지')));
  const unknown = all(sajuCase({ ...saju({ hour: '丙戌' }), timeUnknown: true }, 2027));
  assert.ok(unknown.cases.every((row) => row.evidence.every((item) => !item.value.startsWith('시지'))), JSON.stringify(unknown.cases));
  const zw = all({ ziwei: ziwei({ 명궁: { maleficStars: ['경양'] } }, { uncertainty: { birthTimeUnknown: true } }), refYear: 2026 });
  assert.equal(zw.valid, true);
  assert.equal(zw.sources.ziwei, 'time-unknown');
  assert.deepEqual(plain(zw.cases), []);
});

test('아무 케이스도 없으면 사주는 평소 균형 케이스 하나, 자미만 있으면 빈 목록', () => {
  const quiet = all(sajuCase(saju({ year: '甲寅' }), 2026));
  assert.deepEqual(ids(quiet), ['everyday-balance']);
  assert.deepEqual(plain(quiet.cases[0].evidence), [{ label: '오행', value: '힘이 되는 오행 수(水)' }]);
  const both = all({ saju: saju({ year: '甲寅' }), ziwei: ziwei({ 명궁: { maleficStars: ['경양'] } }), refYear: 2026 });
  assert.deepEqual(ids(both), ['zw-yang-tuo'], '다른 케이스가 있으면 기본 케이스를 붙이지 않는다');
  const zwOnly = all(ziweiCase(ziwei()));
  assert.equal(zwOnly.valid, true);
  assert.deepEqual(plain(zwOnly.sources), { saju: false, ziwei: true });
  assert.deepEqual(plain(zwOnly.cases), []);
});

test('우선순위 내림차순(같으면 caseId 순)으로 정렬하고 기본 5개로 자른다', () => {
  const input = {
    saju: saju({ year: '甲午', day: '甲子' }, { daewoon: { pillar: '丁丑', startYear: 2026, endYear: 2035 } }),
    ziwei: ziwei({ 명궁: { maleficStars: ['경양', '화성'] }, 천이궁: { maleficStars: ['타라'] }, 재백궁: { maleficStars: ['지공'] } }),
    refYear: 2028,
  };
  const full = all(input);
  assert.ok(full.total > DEFAULT_REMEDY_LIMIT, `총 ${full.total}`);
  const order = full.cases.map((row) => [row.priority, row.caseId]);
  const sorted = [...order].sort((a, b) => b[0] - a[0] || (a[1] < b[1] ? -1 : 1));
  assert.deepEqual(order, sorted);
  const top = computeRemedyCases(input);
  assert.equal(top.cases.length, DEFAULT_REMEDY_LIMIT);
  assert.equal(top.total, full.total);
  assert.deepEqual(ids(top), ids(full).slice(0, DEFAULT_REMEDY_LIMIT));
  assert.equal(computeRemedyCases(input, { limit: 2 }).cases.length, 2);
  assert.equal(computeRemedyCases(input, { limit: 0 }).cases.length, 1);
});

test('읽을 수 없는 입력은 이유와 함께 invalid, 던지지 않는다', () => {
  assert.equal(computeRemedyCases({ saju: saju() }).reason, 'refYear');
  assert.equal(computeRemedyCases({ refYear: 2026 }).reason, 'input');
  assert.equal(computeRemedyCases({ saju: { pillars: { year: '甲子', month: '丙寅' } }, refYear: 2026 }).reason, 'input');
  assert.equal(computeRemedyCases({ ziwei: { palaces: PALACES.slice(1).map((name) => ({ name })) }, refYear: 2026 }).reason, 'input');
  const boom = new Proxy({}, { get() { throw new Error('boom'); } });
  const fuzz = [undefined, null, 0, 'x', [], {}, { refYear: 'abc' }, { refYear: Infinity, saju: saju() }, { refYear: 2026, saju: 'x', ziwei: 3 },
    { refYear: 2026, saju: { pillars: { year: 1, month: {}, day: [] } } }, { refYear: 2026, saju: boom }, { refYear: 2026, ziwei: boom }, boom,
    { refYear: 2026, saju: { pillars: BASE, natalCore: boom, daewoon: boom, sewoon: boom } }, { refYear: 2026, locale: Symbol('x'), saju: saju() }];
  for (const input of fuzz) {
    const result = computeRemedyCases(input, boom);
    assert.equal(typeof result.valid, 'boolean');
    assert.equal(result.version, REMEDY_VERSION);
    assert.ok(Array.isArray(result.cases));
    assert.equal(typeof serializeRemedyForPrompt(result, boom), 'string');
    const card = buildRemedyCardModel(result, boom);
    assert.ok(card === null || Array.isArray(card.cards));
  }
  for (const value of [undefined, null, 0, 'x', [], boom, { valid: true, locale: 'ko', cases: [boom] }, { valid: true, locale: 'ko', cases: [{ caseId: 'wonjin' }] }]) {
    assert.equal(serializeRemedyForPrompt(value), '');
    assert.equal(buildRemedyCardModel(value), null);
  }
});

test('로케일: ko 계열만 문구를 낸다', () => {
  assert.equal(normalizeRemedyLocale(''), 'ko');
  assert.equal(normalizeRemedyLocale('ko-KR'), 'ko');
  assert.equal(normalizeRemedyLocale('EN'), 'en');
  assert.equal(normalizeRemedyLocale(7), 'ko');
  const en = computeRemedyCases({ saju: saju(), refYear: 2026, locale: 'en' });
  assert.equal(en.valid, true);
  assert.equal(en.locale, 'en');
  assert.ok(en.cases.length > 0);
  assert.equal(serializeRemedyForPrompt(en), '');
  assert.equal(buildRemedyCardModel(en), null);
});

test('결정론적이고 결과는 깊게 얼어 있다', () => {
  const input = { saju: saju({ day: '甲子' }, { daewoon: { pillar: '丁丑', startYear: 2022, endYear: 2031 } }), ziwei: ziwei({ 명궁: { maleficStars: ['경양'] } }), refYear: 2026 };
  const a = computeRemedyCases(input);
  assert.deepEqual(a, computeRemedyCases(input));
  assert.equal(serializeRemedyForPrompt(a), serializeRemedyForPrompt(computeRemedyCases(input)));
  for (const narrator of REMEDY_NARRATORS) assert.deepEqual(buildRemedyCardModel(a, { narrator }), buildRemedyCardModel(a, { narrator }));
  assert.ok(Object.isFrozen(a) && Object.isFrozen(a.cases) && Object.isFrozen(a.cases[0].evidence[0]) && Object.isFrozen(a.sources));
  const card = buildRemedyCardModel(a);
  assert.ok(Object.isFrozen(card) && Object.isFrozen(card.cards[0].methods[0]) && Object.isFrozen(card.cards[0].image));
  assert.throws(() => { 'use strict'; a.cases.push({}); });
});

test('프롬프트 블록: 머리말·줄·사용 규칙, 상한과 입력 상한 95% 를 지킨다', () => {
  const result = computeRemedyCases({ saju: saju({}, { core: { avoid: ['fire'] } }), refYear: 2026 });
  const block = serializeRemedyForPrompt(result);
  const lines = block.split('\n');
  assert.match(lines[0], /^\[액땜 방법 — 서버 계산/);
  assert.match(lines.at(-1), /^사용 규칙: /);
  assert.ok(lines.includes('- [2026년] 서운함이 쌓이기 쉬운 때: 2026 丙午 세운 · 년지 丑과 원진 → 방법: 먼저 안부 건네기, 말 한 박자 늦추기, 먼저 사과하기 / 풍속 소개: 동지 팥죽'), block);
  assert.ok(lines.some((line) => line.includes('자리 방향 바꾸기(북쪽), 색 하나 곁에 두기(검정이나 남색), 방향을 정한 나들이(북쪽)')), block);
  assert.ok(block.length <= 800);
  const one = serializeRemedyForPrompt(result, { maxCases: 1 });
  assert.equal(one.split('\n').length, 3);
  assert.ok(one.includes('버거운 오행이 드는 해'), '우선순위가 높은 기신 해가 먼저');
  const tight = serializeRemedyForPrompt(result, { maxChars: one.length });
  assert.equal(tight, one);
  assert.equal(serializeRemedyForPrompt(result, { maxChars: 50 }), '');
  assert.equal(serializeRemedyForPrompt(result, { inputCapChars: 1000, basePromptChars: 900 }), '');
  const capped = serializeRemedyForPrompt(result, { inputCapChars: 1000, basePromptChars: 950 - one.length });
  assert.equal(capped, one);
  assert.equal(serializeRemedyForPrompt(result, { inputCapChars: 100000, basePromptChars: 0 }), block);
});

test('카드 모델: 기본 3장 노출과 더 보기, 방법 2~3개 + 풍속 1개, 그림 파일이 있다', () => {
  const result = all({ saju: saju({ day: '甲子' }, { daewoon: { pillar: '丁丑', startYear: 2022, endYear: 2031 }, core: { avoid: ['fire'] } }), refYear: 2026 });
  const model = buildRemedyCardModel(result);
  assert.equal(model.narrator, 'yeoni');
  assert.equal(model.visible, DEFAULT_REMEDY_VISIBLE);
  assert.equal(model.more, model.cards.length - DEFAULT_REMEDY_VISIBLE);
  assert.equal(model.moreLabel, `+${model.more} 더 보기`);
  assert.equal(model.disclaimer, REMEDY_DISCLAIMER_KO.text);
  assert.equal(buildRemedyCardModel(result, { visible: 1 }).visible, 1);
  assert.equal(buildRemedyCardModel(result, { visible: 99 }).moreLabel, '');
  assert.equal(buildRemedyCardModel(result, { narrator: 'nobody' }).narrator, 'yeoni');
  for (const card of model.cards) {
    assert.ok(card.methods.length >= 2 && card.methods.length <= 3, card.caseId);
    assert.ok(card.methods.every((m) => m.kind !== 'custom' && m.text && m.title));
    assert.equal(card.custom.label, '전해 내려오는 풍속');
    assert.match(card.custom.id, /^custom-/);
    assert.equal(card.tone, CASE_META[card.caseId].tone);
  }
  assert.ok(buildRemedyCardModel(result, { tone: 'caution' }).cards.every((card) => card.tone === 'caution'));
  for (const narrator of REMEDY_NARRATORS) {
    for (const tone of ['explain', 'caution']) {
      const src = REMEDY_IMAGES[narrator][tone];
      assert.ok(existsSync(new URL(`../../public${src}`, import.meta.url)), `${narrator}/${tone}: public${src}`);
    }
  }
});

test('화자 대사: 무성은 합니다체 80자, 나머지는 60자·2문장이고 교정기를 그대로 통과한다', () => {
  const result = all({ saju: saju({ day: '甲子' }, { daewoon: { pillar: '丁丑', startYear: 2022, endYear: 2031 } }), ziwei: ziwei({ 명궁: { mainStars: [], maleficStars: ['경양'] }, 질액궁: { transformations: ['화기:태음'] } }), refYear: 2026 });
  for (const narrator of REMEDY_NARRATORS) {
    const model = buildRemedyCardModel(result, { narrator });
    assert.equal(model.cards.length, result.cases.length);
    for (const card of model.cards) {
      assert.ok(card.line, `${narrator} ${card.caseId}`);
      assert.equal(correctLine(card.line).text, card.line);
      const sentences = card.line.match(/[^.!?]+[.!?]+/g) || [];
      assert.ok(sentences.length >= 1 && sentences.length <= 2, card.line);
      if (narrator === 'musung') {
        assert.ok(card.line.length <= 80, card.line);
        assert.ok(sentences.every((s) => /니다\.$/.test(s.trim())), card.line);
      } else {
        assert.ok(card.line.length <= 60, card.line);
      }
    }
  }
});

// ── 골든 차트: 실제 엔진 결과로 입력 모양을 확인하고 분포를 잰다 ──
const GOLDEN = JSON.parse(readFileSync(new URL('../fixtures/saju/golden-charts.json', import.meta.url), 'utf8'));
const GOLDEN_YEARS = [2026, 2027, 2028];
const engineInput = (input) => ({ gender: input.gender, birthDate: input.date, birthTime: input.time || '', birthTimeUnknown: !input.time, calendarType: input.calendar, isLeapMonth: input.leapMonth });

test('골든 차트 × 2026~2028: 실제 엔진 결과를 읽고, 늘 켜지는 케이스도 끝내 안 켜지는 케이스도 없다', async (t) => {
  const counts = Object.fromEntries(GOLDEN_YEARS.map((year) => [year, Object.fromEntries(REMEDY_CASE_IDS.map((id) => [id, 0]))]));
  const skipped = [];
  const daewoonless = [];
  const measured = Object.fromEntries(GOLDEN_YEARS.map((year) => [year, 0]));
  const totals = [];
  for (const row of GOLDEN.cases) {
    const input = engineInput(row.input);
    for (const refYear of GOLDEN_YEARS) {
      let sajuResult;
      try {
        sajuResult = calculateLifeBookAiSaju(input, { year: refYear });
      } catch (error) {
        // 서머타임 경계 출생은 엔진이 AMBIGUOUS_BIRTH_TIME 을 던진다. 소비처도 이 오류를 잡아야 한다.
        assert.equal(error?.code, 'AMBIGUOUS_BIRTH_TIME', `${row.id}: ${error?.message}`);
        skipped.push(`${row.id}@${refYear}`);
        continue;
      }
      const chart = readSajuChart(sajuResult, refYear);
      assert.ok(chart, `${row.id}: 사주 결과를 읽지 못했다`);
      assert.ok(chart.natalCore?.yongsinMethods?.final, `${row.id}: natalCore`);
      // 첫 대운은 늦어도 10세 무렵에 시작하고 엔진은 대운을 유한 개만 낸다. 10세 이하(골든의 2024년생),
      // 아주 고령(1911년생), 시 모름(엔진이 majorLuck.available=false 로 대운을 내지 않는다)은 대운이 없을 수 있다.
      const age = refYear - Number(row.input.date.slice(0, 4));
      if (row.input.time && age >= 11 && age <= 80) assert.ok(chart.daewoon, `${row.id}@${refYear}: 대운을 읽지 못했다`);
      else if (!chart.daewoon) daewoonless.push(`${row.id}@${refYear}`);
      if (!row.input.time) assert.equal(chart.daewoon, null, `${row.id}: 시 모름인데 대운이 있다`);
      assert.equal(chart.timeUnknown, !row.input.time, row.id);
      const ziweiResult = await calculateZiweiAiChart(input, { year: refYear });
      const result = computeRemedyCases({ saju: sajuResult, ziwei: ziweiResult, refYear }, { limit: 99 });
      assert.equal(result.valid, true, row.id);
      assert.equal(result.sources.saju, true, row.id);
      assert.equal(result.sources.ziwei, row.input.time ? true : 'time-unknown', row.id);
      assert.ok(result.cases.length >= 1, `${row.id}@${refYear}`);
      if (!row.input.time) assert.ok(result.cases.every((c) => c.system === 'saju'), row.id);
      measured[refYear] += 1;
      totals.push(result.total);
      for (const c of result.cases) counts[refYear][c.caseId] += 1;
    }
  }
  assert.deepEqual(skipped, GOLDEN_YEARS.map((year) => `utc830-start-before@${year}`));
  for (const year of GOLDEN_YEARS) {
    assert.equal(measured[year], GOLDEN.cases.length - 1);
    const always = REMEDY_CASE_IDS.filter((id) => counts[year][id] === measured[year]);
    assert.deepEqual(always, [], `${year} 모든 차트에서 켜지는 케이스`);
  }
  const never = REMEDY_CASE_IDS.filter((id) => id !== 'everyday-balance' && GOLDEN_YEARS.every((year) => counts[year][id] === 0));
  assert.deepEqual(never, [], '2026~2028 골든 차트에서 한 번도 안 켜지는 케이스');
  t.diagnostic(`charts without daewoon (young, very old, time unknown):${daewoonless.join(', ') || 'none'}`);
  t.diagnostic(`measured ${GOLDEN_YEARS.map((y) => `${y}=${measured[y]}`).join(' ')}; cases/chart min ${Math.min(...totals)} avg ${(totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1)} max ${Math.max(...totals)}`);
  for (const id of REMEDY_CASE_IDS) t.diagnostic(`${id.padEnd(18)} ${GOLDEN_YEARS.map((y) => String(counts[y][id]).padStart(2)).join(' ')}`);
});
