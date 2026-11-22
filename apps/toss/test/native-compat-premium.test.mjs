import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

const local=globalThis.__premiumCompatTest={};
const entry=fileURLToPath(new URL('../../../worker/toss/native-compat-premium.js',import.meta.url));
const stubs={
  './models.js':'export const TossNativeConsultation=globalThis.__premiumCompatTest;',
  './native-tea.js':`export const nativeOwnerFilter=(auth,nativeService)=>({identityId:auth._id,ownerId:auth.ownerId,environment:auth.environment,nativeService}),
    prepareNativeConsultation=async(env,auth,input,orderId,contract,nativeService)=>({...nativeOwnerFilter(auth,nativeService),input,...contract}),
    verifiedIntent=async(env,auth,row)=>{if(!row||row.status!=="paid"||row.ownerId!==auth.ownerId)throw Error("NO_ACCESS");return row;};`,
  '../routes/saju-compat-premium.js':'export const generateSajuCompatPremiumGroup=(...args)=>globalThis.__premiumCompatTest.generate(...args);',
};
const bundled=await build({entryPoints:[entry],bundle:true,format:'esm',platform:'node',write:false,
  plugins:[{name:'premium-compat-boundaries',setup(builder){
    builder.onResolve({filter:/.*/},args=>args.importer.endsWith('native-compat-premium.js')&&Object.hasOwn(stubs,args.path)?{path:args.path,namespace:'offline'}:null);
    builder.onLoad({filter:/.*/,namespace:'offline'},args=>({contents:stubs[args.path]}));
  }}]});
const {preparePremiumCompat,readPremiumCompat,premiumCompatLibraryItem}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].contents).toString('base64'));

test('premium compatibility stores only completed web chapters and resumes the same owner and order',async()=>{
  const auth={_id:'test-identity',ownerId:'test-user',environment:'SANDBOX'};
  const person={birthDate:'1990-02-02',gender:'female',calendarType:'solar',birthTimeUnknown:true};
  const input={self:person,partner:{...person,birthDate:'1992-08-11',gender:'male'},relationType:'reunion',requestId:'scp-'+crypto.randomUUID()};
  const prepared=await preparePremiumCompat({},auth,input);
  assert.equal(prepared.featureKey,'saju-compat-premium');
  assert.equal(prepared.input.facts.relationType,'reunion');
  assert.deepEqual(prepared.input.facts.uncertainty,['self_birth_time_unknown','partner_birth_time_unknown']);
  const row={...prepared,_id:'a'.repeat(64),status:'paid',orderId:'mock-order',generationStartedAt:null,savedResult:null};
  const matches=filter=>Object.entries(filter).every(([key,value])=>key==='$or'?!row.generationStartedAt:isDeepStrictEqual(row[key],value));
  const query=fn=>({lean:async()=>structuredClone(fn())});
  local.findOne=filter=>query(()=>matches(filter)?row:null);
  local.findOneAndUpdate=(filter,update)=>query(()=>matches(filter)?Object.assign(row,update.$set):null);
  const started=[],purchase={...row,_id:row.orderId,requestId:row._id};
  let interrupt=true;
  local.generate=async(_env,facts,group)=>{
    assert.deepEqual(facts,prepared.input.facts);started.push(group.key);
    if(interrupt&&started.length===2){interrupt=false;throw Error('mock connection lost');}
    return {ok:true,key:group.key,sections:group.sections.map(section=>({title:section.title,body:'[테스트] '+section.title+' 저장 원문입니다.'}))};
  };
  const wave=()=>readPremiumCompat({},auth,row._id,true);
  const simultaneous=await Promise.all([wave(),wave()]);
  assert.equal(started.length,1);assert.equal(Math.max(...simultaneous.map(r=>r.completed)),1);
  assert.equal((await wave()).retry,true);
  assert.equal((await readPremiumCompat({},auth,row._id,false)).result,undefined);
  assert.equal((await premiumCompatLibraryItem({},auth,purchase)).state,'GENERATION_FAILED');
  await wave();await wave();const done=await wave();
  assert.equal(done.completed,4);assert.equal(done.result.chapters.length,4);
  assert.equal((await premiumCompatLibraryItem({},auth,purchase)).state,'COMPLETED');
  assert.deepEqual(await wave(),done);
  assert.equal(started.length,5);assert.equal(new Set(started).size,4);
  await assert.rejects(readPremiumCompat({},{...auth,ownerId:'other'},row._id,false),/NO_ACCESS/);
  row.status='refunded';await assert.rejects(wave(),/NO_ACCESS/);
});
