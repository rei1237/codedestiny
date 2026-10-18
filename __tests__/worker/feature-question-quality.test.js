/** @jest-environment node */
import { cleanQuestionBody, questionEditorialContext } from '../../worker/lib/feature-question-quality.js';

test('debt refrain is limited across chapters without losing unrelated advice', () => {
 const prior = { parts: { 'part-1': '빚은 남겨 두면 불어나요.' } };
 expect(cleanQuestionBody('빚은 남겨 두면 불어나므로 기준을 세우세요. 요청 전에 여유를 확인하세요.', prior)).toBe('요청 전에 여유를 확인하세요.');
});
test('unpunctuated completed Korean sentences survive, dangling particles do not', () => {
 expect(cleanQuestionBody('별의 의미를 쉽게 설명합니다\n\n다음 선택에서 당신이.')).toBe('별의 의미를 쉽게 설명합니다');
});
test('later parts see prior examples, not just the opening sentence', () => {
 const state = { tasks: [{ id:'part-1',title:'핵심' }], parts: { 'part-1':'첫 문장입니다. 반복하면 안 될 구체적인 사례입니다.' } };
 const context = questionEditorialContext(state,{id:'part-2',prompt:'기질만 설명'});
 expect(context).toContain('반복하면 안 될 구체적인 사례');
 expect(context).toContain('기질만 설명');
 expect(context).toContain('투자·확장을 권하지 않습니다');
});
