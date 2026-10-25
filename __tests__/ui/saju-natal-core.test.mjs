import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeNatalCore, analyzeClimate, legacyJongShape, natalAnalysisId } from '../../lib/saju/natal-core/index.mjs';
import { ROK, YANGIN } from '../../lib/saju/natal-core/tables.mjs';
import { calcPower } from '../../lib/saju/natal-power.js';

// 기대값은 docs/design/saju-natal-core-rule-profile.md 규칙에서 손으로 도출했다. 기존 엔진 출력의 복사본이 아니다.
const P = (text) => {
  const a = text.replace(/\s/g, '').match(/../g) || [];
  return Object.fromEntries(['y', 'm', 'd', 'h'].map((k, i) => [k, a[i] ? { g: a[i][0], j: a[i][1] } : { g: '', j: '' }]));
};
const core = (text) => analyzeNatalCore(P(text));
const cand = (c, id) => c.special.candidates.find((x) => x.id === id);
const check = (c, id, checkId) => cand(c, id).checks.find((x) => x.id === checkId);

test('1. 원국 결과는 입력 외 정보로 바뀌지 않고 동결된다', () => {
  const a = core('甲寅丁丑戊辰己未');
  const b = analyzeNatalCore(P('甲寅丁丑戊辰己未'), { experience: [{ year: 2020, outcome: 'bad' }], jongAnswer: 'yes' });
  assert.deepEqual(a, b);
  assert.equal(a.analysisId, natalAnalysisId({ pillars: P('甲寅丁丑戊辰己未') }));
  assert.ok(Object.isFrozen(a) && Object.isFrozen(a.gyeokguk) && Object.isFrozen(a.special.candidates[0].checks));
  assert.notEqual(a.analysisId, core('甲寅丁丑戊辰').analysisId);
});

test('2. 녹표 10종: 戊巳·己午 포함', () => {
  assert.deepEqual(ROK, { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' });
  for (const [stem, branch] of Object.entries(ROK)) {
    const c = analyzeNatalCore({ y: { g: '', j: '' }, m: { g: '甲', j: branch }, d: { g: stem, j: '子' }, h: { g: '', j: '' } });
    assert.equal(c.monthStructure.name, '건록격', stem + branch);
    assert.equal(c.monthStructure.ruleId, 'GK-ROK');
  }
});

test('3. 양인 5종은 양간만, 음간은 월겁 계열', () => {
  assert.deepEqual(YANGIN, { 甲: '卯', 丙: '午', 戊: '午', 庚: '酉', 壬: '子' });
  for (const [stem, branch] of Object.entries(YANGIN)) {
    const c = analyzeNatalCore({ y: { g: '', j: '' }, m: { g: '甲', j: branch }, d: { g: stem, j: '子' }, h: { g: '', j: '' } });
    assert.equal(c.monthStructure.name, '양인격', stem + branch);
  }
  // 乙 일간 寅월: 寅 정기 甲 = 겁재 → 월겁격(양인 아님)
  assert.equal(core('壬子壬寅乙丑').monthStructure.name, '월겁격');
});

test('4. 건록 + 살아 있는 재관 → 일반격, 하위 용법 기록, 재관을 기신으로 두지 않음', () => {
  const c = core('辛酉庚寅甲辰己巳');
  assert.equal(c.gyeokguk.name, '건록격');
  assert.equal(c.gyeokguk.type, '일반격');
  assert.equal(c.gyeokguk.family, 'general');
  const uses = c.monthStructure.subUses.map((u) => u.use + u.char);
  for (const u of ['用官辛', '用煞庚', '用財己', '用官酉', '用財辰', '用食傷巳']) assert.ok(uses.includes(u), u);
  assert.equal(c.yongshin.gyeokguk.wealthOfficerRole, 'not-kishin-by-rok');
  assert.equal(legacyJongShape(c).isJong, false);
});

test('5. 종재 반례: 寅 정기 뿌리가 살아 있으면 진종·가종 모두 fail', () => {
  const c = core('戊辰己未甲寅戊辰');
  assert.equal(check(c, 'JONG-TRUE-wealth', 'J3-NO-DAY-ROOT').ok, false);
  assert.equal(check(c, 'JONG-FALSE-wealth', 'F3-NO-EFFECTIVE-DAY-ROOT').ok, false);
  assert.equal(c.special.decision, 'general');
  assert.equal(c.gyeokguk.name, '정재격');
});

test('6~7. 종살 반례이자 약하지만 종이 아님: 未 중기 乙이 실효 뿌리', () => {
  const c = core('戊申辛酉乙未庚辰');
  assert.equal(c.strength.isStrong, false);
  assert.equal(cand(c, 'JONG-TRUE-officer').status, 'fail');
  assert.equal(check(c, 'JONG-FALSE-officer', 'F3-NO-EFFECTIVE-DAY-ROOT').ok, false);
  assert.equal(c.gyeokguk.name, '편관격');
  assert.equal(c.gyeokguk.type, '일반격');
});

test('8. 시주 미상으로 뿌리 여부를 모르면 unknown, 가종으로 떨어지지 않음', () => {
  const c = core('戊戌辛酉乙酉');
  assert.equal(cand(c, 'JONG-TRUE-officer').status, 'unknown');
  assert.equal(cand(c, 'JONG-FALSE-officer').status, 'unknown');
  assert.equal(c.special.decision, 'pending');
  assert.equal(c.gyeokguk.family, 'general');
  assert.equal(c.gyeokguk.name, '편관격');
  assert.equal(legacyJongShape(c).isJong, false);
});

test('9. 가종 조건 충족: 丑 여기 癸만 남음', () => {
  const c = core('戊戌辛酉乙酉丁丑');
  assert.equal(check(c, 'JONG-TRUE-officer', 'J5-NO-PARENT-ROOT').ok, false);
  assert.equal(cand(c, 'JONG-FALSE-officer').status, 'pass');
  assert.equal(c.gyeokguk.name, '가종살격(假從殺格)');
  const legacy = legacyJongShape(c);
  assert.deepEqual({ ...legacy }, { ...legacy, isJong: true, isGaJong: true, dominant: 'metal', parEl: 'earth' });
  assert.equal(legacy.natalCore, c);
  assert.ok(!Object.keys(legacy).includes('natalCore'));
});

test('10. 토가 아닌 일간은 토가 많아도 가색이 아님', () => {
  const c = core('戊辰己未辛丑戊戌');
  assert.ok(!c.special.candidates.some((x) => x.ruleId === 'ZW-JIASE'));
  assert.notEqual(c.gyeokguk.name, '가색격(稼穡格)');
  assert.equal(c.gyeokguk.name, '종강격(從强格)');
});

test('11. 戊己 일간이라도 목이 2위 이상이면 가색 fail', () => {
  for (const text of ['甲寅丁丑戊辰己未', '甲寅辛未戊辰戊午']) {
    const c = core(text);
    assert.equal(check(c, 'ZW-JIASE', 'ZW-JIASE-WOOD').ok, false, text);
    assert.equal(cand(c, 'ZW-JIASE').status, 'fail', text);
  }
  const ref = core('甲寅丁丑戊辰己未');
  assert.equal(ref.gyeokguk.name, '월겁격');
  assert.equal(ref.gyeokguk.type, '일반격');
});

test('12. 戌·丑월 가색은 이설이라 unknown, 종왕으로 우회 확정하지 않음', () => {
  const c = core('丙戌戊戌戊午丁巳');
  assert.equal(check(c, 'ZW-JIASE', 'ZW-JIASE-MONTH').ok, null);
  assert.equal(cand(c, 'ZW-JIASE').status, 'unknown');
  assert.equal(cand(c, 'JONG-WANG').status, 'unknown');
  assert.equal(c.special.decision, 'pending');
  assert.equal(c.gyeokguk.type, '일반격');
  assert.deepEqual([...c.gyeokguk.pendingSpecial], ['가색격(稼穡格)', '종왕격(從旺格)']);
});

test('13. 전왕·종·화기 양성 사례', () => {
  const rows = {
    戊辰己未戊戌丁巳: ['ZW-JIASE', '가색격(稼穡格)'],
    癸未乙卯甲寅乙亥: ['ZW-QUZHI', '곡직격(曲直格)'],
    丙寅甲午壬午丁未: ['JONG-TRUE-wealth', '종재격(從財格)'],
    戊戌辛酉乙酉辛巳: ['JONG-TRUE-officer', '종살격(從殺格)'],
    丙午戊戌甲戌己巳: ['HUA-01', '화토격(化土格)'],
  };
  for (const [text, [id, name]] of Object.entries(rows)) {
    const c = core(text);
    assert.equal(c.special.adopted, id, text);
    assert.equal(c.gyeokguk.name, name, text);
    assert.equal(c.gyeokguk.type, '특수격', text);
    assert.equal(c.yongshin.eokbu.applies, false, text);
  }
});

test('14. 종아는 강약과 무관한 별도 규칙, 인성이 있으면 fail', () => {
  const c = core('丁卯丙午甲午己巳');
  assert.equal(c.special.adopted, 'JONG-ER');
  assert.equal(c.gyeokguk.family, 'follow-output');
  const broken = core('壬寅丙午甲午己巳');
  assert.equal(check(broken, 'JONG-ER', 'E5-NO-PARENT').ok, false);
  assert.equal(broken.gyeokguk.name, '상관격');
});

test('15. 합이 있어도 합화가 아니면 글자 수와 뿌리를 지우지 않음', () => {
  const c = core('甲寅丁丑戊辰己未');
  assert.deepEqual(c.relations.stems.map((s) => s.pair + s.state), ['甲己합(원격)']);
  assert.equal(c.counts.byEl.wood, 2);
  assert.ok(c.hidden.y.some((h) => h.stem === '甲' && h.layer === '정기'));
  // 인접 천간합이라도 두 글자가 모두 뿌리 있으면 합반이고 수는 그대로다.
  const half = core('甲辰己巳丙午');
  assert.equal(half.relations.stems[0].state, '합반');
  assert.equal(half.counts.byEl.wood, 1);
});

test('16. 충은 뿌리를 약하게 할 뿐 지우지 않음', () => {
  const c = core('庚子壬午丙午');
  const m = c.hidden.m;
  assert.ok(m.length === 3 && m.every((h) => h.weakenedBy.includes('충') && h.factor === 0.5));
  const root = c.roots.day;
  assert.ok(root.list.some((r) => r.pos === 'm' && r.layer === '정기'));
  assert.ok(root.weak >= 1);
});

test('17. 조후: 월 누락·잘못된 월지·시간 미상은 insufficient', () => {
  for (const p of [P('甲寅'), { ...P('甲寅丁丑戊辰己未'), m: { g: '丁', j: 'X' } }, P('甲寅丁丑戊辰')]) {
    const c = analyzeClimate(p);
    assert.equal(c.hanNan.type, 'insufficient');
    assert.equal(c.joSeup.type, 'insufficient');
    assert.equal(c.complete, false);
    assert.notEqual(c.needLevel.joSeup, 'low');
  }
  const full = analyzeClimate(P('甲寅丁丑戊辰己未'));
  assert.equal(full.complete, true);
  assert.equal(full.joSeup.type, 'balanced');
});

test('18. 조습은 balanced인데 한난은 보완이 필요한 경우 두 필드를 분리', () => {
  // 子월 -4, 庚 -0.5, 子 -1.5 ×3, 丙 +1.5, 寅 +0.5 → -7(cold). 습 4(子 3, 寅) · 조 2(庚, 丙) → +2(balanced)
  const c = analyzeClimate(P('庚子戊子丙寅戊子'));
  assert.equal(c.hanNan.type, 'cold');
  assert.equal(c.hanNan.score, -7);
  assert.equal(c.needLevel.hanNan, 'high');
  assert.equal(c.joSeup.type, 'balanced');
  assert.equal(c.joSeup.diff, 2);
  assert.deepEqual([...c.supplements.hanNan.needed], ['fire', 'wood']);
});

test('강약 점수와 신강 판정은 calcPower와 같다', () => {
  const S = '甲乙丙丁戊己庚辛壬癸', B = '子丑寅卯辰巳午未申酉戌亥';
  const pillars = Array.from({ length: 60 }, (_, i) => S[i % 10] + B[i % 12]);
  let n = 0;
  for (let i = 0; i < 60; i += 7) for (let k = 0; k < 60; k += 5) for (let d = 0; d < 60; d += 3) {
    for (const hour of [pillars[(d + i) % 60], '']) {
      const text = pillars[i] + pillars[k] + pillars[d] + hour;
      const s = core(text).strength, legacy = calcPower(P(text));
      assert.deepEqual([s.isStrong, s.score, [...s.yongshin], [...s.kijishin], s.dayEl, s.parEl], [legacy.isStrong, legacy.score, legacy.yongshin, legacy.kijishin, legacy.dayEl, legacy.parEl], text);
      n++;
    }
  }
  assert.ok(n > 4000);
});
