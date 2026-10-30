import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
import {selectGeminiModel} from '../../lib/gemini-model-policy.js';
const bundle=await build({stdin:{contents:`export {tunaChapterModel,tunaReasoningTask,tunaProUnavailable,TUNA_QUALITY_POLICY} from './worker/yeongnyangi/fortune/tuna-quality';export {CodeDestinyProvider} from './worker/yeongnyangi/providers/code-destiny';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false});
const Module=createRequire(import.meta.url)('node:module'),filename=path.resolve('model-recovery-test.cjs'),mod=new Module(filename);
mod.filename=filename;mod.paths=Module._nodeModulePaths(process.cwd());mod._compile(bundle.outputFiles[0].text,filename);const m=mod.exports;
const snapshot={tunaQualityPolicy:m.TUNA_QUALITY_POLICY},chapter={layoutRole:'synthesis',key:'compare'};
const request={system:'계산 근거만 사용한다.',domainRules:'{}',calculatedData:{},sectionTitles:[],outputSchema:{summary:''},userData:{},userQuestion:'선택의 조건은?',locale:'ko',maxOutputTokens:8192};
const env={GEMINIF_API_KEY:'mock-only',LLM_DRY_RUN:'false'};
// Pro answers with the given status; Flash always writes the chapter.
async function withProvider(status,run){
 const original=globalThis.fetch,calls=[];
 globalThis.fetch=async(url)=>{
  const target=String(url);if(target.includes(':countTokens'))return Response.json({totalTokens:500});assert(target.includes(':generateContent'));
  const pro=target.includes('/gemini-2.5-pro:');calls.push(pro?'pro':'flash');
  return pro?Response.json({error:{message:'refused'}},{status}):Response.json({candidates:[{content:{parts:[{text:'{"summary":"준비 조건을 확인해요."}'}]},finishReason:'STOP'}]});
 };
 try{await run(calls);}finally{globalThis.fetch=original;}
}
const synthesis=timeoutMs=>new m.CodeDestinyProvider(env,{}, {},timeoutMs,m.tunaChapterModel(env,snapshot,chapter),m.tunaReasoningTask(snapshot,chapter));
test('a durable Pro 404 uses Flash on the next attempt with no hidden retry or Pro override',()=>withProvider(404,async calls=>{
 // Too little of the attempt is left for Flash, so the attempt fails with a Pro receipt.
 const first=synthesis(5000);
 await assert.rejects(first.generate(request),e=>e.code==='FORTUNE_PROVIDER_FAILED');assert.deepEqual(calls,['pro']);
 const row={state:'FORTUNE_FAILED',recoveryAudit:[{code:'FORTUNE_PROVIDER_FAILED',receipt:first.receipt}]};
 const unavailable=m.tunaProUnavailable(row),model=m.tunaChapterModel(env,snapshot,chapter,unavailable),task=m.tunaReasoningTask(snapshot,chapter,unavailable);
 assert.equal(unavailable,true);assert.equal(selectGeminiModel(model,task),'gemini-2.5-flash');
 const recovered=new m.CodeDestinyProvider(env,{}, {},5000,model,task);
 assert.equal((await recovered.generate(request)).model,'gemini-2.5-flash');assert.deepEqual(calls,['pro','flash']);
 const receipt=(code,fields)=>({...row,recoveryAudit:[{code,receipt:{...first.receipt,...fields}}]});
 for(const status of [429,500,503])assert.equal(m.tunaProUnavailable(receipt('FORTUNE_PROVIDER_FAILED',{status})),true);
 for(const status of [400,401,403])assert.equal(m.tunaProUnavailable(receipt('FORTUNE_PROVIDER_FAILED',{status})),false);
 assert.equal(m.tunaProUnavailable(receipt('FORTUNE_PROVIDER_TIMEOUT',{status:null})),true);
 assert.equal(m.tunaProUnavailable(receipt('FORTUNE_PROVIDER_TIMEOUT',{status:null,model:'gemini-2.5-flash'})),false);
 assert.equal(m.tunaProUnavailable(receipt('CHAPTER_TRUNCATED',{status:null,model:'gemini-2.5-flash',modelFallback:'GEMINI_RATE_LIMITED'})),true);
 assert.equal(m.tunaProUnavailable({...row,state:'REFUNDED'}),false);
}));
test('a Pro refusal is answered by Flash inside the same attempt',async()=>{
 for(const status of [404,429,503])await withProvider(status,async calls=>{
  const provider=synthesis(240000);
  assert.equal((await provider.generate(request)).model,'gemini-2.5-flash');assert.deepEqual(calls,['pro','flash']);
  assert.equal(provider.receipt.model,'gemini-2.5-flash');assert.ok(provider.receipt.modelFallback);
 });
 // An access error is a configuration fault, not Pro unavailability: no second call.
 await withProvider(403,async calls=>{await assert.rejects(synthesis(240000).generate(request),e=>e.code==='FORTUNE_PROVIDER_FAILED');assert.deepEqual(calls,['pro']);});
});
