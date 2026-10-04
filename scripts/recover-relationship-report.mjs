// Explicitly reviewed monthly-credit incidents only. No HTTP, LLM or asset writes.
import {config} from 'dotenv';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {connectDb,mongoose} from '../worker/lib/db.js';
import {RelationshipBoundaryTest,User,MonthlyCreditLedger} from '../worker/lib/models.js';
import {findMoonstoneSpendEvidence} from '../worker/lib/moonstone-spend-proof.js';
import {isPaidResultRevoked} from '../worker/lib/paid-result-revocation.js';
import {RELATIONSHIP_PART_IDS,editRelationshipPart,relationshipScoreAnchor} from '../worker/lib/relationship-report-delivery.js';
const args=process.argv.slice(2),arg=name=>args.includes(name)?args[args.indexOf(name)+1]:'';
const database=arg('--db'),sessionId=arg('--session'),execute=args.includes('--execute'),approved=arg('--plan-sha');
if(!['code_destiny','code_destiny_staging'].includes(database)||!/^rbt_[a-f0-9-]{36}$/.test(sessionId))throw Error('Required: --db code_destiny[_staging] --session <rbt_uuid>');
if(execute&&!/^[a-f0-9]{64}$/.test(approved))throw Error('Execute requires the dry-run --plan-sha');
config({path:'.env.local',quiet:true});
globalThis.fetch=()=>{throw Error('HTTP is forbidden in recovery');};
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
try{
 const env={...process.env,MONGO_DB_NAME:database,MONGODB_DB_NAME:database};await connectDb(env);
 if(mongoose.connection.name!==database)throw Error('Database mismatch');
 const row=await RelationshipBoundaryTest.findOne({id:sessionId}).lean();
 if(!row)throw Error('Result not found');
 const evidence=await findMoonstoneSpendEvidence(env,{userId:String(row.userId),featureKeys:['relationship-boundary-test'],tokens:[row.idempotencyKey]});
 const revoked=await isPaidResultRevoked(row.userId,'relationship-boundary-test',[row.id,row.idempotencyKey,row.paymentId]);
 const assets=await User.findById(row.userId).select('profileSubscription licenses passGrantOrderIds unlockedFeatures paidFeatures points').lean();
 const ledger=await MonthlyCreditLedger.find({userId:row.userId}).sort({_id:1}).lean();
 const blockers=[],meta=row.llmMeta||{},delivery=meta.delivery||{},parts=delivery.parts||{},repair={};
 if(row.accessType!=='monthly'||!evidence||revoked)blockers.push('ORIGINAL_DEBIT_NOT_PROVEN');
 if(ledger.some(e=>e.type==='MONTHLY_CREDIT_GRANT'&&new Date(e.createdAt)>new Date(row.createdAt)))blockers.push('POST_FAILURE_CREDIT_REVIEW_REQUIRED');
 if(row.status!=='generation_failed')blockers.push('NOT_FAILED');
 if(!meta.resumeBody?.targetInfo||!meta.facts||!meta.sectionPrompts?.length||!meta.evidenceHash)blockers.push('ORIGINAL_INPUT_MISSING');
 if(new Date(meta.lease?.until||0)>new Date())blockers.push('GENERATION_IN_PROGRESS');
 for(const id of RELATIONSHIP_PART_IDS.filter(id=>id!=='frame'&&!parts[id])){
  let candidate;try{candidate=JSON.parse(delivery.rawResponses?.[id]||'');}catch{continue;}
  if(candidate.evidenceHash!==meta.evidenceHash)continue;
  const body=editRelationshipPart(candidate.body,[...Object.values(parts),...Object.values(repair)].map(p=>p.body||''),relationshipScoreAnchor(meta));
  if(body)repair[id]={body};
 }
 const missing=RELATIONSHIP_PART_IDS.filter(id=>!parts[id]&&!repair[id]);
 if(missing.some(id=>Number(delivery.attempts?.[id]||0)>=2))blockers.push('PART_BUDGET_EXHAUSTED');
 if(!Object.keys(repair).length)blockers.push('NO_VALID_LOCAL_REPAIR');
 const before={sessionId,recordSha:hash(row),assetsSha:hash(assets),ledgerSha:hash(ledger),
  partSha:Object.fromEntries(Object.entries(parts).map(([id,part])=>[id,hash(part)]))};
 const planSha=hash({before,evidence});
 const output={mode:execute?'execute':'dry-run',sessionId,planSha,preserve:Object.keys(parts),localRepair:Object.keys(repair),generate:missing,
  expectedCalls:missing.length,maxAutomaticCalls:missing.reduce((sum,id)=>sum+2-Number(delivery.attempts?.[id]||0),0),blockers,ready:!blockers.length,applied:false};
 if(execute&&meta.recoveryAuthorization?.planSha===approved)output.alreadyApplied=true;
 else if(execute){
  if(blockers.length||approved!==planSha)throw Error('Recovery plan blocked or changed');
  const beforePath=join(tmpdir(),'relationship-recovery-'+planSha.slice(0,12)+'-'+Date.now()+'.json');
  writeFileSync(beforePath,JSON.stringify(before,null,2),{flag:'wx'});
  const fields={status:'partial',generationError:null,'llmMeta.limited':false,'llmMeta.recoveryNoRefund':true,
   'llmMeta.recoveryAuthorization':{planSha,at:new Date(),preservedPartHashes:before.partSha},
   'llmMeta.lease.token':'','llmMeta.lease.until':null};
  for(const [id,part]of Object.entries(repair)){fields['llmMeta.delivery.parts.'+id]=part;fields['llmMeta.delivery.localEdits.'+id]='DUPLICATE_SENTENCES_REMOVED';}
  const result=await RelationshipBoundaryTest.updateOne({_id:row._id,userId:row.userId,status:row.status,updatedAt:row.updatedAt,llmMeta:row.llmMeta},{$set:fields});
  if(result.modifiedCount!==1)throw Error('Concurrent result change; no repair committed');
  output.applied=true;output.beforeState=beforePath;output.next='Existing server recovery generates only missing parts using original debit proof.';
 }
 console.log(JSON.stringify(output,null,2));
}catch(error){console.error(JSON.stringify({error:error?.name?.startsWith('Mongo')?'RECOVERY_DATABASE_ERROR':String(error.message).slice(0,180)}));process.exitCode=1;}
finally{await mongoose.disconnect();}
