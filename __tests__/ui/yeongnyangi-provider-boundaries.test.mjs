import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const compiled=await build({stdin:{contents:"export {CodeDestinyProvider} from './worker/yeongnyangi/providers/code-destiny'; export {setResponse,getOptions,getPrompt} from 'mock-gemini.js';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,
 plugins:[{name:'mock-provider-transport',setup(b){b.onResolve({filter:/gemini\.js$/},()=>({path:'gemini',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'let response,options,payload; export function setResponse(value){response=value;} export function getOptions(){return options;} export function getPrompt(){return payload;} export async function callGeminiText(env,prompt,opts){options=opts;payload=prompt;return response;}'}));}}]});
const {CodeDestinyProvider,setResponse,getOptions,getPrompt}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const provider=new CodeDestinyProvider({GEMINIF_API_KEY:'fixture-not-used',LLM_DRY_RUN:'false'});
const request={system:'fixture',domainRules:'fixture',userQuestion:'fixture',calculatedData:{},outputSchema:{},sectionTitles:[]};
test('question analysis uses a short deterministic single provider call',async()=>{
 setResponse({ok:true,text:'{"questions":[]}'});
 assert.equal(await provider.analyzeQuestion('classify','data'),'{"questions":[]}');
 assert.equal(getOptions().temperature,0);assert.equal(getOptions().maxProviderAttempts,1);
 assert.equal(getOptions().fallbackToWorkersAI,false);assert.equal(getOptions().maxOutputTokens,1024);
 assert.equal(getOptions().thinkingBudget,0);
 setResponse({ok:true,text:'{}',truncated:true});await assert.rejects(provider.analyzeQuestion('classify','data'));
});
test('output truncation never becomes a completed chapter even with parseable JSON',async()=>{
 for(const flags of [{truncated:true},{finishReason:'MAX_TOKENS'}]){
  setResponse({ok:true,text:'{}',...flags});await assert.rejects(provider.generate(request),e=>e.code==='FORTUNE_OUTPUT_TRUNCATED');
 }
});
test('timeout and provider failure remain distinct recoverable errors',async()=>{
 setResponse({ok:false,error:'LLM_TIMEOUT'});await assert.rejects(provider.generate(request),e=>e.code==='FORTUNE_PROVIDER_TIMEOUT');
 setResponse({ok:false,error:'UNAVAILABLE'});await assert.rejects(provider.generate(request),e=>e.code==='FORTUNE_PROVIDER_FAILED');
});
test('mock output cannot be passed off as a paid provider response',async()=>{
 setResponse({ok:true,text:'{}',isMock:true});await assert.rejects(provider.generate(request),e=>e.code==='FORTUNE_PROVIDER_FAILED');
 setResponse({ok:true,text:'{}',provider:'fixture',model:'fixture'});assert.equal((await provider.generate(request)).result,'{}');
});

test('provider enforces citation enums in Gemini structured output',async()=>{
 setResponse({ok:true,text:'{}',provider:'gemini'});
 await provider.generate({...request,outputSchema:{type:'object',additionalProperties:false,properties:{sources:{type:'array',items:{type:'string',enum:['saju.dayMaster']}}}}});
 assert.deepEqual(getOptions().responseSchema.properties.sources.items.enum,['saju.dayMaster']);
 assert.equal(getOptions().responseSchema.additionalProperties,undefined);
 assert.equal(getOptions().maxProviderAttempts,1);
});

test('v5 empty legacy fields do not send unsupported empty Gemini enums',async()=>{
 setResponse({ok:true,text:'{}',provider:'gemini'});
 const outputSchema={type:'object',properties:{example:{type:'string',enum:['']},advice:{type:'string',enum:['']},sources:{type:'array',items:{type:'string',enum:['saju.dayMaster']}}}};
 await provider.generate({...request,outputSchema});
 assert.deepEqual(getOptions().responseSchema.properties.example,{type:'string'});
 assert.deepEqual(getOptions().responseSchema.properties.advice,{type:'string'});
 assert.deepEqual(getOptions().responseSchema.properties.sources.items.enum,['saju.dayMaster']);
 assert.deepEqual(outputSchema.properties.example.enum,['']);
});


test('provider transport pins the purchase language instead of ambient HTTP locale',async()=>{
 setResponse({ok:true,text:'{}',provider:'gemini',model:'fixture'});
 for(const locale of ['en','ja',undefined]){
  await new CodeDestinyProvider({GEMINIF_API_KEY:'fixture-not-sent',LLM_DRY_RUN:'false'}).generate({...request,locale});
  assert.equal(getOptions().locale,locale || 'ko');
 }
});

test('chapter transport sends fixed evidence once and keeps system instructions separate',async()=>{
 setResponse({ok:true,text:'{}',provider:'gemini'});
 await provider.generate({...request,system:'SYSTEM_ONLY',userQuestion:'질문 원문',calculatedData:{facts:[{id:'saju.dayMaster',value:'wood'}]}});
 const payload=JSON.parse(getPrompt());
 assert.equal(Array.isArray(payload),false);
 assert.equal(payload.USER_QUESTION,'질문 원문');
 assert.deepEqual(payload.CALCULATED_DATA.facts,[{id:'saju.dayMaster',value:'wood'}]);
 assert.equal(getOptions().systemPrompt,'SYSTEM_ONLY');
 assert.equal(getPrompt().includes('SYSTEM_ONLY'),false);
});
