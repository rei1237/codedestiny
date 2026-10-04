import { normalizeNarrativeBody, completeNarrativeBody, selectNarrativeCandidate, narrativeRepairTask } from '../../worker/lib/paid-narrative-candidate.js';

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

test('one readable paragraph is deliverable and an incomplete tail is trimmed without new prose', () => {
  const one = draft.replace('\n\n', ' ');
  expect(completeNarrativeBody(one)).toBe(true);
  expect(normalizeNarrativeBody(one + ' 아직 끝나지 않은')).toBe(one);
  expect(normalizeNarrativeBody(draft + '\n\n' + draft)).toBe(draft);
  expect(normalizeNarrativeBody('미완성')).toBe('');
});

test('a small exact overlap is edited locally while unique paid prose survives', () => {
  const shared = '계산된 흐름은 고정된 미래가 아니므로 현재의 상황과 선택을 함께 확인해야 합니다.';
  const unique = Array.from({length: 12}, (_, i) => `${i}번째 선택에서는 일정과 자원을 따로 기록하고 실행 뒤의 변화를 살펴보는 과정이 도움이 됩니다.`).join(' ');
  const body = `${shared} ${unique}`;
  expect(normalizeNarrativeBody(body, [shared])).toBe(unique);
  expect(completeNarrativeBody(normalizeNarrativeBody(body, [shared]))).toBe(true);
  expect(normalizeNarrativeBody(shared, [shared])).toBe('');
  expect(normalizeNarrativeBody(`${shared} 짧은 조언입니다.`, [shared])).toBe('');
});

test('structured content is never sentence-edited or reshaped', () => {
  const body = JSON.stringify({answer: draft, evidence: 'original'});
  expect(normalizeNarrativeBody(body, [draft])).toBe(body);
});
