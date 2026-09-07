// Synthetic UI fixtures follow fortune ai-prompt, ziwei publicConsultation and
// tarot crystal-soul response envelopes. They do not validate fortune accuracy.
const message = '지금은 마음의 속도를 살피고 작은 선택부터 정리할 때입니다. 오늘 실천할 한 가지를 골라 보세요.';
export const sajuResponse = { ok: true, prompt: message, text: message, provider: 'mock', model: 'fixture' };
export const ziweiResponse = {
  ok: true, sessionId: 'mock-ziwei', consultation: {
    id: 'mock-ziwei', status: 'completed', accessType: 'mock', birthInfo: {}, topic: 'general',
    userQuestion: '', summaryCards: [], analysisBasis: {}, ziweiChart: {},
    messages: [{ role: 'assistant', content: message, createdAt: '2026-01-01T00:00:00.000Z' }],
  },
};
export const tarotResponse = { ok: true, readingSource: 'mock', model: 'fixture', reading: message, readingData: null };
