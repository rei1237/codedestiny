/** @jest-environment node */
import { jest } from '@jest/globals';
let entry, createLlmCacheStore;
jest.unstable_mockModule('../../worker/lib/db.js',()=>({connectDb:async()=>{}}));
jest.unstable_mockModule('../../worker/lib/models.js',()=>({LlmResponseCache:{findOne:()=>({lean:async()=>entry}),updateOne:async()=>{}}}));
beforeAll(async()=>{({createLlmCacheStore}=await import('../../worker/lib/llm-cache-store.js'));});
test('TTL cleanup lag and missing expiry never return an expired response',async()=>{
 const store=createLlmCacheStore({});
 for(const expiresAt of [undefined,new Date(Date.now()-1000),'invalid']){entry={text:'old',expiresAt};expect(await store.get('owned-key')).toBeNull();}
 entry={text:'current',expiresAt:new Date(Date.now()+60000),provider:'gemini'};
 expect((await store.get('owned-key')).text).toBe('current');
});
