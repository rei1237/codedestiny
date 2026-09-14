/** @jest-environment node */
import { jest } from '@jest/globals';
let docs, fault, lostConfirmation, prepare, reserve;
const originalFetch = globalThis.fetch;
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
  findOneAndUpdate: (filter, update, options={}) => {
    if (fault==='null') { fault=null; return query(null); }
    if (fault==='throw') { fault=null; throw Error('storage unavailable'); }
    let doc=docs.find(row=>matches(row,filter));
    if(!doc && options.upsert){ doc=clone(update.$setOnInsert);docs.push(doc); }
    if(doc){ assign(doc,update.$set||{});for(const [key,n] of Object.entries(update.$inc||{}))assign(doc,{[key]:Number(get(doc,key)||0)+n}); }
    if(fault==='confirm'){ fault=null;lostConfirmation=true; }
    return query(doc||null);
  },
};
beforeAll(async()=>{
 globalThis.fetch = () => { throw new Error('External fetch forbidden in delivery mocks'); };
 const models=await import('../../worker/lib/models.js');
 jest.unstable_mockModule('../../worker/lib/models.js',()=>({...models,FusionFortuneConsultation:model}));
 const mod=await import('../../worker/lib/fusion-fortune-consultation.js');prepare=mod.saveFusionGenerationSnapshot;reserve=mod.reserveFusionGroupAttempt;
});
afterAll(() => { globalThis.fetch = originalFetch; });
beforeEach(()=>{docs=[];fault=null;lostConfirmation=false});
const input={birthDate:'1995-04-18',birthTime:'08:30',concern:'original question'};
const snapshot=()=>prepare({userId:uid,requestId:'original-request',input,context:{systems:{saju:{dayMaster:'갑'}},tarotSpread:{cards:['별']}},calculatedAt:'2026-09-15T00:00:00.000Z'});
it('stores private input and context before any group calls and preserves them on retry',async()=>{const first=await snapshot();expect(first.input).toEqual(input);const second=await prepare({userId:uid,requestId:'original-request',input:{birthDate:'changed'},context:{systems:{}}});expect(second).toEqual(first);expect(docs).toHaveLength(1)});
for(const kind of['throw','null','confirm'])it(`snapshot ${kind} is a typed storage failure`,async()=>{fault=kind;await expect(snapshot()).rejects.toMatchObject({code:'RESULT_STORAGE_UNAVAILABLE',resultId:'original-request'})});
it('reserves at most three calls per group across requests',async()=>{await snapshot();for(let i=1;i<=3;i++)expect(await reserve({userId:uid,requestId:'original-request',groupId:'saju'})).toBe(i);await expect(reserve({userId:uid,requestId:'original-request',groupId:'saju'})).rejects.toMatchObject({code:'RESULT_STORAGE_UNAVAILABLE'});expect(await reserve({userId:uid,requestId:'original-request',groupId:'tarot'})).toBe(1)});
it('lost attempt confirmation does not restore its budget',async()=>{await snapshot();fault='confirm';await expect(reserve({userId:uid,requestId:'original-request',groupId:'saju'})).rejects.toMatchObject({code:'RESULT_STORAGE_UNAVAILABLE'});expect(await reserve({userId:uid,requestId:'original-request',groupId:'saju'})).toBe(2)});
it('a different owner cannot use the saved generation budget',async()=>{await snapshot();await expect(reserve({userId:'other',requestId:'original-request',groupId:'saju'})).rejects.toMatchObject({code:'RESULT_STORAGE_UNAVAILABLE'});expect(docs[0].generationSnapshot.attempts).toEqual({})});
