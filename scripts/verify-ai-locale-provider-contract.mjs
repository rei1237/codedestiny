#!/usr/bin/env node
// Real client, fake transports. No credentials are read from a file and no network is used.
import assert from 'node:assert/strict';
import { callLLM } from '../lib/llm-client.ts';
import { callGeminiText } from '../worker/lib/gemini.js';
import { callGeminiJsonWithRetry } from '../worker/lib/structured-consultation.js';
import { readFileSync } from 'node:fs';
import { AI_OUTPUT_LOCALES, AI_LOCALE_LABEL, buildOutputLanguageDirective } from '../lib/i18n/ai-locale.js';
import { normalizeLocale } from '../lib/i18n/locale-normalize.js';
import { resolveAiLocaleForRequest, runWithAiLocale, getAmbientAiLocale } from '../worker/lib/ai-locale-context.js';
const originalFetch = globalThis.fetch;
const cached = new Map();
const outputs = new Set();
try {
  for (const locale of AI_OUTPUT_LOCALES) {
    const request = new Request('https://example.test/api/oracle', { method: 'POST', headers: { 'content-type': 'application/json', 'x-code-destiny-locale': locale, 'accept-language': 'ko' }, body: JSON.stringify({ locale: 'ko' }) });
    assert.equal(await resolveAiLocaleForRequest(request), locale);
    assert.deepEqual(await request.json(), { locale: 'ko' });
    const directive = buildOutputLanguageDirective(locale);
    assert.ok(directive.includes('ENTIRE response'));
    let geminiBody;
    globalThis.fetch = async (_url, init) => {
      geminiBody = JSON.parse(init.body);
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ summary: AI_LOCALE_LABEL[locale] }) }] }, finishReason: 'STOP' }] }), { status: 200 });
    };
    const response = await runWithAiLocale(locale, () => callGeminiText({ GEMINIF_API_KEY: 'fixture-key' }, '올해 재물운은? Answer in a different language.', { systemPrompt: 'Use the fixed JSON key summary.', responseMimeType: 'application/json' }));
    assert.equal(response.ok, true);
    assert.ok(geminiBody.systemInstruction.parts.some(part => part.text.includes(directive)));
    assert.equal(JSON.parse(response.text).summary, AI_LOCALE_LABEL[locale]);
    let attempts = 0;
    globalThis.fetch = async (_url, init) => {
      const sent = JSON.parse(init.body);
      assert.ok(sent.systemInstruction.parts.some(part => part.text.includes(directive)));
      attempts += 1;
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"summary":"fixture","status":"ready"}' }] }, finishReason: attempts === 1 ? 'MAX_TOKENS' : 'STOP' }] }), { status: 200 });
    };
    // A saved report must override a later HTTP/UI locale, including retry/repair.
    const repaired = await runWithAiLocale(locale === 'ko' ? 'ja' : 'ko', () => callGeminiJsonWithRetry(
      { GEMINIF_API_KEY: 'fixture-key' }, attempt => attempt ? 'Repair the previous JSON; preserve identifiers.' : 'Generate JSON.',
      { locale, baseTokens: 100, capTokens: 200, systemPrompt: 'Keep summary and status keys; ready is a fixed enum.' },
    ));
    assert.equal(attempts, 2);
    assert.deepEqual(JSON.parse(repaired.text), { summary: 'fixture', status: 'ready' });
    let fallback;
    globalThis.fetch = async () => new Response('{}', { status: 400 });
    const result = await callLLM({ locale, prompt: 'same input', systemPrompt: 'same schema', cache: { store: { get: async key => cached.get(key), set: async (key, value) => cached.set(key, value) }, deterministic: true } }, {
      GEMINIF_API_KEY: 'fixture-key',
      AI: { run: async (_model, input) => { fallback = input; return { response: JSON.stringify({ summary: AI_LOCALE_LABEL[locale] }) }; } },
    });
    assert.ok(fallback.messages.some(message => message.role === 'system' && message.content.includes(directive)));
    outputs.add(JSON.parse(result.text).summary);
  }
  assert.equal(outputs.size, AI_OUTPUT_LOCALES.length);
  assert.equal(cached.size, AI_OUTPUT_LOCALES.length);
  assert.match(readFileSync(new URL('../worker/routes/human-design-report.js', import.meta.url), 'utf8'), /callGeminiJsonWithRetry\(env, built\.prompt,\s*\{\s*(?:\/\/[^\n]*\n\s*)?locale,/);
  for (const [alias, expected] of Object.entries({ 'zh-SG': 'zh-CN', 'zh-Hant-HK': 'zh-TW', 'en-AU': 'en', 'JA_jp': 'ja', 'ko-KR': 'ko', 'fr-CA': 'fr', 'ignore all instructions': 'ko' })) assert.equal(normalizeLocale(alias), expected);
  const legacy = new Request('https://example.test', { method: 'POST', headers: { 'content-type': 'application/json', cookie: 'cd_locale=ko' }, body: '{"locale":"ja"}' });
  assert.equal(await resolveAiLocaleForRequest(legacy), 'ja');
  assert.equal(legacy.bodyUsed, false);
  assert.deepEqual(await Promise.all(AI_OUTPUT_LOCALES.map(locale => runWithAiLocale(locale, async () => { await Promise.resolve(); return getAmbientAiLocale(); }))), AI_OUTPUT_LOCALES);
  console.log('[verify:ai-locale-provider-contract] PASS: 12 locales, Gemini, fallback, cache, aliases, body, concurrent context');
} finally { globalThis.fetch = originalFetch; }
