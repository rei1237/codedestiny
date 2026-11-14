import {mockTarotProducts,mockTarotRequest} from '../test/offline/paid-tarot.mjs';
import {privateTarotUuid} from './tarot-links.mjs';
export const privateTarotProducts=mockTarotProducts;
const fail=(error,status)=>Response.json({error},{status});
// The caller must authenticate and enforce private-order-[account]-UUID on grants/restores.
export async function privateTarotRequest(request,path,state,save){
 if(path==='/tarot-library/catalog'&&request.method==='GET')return Response.json({flows:privateTarotProducts});
 if(!path.startsWith('/tarot-library/')&&path!=='/orders/restore')return null;
 state.testOrderSkus=new Map([...state.intents.values()].filter(row=>row.service==='tarot-library').map(row=>[row.orderId,row.product.sku]));
 if(path==='/tarot-library/orders/grant'||path==='/orders/restore'){
  const body=await request.json(),product=privateTarotProducts.find(p=>p.sku===body.sku);
  if(!product)return path==='/orders/restore'?null:fail('ORDER_MISMATCH',403);
  const previous=state.intents.get(body.orderId);
  if(path==='/orders/restore'){
   if(!previous||previous.service!=='tarot-library'||previous.product.sku!==body.sku||state.orders.get(body.orderId)!==body.orderId)return fail('RESULT_NOT_FOUND',404);
   return Response.json({orderId:body.orderId,requestId:'toss-tarot:'+body.orderId,entitlement:'granted',durable:true});
  }
  if(!/^private-order-[AB]-[a-f\d-]{36}$/i.test(body.orderId||''))return fail('ORDER_MISMATCH',403);
  if(previous&&(previous.service!=='tarot-library'||previous.product.sku!==body.sku))return fail('ORDER_MISMATCH',403);
  if(previous&&JSON.stringify(previous.input)!==JSON.stringify(body.input))return fail('REQUEST_INPUT_MISMATCH',409);
  if(typeof body.input?.question!=='string'||body.input.question.length>600||(!Array.isArray(body.input.cards)&&!Array.isArray(body.input.picks)))return fail('TAROT_LIBRARY_INPUT_INVALID',422);
  return mockTarotRequest(new Request(request.url,{method:'POST',body:JSON.stringify(body)}),path,state,save);
 }
 const normalized=path.startsWith('/tarot-library/results/')?'/tarot-library/results/'+privateTarotUuid(path.slice('/tarot-library/results/'.length)):path;
 const match=/^\/tarot-library\/results\/([a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12})$/i.exec(normalized);
 if(!match||!['GET','POST'].includes(request.method))return fail('RESULT_NOT_FOUND',404);
 const row=[...state.intents.values()].find(row=>row.service==='tarot-library'&&privateTarotUuid(row.orderId)===match[1]);
 if(!row||state.orders.get(row.orderId)!==row.orderId)return fail('RESULT_NOT_FOUND',404);
 // The original fixture understands its stored full order. UUID resolution above is owner-scoped.
 const response=await mockTarotRequest(request,'/tarot-library/results/'+row.orderId,state,save);
 if(row.result&&row.generationCount===undefined){row.generationCount=1;save();}
 return response;
}
