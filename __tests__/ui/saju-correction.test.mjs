import assert from 'node:assert/strict';
import {test} from 'node:test';
import {inspectSajuCorrection,queueSajuCorrection,runSajuCorrectionQueue,assertSajuPillarClaims,validateSajuNatalPayload} from '../../worker/lib/saju-correction.js';
const birth={birthDate:'1988-01-07',birthTime:'23:26',calendarType:'solar',birthPlace:{longitude:126.978,timezone:'Asia/Seoul'}};
const old={year:'丁卯',month:'癸丑',day:'壬戌',hour:'辛亥'};
function storeMock(){
 const rows=new Map();let writes=0;
 return {rows,get writes(){return writes;},readPurchase:async()=>({paid:true,refunded:false}),
 insertOnce:async row=>{if(!rows.has(row.id)){rows.set(row.id,structuredClone(row));writes++;}return structuredClone(rows.get(row.id));},
 claim:async owner=>{const row=[...rows.values()].find(r=>r.ownerId===owner&&r.status==='queued'&&r.attempts<1);if(!row)return null;row.status='running';row.attempts++;return structuredClone(row);},
 saveDraft:async(owner,id,draft)=>{const row=rows.get(id);assert.equal(row.ownerId,owner);row.draft=structuredClone(draft);},
 read:async(owner,id)=>{const row=rows.get(id);return row?.ownerId===owner?structuredClone(row):null;},
 complete:async(owner,id)=>{const row=rows.get(id);assert.equal(row.ownerId,owner);row.status='complete';},
 hold:async(owner,id,code)=>{const row=rows.get(id);assert.equal(row.ownerId,owner);row.status='held';row.code=code;}};
}
test('dry run preserves original and exposes changed dependent interpretation',async()=>{
 const store=storeMock(),input={ownerId:'owner-a',orderId:'paid-order',originalBirth:birth,pillars:old};
 const before=JSON.stringify(input),r=await queueSajuCorrection(store,input);
 assert.equal(r.status,'correction-required');assert.deepEqual(r.changed,['day','hour']);assert.equal(r.interpretationStatus,'requires-regeneration');assert.equal(r.requiresRepayment,false);assert.equal(store.writes,0);assert.equal(JSON.stringify(input),before);
 assert.equal(inspectSajuCorrection({pillars:old}).status,'needs-original-birth');
});
test('idempotent queue, owner boundary, bounded provider and durable revision',async()=>{
 const store=storeMock(),input={ownerId:'a',orderId:'order',originalBirth:birth,pillars:old};
 const jobs=await Promise.all([queueSajuCorrection(store,input,{dryRun:false}),queueSajuCorrection(store,input,{dryRun:false})]);
 assert.equal(jobs[0].id,jobs[1].id);assert.equal(store.writes,1);
 let calls=0;const provider={generate:async request=>{calls++;assert.equal(request.calculatedData.after.day,'辛酉');assert.equal(request.calculatedData.after.hour,'己亥');return {complete:true,report:'당신의 일주는 신유, 당신의 시주는 기해입니다.'};}};
 assert.equal((await runSajuCorrectionQueue(store,provider,{ownerId:'b',maxJobs:1,maxProviderCalls:1})).claimed,0);
 assert.equal((await runSajuCorrectionQueue(store,provider,{ownerId:'a'})).calls,0);
 const result=await runSajuCorrectionQueue(store,provider,{ownerId:'a',maxJobs:1,maxProviderCalls:1});assert.equal(result.completed,1);
 assert.equal((await runSajuCorrectionQueue(store,provider,{ownerId:'a',maxJobs:1,maxProviderCalls:1})).calls,0);assert.equal(calls,1);
 assert.deepEqual(store.rows.get(jobs[0].id).comparison.before,old);
});
test('provider uncertainty cannot silently retry or charge; wrong natal assertion rejected',async()=>{
 const store=storeMock();await queueSajuCorrection(store,{ownerId:'a',orderId:'order',originalBirth:birth,pillars:old},{dryRun:false});
 let calls=0;const provider={generate:async()=>{calls++;throw new Error('timeout');}};
 assert.equal((await runSajuCorrectionQueue(store,provider,{ownerId:'a',maxJobs:2,maxProviderCalls:2})).held,1);
 await runSajuCorrectionQueue(store,provider,{ownerId:'a',maxJobs:2,maxProviderCalls:2});assert.equal(calls,1);
 assert.throws(()=>assertSajuPillarClaims('당신의 일주는 임술입니다.',{day:'辛酉',hour:'己亥'}),/SAJU_PILLAR_CONTRADICTION/);
});

test('server recomputes full natal input and rejects stale or forged pillars', async()=>{
 const {calculateNatalSaju}=await import('../../lib/korean-calendar/index.js');
 const chart=calculateNatalSaju(birth);
 assert.deepEqual(validateSajuNatalPayload(chart).pillars,chart.pillars);
 const restored=JSON.parse(JSON.stringify(chart));
 assert.equal(validateSajuNatalPayload(restored).calculationMeta.original.birthTime,'23:26');
 assert.throws(()=>validateSajuNatalPayload({...chart,pillars:old}),/SAJU_RECALCULATION_REQUIRED/);
 assert.throws(()=>validateSajuNatalPayload({...chart,calculationMeta:{...chart.calculationMeta,engineVersion:'old'}}),/SAJU_RECALCULATION_REQUIRED/);
 const unknown=calculateNatalSaju({...birth,birthTime:undefined});
 assert.equal(validateSajuNatalPayload(unknown).pillars.hour,null);
});

test('legacy empty location is explicitly assumed; partial locations are never silently completed',async()=>{
 const {calculateNatalSaju}=await import('../../lib/korean-calendar/index.js');
 const result=calculateNatalSaju({...birth,birthPlace:{city:'',country:'',latitude:null,longitude:null,timezone:''}});
 assert.equal(result.calculationMeta.location.assumed,true);assert.equal(result.pillars.hour,'己亥');
 assert.throws(()=>calculateNatalSaju({...birth,birthPlace:{longitude:126.978}}),/INVALID_BIRTH_PLACE/);
});
