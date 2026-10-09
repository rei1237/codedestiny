import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
import {CHAPTER_DELIVERY_VERSION as version,CHAPTER_TIMEOUT_MS,CHAPTER_LEASE_MS,chapterDeliveryFailure,chapterDeliveryFloor,deliveredCharacterCount} from '../../worker/yeongnyangi/chapter-delivery-contract.js';
import {chapterRecoveryPlan} from '../../worker/yeongnyangi/recovery-plan.js';
const Module=createRequire(import.meta.url)('node:module');
const bundle=await build({stdin:{contents:`export {StructuredChapterProvider} from './worker/yeongnyangi/providers/chapter'; export {deliverChapter} from './worker/yeongnyangi/providers/delivery'; export {mockReadingV5} from './__tests__/fixtures/yeongnyangi-chapter'; export {products} from './worker/yeongnyangi/payments/catalog'; export {consultationKinds,consultationDomain,consultationManifest,supportsKind} from './worker/yeongnyangi/fortune/consultation-kinds';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false});
const filename=path.resolve('chapter-completion.test.cjs'),loaded=new Module(filename);loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(bundle.outputFiles[0].text,filename);
const m=loaded.exports,product=m.products.find(p=>p.id==='saju_tuna'),kind=m.consultationKinds.saju.find(k=>k.id==='timing');
const manifest=m.consultationManifest(product,kind);
const context={domain:'saju',engineVersion:'fixture',calculatedAt:'2026-10-04',limitations:[],facts:[{id:'saju.pillars',label:'pillars',value:{day:'甲子'}},{id:'saju.dayMaster',label:'dayMaster',value:'甲'}]};
const input={deliveryContract:version,chapter:manifest[4],analysis:{contexts:{saju:context},signals:[],themes:[]},previous:[]};
const complete=()=>({...m.mockReadingV5(input,context.facts.map(f=>f.id)),chapterId:input.chapter.id,complete:true});

test('tuna legacy scalar duplication cannot discard complete section content or buy another call',async()=>{
 const example='서로 기대하는 역할을 확인한 뒤 당장 맡을 일과 다음에 의논할 일을 구분해 봅니다. 상대의 답을 기다릴 여유도 남겨 보세요.';
 const raw={...complete(),example,advice:'사용하지 않는 필드',analysis:['이 필드도 blocks와 중복됩니다.']};
 let calls=0;
 const provider=new m.StructuredChapterProvider({generate:async()=>{calls++;return {result:raw,provider:'mock',model:'fixture'};}});
 const withPrevious={...input,previous:[{summary:'앞 장',example,topics:[],analysis:[]}]};
 const delivered=m.deliverChapter(await provider.generateChapter(withPrevious),withPrevious);
 assert.equal(calls,1);assert.equal(delivered.example,'');assert.equal(delivered.advice,'');assert.deepEqual(delivered.analysis,[]);
 assert.deepEqual(delivered.blocks,raw.blocks);assert.equal(chapterDeliveryFailure(delivered,input.chapter),'');
 assert.equal(raw.example,example,'new response normalization is non-mutating');
});

test('completion rejects malformed JSON, wrong identity, missing sections and short/cut content',()=>{
 const raw=complete();
 for(const value of [JSON.stringify(raw).slice(0,-1),{...raw,chapterId:'other'},
   {...raw,blocks:raw.blocks.slice(1)},{...raw,blocks:raw.blocks.map(b=>({...b,paragraphs:['짧은 문장입니다.']}))},
   {...raw,persona:'이하 생략'}])assert.throws(()=>m.deliverChapter(value,input));
 assert.equal(m.deliverChapter(JSON.stringify(raw),input).complete,true);
});

test('server completion recovers a full legacy response without trusting its self-reported flag',()=>{
 for(const marker of [false,undefined]){
  const raw={...complete(),complete:marker},before=JSON.stringify(raw);
  const delivered=m.deliverChapter(JSON.stringify(raw),input);
  assert.equal(delivered.complete,true);assert.equal(delivered.deliveryVersion,version);
  assert.deepEqual(delivered.blocks,raw.blocks);assert.equal(JSON.stringify(raw),before);
  assert.equal(chapterDeliveryFailure(raw,input.chapter),'CHAPTER_INCOMPLETE','stored completion remains strict');
  for(const broken of [{...raw,blocks:raw.blocks.slice(1)},
   {...raw,blocks:raw.blocks.map(b=>({...b,paragraphs:['아직 작성 중입니다.']}))},
   {...raw,persona:'다음 응답에서 계속'}, {...raw,chapterId:'different'}])assert.throws(()=>m.deliverChapter(broken,input));
 }
});

test('every v6 money chapter of all four saju fish tiers is deliverable without a provider completion marker',()=>{
 for(const fish of ['mackerel','salmon','flounder','tuna']){
  const p=m.products.find(p=>p.id==='saju_'+fish),chapters=m.consultationManifest(p,m.consultationKinds.saju.find(k=>k.id==='money'));
  const previous=[];
  for(const chapter of chapters){
   const request={...input,chapter:{...chapter,factSelectors:{saju:context.facts.map(f=>f.label)}},previous};
   const raw={...m.mockReadingV5(request,context.facts.map(f=>f.id)),chapterId:chapter.id};
   const delivered=m.deliverChapter(raw,request);
   assert.equal(delivered.complete,true);assert.equal(chapterDeliveryFailure(delivered,chapter),'');
   previous.push(delivered);
  }
  assert.equal(previous.length,chapters.length);
 }
});

test('delivery length only catches empty or cut-off replies: 75% of the minimum is delivered, 40% is too short',()=>{
 const sized=ratio=>{const body=complete(),per=Math.ceil(input.chapter.minimumChars*ratio/body.blocks.length);
  return {...body,example:'',advice:'',blocks:body.blocks.map((b,i)=>({...b,paragraphs:[`${i}`.padEnd(per,'흐')]}))};};
 const floor=chapterDeliveryFloor(input.chapter),near=sized(.75),short=sized(.4);
 assert.equal(floor,Math.max(120,Math.ceil(input.chapter.minimumChars*.5)));
 assert.ok(deliveredCharacterCount(near)<input.chapter.minimumChars&&deliveredCharacterCount(short)<floor);
 assert.equal(chapterDeliveryFailure(near,input.chapter),'');assert.equal(m.deliverChapter(near,input).complete,true);
 assert.equal(chapterDeliveryFailure(short,input.chapter),'CHAPTER_TOO_SHORT');assert.throws(()=>m.deliverChapter(short,input));
});

test('a disease claim is removed sentence by sentence and the chapter is still delivered',()=>{
 const raw=complete(),claim='내년에는 병에 걸립니다.';
 const delivered=m.deliverChapter({...raw,blocks:raw.blocks.map((b,i)=>i?b:{...b,paragraphs:[`${b.paragraphs[0]} ${claim}`,...b.paragraphs.slice(1)]})},input);
 assert.equal(delivered.complete,true);assert.ok(!JSON.stringify(delivered).includes(claim));
 assert.ok(delivered.blocks[0].paragraphs.join(' ').includes(raw.blocks[0].paragraphs[0].trim().slice(0,20)));
});

test('all 28 catalog products share the explicit one-chapter identity and completion contract',async()=>{
 const seen=new Set();let calls=0;
 for(const p of m.products){
  const selected=m.consultationKinds[m.consultationDomain(p)].find(k=>m.supportsKind(p,k));
  const chapter=m.consultationManifest(p,selected)[0];let sent;
  await new m.StructuredChapterProvider({generate:async request=>{sent=request;calls++;return {result:{},provider:'mock',model:'fixture'};}})
    .generateChapter({...input,chapter,analysis:{contexts:Object.fromEntries(p.systems.map(domain=>[domain,{...context,domain,facts:context.facts.map(f=>({...f,id:f.id.replace('saju.',domain+'.')}))}])),signals:[],themes:[]}});
  assert.deepEqual(sent.sectionTitles,[chapter.title]);
  assert.deepEqual(sent.outputSchema.properties.chapterId.enum,[chapter.id]);
  assert.ok(!sent.outputSchema.required.includes('complete'));
  assert.equal(sent.outputSchema.properties.complete,undefined,'the model writes content; the server decides completion');
  assert.equal(JSON.parse(sent.domainRules).completionContract.chapterId,chapter.id);
  seen.add(p.id);
 }
 assert.equal(seen.size,28);assert.equal(calls,28);
});

test('normal descriptions of continuing luck are not mistaken for a truncated response',()=>{
 const body={...complete(),summary:'현재의 대운에서는 자원을 정리하는 흐름이 계속됩니다.'};
 assert.equal(chapterDeliveryFailure(body,input.chapter),'');
 for(const text of ['계속됩니다.','계속…','다음 응답에서 계속','이하 생략']){
  const interrupted={...body,blocks:body.blocks.map((b,i)=>i?b:{...b,paragraphs:[...b.paragraphs,text]})};
  assert.equal(chapterDeliveryFailure(interrupted,input.chapter),'CHAPTER_INCOMPLETE');
 }
});

test('three major-luck inputs keep the purchased topic chapters and pass only supplied cycle evidence',async()=>{
 for(const [count,direction] of [[8,'forward'],[10,'reverse'],[12,'forward']]){
  const cycles=Array.from({length:count},(_,i)=>({index:i,startAge:3+i*10}));
  const value={available:true,direction,cycles,currentCycle:cycles[2]};
  const ctx={...context,facts:[...context.facts,{id:'saju.majorLuck',label:'majorLuck',value}]};let sent;
  await new m.StructuredChapterProvider({generate:async request=>{sent=request;return {result:{},provider:'mock',model:'fixture'};}})
    .generateChapter({...input,analysis:{...input.analysis,contexts:{saju:ctx}}});
  assert.equal(manifest.length,15,'v6 topic chapters are not one chapter per cycle');
  assert.deepEqual(sent.calculatedData.facts.find(f=>f.label==='majorLuck').value,{direction,currentCycle:cycles[2]});
  assert.deepEqual(sent.sectionTitles,[manifest[4].title]);
 }
 assert.ok(CHAPTER_LEASE_MS>=CHAPTER_TIMEOUT_MS+90000);
});

test('recovery plan preserves legacy delivered content and fails closed on payment, missing input or changed chapters',()=>{
 const body=complete(),row={_id:'order',userId:'owner',state:'FORTUNE_FAILED',productId:'saju_tuna',chapters:[body],chapterAttempts:{0:1,1:3},
  snapshot:{natalInput:{personA:{}},analysis:{contexts:{saju:context}},manifest:[input.chapter,{...input.chapter,id:'missing'}]}};
 const payment={userId:'owner',status:'paid',metadata:{consumedBy:'order'}};
 const before=JSON.stringify(row);
 const plan=chapterRecoveryPlan(row,payment);
 assert.deepEqual(plan.generate,['missing']);assert.equal(plan.expectedFirstCalls,1);assert.equal(plan.manualGrant,1);
 assert.ok(plan.blockers.includes('PAYMENT_COMMIT_MARKER_APPROVAL_REQUIRED'));
 assert.equal(chapterRecoveryPlan(row,payment,{allowPaymentCommitMarkers:true}).ready,true);
 assert.ok(chapterRecoveryPlan(row,{...payment,status:'refunded'}).blockers.includes('PAYMENT_NOT_ACTIVE'));
 assert.ok(chapterRecoveryPlan({...row,snapshot:{...row.snapshot,natalInput:null}},payment).blockers.includes('ORIGINAL_INPUT_MISSING'));
 assert.ok(chapterRecoveryPlan({...row,chapters:[{...body,blocks:[]}]},payment).blockers.includes('SAVED_CHAPTER_REVIEW_REQUIRED'));
 assert.equal(JSON.stringify(row),before);
});
