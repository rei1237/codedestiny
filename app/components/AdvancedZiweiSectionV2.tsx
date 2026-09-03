"use client";

import { cmsRecord } from "@/lib/cms/build-text";

// ┌───────────────────────────────────────────────────────────────────────────┐
// │ [심화(深化/advanced) 자미두수 명반] 라우트 /ziwei/chart 가 마운트하는 본체.  │
// │ 파일명에 "Advanced"가 붙으면 = 심화 자미두수. 기본(基本) 자미두수 명반은     │
// │ 여기가 아니라 js/saju-engine.js 의 renderZiwei()/zw-* 격자다(메인 index.html│
// │ 사주·자미 모달). 12궁 4×4 격자·팔레트는 기본 명반과 디자인 레퍼런스를 공유.  │
// └───────────────────────────────────────────────────────────────────────────┘
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { m } from "framer-motion";
// 심화 자미두수 PDF (ZIWEI_DEEP_PDF) — 회당 결제 LLM 15챕터 PDF 리포트 패널
import ZiweiDeepPdfPanel, { type ZiweiDeepBirthInput } from "./ziwei/ZiweiDeepPdfPanel";
import {
  calculateZiweiChart,
  normalizeZiweiForAdvancedReport,
  validateAdvancedZiweiResult,
} from "../_lib/ziwei-engine";
import { normalizeZiweiInput } from "../_lib/normalize-ziwei-input";
import { getZiweiDeepChapter, primeZiweiDeepRuntime } from "../_lib/ziwei-deep-runtime";
import { validateZiweiChart } from "../_lib/validate-ziwei-chart";
import {
  isDestinyProfileStorageKey,
  readCurrentDestinyProfile,
  resolveDestinyProfileBirthParts,
  type DestinyProfileCard,
} from "../_lib/profile-card-storage";
import {
  ZiweiDeepChart,
  ZiweiDeepChapter,
  ZiweiPalace,
  ZiweiStarMeta,
  ZiweiGender,
  ZiweiPalaceId,
  ZiweiSectionId,
  ZIWEI_SECTIONS,
} from "../_lib/ziwei-types";
import { transformationTypeToLabel } from "../_lib/ziwei-advanced-normalization";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import { getAdvancedZiweiCopy, type AdvancedZiweiCopy } from "./ziwei/_lib/advanced-ziwei-copy";

type Step = "form" | "computing" | "result";

interface AdvancedZiweiSectionProps {
  showIntro?: boolean;
  onStartGeneration?: () => void;
  generationLoading?: boolean;
}

interface FormState {
  name: string;
  birthYear: string;
  birthMonth: string;
  birthDay: string;
  birthHour: string;
  birthMinute: string;
  unknownHour: boolean;
  gender: ZiweiGender;
  calendarType: "solar" | "lunar";
  isLeapMonth: boolean;
  birthPlace: string;
  timezone: string;
}

const RESULT_CACHE_KEY = "premium:ziwei:result:v9";
const BASIC_ZIWEI_ENTRY_URL = "/?action=openZiweiModal";

type ZiweiProfileTimeSeed = {
  birthHour: string;
  birthMinute: string;
  unknownHour: boolean;
  hasProfileHour: boolean;
};

type ZiweiProfileSeed = {
  fingerprint: string;
  form: Partial<FormState>;
  hasProfileHour: boolean;
};

function toProfileInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

// 출생 월/일/시 타이핑 입력의 숫자 마스킹 — app/nakshatra/NakshatraFormClient.tsx 의 digits() 와 동일 규칙.
function digitsOnly(value: string, max: number): string {
  return value.replace(/\D/g, "").slice(0, max);
}

function normalizeZiweiProfileGender(profile: DestinyProfileCard | null): ZiweiGender {
  return String(profile?.gender || "").trim().toUpperCase() === "M" ? "M" : "F";
}

function normalizeZiweiProfileCalendarType(profile: DestinyProfileCard | null): FormState["calendarType"] {
  const raw = String(profile?.birth?.calType || profile?.calType || profile?.calendarType || "solar").trim().toLowerCase();
  return raw === "lunar" ? "lunar" : "solar";
}

function isUnknownProfileTime(value: unknown): boolean {
  return /unknown|no\s*time|none|미상|모름|불명/i.test(String(value || "").trim());
}

function parseZiweiProfileTimeText(value: unknown): { hour: number; minute: number } | null {
  const raw = String(value || "").trim();
  if (!raw || isUnknownProfileTime(raw)) return null;
  const timePart = raw.includes("T")
    ? raw.split("T")[1]
    : raw.includes(" ")
      ? raw.split(/\s+/).find((part) => /\d{1,2}:?\d{2}/.test(part)) || raw
      : raw;
  const matched = timePart.match(/(\d{1,2})\D?(\d{2})/);
  if (!matched) return null;
  const hour = Number(matched[1]);
  const minute = Number(matched[2]);
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return null;
  if (!Number.isFinite(minute) || minute < 0 || minute > 59) return null;
  return { hour: Math.trunc(hour), minute: Math.trunc(minute) };
}

function resolveZiweiProfileTime(profile: DestinyProfileCard | null): ZiweiProfileTimeSeed {
  const birth = profile?.birth || {};
  const explicitUnknown = Boolean(profile?.timeUnknown)
    || Boolean(profile?.birthTimeUnknown)
    || Boolean(profile?.noBirthTime)
    || Boolean(birth.timeUnknown)
    || isUnknownProfileTime(profile?.birthTime);
  if (explicitUnknown) {
    return { birthHour: "", birthMinute: "0", unknownHour: true, hasProfileHour: false };
  }

  const hour = toProfileInt(birth.hour ?? profile?.birthHour);
  const minute = toProfileInt(birth.minute ?? profile?.birthMinute);
  if (hour !== null && hour >= 0 && hour <= 23) {
    const safeMinute = minute !== null && minute >= 0 && minute <= 59 ? minute : 0;
    return {
      birthHour: String(hour),
      birthMinute: String(safeMinute),
      unknownHour: false,
      hasProfileHour: true,
    };
  }

  const parsed = parseZiweiProfileTimeText(profile?.birthTime || profile?.birthIso);
  if (parsed) {
    return {
      birthHour: String(parsed.hour),
      birthMinute: String(parsed.minute),
      unknownHour: false,
      hasProfileHour: true,
    };
  }

  return { birthHour: "", birthMinute: "0", unknownHour: true, hasProfileHour: false };
}

function buildZiweiProfileSeed(eventProfile?: unknown): ZiweiProfileSeed | null {
  const profile = readCurrentDestinyProfile(eventProfile);
  const birth = resolveDestinyProfileBirthParts(profile);
  if (!profile || !birth) return null;

  const time = resolveZiweiProfileTime(profile);
  const gender = normalizeZiweiProfileGender(profile);
  const calendarType = normalizeZiweiProfileCalendarType(profile);
  const profileId = String(profile.id || profile.profileId || "").trim();
  const name = String(profile.name || "").trim();
  const birthDate = `${String(birth.year).padStart(4, "0")}-${pad2(birth.month)}-${pad2(birth.day)}`;
  const birthPlace = String(profile.location?.label || profile.birthRegion || "").trim();
  const timezone = String(profile.location?.tz || "").trim();

  const form: Partial<FormState> = {
    name,
    birthYear: String(birth.year),
    birthMonth: String(birth.month),
    birthDay: String(birth.day),
    birthHour: time.birthHour,
    birthMinute: time.birthMinute,
    unknownHour: time.unknownHour,
    gender,
    calendarType,
  };

  if (birthPlace) form.birthPlace = birthPlace;
  if (timezone) form.timezone = timezone;

  return {
    fingerprint: [
      profileId,
      name,
      birthDate,
      time.hasProfileHour ? pad2(Number(time.birthHour)) : "",
      time.hasProfileHour ? pad2(Number(time.birthMinute)) : "",
      gender,
      calendarType,
      time.unknownHour ? "unknown" : "known",
    ].join("|"),
    form,
    hasProfileHour: time.hasProfileHour,
  };
}

function sectionTitle(sectionId: ZiweiSectionId): string {
  return ZIWEI_SECTIONS.find((s) => s.id === sectionId)?.title || sectionId;
}

type ZiweiConsultationTrackId =
  | "life"
  | "career"
  | "wealth"
  | "love"
  | "relationships"
  | "family"
  | "health"
  | "timing";

interface ZiweiCounselingTrackConfig {
  key: ZiweiConsultationTrackId;
  title: string;
  shortTitle: string;
  purpose: string;
  primaryPalaces: ZiweiPalaceId[];
  secondaryPalaces: ZiweiPalaceId[];
  keyQuestions: string[];
  interpretationPriorities: string[];
  timingFocus: string;
  actionGuideType: string;
  cautionRules: string[];
}

const ZIWEI_TRACK_KEYS: ZiweiConsultationTrackId[] = ["life", "career", "wealth", "love", "relationships", "family", "health", "timing"];

function buildCounselingTracks(copy: AdvancedZiweiCopy): ZiweiCounselingTrackConfig[] {
  return [
  {
    key: "life",
    title: copy.trackTitles.life,
    shortTitle: "종합",
    purpose: copy.trackPurpose.life,
    primaryPalaces: ["ming", "fortune", "career"],
    secondaryPalaces: ["wealth", "travel", "spouse"],
    keyQuestions: ["내 명반에서 가장 선명한 성향은 무엇인가?", "반복되는 선택 패턴은 어디에서 시작되는가?", "삶의 균형을 잡으려면 어떤 축을 먼저 조절해야 하는가?"],
    interpretationPriorities: ["명궁·신궁의 기본 반응", "강한 궁과 관리 궁의 균형", "대궁·삼방사정으로 보이는 반복 패턴"],
    timingFocus: "현재 운 데이터가 있을 때만 원국의 어떤 특징이 강화되는지 확인합니다.",
    actionGuideType: "삶의 방향을 넓게 정리하고, 당장 고정할 생활 기준을 뽑습니다.",
    cautionRules: ["성격을 단정하지 않고 상황별 반응으로 설명합니다.", "모든 궁을 같은 비중으로 펼치기보다 핵심 축을 먼저 보여줍니다."],
  },
  {
    key: "career",
    title: copy.trackTitles.career,
    shortTitle: "직업",
    purpose: copy.trackPurpose.career,
    primaryPalaces: ["career", "ming", "wealth"],
    secondaryPalaces: ["travel", "fortune", "friends"],
    keyQuestions: ["어떤 방식으로 일할 때 성과가 나는가?", "조직과 독립 중 어떤 조건이 더 맞는가?", "소진을 줄이려면 어떤 업무 환경을 피해야 하는가?"],
    interpretationPriorities: ["관록궁의 주성·사화", "명궁과 관록궁의 연결", "재백궁과 천이궁이 보여주는 성과 전환 방식"],
    timingFocus: "대한·세운 데이터가 있으면 커리어 확장과 보수적 접근 구간을 분리합니다.",
    actionGuideType: "역할 선택, 업무 리듬, 협업 기준을 실행 조언으로 정리합니다.",
    cautionRules: ["직업명을 단정하지 않고 적합한 역할과 환경을 설명합니다.", "성과 욕구와 회복 리듬을 함께 봅니다."],
  },
  {
    key: "wealth",
    title: copy.trackTitles.wealth,
    shortTitle: "재물",
    purpose: copy.trackPurpose.wealth,
    primaryPalaces: ["wealth", "career", "property"],
    secondaryPalaces: ["fortune", "ming", "friends"],
    keyQuestions: ["돈을 버는 방식은 어디에서 힘을 얻는가?", "재물의 누수는 어떤 선택 습관에서 생기는가?", "사업이나 투자 판단에서 조절할 기준은 무엇인가?"],
    interpretationPriorities: ["재백궁의 주성·보조성", "관록궁과 재백궁의 성과 연결", "전택궁이 보여주는 장기 기반"],
    timingFocus: "현재 운 데이터가 있을 때만 확장·보수·정비 구간을 구분합니다.",
    actionGuideType: "수입 구조, 지출 기준, 위험 관리 문장으로 정리합니다.",
    cautionRules: ["투자 성공이나 손실을 확정하지 않습니다.", "재물운을 감정이 아니라 관리 구조로 설명합니다."],
  },
  {
    key: "love",
    title: copy.trackTitles.love,
    shortTitle: "연애",
    purpose: copy.trackPurpose.love,
    primaryPalaces: ["spouse", "ming", "fortune"],
    secondaryPalaces: ["friends", "children", "travel"],
    keyQuestions: ["관계에서 어떤 상대와 흐름이 맞는가?", "갈등은 어떤 감정 반응에서 커지는가?", "건강한 관계를 위해 어떤 표현을 연습해야 하는가?"],
    interpretationPriorities: ["부부궁의 주성·사화", "명궁이 관계에서 드러나는 방식", "복덕궁과 교우궁의 정서 안정"],
    timingFocus: "시기 데이터가 있을 때만 관계 확장보다 조율이 필요한 구간을 구분합니다.",
    actionGuideType: "관계 표현, 경계 설정, 갈등 회복 문장으로 정리합니다.",
    cautionRules: ["이혼·결별·결혼을 확정하지 않습니다.", "상대방을 규정하지 않고 관계에서 반복되는 반응을 설명합니다."],
  },
  {
    key: "relationships",
    title: copy.trackTitles.relationships,
    shortTitle: "관계",
    purpose: copy.trackPurpose.relationships,
    primaryPalaces: ["friends", "siblings", "travel"],
    secondaryPalaces: ["ming", "spouse", "career"],
    keyQuestions: ["어떤 사람과 협업이 잘 맞는가?", "관계에서 소모가 생기는 지점은 어디인가?", "경계를 세워야 할 신호는 무엇인가?"],
    interpretationPriorities: ["교우궁의 사람운", "형제궁의 수평 관계", "천이궁의 외부 인연과 명궁의 반응"],
    timingFocus: "운 데이터가 있으면 외부 인연 확장과 관계 정비 타이밍을 구분합니다.",
    actionGuideType: "협업 기준, 거절 문장, 신뢰 검증 기준을 제시합니다.",
    cautionRules: ["사람을 좋은 사람/나쁜 사람으로 나누지 않습니다.", "관계의 강점과 소모 지점을 함께 봅니다."],
  },
  {
    key: "family",
    title: copy.trackTitles.family,
    shortTitle: "가족",
    purpose: copy.trackPurpose.family,
    primaryPalaces: ["parents", "siblings", "children"],
    secondaryPalaces: ["property", "spouse", "fortune"],
    keyQuestions: ["가족 안에서 반복되는 역할은 무엇인가?", "정서적 거리와 책임감은 어떻게 균형을 잡아야 하는가?", "자녀·후배·결과물과의 관계에서 무엇을 조절해야 하는가?"],
    interpretationPriorities: ["부모궁의 윗사람·문서 인연", "형제궁의 수평 관계", "자녀궁의 생산성과 돌봄 방식"],
    timingFocus: "운 데이터가 있으면 가족 책임이 커지는 구간과 독립성이 필요한 구간을 구분합니다.",
    actionGuideType: "가족 대화, 책임 분담, 돌봄과 독립의 기준을 정리합니다.",
    cautionRules: ["가족 구성원을 단정하지 않습니다.", "책임감과 경계 설정을 함께 다룹니다."],
  },
  {
    key: "health",
    title: copy.trackTitles.health,
    shortTitle: "리듬",
    purpose: copy.trackPurpose.health,
    primaryPalaces: ["health", "fortune", "ming"],
    secondaryPalaces: ["travel", "career", "property"],
    keyQuestions: ["어떤 상황에서 에너지가 빨리 소모되는가?", "회복을 위해 먼저 고정할 루틴은 무엇인가?", "생활 리듬을 흔드는 반복 패턴은 어디에서 오는가?"],
    interpretationPriorities: ["질액궁의 생활 리듬", "복덕궁의 회복 방식", "명궁·신궁의 스트레스 반응"],
    timingFocus: "운 데이터가 있으면 과로를 줄이고 회복을 우선할 구간을 구분합니다.",
    actionGuideType: "수면·일정·감정 반응을 점검하는 생활 조언으로 정리합니다.",
    cautionRules: ["의학적 진단처럼 말하지 않습니다.", "필요한 경우 전문가 상담을 권합니다."],
  },
  {
    key: "timing",
    title: copy.trackTitles.timing,
    shortTitle: "시기",
    purpose: copy.trackPurpose.timing,
    primaryPalaces: ["ming", "career", "wealth"],
    secondaryPalaces: ["fortune", "travel", "health"],
    keyQuestions: ["지금 원국의 어떤 특징이 강화되는가?", "확장하기 좋은 분야와 조심할 분야는 무엇인가?", "현재 운 데이터가 제한될 때 무엇까지 말할 수 있는가?"],
    interpretationPriorities: ["annualFlow가 제공하는 핵심 궁", "majorPeriods에 기록된 대한 구간", "원국의 강한 궁과 관리 궁"],
    timingFocus: "운한 데이터가 없으면 현재 시기 단정 없이 원국 기준의 선택 우선순위만 제시합니다.",
    actionGuideType: "기회, 부담, 선택 기준, 주의 행동을 분리합니다.",
    cautionRules: ["현재 연도나 특정 사건을 임의로 예측하지 않습니다.", "데이터가 없으면 확인 불가로 표시합니다."],
  },
  ];
}

const ZIWEI_STRENGTH_SYMBOL_KEY: Record<string, keyof AdvancedZiweiCopy["strengthDescriptions"]> = {
  "◎": "miao",
  O: "deuk",
  "▲": "li",
  "△": "ping",
  X: "ham",
};

// 12궁 전통 명반 배치 — 지지(한글)를 4×4 격자 위치로 매핑(기본 명반 saju-engine.js zw-cell-N과 동일 배열).
// 중앙 2×2(2/2~4/4)는 자미 성도 패널. ZHI_LIST(app/_lib/ziwei-engine.ts)는 한글 지지를 쓴다.
const ZIWEI_BRANCH_GRID_AREA: Record<string, string> = {
  사: "1 / 1", 오: "1 / 2", 미: "1 / 3", 신: "1 / 4",
  진: "2 / 1", 유: "2 / 4",
  묘: "3 / 1", 술: "3 / 4",
  인: "4 / 1", 축: "4 / 2", 자: "4 / 3", 해: "4 / 4",
};

// 별 세기 기호(◎ O ▲ △ X)별 색 토큰
const ZIWEI_STRENGTH_TONE: Record<string, string> = {
  "◎": "text-emerald-300",
  O: "text-sky-300",
  "▲": "text-amber-300",
  "△": "text-slate-300",
  X: "text-rose-300",
};

// 사화 pill 색 위계 — 록=록빛/권=권세/과=명예/기=주의(기본 명반과 동일 의미)
const ZIWEI_SIHUA_PILL: Record<string, string> = {
  화록: "border-lime-300/40 bg-lime-300/12 text-lime-100",
  화권: "border-fuchsia-300/40 bg-fuchsia-300/12 text-fuchsia-100",
  화과: "border-sky-300/40 bg-sky-300/12 text-sky-100",
  화기: "border-rose-300/45 bg-rose-300/14 text-rose-100",
};

const COUNSELING_TRACK_ICON_MAP: Record<ZiweiConsultationTrackId, string> = {
  life: "總",
  career: "官",
  wealth: "財",
  love: "緣",
  relationships: "朋",
  family: "家",
  health: "息",
  timing: "限",
};

interface ZiweiPalaceCounselingItem {
  palace: ZiweiPalace;
  energy: number;
  keywords: string[];
  starMechanics: string;
  brightness: string;
  assists: string;
  malefics: string;
  transformations: string[];
  isBorrowed: boolean;
  reality: string;
  strengths: string;
  cautions: string;
  advice: string;
  prescription: string;
  definition: string;
}

interface ZiweiTrackPattern {
  title: string;
  interpretation: string;
  evidence: string[];
  palaceIds: ZiweiPalaceId[];
}

interface ZiweiTrackFlowStage {
  stage: string;
  title: string;
  content: string;
  evidence: string[];
  actions: string[];
}

interface ZiweiPalaceEvidence {
  mainStars: string[];
  auxiliaryStars: string[];
  transformations: string[];
  oppositePalace: string;
  relatedPalaces: string[];
  lines: string[];
}

interface ZiweiTrackPalaceReading {
  palaceId: ZiweiPalaceId;
  palaceName: string;
  headline: string;
  customerMeaning: string;
  corePattern: string;
  strengths: string[];
  challenges: string[];
  realLifeManifestations: string[];
  crossPalaceInterpretation: string;
  selectedTrackRelevance: string;
  timingInterpretation: string;
  practicalAdvice: string[];
  evidence: ZiweiPalaceEvidence;
  dataLimitations: string[];
  priority: "primary" | "secondary" | "supporting";
}

interface ZiweiTrackAnalysis {
  selectedTrack: ZiweiCounselingTrackConfig;
  executiveSummary: {
    headline: string;
    summary: string;
    keyPatterns: ZiweiTrackPattern[];
  };
  consultationFlow: ZiweiTrackFlowStage[];
  palaceReadings: ZiweiTrackPalaceReading[];
  timing: {
    available: boolean;
    currentTheme: string;
    opportunities: string[];
    cautions: string[];
    recommendedActions: string[];
    evidence: string[];
  };
  actionPlan: {
    start: string[];
    reduce: string[];
    maintain: string[];
    reflectionQuestions: string[];
  };
  dataWarnings: string[];
}

const PALACE_DEFINITION_MAP_DEFAULT: Record<ZiweiPalaceId, { name: string; definition: string; focus: string }> = {
  ming: {
    name: "명궁",
    definition: "선천적 기질과 삶을 대하는 기본 반응을 보여주는 중심 궁",
    focus: "자기 인식, 위기 반응, 인생 중심 테마",
  },
  siblings: {
    name: "형제궁",
    definition: "가까운 사람과의 심리적 거리, 수평 관계의 협력 패턴을 보여주는 궁",
    focus: "친구/동료 관계, 비교심리, 신뢰와 동업",
  },
  spouse: {
    name: "부부궁",
    definition: "연애와 결혼에서 반복되는 관계 패턴을 드러내는 궁",
    focus: "상대 유형, 갈등 원인, 회복 방식, 좋은 관계 조건",
  },
  children: {
    name: "자녀궁",
    definition: "자녀뿐 아니라 창작물과 프로젝트 결과물의 생산성을 보여주는 궁",
    focus: "후배/부하/결과물 운, 생산력, 양육/리딩 방식",
  },
  wealth: {
    name: "재백궁",
    definition: "재물 흐름과 자산 운용 습관을 읽는 궁",
    focus: "돈을 버는 방식과 지키는 방식, 현금흐름, 계약 감각",
  },
  health: {
    name: "질액궁",
    definition: "건강 상태를 단정하기보다 에너지 소모와 회복 패턴을 보여주는 궁",
    focus: "체질적 경향, 생활 리듬, 과로 관리",
  },
  travel: {
    name: "천이궁",
    definition: "바깥 환경에서 기회가 열리는 방식과 적응력을 보여주는 궁",
    focus: "이직/이사/해외/대외 활동, 외부 이미지",
  },
  friends: {
    name: "노복궁",
    definition: "협력자, 팀원, 고객, 커뮤니티와의 연결 방식을 보여주는 궁",
    focus: "인맥 구조, 협업 운, 커뮤니티 확장",
  },
  career: {
    name: "관록궁",
    definition: "직업명보다 성공하는 일의 방식과 커리어 구조를 드러내는 궁",
    focus: "업무 스타일, 리더/참모 성향, 장기 성장 축",
  },
  property: {
    name: "전택궁",
    definition: "삶의 기반, 주거 안정, 축적 시스템을 보여주는 궁",
    focus: "공간 운, 자산 기반, 생활 터전 안정성",
  },
  fortune: {
    name: "복덕궁",
    definition: "내면 안정감과 행복감, 번아웃 회복력을 보여주는 궁",
    focus: "휴식 방식, 만족도, 정서적 회복",
  },
  parents: {
    name: "부모궁",
    definition: "부모뿐 아니라 윗사람, 제도, 문서 인연을 읽는 궁",
    focus: "상사/스승 운, 문서/계약, 보호와 독립",
  },
};

const STAR_MEANING_MAP_DEFAULT: Record<string, { essence: string; strength: string; shadow: string }> = {
  자미: { essence: "중심성, 책임, 리더십", strength: "판을 정리하고 방향을 제시하는 힘", shadow: "통제욕, 고립감, 자존심 부담" },
  천기: { essence: "전략, 기획, 변통", strength: "상황을 읽고 최적 해법을 찾는 능력", shadow: "생각 과다, 결정 지연" },
  태양: { essence: "표현, 추진, 명료함", strength: "밖으로 빛을 내고 영향력을 확장하는 힘", shadow: "과열, 과책임" },
  무곡: { essence: "실행, 재정 감각, 결단", strength: "숫자와 결과를 붙잡는 능력", shadow: "융통성 저하, 완고함" },
  천동: { essence: "유연함, 공감, 생활 감수성", strength: "사람의 마음을 부드럽게 여는 힘", shadow: "결정 회피, 감정 흔들림" },
  염정: { essence: "원칙, 선명함, 진정성", strength: "가치를 지키며 판을 정화하는 힘", shadow: "극단적 판단, 관계 긴장" },
  천부: { essence: "안정, 저장, 운영력", strength: "기반을 만들고 지키는 능력", shadow: "보수성, 변화 지연" },
  태음: { essence: "내면성, 세심함, 축적", strength: "조용히 자산과 감각을 키우는 힘", shadow: "불안, 정서 과민" },
  탐랑: { essence: "매력, 확장, 욕구", strength: "사람과 기회를 끌어오는 힘", shadow: "과욕, 분산" },
  거문: { essence: "언어, 분석, 문제의식", strength: "불명확한 것을 드러내는 힘", shadow: "오해, 비판 과다" },
  천상: { essence: "균형, 조율, 외교", strength: "갈등을 중재하고 공정성을 세우는 힘", shadow: "우유부단, 과배려" },
  천량: { essence: "보호, 윤리, 회복", strength: "사람을 살리고 기준을 세우는 힘", shadow: "훈계성, 무거움" },
  칠살: { essence: "돌파, 결단, 개척", strength: "위험 구간을 뚫고 전진하는 힘", shadow: "과속, 충돌" },
  파군: { essence: "변혁, 리셋, 재구성", strength: "낡은 구조를 깨고 새 판을 짜는 힘", shadow: "파괴적 선택, 불안정" },
  좌보: { essence: "조력, 지원, 협력", strength: "약점을 보완하는 사람운", shadow: "의존성" },
  우필: { essence: "지원, 마감, 실행 보정", strength: "흐름을 완성해주는 힘", shadow: "타인 기대 과다" },
  문창: { essence: "문서, 학습, 구조화", strength: "지식과 기록으로 성과를 만드는 힘", shadow: "이론 과다" },
  문곡: { essence: "감성, 전달, 설득", strength: "말과 글로 공감을 여는 힘", shadow: "감정 기복" },
  경양: { essence: "절단, 직진, 압박", strength: "결정을 미루지 않게 만드는 힘", shadow: "관계 마찰" },
  타라: { essence: "저항, 지연, 버팀", strength: "쉽게 무너지지 않는 내구성", shadow: "고착, 답답함" },
  화성: { essence: "점화, 속도, 집중", strength: "순간 추진력을 극대화하는 힘", shadow: "감정 폭주" },
  영성: { essence: "강렬함, 직감, 반전", strength: "변화를 읽고 기민하게 전환하는 힘", shadow: "기복, 소진" },
  지공: { essence: "비움, 단절, 재정렬", strength: "불필요를 비워 새 질서를 만드는 힘", shadow: "허무감" },
  지겁: { essence: "변동, 긴장, 각성", strength: "안일함을 깨고 리스크 감각을 키우는 힘", shadow: "손실 체감" },
  천마: { essence: "이동, 확장, 전환", strength: "바깥에서 기회를 잡는 힘", shadow: "정착 어려움" },
};

/* 관리자 CMS(운세 콘텐츠 → 자미두수 심화 해설)에서 고친 값을 얹는다(폴백 우선). */
const PALACE_DEFINITION_MAP = cmsRecord("ziwei-deep", "palace", PALACE_DEFINITION_MAP_DEFAULT);
const STAR_MEANING_MAP = cmsRecord("ziwei-deep", "star", STAR_MEANING_MAP_DEFAULT);

const BRIGHTNESS_RULES: Record<"묘" | "득" | "리" | "평" | "함", { symbol: string; score: number; tone: string; caution: string }> = {
  묘: { symbol: "◎", score: 30, tone: "장점이 선명하게 드러나 주도권을 잡기 좋습니다.", caution: "자신감이 과열되지 않게 리듬을 조절하세요." },
  득: { symbol: "O", score: 22, tone: "노력 대비 성과가 안정적으로 쌓이는 구간입니다.", caution: "익숙함에 머무르면 성장 속도가 둔해질 수 있습니다." },
  리: { symbol: "▲", score: 14, tone: "방향을 잘 잡으면 실전에서 힘을 발휘합니다.", caution: "상황 판단을 놓치면 에너지 분산이 커질 수 있습니다." },
  평: { symbol: "△", score: 6, tone: "관리 방식에 따라 결과 격차가 크게 납니다.", caution: "방치하면 평균 이하로 밀릴 수 있습니다." },
  함: { symbol: "X", score: -12, tone: "힘이 바로 드러나기보다 간접적으로 작동합니다.", caution: "왜곡, 지연, 과잉 반응을 세심히 관리해야 합니다." },
};

const TRANSFORMATION_RULES: Record<"화록" | "화권" | "화과" | "화기", { score: number; tone: string; caution: string }> = {
  화록: { score: 8, tone: "인연과 기회, 자원이 유입되기 쉬운 흐름", caution: "들어오는 것만 믿고 관리가 느슨해지지 않게 조절 필요" },
  화권: { score: 6, tone: "주도권과 책임이 커지는 흐름", caution: "독단과 과압박을 줄여야 성과가 길게 갑니다" },
  화과: { score: 6, tone: "평판과 인정, 문서 운이 살아나는 흐름", caution: "평판 관리에만 치우치면 실속이 비어질 수 있습니다" },
  화기: { score: -10, tone: "집착과 지연, 오해가 생기기 쉬운 관리 구간", caution: "피할 영역이 아니라 우선순위로 정비해야 하는 핵심 구간" },
};

function normalizeStrengthBandFromStar(star: ZiweiStarMeta): "묘" | "득" | "리" | "평" | "함" | "" {
  const strength = String(star?.strength || "").trim();
  if (strength === "왕") return "묘";
  if (["묘", "득", "리", "평", "함"].includes(strength)) return strength as "묘" | "득" | "리" | "평" | "함";

  const symbol = String(star?.strengthSymbol || star?.symbol || "").trim();
  if (symbol === "◎") return "묘";
  if (symbol === "O" || symbol === "○") return "득";
  if (symbol === "▲") return "리";
  if (symbol === "△") return "평";
  if (symbol === "X" || symbol === "×") return "함";
  return "";
}

function buildStarMeaningLine(starNames: string[]): string {
  if (!starNames.length) return "이 궁은 무주성궁 성향이 있어 대궁과 삼방사정의 맥락을 함께 읽을 때 정확도가 높아집니다.";
  return starNames
    .slice(0, 3)
    .map((name) => {
      const meaning = STAR_MEANING_MAP[name];
      if (!meaning) return `${name}의 고유 결이 이 궁의 주제와 맞물려 현실 선택을 이끕니다.`;
      return `${name}의 ${meaning.essence}이(가) ${meaning.strength}으로 이어집니다.`;
    })
    .join(" ");
}

function buildEnergyScore(palace: ZiweiPalace): number {
  let score = 50;

  palace.mainStars.forEach((star) => {
    const band = normalizeStrengthBandFromStar(star);
    if (band) score += BRIGHTNESS_RULES[band].score;
  });

  score += palace.luckyStars.length * 5;
  score -= palace.maleficStars.length * 5;

  const allTransforms = [...(palace.fourTransformations || []), ...(palace.incomingFourTransformations || [])];
  allTransforms.forEach((ft) => {
    const label = transformationTypeToLabel(ft.type);
    score += TRANSFORMATION_RULES[label].score;
  });

  if (palace.isEmptyMainStarPalace || palace.isEmpty) score -= 8;

  return Math.max(0, Math.min(100, score));
}

function palaceForceLabel(score: number): string {
  if (score >= 78) return "궁세 왕성";
  if (score >= 62) return "궁세 안정";
  if (score >= 46) return "궁세 조율";
  return "보정 필요";
}

function palaceForceToneClass(score: number): string {
  if (score >= 78) return "border border-emerald-300/35 bg-emerald-200/15 text-emerald-100";
  if (score >= 62) return "border border-cyan-300/35 bg-cyan-200/15 text-cyan-100";
  if (score >= 46) return "border border-amber-300/35 bg-amber-200/15 text-amber-100";
  return "border border-rose-300/35 bg-rose-200/15 text-rose-100";
}

function palaceGapLabel(gap: number): string {
  if (gap <= 12) return "작아 균형이 좋습니다";
  if (gap <= 26) return "중간이라 한쪽 보정이 필요합니다";
  return "커서 약한 축의 보강이 우선입니다";
}

function pickKeywords(palace: ZiweiPalace): string[] {
  const byStars = palace.mainStars.slice(0, 2).map((s) => s.name);
  const byPalace = palace.keywords.slice(0, 3);
  return [...new Set([...byPalace, ...byStars])].slice(0, 5);
}

function buildPalaceSpecialAdvice(palace: ZiweiPalace, score: number): { reality: string; caution: string; action: string } {
  const coreStars = palace.mainStars.map((s) => s.name).slice(0, 2).join(" · ") || "무주성궁 흐름";

  if (palace.id === "health") {
    return {
      reality: `질액궁에서는 ${coreStars}의 결이 몸의 리듬으로 번역됩니다. 특정 질환 단정보다 스트레스 누적 방식, 수면의 깊이, 회복 루틴의 일관성이 실제 컨디션을 좌우합니다.`,
      caution: "피곤 신호를 참는 습관, 불규칙한 수면, 과로 후 몰아 쉬는 패턴이 누적되면 회복 탄성이 떨어질 수 있습니다.",
      action: "수면-식사-움직임의 시간을 고정하고, 주 3회 이상 짧은 회복 루틴을 먼저 확보하세요.",
    };
  }

  if (palace.id === "spouse") {
    return {
      reality: `부부궁에서는 ${coreStars}의 성향만큼 상대 선택의 기준이 분명해집니다. 끌리는 유형, 관계 거리감, 갈등 이후 복구 속도에서 당신의 사랑 패턴이 드러납니다.`,
      caution: "감정이 커질수록 상대를 바꾸려는 압박이나 침묵 회피가 반복되면 관계 피로가 빠르게 올라갈 수 있습니다.",
      action: "갈등 원인을 성격이 아닌 습관 단위로 나눠 대화하고, 회복 루틴(대화 시간·거리 조절·약속 확인)을 먼저 합의하세요.",
    };
  }

  if (palace.id === "wealth") {
    return {
      reality: `재백궁은 돈을 버는 속도와 지키는 구조를 함께 봐야 힘이 생깁니다. ${coreStars}는 수익 창출 방식과 지출 관리 방식의 균형을 요구합니다.`,
      caution: "유입이 늘어도 통제 없는 고정비·충동 지출·계약 검토 누락이 겹치면 재무 체감이 약해질 수 있습니다.",
      action: "수입 채널은 확장하되 지출 규칙은 단순하게 고정하고, 큰 계약은 하루 숙성 후 확정하는 편이 안정적입니다.",
    };
  }

  if (palace.id === "career") {
    return {
      reality: `관록궁의 핵심은 직업명보다 일하는 방식입니다. ${coreStars} 성향은 당신이 성과를 내는 작업 리듬과 협업 구조를 결정합니다.`,
      caution: "역할 경계가 흐리거나 의사결정 권한이 불명확한 환경에 오래 머물면 실력 대비 성과가 늦게 보일 수 있습니다.",
      action: "본인의 성공 방식(기획형/실행형/조율형)을 명확히 선언하고, 권한·책임·평가 기준이 맞는 자리로 정렬하세요.",
    };
  }

  if (palace.id === "friends") {
    return {
      reality: `노복궁은 협력자·팀원·고객·팬·커뮤니티 운으로 확장해 읽는 것이 정확합니다. ${coreStars}의 결은 사람을 모으는 방식과 신뢰 유지 방식을 드러냅니다.`,
      caution: "관계 피로가 쌓인 상태에서 무리한 확장을 하면 도움보다 소모가 커질 수 있습니다.",
      action: "도움받을 사람 유형과 피해야 할 협력자 패턴을 명확히 적어두고, 협업의 경계(역할·보상·기한)를 선명하게 하세요.",
    };
  }

  if (palace.id === "children") {
    return {
      reality: `자녀궁은 실제 자녀뿐 아니라 창작물·프로젝트·후배 육성의 궁입니다. ${coreStars}는 결과물이 세상에 나가는 방식과 완성도를 좌우합니다.`,
      caution: "완벽주의로 공개가 늦어지거나, 반대로 속도만 높아 품질 관리가 약해지는 양극단을 경계해야 합니다.",
      action: "작게라도 정기 공개 주기를 만들고, 후배/팀원에게는 기준과 피드백 루프를 함께 제공하세요.",
    };
  }

  if (palace.id === "fortune") {
    return {
      reality: `복덕궁은 성취 이후 마음이 쉬는 방식까지 보여줍니다. ${coreStars}는 당신의 행복감 회복 장치와 번아웃 민감도를 알려줍니다.`,
      caution: "쉬어도 죄책감이 남는 패턴이 반복되면 내면 에너지가 바닥나기 쉽습니다.",
      action: "성과와 무관한 휴식 루틴(산책, 취미, 기록)을 고정해 마음의 회복 근육을 먼저 키우세요.",
    };
  }

  const direction = score >= 70 ? "지금은 이 장점을 적극적으로 확장할 타이밍" : score <= 45 ? "속도를 늦추고 기초를 재정비할 타이밍" : "균형 조정으로 성과를 키울 타이밍";
  return {
    reality: `${coreStars}의 결은 ${PALACE_DEFINITION_MAP[palace.id].focus} 영역에서 현실 반응으로 나타납니다.`,
    caution: "좋은 흐름도 관리가 느슨해지면 쉽게 흔들릴 수 있으니 리듬 유지가 중요합니다.",
    action: `${direction}입니다. 작은 루틴을 먼저 고정한 뒤 큰 선택을 진행하면 안정성이 올라갑니다.`,
  };
}

function uniqueList(values: string[]): string[] {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function joinStarNames(stars: ZiweiStarMeta[], fallback: string): string {
  const names = stars.map((star) => `${star.name}${star.strengthSymbol || star.symbol || ""}`).filter(Boolean);
  return names.length ? names.join(" · ") : fallback;
}

function buildPalaceEvidenceLines(item: ZiweiPalaceCounselingItem): string[] {
  const palace = item.palace;
  const transformations = item.transformations.filter((line) => !line.includes("직접 작동은 크지"));
  return [
    `관련 궁: ${palace.name}(${palace.earthlyBranch})`,
    `핵심 주성: ${joinStarNames(palace.mainStars, "직접 주성 없음")}`,
    `보조 요소: ${joinStarNames([...palace.auxiliaryStars, ...palace.maleficStars], "직접 보조성·살성 정보 제한")}`,
    `사화: ${transformations.length ? transformations.join(" / ") : "직접 사화 신호는 약함"}`,
    `연결 구조: 대궁 ${palace.oppositePalace?.name || "확인 제한"} / 삼방사정 ${palace.sanFangSiZheng?.palaceNames?.join(" · ") || palace.triadPalaceIds.join(" · ") || "확인 제한"}`,
    `궁세: ${palaceForceLabel(item.energy)}(${Math.round(item.energy)})`,
  ];
}

function buildPalaceEvidence(item: ZiweiPalaceCounselingItem): ZiweiPalaceEvidence {
  const palace = item.palace;
  const transformations = item.transformations.filter((line) => !line.includes("직접 작동은 크지"));
  return {
    mainStars: palace.mainStars.map((star) => `${star.name}${star.strengthSymbol || star.symbol || ""}`),
    auxiliaryStars: [...palace.auxiliaryStars, ...palace.maleficStars].map((star) => star.name),
    transformations,
    oppositePalace: palace.oppositePalace?.name || "",
    relatedPalaces: palace.sanFangSiZheng?.palaceNames || palace.triadPalaceIds,
    lines: buildPalaceEvidenceLines(item),
  };
}

function rowsForTrack(track: ZiweiCounselingTrackConfig, rows: ZiweiPalaceCounselingItem[]) {
  const byId = Object.fromEntries(rows.map((row) => [row.palace.id, row] as const));
  const primary = track.primaryPalaces.map((id) => byId[id]).filter(Boolean) as ZiweiPalaceCounselingItem[];
  const secondary = track.secondaryPalaces.map((id) => byId[id]).filter(Boolean) as ZiweiPalaceCounselingItem[];
  const ranked = uniqueList([...primary, ...secondary].map((row) => row.palace.id))
    .map((id) => byId[id as ZiweiPalaceId])
    .filter(Boolean)
    .sort((a, b) => b.energy - a.energy) as ZiweiPalaceCounselingItem[];
  return { byId, primary, secondary, ranked };
}

function trackPalacePriority(track: ZiweiCounselingTrackConfig, palaceId: ZiweiPalaceId): "primary" | "secondary" | "supporting" {
  if (track.primaryPalaces.includes(palaceId)) return "primary";
  if (track.secondaryPalaces.includes(palaceId)) return "secondary";
  return "supporting";
}

function trackPriorityLabel(priority: "primary" | "secondary" | "supporting"): string {
  if (priority === "primary") return "이 상담에서 중요한 궁";
  if (priority === "secondary") return "보조로 함께 볼 궁";
  return "전체 균형 참고";
}

function trackPriorityToneClass(priority: "primary" | "secondary" | "supporting"): string {
  if (priority === "primary") return "border-amber-200/35 bg-amber-200/14 text-amber-50";
  if (priority === "secondary") return "border-cyan-200/30 bg-cyan-200/12 text-cyan-50";
  return "border-white/10 bg-white/6 text-slate-300";
}

function buildTrackRelevance(track: ZiweiCounselingTrackConfig, item: ZiweiPalaceCounselingItem): string {
  const priority = trackPalacePriority(track, item.palace.id);
  if (priority === "primary") {
    return `${item.palace.name}은 ${track.title} 상담의 중심 궁입니다. 이 궁의 주성·사화·궁세가 상담 결론의 우선순위를 직접 정합니다.`;
  }
  if (priority === "secondary") {
    return `${item.palace.name}은 ${track.title} 상담을 보정하는 궁입니다. 중심 궁의 결론이 현실에서 어떻게 작동하는지 확인하는 보조 근거로 봅니다.`;
  }
  return `${item.palace.name}은 이번 트랙의 직접 중심은 아니지만, 전체 명반 균형을 확인할 때 참고하는 배경 궁입니다.`;
}

function buildTrackManifestation(track: ZiweiCounselingTrackConfig, item: ZiweiPalaceCounselingItem): string[] {
  const palaceFocus = PALACE_DEFINITION_MAP[item.palace.id].focus;
  const mainStars = item.palace.mainStars.map((star) => star.name).slice(0, 2).join(" · ") || "대궁·삼방사정";
  const base = `${track.shortTitle} 주제에서는 ${item.palace.name}의 ${palaceFocus}가 ${mainStars}의 결을 통해 현실 행동으로 드러납니다.`;
  const pressure = item.energy >= 62
    ? `잘 작동할 때는 ${palaceFocus}에서 결정이 빨라지고, 주변이 신뢰할 수 있는 기준을 만들기 쉽습니다.`
    : `흔들릴 때는 ${palaceFocus}에서 판단이 늦어지거나 같은 문제를 반복 점검하느라 에너지가 소모될 수 있습니다.`;
  const contextByTrack: Record<ZiweiConsultationTrackId, string> = {
    life: "삶의 큰 선택에서는 빠른 결론보다 내가 반복해서 선택하는 기준을 확인할수록 명반의 장점이 안정적으로 살아납니다.",
    career: "업무에서는 역할·권한·평가 기준이 명확할수록 장점이 선명해지고, 모호한 책임 구조에서는 피로가 빨리 쌓일 수 있습니다.",
    wealth: "돈 문제에서는 수입의 크기보다 관리 규칙, 계약 검토, 손실 한도를 먼저 정할 때 체감 안정감이 올라갑니다.",
    love: "관계에서는 감정의 크기보다 회복 방식과 경계 합의가 오래 가는 힘을 만들며, 침묵이나 압박이 반복될 때 소모가 커집니다.",
    relationships: "사람 사이에서는 친밀감보다 역할과 기대치를 먼저 맞출 때 신뢰가 쌓이고, 애매한 약속은 관계 피로로 번지기 쉽습니다.",
    family: "가족 안에서는 책임을 떠안는 속도와 정서적 거리를 함께 보아야 하며, 돌봄과 독립의 기준을 나누면 부담이 줄어듭니다.",
    health: "생활에서는 몸의 신호를 성과보다 먼저 확인할 때 리듬이 무너지지 않습니다. 이 해석은 의학적 진단이 아니라 생활 패턴 조언입니다.",
    timing: "시기 판단에서는 확장할 일과 보수적으로 다룰 일을 분리해야 합니다. 계산된 운한이 없는 영역은 원국의 선택 기준까지만 봅니다.",
  };
  const context = contextByTrack[track.key];
  return [base, pressure, context];
}

function buildTrackSpecificAdvice(track: ZiweiCounselingTrackConfig, item: ZiweiPalaceCounselingItem): string[] {
  const palaceName = item.palace.name;
  const focus = PALACE_DEFINITION_MAP[item.palace.id].focus;
  const adviceByTrack: Record<ZiweiConsultationTrackId, string[]> = {
    life: [
      `${palaceName}의 ${focus}을 하루 선택 기준 하나로 적어두면 반복 패턴을 더 빨리 알아차릴 수 있습니다.`,
      "큰 결정을 앞두면 강하게 끌리는 선택과 오래 버틸 수 있는 선택을 따로 비교하세요.",
    ],
    career: [
      `${palaceName}이 강하게 반응하는 업무 조건을 역할·권한·평가 기준으로 나눠 확인하세요.`,
      "새 제안을 받을 때는 직함보다 실제 책임 범위와 회복 가능한 일정인지 먼저 보세요.",
    ],
    wealth: [
      `${palaceName}의 흐름을 수입, 지출, 보유, 위험 한도 네 칸으로 나누어 관리하면 누수를 줄일 수 있습니다.`,
      "큰돈이 오가는 선택에서는 기대 수익보다 손실이 났을 때 멈출 기준을 먼저 정하세요.",
    ],
    love: [
      `${palaceName}에서 올라오는 감정은 바로 결론 내리기보다 원하는 거리감과 회복 방식을 말로 확인하는 편이 좋습니다.`,
      "관계 대화에서는 상대 평가보다 내가 필요한 시간, 약속, 표현을 구체적으로 말하세요.",
    ],
    relationships: [
      `${palaceName}의 사람운은 호감보다 역할 합의가 먼저 잡힐 때 안정됩니다.`,
      "도움을 주기 전에는 내가 맡을 범위와 멈출 기준을 한 문장으로 정해두세요.",
    ],
    family: [
      `${palaceName}의 책임 흐름은 돌봄과 독립을 함께 세울 때 무겁게 굳지 않습니다.`,
      "가족 대화에서는 마음의 옳고 그름보다 누가, 언제, 어디까지 맡을지를 먼저 나누세요.",
    ],
    health: [
      `${palaceName}의 신호는 컨디션을 단정하기보다 수면, 식사, 이동, 감정 반응의 리듬으로 점검하세요.`,
      "불편함이 지속되거나 강해지면 생활 조언에 머물지 말고 전문가 상담을 함께 고려하세요.",
    ],
    timing: [
      `${palaceName}이 운에서 강조될 때는 새로 벌릴 일과 정리할 일을 한 목록에 섞지 않는 편이 안전합니다.`,
      "현재 운한 데이터가 확인되는 범위 안에서만 기회와 부담을 나누고, 특정 사건은 단정하지 마세요.",
    ],
  };
  return adviceByTrack[track.key];
}

function buildPalaceTimingInterpretation(chart: ZiweiDeepChart, track: ZiweiCounselingTrackConfig, item: ZiweiPalaceCounselingItem): string {
  const annual = chart.annualFlow;
  if (annual?.keyPalaces?.includes(item.palace.id)) {
    return `${annual.yearLabel} 흐름에서 ${item.palace.name}이 핵심 궁으로 잡혀, ${track.shortTitle} 주제에서 이 궁의 선택 기준이 더 자주 시험될 수 있습니다.`;
  }
  if (track.key === "timing" && !annual) {
    return "현재 계산 결과에는 세운 핵심 궁 데이터가 없어 특정 연도 사건을 단정하지 않습니다. 원국의 강한 궁과 관리 궁을 기준으로 선택 우선순위만 제시합니다.";
  }
  return "현재 계산 결과에서는 이 궁에 대한 별도 세운 변화가 확인되지 않아 원국 기준으로 해석합니다.";
}

function buildPalaceReading(chart: ZiweiDeepChart, track: ZiweiCounselingTrackConfig, item: ZiweiPalaceCounselingItem): ZiweiTrackPalaceReading {
  const priority = trackPalacePriority(track, item.palace.id);
  const evidence = buildPalaceEvidence(item);
  const limitations: string[] = [];
  if (item.isBorrowed) limitations.push("직접 주성이 약해 대궁·삼방사정 보정으로 읽었습니다.");
  if (!item.palace.fourTransformations.length && !item.palace.incomingFourTransformations.length) limitations.push("직접 사화 신호는 강하게 확인되지 않습니다.");
  if (!chart.annualFlow) limitations.push("현재 세운 데이터가 없어 특정 시기 예측은 제외했습니다.");

  return {
    palaceId: item.palace.id,
    palaceName: item.palace.name,
    headline: `${item.palace.name}은 ${track.shortTitle} 상담에서 ${priority === "primary" ? "가장 먼저 확인할 축" : priority === "secondary" ? "현실 적용을 보정하는 축" : "전체 균형을 확인하는 축"}입니다.`,
    customerMeaning: `${item.palace.name}은 ${PALACE_DEFINITION_MAP[item.palace.id].definition}입니다. ${track.title}에서는 ${PALACE_DEFINITION_MAP[item.palace.id].focus}이 실제 선택 기준으로 어떻게 드러나는지 봅니다.`,
    corePattern: `${item.starMechanics} ${item.brightness}`,
    strengths: [item.strengths, item.assists],
    challenges: [item.cautions, item.malefics],
    realLifeManifestations: buildTrackManifestation(track, item),
    crossPalaceInterpretation: `${item.palace.oppositePalace?.name || "대궁"}과 ${item.palace.sanFangSiZheng?.palaceNames?.join(" · ") || "삼방사정"}을 함께 보면, 이 궁은 단독 결론보다 관계망 속에서 더 정확하게 읽힙니다.`,
    selectedTrackRelevance: buildTrackRelevance(track, item),
    timingInterpretation: buildPalaceTimingInterpretation(chart, track, item),
    practicalAdvice: [item.advice, ...buildTrackSpecificAdvice(track, item), item.prescription],
    evidence,
    dataLimitations: limitations,
    priority,
  };
}

function buildTrackAnalysis(chart: ZiweiDeepChart, track: ZiweiCounselingTrackConfig, rows: ZiweiPalaceCounselingItem[], copy: AdvancedZiweiCopy): ZiweiTrackAnalysis {
  const { primary, secondary, ranked } = rowsForTrack(track, rows);
  const strongest = ranked[0] || rows[0];
  const second = ranked[1] || strongest;
  const third = ranked[2] || second;
  const weakest = [...primary, ...secondary].sort((a, b) => a.energy - b.energy)[0] || [...rows].sort((a, b) => a.energy - b.energy)[0];
  const keyPalaces = uniqueList([...track.primaryPalaces, ...track.secondaryPalaces]).map((id) => rows.find((row) => row.palace.id === id)).filter(Boolean) as ZiweiPalaceCounselingItem[];
  const keyPatterns: ZiweiTrackPattern[] = [strongest, second, third].filter(Boolean).map((item, index) => ({
    title: index === 0 ? `${item.palace.name}이 여는 ${track.shortTitle}의 핵심 장점` : index === 1 ? `${item.palace.name}에서 확인되는 보정 조건` : `${item.palace.name}이 알려주는 반복 패턴`,
    interpretation: `${item.palace.name}은 ${palaceForceLabel(item.energy)}로 읽힙니다. ${buildTrackRelevance(track, item)} ${item.reality}`,
    evidence: buildPalaceEvidenceLines(item),
    palaceIds: [item.palace.id],
  }));

  const palaceReadings = rows.map((item) => buildPalaceReading(chart, track, item));
  const trackPalaceNames = keyPalaces.map((item) => item.palace.name).join(" · ");
  const summary = `${track.title}에서는 ${trackPalaceNames || "명반 전체"}을 우선 봅니다. 이 명반은 ${strongest?.palace.name || "강한 궁"}의 장점을 살리되, ${weakest?.palace.name || "관리 궁"}의 피로 신호를 생활 규칙으로 조절할 때 안정적으로 읽힙니다.`;
  const annual = chart.annualFlow;
  const qualityWarnings = [
    ...(palaceReadings.length === 12 ? [] : ["12궁 전체 해석 데이터가 완성되지 않아 표시 범위를 제한했습니다."]),
    ...(keyPatterns.every((pattern) => pattern.evidence.length) ? [] : ["핵심 패턴 중 명반 근거가 부족한 항목은 결론에서 제외해야 합니다."]),
    ...(keyPalaces.length ? [] : ["선택한 상담 트랙의 핵심 궁 매핑을 확인하지 못했습니다."]),
  ];
  const timingEvidence = annual
    ? [
        `세운 라벨: ${annual.yearLabel}`,
        `핵심 궁: ${annual.keyPalaces.map((id) => rows.find((row) => row.palace.id === id)?.palace.name || id).join(" · ")}`,
        ...annual.notes.slice(0, 3),
      ]
    : [];

  const timing = annual
    ? {
        available: true,
        currentTheme: `${annual.yearLabel}에는 ${annual.keyPalaces.map((id) => rows.find((row) => row.palace.id === id)?.palace.name || id).join(" · ")} 흐름이 강조됩니다.`,
        opportunities: annual.keyPalaces.map((id) => rows.find((row) => row.palace.id === id)).filter(Boolean).slice(0, 3).map((item) => `${item!.palace.name}: ${item!.strengths}`),
        cautions: annual.keyPalaces.map((id) => rows.find((row) => row.palace.id === id)).filter(Boolean).slice(0, 3).map((item) => `${item!.palace.name}: ${item!.cautions}`),
        recommendedActions: annual.keyPalaces.map((id) => rows.find((row) => row.palace.id === id)).filter(Boolean).slice(0, 3).map((item) => item!.advice),
        evidence: timingEvidence,
      }
    : {
        available: false,
        currentTheme: "현재 계산 결과에는 세운 핵심 데이터가 없어 특정 시기 예측은 생성하지 않았습니다.",
        opportunities: ["원국에서 강한 궁을 먼저 활용하고, 관리 궁은 생활 규칙으로 보정하는 방식이 안전합니다."],
        cautions: ["현재 연도·특정 사건·확정적 결과는 계산 근거가 없어 말하지 않습니다."],
        recommendedActions: [track.timingFocus],
        evidence: ["annualFlow 데이터 없음", chart.majorPeriods.length ? `대한 구간 목록 ${chart.majorPeriods.length}개 확인` : "대한 구간 데이터 없음"],
      };
  const strongestTrackAdvice = strongest ? buildTrackSpecificAdvice(track, strongest) : [];
  const weakestTrackAdvice = weakest ? buildTrackSpecificAdvice(track, weakest) : [];
  const primaryPalaceNames = track.primaryPalaces.map((id) => rows.find((row) => row.palace.id === id)?.palace.name || id).join(" · ");

  const consultationFlow: ZiweiTrackFlowStage[] = [
    {
      stage: "1",
      title: copy.chapterTitles.conclusion,
      content: `${track.title}의 결론은 ${strongest?.palace.name || "핵심 궁"}의 힘을 먼저 쓰고 ${weakest?.palace.name || "관리 궁"}의 반복 피로를 줄이는 것입니다. ${summary}`,
      evidence: strongest ? buildPalaceEvidenceLines(strongest) : [],
      actions: [`${strongest?.palace.name || "강한 궁"}과 관련된 선택을 이번 주 우선순위로 올리세요.`, `${weakest?.palace.name || "관리 궁"}의 과부하 신호를 하루 한 번 기록하세요.`],
    },
    {
      stage: "2",
      title: copy.chapterTitles.whyChart,
      content: `${track.interpretationPriorities.join(" / ")} 순서로 보면 트랙의 초점이 흐려지지 않습니다. 전문 용어는 근거로 남기고, 실제 판단은 행동 기준으로 바꿉니다.`,
      evidence: keyPalaces.flatMap((item) => buildPalaceEvidenceLines(item)).slice(0, 8),
      actions: track.keyQuestions.slice(0, 2),
    },
    {
      stage: "3",
      title: copy.chapterTitles.realLife,
      content: `${strongest?.reality || "핵심 궁의 현실 반응을 확인합니다."} ${second?.reality || ""}`,
      evidence: [strongest?.palace.name, second?.palace.name].filter(Boolean) as string[],
      actions: [track.actionGuideType, ...strongestTrackAdvice.slice(0, 1), weakest?.advice || "관리 궁의 루틴을 먼저 세우세요."],
    },
    {
      stage: "4",
      title: copy.chapterTitles.repeatedPattern,
      content: `${strongest?.palace.name || "강한 궁"}이 빠르게 앞서가고 ${weakest?.palace.name || "관리 궁"}이 뒤에서 피로를 만드는 구도가 반복될 수 있습니다. 이 차이는 좋고 나쁨보다 속도 차이로 읽어야 합니다.`,
      evidence: [strongest ? `${strongest.palace.name} ${palaceForceLabel(strongest.energy)}` : "", weakest ? `${weakest.palace.name} ${palaceForceLabel(weakest.energy)}` : ""].filter(Boolean),
      actions: ["강한 궁은 확장 기준으로, 약한 궁은 점검표로 분리하세요."],
    },
    {
      stage: "5",
      title: copy.chapterTitles.currentTiming,
      content: timing.currentTheme,
      evidence: timing.evidence,
      actions: [...timing.opportunities.slice(0, 1), ...timing.cautions.slice(0, 1)],
    },
    {
      stage: "6",
      title: copy.chapterTitles.actionAdvice,
      content: `${track.actionGuideType} 조언은 명반의 중심 궁과 관리 궁을 연결해 현실에서 바로 점검할 수 있게 정리했습니다.`,
      evidence: keyPalaces.slice(0, 3).map((item) => `${item.palace.name}: ${item.keywords.join(" · ") || "키워드 제한"}`),
      actions: [strongest?.advice, ...strongestTrackAdvice.slice(0, 2), ...weakestTrackAdvice.slice(0, 1)].filter(Boolean) as string[],
    },
    {
      stage: "7",
      title: copy.chapterTitles.closing,
      content: `${track.title}의 흐름은 사용자를 규정하기보다, 강한 축을 어떻게 쓰고 약한 축을 어떻게 돌볼지 알려줍니다. 지금은 ${strongest?.palace.name || "강점"}을 믿되 ${weakest?.palace.name || "조절점"}을 방치하지 않는 태도가 중요합니다.`,
      evidence: track.keyQuestions,
      actions: track.keyQuestions.slice(0, 3),
    },
  ];

  return {
    selectedTrack: track,
    executiveSummary: {
      headline: `${track.shortTitle} 상담의 핵심은 ${strongest?.palace.name || "중심 궁"} 활용과 ${weakest?.palace.name || "관리 궁"} 조율입니다.`,
      summary,
      keyPatterns,
    },
    consultationFlow,
    palaceReadings,
    timing,
    actionPlan: {
      start: [strongest?.advice || "강한 궁의 장점을 한 가지 행동으로 옮기세요.", ...strongestTrackAdvice.slice(0, 1), `${primaryPalaceNames} 관련 선택을 먼저 정리하세요.`],
      reduce: [weakest?.cautions || "피로가 누적되는 궁의 반복 반응을 줄이세요.", ...weakestTrackAdvice.slice(0, 1), ...track.cautionRules.slice(0, 1)],
      maintain: [strongest?.prescription || "강점을 유지할 작은 루틴을 고정하세요.", "명반 근거와 현실 행동을 분리해 점검하세요.", "앞으로 3개월 동안 같은 기준을 반복 점검하세요."],
      reflectionQuestions: track.keyQuestions.slice(0, 3),
    },
    dataWarnings: [
      ...qualityWarnings,
      ...(annual ? [] : ["현재 세운 데이터가 없어 특정 시기 예측은 제외했습니다."]),
      ...keyPalaces.filter((item) => item.isBorrowed).map((item) => `${item.palace.name}은 직접 주성이 약해 대궁·삼방사정 보정으로 읽었습니다.`),
    ],
  };
}

function zPatternStrengthDescription(symbol: string, copy: AdvancedZiweiCopy): string {
  const key = ZIWEI_STRENGTH_SYMBOL_KEY[symbol];
  return key ? copy.strengthDescriptions[key] : "별의 흐름을 다시 살펴야 하는 상태";
}

function StagePanel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`relative overflow-hidden rounded-[1.75rem] border border-white/12 bg-white/6 shadow-[0_20px_70px_rgba(2,6,23,0.45)] backdrop-blur-2xl before:pointer-events-none before:absolute before:inset-[1px] before:rounded-[1.6rem] before:border before:border-white/10 before:opacity-40 ${className || ""}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.08),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.08),transparent_28%)]" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function GalaxyBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(74,144,226,0.18),transparent_35%),radial-gradient(circle_at_20%_20%,rgba(250,204,21,0.14),transparent_24%),radial-gradient(circle_at_80%_15%,rgba(103,80,164,0.3),transparent_30%),linear-gradient(180deg,#02050f_0%,#050816_45%,#02030a_100%)]" />
      <m.div
        className="absolute -left-10 top-16 h-72 w-72 rounded-full bg-cyan-300/12 blur-3xl"
        animate={{ x: [0, 18, 0], y: [0, -12, 0], opacity: [0.3, 0.55, 0.3] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <m.div
        className="absolute right-0 top-0 h-80 w-80 rounded-full bg-amber-300/10 blur-3xl"
        animate={{ x: [0, -12, 0], y: [0, 20, 0], opacity: [0.28, 0.45, 0.28] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <m.div
        className="absolute bottom-0 left-1/3 h-[28rem] w-[28rem] rounded-full bg-fuchsia-400/10 blur-3xl"
        animate={{ scale: [1, 1.08, 1], opacity: [0.18, 0.4, 0.18] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(255,255,255,0.38)_1px,transparent_1px),radial-gradient(rgba(255,255,255,0.24)_1px,transparent_1px)] [background-size:140px_140px,180px_180px] [background-position:0_0,70px_45px]" />
      <m.div
        className="absolute inset-x-1/4 top-8 h-px bg-gradient-to-r from-transparent via-amber-200/40 to-transparent"
        animate={{ opacity: [0.15, 0.6, 0.15], scaleX: [0.9, 1, 0.9] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <m.div
        className="absolute bottom-16 left-1/2 h-40 w-[34rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-300/10 via-amber-200/12 to-fuchsia-300/10 blur-3xl"
        animate={{ y: [0, -12, 0], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <m.div
        className="absolute inset-x-0 top-1/4 h-px bg-gradient-to-r from-transparent via-cyan-200/50 to-transparent"
        animate={{ opacity: [0.2, 0.65, 0.2], scaleX: [0.96, 1, 0.96] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function StarToneBadge({ symbol, copy }: { symbol: string; copy: AdvancedZiweiCopy }) {
  const text = zPatternStrengthDescription(symbol, copy);
  const toneClass =
    symbol === "◎"
      ? "border-emerald-300/40 bg-emerald-200/12 text-emerald-50 shadow-[0_0_28px_rgba(52,211,153,0.15)]"
      : symbol === "O"
        ? "border-cyan-300/40 bg-cyan-200/12 text-cyan-50 shadow-[0_0_28px_rgba(103,232,249,0.12)]"
        : symbol === "▲"
          ? "border-amber-300/40 bg-amber-200/12 text-amber-50 shadow-[0_0_28px_rgba(251,191,36,0.12)]"
          : symbol === "△"
            ? "border-slate-300/40 bg-slate-200/12 text-slate-50 shadow-[0_0_24px_rgba(148,163,184,0.1)]"
            : "border-rose-300/40 bg-rose-200/12 text-rose-50 shadow-[0_0_24px_rgba(251,113,133,0.12)]";

  return (
    <span className={`group relative inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold shadow-[0_0_20px_rgba(255,255,255,0.08)] ${toneClass}`}>
      <span>{symbol}</span>
      <span>{text}</span>
    </span>
  );
}

export default function AdvancedZiweiSectionV2({
  showIntro = false,
  onStartGeneration,
  generationLoading = false,
}: AdvancedZiweiSectionProps) {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const copy = useMemo(() => getAdvancedZiweiCopy(locale), [locale]);
  const counselingTracks = useMemo(() => buildCounselingTracks(copy), [copy]);

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    return () => {
      window.removeEventListener("cd:locale-ready", syncLocale);
    };
  }, []);

  const [step, setStep] = useState<Step>("form");
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState(() => getAdvancedZiweiCopy(getCurrentLoadingLocale()).loadingInitialText);
  const [chart, setChart] = useState<ZiweiDeepChart | null>(null);
  const [chapters, setChapters] = useState<Partial<Record<ZiweiSectionId, ZiweiDeepChapter>>>({});
  const [activeSection, setActiveSection] = useState<ZiweiSectionId>("overview");
  const [activeTrackId, setActiveTrackId] = useState<ZiweiConsultationTrackId>("life");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [form, setForm] = useState<FormState>(() => ({
    name: "",
    birthYear: "",
    birthMonth: "1",
    birthDay: "1",
    birthHour: "",
    birthMinute: "0",
    unknownHour: false,
    gender: "F",
    calendarType: "solar",
    isLeapMonth: false,
    birthPlace: getAdvancedZiweiCopy(getCurrentLoadingLocale()).defaultBirthPlaceValue,
    timezone: "Asia/Seoul",
  }));

  const autoComputeRef = useRef(false);
  const currentProfileFingerprintRef = useRef("");

  // 심화 자미두수 명반은 무료 열람 — 영구 해금 잠금 모델 제거. 유료 요소는 전문가 상담/PDF의 회당 결제로 통일.

  // 심화 자미두수 PDF (ZIWEI_DEEP_PDF): 폼 → PDF 리포트 생성용 출생 정보
  const deepPdfBirth = useMemo<ZiweiDeepBirthInput>(() => ({
    name: form.name.trim(),
    gender: form.gender === "M" ? "male" : "female",
    birthDate: `${String(form.birthYear || "").padStart(4, "0")}-${pad2(Number(form.birthMonth) || 1)}-${pad2(Number(form.birthDay) || 1)}`,
    birthTime: form.unknownHour ? "" : `${pad2(Number(form.birthHour) || 0)}:${pad2(Number(form.birthMinute) || 0)}`,
    birthTimeUnknown: form.unknownHour,
    calendarType: form.calendarType,
    isLeapMonth: form.calendarType === "lunar" ? form.isLeapMonth : false,
  }), [form]);

  const activeChapter = chapters[activeSection];
  const activeTrack = useMemo(() => counselingTracks.find((track) => track.key === activeTrackId) || counselingTracks[0], [activeTrackId, counselingTracks]);

  const activePalace = useMemo(() => {
    if (!chart) return null;
    if (activeSection === "overview" || activeSection === "master") return null;
    return chart.palaces.find((p) => p.id === activeSection) || null;
  }, [activeSection, chart]);

  const normalizeStrengthBand = useCallback((star: ZiweiStarMeta): "묘" | "득" | "리" | "평" | "함" | "" => {
    const strength = String(star?.strength || "").trim();
    if (strength === "왕") return "묘";
    if (["묘", "득", "리", "평", "함"].includes(strength)) return strength as "묘" | "득" | "리" | "평" | "함";
    const symbol = String(star?.strengthSymbol || star?.symbol || "").trim();
    if (symbol === "◎") return "묘";
    if (symbol === "O" || symbol === "○") return "득";
    if (symbol === "▲") return "리";
    if (symbol === "△") return "평";
    if (symbol === "X" || symbol === "×") return "함";
    return "";
  }, []);

  const activeStrengthBands = useMemo(() => {
    const counts = { miao: 0, deuk: 0, li: 0, ping: 0, ham: 0 };
    if (!activePalace) return counts;
    activePalace.allStars.forEach((star) => {
      const band = normalizeStrengthBand(star);
      if (band === "묘") counts.miao += 1;
      if (band === "득") counts.deuk += 1;
      if (band === "리") counts.li += 1;
      if (band === "평") counts.ping += 1;
      if (band === "함") counts.ham += 1;
    });
    return counts;
  }, [activePalace, normalizeStrengthBand]);

  const palaceCounseling = useMemo(() => {
    if (!chart) return [] as ZiweiPalaceCounselingItem[];

    return chart.palaces.map((palace) => {
      const energy = buildEnergyScore(palace);
      const keywords = pickKeywords(palace);
      const bands = palace.allStars
        .map((star) => normalizeStrengthBandFromStar(star))
        .filter(Boolean) as Array<"묘" | "득" | "리" | "평" | "함">;

      const bandSummary = bands.length
        ? [...new Set(bands)].map((band) => `${BRIGHTNESS_RULES[band].symbol} ${BRIGHTNESS_RULES[band].tone}`).join(" ")
        : "별의 밝기 데이터가 제한적이라 궁의 관계 흐름과 루틴 중심으로 해석합니다.";

      const assistNames = palace.auxiliaryStars.map((s) => s.name);
      const maleficNames = palace.maleficStars.map((s) => s.name);
      const mainNames = palace.mainStars.map((s) => s.name);
      const transformLabels = [...(palace.fourTransformations || []), ...(palace.incomingFourTransformations || [])].map((ft) => {
        const label = transformationTypeToLabel(ft.type);
        return `${label}(${ft.starName})`;
      });

      const assistLine = assistNames.length
        ? `${assistNames.join(" · ")}가 이 궁의 약점을 보완하며 사람·문서·자원 형태의 조력으로 들어옵니다.`
        : "보조성의 직접 보정은 약하지만, 루틴을 세우면 궁의 기본 힘이 살아납니다.";

      const maleficLine = maleficNames.length
        ? `${maleficNames.join(" · ")}는 사건성과 속도를 높입니다. 나쁜 신호로만 볼 필요는 없고, 리스크 관리가 필요한 가속 장치로 읽습니다.`
        : "급격한 충돌 신호는 약한 편이라, 꾸준함이 성패를 가릅니다.";

      const transformLine = transformLabels.length
        ? transformLabels.map((label) => {
            const short = label.startsWith("화록")
              ? TRANSFORMATION_RULES["화록"]
              : label.startsWith("화권")
                ? TRANSFORMATION_RULES["화권"]
                : label.startsWith("화과")
                  ? TRANSFORMATION_RULES["화과"]
                  : TRANSFORMATION_RULES["화기"];
            return `${label}: ${short.tone}`;
          })
        : ["사화의 직접 작동은 크지 않아 기본 성향과 생활 리듬이 결과를 만듭니다."];

      const special = buildPalaceSpecialAdvice(palace, energy);
      const strongestStar = palace.strengthSummary.strongestStars[0]?.name || mainNames[0] || "이 궁";
      const weakestStar = palace.strengthSummary.weakStars[0]?.name || "약한 결";
      const borrowed = palace.isEmptyMainStarPalace || palace.isEmpty;

      return {
        palace,
        energy,
        keywords,
        definition: PALACE_DEFINITION_MAP[palace.id].definition,
        starMechanics: buildStarMeaningLine(mainNames),
        brightness: bandSummary,
        assists: assistLine,
        malefics: maleficLine,
        transformations: transformLine,
        isBorrowed: borrowed,
        reality: special.reality,
        strengths: `${strongestStar}의 장점이 살아날 때 ${PALACE_DEFINITION_MAP[palace.id].focus}에서 안정적인 성과와 신뢰를 만듭니다.`,
        cautions: `${weakestStar} 쪽 피로 신호를 방치하면 작은 오해가 누적되어 방향성을 잃기 쉽습니다. ${special.caution}`,
        advice: special.action,
        prescription: `${PALACE_DEFINITION_MAP[palace.id].name}은 ${energy >= 70 ? "밀어붙이기" : energy <= 45 ? "재정비" : "균형 조율"}가 답입니다.`,
      };
    });
  }, [chart]);

  const strongTop3 = useMemo(() => [...palaceCounseling].sort((a, b) => b.energy - a.energy).slice(0, 3), [palaceCounseling]);
  const weakTop3 = useMemo(() => [...palaceCounseling].sort((a, b) => a.energy - b.energy).slice(0, 3), [palaceCounseling]);
  const trackAnalysis = useMemo(() => (chart && palaceCounseling.length ? buildTrackAnalysis(chart, activeTrack, palaceCounseling, copy) : null), [activeTrack, chart, copy, palaceCounseling]);
  const trackPalaceReadingById = useMemo(() => {
    if (!trackAnalysis) return {} as Partial<Record<ZiweiPalaceId, ZiweiTrackPalaceReading>>;
    return Object.fromEntries(trackAnalysis.palaceReadings.map((reading) => [reading.palaceId, reading])) as Partial<Record<ZiweiPalaceId, ZiweiTrackPalaceReading>>;
  }, [trackAnalysis]);
  const orderedPalaceCounseling = useMemo(() => {
    const order = { primary: 0, secondary: 1, supporting: 2 };
    return [...palaceCounseling].sort((a, b) => {
      const aReading = trackPalaceReadingById[a.palace.id];
      const bReading = trackPalaceReadingById[b.palace.id];
      const priorityGap = order[aReading?.priority || "supporting"] - order[bReading?.priority || "supporting"];
      return priorityGap || b.energy - a.energy;
    });
  }, [palaceCounseling, trackPalaceReadingById]);

  const overallCounselingSummary = useMemo(() => {
    if (!palaceCounseling.length) {
      return [
        copy.overallSummaryLoadingLine1,
        copy.overallSummaryLoadingLine2,
      ];
    }

    const strongest = strongTop3[0];
    const weakest = weakTop3[0];
    const repeatedKeywords = palaceCounseling
      .flatMap((row) => row.keywords)
      .slice(0, 8)
      .join(" · ");

    return [
      `가장 선명하게 열린 궁위는 ${strongest.palace.name}입니다. ${palaceForceLabel(strongest.energy)}로 읽히며, 주성·보조성 배열이 상승 동력을 만듭니다.`,
      `관리 우선순위는 ${weakest.palace.name}입니다. 이 궁은 약점이 아니라 생활 설계를 바꾸면 크게 회복되는 핵심 포인트입니다.`,
      `지금 명반에서 반복되는 패턴 키워드는 ${repeatedKeywords || "관계·일·회복"} 흐름으로 읽힙니다.`,
      `성공의 문은 왕성한 궁의 추진력을 조율이 필요한 궁의 대궁·삼방사정 보정과 연결할 때 안정적으로 열립니다.`,
      `관계에서는 감정의 강도보다 경계와 역할을 먼저 합의할수록 운의 소모를 줄일 수 있습니다.`,
      `지금 가장 먼저 정리할 항목은 관리 궁 1순위의 사화·대궁 신호를 현실 규칙 하나로 고정하는 일입니다.`,
    ];
  }, [copy, palaceCounseling, strongTop3, weakTop3]);

  const palaceLinks = useMemo(() => {
    const byId = Object.fromEntries(palaceCounseling.map((row) => [row.palace.id, row] as const));
    const pairs: Array<{ left: ZiweiPalaceId; right: ZiweiPalaceId; title: string; lens: string }> = [
      { left: "ming", right: "career", title: copy.palaceLinkTitles[0], lens: "타고난 성향이 커리어 성공 방식으로 연결되는 축" },
      { left: "ming", right: "spouse", title: copy.palaceLinkTitles[1], lens: "자기 기질이 관계 패턴으로 드러나는 축" },
      { left: "wealth", right: "career", title: copy.palaceLinkTitles[2], lens: "일의 성과가 수입 구조로 번역되는 축" },
      { left: "spouse", right: "fortune", title: copy.palaceLinkTitles[3], lens: "관계의 안정이 내면 평온으로 이어지는 축" },
      { left: "property", right: "wealth", title: copy.palaceLinkTitles[4], lens: "기반 자산이 현금흐름 안정으로 이어지는 축" },
      { left: "friends", right: "career", title: copy.palaceLinkTitles[5], lens: "협업 네트워크가 커리어를 확장시키는 축" },
    ];

    return pairs
      .map((pair) => {
        const left = byId[pair.left];
        const right = byId[pair.right];
        if (!left || !right) return null;
        const gap = Math.abs(left.energy - right.energy);
        const state = gap <= 12 ? "균형형" : left.energy > right.energy ? `${left.palace.name} 주도형` : `${right.palace.name} 주도형`;
        return {
          ...pair,
          state,
          summary: `${pair.lens}. 현재는 ${state} 흐름이며, 두 궁의 궁세 차이는 ${palaceGapLabel(gap)}. 차이가 클수록 약한 축에 생활 보정이 필요합니다.`,
        };
      })
      .filter(Boolean) as Array<{ title: string; lens: string; state: string; summary: string }>;
  }, [copy, palaceCounseling]);

  const sihuaInsights = useMemo(() => {
    if (!chart) return [] as string[];
    const byType = [
      { label: "화록", star: chart.sihua.hualu },
      { label: "화권", star: chart.sihua.huaquan },
      { label: "화과", star: chart.sihua.huake },
      { label: "화기", star: chart.sihua.huaji },
    ].filter((row) => Boolean(row.star)) as Array<{ label: "화록" | "화권" | "화과" | "화기"; star: string }>;

    return byType.map((row) => {
      const affected = palaceCounseling
        .filter((item) => item.transformations.some((line) => line.includes(row.label)))
        .map((item) => item.palace.name)
        .slice(0, 3)
        .join(" · ");
      const rule = TRANSFORMATION_RULES[row.label];
      return `${row.label}(${row.star})은 ${rule.tone}으로 작동합니다. ${affected ? `현재 ${affected}에서 특히 체감되기 쉽습니다.` : "해당 작동궁은 유동적이므로 관계/일정 변화 시 반응을 관찰하세요."} ${rule.caution}.`;
    });
  }, [chart, palaceCounseling]);

  const borrowedStarInsights = useMemo(() => {
    const borrowed = palaceCounseling.filter((item) => item.isBorrowed);
    if (!borrowed.length) return [] as string[];

    return borrowed.map((item) => {
      return `${item.palace.name}은 차성 구조로 읽힙니다. 타고난 힘이 없다는 뜻이 아니라 환경·관계·타이밍을 맞출수록 장점이 살아나는 궁입니다. 초반보다 후반에 힘이 붙기 쉬우니 무리한 직진보다 조건 정렬이 우선입니다.`;
    });
  }, [palaceCounseling]);

  const enterImmersiveMode = useCallback(async () => {
    if (typeof document === "undefined") return;
    const el = document.documentElement;
    if (!el?.requestFullscreen) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      }
    } catch {
      // no-op
    }
  }, []);

  const exitImmersiveMode = useCallback(async () => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement || !document.exitFullscreen) return;
    try {
      await document.exitFullscreen();
    } catch {
      // no-op
    }
  }, []);

  const toggleImmersiveMode = useCallback(async () => {
    if (isFullscreen) {
      await exitImmersiveMode();
      return;
    }
    await enterImmersiveMode();
  }, [enterImmersiveMode, exitImmersiveMode, isFullscreen]);

  const loadSection = useCallback(
    (section: ZiweiSectionId) => {
      if (!chart) return;
      setActiveSection(section);
      setChapters((prev) => {
        if (prev[section]) return prev;
        const chapter = getZiweiDeepChapter(chart, section);
        return { ...prev, [section]: chapter };
      });
    },
    [chart],
  );

  const selectCounselingTrack = useCallback(
    (trackId: ZiweiConsultationTrackId) => {
      const nextTrack = counselingTracks.find((track) => track.key === trackId) || counselingTracks[0];
      setActiveTrackId(nextTrack.key);
      const firstPalace = nextTrack.primaryPalaces[0];
      if (firstPalace) loadSection(firstPalace);
    },
    [counselingTracks, loadSection],
  );

  const handleCompute = useCallback(() => {
    void enterImmersiveMode();

    if (!form.unknownHour && String(form.birthHour).trim() === "") {
      alert(copy.alertMissingBirthHour);
      return;
    }

    const normalized = normalizeZiweiInput({
      name: form.name,
      birthYear: form.birthYear,
      birthMonth: form.birthMonth,
      birthDay: form.birthDay,
      birthHour: form.birthHour,
      birthMinute: form.birthMinute,
      unknownHour: form.unknownHour,
      gender: form.gender,
      calendarType: form.calendarType,
      isLeapMonth: form.isLeapMonth,
      birthPlace: form.birthPlace,
      timezone: form.timezone,
    });

    if (normalized.errors.length || !normalized.input) {
      alert(normalized.errors.map((e) => e.message).join("\n") || copy.alertCheckInput);
      return;
    }

    setStep("computing");
    setProgress(0);

    const progressTexts = copy.progressTexts;

    let p = 0;
    const timer = setInterval(() => {
      p += 4;
      if (p >= 100) {
        p = 100;
        clearInterval(timer);
      }
      setProgress(p);
      setLoadingText(progressTexts[Math.min(progressTexts.length - 1, Math.floor((p / 100) * progressTexts.length))]);
    }, 120);

    setTimeout(() => {
      try {
        const nextChart = normalizeZiweiForAdvancedReport(calculateZiweiChart(normalized.input!));
        const advancedValidation = validateAdvancedZiweiResult(nextChart);
        if (!advancedValidation.valid) {
          clearInterval(timer);
          alert(copy.alertChartError);
          setStep("form");
          return;
        }

        nextChart.warnings = [...nextChart.warnings, ...normalized.warnings];

        const validation = validateZiweiChart(nextChart);
        if (!validation.valid) {
          clearInterval(timer);
          alert(validation.errors.join("\n"));
          setStep("form");
          return;
        }

        nextChart.debugWarnings = [...(nextChart.debugWarnings || []), ...validation.debugWarnings];

        primeZiweiDeepRuntime(nextChart, ["overview", "ming"]);
        const overview = getZiweiDeepChapter(nextChart, "overview");
        const ming = getZiweiDeepChapter(nextChart, "ming");

        setChart(nextChart);
        setChapters({ overview, ming });
        setActiveSection("ming");

        try {
          sessionStorage.setItem(
            RESULT_CACHE_KEY,
            JSON.stringify({
              chart: nextChart,
              chapters: { overview, ming },
              activeSection: "ming",
              activeTrackId,
              profileFingerprint: currentProfileFingerprintRef.current,
            }),
          );
        } catch {
          // no-op
        }

        clearInterval(timer);
        setProgress(100);
        setTimeout(() => setStep("result"), 320);
      } catch (err) {
        clearInterval(timer);
        console.error("[AdvancedZiweiV2] compute error:", err);
        alert(copy.alertComputeError);
        setStep("form");
      }
    }, 1600);
  }, [activeTrackId, copy, enterImmersiveMode, form]);

  const restoreCachedResult = useCallback((expectedFingerprint: string): boolean => {
    if (!expectedFingerprint) return false;
    try {
      const cached = sessionStorage.getItem(RESULT_CACHE_KEY);
      if (!cached) return false;
      const parsed = JSON.parse(cached);
      if (!parsed?.chart || !parsed?.chapters || parsed.profileFingerprint !== expectedFingerprint) {
        sessionStorage.removeItem(RESULT_CACHE_KEY);
        return false;
      }

      const migratedChart = (!parsed.chart.version || !String(parsed.chart.version).includes("four-transformations"))
        ? normalizeZiweiForAdvancedReport(parsed.chart)
        : parsed.chart;
      const advancedValidation = validateAdvancedZiweiResult(migratedChart);
      if (!advancedValidation.valid) {
        sessionStorage.removeItem(RESULT_CACHE_KEY);
        return false;
      }

      primeZiweiDeepRuntime(migratedChart, ["overview", "ming"]);
      const overview = parsed.chapters?.overview || getZiweiDeepChapter(migratedChart, "overview");
      const ming = parsed.chapters?.ming || getZiweiDeepChapter(migratedChart, "ming");
      setChart(migratedChart);
      setChapters({ ...parsed.chapters, overview, ming });
      setActiveSection(parsed.activeSection || "overview");
      if (ZIWEI_TRACK_KEYS.includes(parsed.activeTrackId)) {
        setActiveTrackId(parsed.activeTrackId);
      }
      setStep("result");
      return true;
    } catch {
      try {
        sessionStorage.removeItem(RESULT_CACHE_KEY);
      } catch {}
      return false;
    }
  }, []);

  const applyCurrentProfileSeed = useCallback((eventProfile?: unknown) => {
    const seed = buildZiweiProfileSeed(eventProfile);
    const nextFingerprint = seed?.fingerprint || "";
    currentProfileFingerprintRef.current = nextFingerprint;

    if (nextFingerprint && restoreCachedResult(nextFingerprint)) {
      autoComputeRef.current = false;
      return;
    }

    try {
      sessionStorage.removeItem(RESULT_CACHE_KEY);
    } catch {}

    setChart(null);
    setChapters({});
    setActiveSection("overview");
    setActiveTrackId("life");
    setStep("form");

    if (!seed) {
      autoComputeRef.current = false;
      return;
    }

    autoComputeRef.current = seed.hasProfileHour;
    setForm((prev) => ({
      ...prev,
      ...seed.form,
    }));
  }, [restoreCachedResult]);

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    syncFullscreen();
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
    };
  }, []);

  useEffect(() => {
    applyCurrentProfileSeed();
  }, [applyCurrentProfileSeed]);

  useEffect(() => {
    const handleProfileUpdated = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : undefined;
      applyCurrentProfileSeed(detail);
    };
    const handleProfileStorage = (event: StorageEvent) => {
      if (!isDestinyProfileStorageKey(event.key)) return;
      applyCurrentProfileSeed();
    };

    window.addEventListener("cd:destiny-profile-updated", handleProfileUpdated);
    window.addEventListener("storage", handleProfileStorage);
    return () => {
      window.removeEventListener("cd:destiny-profile-updated", handleProfileUpdated);
      window.removeEventListener("storage", handleProfileStorage);
    };
  }, [applyCurrentProfileSeed]);

  useEffect(() => {
    if (!autoComputeRef.current || !form.birthYear) return;
    autoComputeRef.current = false;
    handleCompute();
  }, [
    form.birthYear,
    form.birthMonth,
    form.birthDay,
    form.birthHour,
    form.birthMinute,
    form.gender,
    form.calendarType,
    form.unknownHour,
    handleCompute,
  ]);

  if (showIntro) {
    return (
      <section className="font-premium relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#020510] p-6 text-slate-100 md:p-8">
        <GalaxyBackdrop />
        <div className="relative z-10">
          <p className="text-[11px] font-semibold tracking-[0.32em] text-cyan-100/80">ZIWEI PREMIUM COUNSELING</p>
          <h3 className="font-display mt-3 text-2xl font-black leading-tight text-white md:text-3xl">{copy.introTitle}</h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200/90">
            {copy.introDesc}
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => {
                void enterImmersiveMode();
                onStartGeneration?.();
              }}
              disabled={generationLoading}
              className="rounded-2xl bg-gradient-to-r from-cyan-200 via-sky-300 to-amber-200 px-4 py-4 text-sm font-black text-slate-950"
            >
              {copy.introStartButton}
            </button>
            <button
              onClick={() => {
                window.location.href = BASIC_ZIWEI_ENTRY_URL;
              }}
              className="rounded-2xl border border-white/12 bg-white/8 px-4 py-4 text-sm font-semibold text-slate-100"
            >
              {copy.introBasicButton}
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (step === "form") {
    return (
      <section className="font-body relative min-h-[100dvh] overflow-hidden px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
        <GalaxyBackdrop />
        <div className="relative mx-auto flex min-h-[100dvh] max-w-5xl items-center py-[calc(1rem+env(safe-area-inset-top))]">
          <StagePanel className="relative z-10 w-full p-5 sm:p-7 lg:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.3em] text-cyan-100/80">ZIWEI PREMIUM INPUT</p>
                <h2 className="font-display mt-3 text-3xl font-black text-white md:text-4xl">{copy.formTitle}</h2>
                <p className="font-premium mt-3 max-w-2xl text-sm leading-7 text-slate-200/85">
                  {copy.formDesc}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = BASIC_ZIWEI_ENTRY_URL;
                  }}
                  className="rounded-full border border-amber-200/25 bg-amber-200/10 px-4 py-2 text-xs font-semibold text-amber-50"
                >
                  {copy.goBasicButton}
                </button>
                <button
                  type="button"
                  onClick={() => void toggleImmersiveMode()}
                  className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs font-semibold text-slate-100"
                >
                  {isFullscreen ? copy.fullscreenExitLabel : copy.fullscreenEnterLabel}
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-semibold text-cyan-100">{copy.fieldNameLabel}</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-base text-white outline-none ring-0 placeholder:text-slate-500"
                  placeholder={copy.namePlaceholder}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold text-cyan-100">{copy.fieldGenderLabel}</span>
                <select
                  value={form.gender}
                  onChange={(e) => setForm((prev) => ({ ...prev, gender: e.target.value as ZiweiGender }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-base text-white outline-none"
                >
                  <option value="F">{copy.genderLabels.female}</option>
                  <option value="M">{copy.genderLabels.male}</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold text-cyan-100">{copy.fieldBirthYearLabel}</span>
                <input
                  type="number"
                  value={form.birthYear}
                  onChange={(e) => setForm((prev) => ({ ...prev, birthYear: e.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-base text-white outline-none placeholder:text-slate-500"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold text-cyan-100">{copy.fieldBirthMonthLabel}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  placeholder="MM"
                  value={form.birthMonth}
                  onChange={(e) => setForm((prev) => ({ ...prev, birthMonth: digitsOnly(e.target.value, 2) }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-base text-white outline-none placeholder:text-slate-500"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold text-cyan-100">{copy.fieldBirthDayLabel}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  placeholder="DD"
                  value={form.birthDay}
                  onChange={(e) => setForm((prev) => ({ ...prev, birthDay: digitsOnly(e.target.value, 2) }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-base text-white outline-none placeholder:text-slate-500"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold text-cyan-100">{copy.fieldBirthHourLabel}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  placeholder="HH"
                  value={form.birthHour}
                  onChange={(e) => setForm((prev) => ({ ...prev, birthHour: digitsOnly(e.target.value, 2) }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-base text-white outline-none placeholder:text-slate-500"
                  disabled={form.unknownHour}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold text-cyan-100">{copy.fieldCalendarLabel}</span>
                <select
                  value={form.calendarType}
                  onChange={(e) => setForm((prev) => ({ ...prev, calendarType: e.target.value as "solar" | "lunar" }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-base text-white outline-none"
                >
                  <option value="solar">{copy.calendarLabels.solar}</option>
                  <option value="lunar">{copy.calendarLabels.lunar}</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold text-cyan-100">{copy.fieldBirthPlaceLabel}</span>
                <input
                  value={form.birthPlace}
                  onChange={(e) => setForm((prev) => ({ ...prev, birthPlace: e.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-base text-white outline-none placeholder:text-slate-500"
                  placeholder={copy.birthPlacePlaceholder}
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-xs font-semibold text-cyan-100">{copy.fieldTimezoneLabel}</span>
                <input
                  value={form.timezone}
                  onChange={(e) => setForm((prev) => ({ ...prev, timezone: e.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-base text-white outline-none placeholder:text-slate-500"
                  placeholder="Asia/Seoul"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-300">
              <label className="inline-flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.unknownHour}
                  onChange={(e) => setForm((prev) => ({ ...prev, unknownHour: e.target.checked }))}
                  className="h-4 w-4 accent-cyan-300"
                />
                {copy.unknownHourCheckboxLabel}
              </label>
              <label className="inline-flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isLeapMonth}
                  onChange={(e) => setForm((prev) => ({ ...prev, isLeapMonth: e.target.checked }))}
                  className="h-4 w-4 accent-cyan-300"
                />
                {copy.leapMonthCheckboxLabel}
              </label>
            </div>

            <p className="mt-3 text-xs leading-6 text-amber-100/85">
              {copy.formDisclaimer}
            </p>

            <button
              type="button"
              onClick={handleCompute}
              className="mt-6 w-full rounded-2xl bg-gradient-to-r from-cyan-200 via-sky-300 to-amber-200 px-5 py-4 text-sm font-black text-slate-950"
            >
              {copy.computeButton}
            </button>
          </StagePanel>
        </div>
      </section>
    );
  }

  if (step === "computing") {
    return (
      <section className="font-body relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-6 text-center text-slate-100">
        <GalaxyBackdrop />
        <div className="relative z-10 w-full max-w-xl">
          <StagePanel className="p-8 sm:p-10">
            <p className="text-[11px] font-semibold tracking-[0.3em] text-cyan-100/80">{copy.computingEyebrow}</p>
            <h2 className="font-display mt-4 text-3xl font-black leading-tight text-white sm:text-4xl">{loadingText}</h2>
            <p className="mt-3 text-sm font-semibold text-amber-100">{copy.computingTrackLabelPrefix}{activeTrack.title}</p>
            <div className="mt-7 overflow-hidden rounded-full border border-white/12 bg-white/10">
              <div className="h-2 bg-gradient-to-r from-cyan-200 via-sky-300 to-amber-200" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-3 text-xs text-cyan-100">{progress}%</p>
          </StagePanel>
        </div>
      </section>
    );
  }

  if (!chart || !activeChapter) {
    return null;
  }

  const orbitActivePalaceId: ZiweiPalaceId | undefined =
    activeSection === "overview" || activeSection === "master" ? undefined : activeSection;
  const chapterHighlights = [
    ...(activeChapter.highlights || []),
    ...(activeChapter.summary || []),
  ].slice(0, 6);

  return (
    <section className="font-body fixed inset-0 z-50 h-[100dvh] overflow-y-auto overscroll-none px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] text-slate-100 sm:px-6 lg:px-8">
      <GalaxyBackdrop />
      <m.div
        className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-4"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      >
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void toggleImmersiveMode()}
            className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs font-semibold text-slate-100 backdrop-blur-xl"
          >
            {isFullscreen ? copy.fullscreenExitLabel : copy.fullscreenEnterLabel}
          </button>
        </div>

        <StagePanel className="p-5 sm:p-7 lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div className="space-y-5">
              <p className="text-[11px] font-semibold tracking-[0.32em] text-amber-100/80">ZIWEI PREMIUM REPORT</p>
              <h2 className="font-display max-w-3xl text-3xl font-black leading-tight text-white md:text-5xl">{copy.resultTitleTemplate(chart.user.name || copy.resultTitleDefaultName)}</h2>
              <p className="font-premium max-w-3xl text-sm leading-7 text-slate-200/90 md:text-base">
                {copy.resultDesc}
              </p>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-amber-200/20 bg-black/20 px-4 py-3">
                  <p className="text-[11px] text-slate-300">명궁</p>
                  <p className="mt-1 text-lg font-black text-amber-100">{chart.mingGong}</p>
                </div>
                <div className="rounded-2xl border border-sky-200/20 bg-black/20 px-4 py-3">
                  <p className="text-[11px] text-slate-300">신궁</p>
                  <p className="mt-1 text-lg font-black text-sky-100">{chart.shenGong}</p>
                </div>
                <div className="rounded-2xl border border-violet-200/20 bg-black/20 px-4 py-3">
                  <p className="text-[11px] text-slate-300">오행국</p>
                  <p className="mt-1 text-lg font-black text-violet-100">{chart.juInfo}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-[11px] text-slate-300">{copy.statYearFlowLabel}</p>
                  <p className="mt-1 text-lg font-black text-amber-50">{chart.yearGan}{chart.yearZhi}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {chart.summary.keywords.map((keyword) => (
                  <span key={keyword} className="rounded-full border border-cyan-200/25 bg-cyan-200/10 px-3 py-1 text-xs text-cyan-100">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-3xl border border-amber-200/15 bg-gradient-to-br from-amber-200/10 via-white/6 to-cyan-200/10 p-5">
                <p className="text-xs font-semibold tracking-[0.28em] text-amber-100/80">{copy.masterAdviceLabel}</p>
                <p className="mt-3 text-sm leading-7 text-slate-100/95">{chart.summary.direction}</p>
                <p className="mt-3 text-xs leading-6 text-slate-300">{chart.summary.openingCondition}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-semibold text-slate-300">{copy.starStrengthSectionLabel}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StarToneBadge symbol="◎" copy={copy} />
                    <StarToneBadge symbol="O" copy={copy} />
                    <StarToneBadge symbol="▲" copy={copy} />
                    <StarToneBadge symbol="△" copy={copy} />
                    <StarToneBadge symbol="X" copy={copy} />
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-semibold text-slate-300">{copy.sihuaTextureLabel}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                    {chart.sihua.hualu ? <span className="rounded-full border border-lime-300/30 bg-lime-200/10 px-3 py-1 text-lime-100">화록 {chart.sihua.hualu}</span> : null}
                    {chart.sihua.huaquan ? <span className="rounded-full border border-orange-300/30 bg-orange-200/10 px-3 py-1 text-orange-100">화권 {chart.sihua.huaquan}</span> : null}
                    {chart.sihua.huake ? <span className="rounded-full border border-sky-300/30 bg-sky-200/10 px-3 py-1 text-sky-100">화과 {chart.sihua.huake}</span> : null}
                    {chart.sihua.huaji ? <span className="rounded-full border border-rose-300/30 bg-rose-200/10 px-3 py-1 text-rose-100">화기 {chart.sihua.huaji}</span> : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </StagePanel>

        {trackAnalysis ? (
          <StagePanel className="p-4 sm:p-5 lg:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold text-cyan-100/80">{copy.selectedTrackPrefix}{trackAnalysis.selectedTrack.title}</p>
                <h2 className="font-display mt-2 text-2xl font-black leading-tight text-white md:text-3xl">
                  {trackAnalysis.executiveSummary.headline}
                </h2>
                <p className="font-premium mt-3 text-sm leading-7 text-slate-200/90 md:text-base">
                  {trackAnalysis.executiveSummary.summary}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/24 px-4 py-3 text-xs leading-6 text-slate-200">
                <p className="font-semibold text-amber-100">{copy.primaryPalaceLabel}</p>
                <p className="mt-1">{trackAnalysis.selectedTrack.primaryPalaces.map((id) => trackPalaceReadingById[id]?.palaceName || id).join(" · ")}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              {trackAnalysis.executiveSummary.keyPatterns.map((pattern) => (
                <article key={pattern.title} className="rounded-2xl border border-white/10 bg-black/24 p-4">
                  <p className="text-sm font-black text-white">{pattern.title}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-200">{pattern.interpretation}</p>
                  <details className="mt-3 rounded-xl border border-cyan-200/15 bg-cyan-200/8 px-3 py-2 text-xs leading-6 text-cyan-50">
                    <summary className="cursor-pointer font-semibold">{copy.evidenceToggleLabel}</summary>
                    <ul className="mt-2 space-y-1">
                      {pattern.evidence.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </details>
                </article>
              ))}
            </div>

            {trackAnalysis.dataWarnings.length ? (
              <div className="mt-4 rounded-2xl border border-amber-200/20 bg-amber-200/8 px-4 py-3 text-xs leading-6 text-amber-50">
                {trackAnalysis.dataWarnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            ) : null}
          </StagePanel>
        ) : null}

        {chart.warnings.length ? (
          <StagePanel className="p-4 sm:p-5">
            <p className="text-xs font-semibold tracking-[0.24em] text-amber-100/80">{copy.precisionNoteLabel}</p>
            <div className="mt-3 space-y-2 text-sm leading-7 text-amber-50/90">
              {chart.warnings.map((warning, idx) => (
                <p key={`${warning.code}-${idx}`}>• {warning.message}</p>
              ))}
            </div>
          </StagePanel>
        ) : null}

        <StagePanel className="p-4 sm:p-5">
          <div className="space-y-3">
            <p className="text-xs font-semibold text-cyan-100/80">{copy.counselingTrackSectionLabel}</p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {counselingTracks.map((track) => {
                const active = track.key === activeTrackId;
                const icon = COUNSELING_TRACK_ICON_MAP[track.key];
                return (
                  <button
                    key={track.key}
                    type="button"
                    onClick={() => selectCounselingTrack(track.key)}
                    className={`rounded-2xl border p-4 text-left transition ${active ? "border-cyan-200/60 bg-gradient-to-br from-cyan-200/16 to-sky-200/10 shadow-[0_0_32px_rgba(56,189,248,0.22)]" : "border-white/10 bg-black/20 hover:border-cyan-200/25 hover:bg-black/30"}`}
                  >
                    <p className="text-sm font-semibold text-white">{icon} {track.title}</p>
                    <p className="mt-2 text-xs leading-6 text-slate-300">{track.purpose}</p>
                    <p className="mt-2 text-[11px] leading-5 text-cyan-100/80">
                      {copy.corePalaceLabelPrefix}{track.primaryPalaces.map((id) => PALACE_DEFINITION_MAP[id].name).join(" · ")}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </StagePanel>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_1.1fr]">
          <StagePanel className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[0.24em] text-cyan-100/80">{copy.gridSectionEyebrow}</p>
                <h2 className="mt-2 text-lg font-black text-white">{copy.gridSectionTitle}</h2>
              </div>
              <p className="text-xs text-slate-300">{copy.selectedPalaceLabelPrefix}{sectionTitle(activeSection)}</p>
            </div>
            {/* 12궁 전통 4×4 명반 — 기본 명반(saju-engine.js zw-* 격자)과 동일한 지지 배치/팔레트 레퍼런스 */}
            <div className="mt-5 overflow-x-auto pb-1">
              <div
                className="relative mx-auto aspect-square w-full min-w-[19rem] max-w-[38rem] gap-1.5"
                style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gridTemplateRows: "repeat(4, minmax(0, 1fr))" }}
              >
                {chart.palaces.map((palace) => {
                  const area = ZIWEI_BRANCH_GRID_AREA[palace.earthlyBranch];
                  if (!area) return null;
                  const active = palace.id === orbitActivePalaceId;
                  const isMeng = palace.id === "ming";
                  const isShen = !!chart.shenGong && palace.earthlyBranch === chart.shenGong && !isMeng;
                  const sihuaLabels = Array.from(
                    new Set((palace.fourTransformations || []).map((t) => transformationTypeToLabel(t.type)).filter(Boolean)),
                  );
                  const hasHuaji = sihuaLabels.includes("화기");
                  const mains = palace.mainStars || [];
                  const subs = (palace.subStars || []).slice(0, 3);
                  const roleClass = active
                    ? "border-amber-200/70 bg-gradient-to-br from-indigo-500/25 to-violet-600/20 shadow-[0_0_26px_rgba(196,181,253,0.32)]"
                    : isMeng
                      ? "border-amber-300/55 bg-black/30 shadow-[0_0_20px_rgba(232,213,163,0.18)]"
                      : isShen
                        ? "border-sky-300/45 bg-black/30 shadow-[0_0_18px_rgba(125,211,252,0.16)]"
                        : hasHuaji
                          ? "border-rose-300/45 bg-black/30"
                          : "border-violet-300/20 bg-black/25 hover:border-violet-200/45 hover:bg-black/35";
                  return (
                    <button
                      key={palace.id}
                      type="button"
                      onClick={() => loadSection(palace.id)}
                      style={{ gridArea: area }}
                      aria-label={`${palace.name} ${palace.earthlyBranch}`}
                      className={`group relative flex min-h-0 flex-col overflow-hidden rounded-xl border p-2 text-left transition duration-200 ${roleClass}`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-[11px] font-black leading-tight text-white sm:text-xs">{palace.name}</span>
                        {palace.dahan ? <span className="shrink-0 text-[9px] font-semibold text-amber-200/85">{palace.dahan}</span> : null}
                      </div>
                      {sihuaLabels.length ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {sihuaLabels.map((label) => (
                            <span key={label} className={`rounded-full border px-1.5 py-px text-[8px] font-bold ${ZIWEI_SIHUA_PILL[label] || "border-white/15 bg-white/10 text-white"}`}>
                              {label}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-1 flex min-h-0 flex-col gap-0.5">
                        {mains.length ? (
                          mains.map((star, i) => (
                            <span key={`${star.name}-${i}`} className="flex items-baseline gap-0.5 text-[11px] font-bold leading-tight text-amber-50">
                              {star.name}
                              {star.strengthSymbol ? (
                                <span className={`text-[10px] font-black ${ZIWEI_STRENGTH_TONE[star.strengthSymbol] || "text-slate-200"}`}>{star.strengthSymbol}</span>
                              ) : null}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] italic text-white/50">공궁</span>
                        )}
                        {subs.length ? (
                          <span className="text-[9px] leading-snug text-violet-100/85">{subs.map((s) => s.name).join(" ")}</span>
                        ) : null}
                      </div>
                      <span className="pointer-events-none absolute bottom-1 right-1.5 text-[11px] font-black text-white/45">{palace.earthlyBranch}</span>
                    </button>
                  );
                })}
                <div
                  style={{ gridArea: "2 / 2 / 4 / 4" }}
                  className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-amber-200/35 bg-[radial-gradient(circle_at_50%_28%,rgba(232,213,163,0.2),transparent_58%),radial-gradient(circle_at_30%_80%,rgba(167,139,250,0.2),transparent_56%),linear-gradient(160deg,rgba(40,28,84,0.85),rgba(15,13,42,0.92))] p-3 text-center shadow-[inset_0_0_28px_rgba(232,213,163,0.18)]"
                >
                  <p className="text-[10px] font-black tracking-[0.16em] text-amber-100/90">紫微星圖</p>
                  <p className="mt-1 text-sm font-black text-amber-100 sm:text-base">{copy.centerPanelSubtitle}</p>
                  <div className="mt-2 flex flex-wrap justify-center gap-1">
                    <span className="rounded-full border border-amber-300/45 bg-amber-300/12 px-2 py-0.5 text-[9px] font-bold text-amber-100">명궁 {chart.mingGong}</span>
                    <span className="rounded-full border border-sky-300/45 bg-sky-300/12 px-2 py-0.5 text-[9px] font-bold text-sky-100">신궁 {chart.shenGong}</span>
                    <span className="rounded-full border border-violet-300/45 bg-violet-300/12 px-2 py-0.5 text-[9px] font-bold text-violet-100">오행국 {chart.juInfo}</span>
                  </div>
                  <p className="mt-2 hidden text-[9px] leading-snug text-indigo-100/80 sm:block">{copy.centerPanelDesc}</p>
                </div>
              </div>
            </div>
          </StagePanel>

          <StagePanel className="p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[0.24em] text-cyan-100/80">{activeTrack.title}</p>
                <h2 className="mt-2 text-2xl font-black text-white">{activeChapter.title}</h2>
                {activeChapter.subtitle ? <p className="mt-2 text-sm text-slate-300">{activeChapter.subtitle}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => loadSection(activeSection)}
                className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs font-semibold text-slate-100"
              >
                {copy.rereadButtonLabel}
              </button>
            </div>

            {activePalace ? (
              <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-cyan-200/20 bg-[linear-gradient(135deg,rgba(8,18,38,0.96),rgba(18,11,39,0.92)_52%,rgba(7,20,31,0.96))] p-4 shadow-[0_18px_54px_rgba(8,47,73,0.28)]">
                <div className="pointer-events-none absolute inset-x-8 h-px bg-gradient-to-r from-transparent via-cyan-100/45 to-transparent" />
                <div className="grid gap-4 lg:grid-cols-[0.86fr_1.14fr] lg:items-center">
                  <div className="relative aspect-square min-h-[13rem] overflow-hidden rounded-[1.25rem] border border-white/10 bg-black/24">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(125,211,252,0.22),transparent_35%),radial-gradient(circle_at_28%_32%,rgba(251,191,36,0.22),transparent_18%),radial-gradient(circle_at_76%_70%,rgba(192,132,252,0.2),transparent_24%)]" />
                    <div className="absolute inset-0 opacity-70 [background-image:radial-gradient(rgba(255,255,255,0.55)_1px,transparent_1px)] [background-size:42px_42px]" />
                    <div className="absolute left-[18%] top-[26%] h-2.5 w-2.5 rounded-full bg-cyan-100 shadow-[0_0_18px_rgba(165,243,252,0.9)]" />
                    <div className="absolute left-[42%] top-[18%] h-2 w-2 rounded-full bg-amber-100 shadow-[0_0_18px_rgba(254,243,199,0.9)]" />
                    <div className="absolute left-[66%] top-[42%] h-2.5 w-2.5 rounded-full bg-fuchsia-100 shadow-[0_0_18px_rgba(245,208,254,0.9)]" />
                    <div className="absolute left-[51%] top-[70%] h-2 w-2 rounded-full bg-sky-100 shadow-[0_0_18px_rgba(186,230,253,0.9)]" />
                    <div className="absolute left-[21%] top-[30%] h-px w-[31%] rotate-[-10deg] bg-cyan-100/45" />
                    <div className="absolute left-[43%] top-[25%] h-px w-[29%] rotate-[36deg] bg-amber-100/40" />
                    <div className="absolute left-[54%] top-[57%] h-px w-[25%] rotate-[104deg] bg-fuchsia-100/40" />
                    <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/10 bg-black/42 px-4 py-3 backdrop-blur-xl">
                      <p className="text-[10px] font-semibold tracking-[0.26em] text-cyan-100/80">PALACE CONSTELLATION</p>
                      <p className="mt-1 text-sm font-black text-white">{activePalace.name} · {activePalace.earthlyBranch}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.28em] text-amber-100/80">{activePalace.name} {copy.palaceReadingSuffixLabel}</p>
                    <h3 className="mt-2 text-xl font-black text-white">
                      {activePalace.id === "ming"
                        ? "성향, 자기방어, 선택 습관을 먼저 읽습니다"
                        : activePalace.id === "siblings"
                          ? "수평 관계, 협업, 신뢰 흐름을 먼저 읽습니다"
                          : "이 궁의 실제 작동 방식을 먼저 읽습니다"}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-slate-200">
                      {activePalace.id === "ming"
                        ? "명궁은 기본 성격 설명이 아니라, 위기 앞에서 어떤 얼굴이 먼저 나오고 어떤 기준으로 삶을 움직이는지 보여주는 중심 궁입니다."
                        : activePalace.id === "siblings"
                          ? "형제궁은 혈연을 넘어 친구, 동료, 라이벌, 협업 파트너와 어떤 거리로 연결되는지 보여주는 수평 관계의 별자리입니다."
                          : `${activePalace.name}은 ${PALACE_DEFINITION_MAP[activePalace.id].definition}입니다.`}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {["원국", "주성", "보조성", "살성", "사화", "대궁", "삼방사정", "차성", "대한", "유년", "실전 처방"].map((scope) => (
                        <span key={`scope-${activePalace.id}-${scope}`} className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[11px] font-semibold text-slate-100">
                          {scope}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-2xl border border-cyan-200/18 bg-cyan-200/8 px-3 py-3">
                        <p className="text-[11px] font-semibold text-cyan-100">주성</p>
                        <p className="mt-1 text-sm leading-6 text-white">{activePalace.mainStars.map((star) => `${star.name}${star.strengthSymbol || star.symbol || ""}`).join(" · ") || "대궁 차성 중심"}</p>
                      </div>
                      <div className="rounded-2xl border border-amber-200/18 bg-amber-200/8 px-3 py-3">
                        <p className="text-[11px] font-semibold text-amber-100">사화</p>
                        <p className="mt-1 text-sm leading-6 text-white">{activePalace.fourTransformations.map((item) => `${transformationTypeToLabel(item.type)} ${item.starName}`).join(" · ") || "직접 사화 약함"}</p>
                      </div>
                      <div className="rounded-2xl border border-fuchsia-200/18 bg-fuchsia-200/8 px-3 py-3">
                        <p className="text-[11px] font-semibold text-fuchsia-100">대궁</p>
                        <p className="mt-1 text-sm leading-6 text-white">{activePalace.oppositePalace?.name || "대궁 확인"} · {activePalace.oppositePalace?.mainStars.map((star) => star.name).join(" · ") || "차성 보정"}</p>
                      </div>
                      <div className="rounded-2xl border border-sky-200/18 bg-sky-200/8 px-3 py-3">
                        <p className="text-[11px] font-semibold text-sky-100">삼방사정</p>
                        <p className="mt-1 text-sm leading-6 text-white">{activePalace.sanFangSiZheng?.palaceNames?.join(" · ") || activePalace.triadPalaceIds.join(" · ")}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {chapterHighlights.map((item, index) => (
                <div key={`${item}-${index}`} className={`rounded-2xl border px-4 py-3 text-sm leading-7 ${index === 0 ? "border-amber-200/25 bg-amber-200/10 text-amber-50" : "border-white/10 bg-black/20 text-slate-200"}`}>
                  {item}
                </div>
              ))}
            </div>

            {activePalace ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-semibold text-slate-300">{copy.mainStarsCardLabel}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {activePalace.mainStars.length ? activePalace.mainStars.map((star) => (
                      <StarToneBadge key={`main-${star.name}`} symbol={String(star.strengthSymbol || star.symbol || "").trim() || "△"} copy={copy} />
                    )) : <p className="text-sm text-slate-400">무주성궁이라 대궁과 삼방의 목소리를 함께 들어야 합니다.</p>}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-semibold text-slate-300">{copy.emotionalTextureLabel}</p>
                  <div className="mt-3 text-sm leading-7 text-slate-200">
                    <p>묘 {activeStrengthBands.miao} · 득 {activeStrengthBands.deuk} · 리 {activeStrengthBands.li} · 평 {activeStrengthBands.ping} · 함 {activeStrengthBands.ham}</p>
                    <p className="mt-2 text-slate-300">
                      {copy.starPowerBalanceHint}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[
                { label: copy.strengthKeywordLabel, value: activeChapter.strengths.slice(0, 2).join(" · ") || "흐름을 다시 고르게 세울 힘" },
                { label: copy.cautionKeywordLabel, value: activeChapter.cautions.slice(0, 2).join(" · ") || "과속할 때 균형을 잃는 지점" },
                { label: copy.routineKeywordLabel, value: activeChapter.routine7Days.slice(0, 2).join(" · ") || "매일 10분씩 같은 질문을 적기" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-semibold text-slate-300">{item.label}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-100">{item.value}</p>
                </div>
              ))}
            </div>
          </StagePanel>
        </div>

        <StagePanel className="p-4 sm:p-5">
          <p className="text-xs font-semibold tracking-[0.28em] text-cyan-100/80">{copy.summaryTableHeading}</p>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
            <table className="min-w-full text-left text-xs sm:text-sm">
              <thead className="bg-white/6 text-slate-200">
                <tr>
                  <th className="px-3 py-3 font-semibold">{copy.tableColPalace}</th>
                  <th className="px-3 py-3 font-semibold">{copy.tableColDefinition}</th>
                  <th className="px-3 py-3 font-semibold">{copy.tableColMainStar}</th>
                  <th className="px-3 py-3 font-semibold">{copy.tableColAuxStar}</th>
                  <th className="px-3 py-3 font-semibold">{copy.tableColForce}</th>
                  <th className="px-3 py-3 font-semibold">{copy.tableColPriority}</th>
                </tr>
              </thead>
              <tbody>
                {palaceCounseling.map((item) => {
                  const reading = trackPalaceReadingById[item.palace.id];
                  return (
                    <tr key={`table-${item.palace.id}`} className="border-t border-white/8 text-slate-100/90">
                      <td className="px-3 py-3 font-semibold">{item.palace.name}</td>
                      <td className="px-3 py-3 text-slate-300">{item.definition}</td>
                      <td className="px-3 py-3">{item.palace.mainStars.map((s) => s.name).join(" · ") || "무주성궁"}</td>
                      <td className="px-3 py-3">{item.palace.auxiliaryStars.map((s) => s.name).slice(0, 3).join(" · ") || "-"}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${palaceForceToneClass(item.energy)}`}>
                          {palaceForceLabel(item.energy)}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {reading ? (
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${trackPriorityToneClass(reading.priority)}`}>
                            {trackPriorityLabel(reading.priority)}
                          </span>
                        ) : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </StagePanel>

        <StagePanel className="p-4 sm:p-5">
          <p className="text-xs font-semibold tracking-[0.28em] text-cyan-100/80">{copy.overallSummaryHeading}</p>
          <div className="mt-4 grid gap-3">
            {overallCounselingSummary.map((line, index) => (
              <p key={`overall-${index}`} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-slate-200">
                {line}
              </p>
            ))}
          </div>
        </StagePanel>

        <div className="grid gap-4 lg:grid-cols-2">
          <StagePanel className="p-4 sm:p-5">
            <p className="text-xs font-semibold tracking-[0.28em] text-cyan-100/80">{copy.strongTop3Heading}</p>
            <div className="mt-4 space-y-3">
              {strongTop3.map((item, index) => (
                <div key={`strong-${item.palace.id}`} className="rounded-2xl border border-emerald-300/25 bg-emerald-200/10 p-4">
                  <p className="text-sm font-black text-emerald-50">#{index + 1} {item.palace.name} · {palaceForceLabel(item.energy)}</p>
                  <p className="mt-2 text-xs leading-6 text-emerald-100/90">{copy.keywordLabelPrefix}{item.keywords.join(" · ") || "흐름 정렬"}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-100/95">{item.strengths}</p>
                </div>
              ))}
            </div>
          </StagePanel>

          <StagePanel className="p-4 sm:p-5">
            <p className="text-xs font-semibold tracking-[0.28em] text-cyan-100/80">{copy.weakTop3Heading}</p>
            <div className="mt-4 space-y-3">
              {weakTop3.map((item, index) => (
                <div key={`weak-${item.palace.id}`} className="rounded-2xl border border-rose-300/25 bg-rose-200/10 p-4">
                  <p className="text-sm font-black text-rose-50">#{index + 1} {item.palace.name} · {palaceForceLabel(item.energy)}</p>
                  <p className="mt-2 text-xs leading-6 text-rose-100/90">{copy.keywordLabelPrefix}{item.keywords.join(" · ") || "리듬 보정"}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-100/95">{item.cautions}</p>
                </div>
              ))}
            </div>
          </StagePanel>
        </div>

        <StagePanel className="p-4 sm:p-5">
          <p className="text-xs font-semibold tracking-[0.28em] text-cyan-100/80">{copy.detailHeading}</p>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {orderedPalaceCounseling.map((item) => {
              const reading = trackPalaceReadingById[item.palace.id];
              if (!reading) return null;
              return (
                <article key={`detail-${item.palace.id}`} className={`rounded-2xl border bg-gradient-to-br from-[#0a1427]/90 via-[#0b1224]/85 to-[#130b25]/88 p-4 shadow-[0_14px_40px_rgba(5,10,30,0.35)] ${reading.priority === "primary" ? "border-amber-200/28" : "border-white/10"}`}>
                  <details open={reading.priority === "primary"}>
                    <summary className="cursor-pointer list-none">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-display text-lg font-black text-white">{reading.palaceName}</h3>
                            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${trackPriorityToneClass(reading.priority)}`}>
                              {trackPriorityLabel(reading.priority)}
                            </span>
                          </div>
                          <p className="font-premium mt-2 text-sm leading-7 text-slate-200">{reading.headline}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${palaceForceToneClass(item.energy)}`}>{palaceForceLabel(item.energy)}</span>
                      </div>
                    </summary>

                    <div className="mt-4 grid gap-3">
                      <section className="rounded-2xl border border-cyan-200/15 bg-black/24 p-4">
                        <p className="text-xs font-semibold text-cyan-100">{copy.detailCard.evidenceSummaryTitle}</p>
                        <div className="mt-3 grid gap-2 text-xs leading-6 text-slate-200 sm:grid-cols-2">
                          <p><span className="font-semibold text-white">{copy.detailCard.mainStarLabel}</span>: {reading.evidence.mainStars.join(" · ") || "직접 주성 없음"}</p>
                          <p><span className="font-semibold text-white">{copy.detailCard.auxLabel}</span>: {reading.evidence.auxiliaryStars.join(" · ") || "직접 보조성·살성 정보 제한"}</p>
                          <p><span className="font-semibold text-white">{copy.detailCard.sihuaLabel}</span>: {reading.evidence.transformations.join(" / ") || "직접 사화 신호는 약함"}</p>
                          <p><span className="font-semibold text-white">{copy.detailCard.connectedPalaceLabel}</span>: {[reading.evidence.oppositePalace, ...reading.evidence.relatedPalaces].filter(Boolean).join(" · ") || "확인 제한"}</p>
                        </div>
                      </section>

                      <section className="rounded-2xl border border-cyan-200/16 bg-cyan-200/8 p-4">
                        <p className="text-xs font-semibold text-cyan-100">{copy.detailCard.customerReadingTitle}</p>
                        <div className="font-premium mt-3 space-y-2 text-sm leading-7 text-slate-100/92">
                          <p><span className="font-semibold text-white">{copy.detailCard.meaningLabel}</span>: {reading.customerMeaning}</p>
                          <p><span className="font-semibold text-white">{copy.detailCard.corePatternLabel}</span>: {reading.corePattern}</p>
                          <p><span className="font-semibold text-white">{copy.detailCard.baseTraitLabel}</span>: {item.reality}</p>
                        </div>
                      </section>

                      <div className="grid gap-3 md:grid-cols-2">
                        <section className="rounded-2xl border border-emerald-300/18 bg-emerald-200/8 p-4">
                          <p className="text-xs font-semibold text-emerald-100">{copy.detailCard.workingWellTitle}</p>
                          <ul className="font-premium mt-3 space-y-2 text-sm leading-7 text-slate-100/92">
                            {reading.strengths.map((line) => (
                              <li key={line}>• {line}</li>
                            ))}
                          </ul>
                        </section>
                        <section className="rounded-2xl border border-rose-300/18 bg-rose-200/8 p-4">
                          <p className="text-xs font-semibold text-rose-100">{copy.detailCard.overworkingTitle}</p>
                          <ul className="font-premium mt-3 space-y-2 text-sm leading-7 text-slate-100/92">
                            {reading.challenges.map((line) => (
                              <li key={line}>• {line}</li>
                            ))}
                          </ul>
                        </section>
                      </div>

                      <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs font-semibold text-cyan-100">{copy.detailCard.realLifeSceneTitle}</p>
                        <ul className="font-premium mt-3 space-y-2 text-sm leading-7 text-slate-200">
                          {reading.realLifeManifestations.map((line) => (
                            <li key={line}>• {line}</li>
                          ))}
                        </ul>
                      </section>

                      <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs font-semibold text-cyan-100">{copy.detailCard.crossPalaceTitle}</p>
                        <p className="font-premium mt-3 text-sm leading-7 text-slate-200">{reading.crossPalaceInterpretation}</p>
                        <p className="font-premium mt-3 text-sm leading-7 text-slate-200">{reading.selectedTrackRelevance}</p>
                      </section>

                      <div className="grid gap-3 md:grid-cols-2">
                        <section className="rounded-2xl border border-amber-200/20 bg-amber-200/8 p-4">
                          <p className="text-xs font-semibold text-amber-100">{copy.detailCard.currentTimingTitle}</p>
                          <p className="font-premium mt-3 text-sm leading-7 text-slate-100/92">{reading.timingInterpretation}</p>
                        </section>
                        <section className="rounded-2xl border border-sky-200/18 bg-sky-200/8 p-4">
                          <p className="text-xs font-semibold text-sky-100">{copy.detailCard.practicalUseTitle}</p>
                          <ul className="font-premium mt-3 space-y-2 text-sm leading-7 text-slate-100/92">
                            {reading.practicalAdvice.map((line) => (
                              <li key={line}>• {line}</li>
                            ))}
                          </ul>
                        </section>
                      </div>

                      {reading.dataLimitations.length ? (
                        <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-xs leading-6 text-slate-300">
                          {reading.dataLimitations.map((line) => (
                            <p key={line}>{line}</p>
                          ))}
                        </div>
                      ) : null}

                      <details className="rounded-2xl border border-cyan-200/15 bg-cyan-200/8 px-4 py-3 text-xs leading-6 text-cyan-50">
                        <summary className="cursor-pointer font-semibold">{copy.evidenceToggleLabel}</summary>
                        <ul className="mt-3 space-y-1">
                          {reading.evidence.lines.map((line) => (
                            <li key={line}>• {line}</li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  </details>
                </article>
              );
            })}
          </div>
        </StagePanel>

        <StagePanel className="p-4 sm:p-5">
          <p className="text-xs font-semibold tracking-[0.28em] text-cyan-100/80">{copy.palaceLinkHeading}</p>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {palaceLinks.map((link) => (
              <div key={link.title} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-black text-white">{link.title}</p>
                <p className="mt-2 text-xs text-cyan-100">{link.lens} · {link.state}</p>
                <p className="mt-2 text-sm leading-7 text-slate-200">{link.summary}</p>
              </div>
            ))}
          </div>
        </StagePanel>

        <div className="grid gap-4 lg:grid-cols-2">
          <StagePanel className="p-4 sm:p-5">
            <p className="text-xs font-semibold tracking-[0.28em] text-cyan-100/80">{copy.sihuaHeading}</p>
            <div className="mt-4 grid gap-3">
              {sihuaInsights.map((line, index) => (
                <p key={`sihua-${index}`} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-slate-200">
                  {line}
                </p>
              ))}
            </div>
          </StagePanel>

          <StagePanel className="p-4 sm:p-5">
            <p className="text-xs font-semibold tracking-[0.28em] text-cyan-100/80">{copy.borrowedStarHeading}</p>
            <div className="mt-4 grid gap-3">
              {borrowedStarInsights.length ? borrowedStarInsights.map((line, index) => (
                <p key={`borrow-${index}`} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-slate-200">
                  {line}
                </p>
              )) : (
                <p className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-slate-200">
                  {copy.borrowedStarFallback}
                </p>
              )}
            </div>
          </StagePanel>
        </div>

        {trackAnalysis ? (
          <StagePanel className="p-4 sm:p-5">
            <p className="text-xs font-semibold tracking-[0.28em] text-cyan-100/80">{copy.actionGuideHeadingPrefix}{activeTrack.title}</p>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {[
                { title: copy.actionPlanTitles.start, lines: trackAnalysis.actionPlan.start },
                { title: copy.actionPlanTitles.reduce, lines: trackAnalysis.actionPlan.reduce },
                { title: copy.actionPlanTitles.maintain, lines: trackAnalysis.actionPlan.maintain },
              ].map((group) => (
                <section key={group.title} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm font-black text-white">{group.title}</p>
                  <ul className="font-premium mt-3 space-y-2 text-sm leading-7 text-slate-200">
                    {group.lines.map((line) => (
                      <li key={line}>• {line}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-amber-200/20 bg-amber-200/8 p-4">
              <p className="text-sm font-black text-amber-50">{copy.selfCheckLabel}</p>
              <ul className="font-premium mt-3 space-y-2 text-sm leading-7 text-slate-100/92">
                {trackAnalysis.actionPlan.reflectionQuestions.map((question) => (
                  <li key={question}>• {question}</li>
                ))}
              </ul>
            </div>
          </StagePanel>
        ) : null}

        <StagePanel className="p-4 sm:p-5">
          <p className="text-xs font-semibold text-cyan-100/80">{copy.flowSectionLabelPrefix}{activeTrack.title}</p>
          <div className="mt-4 grid gap-4">
            {(trackAnalysis?.consultationFlow || []).map((stage, index) => (
              <m.article
                key={`${activeTrack.key}-${stage.stage}`}
                className={`rounded-2xl border px-4 py-4 text-sm leading-7 md:text-[15px] ${index === 0 ? "border-amber-200/25 bg-amber-200/10 text-amber-50 [text-shadow:0_0_16px_rgba(251,191,36,0.18)]" : "border-white/10 bg-black/20 text-slate-200/92"}`}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.45, delay: index * 0.03 }}
              >
                <p className="text-xs font-semibold text-cyan-100">{copy.stepLabel} {stage.stage}</p>
                <h3 className="mt-1 text-base font-black text-white">{stage.title}</h3>
                <p className="mt-2">{stage.content}</p>
                {stage.actions.length ? (
                  <ul className="mt-3 space-y-1 text-xs leading-6 text-slate-200">
                    {stage.actions.map((action) => (
                      <li key={action}>• {action}</li>
                    ))}
                  </ul>
                ) : null}
                {stage.evidence.length ? (
                  <details className="mt-3 rounded-xl border border-cyan-200/15 bg-cyan-200/8 px-3 py-2 text-xs leading-6 text-cyan-50">
                    <summary className="cursor-pointer font-semibold">{copy.evidenceToggleLabel}</summary>
                    <ul className="mt-2 space-y-1">
                      {stage.evidence.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </m.article>
            ))}
          </div>
        </StagePanel>

        {trackAnalysis ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <StagePanel className="p-4 sm:p-5">
              <p className="text-xs font-semibold tracking-[0.28em] text-cyan-100/80">{copy.currentTimingHeading}</p>
              <p className="font-premium mt-4 text-sm leading-7 text-slate-200">{trackAnalysis.timing.currentTheme}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <section className="rounded-2xl border border-emerald-300/20 bg-emerald-200/8 p-4">
                  <p className="text-sm font-black text-emerald-50">{copy.opportunityHeading}</p>
                  <ul className="font-premium mt-3 space-y-2 text-sm leading-7 text-slate-200">
                    {trackAnalysis.timing.opportunities.map((line) => (
                      <li key={line}>• {line}</li>
                    ))}
                  </ul>
                </section>
                <section className="rounded-2xl border border-rose-300/20 bg-rose-200/8 p-4">
                  <p className="text-sm font-black text-rose-50">{copy.timingCautionHeading}</p>
                  <ul className="font-premium mt-3 space-y-2 text-sm leading-7 text-slate-200">
                    {trackAnalysis.timing.cautions.map((line) => (
                      <li key={line}>• {line}</li>
                    ))}
                  </ul>
                </section>
              </div>
              <details className="mt-4 rounded-2xl border border-cyan-200/15 bg-cyan-200/8 px-4 py-3 text-xs leading-6 text-cyan-50">
                <summary className="cursor-pointer font-semibold">{copy.timingEvidenceToggleLabel}</summary>
                <ul className="mt-3 space-y-1">
                  {trackAnalysis.timing.evidence.map((line) => (
                    <li key={line}>• {line}</li>
                  ))}
                </ul>
              </details>
            </StagePanel>

            <StagePanel className="p-4 sm:p-5">
              <p className="text-xs font-semibold tracking-[0.28em] text-cyan-100/80">{copy.closingHeading}</p>
              <p className="font-premium mt-4 text-sm leading-7 text-slate-200">
                {copy.closingBodyTemplate(activeTrack.title)}
              </p>
              <div className="mt-4 grid gap-3">
                {trackAnalysis.timing.recommendedActions.map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-slate-200">
                    {item}
                  </div>
                ))}
              </div>
            </StagePanel>
          </div>
        ) : null}

        {/* 심화 자미두수 전문가 상담 리포트 (ZIWEI_DEEP_PDF) — 회당 결제 LLM 15챕터 심층 리포트.
            2026-08-13 통합: 같은 가격(30,000원)으로 나란히 있던 인라인 상담 패널
            (ziwei-ai-consultation)을 이 패널이 흡수했다 — 관심분야·자유질문을 15챕터
            프롬프트에 주입한다. 독립 페이지 /ziwei-ai 는 별도 상품으로 그대로 살아 있다. */}
        <div className="relative z-10 mt-6">
          <ZiweiDeepPdfPanel birth={deepPdfBirth} disabled={!chart} />
        </div>

      </m.div>
    </section>
  );
}

/* 관리자 CMS 기본값 노출용. */
export const __cmsZiweiDeepDefaults = {
  palace: PALACE_DEFINITION_MAP_DEFAULT as Record<string, unknown>,
  star: STAR_MEANING_MAP_DEFAULT as Record<string, unknown>,
};
