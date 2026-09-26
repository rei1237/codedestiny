// Read-only operations report. No PG, provider, retries, migration or DB writes.
import { config } from 'dotenv';
import { connectDb, mongoose } from '../worker/lib/db.js';
import { Payment, ServiceExecutionTransaction } from '../worker/lib/models.js';
import { YeongnyangiRequest } from '../worker/lib/yeongnyangi-models.js';
const args=process.argv.slice(2), arg=name=>args.includes(name)?args[args.indexOf(name)+1]:'';
const database=arg('--db'), days=Number(arg('--days') || 7);
if(!['code_destiny','code_destiny_staging'].includes(database)||!Number.isInteger(days)||days<1||days>90)
  throw Error('Required: --db code_destiny[_staging]; optional --days 1..90 --env-file <path>');
config({path:arg('--env-file') || '.env.local',quiet:true});
globalThis.fetch=()=>{throw Error('HTTP is forbidden in this read-only report');};
const now=new Date(), since=new Date(now.getTime()-days*86400000);
const percentile=(values,p)=>values.length?[...values].sort((a,b)=>a-b)[Math.ceil(values.length*p)-1]:null;
const distribution=values=>({n:values.length,p50:percentile(values,.5),p95:percentile(values,.95)});
try {
  await connectDb({...process.env,MONGO_DB_NAME:database,MONGODB_DB_NAME:database});
  if(mongoose.connection.name!==database)throw Error('Database mismatch');
  const groups=await YeongnyangiRequest.collection.aggregate([
    {$match:{createdAt:{$gte:since},$or:[{paymentId:{$ne:null}},{accessMethod:'FAMILY',passEvidenceId:{$ne:null}}]}},
    {$project:{_id:0,productId:1,state:1,errorCode:1,createdAt:1,completedAt:1,attempts:1,
      saved:{$size:{$ifNull:['$chapters',[]]}},total:{$size:{$ifNull:['$snapshot.manifest',[]]}}}},
  ],{maxTimeMS:12000}).toArray();
  const byProduct=new Map();
  for(const row of groups){
    const group=byProduct.get(row.productId)||{productId:row.productId,orders:0,completed:0,refunded:0,reviewRequired:0,partial:0,attempts:0,elapsed:[]};
    group.orders++;group.completed+=row.state==='COMPLETED';group.refunded+=row.state==='REFUNDED';
    group.reviewRequired+=['GENERATION_REVIEW_REQUIRED','ASK_LIMITED_REVIEW_REQUIRED','AUTOMATIC_RECOVERY_STOPPED'].includes(row.errorCode);
    group.partial+=row.saved>0&&row.saved<row.total;group.attempts+=Number(row.attempts)||0;
    if(row.state==='COMPLETED'&&row.completedAt&&row.createdAt)group.elapsed.push(new Date(row.completedAt)-new Date(row.createdAt));
    byProduct.set(row.productId,group);
  }
  const activePayments=await Payment.collection.aggregate([
    {$match:{createdAt:{$gte:since},requestId:/^yn-[a-f0-9]{64}$/,status:{$in:['paid','success','fulfilled']},
      purchaseType:{$ne:'GIFT'},'metadata.unlockRevoked':{$ne:true},'metadata.yeongnyangiRefundPending':{$ne:true}}},
    {$project:{_id:0,requestId:1}},
    {$lookup:{from:'yeongnyangi_requests',let:{id:{$substrBytes:['$requestId',3,64]}},pipeline:[
      {$match:{$expr:{$eq:['$_id','$$id']}}},{$project:{_id:0,state:1,paymentId:1}}],as:'request'}},
    {$project:{missing:{$eq:[{$size:'$request'},0]},unactivated:{$eq:[{$arrayElemAt:['$request.state',0]},'CREATED']}}},
    {$group:{_id:null,paid:{$sum:1},missingRequest:{$sum:{$cond:['$missing',1,0]}},unactivated:{$sum:{$cond:['$unactivated',1,0]}}}},
    {$project:{_id:0}},
  ],{maxTimeMS:12000}).toArray();
  const narrative=await ServiceExecutionTransaction.collection.aggregate([
    {$match:{createdAt:{$gte:since},'metadata.paidNarrative':{$exists:true}}},
    {$group:{_id:{featureKey:'$featureKey',status:'$status',premiumStatus:'$premiumStatus'},count:{$sum:1}}},
  ],{maxTimeMS:12000}).toArray();
  console.log(JSON.stringify({database,since:since.toISOString(),until:now.toISOString(),days,
    yeongnyangi:[...byProduct.values()].map(({elapsed,...row})=>({...row,completionRate:row.orders?row.completed/row.orders:null,
      requestCreatedToCompletedMs:distribution(elapsed)})),
    paidOrderLinkage:activePayments[0]||{paid:0,missingRequest:0,unactivated:0},narrative,
    limitations:['Creation-to-completion includes customer/payment wait; it is not LLM latency.',
      'Current-state counts are not recovery success rates. Old orders outside the window are excluded.',
      'No PG verification or customer recovery was performed. Other product stores require their own inventory adapters.'],
  },null,2));
} finally { await mongoose.disconnect(); }
