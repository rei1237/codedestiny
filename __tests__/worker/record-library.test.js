/** @jest-environment node */
import { jest } from '@jest/globals';
import { readFileSync } from 'node:fs';
let library, route, mongoose, stores, failures, user, revoked;
const owner = '64b7f2a1c3d4e5f601234567';
const foreign = '64b7f2a1c3d4e5f601234568';
const path = (doc, key) => key.split('.').reduce((value, part) => value?.[part], doc);
const comparable = value => value instanceof Date ? value.getTime() : value?.toHexString ? value.toHexString() : value;
function matches(doc, filter) {
  return Object.entries(filter).every(([key, test]) => {
    if (key === '$and') return test.every(item => matches(doc,item));
    if (key === '$or') return test.some(item => matches(doc,item));
    const actual = path(doc,key);
    if (test && typeof test === 'object' && !(test instanceof Date) && !test.toHexString) {
      return Object.entries(test).every(([op, value]) => {
        if (op === '$exists') return (actual !== undefined) === value;
        if (op === '$in') return value.some(item => comparable(item) === comparable(actual));
        if (op === '$ne') return comparable(actual) !== comparable(value);
        if (op === '$lte') return comparable(actual) <= comparable(value);
        if (op === '$lt') return comparable(actual) < comparable(value);
        if (op === '$regex') return new RegExp(value, test.$options).test(String(actual || ''));
        if (op === '$options') return true;
        if (op === '$elemMatch') return Array.isArray(actual) && actual.some(item => matches(item,value));
        throw new Error(`Unhandled mock operator ${op}`);
      });
    }
    return test === null ? actual == null : comparable(actual) === comparable(test);
  });
}
const collection = name => ({
  findOne: jest.fn(async filter => (stores[name] || []).find(doc => matches(doc,filter)) || null),
  aggregate: jest.fn(pipeline => ({ toArray: async () => {
    if (failures.has(name)) throw new Error('Storage unavailable');
    let rows = (stores[name] || []).filter(doc => matches(doc,pipeline[0].$match));
    for (const stage of pipeline.filter(stage => stage.$lookup)) {
      const lookup = stage.$lookup;
      if (lookup.as === '_mirror') rows = rows.filter(doc => !(stores[lookup.from] || []).some(other => matches(other, library.ownerQuery(user)) && other.featureId === 'premium-naming-prompt' && doc.merchantUid && doc.merchantUid === other.paymentId));
      if (lookup.as === '_conversation') rows = rows.filter(doc => !(stores[lookup.from] || []).some(other => matches(other, library.ownerQuery(user)) && doc.featureKey === 'fortune-chat-consultation' && doc.metadata?.paidNarrative?.body?.requestId && other.messages?.some(message => message.id === doc.metadata.paidNarrative.body.requestId + ':1')));
    }
    rows.sort((a,b) => (+b.createdAt || 0) - (+a.createdAt || 0) || String(b._id).localeCompare(String(a._id)));
    return rows.slice(0,pipeline.find(stage=>stage.$limit).$limit).map(doc => {
      const result = {};
      for (const [field, include] of Object.entries(pipeline.find(stage=>stage.$project).$project)) if (include === 1 && path(doc,field) !== undefined) {
        const parts = field.split('.'), last = parts.pop(); let target = result;
        for (const part of parts) target = target[part] ||= {};
        target[last] = path(doc,field);
      }
      if (doc.messages) {const first=doc.messages.find(message => message.role === 'user' || message.speaker === 'user');result.questionExcerpt = (first?.content || first?.text || '').slice(0,600);}
      if (doc.chapters) result.chapterManifest = doc.chapters.map(row => ({id:row.id,ok:row.ok,chars:row.body?.length||0}));
      if (doc.snapshot?.manifest) result.manifestCount = doc.snapshot.manifest.length;
      result.partCount = Object.keys(doc.metadata?.paidNarrative?.parts || doc.generationCheckpoint?.parts || {}).length;
      return result;
    });
  }})),
  insertOne: jest.fn(() => { throw new Error('Writes forbidden'); }), updateOne: jest.fn(() => { throw new Error('Writes forbidden'); }),
});
let collections;
beforeAll(async () => {
  const db = await import('../../worker/lib/db.js'); mongoose = db.mongoose;
  const auth = await import('../../worker/lib/auth.js');
  jest.unstable_mockModule('../../worker/lib/db.js',()=>({...db,connectDb:async()=>{}}));
  jest.unstable_mockModule('../../worker/lib/auth.js',()=>({...auth, requireUserFromRequest:async()=>{
    if (!user) { const {createHttpError} = await import('../../worker/lib/http.js'); throw createHttpError(401,'Login required'); }
    return {userId:user};
  }}));
  jest.unstable_mockModule('../../worker/lib/paid-result-revocation.js',()=>({isStoredPaidResultRevoked:async()=>revoked}));
  library = await import('../../worker/lib/record-library.js');
  ({handleRecordRoutes:route}=await import('../../worker/routes/records.js'));
});
beforeEach(()=>{
  stores={}; failures=new Set(); collections=new Map(); user=owner; revoked=false;
  mongoose.connection.db={collection:name=>{if(!collections.has(name))collections.set(name,collection(name));return collections.get(name);}};
});
afterEach(()=>{for(const value of collections.values()){expect(value.insertOne).not.toHaveBeenCalled();expect(value.updateOne).not.toHaveBeenCalled();}});
const request = (path='',method='GET')=>new Request(`https://test.invalid/api/records${path}`,{method});
const seed = (id, day, extra={})=>({_id:new mongoose.Types.ObjectId(id.padStart(24,'0')),id:`record-${id}`,userId:owner,createdAt:new Date(`2026-10-${day}T01:00:00Z`),status:'completed',topic:'비식별 질문',...extra});

test('Ggulggul archive excludes ordinary Yeongnyangi even when storage is shared',async()=>{
 stores.yeongnyangi_requests=[seed('1','01',{_id:'a'.repeat(64),state:'COMPLETED',snapshot:{product:{id:'saju_mackerel'}}}),
  seed('2','02',{_id:'b'.repeat(64),state:'COMPLETED',featureKey:'fortune-chat-consultation',persona:'yeoni'})];
 const body=await(await route(request(),{})).json();
 expect(body.items.map(item=>item.id)).toEqual(['b'.repeat(64)]);
 expect(body.items[0].source).toBe('chat-consultation');
 expect((await route(request('/detail?source=chat-consultation&id='+ 'a'.repeat(64)),{})).status).toBe(404);
});
test('Neo source selection pages only owned Neo records and isolates its cursor', async()=>{
  stores.neoOperationRoomConsultations=[seed('1','01'),seed('2','02'),seed('3','03',{userId:foreign})];
  const first=await (await route(request('?source=neo&limit=1'),{})).json();
  expect(first.items).toHaveLength(1); expect(first.items[0].source).toBe('neo'); expect(first.nextCursor).toBeTruthy();
  const next=await (await route(request(`?source=neo&limit=1&cursor=${encodeURIComponent(first.nextCursor)}`),{})).json();
  expect(next.items).toHaveLength(1); expect(next.items[0].id).not.toBe(first.items[0].id);
  expect((await route(request(`?cursor=${encodeURIComponent(first.nextCursor)}`),{})).status).toBe(400);
  expect((await route(request('?source=unknown'),{})).status).toBe(400);
});
test('coverage: every owned consultation model and raw result store is registered',async()=>{
  const {RECORD_SERVICES}=await import('../../lib/records/service-registry.js');
  expect(new Set(RECORD_SERVICES.map(source=>source.id)).size).toBe(RECORD_SERVICES.length);
  const required=['NewYearAiConsultation','KarmaDestinyAiConsultation','ZiweiAiConsultation','ZiweiDeepReport','LoveSecretAiConsultation','MasterLoveCodexSession','LifeBookAiConsultation','SukuyoCompatibilityAiConsultation','VedicAiConsultation','AstrologyAiConsultation','NeoOperationRoomConsultation','NakshatraAiConsultation','HumanDesignCalculation','HumanDesignInterpretation','HumanDesignReport','DestinyCompassReport','RelationshipBoundaryTest','FortuneChatSession','FusionFortuneConsultation','ServiceExecutionTransaction','PaidExecutionRecord','Payment'];
  required.push('DestinyBiasCard');
  expect(new Set(RECORD_SERVICES.filter(source=>source.model).map(source=>source.model))).toEqual(new Set(required));
  expect(RECORD_SERVICES.filter(source=>source.collection).map(source=>source.collection)).toEqual(expect.arrayContaining(['fortune_tea_house_results','yeongnyangi_requests']));
  // Newly added result-bearing schemas must make this contract fail until classified.
  const schemas=readFileSync(new URL('../../worker/lib/models.js',import.meta.url),'utf8');
  const exported=[...schemas.matchAll(/export const (\w*(?:Consultation|Report|Calculation|Interpretation|CodexSession))\s*= scopedModel/g)].map(match=>match[1]);
  for(const model of exported)expect(required).toContain(model);
});
test('list and detail enforce ownership on the server, including legacy String/ObjectId owner types',async()=>{
  stores.neoOperationRoomConsultations=[seed('1','01'),seed('2','02',{userId:new mongoose.Types.ObjectId(owner)}),seed('3','03',{userId:foreign})];
  const listed=await (await route(request())).json();expect(listed.items.map(item=>item.id)).toEqual(['record-2','record-1']);
  expect((await route(request('/detail?source=neo&id=record-3'))).status).toBe(404);
  expect((await route(request('/detail?source=neo&id=record-1'))).status).toBe(200);
  user=foreign;expect((await route(request('/detail?source=neo&id=record-1'))).status).toBe(404);
});
test('anonymous reads and all write methods are refused',async()=>{
  user='';expect((await route(request())).status).toBe(401);
  user=owner;expect((await route(request('','POST'))).status).toBe(405);
});
test('completed reread returns full chapters/structured facts without provider, calculation or payment writes',async()=>{
  const external=jest.spyOn(globalThis,'fetch').mockImplementation(()=>{throw new Error('External calls forbidden');});
  stores.karmaDestinyAiConsultations=[seed('1','01',{chapters:[{title:'첫 장',body:'첫 장 전체 내용'},{title:'둘째 장',body:'둘째 장 전체 내용'}],integratedResult:{pillars:[{ganji:'甲子'}]},accessToken:'must-not-leak'})];
  const body=await (await route(request('/detail?source=karma&id=record-1'))).json();
  expect(body.content.chapters).toHaveLength(2);expect(body.content.integratedResult.pillars[0].ganji).toBe('甲子');expect(body.content.accessToken).toBeUndefined();expect(external).not.toHaveBeenCalled();external.mockRestore();
});
test('keyset merge preserves date ties and never skips or duplicates later pages',async()=>{
  stores.neoOperationRoomConsultations=[seed('1','01'),seed('2','02'),seed('3','02')];
  stores.fusionFortuneConsultations=[seed('4','01'),seed('5','02'),seed('6','02')];
  let cursor=null;const ids=[];
  do {const query=new URLSearchParams({limit:'2'});if(cursor)query.set('cursor',cursor);const page=await library.listRecords(owner,query);ids.push(...page.items.map(item=>item.key));cursor=page.nextCursor;}while(cursor);
  expect(ids).toHaveLength(6);expect(new Set(ids).size).toBe(6);
});
test('a failed store keeps its cursor and can recover records after successful stores have finished',async()=>{
  stores.neoOperationRoomConsultations=[seed('1','01'),seed('2','02')];stores.fusionFortuneConsultations=[seed('3','03')];failures.add('fusionFortuneConsultations');
  const page=await library.listRecords(owner,new URLSearchParams());expect(page.items).toHaveLength(2);expect(page.failures[0].source).toBe('fusion');
  failures.clear();const retryPage=await library.listRecords(owner,new URLSearchParams({cursor:page.nextCursor}));expect(retryPage.items.map(item=>item.id)).toEqual(['record-3']);expect(retryPage.nextCursor).toBeNull();
});
test('all-store failure is 503, never an empty-success archive',async()=>{
  const {RECORD_SERVICES}=await import('../../lib/records/service-registry.js');const models=await import('../../worker/lib/models.js');
  for(const source of RECORD_SERVICES)failures.add(source.collection||models[source.model].collection.collectionName);
  const response=await route(request());expect(response.status).toBe(503);expect((await response.json()).ok).toBe(false);
});
test('search is literal and runs before pagination; filters span all pages',async()=>{
  stores.neoOperationRoomConsultations=[seed('1','01',{topic:'a.b'}),seed('2','02',{topic:'axb'})];
  const search=await library.listRecords(owner,new URLSearchParams({q:'a.b',limit:'1'}));expect(search.items.map(item=>item.id)).toEqual(['record-1']);
  const chats=await library.listRecords(owner,new URLSearchParams({group:'chat'}));expect(chats.items).toHaveLength(0);
});
test('old empty-id astrology records open by _id and preserve message ordering',async()=>{
  stores.astrologyAiConsultations=[seed('1','01',{id:'',messages:[{role:'user',content:'질문'},{role:'assistant',content:'답변'}]})];
  const response=await route(request('/detail?source=astrology&id=000000000000000000000001'));expect(response.status).toBe(200);
  const detail=await response.json();expect(detail.record.nativeHref).toBe('');expect(detail.content.messages.map(item=>item.role)).toEqual(['user','assistant']);
});
test('partial, generating, failed and revoked states never masquerade as completed',async()=>{
  const {recordService}=await import('../../lib/records/service-registry.js');const source=recordService('fusion');
  expect(library.recordStatus({status:'completed',stage:1},source)).toBe('partial');
  for(const status of ['generating','partial','generation_failed','refunded'])expect(library.recordMetadata(source,seed('1','01',{status})).nativeHref).toBe('');
  stores.neoOperationRoomConsultations=[seed('1','01')];revoked=true;expect((await route(request('/detail?source=neo&id=record-1'))).status).toBe(403);
});
test('foreign, malformed and search-mismatched cursors are rejected',async()=>{
  const page=await library.listRecords(owner,new URLSearchParams({limit:'1'}),async source=>source.id==='neo'?[seed('1','01'),seed('2','02')]:[]);
  await expect(library.listRecords(foreign,new URLSearchParams({cursor:page.nextCursor}))).rejects.toMatchObject({status:400});
  await expect(library.listRecords(owner,new URLSearchParams({cursor:'broken'}))).rejects.toMatchObject({status:400});
  await expect(library.listRecords(owner,new URLSearchParams({q:'changed',cursor:page.nextCursor}))).rejects.toMatchObject({status:400});
});
test('list projection never downloads complete reports or private birth fields',()=>{
  for(const field of ['messages','chapters','result','birthInfo','personA','personB','snapshot'])expect(library.RECORD_METADATA_PROJECTION[field]).toBeUndefined();
});
test('legacy Payment pricingSnapshot is visible once, with a canonical paid result taking precedence before paging',async()=>{
  stores.payments=[seed('1','01',{merchantUid:'fixture-payment',pricingSnapshot:{namingPrompt:{generatedResult:'이전 작명 결과'}}}),seed('3','01',{merchantUid:'older-payment',namingPrompt:{generatedResult:'오래된 작명 결과'}})];
  stores.paid_execution_records=[seed('2','02',{featureId:'premium-naming-prompt',paymentId:'fixture-payment',result:{namingPrompt:{generatedResult:'이전 작명 결과'}}})];
  const keys=[];let cursor;
  do {const page=await library.listRecords(owner,new URLSearchParams({limit:'1',...(cursor?{cursor}:{})}));keys.push(...page.items.map(item=>item.source));cursor=page.nextCursor;}while(cursor);
  expect(keys).toEqual(['paid-results','legacy-naming']);
  const response=await route(request('/detail?source=legacy-naming&id=000000000000000000000001'));
  expect((await response.json()).content.generatedResult).toBe('이전 작명 결과');
});
test('stored chat text questions search correctly and do not duplicate their paid delivery',async()=>{
  stores.fortuneChatSessions=[seed('1','01',{sessionId:'chat-fixture',messages:[{id:'ask',speaker:'user',text:'계획을 정리하고 싶어요'},{id:'paid-fixture:1',speaker:'assistant',text:'답변',detail:'전체 저장 답변'}]})];
  stores.serviceexecutiontransactions=[seed('2','02',{featureKey:'fortune-chat-consultation',executionKey:'execution-fixture',metadata:{paidNarrative:{body:{requestId:'paid-fixture'},parts:{answer:'{"coreReading":"전체 저장 답변"}'}}}})];
  const page=await library.listRecords(owner,new URLSearchParams({group:'chat'}));expect(page.items.map(item=>item.source)).toEqual(['chat']);
  const searched=await library.listRecords(owner,new URLSearchParams({q:'계획'}));expect(searched.items[0].question).toContain('계획');
  const detail=await library.readRecord(owner,'chat','chat-fixture');expect(detail.content.messages[1].detail).toBe('전체 저장 답변');
  user=foreign;const query=library.recordPageQuery({id:'chat'},foreign,library.decodeRecordCursor('',foreign,'all:'),'계획');expect(matches(stores.fortuneChatSessions[0],query)).toBe(false);
});
test('partial shared deliveries expose accepted parts and stored cards, without prompts',async()=>{
  stores.serviceexecutiontransactions=[seed('1','01',{featureKey:'tarot-prompt-maker',executionKey:'part-fixture',premiumStatus:'generating',metadata:{paidNarrative:{body:{question:'질문'},tasks:[{id:'one',title:'첫 장',prompt:'never expose'}],parts:{one:'저장된 첫 장'},input:{cards:[{cardId:'0',nameKo:'바보'}]}}}})];
  const detail=await library.readRecord(owner,'executions','part-fixture');expect(detail.content.chapters[0].body).toBe('저장된 첫 장');expect(detail.content.cards[0].nameKo).toBe('바보');expect(JSON.stringify(detail.content)).not.toContain('never expose');
  revoked=true;expect((await route(request('/detail?source=executions&id=part-fixture'))).status).toBe(403);
});
test('saved HTML preserves tables and removes script, handlers and unsafe URLs',async()=>{
  const {sanitizePublicInsightHtml}=await import('../../app/insights/_lib/sanitizePublicHtml.js');
  const safe=sanitizePublicInsightHtml('<table onclick="danger()"><tr><td>저장된 표</td></tr></table><script>danger()</script><a href="javascript:danger()">링크</a><img src="/fixture.webp" onerror="danger()">',{tables:true});
  expect(safe).toContain('<table>');expect(safe).toContain('<td>저장된 표</td>');expect(safe).not.toMatch(/script|onclick|onerror|javascript:/);
  expect(sanitizePublicInsightHtml('<table><tr><td>표</td></tr></table>')).toBe('표');
});
test('index maintenance plan is repeatable and never connected from a read route',async()=>{
  const {recordIndexPlan,ensureRecordIndexes}=await import('../../worker/lib/record-indexes.js');
  const plan=recordIndexPlan(),names=new Map();
  const db={collection:name=>({createIndex:async(keys,options)=>{const key=name+':'+options.name;expect(keys).toEqual({userId:1,createdAt:-1,_id:-1});names.set(key,keys);}})};
  await ensureRecordIndexes(db);await ensureRecordIndexes(db);expect(names.size).toBe(plan.length);
  expect(readFileSync(new URL('../../worker/routes/records.js',import.meta.url),'utf8')).not.toContain('ensureRecordIndexes');
});
test('new consultation snapshots remain read-only and partial chapter counts stay visible',async()=>{
  const source=(await import('../../lib/records/service-registry.js')).recordService('chat-consultation');
  expect(library.recordStatus({state:'COMPLETED',manifestCount:3,completedChapters:1},source)).toBe('partial');
  expect(library.recordStatus({state:'FORTUNE_FAILED'},source)).toBe('failed');
  expect(library.recordStatus({state:'PAID'},source)).toBe('generating');
});

test('shared Codex and life-book stores retain the actual billing variant and display identity',async()=>{
  const {recordService}=await import('../../lib/records/service-registry.js');
  expect(library.recordMetadata(recordService('codex'),{id:'compat',mode:'compat'}).serviceId).toBe('master-love-codex-compat');
  const legacy=library.recordMetadata(recordService('life-book'),{id:'legacy',llmMeta:{input:{consultationType:'lifeFortune'}},featureKey:'life-book-ai-consultation'});
  expect(legacy.serviceName).toBe('인생 총운');expect(legacy.serviceId).toBe('life-book-ai-consultation');
});

test('every shared product retains its display identity and complete saved body',async()=>{
  const { SAVED_FEATURES }=await import('../../lib/records/service-registry.js');
  for(const [featureId,feature] of Object.entries(SAVED_FEATURES)) {
    const chapters=Array.from({length:7},(_,index)=>({title:`저장된 장 ${index+1}`,body:`저장된 본문 ${index+1}`}));
    stores.paid_execution_records=[seed('1','01',{featureId,result:{report:{chapters}}})];
    const detail=await library.readRecord(owner,'paid-results','000000000000000000000001');
    expect(detail.record.serviceId).toBe(featureId);
    expect(detail.record.serviceName).toBe(feature.name);
    expect(detail.content.report.chapters).toEqual(chapters);
    expect(detail.content.report.chapters[6].body).toBe('저장된 본문 7');
  }
});
