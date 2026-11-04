export * from '../../../app/_lib/billing-client.ts';
import {unpackPaidResumeArg} from '@/app/hooks/usePaidResume';
import {api,nativeSaleProducts,purchase} from '../src/platform';

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
 pending=true;
 try{
  const service=options.featureKey==='love-secret-ai-consultation'?'love-secret':['life-book-ai-consultation','life-fortune-ai-consultation'].includes(options.featureKey)?'life-book':options.featureKey==='fusion-fortune-consultation'?'fusion':options.featureKey==='neo-operation-room-consultation'?'neo':String(options.featureKey).startsWith('fortune-tea-house-')?'tea':null;
  const input=unpackPaidResumeArg(service==='fusion'?options.resume?.args?.body:(service==='neo'||service==='life-book'||service==='love-secret')?options.resume?.args?.payload:options.resume?.args?.requestPayload);
  if(!input||!service)throw new Error('상담 입력을 다시 확인해 주세요.');
  if(service==='fusion'||service==='life-book')input.requestId=options.requestId||options.resume?.args?.requestId;
  const orderId=new URLSearchParams(location.search).get('orderId');
  const intent=await api('/native/'+service+'/prepare',{input,...(orderId?{orderId}:{})});
  if(!intent.paid){
   const sale=(await nativeSaleProducts()).find(row=>row.sku===intent.sku);
   if(!sale||sale.approvedPriceKRW!==intent.amountKRW)throw new Error('등록된 상담 상품을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.');
   await new Promise((resolve,reject)=>{
    let cleanup=()=>{};
    const leave=()=>{cleanup();reject(new Error('결제한 상담은 구매 복구에서 이어갈 수 있어요.'));};
    const settle=action=>{window.removeEventListener('pagehide',leave);action();};
    window.addEventListener('pagehide',leave,{once:true});
    try{cleanup=purchase(sale,intent.id,()=>settle(resolve),error=>settle(()=>reject(error)));}
    catch(error){settle(()=>reject(error));}
   });
  }
  const saved=await api('/native/'+service+'/intents/'+intent.id);
  if(!saved.paid)throw new Error('결제한 상담의 저장 상태를 확인하지 못했어요. 구매 복구를 이용해 주세요.');
  return {ok:true,status:200,raw:{},data:{pricing:{amountKRW:intent.amountKRW,featureKey:options.featureKey},consume:{transactionId:saved.orderId,chargedCoins:0,accessType:'single_purchase',paymentMode:'TOSS_IAP'},accessGrant:{allowed:true,accessMethod:'TOSS_IAP'},payment:{orderId:saved.orderId},requestId:options.requestId}};
 }catch(error){return {ok:false,status:error.status||503,raw:{},error:{code:error.code||'PURCHASE_FAILED',message:error.code==='LOGIN_REQUIRED'?'구매하려면 토스 로그인이 필요해요.':error.code==='USER_CANCELED'?'결제를 취소했어요. 다시 선택할 수 있어요.':error.status===403?'구매 내역에 접근할 권한을 확인할 수 없어요. 구매한 계정과 주문 내역을 확인해 주세요.':error.code==='TOSS_RELEASE_PENDING'?'상품 등록과 검수가 완료되면 상담을 시작할 수 있어요.':error.code==='PAYMENT_IN_PROGRESS'?'결제 진행 중이에요. 열린 결제창을 먼저 확인해 주세요.':error.code==='PAYMENT_STATUS_UNCERTAIN'?'결제 상태를 확인 중이에요. 토스 앱에서 다시 열고 구매 내역을 복구해 주세요.':error.code==='RECOVERY_IN_PROGRESS'?'구매 내역을 확인하고 있어요. 잠시 후 다시 시도해 주세요.':error.code==='UNSUPPORTED_APP_VERSION'&&typeof error.message==='string'&&error.message.trim()&&error.message!==error.code?error.message:['IAP_NOT_SUPPORTED','UNSUPPORTED_APP_VERSION'].includes(error.code)?'현재 토스 앱에서는 이 기능을 지원하지 않아요. 앱 업데이트 후 다시 확인해 주세요.':error.code==='RECOVERY_REQUIRED'?'새 결제 전에 구매 내역 복구에서 이전 주문을 확인해 주세요.':error.message||'결제 상태를 확인하지 못했어요. 구매 복구를 이용해 주세요.'}};}
 finally{pending=false;}
}

export const runPaidAccessGate=runBillingCoinGate;
