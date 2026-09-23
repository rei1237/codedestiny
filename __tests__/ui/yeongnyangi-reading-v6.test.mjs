import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const built=await build({stdin:{contents:`export * from './worker/yeongnyangi/fortune/reading-policy'; export {products} from './worker/yeongnyangi/payments/catalog'; export {readingManifest} from './worker/yeongnyangi/fortune/reading-manifest'; export * from './worker/yeongnyangi/fortune/consultation-kinds'; export {selectChapterFacts} from './worker/yeongnyangi/fortune/chapter-facts'; export {StructuredChapterProvider,validateChapter} from './worker/yeongnyangi/providers/chapter'; export {MockChapterProvider} from './__tests__/fixtures/yeongnyangi-chapter';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
const m=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const counts={mackerel:5,salmon:8,flounder:11,tuna:15};
const minimums={mackerel:5000,salmon:10000,flounder:18000,tuna:40000};
const singles=m.products.filter(p=>p.readingKind==='single');
const context={domain:'saju',engineVersion:'fixture',calculatedAt:'2026-09-23',limitations:[],facts:[{id:'saju.pillars',label:'pillars',value:{day:'甲子'}},{id:'saju.dayMaster',label:'dayMaster',value:'甲'}]};
const product=singles.find(p=>p.id==='saju_tuna');
const chapter=m.readingManifest(product)[0];
const input={chapter,analysis:{contexts:{saju:context},themes:[],signals:[]},previous:[]};
const good=await new m.MockChapterProvider().generateChapter(input);

test('24 single products and every offered consultation have complete tier-specific v6 contracts',()=>{
 assert.equal(singles.length,24);
 for(const p of singles)for(const k of m.consultationKinds[p.domain]){
  if(!m.supportsKind(p,k))continue;
  const rows=m.consultationManifest(p,k),tag=`${p.id}/${k.id}`;
  assert.equal(p.manifestVersion,m.READING_V6_VERSION,tag);
  assert.equal(p.chapterCount,counts[p.fishId],tag);
  assert.equal(rows.length,counts[p.fishId],tag);
  assert.equal(new Set(rows.map(r=>r.key)).size,rows.length,tag);
  assert.equal(new Set(rows.map(r=>r.title)).size,rows.length,tag);
  assert.equal(rows.at(-1).key,'action',tag);
  assert.ok(rows.reduce((n,c)=>n+c.minimumChars,0)>=minimums[p.fishId],tag);
  for(const c of rows){
   assert.ok(c.title&&c.focus&&c.factSelectors[p.domain].length,tag);
   assert.equal(c.version,m.READING_V6_VERSION);
   assert.ok(c.sections.reduce((n,s)=>n+s.minimumChars,0)>=c.minimumChars);
   assert.ok(c.outputTokens<=16384,tag);
   assert.deepEqual(c.systems,[p.domain]);
  }
 }
});
test('fusion retains v5 counts and quotas; explicit legacy versions cannot inherit current single counts',()=>{
 for(const p of m.products.filter(p=>p.readingKind!=='single')){
  assert.equal(p.manifestVersion,m.READING_V5_VERSION);
  assert.equal(m.readingManifest(p).length,p.fishId==='assorted'?18:28);
  assert.equal(m.policyForReading(p.fishId,p.manifestVersion).minimum,p.fishId==='assorted'?48000:80000);
 }
 for(const p of singles)for(const version of [m.READING_VERSION,m.READING_V5_VERSION]){
  const rows=m.readingManifest(p,'general','personal',version);
  assert.equal(rows.length,m.readingChapterCount(p.domain,p.fishId,version));
  assert.ok(rows.every(c=>c.version===version));
  assert.ok(rows.reduce((n,c)=>n+c.minimumChars,0)<minimums[p.fishId]);
 }
});
test('personal Sukuyo excludes all partner fields; paired Sukuyo owns both directional distances',()=>{
 const p=singles.find(p=>p.id==='sukuyo_tuna');
 for(const row of m.readingManifest(p))assert.deepEqual(row.factSelectors.sukuyo,['personA']);
 for(const id of ['compatibility','relationship'])for(const row of m.consultationManifest(p,m.consultationKinds.sukuyo.find(k=>k.id===id))){
  for(const field of ['personB','relation','forwardDistance','reverseDistance'])assert.ok(row.factSelectors.sukuyo.includes(field));
 }
});
test('tarot choice and love use the card-specific 15 questions without invented new draws',()=>{
 const p=singles.find(p=>p.id==='tarot_tuna');
 for(const kind of m.consultationKinds.tarot){
  const rows=m.consultationManifest(p,kind);
  for(const key of ['positions','flow','choiceA','choiceB','observation','revision'])assert.ok(rows.some(c=>c.key===key));
  assert.ok(rows.every(c=>c.factSelectors.tarot.includes('cards')));
 }
});
test('non-premium scopes exclude specialist data even in action and question chapters',()=>{
 const premium={...context,facts:[...context.facts,...['usefulGod','majorLuck','jong'].map(label=>({id:`saju.${label}`,label,value:{test:true}}))]};
 for(const p of singles.filter(p=>p.domain==='saju'&&p.fishId!=='tuna'))for(const c of m.readingManifest(p)){
  assert.ok(!m.selectChapterFacts(premium,c).some(f=>/usefulGod|majorLuck|jong/.test(f.label)));
 }
});
test('v6 provider uses section schema and adequate budget; old v4/v5 schemas remain versioned',async()=>{
 for(const version of [m.READING_VERSION,m.READING_V5_VERSION,m.READING_V6_VERSION]){
  const c=m.readingManifest(product,'general','personal',version)[0],requestInput={...input,chapter:c};
  const fixture=await new m.MockChapterProvider().generateChapter(requestInput);
  let request;
  await new m.StructuredChapterProvider({generate:async r=>{request=r;return {result:fixture,provider:'mock',model:'test'};}}).generateChapter(requestInput);
  assert.equal(request.promptVersion,version.replace('destiny-book','chapter'));
  assert.ok(request.maxOutputTokens>=c.outputTokens);
  assert.equal(Boolean(request.outputSchema.properties.blocks.items.properties.id),version!==m.READING_VERSION);
  assert.doesNotThrow(()=>m.validateChapter(fixture,requestInput));
 }
});
test('timing preparations receive next periods rather than repeating only the current period',()=>{
 const timing=m.consultationKinds.saju.find(k=>k.id==='timing');
 const rows=m.consultationManifest(product,timing);
 const timingContext={...context,facts:[...context.facts,{id:'saju.majorLuck',label:'majorLuck',value:{currentCycle:{index:3},cycles:[{index:2},{index:3},{index:4},{index:5}]}}]};
 for(const key of ['next','preparation','alternatives','limits']){
  const fact=m.selectChapterFacts(timingContext,rows.find(c=>c.key===key)).find(f=>f.label==='majorLuck');
  assert.deepEqual(fact.value.cycles,[{index:4}]);
 }
 const vedic=singles.find(p=>p.id==='vedic_tuna');
 for(const key of ['next','preparation'])assert.ok(m.consultationManifest(vedic,m.consultationKinds.vedic.find(k=>k.id==='timing')).find(c=>c.key===key).factSelectors.vedic.includes('vimshottariDasha.periods'));
});
test('v6 rejects missing depth, false evidence, duplicated prose and unsupported claims',()=>{
 const absent=structuredClone(good);absent.blocks.pop();assert.throws(()=>m.validateChapter(absent,input),{code:'CHAPTER_DEPTH_INCOMPLETE'});
 const short=structuredClone(good);short.blocks[0].paragraphs=['짧은 설명'];assert.throws(()=>m.validateChapter(short,input),{code:'CHAPTER_SECTION_TOO_SHORT'});
 const forged=structuredClone(good);forged.blocks[0].sources=['saju.fake'];assert.throws(()=>m.validateChapter(forged,input),{code:'INVALID_EVIDENCE'});
 assert.throws(()=>m.validateChapter(good,{...input,previous:[good]}),{code:'DUPLICATE_CHAPTER'});
 const claim=structuredClone(good);claim.blocks[0].paragraphs.push('반드시 재회합니다.');assert.throws(()=>m.validateChapter(claim,input),{code:'UNSUPPORTED_READING_CLAIM'});
});
