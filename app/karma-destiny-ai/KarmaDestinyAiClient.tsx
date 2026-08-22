"use client";

import { birthDateTextInputProps } from "@/lib/birthDateInputProps";
import { CalendarDays, Clock3, Download, Loader2, MapPin, Maximize2, Moon, Send, Sparkles, WalletCards, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
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
import { DeliverableSpec } from "@/app/components/DeliverableSpec";
import { extractReadableTextFromJsonLike, looksLikeRawJson, toDisplayText } from "@/lib/llm-text";
import { detectLocale } from "@/lib/i18n/dictionary";
import { getCurrentLoadingLocale, INTL_LOCALE_BY_LOADING_LOCALE, type LoadingLocale } from "@/constants/loadingMessages";

type AccessType = "pass" | "paid" | "monthly_credit" | "membership_credit" | "subscription" | "admin";
type CalendarType = "solar" | "lunar";
type GenderType = "male" | "female" | "unknown" | "";
type FocusAreaType = "overall" | "love" | "money" | "career" | "relationship" | "family" | "lifePattern" | "spirituality" | "custom";
type FlowStatus = "idle" | "preparing" | "payment" | "reading" | "ready" | "error";

type BirthPlace = {
  city: string;
  country: string;
  latitude: string;
  longitude: string;
  timezone: string;
};

type ConsultationForm = {
  name: string;
  gender: GenderType;
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  calendarType: CalendarType;
  birthPlace: BirthPlace;
  focusArea: FocusAreaType;
  question: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};

type ParsedSection = {
  symbol: string;
  title: string;
  body: string;
};

type SummaryCards = {
  keywords?: string[];
  repeatingPattern?: string;
  currentTask?: string;
};

type IntegratedResult = {
  /** 다섯 렌즈 정본(schemaVersion 2). 각 항목은 { confidence, data, ... } 형태다. */
  lenses?: Record<string, { confidence?: string; data?: Record<string, unknown> | null }> | null;
  /** 구 3체계 이름 별칭 — schemaVersion 1 문서와의 호환을 위해 서버가 함께 내려준다. */
  saju?: Record<string, unknown> | null;
  westernAstrology?: Record<string, unknown> | null;
  vedicAstrology?: Record<string, unknown> | null;
  synthesis?: Record<string, unknown> | null;
};

type ChartDataBlock = {
  key: LensKey;
  label: string;
  title: string;
  summary: string;
  rows: { label: string; value: string }[];
};

type BillingGatePayload = {
  featureKey?: string;
  runtimeGate?: Record<string, unknown>;
  reason?: string;
  requestId?: string;
  idempotencyKey?: string;
  cost?: number;
  coinPrice?: number;
  amountKRW?: number;
  paymentAmount?: number;
  totalAmount?: number;
  membershipCreditCost?: number;
};

type EnsureAccessResult =
  | { ok: true; accessToken: string; accessType: AccessType }
  | { ok: false; reason: "PAYMENT_REQUIRED"; message?: string; paymentPayload: BillingGatePayload }
  | { ok: false; reason: "LOGIN_REQUIRED"; message?: string }
  | { ok: false; reason: "INVALID_INPUT"; message: string }
  | { ok: false; reason?: string; message?: string };

type ConsultationResult = {
  ok: boolean;
  sessionId?: string;
  reportId?: string;
  attemptId?: string;
  accessType?: AccessType;
  status?: string;
  integratedResult?: IntegratedResult | null;
  summaryCards?: SummaryCards | null;
  messages?: ChatMessage[];
  reason?: string;
  message?: string;
};

type KarmaDestinyCopy = {
  featureReason: string;
  loginRequiredMessage: string;
  paymentRequiredMessage: string;
  paymentVerifyFailedMessage: string;
  paymentCancelledMessage: string;
  serverErrorMessage: string;
  llmErrorMessage: string;
  requiredInputMessage: string;
  birthTimeRequiredMessage: string;
  customQuestionRequiredMessage: string;
  networkErrorMessage: string;
  karmaSectionFallbackTitles: string[];
  loadingStageLabels: string[];
  premiumValueCards: string[];
  focusAreaLabel: Record<FocusAreaType, string>;
  placePresetLabel: Record<string, string>;
  lensFallbackSummary: Record<LensKey, string>;
  chartBlockLabel: Record<LensKey, string>;
  chartBlockTitle: Record<LensKey, string>;
  gateCheckTitle: string;
  gateCheckCompleteTitle: string;
  gateCheckCompleteMessage: string;
  gateCheckFailedTitle: string;
  statusPreparing: string;
  statusPayment: string;
  statusReading: string;
  statusReady: string;
  statusIdle: string;
  accessTypeLabelPrefix: string;
  heroAriaLabel: string;
  heroTitle: string;
  heroDescription: string;
  premiumMapAriaLabel: string;
  premiumMapHeading: string;
  premiumMapDesc: string;
  formHeading: string;
  profileLoadAria: string;
  profileLoadCta: string;
  nameOrNicknameLabel: string;
  namePlaceholder: string;
  genderLabel: string;
  genderSelectOption: string;
  genderFemale: string;
  genderMale: string;
  genderUnknown: string;
  birthDateLabel: string;
  calendarTypeLabel: string;
  calendarSolarOption: string;
  calendarLunarOption: string;
  birthTimeLabel: string;
  birthTimeUnknownLabel: string;
  birthTimeUnknownNote: string;
  birthPlaceHeading: string;
  majorCityLabel: string;
  customInputOrSelectOption: string;
  cityLabel: string;
  countryLabel: string;
  latitudeLabel: string;
  longitudeLabel: string;
  timezoneLabel: string;
  topicLabel: string;
  questionLabel: string;
  questionPlaceholderCustom: string;
  questionPlaceholderDefault: string;
  priceLabelPrefix: string;
  submitBusyLabel: string;
  submitCta: string;
  resultCardHeading: string;
  fullscreenCta: string;
  summaryKeywordLabel: string;
  repeatingPatternLabel: string;
  repeatingPatternFallback: string;
  currentTaskLabel: string;
  currentTaskFallback: string;
  sajuLensLabel: string;
  westernLensLabel: string;
  vedicLensLabel: string;
  emptyStateTitle: string;
  emptyStateDesc: string;
  assistantRoleLabel: string;
  userRoleLabel: string;
  followUpPlaceholder: string;
  askCta: string;
  defaultKeywords: string[];
  resultModalTitle: string;
  savingLabel: string;
  pdfSaveLabel: string;
  closeAriaLabel: string;
  coverSubtitleNoBirthDate: string;
  defaultUserName: string;
  pdfCoverTitle: (name: string) => string;
  pdfCoverSubtitleLine: (name: string) => string;
  pdfDownloadErrorMessage: string;
  chartDataHeading: string;
  chartDataDesc: string;
};

const KARMA_DESTINY_EN: KarmaDestinyCopy = {
  featureReason: "Karma Destiny Expert Consultation",
  loginRequiredMessage: "You need to log in to start the consultation. Please log in and try again.",
  paymentRequiredMessage: "You need a pass for the Karma Destiny expert consultation. We'll open the checkout for you.",
  paymentVerifyFailedMessage: "Payment confirmation isn't complete yet. If you already paid, please try again in a moment.",
  paymentCancelledMessage: "The payment was cancelled. You can proceed again whenever you're ready.",
  serverErrorMessage: "Something went wrong while preparing the consultation. No payment was charged.",
  llmErrorMessage: "Something went wrong while generating the reading. If anything was charged, it will be automatically restored.",
  requiredInputMessage: "Some information needed for the Karma Destiny consultation is missing. Please recheck your birth date, gender, and birth time.",
  birthTimeRequiredMessage: "The depth of the Karma Destiny reading depends on birth time. Please enter your birth time or select \"Birth time unknown.\"",
  customQuestionRequiredMessage: "If you chose to ask your own question, please briefly write what you'd like to know most right now.",
  networkErrorMessage: "The connection seems unstable. Please try again in a moment.",
  karmaSectionFallbackTitles: [
    "業 — The Core Theme of Your Destiny",
    "源 — The Origin of Your Destiny",
    "流 — The Current Flow of Life",
    "課 — The Core Task of Karma",
    "緣 — The Karma of Relationships",
    "情 — The Karma of Love",
    "財 — The Karma of Money",
    "職 — The Karma of Career",
    "體 — Health Energy",
    "才 — Hidden Talent",
    "轉 — The Turning Point of Destiny",
    "策 — Strategy for Future Growth",
    "總 — A Synthesis of Five Perspectives",
    "句 — The Key Sentence That Changes Destiny",
    "箋 — Final Letter",
  ],
  loadingStageLabels: [
    "Setting up the pillars of Saju...",
    "Unfolding the 12 Ziwei palaces...",
    "Weaving the ties of the 27 Sukuyo mansions...",
    "Reading the psychology of the stars...",
    "Weighing the karma of Vedic wisdom...",
    "Bringing five perspectives into one...",
  ],
  premiumValueCards: [
    "The karma of recurring relationships",
    "Patterns in money and survival",
    "The direction of career and calling",
    "Debts of family of origin and emotion",
    "The flow of resolution for the year ahead",
    "A 3-year long-term destiny strategy",
    "A final letter from your consultant",
  ],
  focusAreaLabel: {
    overall: "Your overall destiny karma",
    lifePattern: "Recurring life patterns",
    love: "The karma of love and parting",
    money: "Recurring patterns with money",
    career: "The direction of work and calling",
    relationship: "Recurring emotions in relationships",
    family: "The karma of family and ties",
    spirituality: "Inner and spiritual growth",
    custom: "Ask your own question",
  },
  placePresetLabel: {
    Seoul: "Seoul, South Korea",
    Busan: "Busan, South Korea",
    Tokyo: "Tokyo, Japan",
    "New York": "New York, United States",
    "Los Angeles": "Los Angeles, United States",
    London: "London, United Kingdom",
    Paris: "Paris, France",
  },
  lensFallbackSummary: {
    saju: "Looks at the recurring habits behind your choices through the balance of the Day Master and Five Elements.",
    ziwei: "Looks at your stage in life and social role through the placement of the Life Palace and 12 Ziwei palaces.",
    sukuyo: "Looks at the position you tend to take in relationships through the distance between your birth mansion and the 27 lunar mansions.",
    westernAstrology: "Looks at your recurring emotional patterns through the flow of the Sun and Moon.",
    vedicAstrology: "Looks at familiar habits and growth direction through the Rahu-Ketu axis.",
  },
  chartBlockLabel: {
    saju: "Saju",
    ziwei: "Ziwei",
    sukuyo: "Sukuyo",
    westernAstrology: "Western Astrology",
    vedicAstrology: "Vedic Astrology",
  },
  chartBlockTitle: {
    saju: "Saju Natal Chart Data",
    ziwei: "Ziwei Doushu Chart Data",
    sukuyo: "27 Sukuyo Mansion Data",
    westernAstrology: "Western Astrology Chart Data",
    vedicAstrology: "Vedic Astrology Chart Data",
  },
  gateCheckTitle: "Checking pass",
  gateCheckCompleteTitle: "Pass check complete",
  gateCheckCompleteMessage: "Your pass has been confirmed. Reading the flow of your karma.",
  gateCheckFailedTitle: "Pass check failed",
  statusPreparing: "Unfolding the record of your destiny",
  statusPayment: "Please check the checkout window",
  statusReading: "Reading the recurring patterns of life and the flow of karma",
  statusReady: "The consultation is continuing",
  statusIdle: "Ready to unfold the thread of your destiny",
  accessTypeLabelPrefix: "Access method: ",
  heroAriaLabel: "Karma Destiny Expert Consultation",
  heroTitle: "Karma Destiny Expert Consultation",
  heroDescription: "In the recurring flow of your life, we reveal the pattern you need to break and the new path you need to open now.",
  premiumMapAriaLabel: "Karma Destiny Consultation Composition",
  premiumMapHeading: "A Karma Destiny Report Spanning 30,000+ Characters",
  premiumMapDesc: "Fitting a $35 consultation, we weave Saju, astrology, and Vedic symbolism together with real-world action strategies across a 16-chapter narrative.",
  formHeading: "Information to Read the Thread of Your Destiny",
  profileLoadAria: "Load birth information from profile card",
  profileLoadCta: "Load from profile card",
  nameOrNicknameLabel: "Name or nickname",
  namePlaceholder: "e.g. Harin",
  genderLabel: "Gender",
  genderSelectOption: "Select",
  genderFemale: "Female",
  genderMale: "Male",
  genderUnknown: "Prefer not to say",
  birthDateLabel: "Birth date",
  calendarTypeLabel: "Solar / lunar calendar",
  calendarSolarOption: "Solar",
  calendarLunarOption: "Lunar",
  birthTimeLabel: "Birth time",
  birthTimeUnknownLabel: "Birth time unknown",
  birthTimeUnknownNote: "We'll focus on the flow that can be read from the information you provided.",
  birthPlaceHeading: "Birthplace",
  majorCityLabel: "Major city",
  customInputOrSelectOption: "Enter manually or select",
  cityLabel: "City",
  countryLabel: "Country",
  latitudeLabel: "Latitude",
  longitudeLabel: "Longitude",
  timezoneLabel: "Timezone",
  topicLabel: "Consultation topic",
  questionLabel: "What you're most curious about right now",
  questionPlaceholderCustom: "Please write the knot of destiny you'd most like to untangle right now.",
  questionPlaceholderDefault: "Leave blank and the consultation will focus on your chosen topic.",
  priceLabelPrefix: "Consultation price ",
  submitBusyLabel: "Following the thread of your destiny...",
  submitCta: "Get Your Karma Destiny Expert Consultation",
  resultCardHeading: "Consultation Card",
  fullscreenCta: "Fullscreen",
  summaryKeywordLabel: "Key karma keywords",
  repeatingPatternLabel: "Recurring pattern",
  repeatingPatternFallback: "A flow where familiar emotional reactions repeat the same choices",
  currentTaskLabel: "Current task to resolve",
  currentTaskFallback: "Practicing a different choice in the same scene",
  sajuLensLabel: "Saju",
  westernLensLabel: "Western Astrology",
  vedicLensLabel: "Vedic Astrology",
  emptyStateTitle: "Ready to unfold the thread of your destiny.",
  emptyStateDesc: "Based on the information you entered, the consultation connects your recurring life patterns with your current question.",
  assistantRoleLabel: "Consultant",
  userRoleLabel: "Me",
  followUpPlaceholder: "Ask a follow-up about the flow you'd like to explore more deeply.",
  askCta: "Ask",
  defaultKeywords: ["Recurring choices", "Knots in relationships", "Unfinished talent"],
  resultModalTitle: "Letter of Destiny",
  savingLabel: "Saving",
  pdfSaveLabel: "Save PDF",
  closeAriaLabel: "Close",
  coverSubtitleNoBirthDate: "Birth date not entered",
  defaultUserName: "You",
  pdfCoverTitle: (name) => `${name}'s Letter of Karma Destiny`,
  pdfCoverSubtitleLine: (name) => `${name}'s Destiny (命) · Karma (業) · Time (時)`,
  pdfDownloadErrorMessage: "Something went wrong while saving the PDF. Please try again in a moment.",
  chartDataHeading: "Chart Data Used in the Consultation",
  chartDataDesc: "Includes the calculated values from Saju, Western astrology, and Vedic astrology together.",
};

const KARMA_DESTINY_COPY: Partial<Record<LoadingLocale, KarmaDestinyCopy>> = {
  ko: {
    featureReason: "운명의 업 전문가 상담",
    loginRequiredMessage: "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.",
    paymentRequiredMessage: "운명의 업 전문가 상담 이용권이 필요합니다. 결제창을 열어드릴게요.",
    paymentVerifyFailedMessage: "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.",
    paymentCancelledMessage: "결제가 취소되었습니다. 필요할 때 다시 진행할 수 있습니다.",
    serverErrorMessage: "상담을 준비하는 중 문제가 발생했습니다. 결제 금액은 차감되지 않았습니다.",
    llmErrorMessage: "상담문을 생성하는 중 문제가 발생했어요. 차감된 내역이 있다면 자동으로 복구됩니다.",
    requiredInputMessage: "운명의 업 상담에 필요한 정보가 부족해요. 생년월일, 성별, 출생시간 정보를 다시 확인해 주세요.",
    birthTimeRequiredMessage: "운명의 업 상담은 출생시간에 따라 해석의 깊이가 달라져요. 출생시간을 입력하거나 '출생시간 모름'을 선택해 주세요.",
    customQuestionRequiredMessage: "직접 질문을 선택했다면 지금 가장 궁금한 내용을 짧게 적어 주세요.",
    networkErrorMessage: "연결이 불안정해요. 잠시 후 다시 시도해 주세요.",
    karmaSectionFallbackTitles: [
      "業 — 운명의 핵심 주제", "源 — 운명의 근원", "流 — 현재 삶의 흐름", "課 — 업의 핵심 과제",
      "緣 — 인간관계의 업", "情 — 사랑의 업", "財 — 돈의 업", "職 — 직업의 업", "體 — 건강 에너지",
      "才 — 숨겨진 재능", "轉 — 운명의 전환점", "策 — 앞으로의 성장 전략", "總 — 다섯 관점의 종합 결론",
      "句 — 운명을 바꾸는 핵심 문장", "箋 — 최종 편지",
    ],
    loadingStageLabels: [
      "사주의 기둥을 세우는 중...", "자미두수 12궁을 펼치는 중...", "숙요 27수의 인연을 잇는 중...",
      "별자리의 심리를 읽는 중...", "베다의 업을 헤아리는 중...", "다섯 관점을 하나로 모으는 중...",
    ],
    premiumValueCards: [
      "반복되는 관계의 업", "돈과 생존의 패턴", "직업과 사명의 방향", "원가족과 감정의 빚",
      "앞으로 1년의 해소 흐름", "3년 장기 운명 전략", "상담가의 최종 편지",
    ],
    focusAreaLabel: {
      overall: "전체 운명의 업", lifePattern: "반복되는 인생 패턴", love: "사랑과 이별의 업",
      money: "돈에서 반복되는 흐름", career: "일과 사명의 방향", relationship: "관계에서 반복되는 감정",
      family: "가족과 인연의 업", spirituality: "내면과 영혼의 성장", custom: "직접 질문",
    },
    placePresetLabel: {
      Seoul: "서울, 대한민국", Busan: "부산, 대한민국", Tokyo: "도쿄, 일본", "New York": "뉴욕, 미국",
      "Los Angeles": "로스앤젤레스, 미국", London: "런던, 영국", Paris: "파리, 프랑스",
    },
    lensFallbackSummary: {
      saju: "일간과 오행의 균형으로 반복되는 선택 습관을 살핍니다.",
      ziwei: "명궁과 12궁의 배치로 삶의 무대와 사회적 역할을 살핍니다.",
      sukuyo: "본명숙과 27수의 거리로 인연에서 서게 되는 자리를 살핍니다.",
      westernAstrology: "태양과 달의 흐름으로 마음의 반복 방식을 살핍니다.",
      vedicAstrology: "라후와 케투의 축으로 익숙한 습관과 성장 방향을 살핍니다.",
    },
    chartBlockLabel: { saju: "명리", ziwei: "자미두수", sukuyo: "숙요", westernAstrology: "서양 점성술", vedicAstrology: "베다 점성술" },
    chartBlockTitle: {
      saju: "사주 원국 데이터", ziwei: "자미두수 명반 데이터", sukuyo: "숙요 27수 데이터",
      westernAstrology: "서양 점성술 차트 데이터", vedicAstrology: "베다 점성술 차트 데이터",
    },
    gateCheckTitle: "이용권 확인",
    gateCheckCompleteTitle: "이용권 확인 완료",
    gateCheckCompleteMessage: "이용권 확인이 끝났습니다. 업의 흐름을 읽고 있습니다.",
    gateCheckFailedTitle: "이용권 확인 실패",
    statusPreparing: "운명의 기록을 펼치고 있습니다",
    statusPayment: "결제창을 확인해 주세요",
    statusReading: "삶의 반복 패턴과 업의 흐름을 읽고 있습니다",
    statusReady: "상담이 이어지고 있습니다",
    statusIdle: "운명의 실을 펼칠 준비가 되어 있습니다",
    accessTypeLabelPrefix: "이용 방식: ",
    heroAriaLabel: "운명의 업 전문가 상담",
    heroTitle: "운명의 업 전문가 상담",
    heroDescription: "반복되는 인생의 흐름 속에서, 지금 끊어내야 할 패턴과 새롭게 열어야 할 길을 읽어드립니다.",
    premiumMapAriaLabel: "운명의 업 상담 구성",
    premiumMapHeading: "30,000자 이상으로 여는 운명의 업 리포트",
    premiumMapDesc: "5만 원 상담에 맞게 명리, 점성, 베다 상징과 현실 행동 전략을 16장 장문 흐름으로 엮습니다.",
    formHeading: "운명의 실을 읽기 위한 정보",
    profileLoadAria: "프로필 카드에서 출생 정보 불러오기",
    profileLoadCta: "프로필 카드에서 불러오기",
    nameOrNicknameLabel: "이름 또는 닉네임",
    namePlaceholder: "예: 하린",
    genderLabel: "성별",
    genderSelectOption: "선택",
    genderFemale: "여성",
    genderMale: "남성",
    genderUnknown: "비공개",
    birthDateLabel: "생년월일",
    calendarTypeLabel: "양력/음력",
    calendarSolarOption: "양력",
    calendarLunarOption: "음력",
    birthTimeLabel: "출생시간",
    birthTimeUnknownLabel: "출생시간 모름",
    birthTimeUnknownNote: "입력된 정보 기준으로 본 흐름을 중심으로 살피겠습니다.",
    birthPlaceHeading: "출생지",
    majorCityLabel: "주요 도시",
    customInputOrSelectOption: "직접 입력 또는 선택",
    cityLabel: "도시",
    countryLabel: "국가",
    latitudeLabel: "위도",
    longitudeLabel: "경도",
    timezoneLabel: "시간대",
    topicLabel: "상담 주제",
    questionLabel: "현재 가장 궁금한 질문",
    questionPlaceholderCustom: "지금 가장 풀고 싶은 운명의 매듭을 적어 주세요.",
    questionPlaceholderDefault: "비워두면 선택한 주제를 중심으로 상담이 이어집니다.",
    priceLabelPrefix: "상담 이용 가격 ",
    submitBusyLabel: "운명의 실을 따라가는 중...",
    submitCta: "운명의 업 전문가 상담 받기",
    resultCardHeading: "상담 카드",
    fullscreenCta: "전체화면",
    summaryKeywordLabel: "업의 핵심 키워드",
    repeatingPatternLabel: "반복 패턴",
    repeatingPatternFallback: "익숙한 감정 반응이 선택을 되풀이하는 흐름",
    currentTaskLabel: "현재 풀어야 할 과제",
    currentTaskFallback: "같은 장면에서 다른 선택을 연습하는 일",
    sajuLensLabel: "사주",
    westernLensLabel: "서양 점성술",
    vedicLensLabel: "베다 점성술",
    emptyStateTitle: "운명의 실을 펼칠 준비가 되어 있습니다.",
    emptyStateDesc: "입력한 정보를 기준으로 반복되는 삶의 패턴과 지금의 질문을 연결해 상담이 이어집니다.",
    assistantRoleLabel: "상담가",
    userRoleLabel: "나",
    followUpPlaceholder: "더 깊게 보고 싶은 흐름을 이어서 물어보세요.",
    askCta: "질문하기",
    defaultKeywords: ["반복 선택", "관계의 매듭", "재능의 숙제"],
    resultModalTitle: "운명의 답장",
    savingLabel: "저장 중",
    pdfSaveLabel: "PDF 저장",
    closeAriaLabel: "닫기",
    coverSubtitleNoBirthDate: "생년월일 미입력",
    defaultUserName: "당신",
    pdfCoverTitle: (name) => `${name}님의 운명의 업 답장`,
    pdfCoverSubtitleLine: (name) => `${name}님의 명(命) · 업(業) · 시(時)`,
    pdfDownloadErrorMessage: "PDF 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    chartDataHeading: "상담에 사용된 차트 데이터",
    chartDataDesc: "명리, 서양 점성술, 베다 점성술의 계산값을 함께 담았습니다.",
  },
  en: KARMA_DESTINY_EN,
  ja: {
    featureReason: "運命の業専門家相談",
    loginRequiredMessage: "相談を始めるにはログインが必要です。ログイン後にもう一度お試しください。",
    paymentRequiredMessage: "運命の業専門家相談の利用権が必要です。決済画面を開きます。",
    paymentVerifyFailedMessage: "決済確認が完了していません。決済が完了している場合は、しばらくしてからもう一度お試しください。",
    paymentCancelledMessage: "決済がキャンセルされました。必要な時にまた進めることができます。",
    serverErrorMessage: "相談を準備中に問題が発生しました。決済金額は差し引かれていません。",
    llmErrorMessage: "相談文の生成中に問題が発生しました。差し引かれた履歴があれば自動的に復元されます。",
    requiredInputMessage: "運命の業相談に必要な情報が不足しています。生年月日、性別、出生時刻を再度ご確認ください。",
    birthTimeRequiredMessage: "運命の業相談は出生時刻によって解釈の深さが変わります。出生時刻を入力するか「出生時刻不明」を選択してください。",
    customQuestionRequiredMessage: "自分で質問を選んだ場合は、今最も知りたい内容を短く書いてください。",
    networkErrorMessage: "接続が不安定です。しばらくしてからもう一度お試しください。",
    karmaSectionFallbackTitles: [
      "業 — 運命の核心テーマ", "源 — 運命の根源", "流 — 現在の人生の流れ", "課 — 業の核心課題",
      "緣 — 人間関係の業", "情 — 愛の業", "財 — お金の業", "職 — 仕事の業", "體 — 健康エネルギー",
      "才 — 隠された才能", "轉 — 運命の転換点", "策 — これからの成長戦略", "總 — 五つの視点の総合結論",
      "句 — 運命を変える核心の一文", "箋 — 最終の手紙",
    ],
    loadingStageLabels: [
      "四柱の柱を立てています...", "紫微斗数の十二宮を展開しています...", "宿曜二十七宿の縁を結んでいます...",
      "星座の心理を読み解いています...", "ヴェーダの業を見極めています...", "五つの視点をひとつにまとめています...",
    ],
    premiumValueCards: [
      "繰り返される関係の業", "お金と生存のパターン", "仕事と使命の方向", "原家族と感情の負債",
      "これから1年の解消の流れ", "3年の長期運命戦略", "相談者からの最終の手紙",
    ],
    focusAreaLabel: {
      overall: "全体的な運命の業", lifePattern: "繰り返される人生のパターン", love: "愛と別れの業",
      money: "お金で繰り返される流れ", career: "仕事と使命の方向", relationship: "関係で繰り返される感情",
      family: "家族と縁の業", spirituality: "内面と魂の成長", custom: "自分で質問する",
    },
    placePresetLabel: {
      Seoul: "ソウル、韓国", Busan: "釜山、韓国", Tokyo: "東京、日本", "New York": "ニューヨーク、米国",
      "Los Angeles": "ロサンゼルス、米国", London: "ロンドン、英国", Paris: "パリ、フランス",
    },
    lensFallbackSummary: {
      saju: "日干と五行のバランスから繰り返される選択の習慣を見ます。",
      ziwei: "命宮と十二宮の配置から人生の舞台と社会的役割を見ます。",
      sukuyo: "本命宿と二十七宿の距離から縁において立つ位置を見ます。",
      westernAstrology: "太陽と月の流れから心の繰り返しパターンを見ます。",
      vedicAstrology: "ラーフとケートゥの軸から慣れた習慣と成長方向を見ます。",
    },
    chartBlockLabel: { saju: "四柱推命", ziwei: "紫微斗数", sukuyo: "宿曜", westernAstrology: "西洋占星術", vedicAstrology: "ヴェーダ占星術" },
    chartBlockTitle: {
      saju: "四柱命式データ", ziwei: "紫微斗数命盤データ", sukuyo: "宿曜二十七宿データ",
      westernAstrology: "西洋占星術チャートデータ", vedicAstrology: "ヴェーダ占星術チャートデータ",
    },
    gateCheckTitle: "利用権確認",
    gateCheckCompleteTitle: "利用権確認完了",
    gateCheckCompleteMessage: "利用権の確認が終わりました。業の流れを読み取っています。",
    gateCheckFailedTitle: "利用権確認失敗",
    statusPreparing: "運命の記録を展開しています",
    statusPayment: "決済画面をご確認ください",
    statusReading: "人生の繰り返しパターンと業の流れを読み取っています",
    statusReady: "相談が続いています",
    statusIdle: "運命の糸を広げる準備ができています",
    accessTypeLabelPrefix: "利用方式: ",
    heroAriaLabel: "運命の業専門家相談",
    heroTitle: "運命の業専門家相談",
    heroDescription: "繰り返される人生の流れの中で、今断ち切るべきパターンと新たに開くべき道を読み解きます。",
    premiumMapAriaLabel: "運命の業相談の構成",
    premiumMapHeading: "30,000字以上で開く運命の業レポート",
    premiumMapDesc: "5万円の相談に見合うよう、命理・占星・ヴェーダの象徴と現実的な行動戦略を16章の長文で編みます。",
    formHeading: "運命の糸を読むための情報",
    profileLoadAria: "プロフィールカードから出生情報を読み込む",
    profileLoadCta: "プロフィールカードから読み込む",
    nameOrNicknameLabel: "名前またはニックネーム",
    namePlaceholder: "例：ハリン",
    genderLabel: "性別",
    genderSelectOption: "選択",
    genderFemale: "女性",
    genderMale: "男性",
    genderUnknown: "非公開",
    birthDateLabel: "生年月日",
    calendarTypeLabel: "新暦/旧暦",
    calendarSolarOption: "新暦",
    calendarLunarOption: "旧暦",
    birthTimeLabel: "出生時刻",
    birthTimeUnknownLabel: "出生時刻不明",
    birthTimeUnknownNote: "入力された情報を基にした流れを中心に見ていきます。",
    birthPlaceHeading: "出生地",
    majorCityLabel: "主要都市",
    customInputOrSelectOption: "直接入力または選択",
    cityLabel: "都市",
    countryLabel: "国",
    latitudeLabel: "緯度",
    longitudeLabel: "経度",
    timezoneLabel: "タイムゾーン",
    topicLabel: "相談テーマ",
    questionLabel: "今最も気になる質問",
    questionPlaceholderCustom: "今最も解きたい運命の結び目を書いてください。",
    questionPlaceholderDefault: "空欄のままにすると、選択したテーマを中心に相談が続きます。",
    priceLabelPrefix: "相談利用価格 ",
    submitBusyLabel: "運命の糸をたどっています...",
    submitCta: "運命の業専門家相談を受ける",
    resultCardHeading: "相談カード",
    fullscreenCta: "全画面表示",
    summaryKeywordLabel: "業の核心キーワード",
    repeatingPatternLabel: "繰り返しパターン",
    repeatingPatternFallback: "慣れた感情反応が選択を繰り返す流れ",
    currentTaskLabel: "今解くべき課題",
    currentTaskFallback: "同じ場面で違う選択を練習すること",
    sajuLensLabel: "四柱推命",
    westernLensLabel: "西洋占星術",
    vedicLensLabel: "ヴェーダ占星術",
    emptyStateTitle: "運命の糸を広げる準備ができています。",
    emptyStateDesc: "入力された情報を基に、繰り返される人生のパターンと今の質問をつないで相談が続きます。",
    assistantRoleLabel: "相談者",
    userRoleLabel: "自分",
    followUpPlaceholder: "もっと深く知りたい流れを続けて質問してください。",
    askCta: "質問する",
    defaultKeywords: ["繰り返す選択", "関係の結び目", "才能の宿題"],
    resultModalTitle: "運命の返信",
    savingLabel: "保存中",
    pdfSaveLabel: "PDF保存",
    closeAriaLabel: "閉じる",
    coverSubtitleNoBirthDate: "生年月日未入力",
    defaultUserName: "あなた",
    pdfCoverTitle: (name) => `${name}様の運命の業への返信`,
    pdfCoverSubtitleLine: (name) => `${name}様の命(命)・業(業)・時(時)`,
    pdfDownloadErrorMessage: "PDF保存中に問題が発生しました。しばらくしてからもう一度お試しください。",
    chartDataHeading: "相談に使用されたチャートデータ",
    chartDataDesc: "命理、西洋占星術、ヴェーダ占星術の計算値をまとめて掲載しています。",
  },
  "zh-CN": {
    featureReason: "命运业力专家咨询",
    loginRequiredMessage: "开始咨询需要登录。请登录后重试。",
    paymentRequiredMessage: "需要命运业力专家咨询的使用权。我们将为您打开结账页面。",
    paymentVerifyFailedMessage: "支付确认尚未完成。如果已完成支付，请稍后重试。",
    paymentCancelledMessage: "支付已取消。您可以在需要时再次进行。",
    serverErrorMessage: "准备咨询时发生了问题。未扣除支付金额。",
    llmErrorMessage: "生成咨询内容时发生了问题。如有扣款记录将自动恢复。",
    requiredInputMessage: "命运业力咨询所需信息不足。请重新确认出生日期、性别和出生时间。",
    birthTimeRequiredMessage: '命运业力咨询的解读深度取决于出生时间。请输入出生时间或选择"出生时间不详"。',
    customQuestionRequiredMessage: "如果选择了自定义问题，请简短写下您现在最想了解的内容。",
    networkErrorMessage: "连接似乎不稳定。请稍后重试。",
    karmaSectionFallbackTitles: [
      "業 — 命运的核心主题", "源 — 命运的根源", "流 — 当下人生的流向", "課 — 业力的核心课题",
      "緣 — 人际关系的业", "情 — 爱情的业", "財 — 金钱的业", "職 — 事业的业", "體 — 健康能量",
      "才 — 隐藏的才能", "轉 — 命运的转折点", "策 — 未来的成长策略", "總 — 五种视角的综合结论",
      "句 — 改变命运的关键一句", "箋 — 最终的信",
    ],
    loadingStageLabels: [
      "正在立起四柱的支柱...", "正在展开紫微斗数十二宫...", "正在连结宿曜二十七宿的缘分...",
      "正在解读星座的心理...", "正在权衡吠陀的业力...", "正在将五种视角汇聚为一...",
    ],
    premiumValueCards: [
      "反复出现的关系之业", "金钱与生存的模式", "事业与使命的方向", "原生家庭与情感的债",
      "未来一年的化解流向", "三年长期命运策略", "咨询师的最终信件",
    ],
    focusAreaLabel: {
      overall: "整体命运业力", lifePattern: "反复出现的人生模式", love: "爱情与离别之业",
      money: "金钱上反复出现的流向", career: "事业与使命的方向", relationship: "关系中反复出现的情绪",
      family: "家庭与缘分之业", spirituality: "内在与心灵成长", custom: "自定义问题",
    },
    placePresetLabel: {
      Seoul: "首尔，韩国", Busan: "釜山，韩国", Tokyo: "东京，日本", "New York": "纽约，美国",
      "Los Angeles": "洛杉矶，美国", London: "伦敦，英国", Paris: "巴黎，法国",
    },
    lensFallbackSummary: {
      saju: "通过日干与五行的平衡，观察反复出现的选择习惯。",
      ziwei: "通过命宫与十二宫的配置，观察人生的舞台与社会角色。",
      sukuyo: "通过本命宿与二十七宿的距离，观察在缘分中所处的位置。",
      westernAstrology: "通过太阳与月亮的走势，观察内心反复出现的模式。",
      vedicAstrology: "通过罗睺与计都的轴线，观察熟悉的习惯与成长方向。",
    },
    chartBlockLabel: { saju: "命理", ziwei: "紫微斗数", sukuyo: "宿曜", westernAstrology: "西方占星术", vedicAstrology: "吠陀占星术" },
    chartBlockTitle: {
      saju: "四柱原局数据", ziwei: "紫微斗数命盘数据", sukuyo: "宿曜二十七宿数据",
      westernAstrology: "西方占星术星盘数据", vedicAstrology: "吠陀占星术星盘数据",
    },
    gateCheckTitle: "确认使用权",
    gateCheckCompleteTitle: "使用权确认完成",
    gateCheckCompleteMessage: "使用权确认已完成，正在解读业力走势。",
    gateCheckFailedTitle: "使用权确认失败",
    statusPreparing: "正在展开命运的记录",
    statusPayment: "请确认结账页面",
    statusReading: "正在解读人生反复出现的模式与业力走势",
    statusReady: "咨询仍在继续",
    statusIdle: "已准备好展开命运之线",
    accessTypeLabelPrefix: "使用方式: ",
    heroAriaLabel: "命运业力专家咨询",
    heroTitle: "命运业力专家咨询",
    heroDescription: "在反复出现的人生流向中，为您解读现在需要斩断的模式与需要开启的新道路。",
    premiumMapAriaLabel: "命运业力咨询构成",
    premiumMapHeading: "3万字以上展开的命运业力报告",
    premiumMapDesc: "配合高价咨询，将命理、占星、吠陀象征与现实行动策略编织成16章长文流程。",
    formHeading: "解读命运之线所需的信息",
    profileLoadAria: "从个人资料卡加载出生信息",
    profileLoadCta: "从个人资料卡加载",
    nameOrNicknameLabel: "姓名或昵称",
    namePlaceholder: "例：夏琳",
    genderLabel: "性别",
    genderSelectOption: "选择",
    genderFemale: "女性",
    genderMale: "男性",
    genderUnknown: "不公开",
    birthDateLabel: "出生日期",
    calendarTypeLabel: "公历/农历",
    calendarSolarOption: "公历",
    calendarLunarOption: "农历",
    birthTimeLabel: "出生时间",
    birthTimeUnknownLabel: "出生时间不详",
    birthPlaceHeading: "出生地",
    birthTimeUnknownNote: "将以您所输入的信息为基础，聚焦相应的走势进行解读。",
    majorCityLabel: "主要城市",
    customInputOrSelectOption: "手动输入或选择",
    cityLabel: "城市",
    countryLabel: "国家",
    latitudeLabel: "纬度",
    longitudeLabel: "经度",
    timezoneLabel: "时区",
    topicLabel: "咨询主题",
    questionLabel: "现在最想了解的问题",
    questionPlaceholderCustom: "请写下您现在最想解开的命运结。",
    questionPlaceholderDefault: "留空则咨询将围绕您选择的主题展开。",
    priceLabelPrefix: "咨询使用价格 ",
    submitBusyLabel: "正在追寻命运之线...",
    submitCta: "获取命运业力专家咨询",
    resultCardHeading: "咨询卡片",
    fullscreenCta: "全屏",
    summaryKeywordLabel: "业力核心关键词",
    repeatingPatternLabel: "反复模式",
    repeatingPatternFallback: "熟悉的情绪反应反复引导相同选择的流向",
    currentTaskLabel: "当前需要解决的课题",
    currentTaskFallback: "在相同场景中练习不同的选择",
    sajuLensLabel: "命理",
    westernLensLabel: "西方占星术",
    vedicLensLabel: "吠陀占星术",
    emptyStateTitle: "已准备好展开命运之线。",
    emptyStateDesc: "咨询将以您输入的信息为基础，连接反复出现的人生模式与您当前的问题。",
    assistantRoleLabel: "咨询师",
    userRoleLabel: "我",
    followUpPlaceholder: "请继续追问您想更深入了解的走向。",
    askCta: "提问",
    defaultKeywords: ["反复的选择", "关系的结", "才能的课题"],
    resultModalTitle: "命运的回信",
    savingLabel: "保存中",
    pdfSaveLabel: "保存PDF",
    closeAriaLabel: "关闭",
    coverSubtitleNoBirthDate: "未输入出生日期",
    defaultUserName: "您",
    pdfCoverTitle: (name) => `${name}的命运业力回信`,
    pdfCoverSubtitleLine: (name) => `${name}的命·业·时`,
    pdfDownloadErrorMessage: "保存PDF时发生了问题。请稍后重试。",
    chartDataHeading: "咨询中使用的星盘数据",
    chartDataDesc: "汇总了命理、西方占星术、吠陀占星术的计算值。",
  },
  "zh-TW": {
    featureReason: "命運業力專家諮詢",
    loginRequiredMessage: "開始諮詢需要登入。請登入後重試。",
    paymentRequiredMessage: "需要命運業力專家諮詢的使用權。我們將為您開啟結帳頁面。",
    paymentVerifyFailedMessage: "付款確認尚未完成。如果已完成付款，請稍後重試。",
    paymentCancelledMessage: "付款已取消。您可以在需要時再次進行。",
    serverErrorMessage: "準備諮詢時發生了問題。未扣除付款金額。",
    llmErrorMessage: "生成諮詢內容時發生了問題。如有扣款記錄將自動恢復。",
    requiredInputMessage: "命運業力諮詢所需資訊不足。請重新確認出生日期、性別和出生時間。",
    birthTimeRequiredMessage: "命運業力諮詢的解讀深度取決於出生時間。請輸入出生時間或選擇「出生時間不詳」。",
    customQuestionRequiredMessage: "如果選擇了自訂問題，請簡短寫下您現在最想了解的內容。",
    networkErrorMessage: "連線似乎不穩定。請稍後重試。",
    karmaSectionFallbackTitles: [
      "業 — 命運的核心主題", "源 — 命運的根源", "流 — 當下人生的流向", "課 — 業力的核心課題",
      "緣 — 人際關係的業", "情 — 愛情的業", "財 — 金錢的業", "職 — 事業的業", "體 — 健康能量",
      "才 — 隱藏的才能", "轉 — 命運的轉折點", "策 — 未來的成長策略", "總 — 五種視角的綜合結論",
      "句 — 改變命運的關鍵一句", "箋 — 最終的信",
    ],
    loadingStageLabels: [
      "正在立起四柱的支柱...", "正在展開紫微斗數十二宮...", "正在連結宿曜二十七宿的緣分...",
      "正在解讀星座的心理...", "正在權衡吠陀的業力...", "正在將五種視角匯聚為一...",
    ],
    premiumValueCards: [
      "反覆出現的關係之業", "金錢與生存的模式", "事業與使命的方向", "原生家庭與情感的債",
      "未來一年的化解流向", "三年長期命運策略", "諮詢師的最終信件",
    ],
    focusAreaLabel: {
      overall: "整體命運業力", lifePattern: "反覆出現的人生模式", love: "愛情與離別之業",
      money: "金錢上反覆出現的流向", career: "事業與使命的方向", relationship: "關係中反覆出現的情緒",
      family: "家庭與緣分之業", spirituality: "內在與心靈成長", custom: "自訂問題",
    },
    placePresetLabel: {
      Seoul: "首爾，韓國", Busan: "釜山，韓國", Tokyo: "東京，日本", "New York": "紐約，美國",
      "Los Angeles": "洛杉磯，美國", London: "倫敦，英國", Paris: "巴黎，法國",
    },
    lensFallbackSummary: {
      saju: "透過日干與五行的平衡，觀察反覆出現的選擇習慣。",
      ziwei: "透過命宮與十二宮的配置，觀察人生的舞台與社會角色。",
      sukuyo: "透過本命宿與二十七宿的距離，觀察在緣分中所處的位置。",
      westernAstrology: "透過太陽與月亮的走勢，觀察內心反覆出現的模式。",
      vedicAstrology: "透過羅睺與計都的軸線，觀察熟悉的習慣與成長方向。",
    },
    chartBlockLabel: { saju: "命理", ziwei: "紫微斗數", sukuyo: "宿曜", westernAstrology: "西方占星術", vedicAstrology: "吠陀占星術" },
    chartBlockTitle: {
      saju: "四柱原局資料", ziwei: "紫微斗數命盤資料", sukuyo: "宿曜二十七宿資料",
      westernAstrology: "西方占星術星盤資料", vedicAstrology: "吠陀占星術星盤資料",
    },
    gateCheckTitle: "確認使用權",
    gateCheckCompleteTitle: "使用權確認完成",
    gateCheckCompleteMessage: "使用權確認已完成，正在解讀業力走勢。",
    gateCheckFailedTitle: "使用權確認失敗",
    statusPreparing: "正在展開命運的記錄",
    statusPayment: "請確認結帳頁面",
    statusReading: "正在解讀人生反覆出現的模式與業力走勢",
    statusReady: "諮詢仍在繼續",
    statusIdle: "已準備好展開命運之線",
    accessTypeLabelPrefix: "使用方式: ",
    heroAriaLabel: "命運業力專家諮詢",
    heroTitle: "命運業力專家諮詢",
    heroDescription: "在反覆出現的人生流向中，為您解讀現在需要斬斷的模式與需要開啟的新道路。",
    premiumMapAriaLabel: "命運業力諮詢構成",
    premiumMapHeading: "3萬字以上展開的命運業力報告",
    premiumMapDesc: "配合高價諮詢，將命理、占星、吠陀象徵與現實行動策略編織成16章長文流程。",
    formHeading: "解讀命運之線所需的資訊",
    profileLoadAria: "從個人資料卡載入出生資訊",
    profileLoadCta: "從個人資料卡載入",
    nameOrNicknameLabel: "姓名或暱稱",
    namePlaceholder: "例：夏琳",
    genderLabel: "性別",
    genderSelectOption: "選擇",
    genderFemale: "女性",
    genderMale: "男性",
    genderUnknown: "不公開",
    birthDateLabel: "出生日期",
    calendarTypeLabel: "陽曆/農曆",
    calendarSolarOption: "陽曆",
    calendarLunarOption: "農曆",
    birthTimeLabel: "出生時間",
    birthTimeUnknownLabel: "出生時間不詳",
    birthTimeUnknownNote: "將以您所輸入的資訊為基礎，聚焦相應的走勢進行解讀。",
    birthPlaceHeading: "出生地",
    majorCityLabel: "主要城市",
    customInputOrSelectOption: "手動輸入或選擇",
    cityLabel: "城市",
    countryLabel: "國家",
    latitudeLabel: "緯度",
    longitudeLabel: "經度",
    timezoneLabel: "時區",
    topicLabel: "諮詢主題",
    questionLabel: "現在最想了解的問題",
    questionPlaceholderCustom: "請寫下您現在最想解開的命運結。",
    questionPlaceholderDefault: "留空則諮詢將圍繞您選擇的主題展開。",
    priceLabelPrefix: "諮詢使用價格 ",
    submitBusyLabel: "正在追尋命運之線...",
    submitCta: "獲取命運業力專家諮詢",
    resultCardHeading: "諮詢卡片",
    fullscreenCta: "全螢幕",
    summaryKeywordLabel: "業力核心關鍵詞",
    repeatingPatternLabel: "反覆模式",
    repeatingPatternFallback: "熟悉的情緒反應反覆引導相同選擇的流向",
    currentTaskLabel: "當前需要解決的課題",
    currentTaskFallback: "在相同場景中練習不同的選擇",
    sajuLensLabel: "命理",
    westernLensLabel: "西方占星術",
    vedicLensLabel: "吠陀占星術",
    emptyStateTitle: "已準備好展開命運之線。",
    emptyStateDesc: "諮詢將以您輸入的資訊為基礎，連接反覆出現的人生模式與您當前的問題。",
    assistantRoleLabel: "諮詢師",
    userRoleLabel: "我",
    followUpPlaceholder: "請繼續追問您想更深入了解的走向。",
    askCta: "提問",
    defaultKeywords: ["反覆的選擇", "關係的結", "才能的課題"],
    resultModalTitle: "命運的回信",
    savingLabel: "儲存中",
    pdfSaveLabel: "儲存PDF",
    closeAriaLabel: "關閉",
    coverSubtitleNoBirthDate: "未輸入出生日期",
    defaultUserName: "您",
    pdfCoverTitle: (name) => `${name}的命運業力回信`,
    pdfCoverSubtitleLine: (name) => `${name}的命·業·時`,
    pdfDownloadErrorMessage: "儲存PDF時發生了問題。請稍後重試。",
    chartDataHeading: "諮詢中使用的星盤資料",
    chartDataDesc: "彙整了命理、西方占星術、吠陀占星術的計算值。",
  },
  vi: {
    featureReason: "Tư vấn chuyên gia Nghiệp Số Mệnh",
    loginRequiredMessage: "Bạn cần đăng nhập để bắt đầu tư vấn. Vui lòng đăng nhập và thử lại.",
    paymentRequiredMessage: "Bạn cần có thẻ sử dụng cho buổi tư vấn chuyên gia Nghiệp Số Mệnh. Chúng tôi sẽ mở trang thanh toán cho bạn.",
    paymentVerifyFailedMessage: "Xác nhận thanh toán chưa hoàn tất. Nếu bạn đã thanh toán, vui lòng thử lại sau ít phút.",
    paymentCancelledMessage: "Thanh toán đã bị hủy. Bạn có thể tiến hành lại khi cần.",
    serverErrorMessage: "Đã xảy ra sự cố khi chuẩn bị tư vấn. Không có khoản thanh toán nào bị trừ.",
    llmErrorMessage: "Đã xảy ra sự cố khi tạo nội dung tư vấn. Nếu có khoản đã bị trừ sẽ được tự động khôi phục.",
    requiredInputMessage: "Thiếu thông tin cần thiết cho tư vấn Nghiệp Số Mệnh. Vui lòng kiểm tra lại ngày sinh, giới tính và giờ sinh.",
    birthTimeRequiredMessage: "Độ sâu của buổi tư vấn Nghiệp Số Mệnh phụ thuộc vào giờ sinh. Vui lòng nhập giờ sinh hoặc chọn \"Không rõ giờ sinh\".",
    customQuestionRequiredMessage: "Nếu bạn chọn tự đặt câu hỏi, vui lòng viết ngắn gọn điều bạn muốn biết nhất lúc này.",
    networkErrorMessage: "Kết nối có vẻ không ổn định. Vui lòng thử lại sau ít phút.",
    karmaSectionFallbackTitles: [
      "業 — Chủ đề cốt lõi của số mệnh", "源 — Nguồn gốc số mệnh", "流 — Dòng chảy hiện tại của cuộc đời", "課 — Bài học cốt lõi của nghiệp",
      "緣 — Nghiệp của các mối quan hệ", "情 — Nghiệp của tình yêu", "財 — Nghiệp của tiền bạc", "職 — Nghiệp của sự nghiệp", "體 — Năng lượng sức khỏe",
      "才 — Tài năng tiềm ẩn", "轉 — Bước ngoặt của số mệnh", "策 — Chiến lược phát triển sắp tới", "總 — Kết luận tổng hợp từ năm góc nhìn",
      "句 — Câu nói cốt lõi thay đổi số mệnh", "箋 — Lá thư cuối cùng",
    ],
    loadingStageLabels: [
      "Đang dựng các trụ Tứ Trụ...", "Đang mở 12 cung Tử Vi...", "Đang kết nối duyên phận của 27 tú Sukuyo...",
      "Đang đọc tâm lý qua chòm sao...", "Đang cân nhắc nghiệp qua Vệ Đà...", "Đang gom năm góc nhìn thành một...",
    ],
    premiumValueCards: [
      "Nghiệp của các mối quan hệ lặp lại", "Khuôn mẫu về tiền bạc và sinh tồn", "Hướng đi của sự nghiệp và sứ mệnh", "Nợ tình cảm từ gia đình gốc",
      "Dòng chảy hóa giải trong năm tới", "Chiến lược số mệnh dài hạn 3 năm", "Lá thư cuối cùng từ chuyên gia tư vấn",
    ],
    focusAreaLabel: {
      overall: "Toàn bộ nghiệp số mệnh", lifePattern: "Khuôn mẫu cuộc đời lặp lại", love: "Nghiệp của tình yêu và chia ly",
      money: "Dòng chảy lặp lại về tiền bạc", career: "Hướng đi công việc và sứ mệnh", relationship: "Cảm xúc lặp lại trong mối quan hệ",
      family: "Nghiệp của gia đình và duyên phận", spirituality: "Sự phát triển nội tâm và tinh thần", custom: "Tự đặt câu hỏi",
    },
    placePresetLabel: {
      Seoul: "Seoul, Hàn Quốc", Busan: "Busan, Hàn Quốc", Tokyo: "Tokyo, Nhật Bản", "New York": "New York, Mỹ",
      "Los Angeles": "Los Angeles, Mỹ", London: "London, Anh", Paris: "Paris, Pháp",
    },
    lensFallbackSummary: {
      saju: "Xem xét thói quen lựa chọn lặp lại qua sự cân bằng của Nhật Can và Ngũ Hành.",
      ziwei: "Xem xét sân khấu cuộc đời và vai trò xã hội qua vị trí Mệnh Cung và 12 cung.",
      sukuyo: "Xem xét vị trí bạn thường đứng trong các mối quan hệ qua khoảng cách giữa tú bản mệnh và 27 tú.",
      westernAstrology: "Xem xét khuôn mẫu cảm xúc lặp lại qua dòng chảy của Mặt Trời và Mặt Trăng.",
      vedicAstrology: "Xem xét thói quen quen thuộc và hướng phát triển qua trục Rahu-Ketu.",
    },
    chartBlockLabel: { saju: "Tứ Trụ", ziwei: "Tử Vi Đẩu Số", sukuyo: "Sukuyo", westernAstrology: "Chiêm Tinh Phương Tây", vedicAstrology: "Chiêm Tinh Vệ Đà" },
    chartBlockTitle: {
      saju: "Dữ liệu lá số Tứ Trụ", ziwei: "Dữ liệu mệnh bàn Tử Vi", sukuyo: "Dữ liệu 27 tú Sukuyo",
      westernAstrology: "Dữ liệu lá số Chiêm Tinh Phương Tây", vedicAstrology: "Dữ liệu lá số Chiêm Tinh Vệ Đà",
    },
    gateCheckTitle: "Đang kiểm tra thẻ sử dụng",
    gateCheckCompleteTitle: "Kiểm tra thẻ sử dụng hoàn tất",
    gateCheckCompleteMessage: "Đã hoàn tất kiểm tra thẻ sử dụng. Đang đọc dòng chảy nghiệp của bạn.",
    gateCheckFailedTitle: "Kiểm tra thẻ sử dụng thất bại",
    statusPreparing: "Đang mở ra hồ sơ số mệnh",
    statusPayment: "Vui lòng kiểm tra trang thanh toán",
    statusReading: "Đang đọc khuôn mẫu cuộc đời lặp lại và dòng chảy nghiệp",
    statusReady: "Buổi tư vấn đang tiếp tục",
    statusIdle: "Đã sẵn sàng mở ra sợi chỉ số mệnh",
    accessTypeLabelPrefix: "Phương thức truy cập: ",
    heroAriaLabel: "Tư vấn chuyên gia Nghiệp Số Mệnh",
    heroTitle: "Tư vấn chuyên gia Nghiệp Số Mệnh",
    heroDescription: "Trong dòng chảy lặp lại của cuộc đời, chúng tôi tiết lộ khuôn mẫu cần phá vỡ ngay bây giờ và con đường mới cần mở ra.",
    premiumMapAriaLabel: "Cấu trúc tư vấn Nghiệp Số Mệnh",
    premiumMapHeading: "Báo Cáo Nghiệp Số Mệnh Hơn 30.000 Ký Tự",
    premiumMapDesc: "Phù hợp với buổi tư vấn cao cấp, chúng tôi kết hợp mệnh lý, chiêm tinh và biểu tượng Vệ Đà với chiến lược hành động thực tế qua 16 chương dài.",
    formHeading: "Thông Tin Để Đọc Sợi Chỉ Số Mệnh Của Bạn",
    profileLoadAria: "Tải thông tin sinh từ thẻ hồ sơ",
    profileLoadCta: "Tải từ thẻ hồ sơ",
    nameOrNicknameLabel: "Tên hoặc biệt danh",
    namePlaceholder: "vd: Harin",
    genderLabel: "Giới tính",
    genderSelectOption: "Chọn",
    genderFemale: "Nữ",
    genderMale: "Nam",
    genderUnknown: "Không muốn tiết lộ",
    birthDateLabel: "Ngày sinh",
    calendarTypeLabel: "Dương lịch/Âm lịch",
    calendarSolarOption: "Dương lịch",
    calendarLunarOption: "Âm lịch",
    birthTimeLabel: "Giờ sinh",
    birthTimeUnknownLabel: "Không rõ giờ sinh",
    birthTimeUnknownNote: "Chúng tôi sẽ tập trung vào dòng chảy có thể đọc được từ thông tin bạn đã cung cấp.",
    birthPlaceHeading: "Nơi sinh",
    majorCityLabel: "Thành phố chính",
    customInputOrSelectOption: "Nhập thủ công hoặc chọn",
    cityLabel: "Thành phố",
    countryLabel: "Quốc gia",
    latitudeLabel: "Vĩ độ",
    longitudeLabel: "Kinh độ",
    timezoneLabel: "Múi giờ",
    topicLabel: "Chủ đề tư vấn",
    questionLabel: "Điều bạn tò mò nhất lúc này",
    questionPlaceholderCustom: "Vui lòng viết nút thắt số mệnh bạn muốn gỡ rối nhất lúc này.",
    questionPlaceholderDefault: "Để trống thì buổi tư vấn sẽ tập trung vào chủ đề bạn đã chọn.",
    priceLabelPrefix: "Giá sử dụng tư vấn ",
    submitBusyLabel: "Đang theo dõi sợi chỉ số mệnh...",
    submitCta: "Nhận Tư Vấn Chuyên Gia Nghiệp Số Mệnh",
    resultCardHeading: "Thẻ Tư Vấn",
    fullscreenCta: "Toàn màn hình",
    summaryKeywordLabel: "Từ khóa cốt lõi của nghiệp",
    repeatingPatternLabel: "Khuôn mẫu lặp lại",
    repeatingPatternFallback: "Dòng chảy nơi phản ứng cảm xúc quen thuộc lặp lại cùng một lựa chọn",
    currentTaskLabel: "Nhiệm vụ cần giải quyết hiện tại",
    currentTaskFallback: "Luyện tập một lựa chọn khác trong cùng một tình huống",
    sajuLensLabel: "Tứ Trụ",
    westernLensLabel: "Chiêm Tinh Phương Tây",
    vedicLensLabel: "Chiêm Tinh Vệ Đà",
    emptyStateTitle: "Đã sẵn sàng mở ra sợi chỉ số mệnh.",
    emptyStateDesc: "Dựa trên thông tin bạn đã nhập, buổi tư vấn kết nối khuôn mẫu cuộc đời lặp lại với câu hỏi hiện tại của bạn.",
    assistantRoleLabel: "Chuyên gia tư vấn",
    userRoleLabel: "Tôi",
    followUpPlaceholder: "Hãy tiếp tục hỏi về dòng chảy bạn muốn tìm hiểu sâu hơn.",
    askCta: "Đặt câu hỏi",
    defaultKeywords: ["Lựa chọn lặp lại", "Nút thắt trong mối quan hệ", "Bài học về tài năng"],
    resultModalTitle: "Lá Thư Số Mệnh",
    savingLabel: "Đang lưu",
    pdfSaveLabel: "Lưu PDF",
    closeAriaLabel: "Đóng",
    coverSubtitleNoBirthDate: "Chưa nhập ngày sinh",
    defaultUserName: "Bạn",
    pdfCoverTitle: (name) => `Lá thư Nghiệp Số Mệnh của ${name}`,
    pdfCoverSubtitleLine: (name) => `Số mệnh (命) · Nghiệp (業) · Thời gian (時) của ${name}`,
    pdfDownloadErrorMessage: "Đã xảy ra sự cố khi lưu PDF. Vui lòng thử lại sau ít phút.",
    chartDataHeading: "Dữ Liệu Lá Số Dùng Trong Buổi Tư Vấn",
    chartDataDesc: "Bao gồm các giá trị tính toán từ Tứ Trụ, chiêm tinh phương Tây và chiêm tinh Vệ Đà.",
  },
  hi: {
    featureReason: "कर्म भाग्य विशेषज्ञ परामर्श",
    loginRequiredMessage: "परामर्श शुरू करने के लिए लॉगिन आवश्यक है। कृपया लॉगिन कर पुनः प्रयास करें।",
    paymentRequiredMessage: "कर्म भाग्य विशेषज्ञ परामर्श के लिए पास आवश्यक है। हम आपके लिए चेकआउट खोलेंगे।",
    paymentVerifyFailedMessage: "भुगतान की पुष्टि पूरी नहीं हुई है। यदि आपने पहले ही भुगतान कर दिया है, तो कृपया थोड़ी देर बाद पुनः प्रयास करें।",
    paymentCancelledMessage: "भुगतान रद्द कर दिया गया। आवश्यकता होने पर आप फिर से आगे बढ़ सकते हैं।",
    serverErrorMessage: "परामर्श तैयार करते समय समस्या हुई। कोई भुगतान नहीं काटा गया।",
    llmErrorMessage: "परामर्श सामग्री बनाते समय समस्या हुई। यदि कोई राशि काटी गई हो तो वह स्वतः बहाल हो जाएगी।",
    requiredInputMessage: "कर्म भाग्य परामर्श के लिए आवश्यक जानकारी अधूरी है। कृपया जन्म तिथि, लिंग और जन्म समय पुनः जांचें।",
    birthTimeRequiredMessage: "कर्म भाग्य परामर्श की व्याख्या की गहराई जन्म समय पर निर्भर करती है। कृपया जन्म समय दर्ज करें या \"जन्म समय अज्ञात\" चुनें।",
    customQuestionRequiredMessage: "यदि आपने स्वयं का प्रश्न चुना है, तो कृपया संक्षेप में लिखें कि आप अभी सबसे ज़्यादा क्या जानना चाहते हैं।",
    networkErrorMessage: "कनेक्शन अस्थिर लग रहा है। कृपया थोड़ी देर बाद पुनः प्रयास करें।",
    karmaSectionFallbackTitles: [
      "業 — भाग्य का मूल विषय", "源 — भाग्य की उत्पत्ति", "流 — जीवन का वर्तमान प्रवाह", "課 — कर्म का मूल कार्य",
      "緣 — रिश्तों का कर्म", "情 — प्रेम का कर्म", "財 — धन का कर्म", "職 — करियर का कर्म", "體 — स्वास्थ्य ऊर्जा",
      "才 — छिपी हुई प्रतिभा", "轉 — भाग्य का मोड़", "策 — भविष्य की विकास रणनीति", "總 — पांच दृष्टिकोणों का समग्र निष्कर्ष",
      "句 — भाग्य बदलने वाला मूल वाक्य", "箋 — अंतिम पत्र",
    ],
    loadingStageLabels: [
      "साजू के स्तंभ स्थापित किए जा रहे हैं...", "ज़िवेई के 12 भवन खोले जा रहे हैं...", "सुक्यो के 27 नक्षत्रों का संबंध जोड़ा जा रहा है...",
      "राशियों का मनोविज्ञान पढ़ा जा रहा है...", "वैदिक कर्म का आकलन किया जा रहा है...", "पांच दृष्टिकोणों को एक में समेटा जा रहा है...",
    ],
    premiumValueCards: [
      "दोहराए जाने वाले रिश्तों का कर्म", "धन और अस्तित्व के पैटर्न", "करियर और उद्देश्य की दिशा", "मूल परिवार और भावनात्मक ऋण",
      "आने वाले वर्ष का समाधान प्रवाह", "3-वर्षीय दीर्घकालिक भाग्य रणनीति", "सलाहकार का अंतिम पत्र",
    ],
    focusAreaLabel: {
      overall: "समग्र भाग्य कर्म", lifePattern: "दोहराए जाने वाले जीवन पैटर्न", love: "प्रेम और वियोग का कर्म",
      money: "धन में दोहराया जाने वाला प्रवाह", career: "काम और उद्देश्य की दिशा", relationship: "रिश्तों में दोहराई जाने वाली भावनाएं",
      family: "परिवार और संबंधों का कर्म", spirituality: "आंतरिक और आध्यात्मिक विकास", custom: "स्वयं का प्रश्न पूछें",
    },
    placePresetLabel: {
      Seoul: "सियोल, दक्षिण कोरिया", Busan: "बुसान, दक्षिण कोरिया", Tokyo: "टोक्यो, जापान", "New York": "न्यूयॉर्क, अमेरिका",
      "Los Angeles": "लॉस एंजिलिस, अमेरिका", London: "लंदन, यूके", Paris: "पेरिस, फ्रांस",
    },
    lensFallbackSummary: {
      saju: "दिवस स्वामी और पंच तत्वों के संतुलन के माध्यम से दोहराई जाने वाली चयन आदतों को देखता है।",
      ziwei: "जीवन भवन और 12 भवनों की स्थिति के माध्यम से जीवन के मंच और सामाजिक भूमिका को देखता है।",
      sukuyo: "जन्म नक्षत्र और 27 नक्षत्रों की दूरी के माध्यम से रिश्तों में आपकी स्थिति को देखता है।",
      westernAstrology: "सूर्य और चंद्रमा के प्रवाह के माध्यम से मन के दोहराए जाने वाले पैटर्न को देखता है।",
      vedicAstrology: "राहु-केतु अक्ष के माध्यम से परिचित आदतों और विकास दिशा को देखता है।",
    },
    chartBlockLabel: { saju: "साजू", ziwei: "ज़िवेई दोशु", sukuyo: "सुक्यो", westernAstrology: "पाश्चात्य ज्योतिष", vedicAstrology: "वैदिक ज्योतिष" },
    chartBlockTitle: {
      saju: "साजू जन्म कुंडली डेटा", ziwei: "ज़िवेई दोशु चार्ट डेटा", sukuyo: "27 सुक्यो नक्षत्र डेटा",
      westernAstrology: "पाश्चात्य ज्योतिष चार्ट डेटा", vedicAstrology: "वैदिक ज्योतिष चार्ट डेटा",
    },
    gateCheckTitle: "पास की जांच हो रही है",
    gateCheckCompleteTitle: "पास जांच पूर्ण",
    gateCheckCompleteMessage: "पास की जांच पूरी हो गई है। आपके कर्म के प्रवाह को पढ़ा जा रहा है।",
    gateCheckFailedTitle: "पास जांच विफल",
    statusPreparing: "भाग्य के रिकॉर्ड को खोला जा रहा है",
    statusPayment: "कृपया चेकआउट देखें",
    statusReading: "जीवन के दोहराए जाने वाले पैटर्न और कर्म के प्रवाह को पढ़ा जा रहा है",
    statusReady: "परामर्श जारी है",
    statusIdle: "भाग्य के धागे को खोलने के लिए तैयार",
    accessTypeLabelPrefix: "पहुंच विधि: ",
    heroAriaLabel: "कर्म भाग्य विशेषज्ञ परामर्श",
    heroTitle: "कर्म भाग्य विशेषज्ञ परामर्श",
    heroDescription: "जीवन के दोहराए जाने वाले प्रवाह में, हम उस पैटर्न को उजागर करते हैं जिसे अभी तोड़ने की ज़रूरत है और उस नए रास्ते को जो खोलने की ज़रूरत है।",
    premiumMapAriaLabel: "कर्म भाग्य परामर्श संरचना",
    premiumMapHeading: "30,000+ अक्षरों वाली कर्म भाग्य रिपोर्ट",
    premiumMapDesc: "प्रीमियम परामर्श के अनुरूप, हम साजू, ज्योतिष और वैदिक प्रतीकवाद को वास्तविक कार्य रणनीतियों के साथ 16 अध्यायों की लंबी कथा में बुनते हैं।",
    formHeading: "आपके भाग्य के धागे को पढ़ने के लिए जानकारी",
    profileLoadAria: "प्रोफ़ाइल कार्ड से जन्म जानकारी लोड करें",
    profileLoadCta: "प्रोफ़ाइल कार्ड से लोड करें",
    nameOrNicknameLabel: "नाम या उपनाम",
    namePlaceholder: "जैसे: हरिन",
    genderLabel: "लिंग",
    genderSelectOption: "चुनें",
    genderFemale: "महिला",
    genderMale: "पुरुष",
    genderUnknown: "प्रकट न करें",
    birthDateLabel: "जन्म तिथि",
    calendarTypeLabel: "सौर/चंद्र कैलेंडर",
    calendarSolarOption: "सौर",
    calendarLunarOption: "चंद्र",
    birthTimeLabel: "जन्म समय",
    birthTimeUnknownLabel: "जन्म समय अज्ञात",
    birthTimeUnknownNote: "हम आपके द्वारा दी गई जानकारी के आधार पर पढ़े जा सकने वाले प्रवाह पर ध्यान केंद्रित करेंगे।",
    birthPlaceHeading: "जन्म स्थान",
    majorCityLabel: "प्रमुख शहर",
    customInputOrSelectOption: "मैन्युअल रूप से दर्ज करें या चुनें",
    cityLabel: "शहर",
    countryLabel: "देश",
    latitudeLabel: "अक्षांश",
    longitudeLabel: "देशांतर",
    timezoneLabel: "समय क्षेत्र",
    topicLabel: "परामर्श विषय",
    questionLabel: "अभी आप सबसे ज़्यादा क्या जानना चाहते हैं",
    questionPlaceholderCustom: "कृपया वह भाग्य की गांठ लिखें जिसे आप अभी सबसे ज़्यादा सुलझाना चाहते हैं।",
    questionPlaceholderDefault: "खाली छोड़ने पर परामर्श आपके चुने गए विषय पर केंद्रित रहेगा।",
    priceLabelPrefix: "परामर्श उपयोग मूल्य ",
    submitBusyLabel: "भाग्य के धागे का अनुसरण किया जा रहा है...",
    submitCta: "कर्म भाग्य विशेषज्ञ परामर्श प्राप्त करें",
    resultCardHeading: "परामर्श कार्ड",
    fullscreenCta: "पूर्ण स्क्रीन",
    summaryKeywordLabel: "कर्म के मूल कीवर्ड",
    repeatingPatternLabel: "दोहराया जाने वाला पैटर्न",
    repeatingPatternFallback: "एक प्रवाह जहां परिचित भावनात्मक प्रतिक्रियाएं समान विकल्पों को दोहराती हैं",
    currentTaskLabel: "अभी हल करने योग्य कार्य",
    currentTaskFallback: "एक ही दृश्य में एक अलग विकल्प का अभ्यास करना",
    sajuLensLabel: "साजू",
    westernLensLabel: "पाश्चात्य ज्योतिष",
    vedicLensLabel: "वैदिक ज्योतिष",
    emptyStateTitle: "भाग्य के धागे को खोलने के लिए तैयार।",
    emptyStateDesc: "आपके द्वारा दी गई जानकारी के आधार पर, परामर्श दोहराए जाने वाले जीवन पैटर्न को आपके वर्तमान प्रश्न से जोड़ता है।",
    assistantRoleLabel: "सलाहकार",
    userRoleLabel: "मैं",
    followUpPlaceholder: "जिस प्रवाह के बारे में आप और गहराई से जानना चाहते हैं, उसके बारे में आगे पूछें।",
    askCta: "पूछें",
    defaultKeywords: ["दोहराए जाने वाले विकल्प", "रिश्तों की गांठ", "प्रतिभा का अधूरा कार्य"],
    resultModalTitle: "भाग्य का पत्र",
    savingLabel: "सहेजा जा रहा है",
    pdfSaveLabel: "PDF सहेजें",
    closeAriaLabel: "बंद करें",
    coverSubtitleNoBirthDate: "जन्म तिथि दर्ज नहीं की गई",
    defaultUserName: "आप",
    pdfCoverTitle: (name) => `${name} के कर्म भाग्य का पत्र`,
    pdfCoverSubtitleLine: (name) => `${name} का भाग्य (命) · कर्म (業) · समय (時)`,
    pdfDownloadErrorMessage: "PDF सहेजते समय समस्या हुई। कृपया थोड़ी देर बाद पुनः प्रयास करें।",
    chartDataHeading: "परामर्श में उपयोग की गई चार्ट जानकारी",
    chartDataDesc: "साजू, पाश्चात्य ज्योतिष और वैदिक ज्योतिष के गणना मूल्यों को एक साथ शामिल करता है।",
  },
  es: {
    featureReason: "Consulta experta de Karma y Destino",
    loginRequiredMessage: "Necesitas iniciar sesión para comenzar la consulta. Por favor, inicia sesión e inténtalo de nuevo.",
    paymentRequiredMessage: "Necesitas un pase para la consulta experta de Karma y Destino. Te abriremos la pantalla de pago.",
    paymentVerifyFailedMessage: "La confirmación del pago no se ha completado. Si ya pagaste, inténtalo de nuevo en unos momentos.",
    paymentCancelledMessage: "El pago fue cancelado. Puedes continuar de nuevo cuando lo necesites.",
    serverErrorMessage: "Ocurrió un problema al preparar la consulta. No se cobró ningún pago.",
    llmErrorMessage: "Ocurrió un problema al generar el contenido de la consulta. Si se cobró algo, se restaurará automáticamente.",
    requiredInputMessage: "Falta información necesaria para la consulta de Karma y Destino. Vuelve a verificar tu fecha de nacimiento, género y hora de nacimiento.",
    birthTimeRequiredMessage: "La profundidad de la lectura de Karma y Destino depende de la hora de nacimiento. Ingresa tu hora de nacimiento o selecciona \"Hora de nacimiento desconocida\".",
    customQuestionRequiredMessage: "Si elegiste hacer tu propia pregunta, escribe brevemente lo que más quieres saber ahora mismo.",
    networkErrorMessage: "La conexión parece inestable. Inténtalo de nuevo en unos momentos.",
    karmaSectionFallbackTitles: [
      "業 — El tema central de tu destino", "源 — El origen de tu destino", "流 — El flujo actual de tu vida", "課 — La tarea central del karma",
      "緣 — El karma de las relaciones", "情 — El karma del amor", "財 — El karma del dinero", "職 — El karma de la carrera", "體 — Energía de salud",
      "才 — Talento oculto", "轉 — El punto de inflexión del destino", "策 — Estrategia para el crecimiento futuro", "總 — Una síntesis de cinco perspectivas",
      "句 — La frase clave que cambia el destino", "箋 — Carta final",
    ],
    loadingStageLabels: [
      "Estableciendo los pilares del Saju...", "Desplegando las 12 casas de Ziwei...", "Tejiendo los lazos de las 27 mansiones de Sukuyo...",
      "Leyendo la psicología de las estrellas...", "Sopesando el karma de la sabiduría védica...", "Reuniendo cinco perspectivas en una...",
    ],
    premiumValueCards: [
      "El karma de las relaciones recurrentes", "Patrones de dinero y supervivencia", "La dirección de la carrera y la vocación", "Deudas emocionales de la familia de origen",
      "El flujo de resolución para el próximo año", "Una estrategia de destino a 3 años", "Una carta final de tu consultor",
    ],
    focusAreaLabel: {
      overall: "Tu karma de destino en general", lifePattern: "Patrones de vida recurrentes", love: "El karma del amor y la separación",
      money: "Patrones recurrentes con el dinero", career: "La dirección del trabajo y la vocación", relationship: "Emociones recurrentes en las relaciones",
      family: "El karma de la familia y los lazos", spirituality: "Crecimiento interior y espiritual", custom: "Haz tu propia pregunta",
    },
    placePresetLabel: {
      Seoul: "Seúl, Corea del Sur", Busan: "Busan, Corea del Sur", Tokyo: "Tokio, Japón", "New York": "Nueva York, EE. UU.",
      "Los Angeles": "Los Ángeles, EE. UU.", London: "Londres, Reino Unido", Paris: "París, Francia",
    },
    lensFallbackSummary: {
      saju: "Observa los hábitos de elección recurrentes a través del equilibrio del Día Maestro y los Cinco Elementos.",
      ziwei: "Observa tu etapa en la vida y rol social a través de la ubicación del Palacio de Vida y las 12 casas de Ziwei.",
      sukuyo: "Observa la posición que sueles ocupar en las relaciones a través de la distancia entre tu mansión de nacimiento y las 27 mansiones lunares.",
      westernAstrology: "Observa tus patrones emocionales recurrentes a través del flujo del Sol y la Luna.",
      vedicAstrology: "Observa hábitos familiares y dirección de crecimiento a través del eje Rahu-Ketu.",
    },
    chartBlockLabel: { saju: "Saju", ziwei: "Ziwei", sukuyo: "Sukuyo", westernAstrology: "Astrología Occidental", vedicAstrology: "Astrología Védica" },
    chartBlockTitle: {
      saju: "Datos de la Carta Natal Saju", ziwei: "Datos de la Carta Ziwei Doushu", sukuyo: "Datos de las 27 Mansiones Sukuyo",
      westernAstrology: "Datos de la Carta de Astrología Occidental", vedicAstrology: "Datos de la Carta de Astrología Védica",
    },
    gateCheckTitle: "Verificando el pase",
    gateCheckCompleteTitle: "Verificación del pase completada",
    gateCheckCompleteMessage: "Se confirmó tu pase. Leyendo el flujo de tu karma.",
    gateCheckFailedTitle: "Verificación del pase fallida",
    statusPreparing: "Desplegando el registro de tu destino",
    statusPayment: "Por favor, revisa la pantalla de pago",
    statusReading: "Leyendo los patrones recurrentes de vida y el flujo del karma",
    statusReady: "La consulta continúa",
    statusIdle: "Listo para desplegar el hilo de tu destino",
    accessTypeLabelPrefix: "Método de acceso: ",
    heroAriaLabel: "Consulta experta de Karma y Destino",
    heroTitle: "Consulta experta de Karma y Destino",
    heroDescription: "En el flujo recurrente de tu vida, revelamos el patrón que necesitas romper ahora y el nuevo camino que necesitas abrir.",
    premiumMapAriaLabel: "Composición de la consulta de Karma y Destino",
    premiumMapHeading: "Un Informe de Karma y Destino de más de 30,000 caracteres",
    premiumMapDesc: "Acorde a una consulta premium, entrelazamos el simbolismo de Saju, astrología y sabiduría védica con estrategias de acción reales a lo largo de una narrativa de 16 capítulos.",
    formHeading: "Información para Leer el Hilo de tu Destino",
    profileLoadAria: "Cargar información de nacimiento desde tu tarjeta de perfil",
    profileLoadCta: "Cargar desde la tarjeta de perfil",
    nameOrNicknameLabel: "Nombre o apodo",
    namePlaceholder: "ej.: Harin",
    genderLabel: "Género",
    genderSelectOption: "Seleccionar",
    genderFemale: "Femenino",
    genderMale: "Masculino",
    genderUnknown: "Prefiero no decirlo",
    birthDateLabel: "Fecha de nacimiento",
    calendarTypeLabel: "Calendario solar/lunar",
    calendarSolarOption: "Solar",
    calendarLunarOption: "Lunar",
    birthTimeLabel: "Hora de nacimiento",
    birthTimeUnknownLabel: "Hora de nacimiento desconocida",
    birthTimeUnknownNote: "Nos centraremos en el flujo que se puede leer a partir de la información que proporcionaste.",
    birthPlaceHeading: "Lugar de nacimiento",
    majorCityLabel: "Ciudad principal",
    customInputOrSelectOption: "Ingresar manualmente o seleccionar",
    cityLabel: "Ciudad",
    countryLabel: "País",
    latitudeLabel: "Latitud",
    longitudeLabel: "Longitud",
    timezoneLabel: "Zona horaria",
    topicLabel: "Tema de la consulta",
    questionLabel: "Lo que más te intriga ahora mismo",
    questionPlaceholderCustom: "Escribe el nudo del destino que más te gustaría desenredar ahora mismo.",
    questionPlaceholderDefault: "Si lo dejas en blanco, la consulta se centrará en el tema que elegiste.",
    priceLabelPrefix: "Precio de la consulta ",
    submitCta: "Obtén tu Consulta Experta de Karma y Destino",
    submitBusyLabel: "Siguiendo el hilo de tu destino...",
    resultCardHeading: "Tarjeta de Consulta",
    fullscreenCta: "Pantalla completa",
    summaryKeywordLabel: "Palabras clave del karma",
    repeatingPatternLabel: "Patrón recurrente",
    repeatingPatternFallback: "Un flujo donde las reacciones emocionales familiares repiten las mismas decisiones",
    currentTaskLabel: "Tarea actual por resolver",
    currentTaskFallback: "Practicar una decisión diferente en la misma escena",
    sajuLensLabel: "Saju",
    westernLensLabel: "Astrología Occidental",
    vedicLensLabel: "Astrología Védica",
    emptyStateTitle: "Listo para desplegar el hilo de tu destino.",
    emptyStateDesc: "Basándose en la información que ingresaste, la consulta conecta los patrones de vida recurrentes con tu pregunta actual.",
    assistantRoleLabel: "Consultor",
    userRoleLabel: "Yo",
    followUpPlaceholder: "Haz una pregunta de seguimiento sobre el flujo que te gustaría explorar más a fondo.",
    askCta: "Preguntar",
    defaultKeywords: ["Decisiones recurrentes", "Nudos en las relaciones", "Talento sin resolver"],
    resultModalTitle: "Carta del Destino",
    savingLabel: "Guardando",
    pdfSaveLabel: "Guardar PDF",
    closeAriaLabel: "Cerrar",
    coverSubtitleNoBirthDate: "Fecha de nacimiento no ingresada",
    defaultUserName: "Tú",
    pdfCoverTitle: (name) => `Carta de Karma y Destino de ${name}`,
    pdfCoverSubtitleLine: (name) => `Destino (命) · Karma (業) · Tiempo (時) de ${name}`,
    pdfDownloadErrorMessage: "Ocurrió un problema al guardar el PDF. Inténtalo de nuevo en unos momentos.",
    chartDataHeading: "Datos de la Carta Usados en la Consulta",
    chartDataDesc: "Incluye los valores calculados de Saju, astrología occidental y astrología védica en conjunto.",
  },
  fr: {
    featureReason: "Consultation experte en Karma et Destin",
    loginRequiredMessage: "Vous devez vous connecter pour commencer la consultation. Veuillez vous connecter et réessayer.",
    paymentRequiredMessage: "Vous avez besoin d'un pass pour la consultation experte en Karma et Destin. Nous allons ouvrir la page de paiement pour vous.",
    paymentVerifyFailedMessage: "La confirmation du paiement n'est pas terminée. Si vous avez déjà payé, veuillez réessayer dans un instant.",
    paymentCancelledMessage: "Le paiement a été annulé. Vous pouvez recommencer quand vous le souhaitez.",
    serverErrorMessage: "Un problème est survenu lors de la préparation de la consultation. Aucun paiement n'a été débité.",
    llmErrorMessage: "Un problème est survenu lors de la génération du contenu de la consultation. Si un montant a été débité, il sera automatiquement restauré.",
    requiredInputMessage: "Des informations nécessaires à la consultation Karma et Destin sont manquantes. Veuillez revérifier votre date de naissance, votre genre et votre heure de naissance.",
    birthTimeRequiredMessage: "La profondeur de la lecture Karma et Destin dépend de l'heure de naissance. Veuillez saisir votre heure de naissance ou sélectionner « Heure de naissance inconnue ».",
    customQuestionRequiredMessage: "Si vous avez choisi de poser votre propre question, veuillez écrire brièvement ce que vous voulez le plus savoir maintenant.",
    networkErrorMessage: "La connexion semble instable. Veuillez réessayer dans un instant.",
    karmaSectionFallbackTitles: [
      "業 — Le thème central de votre destin", "源 — L'origine de votre destin", "流 — Le flux actuel de la vie", "課 — La tâche centrale du karma",
      "緣 — Le karma des relations", "情 — Le karma de l'amour", "財 — Le karma de l'argent", "職 — Le karma de la carrière", "體 — Énergie de santé",
      "才 — Talent caché", "轉 — Le tournant du destin", "策 — Stratégie pour la croissance future", "總 — Une synthèse de cinq perspectives",
      "句 — La phrase clé qui change le destin", "箋 — Lettre finale",
    ],
    loadingStageLabels: [
      "Établissement des piliers du Saju...", "Déploiement des 12 maisons du Ziwei...", "Tissage des liens des 27 demeures du Sukuyo...",
      "Lecture de la psychologie des étoiles...", "Pesée du karma de la sagesse védique...", "Rassemblement de cinq perspectives en une seule...",
    ],
    premiumValueCards: [
      "Le karma des relations récurrentes", "Schémas d'argent et de survie", "La direction de la carrière et de la vocation", "Dettes émotionnelles de la famille d'origine",
      "Le flux de résolution pour l'année à venir", "Une stratégie de destin à long terme sur 3 ans", "Une lettre finale de votre consultant",
    ],
    focusAreaLabel: {
      overall: "Votre karma de destin global", lifePattern: "Schémas de vie récurrents", love: "Le karma de l'amour et de la séparation",
      money: "Schémas récurrents avec l'argent", career: "La direction du travail et de la vocation", relationship: "Émotions récurrentes dans les relations",
      family: "Le karma de la famille et des liens", spirituality: "Croissance intérieure et spirituelle", custom: "Posez votre propre question",
    },
    placePresetLabel: {
      Seoul: "Séoul, Corée du Sud", Busan: "Busan, Corée du Sud", Tokyo: "Tokyo, Japon", "New York": "New York, États-Unis",
      "Los Angeles": "Los Angeles, États-Unis", London: "Londres, Royaume-Uni", Paris: "Paris, France",
    },
    lensFallbackSummary: {
      saju: "Observe les habitudes de choix récurrentes à travers l'équilibre du Maître du Jour et des Cinq Éléments.",
      ziwei: "Observe votre étape de vie et votre rôle social à travers l'emplacement du Palais de Vie et des 12 maisons du Ziwei.",
      sukuyo: "Observe la position que vous occupez généralement dans les relations à travers la distance entre votre demeure de naissance et les 27 demeures lunaires.",
      westernAstrology: "Observe vos schémas émotionnels récurrents à travers le flux du Soleil et de la Lune.",
      vedicAstrology: "Observe les habitudes familières et la direction de croissance à travers l'axe Rahu-Ketu.",
    },
    chartBlockLabel: { saju: "Saju", ziwei: "Ziwei", sukuyo: "Sukuyo", westernAstrology: "Astrologie Occidentale", vedicAstrology: "Astrologie Védique" },
    chartBlockTitle: {
      saju: "Données du Thème Natal Saju", ziwei: "Données du Thème Ziwei Doushu", sukuyo: "Données des 27 Demeures Sukuyo",
      westernAstrology: "Données du Thème d'Astrologie Occidentale", vedicAstrology: "Données du Thème d'Astrologie Védique",
    },
    gateCheckTitle: "Vérification du pass",
    gateCheckCompleteTitle: "Vérification du pass terminée",
    gateCheckCompleteMessage: "Votre pass a été confirmé. Lecture du flux de votre karma.",
    gateCheckFailedTitle: "Échec de la vérification du pass",
    statusPreparing: "Déploiement du registre de votre destin",
    statusPayment: "Veuillez vérifier la page de paiement",
    statusReading: "Lecture des schémas de vie récurrents et du flux du karma",
    statusReady: "La consultation se poursuit",
    statusIdle: "Prêt à déployer le fil de votre destin",
    accessTypeLabelPrefix: "Méthode d'accès : ",
    heroAriaLabel: "Consultation experte en Karma et Destin",
    heroTitle: "Consultation experte en Karma et Destin",
    heroDescription: "Dans le flux récurrent de votre vie, nous révélons le schéma que vous devez rompre maintenant et la nouvelle voie que vous devez ouvrir.",
    premiumMapAriaLabel: "Composition de la consultation Karma et Destin",
    premiumMapHeading: "Un Rapport Karma et Destin de plus de 30 000 caractères",
    premiumMapDesc: "En accord avec une consultation premium, nous entrelaçons le symbolisme du Saju, de l'astrologie et de la sagesse védique avec des stratégies d'action concrètes sur un récit de 16 chapitres.",
    formHeading: "Informations pour Lire le Fil de votre Destin",
    profileLoadAria: "Charger les informations de naissance depuis votre carte de profil",
    profileLoadCta: "Charger depuis la carte de profil",
    nameOrNicknameLabel: "Nom ou surnom",
    namePlaceholder: "ex. : Harin",
    genderLabel: "Genre",
    genderSelectOption: "Sélectionner",
    genderFemale: "Femme",
    genderMale: "Homme",
    genderUnknown: "Je préfère ne pas dire",
    birthDateLabel: "Date de naissance",
    calendarTypeLabel: "Calendrier solaire/lunaire",
    calendarSolarOption: "Solaire",
    calendarLunarOption: "Lunaire",
    birthTimeLabel: "Heure de naissance",
    birthTimeUnknownLabel: "Heure de naissance inconnue",
    birthTimeUnknownNote: "Nous nous concentrerons sur le flux qui peut être lu à partir des informations que vous avez fournies.",
    birthPlaceHeading: "Lieu de naissance",
    majorCityLabel: "Ville principale",
    customInputOrSelectOption: "Saisir manuellement ou sélectionner",
    cityLabel: "Ville",
    countryLabel: "Pays",
    latitudeLabel: "Latitude",
    longitudeLabel: "Longitude",
    timezoneLabel: "Fuseau horaire",
    topicLabel: "Sujet de la consultation",
    questionLabel: "Ce qui vous intrigue le plus en ce moment",
    questionPlaceholderCustom: "Veuillez écrire le nœud du destin que vous aimeriez le plus démêler en ce moment.",
    questionPlaceholderDefault: "Si vous laissez vide, la consultation se concentrera sur le sujet que vous avez choisi.",
    priceLabelPrefix: "Prix de la consultation ",
    submitBusyLabel: "Suivi du fil de votre destin...",
    submitCta: "Obtenez votre Consultation Experte en Karma et Destin",
    resultCardHeading: "Carte de Consultation",
    fullscreenCta: "Plein écran",
    summaryKeywordLabel: "Mots-clés essentiels du karma",
    repeatingPatternLabel: "Schéma récurrent",
    repeatingPatternFallback: "Un flux où des réactions émotionnelles familières répètent les mêmes choix",
    currentTaskLabel: "Tâche actuelle à résoudre",
    currentTaskFallback: "Pratiquer un choix différent dans la même scène",
    sajuLensLabel: "Saju",
    westernLensLabel: "Astrologie Occidentale",
    vedicLensLabel: "Astrologie Védique",
    emptyStateTitle: "Prêt à déployer le fil de votre destin.",
    emptyStateDesc: "Sur la base des informations que vous avez saisies, la consultation relie les schémas de vie récurrents à votre question actuelle.",
    assistantRoleLabel: "Consultant",
    userRoleLabel: "Moi",
    followUpPlaceholder: "Posez une question complémentaire sur le flux que vous aimeriez explorer plus en profondeur.",
    askCta: "Poser une question",
    defaultKeywords: ["Choix récurrents", "Nœuds dans les relations", "Talent inachevé"],
    resultModalTitle: "Lettre du Destin",
    savingLabel: "Enregistrement",
    pdfSaveLabel: "Enregistrer le PDF",
    closeAriaLabel: "Fermer",
    coverSubtitleNoBirthDate: "Date de naissance non saisie",
    defaultUserName: "Vous",
    pdfCoverTitle: (name) => `Lettre de Karma et Destin de ${name}`,
    pdfCoverSubtitleLine: (name) => `Destin (命) · Karma (業) · Temps (時) de ${name}`,
    pdfDownloadErrorMessage: "Un problème est survenu lors de l'enregistrement du PDF. Veuillez réessayer dans un instant.",
    chartDataHeading: "Données du Thème Utilisées dans la Consultation",
    chartDataDesc: "Inclut ensemble les valeurs calculées du Saju, de l'astrologie occidentale et de l'astrologie védique.",
  },
  de: {
    featureReason: "Karma-Schicksal-Expertenberatung",
    loginRequiredMessage: "Sie müssen sich anmelden, um die Beratung zu starten. Bitte melden Sie sich an und versuchen Sie es erneut.",
    paymentRequiredMessage: "Sie benötigen einen Pass für die Karma-Schicksal-Expertenberatung. Wir öffnen die Kasse für Sie.",
    paymentVerifyFailedMessage: "Die Zahlungsbestätigung ist nicht abgeschlossen. Falls Sie bereits bezahlt haben, versuchen Sie es bitte in Kürze erneut.",
    paymentCancelledMessage: "Die Zahlung wurde storniert. Sie können jederzeit erneut fortfahren.",
    serverErrorMessage: "Bei der Vorbereitung der Beratung ist ein Problem aufgetreten. Es wurde keine Zahlung abgebucht.",
    llmErrorMessage: "Bei der Erstellung des Beratungsinhalts ist ein Problem aufgetreten. Falls ein Betrag abgebucht wurde, wird er automatisch wiederhergestellt.",
    requiredInputMessage: "Für die Karma-Schicksal-Beratung fehlen notwendige Informationen. Bitte überprüfen Sie Geburtsdatum, Geschlecht und Geburtszeit erneut.",
    birthTimeRequiredMessage: "Die Tiefe der Karma-Schicksal-Deutung hängt von der Geburtszeit ab. Bitte geben Sie Ihre Geburtszeit ein oder wählen Sie „Geburtszeit unbekannt“.",
    customQuestionRequiredMessage: "Wenn Sie sich für eine eigene Frage entschieden haben, schreiben Sie bitte kurz, was Sie jetzt am meisten wissen möchten.",
    networkErrorMessage: "Die Verbindung scheint instabil zu sein. Bitte versuchen Sie es in Kürze erneut.",
    karmaSectionFallbackTitles: [
      "業 — Das Kernthema Ihres Schicksals", "源 — Der Ursprung Ihres Schicksals", "流 — Der aktuelle Lebensfluss", "課 — Die Kernaufgabe des Karmas",
      "緣 — Das Karma der Beziehungen", "情 — Das Karma der Liebe", "財 — Das Karma des Geldes", "職 — Das Karma der Karriere", "體 — Gesundheitsenergie",
      "才 — Verborgenes Talent", "轉 — Der Wendepunkt des Schicksals", "策 — Strategie für zukünftiges Wachstum", "總 — Eine Synthese aus fünf Perspektiven",
      "句 — Der Schlüsselsatz, der das Schicksal verändert", "箋 — Letzter Brief",
    ],
    loadingStageLabels: [
      "Die Säulen des Saju werden aufgestellt...", "Die 12 Ziwei-Häuser werden entfaltet...", "Die Bande der 27 Sukuyo-Mondhäuser werden geknüpft...",
      "Die Psychologie der Sterne wird gelesen...", "Das vedische Karma wird abgewogen...", "Fünf Perspektiven werden zu einer zusammengeführt...",
    ],
    premiumValueCards: [
      "Das Karma wiederkehrender Beziehungen", "Muster bei Geld und Überleben", "Die Richtung von Karriere und Berufung", "Emotionale Schulden der Herkunftsfamilie",
      "Der Auflösungsfluss für das kommende Jahr", "Eine langfristige 3-Jahres-Schicksalsstrategie", "Ein letzter Brief von Ihrem Berater",
    ],
    focusAreaLabel: {
      overall: "Ihr gesamtes Schicksalskarma", lifePattern: "Wiederkehrende Lebensmuster", love: "Das Karma von Liebe und Trennung",
      money: "Wiederkehrende Muster beim Geld", career: "Die Richtung von Arbeit und Berufung", relationship: "Wiederkehrende Emotionen in Beziehungen",
      family: "Das Karma von Familie und Bindungen", spirituality: "Inneres und spirituelles Wachstum", custom: "Stellen Sie Ihre eigene Frage",
    },
    placePresetLabel: {
      Seoul: "Seoul, Südkorea", Busan: "Busan, Südkorea", Tokyo: "Tokio, Japan", "New York": "New York, USA",
      "Los Angeles": "Los Angeles, USA", London: "London, Großbritannien", Paris: "Paris, Frankreich",
    },
    lensFallbackSummary: {
      saju: "Betrachtet wiederkehrende Wahlgewohnheiten durch das Gleichgewicht von Tagesherrn und den Fünf Elementen.",
      ziwei: "Betrachtet Ihre Lebensbühne und soziale Rolle durch die Platzierung des Lebenspalastes und der 12 Ziwei-Häuser.",
      sukuyo: "Betrachtet die Position, die Sie in Beziehungen typischerweise einnehmen, durch den Abstand zwischen Ihrem Geburtshaus und den 27 Mondhäusern.",
      westernAstrology: "Betrachtet Ihre wiederkehrenden emotionalen Muster durch den Fluss von Sonne und Mond.",
      vedicAstrology: "Betrachtet vertraute Gewohnheiten und Wachstumsrichtung durch die Rahu-Ketu-Achse.",
    },
    chartBlockLabel: { saju: "Saju", ziwei: "Ziwei", sukuyo: "Sukuyo", westernAstrology: "Westliche Astrologie", vedicAstrology: "Vedische Astrologie" },
    chartBlockTitle: {
      saju: "Saju-Geburtshoroskop-Daten", ziwei: "Ziwei-Doushu-Chart-Daten", sukuyo: "27-Sukuyo-Mondhaus-Daten",
      westernAstrology: "Westliche-Astrologie-Chart-Daten", vedicAstrology: "Vedische-Astrologie-Chart-Daten",
    },
    gateCheckTitle: "Pass wird überprüft",
    gateCheckCompleteTitle: "Passüberprüfung abgeschlossen",
    gateCheckCompleteMessage: "Ihr Pass wurde bestätigt. Der Fluss Ihres Karmas wird gelesen.",
    gateCheckFailedTitle: "Passüberprüfung fehlgeschlagen",
    statusPreparing: "Das Register Ihres Schicksals wird entfaltet",
    statusPayment: "Bitte überprüfen Sie die Kasse",
    statusReading: "Wiederkehrende Lebensmuster und der Fluss des Karmas werden gelesen",
    statusReady: "Die Beratung wird fortgesetzt",
    statusIdle: "Bereit, den Faden Ihres Schicksals zu entfalten",
    accessTypeLabelPrefix: "Zugriffsmethode: ",
    heroAriaLabel: "Karma-Schicksal-Expertenberatung",
    heroTitle: "Karma-Schicksal-Expertenberatung",
    heroDescription: "Im wiederkehrenden Fluss Ihres Lebens enthüllen wir das Muster, das Sie jetzt durchbrechen müssen, und den neuen Weg, den Sie öffnen müssen.",
    premiumMapAriaLabel: "Zusammensetzung der Karma-Schicksal-Beratung",
    premiumMapHeading: "Ein Karma-Schicksal-Bericht mit über 30.000 Zeichen",
    premiumMapDesc: "Passend zu einer Premium-Beratung verweben wir Saju-, Astrologie- und vedische Symbolik mit realen Handlungsstrategien über eine 16-kapitelige Erzählung.",
    formHeading: "Informationen, um den Faden Ihres Schicksals zu lesen",
    profileLoadAria: "Geburtsinformationen aus Ihrer Profilkarte laden",
    profileLoadCta: "Aus Profilkarte laden",
    nameOrNicknameLabel: "Name oder Spitzname",
    namePlaceholder: "z. B.: Harin",
    genderLabel: "Geschlecht",
    genderSelectOption: "Auswählen",
    genderFemale: "Weiblich",
    genderMale: "Männlich",
    genderUnknown: "Möchte ich nicht angeben",
    birthDateLabel: "Geburtsdatum",
    calendarTypeLabel: "Solar-/Mondkalender",
    calendarSolarOption: "Solarkalender",
    calendarLunarOption: "Mondkalender",
    birthTimeLabel: "Geburtszeit",
    birthTimeUnknownLabel: "Geburtszeit unbekannt",
    birthTimeUnknownNote: "Wir konzentrieren uns auf den Fluss, der aus den von Ihnen bereitgestellten Informationen gelesen werden kann.",
    birthPlaceHeading: "Geburtsort",
    majorCityLabel: "Wichtige Stadt",
    customInputOrSelectOption: "Manuell eingeben oder auswählen",
    cityLabel: "Stadt",
    countryLabel: "Land",
    latitudeLabel: "Breitengrad",
    longitudeLabel: "Längengrad",
    timezoneLabel: "Zeitzone",
    topicLabel: "Beratungsthema",
    questionLabel: "Was Sie jetzt am meisten interessiert",
    questionPlaceholderCustom: "Bitte schreiben Sie den Schicksalsknoten, den Sie jetzt am liebsten lösen möchten.",
    questionPlaceholderDefault: "Leer lassen, und die Beratung konzentriert sich auf das von Ihnen gewählte Thema.",
    priceLabelPrefix: "Beratungspreis ",
    submitBusyLabel: "Dem Faden Ihres Schicksals folgend...",
    submitCta: "Erhalten Sie Ihre Karma-Schicksal-Expertenberatung",
    resultCardHeading: "Beratungskarte",
    fullscreenCta: "Vollbild",
    summaryKeywordLabel: "Zentrale Karma-Schlüsselwörter",
    repeatingPatternLabel: "Wiederkehrendes Muster",
    repeatingPatternFallback: "Ein Fluss, in dem vertraute emotionale Reaktionen dieselben Entscheidungen wiederholen",
    currentTaskLabel: "Aktuell zu lösende Aufgabe",
    currentTaskFallback: "Eine andere Entscheidung in derselben Szene üben",
    sajuLensLabel: "Saju",
    westernLensLabel: "Westliche Astrologie",
    vedicLensLabel: "Vedische Astrologie",
    emptyStateTitle: "Bereit, den Faden Ihres Schicksals zu entfalten.",
    emptyStateDesc: "Basierend auf den von Ihnen eingegebenen Informationen verbindet die Beratung wiederkehrende Lebensmuster mit Ihrer aktuellen Frage.",
    assistantRoleLabel: "Berater",
    userRoleLabel: "Ich",
    followUpPlaceholder: "Stellen Sie eine Anschlussfrage zu dem Fluss, den Sie genauer erkunden möchten.",
    askCta: "Fragen",
    defaultKeywords: ["Wiederkehrende Entscheidungen", "Knoten in Beziehungen", "Ungelöstes Talent"],
    resultModalTitle: "Brief des Schicksals",
    savingLabel: "Wird gespeichert",
    pdfSaveLabel: "PDF speichern",
    closeAriaLabel: "Schließen",
    coverSubtitleNoBirthDate: "Geburtsdatum nicht eingegeben",
    defaultUserName: "Sie",
    pdfCoverTitle: (name) => `Karma-Schicksal-Brief von ${name}`,
    pdfCoverSubtitleLine: (name) => `Schicksal (命) · Karma (業) · Zeit (時) von ${name}`,
    pdfDownloadErrorMessage: "Beim Speichern des PDFs ist ein Problem aufgetreten. Bitte versuchen Sie es in Kürze erneut.",
    chartDataHeading: "In der Beratung verwendete Chart-Daten",
    chartDataDesc: "Enthält die berechneten Werte aus Saju, westlicher Astrologie und vedischer Astrologie zusammen.",
  },
  nl: {
    featureReason: "Karma-lot expertconsult",
    loginRequiredMessage: "Je moet inloggen om het consult te starten. Log in en probeer het opnieuw.",
    paymentRequiredMessage: "Je hebt een pas nodig voor het Karma-lot expertconsult. We openen de kassa voor je.",
    paymentVerifyFailedMessage: "De betaalbevestiging is niet voltooid. Als je al betaald hebt, probeer het dan later opnieuw.",
    paymentCancelledMessage: "De betaling is geannuleerd. Je kunt op elk gewenst moment opnieuw doorgaan.",
    serverErrorMessage: "Er is een probleem opgetreden bij het voorbereiden van het consult. Er is geen betaling afgeschreven.",
    llmErrorMessage: "Er is een probleem opgetreden bij het genereren van de consultinhoud. Als er iets is afgeschreven, wordt dit automatisch hersteld.",
    requiredInputMessage: "Er ontbreekt informatie voor het Karma-lot consult. Controleer je geboortedatum, geslacht en geboortetijd opnieuw.",
    birthTimeRequiredMessage: "De diepte van de Karma-lot lezing hangt af van de geboortetijd. Voer je geboortetijd in of selecteer \"Geboortetijd onbekend\".",
    customQuestionRequiredMessage: "Als je koos voor een eigen vraag, schrijf dan kort op wat je nu het liefst wilt weten.",
    networkErrorMessage: "De verbinding lijkt instabiel. Probeer het later opnieuw.",
    karmaSectionFallbackTitles: [
      "業 — Het kernthema van je lot", "源 — De oorsprong van je lot", "流 — De huidige levensstroom", "課 — De kerntaak van karma",
      "緣 — Het karma van relaties", "情 — Het karma van liefde", "財 — Het karma van geld", "職 — Het karma van carrière", "體 — Gezondheidsenergie",
      "才 — Verborgen talent", "轉 — Het keerpunt van het lot", "策 — Strategie voor toekomstige groei", "總 — Een synthese van vijf perspectieven",
      "句 — De sleutelzin die het lot verandert", "箋 — Laatste brief",
    ],
    loadingStageLabels: [
      "De pilaren van Saju worden opgezet...", "De 12 Ziwei-huizen worden ontvouwen...", "De banden van de 27 Sukuyo-maanhuizen worden geweven...",
      "De psychologie van de sterren wordt gelezen...", "Het vedische karma wordt afgewogen...", "Vijf perspectieven worden tot één samengebracht...",
    ],
    premiumValueCards: [
      "Het karma van terugkerende relaties", "Patronen in geld en overleven", "De richting van carrière en roeping", "Emotionele schulden van het gezin van herkomst",
      "De oplossingsstroom voor het komende jaar", "Een 3-jarige langetermijn lotstrategie", "Een laatste brief van je consulent",
    ],
    focusAreaLabel: {
      overall: "Je algehele lotskarma", lifePattern: "Terugkerende levenspatronen", love: "Het karma van liefde en afscheid",
      money: "Terugkerende patronen met geld", career: "De richting van werk en roeping", relationship: "Terugkerende emoties in relaties",
      family: "Het karma van familie en banden", spirituality: "Innerlijke en spirituele groei", custom: "Stel je eigen vraag",
    },
    placePresetLabel: {
      Seoul: "Seoul, Zuid-Korea", Busan: "Busan, Zuid-Korea", Tokyo: "Tokio, Japan", "New York": "New York, VS",
      "Los Angeles": "Los Angeles, VS", London: "Londen, VK", Paris: "Parijs, Frankrijk",
    },
    lensFallbackSummary: {
      saju: "Bekijkt terugkerende keuzegewoontes via de balans van de Dagheer en de Vijf Elementen.",
      ziwei: "Bekijkt je levenspodium en sociale rol via de plaatsing van het Levenspaleis en de 12 Ziwei-huizen.",
      sukuyo: "Bekijkt de positie die je meestal inneemt in relaties via de afstand tussen je geboortehuis en de 27 maanhuizen.",
      westernAstrology: "Bekijkt je terugkerende emotionele patronen via de stroom van Zon en Maan.",
      vedicAstrology: "Bekijkt vertrouwde gewoontes en groeirichting via de Rahu-Ketu-as.",
    },
    chartBlockLabel: { saju: "Saju", ziwei: "Ziwei", sukuyo: "Sukuyo", westernAstrology: "Westerse Astrologie", vedicAstrology: "Vedische Astrologie" },
    chartBlockTitle: {
      saju: "Saju Geboortehoroscoop Gegevens", ziwei: "Ziwei Doushu Chart Gegevens", sukuyo: "27 Sukuyo Maanhuis Gegevens",
      westernAstrology: "Westerse Astrologie Chart Gegevens", vedicAstrology: "Vedische Astrologie Chart Gegevens",
    },
    gateCheckTitle: "Pas wordt gecontroleerd",
    gateCheckCompleteTitle: "Pascontrole voltooid",
    gateCheckCompleteMessage: "Je pas is bevestigd. De stroom van je karma wordt gelezen.",
    gateCheckFailedTitle: "Pascontrole mislukt",
    statusPreparing: "Het register van je lot wordt ontvouwen",
    statusPayment: "Controleer de kassa",
    statusReading: "Terugkerende levenspatronen en de stroom van karma worden gelezen",
    statusReady: "Het consult gaat door",
    statusIdle: "Klaar om de draad van je lot te ontvouwen",
    accessTypeLabelPrefix: "Toegangsmethode: ",
    heroAriaLabel: "Karma-lot expertconsult",
    heroTitle: "Karma-lot expertconsult",
    heroDescription: "In de terugkerende stroom van je leven onthullen we het patroon dat je nu moet doorbreken en het nieuwe pad dat je moet openen.",
    premiumMapAriaLabel: "Samenstelling van het Karma-lot consult",
    premiumMapHeading: "Een Karma-lot rapport van meer dan 30.000 tekens",
    premiumMapDesc: "Passend bij een premium consult verweven we Saju-, astrologie- en vedische symboliek met echte actiestrategieën in een verhaal van 16 hoofdstukken.",
    formHeading: "Informatie om de draad van je lot te lezen",
    profileLoadAria: "Geboortegegevens laden vanuit je profielkaart",
    profileLoadCta: "Laden vanuit profielkaart",
    nameOrNicknameLabel: "Naam of bijnaam",
    namePlaceholder: "bijv.: Harin",
    genderLabel: "Geslacht",
    genderSelectOption: "Selecteren",
    genderFemale: "Vrouw",
    genderMale: "Man",
    genderUnknown: "Liever niet zeggen",
    birthDateLabel: "Geboortedatum",
    calendarTypeLabel: "Zonne-/maankalender",
    calendarSolarOption: "Zonnekalender",
    calendarLunarOption: "Maankalender",
    birthTimeLabel: "Geboortetijd",
    birthTimeUnknownLabel: "Geboortetijd onbekend",
    birthTimeUnknownNote: "We richten ons op de stroom die kan worden gelezen uit de informatie die je hebt opgegeven.",
    birthPlaceHeading: "Geboorteplaats",
    majorCityLabel: "Belangrijke stad",
    customInputOrSelectOption: "Handmatig invoeren of selecteren",
    cityLabel: "Stad",
    countryLabel: "Land",
    latitudeLabel: "Breedtegraad",
    longitudeLabel: "Lengtegraad",
    timezoneLabel: "Tijdzone",
    topicLabel: "Consultonderwerp",
    questionLabel: "Wat je nu het meest intrigeert",
    questionPlaceholderCustom: "Schrijf de lotsknoop op die je nu het liefst wilt ontrafelen.",
    questionPlaceholderDefault: "Laat leeg en het consult richt zich op het onderwerp dat je hebt gekozen.",
    priceLabelPrefix: "Consultprijs ",
    submitBusyLabel: "De draad van je lot volgend...",
    submitCta: "Ontvang je Karma-lot Expertconsult",
    resultCardHeading: "Consultkaart",
    fullscreenCta: "Volledig scherm",
    summaryKeywordLabel: "Kernwoorden van karma",
    repeatingPatternLabel: "Terugkerend patroon",
    repeatingPatternFallback: "Een stroom waarin vertrouwde emotionele reacties dezelfde keuzes herhalen",
    currentTaskLabel: "Huidige op te lossen taak",
    currentTaskFallback: "Een andere keuze oefenen in dezelfde scène",
    sajuLensLabel: "Saju",
    westernLensLabel: "Westerse Astrologie",
    vedicLensLabel: "Vedische Astrologie",
    emptyStateTitle: "Klaar om de draad van je lot te ontvouwen.",
    emptyStateDesc: "Op basis van de informatie die je hebt ingevoerd, verbindt het consult terugkerende levenspatronen met je huidige vraag.",
    assistantRoleLabel: "Consulent",
    userRoleLabel: "Ik",
    followUpPlaceholder: "Stel een vervolgvraag over de stroom die je dieper wilt verkennen.",
    askCta: "Vraag stellen",
    defaultKeywords: ["Terugkerende keuzes", "Knopen in relaties", "Onopgelost talent"],
    resultModalTitle: "Brief van het Lot",
    savingLabel: "Opslaan",
    pdfSaveLabel: "PDF opslaan",
    closeAriaLabel: "Sluiten",
    coverSubtitleNoBirthDate: "Geboortedatum niet ingevoerd",
    defaultUserName: "Jij",
    pdfCoverTitle: (name) => `Karma-lot brief van ${name}`,
    pdfCoverSubtitleLine: (name) => `Lot (命) · Karma (業) · Tijd (時) van ${name}`,
    pdfDownloadErrorMessage: "Er is een probleem opgetreden bij het opslaan van de PDF. Probeer het later opnieuw.",
    chartDataHeading: "Chartgegevens gebruikt in het consult",
    chartDataDesc: "Bevat de berekende waarden van Saju, westerse astrologie en vedische astrologie samen.",
  },
  ms: {
    featureReason: "Perundingan pakar Karma Takdir",
    loginRequiredMessage: "Anda perlu log masuk untuk memulakan perundingan. Sila log masuk dan cuba lagi.",
    paymentRequiredMessage: "Anda memerlukan pas untuk perundingan pakar Karma Takdir. Kami akan membuka halaman pembayaran untuk anda.",
    paymentVerifyFailedMessage: "Pengesahan pembayaran belum selesai. Jika anda sudah membayar, sila cuba lagi sebentar lagi.",
    paymentCancelledMessage: "Pembayaran telah dibatalkan. Anda boleh meneruskan semula apabila perlu.",
    serverErrorMessage: "Masalah berlaku semasa menyediakan perundingan. Tiada pembayaran ditolak.",
    llmErrorMessage: "Masalah berlaku semasa menjana kandungan perundingan. Jika ada jumlah yang ditolak, ia akan dipulihkan secara automatik.",
    requiredInputMessage: "Maklumat yang diperlukan untuk perundingan Karma Takdir tidak lengkap. Sila semak semula tarikh lahir, jantina dan masa lahir anda.",
    birthTimeRequiredMessage: "Kedalaman bacaan Karma Takdir bergantung kepada masa lahir. Sila masukkan masa lahir anda atau pilih \"Masa lahir tidak diketahui\".",
    customQuestionRequiredMessage: "Jika anda memilih untuk bertanya soalan sendiri, sila tulis secara ringkas apa yang paling ingin anda ketahui sekarang.",
    networkErrorMessage: "Sambungan kelihatan tidak stabil. Sila cuba lagi sebentar lagi.",
    karmaSectionFallbackTitles: [
      "業 — Tema teras takdir anda", "源 — Asal usul takdir anda", "流 — Aliran semasa kehidupan", "課 — Tugas teras karma",
      "緣 — Karma perhubungan", "情 — Karma cinta", "財 — Karma wang", "職 — Karma kerjaya", "體 — Tenaga kesihatan",
      "才 — Bakat tersembunyi", "轉 — Titik perubahan takdir", "策 — Strategi pertumbuhan masa depan", "總 — Kesimpulan menyeluruh daripada lima perspektif",
      "句 — Ayat kunci yang mengubah takdir", "箋 — Surat terakhir",
    ],
    loadingStageLabels: [
      "Membina tiang Saju...", "Membuka 12 istana Ziwei...", "Menganyam ikatan 27 rumah Sukuyo...",
      "Membaca psikologi bintang...", "Menimbang karma kebijaksanaan Veda...", "Menggabungkan lima perspektif menjadi satu...",
    ],
    premiumValueCards: [
      "Karma hubungan yang berulang", "Corak wang dan kelangsungan hidup", "Hala tuju kerjaya dan panggilan jiwa", "Hutang emosi keluarga asal",
      "Aliran penyelesaian untuk tahun akan datang", "Strategi takdir jangka panjang 3 tahun", "Surat terakhir daripada perunding anda",
    ],
    focusAreaLabel: {
      overall: "Karma takdir keseluruhan anda", lifePattern: "Corak kehidupan berulang", love: "Karma cinta dan perpisahan",
      money: "Corak berulang dengan wang", career: "Hala tuju kerja dan panggilan jiwa", relationship: "Emosi berulang dalam perhubungan",
      family: "Karma keluarga dan ikatan", spirituality: "Pertumbuhan dalaman dan rohani", custom: "Tanya soalan sendiri",
    },
    placePresetLabel: {
      Seoul: "Seoul, Korea Selatan", Busan: "Busan, Korea Selatan", Tokyo: "Tokyo, Jepun", "New York": "New York, AS",
      "Los Angeles": "Los Angeles, AS", London: "London, UK", Paris: "Paris, Perancis",
    },
    lensFallbackSummary: {
      saju: "Melihat tabiat pilihan berulang melalui keseimbangan Tuan Hari dan Lima Elemen.",
      ziwei: "Melihat pentas kehidupan dan peranan sosial anda melalui kedudukan Istana Kehidupan dan 12 istana Ziwei.",
      sukuyo: "Melihat kedudukan yang biasa anda ambil dalam perhubungan melalui jarak antara rumah kelahiran anda dan 27 rumah bulan.",
      westernAstrology: "Melihat corak emosi berulang anda melalui aliran Matahari dan Bulan.",
      vedicAstrology: "Melihat tabiat biasa dan hala tuju pertumbuhan melalui paksi Rahu-Ketu.",
    },
    chartBlockLabel: { saju: "Saju", ziwei: "Ziwei", sukuyo: "Sukuyo", westernAstrology: "Astrologi Barat", vedicAstrology: "Astrologi Veda" },
    chartBlockTitle: {
      saju: "Data Carta Kelahiran Saju", ziwei: "Data Carta Ziwei Doushu", sukuyo: "Data 27 Rumah Sukuyo",
      westernAstrology: "Data Carta Astrologi Barat", vedicAstrology: "Data Carta Astrologi Veda",
    },
    gateCheckTitle: "Menyemak pas",
    gateCheckCompleteTitle: "Semakan pas selesai",
    gateCheckCompleteMessage: "Pas anda telah disahkan. Sedang membaca aliran karma anda.",
    gateCheckFailedTitle: "Semakan pas gagal",
    statusPreparing: "Sedang membuka rekod takdir anda",
    statusPayment: "Sila semak halaman pembayaran",
    statusReading: "Sedang membaca corak kehidupan berulang dan aliran karma",
    statusReady: "Perundingan diteruskan",
    statusIdle: "Sedia untuk membuka benang takdir anda",
    accessTypeLabelPrefix: "Kaedah akses: ",
    heroAriaLabel: "Perundingan pakar Karma Takdir",
    heroTitle: "Perundingan pakar Karma Takdir",
    heroDescription: "Dalam aliran berulang kehidupan anda, kami mendedahkan corak yang perlu diputuskan sekarang dan jalan baharu yang perlu dibuka.",
    premiumMapAriaLabel: "Komposisi perundingan Karma Takdir",
    premiumMapHeading: "Laporan Karma Takdir Melebihi 30,000 Aksara",
    premiumMapDesc: "Bersesuaian dengan perundingan premium, kami menganyam simbolisme Saju, astrologi dan Veda bersama strategi tindakan sebenar sepanjang naratif 16 bab.",
    formHeading: "Maklumat untuk Membaca Benang Takdir Anda",
    profileLoadAria: "Muatkan maklumat kelahiran daripada kad profil",
    profileLoadCta: "Muatkan daripada kad profil",
    nameOrNicknameLabel: "Nama atau nama panggilan",
    namePlaceholder: "cth.: Harin",
    genderLabel: "Jantina",
    genderSelectOption: "Pilih",
    genderFemale: "Perempuan",
    genderMale: "Lelaki",
    genderUnknown: "Tidak mahu nyatakan",
    birthDateLabel: "Tarikh lahir",
    calendarTypeLabel: "Kalendar suria/lunar",
    calendarSolarOption: "Suria",
    calendarLunarOption: "Lunar",
    birthTimeLabel: "Masa lahir",
    birthTimeUnknownLabel: "Masa lahir tidak diketahui",
    birthTimeUnknownNote: "Kami akan menumpukan pada aliran yang boleh dibaca daripada maklumat yang anda berikan.",
    birthPlaceHeading: "Tempat lahir",
    majorCityLabel: "Bandar utama",
    customInputOrSelectOption: "Masukkan secara manual atau pilih",
    cityLabel: "Bandar",
    countryLabel: "Negara",
    latitudeLabel: "Latitud",
    longitudeLabel: "Longitud",
    timezoneLabel: "Zon waktu",
    topicLabel: "Topik perundingan",
    questionLabel: "Apa yang paling ingin anda ketahui sekarang",
    questionPlaceholderCustom: "Sila tulis simpulan takdir yang paling ingin anda leraikan sekarang.",
    questionPlaceholderDefault: "Biarkan kosong dan perundingan akan tertumpu pada topik yang anda pilih.",
    priceLabelPrefix: "Harga penggunaan perundingan ",
    submitBusyLabel: "Mengikuti benang takdir anda...",
    submitCta: "Dapatkan Perundingan Pakar Karma Takdir Anda",
    resultCardHeading: "Kad Perundingan",
    fullscreenCta: "Skrin penuh",
    summaryKeywordLabel: "Kata kunci teras karma",
    repeatingPatternLabel: "Corak berulang",
    repeatingPatternFallback: "Aliran di mana reaksi emosi biasa mengulangi pilihan yang sama",
    currentTaskLabel: "Tugas semasa yang perlu diselesaikan",
    currentTaskFallback: "Berlatih membuat pilihan berbeza dalam senario yang sama",
    sajuLensLabel: "Saju",
    westernLensLabel: "Astrologi Barat",
    vedicLensLabel: "Astrologi Veda",
    emptyStateTitle: "Sedia untuk membuka benang takdir anda.",
    emptyStateDesc: "Berdasarkan maklumat yang anda masukkan, perundingan menghubungkan corak kehidupan berulang dengan soalan semasa anda.",
    assistantRoleLabel: "Perunding",
    userRoleLabel: "Saya",
    followUpPlaceholder: "Tanya soalan susulan tentang aliran yang ingin anda terokai lebih mendalam.",
    askCta: "Bertanya",
    defaultKeywords: ["Pilihan berulang", "Simpulan dalam perhubungan", "Bakat yang belum selesai"],
    resultModalTitle: "Surat Takdir",
    savingLabel: "Menyimpan",
    pdfSaveLabel: "Simpan PDF",
    closeAriaLabel: "Tutup",
    coverSubtitleNoBirthDate: "Tarikh lahir tidak dimasukkan",
    defaultUserName: "Anda",
    pdfCoverTitle: (name) => `Surat Karma Takdir ${name}`,
    pdfCoverSubtitleLine: (name) => `Takdir (命) · Karma (業) · Masa (時) ${name}`,
    pdfDownloadErrorMessage: "Masalah berlaku semasa menyimpan PDF. Sila cuba lagi sebentar lagi.",
    chartDataHeading: "Data Carta Digunakan dalam Perundingan",
    chartDataDesc: "Merangkumi nilai yang dikira daripada Saju, astrologi Barat dan astrologi Veda bersama-sama.",
  },
};

function getKarmaDestinyCopy(locale: LoadingLocale): KarmaDestinyCopy {
  return KARMA_DESTINY_COPY[locale] || KARMA_DESTINY_EN;
}

function useKarmaDestinyCopy(): KarmaDestinyCopy {
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
  return getKarmaDestinyCopy(locale);
}

const FEATURE_KEY = "karma-destiny-ai-consultation";
const FEATURE_COST = 300;
const FEATURE_AMOUNT_KRW = 30000;

const FOCUS_AREA_OPTIONS: Array<{ value: FocusAreaType; label: string }> = [
  { value: "overall", label: "전체 운명의 업" },
  { value: "lifePattern", label: "반복되는 인생 패턴" },
  { value: "love", label: "사랑과 이별의 업" },
  { value: "money", label: "돈에서 반복되는 흐름" },
  { value: "career", label: "일과 사명의 방향" },
  { value: "relationship", label: "관계에서 반복되는 감정" },
  { value: "family", label: "가족과 인연의 업" },
  { value: "spirituality", label: "내면과 영혼의 성장" },
  { value: "custom", label: "직접 질문" },
];

const PLACE_PRESETS = [
  { label: "서울, 대한민국", city: "Seoul", country: "South Korea", latitude: "37.5665", longitude: "126.9780", timezone: "Asia/Seoul" },
  { label: "부산, 대한민국", city: "Busan", country: "South Korea", latitude: "35.1796", longitude: "129.0756", timezone: "Asia/Seoul" },
  { label: "도쿄, 일본", city: "Tokyo", country: "Japan", latitude: "35.6762", longitude: "139.6503", timezone: "Asia/Tokyo" },
  { label: "뉴욕, 미국", city: "New York", country: "United States", latitude: "40.7128", longitude: "-74.0060", timezone: "America/New_York" },
  { label: "로스앤젤레스, 미국", city: "Los Angeles", country: "United States", latitude: "34.0522", longitude: "-118.2437", timezone: "America/Los_Angeles" },
  { label: "런던, 영국", city: "London", country: "United Kingdom", latitude: "51.5072", longitude: "-0.1276", timezone: "Europe/London" },
  { label: "파리, 프랑스", city: "Paris", country: "France", latitude: "48.8566", longitude: "2.3522", timezone: "Europe/Paris" },
];

const defaultForm = (): ConsultationForm => ({
  name: "",
  gender: "",
  birthDate: "",
  birthTime: "",
  birthTimeUnknown: false,
  calendarType: "solar",
  birthPlace: {
    city: "Seoul",
    country: "South Korea",
    latitude: "37.5665",
    longitude: "126.9780",
    timezone: "Asia/Seoul",
  },
  focusArea: "overall",
  question: "",
});

function applyProfileSeedToForm(form: ConsultationForm, profile: AiPrefillSeed): ConsultationForm {
  if (!profile.name && !profile.gender && !profile.birthDate && !profile.birthTime && !profile.calendarType && !profile.timezone && !profile.city && !profile.country && profile.birthTimeUnknown === undefined && !profile.latitude && !profile.longitude) {
    return form;
  }
  const birthplace = {
    city: profile.city || form.birthPlace.city,
    country: profile.country || form.birthPlace.country,
    latitude: profile.latitude || form.birthPlace.latitude,
    longitude: profile.longitude || form.birthPlace.longitude,
    timezone: profile.timezone || form.birthPlace.timezone,
  };
  const resolvedGender = (profile.gender as GenderType) || form.gender;
  return {
    ...form,
    name: profile.name || form.name,
    gender: resolvedGender,
    birthDate: profile.birthDate || form.birthDate,
    birthTimeUnknown: profile.birthTimeUnknown ?? form.birthTimeUnknown,
    birthTime: profile.birthTimeUnknown === true ? "" : profile.birthTime || form.birthTime,
    calendarType: profile.calendarType || form.calendarType,
    birthPlace: {
      ...form.birthPlace,
      ...birthplace,
    },
  };
}

function buildInitialForm(): ConsultationForm {
  return applyProfileSeedToForm(defaultForm(), readAiProfileSeed());
}

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `kdai-${crypto.randomUUID()}`;
  return `kdai-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function toNumberOrUndefined(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function buildConsultationPayload(form: ConsultationForm) {
  const latitude = toNumberOrUndefined(form.birthPlace.latitude);
  const longitude = toNumberOrUndefined(form.birthPlace.longitude);
  const birthPlace = {
    city: form.birthPlace.city.trim(),
    country: form.birthPlace.country.trim(),
    latitude,
    longitude,
    timezone: form.birthPlace.timezone.trim(),
  };
  return {
    serviceType: "karma-ai-consultation",
    consultationType: "destinyKarma",
    userName: form.name.trim(),
    gender: form.gender,
    birthDate: form.birthDate,
    birthTime: form.birthTimeUnknown ? "" : form.birthTime,
    birthTimeUnknown: form.birthTimeUnknown,
    calendarType: form.calendarType,
    birthPlace,
    latitude,
    longitude,
    timezone: birthPlace.timezone,
    focusArea: form.focusArea,
    question: form.question.trim(),
    locale: detectLocale(),
    birthInfo: {
      name: form.name.trim(),
      gender: form.gender,
      birthDate: form.birthDate,
      birthTime: form.birthTimeUnknown ? "" : form.birthTime,
      birthTimeUnknown: form.birthTimeUnknown,
      calendarType: form.calendarType,
      birthPlace,
    },
  };
}

function validateConsultationForm(form: ConsultationForm, copy: KarmaDestinyCopy) {
  if (!form.birthDate || !form.gender || !form.calendarType) return copy.requiredInputMessage;
  if (!form.birthTimeUnknown && !form.birthTime) return copy.birthTimeRequiredMessage;
  if (form.focusArea === "custom" && form.question.trim().length < 2) return copy.customQuestionRequiredMessage;
  return "";
}

async function postJson<T>(path: string, body: Record<string, unknown>, idempotencyKey?: string): Promise<{ response: Response; payload: T }> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    credentials: "include",
    body: JSON.stringify(idempotencyKey ? { ...body, idempotencyKey } : body),
  });
  const payload = await response.json().catch(() => ({})) as T;
  return { response, payload };
}

type LensKey = "saju" | "ziwei" | "sukuyo" | "westernAstrology" | "vedicAstrology";

/** 다섯 렌즈는 integratedResult.lenses 아래에 있고, 구 3체계는 최상위 별칭으로도 남아 있다. */
function readLensData(result: IntegratedResult | null | undefined, key: LensKey): unknown {
  const lenses = (result as Record<string, unknown> | null | undefined)?.lenses;
  const lensId = key === "westernAstrology" ? "western" : key === "vedicAstrology" ? "vedic" : key;
  const block = lenses && typeof lenses === "object" ? (lenses as Record<string, unknown>)[lensId] : null;
  if (block && typeof block === "object") {
    const data = (block as Record<string, unknown>).data;
    if (data && typeof data === "object") return data;
  }
  return (result as Record<string, unknown> | null | undefined)?.[key];
}

function summarizeSystem(result: IntegratedResult | null | undefined, key: LensKey, copy: KarmaDestinyCopy) {
  const source = readLensData(result, key);
  if (!source || typeof source !== "object") return copy.lensFallbackSummary[key];
  const summary = String((source as Record<string, unknown>).patternSummary || "").trim();
  return summary || copy.lensFallbackSummary[key];
}

function formatChartDataValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const primitiveValues = value
      .filter((item) => item !== null && item !== undefined && typeof item !== "object")
      .map((item) => String(item).trim())
      .filter(Boolean);
    if (primitiveValues.length) return primitiveValues.slice(0, 8).join(", ");
    return value.slice(0, 3).map((item) => formatChartDataValue(item)).filter(Boolean).join(" / ");
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => [key, formatChartDataValue(item)] as const)
      .filter(([, item]) => item);
    return entries.slice(0, 6).map(([key, item]) => `${key}: ${item}`).join(" · ");
  }
  return "";
}

function formatChartDataLabel(path: string): string {
  return path
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function collectChartDataRows(source: unknown, prefix = "", limit = 18): { label: string; value: string }[] {
  if (!source || typeof source !== "object") return [];
  const rows: { label: string; value: string }[] = [];
  for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
    if (rows.length >= limit) break;
    const path = prefix ? `${prefix}.${key}` : key;
    const directValue = formatChartDataValue(value);
    if (directValue && (typeof value !== "object" || Array.isArray(value))) {
      rows.push({ label: formatChartDataLabel(path), value: directValue });
      continue;
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = collectChartDataRows(value, path, limit - rows.length);
      if (nested.length) rows.push(...nested);
      else if (directValue) rows.push({ label: formatChartDataLabel(path), value: directValue });
    } else if (directValue) {
      rows.push({ label: formatChartDataLabel(path), value: directValue });
    }
  }
  return rows.slice(0, limit);
}

function buildChartDataBlocks(result: IntegratedResult | null | undefined, copy: KarmaDestinyCopy): ChartDataBlock[] {
  // 자미 12궁·숙요 27수 관계축은 항목이 많아 기본 limit(18)로는 잘린다.
  const configs = [
    { key: "saju" as const, limit: 18 },
    { key: "ziwei" as const, limit: 30 },
    { key: "sukuyo" as const, limit: 26 },
    { key: "westernAstrology" as const, limit: 22 },
    { key: "vedicAstrology" as const, limit: 22 },
  ];
  return configs
    .map(({ key, limit }) => {
      const data = readLensData(result, key);
      const rows = collectChartDataRows(data, "", limit).filter((row) => row.value.length <= 260);
      return {
        key,
        label: copy.chartBlockLabel[key],
        title: copy.chartBlockTitle[key],
        summary: summarizeSystem(result, key, copy),
        rows,
      };
    })
    // 계산되지 않은 렌즈는 빈 카드로 남기지 않고 아예 뺀다("기준" 한 줄짜리 유령 카드 금지).
    .filter((block) => block.rows.length > 0);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function toText(value: unknown) {
  return toDisplayText(value);
}

function toNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function buildBillingGateInput(paymentPayload: BillingGatePayload, idempotencyKey: string, copy: KarmaDestinyCopy) {
  const runtimeGate = asRecord(paymentPayload.runtimeGate);
  return {
    categoryKey: toText(runtimeGate.categoryKey || "premium-consultation"),
    subFeatureKey: toText(runtimeGate.subFeatureKey || FEATURE_KEY),
    featureKey: toText(runtimeGate.featureKey || paymentPayload.featureKey) || FEATURE_KEY,
    reason: toText(runtimeGate.reason || paymentPayload.reason) || copy.featureReason,
    productId: toText(runtimeGate.productId || "karma-destiny-ai"),
    productType: toText(runtimeGate.productType || "karma-destiny-ai"),
    serviceType: toText(runtimeGate.serviceType || "karma-ai-consultation"),
    requestId: idempotencyKey,
    idempotencyKey,
    deferUsage: true,
    usagePolicy: "apply_after_success",
    cost: toNumber(runtimeGate.cost ?? paymentPayload.cost ?? paymentPayload.coinPrice, FEATURE_COST),
    coinPrice: toNumber(runtimeGate.coinPrice ?? paymentPayload.coinPrice ?? paymentPayload.cost, FEATURE_COST),
    amountKRW: toNumber(runtimeGate.amountKRW ?? paymentPayload.amountKRW ?? paymentPayload.paymentAmount ?? paymentPayload.totalAmount, FEATURE_AMOUNT_KRW),
    membershipCreditCost: toNumber(runtimeGate.membershipCreditCost ?? paymentPayload.membershipCreditCost ?? paymentPayload.cost, FEATURE_COST),
  };
}

// 상담문 파싱이 실패했을 때만 쓰이는 폴백 제목 심볼. 워커 PREMIUM_CHAPTERS 와 어긋나면
// 사용자가 실제로 받은 것과 다른 제목이 표시되므로 순서를 그대로 맞춘다. 폴백 제목 텍스트는
// copy.karmaSectionFallbackTitles(같은 순서)에서 로케일별로 가져온다. 심볼 자체는 한자 상징이라
// 로케일 무관 디자인 요소로 취급한다.
const KARMA_SECTION_SYMBOLS = ["業", "源", "流", "課", "緣", "情", "財", "職", "體", "才", "轉", "策", "總", "句", "箋"] as const;

// 진행 화면 6노드(사주 → 자미두수 → 숙요 → 서양 → 베다 → 종합)와 1:1로 맞춘다.
// 이 화면에는 서버 진행률이 없어 시간 기반으로 넘어간다. 아이콘은 한자 상징이라 로케일 무관.
const LOADING_STAGE_ICONS = ["柱", "紫", "宿", "星", "梵", "業"] as const;
const LOADING_STAGE_DURATIONS = [1800, 2000, 2000, 2000, 2000, 2600] as const;

function splitAssistantSections(content: string, copy: KarmaDestinyCopy): ParsedSection[] {
  let normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  // 구조화 파싱에 실패한 원시(잘린) JSON은 중괄호째 노출하지 않고 읽을 수 있는 문장만 복원한다.
  if (looksLikeRawJson(normalized)) {
    normalized = extractReadableTextFromJsonLike(normalized);
    if (!normalized) return [];
  }

  const fallbackTitleAt = (index: number) =>
    copy.karmaSectionFallbackTitles[index] || copy.karmaSectionFallbackTitles[copy.karmaSectionFallbackTitles.length - 1];
  const fallbackSymbolAt = (index: number) =>
    KARMA_SECTION_SYMBOLS[index] || KARMA_SECTION_SYMBOLS[KARMA_SECTION_SYMBOLS.length - 1];

  const headingPattern = /(?:^|\n)(?:#{1,3}\s*)?(?:[①②③④⑤⑥⑦⑧⑨⑩]\s*)?([命業時情財課箋柱星梵])\s*[—–-]\s*([^\n]+)/g;
  const matches = [...normalized.matchAll(headingPattern)];
  if (matches.length) {
    return matches.map((match, index) => {
      const start = (match.index || 0) + match[0].length;
      const end = matches[index + 1]?.index ?? normalized.length;
      const symbol = match[1] || fallbackSymbolAt(index);
      return {
        symbol,
        title: `${symbol} — ${match[2].replace(/\*\*/g, "").trim()}`,
        body: normalized.slice(start, end).replace(/^\s+/, "").trim(),
      };
    }).filter((section) => section.body);
  }

  const chunks = normalized.split(/\n{2,}/).map((chunk) => chunk.trim()).filter(Boolean);
  return chunks.map((chunk, index) => {
    const lines = chunk.split("\n").map((line) => line.trim()).filter(Boolean);
    const first = lines[0] || "";
    const headingMatch = first.match(/^(?:#{1,3}\s*)?(?:[①②③④⑤⑥⑦⑧⑨⑩]|\d+[.)])?\s*(.{2,48}?)(?:[:：])?$/);
    const hasHeading = Boolean(headingMatch && lines.length > 1 && first.length <= 54);
    return {
      symbol: fallbackSymbolAt(index),
      title: hasHeading ? headingMatch?.[1]?.replace(/\*\*/g, "").trim() || fallbackTitleAt(index) : fallbackTitleAt(index),
      body: hasHeading ? lines.slice(1).join("\n") : chunk,
    };
  });
}

function AssistantMessageContent({ content, copy }: { content: string; copy: KarmaDestinyCopy }) {
  const sections = splitAssistantSections(content, copy);
  if (!sections.length) return <p>{content}</p>;
  return (
    <div className="kdai-section-list">
      {sections.map((section, index) => (
        <section className="kdai-result-section" key={`${section.title}-${index}`}>
          <div className="kdai-result-section__head">
            <span>{section.symbol}</span>
            <h3>{section.title}</h3>
          </div>
          <p>{section.body}</p>
        </section>
      ))}
    </div>
  );
}

function KarmaLoadingScreen({ status, copy }: { status: FlowStatus; copy: KarmaDestinyCopy }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    setStage(status === "reading" ? 1 : 0);
    const timers = LOADING_STAGE_DURATIONS.map((_, index) => {
      const delay = LOADING_STAGE_DURATIONS.slice(0, index).reduce((total, duration) => total + duration, 0);
      return window.setTimeout(() => setStage(index), delay);
    });
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [status]);

  const activeIndex = Math.min(stage, LOADING_STAGE_ICONS.length - 1);

  return (
    <div className="kdai-loading" role="status" aria-live="polite">
      <div className="kdai-loading__seal" aria-hidden="true">
        <div className="kdai-loading__core">{LOADING_STAGE_ICONS[activeIndex]}</div>
        <svg viewBox="0 0 128 128">
          <circle cx="64" cy="64" r="58" />
        </svg>
      </div>
      <div className="kdai-loading__text">
        <p>{copy.loadingStageLabels[activeIndex]}</p>
        <div className="kdai-loading__dots" aria-hidden="true">
          {LOADING_STAGE_ICONS.map((_, index) => (
            <span key={index} data-active={index <= stage} />
          ))}
        </div>
      </div>
    </div>
  );
}

function KarmaResultModal({
  content,
  userData,
  integratedResult,
  onClose,
  onDownloadError,
  copy,
}: {
  content: string;
  userData: ConsultationForm;
  integratedResult: IntegratedResult | null;
  onClose: () => void;
  onDownloadError: (message: string) => void;
  copy: KarmaDestinyCopy;
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const sections = splitAssistantSections(content, copy);
  const chartDataBlocks = buildChartDataBlocks(integratedResult, copy);
  const userName = userData.name.trim() || copy.defaultUserName;
  const birthDate = userData.birthDate || copy.coverSubtitleNoBirthDate;

  const handleDownload = async () => {
    const element = document.getElementById("karma-result-content");
    if (!element || isDownloading) return;
    setIsDownloading(true);
    try {
      const { exportResultPdf } = await import("@/lib/pdf/export-result-pdf");
      const fileName = `karma-destiny_${userName.replace(/[\\/:*?"<>|]/g, "_")}_${new Date().toLocaleDateString(INTL_LOCALE_BY_LOADING_LOCALE[getCurrentLoadingLocale()]).replace(/\./g, "").replace(/\s/g, "")}.pdf`;
      await exportResultPdf({
        captureTargets: ["#karma-result-content [data-kdai-pdf-page]"],
        fileName,
        backgroundColor: "#060412",
        cover: {
          title: copy.pdfCoverTitle(userName),
          subtitle: birthDate,
          name: userName,
          date: new Date().toISOString().slice(0, 10),
        },
      });
    } catch {
      onDownloadError(copy.pdfDownloadErrorMessage);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="kdai-result-modal" role="dialog" aria-modal="true" aria-label={copy.resultModalTitle}>
      <header className="kdai-result-modal__bar">
        <div>
          <h2>{copy.resultModalTitle}</h2>
          <p>{userName} · {birthDate}</p>
        </div>
        <div className="kdai-result-modal__actions">
          <button type="button" onClick={handleDownload} disabled={isDownloading}>
            {isDownloading ? <Loader2 size={17} className="kdai-spin" /> : <Download size={17} />}
            <span>{isDownloading ? copy.savingLabel : copy.pdfSaveLabel}</span>
          </button>
          <button type="button" onClick={onClose} aria-label={copy.closeAriaLabel}>
            <X size={18} />
          </button>
        </div>
      </header>

      <div id="karma-result-content" className="kdai-result-document">
        <div className="kdai-result-cover" data-kdai-pdf-page>
          <span aria-hidden="true">☽</span>
          <h2>{copy.resultModalTitle}</h2>
          <p>{copy.pdfCoverSubtitleLine(userName)}</p>
        </div>

        <section className="kdai-chart-data" data-kdai-pdf-page>
          <div className="kdai-chart-data__head">
            <span>Chart Data</span>
            <h2>{copy.chartDataHeading}</h2>
            <p>{copy.chartDataDesc}</p>
          </div>
          <div className="kdai-chart-data__grid">
            {chartDataBlocks.map((block) => (
              <article key={block.key}>
                <div>
                  <span>{block.label}</span>
                  <h3>{block.title}</h3>
                  <p>{block.summary}</p>
                </div>
                <dl>
                  {block.rows.map((row) => (
                    <div key={`${block.key}-${row.label}`}>
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        </section>

        {sections.map((section, index) => (
          <article className="kdai-result-document__section" data-kdai-pdf-page key={`${section.title}-${index}`}>
            <div>
              <span>{section.symbol}</span>
              <h3>{section.title}</h3>
            </div>
            <p>{section.body}</p>
          </article>
        ))}

        <footer data-kdai-pdf-page>Code Destiny · {new Date().toLocaleDateString(INTL_LOCALE_BY_LOADING_LOCALE[getCurrentLoadingLocale()])}</footer>
      </div>
    </div>
  );
}

export default function KarmaDestinyAiPage() {
  const copy = useKarmaDestinyCopy();
  const [form, setForm] = useState<ConsultationForm>(() => buildInitialForm());
  const [status, setStatus] = useState<FlowStatus>("idle");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [accessType, setAccessType] = useState<AccessType | "">("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [summaryCards, setSummaryCards] = useState<SummaryCards | null>(null);
  const [integratedResult, setIntegratedResult] = useState<IntegratedResult | null>(null);
  const [followUp, setFollowUp] = useState("");
  const [sending, setSending] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const startLockRef = useRef(false);
  const idempotencyKeyRef = useRef(createIdempotencyKey());
  const latestOpenedResultRef = useRef("");
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

  const statusText = useMemo(() => {
    if (status === "preparing") return copy.statusPreparing;
    if (status === "payment") return copy.statusPayment;
    if (status === "reading") return copy.statusReading;
    if (status === "ready") return copy.statusReady;
    return copy.statusIdle;
  }, [status, copy]);

  const isBusy = status === "preparing" || status === "payment" || status === "reading";
  const canAskFollowUp = Boolean(sessionId && messages.length && !sending && !isBusy);
  const latestAssistantContent = useMemo(() => {
    return [...messages].reverse().find((message) => message.role === "assistant")?.content || "";
  }, [messages]);

  useEffect(() => {
    if (status !== "ready" || !latestAssistantContent) return;
    const resultKey = `${sessionId}:${latestAssistantContent.length}:${latestAssistantContent.slice(0, 48)}`;
    if (latestOpenedResultRef.current === resultKey) return;
    latestOpenedResultRef.current = resultKey;
    setResultOpen(true);
  }, [latestAssistantContent, sessionId, status]);

  const resetAttempt = useCallback(() => {
    // 모든 사용자 입력 핸들러가 이 함수를 거치므로, 여기서 입력 시작 여부를 기록
    formTouchedRef.current = true;
    if (isBusy) return;
    idempotencyKeyRef.current = createIdempotencyKey();
    setSessionId("");
    setAccessType("");
    setMessages([]);
    setSummaryCards(null);
    setIntegratedResult(null);
    setResultOpen(false);
    latestOpenedResultRef.current = "";
    setError("");
    setNotice("");
    setStatus("idle");
  }, [isBusy]);

  const updateField = (field: keyof ConsultationForm) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = event.target;
    const value = target instanceof HTMLInputElement && target.type === "checkbox" ? target.checked : target.value;
    setForm((prev) => ({ ...prev, [field]: value } as ConsultationForm));
    resetAttempt();
  };

  const updatePlaceField = (field: keyof BirthPlace) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({
      ...prev,
      birthPlace: { ...prev.birthPlace, [field]: event.target.value },
    }));
    resetAttempt();
  };

  const applyPreset = (event: ChangeEvent<HTMLSelectElement>) => {
    const preset = PLACE_PRESETS.find((item) => item.label === event.target.value);
    if (!preset) return;
    setForm((prev) => ({
      ...prev,
      birthPlace: {
        city: preset.city,
        country: preset.country,
        latitude: preset.latitude,
        longitude: preset.longitude,
        timezone: preset.timezone,
      },
    }));
    resetAttempt();
  };

  const startConsultation = useCallback(async (
    payload: ReturnType<typeof buildConsultationPayload>,
    idempotencyKey: string,
    access: Record<string, unknown>,
  ) => {
    setStatus("reading");
    // 다음 화면(생성 로딩)이 마운트되는 시점 — 게이트 오버레이 hold를 해제한다.
    releasePaidFeatureGate(idempotencyKey);
    const { payload: result } = await postJson<ConsultationResult>("/api/karma-destiny-ai/start", {
      ...payload,
      ...access,
    }, idempotencyKey);

    if (result.ok && result.sessionId) {
      setSessionId(result.sessionId || "");
      setAccessType(result.accessType || "");
      setMessages(Array.isArray(result.messages) ? result.messages : []);
      setSummaryCards(result.summaryCards || null);
      setIntegratedResult(result.integratedResult || null);
      setNotice("");
      setError("");
      setStatus("reading");
      const target = `/karma-destiny-ai/result?sessionId=${encodeURIComponent(result.sessionId)}${result.status === "completed" ? "" : "&pending=1"}`;
      window.location.assign(target);
      return;
    }
    if (result.ok && result.status === "generating") {
      setNotice(result.message || copy.statusReading);
      setStatus("reading");
      return;
    }
    if (result.reason === "PAYMENT_VERIFY_FAILED") throw new Error(copy.paymentVerifyFailedMessage);
    if (result.reason === "LLM_ERROR") throw new Error(copy.llmErrorMessage);
    throw new Error(result.message || copy.serverErrorMessage);
  }, [copy]);

  const runCommonBillingGate = async (paymentPayload: BillingGatePayload, idempotencyKey: string) => {
    const billingInput = buildBillingGateInput(paymentPayload, idempotencyKey, copy);
    const gate = await runBillingCoinGate(billingInput);

    if (!gate.ok || !gate.data) {
      const code = String(gate.error?.code || "").toUpperCase();
      if (code === "AUTH_REQUIRED" || code === "LOGIN_REQUIRED") throw new Error(copy.loginRequiredMessage);
      if (code === "INSUFFICIENT_COINS") throw new Error(copy.paymentRequiredMessage);
      if (code === "PAYMENT_CANCELLED") throw new Error(copy.paymentCancelledMessage);
      throw new Error(gate.error?.message || copy.paymentVerifyFailedMessage);
    }

    return {
      billingGate: gate.data as Record<string, unknown>,
    };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (startLockRef.current || isBusy) return;
    const validationMessage = validateConsultationForm(form, copy);
    if (validationMessage) {
      setNotice("");
      setError(validationMessage);
      setStatus("error");
      return;
    }
    startLockRef.current = true;
    const idempotencyKey = idempotencyKeyRef.current;
    const payload = {
      ...buildConsultationPayload(form),
      requestId: idempotencyKey,
    };
    let paymentAttempted = false;
    setError("");
    setNotice("");
    setStatus("preparing");
    beginPaidFeatureGateCheck({
      featureKey: FEATURE_KEY,
      requestId: idempotencyKey,
      title: copy.gateCheckTitle,
      reason: copy.featureReason,
      paymentMode: "MEMBERSHIP_PASS",
    });
    // 이용권 판정(unlock-status)을 아래 ensure-access 왕복과 겹쳐 돌린다 — 결제 게이트가 같은 키로 재사용해 직렬 왕복이 1회 준다.
    void primePaymentEligibility(buildBillingGateInput({}, idempotencyKey, copy));
    // 확인 완료 후 다음 화면(생성 로딩)이 실제로 뜰 때까지 게이트 오버레이를 유지해 "확인 중 → 공백"을 막는다.
    // release는 startConsultation의 setStatus("reading")에서 호출한다(안전장치 상한 8초).
    holdPaidFeatureGateOpen({ requestId: idempotencyKey, maxMs: 8000 });

    try {
      const { payload: access } = await postJson<EnsureAccessResult>("/api/karma-destiny-ai/ensure-access", payload, idempotencyKey);
      if (access.ok) {
        completePaidFeatureGateCheck({
          featureKey: FEATURE_KEY,
          requestId: idempotencyKey,
          title: copy.gateCheckCompleteTitle,
          reason: copy.featureReason,
          paymentMode: "MEMBERSHIP_PASS",
          message: copy.gateCheckCompleteMessage,
        });
        await startConsultation(payload, idempotencyKey, { accessToken: access.accessToken });
        return;
      }
      const denied = access as Exclude<EnsureAccessResult, { ok: true }>;
      if (denied.reason === "LOGIN_REQUIRED") throw new Error(copy.loginRequiredMessage);
      if (denied.reason === "INVALID_INPUT") throw new Error(denied.message);
      // 이용권 확인 앞단의 일시 장애(degraded)면 dead-end 대신 결제창(단건+월정석)을 연다(요구사항: 확인 실패 시 무조건 결제창).
      // runCommonBillingGate가 billing.js coin-gate로 pass를 재검사(재시도 포함)해 보유자면 무료통과, 미커버/장애면 결제창.
      const passGateDegraded = (denied as Record<string, unknown>).retryable === true || String(denied.reason) === "DB_DEGRADED";
      if (denied.reason === "PAYMENT_REQUIRED" || passGateDegraded) {
        paymentAttempted = true;
        setNotice(("message" in denied && denied.message) || copy.paymentRequiredMessage);
        setStatus("payment");
        const gatePayload = ("paymentPayload" in denied ? denied.paymentPayload : {}) as BillingGatePayload;
        const billingEvidence = await runCommonBillingGate(gatePayload, idempotencyKey);
        await startConsultation(payload, idempotencyKey, billingEvidence);
        return;
      }
      throw new Error("message" in denied ? denied.message || copy.serverErrorMessage : copy.serverErrorMessage);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : copy.serverErrorMessage;
      const paymentCancelled = message === copy.paymentCancelledMessage;
      setError(
        message === copy.loginRequiredMessage
          || message === copy.paymentVerifyFailedMessage
          || message === copy.paymentCancelledMessage
          || message === copy.llmErrorMessage
          || message === copy.paymentRequiredMessage
          || message === copy.requiredInputMessage
          || message === copy.birthTimeRequiredMessage
          || message === copy.customQuestionRequiredMessage
          ? message
          : paymentAttempted
            ? copy.paymentVerifyFailedMessage
            : message || copy.networkErrorMessage,
      );
      setStatus("error");
      failPaidFeatureGateCheck({
        featureKey: FEATURE_KEY,
        requestId: idempotencyKey,
        title: copy.gateCheckFailedTitle,
        reason: copy.featureReason,
        paymentMode: "MEMBERSHIP_PASS",
        message,
        cancelled: paymentCancelled,
      });
    } finally {
      startLockRef.current = false;
    }
  };

  const handleFollowUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = followUp.trim();
    if (!message || !sessionId || sending) return;
    setSending(true);
    setError("");
    try {
      const { payload } = await postJson<ConsultationResult>("/api/karma-destiny-ai/message", { sessionId, message });
      if (!payload.ok || !Array.isArray(payload.messages)) throw new Error(payload.message || copy.llmErrorMessage);
      setMessages(payload.messages);
      setFollowUp("");
      setStatus("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.llmErrorMessage);
    } finally {
      setSending(false);
    }
  };

  const keywords = summaryCards?.keywords?.length ? summaryCards.keywords.slice(0, 3) : copy.defaultKeywords;

  return (
    <main className="kdai-page" data-karma-destiny-ai="v20260629">
      <section className="kdai-hero" aria-label={copy.heroAriaLabel}>
        <div className="kdai-hero__sigil" aria-hidden="true" />
        <div className="kdai-hero__image kdai-hero__image--sigil" data-cd-marker="karma-destiny-ai-css-visual-v20260629" aria-hidden="true">
          <div className="kdai-oracle">
            <span className="kdai-oracle__ring kdai-oracle__ring--outer" />
            <span className="kdai-oracle__ring kdai-oracle__ring--middle" />
            <span className="kdai-oracle__thread kdai-oracle__thread--one" />
            <span className="kdai-oracle__thread kdai-oracle__thread--two" />
            <div className="kdai-oracle__core">
              <span className="kdai-oracle__glyph">業</span>
              <span className="kdai-oracle__axis">命 · 業 · 時</span>
            </div>
            <div className="kdai-oracle__status">{statusText}</div>
            <div className="kdai-oracle__keywords">
              {keywords.map((keyword) => (
                <span className="kdai-oracle__keyword" key={keyword}>{keyword}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="kdai-hero__copy">
          <div className="kdai-kicker"><Moon size={16} /> Karma · Saju · Astrology · Vedic Reading</div>
          <h2>{copy.heroTitle}</h2>
          <p>{copy.heroDescription}</p>
          <div className="kdai-status" data-status={status}>
            {isBusy ? <Loader2 size={16} className="kdai-spin" /> : <Sparkles size={16} />}
            <span>{statusText}</span>
          </div>
          {accessType && <p className="kdai-access">{copy.accessTypeLabelPrefix}{accessType}</p>}
        </div>
      </section>

      <section className="kdai-premium-map" aria-label={copy.premiumMapAriaLabel}>
        <div className="kdai-premium-map__intro">
          <span>Premium Karma Report</span>
          <h2>{copy.premiumMapHeading}</h2>
          <p>{copy.premiumMapDesc}</p>
        </div>
        <div className="kdai-premium-map__cards">
          {copy.premiumValueCards.map((item) => (
            <article key={item}>
              <Sparkles size={16} />
              <strong>{item}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="kdai-workspace">
        <form className="kdai-form kdai-panel" onSubmit={handleSubmit}>
          <div className="kdai-panel-title kdai-panel-title--split">
            <div>
              <CalendarDays size={18} />
              <h2>{copy.formHeading}</h2>
            </div>
            <button
              className="kdai-ghost-action"
              type="button"
              onClick={loadFormFromProfileCard}
              aria-label={copy.profileLoadAria}
            >
              <span>{copy.profileLoadCta}</span>
            </button>
          </div>

          <div className="kdai-grid">
            <label>
              {copy.nameOrNicknameLabel}
              <input value={form.name} onChange={updateField("name")} placeholder={copy.namePlaceholder} maxLength={80} />
            </label>
            <label>
              {copy.genderLabel}
              <select value={form.gender} onChange={updateField("gender")} required>
                <option value="">{copy.genderSelectOption}</option>
                <option value="female">{copy.genderFemale}</option>
                <option value="male">{copy.genderMale}</option>
                <option value="unknown">{copy.genderUnknown}</option>
              </select>
            </label>
            <label>
              {copy.birthDateLabel}
              <input {...birthDateTextInputProps(form.birthDate, (nextBirthDate) => { setForm((prev) => ({ ...prev, birthDate: nextBirthDate })); resetAttempt(); })} required />
            </label>
            <label>
              {copy.calendarTypeLabel}
              <select value={form.calendarType} onChange={updateField("calendarType")} required>
                <option value="solar">{copy.calendarSolarOption}</option>
                <option value="lunar">{copy.calendarLunarOption}</option>
              </select>
            </label>
          </div>

          <div className="kdai-time-row">
            <label>
              {copy.birthTimeLabel}
              <input type="time" value={form.birthTime} onChange={updateField("birthTime")} disabled={form.birthTimeUnknown} required={!form.birthTimeUnknown} />
            </label>
            <label className="kdai-check">
              <input type="checkbox" checked={form.birthTimeUnknown} onChange={updateField("birthTimeUnknown")} />
              <span>{copy.birthTimeUnknownLabel}</span>
            </label>
          </div>
          {form.birthTimeUnknown && <p className="kdai-soft-note">{copy.birthTimeUnknownNote}</p>}

          <div className="kdai-panel-title kdai-place-title">
            <MapPin size={18} />
            <h2>{copy.birthPlaceHeading}</h2>
          </div>
          <label>
            {copy.majorCityLabel}
            <select onChange={applyPreset} value="">
              <option value="">{copy.customInputOrSelectOption}</option>
              {PLACE_PRESETS.map((preset) => <option key={preset.label} value={preset.label}>{copy.placePresetLabel[preset.city] || preset.label}</option>)}
            </select>
          </label>
          <div className="kdai-grid kdai-place-grid">
            <label>
              {copy.cityLabel}
              <input value={form.birthPlace.city} onChange={updatePlaceField("city")} placeholder="Seoul" />
            </label>
            <label>
              {copy.countryLabel}
              <input value={form.birthPlace.country} onChange={updatePlaceField("country")} placeholder="South Korea" />
            </label>
            <label>
              {copy.latitudeLabel}
              <input value={form.birthPlace.latitude} onChange={updatePlaceField("latitude")} inputMode="decimal" placeholder="37.5665" />
            </label>
            <label>
              {copy.longitudeLabel}
              <input value={form.birthPlace.longitude} onChange={updatePlaceField("longitude")} inputMode="decimal" placeholder="126.9780" />
            </label>
          </div>
          <label>
            {copy.timezoneLabel}
            <input value={form.birthPlace.timezone} onChange={updatePlaceField("timezone")} placeholder="Asia/Seoul" />
          </label>

          <label className="kdai-topic">
            {copy.topicLabel}
            <select value={form.focusArea} onChange={updateField("focusArea")} required>
              {FOCUS_AREA_OPTIONS.map((option) => <option key={option.value} value={option.value}>{copy.focusAreaLabel[option.value]}</option>)}
            </select>
          </label>
          <label className="kdai-topic">
            {copy.questionLabel}
            <textarea
              value={form.question}
              onChange={updateField("question")}
              placeholder={form.focusArea === "custom" ? copy.questionPlaceholderCustom : copy.questionPlaceholderDefault}
              minLength={form.focusArea === "custom" ? 2 : undefined}
              maxLength={1600}
              required={form.focusArea === "custom"}
            />
          </label>

          {notice && <p className="kdai-notice">{notice}</p>}
          {error && <p className="kdai-error">{error}</p>}
          {/* 5만원이 무엇을 사는지 숫자로 밝힌다. 값은 worker/routes/karma-destiny-ai.js 의
              INITIAL_CONSULTATION_MIN_LENGTH·PREMIUM_CHAPTERS·PREMIUM_REINFORCEMENT_MAX_ATTEMPTS
              가 실제로 강제하는 계약이다. */}
          <DeliverableSpec
            keyPrefix="karmaDestiny.deliverable"
            className="kdai-deliverable"
            titleClassName="kdai-deliverable__title"
            labelClassName="kdai-deliverable__label"
            valueClassName="kdai-deliverable__value"
            noteClassName="kdai-deliverable__note"
          />
          <div className="flex items-center justify-end">
            <PriceBadge featureKey="karma-destiny-ai-consultation" prefix={copy.priceLabelPrefix} />
          </div>
          <button className="kdai-primary" type="submit" disabled={isBusy}>
            {isBusy ? <Loader2 size={18} className="kdai-spin" /> : <WalletCards size={18} />}
            <span>{isBusy ? copy.submitBusyLabel : copy.submitCta}</span>
          </button>
        </form>

        <section className="kdai-result kdai-panel" aria-live="polite">
          <div className="kdai-panel-title kdai-panel-title--split">
            <div>
              <Sparkles size={18} />
              <h2>{copy.resultCardHeading}</h2>
            </div>
            {latestAssistantContent && (
              <button className="kdai-ghost-action" type="button" onClick={() => setResultOpen(true)}>
                <Maximize2 size={16} />
                <span>{copy.fullscreenCta}</span>
              </button>
            )}
          </div>

          {messages.length > 0 && (
            <div className="kdai-summary">
              <article>
                <span>{copy.summaryKeywordLabel}</span>
                <strong>{keywords.join(" · ")}</strong>
              </article>
              <article>
                <span>{copy.repeatingPatternLabel}</span>
                <strong>{summaryCards?.repeatingPattern || copy.repeatingPatternFallback}</strong>
              </article>
              <article>
                <span>{copy.currentTaskLabel}</span>
                <strong>{summaryCards?.currentTask || copy.currentTaskFallback}</strong>
              </article>
            </div>
          )}

          {messages.length > 0 && (
            <div className="kdai-system-cards">
              <article>
                <span>{copy.sajuLensLabel}</span>
                <p>{summarizeSystem(integratedResult, "saju", copy)}</p>
              </article>
              <article>
                <span>{copy.westernLensLabel}</span>
                <p>{summarizeSystem(integratedResult, "westernAstrology", copy)}</p>
              </article>
              <article>
                <span>{copy.vedicLensLabel}</span>
                <p>{summarizeSystem(integratedResult, "vedicAstrology", copy)}</p>
              </article>
            </div>
          )}

          <div className="kdai-messages">
            {messages.length === 0 ? (
              <div className="kdai-empty">
                <div className="kdai-karma-ring" aria-hidden="true"><Clock3 size={28} /></div>
                <p>{copy.emptyStateTitle}</p>
                <span>{copy.emptyStateDesc}</span>
              </div>
            ) : messages.map((message, index) => (
              <article key={`${message.role}-${index}`} className={`kdai-message kdai-message--${message.role}`}>
                <span>{message.role === "assistant" ? copy.assistantRoleLabel : copy.userRoleLabel}</span>
                {message.role === "assistant" ? <AssistantMessageContent content={message.content} copy={copy} /> : <p>{message.content}</p>}
              </article>
            ))}
          </div>

          <form className="kdai-follow" onSubmit={handleFollowUp}>
            <textarea
              value={followUp}
              onChange={(event) => setFollowUp(event.target.value)}
              placeholder={copy.followUpPlaceholder}
              disabled={!canAskFollowUp}
              maxLength={1200}
            />
            <button type="submit" disabled={!canAskFollowUp || !followUp.trim()}>
              {sending ? <Loader2 size={18} className="kdai-spin" /> : <Send size={18} />}
              <span>{copy.askCta}</span>
            </button>
          </form>
        </section>
      </section>

      {(status === "preparing" || status === "reading") && <KarmaLoadingScreen status={status} copy={copy} />}
      {resultOpen && latestAssistantContent && (
        <KarmaResultModal
          content={latestAssistantContent}
          userData={form}
          integratedResult={integratedResult}
          onClose={() => setResultOpen(false)}
          onDownloadError={setError}
          copy={copy}
        />
      )}

      <style jsx global>{`
        body:has(.kdai-page) header,
        body:has(.kdai-page) footer,
        body:has(.kdai-page) .site-header,
        body:has(.kdai-page) .site-footer,
        body:has(.kdai-page) .app-chrome__header,
        body:has(.kdai-page) .app-chrome__footer {
          display: none !important;
        }
      `}</style>

      <style jsx>{`
        .kdai-page {
          position: relative;
          overflow: hidden;
          min-height: 100vh;
          padding: clamp(16px, 3vw, 40px);
          color: #f9f0dc;
          background:
            radial-gradient(circle at 18% 8%, rgba(124, 58, 237, .28), transparent 28%),
            radial-gradient(circle at 86% 18%, rgba(225, 29, 72, .18), transparent 30%),
            radial-gradient(circle at 52% 95%, rgba(20, 184, 166, .13), transparent 32%),
            linear-gradient(128deg, #060914 0%, #121126 38%, #21142d 62%, #071c24 100%);
          font-family: CodeDestinyBody, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .kdai-page::before,
        .kdai-page::after {
          position: absolute;
          inset: 0;
          pointer-events: none;
          content: "";
        }

        .kdai-page::before {
          opacity: .42;
          background:
            linear-gradient(108deg, transparent 0 18%, rgba(239, 204, 137, .24) 18.2%, transparent 18.6% 64%, rgba(190, 18, 60, .22) 64.2%, transparent 64.7%),
            repeating-linear-gradient(91deg, rgba(255,255,255,.055) 0 1px, transparent 1px 92px),
            repeating-linear-gradient(0deg, rgba(255,255,255,.035) 0 1px, transparent 1px 78px);
          mask-image: linear-gradient(180deg, rgba(0,0,0,.95), rgba(0,0,0,.28));
        }

        .kdai-page::after {
          opacity: .5;
          background-image:
            radial-gradient(circle, rgba(255, 247, 223, .62) 0 1px, transparent 1.5px),
            radial-gradient(circle, rgba(244, 114, 182, .42) 0 1px, transparent 1.5px);
          background-size: 118px 118px, 164px 164px;
          background-position: 18px 24px, 72px 48px;
        }

        .kdai-panel,
        .kdai-hero {
          border: 1px solid rgba(239, 204, 137, .22);
          border-radius: 8px;
          background:
            linear-gradient(180deg, rgba(255, 252, 243, .09), rgba(255, 255, 255, .045)),
            rgba(7, 10, 22, .78);
          box-shadow: 0 24px 70px rgba(0, 0, 0, .28), inset 0 1px 0 rgba(255, 247, 223, .08);
          backdrop-filter: blur(18px);
        }

        .kdai-hero {
          position: relative;
          overflow: hidden;
          display: grid;
          grid-template-columns: minmax(220px, 340px) minmax(0, 1fr);
          gap: clamp(18px, 4vw, 44px);
          align-items: center;
          max-width: 1220px;
          margin: 0 auto clamp(16px, 3vw, 28px);
          padding: clamp(16px, 3vw, 30px);
        }

        .kdai-premium-map {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: minmax(240px, 340px) minmax(0, 1fr);
          gap: clamp(14px, 2.5vw, 24px);
          align-items: stretch;
          max-width: 1220px;
          margin: 0 auto clamp(16px, 3vw, 28px);
        }

        .kdai-premium-map__intro,
        .kdai-premium-map__cards article {
          border: 1px solid rgba(239, 204, 137, .2);
          border-radius: 8px;
          background: rgba(9, 8, 24, .7);
          box-shadow: inset 0 1px 0 rgba(255, 247, 223, .08);
        }

        .kdai-premium-map__intro {
          padding: clamp(16px, 2.5vw, 24px);
        }

        .kdai-premium-map__intro span {
          display: block;
          margin-bottom: 8px;
          color: #f8d06f;
          font-size: .76rem;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .kdai-premium-map__intro h2 {
          margin: 0 0 10px;
          color: #fff5d6;
          font-family: CodeDestinyDisplay, serif;
          font-size: clamp(1.35rem, 2vw, 2rem);
          letter-spacing: 0;
        }

        .kdai-premium-map__intro p {
          margin: 0;
          color: rgba(255, 247, 223, .76);
          line-height: 1.72;
        }

        .kdai-premium-map__cards {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .kdai-premium-map__cards article {
          display: flex;
          min-height: 86px;
          flex-direction: column;
          justify-content: space-between;
          padding: 14px;
          color: #f9f0dc;
        }

        .kdai-premium-map__cards svg {
          color: #f8d06f;
        }

        .kdai-premium-map__cards strong {
          font-size: .95rem;
          line-height: 1.42;
        }

        .kdai-hero::before {
          position: absolute;
          inset: auto -8% 18% 34%;
          height: 2px;
          content: "";
          background: linear-gradient(90deg, transparent, rgba(248, 208, 111, .85), rgba(190, 18, 60, .72), transparent);
          box-shadow: 0 0 28px rgba(248, 208, 111, .42);
          transform: rotate(-7deg);
        }

        .kdai-hero::after {
          position: absolute;
          inset: 18px 18px auto auto;
          width: min(36vw, 360px);
          aspect-ratio: 1;
          border: 1px solid rgba(239, 204, 137, .18);
          border-radius: 50%;
          content: "";
          background:
            conic-gradient(from 22deg, transparent 0 12%, rgba(239, 204, 137, .28) 12% 13%, transparent 13% 28%, rgba(244, 114, 182, .22) 28% 29%, transparent 29% 100%);
          opacity: .58;
        }

        .kdai-hero__sigil {
          position: absolute;
          inset: 12% auto auto 22%;
          width: 220px;
          aspect-ratio: 1;
          border: 1px solid rgba(239, 204, 137, .16);
          border-radius: 50%;
          background:
            repeating-conic-gradient(from 12deg, rgba(239, 204, 137, .16) 0 4deg, transparent 4deg 18deg),
            radial-gradient(circle, transparent 0 48%, rgba(190, 18, 60, .18) 49% 50%, transparent 51%);
          opacity: .34;
          animation: kdaiSlowTurn 38s linear infinite;
        }

        .kdai-hero__image {
          position: relative;
          z-index: 1;
          overflow: hidden;
          display: grid;
          place-items: center;
          min-height: 320px;
          aspect-ratio: 1 / 1;
          border-radius: 8px;
          border: 1px solid rgba(239, 204, 137, .28);
          background:
            linear-gradient(135deg, rgba(255, 247, 223, .12), transparent 33%),
            linear-gradient(28deg, rgba(148, 31, 52, .28), transparent 54%),
            conic-gradient(from 142deg at 50% 52%, rgba(239, 204, 137, .2), rgba(8, 10, 22, .96), rgba(109, 37, 47, .34), rgba(7, 10, 22, .98), rgba(239, 204, 137, .16));
          box-shadow: inset 0 0 0 1px rgba(255, 247, 223, .05);
        }

        .kdai-hero__copy,
        .kdai-form,
        .kdai-result {
          position: relative;
          z-index: 1;
        }

        .kdai-hero__image--sigil::before,
        .kdai-hero__image--sigil::after {
          position: absolute;
          content: "";
          pointer-events: none;
        }

        .kdai-hero__image--sigil::before {
          inset: 18px;
          border: 1px solid rgba(239, 204, 137, .2);
          border-radius: 50%;
          transform: rotate(-8deg);
        }

        .kdai-hero__image--sigil::after {
          inset: 34px 30px;
          border: 1px solid rgba(255, 255, 255, .1);
          border-radius: 8px;
          transform: rotate(8deg);
        }

        .kdai-oracle {
          position: relative;
          display: grid;
          place-items: center;
          width: min(82%, 300px);
          aspect-ratio: 1;
          color: #fff7df;
        }

        .kdai-oracle__ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(239, 204, 137, .32);
          background:
            repeating-conic-gradient(from 18deg, rgba(239, 204, 137, .24) 0 3deg, transparent 3deg 17deg),
            radial-gradient(circle, transparent 0 54%, rgba(239, 204, 137, .12) 55% 57%, transparent 58%);
          animation: kdaiSlowTurn 34s linear infinite;
        }

        .kdai-oracle__ring--outer {
          inset: 0;
        }

        .kdai-oracle__ring--middle {
          inset: 22%;
          background: none;
          border-color: rgba(255, 247, 223, .22);
          animation-duration: 24s;
          animation-direction: reverse;
        }

        .kdai-oracle__thread {
          position: absolute;
          width: 118%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(239, 204, 137, .76), rgba(244, 114, 182, .38), transparent);
          box-shadow: 0 0 18px rgba(239, 204, 137, .22);
        }

        .kdai-oracle__thread--one {
          transform: rotate(-28deg);
        }

        .kdai-oracle__thread--two {
          transform: rotate(32deg);
          opacity: .72;
        }

        .kdai-oracle__core {
          position: relative;
          display: grid;
          place-items: center;
          gap: 10px;
          text-align: center;
        }

        .kdai-oracle__glyph {
          font-family: CodeDestinyDisplay, CodeDestinyBody, serif;
          font-size: 86px;
          font-weight: 900;
          line-height: 1;
          text-shadow: 0 0 30px rgba(239, 204, 137, .5), 0 2px 18px rgba(0, 0, 0, .62);
        }

        .kdai-oracle__axis,
        .kdai-oracle__status,
        .kdai-oracle__keyword {
          border: 1px solid rgba(239, 204, 137, .24);
          border-radius: 999px;
          background: rgba(7, 10, 22, .68);
          color: rgba(255, 247, 223, .82);
          font-size: 12px;
          font-weight: 900;
          line-height: 1.3;
        }

        .kdai-oracle__axis {
          padding: 5px 10px;
          letter-spacing: .08em;
        }

        .kdai-oracle__status {
          position: absolute;
          right: -6%;
          bottom: 20%;
          max-width: 190px;
          padding: 8px 10px;
          overflow-wrap: anywhere;
          text-align: center;
          box-shadow: 0 14px 34px rgba(0, 0, 0, .26);
        }

        .kdai-oracle__keywords {
          position: absolute;
          left: 50%;
          bottom: -8px;
          display: flex;
          width: min(112%, 330px);
          transform: translateX(-50%);
          justify-content: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .kdai-oracle__keyword {
          max-width: 120px;
          padding: 6px 9px;
          overflow-wrap: anywhere;
          text-align: center;
        }

        .kdai-kicker,
        .kdai-status,
        .kdai-panel-title {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .kdai-kicker {
          color: #f1cd7c;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .kdai-hero h2 {
          max-width: 780px;
          margin: 14px 0 12px;
          font-family: CodeDestinyDisplay, CodeDestinyBody, serif;
          font-size: clamp(34px, 3.9rem, 58px);
          line-height: 1.08;
          letter-spacing: 0;
        }

        .kdai-hero p {
          max-width: 700px;
          margin: 0;
          color: rgba(249, 240, 220, .76);
          font-size: 16px;
          line-height: 1.7;
        }

        .kdai-status {
          margin-top: 18px;
          min-height: 36px;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid rgba(241, 205, 124, .2);
          background: rgba(241, 205, 124, .1);
          color: #ffe4a3;
          font-size: 14px;
        }

        .kdai-access {
          margin-top: 8px !important;
          font-size: 13px !important;
          color: rgba(154, 228, 211, .84) !important;
        }

        .kdai-workspace {
          display: grid;
          grid-template-columns: minmax(320px, 470px) minmax(0, 1fr);
          gap: clamp(16px, 3vw, 28px);
          max-width: 1220px;
          margin: 0 auto;
        }

        .kdai-form,
        .kdai-result {
          padding: clamp(16px, 2.6vw, 24px);
        }

        .kdai-panel-title {
          margin-bottom: 16px;
          color: #f1cd7c;
        }

        .kdai-panel-title h2 {
          margin: 0;
          font-size: 18px;
          letter-spacing: 0;
        }

        .kdai-panel-title--split {
          display: flex;
          justify-content: space-between;
          width: 100%;
        }

        .kdai-panel-title--split > div,
        .kdai-ghost-action {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .kdai-ghost-action {
          min-height: 34px;
          padding: 0 10px;
          border: 1px solid rgba(239, 204, 137, .26);
          border-radius: 8px;
          color: #ffe4a3;
          background: rgba(255, 252, 243, .08);
          font: inherit;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        .kdai-place-title {
          margin-top: 20px;
        }

        .kdai-grid,
        .kdai-time-row {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .kdai-place-grid {
          margin-top: 12px;
        }

        .kdai-form label {
          display: grid;
          gap: 7px;
          color: rgba(249, 240, 220, .78);
          font-size: 13px;
          font-weight: 800;
        }

        .kdai-form input,
        .kdai-form select,
        .kdai-form textarea,
        .kdai-follow textarea {
          width: 100%;
          border: 1px solid rgba(239, 204, 137, .22);
          border-radius: 8px;
          background: rgba(255, 252, 243, .09);
          color: #fff7df;
          font: inherit;
          outline: none;
          transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
        }

        .kdai-form input:focus,
        .kdai-form select:focus,
        .kdai-form textarea:focus,
        .kdai-follow textarea:focus {
          border-color: rgba(248, 208, 111, .72);
          background: rgba(255, 252, 243, .13);
          box-shadow: 0 0 0 3px rgba(248, 208, 111, .14), 0 0 22px rgba(190, 18, 60, .12);
        }

        .kdai-form input,
        .kdai-form select {
          min-height: 44px;
          padding: 0 12px;
        }

        .kdai-form select option {
          color: #141922;
        }

        .kdai-time-row {
          margin-top: 12px;
          align-items: end;
        }

        .kdai-check {
          min-height: 44px;
          display: inline-flex !important;
          grid-template-columns: auto 1fr;
          align-items: center;
          padding: 11px 12px;
          border: 1px solid rgba(239, 204, 137, .2);
          border-radius: 8px;
          background: rgba(255, 255, 255, .06);
        }

        .kdai-check input {
          width: 18px;
          height: 18px;
          min-height: 18px;
          padding: 0;
        }

        .kdai-soft-note {
          margin: 10px 0 0;
          color: rgba(249, 240, 220, .68);
          font-size: 13px;
          line-height: 1.5;
        }

        .kdai-topic {
          margin-top: 12px;
        }

        .kdai-form textarea,
        .kdai-follow textarea {
          min-height: 118px;
          padding: 12px;
          resize: vertical;
          line-height: 1.6;
        }

        .kdai-deliverable {
          display: grid;
          gap: 12px;
          margin-top: 18px;
          padding: 14px;
          border: 1px solid rgba(241, 205, 124, .22);
          border-radius: 10px;
          background: rgba(0, 0, 0, .22);
        }

        @media (min-width: 640px) {
          .kdai-deliverable {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        .kdai-deliverable__title {
          margin: 0;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: .02em;
          color: #f1cd7c;
        }

        .kdai-deliverable__label {
          font-size: 11px;
          font-weight: 700;
          color: #c3ab7d;
        }

        .kdai-deliverable__value {
          margin: 4px 0 0;
          font-size: 14px;
          font-weight: 800;
          line-height: 1.5;
          color: #ffe4a3;
        }

        .kdai-deliverable__note {
          margin: 0;
          font-size: 11px;
          line-height: 1.6;
          color: #c3ab7d;
        }

        .kdai-notice,
        .kdai-error {
          margin: 14px 0 0;
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 14px;
          line-height: 1.55;
        }

        .kdai-notice {
          color: #ffe4a3;
          background: rgba(241, 205, 124, .1);
        }

        .kdai-error {
          color: #ffd8d8;
          background: rgba(168, 48, 64, .22);
        }

        .kdai-primary,
        .kdai-follow button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 46px;
          border: 0;
          border-radius: 8px;
          color: #17120a;
          background: linear-gradient(135deg, #ffe7a6, #d9a441 52%, #be123c);
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 14px 30px rgba(0, 0, 0, .28), 0 0 0 1px rgba(255, 244, 205, .18);
          transition: transform .18s ease, box-shadow .18s ease, filter .18s ease;
        }

        .kdai-primary:hover:not(:disabled),
        .kdai-follow button:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: saturate(1.08);
          box-shadow: 0 18px 34px rgba(0, 0, 0, .32), 0 0 26px rgba(248, 208, 111, .22);
        }

        .kdai-primary {
          width: 100%;
          margin-top: 16px;
        }

        .kdai-primary:disabled,
        .kdai-follow button:disabled,
        .kdai-follow textarea:disabled {
          cursor: not-allowed;
          opacity: .62;
        }

        .kdai-result {
          min-height: 620px;
          display: flex;
          flex-direction: column;
        }

        .kdai-summary,
        .kdai-system-cards {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 14px;
        }

        .kdai-summary article,
        .kdai-system-cards article,
        .kdai-message {
          border: 1px solid rgba(239, 204, 137, .2);
          border-radius: 8px;
          background: rgba(255, 255, 255, .07);
        }

        .kdai-summary article,
        .kdai-system-cards article {
          min-height: 112px;
          padding: 13px;
        }

        .kdai-summary span,
        .kdai-system-cards span,
        .kdai-message span {
          display: block;
          margin-bottom: 7px;
          color: #f1cd7c;
          font-size: 12px;
          font-weight: 900;
        }

        .kdai-summary strong {
          display: block;
          color: #fff7df;
          font-size: 14px;
          line-height: 1.6;
        }

        .kdai-system-cards p {
          margin: 0;
          color: rgba(249, 240, 220, .82);
          font-size: 13px;
          line-height: 1.62;
        }

        .kdai-messages {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 12px;
          overflow: auto;
          padding-right: 4px;
        }

        .kdai-empty {
          position: relative;
          display: grid;
          place-content: center;
          min-height: 360px;
          text-align: center;
          color: rgba(249, 240, 220, .72);
        }

        .kdai-karma-ring {
          position: relative;
          display: grid;
          place-items: center;
          width: 94px;
          aspect-ratio: 1;
          margin: 0 auto 12px;
          border: 1px solid rgba(239, 204, 137, .38);
          border-radius: 50%;
          color: #f1cd7c;
          background:
            conic-gradient(from 0deg, rgba(239, 204, 137, .24), transparent 24%, rgba(190, 18, 60, .22), transparent 68%, rgba(244, 114, 182, .18)),
            rgba(255, 252, 243, .04);
          box-shadow: inset 0 0 0 12px rgba(255, 255, 255, .025), 0 0 30px rgba(248, 208, 111, .16);
          animation: kdaiSlowTurn 18s linear infinite;
        }

        .kdai-karma-ring svg {
          color: #f1cd7c;
          animation: kdaiReverseTurn 18s linear infinite;
        }

        .kdai-empty p {
          margin: 0 0 8px;
          color: #f1cd7c;
          font-size: 18px;
          font-weight: 900;
        }

        .kdai-empty span {
          font-size: 14px;
        }

        .kdai-message {
          max-width: min(760px, 94%);
          padding: 14px 15px;
          white-space: pre-wrap;
          line-height: 1.72;
        }

        .kdai-message p {
          margin: 0;
          color: #fff8e6;
        }

        .kdai-section-list {
          display: grid;
          gap: 10px;
          white-space: normal;
        }

        .kdai-result-section {
          border: 1px solid rgba(239, 204, 137, .18);
          border-radius: 8px;
          padding: 13px;
          background:
            linear-gradient(135deg, rgba(255, 252, 243, .08), rgba(124, 58, 237, .08)),
            rgba(5, 9, 19, .42);
        }

        .kdai-result-section h3 {
          margin: 0;
          color: #ffe4a3;
          font-size: 15px;
          line-height: 1.35;
          letter-spacing: 0;
        }

        .kdai-result-section__head {
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr);
          gap: 10px;
          align-items: center;
          margin-bottom: 8px;
        }

        .kdai-result-section__head span {
          display: grid;
          place-items: center;
          width: 34px;
          aspect-ratio: 1;
          margin: 0;
          border: 1px solid rgba(239, 204, 137, .28);
          border-radius: 50%;
          color: #f1cd7c;
          font-family: CodeDestinyDisplay, serif;
          font-size: 18px;
        }

        .kdai-result-section p {
          white-space: pre-wrap;
          line-height: 1.8;
          word-break: keep-all;
        }

        .kdai-message--assistant {
          align-self: flex-start;
          background: rgba(241, 205, 124, .1);
        }

        .kdai-message--user {
          align-self: flex-end;
          background: rgba(62, 176, 151, .15);
          border-color: rgba(62, 176, 151, .28);
        }

        .kdai-follow {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 118px;
          gap: 10px;
          margin-top: 16px;
        }

        .kdai-follow textarea {
          min-height: 66px;
        }

        .kdai-loading,
        .kdai-result-modal {
          position: fixed;
          inset: 0;
          z-index: 90;
          color: #fff7df;
          background: rgba(6, 4, 18, .96);
          backdrop-filter: blur(14px);
        }

        .kdai-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 28px;
          padding: 24px;
        }

        .kdai-loading__seal {
          position: relative;
          display: grid;
          place-items: center;
          width: clamp(112px, 24vw, 144px);
          aspect-ratio: 1;
        }

        .kdai-loading__seal::before {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          content: "";
          background: conic-gradient(from 10deg, rgba(124, 58, 237, .34), rgba(217, 119, 6, .28), rgba(20, 184, 166, .22), rgba(124, 58, 237, .34));
          filter: blur(10px);
          animation: kdaiSlowTurn 8s linear infinite;
        }

        .kdai-loading__core {
          position: relative;
          z-index: 1;
          display: grid;
          place-items: center;
          width: 78%;
          aspect-ratio: 1;
          border: 1px solid rgba(239, 204, 137, .36);
          border-radius: 50%;
          color: #ffe4a3;
          background: linear-gradient(145deg, rgba(44, 24, 84, .92), rgba(10, 8, 21, .94));
          font-size: 42px;
          box-shadow: inset 0 0 28px rgba(255, 252, 243, .08), 0 18px 44px rgba(0, 0, 0, .32);
        }

        .kdai-loading__seal svg {
          position: absolute;
          inset: 0;
          z-index: 2;
          width: 100%;
          height: 100%;
          animation: kdaiSlowTurn 9s linear infinite;
        }

        .kdai-loading__seal circle {
          fill: none;
          stroke: rgba(255, 228, 163, .76);
          stroke-width: 1.4;
          stroke-dasharray: 4 9;
        }

        .kdai-loading__text {
          text-align: center;
        }

        .kdai-loading__text p {
          margin: 0;
          color: #d9c3ff;
          font-size: 14px;
          font-weight: 900;
          letter-spacing: .08em;
        }

        .kdai-loading__dots {
          display: flex;
          justify-content: center;
          gap: 9px;
          margin-top: 16px;
        }

        .kdai-loading__dots span {
          width: 8px;
          aspect-ratio: 1;
          border-radius: 50%;
          background: rgba(255, 255, 255, .22);
          transition: transform .3s ease, background .3s ease;
        }

        .kdai-loading__dots span[data-active="true"] {
          transform: scale(1.35);
          background: #f1cd7c;
        }

        .kdai-result-modal {
          z-index: 100;
          overflow-y: auto;
        }

        .kdai-result-modal__bar {
          position: sticky;
          top: 0;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 14px clamp(16px, 4vw, 28px);
          border-bottom: 1px solid rgba(239, 204, 137, .18);
          background: rgba(10, 8, 21, .9);
          backdrop-filter: blur(16px);
        }

        .kdai-result-modal__bar h2 {
          margin: 0;
          color: #f1cd7c;
          font-family: CodeDestinyDisplay, CodeDestinyBody, serif;
          font-size: 19px;
          letter-spacing: 0;
        }

        .kdai-result-modal__bar p {
          margin: 4px 0 0;
          color: rgba(255, 247, 223, .48);
          font-size: 12px;
        }

        .kdai-result-modal__actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .kdai-result-modal__actions button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 38px;
          padding: 0 12px;
          border: 1px solid rgba(239, 204, 137, .28);
          border-radius: 8px;
          color: #ffe4a3;
          background: rgba(255, 252, 243, .08);
          font: inherit;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        .kdai-result-modal__actions button:last-child {
          width: 38px;
          padding: 0;
          color: rgba(255, 247, 223, .78);
        }

        .kdai-result-modal__actions button:disabled {
          cursor: not-allowed;
          opacity: .62;
        }

        .kdai-result-document {
          width: min(100%, 760px);
          margin: 0 auto;
          padding: clamp(28px, 7vw, 58px) clamp(18px, 5vw, 44px) 54px;
          background:
            linear-gradient(180deg, rgba(255, 252, 243, .035), rgba(255, 252, 243, 0)),
            #060412;
        }

        .kdai-result-cover {
          padding: 22px 0 34px;
          border-bottom: 1px solid rgba(239, 204, 137, .22);
          text-align: center;
        }

        .kdai-result-cover span {
          display: block;
          color: #f1cd7c;
          font-size: 54px;
          line-height: 1;
        }

        .kdai-result-cover h2 {
          margin: 12px 0 6px;
          color: #fff7df;
          font-family: CodeDestinyDisplay, CodeDestinyBody, serif;
          font-size: clamp(29px, 7vw, 42px);
          line-height: 1.15;
          letter-spacing: 0;
        }

        .kdai-result-cover p,
        .kdai-result-document footer {
          margin: 0;
          color: rgba(255, 247, 223, .48);
          font-size: 13px;
        }

        .kdai-chart-data {
          padding: clamp(30px, 7vw, 46px) 0;
          border-bottom: 1px solid rgba(239, 204, 137, .12);
        }

        .kdai-chart-data__head {
          margin-bottom: 18px;
        }

        .kdai-chart-data__head span,
        .kdai-chart-data article > div > span {
          display: block;
          margin-bottom: 7px;
          color: rgba(241, 205, 124, .82);
          font-size: 12px;
          font-weight: 900;
          letter-spacing: .12em;
          text-transform: uppercase;
        }

        .kdai-chart-data__head h2 {
          margin: 0 0 8px;
          color: #fff7df;
          font-family: CodeDestinyDisplay, CodeDestinyBody, serif;
          font-size: clamp(22px, 5vw, 30px);
          line-height: 1.22;
          letter-spacing: 0;
        }

        .kdai-chart-data__head p,
        .kdai-chart-data article > div > p {
          margin: 0;
          color: rgba(255, 247, 223, .7);
          font-size: 14px;
          line-height: 1.7;
        }

        .kdai-chart-data__grid {
          display: grid;
          gap: 14px;
        }

        .kdai-chart-data article {
          border: 1px solid rgba(239, 204, 137, .16);
          border-radius: 8px;
          background: rgba(255, 255, 255, .045);
          padding: 18px;
        }

        .kdai-chart-data article h3 {
          margin: 0 0 8px;
          color: #ffe4a3;
          font-size: 18px;
          line-height: 1.35;
          letter-spacing: 0;
        }

        .kdai-chart-data dl {
          display: grid;
          gap: 8px;
          margin: 16px 0 0;
        }

        .kdai-chart-data dl > div {
          display: grid;
          grid-template-columns: minmax(120px, .34fr) minmax(0, 1fr);
          gap: 10px;
          border-top: 1px solid rgba(239, 204, 137, .1);
          padding-top: 8px;
        }

        .kdai-chart-data dt {
          color: rgba(241, 205, 124, .78);
          font-size: 12px;
          font-weight: 900;
          line-height: 1.55;
          word-break: keep-all;
        }

        .kdai-chart-data dd {
          margin: 0;
          color: rgba(255, 247, 223, .78);
          font-size: 12px;
          line-height: 1.65;
          overflow-wrap: anywhere;
        }

        .kdai-result-document__section {
          padding: clamp(30px, 7vw, 46px) 0;
          border-bottom: 1px solid rgba(239, 204, 137, .12);
        }

        .kdai-result-document__section > div {
          display: grid;
          grid-template-columns: 54px minmax(0, 1fr);
          gap: 16px;
          align-items: center;
          margin-bottom: 16px;
        }

        .kdai-result-document__section span {
          display: grid;
          place-items: center;
          width: 54px;
          aspect-ratio: 1;
          border: 1px solid rgba(239, 204, 137, .32);
          border-radius: 50%;
          color: rgba(241, 205, 124, .9);
          font-family: CodeDestinyDisplay, serif;
          font-size: 30px;
        }

        .kdai-result-document__section h3 {
          margin: 0;
          color: #ffe4a3;
          font-size: clamp(18px, 4.4vw, 23px);
          line-height: 1.34;
          letter-spacing: 0;
        }

        .kdai-result-document__section p {
          margin: 0;
          color: rgba(255, 247, 223, .8);
          font-size: 15px;
          line-height: 2.05;
          white-space: pre-wrap;
          word-break: keep-all;
          overflow-wrap: anywhere;
        }

        .kdai-result-document footer {
          padding-top: 30px;
          text-align: center;
        }

        .kdai-spin {
          animation: kdaiSpin 1s linear infinite;
        }

        @keyframes kdaiSpin {
          to { transform: rotate(360deg); }
        }

        @keyframes kdaiSlowTurn {
          to { transform: rotate(360deg); }
        }

        @keyframes kdaiReverseTurn {
          to { transform: rotate(-360deg); }
        }

        @media (max-width: 900px) {
          .kdai-page {
            padding: 12px;
          }

          .kdai-hero,
          .kdai-premium-map,
          .kdai-workspace,
          .kdai-summary,
          .kdai-system-cards {
            grid-template-columns: 1fr;
          }

          .kdai-premium-map__cards {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .kdai-hero__image {
            min-height: 260px;
            max-height: none;
            aspect-ratio: 16 / 9;
          }

          .kdai-oracle {
            width: min(72%, 250px);
          }

          .kdai-oracle__glyph {
            font-size: 64px;
          }

          .kdai-oracle__status {
            right: 50%;
            bottom: 14%;
            max-width: 220px;
            transform: translateX(50%);
          }

          .kdai-oracle__keywords {
            bottom: -4px;
            width: min(118%, 310px);
          }

          .kdai-hero h2 {
            font-size: 34px;
          }

          .kdai-grid,
          .kdai-time-row {
            grid-template-columns: 1fr;
          }

          .kdai-result {
            min-height: 500px;
          }

          .kdai-follow {
            grid-template-columns: 1fr;
          }

          .kdai-follow button {
            width: 100%;
          }

          .kdai-panel-title--split,
          .kdai-result-modal__bar {
            align-items: flex-start;
            flex-direction: column;
          }

          .kdai-result-modal__actions,
          .kdai-result-modal__actions button:first-child {
            width: 100%;
          }

          .kdai-result-modal__actions button:first-child {
            flex: 1;
          }

          .kdai-result-document__section > div {
            grid-template-columns: 46px minmax(0, 1fr);
            gap: 12px;
          }

          .kdai-result-document__section span {
            width: 46px;
            font-size: 25px;
          }

          .kdai-chart-data dl > div {
            grid-template-columns: 1fr;
            gap: 3px;
          }
        }
      `}</style>
    </main>
  );
}
