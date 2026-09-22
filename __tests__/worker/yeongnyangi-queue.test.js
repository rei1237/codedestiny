import {jest} from '@jest/globals';
const id='b'.repeat(64);
const update=jest.fn(),claim=jest.fn();
jest.unstable_mockModule('../../worker/lib/db.js',()=>({connectDb:async()=>{},withMongoRetry:async(_env,fn)=>fn()}));
jest.unstable_mockModule('../../worker/yeongnyangi/repository.js',()=>({YeongnyangiRequest:{findOneAndUpdate:claim,updateOne:update}}));
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
test('failure after checkpoint registration retries delivery without losing saved result',async()=>{
 const r={...row(),chapters:[{summary:'saved'}]},m=message();
 const generateNextChapter=jest.fn().mockResolvedValue(r);
 await consumeConsultationQueue({messages:[m]},{},{read:async()=>r,service:{generateNextChapter},enqueue:async()=>false});
 expect(m.ack).not.toHaveBeenCalled();expect(m.retry).toHaveBeenCalled();expect(r.chapters).toHaveLength(1);
});
test.each(['AUTOMATIC_RECOVERY_STOPPED','GENERATION_REVIEW_REQUIRED','PAYMENT_NOT_ACTIVE'])('terminal error %s does not restart automatically',async errorCode=>{
 const r={...row(),errorCode},m=message(),generateNextChapter=jest.fn();
 await consumeConsultationQueue({messages:[m]},{},{read:async()=>r,service:{generateNextChapter}});
 expect(generateNextChapter).not.toHaveBeenCalled();expect(m.ack).toHaveBeenCalled();
});
