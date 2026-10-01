import {jest} from '@jest/globals';
import {createHttpError} from '../../worker/lib/http.js';

const userId='507f1f77bcf86cd799439011', id='b'.repeat(64);
const auth=jest.fn(),security=jest.fn(),prepare=jest.fn(),activate=jest.fn(),retry=jest.fn(),read=jest.fn(),resume=jest.fn(),usage=jest.fn();
const find=jest.fn(),lean=jest.fn();
const query={select:()=>query,sort:()=>query,limit:()=>query,lean};
jest.unstable_mockModule('../../worker/lib/auth.js',()=>({requireUserFromRequest:auth,getOptionalUserFromRequest:jest.fn()}));
jest.unstable_mockModule('../../worker/lib/db.js',()=>({connectDb:async()=>{},mongoose:{},withMongoRetry:async(_env,fn)=>fn()}));
jest.unstable_mockModule('../../worker/lib/models.js',()=>({FortuneChatSession:{}}));
jest.unstable_mockModule('../../worker/lib/fusion-fortune.js',()=>({buildFusionFortuneStatus:jest.fn(),createMongoFusionFortuneStore:jest.fn(),isFusionFortuneApiEnabled:()=>false}));
jest.unstable_mockModule('../../worker/lib/security/index.js',()=>({enforceSensitiveEndpointSecurity:security}));
jest.unstable_mockModule('../../worker/lib/guardian-fortune-usage.js',()=>({buildGuardianFortuneUsageStatus:usage,createMongoGuardianFortuneStore:()=>({}),buildGuardianFortuneGuestCookie:jest.fn(),createGuardianFortuneGuestId:jest.fn(),
  hashGuardianFortuneGuestId:jest.fn(),mergeGuardianFortuneAnonymousUsage:jest.fn(),GUARDIAN_FORTUNE_ACCOUNT_FREE_LIMIT:1,GUARDIAN_FORTUNE_PAID_FEATURE_KEY:"fortune-chat-consultation"}));
jest.unstable_mockModule('../../worker/yeongnyangi/delivery.js',()=>({readAndContinueFortune:resume}));
jest.unstable_mockModule('../../worker/yeongnyangi/retry.js',()=>({retryFortune:retry}));
jest.unstable_mockModule('../../worker/yeongnyangi/per-use-access.js',()=>({CHAT_ACCESS_CHOICES:['free_trial','pass','checkout']}));
jest.unstable_mockModule('../../worker/yeongnyangi/repository.js',()=>({readRequest:read,ownerId:value=>value,YeongnyangiRequest:{find}}));
jest.unstable_mockModule('../../worker/yeongnyangi/service.ts',()=>({prepareFortune:prepare,activateFortune:activate,presentFortune:row=>({id:row._id,state:row.state})}));
let handleFortuneChatRoutes;
beforeAll(async()=>{({handleFortuneChatRoutes}=await import('../../worker/routes/fortune-chat.js'));});

const on={ENABLE_FORTUNE_CHAT_CONSULTATIONS:'true'};
const chatRow={_id:id,persona:'yeoni',featureKey:'fortune-chat-consultation',state:'CREATED'};
const request=(path,method='GET',body)=>new Request('https://code-destiny.com/api/fortune-chat/consultations'+path,{
  method,headers:method==='GET'?{}:{'Content-Type':'application/json'},...(body!==undefined?{body:JSON.stringify(body)}:{}),
});
beforeEach(()=>{
  jest.clearAllMocks();auth.mockResolvedValue({userId});security.mockResolvedValue({ok:true});
  for(const fn of [prepare,activate,retry,read,resume])fn.mockResolvedValue(chatRow);
  usage.mockResolvedValue({dailyFreeRemaining:1});find.mockReturnValue(query);lean.mockResolvedValue([]);
});

test.each([['','POST'],[`/${id}/activate`,'POST']])('flag off hides %s %s without creating or charging',async(path,method)=>{
  expect((await handleFortuneChatRoutes(request(path,method,{persona:'yeoni',access:'pass'}),{})).status).toBe(404);
  expect(prepare).not.toHaveBeenCalled();expect(activate).not.toHaveBeenCalled();
});
test('flag off still reads and continues a consultation already started',async()=>{
  const response=await handleFortuneChatRoutes(request(`/${id}`),{});
  expect(response.status).toBe(200);expect(resume).toHaveBeenCalledWith({},userId,id);
  expect((await handleFortuneChatRoutes(request(`/${id}/generate`,'POST',{}),{})).status).toBe(202);
});
test('create passes the persona as a server option and reports the free use for unpaid rows',async()=>{
  const response=await handleFortuneChatRoutes(request('','POST',{persona:'neo',question:'이직해도 될까요?'}),on);
  expect(response.status).toBe(201);
  expect(prepare).toHaveBeenCalledWith(on,userId,expect.objectContaining({question:'이직해도 될까요?'}),{persona:'neo'});
  expect((await response.json()).consultation).toMatchObject({paidFeatureKey:'fortune-chat-consultation',paymentRequestId:`fc-${id}`,freeTrialAvailable:true});
  expect((await handleFortuneChatRoutes(request('','POST',{persona:'yeongnyangi'}),on)).status).toBe(400);
});
test.each([['pass','pass'],['free_trial','free_trial'],['checkout','checkout'],['family',''],[undefined,'']])('activate forwards access %p as %p',async(access,expected)=>{
  await handleFortuneChatRoutes(request(`/${id}/activate`,'POST',{access}),on);
  expect(activate).toHaveBeenCalledWith(on,userId,id,{access:expected});
});
test('payment required keeps the order id for the payment window',async()=>{
  activate.mockRejectedValue(createHttpError(402,'PAYMENT_REQUIRED',{code:'PAYMENT_REQUIRED',paidFeatureKey:'fortune-chat-consultation',paymentRequestId:`fc-${id}`}));
  const response=await handleFortuneChatRoutes(request(`/${id}/activate`,'POST',{}),on);
  expect(response.status).toBe(402);
  expect(await response.json()).toMatchObject({code:'PAYMENT_REQUIRED',paymentRequestId:`fc-${id}`});
});
test('a Yeongnyangi request is never served, activated or continued here',async()=>{
  read.mockResolvedValue({_id:id,featureKey:'yeongnyangi-saju-mackerel',state:'CREATED'});
  expect((await handleFortuneChatRoutes(request(`/${id}`),on)).status).toBe(404);
  expect((await handleFortuneChatRoutes(request(`/${id}/activate`,'POST',{access:'pass'}),on)).status).toBe(404);
  expect((await handleFortuneChatRoutes(request(`/${id}/generate`,'POST',{}),on)).status).toBe(404);
  expect(resume).not.toHaveBeenCalled();expect(activate).not.toHaveBeenCalled();expect(retry).not.toHaveBeenCalled();
});
test('history is per persona and limited to fortune-chat consultations',async()=>{
  expect((await handleFortuneChatRoutes(request(''),on)).status).toBe(400);
  const listed=await handleFortuneChatRoutes(request('?persona=neo'),on);
  expect(listed.status).toBe(200);expect(await listed.json()).toMatchObject({enabled:true,consultations:[]});
  expect(await (await handleFortuneChatRoutes(request('?persona=yeoni'),{})).json()).toMatchObject({enabled:false});
  expect(find).toHaveBeenCalledWith({userId,persona:'neo',featureKey:'fortune-chat-consultation'});
});
