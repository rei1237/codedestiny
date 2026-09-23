import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const compiled=await build({stdin:{contents:"export {CodeDestinyProvider} from './worker/yeongnyangi/providers/code-destiny'; export {setResponse,getOptions} from 'mock-gemini.js';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,
 plugins:[{name:'mock-provider-transport',setup(b){b.onResolve({filter:/gemini\.js$/},()=>({path:'gemini',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'let response,options; export function setResponse(value){response=value;} export function getOptions(){return options;} export async function callGeminiText(env,prompt,opts){options=opts;return response;}'}));}}]});
const {CodeDestinyProvider,setResponse,getOptions}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const provider=new CodeDestinyProvider({GEMINIF_API_KEY:'fixture-not-used',LLM_DRY_RUN:'false'});
const request={system:'fixture',domainRules:'fixture',userQuestion:'fixture',calculatedData:{},outputSchema:{},sectionTitles:[]};
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
});
