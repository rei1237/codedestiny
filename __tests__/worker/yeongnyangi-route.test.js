import {jest} from '@jest/globals';
import {createHttpError,json} from '../../worker/lib/http.js';

const userId='507f1f77bcf86cd799439011', id='a'.repeat(64);
const auth=jest.fn(),security=jest.fn(),prepare=jest.fn(),activate=jest.fn(),generate=jest.fn(),read=jest.fn();
const attendance=jest.fn(),attend=jest.fn(),unlock=jest.fn(),freeRead=jest.fn(),freePrepare=jest.fn();
const horary=jest.fn(),location=jest.fn();
jest.unstable_mockModule('../../worker/yeongnyangi/fortune/free/horary.ts',()=>({prepareHoraryPrompt:horary}));
jest.unstable_mockModule('../../worker/yeongnyangi/fortune/question-sky.ts',()=>({resolveCurrentLocation:location}));
const profilesHandler=jest.fn();
const find=jest.fn(),select=jest.fn(),sort=jest.fn(),limit=jest.fn(),lean=jest.fn();
const maxTimeMS=jest.fn();
const query={select,sort,limit,maxTimeMS,lean};
const paymentFind=jest.fn(),paymentLean=jest.fn();
const paymentQuery={select:()=>paymentQuery,limit:()=>paymentQuery,maxTimeMS:()=>paymentQuery,lean:paymentLean};
jest.unstable_mockModule('../../worker/lib/models.js',()=>({Payment:{find:paymentFind}}));
jest.unstable_mockModule('../../worker/lib/auth.js',()=>({requireUserFromRequest:auth}));
jest.unstable_mockModule('../../worker/lib/db.js',()=>({connectDb:async()=>{},withMongoRetry:async(_env,fn)=>fn()}));
jest.unstable_mockModule('../../worker/lib/security/index.js',()=>({enforceSensitiveEndpointSecurity:security}));
jest.unstable_mockModule('../../worker/routes/yeongnyangi-profiles.js',()=>({handleYeongnyangiProfiles:profilesHandler}));
jest.unstable_mockModule('../../worker/yeongnyangi/payments/catalog.ts',()=>({products:[{id:'saju_mackerel',priceKRW:1000}]}));
jest.unstable_mockModule('../../worker/yeongnyangi/service.ts',()=>({
  prepareFortune:prepare,activateFortune:activate,generateNextChapter:generate,presentFortune:row=>row,
  providerReady:env=>Boolean(env.GEMINIF_API_KEY),
}));
jest.unstable_mockModule('../../worker/yeongnyangi/free-service.ts',()=>({
  attendanceStatus:attendance,attend,unlockToday:unlock,getFreeReading:freeRead,prepareFreeReading:freePrepare,
}));
jest.unstable_mockModule('../../worker/yeongnyangi/repository.js',()=>({
  readRequest:read,resumeRequest:read,ownerId:value=>value,YeongnyangiRequest:{find},
}));
jest.unstable_mockModule('../../worker/yeongnyangi/retry.js',()=>({retryFortune:generate}));
let handleYeongnyangiRoutes;
beforeAll(async()=>{({handleYeongnyangiRoutes}=await import('../../worker/routes/yeongnyangi.js'));});
const env={GEMINIF_API_KEY:'fixture-not-called'};
function request(path,method='GET',body){
  return new Request('https://code-destiny.com/api/yeongnyangi/'+path,{
    method,headers:method==='GET'?{}:{'Content-Type':'application/json'},
    ...(body!==undefined?{body:JSON.stringify(body)}:{}),
  });
}
beforeEach(()=>{
  jest.clearAllMocks();auth.mockResolvedValue({userId});security.mockResolvedValue({ok:true});
  profilesHandler.mockImplementation(async()=>json({ok:true,profiles:[],canCreateMore:true}));
  for(const fn of [prepare,activate,generate,read])fn.mockResolvedValue({id,state:'PAID'});
  attendance.mockResolvedValue({day:'2026-09-16',balance:1,attended:true,unlocked:false});
  attend.mockResolvedValue({day:'2026-09-16',balance:1,attended:true,unlocked:false,awarded:true});
  unlock.mockResolvedValue({day:'2026-09-16',balance:0,attended:true,unlocked:true,newlyUnlocked:true});
  freeRead.mockResolvedValue({result:null});freePrepare.mockResolvedValue({category:'basic',title:'오늘의 운세'});
  maxTimeMS.mockReturnValue(query);find.mockReturnValue(query);select.mockReturnValue(query);sort.mockReturnValue(query);limit.mockReturnValue(query);lean.mockResolvedValue([]);
  paymentFind.mockReturnValue(paymentQuery);paymentLean.mockResolvedValue([]);
});

test.each(['GET','POST'])('profile %s delegates once to the authenticated profile boundary',async method=>{
 const req=request('profiles',method,method==='POST'?{profile:{}}:undefined);
 expect((await handleYeongnyangiRoutes(req,env)).status).toBe(200);
 expect(profilesHandler).toHaveBeenCalledWith(req,env);expect(auth).not.toHaveBeenCalled();
});

test('public catalogue reports provider availability without account or database access',async()=>{
  const response=await handleYeongnyangiRoutes(request('products'),{});
  expect(await response.json()).toMatchObject({products:[{available:false}]});
  expect(auth).not.toHaveBeenCalled();expect(find).not.toHaveBeenCalled();
  expect(response.headers.get('Cache-Control')).toContain('no-store');
});
test.each(['requests',`requests/${id}`,`requests/${id}/activate`,`requests/${id}/generate`])('expired session cannot access %s',async path=>{
  auth.mockRejectedValue(createHttpError(401,'로그인이 필요해요.',{code:'LOGIN_REQUIRED'}));
  const response=await handleYeongnyangiRoutes(request(path,path.endsWith('activate')||path.endsWith('generate')?'POST':'GET'),env);
  expect(response.status).toBe(401);expect(prepare).not.toHaveBeenCalled();expect(activate).not.toHaveBeenCalled();expect(generate).not.toHaveBeenCalled();
});
test.each(['requests',`requests/${id}/activate`,`requests/${id}/generate`])('shared security rejection prevents mutation at %s',async path=>{
  security.mockResolvedValue({ok:false,response:json({code:'INVALID_ORIGIN'},{status:403})});
  const response=await handleYeongnyangiRoutes(request(path,'POST',{}),env);
  expect(response.status).toBe(403);
  expect(security).toHaveBeenCalledWith(expect.objectContaining({userId,requireJson:true,allowedMethods:['POST'],rateLimitKey:`${userId}:yeongnyangi:write`}));
  expect(prepare).not.toHaveBeenCalled();expect(activate).not.toHaveBeenCalled();expect(generate).not.toHaveBeenCalled();
});
test.each([null,[],42,'invalid'])('invalid JSON object %p fails before preparation',async body=>{
  expect((await handleYeongnyangiRoutes(request('requests','POST',body),env)).status).toBe(400);
  expect(prepare).not.toHaveBeenCalled();
});
test('payload owner is ignored; authenticated owner is passed to the service',async()=>{
  const body={userId:'someone-else',profileId:'profile',productId:'saju_mackerel'};
  const response=await handleYeongnyangiRoutes(request('requests','POST',body),env);
  expect(response.status).toBe(201);expect(prepare).toHaveBeenCalledWith(env,userId,body);
});
test.each(['activate','generate'])('repeat %s requests target the same owned consultation',async action=>{
  for(let i=0;i<2;i++)expect((await handleYeongnyangiRoutes(request(`requests/${id}/${action}`,'POST',{}),env)).status).toBe(action==='generate'?202:200);
  expect(action==='activate'?activate:generate).toHaveBeenNthCalledWith(2,env,userId,id);
  if(action==='activate')expect(generate).not.toHaveBeenCalled();
});
test('list uses owner filter, bounded projection and stable pagination',async()=>{
  const stamp='2026-09-16T00:00:00.000Z';
  lean.mockResolvedValue(Array.from({length:31},()=>({_id:id,snapshot:{product:{id:'saju_mackerel'}},createdAt:stamp,state:'PAID'})));
  const response=await handleYeongnyangiRoutes(request(`requests?cursor=${stamp}_${id}`),env);
  const body=await response.json();expect(body.fortunes).toHaveLength(30);expect(body.nextCursor).toBe(`${stamp}_${id}`);
  expect(find).toHaveBeenCalledWith(expect.objectContaining({userId,$or:expect.any(Array)}));
  expect(limit).toHaveBeenCalledWith(31);expect(select.mock.calls[0][0].split(' ')).not.toEqual(expect.arrayContaining(['chapters','snapshot.analysis']));
  expect(maxTimeMS).toHaveBeenCalledWith(4000);expect(response.headers.get('Server-Timing')).toMatch(/auth;dur=.*db;dur=.*query;dur=/);
});
test('list hides abandoned unpaid consultations after the pending window without deleting them',async()=>{
  const before=Date.now();expect((await handleYeongnyangiRoutes(request('requests'),env)).status).toBe(200);
  expect(find).toHaveBeenCalledTimes(1);const [hidden]=find.mock.calls[0][0].$nor;
  expect(hidden).toEqual({state:'CREATED',paymentId:null,passEvidenceId:null,accessMethod:null,createdAt:{$lt:expect.any(Date)}});
  const cutoff=hidden.createdAt.$lt.getTime();expect(cutoff).toBeGreaterThanOrEqual(before-30*60*1000);expect(cutoff).toBeLessThanOrEqual(Date.now()-30*60*1000);
  expect(paymentFind).toHaveBeenCalledWith(expect.objectContaining({userId,requestId:expect.any(RegExp),'metadata.consumedBy':{$in:[null,'']}}));
});
test('list keeps a consultation whose paid order is not attached yet',async()=>{
  paymentLean.mockResolvedValue([{requestId:`yn-${id}`}]);
  expect((await handleYeongnyangiRoutes(request('requests'),env)).status).toBe(200);
  expect(find).toHaveBeenCalledTimes(2);expect(find.mock.calls[1][0].$nor[0]._id).toEqual({$nin:[id]});
});
test('list shows everything when the paid order lookup fails',async()=>{
  paymentLean.mockRejectedValue(new Error('timeout'));
  expect((await handleYeongnyangiRoutes(request('requests'),env)).status).toBe(200);
  expect(find).toHaveBeenCalledTimes(2);expect(find.mock.calls[1][0]).not.toHaveProperty('$nor');
});
test('invalid cursor does not run a database query',async()=>{
  expect((await handleYeongnyangiRoutes(request('requests?cursor=bad'),env)).status).toBe(400);expect(find).not.toHaveBeenCalled();
});
test('owned lookup propagates a missing or foreign result as 404',async()=>{
  read.mockRejectedValue(Object.assign(new Error('not found'),{status:404,code:'REQUEST_NOT_FOUND'}));
  expect((await handleYeongnyangiRoutes(request(`requests/${id}`),env)).status).toBe(404);
  expect(read).toHaveBeenCalledWith(env,userId,id);
});
test('attendance, daily unlock and free reading always use the authenticated owner',async()=>{
  expect((await handleYeongnyangiRoutes(request('attendance'),env)).status).toBe(200);
  expect((await handleYeongnyangiRoutes(request('attendance','POST',{}),env)).status).toBe(200);
  expect((await handleYeongnyangiRoutes(request('free/unlock','POST',{}),env)).status).toBe(200);
  expect((await handleYeongnyangiRoutes(request('free/reading?category=basic'),env)).status).toBe(200);
  const body={userId:'someone-else',category:'basic',profileId:'mine',draft:{}};
  expect((await handleYeongnyangiRoutes(request('free/reading','POST',body),env)).status).toBe(200);
  expect(attendance).toHaveBeenCalledWith(env,userId);expect(attend).toHaveBeenCalledWith(env,userId);
  expect(unlock).toHaveBeenCalledWith(env,userId);expect(freeRead).toHaveBeenCalledWith(env,userId,'basic');
  expect(freePrepare).toHaveBeenCalledWith(env,userId,body);
});
test.each(['attendance','free/unlock','free/reading'])('security rejection prevents free mutation at %s',async path=>{
  security.mockResolvedValue({ok:false,response:json({code:'INVALID_ORIGIN'},{status:403})});
  expect((await handleYeongnyangiRoutes(request(path,'POST',{}),env)).status).toBe(403);
  expect(attend).not.toHaveBeenCalled();expect(unlock).not.toHaveBeenCalled();expect(freePrepare).not.toHaveBeenCalled();
});

test.each(['free/horary','location'])('%s is free without auth, payment, provider or result DB access',async path=>{
 horary.mockResolvedValue({category:'horary',prompt:'calculated'});location.mockReturnValue({timezone:'Asia/Seoul'});
 const response=await handleYeongnyangiRoutes(request(path,'POST',{}),{});
 expect(response.status).toBe(200);expect(response.headers.get('Cache-Control')).toContain('no-store');
 expect(auth).not.toHaveBeenCalled();expect(prepare).not.toHaveBeenCalled();expect(activate).not.toHaveBeenCalled();expect(generate).not.toHaveBeenCalled();expect(find).not.toHaveBeenCalled();expect(freePrepare).not.toHaveBeenCalled();
 expect(security).toHaveBeenCalled();
});
test.each(['free/horary','location'])('%s observes security rejection before calculation',async path=>{
 security.mockResolvedValue({ok:false,response:json({code:'RATE_LIMIT_EXCEEDED'},{status:429})});
 expect((await handleYeongnyangiRoutes(request(path,'POST',{}),{})).status).toBe(429);
 expect(horary).not.toHaveBeenCalled();expect(location).not.toHaveBeenCalled();
});

test('retry dispatch failure returns actionable 503 rather than accepted',async()=>{
 generate.mockRejectedValue(Object.assign(new Error('queue unavailable'),{status:503,code:'GENERATION_QUEUE_UNAVAILABLE'}));
 const response=await handleYeongnyangiRoutes(request(`requests/${id}/generate`,'POST',{}),env);
 expect(response.status).toBe(503);expect(response.headers.get('Retry-After')).toBe('30');
 expect(await response.json()).toMatchObject({retryable:true,retryAfterSeconds:30});
});
test('retry uses the authenticated owner and original consultation',async()=>{
 const response=await handleYeongnyangiRoutes(request(`requests/${id}/generate`,'POST',{userId:'foreign'}),env);
 expect(response.status).toBe(202);expect(generate).toHaveBeenCalledWith(env,userId,id);
});
test('completed reread returns 200 and the same request without another payment route',async()=>{
 generate.mockResolvedValue({id,state:'COMPLETED'});
 const response=await handleYeongnyangiRoutes(request(`requests/${id}/generate`,'POST',{}),env);
 expect(response.status).toBe(200);expect(await response.json()).toMatchObject({fortune:{id,state:'COMPLETED'}});
 expect(activate).not.toHaveBeenCalled();
});

 test.each([0,30])('list with %i rows has no next cursor and contains only summaries',async count=>{
  lean.mockResolvedValue(Array.from({length:count},(_,i)=>({_id:String(i).padStart(64,'0'),snapshot:{product:{id:'saju_mackerel'},analysis:{consultation:{consultationKind:'personal',kindLabel:'사주 해석'}}},createdAt:'2026-09-23',state:'COMPLETED',completedChapters:5})));
  const response=await handleYeongnyangiRoutes(request('requests'),env);const body=await response.json();
  expect(body.fortunes).toHaveLength(count);expect(body.nextCursor).toBeNull();
  if(count){expect(body.fortunes[0].kindLabel).toBe('사주 해석');expect(body.fortunes[0].chapters).toBeUndefined();expect(body.fortunes[0].snapshot).toBeUndefined();}
 });


test('library exposes only saved purchase locale, with Korean fallback for old books',async()=>{
 lean.mockResolvedValue(['en','ja',undefined].map((locale,i)=>({_id:String(i).padStart(64,'0'),snapshot:{locale,product:{id:'saju_mackerel'}},state:'COMPLETED',createdAt:'2026-09-26'})));
 const response=await handleYeongnyangiRoutes(request('requests?lang=ko'),env);
 expect(response.status).toBe(200);
 const body=await response.json();
 expect(body.fortunes.map(row=>row.locale)).toEqual(['en','ja','ko']);
 expect(select.mock.calls[0][0].split(' ')).toContain('snapshot.locale');
 expect(body.fortunes.every(row=>!row.snapshot&&!row.chapters)).toBe(true);
});
