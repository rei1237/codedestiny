"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authFetch } from "../_lib/auth-client";
import { getApiBaseUrl } from "../_lib/api-config";
import { useAiProfileSeed } from "../hooks/useAiProfileSeed";
import { useCoinGate } from "../hooks/useCoinGate";
import { PriceBadge } from "../components/PriceBadge";
import { FUSION_CORE_ORB, FUSION_ORB_BY_KEY, type FusionSystemKey } from "./fusionOrbs";
import { FusionVisualization, type FusionVisualizationData } from "./FusionVisualization";
import styles from "./fusion-fortune.module.css";

type Status = {
  isLoggedIn: boolean;
  pricing?: { featureKey?: string };
  canGenerate: boolean;
  nextAction: "login" | "generate" | "disabled";
  message: string;
  cta?: { targetPath: string };
};

type Section = { title: string; content: string; keyPoints: string[] };
type VerdictStance = "agree" | "conditional" | "caution";
type FinalVerdict = {
  headline: string;
  confidence: number;
  systemVerdicts: { key: FusionSystemKey; label: string; stance: VerdictStance; note: string }[];
  rationale: string;
  doNow: string[];
  avoid: string[];
};

/** 입장 라벨은 화면에서만 쓰는 표기다 — 판정 자체는 서버가 한다. */
const STANCE_LABEL: Record<VerdictStance, string> = {
  agree: "같은 방향",
  conditional: "조건부",
  caution: "속도 조절",
};
type Result = Record<"sajuSection" | "ziweiSection" | "vedicSection" | "sukuyoSection" | "astrologySection" | "tarotSection" | "integratedReading", Section> & {
  title: string;
  openingMessage: string;
  executiveSummary: string;
  timingAndAction: { title: string; content: string; luckyActions: string[]; cautionPatterns: string[] };
  /** 서버가 항상 채워 보낸다(worker/lib/fusion-fortune-visual.js). 그래도 옛 저장본을 위해 관용한다. */
  visualization?: FusionVisualizationData;
  /** 여섯 체계를 각각 판정한 뒤 하나로 수렴시킨 마지막 답. 옛 저장본에는 없다. */
  finalVerdict?: FinalVerdict;
  closingMessage: string;
  shareText?: string;
};

type BirthPlaceOption = { label: string; tz: string; lon: number; lat: number; country?: string };
type BirthPlaceGroup = { label?: string; places?: BirthPlaceOption[] };
type FusionStageKey = "saju" | "ziwei" | "sukuyo" | "vedic" | "astrology" | "tarot" | "fusion";
type FusionStageState = "pending" | "active" | "completed";

declare global {
  interface Window { BIRTH_PLACE_GROUPS?: BirthPlaceGroup[] }
}

const EMPTY_STATUS: Status = {
  isLoggedIn: false,
  canGenerate: false,
  nextAction: "disabled",
  message: "이용 상태를 확인하고 있어요.",
};

/** 회당 결제 키. 가격 정본은 worker/lib/paid-feature-registry.js (300코인 = 30,000원). */
const PAID_FEATURE_KEY = "fusion-fortune-consultation";
const PAID_COIN_PRICE = 300;
const PAID_AMOUNT_KRW = 30000;

const SECTION_KEYS = ["sajuSection", "ziweiSection", "vedicSection", "sukuyoSection", "astrologySection", "tarotSection", "integratedReading"] as const;
/** 섹션 순서와 같은 체계 키 — 결과 헤더에 그 체계의 오브를 띄운다. */
const SECTION_SYSTEM_KEYS: (FusionSystemKey | "fusion")[] = ["saju", "ziwei", "vedic", "sukuyo", "astrology", "tarot", "fusion"];
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

/**
 * 여섯 체계가 도는 융합 코어. 원본 오브 이미지를 쓰고 궤도는 CSS 로 돈다
 * (scripts/build-fusion-orb-assets.mjs 산출물).
 */
function FusionOrb({ stageStates }: { stageStates?: Record<FusionStageKey, FusionStageState> }) {
  return (
    <div className={styles.orbStage}>
      <Image className={styles.orbCore} src={FUSION_CORE_ORB} alt="여섯 운세 체계가 하나로 모인 초융합 코어" width={512} height={512} priority />
      <div className={styles.orbRing} aria-hidden>
        {FUSION_STAGES.filter((stage) => stage.key !== "fusion").map((stage, index, all) => {
          const orb = FUSION_ORB_BY_KEY[stage.key as FusionSystemKey];
          const angle = (index / all.length) * 360;
          const state = stageStates?.[stage.key] || "pending";
          return (
            <span
              key={stage.key}
              className={styles.orbSatellite}
              data-state={state}
              style={{ "--angle": `${angle}deg`, "--tint": orb?.tint } as React.CSSProperties}
            >
              {orb?.image
                ? <Image src={orb.image} alt="" width={320} height={320} />
                : <em />}
            </span>
          );
        })}
      </div>
    </div>
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
  const searchParams = useSearchParams();
  const fortuneChatSessionId = searchParams?.get("fortuneChatSession") || "";
  const { ensurePaidAccess, isPaying } = useCoinGate();
  const [status, setStatus] = useState<Status>(EMPTY_STATUS);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
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
  /** 융합 단계의 하위 진행 — 서버가 네 그룹을 병렬로 쓰고 끝나는 대로 알려 준다. */
  const [composeProgress, setComposeProgress] = useState<{ completed: number; total: number; label: string } | null>(null);
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

  useEffect(() => { void refresh(); }, [refresh]);

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
    event.preventDefault(); setError(""); setNotice("");
    if (status.nextAction === "login") { window.location.assign(status.cta?.targetPath || "/auth/login"); return; }
    if (!form.birthDate || (!form.birthTime && !form.birthTimeUnknown)) { setError("생년월일과 생시를 입력하거나, 생시를 모르는 경우를 선택해 주세요."); return; }

    // 앞선 시도가 결제까지 끝났다면 그 requestId 를 재사용한다 — 새 id 로 보내면 증빙을
    // 못 찾아 이미 낸 3만원이 사라진다.
    let requestId = paidRequestIdRef.current;
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
      paidRequestIdRef.current = requestId;
    }

    requestAbortRef.current?.abort();
    const controller = new AbortController();
    requestAbortRef.current = controller;
    setStageStates(initialStageStates());
    setComposeProgress(null);
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
        if (streamEvent !== "stage" || typeof streamPayload.stage !== "string") return;
        if (streamPayload.stage === "compose") {
          setComposeProgress({
            completed: Number(streamPayload.completedGroups) || 0,
            total: Number(streamPayload.totalGroups) || 4,
            label: String(streamPayload.groupLabel || ""),
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
      setResult(streamResult); setStatus(fusionStatus); setNotice("결과가 완성됐어요. 아래에서 바로 확인할 수 있어요.");
      if (fortuneChatSessionId) {
        void authFetch(`${apiBase}/api/fortune-chat/sessions/${encodeURIComponent(fortuneChatSessionId)}`, {
          method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ append: true, mode: "fusion_deep_reading", paymentStatus: "completed", generationStatus: "completed", messages: [{ id: `fusion-${payload.requestId || Date.now()}`, speaker: "assistant", kind: "fusion_result", text: streamResult.openingMessage, detail: streamResult.executiveSummary, result: streamResult }] }),
        }, { retryOn401: true, apiBase });
        window.setTimeout(() => window.location.assign(`/fortune-chat?session=${encodeURIComponent(fortuneChatSessionId)}`), 300);
      }
      // 결과를 받았으면 이 결제는 소진됐다. 다음 상담은 새로 결제한다.
      paidRequestIdRef.current = "";
    } catch (cause) {
      // 결제는 생성 전에 끝났다. "차감되지 않았다"고 말하면 거짓이므로, 실제로 안전한 것
      // (같은 requestId 재시도에 추가 결제가 없다는 점)만 안내한다.
      if ((cause as Error)?.name === "AbortError") setNotice("분석을 중단했어요. 같은 요청으로 다시 시도해도 추가 결제는 없습니다.");
      else setError(cause instanceof Error ? cause.message : "결과를 생성하지 못했어요. 다시 시도해도 추가 결제는 없습니다.");
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

  const buttonLabel = loading
    ? "여섯 전문가의 흐름을 엮는 중…"
    : isPaying
      ? "결제를 확인하고 있어요"
      : status.nextAction === "login"
        ? "로그인하고 시작하기"
        : paidRequestIdRef.current
          ? "추가 결제 없이 다시 시도하기"
          : "초융합 운세 생성하기";
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
        <div className={styles.heroMeta}><span className={styles.firstCome}>여섯 체계 교차 판정</span><PriceBadge featureKey={PAID_FEATURE_KEY} fallbackLabel="30,000원" prefix="1회 " className={styles.heroPrice} /><span>20,000자 이상</span></div>
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
        <div><span>이번 리딩이 읽는 범위</span><strong>여섯 체계 · 20,000자 이상</strong><small>사주·자미두수·베다점·숙요점·점성술·타로를 각각 읽고 마지막에 교차 판정합니다.</small></div>
        <div><span>이용 방식</span><strong>회당 결제</strong><small>결제창에서 이용권·단건·월정석을 함께 고를 수 있어요. family 이용권은 커버됩니다.</small></div>
        <button className={styles.coreButton} type="button" onClick={() => coreDialogRef.current?.showModal()} aria-haspopup="dialog">Fusion Core 진행 방식 보기</button>
      </div>
      {<form className={styles.form} onSubmit={submit} onInputCapture={() => { profileTouchedRef.current = true; }}>
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
        <button disabled={loading || isPaying || status.nextAction === "disabled"} type="submit">{buttonLabel}</button>
      </form>}
      {loading && <section className={styles.progressCanvas} aria-live="polite" aria-label="초융합 분석 진행 상황">
        <div className={styles.progressOrb}><FusionOrb stageStates={stageStates} /></div>
        <div><p className={styles.kicker}>Fusion Core 활성화</p><h2>{FUSION_STAGES.find((stage) => stageStates[stage.key] === "active")?.message || "분석 준비를 확인하고 있어요."}</h2><p>각 항목은 서버에서 실제 분석이 완료된 뒤 표시됩니다.</p>
          {composeProgress && <div className={styles.composeProgress}>
            <p><strong>{composeProgress.completed} / {composeProgress.total}</strong> 리딩 묶음 완성{composeProgress.label ? ` · ${composeProgress.label}` : ""}</p>
            <i aria-hidden><em style={{ "--fill": Math.min(1, composeProgress.completed / Math.max(1, composeProgress.total)) } as React.CSSProperties} /></i>
            <small>2만 자가 넘는 분량이라 네 묶음을 동시에 씁니다. 먼저 끝난 묶음부터 표시돼요.</small>
          </div>}
        </div>
        <ol className={styles.stageList}>{FUSION_STAGES.map((stage) => {
          const orb = stage.key === "fusion" ? null : FUSION_ORB_BY_KEY[stage.key as FusionSystemKey];
          const state = stageStates[stage.key];
          return <li className={state === "completed" ? styles.stageComplete : state === "active" ? styles.stageActive : styles.stagePending} key={stage.key}>
            <i className={styles.stageOrb} style={{ "--tint": orb?.tint || "#e8d5a3" } as React.CSSProperties} aria-hidden>
              {orb?.image ? <Image src={orb.image} alt="" width={320} height={320} /> : <em />}
            </i>
            <span>{state === "completed" ? "완료" : state === "active" ? "진행 중" : "대기"}</span>{stage.label}
          </li>;
        })}</ol>
        <button className={styles.cancelGeneration} type="button" onClick={cancelGeneration}>분석 중단하기</button>
      </section>}
    </section>

    {result && <section className={styles.result}><header><p className={styles.kicker}>Fusion AI · 결과 대화</p><h2>{result.title}</h2><p>{result.openingMessage}</p></header><article className={styles.summary}>{result.executiveSummary}</article>{result.visualization && <FusionVisualization data={result.visualization} />}{SECTION_KEYS.map((key, index) => {
      const expanded = openSection === key || (!openSection && index === 0);
      const systemKey = SECTION_SYSTEM_KEYS[index];
      const orb = systemKey === "fusion" ? null : FUSION_ORB_BY_KEY[systemKey];
      return <article className={styles.resultMessage} key={key}><h3><button type="button" aria-expanded={expanded} aria-controls={`fusion-section-${key}`} onClick={() => toggleSection(key)}>
        <span className={styles.sectionOrb} style={{ "--tint": orb?.tint || "#e8d5a3" } as React.CSSProperties}>
          {orb?.image ? <Image src={orb.image} alt="" width={320} height={320} /> : <em />}
        </span>
        {result[key].title}<b>{expanded ? "접기" : "근거 보기"}</b></button></h3>{expanded && <div id={`fusion-section-${key}`} className={styles.sectionBody}><p>{result[key].content}</p><ul>{result[key].keyPoints.map((point) => <li key={point}>{point}</li>)}</ul></div>}</article>;
    })}{(() => {
      const timingKey = "timing";
      const expanded = openSection === timingKey;
      return <article className={styles.resultMessage}><h3><button type="button" aria-expanded={expanded} aria-controls="fusion-section-timing" onClick={() => toggleSection(timingKey)}><span>→</span>{result.timingAndAction.title}<b>{expanded ? "접기" : "행동 보기"}</b></button></h3>{expanded && <div id="fusion-section-timing" className={styles.sectionBody}><p>{result.timingAndAction.content}</p><h4>이번 흐름에서 해볼 일</h4><ul>{result.timingAndAction.luckyActions.map((item) => <li key={item}>{item}</li>)}</ul><h4>주의해서 볼 반복 패턴</h4><ul>{result.timingAndAction.cautionPatterns.map((item) => <li key={item}>{item}</li>)}</ul></div>}</article>;
    })()}{result.finalVerdict && <section className={styles.verdict} aria-labelledby="fusion-final-verdict-heading">
      <p className={styles.kicker}>여섯 체계의 최종 교차 판정</p>
      <h3 id="fusion-final-verdict-heading">{result.finalVerdict.headline}</h3>
      <div className={styles.verdictMeter}>
        <span>체계 간 합의</span>
        <i aria-hidden><em style={{ "--fill": Math.min(1, Math.max(0, result.finalVerdict.confidence / 100)) } as React.CSSProperties} /></i>
        <b>{result.finalVerdict.confidence}%</b>
      </div>
      <ul className={styles.verdictSystems}>
        {result.finalVerdict.systemVerdicts.map((item) => (
          <li key={item.key} data-stance={item.stance} style={{ "--tint": FUSION_ORB_BY_KEY[item.key]?.tint || "#e8d5a3" } as React.CSSProperties}>
            <strong>{item.label}</strong>
            <span className={styles.verdictStance}>{STANCE_LABEL[item.stance]}</span>
            <p>{item.note}</p>
          </li>
        ))}
      </ul>
      <p className={styles.verdictRationale}>{result.finalVerdict.rationale}</p>
      <div className={styles.verdictActions}>
        <div>
          <h4>지금 할 일</h4>
          <ul>{result.finalVerdict.doNow.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
        <div>
          <h4>지금은 피할 일</h4>
          <ul>{result.finalVerdict.avoid.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      </div>
    </section>}<p className={styles.closing}>{result.closingMessage}</p><div className={styles.resultActions}><button className={styles.share} onClick={() => void share()}>개인정보 제외 요약 공유</button><Link href="/#guardian-fortune">오늘의 귀인에게 이어서 묻기</Link></div></section>}
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
