/** @jest-environment node */
import { jest } from '@jest/globals';
import { jsonSchemaFromExample } from '../../worker/lib/json-text-repair.js';
const provider = jest.fn();
jest.unstable_mockModule('../../lib/llm-client.ts', () => ({
  callLLM: provider, createGeminiContextCache: jest.fn(), deleteGeminiContextCache: jest.fn(),
}));
let callGeminiText, runWithPaidGenerationContext, getPaidGenerationRaw;
beforeAll(async () => {
  ({ callGeminiText } = await import('../../worker/lib/gemini.js'));
  ({ runWithPaidGenerationContext, getPaidGenerationRaw } = await import('../../worker/lib/paid-generation-context.js'));
});

beforeEach(() => provider.mockReset());

test.each(['gemini', 'cloudflare'])('%s JSON repair preserves raw evidence and uses one provider call', async transport => {
  const raw = '{"result":{"body":"기존 상담 내용입니다.","evidenceHash":"original"}}';
  provider.mockResolvedValue({ text: raw, provider: transport, model: 'test-provider', truncated: false, finishReason: 'STOP' });
  await runWithPaidGenerationContext({ serviceId: 'test' }, async () => {
    const response = await callGeminiText({}, 'prompt', { responseMimeType: 'application/json', responseSchema: jsonSchemaFromExample({ body: '', evidenceHash: '' }), preserveTermination: true });
    expect(JSON.parse(response.text)).toEqual({ body: '기존 상담 내용입니다.', evidenceHash: 'original' });
    expect(response.rawText).toBe(raw);
    expect(getPaidGenerationRaw()).toBe(raw);
    expect(response.finishReason).toBe('STOP');
  });
  expect(provider).toHaveBeenCalledTimes(1);
  expect(provider.mock.calls[0][0].responseSchema.properties.body.type).toBe('STRING');
});

test('chapter termination and mock flags survive JSON formatting repair', async () => {
  provider.mockResolvedValue({ text: '```json\n{"body":"저장된 본문"}\n```', provider: 'gemini', isMock: true, truncated: true, finishReason: 'MAX_TOKENS' });
  const result = await callGeminiText({}, 'prompt', { responseMimeType: 'application/json', preserveTermination: true });
  expect(result).toMatchObject({ text: '{"body":"저장된 본문"}', isMock: true, truncated: true, finishReason: 'MAX_TOKENS' });
});

test('plain-text calls retain their original output', async () => {
  const raw = '```json\n{"body":"본문"}\n```';
  provider.mockResolvedValue({ text: raw, provider: 'gemini' });
  expect((await callGeminiText({}, 'plain prose')).text).toBe(raw);
});
