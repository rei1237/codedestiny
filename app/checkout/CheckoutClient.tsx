"use client";

/**
 * 영냥이(SoulCat) Family·월정석·단건 결제 호스트 — 겸 CD 내부 영냥이 상품(app/yeongnyangi/) 결제창.
 *
 * 흐름: 상담 요청이 402 `PAYMENT_REQUIRED` 로 `/checkout/?featureKey=yeongnyangi-…&returnTo=/yeongnyangi/…` 를
 * 가리킨다 → 여기서 CD 결제창을 **Family 이용권·월정석·단건 결제**으로 연다 → 권한이 확인되면 returnTo 로 돌아간다.
 * 결과 화면은 CODE DESTINY 서버에서 동일 요청의 PG 증명을 확인하고 저장된 상담을 이어간다.
 *
 * 이 페이지는 두 진입점을 공유한다 — `isSoulCatMode = !params.requestId`로 분기한다.
 * - **SoulCat 모드**(`requestId` 없음, featureKey+returnTo만 옴): 위 흐름 그대로. 가용성 확인·웹훅
 *   선확인을 스킵한다(SoulCat 쪽에 대응하는 CD 상담 레코드가 없어 조회 자체가 불가능하기 때문).
 * - **CD 내부 모드**(`requestId`=64자리 상담 id): CD 자체 영냥이 상품이 결제 전 만들어 둔 상담
 *   레코드의 id로 이 페이지를 연다 — `available`/웹훅 선확인이 그 레코드를 직접 조회한다.
 *
 * 🔴 일반 이용권은 적용되지 않는다. 월정석 허용과 환산은 서버 payment policy 정본을 따른다.
 *    Family 이용권은 기존 한도로 적용하고, 실제 결제수단은 공용 게이트에서 선택한다.
 * 🔴 featureKey 는 `yeongnyangi-` 접두만 받는다 — 이 페이지가 다른 상품의 우회 결제창이 되면 안 된다.
 * 🔴 가격은 레지스트리(resolveServerFeaturePricing)에서만 온다. URL 의 금액을 믿지 않는다.
 * 🔴 화면 문구는 `checkout-copy.ts` 의 동기 표에서 온다. 사전(useT)으로 옮기면 첫 렌더가 비고, 그건
 *    결제 임계 화면에서 번역 누락보다 나쁘다. 상품명·분석 깊이는 아직 카탈로그의 한국어 데이터다.
 */

import {ServicePackCheckout} from "@/app/components/service-packs/ServicePacks";
import {readPackCatalog,type ServicePackPlan} from '@/app/components/service-packs/service-pack-client';
import {consultationShopPath,readConsultationContext} from '@/app/components/service-packs/consultation-context';
import {FOLLOWUP_LIMITS} from '@/worker/yeongnyangi/fortune/ask/question-policy';
import type {FishId} from '@/worker/yeongnyangi/fortune/shared/contracts';
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { refreshAuth, useAuthStore } from "@/app/_lib/auth-store";
import { isMobileAppRuntime, loadPaidServiceRuntimeGate, runPaidAccessGate } from "@/app/_lib/billing-client";
import { authFetch } from "@/app/_lib/auth-client";
import { queryAppProducts } from "@/app/app/_lib/native-billing";
import { sanitizeAuthReturnPath } from "@/app/_lib/auth-return";
import { usePaidResume } from "@/app/hooks/usePaidResume";
import { resolveServerFeaturePricing } from "@/lib/payment/server-feature-pricing";
import "../yeongnyangi/night-tokens.css";
import { products } from "@/worker/yeongnyangi/payments/catalog";
import { depthDescriptions } from "@/worker/yeongnyangi/fortune/reading-policy";
import {consultationLocaleCopy,localizedSystem,localizedTier} from '../yeongnyangi/_lib/consultation-locale-copy';
import {readingLanguageNames} from '@/worker/yeongnyangi/fortune/reading-locale';
import {askPhase5Copy} from '../yeongnyangi/_lib/ask-phase5-copy';
import {readingDepthCopy,readingTierDepth} from '../yeongnyangi/_lib/reading-depth-copy';
import {isConciseReading} from '@/worker/yeongnyangi/fortune/concise-reading';
import { getCurrentLoadingLocale, INTL_LOCALE_BY_LOADING_LOCALE, type LoadingLocale } from "@/constants/loadingMessages";
import { getCheckoutCopy, resolveCheckoutPolicyHrefs } from "./checkout-copy";
import {fortuneApi,FortuneApiError,resultPath,type FortuneRecord} from '../yeongnyangi/_lib/api';
import { paymentAllianceCopy } from "./payment-alliance-copy";
import styles from "./checkout.module.css";

const FEATURE_KEY_PATTERN = /^yeongnyangi-[a-z0-9-]+$/;
const RETURN_TO_PREFIX = "/yeongnyangi/";
const DEFAULT_RETURN_TO = "/yeongnyangi/";
const RESUME_KIND = "yeongnyangi-checkout";
// 결제 화면의 "생선 다시 고르기" 도착지(내 상담 기록의 "새 상담 고르기"와 같은 경로).
const FISH_CHOOSER_PATH = "/yeongnyangi/fortune/";


type CheckoutParams = {
  requestId: string;
  featureKey: string;
  returnTo: string;
  paymentReturn: boolean;
};

type GateState =
  | { phase: "idle" }
  | { phase: "paying" }
  | { phase: "paid" }
  | { phase: "cancelled" }
  | { phase: "confirming"; message: string }
  | { phase: "error"; message: string };

/** returnTo 는 auth-return 규칙을 통과한 뒤에도 영냥이 경로만 허용한다(오픈 리다이렉트 봉쇄). */
function resolveReturnTo(raw: string | null): string {
  const safe = sanitizeAuthReturnPath(raw);
  if (!safe || !safe.startsWith(RETURN_TO_PREFIX)) return DEFAULT_RETURN_TO;
  return safe;
}

function resolveFeatureKey(raw: string | null): string {
  const key = String(raw || "").trim().toLowerCase();
  return FEATURE_KEY_PATTERN.test(key) ? key : "";
}

function readParams(): CheckoutParams {
  if (typeof window === "undefined") return { requestId: "", featureKey: "", returnTo: DEFAULT_RETURN_TO, paymentReturn: false };
  const params = new URLSearchParams(window.location.search);
  const requestId=/^[a-f0-9]{64}$/.test(params.get("requestId")||"") ? params.get("requestId")! : "";
  return {
    requestId,
    paymentReturn: ["portone_redirect", "paymentId", "payment_id", "imp_uid"].some(key => params.has(key)),
    featureKey: resolveFeatureKey(params.get("featureKey")),
    returnTo: requestId ? resultPath(requestId) : resolveReturnTo(params.get("returnTo")),
  };
}

function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  const { pathname, search } = window.location;
  const next = encodeURIComponent(`${pathname}${search || ""}`);
  window.location.assign(`/login?next=${next}&returnTo=${next}&redirect=${next}`);
}

/** 결제를 안 하고 나갈 때 브라우저 뒤로가기가 "이전 화면"인지 판정한다. 같은 출처 영냥이 화면(상담 폼 등)에서 넘어왔을 때만 참이다.
 * 새 탭·PG 왕복 뒤(직전 문서가 PG 이거나 비어 있음)·미결제 결과 화면에서 온 경우는 거짓이라 링크의 href(영냥이 방)가 처리한다 —
 * 뒤로가기가 PG 페이지로 새거나 결과 화면으로 되돌아가는 일이 없다. */
function canGoBackToPreviousScreen(paymentReturn: boolean): boolean {
  // Referrer can survive an app round-trip; capture PG return before its query is removed.
  if (paymentReturn) return false;
  if (typeof window === "undefined" || window.history.length <= 1) return false;
  try {
    const from = new URL(document.referrer);
    return from.origin === window.location.origin
      && from.pathname.startsWith(RETURN_TO_PREFIX)
      && !from.pathname.startsWith(`${RETURN_TO_PREFIX}result`);
  } catch {
    return false;
  }
}

/** SoulCat 모드(requestId 없음)의 결정론적 requestId 재료. 서버 idempotency 키는 120자 상한만 있고
 * charset 제약은 없다 — 이 정리는 가독성용이지 정확성 요건이 아니다. */
function stableSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "default";
}

export default function CheckoutClient() {
  const [params] = useState<CheckoutParams>(() => readParams());
  const isSoulCatMode = !params.requestId;
  const auth = useAuthStore();
  const paymentLock=useRef(false),packLock=useRef(false);
  const [packBusy,setPackBusy]=useState(false);
  const [packOffer,setPackOffer]=useState<{plan:ServicePackPlan|null;error:boolean;loading:boolean}>({plan:null,error:false,loading:true});
  const [purchase,setPurchase]=useState<'single'|'pack'>('single');
  const [available,setAvailable]=useState(false);
  const [checked,setChecked]=useState(false);
  const [reading,setReading]=useState<FortuneRecord|null>(null);
  const [nativePrice,setNativePrice]=useState<string|null>(process.env.NEXT_PUBLIC_RUNTIME_TARGET === 'mobile-app' ? '' : null);
  const [gate, setGate] = useState<GateState>({ phase: "idle" });
  const [moonstoneInput,setMoonstoneInput]=useState('0');
  const [lang, setLang] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  // 표는 모듈 상수라 같은 로케일이면 참조가 그대로다 — 아래 useEffect·useCallback 의존성에 넣어도 안전하다.
  const copy = getCheckoutCopy(lang);
  const alliance = paymentAllianceCopy(lang);
  const intlLocale = INTL_LOCALE_BY_LOADING_LOCALE[lang] || INTL_LOCALE_BY_LOADING_LOCALE.ko;
  const policyHrefs = useMemo(() => resolveCheckoutPolicyHrefs(lang), [lang]);
  const formatKrw = useCallback(
    (amount: number) => copy.won(Math.max(0, Math.round(amount)), intlLocale),
    [copy, intlLocale],
  );

  useEffect(() => {
    if (!isMobileAppRuntime()) return;
    let cancelled = false;
    setNativePrice('');
    async function readPlayPrice() {
      try {
        const response = await authFetch(`/api/app-store/products?featureKey=${encodeURIComponent(params.featureKey)}`);
        if (!response.ok) return;
        const payload = await response.json();
        const productId = payload?.data?.product?.productId;
        if (!productId) return;
        const details = await queryAppProducts([productId]);
        const price = details.find(product => product.productId === productId)?.formattedPrice;
        if (!cancelled && price) setNativePrice(price);
      } catch { /* Unknown Play prices must never fall back to a web KRW price. */ }
    }
    void readPlayPrice();
    window.addEventListener('focus', readPlayPrice);
    return () => { cancelled = true; window.removeEventListener('focus', readPlayPrice); };
  }, [params.featureKey]);

  useEffect(() => {
    const sync = () => setLang(getCurrentLoadingLocale());
    window.addEventListener("languagechange", sync);
    window.addEventListener("cd:locale-ready", sync);
    return () => { window.removeEventListener("languagechange", sync); window.removeEventListener("cd:locale-ready", sync); };
  }, []);

  const product = products.find(item => item.cdFeatureKey === params.featureKey);
  const productName = product ? `${localizedSystem(product.readingKind === "single" ? product.domain : "fusion",lang)} · ${localizedTier(product.fishId,lang)}` : copy.title;

  const pricing = useMemo(() => {
    if (!params.featureKey) return null;
    return resolveServerFeaturePricing({ featureKey: params.featureKey });
  }, [params.featureKey]);

  const selectedStones = Number(moonstoneInput);
  useEffect(()=>{
    let active=true;
    readPackCatalog().then(data=>{if(active)setPackOffer({plan:data.plans.find(plan=>plan.totalUses===5&&plan.eligibleFeatureKeys.includes(params.featureKey))||null,error:false,loading:false});})
      .catch(()=>{if(active)setPackOffer({plan:null,error:true,loading:false});});
    return()=>{active=false;};
  },[params.featureKey]);
  const shopContext=readConsultationContext(new URLSearchParams({context:'yeongnyangi',featureKey:params.featureKey,requestId:params.requestId,lang}));
  const scopeName=reading?.consultation?.questionDecision&&product&&({mackerel:'일상 질문 상담',salmon:'중요한 선택 상담',flounder:'두 사람의 관계 상담',tuna:'장기 흐름 상담'} as Record<string,string>)[product.fishId];
  const discountedAmount = pricing ? pricing.amountKRW - selectedStones * (pricing.amountKRW / pricing.membershipCreditCost) : 0;
  const validDiscount = Number.isSafeInteger(selectedStones) && selectedStones >= 0 && Number.isSafeInteger(discountedAmount) && discountedAmount >= 1000;

  // 모바일 PG 복귀: 문서가 새로 열리므로 결제 전 굳혀 둔 returnTo 로 돌아간다(게이트를 다시 타지 않는다).
  const buildResume = usePaidResume(RESUME_KIND, (args) => {
    const target = resolveReturnTo(typeof args.returnTo === "string" ? args.returnTo : null);
    window.location.assign(target);
    return true;
  });

  const authSettled = auth.status !== "unknown" && auth.status !== "authenticating" && auth.status !== "refreshing";
  const signedIn = auth.isAuthenticated || Boolean(auth.user);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (!["portone_redirect", "paymentId", "payment_id", "imp_uid"].some(key => query.has(key))) return;
    // A PG return cannot wait for the provider's idle prewarm. Loading the shared
    // runtime confirms the original order and invokes the registered resume handler.
    let active = true;
    void loadPaidServiceRuntimeGate().then(runtime => {
      if (!runtime && active) setGate({ phase: "error", message: copy.errResumePrepare });
    }).catch(() => {
      if (active) setGate({ phase: "error", message: copy.errResumePrepare });
    });
    return () => { active = false; };
  }, [copy]);

  useEffect(() => {
    try {
      void refreshAuth();
    } catch {
      // 최종 판정은 결제 게이트(서버)가 한다.
    }
  }, []);

  useEffect(() => {
    if (!pricing || !authSettled || signedIn) return;
    // 미로그인은 로그인 뒤 이 페이지(쿼리 포함)로 돌아온다.
    redirectToLogin();
  }, [pricing, authSettled, signedIn]);

  useEffect(()=>{
    if(isSoulCatMode){setAvailable(true);setChecked(true);return;}
    if(!signedIn||!params.requestId){setChecked(true);return;}
    let active=true;
    Promise.all([fortuneApi<{fortune:FortuneRecord}>(`requests/${params.requestId}`),fortuneApi<{products:{cdFeatureKey:string;available:boolean}[]}>('products')]).then(([record,catalog])=>{
      if(!active)return;
      if(record.fortune.product.cdFeatureKey!==params.featureKey)throw new Error(copy.errProductMismatch);
      if(record.fortune.paid){window.location.assign(params.returnTo);return;}
      setReading(record.fortune);
      setAvailable(catalog.products.some(p=>p.cdFeatureKey===params.featureKey&&p.available));
    }).catch(e=>{if(active)setGate({phase:'error',message:e.message});}).finally(()=>{if(active)setChecked(true);});
    return ()=>{active=false;};
  },[isSoulCatMode,signedIn,params,copy]);

  const startPayment = useCallback(async (paymentMode:'DIRECT_KRW'|'MEMBERSHIP_PASS'|'MOONLIGHT_STONE'='DIRECT_KRW') => {
    if (!pricing || !available || paymentLock.current || packLock.current) return;
    const moonstoneQuantity=paymentMode==='DIRECT_KRW'?Number(moonstoneInput):0;
    if (!Number.isSafeInteger(moonstoneQuantity) || moonstoneQuantity<0
      || (moonstoneQuantity>0 && (isSoulCatMode || pricing.monthlyCreditMultiplier!==1
        || pricing.amountKRW-moonstoneQuantity*(pricing.amountKRW/pricing.membershipCreditCost)<1000))) {
      setGate({phase:'error',message:'사용할 월정석 수량을 확인해 주세요. 단건 결제 잔액은 1,000원 이상이어야 해요.'});return;
    }
    paymentLock.current=true;
    setGate({ phase: "paying" });
    try {
      if (!isSoulCatMode) {
        // Read only: activate can consume Family before a payment method is chosen.
        const {fortune}=await fortuneApi<{fortune:FortuneRecord}>(`requests/${params.requestId}`);
        if(fortune.paid){window.location.assign(params.returnTo);return;}
      }
      const requestId = isSoulCatMode
        ? `yn-soulcat-${params.featureKey}-${stableSlug(params.returnTo)}`
        : `yn-${params.requestId}`;
      const result = await runPaidAccessGate({
        featureKey: pricing.featureKey,
        reason: productName,
        requestId,
        cost: pricing.cost,
        amountKRW: pricing.amountKRW,
        paymentMode,
        allowedPaymentModes: pricing.monthlyExcluded ? ["pass", "direct"] : ["pass", "direct", "monthly"],
        membershipCreditCost: pricing.membershipCreditCost,
        moonstoneQuantity,
        passStorePlan: "family",
        disablePassFirst: paymentMode!=='MEMBERSHIP_PASS',
        resume: buildResume({ returnTo: params.returnTo }),
      });
      const code = String(result.error?.code || "").toUpperCase();
      if (result.ok || code==='FORTUNE_ALREADY_PAID') {
        setGate({ phase: "paid" });window.location.assign(params.returnTo);return;
      }
      if (code === "AUTH_REQUIRED" || code === "UNAUTHORIZED" || result.status === 401) {redirectToLogin();return;}
      if (code === "PAYMENT_CANCELLED" || code === "PG_PAYMENT_CANCELLED") {setGate({ phase: "cancelled" });return;}
      if (["PG_PAYMENT_NOT_PAID","PG_UNAVAILABLE","GRANT_PENDING","PENDING_CONFIRMATION"].includes(code)) {
        setGate({phase:"confirming",message:String(result.error?.message || result.message || copy.errPaymentUnknown)});return;
      }
      setGate({phase:"error",message:String(result.error?.message || result.message || copy.errPaymentFailed)});
    } catch(error) {
      if(error instanceof FortuneApiError && error.status===401){redirectToLogin();return;}
      setGate({phase:'error',message:error instanceof Error?error.message:copy.errPaymentUnknown});
    } finally { paymentLock.current=false; }
  }, [pricing, available, buildResume, params, copy, isSoulCatMode, productName, moonstoneInput]);

  // CD 내부 모드의 returnTo 는 결제 "성공" 뒤 이동 주소(미결제면 "0 / N개 챕터 저장됨" 결과 화면)라 결제를 그만두고 나가는 링크에 쓰지 않는다.
  // SoulCat 모드의 returnTo 는 진짜 직전 화면이라 그대로 쓴다.
  const leaveHref = isSoulCatMode ? params.returnTo : DEFAULT_RETURN_TO;
  const chooseHref = isSoulCatMode ? params.returnTo : FISH_CHOOSER_PATH;
  const leaveToPreviousScreen = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isSoulCatMode || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !canGoBackToPreviousScreen(params.paymentReturn)) return;
    event.preventDefault();
    window.history.back();
  };

  const showTierDepth = Boolean(reading?.manifest?.some(isConciseReading) && product && readingTierDepth(product.fishId,lang));
  return (
    <main className={styles.page} data-yn-night>
      <nav className={styles.nav} aria-label={copy.navAria}>
        <a href={leaveHref} onClick={leaveToPreviousScreen}>{copy.backToRoom}</a><a href="/">CODE DESTINY</a>
      </nav>
      <section className={`${styles.checkout} ${!isSoulCatMode?styles.simpleCheckout:''}`} aria-labelledby="checkout-title">
        {isSoulCatMode&&<div className={styles.host}>
          <img src="/assets/yeongnyangi/payment-alliance/yeoni-alliance-v1.webp" alt={alliance.imageAlt} width={1200} height={800} />
          <div><h2>{alliance.title}</h2><p>{alliance.story}</p></div>
        </div>}
        <div className={styles.paper}>
          <h1 id="checkout-title">{!isSoulCatMode&&lang==='ko'?'상담 범위와 결제 확인':copy.title}</h1>
          <p className={styles.intro}>{!isSoulCatMode&&lang==='ko'?'먼저 이번 상담 한 번으로 시작해도 좋아요.':copy.intro}</p>
          {!pricing || !product ? (
            <div className={styles.notice}>
              <h2>{copy.noticeTitle}</h2>
              <p>{copy.noticeBody}</p>
              <a href={DEFAULT_RETURN_TO}>{copy.noticeLink}</a>
            </div>
          ) : (
            <>
              <div className={styles.product}>
                <img src={lang==='ko'?`/assets/yeongnyangi/fish/${product.fishId}.webp`:product.reactionAsset} alt="" width={240} height={108} />
                <div><h2>{lang==='ko'?scopeName||`${product.name} · ${product.fishName}`:`${localizedSystem(product.readingKind==='single'?product.domain:'fusion',lang)} · ${localizedTier(product.fishId,lang)}`}</h2><p data-reading-tier-depth={showTierDepth?product.fishId:undefined}>{showTierDepth?readingTierDepth(product.fishId,lang):lang==='ko'?depthDescriptions[product.fishId]:consultationLocaleCopy(lang).method}</p></div>
              </div>
              {!isSoulCatMode&&scopeName&&<p className={styles.depthNote}>{lang==='ko'?`${product.name} · ${FOLLOWUP_LIMITS[product.fishId as FishId]>0?`기본 상담과 추가 질문 ${FOLLOWUP_LIMITS[product.fishId as FishId]}회 포함`:'이번 질문에 대한 답과 근거, 실천할 행동을 정리해요.'}`:copy.chapters(reading?.manifest?.length??product.chapterCount)}</p>}
              {showTierDepth&&<p className={styles.depthNote} data-reading-depth-note>{readingDepthCopy(lang).sharedTopics}</p>}
              {isSoulCatMode&&<dl className={styles.receipt}>
                <div><dt>{copy.rowComposition}</dt><dd>{copy.chapters(reading?.manifest?.length ?? product.chapterCount)}</dd></div>
                <div><dt>{copy.rowMethod}</dt><dd>{copy.methodDirect}</dd></div>
                <div className={styles.total}><dt>{copy.rowAmount}</dt><dd>{nativePrice === null ? formatKrw(pricing.amountKRW) : nativePrice || 'Google Play'}</dd></div>

              </dl>}
              <p data-reading-output-locale={reading?.locale||lang}>{askPhase5Copy(lang).input.language}: <b lang={reading?.locale||lang}>{readingLanguageNames[reading?.locale||lang]}</b></p>
              {!isSoulCatMode&&<fieldset className={styles.purchaseChoices} disabled={gate.phase==='paying'||gate.phase==='paid'||packBusy}>
                <legend>{lang==='ko'?'이용 방법':'Purchase option'}</legend>
                <label><input type="radio" name="consultation-purchase" checked={purchase==='single'} onChange={()=>setPurchase('single')}/><span><strong>{lang==='ko'?'이번 상담 1회':'This consultation'}</strong><span>{nativePrice===null?formatKrw(pricing.amountKRW):nativePrice||'Google Play'}</span></span></label>
                {packOffer.loading?<p role="status">{lang==='ko'?'5회 이용권 확인 중':'Checking passes…'}</p>:packOffer.error?<p role="alert">{lang==='ko'?'이용권을 확인하지 못했어요. 단건 상담은 계속 이용할 수 있어요.':'Pass details are unavailable. You can continue with a single consultation.'}</p>:packOffer.plan&&shopContext&&nativePrice===null&&<label><input type="radio" name="consultation-purchase" checked={purchase==='pack'} onChange={()=>setPurchase('pack')}/><span><strong>{lang==='ko'?'같은 범위 5회 이용권':'5 consultations in the same scope'}</strong><span>{formatKrw(packOffer.plan.priceKRW)} · {packOffer.plan.validityDays}{lang==='ko'?'일':' days'}</span><small>{lang==='ko'?'같은 등급의 지원 상담에만 적용돼요.':'Only supported consultations in this tier.'}</small></span></label>}
              </fieldset>}
              <button type="button" onClick={() => { if(purchase==='pack'&&shopContext&&nativePrice===null)window.location.assign(consultationShopPath(shopContext));else void startPayment(); }}
                disabled={!authSettled || !signedIn || !checked || !available || packBusy || gate.phase === "paying" || gate.phase === "paid"}
                className={styles.pay}>
                {!authSettled ? copy.payAuthChecking : !checked ? copy.payOrderChecking : !available ? copy.payUnavailable : gate.phase === "paying" ? copy.payOpening
                  : gate.phase === "paid" ? copy.payReturning : gate.phase === "confirming" ? copy.payOrderChecking : purchase==='pack'?(lang==='ko'?'5회 이용권 구매하기':'Get 5-use pass'): copy.payAction(nativePrice === null ? formatKrw(validDiscount ? discountedAmount : pricing.amountKRW) : nativePrice || 'Google Play')}
              </button>
              <details className={styles.benefits}>
                <summary>{lang==='ko'?'보유 혜택 사용':'Use existing benefits'}</summary>
                <p>{lang==='ko'?'직접 선택한 혜택만 사용해요. 적용 가능 여부는 서버에서 확인해요.':'Benefits are used only when you select them. Eligibility is verified by the server.'}</p>
              {!isSoulCatMode && checked && signedIn && available && <ServicePackCheckout requestId={params.requestId} featureKey={pricing.featureKey} locale={lang}
                disabled={gate.phase === "paying" || gate.phase === "paid"}
                onBusyChange={busy=>{packLock.current=busy;setPackBusy(busy);}}
                onPaid={()=>{setGate({phase:"paid"});window.location.assign(params.returnTo);}} />}

                <button type="button" disabled={!available||packBusy||gate.phase==='paying'||gate.phase==='paid'} onClick={()=>void startPayment('MEMBERSHIP_PASS')}>{lang==='ko'?'보유 Family 적용하기':'Use existing Family pass'}</button>
                {!pricing.monthlyExcluded&&<button type="button" disabled={!available||packBusy||gate.phase==='paying'||gate.phase==='paid'} onClick={()=>void startPayment('MOONLIGHT_STONE')}>{lang==='ko'?`보유 월정석 ${pricing.membershipCreditCost.toLocaleString('ko-KR')}개 사용`:alliance.moonstones(pricing.membershipCreditCost.toLocaleString(intlLocale))}</button>}
              {!isSoulCatMode && nativePrice===null && lang==='ko' && !pricing.monthlyExcluded && pricing.monthlyCreditMultiplier===1 && <fieldset className={styles.discount} disabled={gate.phase==='paying'||gate.phase==='paid'||packBusy}>
                <legend>월정석으로 단건 결제 할인받기</legend>
                <label htmlFor="moonstone-discount">사용할 월정석 수량</label>
                <input id="moonstone-discount" type="number" inputMode="numeric" min={0} step={1}
                  max={Math.floor((pricing.amountKRW-1000)/(pricing.amountKRW/pricing.membershipCreditCost))}
                  value={moonstoneInput} onChange={event=>setMoonstoneInput(event.target.value)} aria-describedby="moonstone-discount-note" />
                <p id="moonstone-discount-note">1개당 {formatKrw(pricing.amountKRW/pricing.membershipCreditCost)} 할인돼요. 단건 결제를 선택할 때만 적용돼요. 전액 월정석 사용은 위 버튼에서 선택할 수 있어요.</p>
                {validDiscount && <p aria-live="polite">선택한 월정석 {Number(moonstoneInput).toLocaleString('ko-KR')}개 · 할인 후 단건 결제 <strong>{formatKrw(pricing.amountKRW-Number(moonstoneInput)*(pricing.amountKRW/pricing.membershipCreditCost))}</strong></p>}
                <p>단건 결제 잔액은 1,000원 이상이어야 해요. 선택한 수량의 사용 가능 여부는 결제 전에 확인해요.</p>
              </fieldset>}

              </details>
              <p className={styles.security}>{copy.methodNote}</p>
              <div aria-live="polite" className={styles.feedback}>
                {gate.phase === "cancelled" ? <p>{copy.cancelled}</p> : null}
                {gate.phase === "error" ? <p role="alert">{gate.message}</p> : null}
                {gate.phase === "confirming" ? <p role="status">{gate.message}</p> : null}
              </div>
              <a href={chooseHref} className={styles.back} onClick={()=>{
                if(isSoulCatMode||!reading?.consultation?.questionDecision)return;
                try{sessionStorage.setItem('yeongnyangi:consultation-login-draft',JSON.stringify({path:FISH_CHOOSER_PATH,savedAt:Date.now(),productId:reading.productId,profileId:reading.profileId,question:reading.consultation.question,questionDecision:reading.consultation.questionDecision,editScope:true,locale:reading.locale}));}catch{/* The question form remains usable without local storage. */}
              }}>{!isSoulCatMode&&lang==='ko'?'질문 조건 수정하기':copy.reselect}</a>
              <p className={styles.security}>
                <a href={policyHrefs.terms}>{copy.legalTerms}</a> · <a href={policyHrefs.refund}>{copy.legalRefund}</a> · <a href={policyHrefs.support}>{copy.legalSupport}</a>
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
