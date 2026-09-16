import {jest} from '@jest/globals';
const handler=jest.fn();
jest.unstable_mockModule('../../worker/routes/profile.js',()=>({handleYeongnyangiProfileRoutes:handler}));
let handleYeongnyangiProfiles,purgeCredentialCache,readThroughCredentialCache,fixtureOwner,caseId=0;
beforeAll(async()=>{
 ({handleYeongnyangiProfiles}=await import('../../worker/routes/yeongnyangi-profiles.js'));
 ({purgeCredentialCache,readThroughCredentialCache}=await import('../../worker/lib/credential-scoped-cache.js'));
});
beforeEach(()=>{
 fixtureOwner=`owner-one-${++caseId}`;
 handler.mockReset();const cache=new Map();
 globalThis.caches={default:{
  match:async request=>cache.has(request.url)?new Response(cache.get(request.url)):undefined,
  put:async(request,response)=>{cache.set(request.url,await response.text());},
  delete:async request=>cache.delete(request.url),
 }};
 handler.mockImplementation(async request=>new Response(JSON.stringify({ok:true,profiles:[{id:request.headers.get('cookie')}],canCreateMore:true}),{headers:{'Content-Type':'application/json'}}));
});
afterEach(()=>{delete globalThis.caches;});
const request=(cookie=fixtureOwner,method='GET',headers={})=>new Request('https://example.com/api/yeongnyangi/profiles',{method,headers:{Cookie:cookie,...headers}});
test('same credentials reuse the profile list while different owners stay separated',async()=>{
 await handleYeongnyangiProfiles(request(),{});await handleYeongnyangiProfiles(request(),{});
 const response=await handleYeongnyangiProfiles(request('owner-two'),{});
 expect(handler).toHaveBeenCalledTimes(2);expect((await response.json()).profiles[0].id).toBe('owner-two');
});
test('refresh bypasses the list cache and writes never use cached GET results',async()=>{
 await handleYeongnyangiProfiles(request(),{});
 await handleYeongnyangiProfiles(request(fixtureOwner,'GET',{'x-code-destiny-cache-refresh':'1'}),{});
 await handleYeongnyangiProfiles(request(fixtureOwner,'POST'),{});
 expect(handler).toHaveBeenCalledTimes(3);
});
test.each([401,503])('status %i is never cached',async status=>{
 handler.mockImplementation(async()=>new Response('{}',{status}));
 await handleYeongnyangiProfiles(request(),{});await handleYeongnyangiProfiles(request(),{});
 expect(handler).toHaveBeenCalledTimes(2);
});
test('degraded lists and Set-Cookie responses are never cached',async()=>{
 for(const [body,headers] of [[{ok:false,profiles:[]},{}],[{ok:true,profiles:[]},{'Set-Cookie':'fixture-rotation=one'}]]){
  handler.mockClear();handler.mockImplementation(async()=>new Response(JSON.stringify(body),{headers}));
  await handleYeongnyangiProfiles(request(),{});await handleYeongnyangiProfiles(request(),{});
  expect(handler).toHaveBeenCalledTimes(2);
 }
});
test('profile mutation invalidation removes both service lists',async()=>{
 const shared=jest.fn(async()=>new Response(JSON.stringify({ok:true,profiles:[]})));
 const readShared=()=>readThroughCredentialCache({request:request(),env:{},prefix:'profile-list:v1',handler:shared,isCacheable:body=>body.ok===true});
 await readShared();await handleYeongnyangiProfiles(request(),{});
 await purgeCredentialCache(request(),['profile-list:v1','yeongnyangi-profile-list:v1']);
 await readShared();await handleYeongnyangiProfiles(request(),{});
 expect(shared).toHaveBeenCalledTimes(2);expect(handler).toHaveBeenCalledTimes(2);
});
