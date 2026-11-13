import {api,nativeSaleProducts,purchase} from './platform';
type Intent={id:string;paid:boolean;sku:string;orderId:string;amountKRW:number};
type Options={service:'nakshatra'|'yoga'|'compass';feature:string;input:unknown;orderId:string;sku?:string;isCurrent:()=>boolean;onCancel:(cleanup:()=>void)=>void};
export async function checkoutNativeInput({service,feature,input,orderId,sku,isCurrent,onCancel}:Options){
  const intent=await api<Intent>('/native/'+service+'/prepare',{input,...(orderId?{orderId}:{})});
  if(!isCurrent())return;
  if(orderId&&(!intent.paid||intent.orderId!==orderId))throw Error('ORDER_MISMATCH');
  if(!intent.paid){
    const item=(await nativeSaleProducts()).find(row=>row.featureKey===feature&&row.sku===intent.sku&&row.approvedPriceKRW===intent.amountKRW&&row.sku===sku);
    if(!isCurrent())return;if(!item)throw Error('PRICE_CHANGED');
    await new Promise<void>((resolve,reject)=>{onCancel(purchase(item,intent.id,resolve,reject));});
  }
  if(!isCurrent())return;
  const confirmed=await api<Intent>('/native/'+service+'/intents/'+intent.id);
  if(!isCurrent())return;if(!confirmed.paid||confirmed.id!==intent.id)throw Error('ORDER_MISMATCH');
  return intent.id;
}
