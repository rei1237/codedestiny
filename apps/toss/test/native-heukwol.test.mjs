import '../../../scripts/lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {isDeepStrictEqual} from 'node:util';
import {fileURLToPath} from 'node:url';

// The adapter is real. Only side effects (Mongo, order lookup and LLM) use local doubles.
const mocks=globalThis.__tossHeukwol={};
const bundled=await build({
  entryPoints:[fileURLToPath(new URL('../../../worker/toss/native-heukwol.js',import.meta.url))],
  bundle:true,format:'esm',platform:'node',write:false,
  plugins:[{name:'heukwol-offline-dependencies',setup(build){
    const stubs={
      '../lib/models.js':'export const ProfileCard={};',
      '../lib/heukwol-analysis.js':'export const buildHeukwolAnalysis=()=>{},heukwolProfileBirth=()=>{};',
      '../lib/heukwol-report.js':`export const HEUKWOL_CHAPTERS=[{key:"a"},{key:"b"}],HEUKWOL_FEATURE_KEY="heukwol-warning-consultation",HEUKWOL_DELIVERY_PLAN_VERSION=2,HEUKWOL_MIN_CHARS=40000,heukwolDeliveryV2Enabled=()=>true,generateHeukwolChapter=(...args)=>globalThis.__tossHeukwol.generate(...args);`,
      './models.js':'export const TossNativeConsultation=globalThis.__tossHeukwol;',
      './native-tea.js':`export const prepareNativeConsultation=()=>{},nativeOwnerFilter=(auth,nativeService)=>({ownerId:auth.ownerId,nativeService}),verifiedIntent=async(env,auth,row)=>{if(!row||row.ownerId!==auth.ownerId||!globalThis.__tossHeukwol.active)throw Error("NO_ACCESS");return row;};`,
    };
    build.onResolve({filter:/.*/},args=>args.importer.endsWith('native-heukwol.js')&&Object.hasOwn(stubs,args.path)?{path:args.path,namespace:'offline'}:null);
    build.onLoad({filter:/.*/,namespace:'offline'},args=>({contents:stubs[args.path]}));
  }}],
});
const {heukwolWave,heukwolLibraryItem}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].contents).toString('base64'));

test('paid waves freeze chapter evidence, fence competing writers and recheck ownership after generation',async()=>{
  const auth={ownerId:'test-a'},row={_id:'test-intent',orderId:'test-order',nativeService:'heukwol',...auth,status:'paid',
    generationStartedAt:null,savedResult:null,input:{planVersion:2,year:2027,question:'모의 질문',analysis:{months:[]}}};
  const query=(read)=>({lean:async()=>structuredClone(read())});
  const matches=filter=>Object.entries(filter).every(([k,v])=>{
    if(k==='$or')return !row.generationStartedAt||row.generationStartedAt<v[1].generationStartedAt.$lt;
    return isDeepStrictEqual(row[k],v);
  });
  mocks.findOne=filter=>query(()=>matches(filter)?row:null);
  mocks.findOneAndUpdate=(filter,update)=>query(()=>matches(filter)?Object.assign(row,update.$set):null);
  mocks.active=true;
  let count=0,started,release;
  const stop=new Promise(resolve=>{release=resolve;}),locked=new Promise(resolve=>{started=resolve;});
  mocks.generate=async(env,basis,chapter,question,previous)=>{
    count++;assert.deepEqual(basis,row.input.analysis);assert.equal(question,row.input.question);
    if(!previous.length){started();await stop;}
    return {...chapter,content:'모의 저장본 '+chapter.key,totalChars:8};
  };
  const generate=()=>heukwolWave({},auth,row._id,true);
  assert.equal((await heukwolWave({},auth,row._id,false)).completedChapters,0);
  const pending=generate();await locked;
  assert.equal((await generate()).completedChapters,0);
  release();assert.equal((await pending).completedChapters,1);
  const completed=await generate();
  assert.deepEqual(completed.report.chapters.map(c=>c.key),['a','b']);
  assert.deepEqual(await generate(),completed);assert.equal(count,2);
  assert.equal((await heukwolLibraryItem({},auth,{requestId:row._id,_id:row.orderId})).state,'COMPLETED');
  await assert.rejects(heukwolWave({},{ownerId:'test-b'},row._id,false),/NO_ACCESS/);
  row.savedResult=null;
  mocks.generate=async()=>{mocks.active=false;return {key:'a',totalChars:1};};
  await assert.rejects(generate(),/NO_ACCESS/);
  assert.equal(row.savedResult,null);
});

test('v2 never skips an exhausted chapter: rounds retry it, then the order closes as failed without a report',async()=>{
  const auth={ownerId:'test-c'},row={_id:'test-intent-2',orderId:'test-order-2',nativeService:'heukwol',...auth,status:'paid',
    generationStartedAt:null,savedResult:{chapters:[{key:'a',totalChars:8}],skipped:['b'],attempts:0},input:{planVersion:2,year:2027,question:'모의 질문',analysis:{}}};
  const query=read=>({lean:async()=>structuredClone(read())});
  const matches=filter=>Object.entries(filter).every(([k,v])=>k==='$or'?!row.generationStartedAt:isDeepStrictEqual(row[k],v));
  mocks.findOne=filter=>query(()=>matches(filter)?row:null);
  mocks.findOneAndUpdate=(filter,update)=>query(()=>matches(filter)?Object.assign(row,update.$set):null);
  mocks.active=true;
  const seen=[];
  mocks.generate=async(env,basis,chapter,question,previous,u,options)=>{seen.push([chapter.key,options.relaxed,options.finalAttempt]);throw Object.assign(Error('weak'),{heukwolIssue:'모의 이슈'});};
  let view;
  for(let i=0;i<8;i++){view=await heukwolWave({},auth,row._id,true);assert.equal(view.status,'generating');assert.equal(view.report,undefined);}
  view=await heukwolWave({},auth,row._id,true);
  assert.equal(view.status,'failed');assert.equal(view.report,undefined);
  assert.equal(seen.length,9);assert.ok(seen.every(([key])=>key==='b'));
  assert.deepEqual(seen.slice(0,3),[['b',false,false],['b',true,false],['b',true,true]]);
  assert.equal((await heukwolLibraryItem({},auth,{requestId:row._id,_id:row.orderId})).state,'GENERATION_FAILED');
  assert.equal((await heukwolWave({},auth,row._id,true)).status,'failed');assert.equal(seen.length,9);
});
