export * from '@/app/_lib/billing-client.ts?canonical-base';
export async function runBillingCoinGate(input){
 if(!import.meta.env.DEV||input.featureKey!=='neo-operation-room-consultation')throw new Error('PREVIEW_PAYMENT_BLOCKED');
 return {ok:true,status:200,data:{accessType:'pass',paymentMode:'MEMBERSHIP_PASS',mock:true,requestId:input.requestId}};
}
export async function runPaidAccessGate(){throw new Error('PREVIEW_PAYMENT_BLOCKED');}
