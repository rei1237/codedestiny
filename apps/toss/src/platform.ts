import {SERVICE_AVAILABLE} from './release';
import {Environment,IAP,TossAuth,Storage,Share} from '@apps-in-toss/web-framework';
export const APP_NAME='ai-saju-studio';
const API='https://code-destiny.com/api/toss';
let token:string|null=null;
export function isToss(){try{return ['toss','sandbox'].includes(Environment.environment);}catch{return false;}}
export class ApiError extends Error {constructor(public code:string,public errorId='',public status=0){super(code);}}
export async function api<T>(path:string,body?:unknown):Promise<T>{
  if(!SERVICE_AVAILABLE)throw new ApiError('TOSS_RELEASE_PENDING');
  const response=await fetch(API+path,{method:body===undefined?'GET':'POST',credentials:'omit',
    headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(token?{Authorization:`Bearer ${token}`}:{})},
    ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(path.endsWith('/conversation')||body!==undefined&&path.startsWith('/tarot-library/results/')?75000:20000)});
  const data=await response.json();
  if(!response.ok){if(response.status===401)await clearSession();throw new ApiError(data.error,data.errorId,response.status);}
  return data;
}
/** Original screen contract, with Toss credentials only (never web cookies). */
export async function canonicalResponse(path:string,request:Request):Promise<Response>{
  if(!SERVICE_AVAILABLE)throw new ApiError('TOSS_RELEASE_PENDING','',503);
  if(!/^\/canonical\//.test(path)||!['GET','POST'].includes(request.method))throw new ApiError('NOT_FOUND','',404);
  const response=await fetch(API+path,{method:request.method,credentials:'omit',
    headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},
    ...(request.method==='POST'?{body:await request.text()}:{}),signal:request.signal});
  if(response.status===401)await clearSession();
  return response;
}
export async function restoreSession(){
  if(!isToss())return false;
  token=await Storage.getItem('toss-session');
  if(!token)return false;
  try{await api('/session');return true;}catch(error){if(error instanceof ApiError&&error.status===401)return false;throw error;}
}
export async function login(){
  if(!isToss())throw new ApiError('TOSS_APP_REQUIRED');
  if(!SERVICE_AVAILABLE)throw new ApiError('TOSS_RELEASE_PENDING');
  const code=await TossAuth.login();
  const session=await api<{token:string}>('/login',code);
  token=session.token;await Storage.setItem('toss-session',token);
}
export async function clearSession(){token=null;if(isToss())await Storage.removeItem('toss-session');}
export async function logout(){try{await api('/logout',{});}finally{await clearSession();}}
export type CatalogProduct={id:string;name:string;sku:string;approvedPriceKRW:number;chapters:number;available:boolean};
export type SaleProduct=CatalogProduct&{displayAmount:string};
export async function saleProducts():Promise<SaleProduct[]>{
  if(!SERVICE_AVAILABLE||!isToss())return [];
  const [catalog,items]=await Promise.all([api<{products:CatalogProduct[]}>('/catalog'),IAP.getProductItemList()]);
  return catalog.products.flatMap(p=>{
    const item=items?.products.find(i=>i.sku===p.sku&&i.type==='CONSUMABLE');
    return item&&p.available?[{...p,displayAmount:item.displayAmount}]:[];
  });
}
export async function nativeSaleProducts():Promise<SaleProduct[]>{
  if(!SERVICE_AVAILABLE||!isToss())return [];
  const [catalog,items]=await Promise.all([api<{products:CatalogProduct[]}>('/native/catalog'),IAP.getProductItemList()]);
  return catalog.products.flatMap(product=>{
    const item=items?.products.find(row=>row.sku===product.sku&&row.type==='CONSUMABLE');
    return item&&product.available?[{...product,displayAmount:item.displayAmount}]:[];
  });
}
export type TarotLibraryProduct={id:string;name:string;sku:string;featureKey:string;approvedPriceKRW:number;displayAmount:string};
export async function tarotLibraryProducts():Promise<TarotLibraryProduct[]>{
  if(!SERVICE_AVAILABLE||!isToss())return [];
  const [catalog,items]=await Promise.all([api<{flows:Omit<TarotLibraryProduct,'displayAmount'>[]}>('/tarot-library/catalog'),IAP.getProductItemList()]);
  return catalog.flows.flatMap(flow=>{const item=items?.products.find(entry=>entry.sku===flow.sku&&entry.type==='CONSUMABLE');return item?[{...flow,displayAmount:item.displayAmount}]:[];});
}
type Receipt={orderId:string;requestId:string|null;entitlement:string;durable:boolean};
const validReceipt=(r:Receipt,id:string)=>r.orderId===id&&r.entitlement==='granted'&&r.durable===true;
export function purchase(product:SaleProduct,requestId:string,onDone:()=>void,onError:(error:unknown)=>void){
  if(!SERVICE_AVAILABLE)throw new ApiError('TOSS_RELEASE_PENDING');
  if(!isToss())throw new ApiError('TOSS_APP_REQUIRED');
  if(!IAP.createOneTimePurchaseOrder.isSupported())throw new ApiError('IAP_NOT_SUPPORTED');
  let clean:()=>void=()=>{},granted=false,settled=false;
  clean=IAP.createOneTimePurchaseOrder({options:{sku:product.sku,processProductGrant:async({orderId})=>{
    granted=false;
    try{const receipt=await api<Receipt>('/orders/grant',{sku:product.sku,orderId,requestId});granted=validReceipt(receipt,orderId)&&receipt.requestId===requestId;return granted;}
    catch(error){onError(error);return false;}
  }},onEvent:()=>{if(settled)return;settled=true;clean();if(granted)onDone();else onError(new ApiError('GRANT_NOT_DURABLE'));},onError:error=>{if(settled)return;settled=true;clean();onError(error);}});
  return ()=>clean();
}
export function purchaseTarotLibrary(product:TarotLibraryProduct,input:unknown,onDone:(orderId:string)=>void,onError:(error:unknown)=>void){
  if(!SERVICE_AVAILABLE)throw new ApiError('TOSS_RELEASE_PENDING');
  if(!isToss())throw new ApiError('TOSS_APP_REQUIRED');
  if(!IAP.createOneTimePurchaseOrder.isSupported())throw new ApiError('IAP_NOT_SUPPORTED');
  let clean:()=>void=()=>{},grantedOrder='',settled=false;
  clean=IAP.createOneTimePurchaseOrder({options:{sku:product.sku,processProductGrant:async({orderId})=>{
    grantedOrder='';
    try{const receipt=await api<Receipt>('/tarot-library/orders/grant',{sku:product.sku,orderId,input});const granted=validReceipt(receipt,orderId);grantedOrder=granted?orderId:'';return granted;}
    catch(error){onError(error);return false;}
  }},onEvent:()=>{if(settled)return;settled=true;clean();if(grantedOrder)onDone(grantedOrder);else onError(new ApiError('GRANT_NOT_DURABLE'));},onError:error=>{if(settled)return;settled=true;clean();onError(error);}});
  return ()=>clean();
}
export async function restorePurchases(){
  if(!isToss())throw new ApiError('TOSS_APP_REQUIRED');
  const pending=await IAP.getPendingOrders();
  let recovered=0,failed=0;
  for(const order of pending?.orders||[]){
    try{
      const receipt=await api<Receipt>('/orders/restore',{orderId:order.orderId,sku:order.sku});
      if(!validReceipt(receipt,order.orderId))throw new ApiError('GRANT_NOT_DURABLE');
      if(!await IAP.completeProductGrant({params:{orderId:order.orderId}}))throw new ApiError('GRANT_ACK_PENDING');
      recovered++;
    }catch{failed++;}
  }
  return {recovered,failed};
}
export async function shareService(){
  const link=await Share.createLink({path:`intoss://${APP_NAME}/?source=share`});
  await Share.sendMessage({message:`영냥이와 내 고민의 흐름을 살펴보세요. ${link}`});
  // Resolution means the SDK call returned, not proof that a recipient received a share.
}
export function event(name:string,fields:Record<string,unknown>={}){if(!SERVICE_AVAILABLE||!isToss())return;void api('/events',{event:name,fields}).catch(()=>{});}
