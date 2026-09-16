/** Provider-boundary mocks; compare the same input/model/output with the starting source. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import * as current from '../worker/lib/fusion-fortune.js';
import { FUSION_SECTION_GROUP_SPECS } from '../worker/lib/fusion-fortune-prompt.js';

const beforeSha = process.argv[2] || '20fd46f68016cdfd7e6c5fe085ce8bdfa3f50b34';
assert.match(beforeSha, /^[a-f0-9]{40}$/);
const source = await readFile('__tests__/worker/fusion-fortune.test.js', 'utf8');
const ast = ts.createSourceFile('fusion.test.js', source, ts.ScriptTarget.Latest, true);
const helpers = [];
function visit(node) {
  if (ts.isFunctionDeclaration(node) && ['fusionFiller', 'buildFusionGroupPayload', 'fusionAdapters'].includes(node.name?.text)) helpers.push(node.getText(ast));
  ts.forEachChild(node, visit);
}
visit(ast); assert.equal(helpers.length, 3);
const fixture = vm.createContext({}); vm.runInContext(helpers.join('\n'), fixture);
const input = { birthDate: '1995-04-18', birthTime: '08:30', calendarType: 'solar', gender: 'female', topic: '삶의 전반적인 흐름', concern: '' };
const calculations = Object.fromEntries(['saju', 'ziwei', 'vedic', 'sukuyo', 'astrology', 'tarot'].map(key => [key, 0]));
const { context } = await current.buildFusionFortuneContext(input, { adapters: fixture.fusionAdapters(calculations) });
const baselinePath = path.resolve(`worker/lib/fusion-fortune.af-before-${process.pid}.tmp.mjs`);
const metrics = [];
try {
  await writeFile(baselinePath, execFileSync('git', ['show', `${beforeSha}:worker/lib/fusion-fortune.js`], { encoding: 'utf8' }), { flag: 'wx' });
  const before = await import(pathToFileURL(baselinePath).href);
  for (const [label, implementation] of [['before', before], ['after', current]]) {
    const rows = [];
    const providerCall = async (_env, prompt, options) => {
      const group = FUSION_SECTION_GROUP_SPECS.find(row => row.id === options.logContext.sectionGroup);
      const text = JSON.stringify(fixture.buildFusionGroupPayload(group, context.tarotSpread.cards));
      assert.equal(options.attempts, 1); assert.equal(options.fallbackToWorkersAI, false);
      rows.push({ group: group.id, inputChars: prompt.length + options.systemPrompt.length, outputChars: text.length, model: options.model });
      return { ok: true, provider: 'gemini', text, truncated: false };
    };
    const args = { input, context, env: { ENABLE_FUSION_FORTUNE_REAL_LLM: 'true', ALLOW_FUSION_FORTUNE_REAL_LLM: 'true', GEMINIF_API_KEY: 'mock-only', GEMINI_CONTEXT_CACHE: 'false' }, providerCall };
    const first = await implementation.generateFusionFortuneWithRealLLM({ ...args, stage: 1 });
    const second = await implementation.generateFusionFortuneWithRealLLM({ ...args, stage: 2, priorResult: first.result });
    assert.equal(first.deliverable, true); assert.equal(second.deliverable, true);
    assert.ok(rows.length >= 9 && rows.length <= 18);
    metrics.push({ label, providerCalls: rows.length, inputChars: rows.reduce((sum, row) => sum + row.inputChars, 0), outputChars: rows.reduce((sum, row) => sum + row.outputChars, 0), rows });
  }
  assert.deepEqual(metrics[0].rows, metrics[1].rows);
  console.log(JSON.stringify({ mock: true, beforeSha, metrics, usageMeasured: false, billedTokensMeasured: false }, null, 2));
} finally { await unlink(baselinePath); }
