import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import {build} from 'esbuild';
// Design §6-6: the wiring that makes v7 reachable. consultation-kinds branches on v7Applies, chapter-facts
// routes a v7 chapter to the ledger, chapter.ts spreads the chapter-v7 prompt and moves the evidence rule
// onto the insight blocks. Tarot v2 owns new tarot purchases before the older v7 selector.
const Module=createRequire(import.meta.url)('node:module');
const built=await build({stdin:{contents:`export {conciseReadingManifest,CONCISE_READING_VERSION} from './worker/yeongnyangi/fortune/concise-reading'; export {chapterOutputTokenBudget} from './worker/yeongnyangi/providers/code-destiny'; export {consultationManifest,consultationKinds} from './worker/yeongnyangi/fortune/consultation-kinds'; export {v7Applies,readingManifestV7,READING_V7_ENABLED} from './worker/yeongnyangi/fortune/reading-v7'; export {READING_V6_VERSION,READING_V7_VERSION} from './worker/yeongnyangi/fortune/reading-policy'; export {selectChapterFacts} from './worker/yeongnyangi/fortune/chapter-facts'; export {resolveV7Ledger,selectV7Facts} from './worker/yeongnyangi/fortune/reading-v7-ledger'; export {buildV7TimingMatrix,withV7Timing,v7TimingSummaries} from './worker/yeongnyangi/fortune/reading-v7-timing'; export {buildV7ChapterPrompt} from './worker/yeongnyangi/fortune/reading-v7-prompt'; export {StructuredChapterProvider,validateChapter} from './worker/yeongnyangi/providers/chapter'; export {MockChapterProvider} from './__tests__/fixtures/yeongnyangi-chapter'; export {products} from './worker/yeongnyangi/payments/catalog'; export {domains} from './worker/yeongnyangi/fortune/index';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'}});
const filename=path.resolve('yeongnyangi-reading-v7-wiring.test.cjs');
const loaded=new Module(filename);
loaded.filename=filename;
loaded.paths=Module._nodeModulePaths(process.cwd());
loaded._compile(built.outputFiles[0].text,filename);
const m=loaded.exports;

const V7_KINDS={saju:['personal','ask'],ziwei:['personal','ask'],vedic:['personal','ask'],astrology:['personal','ask'],sukuyo:['personal','ask'],tarot:['choice','love']};
const singles=m.products.filter(p=>p.readingKind==='single');
const productOf=(domain,tier)=>singles.find(p=>p.domain===domain&&p.fishId===tier);
const manifest=(domain,tier,kind='personal')=>m.readingManifestV7(productOf(domain,tier),{id:kind});

const asOf='2026-09-15T00:00:00Z',today='2026-09-15';
const birth={birthDate:'1997-02-10',birthTime:'14:30',calendarType:'solar',gender:'female',birthPlace:{latitude:37.5665,longitude:126.978,timezone:'Asia/Seoul'}};
const engine=m.domains.saju;
const sajuInput=engine.validateInput({personA:birth,question:'올해 일과 사람 사이에서 무엇을 먼저 정해야 할까요?',readingMode:'personal'});
const base=engine.buildContext(await engine.calculate(sajuInput,{asOf}));
// prepare() stores the matrix once and re-applies it on every read; the test rebuilds the same stored context.
const sajuContext=m.withV7Timing(base,await m.buildV7TimingMatrix(base,sajuInput,today));
const resolved=Object.fromEntries(['salmon','flounder','tuna'].map(tier=>[tier,m.v7TimingSummaries(m.resolveV7Ledger(manifest('saju',tier),sajuContext))]));
const requestFor=chapter=>({locale:'ko',chapter,analysis:{contexts:{saju:sajuContext},themes:[],signals:[]},previous:[]});

test('flag ON: only eligible single-system kinds use v7; legacy and fusion stay unchanged',()=>{
 assert.equal(m.READING_V7_ENABLED,true);
 for(const p of singles)for(const kind of m.consultationKinds[p.domain]||[]){
  const where=`${p.id}/${kind.id}`;
  const expected=p.manifestVersion===m.READING_V6_VERSION&&['salmon','flounder','tuna'].includes(p.fishId)&&(V7_KINDS[p.domain]||[]).includes(kind.id);
  assert.equal(m.v7Applies(p,kind),expected,where);
  assert.equal(m.v7Applies(p,kind,false),false,`${where} rollback`);
  const selectedV7=expected&&p.domain!=='tarot';
  assert.equal(m.consultationManifest(p,kind).every(c=>c.version===m.READING_V7_VERSION),selectedV7,where);
 }
 assert.equal(m.v7Applies(productOf('saju','flounder'),undefined),false);
 for(const p of m.products.filter(p=>p.readingKind!=='single'))assert.equal(m.v7Applies(p,{id:'personal'}),false);
});

test('selectChapterFacts routes a v7 chapter to the ledger instead of the v6 selectors',()=>{
 const seen=[];
 for(const [tier,chapters] of Object.entries(resolved))for(const chapter of chapters){
  const where=`${tier}/${chapter.key}`;
  const ids=m.selectChapterFacts(sajuContext,chapter).map(f=>f.id);
  assert.deepEqual(ids,m.selectV7Facts(sajuContext,chapter).map(f=>f.id),where);
  assert.ok(ids.length,where);
  assert.ok(ids.every(id=>[...chapter.owns,...chapter.refs].includes(id)),where);
  seen.push(...ids);
 }
 // Ledger ids carry sub-levels ('saju.pillars.day'); the v6 selector path can only return whole context facts.
 assert.ok(!sajuContext.facts.some(f=>f.id.split('.').length>2));
 assert.ok(seen.some(id=>id.split('.').length>2));
 // A v6 chapter on the same context still takes the selector path.
 const v6=m.consultationManifest(productOf('saju','flounder'),undefined)[1];
 const v6Ids=m.selectChapterFacts(sajuContext,v6).map(f=>f.id);
 assert.ok(v6Ids.length&&v6Ids.every(id=>sajuContext.facts.some(f=>f.id===id)));
});

test('the provider sends the chapter-v7 prompt and budget while v6 chapters are untouched',async()=>{
 const chapter=resolved.flounder[1];
 const fixture=await new m.MockChapterProvider().generateChapter(requestFor(chapter));
 let request;
 await new m.StructuredChapterProvider({generate:async r=>{request=r;return {result:fixture,provider:'mock',model:'test'};}}).generateChapter(requestFor(chapter));
 assert.equal(request.promptVersion,'chapter-v7');
 const rules=JSON.parse(request.domainRules);
 assert.deepEqual(rules.factOwnership.owns,chapter.owns);
 assert.deepEqual(rules.factOwnership.references,chapter.refs);
 assert.deepEqual(rules.excludedSubjects,chapter.mustNotCover);
 assert.equal(rules.insightUnits,chapter.minInsightUnits);
 assert.ok(rules.blockContract&&rules.timingScope);
 const blocks=request.outputSchema.properties.blocks;
 assert.equal(blocks.minItems,chapter.sections.length);
 assert.deepEqual(blocks.items.properties.id.enum,chapter.sections.map(s=>s.id));
 // The schema enum is cut from the same list CALCULATED_DATA carries, so a cited id is always resolvable.
 const enumerated=blocks.items.properties.sources.items.enum;
 const ledgerIds=new Set(m.selectV7Facts(sajuContext,chapter).map(f=>f.id));
 assert.ok(enumerated.length&&enumerated.every(id=>ledgerIds.has(id)));
 assert.equal(request.maxOutputTokens,m.buildV7ChapterPrompt({chapter,facts:[],previous:[]}).maxOutputTokens);

 const v6=m.consultationManifest(productOf('saju','flounder'),undefined)[1];
 const v6Fixture=await new m.MockChapterProvider().generateChapter(requestFor(v6));
 let v6Request;
 await new m.StructuredChapterProvider({generate:async r=>{v6Request=r;return {result:v6Fixture,provider:'mock',model:'test'};}}).generateChapter(requestFor(v6));
 assert.equal(v6Request.promptVersion,'chapter-v6');
 assert.equal(JSON.parse(v6Request.domainRules).factOwnership,undefined);
});

test('the evidence requirement moves onto the insight blocks: no evidence section, still fail-closed',async()=>{
 const chapter=resolved.flounder[1];
 const input=requestFor(chapter);
 const body=await new m.MockChapterProvider().generateChapter(input);
 // v7 has no fixed 'evidence' block, so the v6 rule would have rejected this body outright.
 assert.ok(!body.blocks.some(b=>b.id==='evidence'));
 assert.doesNotThrow(()=>m.validateChapter(body,input));
 const single=body.sources[0];
 const thin={...body,sources:[single],blocks:body.blocks.map(b=>({...b,sources:[single]}))};
 assert.ok(m.selectChapterFacts(sajuContext,chapter).length>1);
 assert.throws(()=>m.validateChapter(thin,input),{code:'CHAPTER_EVIDENCE_INCOMPLETE'});
});


test('only a newly prepared concise manifest selects reduced budgets and the focused reading prompt',async()=>{
 for(const old of [resolved.flounder[1],m.consultationManifest(productOf('saju','mackerel'),undefined)[1]]){
  const chapter=m.conciseReadingManifest([old])[0];
  let request;
  const fixture=await new m.MockChapterProvider().generateChapter(requestFor(chapter));
  await new m.StructuredChapterProvider({generate:async r=>{request=r;return {result:fixture,provider:'mock',model:'test'};}}).generateChapter(requestFor(chapter));
  const rules=JSON.parse(request.domainRules);
  assert.equal(request.outputBudgetVersion,m.CONCISE_READING_VERSION);
  assert.ok(request.promptVersion.endsWith('-concise-20260930'));
  assert.deepEqual(rules.lengthContract.target,chapter.targetChars);
  assert.equal(request.maxOutputTokens,chapter.outputTokens);
  assert.ok(m.chapterOutputTokenBudget(request.maxOutputTokens,request.outputBudgetVersion)<m.chapterOutputTokenBudget(8192));
  assert.deepEqual(request.outputSchema.properties.blocks.items.properties.id.enum,chapter.sections.map(s=>s.id));
  assert.deepEqual(chapter.factIds,old.factIds);
  assert.deepEqual(chapter.owns,old.owns);
 }
});

test('new readings distinguish four reasoning depths without adding tokens or changing owned facts',async()=>{
 const approaches=new Set();
 for(const tier of ['mackerel','salmon','flounder','tuna']){
  const old=tier==='mackerel'?m.consultationManifest(productOf('saju',tier),undefined)[1]:resolved[tier][1];
  const chapter=m.conciseReadingManifest([old])[0];
  const fixture=await new m.MockChapterProvider().generateChapter(requestFor(chapter));
  let request;
  await new m.StructuredChapterProvider({generate:async r=>{request=r;return {result:fixture,provider:'mock',model:'test'};}}).generateChapter(requestFor(chapter));
  const depth=JSON.parse(request.domainRules).conciseReading.tierDepth;
  assert.equal(depth.tier,tier);
  approaches.add(depth.approach);
  assert.equal(request.maxOutputTokens,chapter.outputTokens);
  assert.deepEqual(chapter.owns,old.owns);
  assert.deepEqual(chapter.factIds,old.factIds);
  assert.deepEqual(request.outputSchema.properties.blocks.items.properties.id.enum,old.sections.map(s=>s.id));
 }
 assert.equal(approaches.size,4);
});
