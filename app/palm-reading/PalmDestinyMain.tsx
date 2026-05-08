"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createDefaultCanonicalPalmReading,
  type PalmAnalysisPurpose,
  type PalmDominantHand,
  type PalmHandRole,
  type PalmUploadedHand,
} from "@/types/palm-reading";
import PalmLineOverlay, {
  type OverlayLineKey,
  type OverlayPathMap,
} from "@/app/palm-reading/PalmLineOverlay";
import palmUiState from "@/lib/palm/palm-ui-state";
import { analyzePalmImageFile } from "@/lib/palm/palm-image-analysis-client";

type HandSide = "left" | "right";
type DominantHand = PalmDominantHand;
type HandRole = PalmHandRole;
type AnalysisPurpose = PalmAnalysisPurpose;
type PalmCardKey =
  | "lifeLine"
  | "headLine"
  | "heartLine"
  | "fateLine"
  | "sunLine"
  | "moneyLine"
  | "marriageLine"
  | "mounts";

type HandImageState = {
  file: File | null;
  previewUrl: string | null;
};

type HandRoleResult = {
  leftHandRole: HandRole;
  rightHandRole: HandRole;
};

type PalmInterpretationCard = {
  key: PalmCardKey;
  title: string;
  oneLiner: string;
  details: string[];
  strengths: string[];
  cautions: string[];
  todayAdvice: string;
  sevenDayPractice: string;
  emphasisScore?: number;
};

type PalmInterpretationPayload = {
  generatedAt: string;
  analysisPurpose: AnalysisPurpose;
  tone: string;
  focusSummary: string;
  cards: PalmInterpretationCard[];
};

type AnalysisResultState = {
  canonical: ReturnType<typeof createDefaultCanonicalPalmReading>;
  interpretation: PalmInterpretationPayload | null;
  overlayPaths: OverlayPathMap;
  overlayPathsBySide: {
    left: OverlayPathMap | null;
    right: OverlayPathMap | null;
  };
  recognitionData: Record<string, unknown> | null;
  resultSections: Array<{ key: string; title: string; content: string }>;
  raw: unknown;
};

const {
  getPalmHandRoles,
  canStartPalmAnalysis,
  mapPalmAnalyzeError,
  shouldShowPalmResult,
  revokeObjectUrls,
} = palmUiState as {
  getPalmHandRoles: (dominantHand: DominantHand | "") => HandRoleResult;
  canStartPalmAnalysis: (input: {
    leftFile: File | null;
    rightFile: File | null;
    dominantHand: DominantHand | "";
    analysisPurpose: AnalysisPurpose | "";
    isSubmitting: boolean;
  }) => boolean;
  mapPalmAnalyzeError: (input: { status: number; code: string; message: string }) => string;
  shouldShowPalmResult: (canonicalPalmReading: unknown) => boolean;
  revokeObjectUrls: (urls: Array<string | null | undefined>, revokeFn?: (url: string) => void) => number;
};

const HAND_ROLE_META: Record<HandRole, { label: string; description: string }> = {
  innate: {
    label: "선천적 손",
    description: "타고난 기질과 잠재력을 보여주는 손",
  },
  acquired: {
    label: "후천적 손",
    description: "현재의 성향과 살아온 흐름을 보여주는 손",
  },
  mixed: {
    label: "mixed",
    description: "선천성과 후천성이 함께 반영된 손",
  },
  unknown: {
    label: "미확정",
    description: "주로 쓰는 손 선택 후 판별됩니다.",
  },
};

const PURPOSE_OPTIONS: Array<{ value: AnalysisPurpose; label: string }> = [
  { value: "general", label: "전체 운세" },
  { value: "love", label: "연애운" },
  { value: "wealth", label: "재물운" },
  { value: "career", label: "직업운" },
  { value: "personality", label: "성격 분석" },
  { value: "relationship", label: "관계 패턴" },
];

const DOMINANT_HAND_OPTIONS: Array<{ value: DominantHand; label: string }> = [
  { value: "right", label: "오른손" },
  { value: "left", label: "왼손" },
  { value: "both", label: "양손" },
];

const SHOOTING_GUIDES = [
  "손바닥 전체가 보이게 촬영해 주세요.",
  "손가락을 자연스럽게 펼쳐 주세요.",
  "그림자가 너무 진하지 않게 밝은 곳에서 촬영해 주세요.",
  "손바닥이 화면 중앙에 오도록 촬영해 주세요.",
  "손등이 아니라 손바닥을 촬영해 주세요.",
  "손금이 흐릿하면 다시 촬영해 주세요.",
];

const LOADING_PHASES = ["생명선 분석 중", "감정선 분석 중", "두뇌선 분석 중", "운명선 분석 중"];

const CARD_KEY_TO_LABEL: Record<PalmCardKey, string> = {
  lifeLine: "생명선",
  headLine: "두뇌선",
  heartLine: "감정선",
  fateLine: "운명선",
  sunLine: "태양선",
  moneyLine: "재물선",
  marriageLine: "결혼선",
  mounts: "손바닥 구丘",
};

const LINE_TO_CARD_KEY: Record<OverlayLineKey, PalmCardKey> = {
  lifeLine: "lifeLine",
  headLine: "headLine",
  heartLine: "heartLine",
  fateLine: "fateLine",
};

function normalizeInterpretation(payload: unknown): PalmInterpretationPayload | null {
  if (!payload || typeof payload !== "object") return null;
  const rec = payload as Record<string, unknown>;
  if (!Array.isArray(rec.cards)) return null;

  const cards: PalmInterpretationCard[] = rec.cards
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const key = String(row.key || "") as PalmCardKey;
      if (!(key in CARD_KEY_TO_LABEL)) return null;
      return {
        key,
        title: String(row.title || CARD_KEY_TO_LABEL[key]),
        oneLiner: String(row.oneLiner || ""),
        details: Array.isArray(row.details) ? row.details.map((x) => String(x)) : [],
        strengths: Array.isArray(row.strengths) ? row.strengths.map((x) => String(x)) : [],
        cautions: Array.isArray(row.cautions) ? row.cautions.map((x) => String(x)) : [],
        todayAdvice: String(row.todayAdvice || ""),
        sevenDayPractice: String(row.sevenDayPractice || ""),
        emphasisScore:
          typeof row.emphasisScore === "number" && Number.isFinite(row.emphasisScore)
            ? row.emphasisScore
            : undefined,
      };
    })
    .filter((x): x is PalmInterpretationCard => Boolean(x));

  if (cards.length === 0) return null;

  return {
    generatedAt: String(rec.generatedAt || ""),
    analysisPurpose: (String(rec.analysisPurpose || "general") as AnalysisPurpose),
    tone: String(rec.tone || ""),
    focusSummary: String(rec.focusSummary || ""),
    cards,
  };
}

function readPathValue(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    const path = rec.path ?? rec.svgPath ?? rec.d;
    if (typeof path === "string" && path.trim()) return path.trim();
  }
  return null;
}

function pickPathByAliases(source: Record<string, unknown>, aliases: string[]): string | null {
  for (const alias of aliases) {
    const val = readPathValue(source[alias]);
    if (val) return val;
  }
  return null;
}

function extractOverlayPaths(payload: unknown): OverlayPathMap {
  if (!payload || typeof payload !== "object") return {};
  const rec = payload as Record<string, unknown>;

  const candidateSources = [
    rec.overlayPaths,
    rec.lineCoordinates,
    rec.linePaths,
    (rec.overlay as Record<string, unknown> | undefined)?.linePaths,
    (rec.overlay as Record<string, unknown> | undefined)?.paths,
    (rec.imageQuality as Record<string, unknown> | undefined)?.linePaths,
  ].filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === "object");

  const out: OverlayPathMap = {};

  for (const src of candidateSources) {
    out.lifeLine = out.lifeLine || pickPathByAliases(src, ["lifeLine", "lifeline", "life_line"]);
    out.headLine = out.headLine || pickPathByAliases(src, ["headLine", "headline", "head_line"]);
    out.heartLine = out.heartLine || pickPathByAliases(src, ["heartLine", "heartline", "heart_line"]);
    out.fateLine = out.fateLine || pickPathByAliases(src, ["fateLine", "fateline", "fate_line"]);
  }

  return out;
}

function extractOverlayPathsBySide(payload: unknown): { left: OverlayPathMap | null; right: OverlayPathMap | null } {
  if (!payload || typeof payload !== "object") {
    return { left: null, right: null };
  }

  const rec = payload as Record<string, unknown>;
  const map = rec.overlayPathsBySide;
  if (!map || typeof map !== "object") {
    return { left: null, right: null };
  }

  const sideMap = map as Record<string, unknown>;
  return {
    left: extractOverlayPaths(sideMap.left ?? null),
    right: extractOverlayPaths(sideMap.right ?? null),
  };
}

function normalizeResultSections(payload: unknown): Array<{ key: string; title: string; content: string }> {
  if (!Array.isArray(payload)) return [];
  return payload
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const key = String(row.key || "").trim();
      const title = String(row.title || "").trim();
      const content = String(row.content || "").trim();
      if (!key || !title || !content) return null;
      return { key, title, content };
    })
    .filter((x): x is { key: string; title: string; content: string } => Boolean(x));
}

export default function PalmDestinyMain() {
  const router = useRouter();
  const [leftHand, setLeftHand] = useState<HandImageState>({ file: null, previewUrl: null });
  const [rightHand, setRightHand] = useState<HandImageState>({ file: null, previewUrl: null });
  const [dominantHand, setDominantHand] = useState<DominantHand | "">("");
  const [analysisPurpose, setAnalysisPurpose] = useState<AnalysisPurpose | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [loadingPhaseIndex, setLoadingPhaseIndex] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResultState | null>(null);
  const [activeCardKey, setActiveCardKey] = useState<PalmCardKey>("lifeLine");
  const [overlaySide, setOverlaySide] = useState<HandSide>("right");

  const leftUploadInputRef = useRef<HTMLInputElement>(null);
  const leftCameraInputRef = useRef<HTMLInputElement>(null);
  const rightUploadInputRef = useRef<HTMLInputElement>(null);
  const rightCameraInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const cardRefs = useRef<Record<PalmCardKey, HTMLDivElement | null>>({
    lifeLine: null,
    headLine: null,
    heartLine: null,
    fateLine: null,
    sunLine: null,
    moneyLine: null,
    marriageLine: null,
    mounts: null,
  });

  const handRoles = getPalmHandRoles(dominantHand);
  const canStartAnalysis = canStartPalmAnalysis({
    leftFile: leftHand.file,
    rightFile: rightHand.file,
    dominantHand,
    analysisPurpose,
    isSubmitting,
  });

  const interpretationCards = analysisResult?.interpretation?.cards ?? [];
  const mobileFocusedCard = interpretationCards.find((item) => item.key === activeCardKey) ?? interpretationCards[0] ?? null;
  const bothHandsComparison = analysisResult?.canonical.bothHandsComparison;
  const recognitionPrimary = (analysisResult?.recognitionData?.primary as Record<string, unknown> | undefined) || null;
  const recognitionBySide = (analysisResult?.recognitionData?.bySide as Record<string, unknown> | undefined) || null;
  const activeRecognition =
    (recognitionBySide?.[overlaySide] as Record<string, unknown> | undefined) ||
    (recognitionBySide?.left as Record<string, unknown> | undefined) ||
    (recognitionBySide?.right as Record<string, unknown> | undefined) ||
    recognitionPrimary;

  const pickedOverlayImage = overlaySide === "left" ? leftHand.previewUrl : rightHand.previewUrl;
  const overlayImageUrl = pickedOverlayImage || leftHand.previewUrl || rightHand.previewUrl || null;
  const overlayImageAlt =
    overlaySide === "left" ? "왼손 손바닥 오버레이" : overlaySide === "right" ? "오른손 손바닥 오버레이" : "손바닥 오버레이";

  const activeOverlayPaths: OverlayPathMap =
    (analysisResult?.overlayPathsBySide?.[overlaySide] as OverlayPathMap | null) || analysisResult?.overlayPaths || {};

  const hasCoordinatePaths = Boolean(
    analysisResult &&
      (activeOverlayPaths.lifeLine ||
        activeOverlayPaths.headLine ||
        activeOverlayPaths.heartLine ||
        activeOverlayPaths.fateLine),
  );

  const loadingPhaseText = LOADING_PHASES[loadingPhaseIndex] ?? LOADING_PHASES[0];

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      revokeObjectUrls([leftHand.previewUrl, rightHand.previewUrl]);
    };
  }, [leftHand.previewUrl, rightHand.previewUrl]);

  useEffect(() => {
    if (!isSubmitting) {
      setLoadingPhaseIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setLoadingPhaseIndex((prev) => (prev + 1) % LOADING_PHASES.length);
    }, 1300);

    return () => window.clearInterval(timer);
  }, [isSubmitting]);

  const cancelInFlightRequest = () => {
    if (!abortControllerRef.current) return;
    abortControllerRef.current.abort();
    abortControllerRef.current = null;
  };

  const resetAnalysisState = () => {
    setAnalysisResult(null);
    setSubmitMessage("");
    setIsSubmitting(false);
    setLoadingPhaseIndex(0);
    setActiveCardKey("lifeLine");
    setOverlaySide("right");
  };

  const resetSessionForReanalysis = (options?: {
    clearImages?: boolean;
    resetSelections?: boolean;
    keepMessage?: string;
  }) => {
    cancelInFlightRequest();
    requestIdRef.current += 1;

    const clearImages = Boolean(options?.clearImages);
    const resetSelections = Boolean(options?.resetSelections);

    if (clearImages) {
      revokeObjectUrls([leftHand.previewUrl, rightHand.previewUrl]);
      setLeftHand({ file: null, previewUrl: null });
      setRightHand({ file: null, previewUrl: null });
    }

    if (resetSelections) {
      setDominantHand("");
      setAnalysisPurpose("");
    }

    resetAnalysisState();
    if (typeof options?.keepMessage === "string") {
      setSubmitMessage(options.keepMessage);
    }
  };

  const setHandImage = (side: HandSide, file: File | null) => {
    const prevUrl = side === "left" ? leftHand.previewUrl : rightHand.previewUrl;
    if (prevUrl) {
      revokeObjectUrls([prevUrl]);
    }

    const nextState: HandImageState = file
      ? {
          file,
          previewUrl: URL.createObjectURL(file),
        }
      : {
          file: null,
          previewUrl: null,
        };

    if (side === "left") {
      setLeftHand(nextState);
      return;
    }

    setRightHand(nextState);
  };

  const handleFileChange = (side: HandSide, event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = "";

    if (!picked) return;
    if (!picked.type.startsWith("image/")) return;

    resetAnalysisState();
    setHandImage(side, picked);
  };

  const clearHandImage = (side: HandSide) => {
    resetAnalysisState();
    setHandImage(side, null);

    if (side === "left" && overlaySide === "left") {
      setOverlaySide("right");
    }
    if (side === "right" && overlaySide === "right") {
      setOverlaySide("left");
    }
  };

  const setCardRef = (key: PalmCardKey) => (node: HTMLDivElement | null) => {
    cardRefs.current[key] = node;
  };

  const scrollToCard = (key: PalmCardKey) => {
    setActiveCardKey(key);
    const node = cardRefs.current[key];
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleOverlayLineSelect = (line: OverlayLineKey) => {
    const targetCard = LINE_TO_CARD_KEY[line];
    scrollToCard(targetCard);
  };

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(new Error("이미지 인코딩에 실패했습니다."));
      reader.readAsDataURL(file);
    });

  const handleStartAnalysis = async () => {
    if (!canStartAnalysis) return;

    cancelInFlightRequest();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    try {
      setIsSubmitting(true);
      setAnalysisResult(null);
      setSubmitMessage("손바닥의 금빛 선을 읽고 있습니다...");

      const leftPalmImage = leftHand.file ? await fileToDataUrl(leftHand.file) : null;
      const rightPalmImage = rightHand.file ? await fileToDataUrl(rightHand.file) : null;

      const [leftVision, rightVision] = await Promise.all([
        leftHand.file
          ? analyzePalmImageFile(leftHand.file, { declaredHandSide: "left" }).catch(() => null)
          : Promise.resolve(null),
        rightHand.file
          ? analyzePalmImageFile(rightHand.file, { declaredHandSide: "right" }).catch(() => null)
          : Promise.resolve(null),
      ]);

      const response = await fetch("/api/palm/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          leftPalmImage,
          rightPalmImage,
          leftHandLandmarks: leftVision?.handLandmarks ?? null,
          rightHandLandmarks: rightVision?.handLandmarks ?? null,
          leftLineCandidates: leftVision?.lineCandidates ?? [],
          rightLineCandidates: rightVision?.lineCandidates ?? [],
          leftImageQuality: leftVision?.imageQuality ?? null,
          rightImageQuality: rightVision?.imageQuality ?? null,
          dominantHand,
          analysisPurpose,
        }),
      });

      if (requestIdRef.current !== requestId) {
        return;
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const code = typeof data?.code === "string" ? data.code : "UNKNOWN_ERROR";
        const message = typeof data?.error === "string" ? data.error : "분석 중 오류가 발생했습니다.";
        setSubmitMessage(mapPalmAnalyzeError({ status: response.status, code, message }));
        return;
      }

      const canonical = createDefaultCanonicalPalmReading({
        dominantHand: data?.profile?.dominantHand ?? dominantHand,
        analysisPurpose: data?.profile?.analysisPurpose ?? analysisPurpose,
        uploadedHands: data?.handContext?.uploadedHands ?? [],
        leftHandRole: data?.handContext?.leftHandRole ?? handRoles.leftHandRole,
        rightHandRole: data?.handContext?.rightHandRole ?? handRoles.rightHandRole,
        imageQuality: data?.imageQuality,
        leftHandReading: data?.leftHandReading ?? null,
        rightHandReading: data?.rightHandReading ?? null,
        comparison: data?.bothHandsComparison,
      });

      const interpretation = normalizeInterpretation(data?.interpretation);
      const overlayPaths = extractOverlayPaths(data?.overlayPaths ?? data);
      const overlayPathsBySide = extractOverlayPathsBySide(data);
      const recognitionData =
        data?.recognitionData && typeof data.recognitionData === "object"
          ? (data.recognitionData as Record<string, unknown>)
          : null;
      const resultSections = normalizeResultSections(data?.resultSections);

      if (!shouldShowPalmResult(canonical)) {
        setAnalysisResult(null);
        setSubmitMessage("손바닥 인식 실패: 손바닥이 분명하게 보이는 사진으로 다시 촬영해 주세요.");
        return;
      }

      setAnalysisResult({
        canonical,
        interpretation,
        overlayPaths,
        overlayPathsBySide,
        recognitionData,
        resultSections,
        raw: data,
      });

      const firstKey = interpretation?.cards?.[0]?.key;
      if (firstKey && firstKey in CARD_KEY_TO_LABEL) {
        setActiveCardKey(firstKey as PalmCardKey);
      } else {
        setActiveCardKey("lifeLine");
      }

      if (rightHand.previewUrl && (dominantHand === "right" || !leftHand.previewUrl)) {
        setOverlaySide("right");
      } else if (leftHand.previewUrl) {
        setOverlaySide("left");
      }

      setSubmitMessage(
        `분석 완료: reportType=${canonical.reportType}, hasPalm=${String(canonical.validation.hasPalm)}, hasEnoughQuality=${String(canonical.validation.hasEnoughQuality)}, 보수적으로 해석합니다.`,
      );
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      if (error instanceof DOMException && error.name === "AbortError") {
        setSubmitMessage("요청이 취소되었습니다. 다시 분석을 시도해 주세요.");
        return;
      }

      setSubmitMessage(`분석 실패 (500): ${error instanceof Error ? error.message : "unknown"}`);
    } finally {
      if (requestIdRef.current === requestId) {
        setIsSubmitting(false);
      }
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  };

  const handlePhotoReselect = () => {
    resetSessionForReanalysis({
      clearImages: true,
      resetSelections: false,
      keepMessage: "사진을 다시 선택해 손금 분석을 재시작할 수 있습니다.",
    });
  };

  const handleRetryWithOtherHand = () => {
    resetSessionForReanalysis({
      clearImages: false,
      resetSelections: true,
      keepMessage: "다른 손 기준으로 다시 보기 위해 주로 쓰는 손과 목적을 다시 선택해 주세요.",
    });
  };

  const handleBackToMain = () => {
    resetSessionForReanalysis({ clearImages: true, resetSelections: true });
    router.push("/");
  };

  const handleResetOnlyResult = () => {
    resetSessionForReanalysis({
      clearImages: false,
      resetSelections: false,
      keepMessage: "이전 분석 결과를 초기화했습니다. 같은 입력으로 다시 분석할 수 있습니다.",
    });
  };

  const renderInterpretationCard = (card: PalmInterpretationCard, compactMobile = false) => {
    const cardId = `palm-card-${card.key}`;
    const active = activeCardKey === card.key;

    return (
      <article
        key={card.key}
        id={cardId}
        ref={setCardRef(card.key)}
        className={`cd-ink-card cd-hanji cd-seal cd-fade-in rounded-2xl border p-4 md:p-5 ${
          active
            ? "border-[#e2c97e]/60 bg-[linear-gradient(145deg,rgba(28,21,17,0.9),rgba(15,23,35,0.9))]"
            : "border-[#d8bf72]/30 bg-[linear-gradient(145deg,rgba(13,21,34,0.86),rgba(23,18,16,0.84))]"
        }`}
      >
        <header className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-black text-[#f5dfa4] md:text-base">{card.title}</h4>
          <button
            type="button"
            onClick={() => setActiveCardKey(card.key)}
            className="cd-gold-btn rounded-md border border-[#d8bf72]/35 bg-[#132033] px-2 py-1 text-[11px] font-bold text-[#f8e8bf]"
          >
            선택
          </button>
        </header>

        <p className="mt-2 rounded-lg border border-[#b73232]/35 bg-[#2f1313]/55 px-3 py-2 text-sm font-semibold leading-6 text-[#ffe3c5]">
          {card.oneLiner}
        </p>

        <section className="mt-3">
          <h5 className="text-xs font-black tracking-[0.08em] text-[#e8d498] md:text-sm">상세 해석</h5>
          <ul className="mt-2 space-y-2 text-xs leading-6 text-[#f7edd0]/90 md:text-sm">
            {card.details.slice(0, 8).map((line, index) => (
              <li key={`${card.key}-detail-${index}`} className="rounded-lg border border-[#d8bf72]/22 bg-[#101a28]/60 px-3 py-2">
                {line}
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <section>
            <h5 className="text-xs font-black tracking-[0.08em] text-[#e8d498] md:text-sm">장점 3개</h5>
            <ul className="mt-2 space-y-1 text-xs leading-6 text-[#f7edd0]/90 md:text-sm">
              {card.strengths.slice(0, 3).map((line, index) => (
                <li key={`${card.key}-strength-${index}`} className="rounded-lg border border-[#8aa84f]/25 bg-[#132412]/55 px-3 py-2">
                  {line}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h5 className="text-xs font-black tracking-[0.08em] text-[#e8d498] md:text-sm">주의점 3개</h5>
            <ul className="mt-2 space-y-1 text-xs leading-6 text-[#f7edd0]/90 md:text-sm">
              {card.cautions.slice(0, 3).map((line, index) => (
                <li key={`${card.key}-caution-${index}`} className="rounded-lg border border-[#bf6f6f]/25 bg-[#2a1414]/55 px-3 py-2">
                  {line}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="mt-3 space-y-2">
          <div className="rounded-lg border border-[#d8bf72]/25 bg-[#141e2d]/65 px-3 py-2">
            <h5 className="text-xs font-black tracking-[0.08em] text-[#efdca5] md:text-sm">오늘의 조언</h5>
            <p className="mt-1 text-xs leading-6 text-[#f8eed1]/90 md:text-sm">{card.todayAdvice}</p>
          </div>
          <div className="rounded-lg border border-[#d8bf72]/25 bg-[#1c1727]/65 px-3 py-2">
            <h5 className="text-xs font-black tracking-[0.08em] text-[#efdca5] md:text-sm">7일 실천법</h5>
            <p className="mt-1 text-xs leading-6 text-[#f8eed1]/90 md:text-sm">{card.sevenDayPractice}</p>
          </div>
        </section>

        {compactMobile ? null : (
          <p className="mt-3 text-[11px] text-[#f6ebc7]/70 md:text-xs">카드 키: {card.key}</p>
        )}
      </article>
    );
  };

  const renderHandUploader = (
    side: HandSide,
    state: HandImageState,
    uploadRef: React.RefObject<HTMLInputElement | null>,
    cameraRef: React.RefObject<HTMLInputElement | null>,
    title: string,
  ) => {
    const hasPreview = Boolean(state.previewUrl);
    const handName = side === "left" ? "왼손" : "오른손";
    const role = side === "left" ? handRoles.leftHandRole : handRoles.rightHandRole;
    const roleMeta = HAND_ROLE_META[role];

    return (
      <section className="cd-ink-card cd-hanji cd-seal rounded-2xl border border-[#d8bf72]/45 bg-[linear-gradient(145deg,rgba(11,16,26,0.92),rgba(22,16,17,0.9))] p-4 md:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-extrabold text-[#f4de9f] md:text-lg">{title}</h2>
          <span className="rounded-full border border-[#a71b1b]/65 bg-[#4a1212]/70 px-2 py-1 text-[11px] font-bold text-[#ffd8d8]">
            손바닥 입력
          </span>
        </div>

        <p className="mt-2 text-xs leading-6 text-[#f8efcf]/80 md:text-sm">
          손바닥이 선명하게 보이는 사진을 업로드하거나 촬영해 주세요.
        </p>

        {hasPreview ? (
          <div className="mt-3 rounded-lg border border-[#d9c27d]/45 bg-[#101a28]/80 px-3 py-2">
            <p className="text-xs font-bold text-[#ffe3ab] md:text-sm">
              {handName} · {roleMeta.label}
            </p>
            <p className="mt-1 text-xs text-[#f7edcd]/80">{roleMeta.description}</p>
          </div>
        ) : null}

        <div className="mt-4 overflow-hidden rounded-xl border border-[#d8bf72]/45 bg-[#080d16]">
          <div className="relative flex min-h-[220px] items-center justify-center bg-[radial-gradient(circle_at_72%_16%,rgba(239,219,154,0.18),transparent_38%),radial-gradient(circle_at_24%_84%,rgba(160,22,22,0.2),transparent_42%),linear-gradient(140deg,#05080f_0%,#0d1522_58%,#1f110f_100%)] px-4 py-6">
            {hasPreview ? (
              <img
                src={state.previewUrl ?? ""}
                alt={`${title} 미리보기`}
                className="max-h-[300px] w-full rounded-lg border border-[#e5cc8a]/45 object-contain"
              />
            ) : (
              <div className="text-center text-[#f4dfaa]">
                <p className="text-4xl">🖐</p>
                <p className="mt-2 text-sm font-bold md:text-base">{title} 이미지 미리보기</p>
                <p className="mt-1 text-xs text-[#f4dfaa]/80 md:text-sm">업로드 후 이 영역에 표시됩니다.</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 md:gap-3">
          <button
            type="button"
            onClick={() => uploadRef.current?.click()}
            className="cd-gold-btn min-h-[44px] rounded-lg border border-[#d9c27d]/45 bg-[#1a2231] px-3 py-2 text-sm font-bold text-[#f5e2ad] transition"
          >
            이미지 업로드
          </button>
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="cd-gold-btn min-h-[44px] rounded-lg border border-[#d9c27d]/45 bg-[#2b1c1b] px-3 py-2 text-sm font-bold text-[#ffdfb2] transition"
          >
            실시간 촬영
          </button>
          <button
            type="button"
            onClick={() => clearHandImage(side)}
            className="cd-cta-btn min-h-[44px] rounded-lg border border-[#c6975e]/70 bg-[linear-gradient(136deg,rgba(126,25,25,0.94),rgba(92,47,23,0.92))] px-3 py-2 text-sm font-bold text-[#ffe2ce] transition"
          >
            이미지 삭제
          </button>
          <button
            type="button"
            onClick={() => uploadRef.current?.click()}
            className="cd-gold-btn min-h-[44px] rounded-lg border border-[#c0a45f]/55 bg-[#2e2618] px-3 py-2 text-sm font-bold text-[#ffe7b7] transition"
          >
            다시 선택
          </button>
        </div>

        <input
          ref={uploadRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => handleFileChange(side, event)}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => handleFileChange(side, event)}
        />
      </section>
    );
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#06080f] text-[#f8edc8]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 78% 18%, rgba(245, 231, 169, 0.23), transparent 28%), radial-gradient(circle at 18% 82%, rgba(126, 34, 34, 0.2), transparent 34%), linear-gradient(150deg, #05070d 0%, #07101a 52%, #05070d 100%)",
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          backgroundImage:
            "radial-gradient(circle at 14% 26%, rgba(236, 214, 140, 0.38) 0 1px, transparent 2px), radial-gradient(circle at 77% 31%, rgba(236, 214, 140, 0.26) 0 1px, transparent 2px), radial-gradient(circle at 52% 72%, rgba(236, 214, 140, 0.24) 0 1px, transparent 2px), radial-gradient(circle at 34% 58%, rgba(236, 214, 140, 0.2) 0 1px, transparent 2px)",
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(112deg, rgba(230, 212, 148, 0.24) 0, rgba(230, 212, 148, 0.24) 1px, transparent 1px, transparent 24px), repeating-linear-gradient(22deg, rgba(190, 24, 24, 0.24) 0, rgba(190, 24, 24, 0.24) 1px, transparent 1px, transparent 30px)",
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(circle at 84% 16%, rgba(255, 246, 214, 0.22), rgba(239, 222, 154, 0.09) 20%, transparent 35%), radial-gradient(circle at 84% 16%, rgba(241, 223, 164, 0.16) 0, transparent 24%), radial-gradient(circle at 78% 23%, rgba(225, 214, 182, 0.1) 0, transparent 42%)",
          filter: "blur(2px)",
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.11]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 72% 18%, rgba(238, 220, 158, 0.45) 0 1px, transparent 1.5px), radial-gradient(circle at 66% 24%, rgba(238, 220, 158, 0.36) 0 1px, transparent 1.5px), radial-gradient(circle at 70% 20%, rgba(238, 220, 158, 0.25) 0 1px, transparent 2px), linear-gradient(115deg, transparent 0%, rgba(232, 206, 128, 0.2) 49.7%, transparent 50.3%, transparent 100%), linear-gradient(25deg, transparent 0%, rgba(232, 206, 128, 0.15) 49.7%, transparent 50.3%, transparent 100%)",
        }}
      />

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-10 md:px-8">
        <article className="cd-ink-card cd-hanji relative w-full overflow-hidden rounded-[28px] border border-[#d7bc69]/45 bg-[linear-gradient(148deg,rgba(15,22,34,0.9),rgba(18,18,17,0.92)_40%,rgba(27,17,14,0.9)_100%)] shadow-[0_28px_72px_rgba(0,0,0,0.55)]">
          <div className="relative border-b border-[#d7bc69]/30 px-5 py-8 md:px-10 md:py-10">
            <div
              aria-hidden
              className="absolute -right-8 -top-8 h-28 w-28 rounded-full border border-[#dbc16f]/35 bg-[radial-gradient(circle,rgba(248,233,176,0.3)_0%,rgba(248,233,176,0.05)_54%,transparent_72%)]"
            />
            <span className="inline-flex items-center rounded-full border border-[#a11717]/70 bg-[#3f0d0d]/70 px-3 py-1 text-xs font-bold tracking-[0.18em] text-[#ffdbdb]">
              PALM DESTINY
            </span>
            <h1
              className="mt-4 text-4xl font-black leading-tight md:text-5xl"
              style={{
                fontFamily: "'Noto Serif KR', 'Nanum Myeongjo', serif",
                textShadow: "0 0 18px rgba(212, 181, 92, 0.24)",
              }}
            >
              손금 지도
            </h1>
            <p className="mt-3 text-sm font-semibold tracking-[0.03em] text-[#f5df9f] md:text-base">선천의 결, 후천의 흐름</p>
            <p className="mt-3 text-base font-semibold text-[#edd99a] md:text-lg">
              손바닥에 새겨진 사랑, 재물, 직업, 마음의 흐름을 읽다
            </p>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-[#f7efd8]/90 md:text-base">
              손금은 수명이나 질병을 단정하는 도구가 아니라, 성향·관계·재물·직업 흐름을 상징적으로 읽는 지도입니다.
            </p>
            <p className="mt-2 max-w-3xl text-xs leading-6 text-[#f8eed1]/85 md:text-sm">
              타고난 손과 살아온 손을 함께 읽습니다. 손바닥에는 본래의 기질과 지금의 발자취가 함께 새겨집니다.
            </p>
          </div>

          <div className="relative space-y-5 px-5 py-7 md:px-10 md:py-9">
            <section className="cd-ink-card cd-hanji cd-seal rounded-2xl border border-[#d8bf72]/45 bg-[linear-gradient(145deg,rgba(12,19,30,0.92),rgba(30,18,16,0.9))] p-4 md:p-6">
              <h2 className="text-base font-black text-[#f4de9f] md:text-lg">업로드 안내</h2>
              <p className="mt-2 text-sm leading-7 text-[#f6ecc8]/90">
                왼손, 오른손 또는 양손 손바닥 이미지를 업로드하거나 카메라로 촬영해 주세요.
              </p>
            </section>

            <div className="grid gap-4 md:grid-cols-2 md:gap-5">
              {renderHandUploader("left", leftHand, leftUploadInputRef, leftCameraInputRef, "왼손 이미지 업로드")}
              {renderHandUploader("right", rightHand, rightUploadInputRef, rightCameraInputRef, "오른손 이미지 업로드")}
            </div>

            <section className="cd-ink-card cd-hanji cd-seal rounded-2xl border border-[#d8bf72]/45 bg-[linear-gradient(145deg,rgba(13,19,30,0.94),rgba(27,16,15,0.93))] p-4 md:p-6">
              <h2 className="text-base font-black text-[#f4de9f] md:text-lg">선천/후천 설명</h2>
              <div className="mt-3 rounded-xl border border-[#b52a2a]/50 bg-[#2f1111]/70 p-4 text-sm leading-7 text-[#ffe9cc]">
                <p>손금에서는 자주 쓰는 손을 후천적 손, 자주 쓰지 않는 손을 선천적 손으로 읽습니다.</p>
                <p className="mt-2">후천적 손은 현재의 성향과 삶의 흐름을, 선천적 손은 타고난 기질과 잠재력을 보여줍니다.</p>
                <p className="mt-2 text-[#fff0d4]">선천의 결, 후천의 흐름을 함께 읽어 현실적인 방향을 제안합니다.</p>
              </div>
            </section>

            <section className="cd-ink-card cd-hanji cd-seal rounded-2xl border border-[#d8bf72]/45 bg-[linear-gradient(145deg,rgba(13,20,31,0.94),rgba(23,18,15,0.94))] p-4 md:p-6">
              <fieldset>
                <legend className="text-base font-black text-[#f4de9f] md:text-lg">주로 쓰는 손 선택</legend>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {DOMINANT_HAND_OPTIONS.map((option) => {
                    const active = dominantHand === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setDominantHand(option.value);
                          setSubmitMessage("");
                        }}
                        className={`cd-gold-btn min-h-[44px] rounded-lg border px-3 py-2 text-sm font-bold transition-all ${
                          active
                            ? "border-[#f1d282] bg-[#4d3418] text-[#ffe8b8] shadow-[inset_0_-2px_0_rgba(250,224,140,0.7)]"
                            : "border-[#d8bf72]/45 bg-[#121b2a] text-[#f4e6bf]"
                        }`}
                        aria-pressed={active}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="mt-5">
                <legend className="text-base font-black text-[#f4de9f] md:text-lg">분석 목적 선택</legend>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {PURPOSE_OPTIONS.map((option) => {
                    const active = analysisPurpose === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setAnalysisPurpose(option.value);
                          setSubmitMessage("");
                        }}
                        className={`cd-gold-btn min-h-[44px] rounded-lg border px-3 py-2 text-sm font-bold transition-all ${
                          active
                            ? "border-[#f1d282] bg-[#5a1f1f] text-[#ffe6c8] shadow-[inset_0_-2px_0_rgba(250,224,140,0.7)]"
                            : "border-[#d8bf72]/45 bg-[#141d2c] text-[#f4e6bf]"
                        }`}
                        aria-pressed={active}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </section>

            <section className="cd-ink-card cd-hanji cd-seal rounded-2xl border border-[#d8bf72]/45 bg-[linear-gradient(145deg,rgba(12,18,30,0.94),rgba(23,16,14,0.94))] p-4 md:p-6">
              <h2 className="text-base font-black text-[#f4de9f] md:text-lg">촬영 가이드</h2>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-[#f7edcd]/90">
                {SHOOTING_GUIDES.map((guide) => (
                  <li key={guide} className="rounded-lg border border-[#d8bf72]/25 bg-[#0f1624]/70 px-3 py-2">
                    {guide}
                  </li>
                ))}
              </ul>
            </section>

            <section className="cd-ink-card cd-hanji cd-seal rounded-2xl border border-[#d8bf72]/45 bg-[linear-gradient(145deg,rgba(12,18,30,0.92),rgba(28,18,15,0.92))] p-4 md:p-6">
              <button
                type="button"
                onClick={handleStartAnalysis}
                disabled={!canStartAnalysis}
                aria-disabled={!canStartAnalysis}
                className={`cd-cta-btn inline-flex min-h-[50px] w-full items-center justify-center rounded-xl border px-4 py-3 text-sm font-black md:text-base ${
                  canStartAnalysis
                    ? "border-[#e0c774]/75 bg-[linear-gradient(136deg,rgba(125,24,24,0.96),rgba(111,67,28,0.94)_46%,rgba(86,40,21,0.96))] text-[#fff1c9] shadow-[0_10px_26px_rgba(0,0,0,0.35)]"
                    : "cursor-not-allowed border-[#d0b465]/35 bg-[linear-gradient(135deg,rgba(118,93,33,0.5),rgba(60,47,22,0.62))] text-[#f8e8b5] opacity-65"
                }`}
              >
                {isSubmitting ? "손금 분석 진행 중..." : "손바닥 운명 지도 열기"}
              </button>

              <p className="mt-3 text-xs leading-6 text-[#f7edcd]/75 md:text-sm">
                활성 조건: 왼손 또는 오른손 이미지 1개 이상 + 주로 쓰는 손 선택 + 분석 목적 선택
              </p>

              {(leftHand.file || rightHand.file) && dominantHand ? (
                <div className="mt-3 rounded-lg border border-[#d9c27d]/40 bg-[#101a29]/70 px-3 py-2 text-xs text-[#f7edcd]/90 md:text-sm">
                  <p>왼손 역할: {HAND_ROLE_META[handRoles.leftHandRole].label}</p>
                  <p className="mt-1">오른손 역할: {HAND_ROLE_META[handRoles.rightHandRole].label}</p>
                </div>
              ) : null}

              {submitMessage ? (
                <p className="mt-3 rounded-lg border border-[#b52a2a]/55 bg-[#351515]/70 px-3 py-2 text-xs leading-6 text-[#ffdede] md:text-sm">
                  {submitMessage}
                </p>
              ) : null}

              {isSubmitting ? (
                <div className="mt-3 rounded-lg border border-[#d9c27d]/40 bg-[#101a29]/75 px-3 py-3 text-xs text-[#f7edcd]/92 md:text-sm">
                  <p className="font-bold text-[#ffe6b5]">손바닥의 금빛 선을 읽고 있습니다...</p>
                  <p className="mt-1 text-[#f9efcf]">{loadingPhaseText}</p>
                </div>
              ) : null}

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handlePhotoReselect}
                  className="cd-gold-btn min-h-[44px] rounded-lg border border-[#d9c27d]/45 bg-[#1a2231] px-3 py-2 text-sm font-bold text-[#f5e2ad]"
                >
                  사진 다시 선택
                </button>
                <button
                  type="button"
                  onClick={handleResetOnlyResult}
                  className="cd-gold-btn min-h-[44px] rounded-lg border border-[#d9c27d]/45 bg-[#171f2e] px-3 py-2 text-sm font-bold text-[#f5e2ad]"
                >
                  다시 분석
                </button>
              </div>
            </section>

            {analysisResult ? (
              <section className="cd-ink-card cd-hanji cd-seal rounded-2xl border border-[#d8bf72]/45 bg-[linear-gradient(145deg,rgba(12,19,31,0.95),rgba(26,17,15,0.93))] p-4 md:p-6">
                <div className="mb-4 flex flex-col gap-3 border-b border-[#d8bf72]/25 pb-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-base font-black text-[#f4de9f] md:text-lg">손금 결과 오버레이</h2>
                    <p className="mt-1 text-xs text-[#f9edcb]/85">선천의 결, 후천의 흐름을 한 화면에서 비교합니다.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#d8bf72]/35 bg-[#101a2b]/75 px-2 py-1 text-[11px] font-bold text-[#ffe7b3]">
                      {hasCoordinatePaths ? "좌표 기반 + 일부 보정" : "상징적 안내 오버레이"}
                    </span>
                    <button
                      type="button"
                      onClick={handleRetryWithOtherHand}
                      className="cd-gold-btn min-h-[40px] rounded-lg border border-[#d9c27d]/45 bg-[#1a2231] px-3 py-2 text-xs font-bold text-[#f5e2ad]"
                    >
                      다른 손으로 다시 보기
                    </button>
                    <button
                      type="button"
                      onClick={handleBackToMain}
                      className="cd-cta-btn min-h-[40px] rounded-lg border border-[#c6975e]/70 bg-[linear-gradient(136deg,rgba(126,25,25,0.94),rgba(92,47,23,0.92))] px-3 py-2 text-xs font-bold text-[#ffe2ce]"
                    >
                      메인으로 돌아가기
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[minmax(300px,420px)_1fr] md:gap-6">
                  <aside className="md:sticky md:top-6 md:self-start">
                    {leftHand.previewUrl && rightHand.previewUrl ? (
                      <div className="mb-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setOverlaySide("left")}
                          className={`cd-gold-btn min-h-[44px] rounded-lg border px-3 py-2 text-xs font-bold md:text-sm ${
                            overlaySide === "left"
                              ? "border-[#e5cb80]/65 bg-[#3b2a1d] text-[#ffe8bc] shadow-[inset_0_-2px_0_rgba(250,224,140,0.65)]"
                              : "border-[#d8bf72]/30 bg-[#111b2a] text-[#f4e6bf]"
                          }`}
                        >
                          왼손 보기
                        </button>
                        <button
                          type="button"
                          onClick={() => setOverlaySide("right")}
                          className={`cd-gold-btn min-h-[44px] rounded-lg border px-3 py-2 text-xs font-bold md:text-sm ${
                            overlaySide === "right"
                              ? "border-[#e5cb80]/65 bg-[#3b2a1d] text-[#ffe8bc] shadow-[inset_0_-2px_0_rgba(250,224,140,0.65)]"
                              : "border-[#d8bf72]/30 bg-[#111b2a] text-[#f4e6bf]"
                          }`}
                        >
                          오른손 보기
                        </button>
                      </div>
                    ) : null}

                    <PalmLineOverlay
                      imageUrl={overlayImageUrl}
                      imageAlt={overlayImageAlt}
                      pathMap={activeOverlayPaths}
                      activeLine={activeCardKey in LINE_TO_CARD_KEY ? (activeCardKey as OverlayLineKey) : null}
                      onSelectLine={handleOverlayLineSelect}
                    />
                  </aside>

                  <div className="space-y-4">
                    {analysisResult.interpretation?.focusSummary ? (
                      <section className="cd-ink-card cd-hanji rounded-xl border border-[#d8bf72]/30 bg-[#111b2a]/70 px-4 py-3">
                        <h3 className="text-sm font-black text-[#f3de9f] md:text-base">해석 중심</h3>
                        <p className="mt-2 text-xs leading-6 text-[#f8eed2]/90 md:text-sm">
                          {analysisResult.interpretation.focusSummary}
                        </p>
                      </section>
                    ) : null}

                    {bothHandsComparison ? (
                      <section className="cd-ink-card cd-hanji rounded-xl border border-[#d8bf72]/30 bg-[#151422]/75 p-4">
                        <h3 className="text-sm font-black text-[#f3de9f] md:text-base">선천/후천 비교 요약</h3>
                        <p className="mt-1 text-xs leading-6 text-[#f9efcf]/85 md:text-sm">타고난 손과 살아온 손을 함께 읽습니다.</p>
                        <div className="mt-3 space-y-2 text-xs leading-6 text-[#f8eed2]/90 md:text-sm">
                          <p className="rounded-lg border border-[#d8bf72]/20 bg-[#101b2b]/60 px-3 py-2">{bothHandsComparison.innateSummary}</p>
                          <p className="rounded-lg border border-[#d8bf72]/20 bg-[#101b2b]/60 px-3 py-2">{bothHandsComparison.acquiredSummary}</p>
                          <p className="rounded-lg border border-[#d8bf72]/20 bg-[#101b2b]/60 px-3 py-2">{bothHandsComparison.differenceSummary}</p>
                          <p className="rounded-lg border border-[#d8bf72]/20 bg-[#101b2b]/60 px-3 py-2">{bothHandsComparison.growthSummary}</p>
                        </div>
                      </section>
                    ) : null}

                    {analysisResult.resultSections.length > 0 ? (
                      <section className="cd-ink-card cd-hanji rounded-xl border border-[#d8bf72]/30 bg-[#111726]/75 p-4">
                        <h3 className="text-sm font-black text-[#f3de9f] md:text-base">해석 섹션 아코디언</h3>
                        <p className="mt-1 text-xs leading-6 text-[#f9efcf]/85 md:text-sm">카드/탭과 별개로 전체 14개 구조 리딩을 접기/펼치기로 확인할 수 있습니다.</p>
                        <div className="mt-3 space-y-2">
                          {analysisResult.resultSections.map((section) => (
                            <details
                              key={`section-${section.key}`}
                              className="rounded-lg border border-[#d8bf72]/25 bg-[#0f1a2a]/70 px-3 py-2"
                            >
                              <summary className="cursor-pointer text-xs font-black text-[#ffe6b7] md:text-sm">{section.title}</summary>
                              <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-[#f8eed2]/90 md:text-sm">{section.content}</p>
                            </details>
                          ))}
                        </div>
                      </section>
                    ) : null}

                    {activeRecognition ? (
                      <section className="cd-ink-card cd-hanji rounded-xl border border-[#d8bf72]/30 bg-[#12182a]/80 p-4">
                        <h3 className="text-sm font-black text-[#f3de9f] md:text-base">실제 인식 데이터 보기</h3>
                        <p className="mt-1 text-xs leading-6 text-[#f9efcf]/85 md:text-sm">감지된 값만 보여주며, 미감지 항목은 감지되지 않음/unknown으로 유지합니다.</p>

                        <div className="mt-3 grid gap-2 text-xs leading-6 text-[#f8eed2]/90 md:grid-cols-2 md:text-sm">
                          <p className="rounded-lg border border-[#d8bf72]/22 bg-[#0f1a2a]/65 px-3 py-2">손바닥 감지 여부: {String(activeRecognition.palmDetected ?? false)}</p>
                          <p className="rounded-lg border border-[#d8bf72]/22 bg-[#0f1a2a]/65 px-3 py-2">왼손/오른손 판별: {String(activeRecognition.handSide ?? "unknown")}</p>
                          <p className="rounded-lg border border-[#d8bf72]/22 bg-[#0f1a2a]/65 px-3 py-2">선천적/후천적 손 여부: {String(activeRecognition.handRoleLabel ?? "미확정")}</p>
                          <p className="rounded-lg border border-[#d8bf72]/22 bg-[#0f1a2a]/65 px-3 py-2">이미지 밝기: {String((activeRecognition.imageQuality as Record<string, unknown> | undefined)?.brightness ?? "unknown")}</p>
                          <p className="rounded-lg border border-[#d8bf72]/22 bg-[#0f1a2a]/65 px-3 py-2">이미지 선명도: {String((activeRecognition.imageQuality as Record<string, unknown> | undefined)?.sharpness ?? "unknown")}</p>
                          <p className="rounded-lg border border-[#d8bf72]/22 bg-[#0f1a2a]/65 px-3 py-2">손바닥 점유율: {String((activeRecognition.imageQuality as Record<string, unknown> | undefined)?.palmCoverage ?? "unknown")}</p>
                          <p className="rounded-lg border border-[#d8bf72]/22 bg-[#0f1a2a]/65 px-3 py-2">손형 판별값: {String((activeRecognition.handShape as Record<string, unknown> | undefined)?.type ?? "unknown")} / palmRatio={String((activeRecognition.handShape as Record<string, unknown> | undefined)?.palmRatio ?? "unknown")} / fingerRatio={String((activeRecognition.handShape as Record<string, unknown> | undefined)?.fingerRatio ?? "unknown")}</p>
                        </div>

                        <div className="mt-3 space-y-2">
                          {[
                            ["생명선", "lifeLine"],
                            ["두뇌선", "headLine"],
                            ["감정선", "heartLine"],
                            ["운명선", "fateLine"],
                            ["태양선", "sunLine"],
                            ["재물선", "moneyLine"],
                            ["결혼선", "marriageLine"],
                            ["소통선", "communicationLine"],
                          ].map(([label, key]) => {
                            const line = ((activeRecognition.lines as Record<string, unknown> | undefined)?.[key] || {}) as Record<string, unknown>;
                            const path = Array.isArray(line.path) ? (line.path as Array<unknown>) : [];
                            return (
                              <details key={`line-${key}`} className="rounded-lg border border-[#d8bf72]/25 bg-[#0f1a2a]/70 px-3 py-2">
                                <summary className="cursor-pointer text-xs font-black text-[#ffe6b7] md:text-sm">{label} 측정값</summary>
                                <div className="mt-2 grid gap-1 text-xs leading-6 text-[#f8eed2]/90 md:grid-cols-2 md:text-sm">
                                  <p>감지 상태: {String(line.detected ?? false)}</p>
                                  <p>신뢰도: {String(line.confidence ?? "unknown")}</p>
                                  <p>normalizedLength: {String(line.normalizedLength ?? 0)}</p>
                                  <p>길이: {String(line.lengthLabel ?? "unknown")}</p>
                                  <p>depthScore: {String(line.depthScore ?? 0)}</p>
                                  <p>선명도: {String(line.depthLabel ?? "unknown")}</p>
                                  <p>curvatureScore: {String(line.curvatureScore ?? 0)}</p>
                                  <p>곡률: {String(line.curvatureLabel ?? "unknown")}</p>
                                  <p>끊김: {String(line.breaks ?? 0)}</p>
                                  <p>분기: {String(line.branches ?? 0)}</p>
                                  <p>시작 영역: {String(line.startZone ?? "unknown")}</p>
                                  <p>끝 영역: {String(line.endZone ?? "unknown")}</p>
                                  <p>variant: {String(line.variant ?? "unknown")}</p>
                                </div>
                                <details className="mt-2 rounded-md border border-[#d8bf72]/18 bg-[#0c1523]/60 px-2 py-1">
                                  <summary className="cursor-pointer text-[11px] font-bold text-[#f7e5b4] md:text-xs">path 좌표 접기/펼치기</summary>
                                  <pre className="mt-1 max-h-36 overflow-auto whitespace-pre-wrap break-all text-[10px] text-[#f5ebcc]/85 md:text-[11px]">
                                    {path.length > 0 ? JSON.stringify(path, null, 2) : "[]"}
                                  </pre>
                                </details>
                              </details>
                            );
                          })}
                        </div>

                        <details className="mt-3 rounded-lg border border-[#d8bf72]/25 bg-[#0f1a2a]/70 px-3 py-2">
                          <summary className="cursor-pointer text-xs font-black text-[#ffe6b7] md:text-sm">구丘 분석값</summary>
                          <div className="mt-2 grid gap-1 text-xs leading-6 text-[#f8eed2]/90 md:text-sm">
                            {[
                              ["금성구", "venus"],
                              ["월구", "moon"],
                              ["목성구", "jupiter"],
                              ["토성구", "saturn"],
                              ["태양구", "sun"],
                              ["수성구", "mercury"],
                              ["화성구", "mars"],
                            ].map(([label, key]) => {
                              const mount = ((activeRecognition.mounts as Record<string, unknown> | undefined)?.[key] || {}) as Record<string, unknown>;
                              return (
                                <p key={`mount-${key}`}>
                                  {label}: fullness={String(mount.fullness ?? "unknown")}, confidence={String(mount.confidence ?? "low")} - {String(mount.summary ?? "보수적 해석")}
                                </p>
                              );
                            })}
                          </div>
                        </details>
                      </section>
                    ) : null}

                    <section className="md:hidden">
                      <div className="scrollbar-none mb-3 flex gap-2 overflow-x-auto pb-1">
                        {interpretationCards.map((card) => {
                          const active = activeCardKey === card.key;
                          return (
                            <button
                              key={`mobile-tab-${card.key}`}
                              type="button"
                              onClick={() => setActiveCardKey(card.key)}
                              className={`cd-soft-tab min-h-[46px] shrink-0 rounded-lg border px-3 py-2 text-[12px] font-bold transition-all duration-200 ${
                                active
                                  ? "border-[#e4ca7d]/65 bg-[#38261f] text-[#ffe7b8] shadow-[inset_0_-2px_0_rgba(250,224,140,0.8)]"
                                  : "border-[#d8bf72]/30 bg-[#111b2a] text-[#f4e6bf]"
                              }`}
                            >
                              {CARD_KEY_TO_LABEL[card.key]}
                            </button>
                          );
                        })}
                      </div>
                      {mobileFocusedCard ? renderInterpretationCard(mobileFocusedCard, true) : null}
                    </section>

                    <section className="hidden space-y-4 md:block">
                      {interpretationCards.map((card) => renderInterpretationCard(card))}
                    </section>
                  </div>
                </div>
              </section>
            ) : null}
          </div>
        </article>
      </section>

      <style jsx global>{`
        .cd-ink-card {
          backdrop-filter: blur(2px);
        }

        .cd-hanji {
          position: relative;
        }

        .cd-hanji::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image:
            radial-gradient(circle at 16% 24%, rgba(245, 227, 177, 0.08) 0 1px, transparent 2px),
            radial-gradient(circle at 74% 66%, rgba(245, 227, 177, 0.07) 0 1px, transparent 2px),
            repeating-linear-gradient(0deg, rgba(250, 238, 205, 0.03) 0, rgba(250, 238, 205, 0.03) 1px, transparent 1px, transparent 7px);
          opacity: 0.35;
        }

        .cd-seal::after {
          content: "";
          position: absolute;
          right: 12px;
          top: 12px;
          width: 10px;
          height: 10px;
          border-radius: 999px;
          border: 1px solid rgba(245, 217, 138, 0.75);
          background: rgba(150, 23, 23, 0.82);
          box-shadow: 0 0 8px rgba(176, 34, 34, 0.35);
          pointer-events: none;
        }

        .cd-gold-btn {
          transition: box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
        }

        .cd-gold-btn:hover {
          box-shadow: 0 0 14px rgba(227, 193, 112, 0.28);
          border-color: rgba(236, 205, 127, 0.65);
          transform: translateY(-1px);
        }

        .cd-cta-btn {
          transition: box-shadow 0.24s ease, transform 0.24s ease;
        }

        .cd-cta-btn:hover:enabled {
          box-shadow: 0 0 16px rgba(231, 193, 102, 0.32), 0 10px 24px rgba(0, 0, 0, 0.28);
          transform: translateY(-1px);
        }

        .cd-fade-in {
          animation: cdFadeIn 0.32s ease both;
        }

        .cd-soft-tab {
          border-bottom-width: 1px;
        }

        .cd-soft-tab:hover {
          box-shadow: 0 0 10px rgba(227, 193, 112, 0.22);
        }

        @keyframes cdFadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .cd-gold-btn,
          .cd-cta-btn,
          .cd-fade-in,
          .cd-soft-tab {
            transition: none !important;
            animation: none !important;
            transform: none !important;
          }
        }

        @media (max-width: 768px) {
          .cd-hanji::before {
            opacity: 0.25;
          }
        }
      `}</style>
    </main>
  );
}
