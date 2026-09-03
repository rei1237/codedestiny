// 마스터 인연의 서(master-love-codex) UI 크롬 공용 카피.
// data/prologue.ts(프롤로그 대사 스크립트)·data/premium.ts·data/value.ts·data/acts.ts(마케팅/막 문구
// 데이터 테이블)와 AI 생성 리포트 본문(chapter.body/content.*)은 대상이 아니다 — 별도 콘텐츠
// 번역 작업이 필요한 콘텐츠 정본이며, 이 파일은 버튼·라벨·에러·상태 문구 같은 UI 크롬만 다룬다.
// "Master Love Codex"/영문 대문자 이브로우(예: PREMIUM CONSULTATION, WHY PREMIUM)는 ko 화면에서도
// 번역하지 않는 브랜드 표기라 로케일 불문 그대로 둔다. "연애 고수"는 프롤로그 화자 이름(제외 대상
// 데이터와 얽힌 타입 리터럴)이라 이 카피에 넣지 않는다.
// 신규 필드는 en/ja/zh-CN/zh-TW만 채운다 — 나머지 로케일은 getMasterLoveCodexCopy()가 EN과 병합해 자동 폴백한다.

import { useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import type { CodexAccessNoteKey } from "../data/premium";

export interface MasterLoveCodexErrorText {
  LOGIN_REQUIRED: string;
  PAYMENT_REQUIRED: string;
  PAYMENT_VERIFY_FAILED: string;
  PAYMENT_CANCELLED: string;
  INVALID_INPUT: string;
  PARTNER_INPUT_REQUIRED: string;
  CALCULATION_FAILED: string;
  GENERATION_IN_PROGRESS: string;
  GENERATION_BUDGET_EXCEEDED: string;
  DB_DEGRADED: string;
  EDGE_TIMEOUT: string;
  SERVER_ERROR: string;
  NETWORK_ERROR: string;
}

export interface MasterLoveCodexCopy {
  errorText: MasterLoveCodexErrorText;
  gateCheckTitle: string;
  gateCompleteTitle: string;
  gateCompleteOpenMessage: string;
  gateAlreadyPaidTitle: string;
  gateAlreadyPaidMessage: string;
  gateFailTitle: string;
  paymentBusyLabel: string;
  passCheckBusyLabel: string;
  paymentBusyShortLabel: string;
  passCheckBusyShortLabel: string;

  backButton: string;
  homeButton: string;
  navAriaLabel: string;

  heroDescription: (chapterCount: number) => string;
  starRatingAriaLabel: string;
  expertReportSuffix: (chapterCount: number) => string;
  coverImageAlt: string;
  pricingSectionAriaLabel: string;
  pricingTitle: string;
  pricingDescription: (chapterCount: number) => string;
  whyPremiumAriaLabel: string;
  startSectionAriaLabel: string;
  startNowButton: string;
  enterLibraryButton: string;
  replayPrologueButton: string;
  floatingStartLabel: string;
  entryAriaLabel: (title: string) => string;

  recommendedBadge: string;
  personalEyebrow: string;
  personalTitle: string;
  personalNote: string;
  compatEyebrow: string;
  compatTitle: string;
  compatNote: string;
  paymentDisclosure: string;
  startConsultButton: string;
  chaptersActsSuffix: (chapters: number) => string;

  whyPremiumTitle: string;
  trustStripAriaLabel: string;

  birthGateAriaLabel: string;
  birthGateTitle: string;
  birthGateDesc: string;
  crossReadEyebrow: string;
  chaptersActsEyebrow: string;
  honestNoteEyebrow: string;
  reloadFromProfileButton: string;
  nameLabel: string;
  namePlaceholder: string;
  genderLegend: string;
  genderFemale: string;
  genderMale: string;
  birthDateLabel: string;
  calendarLegend: string;
  calendarSolar: string;
  calendarLunar: string;
  leapMonthLabel: string;
  birthTimeLabel: string;
  birthTimeUnknownLabel: string;
  birthTimeUnknownNote: string;
  partnerSectionEyebrow: string;
  partnerSectionTitle: string;
  partnerSectionDesc: string;
  partnerToggleAdd: string;
  partnerToggleRemove: string;
  partnerNameLabel: string;
  partnerNamePlaceholder: string;
  partnerBirthDateLabel: string;
  partnerGenderLegend: string;
  partnerCalendarLegend: string;
  partnerBirthTimeLabel: string;
  partnerBirthTimeUnknownLabel: string;
  partnerNote: string;
  submitButton: string;

  generatingAriaLabel: (interrupted: boolean) => string;
  generatingStatusLines: string[];
  generatingInterruptedLabel: string;
  generatingProgressAriaLabel: string;
  generatingNameLine: (name: string) => string;
  generatingNamelessLine: string;
  generatingCompletedTitlesAriaLabel: string;
  retryButton: string;
  openStoredButton: string;
  generatingFooterNote: string;

  prologueAriaLabel: string;
  prologueSkipButton: string;
  prologueChoiceHint: string;
  prologueContinueButton: string;
  prologueOpenBookButton: string;
  dialogueAdvanceAriaLabel: string;
  dialogueRevealAriaLabel: string;
  dialogueTapHint: string;
  dialogueDefaultCta: string;

  actAriaLabel: (numeral: string, title: string) => string;

  chapterEvidenceAriaLabel: string;
  chapterCautionTitle: string;
  chapterActionsTitle: string;
  chapterVisualizationDefaultTitle: string;
  levelLow: string;
  levelBalanced: string;
  levelHigh: string;
  levelWatch: string;
  levelOpportunity: string;
  chapterDetailSummary: string;
  chapterOkFalseNote: string;

  scoreSectionAriaLabel: string;
  scoreAriaLabel: (score: number, tier: string) => string;
  scoreStarsAriaLabel: (stars: number) => string;
  relationshipScoreEyebrow: string;
  loveScoreEyebrow: string;
  loveDnaAriaLabel: string;
  scoreTierExcellent: string;
  scoreTierStrong: string;
  scoreTierBalanced: string;
  scoreTierGrowing: string;
  scoreTierChallenging: string;

  metricAriaLabel: (label: string, score: number) => string;

  readerOpeningAriaLabel: string;
  readerOpeningNote: string;
  readerAriaLabel: (bookTitle: string) => string;
  possessiveBookTitle: (name: string, bookTitle: string) => string;
  pdfFileNamePrefix: string;
  resumePromptAriaLabel: string;
  resumePromptLine: string;
  resumeButton: string;
  startOverButton: string;
  coverChapterCountSuffix: (count: number, chars: number) => string;
  pdfBindingLabel: string;
  pdfDownloadButton: string;
  pdfDownloadError: string;

  reportOutroAriaLabel: string;
  generatedSuccessfullyAriaLabel: string;
  reportOutroChapterLine: (chapters: number, chars: number) => string;
  reportOutroClosingLine: string;

  reportStampSolo: string;
  reportStampCompat: string;
  /**
   * 화자 이름의 **표시 문구**. 🔴 data/prologue.ts 의 `speaker: "연애 고수"` 리터럴과 혼동하지 말 것 —
   * 그쪽은 대사 스크립트를 가르는 키라 로케일 불문 한국어로 고정이고, 이것은 화면에 그리는 이름이다.
   * (narratorReadingAlt·narratorClosingAlt 가 이미 로케일마다 이 이름을 번역해 쓰고 있었는데,
   *  정작 본문 인용부와 프롤로그 이미지 alt 는 한국어가 박혀 있었다.)
   */
  narratorName: string;
  /** 장 번호 스크린리더 접두. 화면에는 숫자만 보이고 이 문구는 sr-only 로만 읽힌다. */
  chapterOrderSrLabel: (order: number) => string;
  prologueSceneAlt: (title: string) => string;
  /** 이름을 안 적었을 때 PDF 파일명에 들어가는 말. */
  pdfNameFallback: string;
  pdfCoverSubtitle: (chapters: number, typeName?: string) => string;
  /**
   * 마무리 카드 한 줄. 🔴 판정(이용권 열람인가)은 data/premium.ts 의 codexAccessLabel 이 그대로 갖고,
   * 여기는 그 판정을 문장으로 옮기기만 한다 — CodexReportStamp 가 passIncludedNote 를 쓰는 것과 같은 모양.
   */
  reportOutroAccessLine: (productTitle: string, includedWithPass: boolean) => string;

  resultMissingSessionIdError: string;
  resultUnstableRefreshError: string;
  resultNotFoundError: string;
  resultLoadFailedError: string;
  resultLoadingAriaLabel: string;
  resultErrorAriaLabel: string;
  resultNotFoundFallback: string;
  resultBackToLanding: string;
  resultIncompleteNotice: string;
  resultContinueWriting: string;
  /** 생년월일 줄에 들어가는 짧은 표기. birthTimeUnknownLabel 은 체크박스 문구라 다르다. */
  birthTimeUnknownShort: string;

  passIncludedNote: string;
  monthlyCreditUsedNote: string;

  sealAriaLabel: string;
  continueDestinyButton: string;
  narratorReadingAlt: string;
  narratorClosingAlt: string;

  bgmOnAriaLabel: string;
  bgmOffAriaLabel: string;
  actNotReadySuffix: string;
  actNavAriaLabel: string;
}

const MASTER_LOVE_CODEX_COPY_EN: MasterLoveCodexCopy = {
  errorText: {
    LOGIN_REQUIRED: "Please log in to open the Codex of Fate.",
    PAYMENT_REQUIRED: "Payment is required for this reading.",
    PAYMENT_VERIFY_FAILED: "We couldn't confirm your payment yet. If you already paid, please try again shortly.",
    PAYMENT_CANCELLED: "Payment was cancelled.",
    INVALID_INPUT: "Please check your date and time of birth.",
    PARTNER_INPUT_REQUIRED: "Reading compatibility needs your partner's date of birth. If you don't want to add it, tap \"Clear partner info and read solo.\"",
    CALCULATION_FAILED: "We couldn't build your saju or star map. Please check your input values.",
    GENERATION_IN_PROGRESS: "This is already being continued in another window. Please try again shortly.",
    GENERATION_BUDGET_EXCEEDED: "Generation is taking longer than expected. The chapters written so far are kept, so you can continue.",
    DB_DEGRADED: "The connection is briefly unstable. Please try again shortly.",
    EDGE_TIMEOUT: "The server took too long to respond. The chapters written so far are kept, so you can continue.",
    SERVER_ERROR: "Something went wrong while preparing your Codex of Fate.",
    NETWORK_ERROR: "The connection is unstable. Please try again shortly.",
  },
  gateCheckTitle: "Checking your pass",
  gateCompleteTitle: "Verified",
  gateCompleteOpenMessage: "Opening your Codex of Fate.",
  gateAlreadyPaidTitle: "Payment confirmed",
  gateAlreadyPaidMessage: "This reading was already paid for. Continuing where it left off.",
  gateFailTitle: "Verification failed",
  paymentBusyLabel: "Processing payment...",
  passCheckBusyLabel: "Checking your pass...",
  paymentBusyShortLabel: "Paying...",
  passCheckBusyShortLabel: "Checking...",

  backButton: "Back",
  homeButton: "Home",
  navAriaLabel: "Screen navigation",

  heroDescription: (chapterCount) =>
    `We chart your saju four-pillars and Zi Wei Dou Shu star map separately, then let AI cross-analyze both across ${chapterCount} chapters.`,
  starRatingAriaLabel: "5 out of 5 stars",
  expertReportSuffix: (chapterCount) => `A professional-grade, ${chapterCount}-chapter report`,
  coverImageAlt: "A love strategy book unfolding in the Mystic Library",
  pricingSectionAriaLabel: "Consultation plans and pricing",
  pricingTitle: "How would you like it read",
  pricingDescription: (chapterCount) =>
    `Reading alone reveals your own way of loving; reading together reveals your relationship. Either way it's the same ${chapterCount}-chapter structure, and your result is kept forever — no repeat payment.`,
  whyPremiumAriaLabel: "Why a premium consultation",
  startSectionAriaLabel: "Start the consultation",
  startNowButton: "Start now",
  enterLibraryButton: "Enter the library",
  replayPrologueButton: "Replay the prologue",
  floatingStartLabel: "Start consultation",
  entryAriaLabel: (title) => `Enter ${title}`,

  recommendedBadge: "Recommended",
  personalEyebrow: "PERSONAL READING",
  personalTitle: "Personal Reading",
  personalNote: "Reads your own love life alone",
  compatEyebrow: "COMPATIBILITY READING",
  compatTitle: "Compatibility Reading",
  compatNote: "Reads the relationship between two people",
  paymentDisclosure: "One-time payment · Kept forever · Free to reopen",
  startConsultButton: "Start consultation",
  chaptersActsSuffix: (chapters) => `${chapters} chapters · 5 acts`,

  whyPremiumTitle: "Why not a regular fortune reading",
  trustStripAriaLabel: "Service trust points",

  birthGateAriaLabel: "Enter birth details",
  birthGateTitle: "Let's chart your saju and star map",
  birthGateDesc: "We need your exact moment of birth to fill twenty chapters. If you have a profile card, it fills in automatically.",
  crossReadEyebrow: "Reading two charts together",
  chaptersActsEyebrow: "Twenty chapters · Five acts",
  honestNoteEyebrow: "What we should tell you upfront",
  reloadFromProfileButton: "Load from profile card",
  nameLabel: "Name (optional)",
  namePlaceholder: "Engraved on the cover",
  genderLegend: "Gender",
  genderFemale: "Female",
  genderMale: "Male",
  birthDateLabel: "Date of birth",
  calendarLegend: "Solar / Lunar calendar",
  calendarSolar: "Solar",
  calendarLunar: "Lunar",
  leapMonthLabel: "Leap month",
  birthTimeLabel: "Time of birth",
  birthTimeUnknownLabel: "I don't know my birth time",
  birthTimeUnknownNote: "Without a birth time, we read without the hour pillar. The overall flow still holds, but detail softens slightly.",
  partnerSectionEyebrow: "One more person",
  partnerSectionTitle: "You can also read your compatibility with a partner",
  partnerSectionDesc: "Add your partner's birth date to switch to a twenty-chapter reading that overlays four charts (both people's saju and star maps). Leave it out and we read your love life alone as now. The price changes together with the compatibility reading.",
  partnerToggleAdd: "Read compatibility with a partner",
  partnerToggleRemove: "Clear partner info and read solo",
  partnerNameLabel: "Partner's name (optional)",
  partnerNamePlaceholder: "Used to address them in the text",
  partnerBirthDateLabel: "Partner's date of birth",
  partnerGenderLegend: "Partner's gender (optional)",
  partnerCalendarLegend: "Partner's solar / lunar calendar",
  partnerBirthTimeLabel: "Partner's time of birth (optional)",
  partnerBirthTimeUnknownLabel: "Partner's birth time is unknown",
  partnerNote: "Partner info is used only to build this reading. It is never saved to your profile card.",
  submitButton: "See results",

  generatingAriaLabel: (interrupted) => (interrupted ? "Codex generation interrupted" : "Generating your codex"),
  generatingStatusLines: [
    "Charting your saju and weighing the Five Elements",
    "Placing stars in the twelve palaces of your star map",
    "Cross-checking whether the spouse palace and Day Master agree",
    "Finding where attraction and conflict begin",
    "Overlaying your past and upcoming luck cycles",
    "Transcribing the final letter",
  ],
  generatingInterruptedLabel: "Interrupted",
  generatingProgressAriaLabel: "Codex completion progress",
  generatingNameLine: (name) => `Writing ${name}'s Codex of Fate`,
  generatingNamelessLine: "Writing your Codex of Fate",
  generatingCompletedTitlesAriaLabel: "Completed chapters",
  retryButton: "Keep writing",
  openStoredButton: "Open the codex written so far",
  generatingFooterNote: "Even if you close this window, the chapters written so far are kept. Come back and pick up where you left off.",

  prologueAriaLabel: "Prologue",
  prologueSkipButton: "Skip",
  prologueChoiceHint: "Choose one, and the love master will answer.",
  prologueContinueButton: "Continue",
  prologueOpenBookButton: "Open the book",
  dialogueAdvanceAriaLabel: "Advance to the next line",
  dialogueRevealAriaLabel: "Reveal the full line",
  dialogueTapHint: "Tap to reveal instantly",
  dialogueDefaultCta: "Continue",

  actAriaLabel: (numeral, title) => `Act ${numeral}: ${title}`,

  chapterEvidenceAriaLabel: "What this was read from",
  chapterCautionTitle: "A moment to watch for in this relationship",
  chapterActionsTitle: "What you can do right now",
  chapterVisualizationDefaultTitle: "The flow of this chapter",
  levelLow: "Weak",
  levelBalanced: "Balanced",
  levelHigh: "Strong",
  levelWatch: "Watch",
  levelOpportunity: "Opportunity",
  chapterDetailSummary: "Read the full consultation",
  chapterOkFalseNote: "This chapter will fill in once you reopen it. The other chapters remain stored as they are.",

  scoreSectionAriaLabel: "Overall score",
  scoreAriaLabel: (score, tier) => `Overall score ${score} out of 100 · ${tier}`,
  scoreStarsAriaLabel: (stars) => `${stars} out of 5 stars`,
  relationshipScoreEyebrow: "RELATIONSHIP SCORE",
  loveScoreEyebrow: "LOVE SCORE",
  loveDnaAriaLabel: "Love DNA",
  scoreTierExcellent: "A wonderful match",
  scoreTierStrong: "A strong match",
  scoreTierBalanced: "A balanced match",
  scoreTierGrowing: "A match worth refining",
  scoreTierChallenging: "A match that needs effort",

  metricAriaLabel: (label, score) => `${label} ${score} out of 100`,

  readerOpeningAriaLabel: "Opening the codex",
  readerOpeningNote: "Breaking the seal",
  readerAriaLabel: (bookTitle) => `${bookTitle} — full text`,
  possessiveBookTitle: (name, bookTitle) => (name ? `${name}'s ${bookTitle}` : bookTitle),
  pdfFileNamePrefix: "MasterLoveCodex",
  resumePromptAriaLabel: "Restore your reading position",
  resumePromptLine: "You had a spot you were last reading.",
  resumeButton: "Continue reading",
  startOverButton: "Start over",
  coverChapterCountSuffix: (count, chars) => `${count} chapters · ${chars.toLocaleString("en-US")} characters`,
  pdfBindingLabel: "Binding into a PDF",
  pdfDownloadButton: "Keep as PDF",
  pdfDownloadError: "Something went wrong while exporting to PDF. Please try again shortly.",

  reportOutroAriaLabel: "Report closing",
  generatedSuccessfullyAriaLabel: "Premium report",
  reportOutroChapterLine: (chapters, chars) => `${chapters} chapters · ${chars.toLocaleString("en-US")} characters`,
  reportOutroClosingLine: "This report is kept on your account — you can reopen it anytime without paying again.",

  reportStampSolo: "PREMIUM AI RELATIONSHIP REPORT",
  reportStampCompat: "PREMIUM AI COMPATIBILITY REPORT",
  narratorName: "The love master",
  chapterOrderSrLabel: (order) => `Chapter ${order} · `,
  prologueSceneAlt: (title) => `Scene: ${title}`,
  pdfNameFallback: "LoveCodex",
  pdfCoverSubtitle: (chapters, typeName) => (typeName ? `${typeName} · ${chapters} chapters` : `${chapters} chapters`),
  reportOutroAccessLine: (productTitle, includedWithPass) => (includedWithPass ? `You are reading the ${productTitle} premium AI consultation report with your pass.` : `This report is the result of the ${productTitle} premium AI consultation.`),
  resultMissingSessionIdError: "No archive number was given. Please pick the codex again from your library.",
  resultUnstableRefreshError: "The connection is briefly unstable. Please refresh in a moment.",
  resultNotFoundError: "We couldn't find the codex you asked for.",
  resultLoadFailedError: "We couldn't load the codex.",
  resultLoadingAriaLabel: "Opening the archived codex",
  resultErrorAriaLabel: "The codex can't be opened",
  resultNotFoundFallback: "We couldn't find the codex.",
  resultBackToLanding: "Back to the codex",
  resultIncompleteNotice: "This codex has not been finished yet.",
  resultContinueWriting: "Continue writing",
  birthTimeUnknownShort: "Birth time unknown",
  passIncludedNote: "Included with your pass",
  monthlyCreditUsedNote: "Paid with monthly credit",

  sealAriaLabel: "Seal",
  continueDestinyButton: "Open the map of your destiny",
  narratorReadingAlt: "The love master reading a book",
  narratorClosingAlt: "The love master closing the codex",

  bgmOnAriaLabel: "Turn off Codex background music",
  bgmOffAriaLabel: "Turn on Codex background music",
  actNotReadySuffix: " (not yet written)",
  actNavAriaLabel: "Jump to act",
};

const MASTER_LOVE_CODEX_COPY: Partial<Record<LoadingLocale, MasterLoveCodexCopy>> = {
  ko: {
    errorText: {
      LOGIN_REQUIRED: "인연의 서를 열려면 로그인이 필요합니다.",
      PAYMENT_REQUIRED: "회당 결제가 필요합니다.",
      PAYMENT_VERIFY_FAILED: "결제 확인이 완료되지 않았습니다. 결제가 끝났다면 잠시 후 다시 시도해 주세요.",
      PAYMENT_CANCELLED: "결제가 취소되었습니다.",
      INVALID_INPUT: "생년월일과 태어난 시각을 확인해 주세요.",
      PARTNER_INPUT_REQUIRED: "궁합으로 읽으려면 상대의 생년월일이 필요합니다. 넣지 않으실 거면 '상대 정보 지우고 개인 리딩으로'를 눌러 주세요.",
      CALCULATION_FAILED: "명식과 명반을 세우지 못했습니다. 입력값을 확인해 주세요.",
      GENERATION_IN_PROGRESS: "이미 다른 창에서 이어 쓰는 중입니다. 잠시 후 다시 시도해 주세요.",
      GENERATION_BUDGET_EXCEEDED: "생성이 지연되고 있습니다. 지금까지 쓰인 장은 보관돼 있으니 이어서 쓸 수 있습니다.",
      DB_DEGRADED: "연결이 잠시 불안정합니다. 잠시 후 다시 시도해 주세요.",
      EDGE_TIMEOUT: "서버가 응답할 시간을 넘겼습니다. 지금까지 쓰인 장은 보관돼 있으니 이어서 쓸 수 있습니다.",
      SERVER_ERROR: "인연의 서를 준비하는 중 문제가 발생했습니다.",
      NETWORK_ERROR: "연결이 불안정합니다. 잠시 후 다시 시도해 주세요.",
    },
    gateCheckTitle: "이용권 확인",
    gateCompleteTitle: "확인 완료",
    gateCompleteOpenMessage: "인연의 서를 펼칩니다.",
    gateAlreadyPaidTitle: "결제 확인",
    gateAlreadyPaidMessage: "이미 결제된 회차입니다. 이어서 펼칩니다.",
    gateFailTitle: "확인 실패",
    paymentBusyLabel: "결제 진행 중...",
    passCheckBusyLabel: "이용권 확인 중...",
    paymentBusyShortLabel: "결제 중...",
    passCheckBusyShortLabel: "확인 중...",

    backButton: "돌아가기",
    homeButton: "홈으로",
    navAriaLabel: "화면 이동",

    heroDescription: (chapterCount) =>
      `두 사람의 인연을 사주 명식과 자미두수 명반으로 나눠 세운 뒤, AI가 ${chapterCount}장에 걸쳐 종합 분석합니다.`,
    starRatingAriaLabel: "별점 5점",
    expertReportSuffix: (chapterCount) => `전문 상담 수준의 ${chapterCount}장 리포트`,
    coverImageAlt: "신비의 도서관에서 펼쳐지는 연애 전략서",
    pricingSectionAriaLabel: "상담 상품과 가격",
    pricingTitle: "어떻게 읽어 드릴까요",
    pricingDescription: (chapterCount) =>
      `혼자 읽으면 당신의 연애 방식을, 둘이 읽으면 두 사람의 관계를 읽습니다. 어느 쪽이든 같은 ${chapterCount}장 구성이고, 결과는 영구 보관되어 다시 결제하지 않습니다.`,
    whyPremiumAriaLabel: "왜 프리미엄 상담인가",
    startSectionAriaLabel: "상담 시작",
    startNowButton: "바로 시작하기",
    enterLibraryButton: "도서관에 들어가기",
    replayPrologueButton: "프롤로그 다시 보기",
    floatingStartLabel: "상담 시작",
    entryAriaLabel: (title) => `${title} 입장`,

    recommendedBadge: "추천",
    personalEyebrow: "PERSONAL READING",
    personalTitle: "개인 리딩",
    personalNote: "당신 한 사람의 연애를 읽습니다",
    compatEyebrow: "COMPATIBILITY READING",
    compatTitle: "궁합 리딩",
    compatNote: "두 사람의 관계를 읽습니다",
    paymentDisclosure: "1회 결제 · 결과 영구 보관 · 재열람 무료",
    startConsultButton: "상담 시작",
    chaptersActsSuffix: (chapters) => `${chapters}장 · 5막`,

    whyPremiumTitle: "왜 일반 운세가 아닌가",
    trustStripAriaLabel: "서비스 신뢰 요소",

    birthGateAriaLabel: "생년 정보 입력",
    birthGateTitle: "당신의 명식과 명반을 세우겠습니다",
    birthGateDesc: "태어난 순간의 좌표가 있어야 스무 장을 채울 수 있습니다. 프로필 카드가 있으면 자동으로 채워집니다.",
    crossReadEyebrow: "두 장을 겹쳐 읽습니다",
    chaptersActsEyebrow: "스무 장 · 다섯 막",
    honestNoteEyebrow: "미리 말씀드리는 것",
    reloadFromProfileButton: "프로필 카드에서 불러오기",
    nameLabel: "이름 (선택)",
    namePlaceholder: "표지에 새겨집니다",
    genderLegend: "성별",
    genderFemale: "여성",
    genderMale: "남성",
    birthDateLabel: "생년월일",
    calendarLegend: "양력 / 음력",
    calendarSolar: "양력",
    calendarLunar: "음력",
    leapMonthLabel: "윤달입니다",
    birthTimeLabel: "태어난 시각",
    birthTimeUnknownLabel: "태어난 시각을 모릅니다",
    birthTimeUnknownNote: "시각을 모르면 시주를 뺀 채로 읽습니다. 큰 흐름은 그대로지만 세부는 조금 흐려집니다.",
    partnerSectionEyebrow: "한 사람 더",
    partnerSectionTitle: "상대와의 궁합으로 읽을 수도 있습니다",
    partnerSectionDesc: "상대의 생년월일을 넣으면 네 장(두 사람의 명식과 명반)을 겹쳐 관계를 읽는 스무 장으로 바뀝니다. 넣지 않으면 지금처럼 당신 한 사람의 연애를 읽습니다. 금액도 궁합 리딩으로 함께 바뀝니다.",
    partnerToggleAdd: "상대와의 궁합으로 읽기",
    partnerToggleRemove: "상대 정보 지우고 개인 리딩으로",
    partnerNameLabel: "상대 이름 (선택)",
    partnerNamePlaceholder: "본문에서 이렇게 부릅니다",
    partnerBirthDateLabel: "상대 생년월일",
    partnerGenderLegend: "상대 성별 (선택)",
    partnerCalendarLegend: "상대 양력 / 음력",
    partnerBirthTimeLabel: "상대가 태어난 시각 (선택)",
    partnerBirthTimeUnknownLabel: "상대의 시각은 모릅니다",
    partnerNote: "상대 정보는 이 리딩을 만드는 데만 씁니다. 당신의 프로필 카드에 저장되지 않습니다.",
    submitButton: "결과 보기",

    generatingAriaLabel: (interrupted) => (interrupted ? "인연의 서 생성 중단" : "인연의 서 생성 중"),
    generatingStatusLines: [
      "명식을 세우고 오행의 무게를 재는 중",
      "명반 열두 궁에 별을 앉히는 중",
      "부부궁과 일간이 같은 말을 하는지 맞춰 보는 중",
      "끌림과 갈등이 시작되는 자리를 찾는 중",
      "지나온 대운과 다가올 세운을 겹쳐 보는 중",
      "마지막 편지를 옮겨 적는 중",
    ],
    generatingInterruptedLabel: "Interrupted",
    generatingProgressAriaLabel: "인연의 서 완성 진행률",
    generatingNameLine: (name) => `${name}님의 인연의 서를 쓰는 중입니다`,
    generatingNamelessLine: "당신의 인연의 서를 쓰는 중입니다",
    generatingCompletedTitlesAriaLabel: "완성된 장",
    retryButton: "이어서 쓰기",
    openStoredButton: "지금까지 쓰인 서 열기",
    generatingFooterNote: "창을 닫아도 지금까지 쓰인 장은 보관됩니다. 다시 들어오면 이어서 완성할 수 있습니다.",

    prologueAriaLabel: "프롤로그",
    prologueSkipButton: "건너뛰기",
    prologueChoiceHint: "한 가지를 고르면 연애 고수가 답합니다.",
    prologueContinueButton: "계속",
    prologueOpenBookButton: "책을 펼치기",
    dialogueAdvanceAriaLabel: "다음으로 넘어가기",
    dialogueRevealAriaLabel: "대사를 모두 표시하기",
    dialogueTapHint: "탭하면 바로 표시",
    dialogueDefaultCta: "계속",

    actAriaLabel: (numeral, title) => `${numeral}막 ${title}`,

    chapterEvidenceAriaLabel: "무엇을 근거로 읽었는가",
    chapterCautionTitle: "관계에서 주의할 순간",
    chapterActionsTitle: "지금 할 수 있는 행동",
    chapterVisualizationDefaultTitle: "이 장의 흐름",
    levelLow: "약함",
    levelBalanced: "균형",
    levelHigh: "강함",
    levelWatch: "관찰",
    levelOpportunity: "기회",
    chapterDetailSummary: "상세 상담 내용 읽기",
    chapterOkFalseNote: "이 장은 다시 열면 채워집니다. 다른 장은 그대로 보관되어 있습니다.",

    scoreSectionAriaLabel: "종합 점수",
    scoreAriaLabel: (score, tier) => `종합 점수 ${score}점 (100점 만점) · ${tier}`,
    scoreStarsAriaLabel: (stars) => `5점 만점에 ${stars}점`,
    relationshipScoreEyebrow: "RELATIONSHIP SCORE",
    loveScoreEyebrow: "LOVE SCORE",
    loveDnaAriaLabel: "연애 DNA",
    scoreTierExcellent: "매우 좋은 결",
    scoreTierStrong: "잘 맞는 결",
    scoreTierBalanced: "균형 잡힌 결",
    scoreTierGrowing: "다듬어 가는 결",
    scoreTierChallenging: "노력이 필요한 결",

    metricAriaLabel: (label, score) => `${label} ${score}점 (100점 만점)`,

    readerOpeningAriaLabel: "코덱스를 여는 중",
    readerOpeningNote: "봉인을 여는 중입니다",
    readerAriaLabel: (bookTitle) => `${bookTitle} 본문`,
    possessiveBookTitle: (name, bookTitle) => (name ? `${name}님의 ${bookTitle}` : bookTitle),
    pdfFileNamePrefix: "마스터인연의서",
    resumePromptAriaLabel: "독서 위치 복원",
    resumePromptLine: "마지막으로 읽던 곳이 있어요.",
    resumeButton: "이어서 읽기",
    startOverButton: "처음부터",
    coverChapterCountSuffix: (count, chars) => `${count}장 · ${chars.toLocaleString("ko-KR")}자`,
    pdfBindingLabel: "책으로 엮는 중",
    pdfDownloadButton: "PDF로 소장하기",
    pdfDownloadError: "PDF로 옮기는 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.",

    reportOutroAriaLabel: "리포트 마무리",
    generatedSuccessfullyAriaLabel: "프리미엄 리포트",
    reportOutroChapterLine: (chapters, chars) => `${chapters}장 · ${chars.toLocaleString("ko-KR")}자`,
    reportOutroClosingLine: "이 리포트는 계정에 보관되어 다시 결제하지 않고 언제든 열람할 수 있습니다.",

    reportStampSolo: "PREMIUM AI RELATIONSHIP REPORT",
    reportStampCompat: "PREMIUM AI COMPATIBILITY REPORT",
    narratorName: "연애 고수",
    chapterOrderSrLabel: (order) => `제${order}장 · `,
    prologueSceneAlt: (title) => `${title} 장면`,
    pdfNameFallback: "인연의서",
    pdfCoverSubtitle: (chapters, typeName) => (typeName ? `${typeName} · 전 ${chapters}장` : `전 ${chapters}장`),
    reportOutroAccessLine: (productTitle, includedWithPass) => (includedWithPass ? `이용권으로 열람 중인 ${productTitle} 프리미엄 AI 상담 리포트입니다.` : `본 리포트는 ${productTitle} 프리미엄 AI 상담 결과입니다.`),
    resultMissingSessionIdError: "보관 번호가 없습니다. 서재에서 인연의 서를 다시 선택해 주세요.",
    resultUnstableRefreshError: "연결이 잠시 불안정합니다. 잠시 후 새로고침해 주세요.",
    resultNotFoundError: "요청하신 인연의 서를 찾을 수 없습니다.",
    resultLoadFailedError: "인연의 서를 불러오지 못했습니다.",
    resultLoadingAriaLabel: "보관된 인연의 서를 여는 중",
    resultErrorAriaLabel: "인연의 서를 열 수 없음",
    resultNotFoundFallback: "인연의 서를 찾을 수 없습니다.",
    resultBackToLanding: "인연의 서 화면으로",
    resultIncompleteNotice: "아직 다 쓰이지 않은 인연의 서입니다.",
    resultContinueWriting: "이어 쓰기",
    birthTimeUnknownShort: "태어난 시각 모름",
    passIncludedNote: "이용권 포함",
    monthlyCreditUsedNote: "월정석 사용",

    sealAriaLabel: "봉인",
    continueDestinyButton: "운명의 지도 열기",
    narratorReadingAlt: "책을 읽고 있는 연애 고수",
    narratorClosingAlt: "코덱스를 덮는 연애 고수",

    bgmOnAriaLabel: "인연의 서 배경 음악 끄기",
    bgmOffAriaLabel: "인연의 서 배경 음악 켜기",
    actNotReadySuffix: " (아직 쓰이지 않음)",
    actNavAriaLabel: "막 이동",
  },
  ja: {
    errorText: {
      LOGIN_REQUIRED: "縁の書を開くにはログインが必要です。",
      PAYMENT_REQUIRED: "1回ごとのお支払いが必要です。",
      PAYMENT_VERIFY_FAILED: "決済の確認が完了していません。決済がお済みの場合はしばらくしてからもう一度お試しください。",
      PAYMENT_CANCELLED: "決済がキャンセルされました。",
      INVALID_INPUT: "生年月日と生まれた時刻をご確認ください。",
      PARTNER_INPUT_REQUIRED: "相性で読むには相手の生年月日が必要です。入力しない場合は「相手情報を消して個人リーディングに戻す」を押してください。",
      CALCULATION_FAILED: "命式と命盤を立てられませんでした。入力内容をご確認ください。",
      GENERATION_IN_PROGRESS: "すでに別のウィンドウで続きを書いています。しばらくしてからもう一度お試しください。",
      GENERATION_BUDGET_EXCEEDED: "生成に時間がかかっています。ここまで書かれた章は保存されているので、続きを書けます。",
      DB_DEGRADED: "接続が一時的に不安定です。しばらくしてからもう一度お試しください。",
      EDGE_TIMEOUT: "サーバーの応答時間を超えました。ここまで書かれた章は保存されているので、続きを書けます。",
      SERVER_ERROR: "縁の書を準備中に問題が発生しました。",
      NETWORK_ERROR: "接続が不安定です。しばらくしてからもう一度お試しください。",
    },
    gateCheckTitle: "利用券を確認中",
    gateCompleteTitle: "確認完了",
    gateCompleteOpenMessage: "縁の書を開きます。",
    gateAlreadyPaidTitle: "決済確認",
    gateAlreadyPaidMessage: "すでに決済済みの回です。続きを開きます。",
    gateFailTitle: "確認に失敗しました",
    paymentBusyLabel: "決済処理中...",
    passCheckBusyLabel: "利用券を確認中...",
    paymentBusyShortLabel: "決済中...",
    passCheckBusyShortLabel: "確認中...",

    backButton: "戻る",
    homeButton: "ホームへ",
    navAriaLabel: "画面移動",

    heroDescription: (chapterCount) =>
      `二人の縁を四柱推命と紫微斗数の命盤にそれぞれ立てたうえで、AIが${chapterCount}章にわたり総合分析します。`,
    starRatingAriaLabel: "評価5つ星",
    expertReportSuffix: (chapterCount) => `専門相談レベルの${chapterCount}章レポート`,
    coverImageAlt: "神秘の図書館で開かれる恋愛戦略書",
    pricingSectionAriaLabel: "相談プランと料金",
    pricingTitle: "どちらで読みますか",
    pricingDescription: (chapterCount) =>
      `一人で読めばあなたの恋愛スタイルを、二人で読めば二人の関係を読みます。どちらも同じ${chapterCount}章構成で、結果は永久保存され再決済は不要です。`,
    whyPremiumAriaLabel: "なぜプレミアム相談なのか",
    startSectionAriaLabel: "相談を始める",
    startNowButton: "今すぐ始める",
    enterLibraryButton: "図書館に入る",
    replayPrologueButton: "プロローグをもう一度見る",
    floatingStartLabel: "相談を始める",
    entryAriaLabel: (title) => `${title}に入場`,

    recommendedBadge: "おすすめ",
    personalEyebrow: "PERSONAL READING",
    personalTitle: "個人リーディング",
    personalNote: "あなた一人の恋愛を読みます",
    compatEyebrow: "COMPATIBILITY READING",
    compatTitle: "相性リーディング",
    compatNote: "二人の関係を読みます",
    paymentDisclosure: "1回払い切り · 結果は永久保存 · 再閲覧無料",
    startConsultButton: "相談を始める",
    chaptersActsSuffix: (chapters) => `${chapters}章 · 全5幕`,

    whyPremiumTitle: "なぜ一般的な占いではないのか",
    trustStripAriaLabel: "サービスの信頼ポイント",

    birthGateAriaLabel: "生年情報の入力",
    birthGateTitle: "あなたの命式と命盤を立てます",
    birthGateDesc: "生まれた瞬間の座標が必要です。二十章を書き上げるために。プロフィールカードがあれば自動入力されます。",
    crossReadEyebrow: "二枚を重ねて読みます",
    chaptersActsEyebrow: "二十章 · 五幕",
    honestNoteEyebrow: "先にお伝えしておきたいこと",
    reloadFromProfileButton: "プロフィールカードから読み込む",
    nameLabel: "名前（任意）",
    namePlaceholder: "表紙に刻まれます",
    genderLegend: "性別",
    genderFemale: "女性",
    genderMale: "男性",
    birthDateLabel: "生年月日",
    calendarLegend: "新暦 / 旧暦",
    calendarSolar: "新暦",
    calendarLunar: "旧暦",
    leapMonthLabel: "閏月です",
    birthTimeLabel: "生まれた時刻",
    birthTimeUnknownLabel: "生まれた時刻がわかりません",
    birthTimeUnknownNote: "時刻が不明な場合は時柱を除いて読みます。大きな流れは変わりませんが、細部はやや曖昧になります。",
    partnerSectionEyebrow: "もう一人",
    partnerSectionTitle: "相手との相性でも読めます",
    partnerSectionDesc: "相手の生年月日を入れると、四枚（二人の命式と命盤）を重ねて関係を読む二十章に変わります。入れなければ今のようにあなた一人の恋愛を読みます。料金も相性リーディングに合わせて変わります。",
    partnerToggleAdd: "相手との相性で読む",
    partnerToggleRemove: "相手情報を消して個人リーディングに戻す",
    partnerNameLabel: "相手の名前（任意）",
    partnerNamePlaceholder: "本文でこう呼ばれます",
    partnerBirthDateLabel: "相手の生年月日",
    partnerGenderLegend: "相手の性別（任意）",
    partnerCalendarLegend: "相手の新暦 / 旧暦",
    partnerBirthTimeLabel: "相手が生まれた時刻（任意）",
    partnerBirthTimeUnknownLabel: "相手の時刻はわかりません",
    partnerNote: "相手の情報はこのリーディングの作成にのみ使用します。あなたのプロフィールカードには保存されません。",
    submitButton: "結果を見る",

    generatingAriaLabel: (interrupted) => (interrupted ? "縁の書の生成を中断しました" : "縁の書を生成中"),
    generatingStatusLines: [
      "命式を立てて五行の重みを量っています",
      "命盤の十二宮に星を配置しています",
      "夫婦宮と日干が同じ答えを示すか照らし合わせています",
      "惹かれ合いと対立が始まる場所を探しています",
      "過去の大運とこれからの歳運を重ねています",
      "最後の手紙を書き写しています",
    ],
    generatingInterruptedLabel: "Interrupted",
    generatingProgressAriaLabel: "縁の書の完成進捗",
    generatingNameLine: (name) => `${name}様の縁の書を書いています`,
    generatingNamelessLine: "あなたの縁の書を書いています",
    generatingCompletedTitlesAriaLabel: "完成した章",
    retryButton: "続きを書く",
    openStoredButton: "ここまで書かれた書を開く",
    generatingFooterNote: "ウィンドウを閉じても、ここまで書かれた章は保存されます。また戻ってきて続きを仕上げられます。",

    prologueAriaLabel: "プロローグ",
    prologueSkipButton: "スキップ",
    prologueChoiceHint: "一つを選ぶと、恋愛の達人が答えます。",
    prologueContinueButton: "続ける",
    prologueOpenBookButton: "本を開く",
    dialogueAdvanceAriaLabel: "次のセリフへ進む",
    dialogueRevealAriaLabel: "セリフをすべて表示する",
    dialogueTapHint: "タップするとすぐに表示",
    dialogueDefaultCta: "続ける",

    actAriaLabel: (numeral, title) => `第${numeral}幕 ${title}`,

    chapterEvidenceAriaLabel: "何を根拠に読んだか",
    chapterCautionTitle: "関係で注意すべき瞬間",
    chapterActionsTitle: "今できる行動",
    chapterVisualizationDefaultTitle: "この章の流れ",
    levelLow: "弱い",
    levelBalanced: "バランス",
    levelHigh: "強い",
    levelWatch: "要注意",
    levelOpportunity: "好機",
    chapterDetailSummary: "詳しい相談内容を読む",
    chapterOkFalseNote: "この章は再度開くと埋まります。他の章はそのまま保存されています。",

    scoreSectionAriaLabel: "総合スコア",
    scoreAriaLabel: (score, tier) => `総合スコア100点満点中${score}点 · ${tier}`,
    scoreStarsAriaLabel: (stars) => `5点満点中${stars}点`,
    relationshipScoreEyebrow: "RELATIONSHIP SCORE",
    loveScoreEyebrow: "LOVE SCORE",
    loveDnaAriaLabel: "恋愛DNA",
    scoreTierExcellent: "とても良い相性",
    scoreTierStrong: "よく合う相性",
    scoreTierBalanced: "バランスの取れた相性",
    scoreTierGrowing: "磨いていく相性",
    scoreTierChallenging: "努力が必要な相性",

    metricAriaLabel: (label, score) => `${label} 100点満点中${score}点`,

    readerOpeningAriaLabel: "コーデックスを開いています",
    readerOpeningNote: "封印を解いています",
    readerAriaLabel: (bookTitle) => `${bookTitle} 本文`,
    possessiveBookTitle: (name, bookTitle) => (name ? `${name}様の${bookTitle}` : bookTitle),
    pdfFileNamePrefix: "マスター縁の書",
    resumePromptAriaLabel: "読書位置の復元",
    resumePromptLine: "最後に読んでいた場所があります。",
    resumeButton: "続きを読む",
    startOverButton: "最初から",
    coverChapterCountSuffix: (count, chars) => `${count}章 · ${chars.toLocaleString("ja-JP")}字`,
    pdfBindingLabel: "本として綴じています",
    pdfDownloadButton: "PDFとして保存する",
    pdfDownloadError: "PDFへの変換中に問題が発生しました。しばらくしてからもう一度お試しください。",

    reportOutroAriaLabel: "レポートのまとめ",
    generatedSuccessfullyAriaLabel: "プレミアムレポート",
    reportOutroChapterLine: (chapters, chars) => `${chapters}章 · ${chars.toLocaleString("ja-JP")}字`,
    reportOutroClosingLine: "このレポートはアカウントに保存され、再決済せずいつでも閲覧できます。",

    reportStampSolo: "PREMIUM AI RELATIONSHIP REPORT",
    reportStampCompat: "PREMIUM AI COMPATIBILITY REPORT",
    narratorName: "恋愛の達人",
    chapterOrderSrLabel: (order) => `第${order}章 · `,
    prologueSceneAlt: (title) => `${title}の場面`,
    pdfNameFallback: "縁の書",
    pdfCoverSubtitle: (chapters, typeName) => (typeName ? `${typeName} · 全${chapters}章` : `全${chapters}章`),
    reportOutroAccessLine: (productTitle, includedWithPass) => (includedWithPass ? `利用券でご覧いただいている${productTitle}プレミアムAI相談レポートです。` : `本レポートは${productTitle}プレミアムAI相談の結果です。`),
    resultMissingSessionIdError: "保管番号がありません。書斎から縁の書をもう一度お選びください。",
    resultUnstableRefreshError: "接続が少し不安定です。しばらくしてから再読み込みしてください。",
    resultNotFoundError: "お探しの縁の書が見つかりませんでした。",
    resultLoadFailedError: "縁の書を読み込めませんでした。",
    resultLoadingAriaLabel: "保管された縁の書を開いています",
    resultErrorAriaLabel: "縁の書を開けません",
    resultNotFoundFallback: "縁の書が見つかりません。",
    resultBackToLanding: "縁の書の画面へ",
    resultIncompleteNotice: "まだ書き終えていない縁の書です。",
    resultContinueWriting: "続きを書く",
    birthTimeUnknownShort: "生まれた時刻は不明",
    passIncludedNote: "利用券に含まれています",
    monthlyCreditUsedNote: "月定石を使用",

    sealAriaLabel: "封印",
    continueDestinyButton: "運命の地図を開く",
    narratorReadingAlt: "本を読んでいる恋愛の達人",
    narratorClosingAlt: "コーデックスを閉じる恋愛の達人",

    bgmOnAriaLabel: "縁の書のBGMをオフにする",
    bgmOffAriaLabel: "縁の書のBGMをオンにする",
    actNotReadySuffix: "（まだ書かれていません）",
    actNavAriaLabel: "幕へ移動",
  },
  "zh-CN": {
    errorText: {
      LOGIN_REQUIRED: "打开情缘之书需要先登录。",
      PAYMENT_REQUIRED: "本次解读需要付费。",
      PAYMENT_VERIFY_FAILED: "尚未确认付款完成。如果您已完成付款，请稍后再试。",
      PAYMENT_CANCELLED: "付款已取消。",
      INVALID_INPUT: "请确认出生日期与出生时刻。",
      PARTNER_INPUT_REQUIRED: "要解读合婚需要对方的出生日期。若不想填写，请点击“清除对方信息，改为个人解读”。",
      CALCULATION_FAILED: "未能排出命式与命盘，请确认输入内容。",
      GENERATION_IN_PROGRESS: "已在另一个窗口中继续撰写，请稍后再试。",
      GENERATION_BUDGET_EXCEEDED: "生成正在延迟。目前已写好的章节已保存，可以继续撰写。",
      DB_DEGRADED: "连接暂时不稳定，请稍后再试。",
      EDGE_TIMEOUT: "服务器响应超时。目前已写好的章节已保存，可以继续撰写。",
      SERVER_ERROR: "准备情缘之书时发生了问题。",
      NETWORK_ERROR: "连接不稳定，请稍后再试。",
    },
    gateCheckTitle: "正在确认通行证",
    gateCompleteTitle: "确认完成",
    gateCompleteOpenMessage: "正在展开情缘之书。",
    gateAlreadyPaidTitle: "付款确认",
    gateAlreadyPaidMessage: "该次解读已付款，继续为您展开。",
    gateFailTitle: "确认失败",
    paymentBusyLabel: "付款处理中...",
    passCheckBusyLabel: "正在确认通行证...",
    paymentBusyShortLabel: "付款中...",
    passCheckBusyShortLabel: "确认中...",

    backButton: "返回",
    homeButton: "回首页",
    navAriaLabel: "页面导航",

    heroDescription: (chapterCount) =>
      `分别排出两人的四柱命盘与紫微斗数命盘后，由AI在${chapterCount}章中进行综合分析。`,
    starRatingAriaLabel: "评分5星",
    expertReportSuffix: (chapterCount) => `专业咨询水准的${chapterCount}章报告`,
    coverImageAlt: "在神秘图书馆中展开的恋爱策略书",
    pricingSectionAriaLabel: "咨询方案与价格",
    pricingTitle: "想怎么为您解读",
    pricingDescription: (chapterCount) =>
      `独自阅读可解读您的恋爱方式，两人共读则解读两人的关系。无论哪种都是相同的${chapterCount}章结构，结果永久保存，无需再次付费。`,
    whyPremiumAriaLabel: "为什么选择高级咨询",
    startSectionAriaLabel: "开始咨询",
    startNowButton: "立即开始",
    enterLibraryButton: "进入图书馆",
    replayPrologueButton: "重看序章",
    floatingStartLabel: "开始咨询",
    entryAriaLabel: (title) => `进入${title}`,

    recommendedBadge: "推荐",
    personalEyebrow: "PERSONAL READING",
    personalTitle: "个人解读",
    personalNote: "解读您一个人的恋爱",
    compatEyebrow: "COMPATIBILITY READING",
    compatTitle: "合婚解读",
    compatNote: "解读两人的关系",
    paymentDisclosure: "一次付费 · 结果永久保存 · 免费重新查看",
    startConsultButton: "开始咨询",
    chaptersActsSuffix: (chapters) => `${chapters}章 · 5幕`,

    whyPremiumTitle: "为什么不是普通运势",
    trustStripAriaLabel: "服务信任要素",

    birthGateAriaLabel: "输入出生信息",
    birthGateTitle: "为您排出命式与命盘",
    birthGateDesc: "需要出生那一刻的坐标才能填满二十章。若有个人资料卡会自动填入。",
    crossReadEyebrow: "两张命盘交叉解读",
    chaptersActsEyebrow: "二十章 · 五幕",
    honestNoteEyebrow: "想提前告诉您的事",
    reloadFromProfileButton: "从资料卡载入",
    nameLabel: "姓名（可选）",
    namePlaceholder: "将镌刻于封面",
    genderLegend: "性别",
    genderFemale: "女性",
    genderMale: "男性",
    birthDateLabel: "出生日期",
    calendarLegend: "阳历 / 阴历",
    calendarSolar: "阳历",
    calendarLunar: "阴历",
    leapMonthLabel: "是闰月",
    birthTimeLabel: "出生时刻",
    birthTimeUnknownLabel: "不知道出生时刻",
    birthTimeUnknownNote: "不知道时刻时，将排除时柱进行解读。整体走向不变，但细节会略显模糊。",
    partnerSectionEyebrow: "再加一位",
    partnerSectionTitle: "也可以解读与对方的合婚",
    partnerSectionDesc: "填入对方的出生日期，将转为交叉解读四张命盘（两人的命式与命盘）的二十章合婚解读。不填则如现在一样只解读您一个人的恋爱。费用也会随合婚解读一同变化。",
    partnerToggleAdd: "解读与对方的合婚",
    partnerToggleRemove: "清除对方信息，改为个人解读",
    partnerNameLabel: "对方姓名（可选）",
    partnerNamePlaceholder: "正文中将如此称呼对方",
    partnerBirthDateLabel: "对方出生日期",
    partnerGenderLegend: "对方性别（可选）",
    partnerCalendarLegend: "对方阳历 / 阴历",
    partnerBirthTimeLabel: "对方出生时刻（可选）",
    partnerBirthTimeUnknownLabel: "不知道对方的出生时刻",
    partnerNote: "对方信息仅用于生成本次解读，不会保存到您的资料卡中。",
    submitButton: "查看结果",

    generatingAriaLabel: (interrupted) => (interrupted ? "情缘之书生成中断" : "情缘之书生成中"),
    generatingStatusLines: [
      "正在排出命式并权衡五行的分量",
      "正在为命盘十二宫安放星曜",
      "正在核对夫妻宫与日干是否一致",
      "正在寻找吸引与冲突开始的地方",
      "正在叠加过往大运与即将到来的流年",
      "正在誊写最后的信笺",
    ],
    generatingInterruptedLabel: "Interrupted",
    generatingProgressAriaLabel: "情缘之书完成进度",
    generatingNameLine: (name) => `正在为${name}撰写情缘之书`,
    generatingNamelessLine: "正在为您撰写情缘之书",
    generatingCompletedTitlesAriaLabel: "已完成的章节",
    retryButton: "继续撰写",
    openStoredButton: "打开目前已写好的书",
    generatingFooterNote: "即使关闭窗口，目前已写好的章节仍会保存。再次进入即可继续完成。",

    prologueAriaLabel: "序章",
    prologueSkipButton: "跳过",
    prologueChoiceHint: "选择一项后，恋爱高人将会回答。",
    prologueContinueButton: "继续",
    prologueOpenBookButton: "翻开书本",
    dialogueAdvanceAriaLabel: "前进到下一句",
    dialogueRevealAriaLabel: "显示全部台词",
    dialogueTapHint: "点击可立即显示",
    dialogueDefaultCta: "继续",

    actAriaLabel: (numeral, title) => `第${numeral}幕 ${title}`,

    chapterEvidenceAriaLabel: "解读依据是什么",
    chapterCautionTitle: "这段关系中需要留意的时刻",
    chapterActionsTitle: "现在可以做的事",
    chapterVisualizationDefaultTitle: "本章的走向",
    levelLow: "较弱",
    levelBalanced: "均衡",
    levelHigh: "较强",
    levelWatch: "需留意",
    levelOpportunity: "机会",
    chapterDetailSummary: "阅读详细咨询内容",
    chapterOkFalseNote: "本章再次打开时会补全。其他章节仍照常保存。",

    scoreSectionAriaLabel: "综合得分",
    scoreAriaLabel: (score, tier) => `综合得分100分中${score}分 · ${tier}`,
    scoreStarsAriaLabel: (stars) => `5星中${stars}星`,
    relationshipScoreEyebrow: "RELATIONSHIP SCORE",
    loveScoreEyebrow: "LOVE SCORE",
    loveDnaAriaLabel: "恋爱DNA",
    scoreTierExcellent: "非常合拍",
    scoreTierStrong: "十分合拍",
    scoreTierBalanced: "均衡合拍",
    scoreTierGrowing: "尚待磨合",
    scoreTierChallenging: "需要努力经营",

    metricAriaLabel: (label, score) => `${label} 100分中${score}分`,

    readerOpeningAriaLabel: "正在打开情缘之书",
    readerOpeningNote: "正在解开封印",
    readerAriaLabel: (bookTitle) => `${bookTitle} 正文`,
    possessiveBookTitle: (name, bookTitle) => (name ? `${name}的${bookTitle}` : bookTitle),
    pdfFileNamePrefix: "大师情缘之书",
    resumePromptAriaLabel: "恢复阅读位置",
    resumePromptLine: "您上次读到了这里。",
    resumeButton: "继续阅读",
    startOverButton: "从头开始",
    coverChapterCountSuffix: (count, chars) => `${count}章 · ${chars.toLocaleString("zh-CN")}字`,
    pdfBindingLabel: "正在装订成书",
    pdfDownloadButton: "保存为PDF",
    pdfDownloadError: "导出PDF时出现问题，请稍后再试。",

    reportOutroAriaLabel: "报告结语",
    generatedSuccessfullyAriaLabel: "高级报告",
    reportOutroChapterLine: (chapters, chars) => `${chapters}章 · ${chars.toLocaleString("zh-CN")}字`,
    reportOutroClosingLine: "本报告保存在您的账户中，无需再次付费即可随时查看。",

    reportStampSolo: "PREMIUM AI RELATIONSHIP REPORT",
    reportStampCompat: "PREMIUM AI COMPATIBILITY REPORT",
    narratorName: "恋爱高人",
    chapterOrderSrLabel: (order) => `第${order}章 · `,
    prologueSceneAlt: (title) => `${title}的场景`,
    pdfNameFallback: "情缘之书",
    pdfCoverSubtitle: (chapters, typeName) => (typeName ? `${typeName} · 共${chapters}章` : `共${chapters}章`),
    reportOutroAccessLine: (productTitle, includedWithPass) => (includedWithPass ? `这是以通行证阅览的${productTitle}高级 AI 咨询报告。` : `本报告是${productTitle}高级 AI 咨询的结果。`),
    resultMissingSessionIdError: "没有保管编号。请从书房重新选择情缘之书。",
    resultUnstableRefreshError: "连接暂时不稳定，请稍后刷新。",
    resultNotFoundError: "找不到你要的情缘之书。",
    resultLoadFailedError: "无法载入情缘之书。",
    resultLoadingAriaLabel: "正在打开保管的情缘之书",
    resultErrorAriaLabel: "无法打开情缘之书",
    resultNotFoundFallback: "找不到情缘之书。",
    resultBackToLanding: "返回情缘之书页面",
    resultIncompleteNotice: "这本情缘之书还没有写完。",
    resultContinueWriting: "继续书写",
    birthTimeUnknownShort: "出生时辰未知",
    passIncludedNote: "已包含在通行证内",
    monthlyCreditUsedNote: "已使用月石",

    sealAriaLabel: "封印",
    continueDestinyButton: "打开命运地图",
    narratorReadingAlt: "正在读书的恋爱高人",
    narratorClosingAlt: "合上情缘之书的恋爱高人",

    bgmOnAriaLabel: "关闭情缘之书背景音乐",
    bgmOffAriaLabel: "开启情缘之书背景音乐",
    actNotReadySuffix: "（尚未写成）",
    actNavAriaLabel: "跳转到幕",
  },
  "zh-TW": {
    errorText: {
      LOGIN_REQUIRED: "打開情緣之書需要先登入。",
      PAYMENT_REQUIRED: "本次解讀需要付費。",
      PAYMENT_VERIFY_FAILED: "尚未確認付款完成。若您已完成付款，請稍後再試。",
      PAYMENT_CANCELLED: "付款已取消。",
      INVALID_INPUT: "請確認出生日期與出生時刻。",
      PARTNER_INPUT_REQUIRED: "要解讀合婚需要對方的出生日期。若不想填寫，請點擊「清除對方資訊，改為個人解讀」。",
      CALCULATION_FAILED: "未能排出命式與命盤，請確認輸入內容。",
      GENERATION_IN_PROGRESS: "已在另一個視窗中繼續撰寫，請稍後再試。",
      GENERATION_BUDGET_EXCEEDED: "生成正在延遲。目前已寫好的章節已保存，可以繼續撰寫。",
      DB_DEGRADED: "連線暫時不穩定，請稍後再試。",
      EDGE_TIMEOUT: "伺服器回應逾時。目前已寫好的章節已保存，可以繼續撰寫。",
      SERVER_ERROR: "準備情緣之書時發生了問題。",
      NETWORK_ERROR: "連線不穩定，請稍後再試。",
    },
    gateCheckTitle: "正在確認通行證",
    gateCompleteTitle: "確認完成",
    gateCompleteOpenMessage: "正在展開情緣之書。",
    gateAlreadyPaidTitle: "付款確認",
    gateAlreadyPaidMessage: "該次解讀已付款，繼續為您展開。",
    gateFailTitle: "確認失敗",
    paymentBusyLabel: "付款處理中...",
    passCheckBusyLabel: "正在確認通行證...",
    paymentBusyShortLabel: "付款中...",
    passCheckBusyShortLabel: "確認中...",

    backButton: "返回",
    homeButton: "回首頁",
    navAriaLabel: "頁面導覽",

    heroDescription: (chapterCount) =>
      `分別排出兩人的四柱命盤與紫微斗數命盤後，由AI在${chapterCount}章中進行綜合分析。`,
    starRatingAriaLabel: "評分5星",
    expertReportSuffix: (chapterCount) => `專業諮詢水準的${chapterCount}章報告`,
    coverImageAlt: "在神秘圖書館中展開的戀愛策略書",
    pricingSectionAriaLabel: "諮詢方案與價格",
    pricingTitle: "想怎麼為您解讀",
    pricingDescription: (chapterCount) =>
      `獨自閱讀可解讀您的戀愛方式，兩人共讀則解讀兩人的關係。無論哪種都是相同的${chapterCount}章結構，結果永久保存，無需再次付費。`,
    whyPremiumAriaLabel: "為什麼選擇高級諮詢",
    startSectionAriaLabel: "開始諮詢",
    startNowButton: "立即開始",
    enterLibraryButton: "進入圖書館",
    replayPrologueButton: "重看序章",
    floatingStartLabel: "開始諮詢",
    entryAriaLabel: (title) => `進入${title}`,

    recommendedBadge: "推薦",
    personalEyebrow: "PERSONAL READING",
    personalTitle: "個人解讀",
    personalNote: "解讀您一個人的戀愛",
    compatEyebrow: "COMPATIBILITY READING",
    compatTitle: "合婚解讀",
    compatNote: "解讀兩人的關係",
    paymentDisclosure: "一次付費 · 結果永久保存 · 免費重新查看",
    startConsultButton: "開始諮詢",
    chaptersActsSuffix: (chapters) => `${chapters}章 · 5幕`,

    whyPremiumTitle: "為什麼不是普通運勢",
    trustStripAriaLabel: "服務信任要素",

    birthGateAriaLabel: "輸入出生資訊",
    birthGateTitle: "為您排出命式與命盤",
    birthGateDesc: "需要出生那一刻的座標才能填滿二十章。若有個人資料卡會自動填入。",
    crossReadEyebrow: "兩張命盤交叉解讀",
    chaptersActsEyebrow: "二十章 · 五幕",
    honestNoteEyebrow: "想提前告訴您的事",
    reloadFromProfileButton: "從資料卡載入",
    nameLabel: "姓名（可選）",
    namePlaceholder: "將鐫刻於封面",
    genderLegend: "性別",
    genderFemale: "女性",
    genderMale: "男性",
    birthDateLabel: "出生日期",
    calendarLegend: "陽曆 / 陰曆",
    calendarSolar: "陽曆",
    calendarLunar: "陰曆",
    leapMonthLabel: "是閏月",
    birthTimeLabel: "出生時刻",
    birthTimeUnknownLabel: "不知道出生時刻",
    birthTimeUnknownNote: "不知道時刻時，將排除時柱進行解讀。整體走向不變，但細節會略顯模糊。",
    partnerSectionEyebrow: "再加一位",
    partnerSectionTitle: "也可以解讀與對方的合婚",
    partnerSectionDesc: "填入對方的出生日期，將轉為交叉解讀四張命盤（兩人的命式與命盤）的二十章合婚解讀。不填則如現在一樣只解讀您一個人的戀愛。費用也會隨合婚解讀一同變化。",
    partnerToggleAdd: "解讀與對方的合婚",
    partnerToggleRemove: "清除對方資訊，改為個人解讀",
    partnerNameLabel: "對方姓名（可選）",
    partnerNamePlaceholder: "正文中將如此稱呼對方",
    partnerBirthDateLabel: "對方出生日期",
    partnerGenderLegend: "對方性別（可選）",
    partnerCalendarLegend: "對方陽曆 / 陰曆",
    partnerBirthTimeLabel: "對方出生時刻（可選）",
    partnerBirthTimeUnknownLabel: "不知道對方的出生時刻",
    partnerNote: "對方資訊僅用於生成本次解讀，不會保存到您的資料卡中。",
    submitButton: "查看結果",

    generatingAriaLabel: (interrupted) => (interrupted ? "情緣之書生成中斷" : "情緣之書生成中"),
    generatingStatusLines: [
      "正在排出命式並權衡五行的分量",
      "正在為命盤十二宮安放星曜",
      "正在核對夫妻宮與日干是否一致",
      "正在尋找吸引與衝突開始的地方",
      "正在疊加過往大運與即將到來的流年",
      "正在謄寫最後的信箋",
    ],
    generatingInterruptedLabel: "Interrupted",
    generatingProgressAriaLabel: "情緣之書完成進度",
    generatingNameLine: (name) => `正在為${name}撰寫情緣之書`,
    generatingNamelessLine: "正在為您撰寫情緣之書",
    generatingCompletedTitlesAriaLabel: "已完成的章節",
    retryButton: "繼續撰寫",
    openStoredButton: "打開目前已寫好的書",
    generatingFooterNote: "即使關閉視窗，目前已寫好的章節仍會保存。再次進入即可繼續完成。",

    prologueAriaLabel: "序章",
    prologueSkipButton: "跳過",
    prologueChoiceHint: "選擇一項後，戀愛高人將會回答。",
    prologueContinueButton: "繼續",
    prologueOpenBookButton: "翻開書本",
    dialogueAdvanceAriaLabel: "前進到下一句",
    dialogueRevealAriaLabel: "顯示全部台詞",
    dialogueTapHint: "點擊可立即顯示",
    dialogueDefaultCta: "繼續",

    actAriaLabel: (numeral, title) => `第${numeral}幕 ${title}`,

    chapterEvidenceAriaLabel: "解讀依據是什麼",
    chapterCautionTitle: "這段關係中需要留意的時刻",
    chapterActionsTitle: "現在可以做的事",
    chapterVisualizationDefaultTitle: "本章的走向",
    levelLow: "較弱",
    levelBalanced: "均衡",
    levelHigh: "較強",
    levelWatch: "需留意",
    levelOpportunity: "機會",
    chapterDetailSummary: "閱讀詳細諮詢內容",
    chapterOkFalseNote: "本章再次打開時會補全。其他章節仍照常保存。",

    scoreSectionAriaLabel: "綜合得分",
    scoreAriaLabel: (score, tier) => `綜合得分100分中${score}分 · ${tier}`,
    scoreStarsAriaLabel: (stars) => `5星中${stars}星`,
    relationshipScoreEyebrow: "RELATIONSHIP SCORE",
    loveScoreEyebrow: "LOVE SCORE",
    loveDnaAriaLabel: "戀愛DNA",
    scoreTierExcellent: "非常合拍",
    scoreTierStrong: "十分合拍",
    scoreTierBalanced: "均衡合拍",
    scoreTierGrowing: "尚待磨合",
    scoreTierChallenging: "需要努力經營",

    metricAriaLabel: (label, score) => `${label} 100分中${score}分`,

    readerOpeningAriaLabel: "正在打開情緣之書",
    readerOpeningNote: "正在解開封印",
    readerAriaLabel: (bookTitle) => `${bookTitle} 正文`,
    possessiveBookTitle: (name, bookTitle) => (name ? `${name}的${bookTitle}` : bookTitle),
    pdfFileNamePrefix: "大師情緣之書",
    resumePromptAriaLabel: "恢復閱讀位置",
    resumePromptLine: "您上次讀到了這裡。",
    resumeButton: "繼續閱讀",
    startOverButton: "從頭開始",
    coverChapterCountSuffix: (count, chars) => `${count}章 · ${chars.toLocaleString("zh-TW")}字`,
    pdfBindingLabel: "正在裝訂成書",
    pdfDownloadButton: "保存為PDF",
    pdfDownloadError: "匯出PDF時發生問題，請稍後再試。",

    reportOutroAriaLabel: "報告結語",
    generatedSuccessfullyAriaLabel: "高級報告",
    reportOutroChapterLine: (chapters, chars) => `${chapters}章 · ${chars.toLocaleString("zh-TW")}字`,
    reportOutroClosingLine: "本報告保存在您的帳戶中，無需再次付費即可隨時查看。",

    reportStampSolo: "PREMIUM AI RELATIONSHIP REPORT",
    reportStampCompat: "PREMIUM AI COMPATIBILITY REPORT",
    narratorName: "戀愛高人",
    chapterOrderSrLabel: (order) => `第${order}章 · `,
    prologueSceneAlt: (title) => `${title}的場景`,
    pdfNameFallback: "情緣之書",
    pdfCoverSubtitle: (chapters, typeName) => (typeName ? `${typeName} · 共${chapters}章` : `共${chapters}章`),
    reportOutroAccessLine: (productTitle, includedWithPass) => (includedWithPass ? `這是以通行證閱覽的${productTitle}進階 AI 諮詢報告。` : `本報告是${productTitle}進階 AI 諮詢的結果。`),
    resultMissingSessionIdError: "沒有保管編號。請從書房重新選擇情緣之書。",
    resultUnstableRefreshError: "連線暫時不穩定，請稍後重新整理。",
    resultNotFoundError: "找不到你要的情緣之書。",
    resultLoadFailedError: "無法載入情緣之書。",
    resultLoadingAriaLabel: "正在開啟保管的情緣之書",
    resultErrorAriaLabel: "無法開啟情緣之書",
    resultNotFoundFallback: "找不到情緣之書。",
    resultBackToLanding: "返回情緣之書頁面",
    resultIncompleteNotice: "這本情緣之書還沒有寫完。",
    resultContinueWriting: "繼續書寫",
    birthTimeUnknownShort: "出生時辰未知",
    passIncludedNote: "已包含在通行證內",
    monthlyCreditUsedNote: "已使用月石",

    sealAriaLabel: "封印",
    continueDestinyButton: "打開命運地圖",
    narratorReadingAlt: "正在讀書的戀愛高人",
    narratorClosingAlt: "合上情緣之書的戀愛高人",

    bgmOnAriaLabel: "關閉情緣之書背景音樂",
    bgmOffAriaLabel: "開啟情緣之書背景音樂",
    actNotReadySuffix: "（尚未寫成）",
    actNavAriaLabel: "跳轉到幕",
  },
  en: MASTER_LOVE_CODEX_COPY_EN,
};

export function getMasterLoveCodexCopy(locale: LoadingLocale): MasterLoveCodexCopy {
  return { ...MASTER_LOVE_CODEX_COPY_EN, ...(MASTER_LOVE_CODEX_COPY[locale] || {}) };
}

/**
 * `codexAccessLabel(accessType).noteKey` 를 화면 문구로 옮긴다.
 *
 * 🔴 판정은 `data/premium.ts` 가 갖고 문장은 여기가 갖는다. 이 함수가 없으면 두 소비처
 * (CodexGenerating·CodexReportStamp)가 각자 키를 문장에 매핑하게 되고, 실제로 그렇게 갈라져
 * 있던 동안 CodexGenerating 은 한국어를 로케일 불문 그대로 찍고 있었다.
 */
export function codexAccessNoteText(copy: MasterLoveCodexCopy, noteKey: CodexAccessNoteKey): string {
  if (noteKey === "pass") return copy.passIncludedNote;
  if (noteKey === "monthly_credit") return copy.monthlyCreditUsedNote;
  return "";
}

export function useMasterLoveCodexLocale(): LoadingLocale {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    sync();
    window.addEventListener("cd:locale-ready", sync);
    return () => {
      window.removeEventListener("cd:locale-ready", sync);
    };
  }, []);
  return locale;
}

/**
 * 🔴 돌려주는 객체는 **렌더마다 새것**이다 — getMasterLoveCodexCopy 가 EN 과 스프레드 병합을 한다.
 *    그래서 이 값을 useCallback·useEffect·useMemo 의 의존성 배열에 그대로 넣으면 매 렌더 무효화되고,
 *    그 콜백을 보는 effect 가 다시 돌아 **무한 루프**가 된다(fetch 를 하는 effect 면 무한 요청).
 *    의존성으로 써야 하면 이 훅 대신 `useMasterLoveCodexLocale()` + `useMemo` 로 신원을 고정할 것
 *    (정본: app/master-love-codex/result/MasterLoveCodexResultClient.tsx).
 */
export function useMasterLoveCodexCopy(): MasterLoveCodexCopy {
  const locale = useMasterLoveCodexLocale();
  return getMasterLoveCodexCopy(locale);
}
