"use client";
import { requestPortOneSinglePayment } from '@/lib/payment/portone';
import { isMobileAppRuntime } from '@/app/_lib/billing-client';
import { neoCall } from './api';
import type { NeoOrder } from './types';

export async function openNeoCheckout(order: NeoOrder) {
  if (isMobileAppRuntime()) throw new Error('이 상담은 현재 웹 브라우저에서만 신청할 수 있습니다. 앱 안에서는 결제를 진행하지 않습니다.');
  const prepared = await neoCall('/'+order.id+'/checkout',{});
  const checkout = prepared.checkout;
  if (!checkout || checkout.merchantUid !== order.payment?.id || checkout.paymentAmount !== order.quote?.totalKRW)
    throw new Error('주문과 결제 정보가 다릅니다. 같은 주문의 상태를 다시 확인해 주세요.');
  const result = await requestPortOneSinglePayment({
    apiBase:'',paymentId:checkout.merchantUid,orderName:'네오 작전 결정서 · 이메일 상담',
    totalAmount:checkout.paymentAmount,redirectPath:'/yeongnyangi/neo-decision/?order='+encodeURIComponent(order.id),
    customer:{...checkout.customer,customerId:checkout.merchantUid,email:order.email},customData:{featureKey:'neo-email-consultation',requestId:order.id},
    storeId:checkout.storeId,channelKey:checkout.channelKey,payFields:{payMethod:'CARD'},
  });
  // 성공 URL·SDK 응답은 결제 증명이 아니다. 실패/닫힘도 서버 주문을 조회할 수 있게 그대로 보존한다.
  if (!result.ok) throw new Error(result.message || '결제창이 닫혔습니다. 같은 주문에서 결제 상태를 확인해 주세요.');
  return (await neoCall('/'+order.id+'/confirm',{})).order;
}
