"use client";

import { birthDateTextInputProps } from "@/lib/birthDateInputProps";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Heart,
  Loader2,
  MessageCircleHeart,
  Moon,
  Sparkles,
  Star,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { authFetch } from "@/app/_lib/auth-client";
import theme from "./love-secret-theme.module.css";
import styles from "./LoveSecretAiClient.module.css";
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
import { readAiProfileSeed, type AiPrefillSeed } from "@/app/_lib/ai-prefill-seed";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";
import { PriceBadge } from "@/app/components/PriceBadge";
import {
  getActivePaidAttemptSession,
  markPaidAttemptFailed,
  markPaidAttemptGenerationCompleted,
  markPaidAttemptGenerationStarted,
} from "@/app/_lib/paid-attempt-session";
import { detectLocale } from "@/lib/i18n/dictionary";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

type AccessType = "pass" | "paid" | "subscription" | "admin";
type CalendarType = "solar" | "lunar";
type GenderType = "male" | "female" | "unknown" | "";
type Phase = "idle" | "reading" | "payment" | "generating" | "ready" | "error";
type RelationshipStatus = "single" | "crush" | "some" | "dating" | "breakup" | "reunion" | "marriage" | "complicated" | "custom";
type FocusArea = "relationshipFlow" | "distance" | "reunion" | "longTerm" | "intimacy" | "timing" | "pattern" | "custom";
type StepId = "status" | "focus" | "me" | "partner";
type ErrorKey = "loginRequired" | "paymentRequired" | "paymentVerifyFailed" | "paymentCancelled" | "invalidInput" | "questionRequired" | "birthTimeRequired" | "serverError" | "llmError" | "networkError" | "resultTimeout";

type PersonFieldLabels = { nameOrNickname: string; gender: string; calendarType: string; birthDate: string; birthTime: string };

type LoveSecretClientCopy = {
  relationshipLabel: Record<RelationshipStatus, string>;
  focusLabel: Record<FocusArea, string>;
  focusHint: Record<FocusArea, string>;
  heroPromises: string[];
  stepTitle: Record<StepId, string>;
  stepHelper: Record<StepId, string>;
  generatingSteps: string[];
  analysisItems: string[];
  errorMessages: Record<ErrorKey, string>;
  resumeNotice: string;
  phaseReading: string;
  phasePayment: string;
  phaseReady: string;
  phaseIdle: string;
  passCheckTitle: string;
  passCheckReason: string;
  passCheckCompleteTitle: string;
  passCheckCompleteMessage: string;
  passCheckFailedTitle: string;
  resultOpeningNewWindow: string;
  resultBlockedPopup: string;
  resultReadyUseButton: string;
  resultOpenedNewWindow: string;
  resultFailedSubmit: string;
  profileLoadAria: string;
  profileLoadCta: string;
  autoFilledNotice: string;
  personFieldLabels: { me: PersonFieldLabels; partner: PersonFieldLabels };
  namePlaceholderRequired: string;
  namePlaceholderOptional: string;
  genderFemale: string;
  genderMale: string;
  genderUnknown: string;
  solarLabel: string;
  lunarLabel: string;
  birthTimeUnknownLabel: string;
  consultStyleLabel: string;
  questionLabel: (isCustom: boolean) => string;
  questionPlaceholderCustom: string;
  questionPlaceholderOptional: string;
  readyCardHeading: string;
  myInfoLabel: string;
  partnerInfoLabel: string;
  meNameFallback: string;
  partnerNameFallback: string;
  birthDateMissing: string;
  birthTimeMissing: string;
  noPartnerInfoSummary: string;
  promiseCardHeading: string;
  promiseCardFooter: string;
  generatingCardHeading: string;
  generatingCardSubtext: string;
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  heroStartCta: string;
  progressGeneratingSrLabel: string;
  progressFormSrLabel: string;
  stepLabelFormat: (step: number, title: string) => string;
  prevStepLabel: string;
  nextStepLabel: string;
  submitCta: string;
  priceLabelPrefix: string;
  resultReadyMessage: string;
  openResultNewWindowCta: string;
};

const LOVE_SECRET_CLIENT_EN: LoveSecretClientCopy = {
  relationshipLabel: {
    single: "Single", crush: "Crushing on someone", some: "In a situationship", dating: "In a relationship",
    breakup: "Just broke up", reunion: "Considering getting back together", marriage: "Considering marriage",
    complicated: "It's complicated", custom: "Curious about their feelings",
  },
  focusLabel: {
    relationshipFlow: "Where this relationship is heading", distance: "Their feelings and emotional distance",
    reunion: "Chances of getting back together", longTerm: "Marriage/long-term potential",
    intimacy: "Chemistry and intimacy rhythm", timing: "Timing for contact/confession/conversation",
    pattern: "The relationship pattern I need to change", custom: "Write it myself",
  },
  focusHint: {
    relationshipFlow: "Looks at the current flow and the next choice.",
    distance: "Reads the reasons behind closeness and withdrawal.",
    reunion: "Examines the warmth of a possible reconnection.",
    longTerm: "Looks at lasting stability.",
    intimacy: "Reads emotional temperature and intimacy through elemental balance.",
    timing: "Sorts out when and how to bring it up.",
    pattern: "Points out the recurring habits of the heart.",
    custom: "Write down the question that hurts the most right now.",
  },
  heroPromises: ["Based on your birth chart", "Love psychology analysis", "Down to what to do today"],
  stepTitle: {
    status: "Your Current Relationship Status", focus: "Consultation Style and Question",
    me: "My Information", partner: "Partner Information · Confirm",
  },
  stepHelper: {
    status: "Tell us where you stand first. That sets the tone of the advice.",
    focus: "Pick what you most want to hear, and write your question as it is.",
    me: "Birth information to build your chart. It's auto-filled if you have a profile card.",
    partner: "Partner info is optional. Without it, we'll read your love flow on its own.",
  },
  generatingSteps: [
    "Building your chart from your birth info",
    "Examining the Five Elements, seasonal balance, Ten Gods, and divine stars",
    "Calculating your Major Luck, this year's flow, and good dates",
    "Writing six branches of consultation at once",
    "Re-reading to make sure no part is missing evidence",
    "Getting ready to open the reading report in a new window",
  ],
  analysisItems: [
    "Core love fortune and the pattern your chart draws",
    "Love strengths/weaknesses and recurring patterns",
    "Their feelings, compatibility, and ideal type",
    "Conflict, wandering heart, chances of reconciliation",
    "Marriage fortune and this year's good months",
    "Good dates chosen from calculated day pillars",
    "Situationship strategy, conversation lines, charm styling",
    "What to do starting today and a 7-day guide",
  ],
  errorMessages: {
    loginRequired: "You need to log in to start the consultation. Please log in and try again.",
    paymentRequired: "You need a pass for the Love Strategy expert reading. We'll open the checkout for you.",
    paymentVerifyFailed: "Payment confirmation isn't complete. If you already paid, please try again shortly.",
    paymentCancelled: "Payment was cancelled. You can proceed again whenever you're ready.",
    invalidInput: "We're missing some info needed for the Love Strategy reading. Please check your birth date, gender, and relationship status again.",
    questionRequired: "Please write at least one line about the love question you're most curious about right now.",
    birthTimeRequired: "Please enter your birth time or select 'birth time unknown'.",
    serverError: "Something went wrong while preparing the Love Strategy reading. No payment or pass was charged.",
    llmError: "Something went wrong while generating the expert reading. If anything was charged, it will be automatically restored.",
    networkError: "The connection is unstable. Please try again shortly.",
    resultTimeout: "Generating the reading is taking longer than expected. Please check the result page again shortly.",
  },
  resumeNotice: "If you have a consultation already in progress, you can continue checking it on the result page.",
  phaseReading: "Sorting through the clues in what you shared",
  phasePayment: "Checking your pass and payment authorization",
  phaseReady: "Your reading report is ready",
  phaseIdle: "Ready to unfold your Love Strategy",
  passCheckTitle: "Checking Pass",
  passCheckReason: "Love Strategy Expert Reading",
  passCheckCompleteTitle: "Pass Check Complete",
  passCheckCompleteMessage: "Pass check complete. Reading the flow of your heart.",
  passCheckFailedTitle: "Pass Check Failed",
  resultOpeningNewWindow: "Preparing the result page in a new window.",
  resultBlockedPopup: "Your browser blocked the automatic new window. Please use the button below to open the result.",
  resultReadyUseButton: "Your reading report is ready. Please use the button below to open the result.",
  resultOpenedNewWindow: "Opened the reading report in a new window.",
  resultFailedSubmit: "The consultation wasn't completed. Please try again from the input screen.",
  profileLoadAria: "Load birth info from your profile card",
  profileLoadCta: "Load from profile card",
  autoFilledNotice: "Auto-filled from your profile card",
  personFieldLabels: {
    me: { nameOrNickname: "My Name or Nickname", gender: "My Gender", calendarType: "My Calendar (Solar/Lunar)", birthDate: "My Birth Date", birthTime: "My Birth Time" },
    partner: { nameOrNickname: "Partner's Name or Nickname · optional", gender: "Partner's Gender · optional", calendarType: "Partner's Calendar (Solar/Lunar) · optional", birthDate: "Partner's Birth Date · optional", birthTime: "Partner's Birth Time · optional" },
  },
  namePlaceholderRequired: "Please enter your name",
  namePlaceholderOptional: "A name to call your partner",
  genderFemale: "Female",
  genderMale: "Male",
  genderUnknown: "Private",
  solarLabel: "Solar",
  lunarLabel: "Lunar",
  birthTimeUnknownLabel: "Birth time unknown",
  consultStyleLabel: "Consultation Style",
  questionLabel: (isCustom) => (isCustom ? "The question you're most curious about right now" : "The question you're most curious about right now · optional"),
  questionPlaceholderCustom: "Please write at least one line about the love question you're most curious about right now.",
  questionPlaceholderOptional: "You can leave this blank, but writing your current feelings and situation will give you a more nuanced reading.",
  readyCardHeading: "Starting the consultation with this",
  myInfoLabel: "My Information",
  partnerInfoLabel: "Partner Information",
  meNameFallback: "Me",
  partnerNameFallback: "Partner",
  birthDateMissing: "Birth date not entered",
  birthTimeMissing: "Birth time not entered",
  noPartnerInfoSummary: "Focused on my love flow, without partner information",
  promiseCardHeading: "What This Reading Covers",
  promiseCardFooter: "Interpreted only from your calculated chart and day pillars. No baseless claims or invented dates.",
  generatingCardHeading: "Reading the Temperature of Your Heart",
  generatingCardSubtext: "Usually finishes within about 90 seconds. Please don't close this window and wait a moment.",
  heroTitle: "Love Strategy AI",
  heroSubtitle: "A Love Consultant Just for You",
  heroDescription: "We read your birth chart together with love psychology to point out exactly what to do today and what to hold off on.",
  heroStartCta: "Start the Reading",
  progressGeneratingSrLabel: "Reading generation progress",
  progressFormSrLabel: "Input progress",
  stepLabelFormat: (step, title) => `Step ${step} · ${title}`,
  prevStepLabel: "Back",
  nextStepLabel: "Next",
  submitCta: "❤️ Start the Love Strategy Reading",
  priceLabelPrefix: "Reading price ",
  resultReadyMessage: "You can open the result page.",
  openResultNewWindowCta: "Open Result in New Window",
};

const LOVE_SECRET_CLIENT_COPY: Partial<Record<LoadingLocale, LoveSecretClientCopy>> = {
  ko: {
    relationshipLabel: {
      single: "솔로", crush: "짝사랑", some: "썸 타는 중", dating: "연애 중", breakup: "이별 직후",
      reunion: "재회 고민", marriage: "결혼 고민", complicated: "관계가 복잡한 상태", custom: "상대방 마음이 궁금한 상태",
    },
    focusLabel: {
      relationshipFlow: "현재 관계가 어디로 흘러갈지", distance: "상대의 마음과 거리감", reunion: "재회 가능성",
      longTerm: "결혼/장기 관계 가능성", intimacy: "속궁합과 친밀감 리듬", timing: "연락/고백/대화 타이밍",
      pattern: "내가 바꿔야 할 연애 패턴", custom: "직접 입력",
    },
    focusHint: {
      relationshipFlow: "지금 흐름과 다음 선택을 봅니다.", distance: "가까움과 물러섬의 이유를 읽습니다.",
      reunion: "다시 닿을 수 있는 온도를 살핍니다.", longTerm: "오래 가는 안정감을 봅니다.",
      intimacy: "조후로 감정 온도와 친밀감을 풉니다.", timing: "말을 꺼낼 때와 방식을 정리합니다.",
      pattern: "반복되는 마음의 습관을 짚습니다.", custom: "지금 가장 아픈 질문을 그대로 적습니다.",
    },
    heroPromises: ["사주 명식 기반", "연애 심리 분석", "오늘 할 행동까지"],
    stepTitle: { status: "지금의 연애 상태", focus: "상담 스타일과 질문", me: "내 정보", partner: "상대방 정보 · 확인" },
    stepHelper: {
      status: "어디쯤 서 있는지부터 알려 주세요. 조언의 온도가 여기서 정해집니다.",
      focus: "가장 듣고 싶은 이야기를 고르고, 궁금한 질문을 그대로 적어 주세요.",
      me: "명식을 세우기 위한 생년 정보입니다. 프로필 카드가 있으면 자동으로 채워집니다.",
      partner: "상대 정보는 선택입니다. 없으면 내 연애 흐름 중심으로 읽어 드립니다.",
    },
    generatingSteps: [
      "생년 정보로 명식을 세우고 있어요", "오행·조후·십성과 신살을 살피고 있어요",
      "대운과 올해 흐름, 좋은 날짜를 계산하고 있어요", "여섯 갈래의 상담을 동시에 쓰고 있어요",
      "근거가 빠진 대목이 없는지 다시 읽고 있어요", "상담 리포트를 새 창에서 열 준비를 하고 있어요",
    ],
    analysisItems: [
      "핵심 연애운과 명식이 그리는 결", "연애 장점·약점과 반복되는 패턴", "상대의 마음, 궁합, 이상형",
      "갈등·바람기·재회 가능성", "결혼운과 올해 좋은 달", "계산된 일진으로 고른 좋은 날짜",
      "썸 전략·대화 문장·매력 연출", "오늘부터 할 행동과 7일 가이드",
    ],
    errorMessages: {
      loginRequired: "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.",
      paymentRequired: "연애 비책 전문가 상담 이용권이 필요합니다. 결제창을 열어드릴게요.",
      paymentVerifyFailed: "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.",
      paymentCancelled: "결제가 취소되었습니다. 필요할 때 다시 진행할 수 있습니다.",
      invalidInput: "연애 비책 상담에 필요한 정보가 부족해요. 생년월일, 성별, 연애 상황을 다시 확인해 주세요.",
      questionRequired: "지금 가장 궁금한 연애 질문을 한 줄이라도 적어주세요.",
      birthTimeRequired: "출생시간을 입력하거나 출생시간 모름을 선택해 주세요.",
      serverError: "연애 비책 상담을 준비하는 중 문제가 발생했어요. 결제나 이용권은 차감되지 않았습니다.",
      llmError: "전문가 상담문을 생성하는 중 문제가 발생했어요. 차감된 내역이 있다면 자동으로 복구됩니다.",
      networkError: "연결이 불안정해요. 잠시 후 다시 시도해 주세요.",
      resultTimeout: "상담 결과 생성이 예상보다 오래 걸리고 있어요. 결과 페이지에서 잠시 후 다시 확인해 주세요.",
    },
    resumeNotice: "이미 진행 중인 상담이 있다면 결과 페이지에서 이어서 확인할 수 있습니다.",
    phaseReading: "입력한 마음의 단서를 정리하고 있어요",
    phasePayment: "이용권과 결제 권한을 확인하고 있어요",
    phaseReady: "상담 리포트가 준비되었습니다",
    phaseIdle: "연애 비책을 펼칠 준비가 되어 있습니다",
    passCheckTitle: "이용권 확인",
    passCheckReason: "연애 비책 전문가 상담",
    passCheckCompleteTitle: "이용권 확인 완료",
    passCheckCompleteMessage: "이용권 확인이 끝났습니다. 마음의 흐름을 읽고 있습니다.",
    passCheckFailedTitle: "이용권 확인 실패",
    resultOpeningNewWindow: "결과 페이지를 새 창으로 준비하고 있습니다.",
    resultBlockedPopup: "브라우저가 자동 새 창 열기를 막았습니다. 아래 버튼으로 결과를 열어 주세요.",
    resultReadyUseButton: "상담 리포트가 준비되었습니다. 아래 버튼으로 결과를 열어 주세요.",
    resultOpenedNewWindow: "상담 리포트를 새 창에서 열었습니다.",
    resultFailedSubmit: "상담 생성이 완료되지 않았습니다. 입력 화면에서 다시 시도해 주세요.",
    profileLoadAria: "프로필 카드에서 출생 정보 불러오기",
    profileLoadCta: "프로필 카드에서 불러오기",
    autoFilledNotice: "프로필 카드에서 자동으로 채웠어요",
    personFieldLabels: {
      me: { nameOrNickname: "내 이름 또는 별칭", gender: "내 성별", calendarType: "내 양력/음력", birthDate: "내 생년월일", birthTime: "내 출생시간" },
      partner: { nameOrNickname: "상대방 이름 또는 별칭 · 선택", gender: "상대방 성별 · 선택", calendarType: "상대방 양력/음력 · 선택", birthDate: "상대방 생년월일 · 선택", birthTime: "상대방 출생시간 · 선택" },
    },
    namePlaceholderRequired: "이름을 입력해 주세요",
    namePlaceholderOptional: "상대방을 부르는 이름",
    genderFemale: "여성",
    genderMale: "남성",
    genderUnknown: "비공개",
    solarLabel: "양력",
    lunarLabel: "음력",
    birthTimeUnknownLabel: "출생시간 모름",
    consultStyleLabel: "상담 스타일",
    questionLabel: (isCustom) => (isCustom ? "지금 가장 궁금한 질문" : "지금 가장 궁금한 질문 · 선택"),
    questionPlaceholderCustom: "지금 가장 궁금한 연애 질문을 한 줄이라도 적어주세요.",
    questionPlaceholderOptional: "비워두어도 상담은 가능하지만, 지금의 마음과 상황을 적으면 더 섬세하게 읽어드립니다.",
    readyCardHeading: "이대로 상담을 시작합니다",
    myInfoLabel: "내 정보",
    partnerInfoLabel: "상대방 정보",
    meNameFallback: "나",
    partnerNameFallback: "상대방",
    birthDateMissing: "생년월일 미입력",
    birthTimeMissing: "출생시간 미입력",
    noPartnerInfoSummary: "상대방 정보 없이 내 연애 흐름 중심",
    promiseCardHeading: "상담에서 읽어 드리는 것",
    promiseCardFooter: "계산된 명식과 일진 안에서만 해석합니다. 근거 없는 단정이나 지어낸 날짜는 쓰지 않습니다.",
    generatingCardHeading: "마음의 온도를 읽는 중입니다",
    generatingCardSubtext: "보통 1분 30초 안에 끝나요. 창을 닫지 말고 잠시만 기다려 주세요.",
    heroTitle: "연애 비책 AI",
    heroSubtitle: "당신만을 위한 연애 컨설턴트",
    heroDescription: "사주 명식과 연애 심리를 함께 읽어, 오늘 무엇을 하고 무엇을 미뤄야 하는지까지 짚어 드립니다.",
    heroStartCta: "상담 시작하기",
    progressGeneratingSrLabel: "상담 생성 진행률",
    progressFormSrLabel: "입력 진행률",
    stepLabelFormat: (step, title) => `${step}단계 · ${title}`,
    prevStepLabel: "이전",
    nextStepLabel: "다음",
    submitCta: "❤️ 연애 비책 상담 시작하기",
    priceLabelPrefix: "상담 이용 가격 ",
    resultReadyMessage: "결과 페이지를 열 수 있습니다.",
    openResultNewWindowCta: "결과 새 창 열기",
  },
  en: LOVE_SECRET_CLIENT_EN,
  ja: {
    relationshipLabel: {
      single: "ソロ", crush: "片思い中", some: "曖昧な関係中", dating: "交際中", breakup: "別れた直後",
      reunion: "復縁を検討中", marriage: "結婚を検討中", complicated: "複雑な関係", custom: "相手の気持ちが気になる状態",
    },
    focusLabel: {
      relationshipFlow: "今の関係がどこへ向かうか", distance: "相手の気持ちと距離感", reunion: "復縁の可能性",
      longTerm: "結婚・長期的な関係の可能性", intimacy: "相性と親密度のリズム", timing: "連絡・告白・会話のタイミング",
      pattern: "変えるべき恋愛パターン", custom: "直接入力",
    },
    focusHint: {
      relationshipFlow: "今の流れと次の選択を見ます。", distance: "近づきと離れの理由を読み解きます。",
      reunion: "再びつながれる温度を見極めます。", longTerm: "長く続く安定感を見ます。",
      intimacy: "調候で感情の温度と親密度を解きます。", timing: "切り出すタイミングと方法を整理します。",
      pattern: "繰り返される心の癖を指摘します。", custom: "今一番気になる質問をそのまま書きます。",
    },
    heroPromises: ["四柱命式に基づく", "恋愛心理分析", "今日すべき行動まで"],
    stepTitle: { status: "今の恋愛状況", focus: "相談スタイルと質問", me: "私の情報", partner: "相手の情報・確認" },
    stepHelper: {
      status: "どのあたりに立っているかまず教えてください。アドバイスの温度がここで決まります。",
      focus: "一番聞きたい話を選び、気になる質問をそのまま書いてください。",
      me: "命式を立てるための生年情報です。プロフィールカードがあれば自動的に入力されます。",
      partner: "相手の情報は任意です。なければ私の恋愛の流れを中心に読み解きます。",
    },
    generatingSteps: [
      "生年情報から命式を立てています", "五行・調候・十神と神殺を調べています",
      "大運と今年の流れ、良い日を計算しています", "六つの相談を同時に作成しています",
      "根拠が抜けている箇所がないか再確認しています", "相談レポートを新しいウィンドウで開く準備をしています",
    ],
    analysisItems: [
      "核心恋愛運と命式が描く結", "恋愛の長所・短所と繰り返すパターン", "相手の気持ち、相性、理想のタイプ",
      "葛藤・浮気・復縁の可能性", "結婚運と今年の良い月", "計算された日辰で選んだ良い日",
      "曖昧な関係の戦略・会話文・魅力の演出", "今日からの行動と7日間ガイド",
    ],
    errorMessages: {
      loginRequired: "相談を始めるにはログインが必要です。ログイン後にもう一度お試しください。",
      paymentRequired: "恋愛秘策専門家相談の利用権が必要です。決済画面を開きます。",
      paymentVerifyFailed: "決済確認が完了していません。決済が完了している場合は、しばらくしてからもう一度お試しください。",
      paymentCancelled: "決済がキャンセルされました。必要な時にまた進めることができます。",
      invalidInput: "恋愛秘策相談に必要な情報が不足しています。生年月日、性別、恋愛状況を再度ご確認ください。",
      questionRequired: "今一番気になる恋愛の質問を一行でも書いてください。",
      birthTimeRequired: "出生時刻を入力するか、出生時刻不明を選択してください。",
      serverError: "恋愛秘策相談を準備中に問題が発生しました。決済や利用権は差し引かれていません。",
      llmError: "専門家相談文を生成中に問題が発生しました。差し引かれた分があれば自動的に復旧されます。",
      networkError: "接続が不安定です。しばらくしてからもう一度お試しください。",
      resultTimeout: "相談結果の生成が予想より長くかかっています。結果ページでしばらくしてから再度ご確認ください。",
    },
    resumeNotice: "進行中の相談がある場合は、結果ページで続けて確認できます。",
    phaseReading: "入力された心の手がかりを整理しています",
    phasePayment: "利用権と決済権限を確認しています",
    phaseReady: "相談レポートの準備ができました",
    phaseIdle: "恋愛秘策を開く準備ができています",
    passCheckTitle: "利用権確認",
    passCheckReason: "恋愛秘策専門家相談",
    passCheckCompleteTitle: "利用権確認完了",
    passCheckCompleteMessage: "利用権の確認が終わりました。心の流れを読み取っています。",
    passCheckFailedTitle: "利用権確認失敗",
    resultOpeningNewWindow: "結果ページを新しいウィンドウで準備しています。",
    resultBlockedPopup: "ブラウザが自動的な新しいウィンドウを開くのをブロックしました。下のボタンで結果を開いてください。",
    resultReadyUseButton: "相談レポートの準備ができました。下のボタンで結果を開いてください。",
    resultOpenedNewWindow: "相談レポートを新しいウィンドウで開きました。",
    resultFailedSubmit: "相談の生成が完了しませんでした。入力画面からもう一度お試しください。",
    profileLoadAria: "プロフィールカードから出生情報を読み込む",
    profileLoadCta: "プロフィールカードから読み込む",
    autoFilledNotice: "プロフィールカードから自動的に入力しました",
    personFieldLabels: {
      me: { nameOrNickname: "私の名前またはニックネーム", gender: "私の性別", calendarType: "私の暦（陽暦/陰暦）", birthDate: "私の生年月日", birthTime: "私の出生時刻" },
      partner: { nameOrNickname: "相手の名前またはニックネーム・任意", gender: "相手の性別・任意", calendarType: "相手の暦（陽暦/陰暦）・任意", birthDate: "相手の生年月日・任意", birthTime: "相手の出生時刻・任意" },
    },
    namePlaceholderRequired: "名前を入力してください",
    namePlaceholderOptional: "相手を呼ぶ名前",
    genderFemale: "女性",
    genderMale: "男性",
    genderUnknown: "非公開",
    solarLabel: "陽暦",
    lunarLabel: "陰暦",
    birthTimeUnknownLabel: "出生時刻不明",
    consultStyleLabel: "相談スタイル",
    questionLabel: (isCustom) => (isCustom ? "今一番気になる質問" : "今一番気になる質問・任意"),
    questionPlaceholderCustom: "今一番気になる恋愛の質問を一行でも書いてください。",
    questionPlaceholderOptional: "空欄でも相談は可能ですが、今の気持ちと状況を書くとより繊細に読み解きます。",
    readyCardHeading: "このまま相談を始めます",
    myInfoLabel: "私の情報",
    partnerInfoLabel: "相手の情報",
    meNameFallback: "私",
    partnerNameFallback: "相手",
    birthDateMissing: "生年月日未入力",
    birthTimeMissing: "出生時刻未入力",
    noPartnerInfoSummary: "相手の情報なしで私の恋愛の流れを中心に",
    promiseCardHeading: "相談で読み解く内容",
    promiseCardFooter: "計算された命式と日辰の範囲内でのみ解釈します。根拠のない断定や作られた日付は使いません。",
    generatingCardHeading: "心の温度を読み取っています",
    generatingCardSubtext: "通常1分30秒以内に終わります。ウィンドウを閉じずにしばらくお待ちください。",
    heroTitle: "恋愛秘策AI",
    heroSubtitle: "あなただけの恋愛コンサルタント",
    heroDescription: "四柱命式と恋愛心理を合わせて読み解き、今日すべきことと控えるべきことまで示します。",
    heroStartCta: "相談を始める",
    progressGeneratingSrLabel: "相談生成の進捗",
    progressFormSrLabel: "入力の進捗",
    stepLabelFormat: (step, title) => `${step}段階・${title}`,
    prevStepLabel: "戻る",
    nextStepLabel: "次へ",
    submitCta: "❤️ 恋愛秘策相談を始める",
    priceLabelPrefix: "相談利用価格 ",
    resultReadyMessage: "結果ページを開くことができます。",
    openResultNewWindowCta: "結果を新しいウィンドウで開く",
  },
  "zh-CN": {
    relationshipLabel: {
      single: "单身", crush: "暗恋中", some: "暧昧中", dating: "恋爱中", breakup: "刚分手",
      reunion: "考虑复合", marriage: "考虑结婚", complicated: "关系复杂", custom: "想知道对方的心意",
    },
    focusLabel: {
      relationshipFlow: "现在的关系将走向何方", distance: "对方的心意与距离感", reunion: "复合的可能性",
      longTerm: "结婚/长期关系的可能性", intimacy: "床笫之情与亲密节奏", timing: "联系/表白/对话的时机",
      pattern: "我需要改变的恋爱模式", custom: "直接输入",
    },
    focusHint: {
      relationshipFlow: "查看当前走势与下一步选择。", distance: "解读靠近与疏远的原因。",
      reunion: "审视能否重新靠近的温度。", longTerm: "关注长久的稳定感。",
      intimacy: "以调候解开情感温度与亲密度。", timing: "整理开口的时机与方式。",
      pattern: "指出反复出现的心理习惯。", custom: "直接写下现在最在意的问题。",
    },
    heroPromises: ["基于四柱命盘", "恋爱心理分析", "直到今天该做的事"],
    stepTitle: { status: "当前恋爱状态", focus: "咨询风格与问题", me: "我的信息", partner: "对方信息·确认" },
    stepHelper: {
      status: "请先告诉我们您现在的处境，建议的基调由此决定。",
      focus: "选择最想听的内容，并写下您想问的问题。",
      me: "用于排出命盘的出生信息。若有个人资料卡会自动填入。",
      partner: "对方信息为选填。若没有，将以我的恋爱走势为主进行解读。",
    },
    generatingSteps: [
      "正在根据出生信息排出命盘", "正在查看五行、调候、十神与神煞",
      "正在计算大运与今年走势、吉日", "正在同时撰写六个方向的咨询",
      "正在重新检查是否有缺乏依据之处", "正在准备在新窗口打开咨询报告",
    ],
    analysisItems: [
      "核心恋爱运与命盘所绘之结", "恋爱优缺点与反复出现的模式", "对方心意、缘分契合、理想型",
      "矛盾/桃花劫/复合可能性", "结婚运与今年吉月", "根据推算日辰选出的吉日",
      "暧昧策略/对话台词/魅力展现", "从今天开始的行动与7天指南",
    ],
    errorMessages: {
      loginRequired: "开始咨询需要登录。请登录后重试。",
      paymentRequired: "需要恋爱秘诀专家咨询的使用权。我们将为您打开结账页面。",
      paymentVerifyFailed: "支付确认尚未完成。如果已完成支付，请稍后重试。",
      paymentCancelled: "支付已取消。您可以在需要时再次进行。",
      invalidInput: "恋爱秘诀咨询所需信息不足。请重新确认出生日期、性别与恋爱状况。",
      questionRequired: "请至少写一行您现在最想知道的恋爱问题。",
      birthTimeRequired: "请输入出生时间，或选择“出生时间不详”。",
      serverError: "准备恋爱秘诀咨询时发生了问题。未扣除支付或使用权。",
      llmError: "生成专家咨询内容时发生了问题。如有扣除，将自动恢复。",
      networkError: "网络连接不稳定，请稍后重试。",
      resultTimeout: "咨询结果生成时间比预期更长。请稍后在结果页面重新确认。",
    },
    resumeNotice: "如果有正在进行的咨询，可以在结果页面继续查看。",
    phaseReading: "正在整理您输入的心事线索",
    phasePayment: "正在确认使用权与支付权限",
    phaseReady: "咨询报告已准备就绪",
    phaseIdle: "已准备好为您展开恋爱秘诀",
    passCheckTitle: "确认使用权",
    passCheckReason: "恋爱秘诀专家咨询",
    passCheckCompleteTitle: "使用权确认完成",
    passCheckCompleteMessage: "使用权确认已完成，正在解读您的心意走势。",
    passCheckFailedTitle: "使用权确认失败",
    resultOpeningNewWindow: "正在新窗口中准备结果页面。",
    resultBlockedPopup: "浏览器阻止了自动打开新窗口。请使用下方按钮打开结果。",
    resultReadyUseButton: "咨询报告已准备就绪，请使用下方按钮打开结果。",
    resultOpenedNewWindow: "已在新窗口中打开咨询报告。",
    resultFailedSubmit: "咨询未能生成完成，请在输入界面重新尝试。",
    profileLoadAria: "从个人资料卡加载出生信息",
    profileLoadCta: "从个人资料卡加载",
    autoFilledNotice: "已从个人资料卡自动填充",
    personFieldLabels: {
      me: { nameOrNickname: "我的姓名或昵称", gender: "我的性别", calendarType: "我的历法（阳历/阴历）", birthDate: "我的出生日期", birthTime: "我的出生时间" },
      partner: { nameOrNickname: "对方姓名或昵称·选填", gender: "对方性别·选填", calendarType: "对方历法（阳历/阴历）·选填", birthDate: "对方出生日期·选填", birthTime: "对方出生时间·选填" },
    },
    namePlaceholderRequired: "请输入姓名",
    namePlaceholderOptional: "称呼对方的名字",
    genderFemale: "女性",
    genderMale: "男性",
    genderUnknown: "不公开",
    solarLabel: "阳历",
    lunarLabel: "阴历",
    birthTimeUnknownLabel: "出生时间不详",
    consultStyleLabel: "咨询风格",
    questionLabel: (isCustom) => (isCustom ? "现在最想问的问题" : "现在最想问的问题·选填"),
    questionPlaceholderCustom: "请至少写一行您现在最想知道的恋爱问题。",
    questionPlaceholderOptional: "留空也可以进行咨询，但写下您当下的心情与状况会让解读更细腻。",
    readyCardHeading: "将以此开始咨询",
    myInfoLabel: "我的信息",
    partnerInfoLabel: "对方信息",
    meNameFallback: "我",
    partnerNameFallback: "对方",
    birthDateMissing: "出生日期未填写",
    birthTimeMissing: "出生时间未填写",
    noPartnerInfoSummary: "无对方信息，以我的恋爱走势为中心",
    promiseCardHeading: "咨询将为您解读的内容",
    promiseCardFooter: "仅在推算出的命盘与日辰范围内进行解读，不使用无依据的断言或虚构的日期。",
    generatingCardHeading: "正在解读您的心意温度",
    generatingCardSubtext: "通常在1分30秒内完成，请不要关闭窗口，稍候片刻。",
    heroTitle: "恋爱秘诀AI",
    heroSubtitle: "专属于您的恋爱顾问",
    heroDescription: "结合四柱命盘与恋爱心理，为您指出今天该做什么、该搁置什么。",
    heroStartCta: "开始咨询",
    progressGeneratingSrLabel: "咨询生成进度",
    progressFormSrLabel: "输入进度",
    stepLabelFormat: (step, title) => `第${step}步 · ${title}`,
    prevStepLabel: "上一步",
    nextStepLabel: "下一步",
    submitCta: "❤️ 开始恋爱秘诀咨询",
    priceLabelPrefix: "咨询使用价格 ",
    resultReadyMessage: "可以打开结果页面。",
    openResultNewWindowCta: "在新窗口打开结果",
  },
  "zh-TW": {
    relationshipLabel: {
      single: "單身", crush: "暗戀中", some: "曖昧中", dating: "戀愛中", breakup: "剛分手",
      reunion: "考慮復合", marriage: "考慮結婚", complicated: "關係複雜", custom: "想知道對方的心意",
    },
    focusLabel: {
      relationshipFlow: "現在的關係將走向何方", distance: "對方的心意與距離感", reunion: "復合的可能性",
      longTerm: "結婚·長期關係的可能性", intimacy: "床笫之情與親密節奏", timing: "聯繫·告白·對話的時機",
      pattern: "我需要改變的戀愛模式", custom: "直接輸入",
    },
    focusHint: {
      relationshipFlow: "查看目前走勢與下一步選擇。", distance: "解讀靠近與疏遠的原因。",
      reunion: "審視能否重新靠近的溫度。", longTerm: "關注長久的穩定感。",
      intimacy: "以調候解開情感溫度與親密度。", timing: "整理開口的時機與方式。",
      pattern: "指出反覆出現的心理習慣。", custom: "直接寫下現在最在意的問題。",
    },
    heroPromises: ["基於四柱命盤", "戀愛心理分析", "直到今天該做的事"],
    stepTitle: { status: "目前戀愛狀態", focus: "諮詢風格與問題", me: "我的資訊", partner: "對方資訊·確認" },
    stepHelper: {
      status: "請先告訴我們您目前的處境，建議的基調由此決定。",
      focus: "選擇最想聽的內容，並寫下您想問的問題。",
      me: "用於排出命盤的出生資訊。若有個人資料卡會自動填入。",
      partner: "對方資訊為選填。若沒有，將以我的戀愛走勢為主進行解讀。",
    },
    generatingSteps: [
      "正在根據出生資訊排出命盤", "正在查看五行、調候、十神與神煞",
      "正在計算大運與今年走勢、吉日", "正在同時撰寫六個方向的諮詢",
      "正在重新檢查是否有缺乏依據之處", "正在準備在新視窗開啟諮詢報告",
    ],
    analysisItems: [
      "核心戀愛運與命盤所繪之結", "戀愛優缺點與反覆出現的模式", "對方心意、緣分契合、理想型",
      "矛盾·桃花劫·復合可能性", "結婚運與今年吉月", "根據推算日辰選出的吉日",
      "曖昧策略·對話台詞·魅力展現", "從今天開始的行動與7天指南",
    ],
    errorMessages: {
      loginRequired: "開始諮詢需要登入。請登入後重試。",
      paymentRequired: "需要戀愛秘訣專家諮詢的使用權。我們將為您開啟結帳頁面。",
      paymentVerifyFailed: "付款確認尚未完成。如果已完成付款，請稍後重試。",
      paymentCancelled: "付款已取消。您可以在需要時再次進行。",
      invalidInput: "戀愛秘訣諮詢所需資訊不足。請重新確認出生日期、性別與戀愛狀況。",
      questionRequired: "請至少寫一行您現在最想知道的戀愛問題。",
      birthTimeRequired: "請輸入出生時間，或選擇「出生時間不詳」。",
      serverError: "準備戀愛秘訣諮詢時發生了問題。未扣除付款或使用權。",
      llmError: "生成專家諮詢內容時發生了問題。如有扣除，將自動恢復。",
      networkError: "網路連線不穩定，請稍後重試。",
      resultTimeout: "諮詢結果生成時間比預期更長。請稍後在結果頁面重新確認。",
    },
    resumeNotice: "如果有正在進行的諮詢，可以在結果頁面繼續查看。",
    phaseReading: "正在整理您輸入的心事線索",
    phasePayment: "正在確認使用權與付款權限",
    phaseReady: "諮詢報告已準備就緒",
    phaseIdle: "已準備好為您展開戀愛秘訣",
    passCheckTitle: "確認使用權",
    passCheckReason: "戀愛秘訣專家諮詢",
    passCheckCompleteTitle: "使用權確認完成",
    passCheckCompleteMessage: "使用權確認已完成，正在解讀您的心意走勢。",
    passCheckFailedTitle: "使用權確認失敗",
    resultOpeningNewWindow: "正在新視窗中準備結果頁面。",
    resultBlockedPopup: "瀏覽器阻止了自動開啟新視窗。請使用下方按鈕開啟結果。",
    resultReadyUseButton: "諮詢報告已準備就緒，請使用下方按鈕開啟結果。",
    resultOpenedNewWindow: "已在新視窗中開啟諮詢報告。",
    resultFailedSubmit: "諮詢未能生成完成，請在輸入畫面重新嘗試。",
    profileLoadAria: "從個人資料卡載入出生資訊",
    profileLoadCta: "從個人資料卡載入",
    autoFilledNotice: "已從個人資料卡自動填入",
    personFieldLabels: {
      me: { nameOrNickname: "我的姓名或暱稱", gender: "我的性別", calendarType: "我的曆法（陽曆/陰曆）", birthDate: "我的出生日期", birthTime: "我的出生時間" },
      partner: { nameOrNickname: "對方姓名或暱稱·選填", gender: "對方性別·選填", calendarType: "對方曆法（陽曆/陰曆）·選填", birthDate: "對方出生日期·選填", birthTime: "對方出生時間·選填" },
    },
    namePlaceholderRequired: "請輸入姓名",
    namePlaceholderOptional: "稱呼對方的名字",
    genderFemale: "女性",
    genderMale: "男性",
    genderUnknown: "不公開",
    solarLabel: "陽曆",
    lunarLabel: "陰曆",
    birthTimeUnknownLabel: "出生時間不詳",
    consultStyleLabel: "諮詢風格",
    questionLabel: (isCustom) => (isCustom ? "現在最想問的問題" : "現在最想問的問題·選填"),
    questionPlaceholderCustom: "請至少寫一行您現在最想知道的戀愛問題。",
    questionPlaceholderOptional: "留空也可以進行諮詢，但寫下您目前的心情與狀況會讓解讀更細膩。",
    readyCardHeading: "將以此開始諮詢",
    myInfoLabel: "我的資訊",
    partnerInfoLabel: "對方資訊",
    meNameFallback: "我",
    partnerNameFallback: "對方",
    birthDateMissing: "出生日期未填寫",
    birthTimeMissing: "出生時間未填寫",
    noPartnerInfoSummary: "無對方資訊，以我的戀愛走勢為中心",
    promiseCardHeading: "諮詢將為您解讀的內容",
    promiseCardFooter: "僅在推算出的命盤與日辰範圍內進行解讀，不使用無依據的斷言或虛構的日期。",
    generatingCardHeading: "正在解讀您的心意溫度",
    generatingCardSubtext: "通常在1分30秒內完成，請不要關閉視窗，稍候片刻。",
    heroTitle: "戀愛秘訣AI",
    heroSubtitle: "專屬於您的戀愛顧問",
    heroDescription: "結合四柱命盤與戀愛心理，為您指出今天該做什麼、該擱置什麼。",
    heroStartCta: "開始諮詢",
    progressGeneratingSrLabel: "諮詢生成進度",
    progressFormSrLabel: "輸入進度",
    stepLabelFormat: (step, title) => `第${step}步 · ${title}`,
    prevStepLabel: "上一步",
    nextStepLabel: "下一步",
    submitCta: "❤️ 開始戀愛秘訣諮詢",
    priceLabelPrefix: "諮詢使用價格 ",
    resultReadyMessage: "可以開啟結果頁面。",
    openResultNewWindowCta: "在新視窗開啟結果",
  },
  vi: {
    relationshipLabel: {
      single: "Độc thân", crush: "Đang thầm thích ai đó", some: "Đang mập mờ", dating: "Đang hẹn hò",
      breakup: "Vừa chia tay", reunion: "Đang cân nhắc tái hợp", marriage: "Đang cân nhắc kết hôn",
      complicated: "Mối quan hệ phức tạp", custom: "Muốn biết lòng đối phương",
    },
    focusLabel: {
      relationshipFlow: "Mối quan hệ hiện tại sẽ đi về đâu", distance: "Lòng và khoảng cách của đối phương",
      reunion: "Khả năng tái hợp", longTerm: "Khả năng kết hôn-mối quan hệ lâu dài",
      intimacy: "Sự hòa hợp và nhịp điệu thân mật", timing: "Thời điểm liên lạc-tỏ tình-trò chuyện",
      pattern: "Thói quen yêu đương tôi cần thay đổi", custom: "Tự nhập",
    },
    focusHint: {
      relationshipFlow: "Xem dòng chảy hiện tại và lựa chọn tiếp theo.",
      distance: "Đọc lý do của sự gần gũi và xa cách.",
      reunion: "Xem xét độ ấm áp để có thể kết nối lại.",
      longTerm: "Xem sự ổn định lâu dài.",
      intimacy: "Giải mã nhiệt độ cảm xúc và sự thân mật qua điều hầu.",
      timing: "Sắp xếp thời điểm và cách nói ra.",
      pattern: "Chỉ ra thói quen tâm lý lặp lại.",
      custom: "Viết trực tiếp câu hỏi đang trăn trở nhất lúc này.",
    },
    heroPromises: ["Dựa trên lá số Tứ Trụ", "Phân tích tâm lý tình yêu", "Đến cả việc nên làm hôm nay"],
    stepTitle: { status: "Tình trạng tình cảm hiện tại", focus: "Phong cách tư vấn và câu hỏi", me: "Thông tin của tôi", partner: "Thông tin đối phương · Xác nhận" },
    stepHelper: {
      status: "Hãy cho chúng tôi biết bạn đang đứng ở đâu trước. Điều này quyết định giọng điệu của lời khuyên.",
      focus: "Hãy chọn điều bạn muốn nghe nhất và viết câu hỏi của bạn như nó vốn có.",
      me: "Thông tin ngày sinh để lập lá số. Sẽ tự động điền nếu bạn có thẻ hồ sơ.",
      partner: "Thông tin đối phương là tùy chọn. Nếu không có, chúng tôi sẽ đọc dòng chảy tình yêu của bạn là chính.",
    },
    generatingSteps: [
      "Đang lập lá số từ thông tin ngày sinh", "Đang xem xét Ngũ Hành, điều hầu, Thập Thần và Thần Sát",
      "Đang tính toán Đại Vận, dòng chảy năm nay và ngày tốt", "Đang viết đồng thời sáu nhánh tư vấn",
      "Đang đọc lại để đảm bảo không thiếu bằng chứng", "Đang chuẩn bị mở báo cáo tư vấn trong cửa sổ mới",
    ],
    analysisItems: [
      "Vận tình yêu cốt lõi và kết cấu lá số vẽ nên", "Điểm mạnh-yếu tình yêu và các khuôn mẫu lặp lại",
      "Lòng đối phương, hợp duyên, mẫu người lý tưởng", "Xung đột-lăng nhăng-khả năng tái hợp",
      "Vận kết hôn và các tháng tốt năm nay", "Ngày tốt được chọn từ nhật thần đã tính",
      "Chiến lược mập mờ-câu trò chuyện-tạo sức hút", "Việc cần làm từ hôm nay và hướng dẫn 7 ngày",
    ],
    errorMessages: {
      loginRequired: "Bạn cần đăng nhập để bắt đầu tư vấn. Vui lòng đăng nhập và thử lại.",
      paymentRequired: "Bạn cần có thẻ sử dụng cho buổi tư vấn chuyên gia Bí Quyết Tình Yêu. Chúng tôi sẽ mở trang thanh toán cho bạn.",
      paymentVerifyFailed: "Xác nhận thanh toán chưa hoàn tất. Nếu bạn đã thanh toán, vui lòng thử lại sau ít phút.",
      paymentCancelled: "Thanh toán đã bị hủy. Bạn có thể tiến hành lại khi cần.",
      invalidInput: "Thiếu thông tin cần thiết cho buổi tư vấn Bí Quyết Tình Yêu. Vui lòng kiểm tra lại ngày sinh, giới tính và tình trạng tình cảm.",
      questionRequired: "Vui lòng viết ít nhất một dòng về câu hỏi tình yêu bạn đang tò mò nhất lúc này.",
      birthTimeRequired: "Vui lòng nhập giờ sinh hoặc chọn 'không rõ giờ sinh'.",
      serverError: "Đã xảy ra sự cố khi chuẩn bị buổi tư vấn Bí Quyết Tình Yêu. Không có khoản thanh toán hay thẻ sử dụng nào bị trừ.",
      llmError: "Đã xảy ra sự cố khi tạo nội dung tư vấn chuyên gia. Nếu có khoản đã bị trừ, nó sẽ được khôi phục tự động.",
      networkError: "Kết nối không ổn định. Vui lòng thử lại sau ít phút.",
      resultTimeout: "Việc tạo kết quả tư vấn đang mất nhiều thời gian hơn dự kiến. Vui lòng kiểm tra lại trên trang kết quả sau ít phút.",
    },
    resumeNotice: "Nếu có buổi tư vấn đang tiến hành, bạn có thể tiếp tục theo dõi trên trang kết quả.",
    phaseReading: "Đang sắp xếp những manh mối tâm tư bạn đã nhập",
    phasePayment: "Đang xác minh thẻ sử dụng và quyền thanh toán",
    phaseReady: "Báo cáo tư vấn của bạn đã sẵn sàng",
    phaseIdle: "Đã sẵn sàng để mở ra Bí Quyết Tình Yêu của bạn",
    passCheckTitle: "Đang kiểm tra thẻ sử dụng",
    passCheckReason: "Tư vấn chuyên gia Bí Quyết Tình Yêu",
    passCheckCompleteTitle: "Kiểm tra thẻ sử dụng hoàn tất",
    passCheckCompleteMessage: "Đã hoàn tất kiểm tra thẻ sử dụng. Đang đọc dòng chảy trong lòng bạn.",
    passCheckFailedTitle: "Kiểm tra thẻ sử dụng thất bại",
    resultOpeningNewWindow: "Đang chuẩn bị trang kết quả trong cửa sổ mới.",
    resultBlockedPopup: "Trình duyệt của bạn đã chặn việc tự động mở cửa sổ mới. Vui lòng dùng nút bên dưới để mở kết quả.",
    resultReadyUseButton: "Báo cáo tư vấn của bạn đã sẵn sàng. Vui lòng dùng nút bên dưới để mở kết quả.",
    resultOpenedNewWindow: "Đã mở báo cáo tư vấn trong cửa sổ mới.",
    resultFailedSubmit: "Việc tạo tư vấn chưa hoàn tất. Vui lòng thử lại từ màn hình nhập liệu.",
    profileLoadAria: "Tải thông tin sinh từ thẻ hồ sơ",
    profileLoadCta: "Tải từ thẻ hồ sơ",
    autoFilledNotice: "Đã tự động điền từ thẻ hồ sơ",
    personFieldLabels: {
      me: { nameOrNickname: "Tên hoặc biệt danh của tôi", gender: "Giới tính của tôi", calendarType: "Lịch của tôi (Dương/Âm)", birthDate: "Ngày sinh của tôi", birthTime: "Giờ sinh của tôi" },
      partner: { nameOrNickname: "Tên hoặc biệt danh của đối phương · tùy chọn", gender: "Giới tính của đối phương · tùy chọn", calendarType: "Lịch của đối phương (Dương/Âm) · tùy chọn", birthDate: "Ngày sinh của đối phương · tùy chọn", birthTime: "Giờ sinh của đối phương · tùy chọn" },
    },
    namePlaceholderRequired: "Vui lòng nhập tên của bạn",
    namePlaceholderOptional: "Tên để gọi đối phương",
    genderFemale: "Nữ",
    genderMale: "Nam",
    genderUnknown: "Không công khai",
    solarLabel: "Dương lịch",
    lunarLabel: "Âm lịch",
    birthTimeUnknownLabel: "Không rõ giờ sinh",
    consultStyleLabel: "Phong cách tư vấn",
    questionLabel: (isCustom) => (isCustom ? "Câu hỏi bạn tò mò nhất lúc này" : "Câu hỏi bạn tò mò nhất lúc này · tùy chọn"),
    questionPlaceholderCustom: "Vui lòng viết ít nhất một dòng về câu hỏi tình yêu bạn đang tò mò nhất lúc này.",
    questionPlaceholderOptional: "Bạn có thể để trống, nhưng viết ra tâm trạng và tình huống hiện tại sẽ giúp bài đọc tinh tế hơn.",
    readyCardHeading: "Bắt đầu tư vấn với những thông tin này",
    myInfoLabel: "Thông tin của tôi",
    partnerInfoLabel: "Thông tin đối phương",
    meNameFallback: "Tôi",
    partnerNameFallback: "Đối phương",
    birthDateMissing: "Chưa nhập ngày sinh",
    birthTimeMissing: "Chưa nhập giờ sinh",
    noPartnerInfoSummary: "Tập trung vào dòng chảy tình yêu của tôi, không có thông tin đối phương",
    promiseCardHeading: "Những điều buổi tư vấn sẽ đọc cho bạn",
    promiseCardFooter: "Chỉ diễn giải trong phạm vi lá số và nhật thần đã tính toán. Không đưa ra khẳng định vô căn cứ hay ngày tháng bịa đặt.",
    generatingCardHeading: "Đang đọc nhiệt độ trong lòng bạn",
    generatingCardSubtext: "Thường hoàn tất trong khoảng 90 giây. Vui lòng đừng đóng cửa sổ này và chờ một chút.",
    heroTitle: "Bí Quyết Tình Yêu AI",
    heroSubtitle: "Một Chuyên Gia Tư Vấn Tình Yêu Chỉ Dành Cho Bạn",
    heroDescription: "Chúng tôi đọc lá số Tứ Trụ cùng với tâm lý tình yêu để chỉ rõ những gì nên làm và nên hoãn lại hôm nay.",
    heroStartCta: "Bắt Đầu Tư Vấn",
    progressGeneratingSrLabel: "Tiến độ tạo tư vấn",
    progressFormSrLabel: "Tiến độ nhập liệu",
    stepLabelFormat: (step, title) => `Bước ${step} · ${title}`,
    prevStepLabel: "Quay lại",
    nextStepLabel: "Tiếp theo",
    submitCta: "❤️ Bắt Đầu Tư Vấn Bí Quyết Tình Yêu",
    priceLabelPrefix: "Giá sử dụng tư vấn ",
    resultReadyMessage: "Bạn có thể mở trang kết quả.",
    openResultNewWindowCta: "Mở Kết Quả Trong Cửa Sổ Mới",
  },
  hi: {
    relationshipLabel: {
      single: "सिंगल", crush: "किसी को पसंद करना", some: "अनिश्चित रिश्ते में", dating: "रिलेशनशिप में",
      breakup: "अभी-अभी ब्रेकअप हुआ", reunion: "पुनर्मिलन पर विचार कर रहे", marriage: "शादी पर विचार कर रहे",
      complicated: "रिश्ता जटिल है", custom: "साथी के मन को जानना चाहते हैं",
    },
    focusLabel: {
      relationshipFlow: "यह रिश्ता कहाँ जा रहा है", distance: "साथी की भावनाएं और दूरी", reunion: "पुनर्मिलन की संभावना",
      longTerm: "शादी-दीर्घकालिक रिश्ते की संभावना", intimacy: "अनुकूलता और अंतरंगता की लय", timing: "संपर्क-इज़हार-बातचीत का समय",
      pattern: "मुझे बदलने वाली प्रेम आदत", custom: "स्वयं लिखें",
    },
    focusHint: {
      relationshipFlow: "वर्तमान प्रवाह और अगला विकल्प देखता है।", distance: "नज़दीकी और दूरी के कारणों को पढ़ता है।",
      reunion: "फिर से जुड़ने की गर्माहट को परखता है।", longTerm: "स्थायी स्थिरता को देखता है।",
      intimacy: "भावनात्मक तापमान और अंतरंगता को सुलझाता है।", timing: "कब और कैसे बात करें, यह तय करता है।",
      pattern: "बार-बार दोहराई जाने वाली आदत को इंगित करता है।", custom: "अभी सबसे ज़्यादा परेशान करने वाला सवाल सीधे लिखें।",
    },
    heroPromises: ["जन्म कुंडली पर आधारित", "प्रेम मनोविज्ञान विश्लेषण", "आज क्या करना है तक"],
    stepTitle: { status: "आपकी वर्तमान रिश्ते की स्थिति", focus: "परामर्श शैली और प्रश्न", me: "मेरी जानकारी", partner: "साथी की जानकारी · पुष्टि" },
    stepHelper: {
      status: "पहले हमें बताएं कि आप कहाँ खड़े हैं। सलाह का लहजा यहीं तय होता है।",
      focus: "जो सबसे ज़्यादा सुनना चाहते हैं उसे चुनें, और अपना सवाल जैसा है वैसा लिखें।",
      me: "आपकी कुंडली बनाने के लिए जन्म जानकारी। प्रोफ़ाइल कार्ड होने पर स्वतः भर जाती है।",
      partner: "साथी की जानकारी वैकल्पिक है। न होने पर हम आपके प्रेम प्रवाह को केंद्र में रखकर पढ़ेंगे।",
    },
    generatingSteps: [
      "जन्म जानकारी से कुंडली बनाई जा रही है", "पंचतत्व, ऋतु संतुलन, दस देवता और शुभ-अशुभ सितारों की जांच हो रही है",
      "महादशा, इस वर्ष का प्रवाह और शुभ तिथियां गणना हो रही हैं", "छह दिशाओं में परामर्श एक साथ लिखा जा रहा है",
      "कोई प्रमाण छूटा तो नहीं, दोबारा जांचा जा रहा है", "परामर्श रिपोर्ट को नई विंडो में खोलने की तैयारी हो रही है",
    ],
    analysisItems: [
      "मुख्य प्रेम भाग्य और कुंडली से बनने वाला पैटर्न", "प्रेम की खूबियां-कमियां और दोहराए जाने वाले पैटर्न",
      "साथी का मन, अनुकूलता, आदर्श साथी", "टकराव-भटकाव-पुनर्मिलन की संभावना",
      "विवाह भाग्य और इस वर्ष के शुभ महीने", "गणना की गई तिथियों से चुने गए शुभ दिन",
      "अनिश्चित रिश्ते की रणनीति-बातचीत के वाक्य-आकर्षण की प्रस्तुति", "आज से करने योग्य कार्य और 7-दिवसीय गाइड",
    ],
    errorMessages: {
      loginRequired: "परामर्श शुरू करने के लिए लॉगिन आवश्यक है। कृपया लॉगिन कर पुनः प्रयास करें।",
      paymentRequired: "लव सीक्रेट विशेषज्ञ परामर्श के लिए पास आवश्यक है। हम आपके लिए चेकआउट खोलेंगे।",
      paymentVerifyFailed: "भुगतान की पुष्टि पूरी नहीं हुई है। यदि आपने पहले ही भुगतान कर दिया है, तो कृपया थोड़ी देर बाद पुनः प्रयास करें।",
      paymentCancelled: "भुगतान रद्द कर दिया गया। आवश्यकता होने पर आप फिर से आगे बढ़ सकते हैं।",
      invalidInput: "लव सीक्रेट परामर्श के लिए आवश्यक जानकारी अधूरी है। कृपया जन्म तिथि, लिंग और रिश्ते की स्थिति पुनः जांचें।",
      questionRequired: "कृपया अभी अपने सबसे उत्सुक प्रेम प्रश्न के बारे में कम से कम एक पंक्ति लिखें।",
      birthTimeRequired: "कृपया अपना जन्म समय दर्ज करें या 'जन्म समय अज्ञात' चुनें।",
      serverError: "लव सीक्रेट परामर्श तैयार करते समय समस्या हुई। कोई भुगतान या पास नहीं काटा गया।",
      llmError: "विशेषज्ञ परामर्श सामग्री बनाते समय समस्या हुई। यदि कुछ काटा गया है, तो वह स्वतः बहाल हो जाएगा।",
      networkError: "कनेक्शन अस्थिर है। कृपया थोड़ी देर बाद पुनः प्रयास करें।",
      resultTimeout: "परामर्श परिणाम बनने में अपेक्षा से अधिक समय लग रहा है। कृपया थोड़ी देर बाद परिणाम पृष्ठ पर पुनः जांचें।",
    },
    resumeNotice: "यदि कोई परामर्श पहले से चल रहा है, तो आप उसे परिणाम पृष्ठ पर आगे देख सकते हैं।",
    phaseReading: "आपके द्वारा दर्ज किए गए मन के सुरागों को व्यवस्थित किया जा रहा है",
    phasePayment: "पास और भुगतान अनुमति की जांच हो रही है",
    phaseReady: "आपकी परामर्श रिपोर्ट तैयार है",
    phaseIdle: "आपके लव सीक्रेट को खोलने की तैयारी हो चुकी है",
    passCheckTitle: "पास की जांच हो रही है",
    passCheckReason: "लव सीक्रेट विशेषज्ञ परामर्श",
    passCheckCompleteTitle: "पास जांच पूर्ण",
    passCheckCompleteMessage: "पास की जांच पूरी हो गई है। आपके मन के प्रवाह को पढ़ा जा रहा है।",
    passCheckFailedTitle: "पास जांच विफल",
    resultOpeningNewWindow: "परिणाम पृष्ठ को नई विंडो में तैयार किया जा रहा है।",
    resultBlockedPopup: "आपके ब्राउज़र ने स्वचालित रूप से नई विंडो खोलने से रोक दिया। कृपया नीचे दिए गए बटन से परिणाम खोलें।",
    resultReadyUseButton: "आपकी परामर्श रिपोर्ट तैयार है। कृपया नीचे दिए गए बटन से परिणाम खोलें।",
    resultOpenedNewWindow: "परामर्श रिपोर्ट को नई विंडो में खोला गया।",
    resultFailedSubmit: "परामर्श का निर्माण पूरा नहीं हुआ। कृपया इनपुट स्क्रीन से पुनः प्रयास करें।",
    profileLoadAria: "प्रोफ़ाइल कार्ड से जन्म जानकारी लोड करें",
    profileLoadCta: "प्रोफ़ाइल कार्ड से लोड करें",
    autoFilledNotice: "प्रोफ़ाइल कार्ड से स्वतः भरा गया",
    personFieldLabels: {
      me: { nameOrNickname: "मेरा नाम या उपनाम", gender: "मेरा लिंग", calendarType: "मेरा कैलेंडर (सौर/चंद्र)", birthDate: "मेरी जन्म तिथि", birthTime: "मेरा जन्म समय" },
      partner: { nameOrNickname: "साथी का नाम या उपनाम · वैकल्पिक", gender: "साथी का लिंग · वैकल्पिक", calendarType: "साथी का कैलेंडर (सौर/चंद्र) · वैकल्पिक", birthDate: "साथी की जन्म तिथि · वैकल्पिक", birthTime: "साथी का जन्म समय · वैकल्पिक" },
    },
    namePlaceholderRequired: "कृपया अपना नाम दर्ज करें",
    namePlaceholderOptional: "साथी को बुलाने वाला नाम",
    genderFemale: "महिला",
    genderMale: "पुरुष",
    genderUnknown: "निजी",
    solarLabel: "सौर",
    lunarLabel: "चंद्र",
    birthTimeUnknownLabel: "जन्म समय अज्ञात",
    consultStyleLabel: "परामर्श शैली",
    questionLabel: (isCustom) => (isCustom ? "अभी सबसे उत्सुक प्रश्न" : "अभी सबसे उत्सुक प्रश्न · वैकल्पिक"),
    questionPlaceholderCustom: "कृपया अभी अपने सबसे उत्सुक प्रेम प्रश्न के बारे में कम से कम एक पंक्ति लिखें।",
    questionPlaceholderOptional: "खाली छोड़ने पर भी परामर्श संभव है, लेकिन अपनी वर्तमान भावना और स्थिति लिखने पर पठन अधिक सूक्ष्म होगा।",
    readyCardHeading: "इसी के साथ परामर्श शुरू करेंगे",
    myInfoLabel: "मेरी जानकारी",
    partnerInfoLabel: "साथी की जानकारी",
    meNameFallback: "मैं",
    partnerNameFallback: "साथी",
    birthDateMissing: "जन्म तिथि दर्ज नहीं की गई",
    birthTimeMissing: "जन्म समय दर्ज नहीं किया गया",
    noPartnerInfoSummary: "साथी की जानकारी के बिना मेरे प्रेम प्रवाह पर केंद्रित",
    promiseCardHeading: "परामर्श में क्या पढ़ा जाएगा",
    promiseCardFooter: "केवल गणना की गई कुंडली और तिथियों के भीतर ही व्याख्या की जाती है। बिना आधार के दावे या गढ़ी गई तारीखों का उपयोग नहीं किया जाता।",
    generatingCardHeading: "आपके मन का तापमान पढ़ा जा रहा है",
    generatingCardSubtext: "आमतौर पर लगभग 90 सेकंड में पूरा होता है। कृपया विंडो बंद न करें और थोड़ी देर प्रतीक्षा करें।",
    heroTitle: "लव सीक्रेट AI",
    heroSubtitle: "केवल आपके लिए एक प्रेम सलाहकार",
    heroDescription: "हम जन्म कुंडली को प्रेम मनोविज्ञान के साथ मिलाकर पढ़ते हैं, ताकि आज क्या करना है और क्या टालना है, यह भी बता सकें।",
    heroStartCta: "परामर्श शुरू करें",
    progressGeneratingSrLabel: "परामर्श निर्माण प्रगति",
    progressFormSrLabel: "इनपुट प्रगति",
    stepLabelFormat: (step, title) => `चरण ${step} · ${title}`,
    prevStepLabel: "पीछे",
    nextStepLabel: "आगे",
    submitCta: "❤️ लव सीक्रेट परामर्श शुरू करें",
    priceLabelPrefix: "परामर्श उपयोग मूल्य ",
    resultReadyMessage: "आप परिणाम पृष्ठ खोल सकते हैं।",
    openResultNewWindowCta: "परिणाम को नई विंडो में खोलें",
  },
  es: {
    relationshipLabel: {
      single: "Soltero/a", crush: "Enamorado/a en secreto", some: "En una relación indefinida", dating: "En una relación",
      breakup: "Recién separado/a", reunion: "Considerando reconciliarse", marriage: "Considerando el matrimonio",
      complicated: "Relación complicada", custom: "Quiere saber los sentimientos de la otra persona",
    },
    focusLabel: {
      relationshipFlow: "Hacia dónde va esta relación", distance: "Los sentimientos y la distancia de la otra persona",
      reunion: "Posibilidad de reconciliación", longTerm: "Posibilidad de matrimonio o relación a largo plazo",
      intimacy: "Compatibilidad y ritmo de intimidad", timing: "El momento para contactar, confesar o hablar",
      pattern: "El patrón amoroso que debo cambiar", custom: "Escribir yo mismo/a",
    },
    focusHint: {
      relationshipFlow: "Observa el flujo actual y la próxima elección.",
      distance: "Lee las razones detrás de la cercanía y el distanciamiento.",
      reunion: "Examina la calidez de una posible reconexión.",
      longTerm: "Observa la estabilidad duradera.",
      intimacy: "Resuelve la temperatura emocional y la intimidad mediante el equilibrio elemental.",
      timing: "Ordena cuándo y cómo hablar.",
      pattern: "Señala los hábitos emocionales que se repiten.",
      custom: "Escribe directamente la pregunta que más te preocupa ahora.",
    },
    heroPromises: ["Basado en tu carta natal", "Análisis de psicología amorosa", "Hasta qué hacer hoy"],
    stepTitle: { status: "Tu estado sentimental actual", focus: "Estilo de consulta y pregunta", me: "Mi información", partner: "Información de la pareja · Confirmar" },
    stepHelper: {
      status: "Cuéntanos primero dónde te encuentras. El tono del consejo se define aquí.",
      focus: "Elige lo que más quieres escuchar y escribe tu pregunta tal como es.",
      me: "Información de nacimiento para construir tu carta. Se completa automáticamente si tienes una tarjeta de perfil.",
      partner: "La información de la pareja es opcional. Sin ella, leeremos principalmente tu propio flujo amoroso.",
    },
    generatingSteps: [
      "Construyendo tu carta a partir de tu información de nacimiento", "Examinando los Cinco Elementos, el equilibrio estacional, los Diez Dioses y las estrellas divinas",
      "Calculando tu Gran Fortuna, el flujo de este año y las buenas fechas", "Escribiendo seis ramas de la consulta a la vez",
      "Releyendo para asegurarnos de que no falte evidencia en ninguna parte", "Preparándonos para abrir el informe de la consulta en una nueva ventana",
    ],
    analysisItems: [
      "La fortuna amorosa central y el patrón que dibuja tu carta", "Fortalezas y debilidades amorosas y patrones recurrentes",
      "Los sentimientos de la otra persona, compatibilidad y tipo ideal", "Conflicto, infidelidad, posibilidad de reconciliación",
      "Fortuna matrimonial y los buenos meses de este año", "Buenas fechas elegidas según los pilares del día calculados",
      "Estrategia para relaciones indefinidas, frases de conversación, estilo de encanto", "Qué hacer a partir de hoy y una guía de 7 días",
    ],
    errorMessages: {
      loginRequired: "Necesitas iniciar sesión para comenzar la consulta. Por favor, inicia sesión e inténtalo de nuevo.",
      paymentRequired: "Necesitas un pase para la consulta experta de Secreto del Amor. Te abriremos la pantalla de pago.",
      paymentVerifyFailed: "La confirmación del pago no se ha completado. Si ya pagaste, inténtalo de nuevo en unos momentos.",
      paymentCancelled: "El pago fue cancelado. Puedes continuar de nuevo cuando lo necesites.",
      invalidInput: "Falta información necesaria para la consulta de Secreto del Amor. Vuelve a verificar tu fecha de nacimiento, género y estado sentimental.",
      questionRequired: "Escribe al menos una línea sobre la pregunta amorosa que más te intriga ahora mismo.",
      birthTimeRequired: "Introduce tu hora de nacimiento o selecciona 'hora de nacimiento desconocida'.",
      serverError: "Ocurrió un problema al preparar la consulta de Secreto del Amor. No se cobró ningún pago ni pase.",
      llmError: "Ocurrió un problema al generar el contenido de la consulta experta. Si se cobró algo, se restaurará automáticamente.",
      networkError: "La conexión es inestable. Inténtalo de nuevo en unos momentos.",
      resultTimeout: "La generación del resultado de la consulta está tardando más de lo esperado. Vuelve a verificar en la página de resultados en unos momentos.",
    },
    resumeNotice: "Si tienes una consulta en curso, puedes seguir revisándola en la página de resultados.",
    phaseReading: "Organizando las pistas de tu corazón que ingresaste",
    phasePayment: "Verificando tu pase y autorización de pago",
    phaseReady: "Tu informe de consulta está listo",
    phaseIdle: "Listo para desplegar tu Secreto del Amor",
    passCheckTitle: "Verificando el pase",
    passCheckReason: "Consulta experta de Secreto del Amor",
    passCheckCompleteTitle: "Verificación del pase completada",
    passCheckCompleteMessage: "Verificación del pase completada. Leyendo el flujo de tu corazón.",
    passCheckFailedTitle: "Verificación del pase fallida",
    resultOpeningNewWindow: "Preparando la página de resultados en una nueva ventana.",
    resultBlockedPopup: "Tu navegador bloqueó la apertura automática de una nueva ventana. Usa el botón de abajo para abrir el resultado.",
    resultReadyUseButton: "Tu informe de consulta está listo. Usa el botón de abajo para abrir el resultado.",
    resultOpenedNewWindow: "Se abrió el informe de consulta en una nueva ventana.",
    resultFailedSubmit: "La consulta no se completó. Inténtalo de nuevo desde la pantalla de entrada.",
    profileLoadAria: "Cargar información de nacimiento desde tu tarjeta de perfil",
    profileLoadCta: "Cargar desde la tarjeta de perfil",
    autoFilledNotice: "Completado automáticamente desde tu tarjeta de perfil",
    personFieldLabels: {
      me: { nameOrNickname: "Mi nombre o apodo", gender: "Mi género", calendarType: "Mi calendario (solar/lunar)", birthDate: "Mi fecha de nacimiento", birthTime: "Mi hora de nacimiento" },
      partner: { nameOrNickname: "Nombre o apodo de la pareja · opcional", gender: "Género de la pareja · opcional", calendarType: "Calendario de la pareja (solar/lunar) · opcional", birthDate: "Fecha de nacimiento de la pareja · opcional", birthTime: "Hora de nacimiento de la pareja · opcional" },
    },
    namePlaceholderRequired: "Introduce tu nombre",
    namePlaceholderOptional: "Un nombre para llamar a tu pareja",
    genderFemale: "Femenino",
    genderMale: "Masculino",
    genderUnknown: "Privado",
    solarLabel: "Solar",
    lunarLabel: "Lunar",
    birthTimeUnknownLabel: "Hora de nacimiento desconocida",
    consultStyleLabel: "Estilo de consulta",
    questionLabel: (isCustom) => (isCustom ? "La pregunta que más te intriga ahora" : "La pregunta que más te intriga ahora · opcional"),
    questionPlaceholderCustom: "Escribe al menos una línea sobre la pregunta amorosa que más te intriga ahora mismo.",
    questionPlaceholderOptional: "Puedes dejarlo en blanco, pero escribir tus sentimientos y situación actuales dará una lectura más matizada.",
    readyCardHeading: "Comenzando la consulta con esto",
    myInfoLabel: "Mi información",
    partnerInfoLabel: "Información de la pareja",
    meNameFallback: "Yo",
    partnerNameFallback: "Pareja",
    birthDateMissing: "Fecha de nacimiento no ingresada",
    birthTimeMissing: "Hora de nacimiento no ingresada",
    noPartnerInfoSummary: "Centrado en mi flujo amoroso, sin información de la pareja",
    promiseCardHeading: "Lo que esta consulta te revelará",
    promiseCardFooter: "Interpretado solo a partir de tu carta calculada y los pilares del día. Sin afirmaciones infundadas ni fechas inventadas.",
    generatingCardHeading: "Leyendo la temperatura de tu corazón",
    generatingCardSubtext: "Generalmente termina en unos 90 segundos. No cierres esta ventana y espera un momento.",
    heroTitle: "Secreto del Amor IA",
    heroSubtitle: "Un consultor amoroso solo para ti",
    heroDescription: "Leemos tu carta natal junto con la psicología amorosa para señalar exactamente qué hacer hoy y qué posponer.",
    heroStartCta: "Iniciar la Consulta",
    progressGeneratingSrLabel: "Progreso de generación de la consulta",
    progressFormSrLabel: "Progreso de entrada",
    stepLabelFormat: (step, title) => `Paso ${step} · ${title}`,
    prevStepLabel: "Atrás",
    nextStepLabel: "Siguiente",
    submitCta: "❤️ Iniciar la Consulta de Secreto del Amor",
    priceLabelPrefix: "Precio de la consulta ",
    resultReadyMessage: "Puedes abrir la página de resultados.",
    openResultNewWindowCta: "Abrir Resultado en Nueva Ventana",
  },
  fr: {
    relationshipLabel: {
      single: "Célibataire", crush: "Amoureux(se) en secret", some: "Relation indéfinie", dating: "En couple",
      breakup: "Rupture récente", reunion: "Envisage une réconciliation", marriage: "Envisage le mariage",
      complicated: "Relation compliquée", custom: "Veut connaître les sentiments de l'autre",
    },
    focusLabel: {
      relationshipFlow: "Où va cette relation", distance: "Les sentiments et la distance de l'autre",
      reunion: "Possibilité de réconciliation", longTerm: "Possibilité de mariage ou de relation à long terme",
      intimacy: "Compatibilité et rythme d'intimité", timing: "Le moment pour contacter, avouer ou parler",
      pattern: "Le schéma amoureux que je dois changer", custom: "Écrire moi-même",
    },
    focusHint: {
      relationshipFlow: "Observe le flux actuel et le prochain choix.",
      distance: "Lit les raisons de la proximité et de l'éloignement.",
      reunion: "Examine la chaleur d'une possible reconnexion.",
      longTerm: "Observe la stabilité durable.",
      intimacy: "Résout la température émotionnelle et l'intimité par l'équilibre des éléments.",
      timing: "Organise quand et comment en parler.",
      pattern: "Souligne les habitudes émotionnelles récurrentes.",
      custom: "Écrivez directement la question qui vous préoccupe le plus en ce moment.",
    },
    heroPromises: ["Basé sur votre thème natal", "Analyse de la psychologie amoureuse", "Jusqu'à quoi faire aujourd'hui"],
    stepTitle: { status: "Votre état sentimental actuel", focus: "Style de consultation et question", me: "Mes informations", partner: "Informations sur le/la partenaire · Confirmation" },
    stepHelper: {
      status: "Dites-nous d'abord où vous en êtes. Le ton du conseil se définit ici.",
      focus: "Choisissez ce que vous voulez le plus entendre et écrivez votre question telle quelle.",
      me: "Informations de naissance pour établir votre thème. Rempli automatiquement si vous avez une carte de profil.",
      partner: "Les informations du/de la partenaire sont facultatives. Sans elles, nous lirons principalement votre propre flux amoureux.",
    },
    generatingSteps: [
      "Construction de votre thème à partir de vos informations de naissance", "Examen des Cinq Éléments, de l'équilibre saisonnier, des Dix Dieux et des étoiles divines",
      "Calcul de votre Grande Fortune, du flux de cette année et des bonnes dates", "Rédaction simultanée de six branches de consultation",
      "Relecture pour s'assurer qu'aucune preuve ne manque", "Préparation de l'ouverture du rapport de consultation dans une nouvelle fenêtre",
    ],
    analysisItems: [
      "La fortune amoureuse centrale et le schéma que dessine votre thème", "Forces et faiblesses amoureuses et schémas récurrents",
      "Les sentiments de l'autre, la compatibilité et le type idéal", "Conflit, infidélité, possibilité de réconciliation",
      "Fortune matrimoniale et bons mois de cette année", "Bonnes dates choisies selon les piliers du jour calculés",
      "Stratégie de relation indéfinie, phrases de conversation, mise en valeur du charme", "Ce qu'il faut faire à partir d'aujourd'hui et un guide de 7 jours",
    ],
    errorMessages: {
      loginRequired: "Vous devez vous connecter pour commencer la consultation. Veuillez vous connecter et réessayer.",
      paymentRequired: "Vous avez besoin d'un pass pour la consultation experte Secret de l'Amour. Nous allons ouvrir la page de paiement pour vous.",
      paymentVerifyFailed: "La confirmation du paiement n'est pas terminée. Si vous avez déjà payé, veuillez réessayer dans un instant.",
      paymentCancelled: "Le paiement a été annulé. Vous pouvez recommencer quand vous le souhaitez.",
      invalidInput: "Il manque des informations nécessaires pour la consultation Secret de l'Amour. Veuillez revérifier votre date de naissance, votre genre et votre situation sentimentale.",
      questionRequired: "Veuillez écrire au moins une ligne sur la question amoureuse qui vous intrigue le plus en ce moment.",
      birthTimeRequired: "Veuillez saisir votre heure de naissance ou sélectionner « heure de naissance inconnue ».",
      serverError: "Un problème est survenu lors de la préparation de la consultation Secret de l'Amour. Aucun paiement ni pass n'a été débité.",
      llmError: "Un problème est survenu lors de la génération du contenu de la consultation experte. Si quelque chose a été débité, il sera automatiquement restauré.",
      networkError: "La connexion est instable. Veuillez réessayer dans un instant.",
      resultTimeout: "La génération du résultat de la consultation prend plus de temps que prévu. Veuillez revérifier sur la page de résultats dans un instant.",
    },
    resumeNotice: "Si vous avez une consultation en cours, vous pouvez continuer à la consulter sur la page de résultats.",
    phaseReading: "Organisation des indices de votre cœur que vous avez saisis",
    phasePayment: "Vérification de votre pass et de votre autorisation de paiement",
    phaseReady: "Votre rapport de consultation est prêt",
    phaseIdle: "Prêt à dévoiler votre Secret de l'Amour",
    passCheckTitle: "Vérification du pass",
    passCheckReason: "Consultation experte Secret de l'Amour",
    passCheckCompleteTitle: "Vérification du pass terminée",
    passCheckCompleteMessage: "Vérification du pass terminée. Lecture du flux de votre cœur.",
    passCheckFailedTitle: "Échec de la vérification du pass",
    resultOpeningNewWindow: "Préparation de la page de résultats dans une nouvelle fenêtre.",
    resultBlockedPopup: "Votre navigateur a bloqué l'ouverture automatique d'une nouvelle fenêtre. Veuillez utiliser le bouton ci-dessous pour ouvrir le résultat.",
    resultReadyUseButton: "Votre rapport de consultation est prêt. Veuillez utiliser le bouton ci-dessous pour ouvrir le résultat.",
    resultOpenedNewWindow: "Le rapport de consultation a été ouvert dans une nouvelle fenêtre.",
    resultFailedSubmit: "La consultation n'a pas été terminée. Veuillez réessayer depuis l'écran de saisie.",
    profileLoadAria: "Charger les informations de naissance depuis votre carte de profil",
    profileLoadCta: "Charger depuis la carte de profil",
    autoFilledNotice: "Rempli automatiquement depuis votre carte de profil",
    personFieldLabels: {
      me: { nameOrNickname: "Mon nom ou surnom", gender: "Mon genre", calendarType: "Mon calendrier (solaire/lunaire)", birthDate: "Ma date de naissance", birthTime: "Mon heure de naissance" },
      partner: { nameOrNickname: "Nom ou surnom du/de la partenaire · facultatif", gender: "Genre du/de la partenaire · facultatif", calendarType: "Calendrier du/de la partenaire (solaire/lunaire) · facultatif", birthDate: "Date de naissance du/de la partenaire · facultatif", birthTime: "Heure de naissance du/de la partenaire · facultatif" },
    },
    namePlaceholderRequired: "Veuillez saisir votre nom",
    namePlaceholderOptional: "Un nom pour appeler votre partenaire",
    genderFemale: "Femme",
    genderMale: "Homme",
    genderUnknown: "Privé",
    solarLabel: "Solaire",
    lunarLabel: "Lunaire",
    birthTimeUnknownLabel: "Heure de naissance inconnue",
    consultStyleLabel: "Style de consultation",
    questionLabel: (isCustom) => (isCustom ? "La question qui vous intrigue le plus maintenant" : "La question qui vous intrigue le plus maintenant · facultatif"),
    questionPlaceholderCustom: "Veuillez écrire au moins une ligne sur la question amoureuse qui vous intrigue le plus en ce moment.",
    questionPlaceholderOptional: "Vous pouvez laisser vide, mais écrire votre état d'esprit et votre situation actuelle donnera une lecture plus nuancée.",
    readyCardHeading: "Commencer la consultation avec ceci",
    myInfoLabel: "Mes informations",
    partnerInfoLabel: "Informations du/de la partenaire",
    meNameFallback: "Moi",
    partnerNameFallback: "Partenaire",
    birthDateMissing: "Date de naissance non renseignée",
    birthTimeMissing: "Heure de naissance non renseignée",
    noPartnerInfoSummary: "Centré sur mon flux amoureux, sans informations sur le/la partenaire",
    promiseCardHeading: "Ce que cette consultation vous révélera",
    promiseCardFooter: "Interprété uniquement à partir de votre thème calculé et des piliers du jour. Aucune affirmation infondée ni date inventée.",
    generatingCardHeading: "Lecture de la température de votre cœur",
    generatingCardSubtext: "Se termine généralement en environ 90 secondes. Ne fermez pas cette fenêtre et patientez un instant.",
    heroTitle: "Secret de l'Amour IA",
    heroSubtitle: "Un consultant amoureux rien que pour vous",
    heroDescription: "Nous lisons votre thème natal avec la psychologie amoureuse pour indiquer exactement quoi faire aujourd'hui et quoi remettre à plus tard.",
    heroStartCta: "Commencer la Consultation",
    progressGeneratingSrLabel: "Progression de la génération de la consultation",
    progressFormSrLabel: "Progression de la saisie",
    stepLabelFormat: (step, title) => `Étape ${step} · ${title}`,
    prevStepLabel: "Retour",
    nextStepLabel: "Suivant",
    submitCta: "❤️ Commencer la Consultation Secret de l'Amour",
    priceLabelPrefix: "Prix de la consultation ",
    resultReadyMessage: "Vous pouvez ouvrir la page de résultats.",
    openResultNewWindowCta: "Ouvrir le Résultat dans une Nouvelle Fenêtre",
  },
  de: {
    relationshipLabel: {
      single: "Single", crush: "Verliebt (heimlich)", some: "In einer unklaren Beziehung", dating: "In einer Beziehung",
      breakup: "Gerade getrennt", reunion: "Erwägt eine Versöhnung", marriage: "Erwägt eine Heirat",
      complicated: "Komplizierte Beziehung", custom: "Möchte die Gefühle des Partners kennen",
    },
    focusLabel: {
      relationshipFlow: "Wohin sich diese Beziehung entwickelt", distance: "Die Gefühle und die Distanz des Partners",
      reunion: "Möglichkeit einer Versöhnung", longTerm: "Möglichkeit einer Heirat/langfristigen Beziehung",
      intimacy: "Kompatibilität und Intimitätsrhythmus", timing: "Der richtige Zeitpunkt für Kontakt, Geständnis oder Gespräch",
      pattern: "Das Beziehungsmuster, das ich ändern muss", custom: "Selbst eingeben",
    },
    focusHint: {
      relationshipFlow: "Betrachtet den aktuellen Verlauf und die nächste Entscheidung.",
      distance: "Liest die Gründe für Nähe und Rückzug.",
      reunion: "Untersucht die Wärme einer möglichen Wiederverbindung.",
      longTerm: "Betrachtet dauerhafte Stabilität.",
      intimacy: "Löst emotionale Temperatur und Intimität durch das Elementegleichgewicht.",
      timing: "Ordnet, wann und wie man es ansprechen sollte.",
      pattern: "Weist auf sich wiederholende emotionale Gewohnheiten hin.",
      custom: "Schreiben Sie direkt die Frage auf, die Sie gerade am meisten beschäftigt.",
    },
    heroPromises: ["Basierend auf Ihrem Geburtshoroskop", "Analyse der Liebespsychologie", "Bis hin zu dem, was heute zu tun ist"],
    stepTitle: { status: "Ihr aktueller Beziehungsstatus", focus: "Beratungsstil und Frage", me: "Meine Informationen", partner: "Partnerinformationen · Bestätigung" },
    stepHelper: {
      status: "Sagen Sie uns zuerst, wo Sie stehen. Der Ton des Rates wird hier festgelegt.",
      focus: "Wählen Sie, was Sie am meisten hören möchten, und schreiben Sie Ihre Frage genau so, wie sie ist.",
      me: "Geburtsinformationen zur Erstellung Ihres Charts. Wird automatisch ausgefüllt, wenn Sie eine Profilkarte haben.",
      partner: "Partnerinformationen sind optional. Ohne sie lesen wir hauptsächlich Ihren eigenen Liebesfluss.",
    },
    generatingSteps: [
      "Erstellung Ihres Charts aus Ihren Geburtsinformationen", "Untersuchung der Fünf Elemente, des jahreszeitlichen Gleichgewichts, der Zehn Götter und der göttlichen Sterne",
      "Berechnung Ihres großen Glücks, des diesjährigen Verlaufs und guter Termine", "Gleichzeitiges Schreiben von sechs Beratungszweigen",
      "Erneutes Lesen, um sicherzustellen, dass keine Beweise fehlen", "Vorbereitung, den Beratungsbericht in einem neuen Fenster zu öffnen",
    ],
    analysisItems: [
      "Zentrales Liebesglück und das Muster, das Ihr Chart zeichnet", "Liebesstärken/-schwächen und wiederkehrende Muster",
      "Die Gefühle des Partners, Kompatibilität und Idealtyp", "Konflikt, Untreue, Möglichkeit einer Versöhnung",
      "Eheglück und gute Monate dieses Jahres", "Gute Termine, ausgewählt aus berechneten Tagessäulen",
      "Strategie für unklare Beziehungen, Gesprächssätze, Charme-Inszenierung", "Was ab heute zu tun ist, und ein 7-Tage-Leitfaden",
    ],
    errorMessages: {
      loginRequired: "Sie müssen sich anmelden, um die Beratung zu starten. Bitte melden Sie sich an und versuchen Sie es erneut.",
      paymentRequired: "Sie benötigen einen Pass für die Liebesgeheimnis-Expertenberatung. Wir öffnen die Kasse für Sie.",
      paymentVerifyFailed: "Die Zahlungsbestätigung ist nicht abgeschlossen. Falls Sie bereits bezahlt haben, versuchen Sie es bitte in Kürze erneut.",
      paymentCancelled: "Die Zahlung wurde storniert. Sie können jederzeit erneut fortfahren.",
      invalidInput: "Es fehlen Informationen, die für die Liebesgeheimnis-Beratung erforderlich sind. Bitte überprüfen Sie Geburtsdatum, Geschlecht und Beziehungsstatus erneut.",
      questionRequired: "Bitte schreiben Sie mindestens eine Zeile zu der Liebesfrage, die Sie im Moment am meisten interessiert.",
      birthTimeRequired: "Bitte geben Sie Ihre Geburtszeit ein oder wählen Sie 'Geburtszeit unbekannt'.",
      serverError: "Bei der Vorbereitung der Liebesgeheimnis-Beratung ist ein Problem aufgetreten. Es wurde keine Zahlung oder kein Pass abgebucht.",
      llmError: "Bei der Erstellung des Expertenberatungsinhalts ist ein Problem aufgetreten. Falls etwas abgebucht wurde, wird es automatisch wiederhergestellt.",
      networkError: "Die Verbindung ist instabil. Bitte versuchen Sie es in Kürze erneut.",
      resultTimeout: "Die Erstellung des Beratungsergebnisses dauert länger als erwartet. Bitte überprüfen Sie es in Kürze erneut auf der Ergebnisseite.",
    },
    resumeNotice: "Wenn eine Beratung bereits läuft, können Sie sie auf der Ergebnisseite weiter verfolgen.",
    phaseReading: "Die von Ihnen eingegebenen Hinweise Ihres Herzens werden sortiert",
    phasePayment: "Ihr Pass und Ihre Zahlungsberechtigung werden überprüft",
    phaseReady: "Ihr Beratungsbericht ist fertig",
    phaseIdle: "Bereit, Ihr Liebesgeheimnis zu entfalten",
    passCheckTitle: "Pass wird überprüft",
    passCheckReason: "Liebesgeheimnis-Expertenberatung",
    passCheckCompleteTitle: "Passüberprüfung abgeschlossen",
    passCheckCompleteMessage: "Passüberprüfung abgeschlossen. Der Fluss Ihres Herzens wird gelesen.",
    passCheckFailedTitle: "Passüberprüfung fehlgeschlagen",
    resultOpeningNewWindow: "Die Ergebnisseite wird in einem neuen Fenster vorbereitet.",
    resultBlockedPopup: "Ihr Browser hat das automatische Öffnen eines neuen Fensters blockiert. Bitte verwenden Sie die Schaltfläche unten, um das Ergebnis zu öffnen.",
    resultReadyUseButton: "Ihr Beratungsbericht ist fertig. Bitte verwenden Sie die Schaltfläche unten, um das Ergebnis zu öffnen.",
    resultOpenedNewWindow: "Der Beratungsbericht wurde in einem neuen Fenster geöffnet.",
    resultFailedSubmit: "Die Beratung wurde nicht vollständig erstellt. Bitte versuchen Sie es erneut über den Eingabebildschirm.",
    profileLoadAria: "Geburtsinformationen aus Ihrer Profilkarte laden",
    profileLoadCta: "Aus Profilkarte laden",
    autoFilledNotice: "Automatisch aus Ihrer Profilkarte ausgefüllt",
    personFieldLabels: {
      me: { nameOrNickname: "Mein Name oder Spitzname", gender: "Mein Geschlecht", calendarType: "Mein Kalender (Solar/Lunar)", birthDate: "Mein Geburtsdatum", birthTime: "Meine Geburtszeit" },
      partner: { nameOrNickname: "Name oder Spitzname des Partners · optional", gender: "Geschlecht des Partners · optional", calendarType: "Kalender des Partners (Solar/Lunar) · optional", birthDate: "Geburtsdatum des Partners · optional", birthTime: "Geburtszeit des Partners · optional" },
    },
    namePlaceholderRequired: "Bitte geben Sie Ihren Namen ein",
    namePlaceholderOptional: "Ein Name, um Ihren Partner zu rufen",
    genderFemale: "Weiblich",
    genderMale: "Männlich",
    genderUnknown: "Privat",
    solarLabel: "Solar",
    lunarLabel: "Lunar",
    birthTimeUnknownLabel: "Geburtszeit unbekannt",
    consultStyleLabel: "Beratungsstil",
    questionLabel: (isCustom) => (isCustom ? "Die Frage, die Sie jetzt am meisten interessiert" : "Die Frage, die Sie jetzt am meisten interessiert · optional"),
    questionPlaceholderCustom: "Bitte schreiben Sie mindestens eine Zeile zu der Liebesfrage, die Sie im Moment am meisten interessiert.",
    questionPlaceholderOptional: "Sie können es leer lassen, aber das Aufschreiben Ihrer aktuellen Gefühle und Situation ergibt eine feinfühligere Lesung.",
    readyCardHeading: "Die Beratung wird hiermit gestartet",
    myInfoLabel: "Meine Informationen",
    partnerInfoLabel: "Partnerinformationen",
    meNameFallback: "Ich",
    partnerNameFallback: "Partner",
    birthDateMissing: "Geburtsdatum nicht eingegeben",
    birthTimeMissing: "Geburtszeit nicht eingegeben",
    noPartnerInfoSummary: "Fokus auf meinen Liebesfluss, ohne Partnerinformationen",
    promiseCardHeading: "Was diese Beratung für Sie liest",
    promiseCardFooter: "Nur innerhalb Ihres berechneten Charts und der Tagessäulen interpretiert. Keine unbegründeten Behauptungen oder erfundenen Daten.",
    generatingCardHeading: "Die Temperatur Ihres Herzens wird gelesen",
    generatingCardSubtext: "Dauert normalerweise etwa 90 Sekunden. Bitte schließen Sie dieses Fenster nicht und warten Sie einen Moment.",
    heroTitle: "Liebesgeheimnis KI",
    heroSubtitle: "Ein Liebesberater nur für Sie",
    heroDescription: "Wir lesen Ihr Geburtshoroskop zusammen mit der Liebespsychologie, um genau zu zeigen, was heute zu tun und was aufzuschieben ist.",
    heroStartCta: "Beratung starten",
    progressGeneratingSrLabel: "Fortschritt der Beratungserstellung",
    progressFormSrLabel: "Eingabefortschritt",
    stepLabelFormat: (step, title) => `Schritt ${step} · ${title}`,
    prevStepLabel: "Zurück",
    nextStepLabel: "Weiter",
    submitCta: "❤️ Liebesgeheimnis-Beratung starten",
    priceLabelPrefix: "Beratungspreis ",
    resultReadyMessage: "Sie können die Ergebnisseite öffnen.",
    openResultNewWindowCta: "Ergebnis in neuem Fenster öffnen",
  },
  nl: {
    relationshipLabel: {
      single: "Single", crush: "Stiekem verliefd", some: "In een onduidelijke relatie", dating: "In een relatie",
      breakup: "Net uit elkaar", reunion: "Overweegt verzoening", marriage: "Overweegt huwelijk",
      complicated: "Ingewikkelde relatie", custom: "Wil de gevoelens van de partner weten",
    },
    focusLabel: {
      relationshipFlow: "Waar deze relatie naartoe gaat", distance: "De gevoelens en afstand van de partner",
      reunion: "Kans op verzoening", longTerm: "Kans op huwelijk of langetermijnrelatie",
      intimacy: "Compatibiliteit en intimiteitsritme", timing: "Het juiste moment om contact op te nemen, te bekennen of te praten",
      pattern: "Het liefdespatroon dat ik moet veranderen", custom: "Zelf invoeren",
    },
    focusHint: {
      relationshipFlow: "Bekijkt de huidige stroom en de volgende keuze.",
      distance: "Leest de redenen achter nabijheid en terugtrekking.",
      reunion: "Onderzoekt de warmte van een mogelijke herverbinding.",
      longTerm: "Bekijkt langdurige stabiliteit.",
      intimacy: "Ontrafelt emotionele temperatuur en intimiteit via elementenbalans.",
      timing: "Ordent wanneer en hoe je het moet aankaarten.",
      pattern: "Wijst op terugkerende emotionele gewoontes.",
      custom: "Schrijf direct de vraag op die je nu het meest bezighoudt.",
    },
    heroPromises: ["Gebaseerd op je geboortehoroscoop", "Analyse van liefdespsychologie", "Tot aan wat je vandaag moet doen"],
    stepTitle: { status: "Je huidige relatiestatus", focus: "Consultstijl en vraag", me: "Mijn gegevens", partner: "Partnergegevens · Bevestigen" },
    stepHelper: {
      status: "Vertel ons eerst waar je staat. De toon van het advies wordt hier bepaald.",
      focus: "Kies wat je het liefst wilt horen en schrijf je vraag zoals die is.",
      me: "Geboortegegevens om je horoscoop op te stellen. Wordt automatisch ingevuld als je een profielkaart hebt.",
      partner: "Partnergegevens zijn optioneel. Zonder deze lezen we vooral je eigen liefdesstroom.",
    },
    generatingSteps: [
      "Je horoscoop wordt opgesteld op basis van je geboortegegevens", "De Vijf Elementen, seizoensbalans, Tien Goden en goddelijke sterren worden onderzocht",
      "Je grote geluk, de stroom van dit jaar en goede data worden berekend", "Zes takken van consult worden tegelijk geschreven",
      "Er wordt opnieuw gelezen om te zorgen dat nergens bewijs ontbreekt", "Het consultrapport wordt klaargemaakt om in een nieuw venster te openen",
    ],
    analysisItems: [
      "Kernliefdesgeluk en het patroon dat je horoscoop tekent", "Liefdessterktes/-zwaktes en terugkerende patronen",
      "De gevoelens van de partner, compatibiliteit, ideale type", "Conflict, ontrouw, kans op verzoening",
      "Huwelijksgeluk en goede maanden van dit jaar", "Goede data gekozen op basis van berekende dagpilaren",
      "Strategie voor onduidelijke relaties, gesprekszinnen, charme-uitstraling", "Wat te doen vanaf vandaag en een 7-daagse gids",
    ],
    errorMessages: {
      loginRequired: "Je moet inloggen om het consult te starten. Log in en probeer het opnieuw.",
      paymentRequired: "Je hebt een pas nodig voor het Liefdesgeheim-expertconsult. We openen de kassa voor je.",
      paymentVerifyFailed: "De betaalbevestiging is niet voltooid. Als je al betaald hebt, probeer het dan later opnieuw.",
      paymentCancelled: "De betaling is geannuleerd. Je kunt op elk gewenst moment opnieuw doorgaan.",
      invalidInput: "Er ontbreekt informatie die nodig is voor het Liefdesgeheim-consult. Controleer je geboortedatum, geslacht en relatiestatus opnieuw.",
      questionRequired: "Schrijf minstens één regel over de liefdesvraag die je nu het meest intrigeert.",
      birthTimeRequired: "Voer je geboortetijd in of selecteer 'geboortetijd onbekend'.",
      serverError: "Er is een probleem opgetreden bij het voorbereiden van het Liefdesgeheim-consult. Er is geen betaling of pas afgeschreven.",
      llmError: "Er is een probleem opgetreden bij het genereren van de expertconsultinhoud. Als er iets is afgeschreven, wordt dit automatisch hersteld.",
      networkError: "De verbinding is instabiel. Probeer het later opnieuw.",
      resultTimeout: "Het genereren van het consultresultaat duurt langer dan verwacht. Controleer het later opnieuw op de resultatenpagina.",
    },
    resumeNotice: "Als er al een consult loopt, kun je dit blijven volgen op de resultatenpagina.",
    phaseReading: "De aanwijzingen van je hart die je hebt ingevoerd, worden geordend",
    phasePayment: "Je pas en betaalmachtiging worden gecontroleerd",
    phaseReady: "Je consultrapport is klaar",
    phaseIdle: "Klaar om je Liefdesgeheim te onthullen",
    passCheckTitle: "Pas wordt gecontroleerd",
    passCheckReason: "Liefdesgeheim-expertconsult",
    passCheckCompleteTitle: "Pascontrole voltooid",
    passCheckCompleteMessage: "Pascontrole voltooid. De stroom van je hart wordt gelezen.",
    passCheckFailedTitle: "Pascontrole mislukt",
    resultOpeningNewWindow: "De resultatenpagina wordt voorbereid in een nieuw venster.",
    resultBlockedPopup: "Je browser heeft het automatisch openen van een nieuw venster geblokkeerd. Gebruik de knop hieronder om het resultaat te openen.",
    resultReadyUseButton: "Je consultrapport is klaar. Gebruik de knop hieronder om het resultaat te openen.",
    resultOpenedNewWindow: "Het consultrapport is geopend in een nieuw venster.",
    resultFailedSubmit: "Het consult is niet volledig gegenereerd. Probeer het opnieuw vanaf het invoerscherm.",
    profileLoadAria: "Geboortegegevens laden vanuit je profielkaart",
    profileLoadCta: "Laden vanuit profielkaart",
    autoFilledNotice: "Automatisch ingevuld vanuit je profielkaart",
    personFieldLabels: {
      me: { nameOrNickname: "Mijn naam of bijnaam", gender: "Mijn geslacht", calendarType: "Mijn kalender (zonne-/maankalender)", birthDate: "Mijn geboortedatum", birthTime: "Mijn geboortetijd" },
      partner: { nameOrNickname: "Naam of bijnaam van partner · optioneel", gender: "Geslacht van partner · optioneel", calendarType: "Kalender van partner (zonne-/maankalender) · optioneel", birthDate: "Geboortedatum van partner · optioneel", birthTime: "Geboortetijd van partner · optioneel" },
    },
    namePlaceholderRequired: "Voer je naam in",
    namePlaceholderOptional: "Een naam om je partner mee aan te spreken",
    genderFemale: "Vrouw",
    genderMale: "Man",
    genderUnknown: "Privé",
    solarLabel: "Zonnekalender",
    lunarLabel: "Maankalender",
    birthTimeUnknownLabel: "Geboortetijd onbekend",
    consultStyleLabel: "Consultstijl",
    questionLabel: (isCustom) => (isCustom ? "De vraag die je nu het meest intrigeert" : "De vraag die je nu het meest intrigeert · optioneel"),
    questionPlaceholderCustom: "Schrijf minstens één regel over de liefdesvraag die je nu het meest intrigeert.",
    questionPlaceholderOptional: "Je mag het leeg laten, maar het opschrijven van je huidige gevoelens en situatie geeft een genuanceerdere lezing.",
    readyCardHeading: "Het consult hiermee starten",
    myInfoLabel: "Mijn gegevens",
    partnerInfoLabel: "Partnergegevens",
    meNameFallback: "Ik",
    partnerNameFallback: "Partner",
    birthDateMissing: "Geboortedatum niet ingevuld",
    birthTimeMissing: "Geboortetijd niet ingevuld",
    noPartnerInfoSummary: "Gericht op mijn liefdesstroom, zonder partnergegevens",
    promiseCardHeading: "Wat dit consult voor je leest",
    promiseCardFooter: "Alleen geïnterpreteerd binnen je berekende horoscoop en dagpilaren. Geen ongefundeerde beweringen of verzonnen data.",
    generatingCardHeading: "De temperatuur van je hart wordt gelezen",
    generatingCardSubtext: "Duurt meestal ongeveer 90 seconden. Sluit dit venster niet en wacht even.",
    heroTitle: "Liefdesgeheim AI",
    heroSubtitle: "Een liefdesadviseur alleen voor jou",
    heroDescription: "We lezen je geboortehoroscoop samen met liefdespsychologie om precies aan te geven wat je vandaag moet doen en wat je moet uitstellen.",
    heroStartCta: "Consult starten",
    progressGeneratingSrLabel: "Voortgang consultgeneratie",
    progressFormSrLabel: "Invoervoortgang",
    stepLabelFormat: (step, title) => `Stap ${step} · ${title}`,
    prevStepLabel: "Terug",
    nextStepLabel: "Volgende",
    submitCta: "❤️ Liefdesgeheim-consult starten",
    priceLabelPrefix: "Consultprijs ",
    resultReadyMessage: "Je kunt de resultatenpagina openen.",
    openResultNewWindowCta: "Resultaat openen in nieuw venster",
  },
  ms: {
    relationshipLabel: {
      single: "Bujang", crush: "Sedang jatuh cinta secara sulit", some: "Dalam hubungan tidak menentu", dating: "Bercinta",
      breakup: "Baru berpisah", reunion: "Mempertimbangkan untuk bersatu semula", marriage: "Mempertimbangkan perkahwinan",
      complicated: "Hubungan yang rumit", custom: "Ingin tahu perasaan pasangan",
    },
    focusLabel: {
      relationshipFlow: "Ke mana hubungan ini akan menuju", distance: "Perasaan dan jarak pasangan",
      reunion: "Kemungkinan bersatu semula", longTerm: "Kemungkinan perkahwinan-hubungan jangka panjang",
      intimacy: "Keserasian dan rentak keintiman", timing: "Masa yang sesuai untuk menghubungi-meluahkan perasaan-berbual",
      pattern: "Corak percintaan yang perlu saya ubah", custom: "Masukkan sendiri",
    },
    focusHint: {
      relationshipFlow: "Melihat aliran semasa dan pilihan seterusnya.",
      distance: "Membaca sebab kedekatan dan penjarakan.",
      reunion: "Meneliti kehangatan untuk kemungkinan tersambung semula.",
      longTerm: "Melihat kestabilan jangka panjang.",
      intimacy: "Menyelesaikan suhu emosi dan keintiman melalui keseimbangan elemen.",
      timing: "Menyusun bila dan bagaimana untuk memulakan perbualan.",
      pattern: "Menunjukkan tabiat emosi yang berulang.",
      custom: "Tulis terus soalan yang paling membimbangkan anda sekarang.",
    },
    heroPromises: ["Berdasarkan carta kelahiran", "Analisis psikologi percintaan", "Sehingga apa yang perlu dilakukan hari ini"],
    stepTitle: { status: "Status hubungan anda sekarang", focus: "Gaya perundingan dan soalan", me: "Maklumat saya", partner: "Maklumat pasangan · Pengesahan" },
    stepHelper: {
      status: "Beritahu kami dahulu di mana anda berada. Nada nasihat ditentukan di sini.",
      focus: "Pilih apa yang paling ingin anda dengar, dan tulis soalan anda seadanya.",
      me: "Maklumat kelahiran untuk membina carta anda. Akan diisi secara automatik jika anda mempunyai kad profil.",
      partner: "Maklumat pasangan adalah pilihan. Tanpanya, kami akan membaca aliran percintaan anda sebagai fokus utama.",
    },
    generatingSteps: [
      "Membina carta anda daripada maklumat kelahiran anda", "Meneliti Lima Elemen, keseimbangan musim, Sepuluh Dewa dan bintang ketuhanan",
      "Mengira Nasib Besar anda, aliran tahun ini dan tarikh baik", "Menulis enam cabang perundingan secara serentak",
      "Membaca semula untuk memastikan tiada bukti yang tertinggal", "Bersedia untuk membuka laporan perundingan dalam tetingkap baharu",
    ],
    analysisItems: [
      "Nasib cinta teras dan corak yang dilukis carta anda", "Kekuatan-kelemahan percintaan dan corak berulang",
      "Perasaan pasangan, keserasian, jenis ideal", "Konflik-ketidaksetiaan-kemungkinan bersatu semula",
      "Nasib perkahwinan dan bulan baik tahun ini", "Tarikh baik yang dipilih berdasarkan tiang hari yang dikira",
      "Strategi hubungan tidak menentu-ayat perbualan-gaya pesona", "Perkara yang perlu dilakukan mulai hari ini dan panduan 7 hari",
    ],
    errorMessages: {
      loginRequired: "Anda perlu log masuk untuk memulakan perundingan. Sila log masuk dan cuba lagi.",
      paymentRequired: "Anda memerlukan pas untuk perundingan pakar Rahsia Cinta. Kami akan membuka halaman pembayaran untuk anda.",
      paymentVerifyFailed: "Pengesahan pembayaran belum selesai. Jika anda sudah membayar, sila cuba lagi sebentar lagi.",
      paymentCancelled: "Pembayaran telah dibatalkan. Anda boleh meneruskan semula apabila perlu.",
      invalidInput: "Maklumat yang diperlukan untuk perundingan Rahsia Cinta tidak lengkap. Sila semak semula tarikh lahir, jantina dan status hubungan anda.",
      questionRequired: "Sila tulis sekurang-kurangnya satu baris tentang soalan percintaan yang paling ingin anda ketahui sekarang.",
      birthTimeRequired: "Sila masukkan masa lahir anda atau pilih 'masa lahir tidak diketahui'.",
      serverError: "Masalah berlaku semasa menyediakan perundingan Rahsia Cinta. Tiada pembayaran atau pas ditolak.",
      llmError: "Masalah berlaku semasa menjana kandungan perundingan pakar. Jika ada yang ditolak, ia akan dipulihkan secara automatik.",
      networkError: "Sambungan tidak stabil. Sila cuba lagi sebentar lagi.",
      resultTimeout: "Penjanaan hasil perundingan mengambil masa lebih lama daripada dijangka. Sila semak semula di halaman hasil sebentar lagi.",
    },
    resumeNotice: "Jika terdapat perundingan yang sedang berjalan, anda boleh terus menyemaknya di halaman hasil.",
    phaseReading: "Menyusun petunjuk hati yang anda masukkan",
    phasePayment: "Menyemak pas dan kebenaran pembayaran anda",
    phaseReady: "Laporan perundingan anda sudah sedia",
    phaseIdle: "Sedia untuk membuka Rahsia Cinta anda",
    passCheckTitle: "Menyemak pas",
    passCheckReason: "Perundingan pakar Rahsia Cinta",
    passCheckCompleteTitle: "Semakan pas selesai",
    passCheckCompleteMessage: "Semakan pas selesai. Sedang membaca aliran hati anda.",
    passCheckFailedTitle: "Semakan pas gagal",
    resultOpeningNewWindow: "Menyediakan halaman hasil dalam tetingkap baharu.",
    resultBlockedPopup: "Pelayar anda menyekat pembukaan tetingkap baharu secara automatik. Sila gunakan butang di bawah untuk membuka hasil.",
    resultReadyUseButton: "Laporan perundingan anda sudah sedia. Sila gunakan butang di bawah untuk membuka hasil.",
    resultOpenedNewWindow: "Laporan perundingan telah dibuka dalam tetingkap baharu.",
    resultFailedSubmit: "Perundingan tidak berjaya dijana sepenuhnya. Sila cuba lagi dari skrin input.",
    profileLoadAria: "Muatkan maklumat kelahiran daripada kad profil",
    profileLoadCta: "Muatkan daripada kad profil",
    autoFilledNotice: "Diisi secara automatik daripada kad profil anda",
    personFieldLabels: {
      me: { nameOrNickname: "Nama atau nama panggilan saya", gender: "Jantina saya", calendarType: "Kalendar saya (Suria/Lunar)", birthDate: "Tarikh lahir saya", birthTime: "Masa lahir saya" },
      partner: { nameOrNickname: "Nama atau nama panggilan pasangan · pilihan", gender: "Jantina pasangan · pilihan", calendarType: "Kalendar pasangan (Suria/Lunar) · pilihan", birthDate: "Tarikh lahir pasangan · pilihan", birthTime: "Masa lahir pasangan · pilihan" },
    },
    namePlaceholderRequired: "Sila masukkan nama anda",
    namePlaceholderOptional: "Nama untuk memanggil pasangan anda",
    genderFemale: "Perempuan",
    genderMale: "Lelaki",
    genderUnknown: "Peribadi",
    solarLabel: "Suria",
    lunarLabel: "Lunar",
    birthTimeUnknownLabel: "Masa lahir tidak diketahui",
    consultStyleLabel: "Gaya perundingan",
    questionLabel: (isCustom) => (isCustom ? "Soalan yang paling ingin anda ketahui sekarang" : "Soalan yang paling ingin anda ketahui sekarang · pilihan"),
    questionPlaceholderCustom: "Sila tulis sekurang-kurangnya satu baris tentang soalan percintaan yang paling ingin anda ketahui sekarang.",
    questionPlaceholderOptional: "Anda boleh biarkan kosong, tetapi menulis perasaan dan situasi anda sekarang akan memberikan bacaan yang lebih terperinci.",
    readyCardHeading: "Memulakan perundingan dengan maklumat ini",
    myInfoLabel: "Maklumat saya",
    partnerInfoLabel: "Maklumat pasangan",
    meNameFallback: "Saya",
    partnerNameFallback: "Pasangan",
    birthDateMissing: "Tarikh lahir tidak dimasukkan",
    birthTimeMissing: "Masa lahir tidak dimasukkan",
    noPartnerInfoSummary: "Memfokuskan pada aliran percintaan saya, tanpa maklumat pasangan",
    promiseCardHeading: "Perkara yang akan dibaca dalam perundingan ini",
    promiseCardFooter: "Ditafsirkan hanya dalam carta yang dikira dan tiang hari. Tiada dakwaan tanpa asas atau tarikh rekaan.",
    generatingCardHeading: "Membaca suhu hati anda",
    generatingCardSubtext: "Biasanya selesai dalam kira-kira 90 saat. Jangan tutup tetingkap ini dan tunggu sebentar.",
    heroTitle: "AI Rahsia Cinta",
    heroSubtitle: "Perunding Cinta Khusus Untuk Anda",
    heroDescription: "Kami membaca carta kelahiran anda bersama psikologi percintaan untuk menunjukkan dengan tepat apa yang perlu dilakukan hari ini dan apa yang perlu ditangguhkan.",
    heroStartCta: "Mulakan Perundingan",
    progressGeneratingSrLabel: "Kemajuan penjanaan perundingan",
    progressFormSrLabel: "Kemajuan input",
    stepLabelFormat: (step, title) => `Langkah ${step} · ${title}`,
    prevStepLabel: "Kembali",
    nextStepLabel: "Seterusnya",
    submitCta: "❤️ Mulakan Perundingan Rahsia Cinta",
    priceLabelPrefix: "Harga penggunaan perundingan ",
    resultReadyMessage: "Anda boleh membuka halaman hasil.",
    openResultNewWindowCta: "Buka Hasil dalam Tetingkap Baharu",
  },
};

function getLoveSecretClientCopy(locale: LoadingLocale): LoveSecretClientCopy {
  return LOVE_SECRET_CLIENT_COPY[locale] || LOVE_SECRET_CLIENT_EN;
}

function useLoveSecretClientCopy(): LoveSecretClientCopy {
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
  return getLoveSecretClientCopy(locale);
}

type PersonInfo = {
  name: string;
  gender: GenderType;
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  calendarType: CalendarType;
};

type ConsultationForm = {
  myInfo: PersonInfo;
  partnerInfo: PersonInfo;
  relationshipStatus: RelationshipStatus | "";
  focusArea: FocusArea;
  question: string;
};

type ResultSection = { title: string; body: string };
type ChatMessage = { role: "user" | "assistant"; content: string; createdAt?: string };

type BillingPaymentPayload = {
  storeId: string;
  channelKey: string;
  paymentId?: string;
  merchantUid?: string;
  orderName: string;
  totalAmount?: number;
  paymentAmount?: number;
  amountKRW?: number;
  coinPrice?: number;
  membershipCreditCost?: number;
  currency?: string;
  payMethod?: string;
  customer?: Record<string, unknown>;
  customData?: Record<string, unknown>;
  noticeUrl?: string;
  noticeUrls?: string[];
  runtimeGate?: Record<string, unknown>;
};

type EnsureAccessResult =
  | { ok: true; accessToken: string; accessType: AccessType }
  | { ok: false; reason: "PAYMENT_REQUIRED"; paymentPayload: BillingPaymentPayload }
  | { ok: false; reason: "LOGIN_REQUIRED"; message?: string }
  | { ok: false; reason: "INVALID_INPUT"; message: string }
  | { ok: false; reason?: string; message?: string };

type ConsultationResult = {
  ok: boolean;
  sessionId?: string;
  accessType?: AccessType;
  status?: string;
  keywords?: string[];
  strategy?: string;
  sections?: ResultSection[];
  finalLine?: string;
  messages?: ChatMessage[];
  reason?: string;
  message?: string;
};

const SERVICE_TYPE = "love-secret-ai-consultation";
const CONSULTATION_TYPE = "loveSecret";

// 결제 payload 의 메타데이터 필드(labelFor)용 — 화면에 보이지 않으므로 로케일과 무관하게 고정한다.
// 표시용 라벨은 useLoveSecretClientCopy().relationshipLabel/focusLabel 을 쓴다.
const RELATIONSHIP_STATUSES_KO: Array<{ value: RelationshipStatus; label: string }> = [
  { value: "single", label: "솔로" },
  { value: "crush", label: "짝사랑" },
  { value: "some", label: "썸 타는 중" },
  { value: "dating", label: "연애 중" },
  { value: "breakup", label: "이별 직후" },
  { value: "reunion", label: "재회 고민" },
  { value: "marriage", label: "결혼 고민" },
  { value: "complicated", label: "관계가 복잡한 상태" },
  { value: "custom", label: "상대방 마음이 궁금한 상태" },
];

const RELATIONSHIP_VALUES: RelationshipStatus[] = RELATIONSHIP_STATUSES_KO.map((item) => item.value);

const FOCUS_AREAS_KO: Array<{ value: FocusArea; label: string; desc: string }> = [
  { value: "relationshipFlow", label: "현재 관계가 어디로 흘러갈지", desc: "지금 흐름과 다음 선택을 봅니다." },
  { value: "distance", label: "상대의 마음과 거리감", desc: "가까움과 물러섬의 이유를 읽습니다." },
  { value: "reunion", label: "재회 가능성", desc: "다시 닿을 수 있는 온도를 살핍니다." },
  { value: "longTerm", label: "결혼/장기 관계 가능성", desc: "오래 가는 안정감을 봅니다." },
  { value: "intimacy", label: "속궁합과 친밀감 리듬", desc: "조후로 감정 온도와 친밀감을 풉니다." },
  { value: "timing", label: "연락/고백/대화 타이밍", desc: "말을 꺼낼 때와 방식을 정리합니다." },
  { value: "pattern", label: "내가 바꿔야 할 연애 패턴", desc: "반복되는 마음의 습관을 짚습니다." },
  { value: "custom", label: "직접 입력", desc: "지금 가장 아픈 질문을 그대로 적습니다." },
];

const FOCUS_VALUES: FocusArea[] = FOCUS_AREAS_KO.map((item) => item.value);

const FORM_ANCHOR_ID = "love-secret-form";

/**
 * 입력 스텝.
 * ① 질문과 ③ 상담 스타일을 한 스텝에 둔 이유: focusArea === "custom" 일 때만 question 이
 * 필수라, 둘을 다른 스텝으로 나누면 "뒤 스텝의 선택이 앞 스텝의 필수 여부를 바꾸는" 검증 버그가
 * 구조적으로 생긴다. ④ 결과 생성은 스텝이 아니라 phase 상태 머신이 담당한다.
 * title/helper 는 copy.stepTitle/stepHelper 로 로케일화한다. error 는 문구 대신 ErrorKey 를
 * 돌려주고, currentStepError()(컴포넌트 스코프)가 copy.errorMessages 로 해석한다.
 */
const STEPS: Array<{ id: StepId; Icon: typeof Heart; valid: (form: ConsultationForm) => boolean; error: (form: ConsultationForm) => ErrorKey }> = [
  {
    id: "status",
    Icon: Heart,
    valid: (form) => Boolean(form.relationshipStatus),
    error: () => "invalidInput",
  },
  {
    id: "focus",
    Icon: MessageCircleHeart,
    valid: (form) => Boolean(form.focusArea) && (form.focusArea !== "custom" || form.question.trim().length >= 2),
    error: () => "questionRequired",
  },
  {
    id: "me",
    Icon: UserRound,
    valid: (form) => Boolean(
      form.myInfo.gender && form.myInfo.birthDate && form.myInfo.calendarType
      && (form.myInfo.birthTimeUnknown || form.myInfo.birthTime),
    ),
    error: (form) => (!form.myInfo.birthTimeUnknown && !form.myInfo.birthTime ? "birthTimeRequired" : "invalidInput"),
  },
  {
    id: "partner",
    Icon: Users,
    valid: () => true,
    error: () => "invalidInput",
  },
];

const LAST_STEP = STEPS.length - 1;

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

const emptyPerson = (): PersonInfo => ({
  name: "",
  gender: "",
  birthDate: "",
  birthTime: "",
  birthTimeUnknown: false,
  calendarType: "solar",
});

const defaultForm = (): ConsultationForm => ({
  myInfo: emptyPerson(),
  partnerInfo: emptyPerson(),
  relationshipStatus: "single",
  focusArea: "relationshipFlow",
  question: "",
});

function applyProfileSeedToForm(form: ConsultationForm, profile: AiPrefillSeed): ConsultationForm {
  if (!profile.name && !profile.gender && !profile.birthDate && !profile.birthTime && !profile.calendarType) {
    return form;
  }
  const person = form.myInfo;
  return {
    ...form,
    myInfo: {
      ...person,
      name: profile.name || person.name,
      gender: (profile.gender as PersonInfo["gender"]) || person.gender,
      birthDate: profile.birthDate || person.birthDate,
      birthTimeUnknown: profile.birthTimeUnknown ?? person.birthTimeUnknown,
      birthTime: profile.birthTimeUnknown ? "" : profile.birthTime || person.birthTime,
      calendarType: profile.calendarType || person.calendarType,
    },
  };
}

function buildInitialForm(): ConsultationForm {
  return applyProfileSeedToForm(defaultForm(), readAiProfileSeed());
}

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return `lsai-${crypto.randomUUID()}`;
  return `lsai-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function hasPartnerInfo(partner: PersonInfo) {
  return Boolean(partner.name.trim() || partner.gender || partner.birthDate || partner.birthTime || partner.birthTimeUnknown);
}

function labelFor<T extends string>(options: Array<{ value: T; label: string }>, value: T | "") {
  return options.find((item) => item.value === value)?.label || "";
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

function activeAttemptId() {
  const active = getActivePaidAttemptSession();
  if (!active || active.featureKey !== SERVICE_TYPE) return "";
  return active.attemptId;
}

function buildResultUrl(params: { sessionId?: string; requestId?: string; attemptId?: string; pending?: boolean }) {
  const query = new URLSearchParams();
  if (params.pending) query.set("pending", "1");
  if (params.sessionId) query.set("sessionId", params.sessionId);
  if (params.requestId) query.set("requestId", params.requestId);
  if (params.attemptId) query.set("attemptId", params.attemptId);
  return `/love-secret-ai/result?${query.toString()}`;
}

function buildPayload(form: ConsultationForm, requestId: string) {
  const question = form.question.trim();
  const partnerInfo = hasPartnerInfo(form.partnerInfo)
    ? {
      ...form.partnerInfo,
      name: form.partnerInfo.name.trim(),
      birthTime: form.partnerInfo.birthTimeUnknown ? "" : form.partnerInfo.birthTime,
    }
    : undefined;
  const topic = labelFor(FOCUS_AREAS_KO, form.focusArea);
  return {
    serviceType: SERVICE_TYPE,
    consultationType: CONSULTATION_TYPE,
    userName: form.myInfo.name.trim() || undefined,
    gender: form.myInfo.gender || "unknown",
    birthDate: form.myInfo.birthDate,
    birthTime: form.myInfo.birthTimeUnknown ? "" : form.myInfo.birthTime,
    birthTimeUnknown: form.myInfo.birthTimeUnknown,
    calendarType: form.myInfo.calendarType,
    relationshipStatus: form.relationshipStatus,
    relationshipStatusLabel: labelFor(RELATIONSHIP_STATUSES_KO, form.relationshipStatus),
    focusArea: form.focusArea,
    focusAreaLabel: topic,
    question,
    partnerName: partnerInfo?.name || undefined,
    partnerGender: partnerInfo?.gender || undefined,
    partnerBirthDate: partnerInfo?.birthDate || undefined,
    partnerBirthTime: partnerInfo?.birthTime || undefined,
    partnerBirthTimeUnknown: partnerInfo?.birthTimeUnknown,
    partnerCalendarType: partnerInfo?.calendarType,
    locale: detectLocale(),
    requestId,
    idempotencyKey: requestId,
    attemptId: activeAttemptId() || undefined,
    myInfo: {
      ...form.myInfo,
      name: form.myInfo.name.trim(),
      birthTime: form.myInfo.birthTimeUnknown ? "" : form.myInfo.birthTime,
    },
    partnerInfo,
    topic,
    userQuestion: question,
  };
}

async function postJson<T>(path: string, body: Record<string, unknown>, idempotencyKey?: string): Promise<{ response: Response; payload: T }> {
  const response = await authFetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify(idempotencyKey ? { ...body, idempotencyKey } : body),
  }, { retryOn401: false });
  const payload = await response.json().catch(() => ({})) as T;
  return { response, payload };
}

async function getJson<T>(path: string): Promise<{ response: Response; payload: T }> {
  const response = await authFetch(path);
  const payload = await response.json().catch(() => ({})) as T;
  return { response, payload };
}

function isPaymentRequiredResult(result: EnsureAccessResult): result is Extract<EnsureAccessResult, { reason: "PAYMENT_REQUIRED" }> {
  return !result.ok && result.reason === "PAYMENT_REQUIRED" && "paymentPayload" in result;
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
    || Object.keys(asRecord(payload.consume)).length,
  );
}

function extractPayment(result: unknown, fallbackRequestId: string) {
  const record = asRecord(result);
  const payload = runtimePayload(result);
  const payment = asRecord(payload.payment);
  const accessGrant = asRecord(payload.accessGrant);
  const consume = asRecord(payload.consume);
  const transactionId = toText(record.transactionId || payload.transactionId || accessGrant.transactionId || consume.transactionId);
  const purchaseId = toText(record.purchaseId || payload.purchaseId || accessGrant.purchaseId || consume.purchaseId);
  const ledgerId = toText(record.ledgerId || payload.ledgerId || accessGrant.ledgerId || consume.ledgerId);
  const paymentId = toText(
    record.paymentId
    || transactionId
    || purchaseId
    || payload.paymentId
    || payment.paymentId
    || payment.impUid
    || payment.merchantUid
    || accessGrant.paymentId
    || ledgerId
    || fallbackRequestId,
  );
  return {
    paymentId,
    transactionId,
    purchaseId,
    ledgerId,
    requestId: fallbackRequestId,
    attemptId: activeAttemptId() || undefined,
    payment: { ...payment, paymentId, requestId: fallbackRequestId },
    accessGrant,
    consume,
  };
}

async function runLoveSecretPaymentGate(paymentPayload: BillingPaymentPayload, idempotencyKey: string, copy: LoveSecretClientCopy) {
  const runtimeGate = asRecord(paymentPayload.runtimeGate);
  const gateResult = await runBillingCoinGate({
    categoryKey: toText(runtimeGate.categoryKey) || "premium-consultation",
    subFeatureKey: SERVICE_TYPE,
    featureKey: SERVICE_TYPE,
    reason: toText(runtimeGate.reason || paymentPayload.orderName) || copy.passCheckReason,
    requestId: idempotencyKey,
    idempotencyKey,
    cost: toNumber(runtimeGate.cost ?? runtimeGate.coinPrice, 300),
    coinPrice: toNumber(runtimeGate.coinPrice ?? runtimeGate.cost, 300),
    amountKRW: toNumber(runtimeGate.amountKRW ?? paymentPayload.amountKRW ?? paymentPayload.paymentAmount, 30000),
    membershipCreditCost: toNumber(runtimeGate.membershipCreditCost, 3000),
    productId: toText(runtimeGate.productId) || "love-secret-ai",
    productType: toText(runtimeGate.productType) || "love-secret-ai",
    serviceType: toText(runtimeGate.serviceType) || "love-secret-ai",
  });
  if (!isPaymentGranted(gateResult)) {
    const code = String(gateResult.error?.code || "").toUpperCase();
    if (code === "PAYMENT_CANCELLED") throw new Error(copy.errorMessages.paymentCancelled);
    throw new Error(copy.errorMessages.paymentVerifyFailed);
  }
  return extractPayment(gateResult, idempotencyKey);
}

export default function LoveSecretAiPage() {
  const copy = useLoveSecretClientCopy();
  const [form, setForm] = useState<ConsultationForm>(() => buildInitialForm());
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [resultOpenMessage, setResultOpenMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [progressIndex, setProgressIndex] = useState(0);
  const startLockRef = useRef(false);
  const resultWindowRef = useRef<Window | null>(null);
  const idempotencyKeyRef = useRef(createIdempotencyKey());
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

  const busy = phase === "reading" || phase === "payment" || phase === "generating";
  const selectedTopic = useMemo(() => copy.focusLabel[form.focusArea], [form.focusArea, copy]);
  const phaseText = useMemo(() => {
    if (phase === "reading") return copy.phaseReading;
    if (phase === "payment") return copy.phasePayment;
    if (phase === "generating") return copy.generatingSteps[progressIndex] || copy.generatingSteps[0];
    if (phase === "ready") return copy.phaseReady;
    return copy.phaseIdle;
  }, [phase, progressIndex, copy]);

  useEffect(() => {
    console.info("[LoveSecret AI Page Enter]", { route: "/love-secret-ai" });
    try {
      const params = new URL(window.location.href).searchParams;
      const attemptId = params.get("attemptId") || "";
      if (attemptId) {
        const url = buildResultUrl({ attemptId });
        setResultUrl(url);
        setNotice(copy.resumeNotice);
      }
    } catch (caught) {
      console.info("[LoveSecret AI Attempt Restore Skipped]", { message: caught instanceof Error ? caught.message : String(caught) });
    }
    // 마운트 시 1회만 URL 을 확인한다; copy 는 그 시점의 로케일로 문구를 채울 뿐 재실행 트리거가 아니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!busy) {
      if (phase === "ready") setProgress(100);
      if (phase === "idle" || phase === "error") setProgress(0);
      return;
    }
    const base = phase === "reading" ? 14 : phase === "payment" ? 28 : 40;
    setProgress((current) => Math.max(current, base));
    const progressTimer = window.setInterval(() => {
      setProgress((current) => {
        const ceiling = phase === "generating" ? 95 : phase === "payment" ? 42 : 32;
        if (current >= ceiling) return ceiling;
        return Math.min(ceiling, current + (phase === "generating" ? 3 : 2));
      });
    }, 700);
    const stepTimer = window.setInterval(() => {
      if (phase === "generating") setProgressIndex((current) => Math.min(copy.generatingSteps.length - 1, current + 1));
    }, 1800);
    return () => {
      window.clearInterval(progressTimer);
      window.clearInterval(stepTimer);
    };
  }, [busy, phase, copy]);

  const resetAttempt = useCallback(() => {
    // 모든 사용자 입력 핸들러가 이 함수를 거치므로, 여기서 입력 시작 여부를 기록
    formTouchedRef.current = true;
    if (busy) return;
    idempotencyKeyRef.current = createIdempotencyKey();
    setResultUrl("");
    setResultOpenMessage("");
    setNotice("");
    setError("");
    setPhase("idle");
    setProgress(0);
    setProgressIndex(0);
  }, [busy]);

  function setPersonField(target: "myInfo" | "partnerInfo", field: keyof PersonInfo, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [target]: {
        ...current[target],
        [field]: value,
        ...(field === "birthTimeUnknown" && value === true ? { birthTime: "" } : {}),
      },
    }));
    resetAttempt();
  }

  function setTopic(value: FocusArea) {
    setForm((current) => ({ ...current, focusArea: value }));
    resetAttempt();
  }

  function validateForm() {
    if (!form.myInfo.gender || !form.myInfo.birthDate || !form.myInfo.calendarType || !form.relationshipStatus) return copy.errorMessages.invalidInput;
    if (!form.myInfo.birthTimeUnknown && !form.myInfo.birthTime) return copy.errorMessages.birthTimeRequired;
    if (form.focusArea === "custom" && form.question.trim().length < 2) return copy.errorMessages.questionRequired;
    return "";
  }

  function validateCurrentStep() {
    return STEPS[step].valid(form);
  }

  function currentStepError() {
    return copy.errorMessages[STEPS[step].error(form)];
  }

  function openPendingResultWindow(requestId: string) {
    const url = buildResultUrl({ pending: true, requestId, attemptId: activeAttemptId() || undefined });
    setResultUrl(url);
    if (typeof window === "undefined") return;
    const opened = window.open(url, "_blank");
    if (opened) {
      opened.opener = null;
      resultWindowRef.current = opened;
      setResultOpenMessage(copy.resultOpeningNewWindow);
      return;
    }
    setResultOpenMessage(copy.resultBlockedPopup);
  }

  function moveResultWindow(url: string) {
    setResultUrl(url);
    if (!resultWindowRef.current || resultWindowRef.current.closed) {
      setResultOpenMessage(copy.resultReadyUseButton);
      return;
    }
    try {
      resultWindowRef.current.location.replace(url);
      setResultOpenMessage(copy.resultOpenedNewWindow);
    } catch {
      setResultOpenMessage(copy.resultReadyUseButton);
    }
  }

  async function pollResult(requestId: string) {
    const attemptId = activeAttemptId();
    const query = new URLSearchParams({ requestId });
    if (attemptId) query.set("attemptId", attemptId);
    for (let count = 0; count < 35; count += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, count < 5 ? 1300 : 2200));
      const { response, payload } = await getJson<ConsultationResult>(`/api/love-secret-ai/result?${query.toString()}`);
      if (response.status === 202) continue;
      if (payload?.ok && payload.sessionId) return payload;
      if (!response.ok || payload?.ok === false) throw new Error(payload?.message || copy.errorMessages.llmError);
    }
    throw new Error(copy.errorMessages.resultTimeout);
  }

  async function startConsultation(
    payload: ReturnType<typeof buildPayload>,
    idempotencyKey: string,
    access: Record<string, unknown>,
  ) {
    setPhase("generating");
    // 다음 화면(생성 중 상태)이 마운트되는 시점 — 게이트 오버레이 hold를 해제한다.
    releasePaidFeatureGate(idempotencyKey);
    setProgressIndex(0);
    markPaidAttemptGenerationStarted("love_secret_ai_generate_start");
    const attemptId = activeAttemptId();
    const { payload: result } = await postJson<ConsultationResult>("/api/love-secret-ai/generate", {
      ...payload,
      ...access,
      attemptId: attemptId || payload.attemptId,
    }, idempotencyKey);

    const completed = result.ok && Array.isArray(result.messages) && result.messages.length
      ? result
      : result.ok && result.status === "generating"
        ? await pollResult(idempotencyKey)
        : null;

    if (completed?.ok && completed.sessionId) {
      const url = buildResultUrl({ sessionId: completed.sessionId, attemptId: attemptId || undefined });
      setProgress(100);
      setNotice("");
      setError("");
      setPhase("ready");
      markPaidAttemptGenerationCompleted();
      moveResultWindow(url);
      return;
    }

    if (result.reason === "PAYMENT_VERIFY_FAILED") throw new Error(copy.errorMessages.paymentVerifyFailed);
    if (result.reason === "LLM_ERROR") throw new Error(copy.errorMessages.llmError);
    throw new Error(result.message || copy.errorMessages.serverError);
  }

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (startLockRef.current || busy) return;
    const validationMessage = validateForm();
    if (validationMessage) {
      setNotice("");
      setError(validationMessage);
      setPhase("error");
      return;
    }
    startLockRef.current = true;
    const idempotencyKey = idempotencyKeyRef.current;
    openPendingResultWindow(idempotencyKey);
    const payload = buildPayload(form, idempotencyKey);
    console.info("[LoveSecret AI Submit Start]", {
      route: "/love-secret-ai",
      requestId: idempotencyKey,
      serviceType: SERVICE_TYPE,
      focusArea: payload.focusArea,
      relationshipStatus: payload.relationshipStatus,
      questionLength: payload.question.length,
    });
    setError("");
    setNotice("");
    setPhase("reading");
    setProgressIndex(0);
    beginPaidFeatureGateCheck({
      featureKey: SERVICE_TYPE,
      requestId: idempotencyKey,
      title: copy.passCheckTitle,
      reason: copy.passCheckReason,
      paymentMode: "MEMBERSHIP_PASS",
    });
    // 이용권 판정(unlock-status)을 아래 prepare 왕복과 겹쳐 돌린다 — 결제 게이트가 같은 키로 재사용해 직렬 왕복이 1회 준다.
    void primePaymentEligibility({
      categoryKey: "premium-consultation",
      subFeatureKey: SERVICE_TYPE,
      featureKey: SERVICE_TYPE,
      reason: copy.passCheckReason,
      productId: "love-secret-ai",
      productType: "love-secret-ai",
      serviceType: "love-secret-ai",
      cost: 300,
      coinPrice: 300,
      amountKRW: 30000,
    });
    // 확인 완료 후 다음 화면(생성 중 상태)이 실제로 뜰 때까지 게이트 오버레이를 유지해 "확인 중 → 공백"을 막는다.
    // release는 startConsultation의 setPhase("generating")에서 호출한다(안전장치 상한 8초).
    holdPaidFeatureGateOpen({ requestId: idempotencyKey, maxMs: 8000 });

    try {
      const { payload: access } = await postJson<EnsureAccessResult>("/api/love-secret-ai/prepare", payload, idempotencyKey);
      if (access.ok) {
        completePaidFeatureGateCheck({
          featureKey: SERVICE_TYPE,
          requestId: idempotencyKey,
          title: copy.passCheckCompleteTitle,
          reason: copy.passCheckReason,
          paymentMode: "MEMBERSHIP_PASS",
          message: copy.passCheckCompleteMessage,
        });
        await startConsultation(payload, idempotencyKey, { accessToken: access.accessToken });
        return;
      }
      if (access.reason === "LOGIN_REQUIRED") throw new Error(copy.errorMessages.loginRequired);
      if (access.reason === "INVALID_INPUT") throw new Error(access.message || copy.errorMessages.invalidInput);
      // 이용권 확인 앞단의 일시 장애(degraded)면 dead-end 대신 결제창(단건+월정석)을 연다(요구사항: 확인 실패 시 무조건 결제창).
      // runLoveSecretPaymentGate가 billing.js coin-gate로 pass를 재검사(재시도 포함)해 보유자면 무료통과, 미커버/장애면 결제창.
      const passGateDegraded = (access as Record<string, unknown>).retryable === true || String(access.reason) === "DB_DEGRADED";
      if (isPaymentRequiredResult(access) || passGateDegraded) {
        setNotice(copy.errorMessages.paymentRequired);
        setPhase("payment");
        const gatePayload = (isPaymentRequiredResult(access) ? access.paymentPayload : {}) as BillingPaymentPayload;
        const payment = await runLoveSecretPaymentGate(gatePayload, idempotencyKey, copy);
        await startConsultation(buildPayload(form, idempotencyKey), idempotencyKey, payment);
        return;
      }
      throw new Error(("message" in access && access.message) || copy.errorMessages.serverError);
    } catch (caught) {
      const message = caught instanceof TypeError ? copy.errorMessages.networkError : caught instanceof Error ? caught.message : copy.errorMessages.serverError;
      const paymentCancelled = message === copy.errorMessages.paymentCancelled;
      markPaidAttemptFailed(message || "love_secret_ai_generate_failed");
      setError(message || copy.errorMessages.serverError);
      setPhase("error");
      failPaidFeatureGateCheck({
        featureKey: SERVICE_TYPE,
        requestId: idempotencyKey,
        title: copy.passCheckFailedTitle,
        reason: copy.passCheckReason,
        paymentMode: "MEMBERSHIP_PASS",
        message: message || copy.errorMessages.serverError,
        cancelled: paymentCancelled,
      });
      setResultOpenMessage(copy.resultFailedSubmit);
    } finally {
      startLockRef.current = false;
    }
  }

  function goNext() {
    if (!validateCurrentStep()) {
      setError(currentStepError());
      return;
    }
    setError("");
    setStep((current) => Math.min(LAST_STEP, current + 1));
  }

  function focusFirstStepField() {
    setStep(0);
    if (typeof window === "undefined") return;
    const target = document.getElementById(FORM_ANCHOR_ID);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => target?.querySelector<HTMLButtonElement>("button")?.focus(), 420);
  }

  const stepPercent = busy ? Math.max(5, Math.min(100, progress)) : Math.round(((step + 1) / STEPS.length) * 100);
  const activeStep = STEPS[step];

  return (
    <main
      className={`${theme.theme} relative min-h-screen overflow-hidden text-[var(--ls-text)] [font-family:var(--font-body)]`}
      data-cd-marker="love-secret-ai-page-v20260627"
    >
      <div className={`pointer-events-none fixed inset-0 ${theme.pageBg}`} aria-hidden="true" />
      <div className={`pointer-events-none fixed inset-0 ${theme.pageGlow}`} aria-hidden="true" />
      <div className={`pointer-events-none fixed inset-0 ${styles.petalTexture}`} aria-hidden="true" />

      <section className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-10 pt-16 sm:px-6 sm:pt-14 lg:px-8">
        <LoveSecretHero onStart={focusFirstStepField} busy={busy} />

        <LoveSecretProgressRail
          mode={busy ? "generating" : "form"}
          label={busy ? phaseText : copy.stepLabelFormat(step + 1, copy.stepTitle[activeStep.id])}
          percent={stepPercent}
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <form onSubmit={handleSubmit} id={FORM_ANCHOR_ID} className="min-w-0">
            <div
              key={busy ? "busy" : activeStep.id}
              className={`${styles.stepEnter} rounded-[28px] border border-[var(--ls-line)] bg-[var(--ls-surface)] p-5 shadow-[var(--ls-glow)] sm:p-7`}
            >
              {busy ? (
                <LoveSecretGeneratingCard phase={phase} text={phaseText} progress={progress} progressIndex={progressIndex} />
              ) : (
                <>
                  <header className="mb-6 flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--ls-surface-sunken)] text-[var(--ls-accent)] ring-1 ring-[var(--ls-line)]">
                      <activeStep.Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black tracking-[0.14em] text-[var(--ls-accent)]">
                        STEP {step + 1} / {STEPS.length}
                      </p>
                      <h2 className="mt-1 break-keep text-xl font-black text-[var(--ls-text)] [font-family:var(--font-display)] sm:text-2xl">
                        {copy.stepTitle[activeStep.id]}
                      </h2>
                      <p className="mt-1.5 text-sm leading-6 text-[var(--ls-text-muted)]">{copy.stepHelper[activeStep.id]}</p>
                    </div>
                    {activeStep.id === "me" && (
                      <button
                        type="button"
                        onClick={loadFormFromProfileCard}
                        className={`${theme.focusRing} shrink-0 rounded-xl border border-[var(--ls-line-control)] px-3 py-2 text-xs font-bold text-[var(--ls-accent)] transition hover:bg-[var(--ls-surface-sunken)]`}
                        aria-label={copy.profileLoadAria}
                      >
                        {copy.profileLoadCta}
                      </button>
                    )}
                  </header>

                  {activeStep.id === "status" && (
                    <LoveSecretStatusPicker
                      value={form.relationshipStatus}
                      disabled={busy}
                      onChange={(value) => {
                        setForm((current) => ({ ...current, relationshipStatus: value }));
                        resetAttempt();
                      }}
                    />
                  )}

                  {activeStep.id === "focus" && (
                    <LoveSecretTopicSelector
                      focusArea={form.focusArea}
                      question={form.question}
                      disabled={busy}
                      onTopicChange={setTopic}
                      onQuestionChange={(value) => {
                        setForm((current) => ({ ...current, question: value }));
                        resetAttempt();
                      }}
                    />
                  )}

                  {activeStep.id === "me" && (
                    <>
                      {profileSeed && !formTouchedRef.current && (
                        <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--ls-surface-sunken)] px-3 py-1.5 text-xs font-bold text-[var(--ls-accent)]">
                          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                          {copy.autoFilledNotice}
                        </p>
                      )}
                      <PersonFields
                        variant="me"
                        value={form.myInfo}
                        required
                        disabled={busy}
                        onChange={(field, value) => setPersonField("myInfo", field, value)}
                      />
                    </>
                  )}

                  {activeStep.id === "partner" && (
                    <div className="grid gap-6">
                      <PersonFields
                        variant="partner"
                        value={form.partnerInfo}
                        disabled={busy}
                        onChange={(field, value) => setPersonField("partnerInfo", field, value)}
                      />
                      <LoveSecretReadyCard form={form} topic={selectedTopic} />
                    </div>
                  )}
                </>
              )}
            </div>

            {(notice || error) && (
              <div
                role={error ? "alert" : undefined}
                className={cx(
                  "mt-4 flex gap-3 rounded-2xl border p-4 text-sm leading-6",
                  error
                    ? "border-[var(--ls-accent)] bg-[var(--ls-surface-sunken)] text-[var(--ls-text)]"
                    : "border-[var(--ls-line-control)] bg-[var(--ls-surface-2)] text-[var(--ls-text-muted)]",
                )}
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ls-accent)]" aria-hidden="true" />
                <p>{error || notice}</p>
              </div>
            )}

            <div className="sticky bottom-3 z-10 mt-5 rounded-[22px] border border-[var(--ls-line)] bg-[var(--ls-veil)] p-3 shadow-[var(--ls-glow)] backdrop-blur-xl [padding-bottom:calc(0.75rem+env(safe-area-inset-bottom))]">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  className={`${theme.focusRing} inline-flex min-h-12 items-center gap-2 rounded-2xl border border-[var(--ls-line-control)] px-4 text-sm font-bold text-[var(--ls-text)] transition hover:bg-[var(--ls-surface-sunken)] disabled:cursor-not-allowed disabled:opacity-45`}
                  onClick={() => setStep((current) => Math.max(0, current - 1))}
                  disabled={busy || step === 0}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  {copy.prevStepLabel}
                </button>
                {step < LAST_STEP ? (
                  <button
                    type="button"
                    className={`${theme.focusRing} inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[image:var(--ls-cta)] px-5 text-sm font-black text-[var(--ls-cta-ink)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55`}
                    onClick={goNext}
                    disabled={busy}
                  >
                    {copy.nextStepLabel}
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className={`${theme.focusRing} inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[image:var(--ls-cta)] px-5 text-sm font-black text-[var(--ls-cta-ink)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55`}
                    disabled={busy}
                  >
                    {busy
                      ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                      : <Heart className="h-4 w-4 fill-current" aria-hidden="true" />}
                    {busy ? phaseText : copy.submitCta}
                  </button>
                )}
              </div>
              {step === LAST_STEP && !busy && (
                <div className="mt-3 flex items-center justify-end border-t border-[var(--ls-line)] pt-3">
                  <PriceBadge
                    featureKey="love-secret-ai-consultation"
                    prefix={copy.priceLabelPrefix}
                    className="text-sm font-bold text-[var(--ls-text-muted)]"
                  />
                </div>
              )}
            </div>
          </form>

          <aside className="space-y-5">
            <LoveSecretPromiseCard />
            {(resultUrl || resultOpenMessage) && (
              <section className="rounded-3xl border border-[var(--ls-line-control)] bg-[var(--ls-surface)] p-5 shadow-[var(--ls-glow)]">
                <p className="text-sm font-bold text-[var(--ls-text)]">{resultOpenMessage || copy.resultReadyMessage}</p>
                {resultUrl && (
                  <a
                    href={resultUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={`${theme.focusRing} mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-[image:var(--ls-cta)] px-4 text-sm font-black text-[var(--ls-cta-ink)] transition hover:-translate-y-0.5`}
                  >
                    {copy.openResultNewWindowCta}
                  </a>
                )}
              </section>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}

function LoveSecretHero({ onStart, busy }: { onStart: () => void; busy: boolean }) {
  const copy = useLoveSecretClientCopy();
  return (
    <header
      className={`${styles.heroCard} relative overflow-hidden rounded-[32px] border border-[var(--ls-line)] bg-[var(--ls-surface)] px-6 py-10 sm:px-10 sm:py-14`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-cover bg-right opacity-60"
        style={{ backgroundImage: "url('/fuctionassets/love-secret-reading-room-v1.webp')" }}
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[image:var(--ls-hero-veil)]" />
      {/* 하트 타일 텍스처(styles.petalTexture)를 여기 얹지 않는다 — 히어로는 이미 사진이
          질감을 담당하고, 사진 위에 패턴을 깔면 포장지처럼 보인다. 페이지 전역 텍스처는
          평평한 배경을 맡는 788행 하나로 충분하다. */}
      {/* 왼쪽 정렬 고정(mx-auto 금지): 베일이 좌측에 무겁게 깔리므로 가운데 정렬하면
          넓은 화면에서 글이 옅어진 우측으로 밀려 대비가 무너진다. 사진은 오른쪽에 남겨 둔다. */}
      <div className={`${theme.onDark} relative z-10 flex max-w-2xl flex-col items-start text-left`}>
        <span className={`${styles.heroRing} relative grid h-16 w-16 place-items-center rounded-full bg-[var(--ls-surface-sunken)]`}>
          <Heart className={`${styles.heroHeart} h-8 w-8 fill-[var(--ls-accent)] text-[var(--ls-accent)]`} aria-hidden="true" />
        </span>
        {/* 서체는 --font-display(픽셀 계열)가 아니라 DESIGN.md 의 brand-serif 역할(--font-serif).
            사진·밀랍 인장의 고전적인 화면에 픽셀 디스플레이체가 얹히면 결이 어긋난다.
            한글 명조 미러는 700 만 있으므로(globals.css 345행) font-black 이 아니라 font-bold 다. */}
        <h1 className="mt-8 text-balance break-keep text-[clamp(2.2rem,7vw,3.6rem)] font-bold leading-[1.15] tracking-[-0.01em] text-[var(--ls-text)] [font-family:var(--font-serif)]">
          {copy.heroTitle}
        </h1>
        <p className="mt-3 text-balance break-keep text-lg font-bold leading-8 text-[var(--ls-accent)] sm:text-xl">
          {copy.heroSubtitle}
        </p>
        <p className="mt-5 max-w-xl text-pretty break-keep text-[0.95rem] leading-7 text-[var(--ls-text-muted)]">
          {copy.heroDescription}
        </p>
        <button
          type="button"
          onClick={onStart}
          disabled={busy}
          className={`${theme.focusRing} mt-10 inline-flex min-h-12 items-center gap-2 rounded-full bg-[image:var(--ls-cta)] px-7 text-sm font-black text-[var(--ls-cta-ink)] shadow-[var(--ls-glow)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 active:translate-y-0 disabled:translate-y-0 disabled:opacity-55 motion-reduce:transition-none motion-reduce:hover:translate-y-0`}
        >
          <Heart className="h-4 w-4 fill-current" aria-hidden="true" />
          {copy.heroStartCta}
        </button>
        <ul className="mt-8 flex flex-wrap justify-start gap-2">
          {copy.heroPromises.map((item) => (
            <li
              key={item}
              className="rounded-full border border-[var(--ls-line)] bg-[var(--ls-surface-2)] px-3.5 py-1.5 text-xs font-bold text-[var(--ls-text-muted)]"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}

function LoveSecretProgressRail({ mode, label, percent }: { mode: "form" | "generating"; label: string; percent: number }) {
  const copy = useLoveSecretClientCopy();
  return (
    <div className="rounded-2xl border border-[var(--ls-line)] bg-[var(--ls-surface)] px-4 py-3">
      <div className="flex items-center justify-between gap-3 text-xs font-black">
        <span className="min-w-0 truncate text-[var(--ls-text)]">{label}</span>
        <span className="shrink-0 text-[var(--ls-accent)]">{percent}%</span>
      </div>
      {/* 접근 가능한 진행 안내는 생성 카드의 aria-live 가 담당한다. 여기서 또 알리면 중복 낭독이 된다. */}
      <div className={`mt-2 h-2 overflow-hidden rounded-full ${styles.railTrack}`} aria-hidden="true">
        <div
          className={`h-full rounded-full ${styles.railFill}`}
          style={{ "--ls-progress": percent / 100 } as CSSProperties}
        />
      </div>
      <span className="sr-only">{mode === "generating" ? copy.progressGeneratingSrLabel : copy.progressFormSrLabel} {percent}%</span>
    </div>
  );
}

function LoveSecretStatusPicker({
  value,
  disabled,
  onChange,
}: {
  value: RelationshipStatus | "";
  disabled: boolean;
  onChange: (value: RelationshipStatus) => void;
}) {
  const copy = useLoveSecretClientCopy();
  return (
    <div className="flex flex-wrap gap-2.5">
      {RELATIONSHIP_VALUES.map((itemValue) => (
        <button
          key={itemValue}
          type="button"
          disabled={disabled}
          aria-pressed={value === itemValue}
          onClick={() => onChange(itemValue)}
          className={cx(
            theme.focusRing,
            "min-h-11 rounded-full border px-4 text-sm font-black transition disabled:opacity-55",
            value === itemValue
              ? "border-[var(--ls-accent)] bg-[var(--ls-accent)] text-[var(--ls-accent-ink)]"
              : "border-[var(--ls-line-control)] bg-[var(--ls-surface-2)] text-[var(--ls-text)] hover:bg-[var(--ls-surface-sunken)]",
          )}
        >
          {copy.relationshipLabel[itemValue]}
        </button>
      ))}
    </div>
  );
}

function PersonFields({
  variant,
  value,
  required = false,
  disabled,
  onChange,
}: {
  variant: "me" | "partner";
  value: PersonInfo;
  required?: boolean;
  disabled: boolean;
  onChange: (field: keyof PersonInfo, value: string | boolean) => void;
}) {
  const copy = useLoveSecretClientCopy();
  const fieldLabels = copy.personFieldLabels[variant];
  const inputClass = `${theme.focusRing} min-h-12 rounded-2xl border border-[var(--ls-line-control)] bg-[var(--ls-surface-2)] px-4 text-[var(--ls-text)] outline-none transition placeholder:text-[var(--ls-text-muted)] disabled:opacity-55`;
  return (
    <div className="grid gap-5">
      <label className="grid gap-2">
        <span className="text-sm font-bold text-[var(--ls-text)]">{fieldLabels.nameOrNickname}</span>
        <input
          value={value.name}
          onChange={(event) => onChange("name", event.target.value)}
          maxLength={80}
          disabled={disabled}
          className={inputClass}
          placeholder={required ? copy.namePlaceholderRequired : copy.namePlaceholderOptional}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup label={fieldLabels.gender}>
          <div className="grid grid-cols-3 gap-2">
            {[
              ["female", copy.genderFemale],
              ["male", copy.genderMale],
              ["unknown", copy.genderUnknown],
            ].map(([option, text]) => (
              <button
                key={option}
                type="button"
                disabled={disabled}
                aria-pressed={value.gender === option}
                onClick={() => onChange("gender", option)}
                className={cx(
                  theme.focusRing,
                  "min-h-11 rounded-2xl border px-3 text-sm font-black transition disabled:opacity-55",
                  value.gender === option
                    ? "border-[var(--ls-accent)] bg-[var(--ls-accent)] text-[var(--ls-accent-ink)]"
                    : "border-[var(--ls-line-control)] bg-[var(--ls-surface-2)] text-[var(--ls-text)] hover:bg-[var(--ls-surface-sunken)]",
                )}
              >
                {text}
              </button>
            ))}
          </div>
        </FieldGroup>
        <FieldGroup label={fieldLabels.calendarType}>
          <div className="grid grid-cols-2 gap-2">
            {[
              ["solar", copy.solarLabel],
              ["lunar", copy.lunarLabel],
            ].map(([option, text]) => (
              <button
                key={option}
                type="button"
                disabled={disabled}
                aria-pressed={value.calendarType === option}
                onClick={() => onChange("calendarType", option)}
                className={cx(
                  theme.focusRing,
                  "min-h-11 rounded-2xl border text-sm font-black transition disabled:opacity-55",
                  value.calendarType === option
                    ? "border-[var(--ls-accent)] bg-[var(--ls-accent)] text-[var(--ls-accent-ink)]"
                    : "border-[var(--ls-line-control)] bg-[var(--ls-surface-2)] text-[var(--ls-text)] hover:bg-[var(--ls-surface-sunken)]",
                )}
              >
                {text}
              </button>
            ))}
          </div>
        </FieldGroup>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-[var(--ls-text)]">{fieldLabels.birthDate}</span>
          <input {...birthDateTextInputProps(value.birthDate, (nextBirthDate) => onChange("birthDate", nextBirthDate))} disabled={disabled} className={inputClass} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-[var(--ls-text)]">{fieldLabels.birthTime}</span>
          <input
            type="time"
            value={value.birthTime}
            onChange={(event) => onChange("birthTime", event.target.value)}
            disabled={disabled || value.birthTimeUnknown}
            className={inputClass}
          />
        </label>
      </div>

      <label className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-[var(--ls-line-control)] bg-[var(--ls-surface-2)] px-4 text-sm font-bold text-[var(--ls-text)]">
        <span>{copy.birthTimeUnknownLabel}</span>
        <input
          type="checkbox"
          checked={value.birthTimeUnknown}
          onChange={(event) => onChange("birthTimeUnknown", event.target.checked)}
          disabled={disabled}
          className="h-5 w-5 rounded accent-[var(--ls-accent)]"
        />
      </label>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <span className="text-sm font-bold text-[var(--ls-text)]">{label}</span>
      {children}
    </div>
  );
}

function LoveSecretTopicSelector({
  focusArea,
  question,
  disabled,
  onTopicChange,
  onQuestionChange,
}: {
  focusArea: FocusArea;
  question: string;
  disabled: boolean;
  onTopicChange: (value: FocusArea) => void;
  onQuestionChange: (value: string) => void;
}) {
  const copy = useLoveSecretClientCopy();
  return (
    <div className="grid gap-6">
      <FieldGroup label={copy.consultStyleLabel}>
        <div className="grid gap-3 sm:grid-cols-2">
          {FOCUS_VALUES.map((itemValue) => (
            <button
              key={itemValue}
              type="button"
              disabled={disabled}
              aria-pressed={focusArea === itemValue}
              onClick={() => onTopicChange(itemValue)}
              className={cx(
                theme.focusRing,
                "rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 disabled:opacity-55",
                focusArea === itemValue
                  ? "border-[var(--ls-accent)] bg-[var(--ls-surface-sunken)] shadow-[var(--ls-glow)]"
                  : "border-[var(--ls-line-control)] bg-[var(--ls-surface-2)] hover:bg-[var(--ls-surface-sunken)]",
              )}
            >
              <span className="block text-sm font-black text-[var(--ls-text)]">{copy.focusLabel[itemValue]}</span>
              <span className="mt-2 block text-xs leading-5 text-[var(--ls-text-muted)]">{copy.focusHint[itemValue]}</span>
            </button>
          ))}
        </div>
      </FieldGroup>

      <label className="grid gap-2">
        <span className="text-sm font-bold text-[var(--ls-text)]">
          {copy.questionLabel(focusArea === "custom")}
        </span>
        <textarea
          value={question}
          onChange={(event) => onQuestionChange(event.target.value)}
          maxLength={1200}
          disabled={disabled}
          placeholder={focusArea === "custom" ? copy.questionPlaceholderCustom : copy.questionPlaceholderOptional}
          className={`${theme.focusRing} min-h-[140px] resize-y rounded-3xl border border-[var(--ls-line-control)] bg-[var(--ls-surface-2)] px-4 py-3 text-[var(--ls-text)] outline-none transition placeholder:text-[var(--ls-text-muted)] disabled:opacity-55`}
        />
      </label>
    </div>
  );
}

function LoveSecretReadyCard({ form, topic }: { form: ConsultationForm; topic: string }) {
  const copy = useLoveSecretClientCopy();
  const mySummary = [
    form.myInfo.name || copy.meNameFallback,
    form.myInfo.birthDate || copy.birthDateMissing,
    form.myInfo.birthTimeUnknown ? copy.birthTimeUnknownLabel : form.myInfo.birthTime || copy.birthTimeMissing,
  ].join(" · ");
  const partnerSummary = hasPartnerInfo(form.partnerInfo)
    ? [form.partnerInfo.name || copy.partnerNameFallback, form.partnerInfo.birthDate || copy.birthDateMissing, form.partnerInfo.birthTimeUnknown ? copy.birthTimeUnknownLabel : form.partnerInfo.birthTime || copy.birthTimeMissing].join(" · ")
    : copy.noPartnerInfoSummary;

  return (
    <section className="rounded-3xl border border-[var(--ls-gold)] bg-[var(--ls-surface-sunken)] p-5">
      <div className="flex items-center gap-2 text-[var(--ls-accent)]">
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        <h3 className="text-base font-black text-[var(--ls-text)]">{copy.readyCardHeading}</h3>
      </div>
      <div className="mt-4 grid gap-2.5 text-sm leading-6">
        <InfoLine title={copy.myInfoLabel} value={mySummary} />
        <InfoLine title={copy.partnerInfoLabel} value={partnerSummary} />
        <InfoLine title={copy.consultStyleLabel} value={topic} />
      </div>
    </section>
  );
}

function InfoLine({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--ls-line)] bg-[var(--ls-surface)] p-3">
      <p className="text-xs font-black text-[var(--ls-accent)]">{title}</p>
      <p className="mt-1 break-words text-sm font-bold text-[var(--ls-text)]">{value}</p>
    </div>
  );
}

function LoveSecretPromiseCard() {
  const copy = useLoveSecretClientCopy();
  return (
    <section className="rounded-3xl border border-[var(--ls-line)] bg-[var(--ls-surface)] p-5 shadow-[var(--ls-glow)]">
      <div className="flex items-center gap-2 text-[var(--ls-accent)]">
        <Moon className="h-4 w-4" aria-hidden="true" />
        <h2 className="text-base font-black text-[var(--ls-text)]">{copy.promiseCardHeading}</h2>
      </div>
      <ul className="mt-4 grid gap-2">
        {copy.analysisItems.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-sm leading-6 text-[var(--ls-text-muted)]">
            <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-[var(--ls-accent)]" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <p className="mt-5 border-t border-[var(--ls-line)] pt-4 text-xs leading-6 text-[var(--ls-text-muted)]">
        {copy.promiseCardFooter}
      </p>
    </section>
  );
}

function LoveSecretGeneratingCard({ phase, text, progress, progressIndex }: { phase: Phase; text: string; progress: number; progressIndex: number }) {
  const copy = useLoveSecretClientCopy();
  return (
    <section className="relative overflow-hidden rounded-3xl bg-[var(--ls-surface-sunken)] p-6" aria-live="polite">
      <div className={`${styles.petalField} ${styles.sparkleField}`} aria-hidden="true">
        {Array.from({ length: 14 }, (_, index) => (
          <span key={index} className={styles.petal} />
        ))}
      </div>

      <div className="relative flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--ls-surface)] text-[var(--ls-accent)] ring-1 ring-[var(--ls-line)]">
          {phase === "payment"
            ? <WalletCards className="h-5 w-5" aria-hidden="true" />
            : <Clock3 className="h-5 w-5" aria-hidden="true" />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="break-keep text-lg font-black text-[var(--ls-text)] [font-family:var(--font-display)]">
            {copy.generatingCardHeading}
          </h3>
          <p className="mt-1.5 text-sm leading-6 text-[var(--ls-text-muted)]">{text}</p>
          <p className="mt-1 text-xs text-[var(--ls-text-muted)]">{copy.generatingCardSubtext}</p>
        </div>
      </div>

      <div className="relative mt-5 h-2.5 overflow-hidden rounded-full bg-[var(--ls-surface)]" aria-hidden="true">
        <div
          className={`h-full rounded-full ${styles.railFill}`}
          style={{ "--ls-progress": Math.max(5, Math.min(100, progress)) / 100 } as CSSProperties}
        />
      </div>

      <ul className="relative mt-5 grid gap-2">
        {copy.generatingSteps.map((item, index) => (
          <li
            key={item}
            className={cx(
              "flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-xs font-bold transition",
              progressIndex >= index
                ? "border-[var(--ls-line-control)] bg-[var(--ls-surface)] text-[var(--ls-text)]"
                : "border-[var(--ls-line)] bg-transparent text-[var(--ls-text-muted)]",
            )}
          >
            {progressIndex >= index
              ? <Check className="h-4 w-4 shrink-0 text-[var(--ls-accent)]" aria-hidden="true" />
              : <Star className="h-4 w-4 shrink-0" aria-hidden="true" />}
            <span className="min-w-0">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
