import { completeNarrativeBody, selectNarrativeCandidate, narrativeRepairTask } from '../../worker/lib/paid-narrative-candidate.js';

const draft = '현재의 선택은 계산된 근거와 실제 상황을 함께 확인해야 합니다.\n\n이번 주에는 대화 내용을 기록하고 상대의 속도를 확인해 보세요.';
test('length is advisory, but empty, unfinished and repeated narratives are not candidates', () => {
  expect(completeNarrativeBody(draft)).toBe(true);
  for (const body of ['', '짧은 답변.', draft.slice(0, -1), draft + '\n\n' + draft]) expect(completeNarrativeBody(body)).toBe(false);
});
test('failed or shorter repair preserves the durable draft', () => {
  expect(selectNarrativeCandidate(draft, null)).toBe(draft);
  expect(selectNarrativeCandidate(draft, '미완성')).toBe(draft);
  expect(selectNarrativeCandidate(null, draft)).toBe(draft);
});
test('repair targets only the missing part and preserves its identity', () => {
  const task = { id: 'part-9', prompt: '질문에 대한 답변', minChars: 3000 };
  expect(narrativeRepairTask(task, null)).toBe(task);
  const repair = narrativeRepairTask(task, draft);
  expect(repair.id).toBe('part-9');
  expect(repair.prompt).toContain(draft);
  expect(repair.prompt).toContain('다른 항목은 다시 쓰지 마세요');
  expect(task.prompt).toBe('질문에 대한 답변');
});
