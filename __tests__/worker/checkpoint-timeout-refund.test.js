/** @jest-environment node */
import { jest } from '@jest/globals';
let execution, report, lookupFails, refund, sweep, fail, inspect, queries, external;
const clone=value=>structuredClone(value);
const query=value=>({lean:async()=>clone(value),select(){return this;},sort(){return this;}});
const resultModel={findOne:filter=>{
  queries.push(filter);
  if(lookupFails) throw Error('storage unavailable');
  return query(report && String(filter.userId)===report.userId && filter.id===report.id ? report:null);
}};
function patch(target,update){for(const [path,value] of Object.entries(update.$set||{})){
 const keys=path.split('.');const end=keys.pop();let current=target;for(const key of keys)current=current[key]??={};current[end]=value;
}}
beforeAll(async()=>{
 const db=await import('../../worker/lib/db.js'), models=await import('../../worker/lib/models.js');
 jest.unstable_mockModule('../../worker/lib/db.js',()=>({...db,connectDb:async()=>{},withMongoRetry:async(_env,fn)=>fn()}));
 jest.unstable_mockModule('../../worker/lib/models.js',()=>({...models,
  HumanDesignReport:resultModel,DestinyCompassReport:resultModel,NakshatraAiConsultation:resultModel,AstrologyAiConsultation:resultModel,NeoOperationRoomConsultation:resultModel,ZiweiDeepReport:resultModel,RelationshipBoundaryTest:resultModel,
  ServiceExecutionTransaction:{
   findOne:()=>query(execution),
   updateOne:async(_filter,update)=>{patch(execution,update);return {modifiedCount:1};},
   findById:()=>query(execution),
   findOneAndUpdate:(filter,update)=>{
    if(filter.status!==execution.status)return query(null);
    if(filter.nextRetryAt?.$lte && execution.nextRetryAt && execution.nextRetryAt>filter.nextRetryAt.$lte)return query(null);
    if(filter._id && filter['lock.token']!==execution.lock.token)return query(null);
    patch(execution,update);return query(execution);
   },
  },
 }));
 jest.unstable_mockModule('../../worker/lib/portone.js',()=>({cancelPortOnePayment:(...args)=>refund(...args)}));
 ({sweepStaleServiceExecutions:sweep,failServiceExecution:fail}=await import('../../worker/lib/service-execution-task.js'));
 ({inspectCheckpointBeforeTimeoutRefund:inspect}=await import('../../worker/lib/checkpoint-refund-guard.js'));
});
beforeEach(()=>{
 execution={_id:'execution',userId:'64b7f2a1c3d4e5f601234567',featureKey:'human-design-report',reportId:'stored-report',idempotencyKey:'original-request',status:'pending',lock:{token:'',until:null},timeoutAt:new Date(0)};
 report={userId:String(execution.userId),id:'stored-report',idempotencyKey:'original-request',status:'partial',llmMeta:{attempts:{chapter1:1}}};
 queries=[];lookupFails=false;refund=jest.fn(()=>{throw Error('refund forbidden');});
 external=jest.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('external fetch forbidden');});
});
afterEach(()=>{expect(refund).not.toHaveBeenCalled();expect(external).not.toHaveBeenCalled();external.mockRestore();});
test.each(['human-design-report','destiny-compass-deep-report','nakshatra-ai-consultation','astrology-ai-consultation','neo-operation-room-consultation','ziwei-deep-pdf','relationship-boundary-test'])('%s stored checkpoint is not timed out into a refund',async feature=>{
 execution.featureKey=feature;
 const result=await sweep({}, {limit:1});
 expect(result).toMatchObject({scanned:1,refunded:0,pending:1});expect(execution.status).toBe('pending');
 expect(execution.nextRetryAt.getTime()).toBeGreaterThan(Date.now());expect(execution.lock.token).toBe('');
 expect(queries).toEqual([{userId:execution.userId,id:'stored-report'}]);
});
test('verified completed result closes a lost execution completion without refund',async()=>{
 report.status='completed';await sweep({}, {limit:1});
 expect(execution).toMatchObject({status:'success',premiumStatus:'completed',deliveryStatus:'delivered'});
});
test.each(['completed','partial'])('an explicit failure also protects a stored %s result',async(status)=>{
 report.status=status;
 const result=await fail({},execution.userId,{executionKey:'original-request',reasonCode:'generation_failed'});
 expect(result.settlement.checkpoint).toBe(status==='completed'?'completed':'recoverable');
 expect(execution.refundStatus).toBe('none');
 expect(execution.status).toBe(status==='completed'?'success':'pending');
});
test.each(['delivery_pending','generating'])('%s is recoverable from its stored snapshot',async status=>{
 report.status=status;await sweep({}, {limit:1});expect(execution.status).toBe('pending');
});
test('DB uncertainty and mismatched request defer rather than infer generation failure',async()=>{
 lookupFails=true;await sweep({}, {limit:1});expect(execution.status).toBe('pending');
 lookupFails=false;report.idempotencyKey='different-paid-request';expect(await inspect(execution)).toBe('unknown');
});
test('missing or explicitly failed results retain the existing timeout policy',async()=>{
 report.status='generation_failed';expect(await inspect(execution)).toBe('missing');
 report=null;expect(await inspect(execution)).toBe('missing');
  execution.featureKey='unrelated-product';expect(await inspect(execution)).toBe('unmanaged');
});
test('an already-started refund is never changed back into a delivered execution',async()=>{
 report.status='completed';execution.refundStatus='pending';expect(await inspect(execution)).toBe('unmanaged');
 expect(queries).toHaveLength(0);
});
test.each(['pet-saju-ai-consultation','pet-compatibility-ai','animal-totem-basic','animal-totem-deep','dream-psycho-analysis','geomancy','yoga-guru-per-use','tarot-prompt-maker','tarot-prompt-maker-standard','tarot-prompt-maker-deep','tarot-prompt-maker-master','tarot-mindscan','tarot-love-relationship'])('%s saved narrative is not refunded by timeout cleanup',async feature=>{
 execution.featureKey=feature;execution.metadata={paidNarrative:{tasks:[{id:'personality'}],parts:{}}};expect(await inspect(execution)).toBe('recoverable');expect(queries).toHaveLength(0);
});
test('every registered narrative feature and report pair protects a saved checkpoint from timeout refund',async()=>{
 const {PAID_NARRATIVE_SERVER_RESUME_KEYS}=await import('../../worker/lib/paid-narrative-adapters.js');
 for(const pair of PAID_NARRATIVE_SERVER_RESUME_KEYS){
  const [featureKey,reportType]=pair.split('|');
  execution.featureKey=featureKey;execution.reportType=reportType;execution.metadata={paidNarrative:{tasks:[{id:'answer'}],parts:{answer:'saved'}}};
  expect({pair,result:await inspect(execution)}).toEqual({pair,result:'recoverable'});
 }
});

test('question checkpoint survives timeout sweep without refund',async()=>{
 execution.featureKey='astrology_ai_prompt_generator';execution.reportType='featureQuestionConsultation';
 execution.metadata={paidNarrative:{tasks:[{id:'answer'}],parts:{answer:'saved'}}};
 const result=await sweep({}, {limit:1});
 expect(result).toMatchObject({scanned:1,refunded:0,pending:1});
 expect(execution.status).toBe('pending');expect(execution.metadata.paidNarrative.parts.answer).toBe('saved');
 expect(execution.nextRetryAt.getTime()).toBeGreaterThan(Date.now());
});

test('registered pair without a saved checkpoint does not imply a result',async()=>{
 execution.featureKey='astrology_ai_prompt_generator';execution.reportType='featureQuestionConsultation';execution.metadata={};
 expect(await inspect(execution)).toBe('unmanaged');
});

test('an unregistered feature and report pair does not gain checkpoint protection',async()=>{
 execution.featureKey='unrelated-product';execution.reportType='featureQuestionConsultation';
 execution.metadata={paidNarrative:{tasks:[{id:'answer'}],parts:{answer:'saved'}}};
 expect(await inspect(execution)).toBe('unmanaged');
});

test('celestial card checkpoints in the execution collection remain recoverable',async()=>{
 execution.featureKey='tarot-celestial-harmony';execution.metadata={celestialDelivery:{delivery:{parts:{0:{archetypeReading:'saved'}}}}};
 expect(await inspect(execution)).toBe('recoverable');expect(queries).toHaveLength(0);
});

// 2026-11-19 R2b 다시 시도 우선: 네오 첫 브리핑의 다시 시도 가능 실패는 창(생성 + 7일) 안에서만 타임아웃 환불을 미룬다.
describe('neo retryable first-briefing failure',()=>{
 const future=()=>new Date(Date.now()+86400000), past=()=>new Date(Date.now()-1000);
 beforeEach(()=>{execution.featureKey='neo-operation-room-consultation';report.status='generation_failed';report.llmMeta={retryable:{since:new Date(),refundAt:future(),code:'LLM_FAILED'}};});
 test('inside the retry window the timeout sweep keeps the execution pending',async()=>{
  const result=await sweep({}, {limit:1});
  expect(result).toMatchObject({scanned:1,refunded:0,pending:1});expect(execution.status).toBe('pending');
  expect(execution.nextRetryAt.getTime()).toBeGreaterThan(Date.now());expect(execution.lock.token).toBe('');
 });
 test.each([
  ['the window has passed',meta=>{meta.retryable.refundAt=past();}],
  ['a refund is already due',meta=>{meta.refundEligibleAt=new Date().toISOString();}],
  ['there is no retry marker',meta=>{delete meta.retryable;}],
 ])('falls back to the existing timeout policy when %s',async(_name,edit)=>{
  edit(report.llmMeta);expect(await inspect(execution)).toBe('missing');
 });
 test('only the timeout sweep defers: an explicit close still sees a missing result',async()=>{
  expect(await inspect(execution,{includeResumable:false})).toBe('missing');
 });
 test('other services with a retry marker keep the existing policy',async()=>{
  execution.featureKey='nakshatra-ai-consultation';expect(await inspect(execution)).toBe('missing');
 });
 // 2026-11-20 R10: 점성술도 같은 표지로 보류한다 — 창 안에서는 타임아웃 환불을 미루고, 창이 지나면 기존 정책.
 test('astrology held inside the retry window is recoverable, and missing once the window passes',async()=>{
  execution.featureKey='astrology-ai-consultation';expect(await inspect(execution)).toBe('recoverable');
  expect(await inspect(execution,{includeResumable:false})).toBe('missing');
  report.llmMeta.retryable.refundAt=past();expect(await inspect(execution)).toBe('missing');
 });
});

// 2026-11-19 R6 다시 시도 우선: 흑월은 종결 실패를 표지(metadata.retryable)로 보류한다. 창(생성 + 7일) 안에서만 타임아웃 환불을 미룬다.
describe('heukwol held for a free retry',()=>{
 const future=()=>new Date(Date.now()+86400000), past=()=>new Date(Date.now()-1000);
 beforeEach(()=>{execution.featureKey='heukwol-warning-consultation';execution.refundStatus='none';
  execution.metadata={analysis:{},chapters:[],attempts:3,retryable:{since:new Date(),refundAt:future(),code:'HEUKWOL_GENERATION_FAILED'}};});
 test('inside the retry window the timeout sweep keeps the execution pending',async()=>{
  const result=await sweep({}, {limit:1});
  expect(result).toMatchObject({scanned:1,refunded:0,pending:1});expect(execution.status).toBe('pending');
  expect(execution.nextRetryAt.getTime()).toBeGreaterThan(Date.now());expect(execution.lock.token).toBe('');
 });
 test.each([
  ['the window has passed',meta=>{meta.retryable.refundAt=past();}],
  ['there is no retry marker',meta=>{delete meta.retryable;}],
  ['the marker has no deadline',meta=>{delete meta.retryable.refundAt;}],
 ])('falls back to the existing refund policy when %s',async(_name,edit)=>{
  edit(execution.metadata);expect(await inspect(execution)).toBe('unmanaged');
 });
 test('only the timeout sweep defers: an explicit close refunds right away',async()=>{
  expect(await inspect(execution,{includeResumable:false})).toBe('unmanaged');
 });
 test('a started refund is never deferred',async()=>{
  execution.refundStatus='pending';expect(await inspect(execution)).toBe('unmanaged');
 });
 test('other services with the same marker keep the existing policy',async()=>{
  execution.featureKey='geomancy';expect(await inspect(execution)).toBe('unmanaged');
 });
});

// 2026-11-21 C1: a narrative that can no longer progress on its own is held, not retried every 600s
// forever and not sent into a refund whose coin branch has no sourceTransactionId to restore.
// The hold keeps status pending (browser resume and the free retry need it) and moves nextRetryAt
// to the retry-first refund point (created + 7 days), where the C2 settle takes over.
describe('paid narrative terminal hold',()=>{
 const DAY=86400000;
 beforeEach(()=>{execution.featureKey='geomancy';execution.reportType='geomancyOracle';execution.createdAt=new Date(Date.now()-60000);
  execution.metadata={paidNarrative:{tasks:[{id:'a'},{id:'b'}],parts:{a:'saved'},attempts:{a:1,b:1}}};});
 test.each([
  ['a missing part spent its attempts',st=>{st.attempts.b=2;}],
  ['the engine already claimed exhaustion',st=>{st.exhaustionClaimed=true;}],
  ['nothing was saved and a part spent its attempts',st=>{st.parts={};st.attempts={a:2,b:1};}],
 ])('is held when %s',async(_name,edit)=>{
  edit(execution.metadata.paidNarrative);
  expect(await inspect(execution)).toBe('held');expect(await inspect(execution,{includeResumable:false})).toBe('held');
 });
 test('is held once server recovery marked it for review',async()=>{
  execution.metadata.paidNarrativeRecovery={reviewRequired:true,code:'DELIVERY_REVIEW_REQUIRED'};expect(await inspect(execution)).toBe('held');
 });
 test('is held after the 24h server resume window',async()=>{
  execution.createdAt=new Date(Date.now()-DAY-60000);expect(await inspect(execution)).toBe('held');
 });
 test('a v2 record keeps resuming until its own 4-attempt budget is spent',async()=>{
  Object.assign(execution.metadata.paidNarrative,{deliveryPlanVersion:2,attempts:{a:1,b:3}});expect(await inspect(execution)).toBe('recoverable');
  execution.metadata.paidNarrative.attempts.b=4;expect(await inspect(execution)).toBe('held');
 });
 test('a progressing narrative stays recoverable for the sweep',async()=>{
  expect(await inspect(execution)).toBe('recoverable');
 });
 test('hard-coded narrative keys follow the includeResumable gate: an explicit close of an empty run is held, not retried',async()=>{
  execution.reportType='';execution.metadata.paidNarrative.parts={};
  expect(await inspect(execution)).toBe('recoverable');expect(await inspect(execution,{includeResumable:false})).toBe('held');
 });
 test('the sweep holds an exhausted run until the 7-day refund point, once, without a refund claim',async()=>{
  execution.metadata.paidNarrative.attempts.b=2;
  const result=await sweep({}, {limit:3});
  expect(result).toMatchObject({scanned:1,refunded:0,failed:0,pending:1});
  expect(execution).toMatchObject({status:'pending',refundStatus:'none',reasonCode:'PAID_NARRATIVE_EXHAUSTED'});
  expect(execution.lock.token).toBe('');expect(execution.metadata.paidNarrative.parts.a).toBe('saved');
  expect(execution.nextRetryAt.getTime()).toBe(execution.createdAt.getTime()+7*DAY);
  expect(execution['compensation.adminReviewRequired'] ?? execution.compensation?.adminReviewRequired).toBeUndefined();
 });
 test('past the 7-day point the hold re-checks daily instead of every sweep',async()=>{
  execution.createdAt=new Date(Date.now()-8*DAY);
  const before=Date.now();await sweep({}, {limit:3});
  expect(execution).toMatchObject({status:'pending',refundStatus:'none',reasonCode:'PAID_NARRATIVE_RESUME_WINDOW_CLOSED'});
  expect(execution.nextRetryAt.getTime()).toBeGreaterThanOrEqual(before+DAY);
 });
 test('an explicit close of an exhausted run is held, never a refund that cannot restore coins',async()=>{
  execution.metadata.paidNarrative.attempts.b=2;execution.executionKey='paid-narrative:x';
  const result=await fail({},execution.userId,{executionKey:'paid-narrative:x',reasonCode:'generation_failed'});
  expect(result.settlement.checkpoint).toBe('held');
  expect(execution).toMatchObject({status:'pending',refundStatus:'none',reasonCode:'PAID_NARRATIVE_EXHAUSTED'});
  expect(execution['compensation.adminReviewRequired'] ?? execution.compensation?.adminReviewRequired).toBe(true);
 });
});
