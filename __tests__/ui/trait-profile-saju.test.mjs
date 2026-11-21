import '../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSajuTraitProfile as build, sajuTraitProfilePromptLines as lines, checkTraitFirstSection as check, traitSeedHash } from '../../worker/lib/trait-profile/saju.js';
import { DAY_MASTER_KB, FAMILY_KB } from '../../worker/lib/trait-profile/saju-kb.js';
import { buildSajuTemperamentProfile } from '../../worker/lib/saju-temperament.js';

const STEMS = '甲乙丙丁戊己庚辛壬癸';
const key = (p, k) => p.facts.find(f => f.key === k);
const keys = p => p.facts.map(f => f.key);

// 甲 일간 시나리오(지시서 5-4): 재다신약·식상 과다·관 부재·무재·인다·비겁 과다.
const SCENARIOS = {
  wealthWeak:{pillars:{year:'戊辰',month:'己丑',day:'甲戌',hour:'丙午'},power:{isStrong:false}},
  foodHeavy:{pillars:{year:'丙午',month:'丁巳',day:'甲午',hour:'丙寅'},power:{isStrong:true}},
  noOfficerNoResource:{pillars:{year:'丙午',month:'丁卯',day:'甲午',hour:'丙寅'}},
  resourceHeavyNoWealth:{pillars:{year:'壬子',month:'癸卯',day:'甲子',hour:'甲子'},power:{isStrong:true}},
  peerHeavy:{pillars:{year:'甲寅',month:'乙卯',day:'甲寅',hour:'乙亥'},power:{isStrong:true}},
  timeUnknown:{pillars:{year:'戊辰',month:'己丑',day:'甲戌'},timeUnknown:true},
};

test('every day master yields its own headline and a sorted, capped, deterministic fact list (10 stems x 6 bases)', () => {
  const bases = Object.values(SCENARIOS);
  let n = 0;
  for (const stem of STEMS) for (const base of bases) {
    const chart = {...base, pillars:{...base.pillars, day:stem + base.pillars.day[1]}};
    const a = build(chart, {seed:'u1|karma'}), b = build(structuredClone(chart), {seed:'u1|karma'});
    assert.deepEqual(a, b, 'same input must give the same profile');
    assert.equal(a.engine, 'saju');
    assert.equal(a.headline.key, `saju.dayMaster.${stem}`);
    assert.equal(a.headline.layer, 'core');
    assert.ok(a.facts.length <= 8 && a.facts.length >= 1);
    for (let i = 1; i < a.facts.length; i++) assert.ok(a.facts[i - 1].weight >= a.facts[i].weight);
    assert.ok(!JSON.stringify(a).includes('희신'), 'gate A: no 희신');
    n++;
  }
  assert.equal(n, 60);
});

test('wealth-heavy weak chart surfaces developed wealth with the existing 재다신약 candidate wording and 신약', () => {
  const p = build(SCENARIOS.wealthWeak);
  const wealth = key(p, 'saju.tenGodFamily.재성.developed');
  assert.ok(wealth, keys(p).join(','));
  assert.equal(wealth.layer, 'strong');
  assert.match(wealth.interpretation, /재다신약의 구조 후보/);
  assert.ok(key(p, 'saju.strength.weak'));
});

test('food-heavy chart surfaces developed 식상 and keeps 식신/상관 as sub keys', () => {
  const p = build(SCENARIOS.foodHeavy);
  const food = key(p, 'saju.tenGodFamily.식상.developed');
  assert.ok(food, keys(p).join(','));
  assert.ok(food.subKeys.includes('식신') && food.subKeys.includes('상관'));
});

test('absent and latent families are told apart (관 부재 / 지장간에만)', () => {
  const none = build(SCENARIOS.noOfficerNoResource);
  assert.equal(key(none, 'saju.tenGodFamily.관성.absent')?.layer, 'contrast', keys(none).join(','));
  assert.ok(key(none, 'saju.tenGodFamily.인성.absent'));
  const latent = build(SCENARIOS.foodHeavy);
  assert.ok(key(latent, 'saju.tenGodFamily.관성.latent'), keys(latent).join(','));
});

test('resource-heavy chart without wealth reports 인성 발달 and 재성 부재', () => {
  const p = build(SCENARIOS.resourceHeavyNoWealth);
  assert.ok(key(p, 'saju.tenGodFamily.인성.developed'), keys(p).join(','));
  assert.ok(key(p, 'saju.tenGodFamily.재성.absent'), keys(p).join(','));
});

test('peer-heavy chart reports 비겁 발달', () => {
  assert.ok(key(build(SCENARIOS.peerHeavy), 'saju.tenGodFamily.비겁.developed'));
});

test('unknown birth time is partial and the prompt says not to fill the gap', () => {
  const p = build(SCENARIOS.timeUnknown);
  assert.equal(p.dataQuality, 'partial');
  assert.ok(lines(p).some(l => l.includes('빈 자리를 추측해 채우지 않는다')));
  assert.equal(build(SCENARIOS.wealthWeak).dataQuality, 'full');
});

test('element facts appear only when engine ratios exist and follow the 29/16 thresholds', () => {
  const base = SCENARIOS.wealthWeak;
  assert.ok(!build(base).facts.some(f => f.key.startsWith('saju.element.')));
  const p = build(base, {fiveElements:{ratios:{wood:12.5,fire:12.5,earth:62.5,metal:0,water:12.5}, counts:{wood:1,fire:1,earth:5,metal:0,water:1}}});
  assert.ok(key(p, 'saju.element.earth.excess'), keys(p).join(','));
  assert.ok(key(p, 'saju.element.metal.none'));
  assert.ok(!key(p, 'saju.element.wood.none'), 'low ratio with count>0 is 부족, not a trait fact');
});

test('seed changes scene selection deterministically but never the facts or headline', () => {
  const a = build(SCENARIOS.foodHeavy, {seed:'u1|karma'}), b = build(SCENARIOS.foodHeavy, {seed:'u1|new-year'});
  assert.deepEqual(keys(a), keys(b));
  assert.equal(a.headline.key, b.headline.key);
  assert.equal(traitSeedHash('x'), traitSeedHash('x'));
  const scenes = new Set(STEMS.split('').map((_, i) => build(SCENARIOS.foodHeavy, {seed:`u${i}`}).headline.scenes.join('/')));
  assert.ok(scenes.size > 1, 'different seeds should rotate scene material');
});

test('profile accepts a precomputed temperament profile and returns null without facts', () => {
  const t = buildSajuTemperamentProfile(SCENARIOS.wealthWeak);
  assert.deepEqual(build(t), build(SCENARIOS.wealthWeak));
  assert.equal(build({}), null);
  assert.deepEqual(lines(null), []);
});

test('prompt block is Korean-labelled facts only, with no internal keys or format directives', () => {
  const out = lines(build(SCENARIOS.wealthWeak)).join('\n');
  assert.match(out, /^\[타고난 성향 핵심 근거\]/);
  assert.match(out, /가장 먼저 짚을 성향: 갑목 일간/);
  assert.ok(!/saju\.|weight|layer|headline/.test(out), out);
  assert.ok(!/\d+\s*자|분량|문단/.test(out), 'no length or format directive (gate B constraint 3)');
  assert.match(out, /건강·질병·사고·이혼을 확정하지 않는다/);
});

test('shadow validator only reports; it flags missing headline, hedges and label leaks', () => {
  const p = build(SCENARIOS.wealthWeak);
  assert.deepEqual(check('갑목다운 곧음이 먼저 보이는 사람이에요.', p), {ok:true, issues:[]});
  assert.deepEqual(check('', p).issues, ['empty_section']);
  assert.ok(check('그냥 좋은 사람이에요.', p).issues.includes('headline_missing'));
  assert.ok(check('갑목이라 곧은 편일 수도 있어요.', p).issues.some(i => i.startsWith('hedge:')));
  assert.ok(check('[타고난 성향 핵심 근거] 갑목', p).issues.includes('label_leak'));
  assert.deepEqual(check('anything', null), {ok:true, issues:[]});
});

test('KB covers all 10 stems and every family state with non-empty material and no health claims', () => {
  assert.deepEqual(Object.keys(DAY_MASTER_KB).join(''), STEMS);
  const text = JSON.stringify([DAY_MASTER_KB, FAMILY_KB]);
  for (const banned of ['우울', '질병', '병에', '진단', '사망', '이혼']) assert.ok(!text.includes(banned), banned);
  for (const [family, states] of Object.entries(FAMILY_KB)) for (const state of ['developed', 'absent', 'latent']) {
    assert.ok(states[state]?.keywords?.length, `${family}.${state}`);
  }
});
