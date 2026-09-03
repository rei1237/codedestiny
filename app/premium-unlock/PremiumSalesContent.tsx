"use client";

import { birthDateTextInputProps } from "@/lib/birthDateInputProps";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { BookOpen, Download, Loader2, RefreshCcw, ShieldCheck, Sparkles } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import { friendlyErrorMessage } from "@/app/_lib/friendly-error";
import { runGenerateWave } from "@/app/life-book-ai/lifeBookApi";
import {
  beginPaidFeatureGateCheck,
  completePaidFeatureGateCheck,
  failPaidFeatureGateCheck,
  runBillingCoinGate,
} from "@/app/_lib/billing-client";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";
import { readAiProfileSeed, type AiPrefillSeed } from "@/app/_lib/ai-prefill-seed";
import { DeliverableSpec } from "@/app/components/DeliverableSpec";
import { detectLocale } from "@/lib/i18n/dictionary";
import { getCurrentLoadingLocale, INTL_LOCALE_BY_LOADING_LOCALE, type LoadingLocale } from "@/constants/loadingMessages";

type GenderType = "female" | "male" | "unknown" | "";
type CalendarType = "solar" | "lunar";
type GenerationStatus = "idle" | "checking" | "payment" | "generating" | "completed" | "error";

type LifeFortuneForm = {
  name: string;
  gender: GenderType;
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  calendarType: CalendarType;
};

type PaymentPayload = Record<string, unknown>;

type PrepareResult =
  | { ok: true; accessToken: string; accessType?: string; status?: string }
  | { ok?: false; reason?: string; message?: string; paymentPayload?: PaymentPayload };

type ConsultationResult = {
  ok?: boolean;
  sessionId?: string;
  consultationId?: string;
  idempotencyKey?: string;
  accessType?: string;
  status?: string;
  title?: string;
  topic?: string;
  birthInfo?: LifeFortuneForm | null;
  messages?: { role?: string; content?: string; createdAt?: string }[];
  reportJson?: LifeFortuneReport | null;
  generationError?: unknown;
  createdAt?: string;
  updatedAt?: string;
  message?: string;
  reason?: string;
};

type LifeFortuneChapter = {
  chapterNumber?: number;
  title?: string;
  summary?: string;
  content?: string;
  advice?: string[];
};

type LifeFortuneExpertReading = {
  title?: string;
  content?: string;
  guidance?: string[];
};

type LifeFortuneReport = {
  title?: string;
  subtitle?: string;
  coreSummary?: {
    oneLine?: string;
    lifeTheme?: string;
    strongestElement?: string;
    neededBalance?: string;
  } | null;
  chapters?: LifeFortuneChapter[];
  expertReadings?: LifeFortuneExpertReading[];
  finalMessage?: string;
};

// 인생 총운은 2026-08-01 부터 인생의 책과 별도 SKU(50,000원). 구 SKU 결제 증거는 워커가 계속 인정한다.
const FEATURE_KEY = "life-fortune-ai-consultation";
const CONSULTATION_TYPE = "lifeFortune";
const TOPIC = "전체 인생 총운";
const STORAGE_KEY = "code-destiny-life-fortune-attempt";
const LIFE_FORTUNE_IMAGE_SRC = "https://assets.code-destiny.com/%EC%9D%B8%EC%83%9D%20%EC%B4%9D%EB%9E%8C.webp";
const POLL_INTERVAL_MS = 3200;
const EXTENDED_POLL_INTERVAL_MS = 6000;
const MAX_POLL_DURATION_MS = 8 * 60 * 1000;
const LONG_GENERATION_NOTICE_MS = 90 * 1000;
// 총운 15섹션 ÷ 웨이브당 4 = 4웨이브 + 재시도 여유(서버 MAX_GENERATION_WAVES 는 8).
const MAX_GENERATE_WAVES = 12;
const WAVE_LOCK_RETRY_DELAY_MS = 4000;
const MIN_BIRTH_DATE = "1900-01-01";
const MAX_BIRTH_DATE = "2100-12-31";

type PremiumSalesCopy = {
  featureTitle: string;
  fallbackResultTitle: string;
  fallbackSubtitle: string;
  priceNotFoundMessage: string;
  paymentVerifyFailedMessage: string;
  paymentCancelledMessage: string;
  loginRequiredMessage: string;
  openFailedMessage: string;
  genericFallbackMessage: string;
  storedResultLoadFailedMessage: string;
  resultLoadFailedMessage: string;
  fallbackChapters: string[];
  extraChapterTitle: (index: number) => string;
  loadingMessages: string[];
  heroJourneyPoints: string[];
  gatePreparingTitle: string;
  gatePreparingMessage: string;
  gateOpenedTitle: string;
  gateOpenedMessage: string;
  gateFailedTitle: string;
  resultOpenedNotice: string;
  longGenerationNotice: string;
  pollTimeoutNotice: string;
  waveProgressNotice: (completed: number, total: number) => string;
  pdfNoSectionsError: string;
  pdfCanvasError: string;
  pdfCaptureError: string;
  pdfSaveErrorMessage: string;
  pdfFileFallback: string;
  validationGenderRequired: string;
  validationGenderUnknownWarn: string;
  validationBirthDateInvalid: string;
  validationBirthDateRange: string;
  validationBirthTimeInvalid: string;
  statusCheckingText: string;
  statusGeneratingText: string;
  statusCompletedText: string;
  formKicker: string;
  profileLoadAria: string;
  profileLoadCta: string;
  formHeading: string;
  formDesc: string;
  heroImageAlt: string;
  nameLabel: string;
  namePlaceholder: string;
  genderLabel: string;
  genderFemale: string;
  genderMale: string;
  birthDateLabel: string;
  birthTimeLabel: string;
  calendarSolarLabel: string;
  calendarLunarLabel: string;
  birthTimeUnknownLabel: string;
  submitCheckingLabel: string;
  submitGeneratingLabel: string;
  submitIdleLabel: string;
  resetCta: string;
  pdfSavingLabel: string;
  pdfSaveLabel: string;
  resultKicker: string;
  coreSummaryFallback: string;
  neededBalancePrefix: string;
  neededBalanceFallback: string;
  expertReadingsHeading: string;
  expertReadingFallbackTitle: (index: number) => string;
  idleGeneratingBadge: string;
  idleBadgeDefault: string;
  idleHeadingDefault: string;
  idleDescDefault: string;
  generatingNote: string;
  timelineSvgAriaLabel: string;
};

const PREMIUM_SALES_EN: PremiumSalesCopy = {
  featureTitle: "Life Fortune Expert Consultation",
  fallbackResultTitle: "Life Fortune Consultation",
  fallbackSubtitle: "The great direction of life read through your natal chart and the flow of time",
  priceNotFoundMessage: "We couldn't confirm the price information. Please try again in a moment.",
  paymentVerifyFailedMessage: "The process of opening your Life Fortune wasn't completed.",
  paymentCancelledMessage: "The selection was cancelled.",
  loginRequiredMessage: "Log in to open your Life Fortune.",
  openFailedMessage: "We couldn't open your Life Fortune.",
  genericFallbackMessage: "We couldn't open the consultation.",
  storedResultLoadFailedMessage: "We couldn't load your saved consultation.",
  resultLoadFailedMessage: "We couldn't load the consultation.",
  fallbackChapters: [
    "The Center of Your Natal Chart",
    "The Grain of Your Character and Mind",
    "The Direction of Talent and Work",
    "The Foundation of Wealth and Living",
    "The Flow of Love and Ties",
    "The Chapter of Relationships and Family",
    "The Rhythm of Health and Living",
    "The Great Turning Seen Through Major Luck Cycles",
    "The Flow of the Coming Yearly Cycle",
    "The Choices Ahead",
  ],
  extraChapterTitle: (index) => `Chapter of Life ${index + 1}`,
  loadingMessages: [
    "We're re-building your natal chart from your birth year, month, day, and time.",
    "We're tracing the balance of the Five Elements and the position of the Ten Gods around your Day Master.",
    "We're finding where your past Major Luck cycles meet the coming yearly cycles.",
    "We're following the grain of life flowing over your natal chart.",
    "We're quietly listening to the voices of your Useful God and Adverse God.",
    "Just a little longer — your life map is coming together.",
  ],
  heroJourneyPoints: [
    "We trace the balance of your Day Master and the Five Elements to read the great current of your life.",
    "We illuminate the grain of time connecting your natal chart to the choices you make today.",
    "The turning points opened by Major Luck and yearly cycles, and the center you should hold onto for the long run, quietly come into view.",
  ],
  gatePreparingTitle: "Preparing the Gate of Destiny",
  gatePreparingMessage: "Opening the first gate of your natal chart.",
  gateOpenedTitle: "The Gate of Destiny Has Opened",
  gateOpenedMessage: "The great flow of your life is rising above your natal chart.",
  gateFailedTitle: "The Gate of Destiny Did Not Open",
  resultOpenedNotice: "Your Life Fortune has quietly unfolded.",
  longGenerationNotice: "We're still completing the long-form reading. You can close this page and reopen the same consultation later.",
  pollTimeoutNotice: "We're polishing the reading a little more. Refresh in a moment to continue checking.",
  waveProgressNotice: (completed, total) => `Your Life Fortune is complete through chapter ${completed} of ${total}.`,
  pdfNoSectionsError: "No content found to save as a PDF",
  pdfCanvasError: "Failed to create the PDF canvas",
  pdfCaptureError: "Failed to capture the PDF",
  pdfSaveErrorMessage: "Something went wrong while saving the PDF. Please try again in a moment.",
  pdfFileFallback: "life-fortune",
  validationGenderRequired: "Please select a gender.",
  validationGenderUnknownWarn: "Please select a gender to accurately calculate the Major Luck cycle flow.",
  validationBirthDateInvalid: "Please check your birth date.",
  validationBirthDateRange: "Please enter a birth date between 1900 and 2100.",
  validationBirthTimeInvalid: "Please check your birth time.",
  statusCheckingText: "Opening the gate of destiny.",
  statusGeneratingText: "Your life map is unfolding.",
  statusCompletedText: "Your Life Fortune has opened.",
  formKicker: "Life Fortune Saju",
  profileLoadAria: "Load birth information from profile card",
  profileLoadCta: "Load from profile card",
  formHeading: "The Great Current of Life Illuminated by Saju Numerology",
  formDesc: "Following the flow of your natal chart and Major Luck and yearly cycles, we quietly examine the path you've walked and the scenes that lie ahead.",
  heroImageAlt: "Overview of Life Fortune",
  nameLabel: "Name",
  namePlaceholder: "Name or nickname",
  genderLabel: "Gender",
  genderFemale: "Female",
  genderMale: "Male",
  birthDateLabel: "Birth date",
  birthTimeLabel: "Birth time",
  calendarSolarLabel: "Solar",
  calendarLunarLabel: "Lunar",
  birthTimeUnknownLabel: "I don't know my birth time",
  submitCheckingLabel: "Opening the gate of destiny",
  submitGeneratingLabel: "Drawing your life map",
  submitIdleLabel: "Unfold your destiny",
  resetCta: "Open a new consultation",
  pdfSavingLabel: "Saving PDF",
  pdfSaveLabel: "Save PDF",
  resultKicker: "The Great Current Read Through Saju Numerology",
  coreSummaryFallback: "The central current of your life comes into view.",
  neededBalancePrefix: "Balance to complement: ",
  neededBalanceFallback: "Daily rhythm and the order of your choices",
  expertReadingsHeading: "A Deep Reading of Your Natal Chart",
  expertReadingFallbackTitle: (index) => `Deep Reading ${index + 1}`,
  idleGeneratingBadge: "Drawing your life map",
  idleBadgeDefault: "Life Fortune Expert Consultation",
  idleHeadingDefault: "The river of life slowly reveals its direction, following your natal chart.",
  idleDescDefault: "Along the line of time connecting your birth, today's choices, and the turning points ahead, we unfold your Life Fortune.",
  generatingNote: "Yeoni is following the grain of your natal chart, weaving your story one chapter at a time.",
  timelineSvgAriaLabel: "A golden life trajectory flowing from birth through the present into the future",
};

const initialForm: LifeFortuneForm = {
  name: "",
  gender: "",
  birthDate: "",
  birthTime: "12:00",
  birthTimeUnknown: false,
  calendarType: "solar",
};

const PREMIUM_SALES_COPY: Partial<Record<LoadingLocale, PremiumSalesCopy>> = {
  ko: {
    featureTitle: "인생 총운 전문가 상담",
    fallbackResultTitle: "인생 총운 상담",
    fallbackSubtitle: "타고난 명식과 시간의 흐름으로 읽는 삶의 큰 방향",
    priceNotFoundMessage: "가격 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    paymentVerifyFailedMessage: "인생 총운을 여는 과정이 완료되지 않았습니다.",
    paymentCancelledMessage: "선택이 취소되었습니다.",
    loginRequiredMessage: "로그인 후 인생 총운을 열 수 있습니다.",
    openFailedMessage: "인생 총운을 열지 못했습니다.",
    genericFallbackMessage: "상담을 열지 못했습니다.",
    storedResultLoadFailedMessage: "저장된 상담을 불러오지 못했습니다.",
    resultLoadFailedMessage: "상담을 불러오지 못했습니다.",
    fallbackChapters: [
      "타고난 명식의 중심", "성격과 마음의 결", "재능과 일의 방향", "재물과 생활 기반",
      "사랑과 인연의 흐름", "관계와 가족의 장", "건강과 생활 리듬", "대운으로 보는 큰 전환",
      "가까운 세운의 흐름", "앞으로 열릴 선택",
    ],
    extraChapterTitle: (index) => `인생의 장 ${index + 1}`,
    loadingMessages: [
      "태어난 연·월·일·시로 당신의 사주 명식을 다시 세우고 있어요.",
      "일간을 중심으로 오행의 균형과 십신의 자리를 짚어가는 중이에요.",
      "지나온 대운과 다가올 세운이 맞물리는 지점을 찾고 있어요.",
      "당신의 명식 위에 흐르는 인생의 결을 따라가고 있어요.",
      "용신과 기신의 목소리에 차분히 귀 기울이는 중이에요.",
      "조금만 더 기다려주세요, 당신의 인생 지도가 완성되고 있어요.",
    ],
    heroJourneyPoints: [
      "일간과 오행의 균형을 짚어 삶의 큰 물줄기를 읽습니다.",
      "타고난 명식에서 현재의 선택까지 이어진 시간의 결을 비춥니다.",
      "대운과 세운으로 열릴 전환점과 오래 지켜야 할 중심이 차분히 드러납니다.",
    ],
    gatePreparingTitle: "운명의 문 준비",
    gatePreparingMessage: "명식의 첫 문을 열고 있습니다.",
    gateOpenedTitle: "운명의 문 열림",
    gateOpenedMessage: "당신의 명식 위로 인생의 큰 흐름이 떠오릅니다.",
    gateFailedTitle: "운명의 문이 열리지 않았습니다",
    resultOpenedNotice: "인생 총운이 차분히 펼쳐졌습니다.",
    longGenerationNotice: "장문 상담문을 계속 완성하고 있습니다. 페이지를 닫아도 같은 상담을 다시 불러올 수 있습니다.",
    pollTimeoutNotice: "상담문을 조금 더 다듬고 있습니다. 잠시 후 새로고침하면 이어서 확인할 수 있습니다.",
    waveProgressNotice: (completed, total) => `인생 총운을 ${completed}/${total}장까지 완성했습니다.`,
    pdfNoSectionsError: "PDF 저장 대상 없음",
    pdfCanvasError: "PDF 캔버스 생성 실패",
    pdfCaptureError: "PDF 캡처 실패",
    pdfSaveErrorMessage: "PDF 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    pdfFileFallback: "인생총운",
    validationGenderRequired: "성별을 선택해 주세요.",
    validationGenderUnknownWarn: "대운 흐름을 정확히 계산하려면 성별을 선택해 주세요.",
    validationBirthDateInvalid: "생년월일을 확인해 주세요.",
    validationBirthDateRange: "생년월일은 1900년부터 2100년 사이로 입력해 주세요.",
    validationBirthTimeInvalid: "출생시간을 확인해 주세요.",
    statusCheckingText: "운명의 문을 여는 중입니다.",
    statusGeneratingText: "당신의 인생 지도가 열리고 있습니다.",
    statusCompletedText: "인생 총운이 열렸습니다.",
    formKicker: "인생 총운 사주",
    profileLoadAria: "프로필 카드에서 출생 정보 불러오기",
    profileLoadCta: "프로필 카드에서 불러오기",
    formHeading: "사주 명리가 비추는 삶의 큰 흐름",
    formDesc: "타고난 명식과 대운·세운의 흐름을 따라, 지금까지 이어진 길과 앞으로 열릴 장면을 차분히 들여다봅니다.",
    heroImageAlt: "인생 총람",
    nameLabel: "이름",
    namePlaceholder: "이름 또는 별명",
    genderLabel: "성별",
    genderFemale: "여성",
    genderMale: "남성",
    birthDateLabel: "생년월일",
    birthTimeLabel: "출생시간",
    calendarSolarLabel: "양력",
    calendarLunarLabel: "음력",
    birthTimeUnknownLabel: "출생시간을 모릅니다",
    submitCheckingLabel: "운명의 문을 여는 중",
    submitGeneratingLabel: "인생 지도를 그리는 중",
    submitIdleLabel: "운명을 펼쳐보기",
    resetCta: "새 상담 열기",
    pdfSavingLabel: "PDF 저장 중",
    pdfSaveLabel: "PDF 저장",
    resultKicker: "사주 명리로 읽은 큰 흐름",
    coreSummaryFallback: "삶의 중심 흐름이 드러납니다.",
    neededBalancePrefix: "보완의 결: ",
    neededBalanceFallback: "생활 리듬과 선택의 순서",
    expertReadingsHeading: "명식의 깊은 판독",
    expertReadingFallbackTitle: (index) => `깊은 판독 ${index + 1}`,
    idleGeneratingBadge: "인생 지도를 그리는 중",
    idleBadgeDefault: "인생 총운 전문가 상담",
    idleHeadingDefault: "삶의 강은 타고난 명식을 따라 천천히 방향을 드러냅니다.",
    idleDescDefault: "탄생의 자리에서 현재의 선택, 그리고 다가오는 전환까지 이어지는 시간의 선을 따라 당신의 인생 총운을 펼칩니다.",
    generatingNote: "연이가 명식의 결을 따라 당신의 서사를 한 장씩 이어가고 있어요.",
    timelineSvgAriaLabel: "탄생에서 현재와 미래로 흐르는 금빛 인생 궤적",
  },
  en: PREMIUM_SALES_EN,
  ja: {
    featureTitle: "人生総運専門家相談",
    fallbackResultTitle: "人生総運相談",
    fallbackSubtitle: "生まれ持った命式と時の流れで読む人生の大きな方向",
    priceNotFoundMessage: "価格情報を確認できませんでした。しばらくしてからもう一度お試しください。",
    paymentVerifyFailedMessage: "人生総運を開く過程が完了していません。",
    paymentCancelledMessage: "選択がキャンセルされました。",
    loginRequiredMessage: "ログイン後に人生総運を開くことができます。",
    openFailedMessage: "人生総運を開けませんでした。",
    genericFallbackMessage: "相談を開けませんでした。",
    storedResultLoadFailedMessage: "保存された相談を読み込めませんでした。",
    resultLoadFailedMessage: "相談を読み込めませんでした。",
    fallbackChapters: [
      "生まれ持った命式の中心", "性格と心の綾", "才能と仕事の方向", "財と生活の基盤",
      "愛と縁の流れ", "関係と家族の章", "健康と生活のリズム", "大運で見る大きな転換",
      "近づく歳運の流れ", "これから開く選択",
    ],
    extraChapterTitle: (index) => `人生の章 ${index + 1}`,
    loadingMessages: [
      "生まれた年・月・日・時からあなたの四柱命式を組み直しています。",
      "日干を中心に五行のバランスと十神の位置を見極めています。",
      "過去の大運と巡ってくる歳運が交わる地点を探しています。",
      "あなたの命式の上を流れる人生の綾をたどっています。",
      "用神と忌神の声に静かに耳を傾けています。",
      "もう少しお待ちください、あなたの人生地図が完成しつつあります。",
    ],
    heroJourneyPoints: [
      "日干と五行のバランスを見極め、人生の大きな流れを読みます。",
      "生まれ持った命式から今の選択までつながる時の綾を照らします。",
      "大運と歳運で開かれる転換点と、長く守るべき中心が静かに浮かび上がります。",
    ],
    gatePreparingTitle: "運命の門の準備",
    gatePreparingMessage: "命式の最初の門を開いています。",
    gateOpenedTitle: "運命の門が開きました",
    gateOpenedMessage: "あなたの命式の上に人生の大きな流れが浮かび上がります。",
    gateFailedTitle: "運命の門が開きませんでした",
    resultOpenedNotice: "人生総運が静かに開かれました。",
    longGenerationNotice: "長文の相談文を引き続き完成させています。ページを閉じても同じ相談を再度開くことができます。",
    pollTimeoutNotice: "相談文をもう少し整えています。しばらくしてから更新すると続きを確認できます。",
    waveProgressNotice: (completed, total) => `人生総運を${completed}/${total}章まで完成させました。`,
    pdfNoSectionsError: "PDF保存対象がありません",
    pdfCanvasError: "PDFキャンバスの作成に失敗しました",
    pdfCaptureError: "PDFキャプチャに失敗しました",
    pdfSaveErrorMessage: "PDF保存中に問題が発生しました。しばらくしてからもう一度お試しください。",
    pdfFileFallback: "人生総運",
    validationGenderRequired: "性別を選択してください。",
    validationGenderUnknownWarn: "大運の流れを正確に計算するには性別を選択してください。",
    validationBirthDateInvalid: "生年月日をご確認ください。",
    validationBirthDateRange: "生年月日は1900年から2100年の間で入力してください。",
    validationBirthTimeInvalid: "出生時刻をご確認ください。",
    statusCheckingText: "運命の門を開いています。",
    statusGeneratingText: "あなたの人生地図が開かれています。",
    statusCompletedText: "人生総運が開かれました。",
    formKicker: "人生総運四柱推命",
    profileLoadAria: "プロフィールカードから出生情報を読み込む",
    profileLoadCta: "プロフィールカードから読み込む",
    formHeading: "四柱推命が照らす人生の大きな流れ",
    formDesc: "生まれ持った命式と大運・歳運の流れに沿って、これまで歩んできた道とこれから開かれる場面を静かに見つめます。",
    heroImageAlt: "人生総覧",
    nameLabel: "名前",
    namePlaceholder: "名前またはニックネーム",
    genderLabel: "性別",
    genderFemale: "女性",
    genderMale: "男性",
    birthDateLabel: "生年月日",
    birthTimeLabel: "出生時刻",
    calendarSolarLabel: "新暦",
    calendarLunarLabel: "旧暦",
    birthTimeUnknownLabel: "出生時刻がわかりません",
    submitCheckingLabel: "運命の門を開いています",
    submitGeneratingLabel: "人生地図を描いています",
    submitIdleLabel: "運命を開いてみる",
    resetCta: "新しい相談を開く",
    pdfSavingLabel: "PDF保存中",
    pdfSaveLabel: "PDF保存",
    resultKicker: "四柱推命で読んだ大きな流れ",
    coreSummaryFallback: "人生の中心の流れが浮かび上がります。",
    neededBalancePrefix: "補うべき綾: ",
    neededBalanceFallback: "生活のリズムと選択の順序",
    expertReadingsHeading: "命式の深い判読",
    expertReadingFallbackTitle: (index) => `深い判読 ${index + 1}`,
    idleGeneratingBadge: "人生地図を描いています",
    idleBadgeDefault: "人生総運専門家相談",
    idleHeadingDefault: "人生の川は、生まれ持った命式に沿ってゆっくりと方向を現します。",
    idleDescDefault: "誕生の地点から今の選択、そしてこれから訪れる転換までつながる時の線をたどり、あなたの人生総運を開きます。",
    generatingNote: "ヨニが命式の綾に沿って、あなたの物語を一章ずつ紡いでいます。",
    timelineSvgAriaLabel: "誕生から現在、そして未来へと流れる黄金の人生の軌跡",
  },
  "zh-CN": {
    featureTitle: "人生总运专家咨询",
    fallbackResultTitle: "人生总运咨询",
    fallbackSubtitle: "通过与生俱来的命式与时间的流转解读人生的大方向",
    priceNotFoundMessage: "未能确认价格信息。请稍后重试。",
    paymentVerifyFailedMessage: "开启人生总运的过程尚未完成。",
    paymentCancelledMessage: "已取消选择。",
    loginRequiredMessage: "登录后即可开启人生总运。",
    openFailedMessage: "未能开启人生总运。",
    genericFallbackMessage: "未能开启咨询。",
    storedResultLoadFailedMessage: "未能加载已保存的咨询。",
    resultLoadFailedMessage: "未能加载咨询。",
    fallbackChapters: [
      "与生俱来命式的核心", "性格与内心的纹理", "才能与工作的方向", "财富与生活的根基",
      "爱情与缘分的流向", "关系与家庭的篇章", "健康与生活的节奏", "大运所见的重大转折",
      "临近流年的走向", "即将展开的选择",
    ],
    extraChapterTitle: (index) => `人生篇章 ${index + 1}`,
    loadingMessages: [
      "正在根据您的出生年月日时重新建立四柱命式。",
      "正在以日干为中心，梳理五行的平衡与十神的位置。",
      "正在寻找过去大运与即将到来流年交汇的节点。",
      "正在沿着您命式上流淌的人生纹理前行。",
      "正在静心倾听用神与忌神的声音。",
      "请再稍等片刻，您的人生地图正在完成。",
    ],
    heroJourneyPoints: [
      "梳理日干与五行的平衡，解读人生的大方向。",
      "照亮从与生俱来的命式延伸到当下选择的时间纹理。",
      "大运与流年开启的转折点，以及需要长久坚守的核心，将静静浮现。",
    ],
    gatePreparingTitle: "准备命运之门",
    gatePreparingMessage: "正在开启命式的第一道门。",
    gateOpenedTitle: "命运之门已开启",
    gateOpenedMessage: "人生的宏大流向正在您的命式之上浮现。",
    gateFailedTitle: "命运之门未能开启",
    resultOpenedNotice: "您的人生总运已静静展开。",
    longGenerationNotice: "长文咨询内容仍在完成中。您可以关闭此页面，之后再次打开同一咨询。",
    pollTimeoutNotice: "正在进一步打磨咨询内容。请稍后刷新页面以继续查看。",
    waveProgressNotice: (completed, total) => `人生总运已完成 ${completed}/${total} 章。`,
    pdfNoSectionsError: "没有可保存为PDF的内容",
    pdfCanvasError: "PDF画布创建失败",
    pdfCaptureError: "PDF截图失败",
    pdfSaveErrorMessage: "保存PDF时发生了问题。请稍后重试。",
    pdfFileFallback: "人生总运",
    validationGenderRequired: "请选择性别。",
    validationGenderUnknownWarn: "为准确计算大运走势，请选择性别。",
    validationBirthDateInvalid: "请确认您的出生日期。",
    validationBirthDateRange: "出生日期请输入1900年至2100年之间。",
    validationBirthTimeInvalid: "请确认您的出生时间。",
    statusCheckingText: "正在开启命运之门。",
    statusGeneratingText: "您的人生地图正在展开。",
    statusCompletedText: "您的人生总运已开启。",
    formKicker: "人生总运命理",
    profileLoadAria: "从个人资料卡加载出生信息",
    profileLoadCta: "从个人资料卡加载",
    formHeading: "命理学照亮的人生大方向",
    formDesc: "沿着您与生俱来的命式与大运、流年的走向，静静审视您走过的路与即将展开的场景。",
    heroImageAlt: "人生总览",
    nameLabel: "姓名",
    namePlaceholder: "姓名或昵称",
    genderLabel: "性别",
    genderFemale: "女性",
    genderMale: "男性",
    birthDateLabel: "出生日期",
    birthTimeLabel: "出生时间",
    calendarSolarLabel: "公历",
    calendarLunarLabel: "农历",
    birthTimeUnknownLabel: "不知道出生时间",
    submitCheckingLabel: "正在开启命运之门",
    submitGeneratingLabel: "正在绘制人生地图",
    submitIdleLabel: "开启您的命运",
    resetCta: "开启新咨询",
    pdfSavingLabel: "正在保存PDF",
    pdfSaveLabel: "保存PDF",
    resultKicker: "命理学解读的人生大方向",
    coreSummaryFallback: "人生的核心流向正在浮现。",
    neededBalancePrefix: "需要补充之处: ",
    neededBalanceFallback: "生活节奏与选择的顺序",
    expertReadingsHeading: "命式的深度解读",
    expertReadingFallbackTitle: (index) => `深度解读 ${index + 1}`,
    idleGeneratingBadge: "正在绘制人生地图",
    idleBadgeDefault: "人生总运专家咨询",
    idleHeadingDefault: "人生之河沿着与生俱来的命式，缓缓显露方向。",
    idleDescDefault: "沿着从出生之地到当下选择，再到即将到来的转折的时间之线，为您展开人生总运。",
    generatingNote: "妍伊正沿着命式的纹理，一章一章地编织您的故事。",
    timelineSvgAriaLabel: "从出生经由当下流向未来的金色人生轨迹",
  },
  "zh-TW": {
    featureTitle: "人生總運專家諮詢",
    fallbackResultTitle: "人生總運諮詢",
    fallbackSubtitle: "透過與生俱來的命式與時間的流轉解讀人生的大方向",
    priceNotFoundMessage: "未能確認價格資訊。請稍後重試。",
    paymentVerifyFailedMessage: "開啟人生總運的過程尚未完成。",
    paymentCancelledMessage: "已取消選擇。",
    loginRequiredMessage: "登入後即可開啟人生總運。",
    openFailedMessage: "未能開啟人生總運。",
    genericFallbackMessage: "未能開啟諮詢。",
    storedResultLoadFailedMessage: "未能載入已儲存的諮詢。",
    resultLoadFailedMessage: "未能載入諮詢。",
    fallbackChapters: [
      "與生俱來命式的核心", "性格與內心的紋理", "才能與工作的方向", "財富與生活的根基",
      "愛情與緣分的流向", "關係與家庭的篇章", "健康與生活的節奏", "大運所見的重大轉折",
      "臨近流年的走向", "即將展開的選擇",
    ],
    extraChapterTitle: (index) => `人生篇章 ${index + 1}`,
    loadingMessages: [
      "正在根據您的出生年月日時重新建立四柱命式。",
      "正在以日干為中心，梳理五行的平衡與十神的位置。",
      "正在尋找過去大運與即將到來流年交會的節點。",
      "正在沿著您命式上流淌的人生紋理前行。",
      "正在靜心傾聽用神與忌神的聲音。",
      "請再稍等片刻，您的人生地圖正在完成。",
    ],
    heroJourneyPoints: [
      "梳理日干與五行的平衡，解讀人生的大方向。",
      "照亮從與生俱來的命式延伸到當下選擇的時間紋理。",
      "大運與流年開啟的轉折點，以及需要長久堅守的核心，將靜靜浮現。",
    ],
    gatePreparingTitle: "準備命運之門",
    gatePreparingMessage: "正在開啟命式的第一道門。",
    gateOpenedTitle: "命運之門已開啟",
    gateOpenedMessage: "人生的宏大流向正在您的命式之上浮現。",
    gateFailedTitle: "命運之門未能開啟",
    resultOpenedNotice: "您的人生總運已靜靜展開。",
    longGenerationNotice: "長文諮詢內容仍在完成中。您可以關閉此頁面，之後再次開啟同一諮詢。",
    pollTimeoutNotice: "正在進一步打磨諮詢內容。請稍後重新整理頁面以繼續查看。",
    waveProgressNotice: (completed, total) => `人生總運已完成 ${completed}/${total} 章。`,
    pdfNoSectionsError: "沒有可儲存為PDF的內容",
    pdfCanvasError: "PDF畫布建立失敗",
    pdfCaptureError: "PDF截圖失敗",
    pdfSaveErrorMessage: "儲存PDF時發生了問題。請稍後重試。",
    pdfFileFallback: "人生總運",
    validationGenderRequired: "請選擇性別。",
    validationGenderUnknownWarn: "為準確計算大運走勢，請選擇性別。",
    validationBirthDateInvalid: "請確認您的出生日期。",
    validationBirthDateRange: "出生日期請輸入1900年至2100年之間。",
    validationBirthTimeInvalid: "請確認您的出生時間。",
    statusCheckingText: "正在開啟命運之門。",
    statusGeneratingText: "您的人生地圖正在展開。",
    statusCompletedText: "您的人生總運已開啟。",
    formKicker: "人生總運命理",
    profileLoadAria: "從個人資料卡載入出生資訊",
    profileLoadCta: "從個人資料卡載入",
    formHeading: "命理學照亮的人生大方向",
    formDesc: "沿著您與生俱來的命式與大運、流年的走向，靜靜審視您走過的路與即將展開的場景。",
    heroImageAlt: "人生總覽",
    nameLabel: "姓名",
    namePlaceholder: "姓名或暱稱",
    genderLabel: "性別",
    genderFemale: "女性",
    genderMale: "男性",
    birthDateLabel: "出生日期",
    birthTimeLabel: "出生時間",
    calendarSolarLabel: "陽曆",
    calendarLunarLabel: "農曆",
    birthTimeUnknownLabel: "不知道出生時間",
    submitCheckingLabel: "正在開啟命運之門",
    submitGeneratingLabel: "正在繪製人生地圖",
    submitIdleLabel: "開啟您的命運",
    resetCta: "開啟新諮詢",
    pdfSavingLabel: "正在儲存PDF",
    pdfSaveLabel: "儲存PDF",
    resultKicker: "命理學解讀的人生大方向",
    coreSummaryFallback: "人生的核心流向正在浮現。",
    neededBalancePrefix: "需要補充之處: ",
    neededBalanceFallback: "生活節奏與選擇的順序",
    expertReadingsHeading: "命式的深度解讀",
    expertReadingFallbackTitle: (index) => `深度解讀 ${index + 1}`,
    idleGeneratingBadge: "正在繪製人生地圖",
    idleBadgeDefault: "人生總運專家諮詢",
    idleHeadingDefault: "人生之河沿著與生俱來的命式，緩緩顯露方向。",
    idleDescDefault: "沿著從出生之地到當下選擇，再到即將到來的轉折的時間之線，為您展開人生總運。",
    generatingNote: "妍伊正沿著命式的紋理，一章一章地編織您的故事。",
    timelineSvgAriaLabel: "從出生經由當下流向未來的金色人生軌跡",
  },
  vi: {
    featureTitle: "Tư vấn chuyên gia Vận Mệnh Trọn Đời",
    fallbackResultTitle: "Tư vấn Vận Mệnh Trọn Đời",
    fallbackSubtitle: "Hướng đi lớn của cuộc đời được đọc qua lá số bẩm sinh và dòng chảy thời gian",
    priceNotFoundMessage: "Chúng tôi không thể xác nhận thông tin giá. Vui lòng thử lại sau ít phút.",
    paymentVerifyFailedMessage: "Quá trình mở Vận Mệnh Trọn Đời chưa hoàn tất.",
    paymentCancelledMessage: "Lựa chọn đã bị hủy.",
    loginRequiredMessage: "Đăng nhập để mở Vận Mệnh Trọn Đời.",
    openFailedMessage: "Chúng tôi không thể mở Vận Mệnh Trọn Đời của bạn.",
    genericFallbackMessage: "Chúng tôi không thể mở buổi tư vấn.",
    storedResultLoadFailedMessage: "Chúng tôi không thể tải buổi tư vấn đã lưu.",
    resultLoadFailedMessage: "Chúng tôi không thể tải buổi tư vấn.",
    fallbackChapters: [
      "Trung tâm của lá số bẩm sinh", "Nét tính cách và tâm hồn", "Hướng đi của tài năng và công việc", "Nền tảng tài lộc và cuộc sống",
      "Dòng chảy của tình yêu và duyên phận", "Chương về mối quan hệ và gia đình", "Nhịp điệu sức khỏe và cuộc sống", "Bước ngoặt lớn qua Đại Vận",
      "Dòng chảy của Lưu Niên sắp tới", "Những lựa chọn phía trước",
    ],
    extraChapterTitle: (index) => `Chương ${index + 1} của cuộc đời`,
    loadingMessages: [
      "Chúng tôi đang dựng lại lá số Tứ Trụ của bạn từ năm, tháng, ngày, giờ sinh.",
      "Chúng tôi đang xem xét sự cân bằng Ngũ Hành và vị trí Thập Thần quanh Nhật Can.",
      "Chúng tôi đang tìm điểm giao nhau giữa Đại Vận đã qua và Lưu Niên sắp tới.",
      "Chúng tôi đang theo dõi nét cuộc đời chảy trên lá số của bạn.",
      "Chúng tôi đang lắng nghe tiếng nói của Dụng Thần và Kỵ Thần.",
      "Xin chờ thêm một chút, bản đồ cuộc đời của bạn đang được hoàn thiện.",
    ],
    heroJourneyPoints: [
      "Chúng tôi xem xét sự cân bằng Nhật Can và Ngũ Hành để đọc dòng chảy lớn của cuộc đời.",
      "Chúng tôi soi sáng nét thời gian nối từ lá số bẩm sinh đến những lựa chọn hiện tại.",
      "Những bước ngoặt mở ra bởi Đại Vận và Lưu Niên, cùng trung tâm cần giữ vững lâu dài, sẽ lặng lẽ hiện ra.",
    ],
    gatePreparingTitle: "Chuẩn bị Cánh Cổng Vận Mệnh",
    gatePreparingMessage: "Đang mở cánh cổng đầu tiên của lá số.",
    gateOpenedTitle: "Cánh Cổng Vận Mệnh Đã Mở",
    gateOpenedMessage: "Dòng chảy lớn của cuộc đời bạn đang hiện lên trên lá số.",
    gateFailedTitle: "Cánh Cổng Vận Mệnh Chưa Mở",
    resultOpenedNotice: "Vận Mệnh Trọn Đời của bạn đã lặng lẽ mở ra.",
    longGenerationNotice: "Chúng tôi vẫn đang hoàn thiện bài đọc dài. Bạn có thể đóng trang này và mở lại cùng buổi tư vấn sau.",
    pollTimeoutNotice: "Chúng tôi đang trau chuốt thêm bài đọc. Làm mới trang sau ít phút để tiếp tục xem.",
    waveProgressNotice: (completed, total) => `Vận Mệnh Trọn Đời của bạn đã hoàn thành ${completed}/${total} chương.`,
    pdfNoSectionsError: "Không tìm thấy nội dung để lưu PDF",
    pdfCanvasError: "Không thể tạo canvas PDF",
    pdfCaptureError: "Không thể chụp PDF",
    pdfSaveErrorMessage: "Đã xảy ra sự cố khi lưu PDF. Vui lòng thử lại sau ít phút.",
    pdfFileFallback: "van-menh-tron-doi",
    validationGenderRequired: "Vui lòng chọn giới tính.",
    validationGenderUnknownWarn: "Vui lòng chọn giới tính để tính toán chính xác dòng chảy Đại Vận.",
    validationBirthDateInvalid: "Vui lòng kiểm tra ngày sinh của bạn.",
    validationBirthDateRange: "Vui lòng nhập ngày sinh trong khoảng từ năm 1900 đến 2100.",
    validationBirthTimeInvalid: "Vui lòng kiểm tra giờ sinh của bạn.",
    statusCheckingText: "Đang mở cánh cổng vận mệnh.",
    statusGeneratingText: "Bản đồ cuộc đời của bạn đang mở ra.",
    statusCompletedText: "Vận Mệnh Trọn Đời của bạn đã mở.",
    formKicker: "Tứ Trụ Vận Mệnh Trọn Đời",
    profileLoadAria: "Tải thông tin sinh từ thẻ hồ sơ",
    profileLoadCta: "Tải từ thẻ hồ sơ",
    formHeading: "Dòng Chảy Lớn Của Cuộc Đời Được Soi Sáng Bởi Tứ Trụ Mệnh Lý",
    formDesc: "Theo dòng chảy của lá số bẩm sinh cùng Đại Vận và Lưu Niên, chúng tôi lặng lẽ xem xét con đường bạn đã đi qua và những cảnh tượng sắp mở ra.",
    heroImageAlt: "Toàn cảnh Vận Mệnh Trọn Đời",
    nameLabel: "Tên",
    namePlaceholder: "Tên hoặc biệt danh",
    genderLabel: "Giới tính",
    genderFemale: "Nữ",
    genderMale: "Nam",
    birthDateLabel: "Ngày sinh",
    birthTimeLabel: "Giờ sinh",
    calendarSolarLabel: "Dương lịch",
    calendarLunarLabel: "Âm lịch",
    birthTimeUnknownLabel: "Tôi không biết giờ sinh",
    submitCheckingLabel: "Đang mở cánh cổng vận mệnh",
    submitGeneratingLabel: "Đang vẽ bản đồ cuộc đời",
    submitIdleLabel: "Mở ra vận mệnh của bạn",
    resetCta: "Mở buổi tư vấn mới",
    pdfSavingLabel: "Đang lưu PDF",
    pdfSaveLabel: "Lưu PDF",
    resultKicker: "Dòng Chảy Lớn Được Đọc Qua Tứ Trụ Mệnh Lý",
    coreSummaryFallback: "Dòng chảy trung tâm của cuộc đời bạn hiện ra.",
    neededBalancePrefix: "Điều cần bổ sung: ",
    neededBalanceFallback: "Nhịp điệu sinh hoạt và thứ tự lựa chọn",
    expertReadingsHeading: "Giải Đoán Sâu Về Lá Số Của Bạn",
    expertReadingFallbackTitle: (index) => `Giải đoán sâu ${index + 1}`,
    idleGeneratingBadge: "Đang vẽ bản đồ cuộc đời",
    idleBadgeDefault: "Tư vấn chuyên gia Vận Mệnh Trọn Đời",
    idleHeadingDefault: "Dòng sông cuộc đời từ từ lộ ra hướng đi, theo lá số bẩm sinh của bạn.",
    idleDescDefault: "Theo đường thời gian nối từ nơi sinh ra, những lựa chọn hôm nay, đến những bước ngoặt sắp tới, chúng tôi mở ra Vận Mệnh Trọn Đời của bạn.",
    generatingNote: "Yeoni đang theo nét lá số của bạn, dệt nên câu chuyện của bạn từng chương một.",
    timelineSvgAriaLabel: "Quỹ đạo cuộc đời vàng son chảy từ khi sinh ra qua hiện tại đến tương lai",
  },
  hi: {
    featureTitle: "जीवन भाग्य विशेषज्ञ परामर्श",
    fallbackResultTitle: "जीवन भाग्य परामर्श",
    fallbackSubtitle: "जन्म कुंडली और समय के प्रवाह से पढ़ी गई जीवन की बड़ी दिशा",
    priceNotFoundMessage: "हम मूल्य जानकारी की पुष्टि नहीं कर सके। कृपया थोड़ी देर बाद पुनः प्रयास करें।",
    paymentVerifyFailedMessage: "जीवन भाग्य खोलने की प्रक्रिया पूरी नहीं हुई है।",
    paymentCancelledMessage: "चयन रद्द कर दिया गया।",
    loginRequiredMessage: "जीवन भाग्य खोलने के लिए लॉगिन करें।",
    openFailedMessage: "हम आपका जीवन भाग्य नहीं खोल सके।",
    genericFallbackMessage: "हम परामर्श नहीं खोल सके।",
    storedResultLoadFailedMessage: "हम आपका सहेजा गया परामर्श लोड नहीं कर सके।",
    resultLoadFailedMessage: "हम परामर्श लोड नहीं कर सके।",
    fallbackChapters: [
      "जन्म कुंडली का केंद्र", "स्वभाव और मन की बनावट", "प्रतिभा और कार्य की दिशा", "धन और जीवन का आधार",
      "प्रेम और संबंधों का प्रवाह", "रिश्तों और परिवार का अध्याय", "स्वास्थ्य और जीवन की लय", "महादशा से दिखने वाला बड़ा मोड़",
      "आने वाले वार्षिक चक्र का प्रवाह", "आगे खुलने वाले विकल्प",
    ],
    extraChapterTitle: (index) => `जीवन का अध्याय ${index + 1}`,
    loadingMessages: [
      "आपके जन्म वर्ष, माह, दिन और समय से आपकी कुंडली फिर से बना रहे हैं।",
      "दिवस स्वामी को केंद्र में रखते हुए पंच तत्वों का संतुलन और दस देवताओं की स्थिति देख रहे हैं।",
      "बीती महादशा और आने वाले वार्षिक चक्र के मिलन बिंदु को खोज रहे हैं।",
      "आपकी कुंडली पर बहते जीवन के प्रवाह का अनुसरण कर रहे हैं।",
      "उपयोगी और प्रतिकूल तत्वों की आवाज़ को शांति से सुन रहे हैं।",
      "थोड़ी देर और प्रतीक्षा करें, आपका जीवन मानचित्र पूर्ण हो रहा है।",
    ],
    heroJourneyPoints: [
      "दिवस स्वामी और पंच तत्वों के संतुलन को देखकर जीवन की बड़ी धारा पढ़ते हैं।",
      "जन्म कुंडली से वर्तमान विकल्पों तक जुड़े समय की बनावट को रोशन करते हैं।",
      "महादशा और वार्षिक चक्र से खुलने वाले मोड़ और लंबे समय तक बनाए रखने योग्य केंद्र शांति से उभरते हैं।",
    ],
    gatePreparingTitle: "भाग्य द्वार की तैयारी",
    gatePreparingMessage: "कुंडली का पहला द्वार खोला जा रहा है।",
    gateOpenedTitle: "भाग्य द्वार खुल गया",
    gateOpenedMessage: "आपकी कुंडली पर जीवन की बड़ी धारा उभर रही है।",
    gateFailedTitle: "भाग्य द्वार नहीं खुला",
    resultOpenedNotice: "आपका जीवन भाग्य शांति से खुल गया है।",
    longGenerationNotice: "हम अभी भी लंबी रीडिंग पूरी कर रहे हैं। आप इस पृष्ठ को बंद कर सकते हैं और बाद में उसी परामर्श को फिर से खोल सकते हैं।",
    pollTimeoutNotice: "हम रीडिंग को थोड़ा और निखार रहे हैं। जारी रखने के लिए कुछ देर बाद पृष्ठ ताज़ा करें।",
    waveProgressNotice: (completed, total) => `आपका जीवन भाग्य ${total} में से ${completed} अध्याय तक पूर्ण हो गया है।`,
    pdfNoSectionsError: "PDF में सहेजने के लिए कोई सामग्री नहीं मिली",
    pdfCanvasError: "PDF कैनवस बनाने में विफल",
    pdfCaptureError: "PDF कैप्चर करने में विफल",
    pdfSaveErrorMessage: "PDF सहेजते समय समस्या हुई। कृपया थोड़ी देर बाद पुनः प्रयास करें।",
    pdfFileFallback: "जीवन-भाग्य",
    validationGenderRequired: "कृपया लिंग चुनें।",
    validationGenderUnknownWarn: "महादशा प्रवाह की सटीक गणना के लिए कृपया लिंग चुनें।",
    validationBirthDateInvalid: "कृपया अपनी जन्म तिथि जांचें।",
    validationBirthDateRange: "कृपया 1900 से 2100 के बीच जन्म तिथि दर्ज करें।",
    validationBirthTimeInvalid: "कृपया अपना जन्म समय जांचें।",
    statusCheckingText: "भाग्य द्वार खोला जा रहा है।",
    statusGeneratingText: "आपका जीवन मानचित्र खुल रहा है।",
    statusCompletedText: "आपका जीवन भाग्य खुल गया है।",
    formKicker: "जीवन भाग्य कुंडली",
    profileLoadAria: "प्रोफ़ाइल कार्ड से जन्म जानकारी लोड करें",
    profileLoadCta: "प्रोफ़ाइल कार्ड से लोड करें",
    formHeading: "ज्योतिष द्वारा रोशन जीवन की बड़ी धारा",
    formDesc: "आपकी जन्म कुंडली और महादशा-वार्षिक चक्र के प्रवाह के साथ, अब तक चले आए मार्ग और आगे खुलने वाले दृश्यों को शांति से देखते हैं।",
    heroImageAlt: "जीवन भाग्य का सिंहावलोकन",
    nameLabel: "नाम",
    namePlaceholder: "नाम या उपनाम",
    genderLabel: "लिंग",
    genderFemale: "महिला",
    genderMale: "पुरुष",
    birthDateLabel: "जन्म तिथि",
    birthTimeLabel: "जन्म समय",
    calendarSolarLabel: "सौर",
    calendarLunarLabel: "चंद्र",
    birthTimeUnknownLabel: "मुझे अपना जन्म समय नहीं पता",
    submitCheckingLabel: "भाग्य द्वार खोला जा रहा है",
    submitGeneratingLabel: "जीवन मानचित्र बनाया जा रहा है",
    submitIdleLabel: "अपना भाग्य खोलें",
    resetCta: "नया परामर्श खोलें",
    pdfSavingLabel: "PDF सहेजा जा रहा है",
    pdfSaveLabel: "PDF सहेजें",
    resultKicker: "ज्योतिष से पढ़ी गई बड़ी धारा",
    coreSummaryFallback: "आपके जीवन की केंद्रीय धारा उभर रही है।",
    neededBalancePrefix: "पूरक करने योग्य: ",
    neededBalanceFallback: "दैनिक लय और विकल्पों का क्रम",
    expertReadingsHeading: "आपकी कुंडली का गहन विश्लेषण",
    expertReadingFallbackTitle: (index) => `गहन विश्लेषण ${index + 1}`,
    idleGeneratingBadge: "जीवन मानचित्र बनाया जा रहा है",
    idleBadgeDefault: "जीवन भाग्य विशेषज्ञ परामर्श",
    idleHeadingDefault: "जीवन की नदी आपकी जन्म कुंडली के अनुसार धीरे-धीरे दिशा प्रकट करती है।",
    idleDescDefault: "जन्म से आज के विकल्पों और आगे आने वाले मोड़ों को जोड़ने वाली समय की रेखा के साथ, हम आपका जीवन भाग्य खोलते हैं।",
    generatingNote: "योनी आपकी कुंडली की बनावट के अनुसार, आपकी कहानी को एक-एक अध्याय करके बुन रही है।",
    timelineSvgAriaLabel: "जन्म से वर्तमान होते हुए भविष्य की ओर बहता सुनहरा जीवन प्रक्षेपवक्र",
  },
  es: {
    featureTitle: "Consulta experta de Fortuna de Vida",
    fallbackResultTitle: "Consulta de Fortuna de Vida",
    fallbackSubtitle: "La gran dirección de la vida leída a través de tu carta natal y el flujo del tiempo",
    priceNotFoundMessage: "No pudimos confirmar la información del precio. Inténtalo de nuevo en unos momentos.",
    paymentVerifyFailedMessage: "El proceso para abrir tu Fortuna de Vida no se completó.",
    paymentCancelledMessage: "La selección fue cancelada.",
    loginRequiredMessage: "Inicia sesión para abrir tu Fortuna de Vida.",
    openFailedMessage: "No pudimos abrir tu Fortuna de Vida.",
    genericFallbackMessage: "No pudimos abrir la consulta.",
    storedResultLoadFailedMessage: "No pudimos cargar tu consulta guardada.",
    resultLoadFailedMessage: "No pudimos cargar la consulta.",
    fallbackChapters: [
      "El centro de tu carta natal", "El carácter y la textura de tu mente", "La dirección de tu talento y trabajo", "La base de tu riqueza y vida cotidiana",
      "El flujo del amor y los lazos", "El capítulo de las relaciones y la familia", "El ritmo de la salud y la vida cotidiana", "El gran giro visto a través de los ciclos de Gran Fortuna",
      "El flujo del ciclo anual que se acerca", "Las decisiones que están por venir",
    ],
    extraChapterTitle: (index) => `Capítulo de vida ${index + 1}`,
    loadingMessages: [
      "Estamos reconstruyendo tu carta natal a partir de tu año, mes, día y hora de nacimiento.",
      "Estamos rastreando el equilibrio de los Cinco Elementos y la posición de los Diez Dioses alrededor de tu Día Maestro.",
      "Estamos encontrando dónde se encuentran tus ciclos pasados de Gran Fortuna con los ciclos anuales que se acercan.",
      "Estamos siguiendo la textura de la vida que fluye sobre tu carta natal.",
      "Estamos escuchando en silencio las voces de tu Dios Útil y tu Dios Adverso.",
      "Solo un poco más — tu mapa de vida está tomando forma.",
    ],
    heroJourneyPoints: [
      "Rastreamos el equilibrio de tu Día Maestro y los Cinco Elementos para leer la gran corriente de tu vida.",
      "Iluminamos la textura del tiempo que conecta tu carta natal con las decisiones que tomas hoy.",
      "Los puntos de inflexión abiertos por los ciclos de Gran Fortuna y anuales, y el centro que debes sostener a largo plazo, salen a la luz con calma.",
    ],
    gatePreparingTitle: "Preparando la Puerta del Destino",
    gatePreparingMessage: "Abriendo la primera puerta de tu carta natal.",
    gateOpenedTitle: "La Puerta del Destino se ha abierto",
    gateOpenedMessage: "El gran flujo de tu vida se eleva sobre tu carta natal.",
    gateFailedTitle: "La Puerta del Destino no se abrió",
    resultOpenedNotice: "Tu Fortuna de Vida se ha desplegado con calma.",
    longGenerationNotice: "Todavía estamos completando la lectura extensa. Puedes cerrar esta página y reabrir la misma consulta más tarde.",
    pollTimeoutNotice: "Estamos puliendo un poco más la lectura. Actualiza en un momento para seguir revisando.",
    waveProgressNotice: (completed, total) => `Tu Fortuna de Vida está completa hasta el capítulo ${completed} de ${total}.`,
    pdfNoSectionsError: "No se encontró contenido para guardar como PDF",
    pdfCanvasError: "Error al crear el lienzo del PDF",
    pdfCaptureError: "Error al capturar el PDF",
    pdfSaveErrorMessage: "Ocurrió un problema al guardar el PDF. Inténtalo de nuevo en unos momentos.",
    pdfFileFallback: "fortuna-de-vida",
    validationGenderRequired: "Por favor, selecciona un género.",
    validationGenderUnknownWarn: "Selecciona un género para calcular con precisión el flujo del ciclo de Gran Fortuna.",
    validationBirthDateInvalid: "Verifica tu fecha de nacimiento.",
    validationBirthDateRange: "Ingresa una fecha de nacimiento entre 1900 y 2100.",
    validationBirthTimeInvalid: "Verifica tu hora de nacimiento.",
    statusCheckingText: "Abriendo la puerta del destino.",
    statusGeneratingText: "Tu mapa de vida se está desplegando.",
    statusCompletedText: "Tu Fortuna de Vida se ha abierto.",
    formKicker: "Saju de Fortuna de Vida",
    profileLoadAria: "Cargar información de nacimiento desde tu tarjeta de perfil",
    profileLoadCta: "Cargar desde la tarjeta de perfil",
    formHeading: "La Gran Corriente de la Vida Iluminada por la Numerología Saju",
    formDesc: "Siguiendo el flujo de tu carta natal y los ciclos de Gran Fortuna y anuales, examinamos con calma el camino que has recorrido y las escenas que te esperan.",
    heroImageAlt: "Panorama de la Fortuna de Vida",
    nameLabel: "Nombre",
    namePlaceholder: "Nombre o apodo",
    genderLabel: "Género",
    genderFemale: "Femenino",
    genderMale: "Masculino",
    birthDateLabel: "Fecha de nacimiento",
    birthTimeLabel: "Hora de nacimiento",
    calendarSolarLabel: "Solar",
    calendarLunarLabel: "Lunar",
    birthTimeUnknownLabel: "No sé mi hora de nacimiento",
    submitCheckingLabel: "Abriendo la puerta del destino",
    submitGeneratingLabel: "Dibujando tu mapa de vida",
    submitIdleLabel: "Despliega tu destino",
    resetCta: "Abrir una nueva consulta",
    pdfSavingLabel: "Guardando PDF",
    pdfSaveLabel: "Guardar PDF",
    resultKicker: "La Gran Corriente Leída a Través de la Numerología Saju",
    coreSummaryFallback: "La corriente central de tu vida sale a la luz.",
    neededBalancePrefix: "Equilibrio a complementar: ",
    neededBalanceFallback: "El ritmo diario y el orden de tus decisiones",
    expertReadingsHeading: "Una Lectura Profunda de tu Carta Natal",
    expertReadingFallbackTitle: (index) => `Lectura profunda ${index + 1}`,
    idleGeneratingBadge: "Dibujando tu mapa de vida",
    idleBadgeDefault: "Consulta experta de Fortuna de Vida",
    idleHeadingDefault: "El río de la vida revela lentamente su dirección, siguiendo tu carta natal.",
    idleDescDefault: "A lo largo de la línea de tiempo que conecta tu nacimiento, las decisiones de hoy y los puntos de inflexión por venir, desplegamos tu Fortuna de Vida.",
    generatingNote: "Yeoni sigue la textura de tu carta natal, tejiendo tu historia capítulo a capítulo.",
    timelineSvgAriaLabel: "Una trayectoria de vida dorada que fluye desde el nacimiento a través del presente hacia el futuro",
  },
  fr: {
    featureTitle: "Consultation experte en Fortune de Vie",
    fallbackResultTitle: "Consultation de Fortune de Vie",
    fallbackSubtitle: "La grande direction de la vie lue à travers votre thème natal et le flux du temps",
    priceNotFoundMessage: "Nous n'avons pas pu confirmer les informations de prix. Veuillez réessayer dans un instant.",
    paymentVerifyFailedMessage: "Le processus d'ouverture de votre Fortune de Vie n'est pas terminé.",
    paymentCancelledMessage: "La sélection a été annulée.",
    loginRequiredMessage: "Connectez-vous pour ouvrir votre Fortune de Vie.",
    openFailedMessage: "Nous n'avons pas pu ouvrir votre Fortune de Vie.",
    genericFallbackMessage: "Nous n'avons pas pu ouvrir la consultation.",
    storedResultLoadFailedMessage: "Nous n'avons pas pu charger votre consultation enregistrée.",
    resultLoadFailedMessage: "Nous n'avons pas pu charger la consultation.",
    fallbackChapters: [
      "Le centre de votre thème natal", "Le grain de votre caractère et de votre esprit", "La direction de votre talent et de votre travail", "La base de votre richesse et de votre vie quotidienne",
      "Le flux de l'amour et des liens", "Le chapitre des relations et de la famille", "Le rythme de la santé et de la vie quotidienne", "Le grand tournant vu à travers les cycles de Grande Fortune",
      "Le flux du cycle annuel à venir", "Les choix à venir",
    ],
    extraChapterTitle: (index) => `Chapitre de vie ${index + 1}`,
    loadingMessages: [
      "Nous reconstruisons votre thème natal à partir de votre année, mois, jour et heure de naissance.",
      "Nous retraçons l'équilibre des Cinq Éléments et la position des Dix Dieux autour de votre Maître du Jour.",
      "Nous trouvons où vos cycles passés de Grande Fortune rencontrent les cycles annuels à venir.",
      "Nous suivons le grain de vie qui coule sur votre thème natal.",
      "Nous écoutons tranquillement les voix de votre Dieu Utile et de votre Dieu Adverse.",
      "Encore un peu de patience — votre carte de vie prend forme.",
    ],
    heroJourneyPoints: [
      "Nous retraçons l'équilibre de votre Maître du Jour et des Cinq Éléments pour lire le grand courant de votre vie.",
      "Nous éclairons le grain du temps reliant votre thème natal aux choix que vous faites aujourd'hui.",
      "Les tournants ouverts par les cycles de Grande Fortune et annuels, ainsi que le centre que vous devez tenir sur le long terme, apparaissent tranquillement.",
    ],
    gatePreparingTitle: "Préparation de la Porte du Destin",
    gatePreparingMessage: "Ouverture de la première porte de votre thème natal.",
    gateOpenedTitle: "La Porte du Destin s'est ouverte",
    gateOpenedMessage: "Le grand flux de votre vie s'élève au-dessus de votre thème natal.",
    gateFailedTitle: "La Porte du Destin ne s'est pas ouverte",
    resultOpenedNotice: "Votre Fortune de Vie s'est déployée tranquillement.",
    longGenerationNotice: "Nous finalisons encore la lecture longue. Vous pouvez fermer cette page et rouvrir la même consultation plus tard.",
    pollTimeoutNotice: "Nous peaufinons encore un peu la lecture. Actualisez dans un instant pour continuer à vérifier.",
    waveProgressNotice: (completed, total) => `Votre Fortune de Vie est complète jusqu'au chapitre ${completed} sur ${total}.`,
    pdfNoSectionsError: "Aucun contenu trouvé à enregistrer en PDF",
    pdfCanvasError: "Échec de la création du canevas PDF",
    pdfCaptureError: "Échec de la capture du PDF",
    pdfSaveErrorMessage: "Un problème est survenu lors de l'enregistrement du PDF. Veuillez réessayer dans un instant.",
    pdfFileFallback: "fortune-de-vie",
    validationGenderRequired: "Veuillez sélectionner un genre.",
    validationGenderUnknownWarn: "Veuillez sélectionner un genre pour calculer précisément le flux du cycle de Grande Fortune.",
    validationBirthDateInvalid: "Veuillez vérifier votre date de naissance.",
    validationBirthDateRange: "Veuillez saisir une date de naissance entre 1900 et 2100.",
    validationBirthTimeInvalid: "Veuillez vérifier votre heure de naissance.",
    statusCheckingText: "Ouverture de la porte du destin.",
    statusGeneratingText: "Votre carte de vie se déploie.",
    statusCompletedText: "Votre Fortune de Vie s'est ouverte.",
    formKicker: "Saju de Fortune de Vie",
    profileLoadAria: "Charger les informations de naissance depuis votre carte de profil",
    profileLoadCta: "Charger depuis la carte de profil",
    formHeading: "Le Grand Courant de la Vie Éclairé par la Numérologie Saju",
    formDesc: "En suivant le flux de votre thème natal et des cycles de Grande Fortune et annuels, nous examinons tranquillement le chemin que vous avez parcouru et les scènes qui vous attendent.",
    heroImageAlt: "Panorama de la Fortune de Vie",
    nameLabel: "Nom",
    namePlaceholder: "Nom ou surnom",
    genderLabel: "Genre",
    genderFemale: "Femme",
    genderMale: "Homme",
    birthDateLabel: "Date de naissance",
    birthTimeLabel: "Heure de naissance",
    calendarSolarLabel: "Solaire",
    calendarLunarLabel: "Lunaire",
    birthTimeUnknownLabel: "Je ne connais pas mon heure de naissance",
    submitCheckingLabel: "Ouverture de la porte du destin",
    submitGeneratingLabel: "Dessin de votre carte de vie",
    submitIdleLabel: "Déployez votre destin",
    resetCta: "Ouvrir une nouvelle consultation",
    pdfSavingLabel: "Enregistrement du PDF",
    pdfSaveLabel: "Enregistrer le PDF",
    resultKicker: "Le Grand Courant Lu à Travers la Numérologie Saju",
    coreSummaryFallback: "Le courant central de votre vie apparaît.",
    neededBalancePrefix: "Équilibre à compléter : ",
    neededBalanceFallback: "Le rythme quotidien et l'ordre de vos choix",
    expertReadingsHeading: "Une Lecture Approfondie de votre Thème Natal",
    expertReadingFallbackTitle: (index) => `Lecture approfondie ${index + 1}`,
    idleGeneratingBadge: "Dessin de votre carte de vie",
    idleBadgeDefault: "Consultation experte en Fortune de Vie",
    idleHeadingDefault: "Le fleuve de la vie révèle lentement sa direction, suivant votre thème natal.",
    idleDescDefault: "Le long de la ligne du temps reliant votre naissance, les choix d'aujourd'hui et les tournants à venir, nous déployons votre Fortune de Vie.",
    generatingNote: "Yeoni suit le grain de votre thème natal, tissant votre histoire chapitre par chapitre.",
    timelineSvgAriaLabel: "Une trajectoire de vie dorée s'écoulant de la naissance à travers le présent vers l'avenir",
  },
  de: {
    featureTitle: "Lebensschicksal-Expertenberatung",
    fallbackResultTitle: "Lebensschicksal-Beratung",
    fallbackSubtitle: "Die große Richtung des Lebens, gelesen durch Ihr Geburtshoroskop und den Fluss der Zeit",
    priceNotFoundMessage: "Wir konnten die Preisinformationen nicht bestätigen. Bitte versuchen Sie es in Kürze erneut.",
    paymentVerifyFailedMessage: "Der Vorgang zum Öffnen Ihres Lebensschicksals wurde nicht abgeschlossen.",
    paymentCancelledMessage: "Die Auswahl wurde storniert.",
    loginRequiredMessage: "Melden Sie sich an, um Ihr Lebensschicksal zu öffnen.",
    openFailedMessage: "Wir konnten Ihr Lebensschicksal nicht öffnen.",
    genericFallbackMessage: "Wir konnten die Beratung nicht öffnen.",
    storedResultLoadFailedMessage: "Wir konnten Ihre gespeicherte Beratung nicht laden.",
    resultLoadFailedMessage: "Wir konnten die Beratung nicht laden.",
    fallbackChapters: [
      "Das Zentrum Ihres Geburtshoroskops", "Die Textur Ihres Charakters und Geistes", "Die Richtung von Talent und Arbeit", "Die Grundlage von Wohlstand und Alltag",
      "Der Fluss von Liebe und Bindungen", "Das Kapitel über Beziehungen und Familie", "Der Rhythmus von Gesundheit und Alltag", "Die große Wende, gesehen durch Große-Glücks-Zyklen",
      "Der Fluss des kommenden Jahreszyklus", "Die bevorstehenden Entscheidungen",
    ],
    extraChapterTitle: (index) => `Lebenskapitel ${index + 1}`,
    loadingMessages: [
      "Wir bauen Ihr Geburtshoroskop anhand Ihres Geburtsjahres, -monats, -tages und -zeit neu auf.",
      "Wir verfolgen das Gleichgewicht der Fünf Elemente und die Position der Zehn Götter um Ihren Tagesherrn.",
      "Wir finden heraus, wo sich Ihre vergangenen Große-Glücks-Zyklen mit den kommenden Jahreszyklen treffen.",
      "Wir folgen der Lebenstextur, die über Ihr Geburtshoroskop fließt.",
      "Wir hören still den Stimmen Ihres Nütz-Gottes und Ihres Wider-Gottes zu.",
      "Nur noch ein wenig — Ihre Lebenskarte nimmt Gestalt an.",
    ],
    heroJourneyPoints: [
      "Wir verfolgen das Gleichgewicht Ihres Tagesherrn und der Fünf Elemente, um die große Strömung Ihres Lebens zu lesen.",
      "Wir beleuchten die Zeittextur, die Ihr Geburtshoroskop mit den Entscheidungen von heute verbindet.",
      "Die Wendepunkte, die durch Große-Glücks- und Jahreszyklen eröffnet werden, sowie das Zentrum, das Sie langfristig bewahren sollten, treten still zutage.",
    ],
    gatePreparingTitle: "Vorbereitung des Schicksalstors",
    gatePreparingMessage: "Das erste Tor Ihres Geburtshoroskops wird geöffnet.",
    gateOpenedTitle: "Das Schicksalstor hat sich geöffnet",
    gateOpenedMessage: "Der große Fluss Ihres Lebens erhebt sich über Ihrem Geburtshoroskop.",
    gateFailedTitle: "Das Schicksalstor hat sich nicht geöffnet",
    resultOpenedNotice: "Ihr Lebensschicksal hat sich still entfaltet.",
    longGenerationNotice: "Wir vervollständigen noch die ausführliche Deutung. Sie können diese Seite schließen und dieselbe Beratung später erneut öffnen.",
    pollTimeoutNotice: "Wir feilen noch etwas an der Deutung. Aktualisieren Sie in Kürze, um weiter zu prüfen.",
    waveProgressNotice: (completed, total) => `Ihr Lebensschicksal ist bis Kapitel ${completed} von ${total} vollständig.`,
    pdfNoSectionsError: "Keine Inhalte zum Speichern als PDF gefunden",
    pdfCanvasError: "Erstellung der PDF-Leinwand fehlgeschlagen",
    pdfCaptureError: "PDF-Erfassung fehlgeschlagen",
    pdfSaveErrorMessage: "Beim Speichern des PDFs ist ein Problem aufgetreten. Bitte versuchen Sie es in Kürze erneut.",
    pdfFileFallback: "lebensschicksal",
    validationGenderRequired: "Bitte wählen Sie ein Geschlecht aus.",
    validationGenderUnknownWarn: "Bitte wählen Sie ein Geschlecht aus, um den Große-Glücks-Zyklus-Fluss genau zu berechnen.",
    validationBirthDateInvalid: "Bitte überprüfen Sie Ihr Geburtsdatum.",
    validationBirthDateRange: "Bitte geben Sie ein Geburtsdatum zwischen 1900 und 2100 ein.",
    validationBirthTimeInvalid: "Bitte überprüfen Sie Ihre Geburtszeit.",
    statusCheckingText: "Das Schicksalstor wird geöffnet.",
    statusGeneratingText: "Ihre Lebenskarte entfaltet sich.",
    statusCompletedText: "Ihr Lebensschicksal hat sich geöffnet.",
    formKicker: "Lebensschicksal-Saju",
    profileLoadAria: "Geburtsinformationen aus Ihrer Profilkarte laden",
    profileLoadCta: "Aus Profilkarte laden",
    formHeading: "Die große Strömung des Lebens, beleuchtet durch Saju-Numerologie",
    formDesc: "Dem Fluss Ihres Geburtshoroskops und der Großen-Glücks- und Jahreszyklen folgend, betrachten wir still den Weg, den Sie gegangen sind, und die Szenen, die vor Ihnen liegen.",
    heroImageAlt: "Übersicht des Lebensschicksals",
    nameLabel: "Name",
    namePlaceholder: "Name oder Spitzname",
    genderLabel: "Geschlecht",
    genderFemale: "Weiblich",
    genderMale: "Männlich",
    birthDateLabel: "Geburtsdatum",
    birthTimeLabel: "Geburtszeit",
    calendarSolarLabel: "Solar",
    calendarLunarLabel: "Lunar",
    birthTimeUnknownLabel: "Ich kenne meine Geburtszeit nicht",
    submitCheckingLabel: "Das Schicksalstor wird geöffnet",
    submitGeneratingLabel: "Ihre Lebenskarte wird gezeichnet",
    submitIdleLabel: "Entfalten Sie Ihr Schicksal",
    resetCta: "Neue Beratung öffnen",
    pdfSavingLabel: "PDF wird gespeichert",
    pdfSaveLabel: "PDF speichern",
    resultKicker: "Die große Strömung, gelesen durch Saju-Numerologie",
    coreSummaryFallback: "Die zentrale Strömung Ihres Lebens tritt zutage.",
    neededBalancePrefix: "Zu ergänzendes Gleichgewicht: ",
    neededBalanceFallback: "Alltagsrhythmus und Reihenfolge der Entscheidungen",
    expertReadingsHeading: "Eine tiefgehende Deutung Ihres Geburtshoroskops",
    expertReadingFallbackTitle: (index) => `Tiefgehende Deutung ${index + 1}`,
    idleGeneratingBadge: "Ihre Lebenskarte wird gezeichnet",
    idleBadgeDefault: "Lebensschicksal-Expertenberatung",
    idleHeadingDefault: "Der Fluss des Lebens offenbart langsam seine Richtung, Ihrem Geburtshoroskop folgend.",
    idleDescDefault: "Entlang der Zeitlinie, die Ihre Geburt, die heutigen Entscheidungen und die bevorstehenden Wendepunkte verbindet, entfalten wir Ihr Lebensschicksal.",
    generatingNote: "Yeoni folgt der Textur Ihres Geburtshoroskops und webt Ihre Geschichte Kapitel für Kapitel.",
    timelineSvgAriaLabel: "Eine goldene Lebensbahn, die von der Geburt über die Gegenwart in die Zukunft fließt",
  },
  nl: {
    featureTitle: "Levenslotsbestemming expertconsult",
    fallbackResultTitle: "Levenslotsbestemming consult",
    fallbackSubtitle: "De grote richting van het leven gelezen via je geboortehoroscoop en de stroom van de tijd",
    priceNotFoundMessage: "We konden de prijsinformatie niet bevestigen. Probeer het later opnieuw.",
    paymentVerifyFailedMessage: "Het proces om je Levenslotsbestemming te openen is niet voltooid.",
    paymentCancelledMessage: "De selectie is geannuleerd.",
    loginRequiredMessage: "Log in om je Levenslotsbestemming te openen.",
    openFailedMessage: "We konden je Levenslotsbestemming niet openen.",
    genericFallbackMessage: "We konden het consult niet openen.",
    storedResultLoadFailedMessage: "We konden je opgeslagen consult niet laden.",
    resultLoadFailedMessage: "We konden het consult niet laden.",
    fallbackChapters: [
      "Het middelpunt van je geboortehoroscoop", "De textuur van je karakter en geest", "De richting van talent en werk", "De basis van rijkdom en dagelijks leven",
      "De stroom van liefde en banden", "Het hoofdstuk over relaties en familie", "Het ritme van gezondheid en dagelijks leven", "De grote wending gezien door Grote-Gelukscycli",
      "De stroom van de komende jaarcyclus", "De keuzes die voor je liggen",
    ],
    extraChapterTitle: (index) => `Levenshoofdstuk ${index + 1}`,
    loadingMessages: [
      "We herbouwen je geboortehoroscoop aan de hand van je geboortejaar, -maand, -dag en -tijd.",
      "We volgen de balans van de Vijf Elementen en de positie van de Tien Goden rond je Dagheer.",
      "We zoeken waar je vorige Grote-Gelukscycli de komende jaarcycli ontmoeten.",
      "We volgen de levenstextuur die over je geboortehoroscoop stroomt.",
      "We luisteren stil naar de stemmen van je Nuttige God en je Ongunstige God.",
      "Nog even geduld — je levenskaart komt tot stand.",
    ],
    heroJourneyPoints: [
      "We volgen de balans van je Dagheer en de Vijf Elementen om de grote stroom van je leven te lezen.",
      "We verlichten de tijdstextuur die je geboortehoroscoop verbindt met de keuzes die je vandaag maakt.",
      "De keerpunten geopend door Grote-Geluks- en jaarcycli, en het middelpunt dat je op lange termijn moet vasthouden, komen stil tot uiting.",
    ],
    gatePreparingTitle: "Voorbereiding van de Poort van het Lot",
    gatePreparingMessage: "De eerste poort van je geboortehoroscoop wordt geopend.",
    gateOpenedTitle: "De Poort van het Lot is geopend",
    gateOpenedMessage: "De grote stroom van je leven rijst op boven je geboortehoroscoop.",
    gateFailedTitle: "De Poort van het Lot is niet geopend",
    resultOpenedNotice: "Je Levenslotsbestemming is stil ontvouwen.",
    longGenerationNotice: "We ronden de lange lezing nog af. Je kunt deze pagina sluiten en hetzelfde consult later opnieuw openen.",
    pollTimeoutNotice: "We polijsten de lezing nog wat verder. Ververs over een moment om verder te controleren.",
    waveProgressNotice: (completed, total) => `Je Levenslotsbestemming is compleet tot hoofdstuk ${completed} van ${total}.`,
    pdfNoSectionsError: "Geen inhoud gevonden om als PDF op te slaan",
    pdfCanvasError: "Aanmaken van PDF-canvas mislukt",
    pdfCaptureError: "PDF-opname mislukt",
    pdfSaveErrorMessage: "Er is een probleem opgetreden bij het opslaan van de PDF. Probeer het later opnieuw.",
    pdfFileFallback: "levenslotsbestemming",
    validationGenderRequired: "Selecteer een geslacht.",
    validationGenderUnknownWarn: "Selecteer een geslacht om de Grote-Gelukscyclusstroom nauwkeurig te berekenen.",
    validationBirthDateInvalid: "Controleer je geboortedatum.",
    validationBirthDateRange: "Voer een geboortedatum in tussen 1900 en 2100.",
    validationBirthTimeInvalid: "Controleer je geboortetijd.",
    statusCheckingText: "De poort van het lot wordt geopend.",
    statusGeneratingText: "Je levenskaart ontvouwt zich.",
    statusCompletedText: "Je Levenslotsbestemming is geopend.",
    formKicker: "Levenslotsbestemming Saju",
    profileLoadAria: "Geboortegegevens laden vanuit je profielkaart",
    profileLoadCta: "Laden vanuit profielkaart",
    formHeading: "De Grote Stroom van het Leven Verlicht door Saju-Numerologie",
    formDesc: "De stroom van je geboortehoroscoop en Grote-Geluks- en jaarcycli volgend, bekijken we stil het pad dat je hebt afgelegd en de scènes die voor je liggen.",
    heroImageAlt: "Overzicht van de Levenslotsbestemming",
    nameLabel: "Naam",
    namePlaceholder: "Naam of bijnaam",
    genderLabel: "Geslacht",
    genderFemale: "Vrouw",
    genderMale: "Man",
    birthDateLabel: "Geboortedatum",
    birthTimeLabel: "Geboortetijd",
    calendarSolarLabel: "Zonnekalender",
    calendarLunarLabel: "Maankalender",
    birthTimeUnknownLabel: "Ik ken mijn geboortetijd niet",
    submitCheckingLabel: "De poort van het lot wordt geopend",
    submitGeneratingLabel: "Je levenskaart wordt getekend",
    submitIdleLabel: "Ontvouw je lot",
    resetCta: "Nieuw consult openen",
    pdfSavingLabel: "PDF opslaan",
    pdfSaveLabel: "PDF opslaan",
    resultKicker: "De Grote Stroom Gelezen door Saju-Numerologie",
    coreSummaryFallback: "De centrale stroom van je leven komt tot uiting.",
    neededBalancePrefix: "Aan te vullen balans: ",
    neededBalanceFallback: "Dagelijks ritme en volgorde van keuzes",
    expertReadingsHeading: "Een Diepgaande Lezing van je Geboortehoroscoop",
    expertReadingFallbackTitle: (index) => `Diepgaande lezing ${index + 1}`,
    idleGeneratingBadge: "Je levenskaart wordt getekend",
    idleBadgeDefault: "Levenslotsbestemming expertconsult",
    idleHeadingDefault: "De rivier van het leven onthult langzaam zijn richting, je geboortehoroscoop volgend.",
    idleDescDefault: "Langs de tijdlijn die je geboorte, de keuzes van vandaag en de komende keerpunten verbindt, ontvouwen we je Levenslotsbestemming.",
    generatingNote: "Yeoni volgt de textuur van je geboortehoroscoop en weeft je verhaal hoofdstuk voor hoofdstuk.",
    timelineSvgAriaLabel: "Een gouden levenstraject dat van de geboorte via het heden naar de toekomst stroomt",
  },
  ms: {
    featureTitle: "Perundingan pakar Takdir Kehidupan",
    fallbackResultTitle: "Perundingan Takdir Kehidupan",
    fallbackSubtitle: "Hala tuju besar kehidupan yang dibaca melalui carta kelahiran dan aliran masa",
    priceNotFoundMessage: "Kami tidak dapat mengesahkan maklumat harga. Sila cuba lagi sebentar lagi.",
    paymentVerifyFailedMessage: "Proses membuka Takdir Kehidupan anda belum selesai.",
    paymentCancelledMessage: "Pilihan telah dibatalkan.",
    loginRequiredMessage: "Log masuk untuk membuka Takdir Kehidupan anda.",
    openFailedMessage: "Kami tidak dapat membuka Takdir Kehidupan anda.",
    genericFallbackMessage: "Kami tidak dapat membuka perundingan.",
    storedResultLoadFailedMessage: "Kami tidak dapat memuatkan perundingan tersimpan anda.",
    resultLoadFailedMessage: "Kami tidak dapat memuatkan perundingan.",
    fallbackChapters: [
      "Teras carta kelahiran anda", "Sifat watak dan minda anda", "Hala tuju bakat dan kerjaya", "Asas kekayaan dan kehidupan harian",
      "Aliran cinta dan ikatan", "Bab hubungan dan keluarga", "Rentak kesihatan dan kehidupan harian", "Titik perubahan besar yang dilihat melalui kitaran Nasib Besar",
      "Aliran kitaran tahunan yang akan datang", "Pilihan yang menanti di hadapan",
    ],
    extraChapterTitle: (index) => `Bab kehidupan ${index + 1}`,
    loadingMessages: [
      "Kami sedang membina semula carta kelahiran anda daripada tahun, bulan, hari dan masa kelahiran anda.",
      "Kami sedang menjejaki keseimbangan Lima Elemen dan kedudukan Sepuluh Dewa di sekitar Tuan Hari anda.",
      "Kami sedang mencari titik pertemuan kitaran Nasib Besar lalu dengan kitaran tahunan yang akan datang.",
      "Kami sedang mengikuti tekstur kehidupan yang mengalir pada carta kelahiran anda.",
      "Kami sedang mendengar dengan tenang suara Dewa Berguna dan Dewa Bertentangan anda.",
      "Tunggu sebentar lagi, peta kehidupan anda sedang disempurnakan.",
    ],
    heroJourneyPoints: [
      "Kami menjejaki keseimbangan Tuan Hari dan Lima Elemen untuk membaca aliran besar kehidupan anda.",
      "Kami menerangi tekstur masa yang menghubungkan carta kelahiran anda dengan pilihan yang anda buat hari ini.",
      "Titik perubahan yang dibuka oleh kitaran Nasib Besar dan tahunan, serta teras yang perlu anda pegang dalam jangka panjang, muncul dengan tenang.",
    ],
    gatePreparingTitle: "Menyediakan Pintu Takdir",
    gatePreparingMessage: "Membuka pintu pertama carta kelahiran anda.",
    gateOpenedTitle: "Pintu Takdir Telah Terbuka",
    gateOpenedMessage: "Aliran besar kehidupan anda sedang muncul di atas carta kelahiran anda.",
    gateFailedTitle: "Pintu Takdir Tidak Terbuka",
    resultOpenedNotice: "Takdir Kehidupan anda telah terbuka dengan tenang.",
    longGenerationNotice: "Kami masih menyelesaikan bacaan panjang. Anda boleh menutup halaman ini dan membuka semula perundingan yang sama kemudian.",
    pollTimeoutNotice: "Kami sedang memperhalusi bacaan sedikit lagi. Muat semula sebentar lagi untuk terus menyemak.",
    waveProgressNotice: (completed, total) => `Takdir Kehidupan anda lengkap sehingga bab ${completed} daripada ${total}.`,
    pdfNoSectionsError: "Tiada kandungan ditemui untuk disimpan sebagai PDF",
    pdfCanvasError: "Gagal mencipta kanvas PDF",
    pdfCaptureError: "Gagal menangkap PDF",
    pdfSaveErrorMessage: "Masalah berlaku semasa menyimpan PDF. Sila cuba lagi sebentar lagi.",
    pdfFileFallback: "takdir-kehidupan",
    validationGenderRequired: "Sila pilih jantina.",
    validationGenderUnknownWarn: "Sila pilih jantina untuk mengira aliran kitaran Nasib Besar dengan tepat.",
    validationBirthDateInvalid: "Sila semak tarikh lahir anda.",
    validationBirthDateRange: "Sila masukkan tarikh lahir antara tahun 1900 hingga 2100.",
    validationBirthTimeInvalid: "Sila semak masa lahir anda.",
    statusCheckingText: "Membuka pintu takdir.",
    statusGeneratingText: "Peta kehidupan anda sedang terbuka.",
    statusCompletedText: "Takdir Kehidupan anda telah terbuka.",
    formKicker: "Saju Takdir Kehidupan",
    profileLoadAria: "Muatkan maklumat kelahiran daripada kad profil",
    profileLoadCta: "Muatkan daripada kad profil",
    formHeading: "Aliran Besar Kehidupan Diterangi oleh Numerologi Saju",
    formDesc: "Mengikuti aliran carta kelahiran anda dan kitaran Nasib Besar serta tahunan, kami meneliti dengan tenang laluan yang telah anda tempuh dan babak yang akan menanti.",
    heroImageAlt: "Gambaran Keseluruhan Takdir Kehidupan",
    nameLabel: "Nama",
    namePlaceholder: "Nama atau nama panggilan",
    genderLabel: "Jantina",
    genderFemale: "Perempuan",
    genderMale: "Lelaki",
    birthDateLabel: "Tarikh lahir",
    birthTimeLabel: "Masa lahir",
    calendarSolarLabel: "Suria",
    calendarLunarLabel: "Lunar",
    birthTimeUnknownLabel: "Saya tidak tahu masa lahir saya",
    submitCheckingLabel: "Membuka pintu takdir",
    submitGeneratingLabel: "Melukis peta kehidupan anda",
    submitIdleLabel: "Bukakan takdir anda",
    resetCta: "Buka perundingan baharu",
    pdfSavingLabel: "Menyimpan PDF",
    pdfSaveLabel: "Simpan PDF",
    resultKicker: "Aliran Besar Dibaca Melalui Numerologi Saju",
    coreSummaryFallback: "Aliran teras kehidupan anda sedang muncul.",
    neededBalancePrefix: "Keseimbangan untuk dilengkapi: ",
    neededBalanceFallback: "Rentak harian dan susunan pilihan",
    expertReadingsHeading: "Bacaan Mendalam Carta Kelahiran Anda",
    expertReadingFallbackTitle: (index) => `Bacaan mendalam ${index + 1}`,
    idleGeneratingBadge: "Melukis peta kehidupan anda",
    idleBadgeDefault: "Perundingan pakar Takdir Kehidupan",
    idleHeadingDefault: "Sungai kehidupan perlahan-lahan mendedahkan hala tujunya, mengikut carta kelahiran anda.",
    idleDescDefault: "Sepanjang garis masa yang menghubungkan kelahiran anda, pilihan hari ini, dan titik perubahan yang menanti, kami membuka Takdir Kehidupan anda.",
    generatingNote: "Yeoni sedang mengikuti tekstur carta kelahiran anda, menganyam kisah anda satu bab demi satu bab.",
    timelineSvgAriaLabel: "Trajektori kehidupan keemasan yang mengalir dari kelahiran melalui masa kini ke masa depan",
  },
};

function getPremiumSalesCopy(locale: LoadingLocale): PremiumSalesCopy {
  return PREMIUM_SALES_COPY[locale] || PREMIUM_SALES_EN;
}

function usePremiumSalesCopy(): PremiumSalesCopy {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    window.addEventListener("languagechange", sync);
    window.addEventListener("cd:locale-ready", sync);
    return () => {
      window.removeEventListener("languagechange", sync);
      window.removeEventListener("cd:locale-ready", sync);
    };
  }, []);
  return getPremiumSalesCopy(locale);
}

function applyProfileSeedToForm(form: LifeFortuneForm, profile: AiPrefillSeed): LifeFortuneForm {
  if (!profile.name && !profile.gender && !profile.birthDate && !profile.birthTime && !profile.calendarType && profile.birthTimeUnknown === undefined) {
    return form;
  }
  const gender: GenderType = profile.gender === "male" || profile.gender === "female" ? profile.gender : form.gender;
  return {
    ...form,
    name: profile.name || form.name,
    gender,
    birthDate: profile.birthDate || form.birthDate,
    birthTimeUnknown: profile.birthTimeUnknown ?? form.birthTimeUnknown,
    birthTime: profile.birthTimeUnknown === true ? "" : profile.birthTime || form.birthTime,
    calendarType: profile.calendarType || form.calendarType,
  };
}

function buildInitialForm(): LifeFortuneForm {
  return applyProfileSeedToForm(initialForm, readAiProfileSeed());
}

function toText(value: unknown) {
  return String(value || "").trim();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function toNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function buildAttemptId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `life-fortune:${crypto.randomUUID()}`;
  }
  return `life-fortune:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 10)}`;
}

function buildConsultationPayload(form: LifeFortuneForm, requestId: string) {
  return {
    serviceType: FEATURE_KEY,
    featureKey: FEATURE_KEY,
    consultationType: CONSULTATION_TYPE,
    focusArea: "overall",
    topic: TOPIC,
    consultationTopic: TOPIC,
    userName: form.name.trim(),
    name: form.name.trim(),
    gender: form.gender,
    birthDate: form.birthDate,
    birthTime: form.birthTimeUnknown ? "" : form.birthTime,
    birthTimeUnknown: form.birthTimeUnknown,
    calendarType: form.calendarType,
    locale: detectLocale(),
    requestId,
    idempotencyKey: requestId,
  };
}

async function postApi<T>(
  path: string,
  body: Record<string, unknown>,
  idempotencyKey: string,
  copy: PremiumSalesCopy,
  options: { allowExpectedReasons?: string[] } = {},
): Promise<T> {
  const response = await authFetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  }, { retryOn401: false });
  const payload = await response.json().catch(() => ({}));
  const reason = toText(payload?.reason);
  if (!response.ok && !options.allowExpectedReasons?.includes(reason)) {
    throw new Error(toText(payload?.message) || copy.genericFallbackMessage);
  }
  return payload as T;
}

function postPrepare(body: Record<string, unknown>, idempotencyKey: string, copy: PremiumSalesCopy) {
  return postApi<PrepareResult>("/api/life-book-ai/prepare", body, idempotencyKey, copy, {
    allowExpectedReasons: ["PAYMENT_REQUIRED", "LOGIN_REQUIRED"],
  });
}

async function fetchStoredResult(attemptId: string, copy: PremiumSalesCopy): Promise<ConsultationResult | null> {
  const response = await authFetch(`/api/life-book-ai/result?attemptId=${encodeURIComponent(attemptId)}`, {
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as ConsultationResult;
  if (response.status === 404) return null;
  if (!response.ok && response.status !== 202) {
    throw new Error(toText(payload.message) || copy.storedResultLoadFailedMessage);
  }
  return payload;
}

function buildBillingGateInput(paymentPayload: PaymentPayload, requestId: string, copy: PremiumSalesCopy) {
  const runtimeGate = asRecord(paymentPayload.runtimeGate);
  const inputHash = toText(runtimeGate.inputHash ?? paymentPayload.inputHash);
  const cost = toNumber(runtimeGate.cost ?? runtimeGate.coinPrice ?? paymentPayload.cost ?? paymentPayload.coinPrice, 0);
  const amountKRW = toNumber(runtimeGate.amountKRW ?? runtimeGate.amountKrw ?? paymentPayload.amountKRW ?? paymentPayload.amountKrw ?? paymentPayload.paymentAmount, 0);
  const membershipCreditCost = toNumber(runtimeGate.membershipCreditCost ?? paymentPayload.membershipCreditCost, 0);
  if (cost <= 0 || amountKRW <= 0 || membershipCreditCost <= 0) {
    throw new Error(copy.priceNotFoundMessage);
  }
  return {
    categoryKey: toText(runtimeGate.categoryKey ?? paymentPayload.categoryKey) || "premium-consultation",
    subFeatureKey: toText(runtimeGate.subFeatureKey ?? paymentPayload.subFeatureKey) || FEATURE_KEY,
    featureKey: toText(runtimeGate.featureKey ?? paymentPayload.featureKey) || FEATURE_KEY,
    reason: toText(runtimeGate.reason ?? paymentPayload.reason) || copy.featureTitle,
    productId: toText(runtimeGate.productId ?? paymentPayload.productId) || "life-book-ai",
    productType: toText(runtimeGate.productType ?? paymentPayload.productType) || "life-book-ai",
    serviceType: toText(runtimeGate.serviceType ?? paymentPayload.serviceType) || FEATURE_KEY,
    deferUsage: true,
    usagePolicy: "apply_after_success",
    executionKey: `life-fortune:${requestId}`,
    requestId,
    idempotencyKey: requestId,
    payloadHash: inputHash,
    cost,
    coinPrice: cost,
    amountKRW,
    amountKrw: amountKRW,
    paymentAmount: amountKRW,
    membershipCreditCost,
    consultationType: CONSULTATION_TYPE,
  };
}

async function openPaidGate(paymentPayload: PaymentPayload, requestId: string, copy: PremiumSalesCopy) {
  const runtimeGate = asRecord(paymentPayload.runtimeGate);
  const gate = await runBillingCoinGate(buildBillingGateInput(paymentPayload, requestId, copy));
  if (!gate.ok || !gate.data) {
    const code = toText(gate.error?.code).toUpperCase();
    if (code === "AUTH_REQUIRED" || code === "LOGIN_REQUIRED") throw new Error(copy.loginRequiredMessage);
    if (code === "PAYMENT_CANCELLED" || code === "CANCELLED") throw new Error(copy.paymentCancelledMessage);
    throw new Error(copy.paymentVerifyFailedMessage);
  }
  const record = asRecord(gate.data);
  return {
    billingGate: record,
    consume: asRecord(record.consume),
    accessGrant: asRecord(record.accessGrant || record.accessGateResult || record.licensePass || record.membershipPass),
    payment: asRecord(record.payment),
    pricing: asRecord(record.pricing),
    requestId,
    idempotencyKey: requestId,
    inputHash: toText(runtimeGate.inputHash ?? paymentPayload.inputHash),
    consultationType: CONSULTATION_TYPE,
    orderName: copy.featureTitle,
  };
}

function getAssistantContent(result: ConsultationResult | null) {
  return result?.messages?.find((message) => message.role === "assistant")?.content?.trim() || "";
}

function extractJsonReport(content: string): LifeFortuneReport | null {
  const raw = content.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as LifeFortuneReport;
  } catch {
    return null;
  }
}

function splitMarkdownChapters(content: string, copy: PremiumSalesCopy): LifeFortuneChapter[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const chapters: LifeFortuneChapter[] = [];
  let current: LifeFortuneChapter | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const heading = line.match(/^#{2,4}\s+(.+)$/) || line.match(/^제\s*\d{1,2}\s*장[.)]?\s*(.+)$/);
    if (heading) {
      if (current?.content?.trim()) chapters.push({ ...current, content: current.content.trim() });
      current = { chapterNumber: chapters.length + 1, title: toText(heading[1]) || copy.fallbackChapters[chapters.length], content: "" };
      continue;
    }
    if (!current && line) current = { chapterNumber: 1, title: copy.fallbackChapters[0], content: "" };
    if (current) current.content = `${current.content || ""}${current.content ? "\n" : ""}${line}`;
  }

  const trailingChapter = current as LifeFortuneChapter | null;
  if (trailingChapter?.content?.trim()) chapters.push({ ...trailingChapter, content: trailingChapter.content.trim() });
  return chapters.length >= 3 ? chapters : content.split(/\n{2,}/).map((paragraph, index) => ({
    chapterNumber: index + 1,
    title: copy.fallbackChapters[index] || copy.extraChapterTitle(index),
    content: paragraph.trim(),
  })).filter((chapter) => chapter.content);
}

function buildReport(result: ConsultationResult | null, copy: PremiumSalesCopy) {
  const content = getAssistantContent(result);
  const parsed = result?.reportJson || extractJsonReport(content);
  const chapters = parsed?.chapters?.length
    ? parsed.chapters.map((chapter, index) => ({
      ...chapter,
      chapterNumber: chapter.chapterNumber || index + 1,
      title: chapter.title || copy.fallbackChapters[index] || copy.extraChapterTitle(index),
      content: chapter.content || chapter.summary || "",
    }))
    : splitMarkdownChapters(content, copy);

  return {
    title: parsed?.title || result?.title || copy.fallbackResultTitle,
    subtitle: parsed?.subtitle || copy.fallbackSubtitle,
    coreSummary: parsed?.coreSummary || null,
    chapters,
    expertReadings: Array.isArray(parsed?.expertReadings)
      ? parsed.expertReadings.filter((reading) => toText(reading?.title || reading?.content))
      : [],
    finalMessage: parsed?.finalMessage || "",
  };
}

function compactLines(value: string) {
  return value.split(/\n+/).map((line) => line.trim()).filter(Boolean);
}

function validateForm(form: LifeFortuneForm, copy: PremiumSalesCopy) {
  if (!form.gender) return copy.validationGenderRequired;
  if (form.gender === "unknown") return copy.validationGenderUnknownWarn;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.birthDate)) return copy.validationBirthDateInvalid;
  if (form.birthDate < MIN_BIRTH_DATE || form.birthDate > MAX_BIRTH_DATE) return copy.validationBirthDateRange;
  if (!form.birthTimeUnknown && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(form.birthTime)) return copy.validationBirthTimeInvalid;
  return "";
}

function statusText(status: GenerationStatus, copy: PremiumSalesCopy) {
  if (status === "checking" || status === "payment") return copy.statusCheckingText;
  if (status === "generating") return copy.statusGeneratingText;
  if (status === "completed") return copy.statusCompletedText;
  return "";
}

function buildSafeFileSegment(value: string, copy: PremiumSalesCopy) {
  return (value || copy.pdfFileFallback)
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 60);
}

export default function PremiumSalesContent() {
  const copy = usePremiumSalesCopy();
  const [form, setForm] = useState<LifeFortuneForm>(buildInitialForm);
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [attemptId, setAttemptId] = useState("");
  const [result, setResult] = useState<ConsultationResult | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [progressTick, setProgressTick] = useState(0);
  const pollTimerRef = useRef<number | null>(null);
  const resultDocumentRef = useRef<HTMLElement | null>(null);
  const startLockRef = useRef(false);
  const { seed: profileSeed, seedVersion, reload: reloadProfileSeed } = useAiProfileSeed();
  const formTouchedRef = useRef(false);

  // 서버에서 프로필 카드가 뒤늦게 도착해도, 사용자가 입력을 시작하기 전이라면 폼에 반영
  useEffect(() => {
    if (!profileSeed) return;
    setForm((prev) => (formTouchedRef.current ? prev : applyProfileSeedToForm(prev, profileSeed)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedVersion]);

  const loadFormFromProfileCard = useCallback(() => {
    void reloadProfileSeed().then((seed) => {
      if (seed) setForm((prev) => applyProfileSeedToForm(prev, seed));
    });
  }, [reloadProfileSeed]);

  const isChecking = status === "checking" || status === "payment";
  const isGenerating = status === "generating";
  const isBusy = isChecking || isGenerating;
  const report = useMemo(() => buildReport(result, copy), [result, copy]);
  const activeLoadingIndex = isGenerating ? progressTick % copy.loadingMessages.length : 0;
  const progressPercent = status === "completed" ? 100 : isGenerating ? Math.min(94, 18 + progressTick * 6) : 0;

  const clearPollTimer = useCallback(() => {
    if (pollTimerRef.current) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isGenerating) return;
    const timer = window.setInterval(() => {
      setProgressTick((value) => value + 1);
    }, 3600);
    return () => window.clearInterval(timer);
  }, [isGenerating]);

  const updateForm = useCallback(<K extends keyof LifeFortuneForm>(key: K, value: LifeFortuneForm[K]) => {
    formTouchedRef.current = true;
    setForm((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "birthTimeUnknown" && value === true ? { birthTime: "" } : {}),
      ...(key === "birthTimeUnknown" && value === false && !prev.birthTime ? { birthTime: "12:00" } : {}),
    }));
  }, []);

  const pollResult = useCallback((nextAttemptId: string, startedAt = Date.now()) => {
    clearPollTimer();
    const elapsed = Date.now() - startedAt;
    const interval = elapsed >= LONG_GENERATION_NOTICE_MS ? EXTENDED_POLL_INTERVAL_MS : POLL_INTERVAL_MS;
    pollTimerRef.current = window.setTimeout(async () => {
      try {
        const payload = await fetchStoredResult(nextAttemptId, copy);
        if (payload?.status === "completed") {
          setResult(payload);
          setStatus("completed");
          setNotice(copy.resultOpenedNotice);
          clearPollTimer();
          return;
        }
        if (Date.now() - startedAt < MAX_POLL_DURATION_MS) {
          if (Date.now() - startedAt >= LONG_GENERATION_NOTICE_MS) {
            setNotice(copy.longGenerationNotice);
          }
          pollResult(nextAttemptId, startedAt);
          return;
        }
        setNotice(copy.pollTimeoutNotice);
      } catch (caught) {
        setError(friendlyErrorMessage(caught, copy.resultLoadFailedMessage));
        setStatus("error");
      }
    }, interval);
  }, [clearPollTimer, copy]);

  useEffect(() => {
    const storedAttemptId = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) || "" : "";
    if (!storedAttemptId) return;
    setAttemptId(storedAttemptId);
    fetchStoredResult(storedAttemptId, copy)
      .then((payload) => {
        if (!payload) return;
        setResult(payload);
        if (payload.status === "completed") {
          setStatus("completed");
        } else if (payload.status === "generating") {
          setStatus("generating");
          pollResult(storedAttemptId);
        }
      })
      .catch(() => {});
    return clearPollTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearPollTimer, pollResult]);

  async function startGeneration(payload: Record<string, unknown>, requestId: string, accessEvidence: Record<string, unknown>) {
    setStatus("generating");
    setProgressTick(0);
    setNotice("");

    // 🔴 워커는 한 요청에 한 웨이브(섹션 4개)만 돌린다 — 클라가 반복 호출해야 생성이 끝까지 간다.
    //    매 호출이 같은 requestId 를 쓰므로 중복 결제·중복 생성은 워커의 멱등 인덱스와 락이 막는다.
    for (let wave = 0; wave < MAX_GENERATE_WAVES; wave += 1) {
      const outcome = await runGenerateWave(payload, requestId, accessEvidence);
      if (outcome.status === "completed") {
        setResult(outcome.data as ConsultationResult);
        setStatus("completed");
        setNotice(copy.resultOpenedNotice);
        return;
      }
      if (outcome.status === "failed") {
        throw new Error(toText(outcome.message) || copy.openFailedMessage);
      }
      setResult(outcome.data as ConsultationResult);
      if (outcome.progress) {
        setNotice(copy.waveProgressNotice(outcome.progress.completed, outcome.progress.total));
      }
      if (outcome.httpStatus === 409) {
        await new Promise((resolve) => setTimeout(resolve, WAVE_LOCK_RETRY_DELAY_MS));
      }
    }
    // 상한을 다 써도 안 끝났으면 폴링이 이어받는다(서버가 stale 을 확정 실패로 승격한다).
    pollResult(requestId);
  }

  async function handleGenerateClick(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (startLockRef.current || isBusy) return;
    const validationMessage = validateForm(form, copy);
    if (validationMessage) {
      setError(validationMessage);
      setStatus("error");
      return;
    }

    startLockRef.current = true;
    const requestId = buildAttemptId();
    const payload = buildConsultationPayload(form, requestId);
    setAttemptId(requestId);
    setResult(null);
    setError("");
    setNotice("");
    setProgressTick(0);
    setStatus("checking");
    localStorage.setItem(STORAGE_KEY, requestId);
    beginPaidFeatureGateCheck({
      featureKey: FEATURE_KEY,
      requestId,
      title: copy.gatePreparingTitle,
      reason: copy.featureTitle,
      paymentMode: "MEMBERSHIP_PASS",
      message: copy.gatePreparingMessage,
    });

    try {
      const access = await postPrepare(payload, requestId, copy);
      let accessEvidence: Record<string, unknown>;

      if (access.ok === true) {
        completePaidFeatureGateCheck({
          featureKey: FEATURE_KEY,
          requestId,
          title: copy.gateOpenedTitle,
          reason: copy.featureTitle,
          paymentMode: "MEMBERSHIP_PASS",
          message: copy.gateOpenedMessage,
        });
        accessEvidence = { accessToken: access.accessToken };
      } else if (access.reason === "PAYMENT_REQUIRED" && access.paymentPayload) {
        setStatus("payment");
        accessEvidence = await openPaidGate(access.paymentPayload, requestId, copy);
        completePaidFeatureGateCheck({
          featureKey: FEATURE_KEY,
          requestId,
          title: copy.gateOpenedTitle,
          reason: copy.featureTitle,
          paymentMode: "MEMBERSHIP_PASS",
          message: copy.gateOpenedMessage,
        });
      } else if (access.reason === "LOGIN_REQUIRED") {
        throw new Error(access.message || copy.loginRequiredMessage);
      } else {
        throw new Error(access.message || copy.openFailedMessage);
      }

      await startGeneration(payload, requestId, accessEvidence);
    } catch (caught) {
      const message = friendlyErrorMessage(caught, copy.openFailedMessage);
      setError(message);
      setStatus("error");
      failPaidFeatureGateCheck({
        featureKey: FEATURE_KEY,
        requestId,
        title: copy.gateFailedTitle,
        reason: copy.featureTitle,
        paymentMode: "MEMBERSHIP_PASS",
        message,
        cancelled: message === copy.paymentCancelledMessage,
      });
    } finally {
      startLockRef.current = false;
    }
  }

  async function handleDownloadPdf() {
    if (!resultDocumentRef.current || pdfLoading) return;
    setPdfLoading(true);
    setError("");
    try {
      const [{ default: html2canvas }, jsPdfModule] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const JsPDF = jsPdfModule.default || jsPdfModule.jsPDF;
      const pdf = new JsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = pageHeight - margin * 2;
      const sections = Array.from(resultDocumentRef.current.querySelectorAll<HTMLElement>("[data-pdf-section]"));
      if (!sections.length) throw new Error(copy.pdfNoSectionsError);

      let hasPage = false;
      for (const section of sections) {
        const canvas = await html2canvas(section, {
          backgroundColor: "#100d0a",
          scale: Math.min(window.devicePixelRatio || 2, 2),
          useCORS: true,
          logging: false,
        });
        if (!canvas.width || !canvas.height) continue;
        const sliceHeightPx = Math.max(1, Math.floor((contentHeight * canvas.width) / contentWidth));
        for (let offsetY = 0; offsetY < canvas.height; offsetY += sliceHeightPx) {
          const sliceHeight = Math.min(sliceHeightPx, canvas.height - offsetY);
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceHeight;
          const context = sliceCanvas.getContext("2d");
          if (!context) throw new Error(copy.pdfCanvasError);
          context.drawImage(canvas, 0, offsetY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
          if (hasPage) pdf.addPage();
          hasPage = true;
          const sliceHeightMm = (sliceHeight * contentWidth) / canvas.width;
          pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", margin, margin, contentWidth, Math.min(contentHeight, sliceHeightMm));
        }
      }

      if (!hasPage) throw new Error(copy.pdfCaptureError);
      const stamp = new Date().toLocaleDateString(INTL_LOCALE_BY_LOADING_LOCALE[getCurrentLoadingLocale()]).replace(/\./g, "").replace(/\s+/g, "");
      pdf.save(`${buildSafeFileSegment(form.name || report.title, copy)}_${stamp}.pdf`);
    } catch {
      setError(copy.pdfSaveErrorMessage);
    } finally {
      setPdfLoading(false);
    }
  }

  function handleReset() {
    clearPollTimer();
    setStatus("idle");
    setNotice("");
    setError("");
    setResult(null);
    setAttemptId("");
    setProgressTick(0);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <main
      data-ui-marker="life-fortune-premium-ui-v20260703"
      className="relative isolate min-h-screen overflow-hidden bg-[#050607] text-[#f7efe2]"
      style={{ fontFamily: "CodeDestinyBody, CodeDestinyPremium, 'Noto Sans KR', sans-serif" }}
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <img
          src={LIFE_FORTUNE_IMAGE_SRC}
          alt=""
          className="h-full w-full object-cover opacity-28"
          aria-hidden="true"
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(242,207,130,0.18),transparent_32%),linear-gradient(115deg,rgba(5,6,7,0.94)_0%,rgba(16,13,10,0.86)_48%,rgba(6,37,27,0.82)_100%)]" />
      </div>
      <section className="mx-auto grid min-h-screen w-full max-w-7xl gap-6 px-4 py-6 md:grid-cols-[minmax(320px,430px)_1fr] md:px-6 lg:px-8">
        <form onSubmit={handleGenerateClick} className="self-start rounded-lg border border-[#d8b56d]/25 bg-[#12172b]/90 p-5 shadow-2xl shadow-black/30 backdrop-blur md:sticky md:top-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[#f2cf82]">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
              <p className="text-sm font-bold">{copy.formKicker}</p>
            </div>
            <button
              type="button"
              onClick={loadFormFromProfileCard}
              className="shrink-0 rounded-lg border border-[#f2cf82]/35 bg-[#f2cf82]/10 px-3 py-2 text-xs font-bold text-[#f2cf82] transition hover:bg-[#f2cf82]/20"
              aria-label={copy.profileLoadAria}
            >
              {copy.profileLoadCta}
            </button>
          </div>
          <h1 className="mt-4 text-3xl font-black leading-tight md:text-4xl" style={{ fontFamily: "CodeDestinyDisplay, CodeDestinyPremium, serif" }}>
            {copy.formHeading}
          </h1>
          <p className="mt-3 text-sm leading-7 text-[#dcc7a3]">
            {copy.formDesc}
          </p>
          <div className="mt-5 overflow-hidden rounded-lg border border-[#d8b56d]/25 bg-black/30">
            <img
              src={LIFE_FORTUNE_IMAGE_SRC}
              alt={copy.heroImageAlt}
              className="h-52 w-full object-cover"
              loading="eager"
              decoding="async"
              onError={(event) => { event.currentTarget.style.display = "none"; }}
            />
          </div>

          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-bold text-[#f4dfb7]">
              {copy.nameLabel}
              <input
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
                className="min-h-11 border border-[#d8b56d]/25 bg-black/25 px-3 text-base text-[#fff8ed] outline-none transition focus:border-[#f2cf82]"
                placeholder={copy.namePlaceholder}
                maxLength={40}
              />
            </label>

            <div className="grid gap-2 text-sm font-bold text-[#f4dfb7]">
              {copy.genderLabel}
              <div className="grid grid-cols-3 gap-2">
                {[
                  ["female", copy.genderFemale],
                  ["male", copy.genderMale],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateForm("gender", value as GenderType)}
                    className={`min-h-11 border px-2 text-sm font-black transition ${form.gender === value ? "border-[#f2cf82] bg-[#f2cf82] text-[#171007]" : "border-[#d8b56d]/25 bg-black/20 text-[#f4dfb7] hover:border-[#f2cf82]/60"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-2 text-sm font-bold text-[#f4dfb7]">
                {copy.birthDateLabel}
                <input {...birthDateTextInputProps(form.birthDate, (nextBirthDate) => updateForm("birthDate", nextBirthDate))} min={MIN_BIRTH_DATE} max={MAX_BIRTH_DATE} className="min-h-11 border border-[#d8b56d]/25 bg-black/25 px-3 text-base text-[#fff8ed] outline-none transition focus:border-[#f2cf82]" />
              </label>
              <label className="grid gap-2 text-sm font-bold text-[#f4dfb7]">
                {copy.birthTimeLabel}
                <input
                  type="time"
                  value={form.birthTime}
                  onChange={(event) => updateForm("birthTime", event.target.value)}
                  disabled={form.birthTimeUnknown}
                  className="min-h-11 border border-[#d8b56d]/25 bg-black/25 px-3 text-base text-[#fff8ed] outline-none transition focus:border-[#f2cf82] disabled:opacity-45"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                ["solar", copy.calendarSolarLabel],
                ["lunar", copy.calendarLunarLabel],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateForm("calendarType", value as CalendarType)}
                  className={`min-h-11 border px-3 text-sm font-black transition ${form.calendarType === value ? "border-[#a7f3d0] bg-[#a7f3d0] text-[#06251b]" : "border-[#d8b56d]/25 bg-black/20 text-[#f4dfb7] hover:border-[#a7f3d0]/60"}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <label className="flex min-h-11 items-center gap-3 border border-[#d8b56d]/25 bg-black/20 px-3 text-sm font-bold text-[#f4dfb7]">
              <input
                type="checkbox"
                checked={form.birthTimeUnknown}
                onChange={(event) => updateForm("birthTimeUnknown", event.target.checked)}
                className="h-4 w-4 accent-[#f2cf82]"
              />
              {copy.birthTimeUnknownLabel}
            </label>
          </div>

          {error && <p className="mt-4 border border-[#fb7185]/35 bg-[#7f1d1d]/25 p-3 text-sm leading-6 text-[#fecdd3]">{error}</p>}
          {notice && <p className="mt-4 border border-[#a7f3d0]/25 bg-[#063f31]/25 p-3 text-sm leading-6 text-[#c6f7e2]">{notice}</p>}

          <div className="mt-5 grid gap-2">
            <button
              type="submit"
              disabled={isBusy}
              className="group relative inline-flex min-h-12 items-center justify-center gap-2 overflow-hidden border border-[#ffe0a3] bg-gradient-to-r from-[#f2cf82] via-[#ffd98a] to-[#b88933] px-4 text-sm font-black text-[#171007] shadow-[0_0_28px_rgba(242,207,130,0.24)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-65 sm:text-base"
            >
              <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.36),transparent_34%)] opacity-0 transition duration-500 group-hover:opacity-40" aria-hidden="true" />
              {isBusy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <BookOpen className="h-5 w-5" aria-hidden="true" />}
              <span>{isChecking ? copy.submitCheckingLabel : isGenerating ? copy.submitGeneratingLabel : copy.submitIdleLabel}</span>
            </button>
            {attemptId && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex min-h-11 items-center justify-center gap-2 border border-[#d8b56d]/25 bg-black/20 px-4 text-sm font-bold text-[#f4dfb7] transition hover:border-[#f2cf82]/60"
              >
                <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                {copy.resetCta}
              </button>
            )}
          </div>

          <div className="mt-5 grid gap-2 text-xs leading-5 text-[#bda986]">
            {copy.heroJourneyPoints.map((point) => (
              <p key={point} className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0 text-[#a7f3d0]" aria-hidden="true" />
                <span>{point}</span>
              </p>
            ))}
          </div>

          {/* 받는 것을 숫자로 못박는다. 값은 서버가 실제로 강제하는 계약이며(worker/routes/life-book-ai.js
              의 LIFE_FORTUNE_* 상수), 미달이면 생성이 실패로 돌아 재시도·환불 경로를 탄다. */}
          <DeliverableSpec
            keyPrefix="premiumUnlock.deliverable"
            className="mt-5 grid gap-3 border border-[#d8b56d]/20 bg-black/20 p-4 sm:grid-cols-3"
            titleClassName="text-xs font-black tracking-wide text-[#f2cf82]"
            labelClassName="text-[11px] font-bold text-[#bda986]"
            valueClassName="mt-1 text-sm font-black leading-6 text-[#f4dfb7]"
            noteClassName="text-[11px] leading-5 text-[#bda986]"
          />
        </form>

        <section className="min-h-[70vh] rounded-lg border border-[#d8b56d]/20 bg-[#100d0a]/90 p-4 shadow-2xl shadow-black/25 backdrop-blur md:p-6">
          {status === "completed" && result ? (
            <>
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={pdfLoading || !report.chapters.length}
                className="inline-flex min-h-11 items-center justify-center gap-2 border border-[#f2cf82]/50 bg-[#f2cf82]/10 px-4 text-sm font-black text-[#f8dda0] transition hover:border-[#f2cf82] hover:bg-[#f2cf82]/18 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
                {pdfLoading ? copy.pdfSavingLabel : copy.pdfSaveLabel}
              </button>
            </div>
            <article ref={resultDocumentRef} className="grid gap-5">
              <header className="border border-[#d8b56d]/20 bg-black/20 p-5" data-pdf-section>
                <div className="mb-5 overflow-hidden border border-[#d8b56d]/20 bg-black/30">
                  <img
                    src={LIFE_FORTUNE_IMAGE_SRC}
                    alt={copy.heroImageAlt}
                    className="h-56 w-full object-cover"
                    loading="lazy"
                    decoding="async"
                    onError={(event) => { event.currentTarget.style.display = "none"; }}
                  />
                </div>
                <p className="text-sm font-bold text-[#f2cf82]">{copy.resultKicker}</p>
                <h2 className="mt-3 text-3xl font-black leading-tight md:text-5xl">{report.title}</h2>
                <p className="mt-3 max-w-3xl text-base leading-7 text-[#dcc7a3]">{report.subtitle}</p>
                {report.coreSummary && (
                  <div className="mt-5 grid gap-2 text-sm text-[#f4dfb7] md:grid-cols-2">
                    <p className="border border-[#d8b56d]/15 bg-black/20 p-3">{report.coreSummary.oneLine || copy.coreSummaryFallback}</p>
                    <p className="border border-[#d8b56d]/15 bg-black/20 p-3">{copy.neededBalancePrefix}{report.coreSummary.neededBalance || copy.neededBalanceFallback}</p>
                  </div>
                )}
              </header>

              <div className="grid gap-4">
                {report.chapters.map((chapter, index) => (
                  <section key={`${chapter.title}-${index}`} className="border border-[#d8b56d]/20 bg-[#17120d] p-5" data-pdf-section>
                    <div className="flex items-start gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center border border-[#f2cf82]/40 bg-black/20 text-sm font-black text-[#f2cf82]">
                        {String(chapter.chapterNumber || index + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <h3 className="text-xl font-black text-[#fff8ed]">{chapter.title}</h3>
                        {chapter.summary && <p className="mt-2 text-sm leading-6 text-[#f2dcae]">{chapter.summary}</p>}
                      </div>
                    </div>
                    <div className="mt-4 space-y-3 text-[15px] leading-8 text-[#f4e6cb]">
                      {compactLines(chapter.content || "").map((line, lineIndex) => (
                        <p key={lineIndex}>{line.replace(/^[-*]\s*/, "")}</p>
                      ))}
                    </div>
                    {!!chapter.advice?.length && (
                      <div className="mt-4 grid gap-2">
                        {chapter.advice.map((advice, adviceIndex) => (
                          <p key={adviceIndex} className="border border-[#a7f3d0]/20 bg-[#052e24]/25 p-3 text-sm leading-6 text-[#d7fbe8]">{advice}</p>
                        ))}
                      </div>
                    )}
                  </section>
                ))}
              </div>

              {!!report.expertReadings.length && (
                <section className="border border-[#d8b56d]/20 bg-black/20 p-5" data-pdf-section>
                  <h3 className="text-xl font-black text-[#f2cf82]">{copy.expertReadingsHeading}</h3>
                  <div className="mt-4 grid gap-4">
                    {report.expertReadings.map((reading, index) => (
                      <article key={`${reading.title || "reading"}-${index}`} className="border border-[#d8b56d]/15 bg-[#17120d] p-4">
                        <h4 className="text-lg font-black text-[#fff8ed]">{reading.title || copy.expertReadingFallbackTitle(index)}</h4>
                        <div className="mt-3 space-y-3 text-[15px] leading-8 text-[#f4e6cb]">
                          {compactLines(reading.content || "").map((line, lineIndex) => (
                            <p key={lineIndex}>{line.replace(/^[-*]\s*/, "")}</p>
                          ))}
                        </div>
                        {!!reading.guidance?.length && (
                          <div className="mt-4 grid gap-2">
                            {reading.guidance.map((item, itemIndex) => (
                              <p key={itemIndex} className="border border-[#f2cf82]/20 bg-black/20 p-3 text-sm leading-6 text-[#f2dfba]">{item}</p>
                            ))}
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {report.finalMessage && (
                <footer className="border border-[#f2cf82]/25 bg-[#20160c] p-5 text-base leading-8 text-[#fff3d0]" data-pdf-section>
                  {report.finalMessage}
                </footer>
              )}
            </article>
            </>
          ) : (
            <div className="grid min-h-[70vh] content-center gap-5">
              <div className="relative min-h-[420px] overflow-hidden rounded-lg border border-[#d8b56d]/25 bg-[#080d20]">
                <img
                  src={LIFE_FORTUNE_IMAGE_SRC}
                  alt={copy.heroImageAlt}
                  className="absolute inset-0 h-full w-full object-cover opacity-35"
                  loading="eager"
                  decoding="async"
                  onError={(event) => { event.currentTarget.style.display = "none"; }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(6,11,31,0.94)_0%,rgba(18,23,43,0.74)_48%,rgba(83,55,18,0.46)_100%)]" />
                <svg
                  viewBox="0 0 900 440"
                  role="img"
                  aria-label={copy.timelineSvgAriaLabel}
                  className="absolute inset-0 h-full w-full"
                  preserveAspectRatio="xMidYMid slice"
                >
                  <defs>
                    <linearGradient id="lifeTimelineGold" x1="0" x2="1" y1="0" y2="0">
                      <stop offset="0%" stopColor="#8f6b2e" stopOpacity="0.35" />
                      <stop offset="42%" stopColor="#f2cf82" />
                      <stop offset="100%" stopColor="#fff1b8" stopOpacity="0.82" />
                    </linearGradient>
                    <filter id="lifeTimelineGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <path
                    d="M-40 340 C130 220 210 390 350 248 C470 126 560 302 700 178 C780 108 850 134 940 74"
                    fill="none"
                    stroke="#f2cf82"
                    strokeOpacity="0.16"
                    strokeWidth="18"
                  />
                  <path
                    className="life-timeline-draw"
                    d="M-40 340 C130 220 210 390 350 248 C470 126 560 302 700 178 C780 108 850 134 940 74"
                    fill="none"
                    filter="url(#lifeTimelineGlow)"
                    stroke="url(#lifeTimelineGold)"
                    strokeLinecap="round"
                    strokeWidth="3"
                  />
                  {[128, 350, 700, 842].map((cx, index) => (
                    <g key={cx} className="life-star-point" style={{ animationDelay: `${index * 0.42}s` }}>
                      <circle cx={cx} cy={[265, 248, 178, 102][index]} r="5" fill="#fff1b8" />
                      <circle cx={cx} cy={[265, 248, 178, 102][index]} r="14" fill="none" stroke="#f2cf82" strokeOpacity="0.28" />
                    </g>
                  ))}
                  <path d="M92 96h72M124 60v72M752 320h96M800 272v96" stroke="#f2cf82" strokeOpacity="0.22" strokeLinecap="round" />
                </svg>
                <div className="relative flex min-h-[420px] flex-col justify-end p-5 md:p-8">
                  <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#f2cf82]/35 bg-black/35 px-3 py-1 text-xs font-black text-[#f2cf82]">
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                    {isGenerating ? copy.idleGeneratingBadge : copy.idleBadgeDefault}
                  </div>
                  <h2 className="mt-4 max-w-2xl text-3xl font-black leading-tight md:text-5xl" style={{ fontFamily: "CodeDestinyDisplay, CodeDestinyPremium, serif" }}>
                    {isGenerating ? statusText(status, copy) : copy.idleHeadingDefault}
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[#f5dfba]">
                    {isGenerating
                      ? copy.loadingMessages[activeLoadingIndex]
                      : copy.idleDescDefault}
                  </p>
                </div>
              </div>

              {isGenerating ? (
                <div className="rounded-lg border border-[#d8b56d]/20 bg-black/25 p-5" aria-live="polite">
                  <div className="flex items-center justify-between gap-3 text-sm font-black text-[#f2cf82]">
                    <span key={activeLoadingIndex} className="life-message-fade">
                      {copy.loadingMessages[activeLoadingIndex]}
                    </span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#2a2118]">
                    <div className="h-full rounded-full bg-[#a7f3d0] transition-all duration-700" style={{ width: `${progressPercent}%` }} />
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[#f4dfb7]">{copy.generatingNote}</p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-3">
                  {copy.heroJourneyPoints.map((point, index) => (
                    <div key={point} className="rounded-lg border border-[#d8b56d]/20 bg-black/25 p-4 text-sm leading-6 text-[#e8d4b0]">
                      <p className="text-xs font-black text-[#f2cf82]">{String(index + 1).padStart(2, "0")}</p>
                      <p className="mt-2">{point}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </section>
      <style>{`
        .life-timeline-draw {
          stroke-dasharray: 1080;
          stroke-dashoffset: 1080;
          animation: lifeTimelineReveal 4.8s ease-out forwards;
        }

        .life-star-point {
          opacity: 0;
          animation: lifeStarRise 2.8s ease-out forwards;
        }

        .life-message-fade {
          display: inline-block;
          animation: lifeMessageFade 3.6s ease-in-out;
        }

        @keyframes lifeTimelineReveal {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes lifeStarRise {
          0% {
            opacity: 0;
            transform: translateY(8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes lifeMessageFade {
          0%,
          100% {
            opacity: 0.48;
          }
          18%,
          82% {
            opacity: 1;
          }
        }

        @supports (animation-timeline: view()) {
          .life-timeline-draw {
            animation-timeline: view();
            animation-range: entry 12% cover 58%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .life-timeline-draw,
          .life-star-point,
          .life-message-fade {
            animation: none;
            opacity: 1;
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </main>
  );
}
