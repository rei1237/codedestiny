import '../../scripts/lib/mock-network-guard.cjs';
import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';

// S9 support desk layer 2 (worker/yeongnyangi/support.ts). Mock LLM only — callGeminiText is replaced, no provider is reached.
const require=createRequire(import.meta.url),Module=require('node:module');
const me='507f1f77bcf86cd799439011',other='507f1f77bcf86cd799439099';
globalThis.__supportTest={};
const mocks={
 'worker/lib/db.js':`export const connectDb=async()=>{};export const withMongoRetry=async(e,f)=>f();`,
 'worker/lib/security/index.js':`export const enforceRateLimit=async args=>{const t=globalThis.__supportTest;t.caps.push(args);return t.rateLimit(args);};`,
 'worker/lib/gemini.js':`export const callGeminiText=async(env,prompt,options)=>{const t=globalThis.__supportTest;t.llm.push({prompt,options});return t.reply();};`,
 'worker/yeongnyangi/repository.js':`export const ownerId=x=>x;export const userCanRetry=()=>false;export const YeongnyangiRequest={find:filter=>{const t=globalThis.__supportTest;t.filters.push(filter);const q={select:()=>q,sort:()=>q,limit:()=>q,maxTimeMS:()=>q,lean:async()=>t.rows[filter.userId]||[]};return q;}};`,
 'worker/yeongnyangi/access-methods.js':`export const hasRequestAccess=row=>Boolean(row.paymentId);`,
};
const bundle=await build({stdin:{contents:"export * from './worker/yeongnyangi/support';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,
 plugins:[{name:'support-boundaries',setup(b){b.onLoad({filter:/worker[\\/]/},args=>{const key=Object.keys(mocks).find(k=>args.path.replaceAll('\\','/').endsWith(k));return key?{contents:mocks[key],loader:'ts'}:undefined;});}}]});
const loaded=new Module(path.resolve('yeongnyangi-support-test.cjs'));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(bundle.outputFiles[0].text,loaded.id);
const support=loaded.exports;

const OK_TEXT='결제한 사주 고등어 상담은 지금 쓰는 중이에요. 내 상담 화면에서 이어서 확인해 주세요.';
beforeEach(()=>{globalThis.__supportTest={caps:[],llm:[],filters:[],rateLimit:async()=>({ok:true,count:1}),reply:async()=>({ok:true,text:OK_TEXT,provider:'cloudflare'}),
 rows:{
  [me]:[{_id:'a'.repeat(64),productId:'saju_mackerel',state:'GENERATING',paymentId:'pay-1',createdAt:new Date('2026-11-27T01:00:00Z'),completedChapters:2,
   snapshot:{product:{name:'사주 고등어'},manifest:[{},{},{},{}],analysis:{birth:'1990-01-01'}},question:'내 고민 원문'}],
  [other]:[{_id:'b'.repeat(64),productId:'tarot_tuna',state:'FAILED',paymentId:'pay-2',createdAt:new Date('2026-11-26T01:00:00Z'),snapshot:{product:{name:'다른계정전용상품'}},question:'다른 계정 고민'}],
 }};});
const t=()=>globalThis.__supportTest;
const ask=(question,userId=me)=>support.handleSupportQuestion(new Request('https://code-destiny.com/api/yeongnyangi/support',{
 method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question})}),{},userId);
const ORDER_QUESTION='제 주문 상태 좀 봐 주세요';

test('an FAQ match answers from the shared FAQ without the LLM or the caps',async()=>{
 const res=await ask('가장 저렴한 상담은 얼마예요?'),body=await res.json();
 assert.equal(res.status,200);assert.equal(res.headers.get('Cache-Control'),'private, no-store');
 assert.equal(body.source,'faq');assert.match(body.answer,/고등어 상담이 [\d,]+원/);
 assert.equal(t().llm.length,0);assert.equal(t().caps.length,0);
});

test('a question outside 2..300 chars is a 400 and never reaches the LLM',async()=>{
 for(const q of ['a','가'.repeat(301)])assert.equal((await ask(q)).status,400);
 assert.equal(t().llm.length,0);
});

test("the LLM sees only the caller's own order summary: no other account, no birth data, no question text",async()=>{
 const res=await ask(ORDER_QUESTION),body=await res.json();
 assert.equal(res.status,200);assert.equal(body.source,'llm');assert.equal(body.answer,OK_TEXT);
 assert.deepEqual(t().filters.map(f=>[f.userId,f.persona]),[[me,null]]);
 const [{prompt,options}]=t().llm;
 assert.equal(options.primaryProvider,'cloudflare');assert.equal(options.tools,undefined);
 const sent=JSON.parse(prompt);
 assert.equal(sent.MY_ORDERS.length,1);assert.match(sent.MY_ORDERS[0].ref,/^[a-f0-9]{12}$/);
 assert.deepEqual({...sent.MY_ORDERS[0],ref:'x'},{ref:'x',product:'사주 고등어',state:'GENERATING',paid:true,completedChapters:2,totalChapters:4,canRetry:false,createdAt:'2026-11-27'});
 assert.equal(sent.KNOWLEDGE.service.name,'꿀꿀 운세');assert.ok(sent.KNOWLEDGE.faqs.length>=8);
 for(const leaked of ['다른계정전용상품','b'.repeat(64),'a'.repeat(64),'1990-01-01','내 고민 원문','다른 계정 고민'])assert.ok(!prompt.includes(leaked),leaked);
 assert.ok(!JSON.stringify(body).includes('다른계정전용상품'));
});

test('an exceeded cap returns 429 with the fallback text and no LLM call',async()=>{
 t().rateLimit=async({endpoint,limit})=>({ok:true,monitored:true,count:endpoint.endsWith('global-daily')?limit+1:1});
 const res=await ask(ORDER_QUESTION),body=await res.json();
 assert.equal(res.status,429);assert.match(res.headers.get('Retry-After'),/^\d+$/);assert.equal(res.headers.get('Cache-Control'),'private, no-store');
 assert.deepEqual({ok:body.ok,code:body.code,source:body.source,answer:body.answer,contactHref:body.contactHref},
  {ok:false,code:'SUPPORT_LIMIT_REACHED',source:'fallback',answer:support.SUPPORT_FALLBACK,contactHref:'/contact/'});
 assert.equal(t().llm.length,0);
});

test('a cap counter that cannot be read fails closed',async()=>{
 t().rateLimit=async()=>({ok:true});
 assert.equal((await ask(ORDER_QUESTION)).status,429);
 t().rateLimit=async()=>{throw new Error('db down');};
 assert.equal((await ask(ORDER_QUESTION)).status,429);
 assert.equal(t().llm.length,0);
});

test('an LLM failure, an empty or mock answer, or a throw falls back to the fixed text',async()=>{
 for(const outcome of [{ok:false,error:'LLM_PROVIDER_UNAVAILABLE'},{ok:true,text:'',provider:'gemini'},{ok:true,isMock:true,text:'mock'},'throw']){
  t().reply=async()=>{if(outcome==='throw')throw new Error('boom');return outcome;};
  const res=await ask(ORDER_QUESTION),body=await res.json();
  assert.equal(res.status,200);assert.equal(body.source,'fallback');assert.equal(body.answer,support.SUPPORT_FALLBACK);
 }
});

test('a long LLM answer is cut deterministically, not rejected',()=>{
 const out=support.clampSupportAnswer('## '+'결제한 상담은 내 상담에서 확인할 수 있어요. '.repeat(60));
 assert.ok(out.length<=support.SUPPORT_ANSWER_MAX);assert.ok(out.endsWith('요.'));assert.ok(!out.includes('#'));
});
