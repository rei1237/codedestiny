"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { authFetch } from "../_lib/auth-client";
import { getApiBaseUrl } from "../_lib/api-config";
import { useAiProfileSeed } from "../hooks/useAiProfileSeed";
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
type FusionStageKey = "saju" | "ziwei" | "sukuyo" | "vedic" | "astrology" | "tarot" | "fusion";
type FusionStageState = "pending" | "active" | "completed";

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
const FUSION_HANDOFF_KEY = "cdGuardianFusionHandoffV1";
const FUSION_STAGES: { key: FusionStageKey; label: string; message: string }[] = [
  { key: "saju", label: "사주", message: "사주의 계절과 기질을 읽고 있어요." },
  { key: "ziwei", label: "자미두수", message: "자미두수의 주제 흐름을 연결하고 있어요." },
  { key: "sukuyo", label: "숙요", message: "숙요의 관계 리듬을 살피고 있어요." },
  { key: "vedic", label: "베다", message: "베다점의 시기 흐름을 살피고 있어요." },
  { key: "astrology", label: "점성술", message: "점성술의 표현과 선택 패턴을 정리하고 있어요." },
  { key: "tarot", label: "타로", message: "질문에 맞는 타로 스프레드를 연결하고 있어요." },
  { key: "fusion", label: "Fusion", message: "모든 흐름을 하나의 읽기로 융합하고 있어요." },
];

function initialStageStates(): Record<FusionStageKey, FusionStageState> {
  return FUSION_STAGES.reduce((states, stage) => ({ ...states, [stage.key]: "pending" }), {} as Record<FusionStageKey, FusionStageState>);
}

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

async function consumeFusionStream(
  response: Response,
  onEvent: (event: string, payload: Record<string, unknown>) => void,
): Promise<Record<string, unknown>> {
  if (!response.ok || !response.body || !response.headers.get("content-type")?.includes("text/event-stream")) {
    const fallback = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(fallback.message || "분석 연결을 시작하지 못했어요.");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalPayload: Record<string, unknown> | null = null;
  const processBlock = (block: string) => {
    let event = "message";
    let data = "";
    block.split(/\r?\n/).forEach((line) => {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      if (line.startsWith("data:")) data += line.slice(5).trim();
    });
    if (!data) return;
    const payload = JSON.parse(data) as Record<string, unknown>;
    onEvent(event, payload);
    if (event === "result") finalPayload = payload;
    if (event === "complete" && finalPayload) finalPayload = { ...finalPayload, ...payload };
    if (event === "error") throw new Error(String(payload.message || "분석을 완료하지 못했어요."));
  };
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        processBlock(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf("\n\n");
      }
    }
    if (buffer.trim()) processBlock(buffer);
  } finally {
    reader.releaseLock();
  }
  if (!finalPayload) throw new Error("분석 결과를 받지 못했어요. 다시 시도해 주세요.");
  return finalPayload;
}

export function FusionFortuneClient({ seoContent }: { seoContent?: ReactNode }) {
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
  const requestAbortRef = useRef<AbortController | null>(null);
  const profileTouchedRef = useRef(false);
  const coreDialogRef = useRef<HTMLDialogElement>(null);
  const { seed: profileSeed, seedVersion, reload: reloadProfileSeed } = useAiProfileSeed();
  const [stageStates, setStageStates] = useState<Record<FusionStageKey, FusionStageState>>(initialStageStates);
  const [openSection, setOpenSection] = useState<string>("");
  const [guardianHandoff, setGuardianHandoff] = useState<{ topic: string; category: string } | null>(null);
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
    if (!profileSeed || profileTouchedRef.current) return;
    setForm((previous) => ({
      ...previous,
      birthDate: previous.birthDate || profileSeed.birthDate || "",
      birthTime: previous.birthTime || profileSeed.birthTime || "",
      birthTimeUnknown: previous.birthTime || profileSeed.birthTime ? false : Boolean(profileSeed.birthTimeUnknown),
      calendarType: previous.calendarType === "lunar" ? "lunar" : profileSeed.calendarType || previous.calendarType,
      gender: previous.gender !== "unspecified" ? previous.gender : profileSeed.gender === "female" || profileSeed.gender === "male" ? profileSeed.gender : previous.gender,
      nickname: previous.nickname || profileSeed.name || "",
    }));
  }, [profileSeed, seedVersion]);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(FUSION_HANDOFF_KEY);
      window.sessionStorage.removeItem(FUSION_HANDOFF_KEY);
      if (!raw) return;
      const handoff = JSON.parse(raw) as { version?: number; source?: string; topic?: string; category?: string; createdAt?: number };
      const fresh = Number.isFinite(Number(handoff.createdAt)) && Date.now() - Number(handoff.createdAt) < 30 * 60 * 1000;
      const allowedCategories = ["saju", "ziwei", "sukuyo", "vedic", "astrology", "tarot"];
      if (handoff.version !== 1 || handoff.source !== "guardian" || !fresh || !allowedCategories.includes(String(handoff.category))) return;
      const topics: Record<string, string> = {
        love: "연애와 관계",
        money_work: "돈과 일",
        relationship: "연애와 관계",
        mind: "마음과 회복",
        decision: "삶의 전반적인 흐름",
        daily: "삶의 전반적인 흐름",
      };
      setGuardianHandoff({ topic: String(handoff.topic || "daily"), category: String(handoff.category) });
      setForm((previous) => ({ ...previous, topic: topics[String(handoff.topic)] || previous.topic }));
      setNotice("연이가 남긴 주제만 이어받았어요. 출생 정보와 질문은 여기에서 다시 확인해 주세요.");
    } catch {
      // A malformed or unavailable handoff is discarded without affecting access.
    }
  }, []);

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
    requestAbortRef.current?.abort();
    const controller = new AbortController();
    requestAbortRef.current = controller;
    setStageStates(initialStageStates());
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
      const response = await authFetch(`${apiBase}/api/fusion-fortune/generate/stream`, {
        method: "POST", credentials: "include", signal: controller.signal,
        headers: { "Content-Type": "application/json", Accept: "text/event-stream", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify(requestBody),
      }, { retryOn401: true, apiBase });
      const payload = await consumeFusionStream(response, (streamEvent, streamPayload) => {
        if (streamEvent !== "stage" || typeof streamPayload.stage !== "string") return;
        const completed = streamPayload.stage as FusionStageKey;
        if (!FUSION_STAGES.some((stage) => stage.key === completed)) return;
        setStageStates(() => {
          const completedIndex = FUSION_STAGES.findIndex((stage) => stage.key === completed);
          return FUSION_STAGES.reduce((next, stage, index) => ({
            ...next,
            [stage.key]: index <= completedIndex ? "completed" : index === completedIndex + 1 ? "active" : "pending",
          }), {} as Record<FusionStageKey, FusionStageState>);
        });
      });
      const streamResult = payload.result as Result | undefined;
      const fusionStatus = payload.fusionStatus as Status | undefined;
      if (!streamResult || !fusionStatus) throw new Error(String(payload.message || "결과를 생성하지 못했어요."));
      setResult(streamResult); setStatus(fusionStatus); setNotice("결과가 완성되어 오늘의 선착순 자리가 확정됐어요.");
    } catch (cause) {
      if ((cause as Error)?.name === "AbortError") setNotice("분석을 중단했어요. 완료 전 중단된 요청은 상담권과 선착순 자리를 차감하지 않아요.");
      else setError(cause instanceof Error ? cause.message : "결과를 생성하지 못했어요.");
    } finally {
      if (requestAbortRef.current === controller) requestAbortRef.current = null;
      setLoading(false);
    }
  };

  const cancelGeneration = () => requestAbortRef.current?.abort();

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
  const toggleSection = (key: string) => setOpenSection((current) => current === key ? "" : key);
  const leaveExperience = useCallback(() => {
    const fallback = "/#fortune-gateway";
    if (typeof window === "undefined") return;
    try {
      const previous = document.referrer ? new URL(document.referrer) : null;
      if (previous?.origin === window.location.origin && window.history.length > 1) {
        window.history.back();
        return;
      }
    } catch {
      // A malformed or unavailable referrer should keep the user in the service.
    }
    window.location.assign(fallback);
  }, []);

  return <main className={styles.page}>
    <nav className={styles.experienceNav} aria-label="초융합 사주 탐색">
      <button type="button" onClick={leaveExperience}>이전</button>
      <Link href="/#fortune-gateway">홈으로</Link>
    </nav>
    <section className={styles.hero}>
      <Image className={styles.heroImage} src="/images/fusion-fortune/fusion-guardian-celestial-hero.webp" alt="" fill priority sizes="(max-width: 720px) 100vw, 1080px" />
      <div className={styles.heroVeil} />
      <div className={styles.heroCopy}>
        <Link className={styles.guardianLink} href="/#guardian-fortune">오늘의 귀인에서 이어지는 프리미엄 리딩</Link>
        <p className={styles.kicker}>초융합 운세</p><h1>여섯 개의 해석을<br />하나의 상담으로</h1>
        <p>사주·자미두수·베다점·숙요점·점성술·타로를 각 분야의 언어로 깊게 읽고, 지금의 선택과 현실 행동으로 하나로 엮습니다.</p>
        <div className={styles.heroMeta}><span className={styles.firstCome}>선착순! 하루 100명</span><span>1회 10,000원</span><span>10,000~15,000자</span></div>
        <p className={styles.chatLead}>Fusion AI가 여섯 체계의 완료 흐름을 이 화면에서 차례로 알려드려요.</p>
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
        <button className={styles.coreButton} type="button" onClick={() => coreDialogRef.current?.showModal()} aria-haspopup="dialog">Fusion Core 진행 방식 보기</button>
      </div>
      {status.dailyLimit.isSoldOut ? <div className={styles.sold}><p className={styles.kicker}>오늘 선착순 마감</p><h2>오늘의 100자리가 모두 채워졌어요.</h2><p>이용권은 차감되지 않았습니다. 다음 접수는 한국 시간 {resetTime} 이후에 열립니다.</p><div className={styles.soldLinks}><Link href="/#guardian-fortune">오늘의 귀인 보기</Link><Link href="/tarot">타로 둘러보기</Link></div></div> : <form className={styles.form} onSubmit={submit} onInputCapture={() => { profileTouchedRef.current = true; }}>
        <div className={styles.formIntro}><p className={styles.kicker}>Fusion AI · 상담 시작</p><h2>정확한 생시로 여섯 체계를 연결해요</h2><p>입력 정보는 결과 본문과 공유 요약에 노출하지 않습니다.</p>{guardianHandoff && <p className={styles.handoffNotice}>연이가 남긴 <strong>{guardianHandoff.topic}</strong> 주제만 이어받았어요. 개인 대화와 결과 원문은 가져오지 않았습니다.</p>}<button className={styles.profileReload} type="button" onClick={() => void reloadProfileSeed()}>저장한 프로필 다시 불러오기</button></div>
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
      {loading && <section className={styles.progressCanvas} aria-live="polite" aria-label="초융합 분석 진행 상황">
        <div className={styles.progressOrb}><FusionOrb /></div>
        <div><p className={styles.kicker}>Fusion Core 활성화</p><h2>{FUSION_STAGES.find((stage) => stageStates[stage.key] === "active")?.message || "분석 준비를 확인하고 있어요."}</h2><p>각 항목은 서버에서 실제 분석이 완료된 뒤 표시됩니다.</p></div>
        <ol className={styles.stageList}>{FUSION_STAGES.map((stage) => <li className={stageStates[stage.key] === "completed" ? styles.stageComplete : stageStates[stage.key] === "active" ? styles.stageActive : styles.stagePending} key={stage.key}><span>{stageStates[stage.key] === "completed" ? "완료" : stageStates[stage.key] === "active" ? "진행 중" : "대기"}</span>{stage.label}</li>)}</ol>
        <button className={styles.cancelGeneration} type="button" onClick={cancelGeneration}>분석 중단하기</button>
      </section>}
    </section>

    {!status.dailyLimit.isSoldOut && status.ticket.remaining < 1 && <section className={styles.ticket} id="ticket" aria-labelledby="fusion-ticket-heading">
      <div><p className={styles.kicker}>별도 프리미엄 상담권</p><h2 id="fusion-ticket-heading">초융합 운세 상담권</h2><p>{ticketProduct?.description || "여섯 운세 체계를 한 번에 엮어 1만자 이상의 깊은 전체 운세를 볼 수 있어요."}</p><ul><li>상담권 1회로 결과 1회 생성</li><li>PG 단건 결제로만 구매</li><li>생성 실패 또는 선착순 마감 시 미차감</li></ul></div>
      <div className={styles.ticketAction}><strong>{(ticketProduct?.priceKRW || 10000).toLocaleString("ko-KR")}원</strong><label>결제용 휴대전화 번호<input inputMode="numeric" autoComplete="tel" value={paymentPhone} onChange={(event) => setPaymentPhone(event.target.value)} placeholder="01012345678" maxLength={13} /></label><button type="button" disabled={purchaseBusy || !ticketProduct} onClick={() => void startPurchase()}>{purchaseBusy ? "결제 준비 중…" : "단건 결제로 구매하기"}</button><small>실제 결제 전 PG 결제창에서 금액을 다시 확인할 수 있어요.</small></div>
    </section>}

    {result && <section className={styles.result}><header><p className={styles.kicker}>Fusion AI · 결과 대화</p><h2>{result.title}</h2><p>{result.openingMessage}</p></header><article className={styles.summary}>{result.executiveSummary}</article>{SECTION_KEYS.map((key, index) => {
      const expanded = openSection === key || (!openSection && index === 0);
      return <article className={styles.resultMessage} key={key}><h3><button type="button" aria-expanded={expanded} aria-controls={`fusion-section-${key}`} onClick={() => toggleSection(key)}><span>{SECTION_ICONS[index]}</span>{result[key].title}<b>{expanded ? "접기" : "근거 보기"}</b></button></h3>{expanded && <div id={`fusion-section-${key}`} className={styles.sectionBody}><p>{result[key].content}</p><ul>{result[key].keyPoints.map((point) => <li key={point}>{point}</li>)}</ul></div>}</article>;
    })}{(() => {
      const timingKey = "timing";
      const expanded = openSection === timingKey;
      return <article className={styles.resultMessage}><h3><button type="button" aria-expanded={expanded} aria-controls="fusion-section-timing" onClick={() => toggleSection(timingKey)}><span>→</span>{result.timingAndAction.title}<b>{expanded ? "접기" : "행동 보기"}</b></button></h3>{expanded && <div id="fusion-section-timing" className={styles.sectionBody}><p>{result.timingAndAction.content}</p><h4>이번 흐름에서 해볼 일</h4><ul>{result.timingAndAction.luckyActions.map((item) => <li key={item}>{item}</li>)}</ul><h4>주의해서 볼 반복 패턴</h4><ul>{result.timingAndAction.cautionPatterns.map((item) => <li key={item}>{item}</li>)}</ul></div>}</article>;
    })()}<p className={styles.closing}>{result.closingMessage}</p><div className={styles.resultActions}><button className={styles.share} onClick={() => void share()}>개인정보 제외 요약 공유</button><Link href="/#guardian-fortune">오늘의 귀인에게 이어서 묻기</Link></div></section>}
    <dialog ref={coreDialogRef} className={styles.coreDialog} aria-labelledby="fusion-core-dialog-title">
      <form method="dialog"><button className={styles.dialogClose} aria-label="Fusion Core 설명 닫기">닫기</button></form>
      <p className={styles.kicker}>Fusion Core</p><h2 id="fusion-core-dialog-title">완료된 분석만 연결합니다</h2>
      <p>사주, 자미두수, 숙요, 베다점, 점성술, 타로를 각각 마친 뒤 마지막에 하나의 읽기로 융합합니다.</p>
      <ol>{FUSION_STAGES.map((stage) => <li key={stage.key}><strong>{stage.label}</strong><span>{stage.message}</span></li>)}</ol>
      <p className={styles.dialogNote}>중단·실패한 분석은 완료 전 예약을 해제하며, 결과가 완성될 때만 상담권과 오늘의 자리가 확정됩니다.</p>
    </dialog>
    {seoContent}
  </main>;
}
