import {build} from 'esbuild';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {createHash} from 'node:crypto';
export const benchmarkHash=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
export async function buildBenchmarkRuntime(root=process.cwd()){
 const bundle=await build({stdin:{contents:`
 export {StructuredChapterProvider} from './worker/yeongnyangi/providers/chapter';
 export {CodeDestinyProvider} from './worker/yeongnyangi/providers/code-destiny';
 export {assertSajuPillarClaims} from './worker/lib/saju-correction.js';
 export {deliverChapter} from './worker/yeongnyangi/providers/delivery';
 export {analyzeAsk,ruleAnalysis} from './worker/yeongnyangi/fortune/ask/analysis';
 export {MockChapterProvider} from './__tests__/fixtures/yeongnyangi-chapter';
 `,resolveDir:root,loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,
 });
 const Module=createRequire(import.meta.url)('node:module'),filename=path.join(root,'mackerel-benchmark-runtime.cjs');
 const loaded=new Module(filename);loaded.filename=filename;loaded.paths=Module._nodeModulePaths(root);loaded._compile(bundle.outputFiles[0].text,filename);
 return {runtime:loaded.exports,sha256:benchmarkHash(bundle.outputFiles[0].text)};
}
export function benchmarkExecutorSourceHash(root=process.cwd()){
 const files=['scripts/yeongnyangi-mackerel-benchmark.mjs','scripts/lib/yeongnyangi-benchmark-budget.mjs','scripts/lib/yeongnyangi-benchmark-runtime.mjs'];
 return benchmarkHash(files.map(file=>({file,sha256:benchmarkHash(fs.readFileSync(path.join(root,file)))})));
}

const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});promise.catch(()=>{});return {promise,resolve,reject};};
// Run the production provider once, pausing its actual fetch boundaries. No
// handwritten request serialization: locale/schema/defaults and clipped-text
// recovery all remain inside worker/lib/gemini.js and lib/llm-client.ts.
export async function runProductionBenchmarkCall({budget,id,outputTokens,invoke,exchange,setFetchHandler,saveRequest,saveResponse}){
 const seenCount=deferred(),replyCount=deferred(),seenGeneration=deferred(),replyGeneration=deferred();
 let counts=0,generations=0,result,production;
 const observe=async(url,options)=>{
  const target=new URL(String(url));
  assert.equal(target.origin,'https://generativelanguage.googleapis.com');
  assert.equal(options?.method,'POST');
  assert.ok(target.searchParams.get('key'),'Production Gemini key transport required');
  assert.ok([...target.searchParams.keys()].every(key=>key==='key'),'Unexpected query option');
  const endpoint='/v1beta/models/gemini-2.5-flash:';
  if(target.pathname===endpoint+'countTokens'){
   assert.equal(counts++,0,'Tokenizer retry forbidden');seenCount.resolve({url,options});return replyCount.promise;
  }
  assert.equal(target.pathname,endpoint+'generateContent','Unapproved provider/model/endpoint');
  assert.equal(generations++,0,'Provider retry forbidden');seenGeneration.resolve({url,options});return replyGeneration.promise;
 };
 setFetchHandler(observe);
 try{
  production=Promise.resolve().then(invoke);production.catch(()=>{});
  const noFetch=()=>production.then(()=>{throw new Error('Production provider returned without the required boundary');});
  // Capturing the request performs no external I/O. Reservation occurs before
  // the paused tokenizer request is forwarded by exchange().
  const count=await Promise.race([seenCount.promise,noFetch()]);
  const countedBody=JSON.parse(count.options.body).generateContentRequest;
  assert.equal(countedBody.model,'models/gemini-2.5-flash');
  const {model,...generationBody}=countedBody;
  assert.equal(generationBody.generationConfig.maxOutputTokens,outputTokens);
  assert.equal(generationBody.cachedContent,undefined,'Context caching is outside approval');
  const expectedBytes=JSON.stringify(generationBody),requestHash=benchmarkHash(expectedBytes);
  await budget.run({id,outputTokens,requestHash,
   countTokens:async()=>{
    await saveRequest(expectedBytes);
    const response=await exchange('countTokens',count.url,count.options);
    const data=await response.clone().json();assert.ok(response.ok,'Tokenizer HTTP failure');
    replyCount.resolve(response);return Number(data.totalTokens);
   },
   generate:async()=>{
    const generated=await Promise.race([seenGeneration.promise,noFetch()]);
    assert.equal(generated.options.body,expectedBytes,'Tokenized and generated production request bytes differ');
    const response=await exchange('generateContent',generated.url,generated.options);
    const raw=await response.clone().json();await saveResponse(raw);
    replyGeneration.resolve(response);
    result=await production;
    return raw;
   }});
  return result;
 }finally{
  const stopped=new Error('Benchmark boundary closed; reservation stays consumed');
  replyCount.reject(stopped);replyGeneration.reject(stopped);
  if(production)await production.catch(()=>{});
  setFetchHandler(undefined);
 }
}
