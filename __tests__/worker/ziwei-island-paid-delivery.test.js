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
// 6c-6: 생성이 410으로 닫힌 뒤 멈춘 옛 기록은 저장된 글로만 구제한다(읽기 응답만, DB 쓰기 없음).
const PART_IDS=['essence_0','essence_1','strength_0','strength_1','shadow_0','shadow_1','task_0','task_1'];
function stuck(status,ids){return {...doc,status,palaceKey:'명궁',messages:[],llmMeta:{input:{palaceKey:'명궁'},chart:null,parts:Object.fromEntries(ids.map(id=>[id,{body:'저장된 '+id+' 본문',evidence:{}}]))}};}
async function read(){const response=await route(new Request('https://mock.test/api/ziwei-island-ai/result?id=saved-a'));return {status:response.status,data:await response.json()};}
test('stuck partial without assistant message is rebuilt from llmMeta.parts and points to support',async()=>{
 doc=stuck('partial',['essence_0','strength_1']);
 const {status,data}=await read();
 expect(status).toBe(200);expect(data.status).toBe('partial');expect(data.retryable).toBe(false);
 expect(data.consultation.result.sections.essence.body).toBe('저장된 essence_0 본문');
 expect(data.consultation.result.sections.strength.body).toBe('저장된 strength_1 본문');
 expect(data.legacyDelivery).toEqual(expect.objectContaining({state:'saved_text_partial',supportRequired:true}));
 expect(data.legacyDelivery.message).toContain('고객지원');
});
test('stuck delivery_pending with every part saved is delivered as completed',async()=>{
 doc=stuck('delivery_pending',PART_IDS);
 const {data}=await read();
 expect(data.status).toBe('completed');expect(data.consultation.status).toBe('completed');expect(data.consultation.saved).toBe(true);
 expect(data.consultation.result.sections.task.body).toBe('저장된 task_0 본문\n\n저장된 task_1 본문');
 expect(data.legacyDelivery).toEqual({state:'saved_text_complete',supportRequired:false,message:''});
});
test('saved assistant message wins over parts for a stuck record',async()=>{
 const message=doc.messages;doc={...stuck('partial',['essence_0']),messages:message};
 const {data}=await read();
 expect(data.consultation.result.sections.nature.body).toBe('저장된 원본 이야기');expect(data.legacyDelivery.state).toBe('saved_text_partial');
});
test('stuck generating with no saved text says the purchase needs support, never retries',async()=>{
 doc=stuck('generating',[]);
 const {status,data}=await read();
 expect(status).toBe(200);expect(data.consultation.result).toBeNull();expect(data.retryable).toBe(false);
 expect(data.legacyDelivery).toEqual(expect.objectContaining({state:'no_saved_text',supportRequired:true}));
});
test('pending lookup applies the same rescue',async()=>{
 doc=stuck('delivery_pending',PART_IDS);
 const data=await(await route(new Request('https://mock.test/api/ziwei-island-ai/result?pending=1'))).json();
 expect(data.status).toBe('completed');
});
test('completed records carry no legacy delivery marker',async()=>{const {data}=await read();expect(data.legacyDelivery).toBeUndefined();expect(data.status).toBe('completed');});
