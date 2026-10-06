import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { calcPower } from '../../worker/yeongnyangi/fortune/saju-runtime.mjs';
import { SIGNS, SIGNS_KO, SIGN_LORDS, NAKSHATRAS } from '../../worker/lib/vedic-derived-calculations.js';

// 운명 구조도 엔진은 셸 정본 테이블(GAN·JI·CD_JANGGAN·getTenGod)을 읽기만 한다 — 같은 조각을 vm 에 올려 실행한다.
const engineSrc = readFileSync('js/saju-engine.js', 'utf8');
const tables = engineSrc.slice(engineSrc.indexOf('var GAN={'), engineSrc.indexOf('/* ─── 십성 DB ─── */'));
const tenGod = engineSrc.slice(engineSrc.indexOf('function getTenGod(dayGan,target){'), engineSrc.indexOf('function parseTimeZoneOffsetName'));
const ctx = vm.createContext({});
vm.runInContext(tables + tenGod + readFileSync('js/core/saju/destiny-anatomy/engine.js', 'utf8'), ctx);
const E = ctx.DestinyAnatomyEngine;
const T = E.tablesFrom(ctx);
const plain = (x) => JSON.parse(JSON.stringify(x));

const P = (y, m, d, h) => ({y: {g: y[0], j: y[1]}, m: {g: m[0], j: m[1]}, d: {g: d[0], j: d[1]}, h: h ? {g: h[0], j: h[1]} : null});
const snapOf = (p, extra = {}) => {
  const pw = calcPower({...p, h: p.h || {g: '', j: ''}});
  return {pillars: p, timeUnknown: false, power: {isStrong: pw.isStrong, score: pw.score, yongshin: pw.yongshin, kijishin: pw.kijishin}, jong: {isJong: false}, natalRatios: null, ...extra};
};
const build = (p, extra = {}, opts = {}) => plain(E.buildDestinyAnatomy({tables: T, snapshot: snapOf(p, extra), ...opts}));

// §45 고정 픽스처 — 무작위 20만 원국 탐색에서 고른 실제 기둥.
const STRONG = {
  selfDrive: P('甲子', '乙巳', '甲亥', '丁丑'),
  expression: P('丁丑', '庚子', '己午', '戊酉'),
  reality: P('乙未', '己卯', '庚丑', '壬丑'),
  structure: P('戊子', '辛寅', '乙戌', '庚未'),
  reflection: P('己卯', '己亥', '庚午', '壬戌'),
};
const PAIRS = {
  'selfDrive+expression': P('甲子', '乙巳', '甲亥', '丁丑'),
  'selfDrive+reality': P('己寅', '丙亥', '壬戌', '壬戌'),
  'expression+reality': P('丁丑', '庚子', '己午', '戊酉'),
  'reality+reflection': P('乙未', '己卯', '庚丑', '壬丑'),
  'structure+reflection': P('庚酉', '己子', '壬巳', '戊酉'),
};
const HD = {type: 'TYPE_GENERATOR', strategy: 'STRATEGY_RESPOND', authority: 'AUTHORITY_EMOTIONAL', profile: '2/4', definition: 'DEFINITION_SINGLE',
  definedCenters: ['SACRAL', 'SOLAR_PLEXUS', 'ROOT'], undefinedCenters: [], channels: [{channelId: '59-6'}], activeGates: [59, 6, 70]};
const basis = (lagna, moon, nak) => ({ok: true, groups: [{key: 'core', title: '차트의 기준점', items: [
  {label: '라그나', value: lagna}, moon && {label: '달의 라시', value: moon}, nak && {label: '나크샤트라', value: nak},
].filter(Boolean)}]});

test('베다 역매핑 표와 지장간 가중은 워커·셸 정본과 같다', () => {
  assert.deepEqual(plain(E._canon.SIGNS), SIGNS);
  assert.deepEqual(plain(E._canon.SIGNS_KO), SIGNS_KO);
  assert.deepEqual(plain(E._canon.SIGN_LORDS), SIGN_LORDS);
  assert.deepEqual(plain(E._canon.NAKSHATRA_LORD), Object.fromEntries(NAKSHATRAS));
  assert.deepEqual(plain(T.LAYER_WEIGHT), {여기: 0.35, 중기: 0.65, 정기: 1.2});
  // basis 표시 문자열의 라벨·형식이 바뀌면 역매핑이 조용히 비므로 계약을 고정한다.
  const vedic = readFileSync('worker/routes/vedic-ai.js', 'utf8');
  for (const s of ['basisItem("라그나"', 'basisItem("달의 라시"', 'basisItem("나크샤트라"', '파다', 'basisGroup("core"']) assert.ok(vedic.includes(s), s);
});

test('5대 엔진 각각이 강한 원국에서 그 엔진이 1위다', () => {
  for (const [axis, p] of Object.entries(STRONG)) {
    const m = build(p);
    assert.equal(m.saju.ranked[0], axis, axis);
    assert.equal(m.saju.brain[axis], 100, axis);
    assert.equal(m.saju.dominantEngines[0], axis);
  }
});

test('상위 두 엔진 조합 키는 축 순서로 정렬된다(요청서 5쌍)', () => {
  for (const [key, p] of Object.entries(PAIRS)) assert.equal(build(p).saju.combo.key, key, key);
});

test('균형형은 최대 비중이 26% 미만이고 조합·주 엔진을 단정하지 않는다', () => {
  const m = build(P('庚申', '甲辰', '己子', '丁戌'));
  assert.equal(m.saju.balanced, true);
  assert.deepEqual(m.saju.dominantEngines, []);
  assert.equal(m.saju.combo.key, 'balanced');
  assert.ok(Math.max(...Object.values(m.saju.engines).map((e) => e.share)) < 0.26);
  assert.ok(m.saju.topThoughts.length >= 2 && m.saju.topThoughts.length <= 3);
});

test('신약 원국에서 재성이 1위면 strained 톤, 신강 비겁 과다는 surplus 톤과 과부하 패턴', () => {
  const weak = snapOf(P('甲亥', '丙寅', '癸子', '丁子'));
  assert.equal(weak.power.isStrong, false);
  const w = plain(E.buildDestinyAnatomy({tables: T, snapshot: weak}));
  assert.equal(w.saju.ranked[0], 'reality');
  assert.equal(w.saju.combo.tone, 'strained');
  assert.ok(w.saju.overloadPatterns.includes('reality'));

  const strong = snapOf(P('戊申', '甲辰', '戊子', '戊子'));
  assert.equal(strong.power.isStrong, true);
  const s = plain(E.buildDestinyAnatomy({tables: T, snapshot: strong}));
  assert.equal(s.saju.combo.tone, 'surplus');
  assert.equal(s.saju.overloadPatterns[0], 'selfDrive');
  assert.equal(s.strength, 'strong');
});

test('개수가 같아도 월령 인성이 다른 자리 인성보다 무겁다(단순 개수 금지)', () => {
  // 甲 일간: 子(癸=정인) 한 글자를 월지에 두느냐 연지에 두느냐만 바꾼다.
  const inMonth = build(P('丙午', '丙子', '甲戌', '丙寅'));
  const inYear = build(P('丙子', '丙午', '甲戌', '丙寅'));
  assert.ok(inMonth.saju.engines.reflection.raw > inYear.saju.engines.reflection.raw * 2,
    `${inMonth.saju.engines.reflection.raw} vs ${inYear.saju.engines.reflection.raw}`);
  assert.equal(E.computeSajuBrain(snapOf(P('丙午', '丙子', '甲戌', '丙寅')), T).seasonAxis, 'reflection');
});

test('출생시간 미상: 시주를 쓰지 않고 HD 를 만들지 않는다', () => {
  const p = P('甲子', '乙巳', '甲亥', null);
  const m = build(p, {timeUnknown: true}, {hdChart: HD});
  assert.equal(m.timeUnknown, true);
  assert.equal(m.humanDesign.available, false);
  assert.equal(m.humanDesign.type, undefined);
  const brain = E.computeSajuBrain(snapOf(p, {timeUnknown: true}), T);
  assert.ok(brain.contributions.every((c) => !c.where.startsWith('h')));
  // 정오 가정 시주가 들어간 셸 비율이 와도 시간 미상이면 다시 센다.
  const el = E.computeElementLayer({...snapOf(p, {timeUnknown: true}), natalRatios: {wood: 100, fire: 0, earth: 0, metal: 0, water: 0}}, T);
  assert.notEqual(el.ratios.wood, 100);
  assert.ok(Math.abs(Object.values(plain(el.ratios)).reduce((a, b) => a + b, 0) - 100) <= 2);
});

test('HD 있음: 결정·사람 인사이트가 융합 배지와 긴장 관계를 갖는다 / 없음: 사주 배지만', () => {
  const p = STRONG.reality;
  const withHd = build(p, {}, {hdChart: HD});
  assert.equal(withHd.humanDesign.available, true);
  assert.deepEqual(withHd.humanDesign.undefinedCenters, ['HEAD', 'AJNA', 'THROAT', 'G', 'HEART', 'SPLEEN']);
  assert.deepEqual(withHd.fusion.insights.map((i) => i.badge), ['saju', 'fusion', 'fusion']);
  assert.equal(withHd.fusion.insights[1].relation, 'tension'); // 재성 강 × 감정 권위(요청서 §16 예시)
  assert.ok(withHd.fusion.tensions.includes('AUTHORITY_EMOTIONAL|reality'));

  const noHd = build(p);
  assert.equal(noHd.humanDesign.available, false);
  assert.deepEqual(noHd.fusion.insights.map((i) => i.badge), ['saju', 'saju', 'saju']);
  assert.deepEqual(noHd.fusion.tensions, []);

  const projector = build(STRONG.selfDrive, {}, {hdChart: {...HD, type: 'TYPE_PROJECTOR', authority: 'AUTHORITY_SPLENIC'}});
  assert.equal(projector.fusion.insights[2].relation, 'tension'); // 비겁 강 × 프로젝터(§16 예시)
});

test('placeholder 금지: 알 수 없는 HD 타입·권위나 빈 베다는 available:false 로만 온다', () => {
  assert.deepEqual(plain(E.adaptHumanDesign({...HD, type: 'Generator'})), {available: false});
  assert.deepEqual(plain(E.adaptHumanDesign(null)), {available: false});
  assert.deepEqual(plain(E.adaptVedicBasis(null)), {available: false});
  assert.deepEqual(plain(E.adaptVedicBasis({groups: [{key: 'core', items: [{label: '라그나', value: '출생시간 미상으로 확정하지 않음'}]}]})), {available: false});
  const m = build(STRONG.structure);
  assert.equal(m.vedic.available, false);
  assert.equal(m.vedic.lagna, undefined);
});

test('베다 있음: 라그나·달·나크샤트라를 정본 이름으로 읽고 성향 키를 만든다', () => {
  const v = plain(E.adaptVedicBasis(basis('사자자리 (Leo)', '게자리', 'Pushya · 2파다')));
  assert.deepEqual(v, {available: true, lagna: 'Leo', moonSign: 'Cancer', sixthSign: 'Capricorn', sixthLord: 'Saturn', nakshatra: 'Pushya',
    traits: [{kind: 'emotion', key: 'water'}, {kind: 'instinct', key: 'Saturn'}, {kind: 'frame', key: 'fire'}]});
  const noLagna = plain(E.adaptVedicBasis(basis('출생시간 미상으로 확정하지 않음', '양자리', 'Ashwini')));
  assert.equal(noLagna.lagna, '');
  assert.equal(noLagna.sixthLord, '');
  assert.equal(noLagna.traits.some((t) => t.kind === 'frame'), false);
  const m = build(STRONG.reflection, {}, {vedicBasis: basis('사자자리 (Leo)', '게자리', 'Pushya · 2파다')});
  assert.equal(m.fusion.mindPattern.emotion, 'water');
});

test('차크라는 상징 매핑 7개이고 HD 센터와 별개다', () => {
  const m = build(STRONG.reality, {}, {hdChart: HD});
  assert.equal(m.chakra.symbolic, true);
  assert.deepEqual(m.chakra.items.map((c) => c.id), ['crown', 'thirdEye', 'throat', 'heart', 'solarPlexus', 'sacral', 'root']);
  for (const c of m.chakra.items) assert.ok(c.emphasis >= 0 && c.emphasis <= 100);
  assert.equal(m.chakra.items.find((c) => c.id === 'root').level, 'bright'); // 재성 강 → 뿌리(현실) 상징
});

test('지문은 결정론이고 기둥·HD 에 따라 바뀌며 개인정보를 담지 않는다', () => {
  const a = build(STRONG.reality), b = build(STRONG.reality), c = build(STRONG.reflection), d = build(STRONG.reality, {}, {hdChart: HD});
  assert.equal(a.fingerprint, b.fingerprint);
  assert.notEqual(a.fingerprint, c.fingerprint);
  assert.notEqual(a.fingerprint, d.fingerprint);
  assert.match(a.fingerprint, /^da1-[0-9a-f]{16}$/);
});

test('셸 전역 어댑터는 시간 미상이면 시주를 버리고, 전역이 없으면 null', () => {
  const scope = {G_PILLARS: {y: {g: '甲', j: '子'}, m: {g: '乙', j: '巳'}, d: {g: '甲', j: '亥'}, h: {g: '庚', j: '午'}},
    G_POWER: {isStrong: true, score: 40, yongshin: ['fire'], kijishin: ['water']}, G_JONG: {isJong: false}, G_JOHU: {type: 'hot'},
    G_NATAL: {ratios: {wood: 40, fire: 20, earth: 10, metal: 10, water: 20}}, __cdSajuTimeUnknown: true};
  const s = plain(E.adaptShellSnapshot(scope));
  assert.equal(s.pillars.h, null);
  assert.equal(s.timeUnknown, true);
  assert.equal(E.adaptShellSnapshot({}), null);
  assert.equal(E.buildDestinyAnatomy({scope: {}}), null);
});

test('§28 스키마 키를 모두 갖는다', () => {
  const m = build(STRONG.reality, {}, {hdChart: HD, vedicBasis: basis('사자자리 (Leo)', '게자리', 'Pushya · 2파다')});
  assert.equal(m.version, '1');
  assert.deepEqual(Object.keys(m.saju.brain), ['selfDrive', 'expression', 'reality', 'structure', 'reflection']);
  for (const k of ['dominantEngines', 'secondaryEngines', 'brainHeadline', 'brainDescription', 'strengths', 'overloadPatterns']) assert.ok(k in m.saju, k);
  assert.deepEqual(Object.keys(m.fiveElements), ['wood', 'fire', 'earth', 'metal', 'water']);
  for (const k of ['available', 'type', 'strategy', 'authority', 'profile', 'definition', 'definedCenters', 'undefinedCenters', 'channels', 'gates']) assert.ok(k in m.humanDesign, k);
  for (const k of ['available', 'lagna', 'moonSign', 'nakshatra', 'traits']) assert.ok(k in m.vedic, k);
  for (const k of ['headline', 'summary', 'strengths', 'tensions', 'insights', 'decisionPattern', 'workPattern', 'moneyPattern', 'relationshipPattern']) assert.ok(k in m.fusion, k);
  assert.deepEqual(m.share, {headline: '', keywords: [], imageUrl: null});
  assert.ok(m.fusion.insights.length <= 3);
});

const LUCK = (g, j, score) => ({luck: {g, j, startYear: 2020, endYear: 2029, score, chungPenalty: false}});

test('대운 오버레이: 천간·지지 정기 십성으로 회로를 고르고, 점수 60/40 경계로 흐름을 정한다', () => {
  assert.deepEqual(build(STRONG.reality).luck, {available: false});
  // 庚 일간: 甲=편재, 寅 정기 甲=편재 → 현실 회로 하나(겹침)
  const a = build(STRONG.reality, LUCK('甲', '寅', 60)).luck;
  assert.deepEqual([a.available, a.tone, a.axes, a.doubled], [true, 'tailwind', ['reality'], true]);
  // 丙=편관(구조), 子 정기 癸=상관(표현)
  const b = build(STRONG.reality, LUCK('丙', '子', 59)).luck;
  assert.deepEqual([b.tone, b.stemAxis, b.branchAxis, b.axes], ['steady', 'structure', 'expression', ['structure', 'expression']]);
  assert.equal(build(STRONG.reality, LUCK('丙', '子', 40)).luck.tone, 'steady');
  assert.equal(build(STRONG.reality, LUCK('丙', '子', 39)).luck.tone, 'headwind');
  // 과열은 원래 과한 회로와 대운 회로의 교집합이고, 타고난 엔진 점수는 바꾸지 않는다.
  const m = build(STRONG.reality, LUCK('甲', '寅', 72));
  assert.deepEqual(m.luck.overheat, m.luck.axes.filter((x) => m.saju.overloadPatterns.includes(x)));
  assert.deepEqual(m.saju.brain, build(STRONG.reality).saju.brain);
  assert.notEqual(m.fingerprint, build(STRONG.reality).fingerprint);
  assert.notEqual(m.fingerprint, build(STRONG.reality, LUCK('甲', '寅', 30)).fingerprint);
});

test('대운 어댑터: 현재 나이까지 시작한 마지막 대운을 셸 evalDaewun 점수로 읽고, 시간 미상·전역 없음이면 비운다', () => {
  const rows = [{age: 3, g: '戊', j: '寅', startYear: 1993, endYear: 2002}, {age: 33, g: '甲', j: '午', startYear: 2023, endYear: 2032}, {age: 43, g: '乙', j: '未', startYear: 2033, endYear: 2042}];
  const seen = [];
  const scope = {G_PILLARS: {y: {g: '甲', j: '子'}, m: {g: '乙', j: '巳'}, d: {g: '甲', j: '亥'}, h: {g: '庚', j: '午'}},
    G_POWER: {isStrong: true, score: 40, yongshin: ['fire'], kijishin: ['water']}, G_JONG: {isJong: false},
    G_DAEWUN: rows, CURRENT_AGE: 37, evalDaewun: (g, j) => { seen.push(g + j); return {score: 72, hasChungPenalty: true}; }};
  assert.deepEqual(plain(E.adaptShellSnapshot(scope).luck), {g: '甲', j: '午', startYear: 2023, endYear: 2032, score: 72, chungPenalty: true});
  assert.deepEqual(seen, ['甲午']);
  assert.equal(E.adaptShellSnapshot({...scope, __cdSajuTimeUnknown: true}).luck, null);
  assert.equal(E.adaptShellSnapshot({...scope, G_DAEWUN: []}).luck, null);
  assert.equal(E.adaptShellSnapshot({...scope, evalDaewun: undefined}).luck, null);
  assert.equal(E.adaptShellSnapshot({...scope, CURRENT_AGE: 1}).luck, null);
});

test('밈 뇌구조: 칸은 안쪽 상자를 겹침 없이 채우고 넓이 = share, 퍼센트 합 100, 비율 0 엔진은 칸이 없다', () => {
  for (const p of Object.values(STRONG)) {
    const meme = build(p).saju.meme;
    const n = meme.inner, area = n.w * n.h;
    assert.equal(meme.cells.reduce((a, c) => a + c.pct, 0), 100);
    for (const c of meme.cells) {
      assert.ok(c.share > 0);
      assert.ok(Math.abs(c.w * c.h / area - c.share) < 0.01, `${c.axis} 넓이 ${c.w * c.h / area} ≠ ${c.share}`);
      assert.ok(c.x >= n.x - 0.01 && c.y >= n.y - 0.01 && c.x + c.w <= n.x + n.w + 0.01 && c.y + c.h <= n.y + n.h + 0.01, `${c.axis} 상자 밖`);
    }
  }
  const meme = E.memeBrain({ranked: ['reality', 'structure', 'selfDrive'], engines: {reality: {share: 0.7}, structure: {share: 0.3}, selfDrive: {share: 0}}});
  assert.deepEqual(meme.cells.map((c) => c.axis), ['reality', 'structure']);
});
