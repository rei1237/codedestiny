import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { CLIMATE_VECTORS, climateV2, analyzeClimate } from '../../lib/saju/natal-core/climate.mjs';

const P = (text) => {
  const a = text.replace(/\s/g, '').match(/../g) || [];
  return Object.fromEntries(['y', 'm', 'd', 'h'].map((k, i) => [k, a[i] ? { g: a[i][0], j: a[i][1] } : { g: '', j: '' }]));
};
const V = (c) => CLIMATE_VECTORS.stems[c] || CLIMATE_VECTORS.branches[c];
// 같은 원국에서 한 글자만 바꿔 기여도를 비교한다.
const contribution = (result, char) => result.contributions.find((row) => row.char === char);

test('목은 모두 습하지만 乙·卯가 甲·寅보다 훨씬 습하다', () => {
  for (const c of '甲乙寅卯') assert.ok(V(c).moist > 0, c);
  assert.ok(V('乙').moist > V('甲').moist);
  assert.ok(V('卯').moist > V('寅').moist);
});

test('수는 습하고 차다, 子·亥는 습+한', () => {
  for (const c of '壬癸子亥') { assert.ok(V(c).moist > 0, c); assert.ok(V(c).temp < 0, c); }
});

test('己는 습토, 戊는 조토 쪽', () => {
  assert.ok(V('己').moist > V('戊').moist);
  assert.ok(V('己').moist > 0 && V('戊').moist < 0);
});

test('午는 지장간 己 때문에 巳보다 덜 건조하다', () => {
  assert.ok(V('午').moist > V('巳').moist);
  assert.ok(CLIMATE_VECTORS.hiddenDays.午.some(([stem]) => stem === '己'));
});

test('辰丑은 습토, 未戌은 조토, 丑이 辰보다 차다', () => {
  assert.ok(V('辰').moist > 0 && V('丑').moist > 0);
  assert.ok(V('未').moist < 0 && V('戌').moist < 0);
  assert.ok(V('丑').temp < V('辰').temp);
});

test('巳는 뜨겁고 丙丁은 건조+뜨겁고 庚辛은 차며 습도는 중립 근처', () => {
  assert.ok(V('巳').temp > 0);
  for (const c of '丙丁') { assert.ok(V(c).moist < 0 && V(c).temp > 0, c); }
  for (const c of '庚辛') { assert.ok(V(c).temp < 0 && Math.abs(V(c).moist) <= 0.5, c); }
});

test('화가 있으면 寅·甲의 습기만 줄고 乙·卯는 줄지 않는다', () => {
  const noFire = climateV2(P('壬寅 壬子 甲寅 乙卯'));
  const withFire = climateV2(P('壬寅 壬子 甲寅 丙寅'), {});
  assert.equal(noFire.fireContext, false);
  assert.equal(withFire.fireContext, true);
  assert.ok(contribution(withFire, '寅').moist < contribution(noFire, '寅').moist);
  assert.ok(contribution(withFire, '甲').moist < contribution(noFire, '甲').moist);
  // 운에서 들어온 불도 같은 맥락으로 본다.
  const luckFire = climateV2(P('壬寅 壬子 甲寅 乙卯'), { luck: [{ stem: '丙', branch: '午', scope: 'sewoon' }] });
  assert.equal(luckFire.fireContext, true);
  assert.ok(contribution(luckFire, '卯').moist === contribution(noFire, '卯').moist);
  assert.ok(contribution(luckFire, '乙').moist === contribution(noFire, '乙').moist);
});

test('월지는 2배, 일간에 붙은 글자는 1.5배로 센다', () => {
  const r = climateV2(P('甲子 丙子 戊子 庚子'));
  const at = (pos, kind) => r.contributions.find((row) => row.pos === pos && row.kind === kind);
  assert.equal(at('m', 'j').weight, 2);
  assert.equal(at('y', 'j').weight, 1);
  assert.equal(at('m', 'g').weight, 1.5);
  assert.equal(at('h', 'g').weight, 1.5);
  assert.equal(at('d', 'j').weight, 1.5);
  assert.equal(at('m', 'j').moist, V('子').moist * 2);
  // 같은 글자를 월지로 옮기면 총합이 더 커진다.
  const monthWet = climateV2(P('丙午 壬子 戊午 丙午'));
  const yearWet = climateV2(P('壬子 丙午 戊午 丙午'));
  assert.ok(monthWet.totals.moist > yearWet.totals.moist);
});

test('한습·조열·균형 분류와 조후 긴급도', () => {
  const cold = climateV2(P('壬子 壬子 乙丑 丙子'));
  assert.equal(cold.classification.type, '한습');
  assert.equal(cold.urgent, true);
  assert.ok(cold.needs.elements.includes('fire'));
  assert.ok(cold.needs.avoid.includes('water'));
  assert.ok(cold.reasons.length >= 2);
  const hot = climateV2(P('丙午 甲午 庚戌 癸未'));
  assert.equal(hot.classification.type, '조열');
  assert.equal(hot.urgent, true);
  assert.ok(hot.needs.elements.includes('water'));
  assert.equal(climateV2(P('甲子 丙子')).complete, false);
});

test('기존 analyzeClimate 출력은 그대로다(climate v2 추가 전 해시)', () => {
  const expected = { 甲寅丁丑戊辰己未: 'c4933d50143f', 壬子壬子乙丑丙子: '74ad00a985e9', 丙午甲午庚戌癸未: 'effcdd99fde0' };
  for (const [text, hash] of Object.entries(expected)) {
    assert.equal(createHash('sha1').update(JSON.stringify(analyzeClimate(P(text)))).digest('hex').slice(0, 12), hash, text);
  }
});
