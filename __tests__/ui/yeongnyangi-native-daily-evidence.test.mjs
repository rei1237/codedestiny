import '../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import ts from 'typescript';
const root=process.cwd();
const mocked={name:'daily-transports',setup(b){
 b.onResolve({filter:/(fortune-today\.js|^\.\/index$)/},args=>{
  if(!args.importer.replaceAll('\\','/').endsWith('/fortune/daily-cross.ts'))return;
  return {path:args.path,namespace:'daily-fixture'};
 });
 b.onLoad({filter:/.*/,namespace:'daily-fixture'},args=>({contents:args.path.includes('fortune-today')
  ? `export async function buildTodayFortunes(_env,_input,_today,options){globalThis.__nativeDailyCalls.push(options);return globalThis.__nativeDailyCards;}`
  : `export const domains={saju:{validateInput:v=>v,calculate:async()=>{globalThis.__nativeSajuCalls++;return {facts:[{id:'saju.yearlyLuck',label:'yearlyLuck',value:[{year:2026}]}]};}}};`,loader:'js'}));
}};
const bundle=await build({stdin:{contents:`export * from './worker/yeongnyangi/fortune/daily-cross';export {buildEvidencePacket} from './worker/yeongnyangi/fortune/ask/packet';export {createConsultation} from './worker/yeongnyangi/fortune/consultation';export {ruleAnalysis,parseAskAnalysis} from './worker/yeongnyangi/fortune/ask/analysis';export {validateAskChapter} from './worker/yeongnyangi/fortune/ask/validate';`,resolveDir:root,loader:'ts'},bundle:true,plugins:[mocked],format:'esm',platform:'node',write:false});
const m=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const systems=['saju','ziwei','sukuyo','vedic','astrology','tarot'];
const cards=Object.fromEntries(['saju','sukuyo','vedic','number'].map(system=>[system,{system,anchor:'계산된 일운',score:70,day:'2026-09-30'}]));
const raw={personA:{birthDate:'1990-06-15',birthTime:'14:30',gender:'female',calendarType:'solar'}};
const service=readFileSync('worker/yeongnyangi/service.ts','utf8');
const serviceAst=ts.createSourceFile('service.ts',service,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
let crossInitializer;
function findCross(node){if(ts.isVariableDeclaration(node)&&node.name.getText(serviceAst)==='crossDaily')crossInitializer=node.initializer.getText(serviceAst);ts.forEachChild(node,findCross);}
findCross(serviceAst);assert.ok(crossInitializer);
const prepareDaily=new Function('product','kind','spiritInput','relationship','tarotV2','env','raw','date','computeCrossDaily','return '+crossInitializer);
for(const domain of systems)test(domain+': a new single-system request never recalculates hub birth or cross-system evidence',async()=>{
 globalThis.__nativeDailyCalls=[];globalThis.__nativeSajuCalls=0;globalThis.__nativeDailyCards=cards;
 const before=JSON.stringify(cards);
 for(const kind of [undefined,{question:true},{question:false}]){
  const facts=await prepareDaily({readingKind:'single',systems:[domain]},kind,false,false,false,{},raw,'2026-09-30',m.computeCrossDaily);
  assert.deepEqual(facts,[]);
 }
 assert.equal(globalThis.__nativeSajuCalls,0);assert.deepEqual(globalThis.__nativeDailyCalls,[]);
 assert.equal(JSON.stringify(cards),before,'input cards are never mutated');
});
test('legacy and fusion callers retain their original cross facts and calculation contract',async()=>{
 for(const selected of [['ziwei'],['vedic','saju'],['ziwei','astrology']]){
  globalThis.__nativeDailyCalls=[];globalThis.__nativeSajuCalls=0;globalThis.__nativeDailyCards=cards;
  const facts=await m.computeCrossDaily({},raw,'2026-09-30',selected);
  assert.deepEqual(facts.map(f=>f.label),['todaySaju','todaySukuyo','todayVedic','todayNumerology',...(!selected.includes('saju')?['sajuYearlyLuck']:[])]);
  assert.deepEqual(globalThis.__nativeDailyCalls,[{wantDetail:true}]);
  assert.equal(globalThis.__nativeSajuCalls,selected.includes('saju')?0:1);
 }
 assert.match(crossInitializer,/product.readingKind!=='single'/);
 assert.ok(service.indexOf('return await readRequest(env,userId,id)')<service.indexOf('const crossDaily='),'saved purchase intent is read before new daily calculations');
});
test('a new fusion question still calls the original hub contract',async()=>{
 globalThis.__nativeDailyCalls=[];globalThis.__nativeSajuCalls=0;globalThis.__nativeDailyCards=cards;
 const facts=await prepareDaily({readingKind:'fusion',systems:['vedic','saju']},{question:true},false,false,false,{},raw,'2026-09-30',m.computeCrossDaily);
 assert.deepEqual(facts.map(f=>f.label),['todaySaju','todaySukuyo','todayVedic','todayNumerology']);
 assert.deepEqual(globalThis.__nativeDailyCalls,[{wantDetail:true}]);assert.equal(globalThis.__nativeSajuCalls,0);
});

test('native chart timing remains available without borrowing a daily hub interpretation',()=>{
 const examples={saju:{label:'yearlyLuck',value:[{year:2026,stem:'병',branch:'오'}]},vedic:{label:'vimshottariDasha',value:{currentMahadasha:{lord:'Moon',startDate:'2025-01-01',endDate:'2030-01-01'}}},astrology:{label:'transits',value:{date:'2026-09-30',Moon:{sign:'Aries'}}}};
 for(const [domain,fact] of Object.entries(examples)){
  const context={domain,engineVersion:'mock',calculatedAt:'2026-09-30',limitations:[],facts:[{id:domain+'.'+fact.label,...fact}]};
  const before=JSON.stringify(context);
  const packet=m.buildEvidencePacket({contexts:{[domain]:context},today:'2026-09-30',locale:'ko',tier:'tuna',birthProfileAvailable:true,birthTimeKnown:true});
  assert.ok(packet.timing.length,domain+' native date evidence is preserved');
  assert.ok(packet.timing.every(f=>f.source.factId.startsWith(domain+'.')));
  assert.equal(JSON.stringify(context),before);
 }
});
test('a native-only packet with no timing keeps limited answers, and rejects a claimed grounded event date',()=>{
 const context={domain:'sukuyo',engineVersion:'mock',calculatedAt:'2026-09-30',limitations:[],facts:[{id:'sukuyo.personA',label:'personA',value:{nameKo:'각',index:0}}]};
 const packet=m.buildEvidencePacket({contexts:{sukuyo:context},today:'2026-09-30',locale:'ko',tier:'mackerel',birthProfileAvailable:true,birthTimeKnown:true});
 assert.deepEqual(packet.timing,[]);assert.ok(packet.facts.length);
 const consultation=m.createConsultation('언제 이 선택의 결과를 확인할 수 있을까요?','general',{asOf:'2026-09-30',timezone:'Asia/Seoul'},[{id:'main'}]);
 const analysis=m.ruleAnalysis(consultation);assert.equal(analysis.questions[0].needsTiming,true);
 const answer={questionId:'q1',answer:'현재 계산 근거만으로 사건의 시기를 정하기 어려워요.',reason:'본명숙의 출생 성향은 선택 습관을 돌아보는 단서예요.',timing:'사건 날짜 대신 다음 행동을 한 뒤 변화를 점검해 보세요.',action:'선택 기준을 적고 실제 변화를 관찰해 보세요.',factIds:[packet.facts[0].id],timingIds:[],evidenceStatus:'limited'};
 const body={sources:[packet.facts[0].source.factId],questionAnswers:[answer]};
 assert.equal(m.validateAskChapter(body,consultation,analysis,packet).questionAnswers[0].mode,'limited');
 assert.throws(()=>m.validateAskChapter({...body,questionAnswers:[{...answer,evidenceStatus:'grounded'}]},consultation,analysis,packet),error=>error.code==='ASK_EVIDENCE_INCOMPLETE');
});
test('the source filter does not change a classifier decision about a this-year action question',()=>{
 const consultation=m.createConsultation('올해 업무 선택에서 무엇을 먼저 점검하면 좋을까요?','work',{asOf:'2026-09-30',timezone:'Asia/Seoul'},[{id:'main'}]);
 assert.equal(consultation.period.start,'2026-01-01');
 const parsed=m.parseAskAnalysis(JSON.stringify({questions:[{questionId:'q1',category:'career',needsTiming:false}]}),consultation);
 assert.equal(parsed.questions[0].needsTiming,false);
});
