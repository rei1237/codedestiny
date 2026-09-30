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

export function ServicePackShop({locale}:{locale:LoadingLocale}){
 const auth=useAuthStore(),ownerId=String(auth.user?.id||auth.user?._id||'');
 const copy=servicePackCopy(locale),policy=getCheckoutCopy(locale),alliance=paymentAllianceCopy(locale),links=resolveCheckoutPolicyHrefs(locale);
 const [catalog,setCatalog]=useState<{plans:ServicePackPlan[];error:boolean;loading:boolean;giftEnabled:boolean}>({plans:[],error:false,loading:true,giftEnabled:false});
 const [wallet,setWallet]=useState<{ownerId:string;packs:OwnedServicePack[];nextCursor:string|null;error:boolean;loading:boolean}>({ownerId:'',packs:[],nextCursor:null,error:false,loading:true});
 const [selected,setSelected]=useState<string>(''),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[pendingOrder,setPendingOrder]=useState('');
 const [resumeConsent,setResumeConsent]=useState(false);
 const [purchaseType,setPurchaseType]=useState<PackPurchaseType>('SELF'),[gift,setGift]=useState<PackGiftDraft>({senderName:'',recipientName:'',giftMessage:''});
 const lock=useRef(false),scope=useRef(ownerId),purchaseRef=useRef<HTMLDivElement>(null);scope.current=ownerId;
 useEffect(()=>{if(selected&&purchaseRef.current){purchaseRef.current.scrollIntoView({block:'start'});purchaseRef.current.focus({preventScroll:true});}},[selected,purchaseType]);
 const refreshCatalog=useCallback(async()=>{setCatalog(value=>({...value,loading:true,error:false}));try{const data=await readPackCatalog();setCatalog({...data,error:false,loading:false});}catch{setCatalog({plans:[],giftEnabled:false,error:true,loading:false});}},[]);
 const refreshWallet=useCallback(async(cursor?:string)=>{
  if(!ownerId)return;
  setWallet(value=>({...value,ownerId,loading:true,error:false,packs:value.ownerId===ownerId?value.packs:[]}));
  try{const page=await readPackWallet(cursor);if(scope.current!==ownerId)return;setWallet(value=>({ownerId,packs:cursor?[...value.packs,...page.packs.filter(pack=>!value.packs.some(old=>old.entitlementId===pack.entitlementId))]:page.packs,nextCursor:page.nextCursor,error:false,loading:false}));}
  catch{if(scope.current===ownerId)setWallet(value=>({...value,ownerId,error:true,loading:false}));}
 },[ownerId]);
 useEffect(()=>{void refreshCatalog();},[refreshCatalog]);
 useEffect(()=>{setSelected('');setConsent(false);setResumeConsent(false);setMessage('');setPendingOrder('');if(ownerId){void refreshWallet();setPendingOrder(readPendingPack(ownerId)?.orderId||'');}},[ownerId,refreshWallet]);
 const checkOrder=useCallback(async(orderId:string)=>{
  if(!ownerId||lock.current)return;if(readPendingPack(ownerId)?.purchaseType==='GIFT'){window.location.assign(`/gift/complete/?orderId=${encodeURIComponent(orderId)}`);return;}lock.current=true;setBusy(true);setMessage(copy.confirm);
  try{const granted=await confirmPackOrder(orderId);if(scope.current!==ownerId)return;if(granted){savePendingPack(ownerId,null);setPendingOrder('');setMessage(copy.complete);await refreshWallet();const query=new URLSearchParams(location.search);if(query.has('service_pack_return'))history.replaceState({},'',location.pathname+'#fish-packs');}else setMessage(copy.confirm);}
  catch(error){loginIfNeeded(error);setMessage(copy.confirm);}finally{lock.current=false;setBusy(false);}
 },[ownerId,copy,refreshWallet]);
 useEffect(()=>{
  if(!ownerId)return;const query=new URLSearchParams(location.search);if(query.get('service_pack_return')!=='1')return;
  const orderId=query.get('orderId')||'';if(!orderId||orderId.length>160)return;setPendingOrder(orderId);
  if(query.get('code')||query.get('imp_success')==='false'){setMessage(copy.confirm);return;}
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
  }catch(error){if(scope.current===ownerId){loginIfNeeded(error);setMessage(error instanceof ServicePackError&&error.code==='APP_PACK_NOT_AVAILABLE'?copy.webOnly:copy.confirm);}}
  finally{lock.current=false;setBusy(false);setResumeConsent(false);}
 };
 const pending=ownerId&&pendingOrder?readPendingPack(ownerId):null;
 const resumePlan=pending?.orderId===pendingOrder&&pending.packSnapshot
  &&(pending.purchaseType!=='GIFT'||catalog.giftEnabled)
  ?catalog.plans.find(item=>samePackSnapshot(item,pending.packSnapshot)):undefined;
 const currentWallet=wallet.ownerId===ownerId?wallet:null,plan=catalog.plans.find(item=>item.planId===selected);
 const footer=<>
  {pendingOrder&&<button type="button" disabled={busy} onClick={()=>void checkOrder(pendingOrder)}>{copy.recheck}</button>}
  {resumePlan&&pending&&<div className={styles.purchase} data-pack-resume>
   <h3>{resumePlan.label} · {won(resumePlan.priceKRW,locale)} · {pending.purchaseType==='GIFT'?copy.giftPurchase:copy.selfPurchase}</h3>
   <p>{copy.resumeNotice}</p>
   <label><input type="checkbox" checked={resumeConsent} onChange={event=>setResumeConsent(event.target.checked)} disabled={busy}/>{copy.resumeConsent}</label>
   <p><a href={links.terms}>{policy.legalTerms}</a> · <a href={links.refund}>{policy.legalRefund}</a></p>
   <button type="button" disabled={busy||!resumeConsent||isMobileAppRuntime()} onClick={()=>void resume()}>{copy.resumePayment}</button>
  </div>}
  {message&&<p role="status">{message}</p>}
  <div className={styles.owned}><h3>{copy.owned}</h3><Link href="/gift/box/" prefetch={false}>{copy.giftBox}</Link>
   {!ownerId?<button type="button" onClick={loginForCurrentPage}>{copy.login}</button>:!currentWallet||currentWallet.loading&&!currentWallet.packs.length?<p role="status">{copy.loading}</p>:<>
    {currentWallet.error&&<p role="alert">{copy.unavailable} <button type="button" onClick={()=>void refreshWallet()}>{copy.retry}</button></p>}
    {currentWallet.packs.length?<PackRows packs={currentWallet.packs} locale={locale}/>:!currentWallet.error&&<p>{copy.empty}</p>}
    {currentWallet.nextCursor&&<button type="button" disabled={currentWallet.loading} onClick={()=>void refreshWallet(currentWallet.nextCursor!)}>{copy.more}</button>}
   </>}
  </div>
 </>;
 if(!catalog.loading&&!catalog.error&&!catalog.plans.length)return <div id="fish-packs"><ServicePackShowcase locale={locale}/><section className={styles.section} aria-label={copy.owned}>{footer}</section></div>;
 const divisor=resolveServerFeaturePricing({featureKey:'yeongnyangi-saju-mackerel'})?.monthlyCreditMultiplier;
 return <section id="fish-packs" className={styles.section} aria-labelledby="fish-packs-title">
  <header><h2 id="fish-packs-title">{copy.title}</h2><p>{copy.intro}</p></header>
  <p className={styles.policy}>{divisor&&divisor>1?alliance.moonstoneValue(divisor):null} {policy.policyLine2}</p>
  {catalog.loading?<p role="status">{copy.loading}</p>:catalog.error?<p role="alert">{copy.unavailable} <button type="button" onClick={()=>void refreshCatalog()}>{copy.retry}</button></p>:[...new Set(catalog.plans.map(item=>item.fishId))].map(fishId=><section key={fishId} className={styles.fishGroup} aria-labelledby={`fish-pack-${fishId}`}>
   <h3 id={`fish-pack-${fishId}`}>{localizedTier(fishId,locale)}</h3><ul className={styles.plans}>
   {catalog.plans.filter(item=>item.fishId===fishId).map(item=>{const savings=item.unitPriceKRW*item.totalUses-item.priceKRW;return <li key={item.planId}>
    <Image src={SERVICE_PACK_IMAGES[item.fishId]} alt="" width={240} height={240} sizes="(max-width:520px) 104px, 180px" loading="lazy"/>
    <h4>{item.label}</h4><strong className={styles.price}>{won(item.priceKRW,locale)}</strong><p>{packText(copy.remaining,{total:item.totalUses,remaining:item.totalUses})}</p>
    <p>{packText(copy.scope,{fish:localizedTier(item.fishId,locale),days:item.validityDays,total:item.totalUses})}</p><p className={styles.systems}>{copy.eligible}: {eligibleNames(item.eligibleFeatureKeys,locale)}</p>
    {savings>0&&<p>{packText(copy.savings,{total:item.totalUses,amount:won(savings,locale)})}</p>}
    <div className={styles.planActions}><button type="button" aria-pressed={selected===item.planId&&purchaseType==='SELF'} disabled={busy||Boolean(pendingOrder)} onClick={()=>{setSelected(item.planId);setPurchaseType('SELF');setConsent(false);}}>{copy.selfPurchase}</button>{catalog.giftEnabled&&<button type="button" aria-pressed={selected===item.planId&&purchaseType==='GIFT'} disabled={busy||Boolean(pendingOrder)||isMobileAppRuntime()} onClick={()=>{setSelected(item.planId);setPurchaseType('GIFT');setConsent(false);}}>{copy.giftPurchase}</button>}</div>
   </li>;})}
  </ul></section>)}
  {plan&&!pendingOrder&&<div className={styles.purchase} ref={purchaseRef} tabIndex={-1} aria-labelledby="service-pack-purchase-title">
   <h3 id="service-pack-purchase-title">{plan.label} · {won(plan.priceKRW,locale)} · {purchaseType==='GIFT'?copy.giftPurchase:copy.selfPurchase}</h3>
   <p>{packText(purchaseType==='GIFT'?copy.giftUsagePeriod:copy.validity,{days:plan.validityDays})}</p>
   {purchaseType==='GIFT'&&<fieldset className={styles.giftFields}><legend>{copy.giftPrepare}</legend><p>{copy.giftNotice}</p>{(['senderName','recipientName'] as const).map(key=><label key={key}>{copy[key]}<input type="text" maxLength={40} autoComplete="off" value={gift[key]} disabled={busy} onChange={event=>setGift(value=>({...value,[key]:event.target.value}))}/></label>)}<label>{copy.giftMessage}<textarea maxLength={500} rows={3} value={gift.giftMessage} disabled={busy} onChange={event=>setGift(value=>({...value,giftMessage:event.target.value}))}/></label></fieldset>}
   <label><input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)} disabled={busy}/>{copy.consent}</label>
   <p><a href={links.terms}>{policy.legalTerms}</a> · <a href={links.refund}>{policy.legalRefund}</a></p>
   <button type="button" onClick={()=>void buy()} disabled={busy||!consent||isMobileAppRuntime()}>{busy?copy.working:purchaseType==='GIFT'?copy.giftPurchase:copy.buy}</button>{isMobileAppRuntime()&&<p>{copy.webOnly}</p>}
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
