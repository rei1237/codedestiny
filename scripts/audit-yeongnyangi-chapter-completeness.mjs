// All-history, read-only audit. No result API, provider, payment operation or DB write.
// Customer content is checked in memory and never printed. References are hashed.
import {createHash} from 'node:crypto';
import {config} from 'dotenv';
import {connectDb,mongoose} from '../worker/lib/db.js';
import {Payment,MonthlyCreditLedger} from '../worker/lib/models.js';
import {YeongnyangiRequest} from '../worker/lib/yeongnyangi-models.js';
import {chapterDeliveryFailure,deliveredCharacterCount} from '../worker/yeongnyangi/chapter-delivery-contract.js';
const args=process.argv.slice(2),database=args[args.indexOf('--db')+1];
if(!args.includes('--db')||!['code_destiny','code_destiny_staging'].includes(database))throw Error('Required: --db code_destiny[_staging]');
config({path:'.env.local',quiet:true});
globalThis.fetch=()=>{throw Error('HTTP is forbidden in this read-only audit');};
const ref=id=>createHash('sha256').update(String(id)).digest('hex').slice(0,12);
const active=p=>p&&['paid','success','fulfilled'].includes(p.status)&&!p.metadata?.unlockRevoked&&!p.metadata?.yeongnyangiRefundPending&&!p.refundLock;
try{
 await connectDb({...process.env,MONGO_DB_NAME:database,MONGODB_DB_NAME:database,MONGO_MAX_POOL_SIZE:'3'});
 if(mongoose.connection.name!==database)throw Error('Database mismatch');
 const paymentRows=await Payment.collection.find({featureKey:/^yeongnyangi-(?:saju|ziwei|sukuyo|vedic|astrology|tarot)-(?:mackerel|salmon|flounder|tuna)$/},
  {projection:{userId:1,status:1,requestId:1,featureKey:1,createdAt:1,refundLock:1,'metadata.consumedBy':1,'metadata.unlockRevoked':1,'metadata.yeongnyangiRefundPending':1},maxTimeMS:20000}).toArray();
 const payments=new Map(paymentRows.map(p=>[String(p._id),p])),rows=[],tuna=[];
 const cursor=YeongnyangiRequest.collection.find({productId:/^(?:saju|ziwei|sukuyo|vedic|astrology|tarot)_/, $or:[{paymentId:{$ne:null}},{accessMethod:{$in:['FAMILY','MOONLIGHT_STONE','SERVICE_PACK']}}]},
  {projection:{userId:1,productId:1,state:1,paymentId:1,accessMethod:1,chapters:1,'snapshot.manifest':1,attempts:1,createdAt:1,completedAt:1,errorCode:1,
    'recoveryAudit.kind':1,'recoveryAudit.code':1},maxTimeMS:20000});
 for await(const r of cursor){
  const payment=payments.get(String(r.paymentId)),manifest=r.snapshot?.manifest||[],chapters=r.chapters||[];
  const issues=manifest.flatMap((c,i)=>{
   const code=chapters[i]?chapterDeliveryFailure(chapters[i],c,false):'MISSING';
   return code?[{chapterId:c.id,code,chars:deliveredCharacterCount(chapters[i])}]:[];
  });
  if(!manifest.length||chapters.length>manifest.length)issues.push({code:'INVALID_MANIFEST'});
  const paidVerified=!!(active(payment)&&String(payment.userId)===String(r.userId)&&payment.requestId==='yn-'+String(r._id)&&payment.metadata?.consumedBy===String(r._id));
  const item={ref:ref(r._id),product:r.productId,state:r.state,access:r.accessMethod||'legacy',paymentStatus:payment?.status||null,paidVerified,
   saved:chapters.length,total:manifest.length,issues,attempts:r.attempts||0,createdAt:r.createdAt,completedAt:r.completedAt,
   failureCodes:(r.recoveryAudit||[]).filter(e=>/failure|stopped|review/.test(e.kind)).reduce((out,e)=>(out[e.code||e.kind]=(out[e.code||e.kind]||0)+1,out),{})};
  rows.push(item);
  if(r.productId.endsWith('_tuna'))tuna.push({userId:String(r.userId),id:String(r._id),...item});
 }
 const compensation=await MonthlyCreditLedger.collection.find({type:'MONTHLY_CREDIT_GRANT',reason:/보상|compens/i},
  {projection:{userId:1,createdAt:1},maxTimeMS:20000}).toArray();
 const compensationFollowups=compensation.flatMap(c=>tuna.filter(t=>t.userId===String(c.userId)&&new Date(t.createdAt)>new Date(c.createdAt))
  .map(t=>({ref:t.ref,compensatedAt:c.createdAt,state:t.state,saved:t.saved,total:t.total,issues:t.issues})));
 const linked=new Set(rows.map(r=>r.ref));
 const unlinked=paymentRows.filter(p=>active(p)&&!linked.has(ref(p.requestId?.slice(3)))).map(p=>({ref:ref(p._id),feature:p.featureKey,status:p.status}));
 const paid=rows.filter(r=>r.paidVerified);
 console.log(JSON.stringify({database,at:new Date().toISOString(),scope:'All stored single-system Yeongnyangi purchases; fusion excluded',
  paidOrders:paid.length,completed:paid.filter(r=>r.state==='COMPLETED').length,
  unresolved:paid.filter(r=>r.state!=='COMPLETED'||r.issues.length),paidUnlinked:unlinked,
  tuna:tuna.filter(r=>r.paidVerified).map(({userId:_user,id:_id,...r})=>r),compensationFollowups,
  otherAccess:{orders:rows.filter(r=>!r.paymentStatus).length,issues:rows.filter(r=>!r.paymentStatus&&(r.state!=='COMPLETED'||r.issues.length))},
  refunded:rows.filter(r=>r.paymentStatus==='refunded').length,
  limitations:['No provider finish_reason exists for legacy output; checks cover saved manifest, length, sections and cutoff phrases, not semantic accuracy.',
   'Refunded purchases are excluded from recovery. Pass/moonlight proof and non-Yeongnyangi result stores need separate evidence checks.',
   'Stored attempts are reservations, not exact token usage or cost. No writes or generation performed.']},null,2));
}catch(error){
 console.error(JSON.stringify({error:error?.name?.startsWith('Mongo')?'AUDIT_DATABASE_ERROR':String(error.message).slice(0,200)}));process.exitCode=1;
}finally{await mongoose.disconnect();}
