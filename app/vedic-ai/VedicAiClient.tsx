"use client";

import { birthDateTextInputProps } from "@/lib/birthDateInputProps";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, Clock3, Compass, Download, Loader2, MapPin, Moon, Sparkles, Star } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import AnalysisBasisLoading from "@/components/fortune/AnalysisBasisLoading";
import AnalysisBasisPanel from "@/components/fortune/AnalysisBasisPanel";
import { fetchAnalysisBasis, type AnalysisBasis } from "@/lib/fortune/analysis-basis";
import { isRetriableResultPollFailure, runAccessCheckWithTransientRetry } from "@/app/_lib/consultationResultPolling";
import { extractReadableTextFromJsonLike, looksLikeRawJson, splitIntoParagraphs, toDisplayText } from "@/lib/llm-text";
import {
  beginPaidFeatureGateCheck,
  completePaidFeatureGateCheck,
  failPaidFeatureGateCheck,
  holdPaidFeatureGateOpen,
  releasePaidFeatureGate,
  runBillingCoinGate,
  primePaymentEligibility,
} from "@/app/_lib/billing-client";
import { readAiProfileSeed, type AiPrefillSeed } from "@/app/_lib/ai-prefill-seed";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";
import { PriceBadge } from "@/app/components/PriceBadge";
import { DashaProgressRing, DashaTimeline, getGrahaMeta, GrahaNatureDot, HeroChartPreview, NorthIndianChart } from "./VedicChartVisuals";
import styles from "./VedicAiClient.module.css";
import { detectLocale } from "@/lib/i18n/dictionary";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

type Gender = "male" | "female" | "unknown" | "";
type CalendarType = "solar" | "lunar" | "";
type FocusArea = "overall" | "love" | "money" | "career" | "health" | "relationship" | "spirituality" | "custom";
type Phase = "idle" | "access" | "payment" | "start";
type Message = {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};
type FormState = {
  userName: string;
  gender: Gender;
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  calendarType: CalendarType;
  birthPlace: string;
  latitude: string;
  longitude: string;
  timezone: string;
  focusArea: FocusArea;
  question: string;
};
type SummaryCards = {
  lagna?: string;
  moonSign?: string;
  nakshatra?: string;
  currentDasha?: string;
  strongGrahas?: string[];
  majorBhavas?: string[];
  keywords?: string[];
  d1?: Record<string, unknown> | null;
  d9?: Record<string, unknown> | null;
};
type Consultation = {
  id: string;
  status: string;
  birthInfo: Record<string, unknown>;
  topic: string;
  focusArea?: FocusArea;
  userQuestion?: string;
  vedicChart: Record<string, unknown>;
  accessType: "pass" | "paid" | "subscription";
  paymentId?: string;
  messages: Message[];
  summaryCards?: SummaryCards;
  analysisBasis?: AnalysisBasis | null;
};
type EnsureAccessResult =
  | { ok: true; accessToken: string; accessType: "pass" | "paid" | "subscription"; consultation?: Consultation }
  | { ok: false; reason: "PAYMENT_REQUIRED"; paymentPayload: Record<string, unknown>; message?: string }
  | { ok: false; reason: "LOGIN_REQUIRED"; message?: string }
  | { ok: false; reason: "INVALID_INPUT"; message: string };
type StartResult = {
  ok?: boolean;
  reason?: string;
  message?: string;
  sessionId?: string;
  status?: string;
  consultation?: Consultation;
};
type PendingAccess = {
  requestId: string;
  access: Record<string, unknown>;
  paymentWasRequired: boolean;
};
type GeocodeState = {
  lat: string;
  lng: string;
  name: string;
  fallback: boolean;
};

const FEATURE_KEY = "vedic-ai-consultation";
const CONSULTATION_TYPE = "vedic";
const FEATURE_COST = 300;
const AMOUNT_KRW = 30000;
const MEMBERSHIP_CREDIT_COST = 3000;

const FOCUS_VALUES: FocusArea[] = ["overall", "love", "money", "career", "health", "relationship", "spirituality", "custom"];

// 페이로드 값(birthPlace)이자 datalist 옵션 value 이므로 원문 그대로 유지 — 네이티브 datalist는
// value/표시 텍스트를 분리할 수 없어(select 의 value= 트릭이 안 통함), 로케일화하지 않는다.
const PLACE_PRESETS = [
  { label: "서울, 한국", latitude: "37.5665", longitude: "126.9780", timezone: "Asia/Seoul" },
  { label: "부산, 한국", latitude: "35.1796", longitude: "129.0756", timezone: "Asia/Seoul" },
  { label: "인천, 한국", latitude: "37.4563", longitude: "126.7052", timezone: "Asia/Seoul" },
  { label: "대구, 한국", latitude: "35.8714", longitude: "128.6014", timezone: "Asia/Seoul" },
  { label: "제주, 한국", latitude: "33.4996", longitude: "126.5312", timezone: "Asia/Seoul" },
  { label: "Delhi, India", latitude: "28.6139", longitude: "77.2090", timezone: "Asia/Kolkata" },
  { label: "Mumbai, India", latitude: "19.0760", longitude: "72.8777", timezone: "Asia/Kolkata" },
  { label: "Tokyo, Japan", latitude: "35.6762", longitude: "139.6503", timezone: "Asia/Tokyo" },
  { label: "New York, USA", latitude: "40.7128", longitude: "-74.0060", timezone: "America/New_York" },
  { label: "Los Angeles, USA", latitude: "34.0522", longitude: "-118.2437", timezone: "America/Los_Angeles" },
];

const TIMEZONE_VALUES = ["Asia/Seoul", "Asia/Shanghai", "Asia/Kolkata", "Europe/London", "America/New_York", "America/Los_Angeles"];

const COSMOS_GLYPHS = ["ॐ", "☉", "☽", "↑", "★", "✦"];

const COSMOS_ORBITS = [
  { r: 56, speed: 1, color: "rgba(251,191,36,0.9)", size: 6 },
  { r: 78, speed: 0.6, color: "rgba(196,181,253,0.9)", size: 5 },
  { r: 100, speed: 0.4, color: "rgba(251,113,133,0.7)", size: 4 },
  { r: 122, speed: 0.25, color: "rgba(134,239,172,0.7)", size: 4 },
  { r: 144, speed: 0.15, color: "rgba(148,163,184,0.6)", size: 3 },
];

const COSMOS_STARS = Array.from({ length: 90 }, (_, index) => ({
  top: `${(index * 37) % 100}%`,
  left: `${(index * 61) % 100}%`,
  size: `${0.5 + (index % 3) * 0.45}px`,
  opacity: 0.18 + (index % 7) * 0.08,
  delay: `${(index % 9) * 0.35}s`,
}));

const SECTION_GLYPHS: Record<string, string> = {
  lagna: "↑",
  rashi: "R",
  graha: "G",
  bhava: "B",
  nakshatra: "☽",
  dasha: "★",
  vimshottari_dasha: "V",
};

// 상담문은 삶의 주제 네 갈래로 온다. 구 7섹션 제목은 지우지 않는다 —
// 이 배열은 구조화 파싱에 실패한 옛 상담문에서 문단 제목을 되찾는 폴백으로도 쓰인다.
const SECTION_TITLES = [
  "카르마의 기원",
  "물질적 성취와 다르마",
  "인연과 영혼의 파트너",
  "현재의 다샤 흐름과 우파야",
  "라그나, Lagna",
  "라시, Rashi",
  "그라하, Graha",
  "바바, Bhava",
  "나크샤트라, Nakshatra",
  "다샤, Dasha",
  "빈쇼타리 다샤, Vimshottari Dasha",
];

// 결과 카드의 표시 순서. LLM이 내보낸 키 순서를 그대로 믿으면 근거 섹션이 본문 앞에 끼어들고,
// 구 7섹션 상담은 아예 다른 순서로 열린다. 여기 없는 키(근거 섹션 등)는 원래 순서를 유지한 채 뒤에 붙는다.
const ORDERED_SECTION_KEYS = [
  "karma_origin",
  "dharma_artha",
  "relationship_soul",
  "dasha_upaya",
  // 아래는 이 개편 이전에 저장된 상담을 그대로 열기 위한 구버전 키다. 지우지 말 것.
  "lagna",
  "rashi",
  "graha",
  "bhava",
  "nakshatra",
  "dasha",
  "vimshottari_dasha",
];

type VedicAiCopy = {
  heroTitle: string;
  heroLead: string;
  heroPrice: string;
  heroDashaBadge: string;
  formPanelHeading: string;
  loadProfileButtonAriaLabel: string;
  loadProfileButtonLabel: string;
  nameLabel: string;
  namePlaceholder: string;
  genderLabel: string;
  genderPlaceholder: string;
  genderFemale: string;
  genderMale: string;
  genderUnknown: string;
  birthDateLabel: string;
  calendarLabel: string;
  calendarSolar: string;
  calendarLunar: string;
  birthTimeLabel: string;
  timezoneLabel: string;
  timezoneOptionLabel: Record<string, string>;
  birthTimeUnknownLabel: string;
  birthTimeUnknownNotice: string;
  birthPlaceLabel: string;
  birthPlacePlaceholder: string;
  geoCheckingLabel: string;
  geoConfirmedLabel: (name: string) => string;
  geoHintLabel: string;
  focusAreaLabel: string;
  focusOptionLabel: Record<FocusArea, string>;
  questionLabel: string;
  questionPlaceholder: string;
  submitButtonIdle: string;
  pricePrefix: string;
  phaseAccess: string;
  phasePayment: string;
  phaseStart: string;
  geocodeFallbackNotice: string;
  geocodeErrorNotice: string;
  geocodeFallbackName: string;
  retryAccessNotice: string;
  sessionPendingNotice: string;
  gateReason: string;
  accessCheckGateTitle: string;
  accessCheckCompleteTitle: string;
  accessCheckCompleteMessage: string;
  accessCheckFailTitleTransient: string;
  accessCheckFailTitle: string;
  errorText: Record<string, string>;
  cosmosStages: Array<{ label: string; sub: string }>;
  cosmosFooter: string;
  cosmosFallbackText: string;
  chartDetailAriaLabel: string;
  chartDetailHeading: string;
  noLagnaNotice: string;
  lagnaBilingual: string;
  moonNakshatraBilingual: string;
  currentDashaBilingual: string;
  lagnaRashiLabel: string;
  lagnaDegreeLabel: string;
  lagnaNakshatraLabel: string;
  lagnaPadaLabel: string;
  lagnaFirstHouseLabel: string;
  birthTimeRequiredFallback: string;
  rashiBilingual: string;
  grahaBilingual: string;
  bhavaBilingual: string;
  nakshatraBilingual: string;
  dashaBilingual: string;
  vimshottariBilingual: string;
  grahaLabel: Record<string, string>;
  planetTableHeaders: { graha: string; rashi: string; degree: string; bhava: string; nakshatra: string; pada: string; keywords: string };
  bhavaTableHeaders: { bhava: string; rashi: string; meaning: string; graha: string };
  bhavaRequiresBirthInfo: string;
  moonNakshatraDetailPrefix: string;
  dashaTableHeaders: { lord: string; start: string; end: string; duration: string };
  yearsSuffix: (n: string | number) => string;
  padaSuffix: (n: string | number) => string;
  dashFallback: string;
  jyotishEyebrow: string;
  resultTitle: (name: string) => string;
  defaultConsultantName: string;
  pdfButtonAriaLabel: string;
  pdfButtonSaving: string;
  pdfButtonIdle: string;
  chartSummaryAriaLabel: string;
  lagnaMedallionLabel: string;
  rashiMedallionLabel: string;
  nakshatraMedallionLabel: string;
  dashaCardLabelKo: string;
  mahadashaSuffix: string;
  scoreLabels: Record<string, string>;
  emptyStateHeading: string;
  emptyStateBody: string;
  pastConsultationLink: string;
  pastConsultationHint: string;
  summaryHeading: string;
  summaryStrongGrahasLabel: string;
  summaryMajorBhavasLabel: string;
  d1SunFallback: string;
  d1RahuFallback: string;
  d9VenusFallback: string;
  d9Body: string;
  userQuestionLabel: string;
  legacySectionExtraTitle: (n: number) => string;
};

const VEDIC_AI_COPY_EN: VedicAiCopy = {
  heroTitle: "Vedic AI Expert Consultation",
  heroLead: "Where the flow of nakshatras and planets meets the rhythm of dasha, your question is quietly illuminated.",
  heroPrice: "₩30,000",
  heroDashaBadge: "Dasha flow",
  formPanelHeading: "Information to open your star map",
  loadProfileButtonAriaLabel: "Load birth info from profile card",
  loadProfileButtonLabel: "Load from profile card",
  nameLabel: "Name or nickname",
  namePlaceholder: "Name to use in the consultation",
  genderLabel: "Gender",
  genderPlaceholder: "Select",
  genderFemale: "Female",
  genderMale: "Male",
  genderUnknown: "Prefer not to say",
  birthDateLabel: "Date of birth",
  calendarLabel: "Calendar",
  calendarSolar: "Solar",
  calendarLunar: "Lunar",
  birthTimeLabel: "Time of birth",
  timezoneLabel: "Time zone",
  timezoneOptionLabel: {
    "Asia/Seoul": "Korea (KST +9)",
    "Asia/Shanghai": "China/Singapore (CST +8)",
    "Asia/Kolkata": "India (IST +5:30)",
    "Europe/London": "UK (GMT 0)",
    "America/New_York": "US East (EST -5)",
    "America/Los_Angeles": "US West (PST -8)",
  },
  birthTimeUnknownLabel: "Birth time unknown",
  birthTimeUnknownNotice: "If the birth time is uncertain, lagna precision is lowered and the reading centers on the Moon and nakshatra flow instead.",
  birthPlaceLabel: "Place of birth",
  birthPlacePlaceholder: "e.g. Seoul, Tokyo, New York",
  geoCheckingLabel: "Checking location...",
  geoConfirmedLabel: (name) => `✓ ${name}`,
  geoHintLabel: "Enter your birthplace to align the star coordinates.",
  focusAreaLabel: "Topic to illuminate now",
  focusOptionLabel: {
    overall: "Overall flow",
    love: "Love",
    money: "Wealth",
    career: "Work & career",
    health: "Health",
    relationship: "Relationships",
    spirituality: "Spirituality",
    custom: "Ask directly",
  },
  questionLabel: "Free-form question",
  questionPlaceholder: "Write naturally about the flow you're most curious about right now.",
  submitButtonIdle: "Get a Vedic AI expert consultation",
  pricePrefix: "Consultation price ",
  phaseAccess: "Checking your pass...",
  phasePayment: "Checking payment info...",
  phaseStart: "Analyzing your chart...",
  geocodeFallbackNotice: "Couldn't find that birthplace, so we're calculating from Seoul.",
  geocodeErrorNotice: "Location lookup is briefly unstable, so we're calculating from Seoul.",
  geocodeFallbackName: "Seoul (default)",
  retryAccessNotice: "The connection is briefly unstable. Re-checking your pass.",
  sessionPendingNotice: "Reading the light of the nakshatras. Please wait a moment.",
  gateReason: "Vedic astrology expert consultation",
  accessCheckGateTitle: "Checking your pass",
  accessCheckCompleteTitle: "Pass check complete",
  accessCheckCompleteMessage: "Pass check is done. Reading the flow of starlight.",
  accessCheckFailTitleTransient: "Please try again shortly",
  accessCheckFailTitle: "Pass check failed",
  errorText: {
    INPUT_MISSING: "Some information needed for the Vedic consultation is missing. Please check your birth date, gender, and birth time again.",
    BIRTH_TIME_MISSING: "Birth time matters for Vedic astrology. Please enter it or select 'birth time unknown'.",
    CUSTOM_QUESTION_MISSING: "If you chose to ask directly, please also write what you're most curious about right now.",
    BIRTH_PLACE_INVALID: "Lagna and bhava calculations need birthplace coordinates. Please check the city name again.",
    LOGIN_REQUIRED: "This consultation requires signing in. Please sign in and try again.",
    PAYMENT_REQUIRED: "This consultation requires a pass or payment. Please check the payment info.",
    PAYMENT_VERIFY_FAILED: "Couldn't verify the payment info. Nothing was deducted from your payment or pass.",
    PAYMENT_CANCELLED: "Payment was cancelled. You can try again whenever you're ready.",
    PREPARE_FAILED: "A problem occurred while preparing the Vedic consultation. Nothing was deducted from your payment or pass.",
    CHART_CALCULATION_FAILED: "A problem occurred while calculating the Vedic chart. Please check the birth info you entered.",
    LLM_FAILED: "A problem occurred while generating the expert reading. Any deduction will be automatically restored.",
    NETWORK_ERROR: "The connection is unstable. Please try again in a moment.",
    SERVER_ERROR: "A problem occurred while preparing the Vedic consultation. Nothing was deducted from your payment or pass.",
    GENERATION_TIMEOUT: "The reading is taking longer than usual. Please don't close the page — try again shortly.",
    TEMPORARY_UNAVAILABLE: "The connection is briefly unstable right now. Your pass is safely preserved — please try again shortly.",
  },
  cosmosStages: [
    { label: "Converting your birth coordinates into cosmic time...", sub: "Calculating Julian Day" },
    { label: "Tracing the Sun's path...", sub: "Calculating Surya's ecliptic longitude" },
    { label: "Finding the Moon's nakshatra...", sub: "Chandra Nakshatra" },
    { label: "Raising the ascendant...", sub: "Calculating Lagna" },
    { label: "Reading the flow of dasha...", sub: "Vimshottari Dasha" },
    { label: "Completing the Jyotish interpretation...", sub: "Generating AI narrative" },
  ],
  cosmosFooter: "The planets are settling into place",
  cosmosFallbackText: "Aligning the rashi chart...",
  chartDetailAriaLabel: "Vedic calculation details",
  chartDetailHeading: "Vedic calculation details",
  noLagnaNotice: "No birth time was given, so lagna and bhava weren't arbitrarily calculated. Read mainly by Moon, rashi, nakshatra, and Vimshottari dasha.",
  lagnaBilingual: "Lagna, Ascendant",
  moonNakshatraBilingual: "Moon Nakshatra",
  currentDashaBilingual: "Current Dasha",
  lagnaRashiLabel: "Lagna rashi",
  lagnaDegreeLabel: "Lagna degree",
  lagnaNakshatraLabel: "Lagna nakshatra",
  lagnaPadaLabel: "Lagna pada",
  lagnaFirstHouseLabel: "First house rashi from lagna",
  birthTimeRequiredFallback: "Birth time needed",
  rashiBilingual: "Rashi",
  grahaBilingual: "Graha",
  bhavaBilingual: "Bhava",
  nakshatraBilingual: "Nakshatra",
  dashaBilingual: "Dasha",
  vimshottariBilingual: "Vimshottari Dasha",
  grahaLabel: { Sun: "Sun", Moon: "Moon", Mars: "Mars", Mercury: "Mercury", Jupiter: "Jupiter", Venus: "Venus", Saturn: "Saturn", Rahu: "Rahu", Ketu: "Ketu" },
  planetTableHeaders: { graha: "Graha", rashi: "Rashi", degree: "Degree", bhava: "Bhava", nakshatra: "Nakshatra", pada: "Pada", keywords: "Keywords" },
  bhavaTableHeaders: { bhava: "Bhava", rashi: "Rashi", meaning: "Meaning", graha: "Graha" },
  bhavaRequiresBirthInfo: "Accurate bhava calculation needs birth time and birthplace coordinates.",
  moonNakshatraDetailPrefix: "Moon nakshatra: ",
  dashaTableHeaders: { lord: "Lord", start: "Start", end: "End", duration: "Duration" },
  yearsSuffix: (n) => `${n} yrs`,
  padaSuffix: (n) => `Pada ${n}`,
  dashFallback: "-",
  jyotishEyebrow: "Jyotish · Vedic Astrology",
  resultTitle: (name) => `${name}'s Star Map`,
  defaultConsultantName: "Friend",
  pdfButtonAriaLabel: "Save as PDF",
  pdfButtonSaving: "Saving...",
  pdfButtonIdle: "Save PDF",
  chartSummaryAriaLabel: "Lagna, rashi, nakshatra summary",
  lagnaMedallionLabel: "Lagna",
  rashiMedallionLabel: "Rashi",
  nakshatraMedallionLabel: "Nakshatra",
  dashaCardLabelKo: "Dasha",
  mahadashaSuffix: " Mahadasha",
  scoreLabels: { dharma: "Dharma", artha: "Artha", kama: "Kama", moksha: "Moksha" },
  emptyStateHeading: "Your star map is ready to open quietly.",
  emptyStateBody: "We'll look at the flow where the moment of your birth meets your question right now.",
  pastConsultationLink: "View past consultation",
  pastConsultationHint: "Completed Vedic readings can be reopened any time.",
  summaryHeading: "Key Vedic indicators",
  summaryStrongGrahasLabel: "Strongly active grahas",
  summaryMajorBhavasLabel: "Major bhavas",
  d1SunFallback: "The Sun's flow",
  d1RahuFallback: "Together we'll look at the tension held at the Rahu-Ketu axis.",
  d9VenusFallback: "Inner maturity",
  d9Body: "Together we'll look at the texture of relationships, commitments, and choices that last.",
  userQuestionLabel: "My question",
  legacySectionExtraTitle: (n) => `Starlight guidance ${n}`,
};

const VEDIC_AI_COPY: Partial<Record<LoadingLocale, VedicAiCopy>> = {
  ko: {
    heroTitle: "베다점 전문가 상담",
    heroLead: "나크샤트라와 행성의 흐름, 다샤의 리듬 위로 지금의 질문이 조용히 비춥니다.",
    heroPrice: "30,000원",
    heroDashaBadge: "다샤 흐름",
    formPanelHeading: "별의 지도를 열기 위한 정보",
    loadProfileButtonAriaLabel: "프로필 카드에서 출생 정보 불러오기",
    loadProfileButtonLabel: "프로필 카드에서 불러오기",
    nameLabel: "이름 또는 닉네임",
    namePlaceholder: "상담에서 부를 이름",
    genderLabel: "성별",
    genderPlaceholder: "선택",
    genderFemale: "여성",
    genderMale: "남성",
    genderUnknown: "비공개",
    birthDateLabel: "생년월일",
    calendarLabel: "달력 기준",
    calendarSolar: "양력",
    calendarLunar: "음력",
    birthTimeLabel: "출생시간",
    timezoneLabel: "시간대",
    timezoneOptionLabel: {
      "Asia/Seoul": "한국 (KST +9)",
      "Asia/Shanghai": "중국/싱가포르 (CST +8)",
      "Asia/Kolkata": "인도 (IST +5:30)",
      "Europe/London": "영국 (GMT 0)",
      "America/New_York": "미국 동부 (EST -5)",
      "America/Los_Angeles": "미국 서부 (PST -8)",
    },
    birthTimeUnknownLabel: "출생시간 모름",
    birthTimeUnknownNotice: "출생시간이 불확실하면 라그나의 정밀도는 낮추고, 달과 나크샤트라의 흐름을 중심으로 읽습니다.",
    birthPlaceLabel: "출생지",
    birthPlacePlaceholder: "예: 서울, 부산 해운대구, Tokyo, New York",
    geoCheckingLabel: "위치 확인 중...",
    geoConfirmedLabel: (name) => `✓ ${name}`,
    geoHintLabel: "출생지를 적으면 별의 기준 좌표를 맞춥니다.",
    focusAreaLabel: "지금 비출 주제",
    focusOptionLabel: {
      overall: "전체 흐름",
      love: "연애",
      money: "재물",
      career: "일과 진로",
      health: "건강",
      relationship: "관계",
      spirituality: "영성",
      custom: "직접 질문",
    },
    questionLabel: "자유 질문",
    questionPlaceholder: "지금 가장 궁금한 흐름을 자연스럽게 적어 주세요.",
    submitButtonIdle: "베다점 전문가 상담 받기",
    pricePrefix: "상담 이용 가격 ",
    phaseAccess: "이용권을 확인하는 중...",
    phasePayment: "결제 정보를 확인하는 중...",
    phaseStart: "차트를 분석하는 중...",
    geocodeFallbackNotice: "출생지를 찾지 못해 서울 기준으로 계산합니다.",
    geocodeErrorNotice: "위치 확인이 잠시 불안정해 서울 기준으로 계산합니다.",
    geocodeFallbackName: "서울 (기본값)",
    retryAccessNotice: "연결이 잠시 불안정해요. 이용권을 다시 확인하는 중입니다.",
    sessionPendingNotice: "나크샤트라의 빛을 읽고 있습니다. 잠시만 기다려 주세요.",
    gateReason: "베다 점성술 전문가 상담",
    accessCheckGateTitle: "이용권 확인",
    accessCheckCompleteTitle: "이용권 확인 완료",
    accessCheckCompleteMessage: "이용권 확인이 끝났습니다. 별빛의 흐름을 읽고 있습니다.",
    accessCheckFailTitleTransient: "잠시 후 다시 시도",
    accessCheckFailTitle: "이용권 확인 실패",
    errorText: {
      INPUT_MISSING: "베다점 상담에 필요한 정보가 부족해요. 생년월일, 성별, 출생시간 정보를 다시 확인해 주세요.",
      BIRTH_TIME_MISSING: "베다점은 출생시간이 중요해요. 출생시간을 입력하거나 '출생시간 모름'을 선택해 주세요.",
      CUSTOM_QUESTION_MISSING: "직접 질문을 선택했다면 지금 가장 궁금한 내용을 함께 적어 주세요.",
      BIRTH_PLACE_INVALID: "라그나와 바바 계산에는 출생지 좌표가 필요해요. 도시명을 다시 확인해 주세요.",
      LOGIN_REQUIRED: "로그인이 필요한 상담입니다. 로그인 후 다시 시도해 주세요.",
      PAYMENT_REQUIRED: "이용권 또는 결제가 필요한 상담입니다. 결제 정보를 확인해 주세요.",
      PAYMENT_VERIFY_FAILED: "결제 정보를 확인하지 못했어요. 결제나 이용권은 차감되지 않았습니다.",
      PAYMENT_CANCELLED: "결제가 취소되었습니다. 필요할 때 다시 진행할 수 있습니다.",
      PREPARE_FAILED: "베다점 상담을 준비하는 중 문제가 발생했어요. 결제나 이용권은 차감되지 않았습니다.",
      CHART_CALCULATION_FAILED: "베다 차트를 계산하는 중 문제가 발생했어요. 입력한 출생 정보를 다시 확인해 주세요.",
      LLM_FAILED: "전문가 상담문을 생성하는 중 문제가 발생했어요. 차감된 내역이 있다면 자동으로 복구됩니다.",
      NETWORK_ERROR: "연결이 불안정해요. 잠시 후 다시 시도해 주세요.",
      SERVER_ERROR: "베다점 상담을 준비하는 중 문제가 발생했어요. 결제나 이용권은 차감되지 않았습니다.",
      GENERATION_TIMEOUT: "상담 생성이 평소보다 오래 걸리고 있습니다. 페이지를 닫지 말고 잠시 후 다시 시도해 주세요.",
      TEMPORARY_UNAVAILABLE: "지금 접속이 잠시 불안정해요. 이용권은 그대로 보존되니, 잠시 후 다시 시도해 주세요.",
    },
    cosmosStages: [
      { label: "출생 좌표를 우주 시간으로 변환하는 중", sub: "Julian Day 계산" },
      { label: "태양의 항로를 추적하는 중", sub: "Surya 황경 계산" },
      { label: "달의 나크샤트라를 찾는 중", sub: "Chandra Nakshatra" },
      { label: "어센던트를 세우는 중", sub: "Lagna 계산" },
      { label: "다샤의 흐름을 읽는 중", sub: "Vimshottari Dasha" },
      { label: "조티시 해석을 완성하는 중", sub: "AI 서사 생성" },
    ],
    cosmosFooter: "행성들이 자리를 잡고 있습니다",
    cosmosFallbackText: "라시 차트를 정렬하는 중...",
    chartDetailAriaLabel: "베다점 계산 상세",
    chartDetailHeading: "베다점 계산 상세",
    noLagnaNotice: "출생시간이 없어 라그나와 바바는 임의 계산하지 않았습니다. 달, 라시, 나크샤트라, 빈쇼타리 다샤를 중심으로 읽습니다.",
    lagnaBilingual: "라그나, Lagna",
    moonNakshatraBilingual: "달의 나크샤트라, Moon Nakshatra",
    currentDashaBilingual: "현재 다샤, Current Dasha",
    lagnaRashiLabel: "라그나 라시",
    lagnaDegreeLabel: "라그나 도수",
    lagnaNakshatraLabel: "라그나 나크샤트라",
    lagnaPadaLabel: "라그나 파다",
    lagnaFirstHouseLabel: "라그나 기준 1하우스 시작 라시",
    birthTimeRequiredFallback: "출생시간 필요",
    rashiBilingual: "라시, Rashi",
    grahaBilingual: "그라하, Graha",
    bhavaBilingual: "바바, Bhava",
    nakshatraBilingual: "나크샤트라, Nakshatra",
    dashaBilingual: "다샤, Dasha",
    vimshottariBilingual: "빈쇼타리 다샤, Vimshottari Dasha",
    grahaLabel: { Sun: "태양", Moon: "달", Mars: "화성", Mercury: "수성", Jupiter: "목성", Venus: "금성", Saturn: "토성", Rahu: "라후", Ketu: "케투" },
    planetTableHeaders: { graha: "그라하", rashi: "라시", degree: "도수", bhava: "바바", nakshatra: "나크샤트라", pada: "파다", keywords: "해석 키워드" },
    bhavaTableHeaders: { bhava: "바바", rashi: "라시", meaning: "의미", graha: "그라하" },
    bhavaRequiresBirthInfo: "정확한 바바 계산에는 출생시간과 출생지 좌표가 필요합니다.",
    moonNakshatraDetailPrefix: "달의 나크샤트라: ",
    dashaTableHeaders: { lord: "Lord", start: "시작", end: "종료", duration: "기간" },
    yearsSuffix: (n) => `${n}년`,
    padaSuffix: (n) => `${n}파다`,
    dashFallback: "-",
    jyotishEyebrow: "Jyotish · 조티시 베다 점성술",
    resultTitle: (name) => `${name}님의 별의 지도`,
    defaultConsultantName: "상담자",
    pdfButtonAriaLabel: "PDF로 저장",
    pdfButtonSaving: "저장 중…",
    pdfButtonIdle: "PDF 저장",
    chartSummaryAriaLabel: "라그나·라시·나크샤트라 요약",
    lagnaMedallionLabel: "라그나",
    rashiMedallionLabel: "라시",
    nakshatraMedallionLabel: "나크샤트라",
    dashaCardLabelKo: "다샤",
    mahadashaSuffix: " 마하다샤",
    scoreLabels: { dharma: "다르마", artha: "아르타", kama: "카마", moksha: "목샤" },
    emptyStateHeading: "별의 지도가 조용히 열릴 준비가 되어 있습니다.",
    emptyStateBody: "출생의 순간과 지금의 질문이 만나는 자리에서 흐름을 살피겠습니다.",
    pastConsultationLink: "지난 상담 다시 보기",
    pastConsultationHint: "완료된 베다점 상담은 언제든 다시 열 수 있습니다.",
    summaryHeading: "베다점 핵심 지표",
    summaryStrongGrahasLabel: "강하게 작동하는 그라하",
    summaryMajorBhavasLabel: "주요 바바",
    d1SunFallback: "태양의 흐름",
    d1RahuFallback: "라후와 케투의 축이 머무는 긴장을 함께 비춥니다.",
    d9VenusFallback: "내면의 성숙",
    d9Body: "관계와 약속, 오래 남는 선택의 질감을 함께 살핍니다.",
    userQuestionLabel: "나의 질문",
    legacySectionExtraTitle: (n) => `별빛 조언 ${n}`,
  },
  en: VEDIC_AI_COPY_EN,
  ja: {
    heroTitle: "ヴェーダ占星術専門家相談",
    heroLead: "ナクシャトラと惑星の流れ、ダシャーのリズムの上に、今の質問が静かに照らされます。",
    heroPrice: "30,000ウォン",
    heroDashaBadge: "ダシャーの流れ",
    formPanelHeading: "星の地図を開くための情報",
    loadProfileButtonAriaLabel: "プロフィールカードから出生情報を読み込む",
    loadProfileButtonLabel: "プロフィールカードから読み込む",
    nameLabel: "名前またはニックネーム",
    namePlaceholder: "相談で呼ぶ名前",
    genderLabel: "性別",
    genderPlaceholder: "選択",
    genderFemale: "女性",
    genderMale: "男性",
    genderUnknown: "非公開",
    birthDateLabel: "生年月日",
    calendarLabel: "暦の基準",
    calendarSolar: "新暦",
    calendarLunar: "旧暦",
    birthTimeLabel: "出生時刻",
    timezoneLabel: "タイムゾーン",
    timezoneOptionLabel: {
      "Asia/Seoul": "韓国 (KST +9)",
      "Asia/Shanghai": "中国/シンガポール (CST +8)",
      "Asia/Kolkata": "インド (IST +5:30)",
      "Europe/London": "イギリス (GMT 0)",
      "America/New_York": "米国東部 (EST -5)",
      "America/Los_Angeles": "米国西部 (PST -8)",
    },
    birthTimeUnknownLabel: "出生時刻不明",
    birthTimeUnknownNotice: "出生時刻が不確かな場合、ラグナの精度は下げ、月とナクシャトラの流れを中心に読みます。",
    birthPlaceLabel: "出生地",
    birthPlacePlaceholder: "例: ソウル、東京、New York",
    geoCheckingLabel: "位置を確認しています...",
    geoConfirmedLabel: (name) => `✓ ${name}`,
    geoHintLabel: "出生地を入力すると星の基準座標を合わせます。",
    focusAreaLabel: "今照らしたいテーマ",
    focusOptionLabel: {
      overall: "全体の流れ",
      love: "恋愛",
      money: "金運",
      career: "仕事と進路",
      health: "健康",
      relationship: "人間関係",
      spirituality: "スピリチュアル",
      custom: "直接質問",
    },
    questionLabel: "自由質問",
    questionPlaceholder: "今一番気になっている流れを自然に書いてください。",
    submitButtonIdle: "ヴェーダ占星術の専門家相談を受ける",
    pricePrefix: "相談利用料金 ",
    phaseAccess: "利用権を確認しています...",
    phasePayment: "決済情報を確認しています...",
    phaseStart: "チャートを分析しています...",
    geocodeFallbackNotice: "出生地が見つからず、ソウル基準で計算します。",
    geocodeErrorNotice: "位置確認が一時的に不安定なため、ソウル基準で計算します。",
    geocodeFallbackName: "ソウル (デフォルト)",
    retryAccessNotice: "接続が一時的に不安定です。利用権を再確認しています。",
    sessionPendingNotice: "ナクシャトラの光を読んでいます。少々お待ちください。",
    gateReason: "ヴェーダ占星術専門家相談",
    accessCheckGateTitle: "利用権確認",
    accessCheckCompleteTitle: "利用権確認完了",
    accessCheckCompleteMessage: "利用権確認が終わりました。星の光の流れを読んでいます。",
    accessCheckFailTitleTransient: "しばらくしてから再度お試しください",
    accessCheckFailTitle: "利用権確認失敗",
    errorText: {
      INPUT_MISSING: "ヴェーダ占星術相談に必要な情報が不足しています。生年月日、性別、出生時刻をもう一度ご確認ください。",
      BIRTH_TIME_MISSING: "ヴェーダ占星術では出生時刻が重要です。出生時刻を入力するか「出生時刻不明」を選択してください。",
      CUSTOM_QUESTION_MISSING: "直接質問を選んだ場合は、今一番気になる内容も一緒に書いてください。",
      BIRTH_PLACE_INVALID: "ラグナとバーヴァの計算には出生地の座標が必要です。都市名をもう一度ご確認ください。",
      LOGIN_REQUIRED: "ログインが必要な相談です。ログイン後、再度お試しください。",
      PAYMENT_REQUIRED: "利用権または決済が必要な相談です。決済情報をご確認ください。",
      PAYMENT_VERIFY_FAILED: "決済情報を確認できませんでした。決済や利用権は差し引かれていません。",
      PAYMENT_CANCELLED: "決済がキャンセルされました。必要な時にまた進めることができます。",
      PREPARE_FAILED: "ヴェーダ占星術相談の準備中に問題が発生しました。決済や利用権は差し引かれていません。",
      CHART_CALCULATION_FAILED: "ヴェーダチャートの計算中に問題が発生しました。入力した出生情報をもう一度ご確認ください。",
      LLM_FAILED: "専門家相談文の生成中に問題が発生しました。差し引かれた分があれば自動的に復元されます。",
      NETWORK_ERROR: "接続が不安定です。しばらくしてから再度お試しください。",
      SERVER_ERROR: "ヴェーダ占星術相談の準備中に問題が発生しました。決済や利用権は差し引かれていません。",
      GENERATION_TIMEOUT: "相談の生成が通常より時間がかかっています。ページを閉じずにしばらくしてから再度お試しください。",
      TEMPORARY_UNAVAILABLE: "現在接続が一時的に不安定です。利用権はそのまま保存されますので、しばらくしてから再度お試しください。",
    },
    cosmosStages: [
      { label: "出生座標を宇宙時間に変換しています", sub: "Julian Day 計算" },
      { label: "太陽の軌道を追跡しています", sub: "Surya 黄経計算" },
      { label: "月のナクシャトラを探しています", sub: "Chandra Nakshatra" },
      { label: "アセンダントを立てています", sub: "Lagna 計算" },
      { label: "ダシャーの流れを読んでいます", sub: "Vimshottari Dasha" },
      { label: "ジョーティシュの解釈を完成させています", sub: "AI 生成中" },
    ],
    cosmosFooter: "惑星たちが位置についています",
    cosmosFallbackText: "ラーシチャートを整えています...",
    chartDetailAriaLabel: "ヴェーダ占星術計算の詳細",
    chartDetailHeading: "ヴェーダ占星術計算の詳細",
    noLagnaNotice: "出生時刻がないため、ラグナとバーヴァは任意計算していません。月・ラーシ・ナクシャトラ・ヴィムショッタリ・ダシャーを中心にお読みください。",
    lagnaBilingual: "ラグナ, Lagna",
    moonNakshatraBilingual: "月のナクシャトラ, Moon Nakshatra",
    currentDashaBilingual: "現在のダシャー, Current Dasha",
    lagnaRashiLabel: "ラグナのラーシ",
    lagnaDegreeLabel: "ラグナの度数",
    lagnaNakshatraLabel: "ラグナのナクシャトラ",
    lagnaPadaLabel: "ラグナのパダ",
    lagnaFirstHouseLabel: "ラグナ基準の第1ハウス始点ラーシ",
    birthTimeRequiredFallback: "出生時刻が必要",
    rashiBilingual: "ラーシ, Rashi",
    grahaBilingual: "グラハ, Graha",
    bhavaBilingual: "バーヴァ, Bhava",
    nakshatraBilingual: "ナクシャトラ, Nakshatra",
    dashaBilingual: "ダシャー, Dasha",
    vimshottariBilingual: "ヴィムショッタリ・ダシャー, Vimshottari Dasha",
    grahaLabel: { Sun: "太陽", Moon: "月", Mars: "火星", Mercury: "水星", Jupiter: "木星", Venus: "金星", Saturn: "土星", Rahu: "ラーフ", Ketu: "ケートゥ" },
    planetTableHeaders: { graha: "グラハ", rashi: "ラーシ", degree: "度数", bhava: "バーヴァ", nakshatra: "ナクシャトラ", pada: "パダ", keywords: "解釈キーワード" },
    bhavaTableHeaders: { bhava: "バーヴァ", rashi: "ラーシ", meaning: "意味", graha: "グラハ" },
    bhavaRequiresBirthInfo: "正確なバーヴァ計算には出生時刻と出生地座標が必要です。",
    moonNakshatraDetailPrefix: "月のナクシャトラ: ",
    dashaTableHeaders: { lord: "Lord", start: "開始", end: "終了", duration: "期間" },
    yearsSuffix: (n) => `${n}年`,
    padaSuffix: (n) => `第${n}パダ`,
    dashFallback: "-",
    jyotishEyebrow: "Jyotish · ジョーティシュ・ヴェーダ占星術",
    resultTitle: (name) => `${name}さんの星の地図`,
    defaultConsultantName: "ご相談者",
    pdfButtonAriaLabel: "PDFで保存",
    pdfButtonSaving: "保存中…",
    pdfButtonIdle: "PDF保存",
    chartSummaryAriaLabel: "ラグナ・ラーシ・ナクシャトラ要約",
    lagnaMedallionLabel: "ラグナ",
    rashiMedallionLabel: "ラーシ",
    nakshatraMedallionLabel: "ナクシャトラ",
    dashaCardLabelKo: "ダシャー",
    mahadashaSuffix: " マハーダシャー",
    scoreLabels: { dharma: "ダルマ", artha: "アルタ", kama: "カーマ", moksha: "モークシャ" },
    emptyStateHeading: "星の地図が静かに開く準備ができています。",
    emptyStateBody: "生まれた瞬間と今の質問が出会う場所で、流れを見ていきます。",
    pastConsultationLink: "過去の相談をもう一度見る",
    pastConsultationHint: "完了したヴェーダ占星術相談はいつでも再度開けます。",
    summaryHeading: "ヴェーダ占星術の主要指標",
    summaryStrongGrahasLabel: "強く働くグラハ",
    summaryMajorBhavasLabel: "主要バーヴァ",
    d1SunFallback: "太陽の流れ",
    d1RahuFallback: "ラーフとケートゥの軸に宿る緊張も一緒に照らします。",
    d9VenusFallback: "内面の成熟",
    d9Body: "人間関係や約束、長く残る選択の質感を一緒に見ていきます。",
    userQuestionLabel: "私の質問",
    legacySectionExtraTitle: (n) => `星明かりのアドバイス ${n}`,
  },
  "zh-CN": {
    heroTitle: "吠陀占星专家咨询",
    heroLead: "在纳克夏特拉与行星运行、大运节奏之上，此刻的问题被静静照亮。",
    heroPrice: "30,000韩元",
    heroDashaBadge: "大运流转",
    formPanelHeading: "开启星图所需的信息",
    loadProfileButtonAriaLabel: "从个人资料卡加载出生信息",
    loadProfileButtonLabel: "从个人资料卡加载",
    nameLabel: "姓名或昵称",
    namePlaceholder: "咨询中使用的称呼",
    genderLabel: "性别",
    genderPlaceholder: "请选择",
    genderFemale: "女性",
    genderMale: "男性",
    genderUnknown: "不公开",
    birthDateLabel: "出生日期",
    calendarLabel: "历法基准",
    calendarSolar: "阳历",
    calendarLunar: "阴历",
    birthTimeLabel: "出生时间",
    timezoneLabel: "时区",
    timezoneOptionLabel: {
      "Asia/Seoul": "韩国 (KST +9)",
      "Asia/Shanghai": "中国/新加坡 (CST +8)",
      "Asia/Kolkata": "印度 (IST +5:30)",
      "Europe/London": "英国 (GMT 0)",
      "America/New_York": "美国东部 (EST -5)",
      "America/Los_Angeles": "美国西部 (PST -8)",
    },
    birthTimeUnknownLabel: "出生时间不详",
    birthTimeUnknownNotice: "出生时间不确定时，将降低上升点精度，以月亮和纳克夏特拉的流转为主进行解读。",
    birthPlaceLabel: "出生地",
    birthPlacePlaceholder: "例如：首尔、东京、纽约",
    geoCheckingLabel: "正在确认位置...",
    geoConfirmedLabel: (name) => `✓ ${name}`,
    geoHintLabel: "填写出生地即可校准星体基准坐标。",
    focusAreaLabel: "现在想照亮的主题",
    focusOptionLabel: {
      overall: "整体运势",
      love: "爱情",
      money: "财运",
      career: "工作与前途",
      health: "健康",
      relationship: "人际关系",
      spirituality: "灵性",
      custom: "直接提问",
    },
    questionLabel: "自由提问",
    questionPlaceholder: "请自然地写下您现在最想了解的运势方向。",
    submitButtonIdle: "接受吠陀占星专家咨询",
    pricePrefix: "咨询价格 ",
    phaseAccess: "正在确认您的权益...",
    phasePayment: "正在确认支付信息...",
    phaseStart: "正在分析星盘...",
    geocodeFallbackNotice: "未能找到该出生地，将以首尔为基准计算。",
    geocodeErrorNotice: "位置查询暂时不稳定，将以首尔为基准计算。",
    geocodeFallbackName: "首尔 (默认)",
    retryAccessNotice: "连接暂时不稳定，正在重新确认您的权益。",
    sessionPendingNotice: "正在解读纳克夏特拉之光，请稍候。",
    gateReason: "吠陀占星专家咨询",
    accessCheckGateTitle: "确认权益",
    accessCheckCompleteTitle: "权益确认完成",
    accessCheckCompleteMessage: "权益确认已完成，正在解读星光的流转。",
    accessCheckFailTitleTransient: "请稍后重试",
    accessCheckFailTitle: "权益确认失败",
    errorText: {
      INPUT_MISSING: "吠陀占星咨询所需信息不足，请重新确认出生日期、性别、出生时间信息。",
      BIRTH_TIME_MISSING: '吠陀占星中出生时间很重要，请输入出生时间或选择"出生时间不详"。',
      CUSTOM_QUESTION_MISSING: "如果选择了直接提问，请一并写下您现在最想了解的内容。",
      BIRTH_PLACE_INVALID: "上升点与宫位计算需要出生地坐标，请重新确认城市名称。",
      LOGIN_REQUIRED: "此咨询需要登录，请登录后重试。",
      PAYMENT_REQUIRED: "此咨询需要权益或付款，请确认支付信息。",
      PAYMENT_VERIFY_FAILED: "未能确认支付信息，付款或权益均未被扣除。",
      PAYMENT_CANCELLED: "支付已取消，需要时可以再次进行。",
      PREPARE_FAILED: "准备吠陀占星咨询时发生问题，付款或权益均未被扣除。",
      CHART_CALCULATION_FAILED: "计算吠陀星盘时发生问题，请重新确认输入的出生信息。",
      LLM_FAILED: "生成专家咨询文本时发生问题，如有扣除将自动恢复。",
      NETWORK_ERROR: "连接不稳定，请稍后重试。",
      SERVER_ERROR: "准备吠陀占星咨询时发生问题，付款或权益均未被扣除。",
      GENERATION_TIMEOUT: "咨询生成比平时耗时更长，请不要关闭页面，稍后重试。",
      TEMPORARY_UNAVAILABLE: "当前连接暂时不稳定，您的权益将完整保留，请稍后重试。",
    },
    cosmosStages: [
      { label: "正在将出生坐标转换为宇宙时间", sub: "计算儒略日" },
      { label: "正在追踪太阳的轨迹", sub: "计算太阳黄经" },
      { label: "正在寻找月亮的纳克夏特拉", sub: "月亮纳克夏特拉" },
      { label: "正在确立上升点", sub: "计算上升点" },
      { label: "正在解读大运的流转", sub: "威姆萨塔里大运" },
      { label: "正在完成占星解读", sub: "生成AI解读文本" },
    ],
    cosmosFooter: "行星们正在各就其位",
    cosmosFallbackText: "正在校准拉希盘...",
    chartDetailAriaLabel: "吠陀占星计算详情",
    chartDetailHeading: "吠陀占星计算详情",
    noLagnaNotice: "由于没有出生时间，未任意计算上升点和宫位。请以月亮、拉希、纳克夏特拉、威姆萨塔里大运为主进行解读。",
    lagnaBilingual: "上升点, Lagna",
    moonNakshatraBilingual: "月亮纳克夏特拉, Moon Nakshatra",
    currentDashaBilingual: "当前大运, Current Dasha",
    lagnaRashiLabel: "上升点拉希",
    lagnaDegreeLabel: "上升点度数",
    lagnaNakshatraLabel: "上升点纳克夏特拉",
    lagnaPadaLabel: "上升点四分之一区",
    lagnaFirstHouseLabel: "以上升点为基准的第一宫起始拉希",
    birthTimeRequiredFallback: "需要出生时间",
    rashiBilingual: "拉希, Rashi",
    grahaBilingual: "行星, Graha",
    bhavaBilingual: "宫位, Bhava",
    nakshatraBilingual: "纳克夏特拉, Nakshatra",
    dashaBilingual: "大运, Dasha",
    vimshottariBilingual: "威姆萨塔里大运, Vimshottari Dasha",
    grahaLabel: { Sun: "太阳", Moon: "月亮", Mars: "火星", Mercury: "水星", Jupiter: "木星", Venus: "金星", Saturn: "土星", Rahu: "罗睺", Ketu: "计都" },
    planetTableHeaders: { graha: "行星", rashi: "拉希", degree: "度数", bhava: "宫位", nakshatra: "纳克夏特拉", pada: "四分区", keywords: "解读关键词" },
    bhavaTableHeaders: { bhava: "宫位", rashi: "拉希", meaning: "含义", graha: "行星" },
    bhavaRequiresBirthInfo: "精确的宫位计算需要出生时间和出生地坐标。",
    moonNakshatraDetailPrefix: "月亮纳克夏特拉: ",
    dashaTableHeaders: { lord: "宫主星", start: "开始", end: "结束", duration: "期间" },
    yearsSuffix: (n) => `${n}年`,
    padaSuffix: (n) => `第${n}区`,
    dashFallback: "-",
    jyotishEyebrow: "Jyotish · 佳蒂什吠陀占星术",
    resultTitle: (name) => `${name}的星图`,
    defaultConsultantName: "来访者",
    pdfButtonAriaLabel: "保存为PDF",
    pdfButtonSaving: "保存中…",
    pdfButtonIdle: "保存PDF",
    chartSummaryAriaLabel: "上升点·拉希·纳克夏特拉摘要",
    lagnaMedallionLabel: "上升点",
    rashiMedallionLabel: "拉希",
    nakshatraMedallionLabel: "纳克夏特拉",
    dashaCardLabelKo: "大运",
    mahadashaSuffix: " 玛哈大运",
    scoreLabels: { dharma: "达摩", artha: "利益", kama: "欲乐", moksha: "解脱" },
    emptyStateHeading: "您的星图已准备好静静展开。",
    emptyStateBody: "我们将审视您出生的瞬间与此刻问题相遇之处的运势流转。",
    pastConsultationLink: "查看以往咨询",
    pastConsultationHint: "已完成的吠陀占星咨询可随时重新打开。",
    summaryHeading: "吠陀占星核心指标",
    summaryStrongGrahasLabel: "力量较强的行星",
    summaryMajorBhavasLabel: "主要宫位",
    d1SunFallback: "太阳的运势",
    d1RahuFallback: "我们也会一同审视罗睺与计都轴线上潜藏的张力。",
    d9VenusFallback: "内在的成熟",
    d9Body: "我们将一同审视人际关系、承诺与长久选择的质感。",
    userQuestionLabel: "我的问题",
    legacySectionExtraTitle: (n) => `星光指引 ${n}`,
  },
  "zh-TW": {
    heroTitle: "吠陀占星專家諮詢",
    heroLead: "在納克沙特拉與行星運行、大運節奏之上，此刻的問題被靜靜照亮。",
    heroPrice: "30,000韓元",
    heroDashaBadge: "大運流轉",
    formPanelHeading: "開啟星圖所需的資訊",
    loadProfileButtonAriaLabel: "從個人資料卡載入出生資訊",
    loadProfileButtonLabel: "從個人資料卡載入",
    nameLabel: "姓名或暱稱",
    namePlaceholder: "諮詢中使用的稱呼",
    genderLabel: "性別",
    genderPlaceholder: "請選擇",
    genderFemale: "女性",
    genderMale: "男性",
    genderUnknown: "不公開",
    birthDateLabel: "出生日期",
    calendarLabel: "曆法基準",
    calendarSolar: "陽曆",
    calendarLunar: "陰曆",
    birthTimeLabel: "出生時間",
    timezoneLabel: "時區",
    timezoneOptionLabel: {
      "Asia/Seoul": "韓國 (KST +9)",
      "Asia/Shanghai": "中國/新加坡 (CST +8)",
      "Asia/Kolkata": "印度 (IST +5:30)",
      "Europe/London": "英國 (GMT 0)",
      "America/New_York": "美國東部 (EST -5)",
      "America/Los_Angeles": "美國西部 (PST -8)",
    },
    birthTimeUnknownLabel: "出生時間不詳",
    birthTimeUnknownNotice: "出生時間不確定時，將降低上升點精度，以月亮和納克沙特拉的流轉為主進行解讀。",
    birthPlaceLabel: "出生地",
    birthPlacePlaceholder: "例如：首爾、東京、紐約",
    geoCheckingLabel: "正在確認位置...",
    geoConfirmedLabel: (name) => `✓ ${name}`,
    geoHintLabel: "填寫出生地即可校準星體基準座標。",
    focusAreaLabel: "現在想照亮的主題",
    focusOptionLabel: {
      overall: "整體運勢",
      love: "愛情",
      money: "財運",
      career: "工作與前途",
      health: "健康",
      relationship: "人際關係",
      spirituality: "靈性",
      custom: "直接提問",
    },
    questionLabel: "自由提問",
    questionPlaceholder: "請自然地寫下您現在最想了解的運勢方向。",
    submitButtonIdle: "接受吠陀占星專家諮詢",
    pricePrefix: "諮詢價格 ",
    phaseAccess: "正在確認您的權益...",
    phasePayment: "正在確認付款資訊...",
    phaseStart: "正在分析星盤...",
    geocodeFallbackNotice: "未能找到該出生地，將以首爾為基準計算。",
    geocodeErrorNotice: "位置查詢暫時不穩定，將以首爾為基準計算。",
    geocodeFallbackName: "首爾 (預設)",
    retryAccessNotice: "連線暫時不穩定，正在重新確認您的權益。",
    sessionPendingNotice: "正在解讀納克沙特拉之光，請稍候。",
    gateReason: "吠陀占星專家諮詢",
    accessCheckGateTitle: "確認權益",
    accessCheckCompleteTitle: "權益確認完成",
    accessCheckCompleteMessage: "權益確認已完成，正在解讀星光的流轉。",
    accessCheckFailTitleTransient: "請稍後重試",
    accessCheckFailTitle: "權益確認失敗",
    errorText: {
      INPUT_MISSING: "吠陀占星諮詢所需資訊不足，請重新確認出生日期、性別、出生時間資訊。",
      BIRTH_TIME_MISSING: "吠陀占星中出生時間很重要，請輸入出生時間或選擇「出生時間不詳」。",
      CUSTOM_QUESTION_MISSING: "如果選擇了直接提問，請一併寫下您現在最想了解的內容。",
      BIRTH_PLACE_INVALID: "上升點與宮位計算需要出生地座標，請重新確認城市名稱。",
      LOGIN_REQUIRED: "此諮詢需要登入，請登入後重試。",
      PAYMENT_REQUIRED: "此諮詢需要權益或付款，請確認付款資訊。",
      PAYMENT_VERIFY_FAILED: "未能確認付款資訊，付款或權益均未被扣除。",
      PAYMENT_CANCELLED: "付款已取消，需要時可以再次進行。",
      PREPARE_FAILED: "準備吠陀占星諮詢時發生問題，付款或權益均未被扣除。",
      CHART_CALCULATION_FAILED: "計算吠陀星盤時發生問題，請重新確認輸入的出生資訊。",
      LLM_FAILED: "生成專家諮詢文本時發生問題，如有扣除將自動恢復。",
      NETWORK_ERROR: "連線不穩定，請稍後重試。",
      SERVER_ERROR: "準備吠陀占星諮詢時發生問題，付款或權益均未被扣除。",
      GENERATION_TIMEOUT: "諮詢生成比平時耗時更長，請不要關閉頁面，稍後重試。",
      TEMPORARY_UNAVAILABLE: "目前連線暫時不穩定，您的權益將完整保留，請稍後重試。",
    },
    cosmosStages: [
      { label: "正在將出生座標轉換為宇宙時間", sub: "計算儒略日" },
      { label: "正在追蹤太陽的軌跡", sub: "計算太陽黃經" },
      { label: "正在尋找月亮的納克沙特拉", sub: "月亮納克沙特拉" },
      { label: "正在確立上升點", sub: "計算上升點" },
      { label: "正在解讀大運的流轉", sub: "威姆薩塔里大運" },
      { label: "正在完成占星解讀", sub: "生成AI解讀文本" },
    ],
    cosmosFooter: "行星們正在各就其位",
    cosmosFallbackText: "正在校準拉希盤...",
    chartDetailAriaLabel: "吠陀占星計算詳情",
    chartDetailHeading: "吠陀占星計算詳情",
    noLagnaNotice: "由於沒有出生時間，未任意計算上升點和宮位。請以月亮、拉希、納克沙特拉、威姆薩塔里大運為主進行解讀。",
    lagnaBilingual: "上升點, Lagna",
    moonNakshatraBilingual: "月亮納克沙特拉, Moon Nakshatra",
    currentDashaBilingual: "當前大運, Current Dasha",
    lagnaRashiLabel: "上升點拉希",
    lagnaDegreeLabel: "上升點度數",
    lagnaNakshatraLabel: "上升點納克沙特拉",
    lagnaPadaLabel: "上升點四分之一區",
    lagnaFirstHouseLabel: "以上升點為基準的第一宮起始拉希",
    birthTimeRequiredFallback: "需要出生時間",
    rashiBilingual: "拉希, Rashi",
    grahaBilingual: "行星, Graha",
    bhavaBilingual: "宮位, Bhava",
    nakshatraBilingual: "納克沙特拉, Nakshatra",
    dashaBilingual: "大運, Dasha",
    vimshottariBilingual: "威姆薩塔里大運, Vimshottari Dasha",
    grahaLabel: { Sun: "太陽", Moon: "月亮", Mars: "火星", Mercury: "水星", Jupiter: "木星", Venus: "金星", Saturn: "土星", Rahu: "羅睺", Ketu: "計都" },
    planetTableHeaders: { graha: "行星", rashi: "拉希", degree: "度數", bhava: "宮位", nakshatra: "納克沙特拉", pada: "四分區", keywords: "解讀關鍵字" },
    bhavaTableHeaders: { bhava: "宮位", rashi: "拉希", meaning: "含義", graha: "行星" },
    bhavaRequiresBirthInfo: "精確的宮位計算需要出生時間和出生地座標。",
    moonNakshatraDetailPrefix: "月亮納克沙特拉: ",
    dashaTableHeaders: { lord: "宮主星", start: "開始", end: "結束", duration: "期間" },
    yearsSuffix: (n) => `${n}年`,
    padaSuffix: (n) => `第${n}區`,
    dashFallback: "-",
    jyotishEyebrow: "Jyotish · 佳蒂什吠陀占星術",
    resultTitle: (name) => `${name}的星圖`,
    defaultConsultantName: "來訪者",
    pdfButtonAriaLabel: "儲存為PDF",
    pdfButtonSaving: "儲存中…",
    pdfButtonIdle: "儲存PDF",
    chartSummaryAriaLabel: "上升點·拉希·納克沙特拉摘要",
    lagnaMedallionLabel: "上升點",
    rashiMedallionLabel: "拉希",
    nakshatraMedallionLabel: "納克沙特拉",
    dashaCardLabelKo: "大運",
    mahadashaSuffix: " 瑪哈大運",
    scoreLabels: { dharma: "達摩", artha: "利益", kama: "欲樂", moksha: "解脫" },
    emptyStateHeading: "您的星圖已準備好靜靜展開。",
    emptyStateBody: "我們將審視您出生的瞬間與此刻問題相遇之處的運勢流轉。",
    pastConsultationLink: "查看以往諮詢",
    pastConsultationHint: "已完成的吠陀占星諮詢可隨時重新開啟。",
    summaryHeading: "吠陀占星核心指標",
    summaryStrongGrahasLabel: "力量較強的行星",
    summaryMajorBhavasLabel: "主要宮位",
    d1SunFallback: "太陽的運勢",
    d1RahuFallback: "我們也會一同審視羅睺與計都軸線上潛藏的張力。",
    d9VenusFallback: "內在的成熟",
    d9Body: "我們將一同審視人際關係、承諾與長久選擇的質感。",
    userQuestionLabel: "我的問題",
    legacySectionExtraTitle: (n) => `星光指引 ${n}`,
  },
  vi: {
    heroTitle: "Tư vấn chuyên gia Chiêm tinh Vệ Đà",
    heroLead: "Trên dòng chảy của nakshatra và các hành tinh, cùng nhịp điệu dasha, câu hỏi của bạn lúc này được soi sáng lặng lẽ.",
    heroPrice: "30.000 KRW",
    heroDashaBadge: "Dòng chảy dasha",
    formPanelHeading: "Thông tin để mở bản đồ sao của bạn",
    loadProfileButtonAriaLabel: "Tải thông tin sinh từ thẻ hồ sơ",
    loadProfileButtonLabel: "Tải từ thẻ hồ sơ",
    nameLabel: "Tên hoặc biệt danh",
    namePlaceholder: "Tên dùng trong buổi tư vấn",
    genderLabel: "Giới tính",
    genderPlaceholder: "Chọn",
    genderFemale: "Nữ",
    genderMale: "Nam",
    genderUnknown: "Không tiết lộ",
    birthDateLabel: "Ngày sinh",
    calendarLabel: "Loại lịch",
    calendarSolar: "Dương lịch",
    calendarLunar: "Âm lịch",
    birthTimeLabel: "Giờ sinh",
    timezoneLabel: "Múi giờ",
    timezoneOptionLabel: {
      "Asia/Seoul": "Hàn Quốc (KST +9)",
      "Asia/Shanghai": "Trung Quốc/Singapore (CST +8)",
      "Asia/Kolkata": "Ấn Độ (IST +5:30)",
      "Europe/London": "Anh (GMT 0)",
      "America/New_York": "Miền Đông Mỹ (EST -5)",
      "America/Los_Angeles": "Miền Tây Mỹ (PST -8)",
    },
    birthTimeUnknownLabel: "Không rõ giờ sinh",
    birthTimeUnknownNotice: "Nếu giờ sinh không chắc chắn, độ chính xác của lagna sẽ giảm, và bài đọc sẽ tập trung vào dòng chảy Mặt Trăng và nakshatra.",
    birthPlaceLabel: "Nơi sinh",
    birthPlacePlaceholder: "Ví dụ: Seoul, Tokyo, New York",
    geoCheckingLabel: "Đang kiểm tra vị trí...",
    geoConfirmedLabel: (name) => `✓ ${name}`,
    geoHintLabel: "Nhập nơi sinh để căn chỉnh tọa độ chuẩn của các vì sao.",
    focusAreaLabel: "Chủ đề muốn soi sáng lúc này",
    focusOptionLabel: {
      overall: "Dòng chảy tổng thể",
      love: "Tình yêu",
      money: "Tài lộc",
      career: "Công việc & sự nghiệp",
      health: "Sức khỏe",
      relationship: "Các mối quan hệ",
      spirituality: "Tâm linh",
      custom: "Hỏi trực tiếp",
    },
    questionLabel: "Câu hỏi tự do",
    questionPlaceholder: "Hãy viết tự nhiên về điều bạn tò mò nhất lúc này.",
    submitButtonIdle: "Nhận tư vấn chuyên gia Chiêm tinh Vệ Đà",
    pricePrefix: "Giá tư vấn ",
    phaseAccess: "Đang kiểm tra gói sử dụng của bạn...",
    phasePayment: "Đang kiểm tra thông tin thanh toán...",
    phaseStart: "Đang phân tích biểu đồ của bạn...",
    geocodeFallbackNotice: "Không tìm thấy nơi sinh đó, nên chúng tôi tính toán theo Seoul.",
    geocodeErrorNotice: "Tra cứu vị trí đang tạm thời không ổn định, nên chúng tôi tính toán theo Seoul.",
    geocodeFallbackName: "Seoul (mặc định)",
    retryAccessNotice: "Kết nối đang tạm thời không ổn định. Đang kiểm tra lại gói sử dụng của bạn.",
    sessionPendingNotice: "Đang đọc ánh sáng của các nakshatra. Vui lòng đợi trong giây lát.",
    gateReason: "Tư vấn chuyên gia chiêm tinh Vệ Đà",
    accessCheckGateTitle: "Kiểm tra gói sử dụng",
    accessCheckCompleteTitle: "Đã hoàn tất kiểm tra gói sử dụng",
    accessCheckCompleteMessage: "Đã kiểm tra xong gói sử dụng. Đang đọc dòng chảy ánh sao.",
    accessCheckFailTitleTransient: "Vui lòng thử lại sau",
    accessCheckFailTitle: "Kiểm tra gói sử dụng thất bại",
    errorText: {
      INPUT_MISSING: "Thiếu một số thông tin cần thiết cho buổi tư vấn Vệ Đà. Vui lòng kiểm tra lại ngày sinh, giới tính và giờ sinh.",
      BIRTH_TIME_MISSING: "Giờ sinh rất quan trọng trong chiêm tinh Vệ Đà. Vui lòng nhập giờ sinh hoặc chọn 'không rõ giờ sinh'.",
      CUSTOM_QUESTION_MISSING: "Nếu bạn chọn hỏi trực tiếp, vui lòng viết thêm điều bạn đang tò mò nhất lúc này.",
      BIRTH_PLACE_INVALID: "Tính toán lagna và bhava cần tọa độ nơi sinh. Vui lòng kiểm tra lại tên thành phố.",
      LOGIN_REQUIRED: "Buổi tư vấn này cần đăng nhập. Vui lòng đăng nhập rồi thử lại.",
      PAYMENT_REQUIRED: "Buổi tư vấn này cần gói sử dụng hoặc thanh toán. Vui lòng kiểm tra thông tin thanh toán.",
      PAYMENT_VERIFY_FAILED: "Không thể xác nhận thông tin thanh toán. Không có khoản nào bị trừ từ thanh toán hoặc gói sử dụng của bạn.",
      PAYMENT_CANCELLED: "Thanh toán đã bị hủy. Bạn có thể thử lại bất cứ khi nào cần.",
      PREPARE_FAILED: "Đã xảy ra sự cố khi chuẩn bị buổi tư vấn Vệ Đà. Không có khoản nào bị trừ từ thanh toán hoặc gói sử dụng của bạn.",
      CHART_CALCULATION_FAILED: "Đã xảy ra sự cố khi tính toán biểu đồ Vệ Đà. Vui lòng kiểm tra lại thông tin sinh bạn đã nhập.",
      LLM_FAILED: "Đã xảy ra sự cố khi tạo bài đọc chuyên gia. Nếu có khoản đã bị trừ sẽ được tự động hoàn lại.",
      NETWORK_ERROR: "Kết nối không ổn định. Vui lòng thử lại sau một chút.",
      SERVER_ERROR: "Đã xảy ra sự cố khi chuẩn bị buổi tư vấn Vệ Đà. Không có khoản nào bị trừ từ thanh toán hoặc gói sử dụng của bạn.",
      GENERATION_TIMEOUT: "Việc tạo bài đọc đang mất nhiều thời gian hơn bình thường. Vui lòng không đóng trang và thử lại sau một chút.",
      TEMPORARY_UNAVAILABLE: "Kết nối hiện đang tạm thời không ổn định. Gói sử dụng của bạn vẫn được giữ nguyên, vui lòng thử lại sau một chút.",
    },
    cosmosStages: [
      { label: "Đang chuyển đổi tọa độ sinh của bạn thành thời gian vũ trụ", sub: "Tính toán Julian Day" },
      { label: "Đang theo dõi hành trình của Mặt Trời", sub: "Tính kinh độ hoàng đạo Surya" },
      { label: "Đang tìm nakshatra của Mặt Trăng", sub: "Chandra Nakshatra" },
      { label: "Đang xác lập điểm mọc", sub: "Tính toán Lagna" },
      { label: "Đang đọc dòng chảy của dasha", sub: "Vimshottari Dasha" },
      { label: "Đang hoàn thiện diễn giải Jyotish", sub: "Đang tạo nội dung AI" },
    ],
    cosmosFooter: "Các hành tinh đang vào vị trí",
    cosmosFallbackText: "Đang căn chỉnh biểu đồ rashi...",
    chartDetailAriaLabel: "Chi tiết tính toán Vệ Đà",
    chartDetailHeading: "Chi tiết tính toán Vệ Đà",
    noLagnaNotice: "Không có giờ sinh nên lagna và bhava không được tính toán tùy tiện. Hãy đọc chủ yếu theo Mặt Trăng, rashi, nakshatra và Vimshottari dasha.",
    lagnaBilingual: "Lagna, Điểm mọc",
    moonNakshatraBilingual: "Nakshatra Mặt Trăng, Moon Nakshatra",
    currentDashaBilingual: "Dasha hiện tại, Current Dasha",
    lagnaRashiLabel: "Rashi của Lagna",
    lagnaDegreeLabel: "Độ số của Lagna",
    lagnaNakshatraLabel: "Nakshatra của Lagna",
    lagnaPadaLabel: "Pada của Lagna",
    lagnaFirstHouseLabel: "Rashi bắt đầu cung 1 tính theo lagna",
    birthTimeRequiredFallback: "Cần giờ sinh",
    rashiBilingual: "Rashi",
    grahaBilingual: "Graha",
    bhavaBilingual: "Bhava",
    nakshatraBilingual: "Nakshatra",
    dashaBilingual: "Dasha",
    vimshottariBilingual: "Vimshottari Dasha",
    grahaLabel: { Sun: "Mặt Trời", Moon: "Mặt Trăng", Mars: "Sao Hỏa", Mercury: "Sao Thủy", Jupiter: "Sao Mộc", Venus: "Sao Kim", Saturn: "Sao Thổ", Rahu: "Rahu", Ketu: "Ketu" },
    planetTableHeaders: { graha: "Graha", rashi: "Rashi", degree: "Độ số", bhava: "Bhava", nakshatra: "Nakshatra", pada: "Pada", keywords: "Từ khóa diễn giải" },
    bhavaTableHeaders: { bhava: "Bhava", rashi: "Rashi", meaning: "Ý nghĩa", graha: "Graha" },
    bhavaRequiresBirthInfo: "Tính toán bhava chính xác cần giờ sinh và tọa độ nơi sinh.",
    moonNakshatraDetailPrefix: "Nakshatra Mặt Trăng: ",
    dashaTableHeaders: { lord: "Chủ tinh", start: "Bắt đầu", end: "Kết thúc", duration: "Thời gian" },
    yearsSuffix: (n) => `${n} năm`,
    padaSuffix: (n) => `Pada ${n}`,
    dashFallback: "-",
    jyotishEyebrow: "Jyotish · Chiêm tinh Vệ Đà",
    resultTitle: (name) => `Bản đồ sao của ${name}`,
    defaultConsultantName: "Bạn",
    pdfButtonAriaLabel: "Lưu dưới dạng PDF",
    pdfButtonSaving: "Đang lưu...",
    pdfButtonIdle: "Lưu PDF",
    chartSummaryAriaLabel: "Tóm tắt Lagna, rashi, nakshatra",
    lagnaMedallionLabel: "Lagna",
    rashiMedallionLabel: "Rashi",
    nakshatraMedallionLabel: "Nakshatra",
    dashaCardLabelKo: "Dasha",
    mahadashaSuffix: " Mahadasha",
    scoreLabels: { dharma: "Dharma", artha: "Artha", kama: "Kama", moksha: "Moksha" },
    emptyStateHeading: "Bản đồ sao của bạn đã sẵn sàng để mở ra lặng lẽ.",
    emptyStateBody: "Chúng tôi sẽ xem xét dòng chảy nơi khoảnh khắc sinh ra của bạn gặp gỡ câu hỏi hiện tại.",
    pastConsultationLink: "Xem lại buổi tư vấn trước",
    pastConsultationHint: "Các buổi tư vấn Vệ Đà đã hoàn thành có thể mở lại bất cứ lúc nào.",
    summaryHeading: "Chỉ số Vệ Đà chính",
    summaryStrongGrahasLabel: "Các graha hoạt động mạnh",
    summaryMajorBhavasLabel: "Các bhava chính",
    d1SunFallback: "Dòng chảy của Mặt Trời",
    d1RahuFallback: "Chúng ta cũng sẽ cùng xem xét sự căng thẳng nằm ở trục Rahu-Ketu.",
    d9VenusFallback: "Sự trưởng thành nội tâm",
    d9Body: "Chúng ta sẽ cùng xem xét chất cảm của các mối quan hệ, cam kết và những lựa chọn lâu dài.",
    userQuestionLabel: "Câu hỏi của tôi",
    legacySectionExtraTitle: (n) => `Lời khuyên ánh sao ${n}`,
  },
  hi: {
    heroTitle: "वैदिक ज्योतिष विशेषज्ञ परामर्श",
    heroLead: "नक्षत्रों और ग्रहों के प्रवाह, दशा की लय के ऊपर, अभी का प्रश्न शांति से रोशन होता है।",
    heroPrice: "₩30,000",
    heroDashaBadge: "दशा प्रवाह",
    formPanelHeading: "आपका सितारा मानचित्र खोलने के लिए जानकारी",
    loadProfileButtonAriaLabel: "प्रोफ़ाइल कार्ड से जन्म जानकारी लोड करें",
    loadProfileButtonLabel: "प्रोफ़ाइल कार्ड से लोड करें",
    nameLabel: "नाम या उपनाम",
    namePlaceholder: "परामर्श में बुलाया जाने वाला नाम",
    genderLabel: "लिंग",
    genderPlaceholder: "चुनें",
    genderFemale: "महिला",
    genderMale: "पुरुष",
    genderUnknown: "गोपनीय",
    birthDateLabel: "जन्म तिथि",
    calendarLabel: "पंचांग आधार",
    calendarSolar: "सौर",
    calendarLunar: "चंद्र",
    birthTimeLabel: "जन्म समय",
    timezoneLabel: "समय क्षेत्र",
    timezoneOptionLabel: {
      "Asia/Seoul": "कोरिया (KST +9)",
      "Asia/Shanghai": "चीन/सिंगापुर (CST +8)",
      "Asia/Kolkata": "भारत (IST +5:30)",
      "Europe/London": "यूके (GMT 0)",
      "America/New_York": "अमेरिका पूर्व (EST -5)",
      "America/Los_Angeles": "अमेरिका पश्चिम (PST -8)",
    },
    birthTimeUnknownLabel: "जन्म समय अज्ञात",
    birthTimeUnknownNotice: "यदि जन्म समय अनिश्चित है, तो लग्न की सटीकता कम हो जाती है और पढ़ाई चंद्र व नक्षत्र प्रवाह पर केंद्रित होती है।",
    birthPlaceLabel: "जन्म स्थान",
    birthPlacePlaceholder: "उदाहरण: सियोल, टोक्यो, न्यूयॉर्क",
    geoCheckingLabel: "स्थान जांचा जा रहा है...",
    geoConfirmedLabel: (name) => `✓ ${name}`,
    geoHintLabel: "जन्म स्थान लिखने से सितारों के आधार निर्देशांक मेल खाते हैं।",
    focusAreaLabel: "अभी जिस विषय को रोशन करना है",
    focusOptionLabel: {
      overall: "समग्र प्रवाह",
      love: "प्रेम",
      money: "धन",
      career: "काम और करियर",
      health: "स्वास्थ्य",
      relationship: "रिश्ते",
      spirituality: "आध्यात्मिकता",
      custom: "सीधे पूछें",
    },
    questionLabel: "मुक्त प्रश्न",
    questionPlaceholder: "अभी आप जिस प्रवाह के बारे में सबसे अधिक जानना चाहते हैं, उसे स्वाभाविक रूप से लिखें।",
    submitButtonIdle: "वैदिक ज्योतिष विशेषज्ञ परामर्श प्राप्त करें",
    pricePrefix: "परामर्श मूल्य ",
    phaseAccess: "आपका पास जांचा जा रहा है...",
    phasePayment: "भुगतान जानकारी जांची जा रही है...",
    phaseStart: "आपका चार्ट विश्लेषित किया जा रहा है...",
    geocodeFallbackNotice: "वह जन्म स्थान नहीं मिला, इसलिए हम सियोल के आधार पर गणना कर रहे हैं।",
    geocodeErrorNotice: "स्थान खोज अस्थायी रूप से अस्थिर है, इसलिए हम सियोल के आधार पर गणना कर रहे हैं।",
    geocodeFallbackName: "सियोल (डिफ़ॉल्ट)",
    retryAccessNotice: "कनेक्शन अस्थायी रूप से अस्थिर है। आपका पास फिर से जांचा जा रहा है।",
    sessionPendingNotice: "नक्षत्रों की रोशनी पढ़ी जा रही है। कृपया थोड़ा प्रतीक्षा करें।",
    gateReason: "वैदिक ज्योतिष विशेषज्ञ परामर्श",
    accessCheckGateTitle: "पास जांचना",
    accessCheckCompleteTitle: "पास जांच पूर्ण",
    accessCheckCompleteMessage: "पास जांच पूरी हो गई है। तारों की रोशनी का प्रवाह पढ़ा जा रहा है।",
    accessCheckFailTitleTransient: "कृपया थोड़ी देर बाद फिर कोशिश करें",
    accessCheckFailTitle: "पास जांच विफल",
    errorText: {
      INPUT_MISSING: "वैदिक परामर्श के लिए आवश्यक कुछ जानकारी गायब है। कृपया अपनी जन्म तिथि, लिंग और जन्म समय की दोबारा जांच करें।",
      BIRTH_TIME_MISSING: "वैदिक ज्योतिष में जन्म समय महत्वपूर्ण है। कृपया इसे दर्ज करें या 'जन्म समय अज्ञात' चुनें।",
      CUSTOM_QUESTION_MISSING: "यदि आपने सीधे पूछना चुना है, तो कृपया यह भी लिखें कि आप अभी सबसे अधिक क्या जानना चाहते हैं।",
      BIRTH_PLACE_INVALID: "लग्न और भाव गणना के लिए जन्म स्थान के निर्देशांक आवश्यक हैं। कृपया शहर का नाम फिर से जांचें।",
      LOGIN_REQUIRED: "इस परामर्श के लिए साइन इन आवश्यक है। कृपया साइन इन करके फिर से प्रयास करें।",
      PAYMENT_REQUIRED: "इस परामर्श के लिए पास या भुगतान आवश्यक है। कृपया भुगतान जानकारी जांचें।",
      PAYMENT_VERIFY_FAILED: "भुगतान जानकारी सत्यापित नहीं हो सकी। आपके भुगतान या पास से कुछ भी नहीं काटा गया।",
      PAYMENT_CANCELLED: "भुगतान रद्द कर दिया गया। जब आवश्यक हो आप फिर से प्रयास कर सकते हैं।",
      PREPARE_FAILED: "वैदिक परामर्श तैयार करते समय समस्या हुई। आपके भुगतान या पास से कुछ भी नहीं काटा गया।",
      CHART_CALCULATION_FAILED: "वैदिक चार्ट की गणना करते समय समस्या हुई। कृपया अपनी दर्ज की गई जन्म जानकारी दोबारा जांचें।",
      LLM_FAILED: "विशेषज्ञ परामर्श पाठ बनाते समय समस्या हुई। यदि कोई कटौती हुई है तो वह स्वतः बहाल हो जाएगी।",
      NETWORK_ERROR: "कनेक्शन अस्थिर है। कृपया थोड़ी देर बाद फिर कोशिश करें।",
      SERVER_ERROR: "वैदिक परामर्श तैयार करते समय समस्या हुई। आपके भुगतान या पास से कुछ भी नहीं काटा गया।",
      GENERATION_TIMEOUT: "परामर्श बनाने में सामान्य से अधिक समय लग रहा है। पेज बंद न करें, थोड़ी देर बाद फिर कोशिश करें।",
      TEMPORARY_UNAVAILABLE: "अभी कनेक्शन अस्थायी रूप से अस्थिर है। आपका पास पूरी तरह सुरक्षित है, कृपया थोड़ी देर बाद फिर कोशिश करें।",
    },
    cosmosStages: [
      { label: "आपके जन्म निर्देशांकों को ब्रह्मांडीय समय में बदला जा रहा है", sub: "जूलियन दिवस की गणना" },
      { label: "सूर्य के मार्ग का पता लगाया जा रहा है", sub: "सूर्य क्रांतिवृत्त गणना" },
      { label: "चंद्रमा का नक्षत्र खोजा जा रहा है", sub: "चंद्र नक्षत्र" },
      { label: "लग्न स्थापित किया जा रहा है", sub: "लग्न गणना" },
      { label: "दशा का प्रवाह पढ़ा जा रहा है", sub: "विंशोत्तरी दशा" },
      { label: "ज्योतिष व्याख्या पूरी की जा रही है", sub: "AI विवरण तैयार किया जा रहा है" },
    ],
    cosmosFooter: "ग्रह अपनी जगह ले रहे हैं",
    cosmosFallbackText: "राशि चार्ट संरेखित किया जा रहा है...",
    chartDetailAriaLabel: "वैदिक गणना विवरण",
    chartDetailHeading: "वैदिक गणना विवरण",
    noLagnaNotice: "जन्म समय न होने के कारण लग्न और भाव की मनमानी गणना नहीं की गई। मुख्य रूप से चंद्र, राशि, नक्षत्र और विंशोत्तरी दशा के आधार पर पढ़ें।",
    lagnaBilingual: "लग्न, Lagna",
    moonNakshatraBilingual: "चंद्र नक्षत्र, Moon Nakshatra",
    currentDashaBilingual: "वर्तमान दशा, Current Dasha",
    lagnaRashiLabel: "लग्न राशि",
    lagnaDegreeLabel: "लग्न अंश",
    lagnaNakshatraLabel: "लग्न नक्षत्र",
    lagnaPadaLabel: "लग्न पाद",
    lagnaFirstHouseLabel: "लग्न आधारित प्रथम भाव प्रारंभ राशि",
    birthTimeRequiredFallback: "जन्म समय आवश्यक",
    rashiBilingual: "राशि, Rashi",
    grahaBilingual: "ग्रह, Graha",
    bhavaBilingual: "भाव, Bhava",
    nakshatraBilingual: "नक्षत्र, Nakshatra",
    dashaBilingual: "दशा, Dasha",
    vimshottariBilingual: "विंशोत्तरी दशा, Vimshottari Dasha",
    grahaLabel: { Sun: "सूर्य", Moon: "चंद्र", Mars: "मंगल", Mercury: "बुध", Jupiter: "गुरु", Venus: "शुक्र", Saturn: "शनि", Rahu: "राहु", Ketu: "केतु" },
    planetTableHeaders: { graha: "ग्रह", rashi: "राशि", degree: "अंश", bhava: "भाव", nakshatra: "नक्षत्र", pada: "पाद", keywords: "व्याख्या कीवर्ड" },
    bhavaTableHeaders: { bhava: "भाव", rashi: "राशि", meaning: "अर्थ", graha: "ग्रह" },
    bhavaRequiresBirthInfo: "सटीक भाव गणना के लिए जन्म समय और जन्म स्थान के निर्देशांक आवश्यक हैं।",
    moonNakshatraDetailPrefix: "चंद्र नक्षत्र: ",
    dashaTableHeaders: { lord: "स्वामी", start: "प्रारंभ", end: "समाप्ति", duration: "अवधि" },
    yearsSuffix: (n) => `${n} वर्ष`,
    padaSuffix: (n) => `${n} पाद`,
    dashFallback: "-",
    jyotishEyebrow: "Jyotish · ज्योतिष वैदिक ज्योतिषशास्त्र",
    resultTitle: (name) => `${name} का सितारा मानचित्र`,
    defaultConsultantName: "परामर्शी",
    pdfButtonAriaLabel: "PDF के रूप में सहेजें",
    pdfButtonSaving: "सहेजा जा रहा है…",
    pdfButtonIdle: "PDF सहेजें",
    chartSummaryAriaLabel: "लग्न·राशि·नक्षत्र सारांश",
    lagnaMedallionLabel: "लग्न",
    rashiMedallionLabel: "राशि",
    nakshatraMedallionLabel: "नक्षत्र",
    dashaCardLabelKo: "दशा",
    mahadashaSuffix: " महादशा",
    scoreLabels: { dharma: "धर्म", artha: "अर्थ", kama: "काम", moksha: "मोक्ष" },
    emptyStateHeading: "आपका सितारा मानचित्र शांति से खुलने के लिए तैयार है।",
    emptyStateBody: "हम उस प्रवाह को देखेंगे जहाँ आपके जन्म का क्षण अभी के प्रश्न से मिलता है।",
    pastConsultationLink: "पिछला परामर्श फिर देखें",
    pastConsultationHint: "पूर्ण हो चुके वैदिक परामर्श कभी भी फिर से खोले जा सकते हैं।",
    summaryHeading: "प्रमुख वैदिक संकेतक",
    summaryStrongGrahasLabel: "प्रबल रूप से सक्रिय ग्रह",
    summaryMajorBhavasLabel: "प्रमुख भाव",
    d1SunFallback: "सूर्य का प्रवाह",
    d1RahuFallback: "हम राहु-केतु अक्ष में मौजूद तनाव को भी साथ में देखेंगे।",
    d9VenusFallback: "आंतरिक परिपक्वता",
    d9Body: "हम रिश्तों, प्रतिबद्धताओं और लंबे समय तक टिकने वाले निर्णयों की बनावट को साथ में देखेंगे।",
    userQuestionLabel: "मेरा प्रश्न",
    legacySectionExtraTitle: (n) => `तारों की रोशनी की सलाह ${n}`,
  },
  es: {
    heroTitle: "Consulta con experto en astrología védica",
    heroLead: "Sobre el flujo de los nakshatras y los planetas, y el ritmo de la dasha, tu pregunta de hoy se ilumina en silencio.",
    heroPrice: "₩30.000",
    heroDashaBadge: "Flujo de dasha",
    formPanelHeading: "Información para abrir tu mapa estelar",
    loadProfileButtonAriaLabel: "Cargar datos de nacimiento desde la tarjeta de perfil",
    loadProfileButtonLabel: "Cargar desde la tarjeta de perfil",
    nameLabel: "Nombre o apodo",
    namePlaceholder: "Nombre para usar en la consulta",
    genderLabel: "Género",
    genderPlaceholder: "Selecciona",
    genderFemale: "Femenino",
    genderMale: "Masculino",
    genderUnknown: "Prefiero no decirlo",
    birthDateLabel: "Fecha de nacimiento",
    calendarLabel: "Calendario",
    calendarSolar: "Solar",
    calendarLunar: "Lunar",
    birthTimeLabel: "Hora de nacimiento",
    timezoneLabel: "Zona horaria",
    timezoneOptionLabel: {
      "Asia/Seoul": "Corea (KST +9)",
      "Asia/Shanghai": "China/Singapur (CST +8)",
      "Asia/Kolkata": "India (IST +5:30)",
      "Europe/London": "Reino Unido (GMT 0)",
      "America/New_York": "Este de EE. UU. (EST -5)",
      "America/Los_Angeles": "Oeste de EE. UU. (PST -8)",
    },
    birthTimeUnknownLabel: "Hora de nacimiento desconocida",
    birthTimeUnknownNotice: "Si la hora de nacimiento es incierta, se reduce la precisión del lagna y la lectura se centra en la Luna y el flujo del nakshatra.",
    birthPlaceLabel: "Lugar de nacimiento",
    birthPlacePlaceholder: "Ej.: Seúl, Tokio, Nueva York",
    geoCheckingLabel: "Comprobando ubicación...",
    geoConfirmedLabel: (name) => `✓ ${name}`,
    geoHintLabel: "Escribe tu lugar de nacimiento para alinear las coordenadas estelares.",
    focusAreaLabel: "Tema a iluminar ahora",
    focusOptionLabel: {
      overall: "Flujo general",
      love: "Amor",
      money: "Dinero",
      career: "Trabajo y carrera",
      health: "Salud",
      relationship: "Relaciones",
      spirituality: "Espiritualidad",
      custom: "Preguntar directamente",
    },
    questionLabel: "Pregunta libre",
    questionPlaceholder: "Escribe con naturalidad sobre lo que más te intriga ahora mismo.",
    submitButtonIdle: "Obtener una consulta con experto en astrología védica",
    pricePrefix: "Precio de la consulta ",
    phaseAccess: "Comprobando tu pase...",
    phasePayment: "Comprobando la información de pago...",
    phaseStart: "Analizando tu carta...",
    geocodeFallbackNotice: "No se encontró ese lugar de nacimiento, así que calculamos con Seúl como referencia.",
    geocodeErrorNotice: "La búsqueda de ubicación está temporalmente inestable, así que calculamos con Seúl como referencia.",
    geocodeFallbackName: "Seúl (predeterminado)",
    retryAccessNotice: "La conexión está temporalmente inestable. Volviendo a comprobar tu pase.",
    sessionPendingNotice: "Leyendo la luz de los nakshatras. Espera un momento, por favor.",
    gateReason: "Consulta con experto en astrología védica",
    accessCheckGateTitle: "Comprobando el pase",
    accessCheckCompleteTitle: "Comprobación de pase completada",
    accessCheckCompleteMessage: "La comprobación del pase ha terminado. Leyendo el flujo de la luz estelar.",
    accessCheckFailTitleTransient: "Inténtalo de nuevo en un momento",
    accessCheckFailTitle: "Fallo en la comprobación del pase",
    errorText: {
      INPUT_MISSING: "Falta información necesaria para la consulta védica. Vuelve a revisar tu fecha de nacimiento, género y hora de nacimiento.",
      BIRTH_TIME_MISSING: "La hora de nacimiento es importante en la astrología védica. Ingrésala o selecciona 'hora de nacimiento desconocida'.",
      CUSTOM_QUESTION_MISSING: "Si elegiste preguntar directamente, escribe también lo que más te intriga ahora mismo.",
      BIRTH_PLACE_INVALID: "Los cálculos de lagna y bhava necesitan las coordenadas del lugar de nacimiento. Vuelve a revisar el nombre de la ciudad.",
      LOGIN_REQUIRED: "Esta consulta requiere iniciar sesión. Inicia sesión e inténtalo de nuevo.",
      PAYMENT_REQUIRED: "Esta consulta requiere un pase o pago. Revisa la información de pago.",
      PAYMENT_VERIFY_FAILED: "No se pudo verificar la información de pago. No se dedujo nada de tu pago ni de tu pase.",
      PAYMENT_CANCELLED: "El pago fue cancelado. Puedes volver a intentarlo cuando quieras.",
      PREPARE_FAILED: "Ocurrió un problema al preparar la consulta védica. No se dedujo nada de tu pago ni de tu pase.",
      CHART_CALCULATION_FAILED: "Ocurrió un problema al calcular la carta védica. Vuelve a revisar los datos de nacimiento ingresados.",
      LLM_FAILED: "Ocurrió un problema al generar la lectura del experto. Si hubo alguna deducción, se restaurará automáticamente.",
      NETWORK_ERROR: "La conexión es inestable. Inténtalo de nuevo en un momento.",
      SERVER_ERROR: "Ocurrió un problema al preparar la consulta védica. No se dedujo nada de tu pago ni de tu pase.",
      GENERATION_TIMEOUT: "La generación de la lectura está tardando más de lo habitual. No cierres la página, inténtalo de nuevo en un momento.",
      TEMPORARY_UNAVAILABLE: "La conexión está temporalmente inestable ahora mismo. Tu pase se conserva intacto, inténtalo de nuevo en un momento.",
    },
    cosmosStages: [
      { label: "Convirtiendo tus coordenadas de nacimiento en tiempo cósmico...", sub: "Calculando el día juliano" },
      { label: "Rastreando el recorrido del Sol...", sub: "Calculando la longitud eclíptica de Surya" },
      { label: "Encontrando el nakshatra de la Luna...", sub: "Chandra Nakshatra" },
      { label: "Estableciendo el ascendente...", sub: "Calculando el Lagna" },
      { label: "Leyendo el flujo de la dasha...", sub: "Vimshottari Dasha" },
      { label: "Completando la interpretación jyotish...", sub: "Generando la narrativa con IA" },
    ],
    cosmosFooter: "Los planetas están tomando su posición",
    cosmosFallbackText: "Alineando la carta rashi...",
    chartDetailAriaLabel: "Detalles del cálculo védico",
    chartDetailHeading: "Detalles del cálculo védico",
    noLagnaNotice: "No se indicó la hora de nacimiento, así que el lagna y el bhava no se calcularon arbitrariamente. Lee principalmente según la Luna, el rashi, el nakshatra y la dasha Vimshottari.",
    lagnaBilingual: "Lagna, Ascendente",
    moonNakshatraBilingual: "Nakshatra de la Luna, Moon Nakshatra",
    currentDashaBilingual: "Dasha actual, Current Dasha",
    lagnaRashiLabel: "Rashi del lagna",
    lagnaDegreeLabel: "Grado del lagna",
    lagnaNakshatraLabel: "Nakshatra del lagna",
    lagnaPadaLabel: "Pada del lagna",
    lagnaFirstHouseLabel: "Rashi de inicio de la casa 1 según el lagna",
    birthTimeRequiredFallback: "Se necesita hora de nacimiento",
    rashiBilingual: "Rashi",
    grahaBilingual: "Graha",
    bhavaBilingual: "Bhava",
    nakshatraBilingual: "Nakshatra",
    dashaBilingual: "Dasha",
    vimshottariBilingual: "Dasha Vimshottari",
    grahaLabel: { Sun: "Sol", Moon: "Luna", Mars: "Marte", Mercury: "Mercurio", Jupiter: "Júpiter", Venus: "Venus", Saturn: "Saturno", Rahu: "Rahu", Ketu: "Ketu" },
    planetTableHeaders: { graha: "Graha", rashi: "Rashi", degree: "Grado", bhava: "Bhava", nakshatra: "Nakshatra", pada: "Pada", keywords: "Palabras clave" },
    bhavaTableHeaders: { bhava: "Bhava", rashi: "Rashi", meaning: "Significado", graha: "Graha" },
    bhavaRequiresBirthInfo: "El cálculo preciso del bhava necesita la hora de nacimiento y las coordenadas del lugar de nacimiento.",
    moonNakshatraDetailPrefix: "Nakshatra de la Luna: ",
    dashaTableHeaders: { lord: "Señor", start: "Inicio", end: "Fin", duration: "Duración" },
    yearsSuffix: (n) => `${n} años`,
    padaSuffix: (n) => `Pada ${n}`,
    dashFallback: "-",
    jyotishEyebrow: "Jyotish · Astrología védica",
    resultTitle: (name) => `Mapa estelar de ${name}`,
    defaultConsultantName: "Consultante",
    pdfButtonAriaLabel: "Guardar como PDF",
    pdfButtonSaving: "Guardando...",
    pdfButtonIdle: "Guardar PDF",
    chartSummaryAriaLabel: "Resumen de lagna, rashi y nakshatra",
    lagnaMedallionLabel: "Lagna",
    rashiMedallionLabel: "Rashi",
    nakshatraMedallionLabel: "Nakshatra",
    dashaCardLabelKo: "Dasha",
    mahadashaSuffix: " Mahadasha",
    scoreLabels: { dharma: "Dharma", artha: "Artha", kama: "Kama", moksha: "Moksha" },
    emptyStateHeading: "Tu mapa estelar está listo para abrirse en silencio.",
    emptyStateBody: "Veremos el flujo donde el momento de tu nacimiento se encuentra con la pregunta de ahora.",
    pastConsultationLink: "Ver consulta anterior",
    pastConsultationHint: "Las lecturas védicas completadas se pueden reabrir en cualquier momento.",
    summaryHeading: "Indicadores védicos clave",
    summaryStrongGrahasLabel: "Grahas con actividad fuerte",
    summaryMajorBhavasLabel: "Bhavas principales",
    d1SunFallback: "El flujo del Sol",
    d1RahuFallback: "También veremos juntos la tensión que se mantiene en el eje Rahu-Ketu.",
    d9VenusFallback: "Madurez interior",
    d9Body: "Veremos juntos la textura de las relaciones, los compromisos y las decisiones duraderas.",
    userQuestionLabel: "Mi pregunta",
    legacySectionExtraTitle: (n) => `Guía de luz estelar ${n}`,
  },
  fr: {
    heroTitle: "Consultation avec un expert en astrologie védique",
    heroLead: "Sur le flux des nakshatras et des planètes, et le rythme de la dasha, votre question d'aujourd'hui s'éclaire tranquillement.",
    heroPrice: "30 000 ₩",
    heroDashaBadge: "Flux de dasha",
    formPanelHeading: "Informations pour ouvrir votre carte des étoiles",
    loadProfileButtonAriaLabel: "Charger les informations de naissance depuis la fiche de profil",
    loadProfileButtonLabel: "Charger depuis la fiche de profil",
    nameLabel: "Nom ou surnom",
    namePlaceholder: "Nom à utiliser pendant la consultation",
    genderLabel: "Genre",
    genderPlaceholder: "Sélectionner",
    genderFemale: "Femme",
    genderMale: "Homme",
    genderUnknown: "Préfère ne pas dire",
    birthDateLabel: "Date de naissance",
    calendarLabel: "Calendrier",
    calendarSolar: "Solaire",
    calendarLunar: "Lunaire",
    birthTimeLabel: "Heure de naissance",
    timezoneLabel: "Fuseau horaire",
    timezoneOptionLabel: {
      "Asia/Seoul": "Corée (KST +9)",
      "Asia/Shanghai": "Chine/Singapour (CST +8)",
      "Asia/Kolkata": "Inde (IST +5:30)",
      "Europe/London": "Royaume-Uni (GMT 0)",
      "America/New_York": "Est des États-Unis (EST -5)",
      "America/Los_Angeles": "Ouest des États-Unis (PST -8)",
    },
    birthTimeUnknownLabel: "Heure de naissance inconnue",
    birthTimeUnknownNotice: "Si l'heure de naissance est incertaine, la précision du lagna est réduite et la lecture se concentre sur la Lune et le flux du nakshatra.",
    birthPlaceLabel: "Lieu de naissance",
    birthPlacePlaceholder: "Ex. : Séoul, Tokyo, New York",
    geoCheckingLabel: "Vérification de la position...",
    geoConfirmedLabel: (name) => `✓ ${name}`,
    geoHintLabel: "Indiquez votre lieu de naissance pour aligner les coordonnées stellaires de référence.",
    focusAreaLabel: "Sujet à éclairer maintenant",
    focusOptionLabel: {
      overall: "Flux général",
      love: "Amour",
      money: "Argent",
      career: "Travail et carrière",
      health: "Santé",
      relationship: "Relations",
      spirituality: "Spiritualité",
      custom: "Demander directement",
    },
    questionLabel: "Question libre",
    questionPlaceholder: "Écrivez naturellement ce qui vous intrigue le plus en ce moment.",
    submitButtonIdle: "Obtenir une consultation avec un expert en astrologie védique",
    pricePrefix: "Prix de la consultation ",
    phaseAccess: "Vérification de votre pass...",
    phasePayment: "Vérification des informations de paiement...",
    phaseStart: "Analyse de votre carte du ciel...",
    geocodeFallbackNotice: "Ce lieu de naissance n'a pas été trouvé, nous calculons donc en référence à Séoul.",
    geocodeErrorNotice: "La recherche de position est momentanément instable, nous calculons donc en référence à Séoul.",
    geocodeFallbackName: "Séoul (par défaut)",
    retryAccessNotice: "La connexion est momentanément instable. Nouvelle vérification de votre pass.",
    sessionPendingNotice: "Lecture de la lumière des nakshatras. Veuillez patienter un instant.",
    gateReason: "Consultation avec un expert en astrologie védique",
    accessCheckGateTitle: "Vérification du pass",
    accessCheckCompleteTitle: "Vérification du pass terminée",
    accessCheckCompleteMessage: "La vérification du pass est terminée. Lecture du flux de la lumière stellaire.",
    accessCheckFailTitleTransient: "Réessayez dans un instant",
    accessCheckFailTitle: "Échec de la vérification du pass",
    errorText: {
      INPUT_MISSING: "Certaines informations nécessaires à la consultation védique sont manquantes. Vérifiez à nouveau votre date de naissance, votre genre et votre heure de naissance.",
      BIRTH_TIME_MISSING: "L'heure de naissance est importante en astrologie védique. Saisissez-la ou sélectionnez « heure de naissance inconnue ».",
      CUSTOM_QUESTION_MISSING: "Si vous avez choisi de poser une question directement, écrivez aussi ce qui vous intrigue le plus en ce moment.",
      BIRTH_PLACE_INVALID: "Les calculs du lagna et du bhava nécessitent les coordonnées du lieu de naissance. Vérifiez à nouveau le nom de la ville.",
      LOGIN_REQUIRED: "Cette consultation nécessite une connexion. Connectez-vous et réessayez.",
      PAYMENT_REQUIRED: "Cette consultation nécessite un pass ou un paiement. Vérifiez les informations de paiement.",
      PAYMENT_VERIFY_FAILED: "Impossible de vérifier les informations de paiement. Rien n'a été déduit de votre paiement ni de votre pass.",
      PAYMENT_CANCELLED: "Le paiement a été annulé. Vous pouvez réessayer quand vous le souhaitez.",
      PREPARE_FAILED: "Un problème est survenu lors de la préparation de la consultation védique. Rien n'a été déduit de votre paiement ni de votre pass.",
      CHART_CALCULATION_FAILED: "Un problème est survenu lors du calcul de la carte védique. Vérifiez à nouveau les informations de naissance saisies.",
      LLM_FAILED: "Un problème est survenu lors de la génération de la lecture experte. Toute déduction sera automatiquement restaurée.",
      NETWORK_ERROR: "La connexion est instable. Réessayez dans un instant.",
      SERVER_ERROR: "Un problème est survenu lors de la préparation de la consultation védique. Rien n'a été déduit de votre paiement ni de votre pass.",
      GENERATION_TIMEOUT: "La génération de la lecture prend plus de temps que d'habitude. Ne fermez pas la page, réessayez dans un instant.",
      TEMPORARY_UNAVAILABLE: "La connexion est momentanément instable en ce moment. Votre pass est intégralement conservé, réessayez dans un instant.",
    },
    cosmosStages: [
      { label: "Conversion de vos coordonnées de naissance en temps cosmique...", sub: "Calcul du jour julien" },
      { label: "Traçage de la trajectoire du Soleil...", sub: "Calcul de la longitude écliptique de Surya" },
      { label: "Recherche du nakshatra de la Lune...", sub: "Chandra Nakshatra" },
      { label: "Établissement de l'ascendant...", sub: "Calcul du Lagna" },
      { label: "Lecture du flux de la dasha...", sub: "Vimshottari Dasha" },
      { label: "Finalisation de l'interprétation jyotish...", sub: "Génération du récit par IA" },
    ],
    cosmosFooter: "Les planètes se mettent en position",
    cosmosFallbackText: "Alignement de la carte rashi...",
    chartDetailAriaLabel: "Détails du calcul védique",
    chartDetailHeading: "Détails du calcul védique",
    noLagnaNotice: "Aucune heure de naissance n'a été fournie, le lagna et le bhava n'ont donc pas été calculés arbitrairement. Lisez principalement selon la Lune, le rashi, le nakshatra et la dasha Vimshottari.",
    lagnaBilingual: "Lagna, Ascendant",
    moonNakshatraBilingual: "Nakshatra de la Lune, Moon Nakshatra",
    currentDashaBilingual: "Dasha actuelle, Current Dasha",
    lagnaRashiLabel: "Rashi du lagna",
    lagnaDegreeLabel: "Degré du lagna",
    lagnaNakshatraLabel: "Nakshatra du lagna",
    lagnaPadaLabel: "Pada du lagna",
    lagnaFirstHouseLabel: "Rashi de départ de la maison 1 selon le lagna",
    birthTimeRequiredFallback: "Heure de naissance requise",
    rashiBilingual: "Rashi",
    grahaBilingual: "Graha",
    bhavaBilingual: "Bhava",
    nakshatraBilingual: "Nakshatra",
    dashaBilingual: "Dasha",
    vimshottariBilingual: "Dasha Vimshottari",
    grahaLabel: { Sun: "Soleil", Moon: "Lune", Mars: "Mars", Mercury: "Mercure", Jupiter: "Jupiter", Venus: "Vénus", Saturn: "Saturne", Rahu: "Rahu", Ketu: "Ketu" },
    planetTableHeaders: { graha: "Graha", rashi: "Rashi", degree: "Degré", bhava: "Bhava", nakshatra: "Nakshatra", pada: "Pada", keywords: "Mots-clés" },
    bhavaTableHeaders: { bhava: "Bhava", rashi: "Rashi", meaning: "Signification", graha: "Graha" },
    bhavaRequiresBirthInfo: "Un calcul précis du bhava nécessite l'heure de naissance et les coordonnées du lieu de naissance.",
    moonNakshatraDetailPrefix: "Nakshatra de la Lune : ",
    dashaTableHeaders: { lord: "Maître", start: "Début", end: "Fin", duration: "Durée" },
    yearsSuffix: (n) => `${n} ans`,
    padaSuffix: (n) => `Pada ${n}`,
    dashFallback: "-",
    jyotishEyebrow: "Jyotish · Astrologie védique",
    resultTitle: (name) => `Carte des étoiles de ${name}`,
    defaultConsultantName: "Consultant(e)",
    pdfButtonAriaLabel: "Enregistrer en PDF",
    pdfButtonSaving: "Enregistrement...",
    pdfButtonIdle: "Enregistrer le PDF",
    chartSummaryAriaLabel: "Résumé lagna, rashi, nakshatra",
    lagnaMedallionLabel: "Lagna",
    rashiMedallionLabel: "Rashi",
    nakshatraMedallionLabel: "Nakshatra",
    dashaCardLabelKo: "Dasha",
    mahadashaSuffix: " Mahadasha",
    scoreLabels: { dharma: "Dharma", artha: "Artha", kama: "Kama", moksha: "Moksha" },
    emptyStateHeading: "Votre carte des étoiles est prête à s'ouvrir tranquillement.",
    emptyStateBody: "Nous observerons le flux là où le moment de votre naissance rencontre la question d'aujourd'hui.",
    pastConsultationLink: "Revoir une consultation passée",
    pastConsultationHint: "Les lectures védiques terminées peuvent être rouvertes à tout moment.",
    summaryHeading: "Indicateurs védiques clés",
    summaryStrongGrahasLabel: "Grahas fortement actifs",
    summaryMajorBhavasLabel: "Bhavas majeurs",
    d1SunFallback: "Le flux du Soleil",
    d1RahuFallback: "Nous observerons aussi ensemble la tension présente sur l'axe Rahu-Ketu.",
    d9VenusFallback: "Maturité intérieure",
    d9Body: "Nous observerons ensemble la texture des relations, des engagements et des choix durables.",
    userQuestionLabel: "Ma question",
    legacySectionExtraTitle: (n) => `Conseil de lumière stellaire ${n}`,
  },
  de: {
    heroTitle: "Beratung mit einem Experten für vedische Astrologie",
    heroLead: "Über den Fluss der Nakshatras und Planeten, im Rhythmus der Dasha, wird Ihre heutige Frage still beleuchtet.",
    heroPrice: "30.000 ₩",
    heroDashaBadge: "Dasha-Fluss",
    formPanelHeading: "Informationen, um Ihre Sternenkarte zu öffnen",
    loadProfileButtonAriaLabel: "Geburtsinformationen von der Profilkarte laden",
    loadProfileButtonLabel: "Von der Profilkarte laden",
    nameLabel: "Name oder Spitzname",
    namePlaceholder: "Name für die Beratung",
    genderLabel: "Geschlecht",
    genderPlaceholder: "Auswählen",
    genderFemale: "Weiblich",
    genderMale: "Männlich",
    genderUnknown: "Keine Angabe",
    birthDateLabel: "Geburtsdatum",
    calendarLabel: "Kalenderbasis",
    calendarSolar: "Sonnenkalender",
    calendarLunar: "Mondkalender",
    birthTimeLabel: "Geburtszeit",
    timezoneLabel: "Zeitzone",
    timezoneOptionLabel: {
      "Asia/Seoul": "Korea (KST +9)",
      "Asia/Shanghai": "China/Singapur (CST +8)",
      "Asia/Kolkata": "Indien (IST +5:30)",
      "Europe/London": "Großbritannien (GMT 0)",
      "America/New_York": "US-Ostküste (EST -5)",
      "America/Los_Angeles": "US-Westküste (PST -8)",
    },
    birthTimeUnknownLabel: "Geburtszeit unbekannt",
    birthTimeUnknownNotice: "Wenn die Geburtszeit unsicher ist, wird die Genauigkeit des Lagna verringert und die Lesung konzentriert sich stattdessen auf Mond und Nakshatra-Fluss.",
    birthPlaceLabel: "Geburtsort",
    birthPlacePlaceholder: "z. B. Seoul, Tokio, New York",
    geoCheckingLabel: "Standort wird geprüft...",
    geoConfirmedLabel: (name) => `✓ ${name}`,
    geoHintLabel: "Geben Sie Ihren Geburtsort ein, um die Sternkoordinaten abzugleichen.",
    focusAreaLabel: "Thema, das jetzt beleuchtet werden soll",
    focusOptionLabel: {
      overall: "Gesamtfluss",
      love: "Liebe",
      money: "Geld",
      career: "Arbeit & Karriere",
      health: "Gesundheit",
      relationship: "Beziehungen",
      spirituality: "Spiritualität",
      custom: "Direkt fragen",
    },
    questionLabel: "Freie Frage",
    questionPlaceholder: "Schreiben Sie ganz natürlich, was Sie gerade am meisten interessiert.",
    submitButtonIdle: "Vedische AI-Expertenberatung erhalten",
    pricePrefix: "Beratungspreis ",
    phaseAccess: "Ihr Guthaben wird geprüft...",
    phasePayment: "Zahlungsinformationen werden geprüft...",
    phaseStart: "Ihre Karte wird analysiert...",
    geocodeFallbackNotice: "Dieser Geburtsort wurde nicht gefunden, daher berechnen wir mit Seoul als Referenz.",
    geocodeErrorNotice: "Die Standortsuche ist kurzzeitig instabil, daher berechnen wir mit Seoul als Referenz.",
    geocodeFallbackName: "Seoul (Standard)",
    retryAccessNotice: "Die Verbindung ist kurzzeitig instabil. Ihr Guthaben wird erneut geprüft.",
    sessionPendingNotice: "Das Licht der Nakshatras wird gelesen. Bitte warten Sie einen Moment.",
    gateReason: "Beratung mit einem Experten für vedische Astrologie",
    accessCheckGateTitle: "Guthaben wird geprüft",
    accessCheckCompleteTitle: "Guthabenprüfung abgeschlossen",
    accessCheckCompleteMessage: "Die Guthabenprüfung ist abgeschlossen. Der Fluss des Sternenlichts wird gelesen.",
    accessCheckFailTitleTransient: "Bitte versuchen Sie es gleich noch einmal",
    accessCheckFailTitle: "Guthabenprüfung fehlgeschlagen",
    errorText: {
      INPUT_MISSING: "Für die vedische Beratung fehlen einige Informationen. Bitte überprüfen Sie Geburtsdatum, Geschlecht und Geburtszeit noch einmal.",
      BIRTH_TIME_MISSING: "Die Geburtszeit ist in der vedischen Astrologie wichtig. Bitte geben Sie sie ein oder wählen Sie „Geburtszeit unbekannt“.",
      CUSTOM_QUESTION_MISSING: "Wenn Sie sich für eine direkte Frage entschieden haben, schreiben Sie bitte auch, was Sie gerade am meisten interessiert.",
      BIRTH_PLACE_INVALID: "Für die Lagna- und Bhava-Berechnung werden die Koordinaten des Geburtsorts benötigt. Bitte überprüfen Sie den Stadtnamen noch einmal.",
      LOGIN_REQUIRED: "Für diese Beratung ist eine Anmeldung erforderlich. Bitte melden Sie sich an und versuchen Sie es erneut.",
      PAYMENT_REQUIRED: "Für diese Beratung ist ein Guthaben oder eine Zahlung erforderlich. Bitte überprüfen Sie die Zahlungsinformationen.",
      PAYMENT_VERIFY_FAILED: "Die Zahlungsinformationen konnten nicht überprüft werden. Es wurde nichts von Ihrer Zahlung oder Ihrem Guthaben abgezogen.",
      PAYMENT_CANCELLED: "Die Zahlung wurde abgebrochen. Sie können es jederzeit erneut versuchen, wenn nötig.",
      PREPARE_FAILED: "Bei der Vorbereitung der vedischen Beratung ist ein Problem aufgetreten. Es wurde nichts von Ihrer Zahlung oder Ihrem Guthaben abgezogen.",
      CHART_CALCULATION_FAILED: "Bei der Berechnung der vedischen Karte ist ein Problem aufgetreten. Bitte überprüfen Sie die eingegebenen Geburtsinformationen noch einmal.",
      LLM_FAILED: "Bei der Erstellung der Experten-Lesung ist ein Problem aufgetreten. Ein etwaiger Abzug wird automatisch wiederhergestellt.",
      NETWORK_ERROR: "Die Verbindung ist instabil. Bitte versuchen Sie es gleich noch einmal.",
      SERVER_ERROR: "Bei der Vorbereitung der vedischen Beratung ist ein Problem aufgetreten. Es wurde nichts von Ihrer Zahlung oder Ihrem Guthaben abgezogen.",
      GENERATION_TIMEOUT: "Die Erstellung der Lesung dauert länger als gewöhnlich. Bitte schließen Sie die Seite nicht und versuchen Sie es gleich noch einmal.",
      TEMPORARY_UNAVAILABLE: "Die Verbindung ist gerade kurzzeitig instabil. Ihr Guthaben bleibt vollständig erhalten, bitte versuchen Sie es gleich noch einmal.",
    },
    cosmosStages: [
      { label: "Ihre Geburtskoordinaten werden in kosmische Zeit umgerechnet...", sub: "Berechnung des Julianischen Tages" },
      { label: "Die Bahn der Sonne wird verfolgt...", sub: "Berechnung der Surya-Ekliptiklänge" },
      { label: "Das Nakshatra des Mondes wird gesucht...", sub: "Chandra Nakshatra" },
      { label: "Der Aszendent wird errichtet...", sub: "Berechnung des Lagna" },
      { label: "Der Fluss der Dasha wird gelesen...", sub: "Vimshottari Dasha" },
      { label: "Die Jyotish-Deutung wird vervollständigt...", sub: "KI-Erzählung wird erstellt" },
    ],
    cosmosFooter: "Die Planeten nehmen ihre Positionen ein",
    cosmosFallbackText: "Die Rashi-Karte wird ausgerichtet...",
    chartDetailAriaLabel: "Details der vedischen Berechnung",
    chartDetailHeading: "Details der vedischen Berechnung",
    noLagnaNotice: "Da keine Geburtszeit angegeben wurde, wurden Lagna und Bhava nicht willkürlich berechnet. Lesen Sie hauptsächlich anhand von Mond, Rashi, Nakshatra und Vimshottari-Dasha.",
    lagnaBilingual: "Lagna, Aszendent",
    moonNakshatraBilingual: "Mond-Nakshatra, Moon Nakshatra",
    currentDashaBilingual: "Aktuelle Dasha, Current Dasha",
    lagnaRashiLabel: "Lagna-Rashi",
    lagnaDegreeLabel: "Lagna-Grad",
    lagnaNakshatraLabel: "Lagna-Nakshatra",
    lagnaPadaLabel: "Lagna-Pada",
    lagnaFirstHouseLabel: "Rashi des ersten Hauses ab Lagna",
    birthTimeRequiredFallback: "Geburtszeit erforderlich",
    rashiBilingual: "Rashi",
    grahaBilingual: "Graha",
    bhavaBilingual: "Bhava",
    nakshatraBilingual: "Nakshatra",
    dashaBilingual: "Dasha",
    vimshottariBilingual: "Vimshottari-Dasha",
    grahaLabel: { Sun: "Sonne", Moon: "Mond", Mars: "Mars", Mercury: "Merkur", Jupiter: "Jupiter", Venus: "Venus", Saturn: "Saturn", Rahu: "Rahu", Ketu: "Ketu" },
    planetTableHeaders: { graha: "Graha", rashi: "Rashi", degree: "Grad", bhava: "Bhava", nakshatra: "Nakshatra", pada: "Pada", keywords: "Deutungsstichworte" },
    bhavaTableHeaders: { bhava: "Bhava", rashi: "Rashi", meaning: "Bedeutung", graha: "Graha" },
    bhavaRequiresBirthInfo: "Eine genaue Bhava-Berechnung erfordert Geburtszeit und Geburtsortkoordinaten.",
    moonNakshatraDetailPrefix: "Mond-Nakshatra: ",
    dashaTableHeaders: { lord: "Herrscher", start: "Beginn", end: "Ende", duration: "Dauer" },
    yearsSuffix: (n) => `${n} Jahre`,
    padaSuffix: (n) => `Pada ${n}`,
    dashFallback: "-",
    jyotishEyebrow: "Jyotish · Vedische Astrologie",
    resultTitle: (name) => `Sternenkarte von ${name}`,
    defaultConsultantName: "Ratsuchende(r)",
    pdfButtonAriaLabel: "Als PDF speichern",
    pdfButtonSaving: "Wird gespeichert...",
    pdfButtonIdle: "PDF speichern",
    chartSummaryAriaLabel: "Zusammenfassung von Lagna, Rashi, Nakshatra",
    lagnaMedallionLabel: "Lagna",
    rashiMedallionLabel: "Rashi",
    nakshatraMedallionLabel: "Nakshatra",
    dashaCardLabelKo: "Dasha",
    mahadashaSuffix: " Mahadasha",
    scoreLabels: { dharma: "Dharma", artha: "Artha", kama: "Kama", moksha: "Moksha" },
    emptyStateHeading: "Ihre Sternenkarte ist bereit, sich still zu öffnen.",
    emptyStateBody: "Wir betrachten den Fluss dort, wo der Moment Ihrer Geburt auf die Frage von heute trifft.",
    pastConsultationLink: "Vergangene Beratung erneut ansehen",
    pastConsultationHint: "Abgeschlossene vedische Lesungen können jederzeit erneut geöffnet werden.",
    summaryHeading: "Wichtige vedische Kennzahlen",
    summaryStrongGrahasLabel: "Stark wirkende Grahas",
    summaryMajorBhavasLabel: "Wichtige Bhavas",
    d1SunFallback: "Der Fluss der Sonne",
    d1RahuFallback: "Wir betrachten auch gemeinsam die Spannung, die auf der Rahu-Ketu-Achse liegt.",
    d9VenusFallback: "Innere Reife",
    d9Body: "Wir betrachten gemeinsam die Beschaffenheit von Beziehungen, Verpflichtungen und dauerhaften Entscheidungen.",
    userQuestionLabel: "Meine Frage",
    legacySectionExtraTitle: (n) => `Sternenlicht-Rat ${n}`,
  },
  nl: {
    heroTitle: "Consult met een Vedische astrologie-expert",
    heroLead: "Boven de stroom van nakshatra's en planeten, en het ritme van de dasha, wordt uw vraag van nu stil verlicht.",
    heroPrice: "₩30.000",
    heroDashaBadge: "Dasha-stroom",
    formPanelHeading: "Informatie om uw sterrenkaart te openen",
    loadProfileButtonAriaLabel: "Geboortegegevens laden vanaf profielkaart",
    loadProfileButtonLabel: "Laden vanaf profielkaart",
    nameLabel: "Naam of bijnaam",
    namePlaceholder: "Naam om te gebruiken tijdens het consult",
    genderLabel: "Geslacht",
    genderPlaceholder: "Selecteer",
    genderFemale: "Vrouw",
    genderMale: "Man",
    genderUnknown: "Liever niet zeggen",
    birthDateLabel: "Geboortedatum",
    calendarLabel: "Kalenderbasis",
    calendarSolar: "Zonnekalender",
    calendarLunar: "Maankalender",
    birthTimeLabel: "Geboortetijd",
    timezoneLabel: "Tijdzone",
    timezoneOptionLabel: {
      "Asia/Seoul": "Korea (KST +9)",
      "Asia/Shanghai": "China/Singapore (CST +8)",
      "Asia/Kolkata": "India (IST +5:30)",
      "Europe/London": "VK (GMT 0)",
      "America/New_York": "Oostkust VS (EST -5)",
      "America/Los_Angeles": "Westkust VS (PST -8)",
    },
    birthTimeUnknownLabel: "Geboortetijd onbekend",
    birthTimeUnknownNotice: "Als de geboortetijd onzeker is, wordt de nauwkeurigheid van de lagna verlaagd en richt de lezing zich vooral op de Maan en de nakshatra-stroom.",
    birthPlaceLabel: "Geboorteplaats",
    birthPlacePlaceholder: "Bijv.: Seoul, Tokio, New York",
    geoCheckingLabel: "Locatie wordt gecontroleerd...",
    geoConfirmedLabel: (name) => `✓ ${name}`,
    geoHintLabel: "Vul uw geboorteplaats in om de sterrencoördinaten uit te lijnen.",
    focusAreaLabel: "Onderwerp dat nu belicht moet worden",
    focusOptionLabel: {
      overall: "Algemene stroom",
      love: "Liefde",
      money: "Geld",
      career: "Werk & carrière",
      health: "Gezondheid",
      relationship: "Relaties",
      spirituality: "Spiritualiteit",
      custom: "Rechtstreeks vragen",
    },
    questionLabel: "Vrije vraag",
    questionPlaceholder: "Schrijf op natuurlijke wijze over wat u nu het meest nieuwsgierig maakt.",
    submitButtonIdle: "Vedisch AI-expertconsult aanvragen",
    pricePrefix: "Consultprijs ",
    phaseAccess: "Uw pas wordt gecontroleerd...",
    phasePayment: "Betalingsgegevens worden gecontroleerd...",
    phaseStart: "Uw horoscoop wordt geanalyseerd...",
    geocodeFallbackNotice: "Die geboorteplaats is niet gevonden, dus we rekenen met Seoul als referentie.",
    geocodeErrorNotice: "Locatiezoeken is tijdelijk instabiel, dus we rekenen met Seoul als referentie.",
    geocodeFallbackName: "Seoul (standaard)",
    retryAccessNotice: "De verbinding is tijdelijk instabiel. Uw pas wordt opnieuw gecontroleerd.",
    sessionPendingNotice: "Het licht van de nakshatra's wordt gelezen. Een ogenblik geduld.",
    gateReason: "Consult met een Vedische astrologie-expert",
    accessCheckGateTitle: "Pas controleren",
    accessCheckCompleteTitle: "Pascontrole voltooid",
    accessCheckCompleteMessage: "De pascontrole is voltooid. De stroom van sterrenlicht wordt gelezen.",
    accessCheckFailTitleTransient: "Probeer het straks opnieuw",
    accessCheckFailTitle: "Pascontrole mislukt",
    errorText: {
      INPUT_MISSING: "Sommige informatie voor het Vedisch consult ontbreekt. Controleer uw geboortedatum, geslacht en geboortetijd nogmaals.",
      BIRTH_TIME_MISSING: "Geboortetijd is belangrijk in de Vedische astrologie. Voer deze in of selecteer 'geboortetijd onbekend'.",
      CUSTOM_QUESTION_MISSING: "Als u ervoor koos rechtstreeks te vragen, schrijf dan ook op wat u nu het meest nieuwsgierig maakt.",
      BIRTH_PLACE_INVALID: "Voor de berekening van lagna en bhava zijn de coördinaten van de geboorteplaats nodig. Controleer de stadsnaam nogmaals.",
      LOGIN_REQUIRED: "Voor dit consult is inloggen vereist. Log in en probeer het opnieuw.",
      PAYMENT_REQUIRED: "Voor dit consult is een pas of betaling vereist. Controleer de betalingsgegevens.",
      PAYMENT_VERIFY_FAILED: "De betalingsgegevens konden niet worden geverifieerd. Er is niets afgetrokken van uw betaling of pas.",
      PAYMENT_CANCELLED: "De betaling is geannuleerd. U kunt het opnieuw proberen wanneer nodig.",
      PREPARE_FAILED: "Er is een probleem opgetreden bij het voorbereiden van het Vedisch consult. Er is niets afgetrokken van uw betaling of pas.",
      CHART_CALCULATION_FAILED: "Er is een probleem opgetreden bij het berekenen van de Vedische horoscoop. Controleer de ingevoerde geboortegegevens nogmaals.",
      LLM_FAILED: "Er is een probleem opgetreden bij het genereren van de expertlezing. Een eventuele aftrek wordt automatisch hersteld.",
      NETWORK_ERROR: "De verbinding is instabiel. Probeer het straks opnieuw.",
      SERVER_ERROR: "Er is een probleem opgetreden bij het voorbereiden van het Vedisch consult. Er is niets afgetrokken van uw betaling of pas.",
      GENERATION_TIMEOUT: "Het genereren van de lezing duurt langer dan gebruikelijk. Sluit de pagina niet en probeer het straks opnieuw.",
      TEMPORARY_UNAVAILABLE: "De verbinding is nu tijdelijk instabiel. Uw pas blijft volledig bewaard, probeer het straks opnieuw.",
    },
    cosmosStages: [
      { label: "Uw geboortecoördinaten worden omgezet naar kosmische tijd...", sub: "Juliaanse dag berekenen" },
      { label: "Het pad van de Zon wordt gevolgd...", sub: "Surya-eclipticalengte berekenen" },
      { label: "De nakshatra van de Maan wordt gezocht...", sub: "Chandra Nakshatra" },
      { label: "De ascendant wordt vastgesteld...", sub: "Lagna berekenen" },
      { label: "De stroom van de dasha wordt gelezen...", sub: "Vimshottari Dasha" },
      { label: "De jyotish-interpretatie wordt afgerond...", sub: "AI-verhaal wordt gegenereerd" },
    ],
    cosmosFooter: "De planeten nemen hun positie in",
    cosmosFallbackText: "De rashi-kaart wordt uitgelijnd...",
    chartDetailAriaLabel: "Details van de Vedische berekening",
    chartDetailHeading: "Details van de Vedische berekening",
    noLagnaNotice: "Er is geen geboortetijd opgegeven, dus lagna en bhava zijn niet willekeurig berekend. Lees vooral op basis van Maan, rashi, nakshatra en Vimshottari-dasha.",
    lagnaBilingual: "Lagna, Ascendant",
    moonNakshatraBilingual: "Maan-nakshatra, Moon Nakshatra",
    currentDashaBilingual: "Huidige dasha, Current Dasha",
    lagnaRashiLabel: "Lagna-rashi",
    lagnaDegreeLabel: "Lagna-graad",
    lagnaNakshatraLabel: "Lagna-nakshatra",
    lagnaPadaLabel: "Lagna-pada",
    lagnaFirstHouseLabel: "Startrashi van het eerste huis vanaf lagna",
    birthTimeRequiredFallback: "Geboortetijd vereist",
    rashiBilingual: "Rashi",
    grahaBilingual: "Graha",
    bhavaBilingual: "Bhava",
    nakshatraBilingual: "Nakshatra",
    dashaBilingual: "Dasha",
    vimshottariBilingual: "Vimshottari-dasha",
    grahaLabel: { Sun: "Zon", Moon: "Maan", Mars: "Mars", Mercury: "Mercurius", Jupiter: "Jupiter", Venus: "Venus", Saturn: "Saturnus", Rahu: "Rahu", Ketu: "Ketu" },
    planetTableHeaders: { graha: "Graha", rashi: "Rashi", degree: "Graad", bhava: "Bhava", nakshatra: "Nakshatra", pada: "Pada", keywords: "Interpretatiewoorden" },
    bhavaTableHeaders: { bhava: "Bhava", rashi: "Rashi", meaning: "Betekenis", graha: "Graha" },
    bhavaRequiresBirthInfo: "Voor een nauwkeurige bhava-berekening zijn geboortetijd en geboorteplaatscoördinaten nodig.",
    moonNakshatraDetailPrefix: "Maan-nakshatra: ",
    dashaTableHeaders: { lord: "Heerser", start: "Start", end: "Einde", duration: "Duur" },
    yearsSuffix: (n) => `${n} jaar`,
    padaSuffix: (n) => `Pada ${n}`,
    dashFallback: "-",
    jyotishEyebrow: "Jyotish · Vedische astrologie",
    resultTitle: (name) => `Sterrenkaart van ${name}`,
    defaultConsultantName: "Cliënt",
    pdfButtonAriaLabel: "Opslaan als PDF",
    pdfButtonSaving: "Bezig met opslaan...",
    pdfButtonIdle: "PDF opslaan",
    chartSummaryAriaLabel: "Samenvatting lagna, rashi, nakshatra",
    lagnaMedallionLabel: "Lagna",
    rashiMedallionLabel: "Rashi",
    nakshatraMedallionLabel: "Nakshatra",
    dashaCardLabelKo: "Dasha",
    mahadashaSuffix: " Mahadasha",
    scoreLabels: { dharma: "Dharma", artha: "Artha", kama: "Kama", moksha: "Moksha" },
    emptyStateHeading: "Uw sterrenkaart staat klaar om stilletjes te openen.",
    emptyStateBody: "We bekijken de stroom waar het moment van uw geboorte de vraag van nu ontmoet.",
    pastConsultationLink: "Eerder consult opnieuw bekijken",
    pastConsultationHint: "Voltooide Vedische lezingen kunnen altijd opnieuw worden geopend.",
    summaryHeading: "Belangrijke Vedische indicatoren",
    summaryStrongGrahasLabel: "Sterk actieve grahas",
    summaryMajorBhavasLabel: "Belangrijke bhava's",
    d1SunFallback: "De stroom van de Zon",
    d1RahuFallback: "We bekijken ook samen de spanning die vastzit op de Rahu-Ketu-as.",
    d9VenusFallback: "Innerlijke volwassenheid",
    d9Body: "We bekijken samen de textuur van relaties, verplichtingen en blijvende keuzes.",
    userQuestionLabel: "Mijn vraag",
    legacySectionExtraTitle: (n) => `Sterrenlicht-advies ${n}`,
  },
  ms: {
    heroTitle: "Perundingan Pakar Astrologi Veda",
    heroLead: "Di atas aliran nakshatra dan planet, serta irama dasha, soalan anda kini diterangi dengan tenang.",
    heroPrice: "₩30,000",
    heroDashaBadge: "Aliran dasha",
    formPanelHeading: "Maklumat untuk membuka peta bintang anda",
    loadProfileButtonAriaLabel: "Muatkan maklumat kelahiran dari kad profil",
    loadProfileButtonLabel: "Muatkan dari kad profil",
    nameLabel: "Nama atau nama panggilan",
    namePlaceholder: "Nama untuk digunakan dalam perundingan",
    genderLabel: "Jantina",
    genderPlaceholder: "Pilih",
    genderFemale: "Perempuan",
    genderMale: "Lelaki",
    genderUnknown: "Tidak mahu nyatakan",
    birthDateLabel: "Tarikh lahir",
    calendarLabel: "Asas kalendar",
    calendarSolar: "Kalendar suria",
    calendarLunar: "Kalendar lunar",
    birthTimeLabel: "Masa lahir",
    timezoneLabel: "Zon waktu",
    timezoneOptionLabel: {
      "Asia/Seoul": "Korea (KST +9)",
      "Asia/Shanghai": "China/Singapura (CST +8)",
      "Asia/Kolkata": "India (IST +5:30)",
      "Europe/London": "UK (GMT 0)",
      "America/New_York": "Timur AS (EST -5)",
      "America/Los_Angeles": "Barat AS (PST -8)",
    },
    birthTimeUnknownLabel: "Masa lahir tidak diketahui",
    birthTimeUnknownNotice: "Jika masa lahir tidak pasti, ketepatan lagna akan dikurangkan dan bacaan akan tertumpu kepada aliran Bulan dan nakshatra.",
    birthPlaceLabel: "Tempat lahir",
    birthPlacePlaceholder: "Cth: Seoul, Tokyo, New York",
    geoCheckingLabel: "Sedang menyemak lokasi...",
    geoConfirmedLabel: (name) => `✓ ${name}`,
    geoHintLabel: "Masukkan tempat lahir anda untuk menyelaraskan koordinat rujukan bintang.",
    focusAreaLabel: "Topik yang ingin diterangi sekarang",
    focusOptionLabel: {
      overall: "Aliran keseluruhan",
      love: "Percintaan",
      money: "Kewangan",
      career: "Kerjaya",
      health: "Kesihatan",
      relationship: "Hubungan",
      spirituality: "Kerohanian",
      custom: "Tanya secara langsung",
    },
    questionLabel: "Soalan bebas",
    questionPlaceholder: "Tuliskan secara semula jadi apa yang paling anda ingin tahu sekarang.",
    submitButtonIdle: "Dapatkan perundingan pakar Astrologi Veda",
    pricePrefix: "Harga perundingan ",
    phaseAccess: "Sedang menyemak pas anda...",
    phasePayment: "Sedang menyemak maklumat pembayaran...",
    phaseStart: "Sedang menganalisis carta anda...",
    geocodeFallbackNotice: "Tidak dapat mencari tempat lahir tersebut, jadi kami mengira berdasarkan Seoul.",
    geocodeErrorNotice: "Carian lokasi tidak stabil buat sementara, jadi kami mengira berdasarkan Seoul.",
    geocodeFallbackName: "Seoul (lalai)",
    retryAccessNotice: "Sambungan tidak stabil buat sementara. Menyemak semula pas anda.",
    sessionPendingNotice: "Sedang membaca cahaya nakshatra. Sila tunggu sebentar.",
    gateReason: "Perundingan pakar astrologi Veda",
    accessCheckGateTitle: "Menyemak pas",
    accessCheckCompleteTitle: "Semakan pas selesai",
    accessCheckCompleteMessage: "Semakan pas telah selesai. Sedang membaca aliran cahaya bintang.",
    accessCheckFailTitleTransient: "Sila cuba lagi sebentar lagi",
    accessCheckFailTitle: "Semakan pas gagal",
    errorText: {
      INPUT_MISSING: "Sesetengah maklumat yang diperlukan untuk perundingan Veda tiada. Sila semak semula tarikh lahir, jantina dan masa lahir anda.",
      BIRTH_TIME_MISSING: "Masa lahir penting dalam astrologi Veda. Sila masukkannya atau pilih 'masa lahir tidak diketahui'.",
      CUSTOM_QUESTION_MISSING: "Jika anda memilih untuk bertanya secara langsung, sila tuliskan juga apa yang paling anda ingin tahu sekarang.",
      BIRTH_PLACE_INVALID: "Pengiraan lagna dan bhava memerlukan koordinat tempat lahir. Sila semak semula nama bandar.",
      LOGIN_REQUIRED: "Perundingan ini memerlukan log masuk. Sila log masuk dan cuba lagi.",
      PAYMENT_REQUIRED: "Perundingan ini memerlukan pas atau pembayaran. Sila semak maklumat pembayaran.",
      PAYMENT_VERIFY_FAILED: "Tidak dapat mengesahkan maklumat pembayaran. Tiada apa-apa ditolak daripada pembayaran atau pas anda.",
      PAYMENT_CANCELLED: "Pembayaran telah dibatalkan. Anda boleh mencuba lagi apabila perlu.",
      PREPARE_FAILED: "Masalah berlaku semasa menyediakan perundingan Veda. Tiada apa-apa ditolak daripada pembayaran atau pas anda.",
      CHART_CALCULATION_FAILED: "Masalah berlaku semasa mengira carta Veda. Sila semak semula maklumat kelahiran yang anda masukkan.",
      LLM_FAILED: "Masalah berlaku semasa menjana bacaan pakar. Sebarang potongan akan dipulihkan secara automatik.",
      NETWORK_ERROR: "Sambungan tidak stabil. Sila cuba lagi sebentar lagi.",
      SERVER_ERROR: "Masalah berlaku semasa menyediakan perundingan Veda. Tiada apa-apa ditolak daripada pembayaran atau pas anda.",
      GENERATION_TIMEOUT: "Penjanaan bacaan mengambil masa lebih lama daripada biasa. Sila jangan tutup halaman, cuba lagi sebentar lagi.",
      TEMPORARY_UNAVAILABLE: "Sambungan tidak stabil buat sementara sekarang. Pas anda kekal terpelihara sepenuhnya, sila cuba lagi sebentar lagi.",
    },
    cosmosStages: [
      { label: "Sedang menukar koordinat kelahiran anda kepada masa kosmik...", sub: "Mengira Hari Julian" },
      { label: "Sedang mengesan laluan Matahari...", sub: "Mengira longitud ekliptik Surya" },
      { label: "Sedang mencari nakshatra Bulan...", sub: "Chandra Nakshatra" },
      { label: "Sedang menetapkan ascendant...", sub: "Mengira Lagna" },
      { label: "Sedang membaca aliran dasha...", sub: "Vimshottari Dasha" },
      { label: "Sedang menyelesaikan tafsiran Jyotish...", sub: "Menjana naratif AI" },
    ],
    cosmosFooter: "Planet-planet sedang mengambil kedudukan",
    cosmosFallbackText: "Sedang menyelaraskan carta rashi...",
    chartDetailAriaLabel: "Butiran pengiraan Veda",
    chartDetailHeading: "Butiran pengiraan Veda",
    noLagnaNotice: "Tiada masa lahir diberikan, jadi lagna dan bhava tidak dikira secara sewenang-wenangnya. Bacalah terutamanya berdasarkan Bulan, rashi, nakshatra dan dasha Vimshottari.",
    lagnaBilingual: "Lagna, Ascendant",
    moonNakshatraBilingual: "Nakshatra Bulan, Moon Nakshatra",
    currentDashaBilingual: "Dasha semasa, Current Dasha",
    lagnaRashiLabel: "Rashi lagna",
    lagnaDegreeLabel: "Darjah lagna",
    lagnaNakshatraLabel: "Nakshatra lagna",
    lagnaPadaLabel: "Pada lagna",
    lagnaFirstHouseLabel: "Rashi permulaan rumah pertama berdasarkan lagna",
    birthTimeRequiredFallback: "Masa lahir diperlukan",
    rashiBilingual: "Rashi",
    grahaBilingual: "Graha",
    bhavaBilingual: "Bhava",
    nakshatraBilingual: "Nakshatra",
    dashaBilingual: "Dasha",
    vimshottariBilingual: "Vimshottari Dasha",
    grahaLabel: { Sun: "Matahari", Moon: "Bulan", Mars: "Marikh", Mercury: "Utarid", Jupiter: "Musytari", Venus: "Zuhrah", Saturn: "Zuhal", Rahu: "Rahu", Ketu: "Ketu" },
    planetTableHeaders: { graha: "Graha", rashi: "Rashi", degree: "Darjah", bhava: "Bhava", nakshatra: "Nakshatra", pada: "Pada", keywords: "Kata kunci tafsiran" },
    bhavaTableHeaders: { bhava: "Bhava", rashi: "Rashi", meaning: "Makna", graha: "Graha" },
    bhavaRequiresBirthInfo: "Pengiraan bhava yang tepat memerlukan masa lahir dan koordinat tempat lahir.",
    moonNakshatraDetailPrefix: "Nakshatra Bulan: ",
    dashaTableHeaders: { lord: "Penguasa", start: "Mula", end: "Tamat", duration: "Tempoh" },
    yearsSuffix: (n) => `${n} tahun`,
    padaSuffix: (n) => `Pada ${n}`,
    dashFallback: "-",
    jyotishEyebrow: "Jyotish · Astrologi Veda",
    resultTitle: (name) => `Peta Bintang ${name}`,
    defaultConsultantName: "Anda",
    pdfButtonAriaLabel: "Simpan sebagai PDF",
    pdfButtonSaving: "Menyimpan...",
    pdfButtonIdle: "Simpan PDF",
    chartSummaryAriaLabel: "Ringkasan lagna, rashi, nakshatra",
    lagnaMedallionLabel: "Lagna",
    rashiMedallionLabel: "Rashi",
    nakshatraMedallionLabel: "Nakshatra",
    dashaCardLabelKo: "Dasha",
    mahadashaSuffix: " Mahadasha",
    scoreLabels: { dharma: "Dharma", artha: "Artha", kama: "Kama", moksha: "Moksha" },
    emptyStateHeading: "Peta bintang anda sedia untuk dibuka dengan tenang.",
    emptyStateBody: "Kami akan melihat aliran di mana saat kelahiran anda bertemu dengan soalan sekarang.",
    pastConsultationLink: "Lihat perundingan lepas",
    pastConsultationHint: "Bacaan Veda yang selesai boleh dibuka semula pada bila-bila masa.",
    summaryHeading: "Petunjuk Veda utama",
    summaryStrongGrahasLabel: "Graha yang aktif dengan kuat",
    summaryMajorBhavasLabel: "Bhava utama",
    d1SunFallback: "Aliran Matahari",
    d1RahuFallback: "Kami juga akan bersama-sama melihat ketegangan yang tersimpan pada paksi Rahu-Ketu.",
    d9VenusFallback: "Kematangan dalaman",
    d9Body: "Kami akan bersama-sama melihat tekstur hubungan, komitmen, dan pilihan yang kekal lama.",
    userQuestionLabel: "Soalan saya",
    legacySectionExtraTitle: (n) => `Panduan cahaya bintang ${n}`,
  },
};

function getVedicAiCopy(locale: LoadingLocale): VedicAiCopy {
  return VEDIC_AI_COPY[locale] || VEDIC_AI_COPY_EN;
}

function useVedicAiCopy(): VedicAiCopy {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    window.addEventListener("languagechange", sync);
    document.addEventListener("cd:language-change", sync);
    return () => {
      window.removeEventListener("languagechange", sync);
      document.removeEventListener("cd:language-change", sync);
    };
  }, []);
  return getVedicAiCopy(locale);
}

function orderReadingSections(sections: Record<string, unknown>) {
  const entries = Object.entries(sections);
  const rank = (key: string) => {
    const index = ORDERED_SECTION_KEYS.indexOf(key);
    return index === -1 ? ORDERED_SECTION_KEYS.length : index;
  };
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => rank(a.entry[0]) - rank(b.entry[0]) || a.index - b.index)
    .map((item) => item.entry);
}

const initialForm: FormState = {
  userName: "",
  gender: "",
  birthDate: "",
  birthTime: "",
  birthTimeUnknown: false,
  calendarType: "solar",
  birthPlace: PLACE_PRESETS[0].label,
  latitude: PLACE_PRESETS[0].latitude,
  longitude: PLACE_PRESETS[0].longitude,
  timezone: PLACE_PRESETS[0].timezone,
  focusArea: "overall",
  question: "",
};

function applyProfileSeedToForm(form: FormState, profile: AiPrefillSeed): FormState {
  if (!profile.name && !profile.gender && !profile.birthDate && !profile.birthTime && !profile.calendarType && profile.birthTimeUnknown === undefined && !profile.timezone && !profile.city && !profile.country && !profile.latitude && !profile.longitude) {
    return form;
  }
  const birthplace = [profile.city, profile.country].filter(Boolean).join(", ");
  return {
    ...form,
    userName: profile.name || form.userName,
    gender: (profile.gender as FormState["gender"]) || form.gender,
    birthDate: profile.birthDate || form.birthDate,
    birthTimeUnknown: profile.birthTimeUnknown ?? form.birthTimeUnknown,
    birthTime:
      profile.birthTimeUnknown === true
        ? ""
        : profile.birthTime || form.birthTime,
    calendarType: profile.calendarType || form.calendarType,
    birthPlace: birthplace || profile.region || form.birthPlace,
    latitude: profile.latitude || form.latitude,
    longitude: profile.longitude || form.longitude,
    timezone: profile.timezone || form.timezone,
  };
}

function buildInitialForm(): FormState {
  return applyProfileSeedToForm(initialForm, readAiProfileSeed());
}

function makeRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `vedic-ai-${crypto.randomUUID()}`;
  }
  return `vedic-ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function toText(value: unknown) {
  return toDisplayText(value);
}

function safeFilePart(value: string) {
  return (value || "guest").replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "-").slice(0, 48);
}

function toNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function optionalNumber(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function runtimePayload(result: unknown) {
  const record = asRecord(result);
  const payload = asRecord(record.payload);
  const data = asRecord(record.data);
  return Object.keys(payload).length ? payload : (Object.keys(data).length ? data : record);
}

function isPaymentGranted(result: unknown) {
  const record = asRecord(result);
  const payload = runtimePayload(result);
  const status = toText(record.status || payload.status || payload.paymentStatus).toLowerCase();
  const denied = new Set(["error", "failed", "failure", "payment_required", "cancelled", "canceled"]);
  if (record.ok === false || payload.ok === false || denied.has(status)) return false;
  if (["granted", "paid", "success", "succeeded", "confirmed", "complete", "completed", "approved"].includes(status)) return true;
  return Boolean(
    record.transactionId
    || record.paymentId
    || record.purchaseId
    || payload.transactionId
    || payload.paymentId
    || payload.purchaseId
    || Object.keys(asRecord(payload.accessGrant)).length
    || Object.keys(asRecord(payload.consume)).length
  );
}

function extractPayment(result: unknown, fallbackRequestId: string) {
  const record = asRecord(result);
  const payload = runtimePayload(result);
  const payment = asRecord(payload.payment);
  const accessGrant = asRecord(payload.accessGrant);
  const consume = asRecord(payload.consume);
  const paymentId = toText(
    record.paymentId
    || record.transactionId
    || record.purchaseId
    || payload.paymentId
    || payload.transactionId
    || payload.purchaseId
    || payment.paymentId
    || payment.impUid
    || payment.merchantUid
    || accessGrant.paymentId
    || accessGrant.purchaseId
    || fallbackRequestId,
  );
  return {
    paymentId,
    transactionId: paymentId,
    paymentEvidence: payload,
    billingEvidence: payload,
    payment: { ...payment, paymentId, requestId: fallbackRequestId },
    accessGrant,
    consume,
  };
}

async function postJson<T>(path: string, body: Record<string, unknown>, requestId?: string) {
  try {
    const response = await authFetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(requestId ? { "Idempotency-Key": requestId } : {}),
      },
      body: JSON.stringify(body),
    }, { retryOn401: false });
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data: data as T };
  } catch {
    throw new Error("NETWORK_ERROR");
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

// 생성이 오래 걸릴 때(202) 결과 엔드포인트를 폴링해 수렴시킨다.
// CF rate-limit(10초당 100회) 대비 최대 1req/3~8s, 상한 40회(≈5분, 서버 신선도 창 420s 이내).
// 첫 폴은 빠르게(0.7s) 프로브해 조기 완료를 즉시 잡고, 이후 3~8s로 램프한다.
const RESULT_POLL_BACKOFF_MS = [700, 3000, 5000, 8000];
const RESULT_POLL_MAX_ATTEMPTS = 40;

async function pollVedicResult(sessionId: string): Promise<StartResult> {
  for (let attempt = 0; attempt < RESULT_POLL_MAX_ATTEMPTS; attempt += 1) {
    await sleep(RESULT_POLL_BACKOFF_MS[Math.min(attempt, RESULT_POLL_BACKOFF_MS.length - 1)]);
    let response: Response;
    try {
      response = await authFetch(`/api/vedic-ai/result?id=${encodeURIComponent(sessionId)}`, { method: "GET" }, { retryOn401: false });
    } catch {
      continue;
    }
    if (response.status === 202) continue;
    if (response.status === 429) throw new Error("SERVER_ERROR");
    const data = (await response.json().catch(() => ({}))) as StartResult;
    if (!response.ok) throw new Error(toText(data.reason) || "SERVER_ERROR");
    return data;
  }
  throw new Error("GENERATION_TIMEOUT");
}

function validateForm(form: FormState, copy: VedicAiCopy) {
  if (!form.birthDate || !form.gender || !form.calendarType) return copy.errorText.INPUT_MISSING;
  if (!form.birthTimeUnknown && !form.birthTime) return copy.errorText.BIRTH_TIME_MISSING;
  if (!form.birthPlace.trim()) return copy.errorText.BIRTH_PLACE_INVALID;
  if (form.focusArea === "custom" && form.question.trim().length < 2) return copy.errorText.CUSTOM_QUESTION_MISSING;
  return "";
}

function buildPayload(form: FormState, requestId: string) {
  return {
    serviceType: FEATURE_KEY,
    consultationType: CONSULTATION_TYPE,
    userName: form.userName.trim() || undefined,
    gender: form.gender || "unknown",
    birthDate: form.birthDate,
    birthTime: form.birthTimeUnknown ? "" : form.birthTime,
    birthTimeUnknown: form.birthTimeUnknown,
    calendarType: form.calendarType,
    birthPlace: form.birthPlace.trim(),
    latitude: optionalNumber(form.latitude),
    longitude: optionalNumber(form.longitude),
    timezone: form.timezone.trim(),
    focusArea: form.focusArea,
    question: form.question.trim(),
    locale: detectLocale(),
    requestId,
  };
}

function buildBillingGateInput(paymentPayload: Record<string, unknown>, requestId: string, copy: VedicAiCopy) {
  return {
    featureKey: FEATURE_KEY,
    subFeatureKey: FEATURE_KEY,
    productId: toText(paymentPayload.productId) || FEATURE_KEY,
    serviceType: FEATURE_KEY,
    reason: toText(paymentPayload.reason) || copy.gateReason,
    requestId,
    idempotencyKey: requestId,
    cost: toNumber(paymentPayload.cost ?? paymentPayload.coinPrice, FEATURE_COST),
    coinPrice: toNumber(paymentPayload.coinPrice ?? paymentPayload.cost, FEATURE_COST),
    amountKRW: toNumber(paymentPayload.amountKRW ?? paymentPayload.amountKrw ?? paymentPayload.paymentAmount, AMOUNT_KRW),
    membershipCreditCost: toNumber(paymentPayload.membershipCreditCost, MEMBERSHIP_CREDIT_COST),
  };
}

function chartPoint(chart: Record<string, unknown>, key: string) {
  return asRecord(chart[key]);
}

function planetSummary(chart: Record<string, unknown>, name: string) {
  const planets = Array.isArray(chart.planets) ? chart.planets : [];
  const found = planets.map(asRecord).find((planet) => toText(planet.name) === name);
  if (!found) return "";
  return [found.sign, found.house ? `${found.house}H` : "", found.nakshatra].filter(Boolean).join(" · ");
}

function vargaPlanetSign(chart: Record<string, unknown>, chartKey: string, planetName: string) {
  const divisionalCharts = asRecord(chart.divisionalCharts);
  const varga = asRecord(divisionalCharts[chartKey]);
  return toText(asRecord(varga[planetName]).sign);
}

const PLANET_LABELS: Record<string, string> = {
  Sun: "태양",
  Moon: "달",
  Mars: "화성",
  Mercury: "수성",
  Jupiter: "목성",
  Venus: "금성",
  Saturn: "토성",
  Rahu: "라후",
  Ketu: "케투",
};

function chartDisplayValue(...values: unknown[]) {
  for (const value of values) {
    const text = toText(value);
    if (text && text !== "-" && text !== "[object Object]") return text;
  }
  return "-";
}

function joinChartValues(...values: unknown[]) {
  const tokens = values
    .map((value) => chartDisplayValue(value))
    .filter((value) => value && value !== "-");
  return tokens.length ? tokens.join(" · ") : "-";
}

function chartPointSign(point: Record<string, unknown>) {
  return chartDisplayValue(point.rashiKo, point.rashi, point.signKo, point.sign, asRecord(point.rashi).name);
}

function chartPointNakshatra(point: Record<string, unknown>) {
  return chartDisplayValue(asRecord(point.nakshatra).name, point.nakshatra);
}

function planetRows(chart: Record<string, unknown>, copy: VedicAiCopy) {
  const planets = Array.isArray(chart.grahas)
    ? chart.grahas.map(asRecord)
    : (Array.isArray(chart.planets) ? chart.planets.map(asRecord) : []);
  const byName = new Map(planets.map((planet) => [toText(planet.nameEn || planet.name), planet]));
  return Object.keys(PLANET_LABELS).map((name) => {
    const planet = byName.get(name) || {};
    return {
      name,
      label: chartDisplayValue(planet.nameKo, copy.grahaLabel[name] || PLANET_LABELS[name]),
      sign: chartPointSign(planet),
      degree: chartDisplayValue(planet.degreeInRashi, planet.degree),
      house: planet.bhava || planet.house ? `${toText(planet.bhava || planet.house)}H` : "-",
      nakshatra: chartPointNakshatra(planet),
      pada: chartDisplayValue(asRecord(planet.nakshatra).pada, planet.pada),
      keywords: Array.isArray(planet.interpretationKeywords) ? planet.interpretationKeywords.map(toText).filter(Boolean).join(", ") : "",
    };
  }).filter((row) => row.sign !== "-" || row.house !== "-" || row.nakshatra !== "-");
}

function rashiRows(chart: Record<string, unknown>) {
  return Array.isArray(chart.rashis) ? chart.rashis.map(asRecord) : [];
}

function bhavaRows(chart: Record<string, unknown>) {
  const rows = Array.isArray(chart.bhavas)
    ? chart.bhavas.map(asRecord)
    : (Array.isArray(chart.houses) ? chart.houses.map(asRecord) : []);
  return rows.map((row) => ({
    house: chartDisplayValue(row.house),
    rashi: chartDisplayValue(row.rashiKo, row.rashi, row.signKo, row.sign),
    meaning: chartDisplayValue(row.meaning),
    grahas: Array.isArray(row.grahas)
      ? row.grahas.map(toText).filter(Boolean).join(", ")
      : (Array.isArray(row.planets) ? row.planets.map(toText).filter(Boolean).join(", ") : ""),
  }));
}

function dashaRows(chart: Record<string, unknown>) {
  const vimshottari = asRecord(chart.vimshottariDasha);
  const legacyDasha = asRecord(chart.dasha);
  const periods = Array.isArray(vimshottari.periods)
    ? vimshottari.periods.map(asRecord)
    : (Array.isArray(legacyDasha.periods) ? legacyDasha.periods.map(asRecord) : []);
  return periods.slice(0, 10).map((period) => ({
    lord: chartDisplayValue(period.lord),
    startDate: chartDisplayValue(period.startDate, String(period.start || "").slice(0, 10)),
    endDate: chartDisplayValue(period.endDate, String(period.end || "").slice(0, 10)),
    durationYears: chartDisplayValue(period.durationYears, period.years),
  }));
}

function BasicVedicChartData({ chart }: { chart: Record<string, unknown> }) {
  const copy = useVedicAiCopy();
  const lagna = chartPoint(chart, "lagna");
  const moon = chartPoint(chart, "moon");
  const dasha = asRecord(chart.dasha);
  const config = asRecord(chart.calculationConfig);
  const moonNakshatra = asRecord(chart.moonNakshatra);
  const vimshottari = asRecord(chart.vimshottariDasha);
  const currentMahadasha = asRecord(vimshottari.currentMahadasha);
  const hasLagna = Boolean(chart.lagna && typeof chart.lagna === "object");
  const rows = [
    ["Zodiac", chartDisplayValue(config.zodiac, "sidereal")],
    ["Ayanamsa", chartDisplayValue(config.ayanamsa, chart.ayanamsa)],
    ["Bhava", chartDisplayValue(config.bhavaSystem, "whole-sign")],
    [copy.lagnaBilingual, hasLagna ? joinChartValues(chartPointSign(lagna), lagna.degreeInRashi || lagna.degree, lagna.nakshatra, lagna.pada ? copy.padaSuffix(toText(lagna.pada)) : "") : copy.birthTimeRequiredFallback],
    [copy.moonNakshatraBilingual, joinChartValues(moonNakshatra.name || chartPointNakshatra(moon), moonNakshatra.pada ? copy.padaSuffix(toText(moonNakshatra.pada)) : moon.pada ? copy.padaSuffix(toText(moon.pada)) : "", moonNakshatra.lord)],
    [copy.currentDashaBilingual, chartDisplayValue(currentMahadasha.lord, dasha.currentLord, dasha.currentMahadasha)],
  ];
  const planets = planetRows(chart, copy);
  const rashis = rashiRows(chart);
  const bhavas = bhavaRows(chart);
  const dashas = dashaRows(chart);
  // vimshottariDasha.currentMahadasha에 시작/종료 날짜가 없을 때(레거시 저장분 등),
  // 같은 다샤 목(lord)의 상세 기간 행에서 날짜를 대신 가져온다.
  const currentDashaLord = chartDisplayValue(currentMahadasha.lord, dasha.currentLord, dasha.currentMahadasha);
  const currentDashaRow = dashas.find((row) => row.lord === currentDashaLord);

  return (
    <section className={styles.basicChartData} aria-label={copy.chartDetailAriaLabel}>
      <div className={styles.basicChartHeader}>
        <span>{copy.chartDetailHeading}</span>
        <strong>VedicChartResult</strong>
      </div>
      {!hasLagna ? (
        <p className={styles.chartNotice}>{copy.noLagnaNotice}</p>
      ) : null}
      <dl className={styles.chartDataGrid}>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <details className={styles.chartDetail} open>
        <summary>{copy.lagnaBilingual}</summary>
        <dl className={styles.chartDataGrid}>
          {[
            [copy.lagnaRashiLabel, chartDisplayValue(lagna.rashiKo, lagna.rashi, lagna.signKo, lagna.sign)],
            [copy.lagnaDegreeLabel, chartDisplayValue(lagna.degreeInRashi, lagna.degree)],
            [copy.lagnaNakshatraLabel, chartDisplayValue(lagna.nakshatra)],
            [copy.lagnaPadaLabel, lagna.pada ? copy.padaSuffix(toText(lagna.pada)) : copy.dashFallback],
            [copy.lagnaFirstHouseLabel, chartDisplayValue(lagna.firstHouseRashiKo, lagna.firstHouseRashi)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{hasLagna ? value : copy.birthTimeRequiredFallback}</dd>
            </div>
          ))}
        </dl>
      </details>
      <details className={styles.chartDetail}>
        <summary>{copy.rashiBilingual}</summary>
        <div className={styles.rashiList}>
          {rashis.map((rashi) => (
            <span key={toText(rashi.nameEn)}>{chartDisplayValue(rashi.nameKo, rashi.nameEn)}</span>
          ))}
        </div>
      </details>
      {planets.length ? (
        <details className={styles.chartDetail} open>
          <summary>{copy.grahaBilingual}</summary>
          <div className={styles.planetTableWrap}>
          <table className={styles.planetTable}>
            <thead>
              <tr>
                <th>{copy.planetTableHeaders.graha}</th>
                <th>{copy.planetTableHeaders.rashi}</th>
                <th>{copy.planetTableHeaders.degree}</th>
                <th>{copy.planetTableHeaders.bhava}</th>
                <th>{copy.planetTableHeaders.nakshatra}</th>
                <th>{copy.planetTableHeaders.pada}</th>
                <th>{copy.planetTableHeaders.keywords}</th>
              </tr>
            </thead>
            <tbody>
              {planets.map((row) => (
                <tr key={row.name}>
                  <td>{row.label}</td>
                  <td>{row.sign}</td>
                  <td>{row.degree}</td>
                  <td>{row.house}</td>
                  <td>{row.nakshatra}</td>
                  <td>{row.pada}</td>
                  <td>{row.keywords || copy.dashFallback}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </details>
      ) : null}
      <details className={styles.chartDetail}>
        <summary>{copy.bhavaBilingual}</summary>
        {bhavas.length ? (
          <div className={styles.planetTableWrap}>
            <table className={styles.planetTable}>
              <thead><tr><th>{copy.bhavaTableHeaders.bhava}</th><th>{copy.bhavaTableHeaders.rashi}</th><th>{copy.bhavaTableHeaders.meaning}</th><th>{copy.bhavaTableHeaders.graha}</th></tr></thead>
              <tbody>
                {bhavas.map((row) => (
                  <tr key={row.house}>
                    <td>{row.house}H</td>
                    <td>{row.rashi}</td>
                    <td>{row.meaning}</td>
                    <td>{row.grahas || copy.dashFallback}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className={styles.chartNotice}>{copy.bhavaRequiresBirthInfo}</p>}
      </details>
      <details className={styles.chartDetail}>
        <summary>{copy.nakshatraBilingual}</summary>
        <p className={styles.chartNotice}>
          {copy.moonNakshatraDetailPrefix}{joinChartValues(moonNakshatra.name || chartPointNakshatra(moon), moonNakshatra.pada ? copy.padaSuffix(toText(moonNakshatra.pada)) : "", moonNakshatra.lord)}
        </p>
      </details>
      <details className={styles.chartDetail}>
        <summary>{copy.dashaBilingual}</summary>
        <p className={styles.chartNotice}>{copy.vimshottariBilingual}: {chartDisplayValue(currentMahadasha.lord, dasha.currentMahadasha)} · {chartDisplayValue(currentMahadasha.startDate, currentDashaRow?.startDate)} ~ {chartDisplayValue(currentMahadasha.endDate, currentDashaRow?.endDate)}</p>
      </details>
      <details className={styles.chartDetail}>
        <summary>{copy.vimshottariBilingual}</summary>
        <div className={styles.planetTableWrap}>
          <table className={styles.planetTable}>
            <thead><tr><th>{copy.dashaTableHeaders.lord}</th><th>{copy.dashaTableHeaders.start}</th><th>{copy.dashaTableHeaders.end}</th><th>{copy.dashaTableHeaders.duration}</th></tr></thead>
            <tbody>
              {dashas.map((row) => (
                <tr key={`${row.lord}-${row.startDate}`}>
                  <td>{row.lord}</td>
                  <td>{row.startDate}</td>
                  <td>{row.endDate}</td>
                  <td>{copy.yearsSuffix(row.durationYears)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

function sectionHeading(line: string) {
  const text = line.replace(/^#{1,4}\s*/, "").replace(/^\d+[\).]\s*/, "").replace(/[:：]\s*$/, "").trim();
  return SECTION_TITLES.find((title) => text.includes(title) || title.includes(text)) || "";
}

// copy 를 넘기지 않는 기존 호출부(VedicAiResultClient.tsx)는 그대로 SECTION_TITLES(한국어) 폴백을 받는다.
export function splitAssistantSections(content: string, copy?: VedicAiCopy) {
  // 구조화 파싱에 실패한 원시(잘린) JSON은 중괄호째 노출하지 않고 읽을 수 있는 문장만 복원한다.
  const proseSource = looksLikeRawJson(content) ? extractReadableTextFromJsonLike(content) : content;
  const lines = proseSource.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const sections: Array<{ title: string; body: string }> = [];
  let currentTitle = "";
  let buffer: string[] = [];

  lines.forEach((line) => {
    const heading = sectionHeading(line);
    if (heading) {
      if (buffer.length) sections.push({ title: currentTitle || SECTION_TITLES[Math.min(sections.length, SECTION_TITLES.length - 1)], body: buffer.join("\n") });
      currentTitle = heading;
      buffer = [];
      return;
    }
    buffer.push(line);
  });

  if (buffer.length) sections.push({ title: currentTitle || SECTION_TITLES[Math.min(sections.length, SECTION_TITLES.length - 1)], body: buffer.join("\n") });
  if (sections.length > 1) return sections;

  // 위에서 복원한 proseSource를 써야 한다 — 원본 content(원시 JSON)를 다시 쓰면 복구가 무효화되어
  // 잘린 JSON이 그대로 화면에 노출된다.
  const paragraphs = proseSource.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  if (paragraphs.length <= 1) return [{ title: SECTION_TITLES[0], body: proseSource.trim() }];
  return paragraphs.slice(0, SECTION_TITLES.length).map((body, index) => ({
    title: SECTION_TITLES[index] || (copy ? copy.legacySectionExtraTitle(index + 1) : `별빛 조언 ${index + 1}`),
    body,
  }));
}

export function parseStructuredReading(content: string) {
  const text = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  if (!text.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(text);
    const scores = asRecord(parsed.scores);
    const sections = asRecord(parsed.sections);
    return Object.keys(scores).length && Object.keys(sections).length ? { scores, sections } : null;
  } catch {
    return null;
  }
}

function scoreValue(value: unknown) {
  return Math.max(0, Math.min(100, toNumber(value, 0)));
}

function CosmosLoadingScreen({ fallbackText, basis }: { fallbackText: string; basis: AnalysisBasis | null }) {
  const copy = useVedicAiCopy();
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const durations = [2000, 3000, 3000, 3000, 4000, 8000];
    let acc = 0;
    const timers = durations.map((duration, index) => {
      const timer = window.setTimeout(() => setStage(index), acc);
      acc += duration;
      return timer;
    });
    const progressTimer = window.setInterval(() => setProgress((current) => Math.min(current + 0.35, 95)), 80);
    return () => {
      timers.forEach(window.clearTimeout);
      window.clearInterval(progressTimer);
    };
  }, []);

  const activeStage = { glyph: COSMOS_GLYPHS[stage] || COSMOS_GLYPHS[0], ...(copy.cosmosStages[stage] || copy.cosmosStages[0]) };

  return (
    <div className={styles.cosmosLoading} aria-live="polite">
      <div className={styles.cosmosStars} aria-hidden="true">
        {COSMOS_STARS.map((star, index) => (
          <span
            key={`${star.top}-${star.left}-${index}`}
            style={{
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
              animationDelay: star.delay,
            }}
          />
        ))}
      </div>

      <div className={styles.cosmosOrbitStage}>
        <svg viewBox="0 0 320 320" className={styles.cosmosOrbitSvg} aria-hidden="true">
          {COSMOS_ORBITS.map((orbit) => (
            <circle key={orbit.r} cx="160" cy="160" r={orbit.r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          ))}
          {COSMOS_ORBITS.map((orbit, index) => {
            // 초기 각도 오프셋(index*60°)만 정적으로 배치하고, 실제 공전은 CSS로 각 궤도를 회전시킨다.
            const theta = (index * 60) * Math.PI / 180;
            const px = 160 + orbit.r * Math.cos(theta);
            const py = 160 + orbit.r * Math.sin(theta);
            return (
              <g
                key={`${orbit.r}-${index}`}
                className={styles.cosmosOrbitSpin}
                style={{ animationDuration: `${(19.2 / orbit.speed).toFixed(1)}s` }}
              >
                <circle
                  cx={px}
                  cy={py}
                  r={orbit.size / 2}
                  fill={orbit.color}
                  style={{ filter: `drop-shadow(0 0 5px ${orbit.color})` }}
                />
              </g>
            );
          })}
          <circle cx="160" cy="160" r="28" fill="rgba(124,58,237,0.14)" stroke="rgba(139,92,246,0.32)" strokeWidth="1" />
        </svg>
        <span className={styles.cosmosOrbitGlyph}>{activeStage.glyph}</span>
      </div>

      {/* 궤도 애니메이션은 그대로 두고, 문구 자리만 실제 계산된 차트 값으로 바꾼다.
          근거가 아직 없거나 조회에 실패하면 기존 단계 문구로 되돌아간다. */}
      <div className={styles.cosmosLoadingText}>
        <AnalysisBasisLoading
          basis={basis}
          fallbackLabel={activeStage.label || fallbackText}
          fallbackDetail={activeStage.sub}
        />
      </div>

      {!basis?.stages?.length && (
        <div className={styles.cosmosStageDots}>
          {COSMOS_GLYPHS.map((glyph, index) => (
            <i key={glyph} className={index <= stage ? styles.activeCosmosDot : ""}>{glyph}</i>
          ))}
        </div>
      )}

      <div className={styles.cosmosProgress}>
        <span style={{ transform: `scaleX(${progress / 100})` }} />
      </div>
      <p>{copy.cosmosFooter}</p>
    </div>
  );
}

// "라그나, Lagna"처럼 "한글, 산스크리트" 한 덩어리로 온 라벨을 한글 주 라벨 + 산스크리트 캡션으로 분리.
function splitBilingual(label: string): { ko: string; sans: string } {
  const raw = String(label ?? "").trim();
  const comma = raw.indexOf(",");
  if (comma === -1) return { ko: raw, sans: "" };
  return { ko: raw.slice(0, comma).trim(), sans: raw.slice(comma + 1).trim() };
}

// LLM 본문은 핵심 문구를 **굵게**로 반환한다(worker/routes/vedic-ai.js 시스템 프롬프트).
// 인라인 **...** 마크만 <strong>으로 렌더링해 훑어보기 쉽게 한다.
function renderRichText(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    const bold = /^\*\*([^*]+)\*\*$/.exec(part);
    return bold ? <strong key={index}>{bold[1]}</strong> : <span key={index}>{part}</span>;
  });
}

// 요약 메달리온 카드의 라인 글리프 아이콘 (currentColor 골드 stroke).
function SummaryGlyph({ kind }: { kind: "lagna" | "rashi" | "nakshatra" }) {
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "aria-hidden": true as const, className: styles.medallionGlyph };
  if (kind === "lagna") {
    // 떠오르는 태양선
    return (
      <svg {...common}>
        <line x1="3" y1="18" x2="21" y2="18" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M7.5 18a4.5 4.5 0 0 1 9 0" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="12" y1="5" x2="12" y2="7.2" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="5.4" y1="7.6" x2="6.8" y2="9" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="18.6" y1="7.6" x2="17.2" y2="9" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "rashi") {
    // 별자리 기호 (연결된 별점)
    return (
      <svg {...common}>
        <polyline points="4,9 10,15 15,7 20,12" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="4" cy="9" r="1.4" strokeWidth="1.1" />
        <circle cx="10" cy="15" r="1.4" strokeWidth="1.1" />
        <circle cx="15" cy="7" r="1.4" strokeWidth="1.1" />
        <circle cx="20" cy="12" r="1.4" strokeWidth="1.1" />
      </svg>
    );
  }
  // nakshatra — 별무리
  return (
    <svg {...common}>
      <path d="M9 4l.9 2.1L12 7l-2.1.9L9 10l-.9-2.1L6 7l2.1-.9z" strokeWidth="1" strokeLinejoin="round" />
      <path d="M17 9l.7 1.6 1.6.7-1.6.7L17 14l-.7-1.6-1.6-.7 1.6-.7z" strokeWidth="1" strokeLinejoin="round" />
      <path d="M11 15l.6 1.4 1.4.6-1.4.6L11 20l-.6-1.4-1.4-.6 1.4-.6z" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

export function StructuredReadingResult({
  reading,
  chart,
  name,
  basis = null,
}: {
  reading: { scores: Record<string, unknown>; sections: Record<string, unknown> };
  chart: Record<string, unknown>;
  name: string;
  basis?: AnalysisBasis | null;
}) {
  const copy = useVedicAiCopy();
  const lagna = chartPoint(chart, "lagna");
  const sun = chartPoint(chart, "sun");
  const moon = chartPoint(chart, "moon");
  const dasha = asRecord(chart.dasha);
  const moonNakshatra = asRecord(chart.moonNakshatra);
  const vimshottari = asRecord(chart.vimshottariDasha);
  const currentMahadasha = asRecord(vimshottari.currentMahadasha);
  const sectionEntries = orderReadingSections(reading.sections);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  async function handlePdfDownload() {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      const { exportResultPdf } = await import("@/lib/pdf/export-result-pdf");
      await exportResultPdf({
        captureTargets: ["#vedic-result-body"],
        fileName: `vedic-reading-${safeFilePart(name || "result")}.pdf`,
        backgroundColor: "#0a0818",
        cover: {
          title: copy.resultTitle(name || copy.defaultConsultantName),
          subtitle: copy.jyotishEyebrow,
          date: new Date().toISOString().slice(0, 10),
        },
      });
    } catch (error) {
      console.error("[VedicAI] pdf download failed", error);
    } finally {
      setIsExportingPdf(false);
    }
  }

  const dashaLord = chartDisplayValue(currentMahadasha.lord, dasha.currentLord, dasha.currentMahadasha);
  const dashaStart = chartDisplayValue(currentMahadasha.startDate);
  const dashaEnd = chartDisplayValue(currentMahadasha.endDate);
  // getGrahaMeta/GrahaNatureDot 는 VedicChartVisuals.tsx 소유의 별도 VedicChartCopy 타입을 받는다
  // (이 파일의 VedicAiCopy 와 다른 타입) — 여기서는 copy 를 넘기지 않아 기존처럼 한국어 그라하명으로
  // 폴백한다. 완전한 로케일 일관성이 필요해지면 VedicChartCopy 를 공유하도록 나중에 정리한다.
  const dashaMeta = getGrahaMeta(String(currentMahadasha.lord || dasha.currentLord || ""));

  return (
    <div className={styles.structuredResult} id="vedic-result-body">
      <div className={styles.structuredHeader}>
        <div className={styles.structuredHeaderTitle}>
          <p>{copy.jyotishEyebrow}</p>
          <h2>{copy.resultTitle(name || copy.defaultConsultantName)}</h2>
        </div>
        <button type="button" className={styles.pdfButton} onClick={() => void handlePdfDownload()} disabled={isExportingPdf} aria-label={copy.pdfButtonAriaLabel}>
          {isExportingPdf ? <Loader2 className={styles.spin} size={16} aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}
          <span>{isExportingPdf ? copy.pdfButtonSaving : copy.pdfButtonIdle}</span>
        </button>
      </div>

      {basis && (
        <section className={styles.revealItem} style={{ animationDelay: "0ms" }}>
          <AnalysisBasisPanel basis={basis} />
        </section>
      )}

      <section className={`${styles.chartSummaryCard} ${styles.revealItem}`} style={{ animationDelay: "0ms" }} aria-label={copy.chartSummaryAriaLabel}>
        <article className={styles.medallion}>
          <span className={styles.medallionRing}><SummaryGlyph kind="lagna" /></span>
          <span className={styles.medallionKo}>{copy.lagnaMedallionLabel}</span>
          <em className={styles.medallionSans}>Lagna</em>
          <strong>{chartDisplayValue(lagna.rashiKo, lagna.rashi, lagna.signKo, lagna.sign)}</strong>
          <small>{joinChartValues(lagna.degreeInRashi || lagna.degree, lagna.nakshatra, lagna.pada ? copy.padaSuffix(toText(lagna.pada)) : "")}</small>
        </article>
        <article className={styles.medallion}>
          <span className={styles.medallionRing}><SummaryGlyph kind="rashi" /></span>
          <span className={styles.medallionKo}>{copy.rashiMedallionLabel}</span>
          <em className={styles.medallionSans}>Rashi</em>
          <strong>{joinChartValues(chartPointSign(sun), chartPointSign(moon))}</strong>
          <small>Sun · Moon</small>
        </article>
        <article className={styles.medallion}>
          <span className={styles.medallionRing}><SummaryGlyph kind="nakshatra" /></span>
          <span className={styles.medallionKo}>{copy.nakshatraMedallionLabel}</span>
          <em className={styles.medallionSans}>Nakshatra</em>
          <strong>{chartDisplayValue(moonNakshatra.name, moon.nakshatra)}</strong>
          <small>{joinChartValues(moonNakshatra.pada ? copy.padaSuffix(toText(moonNakshatra.pada)) : moon.pada ? copy.padaSuffix(toText(moon.pada)) : "", moonNakshatra.lord)}</small>
        </article>
      </section>

      <div className={`${styles.dashaBanner} ${styles.revealItem}`} style={{ animationDelay: "70ms" }}>
        <div className={styles.dashaBannerLabel}>
          <span className={styles.cardLabelKo}>{copy.dashaCardLabelKo}</span>
          <em className={styles.cardLabelSans}>Vimshottari Dasha</em>
        </div>
        <div className={styles.dashaBannerBody}>
          <DashaProgressRing lord={dashaLord} startDate={dashaStart} endDate={dashaEnd} />
          <div className={styles.dashaBannerText}>
            <strong>
              <GrahaNatureDot nature={dashaMeta.nature} />
              {dashaLord}{copy.mahadashaSuffix}
            </strong>
            <small>{dashaStart} ~ {dashaEnd}</small>
          </div>
        </div>
      </div>

      <div className={styles.revealItem} style={{ animationDelay: "140ms" }}>
        <NorthIndianChart chart={chart} />
      </div>
      <div className={styles.revealItem} style={{ animationDelay: "210ms" }}>
        <DashaTimeline chart={chart} />
      </div>

      <div className={styles.revealItem} style={{ animationDelay: "280ms" }}>
        <BasicVedicChartData chart={chart} />
      </div>

      <section className={`${styles.scorePanel} ${styles.revealItem}`} style={{ animationDelay: "350ms" }}>
        {Object.entries(copy.scoreLabels).map(([key, label]) => (
          <div key={key}>
            <span>{label}({key})</span>
            <strong>{scoreValue(reading.scores[key])}</strong>
            <i><b style={{ transform: `scaleX(${scoreValue(reading.scores[key]) / 100})` }} /></i>
          </div>
        ))}
      </section>

      {sectionEntries.map(([key, rawSection], index) => {
        const section = asRecord(rawSection);
        const { ko, sans } = splitBilingual(toText(section.title) || key);
        return (
          <article className={`${styles.structuredSection} ${styles.revealItem}`} style={{ animationDelay: `${420 + index * 70}ms` }} key={key}>
            <div className={styles.structuredSectionHead}>
              <span className={styles.sectionBadge} aria-hidden="true">{SECTION_GLYPHS[key] || "✦"}</span>
              <h3>
                <span className={styles.sectionTitleKo}>{ko}</span>
                {sans ? <em className={styles.sectionTitleSans}>{sans}</em> : null}
              </h3>
            </div>
            {splitIntoParagraphs(toText(section.body)).map((paragraph, paragraphIndex) => (
              <p key={paragraphIndex}>{renderRichText(paragraph)}</p>
            ))}
          </article>
        );
      })}
    </div>
  );
}

export default function VedicAiClient() {
  const copy = useVedicAiCopy();
  const [form, setForm] = useState<FormState>(() => buildInitialForm());
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  // 서버가 계산한 조티시 차트 근거 — 대기 화면이 실제 값을 단계별로 보여 준다.
  const [basis, setBasis] = useState<AnalysisBasis | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [geocode, setGeocode] = useState<GeocodeState>(() => {
    const initial = buildInitialForm();
    return {
      lat: initial.latitude || PLACE_PRESETS[0].latitude,
      lng: initial.longitude || PLACE_PRESETS[0].longitude,
      name: initial.birthPlace || PLACE_PRESETS[0].label,
      fallback: false,
    };
  });
  const requestIdRef = useRef("");
  const pendingAccessRef = useRef<PendingAccess | null>(null);
  const submitBusyRef = useRef(false);
  const { seed: profileSeed, seedVersion, reload: reloadProfileSeed } = useAiProfileSeed();
  const formTouchedRef = useRef(false);

  // 서버에서 프로필 카드가 뒤늦게 도착해도, 사용자가 입력을 시작하기 전이라면 폼에 반영
  useEffect(() => {
    if (!profileSeed) return;
    setForm((prev) => (formTouchedRef.current ? prev : applyProfileSeedToForm(prev, profileSeed)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedVersion]);

  function loadFormFromProfileCard() {
    void reloadProfileSeed().then((seed) => {
      if (seed) setForm((prev) => applyProfileSeedToForm(prev, seed));
    });
  }

  // 재열람: 완료된 상담은 ?cid=로 다시 열 수 있다 (결제 없이 조회만)
  useEffect(() => {
    const cid = new URLSearchParams(window.location.search).get("cid");
    if (!cid) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await authFetch(`/api/vedic-ai/result?id=${encodeURIComponent(cid)}`);
        const data = await response.json().catch(() => ({}));
        if (!cancelled && data?.ok && data.consultation) setConsultation(data.consultation as Consultation);
      } catch {
        // 재열람 실패는 조용히 무시 — 새 상담은 그대로 시작할 수 있다
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function rememberConsultationUrl(id: string) {
    if (!id || typeof window === "undefined") return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("cid", id);
      window.history.replaceState(null, "", url.toString());
    } catch {
      // URL 갱신 실패는 무시
    }
  }

  const busy = phase === "access" || phase === "payment" || phase === "start";
  const validationMessage = validateForm(form, copy);

  const phaseText = useMemo(() => {
    if (phase === "access") return copy.phaseAccess;
    if (phase === "payment") return copy.phasePayment;
    if (phase === "start") return copy.phaseStart;
    return "";
  }, [phase, copy]);

  function updateForm(patch: Partial<FormState>) {
    formTouchedRef.current = true;
    setForm((current) => ({ ...current, ...patch }));
  }

  function applyPreset(value: string) {
    const preset = PLACE_PRESETS.find((place) => place.label === value);
    if (!preset) {
      updateForm({ birthPlace: value });
      return;
    }
    updateForm({
      birthPlace: preset.label,
      latitude: preset.latitude,
      longitude: preset.longitude,
      timezone: preset.timezone,
    });
    setGeocode({ lat: preset.latitude, lng: preset.longitude, name: preset.label, fallback: false });
  }

  async function handlePlaceBlur() {
    const place = form.birthPlace.trim();
    if (!place || PLACE_PRESETS.some((preset) => preset.label === place) || geocoding) return;

    setGeocoding(true);
    try {
      const response = await fetch(`/api/geocode?place=${encodeURIComponent(place)}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      const lat = toText(data.lat);
      const lng = toText(data.lng);
      if (!lat || !lng) return;

      const name = toText(data.name) || place;
      updateForm({
        latitude: lat,
        longitude: lng,
        timezone: toText(data.timezone) || form.timezone || "Asia/Seoul",
      });
      setGeocode({ lat, lng, name, fallback: data.fallback === true });
      setNotice(data.fallback === true ? copy.geocodeFallbackNotice : "");
    } catch {
      setNotice(copy.geocodeErrorNotice);
      updateForm({ latitude: "37.5665", longitude: "126.9780", timezone: form.timezone || "Asia/Seoul" });
      setGeocode({ lat: "37.5665", lng: "126.9780", name: copy.geocodeFallbackName, fallback: true });
    } finally {
      setGeocoding(false);
    }
  }

  async function startConsultation(requestId: string, access: Record<string, unknown>, paymentWasRequired = false) {
    setPhase("start");
    // 다음 화면(생성 로딩)이 마운트되는 시점 — 게이트 오버레이 hold를 해제한다.
    releasePaidFeatureGate(requestId);
    // 근거 계산은 이용권 확인·결제를 통과한 뒤에만 시작한다 — 확인 단계에서 라그나·나크샤트라가
    // 먼저 노출되면 "확인도 전에 결과를 만든다"로 읽히고, 결제 전 계산값이 새어 나간다.
    // 순수 계산이라 기다리지 않고 병렬로 받는다(실패하면 null이라 생성 흐름을 막지 않는다).
    void fetchAnalysisBasis("/api/vedic-ai/basis", buildPayload(form, requestId)).then(setBasis);
    const { status, data } = await postJson<StartResult>(
      "/api/vedic-ai/start",
      { ...buildPayload(form, requestId), ...access, idempotencyKey: requestId },
      requestId,
    );
    if (data.ok && data.consultation) {
      setConsultation(data.consultation);
      rememberConsultationUrl(data.consultation.id);
      setError("");
      setNotice("");
      requestIdRef.current = "";
      pendingAccessRef.current = null;
      return;
    }
    if (status === 202 && data.sessionId) {
      // 생성이 진행 중(중복 제출 등) — 결과 엔드포인트를 폴링해 완료까지 수렴시킨다.
      setNotice(copy.sessionPendingNotice);
      const resolved = await pollVedicResult(data.sessionId);
      if (resolved.ok && resolved.consultation) {
        setConsultation(resolved.consultation);
        rememberConsultationUrl(resolved.consultation.id);
        setError("");
        setNotice("");
        requestIdRef.current = "";
        pendingAccessRef.current = null;
        return;
      }
      throw new Error(toText(resolved.reason) || "SERVER_ERROR");
    }
    if (status === 402 && paymentWasRequired) throw new Error("PAYMENT_VERIFY_FAILED");
    throw new Error(toText(data.reason) || (status === 401 ? "LOGIN_REQUIRED" : status >= 500 ? "SERVER_ERROR" : "PREPARE_FAILED"));
  }

  async function handleSubmit() {
    if (busy || submitBusyRef.current) return;
    if (validationMessage) {
      setError(validationMessage);
      setNotice("");
      return;
    }

    const requestId = requestIdRef.current || makeRequestId();
    requestIdRef.current = requestId;
    submitBusyRef.current = true;
    setError("");
    setNotice("");
    let gateStarted = false;

    try {
      const pending = pendingAccessRef.current;
      if (pending && pending.requestId === requestId) {
        await startConsultation(requestId, pending.access, pending.paymentWasRequired);
        return;
      }

      setPhase("access");
      beginPaidFeatureGateCheck({
        featureKey: FEATURE_KEY,
        requestId,
        title: copy.accessCheckGateTitle,
        reason: copy.gateReason,
        paymentMode: "MEMBERSHIP_PASS",
      });
      // 이용권 판정(unlock-status)을 아래 접근 확인 왕복과 겹쳐 돌린다 — 결제 게이트가 같은 키로 재사용해 직렬 왕복이 1회 준다.
      void primePaymentEligibility(buildBillingGateInput({}, requestId, copy));
      gateStarted = true;
      // 확인 완료 후 다음 화면(생성 로딩 또는 결과)이 실제로 뜰 때까지 게이트 오버레이를 유지해 "확인 중 → 공백"을 막는다.
      // release는 startConsultation의 setPhase("start") 및 결과 직접 렌더 지점에서 호출한다(안전장치 상한 8초).
      holdPaidFeatureGateOpen({ requestId, maxMs: 8000 });
      // 이용권 확인 앞단의 일시적 DB 장애(503 DB_DEGRADED 등)는 재시도로 흡수한다 — 하드 실패·결제창 오노출로 굳지 않게.
      const { status, data } = await runAccessCheckWithTransientRetry(
        () => postJson<EnsureAccessResult>(
          "/api/vedic-ai/ensure-access",
          { ...buildPayload(form, requestId), idempotencyKey: requestId },
          requestId,
        ),
        { onRetry: () => setNotice(copy.retryAccessNotice) },
      );

      if (data.ok) {
        completePaidFeatureGateCheck({
          featureKey: FEATURE_KEY,
          requestId,
          title: copy.accessCheckCompleteTitle,
          reason: copy.gateReason,
          paymentMode: "MEMBERSHIP_PASS",
          message: copy.accessCheckCompleteMessage,
        });
        if (data.consultation) {
          setConsultation(data.consultation);
          rememberConsultationUrl(data.consultation.id);
          // 결과 화면이 곧바로 마운트되는 시점 — 게이트 오버레이 hold를 해제한다.
          releasePaidFeatureGate(requestId);
          requestIdRef.current = "";
          pendingAccessRef.current = null;
          return;
        }
        await startConsultation(requestId, { accessToken: data.accessToken, accessType: data.accessType });
        return;
      }

      if (data.reason === "LOGIN_REQUIRED") throw new Error("LOGIN_REQUIRED");
      if (data.reason === "INVALID_INPUT") throw new Error("PREPARE_FAILED");
      // 가드 신설: 일시적 503/DB_DEGRADED가 빈 paymentPayload로 결제창에 오낙하하지 않도록,
      // PAYMENT_REQUIRED가 아닌 일시적 실패는 과금 없이 소프트 종료한다.
      if (data.reason !== "PAYMENT_REQUIRED" && isRetriableResultPollFailure(status, data)) {
        throw new Error("TEMPORARY_UNAVAILABLE");
      }
      if (data.reason !== "PAYMENT_REQUIRED") throw new Error("PREPARE_FAILED");

      setNotice(copy.errorText.PAYMENT_REQUIRED);
      setPhase("payment");
      const paymentPayload = asRecord(data.paymentPayload);
      const gate = await runBillingCoinGate(buildBillingGateInput(paymentPayload, requestId, copy));
      if (!isPaymentGranted(gate)) {
        const code = String(gate.error?.code || "").toUpperCase();
        if (code === "PAYMENT_CANCELLED") throw new Error("PAYMENT_CANCELLED");
        throw new Error("PAYMENT_VERIFY_FAILED");
      }

      const access = extractPayment(gate, requestId);
      pendingAccessRef.current = { requestId, access, paymentWasRequired: true };
      await startConsultation(requestId, access, true);
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "SERVER_ERROR";
      const paymentCancelled = code === "PAYMENT_CANCELLED";
      const clearPrepaid = ["LLM_FAILED", "CHART_CALCULATION_FAILED", "BIRTH_PLACE_INVALID", "PAYMENT_VERIFY_FAILED", "PAYMENT_CANCELLED", "LOGIN_REQUIRED", "PREPARE_FAILED"].includes(code);
      if (clearPrepaid) {
        pendingAccessRef.current = null;
        requestIdRef.current = "";
      }
      // 일시적 접속 장애는 이용권 결함이 아니므로 "이용권 확인 실패"로 표기하지 않는다.
      const isTransient = code === "TEMPORARY_UNAVAILABLE" || code === "NETWORK_ERROR";
      setError(copy.errorText[code] || copy.errorText.SERVER_ERROR);
      if (gateStarted) {
        failPaidFeatureGateCheck({
          featureKey: FEATURE_KEY,
          requestId,
          title: isTransient ? copy.accessCheckFailTitleTransient : copy.accessCheckFailTitle,
          reason: copy.gateReason,
          paymentMode: "MEMBERSHIP_PASS",
          message: copy.errorText[code] || copy.errorText.SERVER_ERROR,
          cancelled: paymentCancelled,
        });
      }
    } finally {
      submitBusyRef.current = false;
      setPhase("idle");
    }
  }

  const chart = consultation?.vedicChart || {};
  const summary = consultation?.summaryCards || {};
  const lagna = chartPoint(chart, "lagna");
  const moon = chartPoint(chart, "moon");

  return (
    <main className={styles.shell} data-vedic-ai-page="direct-route-v20260627">
      <section className={styles.hero}>
        <div className={styles.starLayer} aria-hidden="true" />
        <div className={styles.heroInner}>
          <div className={styles.copy}>
            <span className={styles.eyebrow}><Sparkles size={16} /> Jyotish · Vedic Star Counsel</span>
            <h2>{copy.heroTitle}</h2>
            <p>{copy.heroLead}</p>
            <div className={styles.heroMeta}>
              <span>{copy.heroPrice}</span>
              <span>{copy.heroDashaBadge}</span>
            </div>
          </div>
          <div className={styles.mandalaStage} aria-hidden="true">
            <div className={styles.mandalaCore} />
            <div className={styles.orbitOne} />
            <div className={styles.orbitTwo} />
            <HeroChartPreview />
          </div>
        </div>
      </section>

      <section className={styles.workspace}>
        <form className={styles.formPanel} onSubmit={(event) => { event.preventDefault(); void handleSubmit(); }}>
          <div className={`${styles.panelHeader} flex-wrap`}>
            <span className="min-w-0 flex-1"><Star size={18} /> {copy.formPanelHeading}</span>
            <strong>Vedic AI</strong>
            <button
              type="button"
              onClick={loadFormFromProfileCard}
              className="shrink-0 rounded-lg border border-[#f6d67e]/35 bg-[#f6d67e]/10 px-3 py-2 text-xs font-bold text-[#f6d67e] transition hover:bg-[#f6d67e]/20"
              aria-label={copy.loadProfileButtonAriaLabel}
            >
              {copy.loadProfileButtonLabel}
            </button>
          </div>

          <div className={styles.formGrid}>
            <label>
              <span>{copy.nameLabel}</span>
              <input value={form.userName} onChange={(event) => updateForm({ userName: event.target.value })} maxLength={80} disabled={busy} placeholder={copy.namePlaceholder} />
            </label>
            <label>
              <span>{copy.genderLabel}</span>
              <select value={form.gender} onChange={(event) => updateForm({ gender: event.target.value as Gender })} disabled={busy}>
                <option value="">{copy.genderPlaceholder}</option>
                <option value="female">{copy.genderFemale}</option>
                <option value="male">{copy.genderMale}</option>
                <option value="unknown">{copy.genderUnknown}</option>
              </select>
            </label>
            <label>
              <span><CalendarDays size={15} /> {copy.birthDateLabel}</span>
              <input {...birthDateTextInputProps(form.birthDate, (nextBirthDate) => updateForm({ birthDate: nextBirthDate }))} disabled={busy} />
            </label>
            <label>
              <span>{copy.calendarLabel}</span>
              <select value={form.calendarType} onChange={(event) => updateForm({ calendarType: event.target.value as CalendarType })} disabled={busy}>
                <option value="solar">{copy.calendarSolar}</option>
                <option value="lunar">{copy.calendarLunar}</option>
              </select>
            </label>
            <label>
              <span><Clock3 size={15} /> {copy.birthTimeLabel}</span>
              <input type="time" value={form.birthTime} onChange={(event) => updateForm({ birthTime: event.target.value })} disabled={busy || form.birthTimeUnknown} />
            </label>
            <label>
              <span><Compass size={15} /> {copy.timezoneLabel}</span>
              <select value={form.timezone} onChange={(event) => updateForm({ timezone: event.target.value })} disabled={busy}>
                {TIMEZONE_VALUES.map((value) => <option key={value} value={value}>{copy.timezoneOptionLabel[value]}</option>)}
              </select>
            </label>
          </div>

          <label className={styles.checkRow}>
            <input type="checkbox" checked={form.birthTimeUnknown} onChange={(event) => updateForm({ birthTimeUnknown: event.target.checked, birthTime: event.target.checked ? "" : form.birthTime })} disabled={busy} />
            <span>{copy.birthTimeUnknownLabel}</span>
          </label>
          {form.birthTimeUnknown && (
            <p className={styles.softNotice}>{copy.birthTimeUnknownNotice}</p>
          )}

          <div className={styles.formGrid}>
            <label>
              <span><MapPin size={15} /> {copy.birthPlaceLabel}</span>
              <input
                list="vedic-place-presets"
                value={form.birthPlace}
                onChange={(event) => applyPreset(event.target.value)}
                onBlur={() => void handlePlaceBlur()}
                disabled={busy}
                placeholder={copy.birthPlacePlaceholder}
              />
              <datalist id="vedic-place-presets">
                {PLACE_PRESETS.map((place) => <option key={place.label} value={place.label} />)}
              </datalist>
              <small className={styles.geoStatus}>
                {geocoding ? copy.geoCheckingLabel : geocode.name ? copy.geoConfirmedLabel(geocode.name.slice(0, 42)) : copy.geoHintLabel}
              </small>
            </label>
            <label>
              <span>{copy.focusAreaLabel}</span>
              <select value={form.focusArea} onChange={(event) => updateForm({ focusArea: event.target.value as FocusArea })} disabled={busy}>
                {FOCUS_VALUES.map((value) => <option key={value} value={value}>{copy.focusOptionLabel[value]}</option>)}
              </select>
            </label>
          </div>

          <label>
            <span>{copy.questionLabel}</span>
            <textarea value={form.question} onChange={(event) => updateForm({ question: event.target.value })} maxLength={1500} disabled={busy} placeholder={copy.questionPlaceholder} />
          </label>

          {(error || notice || phaseText) && (
            <div className={error ? styles.errorBox : styles.noticeBox}>
              {phaseText && <Loader2 className={styles.spin} size={16} />}
              <span>{error || phaseText || notice}</span>
            </div>
          )}

          <div className="flex items-center justify-end">
            <PriceBadge featureKey="vedic-ai-consultation" prefix={copy.pricePrefix} />
          </div>
          <button type="submit" className={styles.primaryButton} disabled={busy} aria-busy={busy}>
            {busy ? <Loader2 className={styles.spin} size={18} /> : <Moon size={18} />}
            {busy ? phaseText : copy.submitButtonIdle}
          </button>
        </form>

        <section className={styles.resultPanel}>
          {/* 생성 대기 화면은 이용권 확인·결제를 통과한 뒤에만 띄운다.
              확인 단계에 띄우면 "확인도 전에 결과를 만든다"로 읽히고,
              결제 단계에 띄우면 결제창 뒤에 대기 UI가 깔려 결제 흐름을 가린다. */}
          {phase === "start" && <CosmosLoadingScreen fallbackText={phaseText || copy.cosmosFallbackText} basis={basis} />}

          {!consultation ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyMandala} aria-hidden="true" />
              <h2>{copy.emptyStateHeading}</h2>
              <p>{copy.emptyStateBody}</p>
              <Link href="/vedic-ai/result/" className={styles.resultListItem}>
                <strong>{copy.pastConsultationLink}</strong>
                <small>{copy.pastConsultationHint}</small>
              </Link>
            </div>
          ) : (
            <>
              <div className={styles.summaryHeader}>
                <span>{copy.summaryHeading}</span>
              </div>
              <div className={`${styles.summaryGrid} ${styles.revealItem}`} style={{ animationDelay: "0ms" }}>
                <article><span>{copy.lagnaBilingual}</span><strong>{summary.lagna || toText(lagna.signKo || lagna.sign) || copy.birthTimeRequiredFallback}</strong></article>
                <article><span>{copy.moonNakshatraBilingual}</span><strong>{summary.nakshatra || toText(moon.nakshatra) || copy.dashFallback}</strong></article>
                <article><span>{copy.currentDashaBilingual}</span><strong>{summary.currentDasha || copy.dashFallback}</strong></article>
                <article><span>{copy.summaryStrongGrahasLabel}</span><strong>{summary.strongGrahas?.length ? summary.strongGrahas.join(", ") : copy.dashFallback}</strong></article>
                <article><span>{copy.summaryMajorBhavasLabel}</span><strong>{summary.majorBhavas?.length ? summary.majorBhavas.join(", ") : copy.dashFallback}</strong></article>
              </div>

              <div className={`${styles.keywordRow} ${styles.revealItem}`} style={{ animationDelay: "70ms" }}>
                {(summary.keywords || []).slice(0, 4).map((keyword) => <span key={keyword}>{keyword}</span>)}
              </div>

              <div className={`${styles.chartCards} ${styles.revealItem}`} style={{ animationDelay: "140ms" }}>
                <article>
                  <span>D1 Rashi</span>
                  <strong>{planetSummary(chart, "Sun") || copy.d1SunFallback}</strong>
                  <p>{planetSummary(chart, "Rahu") || copy.d1RahuFallback}</p>
                </article>
                <article>
                  <span>D9 Navamsa</span>
                  <strong>{toText(asRecord(asRecord(summary.d9).Venus).sign) || vargaPlanetSign(chart, "d9", "Venus") || copy.d9VenusFallback}</strong>
                  <p>{copy.d9Body}</p>
                </article>
              </div>

              <div className={styles.chatList}>
                {consultation.messages.map((message, index) => {
                  const structured = message.role === "assistant" ? parseStructuredReading(message.content) : null;
                  if (structured) {
                    return (
                      <StructuredReadingResult
                        key={`${message.role}-${index}`}
                        reading={structured}
                        chart={chart}
                        name={toText(consultation.birthInfo?.name) || form.userName}
                        basis={consultation.analysisBasis || basis}
                      />
                    );
                  }
                  return message.role === "assistant" ? (
                    <div className={styles.sectionGrid} key={`${message.role}-${index}`}>
                      {splitAssistantSections(message.content, copy).map((section, sectionIndex) => (
                        <article className={styles.sectionCard} key={`${section.title}-${sectionIndex}`}>
                          <span>{section.title}</span>
                          {splitIntoParagraphs(section.body).map((paragraph, paragraphIndex) => (
                            <p key={paragraphIndex}>{paragraph}</p>
                          ))}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <article className={styles.userMsg} key={`${message.role}-${index}`}>
                      <span>{copy.userQuestionLabel}</span>
                      <p>{message.content}</p>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </section>
    </main>
  );
}
