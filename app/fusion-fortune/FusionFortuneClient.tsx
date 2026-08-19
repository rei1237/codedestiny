"use client";

import { birthDateTextInputProps } from "@/lib/birthDateInputProps";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { authFetch } from "../_lib/auth-client";
import { getApiBaseUrl } from "../_lib/api-config";
import { useAiProfileSeed } from "../hooks/useAiProfileSeed";
import { useCoinGate } from "../hooks/useCoinGate";
import { PriceBadge } from "../components/PriceBadge";
import { FUSION_ORB_BY_KEY, FUSION_ORBS, type FusionSystemKey } from "./fusionOrbs";
import { FusionRecentList, type FusionRecentItem } from "./FusionRecentList";
import { FusionResultThread } from "./FusionResultThread";
import {
  FUSION_STAGES,
  FusionOrb,
  ThreadBubble,
  ThreadRow,
  ThreadSpeaker,
  TypingDots,
  initialStageStates,
  type FusionStageKey,
  type FusionStageState,
  type Result,
} from "./fusion-thread";
import styles from "./fusion-fortune.module.css";

type Status = {
  isLoggedIn: boolean;
  pricing?: { featureKey?: string };
  canGenerate: boolean;
  nextAction: "login" | "generate" | "disabled";
  message: string;
  cta?: { targetPath: string };
};

type BirthPlaceOption = { label: string; tz: string; lon: number; lat: number; country?: string };
type BirthPlaceGroup = { label?: string; places?: BirthPlaceOption[] };

declare global {
  interface Window { BIRTH_PLACE_GROUPS?: BirthPlaceGroup[] }
}

/**
 * 첫 렌더의 자리표시자. 🔴 문구를 넣지 않는다 — "이용 상태를 확인하고 있어요" 는 사용자가
 * 알 필요 없는 내부 상태였고, 상태가 오기 전 화면을 그 문장으로 채울 이유가 없다.
 * 서버가 주는 실제 안내(로그인 필요·준비 중·입력 안내)만 표시한다.
 */
const EMPTY_STATUS: Status = {
  isLoggedIn: false,
  canGenerate: false,
  nextAction: "disabled",
  message: "",
};

/** 회당 결제 키. 가격 정본은 worker/lib/paid-feature-registry.js (300코인 = 30,000원). */
const PAID_FEATURE_KEY = "fusion-fortune-consultation";
const PAID_COIN_PRICE = 300;
const PAID_AMOUNT_KRW = 30000;

const DEFAULT_BIRTH_PLACES: BirthPlaceOption[] = [{ label: "대한민국 · 서울", tz: "Asia/Seoul", lon: 126.978, lat: 37.5665, country: "KR" }];
const FUSION_HANDOFF_KEY = "cdGuardianFusionHandoffV1";

/**
 * 결제 증빙 id 보관 키.
 *
 * 🔴 메모리(ref)에만 두면 생성이 멈춘 화면에서 사용자가 새로고침하는 순간 id 가 사라지고,
 * 다음 제출이 **새 id 로 결제를 한 번 더** 요청한다. 서버는 requestId 로만 증빙을 찾으므로
 * (worker/lib/nakshatra-paid-access.js 의 findPaidPayment) 잃어버린 id 에 묶인 30,000원은
 * 회수할 방법이 없다. 결과를 실제로 받은 뒤에만 지운다.
 */
const PAID_REQUEST_KEY = "cdFusionPaidRequestIdV1";

/** 서버 심박이 15초 간격이라 세 번을 놓치면 연결이 끊긴 것으로 본다. */
const STREAM_SILENCE_MS = 45000;

function readStoredPaidRequestId(): string {
  if (typeof window === "undefined") return "";
  try { return window.sessionStorage.getItem(PAID_REQUEST_KEY) || ""; } catch { return ""; }
}

function storePaidRequestId(value: string) {
  if (typeof window === "undefined") return;
  try {
    if (value) window.sessionStorage.setItem(PAID_REQUEST_KEY, value);
    else window.sessionStorage.removeItem(PAID_REQUEST_KEY);
  } catch {
    // 저장소를 못 써도 이번 화면의 ref 는 그대로 동작한다 — 새로고침 복구만 못 할 뿐이다.
  }
}

/**
 * 입력폼의 각 항목을 실제로 읽는 체계. 장식이 아니라 "이 정보를 누가 쓰는가"의 축소판이다
 * — 근거는 각 필드의 기존 안내 문구(생시=명반·라그나·상승궁·하우스, 출생지=베다점·서양
 * 점성술)를 그대로 따른다. "all"은 여섯 체계 전부가 함께 읽는 항목(주제·고민)에 쓴다.
 */
const FIELD_SYSTEMS: Record<string, FusionSystemKey[] | "all"> = {
  birthDate: ["saju", "ziwei", "vedic", "sukuyo", "astrology"],
  birthTime: ["ziwei", "vedic", "astrology"],
  birthPlace: ["vedic", "astrology"],
  calendarType: ["saju", "ziwei"],
  gender: ["ziwei"],
  topic: "all",
  concern: "all",
};

/** 폼 항목 옆의 작은 신호 점. 색은 fusionOrbs.ts 의 체계별 tint 그대로 — 새 색을 만들지 않는다. */
function FieldSystems({ field }: { field: keyof typeof FIELD_SYSTEMS }) {
  const mapped = FIELD_SYSTEMS[field];
  if (!mapped) return null;
  if (mapped === "all") {
    return (
      <span className={styles.fieldSystems} title="읽는 체계: 여섯 체계 전체">
        <i aria-hidden className={`${styles.systemDot} ${styles.systemDotAll}`} />
        <span className="sr-only">이 정보를 읽는 체계: 여섯 체계 전체</span>
      </span>
    );
  }
  const label = mapped.map((key) => FUSION_ORB_BY_KEY[key].label).join(" · ");
  return (
    <span className={styles.fieldSystems} title={`읽는 체계: ${label}`}>
      {mapped.map((key) => <i key={key} aria-hidden className={styles.systemDot} style={{ "--tint": FUSION_ORB_BY_KEY[key].tint } as React.CSSProperties} />)}
      <span className="sr-only">{`이 정보를 읽는 체계: ${label}`}</span>
    </span>
  );
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
    if (event === "error") {
      // 서버는 status(402/503)·retryable 을 함께 싣는다. message 만 읽고 버리면 재시도로
      // 해결되는 실패인지 결제가 필요한 실패인지 화면이 구분할 수 없다.
      const failure = new Error(String(payload.message || "분석을 완료하지 못했어요."));
      throw Object.assign(failure, {
        retryable: payload.retryable === true,
        httpStatus: Number(payload.status) || 0,
        // 계약 위반 코드만 온다(본문·개인정보 없음). 같은 실패가 반복될 때 사용자가 문의에 적을 근거다.
        errorCode: String(payload.error || ""),
        issues: Array.isArray(payload.issues) ? payload.issues.map(String) : [],
      });
    }
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
  const { ensurePaidAccess, isPaying } = useCoinGate();
  const [status, setStatus] = useState<Status>(EMPTY_STATUS);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  /** refresh() 가 실패해 status 가 EMPTY_STATUS(nextAction:"disabled")에 갇혔을 때만 켠다 —
   *  이때는 새로고침 없이 재확인할 방법이 폼 안에 없으면 생성 자체가 영구히 막힌다. */
  const [statusUnavailable, setStatusUnavailable] = useState(false);
  const [birthPlaces, setBirthPlaces] = useState<BirthPlaceOption[]>(DEFAULT_BIRTH_PLACES);
  /**
   * 결제 증빙은 requestId 에 묶인다. 생성이 실패하면 **같은 id 로** 다시 보내야
   * 추가 결제 없이 결과를 받는다(worker/lib/fusion-fortune.js 의 retryRequestId 계약).
   */
  const paidRequestIdRef = useRef("");
  const requestAbortRef = useRef<AbortController | null>(null);
  const profileTouchedRef = useRef(false);
  const coreDialogRef = useRef<HTMLDialogElement>(null);
  const { seed: profileSeed, seedVersion, reload: reloadProfileSeed } = useAiProfileSeed();
  const [stageStates, setStageStates] = useState<Record<FusionStageKey, FusionStageState>>(initialStageStates);
  /** 융합 단계의 하위 진행 — 서버가 네 그룹을 병렬로 쓰고 끝나는 대로 알려 준다.
   *  phase 가 "repair" 면 미달 묶음을 보완하는 국면이라 카운터의 총량이 다르다. */
  const [composeProgress, setComposeProgress] = useState<{ completed: number; total: number; label: string; phase: string } | null>(null);
  /** 스트림이 조용해진 지 얼마나 됐는지 판정한다. 서버 심박(ping)이 오면 다시 false 가 된다. */
  const [stalled, setStalled] = useState(false);
  const lastEventAtRef = useRef(0);
  /** 결제는 끝났는데 결과를 못 받은 요청이 남아 있는가. 새로고침을 건너 살아남는다. */
  const [pendingPaidRequest, setPendingPaidRequest] = useState(false);
  /** 목표 분량에 못 미친 채 배달된 결과의 안내. 재열람에서도 같은 문구가 붙는다. */
  const [qualityNotice, setQualityNotice] = useState("");
  /** 재열람으로 연 보관본의 입력 요약. PDF 표지가 폼 대신 이걸 본다. */
  const [openedSummary, setOpenedSummary] = useState<{ topic?: string; nickname?: string } | null>(null);
  const [openSection, setOpenSection] = useState<string>("");
  /** 생성 실패는 폼이 아니라 대화 안에 남는다 — 어디까지 진행됐는지와 함께 봐야 재시도를 고른다. */
  const [failure, setFailure] = useState<{ message: string; retryable: boolean; reason?: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const threadRef = useRef<HTMLElement>(null);
  const [guardianHandoff, setGuardianHandoff] = useState<{ topic: string; category: string } | null>(null);
  const [form, setForm] = useState({ birthDate: "", birthTime: "", birthTimeUnknown: false, birthPlaceKey: "", calendarType: "solar", gender: "unspecified", nickname: "", topic: "삶의 전반적인 흐름", concern: "" });
  /** 보관본 — 재열람 목록과 지금 화면에 열린 보관본 id. */
  const [recentList, setRecentList] = useState<FusionRecentItem[]>([]);
  const [openedConsultationId, setOpenedConsultationId] = useState("");
  const [reopeningId, setReopeningId] = useState("");
  /** PDF 캡처 중에는 접힌 섹션을 전부 펼치고 애니메이션을 끈다(백지 PDF 방지). */
  const [exporting, setExporting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await authFetch(`${apiBase}/api/fusion-fortune/status`, { credentials: "include" }, { retryOn401: true, apiBase });
      const payload = await parseJson<Status & { ok?: boolean }>(response);
      // response.ok 이지만 payload.ok 가 아닌 경우도 조용히 넘기면 status 가 EMPTY_STATUS 에
      // 머물러 제출 버튼이 말없이 계속 비활성 상태로 남는다 — 아래 catch 로 합쳐서 항상
      // 사용자에게 재확인할 방법을 준다.
      if (!response.ok || !payload.ok) throw new Error("이용 상태 응답이 올바르지 않아요.");
      setStatus(payload);
      setStatusUnavailable(false);
    } catch {
      setStatusUnavailable(true);
      setError("이용 상태를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  }, [apiBase]);

  useEffect(() => { void refresh(); }, [refresh]);

  /** 결제 증빙 id 를 ref·저장소·화면 상태에 한꺼번에 반영한다. 세 곳이 어긋나면 이중 결제가 난다. */
  const rememberPaidRequestId = useCallback((value: string) => {
    paidRequestIdRef.current = value;
    storePaidRequestId(value);
    setPendingPaidRequest(Boolean(value));
  }, []);

  // 새로고침으로 돌아온 사용자의 결제 증빙을 되살린다 — 이게 없으면 다음 제출이 재결제다.
  useEffect(() => {
    const stored = readStoredPaidRequestId();
    if (!stored) return;
    paidRequestIdRef.current = stored;
    setPendingPaidRequest(true);
  }, []);

  // 스트림 무음 감시. 서버가 15초마다 심박을 보내므로 45초 침묵은 연결이 끊겼다는 뜻이다.
  // 🔴 이 화면에는 타임아웃이 하나도 없어서, 스트림이 조용히 죽으면 사용자는 영원히 기다렸다.
  useEffect(() => {
    if (!loading) { setStalled(false); return undefined; }
    lastEventAtRef.current = Date.now();
    const timer = window.setInterval(() => {
      setStalled(Date.now() - lastEventAtRef.current > STREAM_SILENCE_MS);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [loading]);

  /** 보관본 목록 새로고침. 비로그인·장애는 조용히 넘긴다 — 재열람은 부가 기능이다. */
  const loadRecentList = useCallback(async () => {
    try {
      const response = await authFetch(`${apiBase}/api/fusion-fortune/result`, { credentials: "include" }, { retryOn401: true, apiBase });
      if (!response.ok) return;
      const payload = await parseJson<{ ok?: boolean; consultations?: FusionRecentItem[] }>(response);
      if (payload.ok && Array.isArray(payload.consultations)) setRecentList(payload.consultations);
    } catch {
      // 목록을 못 불러와도 생성은 그대로 할 수 있어야 한다.
    }
  }, [apiBase]);

  /** 저장된 결과를 연다. 이미 결제한 본인 결과라 추가 결제가 없다. */
  const openConsultation = useCallback(async (id: string) => {
    if (!id) return;
    setReopeningId(id);
    setError("");
    try {
      const response = await authFetch(`${apiBase}/api/fusion-fortune/result?id=${encodeURIComponent(id)}`, { credentials: "include" }, { retryOn401: true, apiBase });
      const payload = await parseJson<{ ok?: boolean; consultation?: { id: string; result: Result; qualityTier?: string; qualityNotice?: string; inputSummary?: { topic?: string; nickname?: string } }; message?: string }>(response);
      if (!response.ok || !payload.ok || !payload.consultation?.result) throw new Error(payload.message || "저장된 결과를 불러오지 못했어요.");
      setResult(payload.consultation.result);
      // 재열람 PDF 의 표지는 폼이 아니라 보관본의 요약에서 온다 — 새 탭에서 열면 폼이 비어 있다.
      setOpenedSummary(payload.consultation.inputSummary || null);
      // 강등 배달이었으면 다시 열었을 때도 같은 안내가 붙는다 — 화면에서만 알리면 근거가 사라진다.
      setQualityNotice(payload.consultation.qualityTier === "degraded" ? (payload.consultation.qualityNotice || "") : "");
      setFailure(null);
      setOpenSection("");
      setOpenedConsultationId(payload.consultation.id);
      rememberConsultationUrl(payload.consultation.id);
      threadRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "저장된 결과를 불러오지 못했어요.");
    } finally {
      setReopeningId("");
    }
  }, [apiBase]);

  // 첫 진입: ?cid= 가 있으면 그 보관본을 열고, 이어서 목록을 채운다.
  // useSearchParams 를 쓰면 정적 내보내기에서 이 페이지가 통째로 CSR 로 떨어지므로 URL 을 직접 읽는다.
  useEffect(() => {
    const cid = new URLSearchParams(window.location.search).get("cid") || "";
    if (cid) void openConsultation(cid);
    void loadRecentList();
  }, [openConsultation, loadRecentList]);

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

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setNotice(""); setFailure(null); setQualityNotice(""); setOpenedSummary(null);
    // useSearchParams 를 쓰면 정적 내보내기에서 이 페이지 전체가 CSR 로 떨어져
    // (BAILOUT_TO_CLIENT_SIDE_RENDERING) 히어로 H1 을 포함한 서버 렌더 HTML 이 통째로 사라진다.
    // 이 값은 제출 시점에만 필요하므로 그때 URL 에서 직접 읽는다.
    const fortuneChatSessionId = new URLSearchParams(window.location.search).get("fortuneChatSession") || "";
    if (status.nextAction === "login") { window.location.assign(status.cta?.targetPath || "/auth/login"); return; }
    if (!form.birthDate || (!form.birthTime && !form.birthTimeUnknown)) { setError("생년월일과 생시를 입력하거나, 생시를 모르는 경우를 선택해 주세요."); return; }

    // 앞선 시도가 결제까지 끝났다면 그 requestId 를 재사용한다 — 새 id 로 보내면 증빙을
    // 못 찾아 이미 낸 3만원이 사라진다. 저장소까지 보는 이유는 새로고침으로 ref 가 비기 때문이다.
    let requestId = paidRequestIdRef.current || readStoredPaidRequestId();
    if (!requestId) {
      requestId = `${PAID_FEATURE_KEY}:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const gate = await ensurePaidAccess({
        featureKey: PAID_FEATURE_KEY,
        coinPrice: PAID_COIN_PRICE,
        amountKRW: PAID_AMOUNT_KRW,
        reason: "초융합 운세 상담 1회",
        requestId,
      });
      if (!gate.ok) {
        if (gate.code === "AUTH_REQUIRED") { window.location.assign("/auth/login"); return; }
        if (gate.code !== "PAYMENT_CANCELLED") setError(gate.message || "결제를 완료하지 못했어요. 잠시 후 다시 시도해 주세요.");
        return;
      }
      rememberPaidRequestId(requestId);
    }

    requestAbortRef.current?.abort();
    const controller = new AbortController();
    requestAbortRef.current = controller;
    setStageStates(initialStageStates());
    setComposeProgress(null);
    setOpenedConsultationId("");
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
        headers: { "Content-Type": "application/json", Accept: "text/event-stream", "Idempotency-Key": requestId },
        body: JSON.stringify({ ...requestBody, requestId }),
      }, { retryOn401: true, apiBase });
      const payload = await consumeFusionStream(response, (streamEvent, streamPayload) => {
        // 심박(ping)을 포함한 **모든** 이벤트가 무음 감시를 되돌린다.
        lastEventAtRef.current = Date.now();
        if (streamEvent !== "stage" || typeof streamPayload.stage !== "string") return;
        if (streamPayload.stage === "compose") {
          setComposeProgress({
            completed: Number(streamPayload.completedGroups) || 0,
            total: Number(streamPayload.totalGroups) || 4,
            label: String(streamPayload.groupLabel || ""),
            phase: String(streamPayload.phase || "compose"),
          });
          setStageStates((current) => ({ ...current, fusion: "active" }));
          return;
        }
        const completed = streamPayload.stage as FusionStageKey;
        if (!FUSION_STAGES.some((stage) => stage.key === completed)) return;
        setStageStates(() => {
          const completedIndex = FUSION_STAGES.findIndex((stage) => stage.key === completed);
          return FUSION_STAGES.reduce((next, stage, index) => ({
            ...next,
            [stage.key]: index <= completedIndex ? "completed" : index === completedIndex + 1 ? "active" : "pending",
          }), {} as Record<FusionStageKey, FusionStageState>);
        });
        if (fortuneChatSessionId) {
          void authFetch(`${apiBase}/api/fortune-chat/sessions/${encodeURIComponent(fortuneChatSessionId)}`, {
            method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ append: true, mode: "fusion_deep_reading", paymentStatus: "completed", generationStatus: "running", messages: [{ id: `fusion-stage-${completed}`, speaker: "assistant", kind: "progress", text: FUSION_STAGES.find((stage) => stage.key === completed)?.message || "초융합 리딩을 정리하고 있어요." }] }),
          }, { retryOn401: true, apiBase });
        }
      });
      const streamResult = payload.result as Result | undefined;
      const fusionStatus = payload.fusionStatus as Status | undefined;
      if (!streamResult || !fusionStatus) throw new Error(String(payload.message || "결과를 생성하지 못했어요."));
      setResult(streamResult); setStatus(fusionStatus); setNotice("결과가 완성됐어요. 계정에 저장돼 언제든 다시 열 수 있어요.");
      // 목표 분량에 못 미친 채 배달됐으면 숨기지 않고 그대로 말한다.
      setQualityNotice(payload.qualityTier === "degraded" ? String(payload.qualityNotice || "") : "");
      // 보관본 id 가 오면 같은 링크로 다시 열 수 있게 URL 에 남기고 목록도 갱신한다.
      const savedId = String(payload.consultationId || "");
      if (savedId) {
        setOpenedConsultationId(savedId);
        rememberConsultationUrl(savedId);
        void loadRecentList();
      }
      if (fortuneChatSessionId) {
        void authFetch(`${apiBase}/api/fortune-chat/sessions/${encodeURIComponent(fortuneChatSessionId)}`, {
          method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ append: true, mode: "fusion_deep_reading", paymentStatus: "completed", generationStatus: "completed", messages: [{ id: `fusion-${payload.requestId || Date.now()}`, speaker: "assistant", kind: "fusion_result", text: streamResult.openingMessage, detail: streamResult.executiveSummary, result: streamResult }] }),
        }, { retryOn401: true, apiBase });
        window.setTimeout(() => window.location.assign(`/fortune-chat?session=${encodeURIComponent(fortuneChatSessionId)}`), 300);
      }
      // 결과를 받았으면 이 결제는 소진됐다. 다음 상담은 새로 결제한다.
      rememberPaidRequestId("");
    } catch (cause) {
      // 결제는 생성 전에 끝났다. "차감되지 않았다"고 말하면 거짓이므로, 실제로 안전한 것
      // (같은 requestId 재시도에 추가 결제가 없다는 점)만 안내한다.
      if ((cause as Error)?.name === "AbortError") setNotice("분석을 중단했어요. 같은 요청으로 다시 시도해도 추가 결제는 없습니다.");
      else setFailure({
        message: cause instanceof Error ? cause.message : "결과를 생성하지 못했어요.",
        // 결제 증빙이 남아 있으면(=paidRequestIdRef) 같은 id 재시도에 추가 결제가 없다.
        retryable: Boolean(paidRequestIdRef.current) || (cause as { retryable?: boolean })?.retryable === true,
        reason: [(cause as { errorCode?: string })?.errorCode, ...((cause as { issues?: string[] })?.issues || [])]
          .filter(Boolean).join(" · "),
      });
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

  const copyReopenLink = async () => {
    if (!openedConsultationId) return;
    try {
      await navigator.clipboard.writeText(`${location.origin}/fusion-fortune?cid=${encodeURIComponent(openedConsultationId)}`);
      setNotice("다시 열 수 있는 링크를 복사했어요. 본인 계정으로 로그인해야 열립니다.");
    } catch {
      setError("링크를 복사하지 못했어요.");
    }
  };

  /**
   * PDF 저장.
   *
   * 본문은 결과 JSON 에서 직접 조판한다(글자 선택·검색 가능, 용량은 캡처 방식의 수십분의 1).
   * 도표만 그림이라 그 블록 하나를 캡처하므로, 캡처 전에 exporting 을 켜 지연 렌더를 풀고
   * 두 프레임 + 여유를 기다린다(인생의 책과 같은 관용구).
   *
   * 🔴 R2 한글 폰트를 못 실으면 텍스트 조판은 통째로 깨진다. 그때만 기존 캡처 방식으로
   *    되돌아간다 — 읽을 수 없는 문서를 내려주는 것보다 무거운 이미지 PDF 가 낫다.
   */
  const downloadPdf = async () => {
    if (!result || exporting) return;
    setError("");
    setExporting(true);
    const fileName = `fusion-fortune-${openedConsultationId || new Date().toISOString().slice(0, 10)}.pdf`;
    try {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await new Promise((resolve) => setTimeout(resolve, 120));
      const { exportFusionReportPdf, FusionPdfFontError } = await import("../../lib/pdf/export-fusion-report-pdf");
      try {
        await exportFusionReportPdf({
          result,
          fileName,
          topic: openedSummary?.topic || form.topic,
          nickname: openedSummary?.nickname || form.nickname || undefined,
          date: new Date().toLocaleDateString("ko-KR"),
          qualityNotice,
          visualizationSelector: "[data-fusion-visual]",
        });
      } catch (cause) {
        if (!(cause instanceof FusionPdfFontError)) throw cause;
        const { exportResultPdf } = await import("../../lib/pdf/export-result-pdf");
        await exportResultPdf({
          captureTargets: ["[data-fusion-pdf-section]"],
          fileName,
          backgroundColor: "#12102a",
          cover: {
            title: result.title || "초융합 운세",
            subtitle: `여섯 체계 교차 판정 · ${openedSummary?.topic || form.topic}`,
            name: openedSummary?.nickname || form.nickname || undefined,
            date: new Date().toLocaleDateString("ko-KR"),
          },
          watermarkText: "CODE DESTINY",
        });
      }
      setNotice("PDF 로 저장했어요.");
    } catch {
      setError("PDF 를 만들지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setExporting(false);
    }
  };

  const buttonLabel = loading
    ? "여섯 전문가의 흐름을 엮는 중…"
    : isPaying
      ? "결제를 확인하고 있어요"
      : status.nextAction === "login"
        ? "로그인하고 시작하기"
        : pendingPaidRequest
          ? "추가 결제 없이 이어서 받기"
          : "초융합 운세 생성하기";
  const toggleSection = (key: string) => setOpenSection((current) => current === key ? "" : key);
  const completedStageCount = useMemo(
    () => FUSION_STAGES.filter((stage) => stage.key !== "fusion" && stageStates[stage.key] === "completed").length,
    [stageStates],
  );
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
        <h1>여섯 개의 해석을<br />하나의 상담으로</h1>
        <p>사주·자미두수·베다점·숙요점·점성술·타로를 각 분야의 언어로 깊게 읽고, 마지막에 하나의 교차 판정으로 모읍니다. 완성된 상담은 계정에 저장돼 언제든 다시 열고 PDF 로 내려받을 수 있어요.</p>
        <div className={styles.heroMeta}>
          <span className={styles.firstCome}>여섯 체계 교차 판정</span>
          <PriceBadge featureKey={PAID_FEATURE_KEY} fallbackLabel="30,000원" prefix="1회 " className={styles.heroPrice} />
          <span>20,000자 이상</span>
          <span>저장 · 재열람 · PDF</span>
        </div>
        <p className={styles.chatLead}>Fusion AI가 여섯 체계의 완료 흐름을 이 화면에서 차례로 알려드려요.</p>
      </div>
      <FusionOrb />
    </section>

    {/* 여섯 체계를 카드 세 장으로 요약하는 대신, 실제로 지나가는 순서를 그대로 보여 준다.
        같은 색(fusionOrbs tint)이 아래 생성 화면의 말풍선에서 다시 등장해 한 흐름으로 읽힌다. */}
    <section className={styles.readingFlow} aria-label="초융합 리딩이 지나가는 순서">
      <p className={styles.readingFlowLead}>이 상담이 지나가는 길</p>
      <ol className={styles.readingFlowList}>
        {FUSION_ORBS.map((orb) => (
          <li key={orb.key} style={{ "--tint": orb.tint } as React.CSSProperties}>
            <i aria-hidden className={styles.systemDot} />
            <strong>{orb.label}</strong>
          </li>
        ))}
        <li className={styles.readingFlowFinal}>
          <strong>교차 판정 하나</strong>
          <span>같은 신호는 핵심 패턴으로, 다른 신호는 상황별 선택지로.</span>
        </li>
      </ol>
    </section>

    <FusionRecentList items={recentList} activeId={openedConsultationId} busyId={reopeningId} onOpen={(id) => void openConsultation(id)} />

    <section className={styles.panel}>
      <div className={styles.status}>
        <div><span>이번 리딩이 읽는 범위</span><strong>여섯 체계 · 20,000자 이상</strong><small>사주·자미두수·베다점·숙요점·점성술·타로를 각각 읽고 마지막에 교차 판정합니다.</small></div>
        <div><span>이용 방식</span><strong>회당 결제</strong><small>결제창에서 이용권·단건·월정석을 함께 고를 수 있어요. family 이용권은 커버됩니다.</small></div>
        <button className={styles.coreButton} type="button" onClick={() => coreDialogRef.current?.showModal()} aria-haspopup="dialog">Fusion Core 진행 방식 보기</button>
      </div>
      {<form ref={formRef} className={styles.form} onSubmit={submit} onInputCapture={() => { profileTouchedRef.current = true; }}>
        <div className={styles.formIntro}>
          <h2>정확한 생시로 여섯 체계를 연결해요</h2>
          <p>입력 정보는 결과 본문과 공유 요약에 노출하지 않습니다.</p>
          <p className={styles.systemsLegend}>이 상담을 나눠 읽는 여섯 전문가
            <span className={styles.systemsLegendList}>
              {FUSION_ORBS.map((orb) => (
                <span key={orb.key} className={styles.systemsLegendItem}>
                  <i aria-hidden className={styles.systemDot} style={{ "--tint": orb.tint } as React.CSSProperties} />{orb.label}
                </span>
              ))}
            </span>
          </p>
          {guardianHandoff && <p className={styles.handoffNotice}>연이가 남긴 <strong>{guardianHandoff.topic}</strong> 주제만 이어받았어요. 개인 대화와 결과 원문은 가져오지 않았습니다.</p>}
          <button className={styles.profileReload} type="button" onClick={() => void reloadProfileSeed()}>저장한 프로필 다시 불러오기</button>
        </div>
        <p className={styles.formSectionFirst}>태어난 순간을 알려주세요</p>
        <label><span className={styles.labelRow}>생년월일<FieldSystems field="birthDate" /></span><input required {...birthDateTextInputProps(form.birthDate, (nextBirthDate) => setForm({ ...form, birthDate: nextBirthDate }))} /></label>
        <label><span className={styles.labelRow}>생시<FieldSystems field="birthTime" /></span><input type="time" required={!form.birthTimeUnknown} disabled={form.birthTimeUnknown} value={form.birthTime} onChange={(event) => setForm({ ...form, birthTime: event.target.value })} /><span className={styles.inlineCheck}><input type="checkbox" checked={form.birthTimeUnknown} onChange={(event) => setForm({ ...form, birthTimeUnknown: event.target.checked, birthTime: event.target.checked ? "" : form.birthTime })} /> 생시를 몰라요</span><small>모르면 시간 기반 명반·라그나·상승궁·하우스를 단정하지 않아요.</small></label>
        <label><span className={styles.labelRow}>출생지<FieldSystems field="birthPlace" /></span><select value={form.birthPlaceKey} onChange={(event) => setForm({ ...form, birthPlaceKey: event.target.value })}><option value="">출생지를 몰라요</option>{birthPlaces.map((place) => <option key={`${place.label}-${place.lat}-${place.lon}`} value={place.label}>{place.label}</option>)}</select><small>베다점·서양 점성술의 위치 계산에 사용해요.</small></label>
        <fieldset><legend><span className={styles.labelRow}>달력 기준<FieldSystems field="calendarType" /></span></legend><label><input type="radio" checked={form.calendarType === "solar"} onChange={() => setForm({ ...form, calendarType: "solar" })} /> 양력</label><label><input type="radio" checked={form.calendarType === "lunar"} onChange={() => setForm({ ...form, calendarType: "lunar" })} /> 음력</label></fieldset>
        <label><span className={styles.labelRow}><span>성별 <em>(선택)</em></span><FieldSystems field="gender" /></span><select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}><option value="unspecified">선택하지 않음</option><option value="female">여성</option><option value="male">남성</option></select></label>
        <p className={styles.formSection}>지금 이 마음을 들려주세요</p>
        <label>닉네임 <em>(선택)</em><input maxLength={40} value={form.nickname} onChange={(event) => setForm({ ...form, nickname: event.target.value })} placeholder="결과에서 불릴 이름" /></label>
        <label><span className={styles.labelRow}>관심 주제<FieldSystems field="topic" /></span><select value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value })}><option>삶의 전반적인 흐름</option><option>연애와 관계</option><option>일과 돈</option><option>마음과 회복</option></select></label>
        <label className={styles.wide}><span className={styles.labelRow}><span>고민 <em>(선택)</em></span><FieldSystems field="concern" /></span><textarea maxLength={1000} value={form.concern} onChange={(event) => setForm({ ...form, concern: event.target.value })} placeholder="개인 식별 정보는 적지 말아 주세요." /></label>
        {status.message && <p className={styles.notice}>{status.message}</p>}{notice && <p className={styles.success} role="status">{notice}</p>}
        {/* 결제는 끝났는데 결과를 못 받은 요청이 남아 있으면 그것부터 알린다 — 이 안내가 없으면
            사용자는 처음부터 다시 하는 줄 알고 결제를 한 번 더 한다. */}
        {pendingPaidRequest && !loading && !result && <p className={`${styles.wide} ${styles.notice}`} role="status">
          이미 결제가 끝난 요청이 남아 있어요. 아래 버튼을 누르면 <b>추가 결제 없이</b> 같은 요청으로 결과를 받습니다.
        </p>}
        {error && <div className={styles.wide}>
          <p className={styles.error} role="alert">{error}</p>
          {statusUnavailable && <button type="button" className={styles.profileReload} onClick={() => { setError(""); void refresh(); }}>이용 상태 다시 확인하기</button>}
        </div>}
        <button disabled={loading || isPaying || status.nextAction === "disabled"} type="submit">{buttonLabel}</button>
      </form>}
    </section>

    {/* 생성과 결과는 끊기지 않는 하나의 대화다. 진행 표시는 서버가 실제로 보낸 stage/compose
        이벤트에서만 오고, 결과 말풍선의 순차 등장은 진행 흉내가 아니라 등장 연출이다. */}
    {(loading || result || failure) && <section
      ref={threadRef}
      aria-label="초융합 상담 대화"
      className="relative z-[2] mx-auto mb-[26px] w-full max-w-[1080px] overflow-hidden rounded-[28px] border border-[rgba(200,177,235,0.27)] bg-[linear-gradient(145deg,rgba(24,19,48,0.94),rgba(13,11,29,0.97))] shadow-[0_24px_70px_rgba(0,0,0,0.3)]"
    >
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(120%_100%_at_50%_0%,rgba(160,92,214,0.24),transparent_72%)]" />

      <header className="relative flex items-center gap-5 border-b border-white/[0.07] px-4 py-6 sm:px-9">
        <div className="hidden w-[7.5rem] shrink-0 sm:block"><FusionOrb stageStates={stageStates} /></div>
        <div className="min-w-0">
          <h2 className={`m-0 ${styles.readingTitle} text-[clamp(1.32rem,3.9vw,2.05rem)] leading-snug text-[var(--fx-ink-1)]`}>
            {result ? result.title : failure ? "상담이 중간에 멈췄어요" : "여섯 전문가가 차례로 답하고 있어요"}
          </h2>
          <p className="m-0 mt-2.5 max-w-[56ch] text-[0.9rem] leading-[1.8] text-[var(--fx-ink-3)]" role={loading ? "status" : undefined} aria-live={loading ? "polite" : "off"}>
            {result
              ? openedConsultationId && !loading
                ? "계정에 저장된 상담입니다. 이 화면에서 바로 PDF 로 내려받을 수 있어요."
                : "여섯 체계를 각각 읽고, 마지막에 하나로 교차 판정한 대화입니다."
              : failure
                ? "진행된 곳까지 그대로 남겨 뒀어요. 아래에서 이어서 다시 시도할 수 있습니다."
                : FUSION_STAGES.find((stage) => stageStates[stage.key] === "active")?.message || "여섯 체계를 부를 준비를 하고 있어요."}
          </p>
          {!result && loading && <p className="m-0 mt-2 text-[0.82rem] text-[var(--fx-ink-4)]">여섯 체계 중 <b className="font-display text-[var(--fx-gold)]">{completedStageCount}개</b> 완료</p>}
        </div>
      </header>

      <ol className="relative m-0 grid list-none gap-5 px-4 py-7 sm:px-9 sm:py-9">
        {/* 대화의 척추. 좌표 = 목록 좌우 여백(16/36px) + 아바타 반지름(18px). */}
        <span aria-hidden className="pointer-events-none absolute bottom-12 left-[34px] top-12 w-px bg-[linear-gradient(180deg,transparent,rgba(201,181,243,0.3),transparent)] sm:left-[54px]" />

        {/* 생성 중에는 끝난 체계와 지금 쓰는 체계만 말한다. 아직 없는 내용을 자리로 약속하지 않는다. */}
        {!result && FUSION_STAGES.map((stage, index) => {
          const state = stageStates[stage.key];
          if (state === "pending") return null;
          const systemKey = stage.key === "fusion" ? "fusion" : stage.key as FusionSystemKey;
          return <ThreadRow key={stage.key} systemKey={systemKey} index={index} dataState={state}>
            <ThreadBubble systemKey={systemKey}>
              <ThreadSpeaker
                label={stage.key === "fusion" ? "Fusion Core" : stage.label}
                note={state === "completed"
                  ? <span className="rounded-full bg-[var(--tint-veil)] px-2.5 py-0.5 text-[0.7rem] text-white/80">완료</span>
                  : <span className="inline-flex items-center gap-2 rounded-full bg-[var(--tint-veil)] px-2.5 py-0.5 text-[0.7rem] text-white/80"><TypingDots />쓰는 중</span>}
              />
              <p className={`m-0 max-w-[72ch] ${styles.reading} text-[1rem] leading-[1.9] text-[var(--fx-ink-2)]`}>{state === "completed" ? stage.done : stage.message}</p>
              {stage.key === "fusion" && composeProgress && <div className="mt-4 rounded-xl border border-white/[0.08] bg-black/25 px-4 py-3.5">
                <p className="m-0 text-[0.85rem] text-[var(--fx-ink-3)]">
                  <strong className="font-display text-[var(--fx-gold)]">{composeProgress.completed} / {composeProgress.total}</strong>
                  {composeProgress.phase === "repair" ? " 묶음 보완 완료" : " 리딩 묶음 완성"}{composeProgress.label ? ` · ${composeProgress.label}` : ""}
                </p>
                <span aria-hidden className="mt-2.5 block h-1.5 overflow-hidden rounded-full bg-white/[0.09]">
                  <em className="block h-full origin-left rounded-full bg-[linear-gradient(90deg,var(--fx-violet),var(--fx-gold-2))] transition-transform duration-700 ease-out motion-reduce:transition-none" style={{ transform: `scaleX(${Math.min(1, composeProgress.completed / Math.max(1, composeProgress.total))})` }} />
                </span>
                <small className="mt-2.5 block text-[0.78rem] leading-relaxed text-[var(--fx-ink-4)]">
                  {composeProgress.phase === "repair"
                    ? "분량이 모자란 묶음만 다시 쓰고 있어요. 앞서 완성된 묶음은 그대로 남아 있습니다."
                    : "2만 자가 넘는 분량이라 네 묶음을 동시에 씁니다. 먼저 끝난 묶음부터 표시돼요."}
                </small>
                {stalled && <p className="m-0 mt-3 border-t border-white/[0.08] pt-3 text-[0.78rem] leading-relaxed text-[var(--fx-rose)]">
                  연결이 조용해진 지 좀 됐어요. 결과는 완성되는 즉시 계정에 저장되니, 화면이 멈춘 것 같으면 아래 보관함에서 다시 확인해 주세요.
                </p>}
              </div>}
            </ThreadBubble>
          </ThreadRow>;
        })}

        {!result && loading && FUSION_STAGES.some((stage) => stageStates[stage.key] === "pending") && <li className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-x-3.5">
          <span aria-hidden className="grid size-9 place-items-center"><i className="size-1.5 rounded-full bg-white/30" /></span>
          <p className="m-0 text-[0.84rem] leading-relaxed text-white/55">
            {FUSION_STAGES.filter((stage) => stageStates[stage.key] === "pending").map((stage) => stage.label).join(" · ")} 차례를 기다리는 중
          </p>
        </li>}

        {result && qualityNotice && <li>
          <div role="status" className="rounded-[1.375rem] border border-[rgba(232,213,163,0.3)] bg-[rgba(232,213,163,0.08)] px-5 py-4 sm:px-6">
            <p className="m-0 font-display text-[0.82rem] text-[var(--fx-gold)]">분량 안내</p>
            <p className="m-0 mt-1.5 max-w-[64ch] text-[0.9rem] leading-[1.8] text-[var(--fx-gold-2)]">{qualityNotice}</p>
          </div>
        </li>}

        {result && <FusionResultThread result={result} openSection={openSection} onToggleSection={toggleSection} exporting={exporting} />}

        {failure && <li className="animate-fade-in-up opacity-0 motion-reduce:animate-none motion-reduce:opacity-100">
          <div role="alert" className="relative overflow-hidden rounded-[1.375rem] border border-[rgba(244,190,209,0.34)] bg-[rgba(74,24,47,0.34)] px-5 py-5 sm:px-6">
            <p className="m-0 font-display text-[0.85rem] text-[var(--fx-rose)]">생성이 멈췄어요</p>
            <p className="m-0 mt-2 max-w-[64ch] text-[0.95rem] leading-[1.8] text-[var(--fx-rose)]">{failure.message}</p>
            {failure.reason && <p className="m-0 mt-2 text-[0.75rem] leading-relaxed text-[var(--fx-rose-dim)]">사유 코드 <code className="font-mono">{failure.reason}</code> · 같은 실패가 반복되면 이 코드를 문의에 남겨 주세요.</p>}
            {failure.retryable && <button
              type="button"
              onClick={() => formRef.current?.requestSubmit()}
              className="mt-4 min-h-11 rounded-full border border-[rgba(244,190,209,0.45)] bg-[rgba(244,190,209,0.14)] px-5 text-[0.9rem] text-[var(--fx-rose)] transition-colors hover:bg-[rgba(244,190,209,0.24)] motion-reduce:transition-none"
            >추가 결제 없이 다시 시도하기</button>}
          </div>
        </li>}
      </ol>

      {(loading || result) && <footer className="relative flex flex-wrap gap-3 border-t border-white/[0.07] px-4 py-5 sm:px-9">
        {loading
          ? <button type="button" onClick={cancelGeneration} className="min-h-11 rounded-full border border-white/[0.18] px-5 text-[0.88rem] text-[var(--fx-ink-3)] transition-colors hover:border-[var(--fx-violet-soft)] hover:text-[var(--fx-ink-1)] motion-reduce:transition-none">분석 중단하기</button>
          : <>
            <button
              type="button"
              onClick={() => void downloadPdf()}
              disabled={exporting}
              className="min-h-11 rounded-full border border-[rgba(232,213,163,0.42)] bg-[rgba(232,213,163,0.12)] px-5 text-[0.9rem] font-bold text-[var(--fx-gold)] transition-colors hover:bg-[rgba(232,213,163,0.2)] disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
            >{exporting ? "PDF 를 만드는 중…" : "PDF 로 저장"}</button>
            <button type="button" onClick={() => void share()} className="min-h-11 rounded-full border border-white/[0.16] px-5 text-[0.9rem] text-[var(--fx-ink-3)] transition-colors hover:border-[var(--fx-violet-soft)] hover:text-[var(--fx-ink-1)] motion-reduce:transition-none">개인정보 제외 요약 공유</button>
            {openedConsultationId && <button type="button" onClick={() => void copyReopenLink()} className="min-h-11 rounded-full border border-white/[0.16] px-5 text-[0.9rem] text-[var(--fx-ink-3)] transition-colors hover:border-[var(--fx-violet-soft)] hover:text-[var(--fx-ink-1)] motion-reduce:transition-none">다시 열 링크 복사</button>}
            <Link href="/#guardian-fortune" className="inline-flex min-h-11 items-center rounded-full border border-white/[0.16] px-5 text-[0.9rem] text-[var(--fx-ink-3)] transition-colors hover:border-[var(--fx-violet-soft)] hover:text-[var(--fx-ink-1)] motion-reduce:transition-none">오늘의 귀인에게 이어서 묻기</Link>
          </>}
      </footer>}
    </section>}
    <dialog ref={coreDialogRef} className={styles.coreDialog} aria-labelledby="fusion-core-dialog-title">
      <form method="dialog"><button className={styles.dialogClose} aria-label="Fusion Core 설명 닫기">닫기</button></form>
      <p className={styles.kicker}>Fusion Core</p><h2 id="fusion-core-dialog-title">완료된 분석만 연결합니다</h2>
      <p>사주, 자미두수, 숙요, 베다점, 점성술, 타로를 각각 마친 뒤 마지막에 하나의 읽기로 융합합니다.</p>
      <ol>{FUSION_STAGES.map((stage) => <li key={stage.key}><strong>{stage.label}</strong><span>{stage.message}</span></li>)}</ol>
      <p className={styles.dialogNote}>중단·실패한 분석은 같은 요청을 다시 보내면 추가 결제 없이 이어집니다.</p>
    </dialog>
    {seoContent}
  </main>;
}

/** 같은 링크로 다시 열 수 있게 주소만 갱신한다(히스토리를 쌓지 않는다). */
function rememberConsultationUrl(id: string) {
  if (typeof window === "undefined" || !id) return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("cid", id);
    window.history.replaceState(null, "", url.toString());
  } catch {
    // 주소를 못 바꿔도 결과 자체는 이미 화면에 있다.
  }
}
