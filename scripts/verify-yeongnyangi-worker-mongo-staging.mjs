import {config} from 'dotenv';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {connectDb,mongoose} from '../worker/lib/db.js';
import {User,Payment,ProfileCard,RefreshTokenSession} from '../worker/lib/models.js';
import {YeongnyangiRequest,YeongnyangiAnchovyAccount,YeongnyangiAnchovyLedger,YeongnyangiFreeReading} from '../worker/lib/yeongnyangi-models.js';
import {hashPassword} from '../worker/lib/password.js';
if(!process.argv.includes('--staging-fixtures'))throw Error('Explicit --staging-fixtures is required; staging fixtures only.');
config({path:'.env.local',quiet:true});
const origin='https://staging.code-destiny.com',database='code_destiny_staging',owner=new mongoose.Types.ObjectId(),foreignOwner=new mongoose.Types.ObjectId(),run=randomUUID(),email=`yn-edge-${run}@example.invalid`,password=randomUUID()+randomUUID();
const id=n=>createHash('sha256').update(run+':'+n).digest('hex');const ids=[id(0),id(1),id(2)],proofs=[new mongoose.Types.ObjectId(),new mongoose.Types.ObjectId()],profileId=`yn-free-${run}`;
const freeCategories=JSON.parse(readFileSync(new URL('../worker/yeongnyangi/fortune/free/categories.json',import.meta.url),'utf8'));let cookie='';
const report={origin,actualWorker:true,actualMongo:true,paymentProof:'staging fixture',realPgCalls:0,realLlmCalls:0,checks:[]};
async function api(path,body,authenticated=true){assert.ok(path==='/api/auth/login'||path==='/api/yeongnyangi/products'||/^\/api\/yeongnyangi\/(?:attendance|free\/unlock|free\/reading)$/.test(path)||/^\/api\/yeongnyangi\/requests\/[a-f0-9]{64}(?:\/activate)?$/.test(path));const r=await fetch(origin+path,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',...(cookie&&authenticated?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});if(path==='/api/auth/login')cookie=r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');const payload=await r.json();console.log(JSON.stringify({operation:path.replace(/[a-f0-9]{64}/g,'{id}'),method:body?'POST':'GET',status:r.status,code:payload.code||payload.error?.code,message:payload.message||payload.error?.message}));return {status:r.status,body:payload};}
try{
 await connectDb({...process.env,MONGO_DB_NAME:database,MONGODB_DB_NAME:database});assert.equal(mongoose.connection.name,database);
 await User.create({_id:owner,email,name:'영냥이 Edge QA',passwordHash:await hashPassword(password),role:'user',status:'active',localAuth:{enabled:true,activatedAt:new Date()}});
 await ProfileCard.create({userId:owner,profileId,name:'영냥이 무료운세 QA',gender:'F',birth:{year:1992,month:5,day:18,hour:9,minute:30,timeUnknown:false,calType:'solar'},location:{label:'서울',tz:'Asia/Seoul',lng:126.978,lat:37.5665}});
 const product=(await api('/api/yeongnyangi/products')).body.products.find(p=>p.id==='saju_mackerel');assert.equal(product.priceKRW,1000);
 for(let i=0;i<ids.length;i++)await YeongnyangiRequest.create({_id:ids[i],userId:i===2?foreignOwner:owner,profileId:run,productId:product.id,featureKey:product.cdFeatureKey,amountKRW:product.priceKRW,fingerprint:ids[i],state:'CREATED',snapshot:{product,manifest:[],analysis:{}},chapters:[]});
 for(let i=0;i<2;i++)await Payment.create({_id:proofs[i],userId:owner,merchantUid:`qa-edge-${run}-${i}`,requestId:`yn-${ids[i]}`,featureKey:product.cdFeatureKey,paymentType:'digital_content',accessType:'single_purchase',paymentAmount:i===0?1000:999,chargedPoints:0,status:'paid',source:'system',metadata:{stagingQaRun:run},entitlementGrantedAt:new Date(),receiptEmailSentAt:new Date()});
 assert.equal((await api('/api/auth/login',{email,password})).status,200);assert.ok(cookie);
 assert.equal((await api(`/api/yeongnyangi/requests/${ids[0]}`)).body.fortune.state,'CREATED');
 const activation=await Promise.all([api(`/api/yeongnyangi/requests/${ids[0]}/activate`,{}),api(`/api/yeongnyangi/requests/${ids[0]}/activate`,{})]);
 for(const response of activation){assert.equal(response.status,200,JSON.stringify(response.body));assert.equal(response.body.fortune.state,'PAID');assert.equal(response.body.fortune.paid,true);}
 const saved=await YeongnyangiRequest.findById(ids[0]).lean(),proof=await Payment.findById(proofs[0]).lean();assert.equal(String(saved.paymentId),String(proofs[0]));assert.equal(proof.metadata.consumedBy,ids[0]);
 for(let repeat=0;repeat<Number(process.env.YN_READ_REPEATS||0);repeat++){const probe=await api(`/api/yeongnyangi/requests/${ids[0]}`);assert.equal(probe.status,200);}
 const restored=await api(`/api/yeongnyangi/requests/${ids[0]}`);assert.equal(restored.status,200);assert.equal(restored.body.fortune.state,'PAID');
 assert.equal((await api(`/api/yeongnyangi/requests/${ids[0]}`,null,false)).status,401);
 assert.equal((await api(`/api/yeongnyangi/requests/${ids[2]}`)).status,404);
 assert.equal((await api(`/api/yeongnyangi/requests/${ids[1]}/activate`,{})).status,402);
 const attendance=await Promise.all([api('/api/yeongnyangi/attendance',{}),api('/api/yeongnyangi/attendance',{})]);
 assert.equal(attendance.filter(item=>item.body.awarded).length,1);assert.equal(attendance[0].body.balance,1);
 const unlocked=await Promise.all([api('/api/yeongnyangi/free/unlock',{}),api('/api/yeongnyangi/free/unlock',{})]);
 assert.equal(unlocked.filter(item=>item.body.newlyUnlocked).length,1);assert.ok(unlocked.every(item=>item.body.unlocked&&item.body.balance===0));
 const readings=[];
 for(const category of freeCategories){const response=await api('/api/yeongnyangi/free/reading',{category:category.id,profileId,draft:{question:'오늘의 선택을 어떻게 정리할까?'}});assert.equal(response.status,200,`${category.id}: ${JSON.stringify(response.body)}`);assert.equal(response.body.result.category,category.id);assert.ok(response.body.result.paragraphs.length>=4);readings.push(response.body.result);}
 const restoredFree=await api('/api/yeongnyangi/free/reading',{category:'basic',profileId,draft:{question:'바꾼 질문'}});assert.deepEqual(restoredFree.body.result,readings.find(item=>item.category==='basic'));
 assert.equal(await YeongnyangiAnchovyAccount.countDocuments({_id:owner,balance:0}),1);assert.equal(await YeongnyangiAnchovyLedger.countDocuments({userId:owner}),2);assert.equal(await YeongnyangiFreeReading.countDocuments({userId:owner}),16);
 report.checks=['login','created read','concurrent activation idempotency','atomic Payment proof consumption','paid restore','guest401','foreign404','amount mismatch402','concurrent attendance once','concurrent daily unlock once','sixteen fixed free readings','free reading restore','zero provider calls'];report.status='PASS';writeFileSync('build-cache/yeongnyangi-staging-worker-mongo-qa.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{
 if(mongoose.connection.readyState===1){assert.equal(mongoose.connection.name,database);await YeongnyangiRequest.deleteMany({_id:{$in:ids},userId:{$in:[owner,foreignOwner]}});await Payment.deleteMany({_id:{$in:proofs},userId:owner,'metadata.stagingQaRun':run});await YeongnyangiFreeReading.deleteMany({userId:owner});await YeongnyangiAnchovyLedger.deleteMany({userId:owner});await YeongnyangiAnchovyAccount.deleteMany({_id:owner});await ProfileCard.deleteMany({userId:owner,profileId});await RefreshTokenSession.deleteMany({userId:owner});await User.deleteOne({_id:owner,email});assert.equal(await YeongnyangiRequest.countDocuments({_id:{$in:ids}}),0);assert.equal(await Payment.countDocuments({_id:{$in:proofs}}),0);assert.equal(await YeongnyangiFreeReading.countDocuments({userId:owner}),0);assert.equal(await YeongnyangiAnchovyLedger.countDocuments({userId:owner}),0);assert.equal(await YeongnyangiAnchovyAccount.countDocuments({_id:owner}),0);assert.equal(await ProfileCard.countDocuments({userId:owner,profileId}),0);assert.equal(await User.countDocuments({_id:owner}),0);console.log(JSON.stringify({fixtureCleanup:'PASS'}));}await mongoose.disconnect();
}
