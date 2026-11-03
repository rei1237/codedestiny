import {SERVICE_AVAILABLE} from './release';
import {Environment,IAP,TossAuth,Storage,Share} from '@apps-in-toss/web-framework';
export const APP_NAME='ai-saju-studio';
const API='https://code-destiny.com/api/toss';
let token:string|null=null;
let sessionEpoch=0;
let loginAttempt=0;
let storageQueue:Promise<void>=Promise.resolve();
const sessionListeners=new Set<()=>void>();
export function onSessionInvalidated(listener:()=>void){sessionListeners.add(listener);return ()=>sessionListeners.delete(listener);}
function queueStorage(operation:()=>Promise<void>){const pending=storageQueue.then(operation,operation);storageQueue=pending.then(()=>{},()=>{});return pending;}
async function invalidateCurrentSession(requestToken:string|null,requestEpoch:number,requestAttempt:number){
  if(token!==requestToken||sessionEpoch!==requestEpoch||loginAttempt!==requestAttempt)throw new ApiError('SESSION_CHANGED','',409);
  if(!requestToken)return;
  const clearing=clearSession(false),invalidated=sessionEpoch;
  for(const listener of sessionListeners){if(token!==null||sessionEpoch!==invalidated||loginAttempt!==requestAttempt)break;try{listener();}catch{/* A UI observer cannot change the authentication result. */}}
  let cleanupError:unknown;
  try{await clearing;}catch(error){cleanupError=error;}
  if(token!==null||sessionEpoch!==invalidated||loginAttempt!==requestAttempt)throw new ApiError('SESSION_CHANGED','',409);
  if(cleanupError instanceof ApiError&&(cleanupError.status===401||cleanupError.status===403))throw cleanupError;
  if(typeof cleanupError==='object'&&cleanupError&&'status' in cleanupError&&(cleanupError.status===401||cleanupError.status===403)){
    const code='code' in cleanupError&&typeof cleanupError.code==='string'?cleanupError.code:cleanupError.status===403?'ACCESS_DENIED':'LOGIN_REQUIRED';
    throw new ApiError(code,'',cleanupError.status);
  }
}
export function isToss(){try{return ['toss','sandbox'].includes(Environment.environment);}catch{return false;}}
export class ApiError extends Error {constructor(public code:string,public errorId='',public status=0){super(code);}}
export async function api<T>(path:string,body?:unknown):Promise<T>{
  if(!SERVICE_AVAILABLE)throw new ApiError('TOSS_RELEASE_PENDING');
  const requestToken=token,requestEpoch=sessionEpoch,requestAttempt=loginAttempt;
  const response=await fetch(API+path,{method:body===undefined?'GET':'POST',credentials:'omit',
    headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(requestToken?{Authorization:`Bearer ${requestToken}`}:{})},
    ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(path.endsWith('/conversation')||body!==undefined&&path.startsWith('/tarot-library/results/')?75000:20000)});
  if(path!=='/login'&&(token!==requestToken||sessionEpoch!==requestEpoch))throw new ApiError('SESSION_CHANGED','',409);
  if(response.status===401){
    if(path!=='/login')await invalidateCurrentSession(requestToken,requestEpoch,requestAttempt);
    const invalidationEpoch=sessionEpoch,failure=await response.json().catch(()=>({}));
    if(path!=='/login'&&(sessionEpoch!==invalidationEpoch||loginAttempt!==requestAttempt))throw new ApiError('SESSION_CHANGED','',409);
    throw new ApiError(typeof failure.error==='string'?failure.error:'SESSION_EXPIRED',failure.errorId,401);
  }
  if(response.status===403){
    const failure=await response.json().catch(()=>({}));
    if(path!=='/login'&&(token!==requestToken||sessionEpoch!==requestEpoch))throw new ApiError('SESSION_CHANGED','',409);
    throw new ApiError(typeof failure.error==='string'?failure.error:'ACCESS_DENIED',failure.errorId,403);
  }
  const data=await response.json();
  if(path!=='/login'&&(token!==requestToken||sessionEpoch!==requestEpoch))throw new ApiError('SESSION_CHANGED','',409);
  if(!response.ok)throw new ApiError(data.error,data.errorId,response.status);
  return data;
}
function guardSessionResponse(response:Response,requestToken:string|null,requestEpoch:number,requestAttempt?:number){
  if(!response.body)return response;
  const reader=response.body.getReader();
  const current=()=>token===requestToken&&sessionEpoch===requestEpoch&&(requestAttempt===undefined||loginAttempt===requestAttempt);
  const stream=new ReadableStream<Uint8Array>({
    async pull(controller){
      if(!current()){void reader.cancel().catch(()=>{});controller.error(new ApiError('SESSION_CHANGED','',409));return;}
      try{const part=await reader.read();if(!current()){void reader.cancel().catch(()=>{});controller.error(new ApiError('SESSION_CHANGED','',409));return;}if(part.done)controller.close();else controller.enqueue(part.value);}
      catch(error){controller.error(error);}
    },
    cancel(reason){return reader.cancel(reason);},
  },{highWaterMark:0});
  return new Response(stream,{status:response.status,statusText:response.statusText,headers:response.headers});
}
/** Original screen contract, with Toss credentials only (never web cookies). */
export async function canonicalResponse(path:string,request:Request):Promise<Response>{
  if(!SERVICE_AVAILABLE)throw new ApiError('TOSS_RELEASE_PENDING','',503);
  if(!/^\/canonical\//.test(path)||!['GET','POST'].includes(request.method))throw new ApiError('NOT_FOUND','',404);
  const requestToken=token,requestEpoch=sessionEpoch,requestAttempt=loginAttempt;
  const response=await fetch(API+path,{method:request.method,credentials:'omit',
    headers:{'Content-Type':'application/json',...(requestToken?{Authorization:`Bearer ${requestToken}`}:{})},
    ...(request.method==='POST'?{body:await request.text()}:{}),signal:request.signal});
  if(token!==requestToken||sessionEpoch!==requestEpoch)throw new ApiError('SESSION_CHANGED','',409);
  if(response.status===401){await invalidateCurrentSession(requestToken,requestEpoch,requestAttempt);return guardSessionResponse(response,token,sessionEpoch,requestAttempt);}
  return guardSessionResponse(response,requestToken,requestEpoch);
}
export async function restoreSession(){
  if(!isToss())return false;
  await storageQueue;
  const startingEpoch=sessionEpoch,stored=await Storage.getItem('toss-session');
  if(sessionEpoch!==startingEpoch)return Boolean(token);
  token=stored;sessionEpoch++;
  if(!token)return false;
  try{await api('/session');return true;}catch(error){if(error instanceof ApiError&&error.status===401)return false;throw error;}
}
export async function login(){
  if(!isToss())throw new ApiError('TOSS_APP_REQUIRED');
  if(!SERVICE_AVAILABLE)throw new ApiError('TOSS_RELEASE_PENDING');
  const attempt=++loginAttempt;
  const code=await TossAuth.login();
  if(attempt!==loginAttempt)throw new ApiError('SESSION_CHANGED','',409);
  let session:{token:string};
  try{session=await api<{token:string}>('/login',code);}catch(error){if(attempt!==loginAttempt)throw new ApiError('SESSION_CHANGED','',409);throw error;}
  if(attempt!==loginAttempt)throw new ApiError('SESSION_CHANGED','',409);
  token=session.token;const writeEpoch=++sessionEpoch,sessionToken=token;
  try{await queueStorage(async()=>{if(sessionEpoch===writeEpoch)await Storage.setItem('toss-session',sessionToken);});}
  catch(error){
    let cleanupError:unknown,clearedEpoch:number|undefined;
    if(sessionEpoch===writeEpoch&&token===sessionToken){
      const clearing=clearSession(false),cleared=sessionEpoch;
      clearedEpoch=cleared;
      for(const listener of sessionListeners){if(token!==null||sessionEpoch!==cleared||loginAttempt!==attempt)break;try{listener();}catch{/* A UI observer cannot change the authentication result. */}}
      try{await clearing;}catch(failure){cleanupError=failure;}
    }
    if(attempt!==loginAttempt||sessionEpoch!==(clearedEpoch??writeEpoch))throw new ApiError('SESSION_CHANGED','',409);
    if(error instanceof ApiError&&(error.status===401||error.status===403))throw error;
    if(typeof error==='object'&&error&&'status' in error&&(error.status===401||error.status===403)){
      const code='code' in error&&typeof error.code==='string'?error.code:error.status===403?'ACCESS_DENIED':'LOGIN_REQUIRED';
      throw new ApiError(code,'',error.status);
    }
    if(cleanupError instanceof ApiError&&(cleanupError.status===401||cleanupError.status===403))throw cleanupError;
    if(typeof cleanupError==='object'&&cleanupError&&'status' in cleanupError&&(cleanupError.status===401||cleanupError.status===403)){
      const code='code' in cleanupError&&typeof cleanupError.code==='string'?cleanupError.code:cleanupError.status===403?'ACCESS_DENIED':'LOGIN_REQUIRED';
      throw new ApiError(code,'',cleanupError.status);
    }
    if(typeof error==='object'&&error&&'code' in error&&typeof error.code==='string')throw error;
    throw new ApiError('SESSION_STORAGE_FAILED');
  }
  if(attempt!==loginAttempt||sessionEpoch!==writeEpoch)throw new ApiError('SESSION_CHANGED','',409);
}
export async function clearSession(cancelPendingLogin=true){if(cancelPendingLogin)loginAttempt++;token=null;const clearEpoch=++sessionEpoch;if(isToss())await queueStorage(async()=>{if(sessionEpoch===clearEpoch)await Storage.removeItem('toss-session');});return clearEpoch;}
export async function unlinkCurrentSession(){
  const unlinkEpoch=sessionEpoch,unlinkAttempt=loginAttempt;
  const result=await api<{remoteUnlink:string}>('/unlink',{});
  if(sessionEpoch!==unlinkEpoch||loginAttempt!==unlinkAttempt)throw new ApiError('SESSION_CHANGED','',409);
  const cleared=await clearSession();
  if(token!==null||sessionEpoch!==cleared||loginAttempt!==unlinkAttempt+1)throw new ApiError('SESSION_CHANGED','',409);
  return result;
}
export async function logout(){const logoutEpoch=sessionEpoch,logoutAttempt=++loginAttempt;try{await api('/logout',{});}finally{if(sessionEpoch!==logoutEpoch||loginAttempt!==logoutAttempt)throw new ApiError('SESSION_CHANGED','',409);const cleared=await clearSession(false);if(token!==null||sessionEpoch!==cleared||loginAttempt!==logoutAttempt)throw new ApiError('SESSION_CHANGED','',409);}}
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
function pausePaymentMedia(){
  if(typeof document==='undefined')return ()=>{};
  const playing=Array.from(document.querySelectorAll<HTMLMediaElement>('audio,video')).filter(media=>!media.paused);
  playing.forEach(media=>media.pause());
  let restored=false,waiting=false;
  const restore=()=>{if(restored||document.visibilityState!=='visible')return;restored=true;if(waiting)document.removeEventListener('visibilitychange',restore);playing.forEach(media=>{if(media.isConnected&&media.paused)void media.play().catch(()=>{});});};
  return ()=>{if(restored||waiting)return;if(document.visibilityState==='visible')restore();else{waiting=true;document.addEventListener('visibilitychange',restore);}};
}
function recoverySupported(){
  try{return IAP.getPendingOrders.isSupported()&&IAP.completeProductGrant.isSupported();}catch{return false;}
}
function requireRecoveryReady(){
  if(paymentInFlight)throw new ApiError('PAYMENT_IN_PROGRESS');
  if(paymentUncertain)throw new ApiError('PAYMENT_STATUS_UNCERTAIN');
  if(!recoverySupported())throw new ApiError('IAP_NOT_SUPPORTED');
  if(recoveryInFlight?.token===token)throw new ApiError('RECOVERY_IN_PROGRESS');
  if(recoveryState?.token!==token||recoveryState.state!=='ready')throw new ApiError('RECOVERY_REQUIRED');
}
let paymentInFlight:symbol|null=null;
let paymentUncertain=false;
export function purchase(product:SaleProduct,requestId:string,onDone:()=>void,onError:(error:unknown)=>void){
  if(!SERVICE_AVAILABLE)throw new ApiError('TOSS_RELEASE_PENDING');
  if(!isToss())throw new ApiError('TOSS_APP_REQUIRED');
  requireRecoveryReady();
  if(!IAP.createOneTimePurchaseOrder.isSupported())throw new ApiError('IAP_NOT_SUPPORTED');
  let unsubscribe:()=>void=()=>{},granted=false,settled=false,cleaned=false,grantStarted=false;
  const requestToken=token,requestEpoch=sessionEpoch;
  const attempt=paymentInFlight=Symbol('purchase');
  let resumeMedia:()=>void;
  try{resumeMedia=pausePaymentMedia();}catch(error){if(paymentInFlight===attempt)paymentInFlight=null;throw error;}
  const blockRecovery=()=>{if(token===requestToken&&sessionEpoch===requestEpoch)recoveryState={token,state:'blocked'};};
  const clean=()=>{if(cleaned)return;cleaned=true;if(!settled){settled=true;paymentUncertain=true;blockRecovery();}if(paymentInFlight===attempt)paymentInFlight=null;unsubscribe();resumeMedia();};
  const fail=(error:unknown)=>{if(settled)return;settled=true;const canceled=typeof error==='object'&&error&&'code' in error&&error.code==='USER_CANCELED';if(grantStarted||!canceled){paymentUncertain=true;blockRecovery();}clean();onError(grantStarted&&canceled?new ApiError('PAYMENT_STATUS_UNCERTAIN'):error);};
  try{unsubscribe=IAP.createOneTimePurchaseOrder({options:{sku:product.sku,processProductGrant:async({orderId})=>{
    if(settled)return false;
    grantStarted=true;
    granted=false;
    try{const receipt=await api<Receipt>('/orders/grant',{sku:product.sku,orderId,requestId});granted=!settled&&validReceipt(receipt,orderId)&&receipt.requestId===requestId;return granted;}
    catch(error){fail(error);return false;}
  }},onEvent:()=>{if(settled)return;settled=true;if(!granted){paymentUncertain=true;blockRecovery();}clean();if(token!==requestToken||sessionEpoch!==requestEpoch)onError(new ApiError('SESSION_CHANGED','',409));else if(granted)onDone();else onError(new ApiError('GRANT_NOT_DURABLE'));},onError:fail});if(cleaned)unsubscribe();}catch(error){if(!settled){paymentUncertain=true;blockRecovery();}settled=true;clean();throw error;}
  return ()=>clean();
}
export function purchaseTarotLibrary(product:TarotLibraryProduct,input:unknown,onDone:(orderId:string)=>void,onError:(error:unknown)=>void){
  if(!SERVICE_AVAILABLE)throw new ApiError('TOSS_RELEASE_PENDING');
  if(!isToss())throw new ApiError('TOSS_APP_REQUIRED');
  requireRecoveryReady();
  if(!IAP.createOneTimePurchaseOrder.isSupported())throw new ApiError('IAP_NOT_SUPPORTED');
  let unsubscribe:()=>void=()=>{},grantedOrder='',settled=false,cleaned=false,grantStarted=false;
  const requestToken=token,requestEpoch=sessionEpoch;
  const attempt=paymentInFlight=Symbol('purchase');
  let resumeMedia:()=>void;
  try{resumeMedia=pausePaymentMedia();}catch(error){if(paymentInFlight===attempt)paymentInFlight=null;throw error;}
  const blockRecovery=()=>{if(token===requestToken&&sessionEpoch===requestEpoch)recoveryState={token,state:'blocked'};};
  const clean=()=>{if(cleaned)return;cleaned=true;if(!settled){settled=true;paymentUncertain=true;blockRecovery();}if(paymentInFlight===attempt)paymentInFlight=null;unsubscribe();resumeMedia();};
  const fail=(error:unknown)=>{if(settled)return;settled=true;const canceled=typeof error==='object'&&error&&'code' in error&&error.code==='USER_CANCELED';if(grantStarted||!canceled){paymentUncertain=true;blockRecovery();}clean();onError(grantStarted&&canceled?new ApiError('PAYMENT_STATUS_UNCERTAIN'):error);};
  try{unsubscribe=IAP.createOneTimePurchaseOrder({options:{sku:product.sku,processProductGrant:async({orderId})=>{
    if(settled)return false;
    grantStarted=true;
    grantedOrder='';
    try{const receipt=await api<Receipt>('/tarot-library/orders/grant',{sku:product.sku,orderId,input});const granted=!settled&&validReceipt(receipt,orderId);grantedOrder=granted?orderId:'';return granted;}
    catch(error){fail(error);return false;}
  }},onEvent:()=>{if(settled)return;settled=true;if(!grantedOrder){paymentUncertain=true;blockRecovery();}clean();if(token!==requestToken||sessionEpoch!==requestEpoch)onError(new ApiError('SESSION_CHANGED','',409));else if(grantedOrder)onDone(grantedOrder);else onError(new ApiError('GRANT_NOT_DURABLE'));},onError:fail});if(cleaned)unsubscribe();}catch(error){if(!settled){paymentUncertain=true;blockRecovery();}settled=true;clean();throw error;}
  return ()=>clean();
}
type RecoveryCounts={recovered:number;failed:number;denied:number};
export function recoveryNotice(counts:RecoveryCounts):string{
  if(!counts.recovered&&!counts.failed&&!counts.denied)return '';
  return `${counts.recovered}건 복구, ${counts.failed}건 확인 필요.${counts.denied?` ${counts.denied}건은 접근 권한 확인이 필요해요. 구매한 계정과 주문 내역을 확인해 주세요.`:''} 추가 결제 전에 기록 보관함을 확인해 주세요.`;
}
export async function recoverAfterAuthentication(authenticated:boolean):Promise<string>{
  return authenticated?recoveryNotice(await restorePurchases()):'';
}
let recoveryInFlight:{token:string|null;promise:Promise<RecoveryCounts>}|null=null;
let recoveryState:{token:string|null;state:'checking'|'ready'|'blocked'}|null=null;
export function restorePurchases():Promise<RecoveryCounts>{
  if(paymentInFlight)return Promise.reject(new ApiError('PAYMENT_IN_PROGRESS'));
  if(recoveryInFlight?.token===token)return recoveryInFlight.promise;
  const sessionToken=token;
  recoveryState={token:sessionToken,state:'checking'};
  const promise=restorePurchasesOnce(sessionToken);
  recoveryInFlight={token:sessionToken,promise};
  void promise.then(counts=>{if(recoveryInFlight?.promise===promise){recoveryState={token:sessionToken,state:counts.failed||counts.denied?'blocked':'ready'};recoveryInFlight=null;}},()=>{if(recoveryInFlight?.promise===promise){recoveryState={token:sessionToken,state:'blocked'};recoveryInFlight=null;}});
  return promise;
}
async function restorePurchasesOnce(sessionToken:string|null):Promise<RecoveryCounts>{
  if(!isToss())throw new ApiError('TOSS_APP_REQUIRED');
  if(!recoverySupported())throw new ApiError('IAP_NOT_SUPPORTED');
  const pending=await IAP.getPendingOrders();
  if(!pending||!Array.isArray(pending.orders))throw new ApiError('RECOVERY_STATUS_UNAVAILABLE');
  let recovered=0,failed=0,denied=0;
  for(const order of pending?.orders||[]){
    try{
      if(token!==sessionToken)throw new ApiError('SESSION_CHANGED','',409);
      const receipt=await api<Receipt>('/orders/restore',{orderId:order.orderId,sku:order.sku});
      if(token!==sessionToken)throw new ApiError('SESSION_CHANGED','',409);
      if(!validReceipt(receipt,order.orderId))throw new ApiError('GRANT_NOT_DURABLE');
      if(!await IAP.completeProductGrant({params:{orderId:order.orderId}}))throw new ApiError('GRANT_ACK_PENDING');
      recovered++;
    }catch(error){if(token!==sessionToken)throw new ApiError('SESSION_CHANGED','',409);if(error instanceof ApiError&&error.status===401)throw error;if(typeof error==='object'&&error&&'code' in error&&error.code==='UNSUPPORTED_APP_VERSION')throw error;if(error instanceof ApiError&&error.status===403)denied++;else failed++;}
  }
  return {recovered,failed,denied};
}
export async function shareService(){
  const link=await Share.createLink({path:`intoss://${APP_NAME}/?source=share`});
  await Share.sendMessage({message:`영냥이와 내 고민의 흐름을 살펴보세요. ${link}`});
  // Resolution means the SDK call returned, not proof that a recipient received a share.
}
export function event(name:string,fields:Record<string,unknown>={}){if(!SERVICE_AVAILABLE||!isToss())return;void api('/events',{event:name,fields}).catch(()=>{});}
