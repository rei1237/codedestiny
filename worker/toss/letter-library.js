import {libraryPage} from './library.js';
import {TossError} from './policy.js';
import {requestMatchesPurchase} from './services.js';

// A paid letter appears only after the owner's matching order is rechecked.
// Unassigned rights remain in purchase recovery until the buyer chooses input.
export async function letterLibraryPage(rows,read,verify){
 const snapshots=new Map();
 const page=await libraryPage(rows,async id=>{
  const saved=await read(id),purchase=rows.find(row=>row.requestId===id);
  if(saved&&requestMatchesPurchase(saved,purchase))snapshots.set(id,saved);
  return saved;
 },undefined,undefined,verify);
 if(page.purchases.some(row=>row.state==='READ_FAILED'))throw new TossError('RECORDS_UNAVAILABLE',503);
 return {ok:true,consultations:page.purchases.flatMap(purchase=>{
  if(purchase.status==='REFUNDED'||purchase.state==='REFUNDED'||!purchase.requestId)return [];
  const row=snapshots.get(purchase.requestId);
  if(!row||row.persona!=='yeoni'||!/^chat_(saju|ziwei|sukuyo|vedic|astrology|tarot)$/.test(row.productId))return [];
  return [{id:purchase.requestId,persona:'yeoni',state:purchase.state,paid:true,perUseSource:'',
   domain:row.snapshot?.product?.systems?.[0]||row.productId.slice(5),completedChapters:purchase.completedSections,
   totalChapters:purchase.totalSections||0,question:String(row.snapshot?.analysis?.consultation?.question||'').slice(0,300),createdAt:purchase.createdAt}];
 }),nextCursor:page.nextCursor};
}
