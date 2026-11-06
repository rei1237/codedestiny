export * from '../../../app/_lib/billing-client.ts';
import {unpackPaidResumeArg} from '@/app/hooks/usePaidResume';
import {api,nativeSaleProducts,purchase} from '../src/platform';
import {getAuthState,subscribeAuth} from '@/app/_lib/auth-store';
import {consumeTossTeaPrice,rememberTossTeaPrice} from '@/src/features/fortune-tea-house/lib/tossPriceSelection';

// These web-overlay events have no entitlement authority. The original screen
// already renders its progress; the Toss SDK owns purchase confirmation.
export const beginPaidFeatureGateCheck=()=>{};
export const completePaidFeatureGateCheck=()=>{};
export const failPaidFeatureGateCheck=()=>{};
export const holdPaidFeatureGateOpen=()=>{};
export const releasePaidFeatureGate=()=>{};
export const loadPaidServiceRuntimeGate=async()=>null;

let pending=false;
export async function runBillingCoinGate(options){
 if(pending)return {ok:false,status:409,raw:{},error:{code:'PURCHASE_IN_PROGRESS',message:'진행 중인 결제를 확인해 주세요.'}};
 pending=true;let priceEvidenceRequest=false,surfaceActive=true,accountChanged=false,unsubscribeAuth=()=>{};
 const leaveSurface=()=>{surfaceActive=false;};
 try{
  const startLocation=location.pathname+'?'+location.search;
  const userId=()=>{const state=getAuthState(),user=state.user;return JSON.stringify([state.isAuthenticated===true,String(user?.id||user?.userId||user?._id||user?.uid||'')]);},startOwner=userId();
  unsubscribeAuth=subscribeAuth(()=>{if(userId()!==startOwner)accountChanged=true;});
  for(const eventName of ['pagehide','popstate','code-destiny:toss-back'])window.addEventListener(eventName,leaveSurface);
  const checkSurface=()=>{if(!surfaceActive||location.pathname+'?'+location.search!==startLocation)throw Object.assign(new Error('상담 화면을 떠나 결제를 시작하지 않았어요. 다시 확인해 주세요.'),{code:'SURFACE_CHANGED'});if(accountChanged||userId()!==startOwner)throw Object.assign(new Error('로그인 상태가 바뀌었어요. 다시 확인해 주세요.'),{code:'SESSION_CHANGED'});};
  const service=options.featureKey==='sukuyo-compatibility-ai'?'sukuyo':options.featureKey==='karma-destiny-ai-consultation'?'karma':options.featureKey==='new-year-ai-consultation'?'new-year':options.featureKey==='ziwei-ai-consultation'?'ziwei':options.featureKey==='vedic-ai-consultation'?'vedic':options.featureKey==='astrology-ai-consultation'?'astrology':options.featureKey==='love-secret-ai-consultation'?'love-secret':['life-book-ai-consultation','life-fortune-ai-consultation'].includes(options.featureKey)?'life-book':options.featureKey==='fusion-fortune-consultation'?'fusion':options.featureKey==='neo-operation-room-consultation'?'neo':String(options.featureKey).startsWith('fortune-tea-house-')?'tea':null;
  priceEvidenceRequest=service==='tea'||service==='sukuyo';
  const input=unpackPaidResumeArg(service==='fusion'?options.resume?.args?.body:(service==='neo'||service==='life-book'||service==='love-secret'||service==='astrology'||service==='vedic'||service==='ziwei'||service==='new-year'||service==='karma'||service==='sukuyo')?options.resume?.args?.payload:options.resume?.args?.requestPayload);
  if(!input||!service)throw new Error('상담 입력을 다시 확인해 주세요.');
  if(service==='fusion'||service==='life-book')input.requestId=options.requestId||options.resume?.args?.requestId;
  if(service==='astrology'||service==='vedic'||service==='ziwei'||service==='new-year'||service==='karma'||service==='sukuyo')input.idempotencyKey=options.requestId||options.resume?.args?.idempotencyKey||input.idempotencyKey;
  const orderId=new URLSearchParams(location.search).get('orderId');
  const intent=await api('/native/'+service+'/prepare',{input,...(orderId?{orderId}:{})});
  checkSurface();
  if(orderId&&(!intent.paid||intent.orderId!==orderId))throw new Error('결제한 주문 상태를 확인하지 못했어요. 구매 복구에서 다시 확인해 주세요.');
  if(!intent.paid){
   const sale=(await nativeSaleProducts()).find(row=>row.sku===intent.sku);
   checkSurface();
   if(!sale||sale.featureKey!==options.featureKey||sale.approvedPriceKRW!==intent.amountKRW)throw new Error('등록된 상담 상품을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.');
   if(service==='tea'||service==='sukuyo'){const user=getAuthState().user,owner=String(user?.id||user?.userId||user?._id||user?.uid||'');if(!owner||!consumeTossTeaPrice({owner,featureKey:options.featureKey,sku:sale.sku,displayAmount:sale.displayAmount}))throw Object.assign(new Error('상담 확인 화면에서 가격을 다시 확인해 주세요.'),{code:'TOSS_PRICE_CHANGED'});}
   await new Promise((resolve,reject)=>{
    let cleanup=()=>{};
    const leave=()=>{cleanup();reject(Object.assign(new Error('새 결제 전에 구매 내역 복구에서 이전 주문을 확인해 주세요.'),{code:'RECOVERY_REQUIRED'}));};
    const settle=action=>{window.removeEventListener('pagehide',leave);action();};
    window.addEventListener('pagehide',leave,{once:true});
    try{cleanup=purchase(sale,intent.id,()=>settle(resolve),error=>settle(()=>reject(error)));}
    catch(error){settle(()=>reject(error));}
   });
   if(!surfaceActive||location.pathname+'?'+location.search!==startLocation||accountChanged||userId()!==startOwner)throw Object.assign(new Error('결제한 상담은 구매 복구에서 확인해 주세요.'),{code:'RECOVERY_REQUIRED'});
  }
  const saved=await api('/native/'+service+'/intents/'+intent.id);
  if(!surfaceActive||location.pathname+'?'+location.search!==startLocation||accountChanged||userId()!==startOwner)throw Object.assign(new Error('결제한 상담은 구매 복구에서 확인해 주세요.'),{code:'RECOVERY_REQUIRED'});
  if(!saved.paid||orderId&&saved.orderId!==orderId)throw new Error('결제한 상담의 저장 상태를 확인하지 못했어요. 구매 복구를 이용해 주세요.');
  return {ok:true,status:200,raw:{},data:{pricing:{amountKRW:intent.amountKRW,featureKey:options.featureKey},consume:{transactionId:saved.orderId,chargedCoins:0,accessType:'single_purchase',paymentMode:'TOSS_IAP'},accessGrant:{allowed:true,accessMethod:'TOSS_IAP'},payment:{orderId:saved.orderId},requestId:options.requestId}};
 }catch(error){const failure=error&&typeof error==='object'?error:{};const status=failure.status||(failure.code==='ACCESS_DENIED'?403:['LOGIN_REQUIRED','SESSION_EXPIRED'].includes(failure.code)?401:503);return {ok:false,status,raw:{},error:{code:failure.code||'PURCHASE_FAILED',message:status===401?'구매하려면 토스 로그인이 필요해요.':failure.code==='USER_CANCELED'?'결제를 취소했어요. 다시 선택할 수 있어요.':status===403?'구매 내역에 접근할 권한을 확인할 수 없어요. 구매한 계정과 주문 내역을 확인해 주세요.':failure.code==='SESSION_CHECK_FAILED'?'로그인 상태를 확인하지 못했어요. 연결 상태를 확인한 뒤 다시 시도해 주세요.':failure.code==='SESSION_CHANGED'?'로그인 상태가 바뀌었어요. 다시 확인해 주세요.':failure.code==='TOSS_RELEASE_PENDING'?'상품 등록과 검수가 완료되면 상담을 시작할 수 있어요.':failure.code==='PAYMENT_IN_PROGRESS'?'결제 진행 중이에요. 열린 결제창을 먼저 확인해 주세요.':failure.code==='PAYMENT_STATUS_UNCERTAIN'?'결제 상태가 확인되지 않았어요. 다시 결제하지 말고 구매 내역을 확인해 주세요. 확인이 어려우면 고객지원에 문의해 주세요.':failure.code==='RECOVERY_IN_PROGRESS'?'구매 내역을 확인하고 있어요. 잠시 후 다시 시도해 주세요.':failure.code==='UNSUPPORTED_APP_VERSION'&&typeof failure.message==='string'&&failure.message.trim()&&failure.message!==failure.code?failure.message:['IAP_NOT_SUPPORTED','UNSUPPORTED_APP_VERSION'].includes(failure.code)?'현재 토스 앱에서는 이 기능을 지원하지 않아요. 앱 업데이트 후 다시 확인해 주세요.':failure.code==='RECOVERY_REQUIRED'?'새 결제 전에 구매 내역 복구에서 이전 주문을 확인해 주세요.':failure.message||'결제 상태를 확인하지 못했어요. 구매 복구를 이용해 주세요.'}};}
 finally{unsubscribeAuth();for(const eventName of ['pagehide','popstate','code-destiny:toss-back'])window.removeEventListener(eventName,leaveSurface);if(priceEvidenceRequest)rememberTossTeaPrice(null);pending=false;}
}

export const runPaidAccessGate=runBillingCoinGate;
