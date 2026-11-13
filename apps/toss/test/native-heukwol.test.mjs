import '../../../scripts/lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {isDeepStrictEqual} from 'node:util';

// The adapter is real. Only side effects (Mongo, order lookup and LLM) use local doubles.
const mocks=globalThis.__tossHeukwol={};
const bundled=await build({
  entryPoints:['worker/toss/native-heukwol.js'],bundle:true,format:'esm',platform:'node',write:false,
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
