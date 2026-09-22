import {jest} from '@jest/globals';
let orders=[],candidates=[];
const chain=(rows)=>({sort:()=>chain(rows),limit:()=>chain(rows),lean:async()=>rows});
jest.unstable_mockModule('../../worker/lib/db.js',()=>({connectDb:async()=>{},withMongoRetry:async(_env,fn)=>fn()}));
jest.unstable_mockModule('../../worker/lib/models.js',()=>({Payment:{find:()=>chain(orders),updateOne:async()=>({modifiedCount:1})}}));
jest.unstable_mockModule('../../worker/yeongnyangi/repository.js',()=>({YeongnyangiRequest:{find:()=>chain(candidates)}}));
jest.unstable_mockModule('../../worker/yeongnyangi/service',()=>({providerReady:()=>false,activateFortune:jest.fn(),generateNextChapter:jest.fn()}));
let runYeongnyangiRecovery,abandonedRequestFilter;
beforeAll(async()=>{({runYeongnyangiRecovery,abandonedRequestFilter}=await import('../../worker/yeongnyangi/recovery.js'));});
beforeEach(()=>{orders=[];candidates=[];});
test('disabled provider cannot enter DB or call LLM',async()=>{
  const connectDb=jest.fn(),generate=jest.fn();
  expect(await runYeongnyangiRecovery({},{connectDb,generate})).toMatchObject({skipped:'disabled'});
  expect(connectDb).not.toHaveBeenCalled();expect(generate).not.toHaveBeenCalled();
});
test('approved order missing browser return reuses its original intent',async()=>{
  orders=[{_id:'p',userId:'owner',requestId:`yn-${'a'.repeat(64)}`}];
  const activate=jest.fn().mockResolvedValue({});
  await runYeongnyangiRecovery({},{providerReady:()=>true,activate});
  expect(activate).toHaveBeenCalledWith({},'owner','a'.repeat(64));
});
test('saved partial chapters resume and stop at completion',async()=>{
  candidates=[{_id:'id',userId:'owner',chapters:[{}]}];
  const generate=jest.fn().mockResolvedValueOnce({_id:'id',userId:'owner',chapters:[{},{}],state:'PAID'})
    .mockResolvedValueOnce({chapters:[{},{},{}],state:'COMPLETED'});
  await runYeongnyangiRecovery({},{providerReady:()=>true,generate});
  expect(generate).toHaveBeenCalledTimes(2);
});
test.each(['GENERATING','FORTUNE_FAILED','REFUNDED'])('state %s is never spun or retried in the same tick',async state=>{
  candidates=[{_id:'id',userId:'owner',chapters:[]}];
  const generate=jest.fn().mockResolvedValue({chapters:[],state});
  await runYeongnyangiRecovery({},{providerReady:()=>true,generate});
  expect(generate).toHaveBeenCalledTimes(1);
});
test('tick reserves provider and commit time before starting another chapter',async()=>{
  candidates=[{_id:'id',userId:'owner',chapters:[]}];let now=1000;
  const generate=jest.fn().mockImplementation(async()=>{now+=140000;return {_id:'id',userId:'owner',chapters:[{}],state:'PAID'};});
  await runYeongnyangiRecovery({},{providerReady:()=>true,generate,clock:()=>now});
  expect(generate).toHaveBeenCalledTimes(1);
});
test('review-required and payment-suspended requests are excluded',()=>{
  expect(abandonedRequestFilter(Date.now()).errorCode.$nin).toEqual(['GENERATION_REVIEW_REQUIRED','PAYMENT_NOT_ACTIVE','AUTOMATIC_RECOVERY_STOPPED']);
});
