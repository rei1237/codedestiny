import {jest} from '@jest/globals';
import {ACCESS_METHODS} from '../../worker/yeongnyangi/access-methods.js';

const readRequest=jest.fn(),escalateStopped=jest.fn(),enqueueConsultation=jest.fn();
jest.unstable_mockModule('../../worker/yeongnyangi/repository.js',()=>({
 readRequest,escalateStopped,// Mirrors repository.requestAccessMethod.
 hasRequestAccess:row=>Boolean(row?.paymentId||row?.passEvidenceId||row?.moonstoneLedgerId||row?.packEntitlementId||ACCESS_METHODS.includes(row?.accessMethod)),
}));
jest.unstable_mockModule('../../worker/yeongnyangi/queue.js',()=>({enqueueConsultation}));
jest.unstable_mockModule('../../worker/yeongnyangi/service.ts',()=>({providerReady:()=>true}));

let readAndContinueFortune;
beforeAll(async()=>{({readAndContinueFortune}=await import('../../worker/yeongnyangi/delivery.js'));});
const id='d'.repeat(64),env={YEONGNYANGI_QUEUE:{}};
const row=(chapters=[],extra={})=>({_id:id,userId:'owner',paymentId:'paid',state:'PAID',errorCode:'',chapters,
 snapshot:{manifest:[{},{},{}]},...extra});

beforeEach(()=>jest.clearAllMocks());

test('result polling repairs an incomplete queue hand-off without a buyer click',async()=>{
 const current=row([{}]);readRequest.mockResolvedValue(current);enqueueConsultation.mockResolvedValue(true);
 await expect(readAndContinueFortune(env,'owner',id)).resolves.toBe(current);
 expect(enqueueConsultation).toHaveBeenCalledWith(env,current);
 expect(escalateStopped).not.toHaveBeenCalled();
});

test('a stopped delivery spends the existing bounded server retry and requeues immediately',async()=>{
 const stopped=row([{}],{state:'FORTUNE_FAILED',errorCode:'AUTOMATIC_RECOVERY_STOPPED'});
 const resumed=row([{}]);readRequest.mockResolvedValue(stopped);escalateStopped.mockResolvedValue(resumed);enqueueConsultation.mockResolvedValue(true);
 await expect(readAndContinueFortune(env,'owner',id)).resolves.toBe(resumed);
 expect(escalateStopped).toHaveBeenCalledWith(env,stopped);
 expect(enqueueConsultation).toHaveBeenCalledWith(env,resumed);
});

test.each([
 row([{},{},{}],{state:'COMPLETED'}),
 row([{}],{state:'FORTUNE_FAILED',errorCode:'GENERATION_REVIEW_REQUIRED'}),
 row([],{paymentId:null}),
])('completed, held and unpaid requests stay read-only',async current=>{
 readRequest.mockResolvedValue(current);
 await expect(readAndContinueFortune(env,'owner',id)).resolves.toBe(current);
 expect(escalateStopped).not.toHaveBeenCalled();expect(enqueueConsultation).not.toHaveBeenCalled();
});
