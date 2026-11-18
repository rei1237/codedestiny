import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
import {SAJU_LUCK_JUDGEMENT_RULE} from '../../worker/lib/saju-temperament.js';

// S15-6: a 영냥이 saju chapter carries the shared luck judgement for exactly the periods it selected, and the chapter
// system prompt carries the shared delivery rule whenever that judgement is present. No provider is called.
const Module=createRequire(import.meta.url)('node:module');
const built=await build({stdin:{contents:`export {saju} from './worker/yeongnyangi/fortune/saju'; export {getProduct} from './worker/yeongnyangi/payments/catalog'; export {readingManifest} from './worker/yeongnyangi/fortune/reading-manifest'; export {selectChapterFacts} from './worker/yeongnyangi/fortune/chapter-facts'; export {StructuredChapterProvider} from './worker/yeongnyangi/providers/chapter';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false});
const filename=path.resolve('yeongnyangi-luck-judgement.test.cjs'),loaded=new Module(filename);loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(built.outputFiles[0].text,filename);
const {saju,getProduct,readingManifest,selectChapterFacts,StructuredChapterProvider}=loaded.exports;
// 庚午 己卯 己卯 己巳, 대운 壬午(2017~2026) → 癸未(2027~)
const context=await saju.calculate(saju.validateInput({personA:{birthDate:'1990-03-15',birthTime:'10:30',calendarType:'solar',gender:'male'}}),{asOf:'2026-11-18'});
const chapterOf=(product,key)=>readingManifest(getProduct(product)).find(c=>c.key===key);
const judgement=(product,key)=>selectChapterFacts(context,chapterOf(product,key)).find(f=>f.label==='luckJudgement')?.value;

test('a premium year chapter judges its own year and months, never a period it does not read',()=>{
  const j=judgement('saju_tuna','year');
  assert.equal(j.natal.yongsin.yongsin,'화');
  assert.match(j.natal.yongsin.reason,/\S/);
  assert.deepEqual(j.years.map(y=>y.label),['2026년']);
  assert.ok(j.years[0].verdict&&j.years[0].headline&&j.years[0].reasons.length);
  assert.equal(j.months.length,12);
  for(const m of j.months)assert.deepEqual(Object.keys(m).sort(),['headline','label','verdict']);
  assert.equal(j.daeun,undefined);
  const next=judgement('saju_tuna','next');
  assert.deepEqual(next.daeun.map(d=>d.pillar),['癸未']);
  assert.equal(next.years,undefined);
});

test('below the premium tiers the 용신 element stays out; periods keep only their verdict',()=>{
  const j=judgement('saju_flounder','year');
  assert.equal(j.natal.yongsin,undefined);
  assert.ok(j.natal.climate.summary);
  for(const row of [...j.years,...j.months])assert.deepEqual(Object.keys(row).sort(),['label','verdict']);
  assert.doesNotMatch(JSON.stringify(j),/용신|꼭 필요했던/);
  assert.ok(judgement('saju_mackerel','balance').natal.climate);
  assert.equal(judgement('saju_mackerel','self'),undefined,'a chapter without 용신·조후·운 facts gets no judgement');
});

test('the chapter system prompt carries the shared rule only with the judgement',async()=>{
  const analysis={contexts:{saju:context},signals:[],themes:[]};
  const system=async chapter=>{let sent;await new StructuredChapterProvider({generate:async r=>{sent=r;return {result:{},provider:'mock',model:'fixture'};}})
    .generateChapter({locale:'ko',chapter,analysis,previous:[]}).catch(()=>{});return sent.system;};
  assert.ok((await system(chapterOf('saju_tuna','year'))).includes(SAJU_LUCK_JUDGEMENT_RULE));
  assert.ok(!(await system(chapterOf('saju_tuna','self'))).includes(SAJU_LUCK_JUDGEMENT_RULE));
});
