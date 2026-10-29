import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),Module=require('node:module');
const root=path.resolve(import.meta.dirname,'../../..'),calls=[];
globalThis.__tossUnlinkTest={pending:true,calls,failRemote:true};
const stubs={
 'worker/lib/db.js':`export const connectDb=async()=>{};export const mongoTransactionOptions=()=>({});export const mongoose={startSession:async()=>({withTransaction:async task=>task(),endSession:async()=>{}}),Types:{ObjectId:class {}}};`,
 'worker/lib/db-scope-connection.js':`export const scopeConnection=()=>null;`,
 'worker/toss/partner.js':`export const loginIdentity=async()=>({userKey:'123',referrer:'SANDBOX'});export const unlinkIdentity=async()=>{globalThis.__tossUnlinkTest.calls.push(['remote']);if(globalThis.__tossUnlinkTest.failRemote)throw Error('offline');};`,
 'worker/toss/models.js':`const state=globalThis.__tossUnlinkTest;export const TossIdentity={findById:()=>({session:()=>({lean:async()=>({unlinkPending:state.pending})})}),findOneAndUpdate:()=>{throw Error('unexpected reactivation');},updateOne:async(...args)=>{state.calls.push(['identity',...args]);}};export const TossSession={deleteMany:async(...args)=>state.calls.push(['sessions',...args]),create:async()=>{throw Error('unexpected session creation');}};`,
};
const bundle=await build({entryPoints:[path.join(root,'worker/toss/session.js')],bundle:true,platform:'node',format:'cjs',write:false,plugins:[{name:'offline',setup(b){b.onLoad({filter:/\.js$/},args=>{const text=stubs[path.relative(root,args.path).replaceAll('\\','/')];if(text)return {contents:text};});}}]});
const loaded=new Module(path.join(root,'toss-session-check.cjs'));loaded.paths=Module._nodeModulePaths(root);loaded._compile(bundle.outputFiles[0].text,loaded.id);
const {createTossSession,disconnectIdentity,invalidateIdentity}=loaded.exports;
const env={TOSS_IDENTITY_KEY:'x'.repeat(32),TOSS_DATA_KEY:Buffer.alloc(32,7).toString('base64')};
test('pending unlink cannot reactivate an account while a remote retry may still remove its grant',async()=>{
 await assert.rejects(createTossSession(env,{}),/TOSS_UNLINK_PENDING/);
});
test('own unlink revokes local sessions and durably schedules repair before remote call',async()=>{
 calls.length=0;
 assert.deepEqual(await disconnectIdentity(env,{_id:'identity',userKey:'123'}),{remoteUnlink:'pending'});
 assert.equal(calls[0][0],'identity');assert.equal(calls[0][2].$set.active,false);
 assert.equal(calls[1][2].$set.unlinkPending,true);
 assert.equal(calls[1][2].$set.unlinkAttempts,1);
 assert.equal(calls[2][0],'sessions');assert.equal(calls[3][0],'remote');
});
test('authenticated platform unlink callback cancels pending retry and deletes sessions',async()=>{
 calls.length=0;await invalidateIdentity(env,'identity');
 assert.equal(calls[1][2].$set.unlinkPending,false);assert.equal(calls[2][0],'sessions');
 assert.ok(!calls.some(call=>call[0]==='remote'));
});
