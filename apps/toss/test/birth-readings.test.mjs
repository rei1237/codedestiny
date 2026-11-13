import '../../../scripts/lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {profileCardSolarBirth} from '../../../worker/lib/paid-content-read-access.js';
import {guardianPromptForBirth} from '../../../worker/routes/guardian-image.js';
import {nativeProduct} from '../../../worker/toss/native-consultation.js';

const mod=new URL('../../../worker/toss/birth-readings.js',import.meta.url);
const fixture=globalThis.__nativeBirthFixture={};
const q=v=>({lean:async()=>structuredClone(v),select:()=>q(v)});
function match(row,filter){return !!row&&Object.entries(filter).every(([k,v])=>v?.$regex?new RegExp(v.$regex).test(row[k]):row[k]===v);}
const stubs={
 '../lib/models.js':'const f=globalThis.__nativeBirthFixture;export const ProfileCard=f.profiles,ServiceExecutionTransaction=f.executions;',
 './models.js':'export const TossNativeConsultation=globalThis.__nativeBirthFixture.intents;',
 './native-tea.js':'const f=globalThis.__nativeBirthFixture;export const nativeOwnerFilter=(a,nativeService)=>({ownerId:a.ownerId,identityId:a._id,environment:a.environment,nativeService}),prepareNativeConsultation=async(e,a,input,o,contract)=>({input,contract}),verifiedIntent=async(e,a,r)=>{if(!r.orderId||r.status!=="paid"||f.revoked)throw Error("REVOKED");};',
 '../lib/sibyl-report-store.js':'export const readOrGenerateSibyl=(...args)=>globalThis.__nativeBirthFixture.generate(...args);',
};
fixture.intents={findOne:f=>q(match(fixture.row,f)?fixture.row:null),updateOne:async(f,v)=>{if(match(fixture.row,f)){Object.assign(fixture.row,v.$set);fixture.writes++;}}};
fixture.profiles={findOne:f=>q(fixture.cards.find(card=>match(card,f)))};
fixture.executions={find:f=>q(fixture.docs.filter(d=>match(d,f))),findOne:f=>q(fixture.docs.find(d=>match(d,f))),exists:async f=>fixture.docs.some(d=>match(d,f))};
const out=await build({entryPoints:[fileURLToPath(mod)],bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'birth-boundary',setup(b){
 b.onResolve({filter:/^\./},a=>{
  if(a.importer!==fileURLToPath(mod))return;
  return Object.hasOwn(stubs,a.path)?{namespace:'fixture',path:a.path}:{path:new URL(a.path,mod).href,external:true};
 });
 b.onLoad({namespace:'fixture',filter:/.*/},a=>({contents:stubs[a.path]}));
}}]});
const adapter=await import('data:text/javascript;base64,'+Buffer.from(out.outputFiles[0].contents).toString('base64'));
const auth={_id:'user-a',ownerId:'owner-a',environment:'SANDBOX'},id='a'.repeat(64),year=new Date().getFullYear();
const card={userId:auth.ownerId,profileId:'p1',birth:{year:1990,month:5,day:17,hour:9,minute:30,calType:'solar'},gender:'M'};
const ready=(service,prepared)=>({...prepared.contract,input:prepared.input,ownerId:auth.ownerId,identityId:auth._id,environment:auth.environment,nativeService:service,_id:id,orderId:'owner-order',status:'paid',savedResult:null});
test('original Guardian archive uses the verified stored birth and preserves the first copy',async()=>{
 fixture.cards=[card,{...card,profileId:'alias'}];fixture.docs=[];fixture.revoked=false;fixture.writes=0;
 const prepare=profileId=>adapter.prepareBirthReading({},auth,'guardian',{profileId,birth:{year:2001}});
 const original=await prepare('p1'),alias=await prepare('alias');
 assert.equal(original.contract.requestId,alias.contract.requestId);
 assert.equal(original.input.card.birth.year,1990);
 await assert.rejects(prepare('other'),e=>e.code==='PROFILE_REQUIRED');
 fixture.row=ready('guardian',original);
 assert.equal((await adapter.readBirthReading({},auth,'guardian',id,null,false)).status,202);
 const view=await adapter.readBirthReading({},auth,'guardian',id,null,true);
 assert.equal(view.body.archive.reading.resolvedGanji,'임오');
 assert.deepEqual(view.body.archive.prompt,guardianPromptForBirth(profileCardSolarBirth(card)));
 await adapter.readBirthReading({},auth,'guardian',id,null,true);assert.equal(fixture.writes,1);
 const item=await adapter.birthLibraryItem({},auth,{...fixture.row,_id:'owner-order',requestId:id});
 assert.equal(item.href,'/saju-guardian/?intentId='+id);
 await assert.rejects(adapter.readBirthReading({},{...auth,_id:'other'},'guardian',id,null,false),e=>e.code==='RESULT_NOT_FOUND');
 await assert.rejects(adapter.readBirthReading({},auth,'sibyl',id,year,false),e=>e.code==='RESULT_NOT_FOUND');
 fixture.revoked=true;await assert.rejects(adapter.readBirthReading({},auth,'guardian',id,null,false),/REVOKED/);
 assert.throws(()=>nativeProduct(undefined,original.contract),e=>e.code==='TOSS_PRODUCT_NOT_APPROVED');
});
test('Sibyl reads stored years on the same birth without regeneration or opening a web/other-order archive',async()=>{
 fixture.cards=[card];fixture.revoked=false;fixture.docs=[];
 const prepare=async y=>adapter.prepareBirthReading({},auth,'sibyl',{profileId:'p1',year:y});
 const initial=await prepare(year),next=await prepare(year+1);fixture.row=ready('sibyl',initial);
 assert.equal(initial.contract.requestId,next.contract.requestId);
 const doc={userId:auth.ownerId,featureKey:fixture.row.featureKey,reportType:'sibylAnnual',orderId:fixture.row.orderId,executionKey:'toss-sibyl:'+id+':'+year,status:'success',metadata:{archive:{year,chapters:[{content:'original archive'}]}}};
 fixture.docs=[{...doc,orderId:'wrong'},{...doc,executionKey:'sibyl:'+id+':'+year}];
 assert.equal((await adapter.readBirthReading({},auth,'sibyl',id,year,false)).body.status,'unopened');
 let calls=0;fixture.generate=async(_env,uid,access)=>{calls++;assert.equal(uid,auth.ownerId);assert.equal(access.tossIntentId,id);assert.equal(access.purchaseEvidence.orderId,fixture.row.orderId);fixture.docs.push(doc);return {status:200,body:doc.metadata.archive};};
 const result=await adapter.readBirthReading({},auth,'sibyl',id,year,true);
 assert.deepEqual(result.body.archive,doc.metadata.archive);
 await adapter.readBirthReading({},auth,'sibyl',id,year,true);assert.equal(calls,1);
 const old=year-1;fixture.docs.push({...doc,executionKey:'toss-sibyl:'+id+':'+old,metadata:{archive:{year:old,chapters:[{content:'historical'}]}}});
 assert.equal((await adapter.readBirthReading({},auth,'sibyl',id,old,false)).body.archive.year,old);
 fixture.docs[fixture.docs.length-1].status='failed';
 fixture.generate=async(_env,_uid,access)=>{assert.equal(access.tossResumeYear,old);return {status:202,body:{partial:true}};};
 assert.equal((await adapter.readBirthReading({},auth,'sibyl',id,old,true)).status,202);
 await assert.rejects(adapter.readBirthReading({},auth,'sibyl',id,year+12,true),e=>e.code==='INVALID_YEAR');
 fixture.revoked=true;await assert.rejects(adapter.readBirthReading({},auth,'sibyl',id,old,false),/REVOKED/);
});
