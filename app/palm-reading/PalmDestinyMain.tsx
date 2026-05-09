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
      const emphasisScore =
        typeof row.emphasisScore === "number" && Number.isFinite(row.emphasisScore)
          ? row.emphasisScore
          : undefined;
      return {
        key,
        title: String(row.title || CARD_KEY_TO_LABEL[key]),
        oneLiner: String(row.oneLiner || ""),
        details: Array.isArray(row.details) ? row.details.map((x) => String(x)) : [],
        strengths: Array.isArray(row.strengths) ? row.strengths.map((x) => String(x)) : [],
        cautions: Array.isArray(row.cautions) ? row.cautions.map((x) => String(x)) : [],
        todayAdvice: String(row.todayAdvice || ""),
        sevenDayPractice: String(row.sevenDayPractice || ""),
        ...(typeof emphasisScore === "number" ? { emphasisScore } : {}),
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
  const previewUrlsRef = useRef<{ left: string | null; right: string | null }>({ left: null, right: null });
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
    previewUrlsRef.current = {
      left: leftHand.previewUrl,
      right: rightHand.previewUrl,
    };
  }, [leftHand.previewUrl, rightHand.previewUrl]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      const { left, right } = previewUrlsRef.current;
      revokeObjectUrls([left, right]);
    };
  }, []);

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

  const isLikelyImageFile = (file: File): boolean => {
    const mime = String(file.type || "").toLowerCase();
    if (mime.startsWith("image/")) return true;
    return /\.(png|jpe?g|webp|gif|bmp|avif|heic|heif)$/i.test(String(file.name || ""));
  };

  const isHeicLikeFile = (file: File): boolean => {
    const mime = String(file.type || "").toLowerCase();
    const name = String(file.name || "").toLowerCase();
    return mime.includes("heic") || mime.includes("heif") || name.endsWith(".heic") || name.endsWith(".heif");
  };

  const handleFileChange = (side: HandSide, event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = "";

    if (!picked) return;

    if (!isLikelyImageFile(picked)) {
      setSubmitMessage("지원되지 않는 파일 형식입니다. JPG/PNG/WEBP 이미지로 다시 선택해 주세요.");
      return;
    }

    const shouldShowHeicHint = isHeicLikeFile(picked);

    resetAnalysisState();
    if (shouldShowHeicHint) {
      setSubmitMessage("HEIC/HEIF 형식은 기기 브라우저에 따라 미리보기가 실패할 수 있습니다. JPG/PNG로 변환 후 다시 업로드해 주세요.");
    }
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

  const getClientAuthToken = (): string => {
    if (typeof window === "undefined") return "";
    try {
      return String(window.localStorage.getItem("fortune_auth_token") || "").trim();
    } catch {
      return "";
    }
  };

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

      const requestBody = JSON.stringify({
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
      });

      let response = await fetch("/api/palm/analyze", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: requestBody,
      });

      if (response.status === 401) {
        const authToken = getClientAuthToken();
        if (authToken) {
          response = await fetch("/api/palm/analyze", {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            signal: controller.signal,
            body: requestBody,
          });
        }
      }

      if (requestIdRef.current !== requestId) {
        return;
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const code =
          typeof data?.code === "string"
            ? data.code
            : typeof data?.error === "string"
            ? data.error
            : "UNKNOWN_ERROR";
        const message =
          typeof data?.message === "string"
            ? data.message
            : typeof data?.error === "string"
            ? data.error
            : "분석 중 오류가 발생했습니다.";
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
        className={`cd-oriental-card cd-fade-in rounded-2xl border p-4 md:p-5 ${
          active
            ? "border-[#c8a84b]/65"
            : "border-[#c8a84b]/25"
        }`}
        style={active ? {
          background: "linear-gradient(145deg, rgba(10,5,5,0.98), rgba(20,8,8,0.97))",
          boxShadow: "0 0 0 1px rgba(180,130,40,0.2), 0 0 28px rgba(139,0,0,0.2), inset 0 0 30px rgba(120,15,15,0.18)",
        } : {
          background: "linear-gradient(145deg, rgba(8,4,4,0.96), rgba(15,7,7,0.95))",
          boxShadow: "0 0 0 1px rgba(180,130,40,0.08)",
        }}
      >
        <header className="flex items-center justify-between gap-2 border-b border-[#c8a84b]/20 pb-3">
          <h4 className="text-sm font-black text-[#f5d987] md:text-base" style={{ fontFamily: "'Noto Serif KR', serif" }}>{card.title}</h4>
          <button
            type="button"
            onClick={() => setActiveCardKey(card.key)}
            className="cd-ghost-btn rounded-sm border border-[#c8a84b]/40 bg-[#0d0808] px-2 py-1 text-[11px] font-bold text-[#e8d090]"
          >
            선택
          </button>
        </header>

        <p className="mt-3 rounded-lg border border-[#9b1a1a]/40 bg-[#1a0808]/70 px-3 py-2 text-sm font-semibold leading-6 text-[#ffd8d0]">
          {card.oneLiner}
        </p>

        <section className="mt-3">
          <h5 className="flex items-center gap-2 text-xs font-black tracking-[0.08em] text-[#d4b45c] md:text-sm">
            <span aria-hidden className="text-[8px]">◆</span>상세 해석
          </h5>
          <ul className="mt-2 space-y-2 text-xs leading-6 text-[#e8d8b0]/90 md:text-sm">
            {card.details.slice(0, 8).map((line, index) => (
              <li key={`${card.key}-detail-${index}`} className="rounded-lg border border-[#c8a84b]/18 bg-[#0d0606]/65 px-3 py-2">
                {line}
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <section>
            <h5 className="flex items-center gap-2 text-xs font-black tracking-[0.08em] text-[#d4b45c] md:text-sm">
              <span aria-hidden className="text-[8px] text-green-400/70">◆</span>장점 3개
            </h5>
            <ul className="mt-2 space-y-1 text-xs leading-6 text-[#e8d8b0]/90 md:text-sm">
              {card.strengths.slice(0, 3).map((line, index) => (
                <li key={`${card.key}-strength-${index}`} className="rounded-lg border border-[#4a7a30]/30 bg-[#0a1206]/60 px-3 py-2">
                  {line}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h5 className="flex items-center gap-2 text-xs font-black tracking-[0.08em] text-[#d4b45c] md:text-sm">
              <span aria-hidden className="text-[8px] text-red-400/70">◆</span>주의점 3개
            </h5>
            <ul className="mt-2 space-y-1 text-xs leading-6 text-[#e8d8b0]/90 md:text-sm">
              {card.cautions.slice(0, 3).map((line, index) => (
                <li key={`${card.key}-caution-${index}`} className="rounded-lg border border-[#8b1a1a]/35 bg-[#140808]/60 px-3 py-2">
                  {line}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="mt-3 space-y-2">
          <div className="rounded-lg border border-[#c8a84b]/22 bg-[#0d0606]/65 px-3 py-2">
            <h5 className="flex items-center gap-2 text-xs font-black tracking-[0.08em] text-[#d4b45c] md:text-sm">
              <span aria-hidden className="text-[8px]">◆</span>오늘의 조언
            </h5>
            <p className="mt-1 text-xs leading-6 text-[#e8d8b0]/90 md:text-sm">{card.todayAdvice}</p>
          </div>
          <div className="rounded-lg border border-[#c8a84b]/22 bg-[#0d0606]/65 px-3 py-2">
            <h5 className="flex items-center gap-2 text-xs font-black tracking-[0.08em] text-[#d4b45c] md:text-sm">
              <span aria-hidden className="text-[8px]">◆</span>7일 실천법
            </h5>
            <p className="mt-1 text-xs leading-6 text-[#e8d8b0]/90 md:text-sm">{card.sevenDayPractice}</p>
          </div>
        </section>

        {compactMobile ? null : (
          <p className="mt-3 text-[11px] text-[#c8a84b]/55 md:text-xs">카드 키: {card.key}</p>
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
      <section className="cd-oriental-card rounded-2xl border border-[#c8a84b]/45 bg-[linear-gradient(145deg,rgba(8,4,4,0.97),rgba(18,8,8,0.97))] p-4 md:p-5" style={{ boxShadow: "0 0 0 1px rgba(180,130,40,0.12), inset 0 0 30px rgba(120,15,15,0.14)" }}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-extrabold text-[#f5d987] md:text-lg" style={{ fontFamily: "'Noto Serif KR', serif" }}>{title}</h2>
          <span className="rounded-sm border border-[#9b1a1a]/75 bg-[#4a0808]/80 px-2 py-1 text-[11px] font-bold tracking-[0.1em] text-[#ffc8c8]">
            손바닥 입력
          </span>
        </div>

        <p className="mt-2 text-xs leading-6 text-[#d8c090]/80 md:text-sm">
          손바닥이 선명하게 보이는 사진을 업로드하거나 촬영해 주세요.
        </p>

        {hasPreview ? (
          <div className="mt-3 rounded-lg border border-[#c8a84b]/35 bg-[#0d0606]/80 px-3 py-2">
            <p className="text-xs font-bold text-[#f5d987] md:text-sm">
              {handName} · {roleMeta.label}
            </p>
            <p className="mt-1 text-xs text-[#d8c090]/80">{roleMeta.description}</p>
          </div>
        ) : null}

        {/* 액자형 업로드 영역 */}
        <div className="mt-4 overflow-hidden rounded-xl border-2 border-[#c8a84b]/50" style={{ background: "linear-gradient(140deg, #07040a 0%, #0d0606 60%, #100408 100%)", boxShadow: "inset 0 0 30px rgba(100,10,10,0.25), 0 0 0 1px rgba(180,130,40,0.08)" }}>
          {/* 코너 장식 */}
          <div className="relative">
            <span aria-hidden className="absolute left-2 top-2 text-[#c8a84b]/60 text-xs leading-none">╔</span>
            <span aria-hidden className="absolute right-2 top-2 text-[#c8a84b]/60 text-xs leading-none">╗</span>
            <span aria-hidden className="absolute left-2 bottom-2 text-[#c8a84b]/60 text-xs leading-none">╚</span>
            <span aria-hidden className="absolute right-2 bottom-2 text-[#c8a84b]/60 text-xs leading-none">╝</span>
          </div>
          <div className="relative flex min-h-[220px] items-center justify-center px-6 py-6">
            {hasPreview ? (
              <img
                src={state.previewUrl ?? ""}
                alt={`${title} 미리보기`}
                className="max-h-[300px] w-full rounded-lg object-contain"
                onError={() => {
                  setSubmitMessage(`${handName} 미리보기를 불러오지 못했습니다. JPG/PNG/WEBP 형식으로 다시 업로드해 주세요.`);
                }}
                style={{ border: "1px solid rgba(200,168,75,0.4)", boxShadow: "0 0 20px rgba(0,0,0,0.5)" }}
              />
            ) : (
              <div className="text-center text-[#c8a84b]">
                <p className="text-5xl opacity-60">🖐</p>
                <p className="mt-3 text-sm font-bold text-[#e8d090] md:text-base">{title} 이미지 미리보기</p>
                <p className="mt-1 text-xs text-[#c8a84b]/70 md:text-sm">업로드 후 이 영역에 표시됩니다.</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 md:gap-3">
          <button
            type="button"
            onClick={() => uploadRef.current?.click()}
            className="cd-ghost-btn min-h-[44px] rounded-lg border border-[#c8a84b]/40 bg-[#0d0808] px-3 py-2 text-sm font-bold text-[#e8d090] transition"
          >
            이미지 업로드
          </button>
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="cd-ghost-btn min-h-[44px] rounded-lg border border-[#c8a84b]/40 bg-[#0e0608] px-3 py-2 text-sm font-bold text-[#e8d090] transition"
          >
            실시간 촬영
          </button>
          <button
            type="button"
            onClick={() => clearHandImage(side)}
            className="cd-red-btn min-h-[44px] rounded-lg border border-[#9b1a1a]/65 px-3 py-2 text-sm font-bold text-[#ffd8d8] transition"
            style={{ background: "linear-gradient(136deg, rgba(100,15,15,0.95), rgba(70,25,10,0.95))" }}
          >
            이미지 삭제
          </button>
          <button
            type="button"
            onClick={() => uploadRef.current?.click()}
            className="cd-ghost-btn min-h-[44px] rounded-lg border border-[#c8a84b]/40 bg-[#100a06] px-3 py-2 text-sm font-bold text-[#e8d090] transition"
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
    <main className="relative min-h-screen overflow-hidden bg-[#03040a] text-[#f8edc8]">
      {/* 심홍색+금색 배경 분위기 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 75% 10%, rgba(180, 28, 28, 0.28), transparent 36%), radial-gradient(ellipse at 20% 85%, rgba(145, 20, 20, 0.22), transparent 40%), radial-gradient(ellipse at 50% 50%, rgba(8, 5, 2, 0.9), transparent 70%), linear-gradient(165deg, #030409 0%, #060c14 45%, #09040a 100%)",
        }}
      />
      {/* 비단 격자 — 조금 더 촘촘 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(212, 176, 92, 0.55) 0, rgba(212, 176, 92, 0.55) 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, rgba(212, 176, 92, 0.35) 0, rgba(212, 176, 92, 0.35) 1px, transparent 1px, transparent 40px)",
        }}
      />
      {/* 사선 비단 문양 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(190, 24, 24, 0.5) 0, rgba(190, 24, 24, 0.5) 1px, transparent 1px, transparent 28px), repeating-linear-gradient(-45deg, rgba(212, 176, 92, 0.4) 0, rgba(212, 176, 92, 0.4) 1px, transparent 1px, transparent 28px)",
        }}
      />
      {/* 별빛 점 장식 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 14% 26%, rgba(255, 225, 140, 0.55) 0 1px, transparent 2px), radial-gradient(circle at 77% 31%, rgba(255, 225, 140, 0.42) 0 1px, transparent 2px), radial-gradient(circle at 52% 72%, rgba(255, 225, 140, 0.38) 0 1px, transparent 2px), radial-gradient(circle at 34% 58%, rgba(255, 225, 140, 0.32) 0 1px, transparent 2px), radial-gradient(circle at 88% 62%, rgba(255, 180, 140, 0.3) 0 1px, transparent 2px), radial-gradient(circle at 6% 48%, rgba(255, 200, 140, 0.28) 0 1px, transparent 2px)",
        }}
      />
      {/* 우상단 금빛 원형 후광 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 opacity-30"
        style={{
          background: "radial-gradient(circle, rgba(212,176,92,0.55) 0%, rgba(175,28,28,0.22) 45%, transparent 70%)",
          filter: "blur(12px)",
        }}
      />
      {/* 좌하단 홍색 후광 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 opacity-25"
        style={{
          background: "radial-gradient(circle, rgba(160,20,20,0.6) 0%, transparent 70%)",
          filter: "blur(18px)",
        }}
      />

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-10 md:px-8">
        <article className="cd-ink-card cd-hanji relative w-full overflow-hidden rounded-[28px] border-2 border-[#c8a84b]/55 bg-[linear-gradient(148deg,rgba(8,6,12,0.97),rgba(14,9,9,0.97)_50%,rgba(10,5,8,0.97)_100%)] shadow-[0_0_0_1px_rgba(180,130,40,0.2),0_32px_80px_rgba(0,0,0,0.75),inset_0_0_60px_rgba(140,20,20,0.08)]">
          {/* 카드 상단 금빛 장식선 */}
          <div aria-hidden className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, transparent, #c8a84b 20%, #f5d987 50%, #c8a84b 80%, transparent)" }} />

          <div className="relative border-b border-[#c8a84b]/25 px-5 py-8 md:px-10 md:py-12" style={{ background: "linear-gradient(180deg, rgba(120,15,15,0.18) 0%, transparent 60%)" }}>
            {/* 우상단 팔각 문양 */}
            <div
              aria-hidden
              className="absolute right-6 top-6 h-20 w-20 opacity-30"
              style={{
                background: "conic-gradient(from 22.5deg, rgba(212,176,92,0.8) 0deg 45deg, transparent 45deg 90deg, rgba(212,176,92,0.8) 90deg 135deg, transparent 135deg 180deg, rgba(212,176,92,0.8) 180deg 225deg, transparent 225deg 270deg, rgba(212,176,92,0.8) 270deg 315deg, transparent 315deg 360deg)",
                clipPath: "circle(50%)",
              }}
            />
            <div
              aria-hidden
              className="absolute right-6 top-6 h-20 w-20 rounded-full opacity-20"
              style={{ border: "1.5px solid #d4b45c", boxShadow: "0 0 16px rgba(212,176,92,0.5)" }}
            />

            <div className="flex items-center gap-3">
              <div aria-hidden className="h-px flex-1 opacity-50" style={{ background: "linear-gradient(90deg, transparent, #c8a84b)" }} />
              <span className="cd-badge inline-flex items-center rounded-sm border border-[#9b1a1a]/80 bg-[#5a0a0a]/80 px-4 py-1.5 text-[11px] font-bold tracking-[0.22em] text-[#ffc8c8]">
                掌 紋 運 命　PALM DESTINY
              </span>
              <div aria-hidden className="h-px flex-1 opacity-50" style={{ background: "linear-gradient(90deg, #c8a84b, transparent)" }} />
            </div>

            <h1
              className="cd-title mt-6 text-center text-5xl font-black leading-tight md:text-6xl"
              style={{
                fontFamily: "'Noto Serif KR', 'Nanum Myeongjo', serif",
                background: "linear-gradient(175deg, #fff5d0 0%, #f5d987 35%, #c8a84b 65%, #8b6914 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                textShadow: "none",
                filter: "drop-shadow(0 0 12px rgba(212,176,92,0.4))",
              }}
            >
              손금 지도
            </h1>
            <p className="mt-3 text-center text-sm font-semibold tracking-[0.22em] text-[#d4b45c] md:text-base" style={{ fontFamily: "'Noto Serif KR', serif" }}>
              先天의 結 · 後天의 流
            </p>
            <div aria-hidden className="mx-auto mt-4 h-px max-w-xs" style={{ background: "linear-gradient(90deg, transparent, #c8a84b 30%, #f5d987 50%, #c8a84b 70%, transparent)" }} />
            <p className="mt-4 text-center text-base font-semibold text-[#eedad0] md:text-lg">
              손바닥에 새겨진 사랑 · 재물 · 직업 · 마음의 흐름을 읽다
            </p>
            <p className="mx-auto mt-4 max-w-3xl text-center text-sm leading-7 text-[#f0e4cc]/85 md:text-base">
              손금은 수명이나 질병을 단정하는 도구가 아니라, 성향·관계·재물·직업 흐름을 상징적으로 읽는 지도입니다.
            </p>
            <p className="mx-auto mt-2 max-w-3xl text-center text-xs leading-6 text-[#e8d8b8]/75 md:text-sm">
              타고난 손과 살아온 손을 함께 읽습니다. 손바닥에는 본래의 기질과 지금의 발자취가 함께 새겨집니다.
            </p>
          </div>

          <div className="relative space-y-5 px-5 py-7 md:px-10 md:py-9">
            <section className="cd-oriental-card rounded-2xl border border-[#c8a84b]/50 bg-[linear-gradient(145deg,rgba(10,6,5,0.96),rgba(22,10,10,0.96))] p-4 md:p-6" style={{ boxShadow: "0 0 0 1px rgba(180,130,40,0.12), inset 0 0 30px rgba(120,15,15,0.12)" }}>
              <div className="flex items-center gap-3 border-b border-[#c8a84b]/20 pb-3">
                <div aria-hidden className="h-5 w-1 rounded-full" style={{ background: "linear-gradient(180deg, #f5d987, #8b6914)" }} />
                <h2 className="text-base font-black text-[#f5d987] md:text-lg" style={{ fontFamily: "'Noto Serif KR', serif" }}>업로드 안내</h2>
              </div>
              <p className="mt-3 text-sm leading-7 text-[#f0dfc0]/90">
                왼손, 오른손 또는 양손 손바닥 이미지를 업로드하거나 카메라로 촬영해 주세요.
              </p>
            </section>

            <div className="grid gap-4 md:grid-cols-2 md:gap-5">
              {renderHandUploader("left", leftHand, leftUploadInputRef, leftCameraInputRef, "왼손 이미지 업로드")}
              {renderHandUploader("right", rightHand, rightUploadInputRef, rightCameraInputRef, "오른손 이미지 업로드")}
            </div>

            <section className="cd-oriental-card rounded-2xl border border-[#c8a84b]/50 bg-[linear-gradient(145deg,rgba(10,6,5,0.96),rgba(20,10,10,0.96))] p-4 md:p-6" style={{ boxShadow: "0 0 0 1px rgba(180,130,40,0.12), inset 0 0 30px rgba(120,15,15,0.12)" }}>
              <div className="flex items-center gap-3 border-b border-[#c8a84b]/20 pb-3">
                <div aria-hidden className="h-5 w-1 rounded-full" style={{ background: "linear-gradient(180deg, #f5d987, #8b6914)" }} />
                <h2 className="text-base font-black text-[#f5d987] md:text-lg" style={{ fontFamily: "'Noto Serif KR', serif" }}>선천 · 후천 설명</h2>
              </div>
              <div className="mt-3 rounded-xl border border-[#9b1a1a]/60 bg-[#1e0808]/80 p-4 text-sm leading-7 text-[#ffe5c8]" style={{ boxShadow: "inset 0 0 20px rgba(100,10,10,0.3)" }}>
                <p>손금에서는 자주 쓰는 손을 <span className="font-bold text-[#f5d987]">후천적 손</span>, 자주 쓰지 않는 손을 <span className="font-bold text-[#f5d987]">선천적 손</span>으로 읽습니다.</p>
                <p className="mt-2">후천적 손은 현재의 성향과 삶의 흐름을, 선천적 손은 타고난 기질과 잠재력을 보여줍니다.</p>
                <p className="mt-2 font-semibold text-[#fde8c8]">선천의 결, 후천의 흐름을 함께 읽어 현실적인 방향을 제안합니다.</p>
              </div>
            </section>

            <section className="cd-oriental-card rounded-2xl border border-[#c8a84b]/50 bg-[linear-gradient(145deg,rgba(10,6,5,0.96),rgba(18,10,10,0.96))] p-4 md:p-6" style={{ boxShadow: "0 0 0 1px rgba(180,130,40,0.12), inset 0 0 30px rgba(120,15,15,0.12)" }}>
              <fieldset>
                <div className="flex items-center gap-3 border-b border-[#c8a84b]/20 pb-3">
                  <div aria-hidden className="h-5 w-1 rounded-full" style={{ background: "linear-gradient(180deg, #f5d987, #8b6914)" }} />
                  <legend className="text-base font-black text-[#f5d987] md:text-lg" style={{ fontFamily: "'Noto Serif KR', serif" }}>주로 쓰는 손 선택</legend>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
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
                        className={`cd-select-btn min-h-[48px] rounded-lg border px-3 py-2 text-sm font-bold transition-all ${
                          active
                            ? "cd-select-btn--active border-[#f5d987]/80 text-[#fff5c8]"
                            : "border-[#c8a84b]/35 bg-[#0d0808] text-[#e8d090]"
                        }`}
                        style={active ? { background: "linear-gradient(135deg, #5a1a00 0%, #3d1400 50%, #5a2800 100%)", boxShadow: "0 0 18px rgba(212,176,92,0.35), inset 0 -2px 0 rgba(245,217,135,0.8)" } : {}}
                        aria-pressed={active}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="mt-6">
                <div className="flex items-center gap-3 border-b border-[#c8a84b]/20 pb-3">
                  <div aria-hidden className="h-5 w-1 rounded-full" style={{ background: "linear-gradient(180deg, #f5d987, #8b6914)" }} />
                  <legend className="text-base font-black text-[#f5d987] md:text-lg" style={{ fontFamily: "'Noto Serif KR', serif" }}>분석 목적 선택</legend>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
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
                        className={`cd-select-btn min-h-[48px] rounded-lg border px-3 py-2 text-sm font-bold transition-all ${
                          active
                            ? "cd-select-btn--active border-[#f5d987]/80 text-[#fff5c8]"
                            : "border-[#c8a84b]/35 bg-[#0d0808] text-[#e8d090]"
                        }`}
                        style={active ? { background: "linear-gradient(135deg, #4d0f0f 0%, #370a0a 50%, #4d1f1f 100%)", boxShadow: "0 0 18px rgba(180,30,30,0.4), inset 0 -2px 0 rgba(245,217,135,0.8)" } : {}}
                        aria-pressed={active}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </section>

            <section className="cd-oriental-card rounded-2xl border border-[#c8a84b]/50 bg-[linear-gradient(145deg,rgba(10,6,5,0.96),rgba(18,10,10,0.96))] p-4 md:p-6" style={{ boxShadow: "0 0 0 1px rgba(180,130,40,0.12), inset 0 0 30px rgba(120,15,15,0.12)" }}>
              <div className="flex items-center gap-3 border-b border-[#c8a84b]/20 pb-3">
                <div aria-hidden className="h-5 w-1 rounded-full" style={{ background: "linear-gradient(180deg, #f5d987, #8b6914)" }} />
                <h2 className="text-base font-black text-[#f5d987] md:text-lg" style={{ fontFamily: "'Noto Serif KR', serif" }}>촬영 가이드</h2>
              </div>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-[#f0dfc0]/90">
                {SHOOTING_GUIDES.map((guide) => (
                  <li key={guide} className="flex items-start gap-3 rounded-lg border border-[#c8a84b]/20 bg-[#0d0606]/70 px-3 py-2">
                    <span className="mt-0.5 shrink-0 text-[10px] font-black text-[#d4b45c]">◆</span>
                    <span>{guide}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="cd-oriental-card rounded-2xl border border-[#c8a84b]/50 bg-[linear-gradient(145deg,rgba(10,6,5,0.96),rgba(20,8,8,0.96))] p-4 md:p-6" style={{ boxShadow: "0 0 0 1px rgba(180,130,40,0.12), inset 0 0 30px rgba(120,15,15,0.12)" }}>
              <button
                type="button"
                onClick={handleStartAnalysis}
                disabled={!canStartAnalysis}
                aria-disabled={!canStartAnalysis}
                className={`cd-main-cta inline-flex min-h-[56px] w-full items-center justify-center rounded-xl border px-4 py-3 text-sm font-black tracking-[0.08em] md:text-base ${
                  canStartAnalysis
                    ? "border-[#d4af37]/70 text-[#fff8e0]"
                    : "cursor-not-allowed border-[#7a6020]/40 text-[#c8b070] opacity-60"
                }`}
                style={canStartAnalysis ? {
                  background: "linear-gradient(140deg, #8b0000 0%, #6b1a0a 35%, #5a1200 65%, #7a1800 100%)",
                  boxShadow: "0 0 0 1px rgba(212,176,92,0.25), 0 12px 32px rgba(0,0,0,0.5), 0 0 24px rgba(139,0,0,0.4)",
                } : {
                  background: "linear-gradient(140deg, rgba(80,60,20,0.5), rgba(40,30,10,0.6))",
                }}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-3">
                    <span aria-hidden className="cd-spinner inline-block h-5 w-5 rounded-full border-2 border-[#f5d987]/30 border-t-[#f5d987]" />
                    손금 분석 진행 중...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span aria-hidden style={{ fontFamily: "serif" }}>☰</span>
                    손바닥 운명 지도 열기
                  </span>
                )}
              </button>

              <p className="mt-3 text-xs leading-6 text-[#d4b45c]/75 md:text-sm">
                활성 조건: 왼손 또는 오른손 이미지 1개 이상 + 주로 쓰는 손 선택 + 분석 목적 선택
              </p>

              {(leftHand.file || rightHand.file) && dominantHand ? (
                <div className="mt-3 rounded-lg border border-[#c8a84b]/30 bg-[#0d0606]/70 px-3 py-2 text-xs text-[#e8d090]/90 md:text-sm">
                  <p>왼손 역할: <span className="font-bold text-[#f5d987]">{HAND_ROLE_META[handRoles.leftHandRole].label}</span></p>
                  <p className="mt-1">오른손 역할: <span className="font-bold text-[#f5d987]">{HAND_ROLE_META[handRoles.rightHandRole].label}</span></p>
                </div>
              ) : null}

              {submitMessage ? (
                <p className="mt-3 rounded-lg border border-[#9b1a1a]/60 bg-[#1e0808]/80 px-3 py-2 text-xs leading-6 text-[#ffd8d8] md:text-sm">
                  {submitMessage}
                </p>
              ) : null}

              {isSubmitting ? (
                <div className="mt-3 rounded-lg border border-[#c8a84b]/30 bg-[#0d0606]/80 px-3 py-3 text-xs text-[#e8d090]/92 md:text-sm">
                  <p className="font-bold text-[#f5d987]">손바닥의 금빛 선을 읽고 있습니다...</p>
                  <p className="mt-1 text-[#e8d090]">{loadingPhaseText}</p>
                </div>
              ) : null}

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handlePhotoReselect}
                  className="cd-ghost-btn min-h-[44px] rounded-lg border border-[#c8a84b]/40 bg-[#0d0808] px-3 py-2 text-sm font-bold text-[#e8d090]"
                >
                  사진 다시 선택
                </button>
                <button
                  type="button"
                  onClick={handleResetOnlyResult}
                  className="cd-ghost-btn min-h-[44px] rounded-lg border border-[#c8a84b]/40 bg-[#0d0808] px-3 py-2 text-sm font-bold text-[#e8d090]"
                >
                  다시 분석
                </button>
              </div>
            </section>

            {analysisResult ? (
              <section className="cd-oriental-card rounded-2xl border border-[#c8a84b]/50 bg-[linear-gradient(145deg,rgba(10,6,5,0.98),rgba(20,8,8,0.97))] p-4 md:p-6" style={{ boxShadow: "0 0 0 1px rgba(180,130,40,0.12), inset 0 0 40px rgba(120,15,15,0.14)" }}>
                <div className="mb-4 flex flex-col gap-3 border-b border-[#c8a84b]/25 pb-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <div aria-hidden className="h-5 w-1 rounded-full" style={{ background: "linear-gradient(180deg, #f5d987, #8b6914)" }} />
                      <h2 className="text-base font-black text-[#f5d987] md:text-lg" style={{ fontFamily: "'Noto Serif KR', serif" }}>손금 결과 오버레이</h2>
                    </div>
                    <p className="mt-1 text-xs text-[#d4b45c]/85">선천의 결, 후천의 흐름을 한 화면에서 비교합니다.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#c8a84b]/35 bg-[#0d0808]/80 px-2 py-1 text-[11px] font-bold text-[#e8d090]">
                      {hasCoordinatePaths ? "좌표 기반 + 일부 보정" : "상징적 안내 오버레이"}
                    </span>
                    <button
                      type="button"
                      onClick={handleRetryWithOtherHand}
                      className="cd-ghost-btn min-h-[40px] rounded-lg border border-[#c8a84b]/40 bg-[#0d0808] px-3 py-2 text-xs font-bold text-[#e8d090]"
                    >
                      다른 손으로 다시 보기
                    </button>
                    <button
                      type="button"
                      onClick={handleBackToMain}
                      className="cd-red-btn min-h-[40px] rounded-lg border border-[#9b1a1a]/70 px-3 py-2 text-xs font-bold text-[#ffd8d8]"
                      style={{ background: "linear-gradient(136deg, rgba(100,15,15,0.95), rgba(70,25,10,0.95))" }}
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
                          className={`cd-select-btn min-h-[44px] rounded-lg border px-3 py-2 text-xs font-bold md:text-sm ${
                            overlaySide === "left"
                              ? "border-[#f5d987]/70 text-[#fff5c8]"
                              : "border-[#c8a84b]/30 bg-[#0d0808] text-[#e8d090]"
                          }`}
                          style={overlaySide === "left" ? { background: "linear-gradient(135deg, #5a1a00 0%, #3d1400 50%, #5a2800 100%)", boxShadow: "0 0 18px rgba(212,176,92,0.35), inset 0 -2px 0 rgba(245,217,135,0.8)" } : {}}
                        >
                          왼손 보기
                        </button>
                        <button
                          type="button"
                          onClick={() => setOverlaySide("right")}
                          className={`cd-select-btn min-h-[44px] rounded-lg border px-3 py-2 text-xs font-bold md:text-sm ${
                            overlaySide === "right"
                              ? "border-[#f5d987]/70 text-[#fff5c8]"
                              : "border-[#c8a84b]/30 bg-[#0d0808] text-[#e8d090]"
                          }`}
                          style={overlaySide === "right" ? { background: "linear-gradient(135deg, #5a1a00 0%, #3d1400 50%, #5a2800 100%)", boxShadow: "0 0 18px rgba(212,176,92,0.35), inset 0 -2px 0 rgba(245,217,135,0.8)" } : {}}
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
                      <section className="cd-oriental-card rounded-xl border border-[#c8a84b]/30 bg-[#0d0808]/80 px-4 py-3">
                        <h3 className="text-sm font-black text-[#f5d987] md:text-base" style={{ fontFamily: "'Noto Serif KR', serif" }}>해석 중심</h3>
                        <p className="mt-2 text-xs leading-6 text-[#e8d8b0]/90 md:text-sm">
                          {analysisResult.interpretation.focusSummary}
                        </p>
                      </section>
                    ) : null}

                    {bothHandsComparison ? (
                      <section className="cd-oriental-card rounded-xl border border-[#c8a84b]/30 bg-[#0d0808]/80 p-4">
                        <h3 className="text-sm font-black text-[#f5d987] md:text-base" style={{ fontFamily: "'Noto Serif KR', serif" }}>선천 · 후천 비교 요약</h3>
                        <p className="mt-1 text-xs leading-6 text-[#d4b45c]/85 md:text-sm">타고난 손과 살아온 손을 함께 읽습니다.</p>
                        <div className="mt-3 space-y-2 text-xs leading-6 text-[#e8d8b0]/90 md:text-sm">
                          <p className="rounded-lg border border-[#c8a84b]/18 bg-[#0d0606]/70 px-3 py-2">{bothHandsComparison.innateSummary}</p>
                          <p className="rounded-lg border border-[#c8a84b]/18 bg-[#0d0606]/70 px-3 py-2">{bothHandsComparison.acquiredSummary}</p>
                          <p className="rounded-lg border border-[#c8a84b]/18 bg-[#0d0606]/70 px-3 py-2">{bothHandsComparison.differenceSummary}</p>
                          <p className="rounded-lg border border-[#c8a84b]/18 bg-[#0d0606]/70 px-3 py-2">{bothHandsComparison.growthSummary}</p>
                        </div>
                      </section>
                    ) : null}

                    {analysisResult.resultSections.length > 0 ? (
                      <section className="cd-oriental-card rounded-xl border border-[#c8a84b]/30 bg-[#0d0808]/80 p-4">
                        <h3 className="text-sm font-black text-[#f5d987] md:text-base" style={{ fontFamily: "'Noto Serif KR', serif" }}>해석 섹션 아코디언</h3>
                        <p className="mt-1 text-xs leading-6 text-[#d4b45c]/85 md:text-sm">카드/탭과 별개로 전체 14개 구조 리딩을 접기/펼치기로 확인할 수 있습니다.</p>
                        <div className="mt-3 space-y-2">
                          {analysisResult.resultSections.map((section) => (
                            <details
                              key={`section-${section.key}`}
                              className="rounded-lg border border-[#c8a84b]/22 bg-[#0d0606]/75 px-3 py-2"
                            >
                              <summary className="cursor-pointer text-xs font-black text-[#f5d987] md:text-sm">{section.title}</summary>
                              <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-[#e8d8b0]/90 md:text-sm">{section.content}</p>
                            </details>
                          ))}
                        </div>
                      </section>
                    ) : null}

                    {activeRecognition ? (
                      <section className="cd-oriental-card rounded-xl border border-[#c8a84b]/30 bg-[#0d0808]/85 p-4">
                        <h3 className="text-sm font-black text-[#f5d987] md:text-base" style={{ fontFamily: "'Noto Serif KR', serif" }}>실제 인식 데이터 보기</h3>
                        <p className="mt-1 text-xs leading-6 text-[#d4b45c]/85 md:text-sm">감지된 값만 보여주며, 미감지 항목은 감지되지 않음/unknown으로 유지합니다.</p>

                        <div className="mt-3 grid gap-2 text-xs leading-6 text-[#e8d8b0]/90 md:grid-cols-2 md:text-sm">
                          <p className="rounded-lg border border-[#c8a84b]/22 bg-[#0d0606]/65 px-3 py-2">손바닥 감지 여부: {String(activeRecognition.palmDetected ?? false)}</p>
                          <p className="rounded-lg border border-[#c8a84b]/22 bg-[#0d0606]/65 px-3 py-2">왼손/오른손 판별: {String(activeRecognition.handSide ?? "unknown")}</p>
                          <p className="rounded-lg border border-[#c8a84b]/22 bg-[#0d0606]/65 px-3 py-2">선천적/후천적 손 여부: {String(activeRecognition.handRoleLabel ?? "미확정")}</p>
                          <p className="rounded-lg border border-[#c8a84b]/22 bg-[#0d0606]/65 px-3 py-2">이미지 밝기: {String((activeRecognition.imageQuality as Record<string, unknown> | undefined)?.brightness ?? "unknown")}</p>
                          <p className="rounded-lg border border-[#c8a84b]/22 bg-[#0d0606]/65 px-3 py-2">이미지 선명도: {String((activeRecognition.imageQuality as Record<string, unknown> | undefined)?.sharpness ?? "unknown")}</p>
                          <p className="rounded-lg border border-[#c8a84b]/22 bg-[#0d0606]/65 px-3 py-2">손바닥 점유율: {String((activeRecognition.imageQuality as Record<string, unknown> | undefined)?.palmCoverage ?? "unknown")}</p>
                          <p className="rounded-lg border border-[#c8a84b]/22 bg-[#0d0606]/65 px-3 py-2">손형 판별값: {String((activeRecognition.handShape as Record<string, unknown> | undefined)?.type ?? "unknown")} / palmRatio={String((activeRecognition.handShape as Record<string, unknown> | undefined)?.palmRatio ?? "unknown")} / fingerRatio={String((activeRecognition.handShape as Record<string, unknown> | undefined)?.fingerRatio ?? "unknown")}</p>
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
                              <details key={`line-${key}`} className="rounded-lg border border-[#c8a84b]/22 bg-[#0d0606]/75 px-3 py-2">
                                <summary className="cursor-pointer text-xs font-black text-[#f5d987] md:text-sm">{label} 측정값</summary>
                                <div className="mt-2 grid gap-1 text-xs leading-6 text-[#e8d8b0]/90 md:grid-cols-2 md:text-sm">
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
                                <details className="mt-2 rounded-md border border-[#c8a84b]/18 bg-[#0d0606]/60 px-2 py-1">
                                  <summary className="cursor-pointer text-[11px] font-bold text-[#d4b45c] md:text-xs">path 좌표 접기/펼치기</summary>
                                  <pre className="mt-1 max-h-36 overflow-auto whitespace-pre-wrap break-all text-[10px] text-[#d8c89a]/85 md:text-[11px]">
                                    {path.length > 0 ? JSON.stringify(path, null, 2) : "[]"}
                                  </pre>
                                </details>
                              </details>
                            );
                          })}
                        </div>

                        <details className="mt-3 rounded-lg border border-[#c8a84b]/22 bg-[#0d0606]/75 px-3 py-2">
                          <summary className="cursor-pointer text-xs font-black text-[#f5d987] md:text-sm">구丘 분석값</summary>
                          <div className="mt-2 grid gap-1 text-xs leading-6 text-[#e8d8b0]/90 md:text-sm">
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
                              className={`cd-select-btn min-h-[46px] shrink-0 rounded-lg border px-3 py-2 text-[12px] font-bold transition-all duration-200 ${
                                active
                                  ? "border-[#f5d987]/70 text-[#fff5c8]"
                                  : "border-[#c8a84b]/30 bg-[#0d0808] text-[#e8d090]"
                              }`}
                              style={active ? { background: "linear-gradient(135deg, #4d0f0f 0%, #370a0a 50%, #4d1f1f 100%)", boxShadow: "0 0 14px rgba(180,30,30,0.35), inset 0 -2px 0 rgba(245,217,135,0.8)" } : {}}
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
        /* ──────────── 동양 명품 카드 ──────────── */
        .cd-oriental-card {
          backdrop-filter: blur(4px);
          position: relative;
        }

        /* 한지 질감 오버레이 */
        .cd-oriental-card::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: inherit;
          background-image:
            radial-gradient(circle at 12% 20%, rgba(212, 176, 92, 0.09) 0 1px, transparent 2px),
            radial-gradient(circle at 78% 72%, rgba(212, 176, 92, 0.07) 0 1px, transparent 2px),
            repeating-linear-gradient(0deg, rgba(212, 176, 92, 0.025) 0, rgba(212, 176, 92, 0.025) 1px, transparent 1px, transparent 6px);
          opacity: 1;
        }

        /* 우상단 작은 금빛 도장 */
        .cd-oriental-card::after {
          content: "◈";
          position: absolute;
          right: 14px;
          top: 10px;
          font-size: 10px;
          color: rgba(200, 168, 75, 0.7);
          text-shadow: 0 0 6px rgba(200, 168, 75, 0.5);
          pointer-events: none;
          line-height: 1;
        }

        /* ──────────── 제목 금빛 광채 ──────────── */
        .cd-title {
          animation: cdTitleGlow 4s ease-in-out infinite alternate;
        }

        @keyframes cdTitleGlow {
          from { filter: drop-shadow(0 0 8px rgba(212, 176, 92, 0.3)); }
          to   { filter: drop-shadow(0 0 22px rgba(212, 176, 92, 0.6)); }
        }

        /* ──────────── 배지 ──────────── */
        .cd-badge {
          letter-spacing: 0.22em;
          position: relative;
        }

        /* ──────────── 선택 버튼 ──────────── */
        .cd-select-btn {
          transition: box-shadow 0.22s ease, transform 0.22s ease, border-color 0.22s ease;
        }

        .cd-select-btn:hover {
          box-shadow: 0 0 16px rgba(200, 168, 75, 0.35);
          border-color: rgba(212, 176, 92, 0.65);
          transform: translateY(-1px);
        }

        .cd-select-btn--active {
          animation: cdSelectPulse 2.5s ease-in-out infinite alternate;
        }

        @keyframes cdSelectPulse {
          from { box-shadow: 0 0 14px rgba(200, 168, 75, 0.3), inset 0 -2px 0 rgba(245, 217, 135, 0.7); }
          to   { box-shadow: 0 0 26px rgba(200, 168, 75, 0.55), inset 0 -2px 0 rgba(245, 217, 135, 0.9); }
        }

        /* ──────────── 고스트 버튼 ──────────── */
        .cd-ghost-btn {
          transition: box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
        }

        .cd-ghost-btn:hover {
          box-shadow: 0 0 14px rgba(200, 168, 75, 0.28);
          border-color: rgba(212, 176, 92, 0.6);
          background: rgba(30, 15, 8, 0.9) !important;
          transform: translateY(-1px);
        }

        /* ──────────── 붉은 버튼 ──────────── */
        .cd-red-btn {
          transition: box-shadow 0.2s ease, transform 0.2s ease;
        }

        .cd-red-btn:hover {
          box-shadow: 0 0 18px rgba(155, 26, 26, 0.55);
          transform: translateY(-1px);
        }

        /* ──────────── 메인 CTA 버튼 ──────────── */
        .cd-main-cta {
          transition: box-shadow 0.28s ease, transform 0.28s ease;
          position: relative;
          overflow: hidden;
        }

        .cd-main-cta::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%);
          pointer-events: none;
        }

        .cd-main-cta:hover:not(:disabled) {
          box-shadow:
            0 0 0 1px rgba(212, 176, 92, 0.4),
            0 16px 36px rgba(0, 0, 0, 0.55),
            0 0 32px rgba(139, 0, 0, 0.5);
          transform: translateY(-2px);
        }

        .cd-main-cta:active:not(:disabled) {
          transform: translateY(0);
        }

        /* ──────────── 스피너 ──────────── */
        .cd-spinner {
          animation: cdSpin 0.9s linear infinite;
        }

        @keyframes cdSpin {
          to { transform: rotate(360deg); }
        }

        /* ──────────── 카드 페이드인 ──────────── */
        .cd-fade-in {
          animation: cdFadeIn 0.36s ease both;
        }

        @keyframes cdFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ──────────── 레거시 호환 ──────────── */
        .cd-ink-card { backdrop-filter: blur(2px); }
        .cd-gold-btn { transition: box-shadow 0.2s ease, transform 0.2s ease; }
        .cd-gold-btn:hover { box-shadow: 0 0 14px rgba(200,168,75,0.28); transform: translateY(-1px); }
        .cd-cta-btn { transition: box-shadow 0.24s ease, transform 0.24s ease; }
        .cd-cta-btn:hover:enabled { box-shadow: 0 0 16px rgba(212,176,92,0.32), 0 10px 24px rgba(0,0,0,0.28); transform: translateY(-1px); }
        .cd-soft-tab:hover { box-shadow: 0 0 10px rgba(200,168,75,0.22); }

        @media (prefers-reduced-motion: reduce) {
          .cd-select-btn,
          .cd-ghost-btn,
          .cd-red-btn,
          .cd-main-cta,
          .cd-spinner,
          .cd-fade-in,
          .cd-title,
          .cd-select-btn--active,
          .cd-gold-btn,
          .cd-cta-btn,
          .cd-soft-tab {
            transition: none !important;
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>
    </main>
  );
}
