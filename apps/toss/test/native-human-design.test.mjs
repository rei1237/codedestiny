import '../../../scripts/lib/mock-network-guard.cjs';
import {validateTossHumanDesignBirth} from '../../../worker/toss/human-design.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {build} from 'esbuild';import {fileURLToPath} from 'node:url';
const state=globalThis.__hdNative={validateTossHumanDesignBirth};
const query=(key,filter)=>({lean:async()=>{const row=state[key];return row&&Object.entries(filter).every(([k,v])=>row[k]===v)?structuredClone(row):null;}});
state.intents={findOne:filter=>query('row',filter)};state.identities={findOne:filter=>query('identity',filter)};
const stubs={
 './human-design.js':'export const validateTossHumanDesignBirth=globalThis.__hdNative.validateTossHumanDesignBirth;',
 './models.js':'const s=globalThis.__hdNative;export const TossNativeConsultation=s.intents,TossIdentity=s.identities;',
 './crypto.js':'export const unseal=async()=>"mock";',
 '../lib/billing-feature-registry.js':'export const getBillingFeaturePricing=()=>({pricing:{amountKRW:1}});',
 './native-context.js':'export const bindNativeTossRequest=(request,context)=>{globalThis.__hdNative.context=context;};',
 './native-tea.js':`const s=globalThis.__hdNative;export const nativeOwnerFilter=(a,nativeService)=>({identityId:a._id,ownerId:a.ownerId,environment:a.environment,nativeService}),prepareNativeConsultation=async(e,a,input,o,contract)=>({input,contract}),verifiedIntent=async()=>{if(s.revoked)throw Error('REVOKED');};`,
 '../routes/human-design-report.js':`const s=globalThis.__hdNative;export const nativeHumanDesignStoredState=async(e,user,key)=>s.doc?.userId===user&&s.doc.billingRequestId===key?s.doc:null;
 export async function handleHumanDesignReportRoutes(request){const c=s.context,path=new URL(request.url).pathname;const body=request.method==='POST'?await request.json():null;
 if(path.endsWith('/start')){const proof=await c.access(body.requestId,{inputHash:s.row.inputHash,locale:body.locale});s.doc={id:'saved-hd',userId:c.auth.userId,accessSource:'toss',billingRequestId:body.requestId,inputHash:s.row.inputHash,paymentId:proof.transactionId,locale:'ko',status:'generating'};}
 else if(path.endsWith('/generate')){s.generations++;s.doc.status='completed';if(s.refundAfterWave)s.revoked=true;}
 return Response.json({status:s.doc.status});}`,
};
const result=await build({entryPoints:[fileURLToPath(new URL('../../../worker/toss/native-human-design.js',import.meta.url))],bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'isolated-hd',setup(b){b.onResolve({filter:/.*/},a=>a.importer.endsWith('native-human-design.js')&&Object.hasOwn(stubs,a.path)?{path:a.path,namespace:'mock'}:null);b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:stubs[a.path]}));}}]});
const api=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].contents).toString('base64'));
test('native HD binds account, birth hash and paid order before every original wave and reread',async()=>{
 const auth={_id:'identity',ownerId:'owner',userId:'owner',environment:'SANDBOX'},id='d'.repeat(64);
 const input={requestId:'human-design-00000000-0000-4000-8000-000000000000',birth:{birthDate:'1990-01-01',birthTime:'08:35',timezone:'Asia/Seoul',calendar:'solar'}};
 const prepared=await api.prepareNativeHumanDesign({},auth,input);
 state.row={...prepared.contract,input:prepared.input,_id:id,identityId:auth._id,ownerId:auth.ownerId,environment:auth.environment,nativeService:'human-design',status:'paid',orderId:'order'};
 state.generations=0;assert.equal((await api.readNativeHumanDesign({},auth,id,false)).status,202);
 await api.readNativeHumanDesign({},auth,id,true);await api.readNativeHumanDesign({},auth,id,true);await api.readNativeHumanDesign({},auth,id,true);assert.equal(state.generations,1);
 assert.equal((await api.nativeHumanDesignLibraryItem({},auth,{_id:'order',requestId:id})).state,'COMPLETED');
 await assert.rejects(api.readNativeHumanDesign({},{...auth,ownerId:'other'},id,false),e=>e.code==='RESULT_NOT_FOUND');
 for(const key of ['inputHash','paymentId','locale','accessSource']){const old=state.doc[key];state.doc[key]='different';await assert.rejects(api.readNativeHumanDesign({},auth,id,false),e=>e.code==='RESULT_NOT_FOUND');state.doc[key]=old;}
 state.identity={...auth,active:true};
 await assert.rejects(api.bindNativeHumanDesignRecovery(new Request('https://mock.invalid'),{},state.doc),e=>e.code==='TOSS_RELEASE_PENDING');
 await api.bindNativeHumanDesignRecovery(new Request('https://mock.invalid'),{TOSS_RELEASE_READY:'true'},state.doc);
 state.identity.active=false;await assert.rejects(api.bindNativeHumanDesignRecovery(new Request('https://mock.invalid'),{TOSS_RELEASE_READY:'true'},state.doc),e=>e.code==='SESSION_EXPIRED');
 state.doc.status='generating';state.refundAfterWave=true;await assert.rejects(api.readNativeHumanDesign({},auth,id,true),/REVOKED/);
});
