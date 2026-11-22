import {jest} from '@jest/globals';
const id='c'.repeat(64),owner='507f1f77bcf86cd799439011';
let row;const calls=[];
// Applies the heartbeat's own filter to one stored row, so the test checks the throttle the database would enforce.
const updateOne=jest.fn(async(filter,update,options)=>{
 calls.push({filter,update,options});
 const viewed=row.lastViewedAt;
 const open=filter.$or.some(q=>q.lastViewedAt===null?viewed==null:viewed<q.lastViewedAt.$lt);
 if(filter._id!==row._id||String(filter.userId)!==String(row.userId)||!open)return {modifiedCount:0};
 row={...row,...update.$set};return {modifiedCount:1};
});
jest.unstable_mockModule('../../worker/yeongnyangi/repository.js',()=>({YeongnyangiRequest:{updateOne},ownerId:value=>value}));
let touchViewed,VIEW_HEARTBEAT_MS;
beforeAll(async()=>{({touchViewed,VIEW_HEARTBEAT_MS}=await import('../../worker/yeongnyangi/view-heartbeat.js'));});
beforeEach(()=>{row={_id:id,userId:owner,lastViewedAt:null};calls.length=0;updateOne.mockClear();});

test('heartbeat writes at most once per 20 seconds and never touches updatedAt',async()=>{
 const t0=new Date('2026-11-23T03:00:00.000Z');
 expect(VIEW_HEARTBEAT_MS).toBe(20000);
 expect(await touchViewed({},owner,id,t0)).toBe(true);
 expect(row.lastViewedAt).toEqual(t0);
 expect(await touchViewed({},owner,id,new Date(t0.getTime()+5000))).toBe(false);
 expect(await touchViewed({},owner,id,new Date(t0.getTime()+19999))).toBe(false);
 expect(row.lastViewedAt).toEqual(t0);
 const later=new Date(t0.getTime()+20001);
 expect(await touchViewed({},owner,id,later)).toBe(true);
 expect(row.lastViewedAt).toEqual(later);
 for(const call of calls){expect(call.options).toEqual({timestamps:false});expect(Object.keys(call.update)).toEqual(['$set']);}
});

test('another owner cannot mark the row as watched',async()=>{
 expect(await touchViewed({},'507f1f77bcf86cd799439022',id,new Date())).toBe(false);
 expect(row.lastViewedAt).toBeNull();
});

test('a failed heartbeat write resolves false instead of failing the read',async()=>{
 updateOne.mockRejectedValueOnce(new Error('db down'));
 await expect(touchViewed({},owner,id,new Date())).resolves.toBe(false);
});
