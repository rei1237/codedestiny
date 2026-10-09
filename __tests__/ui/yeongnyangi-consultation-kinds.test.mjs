import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),Module=require('node:module');
globalThis.__kindTest={rows:new Map(),calls:0};
const replacements={
  'worker/lib/models.js':`export const CmsEntry={find:()=>({limit:()=>({lean:async()=>[]})})};export const ProfileCard={findOne:filter=>({lean:async()=>globalThis.__kindTest.profileOverride?globalThis.__kindTest.profileOverride(filter):({updatedAt:null,birth:filter.profileId==='jong'?{year:1975,month:1,day:22,hour:14,minute:0,timeUnknown:false,calType:'solar'}:{year:filter.profileId==='partner'?1994:1997,month:2,day:10,hour:12,minute:0,timeUnknown:false,calType:'solar'},gender:'F',location:{label:'서울',lat:37.5665,lng:126.978,tz:'Asia/Seoul'}})})};`,
  'worker/lib/db.js':`export const connectDb=async()=>{};export const withMongoRetry=async(e,fn)=>fn();`,
  'worker/yeongnyangi/repository.js':`export const commitTarotDraw=async()=>{throw new Error('unexpected tarot draw');};export const reserveQuestionSkyFollowup=async()=>{throw new Error('unexpected followup in this fixture');};export const allowedChapterAttempts=(r,n)=>3+Number(r?.manualRecoveryGrants?.[n]||0)+Number(r?.systemRecoveryGrants?.[n]||0);export const holdAutoResumes=()=>false;export const userCanRetry=()=>false;export const saveChapterDraft=async()=>{};export const saveAskAnalysis=async()=>{throw new Error("unexpected analysis checkpoint")};export const ownerId=x=>x;export const createRequest=async(e,u,id,v)=>{const m=globalThis.__kindTest.rows;if(!m.has(id))m.set(id,{...v,_id:id,userId:u,state:'CREATED',chapters:[]});return m.get(id)};export const readRequest=async(e,u,id)=>{if(globalThis.__kindTest.readError)throw Object.assign(new Error('database unavailable'),{code:'RESULT_STORAGE_UNAVAILABLE'});const row=globalThis.__kindTest.rows.get(id);if(!row)throw Object.assign(new Error('not found'),{code:'FORTUNE_NOT_FOUND'});return row;};export const attachPayment=async()=>{};export const claimChapter=async()=>({row:globalThis.__kindTest.claim,token:'lease'});export const finishChapter=async()=>{};export const failChapter=async()=>{};`,
  'worker/yeongnyangi/queue.js':`export const enqueueConsultation=async()=>{};`,
  'worker/yeongnyangi/providers/code-destiny':`export class CodeDestinyProvider{async generate(){globalThis.__kindTest.calls++;throw new Error('UNEXPECTED_PROVIDER_CALL')}}`,
};
const bundle=await build({stdin:{contents:"export * from './worker/yeongnyangi/service'; export * from './worker/yeongnyangi/fortune/relationship-calculation'; export {validateInput} from './worker/yeongnyangi/fortune/shared/input'; export * from './worker/yeongnyangi/fortune/consultation-kinds'; export {readingLocales} from './worker/yeongnyangi/fortune/reading-locale'; export {products} from './worker/yeongnyangi/payments/catalog'; export {selectChapterFacts} from './worker/yeongnyangi/fortune/chapter-facts'; export {MockChapterProvider} from './__tests__/fixtures/yeongnyangi-chapter'; export {StructuredChapterProvider,validateChapter} from './worker/yeongnyangi/providers/chapter';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'},plugins:[{name:'mock-boundaries',setup(b){b.onLoad({filter:/worker[\\/](?:lib|yeongnyangi)[\\/]/},args=>{const key=Object.keys(replacements).find(k=>args.path.replaceAll('\\','/').endsWith(k)||args.path.replaceAll('\\','/').endsWith(k+'.ts'));return key?{contents:replacements[key],loader:'ts'}:undefined;});}}]});
const loaded=new Module(path.resolve('spirit-service-tests.cjs'));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(bundle.outputFiles[0].text,loaded.id);
const {prepareFortune,presentFortune,generateNextChapter,jongCheckFortune}=loaded.exports;

const {consultationKinds,consultationDomain,consultationManifest,supportsKind,resolveConsultationKind,products,selectChapterFacts}=loaded.exports;
const env={GEMINIF_API_KEY:'mock-never-sent',LLM_DRY_RUN:'false'};
const body={productId:'saju_mackerel',profileId:'self',timezone:'Asia/Seoul',topicId:'general'};

test('new tuna timing and ask purchases deliver every stored cycle with private purpose metadata',async()=>{
 for(const kind of ['timing','ask']){
  const row=await prepareFortune(env,'purpose-'+kind,{...body,productId:'saju_tuna',consultationKind:kind,
   ...(kind==='ask'?{question:'과거부터 미래까지 대운 전체를 설명해줘?\n올해 연애운은?'}:{})});
  const {analysis,manifest,product}=row.snapshot;
  const major=analysis.contexts.saju.facts.find(f=>f.label==='majorLuck').value;
  assert.equal(analysis.consultation.counselVersion,'purpose-counsel-v1');
  assert.equal(manifest.length,product.chapterCount);
  assert.deepEqual(manifest.flatMap(c=>c.counsel?.cycleIndexes||[]),major.cycles.map(c=>c.index));
  for(const chapter of manifest.filter(c=>c.counsel?.cycleIndexes)){
   let sent;await new loaded.exports.StructuredChapterProvider({generate:async r=>{sent=r;return {result:{},provider:'mock',model:'fixture'};}}).generateChapter({locale:'ko',chapter,analysis,previous:[]});
   const facts=sent.calculatedData.facts.filter(f=>f.label==='majorLuck');
   const actual=facts.flatMap(f=>f.value.cycles||[f.value.cycle]);
   assert.deepEqual(actual.map(c=>c.index),chapter.counsel.cycleIndexes);
   assert.ok(actual.every(c=>c.interpretation?.version==='saju-cycle-evidence-v1'));
   assert.ok(JSON.parse(sent.domainRules).counselPurpose.writing);
  }
  const visible=presentFortune(row);
  assert.equal(visible.consultation.counselVersion,undefined);
  assert.ok(visible.manifest.every(c=>c.counsel===undefined));
  if(kind==='ask')assert.equal(row.generationCheckpoint.evidence.timing.filter(t=>t.label.startsWith('majorLuck.')).length,major.cycles.length);
 }
 assert.equal(globalThis.__kindTest.calls,0);
});
const relationRequest=(domain,kind='compatibility')=>({...body,productId:domain+'_mackerel',consultationKind:kind,question:'우리 관계에서 조율할 점은 무엇인가요?',...(kind==='compatibility'&&domain!=='tarot'?{partnerProfileId:'partner'}:{}),...(domain==='tarot'?{participants:{self:'나비',partner:'별'}}:{})});
test('relationship modes generate all chapters from saved facts without paid calls',async()=>{
 for(const [domain,kind] of [['ziwei','love'],['ziwei','marriage'],['ziwei','compatibility'],['vedic','compatibility'],['astrology','compatibility'],['tarot','compatibility']]){
  const row=await prepareFortune(env,'relation-owner',relationRequest(domain,kind));
  assert.equal(row.snapshot.product.manifestVersion,'destiny-book-v6');
  assert.equal(row.snapshot.manifest.length,5);
  const facts=Object.fromEntries(row.snapshot.analysis.contexts[domain].facts.map(f=>[f.label,f.value]));
  if(domain==='tarot'){
   assert.equal(facts.spreadId,'yeongnyangi_compatibility_six');assert.equal(facts.cards.length,6);
   assert.equal(new Set(facts.cards.map(c=>c.cardId)).size,6);
   assert.equal(facts.cards[0].positionKey,'self_heart');assert.equal(facts.cards[1].positionKey,'other_heart');
  }else{
   assert.ok(facts.relationshipBasis.self);
   if(kind==='compatibility'){assert.ok(facts.relationshipBasis.partner);assert.ok(facts.relationshipComparison);}
   for(const chapter of row.snapshot.manifest)assert.ok(selectChapterFacts(row.snapshot.analysis.contexts[domain],chapter).some(f=>f.label==='relationshipBasis'));
  }
  if(domain==='ziwei'){
   assert.ok(facts.relationshipBasis.self.romance.every(s=>Number.isInteger(s.branchIndex)));
   assert.ok(facts.relationshipTiming.self.decade);assert.equal(facts.relationshipTiming.self.annual.length,2);
   assert.notDeepEqual(facts.relationshipTiming.self.annual[0].transformations,facts.relationshipTiming.self.annual[1].transformations);
  }
  if(domain==='vedic'){assert.ok(facts.relationshipBasis.self.seventhLord);assert.ok(Object.keys(facts.relationshipBasis.self.d9Signs).length);assert.ok(facts.relationshipTiming.overlaps.length);}
  if(domain==='astrology')assert.ok(facts.relationshipComparison.crossAspects.some(a=>['Saturn','Uranus','Pluto'].includes(a.from)||['Saturn','Uranus','Pluto'].includes(a.to)));
  const previous=[];
  for(const chapter of row.snapshot.manifest){const input={locale:'ko',chapter,analysis:row.snapshot.analysis,previous};const result=await new loaded.exports.MockChapterProvider().generateChapter(input);loaded.exports.validateChapter(result,input);previous.push(result);}
  assert.equal(previous.length,5);assert.equal(globalThis.__kindTest.calls,0);
  for(const chapter of row.snapshot.manifest){
   let sent;await new loaded.exports.StructuredChapterProvider({generate:async request=>{sent=request;return {result:{},provider:'mock',model:'fixture'};}}).generateChapter({locale:'ko',chapter,analysis:row.snapshot.analysis,previous:[]});
   const selected=Object.fromEntries(sent.calculatedData.facts.map(f=>[f.label,f.value]));
    if(domain==='tarot'){
     assert.equal(selected.cards.length,6);
     assert.equal(JSON.parse(sent.domainRules).tarotMaster.methodVersion,'yeongnyangi-tarot-consultation-v2');
    }
   else {assert.ok(selected.relationshipBasis.self);if(kind==='compatibility')assert.ok(selected.relationshipBasis.partner);}
  }
 }
});
test('relationship intents survive profile edits and provider outages; uncertain reads never redraw',async()=>{
 const request={...relationRequest('tarot'),consultationAttemptId:'12345678-1234-4234-8234-123456789abc'};
 const row=await prepareFortune(env,'relation-replay',request);
 assert.equal(await prepareFortune({},'relation-replay',request),row);
 globalThis.__kindTest.readError=true;
 try{await assert.rejects(()=>prepareFortune(env,'relation-replay',request),e=>e.code==='RESULT_STORAGE_UNAVAILABLE');}finally{delete globalThis.__kindTest.readError;}
 const different=await prepareFortune(env,'relation-replay',{...request,participants:{self:'나비',partner:'달'}});assert.notEqual(different._id,row._id);
 const ziwei={...relationRequest('ziwei'),consultationAttemptId:'22345678-1234-4234-8234-123456789abc'};
 const saved=await prepareFortune(env,'relation-replay',ziwei);
 globalThis.__kindTest.profileOverride=()=>{throw Error('must read original intent before profiles');};
 try{assert.equal(await prepareFortune({},'relation-replay',ziwei),saved);}finally{delete globalThis.__kindTest.profileOverride;}
});
test('relationship pre-purchase validation rejects missing partner, foreign owner, unknown time and unsupported language codes',async()=>{
 for(const domain of ['ziwei','vedic','astrology']){
  await assert.rejects(()=>prepareFortune(env,'owner',{...relationRequest(domain),partnerProfileId:undefined}),e=>e.code==='PARTNER_REQUIRED');
  await assert.rejects(()=>prepareFortune(env,'owner',{...relationRequest(domain),locale:'zz'}),e=>e.code==='READING_LOCALE_UNAVAILABLE');
  await assert.rejects(()=>prepareFortune(env,'owner',{...relationRequest(domain),partnerTimeUnknown:true}),e=>e.code==='BIRTH_TIME_REQUIRED');
 }
 await assert.rejects(()=>prepareFortune(env,'owner',{...relationRequest('tarot'),participants:{self:'나'}}),e=>e.code==='PARTICIPANT_NAMES_REQUIRED');
 await assert.rejects(()=>prepareFortune(env,'owner',{...relationRequest('ziwei'),partnerProfileId:'self'}),e=>e.code==='DISTINCT_PARTNER_REQUIRED');
 globalThis.__kindTest.profileOverride=filter=>{assert.equal(filter.userId,'owner');return null;};
 try{await assert.rejects(()=>prepareFortune(env,'owner',relationRequest('ziwei')),e=>e.code==='PROFILE_NOT_FOUND');}finally{delete globalThis.__kindTest.profileOverride;}
});
test('overseas solar clock agrees with independent Swiss EOT within the declared daily approximation',async()=>{
 const {readFile}=await import('node:fs/promises');
 const {default:create}=await import('sweph-wasm/wasm/swisseph');
 const {default:Swiss}=await import('sweph-wasm');
 const raw=await create({wasmBinary:await readFile('public/js/vendor/sweph-wasm/wasm/swisseph.wasm')});
 const swe=new Swiss(raw);
 // Swiss programmer reference §9.4: E = LAT - LMT, UT input, output in days.
 for(const birthDate of ['1990-07-01','2000-02-11','2024-11-03']){
  const clock=loaded.exports.ziweiRelationshipClock({birthDate,birthTime:'12:00',gender:'female',calendarType:'solar',birthPlace:{latitude:0,longitude:0,timezone:'UTC'}});
  const exact=swe.swe_time_equ(Date.parse(clock.audit.utc)/86400000+2440587.5)*1440;
  assert.ok(Math.abs(clock.audit.equationOfTimeMinutes-exact)<1,'daily approximation must remain within one minute at independent fixtures');
  assert.equal(Math.sign(clock.audit.equationOfTimeMinutes),Math.sign(exact));
 }
 const clock=loaded.exports.ziweiRelationshipClock;
 const p={birthDate:'2000-02-11',birthTime:'00:00',gender:'female',calendarType:'solar',birthPlace:{latitude:0,longitude:0,timezone:'UTC'}};
 assert.equal(clock(p).profile.birthDate,'2000-02-10');
 assert.equal(clock({...p,birthTime:'00:15'}).profile.birthDate,'2000-02-11');
 assert.equal(clock({...p,birthTime:'01:14'}).profile.birthTime.slice(0,2),'00');
 assert.equal(clock({...p,birthTime:'01:15'}).profile.birthTime.slice(0,2),'01');
});
test('relationship copy references exist and every tier retains all required report topics',async()=>{
 const {readFile}=await import('node:fs/promises');
 const source=await readFile('app/yeongnyangi/_lib/relationship-copy.ts','utf8');
 const compiled=await build({stdin:{contents:source,loader:'ts'},format:'esm',write:false});
 const {relationshipCopy}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
 for(const file of ['app/yeongnyangi/_components/Consultation.tsx','app/yeongnyangi/_components/TarotDrawRitual.tsx','app/yeongnyangi/_original/FortuneHome.tsx']){
  const content=await readFile(file,'utf8');
  for(const match of content.matchAll(/relationshipCopy\.(\w+)/g))assert.ok(relationshipCopy[match[1]],`${file}: ${match[1]}`);
 }
 const journey=await readFile('app/yeongnyangi/_components/RelationshipJourney.tsx','utf8');
 for(const match of journey.matchAll(/copy\.(\w+)/g))assert.ok(relationshipCopy[match[1]],match[1]);
 for(const domain of ['ziwei','vedic','astrology','tarot']){
  const kinds=consultationKinds[domain].filter(k=>['love','marriage','compatibility'].includes(k.id));
  for(const kind of kinds){
   const tiers=products.filter(p=>p.domain===domain&&p.readingKind==='single');
   const all=tiers.map(p=>consultationManifest(p,kind).flatMap(c=>c.sections.map(s=>s.title)));
   for(const title of all[0])if(!['현실 장면','지금 할 일'].includes(title))for(const titles of all)assert.ok(titles.includes(title),`${domain}/${kind.id}: ${title}`);
  }
 }
});
test('overseas Ziwei uses UTC plus longitude and EOT and rejects DST ambiguity',()=>{
 const {ziweiRelationshipClock,calculateRelationshipZiwei,extendRelationshipContext,validateInput}=loaded.exports;
 const profile={birthDate:'1990-07-01',birthTime:'12:00',gender:'female',calendarType:'solar',birthPlace:{latitude:40.71,longitude:-74.006,timezone:'America/New_York'}};
 const clock=ziweiRelationshipClock(profile);
 assert.equal(clock.audit.utc,'1990-07-01T16:00:00.000Z');
 assert.ok(clock.profile.birthTime>='10:59'&&clock.profile.birthTime<='11:03','solar noon correction must remove DST exactly once');
 assert.throws(()=>ziweiRelationshipClock({...profile,birthDate:'2024-11-03',birthTime:'01:30'}),e=>e.code==='AMBIGUOUS_BIRTH_TIME');
 assert.throws(()=>ziweiRelationshipClock({...profile,birthDate:'2024-03-10',birthTime:'02:30'}),e=>e.code==='AMBIGUOUS_BIRTH_TIME');
 const dateLine=ziweiRelationshipClock({...profile,birthTime:'00:10',birthPlace:{latitude:1.87,longitude:-157.4,timezone:'Pacific/Kiritimati'}});
 assert.notEqual(dateLine.profile.birthDate,profile.birthDate);
 const lunar=validateInput({personA:{...profile,calendarType:'lunar',birthDate:'1990-05-10',leapMonth:true}},'ziwei');
 assert.equal(lunar.personA.calendarType,'solar');assert.ok(lunar.personA.originalCalendar.leapMonth);
 assert.throws(()=>validateInput({personA:{...profile,calendarType:'lunar',birthDate:'1990-02-31'}},'ziwei'));
 const a=calculateRelationshipZiwei(profile,'2026-09-29'),b=calculateRelationshipZiwei({...profile,birthDate:'1987-12-21'},'2026-09-29');
 const ab=extendRelationshipContext(a,b,'2026-09-29'),ba=extendRelationshipContext(b,a,'2026-09-29');
 const basis=c=>c.facts.find(f=>f.label==='relationshipBasis').value;
 assert.deepEqual(basis(ab).self,basis(ba).partner);assert.notDeepEqual(basis(ab).self,basis(ab).partner);
});
test('all offered modes preserve paid chapter depth and have complete unique titles',()=>{
 for(const p of products)for(const k of consultationKinds[consultationDomain(p)]){
  if(!supportsKind(p,k)){assert.throws(()=>resolveConsultationKind(p,k.id));continue;}
  const rows=consultationManifest(p,k);
  if(rows[0]?.version!=='destiny-book-v7')assert.equal(rows.length,p.chapterCount,`${p.id}/${k.id}`);
  else {
   const counts={saju:[8,13,28],ziwei:[8,13,21],vedic:[8,13,23],astrology:[8,10,12],sukuyo:[6,8,10],'tarot:love':[5,7,9],'tarot:choice':[4,5,6]};
   assert.equal(rows.length,counts[p.domain==='tarot'?`tarot:${k.id}`:p.domain][['salmon','flounder','tuna'].indexOf(p.fishId)],`${p.id}/${k.id} v7 depth`);
  }
  assert.equal(new Set(rows.map(r=>r.title)).size,rows.length);
  assert.ok(rows.every(r=>r.title&&r.focus&&r.minimumChars>0));
 }
});
test('mode snapshots isolate intents and discard hidden free questions',async()=>{
 const personal=await prepareFortune(env,'owner',{...body,consultationKind:'personal',question:'숨겨진 이전 질문'});
 const work=await prepareFortune(env,'owner',{...body,consultationKind:'work'});
 const ask=await prepareFortune(env,'owner',{...body,consultationKind:'ask',question:'일을 바꿀까요?'});
 assert.equal(personal.snapshot.analysis.consultation.question,'');
 assert.equal(personal.snapshot.analysis.consultation.consultationKind,'personal');
 assert.equal(new Set([personal._id,work._id,ask._id]).size,3);
 assert.ok(work.snapshot.manifest[0].title.includes('재능'));
 assert.equal(ask.snapshot.analysis.consultation.questions.length,1);
 assert.equal(personal.amountKRW,work.amountKRW);
 personal.paymentId='original';personal.state='COMPLETED';personal.chapters=[{summary:'original'}];
 const replay=await prepareFortune(env,'owner',{...body,consultationKind:'personal'});
 assert.equal(replay.paymentId,'original');assert.equal(replay.chapters[0].summary,'original');
 assert.equal(globalThis.__kindTest.calls,0);
});
test('compatibility owns two actual saju calculations and no invented relationship score',async()=>{
 const row=await prepareFortune(env,'owner',{...body,consultationKind:'compatibility',partnerProfileId:'partner'});
 const facts=selectChapterFacts(row.snapshot.analysis.contexts.saju,row.snapshot.manifest[0]);
 const partner=facts.find(f=>f.label==='partnerChart');assert.ok(partner?.value.pillars);
 assert.notDeepEqual(partner.value.pillars,facts.find(f=>f.label==='pillars').value);
 assert.ok(facts.find(f=>f.label==='relationshipComparison'));
 assert.equal(row.snapshot.analysis.contexts.sukuyo,undefined);
 assert.ok(presentFortune({...row,paymentId:'paid',state:'COMPLETED'}).charts[0].groups.some(g=>g.label==='상대 일주'));
});
test('invalid modes, missing questions/partners and unsupported tiers fail before purchase',async()=>{
 for(const extra of [{consultationKind:'bad'},{consultationKind:'ask'},{consultationKind:'compatibility'},{consultationKind:'compatibility',partnerProfileId:'self'},{consultationKind:'timing'},{consultationKind:'personal',partnerProfileId:'partner'}])await assert.rejects(()=>prepareFortune(env,'owner',{...body,...extra}));
 const timing=await prepareFortune(env,'owner',{...body,productId:'saju_tuna',consultationKind:'timing'});
 assert.ok(selectChapterFacts(timing.snapshot.analysis.contexts.saju,timing.snapshot.manifest[0]).some(f=>f.label==='majorLuck'));
 await assert.rejects(()=>prepareFortune(env,'owner',{...body,productId:'saju_tuna',consultationKind:'timing',timeUnknown:true}));
});
test('old requests retain legacy shape and question behavior',async()=>{
 const row=await prepareFortune(env,'owner',{...body,question:'기존 질문'});
 assert.equal(row.snapshot.analysis.consultation.consultationKind,undefined);
 assert.equal(row.snapshot.analysis.consultation.question,'기존 질문');
 assert.equal(row.generationCheckpoint,undefined);
});

test('only general ask menus save private evidence packets; tarot v2 keeps its own frozen contract',async()=>{
 for(const productId of ['saju_mackerel','ziwei_mackerel','vedic_mackerel','astrology_mackerel','sukuyo_mackerel','fusion_saju_ziwei']) {
  const product=products.find(p=>p.id===productId);
  const request={...body,productId,consultationKind:'ask',question:'첫 질문의 근거를 확인해 주세요.',locale:'ja'};
  const row=await prepareFortune(env,'evidence-owner',request);
  const packet=row.generationCheckpoint.evidence;
  assert.equal(row.generationCheckpoint.version,'ask-generation-v1');
  assert.equal(row.snapshot.askEvidence,undefined,'purchase snapshot stays unchanged');
  assert.equal(packet.packet_version,'ask-evidence-v1');
  assert.equal(packet.locale,'ja');
  assert.ok(packet.facts.length);
  assert.equal(row.amountKRW,product.priceKRW);
  assert.equal(row.snapshot.manifest.length,product.chapterCount+(productId==='fusion_saju_ziwei'?1:0));
  assert.equal(row.snapshot.manifest.length,row.snapshot.product.chapterCount);
  assert.equal(presentFortune(row).askEvidence,undefined,'raw packet is not a public API field');
  const answered={...row,chapters:[{summary:'저장된 답',analysis:[],questionAnswers:[],internalBasis:{questionAnswers:[{questionId:'q1',factIds:['F001'],timingIds:[],evidenceStatus:'grounded',sources:['saju.tenGods']}]}}]};
  assert.equal(presentFortune(answered).chapters[0].internalBasis,undefined,'server-only citations never reach the client');
  assert.equal(presentFortune(answered).chapters[0].summary,'저장된 답');
  assert.deepEqual(await prepareFortune(env,'evidence-owner',request),row);
 }
 const tarot=await prepareFortune(env,'evidence-owner',{...body,productId:'tarot_mackerel',consultationKind:'choice',question:'이 선택을 이어갈까요?',locale:'ja'});
 assert.equal(tarot.generationCheckpoint,undefined);
 assert.deepEqual(tarot.snapshot.tarotConsultation,{version:'yeongnyangi-tarot-consultation-v2',kind:'choice'});
 assert.equal(tarot.snapshot.analysis.contexts.tarot.facts.find(f=>f.label==='tarotConsultation').value.version,'yeongnyangi-tarot-consultation-v2');
 assert.equal(tarot.snapshot.manifest.length,5);
 assert.equal(globalThis.__kindTest.calls,0);
});

test('all nine ordinary tarot menus preserve each of the twelve output locales',async()=>{
 for(const locale of loaded.exports.readingLocales)for(const consultationKind of ['choice','love','feelings','contact','reunion','compatibility','career','money','healing']){
  const row=await prepareFortune(env,'tarot-locale-owner',{...body,productId:'tarot_mackerel',consultationKind,question:'What should I consider before taking the next step?',locale,...(consultationKind==='compatibility'?{participants:{self:'Alex',partner:'Sam'}}:{})});
  assert.equal(row.snapshot.locale,locale);
  assert.equal(row.snapshot.analysis.consultation.tarotConsultation.kind,consultationKind);
  assert.equal(presentFortune({...row,paymentId:'mock-paid',state:'COMPLETED'}).locale,locale);
 }
 assert.equal(globalThis.__kindTest.calls,0);
});

test('expanded chart menus preserve language through preparation, provider request and saved reread',async()=>{
 const expanded={saju:['health','marriage','movement'],ziwei:['health','business','love','marriage','compatibility'],vedic:['health','compatibility'],astrology:['health','compatibility']};
 for(const locale of loaded.exports.readingLocales)for(const [domain,kinds] of Object.entries(expanded))for(const kind of kinds){
  const row=await prepareFortune(env,'expanded-locale-owner',{...relationRequest(domain,kind),locale});
  assert.equal(row.snapshot.locale,locale);
  assert.equal(row.snapshot.analysis.consultation.consultationKind,kind);
  const chapter=row.snapshot.manifest[0];let sent;
  await new loaded.exports.StructuredChapterProvider({generate:async request=>{sent=request;return {result:{},provider:'mock',model:'fixture'};}}).generateChapter({locale,chapter,analysis:row.snapshot.analysis,previous:[]});
  assert.equal(sent.locale,locale);
  assert.equal(JSON.parse(sent.domainRules).outputLocale,locale);
  assert.equal(presentFortune({...row,paymentId:'mock-paid',state:'COMPLETED'}).locale,locale);
 }
 assert.equal(globalThis.__kindTest.calls,0);
});

test('tarot retries reuse the first stored draw; storage uncertainty blocks a new draw',async()=>{
 const request={...body,productId:'tarot_mackerel',consultationKind:'choice',question:'저장된 카드를 다시 확인해 주세요.'};
 const row=await prepareFortune(env,'tarot-owner',request);
 const before=structuredClone(row.snapshot);
 const rng=crypto.getRandomValues;
 crypto.getRandomValues=()=>{throw new Error('unexpected redraw');};
 try {
  assert.equal(await prepareFortune(env,'tarot-owner',request),row);
  assert.deepEqual(row.snapshot,before);
  globalThis.__kindTest.readError=true;
  await assert.rejects(()=>prepareFortune(env,'tarot-owner',request),error=>error.code==='RESULT_STORAGE_UNAVAILABLE');
 } finally {crypto.getRandomValues=rng;delete globalThis.__kindTest.readError;}
});

test('v6 intent cannot reuse a paid v5 snapshot and old reads retain their purchased depth',async()=>{
 const product=products.find(p=>p.id===body.productId),current=structuredClone(product);
 let legacy;
 try{
  product.manifestVersion='destiny-book-v5';
  legacy=await prepareFortune(env,'version-owner',{...body,consultationKind:'personal'});
  legacy.snapshot=structuredClone(legacy.snapshot);
  legacy.paymentId='legacy-paid';legacy.state='COMPLETED';legacy.chapters=[{summary:'saved v5 prose'}];
 }finally{Object.assign(product,current);}
 const before=structuredClone(legacy);
 const fresh=await prepareFortune(env,'version-owner',{...body,consultationKind:'personal'});
 assert.notEqual(fresh._id,legacy._id);
 assert.equal(fresh.snapshot.product.manifestVersion,'destiny-book-v6');
 assert.equal(fresh.snapshot.manifest[0].version,'destiny-book-v6');
 assert.deepEqual(legacy,before);
 assert.equal(presentFortune(legacy).manifest[0].version,'destiny-book-v5');
 assert.equal(presentFortune(legacy).chapters[0].summary,'saved v5 prose');
 assert.equal(globalThis.__kindTest.calls,0);
});

test('new paid compatibility and timing chapters satisfy existing v5 quality and source validation',async()=>{
 for(const [consultationKind,productId,partnerProfileId] of [['compatibility','saju_mackerel','partner'],['timing','saju_tuna',undefined]]){
  const row=await prepareFortune(env,'owner',{...body,consultationKind,productId,partnerProfileId});
  const previous=[];
  for(const chapter of row.snapshot.manifest){const input={chapter,analysis:row.snapshot.analysis,previous};const result=await new loaded.exports.MockChapterProvider().generateChapter(input);loaded.exports.validateChapter(result,input);previous.push(result);}
  assert.equal(previous.length,row.snapshot.manifest.length);
 }
});
test('종격 answers change only premium saju requests; no answer keeps the legacy request id',async()=>{
 const jong={...body,profileId:'jong',consultationKind:'personal'};
 assert.deepEqual(await jongCheckFortune(env,'owner',{...jong,productId:'saju_mackerel'}),{check:null});
 const {check}=await jongCheckFortune(env,'owner',{...jong,productId:'saju_tuna'});
 assert.ok(check.best.length>=2&&check.worst.length>=2);
 const answer=reply=>({best:reply,worst:reply,bestYears:check.best.map(y=>y.year),worstYears:check.worst.map(y=>y.year)});
 const lower=await prepareFortune(env,'owner',{...jong});
 assert.equal((await prepareFortune(env,'owner',{...jong,jongCheck:answer('no')}))._id,lower._id,'lower tiers drop the answer');
 assert.equal((await prepareFortune(env,'owner',{...jong,jongCheck:'malformed'}))._id,lower._id);
 const tuna={...jong,productId:'saju_tuna'};
 const plain=await prepareFortune(env,'owner',tuna);
 const rejected=await prepareFortune(env,'owner',{...tuna,jongCheck:answer('no')});
 assert.notEqual(rejected._id,plain._id);
 assert.ok(JSON.stringify(rejected.snapshot.analysis).includes('rejectedByUser')&&!JSON.stringify(plain.snapshot.analysis).includes('rejectedByUser'));
 assert.equal((await prepareFortune(env,'owner',{...tuna,jongCheck:answer('unsure')}))._id!==plain._id,true,'every answer is its own request');
 await assert.rejects(prepareFortune(env,'owner',{...tuna,jongCheck:{best:'no'}}),{code:'INVALID_JONG_CHECK'});
});

test('new v7 purchases leave a paid v6 result and its original price untouched',async()=>{
 const legacy=await prepareFortune(env,'v7-rollout-owner',{...body,productId:'saju_salmon'});
 assert.equal(legacy.snapshot.manifest[0].version,'destiny-book-v6');
 legacy.paymentId='original-v6-payment';legacy.state='COMPLETED';legacy.chapters=[{summary:'saved v6 prose'}];
 const before=structuredClone(legacy);
 const fresh=await prepareFortune(env,'v7-rollout-owner',{...body,productId:'saju_salmon',consultationKind:'personal'});
 assert.equal(fresh.snapshot.manifest[0].version,'destiny-book-v7');assert.notEqual(fresh._id,legacy._id);
 assert.equal(fresh.amountKRW,legacy.amountKRW);assert.deepEqual(legacy,before);
 assert.equal(presentFortune(legacy).chapters[0].summary,'saved v6 prose');
 assert.equal(presentFortune(legacy).manifest[0].version,'destiny-book-v6');
 assert.equal(globalThis.__kindTest.calls,0);
});


test('new question contracts preserve prices, scope, original purchase and punctuation-independent intent',async()=>{
 const base={version:'question-consultation-20261007',category:'self',target:'self',horizon:'current',situation:'현재 상황',options:'선택지',period:'현재와 다음 대운',constraints:'없음',confirmed:true};
 for(const [fish,limit,price,decision,question] of [
  ['mackerel',0,3000,base,'거절할 때 어떻게 말할까? 같은 고민의 설명이에요.'],
  ['salmon',1,9000,{...base,category:'job_change',period:'2026년'},'이직을 준비해도 될까?'],
  ['flounder',2,15000,{...base,category:'compatibility',target:'pair',relationshipType:'romantic_adults'},'두 사람의 생활 방식과 돈 관리에서 무엇을 조율할까?'],
  ['tuna',4,30000,{...base,category:'timing',horizon:'transition'},'현재와 다음 대운의 일 방향은 어떻게 달라질까?'],
 ]){
  const row=await prepareFortune(env,'new-question-'+fish,{...body,productId:'saju_'+fish,questionDecision:decision,question,...(fish==='flounder'?{partnerProfileId:'partner'}:{})});
  assert.equal(row.snapshot.questionContract.version,base.version);assert.equal(row.snapshot.questionContract.followups,limit);assert.equal(row.snapshot.questionContract.readingBudget.followups,limit);
  assert.equal(row.amountKRW,price);assert.ok(row.snapshot.manifest.length>=6);assert.ok(row.snapshot.manifest.every(ch=>ch.sections.some(section=>section.id==='evidence')));
  assert.equal(row.snapshot.analysis.consultation.questions.length,1);
  const facts=selectChapterFacts(row.snapshot.analysis.contexts.saju,row.snapshot.manifest[0]);
  if(fish==='flounder')assert.ok(facts.some(f=>f.label==='compatibility'));
  if(fish==='tuna')assert.ok(facts.some(f=>f.label==='questionTiming'));
  assert.equal(presentFortune(row).conversation.limit,limit);
  const retry=await prepareFortune(env,'new-question-'+fish,{...body,productId:'saju_'+fish,questionDecision:decision,question,...(fish==='flounder'?{partnerProfileId:'partner'}:{})});
  assert.equal(retry._id,row._id);
 }
 const legacy=await prepareFortune(env,'legacy-question',{...body,consultationKind:'personal'});
 assert.equal(legacy.snapshot.questionContract,undefined);
});


test('new question generation keeps expert evidence through the actual provider projection in all natal systems',async()=>{
 const decision={version:'question-consultation-20261007',category:'money',target:'self',horizon:'current',situation:'지출을 정리하려 해요',options:'예산 정리',period:'2026년',constraints:'없음',confirmed:true};
 for(const domain of ['saju','ziwei','vedic','astrology','sukuyo']){
  const row=await prepareFortune(env,'expert-'+domain,{...body,productId:domain+'_salmon',questionDecision:decision,question:'재물 관리에서 무엇을 준비할까?'});
  const input={chapter:row.snapshot.manifest[0],analysis:row.snapshot.analysis,previous:[],locale:'ko'};
  const withoutQuestion={...input,analysis:{...input.analysis,consultation:{...input.analysis.consultation,questions:[]}}};
  const fixture=await new loaded.exports.MockChapterProvider().generateChapter(withoutQuestion);
  fixture.questionAnswers=[{questionId:'Q1',answer:'지출의 우선순위를 정해 보세요.',reason:'제공된 계산 근거를 실제 생활 조건과 비교합니다.',timing:'출생 근거만으로 특정 날짜를 확정하지 않습니다.',action:'이번 주 지출 항목을 정리해 보세요.'}];
  let captured;
  await new loaded.exports.StructuredChapterProvider({generate:async req=>{captured=req;return {result:fixture,provider:'mock',model:'isolated'};}}).generateChapter(input);
  const labels=captured.calculatedData.facts.map(f=>f.label);
  for(const label of {saju:['usefulGod','jong','yearlyLuck'],ziwei:['palaces','sanFangSiZheng','businessBasis'],vedic:['planets','vimshottariDasha','yogas'],astrology:['aspects','houseRulers'],sukuyo:['personA']}[domain])assert.ok(labels.includes(label),domain+': '+label);
  assert.match(JSON.parse(captured.domainRules).depth,/가장 깊은 분석/);
  assert.equal(JSON.parse(captured.domainRules).paidScope,undefined);
  const previous=[];
  for(const chapter of row.snapshot.manifest){const chapterInput={chapter,analysis:row.snapshot.analysis,previous,locale:'ko'};const result=await new loaded.exports.MockChapterProvider().generateChapter(chapterInput);loaded.exports.validateChapter(result,chapterInput);previous.push(result);}
 }
});

test('D7 mackerel question chapters get distinct tasks and scenes; layout chapters carry earlier year judgments',async()=>{
 const base={version:'question-consultation-20261007',target:'self',horizon:'current',situation:'현재 상황',options:'선택지',period:'2027년',constraints:'없음',confirmed:true};
 const capture=async(chapter,analysis,previous=[])=>{
  let captured;
  await new loaded.exports.StructuredChapterProvider({generate:async req=>{captured=req;throw new Error('captured');}}).generateChapter({chapter,analysis,previous,locale:'ko'}).catch(()=>{});
  assert.ok(captured,chapter.id);return JSON.parse(captured.domainRules);
 };
 const mackerel=await prepareFortune(env,'d7-mackerel',{...body,productId:'saju_mackerel',questionDecision:{...base,category:'self'},question:'거절할 때 어떻게 말할까?'});
 assert.equal(mackerel.snapshot.manifest.length,6);
 const rules=[];for(const chapter of mackerel.snapshot.manifest)rules.push(await capture(chapter,mackerel.snapshot.analysis));
 assert.equal(new Set(rules.map(r=>r.narrativeTask)).size,6);
 assert.ok(rules.every(r=>!r.narrativeTask.startsWith('이번 장의 고유 질문')));
 assert.equal(new Set(rules.map(r=>r.exampleScene)).size,6);assert.ok(rules.every(r=>r.exampleScene));
 const salmon=await prepareFortune(env,'d7-salmon',{...body,productId:'saju_salmon',questionDecision:{...base,category:'money'},question:'재물 관리에서 무엇을 준비할까?'});
 const claim='2027년에는 옮기기보다 준비를 다지는 편이 유리합니다.';
 const previous=[{summary:'요약',example:'',topics:[],blocks:[{id:'meaning',title:'답',paragraphs:[claim+' 다른 문장입니다.',claim]}]}];
 const later=await capture(salmon.snapshot.manifest[3],salmon.snapshot.analysis,previous);
 assert.match(later.narrativeTask,/^이번 장의 고유 질문/);assert.equal(later.exampleScene,undefined);
 assert.deepEqual(later.previousYearClaims.claims,[claim]);
 // Chapters without the D7 layout marker keep their previous prompt.
 const legacy=await capture({...salmon.snapshot.manifest[3],consultationLayout:undefined},salmon.snapshot.analysis,previous);
 assert.equal(legacy.previousYearClaims,undefined);
});

test('new question retries read the immutable intent before profile changes and provider readiness',async()=>{
 const input={...body,question:'일상의 부탁을 어떻게 거절할까?',consultationAttemptId:'12345678-1234-4234-8234-123456789abc',questionDecision:{version:'question-consultation-20261007',category:'self',target:'self',horizon:'current',situation:'업무 부탁',options:'',period:'',constraints:'',confirmed:true}};
 const first=await prepareFortune(env,'stable-question',input);
 globalThis.__kindTest.profileOverride=()=>{throw Error('must not recalculate');};
 try{assert.equal((await prepareFortune({},'stable-question',input))._id,first._id);}finally{delete globalThis.__kindTest.profileOverride;}
});


test('ziwei and vedic transitions use native current and next periods before purchase',async()=>{
 for(const domain of ['ziwei','vedic']){
  const questionDecision={version:'question-consultation-20261007',category:'timing',target:'self',horizon:'transition',situation:'일의 방향을 준비하려 해요',options:'',period:'현재와 다음 시기',constraints:'',confirmed:true};
  const row=await prepareFortune(env,'native-transition-'+domain,{...body,productId:domain+'_tuna',questionDecision,question:'현재와 다음 시기에 무엇을 준비할까?'});
  const evidence=selectChapterFacts(row.snapshot.analysis.contexts[domain],row.snapshot.manifest[0]).find(f=>f.label==='questionTiming');
  assert.ok(evidence);assert.equal(evidence.value.periods.length,2);
  assert.match(evidence.value.rule,domain==='ziwei'?/대한/:/마하다샤/);
 }
});
