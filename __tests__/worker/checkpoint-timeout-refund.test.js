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
