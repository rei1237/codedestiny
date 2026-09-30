import '../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { buildOutputLanguageDirective } from '../../lib/i18n/ai-locale.js';
import { FUSION_SECTION_GROUP_SPECS, buildFusionSectionGroupPrompt } from '../../worker/lib/fusion-fortune-prompt.js';
import { FUSION_EXPERT_VERSION } from '../../worker/lib/fusion-expert-contract.js';

// Removing the display copy is safe only if the transport schema retains every
// field, descriptor, order and array cardinality; heterogeneous examples fail.
function assertAllSchemaInformation(source, encoded) {
  if (Array.isArray(source)) {
    assert.equal(encoded.type, 'ARRAY');
    for (const item of source) assert.deepEqual(item, source[0], 'distinct array examples must remain in the prompt');
    assertAllSchemaInformation(source[0], encoded.items);
    if (source.length > 1) assert.equal(encoded.minItems, source.length);
  } else if (source && typeof source === 'object') {
    assert.equal(encoded.type, 'OBJECT');
    assert.deepEqual(encoded.required, Object.keys(source));
    assert.deepEqual(encoded.propertyOrdering, Object.keys(source));
    for (const [key, child] of Object.entries(source)) assertAllSchemaInformation(child, encoded.properties[key]);
  } else {
    const descriptor = String(source ?? '');
    assert.equal(encoded.type, descriptor.startsWith('number') ? 'NUMBER' : 'STRING');
    assert.equal(encoded.description || '', descriptor === 'string' ? '' : descriptor);
  }
}

for (const version of ['legacy', FUSION_EXPERT_VERSION]) test(version + ' removes only the duplicate schema across all groups and locales', () => {
  let removedChars = 0;
  for (const locale of ['ko', 'en', 'ja']) for (const group of FUSION_SECTION_GROUP_SPECS) {
    const context = { version, locale, birthTimeKnown: true };
    const args = { context, group, extraInstruction: '기존 보정 지침을 그대로 적용합니다.' };
    const display = buildFusionSectionGroupPrompt(args);
    const sent = buildFusionSectionGroupPrompt({ ...args, schemaInPrompt: false });
    assertAllSchemaInformation(display.responseSchema, sent.geminiSchema);
    assert.deepEqual(sent.geminiSchema, display.geminiSchema);
    assert.deepEqual(sent.responseSchema, display.responseSchema);
    assert.equal(sent.systemPrompt, display.systemPrompt);
    assert.equal(sent.promptPrefix, display.promptPrefix);
    const line = (version === 'legacy' ? '응답 JSON 스키마(이 키만):\n' : '응답 JSON 스키마: ') + JSON.stringify(display.responseSchema);
    assert.equal(sent.userPrompt, display.userPrompt.replace('\n\n' + line, ''));
    assert.ok(sent.userPrompt.startsWith(sent.promptPrefix));
    removedChars += display.userPrompt.length - sent.userPrompt.length;
  }
  assert.ok(removedChars > 1000);
  console.log(JSON.stringify({ version, groups: FUSION_SECTION_GROUP_SPECS.length, locales: 3, removedPromptChars: removedChars, billedTokensMeasured: false }));
});

const built = await build({ entryPoints: ['worker/lib/gemini.js'], bundle: true, platform: 'node', format: 'esm', write: false });
const { callGeminiText } = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));
test('actual shared transport sends one schema, preserving fixed evidence and token-count input', async () => {
  const original = globalThis.fetch; const calls = [];
  const context = { version: FUSION_EXPERT_VERSION, birthTimeKnown: true };
  const prompt = buildFusionSectionGroupPrompt({ context, group: FUSION_SECTION_GROUP_SPECS[0], schemaInPrompt: false });
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body); calls.push({ url: String(url), body });
    return Response.json(String(url).includes(':countTokens') ? { totalTokens: 100 } :
      { candidates: [{ content: { parts: [{ text: '{"body":"fixture"}' }] }, finishReason: 'STOP' }] });
  };
  try {
    const result = await callGeminiText({ GEMINIF_API_KEY: 'fixture-only' }, prompt.userPrompt, {
      systemPrompt: prompt.systemPrompt, responseSchema: prompt.geminiSchema, responseMimeType: 'application/json',
      maxOutputTokens: 9500, fallbackToWorkersAI: false,
    });
    assert.equal(result.ok, true); assert.equal(calls.length, 2);
    const generation = calls.find(row => row.url.includes(':generateContent')).body;
    const counted = calls.find(row => row.url.includes(':countTokens')).body.generateContentRequest;
    assert.deepEqual(generation.generationConfig.responseSchema, prompt.geminiSchema);
    assert.equal(generation.contents[0].parts[0].text, prompt.userPrompt + '\n\n' + buildOutputLanguageDirective('ko'));
    assert.deepEqual(generation.contents, counted.contents);
    assert.deepEqual(generation.systemInstruction, counted.systemInstruction);
    assert.equal(generation.generationConfig.maxOutputTokens, 9500);
    assert.equal(generation.contents[0].parts[0].text.includes(JSON.stringify(prompt.responseSchema)), false);
  } finally { globalThis.fetch = original; }
});
