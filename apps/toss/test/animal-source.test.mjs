import test from 'node:test';
import assert from 'node:assert/strict';
import {animalSource as source,animalExample} from './animal-source-fixture.mjs';

test('animal full reading matches the original public web section for solar, lunar, leap and unknown hour',async()=>{
 for(const input of [animalExample,{...animalExample,birthTime:'08:30'},...['solar','lunar'].map(calendarType=>({birthDate:'1990-05-15',birthTime:'14:30',gender:'female',calendarType,lunarLeap:false}))]){
  const actual=source.tossAnimalDestiny({input}),time=input.birthTime?input.birthTime.split(':').map(Number):null;
  const original=await source.handleSajuSection(new Request('https://example.invalid/api/saju/section',{method:'POST',body:JSON.stringify({featureKey:'animal-destiny-unlock',birth:{date:input.birthDate,calType:input.calendarType==='solar'?'solar':input.lunarLeap?'lunar_leap':'lunar',timeKnown:!!time,hour:time?.[0],minute:time?.[1]}})}),{});
  assert.equal(original.status,200);assert.deepEqual(actual.reading,(await original.json()).animal);
  assert.equal(actual.stored,false);assert.equal(actual.reading.sections.length,10);assert.equal(actual.reading.dex.length,12);
  for(const key of ['personality','love','career','wealth','relationship','today'])assert.ok(actual.reading.detailed[key].length>100,key);
 }
 const unknown=source.tossAnimalDestiny({input:animalExample});assert.equal(unknown.twelveStages.day,'병');assert.equal(unknown.sajuResult.pillars.hour,null);assert.equal(unknown.reading.result.animalName,'구름 토끼');
});
test('all twelve animal pairings preserve the web compatibility explanation and four breakdowns',()=>{
 const dates=new Map();for(let day=1;day<=120&&dates.size<12;day++){
  const date=new Date(Date.UTC(1990,0,day)).toISOString().slice(0,10),input={birthDate:date,birthTime:'08:30',gender:'female',calendarType:'solar'};
  const row=source.tossAnimalDestiny({input});dates.set(row.animal.id,input);
 }
 assert.equal(dates.size,12);
 for(const [mine,input] of dates)for(const [other,partner] of dates){
  const actual=source.tossAnimalDestiny({input,partner}),original=source.calculateAnimalCompatibility(mine,other);
  for(const key of Object.keys(original))assert.deepEqual(actual.partner[key],original[key],mine+'/'+other+'/'+key);
  assert.equal(actual.partner.stageEvidence,source.buildCompatibilityStageEvidence(actual.twelveStages.primary,actual.partner.primaryStage));
 }
});
test('animal guest input rejects profile, entitlement and malformed data instead of borrowing another account',()=>{
 for(const body of [{input:animalExample,profileId:'other'},{input:{...animalExample,profileId:'other'}},{input:{...animalExample,birthDate:'2023-02-31',calendarType:'solar'}},{input:{...animalExample,birthTime:'25:01'}},{input:animalExample,partner:{...animalExample,birthDate:'bad'}}])assert.throws(()=>source.tossAnimalDestiny(body),error=>error.code==='INVALID_INPUT');
});
