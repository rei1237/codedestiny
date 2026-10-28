import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const bundle=await build({entryPoints:['worker/yeongnyangi/fortune/ask/validate.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {validateAskChapter}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const consultation={asOf:'2026-09-26',timezone:'Asia/Seoul',period:{kind:'requested',label:'2027년'},
  questions:[{id:'q1',text:'2027년에 이직할까요?',chapterId:'first'},{id:'q2',text:'연애는?',chapterId:'first'}]};
const analysis={version:'ask-analysis-v1',source:'rules',questions:[{questionId:'q1',category:'career',needsTiming:true},
  {questionId:'q2',category:'love',needsTiming:false}]};
const source=id=>({system:'saju',contextDomain:'saju',factId:id,path:'',engineVersion:'fixture'});
const packet={packet_version:'ask-evidence-v1',today:'2026-09-26',window:{from:'2025-09-01',to:'2028-09-30'},
  facts:[{id:'F001',label:'tenGods',tags:['career'],source:source('saju.tenGods')},
    {id:'F002',label:'fiveElements',tags:['love'],source:source('saju.fiveElements')}],
  timing:[{id:'T001',label:'yearlyLuck',tags:['career'],from:'2027',to:'2027',resolution:'year',source:source('saju.yearlyLuck')}],
  reliability:{notes:[]}};
const answer=(questionId,extra)=>({questionId,answer:'주어진 근거를 함께 살펴보세요.',reason:'상담 근거를 바탕으로 선택지를 살펴봅니다.',
  timing:'2027년의 흐름으로 참고해 보세요.',action:'기록한 상황과 선택지를 비교해 보세요.',...extra});
const body=()=>({summary:'선택지를 살펴보세요.',persona:'천천히 확인해 볼게요.',analysis:[],highlights:[],blocks:[],
  sources:['saju.tenGods','saju.fiveElements','saju.yearlyLuck'],questionAnswers:[
    answer('q1',{factIds:['F001'],timingIds:['T001'],evidenceStatus:'grounded'}),
    answer('q2',{factIds:['F002'],timingIds:[],evidenceStatus:'grounded',timing:'현재 흐름을 점검해 보세요.'})]});
const check=value=>validateAskChapter(value,consultation,analysis,packet);

test('question evidence is validated and private F/T metadata is removed before storage',()=>{
  const original=body(),saved=check(original);
  assert.deepEqual(saved.questionAnswers[0],answer('q1',{mode:'normal'}));
  assert.deepEqual(original.questionAnswers[0].factIds,['F001']);
  // 근거 ID 는 버리지 않고 서버 전용 internalBasis 로 남긴다(presentFortune 이 화면 전에 지운다).
  assert.deepEqual(saved.internalBasis.questionAnswers[0],{questionId:'q1',factIds:['F001'],timingIds:['T001'],evidenceStatus:'grounded',sources:['saju.tenGods','saju.yearlyLuck']});
});
test('other question evidence, forged IDs and missing source citations fail closed',()=>{
  for(const mutate of [
    value=>{value.questionAnswers[0].factIds=['F002'];},
    value=>{value.questionAnswers[0].timingIds=['T999'];},
    value=>{value.sources=['saju.fiveElements'];},
  ]){const value=body();mutate(value);assert.throws(()=>check(value),{code:'ASK_EVIDENCE_INCOMPLETE'});}
});
test('unsupported year and internal ID leaks are rejected',()=>{
  const year=body();year.questionAnswers[0].timing='2028년에 반드시 일어납니다.';
  assert.throws(()=>check(year),{code:'ASK_UNSUPPORTED_TIMING'});
  const leak=body();leak.questionAnswers[0].reason='F001을 사용자에게 표시합니다.';
  assert.throws(()=>check(leak),{code:'ASK_UNSAFE_CLAIM'});
  const month=body();month.questionAnswers[0].timing='2027년 3월에 변화가 나타납니다.';
  assert.throws(()=>check(month),{code:'ASK_UNSUPPORTED_TIMING'});
  // A period outside the request is no longer offered, so citing it fails as an unoffered ID.
  assert.throws(()=>validateAskChapter(body(),{...consultation,period:{kind:'default',label:'3개월',start:'2026-09-26',end:'2026-12-26'}},analysis,packet),
    {code:'ASK_EVIDENCE_INCOMPLETE'});
});
test('limited answer can retain facts without inventing an event date',()=>{
  const limited=body();limited.questionAnswers[0]={...limited.questionAnswers[0],timingIds:[],evidenceStatus:'limited',
    timing:'시기 근거가 부족해 사건 날짜 대신 점검 기간으로만 봅니다.'};
  assert.doesNotThrow(()=>check(limited));
  assert.equal(check(limited).questionAnswers[0].mode,'limited');
  limited.questionAnswers[0].timing='2027년 3월 5일에 연락이 옵니다.';
  assert.throws(()=>check(limited),{code:'ASK_UNSUPPORTED_TIMING'});
});

test('health answers use care display mode after evidence validation',()=>{
  const health={...analysis,questions:[analysis.questions[0],{...analysis.questions[1],category:'health'}]};
  const evidence={...packet,facts:[packet.facts[0],{...packet.facts[1],tags:['health']} ]};
  assert.equal(validateAskChapter(body(),consultation,health,evidence).questionAnswers[1].mode,'care');
});
// ask-period-v1: '이번 주' (2026-09-28~10-04) against 2026-09-26, a Saturday consultation date.
const weekRange={scale:'week',label:'다음 주',start:'2026-09-28',end:'2026-10-04'};
const weekly={...consultation,period:{kind:'requested',label:'다음 주',start:weekRange.start,end:weekRange.end,ranges:[weekRange],resolver:'ask-period-v1'}};
const weekPacket={...packet,timing:[
  {id:'T001',label:'yearlyLuck',tags:['career'],from:'2026',to:'2026',resolution:'year',source:source('saju.yearlyLuck')},
  {id:'T002',label:'monthlyLuck[0]',tags:['career'],from:'2026-08-07T23:41:00+09:00',to:'2026-08-07T23:41:00+09:00',resolution:'instant',source:source('saju.monthlyLuck')},
  {id:'T003',label:'monthlyLuck[1]',tags:['career'],from:'2026-09-07T23:41:00+09:00',to:'2026-09-07T23:41:00+09:00',resolution:'instant',source:source('saju.monthlyLuck')},
  {id:'T004',label:'monthlyLuck[2]',tags:['career'],from:'2026-10-08T15:41:00+09:00',to:'2026-10-08T15:41:00+09:00',resolution:'instant',source:source('saju.monthlyLuck')}]};
const weekBody=()=>({...body(),sources:['saju.tenGods','saju.fiveElements','saju.yearlyLuck','saju.monthlyLuck'],questionAnswers:[
  answer('q1',{factIds:['F001'],timingIds:['T001','T003'],evidenceStatus:'grounded',timing:'2026.9.28(월)~10.4(일) 한 주는 9월 절입 뒤의 월운 안에 있어요.'}),
  answer('q2',{factIds:['F002'],timingIds:[],evidenceStatus:'limited',timing:'이 주의 흐름 근거는 따로 없어 실천 조언으로 답해요.'})]});
test('a period request offers the 월운 already running at its start, not earlier or later terms',async()=>{
  const {buildAskFirstChapterPrompt}=await import(`data:text/javascript;base64,${Buffer.from((await build({entryPoints:['worker/yeongnyangi/fortune/ask/prompt.ts'],bundle:true,platform:'node',format:'esm',write:false})).outputFiles[0].text).toString('base64')}`);
  const guide=buildAskFirstChapterPrompt(weekly,analysis,weekPacket);
  assert.equal(guide.version,'ask-first-chapter-v3');
  assert.deepEqual(guide.evidence.timing.map(t=>[t.id,t.relation]),[['T001','current'],['T003','in-effect']]);
  // The requested week makes every question with in-period evidence timing-dependent; one without any stays as analysed.
  assert.deepEqual(guide.questions.map(q=>[q.questionId,q.needsTiming,q.timingIds]),[['q1',true,['T001','T003']],['q2',false,[]]]);
  assert.equal(buildAskFirstChapterPrompt({...weekly,period:{kind:'requested',label:'2027년'}},analysis,packet).version,'ask-first-chapter-v2');
});
test('a week answer may cite the running 월운 and restate its range, but year evidence never dates a day',()=>{
  const ok=validateAskChapter(weekBody(),weekly,analysis,weekPacket);
  assert.equal(ok.questionAnswers[1].mode,'limited');
  const limited=weekBody();limited.questionAnswers[1].timing='2026.9.28부터 한 주는 실천 조언으로 봐요.';
  assert.doesNotThrow(()=>validateAskChapter(limited,weekly,analysis,weekPacket));
  for(const text of ['2026년 10월 1일이 가장 좋은 날이에요.','2026.11.3부터 달라져요.']){
    const day=weekBody();day.questionAnswers[1].timing=text;
    assert.throws(()=>validateAskChapter(day,weekly,analysis,weekPacket),{code:'ASK_UNSUPPORTED_TIMING'},text);
  }
  const yearOnly=weekBody();Object.assign(yearOnly.questionAnswers[0],{timingIds:['T001'],timing:'2026년 9월 30일에 기회가 와요.'});
  assert.throws(()=>validateAskChapter(yearOnly,weekly,analysis,weekPacket),{code:'ASK_UNSUPPORTED_TIMING'});
  // An earlier term than the running one is never offered, so citing it is an unoffered ID.
  const stale=weekBody();stale.questionAnswers[0].timingIds=['T001','T002'];
  assert.throws(()=>validateAskChapter(stale,weekly,analysis,weekPacket),{code:'ASK_EVIDENCE_INCOMPLETE'});
  // The pre-period contract keeps its old date rule.
  const old=body();old.questionAnswers[0]={...old.questionAnswers[0],timingIds:[],evidenceStatus:'limited',timing:'2027년 1월부터 점검해 봐요.'};
  assert.throws(()=>check(old),{code:'ASK_UNSUPPORTED_TIMING'});
});
test('the after-period reflection question is kept when sound and dropped, never rejected, when not',()=>{
  const withReview=review=>{const value=weekBody();value.questionAnswers[0].review=review;return validateAskChapter(value,weekly,analysis,weekPacket).questionAnswers[0].review;};
  assert.equal(withReview('  이번 주에 먼저 꺼낸 대화가\n내 기준을 지켰나요? '),'이번 주에 먼저 꺼낸 대화가 내 기준을 지켰나요?');
  for(const review of [undefined,'짧음','매일 운세를 확인했나요?','다음 상담에서 다시 물어보세요.','알림으로 알려 드릴게요.','F001 근거를 돌아봐요.','dayMaster가 버텼나요?','<b>돌아봐요</b> 오늘','x'.repeat(201)])
    assert.equal(withReview(review),undefined,String(review));
  const old=body();old.questionAnswers[0].review='이번 해의 선택을 돌아볼까요?';
  assert.equal('review' in check(old).questionAnswers[0],false);
});
test('the ask prompt copy points repeated values at CALCULATED_DATA and keeps every other value and source',async()=>{
  const {askPromptView}=await import(`data:text/javascript;base64,${Buffer.from((await build({entryPoints:['worker/yeongnyangi/fortune/ask/prompt.ts'],bundle:true,platform:'node',format:'esm',write:false})).outputFiles[0].text).toString('base64')}`);
  const at=(factId,path,value,extra={})=>({id:'F',label:factId,value,source:{system:factId.split('.')[0],contextDomain:factId.split('.')[0],factId,path,engineVersion:'v1'},subject:'self',...extra});
  const prompt={version:'ask-first-chapter-v3',questions:[],evidence:{facts:[
    at('saju.pillars','',{day:'甲子'}),at('astrology.planets','Sun',{sign:11,dignity:'peregrine'}),
    at('saju.monthlyLuck','1',{pillar:'丁酉'}),at('vedic.lagna','',{sign:3},{subject:'partner'})],
    timing:[at('saju.yearlyLuck','0',{year:2027},{source:{system:'saju',contextDomain:'saju',factId:'saju.yearlyLuck',path:'0',engineVersion:'daily'}})]}};
  const calculated=[{id:'saju.pillars',value:{day:'甲子'}},{id:'astrology.planets',value:{Sun:{sign:11,dignity:'중립(페레그린)'}}},
    {id:'saju.monthlyLuck',value:[{pillar:'丙申'},{pillar:'丁酉'}]},{id:'saju.yearlyLuck',value:[{year:2027}]}];
  const view=askPromptView(prompt,calculated),[pillars,sun,month,lagna]=view.evidence.facts,[year]=view.evidence.timing;
  assert.deepEqual(pillars,{id:'F',label:'saju.pillars',valueInCalculatedData:true,source:{factId:'saju.pillars'}});
  assert.deepEqual(sun.value,{sign:11,dignity:'peregrine'});
  assert.deepEqual(month,{id:'F',label:'saju.monthlyLuck',valueInCalculatedData:true,source:{factId:'saju.monthlyLuck',path:'1'}});
  assert.equal(lagna.subject,'partner');
  assert.deepEqual(year.source,{factId:'saju.yearlyLuck',path:'0',engineVersion:'daily'});
  assert.deepEqual(view.engineVersions,{saju:'v1',astrology:'v1',vedic:'v1'});
  assert.deepEqual(prompt.evidence.facts[0].value,{day:'甲子'});
});
