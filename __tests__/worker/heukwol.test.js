/** @jest-environment node */
import {jest} from '@jest/globals';
const rows=new Map();let account='owner',paid=true,revoked=false,failGeneration=false,calls=0,refunds=0;
const clone=v=>v?structuredClone(v):v;
function set(row,values){for(const [path,value] of Object.entries(values||{})){const parts=path.split('.');let at=row;while(parts.length>1){const k=parts.shift();at[k]||={};at=at[k];}at[parts[0]]=value;}}
function match(q){const row=rows.get(`${q.userId}:${q.executionKey}`);if(!row||row.featureKey!==q.featureKey&&q.featureKey)return null;if(q.status&&row.status!==q.status)return null;if(q['lock.token']&&row.lock?.token!==q['lock.token'])return null;return row;}
const Model={findOne:q=>({lean:async()=>clone(match(q))}),findOneAndUpdate:(q,u)=>({lean:async()=>{const row=match(q);if(!row||q.$or&&row.lock?.until>new Date())return null;set(row,u.$set);return clone(row);}}),updateOne:async(q,u)=>{const row=match(q);if(!row)return {modifiedCount:0,matchedCount:0};set(row,u.$set);return {modifiedCount:1,matchedCount:1};}};
jest.unstable_mockModule('../../worker/lib/auth.js',()=>({requireAuth:async()=>({userId:account})}));
jest.unstable_mockModule('../../worker/lib/db.js',()=>({connectDb:async()=>{}}));
jest.unstable_mockModule('../../worker/lib/models.js',()=>({ServiceExecutionTransaction:Model,ProfileCard:{findOne:q=>({lean:async()=>q.userId==='owner'&&q.profileId==='profile'?{profileId:'profile'}:null})},PointHistory:{findOne:()=>({lean:async()=>null})}}));
jest.unstable_mockModule('../../worker/lib/paid-content-read-access.js',()=>({profileCardSolarBirth:()=>({date:'1990-05-15',time:'14:30',timeKnown:true,gender:'female'})}));
jest.unstable_mockModule('../../worker/lib/nakshatra-paid-access.js',()=>({verifyPerUsePayment:async()=>({proven:paid,source:'payment',transactionId:'proof'})}));
jest.unstable_mockModule('../../worker/lib/billing-evidence-claim.js',()=>({claimRequestBillingEvidence:async()=>({ok:true})}));
jest.unstable_mockModule('../../worker/lib/paid-result-revocation.js',()=>({isStoredPaidResultRevoked:async()=>revoked}));
jest.unstable_mockModule('../../worker/lib/service-execution-task.js',()=>({
 startServiceExecution:async(_env,userId,p)=>{const key=`${userId}:${p.executionKey}`;if(!rows.has(key))rows.set(key,{...p,userId,status:'pending',lock:{}});return {ok:true};},
 completeServiceExecution:async(_env,userId,p)=>{const row=rows.get(`${userId}:${p.executionKey}`);row.status='success';row.metadata=p.metadata;return {ok:true};},
 failServiceExecution:async(_env,userId,p)=>{refunds++;rows.get(`${userId}:${p.executionKey}`).status='failed';return {ok:true};},
}));
const CHAPTERS=Array.from({length:27},(_,i)=>({key:`chapter-${i}`,title:`${i}장`}));
jest.unstable_mockModule('../../worker/lib/heukwol-report.js',()=>({HEUKWOL_FEATURE_KEY:'heukwol-warning-consultation',HEUKWOL_CHAPTERS:CHAPTERS,HEUKWOL_MIN_CHARS:40000,
 generateHeukwolChapter:async(_env,_analysis,c)=>{calls++;if(failGeneration)throw new Error('mock unavailable');return {...c,content:`본문 ${c.key}`,totalChars:2000};}}));
let handleHeukwolRoutes,advanceHeukwol;
beforeAll(async()=>{({handleHeukwolRoutes,advanceHeukwol}=await import('../../worker/routes/heukwol.js'));});
const input={profileId:'profile',year:new Date().getUTCFullYear()+1,question:'같은 일을 반복하지 않으려면 어떤 조건을 확인할까요?',requestId:'heukwol-test-1234'};
const post=(path,body=input)=>handleHeukwolRoutes(new Request(`https://test.invalid/api/heukwol/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),{});
beforeEach(()=>{rows.clear();account='owner';paid=true;revoked=false;failGeneration=false;calls=0;refunds=0;});
test('prepare cannot call LLM or start billing; unproven purchase is blocked',async()=>{
 expect((await post('prepare')).status).toBe(200);expect(rows.size).toBe(0);expect(calls).toBe(0);
 paid=false;expect((await post('start')).status).toBe(402);expect(calls).toBe(0);
});
test('twenty-seven checkpoints produce one stored report; replay does not regenerate',async()=>{
 let response=await post('start'),data=await response.json();expect(data.completedChapters).toBe(1);
 for(let i=1;i<27;i++)data=await (await advanceHeukwol({},'owner',data.id)).json();
 expect(data.status).toBe('completed');expect(data.report.totalChars).toBe(54000);expect(calls).toBe(27);
 const replay=await (await post('start')).json();expect(replay.report).toEqual(data.report);expect(calls).toBe(27);
});
test('same purchase cannot change year or question; foreign owner and revoked result denied',async()=>{
 const data=await (await post('start')).json();expect((await post('start',{...input,year:input.year+1})).status).toBe(409);
 expect((await advanceHeukwol({},'intruder',data.id)).status).toBe(404);
 revoked=true;expect((await advanceHeukwol({},'owner',data.id)).status).toBe(404);expect(calls).toBe(1);
});
test('held lease prevents duplicate generation; failed wave preserves completed chapters',async()=>{
 const data=await (await post('start')).json(),row=rows.get(`owner:${data.id}`);
 row.lock={token:'another',until:new Date(Date.now()+60000)};
 expect((await advanceHeukwol({},'owner',data.id)).status).toBe(202);expect(calls).toBe(1);
 row.lock={};failGeneration=true;expect((await advanceHeukwol({},'owner',data.id)).status).toBe(503);expect(row.metadata.chapters).toHaveLength(1);
 failGeneration=false;await advanceHeukwol({},'owner',data.id);expect(row.metadata.chapters).toHaveLength(2);
});
test('existing prepare is read only',async()=>{await post('start');await post('prepare');expect(calls).toBe(1);});

test('revoked prepare cannot reveal a stored report',async()=>{await post('start');revoked=true;expect((await post('prepare')).status).toBe(404);expect(calls).toBe(1);});
test('three failed waves close delivery once and never regenerate during settlement',async()=>{const data=await(await post('start')).json();failGeneration=true;for(let i=0;i<3;i++)await advanceHeukwol({},'owner',data.id);expect(refunds).toBe(1);const before=calls;await advanceHeukwol({},'owner',data.id);expect(calls).toBe(before);const row=rows.get('owner:'+data.id);row.status='pending';row.refundStatus='pending';row.metadata.attempts=0;expect((await(await advanceHeukwol({},'owner',data.id)).json()).status).toBe('failed');expect(calls).toBe(before);});
test('input changes and unowned profiles never start another generation',async()=>{await post('start');expect((await post('start',{...input,question:input.question+'추가 고민'})).status).toBe(409);expect((await post('start',{...input,profileId:'other'})).status).toBe(409);expect((await post('start',{...input,requestId:'heukwol-new-request',profileId:'other'})).status).toBe(400);expect(calls).toBe(1);});
