import {TOSS_TAROT_LIBRARY_FLOWS} from '../../../../lib/tarot/toss-library-flows.mjs';
import {resolveOracleConsultationTier} from '../../../../lib/tarot/oracle-consultation-pricing.mjs';
import {tarotResultPath} from '../../../../lib/tarot/toss-library-links.mjs';
import {TAROT_CARDS} from '../../../../lib/tarot/tarot-cards.mjs';

const paid=TOSS_TAROT_LIBRARY_FLOWS.filter(flow=>['oracle','celestial','mindscan','relationship'].includes(flow.resultKind));
export const mockTarotProducts=paid.flatMap(flow=>flow.featureKeys.map(featureKey=>({id:flow.id,name:flow.name,sku:'mock-'+featureKey,featureKey,approvedPriceKRW:1})));
export const mockTarotSdk=mockTarotProducts.map(p=>({...p,type:'CONSUMABLE',displayName:p.name,displayAmount:'1원',description:'가상 결제',iconUrl:''}));
// The emulator prefixes its UUID; production Toss result URLs accept the UUID itself.
const routeId=id=>id.replace(/^(?:mock-order-|private-order-[AB]-)/, '');
const rows=state=>[...state.intents.values()].filter(row=>row.service==='tarot-library');
export const mockTarotLibrary=state=>rows(state).map(row=>({serviceId:'tarot-library',orderId:routeId(row.orderId),productId:'tarot-library:'+row.flow.id,selectionId:row.flow.id,requestId:'toss-tarot:'+row.orderId,sku:row.product.sku,createdAt:row.createdAt,status:'PURCHASED',state:row.result?'COMPLETED':'PENDING',completedSections:row.result?1:0,totalSections:1}));
export const mockTarotRecords=state=>rows(state).map(row=>({id:row.orderId,key:row.orderId,group:'report',source:'tarot-library',serviceId:'tarot-library',serviceName:row.flow.name,title:row.input.question,question:row.input.question,createdAt:row.createdAt,status:row.result?'completed':'generating',href:tarotResultPath(routeId(row.orderId))}));
export async function mockTarotRequest(request,path,state,save){
  if(!path.startsWith('/tarot-library/'))return null;
  if(path==='/tarot-library/orders/grant'){
    const {orderId,sku,input}=await request.json(),product=mockTarotProducts.find(item=>item.sku===sku);
    if(!product||state.orders.has(orderId)&&state.testOrderSkus.get(orderId)!==sku)return Response.json({error:'ORDER_MISMATCH'},{status:403});
    const flow=paid.find(row=>row.id===product.id);
    if(flow.resultKind==='oracle'&&resolveOracleConsultationTier(input.cards.length).featureKey!==product.featureKey)return Response.json({error:'TAROT_TIER_MISMATCH'},{status:422});
    if(!state.orders.has(orderId)){state.orders.set(orderId,orderId);state.testOrderSkus.set(orderId,sku);state.intents.set(orderId,{service:'tarot-library',orderId,flow,product,input,createdAt:new Date().toISOString(),steps:0});save();}
    return Response.json({orderId,requestId:'toss-tarot:'+orderId,entitlement:'granted',durable:true});
  }
  const id=path.split('/').at(-1),row=rows(state).find(item=>routeId(item.orderId)===routeId(id));
  if(!row||row.service!=='tarot-library')return Response.json({error:'RESULT_NOT_FOUND'},{status:404});
  if(request.method==='POST'&&!row.result&&++row.steps===2){
    const {input,flow}=row;
    const cards=(input.cards||input.picks.map((slot,i)=>({cardId:TAROT_CARDS[slot].code,position:'slot_'+i,positionLabel:flow.positions[i][1],orientation:'upright'}))).map(card=>({...TAROT_CARDS.find(item=>item.code===card.cardId),...card}));
    row.result={flowId:flow.id,title:flow.name,question:input.question,spreadId:input.spreadId,cards,renderer:flow.resultKind,presentation:{opening:'',summary:'[테스트 전용] 모의 결과',sections:cards.map(card=>({title:card.positionLabel,body:'[테스트 전용] '+card.nameKo+' 원문'})),actions:[]}};
  }
  save();
  return Response.json({state:row.result?'completed':'partial',flowId:row.flow.id,featureKey:row.product.featureKey,canRetryNow:!row.result,result:row.result||null});
}
