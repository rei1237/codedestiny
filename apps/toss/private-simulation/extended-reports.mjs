import {syntheticZiweiDeep,mockZiweiDeepRequest,mockZiweiDeepLibrary} from '../test/offline/ziwei-deep.mjs';
import {syntheticCompass,mockCompassRequest,mockCompassLibrary} from '../test/offline/compass.mjs';
import {syntheticYoga,mockYogaRequest,mockYogaLibrary} from '../test/offline/yoga.mjs';
import {syntheticNakshatra,mockNakshatraRequest,mockNakshatraLibrary} from '../test/offline/nakshatra-ai.mjs';

const families={
 'ziwei-deep':{product:syntheticZiweiDeep,request:mockZiweiDeepRequest,library:mockZiweiDeepLibrary},
 compass:{product:syntheticCompass,request:mockCompassRequest,library:mockCompassLibrary},
 yoga:{product:syntheticYoga,request:mockYogaRequest,library:mockYogaLibrary},
 nakshatra:{product:syntheticNakshatra,request:mockNakshatraRequest,library:mockNakshatraLibrary},
};
export const extendedProducts=Object.values(families).map(row=>row.product);
export const extendedLibrary=state=>Object.values(families).flatMap(row=>row.library(state));
export function extendedRecords(url,state){
 const group=url.searchParams.get('group'),source=url.searchParams.get('source'),q=url.searchParams.get('q')?.trim();
 return extendedLibrary(state).map(item=>{const row=state.intents.get(item.requestId),product=families[row.service].product;const question=row.input.question||row.input.mood||product.name;
  return {id:row.id,key:row.service+':'+row.id,group:'report',source:row.service,serviceId:row.service,serviceName:product.name,title:question,question,createdAt:row.createdAt,status:row.result?'completed':'generating',href:item.href,nativeHref:item.href};
 }).filter(row=>(!group||group==='all'||group===row.group)&&(!source||source==='all'||source===row.source)&&(!q||row.question.includes(q)));
}
// Caller authenticates the account and checks the private order's owner prefix.
export async function extendedRequest(request,url,path,state,save,now,delay=1100){
 const service=/^\/native\/([^/]+)\/(?:prepare|(?:intents|results)\/[a-f0-9]{64})$/.exec(path)?.[1];
 if(service&&families[service]){
  const response=await families[service].request(path,request,state,save,now,delay);
  const row=state.intents.get(path.split('/').at(-1));
  if(row?.result&&row.generationCount===undefined){row.generationCount=1;save();}
  return response;
 }
 if(!['/orders/grant','/orders/restore'].includes(path)||request.method!=='POST')return null;
 const {orderId,sku,requestId}=await request.json();
 if(!extendedProducts.some(product=>product.sku===sku))return null;
 const row=state.intents.get(requestId);
 if(!row||!families[row.service]||row.sku!==sku||!orderId)return Response.json({error:'ORDER_MISMATCH'},{status:403});
 if(row.orderId&&row.orderId!==orderId||state.orders.has(orderId)&&state.orders.get(orderId)!==row.id)return Response.json({error:'ORDER_MISMATCH'},{status:403});
 const oldPaid=row.paid,oldOrder=row.orderId,oldAssignment=state.orders.get(orderId);
 row.paid=true;row.orderId=orderId;state.orders.set(orderId,row.id);
 if(!save()){row.paid=oldPaid;row.orderId=oldOrder;if(oldAssignment===undefined)state.orders.delete(orderId);else state.orders.set(orderId,oldAssignment);return Response.json({error:'MOCK_STORAGE_UNAVAILABLE'},{status:503});}
 return Response.json({orderId,requestId:row.id,entitlement:'granted',durable:true});
}
