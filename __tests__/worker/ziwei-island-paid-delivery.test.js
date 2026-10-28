/** @jest-environment node */
import { jest } from '@jest/globals';
let owner='owner-a', revoked=false, doc=null, route;
const connect=jest.fn();
function query(value){return {lean:async()=>value,sort(){return this;},limit(){return this;},select(){return this;}};}
const findOne=jest.fn(filter=>query(doc&&doc.userId===filter.userId&&(!filter.id||doc.id===filter.id)?doc:null));
beforeAll(async()=>{
 jest.unstable_mockModule('../../worker/lib/auth.js',()=>({getOptionalUserFromRequest:async()=>owner?{userId:owner}:null,isAuthDbInfraError:()=>false}));
 jest.unstable_mockModule('../../worker/lib/db.js',()=>({connectDb:connect,isTransientMongoError:()=>false}));
 jest.unstable_mockModule('../../worker/lib/models.js',()=>({ZiweiAiConsultation:{findOne,find:()=>query([])}}));
 jest.unstable_mockModule('../../worker/lib/paid-result-revocation.js',()=>({isPaidResultRevoked:async()=>revoked}));
 ({handleZiweiIslandAiRoutes:route}=await import('../../worker/routes/ziwei-island-ai.js'));
});
beforeEach(()=>{owner='owner-a';revoked=false;connect.mockClear();findOne.mockClear();doc={id:'saved-a',userId:owner,serviceType:'ziwei-island-palace-consult',status:'completed',palaceKey:'명궁',sectionKeys:['nature'],messages:[{role:'assistant',content:JSON.stringify({sections:{nature:{title:'기존 상담',body:'저장된 원본 이야기'}}})}]};});
for(const path of ['prepare','ensure-access','generate','start'])test(path+' is retired before auth, DB or generation',async()=>{
 const response=await route(new Request('https://mock.test/api/ziwei-island-ai/'+path,{method:'POST',body:'{}'}));
 expect(response.status).toBe(410);expect((await response.json()).retryable).toBe(false);expect(connect).not.toHaveBeenCalled();expect(findOne).not.toHaveBeenCalled();
});
test('same owner reads the original completed result without new generation',async()=>{const response=await route(new Request('https://mock.test/api/ziwei-island-ai/result?id=saved-a'));expect(response.status).toBe(200);const data=await response.json();expect(data.consultation.result.sections.nature.body).toBe('저장된 원본 이야기');expect(data.retryable).toBe(false);});
test('other owners cannot read',async()=>{owner='owner-b';expect((await route(new Request('https://mock.test/api/ziwei-island-ai/result?id=saved-a'))).status).toBe(404);});
test('signed-out reads require login',async()=>{owner='';expect((await route(new Request('https://mock.test/api/ziwei-island-ai/result?id=saved-a'))).status).toBe(401);});
test('refunded access stays revoked',async()=>{revoked=true;expect((await route(new Request('https://mock.test/api/ziwei-island-ai/result?id=saved-a'))).status).toBe(403);});
test('partial stored content is preserved without a retry instruction',async()=>{doc.status='partial';const data=await(await route(new Request('https://mock.test/api/ziwei-island-ai/result?id=saved-a'))).json();expect(data.consultation.result.sections.nature.body).toBe('저장된 원본 이야기');expect(data.retryable).toBe(false);expect(data.resumeBody).toBeUndefined();});
