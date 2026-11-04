import fs from 'node:fs';
import ts from 'typescript';
import '../../tools/oracle/next-delivery/guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import vm from 'node:vm';
import { calculateZiweiConsumerChart } from '../../worker/lib/ziwei-consumer-chart.js';
import { calculateZiweiAiChart } from '../../worker/lib/ziwei-ai-chart.js';
import { prepareZiweiExecutionChart } from '../../worker/lib/ziwei-execution-adapter.js';
import { resolveZiweiPreparation } from '../../worker/lib/ziwei-calculation-preparation.js';
const input={birthDate:'2000-05-15',birthTime:'08:30',calendarType:'solar',gender:'male'};
const clone=x=>JSON.parse(JSON.stringify(x));
const compiled=await build({stdin:{contents:"export * from './worker/yeongnyangi/fortune/shared/consumer-facts.ts';export * from './worker/yeongnyangi/fortune/shared/privacy.ts';",resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'cjs',plugins:[{name:'deny',setup(b){b.onResolve({filter:/.*/},a=>{if(!a.path.startsWith('.')||/swiss|ephemeris|sweph|models|db\.js/.test(a.path))throw Error('BLOCKED:'+a.path)})}}]});
const sandbox=vm.createContext({module:{exports:{}},TextEncoder});vm.runInContext(compiled.outputFiles[0].text,sandbox);const api=sandbox.module.exports;
test('new ziwei server selection is OFF by default and body cannot select it',()=>{
 for(const env of [{},{ZIWEI_CALENDAR_AUTHORITY_V2:true},{ZIWEI_CALENDAR_AUTHORITY_V2:'false'}])assert.deepEqual(calculateZiweiConsumerChart({...input,calendarAuthorityV2:true},{env,year:2026}),calculateZiweiAiChart({...input,calendarAuthorityV2:true},{year:2026}));
});
test('approved ziwei selection shares exact chart across adapter and consumers',()=>{
 const chart=calculateZiweiConsumerChart(input,{env:{ZIWEI_CALENDAR_AUTHORITY_V2:'true'},year:2026});
 assert.deepEqual(chart,prepareZiweiExecutionChart(input,{calendarAuthorityV2:true,year:2026}));
 assert.equal(chart.lunar.source,'kasi-jpl-expanded-20261101');
});
const ziweiOn={env:{ZIWEI_CALENDAR_AUTHORITY_V2:'true'},year:2026};
test('dates outside the verified lunar table keep the current chart instead of failing',()=>{
 for(const birth of [{...input,birthDate:'1988-05-15'},{...input,birthDate:'1965-02-10',birthTime:'03:00'},{...input,birthDate:'1975-03-08',calendarType:'lunar'},{...input,birthDate:'1993-05-15',birthTime:'',birthTimeUnknown:true}]){
  const chart=calculateZiweiConsumerChart(birth,ziweiOn);
  assert.deepEqual(chart,calculateZiweiAiChart(birth,{year:2026}));
  assert.notEqual(chart.lunar.source,'kasi-jpl-expanded-20261101');
 }
});
test('verified dates use the new table for every birth-time and place shape',()=>{
 for(const birth of [{...input,birthTime:'',birthTimeUnknown:true},{...input,birthPlace:{name:'부산',latitude:35.1796,longitude:129.0756,timezone:'Asia/Seoul'}},{...input,birthDate:'2000-03-08',calendarType:'lunar'}]){
  const chart=calculateZiweiConsumerChart(birth,ziweiOn);
  assert.equal(chart.lunar.source,'kasi-jpl-expanded-20261101');
  assert.deepEqual(chart.palaces,calculateZiweiAiChart(birth,{year:2026}).palaces);
 }
});
test('invalid birth input still fails under the new selection',()=>{
 assert.throws(()=>calculateZiweiConsumerChart({...input,birthDate:'2000-13-40'},ziweiOn),/INVALID/);
});
function preparationModel(){
 const rows=new Map();
 return {rows,findById:id=>({lean:async()=>rows.has(id)?clone(rows.get(id)):null}),create:async row=>{rows.set(row._id,clone(row));}};
}
const prepared=(model,birth,extra={})=>resolveZiweiPreparation({model,userId:'user-1',requestId:'request-key-0001',inputHash:'hash-'+birth.birthDate,input:birth,rawBody:{calculationProtocol:'ziwei-prepared-v1'},action:'prepare',year:2026,calendarAuthorityV2:true,...extra});
test('preparation records the calendar the chart actually used and generate reuses it',async()=>{
 for(const [birthDate,version] of [['1988-05-15','legacy'],['2000-05-15','kasi-jpl-expanded-20261101']]){
  const model=preparationModel(),birth={...input,birthDate};
  const first=await prepared(model,birth);
  assert.equal([...model.rows.values()][0].authorityVersion,version);
  const again=await prepared(model,birth,{action:'generate'});
  assert.equal(again.preparationId,first.preparationId);assert.deepEqual(again.chart,first.chart);
 }
});
test('a request prepared before rollout still generates; a lost prepared request does not recalculate',async()=>{
 const birth={...input,birthDate:'1988-05-15'};
 const oldClient=await prepared(preparationModel(),birth,{action:'generate',rawBody:{}});
 assert.equal(oldClient.preparationId,null);
 assert.deepEqual(oldClient.chart,calculateZiweiAiChart(birth,{year:2026}));
 await assert.rejects(prepared(preparationModel(),birth,{action:'generate'}),/CALCULATION_PREPARATION_REQUIRED/);
});
test('saved ziwei basis survives OFF, year change and legacy storage; missing partial basis fails closed',()=>{
 const chart=calculateZiweiConsumerChart(input,{env:{ZIWEI_CALENDAR_AUTHORITY_V2:'true'},year:2026});
 for(const existing of [{status:'partial',llmMeta:{chartSnapshot:chart}},{status:'completed',ziweiChart:chart}])assert.deepEqual(calculateZiweiConsumerChart({}, {existing,year:2030}),chart);
 assert.throws(()=>calculateZiweiConsumerChart(input,{existing:{status:'partial'}}),/SNAPSHOT_REQUIRED/);
});
test('new ziwei/tarot facts survive JSON storage, permit added explanations, reject changed facts and retain null',()=>{
 for(const domain of ['ziwei','tarot']){
  const c={domain,engineVersion:'existing-v1',calculatedAt:'fixed',facts:[{id:domain+'.basis',label:'basis',value:{candidate:['a'],final:null,status:'pending'}}],limitations:['unknown time']};
  assert.equal(api.pinDomainFacts(c,{}),c);
  const saved=clone(api.pinDomainFacts(c,{birthDate:'private'},{runtimeEnv:{[domain.toUpperCase()+'_CONSUMER_FACTS_V1']:'true'},asOf:'2026-11-02'}));
  assert.deepEqual(clone(api.validateDomainFacts(saved)),saved);
  saved.facts[0].value.explanation='derived only';api.validateDomainFacts(saved);
  const changed=clone(saved);changed.facts[0].value.final='a';assert.throws(()=>api.validateDomainFacts(changed),/MISMATCH/);
  const missing=clone(saved);missing.facts=[];assert.throws(()=>api.validateDomainFacts(missing),/MISMATCH/);
  const lost=clone(saved);delete lost.engineFacts;assert.throws(()=>api.validateDomainFacts(lost),/SNAPSHOT_REQUIRED/);
  const corrupt=clone(saved);corrupt.engineFacts.support='confirmed';assert.throws(()=>api.validateDomainFacts(corrupt),/SNAPSHOT_INVALID/);
  const prompt=clone(api.explanationFacts(saved));assert.equal(prompt.engineFacts.digest,saved.engineFacts.digest);assert.equal(prompt.engineFacts.facts,undefined);assert.ok(!JSON.stringify(prompt).includes('private'));
 }
});
test('Swiss systems do not acquire rollout through generic domain flags',()=>{
 for(const domain of ['astrology','vedic','sukuyo']){const c={domain,facts:[],limitations:[],engineVersion:'old',calculatedAt:'fixed'};assert.equal(api.pinDomainFacts(c,{}, {runtimeEnv:{[domain.toUpperCase()+'_CONSUMER_FACTS_V1']:'true'}}),c)}
});


test('real Ziwei domain feeds the same pinned chart to basic view and chapter facts; legacy remains unpinned',async()=>{
 const built=await build({stdin:{contents:"export {ziwei} from './worker/yeongnyangi/fortune/ziwei/index.ts';export {chartView} from './worker/yeongnyangi/fortune/charts.ts';export {selectChapterFacts} from './worker/yeongnyangi/fortune/chapter-facts.ts';",resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'cjs',plugins:[{name:'deny',setup(b){b.onResolve({filter:/.*/},a=>{
  if(a.path === '@/lib/r2-public-url')return {path:process.cwd()+'/lib/r2-public-url.ts'};
  if(a.path.endsWith('/relationship-calculation'))return {path:'relationship',namespace:'blocked'};
  if(!a.path.startsWith('.')||/swiss|ephemeris|sweph|models|db\.js/.test(a.path))throw Error('BLOCKED:'+a.path);
 });b.onLoad({filter:/.*/,namespace:'blocked'},()=>({contents:"export function calculateRelationshipZiwei(){throw Error('RELATIONSHIP_GRAPH_BLOCKED')}"}));}}]});
 const ctx=vm.createContext({module:{exports:{}},TextEncoder,structuredClone,console,process:{env:{NEXT_PUBLIC_ASSETS_BASE_URL:'https://mock.test'}}});vm.runInContext(built.outputFiles[0].text,ctx);const real=ctx.module.exports;
 const request={personA:input,question:'일과 관계에서 어떤 선택을 할까요?'};
 const off=await real.ziwei.calculate(request,{asOf:'2026-11-02'});assert.equal(off.engineFacts,undefined);
 const c=await real.ziwei.calculate(request,{asOf:'2026-11-02',runtimeEnv:{ZIWEI_CALENDAR_AUTHORITY_V2:'true'}});
 const saved=clone(real.ziwei.buildContext(c));const view=real.chartView(saved);assert.equal(view.domain,'ziwei');
 const facts=real.selectChapterFacts(saved,{key:'test',version:'legacy'});assert.ok(facts.length);assert.equal(saved.engineFacts.facts.facts.find(f=>f.label==='calculationBasis').value.calendarSource,'kasi-jpl-expanded-20261101');
 const prompt=real.ziwei.buildPrompt(request,saved,'mackerel');assert.ok(prompt.calculatedData.facts.length);assert.equal(prompt.calculatedData.engineFacts.digest,saved.engineFacts.digest);
 const corrupted=clone(saved);corrupted.facts.find(f=>f.label==='lifePalace').value='wrong';assert.throws(()=>real.chartView(corrupted),/MISMATCH/);assert.throws(()=>real.selectChapterFacts(corrupted,{key:'test'}),/MISMATCH/);
});

test('basic tarot result preserves cards and narrative through its existing engine metadata',async()=>{
 const {pinTarotBasicResult}=await import('../../worker/lib/tarot-fact-consumer.js');
 const result={cards:[{cardId:'M00',orientation:'upright'}],reading:{summary:'original'},spreadType:'one_card',engineMeta:{questionType:'general'}};
 assert.equal(pinTarotBasicResult(result,{},{}),result);
 const pinned=pinTarotBasicResult(result,{TAROT_CONSUMER_FACTS_V1:'true'},{question:'q'});
 assert.deepEqual(pinned.cards,result.cards);assert.deepEqual(pinned.reading,result.reading);
 assert.deepEqual(clone(pinned.engineMeta.engineFacts.facts),{cards:result.cards,reading:result.reading});
});


test('actual master-love and neo chart consumers use one approved selection for both people',async()=>{
 function load(ctx,file,name){const ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);const fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert.ok(fn);vm.runInContext(fn.getText(ast).replace(/^export /,''),ctx)}
 const {calculateLifeBookAiSaju}=await import('../../worker/lib/life-book-ai-saju.js');
 const {buildCodexConsultation}=await import('../../worker/lib/master-love-codex-consultation.js');
 const env={ZIWEI_CALENDAR_AUTHORITY_V2:'true'}, now=new Date('2026-11-02T00:00:00Z');
 const normalized={birthInfo:input,partnerInfo:{...input,gender:'female'}};
 const ctx=vm.createContext({Date,calculateZiweiConsumerChart,calculateLifeBookAiSaju,asObject:v=>v,clean:v=>String(v||''),buildMasterLoveCodexCompatibility:()=>({mock:true})});
 load(ctx,'worker/routes/master-love-codex.js','buildCharts');const pair=ctx.buildCharts(normalized,now,env);
 assert.equal(pair.ziweiChart.lunar.source,'kasi-jpl-expanded-20261101');assert.equal(pair.partnerZiweiChart.lunar.source,pair.ziweiChart.lunar.source);
 const consultation=buildCodexConsultation({questions:['관계의 흐름은?']},'compat',pair,input,normalized.partnerInfo,now);assert.ok(consultation.records.some(r=>r.system==='ziwei'));
 Object.assign(ctx,{summarizeZiwei:chart=>({chart}),withCompat:(summary,_input,_system,self,partner)=>({...summary,self,partner})});load(ctx,'worker/routes/neo-operation-room.js','calculateMethodSummary');
 const neo=await ctx.calculateMethodSummary(env,{input:{selectedMethod:'ziwei',birthInfo:input,partnerBirthInfo:normalized.partnerInfo}},{});
 assert.equal(neo.self.lunar.source,'kasi-jpl-expanded-20261101');assert.equal(neo.partner.lunar.source,neo.self.lunar.source);
});
test('island report, heukwol and karma read the approved chart for new calculations',async()=>{
 const { __ziweiIslandReportTestUtils:island } = await import('../../worker/routes/ziwei-island-report.js');
 const { buildHeukwolAnalysis } = await import('../../worker/lib/heukwol-analysis.js');
 const { buildKarmaDestinyIntegratedResult } = await import('../../worker/lib/karma-destiny-ai-calculations.js');
 const env={ZIWEI_CALENDAR_AUTHORITY_V2:'true'},date='1903-10-28',now=new Date('2026-11-04T00:00:00Z');
 const islandBody={birthDate:date,birthTime:'08:30',calendarType:'solar',gender:'female',date:'2027-01-01'};
 assert.notDeepEqual(island.buildReportFromBirth(islandBody,env),island.buildReportFromBirth(islandBody));
 const birth={date,time:'08:30',timeKnown:true,gender:'female'};
 assert.notDeepEqual(buildHeukwolAnalysis(birth,2027,now,{env}),buildHeukwolAnalysis(birth,2027,now));
 const karmaBirth={birthDate:date,birthTime:'08:30',calendarType:'solar',gender:'female'};
 const on=await buildKarmaDestinyIntegratedResult(env,karmaBirth),off=await buildKarmaDestinyIntegratedResult({},karmaBirth);
 assert.notDeepEqual(on.lenses.ziwei.data,off.lenses.ziwei.data);
});
