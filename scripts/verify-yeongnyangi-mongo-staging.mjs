/** Explicit release QA: real staging Mongo transactions, fixture PG/chapter data only. */
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {config} from 'dotenv';
import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';
import {connectDb,mongoose} from '../worker/lib/db.js';
import {Payment} from '../worker/lib/models.js';
import {YeongnyangiRequest,createRequest,readRequest,attachPayment,claimChapter,finishChapter,failChapter} from '../worker/yeongnyangi/repository.js';

if(!process.argv.includes('--staging-fixtures'))throw Error('Explicit --staging-fixtures is required. Never run against production.');
config({path:'.env.local',quiet:true});
const database='code_destiny_staging';
const env={...process.env,MONGO_DB_NAME:database,MONGODB_DB_NAME:database,LLM_DRY_RUN:'true',WORKERS_AI_ENABLED:'false'};
globalThis.fetch=()=>{throw Error('External HTTP is forbidden in Mongo staging QA.');};
const compiled=await build({stdin:{contents:"export {products} from './worker/yeongnyangi/payments/catalog';",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm'});
const {products}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const run=randomUUID(),owner=new mongoose.Types.ObjectId(),other=new mongoose.Types.ObjectId();
const ids=products.map(p=>createHash('sha256').update(`staging-qa:${run}:${p.id}`).digest('hex'));
const paymentIds=products.map(()=>new mongoose.Types.ObjectId());
let connected=false,completed=0;
try{
 await connectDb(env);connected=true;
 assert.equal(mongoose.connection.name,database);
 // This random owner is not an account; fixture records can never be reached by a customer session.
 assert.equal(await mongoose.connection.db.collection('users').countDocuments({_id:owner},{limit:1}),0);
 for(const [i,product] of products.entries()){
  const id=ids[i],userId=String(owner);
  const values={profileId:`qa-${run}`,productId:product.id,featureKey:product.cdFeatureKey,amountKRW:product.priceKRW,
   fingerprint:`qa-${run}-${product.id}`,snapshot:{product,manifest:[{id:'qa-one'},{id:'qa-two'}],fixture:true}};
  await Promise.all([createRequest(env,userId,id,values),createRequest(env,userId,id,values)]);
  assert.equal(await YeongnyangiRequest.countDocuments({_id:id,userId:owner}),1);
  await assert.rejects(readRequest(env,String(other),id),error=>error.status===404);
  await assert.rejects(attachPayment(env,userId,id,product.priceKRW),error=>error.status===402);
  await Payment.create({_id:paymentIds[i],userId:owner,merchantUid:`qa-${run}-${i}`,requestId:`yn-${id}`,
   featureKey:product.cdFeatureKey,paymentType:'digital_content',accessType:'single_purchase',paymentAmount:product.priceKRW,
   chargedPoints:0,status:'paid',source:'system',metadata:{stagingQaRun:run},entitlementGrantedAt:new Date(),receiptEmailSentAt:new Date()});
  await assert.rejects(attachPayment(env,userId,id,product.priceKRW+1),error=>error.status===402);
  const [a,b]=await Promise.all([attachPayment(env,userId,id,product.priceKRW),attachPayment(env,userId,id,product.priceKRW)]);
  assert.equal(String(a.paymentId),String(b.paymentId));
  const claims=await Promise.all([claimChapter(env,userId,id),claimChapter(env,userId,id)]);
  assert.equal(claims.filter(c=>c.token).length,1);
  const first=claims.find(c=>c.token);
  await finishChapter(env,userId,id,first.token,0,{summary:'Staging fixture chapter one'},2);
  assert.equal(await finishChapter(env,userId,id,first.token,0,{summary:'Duplicate'},2),null);
  const failing=await claimChapter(env,userId,id);
  await failChapter(env,userId,id,failing.token,'QA_PROVIDER_FAILURE');
  assert.equal((await attachPayment(env,userId,id,product.priceKRW)).state,'FORTUNE_FAILED');
  if(i===0){
   await YeongnyangiRequest.updateOne({_id:id,userId:owner},{$set:{errorCode:'GENERATION_REVIEW_REQUIRED',attempts:7}});
   const args=['scripts/recover-yeongnyangi-request.mjs','--db',database,'--request',id,'--attempts','2','--reason',`fixture-${run}`,'--operator','staging-verifier'];
   const dryRun=JSON.parse(execFileSync(process.execPath,args,{encoding:'utf8'}).trim().split('\n').at(-1));
   assert.equal(dryRun.applied,false);assert.equal((await readRequest(env,userId,id)).state,'FORTUNE_FAILED');
   const applied=JSON.parse(execFileSync(process.execPath,[...args,'--apply'],{encoding:'utf8'}).trim().split('\n').at(-1));
   assert.equal(applied.applied,true);
   const recovered=await readRequest(env,userId,id);
   // Claims and failures are audited too; the operator approval itself must be recorded exactly once, with who applied it.
   const approvals=recovered.recoveryAudit.filter(event=>event.kind==='operator_retry_approved');
   assert.equal(recovered.manualRecoveryGrants[1],2);assert.equal(approvals.length,1);assert.equal(approvals[0].operator,'staging-verifier');
   assert.equal(recovered.chapters.length,1);assert.equal(String(recovered.paymentId),String(paymentIds[i]));
  }
  if(i!==0){
   // A retryable failure backs off before the next claim; the fixture moves only its own deadline instead of sleeping.
   assert.equal((await claimChapter(env,userId,id)).token,null);
   await YeongnyangiRequest.updateOne({_id:id,userId:owner},{$set:{nextAttemptAt:new Date(Date.now()-1000)}});
  }
  const retry=await claimChapter(env,userId,id);
  await finishChapter(env,userId,id,retry.token,1,{summary:'Staging fixture chapter two'},2);
  const restored=await readRequest(env,userId,id);
  assert.equal(restored.state,'COMPLETED');assert.equal(restored.chapters.length,2);
  assert.equal((await claimChapter(env,userId,id)).token,null);
  if(i===0){
   await Payment.updateOne({_id:paymentIds[i],userId:owner},{$set:{status:'refunded'}});
   await assert.rejects(claimChapter(env,userId,id),error=>error.status===409);
   assert.equal((await readRequest(env,userId,id)).state,'REFUNDED');
  }
  completed++;
 }
 console.log(JSON.stringify({status:'PASS',database,products:completed,atomicActivation:true,ownerIsolation:true,amountTamperingBlocked:true,
  duplicateChapterBlocked:true,failedGenerationRecovered:true,restoredResults:true,realPgCalls:0,realLlmCalls:0}));
}finally{
 if(connected){
  assert.equal(mongoose.connection.name,database);
  // Exact test IDs + random test owner. Never broad-delete customer or previous test records.
  await YeongnyangiRequest.deleteMany({_id:{$in:ids},userId:owner});
  await Payment.deleteMany({_id:{$in:paymentIds},userId:owner,'metadata.stagingQaRun':run});
  assert.equal(await YeongnyangiRequest.countDocuments({_id:{$in:ids},userId:owner}),0);
  assert.equal(await Payment.countDocuments({_id:{$in:paymentIds},userId:owner}),0);
  console.log(JSON.stringify({fixtureCleanup:'PASS',database}));
 }
 await mongoose.disconnect();
}
