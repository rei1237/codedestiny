/** Read-only by default. Execute authorizes the existing queue/cron, never PG or another LLM implementation. */
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {config} from 'dotenv';
import {connectDb,mongoose} from '../worker/lib/db.js';
import {Payment} from '../worker/lib/models.js';
import {YeongnyangiRequest} from '../worker/lib/yeongnyangi-models.js';
import {chapterRecoveryPlan} from '../worker/yeongnyangi/recovery-plan.js';
import {CHAPTER_DELIVERY_VERSION} from '../worker/yeongnyangi/chapter-delivery-contract.js';
const args=process.argv.slice(2),arg=name=>args.includes(name)?args[args.indexOf(name)+1]:'';
const database=arg('--db'),id=arg('--request'),execute=args.includes('--execute');
if(!['code_destiny_staging','code_destiny'].includes(database)||!/^[a-f0-9]{64}$/.test(id))throw Error('Required: --db code_destiny[_staging] --request <64hex>');
if(args.some(a=>['--apply','--attempts','--resume-stop'].includes(a)))throw Error('Legacy recovery flags are disabled. Review dry-run, then use --execute --plan-sha <hash>.');
const reason=arg('--reason'),operator=arg('--operator'),approvedSha=arg('--plan-sha');
if(execute&&(!/^[a-f0-9]{64}$/.test(approvedSha)||!reason||reason.length>160||!/^[A-Za-z0-9._-]{2,40}$/.test(operator)))throw Error('Execute requires --plan-sha, --reason (incident reference only), and --operator (operator code, no personal name).');
config({path:'.env.local',quiet:true});
globalThis.fetch=()=>{throw Error('HTTP is forbidden in recovery. Deploy and verify the approved worker before execute.');};
const sha=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
try{
 await connectDb({...process.env,MONGO_DB_NAME:database,MONGODB_DB_NAME:database});
 if(mongoose.connection.name!==database)throw Error('Database mismatch');
 const row=await YeongnyangiRequest.findById(id).lean();
 if(!row)throw Error('Request not found');
 const payment=row.paymentId?await Payment.findById(row.paymentId).lean():null;
 const plan=chapterRecoveryPlan(row,payment,{allowPaymentCommitMarkers:args.includes('--allow-payment-commit-markers')});
 const before={requestId:id,state:row.state,errorCode:row.errorCode,attempts:row.attempts,chapterAttempts:row.chapterAttempts,
  manualRecoveryGrants:row.manualRecoveryGrants,systemRecoveryGrants:row.systemRecoveryGrants,
  nextAttemptAt:row.nextAttemptAt,queuedUntil:row.queuedUntil,updatedAt:row.updatedAt,recoveryPolicy:row.generationCheckpoint?.recoveryPolicy || null,
  snapshotSha:sha(row.snapshot),chapterSha:row.chapters.map(sha),paymentSha:sha(payment)};
 const planSha=sha(before);
 const output={database,mode:execute?'execute':'dry-run',...plan,planSha,preservedChapterHashes:before.chapterSha,applied:false};
 const replay=execute&&(row.recoveryAudit || []).some(e=>e.kind==='operator_recovery_authorized'&&e.planSha===approvedSha);
 if(replay){output.alreadyApplied=true;}
 else if(execute){
  if(!plan.ready)throw Error('Recovery blocked: '+plan.blockers.join(','));
  if(approvedSha!==planSha)throw Error('Plan changed. Inspect a fresh dry-run before approving again.');
  if(!plan.generate.length){output.alreadyComplete=true;}
  else{
   // Hashes and recovery fields only; not a plaintext backup of customer content.
   const beforePath=join(arg('--out-dir') || tmpdir(),'yeongnyangi-recovery-'+id.slice(0,12)+'-'+planSha.slice(0,12)+'-'+Date.now()+'.json');
   writeFileSync(beforePath,JSON.stringify(before,null,2),{flag:'wx'});
   const result=await YeongnyangiRequest.updateOne({_id:id,state:row.state,errorCode:row.errorCode,attempts:row.attempts,
    updatedAt:row.updatedAt,chapters:{$size:row.chapters.length},paymentId:row.paymentId,
    $or:[{leaseUntil:null},{leaseUntil:{$lte:new Date()}}]},
    {$set:{state:'PAID',errorCode:'',nextAttemptAt:null,queuedUntil:null,
      'generationCheckpoint.recoveryPolicy':CHAPTER_DELIVERY_VERSION,
      ['manualRecoveryGrants.'+plan.ordinal]:plan.manualGrant},
     $push:{recoveryAudit:{kind:'operator_recovery_authorized',source:'operator',operator,reason,planSha,
      chapter:plan.ordinal,at:new Date(),paymentCommitMarkersApproved:true,preservedChapterHashes:before.chapterSha}}});
   if(result.modifiedCount!==1)throw Error('Request changed before authorization. No generation was started by this script.');
   output.applied=true;output.beforeState=beforePath;output.next='Existing scheduled recovery publishes the missing chapter to the queue.';
  }
 }
 console.log(JSON.stringify(output,null,2));
}catch(error){
 if(error?.name?.startsWith('Mongo'))console.error(JSON.stringify({error:'RECOVERY_DATABASE_ERROR',type:error.name}));
 else console.error(JSON.stringify({error:String(error.message).slice(0,300)}));
 process.exitCode=1;
}finally{await mongoose.disconnect();}
