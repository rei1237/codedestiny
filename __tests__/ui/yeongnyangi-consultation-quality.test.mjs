import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import {build} from 'esbuild';
const Module=createRequire(import.meta.url)('node:module');
const built=await build({stdin:{contents:`export * from './worker/yeongnyangi/prompts/domain/consultation-quality'; export * from './worker/yeongnyangi/prompts/domain/reader-counsel'; export * from './worker/yeongnyangi/prompts/domain/recognition'; export {questionManifest,QUESTION_POLICY_VERSION} from './worker/yeongnyangi/fortune/ask/question-policy'; export {questionPeriodTiming,questionEvidence} from './worker/yeongnyangi/fortune/ask/question-evidence'; export {consultationPeriod,consultationClock} from './worker/yeongnyangi/fortune/consultation'; export {StructuredChapterProvider} from './worker/yeongnyangi/providers/chapter'; export {domains} from './worker/yeongnyangi/fortune/index'; export {products} from './worker/yeongnyangi/payments/catalog'; export {consultationKinds,consultationManifest,supportsKind} from './worker/yeongnyangi/fortune/consultation-kinds'; export {readingManifestV7} from './worker/yeongnyangi/fortune/reading-v7'; export {resolveV7Ledger} from './worker/yeongnyangi/fortune/reading-v7-ledger';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'}});
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

test('ziwei question chapters carry recalculated annual sihua for every asked year, never the natal copy',async()=>{
 const decision={version:m.QUESTION_POLICY_VERSION,category:'job_change',target:'self',horizon:'current',situation:'이직 고민',options:'남기 / 옮기기',period:'2026년 4분기부터 2027년 상반기',constraints:'',confirmed:true};
 const before=JSON.stringify(contexts.ziwei);
 const period=m.consultationPeriod('이직할까? '+decision.period,m.consultationClock('Asia/Seoul',new Date('2026-09-29T03:00:00Z')),true);
 const ziwei=await m.questionPeriodTiming(contexts.ziwei,decision,period,'2026-09-29',async()=>assert.fail('ziwei needs no recalculation'));
 assert.deepEqual(ziwei.facts.find(f=>f.label==='yearlyTimeline').value.map(r=>r.year),[2026,2027],'only the asked years');
 const rows=m.questionManifest('ziwei','salmon',decision,undefined,'이직할까?');
 const chapters=rows.filter(c=>c.factSelectors?.ziwei?.includes('yearlyTimeline'));
 assert.ok(chapters.length);
 for(const chapter of chapters){
  let sent;
  const provider=new m.StructuredChapterProvider({generate:async request=>{sent=request;return {result:{},provider:'mock',model:'fixture'};}});
  await provider.generateChapter({chapter,analysis:{contexts:{ziwei},question:'이직할까?',themes:[],signals:[]},previous:[]});
  const [y2026,y2027]=sent.calculatedData.facts.find(f=>f.label==='yearlyTimeline').value;
  assert.ok([y2026,y2027].every(y=>y.transformations===undefined),'natal palace transformations must not ride on yearly luck');
  // 丙年 유년사화: 천동 록 · 천기 권 · 문창 과 · 염정 기 / 丁年: 태음 록 · 천동 권 · 천기 과 · 거문 기
  assert.equal(y2026.annualStem,'병');
  assert.deepEqual(y2026.annualTransformations.map(t=>t.transformation+':'+t.star),['화록:천동','화권:천기','화과:문창','화기:염정']);
  assert.equal(y2027.annualStem,'정');
  assert.deepEqual(y2027.annualTransformations.map(t=>t.transformation+':'+t.star),['화록:태음','화권:천동','화과:천기','화기:거문']);
  assert.ok([y2026,y2027].flatMap(y=>y.annualTransformations).every(t=>t.palaceName.endsWith('궁')));
 }
 assert.equal(JSON.stringify(contexts.ziwei),before,'stored context stays untouched');
});

test('saju question month rows run to the end of the asked period from the same engine',async()=>{
 const decision={version:m.QUESTION_POLICY_VERSION,category:'job_change',target:'self',horizon:'current',situation:'이직 고민',options:'남기 / 옮기기',period:'2026년 4분기부터 2027년 상반기',constraints:'',confirmed:true};
 const period=m.consultationPeriod('내년 상반기에 이직할까? '+decision.period,m.consultationClock('Asia/Seoul',new Date('2026-09-29T03:00:00Z')),true);
 assert.deepEqual([period.start,period.end],['2026-10-01','2027-06-30']);
 const engine=m.domains.saju,input=engine.validateInput({personA:birth,readingMode:'personal'}),years=[];
 const saju=await m.questionPeriodTiming(contexts.saju,decision,period,'2026-09-29',async year=>{years.push(year);
  return (await engine.calculate(input,{asOf:`${year}-07-01`})).facts.find(f=>f.label==='monthlyLuck').value;});
 assert.deepEqual(years,[2027]);
 const months=saju.facts.find(f=>f.label==='monthlyLuck').value.map(r=>`${r.start.year}-${r.start.month} ${r.pillar}`);
 // 절입 월: 2026-12 대설 庚子 → 2027-01 소한 辛丑 … 2027-06 망종 丙午. The 2027-07 소서 row is past the period end.
 assert.deepEqual(months.slice(-7),['2026-12 庚子','2027-1 辛丑','2027-2 壬寅','2027-3 癸卯','2027-4 甲辰','2027-5 乙巳','2027-6 丙午']);
 assert.equal(contexts.saju.facts.find(f=>f.label==='monthlyLuck').value.at(-1).start.year,2026,'stored context stays untouched');
 // A transition question reads 대운 only; nothing is recalculated.
 assert.equal(await m.questionPeriodTiming(contexts.saju,{...decision,horizon:'transition'},period,'2026-09-29',async()=>assert.fail()),contexts.saju);
});

test('vedic transition evidence lists every remaining antardasha of the current mahadasha, ending with its true last one',()=>{
 const decision={version:m.QUESTION_POLICY_VERSION,category:'timing',target:'self',horizon:'transition',situation:'이직 고민',options:'',period:'2026년 4분기부터 2027년 상반기',constraints:'',confirmed:true};
 const timing=ctx=>m.questionEvidence(ctx,decision,'언제 옮길까?','2026-09-29').facts.find(f=>f.label==='questionTiming').value;
 const dasha=contexts.vedic.facts.find(f=>f.label==='vimshottariDasha').value;
 const list=timing(contexts.vedic).periods[0].remainingAntardashas;
 assert.deepEqual(list[0],dasha.currentAntardasha);
 assert.equal(list.at(-1).endDate,dasha.currentMahadasha.endDate);
 for(let i=1;i<list.length;i++)assert.equal(list[i].startDate,list[i-1].endDate);
 assert.match(timing(contexts.vedic).rule,/목록에 없는 안타르다샤를 마지막이라고 부르지 않는다/);
 // Y3: Moon MD whose current AD is Venus. Its last AD is Sun, not Venus. Dates are cut from the engine's full-precision MD.
 const moon={lord:'Moon',start:'2018-01-21T05:00:00.000Z',end:'2028-01-22T05:00:00.000Z',startDate:'2018-01-21',endDate:'2028-01-22'};
 const mars={lord:'Mars',start:moon.end,end:'2035-01-22T00:00:00.000Z',startDate:'2028-01-22',endDate:'2035-01-22'};
 const y3={...contexts.vedic,facts:[{id:'vedic.dasha',label:'dasha',value:{timeline:[moon,mars]}},
  {id:'vedic.vimshottariDasha',label:'vimshottariDasha',value:{currentMahadasha:{lord:'Moon',startDate:moon.startDate,endDate:moon.endDate},currentAntardasha:{lord:'Venus',startDate:'2025-11-21',endDate:'2027-07-23'},periods:[moon,mars]}}]};
 const value=timing(y3);
 assert.deepEqual(value.periods[0].remainingAntardashas,[{lord:'Venus',startDate:'2025-11-21',endDate:'2027-07-23'},{lord:'Sun',startDate:'2027-07-23',endDate:'2028-01-22'}]);
 // Without the engine's precise MD the list is left out rather than rebuilt from day-truncated dates.
 assert.equal(timing({...y3,facts:y3.facts.slice(1)}).periods[0].remainingAntardashas,undefined);
 assert.equal(value.periods[1].lord,'Mars');
});

test('astrology question chapters are told up front that a birth chart cannot rank the asked period',async()=>{
 const decision={version:m.QUESTION_POLICY_VERSION,category:'job_change',target:'self',horizon:'current',situation:'이직 고민',options:'남기 / 옮기기',period:'2026년 4분기부터 2027년 상반기',constraints:'',confirmed:true};
 const sent=async(domain,chapter)=>{let request;
  const provider=new m.StructuredChapterProvider({generate:async r=>{request=r;return {result:{},provider:'mock',model:'fixture'};}});
  await provider.generateChapter({chapter,analysis:{contexts:{[domain]:contexts[domain]},question:'이직할까?',themes:[],signals:[]},previous:[]});
  return request.domainRules;};
 for(const chapter of m.questionManifest('astrology','salmon',decision,undefined,'이직할까?'))
  assert.match(await sent('astrology',chapter),/출생 차트만으로는 요청 기간 안의 좋은 시기를 특정할 수 없다/,chapter.id);
 for(const chapter of m.questionManifest('saju','salmon',decision,undefined,'이직할까?'))
  assert.doesNotMatch(await sent('saju',chapter),/timingLimit/,chapter.id);
});

test('later chapters receive the question chapter answers as settled conclusions',async()=>{
 const decision={version:m.QUESTION_POLICY_VERSION,category:'job_change',target:'self',horizon:'current',situation:'이직 고민',options:'남기 / 옮기기',period:'2026년 4분기부터 2027년 상반기',constraints:'',confirmed:true};
 const [,chapter]=m.questionManifest('saju','salmon',decision,undefined,'이직할까?');
 const sent=async previous=>{let request;
  const provider=new m.StructuredChapterProvider({generate:async r=>{request=r;return {result:{},provider:'mock',model:'fixture'};}});
  await provider.generateChapter({chapter,analysis:{contexts:{saju:contexts.saju},question:'이직할까?',themes:[],signals:[]},previous});
  return JSON.parse(request.domainRules);};
 // T: Q1 said the move is the better side, ch4 later said staying matters more.
 const q1={summary:'이직 준비 쪽이 더 긍정적이야.',example:'',topics:[],questionAnswers:[{questionId:'Q1',answer:'이직 준비 쪽이 더 긍정적이야. 다만 수입 공백은 줄여야 해.',reason:'',timing:'',action:''}]};
 const rules=await sent([q1]);
 assert.deepEqual(rules.fixedConclusions.answers,[{questionId:'Q1',answer:q1.questionAnswers[0].answer}]);
 assert.match(rules.fixedConclusions.rule,/바꾸거나 반대 방향으로 쓰지 않는다/);
 assert.match(rules.fixedConclusions.rule,/summary에는 이 결론 문장을 다시 쓰지 않는다/);
 assert.equal((await sent([{summary:'s',example:'',topics:[]}])).fixedConclusions,undefined);
 // D4: evidence already explained is listed once so the next chapter refers back instead of re-explaining it.
 const explained=(await sent([{...q1,sources:['saju.pillars','saju.dayMaster']},{summary:'t',example:'',topics:[],sources:['saju.pillars']}])).explainedEvidence;
 assert.deepEqual(explained.ids,['saju.pillars','saju.dayMaster']);
 assert.match(explained.rule,/한 줄로만 짚고/);
 assert.equal((await sent([{summary:'s',example:'',topics:[]}])).explainedEvidence,undefined);
});
