import {TossError,validateOrderId} from './policy.js';
import {consultationSelection,requestMatchesPurchase,tossFortuneAccessIssue} from './services.js';
export const LIBRARY_PAGE_SIZE=20;
function preserveAuthorizationError(error){
  if(error?.status===401||error?.status===403)throw error;
}
export function libraryFilter(auth,cursor){
  const filter={identityId:auth._id,ownerId:auth.ownerId,environment:auth.environment};
  if(!cursor)return filter;
  if(typeof cursor!=='string'||cursor.length!==61)throw new TossError('LIBRARY_CURSOR_INVALID');
  const stamp=cursor.slice(0,24),id=cursor.slice(25);
  const date=new Date(stamp);
  if(cursor[24]!==','||!Number.isFinite(date.getTime())||date.toISOString()!==stamp)throw new TossError('LIBRARY_CURSOR_INVALID');
  validateOrderId(id);
  return {...filter,$or:[{grantedAt:{$lt:date}},{grantedAt:date,_id:{$lt:id}}]};
}
export async function libraryPage(rows,read,readTarot=async()=>null,readNative=async()=>{throw new Error('NATIVE_READ_UNAVAILABLE');},verify=async()=>{throw new Error('ORDER_VERIFICATION_UNAVAILABLE');}){
  const page=rows.slice(0,LIBRARY_PAGE_SIZE);
  let active=0;const waiting=[];
  const withSlot=async task=>{if(active>=4)await new Promise(resolve=>waiting.push(resolve));else active++;try{return await task();}finally{const next=waiting.shift();if(next)next();else active--;}};
  const blocked=(row,state)=>({orderId:row._id,sku:row.sku,productId:row.productId,serviceId:row.serviceId||'yeongnyangi',nativeService:row.nativeService,featureKey:row.featureKey,selectionId:row.tarotFlowId||(!row.nativeService?consultationSelection(row):undefined),requestId:row.requestId,status:state==='REFUNDED'?'REFUNDED':row.status,createdAt:row.grantedAt,state,completedSections:0,totalSections:null});
  const purchases=await Promise.all(page.map(async row=>{
    if(row.status==='REFUNDED')return blocked(row,'REFUNDED');
    if(!(row.nativeService&&row.requestId)){try{await withSlot(()=>verify(row));}catch(error){preserveAuthorizationError(error);return blocked(row,error?.code==='ORDER_REFUNDED'?'REFUNDED':'READ_FAILED');}}
    if(row.nativeService){
      let saved={state:row.requestId?'READ_FAILED':'UNASSIGNED'};
      try{saved=await withSlot(()=>readNative(row));}catch(error){preserveAuthorizationError(error);if(error?.code==='ORDER_REFUNDED')return blocked(row,'REFUNDED');/* Keep the purchase visible without inventing a new entitlement. */}
      if(row.status==='REFUNDED')saved={state:'REFUNDED'};
      return {orderId:row._id,sku:row.sku,productId:row.productId,serviceId:row.serviceId,nativeService:row.nativeService,featureKey:row.featureKey,
        requestId:row.requestId,status:row.status,createdAt:row.grantedAt,...saved,completedSections:saved.state==='COMPLETED'?1:0,totalSections:1};
    }
    if(row.tarotFlowId){
      let execution=null,state='READ_FAILED';
      try { execution=await readTarot(row);state=execution?.status||'READ_FAILED'; } catch(error) {preserveAuthorizationError(error);/* A paid tarot record must not become an unassigned purchase. */}
      if(row.status==='REFUNDED')state='REFUNDED';
      return {orderId:row._id,sku:row.sku,productId:row.productId,serviceId:'tarot-library',selectionId:row.tarotFlowId,requestId:execution?.requestId||row.requestId,
        status:row.status,state,completedSections:state==='completed'?1:0,totalSections:1,createdAt:row.grantedAt};
    }
    let result=null,state=row.requestId?'READ_FAILED':'UNASSIGNED';
    if(row.requestId){
      try{
        const saved=await read(row.requestId);
        if(saved&&requestMatchesPurchase(saved,row)){
          const issue=tossFortuneAccessIssue(saved);
          if(issue)state=issue==='ORDER_REFUNDED'?'REFUNDED':'ACCESS_REVIEW';
          else {result=saved;state=saved.state;}
        }
      }catch(error){preserveAuthorizationError(error);/* Keep the verified purchase visible; a read failure is never a fresh entitlement. */}
    }
    if(row.status==='REFUNDED')state='REFUNDED';
    return {orderId:row._id,sku:row.sku,productId:row.productId,serviceId:row.serviceId||'yeongnyangi',selectionId:consultationSelection(row),requestId:row.requestId,status:row.status,
      createdAt:row.grantedAt,state,completedSections:result?.chapters?.length??0,totalSections:result?.snapshot?.manifest?.length??null};
  }));
  const last=page.at(-1);
  return {purchases,nextCursor:rows.length>LIBRARY_PAGE_SIZE&&last?`${new Date(last.grantedAt).toISOString()},${last._id}`:null};
}
