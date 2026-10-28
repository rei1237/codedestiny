'use client';

import {useEffect,useRef,useState,type ReactNode} from 'react';
import Image from 'next/image';
import {refreshAuth,useAuthStore} from '@/app/_lib/auth-store';
import {fetchPaymentEligibility,runPaidAccessGate,isMobileAppRuntime,type PaymentEligibility} from '@/app/_lib/billing-client';
import {usePaidResume} from '@/app/hooks/usePaidResume';
import {resolveServerFeaturePricing} from '@/lib/payment/server-feature-pricing';
import {consumeServicePack,quoteServicePack,readPackWallet,ServicePackError,type OwnedServicePack} from '@/app/components/service-packs/service-pack-client';
import {loginForCurrentPage,resultPath,checkoutPath,type FortuneRecord} from '../yeongnyangi/_lib/api';
import MoonstoneDiscountBalance from './MoonstoneDiscountBalance';
import {resolveCheckoutPolicyHrefs} from './checkout-copy';
import type {Product} from '@/worker/yeongnyangi/payments/catalog';
import styles from './yeongnyangi-checkout.module.css';

export type ConsultationCheckoutDraft={product:Product;question:string;chapters:number;children:ReactNode;ready:boolean;hint?:string;onLogin?:()=>void;onPrepare:()=>Promise<FortuneRecord|undefined>};
type Method='family'|'stones'|'direct'|`pack:${string}`;
const won=(value:number)=>value.toLocaleString('ko-KR')+'원';
async function readCheckoutPacks(){
 const packs:OwnedServicePack[]=[],seen=new Set<string>();let cursor:string|undefined;
 do{const page=await readPackWallet(cursor);packs.push(...page.packs);cursor=page.nextCursor||undefined;
  if(cursor&&seen.has(cursor))throw new Error('이용권 목록을 확인하지 못했어요.');if(cursor)seen.add(cursor);
 }while(cursor);
 return packs;
}

/** Display queries never grant access. A chosen method funds the prepared request through the existing gates. */
export default function YeongnyangiCheckout({draft}:{draft:ConsultationCheckoutDraft}){
 const auth=useAuthStore(),owner=String(auth.user?.id||auth.user?._id||''),signedIn=auth.isAuthenticated||Boolean(auth.user);
 useEffect(()=>{void refreshAuth();},[]);
 const [revision,setRevision]=useState(0),[method,setMethod]=useState<Method>('direct');
 const [benefits,setBenefits]=useState<{owner:string;key:string;loading:boolean;eligibility:PaymentEligibility|null;packs:OwnedServicePack[];error:boolean}>({owner:'',key:'',loading:true,eligibility:null,packs:[],error:false});
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [discount,setDiscount]=useState('0');
 const lock=useRef(false),account=useRef(owner);account.current=owner;
 const feedback=useRef<HTMLParagraphElement>(null);
 useEffect(()=>{if(message&&!busy){feedback.current?.focus({preventScroll:true});feedback.current?.scrollIntoView({block:'center'});}},[message,busy]);
 const pricing=resolveServerFeaturePricing({featureKey:draft.product.cdFeatureKey});
 const policyHrefs=resolveCheckoutPolicyHrefs('ko');
 const native=isMobileAppRuntime(),quantity=Number(discount);
 const amount=pricing?pricing.amountKRW-quantity*(pricing.amountKRW/pricing.membershipCreditCost):0;
 const validDiscount=Number.isSafeInteger(quantity)&&quantity>=0&&Number.isSafeInteger(amount)&&amount>=1000;
 const buildResume=usePaidResume('yeongnyangi-checkout',args=>{
  const target=typeof args.returnTo==='string'?args.returnTo:'';
  if(!/^\/yeongnyangi\/result\/\?id=[a-f0-9]{64}(?:&lang=[a-z-]+)?$/.test(target))return false;
  window.location.replace(target);return true;
 });
 useEffect(()=>{
  let active=true;setMethod('direct');setDiscount('0');setMessage('');
  setBenefits({owner,key:draft.product.cdFeatureKey,loading:signedIn,eligibility:null,packs:[],error:false});
  if(!signedIn)return;
  void Promise.allSettled([fetchPaymentEligibility({featureKey:draft.product.cdFeatureKey},{revalidate:true}),readCheckoutPacks()]).then(([eligibility,wallet])=>{
   if(!active)return;
   const data=eligibility.status==='fulfilled'&&eligibility.value.ok?eligibility.value.data:null;
   const packs=wallet.status==='fulfilled'?wallet.value:[];
   const firstPack=packs.find(pack=>pack.available&&pack.remainingUses>0&&pack.eligibleFeatureKeys.includes(draft.product.cdFeatureKey));
   setMethod(data?.pass.tier==='family'&&data.pass.canUse?'family':firstPack?`pack:${firstPack.entitlementId}`:'direct');
   setBenefits({owner,key:draft.product.cdFeatureKey,loading:false,eligibility:data,packs,error:!data||wallet.status==='rejected'});
   try{const saved=JSON.parse(sessionStorage.getItem('yeongnyangi:checkout-method')||'null');
    if(saved?.owner===owner&&saved?.key===draft.product.cdFeatureKey&&Date.now()-saved.at<3600000){
     const available=saved.method==='direct'||saved.method==='family'&&data?.pass.tier==='family'&&data.pass.canUse||saved.method==='stones'&&data?.monthly.canUse&&!pricing?.monthlyExcluded||packs.some(pack=>saved.method===`pack:${pack.entitlementId}`&&pack.available&&pack.remainingUses>0&&pack.eligibleFeatureKeys.includes(draft.product.cdFeatureKey));
     if(available)setMethod(saved.method);else setMessage('이전에 선택한 혜택을 적용할 수 없어요. 이용 방법을 다시 골라주세요.');
    }
   }catch{/* Optional preference only; server proof is always required. */}
  });
  return()=>{active=false;};
 },[owner,signedIn,draft.product.cdFeatureKey,pricing?.monthlyExcluded,revision]);
 const current=benefits.owner===owner&&benefits.key===draft.product.cdFeatureKey?benefits:null;
 const eligible=current?.eligibility;
 const packs=current?.packs.filter(pack=>pack.eligibleFeatureKeys.includes(draft.product.cdFeatureKey))||[];
 const family=eligible?.pass.tier==='family'&&eligible.pass.canUse;
 const stones=Boolean(eligible?.monthly.canUse&&!pricing?.monthlyExcluded);
 const selectedPack=method.startsWith('pack:')?packs.find(pack=>pack.entitlementId===method.slice(5)):undefined;
 function choose(next:Method){setMethod(next);setMessage('');try{sessionStorage.setItem('yeongnyangi:checkout-method',JSON.stringify({owner,key:draft.product.cdFeatureKey,method:next,at:Date.now()}));}catch{/* Optional display preference. */}}
 const selectedValid=method==='direct'&&validDiscount||method==='family'&&family||method==='stones'&&stones||Boolean(selectedPack?.available&&selectedPack.remainingUses>0);
 const checking=!auth.authReady||auth.isLoading||signedIn&&(!current||current.loading);
 const deduction=method==='family'?'패밀리 이용권 한도에서 '+won(pricing?.amountKRW||0)+' 사용':method==='stones'?`월정석 ${pricing?.membershipCreditCost.toLocaleString('ko-KR')}개 사용`:selectedPack?`${selectedPack.label} 1회 사용 · 사용 후 ${selectedPack.remainingUses-1}회`:'단건 결제';
 async function pay(){
  if(lock.current||checking)return;
  if(!signedIn){(draft.onLogin||loginForCurrentPage)();return;}
  if(!pricing||!selectedValid||checking)return;
  if(!draft.ready)return;
  lock.current=true;setBusy(true);setMessage('상담 내용을 준비하고 있어요.');
  const startedOwner=owner;
  try{
   const row=await draft.onPrepare();if(!row)return;
   if(account.current!==startedOwner)throw new Error('로그인 계정이 변경됐어요. 상담 내용을 다시 확인해 주세요.');
   const returnTo=resultPath(row.id,'ko');
   if(row.paid||row.state==='AWAITING_DRAW'){window.location.replace(returnTo);return;}
   if(native&&method==='direct'){window.location.assign(checkoutPath(row,'ko'));return;}
   if(row.product.cdFeatureKey!==pricing.featureKey)throw new Error('상담 상품이 변경됐어요. 내용을 다시 확인해 주세요.');
   const requestId=`yn-${row.id}`;
   if(selectedPack){
    setMessage('이용권을 확인하고 있어요.');
    const quote=await quoteServicePack(requestId,pricing.featureKey);
    if(['paid','used'].includes(quote.status)){window.location.replace(returnTo);return;}
    if(quote.status!=='available'||!quote.candidates.some(pack=>pack.entitlementId===selectedPack.entitlementId&&pack.available))throw new Error('이용권 상태가 변경됐어요. 보유 혜택을 다시 확인해 주세요.');
    await consumeServicePack(requestId,selectedPack.entitlementId);window.location.replace(returnTo);return;
   }
   setMessage(method==='direct'?'결제 창을 준비하고 있어요.':'선택한 혜택을 적용하고 있어요.');
   const result=await runPaidAccessGate({featureKey:pricing.featureKey,reason:draft.product.name,requestId,cost:pricing.cost,amountKRW:pricing.amountKRW,
    paymentMode:method==='family'?'MEMBERSHIP_PASS':method==='stones'?'MOONLIGHT_STONE':undefined,
    allowedPaymentModes:method==='family'?['pass']:method==='stones'?['monthly']:['direct'],
    membershipCreditCost:pricing.membershipCreditCost,moonstoneQuantity:method==='direct'?quantity:0,disablePassFirst:method!=='family',passStorePlan:'family',resume:buildResume({returnTo})});
   const code=String(result.error?.code||'');
   if(result.ok||code==='FORTUNE_ALREADY_PAID'){window.location.replace(returnTo);return;}
   if(['AUTH_REQUIRED','UNAUTHORIZED'].includes(code)){loginForCurrentPage();return;}
   setMessage(['PAYMENT_CANCELLED','PG_PAYMENT_CANCELLED'].includes(code)?'결제를 취소했어요. 상담 내용은 그대로 남아 있어요.':result.error?.message||result.message||'결제 상태를 확인하지 못했어요. 같은 상담에서 다시 확인해 주세요.');
  }catch(error){if(error instanceof ServicePackError&&error.status===401){loginForCurrentPage();return;}setMessage(error instanceof ServicePackError?'이용권 적용 상태를 확인하지 못했어요. 같은 상담에서 다시 확인해 주세요.':error instanceof Error?error.message:'상담 준비 중 문제가 생겼어요. 다시 시도해 주세요.');}
  finally{lock.current=false;setBusy(false);}
 }
 return <section className={styles.checkout} data-yn-checkout data-yn-night aria-labelledby="yn-checkout-title">
  <header className={styles.header}>
   <div className={styles.intro}><h1 id="yn-checkout-title">마음을 맡길 준비</h1><p>당신의 질문을 품고,<br/>영냥이가 푸른 달빛을 밝힐게요.</p></div>
   <div className={styles.art} aria-hidden="true"><Image src="/assets/yeongnyangi/checkout-moonblue.webp" width={640} height={640} sizes="(max-width:760px) 160px, 260px" alt="" priority/><span className={styles.fish}/><span className={styles.fish}/></div>
   <blockquote className={styles.question}>{draft.question}</blockquote>
   <div className={styles.trail} aria-hidden="true">{[0,1,2].map(step=><span className={styles.paw} key={step}><i/><i/><i/><i/></span>)}</div>
  </header>
  <div className={styles.layout}>
   <div className={styles.details}><fieldset disabled={busy} className={styles.inputs}>{draft.children}</fieldset></div>
   <aside className={styles.summary} aria-label="상담과 결제 요약">
    <div className={styles.product}><img src={`/assets/yeongnyangi/fish/${draft.product.fishId}.webp`} width={120} height={54} alt=""/><div><h2>{draft.product.name} · {draft.product.fishName}</h2><p>{draft.chapters}개 챕터로 살펴보는 나의 이야기</p></div></div>
    <fieldset className={styles.methods} disabled={busy||checking}><legend>이용 방법</legend>
     {checking?<p role="status">보유 이용권과 월정석 확인 중</p>:!signedIn?<p>로그인하면 보유 이용권을 확인할 수 있어요.</p>:<>
      {current?.error&&<p role="alert">보유 혜택을 모두 확인하지 못했어요. <button type="button" onClick={()=>setRevision(value=>value+1)}>다시 확인하기</button></p>}
      {(family||packs.some(pack=>pack.available&&pack.remainingUses>0))&&<p className={styles.passHint}>사용 가능한 이용권을 먼저 선택해 드려요. 원하면 아래에서 바꿀 수 있어요.</p>}
      {eligible&&<label className={styles.choice}><input type="radio" name="yn-method" checked={method==='family'} disabled={!family} onChange={()=>choose('family')}/><span><strong>패밀리 이용권</strong><small>{family?'사용 가능 · 추가 결제 없음':eligible.pass.hasActivePass?'이번 상담에 적용할 수 없어요. 이용 한도와 등급을 확인해 주세요.':'사용 가능한 패밀리 이용권이 없어요.'}</small></span></label>}
      {packs.map(pack=><label key={pack.entitlementId} className={styles.choice}><input type="radio" name="yn-method" checked={method===`pack:${pack.entitlementId}`} disabled={!pack.available||pack.remainingUses<=0} onChange={()=>choose(`pack:${pack.entitlementId}`)}/><span><strong>{pack.label}</strong><small>{pack.available?`${pack.remainingUses}회 남음 · 이번 상담에 1회 사용`:'만료·소진 또는 회수되어 사용할 수 없어요.'}</small></span></label>)}
      {!pricing?.monthlyExcluded&&eligible&&<label className={styles.choice}><input type="radio" name="yn-method" checked={method==='stones'} disabled={!stones} onChange={()=>choose('stones')}/><span><strong>월정석</strong><small>{pricing?.membershipCreditCost.toLocaleString('ko-KR')}개 사용 · 보유 {eligible.monthly.balance.toLocaleString('ko-KR')}개{!stones?' · 사용 가능 잔액 부족':''}</small></span></label>}
     </>}
     <label className={styles.choice}><input type="radio" name="yn-method" checked={method==='direct'} onChange={()=>choose('direct')}/><span><strong>단건 결제</strong><small>이번 상담 한 번 · {native?'Google Play에서 금액 확인':won(pricing?.amountKRW||draft.product.priceKRW)}</small></span></label>
     {method==='direct'&&!native&&pricing&&!pricing.monthlyExcluded&&pricing.monthlyCreditMultiplier===1&&<details><summary>월정석으로 일부 할인받기</summary><MoonstoneDiscountBalance signedIn={signedIn} userId={owner} maxDiscountStones={Math.floor((pricing.amountKRW-1000)/(pricing.amountKRW/pricing.membershipCreditCost))} selected={quantity} onUse={setDiscount}/><label>사용할 월정석<input type="number" min={0} step={1} max={Math.floor((pricing.amountKRW-1000)/(pricing.amountKRW/pricing.membershipCreditCost))} value={discount} onChange={event=>setDiscount(event.target.value)}/></label><p>단건 결제 잔액은 1,000원 이상이어야 해요.</p></details>}
    </fieldset>
    <div className={styles.action}><p>{checking?'보유 이용권을 확인하고 있어요.':signedIn&&!draft.ready?draft.hint||'상담 정보를 먼저 확인해 주세요.':deduction}</p><div className={styles.total}><span>추가 결제 금액</span><strong>{checking?'확인 중':method==='direct'?(native?'Google Play':validDiscount?won(amount):'수량 확인 필요'):won(0)}</strong></div><button type="button" className={styles.pay} disabled={busy||checking||signedIn&&(!draft.ready||!selectedValid)} onClick={()=>void pay()}>{busy?'상담 준비 중':checking?'이용권 확인 중':!signedIn?'로그인하고 이어가기':method==='direct'?'결제하고 상담 시작하기':'상담 시작하기'}</button></div>
    <p ref={feedback} tabIndex={-1} className={styles.feedback} role="status">{message}</p>
    {message&&!busy&&signedIn&&<button type="button" onClick={()=>setRevision(value=>value+1)}>보유 혜택 다시 확인하기</button>}
    <p className={styles.legal}>결제 전 필요한 정보를 모두 확인해요. 저장된 결과는 영냥이 보관함에서 다시 볼 수 있어요.</p>
    <p className={styles.legal}><a href={policyHrefs.terms}>이용약관</a> · <a href={policyHrefs.refund}>환불 안내</a> · <a href={policyHrefs.support}>문의하기</a></p>
   </aside>
  </div>
 </section>;
}
