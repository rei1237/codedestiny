/** Operator recovery after resolving a provider issue. Never calls PG or LLM. Dry-run by default. */
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {config} from 'dotenv';
import {connectDb,mongoose} from '../worker/lib/db.js';
import {Payment} from '../worker/lib/models.js';
import {YeongnyangiRequest} from '../worker/lib/yeongnyangi-models.js';
import {heldReason} from '../worker/yeongnyangi/repository.js';
const args=process.argv.slice(2),arg=name=>args.includes(name)?args[args.indexOf(name)+1]:'';
const database=arg('--db'),id=arg('--request'),reason=arg('--reason'),operator=arg('--operator'),allowance=Number(arg('--attempts'));
const resumeStop=args.includes('--resume-stop');
if(!['code_destiny_staging','code_destiny'].includes(database)||!/^[a-f0-9]{64}$/.test(id)||!reason||reason.length>300||!/^[A-Za-z0-9가-힣][A-Za-z0-9가-힣._-]{1,39}$/.test(operator||'')
 ||(!resumeStop&&(!Number.isInteger(allowance)||allowance<1||allowance>5))){
 throw Error('Required: --db code_destiny[_staging] --request <64hex> --attempts <1..5> --reason <incident reference> --operator <name>. Add --apply only after inspecting dry-run.');
}
config({path:'.env.local',quiet:true});
globalThis.fetch=()=>{throw Error('HTTP is forbidden in recovery.');};
const sha=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
// Held for review: attempt limits, or the ask quality stop that only an operator may retry.
const heldCodes=resumeStop?['AUTOMATIC_RECOVERY_STOPPED']:['GENERATION_REVIEW_REQUIRED','ASK_LIMITED_REVIEW_REQUIRED'];
try{
 await connectDb({...process.env,MONGO_DB_NAME:database,MONGODB_DB_NAME:database});
 if(mongoose.connection.name!==database)throw Error('Database mismatch');
 const row=await YeongnyangiRequest.findById(id).lean();
 if(!row||row.state!=='FORTUNE_FAILED'||!heldCodes.includes(row.errorCode)||!row.paymentId)throw Error('Only paid requests held for generation review can be recovered');
 const payment=await Payment.findOne({_id:row.paymentId,userId:row.userId,'metadata.consumedBy':id,status:{$in:['paid','success','fulfilled']},refundLock:null,'metadata.unlockRevoked':{$ne:true},'metadata.yeongnyangiRefundPending':{$ne:true}}).select('_id').lean();
 if(!payment)throw Error('Payment is no longer active');
 // Preserve every counted attempt. Recovery grants add only the reviewed number
 // of calls for the current missing chapter and never reset its history.
 const ordinal=row.chapters.length,grantKey=`manualRecoveryGrants.${ordinal}`;
 const previousGrant=Math.max(0,Number(row.manualRecoveryGrants?.[ordinal] || 0));
 if(resumeStop&&previousGrant>=2)throw Error('User recovery limit exhausted; inspect as GENERATION_REVIEW_REQUIRED');
 const increase=resumeStop?1:allowance;
 // Identifiers, counts and codes only: no profile, birth data or chapter text.
 const diagnostics={errorCode:row.errorCode,holdReason:heldReason(row) || null,hold:row.hold??null,totalChapters:row.snapshot?.manifest?.length || 0,
  chapterAttempts:row.chapterAttempts??{},manualRecoveryGrants:row.manualRecoveryGrants??{},systemRecoveryGrants:row.systemRecoveryGrants??{},
  lastFailure:row.lastFailure?.code?{code:row.lastFailure.code,stage:row.lastFailure.stage,at:row.lastFailure.at}:null,
  recentAudit:(row.recoveryAudit || []).slice(-6).map(({kind,source,operator,chapter,code,detail,at})=>({kind,source,operator,chapter,code,detail,at}))};
 const output={database,requestId:id,completedChapters:ordinal,attempts:row.attempts,additionalCallsAllowed:increase,applied:false,diagnostics};
 if(args.includes('--apply')){
  // The before-state is written first so the change can be reviewed and reversed; chapters are kept only as hashes.
  const beforeState=join(arg('--out-dir') || tmpdir(),`yeongnyangi-recovery-${id.slice(0,12)}-${Date.now()}.json`);
  writeFileSync(beforeState,JSON.stringify({capturedAt:new Date().toISOString(),database,requestId:id,state:row.state,attempts:row.attempts,
   nextAttemptAt:row.nextAttemptAt??null,queuedUntil:row.queuedUntil??null,chapterSha:row.chapters.map(sha),...diagnostics},null,1));
  output.beforeState=beforeState;
  const grantMatch=previousGrant?{[grantKey]:previousGrant}:{[grantKey]:{$in:[null,0]}};
  const result=await YeongnyangiRequest.updateOne({_id:id,state:row.state,errorCode:row.errorCode,attempts:row.attempts,...grantMatch},
   {$inc:{[grantKey]:increase},$set:{errorCode:'',state:'PAID',nextAttemptAt:null,queuedUntil:null},$push:{recoveryAudit:{kind:'operator_retry_approved',source:'operator',operator,chapter:ordinal,at:new Date(),reason,allowance:increase,previousAttempts:row.attempts,code:diagnostics.holdReason || row.errorCode}}});
  if(result.modifiedCount!==1)throw Error('Request changed; inspect again before recovery');
  output.applied=true;
 }
 console.log(JSON.stringify(output));
}finally{await mongoose.disconnect();}
