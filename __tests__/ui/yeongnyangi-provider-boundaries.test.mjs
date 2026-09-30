import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const compiled=await build({stdin:{contents:"export {CodeDestinyProvider,chapterOutputTokenBudget,CHAPTER_THINKING_BUDGET} from './worker/yeongnyangi/providers/code-destiny'; export {tokensRequiredForChars} from './worker/lib/llm-budget.js'; export {products} from './worker/yeongnyangi/payments/catalog'; export {consultationManifest,consultationKinds,consultationDomain,supportsKind} from './worker/yeongnyangi/fortune/consultation-kinds'; export {v7OutputTokens} from './worker/yeongnyangi/fortune/reading-v7-prompt'; export {conciseReadingManifest,conciseOutputTokens,CONCISE_READING_VERSION} from './worker/yeongnyangi/fortune/concise-reading'; export {setResponse,getOptions,getPrompt} from 'mock-gemini.js';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,
 plugins:[{name:'mock-provider-transport',setup(b){b.onResolve({filter:/gemini\.js$/},()=>({path:'gemini',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'let response,options,payload; export function setResponse(value){response=value;} export function getOptions(){return options;} export function getPrompt(){return payload;} export async function callGeminiText(env,prompt,opts){options=opts;payload=prompt;return response;}'}));}}]});
const {CodeDestinyProvider,chapterOutputTokenBudget,CHAPTER_THINKING_BUDGET,tokensRequiredForChars,products,consultationManifest,consultationKinds,consultationDomain,supportsKind,v7OutputTokens,conciseReadingManifest,conciseOutputTokens,CONCISE_READING_VERSION,setResponse,getOptions,getPrompt}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const provider=new CodeDestinyProvider({GEMINIF_API_KEY:'fixture-not-used',LLM_DRY_RUN:'false'});
const request={system:'fixture',domainRules:'fixture',userQuestion:'fixture',calculatedData:{},outputSchema:{},sectionTitles:[]};

test('declared output allowance is honored without shrinking large answers or losing old caller headroom',async()=>{
 setResponse({ok:true,text:'{}',provider:'gemini'});
 for(const [declared,expected] of [[8192,9216],[4000,9216],[24576,25600],[undefined,12274],[0,12274],[NaN,12274]]){
  await provider.generate({...request,maxOutputTokens:declared});
  assert.equal(getOptions().maxOutputTokens,expected);
  assert.equal(getOptions().thinkingBudget,CHAPTER_THINKING_BUDGET);
  assert.equal(getOptions().maxProviderAttempts,1);
  assert.equal(getOptions().fallbackToWorkersAI,false);
 }
});

test('every catalog chapter keeps its full goal, header, eight-question and thinking allowances',()=>{
 let chapters=0;
 for(const product of products)for(const kind of [undefined,...consultationKinds[consultationDomain(product)].filter(k=>supportsKind(product,k))]){
  for(const chapter of consultationManifest(product,kind))for(const questions of [0,8]){
   const requested=v7OutputTokens(chapter,questions);
   const minimum=tokensRequiredForChars((chapter.targetChars?.[1]||0)+600+questions*480)+CHAPTER_THINKING_BUDGET;
   assert.ok(chapterOutputTokenBudget(requested)>=minimum,`${product.id}/${kind?.id}/${chapter.id}/${questions}`);
   chapters++;
  }
 }
 assert.ok(chapters>2000);
});
test('question analysis uses a short deterministic single provider call',async()=>{
 setResponse({ok:true,text:'{"questions":[]}'});
 assert.equal(await provider.analyzeQuestion('classify','data'),'{"questions":[]}');
 assert.equal(getOptions().temperature,0);assert.equal(getOptions().maxProviderAttempts,1);
 assert.equal(getOptions().fallbackToWorkersAI,false);assert.equal(getOptions().maxOutputTokens,1024);
 assert.equal(getOptions().thinkingBudget,0);
 setResponse({ok:true,text:'{}',truncated:true});await assert.rejects(provider.analyzeQuestion('classify','data'));
});
test('output truncation preserves raw text for local delivery recovery',async()=>{
 for(const flags of [{truncated:true},{finishReason:'MAX_TOKENS'}]){
  setResponse({ok:true,text:'{}',...flags});assert.equal((await provider.generate(request)).result,'{}');
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


test('new concise purchases reduce the floor while preserving the declared complete answer allowance',async()=>{
 setResponse({ok:true,text:'{}',provider:'gemini'});
 for(const [declared,expected] of [[4000,5120],[8192,9216],[24576,25600],[undefined,12274],[Infinity,12274]]){
  await provider.generate({...request,domainRules:'{}',outputBudgetVersion:CONCISE_READING_VERSION,maxOutputTokens:declared});
  assert.equal(getOptions().maxOutputTokens,expected);
  assert.equal(getOptions().maxProviderAttempts,1);
 }
 // An unknown version must not silently shrink old callers' allowance.
 assert.equal(chapterOutputTokenBudget(4000,'unknown'),9216);
});

test('concise transport keeps every fact and rule with one structured schema while legacy bytes stay unchanged',async()=>{
 setResponse({ok:true,text:'{}',provider:'gemini'});
 const rules={question:{text:'질문 \"원문\"',ids:['q1']},contracts:['근거를 유지한다','계산되지 않은 사실을 만들지 않는다']};
 const input={...request,domainRules:JSON.stringify(rules),calculatedData:{facts:[{id:'saju.dayMaster',value:{wood:2}}]},outputSchema:{type:'object',properties:{answer:{type:'string'}}}};
 await provider.generate(input);
 const legacy=getPrompt();
 assert.equal(JSON.parse(legacy).DOMAIN_CONTEXT,JSON.stringify(rules));
 assert.deepEqual(JSON.parse(legacy).OUTPUT_SCHEMA,input.outputSchema);
 await provider.generate({...input,outputBudgetVersion:CONCISE_READING_VERSION});
 const compact=JSON.parse(getPrompt());
 assert.deepEqual(compact.DOMAIN_CONTEXT,rules);
 assert.deepEqual(compact.CALCULATED_DATA,input.calculatedData);
 assert.equal(compact.USER_QUESTION,input.userQuestion);
 assert.deepEqual(compact.SECTION_TITLES,input.sectionTitles);
 assert.equal(Object.hasOwn(compact,'OUTPUT_SCHEMA'),false);
 assert.deepEqual(getOptions().responseSchema,input.outputSchema);
 assert.ok(getPrompt().length<legacy.length);
 await provider.generate(input);
 assert.equal(getPrompt(),legacy);
});

test('every concise catalog chapter preserves sections, evidence ownership and full answer headroom without mutating saved manifests',()=>{
 let cases=0;
 for(const product of products)for(const kind of [undefined,...consultationKinds[consultationDomain(product)].filter(k=>supportsKind(product,k))]){
  const stored=consultationManifest(product,kind),before=JSON.stringify(stored),compact=conciseReadingManifest(stored);
  assert.equal(JSON.stringify(stored),before);
  assert.equal(compact.length,stored.length);
  assert.deepEqual(conciseReadingManifest(compact),compact,'previews cannot compact twice');
  for(const [i,chapter] of compact.entries()){
   const original=stored[i];
   assert.equal(chapter.minimumChars,Math.min(Math.round((original.minimumChars||original.targetChars[0])*.88),chapter.targetChars[0]));
   for(const [j,section] of (chapter.sections||[]).entries())assert.equal(section.minimumChars,Math.min(Math.round(original.sections[j].minimumChars*.88),section.targetChars[0]));
  }
  compact.forEach((chapter,index)=>{
   const old=stored[index];
   assert.equal(chapter.outputBudgetVersion,CONCISE_READING_VERSION);
   assert.deepEqual(chapter.sections.map(s=>[s.id,s.title,s.role,s.instruction]),old.sections.map(s=>[s.id,s.title,s.role,s.instruction]));
   for(const field of ['id','key','version','systems','factSelectors','owns','refs','mustCover','minInsightUnits','scene','decision'])assert.deepEqual(chapter[field],old[field]);
   for(const target of [0,1])assert.ok(Math.abs(chapter.targetChars[target]/old.targetChars[target]-.88)<.005);
   for(const questions of [0,8]){
    const output=chapterOutputTokenBudget(conciseOutputTokens(chapter,questions),chapter.outputBudgetVersion);
    assert.ok(output>=tokensRequiredForChars(chapter.targetChars[1]+600+questions*480)+CHAPTER_THINKING_BUDGET);
    const sectionUpper=chapter.sections.reduce((n,s)=>n+s.targetChars[1],0);
    assert.ok(output>=tokensRequiredForChars(sectionUpper+600+questions*480)+CHAPTER_THINKING_BUDGET);
    cases++;
   }
  });
 }
 assert.ok(cases>2000);
});
