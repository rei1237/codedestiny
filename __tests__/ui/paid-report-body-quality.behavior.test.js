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

// R6d: 흑월 2차 실호출에서 앞 장과 겹친 문장을 지운 뒤 굵게 표시가 열린 채 남고("**1. 대신 …"),
// 문단이 지시 대상 없는 "이는 …"으로 시작했다. 고정 입력으로 두 사례를 재현한다.
test('dropping a repeated list-item sentence keeps the bold item title paired', async () => {
  const { dropRepeatedReportSentences } = await quality;
  const head = '**1. 2027년 양력 3월과 6월에는 중요한 결정을 보류한다:** 이 두 달은 조심할 흐름이 강하게 들어오는 시기다.';
  const prior = `${head} 서두르지 않는 편이 좋다.`;
  const text = `${head} 대신 이 시기에는 정보 수집이나 역량 강화에 집중하는 것이 현명하다.\n\n**2. 8월에는 움직인다:** 기회를 찾아 나선다.`;
  const out = dropRepeatedReportSentences(text, prior);
  assert.equal(out, '**1. 2027년 양력 3월과 6월에는 중요한 결정을 보류한다:** 대신 이 시기에는 정보 수집이나 역량 강화에 집중하는 것이 현명하다.\n\n**2. 8월에는 움직인다:** 기회를 찾아 나선다.');
  for (const line of out.split('\n')) assert.equal((line.match(/\*\*/g) || []).length % 2, 0, line);
  // 목록 번호만 남는 줄은 줄째 지운다.
  const repeated = '이 두 달은 조심할 흐름이 강하게 들어오는 시기라서 결정을 미루는 편이 낫다.';
  assert.equal(dropRepeatedReportSentences(`1. ${repeated}\n2. 새 기회를 찾아 이력서를 정리한다.`, repeated), '2. 새 기회를 찾아 이력서를 정리한다.');
});

test('a paragraph whose antecedent sentence was dropped does not open with a back-reference', async () => {
  const { dropRepeatedReportSentences } = await quality;
  const antecedent = '당신은 기준을 세우고 정리하는 힘이 강한 사람이라 판단이 흔들릴 때도 중심을 지켜요.';
  const rest = '이는 이직이나 계약 같은 중요한 결정을 내릴 때 매우 유용하게 작용할 수 있죠. 하지만 때로는 이러한 기준이 너무 경직될 수 있어요.';
  const out = dropRepeatedReportSentences(`첫 문단은 새로 쓴 이야기로 시작해요.\n\n${antecedent} ${rest}`, antecedent);
  assert.equal(out, '첫 문단은 새로 쓴 이야기로 시작해요.\n\n이직이나 계약 같은 중요한 결정을 내릴 때 매우 유용하게 작용할 수 있죠. 하지만 때로는 이러한 기준이 너무 경직될 수 있어요.');
  // 앞 줄이 통째로 지워진 경우도 같은 문단이면 같다.
  assert.equal(dropRepeatedReportSentences(`${antecedent}\n${rest}`, antecedent).startsWith('이직이나'), true);
  // 아무것도 지우지 않았으면 원문 그대로 둔다.
  assert.equal(dropRepeatedReportSentences(`${antecedent} ${rest}`, ''), `${antecedent} ${rest}`);
});
