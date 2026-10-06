import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),Module=require('node:module');
const bundle=await build({stdin:{contents:`
export * from './worker/yeongnyangi/fortune/saju/cycle-evidence';
export * from './worker/yeongnyangi/fortune/counsel-purpose';
export * from './worker/yeongnyangi/fortune/ask/packet';
export * from './worker/yeongnyangi/fortune/ask/prompt';
export * from './worker/yeongnyangi/fortune/ask/validate';
export * from './worker/yeongnyangi/fortune/ask/analysis';
export * from './worker/yeongnyangi/fortune/consultation';
export * from './worker/yeongnyangi/fortune/chapter-facts';
export * from './worker/yeongnyangi/fortune/reading-v7';
export * from './worker/yeongnyangi/fortune/reading-v7-ledger';
export {buildSajuAdvancedFactors} from './worker/lib/saju-ai-prompt.js';
export {calculateScreenSaju} from './worker/yeongnyangi/fortune/saju/runtime';
export {StructuredChapterProvider} from './worker/yeongnyangi/providers/chapter';
`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'},logLevel:'silent'});
const loaded=new Module(path.resolve('purpose-tests.cjs'));loaded.filename=path.resolve("purpose-tests.cjs");loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(bundle.outputFiles[0].text,loaded.filename);
const api=loaded.exports;
const date='2026-10-06';
const cycles=[
  {index:0,pillar:'甲子',startYear:1990,endYear:1999,startAge:5,endAge:14},
  {index:1,pillar:'丙子',startYear:2000,endYear:2009,startAge:15,endAge:24},
  {index:2,pillar:'戊戌',startYear:2020,endYear:2029,startAge:35,endAge:44,isCurrent:true},
  {index:3,pillar:'庚午',startYear:2030,endYear:2039,startAge:45,endAge:54},
];
const context=(values)=>({domain:'saju',engineVersion:'fixture',calculatedAt:date+'T12:00:00Z',limitations:[],facts:Object.entries(values).map(([label,value])=>({id:'saju.'+label,label,value}))});
const source={pillars:{year:'甲子',month:'丙寅',day:'甲申',hour:'癸辰'},dayMaster:'甲',
  strengthHeuristic:{isStrong:true,yongshin:['火'],kijishin:['金'],eokbuYongshin:['火'],johuYongshin:['木']},
  seasonalBalance:{type:'cold',moistType:'wet'},jong:{isJong:false},
  advancedFactors:{promptConfig:{}},majorLuck:{cycles,currentCycle:cycles[2],direction:'순행'},
  yearlyLuck:[{year:2026,pillar:'丙午'},{year:2031,pillar:'辛未'}]};
const updated=api.withSajuCycleEvidence(context(source),date);
const values=Object.fromEntries(updated.facts.map(f=>[f.label,f.value]));
const packet=(tier='tuna',extra={})=>api.buildEvidencePacket({contexts:{saju:updated},today:date,tier,birthTimeKnown:true,includeSajuCycles:true,...extra});
const chapters=Array.from({length:7},(_,i)=>({id:'tuna-'+i,ordinal:i,key:i===6?'action':i===0?'self':'current'+i,title:'기존 장',part:'사주',theme:'self',version:'destiny-book-v6',tier:'tuna',systems:['saju'],factSelectors:{saju:['pillars']},targetChars:[2500,3000],sections:[{id:'interpretation',title:'해석',role:'interpretation',instruction:'근거를 설명한다.',minimumChars:1200,targetChars:[1800,2400]}]}));

test('natal and exclusive cycles do not manufacture dochung; only overlapping annual rows join',()=>{
  assert.equal(values.advancedFactors.doChung.exists,false);
  for(const cycle of values.majorLuck.cycles)assert.equal(cycle.interpretation.doChung.exists,false);
  assert.deepEqual(values.majorLuck.cycles.map(c=>c.interpretation.annual.map(y=>y.year)),[[],[],[2026],[2031]]);
  assert.deepEqual(values.strengthHeuristic,source.strengthHeuristic);
  assert.deepEqual(values.seasonalBalance,{type:'cold',moistType:'wet'});
  assert.deepEqual(context(source).facts.find(f=>f.label==='majorLuck').value,source.majorLuck);
  assert.doesNotMatch(JSON.stringify(values.majorLuck),/summaryForPrompt|promptConfig/);
});
test('storage opening and hidden-stem exposure remain bound to the triggering decade',()=>{
  const past=values.majorLuck.cycles[0].interpretation;
  const now=values.majorLuck.cycles[2].interpretation;
  assert.ok(now.earthStorageOpenings.some(o=>o.sourceBranch==='辰'&&o.triggerBranch==='戌'&&o.relationType==='충'));
  assert.ok(!past.earthStorageOpenings.some(o=>o.triggerBranch==='戌'));
  assert.ok(past.hiddenStemExposures.some(e=>e.hiddenStem==='甲'&&e.exposedByLuckStem));
  assert.ok(values.advancedFactors.hiddenStemExposures.every(e=>!e.exposedByLuckStem));
  const row=now.earthStorageOpenings.find(o=>o.sourceBranch==='辰'&&o.triggerBranch==='戌');
  assert.ok(row.openedHiddenStems.every(h=>h.tenGodFromDayMaster));
  assert.ok(row.openingStrength);
});
test('explicit empty luck rows never inject the machine year; shared default stays intact',()=>{
  const natal=api.buildSajuAdvancedFactors({pillars:{y:{g:'甲',j:'子'},m:{g:'甲',j:'子'},d:{g:'甲',j:'申'},h:{g:'癸',j:'辰'}}},undefined,{luckRows:[]});
  assert.equal(natal.doChung.exists,false);
  const triggered=api.buildSajuAdvancedFactors({pillars:{y:{g:'甲',j:'子'},m:{g:'甲',j:'子'},d:{g:'甲',j:'申'},h:{g:'癸',j:'辰'}}},undefined,{luckRows:[{scope:'daewoon',stem:'丙',branch:'子',label:'1990–1999'}]});
  assert.equal(triggered.doChung.exists,true);assert.equal(triggered.doChung.repeatedCount,3);
  assert.equal(triggered.doChung.inducedOppositeBranch,'午');
});
test('new expert packets carry every cycle; legacy, lower tiers and unknown time do not',()=>{
  assert.equal(packet().timing.filter(t=>t.label.startsWith('majorLuck.')).length,4);
  assert.ok(packet().facts.some(f=>f.label==='advancedFactors'));
  for(const p of [packet('salmon'),packet('tuna',{includeSajuCycles:false}),packet('tuna',{birthTimeKnown:false})]){
    assert.ok(!p.timing.some(t=>t.label.startsWith('majorLuck.')));
    assert.ok(!p.facts.some(t=>t.label==='advancedFactors'));
  }
});
test('mixed questions preserve lifetime, current, named-cycle and year scopes independently',()=>{
  const c=api.createConsultation('대운 전체를 알려줘?\n올해 연애운은?\n다음 대운은?','general',{asOf:date,timezone:'Asia/Seoul'},chapters,true);
  c.counselVersion=api.COUNSEL_VERSION;
  const p=packet(),guide=api.buildAskFirstChapterPrompt(c,api.ruleAnalysis(c),p);
  const majors=q=>q.timingIds.filter(id=>guide.evidence.timing.find(t=>t.id===id).label.startsWith('majorLuck.'));
  assert.equal(majors(guide.questions[0]).length,4);assert.equal(majors(guide.questions[1]).length,0);assert.equal(majors(guide.questions[2]).length,1);
  assert.deepEqual(api.questionCycles('1995년 대운',date,cycles).map(c=>c.index),[0]);
  assert.deepEqual(api.questionCycles('경오 대운',date,cycles).map(c=>c.index),[3]);
  assert.deepEqual(api.questionCycles('갑자 대운',date,cycles).map(c=>c.index),[0]);
  assert.deepEqual(api.questionCycles('40대 대운',date,cycles).map(c=>c.index),[2,3]);
  assert.deepEqual(api.questionCycles('현재와 다음 대운',date,cycles).map(c=>c.index),[2,3]);
  const lower=api.buildAskFirstChapterPrompt(c,api.ruleAnalysis(c),packet('salmon'));
  assert.deepEqual(lower.questions[0].timingIds,[],'annual facts cannot stand in for unavailable decades');
});
test('manifest allocates all cycles exactly once without changing counts or budgets; v6 receives the actual cycles',()=>{
  const result=api.counselManifest(chapters,updated,'tuna','timing','',date);
  assert.equal(result.length,chapters.length);
  assert.deepEqual(result.flatMap(c=>c.counsel.cycleIndexes||[]),cycles.map(c=>c.index));
  assert.deepEqual(result.map(c=>c.targetChars),chapters.map(c=>c.targetChars));
  assert.deepEqual(api.counselManifest(chapters,updated,'tuna','ask','대운 전체는?\n올해 연애운은?',date).flatMap(c=>c.counsel.cycleIndexes||[]),cycles.map(c=>c.index));
  for(const c of result.filter(c=>c.counsel.cycleIndexes)){
    const major=api.selectChapterFacts(updated,c).find(f=>f.label==='majorLuck').value;
    assert.deepEqual(major.cycles.map(x=>x.index),c.counsel.cycleIndexes);
  }
});
test('new provider contracts deliver scoped cycle evidence and plain language; legacy stays unchanged',async()=>{
  const manifest=api.counselManifest(chapters,updated,'tuna','timing','',date);
  const chapter=manifest.find(c=>c.counsel.cycleIndexes);
  for(const locale of ['ko','en','ja','zh-CN']){
    let captured;
    const consultation={...api.createConsultation('','general',{asOf:date,timezone:'Asia/Seoul'},manifest),counselVersion:api.COUNSEL_VERSION,consultationKind:'timing'};
    const provider=new api.StructuredChapterProvider({generate:async request=>{captured=request;throw Error('CAPTURE_ONLY');}});
    await assert.rejects(provider.generateChapter({chapter,locale,previous:[],analysis:{contexts:{saju:updated},themes:[],signals:[],consultation}}),/CAPTURE_ONLY/);
    const rules=JSON.parse(captured.domainRules);
    assert.equal(rules.counselPurpose.writing,api.PLAIN_COUNSEL);
    assert.deepEqual(rules.counselPurpose.cycleIndexes,chapter.counsel.cycleIndexes);
    assert.deepEqual(captured.calculatedData.facts.find(f=>f.label==='majorLuck').value.cycles.map(c=>c.index),chapter.counsel.cycleIndexes);
    assert.match(captured.promptVersion,/purpose-counsel-v1/);
    assert.ok(captured.maxOutputTokens<=24576);
  }
  let legacy;
  const provider=new api.StructuredChapterProvider({generate:async r=>{legacy=r;throw Error('CAPTURE_ONLY');}});
  await assert.rejects(provider.generateChapter({chapter:chapters[1],locale:'ko',previous:[],analysis:{contexts:{saju:context(source)},themes:[],signals:[]}}),/CAPTURE_ONLY/);
  assert.equal(JSON.parse(legacy.domainRules).counselPurpose,undefined);
  assert.doesNotMatch(legacy.promptVersion,/purpose-counsel/);
});
test('past cycle citations pass while a forged out-of-scope cycle is rejected',()=>{
  const consultation={...api.createConsultation('1995년 대운을 알려줘','general',{asOf:date,timezone:'Asia/Seoul'},chapters,true),counselVersion:api.COUNSEL_VERSION};
  const p=packet(),analysis=api.ruleAnalysis(consultation),guide=api.buildAskFirstChapterPrompt(consultation,analysis,p),q=guide.questions[0];
  const cycleId=q.timingIds.find(id=>p.timing.find(t=>t.id===id).label.startsWith('majorLuck.'));
  const factId=q.factIds[0];
  const body={summary:'과거를 돌아보는 상담입니다.',analysis:[],highlights:[],blocks:[],sources:[p.timing.find(t=>t.id===cycleId).source.factId,p.facts.find(f=>f.id===factId).source.factId],questionAnswers:[{questionId:q.questionId,answer:'지나온 시기의 선택을 돌아봅니다.',reason:'계산된 원국과 대운을 함께 살펴봅니다.',timing:'1990년부터 1999년까지의 대운입니다.',action:'기억나는 선택과 습관을 비교해 보세요.',factIds:[factId],timingIds:[cycleId],evidenceStatus:'grounded'}]};
  assert.equal(api.validateAskChapter(body,consultation,analysis,p).questionAnswers[0].mode,'normal');
  const forged=structuredClone(body);forged.questionAnswers[0].timingIds=[p.timing.find(t=>t.label==='majorLuck.3').id];
  assert.throws(()=>api.validateAskChapter(forged,consultation,analysis,p),/ASK_EVIDENCE_INCOMPLETE/);
  const precise=structuredClone(body);precise.questionAnswers[0].timing='1995년 3월 15일에 일이 풀립니다.';
  assert.throws(()=>api.validateAskChapter(precise,consultation,analysis,p),/ASK_UNSUPPORTED_TIMING/);
});
test('v7 cycle ownership resolves to one chapter with references to natal evidence',()=>{
  const product={domain:'saju',fishId:'tuna',readingKind:'single',manifestVersion:'destiny-book-v6',systems:['saju']};
  const original=api.readingManifestV7(product,{id:'ask'});
  const adapted=api.counselManifest(original,updated,'tuna','ask','대운 전체',date);
  const result=api.resolveV7Ledger(adapted,updated);
  for(const cycle of cycles){const id=`saju.majorLuck.cycle${cycle.index}`;assert.equal(result.chapters.filter(c=>c.owns.includes(id)).length,1);}
  for(const c of result.chapters.filter(c=>c.counsel.cycleIndexes)){
    const facts=api.selectV7Facts(updated,c);assert.ok(facts.some(f=>f.label==='advancedFactors'));
    assert.deepEqual(facts.filter(f=>f.label==='majorLuck').map(f=>f.value.cycle.index),c.counsel.cycleIndexes);
  }
});
test('purpose guides distinguish actionable consultation intent',()=>{
  assert.notEqual(api.purposeGuide('money',''),api.purposeGuide('business',''));
  assert.notEqual(api.purposeGuide('love',''),api.purposeGuide('marriage',''));
  assert.match(api.purposeGuide('health',''),/질환/);
  assert.match(api.PLAIN_COUNSEL,/생활에서/);
});
test('actual calculated cycles retain natal identity and fit a bounded evidence packet',t=>{
  const chart=api.calculateScreenSaju({birthDate:'1990-03-18',birthTime:'07:30',gender:'F',calendar:'solar',timezone:'Asia/Seoul'},new Date(date+'T03:00:00Z'));
  const ctx=context({...chart,pillars:{year:chart.yearPillar,month:chart.monthPillar,day:chart.dayPillar,hour:chart.hourPillar},strengthHeuristic:chart.strength});
  const next=api.withSajuCycleEvidence(ctx,date);
  const p=api.buildEvidencePacket({contexts:{saju:next},today:date,tier:'tuna',birthTimeKnown:true,includeSajuCycles:true});
  assert.equal(p.timing.filter(x=>x.label.startsWith('majorLuck.')).length,chart.majorLuck.cycles.length);
  assert.deepEqual(next.facts.find(f=>f.label==='strengthHeuristic').value,chart.strength);
  t.diagnostic(`packet characters: ${JSON.stringify(p).length}; cycles: ${chart.majorLuck.cycles.length}`);
  assert.ok(JSON.stringify(p).length<110000);
});
test('thermal/moisture axes and confirmed or rejected special structure preserve the configured policy',()=>{
  for(const type of ['cold','hot'])for(const moistType of ['wet','dry'])for(const isJong of [true,false]){
    const jong=isJong?{isJong:true,name:'종왕격',confirmedByUser:true}:{isJong:false,rejectedByUser:true};
    const input={...source,seasonalBalance:{type,moistType},jong,usefulGod:['火']};
    const facts=Object.fromEntries(api.withSajuCycleEvidence(context(input),date).facts.map(f=>[f.label,f.value]));
    assert.deepEqual(facts.seasonalBalance,input.seasonalBalance);
    assert.deepEqual(facts.jong,jong);assert.deepEqual(facts.usefulGod,input.usefulGod);
    assert.deepEqual(facts.strengthHeuristic,input.strengthHeuristic);
    if(isJong)assert.equal(facts.advancedFactors.gyeokguk.finalGyeokguk,'종왕격');
  }
});
