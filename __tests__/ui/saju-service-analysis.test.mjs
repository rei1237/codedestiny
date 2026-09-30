import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNatalSaju } from '../../lib/korean-calendar/index.js';
import { calcPower, analyzeJohu, detectJong, applyRuntimeYongshinPolicy } from '../../worker/yeongnyangi/fortune/saju-runtime.mjs';
import { calculateLifeBookAiSaju } from '../../worker/lib/life-book-ai-saju.js';
import { __newYearAiTestUtils as newYear } from '../../worker/routes/new-year-ai.js';
import { __lifeBookAiTestUtils as lifeBook } from '../../worker/routes/life-book-ai.js';
import { buildSajuSnapshotFromBirth } from '../../worker/lib/saju-snapshot-from-birth.js';
import { buildSajuNatalAnalysis, SAJU_ELEMENT_KO } from '../../worker/lib/saju-natal-analysis.js';
import { buildLifeBookExpertFactors } from '../../worker/lib/saju-expert-factors.js';

// Only calculation and prompt assembly run; any accidental external call is a test failure.
let fetchCalls=0;
const originalFetch=globalThis.fetch;
test.before(()=>{globalThis.fetch=()=>{fetchCalls++;throw new Error('External fetch forbidden in calculation test');};});
test.after(()=>{globalThis.fetch=originalFetch;assert.equal(fetchCalls,0);});
const ordinary={birthDate:'1990-05-15',birthTime:'08:30',calendarType:'solar',gender:'male'};
const births=[
  ordinary,
  {...ordinary,birthDate:'1988-08-15',birthTime:'09:30'}, // Historical Korean daylight saving time.
  {...ordinary,birthDate:'2000-01-07',birthTime:'23:50'}, // Corrected late-night boundary.
  {...ordinary,birthDate:'2026-02-04',birthTime:'04:00'}, // Solar-term month boundary.
  {...ordinary,birthDate:'2023-02-01',calendarType:'lunar',isLeapMonth:true},
  {...ordinary,birthTime:'08:30',birthTimeUnknown:true}, // Explicit unknown must override a retained time field.
  {...ordinary,birthTime:'',birthTimeUnknown:true},
  {...ordinary,birthDate:'1995-10-15',birthTime:'06:00',birthPlace:{name:'New York',longitude:-74.006,latitude:40.7128,timezone:'America/New_York'}},
];
function runtimeFor(birth){
  const natal=calculateNatalSaju(birth);
  const pillars=Object.fromEntries(['year','month','day','hour'].map((key,index)=>{
    const value=natal.pillars[key]||'';
    return [['y','m','d','h'][index],{g:value[0]||'',j:value[1]||''}];
  }));
  const johu=analyzeJohu(pillars),candidate=detectJong(pillars);
  return {power:applyRuntimeYongshinPolicy(calcPower(pillars),candidate,johu),johu,jong:{...candidate,confirmationRequired:candidate.isJong===true}};
}

test('신년·인생책·발송 스냅샷의 신강약과 용신은 동일한 원국 및 런타임을 따른다',()=>{
  const strengthKinds=new Set(),johuKinds=new Set();
  for(const birthInfo of births){
    const life=calculateLifeBookAiSaju(birthInfo,{year:2026});
    const year=newYear.calculateNewYearFortuneData({birthInfo,targetYear:2026});
    const snapshot=buildSajuSnapshotFromBirth(birthInfo);
    const expected=runtimeFor(birthInfo);
    const id=JSON.stringify(birthInfo);
    assert.ok(snapshot,id);
    for(const result of [life.natalAnalysis,year.natalAnalysis,snapshot]){
      assert.deepEqual(result.power,expected.power,id+' power');
      assert.deepEqual(result.johu,expected.johu,id+' johu');
      assert.deepEqual(result.jong,expected.jong,id+' jong');
    }
    assert.equal(year.saju.strength,life.strength,id+' strength');
    assert.equal(year.advancedSajuSummary.yongshin.strength,life.strength);
    assert.equal(year.advancedSajuSummary.yongshin.coreYongshinKo,SAJU_ELEMENT_KO[expected.power.yongshin[0]]||'');
    assert.deepEqual(year.advancedSajuSummary.yongshin.yongshinElementsKo,expected.power.yongshin.map((e)=>SAJU_ELEMENT_KO[e]));
    assert.deepEqual(year.advancedSajuSummary.yongshin.kijishinElementsKo,expected.power.kijishin.map((e)=>SAJU_ELEMENT_KO[e]));
    assert.equal(year.advancedSajuSummary.johu.type,expected.johu.type);
    assert.deepEqual(year.advancedSajuSummary.johu.usefulElementsKo,expected.power.johuYongshin.map((e)=>SAJU_ELEMENT_KO[e]));
    assert.equal(snapshot.analysisBasis,'screen-saju-runtime: eokbu + johu; jong candidates remain conditional');
    assert.equal('natalAnalysis' in snapshot,false,'Snapshot public shape stays unchanged');
    strengthKinds.add(expected.power.isStrong);johuKinds.add(expected.johu.type);
  }
  assert.equal(strengthKinds.size,2,'Fixtures must cover both strong and weak day masters');
  assert.ok(johuKinds.size>=3,'Fixtures must cover multiple climate classifications');
});

test('금이 가장 많은 명식도 월령에 따라 신약일 수 있고 최소 오행을 용신으로 확정하지 않는다',()=>{
  const life=calculateLifeBookAiSaju(ordinary,{year:2026});
  const year=newYear.calculateNewYearFortuneData({birthInfo:ordinary,targetYear:2026});
  assert.equal(life.fiveElements['금'],4);
  assert.equal(life.natalAnalysis.power.score,7);
  assert.equal(life.natalAnalysis.power.isStrong,false);
  assert.deepEqual(life.natalAnalysis.power.yongshin,['metal','earth']);
  assert.equal(life.elementBalance.usefulElement,'목');
  assert.equal(life.elementBalance.method,'element-count-balance');
  assert.match(life.elementBalance.limitation,/용신 확정 판정이 아닙니다/);
  assert.match(life.usefulGod,/^금·토.*후보/);
  assert.match(year.advancedSajuSummary.yongshin.reading,/가장 적다는 이유로 정한 용신은 아닙니다/);
  const woodMonths=year.monthlyFlow.filter((row)=>row.element==='목'&&!/합/.test(row.relationToDayBranch));
  assert.ok(woodMonths.length>0);
  for(const row of woodMonths)assert.equal(row.timing,'주의','A minimum-count element is not automatically an opportunity');
});

test('시주 미상은 저장된 시간값을 해석에 섞지 않고 모든 결과에 잠정 해석을 표시한다',()=>{
  const withTime={...ordinary,birthTimeUnknown:true};
  const withoutTime={...ordinary,birthTime:'',birthTimeUnknown:true};
  const a=calculateLifeBookAiSaju(withTime,{year:2026});
  const b=calculateLifeBookAiSaju(withoutTime,{year:2026});
  const year=newYear.calculateNewYearFortuneData({birthInfo:withTime,targetYear:2026});
  assert.equal(a.hourPillar,undefined);
  assert.equal(year.birthCalendar.timeUnknown,true);
  assert.equal(year.saju.hourPillar,'출생시간 미입력');
  assert.deepEqual(a.natalAnalysis,b.natalAnalysis);
  assert.deepEqual(a.natalAnalysis,year.natalAnalysis);
  assert.match(a.strength,/시주를 제외한 잠정 해석/);
  assert.match(a.usefulGod,/출생 시각에 따라 달라질 수/);
});

test('종격은 공통 조건부 후보와 확인 필요 표시를 유지한다',()=>{
  const result=buildSajuNatalAnalysis({year:'甲寅',month:'甲寅',day:'甲寅',hour:'甲寅'});
  assert.equal(result.jong.isJong,true);
  assert.equal(result.jong.confirmationRequired,true);
  assert.match(result.strength,/종격은 후보/);
  assert.match(result.limitation,/성립 조건/);
  const masked=buildSajuNatalAnalysis({year:'甲寅',month:'甲寅',day:'甲寅',hour:'癸亥'},{timeUnknown:true});
  const omitted=buildSajuNatalAnalysis({year:'甲寅',month:'甲寅',day:'甲寅',hour:''},{timeUnknown:true});
  assert.deepEqual(masked,omitted);
});

test('인생책 모든 챕터의 기존 증거 영역에 공통 희용신과 해석 한계가 전달된다',()=>{
  const result=calculateLifeBookAiSaju(ordinary,{year:2026});
  const slice=lifeBook.pickSajuSlice(result,[]);
  assert.deepEqual(slice.seasonalBalance.runtimeInterpretation.yongshin,result.natalAnalysis.power.yongshin);
  assert.equal(slice.seasonalBalance.runtimeInterpretation.powerScore,7);
  assert.match(slice.seasonalBalance.runtimeInterpretation.limitation,/최소값은 용신 판정이 아닙니다/);
  assert.match(slice.seasonalBalance.adjustment,/금·토/);
  const year=newYear.calculateNewYearFortuneData({birthInfo:ordinary,targetYear:2026});
  const facts=newYear.buildBasicSajuProfile({birthInfo:ordinary,llmMeta:{fortuneData:year}});
  assert.equal(facts.yongshin.core,'금');
  assert.match(facts.yongshin.reading,/희용신 후보/);
});

test('전문가 근거는 공통 용신 전체를 소비하고 이전 문자열만 있는 입력도 처리한다',()=>{
  const result=calculateLifeBookAiSaju(ordinary,{year:2026});
  const base={...result,power:result.natalAnalysis.power,jong:result.natalAnalysis.jong};
  const actual=buildLifeBookExpertFactors(base);
  assert.deepEqual(result.advancedFactors,actual);
  assert.deepEqual(buildLifeBookExpertFactors({...base,usefulGod:'수 기운',unfavorableGod:'금 기운'}),actual,
    'A legacy sentence cannot override structured runtime power');
  const legacy=buildLifeBookExpertFactors({...base,power:undefined,usefulGod:'수 기운',unfavorableGod:'금 기운'});
  assert.notDeepEqual(legacy.hiddenStemExposures,actual.hiddenStemExposures);
  assert.ok(Array.isArray(legacy.hiddenStems));
});


test('신년 실제 정규화 경로는 음력 연도 경계에서도 양력 출생연도로 나이를 계산한다',()=>{
  const birthInfo={...ordinary,birthDate:'1987-11-18',birthTime:'23:26',calendarType:'lunar',gender:'female'};
  const normalized=newYear.normalizeConsultationInput({birthInfo,targetYear:2026});
  assert.equal(normalized.ok,true);
  const result=newYear.calculateNewYearFortuneData(normalized.input);
  const life=calculateLifeBookAiSaju(normalized.input.birthInfo,{year:2026});
  assert.equal(result.birthCalendar.solarDate,'1988-01-07');
  assert.equal(result.advancedSajuSummary.daewoonSewoon.targetAgeKoreanStyle,39);
  assert.equal(result.advancedSajuSummary.daewoonSewoon.targetAgeKoreanStyle,life.majorLuck.currentAgeKoreanStyle);
});

test('신년 실제 정규화 경로는 명시적 시각 미상을 보존하고 남아 있는 시간값을 지운다',()=>{
  for(const body of [
    {birthInfo:{...ordinary,birthTimeUnknown:true}},
    {birthInfo:{...ordinary,birthTime:'25:99'},birthTimeUnknown:true},
  ]) {
    const normalized=newYear.normalizeConsultationInput({...body,targetYear:2026});
    assert.equal(normalized.ok,true);
    assert.equal(normalized.input.birthInfo.birthTimeUnknown,true);
    assert.equal(normalized.input.birthInfo.birthTime,'');
    const result=newYear.calculateNewYearFortuneData(normalized.input);
    assert.equal(result.calculationMeta.timeUnknown,true);
    assert.equal(result.calculationMeta.instant,null);
    assert.equal(result.saju.hourPillar,'출생시간 미입력');
    assert.match(result.saju.strength,/시주를 제외한 잠정 해석/);
  }
  const known=newYear.normalizeConsultationInput({birthInfo:ordinary,targetYear:2026});
  assert.equal(known.input.birthInfo.birthTime,'08:30');
  assert.equal('birthTimeUnknown' in known.input.birthInfo,false,'기존 known-time 입력의 해시 형태를 불필요하게 바꾸지 않는다');
  assert.notEqual(newYear.calculateNewYearFortuneData(known.input).saju.hourPillar,'출생시간 미입력');
});

test('신년 실제 정규화 경로는 유효 음력 2월 30일과 윤달을 코어로 검증한다',()=>{
  for(const [birthInfo,expectedSolar] of [
    [{...ordinary,birthDate:'2023-02-30',calendarType:'lunar'},'2023-03-21'],
    [{...ordinary,birthDate:'2023-02-01',calendarType:'lunar',isLeapMonth:true},'2023-03-22'],
    [{...ordinary,birthDate:'2000-02-29'},'2000-02-29'],
  ]) {
    const normalized=newYear.normalizeConsultationInput({birthInfo,targetYear:2026});
    assert.equal(normalized.ok,true,JSON.stringify(birthInfo));
    const result=newYear.calculateNewYearFortuneData(normalized.input);
    assert.equal(result.birthCalendar.solarDate,expectedSolar);
    assert.deepEqual(result.calculationMeta,calculateNatalSaju(normalized.input.birthInfo).calculationMeta);
  }
});

test('신년 정규화와 계산은 잘못된 양력·음력 날짜와 존재하지 않는 윤달을 거절한다',()=>{
  const invalid=[
    {...ordinary,birthDate:'2023-02-30'},
    {...ordinary,birthDate:'1900-02-29'},
    {...ordinary,birthDate:'2023-02-31',calendarType:'lunar'},
    {...ordinary,birthDate:'2023-13-01',calendarType:'lunar'},
    {...ordinary,birthDate:'2023-03-01',calendarType:'lunar',isLeapMonth:true},
    {...ordinary,birthDate:'2023-02-30',calendarType:'lunar',isLeapMonth:true},
  ];
  for(const birthInfo of invalid) {
    assert.equal(newYear.normalizeConsultationInput({birthInfo,targetYear:2026}).ok,false,JSON.stringify(birthInfo));
    assert.throws(()=>newYear.calculateNewYearFortuneData({birthInfo,targetYear:2026}),(error)=>/INVALID_(BIRTH|LUNAR)_DATE/.test(error.code));
  }
});
