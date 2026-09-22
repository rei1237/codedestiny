import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const built=await build({stdin:{contents:`export * from './worker/yeongnyangi/fortune/reading-policy'; export {products} from './worker/yeongnyangi/payments/catalog'; export {readingManifest} from './worker/yeongnyangi/fortune/reading-manifest'; export {validateReadingQuality,bodyCharacterCount} from './worker/yeongnyangi/fortune/reading-quality'; export {StructuredChapterProvider,validateChapter} from './worker/yeongnyangi/providers/chapter'; export {MockChapterProvider} from './__tests__/fixtures/yeongnyangi-chapter'; export {analyze} from './worker/yeongnyangi/fortune/analysis'; export {TAROT_CARDS} from './lib/tarot/tarot-cards.mjs'; export {getTarotCardImageUrl} from './src/features/fortune-tea-house/lib/tarotCardImageMap'; export {readingCharts} from './worker/yeongnyangi/fortune/reading-presentation';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'esm',platform:'node',write:false});
const m=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const context={domain:'saju',engineVersion:'fixture',calculatedAt:'2026-09-22',limitations:[],facts:[{id:'saju.pillars',label:'pillars',value:{day:'甲子'}},{id:'saju.dayMaster',label:'dayMaster',value:'甲'}]};
const product=m.products.find(p=>p.id==='saju_tuna');
const chapter=m.readingManifest(product)[0];
const input={chapter,analysis:{contexts:{saju:context},themes:[],signals:[]},previous:[]};
const good=await new m.MockChapterProvider().generateChapter(input);

test('28 products preserve counts and have funded, distinct v5 section quotas',()=>{
 assert.equal(m.products.length,28);
 for(const p of m.products){
  const chapters=m.readingManifest(p),policy=m.v5ReadingPolicies[p.fishId];
  assert.equal(chapters.length,p.chapterCount,p.id);
  assert.ok(chapters.reduce((n,c)=>n+c.minimumChars,0)>=policy.minimum,p.id);
  for(const c of chapters){
   assert.equal(c.version,m.READING_V5_VERSION);
   assert.equal(new Set(c.sections.map(s=>s.id)).size,c.sections.length);
   assert.ok(c.sections.reduce((n,s)=>n+s.minimumChars,0)>=c.minimumChars);
   assert.ok(c.outputTokens>=(c.targetChars[1]+1500)*1.5 && c.outputTokens<=16384);
   if(['tuna','assorted','omakase'].includes(p.fishId))for(const id of ['limits','choice-1','choice-2','checkpoint'])assert.ok(c.sections.some(s=>s.id===id));
  }
 }
});
test('missing, duplicate and underfilled sections fail independently of total length',()=>{
 const absent=structuredClone(good);absent.blocks.pop();assert.throws(()=>m.validateChapter(absent,input),{code:'CHAPTER_DEPTH_INCOMPLETE'});
 const short=structuredClone(good);short.blocks[0].paragraphs=['짧은 설명'];assert.throws(()=>m.validateChapter(short,input),{code:'CHAPTER_SECTION_TOO_SHORT'});
 const duplicate=structuredClone(good);duplicate.blocks[1].id=duplicate.blocks[0].id;assert.throws(()=>m.validateChapter(duplicate,input),{code:'CHAPTER_DEPTH_INCOMPLETE'});
 const long=structuredClone(good);long.blocks[0].paragraphs[0]='가'.repeat(501);assert.throws(()=>m.validateChapter(long,input),{code:'INVALID_CHAPTER_BLOCKS'});
});
test('unprovided evidence, repeated passages and invented dates fail',()=>{
 const forged=structuredClone(good);forged.blocks[0].sources=['saju.fake'];assert.throws(()=>m.validateChapter(forged,input),{code:'INVALID_EVIDENCE'});
 const repeated=structuredClone(good);repeated.blocks[0].paragraphs.push(repeated.blocks[0].paragraphs[0]);assert.throws(()=>m.validateChapter(repeated,input),{code:'DUPLICATE_CHAPTER'});
 const date=structuredClone(good);date.blocks[0].paragraphs.push('2037년 4월 12일 반드시 일이 일어납니다.');assert.throws(()=>m.validateChapter(date,{...input,analysis:{...input.analysis,consultation:{questions:[],asOf:'2026-09-22',timezone:'Asia/Seoul'}}}),{code:'UNSUPPORTED_PRECISE_TIMING'});
 assert.equal(m.bodyCharacterCount({...good,summary:'제목'.repeat(10000)}),m.bodyCharacterCount(good));
});
test('v4 manifests keep old quotas and provider schema on resume',async()=>{
 const old=m.readingManifest(product,'general','personal',m.READING_VERSION)[0];
 assert.equal(old.sections,undefined);assert.ok(old.minimumChars<chapter.minimumChars);
 const previousInput={...input,chapter:old};
 const fixture=await new m.MockChapterProvider().generateChapter(previousInput);
 let request;
 await new m.StructuredChapterProvider({generate:async r=>{request=r;return {result:fixture,provider:'mock',model:'test'};}}).generateChapter(previousInput);
 assert.equal(request.promptVersion,'chapter-v4');assert.equal(request.outputSchema.properties.blocks.items.properties.id,undefined);
 assert.doesNotThrow(()=>m.validateChapter(fixture,previousInput));
});
test('new provider schema requires section identity, sources and sufficient output budget',async()=>{
 let request;
 await new m.StructuredChapterProvider({generate:async r=>{request=r;return {result:good,provider:'mock',model:'test'};}}).generateChapter(input);
 assert.equal(request.promptVersion,'chapter-v5');assert.ok(request.outputSchema.properties.blocks.items.required.includes('sources'));
 assert.ok(request.maxOutputTokens>=chapter.outputTokens);
 let calls=0;
 await assert.rejects(new m.StructuredChapterProvider({generate:async()=>{calls++;}}).generateChapter({...input,chapter:{...chapter,targetChars:[20000,30000]}}),{code:'CHAPTER_OUTPUT_BUDGET_EXCEEDED'});
 assert.equal(calls,0);
});
test('canonical ziwei spouse and peers palaces contribute signals',()=>{
 const c={...context,domain:'ziwei',facts:[{id:'ziwei.palaces',label:'palaces',value:[{name:'부부궁',assistantStars:['문창']},{name:'노복궁',maleficStars:['화성']}]}]};
 const result=m.analyze({ziwei:c});assert.ok(result.signals.some(s=>s.theme==='love'));assert.ok(result.signals.some(s=>s.theme==='relations'));
});
test('presentation excludes raw birth data and does not recalculate missing legacy charts',()=>{
 const privateContext={...context,facts:[...context.facts,{id:'saju.private',label:'birthDate',value:'1991-02-03'},{id:'saju.prompt',label:'summaryForPrompt',value:'SECRET_PROMPT'}]};
 const charts=m.readingCharts({...input.analysis,contexts:{saju:privateContext}},[chapter]);
 assert.ok(!JSON.stringify(charts).includes('1991-02-03'));assert.ok(!JSON.stringify(charts).includes('SECRET_PROMPT'));
 assert.deepEqual(m.readingCharts({contexts:{}},[]),[]);
});

test('all 78 saved tarot cards reuse the Tea House images without changing order or orientation',()=>{
 const cards=m.TAROT_CARDS.map((card,i)=>({...card,cardId:card.code,orientation:i%2?'reversed':'upright',imageUrl:'/old-deck.jpg'}));
 const context={domain:'tarot',facts:[{id:'tarot.cards',label:'cards',value:cards}],limitations:[]};
 const result=m.readingCharts({contexts:{tarot:context}},[])[0].groups;
 assert.equal(result.length,78);
 const images=new Set();
 for(let i=0;i<78;i++){
  assert.equal(result[i].image,m.getTarotCardImageUrl(cards[i]));
  assert.ok(result[i].image.includes('/DestinyCafe/caretaro/'));
  assert.equal(result[i].reversed,i%2===1);
  images.add(result[i].image);
 }
 assert.equal(images.size,78);
});
