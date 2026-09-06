"use client";

import { birthDateTextInputProps } from "@/lib/birthDateInputProps";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { readAiProfileSeed, type AiPrefillSeed } from "@/app/_lib/ai-prefill-seed";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";
import { PriceBadge } from "@/app/components/PriceBadge";
import { AlertCircle, CalendarDays, CheckCircle2, ExternalLink, Loader2, MapPin, Moon, RotateCcw, Sparkles, Stars, WalletCards } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import AnalysisBasisLoading from "@/components/fortune/AnalysisBasisLoading";
import { fetchAnalysisBasis, type AnalysisBasis } from "@/lib/fortune/analysis-basis";
import { isRetriableResultPollFailure, runAccessCheckWithTransientRetry } from "@/app/_lib/consultationResultPolling";
import { toDisplayText } from "@/lib/llm-text";
import {
  beginPaidFeatureGateCheck,
  completePaidFeatureGateCheck,
  failPaidFeatureGateCheck,
  holdPaidFeatureGateOpen,
  releasePaidFeatureGate,
  runBillingCoinGate,
  primePaymentEligibility,
} from "@/app/_lib/billing-client";
import { packPaidResumeArg, unpackPaidResumeArg, usePaidResume } from "@/app/hooks/usePaidResume";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

type AccessType = "pass" | "paid" | "subscription" | "admin";
type FlowPhase = "idle" | "access" | "payment" | "reading" | "ready";
type Message = { role: "user" | "assistant"; content: string; createdAt?: string };
type ChartPoint = { sign?: string; signKo?: string; degree?: number; house?: number | null };
type AstrologyChart = {
  sun?: ChartPoint | null;
  moon?: ChartPoint | null;
  ascendant?: ChartPoint | null;
  chartRuler?: string;
  consultationKeywords?: string[];
  planets?: Array<ChartPoint & { name: string; label?: string; retrograde?: boolean | null }>;
  houses?: Array<{ house: number; sign?: string; signKo?: string; planets?: string[] }>;
  majorAspects?: Array<{ planetA: string; aspect: string; planetB: string; orb?: number | null }>;
  transits?: { majorAspectsToNatal?: Array<{ transitPlanet: string; aspect: string; natalPlanet: string; orb?: number | null }> };
  birthTimeUnknown?: boolean;
};
type Consultation = {
  id: string;
  sessionId: string;
  accessType?: AccessType;
  status?: string;
  topic?: string;
  userQuestion?: string;
  astrologyChart?: AstrologyChart | null;
  chartHighlights?: {
    sun?: ChartPoint | null;
    moon?: ChartPoint | null;
    ascendant?: ChartPoint | null;
    chartRuler?: string;
    keywords?: string[];
  };
  messages: Message[];
};
type EnsureAccessResult =
  | { ok: true; accessToken: string; accessType: AccessType }
  | { ok: false; reason: "PAYMENT_REQUIRED"; paymentPayload: Record<string, unknown> }
  | { ok: false; reason: "LOGIN_REQUIRED"; message?: string }
  | { ok: false; reason: "INVALID_INPUT"; message: string }
  | { ok: false; reason?: string; message?: string };

type FormState = {
  name: string;
  gender: string;
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  placeKey: string;
  city: string;
  country: string;
  latitude: string;
  longitude: string;
  timezone: string;
  topic: string;
  userQuestion: string;
};

type AstrologyClientCopy = {
  featureTitle: string;
  topicLabel: Record<string, string>;
  placePresetLabel: Record<string, string>;
  errorText: Record<string, string>;
  progressSteps: Array<{ title: string; description: string }>;
  limitedFallback: string;
  phaseAccess: string;
  phasePayment: string;
  phaseReady: string;
  phaseIdle: string;
  passCheckTitle: string;
  passCheckCompleteTitle: string;
  passCheckCompleteMessage: string;
  passCheckFailedTitle: string;
  passCheckRetryTitle: string;
  resultOpenedNewTab: string;
  resultBlockedPopup: string;
  birthTimeUnknownNote: string;
  heroTitle: string;
  heroDescription: string;
  heroSteps: string[];
  profileLoadAria: string;
  profileLoadCta: string;
  birthInfoHeading: string;
  birthInfoDesc: string;
  nameOrNicknameLabel: string;
  namePlaceholder: string;
  genderLabel: string;
  genderSelectOption: string;
  genderFemale: string;
  genderMale: string;
  genderOther: string;
  birthDateLabel: string;
  birthTimeLabel: string;
  birthTimeUnknownLabel: string;
  birthPlaceHeading: string;
  birthPlaceDesc: string;
  quickSelectLabel: string;
  customInputOption: string;
  cityLabel: string;
  cityPlaceholder: string;
  countryLabel: string;
  countryPlaceholder: string;
  latitudeLabel: string;
  longitudeLabel: string;
  timezoneLabel: string;
  topicHeading: string;
  topicDesc: string;
  topicSelectLabel: string;
  questionHeading: string;
  questionDesc: string;
  questionLabel: string;
  questionPlaceholder: string;
  priceLabelPrefix: string;
  submitCta: string;
  resetCta: string;
  consultationFlowHeading: string;
  waitingRoomReadyHeading: string;
  waitingRoomIdleHeading: string;
  waitingRoomReadyDesc: string;
  waitingRoomIdleDesc: string;
  sunLabel: string;
  moonLabel: string;
  ascendantLabel: string;
  ascendantUnknownFallback: string;
  viewResultNewTabCta: string;
  retryCta: string;
  summaryCardEmptyFallback: string;
};

const ASTROLOGY_CLIENT_EN: AstrologyClientCopy = {
  featureTitle: "Astrology Expert Reading",
  topicLabel: {
    "전체 차트 해석": "Full Chart Reading",
    "타고난 성향": "Innate Nature",
    "인생의 방향성": "Life Direction",
    "직업/사업운": "Career/Business Luck",
    "재물운": "Wealth Luck",
    "연애/결혼운": "Love/Marriage Luck",
    "인간관계": "Relationships",
    "가족/부모운": "Family/Parents Luck",
    "건강/멘탈": "Health/Mental Wellbeing",
    "올해 운세": "This Year's Fortune",
    "현재 트랜짓 흐름": "Current Transit Flow",
    "이직/창업": "Career Change/Startup",
    "인생 전환기": "Life Turning Point",
    "현재 고민 상담": "Current Concern Consultation",
  },
  placePresetLabel: {
    seoul: "Seoul, South Korea",
    busan: "Busan, South Korea",
    tokyo: "Tokyo, Japan",
    singapore: "Singapore",
    "new-york": "New York, USA",
    "los-angeles": "Los Angeles, USA",
    london: "London, UK",
    paris: "Paris, France",
    sydney: "Sydney, Australia",
  },
  errorText: {
    LOGIN_REQUIRED: "You need to log in to start the consultation. Please log in and try again.",
    PAYMENT_REQUIRED: "You need a pass for the Astrology expert reading. We'll open the checkout for you.",
    PAYMENT_VERIFY_FAILED: "Payment confirmation isn't complete. If you already paid, please try again shortly.",
    PAYMENT_CANCELLED: "Payment was cancelled. You can proceed again whenever you're ready.",
    INVALID_INPUT: "Please check your birth date, birth time, and birthplace information again.",
    PLACE_ERROR: "Couldn't verify your birthplace information. Please re-enter the city and country.",
    CALCULATION_ERROR: "Something went wrong while calculating the astrology chart. Please check your input and try again.",
    SERVER_ERROR: "Something went wrong while preparing the consultation. No payment was charged.",
    LLM_ERROR: "Couldn't generate the expert reading. Your pass or payment authorization has been preserved, please try again.",
    GENERATION_TIMEOUT: "Generating the reading is taking longer than usual. Please don't close the page and try again shortly.",
    RATE_LIMITED: "Requests are briefly congested. Please try again shortly.",
    TEMPORARY_UNAVAILABLE: "The connection is briefly unstable right now. Your pass is preserved as is — please try again shortly.",
  },
  progressSteps: [
    { title: "Sorting Input", description: "Organizing your birth date, birth time, and birthplace coordinates into a consultation-ready form." },
    { title: "Checking Authorization", description: "Checking your pass, monthly credits, and single-payment authorization in turn." },
    { title: "Calculating Chart", description: "Unfolding your astrology chart. Calculating the Sun, Moon, planets, Ascendant, and house axes at the moment you were born." },
    { title: "Selecting Core Evidence", description: "Selecting only the actually calculated planets, houses, and angles to weave into the consultation flow." },
    { title: "Writing the Reading", description: "Reading the flow of the planets and constellations. Addressing your question first, then following with chart evidence and practical advice." },
    { title: "Preparing the Result", description: "Finalizing the full astrology reading, ready to open in a new tab." },
  ],
  limitedFallback: "Limited",
  phaseAccess: "Before checking authorization, calmly aligning your input",
  phasePayment: "Please check the checkout",
  phaseReady: "Your result is ready",
  phaseIdle: "Please enter your birth information and question",
  passCheckTitle: "Checking Pass",
  passCheckCompleteTitle: "Pass Check Complete",
  passCheckCompleteMessage: "Pass check complete. Reading the flow of the stars.",
  passCheckFailedTitle: "Pass Check Failed",
  passCheckRetryTitle: "Try Again Shortly",
  resultOpenedNewTab: "Opened the result page in a new tab.",
  resultBlockedPopup: "Your browser blocked the automatic new tab. Please use the button below to open the result.",
  birthTimeUnknownNote: "Since the birth time is unknown, the Ascendant and Houses are covered only in a limited way, and the reading focuses on the Sun, Moon, and planetary angles.",
  heroTitle: "Astrology Expert Reading",
  heroDescription: "We place the sky at your moment of birth alongside today's starlight to calmly illuminate the heart of your question and the direction of your choices.",
  heroSteps: ["Birth Info", "Chart Calculation", "Full Reading"],
  profileLoadAria: "Load birth info from your profile card",
  profileLoadCta: "Load from profile card",
  birthInfoHeading: "Birth Information",
  birthInfoDesc: "The first standard for establishing your Sun, Moon, and Ascendant.",
  nameOrNicknameLabel: "Name or Nickname",
  namePlaceholder: "e.g. Alex",
  genderLabel: "Gender",
  genderSelectOption: "Select",
  genderFemale: "Female",
  genderMale: "Male",
  genderOther: "Other/Not entered",
  birthDateLabel: "Birth Date",
  birthTimeLabel: "Birth Time",
  birthTimeUnknownLabel: "Time unknown",
  birthPlaceHeading: "Birthplace",
  birthPlaceDesc: "The city and coordinates refine the house axes and time zone calculation.",
  quickSelectLabel: "Quick Select",
  customInputOption: "Enter manually",
  cityLabel: "City",
  cityPlaceholder: "e.g. Seoul",
  countryLabel: "Country",
  countryPlaceholder: "e.g. South Korea",
  latitudeLabel: "Latitude",
  longitudeLabel: "Longitude",
  timezoneLabel: "Time Zone",
  topicHeading: "Consultation Topic",
  topicDesc: "Choose the scene of your life you'd like to look at most deeply right now.",
  topicSelectLabel: "Select consultation topic",
  questionHeading: "Current Question",
  questionDesc: "The more specific your question, the clearer the chart's evidence connects.",
  questionLabel: "What you most want to ask right now",
  questionPlaceholder: "e.g. I'd like to know if I should prepare for a career change this year, or what to look at in my current relationship.",
  priceLabelPrefix: "Reading price ",
  submitCta: "Begin the Starlight Reading",
  resetCta: "Prepare New Consultation",
  consultationFlowHeading: "Consultation Progress",
  waitingRoomReadyHeading: "Your result is ready",
  waitingRoomIdleHeading: "Consultation Waiting Room",
  waitingRoomReadyDesc: "Your full reading is shown on a separate result page. The saved result can be reopened with the same link.",
  waitingRoomIdleDesc: "Once your input and authorization are confirmed, chart calculation and reading generation will follow.",
  sunLabel: "Sun",
  moonLabel: "Moon",
  ascendantLabel: "Ascendant",
  ascendantUnknownFallback: "Limited interpretation due to unknown birth time",
  viewResultNewTabCta: "View Result in New Tab",
  retryCta: "Try Again",
  summaryCardEmptyFallback: "Limited based on the information entered",
};

const ASTROLOGY_CLIENT_COPY: Partial<Record<LoadingLocale, AstrologyClientCopy>> = {
  ko: {
    featureTitle: "점성술 전문가 상담",
    topicLabel: {
      "전체 차트 해석": "전체 차트 해석", "타고난 성향": "타고난 성향", "인생의 방향성": "인생의 방향성",
      "직업/사업운": "직업/사업운", "재물운": "재물운", "연애/결혼운": "연애/결혼운", "인간관계": "인간관계",
      "가족/부모운": "가족/부모운", "건강/멘탈": "건강/멘탈", "올해 운세": "올해 운세", "현재 트랜짓 흐름": "현재 트랜짓 흐름",
      "이직/창업": "이직/창업", "인생 전환기": "인생 전환기", "현재 고민 상담": "현재 고민 상담",
    },
    placePresetLabel: {
      seoul: "서울, 대한민국", busan: "부산, 대한민국", tokyo: "도쿄, 일본", singapore: "싱가포르",
      "new-york": "뉴욕, 미국", "los-angeles": "로스앤젤레스, 미국", london: "런던, 영국", paris: "파리, 프랑스", sydney: "시드니, 호주",
    },
    errorText: {
      LOGIN_REQUIRED: "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.",
      PAYMENT_REQUIRED: "점성술 전문가 상담 이용권이 필요합니다. 결제창을 열어드릴게요.",
      PAYMENT_VERIFY_FAILED: "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.",
      PAYMENT_CANCELLED: "결제가 취소되었습니다. 필요할 때 다시 진행할 수 있습니다.",
      INVALID_INPUT: "생년월일, 출생시간, 출생지 정보를 다시 확인해 주세요.",
      PLACE_ERROR: "출생지 정보를 확인하지 못했습니다. 도시와 국가를 다시 입력해 주세요.",
      CALCULATION_ERROR: "점성술 차트 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.",
      SERVER_ERROR: "상담을 준비하는 중 문제가 발생했습니다. 결제 금액은 차감되지 않았습니다.",
      LLM_ERROR: "전문가 상담 답변을 생성하지 못했습니다. 이용권 또는 결제 권한은 보존되었으니 다시 시도해 주세요.",
      GENERATION_TIMEOUT: "상담 생성이 평소보다 오래 걸리고 있습니다. 페이지를 닫지 말고 잠시 후 다시 시도해 주세요.",
      RATE_LIMITED: "요청이 잠시 몰렸습니다. 잠시 후 다시 시도해 주세요.",
      TEMPORARY_UNAVAILABLE: "지금 접속이 잠시 불안정합니다. 이용권은 그대로 보존되니, 잠시 후 다시 시도해 주세요.",
    },
    progressSteps: [
      { title: "입력값 정렬", description: "생년월일, 출생시간, 출생지 좌표를 상담 가능한 형태로 정리합니다." },
      { title: "권한 확인", description: "이용권, 월정석, 단건결제 권한을 차례로 확인합니다." },
      { title: "차트 계산", description: "별자리 차트를 펼치고 있습니다. 태어난 순간의 태양, 달, 행성, 상승궁과 하우스 축을 계산합니다." },
      { title: "핵심 근거 선별", description: "실제 계산된 행성·하우스·각도만 골라 상담 흐름으로 엮습니다." },
      { title: "상담문 작성", description: "행성과 별자리의 흐름을 읽고 있습니다. 질문에 먼저 닿고, 차트 근거와 현실 조언을 이어갑니다." },
      { title: "결과 준비", description: "새 탭에서 열 수 있는 별자리 상담 전문을 정리합니다." },
    ],
    limitedFallback: "제한",
    phaseAccess: "권한 확인 전, 입력값을 차분히 맞추고 있습니다",
    phasePayment: "결제창을 확인해 주세요",
    phaseReady: "결과가 준비되었습니다",
    phaseIdle: "출생 정보와 질문을 입력해 주세요",
    passCheckTitle: "이용권 확인",
    passCheckCompleteTitle: "이용권 확인 완료",
    passCheckCompleteMessage: "이용권 확인이 끝났습니다. 별자리 흐름을 읽고 있습니다.",
    passCheckFailedTitle: "이용권 확인 실패",
    passCheckRetryTitle: "잠시 후 다시 시도",
    resultOpenedNewTab: "결과 페이지를 새 탭으로 열었습니다.",
    resultBlockedPopup: "브라우저가 자동 새 탭 열기를 막았습니다. 아래 버튼으로 결과를 열어 주세요.",
    birthTimeUnknownNote: "출생시간 미상으로 상승궁과 하우스는 제한적으로 다루고, 태양·달·행성 각도를 중심으로 상담합니다.",
    heroTitle: "점성술 전문가 상담",
    heroDescription: "태어난 순간의 하늘과 지금의 별빛을 한 자리 위에 올려, 질문의 핵심과 선택의 방향을 차분히 비춥니다.",
    heroSteps: ["출생 정보", "차트 계산", "상담 전문"],
    profileLoadAria: "프로필 카드에서 출생 정보 불러오기",
    profileLoadCta: "프로필 카드에서 불러오기",
    birthInfoHeading: "출생 정보",
    birthInfoDesc: "차트의 태양, 달, 상승궁을 세우는 첫 기준입니다.",
    nameOrNicknameLabel: "이름 또는 닉네임",
    namePlaceholder: "예: 지우",
    genderLabel: "성별",
    genderSelectOption: "선택",
    genderFemale: "여성",
    genderMale: "남성",
    genderOther: "기타/미입력",
    birthDateLabel: "생년월일",
    birthTimeLabel: "출생시간",
    birthTimeUnknownLabel: "시간 모름",
    birthPlaceHeading: "출생지",
    birthPlaceDesc: "도시와 좌표가 하우스 축과 시간대 계산을 보정합니다.",
    quickSelectLabel: "빠른 선택",
    customInputOption: "직접 입력",
    cityLabel: "도시",
    cityPlaceholder: "예: 서울",
    countryLabel: "국가",
    countryPlaceholder: "예: 대한민국",
    latitudeLabel: "위도",
    longitudeLabel: "경도",
    timezoneLabel: "시간대",
    topicHeading: "상담 주제",
    topicDesc: "지금 가장 깊게 보고 싶은 삶의 장면을 고릅니다.",
    topicSelectLabel: "상담 주제 선택",
    questionHeading: "현재 질문",
    questionDesc: "구체적인 질문일수록 차트의 근거가 더 선명하게 이어집니다.",
    questionLabel: "지금 가장 묻고 싶은 것",
    questionPlaceholder: "예: 올해 이직을 준비해도 괜찮을지, 지금 관계에서 무엇을 보아야 할지 알고 싶어요.",
    priceLabelPrefix: "상담 이용 가격 ",
    submitCta: "별빛 상담 시작",
    resetCta: "새 상담 준비",
    consultationFlowHeading: "상담 진행",
    waitingRoomReadyHeading: "결과가 준비되었습니다",
    waitingRoomIdleHeading: "상담소 대기실",
    waitingRoomReadyDesc: "상담 전문은 별도 결과 페이지에서 보여드립니다. 저장된 결과는 같은 링크로 다시 열 수 있습니다.",
    waitingRoomIdleDesc: "입력값과 권한 확인이 끝나면 차트 계산과 상담문 작성이 이어집니다.",
    sunLabel: "태양",
    moonLabel: "달",
    ascendantLabel: "상승궁",
    ascendantUnknownFallback: "출생시간 미상으로 제한적 해석",
    viewResultNewTabCta: "새창에서 결과 보기",
    retryCta: "다시 시도",
    summaryCardEmptyFallback: "입력 정보 기준으로 제한",
  },
  en: ASTROLOGY_CLIENT_EN,
  ja: {
    featureTitle: "占星術専門家相談",
    topicLabel: {
      "전체 차트 해석": "チャート全体解釈", "타고난 성향": "生まれ持った性向", "인생의 방향성": "人生の方向性",
      "직업/사업운": "仕事・事業運", "재물운": "財運", "연애/결혼운": "恋愛・結婚運", "인간관계": "人間関係",
      "가족/부모운": "家族・両親運", "건강/멘탈": "健康・メンタル", "올해 운세": "今年の運勢", "현재 트랜짓 흐름": "現在のトランジットの流れ",
      "이직/창업": "転職・起業", "인생 전환기": "人生の転換期", "현재 고민 상담": "今の悩み相談",
    },
    placePresetLabel: {
      seoul: "ソウル、韓国", busan: "釜山、韓国", tokyo: "東京、日本", singapore: "シンガポール",
      "new-york": "ニューヨーク、米国", "los-angeles": "ロサンゼルス、米国", london: "ロンドン、英国", paris: "パリ、フランス", sydney: "シドニー、オーストラリア",
    },
    errorText: {
      LOGIN_REQUIRED: "相談を始めるにはログインが必要です。ログイン後にもう一度お試しください。",
      PAYMENT_REQUIRED: "占星術専門家相談の利用権が必要です。決済画面を開きます。",
      PAYMENT_VERIFY_FAILED: "決済確認が完了していません。決済が完了している場合は、しばらくしてからもう一度お試しください。",
      PAYMENT_CANCELLED: "決済がキャンセルされました。必要な時にまた進めることができます。",
      INVALID_INPUT: "生年月日、出生時刻、出生地情報を再度ご確認ください。",
      PLACE_ERROR: "出生地情報を確認できませんでした。都市と国を再入力してください。",
      CALCULATION_ERROR: "占星術チャートの計算中に問題が発生しました。入力内容を確認してもう一度お試しください。",
      SERVER_ERROR: "相談を準備中に問題が発生しました。決済金額は差し引かれていません。",
      LLM_ERROR: "専門家相談の回答を生成できませんでした。利用権または決済権限は保持されていますので、もう一度お試しください。",
      GENERATION_TIMEOUT: "相談の生成にいつもより時間がかかっています。ページを閉じずにしばらくしてからもう一度お試しください。",
      RATE_LIMITED: "リクエストが一時的に集中しています。しばらくしてからもう一度お試しください。",
      TEMPORARY_UNAVAILABLE: "現在、接続が一時的に不安定です。利用権はそのまま保持されますので、しばらくしてからもう一度お試しください。",
    },
    progressSteps: [
      { title: "入力値の整理", description: "生年月日、出生時刻、出生地座標を相談可能な形に整理しています。" },
      { title: "権限確認", description: "利用権、月姫石、都度決済の権限を順に確認しています。" },
      { title: "チャート計算", description: "星座チャートを展開しています。生まれた瞬間の太陽、月、惑星、アセンダントとハウス軸を計算します。" },
      { title: "核心根拠の選別", description: "実際に計算された惑星・ハウス・アスペクトのみを選び、相談の流れに編み込みます。" },
      { title: "相談文の作成", description: "惑星と星座の流れを読み取っています。質問にまず触れ、チャートの根拠と現実的なアドバイスへとつなげます。" },
      { title: "結果の準備", description: "新しいタブで開ける占星術相談全文を整理しています。" },
    ],
    limitedFallback: "制限",
    phaseAccess: "権限確認の前に、入力内容を落ち着いて整えています",
    phasePayment: "決済画面をご確認ください",
    phaseReady: "結果の準備ができました",
    phaseIdle: "出生情報と質問を入力してください",
    passCheckTitle: "利用権確認",
    passCheckCompleteTitle: "利用権確認完了",
    passCheckCompleteMessage: "利用権の確認が終わりました。星座の流れを読み取っています。",
    passCheckFailedTitle: "利用権確認失敗",
    passCheckRetryTitle: "しばらくしてから再試行",
    resultOpenedNewTab: "結果ページを新しいタブで開きました。",
    resultBlockedPopup: "ブラウザが自動的な新しいタブを開くのをブロックしました。下のボタンで結果を開いてください。",
    birthTimeUnknownNote: "出生時刻が不明なため、アセンダントとハウスは限定的に扱い、太陽・月・惑星の角度を中心に相談します。",
    heroTitle: "占星術専門家相談",
    heroDescription: "生まれた瞬間の空と今の星の光を一つの舞台に乗せ、質問の核心と選択の方向を静かに照らします。",
    heroSteps: ["出生情報", "チャート計算", "相談全文"],
    profileLoadAria: "プロフィールカードから出生情報を読み込む",
    profileLoadCta: "プロフィールカードから読み込む",
    birthInfoHeading: "出生情報",
    birthInfoDesc: "チャートの太陽、月、アセンダントを立てるための最初の基準です。",
    nameOrNicknameLabel: "名前またはニックネーム",
    namePlaceholder: "例：ジウ",
    genderLabel: "性別",
    genderSelectOption: "選択",
    genderFemale: "女性",
    genderMale: "男性",
    genderOther: "その他・未入力",
    birthDateLabel: "生年月日",
    birthTimeLabel: "出生時刻",
    birthTimeUnknownLabel: "時刻不明",
    birthPlaceHeading: "出生地",
    birthPlaceDesc: "都市と座標がハウス軸とタイムゾーンの計算を補正します。",
    quickSelectLabel: "クイック選択",
    customInputOption: "直接入力",
    cityLabel: "都市",
    cityPlaceholder: "例：ソウル",
    countryLabel: "国",
    countryPlaceholder: "例：韓国",
    latitudeLabel: "緯度",
    longitudeLabel: "経度",
    timezoneLabel: "タイムゾーン",
    topicHeading: "相談テーマ",
    topicDesc: "今最も深く見たい人生の場面を選びます。",
    topicSelectLabel: "相談テーマを選択",
    questionHeading: "現在の質問",
    questionDesc: "具体的な質問ほど、チャートの根拠がより明確につながります。",
    questionLabel: "今最も聞きたいこと",
    questionPlaceholder: "例：今年転職の準備をしても大丈夫か、今の関係で何を見るべきか知りたいです。",
    priceLabelPrefix: "相談利用価格 ",
    submitCta: "星明かり相談を始める",
    resetCta: "新しい相談を準備",
    consultationFlowHeading: "相談進行",
    waitingRoomReadyHeading: "結果の準備ができました",
    waitingRoomIdleHeading: "相談所待合室",
    waitingRoomReadyDesc: "相談全文は別の結果ページでご覧いただけます。保存された結果は同じリンクで再度開けます。",
    waitingRoomIdleDesc: "入力内容と権限確認が終わると、チャート計算と相談文の作成が続きます。",
    sunLabel: "太陽",
    moonLabel: "月",
    ascendantLabel: "アセンダント",
    ascendantUnknownFallback: "出生時刻不明のため限定的な解釈",
    viewResultNewTabCta: "新しいタブで結果を見る",
    retryCta: "再試行",
    summaryCardEmptyFallback: "入力情報に基づく制限",
  },
  "zh-CN": {
    featureTitle: "占星术专家咨询",
    topicLabel: {
      "전체 차트 해석": "全星盘解读", "타고난 성향": "与生俱来的性格", "인생의 방향성": "人生方向",
      "직업/사업운": "事业运", "재물운": "财运", "연애/결혼운": "恋爱/婚姻运", "인간관계": "人际关系",
      "가족/부모운": "家庭/父母运", "건강/멘탈": "健康/心理状态", "올해 운세": "今年运势", "현재 트랜짓 흐름": "当前流年走势",
      "이직/창업": "转职/创业", "인생 전환기": "人生转折期", "현재 고민 상담": "当前烦恼咨询",
    },
    placePresetLabel: {
      seoul: "首尔，韩国", busan: "釜山，韩国", tokyo: "东京，日本", singapore: "新加坡",
      "new-york": "纽约，美国", "los-angeles": "洛杉矶，美国", london: "伦敦，英国", paris: "巴黎，法国", sydney: "悉尼，澳大利亚",
    },
    errorText: {
      LOGIN_REQUIRED: "开始咨询需要登录。请登录后重试。",
      PAYMENT_REQUIRED: "需要占星术专家咨询的使用权。我们将为您打开结账页面。",
      PAYMENT_VERIFY_FAILED: "支付确认尚未完成。如果已完成支付，请稍后重试。",
      PAYMENT_CANCELLED: "支付已取消。您可以在需要时再次进行。",
      INVALID_INPUT: "请重新确认出生日期、出生时间与出生地信息。",
      PLACE_ERROR: "无法确认出生地信息，请重新输入城市与国家。",
      CALCULATION_ERROR: "计算占星术星盘时发生了问题。请检查输入内容后重试。",
      SERVER_ERROR: "准备咨询时发生了问题。未扣除支付金额。",
      LLM_ERROR: "无法生成专家咨询回答。使用权或支付权限已保留，请重试。",
      GENERATION_TIMEOUT: "咨询生成时间比平时更长，请勿关闭页面，稍后重试。",
      RATE_LIMITED: "请求暂时较为集中，请稍后重试。",
      TEMPORARY_UNAVAILABLE: "当前连接暂时不稳定，使用权将原样保留，请稍后重试。",
    },
    progressSteps: [
      { title: "整理输入值", description: "正在将出生日期、出生时间、出生地坐标整理为可咨询的形式。" },
      { title: "确认权限", description: "正在依次确认使用权、月度点数、单次支付权限。" },
      { title: "计算星盘", description: "正在展开星座星盘，计算出生那一刻的太阳、月亮、行星、上升星座与宫位轴。" },
      { title: "筛选核心依据", description: "只挑选实际计算出的行星·宫位·角度，编织进咨询流程。" },
      { title: "撰写咨询内容", description: "正在解读行星与星座的走势，先触及您的问题，再衔接星盘依据与现实建议。" },
      { title: "准备结果", description: "正在整理可在新标签页打开的占星术咨询全文。" },
    ],
    limitedFallback: "有限",
    phaseAccess: "在确认权限之前，正在从容整理您的输入内容",
    phasePayment: "请确认结账页面",
    phaseReady: "结果已准备就绪",
    phaseIdle: "请输入出生信息与问题",
    passCheckTitle: "确认使用权",
    passCheckCompleteTitle: "使用权确认完成",
    passCheckCompleteMessage: "使用权确认已完成，正在解读星座走势。",
    passCheckFailedTitle: "使用权确认失败",
    passCheckRetryTitle: "请稍后重试",
    resultOpenedNewTab: "已在新标签页中打开结果页面。",
    resultBlockedPopup: "浏览器阻止了自动打开新标签页。请使用下方按钮打开结果。",
    birthTimeUnknownNote: "由于出生时间不详，上升星座与宫位仅作有限处理，咨询将以太阳、月亮、行星角度为中心。",
    heroTitle: "占星术专家咨询",
    heroDescription: "将您出生那一刻的天空与此刻的星光置于同一舞台，从容照亮问题的核心与选择的方向。",
    heroSteps: ["出生信息", "星盘计算", "咨询全文"],
    profileLoadAria: "从个人资料卡加载出生信息",
    profileLoadCta: "从个人资料卡加载",
    birthInfoHeading: "出生信息",
    birthInfoDesc: "确立星盘中太阳、月亮、上升星座的首要基准。",
    nameOrNicknameLabel: "姓名或昵称",
    namePlaceholder: "例：智友",
    genderLabel: "性别",
    genderSelectOption: "选择",
    genderFemale: "女性",
    genderMale: "男性",
    genderOther: "其他/未填写",
    birthDateLabel: "出生日期",
    birthTimeLabel: "出生时间",
    birthTimeUnknownLabel: "时间不详",
    birthPlaceHeading: "出生地",
    birthPlaceDesc: "城市与坐标可校正宫位轴与时区计算。",
    quickSelectLabel: "快速选择",
    customInputOption: "手动输入",
    cityLabel: "城市",
    cityPlaceholder: "例：首尔",
    countryLabel: "国家",
    countryPlaceholder: "例：韩国",
    latitudeLabel: "纬度",
    longitudeLabel: "经度",
    timezoneLabel: "时区",
    topicHeading: "咨询主题",
    topicDesc: "选择您现在最想深入了解的人生场景。",
    topicSelectLabel: "选择咨询主题",
    questionHeading: "当前问题",
    questionDesc: "问题越具体，星盘的依据衔接就越清晰。",
    questionLabel: "现在最想问的问题",
    questionPlaceholder: "例：想知道今年是否适合准备转职，或现在的关系中应该关注什么。",
    priceLabelPrefix: "咨询使用价格 ",
    submitCta: "开始星光咨询",
    resetCta: "准备新咨询",
    consultationFlowHeading: "咨询进度",
    waitingRoomReadyHeading: "结果已准备就绪",
    waitingRoomIdleHeading: "咨询候诊室",
    waitingRoomReadyDesc: "咨询全文将在独立的结果页面中展示。已保存的结果可通过同一链接再次打开。",
    waitingRoomIdleDesc: "输入内容与权限确认完成后，将继续进行星盘计算与咨询内容撰写。",
    sunLabel: "太阳",
    moonLabel: "月亮",
    ascendantLabel: "上升星座",
    ascendantUnknownFallback: "因出生时间不详而作有限解读",
    viewResultNewTabCta: "在新标签页查看结果",
    retryCta: "重试",
    summaryCardEmptyFallback: "基于输入信息受限",
  },
  "zh-TW": {
    featureTitle: "占星術專家諮詢",
    topicLabel: {
      "전체 차트 해석": "全星盤解讀", "타고난 성향": "與生俱來的性格", "인생의 방향성": "人生方向",
      "직업/사업운": "事業運", "재물운": "財運", "연애/결혼운": "戀愛/婚姻運", "인간관계": "人際關係",
      "가족/부모운": "家庭/父母運", "건강/멘탈": "健康/心理狀態", "올해 운세": "今年運勢", "현재 트랜짓 흐름": "當前流年走勢",
      "이직/창업": "轉職/創業", "인생 전환기": "人生轉折期", "현재 고민 상담": "當前煩惱諮詢",
    },
    placePresetLabel: {
      seoul: "首爾，韓國", busan: "釜山，韓國", tokyo: "東京，日本", singapore: "新加坡",
      "new-york": "紐約，美國", "los-angeles": "洛杉磯，美國", london: "倫敦，英國", paris: "巴黎，法國", sydney: "雪梨，澳洲",
    },
    errorText: {
      LOGIN_REQUIRED: "開始諮詢需要登入。請登入後重試。",
      PAYMENT_REQUIRED: "需要占星術專家諮詢的使用權。我們將為您開啟結帳頁面。",
      PAYMENT_VERIFY_FAILED: "付款確認尚未完成。如果已完成付款，請稍後重試。",
      PAYMENT_CANCELLED: "付款已取消。您可以在需要時再次進行。",
      INVALID_INPUT: "請重新確認出生日期、出生時間與出生地資訊。",
      PLACE_ERROR: "無法確認出生地資訊，請重新輸入城市與國家。",
      CALCULATION_ERROR: "計算占星術星盤時發生了問題。請檢查輸入內容後重試。",
      SERVER_ERROR: "準備諮詢時發生了問題。未扣除付款金額。",
      LLM_ERROR: "無法生成專家諮詢回答。使用權或付款權限已保留，請重試。",
      GENERATION_TIMEOUT: "諮詢生成時間比平時更長，請勿關閉頁面，稍後重試。",
      RATE_LIMITED: "請求暫時較為集中，請稍後重試。",
      TEMPORARY_UNAVAILABLE: "目前連線暫時不穩定，使用權將原樣保留，請稍後重試。",
    },
    progressSteps: [
      { title: "整理輸入值", description: "正在將出生日期、出生時間、出生地座標整理為可諮詢的形式。" },
      { title: "確認權限", description: "正在依序確認使用權、月定石、單次付款權限。" },
      { title: "計算星盤", description: "正在展開星座星盤，計算出生那一刻的太陽、月亮、行星、上升星座與宮位軸。" },
      { title: "篩選核心依據", description: "只挑選實際計算出的行星·宮位·角度，編織進諮詢流程。" },
      { title: "撰寫諮詢內容", description: "正在解讀行星與星座的走勢，先觸及您的問題，再銜接星盤依據與現實建議。" },
      { title: "準備結果", description: "正在整理可在新分頁開啟的占星術諮詢全文。" },
    ],
    limitedFallback: "有限",
    phaseAccess: "在確認權限之前，正在從容整理您的輸入內容",
    phasePayment: "請確認結帳頁面",
    phaseReady: "結果已準備就緒",
    phaseIdle: "請輸入出生資訊與問題",
    passCheckTitle: "確認使用權",
    passCheckCompleteTitle: "使用權確認完成",
    passCheckCompleteMessage: "使用權確認已完成，正在解讀星座走勢。",
    passCheckFailedTitle: "使用權確認失敗",
    passCheckRetryTitle: "請稍後重試",
    resultOpenedNewTab: "已在新分頁中開啟結果頁面。",
    resultBlockedPopup: "瀏覽器阻止了自動開啟新分頁。請使用下方按鈕開啟結果。",
    birthTimeUnknownNote: "由於出生時間不詳，上升星座與宮位僅作有限處理，諮詢將以太陽、月亮、行星角度為中心。",
    heroTitle: "占星術專家諮詢",
    heroDescription: "將您出生那一刻的天空與此刻的星光置於同一舞台，從容照亮問題的核心與選擇的方向。",
    heroSteps: ["出生資訊", "星盤計算", "諮詢全文"],
    profileLoadAria: "從個人資料卡載入出生資訊",
    profileLoadCta: "從個人資料卡載入",
    birthInfoHeading: "出生資訊",
    birthInfoDesc: "確立星盤中太陽、月亮、上升星座的首要基準。",
    nameOrNicknameLabel: "姓名或暱稱",
    namePlaceholder: "例：智友",
    genderLabel: "性別",
    genderSelectOption: "選擇",
    genderFemale: "女性",
    genderMale: "男性",
    genderOther: "其他/未填寫",
    birthDateLabel: "出生日期",
    birthTimeLabel: "出生時間",
    birthTimeUnknownLabel: "時間不詳",
    birthPlaceHeading: "出生地",
    birthPlaceDesc: "城市與座標可校正宮位軸與時區計算。",
    quickSelectLabel: "快速選擇",
    customInputOption: "手動輸入",
    cityLabel: "城市",
    cityPlaceholder: "例：首爾",
    countryLabel: "國家",
    countryPlaceholder: "例：韓國",
    latitudeLabel: "緯度",
    longitudeLabel: "經度",
    timezoneLabel: "時區",
    topicHeading: "諮詢主題",
    topicDesc: "選擇您現在最想深入了解的人生場景。",
    topicSelectLabel: "選擇諮詢主題",
    questionHeading: "當前問題",
    questionDesc: "問題越具體，星盤的依據銜接就越清晰。",
    questionLabel: "現在最想問的問題",
    questionPlaceholder: "例：想知道今年是否適合準備轉職，或現在的關係中應該關注什麼。",
    priceLabelPrefix: "諮詢使用價格 ",
    submitCta: "開始星光諮詢",
    resetCta: "準備新諮詢",
    consultationFlowHeading: "諮詢進度",
    waitingRoomReadyHeading: "結果已準備就緒",
    waitingRoomIdleHeading: "諮詢候診室",
    waitingRoomReadyDesc: "諮詢全文將在獨立的結果頁面中展示。已儲存的結果可透過同一連結再次開啟。",
    waitingRoomIdleDesc: "輸入內容與權限確認完成後，將繼續進行星盤計算與諮詢內容撰寫。",
    sunLabel: "太陽",
    moonLabel: "月亮",
    ascendantLabel: "上升星座",
    ascendantUnknownFallback: "因出生時間不詳而作有限解讀",
    viewResultNewTabCta: "在新分頁查看結果",
    retryCta: "重試",
    summaryCardEmptyFallback: "基於輸入資訊受限",
  },
  vi: {
    featureTitle: "Tư vấn chuyên gia Chiêm tinh học",
    topicLabel: {
      "전체 차트 해석": "Giải đoán toàn bộ lá số", "타고난 성향": "Bản chất bẩm sinh", "인생의 방향성": "Định hướng cuộc đời",
      "직업/사업운": "Vận công việc/sự nghiệp", "재물운": "Vận tài lộc", "연애/결혼운": "Vận tình yêu/hôn nhân", "인간관계": "Các mối quan hệ",
      "가족/부모운": "Vận gia đình/cha mẹ", "건강/멘탈": "Sức khỏe/tinh thần", "올해 운세": "Vận may năm nay", "현재 트랜짓 흐름": "Dòng chảy chuyển động hiện tại",
      "이직/창업": "Chuyển việc/khởi nghiệp", "인생 전환기": "Bước ngoặt cuộc đời", "현재 고민 상담": "Tư vấn nỗi lo hiện tại",
    },
    placePresetLabel: {
      seoul: "Seoul, Hàn Quốc", busan: "Busan, Hàn Quốc", tokyo: "Tokyo, Nhật Bản", singapore: "Singapore",
      "new-york": "New York, Mỹ", "los-angeles": "Los Angeles, Mỹ", london: "London, Anh", paris: "Paris, Pháp", sydney: "Sydney, Úc",
    },
    errorText: {
      LOGIN_REQUIRED: "Bạn cần đăng nhập để bắt đầu tư vấn. Vui lòng đăng nhập và thử lại.",
      PAYMENT_REQUIRED: "Bạn cần có thẻ sử dụng cho buổi tư vấn chuyên gia Chiêm tinh học. Chúng tôi sẽ mở trang thanh toán cho bạn.",
      PAYMENT_VERIFY_FAILED: "Xác nhận thanh toán chưa hoàn tất. Nếu bạn đã thanh toán, vui lòng thử lại sau ít phút.",
      PAYMENT_CANCELLED: "Thanh toán đã bị hủy. Bạn có thể tiến hành lại khi cần.",
      INVALID_INPUT: "Vui lòng kiểm tra lại ngày sinh, giờ sinh và thông tin nơi sinh.",
      PLACE_ERROR: "Không thể xác minh thông tin nơi sinh. Vui lòng nhập lại thành phố và quốc gia.",
      CALCULATION_ERROR: "Đã xảy ra sự cố khi tính toán lá số chiêm tinh. Vui lòng kiểm tra thông tin nhập vào và thử lại.",
      SERVER_ERROR: "Đã xảy ra sự cố khi chuẩn bị tư vấn. Không có khoản thanh toán nào bị trừ.",
      LLM_ERROR: "Không thể tạo câu trả lời tư vấn chuyên gia. Thẻ sử dụng hoặc quyền thanh toán của bạn đã được bảo toàn, vui lòng thử lại.",
      GENERATION_TIMEOUT: "Việc tạo tư vấn đang mất nhiều thời gian hơn bình thường. Vui lòng không đóng trang và thử lại sau ít phút.",
      RATE_LIMITED: "Yêu cầu tạm thời bị dồn ứ. Vui lòng thử lại sau ít phút.",
      TEMPORARY_UNAVAILABLE: "Kết nối hiện đang tạm thời không ổn định. Thẻ sử dụng của bạn vẫn được bảo toàn, vui lòng thử lại sau ít phút.",
    },
    progressSteps: [
      { title: "Sắp xếp thông tin nhập", description: "Đang tổ chức ngày sinh, giờ sinh và tọa độ nơi sinh thành dạng có thể tư vấn." },
      { title: "Kiểm tra quyền", description: "Đang lần lượt kiểm tra thẻ sử dụng, tín dụng hàng tháng và quyền thanh toán một lần." },
      { title: "Tính toán lá số", description: "Đang mở ra lá số chiêm tinh. Tính toán Mặt Trời, Mặt Trăng, các hành tinh, Cung Mọc và trục nhà tại thời điểm bạn sinh ra." },
      { title: "Chọn lọc bằng chứng cốt lõi", description: "Chỉ chọn các hành tinh, nhà và góc chiếu đã thực sự được tính toán để đan vào dòng tư vấn." },
      { title: "Viết nội dung tư vấn", description: "Đang đọc dòng chảy của các hành tinh và chòm sao. Chạm đến câu hỏi của bạn trước, sau đó tiếp nối bằng bằng chứng lá số và lời khuyên thực tế." },
      { title: "Chuẩn bị kết quả", description: "Đang hoàn thiện toàn văn tư vấn chiêm tinh, sẵn sàng mở trong tab mới." },
    ],
    limitedFallback: "Hạn chế",
    phaseAccess: "Trước khi kiểm tra quyền, đang bình tĩnh sắp xếp thông tin bạn nhập",
    phasePayment: "Vui lòng kiểm tra trang thanh toán",
    phaseReady: "Kết quả của bạn đã sẵn sàng",
    phaseIdle: "Vui lòng nhập thông tin sinh và câu hỏi của bạn",
    passCheckTitle: "Đang kiểm tra thẻ sử dụng",
    passCheckCompleteTitle: "Kiểm tra thẻ sử dụng hoàn tất",
    passCheckCompleteMessage: "Đã hoàn tất kiểm tra thẻ sử dụng. Đang đọc dòng chảy của các vì sao.",
    passCheckFailedTitle: "Kiểm tra thẻ sử dụng thất bại",
    passCheckRetryTitle: "Thử lại sau ít phút",
    resultOpenedNewTab: "Đã mở trang kết quả trong tab mới.",
    resultBlockedPopup: "Trình duyệt của bạn đã chặn việc tự động mở tab mới. Vui lòng dùng nút bên dưới để mở kết quả.",
    birthTimeUnknownNote: "Vì giờ sinh không rõ, Cung Mọc và các Nhà chỉ được xử lý một cách hạn chế, và buổi tư vấn tập trung vào Mặt Trời, Mặt Trăng và các góc hành tinh.",
    heroTitle: "Tư vấn chuyên gia Chiêm tinh học",
    heroDescription: "Chúng tôi đặt bầu trời vào khoảnh khắc bạn sinh ra cạnh ánh sao hôm nay để bình tĩnh soi rọi trọng tâm câu hỏi và hướng đi của những lựa chọn của bạn.",
    heroSteps: ["Thông tin sinh", "Tính toán lá số", "Toàn văn tư vấn"],
    profileLoadAria: "Tải thông tin sinh từ thẻ hồ sơ",
    profileLoadCta: "Tải từ thẻ hồ sơ",
    birthInfoHeading: "Thông tin sinh",
    birthInfoDesc: "Tiêu chuẩn đầu tiên để thiết lập Mặt Trời, Mặt Trăng và Cung Mọc của bạn.",
    nameOrNicknameLabel: "Tên hoặc biệt danh",
    namePlaceholder: "vd: Ji-woo",
    genderLabel: "Giới tính",
    genderSelectOption: "Chọn",
    genderFemale: "Nữ",
    genderMale: "Nam",
    genderOther: "Khác/Chưa nhập",
    birthDateLabel: "Ngày sinh",
    birthTimeLabel: "Giờ sinh",
    birthTimeUnknownLabel: "Không rõ giờ",
    birthPlaceHeading: "Nơi sinh",
    birthPlaceDesc: "Thành phố và tọa độ giúp tinh chỉnh trục nhà và tính toán múi giờ.",
    quickSelectLabel: "Chọn nhanh",
    customInputOption: "Nhập thủ công",
    cityLabel: "Thành phố",
    cityPlaceholder: "vd: Seoul",
    countryLabel: "Quốc gia",
    countryPlaceholder: "vd: Hàn Quốc",
    latitudeLabel: "Vĩ độ",
    longitudeLabel: "Kinh độ",
    timezoneLabel: "Múi giờ",
    topicHeading: "Chủ đề tư vấn",
    topicDesc: "Chọn khung cảnh cuộc đời bạn muốn nhìn sâu sắc nhất lúc này.",
    topicSelectLabel: "Chọn chủ đề tư vấn",
    questionHeading: "Câu hỏi hiện tại",
    questionDesc: "Câu hỏi càng cụ thể, bằng chứng của lá số càng kết nối rõ ràng hơn.",
    questionLabel: "Điều bạn muốn hỏi nhất lúc này",
    questionPlaceholder: "vd: Tôi muốn biết liệu có nên chuẩn bị chuyển việc trong năm nay không, hoặc nên nhìn vào điều gì trong mối quan hệ hiện tại.",
    priceLabelPrefix: "Giá sử dụng tư vấn ",
    submitCta: "Bắt Đầu Tư Vấn Ánh Sao",
    resetCta: "Chuẩn Bị Tư Vấn Mới",
    consultationFlowHeading: "Tiến độ tư vấn",
    waitingRoomReadyHeading: "Kết quả của bạn đã sẵn sàng",
    waitingRoomIdleHeading: "Phòng chờ tư vấn",
    waitingRoomReadyDesc: "Toàn văn tư vấn được hiển thị trên một trang kết quả riêng. Kết quả đã lưu có thể mở lại bằng cùng một liên kết.",
    waitingRoomIdleDesc: "Sau khi thông tin nhập và quyền được xác nhận, việc tính toán lá số và viết nội dung tư vấn sẽ tiếp tục.",
    sunLabel: "Mặt Trời",
    moonLabel: "Mặt Trăng",
    ascendantLabel: "Cung Mọc",
    ascendantUnknownFallback: "Diễn giải hạn chế do không rõ giờ sinh",
    viewResultNewTabCta: "Xem Kết Quả Trong Tab Mới",
    retryCta: "Thử Lại",
    summaryCardEmptyFallback: "Hạn chế dựa trên thông tin đã nhập",
  },
  hi: {
    featureTitle: "ज्योतिष विशेषज्ञ परामर्श",
    topicLabel: {
      "전체 차트 해석": "पूर्ण कुंडली व्याख्या", "타고난 성향": "जन्मजात स्वभाव", "인생의 방향성": "जीवन की दिशा",
      "직업/사업운": "करियर/व्यवसाय भाग्य", "재물운": "धन भाग्य", "연애/결혼운": "प्रेम/विवाह भाग्य", "인간관계": "पारस्परिक संबंध",
      "가족/부모운": "परिवार/माता-पिता भाग्य", "건강/멘탈": "स्वास्थ्य/मानसिक स्थिति", "올해 운세": "इस वर्ष का भाग्य", "현재 트랜짓 흐름": "वर्तमान गोचर प्रवाह",
      "이직/창업": "नौकरी बदलना/स्टार्टअप", "인생 전환기": "जीवन का मोड़", "현재 고민 상담": "वर्तमान चिंता परामर्श",
    },
    placePresetLabel: {
      seoul: "सियोल, दक्षिण कोरिया", busan: "बुसान, दक्षिण कोरिया", tokyo: "टोक्यो, जापान", singapore: "सिंगापुर",
      "new-york": "न्यूयॉर्क, अमेरिका", "los-angeles": "लॉस एंजिलिस, अमेरिका", london: "लंदन, यूके", paris: "पेरिस, फ्रांस", sydney: "सिडनी, ऑस्ट्रेलिया",
    },
    errorText: {
      LOGIN_REQUIRED: "परामर्श शुरू करने के लिए लॉगिन आवश्यक है। कृपया लॉगिन कर पुनः प्रयास करें।",
      PAYMENT_REQUIRED: "ज्योतिष विशेषज्ञ परामर्श के लिए पास आवश्यक है। हम आपके लिए चेकआउट खोलेंगे।",
      PAYMENT_VERIFY_FAILED: "भुगतान की पुष्टि पूरी नहीं हुई है। यदि आपने पहले ही भुगतान कर दिया है, तो कृपया थोड़ी देर बाद पुनः प्रयास करें।",
      PAYMENT_CANCELLED: "भुगतान रद्द कर दिया गया। आवश्यकता होने पर आप फिर से आगे बढ़ सकते हैं।",
      INVALID_INPUT: "कृपया जन्म तिथि, जन्म समय और जन्म स्थान की जानकारी पुनः जांचें।",
      PLACE_ERROR: "जन्म स्थान की जानकारी सत्यापित नहीं हो सकी। कृपया शहर और देश फिर से दर्ज करें।",
      CALCULATION_ERROR: "ज्योतिष कुंडली की गणना में समस्या हुई। कृपया इनपुट जांचें और पुनः प्रयास करें।",
      SERVER_ERROR: "परामर्श तैयार करते समय समस्या हुई। कोई भुगतान नहीं काटा गया।",
      LLM_ERROR: "विशेषज्ञ परामर्श उत्तर उत्पन्न नहीं किया जा सका। आपका पास या भुगतान अनुमति सुरक्षित रखी गई है, कृपया पुनः प्रयास करें।",
      GENERATION_TIMEOUT: "परामर्श बनने में सामान्य से अधिक समय लग रहा है। कृपया पृष्ठ बंद न करें और थोड़ी देर बाद पुनः प्रयास करें।",
      RATE_LIMITED: "अनुरोध अस्थायी रूप से बढ़ गए हैं। कृपया थोड़ी देर बाद पुनः प्रयास करें।",
      TEMPORARY_UNAVAILABLE: "अभी कनेक्शन अस्थायी रूप से अस्थिर है। आपका पास वैसे ही सुरक्षित है, कृपया थोड़ी देर बाद पुनः प्रयास करें।",
    },
    progressSteps: [
      { title: "इनपुट व्यवस्थित करना", description: "आपकी जन्म तिथि, जन्म समय और जन्म स्थान के निर्देशांक को परामर्श-योग्य रूप में व्यवस्थित किया जा रहा है।" },
      { title: "अनुमति जांच", description: "पास, मासिक क्रेडिट और एकल-भुगतान अनुमति की बारी-बारी से जांच की जा रही है।" },
      { title: "कुंडली गणना", description: "आपकी ज्योतिष कुंडली खोली जा रही है। आपके जन्म के क्षण के सूर्य, चंद्रमा, ग्रह, लग्न और भाव अक्षों की गणना की जा रही है।" },
      { title: "मुख्य प्रमाण चयन", description: "केवल वास्तव में गणना किए गए ग्रहों, भावों और कोणों को चुनकर परामर्श प्रवाह में पिरोया जा रहा है।" },
      { title: "परामर्श लेखन", description: "ग्रहों और नक्षत्रों के प्रवाह को पढ़ा जा रहा है। पहले आपके प्रश्न को छूते हुए, फिर कुंडली प्रमाण और व्यावहारिक सलाह दी जाएगी।" },
      { title: "परिणाम तैयार करना", description: "नए टैब में खोलने के लिए तैयार पूर्ण ज्योतिष परामर्श को अंतिम रूप दिया जा रहा है।" },
    ],
    limitedFallback: "सीमित",
    phaseAccess: "अनुमति जांचने से पहले, आपके इनपुट को शांति से व्यवस्थित किया जा रहा है",
    phasePayment: "कृपया चेकआउट देखें",
    phaseReady: "आपका परिणाम तैयार है",
    phaseIdle: "कृपया अपनी जन्म जानकारी और प्रश्न दर्ज करें",
    passCheckTitle: "पास की जांच हो रही है",
    passCheckCompleteTitle: "पास जांच पूर्ण",
    passCheckCompleteMessage: "पास की जांच पूरी हो गई है। सितारों के प्रवाह को पढ़ा जा रहा है।",
    passCheckFailedTitle: "पास जांच विफल",
    passCheckRetryTitle: "थोड़ी देर बाद पुनः प्रयास करें",
    resultOpenedNewTab: "परिणाम पृष्ठ को नए टैब में खोला गया।",
    resultBlockedPopup: "आपके ब्राउज़र ने स्वचालित रूप से नया टैब खोलने से रोक दिया। कृपया नीचे दिए गए बटन से परिणाम खोलें।",
    birthTimeUnknownNote: "जन्म समय अज्ञात होने के कारण लग्न और भावों को सीमित रूप से शामिल किया गया है, और परामर्श सूर्य, चंद्रमा व ग्रह कोणों पर केंद्रित है।",
    heroTitle: "ज्योतिष विशेषज्ञ परामर्श",
    heroDescription: "हम आपके जन्म के क्षण के आकाश को आज के तारों की रोशनी के साथ एक मंच पर रखते हैं, ताकि आपके प्रश्न के सार और चुनाव की दिशा को शांति से रोशन कर सकें।",
    heroSteps: ["जन्म जानकारी", "कुंडली गणना", "पूर्ण परामर्श"],
    profileLoadAria: "प्रोफ़ाइल कार्ड से जन्म जानकारी लोड करें",
    profileLoadCta: "प्रोफ़ाइल कार्ड से लोड करें",
    birthInfoHeading: "जन्म जानकारी",
    birthInfoDesc: "आपके सूर्य, चंद्रमा और लग्न स्थापित करने का पहला आधार।",
    nameOrNicknameLabel: "नाम या उपनाम",
    namePlaceholder: "जैसे: जीवू",
    genderLabel: "लिंग",
    genderSelectOption: "चुनें",
    genderFemale: "महिला",
    genderMale: "पुरुष",
    genderOther: "अन्य/दर्ज नहीं",
    birthDateLabel: "जन्म तिथि",
    birthTimeLabel: "जन्म समय",
    birthTimeUnknownLabel: "समय अज्ञात",
    birthPlaceHeading: "जन्म स्थान",
    birthPlaceDesc: "शहर और निर्देशांक भाव अक्षों और समय क्षेत्र की गणना को परिष्कृत करते हैं।",
    quickSelectLabel: "त्वरित चयन",
    customInputOption: "मैन्युअल रूप से दर्ज करें",
    cityLabel: "शहर",
    cityPlaceholder: "जैसे: सियोल",
    countryLabel: "देश",
    countryPlaceholder: "जैसे: दक्षिण कोरिया",
    latitudeLabel: "अक्षांश",
    longitudeLabel: "देशांतर",
    timezoneLabel: "समय क्षेत्र",
    topicHeading: "परामर्श विषय",
    topicDesc: "अभी आप जीवन के जिस दृश्य को सबसे गहराई से देखना चाहते हैं उसे चुनें।",
    topicSelectLabel: "परामर्श विषय चुनें",
    questionHeading: "वर्तमान प्रश्न",
    questionDesc: "प्रश्न जितना विशिष्ट होगा, कुंडली का प्रमाण उतना ही स्पष्ट रूप से जुड़ेगा।",
    questionLabel: "अभी आप सबसे ज़्यादा क्या पूछना चाहते हैं",
    questionPlaceholder: "जैसे: मैं जानना चाहता/चाहती हूं कि क्या मुझे इस वर्ष नौकरी बदलने की तैयारी करनी चाहिए, या अपने वर्तमान रिश्ते में क्या देखना चाहिए।",
    priceLabelPrefix: "परामर्श उपयोग मूल्य ",
    submitCta: "तारों की रोशनी में परामर्श शुरू करें",
    resetCta: "नया परामर्श तैयार करें",
    consultationFlowHeading: "परामर्श प्रगति",
    waitingRoomReadyHeading: "आपका परिणाम तैयार है",
    waitingRoomIdleHeading: "परामर्श प्रतीक्षा कक्ष",
    waitingRoomReadyDesc: "पूर्ण परामर्श एक अलग परिणाम पृष्ठ पर दिखाया जाता है। सहेजा गया परिणाम उसी लिंक से फिर से खोला जा सकता है।",
    waitingRoomIdleDesc: "इनपुट और अनुमति की पुष्टि होने के बाद, कुंडली गणना और परामर्श लेखन जारी रहेगा।",
    sunLabel: "सूर्य",
    moonLabel: "चंद्रमा",
    ascendantLabel: "लग्न",
    ascendantUnknownFallback: "अज्ञात जन्म समय के कारण सीमित व्याख्या",
    viewResultNewTabCta: "नए टैब में परिणाम देखें",
    retryCta: "पुनः प्रयास करें",
    summaryCardEmptyFallback: "दर्ज की गई जानकारी के आधार पर सीमित",
  },
  es: {
    featureTitle: "Consulta experta de Astrología",
    topicLabel: {
      "전체 차트 해석": "Lectura completa de la carta", "타고난 성향": "Naturaleza innata", "인생의 방향성": "Dirección de vida",
      "직업/사업운": "Fortuna profesional/de negocios", "재물운": "Fortuna económica", "연애/결혼운": "Fortuna amorosa/matrimonial", "인간관계": "Relaciones",
      "가족/부모운": "Fortuna familiar/de los padres", "건강/멘탈": "Salud/bienestar mental", "올해 운세": "Fortuna de este año", "현재 트랜짓 흐름": "Flujo actual de tránsitos",
      "이직/창업": "Cambio de carrera/emprendimiento", "인생 전환기": "Punto de inflexión vital", "현재 고민 상담": "Consulta sobre preocupación actual",
    },
    placePresetLabel: {
      seoul: "Seúl, Corea del Sur", busan: "Busan, Corea del Sur", tokyo: "Tokio, Japón", singapore: "Singapur",
      "new-york": "Nueva York, EE. UU.", "los-angeles": "Los Ángeles, EE. UU.", london: "Londres, Reino Unido", paris: "París, Francia", sydney: "Sídney, Australia",
    },
    errorText: {
      LOGIN_REQUIRED: "Necesitas iniciar sesión para comenzar la consulta. Por favor, inicia sesión e inténtalo de nuevo.",
      PAYMENT_REQUIRED: "Necesitas un pase para la consulta experta de Astrología. Te abriremos la pantalla de pago.",
      PAYMENT_VERIFY_FAILED: "La confirmación del pago no se ha completado. Si ya pagaste, inténtalo de nuevo en unos momentos.",
      PAYMENT_CANCELLED: "El pago fue cancelado. Puedes continuar de nuevo cuando lo necesites.",
      INVALID_INPUT: "Vuelve a verificar tu fecha de nacimiento, hora de nacimiento y lugar de nacimiento.",
      PLACE_ERROR: "No se pudo verificar la información de tu lugar de nacimiento. Vuelve a ingresar la ciudad y el país.",
      CALCULATION_ERROR: "Ocurrió un problema al calcular la carta astrológica. Verifica tus datos e inténtalo de nuevo.",
      SERVER_ERROR: "Ocurrió un problema al preparar la consulta. No se cobró ningún pago.",
      LLM_ERROR: "No se pudo generar la respuesta de la consulta experta. Tu pase o autorización de pago se ha conservado, inténtalo de nuevo.",
      GENERATION_TIMEOUT: "Generar la consulta está tardando más de lo habitual. No cierres la página e inténtalo de nuevo en unos momentos.",
      RATE_LIMITED: "Las solicitudes están momentáneamente saturadas. Inténtalo de nuevo en unos momentos.",
      TEMPORARY_UNAVAILABLE: "La conexión está momentáneamente inestable. Tu pase se conserva tal cual, inténtalo de nuevo en unos momentos.",
    },
    progressSteps: [
      { title: "Organizando los datos", description: "Organizando tu fecha de nacimiento, hora de nacimiento y coordenadas del lugar de nacimiento en un formato listo para la consulta." },
      { title: "Verificando autorización", description: "Verificando en orden tu pase, créditos mensuales y autorización de pago único." },
      { title: "Calculando la carta", description: "Desplegando tu carta astrológica. Calculando el Sol, la Luna, los planetas, el Ascendente y los ejes de las casas en el momento de tu nacimiento." },
      { title: "Seleccionando evidencia clave", description: "Seleccionando solo los planetas, casas y ángulos realmente calculados para entretejerlos en la consulta." },
      { title: "Redactando la consulta", description: "Leyendo el flujo de los planetas y las constelaciones. Abordando primero tu pregunta y luego siguiendo con la evidencia de la carta y consejos prácticos." },
      { title: "Preparando el resultado", description: "Finalizando la lectura astrológica completa, lista para abrir en una nueva pestaña." },
    ],
    limitedFallback: "Limitado",
    phaseAccess: "Antes de verificar la autorización, alineando con calma tus datos",
    phasePayment: "Por favor, revisa la pantalla de pago",
    phaseReady: "Tu resultado está listo",
    phaseIdle: "Ingresa tu información de nacimiento y tu pregunta",
    passCheckTitle: "Verificando el pase",
    passCheckCompleteTitle: "Verificación del pase completada",
    passCheckCompleteMessage: "Verificación del pase completada. Leyendo el flujo de las estrellas.",
    passCheckFailedTitle: "Verificación del pase fallida",
    passCheckRetryTitle: "Reintentar en unos momentos",
    resultOpenedNewTab: "Se abrió la página de resultados en una nueva pestaña.",
    resultBlockedPopup: "Tu navegador bloqueó la apertura automática de una nueva pestaña. Usa el botón de abajo para abrir el resultado.",
    birthTimeUnknownNote: "Dado que la hora de nacimiento es desconocida, el Ascendente y las Casas se cubren de forma limitada, y la consulta se centra en el Sol, la Luna y los ángulos planetarios.",
    heroTitle: "Consulta experta de Astrología",
    heroDescription: "Colocamos el cielo en el momento de tu nacimiento junto a la luz de las estrellas de hoy para iluminar con calma el corazón de tu pregunta y la dirección de tus decisiones.",
    heroSteps: ["Información de nacimiento", "Cálculo de la carta", "Lectura completa"],
    profileLoadAria: "Cargar información de nacimiento desde tu tarjeta de perfil",
    profileLoadCta: "Cargar desde la tarjeta de perfil",
    birthInfoHeading: "Información de nacimiento",
    birthInfoDesc: "El primer criterio para establecer tu Sol, Luna y Ascendente.",
    nameOrNicknameLabel: "Nombre o apodo",
    namePlaceholder: "ej.: Jiwoo",
    genderLabel: "Género",
    genderSelectOption: "Seleccionar",
    genderFemale: "Femenino",
    genderMale: "Masculino",
    genderOther: "Otro/No especificado",
    birthDateLabel: "Fecha de nacimiento",
    birthTimeLabel: "Hora de nacimiento",
    birthTimeUnknownLabel: "Hora desconocida",
    birthPlaceHeading: "Lugar de nacimiento",
    birthPlaceDesc: "La ciudad y las coordenadas afinan el cálculo de los ejes de las casas y la zona horaria.",
    quickSelectLabel: "Selección rápida",
    customInputOption: "Ingresar manualmente",
    cityLabel: "Ciudad",
    cityPlaceholder: "ej.: Seúl",
    countryLabel: "País",
    countryPlaceholder: "ej.: Corea del Sur",
    latitudeLabel: "Latitud",
    longitudeLabel: "Longitud",
    timezoneLabel: "Zona horaria",
    topicHeading: "Tema de la consulta",
    topicDesc: "Elige la escena de tu vida que más te gustaría explorar en profundidad ahora mismo.",
    topicSelectLabel: "Seleccionar tema de consulta",
    questionHeading: "Pregunta actual",
    questionDesc: "Cuanto más específica sea tu pregunta, más claramente se conectará la evidencia de la carta.",
    questionLabel: "Lo que más quieres preguntar ahora mismo",
    questionPlaceholder: "ej.: Me gustaría saber si debería prepararme para un cambio de carrera este año, o qué debo observar en mi relación actual.",
    priceLabelPrefix: "Precio de la consulta ",
    submitCta: "Comenzar la Consulta bajo la Luz de las Estrellas",
    resetCta: "Preparar Nueva Consulta",
    consultationFlowHeading: "Progreso de la consulta",
    waitingRoomReadyHeading: "Tu resultado está listo",
    waitingRoomIdleHeading: "Sala de espera de la consulta",
    waitingRoomReadyDesc: "Tu lectura completa se muestra en una página de resultados independiente. El resultado guardado se puede reabrir con el mismo enlace.",
    waitingRoomIdleDesc: "Una vez confirmados tus datos y tu autorización, seguirá el cálculo de la carta y la redacción de la consulta.",
    sunLabel: "Sol",
    moonLabel: "Luna",
    ascendantLabel: "Ascendente",
    ascendantUnknownFallback: "Interpretación limitada debido a la hora de nacimiento desconocida",
    viewResultNewTabCta: "Ver Resultado en Nueva Pestaña",
    retryCta: "Reintentar",
    summaryCardEmptyFallback: "Limitado según la información ingresada",
  },
  fr: {
    featureTitle: "Consultation experte en Astrologie",
    topicLabel: {
      "전체 차트 해석": "Lecture complète du thème", "타고난 성향": "Nature innée", "인생의 방향성": "Direction de vie",
      "직업/사업운": "Fortune professionnelle/des affaires", "재물운": "Fortune financière", "연애/결혼운": "Fortune amoureuse/matrimoniale", "인간관계": "Relations",
      "가족/부모운": "Fortune familiale/des parents", "건강/멘탈": "Santé/bien-être mental", "올해 운세": "Fortune de cette année", "현재 트랜짓 흐름": "Flux actuel des transits",
      "이직/창업": "Changement de carrière/création d'entreprise", "인생 전환기": "Tournant de la vie", "현재 고민 상담": "Consultation sur une préoccupation actuelle",
    },
    placePresetLabel: {
      seoul: "Séoul, Corée du Sud", busan: "Busan, Corée du Sud", tokyo: "Tokyo, Japon", singapore: "Singapour",
      "new-york": "New York, États-Unis", "los-angeles": "Los Angeles, États-Unis", london: "Londres, Royaume-Uni", paris: "Paris, France", sydney: "Sydney, Australie",
    },
    errorText: {
      LOGIN_REQUIRED: "Vous devez vous connecter pour commencer la consultation. Veuillez vous connecter et réessayer.",
      PAYMENT_REQUIRED: "Vous avez besoin d'un pass pour la consultation experte en Astrologie. Nous allons ouvrir la page de paiement pour vous.",
      PAYMENT_VERIFY_FAILED: "La confirmation du paiement n'est pas terminée. Si vous avez déjà payé, veuillez réessayer dans un instant.",
      PAYMENT_CANCELLED: "Le paiement a été annulé. Vous pouvez recommencer quand vous le souhaitez.",
      INVALID_INPUT: "Veuillez revérifier votre date de naissance, heure de naissance et lieu de naissance.",
      PLACE_ERROR: "Impossible de vérifier les informations de votre lieu de naissance. Veuillez ressaisir la ville et le pays.",
      CALCULATION_ERROR: "Un problème est survenu lors du calcul du thème astrologique. Veuillez vérifier vos données et réessayer.",
      SERVER_ERROR: "Un problème est survenu lors de la préparation de la consultation. Aucun paiement n'a été débité.",
      LLM_ERROR: "Impossible de générer la réponse de la consultation experte. Votre pass ou autorisation de paiement a été conservé, veuillez réessayer.",
      GENERATION_TIMEOUT: "La génération de la consultation prend plus de temps que d'habitude. Veuillez ne pas fermer la page et réessayer dans un instant.",
      RATE_LIMITED: "Les demandes sont momentanément saturées. Veuillez réessayer dans un instant.",
      TEMPORARY_UNAVAILABLE: "La connexion est momentanément instable. Votre pass est conservé tel quel, veuillez réessayer dans un instant.",
    },
    progressSteps: [
      { title: "Organisation des données", description: "Organisation de votre date de naissance, heure de naissance et coordonnées du lieu de naissance dans un format prêt pour la consultation." },
      { title: "Vérification de l'autorisation", description: "Vérification successive de votre pass, de vos crédits mensuels et de l'autorisation de paiement unique." },
      { title: "Calcul du thème", description: "Déploiement de votre thème astrologique. Calcul du Soleil, de la Lune, des planètes, de l'Ascendant et des axes des maisons au moment de votre naissance." },
      { title: "Sélection des preuves essentielles", description: "Sélection uniquement des planètes, maisons et angles réellement calculés pour les tisser dans la consultation." },
      { title: "Rédaction de la consultation", description: "Lecture du flux des planètes et des constellations. Abordant d'abord votre question, puis enchaînant avec les preuves du thème et des conseils pratiques." },
      { title: "Préparation du résultat", description: "Finalisation de la lecture astrologique complète, prête à être ouverte dans un nouvel onglet." },
    ],
    limitedFallback: "Limité",
    phaseAccess: "Avant de vérifier l'autorisation, alignement calme de vos données",
    phasePayment: "Veuillez vérifier la page de paiement",
    phaseReady: "Votre résultat est prêt",
    phaseIdle: "Veuillez saisir vos informations de naissance et votre question",
    passCheckTitle: "Vérification du pass",
    passCheckCompleteTitle: "Vérification du pass terminée",
    passCheckCompleteMessage: "Vérification du pass terminée. Lecture du flux des étoiles.",
    passCheckFailedTitle: "Échec de la vérification du pass",
    passCheckRetryTitle: "Réessayer dans un instant",
    resultOpenedNewTab: "La page de résultats a été ouverte dans un nouvel onglet.",
    resultBlockedPopup: "Votre navigateur a bloqué l'ouverture automatique d'un nouvel onglet. Veuillez utiliser le bouton ci-dessous pour ouvrir le résultat.",
    birthTimeUnknownNote: "L'heure de naissance étant inconnue, l'Ascendant et les Maisons ne sont traités que de manière limitée, et la consultation se concentre sur le Soleil, la Lune et les angles planétaires.",
    heroTitle: "Consultation experte en Astrologie",
    heroDescription: "Nous plaçons le ciel de votre moment de naissance aux côtés de la lumière des étoiles d'aujourd'hui pour éclairer calmement le cœur de votre question et la direction de vos choix.",
    heroSteps: ["Informations de naissance", "Calcul du thème", "Lecture complète"],
    profileLoadAria: "Charger les informations de naissance depuis votre carte de profil",
    profileLoadCta: "Charger depuis la carte de profil",
    birthInfoHeading: "Informations de naissance",
    birthInfoDesc: "Le premier critère pour établir votre Soleil, votre Lune et votre Ascendant.",
    nameOrNicknameLabel: "Nom ou surnom",
    namePlaceholder: "ex. : Jiwoo",
    genderLabel: "Genre",
    genderSelectOption: "Sélectionner",
    genderFemale: "Femme",
    genderMale: "Homme",
    genderOther: "Autre/Non renseigné",
    birthDateLabel: "Date de naissance",
    birthTimeLabel: "Heure de naissance",
    birthTimeUnknownLabel: "Heure inconnue",
    birthPlaceHeading: "Lieu de naissance",
    birthPlaceDesc: "La ville et les coordonnées affinent le calcul des axes des maisons et du fuseau horaire.",
    quickSelectLabel: "Sélection rapide",
    customInputOption: "Saisir manuellement",
    cityLabel: "Ville",
    cityPlaceholder: "ex. : Séoul",
    countryLabel: "Pays",
    countryPlaceholder: "ex. : Corée du Sud",
    latitudeLabel: "Latitude",
    longitudeLabel: "Longitude",
    timezoneLabel: "Fuseau horaire",
    topicHeading: "Sujet de la consultation",
    topicDesc: "Choisissez la scène de votre vie que vous souhaitez examiner le plus profondément en ce moment.",
    topicSelectLabel: "Sélectionner le sujet de la consultation",
    questionHeading: "Question actuelle",
    questionDesc: "Plus votre question est précise, plus les preuves du thème se relient clairement.",
    questionLabel: "Ce que vous voulez le plus demander maintenant",
    questionPlaceholder: "ex. : J'aimerais savoir si je devrais me préparer à un changement de carrière cette année, ou ce qu'il faut observer dans ma relation actuelle.",
    priceLabelPrefix: "Prix de la consultation ",
    submitCta: "Commencer la Consultation sous les Étoiles",
    resetCta: "Préparer une Nouvelle Consultation",
    consultationFlowHeading: "Progression de la consultation",
    waitingRoomReadyHeading: "Votre résultat est prêt",
    waitingRoomIdleHeading: "Salle d'attente de la consultation",
    waitingRoomReadyDesc: "Votre lecture complète est affichée sur une page de résultats séparée. Le résultat enregistré peut être rouvert avec le même lien.",
    waitingRoomIdleDesc: "Une fois vos données et votre autorisation confirmées, le calcul du thème et la rédaction de la consultation suivront.",
    sunLabel: "Soleil",
    moonLabel: "Lune",
    ascendantLabel: "Ascendant",
    ascendantUnknownFallback: "Interprétation limitée en raison de l'heure de naissance inconnue",
    viewResultNewTabCta: "Voir le Résultat dans un Nouvel Onglet",
    retryCta: "Réessayer",
    summaryCardEmptyFallback: "Limité selon les informations saisies",
  },
  de: {
    featureTitle: "Astrologie-Expertenberatung",
    topicLabel: {
      "전체 차트 해석": "Vollständige Chart-Deutung", "타고난 성향": "Angeborenes Wesen", "인생의 방향성": "Lebensrichtung",
      "직업/사업운": "Berufs-/Geschäftsglück", "재물운": "Wohlstandsglück", "연애/결혼운": "Liebes-/Eheglück", "인간관계": "Beziehungen",
      "가족/부모운": "Familien-/Elternglück", "건강/멘탈": "Gesundheit/mentales Wohlbefinden", "올해 운세": "Glück dieses Jahres", "현재 트랜짓 흐름": "Aktueller Transitverlauf",
      "이직/창업": "Berufswechsel/Existenzgründung", "인생 전환기": "Lebenswendepunkt", "현재 고민 상담": "Beratung zu aktuellen Sorgen",
    },
    placePresetLabel: {
      seoul: "Seoul, Südkorea", busan: "Busan, Südkorea", tokyo: "Tokio, Japan", singapore: "Singapur",
      "new-york": "New York, USA", "los-angeles": "Los Angeles, USA", london: "London, Großbritannien", paris: "Paris, Frankreich", sydney: "Sydney, Australien",
    },
    errorText: {
      LOGIN_REQUIRED: "Sie müssen sich anmelden, um die Beratung zu starten. Bitte melden Sie sich an und versuchen Sie es erneut.",
      PAYMENT_REQUIRED: "Sie benötigen einen Pass für die Astrologie-Expertenberatung. Wir öffnen die Kasse für Sie.",
      PAYMENT_VERIFY_FAILED: "Die Zahlungsbestätigung ist nicht abgeschlossen. Falls Sie bereits bezahlt haben, versuchen Sie es bitte in Kürze erneut.",
      PAYMENT_CANCELLED: "Die Zahlung wurde storniert. Sie können jederzeit erneut fortfahren.",
      INVALID_INPUT: "Bitte überprüfen Sie Geburtsdatum, Geburtszeit und Geburtsort erneut.",
      PLACE_ERROR: "Ihre Geburtsortinformationen konnten nicht überprüft werden. Bitte geben Sie Stadt und Land erneut ein.",
      CALCULATION_ERROR: "Bei der Berechnung des Astrologie-Charts ist ein Problem aufgetreten. Bitte überprüfen Sie Ihre Eingaben und versuchen Sie es erneut.",
      SERVER_ERROR: "Bei der Vorbereitung der Beratung ist ein Problem aufgetreten. Es wurde keine Zahlung abgebucht.",
      LLM_ERROR: "Die Antwort der Expertenberatung konnte nicht erstellt werden. Ihr Pass oder Ihre Zahlungsberechtigung wurde beibehalten, bitte versuchen Sie es erneut.",
      GENERATION_TIMEOUT: "Die Erstellung der Beratung dauert länger als gewöhnlich. Bitte schließen Sie die Seite nicht und versuchen Sie es in Kürze erneut.",
      RATE_LIMITED: "Anfragen sind kurzzeitig überlastet. Bitte versuchen Sie es in Kürze erneut.",
      TEMPORARY_UNAVAILABLE: "Die Verbindung ist derzeit kurzzeitig instabil. Ihr Pass bleibt unverändert erhalten, bitte versuchen Sie es in Kürze erneut.",
    },
    progressSteps: [
      { title: "Eingaben werden sortiert", description: "Ihr Geburtsdatum, Ihre Geburtszeit und die Koordinaten Ihres Geburtsorts werden für die Beratung aufbereitet." },
      { title: "Berechtigung wird geprüft", description: "Ihr Pass, monatliche Guthaben und Einmalzahlungsberechtigung werden der Reihe nach geprüft." },
      { title: "Chart wird berechnet", description: "Ihr Astrologie-Chart wird entfaltet. Sonne, Mond, Planeten, Aszendent und Häuserachsen zum Zeitpunkt Ihrer Geburt werden berechnet." },
      { title: "Kernbelege werden ausgewählt", description: "Nur die tatsächlich berechneten Planeten, Häuser und Winkel werden ausgewählt und in den Beratungsverlauf eingewoben." },
      { title: "Beratungstext wird verfasst", description: "Der Verlauf der Planeten und Sternbilder wird gelesen. Zunächst wird Ihre Frage angesprochen, gefolgt von Chart-Belegen und praktischen Ratschlägen." },
      { title: "Ergebnis wird vorbereitet", description: "Die vollständige Astrologie-Beratung wird fertiggestellt und ist bereit, in einem neuen Tab geöffnet zu werden." },
    ],
    limitedFallback: "Eingeschränkt",
    phaseAccess: "Vor der Berechtigungsprüfung werden Ihre Eingaben ruhig abgestimmt",
    phasePayment: "Bitte überprüfen Sie die Kasse",
    phaseReady: "Ihr Ergebnis ist fertig",
    phaseIdle: "Bitte geben Sie Ihre Geburtsinformationen und Ihre Frage ein",
    passCheckTitle: "Pass wird überprüft",
    passCheckCompleteTitle: "Passüberprüfung abgeschlossen",
    passCheckCompleteMessage: "Passüberprüfung abgeschlossen. Der Verlauf der Sterne wird gelesen.",
    passCheckFailedTitle: "Passüberprüfung fehlgeschlagen",
    passCheckRetryTitle: "In Kürze erneut versuchen",
    resultOpenedNewTab: "Die Ergebnisseite wurde in einem neuen Tab geöffnet.",
    resultBlockedPopup: "Ihr Browser hat das automatische Öffnen eines neuen Tabs blockiert. Bitte verwenden Sie die Schaltfläche unten, um das Ergebnis zu öffnen.",
    birthTimeUnknownNote: "Da die Geburtszeit unbekannt ist, werden Aszendent und Häuser nur eingeschränkt behandelt, und die Beratung konzentriert sich auf Sonne, Mond und Planetenwinkel.",
    heroTitle: "Astrologie-Expertenberatung",
    heroDescription: "Wir stellen den Himmel Ihres Geburtsmoments neben das heutige Sternenlicht, um den Kern Ihrer Frage und die Richtung Ihrer Entscheidungen ruhig zu beleuchten.",
    heroSteps: ["Geburtsinformationen", "Chart-Berechnung", "Vollständige Beratung"],
    profileLoadAria: "Geburtsinformationen aus Ihrer Profilkarte laden",
    profileLoadCta: "Aus Profilkarte laden",
    birthInfoHeading: "Geburtsinformationen",
    birthInfoDesc: "Der erste Maßstab zur Bestimmung Ihrer Sonne, Ihres Mondes und Ihres Aszendenten.",
    nameOrNicknameLabel: "Name oder Spitzname",
    namePlaceholder: "z. B.: Jiwoo",
    genderLabel: "Geschlecht",
    genderSelectOption: "Auswählen",
    genderFemale: "Weiblich",
    genderMale: "Männlich",
    genderOther: "Sonstiges/Nicht angegeben",
    birthDateLabel: "Geburtsdatum",
    birthTimeLabel: "Geburtszeit",
    birthTimeUnknownLabel: "Zeit unbekannt",
    birthPlaceHeading: "Geburtsort",
    birthPlaceDesc: "Stadt und Koordinaten verfeinern die Berechnung der Häuserachsen und der Zeitzone.",
    quickSelectLabel: "Schnellauswahl",
    customInputOption: "Manuell eingeben",
    cityLabel: "Stadt",
    cityPlaceholder: "z. B.: Seoul",
    countryLabel: "Land",
    countryPlaceholder: "z. B.: Südkorea",
    latitudeLabel: "Breitengrad",
    longitudeLabel: "Längengrad",
    timezoneLabel: "Zeitzone",
    topicHeading: "Beratungsthema",
    topicDesc: "Wählen Sie die Lebensszene, die Sie jetzt am tiefsten betrachten möchten.",
    topicSelectLabel: "Beratungsthema auswählen",
    questionHeading: "Aktuelle Frage",
    questionDesc: "Je spezifischer Ihre Frage, desto klarer verbinden sich die Chart-Belege.",
    questionLabel: "Was Sie jetzt am meisten fragen möchten",
    questionPlaceholder: "z. B.: Ich möchte wissen, ob ich mich dieses Jahr auf einen Berufswechsel vorbereiten sollte oder worauf ich in meiner aktuellen Beziehung achten sollte.",
    priceLabelPrefix: "Beratungspreis ",
    submitCta: "Sternenlicht-Beratung beginnen",
    resetCta: "Neue Beratung vorbereiten",
    consultationFlowHeading: "Beratungsfortschritt",
    waitingRoomReadyHeading: "Ihr Ergebnis ist fertig",
    waitingRoomIdleHeading: "Beratungs-Wartezimmer",
    waitingRoomReadyDesc: "Ihre vollständige Beratung wird auf einer separaten Ergebnisseite angezeigt. Das gespeicherte Ergebnis kann über denselben Link erneut geöffnet werden.",
    waitingRoomIdleDesc: "Sobald Ihre Eingaben und Berechtigung bestätigt sind, folgen Chart-Berechnung und die Erstellung des Beratungstextes.",
    sunLabel: "Sonne",
    moonLabel: "Mond",
    ascendantLabel: "Aszendent",
    ascendantUnknownFallback: "Eingeschränkte Deutung aufgrund unbekannter Geburtszeit",
    viewResultNewTabCta: "Ergebnis in neuem Tab ansehen",
    retryCta: "Erneut versuchen",
    summaryCardEmptyFallback: "Eingeschränkt basierend auf den eingegebenen Informationen",
  },
  nl: {
    featureTitle: "Astrologie-expertconsult",
    topicLabel: {
      "전체 차트 해석": "Volledige horoscoopinterpretatie", "타고난 성향": "Aangeboren natuur", "인생의 방향성": "Levensrichting",
      "직업/사업운": "Carrière-/zakengeluk", "재물운": "Geldgeluk", "연애/결혼운": "Liefdes-/huwelijksgeluk", "인간관계": "Relaties",
      "가족/부모운": "Familie-/oudergeluk", "건강/멘탈": "Gezondheid/mentaal welzijn", "올해 운세": "Geluk van dit jaar", "현재 트랜짓 흐름": "Huidige transitstroom",
      "이직/창업": "Carrièreswitch/startup", "인생 전환기": "Keerpunt in het leven", "현재 고민 상담": "Consult over huidige zorg",
    },
    placePresetLabel: {
      seoul: "Seoul, Zuid-Korea", busan: "Busan, Zuid-Korea", tokyo: "Tokio, Japan", singapore: "Singapore",
      "new-york": "New York, VS", "los-angeles": "Los Angeles, VS", london: "Londen, VK", paris: "Parijs, Frankrijk", sydney: "Sydney, Australië",
    },
    errorText: {
      LOGIN_REQUIRED: "Je moet inloggen om het consult te starten. Log in en probeer het opnieuw.",
      PAYMENT_REQUIRED: "Je hebt een pas nodig voor het Astrologie-expertconsult. We openen de kassa voor je.",
      PAYMENT_VERIFY_FAILED: "De betaalbevestiging is niet voltooid. Als je al betaald hebt, probeer het dan later opnieuw.",
      PAYMENT_CANCELLED: "De betaling is geannuleerd. Je kunt op elk gewenst moment opnieuw doorgaan.",
      INVALID_INPUT: "Controleer je geboortedatum, geboortetijd en geboorteplaats opnieuw.",
      PLACE_ERROR: "Je geboorteplaatsgegevens konden niet worden geverifieerd. Voer de stad en het land opnieuw in.",
      CALCULATION_ERROR: "Er is een probleem opgetreden bij het berekenen van de astrologische horoscoop. Controleer je invoer en probeer het opnieuw.",
      SERVER_ERROR: "Er is een probleem opgetreden bij het voorbereiden van het consult. Er is geen betaling afgeschreven.",
      LLM_ERROR: "Het antwoord van het expertconsult kon niet worden gegenereerd. Je pas of betaalmachtiging is behouden, probeer het opnieuw.",
      GENERATION_TIMEOUT: "Het genereren van het consult duurt langer dan gebruikelijk. Sluit de pagina niet en probeer het later opnieuw.",
      RATE_LIMITED: "Verzoeken zijn tijdelijk overbelast. Probeer het later opnieuw.",
      TEMPORARY_UNAVAILABLE: "De verbinding is momenteel tijdelijk instabiel. Je pas blijft ongewijzigd behouden, probeer het later opnieuw.",
    },
    progressSteps: [
      { title: "Invoer sorteren", description: "Je geboortedatum, geboortetijd en geboorteplaatscoördinaten worden georganiseerd tot een consultklare vorm." },
      { title: "Machtiging controleren", description: "Je pas, maandelijkse credits en eenmalige betaalmachtiging worden na elkaar gecontroleerd." },
      { title: "Horoscoop berekenen", description: "Je astrologische horoscoop wordt ontvouwen. De Zon, Maan, planeten, Ascendant en huizenassen op het moment van je geboorte worden berekend." },
      { title: "Kernbewijs selecteren", description: "Alleen de daadwerkelijk berekende planeten, huizen en hoeken worden geselecteerd en verweven in het consult." },
      { title: "Consulttekst schrijven", description: "De stroom van de planeten en sterrenbeelden wordt gelezen. Eerst wordt je vraag behandeld, gevolgd door horoscoopbewijs en praktisch advies." },
      { title: "Resultaat voorbereiden", description: "De volledige astrologische lezing wordt afgerond, klaar om in een nieuw tabblad te openen." },
    ],
    limitedFallback: "Beperkt",
    phaseAccess: "Voor het controleren van de machtiging wordt je invoer rustig afgestemd",
    phasePayment: "Controleer de kassa",
    phaseReady: "Je resultaat is klaar",
    phaseIdle: "Voer je geboorte-informatie en vraag in",
    passCheckTitle: "Pas wordt gecontroleerd",
    passCheckCompleteTitle: "Pascontrole voltooid",
    passCheckCompleteMessage: "Pascontrole voltooid. De stroom van de sterren wordt gelezen.",
    passCheckFailedTitle: "Pascontrole mislukt",
    passCheckRetryTitle: "Probeer het later opnieuw",
    resultOpenedNewTab: "De resultatenpagina is geopend in een nieuw tabblad.",
    resultBlockedPopup: "Je browser heeft het automatisch openen van een nieuw tabblad geblokkeerd. Gebruik de knop hieronder om het resultaat te openen.",
    birthTimeUnknownNote: "Omdat de geboortetijd onbekend is, worden de Ascendant en Huizen slechts beperkt behandeld, en richt het consult zich op de Zon, Maan en planeethoeken.",
    heroTitle: "Astrologie-expertconsult",
    heroDescription: "We plaatsen de hemel van je geboortemoment naast het sterrenlicht van vandaag om rustig de kern van je vraag en de richting van je keuzes te belichten.",
    heroSteps: ["Geboorte-informatie", "Horoscoopberekening", "Volledig consult"],
    profileLoadAria: "Geboortegegevens laden vanuit je profielkaart",
    profileLoadCta: "Laden vanuit profielkaart",
    birthInfoHeading: "Geboorte-informatie",
    birthInfoDesc: "De eerste maatstaf voor het vaststellen van je Zon, Maan en Ascendant.",
    nameOrNicknameLabel: "Naam of bijnaam",
    namePlaceholder: "bijv.: Jiwoo",
    genderLabel: "Geslacht",
    genderSelectOption: "Selecteren",
    genderFemale: "Vrouw",
    genderMale: "Man",
    genderOther: "Anders/niet ingevuld",
    birthDateLabel: "Geboortedatum",
    birthTimeLabel: "Geboortetijd",
    birthTimeUnknownLabel: "Tijd onbekend",
    birthPlaceHeading: "Geboorteplaats",
    birthPlaceDesc: "De stad en coördinaten verfijnen de berekening van de huizenassen en tijdzone.",
    quickSelectLabel: "Snelle selectie",
    customInputOption: "Handmatig invoeren",
    cityLabel: "Stad",
    cityPlaceholder: "bijv.: Seoul",
    countryLabel: "Land",
    countryPlaceholder: "bijv.: Zuid-Korea",
    latitudeLabel: "Breedtegraad",
    longitudeLabel: "Lengtegraad",
    timezoneLabel: "Tijdzone",
    topicHeading: "Consultonderwerp",
    topicDesc: "Kies het levensscenario dat je nu het meest diepgaand wilt bekijken.",
    topicSelectLabel: "Consultonderwerp selecteren",
    questionHeading: "Huidige vraag",
    questionDesc: "Hoe specifieker je vraag, hoe duidelijker het horoscoopbewijs aansluit.",
    questionLabel: "Wat je nu het meest wilt vragen",
    questionPlaceholder: "bijv.: Ik wil weten of ik dit jaar een carrièreswitch moet voorbereiden, of waar ik in mijn huidige relatie op moet letten.",
    priceLabelPrefix: "Consultprijs ",
    submitCta: "Sterrenlicht-consult starten",
    resetCta: "Nieuw consult voorbereiden",
    consultationFlowHeading: "Consultvoortgang",
    waitingRoomReadyHeading: "Je resultaat is klaar",
    waitingRoomIdleHeading: "Wachtkamer voor consult",
    waitingRoomReadyDesc: "Je volledige consult wordt getoond op een aparte resultatenpagina. Het opgeslagen resultaat kan met dezelfde link opnieuw worden geopend.",
    waitingRoomIdleDesc: "Zodra je invoer en machtiging zijn bevestigd, volgen de horoscoopberekening en het schrijven van het consult.",
    sunLabel: "Zon",
    moonLabel: "Maan",
    ascendantLabel: "Ascendant",
    ascendantUnknownFallback: "Beperkte interpretatie door onbekende geboortetijd",
    viewResultNewTabCta: "Resultaat bekijken in nieuw tabblad",
    retryCta: "Opnieuw proberen",
    summaryCardEmptyFallback: "Beperkt op basis van ingevoerde informatie",
  },
  ms: {
    featureTitle: "Perundingan pakar Astrologi",
    topicLabel: {
      "전체 차트 해석": "Tafsiran carta penuh", "타고난 성향": "Sifat semula jadi", "인생의 방향성": "Hala tuju kehidupan",
      "직업/사업운": "Nasib kerjaya/perniagaan", "재물운": "Nasib kekayaan", "연애/결혼운": "Nasib cinta/perkahwinan", "인간관계": "Perhubungan",
      "가족/부모운": "Nasib keluarga/ibu bapa", "건강/멘탈": "Kesihatan/kesejahteraan mental", "올해 운세": "Nasib tahun ini", "현재 트랜짓 흐름": "Aliran transit semasa",
      "이직/창업": "Pertukaran kerjaya/permulaan perniagaan", "인생 전환기": "Titik perubahan hidup", "현재 고민 상담": "Perundingan kebimbangan semasa",
    },
    placePresetLabel: {
      seoul: "Seoul, Korea Selatan", busan: "Busan, Korea Selatan", tokyo: "Tokyo, Jepun", singapore: "Singapura",
      "new-york": "New York, AS", "los-angeles": "Los Angeles, AS", london: "London, UK", paris: "Paris, Perancis", sydney: "Sydney, Australia",
    },
    errorText: {
      LOGIN_REQUIRED: "Anda perlu log masuk untuk memulakan perundingan. Sila log masuk dan cuba lagi.",
      PAYMENT_REQUIRED: "Anda memerlukan pas untuk perundingan pakar Astrologi. Kami akan membuka halaman pembayaran untuk anda.",
      PAYMENT_VERIFY_FAILED: "Pengesahan pembayaran belum selesai. Jika anda sudah membayar, sila cuba lagi sebentar lagi.",
      PAYMENT_CANCELLED: "Pembayaran telah dibatalkan. Anda boleh meneruskan semula apabila perlu.",
      INVALID_INPUT: "Sila semak semula tarikh lahir, masa lahir dan maklumat tempat lahir anda.",
      PLACE_ERROR: "Tidak dapat mengesahkan maklumat tempat lahir anda. Sila masukkan semula bandar dan negara.",
      CALCULATION_ERROR: "Masalah berlaku semasa mengira carta astrologi. Sila semak input anda dan cuba lagi.",
      SERVER_ERROR: "Masalah berlaku semasa menyediakan perundingan. Tiada pembayaran ditolak.",
      LLM_ERROR: "Tidak dapat menjana jawapan perundingan pakar. Pas atau kebenaran pembayaran anda telah dikekalkan, sila cuba lagi.",
      GENERATION_TIMEOUT: "Penjanaan perundingan mengambil masa lebih lama daripada biasa. Sila jangan tutup halaman dan cuba lagi sebentar lagi.",
      RATE_LIMITED: "Permintaan sedang tersesak buat sementara waktu. Sila cuba lagi sebentar lagi.",
      TEMPORARY_UNAVAILABLE: "Sambungan sedang tidak stabil buat sementara waktu. Pas anda dikekalkan seadanya, sila cuba lagi sebentar lagi.",
    },
    progressSteps: [
      { title: "Menyusun input", description: "Menyusun tarikh lahir, masa lahir dan koordinat tempat lahir anda ke dalam bentuk sedia untuk perundingan." },
      { title: "Menyemak kebenaran", description: "Menyemak pas, kredit bulanan dan kebenaran pembayaran tunggal anda secara bergilir." },
      { title: "Mengira carta", description: "Membuka carta astrologi anda. Mengira Matahari, Bulan, planet, Ascendant dan paksi rumah pada saat anda dilahirkan." },
      { title: "Memilih bukti teras", description: "Memilih hanya planet, rumah dan sudut yang benar-benar dikira untuk dianyam ke dalam aliran perundingan." },
      { title: "Menulis perundingan", description: "Membaca aliran planet dan buruj. Menyentuh soalan anda dahulu, kemudian menyambung dengan bukti carta dan nasihat praktikal." },
      { title: "Menyediakan hasil", description: "Menyelesaikan teks penuh perundingan astrologi, sedia dibuka dalam tab baharu." },
    ],
    limitedFallback: "Terhad",
    phaseAccess: "Sebelum menyemak kebenaran, input anda sedang disusun dengan tenang",
    phasePayment: "Sila semak halaman pembayaran",
    phaseReady: "Hasil anda sudah sedia",
    phaseIdle: "Sila masukkan maklumat kelahiran dan soalan anda",
    passCheckTitle: "Menyemak pas",
    passCheckCompleteTitle: "Semakan pas selesai",
    passCheckCompleteMessage: "Semakan pas selesai. Sedang membaca aliran bintang-bintang.",
    passCheckFailedTitle: "Semakan pas gagal",
    passCheckRetryTitle: "Cuba lagi sebentar lagi",
    resultOpenedNewTab: "Halaman hasil telah dibuka dalam tab baharu.",
    resultBlockedPopup: "Pelayar anda menyekat pembukaan tab baharu secara automatik. Sila gunakan butang di bawah untuk membuka hasil.",
    birthTimeUnknownNote: "Oleh kerana masa lahir tidak diketahui, Ascendant dan Rumah hanya dilayan secara terhad, dan perundingan tertumpu pada Matahari, Bulan dan sudut planet.",
    heroTitle: "Perundingan pakar Astrologi",
    heroDescription: "Kami meletakkan langit pada saat kelahiran anda bersama cahaya bintang hari ini untuk menerangi dengan tenang inti soalan anda dan hala tuju pilihan anda.",
    heroSteps: ["Maklumat kelahiran", "Pengiraan carta", "Perundingan penuh"],
    profileLoadAria: "Muatkan maklumat kelahiran daripada kad profil",
    profileLoadCta: "Muatkan daripada kad profil",
    birthInfoHeading: "Maklumat kelahiran",
    birthInfoDesc: "Piawaian pertama untuk menetapkan Matahari, Bulan dan Ascendant anda.",
    nameOrNicknameLabel: "Nama atau nama panggilan",
    namePlaceholder: "cth.: Jiwoo",
    genderLabel: "Jantina",
    genderSelectOption: "Pilih",
    genderFemale: "Perempuan",
    genderMale: "Lelaki",
    genderOther: "Lain-lain/Tidak dimasukkan",
    birthDateLabel: "Tarikh lahir",
    birthTimeLabel: "Masa lahir",
    birthTimeUnknownLabel: "Masa tidak diketahui",
    birthPlaceHeading: "Tempat lahir",
    birthPlaceDesc: "Bandar dan koordinat memperhalusi pengiraan paksi rumah dan zon waktu.",
    quickSelectLabel: "Pilihan pantas",
    customInputOption: "Masukkan secara manual",
    cityLabel: "Bandar",
    cityPlaceholder: "cth.: Seoul",
    countryLabel: "Negara",
    countryPlaceholder: "cth.: Korea Selatan",
    latitudeLabel: "Latitud",
    longitudeLabel: "Longitud",
    timezoneLabel: "Zon waktu",
    topicHeading: "Topik perundingan",
    topicDesc: "Pilih babak kehidupan yang paling ingin anda lihat secara mendalam sekarang.",
    topicSelectLabel: "Pilih topik perundingan",
    questionHeading: "Soalan semasa",
    questionDesc: "Semakin khusus soalan anda, semakin jelas bukti carta itu berkait.",
    questionLabel: "Apa yang paling ingin anda tanya sekarang",
    questionPlaceholder: "cth.: Saya ingin tahu sama ada saya perlu bersedia untuk pertukaran kerjaya tahun ini, atau apa yang perlu diperhatikan dalam hubungan semasa saya.",
    priceLabelPrefix: "Harga penggunaan perundingan ",
    submitCta: "Mulakan Perundingan Cahaya Bintang",
    resetCta: "Sediakan Perundingan Baharu",
    consultationFlowHeading: "Kemajuan perundingan",
    waitingRoomReadyHeading: "Hasil anda sudah sedia",
    waitingRoomIdleHeading: "Bilik menunggu perundingan",
    waitingRoomReadyDesc: "Perundingan penuh anda dipaparkan pada halaman hasil berasingan. Hasil yang disimpan boleh dibuka semula dengan pautan yang sama.",
    waitingRoomIdleDesc: "Setelah input dan kebenaran anda disahkan, pengiraan carta dan penulisan perundingan akan diteruskan.",
    sunLabel: "Matahari",
    moonLabel: "Bulan",
    ascendantLabel: "Ascendant",
    ascendantUnknownFallback: "Tafsiran terhad kerana masa lahir tidak diketahui",
    viewResultNewTabCta: "Lihat Hasil dalam Tab Baharu",
    retryCta: "Cuba Lagi",
    summaryCardEmptyFallback: "Terhad berdasarkan maklumat yang dimasukkan",
  },
};

function getAstrologyClientCopy(locale: LoadingLocale): AstrologyClientCopy {
  return ASTROLOGY_CLIENT_COPY[locale] || ASTROLOGY_CLIENT_EN;
}

function useAstrologyClientCopy(): AstrologyClientCopy {
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
  return getAstrologyClientCopy(locale);
}

const FEATURE_KEY = "astrology-ai-consultation";
// 가격 정본은 worker/lib/paid-feature-registry.js 의 "astrology-ai-consultation"(300코인 / 30,000원).
// 여기 값은 서버가 runtimeGate 로 가격을 실어 주지 못했을 때의 폴백일 뿐인데, 390/39,000 으로 어긋나
// 있어 결제창에 39,000원을 보여 주고 실제로는 30,000원이 청구될 수 있었다. 정본과 어긋나게 두지 말 것.
const FEATURE_COST = 300;
const FEATURE_AMOUNT_KRW = 30000;
const API_ENDPOINTS = {
  ensureAccess: "/api/astrology-ai/ensure-access",
  start: "/api/astrology-ai/start",
  message: "/api/astrology-ai/message",
  basis: "/api/astrology-ai/basis",
} as const;

const TOPICS = [
  "전체 차트 해석",
  "타고난 성향",
  "인생의 방향성",
  "직업/사업운",
  "재물운",
  "연애/결혼운",
  "인간관계",
  "가족/부모운",
  "건강/멘탈",
  "올해 운세",
  "현재 트랜짓 흐름",
  "이직/창업",
  "인생 전환기",
  "현재 고민 상담",
];

const PLACE_PRESETS = [
  { key: "seoul", label: "서울, 대한민국", city: "서울", country: "대한민국", latitude: "37.5665", longitude: "126.9780", timezone: "Asia/Seoul" },
  { key: "busan", label: "부산, 대한민국", city: "부산", country: "대한민국", latitude: "35.1796", longitude: "129.0756", timezone: "Asia/Seoul" },
  { key: "tokyo", label: "도쿄, 일본", city: "도쿄", country: "일본", latitude: "35.6762", longitude: "139.6503", timezone: "Asia/Tokyo" },
  { key: "singapore", label: "싱가포르", city: "싱가포르", country: "싱가포르", latitude: "1.3521", longitude: "103.8198", timezone: "Asia/Singapore" },
  { key: "new-york", label: "뉴욕, 미국", city: "뉴욕", country: "미국", latitude: "40.7128", longitude: "-74.0060", timezone: "America/New_York" },
  { key: "los-angeles", label: "로스앤젤레스, 미국", city: "로스앤젤레스", country: "미국", latitude: "34.0522", longitude: "-118.2437", timezone: "America/Los_Angeles" },
  { key: "london", label: "런던, 영국", city: "런던", country: "영국", latitude: "51.5072", longitude: "-0.1276", timezone: "Europe/London" },
  { key: "paris", label: "파리, 프랑스", city: "파리", country: "프랑스", latitude: "48.8566", longitude: "2.3522", timezone: "Europe/Paris" },
  { key: "sydney", label: "시드니, 호주", city: "시드니", country: "호주", latitude: "-33.8688", longitude: "151.2093", timezone: "Australia/Sydney" },
];

const FIELD_CLASS = "h-12 rounded-lg border border-white/10 bg-white/[0.065] px-4 text-white outline-none transition placeholder:text-slate-500 focus:border-[#f5d487] focus:bg-white/[0.085] focus:ring-2 focus:ring-[#f5d487]/25 disabled:cursor-not-allowed disabled:opacity-50";
const SELECT_CLASS = "h-12 rounded-lg border border-white/10 bg-[#121735] px-4 text-white outline-none transition focus:border-[#f5d487] focus:ring-2 focus:ring-[#f5d487]/25";
const PANEL_CLASS = "rounded-lg border border-white/10 bg-[#0b1027]/80 p-5 shadow-2xl shadow-black/25 ring-1 ring-white/[0.03] backdrop-blur sm:p-6";
const LABEL_CLASS = "grid gap-2 text-sm font-semibold text-slate-200";

const defaultForm = (): FormState => {
  const seoul = PLACE_PRESETS[0];
  return {
    name: "",
    gender: "",
    birthDate: "",
    birthTime: "12:00",
    birthTimeUnknown: false,
    placeKey: seoul.key,
    city: seoul.city,
    country: seoul.country,
    latitude: seoul.latitude,
    longitude: seoul.longitude,
    timezone: seoul.timezone,
    topic: TOPICS[0],
    userQuestion: "",
  };
};

const applyProfileSeedToForm = (form: FormState, profile: AiPrefillSeed): FormState => {
  if (!profile.name && !profile.gender && !profile.birthDate && !profile.birthTime && profile.birthTimeUnknown === undefined && !profile.timezone && !profile.city) {
    return form;
  }
  return {
    ...form,
    name: profile.name || form.name,
    gender: profile.gender || form.gender,
    birthDate: profile.birthDate || form.birthDate,
    birthTimeUnknown: profile.birthTimeUnknown ?? form.birthTimeUnknown,
    birthTime:
      profile.birthTimeUnknown === true
        ? ""
        : profile.birthTime || form.birthTime,
    timezone: profile.timezone || form.timezone,
    city: profile.city || form.city,
    country: profile.country || form.country,
    latitude: profile.latitude || form.latitude,
    longitude: profile.longitude || form.longitude,
    placeKey: profile.city ? "custom" : form.placeKey,
  };
};

const buildInitialForm = (): FormState => applyProfileSeedToForm(defaultForm(), readAiProfileSeed());

function makeIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return `astro-ai-${crypto.randomUUID()}`;
  return `astro-ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function toText(value: unknown) {
  return toDisplayText(value);
}

function normalizeGatePayload(result: unknown) {
  const record = asRecord(result);
  const data = asRecord(record.data);
  return Object.keys(data).length ? data : record;
}

function extractPaymentContext(result: unknown, fallbackRequestId: string) {
  const payload = normalizeGatePayload(result);
  const consume = asRecord(payload.consume);
  const accessGrant = asRecord(payload.accessGrant);
  const payment = asRecord(payload.payment);
  const paymentId = toText(
    payload.paymentId
    || payload.transactionId
    || payload.purchaseId
    || consume.transactionId
    || consume.purchaseId
    || accessGrant.transactionId
    || accessGrant.purchaseId
    || payment.paymentId
    || payment.impUid
    || payment.merchantUid
    || fallbackRequestId,
  );
  return {
    paymentId,
    payment: { ...payment, paymentId, requestId: fallbackRequestId },
    accessGrant,
    consume,
    requestId: fallbackRequestId,
  };
}

async function postJson<T>(path: string, body: Record<string, unknown>, idempotencyKey?: string) {
  const response = await authFetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify({ ...body, ...(idempotencyKey ? { idempotencyKey } : {}) }),
  }, { retryOn401: false });
  const data = await response.json().catch(() => ({}));
  return { response, data: data as T };
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

// 생성이 오래 걸릴 때(202) 결과 엔드포인트를 폴링해 수렴시킨다.
// CF rate-limit(10초당 100회) 대비 최대 1req/3~8s, 상한 40회(≈5분, 서버 신선도 창 480s 이내).
// 첫 폴은 빠르게(0.7s) 프로브해 조기 완료를 즉시 잡고, 이후 3~8s로 램프한다.
const RESULT_POLL_BACKOFF_MS = [700, 3000, 5000, 8000];
const RESULT_POLL_MAX_ATTEMPTS = 40;

async function pollAstrologyResult(sessionId: string): Promise<Consultation> {
  for (let attempt = 0; attempt < RESULT_POLL_MAX_ATTEMPTS; attempt += 1) {
    await sleep(RESULT_POLL_BACKOFF_MS[Math.min(attempt, RESULT_POLL_BACKOFF_MS.length - 1)]);
    let response: Response;
    try {
      response = await authFetch(`/api/astrology-ai/result/${encodeURIComponent(sessionId)}`, { method: "GET" }, { retryOn401: false });
    } catch {
      continue;
    }
    if (response.status === 202) continue;
    if (response.status === 429) throw new Error("RATE_LIMITED");
    if (response.status === 404 || response.status === 409) throw new Error("LLM_ERROR");
    if (!response.ok) throw new Error("SERVER_ERROR");
    const data = await response.json().catch(() => ({}));
    return data as Consultation;
  }
  throw new Error("GENERATION_TIMEOUT");
}

function pointLabel(point: ChartPoint | null | undefined, copy: AstrologyClientCopy) {
  if (!point?.sign) return copy.limitedFallback;
  const degree = Number.isFinite(Number(point.degree)) ? `${Number(point.degree).toFixed(1)}°` : "";
  return `${point.signKo || point.sign} ${degree}`.trim();
}

export default function AstrologyAiClient() {
  const copy = useAstrologyClientCopy();
  const [form, setForm] = useState<FormState>(buildInitialForm);
  const [phase, setPhase] = useState<FlowPhase>("idle");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  // 서버가 계산한 차트 근거 — 대기실이 실제 값을 단계별로 보여 준다.
  const [basis, setBasis] = useState<AnalysisBasis | null>(null);
  const [resultUrl, setResultUrl] = useState("");
  const [resultOpenMessage, setResultOpenMessage] = useState("");
  const [progressIndex, setProgressIndex] = useState(0);
  const lockRef = useRef(false);
  const idempotencyKeyRef = useRef(makeIdempotencyKey());
  const progressTimersRef = useRef<number[]>([]);
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

  const busy = phase === "access" || phase === "payment" || phase === "reading";
  const highlights = consultation?.chartHighlights;

  const phaseText = useMemo(() => {
    if (phase === "access") return copy.phaseAccess;
    if (phase === "payment") return copy.phasePayment;
    if (phase === "reading") return copy.progressSteps[Math.min(progressIndex, copy.progressSteps.length - 1)].description;
    if (phase === "ready") return copy.phaseReady;
    return copy.phaseIdle;
  }, [phase, progressIndex, copy]);

  useEffect(() => {
    return () => {
      progressTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      progressTimersRef.current = [];
    };
  }, []);

  function patchForm(patch: Partial<FormState>) {
    formTouchedRef.current = true;
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function handlePresetChange(key: string) {
    const preset = PLACE_PRESETS.find((item) => item.key === key);
    if (!preset) {
      patchForm({ placeKey: key });
      return;
    }
    patchForm({
      placeKey: key,
      city: preset.city,
      country: preset.country,
      latitude: preset.latitude,
      longitude: preset.longitude,
      timezone: preset.timezone,
    });
  }

  function buildPayload() {
    return {
      birthInfo: {
        name: form.name.trim(),
        gender: form.gender,
        birthDate: form.birthDate,
        birthTime: form.birthTimeUnknown ? "" : form.birthTime,
        birthTimeUnknown: form.birthTimeUnknown,
        birthPlace: {
          city: form.city.trim(),
          country: form.country.trim(),
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
          timezone: form.timezone.trim(),
        },
      },
      topic: form.topic,
      userQuestion: form.userQuestion.trim(),
    };
  }

  function validateForm() {
    if (!form.gender || !form.birthDate || (!form.birthTimeUnknown && !form.birthTime)) return false;
    if (!form.city.trim() || !Number.isFinite(Number(form.latitude)) || !Number.isFinite(Number(form.longitude)) || !form.timezone.trim()) return false;
    if (!form.topic || form.userQuestion.trim().length < 2) return false;
    return true;
  }

  function clearProgressTimers() {
    progressTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    progressTimersRef.current = [];
  }

  function scheduleReadingProgress() {
    clearProgressTimers();
    progressTimersRef.current = [
      window.setTimeout(() => setProgressIndex(3), 1400),
      window.setTimeout(() => setProgressIndex(4), 3600),
      window.setTimeout(() => setProgressIndex(5), 7200),
    ];
  }

  function resultPath(sessionId: string) {
    return `/astrology-ai/result?id=${encodeURIComponent(sessionId)}`;
  }

  function openResultPage(url: string) {
    if (!url || typeof window === "undefined") return;
    console.info("[AstrologyAI] result open requested", { url });
    const opened = window.open(url, "_blank");
    if (opened) {
      opened.opener = null;
      setResultOpenMessage(copy.resultOpenedNewTab);
      return;
    }
    setResultOpenMessage(copy.resultBlockedPopup);
  }

  /* payloadOverride 는 결제 후 재개 전용이다 — 리다이렉트로 돌아오면 form 이 초기값이라
     buildPayload() 가 빈 입력을 보낸다. 그때 결제 직전에 실어 보낸 입력을 그대로 쓴다. */
  async function startConsultation(idempotencyKey: string, access: Record<string, unknown>, payloadOverride?: Record<string, unknown>) {
    setPhase("reading");
    // 다음 화면(생성 로딩)이 마운트되는 시점 — 게이트 오버레이 hold를 해제한다.
    releasePaidFeatureGate(idempotencyKey);
    setProgressIndex(2);
    scheduleReadingProgress();
    console.info("[AstrologyAI] generation started", { requestId: idempotencyKey });
    type StartResponse = Consultation | { ok?: boolean; reason?: string; message?: string; sessionId?: string; status?: string };
    let response: Response;
    let data: StartResponse;
    const startBody = { ...(payloadOverride || buildPayload()), ...access };
    try {
      ({ response, data } = await postJson<StartResponse>(API_ENDPOINTS.start, startBody, idempotencyKey));
    } catch {
      // 네트워크 순단 시 같은 idempotencyKey로 1회 재시도 — 서버가 이미 생성 중이면 202로 수렴한다.
      ({ response, data } = await postJson<StartResponse>(API_ENDPOINTS.start, startBody, idempotencyKey));
    }
    let next: Consultation;
    if (response.status === 202) {
      const pendingSessionId = toText(asRecord(data).sessionId);
      if (!pendingSessionId) throw new Error("SERVER_ERROR");
      console.info("[AstrologyAI] generation pending, polling result", { sessionId: pendingSessionId });
      next = await pollAstrologyResult(pendingSessionId);
    } else {
      if ("ok" in data && data.ok === false) {
        const reason = toText(data.reason || "SERVER_ERROR");
        throw new Error(reason || "SERVER_ERROR");
      }
      next = data as Consultation;
    }
    if (!next?.sessionId || !Array.isArray(next.messages)) throw new Error("SERVER_ERROR");
    const assistantContent = next.messages.find((message) => message.role === "assistant")?.content?.trim() || "";
    if (!assistantContent) {
      console.error("[AstrologyAI] generation empty result", { sessionId: next.sessionId, status: next.status });
      throw new Error("LLM_ERROR");
    }
    const url = resultPath(next.sessionId);
    setConsultation(next);
    setResultUrl(url);
    setProgressIndex(5);
    setPhase("ready");
    setNotice("");
    setError("");
    clearProgressTimers();
    console.info("[AstrologyAI] generation success", { sessionId: next.sessionId });
    openResultPage(url);
  }

  /* 모바일 PortOne 은 상단 프레임을 리다이렉트해 runBillingCoinGate 의 await 가 페이지와 함께
     죽는다. 그러면 /start 가 영영 안 불려 결제한 사용자가 빈 폼으로 돌아온다. grant.payload 는
     서버 확정 응답 그대로라 normalizeGatePayload 가 인페이지 gate 와 같은 자리에서 읽는다. */
  const buildResume = usePaidResume(FEATURE_KEY, async (args, grant) => {
    const idempotencyKey = typeof args.idempotencyKey === "string" ? args.idempotencyKey : "";
    const payload = unpackPaidResumeArg<Record<string, unknown>>(args.payload);
    if (!idempotencyKey || !payload) return false;
    lockRef.current = true;
    idempotencyKeyRef.current = idempotencyKey;
    setError("");
    setNotice("");
    try {
      await startConsultation(idempotencyKey, extractPaymentContext(grant?.payload, idempotencyKey), payload);
      return true;
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "SERVER_ERROR";
      console.error("[AstrologyAI] resume generation failed", { requestId: idempotencyKey, code });
      setError(copy.errorText[code] || copy.errorText.SERVER_ERROR);
      setPhase("idle");
      return false;
    } finally {
      lockRef.current = false;
    }
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || lockRef.current) return;
    console.info("[AstrologyAI] submit started");
    setProgressIndex(0);
    if (!validateForm()) {
      setError(copy.errorText.INVALID_INPUT);
      return;
    }
    lockRef.current = true;
    const idempotencyKey = idempotencyKeyRef.current || makeIdempotencyKey();
    idempotencyKeyRef.current = idempotencyKey;
    setError("");
    setNotice("");
    setPhase("access");
    setProgressIndex(1);
    // 근거는 결제/생성과 무관한 순수 계산이라 기다리지 않고 병렬로 받는다(실패하면 null이라 흐름을 막지 않는다).
    void fetchAnalysisBasis(API_ENDPOINTS.basis, buildPayload()).then(setBasis);
    beginPaidFeatureGateCheck({
      featureKey: FEATURE_KEY,
      requestId: idempotencyKey,
      title: copy.passCheckTitle,
      reason: copy.featureTitle,
      paymentMode: "MEMBERSHIP_PASS",
    });
    // 이용권 판정(unlock-status)을 아래 접근 확인 왕복과 겹쳐 돌린다 — 결제 게이트가 같은 키로 재사용해 직렬 왕복이 1회 준다.
    void primePaymentEligibility({
      featureKey: FEATURE_KEY,
      categoryKey: "premium-consultation",
      subFeatureKey: FEATURE_KEY,
      reason: copy.featureTitle,
      cost: FEATURE_COST,
      coinPrice: FEATURE_COST,
      amountKRW: FEATURE_AMOUNT_KRW,
    });
    // 확인 완료 후 다음 화면(생성 로딩)이 실제로 뜰 때까지 게이트 오버레이를 유지해 "확인 중 → 공백"을 막는다.
    // release는 startConsultation의 setPhase("reading")에서 호출한다(안전장치 상한 8초).
    holdPaidFeatureGateOpen({ requestId: idempotencyKey, maxMs: 8000 });
    try {
      console.info("[AstrologyAI] access check started", { requestId: idempotencyKey });
      // 이용권 확인 앞단의 일시적 DB 장애(503 DB_DEGRADED 등)는 재시도로 흡수한다 — 하드 "이용권 확인 실패"로 굳지 않게.
      const { response, data } = await runAccessCheckWithTransientRetry(
        () => postJson<EnsureAccessResult>(API_ENDPOINTS.ensureAccess, buildPayload(), idempotencyKey),
      );
      if (data.ok) {
        console.info("[AstrologyAI] access check success", { requestId: idempotencyKey, accessType: data.accessType });
        completePaidFeatureGateCheck({
          featureKey: FEATURE_KEY,
          requestId: idempotencyKey,
          title: copy.passCheckCompleteTitle,
          reason: copy.featureTitle,
          paymentMode: "MEMBERSHIP_PASS",
          message: copy.passCheckCompleteMessage,
        });
        await startConsultation(idempotencyKey, { accessToken: data.accessToken, accessType: data.accessType });
        return;
      }
      const accessResult = data as Exclude<EnsureAccessResult, { ok: true }>;
      if (accessResult.reason === "LOGIN_REQUIRED" || response.status === 401) throw new Error("LOGIN_REQUIRED");
      if (accessResult.reason === "INVALID_INPUT") throw new Error("INVALID_INPUT");
      // 재시도를 소진하고도 일시적 장애가 지속되면, dead-end 대신 결제창(단건+월정석)을 연다(요구사항: 이용권 확인
      // 실패 시 무조건 결제창). runBillingCoinGate가 billing.js coin-gate로 pass를 재검사(W2 재시도)해 처리한다.
      const passGateDegraded = isRetriableResultPollFailure(response.status, accessResult);
      if (!passGateDegraded && accessResult.reason !== "PAYMENT_REQUIRED") throw new Error("SERVER_ERROR");

      setNotice(copy.errorText.PAYMENT_REQUIRED);
      setPhase("payment");
      const paymentRequired = accessResult as Extract<EnsureAccessResult, { ok: false; reason: "PAYMENT_REQUIRED" }>;
      const paymentPayload = asRecord(paymentRequired.paymentPayload);
      const runtimeGate = asRecord(paymentPayload.runtimeGate);
      const gate = await runBillingCoinGate({
        ...runtimeGate,
        featureKey: FEATURE_KEY,
        categoryKey: toText(runtimeGate.categoryKey || "premium-consultation"),
        subFeatureKey: FEATURE_KEY,
        reason: copy.featureTitle,
        requestId: idempotencyKey,
        idempotencyKey,
        cost: Number(runtimeGate.cost || FEATURE_COST),
        coinPrice: Number(runtimeGate.coinPrice || FEATURE_COST),
        amountKRW: Number(runtimeGate.amountKRW || FEATURE_AMOUNT_KRW),
        resume: buildResume({ idempotencyKey, payload: packPaidResumeArg(buildPayload()) }),
      });
      if (!gate.ok || !gate.data) {
        const code = toText(gate.error?.code || (gate.status === 401 ? "LOGIN_REQUIRED" : "PAYMENT_VERIFY_FAILED")).toUpperCase();
        throw new Error(code === "PAYMENT_CANCELLED" ? "PAYMENT_CANCELLED" : code === "AUTH_REQUIRED" ? "LOGIN_REQUIRED" : "PAYMENT_VERIFY_FAILED");
      }
      console.info("[AstrologyAI] access check success", { requestId: idempotencyKey, accessType: "billing-gate" });
      await startConsultation(idempotencyKey, extractPaymentContext(gate, idempotencyKey));
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "SERVER_ERROR";
      const paymentCancelled = code === "PAYMENT_CANCELLED";
      if (code === "LOGIN_REQUIRED" || code === "PAYMENT_VERIFY_FAILED" || code === "PAYMENT_CANCELLED" || code === "INVALID_INPUT") {
        console.error("[AstrologyAI] access check failed", { requestId: idempotencyKey, code });
      } else {
        console.error("[AstrologyAI] generation empty result", { requestId: idempotencyKey, code });
      }
      // 일시적 접속 장애는 이용권 결함이 아니므로 "이용권 확인 실패"로 표기하지 않는다.
      const isTransient = code === "TEMPORARY_UNAVAILABLE" || code === "RATE_LIMITED";
      setError(copy.errorText[code] || copy.errorText.SERVER_ERROR);
      failPaidFeatureGateCheck({
        featureKey: FEATURE_KEY,
        requestId: idempotencyKey,
        title: isTransient ? copy.passCheckRetryTitle : copy.passCheckFailedTitle,
        reason: copy.featureTitle,
        paymentMode: "MEMBERSHIP_PASS",
        message: copy.errorText[code] || copy.errorText.SERVER_ERROR,
        cancelled: paymentCancelled,
      });
      setPhase("idle");
      clearProgressTimers();
    } finally {
      lockRef.current = false;
    }
  }

  function reset() {
    if (busy) return;
    clearProgressTimers();
    idempotencyKeyRef.current = makeIdempotencyKey();
    setConsultation(null);
    setResultUrl("");
    setResultOpenMessage("");
    setNotice("");
    setError("");
    setProgressIndex(0);
    setPhase("idle");
  }

  const activeStep = phase === "ready" ? copy.progressSteps.length - 1 : Math.min(progressIndex, copy.progressSteps.length - 1);
  const progressPercent = phase === "idle" ? 8 : Math.round(((activeStep + 1) / copy.progressSteps.length) * 100);

  return (
    <main className="astro-ai-page relative min-h-screen overflow-hidden bg-[#050816] text-slate-100 [font-family:var(--font-body)]">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,#050816_0%,#0b1028_42%,#050816_100%)]" aria-hidden="true" />
      <div className="pointer-events-none fixed inset-0 opacity-45 [background-image:radial-gradient(#f8e7b0_1px,transparent_1px),radial-gradient(#a9b7ff_1px,transparent_1px)] [background-position:0_0,32px_44px] [background-size:86px_86px,132px_132px]" aria-hidden="true" />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f5d487]/60 to-transparent" aria-hidden="true" />

      <section className="relative mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div className="space-y-6">
            <header className="overflow-hidden rounded-lg border border-white/10 bg-[#0b1027]/[0.82] p-6 shadow-2xl shadow-black/30 ring-1 ring-white/[0.03] backdrop-blur sm:p-8">
              <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#f5d487]">Western Astrology Salon</p>
                  <h1 className="mt-3 text-4xl font-black leading-tight text-white [font-family:var(--font-premium)] sm:text-5xl">
                    {copy.heroTitle}
                  </h1>
                  <p className="mt-4 max-w-2xl text-base leading-8 text-slate-200">
                    {copy.heroDescription}
                  </p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    {copy.heroSteps.map((label, index) => (
                      <div key={label} className="rounded-lg border border-white/10 bg-white/[0.045] px-4 py-3">
                        <p className="text-xs font-black text-[#f5d487]">0{index + 1}</p>
                        <p className="mt-1 text-sm font-bold text-white">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="relative mx-auto grid aspect-square w-48 place-items-center sm:w-56 lg:mx-0">
                  <div className="absolute inset-0 rounded-full border border-[#f5d487]/40" />
                  <div className="absolute inset-5 rounded-full border border-white/10" />
                  <div className="absolute inset-10 rounded-full border border-sky-200/20" />
                  <div className="absolute h-px w-full bg-gradient-to-r from-transparent via-[#f5d487]/55 to-transparent" />
                  <div className="absolute h-full w-px bg-gradient-to-b from-transparent via-sky-200/40 to-transparent" />
                  <div className="grid h-24 w-24 place-items-center rounded-full border border-[#f5d487]/35 bg-[#050816]/70 shadow-xl shadow-[#f5d487]/10">
                    <Moon className="h-12 w-12 text-[#f5d487]" aria-hidden="true" />
                  </div>
                </div>
              </div>
            </header>

            <form id="astrology-ai-form" onSubmit={handleSubmit} className="space-y-5">
              <section className={PANEL_CLASS}>
                <div className="mb-5 flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#f5d487]/30 bg-[#f5d487]/10">
                    <CalendarDays className="h-5 w-5 text-[#f5d487]" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-black text-white">{copy.birthInfoHeading}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-300">{copy.birthInfoDesc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={loadFormFromProfileCard}
                    className="shrink-0 rounded-lg border border-[#f5d487]/35 bg-[#f5d487]/10 px-3 py-2 text-xs font-bold text-[#f5d487] transition hover:bg-[#f5d487]/20"
                    aria-label={copy.profileLoadAria}
                  >
                    {copy.profileLoadCta}
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={LABEL_CLASS}>
                    {copy.nameOrNicknameLabel}
                    <input className={FIELD_CLASS} value={form.name} onChange={(event) => patchForm({ name: event.target.value })} autoComplete="name" placeholder={copy.namePlaceholder} />
                  </label>
                  <label className={LABEL_CLASS}>
                    {copy.genderLabel}
                    <select className={SELECT_CLASS} value={form.gender} onChange={(event) => patchForm({ gender: event.target.value })}>
                      <option value="">{copy.genderSelectOption}</option>
                      <option value="female">{copy.genderFemale}</option>
                      <option value="male">{copy.genderMale}</option>
                      <option value="other">{copy.genderOther}</option>
                    </select>
                  </label>
                  <label className={LABEL_CLASS}>
                    {copy.birthDateLabel}
                    <input className={FIELD_CLASS} {...birthDateTextInputProps(form.birthDate, (nextBirthDate) => patchForm({ birthDate: nextBirthDate }))} />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px]">
                    <label className={LABEL_CLASS}>
                      {copy.birthTimeLabel}
                      <input className={FIELD_CLASS} type="time" value={form.birthTime} disabled={form.birthTimeUnknown} onChange={(event) => patchForm({ birthTime: event.target.value })} />
                    </label>
                    <label className="flex min-h-12 items-end gap-2 pb-3 text-sm font-semibold text-slate-200">
                      <input className="h-4 w-4 accent-[#f5d487]" type="checkbox" checked={form.birthTimeUnknown} onChange={(event) => patchForm({ birthTimeUnknown: event.target.checked })} />
                      <span>{copy.birthTimeUnknownLabel}</span>
                    </label>
                  </div>
                </div>
                {form.birthTimeUnknown && (
                  <p className="mt-4 rounded-lg border border-[#f5d487]/25 bg-[#f5d487]/10 px-4 py-3 text-sm leading-6 text-amber-50">
                    {copy.birthTimeUnknownNote}
                  </p>
                )}
              </section>

              <section className={PANEL_CLASS}>
                <div className="mb-5 flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#f5d487]/30 bg-[#f5d487]/10">
                    <MapPin className="h-5 w-5 text-[#f5d487]" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-lg font-black text-white">{copy.birthPlaceHeading}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-300">{copy.birthPlaceDesc}</p>
                  </div>
                </div>

                <div className="grid gap-4">
                  <label className={LABEL_CLASS}>
                    {copy.quickSelectLabel}
                    <select className={SELECT_CLASS} value={form.placeKey} onChange={(event) => handlePresetChange(event.target.value)}>
                      {PLACE_PRESETS.map((place) => <option key={place.key} value={place.key}>{copy.placePresetLabel[place.key] || place.label}</option>)}
                      <option value="custom">{copy.customInputOption}</option>
                    </select>
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className={LABEL_CLASS}>
                      {copy.cityLabel}
                      <input className={FIELD_CLASS} value={form.city} onChange={(event) => patchForm({ city: event.target.value, placeKey: "custom" })} placeholder={copy.cityPlaceholder} />
                    </label>
                    <label className={LABEL_CLASS}>
                      {copy.countryLabel}
                      <input className={FIELD_CLASS} value={form.country} onChange={(event) => patchForm({ country: event.target.value, placeKey: "custom" })} placeholder={copy.countryPlaceholder} />
                    </label>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className={LABEL_CLASS}>
                      {copy.latitudeLabel}
                      <input className={FIELD_CLASS} inputMode="decimal" value={form.latitude} onChange={(event) => patchForm({ latitude: event.target.value, placeKey: "custom" })} placeholder="37.5665" />
                    </label>
                    <label className={LABEL_CLASS}>
                      {copy.longitudeLabel}
                      <input className={FIELD_CLASS} inputMode="decimal" value={form.longitude} onChange={(event) => patchForm({ longitude: event.target.value, placeKey: "custom" })} placeholder="126.9780" />
                    </label>
                    <label className={LABEL_CLASS}>
                      {copy.timezoneLabel}
                      <input className={FIELD_CLASS} value={form.timezone} onChange={(event) => patchForm({ timezone: event.target.value, placeKey: "custom" })} placeholder="Asia/Seoul" />
                    </label>
                  </div>
                </div>
              </section>

              <section className={PANEL_CLASS}>
                <div className="mb-5 flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#f5d487]/30 bg-[#f5d487]/10">
                    <Stars className="h-5 w-5 text-[#f5d487]" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-lg font-black text-white">{copy.topicHeading}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-300">{copy.topicDesc}</p>
                  </div>
                </div>
                <label className={`${LABEL_CLASS} mb-4`}>
                  {copy.topicSelectLabel}
                  <select className={SELECT_CLASS} value={form.topic} onChange={(event) => patchForm({ topic: event.target.value })}>
                    {TOPICS.map((topic) => <option key={topic} value={topic}>{copy.topicLabel[topic] || topic}</option>)}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {TOPICS.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => patchForm({ topic })}
                      className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-bold leading-5 transition focus:outline-none focus:ring-2 focus:ring-[#f5d487]/35 ${form.topic === topic ? "border-[#f5d487] bg-[#f5d487] text-[#161019] shadow-lg shadow-[#f5d487]/15" : "border-white/10 bg-white/[0.045] text-slate-200 hover:border-[#f5d487]/40 hover:bg-white/[0.075]"}`}
                    >
                      {copy.topicLabel[topic] || topic}
                    </button>
                  ))}
                </div>
              </section>

              <section className={PANEL_CLASS}>
                <div className="mb-5 flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#f5d487]/30 bg-[#f5d487]/10">
                    <Sparkles className="h-5 w-5 text-[#f5d487]" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-lg font-black text-white">{copy.questionHeading}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-300">{copy.questionDesc}</p>
                  </div>
                </div>
                <label className={LABEL_CLASS}>
                  {copy.questionLabel}
                  <textarea className="min-h-40 rounded-lg border border-white/10 bg-white/[0.065] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-[#f5d487] focus:bg-white/[0.085] focus:ring-2 focus:ring-[#f5d487]/25" value={form.userQuestion} onChange={(event) => patchForm({ userQuestion: event.target.value })} maxLength={1200} placeholder={copy.questionPlaceholder} />
                </label>
                <p className="mt-2 text-right text-xs font-semibold text-slate-400">{form.userQuestion.length}/1200</p>
              </section>

              <div className="flex items-center justify-end">
                <PriceBadge featureKey="astrology-ai-consultation" prefix={copy.priceLabelPrefix} />
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <button type="submit" disabled={busy} className="group relative inline-flex min-h-14 items-center justify-center gap-2 overflow-hidden rounded-lg bg-[#f5d487] px-6 text-base font-black text-[#161019] shadow-xl shadow-[#f5d487]/20 transition hover:bg-[#ffe6a8] focus:outline-none focus:ring-2 focus:ring-[#f5d487]/40 disabled:cursor-not-allowed disabled:opacity-60">
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
                  <span className="relative inline-flex items-center gap-2">
                    {busy ? <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Sparkles className="h-5 w-5" aria-hidden="true" />}
                    {copy.submitCta}
                  </span>
                </button>
                <button type="button" disabled={busy} onClick={reset} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/15 px-5 text-sm font-bold text-slate-100 transition hover:border-[#f5d487]/40 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50">
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  {copy.resetCta}
                </button>
              </div>
            </form>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
            <section className="rounded-lg border border-white/10 bg-[#0b1027]/[0.88] p-5 shadow-2xl shadow-black/30 ring-1 ring-white/[0.03] backdrop-blur" aria-live="polite">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#f5d487]">Consultation Flow</p>
                  <h2 className="mt-1 text-lg font-black text-white">{copy.consultationFlowHeading}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{phaseText}</p>
                </div>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.055]">
                  {phase === "ready" ? <CheckCircle2 className="h-6 w-6 text-emerald-300" aria-hidden="true" /> : phase === "payment" ? <WalletCards className="h-6 w-6 text-[#f5d487]" aria-hidden="true" /> : <Moon className="h-6 w-6 text-[#f5d487]" aria-hidden="true" />}
                </span>
              </div>

              <div className="mb-5 h-3 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-sky-200 via-[#f5d487] to-emerald-200 transition-all duration-700 motion-reduce:transition-none" style={{ width: `${progressPercent}%` }} />
              </div>

              <div className="grid gap-3">
                {copy.progressSteps.map((step, index) => {
                  const done = phase === "ready" || index < activeStep;
                  const active = index === activeStep && phase !== "idle";
                  return (
                    <div key={step.title} className={`rounded-lg border p-3 transition ${active ? "border-[#f5d487]/70 bg-[#f5d487]/10" : done ? "border-emerald-300/25 bg-emerald-300/5" : "border-white/10 bg-white/[0.035]"}`}>
                      <div className="flex items-start gap-3">
                        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black ${done ? "bg-emerald-300 text-[#07131a]" : active ? "bg-[#f5d487] text-[#161019]" : "bg-white/10 text-slate-300"}`}>
                          {done ? "✓" : index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-black text-white">{step.title}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-300">{step.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-lg border border-white/10 bg-[#0b1027]/[0.88] p-5 shadow-2xl shadow-black/30 ring-1 ring-white/[0.03] backdrop-blur">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#f5d487]/30 bg-[#f5d487]/10">
                  <Sparkles className="h-5 w-5 text-[#f5d487]" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-black text-white">{phase === "ready" ? copy.waitingRoomReadyHeading : copy.waitingRoomIdleHeading}</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-300">
                    {phase === "ready" ? copy.waitingRoomReadyDesc : copy.waitingRoomIdleDesc}
                  </p>
                </div>
              </div>

              {/* 기다리는 동안 실제로 계산된 차트 값을 단계별로 드러낸다. 근거 조회가 실패하면
                  기존 진행 단계 문구로 되돌아갈 뿐, 생성 흐름에는 영향을 주지 않는다. */}
              {busy && !consultation && (
                <div className="mt-5 text-slate-200 [--cd-basis-popover-bg:#0b1027]">
                  <AnalysisBasisLoading
                    basis={basis}
                    fallbackLabel={copy.progressSteps[Math.min(progressIndex, copy.progressSteps.length - 1)].title}
                    fallbackDetail={copy.progressSteps[Math.min(progressIndex, copy.progressSteps.length - 1)].description}
                  />
                </div>
              )}

              {consultation && resultUrl && (
                <div className="mt-5 grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <SummaryCard title={copy.sunLabel} items={[pointLabel(highlights?.sun, copy)]} emptyFallback={copy.summaryCardEmptyFallback} />
                    <SummaryCard title={copy.moonLabel} items={[pointLabel(highlights?.moon, copy)]} emptyFallback={copy.summaryCardEmptyFallback} />
                  </div>
                  <SummaryCard title={copy.ascendantLabel} items={[highlights?.ascendant ? pointLabel(highlights.ascendant, copy) : copy.ascendantUnknownFallback]} emptyFallback={copy.summaryCardEmptyFallback} />
                  <button type="button" onClick={() => openResultPage(resultUrl)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#f5d487] px-4 text-sm font-black text-[#161019] transition hover:bg-[#ffe6a8] focus:outline-none focus:ring-2 focus:ring-[#f5d487]/40">
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    {copy.viewResultNewTabCta}
                  </button>
                  {resultOpenMessage && <p className="text-sm leading-6 text-slate-300">{resultOpenMessage}</p>}
                </div>
              )}

              {notice && <p className="mt-4 rounded-lg border border-[#f5d487]/25 bg-[#f5d487]/10 p-3 text-sm leading-6 text-amber-50">{notice}</p>}
              {error && (
                <div className="mt-4 rounded-lg border border-rose-300/30 bg-rose-400/10 p-4 text-sm text-rose-50">
                  <div className="flex gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <p className="leading-6">{error}</p>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                    <button type="submit" form="astrology-ai-form" className="min-h-11 rounded-lg bg-rose-100 px-3 font-bold text-rose-950">
                      {copy.retryCta}
                    </button>
                    <button type="button" onClick={reset} className="min-h-11 rounded-lg border border-white/15 px-3 font-bold text-white">
                      {copy.resetCta}
                    </button>
                  </div>
                </div>
              )}
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

function SummaryCard({ title, items, emptyFallback }: { title: string; items: string[]; emptyFallback: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <p className="text-xs font-black uppercase text-[#f5d487]">{title}</p>
      <div className="mt-3 grid gap-2">
        {(items.length ? items : [emptyFallback]).map((item) => (
          <span key={item} className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-slate-100">{item}</span>
        ))}
      </div>
    </div>
  );
}
