import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),Module=require('node:module');
const built=await build({stdin:{contents:`export * from './worker/yeongnyangi/fortune/saju/jong-check'; export * from './worker/yeongnyangi/fortune/saju/jong-check-policy'; export {calculateScreenSaju} from './worker/yeongnyangi/fortune/saju/runtime'; export {saju} from './worker/yeongnyangi/fortune/saju'; export {getProduct} from './worker/yeongnyangi/payments/catalog';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false});
const loaded=new Module(path.resolve('jong-check-tests.cjs'));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(built.outputFiles[0].text,loaded.id);
const {jongCheckYears,parseJongAnswer,jongCheckApplies,calculateScreenSaju,saju,getProduct}=loaded.exports;

const gokjik={isJong:true,name:'곡직격(曲直格)',dominant:'wood',parEl:'water',dayEl:'wood'};
const years=list=>list.map(y=>y.year);

test('question years: strict stem+branch matches only, most recent three, shown ascending',()=>{
  const check=jongCheckYears(gokjik,{birthYear:1984,asOfYear:2026});
  assert.deepEqual(years(check.best),[2022,2023]);
  assert.deepEqual(years(check.worst),[2017,2018,2021]);
  assert.equal(check.best[0].ganji,'壬寅(임인)');
  // 甲辰·乙巳 match only one side of 용신 — the original filled with them, the port does not.
  assert.ok(!years(check.best).includes(2024)&&!years(check.best).includes(2025));
  assert.equal(jongCheckYears({isJong:false},{birthYear:1984,asOfYear:2026}),null);
});

test('question years: counted from the consultation year and the real birth year, skipped under two',()=>{
  assert.equal(jongCheckYears(gokjik,{birthYear:1984,asOfYear:2023}),null,'only 2022 is left on the good side');
  assert.deepEqual(years(jongCheckYears(gokjik,{birthYear:2008,asOfYear:2026}).worst),[2017,2018,2021]);
  assert.equal(jongCheckYears(gokjik,{birthYear:2010,asOfYear:2026}),null,'years up to age 8 are not asked');
});

test('answer body: absent stays absent, malformed fails closed, unknown keys are dropped',()=>{
  assert.equal(parseJongAnswer(undefined),undefined);
  assert.deepEqual(parseJongAnswer({best:'no',worst:'unsure',bestYears:[2022,2023],worstYears:[2017],extra:1}),{best:'no',worst:'unsure',bestYears:[2022,2023],worstYears:[2017]});
  for(const bad of [{best:'yes'},{best:'maybe',worst:'no',bestYears:[2022],worstYears:[2017]},{best:'yes',worst:'no',bestYears:[],worstYears:[2017]},{best:'yes',worst:'no',bestYears:['2022'],worstYears:[2017]},'yes'])
    assert.throws(()=>parseJongAnswer(bad),{code:'INVALID_JONG_CHECK'});
});

test('only the three tiers that keep 종격 evidence ask the question',()=>{
  assert.deepEqual(['saju_mackerel','saju_salmon','saju_flounder','saju_tuna','fusion_saju_ziwei','fusion_sukuyo_vedic','fusion_all'].filter(id=>jongCheckApplies(getProduct(id))),['saju_tuna','fusion_saju_ziwei','fusion_all']);
});

// 1975-01-22 14:00 is a 가색격 candidate: good 2006·2009·2018, hard 2020·2022·2023 as of 2026.
const person={birthDate:'1975-01-22',birthTime:'14:00',calendarType:'solar',gender:'female'};
const asked=calculateScreenSaju(person,new Date('2026-09-27')).jongCheck;
const answer=(best,worst,shift=0)=>({best,worst,bestYears:years(asked.best).map(y=>y+shift),worstYears:years(asked.worst)});
const run=async jongAnswer=>{
  const c=await saju.calculate(saju.validateInput({personA:person}),{asOf:'2026-09-27',jongAnswer});
  return {fact:label=>c.facts.find(f=>f.label===label)?.value,limitations:c.limitations};
};

test('saju reading: both "no" reverts to 억부, both "yes" confirms, anything else keeps the conditional note',async()=>{
  assert.deepEqual(years(asked.best),[2006,2009,2018]);
  const base=await run();
  assert.equal(base.fact('jong').confirmationRequired,true);
  assert.ok(base.limitations.some(l=>l.includes('조건부')));

  const rejected=await run(answer('no','no'));
  assert.equal(rejected.fact('jong').isJong,false);
  assert.equal(rejected.fact('jong').rejectedByUser,true);
  assert.equal(rejected.fact('jong').candidateName,base.fact('jong').name);
  assert.notDeepEqual(rejected.fact('usefulGod'),base.fact('usefulGod'));
  assert.ok(rejected.fact('strengthHeuristic').eokbuYongshin.every(el=>rejected.fact('usefulGod').includes(el)));
  assert.ok(rejected.limitations.some(l=>l.includes('일반격(억부)'))&&!rejected.limitations.some(l=>l.includes('조건부')));

  const confirmed=await run(answer('yes','yes'));
  assert.equal(confirmed.fact('jong').confirmedByUser,true);
  assert.equal(confirmed.fact('jong').confirmationRequired,false);
  assert.deepEqual(confirmed.fact('usefulGod'),base.fact('usefulGod'));
  assert.ok(!confirmed.limitations.some(l=>l.includes('조건부')||l.includes('일반격')));

  for(const unchanged of [answer('yes','no'),answer('unsure','no'),answer('no','no',1)]){
    const r=await run(unchanged);
    assert.deepEqual(r.fact('jong'),base.fact('jong'));
    assert.deepEqual(r.limitations,base.limitations);
  }
});

test('saju reading: the partner chart never receives the answer',async()=>{
  const c=await saju.calculate(saju.validateInput({personA:person,personB:person,readingMode:'compatibility'}),{asOf:'2026-09-27',jongAnswer:answer('no','no')});
  assert.ok(c.limitations.some(l=>l.includes('일반격(억부)')));
  assert.ok(c.limitations.some(l=>l.startsWith('상대: ')&&l.includes('조건부')));
});
