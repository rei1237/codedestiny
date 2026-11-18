import {jest} from '@jest/globals';
const id='b'.repeat(64);
const update=jest.fn(),claim=jest.fn(),findOne=jest.fn();
jest.unstable_mockModule('../../worker/lib/db.js',()=>({connectDb:async()=>{},withMongoRetry:async(_env,fn)=>fn()}));
jest.unstable_mockModule('../../worker/yeongnyangi/repository.js',()=>({YeongnyangiRequest:{findOneAndUpdate:claim,updateOne:update,findOne}}));
let consumeConsultationQueue,enqueueConsultation,enqueuePaidConsultation;
beforeAll(async()=>{({consumeConsultationQueue,enqueueConsultation,enqueuePaidConsultation}=await import('../../worker/yeongnyangi/queue.js'));});
const message=()=>({body:{requestId:id},ack:jest.fn(),retry:jest.fn()});
const row=()=>({_id:id,userId:'owner',paymentId:'paid',state:'PAID',chapters:[],snapshot:{manifest:[{},{}]}});
beforeEach(()=>jest.clearAllMocks());
test('payment callback publishes only the consultation ID; failed registration retains the paid order',async()=>{
 const send=jest.fn().mockResolvedValue(undefined),order={requestId:`yn-${id}`,status:'paid'};
 await enqueuePaidConsultation({YEONGNYANGI_QUEUE:{send}},order);expect(send).toHaveBeenCalledWith({requestId:id});
 send.mockRejectedValue(new Error('unavailable'));await expect(enqueuePaidConsultation({YEONGNYANGI_QUEUE:{send}},order)).resolves.toBeUndefined();expect(order.status).toBe('paid');
});
test.each(['pending','refunded','cancelled'])('unpaid callback %s cannot publish',async status=>{
 const send=jest.fn();await enqueuePaidConsultation({YEONGNYANGI_QUEUE:{send}},{requestId:`yn-${id}`,status});expect(send).not.toHaveBeenCalled();
});
test('expired dispatch can retry; publish failure clears only its own marker',async()=>{
 const r=row();const queuedUntil=new Date();claim.mockReturnValue({lean:async()=>({...r,queuedUntil})});
 const send=jest.fn().mockRejectedValue(new Error('queue unavailable'));update.mockResolvedValue({modifiedCount:1});
 expect(await enqueueConsultation({YEONGNYANGI_QUEUE:{send}},r)).toBe(false);
 expect(update).toHaveBeenCalledWith({_id:id,queuedChapter:0,queuedUntil},{$set:{queuedUntil:null}});
});
test('held lease and persistent backoff never invoke provider',async()=>{
 for(const field of ['leaseUntil','nextAttemptAt']){
  const r={...row(),[field]:new Date(Date.now()+120000)},m=message(),generateNextChapter=jest.fn();
  await consumeConsultationQueue({messages:[m]},{},{read:async()=>r,service:{generateNextChapter}});
  expect(generateNextChapter).not.toHaveBeenCalled();expect(m.retry).toHaveBeenCalledWith({delaySeconds:expect.any(Number)});
 }
});
test('S9-Y: a row not yet due is acked and re-sent with a delay, so waiting never spends max_retries',async()=>{
 for(const field of ['leaseUntil','nextAttemptAt']){
  const r={...row(),[field]:new Date(Date.now()+120000)},m=message(),generateNextChapter=jest.fn(),send=jest.fn().mockResolvedValue(undefined);
  await consumeConsultationQueue({messages:[m]},{YEONGNYANGI_QUEUE:{send}},{read:async()=>r,service:{generateNextChapter}});
  expect(generateNextChapter).not.toHaveBeenCalled();expect(m.retry).not.toHaveBeenCalled();expect(m.ack).toHaveBeenCalled();
  expect(send).toHaveBeenCalledWith({requestId:id},{delaySeconds:expect.any(Number)});
  expect(send.mock.calls[0][1].delaySeconds).toBeGreaterThanOrEqual(119);
 }
 // A failed re-send keeps the old retry so the message is never lost.
 const r={...row(),nextAttemptAt:new Date(Date.now()+120000)},m=message(),send=jest.fn().mockRejectedValue(new Error('unavailable'));
 await consumeConsultationQueue({messages:[m]},{YEONGNYANGI_QUEUE:{send}},{read:async()=>r,service:{generateNextChapter:jest.fn()}});
 expect(m.ack).not.toHaveBeenCalled();expect(m.retry).toHaveBeenCalledWith({delaySeconds:expect.any(Number)});
});
test('failure after checkpoint registration retries delivery without losing saved result',async()=>{
 const r={...row(),chapters:[{summary:'saved'}]},m=message();
 const generateNextChapter=jest.fn().mockResolvedValue(r);
 await consumeConsultationQueue({messages:[m]},{},{read:async()=>r,service:{generateNextChapter},enqueue:async()=>false});
 expect(generateNextChapter).toHaveBeenCalledWith({},'owner',id,'queue');
 expect(m.ack).not.toHaveBeenCalled();expect(m.retry).toHaveBeenCalled();expect(r.chapters).toHaveLength(1);
});
test.each(['AUTOMATIC_RECOVERY_STOPPED','GENERATION_REVIEW_REQUIRED','PAYMENT_NOT_ACTIVE'])('terminal error %s does not restart automatically',async errorCode=>{
 const r={...row(),errorCode},m=message(),generateNextChapter=jest.fn();
 await consumeConsultationQueue({messages:[m]},{},{read:async()=>r,service:{generateNextChapter}});
 expect(generateNextChapter).not.toHaveBeenCalled();expect(m.ack).toHaveBeenCalled();
});

test('an existing dispatch is accepted only when a matching live marker exists',async()=>{
 claim.mockReturnValue({lean:async()=>null});
 const send=jest.fn();
 for(const pending of [{_id:id},null]){
  findOne.mockReturnValue({select:()=>({lean:async()=>pending})});
  expect(await enqueueConsultation({YEONGNYANGI_QUEUE:{send}},row())).toBe(Boolean(pending));
 }
 expect(send).not.toHaveBeenCalled();
});
test('database failure during failure handling retries instead of losing the message',async()=>{
 const m=message(),read=jest.fn().mockRejectedValue(new Error('DB unavailable'));
 await consumeConsultationQueue({messages:[m]},{},{read,service:{}});
 expect(m.retry).toHaveBeenCalledWith({delaySeconds:30});expect(m.ack).not.toHaveBeenCalled();
});
test('a rejected draft retries within seconds; provider failures and stale quality records keep the 30s floor',async()=>{
 for(const [stage,recorded,floor] of [['quality','INVALID_CHAPTER_BLOCKS',1],['provider','INVALID_CHAPTER_BLOCKS',30],['quality','CHAPTER_TOO_SHORT',30]]){
  const failed={...row(),state:'FORTUNE_FAILED',lastFailure:{stage,code:recorded},nextAttemptAt:new Date(Date.now()+5000)},m=message();
  const read=jest.fn().mockResolvedValueOnce(row()).mockResolvedValueOnce(failed);
  await consumeConsultationQueue({messages:[m]},{},{read,service:{generateNextChapter:jest.fn().mockRejectedValue({code:'INVALID_CHAPTER_BLOCKS'})}});
  const {delaySeconds}=m.retry.mock.calls[0][0];
  expect(delaySeconds).toBeGreaterThanOrEqual(floor);expect(delaySeconds).toBeLessThanOrEqual(Math.max(floor,5));expect(m.ack).not.toHaveBeenCalled();
 }
});
test('staging queue picks the LLM env per row owner: allowlisted owner gets production flags, others stay masked',async()=>{
 const allowed='0123456789abcdef01234567',other='89abcdef0123456789abcdef';
 const env={APP_ENV:'staging',STAGING_LLM_MOCK_ENABLED:'true',GEMINIF_API_KEY:'k',STAGING_REAL_LLM_USER_IDS:allowed};
 const seen=[];
 for (const owner of [allowed,other]) {
  const r={...row(),userId:owner},m=message();
  const generateNextChapter=jest.fn(async e=>{seen.push(e);return {...r,state:'COMPLETED'};});
  await consumeConsultationQueue({messages:[m]},env,{read:async()=>r,service:{generateNextChapter}});
 }
 expect(seen[0].STAGING_LLM_MOCK_ENABLED).toBe('false');expect(seen[0].GEMINIF_API_KEY).toBe('k');
 expect(seen[1].GEMINIF_API_KEY||'').toBe('');expect(seen[1].STAGING_LLM_MOCK_ENABLED).toBe('true');
});
