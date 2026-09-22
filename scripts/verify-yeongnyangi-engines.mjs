import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { SEO_EXAMPLE_BIRTH } from '../lib/seo-reading-examples.js';

// Compile the actual TypeScript adapters without introducing a second test runtime.
const require = createRequire(import.meta.url);
const Module = require('node:module');
const built = await build({
  stdin: { contents: `export {domains} from './worker/yeongnyangi/fortune/index';
    export {products} from './worker/yeongnyangi/payments/catalog';
    export {readingManifest} from './worker/yeongnyangi/fortune/reading-manifest';
    export {analyze} from './worker/yeongnyangi/fortune/analysis';
    export {StructuredChapterProvider,validateChapter} from './worker/yeongnyangi/providers/chapter';
    export {MockChapterProvider} from './__tests__/fixtures/yeongnyangi-chapter';`,
    resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, platform: 'node', format: 'cjs', write: false, loader: {'.wasm':'binary'},
});
const filename = path.resolve('yeongnyangi-engine-verification.cjs');
const loaded = new Module(filename);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(process.cwd());
loaded._compile(built.outputFiles[0].text, filename);
const { domains, products, readingManifest, analyze, StructuredChapterProvider, validateChapter, MockChapterProvider } = loaded.exports;
const contexts={};
const birth = { birthDate: '1997-02-10', birthTime: '14:30', calendarType: 'solar', gender: 'female',
  birthPlace: { latitude: 37.5665, longitude: 126.978, timezone: 'Asia/Seoul' } };
assert.deepEqual(SEO_EXAMPLE_BIRTH, birth);
let checks = 0;
for (const [id, engine] of Object.entries(domains)) {
  const input = engine.validateInput({personA: birth, personB: {...birth, birthDate:'1992-06-12'}, question:'관계와 일을 알고 싶어요.'});
  const context = engine.buildContext(await engine.calculate(input, {asOf:'2026-09-15T00:00:00Z'}));
  contexts[id]=context;
  // Public fictional reading examples must remain tied to the real calculation.
  const fact = label => context.facts.find(item => item.label === label)?.value;
  if (id === 'saju') assert.deepEqual(fact('pillars'), {year:'丁丑',month:'壬寅',day:'癸未',hour:'己未'});
  if (id === 'ziwei') {
    assert.equal(fact('bodyPalace'), '복덕궁');
    assert.deepEqual(fact('palaces').find(p => p.name === '명궁').mainStars, ['천량']);
    assert.equal(fact('palaces').find(p => p.name === '명궁').earthlyBranch, '미');
  }
  if (id === 'sukuyo') assert.equal(fact('personA').nameHan, '婁');
  assert.equal(context.domain, id);
  assert.ok(context.facts.length > 0);
  assert.ok(context.facts.every(f => f.id.startsWith(`${id}.`)));
  const prompt = engine.buildPrompt(input, context, 'mackerel');
  assert.equal(prompt.calculatedData.domain, id);
  const changed = await engine.calculate({...input, personA:{...birth,birthDate:'1985-01-02'}}, {asOf:'2026-09-15T00:00:00Z'});
  if(id==='tarot'){
    assert.equal(input.personA,undefined);
    assert.ok(context.facts.some(f=>f.label==='cards'&&Array.isArray(f.value)&&f.value.length>0));
  } else assert.notDeepEqual(changed.facts, context.facts);
  if (id !== 'tarot') assert.throws(() => engine.validateInput({personA:{...birth,birthDate:'1997-02-30'}}));
  console.log(`PASS ${id}: calculation, domain evidence, prompt, input variation`);
  checks++;
}
assert.equal(products.length, 28);
assert.equal(new Set(products.map(p => p.cdFeatureKey)).size, 28);
for (const product of products) {
  assert.ok(product.priceKRW > 0);
  const manifest = readingManifest(product);
  const analysis=analyze(Object.fromEntries(product.systems.map(id=>[id,contexts[id]])));
  const previous=[];
  assert.equal(manifest.length, product.chapterCount, product.id);
  assert.equal(new Set(manifest.map(c => c.id)).size, manifest.length, product.id);
  for (const chapter of manifest) {
    assert.ok(chapter.systems.every(system => product.systems.includes(system)), product.id);
    assert.ok(chapter.minimumChars > 0, product.id);
    const input={chapter,analysis,previous};
    const fixture=await new MockChapterProvider().generateChapter(input);
    // Uniqueness fixture, not prose-quality evidence. The legacy fixture cycles 12 scenes;
    // a 28-chapter product correctly rejects that cycle as duplicate output.
    if(!chapter.sections)fixture.example=`모의 저장 검사: ${createHash('sha512').update(product.id+chapter.id).digest('hex')}`;
    const adapter=new StructuredChapterProvider({generate:async request=>{
      assert.ok(request.calculatedData.facts.length>0, `${product.id}/${chapter.id} has evidence`);
      assert.ok(request.calculatedData.facts.every(f=>product.systems.includes(f.id.split('.')[0])),product.id);
      assert.ok(request.domainRules.includes(chapter.title),product.id);
      return {result:fixture,provider:'fixture',model:'test-only'};
    }});
    previous.push(validateChapter(await adapter.generateChapter(input),input));
  }
  checks++;
}
const unknown = domains.saju.validateInput({personA:{...birth,birthTime:undefined}});
const unknownChart = await domains.saju.calculate(unknown);
assert.ok(!unknownChart.facts.find(f => f.label === 'majorLuck'));
assert.ok(unknownChart.limitations.some(s => s.includes('미상')));
console.log(`PASS ${checks + 1} engine/product contracts; no paid LLM or PG calls`);
process.exit(0);
