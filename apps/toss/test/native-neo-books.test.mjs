import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),Module=require('node:module');
const root=path.resolve(import.meta.dirname,'../../..');
const id='nsb_'+'a'.repeat(40);
const doc={id:'original-session',userId:'native-owner',status:'completed',initialBriefing:{original:'저장본'}};
const book={_id:id,id,userId:doc.userId,sessionIds:[doc.id],chapters:[{sessionId:doc.id,originalUrl:'/records/view/?source=neo&id=original-session',text:'저장된 전략'}]};
const state={revoked:false,checks:0,books:{findOne:async query=>query.userId===doc.userId?book:null}};
globalThis.__nativeNeoBooks=state;
const stubs={
  'worker/lib/auth.js':"export const getOptionalUserFromRequest=()=>{throw Error('WEB_AUTH_FORBIDDEN');};",
  'worker/lib/db.js':"export const connectDb=async()=>{};export const mongoose={connection:{db:{collection:()=>globalThis.__nativeNeoBooks.books}}};export const mongoTransactionOptions=()=>({});",
  'worker/lib/db-scope-connection.js':'export const scopeConnection=()=>null;',
  'worker/lib/models.js':`export const NeoOperationRoomConsultation={findOne:q=>({lean:async()=>q.userId==='native-owner'?${JSON.stringify(doc)}:null})};`,
  'worker/lib/paid-result-revocation.js':"export const isStoredPaidResultRevoked=()=>{throw Error('WEB_PAYMENT_FORBIDDEN');};",
};
const bundled=await build({stdin:{contents:"export {handleNeoStrategyBooks} from './worker/routes/neo-strategy-books.js';export {bindNativeTossRequest} from './worker/toss/native-context.js';",resolveDir:root},bundle:true,platform:'node',format:'cjs',write:false,
  plugins:[{name:'native-book-boundary',setup(b){b.onLoad({filter:/\.js$/},args=>{const contents=stubs[path.relative(root,args.path).replaceAll('\\','/')];if(contents)return {contents,loader:'js'};});}}]});
const loaded=new Module(path.join(root,'native-neo-books.cjs'));loaded.paths=Module._nodeModulePaths(root);loaded._compile(bundled.outputFiles[0].text,loaded.id);
const {handleNeoStrategyBooks,bindNativeTossRequest}=loaded.exports;
function read(owner='native-owner'){
  const request=new Request('https://mock.invalid/api/neo-operation-room/strategy-books/'+id);
  bindNativeTossRequest(request,{auth:{userId:owner},assertStored:async saved=>{
    state.checks++;assert.equal(saved.userId,owner);
    if(state.revoked)throw Object.assign(new Error('ORDER_REFUNDED'),{code:'ORDER_REFUNDED',status:409});
  }});
  return handleNeoStrategyBooks(request,{},'/strategy-books/'+id,()=>{});
}
test('native strategy book rereads require every original result proof and link to the original native reader',async()=>{
  const result=await read();assert.equal(result.status,200);
  const data=await result.json();assert.equal(data.book.chapters[0].text,'저장된 전략');
  assert.equal(data.book.chapters[0].originalUrl,'/neo-operation-room/result/?attemptId=original-session');
  assert.equal(data.book.userId,undefined);assert.equal(book.chapters[0].originalUrl,'/records/view/?source=neo&id=original-session');
  assert.equal((await read('another-owner')).status,404);
  state.revoked=true;const denied=await read();assert.equal(denied.status,409);assert.equal((await denied.json()).reason,'ORDER_REFUNDED');
  assert.equal(state.checks,2);
});
