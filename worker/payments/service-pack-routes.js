import { giftPurchasesEnabled, assertGiftPurchasesEnabled, purchaseTypeOf, giftDraftFor } from './gifts.js';
import { normalizePurchasePaymentMethod } from '../lib/entitlement-policy.js';
import { json } from '../lib/http.js';
import { paymentError } from './errors.js';
import { listServicePackPlans, resolveServicePackProduct } from './service-pack-policy.js';
import { consumeServicePack, listOwnedServicePacks, quoteServicePack } from './service-packs.js';

// Dependency injection is only at composition time; HTTP bodies never supply a catalog.
export function createServicePackRoutes({prepareOrder,confirmOrder,orderStatus,resolvePlan=resolveServicePackProduct,listPlans=listServicePackPlans}={}) {
  const noStore={headers:{'Cache-Control':'no-store'}};
  return {
    'POST /service-packs/orders/:id/confirm':{auth:'required',handle:args=>confirmOrder(args)},
    'GET /service-packs/orders/:id/status':{auth:'required',handle:args=>orderStatus(args)},
    'GET /service-packs/catalog':{auth:'none',async handle({env={},request}={}){
      return json({ok:true,plans:listPlans(),giftEnabled:giftPurchasesEnabled(env,request)},noStore);
    }},
    'GET /service-packs/wallet':{auth:'required',async handle({request,env,ctx,userId,withDb}){
      const before=new URL(request.url).searchParams.get('before')||'';
      const result=await withDb(env,ctx,db=>listOwnedServicePacks(db,{userId,before}));
      return json({ok:true,...result},noStore);
    }},
    'POST /service-packs/quote':{auth:'required',async handle({env,ctx,userId,body,withDb}){
      const result=await withDb(env,ctx,db=>quoteServicePack(db,{userId,requestId:String(body.requestId||'')}));
      return json({ok:true,...result},noStore);
    }},
    'POST /service-packs/prepare':{auth:'required',async handle(args){
      const body=args.body||{},product=resolvePlan(String(body.planId||''));
      const purchaseType=purchaseTypeOf(body.purchaseType);
      if(purchaseType==='GIFT') {
        assertGiftPurchasesEnabled(args.env,args.request);
        const {assertGiftOrigin}=await import('./gift-routes.js');
        assertGiftOrigin(args.request,args.env);
      }
      const giftDraft=purchaseType==='GIFT'?giftDraftFor(body.gift,product):null;
      const idempotencyKey=String(body.idempotencyKey||'').trim();
      if(!idempotencyKey||idempotencyKey.length>140)throw paymentError('IDEMPOTENCY_KEY_REQUIRED','구매 요청 식별자를 확인해 주세요.');
      const paymentMethod=String(body.paymentMethod||'card_general');
      if(normalizePurchasePaymentMethod(paymentMethod)!=='pg')
        throw paymentError('DIRECT_ONLY_PAYMENT_REQUIRED','영냥이 횟수 이용권은 단건 결제로 구매해 주세요.');
      return prepareOrder({...args,preparedProduct:product,preparedPurchaseType:purchaseType,preparedGiftDraft:giftDraft,body:{
        productId:product.productId,featureKey:product.featureKey,idempotencyKey,paymentMethod,
        ...(body.expectedOrderId!==undefined?{expectedOrderId:body.expectedOrderId}:{}),
        refundConsent:body.refundConsent===true,returnPath:purchaseType==='GIFT'?'/gift/complete':'/points',purchaseType,paymentType:'digital_content'
      }});
    }},
    'POST /service-packs/consume':{auth:'required',async handle({env,ctx,userId,body,withDb}){
      const requestId=String(body.requestId||'');
      const result=await withDb(env,ctx,db=>consumeServicePack(db,{userId,requestId,entitlementId:String(body.entitlementId||'')}));
      return json({ok:true,accessMethod:'SERVICE_PACK',requestId,...result},noStore);
    }},
  };
}
