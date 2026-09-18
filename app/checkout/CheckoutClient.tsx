"use client";

/**
 * 영냥이(SoulCat) 단건 결제 호스트.
 *
 * 흐름: 상담 요청이 402 `PAYMENT_REQUIRED` 로 `/checkout/?featureKey=yeongnyangi-…&returnTo=/yeongnyangi/…` 를
 * 가리킨다 → 여기서 CD 결제창을 **단건(카드·카카오페이) 전용**으로 연다 → 결제가 끝나면 returnTo 로 돌아간다.
 * 결과 화면은 CODE DESTINY 서버에서 동일 요청의 PG 증명을 확인하고 저장된 상담을 이어간다.
 *
 * 🔴 단건 전용은 두 겹이다. ① 서버: `paymentScope:"direct_only"` 상품은 이용권·월정석 게이트가 402 로 거부
 *    (worker/payments/index.js). ② 이 호출부: `allowedPaymentModes:["direct"]` + 이용권 선검사 3종 off 로
 *    결제창에 이용권·월정석 카드를 그리지 않는다. 렌더러는 서버 hiddenMethods 를 읽지 않으므로 ②를 빼면 안 된다.
 * 🔴 featureKey 는 `yeongnyangi-` 접두만 받는다 — 이 페이지가 다른 상품의 우회 결제창이 되면 안 된다.
 * 🔴 가격은 레지스트리(resolveServerFeaturePricing)에서만 온다. URL 의 금액을 믿지 않는다.
 * 🔴 화면 문구는 `checkout-copy.ts` 의 동기 표에서 온다. 사전(useT)으로 옮기면 첫 렌더가 비고, 그건
 *    결제 임계 화면에서 번역 누락보다 나쁘다. 상품명·분석 깊이는 아직 카탈로그의 한국어 데이터다.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { refreshAuth, useAuthStore } from "@/app/_lib/auth-store";
import { loadPaidServiceRuntimeGate, runPaidAccessGate } from "@/app/_lib/billing-client";
import { sanitizeAuthReturnPath } from "@/app/_lib/auth-return";
import { usePaidResume } from "@/app/hooks/usePaidResume";
import { resolveServerFeaturePricing } from "@/lib/payment/server-feature-pricing";
import { products } from "@/worker/yeongnyangi/payments/catalog";
import { depthDescriptions } from "@/worker/yeongnyangi/fortune/reading-policy";
import { getCurrentLoadingLocale, INTL_LOCALE_BY_LOADING_LOCALE, type LoadingLocale } from "@/constants/loadingMessages";
import { getCheckoutCopy, resolveCheckoutPolicyHrefs } from "./checkout-copy";
import {fortuneApi,FortuneApiError,resultPath,type FortuneRecord} from '../yeongnyangi/_lib/api';
import styles from "./checkout.module.css";

const FEATURE_KEY_PATTERN = /^yeongnyangi-[a-z0-9-]+$/;
const RETURN_TO_PREFIX = "/yeongnyangi/";
const DEFAULT_RETURN_TO = "/yeongnyangi/";
const RESUME_KIND = "yeongnyangi-checkout";


type CheckoutParams = {
  requestId: string;
  featureKey: string;
  returnTo: string;
};

type GateState =
  | { phase: "idle" }
  | { phase: "paying" }
  | { phase: "paid" }
  | { phase: "cancelled" }
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
  if (typeof window === "undefined") return { requestId: "", featureKey: "", returnTo: DEFAULT_RETURN_TO };
  const params = new URLSearchParams(window.location.search);
  const requestId=/^[a-f0-9]{64}$/.test(params.get("requestId")||"") ? params.get("requestId")! : "";
  return {
    requestId,
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

export default function CheckoutClient() {
  const [params] = useState<CheckoutParams>(() => readParams());
  const auth = useAuthStore();
  const paymentLock=useRef(false);
  const [available,setAvailable]=useState(false);
  const [checked,setChecked]=useState(false);
  const [gate, setGate] = useState<GateState>({ phase: "idle" });
  const [lang, setLang] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  // 표는 모듈 상수라 같은 로케일이면 참조가 그대로다 — 아래 useEffect·useCallback 의존성에 넣어도 안전하다.
  const copy = getCheckoutCopy(lang);
  const intlLocale = INTL_LOCALE_BY_LOADING_LOCALE[lang] || INTL_LOCALE_BY_LOADING_LOCALE.ko;
  const policyHrefs = useMemo(() => resolveCheckoutPolicyHrefs(lang), [lang]);
  const formatKrw = useCallback(
    (amount: number) => copy.won(Math.max(0, Math.round(amount)), intlLocale),
    [copy, intlLocale],
  );

  useEffect(() => {
    const sync = () => setLang(getCurrentLoadingLocale());
    window.addEventListener("languagechange", sync);
    window.addEventListener("cd:locale-ready", sync);
    return () => { window.removeEventListener("languagechange", sync); window.removeEventListener("cd:locale-ready", sync); };
  }, []);

  const pricing = useMemo(() => {
    if (!params.featureKey) return null;
    return resolveServerFeaturePricing({ featureKey: params.featureKey });
  }, [params.featureKey]);

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
    if (!params.requestId || !["portone_redirect", "paymentId", "payment_id", "imp_uid"].some(key => query.has(key))) return;
    // A PG return cannot wait for the provider's idle prewarm. Loading the shared
    // runtime confirms the original order and invokes the registered resume handler.
    let active = true;
    void loadPaidServiceRuntimeGate().then(runtime => {
      if (!runtime && active) setGate({ phase: "error", message: copy.errResumePrepare });
    }).catch(() => {
      if (active) setGate({ phase: "error", message: copy.errResumePrepare });
    });
    return () => { active = false; };
  }, [params.requestId, copy]);

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
    if(!signedIn||!params.requestId){setChecked(true);return;}
    let active=true;
    Promise.all([fortuneApi<{fortune:FortuneRecord}>(`requests/${params.requestId}`),fortuneApi<{products:{cdFeatureKey:string;available:boolean}[]}>('products')]).then(([record,catalog])=>{
      if(!active)return;
      if(record.fortune.product.cdFeatureKey!==params.featureKey)throw new Error(copy.errProductMismatch);
      if(record.fortune.paid){window.location.assign(params.returnTo);return;}
      setAvailable(catalog.products.some(p=>p.cdFeatureKey===params.featureKey&&p.available));
    }).catch(e=>{if(active)setGate({phase:'error',message:e.message});}).finally(()=>{if(active)setChecked(true);});
    return ()=>{active=false;};
  },[signedIn,params,copy]);

  const startPayment = useCallback(async () => {
    if (!pricing || !available || !params.requestId || paymentLock.current) return;
    paymentLock.current=true;
    setGate({ phase: "paying" });
    try {
      // Recover a webhook-confirmed payment before offering another payment window.
      try {
        const {fortune}=await fortuneApi<{fortune:FortuneRecord}>(`requests/${params.requestId}/activate`,{});
        if(fortune.paid){window.location.assign(params.returnTo);return;}
      } catch(error) {
        if(!(error instanceof FortuneApiError && error.status===402))throw error;
      }
      const requestId = `yn-${params.requestId}`;
      const result = await runPaidAccessGate({
        featureKey: pricing.featureKey,
        reason: "yeongnyangi-checkout",
        requestId,
        cost: pricing.cost,
        amountKRW: pricing.amountKRW,
        allowedPaymentModes: ["direct"],
        disablePassFirst: true,
        disablePassChoice: true,
        skipPassProbe: true,
        resume: buildResume({ returnTo: params.returnTo }),
      });
      const code = String(result.error?.code || "").toUpperCase();
      if (result.ok || code==='FORTUNE_ALREADY_PAID') {
        setGate({ phase: "paid" });window.location.assign(params.returnTo);return;
      }
      if (code === "AUTH_REQUIRED" || code === "UNAUTHORIZED" || result.status === 401) {redirectToLogin();return;}
      if (code === "PAYMENT_CANCELLED") {setGate({ phase: "cancelled" });return;}
      setGate({phase:"error",message:String(result.error?.message || result.message || copy.errPaymentFailed)});
    } catch(error) {
      if(error instanceof FortuneApiError && error.status===401){redirectToLogin();return;}
      setGate({phase:'error',message:error instanceof Error?error.message:copy.errPaymentUnknown});
    } finally { paymentLock.current=false; }
  }, [pricing, available, buildResume, params, copy]);

  const product = products.find(item => item.cdFeatureKey === params.featureKey);
  return (
    <main className={styles.page}>
      <nav className={styles.nav} aria-label={copy.navAria}>
        <a href={params.returnTo}>{copy.backToRoom}</a><a href="/">CODE DESTINY</a>
      </nav>
      <section className={styles.checkout} aria-labelledby="checkout-title">
        <div className={styles.host}>
          <img src="/assets/yeongnyangi/hero.webp" alt={copy.heroAlt} width={480} height={480} />
          <p>{copy.hostLine1}<br />{copy.hostLine2}</p>
        </div>
        <div className={styles.paper}>
          <h1 id="checkout-title">{copy.title}</h1>
          <p className={styles.intro}>{copy.intro}</p>
          {!pricing || !product || !params.requestId ? (
            <div className={styles.notice}>
              <h2>{copy.noticeTitle}</h2>
              <p>{copy.noticeBody}</p>
              <a href={DEFAULT_RETURN_TO}>{copy.noticeLink}</a>
            </div>
          ) : (
            <>
              <div className={styles.product}>
                <img src={`/assets/yeongnyangi/fish/${product.fishId}.webp`} alt="" width={240} height={108} />
                <div><h2>{product.name} · {product.fishName}</h2><p>{depthDescriptions[product.fishId]}</p></div>
              </div>
              <dl className={styles.receipt}>
                <div><dt>{copy.rowComposition}</dt><dd>{copy.chapters(product.chapterCount)}</dd></div>
                <div><dt>{copy.rowMethod}</dt><dd>{copy.methodDirect}</dd></div>
                <div className={styles.total}><dt>{copy.rowAmount}</dt><dd>{formatKrw(pricing.amountKRW)}</dd></div>
              </dl>
              <p className={styles.policy}>{copy.policyLine1}<br />{copy.policyLine2}</p>
              <button type="button" onClick={() => { void startPayment(); }}
                disabled={!authSettled || !signedIn || !checked || !available || gate.phase === "paying" || gate.phase === "paid"}
                className={styles.pay}>
                {!authSettled ? copy.payAuthChecking : !checked ? copy.payOrderChecking : !available ? copy.payUnavailable : gate.phase === "paying" ? copy.payOpening
                  : gate.phase === "paid" ? copy.payReturning : copy.payAction(formatKrw(pricing.amountKRW))}
              </button>
              <p className={styles.security}>{copy.methodNote}</p>
              <div aria-live="polite" className={styles.feedback}>
                {gate.phase === "cancelled" ? <p>{copy.cancelled}</p> : null}
                {gate.phase === "error" ? <p role="alert">{gate.message}</p> : null}
              </div>
              <a href={params.returnTo} className={styles.back}>{copy.reselect}</a>
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
