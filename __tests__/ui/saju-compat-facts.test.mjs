import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCompatEngine, makePillarPairGenerator } from '../fixtures/saju-compat-engine-loader.mjs';

// analyzeCompat 가 화면 html 과 함께 내놓는 구조화 사실(facts)의 계약.
// LLM 서술의 근거가 되는 값이므로, 화면에 보이는 점수·이유와 한 줄도 어긋나면 안 된다.
const TYPES = ['love', 'business', 'friend'];
const ELEMENTS = ['wood', 'fire', 'earth', 'metal', 'water'];
const STEMS = [...'甲乙丙丁戊己庚辛壬癸'];
const BRANCHES = [...'子丑寅卯辰巳午未申酉戌亥'];

// 이유 코드 → 가감, 화면 이유 문구에서 반드시 보이는 고유 조각(코드와 문구가 서로 맞는지 대조).
const REASONS = {
  JOHU_COMPLEMENT: [4, '서로의 기온을 예쁘게 중화'],
  JOHU_BOTH_HOT: [-3, '불(火) 과열 궁합'],
  JOHU_BOTH_COLD: [-3, '온기를 채워주기엔 다소 부족'],
  JOHU_MILD: [1, '균형을 잡아주는 구조입니다'],
  MOIST_COMPLEMENT: [3, '습조(濕燥)가 서로를 채워주는'],
  MOIST_BOTH: [-2, '함께 늘어지거나 메말라'],
  MOIST_NEUTRAL: [0.5, '일상 컨디션도 비슷한 편'],
  ELEMENT_SAME: [1, '비슷한 코드와 리듬을 공유'],
  ELEMENT_SAME_EXCESS: [-2, '양보가 잘 안 되는 구조'],
  ELEMENT_SHENG_SELF_TO_PARTNER: [3, '을(를) 생해주는 구조라'],
  ELEMENT_SHENG_PARTNER_TO_SELF: [3, '을(를) 도와주는 구조라'],
  ELEMENT_KE: [-2, '기본적으로 상극 관계('],
  DAY_STEM_HE: [3, '일간 천간이 합(合)을 이루어'],
  DAY_BRANCH_HE: [2, '일지(배우자 자리)에서 육합'],
  DAY_STEM_CHONG: [-3, '일간이 충(沖)을 이루어'],
  DAY_BRANCH_CHONG: [-3, '일지가 충(沖)을 이루어'],
  YONGSHIN_COMMON: [4, '용신으로 삼아'],
  YONGSHIN_CLASH: [-4, '한쪽에게는 용신, 다른 한쪽에게는 기신'],
  KIJI_CONTROL_FORWARD: [5, '흉신 제어: 상대의 글자('],
  KIJI_CONTROL_REVERSE: [4, '역방향 흉신 제어'],
  HE_TRAP: [-4, '합의 함정'],
};
const ADJUSTMENTS = {
  TYPE_LOVE_DAY_BRANCH_HE: [1, 'type'],
  TYPE_LOVE_BOTH_HOT: [-1, 'type'],
  TYPE_BUSINESS_BOTH_STRONG: [1, 'type'],
  TYPE_BUSINESS_DAY_BRANCH_CHONG: [-1, 'type'],
  TYPE_FRIEND_ELEMENT_KE: [1, 'type'],
  SOK_JOHU_WARM_WARM: [2, 'sok'],
  SOK_JOHU_COLD_COLD: [1, 'sok'],
  SOK_JOHU_MIXED: [0, 'sok'],
  SOK_JOHU_NEUTRAL: [0.5, 'sok'],
  SOK_SEASON_COMPLEMENT: [2, 'sok'],
  SOK_SEASON_SAME: [0.5, 'sok'],
  SOK_SEASON_OTHER: [-0.5, 'sok'],
  SOK_STEM_SAME: [1, 'sok'],
  SOK_STEM_SAME_EXCESS: [-2, 'sok'],
  SOK_STEM_SHENG: [0.5, 'sok'],
  SOK_STEM_KE: [-1, 'sok'],
};

const engine = loadCompatEngine();
engine.api.setUser('테스트');
// vm 컨텍스트에서 만든 객체는 프로토타입이 달라 deepStrictEqual 이 실패한다. 서버가 JSON 으로 다룰 값이므로 왕복으로 정규화한다.
const plain = (value) => JSON.parse(JSON.stringify(value));

const gradeOfRaw = (raw) => (raw >= 13 ? 'S' : raw >= 8 ? 'A' : raw >= 3 ? 'B' : raw >= -2 ? 'C' : raw >= -6 ? 'D' : 'F');
const displayOfRaw = (raw) => Math.max(20, Math.min(96, Math.round(58 + raw * 2.8)));
const reasonTexts = (html) => [...html.matchAll(/<b class="compat-check-reason">([\s\S]*?)<\/b>/g)].map((m) => m[1].replace(/<[^>]*>/g, ''));
const reasonItemCount = (html) => (html.match(/<div class="compat-check-item"><span class="compat-check-icon">/g) || []).length;

function* corpus(seed, size) {
  const next = makePillarPairGenerator(seed);
  for (let i = 0; i < size; i += 1) {
    const [a, b] = next();
    for (const type of TYPES) {
      const c = engine.compat(a, b, type);
      yield { a, b, type, c: { ...c, facts: plain(c.facts) } };
    }
  }
}

const seenReason = new Set();
const seenAdjust = new Set();
const seenGrade = new Set();
const COVERAGE_SEED = 20261004;
const COVERAGE_SIZE = 1500;

function checkCorpus() {
  for (const { a, b, type, c } of corpus(COVERAGE_SEED, COVERAGE_SIZE)) {
  const f = c.facts;
  for (const r of f.reasons) seenReason.add(r.code);
  for (const x of f.adjustments) seenAdjust.add(x.code);
  seenGrade.add(f.grade.code);

  // 1) 화면에 보이는 이유와 1:1 — 개수·순서·문구 조각
  const texts = reasonTexts(c.html);
  assert.equal(f.reasons.length, reasonItemCount(c.html), `${type} ${a} | ${b}: facts.reasons 개수 ≠ 화면 이유 개수`);
  assert.equal(texts.length, f.reasons.length);
  f.reasons.forEach((r, i) => {
    const spec = REASONS[r.code];
    assert.ok(spec, `알 수 없는 이유 코드 ${r.code}`);
    assert.equal(r.delta, spec[0], `${r.code} 가감`);
    assert.equal(r.polarity, spec[0] > 0 ? '+' : '-', `${r.code} 극성`);
    assert.ok(texts[i].includes(spec[1]), `${type} ${a} | ${b}: ${r.code} 코드와 화면 문구가 어긋남 → ${texts[i]}`);
  });

  // 2) 원점수 = 이유 가감 + 유형 보정 + 숙요 가감 (이유 없이 점수만 바뀌는 항목도 빠짐없이)
  for (const x of f.adjustments) {
    const spec = ADJUSTMENTS[x.code];
    assert.ok(spec, `알 수 없는 보정 코드 ${x.code}`);
    assert.equal(x.delta, spec[0], `${x.code} 가감`);
    assert.equal(x.kind, spec[1], `${x.code} 종류`);
  }
  const sum = f.reasons.reduce((s, r) => s + r.delta, 0) + f.adjustments.reduce((s, x) => s + x.delta, 0);
  assert.equal(sum, c.score, `${type} ${a} | ${b}: 가감 합 ≠ 원점수`);

  // 3) 표시 점수·등급은 원점수에서 결정론으로 나온다
  assert.equal(f.score.raw, c.score);
  assert.equal(f.score.display, c.integratedScore);
  assert.equal(f.score.display, displayOfRaw(c.score));
  assert.equal(f.grade.code, gradeOfRaw(c.score));
  assert.equal(c.grade.charAt(0), f.grade.code);

  // 4) 닫힌 값
  assert.equal(f.type, type);
  for (const side of ['self', 'partner']) {
    assert.ok(['hot', 'warm', 'neutral', 'cool', 'cold'].includes(f.johu[side].type), 'johu.type');
    assert.ok(['wet', 'dry', 'balanced'].includes(f.johu[side].moist), 'johu.moist');
    assert.ok(ELEMENTS.includes(f.dominantElements[side].element), 'dominantElements');
    assert.ok(STEMS.includes(f.dayPillars[side].gan) && BRANCHES.includes(f.dayPillars[side].ji), 'dayPillars');
    assert.ok(['strong', 'weak'].includes(f.strength[side]), 'strength');
  }
  assert.deepEqual(f.dayPillars.self, { gan: a.split(' ')[2][0], ji: a.split(' ')[2][1] });
  assert.deepEqual(f.dayPillars.partner, { gan: b.split(' ')[2][0], ji: b.split(' ')[2][1] });
  assert.ok(['high', 'good', 'mid', 'low'].includes(f.longTermBand));
  assert.ok(['keep', 'grow', 'communicate', 'survive'].includes(f.prescriptionBand));
  assert.ok(['he_trap', 'yongshin_clash', 'calm'].includes(f.conflictBand));
  for (const key of ['self', 'partner', 'kijiSelf', 'kijiPartner', 'common', 'clash']) {
    assert.ok(Array.isArray(f.yongshin[key]) && f.yongshin[key].every((e) => ELEMENTS.includes(e)), `yongshin.${key}`);
  }

  // 5) 근거 값이 실제 입력과 맞는다
  for (const r of f.reasons) {
    const ev = r.evidence;
    if (r.code === 'DAY_STEM_HE' || r.code === 'DAY_STEM_CHONG') assert.deepEqual(ev, { self: f.dayPillars.self.gan, partner: f.dayPillars.partner.gan });
    if (r.code === 'DAY_BRANCH_HE' || r.code === 'DAY_BRANCH_CHONG') assert.deepEqual(ev, { self: f.dayPillars.self.ji, partner: f.dayPillars.partner.ji });
    if (r.code === 'ELEMENT_SAME' || r.code === 'ELEMENT_SAME_EXCESS') assert.equal(ev.element, f.dominantElements.self.element);
    if (r.code === 'YONGSHIN_COMMON') assert.deepEqual(ev.elements, f.yongshin.common);
    if (r.code === 'YONGSHIN_CLASH') assert.deepEqual(ev.elements, f.yongshin.clash);
    if (r.code === 'HE_TRAP') assert.ok((STEMS.includes(ev.self) || BRANCHES.includes(ev.self)) && (STEMS.includes(ev.partner) || BRANCHES.includes(ev.partner)) && ELEMENTS.includes(ev.resultElement));
    if (r.code === 'KIJI_CONTROL_FORWARD' || r.code === 'KIJI_CONTROL_REVERSE') assert.ok(ev.events.length > 0);
  }
  assert.equal(f.factFlags.includes('HE_TRAP'), f.reasons.some((r) => r.code === 'HE_TRAP'));
  assert.equal(f.factFlags.includes('KIJI_RELIEF'), f.reasons.some((r) => r.code === 'KIJI_CONTROL_FORWARD'));
  }
}

test('facts: 1500쌍 × 3유형이 이유·가감·점수·등급·닫힌 값 계약을 지킨다', () => {
  checkCorpus();
});

test('facts: 모든 이유 코드·보정 코드·등급이 코퍼스에서 실제로 나온다(검증이 빈 껍데기가 아님)', () => {
  assert.deepEqual([...seenReason].sort(), Object.keys(REASONS).sort());
  assert.deepEqual([...seenAdjust].sort(), Object.keys(ADJUSTMENTS).sort());
  assert.deepEqual([...seenGrade].sort(), ['A', 'B', 'C', 'D', 'F', 'S']);
});

test('facts: 이유 푸시 지점마다 사실 수집이 짝지어져 있다(새 푸시가 코드 없이 추가되면 실패)', () => {
  const body = engine.functionSource('analyzeCompat');
  const legacy = (body.match(/(?<![.\w])reasons\.push\(/g) || []).length;
  const facts = (body.match(/(?<![.\w])addReasonFact\(/g) || []).length - 1; // 선언 1건 제외
  assert.equal(legacy, 21);
  assert.equal(facts, legacy);
});

test('facts: 점수만 바꾸는 가감(score±=)마다 보정 수집이 있다', () => {
  const sok = engine.functionSource('analyzeSokCompat');
  const sokScoreEdits = (sok.match(/score[+-]=/g) || []).length;
  const sokAdjPush = (sok.match(/adj\.push\(/g) || []).length;
  assert.equal(sokScoreEdits, sokAdjPush);
  const compat = engine.functionSource('analyzeCompat');
  const typeEdits = (compat.match(/addTypeAdjustFact\(/g) || []).length - 1;
  assert.equal(typeEdits, 5);
});

test('facts: 같은 입력은 같은 facts, 입력 객체는 건드리지 않는다', () => {
  const [a, b] = ['庚寅 乙亥 壬申 壬戌', '甲戌 丁巳 乙卯 己酉'];
  const c1 = engine.compat(a, b, 'love');
  const c2 = engine.compat(a, b, 'love');
  assert.deepEqual(plain(c1.facts), plain(c2.facts));
});

test('facts: 숙요 사실이 가감과 맞는다', () => {
  for (const { c } of corpus(7, 120)) {
    const s = c.facts.sok;
    assert.ok(['warm_warm', 'cold_cold', 'mixed', 'neutral'].includes(s.johuPair));
    assert.ok(['complement', 'same', 'other'].includes(s.seasonPair));
    for (const side of ['self', 'partner']) {
      assert.ok(['spring', 'summer', 'autumn', 'winter'].includes(s.seasons[side]));
      assert.ok(s.tenGods[side] === null || ['bigeop', 'siksang', 'gwanseong', 'inseong', 'jaeseong'].includes(s.tenGods[side]));
    }
    assert.equal(s.adjustments.reduce((x, a) => x + a.delta, 0) + c.facts.reasons.reduce((x, r) => x + r.delta, 0) + c.facts.adjustments.filter((a) => a.kind === 'type').reduce((x, a) => x + a.delta, 0), c.score);
    assert.ok(s.stem.relation === null || ['same', 'sheng_self_to_partner', 'sheng_partner_to_self', 'ke_self_over_partner', 'ke_partner_over_self'].includes(s.stem.relation));
  }
});

test('전생 사실: 등급·교차 판정이 화면 html 과 같다', () => {
  const kindOfClass = { 'pc-he': 'he', 'pc-chong': 'chong', 'pc-same': 'same', 'pc-none': 'none' };
  const gradeSeen = new Set();
  const next = makePillarPairGenerator(99);
  for (let i = 0; i < 600; i += 1) {
    const [a, b] = next();
    const out = {};
    const html = engine.pastLife(a, b, '상대', out);
    assert.ok(out.facts, 'out.facts');
    const f = plain(out.facts);
    gradeSeen.add(f.grade.code);
    assert.ok(html.includes(`${f.grade.code}급 · `), `등급 배지 ${f.grade.code}`);
    const classes = [...html.matchAll(/pastlife-chip (pc-\w+)/g)].map((m) => kindOfClass[m[1]]);
    assert.deepEqual(classes, [f.cross[0].gan, f.cross[0].ji, f.cross[1].gan, f.cross[1].ji]);
    assert.equal(f.cross[0].dir, 'self_day_to_partner_year');
    assert.equal(f.cross[1].dir, 'partner_day_to_self_year');
    assert.deepEqual(f.cross[0].from, { gan: a.split(' ')[2][0], ji: a.split(' ')[2][1] });
    assert.deepEqual(f.cross[0].to, { gan: b.split(' ')[0][0], ji: b.split(' ')[0][1] });
    assert.deepEqual(f.cross[1].from, { gan: b.split(' ')[2][0], ji: b.split(' ')[2][1] });
    assert.deepEqual(f.cross[1].to, { gan: a.split(' ')[0][0], ji: a.split(' ')[0][1] });
  }
  assert.ok(gradeSeen.size >= 4, `전생 등급 분포 ${[...gradeSeen].join(',')}`);
});

test('전생 사실: out 을 주지 않아도(기존 호출) 반환 html 은 같고 예외도 없다', () => {
  const [a, b] = ['庚寅 乙亥 壬申 壬戌', '甲戌 丁巳 乙卯 己酉'];
  assert.equal(engine.pastLife(a, b), engine.pastLife(a, b, '상대', {}));
});
