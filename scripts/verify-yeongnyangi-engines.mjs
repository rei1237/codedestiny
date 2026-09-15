import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { build } from 'esbuild';

// Compile the actual TypeScript adapters without introducing a second test runtime.
const require = createRequire(import.meta.url);
const Module = require('node:module');
const built = await build({
  stdin: { contents: `export {domains} from './worker/yeongnyangi/fortune/index';
    export {products} from './worker/yeongnyangi/payments/catalog';
    export {readingManifest} from './worker/yeongnyangi/fortune/reading-manifest';`,
    resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, platform: 'node', format: 'cjs', write: false, loader: {'.wasm':'binary'},
});
const filename = path.resolve('yeongnyangi-engine-verification.cjs');
const loaded = new Module(filename);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(process.cwd());
loaded._compile(built.outputFiles[0].text, filename);
const { domains, products, readingManifest } = loaded.exports;
const birth = { birthDate: '1997-02-10', birthTime: '14:30', calendarType: 'solar', gender: 'female',
  birthPlace: { latitude: 37.5665, longitude: 126.978, timezone: 'Asia/Seoul' } };
let checks = 0;
for (const [id, engine] of Object.entries(domains)) {
  const input = engine.validateInput({personA: birth, personB: {...birth, birthDate:'1992-06-12'}, question:'관계와 일을 알고 싶어요.'});
  const context = engine.buildContext(await engine.calculate(input, {AS_OF:'2026-09-15T00:00:00Z'}));
  assert.equal(context.domain, id);
  assert.ok(context.facts.length > 0);
  assert.ok(context.facts.every(f => f.id.startsWith(`${id}.`)));
  const prompt = engine.buildPrompt(input, context, 'mackerel');
  assert.equal(prompt.calculatedData.domain, id);
  const changed = await engine.calculate({...input, personA:{...birth,birthDate:'1985-01-02'}}, {AS_OF:'2026-09-15T00:00:00Z'});
  assert.notDeepEqual(changed.facts, context.facts);
  if (id !== 'tarot') assert.throws(() => engine.validateInput({personA:{...birth,birthDate:'1997-02-30'}}));
  console.log(`PASS ${id}: calculation, domain evidence, prompt, input variation`);
  checks++;
}
assert.equal(products.length, 28);
assert.equal(new Set(products.map(p => p.cdFeatureKey)).size, 28);
for (const product of products) {
  assert.ok(product.priceKRW > 0);
  const manifest = readingManifest(product);
  assert.equal(manifest.length, product.chapterCount, product.id);
  assert.equal(new Set(manifest.map(c => c.id)).size, manifest.length, product.id);
  for (const chapter of manifest) {
    assert.ok(chapter.systems.every(system => product.systems.includes(system)), product.id);
    assert.ok(chapter.minimumChars > 0, product.id);
  }
  checks++;
}
const unknown = domains.saju.validateInput({personA:{...birth,birthTime:undefined}});
const unknownChart = await domains.saju.calculate(unknown);
assert.ok(!unknownChart.facts.find(f => f.label === 'majorLuck'));
assert.ok(unknownChart.limitations.some(s => s.includes('미상')));
console.log(`PASS ${checks + 1} engine/product contracts; no paid LLM or PG calls`);
process.exit(0);
