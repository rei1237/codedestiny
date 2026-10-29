import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePreparation} from '../../../worker/toss/preparation.js';
const form=()=>({attemptId:crypto.randomUUID(),question:'지금 이직해도 괜찮을까요?',topicId:'career',birth:{gender:'F',date:{year:1990,month:1,day:1,calType:'solar',timeUnknown:false,hour:12,minute:0},location:{label:'서울',lat:37.5665,lng:126.978,tz:'Asia/Seoul'}}});
test('birth targets are explicit and unknown time never becomes midnight',()=>{
  const input=form();input.birth.date.timeUnknown=true;input.birth.date.hour=0;
  const value=validatePreparation(input);assert.equal(value.birth.date.hour,null);assert.equal(value.birth.date.minute,null);
  assert.equal(value.birth.location.tz,'Asia/Seoul');assert.ok(!('name' in value.birth));
});
test('reject incomplete location, invalid clock, unsupported calendar and oversized question',()=>{
  for(const change of [x=>delete x.birth.location,x=>x.birth.date.hour=99,x=>x.birth.location.tz='Guess/City',x=>x.birth.date.calType='guess',x=>x.question='x'.repeat(601)]){
    const input=form();change(input);assert.throws(()=>validatePreparation(input));
  }
});
test('retain lunar leap selection for the existing engine rather than recalculating here',()=>{
  const input=form();input.birth.date.calType='lunar_leap';assert.equal(validatePreparation(input).birth.date.calType,'lunar_leap');
});

test('pair targets keep separate explicit inputs and reject malformed partner birth',()=>{
 const input=form();input.partnerBirth=structuredClone(input.birth);input.partnerBirth.date.year=1992;
 const result=validatePreparation(input);assert.equal(result.birth.date.year,1990);assert.equal(result.partnerBirth.date.year,1992);
 input.partnerBirth.location.tz='Guess/City';assert.throws(()=>validatePreparation(input));
});
