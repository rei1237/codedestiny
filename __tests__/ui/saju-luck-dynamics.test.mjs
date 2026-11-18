import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { evaluateLuckDynamics, luckVerdictOf, LUCK_DYNAMICS_VERSION } from '../../lib/saju/luck-dynamics.mjs';

const P = (text) => {
  const a = text.replace(/\s/g, '').match(/../g) || [];
  return Object.fromEntries(['y', 'm', 'd', 'h'].map((k, i) => [k, a[i] ? { g: a[i][0], j: a[i][1] } : { g: '', j: '' }]));
};
const run = (chart, seun, extra = {}) => evaluateLuckDynamics({ natal: P(chart), seun, ...extra });
// 특정 작용을 뺐을 때의 판정. 그 작용이 판정을 실제로 바꿨는지 확인한다.
const without = (result, pick) => {
  const removed = result.modifiers.filter(pick);
  const rest = result.modifiers.filter((m) => !pick(m));
  return { removed, verdict: luckVerdictOf(result.score - removed.reduce((sum, m) => sum + m.delta, 0), rest) };
};

test('용신 해라도 원국 글자에 합거되면 좋은 해로 단정하지 않는다', () => {
  const r = run('壬辰 辛酉 丙申 癸未', '丙寅');
  assert.equal(r.yongsin.yongsin, 'fire');
  const hap = (m) => m.kind === 'hap' && m.delta < 0;
  const alt = without(r, hap);
  assert.ok(alt.removed.some((m) => /합거/.test(m.text)), JSON.stringify(r.modifiers));
  assert.equal(alt.verdict, 'good', '합거가 없으면 좋은 해');
  assert.ok(['mixed', 'caution'].includes(r.verdict));
  assert.match(r.headline, /묶여/);
});

test('기신 지지를 충으로 덜어 내면 판정이 좋아진다', () => {
  const r = run('庚午 甲午 丁卯 甲申', '丙子');
  assert.ok(r.yongsin.avoid.includes('fire'));
  const chung = (m) => m.kind === 'chung' && m.delta > 0;
  const alt = without(r, chung);
  assert.ok(alt.removed.some((m) => /부담이던 화 기운을 덜어/.test(m.text)));
  assert.equal(r.verdict, 'good');
  assert.equal(alt.verdict, 'mixed', '충이 없으면 섞인 흐름');
});

test('용신이 창고에 갇히는 입묘가 작용하면 판정이 내려간다', () => {
  const r = run('壬午 庚戌 己卯 丙戌', '壬辰');
  const tomb = (m) => m.kind === 'tomb' && m.delta < 0;
  const alt = without(r, tomb);
  assert.ok(alt.removed.length > 0);
  assert.equal(alt.verdict, 'good');
  assert.equal(r.verdict, 'mixed');
  // 명시 용신으로도 입묘 작용(辰戌충 + 실효 뿌리 없음)이 잡힌다.
  const explicit = run('辛亥 乙巳 壬辰 甲辰', '甲戌', { yongsin: { yongsin: 'metal', useful: ['metal', 'water'], avoid: ['fire', 'earth', 'wood'] } });
  const adverse = explicit.modifiers.filter(tomb);
  assert.ok(adverse.some((m) => /수 기운이 辰 창고/.test(m.text)), JSON.stringify(explicit.modifiers));
  assert.ok(adverse.reduce((sum, m) => sum + m.delta, 0) >= -2, '입묘 감점은 -2로 제한');
});

test('같은 금극목이라도 辛은 庚보다 甲 일간을 약하게 친다', () => {
  const chart = '庚申 甲申 甲寅 丙寅';
  const dayPair = (r) => r.modifiers.find((m) => m.kind === 'stem-pair' && m.text.startsWith('일간'));
  const geng = dayPair(run(chart, '庚戌')), sin = dayPair(run(chart, '辛亥'));
  assert.ok(geng.delta < 0, '庚劈甲: 기신 庚의 해악을 키운다');
  assert.ok(sin.delta > 0, '辛不能劈甲: 기신 辛의 해악을 줄인다');
});

test('대운이 바탕을 깔고, 대운만 주면 10년 단위로 말한다', () => {
  const chart = '壬子 壬子 乙丑 丙子';
  const warm = run(chart, '庚戌', { daeun: '丙午' }), cold = run(chart, '庚戌', { daeun: '壬子' });
  assert.ok(warm.score > cold.score);
  assert.ok(warm.modifiers.some((m) => m.kind === 'daeun' && m.delta > 0));
  const decade = evaluateLuckDynamics({ natal: P(chart), daeun: '丙午' });
  assert.equal(decade.scope, 'daeun');
  assert.match(decade.headline, /^이 대운 10년은 /);
});

test('출력 형태: 쉬운 한 문장 헤드라인, 괄호 풀이는 하나까지, legacyScore 는 그대로 넘긴다', () => {
  const a = run('甲寅 丁丑 戊辰 己未', '庚戌', { daeun: '戊寅', legacyScore: 62 });
  const b = run('甲寅 丁丑 戊辰 己未', '庚戌', { daeun: '戊寅', legacyScore: 62 });
  assert.deepEqual(a, b, '결정적');
  assert.equal(a.version, LUCK_DYNAMICS_VERSION);
  assert.equal(a.legacyScore, 62);
  assert.ok(['good', 'mixed', 'caution'].includes(a.verdict));
  assert.ok(a.reasons.length >= 1 && a.themes.every((t) => ['성향', '관계', '일', '재물'].includes(t)));
  const missing = evaluateLuckDynamics({ natal: P('甲子'), seun: '丙午' });
  assert.equal(missing.status, 'insufficient');
  assert.equal(missing.verdict, 'mixed');
});

// ── 대표 사주 스냅숏: 한습·조열·종격·통관·병약·균형 × 2026~2035 세운 ──
const REPRESENTATIVE = [
  ['한습', '壬子 壬子 乙丑 丙子', '癸丑'],
  ['조열', '丙午 甲午 庚戌 癸未', '乙未'],
  ['종격', '丙寅 甲午 壬午 丁未', '乙未'],
  ['통관', '庚申 甲申 甲寅 丙寅', '乙酉'],
  ['병약', '甲寅 丁丑 戊辰 己未', '戊寅'],
  ['균형', '庚寅 戊子 壬申 丙午', '己丑'],
];
const YEARS = ['丙午', '丁未', '戊申', '己酉', '庚戌', '辛亥', '壬子', '癸丑', '甲寅', '乙卯'];
const snapshotUrl = new URL('../fixtures/saju-luck-dynamics-snapshot.json', import.meta.url);

test('대표 사주의 해마다 판정·이유를 스냅숏으로 고정한다', () => {
  const rows = REPRESENTATIVE.map(([kind, chart, daeun]) => ({
    kind, chart, daeun,
    years: YEARS.map((seun) => {
      const r = run(chart, seun, { daeun });
      return { seun, verdict: r.verdict, score: r.score, headline: r.headline, reasons: r.reasons };
    }),
  }));
  for (const row of rows) for (const y of row.years) {
    assert.ok(/요\.$/.test(y.headline), y.headline);
    assert.ok((y.headline.match(/\(/g) || []).length <= 1, y.headline);
    assert.equal((y.headline.match(/\./g) || []).length, 1, `한 문장: ${y.headline}`);
    for (const text of [y.headline, ...y.reasons]) assert.ok(!/(wood|fire|earth|metal|water|undefined|NaN)/.test(text), text);
  }
  if (process.env.UPDATE_LUCK_DYNAMICS_SNAPSHOT) fs.writeFileSync(snapshotUrl, JSON.stringify(rows, null, 2) + '\n');
  assert.ok(fs.existsSync(snapshotUrl), 'snapshot missing: run with UPDATE_LUCK_DYNAMICS_SNAPSHOT=1');
  assert.deepEqual(rows, JSON.parse(fs.readFileSync(snapshotUrl, 'utf8')));
  const verdicts = new Set(rows.flatMap((row) => row.years.map((y) => y.verdict)));
  assert.deepEqual([...verdicts].sort(), ['caution', 'good', 'mixed'], '세 판정이 모두 나온다');
});

// 월운(S15-6): 신년운세 월별 신호가 같은 판정을 쓰도록 달 단위 진입점을 둔다. 올해(세운)가 바탕이다.
test('월운도 용신 달이 원국 글자에 합거되면 좋은 달로 단정하지 않는다', () => {
  const r = run('壬辰 辛酉 丙申 癸未', '戊戌', { wolun: '丙寅' });
  assert.equal(r.scope, 'wolun');
  assert.equal(r.target, '丙寅');
  assert.equal(r.seun, '戊戌');
  assert.match(r.headline, /^이 달은 /);
  assert.ok(r.modifiers.some((m) => m.kind === 'hap' && m.delta < 0 && /합거/.test(m.text)), JSON.stringify(r.modifiers));
  assert.notEqual(r.verdict, 'good');
  const backdrop = r.modifiers.find((m) => m.kind === 'daeun');
  if (backdrop) assert.match(backdrop.text, /^올해 흐름\(戊戌\)/);
});

test('월운 진입점이 생겨도 세운·대운 판정은 그대로다', () => {
  const chart = '壬辰 辛酉 丙申 癸未';
  const seun = run(chart, '丙寅', { daeun: '戊戌' });
  assert.equal(seun.scope, 'seun');
  assert.equal('seun' in seun, false);
  const month = run(chart, '丙寅', { daeun: '戊戌', wolun: '庚子' });
  assert.equal(month.scope, 'wolun');
  assert.equal(month.daeun, '戊戌');
  assert.equal(month.seun, '丙寅');
});
