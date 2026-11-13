import {api,purchase,nativeSaleProducts,paymentRequiresReview} from '../src/platform';
import type {TossTeaPriceSelection} from '@/src/features/fortune-tea-house/lib/tossPriceSelection';
type Intent={id:string;sku:string;amountKRW:number;paid:boolean;orderId?:string};
export async function checkoutReport({service,feature,owner,input,orderId,price,current,onPurchase,preparedId,onPrepared}:{service:'naming'|'codex'|'palm';feature:string;owner:string;input:Record<string,unknown>;orderId:string|null;price:TossTeaPriceSelection|null;current:()=>boolean;onPurchase:(cancel:()=>void)=>void;preparedId?:string;onPrepared?:(id:string)=>void}){
  if(!owner||!current()||!orderId&&(paymentRequiresReview()||!price||price.owner!==owner||price.featureKey!==feature))throw Error('PURCHASE_UNAVAILABLE');
  const key='toss:'+service+'-attempt:'+owner;
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(service==='naming'?input.input:input)));
  const digest=Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
  const saved=JSON.parse(localStorage.getItem(key)||'{}');
  const requestId=saved.digest===digest&&typeof saved.id==='string'?saved.id:service+'-'+crypto.randomUUID();
  localStorage.setItem(key,JSON.stringify({digest,id:requestId}));
  const intent=preparedId?await api<Intent>('/native/'+service+'/intents/'+preparedId):await api<Intent>('/native/'+service+'/prepare',{input:{requestId,...input},...(orderId?{orderId}:{})});
  if(!current())return;
  onPrepared?.(intent.id);
  if(orderId&&(!intent.paid||intent.orderId!==orderId))throw Error('PURCHASE_RUN_MISMATCH');
  if(!intent.paid){
    const item=(await nativeSaleProducts()).find(p=>p.featureKey===feature&&p.sku===intent.sku&&p.approvedPriceKRW===intent.amountKRW);
    if(!current())return;
    if(!item||!price||price.sku!==item.sku||item.displayAmount!==price.displayAmount)throw Error('PRODUCT_PRICE_CHANGED');
    await new Promise<void>((done,fail)=>onPurchase(purchase(item,intent.id,done,fail)));
  }
  if(!current())return;
  const checked=await api<Intent>('/native/'+service+'/intents/'+intent.id);
  if(!current())return;
  if(!checked.paid||checked.id!==intent.id)throw Error('PURCHASE_RUN_MISMATCH');
  localStorage.removeItem(key);
  return intent.id;
}
