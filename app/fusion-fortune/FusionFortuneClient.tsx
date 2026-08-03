"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { authFetch } from "../_lib/auth-client";
import { getApiBaseUrl } from "../_lib/api-config";
import styles from "./fusion-fortune.module.css";

type Status = {
  isLoggedIn: boolean;
  ticket: { remaining: number; canUse: boolean };
  dailyLimit: { remainingCount: number; isSoldOut: boolean; nextResetAt?: string };
  canGenerate: boolean;
  nextAction: "login" | "buy_ticket" | "generate" | "sold_out" | "disabled";
  message: string;
  cta?: { targetPath: string };
};

type Section = { title: string; content: string; keyPoints: string[] };
type Result = Record<"sajuSection" | "ziweiSection" | "vedicSection" | "sukuyoSection" | "astrologySection" | "tarotSection" | "integratedReading", Section> & {
  title: string;
  openingMessage: string;
  executiveSummary: string;
  timingAndAction: { title: string; content: string; luckyActions: string[]; cautionPatterns: string[] };
  closingMessage: string;
  shareText?: string;
};

type TicketProduct = { productId: string; productType: string; name: string; priceKRW: number; ticketAmount: number; description: string; allowedPurchaseChannels: string[] };
type TicketOrder = { merchantUid: string; product: TicketProduct; customer?: { customerId?: string; fullName?: string; email?: string; phoneNumber?: string }; redirectUrl?: string };
type PortOneConfig = { storeId: string; channelKey: string; currency?: string; payMethod?: string; noticeUrl?: string };
type PortOneResponse = { paymentId?: string; code?: string; message?: string };
type BirthPlaceOption = { label: string; tz: string; lon: number; lat: number; country?: string };
type BirthPlaceGroup = { label?: string; places?: BirthPlaceOption[] };

declare global {
  interface Window { BIRTH_PLACE_GROUPS?: BirthPlaceGroup[] }
}

const EMPTY_STATUS: Status = {
  isLoggedIn: false,
  ticket: { remaining: 0, canUse: false },
  dailyLimit: { remainingCount: 100, isSoldOut: false },
  canGenerate: false,
  nextAction: "disabled",
  message: "이용 상태를 확인하고 있어요.",
};

const SECTION_KEYS = ["sajuSection", "ziweiSection", "vedicSection", "sukuyoSection", "astrologySection", "tarotSection", "integratedReading"] as const;
const SECTION_ICONS = ["木", "紫", "ॐ", "宿", "✦", "◇", "∞"];
const FUSION_PENDING_PAYMENT_KEY = "fusion_fortune_pending_payment";
const DEFAULT_BIRTH_PLACES: BirthPlaceOption[] = [{ label: "대한민국 · 서울", tz: "Asia/Seoul", lon: 126.978, lat: 37.5665, country: "KR" }];

function FusionOrb() {
  return (
    <svg className={styles.orb} viewBox="0 0 240 240" role="img" aria-label="여섯 운세 체계가 연결된 초융합 오브">
      <defs><radialGradient id="fusionCore"><stop stopColor="#fff8d8" /><stop offset=".4" stopColor="#dec8ff" /><stop offset="1" stopColor="#352756" /></radialGradient></defs>
      <circle cx="120" cy="120" r="103" className={styles.orbit} />
      {[0, 60, 120, 180, 240, 300].map((degree) => {
        const radians = degree * Math.PI / 180;
        return <g key={degree}><line x1="120" y1="120" x2={120 + Math.cos(radians) * 84} y2={120 + Math.sin(radians) * 84} className={styles.ray} /><circle cx={120 + Math.cos(radians) * 90} cy={120 + Math.sin(radians) * 90} r="10" className={styles.node} /></g>;
      })}
      <circle cx="120" cy="120" r="53" fill="url(#fusionCore)" className={styles.core} />
      <path d="M95 120h50M120 95v50" className={styles.coreMark} />
    </svg>
  );
}

function ensurePortOneSdk() {
  return new Promise<void>((resolve, reject) => {
    const portOneWindow = window as Window & { PortOne?: { requestPayment: (request: Record<string, unknown>) => Promise<PortOneResponse> } };
    if (portOneWindow.PortOne?.requestPayment) return resolve();
    const existing = document.getElementById("portone-v2-sdk") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => portOneWindow.PortOne?.requestPayment ? resolve() : reject(new Error("결제 모듈을 준비하지 못했어요.")), { once: true });
      existing.addEventListener("error", () => reject(new Error("결제 모듈을 불러오지 못했어요.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.id = "portone-v2-sdk";
    script.src = "https://cdn.portone.io/v2/browser-sdk.js";
    script.async = true;
    script.onload = () => portOneWindow.PortOne?.requestPayment ? resolve() : reject(new Error("결제 모듈을 준비하지 못했어요."));
    script.onerror = () => reject(new Error("결제 모듈을 불러오지 못했어요."));
    document.body.appendChild(script);
  });
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("서버 응답을 확인하지 못했어요.");
  return response.json() as Promise<T>;
}

export function FusionFortuneClient() {
  const apiBase = getApiBaseUrl();
  const [status, setStatus] = useState<Status>(EMPTY_STATUS);
  const [loading, setLoading] = useState(false);
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [ticketProduct, setTicketProduct] = useState<TicketProduct | null>(null);
  const [paymentPhone, setPaymentPhone] = useState("");
  const [birthPlaces, setBirthPlaces] = useState<BirthPlaceOption[]>(DEFAULT_BIRTH_PLACES);
  const redirectHandled = useRef(false);
  const [form, setForm] = useState({ birthDate: "", birthTime: "", birthTimeUnknown: false, birthPlaceKey: "", calendarType: "solar", gender: "unspecified", nickname: "", topic: "삶의 전반적인 흐름", concern: "" });

  const refresh = useCallback(async () => {
    try {
      const response = await authFetch(`${apiBase}/api/fusion-fortune/status`, { credentials: "include" }, { retryOn401: true, apiBase });
      const payload = await parseJson<Status & { ok?: boolean }>(response);
      if (response.ok && payload.ok) setStatus(payload);
    } catch {
      setError("이용 상태를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  }, [apiBase]);

  const loadCatalog = useCallback(async () => {
    try {
      const response = await authFetch(`${apiBase}/api/payments/fusion-fortune/catalog`, { credentials: "include" }, { retryOn401: true, apiBase });
      const payload = await parseJson<{ enabled?: boolean; products?: TicketProduct[] }>(response);
      if (response.ok && payload.enabled !== false) setTicketProduct(payload.products?.find((item) => item.productId === "fusion_fortune_ticket_1") || null);
    } catch {
      setTicketProduct(null);
    }
  }, [apiBase]);

  const confirmPayment = useCallback(async (merchantUid: string, providerPaymentId = merchantUid) => {
    const response = await authFetch(`${apiBase}/api/payments/fusion-fortune/confirm`, {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ merchantUid, paymentId: providerPaymentId }),
    }, { retryOn401: true, apiBase });
    const payload = await parseJson<{ ok?: boolean; message?: string }>(response);
    if (!response.ok || payload.ok === false) throw new Error(payload.message || "결제 확인에 실패했어요.");
    sessionStorage.removeItem(FUSION_PENDING_PAYMENT_KEY);
    setNotice("초융합 운세 상담권 1회가 충전되었어요.");
    await refresh();
  }, [apiBase, refresh]);

  useEffect(() => { void Promise.all([refresh(), loadCatalog()]); }, [loadCatalog, refresh]);

  useEffect(() => {
    const applyPlaces = () => {
      const places = (window.BIRTH_PLACE_GROUPS || []).flatMap((group) => Array.isArray(group.places) ? group.places : [])
        .filter((place) => place?.label && place?.tz && Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lon)))
        .map((place) => ({ ...place, country: place.country || String(place.label).split("·")[0].trim() }));
      if (places.length) setBirthPlaces(places);
    };
    if (window.BIRTH_PLACE_GROUPS?.length) { applyPlaces(); return; }
    const existing = document.querySelector<HTMLScriptElement>('script[data-fusion-birth-places="true"]');
    if (existing) { existing.addEventListener("load", applyPlaces, { once: true }); return; }
    const script = document.createElement("script");
    script.src = "/js/birth-place-groups.js";
    script.defer = true;
    script.dataset.fusionBirthPlaces = "true";
    script.addEventListener("load", applyPlaces, { once: true });
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (redirectHandled.current || typeof window === "undefined") return;
    const query = new URLSearchParams(window.location.search);
    if (query.get("fusion_fortune_payment") !== "1") return;
    const merchantUid = String(query.get("merchantUid") || "").trim();
    const pending = sessionStorage.getItem(FUSION_PENDING_PAYMENT_KEY);
    if (!merchantUid || pending !== merchantUid) return;
    redirectHandled.current = true;
    setPurchaseBusy(true);
    void confirmPayment(merchantUid).catch((cause) => setError(cause instanceof Error ? cause.message : "결제 확인에 실패했어요.")).finally(() => {
      setPurchaseBusy(false);
      window.history.replaceState({}, "", "/fusion-fortune#ticket");
    });
  }, [confirmPayment]);

  const resetTime = useMemo(() => status.dailyLimit.nextResetAt
    ? new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit" }).format(new Date(status.dailyLimit.nextResetAt))
    : "자정", [status.dailyLimit.nextResetAt]);
  const usedPercent = Math.min(100, Math.max(0, 100 - status.dailyLimit.remainingCount));

  const startPurchase = async () => {
    setError(""); setNotice("");
    if (!status.isLoggedIn) { window.location.assign("/auth/login"); return; }
    if (!ticketProduct) { setError("초융합 운세 상담권 판매 상태를 확인하지 못했어요."); return; }
    const phoneNumber = paymentPhone.replace(/\D/g, "");
    if (phoneNumber.length < 10 || phoneNumber.length > 11) { setError("결제에 사용할 휴대전화 번호를 확인해 주세요."); return; }
    setPurchaseBusy(true);
    try {
      const idempotencyKey = window.crypto.randomUUID();
      const prepareResponse = await authFetch(`${apiBase}/api/payments/fusion-fortune/prepare`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: ticketProduct.productId, productType: ticketProduct.productType, paymentMethod: "pg", idempotencyKey }),
      }, { retryOn401: true, apiBase });
      const prepared = await parseJson<{ order?: TicketOrder; message?: string }>(prepareResponse);
      if (!prepareResponse.ok || !prepared.order) throw new Error(prepared.message || "결제 준비에 실패했어요.");
      const configResponse = await authFetch(`${apiBase}/api/payments/config`, { credentials: "include" }, { retryOn401: false, apiBase });
      const config = await parseJson<PortOneConfig & { message?: string }>(configResponse);
      if (!configResponse.ok || !config.storeId || !config.channelKey) throw new Error(config.message || "결제 설정을 확인하지 못했어요.");
      await ensurePortOneSdk();
      const order = prepared.order;
      sessionStorage.setItem(FUSION_PENDING_PAYMENT_KEY, order.merchantUid);
      const portOneWindow = window as Window & { PortOne?: { requestPayment: (request: Record<string, unknown>) => Promise<PortOneResponse> } };
      if (!portOneWindow.PortOne?.requestPayment) throw new Error("결제 모듈을 준비하지 못했어요.");
      const payment = await portOneWindow.PortOne.requestPayment({
        storeId: config.storeId, channelKey: config.channelKey, paymentId: order.merchantUid, orderName: order.product.name,
        totalAmount: order.product.priceKRW, currency: config.currency || "CURRENCY_KRW", payMethod: config.payMethod || "CARD",
        redirectUrl: `${window.location.origin}/fusion-fortune?fusion_fortune_payment=1&merchantUid=${encodeURIComponent(order.merchantUid)}`,
        customer: { ...order.customer, phoneNumber },
        customData: { productId: order.product.productId, productType: order.product.productType },
        ...(config.noticeUrl ? { noticeUrls: [config.noticeUrl] } : {}),
      });
      if (!payment || payment.code || !payment.paymentId) { sessionStorage.removeItem(FUSION_PENDING_PAYMENT_KEY); throw new Error(payment?.message || "결제가 취소되었어요."); }
      await confirmPayment(order.merchantUid, payment.paymentId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "결제를 진행하지 못했어요.");
    } finally { setPurchaseBusy(false); }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setNotice("");
    if (status.nextAction === "login") { window.location.assign(status.cta?.targetPath || "/auth/login"); return; }
    if (status.nextAction === "buy_ticket") { document.getElementById("ticket")?.scrollIntoView({ behavior: "smooth" }); return; }
    if (!form.birthDate || (!form.birthTime && !form.birthTimeUnknown)) { setError("생년월일과 생시를 입력하거나, 생시를 모르는 경우를 선택해 주세요."); return; }
    setLoading(true);
    try {
      const selectedPlace = birthPlaces.find((place) => place.label === form.birthPlaceKey);
      const requestBody = {
        birthDate: form.birthDate,
        birthTime: form.birthTimeUnknown ? "" : form.birthTime,
        birthTimeUnknown: form.birthTimeUnknown,
        calendarType: form.calendarType,
        gender: form.gender,
        nickname: form.nickname,
        topic: form.topic,
        concern: form.concern,
        ...(selectedPlace ? { birthPlace: { city: selectedPlace.label, country: selectedPlace.country, latitude: selectedPlace.lat, longitude: selectedPlace.lon, timezone: selectedPlace.tz } } : {}),
      };
      const response = await authFetch(`${apiBase}/api/fusion-fortune/generate`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify(requestBody),
      }, { retryOn401: true, apiBase });
      const payload = await parseJson<{ ok?: boolean; message?: string; result?: Result; fusionStatus?: Status }>(response);
      if (!response.ok || !payload.ok || !payload.result || !payload.fusionStatus) throw new Error(payload.message || "결과를 생성하지 못했어요.");
      setResult(payload.result); setStatus(payload.fusionStatus); setNotice("결과가 완성되어 오늘의 선착순 자리가 확정됐어요.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "결과를 생성하지 못했어요."); }
    finally { setLoading(false); }
  };

  const share = async () => {
    if (!result) return;
    const data = { title: result.title, text: result.shareText || result.executiveSummary.slice(0, 220), url: `${location.origin}/fusion-fortune` };
    try {
      if (navigator.share) await navigator.share(data);
      else await navigator.clipboard.writeText(`${data.text}\n${data.url}`);
      setNotice("개인정보를 제외한 요약을 공유했어요.");
    } catch (cause) { if ((cause as Error)?.name !== "AbortError") setError("공유하지 못했어요. 잠시 후 다시 시도해 주세요."); }
  };

  const buttonLabel = loading ? "여섯 전문가의 흐름을 엮는 중…" : status.nextAction === "login" ? "로그인하고 이용권 확인하기" : status.nextAction === "buy_ticket" ? "이용권 구매 영역으로 이동" : "초융합 운세 생성하기";

  return <main className={styles.page}>
    <section className={styles.hero}>
      <Image className={styles.heroImage} src="/images/fusion-fortune/fusion-guardian-celestial-hero.webp" alt="" fill priority sizes="(max-width: 720px) 100vw, 1080px" />
      <div className={styles.heroVeil} />
      <div className={styles.heroCopy}>
        <Link className={styles.guardianLink} href="/#guardian-fortune">오늘의 귀인에서 이어지는 프리미엄 리딩</Link>
        <p className={styles.kicker}>초융합 운세</p><h1>여섯 개의 해석을<br />하나의 상담으로</h1>
        <p>사주·자미두수·베다점·숙요점·점성술·타로를 각 분야의 언어로 깊게 읽고, 지금의 선택과 현실 행동으로 하나로 엮습니다.</p>
        <div className={styles.heroMeta}><span className={styles.firstCome}>선착순! 하루 100명</span><span>1회 10,000원</span><span>10,000~15,000자</span></div>
      </div>
      <FusionOrb />
    </section>

    <section className={styles.value} aria-label="초융합 운세 가치">
      <div><strong>여섯 체계의 교차 검증</strong><p>같은 신호는 핵심 패턴으로, 다른 신호는 상황별 선택지로 읽습니다.</p></div>
      <div><strong>삶 전체를 잇는 해석</strong><p>성향·관계·일·돈·마음·시기와 다음 행동을 한 흐름으로 정리합니다.</p></div>
      <div><strong>전문가별 깊이</strong><p>체계를 섞지 않고 각 전통의 근거를 쉬운 한국어로 번역합니다.</p></div>
    </section>

    <section className={styles.panel}>
      <div className={styles.status}>
        <div><span>오늘 선착순 남은 자리</span><strong>{status.dailyLimit.remainingCount} / 100</strong><div className={styles.progress}><i style={{ width: `${usedPercent}%` }} /></div><small>성공 결과가 완성된 순서대로 자리가 확정돼요.</small></div>
        <div><span>초융합 운세 상담권</span><strong>{status.ticket.remaining}회</strong><small>일반 이용권·family 이용권·대화권과 별도예요.</small></div>
      </div>
      {status.dailyLimit.isSoldOut ? <div className={styles.sold}><p className={styles.kicker}>오늘 선착순 마감</p><h2>오늘의 100자리가 모두 채워졌어요.</h2><p>이용권은 차감되지 않았습니다. 다음 접수는 한국 시간 {resetTime} 이후에 열립니다.</p><div className={styles.soldLinks}><Link href="/#guardian-fortune">오늘의 귀인 보기</Link><Link href="/tarot">타로 둘러보기</Link></div></div> : <form className={styles.form} onSubmit={submit}>
        <div className={styles.formIntro}><p className={styles.kicker}>나의 흐름 입력</p><h2>정확한 생시로 여섯 체계를 연결해요</h2><p>입력 정보는 결과 본문과 공유 요약에 노출하지 않습니다.</p></div>
        <label>생년월일<input type="date" required value={form.birthDate} onChange={(event) => setForm({ ...form, birthDate: event.target.value })} /></label>
        <label>생시<input type="time" required={!form.birthTimeUnknown} disabled={form.birthTimeUnknown} value={form.birthTime} onChange={(event) => setForm({ ...form, birthTime: event.target.value })} /><span className={styles.inlineCheck}><input type="checkbox" checked={form.birthTimeUnknown} onChange={(event) => setForm({ ...form, birthTimeUnknown: event.target.checked, birthTime: event.target.checked ? "" : form.birthTime })} /> 생시를 몰라요</span><small>모르면 시간 기반 명반·라그나·상승궁·하우스를 단정하지 않아요.</small></label>
        <label>출생지<select value={form.birthPlaceKey} onChange={(event) => setForm({ ...form, birthPlaceKey: event.target.value })}><option value="">출생지를 몰라요</option>{birthPlaces.map((place) => <option key={`${place.label}-${place.lat}-${place.lon}`} value={place.label}>{place.label}</option>)}</select><small>베다점·서양 점성술의 위치 계산에 사용해요.</small></label>
        <fieldset><legend>달력 기준</legend><label><input type="radio" checked={form.calendarType === "solar"} onChange={() => setForm({ ...form, calendarType: "solar" })} /> 양력</label><label><input type="radio" checked={form.calendarType === "lunar"} onChange={() => setForm({ ...form, calendarType: "lunar" })} /> 음력</label></fieldset>
        <label>성별 <em>(선택)</em><select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}><option value="unspecified">선택하지 않음</option><option value="female">여성</option><option value="male">남성</option></select></label>
        <label>닉네임 <em>(선택)</em><input maxLength={40} value={form.nickname} onChange={(event) => setForm({ ...form, nickname: event.target.value })} placeholder="결과에서 불릴 이름" /></label>
        <label>관심 주제<select value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value })}><option>삶의 전반적인 흐름</option><option>연애와 관계</option><option>일과 돈</option><option>마음과 회복</option></select></label>
        <label className={styles.wide}>고민 <em>(선택)</em><textarea maxLength={1000} value={form.concern} onChange={(event) => setForm({ ...form, concern: event.target.value })} placeholder="개인 식별 정보는 적지 말아 주세요." /></label>
        <p className={styles.notice}>{status.message}</p>{notice && <p className={styles.success} role="status">{notice}</p>}{error && <p className={styles.error} role="alert">{error}</p>}
        <button disabled={loading || status.nextAction === "disabled"} type="submit">{buttonLabel}</button>
      </form>}
    </section>

    {!status.dailyLimit.isSoldOut && status.ticket.remaining < 1 && <section className={styles.ticket} id="ticket" aria-labelledby="fusion-ticket-heading">
      <div><p className={styles.kicker}>별도 프리미엄 상담권</p><h2 id="fusion-ticket-heading">초융합 운세 상담권</h2><p>{ticketProduct?.description || "여섯 운세 체계를 한 번에 엮어 1만자 이상의 깊은 전체 운세를 볼 수 있어요."}</p><ul><li>상담권 1회로 결과 1회 생성</li><li>PG 단건 결제로만 구매</li><li>생성 실패 또는 선착순 마감 시 미차감</li></ul></div>
      <div className={styles.ticketAction}><strong>{(ticketProduct?.priceKRW || 10000).toLocaleString("ko-KR")}원</strong><label>결제용 휴대전화 번호<input inputMode="numeric" autoComplete="tel" value={paymentPhone} onChange={(event) => setPaymentPhone(event.target.value)} placeholder="01012345678" maxLength={13} /></label><button type="button" disabled={purchaseBusy || !ticketProduct} onClick={() => void startPurchase()}>{purchaseBusy ? "결제 준비 중…" : "단건 결제로 구매하기"}</button><small>실제 결제 전 PG 결제창에서 금액을 다시 확인할 수 있어요.</small></div>
    </section>}

    {result && <section className={styles.result}><header><p className={styles.kicker}>나의 초융합 리딩</p><h2>{result.title}</h2><p>{result.openingMessage}</p></header><article className={styles.summary}>{result.executiveSummary}</article>{SECTION_KEYS.map((key, index) => <details key={key} open={index === 0}><summary><span>{SECTION_ICONS[index]}</span>{result[key].title}</summary><p>{result[key].content}</p><ul>{result[key].keyPoints.map((point) => <li key={point}>{point}</li>)}</ul></details>)}<details open><summary><span>→</span>{result.timingAndAction.title}</summary><p>{result.timingAndAction.content}</p><h3>이번 흐름에서 해볼 일</h3><ul>{result.timingAndAction.luckyActions.map((item) => <li key={item}>{item}</li>)}</ul><h3>주의해서 볼 반복 패턴</h3><ul>{result.timingAndAction.cautionPatterns.map((item) => <li key={item}>{item}</li>)}</ul></details><p className={styles.closing}>{result.closingMessage}</p><div className={styles.resultActions}><button className={styles.share} onClick={() => void share()}>개인정보 제외 요약 공유</button><Link href="/#guardian-fortune">오늘의 귀인에게 이어서 묻기</Link></div></section>}
  </main>;
}
