import assert from 'node:assert/strict';
import { callLLM, createGeminiContextCache } from '../lib/llm-client.ts';
import { CONSULTATION_COUNSEL_GUIDE } from '../lib/fortune/consultation-counsel.mjs';
const originalFetch = globalThis.fetch;
const requests = [];
globalThis.fetch = async (url, init) => {
  assert(String(url).startsWith('https://generativelanguage.googleapis.com/'));
  const body = JSON.parse(init.body);
  requests.push({ url: String(url), body });
  if (String(url).includes(':countTokens')) return Response.json({ totalTokens: 3000 });
  if (String(url).includes('/cachedContents')) return Response.json({ name: 'cachedContents/mock-counsel' });
  return Response.json({ candidates: [{ content: { parts: [{ text: '{"answer":"mock only"}' }] }, finishReason: 'STOP' }] });
};
try {
  const env = { GEMINIF_API_KEY: 'mock-not-a-real-key' };
  for (const question of ['먼저 연락할까요?', '재회를 기다릴까요?', '이직할까요?', '돈 관리를 어떻게 시작할까요?', '무엇부터 해야 할지 모르겠어요']) {
    const output = await callLLM({ prompt: question, systemPrompt: '지정된 JSON으로 답한다.', fallbackToWorkersAI: false, maxProviderAttempts: 1, outputRegister: 'persona' }, env);
    assert(output.text);
    const wire = requests.findLast(r => r.url.includes(':generateContent')).body;
    assert(wire.systemInstruction.parts[0].text.includes(CONSULTATION_COUNSEL_GUIDE));
    assert(wire.systemInstruction.parts[0].text.includes('캐릭터 말투'));
    assert.equal(JSON.parse(output.text).answer, 'mock only');
  }
  await callLLM({ prompt: '질문에 답한다', systemPrompt: CONSULTATION_COUNSEL_GUIDE, fallbackToWorkersAI: false }, env);
  const system = requests.findLast(r => r.url.includes(':generateContent')).body.systemInstruction.parts[0].text;
  assert.equal(system.split('[상담 실행 조언 원칙 v3]').length - 1, 1, 'guide must not duplicate');
  const cache = await createGeminiContextCache({ prefix: '제공된 계산 근거 '.repeat(2000), systemPrompt: '지정된 JSON으로 답한다.', model: 'gemini-2.5-flash' }, env);
  assert(cache?.systemPrompt.includes(CONSULTATION_COUNSEL_GUIDE), 'cache receives same guide');
  console.log('[consultation-counsel] PASS: 5 question types, guide dedupe, cache and schema (mock only; not model quality evidence)');
} finally { globalThis.fetch = originalFetch; }
