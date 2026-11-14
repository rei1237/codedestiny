// Private simulation only: synthetic chart + explicitly labelled 18-chapter text.
import {privateHumanDesign} from './human-design.mjs';
import {reportContents} from '../../../lib/human-design/report-sections.js';
export const humanDesignProducts=[{id:'native:human-design:human-design-report',name:'가상 휴먼 디자인 프리미엄 리포트',featureKey:'human-design-report',sku:'mock-unregistered-human-design',available:true,approvedPriceKRW:1}];
const product=humanDesignProducts[0],service='human-design';
const json=(data,status=200)=>Response.json(data,{status});
const fail=(error,status=400)=>json({ok:false,error,reason:error},status);
const paid=(state,row)=>row?.paid&&state.orders.get(row.orderId)===row.id;
export async function humanDesignReportRequest(request,url,path,state,save,now){
 if(['/orders/grant','/orders/restore'].includes(path)&&request.method==='POST'){
  const {orderId,sku,requestId}=await request.clone().json();if(sku!==product.sku)return null;
  const row=state.intents.get(requestId);
  if(!orderId||row?.service!==service||row.sku!==sku)return fail('ORDER_MISMATCH',403);
  if(row.orderId&&row.orderId!==orderId||state.orders.has(orderId)&&state.orders.get(orderId)!==row.id)return fail('ORDER_ALREADY_ASSIGNED',409);
  const before={orderId:row.orderId,paid:row.paid};row.orderId=orderId;row.paid=true;state.orders.set(orderId,row.id);
  if(!save()){Object.assign(row,before);state.orders.delete(orderId);return fail('STORAGE_UNAVAILABLE',503);}
  return json({orderId,requestId,entitlement:'granted',durable:true});
 }
 if(!path.startsWith('/native/human-design/'))return null;
 if(path==='/native/human-design/prepare'&&request.method==='POST'){
  const {input,orderId}=await request.json();
  if(!/^human-design-[a-f0-9-]{36}$/.test(input?.requestId||''))return fail('INVALID_INPUT');
  const validation=await privateHumanDesign(input.birth);if(!validation.ok)return validation;
  const previous=[...state.intents.values()].find(row=>row.service===service&&row.input.requestId===input.requestId);
  if(previous&&JSON.stringify(previous.input)!==JSON.stringify(input))return fail('REQUEST_INPUT_MISMATCH',409);
  if(orderId&&(!previous||previous.orderId!==orderId||!paid(state,previous)))return fail('RESULT_NOT_FOUND',404);
  if(previous)return json(previous);
  const id=(++state.sequence).toString(16).padStart(64,'0');
  const row={id,service,sku:product.sku,amountKRW:1,input,paid:false,orderId:null,createdAt:now().toISOString(),generationCount:0};
  state.intents.set(id,row);if(!save()){state.intents.delete(id);return fail('STORAGE_UNAVAILABLE',503);}return json(row);
 }
 const match=/^\/native\/human-design\/(intents|results)\/([a-f0-9]{64})$/.exec(path),row=match&&state.intents.get(match[2]);
 if(!row||row.service!==service)return fail('RESULT_NOT_FOUND',404);
 if(match[1]==='intents'&&request.method==='GET')return json(row);
 if(match[1]!=='results'||!['GET','POST'].includes(request.method))return fail('NOT_FOUND',404);
 if(!paid(state,row))return fail('PAYMENT_REQUIRED',402);
 if(!row.result&&request.method==='POST'){
  const {chart}=await (await privateHumanDesign(row.input.birth)).json();
  const body='[모의 결과 · 실제 해석 아님] 저장·재열람과 18개 챕터의 화면을 확인하는 예시 문장입니다.';
  const sections=reportContents('ko').map(entry=>({...entry,body,subsections:[],keyPoints:[body],evidence:[]}));
  row.result={ok:true,reportId:'private-human-design:'+row.id,contractVersion:'human-design-report-v1',locale:'ko',status:'completed',degraded:false,chart,sections,progress:{completed:18,total:18},totalChars:sections.length*body.length};
  row.generationCount++;
  if(!save()){delete row.result;row.generationCount--;return fail('STORAGE_UNAVAILABLE',503);}
 }
 return row.result?json(row.result):json({ok:true,status:'generating',sections:[],progress:{completed:0,total:18}},202);
}
export function humanDesignRecords(url,state){
 const group=url.searchParams.get('group'),source=url.searchParams.get('source'),query=url.searchParams.get('q')?.trim();
 const title='[모의] 휴먼 디자인 프리미엄 리포트';
 if(group&&group!=='all'&&group!=='report'||source&&source!=='all'&&source!==service||query&&!title.includes(query))return [];
 return [...state.intents.values()].filter(row=>row.service===service&&paid(state,row)).map(row=>({id:row.id,key:service+':'+row.id,group:'report',source:service,serviceId:service,serviceName:title,title,question:title,createdAt:row.createdAt,status:row.result?'completed':'generating',href:'/human-design/report/?intentId='+row.id,nativeHref:'/human-design/report/?intentId='+row.id}));
}
export function humanDesignPurchases(state){
 return [...state.intents.values()].filter(row=>row.service===service&&paid(state,row)).map(row=>({orderId:row.orderId,requestId:row.id,sku:row.sku,productId:product.id,featureKey:product.featureKey,serviceId:service,nativeService:service,status:'PURCHASED',state:row.result?'COMPLETED':'PENDING',createdAt:row.createdAt,href:'/human-design/report/?intentId='+row.id}));
}
