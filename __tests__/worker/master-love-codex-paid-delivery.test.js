/** @jest-environment node */
import { jest } from '@jest/globals';
let docs, fault, lostConfirmation, route, provider, refund, owner, blocked, fetchBlock, revokedSource;
const uid='64b7f2a1c3d4e5f601234567';
const clone = value => value == null ? value : structuredClone(value);
function query(value) { const result = Promise.resolve(value); result.lean = async () => clone(value); result.select = result.sort = () => result; return result; }
const get = (doc, key) => key.split(".").reduce((value, field) => value?.[field], doc);
function assign(doc, fields) { for (const [key,value] of Object.entries(fields)) { const keys=key.split("."); let target=doc; for(const part of keys.slice(0,-1)) target=target[part] ||= {}; target[keys.at(-1)]=clone(value); } }
function matches(doc, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === "$or") return value.some(row => matches(doc, row));
    if (value && typeof value === "object" && !(value instanceof Date)) {
      if ("$ne" in value) return get(doc, key) !== value.$ne;
      if ("$nin" in value) return !value.$nin.includes(get(doc, key));
      if ("$in" in value) return value.$in.includes(get(doc, key));
      if ("$exists" in value) return (get(doc, key) !== undefined) === value.$exists;
      if ("$lt" in value) return new Date(get(doc, key)) < value.$lt;
    }
    return String(get(doc, key)) === String(value);
  });
}
const model = {
  findOne: filter => { if (lostConfirmation) { lostConfirmation = false; return query(null); } return query(docs.find(doc => matches(doc, filter)) || null); },
  create: async fields => {
    if (docs.some(doc => doc.userId === fields.userId && doc.idempotencyKey === fields.idempotencyKey)) throw Object.assign(new Error("duplicate"), { code: 11000 });
    const doc = { ...clone(fields), createdAt: new Date(), updatedAt: new Date() }; docs.push(doc); return clone(doc);
  },
  find: () => ({ sort() { return this; }, limit() { return this; }, select() { return this; }, lean: async () => [] }),
  findOneAndUpdate: (filter, update) => {
    if (fault?.refinementStatus && update.$set.refinementStatus === fault.refinementStatus) {
      const current=fault; fault=null;
      if(current.kind==='throw') throw new Error('mock refinement storage');
      if(current.kind==='null') return query(null);
      if(current.kind==='confirm') lostConfirmation=true;
    }
    if (fault && (fault.status || fault.chapterCount) && fault.kind !== "usage" && (fault.chapterCount ? update.$set.sections?.length === fault.chapterCount : update.$set.status === fault.status)) {
      const current = fault; fault = null;
      if (current.kind === "throw") throw new Error("mock storage");
      if (current.kind === "null") return query(null);
      if (current.kind === "confirm") lostConfirmation = true;
    }
    const doc = docs.find(row => matches(row, filter));
    if (doc) assign(doc, { ...update.$set, updatedAt: new Date() });
    return query(doc || null);
  },
  updateOne: async (filter, update) => {
    if (fault && (fault.status ? update.$set.status === fault.status : update.$set.deliveryMeta?.savedChapters?.length === fault.count)) {
      const value=fault; fault=null;
      if(value.kind==='throw') throw new Error('storage unavailable');
      if(value.kind==='null') return null;
      if(value.kind==='confirm') lostConfirmation=true;
    }
    const doc=docs.find(row=>matches(row,filter));
    if(doc) assign(doc,update.$set);
    return{matchedCount:doc?1:0};
  },
};


beforeAll(async()=>{
 const db=await import('../../worker/lib/db.js');const auth=await import('../../worker/lib/auth.js');const models=await import('../../worker/lib/models.js');
 jest.unstable_mockModule('../../worker/lib/db.js',()=>({...db,connectDb:async()=>{},withMongoRetry:async(_e,fn)=>fn()}));
 jest.unstable_mockModule('../../worker/lib/auth.js',()=>({...auth,getOptionalUserFromRequest:async()=>({userId:owner}),getAccessTokenSecret:()=> 'test-only'}));
 jest.unstable_mockModule('../../worker/lib/jwt.js',()=>({signJwt:async()=> 'test-token',verifyJwt:async()=>({})}));
 jest.unstable_mockModule('../../worker/lib/models.js',()=>({...models,MasterLoveCodexSession:model,Payment:{findOne:()=>query(blocked?{}:null)},PaidExecutionRecord:{findOne:()=>query(revokedSource===0?{}:null),updateOne:async()=>({matchedCount:1})},PointHistory:{findOne:()=>query(revokedSource===1?{}:null)},MonthlyCreditLedger:{findOne:()=>query(revokedSource===2?{}:null)}}));
 jest.unstable_mockModule('../../worker/lib/gemini.js',()=>({callGeminiText:async()=>{throw new Error('Live provider blocked')}}));
 ({handleMasterLoveCodexRoutes:route}=await import('../../worker/routes/master-love-codex.js'));
});
beforeEach(()=>{
 owner=uid;blocked=false;revokedSource=-1;fault=null;lostConfirmation=false;
 docs=[{id:'saved-codex',userId:uid,idempotencyKey:'original-run',billingRequestId:'original-run',paymentId:'original-payment',inputHash:'original-input',mode:'solo',accessType:'paid',status:'generating',chapters:[],generationProgress:null}];
 refund=jest.fn(async()=>({refunded:false}));
 provider=jest.fn(async(_env,{chapter})=>{let body='';for(let i=0;body.length<(chapter.minChars||2400)+300;i++)body+=`${chapter.id}의 ${i}번째 계산 근거를 바탕으로 생활에서 반복되는 선택과 반대 조건을 구체적으로 살펴보고 실행할 행동을 정합니다.\n`;return{status:'ok',chapter:{id:chapter.id,title:chapter.title,order:chapter.order,symbol:chapter.symbol,body,chars:body.length,ok:true}}});
 fetchBlock=jest.spyOn(globalThis,'fetch').mockImplementation(()=>{throw new Error('External fetch blocked')});
});
afterEach(()=>{expect(fetchBlock).not.toHaveBeenCalled();fetchBlock.mockRestore()});
async function generate(){return route(new Request('https://mock.test/api/master-love-codex/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sessionId:'saved-codex'})}),{},{generateChapter:provider,refundPassCoverage:refund,runCoinRefund:refund,runMonthlyCreditRefund:refund,runPaymentCancel:refund})}
for(const accessType of ['pass','monthly_credit','paid'])it(`${accessType} completes five bounded waves with original evidence`,async()=>{docs[0].accessType=accessType;for(let i=0;i<5;i++)expect((await generate()).status).toBe(i<4?202:200);expect(provider).toHaveBeenCalledTimes(20);expect(docs[0].status).toBe('completed');expect((await generate()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(20);expect(refund).not.toHaveBeenCalled()});
for(const status of ['delivery_pending','completed'])for(const kind of ['throw','null','confirm'])it(`${status} ${kind} preserves generated book`,async()=>{for(let i=0;i<4;i++)await generate();fault={status,kind};const res=await generate();expect(res.status).toBe(503);expect(await res.json()).toMatchObject({reason:'RESULT_STORAGE_UNAVAILABLE',retryable:true,resultId:'saved-codex'});expect(refund).not.toHaveBeenCalled();expect((await generate()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(20)});
it('saves siblings after the first chapter fails',async()=>{provider.mockImplementationOnce(async()=>({status:'fallback'}));expect((await generate()).status).toBe(202);expect(docs[0].chapters).toHaveLength(0);expect(docs[0].deliveryMeta.savedChapters).toHaveLength(3);for(let i=0;i<5;i++)await generate();expect(provider).toHaveBeenCalledTimes(21);expect(docs[0].chapters).toHaveLength(20);expect(refund).not.toHaveBeenCalled()});
it('checkpoint exception does not refund and siblings remain saved',async()=>{fault={count:1,kind:'throw'};expect((await generate()).status).toBe(503);expect(docs[0].deliveryMeta.savedChapters).toHaveLength(4);expect(refund).not.toHaveBeenCalled();for(let i=0;i<4;i++)await generate();expect(provider).toHaveBeenCalledTimes(20)});
it('another owner and refunded payment cannot generate',async()=>{owner='other';expect((await generate()).status).toBe(404);owner=uid;blocked=true;expect((await generate()).status).toBe(402);expect(provider).not.toHaveBeenCalled()});
it('refunded pass or monthly balance cannot be reused',async()=>{for(const field of ['passRefund','billingRefund']){docs[0][field]={refundedAt:new Date()};expect((await generate()).status).toBe(402);delete docs[0][field]}expect(provider).not.toHaveBeenCalled()});
it('concurrent requests cannot generate the same chapters twice',async()=>{const results=await Promise.all([generate(),generate()]);expect(results.map(r=>r.status).sort()).toEqual([202,409]);expect(provider).toHaveBeenCalledTimes(4)});
it('legacy completed books remain readable without new quality checks',async()=>{docs[0].status='completed';docs[0].chapters=[{id:'old',body:'과거 구매 결과',ok:true}];expect((await generate()).status).toBe(200);expect(provider).not.toHaveBeenCalled()});

for(const source of [0,1,2])it(`rejects refunded execution or balance ledger ${source}`,async()=>{revokedSource=source;expect((await generate()).status).toBe(402);expect(provider).not.toHaveBeenCalled()});
it('uncertain exhausted calls do not trigger more LLM or a refund',async()=>{await generate();const ids=docs[0].deliveryMeta.savedChapters.map(row=>row.id);const {__masterLoveCodexTestUtils:utils}=await import('../../worker/routes/master-love-codex.js');const next=utils.MODES.solo.chapters.find(row=>!ids.includes(row.id));docs[0].deliveryMeta.attempts[next.id]=3;expect((await generate()).status).toBe(503);expect(provider).toHaveBeenCalledTimes(4);expect(refund).not.toHaveBeenCalled()});

for (const state of ['retryable', 'deferred']) it(`${state} outages preserve the same paid book past three waves`, async () => {
  const normal = provider.getMockImplementation();
  provider.mockImplementation(async () => ({ status: state }));
  for (let wave = 0; wave < 4; wave++) {
    expect((await generate()).status).toBe(503);
    expect(Object.values(docs[0].deliveryMeta.attempts).every(value => value === 0)).toBe(true);
  }
  expect(refund).not.toHaveBeenCalled();
  provider.mockImplementation(normal);
  for (let wave = 0; wave < 5; wave++) await generate();
  expect(docs[0].status).toBe('completed');
  expect(docs[0].paymentId).toBe('original-payment');
});

it('public progress counts saved siblings without publishing an out-of-order book', async () => {
  provider.mockImplementationOnce(async () => ({ status: 'fallback' }));
  const payload = await (await generate()).json();
  expect(payload.chapters).toHaveLength(0);
  expect(payload.generationProgress).toEqual({ completed: 3, total: 20 });
  expect(payload.generationProgress.lockToken).toBeUndefined();
});
