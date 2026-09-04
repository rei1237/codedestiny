"use client";

import { Bookmark, BookmarkCheck, Check, Copy, ExternalLink, Home, RotateCcw, Sparkles, Trash2, WandSparkles } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { getAuthState, primeAuthFromCache, refreshAuth, useAuthStore } from "@/app/_lib/auth-store";
import { hasClientAuthHint } from "@/app/_lib/user-session-cache";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import { PromptHubLoginGateModal, type PromptHubGateCopy } from "./PromptHubLoginGateModal";
import {
  consumeResumeSnapshot,
  hasFreeGenerationLeft,
  readLibrary,
  recordFreeGeneration,
  removeFromLibrary,
  resolveLibraryOwnerKey,
  saveResumeSnapshot,
  saveToLibrary,
  PROMPT_HUB_LIBRARY_MAX_PROMPT_CHARS,
  type PromptHubResumeIntent,
  type PromptLibraryItem,
} from "./prompt-hub-storage";
import { buildSukuyoPromptFacts } from "./sukuyo-prompt-facts";

const AI_TARGETS: { id: string; label: string; url: string }[] = [
  { id: "chatgpt", label: "ChatGPT", url: "https://chatgpt.com/" },
  { id: "gemini", label: "Gemini", url: "https://gemini.google.com/app" },
  { id: "claude", label: "Claude", url: "https://claude.ai/new" },
  { id: "grok", label: "Grok", url: "https://grok.com/" },
];

// 가격은 서버 정본(worker/lib/paid-feature-registry.js)에서만 읽는다. PriceBadge 를 그냥 import 하면
// billing-client 체인이 이 페이지 청크에 얹히므로, 업셀이 실제로 렌더될 때만 내려받게 분리한다.
// 프롬프트를 생성하기 전에는 이 청크도 네트워크 요청도 발생하지 않는다.
const LazyPriceBadge = dynamic(() => import("@/app/components/PriceBadge").then((mod) => mod.PriceBadge), {
  ssr: false,
});

type MoonLotusDecorationProps = {
  idPrefix: string;
  wrapperClassName?: string;
  svgClassName?: string;
  ariaHidden?: boolean;
};

function MoonLotusDecoration({ idPrefix, wrapperClassName = "", svgClassName = "", ariaHidden = true }: MoonLotusDecorationProps) {
  return (
    <div className={wrapperClassName}>
      <svg
        className={`moon-lotus ${svgClassName}`.trim()}
        viewBox="0 0 220 176"
        role="img"
        aria-hidden={ariaHidden}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id={`${idPrefix}-lotusMoonGlow`} cx="50%" cy="28%" r="68%">
            <stop offset="0%" stopColor="#fff7d6" stopOpacity="0.9" />
            <stop offset="44%" stopColor="#f9d6e5" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#bda8ff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${idPrefix}-lotusPetalMain`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#fff8f0" stopOpacity="0.95" />
            <stop offset="38%" stopColor="#f9bfd5" stopOpacity="0.78" />
            <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0.16" />
          </linearGradient>
          <linearGradient id={`${idPrefix}-lotusPetalSide`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#fff3dc" stopOpacity="0.82" />
            <stop offset="48%" stopColor="#f0a8c4" stopOpacity="0.54" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id={`${idPrefix}-lotusLeafMist`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#f9a8d4" stopOpacity="0" />
            <stop offset="48%" stopColor="#fde68a" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0" />
          </linearGradient>
          <filter id={`${idPrefix}-lotusSoftGlow`} x="-30%" y="-30%" width="160%" height="170%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0.98  0 1 0 0 0.67  0 0 1 0 0.84  0 0 0 .45 0"
              result="glow"
            />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <ellipse cx="110" cy="88" rx="96" ry="76" fill={`url(#${idPrefix}-lotusMoonGlow)`} className="lotus-ray" />
        <path
          d="M28 132 C56 116 83 116 110 132 C137 116 164 116 192 132 C162 149 137 154 110 146 C83 154 58 149 28 132Z"
          fill={`url(#${idPrefix}-lotusLeafMist)`}
          opacity="0.74"
        />
        <g filter={`url(#${idPrefix}-lotusSoftGlow)`}>
          <path className="lotus-petal" d="M110 22 C90 54 91 88 110 124 C129 88 130 54 110 22Z" fill={`url(#${idPrefix}-lotusPetalMain)`} />
          <path className="lotus-petal" d="M82 42 C58 67 57 99 105 130 C111 91 106 63 82 42Z" fill={`url(#${idPrefix}-lotusPetalSide)`} />
          <path className="lotus-petal" d="M138 42 C162 67 163 99 115 130 C109 91 114 63 138 42Z" fill={`url(#${idPrefix}-lotusPetalSide)`} />
          <path className="lotus-petal" d="M58 76 C38 92 39 121 100 140 C92 110 80 88 58 76Z" fill={`url(#${idPrefix}-lotusPetalSide)`} opacity="0.88" />
          <path className="lotus-petal" d="M162 76 C182 92 181 121 120 140 C128 110 140 88 162 76Z" fill={`url(#${idPrefix}-lotusPetalSide)`} opacity="0.88" />
          <path className="lotus-petal" d="M110 68 C94 88 96 116 110 143 C124 116 126 88 110 68Z" fill={`url(#${idPrefix}-lotusPetalMain)`} opacity="0.92" />
          <path d="M50 133 C68 124 86 127 101 143 C78 143 62 140 50 133Z" fill="#fbcfe8" opacity="0.28" />
          <path d="M170 133 C152 124 134 127 119 143 C142 143 158 140 170 133Z" fill="#ddd6fe" opacity="0.26" />
          <path d="M110 122 C101 130 100 141 110 152 C120 141 119 130 110 122Z" fill="#fff7d6" opacity="0.78" />
        </g>
        <g opacity="0.64">
          <path d="M110 40 C103 65 104 96 110 126" fill="none" stroke="#fff7ed" strokeOpacity="0.48" strokeWidth="1.2" />
          <path d="M80 56 C76 82 86 108 104 132" fill="none" stroke="#fff7ed" strokeOpacity="0.28" strokeWidth="1" />
          <path d="M140 56 C144 82 134 108 116 132" fill="none" stroke="#fff7ed" strokeOpacity="0.28" strokeWidth="1" />
        </g>
        <circle cx="110" cy="138" r="9" fill="#fde68a" opacity="0.76" />
        <circle cx="110" cy="138" r="4" fill="#fff7ed" opacity="0.94" />
      </svg>
    </div>
  );
}

type ToolChipProps = {
  tool: { id: string; icon: string };
  isActive: boolean;
  label: string;
  status: string;
  onSelect: () => void;
  className?: string;
};

/** 활성 칩만 현재 도구의 강조색을 쓴다 — 활성 도구가 곧 루트의 --tool-* 이라 팔레트를 따로 들 필요가 없다. */
function ToolChip({ tool, isActive, label, status, onSelect, className = "" }: ToolChipProps) {
  return (
    <button
      type="button"
      data-tool-tab={tool.id}
      aria-pressed={isActive}
      onClick={onSelect}
      className={`option-chip inline-flex min-h-[56px] items-center gap-2.5 rounded-2xl border px-3 text-left text-sm font-black focus:outline-none focus:ring-2 focus:ring-[color:var(--tool-accent-soft)] ${
        isActive
          ? "border-[color:var(--tool-accent)] bg-[color:var(--tool-accent-soft)] text-[color:var(--tool-ink)] shadow-[var(--lift)]"
          : "border-[color:var(--hairline)] bg-[color:var(--surface-1)] text-[color:var(--ink-2)]"
      } ${className}`}
    >
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-sm font-black ${
          isActive
            ? "bg-[color:var(--tool-accent-strong)] text-[color:var(--on-accent-strong)]"
            : "bg-[color:var(--surface-3)] text-[color:var(--ink-2)]"
        }`}
      >
        {isActive ? <Check size={16} /> : tool.icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate">{label}</span>
        <span className="block text-xs font-bold text-[color:var(--ink-3)]">{status}</span>
      </span>
    </button>
  );
}

type ToolId =
  | "comprehensive"
  | "basic"
  | "saju"
  | "yukhyo"
  | "dangsaju"
  | "kusei"
  | "psych"
  | "tarot"
  | "astrology"
  | "vedic"
  | "ziwei"
  | "sukuyo"
  | "numerology"
  | "dream"
  | "horary"
  | "meihua";

// 유료 상담 진입점. featureKey 는 worker/lib/paid-feature-registry.js 정본 키(가격 표시용),
// href 는 각 기능이 자기 결제 게이트를 소유한 실제 라우트다. 이 화면에서 결제창을 열지 않는다.
const UPSELL_PRODUCTS = {
  lifeBook: { featureKey: "life-book-ai-consultation", href: "/life-book-ai" },
  karma: { featureKey: "karma-destiny-ai-consultation", href: "/karma-destiny-ai" },
  newYear: { featureKey: "new-year-ai-consultation", href: "/new-year-ai-consultation" },
  ziwei: { featureKey: "ziwei-ai-consultation", href: "/ziwei-ai" },
  astrology: { featureKey: "astrology-ai-consultation", href: "/astrology-ai" },
  vedic: { featureKey: "vedic-ai-consultation", href: "/vedic-ai" },
  sukuyo: { featureKey: "sukuyo-compatibility-ai", href: "/sukuyo-compatibility-ai" },
  fpti: { featureKey: "premium-fpti-report", href: "/saju-fpti" },
  dreamPsycho: { featureKey: "dream-psycho-analysis", href: "/dream/psycho" },
  tarotPrompt: { featureKey: "tarot-prompt-maker", href: "/tarot/prompt-maker" },
  tarotNumber: { featureKey: "tarot-numerology-reading", href: "/tarot/numerology" },
} as const;

type UpsellId = keyof typeof UPSELL_PRODUCTS;

// 도구별 유료 상담 2종. 첫 번째가 대표(가격 배지와 안내 문구가 이 상품 기준으로 붙는다).
// match: "closest" 는 1:1 대응 상품이 아직 없다는 뜻으로, 그 사실을 화면에 그대로 밝힌다.
// 사주 계열에 /saju 를 쓰지 않는 이유: /saju 는 SEO 랜딩 껍데기고 사주 AI 상담은 정적 셸의
// 결과 화면 안에서만 열려 딥링크가 없다. 그래서 실제 유료 라우트인 인생의 책으로 보낸다.
const TOOL_UPSELL_MAP: Record<ToolId, { pair: readonly [UpsellId, UpsellId]; match: "direct" | "closest" }> = {
  comprehensive: { pair: ["lifeBook", "karma"], match: "closest" },
  basic: { pair: ["newYear", "lifeBook"], match: "closest" },
  saju: { pair: ["lifeBook", "karma"], match: "direct" },
  yukhyo: { pair: ["lifeBook", "karma"], match: "closest" },
  dangsaju: { pair: ["lifeBook", "karma"], match: "closest" },
  kusei: { pair: ["lifeBook", "karma"], match: "closest" },
  meihua: { pair: ["lifeBook", "karma"], match: "closest" },
  psych: { pair: ["fpti", "lifeBook"], match: "direct" },
  numerology: { pair: ["tarotNumber", "lifeBook"], match: "direct" },
  dream: { pair: ["dreamPsycho", "karma"], match: "direct" },
  tarot: { pair: ["tarotPrompt", "lifeBook"], match: "direct" },
  horary: { pair: ["tarotPrompt", "astrology"], match: "closest" },
  astrology: { pair: ["astrology", "lifeBook"], match: "direct" },
  vedic: { pair: ["vedic", "lifeBook"], match: "direct" },
  ziwei: { pair: ["ziwei", "lifeBook"], match: "direct" },
  sukuyo: { pair: ["sukuyo", "lifeBook"], match: "direct" },
};

type FieldType = "text" | "textarea" | "select" | "multiselect" | "date" | "time" | "datetime-local" | "number" | "checkbox";

type FieldConfig = {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  help?: string;
  privacyHint?: string;
  options?: string[];
  rows?: number;
  advanced?: boolean;
  min?: number;
  max?: number;
};

type ToolDraftValue = string | string[] | boolean;
type ToolDraft = Record<string, ToolDraftValue>;

type ToolConfig = {
  id: ToolId;
  label: string;
  shortLabel: string;
  description: string;
  detail: string;
  icon: string;
  theme: {
    accent: string;
    accentStrong: string;
    accentSoft: string;
    surface: string;
    text: string;
    motif: string;
  };
  fields: FieldConfig[];
  exampleValues: ToolDraft;
  generateLabel: string;
  resultLabel: string;
  emptyState: string;
  role: string;
  principles: string[];
  answerSections: string[];
  keywords: string[];
  ready: "ready" | "beta";
};

const RESPONSE_TONES = ["차분한 상담", "따뜻한 위로", "현실적인 조언", "상징적인 문장", "간결한 정리"];
const RESPONSE_DEPTHS = ["핵심만 짧게", "균형 있게", "깊고 자세하게"];

const COMMON_FIELDS_COPY: FieldConfig[] = [
  { id: "topic", label: "상담 주제", type: "text", required: true, placeholder: "예: 올해의 일과 사랑 흐름" },
  { id: "question", label: "구체적인 질문", type: "textarea", required: true, rows: 4, placeholder: "지금 가장 알고 싶은 마음의 방향을 한 가지로 적어 주세요." },
  { id: "context", label: "상황 설명", type: "textarea", rows: 4, placeholder: "최근의 흐름, 고민의 배경, 마음에 남은 장면을 적어 주세요." },
  { id: "tone", label: "원하는 답변 어조", type: "select", options: RESPONSE_TONES },
  { id: "depth", label: "원하는 답변 깊이", type: "select", options: RESPONSE_DEPTHS },
  { id: "avoid", label: "피하고 싶은 표현", type: "text", placeholder: "예: 겁을 주는 말, 단정적인 예언", advanced: true },
];

const BIRTH_PRIVACY_HINT = "입력한 출생 정보는 이 화면에서 프롬프트 문장에만 반영됩니다. 실제 상담에 붙여넣기 전 민감한 정보는 직접 조정해 주세요.";

const BIRTH_FIELDS_COPY: FieldConfig[] = [
  { id: "calendarType", label: "양력/음력", type: "select", options: ["양력", "음력"] },
  { id: "birthDate", label: "생년월일", type: "date", required: true, privacyHint: BIRTH_PRIVACY_HINT },
  { id: "birthTime", label: "출생 시각", type: "time", help: "정확하지 않다면 고급 설정에서 모름을 선택해 주세요.", privacyHint: BIRTH_PRIVACY_HINT },
  { id: "birthPlace", label: "출생 지역", type: "text", placeholder: "예: 서울", privacyHint: BIRTH_PRIVACY_HINT },
  { id: "leapMonth", label: "윤달 여부", type: "checkbox", advanced: true },
  { id: "birthTimeUnknown", label: "출생 시각 모름", type: "checkbox", advanced: true },
];

// 생년월일이 필수가 아닌 도구(종합)용 — 출생 정보를 넣으면 반영하되, 순수 질문/타로형 사용도 막지 않는다.
const BIRTH_FIELDS_OPTIONAL_COPY: FieldConfig[] = BIRTH_FIELDS_COPY.map((field) =>
  field.id === "birthDate" ? { ...field, required: false } : field,
);

// 성별은 사주 대운의 순행/역행과 자미두수 명반 배치에만 쓰인다. 그 둘을 산출하는 도구에만 붙여
// 나머지 도구 프롬프트에 쓰이지 않는 줄이 늘지 않게 한다.
const GENDER_FIELD_COPY: FieldConfig = {
  id: "gender",
  label: "성별",
  type: "select",
  options: ["선택 안 함", "남성", "여성"],
  help: "사주 대운의 순행/역행과 자미두수 명반 배치를 산출하는 데 쓰입니다.",
};

// 출생 시각은 벽시계 값이라 어느 나라 표준시인지 정해야 차트가 맞는다. 차트를 실제로 산출하는
// 세 도구(점성술·베다·종합)에만 붙인다 — 사주·자미두수 엔진은 한국 표준시 벽시계만 받는다.
// 🔴 선택지 문자열이 곧 draft 값이다(렌더러가 옵션을 그대로 넣는다) — 표의 키와 한 글자라도
//    어긋나면 조용히 기본값(한국)으로 떨어진다.
const BIRTH_TIMEZONE_BY_LABEL: Record<string, string> = {
  "한국 (UTC+9)": "Asia/Seoul",
  "일본 (UTC+9)": "Asia/Tokyo",
  "중국·홍콩·대만·싱가포르 (UTC+8)": "Asia/Shanghai",
  "베트남·태국 (UTC+7)": "Asia/Bangkok",
  "인도 (UTC+5:30)": "Asia/Kolkata",
  "아랍에미리트 (UTC+4)": "Asia/Dubai",
  "영국 (UTC+0)": "Europe/London",
  "중부 유럽 (UTC+1)": "Europe/Berlin",
  "미국 동부": "America/New_York",
  "미국 중부": "America/Chicago",
  "미국 서부": "America/Los_Angeles",
  "캐나다 토론토": "America/Toronto",
  "호주 동부": "Australia/Sydney",
  "뉴질랜드": "Pacific/Auckland",
};

const BIRTH_TIMEZONE_FIELD_COPY: FieldConfig = {
  id: "birthTimezone",
  label: "출생지 표준시",
  type: "select",
  options: Object.keys(BIRTH_TIMEZONE_BY_LABEL),
  help: "출생 시각을 어느 나라 표준시로 적었는지 고릅니다. 해외에서 태어났다면 바꿔 주세요.",
};

const TOOL_REGISTRY_COPY: ToolConfig[] = [
  {
    id: "comprehensive",
    label: "종합 프롬프트",
    shortLabel: "종합",
    description: "여러 운세 체계를 한데 엮어 질문의 결을 정돈합니다.",
    detail: "달빛 아래 흩어진 단서를 모으듯 사주, 타로, 점성술, 상징 해석을 함께 다루는 범용 상담 프롬프트입니다.",
    icon: "✦",
    theme: { accent: "#a13f5d", accentStrong: "#7f1d3a", accentSoft: "#ffe4ed", surface: "#fff8f1", text: "#24151b", motif: "얇은 궤도와 달빛 점선" },
    fields: [
      ...COMMON_FIELDS_COPY,
      { id: "systems", label: "활용할 운세 체계", type: "multiselect", required: true, options: ["사주/명리학", "자미두수", "타로", "점성술", "베다점", "수비학", "꿈/상징", "숙요점"] },
      { id: "period", label: "상담 기간", type: "select", options: ["오늘", "이번 주", "이번 달", "3개월", "올해"] },
      ...BIRTH_FIELDS_OPTIONAL_COPY,
      BIRTH_TIMEZONE_FIELD_COPY,
      GENDER_FIELD_COPY,
    ],
    exampleValues: {
      topic: "올해의 일과 사랑 흐름",
      question: "지금 준비하는 일이 내게 맞는 방향인지, 관계에서는 어떤 태도를 지키면 좋을까요?",
      context: "새로운 제안을 받았고 마음은 끌리지만 책임이 커질까 망설이고 있습니다.",
      tone: "따뜻한 위로",
      depth: "균형 있게",
      systems: ["사주/명리학", "타로", "점성술"],
      period: "3개월",
      calendarType: "양력",
      birthDate: "1994-08-17",
      birthTime: "09:20",
      birthPlace: "서울",
    },
    generateLabel: "종합 운세 프롬프트 생성하기",
    resultLabel: "완성된 종합 운세 상담 프롬프트",
    emptyState: "질문, 배경, 활용할 체계를 적으면 여러 운세의 언어가 한 문장 안에서 차분히 정돈됩니다.",
    role: "사주 명식·자미두수 명반·출생 차트 같은 확정 산출값을 먼저 읽고 체계 간 신호를 대조하는 통합 운세 상담가",
    principles: [
      "해석마다 어느 체계의 어느 값에서 나왔는지 근거를 밝힙니다(예: 월지 신 금왕절, 명궁 태음, 상승궁 천칭자리).",
      "체계마다 신호가 어긋나면 억지로 하나로 합치지 말고, 어긋난다는 사실과 각각의 근거를 함께 보여 줍니다.",
      "체계 수만큼 결론을 늘리지 말고, 여러 체계가 겹쳐 가리키는 지점을 먼저 짚습니다.",
      "질문자의 선택권을 흐리지 않고, 상징은 가능성의 언어로 전합니다.",
    ],
    answerSections: [
      "질문의 핵심 정리",
      "체계별 근거와 해석 (고른 체계마다 어떤 값에서 무엇을 읽었는지)",
      "체계 간 겹치는 신호와 어긋나는 신호",
      "상담 기간에 따른 흐름과 주의할 구간",
      "현실적인 선택지와 각각의 대가",
      "오늘부터 할 수 있는 작은 실천",
    ],
    keywords: ["통합", "달빛", "상담", "여러 체계"],
    ready: "ready",
  },
  {
    id: "basic",
    label: "기본 운세",
    shortLabel: "기본",
    description: "오늘이나 특정 기간의 흐름을 부담 없이 살핍니다.",
    detail: "해와 달의 주기처럼 가벼운 일상 운세를 정리해, 지금 확인할 영역과 기간에 맞는 상담 프롬프트를 만듭니다.",
    icon: "☼",
    theme: { accent: "#256b8f", accentStrong: "#164e63", accentSoft: "#dff4ff", surface: "#fffaf0", text: "#122633", motif: "해와 달의 주기, 캘린더" },
    fields: [
      ...COMMON_FIELDS_COPY,
      { id: "targetDate", label: "확인할 날짜 또는 기간", type: "text", required: true, placeholder: "예: 2026년 7월, 이번 주말" },
      { id: "focusArea", label: "관심 영역", type: "multiselect", options: ["일", "연애", "돈", "건강", "관계", "학업"] },
    ],
    exampleValues: {
      topic: "이번 달의 전반적인 흐름",
      question: "이번 달에 집중하면 좋은 일과 조심할 흐름은 무엇인가요?",
      targetDate: "2026년 7월",
      focusArea: ["일", "관계"],
      tone: "차분한 상담",
      depth: "핵심만 짧게",
    },
    generateLabel: "기본 운세 프롬프트 생성하기",
    resultLabel: "완성된 기본 운세 상담 프롬프트",
    emptyState: "날짜와 관심 영역을 정하면 오늘의 빛처럼 가볍고 선명한 상담 프롬프트가 열립니다.",
    role: "일상의 흐름을 쉽고 밝게 짚어 주는 운세 상담가",
    principles: ["무겁지 않은 언어로 안내합니다.", "기간과 관심 영역을 분명히 나눕니다.", "실행 가능한 조언을 우선합니다."],
    answerSections: ["기간의 전체 흐름", "관심 영역별 신호", "피하면 좋은 행동", "가볍게 시도할 일"],
    keywords: ["오늘", "기간", "일상", "가벼운 운세"],
    ready: "ready",
  },
  {
    id: "saju",
    label: "사주/명리학",
    shortLabel: "사주",
    description: "시간과 오행의 구조로 질문의 뿌리를 살핍니다.",
    detail: "한지 위에 명식을 기록하듯 생년월일, 시각, 지역을 정리해 오행과 십성의 흐름을 읽는 프롬프트를 만듭니다.",
    icon: "印",
    theme: { accent: "#b5482b", accentStrong: "#7c2d12", accentSoft: "#ffe5d5", surface: "#fbf6ea", text: "#231915", motif: "오행, 천간지지, 인장" },
    fields: [...COMMON_FIELDS_COPY, ...BIRTH_FIELDS_COPY, GENDER_FIELD_COPY, { id: "focusPillar", label: "중점 영역", type: "select", options: ["성향", "일과 재능", "관계", "재물", "대운 흐름"] }],
    exampleValues: {
      topic: "일과 관계의 균형",
      question: "내 사주에서 지금 일에 힘을 실어도 좋은 시기인지 알고 싶습니다.",
      calendarType: "양력",
      birthDate: "1994-08-17",
      birthTime: "09:20",
      birthPlace: "서울",
      focusPillar: "일과 재능",
      tone: "현실적인 조언",
      depth: "깊고 자세하게",
    },
    generateLabel: "사주/명리 상담 프롬프트 생성하기",
    resultLabel: "완성된 사주/명리 상담 프롬프트",
    emptyState: "생년월일과 질문을 적으면 오행의 균형과 현재 선택의 방향을 읽는 프롬프트가 준비됩니다.",
    role: "오행과 십성의 균형을 차분히 읽는 명리학자",
    principles: ["출생 정보가 불완전하면 단정하지 않습니다.", "오행, 십성, 대운을 구분해 설명합니다.", "강약보다 균형과 보완을 중심에 둡니다."],
    answerSections: ["명식에서 먼저 볼 축", "오행과 십성의 흐름", "현재 질문과 맞닿은 지점", "보완하면 좋은 태도", "현실적인 선택 조언"],
    keywords: ["사주", "명리", "오행", "천간지지"],
    ready: "ready",
  },
  {
    id: "yukhyo",
    label: "육효",
    shortLabel: "육효",
    description: "여섯 효의 변화로 지금 질문의 판단점을 세웁니다.",
    detail: "괘를 얻은 방식과 효의 흐름을 정리해, 변화와 응기를 간결하게 살피는 육효 상담 프롬프트를 만듭니다.",
    icon: "☷",
    theme: { accent: "#9a3412", accentStrong: "#1f2937", accentSoft: "#fef3c7", surface: "#f8f3e8", text: "#171717", motif: "음효·양효 선과 괘" },
    fields: [
      ...COMMON_FIELDS_COPY,
      { id: "drawMethod", label: "괘를 얻은 방식", type: "select", options: ["동전", "숫자", "시간", "직접 입력"] },
      { id: "sixLines", label: "여섯 효 또는 동전 결과", type: "textarea", rows: 4, placeholder: "아래에서 위 순서로 적어 주세요. 예: 소양, 노음, 소음..." },
      { id: "questionTime", label: "질문 시각", type: "datetime-local" },
    ],
    exampleValues: {
      topic: "계약 진행 여부",
      question: "이번 제안을 받아들이는 것이 내게 유리할까요?",
      drawMethod: "동전",
      sixLines: "소양 / 소음 / 노양 / 소음 / 소양 / 노음",
      questionTime: "2026-07-08T21:10",
      tone: "간결한 정리",
      depth: "균형 있게",
    },
    generateLabel: "육효 상담 프롬프트 생성하기",
    resultLabel: "완성된 육효 상담 프롬프트",
    emptyState: "하나의 질문과 괘를 얻은 단서를 적으면 여섯 효의 변화가 판단의 초점으로 정리됩니다.",
    role: "괘와 효의 변화를 절제된 언어로 읽는 육효 상담가",
    principles: ["한 번에 하나의 질문만 다룹니다.", "본괘, 변괘, 동효의 의미를 구분합니다.", "판단은 가능성과 주의점으로 전합니다."],
    answerSections: ["질문의 초점", "본괘의 분위기", "움직이는 효", "변화 뒤의 흐름", "결정 전 확인할 현실 조건"],
    keywords: ["육효", "괘", "동효", "변괘"],
    ready: "ready",
  },
  {
    id: "dangsaju",
    label: "당사주",
    shortLabel: "당사주",
    description: "열두 자리와 생시의 흐름으로 삶의 결을 살핍니다.",
    detail: "12성의 배치를 중심으로 초년부터 말년까지 이어지는 리듬과 지금 질문의 자리를 정리합니다.",
    icon: "⑫",
    theme: { accent: "#b0892f", accentStrong: "#27215f", accentSoft: "#f8e7b0", surface: "#f5f1e8", text: "#17172f", motif: "12궁 원형 궤도" },
    fields: [...COMMON_FIELDS_COPY, ...BIRTH_FIELDS_COPY, { id: "lifeArea", label: "중점 영역", type: "select", options: ["전체 흐름", "초년", "중년", "말년", "관계", "일"] }],
    exampleValues: {
      topic: "관계와 일의 흐름",
      question: "올해 사람들과의 협업이 내게 어떤 방향으로 열릴까요?",
      birthDate: "1992-03-21",
      birthTime: "14:40",
      birthPlace: "부산",
      lifeArea: "관계",
      tone: "차분한 상담",
      depth: "균형 있게",
    },
    generateLabel: "당사주 상담 프롬프트 생성하기",
    resultLabel: "완성된 당사주 상담 프롬프트",
    emptyState: "생년월일과 생시를 적으면 열두 자리의 흐름이 지금의 질문과 연결됩니다.",
    role: "12성의 흐름을 정교하게 풀어내는 당사주 상담가",
    principles: ["12성의 배치를 삶의 시기와 연결합니다.", "고전적 표현을 현대적인 조언으로 풀어냅니다.", "한 사람의 가능성을 좁히지 않습니다."],
    answerSections: ["12성의 중심 흐름", "시기별로 드러나는 결", "현재 질문과 맞물린 자리", "관계와 행동의 조언"],
    keywords: ["당사주", "12성", "생시", "고전"],
    ready: "ready",
  },
  {
    id: "kusei",
    label: "구성기학",
    shortLabel: "구성",
    description: "방향과 시기의 질서를 공간적으로 살핍니다.",
    detail: "구궁 격자와 방위의 흐름을 기준으로 이동, 거주, 시기 선택에 필요한 단서를 정리합니다.",
    icon: "九",
    theme: { accent: "#2f7f78", accentStrong: "#164e63", accentSoft: "#d8f3ee", surface: "#f3f8f2", text: "#132927", motif: "구궁 격자와 나침반" },
    fields: [
      ...COMMON_FIELDS_COPY,
      ...BIRTH_FIELDS_COPY,
      { id: "baseDate", label: "분석 기준일", type: "date", required: true },
      { id: "directionQuestion", label: "이동·방향·거주 질문", type: "textarea", rows: 3, placeholder: "예: 이사 방향, 출장 시기, 자리 이동" },
    ],
    exampleValues: {
      topic: "이사 방향과 시기",
      question: "올해 이사를 한다면 어느 방향과 시기를 조심해서 보면 좋을까요?",
      birthDate: "1990-11-02",
      birthTime: "12:00",
      baseDate: "2026-07-01",
      directionQuestion: "서울 동쪽 지역으로 이동을 고민하고 있습니다.",
      tone: "현실적인 조언",
      depth: "깊고 자세하게",
    },
    generateLabel: "구성기학 상담 프롬프트 생성하기",
    resultLabel: "완성된 구성기학 상담 프롬프트",
    emptyState: "생년월일, 기준일, 이동 질문을 적으면 구궁의 질서가 선택의 방향을 밝혀 줍니다.",
    role: "방위와 시기의 질서를 명료하게 읽는 구성기학 상담가",
    principles: ["방위, 시기, 생활 조건을 함께 봅니다.", "금기보다 조정 가능한 현실 대안을 제안합니다.", "불확실한 계산값은 가능성으로 설명합니다."],
    answerSections: ["본명성과 기준 흐름", "방위에서 살필 신호", "시기 선택의 장단점", "현실적인 조정 방법"],
    keywords: ["구성기학", "구궁", "방위", "이동"],
    ready: "ready",
  },
  {
    id: "psych",
    label: "심리테스트",
    shortLabel: "심리",
    description: "가볍게 자신을 탐색하는 질문을 만듭니다.",
    detail: "말풍선처럼 부담 없는 질문으로 마음의 패턴을 발견하고, 결과 해석까지 이어지는 테스트 프롬프트를 구성합니다.",
    icon: "◇",
    theme: { accent: "#8b5cf6", accentStrong: "#5b3aa4", accentSoft: "#efe5ff", surface: "#f8f5ff", text: "#24143f", motif: "말풍선과 선택 카드" },
    fields: [
      ...COMMON_FIELDS_COPY,
      { id: "testTheme", label: "테스트 주제", type: "text", required: true, placeholder: "예: 관계에서 내가 피곤해지는 순간" },
      { id: "audience", label: "대상", type: "select", options: ["나 자신", "연인", "친구", "팀", "콘텐츠 독자"] },
      { id: "questionCount", label: "문항 수", type: "number", min: 4, max: 20 },
      { id: "resultType", label: "결과 유형", type: "select", options: ["4가지 타입", "5단계 점수", "짧은 리포트", "카드형 결과"] },
    ],
    exampleValues: {
      topic: "관계 성향 테스트",
      question: "내가 가까운 관계에서 어떤 방식으로 마음을 닫는지 알고 싶습니다.",
      testTheme: "관계에서 내가 피곤해지는 순간",
      audience: "나 자신",
      questionCount: "8",
      resultType: "4가지 타입",
      tone: "따뜻한 위로",
      depth: "균형 있게",
    },
    generateLabel: "심리테스트 프롬프트 생성하기",
    resultLabel: "완성된 심리테스트 프롬프트",
    emptyState: "테스트 주제와 대상, 문항 수를 정하면 마음을 가볍게 비추는 질문지가 준비됩니다.",
    role: "부담 없는 질문으로 자기 이해를 돕는 심리테스트 설계자",
    principles: ["낙인찍는 표현을 피합니다.", "질문은 짧고 명확하게 둡니다.", "결과는 위로와 실천으로 이어지게 합니다."],
    answerSections: ["테스트 소개", "문항 구성", "채점 기준", "결과 타입", "타입별 조언"],
    keywords: ["심리", "테스트", "질문", "자기 탐색"],
    ready: "ready",
  },
  {
    id: "tarot",
    label: "타로",
    shortLabel: "타로",
    description: "상징이 담긴 카드로 질문의 흐름을 읽습니다.",
    detail: "카드 프레임 속 별과 달처럼 질문, 스프레드, 뽑은 카드를 정리해 직관적인 상담 프롬프트를 만듭니다.",
    icon: "✷",
    theme: { accent: "#b9974b", accentStrong: "#21143f", accentSoft: "#efe4ff", surface: "#f3eefb", text: "#170f2f", motif: "카드 프레임, 별, 태양과 달" },
    fields: [
      ...COMMON_FIELDS_COPY,
      { id: "spread", label: "스프레드 종류", type: "select", required: true, options: ["원 카드", "3카드", "켈틱 크로스", "관계 스프레드", "직접 지정"] },
      { id: "cardCount", label: "카드 수", type: "number", min: 1, max: 12 },
      { id: "drawnCards", label: "직접 뽑은 카드 및 정·역방향", type: "textarea", rows: 4, placeholder: "예: 1. The Star 정방향, 2. Two of Cups 역방향" },
    ],
    exampleValues: {
      topic: "관계의 다음 흐름",
      question: "상대와 다시 대화를 시작해도 좋을지 알고 싶습니다.",
      spread: "3카드",
      cardCount: "3",
      drawnCards: "1. The Star 정방향\n2. Two of Cups 역방향\n3. Temperance 정방향",
      tone: "상징적인 문장",
      depth: "깊고 자세하게",
    },
    generateLabel: "타로 상담 프롬프트 생성하기",
    resultLabel: "완성된 타로 상담 프롬프트",
    emptyState: "질문과 스프레드, 뽑은 카드를 적으면 카드의 상징이 상담 문장으로 차분히 펼쳐집니다.",
    role: "카드의 상징과 질문자의 마음을 함께 읽는 타로 리더",
    principles: ["카드의 정·역방향을 구분합니다.", "상징을 단정적 예언으로 몰아가지 않습니다.", "질문자의 선택과 대화 가능성을 열어 둡니다."],
    answerSections: ["질문에 어울리는 스프레드", "카드별 상징", "카드 사이의 이야기", "지금 필요한 태도", "현실적인 다음 행동"],
    keywords: ["타로", "스프레드", "카드", "상징"],
    ready: "ready",
  },
  {
    id: "astrology",
    label: "점성술",
    shortLabel: "점성",
    description: "행성과 별자리의 관계를 차트처럼 읽습니다.",
    detail: "출생 차트와 행성의 관계를 정리해, 우주적인 상징과 분석적인 해석이 함께 흐르는 프롬프트를 만듭니다.",
    icon: "♄",
    theme: { accent: "#4f8fd9", accentStrong: "#12294f", accentSoft: "#deecff", surface: "#eef4ff", text: "#101b33", motif: "출생 차트와 행성 궤도" },
    fields: [...COMMON_FIELDS_COPY, ...BIRTH_FIELDS_COPY, BIRTH_TIMEZONE_FIELD_COPY, { id: "analysisArea", label: "분석 영역", type: "select", options: ["성향", "관계", "커리어", "시기", "트랜짓"] }],
    exampleValues: {
      topic: "커리어 전환",
      question: "올해 직업 방향을 바꾸는 선택이 내 차트에서 어떻게 보일까요?",
      birthDate: "1989-06-12",
      birthTime: "22:15",
      birthPlace: "대구",
      analysisArea: "커리어",
      tone: "현실적인 조언",
      depth: "깊고 자세하게",
    },
    generateLabel: "점성술 상담 프롬프트 생성하기",
    resultLabel: "완성된 점성술 상담 프롬프트",
    emptyState: "출생 정보와 분석 영역을 적으면 행성과 별자리의 관계가 질문 위에 놓입니다.",
    role: "행성과 하우스의 관계를 분석적으로 읽는 점성술사",
    principles: ["태양, 달, 상승궁을 구분해 설명합니다.", "하우스와 행성의 상징을 현실 언어로 풀어냅니다.", "트랜짓은 가능성의 흐름으로 안내합니다."],
    answerSections: ["차트에서 먼저 볼 축", "행성·하우스의 신호", "질문과 연결되는 지점", "시기별 가능성", "현실적인 조언"],
    keywords: ["점성술", "차트", "행성", "하우스"],
    ready: "ready",
  },
  {
    id: "vedic",
    label: "베다점",
    shortLabel: "베다",
    description: "전통적인 베다 점성 체계로 흐름을 살핍니다.",
    detail: "사프란빛 만다라처럼 출생 정보와 라그나, 나크샤트라 단서를 정리해 깊고 차분한 프롬프트를 만듭니다.",
    icon: "◈",
    theme: { accent: "#c77720", accentStrong: "#0f5753", accentSoft: "#ffe7bd", surface: "#fff4df", text: "#1f2418", motif: "절제된 만다라와 사각 차트" },
    fields: [...COMMON_FIELDS_COPY, ...BIRTH_FIELDS_COPY, BIRTH_TIMEZONE_FIELD_COPY, { id: "vedicTopic", label: "분석 주제", type: "select", options: ["라그나", "나크샤트라", "다샤", "관계", "커리어"] }, { id: "advancedSettings", label: "고급 설정", type: "textarea", rows: 3, advanced: true, placeholder: "알고 있는 라그나, 나크샤트라, 아야남샤 설정" }],
    exampleValues: {
      topic: "다샤 흐름과 일",
      question: "지금의 일 방향이 장기적으로 이어질 힘이 있는지 알고 싶습니다.",
      birthDate: "1991-12-04",
      birthTime: "06:35",
      birthPlace: "인천",
      vedicTopic: "다샤",
      tone: "차분한 상담",
      depth: "깊고 자세하게",
    },
    generateLabel: "베다점 상담 프롬프트 생성하기",
    resultLabel: "완성된 베다점 상담 프롬프트",
    emptyState: "출생 정보와 베다 점성의 분석 주제를 적으면 깊은 전통의 흐름이 정리됩니다.",
    role: "베다 점성의 전통을 차분히 풀어내는 베다 점성술사",
    principles: ["라그나와 나크샤트라를 구분합니다.", "다샤는 시기의 분위기로 설명합니다.", "전통 용어는 쉬운 말로 덧붙입니다."],
    answerSections: ["베다 차트의 중심", "나크샤트라와 다샤의 흐름", "질문과 연결되는 가능성", "조심할 판단", "실천 조언"],
    keywords: ["베다", "라그나", "나크샤트라", "다샤"],
    ready: "ready",
  },
  {
    id: "ziwei",
    label: "자미두수",
    shortLabel: "자미",
    description: "별과 명궁의 배치를 정밀하게 살핍니다.",
    detail: "명궁 격자에 별을 놓듯 생년월일과 분석 궁을 정리해 권위 있고 섬세한 상담 프롬프트를 만듭니다.",
    icon: "紫",
    theme: { accent: "#9a5baf", accentStrong: "#5b1b6f", accentSoft: "#f0ddff", surface: "#fbf3ff", text: "#241029", motif: "명궁 격자와 별" },
    fields: [...COMMON_FIELDS_COPY, ...BIRTH_FIELDS_COPY, GENDER_FIELD_COPY, { id: "palace", label: "분석 궁", type: "select", options: ["명궁", "재백궁", "관록궁", "부처궁", "복덕궁", "천이궁"] }],
    exampleValues: {
      topic: "직업 방향과 재능",
      question: "내가 오래 가져갈 수 있는 일의 결이 무엇인지 알고 싶습니다.",
      birthDate: "1987-09-10",
      birthTime: "18:05",
      birthPlace: "광주",
      palace: "관록궁",
      tone: "현실적인 조언",
      depth: "깊고 자세하게",
    },
    generateLabel: "자미두수 상담 프롬프트 생성하기",
    resultLabel: "완성된 자미두수 상담 프롬프트",
    emptyState: "출생 정보와 살피고 싶은 궁을 적으면 별과 명궁의 질서가 상담 문장으로 정리됩니다.",
    role: "명궁과 별의 배치를 체계적으로 읽는 자미두수 해석가",
    principles: ["궁과 별의 역할을 분리해 설명합니다.", "권위적인 단정보다 구조적 가능성을 전합니다.", "질문자의 현실 조건을 함께 살핍니다."],
    answerSections: ["중심 궁의 의미", "별의 배치가 비추는 기질", "질문과 연결된 흐름", "강점과 보완점", "현실적인 실행 방향"],
    keywords: ["자미두수", "명궁", "별", "궁"],
    ready: "ready",
  },
  {
    id: "sukuyo",
    label: "숙요점",
    shortLabel: "숙요",
    description: "달의 숙과 관계의 흐름을 섬세하게 봅니다.",
    detail: "달의 위상과 숙의 배열을 바탕으로 나와 상대, 관계의 온도를 정리하는 프롬프트를 만듭니다.",
    icon: "☾",
    theme: { accent: "#6b8fc7", accentStrong: "#24335f", accentSoft: "#e4efff", surface: "#f6f8ff", text: "#14213d", motif: "달의 위상과 숙의 배열" },
    fields: [
      ...COMMON_FIELDS_COPY,
      { id: "calendarType", label: "내 양력/음력", type: "select", options: ["양력", "음력"] },
      { id: "birthDate", label: "내 생년월일", type: "date", required: true, privacyHint: BIRTH_PRIVACY_HINT },
      { id: "birthTime", label: "내 출생 시각", type: "time", advanced: true, privacyHint: BIRTH_PRIVACY_HINT },
      { id: "partnerCalendarType", label: "상대 양력/음력", type: "select", options: ["양력", "음력"] },
      { id: "partnerBirthDate", label: "상대 생년월일", type: "date", privacyHint: BIRTH_PRIVACY_HINT },
      { id: "partnerBirthTime", label: "상대 출생 시각", type: "time", advanced: true, privacyHint: BIRTH_PRIVACY_HINT },
      { id: "relationshipType", label: "관계 유형", type: "select", options: ["연애", "부부", "썸", "친구", "동료", "가족"] },
    ],
    exampleValues: {
      topic: "관계의 거리감",
      question: "상대와 가까워질수록 왜 서로 조심스러워지는지 알고 싶습니다.",
      calendarType: "양력",
      birthDate: "1995-02-14",
      partnerCalendarType: "양력",
      partnerBirthDate: "1993-10-08",
      relationshipType: "연애",
      tone: "따뜻한 위로",
      depth: "균형 있게",
    },
    generateLabel: "숙요점 상담 프롬프트 생성하기",
    resultLabel: "완성된 숙요점 상담 프롬프트",
    emptyState: "나와 상대의 생년월일, 관계 유형을 적으면 달의 숙이 관계의 결을 비춥니다.",
    role: "달의 숙과 관계의 리듬을 섬세하게 읽는 숙요점 상담가",
    principles: ["산출된 본명숙과 구요 관계를 근거로 삼되 다시 계산하지 않습니다.", "상대의 마음을 단정하지 않습니다.", "관계의 거리와 리듬을 중심으로 봅니다.", "상호 존중의 행동을 제안합니다."],
    answerSections: ["나와 상대의 본명숙이 보여주는 기본 결", "구요 관계에서 끌림과 피로가 생기는 지점", "관계의 거리와 대화의 타이밍", "이 관계를 지키기 위한 행동"],
    keywords: ["숙요", "관계", "달", "상성"],
    ready: "ready",
  },
  {
    id: "numerology",
    label: "수비학",
    shortLabel: "수비",
    description: "숫자에 담긴 반복과 패턴을 논리적으로 봅니다.",
    detail: "숫자 그리드와 기하학적 선처럼 생년월일, 이름, 관심 숫자를 정리해 현대적인 상담 프롬프트를 만듭니다.",
    icon: "9",
    theme: { accent: "#2f76d2", accentStrong: "#1f2937", accentSoft: "#dbeafe", surface: "#f8fafc", text: "#111827", motif: "숫자 그리드와 기하학적 선" },
    fields: [
      ...COMMON_FIELDS_COPY,
      { id: "birthDate", label: "생년월일", type: "date", required: true, privacyHint: BIRTH_PRIVACY_HINT },
      { id: "includeName", label: "이름을 함께 반영", type: "checkbox", privacyHint: "이름은 숫자 진동을 정리하는 단서로만 프롬프트에 포함됩니다. 공유 전 이니셜로 바꿔도 좋습니다." },
      { id: "name", label: "이름", type: "text", advanced: true },
      { id: "numberFocus", label: "분석 숫자 또는 관심 주제", type: "text", placeholder: "예: 라이프패스, 7이 반복됨, 이직 시기" },
    ],
    exampleValues: {
      topic: "반복되는 선택 패턴",
      question: "왜 중요한 선택 앞에서 항상 비슷한 망설임이 생기는지 알고 싶습니다.",
      birthDate: "1996-05-29",
      includeName: true,
      name: "민지",
      numberFocus: "라이프패스와 올해 개인년",
      tone: "현실적인 조언",
      depth: "균형 있게",
    },
    generateLabel: "수비학 상담 프롬프트 생성하기",
    resultLabel: "완성된 수비학 상담 프롬프트",
    emptyState: "생년월일과 관심 숫자를 적으면 반복되는 패턴이 선명한 구조로 정리됩니다.",
    role: "숫자의 반복과 리듬을 논리적으로 해석하는 수비학 해석가",
    principles: ["숫자를 성향의 가능성으로 설명합니다.", "반복 패턴과 현재 선택을 연결합니다.", "실천 가능한 행동으로 마무리합니다."],
    answerSections: ["핵심 숫자", "반복되는 패턴", "현재 질문과의 연결", "강점과 과제", "현실적인 조언"],
    keywords: ["수비학", "숫자", "패턴", "라이프패스"],
    ready: "ready",
  },
  {
    id: "dream",
    label: "꿈/상징",
    shortLabel: "꿈",
    description: "꿈속 장면과 감정의 상징을 기록합니다.",
    detail: "흐릿한 물결 속 문을 열듯 꿈의 장면, 등장 인물, 감정과 반복 상징을 선명한 상담 프롬프트로 정리합니다.",
    icon: "⌁",
    theme: { accent: "#4c8ea8", accentStrong: "#1d3265", accentSoft: "#e6f7fb", surface: "#f5f2ff", text: "#14213d", motif: "흐릿한 레이어, 물결, 문" },
    fields: [
      { id: "dreamText", label: "꿈의 내용", type: "textarea", required: true, rows: 5, placeholder: "꿈에서 기억나는 장면을 순서대로 적어 주세요." },
      { id: "mainScenes", label: "주요 장면", type: "text", placeholder: "예: 물가, 닫힌 문, 오래된 집" },
      { id: "characters", label: "등장 인물", type: "text", placeholder: "예: 낯선 사람, 가족, 예전 친구" },
      { id: "emotions", label: "깨어난 뒤 감정", type: "multiselect", options: ["불안", "그리움", "안도", "설렘", "혼란", "슬픔", "해방감"] },
      { id: "symbols", label: "반복된 상징", type: "text", placeholder: "예: 물, 열쇠, 계단, 새" },
      { id: "recentContext", label: "최근 상황", type: "textarea", rows: 3 },
      { id: "tone", label: "원하는 답변 어조", type: "select", options: RESPONSE_TONES },
      { id: "depth", label: "원하는 답변 깊이", type: "select", options: RESPONSE_DEPTHS },
    ],
    exampleValues: {
      dreamText: "낯선 집에서 문을 찾고 있었고, 복도 끝에 물이 차오르는 장면이 선명했습니다.",
      mainScenes: "낯선 집, 긴 복도, 차오르는 물",
      characters: "말없는 어린아이",
      emotions: ["불안", "그리움"],
      symbols: "문, 물, 열쇠",
      recentContext: "최근 큰 결정을 미루고 있고 가족과의 대화가 마음에 남아 있습니다.",
      tone: "따뜻한 위로",
      depth: "균형 있게",
    },
    generateLabel: "꿈/상징 상담 프롬프트 생성하기",
    resultLabel: "완성된 꿈/상징 상담 프롬프트",
    emptyState: "꿈의 장면과 감정을 적으면 흐릿한 상징이 선명한 질문으로 다시 떠오릅니다.",
    role: "꿈의 장면과 감정의 상징을 섬세하게 읽는 꿈 상징 해석가",
    principles: ["꿈을 현실의 확정 예고로 말하지 않습니다.", "상징과 감정을 함께 다룹니다.", "최근 상황과 연결하되 단정하지 않습니다."],
    answerSections: ["꿈의 핵심 장면", "상징별 의미", "감정의 흐름", "최근 상황과의 연결", "기록하거나 실천할 일"],
    keywords: ["꿈", "상징", "무의식", "감정"],
    ready: "ready",
  },
  {
    id: "horary",
    label: "호라리",
    shortLabel: "호라리",
    description: "질문이 떠오른 순간의 시간과 하늘을 봅니다.",
    detail: "시계와 좌표처럼 하나의 명확한 질문, 날짜, 시각, 장소를 정리해 순간성과 정확성이 살아 있는 프롬프트를 만듭니다.",
    icon: "◎",
    theme: { accent: "#b87333", accentStrong: "#172554", accentSoft: "#ffe2c5", surface: "#f8f0e4", text: "#171b2e", motif: "시계, 좌표, 점성 차트" },
    fields: [
      ...COMMON_FIELDS_COPY,
      { id: "horaryQuestion", label: "하나의 명확한 질문", type: "textarea", required: true, rows: 3, help: "예/아니오로 좁힐 수 있을 만큼 선명한 질문이 좋습니다." },
      { id: "questionDateTime", label: "질문이 떠오른 날짜·시각", type: "datetime-local", required: true },
      { id: "questionPlace", label: "질문 장소", type: "text", required: true, placeholder: "예: 서울 강남구" },
    ],
    exampleValues: {
      topic: "제안 수락 여부",
      question: "이번 제안을 받아들이는 것이 나에게 맞을까요?",
      horaryQuestion: "이번 제안을 받아들이는 것이 나에게 맞을까요?",
      questionDateTime: "2026-07-08T20:30",
      questionPlace: "서울 강남구",
      tone: "간결한 정리",
      depth: "균형 있게",
    },
    generateLabel: "호라리 상담 프롬프트 생성하기",
    resultLabel: "완성된 호라리 상담 프롬프트",
    emptyState: "하나의 질문, 떠오른 시각, 장소를 적으면 그 순간의 하늘을 기준으로 프롬프트가 열립니다.",
    role: "질문이 떠오른 순간의 하늘을 읽는 호라리 점성술사",
    principles: ["질문은 하나로 좁혀 다룹니다.", "시각과 장소의 불확실성을 명시합니다.", "판단은 가능성과 조건으로 설명합니다."],
    answerSections: ["질문의 성립 여부", "시각과 장소 기준", "주요 시그니피케이터", "가능성과 장애물", "결정 전 확인할 현실 조건"],
    keywords: ["호라리", "질문 시각", "좌표", "점성"],
    ready: "ready",
  },
  {
    id: "meihua",
    label: "매화역수",
    shortLabel: "매화",
    description: "시간, 수, 자연의 징후로 변화를 관찰합니다.",
    detail: "매화 가지처럼 피어나는 숫자와 징후를 본괘, 호괘, 변괘의 흐름으로 정리합니다.",
    icon: "梅",
    theme: { accent: "#c65777", accentStrong: "#1f2937", accentSoft: "#ffe1ea", surface: "#f7f3eb", text: "#18181b", motif: "매화, 숫자, 괘" },
    fields: [
      ...COMMON_FIELDS_COPY,
      { id: "eventDateTime", label: "사건이나 징후가 발생한 시각", type: "datetime-local", required: true },
      { id: "numberOrSign", label: "숫자 또는 계기", type: "text", required: true, placeholder: "예: 떠오른 숫자 37, 시계 11:11, 문득 본 매화" },
      { id: "observation", label: "관찰한 징후", type: "textarea", rows: 3 },
    ],
    exampleValues: {
      topic: "새로운 제안의 흐름",
      question: "갑자기 들어온 제안이 내게 어떤 변화를 열까요?",
      eventDateTime: "2026-07-08T13:44",
      numberOrSign: "회의 직전 37이라는 숫자를 반복해서 봄",
      observation: "오래 미뤘던 연락이 같은 날 이어졌습니다.",
      tone: "상징적인 문장",
      depth: "균형 있게",
    },
    generateLabel: "매화역수 상담 프롬프트 생성하기",
    resultLabel: "완성된 매화역수 상담 프롬프트",
    emptyState: "질문, 시각, 숫자나 징후를 적으면 변화의 결이 본괘와 변괘의 언어로 정리됩니다.",
    role: "수와 징후에서 변화의 결을 읽는 매화역수 해석가",
    principles: ["징후를 과장하지 않고 관찰의 단서로 봅니다.", "본괘, 호괘, 변괘의 흐름을 나눕니다.", "시적인 표현과 현실 조언의 균형을 지킵니다."],
    answerSections: ["질문의 씨앗", "숫자와 징후의 의미", "본괘와 변괘의 흐름", "전환점", "현실적인 실천"],
    keywords: ["매화역수", "숫자", "징후", "괘"],
    ready: "ready",
  },
];

const toolConfigById = TOOL_REGISTRY_COPY.reduce<Record<ToolId, ToolConfig>>((acc, config) => {
  acc[config.id] = config;
  return acc;
}, {} as Record<ToolId, ToolConfig>);

const toolIdAliases: Record<string, ToolId> = {
  generic: "comprehensive",
  all: "comprehensive",
  lite: "basic",
  psychotest: "psych",
  psychology: "psych",
  meiha: "meihua",
};

type PromptHubCopy = {
  mainHomeAria: string;
  mainHome: string;
  currentTool: string;
  ready: string;
  preparing: string;
  open: string;
  pending: string;
  toolsTitle: string;
  toolsHint: string;
  exploreTitle: string;
  exploreHint: string;
  formEyebrow: string;
  inputSuffix: string;
  requiredBadge: string;
  requiredCount: string;
  requiredInputMessage: string;
  advancedSettings: string;
  generating: string;
  exampleInput: string;
  reset: string;
  resultEyebrow: string;
  lastGenerated: string;
  waitingForInput: string;
  copyDone: string;
  copyPrompt: string;
  chatGptPopupBlocked: string;
  regenerate: string;
  editInput: string;
  collapse: string;
  expandAll: string;
  emptyPromptTitle: string;
  requiredInputPrefix: string;
  mobileToolAria: string;
  missingTranslation: string;
  heroMascotAlt: string;
  gate: PromptHubGateCopy;
  library: {
    title: string;
    count: string;
    save: string;
    saved: string;
    saveFailed: string;
    load: string;
    loadAria: string;
    removeAria: string;
    note: string;
  };
  scopeNoticeTitle: string;
  scopeNoticeBody: string;
  upsellTitle: string;
  upsellLead: string;
  upsellClosestNote: string;
  upsellSecondaryLabel: string;
  upsellCta: string;
  upsellCtaAria: string;
  upsellPriceNote: string;
  upsellProducts: Record<UpsellId, { title: string; desc: string }>;
  text: Record<string, string>;
};

const PROMPT_HUB_COPY_EN: PromptHubCopy = {
  mainHomeAria: "Go to the service home",
  mainHome: "Home",
  currentTool: "Current Tool",
  ready: "Ready to generate",
  preparing: "Preparing",
  open: "Open",
  pending: "Pending",
  toolsTitle: "Prompt Atelier Tools",
  toolsHint: "Selecting any card opens the same tool.",
  exploreTitle: "Browse Fortune Tools",
  exploreHint: "Choosing a tool updates the form and result together.",
  formEyebrow: "Input",
  inputSuffix: "Input",
  requiredBadge: "Required",
  requiredCount: "{count} required",
  requiredInputMessage: "{label} is required.",
  advancedSettings: "Advanced Settings",
  generating: "Computing chart data…",
  exampleInput: "Use Example",
  reset: "Reset",
  resultEyebrow: "Moonlight Result",
  lastGenerated: "Last generated {time}",
  waitingForInput: "Waiting for {tool} input.",
  copyDone: "Copied",
  copyPrompt: "Copy Prompt",
  chatGptPopupBlocked: "Popup blocked. Please allow popups and try again.",
  regenerate: "Generate Again",
  editInput: "Edit Input",
  collapse: "Collapse",
  expandAll: "Expand All",
  emptyPromptTitle: "No prompt has been generated yet",
  requiredInputPrefix: "Required inputs:",
  mobileToolAria: "Select mobile tool",
  missingTranslation: "Translation unavailable",
  heroMascotAlt: "Yeon flower-piglet mascot — Fortune Prompt Hub",
  gate: {
    title: "Start using it for free",
    lead: "You have used your free try. Become a free member and keep building prompts.",
    benefits: [
      "Unlimited prompt generation",
      "Save what you build to your library",
      "Full access to every tool",
      "Free to join — no payment",
    ],
    signup: "Join for free",
    login: "Log in",
    dismiss: "Keep browsing",
    closeAria: "Close",
    note: "We keep what you typed, and finish generating it right after you log in.",
  },
  library: {
    title: "My library",
    count: "{count} saved",
    save: "Save to library",
    saved: "Saved",
    saveFailed: "Could not save — this browser's storage is full.",
    load: "Open",
    loadAria: "Open the saved {tool} prompt",
    removeAria: "Delete the saved {tool} prompt",
    note: "Saved in this browser only. Clearing browser data removes it.",
  },
  scopeNoticeTitle: "Free prompts vs. an expert reading",
  scopeNoticeBody:
    "This hub pours every tradition into one shared frame and writes a general-purpose question from it. Our expert readings are built and tuned per discipline, so the same details take you somewhere far more precise.",
  upsellTitle: "An expert reading built for this subject alone",
  upsellLead:
    "It reaches the details a general-purpose prompt never gets to, and the result stays in your account for you to reopen any time.",
  upsellClosestNote: "No reading matches this tool one to one yet. This is the closest to what you entered.",
  upsellSecondaryLabel: "Another option",
  upsellCta: "Open reading",
  upsellCtaAria: "Open {title}",
  upsellPriceNote: "Price and payment options are shown on each reading's own screen.",
  upsellProducts: {
    lifeBook: {
      title: "Book of Life Expert Reading",
      desc: "Builds your Saju chart for real, then lays out temperament, timing and relationships as one volume.",
    },
    karma: {
      title: "Karma of Destiny Expert Reading",
      desc: "Reads karma and past-life threads together with your calculated Saju chart.",
    },
    newYear: {
      title: "New Year Expert Reading",
      desc: "Calculates the coming year's flow against your chart and walks through it month by month.",
    },
    ziwei: {
      title: "Zi Wei Dou Shu Expert Reading",
      desc: "Places your twelve palaces for real and answers questions palace by palace.",
    },
    astrology: {
      title: "Astrology Expert Reading",
      desc: "Computes your natal chart from an ephemeris and reads the planetary placements in depth.",
    },
    vedic: {
      title: "Vedic Astrology Expert Reading",
      desc: "Derives your rashi and nakshatra precisely and reads them in the traditional Vedic frame.",
    },
    sukuyo: {
      title: "Sukuyo Compatibility Expert Reading",
      desc: "Calculates both people's lunar mansions and reads the angles and rhythm between you.",
    },
    fpti: {
      title: "FPTI Premium Report",
      desc: "Turns your chart into a full personality report instead of a short test result.",
    },
    dreamPsycho: {
      title: "Psychoanalytic Dream Reading",
      desc: "We write the full dream interpretation for you — no pasting into another AI.",
    },
    tarotPrompt: {
      title: "Tarot Prompt Library",
      desc: "Reader-crafted spread scripts and follow-up prompts, far beyond what this free tool assembles.",
    },
    tarotNumber: {
      title: "Numerology Tarot Reading",
      desc: "Pairs your numbers with a tarot spread in a reading kept in your account.",
    },
  },
  text: {
    "종합": "All",
    "사주/명리학": "Saju and Myeongli",
    "당사주": "Dangsaju",
    "구성기학": "Nine Star Ki",
    "심리테스트": "Psychology Test",
    "타로": "Tarot",
    "점성술": "Astrology",
    "베다점": "Vedic Astrology",
    "자미두수": "Zi Wei Dou Shu",
    "숙요점": "Sukuyo",
    "수비학": "Numerology",
    "꿈/상징": "Dreams and Symbols",
    "호라리": "Horary",
    "매화역수": "Meihua Yi Shu",
    "종합 프롬프트": "Comprehensive Prompt",
    "기본 운세": "Basic Fortune",
    "상담 주제": "Reading Topic",
    "구체적인 질문": "Specific Question",
    "상황 설명": "Context",
    "원하는 답변 어조": "Preferred Tone",
    "원하는 답변 깊이": "Preferred Depth",
    "피하고 싶은 표현": "Expressions to Avoid",
    "양력/음력": "Solar or Lunar Calendar",
    "생년월일": "Date of Birth",
    "출생 시각": "Birth Time",
    "출생 지역": "Birthplace",
    "출생지 표준시": "Birthplace Time Zone",
    "출생 시각을 어느 나라 표준시로 적었는지 고릅니다. 해외에서 태어났다면 바꿔 주세요.": "Choose the standard time your birth time was recorded in. Change it if you were born outside Korea.",
    "한국 (UTC+9)": "Korea (UTC+9)",
    "일본 (UTC+9)": "Japan (UTC+9)",
    "중국·홍콩·대만·싱가포르 (UTC+8)": "China, Hong Kong, Taiwan, Singapore (UTC+8)",
    "베트남·태국 (UTC+7)": "Vietnam, Thailand (UTC+7)",
    "인도 (UTC+5:30)": "India (UTC+5:30)",
    "아랍에미리트 (UTC+4)": "United Arab Emirates (UTC+4)",
    "영국 (UTC+0)": "United Kingdom (UTC+0)",
    "중부 유럽 (UTC+1)": "Central Europe (UTC+1)",
    "미국 동부": "US Eastern",
    "미국 중부": "US Central",
    "미국 서부": "US Pacific",
    "캐나다 토론토": "Toronto, Canada",
    "호주 동부": "Australia Eastern",
    "뉴질랜드": "New Zealand",
    "성별": "Gender",
    "윤달 여부": "Leap Month",
    "출생 시각 모름": "Birth Time Unknown",
    "활용할 운세 체계": "Fortune Systems to Use",
    "상담 기간": "Reading Period",
    "출생 정보": "Birth Information",
    "확인할 날짜 또는 기간": "Date or Period to Check",
    "관심 영역": "Area of Interest",
    "중점 영역": "Focus Area",
    "괘를 얻은 방식": "Hexagram Drawing Method",
    "여섯 효 또는 동전 결과": "Six Lines or Coin Results",
    "질문 시각": "Question Time",
    "분석 기준일": "Reference Date",
    "이동·방향·거주 질문": "Move, Direction, or Residence Question",
    "테스트 주제": "Test Theme",
    "대상": "Audience",
    "문항 수": "Number of Questions",
    "결과 유형": "Result Type",
    "스프레드 종류": "Spread Type",
    "카드 수": "Number of Cards",
    "직접 뽑은 카드 및 정·역방향": "Drawn Cards and Upright/Reversed Direction",
    "분석 영역": "Analysis Area",
    "분석 주제": "Analysis Topic",
    "고급 설정": "Advanced Settings",
    "분석 궁": "Palace to Read",
    "내 양력/음력": "My Solar/Lunar Calendar",
    "내 생년월일": "My Date of Birth",
    "내 출생 시각": "My Birth Time",
    "상대 양력/음력": "Partner's Solar/Lunar Calendar",
    "상대 생년월일": "Partner's Date of Birth",
    "상대 출생 시각": "Partner's Birth Time",
    "관계 유형": "Relationship Type",
    "이름을 함께 반영": "Include Name",
    "이름": "Name",
    "분석 숫자 또는 관심 주제": "Number or Topic to Read",
    "꿈의 내용": "Dream Content",
    "주요 장면": "Main Scenes",
    "등장 인물": "People in the Dream",
    "깨어난 뒤 감정": "Feeling After Waking",
    "반복된 상징": "Repeated Symbols",
    "최근 상황": "Recent Context",
    "하나의 명확한 질문": "One Clear Question",
    "질문이 떠오른 날짜·시각": "Date and Time the Question Arose",
    "질문 장소": "Question Location",
    "사건이나 징후가 발생한 시각": "Time of the Event or Sign",
    "숫자 또는 계기": "Number or Trigger",
    "관찰한 징후": "Observed Sign",
    "여러 운세 체계를 한데 엮어 질문의 결을 정돈합니다.": "Gathers several fortune systems into one clear thread for your question.",
    "오늘이나 특정 기간의 흐름을 부담 없이 살핍니다.": "Gently reads the flow of today or a chosen period.",
    "시간과 오행의 구조로 질문의 뿌리를 살핍니다.": "Reads the root of your question through time and the five elements.",
    "여섯 효의 변화로 지금 질문의 판단점을 세웁니다.": "Finds the decision point of your question through the movement of six lines.",
    "열두 자리와 생시의 흐름으로 삶의 결을 살핍니다.": "Reads the texture of life through the twelve seats and birth hour.",
    "방향과 시기의 질서를 공간적으로 살핍니다.": "Reads direction and timing through the order of space.",
    "가볍게 자신을 탐색하는 질문을 만듭니다.": "Creates gentle questions for self-discovery.",
    "상징이 담긴 카드로 질문의 흐름을 읽습니다.": "Reads the flow of a question through symbolic cards.",
    "행성과 별자리의 관계를 차트처럼 읽습니다.": "Reads planets and signs as a living chart.",
    "전통적인 베다 점성 체계로 흐름을 살핍니다.": "Reads the flow through a traditional Vedic astrology frame.",
    "별과 명궁의 배치를 정밀하게 살핍니다.": "Reads the placement of stars and the life palace with care.",
    "달의 숙과 관계의 흐름을 섬세하게 봅니다.": "Gently reads lunar mansions and the rhythm of relationship.",
    "숫자에 담긴 반복과 패턴을 논리적으로 봅니다.": "Reads the repetitions and patterns held in numbers.",
    "꿈속 장면과 감정의 상징을 기록합니다.": "Records the symbols in dream scenes and emotions.",
    "질문이 떠오른 순간의 시간과 하늘을 봅니다.": "Reads the time and sky of the moment your question arose.",
    "시간, 수, 자연의 징후로 변화를 관찰합니다.": "Observes change through time, numbers, and natural signs.",
    "예: 올해의 일과 사랑 흐름": "Example: This year's work and love flow",
    "지금 가장 알고 싶은 마음의 방향을 한 가지로 적어 주세요.": "Write the one direction your heart most wants to understand now.",
    "최근의 흐름, 고민의 배경, 마음에 남은 장면을 적어 주세요.": "Write recent events, the background of your concern, or scenes that stayed with you.",
    "예: 겁을 주는 말, 단정적인 예언": "Example: frightening words, absolute predictions",
    "예: 서울": "Example: Seoul",
    "알고 있는 생년월일, 출생시각, 출생지를 적어 주세요.": "Enter any birth date, birth time, and birthplace you know.",
    "예: 2026년 7월, 이번 주말": "Example: July 2026, this weekend",
    "아래에서 위 순서로 적어 주세요. 예: 소양, 노음, 소음...": "Write from bottom to top. Example: young yang, old yin, young yin...",
    "예: 이사 방향, 출장 시기, 자리 이동": "Example: moving direction, business trip timing, changing seats",
    "예: 관계에서 내가 피곤해지는 순간": "Example: when I get tired in relationships",
    "예: 1. The Star 정방향, 2. Two of Cups 역방향": "Example: 1. The Star upright, 2. Two of Cups reversed",
    "알고 있는 라그나, 나크샤트라, 아야남샤 설정": "Known lagna, nakshatra, or ayanamsha settings",
    "예: 라이프패스, 7이 반복됨, 이직 시기": "Example: life path, repeating 7s, timing for a job change",
    "꿈에서 기억나는 장면을 순서대로 적어 주세요.": "Write the dream scenes you remember in order.",
    "예: 물가, 닫힌 문, 오래된 집": "Example: waterside, closed door, old house",
    "예: 낯선 사람, 가족, 예전 친구": "Example: stranger, family, old friend",
    "예: 물, 열쇠, 계단, 새": "Example: water, key, stairs, bird",
    "예: 서울 강남구": "Example: Gangnam-gu, Seoul",
    "예: 떠오른 숫자 37, 시계 11:11, 문득 본 매화": "Example: the number 37, 11:11 on a clock, a plum blossom you suddenly noticed",
    "차분한 상담": "Calm reading",
    "따뜻한 위로": "Warm comfort",
    "현실적인 조언": "Practical advice",
    "신비로운 문장": "Mystical wording",
    "단호한 정리": "Clear summary",
    "상징적인 문장": "Symbolic wording",
    "간결한 정리": "Concise summary",
    "핵심만 짧게": "Brief key points",
    "균형 있게": "Balanced",
    "깊고 자세하게": "Deep and detailed",
    "시간은 HH:mm 형식으로 입력해주세요.": "Enter the time in HH:mm format.",
    "시간 범위를 다시 확인해주세요.": "Please check the time range again.",
    "입력값을 다시 확인해주세요.": "Please check your input again.",
    "구성기학 계산값을 정리하지 못했습니다. 입력값을 다시 확인해 주세요.": "The Nine Star Ki calculation could not be prepared. Please check your input again.",
    "심리테스트 답변을 다시 확인해 주세요.": "Please check your psychology test answers again.",
    "지금 가장 알고 싶은 마음의 방향을 적어 주세요.": "Write the direction your heart most wants to understand now.",
    "생년월일, 출생시간, 출생지처럼 알고 있는 정보를 적어 주세요.": "Write any birth date, birth time, and birthplace you know.",
    "생성된 종합 운세 프롬프트": "Generated comprehensive fortune prompt",
    "예: 이번 계약을 지금 진행해도 괜찮을까요? 상대가 실제로 협조할 마음이 있는지 보고 싶습니다.": "Example: Is it okay to move forward with this contract now? I want to see whether the other side truly intends to cooperate.",
    "무료 육효 상담 프롬프트": "Free Yukhyo reading prompt",
    "예: 지금 이 관계에서 내가 줄여야 할 반응과 더 솔직해져도 되는 지점을 알고 싶어요.": "Example: In this relationship, I want to know what reactions to soften and where I can be more honest.",
    "생성된 심리테스트 기반 전문가 상담 프롬프트": "Generated AI reading prompt based on the psychology test",
    "남자": "Male",
    "여자": "Female",
    "양력": "Solar",
    "음력": "Lunar",
    "예: 관계와 일 흐름에서 지금 줄여야 할 태도는 무엇일까요?": "Example: What attitude should I soften now in relationships and work?",
    "생성된 구성기학 리딩 프롬프트": "Generated Nine Star Ki reading prompt",
    "이번 달 안에 그 사람에게서 먼저 연락이 올까?": "Will that person contact me first within this month?",
    "생성된 호라리 프롬프트": "Generated horary prompt",
    "예: 달빛": "Example: Moonlight",
    "선택 안 함": "Not selected",
    "여성": "Female",
    "남성": "Male",
    "기타/비공개": "Other or private",
    "예: 지금 시작하려는 일이 나에게 맞는 흐름일까?": "Example: Is what I am about to begin aligned with my current flow?",
    "예: 이 관계를 다시 이어가도 서로에게 안정적일까?": "Example: Would reconnecting this relationship be stable for both of us?",
    "생성된 매화역수 프롬프트": "Generated Meihua Yi Shu prompt",
    "기타": "Other",
    "음력 윤달": "Lunar leap month",
    "A 정보": "A Information",
    "B 정보": "B Information",
    "이름 또는 별칭": "Name or nickname",
    "성별 선택 안 함": "Gender not selected",
    "예: 앞으로 일과 재물 흐름에서 내가 조심해야 할 반복 패턴은 무엇일까?": "Example: What repeating pattern should I watch in my future work and money flow?",
    "생성된 당사주 프롬프트": "Generated Dangsaju prompt",
    "예: 달궁은 계산하지 못했습니다. 기존 차트에서 금성이 강하다는 말을 들었습니다.": "Example: I could not calculate the moon palace. I was told Venus is strong in my existing chart.",
    "예: 앞으로 일과 관계에서 내가 가장 조심해야 할 흐름은 무엇일까?": "Example: What flow should I be most careful with in work and relationships going forward?",
    "생성된 무료 기본 운세 프롬프트": "Generated free basic fortune prompt",
    "달빛 아래 흩어진 단서를 모으듯 사주, 타로, 점성술, 상징 해석을 함께 다루는 범용 상담 프롬프트입니다.": "A general-purpose reading prompt that gathers saju, tarot, astrology, and symbolic interpretation together, like collecting scattered clues under moonlight.",
    "해와 달의 주기처럼 가벼운 일상 운세를 정리해, 지금 확인할 영역과 기간에 맞는 상담 프롬프트를 만듭니다.": "Organizes a light daily fortune like the cycle of sun and moon, building a reading prompt matched to the area and period you want to check now.",
    "한지 위에 명식을 기록하듯 생년월일, 시각, 지역을 정리해 오행과 십성의 흐름을 읽는 프롬프트를 만듭니다.": "Records your birth chart like ink on hanji paper, organizing your birth date, time, and place into a prompt that reads the flow of the five elements and ten gods.",
    "괘를 얻은 방식과 효의 흐름을 정리해, 변화와 응기를 간결하게 살피는 육효 상담 프롬프트를 만듭니다.": "Organizes how you drew the hexagram and the movement of its lines into a concise Yukhyo reading prompt that examines change and timing.",
    "12성의 배치를 중심으로 초년부터 말년까지 이어지는 리듬과 지금 질문의 자리를 정리합니다.": "Centers on the placement of the twelve stars to organize the rhythm from early life to later years and where your current question sits within it.",
    "구궁 격자와 방위의 흐름을 기준으로 이동, 거주, 시기 선택에 필요한 단서를 정리합니다.": "Organizes the clues needed for moving, choosing a residence, or timing decisions, based on the Nine Star Ki grid and the flow of direction.",
    "말풍선처럼 부담 없는 질문으로 마음의 패턴을 발견하고, 결과 해석까지 이어지는 테스트 프롬프트를 구성합니다.": "Builds a test prompt with light, speech-bubble-style questions that uncover patterns of the heart and carry through to result interpretation.",
    "카드 프레임 속 별과 달처럼 질문, 스프레드, 뽑은 카드를 정리해 직관적인 상담 프롬프트를 만듭니다.": "Organizes your question, spread, and drawn cards like stars and a moon inside a card frame, creating an intuitive reading prompt.",
    "출생 차트와 행성의 관계를 정리해, 우주적인 상징과 분석적인 해석이 함께 흐르는 프롬프트를 만듭니다.": "Organizes the relationship between your birth chart and the planets into a prompt where cosmic symbolism and analytical interpretation flow together.",
    "사프란빛 만다라처럼 출생 정보와 라그나, 나크샤트라 단서를 정리해 깊고 차분한 프롬프트를 만듭니다.": "Organizes your birth information along with lagna and nakshatra clues, like a saffron-hued mandala, into a deep and calm prompt.",
    "명궁 격자에 별을 놓듯 생년월일과 분석 궁을 정리해 권위 있고 섬세한 상담 프롬프트를 만듭니다.": "Places your birth date and the palace you want analyzed like stars on a life-palace grid, creating an authoritative and delicate reading prompt.",
    "달의 위상과 숙의 배열을 바탕으로 나와 상대, 관계의 온도를 정리하는 프롬프트를 만듭니다.": "Organizes the temperature of you, your partner, and the relationship based on the moon's phase and the arrangement of lunar mansions.",
    "숫자 그리드와 기하학적 선처럼 생년월일, 이름, 관심 숫자를 정리해 현대적인 상담 프롬프트를 만듭니다.": "Organizes your birth date, name, and numbers of interest like a number grid and geometric lines, creating a modern reading prompt.",
    "흐릿한 물결 속 문을 열듯 꿈의 장면, 등장 인물, 감정과 반복 상징을 선명한 상담 프롬프트로 정리합니다.": "Organizes dream scenes, characters, emotions, and recurring symbols into a clear reading prompt, like opening a door within hazy waves.",
    "시계와 좌표처럼 하나의 명확한 질문, 날짜, 시각, 장소를 정리해 순간성과 정확성이 살아 있는 프롬프트를 만듭니다.": "Organizes one clear question along with its date, time, and place like a clock and coordinates, creating a prompt alive with precision and the moment itself.",
    "매화 가지처럼 피어나는 숫자와 징후를 본괘, 호괘, 변괘의 흐름으로 정리합니다.": "Organizes numbers and signs that bloom like plum blossom branches into the flow of the primary, nuclear, and changing hexagrams.",
    "얇은 궤도와 달빛 점선": "Thin orbits and dotted moonlight lines",
    "해와 달의 주기, 캘린더": "The cycle of sun and moon, a calendar",
    "오행, 천간지지, 인장": "Five elements, heavenly stems and earthly branches, a seal",
    "음효·양효 선과 괘": "Yin and yang lines and hexagrams",
    "12궁 원형 궤도": "A circular orbit of twelve houses",
    "구궁 격자와 나침반": "A Nine Star Ki grid and a compass",
    "말풍선과 선택 카드": "Speech bubbles and choice cards",
    "카드 프레임, 별, 태양과 달": "A card frame, stars, the sun and moon",
    "출생 차트와 행성 궤도": "A birth chart and planetary orbits",
    "절제된 만다라와 사각 차트": "A restrained mandala and a square chart",
    "명궁 격자와 별": "A life-palace grid and stars",
    "달의 위상과 숙의 배열": "The moon's phases and the arrangement of lunar mansions",
    "숫자 그리드와 기하학적 선": "A number grid and geometric lines",
    "흐릿한 레이어, 물결, 문": "Hazy layers, waves, a door",
    "시계, 좌표, 점성 차트": "A clock, coordinates, an astrology chart",
    "매화, 숫자, 괘": "Plum blossoms, numbers, hexagrams",
    "통합": "Integration",
    "달빛": "Moonlight",
    "상담": "Reading",
    "여러 체계": "Multiple systems",
    "오늘": "Today",
    "기간": "Period",
    "일상": "Daily life",
    "가벼운 운세": "Light fortune",
    "사주": "Saju",
    "명리": "Myeongli",
    "오행": "Five Elements",
    "천간지지": "Heavenly Stems and Earthly Branches",
    "육효": "Yukhyo",
    "괘": "Hexagram",
    "동효": "Moving Line",
    "변괘": "Changing Hexagram",
    "12성": "Twelve Stars",
    "생시": "Birth Hour",
    "고전": "Classical",
    "구궁": "Nine Palaces",
    "방위": "Direction",
    "이동": "Movement",
    "심리": "Psychology",
    "테스트": "Test",
    "질문": "Question",
    "자기 탐색": "Self-discovery",
    "스프레드": "Spread",
    "카드": "Card",
    "상징": "Symbol",
    "차트": "Chart",
    "행성": "Planet",
    "하우스": "House",
    "베다": "Vedic",
    "라그나": "Lagna",
    "나크샤트라": "Nakshatra",
    "다샤": "Dasha",
    "명궁": "Life Palace",
    "별": "Star",
    "궁": "Palace",
    "관계": "Relationship",
    "숙요": "Sukuyo",
    "달": "Moon",
    "상성": "Compatibility",
    "숫자": "Number",
    "패턴": "Pattern",
    "라이프패스": "Life Path",
    "꿈": "Dream",
    "무의식": "Unconscious",
    "감정": "Emotion",
    "좌표": "Coordinates",
    "점성": "Astrology",
    "징후": "Sign",
    "입력한 출생 정보는 이 화면에서 프롬프트 문장에만 반영됩니다. 실제 상담에 붙여넣기 전 민감한 정보는 직접 조정해 주세요.": "The birth information you enter is only reflected in the prompt sentence on this screen. Please adjust any sensitive details yourself before pasting it into an actual reading.",
    "정확하지 않다면 고급 설정에서 모름을 선택해 주세요.": "If you're not sure, select Unknown in Advanced Settings.",
    "사주 대운의 순행/역행과 자미두수 명반 배치를 산출하는 데 쓰입니다.": "Used to compute the Saju luck-cycle direction and the Zi Wei Dou Shu chart.",
    "예/아니오로 좁힐 수 있을 만큼 선명한 질문이 좋습니다.": "A question clear enough to be narrowed to yes or no works best.",
    "이름은 숫자 진동을 정리하는 단서로만 프롬프트에 포함됩니다. 공유 전 이니셜로 바꿔도 좋습니다.": "Your name is included in the prompt only as a clue for organizing numerological vibration. Feel free to swap it for your initials before sharing.",
    "이번 주": "This Week",
    "이번 달": "This Month",
    "3개월": "3 Months",
    "올해": "This Year",
    "일": "Work",
    "연애": "Romance",
    "돈": "Money",
    "건강": "Health",
    "학업": "Studies",
    "동전": "Coin",
    "시간": "Time",
    "직접 입력": "Direct Input",
    "성향": "Disposition",
    "일과 재능": "Work and Talent",
    "재물": "Wealth",
    "대운 흐름": "Luck Cycle Flow",
    "전체 흐름": "Overall Flow",
    "초년": "Early Life",
    "중년": "Middle Age",
    "말년": "Later Years",
    "나 자신": "Myself",
    "연인": "Partner",
    "친구": "Friend",
    "팀": "Team",
    "콘텐츠 독자": "Content Readers",
    "4가지 타입": "4 Types",
    "5단계 점수": "5-Level Score",
    "짧은 리포트": "Short Report",
    "카드형 결과": "Card-style Result",
    "원 카드": "One Card",
    "3카드": "3 Cards",
    "켈틱 크로스": "Celtic Cross",
    "관계 스프레드": "Relationship Spread",
    "직접 지정": "Custom",
    "커리어": "Career",
    "시기": "Timing",
    "트랜짓": "Transits",
    "재백궁": "Wealth Palace",
    "관록궁": "Career Palace",
    "부처궁": "Spouse Palace",
    "복덕궁": "Fortune Palace",
    "천이궁": "Travel Palace",
    "부부": "Married Couple",
    "썸": "Situationship",
    "동료": "Colleague",
    "가족": "Family",
    "불안": "Anxiety",
    "그리움": "Longing",
    "안도": "Relief",
    "설렘": "Excitement",
    "혼란": "Confusion",
    "슬픔": "Sadness",
    "해방감": "Sense of Freedom",
    "종합 운세 프롬프트 생성하기": "Generate Comprehensive Fortune Prompt",
    "기본 운세 프롬프트 생성하기": "Generate Basic Fortune Prompt",
    "사주/명리 상담 프롬프트 생성하기": "Generate Saju/Myeongli Reading Prompt",
    "육효 상담 프롬프트 생성하기": "Generate Yukhyo Reading Prompt",
    "당사주 상담 프롬프트 생성하기": "Generate Dangsaju Reading Prompt",
    "구성기학 상담 프롬프트 생성하기": "Generate Nine Star Ki Reading Prompt",
    "심리테스트 프롬프트 생성하기": "Generate Psychology Test Prompt",
    "타로 상담 프롬프트 생성하기": "Generate Tarot Reading Prompt",
    "점성술 상담 프롬프트 생성하기": "Generate Astrology Reading Prompt",
    "베다점 상담 프롬프트 생성하기": "Generate Vedic Astrology Reading Prompt",
    "자미두수 상담 프롬프트 생성하기": "Generate Zi Wei Dou Shu Reading Prompt",
    "숙요점 상담 프롬프트 생성하기": "Generate Sukuyo Reading Prompt",
    "수비학 상담 프롬프트 생성하기": "Generate Numerology Reading Prompt",
    "꿈/상징 상담 프롬프트 생성하기": "Generate Dream and Symbol Reading Prompt",
    "호라리 상담 프롬프트 생성하기": "Generate Horary Reading Prompt",
    "매화역수 상담 프롬프트 생성하기": "Generate Meihua Yi Shu Reading Prompt",
    "완성된 종합 운세 상담 프롬프트": "Completed Comprehensive Fortune Reading Prompt",
    "완성된 기본 운세 상담 프롬프트": "Completed Basic Fortune Reading Prompt",
    "완성된 사주/명리 상담 프롬프트": "Completed Saju/Myeongli Reading Prompt",
    "완성된 육효 상담 프롬프트": "Completed Yukhyo Reading Prompt",
    "완성된 당사주 상담 프롬프트": "Completed Dangsaju Reading Prompt",
    "완성된 구성기학 상담 프롬프트": "Completed Nine Star Ki Reading Prompt",
    "완성된 심리테스트 프롬프트": "Completed Psychology Test Prompt",
    "완성된 타로 상담 프롬프트": "Completed Tarot Reading Prompt",
    "완성된 점성술 상담 프롬프트": "Completed Astrology Reading Prompt",
    "완성된 베다점 상담 프롬프트": "Completed Vedic Astrology Reading Prompt",
    "완성된 자미두수 상담 프롬프트": "Completed Zi Wei Dou Shu Reading Prompt",
    "완성된 숙요점 상담 프롬프트": "Completed Sukuyo Reading Prompt",
    "완성된 수비학 상담 프롬프트": "Completed Numerology Reading Prompt",
    "완성된 꿈/상징 상담 프롬프트": "Completed Dream and Symbol Reading Prompt",
    "완성된 호라리 상담 프롬프트": "Completed Horary Reading Prompt",
    "완성된 매화역수 상담 프롬프트": "Completed Meihua Yi Shu Reading Prompt",
    "질문, 배경, 활용할 체계를 적으면 여러 운세의 언어가 한 문장 안에서 차분히 정돈됩니다.": "Write your question, background, and the systems you want to use, and the language of several fortune systems will settle calmly into one sentence.",
    "날짜와 관심 영역을 정하면 오늘의 빛처럼 가볍고 선명한 상담 프롬프트가 열립니다.": "Set the date and area of interest, and a light, clear reading prompt opens like today's sunlight.",
    "생년월일과 질문을 적으면 오행의 균형과 현재 선택의 방향을 읽는 프롬프트가 준비됩니다.": "Enter your birth date and question, and a prompt reading the balance of the five elements and the direction of your current choice will be ready.",
    "하나의 질문과 괘를 얻은 단서를 적으면 여섯 효의 변화가 판단의 초점으로 정리됩니다.": "Write one question and the clue for how you drew the hexagram, and the movement of the six lines settles into the focus of your decision.",
    "생년월일과 생시를 적으면 열두 자리의 흐름이 지금의 질문과 연결됩니다.": "Enter your birth date and hour, and the flow of the twelve seats connects to your current question.",
    "생년월일, 기준일, 이동 질문을 적으면 구궁의 질서가 선택의 방향을 밝혀 줍니다.": "Enter your birth date, reference date, and your moving question, and the order of the Nine Palaces lights the way for your choice.",
    "테스트 주제와 대상, 문항 수를 정하면 마음을 가볍게 비추는 질문지가 준비됩니다.": "Set the test theme, audience, and number of questions, and a questionnaire that lightly reflects your heart will be ready.",
    "질문과 스프레드, 뽑은 카드를 적으면 카드의 상징이 상담 문장으로 차분히 펼쳐집니다.": "Write your question, spread, and drawn cards, and the cards' symbols unfold calmly into a reading.",
    "출생 정보와 분석 영역을 적으면 행성과 별자리의 관계가 질문 위에 놓입니다.": "Enter your birth information and analysis area, and the relationship between planets and signs is placed over your question.",
    "출생 정보와 베다 점성의 분석 주제를 적으면 깊은 전통의 흐름이 정리됩니다.": "Enter your birth information and the Vedic astrology topic to analyze, and the flow of a deep tradition is organized.",
    "출생 정보와 살피고 싶은 궁을 적으면 별과 명궁의 질서가 상담 문장으로 정리됩니다.": "Enter your birth information and the palace you want to examine, and the order of stars and the life palace organizes into a reading.",
    "나와 상대의 생년월일, 관계 유형을 적으면 달의 숙이 관계의 결을 비춥니다.": "Enter your and your partner's birth dates and relationship type, and the lunar mansions light up the texture of your relationship.",
    "생년월일과 관심 숫자를 적으면 반복되는 패턴이 선명한 구조로 정리됩니다.": "Enter your birth date and the numbers you're curious about, and recurring patterns organize into a clear structure.",
    "꿈의 장면과 감정을 적으면 흐릿한 상징이 선명한 질문으로 다시 떠오릅니다.": "Write the scenes and emotions of your dream, and hazy symbols rise again as a clear question.",
    "하나의 질문, 떠오른 시각, 장소를 적으면 그 순간의 하늘을 기준으로 프롬프트가 열립니다.": "Write one question along with the time and place it arose, and a prompt opens based on the sky at that exact moment.",
    "질문, 시각, 숫자나 징후를 적으면 변화의 결이 본괘와 변괘의 언어로 정리됩니다.": "Write your question, the time, and a number or sign, and the texture of change organizes into the language of the primary and changing hexagrams.",
  },
};

const PROMPT_HUB_COPY_KO: PromptHubCopy = {
  ...PROMPT_HUB_COPY_EN,
  mainHomeAria: "서비스 메인 화면으로 이동",
  mainHome: "메인 화면",
  currentTool: "현재 도구",
  ready: "바로 생성 가능",
  preparing: "준비 중",
  open: "열림",
  pending: "준비",
  toolsTitle: "프롬프트 도구",
  toolsHint: "어느 카드에서 선택해도 같은 도구가 열립니다.",
  exploreTitle: "운세 도구 탐색",
  exploreHint: "선택하면 폼과 결과가 함께 바뀝니다.",
  formEyebrow: "입력 정리",
  inputSuffix: "입력",
  requiredBadge: "필수",
  requiredCount: "{count}개 필수",
  requiredInputMessage: "{label} 입력이 필요합니다.",
  advancedSettings: "고급 설정",
  generating: "산출 데이터 계산 중…",
  exampleInput: "예시 입력",
  reset: "초기화",
  resultEyebrow: "Moonlight Result",
  lastGenerated: "마지막 생성 {time}",
  waitingForInput: "{tool} 입력을 기다리고 있습니다.",
  copyDone: "복사 완료",
  copyPrompt: "프롬프트 복사",
  chatGptPopupBlocked: "팝업이 차단되었습니다. 팝업 허용 후 다시 시도해 주세요.",
  regenerate: "다시 생성",
  editInput: "입력 수정",
  collapse: "접기",
  expandAll: "전체 펼치기",
  emptyPromptTitle: "아직 생성된 프롬프트가 없습니다",
  requiredInputPrefix: "필수 입력:",
  mobileToolAria: "모바일 도구 선택",
  missingTranslation: "번역 문구를 확인해주세요",
  heroMascotAlt: "연이 꽃돼지 마스코트 — 운세 프롬프트 허브",
  gate: {
    title: "무료 이용을 시작해보세요",
    lead: "무료 체험 1회를 사용하셨어요. 무료 회원이 되면 프롬프트를 계속 만들 수 있어요.",
    benefits: [
      "프롬프트 무제한 생성",
      "만든 프롬프트를 보관함에 저장",
      "모든 운세 도구 이용",
      "결제 없이 무료 가입",
    ],
    signup: "무료 회원가입",
    login: "로그인",
    dismiss: "둘러보기 계속",
    closeAria: "닫기",
    note: "작성하신 입력은 그대로 두었다가, 로그인하면 이어서 생성해 드려요.",
  },
  library: {
    title: "내 보관함",
    count: "{count}개 저장됨",
    save: "보관함에 저장",
    saved: "저장 완료",
    saveFailed: "저장하지 못했어요. 이 브라우저의 저장 공간이 가득 찼습니다.",
    load: "불러오기",
    loadAria: "저장한 {tool} 프롬프트 불러오기",
    removeAria: "저장한 {tool} 프롬프트 삭제",
    // 유료 상담의 "계정에 저장" 과 헷갈리지 않도록 저장 위치를 분명히 밝힌다.
    note: "이 기기 브라우저에만 저장돼요. 브라우저 데이터를 지우면 사라집니다.",
  },
  scopeNoticeTitle: "무료 프롬프트와 전문가 상담의 차이",
  scopeNoticeBody:
    "이 허브는 여러 운세를 하나의 공통 틀에 담아 범용 질문 문장을 만듭니다. 전문가 상담은 기능마다 전용으로 설계·조율되어 있어, 같은 정보를 넣어도 훨씬 세밀하고 정확한 해석에 닿습니다.",
  upsellTitle: "이 주제만을 위해 설계된 전문가 상담",
  upsellLead:
    "범용 프롬프트가 닿지 못하는 항목까지 파고들고, 결과는 계정에 저장돼 언제든 다시 열어볼 수 있어요.",
  upsellClosestNote: "이 도구와 1:1로 맞는 상담은 아직 없어요. 입력하신 정보에 가장 가까운 상담입니다.",
  upsellSecondaryLabel: "다른 선택",
  upsellCta: "상담 열기",
  upsellCtaAria: "{title} 열기",
  upsellPriceNote: "가격과 결제 방법은 이동한 상담 화면에서 확인할 수 있어요.",
  upsellProducts: {
    lifeBook: {
      title: "인생의 책 전문가 상담",
      desc: "사주 명식을 실제로 세운 뒤 성향·시기·관계의 흐름을 한 권으로 정리해 드립니다.",
    },
    karma: {
      title: "운명의 업 전문가 상담",
      desc: "계산된 사주 명식 위에서 카르마와 전생의 결을 함께 읽습니다.",
    },
    newYear: {
      title: "신년운세 전문가 상담",
      desc: "다가오는 한 해의 흐름을 명식과 대조해 계산하고 달별로 짚어 드립니다.",
    },
    ziwei: {
      title: "자미두수 전문가 상담",
      desc: "12궁 명반을 실제로 배치한 뒤 궁별 흐름을 문답으로 풀어 드립니다.",
    },
    astrology: {
      title: "점성술 전문가 상담",
      desc: "천체력으로 네이탈 차트를 계산해 행성 배치를 깊이 있게 해석합니다.",
    },
    vedic: {
      title: "베다점 전문가 상담",
      desc: "라시와 나크샤트라를 정밀하게 산출해 전통 베다 관점으로 읽습니다.",
    },
    sukuyo: {
      title: "숙요점 궁합 전문가 상담",
      desc: "두 사람의 27숙을 계산해 관계의 격각과 흐름을 짚어 드립니다.",
    },
    fpti: {
      title: "FPTI 프리미엄 리포트",
      desc: "짧은 테스트 결과 대신 명식을 반영한 성향 리포트 전문을 만들어 드립니다.",
    },
    dreamPsycho: {
      title: "정신분석 해몽",
      desc: "해몽 전문을 저희가 직접 써 드립니다. 다른 AI에 붙여 넣을 필요가 없어요.",
    },
    tarotPrompt: {
      title: "타로 프롬프트 라이브러리",
      desc: "전문가가 다듬은 스프레드별 상담 문장과 후속 조율 지시를 제공합니다. 이 무료 도구가 조립하는 문장보다 훨씬 촘촘합니다.",
    },
    tarotNumber: {
      title: "수비학 타로 리딩",
      desc: "이름과 생년월일의 숫자를 타로 스프레드와 엮어 리딩으로 남겨 드립니다.",
    },
  },
  text: {},
};

const PROMPT_HUB_COPY: Record<LoadingLocale, PromptHubCopy> = {
  ko: PROMPT_HUB_COPY_KO,
  en: PROMPT_HUB_COPY_EN,
  ja: PROMPT_HUB_COPY_EN,
  "zh-CN": PROMPT_HUB_COPY_EN,
  "zh-TW": PROMPT_HUB_COPY_EN,
  vi: PROMPT_HUB_COPY_EN,
  hi: PROMPT_HUB_COPY_EN,
  es: PROMPT_HUB_COPY_EN,
  fr: PROMPT_HUB_COPY_EN,
  de: PROMPT_HUB_COPY_EN,
  nl: PROMPT_HUB_COPY_EN,
  ms: PROMPT_HUB_COPY_EN,
};

function getPromptHubCopy(locale: LoadingLocale) {
  return PROMPT_HUB_COPY[locale] || PROMPT_HUB_COPY.en;
}

function getPromptHubDateLocale(locale: LoadingLocale) {
  if (locale === "ko") return "ko-KR";
  if (locale === "ja") return "ja-JP";
  if (locale === "zh-CN" || locale === "zh-TW") return locale;
  return "en-US";
}

function hasPromptHubLocalCopy(value: string) {
  return /[가-힣ぁ-ゟァ-ヿ一-龯]/u.test(value);
}

function translatePromptHubText(value: string | undefined, locale: LoadingLocale) {
  if (!value || locale === "ko") return value || "";
  const copy = getPromptHubCopy(locale);
  const translated = copy.text[value] || PROMPT_HUB_COPY.en.text[value];
  if (translated) return translated;
  if (hasPromptHubLocalCopy(value)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[i18n:prompt-hub] missing text translation", { locale, value });
    }
    return copy.missingTranslation;
  }
  return value;
}

function normalizeToolId(value: string | null | undefined): ToolId {
  const key = String(value || "").trim().toLowerCase();
  if (key in toolConfigById) return key as ToolId;
  return toolIdAliases[key] || "comprehensive";
}

function getDefaultDraft(config: ToolConfig): ToolDraft {
  return config.fields.reduce<ToolDraft>((draft, field) => {
    if (field.type === "multiselect") draft[field.id] = [];
    else if (field.type === "checkbox") draft[field.id] = false;
    else if (field.type === "select") draft[field.id] = field.options?.[0] || "";
    else draft[field.id] = "";
    return draft;
  }, {});
}

function formatDraftValue(value: ToolDraftValue | undefined) {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  if (typeof value === "boolean") return value ? "예" : "";
  return String(value || "").trim();
}

/**
 * 도구별 확정 산출값 블록. 무거운 엔진(사주 명식 304KB·자미두수 명반)과 서버 왕복(지오코딩·차트)이
 * 들어 있어 전부 await import() 로 지연 로드한다 — 정적 import 로 바꾸면 허브 첫 페인트가 그만큼 늦어진다.
 * 산출기는 전부 실패 시 "" 를 돌려주는 계약이라 여기서 따로 감싸지 않는다(골격 프롬프트로 폴백된다).
 */
async function buildComputedFactsFor(toolId: ToolId, draft: ToolDraft): Promise<string> {
  const birth = {
    birthDate: formatDraftValue(draft.birthDate),
    calendarType: formatDraftValue(draft.calendarType),
    leapMonth: draft.leapMonth === true,
    birthTime: formatDraftValue(draft.birthTime),
    birthTimeUnknown: draft.birthTimeUnknown === true,
    birthPlace: formatDraftValue(draft.birthPlace),
    gender: formatDraftValue(draft.gender),
    birthTimezone: BIRTH_TIMEZONE_BY_LABEL[formatDraftValue(draft.birthTimezone)] || "Asia/Seoul",
  };
  switch (toolId) {
    case "comprehensive": {
      const { buildComprehensivePromptFacts } = await import("./comprehensive-prompt-facts");
      return buildComprehensivePromptFacts({ ...birth, systems: Array.isArray(draft.systems) ? draft.systems : [] });
    }
    case "saju": {
      const { buildSajuPromptFacts } = await import("./saju-prompt-facts");
      return buildSajuPromptFacts(birth);
    }
    case "ziwei": {
      const { buildZiweiPromptFacts } = await import("./ziwei-prompt-facts");
      return buildZiweiPromptFacts({ ...birth, palace: formatDraftValue(draft.palace) }, { scope: "full" });
    }
    case "astrology": {
      const { buildAstrologyPromptFacts } = await import("./astro-prompt-facts");
      return buildAstrologyPromptFacts(birth, { scope: "full" });
    }
    case "vedic": {
      const { buildVedicPromptFacts } = await import("./astro-prompt-facts");
      return buildVedicPromptFacts(birth);
    }
    case "sukuyo":
      return buildSukuyoPromptFacts({
        birthDate: birth.birthDate,
        calendarType: birth.calendarType,
        partnerBirthDate: formatDraftValue(draft.partnerBirthDate),
        partnerCalendarType: formatDraftValue(draft.partnerCalendarType),
        relationshipType: formatDraftValue(draft.relationshipType),
      });
    default:
      return "";
  }
}

function buildStructuredFortunePrompt(config: ToolConfig, values: ToolDraft, computedFacts = "") {
  const filledFields = config.fields
    .map((field) => {
      const value = formatDraftValue(values[field.id]);
      return value ? `- ${field.label}: ${value}` : "";
    })
    .filter(Boolean)
    .join("\n");
  const avoid = formatDraftValue(values.avoid);
  const tone = formatDraftValue(values.tone) || "차분하고 전문적인 상담";
  const depth = formatDraftValue(values.depth) || "균형 있게";
  const selectedSystems = formatDraftValue(values.systems);
  const facts = String(computedFacts || "").trim();

  return [
    `당신은 ${config.role}입니다.`,
    "",
    `선택된 운세 체계: ${selectedSystems || config.label}`,
    `해석 모티프: ${config.theme.motif}`,
    `상담 분위기: ${tone}`,
    `답변 깊이: ${depth}`,
    "",
    "[입력 단서]",
    filledFields || "- 아직 입력된 단서가 적습니다. 부족한 정보는 추정하지 말고 필요한 확인 질문을 먼저 제안해 주세요.",
    avoid ? `\n피해야 할 표현: ${avoid}` : "",
    facts ? `\n${facts}` : "",
    "",
    "[해석 원칙]",
    ...config.principles.map((item) => `- ${item}`),
    facts
      ? "- 위 [산출 데이터]의 명칭·수치·관계는 이미 확정된 값이니 그대로 근거로 삼고, 임의로 바꾸거나 새로 계산하지 않습니다."
      : "",
    "- 입력 단서에 없는 값(생년월일시, 명식, 별자리 등)은 지어내지 말고, 필요하면 계산이 필요하다고 표시하거나 확인 질문을 제안합니다.",
    "- 단정적인 예언, 공포를 주는 표현, 운명을 고정하는 표현은 피합니다.",
    "- 불확실한 내용은 가능성, 경향, 선택지의 언어로 설명합니다.",
    "- 의료, 법률, 투자, 계약 등 전문 판단을 대신하지 않으며 필요한 경우 전문가 상담을 권합니다.",
    "- 질문자가 오늘 실천할 수 있는 현실적인 조언을 포함합니다.",
    "",
    "[답변 구조]",
    ...config.answerSections.map((item, index) => `${index + 1}. ${item}`),
    "",
    "[말투]",
    "전문적이되 차갑지 않게, 신비롭되 과장하지 않게 말해 주세요. 운세의 상징은 질문자가 자기 선택을 더 선명하게 바라보도록 돕는 언어로 전해 주세요.",
  ]
    .filter(Boolean)
    .join("\n");
}

function getInitialDraftsByToolId() {
  return TOOL_REGISTRY_COPY.reduce<Record<ToolId, ToolDraft>>((acc, config) => {
    acc[config.id] = getDefaultDraft(config);
    return acc;
  }, {} as Record<ToolId, ToolDraft>);
}

async function copyTextToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
}

export default function ComprehensivePromptHubPage() {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const copy = getPromptHubCopy(locale);
  const tx = useCallback((value: string | undefined) => translatePromptHubText(value, locale), [locale]);
  const [activeToolId, setActiveToolId] = useState<ToolId>("comprehensive");
  const [draftsByToolId, setDraftsByToolId] = useState<Record<ToolId, ToolDraft>>(getInitialDraftsByToolId);
  const [resultsByToolId, setResultsByToolId] = useState<Record<ToolId, { prompt: string; generatedAt: string } | null>>(
    () =>
      TOOL_REGISTRY_COPY.reduce<Record<ToolId, { prompt: string; generatedAt: string } | null>>((acc, config) => {
        acc[config.id] = null;
        return acc;
      }, {} as Record<ToolId, { prompt: string; generatedAt: string } | null>),
  );
  const [validationAttemptedByToolId, setValidationAttemptedByToolId] = useState<Record<ToolId, boolean>>(
    () =>
      TOOL_REGISTRY_COPY.reduce<Record<ToolId, boolean>>((acc, config) => {
        acc[config.id] = false;
        return acc;
      }, {} as Record<ToolId, boolean>),
  );
  const [expandedResultsByToolId, setExpandedResultsByToolId] = useState<Record<ToolId, boolean>>(
    () =>
      TOOL_REGISTRY_COPY.reduce<Record<ToolId, boolean>>((acc, config) => {
        acc[config.id] = false;
        return acc;
      }, {} as Record<ToolId, boolean>),
  );
  const [copiedToolId, setCopiedToolId] = useState<ToolId | null>(null);
  // 생성이 서버 왕복을 타는 동안 제출 버튼을 잠그는 표시용 상태(실제 인플라이트 판정은 generatingRef).
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatGptPopupBlockedToolId, setChatGptPopupBlockedToolId] = useState<ToolId | null>(null);
  const [heroImageError, setHeroImageError] = useState(false);
  // 좁은 화면에서는 히어로 우상단에 띄우고, lg 부터는 오른쪽 열 안에 흐름 요소로 놓는다.
  // 같은 URL 이라 브라우저는 한 번만 내려받는다.
  const heroMascot = (
    <img
      src="/images/fortune-tea-house/%EB%A7%90%ED%95%98%EB%8A%94%20%EA%BD%83%EB%8F%BC%EC%A7%80%20%EC%97%B0%EC%9D%B43-Photoroom.webp"
      alt={copy.heroMascotAlt}
      className="yeon-hero-sprite-sheet"
      decoding="async"
      loading="lazy"
      onError={() => setHeroImageError(true)}
    />
  );
  const resultPanelRef = useRef<HTMLElement | null>(null);
  const formCardRef = useRef<HTMLElement | null>(null);
  const toolRailRef = useRef<HTMLDivElement | null>(null);
  const [showAllTools, setShowAllTools] = useState(false);
  // 하단 고정 CTA 는 도구 카드를 보고 있을 때만 띄운다. 그러지 않으면 페이지 아래쪽
  // 안내 문단 위에 계속 걸터앉아 본문을 가린다.
  const [isFormCardInView, setIsFormCardInView] = useState(true);
  const auth = useAuthStore();
  // 저장 키를 사용자별로 갈라 두면 계정을 바꿔도 남의 보관함이 보일 수 없다. 게스트는 빈 문자열.
  const libraryOwnerKey = resolveLibraryOwnerKey(auth.user);
  const [loginGateOpen, setLoginGateOpen] = useState(false);
  const [libraryItems, setLibraryItems] = useState<PromptLibraryItem[]>([]);
  const [savedToolId, setSavedToolId] = useState<ToolId | null>(null);
  const [saveFailedToolId, setSaveFailedToolId] = useState<ToolId | null>(null);
  // 게이트를 띄운 이유(생성 시도인지 저장 시도인지)를 로그인 복귀 후에도 이어 가려고 기억한다.
  const gateIntentRef = useRef<PromptHubResumeIntent>("generate");
  const gateCheckRef = useRef(false);
  const generatingRef = useRef(false);
  const resumeHandledRef = useRef(false);
  const localeRef = useRef(locale);
  localeRef.current = locale;

  const currentTool = toolConfigById[activeToolId];
  const currentDraft = draftsByToolId[activeToolId] || getDefaultDraft(currentTool);
  const currentResult = resultsByToolId[activeToolId];
  const missingRequiredFields = currentTool.fields.filter((field) => field.required && !formatDraftValue(currentDraft[field.id]));
  const disabledReason = missingRequiredFields.length
    ? copy.requiredInputMessage.replace("{label}", missingRequiredFields.map((field) => tx(field.label)).join(", "))
    : "";
  const showValidationErrors = validationAttemptedByToolId[activeToolId];
  const isCurrentResultExpanded = expandedResultsByToolId[activeToolId] || false;

  useEffect(() => {
    const syncToolFromUrl = () => {
      const nextToolId = normalizeToolId(new URLSearchParams(window.location.search).get("tool"));
      setActiveToolId(nextToolId);
    };
    syncToolFromUrl();
    window.addEventListener("popstate", syncToolFromUrl);
    return () => window.removeEventListener("popstate", syncToolFromUrl);
  }, []);

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    window.addEventListener("storage", syncLocale);
    return () => {
      window.removeEventListener("cd:locale-ready", syncLocale);
      window.removeEventListener("storage", syncLocale);
    };
  }, []);

  // 활성 칩을 레일 안에서만 가운데로 옮긴다. scrollIntoView 는 조상 스크롤러까지
  // 함께 움직여 마운트 직후 페이지가 튀므로 레일의 scrollLeft 만 직접 만진다.
  useEffect(() => {
    const rail = toolRailRef.current;
    const chip = rail?.querySelector<HTMLElement>(`[data-tool-tab="${activeToolId}"]`);
    if (!rail || !chip) return;
    const target = chip.offsetLeft - (rail.clientWidth - chip.offsetWidth) / 2;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rail.scrollTo({ left: Math.max(0, target), behavior: prefersReducedMotion ? "auto" : "smooth" });
  }, [activeToolId]);

  useEffect(() => {
    const card = formCardRef.current;
    if (!card || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsFormCardInView(entry.isIntersecting),
      { rootMargin: "-72px 0px -96px 0px" },
    );
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  // 로그인·로그아웃·계정 전환이 곧바로 목록에 반영된다. 게스트면 빈 배열.
  useEffect(() => {
    setLibraryItems(libraryOwnerKey ? readLibrary(libraryOwnerKey) : []);
  }, [libraryOwnerKey]);

  // 이 라우트는 전역 헤더가 없는 몰입형이라 AuthWidget 이 뜨지 않는다 — 아무도 인증을 깨우지
  // 않으므로 여기서 직접 깨워야 보관함과 재개가 동작한다. 다만 게스트 첫 방문에서 /api/auth/me 를
  // 쏘고 싶지는 않아, 캐시에 세션 흔적이 있을 때와 로그인 화면을 다녀온 직후에만 확인한다.
  useEffect(() => {
    if (resumeHandledRef.current) return;
    resumeHandledRef.current = true;

    // 스냅샷은 어느 경로로 들어왔든 소비해 남기지 않되, 되살리는 것은 로그인 화면이 붙여 준
    // resume 표식을 달고 돌아왔을 때뿐이다. 이걸 확인하지 않으면 30분 안의 아무 재진입이나
    // (공유 링크의 ?tool= 까지 덮으며) 예전 입력으로 화면을 되돌려 놓는다.
    const wantsResume = new URLSearchParams(window.location.search).has("resume");
    const snapshot = consumeResumeSnapshot();
    stripResumeQueryParam();
    const resuming = wantsResume ? snapshot : null;

    let restored: { toolId: ToolId; draft: ToolDraft } | null = null;
    if (resuming) {
      const toolId = normalizeToolId(resuming.toolId);
      const draft = { ...getDefaultDraft(toolConfigById[toolId]), ...(resuming.draft as ToolDraft) };
      setActiveToolId(toolId);
      setDraftsByToolId((prev) => ({ ...prev, [toolId]: draft }));
      restored = { toolId, draft };
    }

    // 로컬 캐시가 비어 있어도 쿠키 세션만 살아 있는 경우가 있다. 그걸 놓치면 이 라우트에서
    // 회원이 영영 게스트로 취급돼 기기 무료 1회를 태우고 보관함도 못 쓴다.
    if (!resuming && !hasClientAuthHint() && !primeAuthFromCache()) return;

    // 위 ref 가 이미 1회성을 보장하므로 cleanup 에서 취소하지 않는다. StrictMode 의 두 번째
    // 마운트가 첫 실행을 취소해 버리면 개발 환경에서만 재개가 조용히 사라진다.
    void (async () => {
      try {
        // refreshAuth 에는 타임아웃이 없다. 상한이 없으면 재개가 영영 끝나지 않는다.
        await Promise.race([
          refreshAuth({ force: Boolean(resuming), silent: true }),
          new Promise<void>((resolve) => {
            window.setTimeout(resolve, 4000);
          }),
        ]);
      } catch {
        // 확인에 실패해도 게스트로 계속 쓸 수 있다. 입력은 이미 복원해 뒀다.
      }
      if (!restored) return;
      // 로그인을 취소하고 돌아온 경우엔 입력만 되살리고 생성은 하지 않는다.
      if (!getAuthState().isAuthenticated) return;
      const entry = await runPromptGeneration(restored.toolId, restored.draft);
      // 저장하려다 로그인하러 갔던 것이라면, 다시 누르게 하지 않고 저장까지 끝낸다.
      if (resuming?.intent === "save") {
        persistResultToLibrary(resolveLibraryOwnerKey(getAuthState().user), restored.toolId, entry);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateToolQueryParam(toolId: ToolId, mode: "push" | "replace" = "push") {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("tool") === toolId) return;
    url.searchParams.set("tool", toolId);
    if (mode === "replace") window.history.replaceState({}, "", url.toString());
    else window.history.pushState({}, "", url.toString());
  }

  // 재개 표식은 한 번 쓰고 지운다. 남겨 두면 새로고침·공유 링크에서 다시 복원을 시도한다.
  function stripResumeQueryParam() {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("resume")) return;
    url.searchParams.delete("resume");
    window.history.replaceState({}, "", url.toString());
  }

  function selectTool(toolId: ToolId, options: { updateUrl?: boolean; replace?: boolean } = {}) {
    setActiveToolId(toolId);
    setCopiedToolId(null);
    setValidationAttemptedByToolId((prev) => ({ ...prev, [toolId]: false }));
    if (options.updateUrl !== false) updateToolQueryParam(toolId, options.replace ? "replace" : "push");
  }

  function updateCurrentDraft(fieldId: string, value: ToolDraftValue) {
    setDraftsByToolId((prev) => ({
      ...prev,
      [activeToolId]: {
        ...(prev[activeToolId] || getDefaultDraft(currentTool)),
        [fieldId]: value,
      },
    }));
    setCopiedToolId(null);
  }

  function toggleCurrentDraftOption(fieldId: string, option: string) {
    const currentValue = currentDraft[fieldId];
    const values = Array.isArray(currentValue) ? currentValue : [];
    updateCurrentDraft(fieldId, values.includes(option) ? values.filter((item) => item !== option) : [...values, option]);
  }

  /**
   * 입력을 갈아엎을 때 결과도 함께 지운다 — 단, 무료 체험을 이미 쓴 비회원의 결과는 남긴다.
   * 지워 봐야 다시 만들 수단이 없어서, 옆에 붙은 "예시 입력"·"초기화" 를 한 번 잘못 누르면
   * 체험으로 얻은 유일한 결과가 되돌릴 방법 없이 사라진다.
   */
  function clearResultUnlessLastFreeOne(toolId: ToolId) {
    if (!getAuthState().isAuthenticated && !hasFreeGenerationLeft()) return;
    setResultsByToolId((prev) => ({ ...prev, [toolId]: null }));
    setExpandedResultsByToolId((prev) => ({ ...prev, [toolId]: false }));
  }

  function fillCurrentToolExample() {
    setDraftsByToolId((prev) => ({
      ...prev,
      [activeToolId]: {
        ...getDefaultDraft(currentTool),
        ...currentTool.exampleValues,
      },
    }));
    clearResultUnlessLastFreeOne(activeToolId);
    setValidationAttemptedByToolId((prev) => ({ ...prev, [activeToolId]: false }));
    setCopiedToolId(null);
  }

  function resetCurrentToolDraft() {
    setDraftsByToolId((prev) => ({ ...prev, [activeToolId]: getDefaultDraft(currentTool) }));
    clearResultUnlessLastFreeOne(activeToolId);
    setValidationAttemptedByToolId((prev) => ({ ...prev, [activeToolId]: false }));
    setCopiedToolId(null);
  }

  /**
   * 실제 조립부. 재개 흐름에서 setState 직후에도 불려야 해서 toolId·draft 를 인자로 받는다
   * (state 를 읽으면 방금 복원한 값이 아니라 이전 draft 를 집는다).
   */
  async function runPromptGeneration(toolId: ToolId, draft: ToolDraft) {
    const config = toolConfigById[toolId];
    const computedFacts = await buildComputedFactsFor(config.id, draft);
    const entry = {
      prompt: buildStructuredFortunePrompt(config, draft, computedFacts),
      // 재개 흐름은 마운트 시점 클로저로 이 함수를 붙잡으므로 locale 을 ref 로 읽는다.
      // state 를 그대로 쓰면 로케일이 늦게 확정된 화면에서 시각만 다른 언어로 찍힌다.
      generatedAt: new Intl.DateTimeFormat(getPromptHubDateLocale(localeRef.current), {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date()),
    };
    setResultsByToolId((prev) => ({ ...prev, [toolId]: entry }));
    setExpandedResultsByToolId((prev) => ({ ...prev, [toolId]: true }));
    resultPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    return entry;
  }

  /**
   * 생성 진입점. 게이트는 여기 한 곳에만 둔다 — 호출부가 셋(폼 제출·다시 생성·모바일 CTA)이라
   * 각자에 걸면 조건이 서로 어긋난다. 인자를 받지 않는 것도 의도다: 두 호출부가
   * onClick 에 그대로 물려 있어 첫 인자로 이벤트 객체가 들어온다.
   */
  async function generateCurrentToolPrompt() {
    const toolId = activeToolId;
    const config = currentTool;
    const draft = currentDraft;

    // ① 검증이 먼저다. 빈 폼으로 눌렀을 때는 로그인 모달이 아니라 기존 필수입력 안내가 떠야 한다.
    const missingFields = config.fields.filter((field) => field.required && !formatDraftValue(draft[field.id]));
    setValidationAttemptedByToolId((prev) => ({ ...prev, [toolId]: true }));
    setCopiedToolId(null);
    if (missingFields.length) return;

    // 산출값 주입에 서버 왕복(지오코딩·차트)이 들어가 연타가 곧 중복 요청이다. state 는 리렌더 뒤에야
    // 버튼에 닿으므로 인플라이트 판정은 ref 로 하고, state 는 버튼 표시에만 쓴다.
    if (generatingRef.current) return;
    generatingRef.current = true;
    setIsGenerating(true);
    try {
      // ② 로그인 사용자는 무제한 — 카운터를 읽지도 않는다.
      if (getAuthState().isAuthenticated) {
        await runPromptGeneration(toolId, draft);
        return;
      }

      // ③ 무료 체험이 남았으면 인증 왕복 없이 바로 만들어 준다. 첫 방문 경험을 그대로 둔다.
      if (hasFreeGenerationLeft()) {
        await runPromptGeneration(toolId, draft);
        recordFreeGeneration();
        return;
      }

      // ④ 체험을 다 썼다면 게스트로 보이는 로그인 사용자를 먼저 걸러낸다.
      if (await confirmAuthenticated()) {
        await runPromptGeneration(toolId, draft);
        return;
      }
      gateIntentRef.current = "generate";
      setLoginGateOpen(true);
    } finally {
      generatingRef.current = false;
      setIsGenerating(false);
    }
  }

  /**
   * 서버에 다시 물어 인증 여부를 확정한다. authReady 로 한 번만 묻게 막아 두면, 다른 탭에서
   * 로그인하고 돌아온 사용자는 이 탭을 새로고침할 때까지 영영 게이트에 갇힌다. refreshAuth 가
   * 인플라이트 병합과 1.5초 쿨다운을 자체적으로 갖고 있어 연타해도 요청이 늘지 않는다.
   */
  async function confirmAuthenticated() {
    if (getAuthState().isAuthenticated) return true;
    if (gateCheckRef.current) return false;
    gateCheckRef.current = true;
    try {
      // refreshAuth 에는 타임아웃이 없다. 상한을 걸지 않으면 버튼이 영영 반응하지 않는다.
      await Promise.race([
        refreshAuth({ force: false, silent: true }),
        new Promise<void>((resolve) => {
          window.setTimeout(resolve, 4000);
        }),
      ]).catch(() => undefined);
    } finally {
      gateCheckRef.current = false;
    }
    return getAuthState().isAuthenticated;
  }

  function buildPromptHubAuthPath(kind: "login" | "signup") {
    const next = encodeURIComponent(`/fortune/prompt-hub?tool=${activeToolId}&resume=1`);
    // 로그인은 세 파라미터를 모두 받아 주고(auth-store 관례), 가입 화면은 returnTo 를 읽지 않는다.
    return kind === "login"
      ? `/login?next=${next}&returnTo=${next}&redirect=${next}`
      : `/signup?next=${next}&redirect=${next}`;
  }

  function handleGateNavigate() {
    saveResumeSnapshot(activeToolId, currentDraft, gateIntentRef.current);
  }

  /**
   * 실제로 저장소에 남았을 때만 "저장 완료" 를 띄운다. 쿼터가 찼는데도 성공처럼 보이면
   * 사용자는 저장했다고 믿고 떠나고, 새로고침에서 통째로 사라진다.
   */
  function persistResultToLibrary(
    ownerKey: string,
    toolId: ToolId,
    entry: { prompt: string; generatedAt: string },
  ) {
    if (!ownerKey) return;
    const next = saveToLibrary(ownerKey, {
      toolId,
      // 재개 흐름은 마운트 시점 클로저라 tx(useCallback) 대신 최신 로케일로 직접 번역한다.
      toolLabel: translatePromptHubText(toolConfigById[toolId].shortLabel, localeRef.current),
      prompt: entry.prompt,
      generatedAt: entry.generatedAt,
    });
    setLibraryItems(next);
    // saveToLibrary 가 실제로 저장한 형태(길이 절단 포함)와 대조해야 거짓 성공을 걸러낼 수 있다.
    const storedPrompt = entry.prompt.slice(0, PROMPT_HUB_LIBRARY_MAX_PROMPT_CHARS);
    const stored = next.some((item) => item.toolId === toolId && item.prompt === storedPrompt);
    setSaveFailedToolId(stored ? null : toolId);
    if (!stored) return;
    setSavedToolId(toolId);
    window.setTimeout(() => setSavedToolId(null), 1600);
  }

  async function saveCurrentResultToLibrary() {
    if (!currentResult?.prompt) return;
    const result = currentResult;
    if (!libraryOwnerKey) {
      // 캐시가 비어 게스트로 보일 뿐 실제로는 로그인 상태일 수 있다. 확정한 뒤에만 모달을 띄운다.
      if (!(await confirmAuthenticated())) {
        gateIntentRef.current = "save";
        setLoginGateOpen(true);
        return;
      }
      persistResultToLibrary(resolveLibraryOwnerKey(getAuthState().user), activeToolId, result);
      return;
    }
    persistResultToLibrary(libraryOwnerKey, activeToolId, result);
  }

  function loadLibraryItem(item: PromptLibraryItem) {
    const toolId = normalizeToolId(item.toolId);
    selectTool(toolId);
    setResultsByToolId((prev) => ({ ...prev, [toolId]: { prompt: item.prompt, generatedAt: item.generatedAt } }));
    setExpandedResultsByToolId((prev) => ({ ...prev, [toolId]: true }));
    resultPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function copyCurrentToolPrompt() {
    if (!currentResult?.prompt) {
      setValidationAttemptedByToolId((prev) => ({ ...prev, [activeToolId]: true }));
      return;
    }
    await copyTextToClipboard(currentResult.prompt);
    setCopiedToolId(activeToolId);
    window.setTimeout(() => setCopiedToolId(null), 1600);
  }

  async function openCurrentToolPromptInAi(url: string) {
    if (!currentResult?.prompt) {
      setValidationAttemptedByToolId((prev) => ({ ...prev, [activeToolId]: true }));
      return;
    }
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) {
      setChatGptPopupBlockedToolId(activeToolId);
      window.setTimeout(() => setChatGptPopupBlockedToolId(null), 3200);
      return;
    }
    setChatGptPopupBlockedToolId(null);
    await copyCurrentToolPrompt();
  }

  function toggleCurrentResultExpanded() {
    setExpandedResultsByToolId((prev) => ({ ...prev, [activeToolId]: !prev[activeToolId] }));
  }

  function renderToolField(field: FieldConfig) {
    const value = currentDraft[field.id];
    const inputId = `prompt-tool-${activeToolId}-${field.id}`;
    const hasError = showValidationErrors && field.required && !formatDraftValue(value);
    const inputClass =
      "prompt-field min-h-[48px] w-full rounded-xl border bg-[color:var(--field-bg)] px-3.5 text-sm font-medium text-[color:var(--ink-1)] outline-none transition placeholder:text-[color:var(--ink-3)] focus:ring-2 focus:ring-[color:var(--tool-accent-soft)]";
    const inputStyle = {
      borderColor: hasError ? "var(--danger-line)" : "var(--hairline)",
      boxShadow: hasError ? "0 0 0 3px var(--danger-glow)" : undefined,
    };

    return (
      <div key={field.id} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
        {field.type === "checkbox" ? (
          <label
            htmlFor={inputId}
            className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border border-[color:var(--hairline)] bg-[color:var(--field-bg)] px-3.5 text-sm font-bold text-[color:var(--ink-2)] transition focus-within:ring-2 focus-within:ring-[color:var(--tool-accent-soft)]"
          >
            <input
              id={inputId}
              type="checkbox"
              checked={Boolean(value)}
              onChange={(event) => updateCurrentDraft(field.id, event.target.checked)}
              className="h-4 w-4 rounded border-[color:var(--hairline)] accent-[color:var(--tool-accent)]"
            />
            {tx(field.label)}
          </label>
        ) : (
          <label htmlFor={inputId} className="grid gap-2 text-sm font-bold text-[color:var(--ink-1)]">
            <span className="flex flex-wrap items-center gap-2">
              {tx(field.label)}
              {field.required ? <span className="text-xs font-black text-[color:var(--tool-accent)]">{copy.requiredBadge}</span> : null}
            </span>
            {field.type === "textarea" ? (
              <textarea
                id={inputId}
                value={String(value || "")}
                onChange={(event) => updateCurrentDraft(field.id, event.target.value)}
                rows={field.rows || 3}
                placeholder={tx(field.placeholder)}
                aria-invalid={hasError}
                aria-describedby={`${inputId}-hint`}
                className={`${inputClass} min-h-[112px] resize-y py-3 leading-6`}
                style={inputStyle}
              />
            ) : field.type === "select" ? (
              <select
                id={inputId}
                value={String(value || field.options?.[0] || "")}
                onChange={(event) => updateCurrentDraft(field.id, event.target.value)}
                aria-invalid={hasError}
                aria-describedby={`${inputId}-hint`}
                className={inputClass}
                style={inputStyle}
              >
                {(field.options || []).map((option) => (
                  <option key={option} value={option}>
                    {tx(option)}
                  </option>
                ))}
              </select>
            ) : field.type === "multiselect" ? (
              <div id={inputId} className="flex flex-wrap gap-2" aria-describedby={`${inputId}-hint`}>
                {(field.options || []).map((option) => {
                  const values = Array.isArray(value) ? value : [];
                  const selected = values.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleCurrentDraftOption(field.id, option)}
                      className={`option-chip inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-[color:var(--tool-accent-soft)] ${
                        selected
                          ? "border-[color:var(--tool-accent)] bg-[color:var(--tool-accent-soft)] text-[color:var(--tool-ink)]"
                          : "border-[color:var(--hairline)] bg-[color:var(--field-bg)] text-[color:var(--ink-2)]"
                      }`}
                    >
                      {selected ? <Check size={14} /> : <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--ink-3)]" />}
                      {tx(option)}
                    </button>
                  );
                })}
              </div>
            ) : (
              <input
                id={inputId}
                type={field.type}
                value={String(value || "")}
                min={field.min}
                max={field.max}
                onChange={(event) => updateCurrentDraft(field.id, event.target.value)}
                placeholder={tx(field.placeholder)}
                aria-invalid={hasError}
                aria-describedby={`${inputId}-hint`}
                className={inputClass}
                style={inputStyle}
              />
            )}
          </label>
        )}
        <div id={`${inputId}-hint`} className="mt-1.5 min-h-[18px] text-xs font-medium leading-5 text-[color:var(--ink-3)]">
          {hasError ? (
            <span className="font-bold text-[color:var(--danger-ink)]">{copy.requiredInputMessage.replace("{label}", tx(field.label))}</span>
          ) : field.privacyHint ? (
            <span>{tx(field.privacyHint)}</span>
          ) : field.help ? (
            <span>{tx(field.help)}</span>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <main
      className="prompt-hub-root relative text-[color:var(--ink-2)] antialiased selection:bg-[color:var(--tool-accent-soft)] selection:text-[color:var(--ink-1)]"
      style={
        {
          "--tool-accent-raw": currentTool.theme.accent,
          "--tool-strong-raw": currentTool.theme.accentStrong,
          "--tool-soft-raw": currentTool.theme.accentSoft,
          "--tool-surface-raw": currentTool.theme.surface,
          "--tool-ink-raw": currentTool.theme.text,
        } as React.CSSProperties
      }
    >
      <style>{`
        .prompt-hub-root {
          font-family: "SUIT", Pretendard, "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          font-kerning: normal;
          font-variant-numeric: tabular-nums;
          word-break: keep-all;
          letter-spacing: 0;

          /* 연이 Light — DESIGN.md 크림/로즈 정본 */
          --ink-1: #24151b;
          --ink-2: #3c1830;
          --ink-3: #70445c;
          --surface-1: #ffffff;
          --surface-2: #fffaf7;
          --surface-3: #fff3f8;
          --field-bg: #ffffff;
          --hairline: rgba(179, 25, 85, 0.18);
          --code-bg: #2b0b1d;
          --code-ink: #ffeaf3;
          --danger-line: #e11d48;
          --danger-glow: rgba(225, 29, 72, 0.12);
          --danger-ink: #9f1239;
          --gold: #ead089;
          --on-accent-strong: #ffffff;
          --lift: 0 12px 24px rgba(150, 72, 104, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9);

          /* 도구별 색은 인라인 style 이 raw 값만 넘기고, 모드별 파생은 여기서 한다 */
          --tool-accent: var(--tool-accent-raw);
          --tool-accent-strong: var(--tool-strong-raw);
          --tool-accent-soft: var(--tool-soft-raw);
          --tool-surface: var(--tool-surface-raw);
          --tool-ink: var(--tool-ink-raw);
        }
        /* 연이 Dark(핑크 다크) — 표면·텍스트·테두리·강조를 한 세트로 함께 교체한다.
           네이비/퍼플로 새면 네오가 되므로 딥 플럼·버건디 범위를 벗어나지 않는다. */
        @media (prefers-color-scheme: dark) {
          .prompt-hub-root {
            --ink-1: #fff1f7;
            --ink-2: rgba(255, 241, 247, 0.94);
            --ink-3: rgba(255, 214, 232, 0.86);
            --surface-1: #3a0e28;
            --surface-2: #330c23;
            --surface-3: #24081a;
            --field-bg: #2d0a1f;
            --hairline: rgba(244, 190, 209, 0.38);
            --code-bg: #1c0512;
            --code-ink: #ffeaf3;
            --danger-line: #ff7a9c;
            --danger-glow: rgba(255, 122, 156, 0.18);
            --danger-ink: #ffb3c7;
            --on-accent-strong: #24081a;
            --lift: 0 14px 30px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255, 214, 232, 0.12);

            --tool-accent: color-mix(in srgb, var(--tool-accent-raw) 42%, #ffd0e4);
            --tool-accent-strong: color-mix(in srgb, var(--tool-accent-raw) 34%, #ffd8e8);
            --tool-accent-soft: color-mix(in srgb, var(--tool-accent-raw) 30%, #24081a);
            --tool-surface: #3a0e28;
            --tool-ink: #fff1f7;
          }
        }
        .prompt-hub-root textarea,
        .prompt-hub-root input,
        .prompt-hub-root select,
        .prompt-hub-root button {
          font: inherit;
        }
        .prompt-hub-root textarea,
        .prompt-hub-root input {
          word-break: break-word;
        }
        /* iOS Safari 는 16px 미만 입력에 포커스하면 화면을 확대한다. 폼을 채우는 내내
           화면이 튀므로 좁은 화면에서는 실제 글자 크기를 16px 로 고정한다. */
        @media (max-width: 1023px) {
          .prompt-hub-root .prompt-field {
            font-size: 16px;
          }
        }
        .atelier-heading {
          font-family: "MaruBuri", "Noto Serif KR", "Nanum Myeongjo", "Apple SD Gothic Neo", Georgia, serif;
          font-weight: 800;
          letter-spacing: 0;
        }
        .lunar-glass {
          position: relative;
          isolation: isolate;
          overflow: hidden;
        }
        .lunar-glass::before {
          content: "";
          position: absolute;
          inset: 1px;
          border-radius: inherit;
          pointer-events: none;
          background:
            linear-gradient(135deg, rgba(255,255,255,.78), transparent 32%, rgba(253,230,138,.24) 62%, transparent),
            radial-gradient(circle at 18% 0%, rgba(251,207,232,.24), transparent 35%);
          opacity: .9;
          z-index: -1;
        }
        .lunar-glass::after {
          content: "";
          position: absolute;
          left: 16%;
          right: 16%;
          top: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(244,114,182,.28), rgba(253,230,138,.46), transparent);
          opacity: .8;
        }
        .moon-disc {
          box-shadow: 0 0 92px rgba(253,230,138,.34), 0 26px 86px rgba(244,114,182,.16), inset -18px -12px 32px rgba(156,103,255,.18);
        }
        .moon-disc::before {
          content: "";
          position: absolute;
          inset: 18%;
          border-radius: 999px;
          background: radial-gradient(circle at 34% 28%, rgba(255,255,255,.64), transparent 18%), radial-gradient(circle at 68% 62%, rgba(255,255,255,.32), transparent 16%);
          opacity: .55;
        }
        .moon-lotus {
          display: block;
          width: min(176px, 48vw);
          height: auto;
          overflow: visible;
          filter: drop-shadow(0 22px 54px rgba(244,114,182,.22)) drop-shadow(0 0 34px rgba(253,230,138,.16));
        }
        .moon-lotus .lotus-petal {
          transform-box: fill-box;
          transform-origin: center bottom;
        }
        .moon-lotus .lotus-ray {
          transform-box: fill-box;
          transform-origin: center;
        }
        @media (prefers-reduced-motion: no-preference) {
          .moon-petal { animation: moonPetalDrift 14s ease-in-out infinite alternate; }
          .moon-petal:nth-child(2) { animation-delay: -4s; }
          .moon-petal:nth-child(3) { animation-delay: -8s; }
          .premium-glow { animation: premiumGlowPulse 8s ease-in-out infinite; }
          .moon-lotus { animation: lotusFloat 9s ease-in-out infinite alternate; }
          .moon-lotus .lotus-petal { animation: lotusPetalGlow 7s ease-in-out infinite alternate; }
          .moon-lotus .lotus-petal:nth-of-type(2n) { animation-delay: -2.2s; }
          .moon-lotus .lotus-ray { animation: lotusRayPulse 8s ease-in-out infinite; }
        }
        @keyframes moonPetalDrift {
          from { transform: translate3d(0, 0, 0) rotate(0deg); opacity: .42; }
          to { transform: translate3d(18px, -26px, 0) rotate(9deg); opacity: .76; }
        }
        /* filter: blur() 를 매 프레임 다시 계산하면 중급 안드로이드에서 스크롤이 끊긴다.
           합성만으로 끝나는 opacity 로 같은 인상을 낸다. */
        @keyframes premiumGlowPulse {
          0%, 100% { opacity: .58; }
          50% { opacity: .92; }
        }
        @keyframes lotusFloat {
          from { transform: translate3d(0, 0, 0) rotate(-2deg); }
          to { transform: translate3d(0, -10px, 0) rotate(3deg); }
        }
        @keyframes lotusPetalGlow {
          from { opacity: .78; }
          to { opacity: 1; }
        }
        @keyframes lotusRayPulse {
          0%, 100% { opacity: .34; transform: scale(.98); }
          50% { opacity: .62; transform: scale(1.04); }
        }
        .yeon-hero-sprite {
          pointer-events: none;
          aspect-ratio: 282 / 338;
          overflow: hidden;
          opacity: 0.94;
          filter: drop-shadow(0 16px 28px rgba(244, 114, 182, 0.28));
          animation: yeonHeroFloat 5.6s ease-in-out infinite;
        }
        .yeon-hero-sprite-sheet {
          position: absolute;
          left: calc(44 / 282 * -100%);
          top: calc(24 / 338 * -100%);
          width: calc(1254 / 282 * 100%);
          height: calc(1254 / 338 * 100%);
          max-width: none;
          object-fit: fill;
        }
        @keyframes yeonHeroFloat {
          0%, 100% { transform: translateY(0) rotate(-1deg); }
          50% { transform: translateY(-8px) rotate(1.6deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .yeon-hero-sprite { animation: none; }
        }

        /* ── 배경 무대 ─────────────────────────────────────────────
           Tailwind arbitrary value 로는 다크 대응이 안 되므로 클래스로 뺀다. */
        .prompt-hub-scene__base {
          background:
            radial-gradient(circle at 18% 10%, rgba(251,207,232,.42), transparent 28%),
            radial-gradient(circle at 82% 8%, rgba(253,230,138,.36), transparent 24%),
            radial-gradient(circle at 86% 32%, rgba(244,190,209,.42), transparent 30%),
            radial-gradient(circle at 48% 100%, rgba(244,114,182,.18), transparent 38%),
            linear-gradient(180deg, #fffaf2 0%, #fff4f8 36%, #fff0f6 70%, #fff8ef 100%);
        }
        .prompt-hub-scene__stars {
          opacity: .42;
          background-image:
            radial-gradient(circle at 20% 18%, rgba(179,25,85,.34) 0 1px, transparent 1.5px),
            radial-gradient(circle at 76% 28%, rgba(234,208,137,.5) 0 1px, transparent 1.5px),
            radial-gradient(circle at 42% 68%, rgba(179,25,85,.22) 0 1px, transparent 1.5px),
            radial-gradient(circle at 88% 72%, rgba(244,114,182,.3) 0 1px, transparent 1.5px),
            radial-gradient(circle at 11% 72%, rgba(234,208,137,.4) 0 1px, transparent 1.5px);
        }
        .prompt-hub-scene__hem { background: linear-gradient(0deg, rgba(255,248,239,.94), transparent); }
        .prompt-hub-scene__sheen { background: linear-gradient(115deg, rgba(255,255,255,.5), transparent 28%, rgba(255,255,255,.2) 62%, transparent); }
        @media (prefers-color-scheme: dark) {
          .prompt-hub-scene__base {
            background:
              radial-gradient(circle at 18% 10%, rgba(174,45,104,.34), transparent 30%),
              radial-gradient(circle at 82% 8%, rgba(234,208,137,.16), transparent 26%),
              radial-gradient(circle at 86% 32%, rgba(179,25,85,.26), transparent 32%),
              linear-gradient(180deg, #3a0e28 0%, #2e0b20 38%, #24081a 100%);
          }
          .prompt-hub-scene__stars { opacity: .5; }
          .prompt-hub-scene__hem { background: linear-gradient(0deg, rgba(36,8,26,.94), transparent); }
          .prompt-hub-scene__sheen { background: linear-gradient(115deg, rgba(255,214,232,.08), transparent 30%, rgba(255,214,232,.04) 62%, transparent); }
          .moon-disc { box-shadow: 0 0 92px rgba(234,208,137,.18), 0 26px 86px rgba(174,45,104,.28); }
        }
        /* 좁은 화면에서는 장식 광원을 절반만 켠다 — 없어도 인상은 남고 스크롤은 가벼워진다 */
        @media (max-width: 640px) {
          .prompt-hub-scene__spare { display: none; }
        }

        /* ── 도구 레일 ───────────────────────────────────────────── */
        .tool-rail {
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          -webkit-mask-image: linear-gradient(90deg, transparent, #000 20px, #000 calc(100% - 26px), transparent);
          mask-image: linear-gradient(90deg, transparent, #000 20px, #000 calc(100% - 26px), transparent);
        }
        .tool-rail::-webkit-scrollbar { display: none; }
        .tool-rail > * { scroll-snap-align: center; }

        /* ── 하단 고정 CTA ───────────────────────────────────────── */
        .prompt-hub-cta {
          /* 하단 네비(.cd-mnav) 위로 올라온다. 네비가 없으면 --cd-mnav-offset 이 0 이라 바닥에 붙는다. */
          bottom: var(--cd-mnav-offset, 0px);
          padding-bottom: calc(12px + max(0px, env(safe-area-inset-bottom, 0px) - var(--cd-mnav-offset, 0px)));
          transition: transform 260ms cubic-bezier(.22,1,.36,1), opacity 200ms ease-out;
        }
        .prompt-hub-cta[data-visible="false"] {
          transform: translateY(115%);
          opacity: 0;
          pointer-events: none;
        }

        /* ── 마감 모션 ───────────────────────────────────────────── */
        @keyframes toolSwap {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes goldSweep {
          from { transform: scaleX(0); opacity: 0; }
          40% { opacity: 1; }
          to { transform: scaleX(1); opacity: 0; }
        }
        .tool-swap { animation: toolSwap 240ms cubic-bezier(.22,1,.36,1) both; }
        .result-sweep {
          transform-origin: left center;
          background: linear-gradient(90deg, transparent, var(--gold), transparent);
          animation: goldSweep 900ms cubic-bezier(.22,1,.36,1) both;
        }
        .copy-mark { transition: transform 200ms cubic-bezier(.22,1,.36,1); }
        .option-chip { transition: background-color 160ms ease-out, border-color 160ms ease-out, color 160ms ease-out; }

        /* 유료 상담 진열대. 평상시엔 플랫하게 두고 hover/focus 에서만 골드 글로우를 켠다
           (DESIGN.md Glow-Not-Shadow). 골드는 테두리·글로우 같은 보조 포인트로만 쓰고
           CTA 배경은 도구 강조색을 유지한다(One Accent Rule). */
        .upsell-feature { transition: box-shadow 260ms cubic-bezier(.22,1,.36,1); }
        .upsell-feature:hover, .upsell-feature:focus-within {
          /* 테두리를 굵히는 대신 인셋 링으로 겹쳐 레이아웃을 밀지 않는다. */
          box-shadow: inset 0 0 0 1px var(--gold), 0 0 34px -10px rgba(234, 208, 137, 0.55);
        }
        /* 라이트 모드에서 골드가 실제로 읽히는 유일한 자리 — 짙은 강조색 버튼 위의 1px 파이핑.
           흰 표면 위에서는 골드가 1.5:1 이라 선으로 쓰면 사라진다. 면을 골드로 채우지는
           않는다(DESIGN.md One Accent Rule — 골드는 보조 포인트). */
        .upsell-cta {
          transition: transform 200ms cubic-bezier(.22,1,.36,1), box-shadow 240ms ease-out;
          box-shadow: inset 0 0 0 1px rgba(234, 208, 137, 0.45);
        }
        .upsell-cta:hover {
          transform: translateY(-1px);
          box-shadow: inset 0 0 0 1px rgba(234, 208, 137, 0.85), 0 0 26px -8px rgba(234, 208, 137, 0.5);
        }
        .upsell-cta:active { transform: translateY(0) scale(.988); box-shadow: inset 0 0 0 1px rgba(234, 208, 137, 0.85); }
        @media (prefers-color-scheme: dark) {
          /* 다크에서는 버튼 면이 파스텔이라 골드 파이핑이 안 읽힌다 — 링은 잉크로 바꾸고
             골드는 글로우 쪽으로 자리를 옮긴다. */
          .upsell-cta { box-shadow: inset 0 0 0 1px rgba(36, 8, 26, 0.24); }
          .upsell-cta:hover { box-shadow: inset 0 0 0 1px rgba(36, 8, 26, 0.44), 0 0 26px -8px rgba(234, 208, 137, 0.45); }
          .upsell-cta:active { box-shadow: inset 0 0 0 1px rgba(36, 8, 26, 0.44); }
        }

        @media (prefers-reduced-motion: reduce) {
          .prompt-hub-cta { transition: none; }
          .tool-swap, .result-sweep, .copy-mark { animation: none; transition: none; }
          .upsell-feature, .upsell-cta { transition: none; }
          .upsell-cta:hover, .upsell-cta:active { transform: none; }
          .premium-glow, .moon-petal, .moon-lotus, .moon-lotus .lotus-petal, .moon-lotus .lotus-ray { animation: none !important; }
        }
      `}</style>
      {/* 장식 레이어가 클리핑을 맡는다. 예전에는 <main> 이 overflow-hidden 을 들고 있었는데,
          그러면 main 자체가 스크롤 컨테이너가 되어 안쪽 sticky 가 전부 무력화됐다. */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="prompt-hub-scene__base absolute inset-0" />
        <div className="moon-disc absolute -right-20 top-8 h-80 w-80 rounded-full border border-[color:var(--gold)]/50 bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.98),rgba(255,248,220,0.86)_28%,rgba(253,230,138,0.28)_60%,transparent_74%)] dark:bg-[radial-gradient(circle_at_35%_30%,rgba(255,241,247,0.36),rgba(234,208,137,0.22)_30%,transparent_70%)]" />
        <div className="prompt-hub-scene__spare absolute right-12 top-[118px] h-20 w-44 rotate-[-8deg] rounded-full bg-gradient-to-r from-transparent via-amber-200/28 to-transparent blur-xl" />
        <div className="premium-glow absolute left-[6%] top-[12%] h-60 w-60 rounded-full bg-[radial-gradient(circle,rgba(244,114,182,0.24),transparent_68%)]" />
        <div className="premium-glow prompt-hub-scene__spare absolute bottom-[8%] right-[10%] h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(244,190,209,0.3),transparent_72%)]" />
        <div className="premium-glow absolute bottom-[22%] left-[18%] h-60 w-60 rounded-full bg-[radial-gradient(circle,rgba(253,230,138,0.2),transparent_70%)]" />
        <div className="prompt-hub-scene__stars absolute inset-0" />
        <div className="prompt-hub-scene__hem absolute inset-x-0 bottom-0 h-48" />
        <div className="moon-petal absolute left-[7%] top-[25%] h-16 w-28 rounded-[55%_45%_62%_38%] bg-gradient-to-br from-rose-300/24 to-rose-200/6" />
        <div className="moon-petal prompt-hub-scene__spare absolute right-[18%] top-[42%] h-14 w-24 rounded-[44%_56%_38%_62%] bg-gradient-to-br from-rose-300/22 to-rose-200/6" />
        <div className="moon-petal absolute bottom-[16%] left-[22%] h-12 w-20 rounded-[48%_52%_60%_40%] bg-gradient-to-br from-amber-200/28 to-rose-200/8" />
        <div className="moon-petal prompt-hub-scene__spare absolute right-[8%] bottom-[26%] h-10 w-16 rounded-[48%_52%_60%_40%] bg-gradient-to-br from-rose-200/24 to-amber-100/8" />
        <div className="prompt-hub-scene__sheen absolute inset-0" />
      </div>

      <section className="relative mx-auto max-w-7xl px-3 pb-[104px] pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pb-24">
        <div className="mb-3 flex justify-end">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[color:var(--hairline)] bg-[color:var(--surface-1)] px-3 py-2 text-sm font-black text-[color:var(--ink-1)] shadow-[var(--lift)] transition hover:border-[color:var(--tool-accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--tool-accent-soft)]"
            aria-label={copy.mainHomeAria}
          >
            <Home size={15} />
            {copy.mainHome}
          </Link>
        </div>
        {/* 모바일에서는 이 바깥 껍데기를 투명하게 비운다. 카드 안의 카드 안의 카드가
            좌우로 104px 을 먹어 360px 기기에서 본문 폭이 256px 밖에 남지 않았다. */}
        <div className="max-lg:contents lg:block lg:rounded-[28px] lg:border lg:border-[color:var(--tool-accent-soft)] lg:bg-[color:var(--surface-1)] lg:p-5 lg:shadow-[var(--lift)]">
          <div
            className="relative overflow-hidden rounded-[24px] border border-[color:var(--tool-accent-soft)] p-4 text-[color:var(--tool-ink)] sm:p-6"
            style={{
              background: `linear-gradient(135deg, var(--tool-surface) 0%, var(--surface-1) 54%, var(--tool-accent-soft) 100%)`,
            }}
          >
            <MoonLotusDecoration
              idPrefix="lotus-main"
              wrapperClassName="pointer-events-none absolute -right-[64px] -top-[40px] z-0 h-full w-full opacity-25 sm:-top-[24px] sm:-right-[42px] sm:opacity-30 lg:-top-[8px] lg:-right-[20px]"
              svgClassName="ml-auto w-[104px] sm:w-[156px] md:w-[182px] lg:w-[202px]"
              ariaHidden
            />
            {/* lg 미만에서만 떠 있는 장식. lg 부터는 오른쪽 열이 이 자리를 차지해
                반투명 '현재 도구' 카드가 연이 위에 겹쳐 잘린 것처럼 보였다(z-5 는
                Tailwind 에 없는 클래스라 의도한 계층도 적용된 적이 없다).
                lg 부터는 아래 오른쪽 열 안에서 흐름 요소로 그린다 — 겹칠 수가 없다. */}
            {!heroImageError && (
              <div className="yeon-hero-sprite pointer-events-none absolute right-1 top-1 z-[5] w-28 sm:right-2 sm:top-2 sm:w-32 md:w-40 lg:hidden">
                {heroMascot}
              </div>
            )}
            <div className="relative z-10 grid gap-5 lg:grid-cols-[1fr_320px] lg:items-end">
              <div className="max-w-[calc(100%-108px)] sm:max-w-none">
                <div className="inline-flex min-h-[34px] items-center gap-2 rounded-full border border-[color:var(--tool-accent-soft)] bg-[color:var(--surface-1)] px-3 text-xs font-black uppercase tracking-[0.14em] text-[color:var(--tool-accent-strong)]">
                  <Sparkles size={14} />
                  Moonlight Prompt Atelier
                </div>
                <h2 className="atelier-heading mt-4 max-w-3xl text-balance text-[1.65rem] leading-tight text-[color:var(--ink-1)] sm:text-4xl">
                  {tx(currentTool.label)}
                </h2>
                <p className="mt-3 max-w-[68ch] text-sm font-bold leading-7 text-[color:var(--ink-2)] sm:text-base">{tx(currentTool.description)}</p>
                <p className="mt-2 max-w-[68ch] text-sm font-medium leading-7 text-[color:var(--ink-3)]">{tx(currentTool.detail)}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-[color:var(--tool-accent-soft)] bg-[color:var(--surface-1)] px-3 py-1 text-xs font-bold text-[color:var(--ink-2)]">
                    {tx(currentTool.theme.motif)}
                  </span>
                  {currentTool.keywords.slice(0, 4).map((keyword) => (
                    <span key={keyword} className="rounded-full bg-[color:var(--surface-2)] px-3 py-1 text-xs font-bold text-[color:var(--ink-3)]">
                      {tx(keyword)}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                {!heroImageError && (
                  <div className="yeon-hero-sprite pointer-events-none mb-1 hidden w-40 lg:ml-auto lg:block">
                    {heroMascot}
                  </div>
                )}
                {/* 도구 선택 자체는 아래 레일이 전담한다. 여기 있던 <select> 는 같은 일을 하는
                    두 번째 선택기라 모바일에서 세로 공간만 먹고 서로 어긋나 보였다. */}
                <div className="flex items-center gap-3 rounded-[22px] border border-[color:var(--tool-accent-soft)] bg-[color:var(--surface-1)] p-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[color:var(--tool-accent-strong)] text-xl font-black text-[color:var(--on-accent-strong)]">
                    {currentTool.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-base font-black text-[color:var(--ink-1)]">{tx(currentTool.shortLabel)}</p>
                    <p className="text-xs font-bold text-[color:var(--ink-3)]">{currentTool.ready === "ready" ? copy.ready : copy.preparing}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 모바일 도구 선택기는 여기 하나뿐이다 (예전에는 히어로 안 <select> 와 이 레일이
              둘 다 lg:hidden 으로 세로로 쌓여 있었다). */}
          <div className="mt-4 lg:hidden">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-1">
              <p className="text-sm font-black text-[color:var(--ink-1)]">{copy.toolsTitle}</p>
              <button
                type="button"
                onClick={() => setShowAllTools((prev) => !prev)}
                aria-expanded={showAllTools}
                className="inline-flex min-h-[44px] items-center rounded-full px-3 text-xs font-black text-[color:var(--tool-accent-strong)] underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-[color:var(--tool-accent-soft)]"
              >
                {showAllTools ? copy.collapse : copy.expandAll}
              </button>
            </div>
            {showAllTools ? (
              <div className="grid grid-cols-2 gap-2">
                {TOOL_REGISTRY_COPY.map((tool) => (
                  <ToolChip
                    key={tool.id}
                    tool={tool}
                    isActive={tool.id === activeToolId}
                    label={tx(tool.shortLabel)}
                    status={tool.ready === "ready" ? copy.open : copy.pending}
                    onSelect={() => {
                      selectTool(tool.id);
                      setShowAllTools(false);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div ref={toolRailRef} className="tool-rail flex gap-2 overflow-x-auto px-1 pb-2 pt-1">
                {TOOL_REGISTRY_COPY.map((tool) => (
                  <ToolChip
                    key={tool.id}
                    tool={tool}
                    isActive={tool.id === activeToolId}
                    label={tx(tool.shortLabel)}
                    status={tool.ready === "ready" ? copy.open : copy.pending}
                    onSelect={() => selectTool(tool.id)}
                    className="min-w-[132px] shrink-0"
                  />
                ))}
              </div>
            )}
            <p className="px-1 text-xs font-medium text-[color:var(--ink-3)]">{copy.toolsHint}</p>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_minmax(320px,0.82fr)]">
            <aside className="hidden rounded-[22px] border border-[color:var(--hairline)] bg-[color:var(--surface-1)] p-4 lg:block">
              <p className="text-sm font-black text-[color:var(--ink-1)]">{copy.exploreTitle}</p>
              <p className="mt-1 text-xs font-medium text-[color:var(--ink-3)]">{copy.exploreHint}</p>
              <div className="mt-4 grid gap-2">
                {TOOL_REGISTRY_COPY.map((tool) => (
                  <ToolChip
                    key={tool.id}
                    tool={tool}
                    isActive={tool.id === activeToolId}
                    label={tx(tool.shortLabel)}
                    status={tx(tool.description)}
                    onSelect={() => selectTool(tool.id)}
                  />
                ))}
              </div>
            </aside>

            <section
              id="tool-form-card"
              ref={formCardRef}
              className="rounded-[22px] border border-[color:var(--hairline)] bg-[color:var(--surface-1)] p-4 shadow-[var(--lift)] sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black text-[color:var(--ink-1)]">{tx(currentTool.label)} {copy.inputSuffix}</h3>
                  <p className="mt-2 max-w-[68ch] text-sm font-medium leading-6 text-[color:var(--ink-3)]">{tx(currentTool.emptyState)}</p>
                </div>
                <span className="rounded-full bg-[color:var(--tool-accent-soft)] px-3 py-1 text-xs font-black text-[color:var(--tool-ink)]">
                  {copy.requiredCount.replace("{count}", String(currentTool.fields.filter((field) => field.required).length))}
                </span>
              </div>

              <form
                key={activeToolId}
                className="tool-swap mt-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  generateCurrentToolPrompt();
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  {currentTool.fields.filter((field) => !field.advanced).map(renderToolField)}
                </div>

                {currentTool.fields.some((field) => field.advanced) ? (
                  <details className="mt-4 rounded-2xl border border-[color:var(--hairline)] bg-[color:var(--surface-2)] p-4">
                    <summary className="min-h-11 cursor-pointer py-3 text-sm font-black text-[color:var(--ink-2)]">{copy.advancedSettings}</summary>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      {currentTool.fields.filter((field) => field.advanced).map(renderToolField)}
                    </div>
                  </details>
                ) : null}

                {disabledReason ? (
                  <p className="mt-4 rounded-xl border border-[color:var(--danger-line)] bg-[color:var(--danger-glow)] px-3 py-2 text-sm font-bold text-[color:var(--danger-ink)]" aria-live="polite">
                    {disabledReason}
                  </p>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={Boolean(disabledReason) || isGenerating}
                    className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-[color:var(--tool-accent-strong)] px-5 text-sm font-black text-[color:var(--on-accent-strong)] shadow-[var(--lift)] transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[color:var(--tool-accent-soft)] disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:hover:translate-y-0"
                    title={disabledReason || tx(currentTool.generateLabel)}
                  >
                    <WandSparkles size={17} />
                    {isGenerating ? copy.generating : tx(currentTool.generateLabel)}
                  </button>
                  <button
                    type="button"
                    onClick={fillCurrentToolExample}
                    className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl border border-[color:var(--hairline)] bg-[color:var(--surface-1)] px-4 text-sm font-black text-[color:var(--ink-2)] transition hover:border-[color:var(--tool-accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--tool-accent-soft)]"
                  >
                    <Sparkles size={16} />
                    {copy.exampleInput}
                  </button>
                  <button
                    type="button"
                    onClick={resetCurrentToolDraft}
                    className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl border border-[color:var(--hairline)] bg-[color:var(--surface-1)] px-4 text-sm font-black text-[color:var(--ink-3)] transition hover:border-[color:var(--tool-accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--tool-accent-soft)]"
                  >
                    <RotateCcw size={16} />
                    {copy.reset}
                  </button>
                </div>
              </form>
            </section>

            <section
              ref={resultPanelRef}
              className="relative overflow-hidden rounded-[22px] border border-[color:var(--hairline)] bg-[color:var(--surface-1)] p-4 shadow-[var(--lift)] sm:p-5"
              aria-live="polite"
            >
              {currentResult?.generatedAt ? (
                <span key={currentResult.generatedAt} className="result-sweep pointer-events-none absolute inset-x-0 top-0 h-px" aria-hidden="true" />
              ) : null}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-[color:var(--ink-1)]">{tx(currentTool.resultLabel)}</h3>
                  <p className="mt-1 text-xs font-bold text-[color:var(--ink-3)]">
                    {currentResult?.generatedAt
                      ? copy.lastGenerated.replace("{time}", currentResult.generatedAt)
                      : copy.waitingForInput.replace("{tool}", tx(currentTool.shortLabel))}
                  </p>
                </div>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[color:var(--tool-accent-strong)] text-lg font-black text-[color:var(--on-accent-strong)]">
                  {currentTool.icon}
                </span>
              </div>

              {currentResult?.prompt ? (
                <div className="mt-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={copyCurrentToolPrompt}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[color:var(--tool-accent)] px-3 text-sm font-black text-[color:var(--tool-accent-strong)] transition hover:bg-[color:var(--tool-accent-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--tool-accent-soft)]"
                    >
                      <span className="copy-mark grid place-items-center">
                        {copiedToolId === activeToolId ? <Check size={16} /> : <Copy size={16} />}
                      </span>
                      {copiedToolId === activeToolId ? copy.copyDone : copy.copyPrompt}
                    </button>
                    {AI_TARGETS.map((target) => (
                      <button
                        key={target.id}
                        type="button"
                        onClick={() => openCurrentToolPromptInAi(target.url)}
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[color:var(--tool-accent)] px-3 text-sm font-black text-[color:var(--tool-accent-strong)] transition hover:bg-[color:var(--tool-accent-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--tool-accent-soft)]"
                      >
                        <ExternalLink size={16} />
                        {target.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={generateCurrentToolPrompt}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[color:var(--hairline)] px-3 text-sm font-black text-[color:var(--ink-2)] transition hover:border-[color:var(--tool-accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--tool-accent-soft)]"
                    >
                      <WandSparkles size={16} />
                      {copy.regenerate}
                    </button>
                    <button
                      type="button"
                      onClick={saveCurrentResultToLibrary}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[color:var(--hairline)] px-3 text-sm font-black text-[color:var(--ink-2)] transition hover:border-[color:var(--tool-accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--tool-accent-soft)]"
                    >
                      {savedToolId === activeToolId ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                      {savedToolId === activeToolId ? copy.library.saved : copy.library.save}
                    </button>
                    <button
                      type="button"
                      onClick={() => formCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                      className="inline-flex min-h-[44px] items-center rounded-xl border border-[color:var(--hairline)] px-3 text-sm font-black text-[color:var(--ink-2)] transition hover:border-[color:var(--tool-accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--tool-accent-soft)]"
                    >
                      {copy.editInput}
                    </button>
                    <button
                      type="button"
                      onClick={toggleCurrentResultExpanded}
                      aria-expanded={isCurrentResultExpanded}
                      className="inline-flex min-h-[44px] items-center rounded-xl border border-[color:var(--hairline)] px-3 text-sm font-black text-[color:var(--ink-2)] transition hover:border-[color:var(--tool-accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--tool-accent-soft)]"
                    >
                      {isCurrentResultExpanded ? copy.collapse : copy.expandAll}
                    </button>
                  </div>
                  {chatGptPopupBlockedToolId === activeToolId ? (
                    <p role="alert" className="mt-2 text-xs font-bold text-[color:var(--danger-ink)]">
                      {copy.chatGptPopupBlocked}
                    </p>
                  ) : null}
                  {saveFailedToolId === activeToolId ? (
                    <p role="alert" className="mt-2 text-xs font-bold text-[color:var(--danger-ink)]">
                      {copy.library.saveFailed}
                    </p>
                  ) : null}
                  {/* 복사하거나 외부 AI 로 넘기기 직전에 읽히도록 버튼 행과 프롬프트 사이에 둔다.
                      오류가 아니라 범위 안내이므로 --danger-ink 를 쓰지 않는다. */}
                  <div className="mt-3 rounded-xl border border-[color:var(--gold)]/45 bg-[color:var(--surface-2)] px-3.5 py-3">
                    <p className="text-xs font-black text-[color:var(--ink-1)]">
                      <span aria-hidden="true">ⓘ </span>
                      {copy.scopeNoticeTitle}
                    </p>
                    <p className="mt-1 text-xs font-medium leading-6 text-[color:var(--ink-3)]">{copy.scopeNoticeBody}</p>
                  </div>
                  {/* 접힌 상태는 내부 스크롤러 대신 마스크로 잘라 낸다. 페이지 스크롤 안에
                      또 하나의 스크롤 영역이 있으면 모바일에서 손가락이 갇힌다. */}
                  <div className="relative mt-4">
                    <pre
                      className={`whitespace-pre-wrap rounded-2xl border border-[color:var(--hairline)] bg-[color:var(--code-bg)] p-4 text-sm font-medium leading-7 text-[color:var(--code-ink)] ${
                        isCurrentResultExpanded ? "" : "max-h-[46svh] overflow-hidden"
                      }`}
                    >
                      {currentResult.prompt}
                    </pre>
                    {isCurrentResultExpanded ? null : (
                      <button
                        type="button"
                        onClick={toggleCurrentResultExpanded}
                        className="absolute inset-x-0 bottom-0 flex h-20 items-end justify-center rounded-b-2xl bg-gradient-to-t from-[color:var(--code-bg)] via-[color:var(--code-bg)]/72 to-transparent pb-3 text-xs font-black text-[color:var(--code-ink)] focus:outline-none focus:ring-2 focus:ring-[color:var(--tool-accent-soft)]"
                      >
                        {copy.expandAll}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-4 grid min-h-[240px] place-items-center rounded-2xl border border-dashed border-[color:var(--hairline)] bg-[color:var(--surface-2)] p-5 text-center">
                  <div>
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[color:var(--tool-accent-strong)] text-xl font-black text-[color:var(--on-accent-strong)]">
                      {currentTool.icon}
                    </div>
                    <p className="mt-4 text-base font-black text-[color:var(--ink-1)]">{copy.emptyPromptTitle}</p>
                    <p className="mt-2 text-sm font-medium leading-6 text-[color:var(--ink-3)]">{tx(currentTool.emptyState)}</p>
                    <p className="mt-3 text-xs font-bold text-[color:var(--ink-3)]">
                      {copy.requiredInputPrefix} {currentTool.fields.filter((field) => field.required).map((field) => tx(field.label)).join(", ")}
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* 업셀과 같은 이유로 결과 패널(aria-live) 바깥에 둔다 — 안에 넣으면 생성할 때마다
              스크린리더가 목록 전체를 다시 읽는다. 접힌 채로 시작해 결과를 가리지 않는다. */}
          {libraryOwnerKey && libraryItems.length ? (
            <details className="mt-4 overflow-hidden rounded-[22px] border border-[color:var(--hairline)] bg-[color:var(--surface-1)] p-4 shadow-[var(--lift)] sm:p-5">
              <summary className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm font-black text-[color:var(--ink-1)]">
                <Bookmark size={16} className="text-[color:var(--tool-accent-strong)]" />
                {copy.library.title}
                <span className="text-xs font-bold text-[color:var(--ink-3)]">
                  {copy.library.count.replace("{count}", String(libraryItems.length))}
                </span>
              </summary>
              <ul className="mt-3 space-y-2">
                {libraryItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[color:var(--hairline)] bg-[color:var(--surface-2)] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[color:var(--ink-1)]">{item.toolLabel}</p>
                      <p className="mt-0.5 text-xs font-bold text-[color:var(--ink-3)]">{item.generatedAt}</p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        type="button"
                        onClick={() => loadLibraryItem(item)}
                        aria-label={copy.library.loadAria.replace("{tool}", item.toolLabel)}
                        className="inline-flex min-h-[44px] items-center rounded-lg border border-[color:var(--tool-accent)] px-3 text-xs font-black text-[color:var(--tool-accent-strong)] transition hover:bg-[color:var(--tool-accent-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--tool-accent-soft)]"
                      >
                        {copy.library.load}
                      </button>
                      <button
                        type="button"
                        onClick={() => setLibraryItems(removeFromLibrary(libraryOwnerKey, item.id))}
                        aria-label={copy.library.removeAria.replace("{tool}", item.toolLabel)}
                        className="inline-flex min-h-[44px] w-11 items-center justify-center rounded-lg border border-[color:var(--hairline)] text-[color:var(--ink-3)] transition hover:border-[color:var(--danger-line)] hover:text-[color:var(--danger-ink)] focus:outline-none focus:ring-2 focus:ring-[color:var(--tool-accent-soft)]"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs font-medium leading-6 text-[color:var(--ink-3)]">{copy.library.note}</p>
            </details>
          ) : null}

          {/* 결과 패널(aria-live) 바깥의 형제로 둔다. 안에 넣으면 프롬프트를 생성할 때마다
              스크린리더가 업셀 전체를 다시 읽는다. 결과가 나온 뒤에만 노출해 무료 도구를
              먼저 써 보는 흐름을 막지 않는다. */}
          {currentResult?.prompt
            ? (() => {
                const upsell = TOOL_UPSELL_MAP[activeToolId];
                const [primaryId, secondaryId] = upsell.pair;
                const primary = UPSELL_PRODUCTS[primaryId];
                const secondary = UPSELL_PRODUCTS[secondaryId];
                const primaryCopy = copy.upsellProducts[primaryId];
                const secondaryCopy = copy.upsellProducts[secondaryId];
                return (
                  <section
                    className="relative mt-4 overflow-hidden rounded-[22px] border border-[color:var(--hairline)] bg-[color:var(--surface-2)] p-5 shadow-[var(--lift)] sm:p-6"
                    aria-labelledby="promptHubUpsellTitle"
                  >
                    {/* 골드 헤어라인 — 장식이라 스크린리더에서 제외한다. */}
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--gold),transparent)]"
                    />
                    <h3 id="promptHubUpsellTitle" className="text-base font-black text-[color:var(--ink-1)] sm:text-lg">
                      {copy.upsellTitle}
                    </h3>
                    <p className="mt-2 max-w-[65ch] text-sm font-medium leading-6 text-[color:var(--ink-3)]">
                      {copy.upsellLead}
                    </p>
                    {upsell.match === "closest" ? (
                      <p className="mt-1.5 max-w-[65ch] text-xs font-bold leading-6 text-[color:var(--ink-3)]">
                        {copy.upsellClosestNote}
                      </p>
                    ) : null}

                    {/* 1순위 — 진열대. 2순위와 규격을 달리해 위계를 드러낸다.
                        표면을 한 단 올려(밴드=surface-2, 진열대=surface-1) 경계가 테두리 대비에만
                        기대지 않게 한다 — 라이트에서 골드는 흰 배경 대비 1.5:1 이라 선만으론 안 읽힌다. */}
                    <div className="upsell-feature mt-5 rounded-2xl border border-[color:var(--gold)] bg-[color:var(--surface-1)] p-4 sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                        <h4 className="break-keep text-lg font-black text-[color:var(--ink-1)] sm:text-xl">
                          {primaryCopy.title}
                        </h4>
                        <LazyPriceBadge
                          featureKey={primary.featureKey}
                          className="inline-flex shrink-0 items-center rounded-full border border-[color:var(--gold)] bg-[color:var(--surface-2)] px-3 py-1 text-xs font-black text-[color:var(--ink-1)]"
                        />
                      </div>
                      <p className="mt-2 max-w-[62ch] break-keep text-sm font-medium leading-6 text-[color:var(--ink-2)]">
                        {primaryCopy.desc}
                      </p>
                      <Link
                        href={primary.href}
                        aria-label={copy.upsellCtaAria.replace("{title}", primaryCopy.title)}
                        className="upsell-cta mt-4 inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-[color:var(--tool-accent-strong)] px-5 text-sm font-black text-[color:var(--on-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--tool-accent-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface-1)]"
                      >
                        {copy.upsellCta}
                        <span aria-hidden="true">→</span>
                      </Link>
                    </div>

                    {/* 2순위 — 조용한 행 링크. 카드로 만들면 1순위와 같은 무게로 읽힌다. */}
                    <div className="mt-4 flex flex-wrap items-center gap-x-2 border-t border-[color:var(--hairline)] pt-3">
                      <span className="text-xs font-bold text-[color:var(--ink-3)]">{copy.upsellSecondaryLabel}</span>
                      <Link
                        href={secondary.href}
                        aria-label={copy.upsellCtaAria.replace("{title}", secondaryCopy.title)}
                        className="inline-flex min-h-[44px] items-center rounded-lg px-1 text-sm font-black text-[color:var(--tool-accent-strong)] underline decoration-1 underline-offset-[6px] hover:decoration-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--tool-accent-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface-2)]"
                      >
                        {secondaryCopy.title}
                        <span aria-hidden="true">&nbsp;→</span>
                      </Link>
                    </div>

                    <p className="mt-3 text-xs font-medium leading-6 text-[color:var(--ink-3)]">{copy.upsellPriceNote}</p>
                  </section>
                );
              })()
            : null}
        </div>
      </section>

      {/* 뷰포트에 고정한다. 이전에는 카드의 마지막 자식에 sticky 를 걸어 둬서 붙을 여백이
          16px 뿐이었고, 게다가 <main> 의 overflow-hidden 이 sticky 자체를 막고 있었다. */}
      <div
        className="prompt-hub-cta fixed inset-x-0 z-30 border-t border-[color:var(--hairline)] bg-[color:var(--surface-1)] px-3 pt-3 shadow-[0_-18px_36px_rgba(58,14,40,0.14)] lg:hidden"
        data-visible={isFormCardInView}
      >
        <button
          type="button"
          onClick={generateCurrentToolPrompt}
          disabled={Boolean(disabledReason) || isGenerating}
          className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[color:var(--tool-accent-strong)] px-5 text-sm font-black text-[color:var(--on-accent-strong)] disabled:cursor-not-allowed disabled:opacity-55"
          title={disabledReason || tx(currentTool.generateLabel)}
        >
          <WandSparkles size={17} />
          {isGenerating ? copy.generating : tx(currentTool.generateLabel)}
        </button>
        {disabledReason ? (
          <p className="mt-1.5 line-clamp-2 text-center text-xs font-bold text-[color:var(--ink-3)]">{disabledReason}</p>
        ) : null}
      </div>

      <PromptHubLoginGateModal
        open={loginGateOpen}
        copy={copy.gate}
        signupHref={buildPromptHubAuthPath("signup")}
        loginHref={buildPromptHubAuthPath("login")}
        onDismiss={() => setLoginGateOpen(false)}
        onNavigate={handleGateNavigate}
      />
    </main>
  );
}
