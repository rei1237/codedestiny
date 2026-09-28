/** @jest-environment node */
import { jest } from '@jest/globals';
let consultationRecoveryFilter, runConsultationRecovery;
beforeAll(async()=>{
 const db = await import('../../worker/lib/db.js');
 jest.unstable_mockModule('../../worker/lib/db.js',()=>({...db,connectDb:async()=>{},withMongoRetry:async(_env,work)=>work()}));
 ({ consultationRecoveryFilter, runConsultationRecovery } = await import('../../worker/lib/consultation-recovery-task.js'));
});
import { getAmbientAiLocale } from '../../worker/lib/ai-locale-context.js';
const now = Date.now();
test('recovery scans only recent idle pending records through an indexed id range', () => {
 const filter = consultationRecoveryFilter(now, { serviceType: 'stored-product' });
 expect(filter.status.$in).toEqual(['generating','partial','delivery_pending']);
 expect(filter.updatedAt.$lt.getTime()).toBe(now-300000);
 expect(filter._id.$gte.getTimestamp().getTime()).toBeLessThan(now);
 expect(filter.serviceType).toBe('stored-product');
});
test('server continuation uses persisted identities and locale without credentials or new attempts', async () => {
 const doc={id:'saved-report',userId:'original-owner',locale:'ja'}, filters=[], limits=[];
 const find=jest.fn(filter=>{filters.push(filter);return {sort(){return this},limit(n){limits.push(n);return this},select(){return this},lean:async()=>[doc]}});
 const resume=jest.fn(async(_env,stored)=>{expect(stored).toBe(doc);expect(getAmbientAiLocale()).toBe('ja');return new Response('{}',{status:202})});
 const result=await runConsultationRecovery({}, {now,connectDb:async()=>{},adapters:[['test','Test',{}]],models:{Test:{find}},loadAdapter:async()=>({resumeConsultationOnServer:resume})});
 expect(result.outcomes).toEqual([{service:'test',status:202}]);expect(limits).toEqual([1]);expect(resume).toHaveBeenCalledTimes(1);expect(doc).toEqual({id:'saved-report',userId:'original-owner',locale:'ja'});
});
test('one unavailable adapter does not prevent another stored service from resuming', async () => {
 const model={find:()=>({sort(){return this},limit(){return this},select(){return this},lean:async()=>[{id:'saved',userId:'owner'}]})};
 const result=await runConsultationRecovery({}, {now,connectDb:async()=>{},adapters:[['bad','Test',{}],['good','Test',{}]],models:{Test:model},loadAdapter:async route=>({resumeConsultationOnServer:async()=>{if(route==='bad')throw new Error('private body');return new Response('{}')}})});
 expect(result.outcomes).toEqual(expect.arrayContaining([{service:'bad',code:'RECOVERY_PENDING'},{service:'good',status:200}]));expect(JSON.stringify(result)).not.toContain('private body');
});

test('an unchanged failed record is deferred with a timestamp compare-and-set', async () => {
 const doc={_id:'persisted',userId:'owner',updatedAt:new Date(now-600000)};
 const updateOne=jest.fn(async()=>({modifiedCount:1}));
 const model={updateOne,find:()=>({sort(){return this},limit(){return this},select(){return this},lean:async()=>[doc]})};
 await runConsultationRecovery({}, {now,connectDb:async()=>{},adapters:[['stalled','Test',{}]],models:{Test:model},loadAdapter:async()=>({resumeConsultationOnServer:async()=>{throw new Error('temporary')}})});
 expect(updateOne).toHaveBeenCalledWith({_id:doc._id,userId:doc.userId,updatedAt:doc.updatedAt},{$set:{updatedAt:new Date(now)}});
});
