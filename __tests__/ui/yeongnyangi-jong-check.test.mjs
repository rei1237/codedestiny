import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),Module=require('node:module');
const built=await build({stdin:{contents:`export * from './worker/yeongnyangi/fortune/saju/experience-policy'; export * from './worker/yeongnyangi/fortune/saju/experience'; export {calculateScreenSaju} from './worker/yeongnyangi/fortune/saju/runtime'; export {saju} from './worker/yeongnyangi/fortune/saju'; export {getProduct} from './worker/yeongnyangi/payments/catalog'; export {readingManifest} from './worker/yeongnyangi/fortune/reading-manifest'; export {selectChapterFacts} from './worker/yeongnyangi/fortune/chapter-facts';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false});
const loaded=new Module(path.resolve('jong-check-tests.cjs'));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(built.outputFiles[0].text,loaded.id);
const {experienceCheckApplies,experienceCheck,parseExperience,calculateScreenSaju,saju,getProduct,readingManifest,selectChapterFacts}=loaded.exports;

test('only the three tiers that keep 대운·용신 evidence offer the experience survey',()=>{
  assert.deepEqual(['saju_mackerel','saju_salmon','saju_flounder','saju_tuna','fusion_saju_ziwei','fusion_sukuyo_vedic','fusion_all'].filter(id=>experienceCheckApplies(getProduct(id))),['saju_tuna','fusion_saju_ziwei','fusion_all']);
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
const read=async(profile,jongAnswer,experience)=>{
  const c=await saju.calculate(saju.validateInput({personA:profile}),{asOf:'2026-09-27',...(jongAnswer?{jongAnswer}:{}),...(experience?{experience}:{})});
  return {facts:c.facts,limitations:c.limitations};
};
const without=(facts,label)=>facts.filter(f=>f.label!==label);
// 甲寅 丁丑 戊辰 己未: 대운 甲戌(2000~)·癸酉(2010~)·壬申(2020~). 질문 연도는 날짜로만 고른다(2025부터 거꾸로 6개).
const survey=[{year:2004,domain:'career',outcome:'good',note:'승진 발표'},{year:2013,domain:'career',outcome:'good'},{year:2006,domain:'money',outcome:'bad'},
  {year:2022,domain:'relationship',outcome:'ordinary',source:'prompted'},{year:2023,outcome:'skip',source:'prompted'}];

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

test('survey years are picked by date only, and untimed charts are not asked',()=>{
  const chart=calculateScreenSaju(person,new Date('2026-09-27'));
  assert.deepEqual(experienceCheck(chart,true).years,[2025,2024,2023,2022,2021,2020]);
  assert.equal(experienceCheck(chart,false),null);
  assert.equal(experienceCheck(calculateScreenSaju({...person,birthDate:'2012-05-01'},new Date('2026-09-27')),true),null);
});

test('experience answers add one calibration fact and leave every natal fact unchanged',async()=>{
  for(const profile of [person,strongSide,weakSide]){
    const base=await read(profile);
    const answered=await read(profile,undefined,parseExperience(survey,2026));
    assert.deepEqual(without(answered.facts,'experienceCalibration'),base.facts);
    assert.deepEqual(answered.limitations,base.limitations);
    const fact=answered.facts.find(f=>f.label==='experienceCalibration').value;
    assert.match(fact.rule,/격국·종격·신강\/신약·조후·용신을 바꾸거나 다시 판정하지 않는다/);
    for(const key of ['gyeokguk','jong','strength','usefulGod','yongshin'])assert.equal(key in fact,false,key);
    assert.equal(JSON.stringify(fact).includes('승진'),false);
  }
  const untimed=await read({...person,birthTime:''},undefined,parseExperience(survey,2026));
  assert.equal(untimed.facts.some(f=>f.label==='experienceCalibration'),false);
});

test('the parser is strict and the partner chart never sees the buyer survey',async()=>{
  assert.equal(parseExperience(undefined,2026),undefined);
  assert.equal(parseExperience([],2026),undefined);
  for(const bad of [{},[{year:2004,domain:'career',outcome:'no'}],[{year:2027,domain:'career',outcome:'good'}]])assert.throws(()=>parseExperience(bad,2026),e=>e.code==='INVALID_EXPERIENCE'&&e.status===400);
  const input=saju.validateInput({personA:person,personB:strongSide,readingMode:'compatibility'});
  const plain=await saju.calculate(input,{asOf:'2026-09-27'});
  const answered=await saju.calculate(input,{asOf:'2026-09-27',experience:parseExperience(survey,2026)});
  assert.deepEqual(without(answered.facts,'experienceCalibration'),plain.facts);
});

test('the calibration fact rides only on 대운·세운 chapters and leaves the manifest unchanged',async()=>{
  const c=await saju.calculate(saju.validateInput({personA:person}),{asOf:'2026-09-27',experience:parseExperience(survey,2026)});
  const context={domain:'saju',engineVersion:c.engineVersion,calculatedAt:'2026-09-27T00:00:00.000Z',facts:c.facts,limitations:c.limitations};
  for(const id of ['saju_tuna','saju_mackerel']){
    const manifest=readingManifest(getProduct(id));
    assert.equal(JSON.stringify(manifest).includes('experienceCalibration'),false,id);
    for(const chapter of manifest){
      const labels=selectChapterFacts(context,chapter).map(f=>f.label);
      const luck=['majorLuck','yearlyLuck','luckOverlap'].some(l=>(chapter.factSelectors?.saju||[]).includes(l));
      assert.equal(labels.includes('experienceCalibration'),id==='saju_tuna'&&luck,`${id} ${chapter.key}`);
    }
  }
  assert.ok(readingManifest(getProduct('saju_tuna')).some(chapter=>selectChapterFacts(context,chapter).some(f=>f.label==='experienceCalibration')));
});
