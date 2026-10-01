'use client';

import Image from 'next/image';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useAuthStore} from '@/app/_lib/auth-store';
import {isMobileAppRuntime} from '@/app/_lib/auth-client';
import type {LoadingLocale} from '@/constants/loadingMessages';
import {paymentAllianceCopy} from '@/app/checkout/payment-alliance-copy';
import {getCheckoutCopy,resolveCheckoutPolicyHrefs} from '@/app/checkout/checkout-copy';
import {localizedSystem,localizedTier} from '@/app/yeongnyangi/_lib/consultation-locale-copy';
import {loginForCurrentPage} from '@/app/yeongnyangi/_lib/api';
import {products} from '@/worker/yeongnyangi/payments/catalog';
import {resolveServerFeaturePricing} from '@/lib/payment/server-feature-pricing';
import {confirmPackOrder,consumeServicePack,payPackOrder,preparePackPurchase,quoteServicePack,readPackCatalog,readPackWallet,readPendingPack,savePendingPack,resumePendingPackPurchase,samePackSnapshot,ServicePackError,type OwnedServicePack,type PackQuote,type ServicePackPlan} from './service-pack-client';
import {packText,servicePackCopy} from './service-pack-copy';
import styles from './service-packs.module.css';
import {SERVICE_PACK_IMAGES} from './service-pack-images';
import ServicePackShowcase from './ServicePackShowcase';
import type {PackGiftDraft,PackPurchaseType} from './service-pack-client';
import {ShopPigImage} from '@/app/points/MoonShopFrame';

// 화면 구조·클래스는 /points 달빛 이용권 카드·결제 모달(PointsClient MoonlightShopPlans)과 맞춘다.
// 🔴 결제 실행(buy/resume/checkOrder)은 영냥이 전용 경로 그대로다 — 꽃돼지 결제 핸들러와 합치지 않는다.
const ALLIANCE_IMAGE='/assets/yeongnyangi/payment-alliance/yeoni-alliance-v1.webp';
const RECOMMEND_IMAGE='/assets/yeongnyangi/service-packs/recommend-badge-v1.webp';
const MOON_SAMPLE_FEATURE='yeongnyangi-saju-mackerel';
const chip='rounded-full border border-[color:var(--moon-rim)] px-2.5 py-1 text-xs font-bold';
const ghost='btn-moonlight-ghost inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50';

const won=(amount:number,locale:LoadingLocale)=>new Intl.NumberFormat(locale,{style:'currency',currency:'KRW',maximumFractionDigits:0}).format(amount);
const date=(value:string,locale:LoadingLocale)=>new Intl.DateTimeFormat(locale,{dateStyle:'medium'}).format(new Date(value));
const eligibleNames=(keys:string[],locale:LoadingLocale)=>[...new Set(products.filter(item=>keys.includes(item.cdFeatureKey)).map(item=>localizedSystem(item.domain,locale)))].join(' · ');
const isPaidQuote=(quote:PackQuote)=>quote.status==='paid'||quote.status==='used'&&quote.accessMethod==='SERVICE_PACK'&&Boolean(quote.existingUse?.evidenceId);
function loginIfNeeded(error:unknown){if(error instanceof ServicePackError&&error.status===401)loginForCurrentPage();}

export function PackRows({packs,locale}:{packs:OwnedServicePack[];locale:LoadingLocale}){
 const copy=servicePackCopy(locale);
 return <ul className={styles.wallet}>{packs.map(pack=><li key={pack.entitlementId} data-pack-entitlement={pack.entitlementId}>
  <Image src={SERVICE_PACK_IMAGES[pack.fishId]} width={240} height={240} sizes="100px" alt="" loading="lazy"/>
  <div><h4>{localizedTier(pack.fishId,locale)} · {pack.label}</h4><strong>{packText(copy.remaining,{total:pack.totalUses,remaining:pack.remainingUses})}</strong><p>{packText(copy.expires,{date:date(pack.expiresAt,locale)})}</p>
   <p>{eligibleNames(pack.eligibleFeatureKeys,locale)}</p>{!pack.available&&<p>{copy.inactive}</p>}</div>
  {pack.available&&<Link href="/yeongnyangi/fortune/" prefetch={false}>{copy.chooseConsultation}</Link>}
 </li>)}</ul>;
}

// 해외 원화 청구 고지는 PointsClient useOverseasCharge 가 만든 값을 받는다. 한국어 화면에서는 null 이다.
export function ServicePackShop({locale,overseasCharge=null}:{locale:LoadingLocale;overseasCharge?:{notice:string;approx:(krw:number)=>string}|null}){
 const auth=useAuthStore(),ownerId=String(auth.user?.id||auth.user?._id||'');
 const copy=servicePackCopy(locale),policy=getCheckoutCopy(locale),alliance=paymentAllianceCopy(locale),links=resolveCheckoutPolicyHrefs(locale);
 const [catalog,setCatalog]=useState<{plans:ServicePackPlan[];error:boolean;loading:boolean;giftEnabled:boolean}>({plans:[],error:false,loading:true,giftEnabled:false});
 const [wallet,setWallet]=useState<{ownerId:string;packs:OwnedServicePack[];nextCursor:string|null;error:boolean;loading:boolean}>({ownerId:'',packs:[],nextCursor:null,error:false,loading:true});
 const [selected,setSelected]=useState<string>(''),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[pendingOrder,setPendingOrder]=useState('');
 const [resumeConsent,setResumeConsent]=useState(false);
 const [purchaseType,setPurchaseType]=useState<PackPurchaseType>('SELF'),[gift,setGift]=useState<PackGiftDraft>({senderName:'',recipientName:'',giftMessage:''});
 const lock=useRef(false),scope=useRef(ownerId),purchaseRef=useRef<HTMLHeadingElement>(null),triggerRef=useRef<HTMLElement|null>(null),catalogRef=useRef(catalog);scope.current=ownerId;catalogRef.current=catalog;
 const refreshCatalog=useCallback(async()=>{setCatalog(value=>({...value,loading:true,error:false}));try{const data=await readPackCatalog();setCatalog({...data,error:false,loading:false});}catch{setCatalog({plans:[],giftEnabled:false,error:true,loading:false});}},[]);
 const refreshWallet=useCallback(async(cursor?:string)=>{
  if(!ownerId)return;
  setWallet(value=>({...value,ownerId,loading:true,error:false,packs:value.ownerId===ownerId?value.packs:[]}));
  try{const page=await readPackWallet(cursor);if(scope.current!==ownerId)return;setWallet(value=>({ownerId,packs:cursor?[...value.packs,...page.packs.filter(pack=>!value.packs.some(old=>old.entitlementId===pack.entitlementId))]:page.packs,nextCursor:page.nextCursor,error:false,loading:false}));}
  catch{if(scope.current===ownerId)setWallet(value=>({...value,ownerId,error:true,loading:false}));}
 },[ownerId]);
 useEffect(()=>{void refreshCatalog();},[refreshCatalog]);
 useEffect(()=>{setSelected('');setConsent(false);setResumeConsent(false);setMessage('');setPendingOrder('');if(ownerId){void refreshWallet();setPendingOrder(readPendingPack(ownerId)?.orderId||'');}},[ownerId,refreshWallet]);
 // 🔴 PG 가 방금 미결제라고 답했는데 이 화면에서 같은 주문을 이어갈 수 없으면(다른 탭 복귀·카탈로그에서 빠진 구성) 구매 잠금을 푼다.
 //    FAILED·CANCELLED 는 서버가 주문을 실패로 닫아 이어가기도 막히므로 항상 푼다. 다음 구매는 새 키·새 주문이다.
 const releaseUnpaid=useCallback((orderId:string,error:unknown)=>{
  if(!(error instanceof ServicePackError)||scope.current!==ownerId)return false;
  const stored=readPendingPack(ownerId),own=stored?.orderId===orderId?stored:null,list=catalogRef.current;
  const resumable=Boolean(own?.packSnapshot&&(list.loading||(own.purchaseType!=='GIFT'||list.giftEnabled)&&list.plans.some(item=>samePackSnapshot(item,own.packSnapshot))));
  if(!['PG_PAYMENT_FAILED','PG_PAYMENT_CANCELLED'].includes(error.code)&&!(error.code==='PG_PAYMENT_NOT_PAID'&&!resumable))return false;
  if(own)savePendingPack(ownerId,null);setPendingOrder('');setMessage(copy.notPaid);
  if(new URLSearchParams(location.search).has('service_pack_return'))history.replaceState({},'',location.pathname+'#fish-packs');
  return true;
 },[ownerId,copy]);
 const checkOrder=useCallback(async(orderId:string)=>{
  if(!ownerId||lock.current)return;if(readPendingPack(ownerId)?.purchaseType==='GIFT'){window.location.assign(`/gift/complete/?orderId=${encodeURIComponent(orderId)}`);return;}lock.current=true;setBusy(true);setMessage(copy.confirm);
  try{const granted=await confirmPackOrder(orderId);if(scope.current!==ownerId)return;if(granted){savePendingPack(ownerId,null);setPendingOrder('');setMessage(copy.complete);await refreshWallet();const query=new URLSearchParams(location.search);if(query.has('service_pack_return'))history.replaceState({},'',location.pathname+'#fish-packs');}else setMessage(copy.confirm);}
  catch(error){loginIfNeeded(error);if(!releaseUnpaid(orderId,error))setMessage(copy.confirm);}finally{lock.current=false;setBusy(false);}
 },[ownerId,copy,refreshWallet,releaseUnpaid]);
 useEffect(()=>{
  if(!ownerId)return;const query=new URLSearchParams(location.search);if(query.get('service_pack_return')!=='1')return;
  const orderId=query.get('orderId')||'';if(!orderId||orderId.length>160)return;setPendingOrder(orderId);
  // 같은 탭의 취소·실패는 저장된 주문으로 이어가기를 띄운다. 다른 탭 복귀는 저장본이 없으니 아래 확인에서 미결제면 잠금을 푼다.
  if((query.get('code')||query.get('imp_success')==='false')&&readPendingPack(ownerId)?.orderId===orderId){setMessage(copy.confirm);return;}
  const providerId=query.get('paymentId')||query.get('payment_id')||query.get('imp_uid');
  if(providerId&&providerId!==orderId){setMessage(copy.unavailable);return;}
  void checkOrder(orderId);
 },[ownerId,checkOrder,copy]);
 const buy=async()=>{
  if(!ownerId){loginForCurrentPage();return;}if(lock.current||!consent)return;
  const plan=catalog.plans.find(item=>item.planId===selected);if(!plan)return;
  lock.current=true;setBusy(true);setMessage(copy.confirm);
  try{
   const previous=readPendingPack(ownerId);if(previous?.orderId){setPendingOrder(previous.orderId);return;}
   if(previous&&(previous.planId!==plan.planId||(previous.purchaseType||'SELF')!==purchaseType||(purchaseType==='GIFT'&&JSON.stringify(previous.gift)!==JSON.stringify(gift))))throw new ServicePackError('PENDING_OTHER_PLAN');
   if(purchaseType==='GIFT'&&!catalog.giftEnabled)throw new ServicePackError('GIFT_NOT_AVAILABLE');
   const pending=previous||{planId:plan.planId,idempotencyKey:`service-pack-${crypto.randomUUID()}`,purchaseType,...(purchaseType==='GIFT'?{gift}:{})};
   savePendingPack(ownerId,pending);
   const order=await preparePackPurchase(plan.planId,pending.idempotencyKey,consent,purchaseType,purchaseType==='GIFT'?gift:undefined);
   if(scope.current!==ownerId)throw new ServicePackError('AUTH_SCOPE_CHANGED');
   savePendingPack(ownerId,{...pending,orderId:order.merchantUid,packSnapshot:order.packSnapshot});setPendingOrder(order.merchantUid);
   const granted=await payPackOrder(order);if(scope.current!==ownerId)return;
   if(granted){savePendingPack(ownerId,null);setPendingOrder('');setSelected('');setConsent(false);setMessage(copy.complete);await refreshWallet();}
  }catch(error){loginIfNeeded(error);setMessage(error instanceof ServicePackError&&error.code==='APP_PACK_NOT_AVAILABLE'?copy.webOnly:copy.confirm);}
  finally{lock.current=false;setBusy(false);}
 };

 const resume=async()=>{
  if(!ownerId||lock.current||!resumeConsent)return;
  lock.current=true;setBusy(true);setMessage(copy.confirm);
  try{
   const granted=await resumePendingPackPurchase(ownerId,resumeConsent,()=>scope.current===ownerId);
   if(scope.current!==ownerId)return;
   if(granted){savePendingPack(ownerId,null);setPendingOrder('');setMessage(copy.complete);await refreshWallet();}
  }catch(error){if(scope.current===ownerId&&!releaseUnpaid(pendingOrder,error)){loginIfNeeded(error);setMessage(error instanceof ServicePackError&&error.code==='APP_PACK_NOT_AVAILABLE'?copy.webOnly:copy.confirm);}}
  finally{lock.current=false;setBusy(false);setResumeConsent(false);}
 };
 const pending=ownerId&&pendingOrder?readPendingPack(ownerId):null;
 const resumePlan=pending?.orderId===pendingOrder&&pending.packSnapshot
  &&(pending.purchaseType!=='GIFT'||catalog.giftEnabled)
  ?catalog.plans.find(item=>samePackSnapshot(item,pending.packSnapshot)):undefined;
 const currentWallet=wallet.ownerId===ownerId?wallet:null,plan=catalog.plans.find(item=>item.planId===selected);
 // 결제 진행 중에는 모달을 유지하고, 결제가 끝나지 않은 주문이 남으면 닫아 아래 재확인·이어가기로 넘긴다(기존 패널과 같은 조건).
 const modalOpen=Boolean(plan&&(busy||!pendingOrder));
 const openPurchase=(planId:string,type:PackPurchaseType)=>{triggerRef.current=document.activeElement as HTMLElement|null;setSelected(planId);setPurchaseType(type);setConsent(false);};
 const closePurchase=()=>{if(lock.current)return;setSelected('');setConsent(false);};
 useEffect(()=>{
  if(!modalOpen)return;purchaseRef.current?.focus();
  const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!lock.current){setSelected('');setConsent(false);}};
  document.addEventListener('keydown',onKey);
  return()=>{document.removeEventListener('keydown',onKey);triggerRef.current?.focus?.();};
 },[modalOpen]);
 const footer=<>
  {pendingOrder&&<button type="button" className={`mt-4 ${ghost}`} disabled={busy} onClick={()=>void checkOrder(pendingOrder)}>{copy.recheck}</button>}
  {resumePlan&&pending&&<div className="moon-plan-card mt-4 rounded-[22px] p-4" data-pack-resume>
   <h3 className="text-base font-black text-white">{resumePlan.label} · {won(resumePlan.priceKRW,locale)} · {pending.purchaseType==='GIFT'?copy.giftPurchase:copy.selfPurchase}</h3>
   <p className="mt-1 text-sm leading-relaxed text-[color:var(--moon-mist)]">{copy.resumeNotice}</p>
   <label className="mt-3 flex items-start gap-2 rounded-[14px] border border-amber-200/35 bg-amber-200/10 px-3.5 py-3 text-[12px] font-bold text-amber-100"><input type="checkbox" className="mt-0.5 h-4 w-4 flex-shrink-0 accent-amber-300" checked={resumeConsent} onChange={event=>setResumeConsent(event.target.checked)} disabled={busy}/><span>{copy.resumeConsent}</span></label>
   <p className="mt-2 text-sm"><a href={links.terms}>{policy.legalTerms}</a> · <a href={links.refund}>{policy.legalRefund}</a></p>
   <button type="button" className="btn-moonlight mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto" disabled={busy||!resumeConsent||isMobileAppRuntime()} onClick={()=>void resume()}>{copy.resumePayment}</button>
  </div>}
  {message&&!modalOpen&&<p role="status" className="mt-3 text-sm font-bold text-[color:var(--moon-silver)]">{message}</p>}
  <div className="mt-6 border-t border-[color:var(--moon-rim)] pt-5">
   <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-black text-white">{copy.owned}</h3><Link className="text-sm font-bold" href="/gift/box/" prefetch={false}>{copy.giftBox}</Link></div>
   {!ownerId?<button type="button" className={`mt-3 ${ghost}`} onClick={loginForCurrentPage}>{copy.login}</button>:!currentWallet||currentWallet.loading&&!currentWallet.packs.length?<p role="status" className="mt-3 text-sm text-[color:var(--moon-mist)]">{copy.loading}</p>:<>
    {currentWallet.error&&<p role="alert" className="mt-3 text-sm text-[color:var(--moon-mist)]">{copy.unavailable} <button type="button" className={ghost} onClick={()=>void refreshWallet()}>{copy.retry}</button></p>}
    {currentWallet.packs.length?<PackRows packs={currentWallet.packs} locale={locale}/>:!currentWallet.error&&<p className="mt-3 text-sm text-[color:var(--moon-mist)]">{copy.empty}</p>}
    {currentWallet.nextCursor&&<button type="button" className={ghost} disabled={currentWallet.loading} onClick={()=>void refreshWallet(currentWallet.nextCursor!)}>{copy.more}</button>}
   </>}
  </div>
 </>;
 const shopClass=`moon-card rounded-[24px] p-5 sm:p-6 ${styles.shop}`;
 if(!catalog.loading&&!catalog.error&&!catalog.plans.length)return <div id="fish-packs"><ServicePackShowcase locale={locale}/><section className={shopClass} aria-label={copy.owned}>{footer}</section></div>;
 const pricing=resolveServerFeaturePricing({featureKey:MOON_SAMPLE_FEATURE}),divisor=pricing?.monthlyCreditMultiplier;
 const sample=products.find(item=>item.cdFeatureKey===MOON_SAMPLE_FEATURE);
 const moonExample=pricing&&sample&&pricing.membershipCreditCost>0?packText(copy.moonExample,{fish:localizedTier(sample.fishId,locale),system:localizedSystem(sample.domain,locale),price:won(pricing.amountKRW,locale),stones:pricing.membershipCreditCost.toLocaleString(locale)}):'';
 return <section id="fish-packs" className={shopClass} aria-labelledby="fish-packs-title">
  {/* <header> 는 /points 전역 규칙(body:has(main.moon-shop) header)이 숨기므로 div 를 쓴다. */}
  <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:items-center">
   <Image src={ALLIANCE_IMAGE} alt={alliance.imageAlt} width={1200} height={800} sizes="(min-width: 640px) 360px, 100vw" className="h-auto w-full rounded-[18px]"/>
   <div className="min-w-0">
    <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--moon-glow)]">{copy.allianceKicker}</p>
    <h2 id="fish-packs-title" className="mt-2 text-2xl font-black text-white">{copy.title}</h2>
    <p className="mt-2 text-sm leading-relaxed text-[color:var(--moon-mist)]">{copy.intro}</p>
    <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--moon-silver)]"><strong className="text-white">{alliance.title}</strong> · {alliance.story}</p>
   </div>
  </div>
  <section className="moon-plan-card mt-5 rounded-[22px] p-4" aria-labelledby="fish-packs-moon" data-pack-moonstone>
   <h3 id="fish-packs-moon" className="text-base font-black text-white"><span aria-hidden="true">🌙 </span>{copy.moonTitle}</h3>
   <ul className="mt-3 grid gap-3 text-sm leading-relaxed text-[color:var(--moon-mist)] sm:grid-cols-3">
    <li>{copy.moonUsable}</li>
    {divisor&&divisor>1?<li><strong className="text-white">{alliance.moonstoneValue(divisor)}</strong>{moonExample&&<span className="mt-1 block font-bold text-[color:var(--moon-gold)]">{moonExample}</span>}</li>:null}
    <li>{policy.policyLine2}</li>
   </ul>
  </section>
  {catalog.loading?<p role="status" className="mt-5 text-sm text-[color:var(--moon-mist)]">{copy.loading}</p>:catalog.error?<p role="alert" className="mt-5 text-sm text-[color:var(--moon-mist)]">{copy.unavailable} <button type="button" className={ghost} onClick={()=>void refreshCatalog()}>{copy.retry}</button></p>:[...new Set(catalog.plans.map(item=>item.fishId))].map(fishId=>{
   const plans=catalog.plans.filter(item=>item.fishId===fishId).sort((a,b)=>a.totalUses-b.totalUses);
   return <section key={fishId} className="mt-6" aria-labelledby={`fish-pack-${fishId}`}>
    <h3 id={`fish-pack-${fishId}`} className="mb-3 text-lg font-black text-white">{localizedTier(fishId,locale)}</h3>
    <div className="grid gap-4">{plans.map((item,index)=>{
     const savings=item.unitPriceKRW*item.totalUses-item.priceKRW,recommended=plans.length===3&&index===1;
     return <article key={item.planId} data-pack-plan={item.planId} className={`moon-plan-card rounded-[22px] p-4 ${recommended?'ring-2 ring-[color:var(--moon-glow)]':''}`}>
      <div className="grid gap-4 sm:grid-cols-[128px_1fr_auto] sm:items-center">
       <div className="relative h-28 w-28 sm:h-32 sm:w-32">
        <Image src={SERVICE_PACK_IMAGES[item.fishId]} alt="" width={240} height={240} sizes="(min-width: 640px) 128px, 112px" loading="lazy" className="h-full w-full object-contain"/>
        {recommended&&<Image src={RECOMMEND_IMAGE} alt="" width={120} height={120} sizes="64px" loading="lazy" className="absolute -bottom-2 -right-4 h-16 w-16 object-contain drop-shadow-[0_4px_8px_rgba(3,4,18,0.42)]"/>}
       </div>
       <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
         <h4 className="text-lg font-black text-white">{item.label}</h4>
         {recommended&&<span className="rounded-full bg-[rgba(129,140,248,0.16)] px-2.5 py-1 text-xs font-black text-[color:var(--moon-family)]">{copy.recommend}</span>}
        </div>
        <p className="mt-1 text-sm font-bold text-[color:var(--moon-mist)]">{packText(copy.cardSubtitle,{days:item.validityDays})}</p>
        <div className="mt-3 flex flex-wrap gap-2">
         <span className={`${chip} text-[color:var(--moon-silver)]`}>{packText(copy.scope,{fish:localizedTier(item.fishId,locale),days:item.validityDays,total:item.totalUses})}</span>
         <span className={`${chip} text-[color:var(--moon-mist)]`}>{packText(copy.perUse,{amount:won(Math.round(item.priceKRW/item.totalUses),locale)})}</span>
        </div>
        {savings>0&&<p className="mt-2 text-xs font-bold text-[color:var(--moon-gold)]">{packText(copy.savings,{total:item.totalUses,amount:won(savings,locale)})}</p>}
        <p className="mt-2 text-xs leading-relaxed text-[color:var(--moon-mist)]">{copy.eligible}: {eligibleNames(item.eligibleFeatureKeys,locale)}</p>
       </div>
       <div className="flex flex-col gap-3 sm:min-w-[176px] sm:items-end">
        <p className="text-2xl font-black text-[color:var(--moon-gold)]">{won(item.priceKRW,locale)}</p>
        {overseasCharge?.approx(item.priceKRW)?<p className="text-xs font-bold text-[color:var(--moon-mist)]">{overseasCharge.approx(item.priceKRW)}</p>:null}
        <button type="button" disabled={busy||Boolean(pendingOrder)} onClick={()=>openPurchase(item.planId,'SELF')} className="btn-moonlight inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">{copy.buyCta}</button>
        {catalog.giftEnabled&&<>
         <p className="mt-2 flex items-center justify-center gap-1 text-center text-[11px] font-bold text-[color:var(--moon-mist)]"><ShopPigImage className="h-4 w-4 object-contain"/>{copy.giftPromo}</p>
         <button type="button" disabled={busy||Boolean(pendingOrder)||isMobileAppRuntime()} onClick={()=>openPurchase(item.planId,'GIFT')} className="mt-1 min-h-11 w-full rounded-xl border border-current px-3 py-2 text-sm font-bold disabled:opacity-50">{copy.giftCta}</button>
        </>}
       </div>
      </div>
     </article>;
    })}</div>
   </section>;
  })}
  {overseasCharge&&!catalog.loading&&!catalog.error?<p className="mt-4 text-xs font-bold leading-relaxed text-[color:var(--moon-mist)]">{overseasCharge.notice}</p>:null}
  {/* 하단 탭바(.cd-mnav z-index 960) 위에 떠야 닫기·결제 버튼이 가려지지 않는다. */}
  {modalOpen&&plan&&<div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/72 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="service-pack-purchase-title" data-pack-purchase onClick={event=>{if(event.target===event.currentTarget)closePurchase();}}>
   <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-[20px] border border-amber-200/35 bg-[#111832] p-5 text-slate-100 shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
    <Image src={SERVICE_PACK_IMAGES[plan.fishId]} alt="" width={240} height={240} sizes="96px" loading="eager" className="mx-auto mb-3 h-24 w-24 object-contain"/>
    <h2 id="service-pack-purchase-title" ref={purchaseRef} tabIndex={-1} className="text-base font-black text-white">{copy.payTitle}</h2>
    <p className="mt-2 text-sm leading-relaxed text-slate-200">{localizedTier(plan.fishId,locale)} · {plan.label} · {won(plan.priceKRW,locale)} · {purchaseType==='GIFT'?copy.giftPurchase:copy.selfPurchase}</p>
    <p className="mt-1 text-[12px] font-bold text-[#f3dd9a]">{copy.wonOnly}</p>
    <div className="mt-4 rounded-[14px] border border-white/12 bg-white/[0.07] px-3.5 py-3 text-[12px] leading-relaxed text-slate-200">
     <p className="font-black text-white">{packText(copy.conditionsTitle,{days:plan.validityDays})}</p>
     <p className="mt-1">{packText(copy.scope,{fish:localizedTier(plan.fishId,locale),days:plan.validityDays,total:plan.totalUses})}</p>
     <p className="mt-1">{purchaseType==='GIFT'?`${copy.giftComplete} ${packText(copy.giftUsagePeriod,{days:plan.validityDays})}`:packText(copy.selfActivation,{days:plan.validityDays})}</p>
     <p className="mt-1 font-bold text-[#cab8ff]">{copy.eligible}: {eligibleNames(plan.eligibleFeatureKeys,locale)}</p>
     <p className="mt-1 flex flex-wrap gap-x-4">
      <a href={links.terms} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center font-black text-[#cab8ff] underline">{policy.legalTerms}</a>
      <a href={links.refund} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center font-black text-[#cab8ff] underline">{copy.refundLink}</a>
     </p>
    </div>
    {purchaseType==='GIFT'&&<fieldset className="mt-4 space-y-3 text-white">
     <legend className="text-lg font-bold">{copy.giftPrepare}</legend>
     <p className="text-sm">{copy.giftNotice}</p>
     {(['senderName','recipientName'] as const).map(key=><label key={key} className="block text-sm">{copy[key]}<input type="text" maxLength={40} autoComplete="off" value={gift[key]} disabled={busy} onChange={event=>setGift(value=>({...value,[key]:event.target.value}))} className="mt-1 block min-h-11 w-full rounded-lg border border-white/30 bg-slate-900 p-3 text-base text-white"/></label>)}
     <label className="block text-sm">{copy.giftMessage}<textarea maxLength={500} rows={3} value={gift.giftMessage} disabled={busy} onChange={event=>setGift(value=>({...value,giftMessage:event.target.value}))} className="mt-1 block w-full rounded-lg border border-white/30 bg-slate-900 p-3 text-base text-white"/></label>
     <details className="text-sm leading-relaxed"><summary className="min-h-11 cursor-pointer py-3">{copy.giftGuidanceSummary}</summary><p>{copy.giftGuidance}</p></details>
    </fieldset>}
    <label className="mt-3 flex items-start gap-2 rounded-[14px] border border-amber-200/35 bg-amber-200/10 px-3.5 py-3 text-[12px] font-bold text-amber-100">
     <input type="checkbox" checked={consent} onChange={event=>setConsent(event.currentTarget.checked)} disabled={busy} className="mt-0.5 h-4 w-4 flex-shrink-0 accent-amber-300"/>
     <span>{copy.consent}</span>
    </label>
    {/* 🔴 영냥이 세트는 서버 prepare 가 card_general 고정이라 타일이 하나다. 환불 동의 전에는 잠근다(꽃돼지 모달과 같은 순서). */}
    <div className="mt-4">
     <p className="text-[12px] font-black text-slate-200">{copy.payPrompt}</p>
     <div className="mt-2 grid grid-cols-2 gap-2">
      <button type="button" data-pack-pay-method="card" disabled={busy||!consent||isMobileAppRuntime()} onClick={()=>void buy()} className="flex min-h-[76px] flex-col items-start justify-center gap-1 rounded-[14px] border border-amber-200/45 bg-amber-200/12 px-3.5 py-3 text-left text-amber-50 transition hover:bg-amber-200/20 disabled:cursor-not-allowed disabled:opacity-50">
       <span aria-hidden="true" className="text-lg leading-none">💳</span>
       <span className="text-[13px] font-black leading-snug">{copy.cardPay}</span>
      </button>
     </div>
     {isMobileAppRuntime()&&<p className="mt-2 text-[12px] font-bold text-amber-100">{copy.webOnly}</p>}
     {message&&<p role="status" className="mt-2 text-[12px] font-bold text-slate-200">{message}</p>}
     <p className="mt-2 text-[11px] font-semibold leading-relaxed text-slate-400">{copy.contentValue}</p>
    </div>
    <button type="button" disabled={busy} onClick={closePurchase} className="mt-4 w-full rounded-[12px] border border-white/15 bg-white/10 px-3 py-2.5 text-sm font-bold text-slate-200 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50">{copy.close}</button>
   </div>
  </div>}
  {footer}
 </section>;
}

export function ServicePackCheckout({requestId,featureKey,locale,disabled,onBusyChange,onPaid}:{requestId:string;featureKey:string;locale:LoadingLocale;disabled:boolean;onBusyChange:(busy:boolean)=>void;onPaid:()=>void}){
 const copy=servicePackCopy(locale),fundingId=`yn-${requestId}`;
 const [quote,setQuote]=useState<PackQuote|null>(null),[failed,setFailed]=useState(false),[checking,setChecking]=useState(true),[selected,setSelected]=useState(''),[busy,setBusy]=useState(false);
 const lock=useRef(false),callbacks=useRef({onBusyChange,onPaid});callbacks.current={onBusyChange,onPaid};
 const refresh=useCallback(async()=>{
  setChecking(true);setFailed(false);
  try{const next=await quoteServicePack(fundingId,featureKey);setQuote(next);setSelected(value=>next.candidates.some(pack=>pack.entitlementId===value&&pack.available)?value:next.candidates.find(pack=>pack.available)?.entitlementId||'');
   const processing=next.status==='processing';setBusy(processing);callbacks.current.onBusyChange(processing);
   if(isPaidQuote(next))callbacks.current.onPaid();return next;
  }catch(error){loginIfNeeded(error);setFailed(true);return null;}finally{setChecking(false);}
 },[fundingId,featureKey]);
 useEffect(()=>{void refresh();},[refresh]);
 const consume=async()=>{
  if(lock.current||disabled||!selected)return;lock.current=true;setBusy(true);callbacks.current.onBusyChange(true);
  try{
   const current=await quoteServicePack(fundingId,featureKey);setQuote(current);
   if(isPaidQuote(current)){callbacks.current.onPaid();return;}
   if(current.status==='processing'){return;}
   if(current.status!=='available')throw new ServicePackError('PACK_NO_LONGER_AVAILABLE');
   if(!current.candidates.some(pack=>pack.entitlementId===selected&&pack.available))throw new ServicePackError('PACK_NO_LONGER_AVAILABLE');
   await consumeServicePack(fundingId,selected);callbacks.current.onPaid();
  }catch(error){loginIfNeeded(error);setFailed(true);}
  finally{lock.current=false;}
 };
 if(!checking&&!failed&&!busy&&!quote?.candidates.length)return null;
 return <section className={styles.checkout} aria-labelledby="service-pack-choice-title">
  <h2 id="service-pack-choice-title">{copy.checkout}</h2>
  {checking&&<p role="status">{copy.loading}</p>}
  {failed&&<p role="alert">{copy.unavailable}</p>}
  {busy&&<p role="status">{copy.working}</p>}
  {!checking&&!busy&&!failed&&quote&&['restored','unavailable'].includes(quote.status)&&<p>{copy.inactive}</p>}
  {(failed||busy)&&<button type="button" onClick={()=>void refresh()} disabled={checking||lock.current}>{copy.retry}</button>}
  {!failed&&!busy&&quote?.status==='available'&&quote.candidates.some(pack=>pack.available)&&<>
   <fieldset className={styles.choices}><legend>{copy.owned}</legend>{quote.candidates.filter(pack=>pack.available).map(pack=><label key={pack.entitlementId}>
    <input type="radio" name="service-pack-entitlement" value={pack.entitlementId} checked={selected===pack.entitlementId} onChange={()=>setSelected(pack.entitlementId)} disabled={disabled||checking}/>
    <span><strong>{pack.label}</strong><span>{packText(copy.remaining,{total:pack.totalUses,remaining:pack.remainingUses})}</span><span>{packText(copy.expires,{date:date(pack.expiresAt,locale)})}</span></span>
   </label>)}</fieldset>
   <button type="button" onClick={()=>void consume()} disabled={disabled||checking||!selected}>{copy.use}</button>
  </>}
 </section>;
}
