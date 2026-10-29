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
 if(pending)return {ok:false,error:{code:'PURCHASE_IN_PROGRESS',message:'진행 중인 결제를 확인해 주세요.'}};
 pending=true;
 try{
  const input=unpackPaidResumeArg(options.resume?.args?.requestPayload);
  if(!input||!String(options.featureKey).startsWith('fortune-tea-house-'))throw new Error('상담 입력을 다시 확인해 주세요.');
  const orderId=new URLSearchParams(location.search).get('orderId');
  const intent=await api('/native/tea/prepare',{input,...(orderId?{orderId}:{})});
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
  const saved=await api('/native/tea/intents/'+intent.id);
  if(!saved.paid)throw new Error('결제한 상담의 저장 상태를 확인하지 못했어요. 구매 복구를 이용해 주세요.');
  return {ok:true,data:{accessGrant:{allowed:true,accessMethod:'TOSS_IAP'},payment:{orderId:saved.orderId},requestId:options.requestId}};
 }catch(error){return {ok:false,error:{code:error.code||'PURCHASE_FAILED',message:error.code==='TOSS_RELEASE_PENDING'?'상품 등록과 검수가 완료되면 상담을 시작할 수 있어요.':error.message||'결제 상태를 확인하지 못했어요. 구매 복구를 이용해 주세요.'}};}
 finally{pending=false;}
}
