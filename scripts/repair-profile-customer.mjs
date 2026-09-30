/** Explicit operator repair; dry-run by default. No PG, LLM, profile deletion or purchase-state mutation. */
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {config} from 'dotenv';
import mongoose from 'mongoose';
const args=process.argv.slice(2),arg=key=>args[args.indexOf(key)+1];
if(!args.includes('--input')||!args.includes('--env')||!args.includes('--db'))throw Error('Required: --input <private artifact> --env <env file> --db <database>');
const input=JSON.parse(fs.readFileSync(arg('--input'),'utf8')),database=arg('--db');
if(!['code_destiny','code_destiny_staging'].includes(database)||!input.email||!input.merchantUid||!input.userId||!input.requestId||!input.originalHash)throw Error('Invalid repair scope');
const apply=args.includes('--execute-approved'),restore=args.includes('--restore-spends'),correct=args.includes('--apply-correction');
if(!restore&&!correct)throw Error('Select --restore-spends or --apply-correction');
config({path:arg('--env'),quiet:true});mongoose.set('autoCreate',false);mongoose.set('autoIndex',false);
globalThis.fetch=()=>{throw Error('HTTP/LLM is forbidden in customer repair');};
const {User,Payment,ProfileCard,MonthlyCreditLedger}=await import('../worker/lib/models.js');
const {YeongnyangiRequest}=await import('../worker/lib/yeongnyangi-models.js');
const {refundProfileMoonstone}=await import('../worker/lib/profile-moonstone-mutation.js');
const {correctedFortune}=await import('../worker/yeongnyangi/reading-correction.js');
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const output={database,applied:apply,restored:0,alreadyRestored:0,correctionApplied:false};
try{
 await mongoose.connect(process.env.MONGO_URI||process.env.MONGODB_URI||process.env.MONGO_URL||process.env.DATABASE_URL,{dbName:database,autoIndex:false,autoCreate:false,serverSelectionTimeoutMS:8000});
 const user=await User.findOne({_id:input.userId,email:input.email}).select('_id profileSubscription.membershipCreditBalance').lean();
 if(!user)throw Error('Account mismatch');
 const payment=await Payment.findOne({_id:input.paymentId,userId:user._id,merchantUid:input.merchantUid,status:{$in:['paid','success','fulfilled']},refundLock:null,'metadata.unlockRevoked':{$ne:true},'metadata.yeongnyangiRefundPending':{$ne:true},'metadata.consumedBy':input.requestId}).lean();
 if(!payment)throw Error('Payment changed');
 const row=await YeongnyangiRequest.findOne({_id:input.requestId,userId:user._id,paymentId:payment._id,state:'COMPLETED'}).lean();
 if(!row||hash({snapshot:row.snapshot,chapters:row.chapters})!==input.originalHash)throw Error('Original reading changed');
 if(restore){
  if(!Array.isArray(input.spends)||input.spends.length!==4||new Set(input.spends.map(s=>s.id)).size!==4||input.spends.reduce((sum,s)=>sum+s.amount,0)!==2000)throw Error('Expected exactly four approved spends totaling 2000');
  const rows=[];
  for(const expected of input.spends){
   const spend=await MonthlyCreditLedger.findOne({_id:expected.id,userId:user._id,type:'MONTHLY_CREDIT_SPEND',serviceKey:'profile-card-manage',sourceId:expected.sourceId,profileId:expected.profileId,amount:expected.amount,settledAt:{$exists:true}}).lean();
   if(!spend||spend.metadata?.profileMutationCompleted||spend.metadata?.profileMutationInProgress)throw Error('Spend is not a failed deletion');
   if(!spend.sourceId.startsWith(`profile-card:delete:${spend.profileId}:`))throw Error('Operation mismatch');
   if(!await ProfileCard.findOne({userId:user._id,profileId:spend.profileId}).select('_id').lean())throw Error('Profile no longer exists');
   rows.push(spend);
  }
  for(const spend of rows){
   if(spend.metadata?.profileMutationRefundCompletedAt){output.alreadyRestored+=spend.amount;continue;}
   if(apply){if(!await refundProfileMoonstone(spend,user._id,'프로필 삭제 증빙 연결 오류로 실패한 차감 복원'))throw Error('Restore not applied');output.restored+=spend.amount;}
  }
  output.eligibleRestore=rows.reduce((sum,s)=>sum+s.amount,0);
 }
 if(correct){
  const correction=input.correction;
  if(!correction||correctedFortune({...row,correction}).chapters!==correction.chapters||correction.originalHash!==input.originalHash)throw Error('Invalid correction artifact');
  if(row.correction){if(hash(row.correction)!==hash(correction))throw Error('Another correction already exists');output.correctionAlreadyApplied=true;}
  else if(apply){
   const result=await YeongnyangiRequest.updateOne({_id:row._id,userId:user._id,paymentId:payment._id,state:'COMPLETED',updatedAt:row.updatedAt,correction:{$exists:false}},{$set:{correction},$push:{recoveryAudit:{kind:'editorial_birth_correction',source:'operator',at:new Date(),originalHash:input.originalHash,correctionHash:hash(correction)}}});
   if(result.modifiedCount!==1)throw Error('Reading changed during repair');output.correctionApplied=true;
  }
 }
 const reread=await YeongnyangiRequest.findById(row._id).lean();
 if(hash({snapshot:reread.snapshot,chapters:reread.chapters})!==input.originalHash)throw Error('Original evidence changed');
 output.originalPreserved=true;output.profileCount=await ProfileCard.countDocuments({userId:user._id});
 const balance=await User.findById(user._id).select('profileSubscription.membershipCreditBalance').lean();output.balance=balance.profileSubscription?.membershipCreditBalance;
 console.log(JSON.stringify(output));
}finally{await mongoose.disconnect();}
