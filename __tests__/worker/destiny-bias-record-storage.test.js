/** @jest-environment node */
import { jest } from '@jest/globals';
let route, user, docs, upserts;
const owner='64b7f2a1c3d4e5f601234567', other='64b7f2a1c3d4e5f601234568';
beforeAll(async()=>{
  const db=await import('../../worker/lib/db.js');
  jest.unstable_mockModule('../../worker/lib/db.js',()=>({...db,connectDb:async()=>{}}));
  jest.unstable_mockModule('../../worker/lib/auth.js',()=>({requireAuth:async()=>{
    if(!user){const {createHttpError}=await import('../../worker/lib/http.js');throw createHttpError(401,'Login required');}
    return {userId:user};
  }}));
  jest.unstable_mockModule('../../worker/lib/models.js',()=>({
    AbuseScore:{},DestinyBiasShare:{},
    User:{findById:()=>({select:()=>({lean:async()=>({_id:user})})})},
    DestinyBiasCard:{findOneAndUpdate:(query,update)=>({lean:async()=>{
      upserts.push(query);const key=String(query._id);if(!docs.has(key))docs.set(key,{_id:query._id,...update.$setOnInsert});return docs.get(key);
    }}),create:async()=>{throw new Error('Non-idempotent write forbidden in fixture');}},
  }));
  ({handleDestinyBiasRoutes:route}=await import('../../worker/routes/destiny-bias.js'));
});
beforeEach(()=>{user=owner;docs=new Map();upserts=[];});
const save=(id='fixture-save-key')=>route(new Request('https://fixture.invalid/api/destiny-bias/cards',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({recordRequestId:id,title:'최애운명 카드',summary:'비식별 저장 예시',canonical:{version:'destiny-bias-record-v1',viewModel:{chemistrySummary:'비식별 결과'}}})}));
test('same authenticated owner and save request store one result across retries',async()=>{
  const first=await save(),second=await save();expect(first.status).toBe(201);expect(second.status).toBe(201);
  expect((await first.json()).item.id).toBe((await second.json()).item.id);expect(docs.size).toBe(1);
  expect(upserts[0].userId.toHexString()).toBe(owner);
});
test('owners never collide and anonymous saves cannot write',async()=>{
  await save();user=other;await save();expect(docs.size).toBe(2);
  user='';expect((await save()).status).toBe(401);expect(docs.size).toBe(2);
});
test('invalid retry identifiers cannot create a record',async()=>{
  expect((await save('invalid/key')).status).toBe(400);expect(docs.size).toBe(0);
});
