import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {transform,build} from 'esbuild';
import {createPreviewApi} from '../canonical/preview-api.mjs';
import canonicalPreview from '../canonical/vite-preview.mjs';

test('canonical preview preserves Request bodies and never forwards account credentials or external calls',async()=>{
 const source=await readFile(new URL('../canonical/transport.js',import.meta.url),'utf8');
 const {code}=await transform(source,{format:'esm',define:{'import.meta.env.DEV':'true'}});
 const calls=[];const before={window:globalThis.window,location:globalThis.location};
 globalThis.location={href:'http://127.0.0.1:4317/',origin:'http://127.0.0.1:4317'};
 globalThis.window={fetch:async(...args)=>{calls.push(args);return new Response('{}');}};
 try{
  const {installPreviewTransport}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));installPreviewTransport();
  await window.fetch(new Request('http://127.0.0.1:4317/api/yeongnyangi/requests',{method:'POST',headers:{Authorization:'Bearer example-test-only','Content-Type':'application/json'},body:'{"question":"sample"}'}));
  assert.equal(calls[0][0],'/__canonical_api/api/yeongnyangi/requests');
  assert.equal(calls[0][1].method,'POST');assert.equal(calls[0][1].body,'{"question":"sample"}');
  assert.equal(calls[0][1].headers.has('Authorization'),false);assert.equal(calls[0][1].credentials,'omit');
  await assert.rejects(()=>window.fetch('https://example.invalid/provider'),/local only/);assert.equal(calls.length,1);
 }finally{globalThis.window=before.window;globalThis.location=before.location;}
});

test('fixture routes are development-only; preparation and follow-up retries reuse saved samples',async()=>{
 assert.equal(canonicalPreview().apply,'serve');
 const compiled=await build({stdin:{contents:"export {products} from './worker/yeongnyangi/payments/catalog'; export {questionDecision,questionManifest,FOLLOWUP_LIMITS,QUESTION_POLICY_VERSION} from './worker/yeongnyangi/fortune/ask/question-policy';",resolveDir:fileURLToPath(new URL('../../../',import.meta.url)),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm'});
 const contract=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
 const api=createPreviewApi({ssrLoadModule:async()=>contract,config:{logger:{error:()=>{}}}},'');
 async function call(path,input,authorized=true){let status,body;const req={url:'/__canonical_api'+path,method:input===undefined?'GET':'POST',headers:authorized?{'x-cd-preview':'canonical'}:{},async *[Symbol.asyncIterator](){if(input!==undefined)yield JSON.stringify(input);}};const res={writableEnded:false,writeHead(value){status=value;},end(text){body=JSON.parse(text);this.writableEnded=true;}};await api(req,res);return {status,body};}
 assert.equal((await call('/api/auth/me',undefined,false)).status,403);
 assert.equal((await call('/api/billing/checkout',{})).status,501);
 const input={productId:'saju_salmon',profileId:'canonical-preview-profile',consultationAttemptId:'sample-attempt',question:'테스트 질문입니다. 어떤 선택을 하면 좋을까요?',questionDecision:{version:contract.QUESTION_POLICY_VERSION,category:'career',target:'self',horizon:'current',options:'두 회사 비교',constraints:'없음',period:'올해',confirmed:true}};
 const first=await call('/api/yeongnyangi/requests',input);assert.equal(first.status,200);assert.ok(first.body.fortune.manifest.length>0);
 const again=await call('/api/yeongnyangi/requests',input);assert.equal(first.body.fortune.id,again.body.fortune.id);
 assert.equal((await call('/api/yeongnyangi/requests',{...input,question:'다른 질문'})).status,409);
 const id=first.body.fortune.id,path='/api/yeongnyangi/requests/'+id;
 const reply=await call(path+'/conversation',{id:'follow-up-1',question:'다음 행동은 무엇인가요?'});assert.equal(reply.body.fortune.conversation.used,1);
 const retry=await call(path+'/conversation',{id:'follow-up-1',question:'다음 행동은 무엇인가요?'});assert.equal(retry.body.fortune.conversation.used,1);
 assert.equal((await call(path)).body.fortune.chapters.length,first.body.fortune.chapters.length);
 assert.equal((await call('/api/yeongnyangi/requests')).body.fortunes.length,1);
 const tea=await call('/api/fortune-tea-house/consult',{attemptId:'tea-sample',question:'화면 검증용 질문',draftResult:{consultationMode:'tarot'}});
 assert.equal(tea.status,200);
 const followPath='/api/fortune-tea-house/results/tea-sample/follow-up';
 const follow={clientQuestionId:'tea-follow-1',question:'같은 카드를 다시 읽을 수 있나요?'};
 assert.equal((await call(followPath,follow)).body.followUpAllowance.remaining,0);
 assert.equal((await call(followPath,follow)).body.alreadyApplied,true);
 assert.equal((await call(followPath,{...follow,clientQuestionId:'tea-follow-2'})).status,409);
 assert.equal((await call('/api/fortune-tea-house/results/tea-sample')).body.result.followUps.length,1);
 assert.equal((await call('/api/records')).body.items[0].source,'tea');
 assert.equal((await call('/api/records')).body.items.length,1,'cat records stay in the cat library');
});
