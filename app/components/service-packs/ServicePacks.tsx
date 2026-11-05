'use client';
import {readConsultationContext,consultationResumePath,consultationShopPath,type ConsultationContext} from './consultation-context';

import Image from 'next/image';
import Link from 'next/link';
import {Fragment,useCallback,useEffect,useRef,useState} from 'react';
import {useAuthStore} from '@/app/_lib/auth-store';
import {readSubscriptionSnapshotForUser,type SubscriptionSnapshot} from '@/app/_lib/billing-client';
import HoneyPassArtwork from '@/components/yeon/HoneyPassArtwork';
import {getPassTierLabel} from '@/lib/payment/pass-eligibility';
import {isMobileAppRuntime} from '@/app/_lib/auth-client';
import type {LoadingLocale} from '@/constants/loadingMessages';
import {getCheckoutCopy,resolveCheckoutPolicyHrefs} from '@/app/checkout/checkout-copy';
import {localizedSystem} from '@/app/yeongnyangi/_lib/consultation-locale-copy';
import {loginForCurrentPage} from '@/app/yeongnyangi/_lib/api';
import {products} from '@/worker/yeongnyangi/payments/catalog';
import {confirmPackOrderWithRecheck,consumeServicePack,quoteServicePack,readPackCatalog,readPackWallet,readPendingPack,savePendingPack,resumePendingPackPurchase,samePackSnapshot,ServicePackError,type OwnedServicePack,type PackQuote} from './service-pack-client';
import {packName,packText,servicePackCopy,packScope,packExpiry} from './service-pack-copy';
import styles from './service-packs.module.css';
import {APPLIED_STAMP_IMAGES,SERVICE_PACK_IMAGES} from './service-pack-images';
import type {PackWalletView} from './OwnedPassesSummary';

// 전용 이용권은 새로 팔지 않는다. 이 영역은 이미 산 보유분과 판매 종료 전에 시작한 주문의 확인·이어가기만 맡는다.
// 🔴 resume/checkOrder 는 영냥이 전용 결제 경로 그대로다 — 꽃돼지 결제 핸들러와 합치지 않는다.
const ghost='btn-moonlight-ghost inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50';

const won=(amount:number,locale:LoadingLocale)=>new Intl.NumberFormat(locale,{style:'currency',currency:'KRW',maximumFractionDigits:0}).format(amount);
// 이름 안의 공백("서양 점성술")에서 줄이 꺾이지 않도록 이름마다 묶고, 줄바꿈은 구분자에서만 일어나게 한다.
const eligibleNames=(keys:string[],locale:LoadingLocale)=>[...new Set(products.filter(item=>keys.includes(item.cdFeatureKey)).map(item=>localizedSystem(item.domain,locale)))].map((name,index)=><Fragment key={name}>{index?' · ':''}<span className="whitespace-nowrap">{name}</span></Fragment>);
const isPaidQuote=(quote:PackQuote)=>quote.status==='paid'||quote.status==='used'&&quote.accessMethod==='SERVICE_PACK'&&Boolean(quote.existingUse?.evidenceId);
function loginIfNeeded(error:unknown){if(error instanceof ServicePackError&&error.status===401)loginForCurrentPage();}

export function PackRows({packs,locale}:{packs:OwnedServicePack[];locale:LoadingLocale}){
 const copy=servicePackCopy(locale);
 return <ul className={styles.wallet}>{packs.map(pack=><li key={pack.entitlementId} data-pack-entitlement={pack.entitlementId}>
  <Image src={SERVICE_PACK_IMAGES[pack.fishId]} width={240} height={240} sizes="100px" alt="" loading="lazy"/>
  <div><h4>{packName(pack,locale)}</h4><strong>{packText(copy.remaining,{total:pack.totalUses,remaining:pack.remainingUses})}</strong><p>{packExpiry(pack,locale)}</p>
   <p>{eligibleNames(pack.eligibleFeatureKeys,locale)}</p>{!pack.available&&<p>{copy.inactive}</p>}</div>
  {pack.available&&<Link href="/yeongnyangi/fortune/" prefetch={false}>{copy.chooseConsultation}</Link>}
 </li>)}</ul>;
}

// onWalletChange 는 이 컴포넌트가 이미 읽은 보유 목록을 상단 '내 이용권' 요약에 넘긴다(추가 요청 없음).
export function OwnedServicePacks({locale,onWalletChange,context=null}:{context?:ConsultationContext|null;locale:LoadingLocale;onWalletChange?:(packs:PackWalletView)=>void}){
 const auth=useAuthStore(),ownerId=String(auth.user?.id||auth.user?._id||''); const copy=servicePackCopy(locale),policy=getCheckoutCopy(locale),links=resolveCheckoutPolicyHrefs(locale);
 const shopPath=context?consultationShopPath(context):'/points/#fish-packs';
 const [catalog,setCatalog]=useState<{loading:boolean;giftEnabled:boolean}>({loading:true,giftEnabled:false});
 const [wallet,setWallet]=useState<{ownerId:string;packs:OwnedServicePack[];nextCursor:string|null;error:boolean;loading:boolean}>({ownerId:'',packs:[],nextCursor:null,error:false,loading:true});
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[pendingOrder,setPendingOrder]=useState('');
 const [returning]=useState(()=>typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('service_pack_return')==='1');
 const [resumeConsent,setResumeConsent]=useState(false);
 // 결제가 확정된 주문. 섹션 상단 완료 패널이 갱신된 보유 목록에서 남은 횟수·만료일을 찾는다.
 const [completed,setCompleted]=useState<{orderId:string;planId:string;context?:ConsultationContext|null}|null>(null);
 const lock=useRef(false),scope=useRef(ownerId),catalogRef=useRef(catalog);scope.current=ownerId;catalogRef.current=catalog;
 const completedRef=useRef<HTMLDivElement>(null),ownedRef=useRef<HTMLDivElement>(null),walletCallback=useRef(onWalletChange);walletCallback.current=onWalletChange;
 // 웹훅 지급이 늦을 때의 자동 재확인(2·4·8초). 계정 전환·언마운트·새 확인이 시작되면 끊는다.
 const recheck=useRef<AbortController|null>(null);
 useEffect(()=>()=>recheck.current?.abort(),[]);
 // 판매 목록이 아니라 진행 중인 선물 주문을 이어갈 수 있는지만 본다. 진행 중인 주문이 없으면 읽지 않는다.
 const refreshCatalog=useCallback(async()=>{setCatalog({loading:true,giftEnabled:false});try{const data=await readPackCatalog();setCatalog({giftEnabled:data.giftEnabled,loading:false});}catch{setCatalog({giftEnabled:false,loading:false});}},[]);
 const refreshWallet=useCallback(async(cursor?:string)=>{
  if(!ownerId)return;
  setWallet(value=>({...value,ownerId,loading:true,error:false,packs:value.ownerId===ownerId?value.packs:[]}));
  try{const page=await readPackWallet(cursor);if(scope.current!==ownerId)return;setWallet(value=>({ownerId,packs:cursor?[...value.packs,...page.packs.filter(pack=>!value.packs.some(old=>old.entitlementId===pack.entitlementId))]:page.packs,nextCursor:page.nextCursor,error:false,loading:false}));}
  catch{if(scope.current===ownerId)setWallet(value=>({...value,ownerId,error:true,loading:false}));}
 },[ownerId]);
 useEffect(()=>{if(pendingOrder)void refreshCatalog();},[pendingOrder,refreshCatalog]);
 useEffect(()=>{walletCallback.current?.(!ownerId?[]:wallet.ownerId!==ownerId?'loading':wallet.packs.length?wallet.packs:wallet.loading?'loading':wallet.error?'error':[]);},[ownerId,wallet]);
 useEffect(()=>{if(completed)completedRef.current?.scrollIntoView({behavior:'smooth',block:'center'});},[completed]);
 useEffect(()=>{recheck.current?.abort();setResumeConsent(false);setMessage('');setPendingOrder('');setCompleted(null);if(ownerId){void refreshWallet();setPendingOrder(readPendingPack(ownerId)?.orderId||'');}},[ownerId,refreshWallet]);
 // 🔴 PG 가 방금 미결제라고 답했는데 이 화면에서 같은 주문을 이어갈 수 없으면(다른 탭 복귀·카탈로그에서 빠진 구성) 구매 잠금을 푼다.
 //    FAILED·CANCELLED 는 서버가 주문을 실패로 닫아 이어가기도 막히므로 항상 푼다. 다음 구매는 새 키·새 주문이다.
 const releaseUnpaid=useCallback((orderId:string,error:unknown)=>{
  if(!(error instanceof ServicePackError)||scope.current!==ownerId)return false;
  const stored=readPendingPack(ownerId),own=stored?.orderId===orderId?stored:null,list=catalogRef.current;
  const resumable=Boolean(own?.packSnapshot&&samePackSnapshot(own.packSnapshot,own.packSnapshot)
   &&(list.loading||own.purchaseType!=='GIFT'||list.giftEnabled));
  if(!['PG_PAYMENT_FAILED','PG_PAYMENT_CANCELLED'].includes(error.code)&&!(error.code==='PG_PAYMENT_NOT_PAID'&&!resumable))return false;
  if(own)savePendingPack(ownerId,null);setPendingOrder('');setMessage(copy.notPaid);
  if(new URLSearchParams(location.search).has('service_pack_return'))history.replaceState({},'',shopPath);
  return true;
 },[ownerId,copy,shopPath]);
 const checkOrder=useCallback(async(orderId:string)=>{
  if(!ownerId||lock.current)return;if(readPendingPack(ownerId)?.purchaseType==='GIFT'){window.location.assign(`/gift/complete/?orderId=${encodeURIComponent(orderId)}`);return;}lock.current=true;setBusy(true);setMessage(copy.confirm);
  const stored=readPendingPack(ownerId);
  recheck.current?.abort();const controller=recheck.current=new AbortController();
  try{const granted=await confirmPackOrderWithRecheck(orderId,controller.signal);if(scope.current!==ownerId)return;if(granted){savePendingPack(ownerId,null);setPendingOrder('');setMessage('');setCompleted({orderId,planId:stored?.orderId===orderId?stored.planId:'',context:stored?.context?readConsultationContext(new URLSearchParams(stored.context)):context});await refreshWallet();const query=new URLSearchParams(location.search);if(query.has('service_pack_return'))history.replaceState({},'',shopPath);}else setMessage(copy.confirm);}
  catch(error){loginIfNeeded(error);if(!releaseUnpaid(orderId,error))setMessage(copy.confirm);}finally{lock.current=false;setBusy(false);}
 },[ownerId,copy,refreshWallet,releaseUnpaid,shopPath,context]);
 useEffect(()=>{
  if(!ownerId)return;const query=new URLSearchParams(location.search);if(query.get('service_pack_return')!=='1')return;
  const orderId=query.get('orderId')||'';if(!orderId||orderId.length>160)return;setPendingOrder(orderId);
  // 같은 탭의 취소·실패는 저장된 주문으로 이어가기를 띄운다. 다른 탭 복귀는 저장본이 없으니 아래 확인에서 미결제면 잠금을 푼다.
  if((query.get('code')||query.get('imp_success')==='false')&&readPendingPack(ownerId)?.orderId===orderId){setMessage(copy.confirm);return;}
  const providerId=query.get('paymentId')||query.get('payment_id')||query.get('imp_uid');
  if(providerId&&providerId!==orderId){setMessage(copy.unavailable);return;}
  void checkOrder(orderId);
 },[ownerId,checkOrder,copy]);
 const resume=async()=>{
  if(!ownerId||lock.current||!resumeConsent)return;
  lock.current=true;setBusy(true);setMessage(copy.confirm);
  const stored=readPendingPack(ownerId);
  try{
   const granted=await resumePendingPackPurchase(ownerId,resumeConsent,()=>scope.current===ownerId);
   if(scope.current!==ownerId)return;
   if(granted){savePendingPack(ownerId,null);setPendingOrder('');setMessage('');setCompleted({orderId:stored?.orderId||pendingOrder,planId:stored?.planId||'',context:stored?.context?readConsultationContext(new URLSearchParams(stored.context)):context});await refreshWallet();}
  }catch(error){if(scope.current===ownerId&&!releaseUnpaid(pendingOrder,error)){loginIfNeeded(error);setMessage(error instanceof ServicePackError&&error.code==='APP_PACK_NOT_AVAILABLE'?copy.webOnly:copy.confirm);}}
  finally{lock.current=false;setBusy(false);setResumeConsent(false);}
 };
 const pending=ownerId&&pendingOrder?readPendingPack(ownerId):null;
 const resumePlan=pending?.orderId===pendingOrder&&pending.packSnapshot
  &&(pending.purchaseType!=='GIFT'||catalog.giftEnabled)
  &&samePackSnapshot(pending.packSnapshot,pending.packSnapshot)
  ?{...pending.packSnapshot,autoRenew:false as const}:undefined;
 const currentWallet=wallet.ownerId===ownerId?wallet:null;
 const completedPack=completed?currentWallet?.packs.find(pack=>pack.orderId===completed.orderId):undefined;
 const completedFish=completedPack?.fishId;
 const completedName=completedPack?packName(completedPack,locale):'';
 const footer=<>
  {pendingOrder&&<button type="button" className={`mt-4 ${ghost}`} disabled={busy} onClick={()=>void checkOrder(pendingOrder)}>{copy.recheck}</button>}
  {resumePlan&&pending&&<div className="moon-plan-card mt-4 rounded-[22px] p-4" data-pack-resume>
   <p>{packScope(resumePlan,locale)}</p><h3 className="text-base font-black text-white">{packName(resumePlan,locale)} · {won(resumePlan.priceKRW,locale)} · {pending.purchaseType==='GIFT'?copy.giftPurchase:copy.selfPurchase}</h3>
   <p className="mt-1 text-sm leading-relaxed text-[color:var(--moon-mist)]">{copy.resumeNotice}</p>
   <label className="mt-3 flex items-start gap-2 rounded-[14px] border border-[color:var(--sp-line)] bg-[color:var(--sp-raised)] px-3.5 py-3 text-[12px] font-bold text-[color:var(--sp-ink)]"><input type="checkbox" className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[color:var(--sp-light)]" checked={resumeConsent} onChange={event=>setResumeConsent(event.target.checked)} disabled={busy}/><span>{copy.resumeConsent}</span></label>
   <p className="mt-2 text-sm"><a href={links.terms}>{policy.legalTerms}</a> · <a href={links.refund}>{policy.legalRefund}</a></p>
   <button type="button" className="btn-moonlight mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto" disabled={busy||!resumeConsent||isMobileAppRuntime()} onClick={()=>void resume()}>{copy.resumePayment}</button>
  </div>}
  {message&&<p role="status" className="mt-3 text-sm font-bold text-[color:var(--moon-silver)]">{message}</p>}
  <div ref={ownedRef} className="mt-6 scroll-mt-24 border-t border-[color:var(--moon-rim)] pt-5">
   <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="fish-packs-title" className="text-lg font-black text-white">{copy.owned}</h2><Link className="text-sm font-bold" href="/gift/box/" prefetch={false}>{copy.giftBox}</Link></div>
   {!ownerId?<button type="button" className={`mt-3 ${ghost}`} onClick={loginForCurrentPage}>{copy.login}</button>:!currentWallet||currentWallet.loading&&!currentWallet.packs.length?<p role="status" className="mt-3 text-sm text-[color:var(--moon-mist)]">{copy.loading}</p>:<>
    {currentWallet.error&&<p role="alert" className="mt-3 text-sm text-[color:var(--moon-mist)]">{copy.unavailable} <button type="button" className={ghost} onClick={()=>void refreshWallet()}>{copy.retry}</button></p>}
    {currentWallet.packs.length?<PackRows packs={currentWallet.packs} locale={locale}/>:null}
    {currentWallet.nextCursor&&<button type="button" className={ghost} disabled={currentWallet.loading} onClick={()=>void refreshWallet(currentWallet.nextCursor!)}>{copy.more}</button>}
   </>}
  </div>
 </>;
 // 보유분도 진행 중인 주문도 없으면 아무것도 그리지 않는다. 고객은 바로 꿀단지 4종을 본다.
 if(!completed&&!pendingOrder&&!message&&!currentWallet?.packs.length&&!currentWallet?.error&&!(returning&&!ownerId))return null;
 return <section id="fish-packs" className={styles.shop} aria-labelledby="fish-packs-title">
  {completed&&<div ref={completedRef} role="status" data-pack-completed className="mt-5 rounded-[22px] border border-[rgba(94,234,212,0.45)] bg-[rgba(94,234,212,0.08)] p-4 shadow-[0_0_28px_rgba(94,234,212,0.16)]">
   <div className="flex items-center gap-4">
    <div className="relative h-20 w-20 flex-shrink-0">
     {completedFish&&<Image src={SERVICE_PACK_IMAGES[completedFish]} alt="" width={240} height={240} sizes="80px" className="h-full w-full object-contain"/>}
     <Image src={APPLIED_STAMP_IMAGES.yeongnyangi} alt="" width={120} height={120} sizes="48px" data-applied-stamp className="absolute -bottom-2 -right-3 h-12 w-12 object-contain drop-shadow-[0_4px_8px_rgba(3,4,18,0.42)]"/>
    </div>
    <div className="min-w-0">
     <p className="text-base font-black leading-snug text-white [word-break:keep-all] [text-wrap:balance]">{completedName?packText(copy.appliedDone,{name:completedName}):copy.complete}</p>
     {completedName&&<p className="mt-1 text-sm font-bold text-[color:var(--moon-mist)]">{copy.complete}</p>}
     {completedPack&&<p className="mt-1 flex flex-wrap gap-x-2 text-sm font-bold text-[color:var(--moon-teal)]"><span>{packText(copy.remaining,{total:completedPack.totalUses,remaining:completedPack.remainingUses})}</span><span className="text-[color:var(--moon-mist)]">{packExpiry(completedPack,locale)}</span></p>}
    </div>
   </div>
   <div className="mt-3 flex flex-wrap gap-2">
    <Link href={consultationResumePath(completed.context||context)} prefetch={false} className="btn-moonlight inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-black !text-white">{(completed.context||context)&&locale==='ko'?'상담 이어가기':copy.goConsult}</Link>
    <button type="button" className={ghost} onClick={()=>ownedRef.current?.scrollIntoView({behavior:'smooth',block:'start'})}>{copy.viewOwned}</button>
   </div>
  </div>}
  {footer}
 </section>;
}

// 상담 결제 화면의 '내 이용권' 두 칸. 표시 전용 — 달빛 이용권은 결제 진입 로컬 스냅샷, 세트는 이 상담 quote 후보로만 그린다.
// 어느 수단이 실제로 차감되는지는 서버가 판정하므로 Family 가 아니면 '적용 중'을 단정하지 않는다.
function CheckoutPassSummary({locale,flower,pack,applied}:{locale:LoadingLocale;flower:SubscriptionSnapshot|null;pack?:OwnedServicePack;applied:number|null}){
 const copy=servicePackCopy(locale),owned=!!flower&&flower.state==='active'&&flower.tier!=='free',family=owned&&flower.tier==='family';
 if(!owned&&!pack)return null;
 return <section className={styles.passes} aria-labelledby="checkout-passes-title" data-checkout-passes>
  <h2 id="checkout-passes-title">{copy.passesTitle}</h2>
  <div className={styles.passGrid}>
   <div className={styles.passTile} data-checkout-pass="flower" data-applied="false">
    <div className={styles.passArt}>{owned?<><HoneyPassArtwork tier={flower.tier} className="h-14 w-14" sizes="56px"/></>:<HoneyPassArtwork tier="standard" className={`h-14 w-14 ${styles.passMuted}`} sizes="56px"/>}</div>
    <div><p className={styles.passKind}>{copy.flowerPass}</p>{owned?<><strong>{getPassTierLabel(flower.tier,locale)||flower.tier}</strong>{family&&<p className={styles.passOn}>{locale==='ko'?'사용 가능 여부 확인':copy.flowerFamilyApply}</p>}<p>{family?copy.flowerFamilyApply:copy.flowerFamilyOnly}</p></>:<p>{flower?.state==='none'&&!flower.stale?copy.flowerNone:locale==='ko'?'Family 보유 여부는 사용 시 확인해요.':'Family eligibility will be checked when selected.'}</p>}</div>
   </div>
   <div className={styles.passTile} data-checkout-pass="yeongnyangi" data-applied={applied!==null?'true':'false'}>
    <div className={styles.passArt}>{pack?<><Image src={SERVICE_PACK_IMAGES[pack.fishId]} alt="" width={240} height={240} sizes="56px"/>{applied!==null&&<Image src={APPLIED_STAMP_IMAGES.yeongnyangi} alt="" width={120} height={120} sizes="36px" data-applied-stamp className={styles.passStamp}/>}</>:<Image src={SERVICE_PACK_IMAGES.mackerel} alt="" width={240} height={240} sizes="56px" className={styles.passMuted}/>}</div>
    <div><p className={styles.passKind}>{copy.packPass}</p>{pack?<><strong>{packName(pack,locale)}</strong><p className={styles.passOn}>{applied===null?copy.packUsable:packText(copy.packApplied,{remaining:applied})}</p>{applied===null&&<><p>{packText(copy.remaining,{total:pack.totalUses,remaining:pack.remainingUses})}</p></>}</>:<p>{copy.packNone}</p>}</div>
   </div>
  </div>
 </section>;
}

export function ServicePackCheckout({requestId,featureKey,locale,disabled,onBusyChange,onPaid}:{requestId:string;featureKey:string;locale:LoadingLocale;disabled:boolean;onBusyChange:(busy:boolean)=>void;onPaid:()=>void}){
 const copy=servicePackCopy(locale),fundingId=`yn-${requestId}`;
 const [quote,setQuote]=useState<PackQuote|null>(null),[failed,setFailed]=useState(false),[checking,setChecking]=useState(true),[selected,setSelected]=useState(''),[busy,setBusy]=useState(false);
 const lock=useRef(false),callbacks=useRef({onBusyChange,onPaid});callbacks.current={onBusyChange,onPaid};
 const [flower,setFlower]=useState<SubscriptionSnapshot|null>(null),[applied,setApplied]=useState<number|null>(null);
 useEffect(()=>{setFlower(readSubscriptionSnapshotForUser());},[]);
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
   // 차감이 끝나면 '적용됨'을 잠깐 보여 주고 돌아간다. 그 사이에도 lock 이 잡혀 있어 이중 차감 클릭을 막는다.
   const result=await consumeServicePack(fundingId,selected);setApplied(result.remainingUses);
   await new Promise(resolve=>setTimeout(resolve,1200));callbacks.current.onPaid();
  }catch(error){loginIfNeeded(error);setFailed(true);}
  finally{lock.current=false;setBusy(false);callbacks.current.onBusyChange(false);}
 };
 const usable=quote?.status==='available'?quote.candidates.filter(pack=>pack.available&&pack.remainingUses>0):[];
 const summary=<CheckoutPassSummary locale={locale} flower={flower} pack={usable.find(pack=>pack.entitlementId===selected)||usable[0]} applied={applied}/>;
 if(!checking&&!failed&&!busy&&!quote?.candidates.length)return summary;
 return <>{summary}<section className={styles.checkout} aria-labelledby="service-pack-choice-title">
  <h2 id="service-pack-choice-title">{copy.checkout}</h2>
  {checking&&<p role="status">{copy.loading}</p>}
  {failed&&<p role="alert">{copy.unavailable}</p>}
  {applied!==null?<p role="status" className={styles.passOn} data-pack-applied>{packText(copy.packApplied,{remaining:applied})}</p>:busy&&<p role="status">{copy.working}</p>}
  {!checking&&!busy&&!failed&&quote&&['restored','unavailable'].includes(quote.status)&&<p>{copy.inactive}</p>}
  {(failed||busy)&&applied===null&&<button type="button" onClick={()=>void refresh()} disabled={checking||lock.current}>{copy.retry}</button>}
  {!failed&&!busy&&quote?.status==='available'&&quote.candidates.some(pack=>pack.available)&&<>
   <fieldset className={styles.choices}><legend>{copy.owned}</legend>{quote.candidates.filter(pack=>pack.available).map(pack=><label key={pack.entitlementId}>
    <input type="radio" name="service-pack-entitlement" value={pack.entitlementId} checked={selected===pack.entitlementId} onChange={()=>setSelected(pack.entitlementId)} disabled={disabled||checking}/>
    <span><strong>{packName(pack,locale)}</strong><span>{packText(copy.remaining,{total:pack.totalUses,remaining:pack.remainingUses})}</span><span>{packExpiry(pack,locale)}</span></span>
   </label>)}</fieldset>
   <button type="button" onClick={()=>void consume()} disabled={disabled||checking||!selected}>{copy.use}</button>
  </>}
 </section></>;
}
