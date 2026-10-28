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
test('a durable Pro 404 uses Flash on the next attempt with no hidden retry or Pro override',async()=>{
 const original=globalThis.fetch,calls=[];
 globalThis.fetch=async(url)=>{
  const target=String(url);if(target.includes(':countTokens'))return Response.json({totalTokens:500});assert(target.includes(':generateContent'));
  calls.push(target.includes('/gemini-2.5-pro:')?'pro':'flash');
  return calls.length===1?Response.json({error:{message:'model not found'}},{status:404}):Response.json({candidates:[{content:{parts:[{text:'{"summary":"준비 조건을 확인해요."}'}]},finishReason:'STOP'}]});
 };
 const snapshot={tunaQualityPolicy:m.TUNA_QUALITY_POLICY},chapter={layoutRole:'synthesis',key:'compare'};
 const request={system:'계산 근거만 사용한다.',domainRules:'{}',calculatedData:{},sectionTitles:[],outputSchema:{summary:''},userData:{},userQuestion:'선택의 조건은?',locale:'ko',maxOutputTokens:8192};
 const env={GEMINIF_API_KEY:'mock-only',LLM_DRY_RUN:'false'};
 try{
  const first=new m.CodeDestinyProvider(env,{}, {},5000,m.tunaChapterModel(env,snapshot,chapter),m.tunaReasoningTask(snapshot,chapter));
  await assert.rejects(first.generate(request),e=>e.code==='FORTUNE_PROVIDER_FAILED');assert.equal(calls.length,1);
  const row={state:'FORTUNE_FAILED',recoveryAudit:[{code:'FORTUNE_PROVIDER_FAILED',receipt:first.receipt}]};
  assert.equal(m.tunaProUnavailable(row),true);
  const unavailable=m.tunaProUnavailable(row),model=m.tunaChapterModel(env,snapshot,chapter,unavailable),task=m.tunaReasoningTask(snapshot,chapter,unavailable);
  assert.equal(selectGeminiModel(model,task),'gemini-2.5-flash');
  const recovered=new m.CodeDestinyProvider(env,{}, {},5000,model,task);
  assert.equal((await recovered.generate(request)).model,'gemini-2.5-flash');assert.deepEqual(calls,['pro','flash']);
  for(const status of [401,403,429,503])assert.equal(m.tunaProUnavailable({...row,recoveryAudit:[{...row.recoveryAudit[0],receipt:{...first.receipt,status}}]}),false);
  assert.equal(m.tunaProUnavailable({...row,state:'REFUNDED'}),false);
 }finally{globalThis.fetch=original;}
});
