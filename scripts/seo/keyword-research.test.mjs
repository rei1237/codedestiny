import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assignUrl, intentOf, isExcluded } from './keyword-research.mjs';
test('homonyms, other operators, offline and medical intents are never targeted', () => {
  for (const k of ['관상동맥', '관상 결말', '토르 라그나로크', '전생슬 4기', '타로 버블티', '군산 명궁칼국수',
    '부산 사주 잘보는곳', '지윤철학원 주간운세', '개명 절차', '제왕절개 택일', '재회운 디시', '사주 궁합 사이트 더쿠']) {
    assert.equal(isExcluded(k), true, k);
  }
  for (const k of ['사주 프롬프트', '만세력 천을귀인', '자미두수 배우자 외모', '손금 결혼선', '2027 신년운세']) {
    assert.equal(isExcluded(k), false, k);
  }
});
test('each keyword group resolves to one canonical URL', () => {
  assert.equal(assignUrl('재회운 프롬프트'), '/fortune/prompt-hub/');
  assert.equal(assignUrl('토정비결 2027'), '/new-year-ai-consultation/');
  assert.equal(assignUrl('대운 계산기'), '/manse/');
  assert.equal(assignUrl('자미두수 명반 계산기'), '/ziwei/');
  assert.equal(assignUrl('재회운 사주 무료'), '/love/');
  assert.equal(assignUrl('사주 궁합 무료'), '/compatibility/');
  assert.equal(assignUrl('내일의 운세 뱀띠'), '/fortune/');
  assert.equal(assignUrl('라그나 뜻'), '/vedic/');
  assert.equal(assignUrl('전생'), '');
});
test('intent separates information from tool searches', () => {
  assert.equal(intentOf('도화살 뜻'), 'I');
  assert.equal(intentOf('숙요점 계산기'), 'T');
  assert.equal(intentOf('자미두수'), 'M');
});
