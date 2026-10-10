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

// R6 2026-10-10: 근거 인용 괄호로 끝나는 문단의 괄호와 굵은 소제목 문단이 통째로 지워졌다.
test('keeps a closing evidence citation and bold labels, but still trims a cut citation', () => {
  const cited = '명예를 얻으려는 경향이 강합니다. (명궁: 술궁 주성 천동(평), 우필, 자화: 명궁=화과:우필)';
  const label = '**힘을 실어주는 요소:**';
  expect(normalizeNarrativeBody(`${label}\n\n${cited}`)).toBe(`${label}\n\n${cited}`);
  expect(normalizeNarrativeBody('명예를 얻으려는 경향이 강합니다. (명궁: 술궁 주성 천동(평')).toBe('명예를 얻으려는 경향이 강합니다.');
  expect(normalizeNarrativeBody(`${draft}\n\n${label}`)).toBe(draft);
});
