import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),Module=require('node:module');
const root=path.resolve(import.meta.dirname,'../../..');
const bundle=await build({entryPoints:[path.join(root,'worker/toss/unlink-recovery.js')],bundle:true,platform:'node',format:'cjs',write:false,
 plugins:[{name:'offline',setup(b){
  b.onLoad({filter:/worker[\\/]lib[\\/]db\.js$/},()=>({contents:"export const withMongoRetry=()=>{throw new Error('unexpected DB')};"}));
  b.onLoad({filter:/worker[\\/]toss[\\/]models\.js$/},()=>({contents:'export const TossIdentity={};'}));
 }}]});
const loaded=new Module(path.join(root,'toss-unlink-check.cjs'));loaded.paths=Module._nodeModulePaths(root);loaded._compile(bundle.outputFiles[0].text,loaded.id);
const {processPendingUnlinks,runTossUnlinkRecovery}=loaded.exports;
test('disabled release never reaches database or partner unlink',async()=>assert.deepEqual(await runTossUnlinkRecovery({}),{skipped:true}));
test('remote failure keeps revoked identity pending and schedules bounded retry',async()=>{
 const row={_id:'mock',unlinkAttempts:2};let claimed=false,deferred;
 const store={claim:async()=>claimed?null:(claimed=true,row),complete:async()=>assert.fail(),defer:async(r,at)=>{assert.equal(r,row);deferred=at;}};
 const now=new Date('2026-10-08T00:00:00Z');
 assert.deepEqual(await processPendingUnlinks({store,now,remove:async()=>{throw Error('offline');}}),{completed:0,deferred:1,supportRequired:0});
 assert.equal(deferred.toISOString(),'2026-10-08T00:20:00.000Z');
});
test('last allowed failure requires support; successful unlink acknowledges once',async()=>{
 const rows=[{_id:'failed',unlinkAttempts:6},{_id:'success',unlinkAttempts:1}];const completed=[],deferred=[];
 const store={claim:async()=>rows.shift(),complete:async row=>completed.push(row._id),defer:async row=>deferred.push(row._id)};
 assert.deepEqual(await processPendingUnlinks({store,remove:async row=>{if(row._id==='failed')throw Error('offline');}}),{completed:1,deferred:0,supportRequired:1});
 assert.deepEqual(completed,['success']);assert.deepEqual(deferred,['failed']);
});
