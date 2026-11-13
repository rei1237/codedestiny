import {NEW_PURCHASES_AVAILABLE,SERVICE_AVAILABLE} from './release';
import {Environment,IAP,TossAuth,Storage,Share,isMinVersionSupported} from '@apps-in-toss/web-framework';
export const APP_NAME='ai-saju-studio';
const API='https://code-destiny.com/api/toss';
let token:string|null=null;
let sessionEpoch=0;
export function getTossSessionRevision(){return sessionEpoch;}
export function hasTossSession(){return token!==null;}
const sessionRevisionListeners=new Set<()=>void>();
export function onTossSessionRevisionChanged(listener:()=>void){sessionRevisionListeners.add(listener);return ()=>sessionRevisionListeners.delete(listener);}
function advanceSessionRevision(){const revision=++sessionEpoch;for(const listener of [...sessionRevisionListeners]){if(sessionEpoch!==revision)break;if(!sessionRevisionListeners.has(listener))continue;try{listener();}catch{/* A UI observer cannot change the authentication result. */}}return revision;}
let loginAttempt=0;
export function getTossLoginAttempt(){return loginAttempt;}
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
function authorizationStatus(error:unknown){
  if(!error||typeof error!=='object')return 0;
  const issue=error as {status?:unknown;code?:unknown};
  if(issue.status===401||issue.status===403)return issue.status;
  if(issue.code==='ACCESS_DENIED')return 403;
  if(issue.code==='LOGIN_REQUIRED'||issue.code==='SESSION_EXPIRED')return 401;
  return 0;
}
function sdkVersionError(error:unknown){return !!error&&typeof error==='object'&&'code' in error&&error.code==='UNSUPPORTED_APP_VERSION';}
function responseErrorCode(value:unknown,fallback:string){
  if(!value||typeof value!=='object')return fallback;
  const issue=value as {error?:unknown;reason?:unknown};
  if(typeof issue.error==='string'&&issue.error)return issue.error;
  return typeof issue.reason==='string'&&/^[A-Z][A-Z0-9_]{0,79}$/.test(issue.reason)?issue.reason:fallback;
}
export async function api<T>(path:string,body?:unknown):Promise<T>{
  if(!SERVICE_AVAILABLE)throw new ApiError('TOSS_RELEASE_PENDING');
  const requestToken=token,requestEpoch=sessionEpoch,requestAttempt=loginAttempt;
  const response=await fetch(API+path,{method:body===undefined?'GET':'POST',credentials:'omit',
    headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(requestToken?{Authorization:`Bearer ${requestToken}`}:{})},
    ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(path.endsWith('/conversation')||body!==undefined&&(path.startsWith('/tarot-library/results/')||/^\/native\/pet\/intents\/[a-f0-9]{64}\/generate$/.test(path))?75000:20000)});
  if(path!=='/login'&&(token!==requestToken||sessionEpoch!==requestEpoch))throw new ApiError('SESSION_CHANGED','',409);
  if(response.status===401){
    if(path!=='/login')await invalidateCurrentSession(requestToken,requestEpoch,requestAttempt);
    const invalidationEpoch=sessionEpoch,failure=await response.json().catch(()=>({}));
    if(path!=='/login'&&(sessionEpoch!==invalidationEpoch||loginAttempt!==requestAttempt))throw new ApiError('SESSION_CHANGED','',409);
    throw new ApiError(responseErrorCode(failure,'SESSION_EXPIRED'),failure?.errorId,401);
  }
  if(response.status===403){
    const failure=await response.json().catch(()=>({}));
    if(path!=='/login'&&(token!==requestToken||sessionEpoch!==requestEpoch))throw new ApiError('SESSION_CHANGED','',409);
    throw new ApiError(responseErrorCode(failure,'ACCESS_DENIED'),failure?.errorId,403);
  }
  const data=await response.json();
  if(path!=='/login'&&(token!==requestToken||sessionEpoch!==requestEpoch))throw new ApiError('SESSION_CHANGED','',409);
  if(!response.ok)throw new ApiError(responseErrorCode(data,'REQUEST_FAILED'),data?.errorId,response.status);
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
  token=stored;const restoredEpoch=advanceSessionRevision();
  if(sessionEpoch!==restoredEpoch)return Boolean(token);
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
  token=session.token;const writeEpoch=advanceSessionRevision(),sessionToken=token;
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
export async function clearSession(cancelPendingLogin=true){if(cancelPendingLogin)loginAttempt++;token=null;const clearEpoch=advanceSessionRevision();if(isToss())await queueStorage(async()=>{if(sessionEpoch===clearEpoch)await Storage.removeItem('toss-session');});return clearEpoch;}
export async function unlinkCurrentSession(){
  const unlinkEpoch=sessionEpoch,unlinkAttempt=loginAttempt;
  const result=await api<{remoteUnlink:string}>('/unlink',{});
  if(sessionEpoch!==unlinkEpoch||loginAttempt!==unlinkAttempt)throw new ApiError('SESSION_CHANGED','',409);
  const cleared=await clearSession();
  if(token!==null||sessionEpoch!==cleared||loginAttempt!==unlinkAttempt+1)throw new ApiError('SESSION_CHANGED','',409);
  return result;
}
export async function logout(){
  const logoutEpoch=sessionEpoch,logoutAttempt=++loginAttempt;let invalidatedByRequest=false;
  try{await api('/logout',{});}
  catch(error){invalidatedByRequest=error instanceof ApiError&&(error.status===401||error.status===403)&&token===null&&sessionEpoch===logoutEpoch+1&&loginAttempt===logoutAttempt;throw error;}
  finally{
    // api() already cleared this exact session on 401. Preserve its error,
    // including a permission denial from session storage cleanup;
    // a concurrent login or any other session change still wins instead.
    if(!(invalidatedByRequest&&token===null&&sessionEpoch===logoutEpoch+1&&loginAttempt===logoutAttempt)){
      if(sessionEpoch!==logoutEpoch||loginAttempt!==logoutAttempt)throw new ApiError('SESSION_CHANGED','',409);
      const cleared=await clearSession(false);
      if(token!==null||sessionEpoch!==cleared||loginAttempt!==logoutAttempt)throw new ApiError('SESSION_CHANGED','',409);
    }
  }
}
export type CatalogProduct={id:string;name:string;sku:string;approvedPriceKRW:number;chapters:number;available:boolean};
export type SaleProduct=CatalogProduct&{displayAmount:string};
export type NativeSaleProduct=Omit<CatalogProduct,'chapters'>&{featureKey:string;displayAmount:string};
function requireProductListSupport(){
  let supported=false;try{supported=IAP.getProductItemList.isSupported();}catch(error){if(authorizationStatus(error)||sdkVersionError(error))throw error;/* Unsupported bridge versions fail closed. */}
  if(!supported)throw new ApiError('IAP_NOT_SUPPORTED');
}
async function scopedProductCatalog<T>(path:string){
  const requestToken=token,requestEpoch=sessionEpoch,requestAttempt=loginAttempt;
  const current=()=>token===requestToken&&sessionEpoch===requestEpoch&&loginAttempt===requestAttempt;
  let apiFailure:unknown;
  try{const result=await Promise.all([api<T>(path).catch(error=>{apiFailure=error;throw error;}),Promise.resolve().then(()=>IAP.getProductItemList())]);if(!current())throw new ApiError('SESSION_CHANGED','',409);return result;}
  catch(error){const invalidatedByRequest=error===apiFailure&&error instanceof ApiError&&error.status===401&&requestToken!==null&&token===null&&sessionEpoch===requestEpoch+1&&loginAttempt===requestAttempt;if(!current()&&!invalidatedByRequest)throw new ApiError('SESSION_CHANGED','',409);throw error;}
}
type SdkCatalog = Awaited<ReturnType<typeof IAP.getProductItemList>>;

function approvedDisplayPrice(catalog:SdkCatalog|undefined, product:{sku:string;approvedPriceKRW:number}):string|null{
  const {sku,approvedPriceKRW}=product;
  if(!sku||!Number.isSafeInteger(approvedPriceKRW)||approvedPriceKRW<=0)return null;
  const matches=catalog?.products.filter(row=>row.sku===sku);
  if(matches?.length!==1||matches[0].type!=='CONSUMABLE')return null;
  const display=matches[0].displayAmount;
  if(typeof display!=='string')return null;
  // The SDK exposes a localized label only. Require an explicit won currency
  // and the exact approved amount, and keep the original label for display.
  const label=display.trim().replace(/[\u00a0\u202f]/g,' ');
  const amounts=[String(approvedPriceKRW),approvedPriceKRW.toLocaleString('ko-KR')];
  for(const amount of amounts){
    if([amount+'원',amount+' 원','₩'+amount,'₩ '+amount,'KRW '+amount,amount+' KRW'].includes(label))return display;
  }
  return null;
}

export async function saleProducts():Promise<SaleProduct[]>{
  if(!SERVICE_AVAILABLE||!NEW_PURCHASES_AVAILABLE||!isToss())return [];
  requireProductListSupport();
  const [catalog,items]=await scopedProductCatalog<{products:CatalogProduct[]}>('/catalog');
  return catalog.products.flatMap(p=>{
    const displayAmount=approvedDisplayPrice(items,p);
    return displayAmount&&p.available?[{...p,displayAmount}]:[];
  });
}
export async function nativeSaleProducts():Promise<NativeSaleProduct[]>{
  if(!SERVICE_AVAILABLE||!NEW_PURCHASES_AVAILABLE||!isToss())return [];
  requireProductListSupport();
  const [catalog,items]=await scopedProductCatalog<{products:Omit<NativeSaleProduct,'displayAmount'>[]}>('/native/catalog');
  return catalog.products.flatMap(product=>{
    const displayAmount=approvedDisplayPrice(items,product);
    return displayAmount&&product.available?[{...product,displayAmount}]:[];
  });
}
export type TarotLibraryProduct={id:string;name:string;sku:string;featureKey:string;approvedPriceKRW:number;displayAmount:string};
export async function tarotLibraryProducts():Promise<TarotLibraryProduct[]>{
  if(!SERVICE_AVAILABLE||!NEW_PURCHASES_AVAILABLE||!isToss())return [];
  requireProductListSupport();
  const [catalog,items]=await scopedProductCatalog<{flows:Omit<TarotLibraryProduct,'displayAmount'>[]}>('/tarot-library/catalog');
  return catalog.flows.flatMap(flow=>{
    const displayAmount=approvedDisplayPrice(items,flow);
    return displayAmount?[{...flow,displayAmount}]:[];
  });
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
  try{return IAP.getPendingOrders.isSupported()&&IAP.completeProductGrant.isSupported();}catch(error){if(authorizationStatus(error)||sdkVersionError(error))throw error;return false;}
}
// These versions guarantee that the native SDK honors the grant callback's
// true/false result. The purchase API itself has a lower support floor.
function requirePurchaseSupport(){
  // Exceptions are propagated unchanged, including native authorization errors.
  if(!IAP.createOneTimePurchaseOrder.isSupported()||!isMinVersionSupported({android:'5.231.1',ios:'5.230.0'}))throw new ApiError('IAP_NOT_SUPPORTED');
}
function requireRecoveryReady(){
  if(!token)throw new ApiError('LOGIN_REQUIRED');
  if(paymentInFlight)throw new ApiError('PAYMENT_IN_PROGRESS');
  if(paymentUncertain)throw new ApiError('PAYMENT_STATUS_UNCERTAIN');
  if(!recoverySupported())throw new ApiError('IAP_NOT_SUPPORTED');
  if(recoveryInFlight&&recoveryInFlight.token===token&&recoveryInFlight.epoch===sessionEpoch)throw new ApiError('RECOVERY_IN_PROGRESS');
  if(!recoveryState||recoveryState.token!==token||recoveryState.epoch!==sessionEpoch||recoveryState.state!=='ready')throw new ApiError('RECOVERY_REQUIRED');
}
let paymentInFlight:symbol|null=null;
let paymentUncertain=false;
export function paymentRequiresReview(){return paymentUncertain;}
export function purchase(product:Pick<SaleProduct,'sku'>,requestId:string,onDone:()=>void,onError:(error:unknown)=>void){
  if(!SERVICE_AVAILABLE)throw new ApiError('TOSS_RELEASE_PENDING');
  if(!NEW_PURCHASES_AVAILABLE)throw new ApiError('TOSS_PURCHASES_DISABLED');
  if(!isToss())throw new ApiError('TOSS_APP_REQUIRED');
  requireRecoveryReady();
  requirePurchaseSupport();
  let unsubscribe:()=>void=()=>{},grantedOrder='',settled=false,cleaned=false,sdkStarted=false;
  const requestToken=token,requestEpoch=sessionEpoch,requestAttempt=loginAttempt;
  const sessionChanged=()=>token!==requestToken||sessionEpoch!==requestEpoch||loginAttempt!==requestAttempt;
  const attempt=paymentInFlight=Symbol('purchase');
  let resumeMedia:()=>void;
  try{resumeMedia=pausePaymentMedia();}catch(error){if(paymentInFlight===attempt)paymentInFlight=null;throw error;}
  const blockRecovery=()=>{if(token===requestToken&&sessionEpoch===requestEpoch)recoveryState={token,epoch:sessionEpoch,state:'blocked'};};
  const clean=()=>{if(cleaned)return;cleaned=true;if(!settled){settled=true;if(sdkStarted){paymentUncertain=true;blockRecovery();}}if(paymentInFlight===attempt)paymentInFlight=null;unsubscribe();resumeMedia();};
  const fail=(error:unknown)=>{if(settled)return;settled=true;const canceled=typeof error==='object'&&error&&'code' in error&&error.code==='USER_CANCELED';if(sdkStarted){paymentUncertain=true;blockRecovery();}clean();onError(sessionChanged()?new ApiError('SESSION_CHANGED','',409):sdkStarted&&canceled?new ApiError('PAYMENT_STATUS_UNCERTAIN'):error);};
  void (async()=>{try{const verified=await api<{authenticated?:boolean}>('/session');if(settled)return;if(sessionChanged())throw new ApiError('SESSION_CHANGED','',409);if(verified?.authenticated!==true)throw new ApiError('SESSION_CHECK_FAILED');sdkStarted=true;unsubscribe=IAP.createOneTimePurchaseOrder({options:{sku:product.sku,processProductGrant:async({orderId})=>{
    if(settled||sessionChanged())return false;
    grantedOrder='';
    try{const receipt=await api<Receipt>('/orders/grant',{sku:product.sku,orderId,requestId});const granted=!settled&&!sessionChanged()&&validReceipt(receipt,orderId)&&receipt.requestId===requestId;grantedOrder=granted?orderId:'';return granted;}
    catch(error){fail(error);return false;}
  }},onEvent:(event)=>{if(settled)return;settled=true;const confirmed=Boolean(grantedOrder&&event?.type==='success'&&event.data?.orderId===grantedOrder);if(!confirmed){paymentUncertain=true;blockRecovery();}clean();if(sessionChanged())onError(new ApiError('SESSION_CHANGED','',409));else if(confirmed)onDone();else onError(new ApiError(grantedOrder?'PAYMENT_STATUS_UNCERTAIN':'GRANT_NOT_DURABLE'));},onError:fail});if(cleaned)unsubscribe();}catch(error){if(!settled){if(sdkStarted){paymentUncertain=true;blockRecovery();}settled=true;clean();onError(error);}}})();
  return ()=>clean();
}
export function purchaseTarotLibrary(product:TarotLibraryProduct,input:unknown,onDone:(orderId:string)=>void,onError:(error:unknown)=>void){
  if(!SERVICE_AVAILABLE)throw new ApiError('TOSS_RELEASE_PENDING');
  if(!NEW_PURCHASES_AVAILABLE)throw new ApiError('TOSS_PURCHASES_DISABLED');
  if(!isToss())throw new ApiError('TOSS_APP_REQUIRED');
  requireRecoveryReady();
  requirePurchaseSupport();
  let unsubscribe:()=>void=()=>{},grantedOrder='',settled=false,cleaned=false,sdkStarted=false;
  const requestToken=token,requestEpoch=sessionEpoch,requestAttempt=loginAttempt;
  const sessionChanged=()=>token!==requestToken||sessionEpoch!==requestEpoch||loginAttempt!==requestAttempt;
  const attempt=paymentInFlight=Symbol('purchase');
  let resumeMedia:()=>void;
  try{resumeMedia=pausePaymentMedia();}catch(error){if(paymentInFlight===attempt)paymentInFlight=null;throw error;}
  const blockRecovery=()=>{if(token===requestToken&&sessionEpoch===requestEpoch)recoveryState={token,epoch:sessionEpoch,state:'blocked'};};
  const clean=()=>{if(cleaned)return;cleaned=true;if(!settled){settled=true;if(sdkStarted){paymentUncertain=true;blockRecovery();}}if(paymentInFlight===attempt)paymentInFlight=null;unsubscribe();resumeMedia();};
  const fail=(error:unknown)=>{if(settled)return;settled=true;const canceled=typeof error==='object'&&error&&'code' in error&&error.code==='USER_CANCELED';if(sdkStarted){paymentUncertain=true;blockRecovery();}clean();onError(sessionChanged()?new ApiError('SESSION_CHANGED','',409):sdkStarted&&canceled?new ApiError('PAYMENT_STATUS_UNCERTAIN'):error);};
  void (async()=>{try{const verified=await api<{authenticated?:boolean}>('/session');if(settled)return;if(sessionChanged())throw new ApiError('SESSION_CHANGED','',409);if(verified?.authenticated!==true)throw new ApiError('SESSION_CHECK_FAILED');sdkStarted=true;unsubscribe=IAP.createOneTimePurchaseOrder({options:{sku:product.sku,processProductGrant:async({orderId})=>{
    if(settled||sessionChanged())return false;
    grantedOrder='';
    try{const receipt=await api<Receipt>('/tarot-library/orders/grant',{sku:product.sku,orderId,input});const granted=!settled&&!sessionChanged()&&validReceipt(receipt,orderId);grantedOrder=granted?orderId:'';return granted;}
    catch(error){fail(error);return false;}
  }},onEvent:(event)=>{if(settled)return;settled=true;const confirmed=Boolean(grantedOrder&&event?.type==='success'&&event.data?.orderId===grantedOrder);if(!confirmed){paymentUncertain=true;blockRecovery();}clean();if(sessionChanged())onError(new ApiError('SESSION_CHANGED','',409));else if(confirmed)onDone(grantedOrder);else onError(new ApiError(grantedOrder?'PAYMENT_STATUS_UNCERTAIN':'GRANT_NOT_DURABLE'));},onError:fail});if(cleaned)unsubscribe();}catch(error){if(!settled){if(sdkStarted){paymentUncertain=true;blockRecovery();}settled=true;clean();onError(error);}}})();
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
let recoveryInFlight:{token:string|null;epoch:number;promise:Promise<RecoveryCounts>}|null=null;
let recoveryState:{token:string|null;epoch:number;state:'checking'|'ready'|'blocked'}|null=null;
export function restorePurchases():Promise<RecoveryCounts>{
  if(!isToss())return Promise.reject(new ApiError('TOSS_APP_REQUIRED'));
  if(!token)return Promise.reject(new ApiError('LOGIN_REQUIRED'));
  if(paymentInFlight)return Promise.reject(new ApiError('PAYMENT_IN_PROGRESS'));
  if(recoveryInFlight&&recoveryInFlight.token===token&&recoveryInFlight.epoch===sessionEpoch)return recoveryInFlight.promise;
  const sessionToken=token,epoch=sessionEpoch;
  recoveryState={token:sessionToken,epoch,state:'checking'};
  const promise=restorePurchasesOnce(sessionToken,epoch);
  recoveryInFlight={token:sessionToken,epoch,promise};
  void promise.then(counts=>{if(recoveryInFlight?.promise===promise){recoveryState={token:sessionToken,epoch,state:counts.failed||counts.denied?'blocked':'ready'};recoveryInFlight=null;}},()=>{if(recoveryInFlight?.promise===promise){recoveryState={token:sessionToken,epoch,state:'blocked'};recoveryInFlight=null;}});
  return promise;
}
async function restorePurchasesOnce(sessionToken:string|null,epoch:number):Promise<RecoveryCounts>{
  if(!isToss())throw new ApiError('TOSS_APP_REQUIRED');
  if(!recoverySupported())throw new ApiError('IAP_NOT_SUPPORTED');
  const pending=await IAP.getPendingOrders();
  if(token!==sessionToken||sessionEpoch!==epoch)throw new ApiError('SESSION_CHANGED','',409);
  if(!pending||!Array.isArray(pending.orders))throw new ApiError('RECOVERY_STATUS_UNAVAILABLE');
  let recovered=0,failed=0,denied=0;
  for(const order of pending?.orders||[]){
    try{
      if(token!==sessionToken||sessionEpoch!==epoch)throw new ApiError('SESSION_CHANGED','',409);
      const receipt=await api<Receipt>('/orders/restore',{orderId:order.orderId,sku:order.sku});
      if(token!==sessionToken||sessionEpoch!==epoch)throw new ApiError('SESSION_CHANGED','',409);
      if(!validReceipt(receipt,order.orderId))throw new ApiError('GRANT_NOT_DURABLE');
      const acknowledged=await IAP.completeProductGrant({params:{orderId:order.orderId}});
      if(token!==sessionToken||sessionEpoch!==epoch)throw new ApiError('SESSION_CHANGED','',409);
      if(!acknowledged)throw new ApiError('GRANT_ACK_PENDING');
      recovered++;
    }catch(error){if(error instanceof ApiError&&error.status===401)throw error;if(token!==sessionToken||sessionEpoch!==epoch)throw new ApiError('SESSION_CHANGED','',409);const status=authorizationStatus(error);if(status===401)throw error;if(typeof error==='object'&&error&&'code' in error&&error.code==='UNSUPPORTED_APP_VERSION')throw error;if(status===403)denied++;else failed++;}
  }
  return {recovered,failed,denied};
}
export async function shareService(){
  const link=await Share.createLink({path:`intoss://${APP_NAME}/?source=share`});
  await Share.sendMessage({message:`영냥이와 내 고민의 흐름을 살펴보세요. ${link}`});
  // Resolution means the SDK call returned, not proof that a recipient received a share.
}
export function event(name:string,fields:Record<string,unknown>={}){if(!SERVICE_AVAILABLE||!isToss())return;void api('/events',{event:name,fields}).catch(()=>{});}
