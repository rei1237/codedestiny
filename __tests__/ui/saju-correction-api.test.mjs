import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const mocks={
 'worker/lib/db.js':'export const withMongoRetry=async(e,fn)=>fn();',
 'worker/lib/models.js':`export const Payment={findOne:q=>globalThis.__correctionDb.query('payment',q)};export const ProfileCard={findOne:q=>globalThis.__correctionDb.query('profile',q)};export const PointHistory={findOne:q=>globalThis.__correctionDb.query('evidence',q)};`,
 'worker/yeongnyangi/repository.js':`export const ownerId=x=>x;export const hasRequestAccess=r=>!!r.paymentId||['FAMILY','MOONLIGHT_STONE'].includes(r.accessMethod);export const findNonCashEvidence=(r,u)=>globalThis.__correctionDb.evidence(r,u);export const YeongnyangiRequest={findOne:q=>globalThis.__correctionDb.query('request',q),updateOne:(q,u)=>{if(!globalThis.__correctionDb.update)throw Error('unexpected write in dry run');return globalThis.__correctionDb.update(q,u)}};`,
};
const bundle=await build({stdin:{contents:"export {reviewSajuCorrection,correctionStore} from './worker/yeongnyangi/saju-correction.js'",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'db-only-mock',setup(b){b.onLoad({filter:/worker[\\/]/},a=>{const key=Object.keys(mocks).find(k=>a.path.replaceAll('\\','/').endsWith(k));return key?{contents:mocks[key],loader:'js'}:undefined;});}}]});
const {reviewSajuCorrection,correctionStore}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
test('actual correction service dry-run is owner-scoped and read-only; snapshot precedes changed profile',async()=>{
 const owner='a'.repeat(24),id='b'.repeat(64),queries=[];
 const row={_id:id,userId:owner,state:'COMPLETED',paymentId:'payment',snapshot:{natalInput:{personA:{birthDate:'1988-01-07',birthTime:'23:26',calendarType:'solar'}},analysis:{contexts:{saju:{engineVersion:'old',facts:[{label:'pillars',value:{year:'丁卯',month:'癸丑',day:'辛酉',hour:'戊子'}}]}}}},chapters:['original']};
 const original=JSON.stringify(row);
 globalThis.__correctionDb={query(type,q){queries.push({type,q});assert.equal(q.userId,owner);const result=type==='payment'?{_id:'payment'}:row;return {select(){return this},lean:async()=>result};}};
 const result=await reviewSajuCorrection({},owner,id);
 assert.equal(result.status,'correction-required');assert.deepEqual(result.changed,['hour']);assert.equal(result.after.hour,'己亥');assert.equal(JSON.stringify(row),original);assert.ok(queries.every(q=>q.type!=='profile'));assert.ok(queries.some(q=>q.q['metadata.unlockRevoked']?.$ne===true));
});

test('publication requires one durable owned update, never reports zero writes as complete',async()=>{
 globalThis.__correctionDb={update:async(q)=>{assert.equal(q.userId,'owner');assert.equal(q.state.$ne,'REFUNDED');return {modifiedCount:0};}};
 await assert.rejects(correctionStore({}).complete('owner','key'),/CORRECTION_SAVE_UNCONFIRMED/);
});

for(const accessMethod of ['FAMILY','MOONLIGHT_STONE'])test(accessMethod+': correction access requires the original owned spend evidence',async()=>{
 const owner='a'.repeat(24),id='b'.repeat(64),row={_id:id,userId:owner,state:'COMPLETED',accessMethod};
 let evidence={_id:'original-spend'},evidenceReads=0;
 globalThis.__correctionDb={
  query(type,q){assert.equal(type,'request');assert.equal(q.userId,owner);assert.equal(q._id,id);return {lean:async()=>row};},
  evidence(original,userId){assert.equal(original,row);assert.equal(userId,owner);evidenceReads++;return evidence;},
 };
 const store=correctionStore({});
 assert.deepEqual(await store.readPurchase(owner,id),{paid:true,refunded:false});
 evidence=null;
 assert.equal((await store.readPurchase(owner,id)).paid,false);
 row.state='REFUNDED';
 assert.deepEqual(await store.readPurchase(owner,id),{paid:false,refunded:true});
 assert.equal(evidenceReads,2,'a refunded purchase never rechecks a spend to regain access');
});
