const test = require('node:test');
const assert = require('node:assert/strict');
const quality = import('../../worker/lib/paid-report-quality.js');

test('19999 body characters do not pass with titles or markdown added', async () => {
  const { countPaidReportBodyChars } = await quality;
  const body = '가'.repeat(19999);
  const presentation = '# 리포트 제목\n**인생의 흐름**\n__선택과 조언__\n제목\n===\n소제목\n---\n1. 첫 장\n- [올해의 흐름](#year)\n';
  assert.equal(countPaidReportBodyChars(presentation + body), 19999);
  assert.equal(countPaidReportBodyChars(presentation + body + '나'), 20000);
});

test('emphasis within a sentence and link text remain body, whitespace does not', async () => {
  const { countPaidReportBodyChars } = await quality;
  assert.equal(countPaidReportBodyChars('**오늘은** [한 걸음](https://example.invalid)\n\t쉬어 갑니다.'), '오늘은한걸음쉬어갑니다.'.length);
  assert.equal(countPaidReportBodyChars('**이 문장은 강조된 본문입니다.**'), '이문장은강조된본문입니다.'.length);
});

test('unicode counts code points after normalization and repeated headings are not repeated prose', async () => {
  const { countPaidReportBodyChars, hasRepeatedReportPassage } = await quality;
  assert.equal(countPaidReportBodyChars('😀 가'), 2);
  assert.equal(hasRepeatedReportPassage('**반대 조건과 생활에서 실천할 수 있는 구체적인 행동 조언**\n**반대 조건과 생활에서 실천할 수 있는 구체적인 행동 조언**'), false);
  const sentence = '계산 근거를 바탕으로 생활의 여러 선택을 살피고 자신에게 필요한 행동을 구체적으로 정리합니다.';
  assert.equal(hasRepeatedReportPassage(sentence + '\n' + sentence), true);
});
