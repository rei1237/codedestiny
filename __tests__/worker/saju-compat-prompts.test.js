/** @jest-environment node */
import { requestBody, samplePairs } from '../fixtures/saju-compat-llm-fixture.mjs';
import { buildSajuCompatFactsBlock, buildSajuCompatPrompt } from '../../worker/lib/saju-compat-prompts.js';

// The engine's ELEMENT_* reasons compare each chart's dominant (most frequent) element,
// not the day stem. A "일간" label made the model write "두 분 일간 모두 금" for a 乙 day stem (B2).
const reasonsOf = (body) => JSON.parse(buildSajuCompatFactsBlock(body))['점수 근거(확정)'];
const ELEMENT_GLOSS = /가장 많은 오행/u;

test('ELEMENT_SAME 근거는 일간이 아니라 두 사람의 가장 많은 오행이 같다고 말한다', () => {
  // Fixed profile: both charts are metal-dominant, but the day stems are 辛(metal) and 乙(wood).
  const body = requestBody('辛未 庚寅 辛酉 壬辰', '辛未 丙申 乙亥 壬午');
  expect(body.facts.reasons.map((reason) => reason.code)).toContain('ELEMENT_SAME');
  const same = reasonsOf(body).find((row) => row['세부'] === '두 사람의 가장 많은 오행 금(金)');
  expect(same).toBeTruthy();
  expect(same['뜻']).toMatch(ELEMENT_GLOSS);
  expect(same['뜻']).not.toMatch(/일간/u);
});

test('ELEMENT_KE·생(生) 근거와 상극 보강 지침도 가장 많은 오행 기준으로만 설명한다', () => {
  const pairs = samplePairs(20261011, 400).map(([a, b]) => requestBody(a, b));
  const codes = ['ELEMENT_KE', 'ELEMENT_SHENG_SELF_TO_PARTNER', 'ELEMENT_SHENG_PARTNER_TO_SELF'];
  for (const code of codes) {
    const body = pairs.find((item) => item.facts.reasons.some((reason) => reason.code === code));
    expect(body).toBeTruthy();
    const index = body.facts.reasons.findIndex((reason) => reason.code === code);
    const row = reasonsOf(body)[index];
    expect(row['뜻']).toMatch(ELEMENT_GLOSS);
    expect(row['뜻']).not.toMatch(/일간/u);
    expect(row['세부']).toMatch(ELEMENT_GLOSS);
  }
  const ke = pairs.find((item) => item.facts.factFlags.some((flag) => flag.startsWith('KE_')));
  const prompt = buildSajuCompatPrompt('practice', ke);
  expect(prompt).toMatch(/"ke": "약 200자: [^"]*가장 많은 오행/u);
  expect(prompt).not.toMatch(/일간 오행 상극/u);
});
