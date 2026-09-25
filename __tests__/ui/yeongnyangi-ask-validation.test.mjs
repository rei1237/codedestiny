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
  assert.deepEqual(saved.questionAnswers[0],answer('q1'));
  assert.deepEqual(original.questionAnswers[0].factIds,['F001']);
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
  assert.throws(()=>validateAskChapter(body(),{...consultation,period:{kind:'default',label:'3개월',start:'2026-09-26',end:'2026-12-26'}},analysis,packet),
    {code:'ASK_UNSUPPORTED_TIMING'});
});
test('limited answer can retain facts without inventing an event date',()=>{
  const limited=body();limited.questionAnswers[0]={...limited.questionAnswers[0],timingIds:[],evidenceStatus:'limited',
    timing:'시기 근거가 부족해 사건 날짜 대신 점검 기간으로만 봅니다.'};
  assert.doesNotThrow(()=>check(limited));
  limited.questionAnswers[0].timing='2027년 3월 5일에 연락이 옵니다.';
  assert.throws(()=>check(limited),{code:'ASK_UNSUPPORTED_TIMING'});
});
