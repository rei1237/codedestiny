import {jest} from '@jest/globals';
const read=jest.fn(),attach=jest.fn(),resume=jest.fn(),enqueue=jest.fn();
jest.unstable_mockModule('../../worker/yeongnyangi/repository.js',()=>({readRequest:read,attachPayment:attach,resumeRequest:resume}));
jest.unstable_mockModule('../../worker/yeongnyangi/queue.js',()=>({enqueueConsultation:enqueue}));
jest.unstable_mockModule('../../worker/lib/portone.js',()=>({resolveChargeAmountKRW:(_env,amount)=>amount}));
let retryFortune;
beforeAll(async()=>{({retryFortune}=await import('../../worker/yeongnyangi/retry.js'));});
const env={YEONGNYANGI_QUEUE:{}},id='a'.repeat(64);
const row=()=>({_id:id,state:'FORTUNE_FAILED',paymentId:'paid',amountKRW:1000,errorCode:'AUTOMATIC_RECOVERY_STOPPED',chapters:[]});
beforeEach(()=>{jest.clearAllMocks();read.mockResolvedValue(row());attach.mockResolvedValue(row());resume.mockResolvedValue({...row(),state:'PAID',errorCode:''});enqueue.mockResolvedValue(true);});
test('resumes the original paid request without replacing saved chapters',async()=>{
 const result=await retryFortune(env,'owner',id);
 expect(resume).toHaveBeenCalledWith(env,'owner',id);expect(enqueue).toHaveBeenCalledWith(env,result);expect(attach).not.toHaveBeenCalled();
});
test('repairs missing payment attachment using the stored amount',async()=>{
 read.mockResolvedValue({...row(),paymentId:null});
 await retryFortune(env,'owner',id);expect(attach).toHaveBeenCalledWith(env,'owner',id,1000);
});
test('a completed result does not require provider or queue availability',async()=>{
 read.mockResolvedValue({...row(),state:'COMPLETED'});
 expect((await retryFortune({},'owner',id)).state).toBe('COMPLETED');expect(resume).not.toHaveBeenCalled();expect(enqueue).not.toHaveBeenCalled();
});
test.each(['REFUNDED','PAYMENT_NOT_ACTIVE','GENERATION_REVIEW_REQUIRED'])('%s cannot enqueue',async code=>{
 read.mockResolvedValue({...row(),state:code==='REFUNDED'?code:'FORTUNE_FAILED',errorCode:code});
 await expect(retryFortune(env,'owner',id)).rejects.toMatchObject({status:409});expect(enqueue).not.toHaveBeenCalled();
});
test('missing queue cannot reset attempts or attach payment',async()=>{
 await expect(retryFortune({},'owner',id)).rejects.toMatchObject({status:503,payload:{code:'GENERATION_QUEUE_UNAVAILABLE'}});
 expect(resume).not.toHaveBeenCalled();expect(attach).not.toHaveBeenCalled();
});
test('dispatch failure is not accepted',async()=>{
 enqueue.mockResolvedValue(false);
 await expect(retryFortune(env,'owner',id)).rejects.toMatchObject({status:503});
});
test('a concurrent transition to review-required is returned as a permanent failure',async()=>{
 resume.mockResolvedValue({...row(),state:'FORTUNE_FAILED',errorCode:'GENERATION_REVIEW_REQUIRED'});
 await expect(retryFortune(env,'owner',id)).rejects.toMatchObject({status:409,payload:{code:'GENERATION_REVIEW_REQUIRED'}});
 expect(enqueue).not.toHaveBeenCalled();
});
test('a concurrent completion rereads without queueing or charging',async()=>{
 resume.mockResolvedValue({...row(),state:'COMPLETED',errorCode:''});
 expect((await retryFortune(env,'owner',id)).state).toBe('COMPLETED');expect(enqueue).not.toHaveBeenCalled();expect(attach).not.toHaveBeenCalled();
});
test('foreign or missing result cannot attach or resume',async()=>{
 read.mockRejectedValue({status:404});
 await expect(retryFortune(env,'foreign',id)).rejects.toMatchObject({status:404});expect(attach).not.toHaveBeenCalled();expect(resume).not.toHaveBeenCalled();
});
