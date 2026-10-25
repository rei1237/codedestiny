import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),Module=require('node:module');
const built=await build({stdin:{contents:`export * from './worker/yeongnyangi/fortune/saju/jong-check-policy'; export {calculateScreenSaju} from './worker/yeongnyangi/fortune/saju/runtime'; export {saju} from './worker/yeongnyangi/fortune/saju'; export {getProduct} from './worker/yeongnyangi/payments/catalog';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false});
const loaded=new Module(path.resolve('jong-check-tests.cjs'));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(built.outputFiles[0].text,loaded.id);
const {jongCheckApplies,calculateScreenSaju,saju,getProduct}=loaded.exports;

test('only the three tiers that keep 종격 evidence are flagged by the tier policy',()=>{
  assert.deepEqual(['saju_mackerel','saju_salmon','saju_flounder','saju_tuna','fusion_saju_ziwei','fusion_sukuyo_vedic','fusion_all'].filter(id=>jongCheckApplies(getProduct(id))),['saju_tuna','fusion_saju_ziwei','fusion_all']);
});

// 1975-01-22 14:00 (甲寅 丁丑 戊辰 己未): 丑 정기 己는 戊의 겁재라 월겁격(일반격). 연간 甲과 시간 己는 붙어 있지 않아 합화하지 않는다.
// 1971-03-10 08:00·14:00은 옛 신강/신약 뒤집기 질문을 받던 경계 명식이다.
const person={birthDate:'1975-01-22',birthTime:'14:00',calendarType:'solar',gender:'female'};
const strongSide={...person,birthDate:'1971-03-10',birthTime:'08:00'},weakSide={...strongSide,birthTime:'14:00'};
const oldAnswers=[
  {best:'no',worst:'no',bestYears:[2006,2009,2018],worstYears:[2020,2022,2023]},
  {best:'yes',worst:'yes',bestYears:[2006,2009,2018],worstYears:[2020,2022,2023]},
  {best:'unsure',worst:'no',bestYears:[2007],worstYears:[2021]},
];
const read=async(profile,jongAnswer)=>{
  const c=await saju.calculate(saju.validateInput({personA:profile}),{asOf:'2026-09-27',...(jongAnswer?{jongAnswer}:{})});
  return {facts:c.facts,limitations:c.limitations};
};

test('the screen chart carries no past-year question and no user verdict',()=>{
  const chart=calculateScreenSaju(person,new Date('2026-09-27'));
  assert.equal(chart.jongCheck,undefined);
  assert.equal(chart.jongVerdict,undefined);
  assert.equal(chart.strengthVerdict,undefined);
  assert.equal(chart.jong.isJong,false);
  for(const key of ['rejectedByUser','confirmedByUser','flippedByUser'])assert.equal(chart.jong[key],undefined);
});

test('an old 종격 answer never changes the natal reading',async()=>{
  for(const profile of [person,strongSide,weakSide]){
    const base=await read(profile);
    const fact=label=>base.facts.find(f=>f.label===label)?.value;
    assert.ok(fact('jong')&&fact('strengthHeuristic')&&fact('usefulGod'));
    assert.equal(fact('strengthHeuristic').flippedByUser,undefined);
    assert.ok(!base.limitations.some(l=>/일반격\(억부\)|조건부|반대로/.test(l)));
    for(const answer of oldAnswers)assert.deepEqual(await read(profile,answer),base);
  }
});

test('the partner chart reads the same with or without an old answer',async()=>{
  const input=saju.validateInput({personA:person,personB:strongSide,readingMode:'compatibility'});
  const plain=await saju.calculate(input,{asOf:'2026-09-27'});
  const answered=await saju.calculate(input,{asOf:'2026-09-27',jongAnswer:oldAnswers[0]});
  assert.deepEqual(answered.facts,plain.facts);
  assert.deepEqual(answered.limitations,plain.limitations);
});
