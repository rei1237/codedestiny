// Read-only revenue funnel report: KST-aligned current window vs the window before it.
// Native driver only — no model/index creation, PG/provider/LLM calls, writes or refunds.
// Output carries counts and KRW sums only; no user ids, emails, birth data or questions.
//
// Denominators:
//   checkout_*      checkout_funnel_events (anonymous beacon; ad-blockers and closed tabs are lost, so a floor)
//   attempts        payments rows created in the window (one row per PG attempt, not per person)
//   paid            server-verified rows (status paid/success/fulfilled, or refunded later) — never a client click
//   buyers          distinct userId among paid; repeatBuyers = buyers with >=2 paid rows in the window
//   returningBuyers buyers who also had a paid row before the window
// Exclusions: users.role === 'admin' and --exclude-emails owner/test accounts. Their rows are counted under `excluded`, never dropped silently.
import {config} from 'dotenv';
import {MongoClient} from 'mongodb';

const value=name=>process.argv.find(arg=>arg.startsWith(`--${name}=`))?.slice(name.length+3);
const database=value('db'), days=Number(value('days')||28);
if(!['code_destiny','code_destiny_staging'].includes(database)||!Number.isInteger(days)||days<1||days>45)
  throw Error('Required: --db=code_destiny[_staging]; optional --days=1..45 (default 28) --env-file=<path>');
config({path:value('env-file')||'.env.local',quiet:true});
globalThis.fetch=()=>{throw Error('HTTP is forbidden in this read-only report');};

const KST=9*3600000, DAY=86400000;
const todayKst=Math.floor((Date.now()+KST)/DAY)*DAY-KST; // today's 00:00 KST as UTC ms
const windows=[
  {label:'current',since:new Date(todayKst-(days-1)*DAY),until:new Date(Date.now())},
  {label:'previous',since:new Date(todayKst-(2*days-1)*DAY),until:new Date(todayKst-(days-1)*DAY)},
];
const PAID=['paid','success','fulfilled'];
// yeongnyangi_requests.state values written by worker/yeongnyangi; anything else lands in reading_other_state (never dropped).
const KNOWN_REQUEST_STATES=['CREATED','PAID','GENERATING','AWAITING_FOLLOWUP','COMPLETED','FORTUNE_FAILED','REFUNDED'];
const percentile=(values,p)=>values.length?[...values].sort((a,b)=>a-b)[Math.ceil(values.length*p)-1]:null;
const family=key=>{
  const k=String(key||'');
  if(k.startsWith('yeongnyangi-'))return 'yeongnyangi';
  if(!k)return 'unknown';
  return 'ggulggul';
};
const bump=(map,key,field,by=1)=>{const row=map.get(key)||{};row[field]=(row[field]||0)+by;map.set(key,row);};

const client=new MongoClient(process.env.MONGO_URI||process.env.MONGODB_URI,{maxPoolSize:1,serverSelectionTimeoutMS:12000});
try{
  await client.connect();
  const db=client.db(database);
  // Operators: admin role plus explicitly named owner/test accounts (--exclude-emails=a@x,b@y). Emails are matched, never printed.
  const ownerEmails=(value('exclude-emails')||'').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);
  const admins=new Set((await db.collection('users').find({$or:[{role:'admin'},...(ownerEmails.length?[{email:{$in:ownerEmails}}]:[])]},{projection:{_id:1},maxTimeMS:12000}).toArray()).map(row=>String(row._id)));
  const report={database,timezone:'Asia/Seoul',days,observedAt:new Date().toISOString(),windows:{}};
  for(const window of windows){
    const range={$gte:window.since,$lt:window.until};
    const rows=await db.collection('payments').find({createdAt:range},{projection:{_id:0,userId:1,status:1,paymentAmount:1,featureKey:1,
      productId:1,paymentMethod:1,paymentType:1,purchaseType:1,failureCode:1,refundedAt:1,createdAt:1,paidAt:1,'rawPortOne.attempt.provider':1,
      'metadata.paymentAttempt.provider':1},maxTimeMS:12000}).limit(20001).toArray();
    if(rows.length>20000)throw Error('Narrow --days: more than 20000 payment rows');
    const excluded={adminRows:0,adminPaidKRW:0};
    const attemptsUsers=new Set(), buyers=new Map(), buyerIds=new Map(), byFamily=new Map(), byMethod=new Map(), byProduct=new Map(), byType=new Map(), byPrice=new Map(), byFailure=new Map();
    let attempts=0, paid=0, gross=0, refunded=0, refundedKRW=0, failed=0, cancelled=0, pending=0;
    const verifyLagMs=[];
    for(const row of rows){
      const user=String(row.userId);
      const isPaid=PAID.includes(row.status)||(row.status==='refunded'&&row.refundedAt);
      const amount=Number(row.paymentAmount)||0;
      if(admins.has(user)){excluded.adminRows++;if(isPaid)excluded.adminPaidKRW+=amount;continue;}
      attempts++;attemptsUsers.add(user);
      const key=row.productId||row.featureKey||row.paymentType||'unknown';
      const fam=family(row.productId||row.featureKey);
      const method=row.rawPortOne?.attempt?.provider||row.metadata?.paymentAttempt?.provider||row.paymentMethod||'unknown';
      bump(byFamily,fam,'attempts');bump(byMethod,method,'attempts');bump(byProduct,key,'attempts');bump(byType,row.paymentType||'unknown','attempts');
      if(isPaid){
        paid++;gross+=amount;buyers.set(user,(buyers.get(user)||0)+1);buyerIds.set(user,row.userId);
        bump(byFamily,fam,'paid');bump(byFamily,fam,'grossKRW',amount);
        bump(byMethod,method,'paid');bump(byProduct,key,'paid');bump(byProduct,key,'grossKRW',amount);
        bump(byType,row.paymentType||'unknown','paid');bump(byType,row.paymentType||'unknown','grossKRW',amount);
        const band=amount<=1000?'<=1000':amount<=3000?'<=3000':amount<=10000?'<=10000':amount<=30000?'<=30000':'>30000';
        bump(byPrice,band,'paid');bump(byPrice,band,'grossKRW',amount);
        if(row.paidAt&&row.createdAt)verifyLagMs.push(new Date(row.paidAt)-new Date(row.createdAt));
        if(row.status==='refunded'){refunded++;refundedKRW+=amount;}
      } else if(row.status==='failed'){failed++;bump(byFailure,`failed:${row.failureCode||'none'}`,'n');}
      else if(row.status==='cancelled'){cancelled++;bump(byFailure,`cancelled:${row.failureCode||'none'}`,'n');}
      else pending++;
    }
    const returning=buyers.size?await db.collection('payments').distinct('userId',{userId:{$in:[...buyerIds.values()]},
      createdAt:{$lt:window.since},status:{$in:[...PAID,'refunded']}},{maxTimeMS:12000}):[];
    const funnel=await db.collection('checkout_funnel_events').aggregate([
      {$match:{createdAt:range}},
      {$group:{_id:{name:'$name',fam:{$cond:[{$regexMatch:{input:'$featureKey',regex:/^yeongnyangi-/}},'yeongnyangi','ggulggul']}},n:{$sum:1}}},
    ],{maxTimeMS:12000}).toArray();
    const requests=await db.collection('yeongnyangi_requests').aggregate([
      {$match:{createdAt:range}},
      {$group:{_id:{state:'$state',errorCode:'$errorCode',paid:{$cond:[{$or:[{$ne:[{$ifNull:['$paymentId',null]},null]},{$ne:[{$ifNull:['$passEvidenceId',null]},null]}]},'paid','unpaid']}},
        n:{$sum:1},completeMs:{$push:{$cond:[{$and:['$completedAt','$createdAt']},{$subtract:['$completedAt','$createdAt']},'$$REMOVE']}}}},
    ],{maxTimeMS:12000}).toArray();
    const completeMs=requests.filter(r=>r._id.paid==='paid').flatMap(r=>r.completeMs);
    const signups=await db.collection('users').countDocuments({createdAt:range,role:{$ne:'admin'}},{maxTimeMS:12000});
    const net=gross-refundedKRW;
    const paidRequests=requests.filter(r=>r._id.paid==='paid');
    const requestCount=states=>paidRequests.filter(r=>states.includes(r._id.state)).reduce((a,r)=>a+r.n,0);
    // Concentration without identities: how much of paid/refunded volume sits with the top 1 and top 3 buyers.
    const perBuyer=[...buyers.values()].sort((a,b)=>b-a);
    const refundsPerUser=new Map();for(const row of rows)if(row.status==='refunded'&&!admins.has(String(row.userId)))refundsPerUser.set(String(row.userId),(refundsPerUser.get(String(row.userId))||0)+1);
    const perRefunder=[...refundsPerUser.values()].sort((a,b)=>b-a);
    const share=(list,n)=>{const total=list.reduce((a,b)=>a+b,0);return total?+(list.slice(0,n).reduce((a,b)=>a+b,0)/total).toFixed(2):null;};
    report.windows[window.label]={
      since:window.since.toISOString(),until:window.until.toISOString(),
      signups,
      checkoutEvents:Object.fromEntries(funnel.map(r=>[`${r._id.fam}:${r._id.name}`,r.n]).sort()),
      payments:{attempts,attemptUsers:attemptsUsers.size,paid,failed,cancelled,pendingOrUnconfirmed:pending,refunded,
        grossKRW:gross,refundedKRW,netKRW:net,buyers:buyers.size,repeatBuyersInWindow:[...buyers.values()].filter(n=>n>=2).length,
        returningBuyers:returning.length,aovKRW:paid?Math.round(gross/paid):null,
        attemptToPaidUserRate:attemptsUsers.size?+(buyers.size/attemptsUsers.size).toFixed(3):null,
        createdToPaidMs:{n:verifyLagMs.length,p50:percentile(verifyLagMs,.5),p95:percentile(verifyLagMs,.95)}},
      byFamily:Object.fromEntries(byFamily),byMethod:Object.fromEntries(byMethod),byPriceBand:Object.fromEntries(byPrice),
      byPaymentType:Object.fromEntries(byType),byFailureCode:Object.fromEntries([...byFailure].map(([k,v])=>[k,v.n])),
      // Funnel steps that the server ledger answers directly (no client event, so no consent/ad-block loss).
      serverEvents:{payment_verified:paid,payment_failed:failed,payment_cancelled:cancelled,refund:refunded,
        reading_started_yeongnyangi:paidRequests.reduce((a,r)=>a+r.n,0),reading_completed_yeongnyangi:requestCount(['COMPLETED']),
        reading_failed_yeongnyangi:requestCount(['FORTUNE_FAILED']),reading_refunded_yeongnyangi:requestCount(['REFUNDED']),
        reading_in_progress_yeongnyangi:requestCount(['PAID','GENERATING','AWAITING_FOLLOWUP','CREATED']),
        reading_other_state_yeongnyangi:paidRequests.filter(r=>!KNOWN_REQUEST_STATES.includes(r._id.state)).reduce((a,r)=>a+r.n,0),
        repeat_purchase_buyers:new Set([...[...buyers].filter(([,n])=>n>=2).map(([u])=>u),...returning.map(String)]).size},
      topProducts:Object.fromEntries([...byProduct].sort((a,b)=>(b[1].attempts||0)-(a[1].attempts||0)).slice(0,15)),
      yeongnyangiRequests:{byStatePaid:requests.map(r=>({state:r._id.state,errorCode:r._id.errorCode||null,paid:r._id.paid,n:r.n})),
        paidCreatedToCompletedMs:{n:completeMs.length,p50:percentile(completeMs,.5),p95:percentile(completeMs,.95)}},
      concentration:{paidRowsTop1Share:share(perBuyer,1),paidRowsTop3Share:share(perBuyer,3),refundUsers:perRefunder.length,refundRowsTop1Share:share(perRefunder,1)},
      excluded:{...excluded,adminAccounts:admins.size},
    };
  }
  report.limitations=[
    'Visits/landing views are not in the DB: GA4 and Cloudflare Web Analytics hold them (not accessed here).',
    'checkout_funnel_events is a floor (beacon loss, 90-day TTL). checkout_pg_opened exists only since 2026-08-15.',
    'payments.failed/cancelled include owner test attempts made from non-admin accounts; admin role is the only automated exclusion.',
    'createdToPaid includes the time a customer spends in the PG window; it is not server latency.',
  ];
  console.log(JSON.stringify(report,null,2));
}finally{await client.close();}
