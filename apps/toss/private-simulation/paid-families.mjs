import {sukuyoProduct,relationshipProduct,relationshipSukuyoRequest} from '../test/offline/relationship-sukuyo.mjs';
import {calculateTossPet} from '../../../worker/toss/pet-saju.js';
const petProducts=['report','compat'].map(kind=>({id:'native:pet:'+kind,name:kind==='report'?'반려동물 사주 심층 리포트':'반려동물 궁합',sku:'mock-pet-'+kind,featureKey:kind==='report'?'pet-saju-ai-consultation':'pet-compatibility-ai',approvedPriceKRW:1,available:true,kind}));
export const paidFamilyProducts=[relationshipProduct,sukuyoProduct,...petProducts];
const respond=(body,status=200)=>Response.json(body,{status});
const label='[비공개 모의 예시] 실제 상담 결과가 아닙니다.';
const ownedRows=state=>[...state.intents.values()].filter(row=>['relationship','sukuyo','pet'].includes(row.service)&&row.paid);
const href=row=>row.service==='pet'?'/pet-saju/?intentId='+row.id:row.service==='sukuyo'?'/sukuyo-compatibility-ai/?cid='+(row.result?.id||'toss_'+row.id):'/relationship-boundary-test/?sessionId='+(row.result?.sessionId||'toss_'+row.id);
export function paidFamilyPurchases(state){return ownedRows(state).map(row=>({orderId:row.orderId,requestId:row.id,sku:row.sku,nativeService:row.service,serviceId:row.service,featureKey:row.featureKey||paidFamilyProducts.find(p=>p.sku===row.sku)?.featureKey,status:'PURCHASED',state:row.result?'COMPLETED':'PENDING',completedSections:row.result?1:0,totalSections:1,createdAt:row.createdAt,href:href(row)}));}
export function paidFamilyRecords(url,state){const group=url.searchParams.get('group'),source=url.searchParams.get('source'),q=url.searchParams.get('q')?.trim();return ownedRows(state).map(row=>{const product=paidFamilyProducts.find(p=>p.sku===row.sku);return {id:row.id,key:row.service+':'+row.id,group:'report',source:row.service,serviceId:row.service,serviceName:product.name,title:product.name,question:row.input.question||product.name,createdAt:row.createdAt,status:row.result?'completed':'generating',href:href(row),nativeHref:href(row)};}).filter(row=>(!group||group==='all'||group==='report')&&(!source||source==='all'||source===row.source)&&(!q||row.question.includes(q)));}
function petResult(row){
 const pets=row.input.kind==='report'?[row.input.pet]:[row.input.petA,row.input.petB];
 const charts=pets.map(pet=>calculateTossPet({pet}));
 if(row.input.kind==='report')return {ok:true,status:'completed',title:'반려동물 사주 AI 심층 리포트',blueprint:{...charts[0].blueprint,deep:{habitats:[{id:'window',labelKo:'햇살 드는 창가',category:'실내',stars:4}]}},report:{personality:[label],habitats:[{id:'window',reading:label}],plays:[label],coach:label,care:label,closing:label}};
 return {ok:true,status:'completed',title:'반려동물 궁합 분석',pets:charts.map(row=>({breed:row.blueprint.breed||null})),compat:{score:82,grade:'모의 궁합',dimensions:[{key:'play',labelKo:'놀이 호흡',value:70,inverted:false}],sharedPlaces:[{id:'park',labelKo:'근처 공원',category:'야외'}],pets:pets.map(pet=>({name:pet.name,species:{key:pet.species,labelKo:pet.species==='dog'?'강아지':'반려동물'},excessElement:'화',usefulElement:'수'}))},reading:{verdict:label,overview:[label],dimensions:[{key:'play',reading:label}],places:[{id:'park',reading:label}],cautions:[label],routine:label}};
}
// Entry API authenticates and checks the private order account prefix first.
export async function paidFamilyRequest(request,url,path,state,save,now=()=>new Date(),delay=1100){
 const method=request.method;
 if(['/orders/grant','/orders/restore'].includes(path)&&method==='POST'){
  const {sku,orderId,requestId}=await request.json();if(!paidFamilyProducts.some(p=>p.sku===sku))return null;
  const row=state.intents.get(requestId);if(!row||row.sku!==sku||!orderId||row.orderId&&row.orderId!==orderId||state.orders.has(orderId)&&state.orders.get(orderId)!==row.id)return respond({error:'ORDER_MISMATCH'},403);
  const prior={paid:row.paid,orderId:row.orderId},old=state.orders.get(orderId);row.paid=true;row.orderId=orderId;state.orders.set(orderId,row.id);
  if(!save()){Object.assign(row,prior);if(old===undefined)state.orders.delete(orderId);else state.orders.set(orderId,old);return respond({error:'MOCK_STORAGE_UNAVAILABLE'},503);}
  return respond({orderId,requestId:row.id,entitlement:'granted',durable:true});
 }
 if(path==='/native/pet/prepare'&&method==='POST'){
  const {input,orderId}=await request.json(),product=petProducts.find(p=>p.kind===input?.kind);
  if(!product||!input.requestId||orderId)return respond({error:'MOCK_UNSUPPORTED'},400);
  try{for(const pet of input.kind==='report'?[input.pet]:[input.petA,input.petB])calculateTossPet({pet});}catch{return respond({error:'PET_INPUT_INVALID'},400);}
  const old=[...state.intents.values()].find(row=>row.service==='pet'&&row.input.requestId===input.requestId);
  if(old&&JSON.stringify(old.input)!==JSON.stringify(input))return respond({error:'REQUEST_INPUT_MISMATCH'},409);
  const row=old||{id:(++state.sequence).toString(16).padStart(64,'0'),service:'pet',featureKey:product.featureKey,sku:product.sku,amountKRW:1,paid:false,orderId:null,createdAt:now().toISOString(),input};state.intents.set(row.id,row);return save()?respond(row):respond({error:'MOCK_STORAGE_UNAVAILABLE'},503);
 }
 const pet=/^\/native\/pet\/intents\/([a-f0-9]{64})(?:\/(result|generate))?$/.exec(path);
 if(pet){const row=state.intents.get(pet[1]);if(row?.service!=='pet')return respond({error:'RESULT_NOT_FOUND'},404);if(!pet[2])return respond(row);if(!row.paid)return respond({error:'PAYMENT_REQUIRED'},402);
  if(pet[2]==='generate'&&method==='POST'&&!row.result){if(!row.startedAt){row.startedAt=now().getTime();save();}if(now().getTime()-row.startedAt>=delay){row.result=petResult(row);row.generationCount=1;if(!save()){delete row.result;delete row.generationCount;return respond({error:'MOCK_STORAGE_UNAVAILABLE'},503);}}}
  return row.result?respond(row.result):respond({ok:true,status:'generating',retryable:true,intentId:row.id},202);
 }
 if(!/^\/native\/(relationship|sukuyo)\/(prepare|intents\/[a-f0-9]{64})$/.test(path)&&!/^\/canonical\/(relationship-boundary-test|sukuyo-compatibility-ai)\/(prepare|generate|result)$/.test(path))return null;
 if(/^\/native\/(relationship|sukuyo)\/prepare$/.test(path)&&method==='POST'&&(await request.clone().json()).orderId)return respond({error:'MOCK_UNSUPPORTED'},400);
 // Hold a generation checkpoint so a closed screen can resume its paid input.
 if(path.endsWith('/generate')&&method==='POST'){
  const body=await request.clone().json();const service=path.includes('relationship-boundary')?'relationship':'sukuyo';
  const row=[...state.intents.values()].find(row=>row.service===service&&(body.resumeSessionId&&['toss_'+row.id,row.result?.id,row.result?.sessionId].includes(body.resumeSessionId)||body.idempotencyKey&&row.input.idempotencyKey===body.idempotencyKey));
  if(row?.paid&&!row.result){if(!row.startedAt){row.startedAt=now().getTime();save();}if(now().getTime()-row.startedAt<delay)return respond({ok:true,status:service==='relationship'?'delivery_pending':'partial',sessionId:'toss_'+row.id,idempotencyKey:row.input.idempotencyKey,retryable:true,resumeBody:{resumeSessionId:'toss_'+row.id}},202);}
 }
 const response=await relationshipSukuyoRequest(request,url,path,state,save,now);
 for(const row of state.intents.values())if(['relationship','sukuyo'].includes(row.service)){if(!row.createdAt)row.createdAt=now().toISOString();if(row.result&&!row.generationCount)row.generationCount=1;}save();
 return response;
}
