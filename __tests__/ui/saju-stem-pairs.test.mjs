import test from 'node:test';
import assert from 'node:assert/strict';
import { stemPairRelation, STEM_PAIR_RULES, STEM_PAIR_TABLE } from '../../lib/saju/natal-core/stem-pairs.mjs';
import { STEM_ORDER } from '../../lib/saju/natal-core/tables.mjs';

test('같은 금극목이라도 庚은 甲을 강하게, 辛은 약하게 극한다', () => {
  const geng = stemPairRelation('庚', '甲');
  assert.equal(geng.relation, 'clash');
  assert.equal(geng.direction, 'forward');
  assert.equal(geng.strength, 'strong');
  const xin = stemPairRelation('辛', '甲');
  assert.equal(xin.relation, 'control');
  assert.equal(xin.strength, 'weak');
  assert.match(xin.note, /辛/);
});

test('己土는 壬水를 막지 못하고 흐린다(harmful-reverse), 戊土는 강하게 막는다', () => {
  const ji = stemPairRelation('己', '壬');
  assert.equal(ji.relation, 'control');
  assert.equal(ji.strength, 'harmful-reverse');
  assert.equal(ji.effect, 'hurts');
  assert.equal(stemPairRelation('戊', '壬').strength, 'strong');
});

test('고전 통설의 이로운 극과 해로운 가림', () => {
  assert.equal(stemPairRelation('丁', '庚').effect, 'helps');
  assert.equal(stemPairRelation('甲', '戊').effect, 'helps');
  assert.equal(stemPairRelation('壬', '丙').effect, 'helps');
  assert.equal(stemPairRelation('壬', '丙').relation, 'clash');
  assert.equal(stemPairRelation('癸', '丙').strength, 'harmful-reverse');
});

test('역방향 조회는 같은 규칙을 reverse로 보여 준다', () => {
  const r = stemPairRelation('甲', '庚');
  assert.equal(r.relation, 'clash');
  assert.equal(r.direction, 'reverse');
  assert.equal(r.strength, 'strong');
});

test('표에 없는 쌍은 오행 규칙으로 돌아간다', () => {
  assert.deepEqual(
    [stemPairRelation('甲', '丙').relation, stemPairRelation('甲', '丙').direction, stemPairRelation('甲', '丙').strength],
    ['generate', 'forward', 'normal'],
  );
  assert.equal(stemPairRelation('丙', '甲').direction, 'reverse');
  assert.equal(stemPairRelation('甲', '乙').relation, 'same');
  assert.equal(stemPairRelation('甲', '己').relation, 'combine');
  assert.equal(stemPairRelation('丙', '庚').strength, 'normal');
  assert.equal(stemPairRelation('丙', '庚').rule, null);
});

test('100칸 표가 빠짐없고 모든 특수 규칙에 출처 메모가 있다', () => {
  assert.equal(Object.keys(STEM_PAIR_TABLE).length, 100);
  for (const a of STEM_ORDER) for (const b of STEM_ORDER) assert.ok(STEM_PAIR_TABLE[a + b], a + b);
  for (const [key, rule] of Object.entries(STEM_PAIR_RULES)) {
    assert.ok(rule.note && rule.source, key);
    assert.equal(STEM_PAIR_TABLE[key].rule, key);
  }
  assert.equal(stemPairRelation('X', '甲'), null);
});
