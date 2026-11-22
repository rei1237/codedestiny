import '../../../scripts/lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {privateHat} from '../private-simulation/sorting-hat.mjs';
const profile={profileId:'mine',gender:'F',birth:{year:1990,month:1,day:1,calType:'solar',timeUnknown:true},location:{tz:'Asia/Seoul',lat:37.5665,lng:126.978}};
test('the two captured birth inputs preserve original hat evidence and reject unsupported or unowned profiles',async()=>{
 const read=async profiles=>privateHat(profiles,{profileId:'mine'});
 const reference=(await (await read([profile])).json()).result;
 assert.equal(reference.mode,'reference');assert.equal(reference.usedCount,1);
 assert.deepEqual(reference.systems.filter(row=>row.status==='used').map(row=>row.id),['saju']);
 const full=(await (await read([{...profile,birth:{...profile.birth,timeUnknown:false,hour:8,minute:35}}])).json()).result;
 assert.equal(full.mode,'complete');assert.equal(full.usedCount,6);
 assert.ok(full.systems.every(row=>row.evidence.length>0));
 assert.equal((await read([])).status,404);
 assert.equal((await read([{...profile,birth:{...profile.birth,year:1991}}])).status,422);
 assert.equal((await read([{...profile,location:null}])).status,422);
 assert.equal(privateHat([profile],{userId:'mine'}).status,400);
});
