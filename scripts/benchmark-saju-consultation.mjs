/** Manual, separately authorized benchmark. No payment, DB, retry or fallback path. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { buildSajuAIPromptWithDomain, SAJU_AI_SECTION_GROUPS } from '../worker/lib/saju-ai-prompt.js';
import { __sajuAiSectionTestUtils, getDefaultSajuAiResultSystemPrompt, validateSajuAIResultText } from '../worker/routes/fortune.js';

const args = process.argv.slice(2);
const option = (name) => args[args.indexOf(name) + 1];
if (!args.includes('--input') || !args.includes('--output')) throw Error('--input and --output are required (private local paths)');
const output = path.resolve(option('--output'));
const built = buildSajuAIPromptWithDomain(JSON.parse(fs.readFileSync(option('--input'), 'utf8')));
const model = 'gemini-2.5-flash';
const requests = SAJU_AI_SECTION_GROUPS.map(group => ({
  model: `models/${model}`,
  contents: [{ role: 'user', parts: [{ text: __sajuAiSectionTestUtils.buildSajuAISectionPrompt(built, group) }] }],
  systemInstruction: { parts: [{ text: getDefaultSajuAiResultSystemPrompt() }] },
  generationConfig: { maxOutputTokens: 12000, temperature: 0.56, thinkingConfig: { thinkingBudget: 0 } },
}));
if (requests.length !== 5) throw Error('Expected exactly five groups');
console.log(JSON.stringify({ mode: 'offline-preflight', model, promptVersion: built.promptVersion, groups: requests.length,
  promptChars: requests.map(r => r.contents[0].parts[0].text.length), generationCalls: 0 }));
if (!args.includes('--execute-approved')) process.exit(0);
if (!args.includes('--env-file')) throw Error('--env-file required');
fs.mkdirSync(output, { recursive: true });
// Exclusive durable reservation prevents an accidental second execution of this approval.
const lock = fs.openSync(path.join(output, 'approval-used.json'), 'wx');
fs.writeFileSync(lock, JSON.stringify({ reservedAt: new Date().toISOString(), maxCalls: 5, maxUsd: 1 }));
fs.closeSync(lock);
const env = dotenv.parse(fs.readFileSync(option('--env-file')));
const key = env.GEMINIF_API_KEY || env.GEMINI_API_KEY;
if (!key) throw Error('Missing Gemini key');
const summary = { model, promptVersion: built.promptVersion, source: 'live-local-benchmark',
  priceSource: 'https://ai.google.dev/gemini-api/docs/pricing#gemini-2.5-flash',
  inputUsdPerMillion: 0.30, outputUsdPerMillion: 2.50, inputLimit: 100000,
  maxOutputTokensPerGroup: 12000, generationCalls: 0, groups: [], preflightTokens: [],
  paymentCalls: 0, databaseWrites: 0, retries: 0, explicitCacheCreates: 0,
  requestHashes: requests.map(r => crypto.createHash('sha256').update(JSON.stringify(r)).digest('hex')) };
const save = () => fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(summary, null, 2));
async function post(method, body) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:${method}`, {
    method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(body), signal: AbortSignal.timeout(180000),
  });
  const data = await response.json();
  if (!response.ok) throw Error(`Gemini HTTP ${response.status}: ${data.error?.status || 'unknown'}`);
  return data;
}
try {
  for (const request of requests) {
    const counted = await post('countTokens', { generateContentRequest: request });
    if (!Number.isFinite(counted.totalTokens) || counted.totalTokens <= 0) throw Error('Invalid token count');
    summary.preflightTokens.push(counted.totalTokens);
  }
  const inputTotal = summary.preflightTokens.reduce((a, b) => a + b, 0);
  summary.maximumCalculatedUsd = inputTotal * 0.30 / 1e6 + 60000 * 2.50 / 1e6;
  save();
  if (inputTotal > 100000 || summary.maximumCalculatedUsd > 1) throw Error('Approved budget exceeded before generation');
  const started = performance.now();
  const texts = await Promise.all(requests.map(async (request, index) => {
    const group = { key: SAJU_AI_SECTION_GROUPS[index].key, startedAt: new Date().toISOString(), status: 'reserved' };
    summary.groups.push(group);
    summary.generationCalls += 1;
    save();
    const begin = performance.now();
    try {
      const response = await post('generateContent', request);
      const candidate = response.candidates?.[0];
      const text = candidate?.content?.parts?.filter(p => !p.thought).map(p => p.text || '').join('') || '';
      // Raw response stays in private output, outside the repository; review before sharing excerpts.
      fs.writeFileSync(path.join(output, `group-${index + 1}.json`), JSON.stringify(response, null, 2));
      Object.assign(group, { status: 'received', finishReason: candidate?.finishReason, usage: response.usageMetadata,
        elapsedMs: Math.round(performance.now() - begin), chars: text.length,
        bodyChars: __sajuAiSectionTestUtils.countSajuAIVisibleChars(text) });
      save();
      console.log(JSON.stringify(group));
      return text;
    } catch (error) {
      Object.assign(group, { status: 'failed', error: error.name === 'TimeoutError' ? 'timeout' : String(error.message).slice(0, 160), elapsedMs: Math.round(performance.now() - begin) });
      save();
      return '';
    }
  }));
  const result = texts.filter(Boolean).join('\n\n');
  fs.writeFileSync(path.join(output, 'result.txt'), result);
  summary.wallElapsedMs = Math.round(performance.now() - started);
  summary.bodyChars = __sajuAiSectionTestUtils.countSajuAIVisibleChars(result);
  const validation = validateSajuAIResultText(result, built.factSnapshot, { domain: built.domain });
  summary.validation = Object.fromEntries(Object.entries(validation).filter(([key]) => key !== 'text' && key !== 'tenGodMismatches'));
  summary.tenGodMismatchCount = validation.tenGodMismatches?.length || 0;
  summary.calculatedUsd = summary.groups.reduce((sum, group) => sum + ((group.usage?.promptTokenCount || 0) * 0.30 +
    ((group.usage?.candidatesTokenCount || 0) + (group.usage?.thoughtsTokenCount || 0)) * 2.50) / 1e6, 0);
  summary.costComplete = summary.groups.every(g => g.usage && g.status === 'received');
  save();
  console.log(JSON.stringify({ generationCalls: summary.generationCalls, bodyChars: summary.bodyChars,
    wallElapsedMs: summary.wallElapsedMs, calculatedUsd: summary.calculatedUsd, validation: summary.validation }));
} catch (error) {
  summary.stopped = String(error.message);
  save();
  throw error;
}
