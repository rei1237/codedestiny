import test from 'node:test';
import assert from 'node:assert/strict';
import {tossSukuyoYearly} from '../../../worker/toss/sukuyo-yearly.js';
import {privateSukuyoYearly} from '../private-simulation/sukuyo-yearly.mjs';
const profile={profileId:'mock-profile',name:'테스트 프로필',gender:'F',birth:{year:1990,month:1,day:1,calType:'solar'}};
test('yearly reads only stored owner profile and rejects a future paid policy',async()=>{
 let received;const deps={findProfile:async query=>{assert.deepEqual(query,{userId:'owner-A',profileId:profile.profileId});return profile;},build:async input=>{received=input;return {original:true};}};
 const result=await tossSukuyoYearly({}, {ownerId:'owner-A'},{profileId:profile.profileId,year:2026,birth:{year:2000}},deps);
 assert.equal(result.accessSource,'public');assert.equal(received.profile,profile);assert.equal(received.auth.userId,'owner-A');assert.equal(received.targetYear,2026);
 await assert.rejects(()=>tossSukuyoYearly({}, {ownerId:'owner-A'},{profileId:profile.profileId,year:2026},{...deps,free:()=>false}),e=>e.status===503);
 await assert.rejects(()=>tossSukuyoYearly({}, {ownerId:'owner-A'},{profileId:profile.profileId,year:2026},{...deps,findProfile:async()=>null}),e=>e.status===403);
 await assert.rejects(()=>tossSukuyoYearly({}, {},{profileId:profile.profileId,year:2026},deps),e=>e.status===401);
 await assert.rejects(()=>tossSukuyoYearly({}, {ownerId:'owner-A'},{profileId:profile.profileId,year:2101},deps),e=>e.status===400);
});
test('private yearly examples have all 12 months and reject altered profile and unknown owner',async()=>{
 for(const person of ['A','B'])for(const year of [2026,2027]){const res=privateSukuyoYearly(person,[profile],{profileId:profile.profileId,year});assert.equal(res.status,200);const data=await res.json();assert.equal(data.result.monthlyFlow.length,12);assert.equal(data.result.calculationBasis.methodVersion,'sukuyo-yearly-v2');}
 assert.equal(privateSukuyoYearly('A',[profile],{profileId:'foreign',year:2026}).status,403);
 assert.equal(privateSukuyoYearly('A',[{...profile,birth:{...profile.birth,year:2000}}],{profileId:profile.profileId,year:2026}).status,422);
 assert.equal(privateSukuyoYearly('C',[profile],{profileId:profile.profileId,year:2026}).status,422);
});
