import { jest } from '@jest/globals';
const update=jest.fn(async()=>({modifiedCount:1}));
const rows=[{_id:'execution',executionKey:'paid-narrative:opaque',featureKey:'geomancy',timeoutAt:new Date(0),
  metadata:{paidNarrative:{tasks:[{id:'a'},{id:'b'}],parts:{a:'private result'},body:{question:'private question'}}}}];
const chain={sort(){return this;},limit(){return this;},select(){return this;},lean:async()=>rows};
jest.unstable_mockModule('../../worker/lib/db.js',()=>({connectDb:async()=>{},withMongoRetry:async(_env,fn)=>fn()}));
jest.unstable_mockModule('../../worker/lib/models.js',()=>({ServiceExecutionTransaction:{find:()=>chain,updateOne:update}}));
let monitorPaidNarratives,stalledNarrativeFilter;
beforeAll(async()=>{({monitorPaidNarratives,stalledNarrativeFilter}=await import('../../worker/lib/paid-narrative-monitor.js'));});
beforeEach(()=>update.mockClear());
test('selection excludes completed records and active leases',()=>{
 const now=new Date();expect(stalledNarrativeFilter(now)).toMatchObject({status:'pending',timeoutAt:{$lte:now},
  $or:[{'lock.until':null},{'lock.until':{$lte:now}}]});
});
test('unconfigured or failed alerts remain eligible for a later cron',async()=>{
 const notify=jest.fn(async()=>({results:[{ok:true,skipped:true},{ok:false}]}));
 expect(await monitorPaidNarratives({}, {notify})).toEqual({scanned:1,alerted:0});
 expect(update).not.toHaveBeenCalled();
});
test('accepted notification marks only the same overdue record and contains no consultation text',async()=>{
 const notify=jest.fn(async()=>({results:[{ok:true}]}));
 expect(await monitorPaidNarratives({}, {notify})).toEqual({scanned:1,alerted:1});
 expect(JSON.stringify(notify.mock.calls)).not.toContain('private');
 expect(update.mock.calls[0][0]).toMatchObject({_id:'execution',status:'pending',timeoutAt:new Date(0)});
 expect(update.mock.calls[0][1].$set).not.toHaveProperty('status');
});
