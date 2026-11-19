/** @jest-environment node */
import {jest} from '@jest/globals';
const rows=new Map();let account='owner',paid=true,revoked=false,failGeneration=false,calls=0,refunds=0,testEnv={},chapterChars=2000,failKeys=new Set(),seenOptions=[];
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
 HEUKWOL_DELIVERY_PLAN_VERSION:2,heukwolDeliveryV2Enabled:env=>String(env?.HEUKWOL_DELIVERY_V2_ENABLED??'').toLowerCase()!=='false',
 generateHeukwolChapter:async(_env,_analysis,c,_q,_prev,_gen,options)=>{calls++;seenOptions.push({key:c.key,...(options||{})});if(failGeneration||failKeys.has(c.key))throw Object.assign(new Error('mock unavailable'),{heukwolIssue:'HEUKWOL_CHAPTER_SHORT'});return {...c,warning:`경고 ${c.key}`,interpretation:`해석 ${c.key}`,strategy:`대응 ${c.key}`,content:`본문 ${c.key}`,totalChars:chapterChars};}}));
let handleHeukwolRoutes,advanceHeukwol,settleStuckDelivery;
beforeAll(async()=>{({handleHeukwolRoutes,advanceHeukwol,settleStuckDelivery}=await import('../../worker/routes/heukwol.js'));});
const input={profileId:'profile',year:new Date().getUTCFullYear()+1,question:'같은 일을 반복하지 않으려면 어떤 조건을 확인할까요?',requestId:'heukwol-test-1234'};
const post=(path,body=input)=>handleHeukwolRoutes(new Request(`https://test.invalid/api/heukwol/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),testEnv);
beforeEach(()=>{rows.clear();account='owner';paid=true;revoked=false;failGeneration=false;calls=0;refunds=0;testEnv={};chapterChars=2000;failKeys=new Set();seenOptions=[];});
const V1={HEUKWOL_DELIVERY_V2_ENABLED:'false'};
test('prepare cannot call LLM or start billing; unproven purchase is blocked',async()=>{
 expect((await post('prepare')).status).toBe(200);expect(rows.size).toBe(0);expect(calls).toBe(0);
 paid=false;expect((await post('start')).status).toBe(402);expect(calls).toBe(0);
});
test('twenty-seven checkpoints produce one stored report; replay does not regenerate',async()=>{
 let response=await post('start'),data=await response.json();expect(data.completedChapters).toBe(1);
 for(let i=1;i<27;i++){expect(data.report).toBeUndefined();data=await (await advanceHeukwol({},'owner',data.id)).json();}
 expect(data.status).toBe('completed');expect(data.report.totalChars).toBe(54000);expect(calls).toBe(27);
 const replay=await (await post('start')).json();expect(replay.report).toEqual(data.report);expect(calls).toBe(27);
});
test('same purchase cannot change year or question; foreign owner and revoked result denied',async()=>{
 const data=await (await post('start')).json();expect((await post('start',{...input,year:input.year+1})).status).toBe(409);
 expect((await advanceHeukwol({},'intruder',data.id)).status).toBe(404);
 revoked=true;expect((await advanceHeukwol({},'owner',data.id)).status).toBe(404);expect(calls).toBe(1);
});
test('held lease prevents duplicate generation; failed wave preserves completed chapters',async()=>{
 testEnv=V1;const data=await (await post('start')).json(),row=rows.get(`owner:${data.id}`);
 row.lock={token:'another',until:new Date(Date.now()+60000)};
 expect((await advanceHeukwol({},'owner',data.id)).status).toBe(202);expect(calls).toBe(1);
 row.lock={};failGeneration=true;expect((await advanceHeukwol({},'owner',data.id)).status).toBe(503);expect(row.metadata.chapters).toHaveLength(1);
 failGeneration=false;await advanceHeukwol({},'owner',data.id);expect(row.metadata.chapters).toHaveLength(2);
});
test('existing prepare is read only',async()=>{await post('start');await post('prepare');expect(calls).toBe(1);});

test('revoked prepare cannot reveal a stored report',async()=>{await post('start');revoked=true;expect((await post('prepare')).status).toBe(404);expect(calls).toBe(1);});
test('three failed waves close delivery once and never regenerate during settlement',async()=>{testEnv=V1;const data=await(await post('start')).json();failGeneration=true;for(let i=0;i<3;i++)await advanceHeukwol({},'owner',data.id);expect(refunds).toBe(1);const before=calls;await advanceHeukwol({},'owner',data.id);expect(calls).toBe(before);const row=rows.get('owner:'+data.id);row.status='pending';row.refundStatus='pending';row.metadata.attempts=0;expect((await(await advanceHeukwol({},'owner',data.id)).json()).status).toBe('failed');expect(calls).toBe(before);});
test('input changes and unowned profiles never start another generation',async()=>{await post('start');expect((await post('start',{...input,question:input.question+'추가 고민'})).status).toBe(409);expect((await post('start',{...input,profileId:'other'})).status).toBe(409);expect((await post('start',{...input,requestId:'heukwol-new-request',profileId:'other'})).status).toBe(400);expect(calls).toBe(1);});

describe('delivery plan v2 (new sessions only)',()=>{
 const drive=async(id,limit=60)=>{let data;for(let i=0;i<limit;i++){data=await (await advanceHeukwol({},'owner',id)).json();if(data.status!=='generating')break;}return data;};
 test('new sessions carry deliveryPlanVersion 2; kill switch keeps v1',async()=>{
  const v2=await (await post('start')).json();expect(rows.get('owner:'+v2.id).metadata.deliveryPlanVersion).toBe(2);
  rows.clear();testEnv=V1;const v1=await (await post('start')).json();expect(rows.get('owner:'+v1.id).metadata.deliveryPlanVersion).toBeUndefined();
 });
 test('short but valid chapters reach completed without the 40,000-char gate or a refund',async()=>{
  chapterChars=900;const data=await drive((await (await post('start')).json()).id);
  expect(data.status).toBe('completed');expect(data.report.totalChars).toBe(900*27);expect(refunds).toBe(0);
 });
 test('v1 keeps the 40,000-char gate (control)',async()=>{
  testEnv=V1;chapterChars=900;const {id}=await (await post('start')).json();
  for(let i=1;i<27+3;i++)await advanceHeukwol({},'owner',id);
  expect(rows.get('owner:'+id).metadata.chapters).toHaveLength(27);expect(refunds).toBe(1);
 });
 test('a failed wave returns 202, passes the issue as a repair hint, relaxes from the second try and marks the third try final',async()=>{
  const data=await (await post('start')).json();failKeys.add('chapter-1');
  const r1=await advanceHeukwol({},'owner',data.id);expect(r1.status).toBe(202);const p1=await r1.json();expect(p1.status).toBe('generating');expect(p1.report).toBeUndefined();
  await advanceHeukwol({},'owner',data.id);failKeys.clear();await advanceHeukwol({},'owner',data.id);
  const tries=seenOptions.filter(o=>o.key==='chapter-1');
  expect(tries.map(o=>o.relaxed)).toEqual([false,true,true]);
  expect(tries.map(o=>o.finalAttempt)).toEqual([false,false,true]);
  expect(tries.map(o=>o.repairIssue)).toEqual(['','HEUKWOL_CHAPTER_SHORT','HEUKWOL_CHAPTER_SHORT']);
  expect(rows.get('owner:'+data.id).metadata.chapters.map(c=>c.key)).toEqual(['chapter-0','chapter-1']);
 });
 // S16: 라운드를 다 쓴 장은 건너뛰지 않는다. 다음 라운드에 다시 써서 27장 전체로만 완료한다.
 test('an exhausted chapter goes back for another round and the report completes only with all 27 chapters',async()=>{
  const data=await (await post('start')).json(),row=rows.get('owner:'+data.id);failKeys.add('chapter-5');
  for(let i=0;i<40&&!row.metadata.chapterRounds?.['chapter-5'];i++){const r=await (await advanceHeukwol({},'owner',data.id)).json();expect(r.report).toBeUndefined();}
  expect(row.metadata.chapterRounds['chapter-5']).toBe(1);expect(row.status).toBe('pending');expect(row.metadata.attempts).toBe(0);
  failKeys.clear();const done=await drive(data.id);
  expect(done.status).toBe('completed');expect(refunds).toBe(0);
  expect(done.report.chapters.map(c=>c.key)).toEqual(CHAPTERS.map(c=>c.key));
 });
 test('an old session with skipped or one-field chapters rewrites them before completing',async()=>{
  const data=await (await post('start')).json(),row=rows.get('owner:'+data.id);
  const full=CHAPTERS.filter(c=>!['chapter-2','chapter-3'].includes(c.key)).map(c=>({...c,warning:'w',interpretation:'i',strategy:'s',content:'c',totalChars:2000}));
  row.metadata.chapters=[...full,{...CHAPTERS[3],warning:'w',interpretation:'',strategy:'',content:'w',totalChars:1}];row.metadata.skippedChapters=['chapter-2'];row.metadata.attempts=0;
  calls=0;const done=await drive(data.id);
  expect(done.status).toBe('completed');expect(calls).toBe(2);expect(refunds).toBe(0);
  expect(done.report.chapters.map(c=>c.key)).toEqual(CHAPTERS.map(c=>c.key));expect(done.report.chapters[3].interpretation).toBe('해석 chapter-3');
 });
 test('a total outage after some chapters closes with one refund and no report after the round cap',async()=>{
  const data=await (await post('start')).json();failGeneration=true;
  const done=await drive(data.id);
  expect(done.code).toBe('HEUKWOL_DELIVERY_FAILED');expect(done.report).toBeUndefined();expect(rows.get('owner:'+data.id).status).toBe('failed');expect(refunds).toBe(1);
  expect(calls).toBe(1+3*3);
  const again=await (await advanceHeukwol({},'owner',data.id)).json();expect(again.report).toBeUndefined();expect(calls).toBe(1+3*3);expect(refunds).toBe(1);
 });
 test('an outage from the first chapter also closes with one refund after the round cap',async()=>{
  failGeneration=true;const data=await (await post('start')).json();
  const done=await drive(data.id);expect(done.code).toBe('HEUKWOL_DELIVERY_FAILED');expect(rows.get('owner:'+data.id).status).toBe('failed');expect(refunds).toBe(1);expect(calls).toBe(9);
 });
 // 종결 실패 뒤 결과 조회는 본문 없이 환불 진행 상태를 알려 준다. 환불로 접근이 회수돼도 404 대신 같은 안내를 준다.
 test('a closed failure reports its refund state on result reads, even after the refund revokes access',async()=>{
  failGeneration=true;const data=await (await post('start')).json();
  expect((await drive(data.id)).code).toBe('HEUKWOL_DELIVERY_FAILED');
  const row=rows.get('owner:'+data.id);Object.assign(row,{generationFailedAt:new Date(),refundStatus:'pending'});
  const read=async()=>(await handleHeukwolRoutes(new Request(`https://test.invalid/api/heukwol/result?id=${encodeURIComponent(data.id)}`),testEnv)).json();
  expect(await read()).toMatchObject({status:'failed',refundStatus:'pending'});
  row.refundStatus='refund_failed';expect((await read()).refundStatus).toBe('manual_review');
  Object.assign(row,{status:'refunded',refundStatus:'refunded'});revoked=true;
  const refunded=await read();expect(refunded).toMatchObject({status:'failed',refundStatus:'refunded'});expect(refunded.report).toBeUndefined();
  expect((await (await advanceHeukwol({},'owner',data.id)).json()).refundStatus).toBe('refunded');
  expect(calls).toBe(9);
 });
});

// S16 정체 확정: 복구 cron 이 넘긴 진전 없는 상담은 완성본일 때만 전달하고, 아니면 본문 없이 1회 실패·환불한다.
describe('settleStuckDelivery',()=>{
 const lean=row=>({_id:'x',executionKey:row.executionKey,userId:row.userId,status:row.status,updatedAt:row.updatedAt,deliveryWatch:{stalls:6}});
 const full=()=>CHAPTERS.map(c=>({...c,warning:'w',interpretation:'i',strategy:'s',content:'c',totalChars:2000}));
 let warn;
 beforeEach(()=>{warn=jest.spyOn(console,'warn').mockImplementation(()=>{});});
 afterEach(()=>warn.mockRestore());
 test('an incomplete stuck session fails once with a refund and never exposes a body',async()=>{
  const data=await (await post('start')).json(),row=rows.get('owner:'+data.id);const before=calls;
  const settled=await settleStuckDelivery({},{doc:lean(row),now:Date.now(),model:Model});
  expect(settled).toEqual({outcome:'failed',refundStatus:'pending'});expect(row.status).toBe('failed');expect(refunds).toBe(1);expect(calls).toBe(before);
  expect(warn).toHaveBeenCalledWith('paid_delivery_stuck_settled',expect.objectContaining({service:'heukwol',outcome:'failed',stalls:6}));
  expect(await settleStuckDelivery({},{doc:lean(row),now:Date.now(),model:Model})).toEqual({outcome:'progressed'});expect(refunds).toBe(1);
  expect((await (await advanceHeukwol({},'owner',data.id)).json()).report).toBeUndefined();
 });
 test('a complete stuck session is delivered, not refunded',async()=>{
  const data=await (await post('start')).json(),row=rows.get('owner:'+data.id);row.metadata.chapters=full();
  expect(await settleStuckDelivery({},{doc:lean(row),now:Date.now(),model:Model})).toEqual({outcome:'rescued'});
  expect(row.status).toBe('success');expect(refunds).toBe(0);expect(row.metadata.archive.chapters).toHaveLength(27);
 });
 test('a live lease is left alone; a finished or refund-pending session counts as progressed',async()=>{
  const data=await (await post('start')).json(),row=rows.get('owner:'+data.id);
  row.lock={token:'browser',until:new Date(Date.now()+60000)};
  expect(await settleStuckDelivery({},{doc:lean(row),now:Date.now(),model:Model})).toEqual({outcome:'leased'});expect(row.status).toBe('pending');
  row.lock={};row.refundStatus='pending';
  expect(await settleStuckDelivery({},{doc:lean(row),now:Date.now(),model:Model})).toEqual({outcome:'progressed'});
  row.refundStatus='none';row.status='success';
  expect(await settleStuckDelivery({},{doc:lean(row),now:Date.now(),model:Model})).toEqual({outcome:'progressed'});expect(refunds).toBe(0);
 });
});
