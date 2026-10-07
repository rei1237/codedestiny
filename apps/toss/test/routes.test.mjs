import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),Module=require('node:module');
const calls={profiles:[],prepared:[],followups:0};
const auth={_id:'identity',ownerId:'owner',userId:'owner',userKey:'123',environment:'SANDBOX'};
const mocks={
 auth:async()=>auth,profile:async(...args)=>calls.profiles.push(args),
 product:sku=>({productId:sku,sku,approvedPriceKRW:1,approved:true}),
 prepare:async(_env,user,body)=>{calls.prepared.push({user,body});return {_id:'a'.repeat(64),productId:body.productId,amountKRW:1,snapshot:{manifest:[{id:'part',title:'answer',ordinal:0}]}};},
 purchase:()=>({lean:async()=>null}),followup:async()=>{calls.followups++;return {};}
};
globalThis.__tossRouteMocks=mocks;
const stubMap={
 'worker/toss/session.js':"export const requireTossSession=globalThis.__tossRouteMocks.auth;export const createTossSession=()=>{};export const invalidateIdentity=()=>{};export const disconnectIdentity=()=>{};",
 'worker/toss/catalog.js':"export const APPROVED_TOSS_PRODUCTS=[];export const approvedProduct=globalThis.__tossRouteMocks.product;",
 'worker/toss/models.js':"export const TossPurchase={findOne:globalThis.__tossRouteMocks.purchase};export const TossSession={};",
 'worker/toss/partner.js':"export const lookupOrder=()=>{throw new Error('unexpected partner call')};",
 'worker/toss/grant.js':"export const grantVerifiedOrder=()=>{};",
 'worker/toss/purchases.js':"export const purchaseStore={};export const recordTossRefund=()=>{};",
 'worker/lib/models.js':"export const ProfileCard={updateOne:globalThis.__tossRouteMocks.profile};",
 'worker/lib/rate-limit.js':"export const incrementRateLimit=async()=>({count:1});",
 'worker/yeongnyangi/service.ts':"export const prepareFortune=globalThis.__tossRouteMocks.prepare;export const presentFortune=x=>x;",
 'worker/yeongnyangi/repository.js':"export const readRequest=()=>{};export const resumeRequest=()=>{};",
 'worker/yeongnyangi/queue.js':"export const enqueueConsultation=()=>{};",
 'worker/yeongnyangi/question-followup.ts':"export const questionConversation=globalThis.__tossRouteMocks.followup;"
};
const root=path.resolve(import.meta.dirname,'../../..');
const bundle=await build({entryPoints:[path.join(root,'worker/toss/routes.js')],bundle:true,platform:'node',format:'cjs',write:false,plugins:[{name:'offline-boundaries',setup(b){b.onLoad({filter:/\.(js|ts)$/},args=>{const source=stubMap[path.relative(root,args.path).replaceAll('\\','/')];if(source)return {contents:source,loader:'js'};});}}]});
const loaded=new Module(path.join(root,'toss-route-check.cjs'));loaded.paths=Module._nodeModulePaths(root);loaded._compile(bundle.outputFiles[0].text,loaded.id);
const {handleTossRoutes}=loaded.exports;
const birth={gender:'F',date:{year:1990,month:1,day:1,calType:'solar',timeUnknown:true},location:{label:'서울',lat:37.5665,lng:126.978,tz:'Asia/Seoul'}};
const decision={version:'question-consultation-20261007',category:'self',target:'self',horizon:'current',situation:'대화할 때 내 경계를 말하고 싶어요',options:'',period:'',constraints:'',confirmed:true};
const input=()=>({attemptId:crypto.randomUUID(),sku:'saju_mackerel',question:'어떻게 내 경계를 표현할까?',birth:structuredClone(birth),questionDecision:{...decision}});
async function request(body,path='/prepare',env={TOSS_RELEASE_READY:'true'}){
 calls.profiles=[];calls.prepared=[];calls.followups=0;
 return handleTossRoutes(new Request('https://code-destiny.com/api/toss'+path,{method:'POST',headers:{Origin:'https://ai-saju-studio.private-apps.tossmini.com','Content-Type':'application/json'},body:JSON.stringify(body)}),env);
}
test('release gate prevents any profile or prepared row write',async()=>{const r=await request(input(),'/prepare',{});assert.equal(r.status,503);assert.equal(calls.profiles.length,0);assert.equal(calls.prepared.length,0);});
test('missing or mismatched question scope is rejected before profile writes',async()=>{
 for(const form of [{...input(),questionDecision:undefined},{...input(),sku:'saju_salmon'}]){const r=await request(form);assert.equal(r.status,400);assert.equal(calls.profiles.length,0);assert.equal(calls.prepared.length,0);}
});
test('server owns account and input profile identity and forwards current decision',async()=>{
 const r=await request({...input(),userId:'attacker',profileId:'unrelated'});assert.equal(r.status,200);
 assert.equal(calls.profiles[0][0].userId,'owner');assert.match(calls.prepared[0].body.profileId,/^toss-self-/);
 assert.equal(calls.prepared[0].user,'owner');assert.equal(calls.prepared[0].body.questionDecision.version,decision.version);
 assert.equal(calls.prepared[0].body.timeUnknown,true);
});
test('pair scope requires a second explicit target, preserves unknown time and never merges equal birthdays',async()=>{
 const form={...input(),sku:'saju_flounder',questionDecision:{...decision,target:'pair',category:'compatibility',relationshipType:'family'}};
 assert.equal((await request(form)).status,400);assert.equal(calls.profiles.length,0);
 const r=await request({...form,partnerBirth:structuredClone(birth)});assert.equal(r.status,200);
 const body=calls.prepared[0].body;assert.equal(body.consultationKind,'compatibility');assert.notEqual(body.profileId,body.partnerProfileId);assert.equal(body.partnerTimeUnknown,true);assert.equal(calls.profiles.length,2);
});
test('followup without an owned purchase never reaches a generation call',async()=>{const r=await request({id:crypto.randomUUID(),question:'내 질문'},'/results/'+'a'.repeat(64)+'/conversation');assert.equal(r.status,404);assert.equal(calls.followups,0);});
