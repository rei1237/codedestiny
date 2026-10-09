import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
require('../../scripts/lib/mock-network-guard.cjs');
const {retentionIndexPlan,auditLibraryRetention}=await import('../../scripts/audit-library-retention.mjs');
const read=path=>readFile(new URL('../../'+path,import.meta.url),'utf8');

test('permanent split keeps Yeongnyangi and Ggulggul entry points distinct',async()=>{
 assert.match(await read('app/yeongnyangi/_original/FortuneHome.tsx'),/href="\/yeongnyangi\/library\/"/);
 assert.match(await read('js/core/shell-sheet.js'),/cdOpenLibrary = function \(\) \{ window.location.assign\('\/records\/'\)/);
 assert.match(await read('app/yeongnyangi/_lib/reading-copy.ts'),/library:'영냥이 보관함'/);
 assert.match(await read('lib/records/copy.ts'),/title: '꿀꿀 사주 보관함'/);
});
test('purchase-bearing stores and writers never set a deletion deadline',async()=>{
 const models=await import('../../worker/lib/models.js');
 const {ServiceExecutionTransaction,PaidExecutionRecord}=models;
 const {RECORD_SERVICES}=await import('../../lib/records/service-registry.js');
 const {YeongnyangiRequest}=await import('../../worker/lib/yeongnyangi-models.js');
 const ttl=ServiceExecutionTransaction.schema.indexes().filter(([,options])=>options.expireAfterSeconds!==undefined);
 assert.equal(ttl.length,1);assert.deepEqual(ttl[0][1].partialFilterExpression,{status:'awaiting_payment'});
 for(const model of [PaidExecutionRecord,YeongnyangiRequest])assert.equal(model.schema.indexes().filter(([,options])=>options.expireAfterSeconds!==undefined).length,0);
 for(const service of RECORD_SERVICES.filter(item=>item.model&&item.model!=='ServiceExecutionTransaction')){
  assert.ok(models[service.model]?.schema,service.id);
  assert.equal(models[service.model].schema.indexes().filter(([,options])=>options.expireAfterSeconds!==undefined).length,0,service.id);
 }
 for(const file of ['worker/lib/service-execution-task.js','worker/lib/celestial-delivery-store.js','worker/routes/fpti.js','worker/routes/sukuyo.js']){
  const source=await read(file);assert.match(source,/retentionUntil:\s*null/,file);assert.doesNotMatch(source,/retentionUntil:\s*new Date|toRetentionUntil\(/,file);
 }
 assert.match(await read('worker/lib/paid-narrative-intent.js'),/status: "awaiting_payment"/);
});
test('index repair plan is scoped and becomes empty after migration',()=>{
 const legacy={name:'retentionUntil_1',key:{retentionUntil:1},expireAfterSeconds:0};
 const other={name:'cache',key:{expiresAt:1},expireAfterSeconds:0};
 const plan=retentionIndexPlan([legacy,other]);assert.deepEqual(plan.drop,[{...legacy,partialFilterExpression:null}]);
 assert.equal(plan.create.partialFilterExpression.status,'awaiting_payment');
 assert.deepEqual(retentionIndexPlan([plan.create,other]),{create:null,drop:[]});
});
test('audit lists existing targets without touching content, accounts, or indexes',async()=>{
 const indexes=[{name:'retentionUntil_1',key:{retentionUntil:1},expireAfterSeconds:0}];
 const db={collection:name=>({listIndexes:()=>({toArray:async()=>name==='serviceexecutiontransactions'?indexes:[]}),countDocuments:async()=>2,find:(query,options)=>{
  assert.deepEqual(query,{retentionUntil:{$type:'date'},status:{$ne:'awaiting_payment'}});assert.equal(options.projection.metadata,undefined);
  return {toArray:async()=>[{_id:'saved',userId:'private-owner',featureKey:'old-product',status:'success',premiumStatus:'completed',retentionUntil:new Date('2020-01-01')}]};
 }})};
 const plan=await auditLibraryRetention(db);assert.equal(plan.readOnly,true);assert.equal(plan.atRisk,1);assert.equal(plan.alreadyPastDeadline,1);
 assert.equal(plan.targets[0].id,'saved');assert.doesNotMatch(JSON.stringify(plan),/private-owner/);
});
