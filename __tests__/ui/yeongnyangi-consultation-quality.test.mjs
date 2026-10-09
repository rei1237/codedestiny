import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import {build} from 'esbuild';
const Module=createRequire(import.meta.url)('node:module');
const built=await build({stdin:{contents:`export * from './worker/yeongnyangi/prompts/domain/consultation-quality'; export * from './worker/yeongnyangi/prompts/domain/reader-counsel'; export * from './worker/yeongnyangi/prompts/domain/recognition'; export {questionManifest,QUESTION_POLICY_VERSION} from './worker/yeongnyangi/fortune/ask/question-policy'; export {StructuredChapterProvider} from './worker/yeongnyangi/providers/chapter'; export {domains} from './worker/yeongnyangi/fortune/index'; export {products} from './worker/yeongnyangi/payments/catalog'; export {consultationKinds,consultationManifest,supportsKind} from './worker/yeongnyangi/fortune/consultation-kinds'; export {readingManifestV7} from './worker/yeongnyangi/fortune/reading-v7'; export {resolveV7Ledger} from './worker/yeongnyangi/fortune/reading-v7-ledger';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'}});
const filename=path.resolve('consultation-quality.test.cjs'),loaded=new Module(filename);
loaded.filename=filename;loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(built.outputFiles[0].text,filename);
const m=loaded.exports;
const birth={birthDate:'1998-02-28',birthTime:'14:30',calendarType:'solar',gender:'female',birthPlace:{latitude:37.5665,longitude:126.978,timezone:'Asia/Seoul'}};
const contexts={};
test('reader evidence keeps calculation weights private without mutating saved facts or dates',()=>{
 const weights={비견:2.35,겁재:1,식신:1,정재:0,상관:0.5};
 const original={facts:[{id:'saju.tenGods',label:'tenGods',value:weights}],askFirstChapter:{evidence:{facts:[{id:'F001',label:'tenGods',value:weights}]}},year:2027,month:12};
 const before=JSON.stringify(original),out=m.readerEvidence(original);
 assert.equal(JSON.stringify(original),before);
 const value=out.facts[0].value;
 assert.equal(value.비견.relativePresence,'이 분포에서 가장 두드러짐');
 assert.equal(value.겁재.relativePresence,value.식신.relativePresence);
 assert.equal(value.정재.relativePresence,'집계되지 않음');
 assert.match(value.비견.meaning,/자기 기준/);
 assert.doesNotMatch(JSON.stringify(out),/2\.35|0\.5/);
 assert.deepEqual(out.askFirstChapter.evidence.facts[0].value,value);
 assert.equal(out.facts[0].id,'saju.tenGods');assert.equal(out.year,2027);assert.equal(out.month,12);
 const profile={label:'tenGodProfile',value:{visibleCount:7,surface:weights,where:{비견:['년주 천간']},families:[{family:'비겁',weight:3.35,visible:3,hidden:1,state:'발달'}]}};
 const projected=m.readerEvidence(profile);
 assert.equal(projected.value.families[0].weight,undefined);
 assert.equal(projected.value.families[0].state,'발달');
 assert.deepEqual(projected.value.where,profile.value.where);
 assert.equal(profile.value.families[0].weight,3.35);
});

test('opening is topic-specific and symbolic readings never invent birth traits',()=>{
 const opening=m.readerCounsel(true,false),later=m.readerCounsel(false,false),symbolic=m.readerCounsel(true,true);
 assert.match(opening.opening,/일반적인 성격 총론은 쓰지 않는다/);
 assert.match(opening.opening,/재물은.*이직은.*연애는/);
 assert.match(opening.counseling,/선택의 비용·현실 조건·불확실성/);
 assert.match(opening.counseling,/조건부로 공감/);
 assert.match(opening.counseling,/작은 행동과 선택권/);
 assert.match(later.opening,/전체 성향 분석을 반복하지 않고/);
 assert.match(symbolic.opening,/타고난 성격을 지어내지 않는다/);
});

for(const domain of ['saju','ziwei','vedic','astrology']){
 const engine=m.domains[domain],input=engine.validateInput({personA:birth,readingMode:'personal'});
 contexts[domain]=engine.buildContext(await engine.calculate(input,{asOf:'2026-09-29T03:00:00Z'}));
}

test('current supported kinds and tiers, plus v7 personal/ask, receive only their calculated IDs and school',async()=>{
 let requests=0;
 const relationContext=m.domains.ziwei.buildContext(await m.domains.ziwei.calculate(m.domains.ziwei.validateInput({personA:birth}),{asOf:'2026-09-29',relationshipReading:true}));
 for(const [domain,context] of Object.entries(contexts))for(const product of m.products.filter(p=>p.readingKind==='single'&&p.domain===domain)){
  const current=m.consultationKinds[domain].filter(k=>!k.partner&&m.supportsKind(product,k)).map(k=>{const rows=m.consultationManifest(product,k);return rows[0].version==='destiny-book-v7'?m.resolveV7Ledger(rows,context).chapters[0]:rows[0];});
  const v7=product.fishId==='mackerel'?[]:['personal','ask'].map(id=>m.resolveV7Ledger(m.readingManifestV7(product,{id}),context).chapters[0]);
  for(const chapter of [...current,...v7]){
   let sent;
   const provider=new m.StructuredChapterProvider({generate:async request=>{sent=request;return {result:{},provider:'mock',model:'fixture'};}});
   await provider.generateChapter({chapter,analysis:{contexts:{[domain]:chapter.key?.startsWith('relationship-')?relationContext:context},themes:[],signals:[]},previous:[]});
   const rules=JSON.parse(sent.domainRules),guide=rules.consultationQuality;
   assert.equal(guide.version,m.CONSULTATION_QUALITY_VERSION);
   assert.equal(rules.readerCounsel.version,m.READER_COUNSEL_VERSION);
   assert.match(rules.readerCounsel.opening,/신청한 주제와 구체적인 질문/);
   assert.ok(sent.promptVersion.includes(m.READER_COUNSEL_VERSION));
   assert.equal(guide.domain,m.CONSULTATION_QUALITY_POLICY.domains[domain]);
   assert.deepEqual(guide.availableFactIds,sent.calculatedData.facts.map(f=>f.id));
   assert.ok(guide.availableFactIds.length);
   assert.ok(guide.availableFactIds.every(id=>id.startsWith(domain+'.')));
   assert.deepEqual(guide.limitations,sent.calculatedData.limitations);
   assert.equal(sent.outputSchema.properties.consultationQuality,undefined,'guidance is not a public output field');
   assert.deepEqual(rules.sectionContract,chapter.sections);
   requests++;
  }
 }
 assert.ok(requests>=64);
});

test('fusion, tarot/sukuyo and symbolic paths do not receive the new single-system guide',()=>{
 const c=contexts.saju;
 assert.equal(m.buildConsultationQuality([c,contexts.ziwei],c),undefined);
 assert.equal(m.buildConsultationQuality([c],c,true),undefined);
 for(const domain of ['tarot','sukuyo'])assert.equal(m.buildConsultationQuality([{...c,domain}],{...c,domain}),undefined);
});

test('absence, unsupported timing/divisional fields and question omission have explicit first-attempt instructions',()=>{
 const p=m.CONSULTATION_QUALITY_POLICY;
 assert.match(p.evidence,/反対|반대 성향/);
 assert.match(p.domains.saju,/정재가 없다고.*금지/);
 assert.match(p.domains.saju,/정관·편관이 없다고/);
 assert.match(p.domains.ziwei,/두 독립 증거/);
 assert.match(p.domains.ziwei,/제공되지 않은 사화/);
 assert.match(p.domains.vedic,/완전한 분할 하우스/);
 assert.match(p.domains.astrology,/미래 사건 날짜/);
 assert.match(p.question,/limited/);
 assert.match(p.question,/배정되지 않은 질문/);
});


test('recognition uses only selected facts; absent, unrelated and foreign evidence never activates a lens',()=>{
 const facts=[{id:'saju.gods',label:'tenGodsByPillar',value:{month:'정관'}},{id:'saju.empty',label:'natalInteractions',value:[]},{id:'saju.missing',label:'jong',value:null},{id:'astrology.aspects',label:'aspects',value:[{type:'square'}]},{id:'saju.health',label:'healthBasis',value:{}}];
 const before=JSON.stringify(facts),guide=m.buildRecognition(facts,['saju']);
 assert.equal(guide.lenses.length,1);
 assert.deepEqual(guide.lenses[0].factIds,['saju.gods']);
 assert.equal(JSON.stringify(facts),before);
 assert.deepEqual(m.buildRecognition([],['saju','tarot']).lenses,[]);
 assert.deepEqual(m.buildRecognition(facts,['unsupported']).lenses,[]);
});

test('all personas and prices receive identical grounded recognition on the real provider path',async()=>{
 const decision={version:m.QUESTION_POLICY_VERSION,category:'self',target:'self',horizon:'current',situation:'부탁을 거절하기 어려워요',options:'',period:'',constraints:'',confirmed:true};
 const all={...contexts,sukuyo:{domain:'sukuyo',facts:[{id:'sukuyo.personA',label:'personA',value:{mansion:'角'}}],limitations:['관계 비교 자료 없음'],engineVersion:'fixture'},tarot:{domain:'tarot',facts:[{id:'tarot.cards',label:'cards',value:[{name:'Two of Swords',position:'current',isReversed:false}]}],limitations:['상징적 해석'],engineVersion:'fixture'}};
 for(const [domain,context] of Object.entries(all)){
  let baseline;
  for(const persona of [undefined,'yeoni','neo'])for(const fish of ['mackerel','salmon','flounder','tuna']){
   let sent;
   const provider=new m.StructuredChapterProvider({generate:async request=>{sent=request;return {result:{},provider:'mock',model:'fixture'};}});
   const chapter=m.questionManifest(domain,fish,decision,undefined,'',false)[0];
   await provider.generateChapter({persona,chapter,analysis:{contexts:{[domain]:context},question:'부탁을 거절하기 어려워요',themes:[],signals:[]},previous:[]});
   const guide=JSON.parse(sent.domainRules).recognition;
   assert.equal(guide.version,m.RECOGNITION_VERSION);
   assert.equal(guide.placement,'opening');
   assert.match(sent.system,/첫 답변에서/);
   assert.match(sent.system,/지키려는/);
   assert.match(guide.delivery,/questionAnswers.answer/);
   assert.ok(guide.lenses.length,domain);
   const allowed=new Set(sent.calculatedData.facts.map(f=>f.id));
   assert.ok(guide.lenses.every(l=>l.factIds.every(id=>allowed.has(id))));
   if(!baseline)baseline=guide;else assert.deepEqual(guide,baseline,domain+' '+persona+' '+fish);
   assert.match(sent.promptVersion,/grounded-recognition/);
   assert.equal(sent.outputSchema.properties.recognition,undefined);
   assert.equal(chapter.outputTokens,8192,'no added call or generation budget');
  }
 }
});


test('strength advice follows only final own-chart strength with ordinary-pattern and useful-god evidence',()=>{
 const make=(power,jong={isJong:false})=>[
  {id:'saju.strengthHeuristic',label:'strengthHeuristic',value:power},
  {id:'saju.jong',label:'jong',value:jong},
  {id:'saju.usefulGod',label:'usefulGod',value:['wood']},
 ];
 const advice=(facts,domains=['saju'],placement='opening')=>m.buildRecognition(facts,domains,placement).lenses.filter(l=>l.id.startsWith('strength-'));
 for(const placement of ['opening','detail','followup']){
  for(const isStrong of [false,true]){
   const facts=make({isStrong,calculatedIsStrong:!isStrong,flippedByUser:true,score:isStrong?2:99});
   const before=JSON.stringify(facts),[result]=advice(facts,['saju'],placement);
   assert.equal(result.id,isStrong?'strength-realistic-boundaries':'strength-reciprocal-help');
   assert.deepEqual(result.factIds,facts.map(f=>f.id));
   assert.equal(JSON.stringify(facts),before);
   assert.match(result.guidance,isStrong?/통상적인 조건.*무조건 따라/:/도움의 범위·시간·거절할 선/);
  }
 }
 for(const pattern of [{isJong:true,confirmationRequired:true},{isJong:true,confirmedByUser:true},{isJong:false,confirmationRequired:true},{},null])
  assert.deepEqual(advice(make({isStrong:false},pattern)),[]);
 assert.equal(advice(make({isStrong:false},{isJong:false,rejectedByUser:true,confirmationRequired:false}))[0].id,'strength-reciprocal-help');
 for(const value of [null,{},false,{isStrong:'false'},{score:10},{isStrong:0}]) assert.deepEqual(advice(make(value)),[]);
 const complete=make({isStrong:false});
 for(let i=0;i<complete.length;i++) assert.deepEqual(advice(complete.filter((_,n)=>n!==i)),[]);
 assert.deepEqual(advice([...complete.slice(0,2),{...complete[2],value:[]}]),[]);
 assert.deepEqual(advice([{id:'saju.partnerChart',label:'partnerChart',value:{strengthHeuristic:{isStrong:false},jong:{isJong:false},usefulGod:['wood']}}]),[]);
 assert.deepEqual(advice(complete.map(f=>({...f,id:f.id.replace('saju.','vedic.')}))),[]);
 assert.deepEqual(advice(complete,['tarot']),[]);
});
