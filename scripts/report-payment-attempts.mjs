// Explicit read-only operational report. Native driver: no model/index creation,
// PG requests, reconciliation, notifications, refunds or provider calls.
import {config} from 'dotenv';
import {MongoClient} from 'mongodb';
const value=name=>process.argv.find(arg=>arg.startsWith(`--${name}=`))?.slice(name.length+3);
const database=value('db'),since=new Date(value('since')),until=new Date(value('until'));
if(!['code_destiny','code_destiny_staging'].includes(database)||!Number.isFinite(+since)||!Number.isFinite(+until)||until<=since||until-since>31*86400000)
  throw Error('Required: --db=code_destiny[_staging] --since=<ISO> --until=<ISO>; maximum 31 days');
config({path:value('env-file')||'.env.local',quiet:true});
const client=new MongoClient(process.env.MONGO_URI||process.env.MONGODB_URI,{maxPoolSize:1,serverSelectionTimeoutMS:12000});
try {
  await client.connect();
  const rows=await client.db(database).collection('payments').find({createdAt:{$gte:since,$lt:until},requestId:/^yn-[a-f0-9]{64}$/},
    {projection:{_id:0,userId:1,requestId:1,status:1,paymentMethod:1,createdAt:1,failureCode:1,'metadata.paymentAttempt':1,
      'metadata.duplicatePaymentReviewRequired':1,'rawPortOne.attempt':1},maxTimeMS:12000}).limit(10001).toArray();
  if(rows.length>10000)throw Error('Narrow the date range: more than 10000 payment attempts');
  const methods=new Map(),intents=new Map(),users=new Set();
  let duplicates=0;
  for(const row of rows){
    // A late verified approval supersedes the earlier failed webhook summary.
    const summary=['paid','success','fulfilled'].includes(row.status)
      ? row.rawPortOne?.attempt||row.metadata?.paymentAttempt
      : row.metadata?.paymentAttempt||row.rawPortOne?.attempt;
    const method=summary?.provider||'UNKNOWN';
    const outcome=summary?.outcome||(['paid','success','fulfilled'].includes(row.status)?'succeeded':row.failureCode==='PG_PAYMENT_CANCELLED'?'cancelled':row.status==='failed'?'failed_unclassified':'unconfirmed');
    const group=methods.get(method)||{provider:method,attempts:0,succeeded:0,failed:0,cancelled:0,unconfirmed:0,failed_unclassified:0};
    group.attempts++;group[outcome in group?outcome:'unconfirmed']++;methods.set(method,group);
    const key=`${row.userId}:${row.requestId}`,intent=intents.get(key)||[];
    intent.push({at:row.createdAt,method,outcome});intents.set(key,intent);users.add(String(row.userId));
    duplicates+=row.metadata?.duplicatePaymentReviewRequired===true;
  }
  let retrySucceeded=0,crossMethodRetrySucceeded=0,unclassifiedRetrySucceeded=0,dualApprovalIntents=0;
  for(const attempts of intents.values()){
    attempts.sort((a,b)=>a.at-b.at);
    const win=attempts.findIndex(a=>a.outcome==='succeeded');
    dualApprovalIntents+=attempts.filter(a=>a.outcome==='succeeded').length>1;
    if(win>0){retrySucceeded++;if(attempts.slice(0,win+1).some(a=>a.method==='UNKNOWN'))unclassifiedRetrySucceeded++;
      else if(attempts.slice(0,win).some(a=>a.method!==attempts[win].method))crossMethodRetrySucceeded++;}
  }
  console.log(JSON.stringify({database,since,until,uniqueCustomers:users.size,purchaseIntents:intents.size,attempts:rows.length,
    methods:[...methods.values()],retrySucceeded,crossMethodRetrySucceeded,unclassifiedRetrySucceeded,dualApprovalIntents,duplicateApprovalReviewRequired:duplicates,
    limitations:['Attempts are persisted merchant orders, not unique PG transactions or buyers.',
      'Older rows without verified provider/outcome remain UNKNOWN; do not infer them from the initial selected method.',
      'SDK failures before an order exists are not included; missing telemetry is not zero failures.'],
  },null,2));
} catch(error){console.error(JSON.stringify({error:error.name,code:error.code||'REPORT_FAILED'}));process.exitCode=1;}
finally{await client.close();}
