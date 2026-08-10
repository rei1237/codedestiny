"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { authFetch } from "../_lib/auth-client";
import { getApiBaseUrl } from "../_lib/api-config";
import { useAiProfileSeed } from "../hooks/useAiProfileSeed";
import { useCoinGate } from "../hooks/useCoinGate";
import { PriceBadge } from "../components/PriceBadge";
import { FUSION_CORE_ORB, FUSION_ORB_BY_KEY, FUSION_ORBS, type FusionSystemKey } from "./fusionOrbs";
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
/** 입장별 색은 기존 판정 패널과 같은 값을 유지한다 — 색이 바뀌면 같은 판정이 다르게 읽힌다. */
const STANCE_CLASS: Record<VerdictStance, string> = {
  agree: "bg-[rgba(134,220,184,0.18)] text-[#a8e8cb]",
  conditional: "bg-[rgba(232,213,163,0.18)] text-[#f0dda8]",
  caution: "bg-[rgba(244,190,209,0.18)] text-[#f6cadb]",
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

const SECTION_KEYS = ["sajuSection", "ziweiSection", "vedicSection", "sukuyoSection", "astrologySection", "tarotSection", "integratedReading"] as const;
/** 섹션 순서와 같은 체계 키 — 결과 헤더에 그 체계의 오브를 띄운다. */
const SECTION_SYSTEM_KEYS: (FusionSystemKey | "fusion")[] = ["saju", "ziwei", "vedic", "sukuyo", "astrology", "tarot", "fusion"];
const DEFAULT_BIRTH_PLACES: BirthPlaceOption[] = [{ label: "대한민국 · 서울", tz: "Asia/Seoul", lon: 126.978, lat: 37.5665, country: "KR" }];
const FUSION_HANDOFF_KEY = "cdGuardianFusionHandoffV1";
/** `done` 은 완료된 단계가 대화에 남길 말이다 — 진행 중 문장을 그대로 두면 끝난 말풍선이 어색하다. */
const FUSION_STAGES: { key: FusionStageKey; label: string; message: string; done: string }[] = [
  { key: "saju", label: "사주", message: "사주의 계절과 기질을 읽고 있어요.", done: "타고난 계절과 기질을 다 읽었어요." },
  { key: "ziwei", label: "자미두수", message: "자미두수의 주제 흐름을 연결하고 있어요.", done: "명반의 주제 흐름을 연결했어요." },
  { key: "sukuyo", label: "숙요", message: "숙요의 관계 리듬을 살피고 있어요.", done: "관계가 움직이는 리듬을 잡았어요." },
  { key: "vedic", label: "베다", message: "베다점의 시기 흐름을 살피고 있어요.", done: "다샤가 그리는 시기 흐름을 정리했어요." },
  { key: "astrology", label: "점성술", message: "점성술의 표현과 선택 패턴을 정리하고 있어요.", done: "표현과 선택의 패턴을 정리했어요." },
  { key: "tarot", label: "타로", message: "질문에 맞는 타로 스프레드를 연결하고 있어요.", done: "질문에 맞는 여섯 장을 펼쳤어요." },
  { key: "fusion", label: "Fusion", message: "모든 흐름을 하나의 읽기로 융합하고 있어요.", done: "여섯 흐름을 하나의 읽기로 묶었어요." },
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

/**
 * 오브 tint(hex)에서 반투명 파생색을 만든다. Tailwind 임의값은 `var(--tint)` 에 알파를 씌우지
 * 못하므로, 링·베일에 쓸 색을 미리 계산해 CSS 변수로 함께 넘긴다.
 */
function withAlpha(hex: string, alpha: number) {
  const raw = hex.replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((char) => `${char}${char}`).join("") : raw;
  const value = Number.parseInt(full, 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

function tintVars(systemKey?: FusionSystemKey | "fusion") {
  const tint = (systemKey && systemKey !== "fusion" ? FUSION_ORB_BY_KEY[systemKey]?.tint : "") || "#e8d5a3";
  return { "--tint": tint, "--tint-ring": withAlpha(tint, 0.42), "--tint-veil": withAlpha(tint, 0.14) } as React.CSSProperties;
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

/**
 * 대화의 화자 아바타. 오브 이미지를 그대로 쓰고, 이미지가 없는 타로만 CSS 구체로 대신한다.
 * 🔴 글리프 문자를 넣지 않는다 — ◇ 같은 기호는 폰트 폴백에 없으면 두부(□)로 깨진다
 * (fusion-fortune.module.css 의 .orbSatellite > em 주석과 같은 이유).
 */
function ThreadAvatar({ systemKey, dimmed = false }: { systemKey?: FusionSystemKey | "fusion"; dimmed?: boolean }) {
  const orb = systemKey && systemKey !== "fusion" ? FUSION_ORB_BY_KEY[systemKey] : null;
  const core = !systemKey || systemKey === "fusion";
  return (
    <span
      aria-hidden
      style={tintVars(systemKey)}
      className={`relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[#0d0a1c] ring-1 ring-[color:var(--tint-ring)] ${dimmed ? "opacity-40 grayscale" : "shadow-[0_0_20px_-7px_var(--tint)]"}`}
    >
      {core || orb?.image
        ? <Image src={core ? FUSION_CORE_ORB : (orb?.image as string)} alt="" width={320} height={320} className="size-full object-cover" />
        : <em className="size-[62%] rounded-full bg-[radial-gradient(circle_at_32%_26%,rgba(255,255,255,0.82),transparent_42%),radial-gradient(circle_at_50%_50%,var(--tint-veil),rgba(12,8,30,0.96)_78%)] shadow-[inset_0_0_0_1px_var(--tint-ring)]" />}
    </span>
  );
}

/**
 * 대화 한 줄. 왼쪽 아바타 열은 고정폭이라 세로 실선(척추)이 아바타 중심을 지나간다 —
 * 카드 목록이 아니라 대화로 읽히게 만드는 건 그 실선이다.
 */
function ThreadRow({ systemKey, dimmed, index = 0, dataState, children, className = "" }: {
  systemKey?: FusionSystemKey | "fusion";
  dimmed?: boolean;
  index?: number;
  dataState?: FusionStageState;
  children: ReactNode;
  className?: string;
}) {
  return (
    <li
      data-state={dataState}
      className={`grid animate-fade-in-up grid-cols-[2.25rem_minmax(0,1fr)] items-start gap-x-3.5 opacity-0 motion-reduce:animate-none motion-reduce:opacity-100 ${className}`}
      style={{ animationDelay: `${Math.min(index, 14) * 60}ms` }}
    >
      <ThreadAvatar systemKey={systemKey} dimmed={dimmed} />
      {children}
    </li>
  );
}

/** 아직 말하는 중이라는 신호. 진행률을 지어내지 않고 "쓰는 중"만 보여 준다. */
function TypingDots() {
  return (
    <span aria-hidden className="inline-flex items-center gap-1 align-middle">
      {[0, 1, 2].map((dot) => (
        <i
          key={dot}
          className="size-1.5 animate-pulse rounded-full bg-[color:var(--tint)] motion-reduce:animate-none"
          style={{ animationDelay: `${dot * 180}ms`, animationDuration: "1.15s" }}
        />
      ))}
    </span>
  );
}

/** 말풍선. 위쪽 헤어라인만 체계 색으로 물들여 화자를 구분한다(그림자 대신 글로우). */
function ThreadBubble({ systemKey, tone = "plain", className = "", children }: {
  systemKey?: FusionSystemKey | "fusion";
  tone?: "plain" | "gold";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={tintVars(systemKey)}
      className={`relative min-w-0 overflow-hidden rounded-[1.375rem] rounded-tl-md border px-5 py-4 sm:px-6 sm:py-5 ${
        tone === "gold"
          ? "border-[rgba(232,213,163,0.28)] bg-[linear-gradient(150deg,rgba(232,213,163,0.11),rgba(255,255,255,0.03))]"
          : "border-white/[0.09] bg-white/[0.035]"
      } ${className}`}
    >
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--tint),transparent)] opacity-70" />
      {children}
    </div>
  );
}

/** 화자 이름표. 대화의 "누가 말하는가"를 한 줄로 못 박는다. */
function ThreadSpeaker({ label, note }: { label: string; note?: ReactNode }) {
  return (
    <p className="m-0 mb-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-display text-[0.82rem] tracking-wide text-[color:var(--tint)]">
      {label}
      {note}
    </p>
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
      throw Object.assign(failure, { retryable: payload.retryable === true, httpStatus: Number(payload.status) || 0 });
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
  /** 융합 단계의 하위 진행 — 서버가 네 그룹을 병렬로 쓰고 끝나는 대로 알려 준다. */
  const [composeProgress, setComposeProgress] = useState<{ completed: number; total: number; label: string } | null>(null);
  const [openSection, setOpenSection] = useState<string>("");
  /** 생성 실패는 폼이 아니라 대화 안에 남는다 — 어디까지 진행됐는지와 함께 봐야 재시도를 고른다. */
  const [failure, setFailure] = useState<{ message: string; retryable: boolean } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [guardianHandoff, setGuardianHandoff] = useState<{ topic: string; category: string } | null>(null);
  const [form, setForm] = useState({ birthDate: "", birthTime: "", birthTimeUnknown: false, birthPlaceKey: "", calendarType: "solar", gender: "unspecified", nickname: "", topic: "삶의 전반적인 흐름", concern: "" });

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
    event.preventDefault(); setError(""); setNotice(""); setFailure(null);
    // useSearchParams 를 쓰면 정적 내보내기에서 이 페이지 전체가 CSR 로 떨어져
    // (BAILOUT_TO_CLIENT_SIDE_RENDERING) 히어로 H1 을 포함한 서버 렌더 HTML 이 통째로 사라진다.
    // 이 값은 제출 시점에만 필요하므로 그때 URL 에서 직접 읽는다.
    const fortuneChatSessionId = new URLSearchParams(window.location.search).get("fortuneChatSession") || "";
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
      else setFailure({
        message: cause instanceof Error ? cause.message : "결과를 생성하지 못했어요.",
        // 결제 증빙이 남아 있으면(=paidRequestIdRef) 같은 id 재시도에 추가 결제가 없다.
        retryable: Boolean(paidRequestIdRef.current) || (cause as { retryable?: boolean })?.retryable === true,
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
      {<form ref={formRef} className={styles.form} onSubmit={submit} onInputCapture={() => { profileTouchedRef.current = true; }}>
        <div className={styles.formIntro}>
          <p className={styles.kicker}>Fusion AI · 상담 시작</p><h2>정확한 생시로 여섯 체계를 연결해요</h2>
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
        <label><span className={styles.labelRow}>생년월일<FieldSystems field="birthDate" /></span><input type="date" required value={form.birthDate} onChange={(event) => setForm({ ...form, birthDate: event.target.value })} /></label>
        <label><span className={styles.labelRow}>생시<FieldSystems field="birthTime" /></span><input type="time" required={!form.birthTimeUnknown} disabled={form.birthTimeUnknown} value={form.birthTime} onChange={(event) => setForm({ ...form, birthTime: event.target.value })} /><span className={styles.inlineCheck}><input type="checkbox" checked={form.birthTimeUnknown} onChange={(event) => setForm({ ...form, birthTimeUnknown: event.target.checked, birthTime: event.target.checked ? "" : form.birthTime })} /> 생시를 몰라요</span><small>모르면 시간 기반 명반·라그나·상승궁·하우스를 단정하지 않아요.</small></label>
        <label><span className={styles.labelRow}>출생지<FieldSystems field="birthPlace" /></span><select value={form.birthPlaceKey} onChange={(event) => setForm({ ...form, birthPlaceKey: event.target.value })}><option value="">출생지를 몰라요</option>{birthPlaces.map((place) => <option key={`${place.label}-${place.lat}-${place.lon}`} value={place.label}>{place.label}</option>)}</select><small>베다점·서양 점성술의 위치 계산에 사용해요.</small></label>
        <fieldset><legend><span className={styles.labelRow}>달력 기준<FieldSystems field="calendarType" /></span></legend><label><input type="radio" checked={form.calendarType === "solar"} onChange={() => setForm({ ...form, calendarType: "solar" })} /> 양력</label><label><input type="radio" checked={form.calendarType === "lunar"} onChange={() => setForm({ ...form, calendarType: "lunar" })} /> 음력</label></fieldset>
        <label><span className={styles.labelRow}><span>성별 <em>(선택)</em></span><FieldSystems field="gender" /></span><select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}><option value="unspecified">선택하지 않음</option><option value="female">여성</option><option value="male">남성</option></select></label>
        <p className={styles.formSection}>지금 이 마음을 들려주세요</p>
        <label>닉네임 <em>(선택)</em><input maxLength={40} value={form.nickname} onChange={(event) => setForm({ ...form, nickname: event.target.value })} placeholder="결과에서 불릴 이름" /></label>
        <label><span className={styles.labelRow}>관심 주제<FieldSystems field="topic" /></span><select value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value })}><option>삶의 전반적인 흐름</option><option>연애와 관계</option><option>일과 돈</option><option>마음과 회복</option></select></label>
        <label className={styles.wide}><span className={styles.labelRow}><span>고민 <em>(선택)</em></span><FieldSystems field="concern" /></span><textarea maxLength={1000} value={form.concern} onChange={(event) => setForm({ ...form, concern: event.target.value })} placeholder="개인 식별 정보는 적지 말아 주세요." /></label>
        {status.message && <p className={styles.notice}>{status.message}</p>}{notice && <p className={styles.success} role="status">{notice}</p>}
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
      aria-label="초융합 상담 대화"
      className="relative z-[2] mx-auto mb-[26px] w-full max-w-[1080px] overflow-hidden rounded-[28px] border border-[rgba(200,177,235,0.27)] bg-[linear-gradient(145deg,rgba(24,19,48,0.94),rgba(13,11,29,0.97))] shadow-[0_24px_70px_rgba(0,0,0,0.3)]"
    >
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(120%_100%_at_50%_0%,rgba(160,92,214,0.24),transparent_72%)]" />

      <header className="relative flex items-center gap-5 border-b border-white/[0.07] px-4 py-6 sm:px-9">
        <div className="hidden w-[7.5rem] shrink-0 sm:block"><FusionOrb stageStates={stageStates} /></div>
        <div className="min-w-0">
          <h2 className="m-0 font-display text-[clamp(1.2rem,3.6vw,1.8rem)] leading-snug text-[#f7f1ff]">
            {result ? result.title : failure ? "상담이 중간에 멈췄어요" : "여섯 전문가가 차례로 답하고 있어요"}
          </h2>
          <p className="m-0 mt-2.5 max-w-[56ch] text-[0.9rem] leading-[1.8] text-[#c6b9dc]" role={loading ? "status" : undefined} aria-live={loading ? "polite" : "off"}>
            {result
              ? "여섯 체계를 각각 읽고, 마지막에 하나로 교차 판정한 대화입니다."
              : failure
                ? "진행된 곳까지 그대로 남겨 뒀어요. 아래에서 이어서 다시 시도할 수 있습니다."
                : FUSION_STAGES.find((stage) => stageStates[stage.key] === "active")?.message || "여섯 체계를 부를 준비를 하고 있어요."}
          </p>
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
              <p className="m-0 max-w-[72ch] text-[0.95rem] leading-[1.85] text-[#e6ddf2]">{state === "completed" ? stage.done : stage.message}</p>
              {stage.key === "fusion" && composeProgress && <div className="mt-4 rounded-xl border border-white/[0.08] bg-black/25 px-4 py-3.5">
                <p className="m-0 text-[0.85rem] text-[#d6cbe8]">
                  <strong className="font-display text-[#f0dda8]">{composeProgress.completed} / {composeProgress.total}</strong> 리딩 묶음 완성{composeProgress.label ? ` · ${composeProgress.label}` : ""}
                </p>
                <span aria-hidden className="mt-2.5 block h-1.5 overflow-hidden rounded-full bg-white/[0.09]">
                  <em className="block h-full origin-left rounded-full bg-[linear-gradient(90deg,#a05cd6,#e8d5a3)] transition-transform duration-700 ease-out motion-reduce:transition-none" style={{ transform: `scaleX(${Math.min(1, composeProgress.completed / Math.max(1, composeProgress.total))})` }} />
                </span>
                <small className="mt-2.5 block text-[0.78rem] leading-relaxed text-[#a99cc0]">2만 자가 넘는 분량이라 네 묶음을 동시에 씁니다. 먼저 끝난 묶음부터 표시돼요.</small>
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

        {/* 결과가 오면 진행 기록은 한 줄로 접고, 같은 대화에 상담 본문이 이어진다. */}
        {result && <ThreadRow systemKey="fusion" index={0}>
          <ThreadBubble systemKey="fusion">
            <ThreadSpeaker label="Fusion Core" note={<span className="rounded-full bg-[var(--tint-veil)] px-2.5 py-0.5 text-[0.7rem] text-white/80">여섯 체계 분석 완료</span>} />
            <p className="m-0 max-w-[72ch] whitespace-pre-wrap font-body text-[1rem] leading-[1.9] text-[#eee6f8] [text-wrap:pretty]">{result.openingMessage}</p>
          </ThreadBubble>
        </ThreadRow>}

        {result && <ThreadRow systemKey="fusion" index={1}>
          <ThreadBubble systemKey="fusion" tone="gold">
            <ThreadSpeaker label="먼저, 한 문단으로" />
            <p className="m-0 max-w-[72ch] whitespace-pre-wrap font-body text-[1rem] leading-[1.92] text-[#f4eefb] [text-wrap:pretty]">{result.executiveSummary}</p>
          </ThreadBubble>
        </ThreadRow>}

        {result?.visualization && <ThreadRow systemKey="fusion" index={2}>
          <ThreadBubble systemKey="fusion" className="px-3 sm:px-5">
            <ThreadSpeaker label="여섯 체계가 가리키는 방향" />
            <FusionVisualization data={result.visualization} />
          </ThreadBubble>
        </ThreadRow>}

        {result && SECTION_KEYS.map((key, index) => {
          const expanded = openSection === key || (!openSection && index === 0);
          const systemKey = SECTION_SYSTEM_KEYS[index];
          return <ThreadRow key={key} systemKey={systemKey} index={index + 3}>
            <ThreadBubble systemKey={systemKey} className="[contain-intrinsic-size:420px] [content-visibility:auto]">
              <ThreadSpeaker label={systemKey === "fusion" ? "Fusion Core" : FUSION_ORB_BY_KEY[systemKey].label} />
              <h3 className="m-0">
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`fusion-section-${key}`}
                  onClick={() => toggleSection(key)}
                  className="flex min-h-11 w-full items-center justify-between gap-3 text-left font-display text-[1.02rem] leading-snug text-[#f7f1ff] transition-colors hover:text-[color:var(--tint)] motion-reduce:transition-none"
                >
                  <span className="min-w-0">{result[key].title}</span>
                  <b className="shrink-0 rounded-full border border-white/[0.16] px-3 py-1 text-[0.74rem] font-normal text-white/75">{expanded ? "접기" : "근거 보기"}</b>
                </button>
              </h3>
              {expanded && <div id={`fusion-section-${key}`} className="mt-3 border-t border-white/[0.07] pt-4">
                <p className="m-0 max-w-[72ch] whitespace-pre-wrap font-body text-[1rem] leading-[1.92] text-[#e7dff4] [text-wrap:pretty]">{result[key].content}</p>
                <ul className="mt-4 grid max-w-[72ch] list-none gap-2.5 p-0">
                  {result[key].keyPoints.map((point) => <li key={point} className="grid grid-cols-[0.375rem_minmax(0,1fr)] items-start gap-3 text-[0.94rem] leading-[1.8] text-[#d8cee9]">
                    <i aria-hidden className="mt-[0.62em] size-1.5 rounded-full bg-[color:var(--tint)]" /><span>{point}</span>
                  </li>)}
                </ul>
              </div>}
            </ThreadBubble>
          </ThreadRow>;
        })}

        {result && (() => {
          const expanded = openSection === "timing";
          return <ThreadRow systemKey="fusion" index={10}>
            <ThreadBubble systemKey="fusion" className="[contain-intrinsic-size:420px] [content-visibility:auto]">
              <ThreadSpeaker label="언제, 무엇을" />
              <h3 className="m-0">
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls="fusion-section-timing"
                  onClick={() => toggleSection("timing")}
                  className="flex min-h-11 w-full items-center justify-between gap-3 text-left font-display text-[1.02rem] leading-snug text-[#f7f1ff] transition-colors hover:text-[color:var(--tint)] motion-reduce:transition-none"
                >
                  <span className="min-w-0">{result.timingAndAction.title}</span>
                  <b className="shrink-0 rounded-full border border-white/[0.16] px-3 py-1 text-[0.74rem] font-normal text-white/75">{expanded ? "접기" : "행동 보기"}</b>
                </button>
              </h3>
              {expanded && <div id="fusion-section-timing" className="mt-3 border-t border-white/[0.07] pt-4">
                <p className="m-0 max-w-[72ch] whitespace-pre-wrap font-body text-[1rem] leading-[1.92] text-[#e7dff4] [text-wrap:pretty]">{result.timingAndAction.content}</p>
                {([["이번 흐름에서 해볼 일", result.timingAndAction.luckyActions], ["주의해서 볼 반복 패턴", result.timingAndAction.cautionPatterns]] as const).map(([heading, items]) => (
                  <div key={heading} className="mt-5">
                    <h4 className="m-0 font-display text-[0.92rem] text-[#f0dda8]">{heading}</h4>
                    <ul className="mt-2.5 grid max-w-[72ch] list-none gap-2.5 p-0">
                      {items.map((item) => <li key={item} className="grid grid-cols-[0.375rem_minmax(0,1fr)] items-start gap-3 text-[0.94rem] leading-[1.8] text-[#d8cee9]">
                        <i aria-hidden className="mt-[0.62em] size-1.5 rounded-full bg-[color:var(--tint)]" /><span>{item}</span>
                      </li>)}
                    </ul>
                  </div>
                ))}
              </div>}
            </ThreadBubble>
          </ThreadRow>;
        })()}

        {/* 이 상품이 파는 것은 여섯 해석이 아니라 그들이 만나 남긴 답 하나다 — 대화의 폭을 다 쓴다. */}
        {result?.finalVerdict && <li className="animate-fade-in-up opacity-0 motion-reduce:animate-none motion-reduce:opacity-100" style={{ animationDelay: "660ms" }}>
          <section aria-labelledby="fusion-final-verdict-heading" className="relative overflow-hidden rounded-[1.5rem] border border-[rgba(232,213,163,0.34)] bg-[linear-gradient(160deg,rgba(48,34,80,0.86),rgba(16,12,32,0.95))] px-5 py-6 sm:px-8 sm:py-8">
            <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#e8d5a3,transparent)]" />
            <p className="m-0 font-display text-[0.72rem] uppercase tracking-[0.3em] text-[#e8d5a3]">여섯 체계의 최종 교차 판정</p>
            <h3 id="fusion-final-verdict-heading" className="m-0 mt-3.5 max-w-[28ch] font-display text-[clamp(1.35rem,4vw,2rem)] leading-[1.35] text-[#fbf5ff]">{result.finalVerdict.headline}</h3>
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2.5">
              <span className="text-[0.85rem] text-[#c9bcdd]">체계 간 합의</span>
              <span aria-hidden className="h-1.5 min-w-[8rem] flex-1 overflow-hidden rounded-full bg-white/[0.09]">
                <em className="block h-full origin-left rounded-full bg-[linear-gradient(90deg,#a05cd6,#e8d5a3)] transition-transform duration-700 ease-out motion-reduce:transition-none" style={{ transform: `scaleX(${Math.min(1, Math.max(0, result.finalVerdict.confidence / 100))})` }} />
              </span>
              <b className="font-display text-[1.05rem] text-[#f0dda8]">{result.finalVerdict.confidence}%</b>
            </div>
            <ul className="mt-6 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {result.finalVerdict.systemVerdicts.map((item) => (
                <li key={item.key} data-stance={item.stance} style={tintVars(item.key)} className="relative overflow-hidden rounded-xl border border-white/[0.1] bg-black/25 p-4">
                  <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--tint),transparent)]" />
                  <div className="flex items-center justify-between gap-2">
                    <strong className="font-display text-[0.95rem] text-[#f7f1ff]">{item.label}</strong>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.72rem] ${STANCE_CLASS[item.stance]}`}>{STANCE_LABEL[item.stance]}</span>
                  </div>
                  <p className="m-0 mt-2.5 text-[0.88rem] leading-[1.75] text-[#cfc4e2]">{item.note}</p>
                </li>
              ))}
            </ul>
            <p className="m-0 mt-6 max-w-[72ch] whitespace-pre-wrap font-body text-[0.98rem] leading-[1.9] text-[#e4dbf2] [text-wrap:pretty]">{result.finalVerdict.rationale}</p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {([["지금 할 일", result.finalVerdict.doNow, "text-[#a8e8cb]"], ["지금은 피할 일", result.finalVerdict.avoid, "text-[#f6cadb]"]] as const).map(([heading, items, tone]) => (
                <div key={heading}>
                  <h4 className={`m-0 font-display text-[0.92rem] ${tone}`}>{heading}</h4>
                  <ul className="mt-3 grid list-none gap-2.5 p-0">
                    {items.map((item) => <li key={item} className="rounded-lg border border-white/[0.09] bg-white/[0.03] px-3.5 py-3 text-[0.92rem] leading-[1.75] text-[#ded3ea]">{item}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </li>}

        {result && <ThreadRow systemKey="fusion" index={12}>
          <ThreadBubble systemKey="fusion">
            <ThreadSpeaker label="Fusion Core" />
            <p id="fusion-closing-message" className="m-0 max-w-[72ch] whitespace-pre-wrap font-body text-[1rem] leading-[1.9] text-[#e9e1f5] [text-wrap:pretty]">{result.closingMessage}</p>
          </ThreadBubble>
        </ThreadRow>}

        {failure && <li className="animate-fade-in-up opacity-0 motion-reduce:animate-none motion-reduce:opacity-100">
          <div role="alert" className="relative overflow-hidden rounded-[1.375rem] border border-[rgba(244,190,209,0.34)] bg-[rgba(74,24,47,0.34)] px-5 py-5 sm:px-6">
            <p className="m-0 font-display text-[0.85rem] text-[#f6cadb]">생성이 멈췄어요</p>
            <p className="m-0 mt-2 max-w-[64ch] text-[0.95rem] leading-[1.8] text-[#fbeaf1]">{failure.message}</p>
            {failure.retryable && <button
              type="button"
              onClick={() => formRef.current?.requestSubmit()}
              className="mt-4 min-h-11 rounded-full border border-[rgba(244,190,209,0.45)] bg-[rgba(244,190,209,0.14)] px-5 text-[0.9rem] text-[#fbeaf1] transition-colors hover:bg-[rgba(244,190,209,0.24)] motion-reduce:transition-none"
            >추가 결제 없이 다시 시도하기</button>}
          </div>
        </li>}
      </ol>

      {(loading || result) && <footer className="relative flex flex-wrap gap-3 border-t border-white/[0.07] px-4 py-5 sm:px-9">
        {loading
          ? <button type="button" onClick={cancelGeneration} className="min-h-11 rounded-full border border-white/[0.18] px-5 text-[0.88rem] text-[#cec3e0] transition-colors hover:border-[#c9b5f3] hover:text-[#f7f1ff] motion-reduce:transition-none">분석 중단하기</button>
          : <>
            <button type="button" onClick={() => void share()} className="min-h-11 rounded-full border border-[rgba(232,213,163,0.42)] bg-[rgba(232,213,163,0.12)] px-5 text-[0.9rem] text-[#f6e8b4] transition-colors hover:bg-[rgba(232,213,163,0.2)] motion-reduce:transition-none">개인정보 제외 요약 공유</button>
            <Link href="/#guardian-fortune" className="inline-flex min-h-11 items-center rounded-full border border-white/[0.16] px-5 text-[0.9rem] text-[#ded3ea] transition-colors hover:border-[#c9b5f3] hover:text-[#f7f1ff] motion-reduce:transition-none">오늘의 귀인에게 이어서 묻기</Link>
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
