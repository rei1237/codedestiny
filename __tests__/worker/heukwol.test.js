/** @jest-environment node */
import {jest} from '@jest/globals';
const rows=new Map();let account='owner',paid=true,revoked=false,failGeneration=false,calls=0,refunds=0,testEnv={},chapterChars=2000,failKeys=new Set(),seenOptions=[],transientLeft=0;
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
 HEUKWOL_DELIVERY_PLAN_VERSION:2,HEUKWOL_TRANSIENT_ATTEMPTS:4,isHeukwolTransientError:e=>e?.heukwolTransient===true,heukwolDeliveryV2Enabled:env=>String(env?.HEUKWOL_DELIVERY_V2_ENABLED??'').toLowerCase()!=='false',
 generateHeukwolChapter:async(_env,_analysis,c,_q,_prev,_gen,options)=>{calls++;seenOptions.push({key:c.key,...(options||{})});if(transientLeft>0){transientLeft--;throw Object.assign(new Error('HEUKWOL_JSON_INVALID'),{heukwolTransient:true,heukwolIssue:'HEUKWOL_JSON_INVALID'});}if(failGeneration||failKeys.has(c.key))throw Object.assign(new Error('mock unavailable'),{heukwolIssue:'HEUKWOL_CHAPTER_SHORT'});return {...c,warning:`경고 ${c.key}`,interpretation:`해석 ${c.key}`,strategy:`대응 ${c.key}`,content:`본문 ${c.key}`,totalChars:chapterChars};}}));
let handleHeukwolRoutes,advanceHeukwol,settleStuckDelivery,settleDueHeukwolRetryRefunds;
beforeAll(async()=>{({handleHeukwolRoutes,advanceHeukwol,settleStuckDelivery,settleDueHeukwolRetryRefunds}=await import('../../worker/routes/heukwol.js'));});
const input={profileId:'profile',year:new Date().getUTCFullYear()+1,question:'같은 일을 반복하지 않으려면 어떤 조건을 확인할까요?',requestId:'heukwol-test-1234'};
const post=(path,body=input)=>handleHeukwolRoutes(new Request(`https://test.invalid/api/heukwol/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),testEnv);
beforeEach(()=>{rows.clear();account='owner';paid=true;revoked=false;failGeneration=false;calls=0;refunds=0;testEnv={};chapterChars=2000;failKeys=new Set();seenOptions=[];transientLeft=0;});
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
// 2026-11-19 R6 다시 시도 우선: 종결 실패는 환불 대신 무료 다시 시도로 보류한다(환불은 고객 요청 또는 생성 + 7일).
test('three failed waves hold a free retry instead of refunding and never regenerate while held',async()=>{testEnv=V1;const data=await(await post('start')).json();failGeneration=true;for(let i=0;i<3;i++)await advanceHeukwol({},'owner',data.id);expect(refunds).toBe(0);const before=calls;const held=await(await advanceHeukwol({},'owner',data.id)).json();expect(calls).toBe(before);expect(held).toMatchObject({status:'failed',retry:{available:true,sessionId:data.id}});expect(held.refundStatus).toBeUndefined();expect(held.report).toBeUndefined();const row=rows.get('owner:'+data.id);row.status='pending';row.refundStatus='pending';row.metadata.attempts=0;expect((await(await advanceHeukwol({},'owner',data.id)).json()).status).toBe('failed');expect(calls).toBe(before);});
test('input changes and unowned profiles never start another generation',async()=>{await post('start');expect((await post('start',{...input,question:input.question+'추가 고민'})).status).toBe(409);expect((await post('start',{...input,profileId:'other'})).status).toBe(409);expect((await post('start',{...input,requestId:'heukwol-new-request',profileId:'other'})).status).toBe(400);expect(calls).toBe(1);});

describe('delivery plan v2 (new sessions only)',()=>{
 const drive=async(id,limit=60)=>{let data;for(let i=0;i<limit;i++){data=await (await advanceHeukwol({},'owner',id)).json();if(data.status!=='generating')break;}return data;};
 test('new sessions carry deliveryPlanVersion 2; kill switch keeps v1',async()=>{
  const v2=await (await post('start')).json();expect(rows.get('owner:'+v2.id).metadata.deliveryPlanVersion).toBe(2);
  rows.clear();testEnv=V1;const v1=await (await post('start')).json();expect(rows.get('owner:'+v1.id).metadata.deliveryPlanVersion).toBeUndefined();
 });
 test('Trait-First is pinned at start; sessions without the key stay off and still complete',async()=>{
  const old=await (await post('start')).json();expect(rows.get('owner:'+old.id).metadata).not.toHaveProperty('traitFirst');
  testEnv={TRAIT_FIRST_SAJU:'true'};
  expect((await drive(old.id)).status).toBe('completed');expect(seenOptions.some(o=>'traitFirst' in o)).toBe(false);
  rows.clear();seenOptions=[];
  const fresh=await (await post('start',{...input,question:input.question+' 새'})).json();expect(rows.get('owner:'+fresh.id).metadata.traitFirst).toBe('v1');
  testEnv={};expect((await drive(fresh.id)).status).toBe('completed');expect(refunds).toBe(0);
  expect(seenOptions).toHaveLength(27);expect(seenOptions.every(o=>o.traitFirst==='v1'&&o.traitSeed==='owner|heukwol')).toBe(true);
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
 // R6b: 공급자·일시 오류(JSON 파싱 실패 등)는 품질 시도를 깎지 않는다. 별도 상한(4회) 뒤에는 품질 시도로 센다(fail-closed).
 test('transient provider failures keep the quality attempts, carry the JSON repair hint and stay bounded',async()=>{
  const data=await (await post('start')).json(),row=rows.get('owner:'+data.id),done=row.metadata.chapters.length,from=seenOptions.length;transientLeft=4;
  for(let i=0;i<4;i++){const r=await advanceHeukwol({},'owner',data.id);expect(r.status).toBe(202);expect((await r.json()).status).toBe('generating');}
  expect(row.metadata.attempts).toBe(0);expect(row.metadata.transientAttempts).toBe(4);expect(row.metadata.lastIssue).toBe('HEUKWOL_JSON_INVALID');
  transientLeft=1;await advanceHeukwol({},'owner',data.id);
  expect(row.metadata.attempts).toBe(1);expect(row.metadata.transientAttempts).toBe(4);
  await advanceHeukwol({},'owner',data.id);
  const tries=seenOptions.slice(from);expect(new Set(tries.map(o=>o.key))).toEqual(new Set([CHAPTERS[done].key]));
  expect(tries.map(o=>o.finalAttempt)).toEqual([false,false,false,false,false,false]);
  expect(tries.map(o=>o.relaxed)).toEqual([false,false,false,false,false,true]);
  expect(tries.slice(1).every(o=>o.repairIssue==='HEUKWOL_JSON_INVALID')).toBe(true);
  expect(row.metadata.chapters).toHaveLength(done+1);expect(row.metadata.transientAttempts).toBe(0);expect(row.metadata.attempts).toBe(0);
 });
 test('v1 transient failures answer 503 without spending attempts and still hold after the bounded counter (control)',async()=>{
  testEnv=V1;const {id}=await (await post('start')).json(),row=rows.get('owner:'+id);transientLeft=7;
  for(let i=0;i<4;i++)expect((await advanceHeukwol({},'owner',id)).status).toBe(503);
  expect(row.metadata.attempts).toBe(0);
  for(let i=0;i<3;i++)await advanceHeukwol({},'owner',id);
  expect(refunds).toBe(0);expect(row.status).toBe('pending');expect(row.metadata.retryable?.refundAt).toBeTruthy();
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
 test('a total outage after some chapters is held for a free retry, with no report and no refund, after the round cap',async()=>{
  const data=await (await post('start')).json();failGeneration=true;
  const done=await drive(data.id);
  expect(done.code).toBe('HEUKWOL_DELIVERY_FAILED');expect(done.report).toBeUndefined();expect(done.retry).toMatchObject({available:true});
  const row=rows.get('owner:'+data.id);expect(row.status).toBe('pending');expect(row.metadata.retryable.code).toBe('HEUKWOL_GENERATION_FAILED');expect(refunds).toBe(0);
  expect(calls).toBe(1+3*3);
  const again=await (await advanceHeukwol({},'owner',data.id)).json();expect(again.report).toBeUndefined();expect(again.retry.available).toBe(true);expect(calls).toBe(1+3*3);expect(refunds).toBe(0);
 });
 test('an outage from the first chapter is also held for a free retry after the round cap',async()=>{
  failGeneration=true;const data=await (await post('start')).json();
  const done=await drive(data.id);expect(done.code).toBe('HEUKWOL_DELIVERY_FAILED');expect(rows.get('owner:'+data.id).status).toBe('pending');expect(done.retry.available).toBe(true);expect(refunds).toBe(0);expect(calls).toBe(9);
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
 test('an incomplete stuck session is held for a free retry, then refunded once after the window, never exposing a body',async()=>{
  const data=await (await post('start')).json(),row=rows.get('owner:'+data.id);const before=calls;
  const settled=await settleStuckDelivery({},{doc:lean(row),now:Date.now(),model:Model});
  expect(settled).toEqual({outcome:'retryable',refundAt:expect.any(Date)});expect(row.status).toBe('pending');expect(refunds).toBe(0);expect(calls).toBe(before);
  expect(row.metadata).toMatchObject({attempts:3,retryable:{code:'HEUKWOL_DELIVERY_STUCK'}});expect(row.lock.token).toBe('');
  expect(warn).toHaveBeenCalledWith('paid_delivery_stuck_settled',expect.objectContaining({service:'heukwol',outcome:'retryable',stalls:6}));
  expect((await settleStuckDelivery({},{doc:lean(row),now:Date.now(),model:Model})).outcome).toBe('retryable');expect(refunds).toBe(0);
  // 창(생성 + 7일)이 지나면 기존 실패·환불 경로로 1회 닫는다.
  row.createdAt=new Date(Date.now()-8*86400000);row.metadata.retryable.refundAt=new Date(Date.now()-1000);
  expect(await settleStuckDelivery({},{doc:lean(row),now:Date.now(),model:Model})).toEqual({outcome:'failed',refundStatus:'pending'});expect(row.status).toBe('failed');expect(refunds).toBe(1);
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

// 2026-11-19 R6: 무료 다시 시도·환불 요청·창 만료 정산. 다시 시도는 결제 확인·차감 없이 빠진 장만 이어 쓴다.
describe('free retry before refund',()=>{
 const drive=async(id,limit=60)=>{let data;for(let i=0;i<limit;i++){data=await (await advanceHeukwol({},'owner',id)).json();if(data.status!=='generating')break;}return data;};
 const held=async()=>{failGeneration=true;const data=await (await post('start')).json();await drive(data.id);failGeneration=false;return {id:data.id,row:rows.get('owner:'+data.id)};};
 test('retry reopens the held session without a payment check and completes all chapters',async()=>{
  const {id,row}=await held();const kept=row.metadata.chapters.length;paid=false;
  const reopened=await post('retry',{id});expect(reopened.status).toBe(202);
  expect(await reopened.json()).toMatchObject({status:'generating',id});expect(row.metadata).toMatchObject({attempts:0,transientAttempts:0,retryable:null,chapterRounds:{},retryReopens:1});expect(Date.now()-new Date(row.metadata.retryReopenedAt).getTime()).toBeLessThan(60000);
  expect(row.metadata.chapters).toHaveLength(kept);
  const done=await drive(id);expect(done.status).toBe('completed');expect(done.report.chapters).toHaveLength(27);expect(refunds).toBe(0);
  expect((await post('retry',{id})).status).toBe(409);
 });
 test('retry is refused for a session that is still generating or belongs to someone else',async()=>{
  const data=await (await post('start')).json();const before=calls;
  const res=await post('retry',{id:data.id});expect(res.status).toBe(409);expect((await res.json()).code).toBe('RETRY_NOT_AVAILABLE');
  account='intruder';expect((await post('retry',{id:data.id})).status).toBe(404);expect(calls).toBe(before);
 });
 test('refund request settles the held session once instead of retrying',async()=>{
  const {id,row}=await held();
  const res=await post('refund-request',{id});expect(res.status).toBe(200);expect(refunds).toBe(1);expect(row.status).toBe('failed');
  expect((await res.json()).retry).toBeUndefined();
  await post('refund-request',{id});expect(refunds).toBe(1);
  expect((await post('retry',{id})).status).toBe(409);expect(refunds).toBe(1);
 });
 test('refund request is refused while the session is still generating',async()=>{
  const data=await (await post('start')).json();
  const res=await post('refund-request',{id:data.id});expect(res.status).toBe(409);expect(refunds).toBe(0);
 });
 test('a retry after the window closes refunds instead of reopening',async()=>{
  const {id,row}=await held();row.metadata.retryable.refundAt=new Date(Date.now()-1000);const before=calls;
  const res=await post('retry',{id});expect(res.status).toBe(409);expect((await res.json()).code).toBe('RETRY_WINDOW_EXPIRED');
  expect(refunds).toBe(1);expect(calls).toBe(before);
 });
 test('the refund cron settles only expired holds, once each',async()=>{
  const {row}=await held();
  const finder=()=>({...Model,find:()=>{const c={sort:()=>c,limit:()=>c,select:()=>c,lean:async()=>[clone(row)]};return c;}});
  expect(await settleDueHeukwolRetryRefunds({},{model:finder()})).toEqual([]);expect(refunds).toBe(0);
  row.metadata.retryable.refundAt=new Date(Date.now()-1000);
  expect(await settleDueHeukwolRetryRefunds({},{model:finder()})).toEqual([{service:'heukwol',refundStatus:'pending'}]);expect(refunds).toBe(1);
  expect(await settleDueHeukwolRetryRefunds({},{model:finder()})).toEqual([]);expect(refunds).toBe(1);
 });
 test('a v1 report that is complete but too short is refunded right away (a retry cannot fix it)',async()=>{
  testEnv=V1;chapterChars=900;const {id}=await (await post('start')).json();
  for(let i=1;i<27+3;i++)await advanceHeukwol({},'owner',id);
  expect(refunds).toBe(1);expect(rows.get('owner:'+id).metadata.retryable).toBeUndefined();
 });
});
