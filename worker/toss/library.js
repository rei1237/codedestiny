import {TossError,validateOrderId} from './policy.js';
import {consultationSelection,requestMatchesService} from './services.js';
export const LIBRARY_PAGE_SIZE=50;
export function libraryFilter(auth,cursor){
  const filter={identityId:auth._id,environment:auth.environment};
  if(!cursor)return filter;
  if(typeof cursor!=='string'||cursor.length!==61)throw new TossError('LIBRARY_CURSOR_INVALID');
  const stamp=cursor.slice(0,24),id=cursor.slice(25);
  const date=new Date(stamp);
  if(cursor[24]!==','||!Number.isFinite(date.getTime())||date.toISOString()!==stamp)throw new TossError('LIBRARY_CURSOR_INVALID');
  validateOrderId(id);
  return {...filter,$or:[{grantedAt:{$lt:date}},{grantedAt:date,_id:{$lt:id}}]};
}
export async function libraryPage(rows,read,readTarot=async()=>null){
  const page=rows.slice(0,LIBRARY_PAGE_SIZE);
  const purchases=await Promise.all(page.map(async row=>{
    if(row.tarotFlowId){
      let execution=null,state='READ_FAILED';
      try { execution=await readTarot(row);state=execution?.status||'READ_FAILED'; } catch {/* A paid tarot record must not become an unassigned purchase. */}
      if(row.status==='REFUNDED')state='REFUNDED';
      return {orderId:row._id,sku:row.sku,productId:row.productId,serviceId:'tarot-library',selectionId:row.tarotFlowId,requestId:execution?.requestId||row.requestId,
        status:row.status,state,completedSections:state==='completed'?1:0,totalSections:1,createdAt:row.grantedAt};
    }
    let result=null,state=row.requestId?'READ_FAILED':'UNASSIGNED';
    if(row.requestId){
      try{
        const saved=await read(row.requestId);
        if(saved&&requestMatchesService(saved,row)){result=saved;state=saved.state;}
      }catch{/* Keep the verified purchase visible; a read failure is never a fresh entitlement. */}
    }
    if(row.status==='REFUNDED')state='REFUNDED';
    return {orderId:row._id,sku:row.sku,productId:row.productId,serviceId:row.serviceId||'yeongnyangi',selectionId:consultationSelection(row),requestId:row.requestId,status:row.status,
      createdAt:row.grantedAt,state,completedSections:result?.chapters?.length??0,totalSections:result?.snapshot?.manifest?.length??null};
  }));
  const last=page.at(-1);
  return {purchases,nextCursor:rows.length>LIBRARY_PAGE_SIZE&&last?`${new Date(last.grantedAt).toISOString()},${last._id}`:null};
}
