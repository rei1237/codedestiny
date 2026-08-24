"use client";

import { birthDateTextInputProps } from "@/lib/birthDateInputProps";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { authFetch } from "@/app/_lib/auth-client";
import { handleSessionInvalidated } from "@/app/_lib/auth-store";
import {
  beginPaidFeatureGateCheck,
  completePaidFeatureGateCheck,
  failPaidFeatureGateCheck,
  runBillingCoinGate,
} from "@/app/_lib/billing-client";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";
import { PriceBadge } from "@/app/components/PriceBadge";
import { toDisplayText } from "@/lib/llm-text";
import {
  buildRecommendationBundle,
  STYLE_PRESETS,
  type DraftNameCandidate,
  type NamingRecommendationInput,
  type NamingSajuHints,
} from "./namingRecommendations";
import { stashNamingRetryPayload } from "./retryHandoff";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

const FEATURE_KEY = "premium-naming-prompt";
const AMOUNT_KRW = 30000;
const COIN_PRICE = 300;
const MEMBERSHIP_CREDIT_COST = 3000;

type GenderValue = "" | "M" | "F" | "OTHER";
type CalendarValue = "solar" | "lunar";
type Phase = "idle" | "checking" | "payment" | "verifying" | "generating" | "error";

type FormState = {
  gender: GenderValue;
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  calendarType: CalendarValue;
  isLeapMonth: boolean;
  birthPlace: string;
  timezone: string;
  familyName: string;
  nameLength: number;
  desiredType: string;
  currentName: string;
  desiredSyllablesText: string;
  requiredSyllablesText: string;
  blockedSyllablesText: string;
  desiredNamesText: string;
  preferenceTone: string;
  useHanja: boolean;
  generationNameRule: string;
  siblingHarmony: string;
  avoidFamilyNames: string;
  memo: string;
};

const INITIAL_FORM: FormState = {
  gender: "",
  birthDate: "",
  birthTime: "",
  birthTimeUnknown: false,
  calendarType: "solar",
  isLeapMonth: false,
  birthPlace: "대한민국",
  timezone: "Asia/Seoul",
  familyName: "",
  nameLength: 2,
  desiredType: "",
  currentName: "",
  desiredSyllablesText: "",
  requiredSyllablesText: "",
  blockedSyllablesText: "",
  desiredNamesText: "",
  preferenceTone: "",
  useHanja: true,
  generationNameRule: "",
  siblingHarmony: "",
  avoidFamilyNames: "",
  memo: "",
};

interface NamingCopy {
  reason: string;
  errorText: Record<string, string>;
  fieldNames: { gender: string; birthDate: string; calendarType: string; familyName: string };
  missingFieldsMessage: (fields: string[]) => string;
  nameTypeOptions: string[];
  generationRuleOptions: string[];
  siblingOptions: string[];
  avoidOptions: string[];
  purposeOptions: string[];
  generatingSteps: string[];
  gateCheckingTitle: string;
  gateCheckedTitle: string;
  defaultBirthPlace: string;
  heroBadge: string;
  heroTitle: string;
  heroDescription: string;
  heroPills: string[];
  stepsAriaLabel: string;
  stepLabels: string[];
  step0Heading: string;
  reloadButtonAria: string;
  reloadButton: string;
  genderLabel: string;
  genderSelect: string;
  genderFemale: string;
  genderMale: string;
  genderOther: string;
  birthDateLabel: string;
  birthTimeLabel: string;
  calendarLabel: string;
  calendarSolar: string;
  calendarLunar: string;
  birthPlaceLabel: string;
  timezoneLabel: string;
  birthTimeUnknownCheckbox: string;
  leapMonthCheckbox: string;
  step0NextButton: string;
  step1Heading: string;
  familyNameLabel: string;
  familyNamePlaceholder: string;
  familyNameHint: string;
  familyNameLooksFullWarning: string;
  nameLengthLabel: string;
  nameLength1: string;
  nameLength2: string;
  nameLength3: string;
  nameLength4: string;
  currentNameLabel: string;
  currentNamePlaceholder: string;
  useHanjaLabel: string;
  useHanjaYes: string;
  useHanjaNo: string;
  desiredNamesLabel: string;
  desiredNamesPlaceholder: string;
  desiredSyllablesLabel: string;
  desiredSyllablesPlaceholder: string;
  requiredSyllablesLabel: string;
  requiredSyllablesPlaceholder: string;
  blockedSyllablesLabel: string;
  blockedSyllablesPlaceholder: string;
  freeDraftHeading: string;
  freeDraftBadge: string;
  freeDraftEmpty: string;
  /**
   * 무료 초안이 그 로케일의 이름 목록에서 나오지 **않을 때만** 그 사실을 밝힌다.
   * ko·ja·zh-CN·zh-TW·en 은 자기 풀이 있어 빈 문자열이고, 라틴 풀로 폴백하는 일곱만 채운다.
   */
  freeDraftPoolNote: string;
  step1PrevButton: string;
  step1NextButton: string;
  step2Heading: string;
  step2Intro: string;
  desiredTypeLabel: string;
  desiredTypePlaceholder: string;
  desiredTypeAria: string;
  preferenceToneLabel: string;
  preferenceTonePlaceholder: string;
  preferenceToneAria: string;
  generationNameRuleLabel: string;
  generationNameRulePlaceholder: string;
  generationNameRuleAria: string;
  siblingHarmonyLabel: string;
  siblingHarmonyPlaceholder: string;
  siblingHarmonyAria: string;
  avoidFamilyNamesLabel: string;
  avoidFamilyNamesPlaceholder: string;
  avoidFamilyNamesAria: string;
  memoLabel: string;
  memoAria: string;
  memoPlaceholder: string;
  step2PrevButton: string;
  sidebarHeading: string;
  sidebarDescription: string;
  summaryBirthLabel: string;
  summaryFamilyLabel: string;
  summaryPreferenceLabel: string;
  summaryNotEntered: string;
  summaryEntered: string;
  summaryOptional: string;
  summaryTimeUnknownSuffix: string;
  summaryCharSuffix: string;
  busyChecking: string;
  busyPayment: string;
  submitBusy: string;
  submitMissing: (field: string) => string;
  submitDefault: string;
  retryButton: string;
  footerNote: string;
  generatingSubtitle: string;
}

const NAMING_EN: NamingCopy = {
  reason: "Saju-based expert naming consultation generation",
  errorText: {
    LOGIN_REQUIRED: "You need to log in to use this.",
    INPUT_MISSING: "Please enter gender, birth date, solar/lunar calendar, and family name first.",
    HANJA_LENGTH_MISMATCH: "The number of characters in the Hanja candidate doesn't match the Hangul name's syllable count.",
    PAYMENT_CANCELLED: "Payment was cancelled. You can try again whenever you're ready.",
    PAYMENT_FAILED: "Payment verification failed. Please try again shortly.",
    PAYMENT_NOT_FOUND: "We couldn't confirm your payment record. If an amount was charged, it remains valid — please try again shortly.",
    NAMING_ACCESS_REQUIRED: "You can generate after confirming a pass, moonstone, or payment.",
    PAYMENT_ID_REQUIRED: "One-time payment verification hasn't finished. Please try again shortly.",
    INPUT_HASH_MISMATCH: "The input has changed. Please check your input and start again.",
    ACCESS_PRODUCT_MISMATCH: "This isn't a naming-prompt payment authorization. Please try again.",
    CHECKOUT_FAILED: "A problem occurred while preparing payment. Please try again shortly.",
    GENERATE_FAILED: "Failed to generate the naming result. Please try again shortly.",
    LLM_ERROR: "Failed to generate the naming result. Your payment is preserved, and you can retry with the same input.",
    POLL_TIMEOUT: "Generating the result is taking longer than expected. Please check the result page again shortly.",
    NETWORK_ERROR: "Please check your network connection and try again.",
    SERVER_ERROR: "A temporary error occurred. Please try again shortly.",
  },
  fieldNames: { gender: "gender", birthDate: "birth date", calendarType: "solar/lunar calendar", familyName: "family name" },
  missingFieldsMessage: (fields) => `Please enter ${fields.join(", ")} first.`,
  nameTypeOptions: ["Modern and soft", "Classic and neat", "Gender-neutral", "Easy to call", "Uncommon", "Works internationally"],
  generationRuleOptions: ["No generation name", "Generation character in the middle", "Generation character at the end"],
  siblingOptions: ["No siblings", "Same first character", "Match mood only"],
  avoidOptions: ["Exclude sounds like family names", "Prefer names without final consonants", "Exclude harsh/strong sounds"],
  purposeOptions: ["For birth registration", "For a name change", "To replace a nursery name"],
  generatingSteps: [
    "Checking your input and Saju criteria",
    "Confirming your pass or payment",
    "Building the Saju chart and verifying the guiding element",
    "Weaving sounds and Hanja into the naming booklet",
  ],
  gateCheckingTitle: "Checking pass",
  gateCheckedTitle: "Pass confirmed",
  defaultBirthPlace: "South Korea",
  heroBadge: "Saju-based premium expert naming",
  heroTitle: "Hunminjeongeum Naming House",
  heroDescription: "An expert names your child directly, weaving sound and Hanja meaning around the guiding and supporting elements verified from the Saju chart, and hands you the full prompt behind that naming booklet too. Entering info and free draft suggestions are free.",
  heroPills: ["Guiding-element verification", "Sound-element flow", "Won-Hyeong-Yi-Jeong 4-grid numerology", "Keep the result as a PDF"],
  stepsAriaLabel: "Naming preparation steps",
  stepLabels: ["Birth info", "Family name and name conditions", "Detailed preferences (optional)"],
  step0Heading: "Birth info",
  reloadButtonAria: "Load birth info from your profile card",
  reloadButton: "Load from profile card",
  genderLabel: "Gender",
  genderSelect: "Select",
  genderFemale: "Female",
  genderMale: "Male",
  genderOther: "Other / unspecified",
  birthDateLabel: "Birth date",
  birthTimeLabel: "Birth time",
  calendarLabel: "Calendar",
  calendarSolar: "Solar",
  calendarLunar: "Lunar",
  birthPlaceLabel: "Birth place",
  timezoneLabel: "Reference timezone",
  birthTimeUnknownCheckbox: "Birth time unknown",
  leapMonthCheckbox: "Leap month",
  step0NextButton: "Next · Family name and name conditions",
  step1Heading: "Family name and name conditions",
  familyNameLabel: "Family name",
  familyNamePlaceholder: "e.g. Kim",
  familyNameHint: "Enter only the family name. If you have a name in mind, write it under “Candidate names” or “Characters you must include” below.",
  familyNameLooksFullWarning: "This looks like a full name rather than a family name since it's three or more characters. If left as is, it will simply be prepended to the recommended candidates.",
  nameLengthLabel: "Number of syllables in the name",
  nameLength1: "One syllable",
  nameLength2: "Two syllables",
  nameLength3: "Three syllables",
  nameLength4: "Four syllables",
  currentNameLabel: "Hangul name you're currently considering",
  currentNamePlaceholder: "e.g. Seoyoon",
  useHanjaLabel: "Use a Hanja name",
  useHanjaYes: "Use it",
  useHanjaNo: "Focus on the Hangul name",
  desiredNamesLabel: "Candidate names (one per line, format: “Hangul | Hanja candidate1,Hanja candidate2 | note”)",
  desiredNamesPlaceholder: "Seoyoon | | soft and intelligent feel\nHarin | 荷潾,河璘 | clear and bright image",
  desiredSyllablesLabel: "Syllables you'd like to use",
  desiredSyllablesPlaceholder: "e.g. Seo, Yoon, Ha",
  requiredSyllablesLabel: "Characters you must include",
  requiredSyllablesPlaceholder: "e.g. Yoon",
  blockedSyllablesLabel: "Characters you want to avoid",
  blockedSyllablesPlaceholder: "e.g. Min, Ji",
  freeDraftHeading: "Free draft recommendations",
  freeDraftBadge: "For reference only · unrelated to payment",
  freeDraftEmpty: "We can't build draft candidates from your current input yet.",
  freeDraftPoolNote: "",
  step1PrevButton: "Previous",
  step1NextButton: "Next · Detailed preferences",
  step2Heading: "Detailed preferences (optional)",
  step2Intro: "You can leave this blank and still proceed with naming. Tap the options below or write your own, and the naming expert will reflect it as is.",
  desiredTypeLabel: "Type of name you want",
  desiredTypePlaceholder: "e.g. A modern, soft name",
  desiredTypeAria: "Select desired name type",
  preferenceToneLabel: "Name mood / image",
  preferenceTonePlaceholder: "e.g. Modern, clear, calm, elegant, starlight-like",
  preferenceToneAria: "Select name mood",
  generationNameRuleLabel: "Generation-name character",
  generationNameRulePlaceholder: "e.g. use 'jun' in the middle character",
  generationNameRuleAria: "Select generation-name rule",
  siblingHarmonyLabel: "Harmony with sibling names",
  siblingHarmonyPlaceholder: "e.g. to match the older brother's name Minjun",
  siblingHarmonyAria: "Select sibling harmony",
  avoidFamilyNamesLabel: "Family names or similar sounds to avoid",
  avoidFamilyNamesPlaceholder: "e.g. exclude sounds similar to grandmother's name",
  avoidFamilyNamesAria: "Select conditions to avoid",
  memoLabel: "Other requests",
  memoAria: "Select naming purpose",
  memoPlaceholder: "Let us know if this name will be used for an actual birth registration, a name change, or any particular mood you'd like.",
  step2PrevButton: "Previous",
  sidebarHeading: "Start premium naming",
  sidebarDescription: "After confirming the required fields, we proceed with a 30,000 KRW one-time payment, a pass, or moonstone — whichever is available. If you already have access through a pass or moonstone, generation starts right away without a payment window.",
  summaryBirthLabel: "Birth info",
  summaryFamilyLabel: "Family name · syllable count",
  summaryPreferenceLabel: "Detailed preferences",
  summaryNotEntered: "Not entered",
  summaryEntered: "Entered",
  summaryOptional: "Optional",
  summaryTimeUnknownSuffix: " · time unknown",
  summaryCharSuffix: " syllables",
  busyChecking: "Checking your input and Saju criteria…",
  busyPayment: "Confirming your pass or payment…",
  submitBusy: "In progress…",
  submitMissing: (field) => `Please enter ${field} first`,
  submitDefault: "Confirm 30,000 KRW payment/pass and start naming",
  retryButton: "Try again",
  footerNote: "Even if generation fails after payment, retrying with the same input requires no additional payment.",
  generatingSubtitle: "The naming expert takes about 1-2 minutes to verify the Saju chart and craft the name. You'll be moved to the naming booklet screen as soon as it's ready.",
};

const NAMING_COPY: Partial<Record<LoadingLocale, NamingCopy>> = {
  ko: {
    reason: "사주 맞춤 작명 전문가 상담 생성",
    errorText: {
      LOGIN_REQUIRED: "로그인 후 이용할 수 있습니다.",
      INPUT_MISSING: "성별, 생년월일, 양력/음력, 성씨를 먼저 입력해 주세요.",
      HANJA_LENGTH_MISMATCH: "입력한 한자 후보의 글자 수가 한글 이름 음절 수와 맞지 않습니다.",
      PAYMENT_CANCELLED: "결제가 취소되었습니다. 필요할 때 다시 시도할 수 있습니다.",
      PAYMENT_FAILED: "결제 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      PAYMENT_NOT_FOUND: "결제 기록을 확인하지 못했습니다. 차감된 금액이 있다면 그대로 남아 있으니 잠시 후 다시 시도해 주세요.",
      NAMING_ACCESS_REQUIRED: "이용권·월정석·결제 중 하나를 확인한 뒤에 생성할 수 있습니다.",
      PAYMENT_ID_REQUIRED: "단건 결제 확인이 끝나지 않았습니다. 잠시 후 다시 시도해 주세요.",
      INPUT_HASH_MISMATCH: "입력값이 바뀌었습니다. 입력을 확인한 뒤 다시 시작해 주세요.",
      ACCESS_PRODUCT_MISMATCH: "작명 프롬프트 결제 권한이 아닙니다. 다시 시도해 주세요.",
      CHECKOUT_FAILED: "결제 준비 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      GENERATE_FAILED: "작명 결과 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      LLM_ERROR: "작명 결과 생성에 실패했습니다. 결제는 유지되며 같은 입력으로 다시 시도할 수 있습니다.",
      POLL_TIMEOUT: "결과 생성이 예상보다 오래 걸리고 있습니다. 잠시 후 결과 페이지를 다시 확인해 주세요.",
      NETWORK_ERROR: "네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
      SERVER_ERROR: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    },
    fieldNames: { gender: "성별", birthDate: "생년월일", calendarType: "양력/음력", familyName: "성씨" },
    missingFieldsMessage: (fields) => `${fields.join(", ")}을(를) 먼저 입력해 주세요.`,
    nameTypeOptions: ["현대적이고 부드러운", "고전적이고 단정한", "중성적인", "부르기 쉬운", "흔하지 않은", "국제적으로 통하는"],
    generationRuleOptions: ["돌림자 없음", "가운데 글자 돌림자", "끝 글자 돌림자"],
    siblingOptions: ["형제자매 없음", "첫 글자 통일", "분위기만 맞추기"],
    avoidOptions: ["가족 이름과 같은 발음 제외", "받침 없는 이름 선호", "된소리·거센소리 제외"],
    purposeOptions: ["출생신고용", "개명용", "태명 대체용"],
    generatingSteps: [
      "입력값과 사주 기준을 확인하는 중",
      "이용권·결제를 확인하는 중",
      "사주 명식을 세우고 용신을 검증하는 중",
      "소리와 한자를 골라 작명첩을 엮는 중",
    ],
    gateCheckingTitle: "이용권 확인",
    gateCheckedTitle: "이용권 확인 완료",
    defaultBirthPlace: "대한민국",
    heroBadge: "사주 맞춤 프리미엄 전문가 작명",
    heroTitle: "훈민정음 작명소",
    heroDescription: "사주에서 검증한 용신·희신을 바탕으로 소리와 한자의 뜻을 엮어 전문가가 직접 이름을 짓고, 그 작명첩을 만든 프롬프트 원문까지 함께 드립니다. 입력과 초안 추천은 무료입니다.",
    heroPills: ["용신·희신 검증", "소리오행 흐름", "원형이정 수리 4격", "결과 PDF 소장"],
    stepsAriaLabel: "작명 준비 단계",
    stepLabels: ["출생 정보", "성씨와 이름 조건", "세부 취향 (선택)"],
    step0Heading: "출생 정보",
    reloadButtonAria: "프로필 카드에서 출생 정보 불러오기",
    reloadButton: "프로필 카드에서 불러오기",
    genderLabel: "성별",
    genderSelect: "선택",
    genderFemale: "여성",
    genderMale: "남성",
    genderOther: "기타/미지정",
    birthDateLabel: "생년월일",
    birthTimeLabel: "출생시간",
    calendarLabel: "달력 기준",
    calendarSolar: "양력",
    calendarLunar: "음력",
    birthPlaceLabel: "출생지",
    timezoneLabel: "기준 시간대",
    birthTimeUnknownCheckbox: "출생시간 모름",
    leapMonthCheckbox: "윤달",
    step0NextButton: "다음 · 성씨와 이름 조건",
    step1Heading: "성씨와 이름 조건",
    familyNameLabel: "성씨",
    familyNamePlaceholder: "예: 김",
    familyNameHint: "성(姓)만 적어 주세요. 쓰고 싶은 이름은 아래 “후보 이름”이나 “반드시 넣고 싶은 글자”에 적습니다.",
    familyNameLooksFullWarning: "세 글자 이상이라 성씨가 아니라 이름 전체로 보입니다. 이대로 두면 추천 후보 앞에 그대로 붙습니다.",
    nameLengthLabel: "이름 글자 수",
    nameLength1: "한 글자",
    nameLength2: "두 글자",
    nameLength3: "세 글자",
    nameLength4: "네 글자",
    currentNameLabel: "현재 생각 중인 한글 이름",
    currentNamePlaceholder: "예: 서윤",
    useHanjaLabel: "한자 이름 사용",
    useHanjaYes: "사용",
    useHanjaNo: "한글 이름 중심",
    desiredNamesLabel: "후보 이름 (한 줄에 하나, “한글 | 한자후보1,한자후보2 | 메모” 형식)",
    desiredNamesPlaceholder: "서윤 | | 부드럽고 지적인 느낌\n하린 | 荷潾,河璘 | 맑고 밝은 이미지",
    desiredSyllablesLabel: "사용하고 싶은 음절",
    desiredSyllablesPlaceholder: "예: 서, 윤, 하",
    requiredSyllablesLabel: "반드시 넣고 싶은 글자",
    requiredSyllablesPlaceholder: "예: 윤",
    blockedSyllablesLabel: "피하고 싶은 글자",
    blockedSyllablesPlaceholder: "예: 민, 지",
    freeDraftHeading: "무료 초안 추천",
    freeDraftBadge: "참고용 · 결제와 무관",
    freeDraftEmpty: "입력한 조건으로는 초안 후보를 아직 만들 수 없습니다.",
    freeDraftPoolNote: "",
    step1PrevButton: "이전",
    step1NextButton: "다음 · 세부 취향",
    step2Heading: "세부 취향 (선택)",
    step2Intro: "비워 두어도 작명은 진행됩니다. 아래 항목을 눌러 고르거나 직접 적어 주시면 작명가가 그대로 반영합니다.",
    desiredTypeLabel: "원하는 이름 유형",
    desiredTypePlaceholder: "예: 현대적이고 부드러운 이름",
    desiredTypeAria: "원하는 이름 유형 선택",
    preferenceToneLabel: "이름 분위기/이미지",
    preferenceTonePlaceholder: "예: 현대적, 맑은, 차분한, 우아한, 별빛 같은",
    preferenceToneAria: "이름 분위기 선택",
    generationNameRuleLabel: "돌림자 여부",
    generationNameRulePlaceholder: "예: 가운데 글자에 준 사용",
    generationNameRuleAria: "돌림자 규칙 선택",
    siblingHarmonyLabel: "형제자매 이름과의 조화",
    siblingHarmonyPlaceholder: "예: 형 이름 민준과 어울리게",
    siblingHarmonyAria: "형제자매 조화 선택",
    avoidFamilyNamesLabel: "피해야 할 가족 이름 또는 비슷한 발음",
    avoidFamilyNamesPlaceholder: "예: 할머니 성함과 같은 발음 제외",
    avoidFamilyNamesAria: "피할 조건 선택",
    memoLabel: "기타 요청",
    memoAria: "작명 목적 선택",
    memoPlaceholder: "이름을 실제 출생신고에 사용할 예정인지, 개명용인지, 특별히 바라는 분위기를 적어주세요.",
    step2PrevButton: "이전",
    sidebarHeading: "프리미엄 작명 시작하기",
    sidebarDescription: "필수 입력값 확인 후 30,000원 단건 결제, 이용권, 월정석 중 가능한 방식으로 진행합니다. 이미 이용권이나 월정석으로 이용 가능하면 결제창 없이 바로 생성됩니다.",
    summaryBirthLabel: "출생 정보",
    summaryFamilyLabel: "성씨 · 글자 수",
    summaryPreferenceLabel: "세부 취향",
    summaryNotEntered: "미입력",
    summaryEntered: "입력됨",
    summaryOptional: "선택 입력",
    summaryTimeUnknownSuffix: " · 시간 미상",
    summaryCharSuffix: "자",
    busyChecking: "입력값과 사주 기준을 확인하고 있습니다…",
    busyPayment: "이용권·결제를 확인하고 있습니다…",
    submitBusy: "진행 중입니다…",
    submitMissing: (field) => `먼저 ${field}을(를) 입력해주세요`,
    submitDefault: "30,000원 결제/이용권 확인 후 작명 시작",
    retryButton: "다시 시도",
    footerNote: "결제 후 생성에 실패해도 같은 입력으로는 추가 결제 없이 다시 시도됩니다.",
    generatingSubtitle: "작명가가 사주를 검증하고 이름을 짓는 데 1~2분이 걸립니다. 완성되면 작명첩 화면으로 바로 이동합니다.",
  },
  ja: {
    reason: "四柱推命に基づく専門家作名相談生成",
    errorText: {
      LOGIN_REQUIRED: "ログイン後にご利用いただけます。",
      INPUT_MISSING: "性別、生年月日、新暦/旧暦、姓を先に入力してください。",
      HANJA_LENGTH_MISMATCH: "入力した漢字候補の文字数がハングル名の音節数と一致しません。",
      PAYMENT_CANCELLED: "決済がキャンセルされました。必要な時にまた試すことができます。",
      PAYMENT_FAILED: "決済確認に失敗しました。しばらくしてからもう一度お試しください。",
      PAYMENT_NOT_FOUND: "決済記録を確認できませんでした。差し引かれた金額があればそのまま残っていますので、しばらくしてからもう一度お試しください。",
      NAMING_ACCESS_REQUIRED: "利用券・月光石・決済のいずれかを確認した後に生成できます。",
      PAYMENT_ID_REQUIRED: "単発決済の確認が完了していません。しばらくしてからもう一度お試しください。",
      INPUT_HASH_MISMATCH: "入力値が変更されました。入力を確認してからもう一度始めてください。",
      ACCESS_PRODUCT_MISMATCH: "作名プロンプトの決済権限ではありません。もう一度お試しください。",
      CHECKOUT_FAILED: "決済準備中に問題が発生しました。しばらくしてからもう一度お試しください。",
      GENERATE_FAILED: "作名結果の生成に失敗しました。しばらくしてからもう一度お試しください。",
      LLM_ERROR: "作名結果の生成に失敗しました。決済は維持され、同じ入力でもう一度お試しいただけます。",
      POLL_TIMEOUT: "結果生成が予想より時間がかかっています。しばらくしてから結果ページを再度ご確認ください。",
      NETWORK_ERROR: "ネットワーク接続を確認してからもう一度お試しください。",
      SERVER_ERROR: "一時的なエラーが発生しました。しばらくしてからもう一度お試しください。",
    },
    fieldNames: { gender: "性別", birthDate: "生年月日", calendarType: "新暦/旧暦", familyName: "姓" },
    missingFieldsMessage: (fields) => `${fields.join("、")}を先に入力してください。`,
    nameTypeOptions: ["現代的で柔らかい", "古典的で端正な", "中性的な", "呼びやすい", "珍しい", "国際的に通用する"],
    generationRuleOptions: ["世代字なし", "中の字に世代字", "末尾字に世代字"],
    siblingOptions: ["兄弟姉妹なし", "最初の字を統一", "雰囲気だけ合わせる"],
    avoidOptions: ["家族と同じ発音を除外", "パッチムのない名前を優先", "濃音・激音を除外"],
    purposeOptions: ["出生届用", "改名用", "胎名の代替用"],
    generatingSteps: [
      "入力値と四柱推命の基準を確認しています",
      "利用券・決済を確認しています",
      "四柱の命式を立て、用神を検証しています",
      "音と漢字を選んで作名帖を編んでいます",
    ],
    gateCheckingTitle: "利用券確認",
    gateCheckedTitle: "利用券確認完了",
    defaultBirthPlace: "韓国",
    heroBadge: "四柱推命に基づくプレミアム専門家作名",
    heroTitle: "訓民正音作名所",
    heroDescription: "四柱推命で検証した用神・喜神をもとに、音と漢字の意味を織り交ぜて専門家が直接名前を考え、その作名帖を作ったプロンプトの原文まで一緒にお渡しします。入力と初案の推薦は無料です。",
    heroPills: ["用神・喜神検証", "音五行の流れ", "元亨利貞数理四格", "結果PDFの保存"],
    stepsAriaLabel: "作名準備ステップ",
    stepLabels: ["生年月日情報", "姓と名前の条件", "詳細な好み（任意）"],
    step0Heading: "生年月日情報",
    reloadButtonAria: "プロフィールカードから生年月日情報を読み込む",
    reloadButton: "プロフィールカードから読み込む",
    genderLabel: "性別",
    genderSelect: "選択",
    genderFemale: "女性",
    genderMale: "男性",
    genderOther: "その他/未指定",
    birthDateLabel: "生年月日",
    birthTimeLabel: "出生時刻",
    calendarLabel: "暦の基準",
    calendarSolar: "新暦",
    calendarLunar: "旧暦",
    birthPlaceLabel: "出生地",
    timezoneLabel: "基準タイムゾーン",
    birthTimeUnknownCheckbox: "出生時刻不明",
    leapMonthCheckbox: "閏月",
    step0NextButton: "次へ · 姓と名前の条件",
    step1Heading: "姓と名前の条件",
    familyNameLabel: "姓",
    familyNamePlaceholder: "例：金",
    familyNameHint: "姓のみを記入してください。付けたい名前は下の「候補名」または「必ず入れたい文字」に記入してください。",
    familyNameLooksFullWarning: "3文字以上のため、姓ではなく名前全体のように見えます。このままにすると、推薦候補の前にそのまま付きます。",
    nameLengthLabel: "名前の文字数",
    nameLength1: "一文字",
    nameLength2: "二文字",
    nameLength3: "三文字",
    nameLength4: "四文字",
    currentNameLabel: "現在考えているハングルの名前",
    currentNamePlaceholder: "例：ソユン",
    useHanjaLabel: "漢字名を使用",
    useHanjaYes: "使用する",
    useHanjaNo: "ハングル名中心",
    desiredNamesLabel: "候補名（1行に1つ、「ハングル | 漢字候補1,漢字候補2 | メモ」形式）",
    desiredNamesPlaceholder: "ソユン | | 柔らかく知的な印象\nハリン | 荷潾,河璘 | 澄んで明るいイメージ",
    desiredSyllablesLabel: "使いたい音節",
    desiredSyllablesPlaceholder: "例：ソ、ユン、ハ",
    requiredSyllablesLabel: "必ず入れたい文字",
    requiredSyllablesPlaceholder: "例：ユン",
    blockedSyllablesLabel: "避けたい文字",
    blockedSyllablesPlaceholder: "例：ミン、ジ",
    freeDraftHeading: "無料初案の推薦",
    freeDraftBadge: "参考用 · 決済とは無関係",
    freeDraftEmpty: "入力された条件ではまだ初案候補を作成できません。",
    freeDraftPoolNote: "",
    step1PrevButton: "前へ",
    step1NextButton: "次へ · 詳細な好み",
    step2Heading: "詳細な好み（任意）",
    step2Intro: "空欄のままでも作名は進められます。下の項目を選ぶか直接記入していただければ、作名家がそのまま反映します。",
    desiredTypeLabel: "希望する名前のタイプ",
    desiredTypePlaceholder: "例：現代的で柔らかい名前",
    desiredTypeAria: "希望する名前のタイプを選択",
    preferenceToneLabel: "名前の雰囲気/イメージ",
    preferenceTonePlaceholder: "例：現代的、澄んだ、落ち着いた、上品な、星明かりのような",
    preferenceToneAria: "名前の雰囲気を選択",
    generationNameRuleLabel: "世代字の有無",
    generationNameRulePlaceholder: "例：中の字に「準」を使用",
    generationNameRuleAria: "世代字ルールを選択",
    siblingHarmonyLabel: "兄弟姉妹の名前との調和",
    siblingHarmonyPlaceholder: "例：兄の名前「ミンジュン」と合うように",
    siblingHarmonyAria: "兄弟姉妹の調和を選択",
    avoidFamilyNamesLabel: "避けるべき家族の名前または似た発音",
    avoidFamilyNamesPlaceholder: "例：祖母の名前と同じ発音を除外",
    avoidFamilyNamesAria: "避けたい条件を選択",
    memoLabel: "その他のご要望",
    memoAria: "作名の目的を選択",
    memoPlaceholder: "この名前を実際の出生届に使用する予定か、改名用か、特に希望する雰囲気があれば記入してください。",
    step2PrevButton: "前へ",
    sidebarHeading: "プレミアム作名を始める",
    sidebarDescription: "必須項目の確認後、30,000ウォンの単発決済、利用券、月光石のうち可能な方法で進めます。すでに利用券や月光石で利用可能な場合は、決済画面なしですぐに生成されます。",
    summaryBirthLabel: "生年月日情報",
    summaryFamilyLabel: "姓 · 文字数",
    summaryPreferenceLabel: "詳細な好み",
    summaryNotEntered: "未入力",
    summaryEntered: "入力済み",
    summaryOptional: "任意入力",
    summaryTimeUnknownSuffix: " · 時刻不明",
    summaryCharSuffix: "字",
    busyChecking: "入力値と四柱推命の基準を確認しています…",
    busyPayment: "利用券・決済を確認しています…",
    submitBusy: "処理中です…",
    submitMissing: (field) => `先に${field}を入力してください`,
    submitDefault: "30,000ウォン決済/利用券確認後に作名開始",
    retryButton: "もう一度試す",
    footerNote: "決済後に生成が失敗しても、同じ入力であれば追加決済なしで再度お試しいただけます。",
    generatingSubtitle: "作名家が四柱推命を検証し名前を考えるのに1〜2分かかります。完成すると作名帖画面にそのまま移動します。",
  },
  "zh-CN": {
    reason: "生成基于八字的专家起名咨询",
    errorText: {
      LOGIN_REQUIRED: "登录后即可使用。",
      INPUT_MISSING: "请先输入性别、出生日期、阳历/阴历、姓氏。",
      HANJA_LENGTH_MISMATCH: "输入的汉字候选字数与韩文名字音节数不一致。",
      PAYMENT_CANCELLED: "付款已取消。您可以在需要时重新尝试。",
      PAYMENT_FAILED: "付款确认失败，请稍后重试。",
      PAYMENT_NOT_FOUND: "无法确认付款记录。若已扣款，该金额仍然有效，请稍后重试。",
      NAMING_ACCESS_REQUIRED: "需先确认通行证、月光石或付款之一才能生成。",
      PAYMENT_ID_REQUIRED: "单次付款确认尚未完成，请稍后重试。",
      INPUT_HASH_MISMATCH: "输入内容已更改，请确认输入后重新开始。",
      ACCESS_PRODUCT_MISMATCH: "这不是起名提示词的付款授权，请重试。",
      CHECKOUT_FAILED: "准备付款时出现问题，请稍后重试。",
      GENERATE_FAILED: "生成起名结果失败，请稍后重试。",
      LLM_ERROR: "生成起名结果失败。付款已保留，可用相同输入重试。",
      POLL_TIMEOUT: "结果生成时间超出预期，请稍后重新查看结果页面。",
      NETWORK_ERROR: "请检查网络连接后重试。",
      SERVER_ERROR: "发生临时错误，请稍后重试。",
    },
    fieldNames: { gender: "性别", birthDate: "出生日期", calendarType: "阳历/阴历", familyName: "姓氏" },
    missingFieldsMessage: (fields) => `请先输入${fields.join("、")}。`,
    nameTypeOptions: ["现代且柔和", "古典且端庄", "中性化", "易于称呼", "少见", "国际通用"],
    generationRuleOptions: ["无字辈", "中间字用字辈", "末字用字辈"],
    siblingOptions: ["无兄弟姐妹", "首字统一", "只需风格一致"],
    avoidOptions: ["排除与家人同音", "偏好无收音的名字", "排除硬音/送气音"],
    purposeOptions: ["用于出生登记", "用于改名", "用于替代乳名"],
    generatingSteps: [
      "正在确认输入值与八字标准",
      "正在确认通行证/付款",
      "正在建立八字命式并验证用神",
      "正在挑选音与汉字编织起名帖",
    ],
    gateCheckingTitle: "确认通行证",
    gateCheckedTitle: "通行证确认完成",
    defaultBirthPlace: "韩国",
    heroBadge: "基于八字的高级专家起名",
    heroTitle: "训民正音起名所",
    heroDescription: "根据从八字中验证的用神与喜神，将音与汉字的含义编织在一起，由专家亲自为您取名，并附上制作该起名帖的完整提示词原文。输入信息与初稿推荐均为免费。",
    heroPills: ["用神·喜神验证", "音五行流向", "元亨利贞数理四格", "结果PDF留存"],
    stepsAriaLabel: "起名准备步骤",
    stepLabels: ["出生信息", "姓氏与姓名条件", "详细偏好（可选）"],
    step0Heading: "出生信息",
    reloadButtonAria: "从个人资料卡加载出生信息",
    reloadButton: "从个人资料卡加载",
    genderLabel: "性别",
    genderSelect: "选择",
    genderFemale: "女性",
    genderMale: "男性",
    genderOther: "其他/未指定",
    birthDateLabel: "出生日期",
    birthTimeLabel: "出生时间",
    calendarLabel: "历法基准",
    calendarSolar: "阳历",
    calendarLunar: "阴历",
    birthPlaceLabel: "出生地",
    timezoneLabel: "基准时区",
    birthTimeUnknownCheckbox: "出生时间不详",
    leapMonthCheckbox: "闰月",
    step0NextButton: "下一步 · 姓氏与姓名条件",
    step1Heading: "姓氏与姓名条件",
    familyNameLabel: "姓氏",
    familyNamePlaceholder: "例：金",
    familyNameHint: "请只填写姓氏。想要的名字请填写在下方“候选名字”或“必须包含的字”中。",
    familyNameLooksFullWarning: "由于是三个字以上，看起来不是姓氏而是完整姓名。若保持不变，将直接附加在推荐候选之前。",
    nameLengthLabel: "姓名字数",
    nameLength1: "一个字",
    nameLength2: "两个字",
    nameLength3: "三个字",
    nameLength4: "四个字",
    currentNameLabel: "目前考虑的韩文名字",
    currentNamePlaceholder: "例：书允",
    useHanjaLabel: "使用汉字名",
    useHanjaYes: "使用",
    useHanjaNo: "以韩文名字为主",
    desiredNamesLabel: "候选名字（每行一个，格式为“韩文 | 汉字候选1,汉字候选2 | 备注”）",
    desiredNamesPlaceholder: "书允 | | 温柔知性的感觉\n夏琳 | 荷潾,河璘 | 清澈明亮的形象",
    desiredSyllablesLabel: "想使用的音节",
    desiredSyllablesPlaceholder: "例：书、允、夏",
    requiredSyllablesLabel: "必须包含的字",
    requiredSyllablesPlaceholder: "例：允",
    blockedSyllablesLabel: "想避免的字",
    blockedSyllablesPlaceholder: "例：敏、志",
    freeDraftHeading: "免费初稿推荐",
    freeDraftBadge: "仅供参考 · 与付款无关",
    freeDraftEmpty: "根据目前输入的条件，暂时无法生成初稿候选。",
    freeDraftPoolNote: "",
    step1PrevButton: "上一步",
    step1NextButton: "下一步 · 详细偏好",
    step2Heading: "详细偏好（可选）",
    step2Intro: "留空也可以继续起名。点击下方选项或直接填写，起名师会如实反映。",
    desiredTypeLabel: "想要的姓名类型",
    desiredTypePlaceholder: "例：现代且柔和的名字",
    desiredTypeAria: "选择想要的姓名类型",
    preferenceToneLabel: "姓名氛围/形象",
    preferenceTonePlaceholder: "例：现代、清澈、沉稳、优雅、如星光般",
    preferenceToneAria: "选择姓名氛围",
    generationNameRuleLabel: "字辈使用与否",
    generationNameRulePlaceholder: "例：在中间字使用“俊”",
    generationNameRuleAria: "选择字辈规则",
    siblingHarmonyLabel: "与兄弟姐妹姓名的协调",
    siblingHarmonyPlaceholder: "例：与哥哥的名字“旻俊”相配",
    siblingHarmonyAria: "选择兄弟姐妹协调方式",
    avoidFamilyNamesLabel: "应避免的家人姓名或相似发音",
    avoidFamilyNamesPlaceholder: "例：排除与祖母姓名相同的发音",
    avoidFamilyNamesAria: "选择要避免的条件",
    memoLabel: "其他要求",
    memoAria: "选择起名目的",
    memoPlaceholder: "请说明这个名字是否将用于实际出生登记、改名，或有任何特别希望的氛围。",
    step2PrevButton: "上一步",
    sidebarHeading: "开始高级起名",
    sidebarDescription: "确认必填项后，将按可用方式以30,000韩元单次付款、通行证或月光石之一进行。若已可通过通行证或月光石使用，将无需付款窗口直接生成。",
    summaryBirthLabel: "出生信息",
    summaryFamilyLabel: "姓氏 · 字数",
    summaryPreferenceLabel: "详细偏好",
    summaryNotEntered: "未填写",
    summaryEntered: "已填写",
    summaryOptional: "可选填写",
    summaryTimeUnknownSuffix: " · 时间不详",
    summaryCharSuffix: "字",
    busyChecking: "正在确认输入值与八字标准…",
    busyPayment: "正在确认通行证/付款…",
    submitBusy: "正在进行中…",
    submitMissing: (field) => `请先输入${field}`,
    submitDefault: "确认30,000韩元付款/通行证后开始起名",
    retryButton: "重试",
    footerNote: "即使付款后生成失败，使用相同输入重试也无需额外付款。",
    generatingSubtitle: "起名师验证八字并构思名字大约需要1-2分钟。完成后将直接跳转到起名帖画面。",
  },
  "zh-TW": {
    reason: "生成基於八字的專家取名諮詢",
    errorText: {
      LOGIN_REQUIRED: "登入後即可使用。",
      INPUT_MISSING: "請先輸入性別、出生日期、陽曆/陰曆、姓氏。",
      HANJA_LENGTH_MISMATCH: "輸入的漢字候選字數與韓文名字音節數不一致。",
      PAYMENT_CANCELLED: "付款已取消。您可以在需要時重新嘗試。",
      PAYMENT_FAILED: "付款確認失敗，請稍後重試。",
      PAYMENT_NOT_FOUND: "無法確認付款記錄。若已扣款，該金額仍然有效，請稍後重試。",
      NAMING_ACCESS_REQUIRED: "需先確認通行證、月光石或付款之一才能生成。",
      PAYMENT_ID_REQUIRED: "單次付款確認尚未完成，請稍後重試。",
      INPUT_HASH_MISMATCH: "輸入內容已變更，請確認輸入後重新開始。",
      ACCESS_PRODUCT_MISMATCH: "這不是取名提示詞的付款授權，請重試。",
      CHECKOUT_FAILED: "準備付款時發生問題，請稍後重試。",
      GENERATE_FAILED: "生成取名結果失敗，請稍後重試。",
      LLM_ERROR: "生成取名結果失敗。付款已保留，可用相同輸入重試。",
      POLL_TIMEOUT: "結果生成時間超出預期，請稍後重新查看結果頁面。",
      NETWORK_ERROR: "請檢查網路連線後重試。",
      SERVER_ERROR: "發生暫時性錯誤，請稍後重試。",
    },
    fieldNames: { gender: "性別", birthDate: "出生日期", calendarType: "陽曆/陰曆", familyName: "姓氏" },
    missingFieldsMessage: (fields) => `請先輸入${fields.join("、")}。`,
    nameTypeOptions: ["現代且柔和", "古典且端莊", "中性化", "易於稱呼", "少見", "國際通用"],
    generationRuleOptions: ["無字輩", "中間字用字輩", "末字用字輩"],
    siblingOptions: ["無兄弟姐妹", "首字統一", "只需風格一致"],
    avoidOptions: ["排除與家人同音", "偏好無收音的名字", "排除硬音/送氣音"],
    purposeOptions: ["用於出生登記", "用於改名", "用於替代乳名"],
    generatingSteps: [
      "正在確認輸入值與八字標準",
      "正在確認通行證/付款",
      "正在建立八字命式並驗證用神",
      "正在挑選音與漢字編織取名帖",
    ],
    gateCheckingTitle: "確認通行證",
    gateCheckedTitle: "通行證確認完成",
    defaultBirthPlace: "韓國",
    heroBadge: "基於八字的高級專家取名",
    heroTitle: "訓民正音取名所",
    heroDescription: "根據從八字中驗證的用神與喜神，將音與漢字的含義編織在一起，由專家親自為您取名，並附上製作該取名帖的完整提示詞原文。輸入資訊與初稿推薦均為免費。",
    heroPills: ["用神·喜神驗證", "音五行流向", "元亨利貞數理四格", "結果PDF留存"],
    stepsAriaLabel: "取名準備步驟",
    stepLabels: ["出生資訊", "姓氏與姓名條件", "詳細偏好（可選）"],
    step0Heading: "出生資訊",
    reloadButtonAria: "從個人資料卡載入出生資訊",
    reloadButton: "從個人資料卡載入",
    genderLabel: "性別",
    genderSelect: "選擇",
    genderFemale: "女性",
    genderMale: "男性",
    genderOther: "其他/未指定",
    birthDateLabel: "出生日期",
    birthTimeLabel: "出生時間",
    calendarLabel: "曆法基準",
    calendarSolar: "陽曆",
    calendarLunar: "陰曆",
    birthPlaceLabel: "出生地",
    timezoneLabel: "基準時區",
    birthTimeUnknownCheckbox: "出生時間不詳",
    leapMonthCheckbox: "閏月",
    step0NextButton: "下一步 · 姓氏與姓名條件",
    step1Heading: "姓氏與姓名條件",
    familyNameLabel: "姓氏",
    familyNamePlaceholder: "例：金",
    familyNameHint: "請只填寫姓氏。想要的名字請填寫在下方「候選名字」或「必須包含的字」中。",
    familyNameLooksFullWarning: "由於是三個字以上，看起來不是姓氏而是完整姓名。若保持不變，將直接附加在推薦候選之前。",
    nameLengthLabel: "姓名字數",
    nameLength1: "一個字",
    nameLength2: "兩個字",
    nameLength3: "三個字",
    nameLength4: "四個字",
    currentNameLabel: "目前考慮的韓文名字",
    currentNamePlaceholder: "例：書允",
    useHanjaLabel: "使用漢字名",
    useHanjaYes: "使用",
    useHanjaNo: "以韓文名字為主",
    desiredNamesLabel: "候選名字（每行一個，格式為「韓文 | 漢字候選1,漢字候選2 | 備註」）",
    desiredNamesPlaceholder: "書允 | | 溫柔知性的感覺\n夏琳 | 荷潾,河璘 | 清澈明亮的形象",
    desiredSyllablesLabel: "想使用的音節",
    desiredSyllablesPlaceholder: "例：書、允、夏",
    requiredSyllablesLabel: "必須包含的字",
    requiredSyllablesPlaceholder: "例：允",
    blockedSyllablesLabel: "想避免的字",
    blockedSyllablesPlaceholder: "例：敏、志",
    freeDraftHeading: "免費初稿推薦",
    freeDraftBadge: "僅供參考 · 與付款無關",
    freeDraftEmpty: "根據目前輸入的條件，暫時無法生成初稿候選。",
    freeDraftPoolNote: "",
    step1PrevButton: "上一步",
    step1NextButton: "下一步 · 詳細偏好",
    step2Heading: "詳細偏好（可選）",
    step2Intro: "留空也可以繼續取名。點擊下方選項或直接填寫，取名師會如實反映。",
    desiredTypeLabel: "想要的姓名類型",
    desiredTypePlaceholder: "例：現代且柔和的名字",
    desiredTypeAria: "選擇想要的姓名類型",
    preferenceToneLabel: "姓名氛圍/形象",
    preferenceTonePlaceholder: "例：現代、清澈、沉穩、優雅、如星光般",
    preferenceToneAria: "選擇姓名氛圍",
    generationNameRuleLabel: "字輩使用與否",
    generationNameRulePlaceholder: "例：在中間字使用「俊」",
    generationNameRuleAria: "選擇字輩規則",
    siblingHarmonyLabel: "與兄弟姐妹姓名的協調",
    siblingHarmonyPlaceholder: "例：與哥哥的名字「旻俊」相配",
    siblingHarmonyAria: "選擇兄弟姐妹協調方式",
    avoidFamilyNamesLabel: "應避免的家人姓名或相似發音",
    avoidFamilyNamesPlaceholder: "例：排除與祖母姓名相同的發音",
    avoidFamilyNamesAria: "選擇要避免的條件",
    memoLabel: "其他要求",
    memoAria: "選擇取名目的",
    memoPlaceholder: "請說明這個名字是否將用於實際出生登記、改名，或有任何特別希望的氛圍。",
    step2PrevButton: "上一步",
    sidebarHeading: "開始高級取名",
    sidebarDescription: "確認必填項後，將按可用方式以30,000韓元單次付款、通行證或月光石之一進行。若已可透過通行證或月光石使用，將無需付款視窗直接生成。",
    summaryBirthLabel: "出生資訊",
    summaryFamilyLabel: "姓氏 · 字數",
    summaryPreferenceLabel: "詳細偏好",
    summaryNotEntered: "未填寫",
    summaryEntered: "已填寫",
    summaryOptional: "可選填寫",
    summaryTimeUnknownSuffix: " · 時間不詳",
    summaryCharSuffix: "字",
    busyChecking: "正在確認輸入值與八字標準…",
    busyPayment: "正在確認通行證/付款…",
    submitBusy: "正在進行中…",
    submitMissing: (field) => `請先輸入${field}`,
    submitDefault: "確認30,000韓元付款/通行證後開始取名",
    retryButton: "重試",
    footerNote: "即使付款後生成失敗，使用相同輸入重試也無需額外付款。",
    generatingSubtitle: "取名師驗證八字並構思名字大約需要1-2分鐘。完成後將直接跳轉到取名帖畫面。",
  },
  vi: {
    reason: "Tạo tư vấn đặt tên chuyên gia dựa trên Saju",
    errorText: {
      LOGIN_REQUIRED: "Bạn cần đăng nhập để sử dụng.",
      INPUT_MISSING: "Vui lòng nhập giới tính, ngày sinh, dương lịch/âm lịch và họ trước.",
      HANJA_LENGTH_MISMATCH: "Số chữ Hán ứng viên không khớp với số âm tiết của tên Hangul.",
      PAYMENT_CANCELLED: "Thanh toán đã bị hủy. Bạn có thể thử lại khi cần.",
      PAYMENT_FAILED: "Xác minh thanh toán thất bại. Vui lòng thử lại sau.",
      PAYMENT_NOT_FOUND: "Không thể xác nhận hồ sơ thanh toán. Nếu đã bị trừ tiền, số tiền đó vẫn còn nguyên, vui lòng thử lại sau.",
      NAMING_ACCESS_REQUIRED: "Bạn có thể tạo sau khi xác nhận một trong: gói, đá trăng, hoặc thanh toán.",
      PAYMENT_ID_REQUIRED: "Xác minh thanh toán một lần chưa hoàn tất. Vui lòng thử lại sau.",
      INPUT_HASH_MISMATCH: "Dữ liệu nhập đã thay đổi. Vui lòng kiểm tra và bắt đầu lại.",
      ACCESS_PRODUCT_MISMATCH: "Đây không phải quyền thanh toán cho prompt đặt tên. Vui lòng thử lại.",
      CHECKOUT_FAILED: "Có sự cố khi chuẩn bị thanh toán. Vui lòng thử lại sau.",
      GENERATE_FAILED: "Tạo kết quả đặt tên thất bại. Vui lòng thử lại sau.",
      LLM_ERROR: "Tạo kết quả đặt tên thất bại. Thanh toán vẫn được giữ, bạn có thể thử lại với cùng dữ liệu nhập.",
      POLL_TIMEOUT: "Việc tạo kết quả đang mất nhiều thời gian hơn dự kiến. Vui lòng kiểm tra lại trang kết quả sau.",
      NETWORK_ERROR: "Vui lòng kiểm tra kết nối mạng và thử lại.",
      SERVER_ERROR: "Đã xảy ra lỗi tạm thời. Vui lòng thử lại sau.",
    },
    fieldNames: { gender: "giới tính", birthDate: "ngày sinh", calendarType: "dương lịch/âm lịch", familyName: "họ" },
    missingFieldsMessage: (fields) => `Vui lòng nhập ${fields.join(", ")} trước.`,
    nameTypeOptions: ["Hiện đại và dịu dàng", "Cổ điển và trang nhã", "Trung tính", "Dễ gọi", "Hiếm gặp", "Phù hợp quốc tế"],
    generationRuleOptions: ["Không có chữ lót thế hệ", "Chữ lót thế hệ ở giữa", "Chữ lót thế hệ ở cuối"],
    siblingOptions: ["Không có anh chị em", "Thống nhất chữ đầu", "Chỉ cần hợp phong cách"],
    avoidOptions: ["Loại trừ âm giống tên người thân", "Ưu tiên tên không có phụ âm cuối", "Loại trừ âm gắt/âm bật hơi"],
    purposeOptions: ["Dùng để đăng ký khai sinh", "Dùng để đổi tên", "Dùng thay tên gọi ở nhà"],
    generatingSteps: [
      "Đang kiểm tra dữ liệu nhập và tiêu chuẩn Saju",
      "Đang xác nhận gói/thanh toán",
      "Đang lập lá số Saju và xác minh dụng thần",
      "Đang chọn âm và Hán tự để dệt nên tập đặt tên",
    ],
    gateCheckingTitle: "Đang xác nhận gói",
    gateCheckedTitle: "Đã xác nhận gói",
    defaultBirthPlace: "Hàn Quốc",
    heroBadge: "Đặt tên chuyên gia cao cấp dựa trên Saju",
    heroTitle: "Nhà Đặt Tên Hunminjeongeum",
    heroDescription: "Dựa trên dụng thần và hỷ thần đã được xác minh từ Saju, chuyên gia trực tiếp đặt tên bằng cách kết hợp âm thanh và ý nghĩa Hán tự, đồng thời gửi kèm toàn văn prompt đã tạo ra tập đặt tên đó. Việc nhập thông tin và đề xuất bản nháp là miễn phí.",
    heroPills: ["Xác minh dụng thần · hỷ thần", "Dòng chảy âm ngũ hành", "Số lý tứ cách Nguyên-Hanh-Lợi-Trinh", "Lưu kết quả dạng PDF"],
    stepsAriaLabel: "Các bước chuẩn bị đặt tên",
    stepLabels: ["Thông tin sinh", "Họ và điều kiện tên", "Sở thích chi tiết (tùy chọn)"],
    step0Heading: "Thông tin sinh",
    reloadButtonAria: "Tải thông tin sinh từ thẻ hồ sơ",
    reloadButton: "Tải từ thẻ hồ sơ",
    genderLabel: "Giới tính",
    genderSelect: "Chọn",
    genderFemale: "Nữ",
    genderMale: "Nam",
    genderOther: "Khác/Không xác định",
    birthDateLabel: "Ngày sinh",
    birthTimeLabel: "Giờ sinh",
    calendarLabel: "Loại lịch",
    calendarSolar: "Dương lịch",
    calendarLunar: "Âm lịch",
    birthPlaceLabel: "Nơi sinh",
    timezoneLabel: "Múi giờ tham chiếu",
    birthTimeUnknownCheckbox: "Không rõ giờ sinh",
    leapMonthCheckbox: "Tháng nhuận",
    step0NextButton: "Tiếp theo · Họ và điều kiện tên",
    step1Heading: "Họ và điều kiện tên",
    familyNameLabel: "Họ",
    familyNamePlaceholder: "VD: Kim",
    familyNameHint: "Chỉ nhập họ. Tên bạn muốn đặt xin ghi ở mục “Tên ứng viên” hoặc “Chữ nhất định muốn có” bên dưới.",
    familyNameLooksFullWarning: "Vì có từ ba ký tự trở lên nên có vẻ đây là cả họ tên chứ không phải chỉ họ. Nếu để nguyên, nó sẽ được gắn trực tiếp trước các ứng viên đề xuất.",
    nameLengthLabel: "Số âm tiết của tên",
    nameLength1: "Một âm tiết",
    nameLength2: "Hai âm tiết",
    nameLength3: "Ba âm tiết",
    nameLength4: "Bốn âm tiết",
    currentNameLabel: "Tên Hangul bạn đang cân nhắc",
    currentNamePlaceholder: "VD: Seoyoon",
    useHanjaLabel: "Sử dụng tên Hán tự",
    useHanjaYes: "Sử dụng",
    useHanjaNo: "Tập trung vào tên Hangul",
    desiredNamesLabel: "Tên ứng viên (mỗi dòng một tên, định dạng “Hangul | Hán tự ứng viên 1,Hán tự ứng viên 2 | ghi chú”)",
    desiredNamesPlaceholder: "Seoyoon | | cảm giác dịu dàng và thông minh\nHarin | 荷潾,河璘 | hình ảnh trong sáng và tươi sáng",
    desiredSyllablesLabel: "Âm tiết bạn muốn dùng",
    desiredSyllablesPlaceholder: "VD: Seo, Yoon, Ha",
    requiredSyllablesLabel: "Chữ nhất định muốn có",
    requiredSyllablesPlaceholder: "VD: Yoon",
    blockedSyllablesLabel: "Chữ muốn tránh",
    blockedSyllablesPlaceholder: "VD: Min, Ji",
    freeDraftHeading: "Đề xuất bản nháp miễn phí",
    freeDraftBadge: "Chỉ để tham khảo · không liên quan đến thanh toán",
    freeDraftEmpty: "Chưa thể tạo ứng viên bản nháp từ dữ liệu nhập hiện tại.",
    freeDraftPoolNote: "Các bản nháp này được chọn từ danh sách tên tiếng Anh. Bản luận tên tạo sau khi thanh toán sẽ theo truyền thống đặt tên của ngôn ngữ bạn đang dùng.",
    step1PrevButton: "Trước",
    step1NextButton: "Tiếp theo · Sở thích chi tiết",
    step2Heading: "Sở thích chi tiết (tùy chọn)",
    step2Intro: "Bạn có thể để trống mà vẫn tiếp tục đặt tên. Hãy chọn các mục bên dưới hoặc tự viết, chuyên gia đặt tên sẽ phản ánh nguyên văn.",
    desiredTypeLabel: "Loại tên bạn muốn",
    desiredTypePlaceholder: "VD: Một cái tên hiện đại, dịu dàng",
    desiredTypeAria: "Chọn loại tên mong muốn",
    preferenceToneLabel: "Không khí/hình ảnh của tên",
    preferenceTonePlaceholder: "VD: Hiện đại, trong sáng, điềm tĩnh, thanh lịch, như ánh sao",
    preferenceToneAria: "Chọn không khí tên",
    generationNameRuleLabel: "Chữ lót thế hệ",
    generationNameRulePlaceholder: "VD: dùng chữ 'jun' ở giữa",
    generationNameRuleAria: "Chọn quy tắc chữ lót thế hệ",
    siblingHarmonyLabel: "Hài hòa với tên anh chị em",
    siblingHarmonyPlaceholder: "VD: để hợp với tên anh trai Minjun",
    siblingHarmonyAria: "Chọn cách hài hòa với anh chị em",
    avoidFamilyNamesLabel: "Tên người thân hoặc âm tương tự cần tránh",
    avoidFamilyNamesPlaceholder: "VD: loại trừ âm giống tên bà",
    avoidFamilyNamesAria: "Chọn điều kiện cần tránh",
    memoLabel: "Yêu cầu khác",
    memoAria: "Chọn mục đích đặt tên",
    memoPlaceholder: "Vui lòng cho biết tên này sẽ dùng để đăng ký khai sinh thực tế, để đổi tên, hay có không khí đặc biệt nào bạn mong muốn.",
    step2PrevButton: "Trước",
    sidebarHeading: "Bắt đầu đặt tên cao cấp",
    sidebarDescription: "Sau khi xác nhận các mục bắt buộc, chúng tôi sẽ tiến hành theo cách khả dụng: thanh toán một lần 30.000 KRW, gói, hoặc đá trăng. Nếu bạn đã có quyền truy cập qua gói hoặc đá trăng, việc tạo sẽ bắt đầu ngay mà không cần cửa sổ thanh toán.",
    summaryBirthLabel: "Thông tin sinh",
    summaryFamilyLabel: "Họ · số âm tiết",
    summaryPreferenceLabel: "Sở thích chi tiết",
    summaryNotEntered: "Chưa nhập",
    summaryEntered: "Đã nhập",
    summaryOptional: "Nhập tùy chọn",
    summaryTimeUnknownSuffix: " · giờ không rõ",
    summaryCharSuffix: " âm tiết",
    busyChecking: "Đang kiểm tra dữ liệu nhập và tiêu chuẩn Saju…",
    busyPayment: "Đang xác nhận gói/thanh toán…",
    submitBusy: "Đang xử lý…",
    submitMissing: (field) => `Vui lòng nhập ${field} trước`,
    submitDefault: "Xác nhận thanh toán 30.000 KRW/gói rồi bắt đầu đặt tên",
    retryButton: "Thử lại",
    footerNote: "Ngay cả khi tạo thất bại sau khi thanh toán, việc thử lại với cùng dữ liệu nhập không cần thanh toán thêm.",
    generatingSubtitle: "Chuyên gia đặt tên mất khoảng 1-2 phút để xác minh Saju và tạo tên. Bạn sẽ được chuyển đến màn hình tập đặt tên ngay khi hoàn tất.",
  },
  hi: {
    reason: "साजू-आधारित विशेषज्ञ नामकरण परामर्श तैयार करना",
    errorText: {
      LOGIN_REQUIRED: "उपयोग करने के लिए लॉगिन आवश्यक है।",
      INPUT_MISSING: "कृपया पहले लिंग, जन्म तिथि, सौर/चंद्र कैलेंडर और उपनाम दर्ज करें।",
      HANJA_LENGTH_MISMATCH: "दर्ज किए गए हांजा उम्मीदवार के अक्षरों की संख्या हांगुल नाम के शब्दांशों से मेल नहीं खाती।",
      PAYMENT_CANCELLED: "भुगतान रद्द कर दिया गया है। आवश्यकता पड़ने पर आप फिर से प्रयास कर सकते हैं।",
      PAYMENT_FAILED: "भुगतान सत्यापन विफल हुआ। कृपया थोड़ी देर बाद पुनः प्रयास करें।",
      PAYMENT_NOT_FOUND: "भुगतान रिकॉर्ड की पुष्टि नहीं हो सकी। यदि राशि काटी गई है तो वह सुरक्षित है, कृपया थोड़ी देर बाद पुनः प्रयास करें।",
      NAMING_ACCESS_REQUIRED: "पास, मूनस्टोन या भुगतान में से किसी एक की पुष्टि के बाद ही जनरेट किया जा सकता है।",
      PAYMENT_ID_REQUIRED: "एकल भुगतान सत्यापन पूरा नहीं हुआ है। कृपया थोड़ी देर बाद पुनः प्रयास करें।",
      INPUT_HASH_MISMATCH: "इनपुट बदल गया है। कृपया इनपुट जांचकर फिर से शुरू करें।",
      ACCESS_PRODUCT_MISMATCH: "यह नामकरण प्रॉम्प्ट के लिए भुगतान अधिकार नहीं है। कृपया पुनः प्रयास करें।",
      CHECKOUT_FAILED: "भुगतान तैयार करते समय समस्या हुई। कृपया थोड़ी देर बाद पुनः प्रयास करें।",
      GENERATE_FAILED: "नामकरण परिणाम बनाने में विफल। कृपया थोड़ी देर बाद पुनः प्रयास करें।",
      LLM_ERROR: "नामकरण परिणाम बनाने में विफल। भुगतान सुरक्षित है, आप उसी इनपुट के साथ पुनः प्रयास कर सकते हैं।",
      POLL_TIMEOUT: "परिणाम बनने में अपेक्षा से अधिक समय लग रहा है। कृपया थोड़ी देर बाद परिणाम पृष्ठ फिर से देखें।",
      NETWORK_ERROR: "कृपया नेटवर्क कनेक्शन जांचकर पुनः प्रयास करें।",
      SERVER_ERROR: "एक अस्थायी त्रुटि हुई। कृपया थोड़ी देर बाद पुनः प्रयास करें।",
    },
    fieldNames: { gender: "लिंग", birthDate: "जन्म तिथि", calendarType: "सौर/चंद्र कैलेंडर", familyName: "उपनाम" },
    missingFieldsMessage: (fields) => `कृपया पहले ${fields.join(", ")} दर्ज करें।`,
    nameTypeOptions: ["आधुनिक और कोमल", "पारंपरिक और सुसंस्कृत", "उभयलिंगी", "बुलाने में आसान", "असामान्य", "अंतरराष्ट्रीय स्तर पर उपयुक्त"],
    generationRuleOptions: ["पीढ़ी अक्षर नहीं", "बीच के अक्षर में पीढ़ी अक्षर", "अंतिम अक्षर में पीढ़ी अक्षर"],
    siblingOptions: ["कोई भाई-बहन नहीं", "पहला अक्षर समान", "केवल भाव मिलाएं"],
    avoidOptions: ["परिवार के समान उच्चारण हटाएं", "बिना अंत्याक्षर वाले नाम प्राथमिकता", "कठोर/तीव्र ध्वनियां हटाएं"],
    purposeOptions: ["जन्म पंजीकरण हेतु", "नाम परिवर्तन हेतु", "अस्थायी नाम के स्थान पर"],
    generatingSteps: [
      "इनपुट और साजू मानदंड की जांच की जा रही है",
      "पास/भुगतान की पुष्टि की जा रही है",
      "साजू कुंडली बनाई जा रही है और उपयोगी तत्व सत्यापित किया जा रहा है",
      "ध्वनि और हांजा चुनकर नामकरण पुस्तिका तैयार की जा रही है",
    ],
    gateCheckingTitle: "पास की जांच",
    gateCheckedTitle: "पास की पुष्टि पूर्ण",
    defaultBirthPlace: "दक्षिण कोरिया",
    heroBadge: "साजू-आधारित प्रीमियम विशेषज्ञ नामकरण",
    heroTitle: "हुनमिनजियोंगेउम नामकरण गृह",
    heroDescription: "साजू से सत्यापित उपयोगी और सहायक तत्वों के आधार पर, ध्वनि और हांजा के अर्थ को जोड़कर विशेषज्ञ स्वयं नाम रखते हैं, और उस नामकरण पुस्तिका को बनाने वाला मूल प्रॉम्प्ट भी साथ में देते हैं। जानकारी दर्ज करना और मुफ्त प्रारूप सुझाव निःशुल्क हैं।",
    heroPills: ["उपयोगी/सहायक तत्व सत्यापन", "ध्वनि-पंचतत्व प्रवाह", "वोन-ह्येओंग-यी-जोंग अंक चतुष्क", "परिणाम PDF सहेजें"],
    stepsAriaLabel: "नामकरण तैयारी चरण",
    stepLabels: ["जन्म जानकारी", "उपनाम और नाम शर्तें", "विस्तृत प्राथमिकताएं (वैकल्पिक)"],
    step0Heading: "जन्म जानकारी",
    reloadButtonAria: "प्रोफ़ाइल कार्ड से जन्म जानकारी लोड करें",
    reloadButton: "प्रोफ़ाइल कार्ड से लोड करें",
    genderLabel: "लिंग",
    genderSelect: "चुनें",
    genderFemale: "महिला",
    genderMale: "पुरुष",
    genderOther: "अन्य/अनिर्दिष्ट",
    birthDateLabel: "जन्म तिथि",
    birthTimeLabel: "जन्म समय",
    calendarLabel: "कैलेंडर आधार",
    calendarSolar: "सौर",
    calendarLunar: "चंद्र",
    birthPlaceLabel: "जन्म स्थान",
    timezoneLabel: "संदर्भ समय क्षेत्र",
    birthTimeUnknownCheckbox: "जन्म समय अज्ञात",
    leapMonthCheckbox: "अधिमास",
    step0NextButton: "आगे · उपनाम और नाम शर्तें",
    step1Heading: "उपनाम और नाम शर्तें",
    familyNameLabel: "उपनाम",
    familyNamePlaceholder: "उदा: किम",
    familyNameHint: "केवल उपनाम दर्ज करें। जो नाम आप चाहते हैं वह नीचे “उम्मीदवार नाम” या “अनिवार्य अक्षर” में लिखें।",
    familyNameLooksFullWarning: "तीन या अधिक अक्षर होने के कारण यह उपनाम के बजाय पूरा नाम प्रतीत होता है। इसे ऐसे ही छोड़ने पर यह अनुशंसित उम्मीदवारों के आगे जुड़ जाएगा।",
    nameLengthLabel: "नाम के अक्षरों की संख्या",
    nameLength1: "एक अक्षर",
    nameLength2: "दो अक्षर",
    nameLength3: "तीन अक्षर",
    nameLength4: "चार अक्षर",
    currentNameLabel: "वर्तमान में विचाराधीन हांगुल नाम",
    currentNamePlaceholder: "उदा: सेयून",
    useHanjaLabel: "हांजा नाम का उपयोग",
    useHanjaYes: "उपयोग करें",
    useHanjaNo: "हांगुल नाम पर केंद्रित",
    desiredNamesLabel: "उम्मीदवार नाम (प्रति पंक्ति एक, प्रारूप: “हांगुल | हांजा उम्मीदवार1,हांजा उम्मीदवार2 | टिप्पणी”)",
    desiredNamesPlaceholder: "सेयून | | कोमल और बुद्धिमान भाव\nहारिन | 荷潾,河璘 | स्वच्छ और उज्ज्वल छवि",
    desiredSyllablesLabel: "उपयोग करना चाहते हैं ऐसे शब्दांश",
    desiredSyllablesPlaceholder: "उदा: सेओ, यून, हा",
    requiredSyllablesLabel: "अनिवार्य रूप से शामिल करने वाले अक्षर",
    requiredSyllablesPlaceholder: "उदा: यून",
    blockedSyllablesLabel: "टालना चाहते हैं ऐसे अक्षर",
    blockedSyllablesPlaceholder: "उदा: मिन, जी",
    freeDraftHeading: "मुफ्त प्रारूप सुझाव",
    freeDraftBadge: "केवल संदर्भ हेतु · भुगतान से असंबद्ध",
    freeDraftEmpty: "दर्ज की गई शर्तों से अभी प्रारूप उम्मीदवार नहीं बनाए जा सकते।",
    freeDraftPoolNote: "ये ड्राफ्ट अंग्रेज़ी नामों की सूची से चुने गए हैं। भुगतान के बाद बनने वाली नामकरण पुस्तिका आपकी चुनी हुई भाषा की नामकरण परंपरा का पालन करेगी।",
    step1PrevButton: "पिछला",
    step1NextButton: "आगे · विस्तृत प्राथमिकताएं",
    step2Heading: "विस्तृत प्राथमिकताएं (वैकल्पिक)",
    step2Intro: "खाली छोड़ने पर भी नामकरण जारी रहेगा। नीचे दिए विकल्पों को चुनें या स्वयं लिखें, नामकरण विशेषज्ञ इसे यथावत प्रतिबिंबित करेंगे।",
    desiredTypeLabel: "इच्छित नाम प्रकार",
    desiredTypePlaceholder: "उदा: आधुनिक और कोमल नाम",
    desiredTypeAria: "इच्छित नाम प्रकार चुनें",
    preferenceToneLabel: "नाम का भाव/छवि",
    preferenceTonePlaceholder: "उदा: आधुनिक, स्वच्छ, शांत, सुरुचिपूर्ण, तारों जैसा",
    preferenceToneAria: "नाम का भाव चुनें",
    generationNameRuleLabel: "पीढ़ी अक्षर की स्थिति",
    generationNameRulePlaceholder: "उदा: बीच के अक्षर में 'जुन' का उपयोग",
    generationNameRuleAria: "पीढ़ी अक्षर नियम चुनें",
    siblingHarmonyLabel: "भाई-बहनों के नामों से सामंजस्य",
    siblingHarmonyPlaceholder: "उदा: बड़े भाई के नाम मिन्जुन से मेल खाने के लिए",
    siblingHarmonyAria: "भाई-बहन सामंजस्य चुनें",
    avoidFamilyNamesLabel: "टालने योग्य परिवार के नाम या समान उच्चारण",
    avoidFamilyNamesPlaceholder: "उदा: दादी के नाम जैसा उच्चारण हटाएं",
    avoidFamilyNamesAria: "टालने की शर्तें चुनें",
    memoLabel: "अन्य अनुरोध",
    memoAria: "नामकरण उद्देश्य चुनें",
    memoPlaceholder: "कृपया बताएं कि यह नाम वास्तविक जन्म पंजीकरण के लिए है, नाम परिवर्तन के लिए है, या आप कोई विशेष भाव चाहते हैं।",
    step2PrevButton: "पिछला",
    sidebarHeading: "प्रीमियम नामकरण शुरू करें",
    sidebarDescription: "आवश्यक जानकारी की पुष्टि के बाद, 30,000 KRW एकल भुगतान, पास या मूनस्टोन में से उपलब्ध तरीके से आगे बढ़ेंगे। यदि आपके पास पहले से पास या मूनस्टोन से पहुंच है, तो बिना भुगतान विंडो के तुरंत जनरेट हो जाएगा।",
    summaryBirthLabel: "जन्म जानकारी",
    summaryFamilyLabel: "उपनाम · अक्षर संख्या",
    summaryPreferenceLabel: "विस्तृत प्राथमिकताएं",
    summaryNotEntered: "दर्ज नहीं किया गया",
    summaryEntered: "दर्ज किया गया",
    summaryOptional: "वैकल्पिक प्रविष्टि",
    summaryTimeUnknownSuffix: " · समय अज्ञात",
    summaryCharSuffix: " अक्षर",
    busyChecking: "इनपुट और साजू मानदंड की जांच की जा रही है…",
    busyPayment: "पास/भुगतान की पुष्टि की जा रही है…",
    submitBusy: "प्रगति में है…",
    submitMissing: (field) => `पहले ${field} दर्ज करें`,
    submitDefault: "30,000 KRW भुगतान/पास पुष्टि के बाद नामकरण शुरू करें",
    retryButton: "पुनः प्रयास करें",
    footerNote: "भुगतान के बाद जनरेशन विफल होने पर भी, उसी इनपुट के साथ पुनः प्रयास में अतिरिक्त भुगतान की आवश्यकता नहीं है।",
    generatingSubtitle: "नामकरण विशेषज्ञ को साजू सत्यापित करने और नाम गढ़ने में लगभग 1-2 मिनट लगते हैं। पूर्ण होते ही आप सीधे नामकरण पुस्तिका स्क्रीन पर पहुंच जाएंगे।",
  },
  es: {
    reason: "Generación de consulta experta de nombres basada en Saju",
    errorText: {
      LOGIN_REQUIRED: "Necesitas iniciar sesión para usar esto.",
      INPUT_MISSING: "Por favor, ingresa primero el género, la fecha de nacimiento, el calendario solar/lunar y el apellido.",
      HANJA_LENGTH_MISMATCH: "El número de caracteres del candidato Hanja no coincide con el número de sílabas del nombre en Hangul.",
      PAYMENT_CANCELLED: "El pago fue cancelado. Puedes intentarlo de nuevo cuando quieras.",
      PAYMENT_FAILED: "La verificación del pago falló. Inténtalo de nuevo en unos momentos.",
      PAYMENT_NOT_FOUND: "No pudimos confirmar tu registro de pago. Si se cobró un monto, sigue siendo válido; inténtalo de nuevo en unos momentos.",
      NAMING_ACCESS_REQUIRED: "Puedes generar después de confirmar un pase, una piedra lunar o un pago.",
      PAYMENT_ID_REQUIRED: "La verificación del pago único no ha terminado. Inténtalo de nuevo en unos momentos.",
      INPUT_HASH_MISMATCH: "La entrada ha cambiado. Verifica tu entrada y comienza de nuevo.",
      ACCESS_PRODUCT_MISMATCH: "Esta no es una autorización de pago para el prompt de nombres. Inténtalo de nuevo.",
      CHECKOUT_FAILED: "Ocurrió un problema al preparar el pago. Inténtalo de nuevo en unos momentos.",
      GENERATE_FAILED: "No se pudo generar el resultado del nombre. Inténtalo de nuevo en unos momentos.",
      LLM_ERROR: "No se pudo generar el resultado del nombre. Tu pago se conserva y puedes reintentar con la misma entrada.",
      POLL_TIMEOUT: "Generar el resultado está tardando más de lo esperado. Vuelve a consultar la página de resultados en unos momentos.",
      NETWORK_ERROR: "Verifica tu conexión de red e inténtalo de nuevo.",
      SERVER_ERROR: "Ocurrió un error temporal. Inténtalo de nuevo en unos momentos.",
    },
    fieldNames: { gender: "género", birthDate: "fecha de nacimiento", calendarType: "calendario solar/lunar", familyName: "apellido" },
    missingFieldsMessage: (fields) => `Por favor, ingresa primero ${fields.join(", ")}.`,
    nameTypeOptions: ["Moderno y suave", "Clásico y pulcro", "Neutro en género", "Fácil de llamar", "Poco común", "Funciona internacionalmente"],
    generationRuleOptions: ["Sin carácter generacional", "Carácter generacional en el medio", "Carácter generacional al final"],
    siblingOptions: ["Sin hermanos", "Mismo primer carácter", "Solo coincidir el ambiente"],
    avoidOptions: ["Excluir sonidos como los de familiares", "Preferir nombres sin consonante final", "Excluir sonidos fuertes/aspirados"],
    purposeOptions: ["Para registro de nacimiento", "Para cambio de nombre", "Para reemplazar un nombre provisional"],
    generatingSteps: [
      "Verificando tu entrada y los criterios de Saju",
      "Confirmando tu pase o pago",
      "Construyendo la carta Saju y verificando el elemento guía",
      "Tejiendo sonidos y Hanja en el folleto de nombres",
    ],
    gateCheckingTitle: "Verificando pase",
    gateCheckedTitle: "Pase confirmado",
    defaultBirthPlace: "Corea del Sur",
    heroBadge: "Nombres expertos premium basados en Saju",
    heroTitle: "Casa de Nombres Hunminjeongeum",
    heroDescription: "Un experto nombra a tu hijo directamente, entrelazando el sonido y el significado Hanja en torno a los elementos guía y de apoyo verificados en la carta Saju, y también te entrega el prompt completo detrás de ese folleto de nombres. Ingresar la información y las sugerencias de borrador gratuitas son gratis.",
    heroPills: ["Verificación de elemento guía", "Flujo de sonido-elemento", "Numerología de cuatro cuadrantes Won-Hyeong-Yi-Jeong", "Conserva el resultado en PDF"],
    stepsAriaLabel: "Pasos de preparación de nombres",
    stepLabels: ["Información de nacimiento", "Apellido y condiciones del nombre", "Preferencias detalladas (opcional)"],
    step0Heading: "Información de nacimiento",
    reloadButtonAria: "Cargar información de nacimiento desde tu tarjeta de perfil",
    reloadButton: "Cargar desde tarjeta de perfil",
    genderLabel: "Género",
    genderSelect: "Seleccionar",
    genderFemale: "Femenino",
    genderMale: "Masculino",
    genderOther: "Otro / no especificado",
    birthDateLabel: "Fecha de nacimiento",
    birthTimeLabel: "Hora de nacimiento",
    calendarLabel: "Calendario",
    calendarSolar: "Solar",
    calendarLunar: "Lunar",
    birthPlaceLabel: "Lugar de nacimiento",
    timezoneLabel: "Zona horaria de referencia",
    birthTimeUnknownCheckbox: "Hora de nacimiento desconocida",
    leapMonthCheckbox: "Mes bisiesto",
    step0NextButton: "Siguiente · Apellido y condiciones del nombre",
    step1Heading: "Apellido y condiciones del nombre",
    familyNameLabel: "Apellido",
    familyNamePlaceholder: "Ej: Kim",
    familyNameHint: "Ingresa solo el apellido. Si tienes un nombre en mente, escríbelo en “Nombres candidatos” o “Caracteres que debes incluir” a continuación.",
    familyNameLooksFullWarning: "Esto parece un nombre completo en lugar de un apellido, ya que tiene tres o más caracteres. Si se deja así, simplemente se antepondrá a los candidatos recomendados.",
    nameLengthLabel: "Número de sílabas del nombre",
    nameLength1: "Una sílaba",
    nameLength2: "Dos sílabas",
    nameLength3: "Tres sílabas",
    nameLength4: "Cuatro sílabas",
    currentNameLabel: "Nombre en Hangul que estás considerando actualmente",
    currentNamePlaceholder: "Ej: Seoyoon",
    useHanjaLabel: "Usar un nombre en Hanja",
    useHanjaYes: "Usarlo",
    useHanjaNo: "Enfocarse en el nombre en Hangul",
    desiredNamesLabel: "Nombres candidatos (uno por línea, formato: “Hangul | Candidato Hanja1,Candidato Hanja2 | nota”)",
    desiredNamesPlaceholder: "Seoyoon | | sensación suave e inteligente\nHarin | 荷潾,河璘 | imagen clara y brillante",
    desiredSyllablesLabel: "Sílabas que te gustaría usar",
    desiredSyllablesPlaceholder: "Ej: Seo, Yoon, Ha",
    requiredSyllablesLabel: "Caracteres que debes incluir",
    requiredSyllablesPlaceholder: "Ej: Yoon",
    blockedSyllablesLabel: "Caracteres que quieres evitar",
    blockedSyllablesPlaceholder: "Ej: Min, Ji",
    freeDraftHeading: "Recomendaciones de borrador gratuitas",
    freeDraftBadge: "Solo de referencia · no relacionado con el pago",
    freeDraftEmpty: "Aún no podemos crear candidatos de borrador con tu entrada actual.",
    freeDraftPoolNote: "Estos borradores se eligen de una lista de nombres en inglés. El cuadernillo que se genera tras el pago sigue la tradición de nombres del idioma que estás usando.",
    step1PrevButton: "Anterior",
    step1NextButton: "Siguiente · Preferencias detalladas",
    step2Heading: "Preferencias detalladas (opcional)",
    step2Intro: "Puedes dejarlo en blanco y aun así continuar con el nombre. Toca las opciones a continuación o escribe las tuyas, y el experto en nombres lo reflejará tal cual.",
    desiredTypeLabel: "Tipo de nombre que deseas",
    desiredTypePlaceholder: "Ej: Un nombre moderno y suave",
    desiredTypeAria: "Seleccionar el tipo de nombre deseado",
    preferenceToneLabel: "Ambiente / imagen del nombre",
    preferenceTonePlaceholder: "Ej: Moderno, claro, tranquilo, elegante, como la luz de las estrellas",
    preferenceToneAria: "Seleccionar el ambiente del nombre",
    generationNameRuleLabel: "Carácter de nombre generacional",
    generationNameRulePlaceholder: "Ej: usar 'jun' en el carácter del medio",
    generationNameRuleAria: "Seleccionar la regla del nombre generacional",
    siblingHarmonyLabel: "Armonía con los nombres de hermanos",
    siblingHarmonyPlaceholder: "Ej: para coincidir con el nombre del hermano mayor Minjun",
    siblingHarmonyAria: "Seleccionar la armonía entre hermanos",
    avoidFamilyNamesLabel: "Nombres familiares o sonidos similares a evitar",
    avoidFamilyNamesPlaceholder: "Ej: excluir sonidos similares al nombre de la abuela",
    avoidFamilyNamesAria: "Seleccionar condiciones a evitar",
    memoLabel: "Otras solicitudes",
    memoAria: "Seleccionar el propósito del nombre",
    memoPlaceholder: "Cuéntanos si este nombre se usará para un registro de nacimiento real, un cambio de nombre, o cualquier ambiente particular que desees.",
    step2PrevButton: "Anterior",
    sidebarHeading: "Comenzar nombres premium",
    sidebarDescription: "Después de confirmar los campos requeridos, procedemos con un pago único de 30,000 KRW, un pase o piedra lunar, lo que esté disponible. Si ya tienes acceso a través de un pase o piedra lunar, la generación comienza de inmediato sin ventana de pago.",
    summaryBirthLabel: "Información de nacimiento",
    summaryFamilyLabel: "Apellido · número de sílabas",
    summaryPreferenceLabel: "Preferencias detalladas",
    summaryNotEntered: "No ingresado",
    summaryEntered: "Ingresado",
    summaryOptional: "Opcional",
    summaryTimeUnknownSuffix: " · hora desconocida",
    summaryCharSuffix: " sílabas",
    busyChecking: "Verificando tu entrada y los criterios de Saju…",
    busyPayment: "Confirmando tu pase o pago…",
    submitBusy: "En progreso…",
    submitMissing: (field) => `Por favor, ingresa ${field} primero`,
    submitDefault: "Confirmar pago de 30,000 KRW/pase y comenzar el nombre",
    retryButton: "Intentar de nuevo",
    footerNote: "Incluso si la generación falla después del pago, reintentar con la misma entrada no requiere pago adicional.",
    generatingSubtitle: "El experto en nombres tarda aproximadamente 1-2 minutos en verificar la carta Saju y crear el nombre. Serás llevado a la pantalla del folleto de nombres tan pronto esté listo.",
  },
  fr: {
    reason: "Génération de consultation experte de prénoms basée sur le Saju",
    errorText: {
      LOGIN_REQUIRED: "Vous devez vous connecter pour utiliser ceci.",
      INPUT_MISSING: "Veuillez d'abord saisir le genre, la date de naissance, le calendrier solaire/lunaire et le nom de famille.",
      HANJA_LENGTH_MISMATCH: "Le nombre de caractères du candidat Hanja ne correspond pas au nombre de syllabes du prénom Hangul.",
      PAYMENT_CANCELLED: "Le paiement a été annulé. Vous pouvez réessayer quand vous le souhaitez.",
      PAYMENT_FAILED: "La vérification du paiement a échoué. Veuillez réessayer dans un instant.",
      PAYMENT_NOT_FOUND: "Nous n'avons pas pu confirmer votre enregistrement de paiement. Si un montant a été débité, il reste valide ; veuillez réessayer dans un instant.",
      NAMING_ACCESS_REQUIRED: "Vous pouvez générer après avoir confirmé un pass, une pierre de lune ou un paiement.",
      PAYMENT_ID_REQUIRED: "La vérification du paiement unique n'est pas terminée. Veuillez réessayer dans un instant.",
      INPUT_HASH_MISMATCH: "La saisie a changé. Veuillez vérifier votre saisie et recommencer.",
      ACCESS_PRODUCT_MISMATCH: "Ce n'est pas une autorisation de paiement pour le prompt de prénom. Veuillez réessayer.",
      CHECKOUT_FAILED: "Un problème est survenu lors de la préparation du paiement. Veuillez réessayer dans un instant.",
      GENERATE_FAILED: "Échec de la génération du résultat du prénom. Veuillez réessayer dans un instant.",
      LLM_ERROR: "Échec de la génération du résultat du prénom. Votre paiement est conservé, vous pouvez réessayer avec la même saisie.",
      POLL_TIMEOUT: "La génération du résultat prend plus de temps que prévu. Veuillez revérifier la page de résultats dans un instant.",
      NETWORK_ERROR: "Veuillez vérifier votre connexion réseau et réessayer.",
      SERVER_ERROR: "Une erreur temporaire est survenue. Veuillez réessayer dans un instant.",
    },
    fieldNames: { gender: "genre", birthDate: "date de naissance", calendarType: "calendrier solaire/lunaire", familyName: "nom de famille" },
    missingFieldsMessage: (fields) => `Veuillez d'abord saisir ${fields.join(", ")}.`,
    nameTypeOptions: ["Moderne et doux", "Classique et soigné", "Neutre", "Facile à prononcer", "Peu commun", "Fonctionne à l'international"],
    generationRuleOptions: ["Pas de caractère générationnel", "Caractère générationnel au milieu", "Caractère générationnel à la fin"],
    siblingOptions: ["Pas de frères et sœurs", "Même premier caractère", "Assortir uniquement l'ambiance"],
    avoidOptions: ["Exclure les sons similaires à ceux de la famille", "Préférer les prénoms sans consonne finale", "Exclure les sons durs/aspirés"],
    purposeOptions: ["Pour l'enregistrement des naissances", "Pour un changement de nom", "Pour remplacer un nom provisoire"],
    generatingSteps: [
      "Vérification de votre saisie et des critères Saju",
      "Confirmation de votre pass ou paiement",
      "Construction du thème Saju et vérification de l'élément directeur",
      "Sélection des sons et des Hanja pour composer le livret de prénoms",
    ],
    gateCheckingTitle: "Vérification du pass",
    gateCheckedTitle: "Pass confirmé",
    defaultBirthPlace: "Corée du Sud",
    heroBadge: "Prénoms experts premium basés sur le Saju",
    heroTitle: "Maison de Prénoms Hunminjeongeum",
    heroDescription: "Un expert nomme directement votre enfant, en tissant le son et le sens Hanja autour des éléments directeur et de soutien vérifiés à partir du thème Saju, et vous remet également le prompt complet derrière ce livret de prénoms. La saisie des informations et les suggestions de brouillon gratuites sont gratuites.",
    heroPills: ["Vérification de l'élément directeur", "Flux son-élément", "Numérologie à quatre grilles Won-Hyeong-Yi-Jeong", "Conserver le résultat en PDF"],
    stepsAriaLabel: "Étapes de préparation du prénom",
    stepLabels: ["Informations de naissance", "Nom de famille et conditions du prénom", "Préférences détaillées (facultatif)"],
    step0Heading: "Informations de naissance",
    reloadButtonAria: "Charger les informations de naissance depuis votre carte de profil",
    reloadButton: "Charger depuis la carte de profil",
    genderLabel: "Genre",
    genderSelect: "Sélectionner",
    genderFemale: "Femme",
    genderMale: "Homme",
    genderOther: "Autre / non spécifié",
    birthDateLabel: "Date de naissance",
    birthTimeLabel: "Heure de naissance",
    calendarLabel: "Calendrier",
    calendarSolar: "Solaire",
    calendarLunar: "Lunaire",
    birthPlaceLabel: "Lieu de naissance",
    timezoneLabel: "Fuseau horaire de référence",
    birthTimeUnknownCheckbox: "Heure de naissance inconnue",
    leapMonthCheckbox: "Mois intercalaire",
    step0NextButton: "Suivant · Nom de famille et conditions du prénom",
    step1Heading: "Nom de famille et conditions du prénom",
    familyNameLabel: "Nom de famille",
    familyNamePlaceholder: "Ex : Kim",
    familyNameHint: "Saisissez uniquement le nom de famille. Si vous avez un prénom en tête, écrivez-le dans « Prénoms candidats » ou « Caractères à inclure absolument » ci-dessous.",
    familyNameLooksFullWarning: "Cela ressemble à un nom complet plutôt qu'à un nom de famille, car il comporte trois caractères ou plus. Si vous le laissez tel quel, il sera simplement ajouté devant les candidats recommandés.",
    nameLengthLabel: "Nombre de syllabes du prénom",
    nameLength1: "Une syllabe",
    nameLength2: "Deux syllabes",
    nameLength3: "Trois syllabes",
    nameLength4: "Quatre syllabes",
    currentNameLabel: "Prénom en Hangul que vous envisagez actuellement",
    currentNamePlaceholder: "Ex : Seoyoon",
    useHanjaLabel: "Utiliser un prénom en Hanja",
    useHanjaYes: "L'utiliser",
    useHanjaNo: "Se concentrer sur le prénom en Hangul",
    desiredNamesLabel: "Prénoms candidats (un par ligne, format : « Hangul | Candidat Hanja1,Candidat Hanja2 | note »)",
    desiredNamesPlaceholder: "Seoyoon | | sensation douce et intelligente\nHarin | 荷潾,河璘 | image claire et lumineuse",
    desiredSyllablesLabel: "Syllabes que vous aimeriez utiliser",
    desiredSyllablesPlaceholder: "Ex : Seo, Yoon, Ha",
    requiredSyllablesLabel: "Caractères à inclure absolument",
    requiredSyllablesPlaceholder: "Ex : Yoon",
    blockedSyllablesLabel: "Caractères à éviter",
    blockedSyllablesPlaceholder: "Ex : Min, Ji",
    freeDraftHeading: "Recommandations de brouillon gratuites",
    freeDraftBadge: "À titre indicatif · sans rapport avec le paiement",
    freeDraftEmpty: "Nous ne pouvons pas encore créer de candidats de brouillon à partir de votre saisie actuelle.",
    freeDraftPoolNote: "Ces brouillons sont choisis dans une liste de prénoms anglais. Le livret généré après paiement suit la tradition de dénomination de la langue que vous utilisez.",
    step1PrevButton: "Précédent",
    step1NextButton: "Suivant · Préférences détaillées",
    step2Heading: "Préférences détaillées (facultatif)",
    step2Intro: "Vous pouvez laisser ceci vide et continuer quand même. Appuyez sur les options ci-dessous ou écrivez les vôtres, et l'expert en prénoms les reflétera telles quelles.",
    desiredTypeLabel: "Type de prénom souhaité",
    desiredTypePlaceholder: "Ex : Un prénom moderne et doux",
    desiredTypeAria: "Sélectionner le type de prénom souhaité",
    preferenceToneLabel: "Ambiance / image du prénom",
    preferenceTonePlaceholder: "Ex : Moderne, clair, calme, élégant, comme la lumière des étoiles",
    preferenceToneAria: "Sélectionner l'ambiance du prénom",
    generationNameRuleLabel: "Caractère générationnel",
    generationNameRulePlaceholder: "Ex : utiliser 'jun' au caractère du milieu",
    generationNameRuleAria: "Sélectionner la règle du caractère générationnel",
    siblingHarmonyLabel: "Harmonie avec les prénoms des frères et sœurs",
    siblingHarmonyPlaceholder: "Ex : pour correspondre au prénom du frère aîné Minjun",
    siblingHarmonyAria: "Sélectionner l'harmonie entre frères et sœurs",
    avoidFamilyNamesLabel: "Noms de famille ou sons similaires à éviter",
    avoidFamilyNamesPlaceholder: "Ex : exclure les sons similaires au prénom de la grand-mère",
    avoidFamilyNamesAria: "Sélectionner les conditions à éviter",
    memoLabel: "Autres demandes",
    memoAria: "Sélectionner l'objectif du prénom",
    memoPlaceholder: "Merci de préciser si ce prénom sera utilisé pour un enregistrement de naissance réel, un changement de nom, ou toute ambiance particulière que vous souhaitez.",
    step2PrevButton: "Précédent",
    sidebarHeading: "Commencer le prénom premium",
    sidebarDescription: "Après confirmation des champs requis, nous procédons avec un paiement unique de 30 000 KRW, un pass ou une pierre de lune, selon ce qui est disponible. Si vous avez déjà accès via un pass ou une pierre de lune, la génération commence immédiatement sans fenêtre de paiement.",
    summaryBirthLabel: "Informations de naissance",
    summaryFamilyLabel: "Nom de famille · nombre de syllabes",
    summaryPreferenceLabel: "Préférences détaillées",
    summaryNotEntered: "Non saisi",
    summaryEntered: "Saisi",
    summaryOptional: "Saisie facultative",
    summaryTimeUnknownSuffix: " · heure inconnue",
    summaryCharSuffix: " syllabes",
    busyChecking: "Vérification de votre saisie et des critères Saju…",
    busyPayment: "Confirmation de votre pass ou paiement…",
    submitBusy: "En cours…",
    submitMissing: (field) => `Veuillez d'abord saisir ${field}`,
    submitDefault: "Confirmer le paiement de 30 000 KRW/pass et commencer le prénom",
    retryButton: "Réessayer",
    footerNote: "Même si la génération échoue après le paiement, réessayer avec la même saisie ne nécessite aucun paiement supplémentaire.",
    generatingSubtitle: "L'expert en prénoms met environ 1 à 2 minutes pour vérifier le thème Saju et créer le prénom. Vous serez redirigé vers l'écran du livret de prénoms dès qu'il sera prêt.",
  },
  de: {
    reason: "Erstellung einer Saju-basierten Experten-Namensberatung",
    errorText: {
      LOGIN_REQUIRED: "Du musst dich anmelden, um dies zu nutzen.",
      INPUT_MISSING: "Bitte gib zuerst Geschlecht, Geburtsdatum, Sonnen-/Mondkalender und Nachname ein.",
      HANJA_LENGTH_MISMATCH: "Die Anzahl der Zeichen im Hanja-Kandidaten stimmt nicht mit der Silbenzahl des Hangul-Namens überein.",
      PAYMENT_CANCELLED: "Die Zahlung wurde storniert. Du kannst es jederzeit erneut versuchen.",
      PAYMENT_FAILED: "Die Zahlungsüberprüfung ist fehlgeschlagen. Bitte versuche es später erneut.",
      PAYMENT_NOT_FOUND: "Wir konnten deinen Zahlungsdatensatz nicht bestätigen. Falls ein Betrag abgebucht wurde, bleibt er gültig — bitte versuche es später erneut.",
      NAMING_ACCESS_REQUIRED: "Du kannst nach Bestätigung eines Passes, Mondsteins oder einer Zahlung generieren.",
      PAYMENT_ID_REQUIRED: "Die Einmalzahlungsüberprüfung ist noch nicht abgeschlossen. Bitte versuche es später erneut.",
      INPUT_HASH_MISMATCH: "Die Eingabe hat sich geändert. Bitte überprüfe deine Eingabe und beginne erneut.",
      ACCESS_PRODUCT_MISMATCH: "Dies ist keine Zahlungsberechtigung für den Namens-Prompt. Bitte versuche es erneut.",
      CHECKOUT_FAILED: "Bei der Zahlungsvorbereitung ist ein Problem aufgetreten. Bitte versuche es später erneut.",
      GENERATE_FAILED: "Das Namensergebnis konnte nicht erstellt werden. Bitte versuche es später erneut.",
      LLM_ERROR: "Das Namensergebnis konnte nicht erstellt werden. Deine Zahlung bleibt erhalten, du kannst es mit derselben Eingabe erneut versuchen.",
      POLL_TIMEOUT: "Die Ergebniserstellung dauert länger als erwartet. Bitte überprüfe die Ergebnisseite in Kürze erneut.",
      NETWORK_ERROR: "Bitte überprüfe deine Netzwerkverbindung und versuche es erneut.",
      SERVER_ERROR: "Es ist ein vorübergehender Fehler aufgetreten. Bitte versuche es später erneut.",
    },
    fieldNames: { gender: "Geschlecht", birthDate: "Geburtsdatum", calendarType: "Sonnen-/Mondkalender", familyName: "Nachname" },
    missingFieldsMessage: (fields) => `Bitte gib zuerst ${fields.join(", ")} ein.`,
    nameTypeOptions: ["Modern und sanft", "Klassisch und gepflegt", "Geschlechtsneutral", "Leicht zu rufen", "Ungewöhnlich", "International tauglich"],
    generationRuleOptions: ["Kein Generationszeichen", "Generationszeichen in der Mitte", "Generationszeichen am Ende"],
    siblingOptions: ["Keine Geschwister", "Gleiches erstes Zeichen", "Nur Stimmung anpassen"],
    avoidOptions: ["Laute wie bei Familiennamen ausschließen", "Namen ohne Endkonsonant bevorzugen", "Harte/aspirierte Laute ausschließen"],
    purposeOptions: ["Für die Geburtsregistrierung", "Für eine Namensänderung", "Als Ersatz für einen Kindheitsnamen"],
    generatingSteps: [
      "Deine Eingabe und die Saju-Kriterien werden überprüft",
      "Dein Pass oder deine Zahlung wird bestätigt",
      "Das Saju-Chart wird erstellt und das Leitelement überprüft",
      "Klänge und Hanja werden ausgewählt, um das Namensbüchlein zu weben",
    ],
    gateCheckingTitle: "Pass wird geprüft",
    gateCheckedTitle: "Pass bestätigt",
    defaultBirthPlace: "Südkorea",
    heroBadge: "Saju-basierte Premium-Expertennamensgebung",
    heroTitle: "Hunminjeongeum-Namenshaus",
    heroDescription: "Ein Experte benennt dein Kind direkt, indem er Klang und Hanja-Bedeutung um die aus dem Saju-Chart verifizierten Leit- und Hilfselemente webt, und übergibt dir auch den vollständigen Prompt hinter diesem Namensbüchlein. Die Eingabe von Informationen und kostenlose Entwurfsvorschläge sind gratis.",
    heroPills: ["Leitelement-Verifizierung", "Klang-Element-Fluss", "Won-Hyeong-Yi-Jeong-Vier-Raster-Numerologie", "Ergebnis als PDF behalten"],
    stepsAriaLabel: "Namensvorbereitungsschritte",
    stepLabels: ["Geburtsinformationen", "Nachname und Namensbedingungen", "Detaillierte Vorlieben (optional)"],
    step0Heading: "Geburtsinformationen",
    reloadButtonAria: "Geburtsinformationen aus der Profilkarte laden",
    reloadButton: "Aus Profilkarte laden",
    genderLabel: "Geschlecht",
    genderSelect: "Auswählen",
    genderFemale: "Weiblich",
    genderMale: "Männlich",
    genderOther: "Andere/nicht angegeben",
    birthDateLabel: "Geburtsdatum",
    birthTimeLabel: "Geburtszeit",
    calendarLabel: "Kalender",
    calendarSolar: "Sonnenkalender",
    calendarLunar: "Mondkalender",
    birthPlaceLabel: "Geburtsort",
    timezoneLabel: "Referenz-Zeitzone",
    birthTimeUnknownCheckbox: "Geburtszeit unbekannt",
    leapMonthCheckbox: "Schaltmonat",
    step0NextButton: "Weiter · Nachname und Namensbedingungen",
    step1Heading: "Nachname und Namensbedingungen",
    familyNameLabel: "Nachname",
    familyNamePlaceholder: "z. B. Kim",
    familyNameHint: "Gib nur den Nachnamen ein. Wenn du einen Vornamen im Sinn hast, schreibe ihn unten unter „Kandidatennamen“ oder „Zeichen, die unbedingt enthalten sein müssen“.",
    familyNameLooksFullWarning: "Da es sich um drei oder mehr Zeichen handelt, sieht dies eher nach einem vollständigen Namen als nach einem Nachnamen aus. Wenn du es so belässt, wird es den empfohlenen Kandidaten einfach vorangestellt.",
    nameLengthLabel: "Anzahl der Silben im Namen",
    nameLength1: "Eine Silbe",
    nameLength2: "Zwei Silben",
    nameLength3: "Drei Silben",
    nameLength4: "Vier Silben",
    currentNameLabel: "Hangul-Name, den du gerade in Erwägung ziehst",
    currentNamePlaceholder: "z. B. Seoyoon",
    useHanjaLabel: "Einen Hanja-Namen verwenden",
    useHanjaYes: "Verwenden",
    useHanjaNo: "Fokus auf den Hangul-Namen",
    desiredNamesLabel: "Kandidatennamen (einer pro Zeile, Format: „Hangul | Hanja-Kandidat1,Hanja-Kandidat2 | Notiz“)",
    desiredNamesPlaceholder: "Seoyoon | | sanftes und kluges Gefühl\nHarin | 荷潾,河璘 | klares und helles Bild",
    desiredSyllablesLabel: "Silben, die du gerne verwenden möchtest",
    desiredSyllablesPlaceholder: "z. B. Seo, Yoon, Ha",
    requiredSyllablesLabel: "Zeichen, die unbedingt enthalten sein müssen",
    requiredSyllablesPlaceholder: "z. B. Yoon",
    blockedSyllablesLabel: "Zeichen, die du vermeiden möchtest",
    blockedSyllablesPlaceholder: "z. B. Min, Ji",
    freeDraftHeading: "Kostenlose Entwurfsempfehlungen",
    freeDraftBadge: "Nur zur Referenz · unabhängig von der Zahlung",
    freeDraftEmpty: "Wir können mit deiner aktuellen Eingabe noch keine Entwurfskandidaten erstellen.",
    freeDraftPoolNote: "Diese Entwürfe stammen aus einer Liste englischer Vornamen. Das nach der Zahlung erzeugte Namensbüchlein folgt der Namenstradition Ihrer aktuellen Sprache.",
    step1PrevButton: "Zurück",
    step1NextButton: "Weiter · Detaillierte Vorlieben",
    step2Heading: "Detaillierte Vorlieben (optional)",
    step2Intro: "Du kannst dies leer lassen und trotzdem mit der Namensgebung fortfahren. Tippe unten auf Optionen oder schreibe deine eigenen, und der Namensexperte wird es genau so berücksichtigen.",
    desiredTypeLabel: "Gewünschter Namenstyp",
    desiredTypePlaceholder: "z. B. Ein moderner, sanfter Name",
    desiredTypeAria: "Gewünschten Namenstyp auswählen",
    preferenceToneLabel: "Namensstimmung/-bild",
    preferenceTonePlaceholder: "z. B. Modern, klar, ruhig, elegant, wie Sternenlicht",
    preferenceToneAria: "Namensstimmung auswählen",
    generationNameRuleLabel: "Generationszeichen",
    generationNameRulePlaceholder: "z. B. 'jun' im mittleren Zeichen verwenden",
    generationNameRuleAria: "Generationszeichen-Regel auswählen",
    siblingHarmonyLabel: "Harmonie mit Geschwisternamen",
    siblingHarmonyPlaceholder: "z. B. um zum Namen des älteren Bruders Minjun zu passen",
    siblingHarmonyAria: "Geschwisterharmonie auswählen",
    avoidFamilyNamesLabel: "Zu vermeidende Familiennamen oder ähnliche Laute",
    avoidFamilyNamesPlaceholder: "z. B. Laute ähnlich dem Namen der Großmutter ausschließen",
    avoidFamilyNamesAria: "Zu vermeidende Bedingungen auswählen",
    memoLabel: "Sonstige Wünsche",
    memoAria: "Namenszweck auswählen",
    memoPlaceholder: "Bitte teile uns mit, ob dieser Name für eine tatsächliche Geburtsregistrierung, eine Namensänderung oder eine bestimmte gewünschte Stimmung verwendet wird.",
    step2PrevButton: "Zurück",
    sidebarHeading: "Premium-Namensgebung starten",
    sidebarDescription: "Nach Bestätigung der Pflichtfelder fahren wir mit einer Einmalzahlung von 30.000 KRW, einem Pass oder Mondstein fort, je nachdem, was verfügbar ist. Wenn du bereits über einen Pass oder Mondstein Zugang hast, beginnt die Generierung sofort ohne Zahlungsfenster.",
    summaryBirthLabel: "Geburtsinformationen",
    summaryFamilyLabel: "Nachname · Silbenzahl",
    summaryPreferenceLabel: "Detaillierte Vorlieben",
    summaryNotEntered: "Nicht angegeben",
    summaryEntered: "Angegeben",
    summaryOptional: "Optionale Eingabe",
    summaryTimeUnknownSuffix: " · Zeit unbekannt",
    summaryCharSuffix: " Silben",
    busyChecking: "Deine Eingabe und die Saju-Kriterien werden überprüft…",
    busyPayment: "Dein Pass oder deine Zahlung wird bestätigt…",
    submitBusy: "In Bearbeitung…",
    submitMissing: (field) => `Bitte gib zuerst ${field} ein`,
    submitDefault: "30.000 KRW Zahlung/Pass bestätigen und Namensgebung starten",
    retryButton: "Erneut versuchen",
    footerNote: "Selbst wenn die Generierung nach der Zahlung fehlschlägt, erfordert ein erneuter Versuch mit derselben Eingabe keine zusätzliche Zahlung.",
    generatingSubtitle: "Der Namensexperte benötigt etwa 1-2 Minuten, um das Saju-Chart zu überprüfen und den Namen zu gestalten. Du wirst sofort zum Namensbüchlein-Bildschirm weitergeleitet, sobald es fertig ist.",
  },
  nl: {
    reason: "Genereren van op Saju gebaseerd expertadvies voor naamgeving",
    errorText: {
      LOGIN_REQUIRED: "Je moet inloggen om dit te gebruiken.",
      INPUT_MISSING: "Voer eerst geslacht, geboortedatum, zonne-/maankalender en achternaam in.",
      HANJA_LENGTH_MISMATCH: "Het aantal tekens in de Hanja-kandidaat komt niet overeen met het aantal lettergrepen van de Hangul-naam.",
      PAYMENT_CANCELLED: "De betaling is geannuleerd. Je kunt het later opnieuw proberen.",
      PAYMENT_FAILED: "Betalingsverificatie mislukt. Probeer het later opnieuw.",
      PAYMENT_NOT_FOUND: "We konden je betalingsgegevens niet bevestigen. Als er een bedrag is afgeschreven, blijft dit geldig — probeer het later opnieuw.",
      NAMING_ACCESS_REQUIRED: "Je kunt genereren na bevestiging van een pass, maansteen of betaling.",
      PAYMENT_ID_REQUIRED: "De verificatie van de eenmalige betaling is nog niet voltooid. Probeer het later opnieuw.",
      INPUT_HASH_MISMATCH: "De invoer is gewijzigd. Controleer je invoer en begin opnieuw.",
      ACCESS_PRODUCT_MISMATCH: "Dit is geen betalingsautorisatie voor de naamgevingsprompt. Probeer het opnieuw.",
      CHECKOUT_FAILED: "Er is een probleem opgetreden bij het voorbereiden van de betaling. Probeer het later opnieuw.",
      GENERATE_FAILED: "Genereren van het naamresultaat is mislukt. Probeer het later opnieuw.",
      LLM_ERROR: "Genereren van het naamresultaat is mislukt. Je betaling blijft behouden, je kunt het opnieuw proberen met dezelfde invoer.",
      POLL_TIMEOUT: "Het genereren van het resultaat duurt langer dan verwacht. Controleer de resultaatpagina zo dadelijk opnieuw.",
      NETWORK_ERROR: "Controleer je netwerkverbinding en probeer het opnieuw.",
      SERVER_ERROR: "Er is een tijdelijke fout opgetreden. Probeer het later opnieuw.",
    },
    fieldNames: { gender: "geslacht", birthDate: "geboortedatum", calendarType: "zonne-/maankalender", familyName: "achternaam" },
    missingFieldsMessage: (fields) => `Voer eerst ${fields.join(", ")} in.`,
    nameTypeOptions: ["Modern en zacht", "Klassiek en netjes", "Genderneutraal", "Makkelijk te roepen", "Ongewoon", "Internationaal bruikbaar"],
    generationRuleOptions: ["Geen generatieteken", "Generatieteken in het midden", "Generatieteken aan het einde"],
    siblingOptions: ["Geen broers/zussen", "Zelfde eerste teken", "Alleen de sfeer laten matchen"],
    avoidOptions: ["Klanken zoals familienamen uitsluiten", "Namen zonder eindmedeklinker verkiezen", "Harde/geaspireerde klanken uitsluiten"],
    purposeOptions: ["Voor geboorteregistratie", "Voor naamsverandering", "Ter vervanging van een koosnaampje"],
    generatingSteps: [
      "Je invoer en Saju-criteria worden gecontroleerd",
      "Je pass of betaling wordt bevestigd",
      "De Saju-kaart wordt opgebouwd en het leidende element wordt geverifieerd",
      "Klanken en Hanja worden gekozen om het naamboekje te weven",
    ],
    gateCheckingTitle: "Pass wordt gecontroleerd",
    gateCheckedTitle: "Pass bevestigd",
    defaultBirthPlace: "Zuid-Korea",
    heroBadge: "Op Saju gebaseerde premium expertnaamgeving",
    heroTitle: "Hunminjeongeum Naamgevingshuis",
    heroDescription: "Een expert geeft je kind rechtstreeks een naam door klank en Hanja-betekenis te verweven rond de leidende en ondersteunende elementen die zijn geverifieerd vanuit de Saju-kaart, en overhandigt je ook de volledige prompt achter dat naamboekje. Het invoeren van informatie en gratis conceptvoorstellen zijn gratis.",
    heroPills: ["Verificatie leidend element", "Klank-elementstroom", "Won-Hyeong-Yi-Jeong vier-vaks numerologie", "Resultaat als PDF bewaren"],
    stepsAriaLabel: "Voorbereidingsstappen voor naamgeving",
    stepLabels: ["Geboorte-informatie", "Achternaam en naamvoorwaarden", "Gedetailleerde voorkeuren (optioneel)"],
    step0Heading: "Geboorte-informatie",
    reloadButtonAria: "Geboorte-informatie laden vanaf profielkaart",
    reloadButton: "Laden vanaf profielkaart",
    genderLabel: "Geslacht",
    genderSelect: "Selecteren",
    genderFemale: "Vrouw",
    genderMale: "Man",
    genderOther: "Anders/niet gespecificeerd",
    birthDateLabel: "Geboortedatum",
    birthTimeLabel: "Geboortetijd",
    calendarLabel: "Kalender",
    calendarSolar: "Zonnekalender",
    calendarLunar: "Maankalender",
    birthPlaceLabel: "Geboorteplaats",
    timezoneLabel: "Referentietijdzone",
    birthTimeUnknownCheckbox: "Geboortetijd onbekend",
    leapMonthCheckbox: "Schrikkelmaand",
    step0NextButton: "Volgende · Achternaam en naamvoorwaarden",
    step1Heading: "Achternaam en naamvoorwaarden",
    familyNameLabel: "Achternaam",
    familyNamePlaceholder: "Bijv.: Kim",
    familyNameHint: "Voer alleen de achternaam in. Als je een naam in gedachten hebt, schrijf deze dan hieronder bij “Kandidaatnamen” of “Tekens die je per se wilt opnemen”.",
    familyNameLooksFullWarning: "Dit lijkt eerder op een volledige naam dan op een achternaam, omdat het drie of meer tekens bevat. Als je dit zo laat, wordt het gewoon voor de aanbevolen kandidaten geplaatst.",
    nameLengthLabel: "Aantal lettergrepen in de naam",
    nameLength1: "Eén lettergreep",
    nameLength2: "Twee lettergrepen",
    nameLength3: "Drie lettergrepen",
    nameLength4: "Vier lettergrepen",
    currentNameLabel: "Hangul-naam die je momenteel overweegt",
    currentNamePlaceholder: "Bijv.: Seoyoon",
    useHanjaLabel: "Een Hanja-naam gebruiken",
    useHanjaYes: "Gebruiken",
    useHanjaNo: "Focus op de Hangul-naam",
    desiredNamesLabel: "Kandidaatnamen (één per regel, formaat: “Hangul | Hanja-kandidaat1,Hanja-kandidaat2 | notitie”)",
    desiredNamesPlaceholder: "Seoyoon | | zacht en intelligent gevoel\nHarin | 荷潾,河璘 | helder en levendig beeld",
    desiredSyllablesLabel: "Lettergrepen die je graag wilt gebruiken",
    desiredSyllablesPlaceholder: "Bijv.: Seo, Yoon, Ha",
    requiredSyllablesLabel: "Tekens die je per se wilt opnemen",
    requiredSyllablesPlaceholder: "Bijv.: Yoon",
    blockedSyllablesLabel: "Tekens die je wilt vermijden",
    blockedSyllablesPlaceholder: "Bijv.: Min, Ji",
    freeDraftHeading: "Gratis conceptaanbevelingen",
    freeDraftBadge: "Alleen ter referentie · niet gerelateerd aan betaling",
    freeDraftEmpty: "We kunnen nog geen conceptkandidaten maken op basis van je huidige invoer.",
    freeDraftPoolNote: "Deze concepten komen uit een lijst met Engelse voornamen. Het naamboekje dat na betaling wordt gemaakt volgt de naamtraditie van de taal die je gebruikt.",
    step1PrevButton: "Vorige",
    step1NextButton: "Volgende · Gedetailleerde voorkeuren",
    step2Heading: "Gedetailleerde voorkeuren (optioneel)",
    step2Intro: "Je kunt dit leeg laten en toch doorgaan met de naamgeving. Tik hieronder op opties of schrijf je eigen, en de naamgevingsexpert zal dit precies zo verwerken.",
    desiredTypeLabel: "Gewenst naamtype",
    desiredTypePlaceholder: "Bijv.: Een moderne, zachte naam",
    desiredTypeAria: "Gewenst naamtype selecteren",
    preferenceToneLabel: "Sfeer/beeld van de naam",
    preferenceTonePlaceholder: "Bijv.: Modern, helder, rustig, elegant, als sterrenlicht",
    preferenceToneAria: "Sfeer van de naam selecteren",
    generationNameRuleLabel: "Generatieteken",
    generationNameRulePlaceholder: "Bijv.: 'jun' in het middelste teken gebruiken",
    generationNameRuleAria: "Generatieteken-regel selecteren",
    siblingHarmonyLabel: "Harmonie met namen van broers/zussen",
    siblingHarmonyPlaceholder: "Bijv.: om te passen bij de naam Minjun van de oudere broer",
    siblingHarmonyAria: "Harmonie met broers/zussen selecteren",
    avoidFamilyNamesLabel: "Te vermijden familienamen of vergelijkbare klanken",
    avoidFamilyNamesPlaceholder: "Bijv.: klanken vergelijkbaar met de naam van oma uitsluiten",
    avoidFamilyNamesAria: "Te vermijden voorwaarden selecteren",
    memoLabel: "Overige verzoeken",
    memoAria: "Doel van de naamgeving selecteren",
    memoPlaceholder: "Laat ons weten of deze naam gebruikt wordt voor een echte geboorteregistratie, een naamsverandering, of een specifieke sfeer die je wenst.",
    step2PrevButton: "Vorige",
    sidebarHeading: "Premium naamgeving starten",
    sidebarDescription: "Na bevestiging van de verplichte velden gaan we verder met een eenmalige betaling van 30.000 KRW, een pass of maansteen, wat beschikbaar is. Als je al toegang hebt via een pass of maansteen, begint het genereren meteen zonder betaalvenster.",
    summaryBirthLabel: "Geboorte-informatie",
    summaryFamilyLabel: "Achternaam · aantal lettergrepen",
    summaryPreferenceLabel: "Gedetailleerde voorkeuren",
    summaryNotEntered: "Niet ingevoerd",
    summaryEntered: "Ingevoerd",
    summaryOptional: "Optionele invoer",
    summaryTimeUnknownSuffix: " · tijd onbekend",
    summaryCharSuffix: " lettergrepen",
    busyChecking: "Je invoer en Saju-criteria worden gecontroleerd…",
    busyPayment: "Je pass of betaling wordt bevestigd…",
    submitBusy: "Bezig…",
    submitMissing: (field) => `Voer eerst ${field} in`,
    submitDefault: "Bevestig 30.000 KRW betaling/pass en start naamgeving",
    retryButton: "Opnieuw proberen",
    footerNote: "Zelfs als het genereren na betaling mislukt, is opnieuw proberen met dezelfde invoer zonder extra betaling mogelijk.",
    generatingSubtitle: "De naamgevingsexpert heeft ongeveer 1-2 minuten nodig om de Saju-kaart te verifiëren en de naam te maken. Je wordt direct doorgestuurd naar het naamboekje-scherm zodra het klaar is.",
  },
  ms: {
    reason: "Menjana konsultasi penamaan pakar berasaskan Saju",
    errorText: {
      LOGIN_REQUIRED: "Anda perlu log masuk untuk menggunakan ini.",
      INPUT_MISSING: "Sila masukkan jantina, tarikh lahir, kalendar solar/lunar, dan nama keluarga dahulu.",
      HANJA_LENGTH_MISMATCH: "Bilangan aksara calon Hanja tidak sepadan dengan bilangan suku kata nama Hangul.",
      PAYMENT_CANCELLED: "Pembayaran telah dibatalkan. Anda boleh cuba lagi apabila perlu.",
      PAYMENT_FAILED: "Pengesahan pembayaran gagal. Sila cuba lagi sebentar lagi.",
      PAYMENT_NOT_FOUND: "Kami tidak dapat mengesahkan rekod pembayaran anda. Jika jumlah telah ditolak, ia kekal sah — sila cuba lagi sebentar lagi.",
      NAMING_ACCESS_REQUIRED: "Anda boleh menjana selepas mengesahkan pas, batu bulan, atau pembayaran.",
      PAYMENT_ID_REQUIRED: "Pengesahan pembayaran sekali belum selesai. Sila cuba lagi sebentar lagi.",
      INPUT_HASH_MISMATCH: "Input telah berubah. Sila semak input anda dan mula semula.",
      ACCESS_PRODUCT_MISMATCH: "Ini bukan kebenaran pembayaran untuk prompt penamaan. Sila cuba lagi.",
      CHECKOUT_FAILED: "Masalah berlaku semasa menyediakan pembayaran. Sila cuba lagi sebentar lagi.",
      GENERATE_FAILED: "Gagal menjana keputusan penamaan. Sila cuba lagi sebentar lagi.",
      LLM_ERROR: "Gagal menjana keputusan penamaan. Pembayaran anda dikekalkan, anda boleh cuba lagi dengan input yang sama.",
      POLL_TIMEOUT: "Penjanaan keputusan mengambil masa lebih lama daripada dijangka. Sila semak semula halaman keputusan sebentar lagi.",
      NETWORK_ERROR: "Sila semak sambungan rangkaian anda dan cuba lagi.",
      SERVER_ERROR: "Ralat sementara berlaku. Sila cuba lagi sebentar lagi.",
    },
    fieldNames: { gender: "jantina", birthDate: "tarikh lahir", calendarType: "kalendar solar/lunar", familyName: "nama keluarga" },
    missingFieldsMessage: (fields) => `Sila masukkan ${fields.join(", ")} dahulu.`,
    nameTypeOptions: ["Moden dan lembut", "Klasik dan kemas", "Neutral jantina", "Mudah dipanggil", "Tidak lazim", "Sesuai secara antarabangsa"],
    generationRuleOptions: ["Tiada aksara generasi", "Aksara generasi di tengah", "Aksara generasi di akhir"],
    siblingOptions: ["Tiada adik-beradik", "Aksara pertama sama", "Padankan suasana sahaja"],
    avoidOptions: ["Kecualikan bunyi seperti nama keluarga", "Utamakan nama tanpa konsonan akhir", "Kecualikan bunyi keras/beraspirasi"],
    purposeOptions: ["Untuk pendaftaran kelahiran", "Untuk penukaran nama", "Untuk menggantikan nama panggilan sementara"],
    generatingSteps: [
      "Sedang menyemak input dan kriteria Saju anda",
      "Sedang mengesahkan pas atau pembayaran anda",
      "Sedang membina carta Saju dan mengesahkan elemen panduan",
      "Sedang memilih bunyi dan Hanja untuk menganyam buku penamaan",
    ],
    gateCheckingTitle: "Menyemak pas",
    gateCheckedTitle: "Pas disahkan",
    defaultBirthPlace: "Korea Selatan",
    heroBadge: "Penamaan pakar premium berasaskan Saju",
    heroTitle: "Rumah Penamaan Hunminjeongeum",
    heroDescription: "Seorang pakar menamakan anak anda secara langsung, menganyam bunyi dan makna Hanja di sekitar elemen panduan dan sokongan yang disahkan daripada carta Saju, dan turut menyerahkan prompt penuh di sebalik buku penamaan itu. Memasukkan maklumat dan cadangan draf percuma adalah percuma.",
    heroPills: ["Pengesahan elemen panduan", "Aliran elemen bunyi", "Numerologi empat gred Won-Hyeong-Yi-Jeong", "Simpan keputusan sebagai PDF"],
    stepsAriaLabel: "Langkah persediaan penamaan",
    stepLabels: ["Maklumat kelahiran", "Nama keluarga dan syarat nama", "Keutamaan terperinci (pilihan)"],
    step0Heading: "Maklumat kelahiran",
    reloadButtonAria: "Muatkan maklumat kelahiran dari kad profil",
    reloadButton: "Muatkan dari kad profil",
    genderLabel: "Jantina",
    genderSelect: "Pilih",
    genderFemale: "Perempuan",
    genderMale: "Lelaki",
    genderOther: "Lain-lain/tidak dinyatakan",
    birthDateLabel: "Tarikh lahir",
    birthTimeLabel: "Masa lahir",
    calendarLabel: "Asas kalendar",
    calendarSolar: "Solar",
    calendarLunar: "Lunar",
    birthPlaceLabel: "Tempat lahir",
    timezoneLabel: "Zon waktu rujukan",
    birthTimeUnknownCheckbox: "Masa lahir tidak diketahui",
    leapMonthCheckbox: "Bulan lompat",
    step0NextButton: "Seterusnya · Nama keluarga dan syarat nama",
    step1Heading: "Nama keluarga dan syarat nama",
    familyNameLabel: "Nama keluarga",
    familyNamePlaceholder: "Cth: Kim",
    familyNameHint: "Masukkan hanya nama keluarga. Jika anda mempunyai nama dalam fikiran, tuliskan di “Nama calon” atau “Aksara yang mesti disertakan” di bawah.",
    familyNameLooksFullWarning: "Ini kelihatan seperti nama penuh dan bukan nama keluarga kerana ia mempunyai tiga aksara atau lebih. Jika dibiarkan begini, ia akan hanya ditambah di hadapan calon yang disyorkan.",
    nameLengthLabel: "Bilangan suku kata dalam nama",
    nameLength1: "Satu suku kata",
    nameLength2: "Dua suku kata",
    nameLength3: "Tiga suku kata",
    nameLength4: "Empat suku kata",
    currentNameLabel: "Nama Hangul yang sedang anda pertimbangkan",
    currentNamePlaceholder: "Cth: Seoyoon",
    useHanjaLabel: "Gunakan nama Hanja",
    useHanjaYes: "Gunakan",
    useHanjaNo: "Fokus pada nama Hangul",
    desiredNamesLabel: "Nama calon (satu setiap baris, format: “Hangul | Calon Hanja1,Calon Hanja2 | nota”)",
    desiredNamesPlaceholder: "Seoyoon | | rasa lembut dan bijak\nHarin | 荷潾,河璘 | imej jernih dan cerah",
    desiredSyllablesLabel: "Suku kata yang anda ingin gunakan",
    desiredSyllablesPlaceholder: "Cth: Seo, Yoon, Ha",
    requiredSyllablesLabel: "Aksara yang mesti disertakan",
    requiredSyllablesPlaceholder: "Cth: Yoon",
    blockedSyllablesLabel: "Aksara yang ingin dielakkan",
    blockedSyllablesPlaceholder: "Cth: Min, Ji",
    freeDraftHeading: "Cadangan draf percuma",
    freeDraftBadge: "Untuk rujukan sahaja · tidak berkaitan dengan pembayaran",
    freeDraftEmpty: "Kami belum dapat membina calon draf daripada input anda sekarang.",
    freeDraftPoolNote: "Draf ini dipilih daripada senarai nama Inggeris. Buku penamaan yang dijana selepas pembayaran mengikut tradisi penamaan bahasa yang anda guna.",
    step1PrevButton: "Sebelumnya",
    step1NextButton: "Seterusnya · Keutamaan terperinci",
    step2Heading: "Keutamaan terperinci (pilihan)",
    step2Intro: "Anda boleh biarkan ini kosong dan penamaan akan tetap diteruskan. Ketik pilihan di bawah atau tulis sendiri, dan pakar penamaan akan mencerminkannya seadanya.",
    desiredTypeLabel: "Jenis nama yang anda mahu",
    desiredTypePlaceholder: "Cth: Nama yang moden dan lembut",
    desiredTypeAria: "Pilih jenis nama yang dikehendaki",
    preferenceToneLabel: "Suasana/imej nama",
    preferenceTonePlaceholder: "Cth: Moden, jernih, tenang, elegan, seperti cahaya bintang",
    preferenceToneAria: "Pilih suasana nama",
    generationNameRuleLabel: "Aksara nama generasi",
    generationNameRulePlaceholder: "Cth: gunakan 'jun' pada aksara tengah",
    generationNameRuleAria: "Pilih peraturan aksara generasi",
    siblingHarmonyLabel: "Keharmonian dengan nama adik-beradik",
    siblingHarmonyPlaceholder: "Cth: supaya sepadan dengan nama abang Minjun",
    siblingHarmonyAria: "Pilih keharmonian adik-beradik",
    avoidFamilyNamesLabel: "Nama keluarga atau bunyi serupa yang perlu dielakkan",
    avoidFamilyNamesPlaceholder: "Cth: kecualikan bunyi serupa dengan nama nenek",
    avoidFamilyNamesAria: "Pilih syarat yang perlu dielakkan",
    memoLabel: "Permintaan lain",
    memoAria: "Pilih tujuan penamaan",
    memoPlaceholder: "Beritahu kami sama ada nama ini akan digunakan untuk pendaftaran kelahiran sebenar, penukaran nama, atau sebarang suasana tertentu yang anda mahukan.",
    step2PrevButton: "Sebelumnya",
    sidebarHeading: "Mulakan penamaan premium",
    sidebarDescription: "Selepas mengesahkan medan yang diperlukan, kami akan meneruskan dengan pembayaran sekali sebanyak 30,000 KRW, pas, atau batu bulan, mana-mana yang tersedia. Jika anda sudah mempunyai akses melalui pas atau batu bulan, penjanaan bermula serta-merta tanpa tetingkap pembayaran.",
    summaryBirthLabel: "Maklumat kelahiran",
    summaryFamilyLabel: "Nama keluarga · bilangan suku kata",
    summaryPreferenceLabel: "Keutamaan terperinci",
    summaryNotEntered: "Tidak dimasukkan",
    summaryEntered: "Dimasukkan",
    summaryOptional: "Input pilihan",
    summaryTimeUnknownSuffix: " · masa tidak diketahui",
    summaryCharSuffix: " suku kata",
    busyChecking: "Sedang menyemak input dan kriteria Saju anda…",
    busyPayment: "Sedang mengesahkan pas atau pembayaran anda…",
    submitBusy: "Sedang berjalan…",
    submitMissing: (field) => `Sila masukkan ${field} dahulu`,
    submitDefault: "Sahkan pembayaran 30,000 KRW/pas dan mulakan penamaan",
    retryButton: "Cuba lagi",
    footerNote: "Walaupun penjanaan gagal selepas pembayaran, mencuba semula dengan input yang sama tidak memerlukan pembayaran tambahan.",
    generatingSubtitle: "Pakar penamaan mengambil masa kira-kira 1-2 minit untuk mengesahkan carta Saju dan mencipta nama. Anda akan dipindahkan ke skrin buku penamaan sebaik sahaja selesai.",
  },
};

function getNamingCopy(locale: LoadingLocale): NamingCopy {
  return NAMING_COPY[locale] || NAMING_EN;
}

function useNamingLocale(): LoadingLocale {
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
  return locale;
}

function useNamingCopy(): NamingCopy {
  return getNamingCopy(useNamingLocale());
}

function errorMessage(code: string, copy: NamingCopy): string {
  return copy.errorText[code] || copy.errorText.SERVER_ERROR;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function toText(value: unknown) {
  return toDisplayText(value);
}

// 🔴 /generate 는 요청 안에서 LLM 생성을 끝내는 동기 라우트다(worker/routes/naming-prompt.js —
// waitUntil 백그라운드 폴링은 Workers 요청 간 I/O 격리로 결과가 고착돼 의도적으로 배제됐다).
// 서버 예산은 엣지 한계 100초 / LLM 85초인데 authFetch 는 자체 AbortController 로 22초에 끊는다
// (AUTH_FETCH_TIMEOUT_MS). 8,000~14,000자 목표라 생성은 항상 22초를 넘고, 결과는 서버에서
// 정상 저장되는데 클라만 먼저 포기해 "확인 실패 / 네트워크 연결을 확인한 뒤…" 가 떴다.
// authFetch 는 호출부가 signal 을 주면 자기 타임아웃을 걸지 않으므로, 여기서 엣지 한계보다
// 넉넉한 상한을 직접 준다.
const GENERATE_TIMEOUT_MS = 115000;

async function postJson<T = Record<string, unknown>>(
  path: string,
  body: Record<string, unknown>,
  timeoutMs = 0,
) {
  const controller = timeoutMs > 0 && typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? window.setTimeout(() => controller.abort(), timeoutMs) : 0;
  try {
    const response = await authFetch(
      path,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        ...(controller ? { signal: controller.signal } : {}),
      },
      { retryOn401: false },
    );
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data: data as T };
  } catch {
    throw new Error("NETWORK_ERROR");
  } finally {
    if (timer) window.clearTimeout(timer);
  }
}

// 확정 미인증(401/403)이면 유령 로그인(클라 로그인·서버 만료) 상태다 — 공용 핸들러로 세션·쿠키를
// 정리하고 /login으로 유도한다. runBillingCoinGate를 직접 쓰는 이 화면은 useCoinGate의 자동 처리를
// 타지 않으므로 명시적으로 배선한다(전 유료 화면 공통 계약).
function assertAuthorized(status: number): void {
  if (status === 401 || status === 403) {
    handleSessionInvalidated({ redirect: true });
    throw new Error("LOGIN_REQUIRED");
  }
}

// runBillingCoinGate가 반환하는 값(BillingResult<BillingCoinGateData>)에서 실제 결제 증빙을 뽑아낸다.
// worker/routes/billing.js coin-gate 응답에는 TS 타입이 문서화하지 않은 accessGrant/consume/payment/
// paymentId 필드가 함께 실려 오며, worker/routes/naming-prompt.js의 unwrapAccessContext()가 바로 이
// 필드들을 body 최상위 또는 paymentContext 중첩 구조에서 찾는다(app/vedic-ai/VedicAiClient.tsx의
// extractPayment()와 동일한 패턴).
function runtimePayload(result: unknown): Record<string, unknown> {
  const record = asRecord(result);
  const data = asRecord(record.data);
  return Object.keys(data).length ? data : record;
}

// 다른 여섯 유료 화면(ZiweiAi·ZiweiDeepPdf·Island·LoveSecret·Sukuyo·Vedic)과 본문이 같아야 한다.
// 예전에는 여기만 축소형이라 감사할 때마다 "이 한 곳만 왜 다른가"를 다시 추적하게 됐다.
function isPaymentGranted(result: unknown): boolean {
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

// paymentId 에는 실제 단건 결제 식별자(merchantUid/impUid)만 담는다.
// transactionId·purchaseId 를 여기에 섞으면 안 된다 — worker/routes/billing.js의
// successWithPremiumAccess()는 이용권·월정석·코인 성공 응답에도 최상위 transactionId
// (= PointHistory _id 또는 entitlement evidenceId)를 무조건 싣는데, 이걸 paymentId로 보내면
// 워커 verifyNamingAccess()가 단건 분기로 들어가 Payment 문서를 못 찾고 404로 죽는다
// (월정석은 이미 차감된 뒤라 돈만 나간다). 증빙은 accessGrant/consume 쪽으로 그대로 전달되고,
// 워커의 readContextEvidenceId()가 거기서 transactionId·ledgerId를 읽어 간다.
function extractNamingAccess(result: unknown) {
  const payload = runtimePayload(result);
  const payment = asRecord(payload.payment);
  const accessGrant = asRecord(payload.accessGrant);
  const consume = asRecord(payload.consume);
  const paymentId = String(
    payload.paymentId || payment.paymentId || payment.merchantUid || payment.impUid || "",
  ).trim();
  // 접근 방식을 최상위로도 넘긴다 — 워커 readContextAccessType/Method가 body를 1순위로 읽어
  // normalizeExecutionAccessMethod가 "single"로 오폴백하지 않게 한다.
  const accessType = String(
    consume.accessType || accessGrant.accessType || payload.accessType || "",
  ).trim();
  const accessMethod = String(
    consume.accessMethod || consume.paymentMethod
    || accessGrant.accessMethod || accessGrant.paymentMethod || "",
  ).trim();
  return { paymentId, accessType, accessMethod, accessGrant, consume, payment, raw: payload };
}

function parseListText(value: string): string[] {
  return value.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean);
}

function parseDesiredNamesText(value: string) {
  return value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      return {
        hangul: parts[0] || "",
        hanjaCandidates: parts[1] ? parts[1].split(",").map((item) => item.trim()).filter(Boolean) : [],
        note: parts[2] || "",
      };
    })
    .filter((item) => item.hangul);
}

function toRawInput(form: FormState): Record<string, unknown> {
  return {
    gender: form.gender,
    birthDate: form.birthDate,
    birthTime: form.birthTimeUnknown ? "" : form.birthTime,
    birthTimeUnknown: form.birthTimeUnknown,
    calendarType: form.calendarType,
    isLeapMonth: form.isLeapMonth,
    birthPlace: form.birthPlace,
    timezone: form.timezone,
    familyName: form.familyName,
    nameLength: form.nameLength,
    desiredType: form.desiredType,
    currentName: form.currentName,
    desiredSyllables: parseListText(form.desiredSyllablesText),
    requiredSyllables: parseListText(form.requiredSyllablesText),
    blockedSyllables: parseListText(form.blockedSyllablesText),
    desiredNames: parseDesiredNamesText(form.desiredNamesText),
    preferredStyle: form.preferenceTone,
    preferredImage: parseListText(form.preferenceTone),
    useHanja: form.useHanja,
    generationNameRule: form.generationNameRule,
    siblingHarmony: form.siblingHarmony,
    avoidFamilyNames: form.avoidFamilyNames,
    memo: form.memo,
  };
}

function validateRequired(form: FormState, copy: NamingCopy): string[] {
  const missing: string[] = [];
  if (!form.gender) missing.push(copy.fieldNames.gender);
  if (!form.birthDate) missing.push(copy.fieldNames.birthDate);
  if (!form.calendarType) missing.push(copy.fieldNames.calendarType);
  if (!form.familyName.trim()) missing.push(copy.fieldNames.familyName);
  return missing;
}

function makeRequestId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── 네오 정본(달빛 다크) 스코프 클래스 — DESIGN.md 팔레트/Glow-Not-Shadow 준수 ──
const FIELD = "w-full rounded-2xl border border-[#c4b5fd]/20 bg-[#090718]/70 px-4 py-3 text-sm text-[#f4eeff] outline-none transition placeholder:text-[#a294cf] focus:border-[#c4b5fd]/60 focus:shadow-[0_0_0_3px_rgba(196,181,253,0.14)] disabled:opacity-50";
const LABEL = "flex flex-col gap-1.5 text-sm font-semibold text-[#e6ddfa]";
const PANEL = "rounded-[28px] border border-[#c4b5fd]/20 bg-[#13102a]/70";
const VIOLET_GLOW = "shadow-[0_0_0_1px_rgba(167,139,250,0.14),0_0_28px_-10px_rgba(147,51,234,0.4)]";

// 세부 취향 선택 칩 — 자유 입력을 대체하지 않고 위에 얹는다. 고르면 해당 입력칸에 쉼표로 붙고,
// 다시 누르면 빠진다. 분위기 옵션은 초안 추천이 쓰는 STYLE_PRESETS 라벨·무드를 그대로 재사용해
// 사용자가 고른 문구가 초안 랭킹(rankStylePresets)에도 실제로 반영되게 한다.
const TONE_OPTIONS = Array.from(
  new Set(STYLE_PRESETS.flatMap((preset) => [preset.label, ...preset.moods])),
);

function ChipGroup({
  options,
  selected,
  onToggle,
  disabled,
  label,
}: {
  options: string[];
  selected: string;
  onToggle: (token: string) => void;
  disabled: boolean;
  label: string;
}) {
  const chosen = new Set(selected.split(",").map((item) => item.trim()).filter(Boolean));
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {options.map((option) => {
        const active = chosen.has(option);
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(option)}
            disabled={disabled}
            className={`min-h-9 rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
              active
                ? "border-[#e8d5a3]/70 bg-[#e8d5a3]/20 text-[#f7efdc]"
                : "border-[#e8d5a3]/25 bg-[#e8d5a3]/[0.06] text-[#f2e9d3] hover:border-[#e8d5a3]/55"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

const PHASE_PROGRESS: Record<Phase, number> = {
  idle: 0,
  checking: 18,
  payment: 38,
  verifying: 58,
  generating: 92,
  error: 0,
};

export default function NamingAiClient() {
  const locale = useNamingLocale();
  const copy = getNamingCopy(locale);
  const { seed, reload } = useAiProfileSeed();
  const [form, setForm] = useState<FormState>(() => ({ ...INITIAL_FORM, birthPlace: copy.defaultBirthPlace }));
  const defaultBirthPlaceRef = useRef(form.birthPlace);
  const [phase, setPhase] = useState<Phase>("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const [recommendation, setRecommendation] = useState<{ candidates: DraftNameCandidate[]; moods: string[]; status: string } | null>(null);
  const [sajuHints, setSajuHints] = useState<NamingSajuHints | null>(null);

  const retryRef = useRef<{
    input: Record<string, unknown>;
    inputHash: string;
    access: ReturnType<typeof extractNamingAccess>;
  } | null>(null);

  const updateForm = useCallback((patch: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  // 프로필 카드 자동채움 — 비어 있는 필드만 채운다.
  useEffect(() => {
    if (!seed) return;
    setForm((prev) => ({
      ...prev,
      gender: prev.gender || (seed.gender === "male" ? "M" : seed.gender === "female" ? "F" : prev.gender),
      birthDate: prev.birthDate || seed.birthDate || prev.birthDate,
      birthTime: prev.birthTime || seed.birthTime || prev.birthTime,
      birthTimeUnknown: prev.birthDate ? prev.birthTimeUnknown : Boolean(seed.birthTimeUnknown ?? prev.birthTimeUnknown),
      calendarType: prev.birthDate ? prev.calendarType : (seed.calendarType || prev.calendarType),
      birthPlace: prev.birthPlace !== defaultBirthPlaceRef.current ? prev.birthPlace : (seed.region || seed.city || prev.birthPlace),
      timezone: prev.timezone !== INITIAL_FORM.timezone ? prev.timezone : (seed.timezone || prev.timezone),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  // 무료 초안 추천 — 성씨 입력 시 디바운스로 갱신(결제와 무관, 참고용).
  useEffect(() => {
    if (!form.familyName.trim()) {
      setRecommendation(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const recInput: NamingRecommendationInput = {
        familyName: form.familyName.trim(),
        nameLength: form.nameLength,
        desiredType: form.desiredType,
        preferenceTone: form.preferenceTone,
        currentName: form.currentName,
        desiredSyllables: parseListText(form.desiredSyllablesText),
        requiredSyllables: parseListText(form.requiredSyllablesText),
        blockedSyllables: parseListText(form.blockedSyllablesText),
        desiredNames: parseDesiredNamesText(form.desiredNamesText),
        birthDate: form.birthDate,
        gender: form.gender,
      };
      if (cancelled) return;
      // 사주 힌트는 별도 useEffect가 비동기로 채운다(무거운 만세력 모듈을 dynamic import 하기 때문).
      // 아직 안 왔으면 null로 먼저 그리고, 도착하면 이 effect가 다시 돌아 오행 축이 반영된다.
      // 🔴 locale 은 화면 표시 전용이다 — 여기서 나온 것은 서버로 가지 않으므로 inputHash 와 무관하다.
      //    비-ko 로케일은 한글 조합 대신 그 문화권의 실재 이름 목록에서 고른다(namingNamePools.ts).
      setRecommendation(buildRecommendationBundle(recInput, sajuHints, locale));
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, sajuHints, form.familyName, form.nameLength, form.desiredType, form.preferenceTone, form.currentName, form.desiredSyllablesText, form.requiredSyllablesText, form.blockedSyllablesText, form.desiredNamesText, form.birthDate, form.gender]);

  // 무료 초안용 용신 계산 — 생년월일이 채워진 뒤에만 만세력 모듈을 dynamic import 한다.
  // 유료 프롬프트(worker/routes/naming-prompt.js)와 같은 모듈을 쓰므로 무료 초안과 결과의 오행 축이 같다.
  // 결과는 화면 표시 전용이며 서버로 보내지 않는다 — 서버는 자체 계산으로 접근권·프롬프트를 만든다.
  useEffect(() => {
    const [year, month, day] = form.birthDate.split("-").map((part) => Number(part));
    if (!year || !month || !day) {
      setSajuHints(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const [{ buildSajuProfile }, { resolveNamingYongshin }] = await Promise.all([
            import("@/worker/lib/destiny-bias-engine.js"),
            import("@/worker/lib/saju-yongshin-policy.js"),
          ]);
          if (cancelled) return;
          const [hour, minute] = form.birthTimeUnknown || !form.birthTime
            ? [12, 0]
            : form.birthTime.split(":").map((part) => Number(part) || 0);
          const profile = buildSajuProfile({
            name: form.familyName || "사용자",
            gender: form.gender,
            timezone: form.timezone,
            birthPlace: form.birthPlace,
            hourPillarTimePolicy: "LOCAL_MEAN_TIME",
            dayChangePolicy: "MIDNIGHT",
            birth: {
              year,
              month,
              day,
              hour,
              minute,
              calendarType: form.isLeapMonth ? "lunar_leap" : form.calendarType,
              timezone: form.timezone,
              birthPlace: form.birthPlace,
              unknownTime: form.birthTimeUnknown,
            },
          });
          if (cancelled) return;
          setSajuHints(resolveNamingYongshin(profile) as NamingSajuHints);
        } catch {
          // 만세력 계산이 실패해도 초안은 계속 나와야 한다 — 오행 축 없이 성별·분위기 기준으로 폴백.
          if (!cancelled) setSajuHints(null);
        }
      })();
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [form.birthDate, form.birthTime, form.birthTimeUnknown, form.calendarType, form.isLeapMonth, form.gender, form.timezone, form.birthPlace, form.familyName]);

  const missing = useMemo(() => validateRequired(form, copy), [form, copy]);
  // 복성(남궁·황보)은 2음절이라 통과한다. 3음절 이상이면 이름 전체를 성씨 칸에 적은 것으로 본다.
  const familyNameLooksLikeFullName = useMemo(
    () => (form.familyName.match(/[가-힣]/g) || []).length >= 3,
    [form.familyName],
  );
  const stepDone = [
    Boolean(form.gender && form.birthDate && form.calendarType),
    Boolean(form.familyName.trim()),
    Boolean(form.desiredType || form.preferenceTone || form.generationNameRule || form.siblingHarmony || form.avoidFamilyNames || form.memo),
  ];

  function applyCandidate(candidate: DraftNameCandidate) {
    setForm((prev) => ({
      ...prev,
      desiredNamesText: prev.desiredNamesText
        ? `${prev.desiredNamesText}\n${candidate.name}`
        : candidate.name,
    }));
  }

  // 쉼표로 이어진 자유 입력칸에 선택 칩을 넣고 뺀다. maxLength를 넘으면 추가하지 않는다.
  type TokenField = "desiredType" | "preferenceTone" | "generationNameRule" | "siblingHarmony" | "avoidFamilyNames" | "memo";
  function toggleToken(field: TokenField, token: string, maxLength: number) {
    setForm((prev) => {
      const tokens = String(prev[field] || "").split(",").map((item) => item.trim()).filter(Boolean);
      const index = tokens.indexOf(token);
      const next = index >= 0 ? tokens.filter((_, i) => i !== index) : tokens.concat(token);
      const value = next.join(", ");
      if (index < 0 && value.length > maxLength) return prev;
      return { ...prev, [field]: value };
    });
  }

  function applyMood(mood: string) {
    setForm((prev) => ({
      ...prev,
      preferenceTone: prev.preferenceTone
        ? (prev.preferenceTone.includes(mood) ? prev.preferenceTone : `${prev.preferenceTone}, ${mood}`)
        : mood,
    }));
  }

  async function runVerifyAndGenerate(args: {
    input: Record<string, unknown>;
    inputHash: string;
    access: ReturnType<typeof extractNamingAccess>;
  }) {
    const { input, inputHash, access } = args;
    setPhase("generating");
    // /generate가 이용권/결제 접근권을 직접 검증하므로 별도 verify-payment 선검사는 두지 않는다
    // (이용권 중복 검사 제거 — 서버 검사 1회). 생성은 그 요청 안에서 동기로 끝나고 201로 결과가 온다.
    // 네트워크가 끊겨도 서버 쪽 생성은 대개 완주해 실행 레코드가 남는다 — 같은 입력·같은 증거로 한 번
    // 더 부르면 beginNamingGeneration이 그 레코드를 그대로 돌려주므로(추가 차감 없음) 1회 재시도한다.
    const generateOnce = () => postJson<{
      ok: boolean;
      code?: string;
      reason?: string;
      message?: string;
      executionId?: string;
      result?: { id: string };
    }>("/api/naming-prompt/generate", {
      // 🔴 locale 은 input 밖에 둔다 — input 은 통째로 inputHash 가 되므로, 안에 넣으면
      //    배포 전 결제·배포 후 생성 사용자가 해시 불일치로 막히고, 언어만 바꿔 재요청할 때
      //    같은 리딩에 30,000원이 다시 청구된다. 작명 문화 분기는 프롬프트에서만 쓴다.
      locale: getCurrentLoadingLocale(),
      paymentId: access.paymentId,
      accessType: access.accessType,
      accessMethod: access.accessMethod,
      inputHash,
      input,
      paymentContext: access.raw,
      accessGrant: access.accessGrant,
      consume: access.consume,
      payment: access.payment,
    }, GENERATE_TIMEOUT_MS);

    let genRes;
    try {
      genRes = await generateOnce();
    } catch (caught) {
      if ((caught instanceof Error ? caught.message : "") !== "NETWORK_ERROR") throw caught;
      genRes = await generateOnce();
    }

    assertAuthorized(genRes.status);
    if (genRes.status === 402) throw new Error("PAYMENT_FAILED");
    if (genRes.status === 503 || genRes.data?.reason === "LLM_ERROR") {
      throw new Error("LLM_ERROR");
    }
    const executionId = genRes.data?.result?.id || genRes.data?.executionId;
    if (!genRes.data?.ok || !executionId) {
      throw new Error(String(genRes.data?.code || "GENERATE_FAILED"));
    }
    // 백그라운드 생성이 실패하면 실패 표면이 결과 페이지로 넘어간다 — 결과 페이지가 추가 차감 없이
    // 재생성(= /generate 재호출)할 수 있도록 재시도 페이로드를 executionId 키로 넘긴다.
    stashNamingRetryPayload(executionId, { input, inputHash, access });
    retryRef.current = null;
    window.location.assign(`/naming-ai/result?executionId=${encodeURIComponent(executionId)}`);
  }

  async function handleRetry() {
    if (busy) return;
    const pending = retryRef.current;
    if (!pending) {
      await handleSubmit();
      return;
    }
    setBusy(true);
    setError("");
    try {
      await runVerifyAndGenerate(pending);
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "SERVER_ERROR";
      setError(errorMessage(code, copy));
      setPhase("error");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit() {
    if (busy) return;
    if (missing.length) {
      setError(copy.missingFieldsMessage(missing));
      setStep(missing.includes(copy.fieldNames.familyName) && !missing.includes(copy.fieldNames.gender) && !missing.includes(copy.fieldNames.birthDate) ? 1 : 0);
      return;
    }
    setBusy(true);
    setError("");
    let gateStarted = false;
    const requestId = makeRequestId("naming-prompt");

    try {
      setPhase("checking");
      const input = toRawInput(form);

      // sajuEvidence는 보내지 않는다 — 서버(handleCheckout/handleGenerate)가
      // 자체 계산 폴백(buildFallbackSajuContext)으로 사주를 직접 산출한다.
      const checkoutRes = await postJson<{
        ok: boolean;
        code?: string;
        inputHash: string;
        checkoutPayload?: Record<string, unknown>;
      }>("/api/naming-prompt/checkout", { input });
      assertAuthorized(checkoutRes.status);
      if (!checkoutRes.data?.ok) throw new Error(String(checkoutRes.data?.code || "CHECKOUT_FAILED"));

      const { inputHash, checkoutPayload } = checkoutRes.data;

      setPhase("payment");
      beginPaidFeatureGateCheck({
        featureKey: FEATURE_KEY,
        requestId,
        title: copy.gateCheckingTitle,
        reason: copy.reason,
        paymentMode: "MEMBERSHIP_PASS",
      });
      gateStarted = true;

      const gate = await runBillingCoinGate({
        featureKey: FEATURE_KEY,
        subFeatureKey: FEATURE_KEY,
        productId: "naming-prompt",
        serviceType: "naming_prompt",
        reason: copy.reason,
        requestId,
        idempotencyKey: requestId,
        cost: COIN_PRICE,
        coinPrice: COIN_PRICE,
        amountKRW: AMOUNT_KRW,
        membershipCreditCost: MEMBERSHIP_CREDIT_COST,
        reportId: inputHash,
        contentKey: inputHash,
        sessionId: String(checkoutPayload?.sessionId || requestId),
      });

      if (!isPaymentGranted(gate)) {
        const code = String(gate.error?.code || "").toUpperCase();
        const cancelled = code === "PAYMENT_CANCELLED";
        throw new Error(cancelled ? "PAYMENT_CANCELLED" : "PAYMENT_FAILED");
      }
      completePaidFeatureGateCheck({
        featureKey: FEATURE_KEY,
        requestId,
        title: copy.gateCheckedTitle,
        reason: copy.reason,
        paymentMode: "MEMBERSHIP_PASS",
      });

      const access = extractNamingAccess(gate);
      retryRef.current = { input, inputHash, access };
      await runVerifyAndGenerate({ input, inputHash, access });
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "SERVER_ERROR";
      setError(errorMessage(code, copy));
      setPhase("error");
      if (gateStarted) {
        failPaidFeatureGateCheck({
          featureKey: FEATURE_KEY,
          requestId,
          reason: copy.reason,
          paymentMode: "MEMBERSHIP_PASS",
          message: errorMessage(code, copy),
          cancelled: code === "PAYMENT_CANCELLED",
        });
      }
    } finally {
      setBusy(false);
    }
  }

  const showGeneratingCard = busy && (phase === "verifying" || phase === "generating");

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0818] px-4 py-9 text-[#f4eeff] [font-family:var(--font-body)] sm:py-12">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(178deg,#0a0818_0%,#13102a_46%,#090718_100%)]" aria-hidden="true" />
      <div
        className="pointer-events-none fixed inset-0 opacity-70 [background:radial-gradient(620px_380px_at_14%_-6%,rgba(167,139,250,0.17),transparent_70%),radial-gradient(520px_340px_at_88%_4%,rgba(232,213,163,0.1),transparent_70%)]"
        aria-hidden="true"
      />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-7">
        {/* 히어로 */}
        <header className={`${PANEL} relative overflow-hidden p-7 sm:p-10`}>
          <span
            className="pointer-events-none absolute -right-3 -top-9 select-none text-[8.5rem] font-black leading-none text-[#c4b5fd]/[0.07] [font-family:var(--font-display)] sm:text-[11rem]"
            aria-hidden="true"
          >
            名
          </span>
          <span className="inline-flex w-max items-center gap-2 rounded-full border border-[#c4b5fd]/30 bg-[#c4b5fd]/10 px-3.5 py-1.5 text-xs font-bold text-[#dcd2fb]">
            {copy.heroBadge}
          </span>
          <h1 className="mt-4 text-3xl font-black leading-tight text-[#f4eeff] [font-family:var(--font-display)] [text-wrap:balance] sm:text-5xl">
            {copy.heroTitle}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#c8aaff]/85 sm:text-base">
            {copy.heroDescription}
          </p>
          <ul className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-[#e6ddfa]">
            {copy.heroPills.map((pill) => (
              <li key={pill} className="rounded-full border border-[#c4b5fd]/20 bg-[#0a0818]/50 px-3 py-1.5">{pill}</li>
            ))}
          </ul>
          <div className="mt-4">
            <PriceBadge featureKey={FEATURE_KEY} />
          </div>
        </header>

        {showGeneratingCard ? (
          <NamingGeneratingCard phase={phase} />
        ) : (
          <form
            className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr]"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit();
            }}
          >
            <div className="flex flex-col gap-5">
              {/* 준비 단계 칩 — 실제 순서가 있는 흐름이라 번호를 쓴다 */}
              <nav aria-label={copy.stepsAriaLabel} className="flex flex-wrap gap-2">
                {copy.stepLabels.map((label, index) => {
                  const active = step === index;
                  const done = stepDone[index] && !active;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setStep(index)}
                      aria-current={active ? "step" : undefined}
                      className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-bold transition ${
                        active
                          ? "border-[#c4b5fd]/60 bg-[#c4b5fd]/15 text-[#f4eeff]"
                          : done
                            ? "border-[#e8d5a3]/35 bg-[#e8d5a3]/[0.07] text-[#f2e9d3]"
                            : "border-[#c4b5fd]/15 bg-[#13102a]/50 text-[#c8aaff]/75 hover:border-[#c4b5fd]/40"
                      }`}
                    >
                      <span
                        className={`grid h-5 w-5 place-items-center rounded-full text-[11px] font-black ${
                          done ? "bg-[#e8d5a3] text-[#0a0818]" : active ? "bg-[#c4b5fd] text-[#0a0818]" : "bg-[#c4b5fd]/20 text-[#dcd2fb]"
                        }`}
                        aria-hidden="true"
                      >
                        {done ? "✓" : index + 1}
                      </span>
                      {label}
                    </button>
                  );
                })}
              </nav>

              {step === 0 && (
                <section className={`${PANEL} p-6 sm:p-7`}>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
                    <h2 className="text-lg font-black text-[#f4eeff] [font-family:var(--font-display)]">{copy.step0Heading}</h2>
                    <button
                      type="button"
                      onClick={() => void reload()}
                      className="rounded-full border border-[#c4b5fd]/30 bg-[#c4b5fd]/10 px-3.5 py-1.5 text-xs font-bold text-[#dcd2fb] transition hover:border-[#c4b5fd]/60 hover:bg-[#c4b5fd]/20"
                      aria-label={copy.reloadButtonAria}
                    >
                      {copy.reloadButton}
                    </button>
                  </div>
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <label className={LABEL}>
                      {copy.genderLabel}
                      <select
                        value={form.gender}
                        onChange={(event) => updateForm({ gender: event.target.value as GenderValue })}
                        disabled={busy}
                        className={FIELD}
                      >
                        <option value="">{copy.genderSelect}</option>
                        <option value="F">{copy.genderFemale}</option>
                        <option value="M">{copy.genderMale}</option>
                        <option value="OTHER">{copy.genderOther}</option>
                      </select>
                    </label>
                    <label className={LABEL}>
                      {copy.birthDateLabel}
                      <input {...birthDateTextInputProps(form.birthDate, (nextBirthDate) => updateForm({ birthDate: nextBirthDate }))} disabled={busy} className={FIELD} />
                    </label>
                    <label className={LABEL}>
                      {copy.birthTimeLabel}
                      <input
                        type="time"
                        value={form.birthTime}
                        onChange={(event) => updateForm({ birthTime: event.target.value })}
                        disabled={busy || form.birthTimeUnknown}
                        className={FIELD}
                      />
                    </label>
                    <label className={LABEL}>
                      {copy.calendarLabel}
                      <select
                        value={form.calendarType}
                        onChange={(event) => updateForm({ calendarType: event.target.value as CalendarValue })}
                        disabled={busy}
                        className={FIELD}
                      >
                        <option value="solar">{copy.calendarSolar}</option>
                        <option value="lunar">{copy.calendarLunar}</option>
                      </select>
                    </label>
                    <label className={LABEL}>
                      {copy.birthPlaceLabel}
                      <input
                        type="text"
                        value={form.birthPlace}
                        maxLength={80}
                        onChange={(event) => updateForm({ birthPlace: event.target.value })}
                        disabled={busy}
                        className={FIELD}
                      />
                    </label>
                    <label className={LABEL}>
                      {copy.timezoneLabel}
                      <input
                        type="text"
                        value={form.timezone}
                        maxLength={80}
                        onChange={(event) => updateForm({ timezone: event.target.value })}
                        disabled={busy}
                        className={FIELD}
                      />
                    </label>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-5 text-sm text-[#e6ddfa]">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.birthTimeUnknown}
                        onChange={(event) => updateForm({ birthTimeUnknown: event.target.checked, birthTime: event.target.checked ? "" : form.birthTime })}
                        disabled={busy}
                        className="h-4 w-4 accent-[#c4b5fd]"
                      />
                      {copy.birthTimeUnknownCheckbox}
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.isLeapMonth}
                        onChange={(event) => updateForm({ isLeapMonth: event.target.checked })}
                        disabled={busy}
                        className="h-4 w-4 accent-[#c4b5fd]"
                      />
                      {copy.leapMonthCheckbox}
                    </label>
                  </div>
                  <div className="mt-5 flex justify-end">
                    <StepMoveButton onClick={() => setStep(1)} label={copy.step0NextButton} />
                  </div>
                </section>
              )}

              {step === 1 && (
                <section className={`${PANEL} p-6 sm:p-7`}>
                  <h2 className="text-lg font-black text-[#f4eeff] [font-family:var(--font-display)]">{copy.step1Heading}</h2>
                  <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
                    <label className={LABEL}>
                      {copy.familyNameLabel}
                      <input
                        type="text"
                        value={form.familyName}
                        maxLength={10}
                        placeholder={copy.familyNamePlaceholder}
                        onChange={(event) => updateForm({ familyName: event.target.value })}
                        disabled={busy}
                        className={FIELD}
                      />
                      <span className="text-xs font-normal text-[#c8aaff]/70">
                        {copy.familyNameHint}
                      </span>
                      {familyNameLooksLikeFullName && (
                        <span className="text-xs font-semibold text-[#e8d5a3]">
                          {copy.familyNameLooksFullWarning}
                        </span>
                      )}
                    </label>
                    <label className={LABEL}>
                      {copy.nameLengthLabel}
                      <select
                        value={form.nameLength}
                        onChange={(event) => updateForm({ nameLength: Number(event.target.value) })}
                        disabled={busy}
                        className={FIELD}
                      >
                        <option value={2}>{copy.nameLength2}</option>
                        <option value={1}>{copy.nameLength1}</option>
                        <option value={3}>{copy.nameLength3}</option>
                        <option value={4}>{copy.nameLength4}</option>
                      </select>
                    </label>
                    <label className={LABEL}>
                      {copy.currentNameLabel}
                      <input
                        type="text"
                        value={form.currentName}
                        maxLength={40}
                        placeholder={copy.currentNamePlaceholder}
                        onChange={(event) => updateForm({ currentName: event.target.value })}
                        disabled={busy}
                        className={FIELD}
                      />
                    </label>
                    <label className={LABEL}>
                      {copy.useHanjaLabel}
                      <select
                        value={form.useHanja ? "true" : "false"}
                        onChange={(event) => updateForm({ useHanja: event.target.value === "true" })}
                        disabled={busy}
                        className={FIELD}
                      >
                        <option value="true">{copy.useHanjaYes}</option>
                        <option value="false">{copy.useHanjaNo}</option>
                      </select>
                    </label>
                  </div>
                  <label className={`${LABEL} mt-3.5`}>
                    {copy.desiredNamesLabel}
                    <textarea
                      value={form.desiredNamesText}
                      rows={4}
                      placeholder={copy.desiredNamesPlaceholder}
                      onChange={(event) => updateForm({ desiredNamesText: event.target.value })}
                      disabled={busy}
                      className={FIELD}
                    />
                  </label>
                  <div className="mt-3.5 grid gap-3.5 sm:grid-cols-3">
                    <label className={LABEL}>
                      {copy.desiredSyllablesLabel}
                      <input
                        type="text"
                        value={form.desiredSyllablesText}
                        maxLength={120}
                        placeholder={copy.desiredSyllablesPlaceholder}
                        onChange={(event) => updateForm({ desiredSyllablesText: event.target.value })}
                        disabled={busy}
                        className={FIELD}
                      />
                    </label>
                    <label className={LABEL}>
                      {copy.requiredSyllablesLabel}
                      <input
                        type="text"
                        value={form.requiredSyllablesText}
                        maxLength={120}
                        placeholder={copy.requiredSyllablesPlaceholder}
                        onChange={(event) => updateForm({ requiredSyllablesText: event.target.value })}
                        disabled={busy}
                        className={FIELD}
                      />
                    </label>
                    <label className={LABEL}>
                      {copy.blockedSyllablesLabel}
                      <input
                        type="text"
                        value={form.blockedSyllablesText}
                        maxLength={120}
                        placeholder={copy.blockedSyllablesPlaceholder}
                        onChange={(event) => updateForm({ blockedSyllablesText: event.target.value })}
                        disabled={busy}
                        className={FIELD}
                      />
                    </label>
                  </div>

                  {recommendation && (
                    <div className="mt-5 rounded-3xl border border-[#c4b5fd]/15 bg-[#0a0818]/50 p-5">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="text-base font-black text-[#f4eeff] [font-family:var(--font-display)]">{copy.freeDraftHeading}</h3>
                        <span className="text-xs font-semibold text-[#e8d5a3]">{copy.freeDraftBadge}</span>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-[#c8aaff]/75">{recommendation.status}</p>
                      {/* ja·zh-CN·zh-TW·en 은 자기 문화권의 실재 이름 목록에서 고르므로 고지가 비어 있다.
                          라틴 풀로 폴백하는 일곱 로케일만, 유료 작명첩과 초안의 출처가 다름을 밝힌다. */}
                      {copy.freeDraftPoolNote ? (
                        <p className="mt-1.5 text-xs leading-relaxed text-[#e8d5a3]/80">{copy.freeDraftPoolNote}</p>
                      ) : null}
                      <div className="mt-3.5 grid gap-2 sm:grid-cols-2">
                        {recommendation.candidates.length ? recommendation.candidates.map((item) => (
                          <button
                            key={item.name}
                            type="button"
                            onClick={() => applyCandidate(item)}
                            className="rounded-2xl border border-[#c4b5fd]/20 bg-[#13102a]/70 p-3.5 text-left transition hover:border-[#c4b5fd]/55 hover:shadow-[0_0_20px_-8px_rgba(147,51,234,0.4)]"
                          >
                            <span className="block text-sm font-black text-[#f4eeff]">{item.fullName}</span>
                            <span className="mt-0.5 block text-xs text-[#c8aaff]/75">{item.note}</span>
                          </button>
                        )) : (
                          <p className="rounded-2xl border border-dashed border-[#c4b5fd]/25 p-3.5 text-xs text-[#c8aaff]/70 sm:col-span-2">
                            {copy.freeDraftEmpty}
                          </p>
                        )}
                      </div>
                      {recommendation.moods.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {recommendation.moods.map((mood) => (
                            <button
                              key={mood}
                              type="button"
                              onClick={() => applyMood(mood)}
                              className="rounded-full border border-[#e8d5a3]/25 bg-[#e8d5a3]/[0.06] px-3 py-1.5 text-xs font-semibold text-[#f2e9d3] transition hover:border-[#e8d5a3]/55"
                            >
                              {mood}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-5 flex justify-between gap-3">
                    <StepMoveButton onClick={() => setStep(0)} label={copy.step1PrevButton} subtle />
                    <StepMoveButton onClick={() => setStep(2)} label={copy.step1NextButton} />
                  </div>
                </section>
              )}

              {step === 2 && (
                <section className={`${PANEL} p-6 sm:p-7`}>
                  <h2 className="text-lg font-black text-[#f4eeff] [font-family:var(--font-display)]">{copy.step2Heading}</h2>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#c8aaff]/75">
                    {copy.step2Intro}
                  </p>
                  <div className="mt-4 grid gap-3.5">
                    <label className={LABEL}>
                      {copy.desiredTypeLabel}
                      <input
                        type="text"
                        value={form.desiredType}
                        maxLength={120}
                        placeholder={copy.desiredTypePlaceholder}
                        onChange={(event) => updateForm({ desiredType: event.target.value })}
                        disabled={busy}
                        className={FIELD}
                      />
                      <ChipGroup
                        options={copy.nameTypeOptions}
                        selected={form.desiredType}
                        onToggle={(token) => toggleToken("desiredType", token, 120)}
                        disabled={busy}
                        label={copy.desiredTypeAria}
                      />
                    </label>
                    <label className={LABEL}>
                      {copy.preferenceToneLabel}
                      <input
                        type="text"
                        value={form.preferenceTone}
                        maxLength={240}
                        placeholder={copy.preferenceTonePlaceholder}
                        onChange={(event) => updateForm({ preferenceTone: event.target.value })}
                        disabled={busy}
                        className={FIELD}
                      />
                      <ChipGroup
                        options={TONE_OPTIONS}
                        selected={form.preferenceTone}
                        onToggle={(token) => toggleToken("preferenceTone", token, 240)}
                        disabled={busy}
                        label={copy.preferenceToneAria}
                      />
                    </label>
                    <div className="grid gap-3.5 sm:grid-cols-2">
                      <label className={LABEL}>
                        {copy.generationNameRuleLabel}
                        <input
                          type="text"
                          value={form.generationNameRule}
                          maxLength={200}
                          placeholder={copy.generationNameRulePlaceholder}
                          onChange={(event) => updateForm({ generationNameRule: event.target.value })}
                          disabled={busy}
                          className={FIELD}
                        />
                        <ChipGroup
                          options={copy.generationRuleOptions}
                          selected={form.generationNameRule}
                          onToggle={(token) => toggleToken("generationNameRule", token, 200)}
                          disabled={busy}
                          label={copy.generationNameRuleAria}
                        />
                      </label>
                      <label className={LABEL}>
                        {copy.siblingHarmonyLabel}
                        <input
                          type="text"
                          value={form.siblingHarmony}
                          maxLength={200}
                          placeholder={copy.siblingHarmonyPlaceholder}
                          onChange={(event) => updateForm({ siblingHarmony: event.target.value })}
                          disabled={busy}
                          className={FIELD}
                        />
                        <ChipGroup
                          options={copy.siblingOptions}
                          selected={form.siblingHarmony}
                          onToggle={(token) => toggleToken("siblingHarmony", token, 200)}
                          disabled={busy}
                          label={copy.siblingHarmonyAria}
                        />
                      </label>
                    </div>
                    <label className={LABEL}>
                      {copy.avoidFamilyNamesLabel}
                      <input
                        type="text"
                        value={form.avoidFamilyNames}
                        maxLength={240}
                        placeholder={copy.avoidFamilyNamesPlaceholder}
                        onChange={(event) => updateForm({ avoidFamilyNames: event.target.value })}
                        disabled={busy}
                        className={FIELD}
                      />
                      <ChipGroup
                        options={copy.avoidOptions}
                        selected={form.avoidFamilyNames}
                        onToggle={(token) => toggleToken("avoidFamilyNames", token, 240)}
                        disabled={busy}
                        label={copy.avoidFamilyNamesAria}
                      />
                    </label>
                    <label className={LABEL}>
                      {copy.memoLabel}
                      <ChipGroup
                        options={copy.purposeOptions}
                        selected={form.memo}
                        onToggle={(token) => toggleToken("memo", token, 1500)}
                        disabled={busy}
                        label={copy.memoAria}
                      />
                      <textarea
                        value={form.memo}
                        rows={3}
                        placeholder={copy.memoPlaceholder}
                        onChange={(event) => updateForm({ memo: event.target.value })}
                        disabled={busy}
                        className={FIELD}
                      />
                    </label>
                  </div>
                  <div className="mt-5 flex justify-start">
                    <StepMoveButton onClick={() => setStep(1)} label={copy.step2PrevButton} subtle />
                  </div>
                </section>
              )}
            </div>

            <aside className={`${PANEL} flex h-max flex-col gap-4 p-6 sm:p-7 lg:sticky lg:top-6`}>
              <div>
                <h2 className="text-lg font-black text-[#f4eeff] [font-family:var(--font-display)]">{copy.sidebarHeading}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-[#c8aaff]/85">
                  {copy.sidebarDescription}
                </p>
              </div>

              <dl className="grid gap-1.5 rounded-3xl border border-[#c4b5fd]/15 bg-[#0a0818]/50 p-4 text-sm">
                <SummaryRow label={copy.summaryBirthLabel} value={form.birthDate ? `${form.birthDate} · ${form.calendarType === "lunar" ? copy.calendarLunar : copy.calendarSolar}${form.birthTimeUnknown ? copy.summaryTimeUnknownSuffix : form.birthTime ? ` · ${form.birthTime}` : ""}` : copy.summaryNotEntered} done={stepDone[0]} />
                <SummaryRow label={copy.summaryFamilyLabel} value={form.familyName.trim() ? `${form.familyName.trim()} · ${form.nameLength}${copy.summaryCharSuffix}` : copy.summaryNotEntered} done={stepDone[1]} />
                <SummaryRow label={copy.summaryPreferenceLabel} value={stepDone[2] ? copy.summaryEntered : copy.summaryOptional} done={stepDone[2]} optional />
              </dl>

              {busy && (
                <p className="rounded-2xl border border-[#c4b5fd]/25 bg-[#c4b5fd]/[0.07] px-4 py-3 text-sm font-semibold text-[#e6ddfa]" aria-live="polite">
                  {phase === "checking" ? copy.busyChecking : copy.busyPayment}
                </p>
              )}

              {error && (
                <p role="alert" className="rounded-2xl border border-rose-300/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-100">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy || missing.length > 0}
                className={`min-h-12 rounded-full bg-[linear-gradient(135deg,#c4b5fd,#e8d5a3)] px-5 text-sm font-black text-[#0a0818] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 ${VIOLET_GLOW}`}
              >
                {busy
                  ? copy.submitBusy
                  : missing.length
                    ? copy.submitMissing(missing[0])
                    : copy.submitDefault}
              </button>

              {phase === "error" && !busy && (
                <button
                  type="button"
                  onClick={() => void handleRetry()}
                  className="min-h-11 rounded-full border border-[#c4b5fd]/35 bg-[#c4b5fd]/10 px-5 text-sm font-bold text-[#e6ddfa] transition hover:bg-[#c4b5fd]/20"
                >
                  {copy.retryButton}
                </button>
              )}

              <p className="text-xs leading-relaxed text-[#c8aaff]/65">
                {copy.footerNote}
              </p>
            </aside>
          </form>
        )}
      </div>
    </main>
  );
}

function StepMoveButton({ onClick, label, subtle = false }: { onClick: () => void; label: string; subtle?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-11 items-center rounded-full px-5 text-sm font-bold transition ${
        subtle
          ? "border border-[#c4b5fd]/20 bg-transparent text-[#c8aaff]/85 hover:border-[#c4b5fd]/45 hover:text-[#f4eeff]"
          : "border border-[#c4b5fd]/40 bg-[#c4b5fd]/12 text-[#f4eeff] hover:bg-[#c4b5fd]/22"
      }`}
    >
      {label}
    </button>
  );
}

function SummaryRow({ label, value, done, optional = false }: { label: string; value: string; done: boolean; optional?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-[#c8aaff]/70">
        <span className={`h-1.5 w-1.5 rounded-full ${done ? "bg-[#e8d5a3]" : optional ? "bg-[#c4b5fd]/25" : "bg-[#c4b5fd]/45"}`} aria-hidden="true" />
        {label}
      </dt>
      <dd className="truncate text-right text-sm font-semibold text-[#e6ddfa]">{value}</dd>
    </div>
  );
}

function NamingGeneratingCard({ phase }: { phase: Phase }) {
  const copy = useNamingCopy();
  const [tick, setTick] = useState(0);
  const [progress, setProgress] = useState(PHASE_PROGRESS.checking);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 2200);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const target = PHASE_PROGRESS[phase] || 90;
    const timer = window.setInterval(() => {
      setProgress((value) => (value < target ? Math.min(target, value + 2) : value));
    }, 700);
    return () => window.clearInterval(timer);
  }, [phase]);

  const activeStep = phase === "verifying" ? 1 : 2 + (tick % 2);

  return (
    <section className={`${PANEL} p-7 sm:p-10`} aria-live="polite">
      <h2 className="text-xl font-black text-[#f4eeff] [font-family:var(--font-display)] sm:text-2xl">
        {copy.generatingSteps[Math.min(activeStep, copy.generatingSteps.length - 1)]}…
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-7 text-[#c8aaff]/80">
        {copy.generatingSubtitle}
      </p>
      <div className="mt-6 h-2 overflow-hidden rounded-full bg-[#c4b5fd]/12" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#a78bfa,#c4b5fd,#e8d5a3)] transition-[width] duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <ol className="mt-6 grid gap-2 text-sm">
        {copy.generatingSteps.map((stepLabel, index) => {
          const stepState = index < activeStep ? "done" : index === activeStep ? "active" : "todo";
          return (
            <li
              key={stepLabel}
              className={`flex items-center gap-2.5 transition-colors duration-200 ${
                stepState === "active" ? "text-[#e8d5a3]" : stepState === "done" ? "text-[#c8aaff]/80" : "text-[#c8aaff]/40"
              }`}
            >
              <span
                className={`grid h-[18px] w-[18px] place-items-center rounded-full text-[10px] font-black ${
                  stepState === "done" ? "bg-[#c4b5fd]/70 text-[#0a0818]" : stepState === "active" ? "bg-[#e8d5a3] text-[#0a0818]" : "bg-[#c4b5fd]/15 text-[#c8aaff]/60"
                }`}
                aria-hidden="true"
              >
                {stepState === "done" ? "✓" : index + 1}
              </span>
              {stepLabel}
            </li>
          );
        })}
      </ol>
      <div className="mt-7 grid gap-3 sm:grid-cols-3" aria-hidden="true">
        <div className="h-24 animate-pulse rounded-3xl bg-[#c4b5fd]/[0.08] motion-reduce:animate-none" />
        <div className="h-24 animate-pulse rounded-3xl bg-[#c4b5fd]/[0.06] motion-reduce:animate-none" />
        <div className="h-24 animate-pulse rounded-3xl bg-[#e8d5a3]/[0.06] motion-reduce:animate-none" />
      </div>
    </section>
  );
}
