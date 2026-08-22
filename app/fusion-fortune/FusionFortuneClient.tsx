"use client";

import { birthDateTextInputProps } from "@/lib/birthDateInputProps";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { authFetch } from "../_lib/auth-client";
import { getApiBaseUrl } from "../_lib/api-config";
import { useAiProfileSeed } from "../hooks/useAiProfileSeed";
import { useCoinGate } from "../hooks/useCoinGate";
import { PriceBadge } from "../components/PriceBadge";
import { FUSION_ORB_BY_KEY, FUSION_ORBS, type FusionSystemKey } from "./fusionOrbs";
import { FusionRecentList, type FusionRecentItem } from "./FusionRecentList";
import { FusionResultThread } from "./FusionResultThread";
import {
  FusionOrb,
  ThreadBubble,
  ThreadRow,
  ThreadSpeaker,
  TypingDots,
  buildFusionStages,
  initialStageStates,
  type FusionStageKey,
  type FusionStageState,
  type Result,
} from "./fusion-thread";
import { useFusionSharedCopy } from "./_lib/copy";
import styles from "./fusion-fortune.module.css";
import { getCurrentLoadingLocale, INTL_LOCALE_BY_LOADING_LOCALE, type LoadingLocale } from "@/constants/loadingMessages";

type Status = {
  isLoggedIn: boolean;
  pricing?: { featureKey?: string };
  canGenerate: boolean;
  nextAction: "login" | "generate" | "disabled";
  message: string;
  cta?: { targetPath: string };
};

type BirthPlaceOption = { label: string; tz: string; lon: number; lat: number; country?: string };
type BirthPlaceGroup = { label?: string; places?: BirthPlaceOption[] };

declare global {
  interface Window { BIRTH_PLACE_GROUPS?: BirthPlaceGroup[] }
}

/**
 * 첫 렌더의 자리표시자. 🔴 문구를 넣지 않는다 — "이용 상태를 확인하고 있어요" 는 사용자가
 * 알 필요 없는 내부 상태였고, 상태가 오기 전 화면을 그 문장으로 채울 이유가 없다.
 * 서버가 주는 실제 안내(로그인 필요·준비 중·입력 안내)만 표시한다.
 */
const EMPTY_STATUS: Status = {
  isLoggedIn: false,
  canGenerate: false,
  nextAction: "disabled",
  message: "",
};

/** 회당 결제 키. 가격 정본은 worker/lib/paid-feature-registry.js (300코인 = 30,000원). */
const PAID_FEATURE_KEY = "fusion-fortune-consultation";
const PAID_COIN_PRICE = 300;
const PAID_AMOUNT_KRW = 30000;

const DEFAULT_BIRTH_PLACES: BirthPlaceOption[] = [{ label: "대한민국 · 서울", tz: "Asia/Seoul", lon: 126.978, lat: 37.5665, country: "KR" }];
const FUSION_HANDOFF_KEY = "cdGuardianFusionHandoffV1";

/**
 * 결제 증빙 id 보관 키.
 *
 * 🔴 메모리(ref)에만 두면 생성이 멈춘 화면에서 사용자가 새로고침하는 순간 id 가 사라지고,
 * 다음 제출이 **새 id 로 결제를 한 번 더** 요청한다. 서버는 requestId 로만 증빙을 찾으므로
 * (worker/lib/nakshatra-paid-access.js 의 findPaidPayment) 잃어버린 id 에 묶인 30,000원은
 * 회수할 방법이 없다. 결과를 실제로 받은 뒤에만 지운다.
 */
const PAID_REQUEST_KEY = "cdFusionPaidRequestIdV1";

/** 서버 심박이 15초 간격이라 세 번을 놓치면 연결이 끊긴 것으로 본다. */
const STREAM_SILENCE_MS = 45000;

function readStoredPaidRequestId(): string {
  if (typeof window === "undefined") return "";
  try { return window.sessionStorage.getItem(PAID_REQUEST_KEY) || ""; } catch { return ""; }
}

function storePaidRequestId(value: string) {
  if (typeof window === "undefined") return;
  try {
    if (value) window.sessionStorage.setItem(PAID_REQUEST_KEY, value);
    else window.sessionStorage.removeItem(PAID_REQUEST_KEY);
  } catch {
    // 저장소를 못 써도 이번 화면의 ref 는 그대로 동작한다 — 새로고침 복구만 못 할 뿐이다.
  }
}

/**
 * 입력폼의 각 항목을 실제로 읽는 체계. 장식이 아니라 "이 정보를 누가 쓰는가"의 축소판이다
 * — 근거는 각 필드의 기존 안내 문구(생시=명반·라그나·상승궁·하우스, 출생지=베다점·서양
 * 점성술)를 그대로 따른다. "all"은 여섯 체계 전부가 함께 읽는 항목(주제·고민)에 쓴다.
 */
const FIELD_SYSTEMS: Record<string, FusionSystemKey[] | "all"> = {
  birthDate: ["saju", "ziwei", "vedic", "sukuyo", "astrology"],
  birthTime: ["ziwei", "vedic", "astrology"],
  birthPlace: ["vedic", "astrology"],
  calendarType: ["saju", "ziwei"],
  gender: ["ziwei"],
  topic: "all",
  concern: "all",
};

/** 폼 항목 옆의 작은 신호 점. 색은 fusionOrbs.ts 의 체계별 tint 그대로 — 새 색을 만들지 않는다. */
function FieldSystems({ field, copy }: { field: keyof typeof FIELD_SYSTEMS; copy: FusionFortuneCopy }) {
  const mapped = FIELD_SYSTEMS[field];
  if (!mapped) return null;
  if (mapped === "all") {
    return (
      <span className={styles.fieldSystems} title={copy.fieldSystemsAllTitle}>
        <i aria-hidden className={`${styles.systemDot} ${styles.systemDotAll}`} />
        <span className="sr-only">{copy.fieldSystemsAllSrOnly}</span>
      </span>
    );
  }
  const label = mapped.map((key) => FUSION_ORB_BY_KEY[key].label).join(" · ");
  return (
    <span className={styles.fieldSystems} title={copy.fieldSystemsTitle(label)}>
      {mapped.map((key) => <i key={key} aria-hidden className={styles.systemDot} style={{ "--tint": FUSION_ORB_BY_KEY[key].tint } as React.CSSProperties} />)}
      <span className="sr-only">{copy.fieldSystemsSrOnly(label)}</span>
    </span>
  );
}

async function parseJson<T>(response: Response, copy: FusionFortuneCopy): Promise<T> {
  if (!response.headers.get("content-type")?.includes("application/json")) throw new Error(copy.serverResponseInvalidMessage);
  return response.json() as Promise<T>;
}

async function consumeFusionStream(
  response: Response,
  copy: FusionFortuneCopy,
  onEvent: (event: string, payload: Record<string, unknown>) => void,
): Promise<Record<string, unknown>> {
  if (!response.ok || !response.body || !response.headers.get("content-type")?.includes("text/event-stream")) {
    const fallback = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(fallback.message || copy.streamStartFailedMessage);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalPayload: Record<string, unknown> | null = null;
  const processBlock = (block: string) => {
    let event = "message";
    let data = "";
    block.split(/\r?\n/).forEach((line) => {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      if (line.startsWith("data:")) data += line.slice(5).trim();
    });
    if (!data) return;
    const payload = JSON.parse(data) as Record<string, unknown>;
    onEvent(event, payload);
    if (event === "result") finalPayload = payload;
    if (event === "complete" && finalPayload) finalPayload = { ...finalPayload, ...payload };
    if (event === "error") {
      // 서버는 status(402/503)·retryable 을 함께 싣는다. message 만 읽고 버리면 재시도로
      // 해결되는 실패인지 결제가 필요한 실패인지 화면이 구분할 수 없다.
      const failure = new Error(String(payload.message || copy.analysisFailedMessage));
      throw Object.assign(failure, {
        retryable: payload.retryable === true,
        httpStatus: Number(payload.status) || 0,
        // 계약 위반 코드만 온다(본문·개인정보 없음). 같은 실패가 반복될 때 사용자가 문의에 적을 근거다.
        errorCode: String(payload.error || ""),
        issues: Array.isArray(payload.issues) ? payload.issues.map(String) : [],
      });
    }
  };
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        processBlock(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf("\n\n");
      }
    }
    if (buffer.trim()) processBlock(buffer);
  } finally {
    reader.releaseLock();
  }
  if (!finalPayload) throw new Error(copy.noResultReceivedMessage);
  return finalPayload;
}

type FusionFortuneCopy = {
  statusInvalidMessage: string;
  statusUnavailableMessage: string;
  fieldSystemsAllTitle: string;
  fieldSystemsAllSrOnly: string;
  fieldSystemsTitle: (label: string) => string;
  fieldSystemsSrOnly: (label: string) => string;
  serverResponseInvalidMessage: string;
  streamStartFailedMessage: string;
  analysisFailedMessage: string;
  noResultReceivedMessage: string;
  storedResultLoadFailedMessage: string;
  guardianHandoffNotice: string;
  guardianHandoffPrefix: string;
  guardianHandoffSuffix: string;
  birthInputRequiredMessage: string;
  paymentReason: string;
  paymentFailedMessage: string;
  stageDefaultProgressMessage: string;
  resultGenerationFailedMessage: string;
  resultCompletedNotice: string;
  analysisCancelledNotice: string;
  shareSuccessNotice: string;
  shareFailedMessage: string;
  copyLinkSuccessNotice: string;
  copyLinkFailedMessage: string;
  pdfCoverFallbackTitle: string;
  pdfCoverSubtitle: (topic: string) => string;
  pdfSavedNotice: string;
  pdfFailedMessage: string;
  buttonLoadingLabel: string;
  buttonPayingLabel: string;
  buttonLoginLabel: string;
  buttonResumeLabel: string;
  buttonSubmitLabel: string;
  navAriaLabel: string;
  threadAriaLabel: string;
  navBack: string;
  navHome: string;
  guardianLinkText: string;
  heroTitleLine1: string;
  heroTitleLine2: string;
  heroDesc: string;
  heroFirstCome: string;
  heroPriceFallback: string;
  heroPricePrefix: string;
  heroWordCount: string;
  heroSaveNote: string;
  chatLead: string;
  readingFlowAriaLabel: string;
  readingFlowLead: string;
  readingFlowFinalTitle: string;
  readingFlowFinalDesc: string;
  statusScopeLabel: string;
  statusScopeValue: string;
  statusScopeNote: string;
  statusMethodLabel: string;
  statusMethodValue: string;
  statusMethodNote: string;
  coreButtonLabel: string;
  formIntroHeading: string;
  formIntroDesc: string;
  systemsLegendLabel: string;
  profileReloadCta: string;
  formSectionBirth: string;
  birthDateLabel: string;
  birthTimeLabel: string;
  birthTimeUnknownLabel: string;
  birthTimeUnknownNote: string;
  birthPlaceLabel: string;
  birthPlaceUnknownOption: string;
  birthPlaceNote: string;
  calendarTypeLabel: string;
  calendarSolarLabel: string;
  calendarLunarLabel: string;
  genderLabel: string;
  optionalTag: string;
  genderUnspecifiedOption: string;
  genderFemaleOption: string;
  genderMaleOption: string;
  formSectionMind: string;
  nicknameLabel: string;
  nicknamePlaceholder: string;
  topicLabel: string;
  topicOptionOverall: string;
  topicOptionLove: string;
  topicOptionWorkMoney: string;
  topicOptionMind: string;
  concernLabel: string;
  concernPlaceholder: string;
  pendingRequestNoticePrefix: string;
  pendingRequestNoticeBold: string;
  pendingRequestNoticeSuffix: string;
  statusRetryCta: string;
  threadHeadingFailure: string;
  threadHeadingDefault: string;
  threadSubResultSaved: string;
  threadSubResultFresh: string;
  threadSubFailure: string;
  threadSubIdle: string;
  stagesCompletedPrefix: string;
  stagesCompletedSuffix: string;
  speakerFusionLabel: string;
  speakerCompletedBadge: string;
  speakerWritingBadge: string;
  composeRepairSuffix: string;
  composeDoneSuffix: string;
  composeRepairNote: string;
  composeNormalNote: string;
  stalledNotice: string;
  waitingSuffix: string;
  qualityNoticeHeading: string;
  failureHeading: string;
  failureReasonPrefix: string;
  failureReasonSuffix: string;
  failureRetryCta: string;
  cancelGenerationCta: string;
  pdfMakingLabel: string;
  pdfSaveCta: string;
  shareCta: string;
  copyReopenLinkCta: string;
  continueGuardianLink: string;
  dialogCloseAria: string;
  dialogCloseLabel: string;
  dialogKicker: string;
  dialogHeading: string;
  dialogDesc: string;
  dialogNote: string;
};

const FUSION_FORTUNE_EN: FusionFortuneCopy = {
  statusInvalidMessage: "The usage status response wasn't valid.",
  statusUnavailableMessage: "We couldn't check your usage status. Please try again in a moment.",
  fieldSystemsAllTitle: "Systems that read this: all six systems",
  fieldSystemsAllSrOnly: "The systems that read this information: all six systems",
  fieldSystemsTitle: (label) => `Systems that read this: ${label}`,
  fieldSystemsSrOnly: (label) => `The systems that read this information: ${label}`,
  serverResponseInvalidMessage: "We couldn't confirm the server response.",
  streamStartFailedMessage: "We couldn't start the analysis connection.",
  analysisFailedMessage: "We couldn't complete the analysis.",
  noResultReceivedMessage: "We didn't receive an analysis result. Please try again.",
  storedResultLoadFailedMessage: "We couldn't load the saved result.",
  guardianHandoffNotice: "We carried over only the topic Yeoni left. Please recheck your birth information and question here.",
  guardianHandoffPrefix: "We carried over only the topic ",
  guardianHandoffSuffix: " that Yeoni left. Your private conversation and the original result weren't brought over.",
  birthInputRequiredMessage: "Please enter your birth date and time, or select the option for not knowing your birth time.",
  paymentReason: "One Fusion Fortune consultation",
  paymentFailedMessage: "We couldn't complete the payment. Please try again in a moment.",
  stageDefaultProgressMessage: "Organizing your Fusion Fortune reading.",
  resultGenerationFailedMessage: "We couldn't generate the result.",
  resultCompletedNotice: "Your result is complete. It's saved to your account so you can reopen it anytime.",
  analysisCancelledNotice: "The analysis was stopped. Retrying with the same request won't charge you again.",
  shareSuccessNotice: "Shared a summary that excludes personal information.",
  shareFailedMessage: "We couldn't share this. Please try again in a moment.",
  copyLinkSuccessNotice: "Copied a link you can reopen. You'll need to log into your own account to view it.",
  copyLinkFailedMessage: "We couldn't copy the link.",
  pdfCoverFallbackTitle: "Fusion Fortune",
  pdfCoverSubtitle: (topic) => `Six-system cross reading · ${topic}`,
  pdfSavedNotice: "Saved as a PDF.",
  pdfFailedMessage: "We couldn't create the PDF. Please try again in a moment.",
  buttonLoadingLabel: "Weaving the six experts' readings together…",
  buttonPayingLabel: "Confirming your payment",
  buttonLoginLabel: "Log in to get started",
  buttonResumeLabel: "Continue with no additional charge",
  buttonSubmitLabel: "Generate my Fusion Fortune",
  navAriaLabel: "Fusion Fortune exploration",
  threadAriaLabel: "Fusion Fortune consultation conversation",
  navBack: "Back",
  navHome: "Home",
  guardianLinkText: "A premium reading that continues from Today's Benefactor",
  heroTitleLine1: "Six readings,",
  heroTitleLine2: "one consultation",
  heroDesc: "We read Saju, Ziwei Doushu, Vedic astrology, Sukuyo, Western astrology, and Tarot deeply, each in its own language, then bring them together into a single cross reading. Your finished consultation is saved to your account so you can reopen it anytime and download it as a PDF.",
  heroFirstCome: "Six-system cross reading",
  heroPriceFallback: "₩30,000",
  heroPricePrefix: "per reading ",
  heroWordCount: "20,000+ characters",
  heroSaveNote: "Saved · Reopenable · PDF",
  chatLead: "Fusion AI tells you, right on this screen, as each of the six systems finishes.",
  readingFlowAriaLabel: "The order this Fusion reading follows",
  readingFlowLead: "The path this consultation follows",
  readingFlowFinalTitle: "One cross reading",
  readingFlowFinalDesc: "Signals that agree become the core pattern; signals that differ become situational options.",
  statusScopeLabel: "What this reading covers",
  statusScopeValue: "Six systems · 20,000+ characters",
  statusScopeNote: "Reads Saju, Ziwei Doushu, Vedic astrology, Sukuyo, Western astrology, and Tarot separately, then cross-reads them at the end.",
  statusMethodLabel: "How it's billed",
  statusMethodValue: "Paid per reading",
  statusMethodNote: "At checkout you can choose a pass, a one-time payment, or a Moonstone together. Family passes are covered.",
  coreButtonLabel: "See how Fusion Core works",
  formIntroHeading: "Connect all six systems with your exact birth time",
  formIntroDesc: "The information you enter isn't exposed in the result text or the shared summary.",
  systemsLegendLabel: "The six experts sharing this reading",
  profileReloadCta: "Reload my saved profile",
  formSectionBirth: "Tell us the moment you were born",
  birthDateLabel: "Birth date",
  birthTimeLabel: "Birth time",
  birthTimeUnknownLabel: "I don't know my birth time",
  birthTimeUnknownNote: "If unknown, we won't assert time-based readings like the natal chart, Lagna, Ascendant, or houses.",
  birthPlaceLabel: "Birthplace",
  birthPlaceUnknownOption: "I don't know my birthplace",
  birthPlaceNote: "Used for the location calculations in Vedic and Western astrology.",
  calendarTypeLabel: "Calendar type",
  calendarSolarLabel: "Solar",
  calendarLunarLabel: "Lunar",
  genderLabel: "Gender ",
  optionalTag: "(optional)",
  genderUnspecifiedOption: "Prefer not to say",
  genderFemaleOption: "Female",
  genderMaleOption: "Male",
  formSectionMind: "Tell us what's on your mind right now",
  nicknameLabel: "Nickname ",
  nicknamePlaceholder: "Name to use in your result",
  topicLabel: "Topic of interest",
  topicOptionOverall: "Overall flow of life",
  topicOptionLove: "Love and relationships",
  topicOptionWorkMoney: "Work and money",
  topicOptionMind: "Mind and recovery",
  concernLabel: "Concern ",
  concernPlaceholder: "Please don't include personally identifying information.",
  pendingRequestNoticePrefix: "There's an already-paid request still waiting. Pressing the button below will get your result on the same request with ",
  pendingRequestNoticeBold: "no additional charge",
  pendingRequestNoticeSuffix: ".",
  statusRetryCta: "Recheck usage status",
  threadHeadingFailure: "The consultation stopped partway through",
  threadHeadingDefault: "The six experts are answering in turn",
  threadSubResultSaved: "This is a consultation saved to your account. You can download it as a PDF right from this screen.",
  threadSubResultFresh: "A conversation that reads all six systems separately, then cross-reads them into one at the end.",
  threadSubFailure: "We've kept everything as far as it got. You can retry and continue below.",
  threadSubIdle: "Getting ready to call in all six systems.",
  stagesCompletedPrefix: "",
  stagesCompletedSuffix: " of six systems complete",
  speakerFusionLabel: "Fusion Core",
  speakerCompletedBadge: "Done",
  speakerWritingBadge: "Writing",
  composeRepairSuffix: " group repaired",
  composeDoneSuffix: " reading group complete",
  composeRepairNote: "We're only rewriting the groups that came up short. The groups already finished stay as they are.",
  composeNormalNote: "This runs over 20,000 characters, so we write four groups at once. Whichever finishes first shows up first.",
  stalledNotice: "The connection has been quiet for a while. Your result is saved to your account the moment it's complete, so if the screen looks stuck, check your archive below.",
  waitingSuffix: " waiting their turn",
  qualityNoticeHeading: "Length notice",
  failureHeading: "Generation stopped",
  failureReasonPrefix: "Reason code ",
  failureReasonSuffix: " — if this keeps happening, please include this code when you contact us.",
  failureRetryCta: "Retry with no additional charge",
  cancelGenerationCta: "Stop the analysis",
  pdfMakingLabel: "Creating your PDF…",
  pdfSaveCta: "Save as PDF",
  shareCta: "Share summary (no personal info)",
  copyReopenLinkCta: "Copy reopen link",
  continueGuardianLink: "Continue with Today's Benefactor",
  dialogCloseAria: "Close the Fusion Core explanation",
  dialogCloseLabel: "Close",
  dialogKicker: "Fusion Core",
  dialogHeading: "Only completed analyses are connected",
  dialogDesc: "Saju, Ziwei Doushu, Sukuyo, Vedic astrology, Western astrology, and Tarot are each finished separately, then fused into one reading at the end.",
  dialogNote: "If an analysis is interrupted or fails, resending the same request continues it with no additional charge.",
};

const FUSION_FORTUNE_COPY: Partial<Record<LoadingLocale, FusionFortuneCopy>> = {
  ko: {
    statusInvalidMessage: "이용 상태 응답이 올바르지 않아요.",
    statusUnavailableMessage: "이용 상태를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.",
    fieldSystemsAllTitle: "읽는 체계: 여섯 체계 전체",
    fieldSystemsAllSrOnly: "이 정보를 읽는 체계: 여섯 체계 전체",
    fieldSystemsTitle: (label) => `읽는 체계: ${label}`,
    fieldSystemsSrOnly: (label) => `이 정보를 읽는 체계: ${label}`,
    serverResponseInvalidMessage: "서버 응답을 확인하지 못했어요.",
    streamStartFailedMessage: "분석 연결을 시작하지 못했어요.",
    analysisFailedMessage: "분석을 완료하지 못했어요.",
    noResultReceivedMessage: "분석 결과를 받지 못했어요. 다시 시도해 주세요.",
    storedResultLoadFailedMessage: "저장된 결과를 불러오지 못했어요.",
    guardianHandoffNotice: "연이가 남긴 주제만 이어받았어요. 출생 정보와 질문은 여기에서 다시 확인해 주세요.",
    guardianHandoffPrefix: "연이가 남긴 ",
    guardianHandoffSuffix: " 주제만 이어받았어요. 개인 대화와 결과 원문은 가져오지 않았습니다.",
    birthInputRequiredMessage: "생년월일과 생시를 입력하거나, 생시를 모르는 경우를 선택해 주세요.",
    paymentReason: "초융합 운세 상담 1회",
    paymentFailedMessage: "결제를 완료하지 못했어요. 잠시 후 다시 시도해 주세요.",
    stageDefaultProgressMessage: "초융합 리딩을 정리하고 있어요.",
    resultGenerationFailedMessage: "결과를 생성하지 못했어요.",
    resultCompletedNotice: "결과가 완성됐어요. 계정에 저장돼 언제든 다시 열 수 있어요.",
    analysisCancelledNotice: "분석을 중단했어요. 같은 요청으로 다시 시도해도 추가 결제는 없습니다.",
    shareSuccessNotice: "개인정보를 제외한 요약을 공유했어요.",
    shareFailedMessage: "공유하지 못했어요. 잠시 후 다시 시도해 주세요.",
    copyLinkSuccessNotice: "다시 열 수 있는 링크를 복사했어요. 본인 계정으로 로그인해야 열립니다.",
    copyLinkFailedMessage: "링크를 복사하지 못했어요.",
    pdfCoverFallbackTitle: "초융합 운세",
    pdfCoverSubtitle: (topic) => `여섯 체계 교차 판정 · ${topic}`,
    pdfSavedNotice: "PDF 로 저장했어요.",
    pdfFailedMessage: "PDF 를 만들지 못했어요. 잠시 후 다시 시도해 주세요.",
    buttonLoadingLabel: "여섯 전문가의 흐름을 엮는 중…",
    buttonPayingLabel: "결제를 확인하고 있어요",
    buttonLoginLabel: "로그인하고 시작하기",
    buttonResumeLabel: "추가 결제 없이 이어서 받기",
    buttonSubmitLabel: "초융합 운세 생성하기",
    navAriaLabel: "초융합 사주 탐색",
    threadAriaLabel: "초융합 상담 대화",
    navBack: "이전",
    navHome: "홈으로",
    guardianLinkText: "오늘의 귀인에서 이어지는 프리미엄 리딩",
    heroTitleLine1: "여섯 개의 해석을",
    heroTitleLine2: "하나의 상담으로",
    heroDesc: "사주·자미두수·베다점·숙요점·점성술·타로를 각 분야의 언어로 깊게 읽고, 마지막에 하나의 교차 판정으로 모읍니다. 완성된 상담은 계정에 저장돼 언제든 다시 열고 PDF 로 내려받을 수 있어요.",
    heroFirstCome: "여섯 체계 교차 판정",
    heroPriceFallback: "30,000원",
    heroPricePrefix: "1회 ",
    heroWordCount: "20,000자 이상",
    heroSaveNote: "저장 · 재열람 · PDF",
    chatLead: "Fusion AI가 여섯 체계의 완료 흐름을 이 화면에서 차례로 알려드려요.",
    readingFlowAriaLabel: "초융합 리딩이 지나가는 순서",
    readingFlowLead: "이 상담이 지나가는 길",
    readingFlowFinalTitle: "교차 판정 하나",
    readingFlowFinalDesc: "같은 신호는 핵심 패턴으로, 다른 신호는 상황별 선택지로.",
    statusScopeLabel: "이번 리딩이 읽는 범위",
    statusScopeValue: "여섯 체계 · 20,000자 이상",
    statusScopeNote: "사주·자미두수·베다점·숙요점·점성술·타로를 각각 읽고 마지막에 교차 판정합니다.",
    statusMethodLabel: "이용 방식",
    statusMethodValue: "회당 결제",
    statusMethodNote: "결제창에서 이용권·단건·월정석을 함께 고를 수 있어요. family 이용권은 커버됩니다.",
    coreButtonLabel: "Fusion Core 진행 방식 보기",
    formIntroHeading: "정확한 생시로 여섯 체계를 연결해요",
    formIntroDesc: "입력 정보는 결과 본문과 공유 요약에 노출하지 않습니다.",
    systemsLegendLabel: "이 상담을 나눠 읽는 여섯 전문가",
    profileReloadCta: "저장한 프로필 다시 불러오기",
    formSectionBirth: "태어난 순간을 알려주세요",
    birthDateLabel: "생년월일",
    birthTimeLabel: "생시",
    birthTimeUnknownLabel: "생시를 몰라요",
    birthTimeUnknownNote: "모르면 시간 기반 명반·라그나·상승궁·하우스를 단정하지 않아요.",
    birthPlaceLabel: "출생지",
    birthPlaceUnknownOption: "출생지를 몰라요",
    birthPlaceNote: "베다점·서양 점성술의 위치 계산에 사용해요.",
    calendarTypeLabel: "달력 기준",
    calendarSolarLabel: "양력",
    calendarLunarLabel: "음력",
    genderLabel: "성별 ",
    optionalTag: "(선택)",
    genderUnspecifiedOption: "선택하지 않음",
    genderFemaleOption: "여성",
    genderMaleOption: "남성",
    formSectionMind: "지금 이 마음을 들려주세요",
    nicknameLabel: "닉네임 ",
    nicknamePlaceholder: "결과에서 불릴 이름",
    topicLabel: "관심 주제",
    topicOptionOverall: "삶의 전반적인 흐름",
    topicOptionLove: "연애와 관계",
    topicOptionWorkMoney: "일과 돈",
    topicOptionMind: "마음과 회복",
    concernLabel: "고민 ",
    concernPlaceholder: "개인 식별 정보는 적지 말아 주세요.",
    pendingRequestNoticePrefix: "이미 결제가 끝난 요청이 남아 있어요. 아래 버튼을 누르면 ",
    pendingRequestNoticeBold: "추가 결제 없이",
    pendingRequestNoticeSuffix: " 같은 요청으로 결과를 받습니다.",
    statusRetryCta: "이용 상태 다시 확인하기",
    threadHeadingFailure: "상담이 중간에 멈췄어요",
    threadHeadingDefault: "여섯 전문가가 차례로 답하고 있어요",
    threadSubResultSaved: "계정에 저장된 상담입니다. 이 화면에서 바로 PDF 로 내려받을 수 있어요.",
    threadSubResultFresh: "여섯 체계를 각각 읽고, 마지막에 하나로 교차 판정한 대화입니다.",
    threadSubFailure: "진행된 곳까지 그대로 남겨 뒀어요. 아래에서 이어서 다시 시도할 수 있습니다.",
    threadSubIdle: "여섯 체계를 부를 준비를 하고 있어요.",
    stagesCompletedPrefix: "여섯 체계 중 ",
    stagesCompletedSuffix: "개 완료",
    speakerFusionLabel: "Fusion Core",
    speakerCompletedBadge: "완료",
    speakerWritingBadge: "쓰는 중",
    composeRepairSuffix: " 묶음 보완 완료",
    composeDoneSuffix: " 리딩 묶음 완성",
    composeRepairNote: "분량이 모자란 묶음만 다시 쓰고 있어요. 앞서 완성된 묶음은 그대로 남아 있습니다.",
    composeNormalNote: "2만 자가 넘는 분량이라 네 묶음을 동시에 씁니다. 먼저 끝난 묶음부터 표시돼요.",
    stalledNotice: "연결이 조용해진 지 좀 됐어요. 결과는 완성되는 즉시 계정에 저장되니, 화면이 멈춘 것 같으면 아래 보관함에서 다시 확인해 주세요.",
    waitingSuffix: " 차례를 기다리는 중",
    qualityNoticeHeading: "분량 안내",
    failureHeading: "생성이 멈췄어요",
    failureReasonPrefix: "사유 코드 ",
    failureReasonSuffix: " · 같은 실패가 반복되면 이 코드를 문의에 남겨 주세요.",
    failureRetryCta: "추가 결제 없이 다시 시도하기",
    cancelGenerationCta: "분석 중단하기",
    pdfMakingLabel: "PDF 를 만드는 중…",
    pdfSaveCta: "PDF 로 저장",
    shareCta: "개인정보 제외 요약 공유",
    copyReopenLinkCta: "다시 열 링크 복사",
    continueGuardianLink: "오늘의 귀인에게 이어서 묻기",
    dialogCloseAria: "Fusion Core 설명 닫기",
    dialogCloseLabel: "닫기",
    dialogKicker: "Fusion Core",
    dialogHeading: "완료된 분석만 연결합니다",
    dialogDesc: "사주, 자미두수, 숙요, 베다점, 점성술, 타로를 각각 마친 뒤 마지막에 하나의 읽기로 융합합니다.",
    dialogNote: "중단·실패한 분석은 같은 요청을 다시 보내면 추가 결제 없이 이어집니다.",
  },
  en: FUSION_FORTUNE_EN,
  ja: {
    statusInvalidMessage: "利用状況の応答が正しくありません。",
    statusUnavailableMessage: "利用状況を確認できませんでした。しばらくしてからもう一度お試しください。",
    fieldSystemsAllTitle: "読み取る体系: 六体系すべて",
    fieldSystemsAllSrOnly: "この情報を読み取る体系: 六体系すべて",
    fieldSystemsTitle: (label) => `読み取る体系: ${label}`,
    fieldSystemsSrOnly: (label) => `この情報を読み取る体系: ${label}`,
    serverResponseInvalidMessage: "サーバーの応答を確認できませんでした。",
    streamStartFailedMessage: "分析の接続を開始できませんでした。",
    analysisFailedMessage: "分析を完了できませんでした。",
    noResultReceivedMessage: "分析結果を受信できませんでした。もう一度お試しください。",
    storedResultLoadFailedMessage: "保存された結果を読み込めませんでした。",
    guardianHandoffNotice: "ヨニが残したテーマのみ引き継ぎました。出生情報と質問はこちらで再度ご確認ください。",
    guardianHandoffPrefix: "ヨニが残した",
    guardianHandoffSuffix: "というテーマのみ引き継ぎました。個人的な会話や結果原文は引き継いでいません。",
    birthInputRequiredMessage: "生年月日と出生時刻を入力するか、出生時刻が分からない場合を選択してください。",
    paymentReason: "フュージョン運勢相談 1回分",
    paymentFailedMessage: "決済を完了できませんでした。しばらくしてからもう一度お試しください。",
    stageDefaultProgressMessage: "フュージョンリーディングを整理しています。",
    resultGenerationFailedMessage: "結果を生成できませんでした。",
    resultCompletedNotice: "結果が完成しました。アカウントに保存され、いつでも再度開けます。",
    analysisCancelledNotice: "分析を中断しました。同じリクエストで再試行しても追加の決済はありません。",
    shareSuccessNotice: "個人情報を除いた要約を共有しました。",
    shareFailedMessage: "共有できませんでした。しばらくしてからもう一度お試しください。",
    copyLinkSuccessNotice: "再度開けるリンクをコピーしました。ご本人のアカウントでログインする必要があります。",
    copyLinkFailedMessage: "リンクをコピーできませんでした。",
    pdfCoverFallbackTitle: "フュージョン運勢",
    pdfCoverSubtitle: (topic) => `六体系クロス判定 · ${topic}`,
    pdfSavedNotice: "PDFとして保存しました。",
    pdfFailedMessage: "PDFを作成できませんでした。しばらくしてからもう一度お試しください。",
    buttonLoadingLabel: "六人の専門家の流れをまとめています…",
    buttonPayingLabel: "決済を確認しています",
    buttonLoginLabel: "ログインして始める",
    buttonResumeLabel: "追加決済なしで続きを受け取る",
    buttonSubmitLabel: "フュージョン運勢を生成する",
    navAriaLabel: "フュージョン四柱探索",
    threadAriaLabel: "フュージョン相談の会話",
    navBack: "戻る",
    navHome: "ホームへ",
    guardianLinkText: "今日の貴人から続くプレミアムリーディング",
    heroTitleLine1: "六つの解釈を",
    heroTitleLine2: "ひとつの相談に",
    heroDesc: "四柱推命・紫微斗数・ヴェーダ占星術・宿曜・西洋占星術・タロットをそれぞれの分野の言葉で深く読み解き、最後にひとつのクロス判定にまとめます。完成した相談はアカウントに保存され、いつでも再度開いてPDFとしてダウンロードできます。",
    heroFirstCome: "六体系クロス判定",
    heroPriceFallback: "₩30,000",
    heroPricePrefix: "1回 ",
    heroWordCount: "20,000字以上",
    heroSaveNote: "保存 · 再閲覧 · PDF",
    chatLead: "Fusion AIが六体系の完了状況をこの画面で順番にお知らせします。",
    readingFlowAriaLabel: "フュージョンリーディングが進む順序",
    readingFlowLead: "この相談が進む道のり",
    readingFlowFinalTitle: "ひとつのクロス判定",
    readingFlowFinalDesc: "一致する信号は核心パターンに、異なる信号は状況別の選択肢になります。",
    statusScopeLabel: "今回のリーディングが読み取る範囲",
    statusScopeValue: "六体系 · 20,000字以上",
    statusScopeNote: "四柱推命・紫微斗数・ヴェーダ占星術・宿曜・西洋占星術・タロットをそれぞれ読み解き、最後にクロス判定します。",
    statusMethodLabel: "利用方式",
    statusMethodValue: "都度決済",
    statusMethodNote: "決済画面で利用権・都度決済・月姫石を一緒に選べます。ファミリー利用権は対象になります。",
    coreButtonLabel: "Fusion Coreの進め方を見る",
    formIntroHeading: "正確な出生時刻で六体系をつなげます",
    formIntroDesc: "入力情報は結果本文や共有要約には表示されません。",
    systemsLegendLabel: "この相談を分担して読む六人の専門家",
    profileReloadCta: "保存したプロフィールを再読み込み",
    formSectionBirth: "生まれた瞬間を教えてください",
    birthDateLabel: "生年月日",
    birthTimeLabel: "出生時刻",
    birthTimeUnknownLabel: "出生時刻がわかりません",
    birthTimeUnknownNote: "不明な場合、時刻に基づく命盤・ラグナ・アセンダント・ハウスは断定しません。",
    birthPlaceLabel: "出生地",
    birthPlaceUnknownOption: "出生地がわかりません",
    birthPlaceNote: "ヴェーダ占星術・西洋占星術の位置計算に使用します。",
    calendarTypeLabel: "暦の基準",
    calendarSolarLabel: "新暦",
    calendarLunarLabel: "旧暦",
    genderLabel: "性別 ",
    optionalTag: "(任意)",
    genderUnspecifiedOption: "選択しない",
    genderFemaleOption: "女性",
    genderMaleOption: "男性",
    formSectionMind: "今のお気持ちを聞かせてください",
    nicknameLabel: "ニックネーム ",
    nicknamePlaceholder: "結果で呼ばれる名前",
    topicLabel: "関心のあるテーマ",
    topicOptionOverall: "人生全般の流れ",
    topicOptionLove: "恋愛と関係",
    topicOptionWorkMoney: "仕事とお金",
    topicOptionMind: "心と回復",
    concernLabel: "悩み ",
    concernPlaceholder: "個人を特定できる情報は書かないでください。",
    pendingRequestNoticePrefix: "すでに決済が完了したリクエストが残っています。下のボタンを押すと、",
    pendingRequestNoticeBold: "追加決済なしで",
    pendingRequestNoticeSuffix: "同じリクエストで結果を受け取れます。",
    statusRetryCta: "利用状況を再確認する",
    threadHeadingFailure: "相談が途中で止まりました",
    threadHeadingDefault: "六人の専門家が順番に答えています",
    threadSubResultSaved: "アカウントに保存された相談です。この画面からそのままPDFでダウンロードできます。",
    threadSubResultFresh: "六体系をそれぞれ読み解き、最後にひとつにまとめたクロス判定の対話です。",
    threadSubFailure: "進んだところまでそのまま残しています。下から続けて再試行できます。",
    threadSubIdle: "六体系を呼び出す準備をしています。",
    stagesCompletedPrefix: "六体系のうち ",
    stagesCompletedSuffix: "個完了",
    speakerFusionLabel: "Fusion Core",
    speakerCompletedBadge: "完了",
    speakerWritingBadge: "作成中",
    composeRepairSuffix: " グループ補完完了",
    composeDoneSuffix: " リーディンググループ完成",
    composeRepairNote: "分量が不足したグループのみ書き直しています。先に完成したグループはそのまま残ります。",
    composeNormalNote: "2万字を超える分量のため、4グループを同時に書いています。先に終わったグループから表示されます。",
    stalledNotice: "接続が静かになってから少し経ちました。結果は完成次第すぐにアカウントに保存されるので、画面が止まったように見えたら下のアーカイブでご確認ください。",
    waitingSuffix: " 順番を待っています",
    qualityNoticeHeading: "分量に関するお知らせ",
    failureHeading: "生成が止まりました",
    failureReasonPrefix: "理由コード ",
    failureReasonSuffix: " · 同じ失敗が繰り返される場合は、このコードをお問い合わせに記載してください。",
    failureRetryCta: "追加決済なしで再試行する",
    cancelGenerationCta: "分析を中断する",
    pdfMakingLabel: "PDFを作成中…",
    pdfSaveCta: "PDFで保存",
    shareCta: "個人情報を除いた要約を共有",
    copyReopenLinkCta: "再度開くリンクをコピー",
    continueGuardianLink: "今日の貴人に続けて尋ねる",
    dialogCloseAria: "Fusion Coreの説明を閉じる",
    dialogCloseLabel: "閉じる",
    dialogKicker: "Fusion Core",
    dialogHeading: "完了した分析のみを連結します",
    dialogDesc: "四柱推命、紫微斗数、宿曜、ヴェーダ占星術、西洋占星術、タロットをそれぞれ終えた後、最後にひとつの読み解きに融合します。",
    dialogNote: "中断・失敗した分析は、同じリクエストを再送すれば追加決済なしで続きます。",
  },
  "zh-CN": {
    statusInvalidMessage: "使用状态响应无效。",
    statusUnavailableMessage: "未能确认使用状态。请稍后重试。",
    fieldSystemsAllTitle: "解读体系：全部六大体系",
    fieldSystemsAllSrOnly: "解读此信息的体系：全部六大体系",
    fieldSystemsTitle: (label) => `解读体系：${label}`,
    fieldSystemsSrOnly: (label) => `解读此信息的体系：${label}`,
    serverResponseInvalidMessage: "未能确认服务器响应。",
    streamStartFailedMessage: "未能开始分析连接。",
    analysisFailedMessage: "未能完成分析。",
    noResultReceivedMessage: "未收到分析结果。请重试。",
    storedResultLoadFailedMessage: "未能加载已保存的结果。",
    guardianHandoffNotice: "仅继承了妍伊留下的主题。请在此重新确认出生信息与问题。",
    guardianHandoffPrefix: "仅继承了妍伊留下的",
    guardianHandoffSuffix: "主题。未带入个人对话与结果原文。",
    birthInputRequiredMessage: "请输入出生日期和时间，或选择不知道出生时间。",
    paymentReason: "融合运势咨询一次",
    paymentFailedMessage: "未能完成支付。请稍后重试。",
    stageDefaultProgressMessage: "正在整理融合解读。",
    resultGenerationFailedMessage: "未能生成结果。",
    resultCompletedNotice: "结果已完成。已保存至您的账户，随时可以再次打开。",
    analysisCancelledNotice: "分析已中断。使用同一请求重试不会再次收费。",
    shareSuccessNotice: "已分享不含个人信息的摘要。",
    shareFailedMessage: "分享失败。请稍后重试。",
    copyLinkSuccessNotice: "已复制可再次打开的链接。需要使用本人账户登录才能查看。",
    copyLinkFailedMessage: "未能复制链接。",
    pdfCoverFallbackTitle: "融合运势",
    pdfCoverSubtitle: (topic) => `六体系交叉解读 · ${topic}`,
    pdfSavedNotice: "已保存为PDF。",
    pdfFailedMessage: "未能生成PDF。请稍后重试。",
    buttonLoadingLabel: "正在整合六位专家的解读…",
    buttonPayingLabel: "正在确认支付",
    buttonLoginLabel: "登录后开始",
    buttonResumeLabel: "免费继续接收（无需再次付款）",
    buttonSubmitLabel: "生成融合运势",
    navAriaLabel: "融合命理探索",
    threadAriaLabel: "融合运势咨询对话",
    navBack: "返回",
    navHome: "回首页",
    guardianLinkText: "承接自今日贵人的高级解读",
    heroTitleLine1: "六种解读，",
    heroTitleLine2: "合而为一",
    heroDesc: "以命理、紫微斗数、吠陀占星术、宿曜、西方占星术、塔罗各自的语言深入解读，最终汇聚为一份交叉判定。完成的咨询会保存到您的账户，可随时再次打开并下载为PDF。",
    heroFirstCome: "六体系交叉解读",
    heroPriceFallback: "₩30,000",
    heroPricePrefix: "每次 ",
    heroWordCount: "20,000字以上",
    heroSaveNote: "保存 · 可重新查看 · PDF",
    chatLead: "Fusion AI会在这个页面上依次告知您六大体系的完成情况。",
    readingFlowAriaLabel: "本次融合解读的进行顺序",
    readingFlowLead: "本次咨询的进行路径",
    readingFlowFinalTitle: "一份交叉判定",
    readingFlowFinalDesc: "相同信号成为核心模式，不同信号成为具体情境下的选项。",
    statusScopeLabel: "本次解读涵盖的范围",
    statusScopeValue: "六体系 · 20,000字以上",
    statusScopeNote: "分别解读命理、紫微斗数、吠陀占星术、宿曜、西方占星术、塔罗，最后进行交叉判定。",
    statusMethodLabel: "使用方式",
    statusMethodValue: "按次付费",
    statusMethodNote: "在结账页面可以同时选择使用权、单次付款或月相石。家庭使用权也在覆盖范围内。",
    coreButtonLabel: "查看Fusion Core的运作方式",
    formIntroHeading: "以准确的出生时间连接六大体系",
    formIntroDesc: "您输入的信息不会显示在结果正文或分享摘要中。",
    systemsLegendLabel: "分担解读本次咨询的六位专家",
    profileReloadCta: "重新加载已保存的个人资料",
    formSectionBirth: "请告诉我们您出生的那一刻",
    birthDateLabel: "出生日期",
    birthTimeLabel: "出生时间",
    birthTimeUnknownLabel: "不知道出生时间",
    birthTimeUnknownNote: "若不清楚，将不会对基于时间的命盘、上升点、上升星座、宫位做出断定。",
    birthPlaceLabel: "出生地",
    birthPlaceUnknownOption: "不知道出生地",
    birthPlaceNote: "用于吠陀占星术、西方占星术的位置计算。",
    calendarTypeLabel: "历法基准",
    calendarSolarLabel: "公历",
    calendarLunarLabel: "农历",
    genderLabel: "性别 ",
    optionalTag: "（可选）",
    genderUnspecifiedOption: "不选择",
    genderFemaleOption: "女性",
    genderMaleOption: "男性",
    formSectionMind: "请告诉我们您此刻的心事",
    nicknameLabel: "昵称 ",
    nicknamePlaceholder: "结果中将使用的称呼",
    topicLabel: "关注的主题",
    topicOptionOverall: "整体人生走向",
    topicOptionLove: "恋爱与关系",
    topicOptionWorkMoney: "工作与金钱",
    topicOptionMind: "心理与恢复",
    concernLabel: "烦恼 ",
    concernPlaceholder: "请勿填写可识别个人身份的信息。",
    pendingRequestNoticePrefix: "已有一个已完成付款的请求在等待中。点击下方按钮，将以",
    pendingRequestNoticeBold: "无需再次付款",
    pendingRequestNoticeSuffix: "的方式，用同一请求获取结果。",
    statusRetryCta: "重新确认使用状态",
    threadHeadingFailure: "咨询中途已停止",
    threadHeadingDefault: "六位专家正依次作答",
    threadSubResultSaved: "这是已保存至您账户的咨询。您可以直接在此页面下载为PDF。",
    threadSubResultFresh: "分别解读六大体系，最后汇合为一次交叉判定的对话。",
    threadSubFailure: "已完整保留进行到的部分。您可以在下方继续重试。",
    threadSubIdle: "正在准备唤起六大体系。",
    stagesCompletedPrefix: "六体系中已完成 ",
    stagesCompletedSuffix: " 个",
    speakerFusionLabel: "Fusion Core",
    speakerCompletedBadge: "已完成",
    speakerWritingBadge: "撰写中",
    composeRepairSuffix: " 个分组已补全",
    composeDoneSuffix: " 个解读分组完成",
    composeRepairNote: "仅重新撰写内容不足的分组。先前已完成的分组将保持不变。",
    composeNormalNote: "由于篇幅超过两万字，我们同时撰写四个分组。哪个先完成就先显示哪个。",
    stalledNotice: "连接已安静了一段时间。结果一旦完成便会立即保存至您的账户，如果页面看起来停滞了，请在下方的存档中查看。",
    waitingSuffix: " 正在等待轮到",
    qualityNoticeHeading: "篇幅说明",
    failureHeading: "生成已停止",
    failureReasonPrefix: "原因代码 ",
    failureReasonSuffix: " · 如果同样的失败反复出现，请在联系我们时附上此代码。",
    failureRetryCta: "免费重试（无需再次付款）",
    cancelGenerationCta: "中断分析",
    pdfMakingLabel: "正在生成PDF…",
    pdfSaveCta: "保存为PDF",
    shareCta: "分享不含个人信息的摘要",
    copyReopenLinkCta: "复制重新打开的链接",
    continueGuardianLink: "继续向今日贵人提问",
    dialogCloseAria: "关闭Fusion Core说明",
    dialogCloseLabel: "关闭",
    dialogKicker: "Fusion Core",
    dialogHeading: "只连接已完成的分析",
    dialogDesc: "命理、紫微斗数、宿曜、吠陀占星术、西方占星术、塔罗各自完成后，最终融合为一次解读。",
    dialogNote: "中断或失败的分析，只需重新发送同一请求即可继续，无需再次付款。",
  },
  "zh-TW": {
    statusInvalidMessage: "使用狀態回應無效。",
    statusUnavailableMessage: "未能確認使用狀態。請稍後重試。",
    fieldSystemsAllTitle: "解讀體系：全部六大體系",
    fieldSystemsAllSrOnly: "解讀此資訊的體系：全部六大體系",
    fieldSystemsTitle: (label) => `解讀體系：${label}`,
    fieldSystemsSrOnly: (label) => `解讀此資訊的體系：${label}`,
    serverResponseInvalidMessage: "未能確認伺服器回應。",
    streamStartFailedMessage: "未能開始分析連線。",
    analysisFailedMessage: "未能完成分析。",
    noResultReceivedMessage: "未收到分析結果。請重試。",
    storedResultLoadFailedMessage: "未能載入已儲存的結果。",
    guardianHandoffNotice: "僅繼承了妍伊留下的主題。請在此重新確認出生資訊與問題。",
    guardianHandoffPrefix: "僅繼承了妍伊留下的",
    guardianHandoffSuffix: "主題。未帶入個人對話與結果原文。",
    birthInputRequiredMessage: "請輸入出生日期和時間，或選擇不知道出生時間。",
    paymentReason: "融合運勢諮詢一次",
    paymentFailedMessage: "未能完成付款。請稍後重試。",
    stageDefaultProgressMessage: "正在整理融合解讀。",
    resultGenerationFailedMessage: "未能生成結果。",
    resultCompletedNotice: "結果已完成。已儲存至您的帳戶，隨時可以再次開啟。",
    analysisCancelledNotice: "分析已中斷。使用同一請求重試不會再次收費。",
    shareSuccessNotice: "已分享不含個人資訊的摘要。",
    shareFailedMessage: "分享失敗。請稍後重試。",
    copyLinkSuccessNotice: "已複製可再次開啟的連結。需要使用本人帳戶登入才能查看。",
    copyLinkFailedMessage: "未能複製連結。",
    pdfCoverFallbackTitle: "融合運勢",
    pdfCoverSubtitle: (topic) => `六體系交叉解讀 · ${topic}`,
    pdfSavedNotice: "已儲存為PDF。",
    pdfFailedMessage: "未能生成PDF。請稍後重試。",
    buttonLoadingLabel: "正在整合六位專家的解讀…",
    buttonPayingLabel: "正在確認付款",
    buttonLoginLabel: "登入後開始",
    buttonResumeLabel: "免費繼續接收（無需再次付款）",
    buttonSubmitLabel: "生成融合運勢",
    navAriaLabel: "融合命理探索",
    threadAriaLabel: "融合運勢諮詢對話",
    navBack: "返回",
    navHome: "回首頁",
    guardianLinkText: "承接自今日貴人的高級解讀",
    heroTitleLine1: "六種解讀，",
    heroTitleLine2: "合而為一",
    heroDesc: "以命理、紫微斗數、吠陀占星術、宿曜、西方占星術、塔羅各自的語言深入解讀，最終匯聚為一份交叉判定。完成的諮詢會儲存到您的帳戶，可隨時再次開啟並下載為PDF。",
    heroFirstCome: "六體系交叉解讀",
    heroPriceFallback: "₩30,000",
    heroPricePrefix: "每次 ",
    heroWordCount: "20,000字以上",
    heroSaveNote: "儲存 · 可重新查看 · PDF",
    chatLead: "Fusion AI會在這個頁面上依序告知您六大體系的完成情況。",
    readingFlowAriaLabel: "本次融合解讀的進行順序",
    readingFlowLead: "本次諮詢的進行路徑",
    readingFlowFinalTitle: "一份交叉判定",
    readingFlowFinalDesc: "相同信號成為核心模式，不同信號成為具體情境下的選項。",
    statusScopeLabel: "本次解讀涵蓋的範圍",
    statusScopeValue: "六體系 · 20,000字以上",
    statusScopeNote: "分別解讀命理、紫微斗數、吠陀占星術、宿曜、西方占星術、塔羅，最後進行交叉判定。",
    statusMethodLabel: "使用方式",
    statusMethodValue: "按次付費",
    statusMethodNote: "在結帳頁面可以同時選擇使用權、單次付款或月相石。家庭使用權也在涵蓋範圍內。",
    coreButtonLabel: "查看Fusion Core的運作方式",
    formIntroHeading: "以準確的出生時間連接六大體系",
    formIntroDesc: "您輸入的資訊不會顯示在結果正文或分享摘要中。",
    systemsLegendLabel: "分擔解讀本次諮詢的六位專家",
    profileReloadCta: "重新載入已儲存的個人資料",
    formSectionBirth: "請告訴我們您出生的那一刻",
    birthDateLabel: "出生日期",
    birthTimeLabel: "出生時間",
    birthTimeUnknownLabel: "不知道出生時間",
    birthTimeUnknownNote: "若不清楚，將不會對基於時間的命盤、上升點、上升星座、宮位做出斷定。",
    birthPlaceLabel: "出生地",
    birthPlaceUnknownOption: "不知道出生地",
    birthPlaceNote: "用於吠陀占星術、西方占星術的位置計算。",
    calendarTypeLabel: "曆法基準",
    calendarSolarLabel: "陽曆",
    calendarLunarLabel: "農曆",
    genderLabel: "性別 ",
    optionalTag: "（可選）",
    genderUnspecifiedOption: "不選擇",
    genderFemaleOption: "女性",
    genderMaleOption: "男性",
    formSectionMind: "請告訴我們您此刻的心事",
    nicknameLabel: "暱稱 ",
    nicknamePlaceholder: "結果中將使用的稱呼",
    topicLabel: "關注的主題",
    topicOptionOverall: "整體人生走向",
    topicOptionLove: "戀愛與關係",
    topicOptionWorkMoney: "工作與金錢",
    topicOptionMind: "心理與恢復",
    concernLabel: "煩惱 ",
    concernPlaceholder: "請勿填寫可識別個人身份的資訊。",
    pendingRequestNoticePrefix: "已有一個已完成付款的請求在等待中。點擊下方按鈕，將以",
    pendingRequestNoticeBold: "無需再次付款",
    pendingRequestNoticeSuffix: "的方式，用同一請求取得結果。",
    statusRetryCta: "重新確認使用狀態",
    threadHeadingFailure: "諮詢中途已停止",
    threadHeadingDefault: "六位專家正依序作答",
    threadSubResultSaved: "這是已儲存至您帳戶的諮詢。您可以直接在此頁面下載為PDF。",
    threadSubResultFresh: "分別解讀六大體系，最後匯合為一次交叉判定的對話。",
    threadSubFailure: "已完整保留進行到的部分。您可以在下方繼續重試。",
    threadSubIdle: "正在準備喚起六大體系。",
    stagesCompletedPrefix: "六體系中已完成 ",
    stagesCompletedSuffix: " 個",
    speakerFusionLabel: "Fusion Core",
    speakerCompletedBadge: "已完成",
    speakerWritingBadge: "撰寫中",
    composeRepairSuffix: " 個分組已補全",
    composeDoneSuffix: " 個解讀分組完成",
    composeRepairNote: "僅重新撰寫內容不足的分組。先前已完成的分組將保持不變。",
    composeNormalNote: "由於篇幅超過兩萬字，我們同時撰寫四個分組。哪個先完成就先顯示哪個。",
    stalledNotice: "連線已安靜了一段時間。結果一旦完成便會立即儲存至您的帳戶，如果頁面看起來停滯了，請在下方的存檔中查看。",
    waitingSuffix: " 正在等待輪到",
    qualityNoticeHeading: "篇幅說明",
    failureHeading: "生成已停止",
    failureReasonPrefix: "原因代碼 ",
    failureReasonSuffix: " · 如果同樣的失敗反覆出現，請在聯繫我們時附上此代碼。",
    failureRetryCta: "免費重試（無需再次付款）",
    cancelGenerationCta: "中斷分析",
    pdfMakingLabel: "正在生成PDF…",
    pdfSaveCta: "儲存為PDF",
    shareCta: "分享不含個人資訊的摘要",
    copyReopenLinkCta: "複製重新開啟的連結",
    continueGuardianLink: "繼續向今日貴人提問",
    dialogCloseAria: "關閉Fusion Core說明",
    dialogCloseLabel: "關閉",
    dialogKicker: "Fusion Core",
    dialogHeading: "只連接已完成的分析",
    dialogDesc: "命理、紫微斗數、宿曜、吠陀占星術、西方占星術、塔羅各自完成後，最終融合為一次解讀。",
    dialogNote: "中斷或失敗的分析，只需重新傳送同一請求即可繼續，無需再次付款。",
  },
  vi: {
    statusInvalidMessage: "Phản hồi trạng thái sử dụng không hợp lệ.",
    statusUnavailableMessage: "Chúng tôi không thể kiểm tra trạng thái sử dụng. Vui lòng thử lại sau ít phút.",
    fieldSystemsAllTitle: "Hệ thống đọc thông tin này: cả sáu hệ thống",
    fieldSystemsAllSrOnly: "Các hệ thống đọc thông tin này: cả sáu hệ thống",
    fieldSystemsTitle: (label) => `Hệ thống đọc thông tin này: ${label}`,
    fieldSystemsSrOnly: (label) => `Các hệ thống đọc thông tin này: ${label}`,
    serverResponseInvalidMessage: "Chúng tôi không thể xác nhận phản hồi từ máy chủ.",
    streamStartFailedMessage: "Chúng tôi không thể bắt đầu kết nối phân tích.",
    analysisFailedMessage: "Chúng tôi không thể hoàn tất phân tích.",
    noResultReceivedMessage: "Chúng tôi không nhận được kết quả phân tích. Vui lòng thử lại.",
    storedResultLoadFailedMessage: "Chúng tôi không thể tải kết quả đã lưu.",
    guardianHandoffNotice: "Chúng tôi chỉ chuyển tiếp chủ đề mà Yeoni để lại. Vui lòng kiểm tra lại thông tin sinh và câu hỏi tại đây.",
    guardianHandoffPrefix: "Chúng tôi chỉ tiếp nhận chủ đề ",
    guardianHandoffSuffix: " mà Yeoni để lại. Cuộc trò chuyện riêng và kết quả gốc không được mang theo.",
    birthInputRequiredMessage: "Vui lòng nhập ngày sinh và giờ sinh, hoặc chọn tùy chọn không biết giờ sinh.",
    paymentReason: "Một lần tư vấn Vận Mệnh Hợp Nhất",
    paymentFailedMessage: "Chúng tôi không thể hoàn tất thanh toán. Vui lòng thử lại sau ít phút.",
    stageDefaultProgressMessage: "Đang sắp xếp bài đọc Vận Mệnh Hợp Nhất của bạn.",
    resultGenerationFailedMessage: "Chúng tôi không thể tạo kết quả.",
    resultCompletedNotice: "Kết quả của bạn đã hoàn tất. Đã được lưu vào tài khoản để bạn có thể mở lại bất cứ lúc nào.",
    analysisCancelledNotice: "Đã dừng phân tích. Thử lại với cùng yêu cầu sẽ không bị tính phí thêm.",
    shareSuccessNotice: "Đã chia sẻ bản tóm tắt không bao gồm thông tin cá nhân.",
    shareFailedMessage: "Chúng tôi không thể chia sẻ. Vui lòng thử lại sau ít phút.",
    copyLinkSuccessNotice: "Đã sao chép liên kết bạn có thể mở lại. Bạn cần đăng nhập bằng chính tài khoản của mình để xem.",
    copyLinkFailedMessage: "Chúng tôi không thể sao chép liên kết.",
    pdfCoverFallbackTitle: "Vận Mệnh Hợp Nhất",
    pdfCoverSubtitle: (topic) => `Đọc chéo sáu hệ thống · ${topic}`,
    pdfSavedNotice: "Đã lưu dưới dạng PDF.",
    pdfFailedMessage: "Chúng tôi không thể tạo PDF. Vui lòng thử lại sau ít phút.",
    buttonLoadingLabel: "Đang dệt dòng chảy của sáu chuyên gia lại với nhau…",
    buttonPayingLabel: "Đang xác nhận thanh toán của bạn",
    buttonLoginLabel: "Đăng nhập để bắt đầu",
    buttonResumeLabel: "Tiếp tục mà không tính phí thêm",
    buttonSubmitLabel: "Tạo Vận Mệnh Hợp Nhất của tôi",
    navAriaLabel: "Khám phá Vận Mệnh Hợp Nhất",
    threadAriaLabel: "Cuộc trò chuyện tư vấn Vận Mệnh Hợp Nhất",
    navBack: "Quay lại",
    navHome: "Trang chủ",
    guardianLinkText: "Bài đọc cao cấp tiếp nối từ Quý Nhân Hôm Nay",
    heroTitleLine1: "Sáu bài đọc,",
    heroTitleLine2: "một buổi tư vấn",
    heroDesc: "Chúng tôi đọc sâu Tứ Trụ, Tử Vi Đẩu Số, chiêm tinh Vệ Đà, Sukuyo, chiêm tinh Phương Tây và Tarot, mỗi hệ thống theo ngôn ngữ riêng, sau đó tổng hợp thành một bài đọc chéo duy nhất. Buổi tư vấn hoàn chỉnh được lưu vào tài khoản để bạn có thể mở lại bất cứ lúc nào và tải xuống dưới dạng PDF.",
    heroFirstCome: "Đọc chéo sáu hệ thống",
    heroPriceFallback: "₩30,000",
    heroPricePrefix: "mỗi lần đọc ",
    heroWordCount: "Hơn 20.000 ký tự",
    heroSaveNote: "Đã lưu · Có thể mở lại · PDF",
    chatLead: "Fusion AI cho bạn biết ngay trên màn hình này khi mỗi hệ thống trong sáu hệ thống hoàn thành.",
    readingFlowAriaLabel: "Thứ tự bài đọc Vận Mệnh Hợp Nhất diễn ra",
    readingFlowLead: "Con đường buổi tư vấn này đi qua",
    readingFlowFinalTitle: "Một bài đọc chéo",
    readingFlowFinalDesc: "Các tín hiệu đồng nhất trở thành khuôn mẫu cốt lõi; các tín hiệu khác nhau trở thành lựa chọn theo tình huống.",
    statusScopeLabel: "Phạm vi bài đọc này bao quát",
    statusScopeValue: "Sáu hệ thống · Hơn 20.000 ký tự",
    statusScopeNote: "Đọc riêng Tứ Trụ, Tử Vi Đẩu Số, chiêm tinh Vệ Đà, Sukuyo, chiêm tinh Phương Tây và Tarot, sau đó đọc chéo vào cuối.",
    statusMethodLabel: "Cách tính phí",
    statusMethodValue: "Trả phí theo mỗi lần đọc",
    statusMethodNote: "Tại trang thanh toán, bạn có thể chọn thẻ sử dụng, thanh toán một lần, hoặc Đá Mặt Trăng cùng lúc. Thẻ sử dụng gia đình cũng được áp dụng.",
    coreButtonLabel: "Xem cách Fusion Core hoạt động",
    formIntroHeading: "Kết nối cả sáu hệ thống với giờ sinh chính xác của bạn",
    formIntroDesc: "Thông tin bạn nhập không hiển thị trong nội dung kết quả hoặc bản tóm tắt chia sẻ.",
    systemsLegendLabel: "Sáu chuyên gia cùng chia sẻ bài đọc này",
    profileReloadCta: "Tải lại hồ sơ đã lưu của tôi",
    formSectionBirth: "Hãy cho chúng tôi biết khoảnh khắc bạn sinh ra",
    birthDateLabel: "Ngày sinh",
    birthTimeLabel: "Giờ sinh",
    birthTimeUnknownLabel: "Tôi không biết giờ sinh",
    birthTimeUnknownNote: "Nếu không biết, chúng tôi sẽ không khẳng định các bài đọc dựa trên thời gian như lá số, Lagna, Cung Mọc, hoặc các Nhà.",
    birthPlaceLabel: "Nơi sinh",
    birthPlaceUnknownOption: "Tôi không biết nơi sinh",
    birthPlaceNote: "Dùng để tính toán vị trí trong chiêm tinh Vệ Đà và chiêm tinh Phương Tây.",
    calendarTypeLabel: "Loại lịch",
    calendarSolarLabel: "Dương lịch",
    calendarLunarLabel: "Âm lịch",
    genderLabel: "Giới tính ",
    optionalTag: "(không bắt buộc)",
    genderUnspecifiedOption: "Không muốn nói",
    genderFemaleOption: "Nữ",
    genderMaleOption: "Nam",
    formSectionMind: "Hãy cho chúng tôi biết điều bạn đang nghĩ ngay bây giờ",
    nicknameLabel: "Biệt danh ",
    nicknamePlaceholder: "Tên dùng trong kết quả của bạn",
    topicLabel: "Chủ đề quan tâm",
    topicOptionOverall: "Dòng chảy tổng thể của cuộc đời",
    topicOptionLove: "Tình yêu và các mối quan hệ",
    topicOptionWorkMoney: "Công việc và tiền bạc",
    topicOptionMind: "Tâm trí và sự hồi phục",
    concernLabel: "Điều lo lắng ",
    concernPlaceholder: "Vui lòng không bao gồm thông tin nhận dạng cá nhân.",
    pendingRequestNoticePrefix: "Có một yêu cầu đã thanh toán vẫn đang chờ. Nhấn nút bên dưới sẽ nhận kết quả cho cùng yêu cầu đó ",
    pendingRequestNoticeBold: "mà không tính phí thêm",
    pendingRequestNoticeSuffix: ".",
    statusRetryCta: "Kiểm tra lại trạng thái sử dụng",
    threadHeadingFailure: "Buổi tư vấn đã dừng giữa chừng",
    threadHeadingDefault: "Sáu chuyên gia đang lần lượt trả lời",
    threadSubResultSaved: "Đây là buổi tư vấn đã lưu vào tài khoản của bạn. Bạn có thể tải xuống dưới dạng PDF ngay trên màn hình này.",
    threadSubResultFresh: "Một cuộc trò chuyện đọc riêng sáu hệ thống, sau đó đọc chéo thành một vào cuối.",
    threadSubFailure: "Chúng tôi đã giữ nguyên mọi thứ đến chỗ nó dừng lại. Bạn có thể thử lại và tiếp tục bên dưới.",
    threadSubIdle: "Đang chuẩn bị gọi cả sáu hệ thống.",
    stagesCompletedPrefix: "Đã hoàn thành ",
    stagesCompletedSuffix: " trong sáu hệ thống",
    speakerFusionLabel: "Fusion Core",
    speakerCompletedBadge: "Xong",
    speakerWritingBadge: "Đang viết",
    composeRepairSuffix: " nhóm đã được sửa xong",
    composeDoneSuffix: " nhóm bài đọc hoàn tất",
    composeRepairNote: "Chúng tôi chỉ viết lại các nhóm chưa đủ độ dài. Các nhóm đã hoàn thành trước đó vẫn giữ nguyên.",
    composeNormalNote: "Bài đọc này dài hơn 20.000 ký tự, vì vậy chúng tôi viết bốn nhóm cùng lúc. Nhóm nào xong trước sẽ hiển thị trước.",
    stalledNotice: "Kết nối đã im lặng một lúc. Kết quả của bạn được lưu vào tài khoản ngay khi hoàn tất, vì vậy nếu màn hình có vẻ như bị treo, hãy kiểm tra kho lưu trữ bên dưới.",
    waitingSuffix: " đang chờ đến lượt",
    qualityNoticeHeading: "Thông báo về độ dài",
    failureHeading: "Quá trình tạo đã dừng",
    failureReasonPrefix: "Mã lý do ",
    failureReasonSuffix: " — nếu điều này tiếp tục xảy ra, vui lòng đính kèm mã này khi liên hệ với chúng tôi.",
    failureRetryCta: "Thử lại mà không tính phí thêm",
    cancelGenerationCta: "Dừng phân tích",
    pdfMakingLabel: "Đang tạo PDF của bạn…",
    pdfSaveCta: "Lưu dưới dạng PDF",
    shareCta: "Chia sẻ tóm tắt (không có thông tin cá nhân)",
    copyReopenLinkCta: "Sao chép liên kết mở lại",
    continueGuardianLink: "Tiếp tục với Quý Nhân Hôm Nay",
    dialogCloseAria: "Đóng phần giải thích Fusion Core",
    dialogCloseLabel: "Đóng",
    dialogKicker: "Fusion Core",
    dialogHeading: "Chỉ những phân tích đã hoàn thành mới được kết nối",
    dialogDesc: "Tứ Trụ, Tử Vi Đẩu Số, Sukuyo, chiêm tinh Vệ Đà, chiêm tinh Phương Tây và Tarot mỗi loại được hoàn thành riêng, sau đó hợp nhất thành một bài đọc vào cuối.",
    dialogNote: "Nếu một phân tích bị gián đoạn hoặc thất bại, gửi lại cùng yêu cầu sẽ tiếp tục mà không tính phí thêm.",
  },
  hi: {
    statusInvalidMessage: "उपयोग स्थिति की प्रतिक्रिया मान्य नहीं है।",
    statusUnavailableMessage: "हम उपयोग स्थिति की जांच नहीं कर सके। कृपया थोड़ी देर बाद पुनः प्रयास करें।",
    fieldSystemsAllTitle: "इसे पढ़ने वाली प्रणालियां: सभी छह प्रणालियां",
    fieldSystemsAllSrOnly: "इस जानकारी को पढ़ने वाली प्रणालियां: सभी छह प्रणालियां",
    fieldSystemsTitle: (label) => `इसे पढ़ने वाली प्रणालियां: ${label}`,
    fieldSystemsSrOnly: (label) => `इस जानकारी को पढ़ने वाली प्रणालियां: ${label}`,
    serverResponseInvalidMessage: "हम सर्वर की प्रतिक्रिया की पुष्टि नहीं कर सके।",
    streamStartFailedMessage: "हम विश्लेषण कनेक्शन शुरू नहीं कर सके।",
    analysisFailedMessage: "हम विश्लेषण पूरा नहीं कर सके।",
    noResultReceivedMessage: "हमें विश्लेषण परिणाम प्राप्त नहीं हुआ। कृपया पुनः प्रयास करें।",
    storedResultLoadFailedMessage: "हम सहेजा गया परिणाम लोड नहीं कर सके।",
    guardianHandoffNotice: "हमने केवल योनी द्वारा छोड़ा गया विषय आगे बढ़ाया है। कृपया यहां जन्म जानकारी और प्रश्न फिर से जांचें।",
    guardianHandoffPrefix: "हमने केवल योनी द्वारा छोड़ा गया विषय ",
    guardianHandoffSuffix: " आगे बढ़ाया है। व्यक्तिगत बातचीत और मूल परिणाम शामिल नहीं किए गए हैं।",
    birthInputRequiredMessage: "कृपया अपनी जन्म तिथि और जन्म समय दर्ज करें, या जन्म समय न जानने का विकल्प चुनें।",
    paymentReason: "एक फ्यूज़न भाग्य परामर्श",
    paymentFailedMessage: "हम भुगतान पूरा नहीं कर सके। कृपया थोड़ी देर बाद पुनः प्रयास करें।",
    stageDefaultProgressMessage: "आपकी फ्यूज़न भाग्य रीडिंग व्यवस्थित की जा रही है।",
    resultGenerationFailedMessage: "हम परिणाम उत्पन्न नहीं कर सके।",
    resultCompletedNotice: "आपका परिणाम पूर्ण हो गया है। यह आपके खाते में सहेजा गया है ताकि आप इसे कभी भी फिर से खोल सकें।",
    analysisCancelledNotice: "विश्लेषण रोक दिया गया। उसी अनुरोध के साथ पुनः प्रयास करने पर कोई अतिरिक्त शुल्क नहीं लगेगा।",
    shareSuccessNotice: "व्यक्तिगत जानकारी को छोड़कर सारांश साझा किया गया।",
    shareFailedMessage: "हम साझा नहीं कर सके। कृपया थोड़ी देर बाद पुनः प्रयास करें।",
    copyLinkSuccessNotice: "एक लिंक कॉपी किया गया जिसे आप फिर से खोल सकते हैं। इसे देखने के लिए आपको अपने खाते से लॉगिन करना होगा।",
    copyLinkFailedMessage: "हम लिंक कॉपी नहीं कर सके।",
    pdfCoverFallbackTitle: "फ्यूज़न भाग्य",
    pdfCoverSubtitle: (topic) => `छह-प्रणाली क्रॉस रीडिंग · ${topic}`,
    pdfSavedNotice: "PDF के रूप में सहेजा गया।",
    pdfFailedMessage: "हम PDF नहीं बना सके। कृपया थोड़ी देर बाद पुनः प्रयास करें।",
    buttonLoadingLabel: "छह विशेषज्ञों की रीडिंग को एक साथ बुना जा रहा है…",
    buttonPayingLabel: "आपके भुगतान की पुष्टि की जा रही है",
    buttonLoginLabel: "शुरू करने के लिए लॉगिन करें",
    buttonResumeLabel: "बिना किसी अतिरिक्त शुल्क के जारी रखें",
    buttonSubmitLabel: "मेरा फ्यूज़न भाग्य उत्पन्न करें",
    navAriaLabel: "फ्यूज़न भाग्य अन्वेषण",
    threadAriaLabel: "फ्यूज़न भाग्य परामर्श बातचीत",
    navBack: "वापस",
    navHome: "होम",
    guardianLinkText: "आज के हितैषी से जारी एक प्रीमियम रीडिंग",
    heroTitleLine1: "छह रीडिंग,",
    heroTitleLine2: "एक परामर्श",
    heroDesc: "हम साजू, ज़िवेई दोशु, वैदिक ज्योतिष, सुक्यो, पाश्चात्य ज्योतिष और टैरो को गहराई से पढ़ते हैं, प्रत्येक को अपनी भाषा में, फिर उन्हें एक ही क्रॉस रीडिंग में लाते हैं। आपका पूर्ण परामर्श आपके खाते में सहेजा जाता है ताकि आप इसे कभी भी फिर से खोल सकें और PDF के रूप में डाउनलोड कर सकें।",
    heroFirstCome: "छह-प्रणाली क्रॉस रीडिंग",
    heroPriceFallback: "₩30,000",
    heroPricePrefix: "प्रति रीडिंग ",
    heroWordCount: "20,000+ अक्षर",
    heroSaveNote: "सहेजा गया · फिर से खोला जा सकता है · PDF",
    chatLead: "फ्यूज़न AI आपको इसी स्क्रीन पर बताता है, जैसे-जैसे छह में से प्रत्येक प्रणाली पूरी होती है।",
    readingFlowAriaLabel: "यह फ्यूज़न रीडिंग जिस क्रम में आगे बढ़ती है",
    readingFlowLead: "यह परामर्श जिस पथ का अनुसरण करता है",
    readingFlowFinalTitle: "एक क्रॉस रीडिंग",
    readingFlowFinalDesc: "जो संकेत सहमत होते हैं वे मुख्य पैटर्न बन जाते हैं; जो संकेत भिन्न होते हैं वे स्थितिजन्य विकल्प बन जाते हैं।",
    statusScopeLabel: "यह रीडिंग जो कवर करती है",
    statusScopeValue: "छह प्रणालियां · 20,000+ अक्षर",
    statusScopeNote: "साजू, ज़िवेई दोशु, वैदिक ज्योतिष, सुक्यो, पाश्चात्य ज्योतिष और टैरो को अलग-अलग पढ़ता है, फिर अंत में उन्हें क्रॉस-रीड करता है।",
    statusMethodLabel: "इसका बिल कैसे बनता है",
    statusMethodValue: "प्रति रीडिंग भुगतान",
    statusMethodNote: "चेकआउट पर आप पास, एक बार का भुगतान, या मूनस्टोन एक साथ चुन सकते हैं। पारिवारिक पास भी कवर होते हैं।",
    coreButtonLabel: "देखें कि Fusion Core कैसे काम करता है",
    formIntroHeading: "अपने सटीक जन्म समय के साथ सभी छह प्रणालियों को जोड़ें",
    formIntroDesc: "आपके द्वारा दर्ज की गई जानकारी परिणाम पाठ या साझा सारांश में प्रदर्शित नहीं होती है।",
    systemsLegendLabel: "इस रीडिंग को साझा करने वाले छह विशेषज्ञ",
    profileReloadCta: "मेरी सहेजी गई प्रोफ़ाइल फिर से लोड करें",
    formSectionBirth: "हमें बताएं कि आप कब पैदा हुए थे",
    birthDateLabel: "जन्म तिथि",
    birthTimeLabel: "जन्म समय",
    birthTimeUnknownLabel: "मुझे अपना जन्म समय नहीं पता",
    birthTimeUnknownNote: "यदि अज्ञात है, तो हम कुंडली, लग्न, उदय राशि, या भावों जैसी समय-आधारित रीडिंग की पुष्टि नहीं करेंगे।",
    birthPlaceLabel: "जन्म स्थान",
    birthPlaceUnknownOption: "मुझे अपना जन्म स्थान नहीं पता",
    birthPlaceNote: "वैदिक और पाश्चात्य ज्योतिष में स्थान गणना के लिए उपयोग किया जाता है।",
    calendarTypeLabel: "कैलेंडर प्रकार",
    calendarSolarLabel: "सौर",
    calendarLunarLabel: "चंद्र",
    genderLabel: "लिंग ",
    optionalTag: "(वैकल्पिक)",
    genderUnspecifiedOption: "बताना नहीं चाहते",
    genderFemaleOption: "महिला",
    genderMaleOption: "पुरुष",
    formSectionMind: "अभी आपके मन में क्या है, हमें बताएं",
    nicknameLabel: "उपनाम ",
    nicknamePlaceholder: "आपके परिणाम में उपयोग किया जाने वाला नाम",
    topicLabel: "रुचि का विषय",
    topicOptionOverall: "जीवन का समग्र प्रवाह",
    topicOptionLove: "प्रेम और रिश्ते",
    topicOptionWorkMoney: "काम और धन",
    topicOptionMind: "मन और स्वास्थ्य लाभ",
    concernLabel: "चिंता ",
    concernPlaceholder: "कृपया व्यक्तिगत रूप से पहचान योग्य जानकारी शामिल न करें।",
    pendingRequestNoticePrefix: "पहले से भुगतान किया गया एक अनुरोध अभी भी प्रतीक्षा में है। नीचे दिया गया बटन दबाने से आपको उसी अनुरोध पर ",
    pendingRequestNoticeBold: "बिना किसी अतिरिक्त शुल्क के",
    pendingRequestNoticeSuffix: " परिणाम मिलेगा।",
    statusRetryCta: "उपयोग स्थिति की फिर से जांच करें",
    threadHeadingFailure: "परामर्श बीच में रुक गया",
    threadHeadingDefault: "छह विशेषज्ञ बारी-बारी से जवाब दे रहे हैं",
    threadSubResultSaved: "यह आपके खाते में सहेजा गया परामर्श है। आप इसे इसी स्क्रीन से सीधे PDF के रूप में डाउनलोड कर सकते हैं।",
    threadSubResultFresh: "एक बातचीत जो छह प्रणालियों को अलग-अलग पढ़ती है, फिर अंत में उन्हें एक क्रॉस रीडिंग में मिलाती है।",
    threadSubFailure: "जहां तक यह पहुंचा, हमने उसे वैसे ही रखा है। आप नीचे से जारी रखकर पुनः प्रयास कर सकते हैं।",
    threadSubIdle: "सभी छह प्रणालियों को बुलाने की तैयारी की जा रही है।",
    stagesCompletedPrefix: "छह में से ",
    stagesCompletedSuffix: " प्रणालियां पूर्ण",
    speakerFusionLabel: "Fusion Core",
    speakerCompletedBadge: "पूर्ण",
    speakerWritingBadge: "लिखा जा रहा है",
    composeRepairSuffix: " समूह की मरम्मत पूर्ण",
    composeDoneSuffix: " रीडिंग समूह पूर्ण",
    composeRepairNote: "हम केवल उन समूहों को फिर से लिख रहे हैं जो कम पड़ गए। पहले से पूर्ण हुए समूह वैसे ही बने रहते हैं।",
    composeNormalNote: "यह 20,000 अक्षरों से अधिक है, इसलिए हम एक साथ चार समूह लिखते हैं। जो भी पहले पूरा होता है वह पहले दिखता है।",
    stalledNotice: "कनेक्शन कुछ समय से शांत है। आपका परिणाम पूर्ण होते ही आपके खाते में सहेजा जाता है, इसलिए यदि स्क्रीन रुकी हुई लगे, तो कृपया नीचे संग्रह में जांचें।",
    waitingSuffix: " बारी की प्रतीक्षा में",
    qualityNoticeHeading: "लंबाई संबंधी सूचना",
    failureHeading: "उत्पादन रुक गया",
    failureReasonPrefix: "कारण कोड ",
    failureReasonSuffix: " — यदि यह बार-बार होता है, तो कृपया संपर्क करते समय यह कोड शामिल करें।",
    failureRetryCta: "बिना किसी अतिरिक्त शुल्क के पुनः प्रयास करें",
    cancelGenerationCta: "विश्लेषण रोकें",
    pdfMakingLabel: "आपका PDF बनाया जा रहा है…",
    pdfSaveCta: "PDF के रूप में सहेजें",
    shareCta: "सारांश साझा करें (व्यक्तिगत जानकारी के बिना)",
    copyReopenLinkCta: "फिर से खोलने वाला लिंक कॉपी करें",
    continueGuardianLink: "आज के हितैषी के साथ जारी रखें",
    dialogCloseAria: "Fusion Core स्पष्टीकरण बंद करें",
    dialogCloseLabel: "बंद करें",
    dialogKicker: "Fusion Core",
    dialogHeading: "केवल पूर्ण विश्लेषण ही जोड़े जाते हैं",
    dialogDesc: "साजू, ज़िवेई दोशु, सुक्यो, वैदिक ज्योतिष, पाश्चात्य ज्योतिष, और टैरो में से प्रत्येक को अलग-अलग पूरा किया जाता है, फिर अंत में एक रीडिंग में मिलाया जाता है।",
    dialogNote: "यदि कोई विश्लेषण बाधित होता है या विफल हो जाता है, तो वही अनुरोध फिर से भेजने पर बिना किसी अतिरिक्त शुल्क के जारी रहता है।",
  },
  es: {
    statusInvalidMessage: "La respuesta del estado de uso no es válida.",
    statusUnavailableMessage: "No pudimos verificar tu estado de uso. Inténtalo de nuevo en unos momentos.",
    fieldSystemsAllTitle: "Sistemas que leen esto: los seis sistemas",
    fieldSystemsAllSrOnly: "Los sistemas que leen esta información: los seis sistemas",
    fieldSystemsTitle: (label) => `Sistemas que leen esto: ${label}`,
    fieldSystemsSrOnly: (label) => `Los sistemas que leen esta información: ${label}`,
    serverResponseInvalidMessage: "No pudimos confirmar la respuesta del servidor.",
    streamStartFailedMessage: "No pudimos iniciar la conexión de análisis.",
    analysisFailedMessage: "No pudimos completar el análisis.",
    noResultReceivedMessage: "No recibimos un resultado de análisis. Inténtalo de nuevo.",
    storedResultLoadFailedMessage: "No pudimos cargar el resultado guardado.",
    guardianHandoffNotice: "Solo trasladamos el tema que dejó Yeoni. Vuelve a verificar tu información de nacimiento y tu pregunta aquí.",
    guardianHandoffPrefix: "Solo trasladamos el tema ",
    guardianHandoffSuffix: " que dejó Yeoni. No se trajeron la conversación privada ni el resultado original.",
    birthInputRequiredMessage: "Ingresa tu fecha y hora de nacimiento, o selecciona la opción de no saber tu hora de nacimiento.",
    paymentReason: "Una consulta de Fortuna de Fusión",
    paymentFailedMessage: "No pudimos completar el pago. Inténtalo de nuevo en unos momentos.",
    stageDefaultProgressMessage: "Organizando tu lectura de Fortuna de Fusión.",
    resultGenerationFailedMessage: "No pudimos generar el resultado.",
    resultCompletedNotice: "Tu resultado está completo. Se guardó en tu cuenta para que puedas reabrirlo en cualquier momento.",
    analysisCancelledNotice: "El análisis se detuvo. Reintentar con la misma solicitud no generará un cargo adicional.",
    shareSuccessNotice: "Se compartió un resumen que excluye información personal.",
    shareFailedMessage: "No pudimos compartir esto. Inténtalo de nuevo en unos momentos.",
    copyLinkSuccessNotice: "Se copió un enlace que puedes volver a abrir. Necesitarás iniciar sesión con tu propia cuenta para verlo.",
    copyLinkFailedMessage: "No pudimos copiar el enlace.",
    pdfCoverFallbackTitle: "Fortuna de Fusión",
    pdfCoverSubtitle: (topic) => `Lectura cruzada de seis sistemas · ${topic}`,
    pdfSavedNotice: "Guardado como PDF.",
    pdfFailedMessage: "No pudimos crear el PDF. Inténtalo de nuevo en unos momentos.",
    buttonLoadingLabel: "Entretejiendo las lecturas de los seis expertos…",
    buttonPayingLabel: "Confirmando tu pago",
    buttonLoginLabel: "Inicia sesión para comenzar",
    buttonResumeLabel: "Continuar sin cargo adicional",
    buttonSubmitLabel: "Generar mi Fortuna de Fusión",
    navAriaLabel: "Exploración de Fortuna de Fusión",
    threadAriaLabel: "Conversación de la consulta de Fortuna de Fusión",
    navBack: "Atrás",
    navHome: "Inicio",
    guardianLinkText: "Una lectura premium que continúa desde el Benefactor de Hoy",
    heroTitleLine1: "Seis lecturas,",
    heroTitleLine2: "una consulta",
    heroDesc: "Leemos profundamente Saju, Ziwei Doushu, astrología védica, Sukuyo, astrología occidental y Tarot, cada uno en su propio idioma, y luego los unimos en una sola lectura cruzada. Tu consulta terminada se guarda en tu cuenta para que puedas reabrirla en cualquier momento y descargarla como PDF.",
    heroFirstCome: "Lectura cruzada de seis sistemas",
    heroPriceFallback: "₩30,000",
    heroPricePrefix: "por lectura ",
    heroWordCount: "Más de 20,000 caracteres",
    heroSaveNote: "Guardado · Reabrible · PDF",
    chatLead: "Fusion AI te avisa, justo en esta pantalla, a medida que cada uno de los seis sistemas termina.",
    readingFlowAriaLabel: "El orden que sigue esta lectura de Fusión",
    readingFlowLead: "El camino que sigue esta consulta",
    readingFlowFinalTitle: "Una lectura cruzada",
    readingFlowFinalDesc: "Las señales que coinciden se convierten en el patrón central; las señales que difieren se convierten en opciones situacionales.",
    statusScopeLabel: "Lo que cubre esta lectura",
    statusScopeValue: "Seis sistemas · Más de 20,000 caracteres",
    statusScopeNote: "Lee Saju, Ziwei Doushu, astrología védica, Sukuyo, astrología occidental y Tarot por separado, y luego los lee de forma cruzada al final.",
    statusMethodLabel: "Cómo se factura",
    statusMethodValue: "Se paga por lectura",
    statusMethodNote: "En el pago puedes elegir un pase, un pago único, o una Piedra Lunar juntos. Los pases familiares están cubiertos.",
    coreButtonLabel: "Ver cómo funciona Fusion Core",
    formIntroHeading: "Conecta los seis sistemas con tu hora de nacimiento exacta",
    formIntroDesc: "La información que ingresas no se muestra en el texto del resultado ni en el resumen compartido.",
    systemsLegendLabel: "Los seis expertos que comparten esta lectura",
    profileReloadCta: "Recargar mi perfil guardado",
    formSectionBirth: "Cuéntanos el momento en que naciste",
    birthDateLabel: "Fecha de nacimiento",
    birthTimeLabel: "Hora de nacimiento",
    birthTimeUnknownLabel: "No sé mi hora de nacimiento",
    birthTimeUnknownNote: "Si es desconocida, no afirmaremos lecturas basadas en el tiempo como la carta natal, el Lagna, el Ascendente o las casas.",
    birthPlaceLabel: "Lugar de nacimiento",
    birthPlaceUnknownOption: "No sé mi lugar de nacimiento",
    birthPlaceNote: "Se usa para los cálculos de ubicación en la astrología védica y occidental.",
    calendarTypeLabel: "Tipo de calendario",
    calendarSolarLabel: "Solar",
    calendarLunarLabel: "Lunar",
    genderLabel: "Género ",
    optionalTag: "(opcional)",
    genderUnspecifiedOption: "Prefiero no decirlo",
    genderFemaleOption: "Femenino",
    genderMaleOption: "Masculino",
    formSectionMind: "Cuéntanos qué tienes en mente ahora mismo",
    nicknameLabel: "Apodo ",
    nicknamePlaceholder: "Nombre a usar en tu resultado",
    topicLabel: "Tema de interés",
    topicOptionOverall: "Flujo general de la vida",
    topicOptionLove: "Amor y relaciones",
    topicOptionWorkMoney: "Trabajo y dinero",
    topicOptionMind: "Mente y recuperación",
    concernLabel: "Inquietud ",
    concernPlaceholder: "Por favor no incluyas información de identificación personal.",
    pendingRequestNoticePrefix: "Hay una solicitud ya pagada que sigue esperando. Al presionar el botón de abajo, obtendrás el resultado de la misma solicitud ",
    pendingRequestNoticeBold: "sin cargo adicional",
    pendingRequestNoticeSuffix: ".",
    statusRetryCta: "Volver a verificar el estado de uso",
    threadHeadingFailure: "La consulta se detuvo a medio camino",
    threadHeadingDefault: "Los seis expertos están respondiendo por turnos",
    threadSubResultSaved: "Esta es una consulta guardada en tu cuenta. Puedes descargarla como PDF directamente desde esta pantalla.",
    threadSubResultFresh: "Una conversación que lee los seis sistemas por separado y luego los lee de forma cruzada en uno al final.",
    threadSubFailure: "Hemos conservado todo hasta donde llegó. Puedes reintentar y continuar abajo.",
    threadSubIdle: "Preparándonos para invocar los seis sistemas.",
    stagesCompletedPrefix: "",
    stagesCompletedSuffix: " de seis sistemas completos",
    speakerFusionLabel: "Fusion Core",
    speakerCompletedBadge: "Listo",
    speakerWritingBadge: "Escribiendo",
    composeRepairSuffix: " grupo reparado",
    composeDoneSuffix: " grupo de lectura completo",
    composeRepairNote: "Solo estamos reescribiendo los grupos que quedaron cortos. Los grupos ya terminados permanecen como están.",
    composeNormalNote: "Esto supera los 20,000 caracteres, así que escribimos cuatro grupos a la vez. El que termine primero se muestra primero.",
    stalledNotice: "La conexión ha estado en silencio por un rato. Tu resultado se guarda en tu cuenta en el momento en que se completa, así que si la pantalla parece atascada, revisa tu archivo abajo.",
    waitingSuffix: " esperando su turno",
    qualityNoticeHeading: "Aviso de extensión",
    failureHeading: "La generación se detuvo",
    failureReasonPrefix: "Código de motivo ",
    failureReasonSuffix: " — si esto sigue ocurriendo, incluye este código al contactarnos.",
    failureRetryCta: "Reintentar sin cargo adicional",
    cancelGenerationCta: "Detener el análisis",
    pdfMakingLabel: "Creando tu PDF…",
    pdfSaveCta: "Guardar como PDF",
    shareCta: "Compartir resumen (sin información personal)",
    copyReopenLinkCta: "Copiar enlace para reabrir",
    continueGuardianLink: "Continuar con el Benefactor de Hoy",
    dialogCloseAria: "Cerrar la explicación de Fusion Core",
    dialogCloseLabel: "Cerrar",
    dialogKicker: "Fusion Core",
    dialogHeading: "Solo se conectan los análisis completados",
    dialogDesc: "Saju, Ziwei Doushu, Sukuyo, astrología védica, astrología occidental y Tarot se completan por separado, y luego se fusionan en una sola lectura al final.",
    dialogNote: "Si un análisis se interrumpe o falla, reenviar la misma solicitud lo continúa sin cargo adicional.",
  },
  fr: {
    statusInvalidMessage: "La réponse de l'état d'utilisation n'est pas valide.",
    statusUnavailableMessage: "Nous n'avons pas pu vérifier votre état d'utilisation. Veuillez réessayer dans un instant.",
    fieldSystemsAllTitle: "Systèmes qui lisent ceci : les six systèmes",
    fieldSystemsAllSrOnly: "Les systèmes qui lisent cette information : les six systèmes",
    fieldSystemsTitle: (label) => `Systèmes qui lisent ceci : ${label}`,
    fieldSystemsSrOnly: (label) => `Les systèmes qui lisent cette information : ${label}`,
    serverResponseInvalidMessage: "Nous n'avons pas pu confirmer la réponse du serveur.",
    streamStartFailedMessage: "Nous n'avons pas pu démarrer la connexion d'analyse.",
    analysisFailedMessage: "Nous n'avons pas pu terminer l'analyse.",
    noResultReceivedMessage: "Nous n'avons pas reçu de résultat d'analyse. Veuillez réessayer.",
    storedResultLoadFailedMessage: "Nous n'avons pas pu charger le résultat enregistré.",
    guardianHandoffNotice: "Nous n'avons transféré que le sujet laissé par Yeoni. Veuillez revérifier vos informations de naissance et votre question ici.",
    guardianHandoffPrefix: "Nous n'avons repris que le sujet ",
    guardianHandoffSuffix: " laissé par Yeoni. La conversation privée et le résultat original n'ont pas été repris.",
    birthInputRequiredMessage: "Veuillez saisir votre date et heure de naissance, ou sélectionner l'option indiquant que vous ne connaissez pas votre heure de naissance.",
    paymentReason: "Une consultation Fortune Fusion",
    paymentFailedMessage: "Nous n'avons pas pu finaliser le paiement. Veuillez réessayer dans un instant.",
    stageDefaultProgressMessage: "Organisation de votre lecture Fortune Fusion.",
    resultGenerationFailedMessage: "Nous n'avons pas pu générer le résultat.",
    resultCompletedNotice: "Votre résultat est terminé. Il est enregistré dans votre compte afin que vous puissiez le rouvrir à tout moment.",
    analysisCancelledNotice: "L'analyse a été arrêtée. Réessayer avec la même demande n'entraînera pas de frais supplémentaires.",
    shareSuccessNotice: "Un résumé excluant les informations personnelles a été partagé.",
    shareFailedMessage: "Nous n'avons pas pu partager ceci. Veuillez réessayer dans un instant.",
    copyLinkSuccessNotice: "Un lien que vous pouvez rouvrir a été copié. Vous devrez vous connecter avec votre propre compte pour le consulter.",
    copyLinkFailedMessage: "Nous n'avons pas pu copier le lien.",
    pdfCoverFallbackTitle: "Fortune Fusion",
    pdfCoverSubtitle: (topic) => `Lecture croisée à six systèmes · ${topic}`,
    pdfSavedNotice: "Enregistré en PDF.",
    pdfFailedMessage: "Nous n'avons pas pu créer le PDF. Veuillez réessayer dans un instant.",
    buttonLoadingLabel: "Tissage des lectures des six experts…",
    buttonPayingLabel: "Confirmation de votre paiement",
    buttonLoginLabel: "Connectez-vous pour commencer",
    buttonResumeLabel: "Continuer sans frais supplémentaires",
    buttonSubmitLabel: "Générer ma Fortune Fusion",
    navAriaLabel: "Exploration Fortune Fusion",
    threadAriaLabel: "Conversation de la consultation Fortune Fusion",
    navBack: "Retour",
    navHome: "Accueil",
    guardianLinkText: "Une lecture premium qui fait suite au Bienfaiteur du Jour",
    heroTitleLine1: "Six lectures,",
    heroTitleLine2: "une consultation",
    heroDesc: "Nous lisons en profondeur le Saju, le Ziwei Doushu, l'astrologie védique, le Sukuyo, l'astrologie occidentale et le Tarot, chacun dans son propre langage, puis nous les réunissons en une seule lecture croisée. Votre consultation terminée est enregistrée dans votre compte afin que vous puissiez la rouvrir à tout moment et la télécharger en PDF.",
    heroFirstCome: "Lecture croisée à six systèmes",
    heroPriceFallback: "₩30,000",
    heroPricePrefix: "par lecture ",
    heroWordCount: "Plus de 20 000 caractères",
    heroSaveNote: "Enregistré · Réouvrable · PDF",
    chatLead: "Fusion AI vous informe, directement sur cet écran, à mesure que chacun des six systèmes se termine.",
    readingFlowAriaLabel: "L'ordre suivi par cette lecture Fusion",
    readingFlowLead: "Le chemin suivi par cette consultation",
    readingFlowFinalTitle: "Une lecture croisée",
    readingFlowFinalDesc: "Les signaux qui concordent deviennent le schéma central ; les signaux qui diffèrent deviennent des options situationnelles.",
    statusScopeLabel: "Ce que couvre cette lecture",
    statusScopeValue: "Six systèmes · Plus de 20 000 caractères",
    statusScopeNote: "Lit séparément le Saju, le Ziwei Doushu, l'astrologie védique, le Sukuyo, l'astrologie occidentale et le Tarot, puis les lit de manière croisée à la fin.",
    statusMethodLabel: "Mode de facturation",
    statusMethodValue: "Facturé par lecture",
    statusMethodNote: "Au paiement, vous pouvez choisir un pass, un paiement unique, ou une Pierre de Lune ensemble. Les pass familiaux sont couverts.",
    coreButtonLabel: "Voir comment fonctionne Fusion Core",
    formIntroHeading: "Connectez les six systèmes avec votre heure de naissance exacte",
    formIntroDesc: "Les informations que vous saisissez ne sont pas affichées dans le texte du résultat ni dans le résumé partagé.",
    systemsLegendLabel: "Les six experts qui partagent cette lecture",
    profileReloadCta: "Recharger mon profil enregistré",
    formSectionBirth: "Dites-nous le moment de votre naissance",
    birthDateLabel: "Date de naissance",
    birthTimeLabel: "Heure de naissance",
    birthTimeUnknownLabel: "Je ne connais pas mon heure de naissance",
    birthTimeUnknownNote: "Si elle est inconnue, nous n'affirmerons pas les lectures basées sur l'heure comme le thème natal, le Lagna, l'Ascendant ou les maisons.",
    birthPlaceLabel: "Lieu de naissance",
    birthPlaceUnknownOption: "Je ne connais pas mon lieu de naissance",
    birthPlaceNote: "Utilisé pour les calculs de localisation en astrologie védique et occidentale.",
    calendarTypeLabel: "Type de calendrier",
    calendarSolarLabel: "Solaire",
    calendarLunarLabel: "Lunaire",
    genderLabel: "Genre ",
    optionalTag: "(facultatif)",
    genderUnspecifiedOption: "Je préfère ne pas préciser",
    genderFemaleOption: "Femme",
    genderMaleOption: "Homme",
    formSectionMind: "Dites-nous ce que vous avez en tête en ce moment",
    nicknameLabel: "Surnom ",
    nicknamePlaceholder: "Nom à utiliser dans votre résultat",
    topicLabel: "Sujet d'intérêt",
    topicOptionOverall: "Flux général de la vie",
    topicOptionLove: "Amour et relations",
    topicOptionWorkMoney: "Travail et argent",
    topicOptionMind: "Esprit et rétablissement",
    concernLabel: "Préoccupation ",
    concernPlaceholder: "Veuillez ne pas inclure d'informations permettant de vous identifier personnellement.",
    pendingRequestNoticePrefix: "Une demande déjà payée est toujours en attente. En appuyant sur le bouton ci-dessous, vous obtiendrez le résultat de la même demande ",
    pendingRequestNoticeBold: "sans frais supplémentaires",
    pendingRequestNoticeSuffix: ".",
    statusRetryCta: "Revérifier l'état d'utilisation",
    threadHeadingFailure: "La consultation s'est arrêtée en cours de route",
    threadHeadingDefault: "Les six experts répondent à tour de rôle",
    threadSubResultSaved: "Il s'agit d'une consultation enregistrée dans votre compte. Vous pouvez la télécharger en PDF directement depuis cet écran.",
    threadSubResultFresh: "Une conversation qui lit les six systèmes séparément, puis les lit de manière croisée en un seul à la fin.",
    threadSubFailure: "Nous avons conservé tout ce qui a été fait jusque-là. Vous pouvez réessayer et continuer ci-dessous.",
    threadSubIdle: "Préparation de l'appel aux six systèmes.",
    stagesCompletedPrefix: "",
    stagesCompletedSuffix: " des six systèmes terminés",
    speakerFusionLabel: "Fusion Core",
    speakerCompletedBadge: "Terminé",
    speakerWritingBadge: "En cours de rédaction",
    composeRepairSuffix: " groupe réparé",
    composeDoneSuffix: " groupe de lecture terminé",
    composeRepairNote: "Nous ne réécrivons que les groupes qui étaient insuffisants. Les groupes déjà terminés restent tels quels.",
    composeNormalNote: "Cela dépasse 20 000 caractères, nous écrivons donc quatre groupes à la fois. Celui qui termine en premier s'affiche en premier.",
    stalledNotice: "La connexion est silencieuse depuis un moment. Votre résultat est enregistré dans votre compte dès qu'il est terminé, donc si l'écran semble bloqué, vérifiez vos archives ci-dessous.",
    waitingSuffix: " en attente de son tour",
    qualityNoticeHeading: "Avis sur la longueur",
    failureHeading: "La génération s'est arrêtée",
    failureReasonPrefix: "Code de raison ",
    failureReasonSuffix: " — si cela se reproduit, veuillez inclure ce code lorsque vous nous contactez.",
    failureRetryCta: "Réessayer sans frais supplémentaires",
    cancelGenerationCta: "Arrêter l'analyse",
    pdfMakingLabel: "Création de votre PDF…",
    pdfSaveCta: "Enregistrer en PDF",
    shareCta: "Partager le résumé (sans informations personnelles)",
    copyReopenLinkCta: "Copier le lien de réouverture",
    continueGuardianLink: "Continuer avec le Bienfaiteur du Jour",
    dialogCloseAria: "Fermer l'explication de Fusion Core",
    dialogCloseLabel: "Fermer",
    dialogKicker: "Fusion Core",
    dialogHeading: "Seules les analyses terminées sont connectées",
    dialogDesc: "Le Saju, le Ziwei Doushu, le Sukuyo, l'astrologie védique, l'astrologie occidentale et le Tarot sont chacun terminés séparément, puis fusionnés en une seule lecture à la fin.",
    dialogNote: "Si une analyse est interrompue ou échoue, le renvoi de la même demande la poursuit sans frais supplémentaires.",
  },
  de: {
    statusInvalidMessage: "Die Antwort zum Nutzungsstatus ist ungültig.",
    statusUnavailableMessage: "Wir konnten Ihren Nutzungsstatus nicht überprüfen. Bitte versuchen Sie es in Kürze erneut.",
    fieldSystemsAllTitle: "Systeme, die dies lesen: alle sechs Systeme",
    fieldSystemsAllSrOnly: "Die Systeme, die diese Information lesen: alle sechs Systeme",
    fieldSystemsTitle: (label) => `Systeme, die dies lesen: ${label}`,
    fieldSystemsSrOnly: (label) => `Die Systeme, die diese Information lesen: ${label}`,
    serverResponseInvalidMessage: "Wir konnten die Serverantwort nicht bestätigen.",
    streamStartFailedMessage: "Wir konnten die Analyseverbindung nicht starten.",
    analysisFailedMessage: "Wir konnten die Analyse nicht abschließen.",
    noResultReceivedMessage: "Wir haben kein Analyseergebnis erhalten. Bitte versuchen Sie es erneut.",
    storedResultLoadFailedMessage: "Wir konnten das gespeicherte Ergebnis nicht laden.",
    guardianHandoffNotice: "Wir haben nur das von Yeoni hinterlassene Thema übernommen. Bitte überprüfen Sie Ihre Geburtsinformationen und Ihre Frage hier erneut.",
    guardianHandoffPrefix: "Wir haben nur das Thema ",
    guardianHandoffSuffix: " übernommen, das Yeoni hinterlassen hat. Das private Gespräch und das ursprüngliche Ergebnis wurden nicht übernommen.",
    birthInputRequiredMessage: "Bitte geben Sie Ihr Geburtsdatum und Ihre Geburtszeit ein, oder wählen Sie die Option, dass Sie Ihre Geburtszeit nicht kennen.",
    paymentReason: "Eine Fusion-Schicksal-Beratung",
    paymentFailedMessage: "Wir konnten die Zahlung nicht abschließen. Bitte versuchen Sie es in Kürze erneut.",
    stageDefaultProgressMessage: "Ihre Fusion-Schicksal-Deutung wird zusammengestellt.",
    resultGenerationFailedMessage: "Wir konnten das Ergebnis nicht erstellen.",
    resultCompletedNotice: "Ihr Ergebnis ist vollständig. Es wurde in Ihrem Konto gespeichert, damit Sie es jederzeit erneut öffnen können.",
    analysisCancelledNotice: "Die Analyse wurde gestoppt. Ein erneuter Versuch mit derselben Anfrage verursacht keine zusätzlichen Kosten.",
    shareSuccessNotice: "Eine Zusammenfassung ohne persönliche Informationen wurde geteilt.",
    shareFailedMessage: "Wir konnten dies nicht teilen. Bitte versuchen Sie es in Kürze erneut.",
    copyLinkSuccessNotice: "Ein Link zum erneuten Öffnen wurde kopiert. Sie müssen sich mit Ihrem eigenen Konto anmelden, um ihn anzuzeigen.",
    copyLinkFailedMessage: "Wir konnten den Link nicht kopieren.",
    pdfCoverFallbackTitle: "Fusion-Schicksal",
    pdfCoverSubtitle: (topic) => `Sechs-Systeme-Kreuzdeutung · ${topic}`,
    pdfSavedNotice: "Als PDF gespeichert.",
    pdfFailedMessage: "Wir konnten das PDF nicht erstellen. Bitte versuchen Sie es in Kürze erneut.",
    buttonLoadingLabel: "Die Deutungen der sechs Experten werden zusammengeführt…",
    buttonPayingLabel: "Ihre Zahlung wird bestätigt",
    buttonLoginLabel: "Zum Starten anmelden",
    buttonResumeLabel: "Ohne zusätzliche Kosten fortfahren",
    buttonSubmitLabel: "Mein Fusion-Schicksal erstellen",
    navAriaLabel: "Fusion-Schicksal-Erkundung",
    threadAriaLabel: "Fusion-Schicksal-Beratungsgespräch",
    navBack: "Zurück",
    navHome: "Startseite",
    guardianLinkText: "Eine Premium-Deutung, die vom heutigen Wohltäter fortgesetzt wird",
    heroTitleLine1: "Sechs Deutungen,",
    heroTitleLine2: "eine Beratung",
    heroDesc: "Wir lesen Saju, Ziwei Doushu, vedische Astrologie, Sukuyo, westliche Astrologie und Tarot jeweils tiefgehend in ihrer eigenen Sprache und führen sie dann zu einer einzigen Kreuzdeutung zusammen. Ihre fertige Beratung wird in Ihrem Konto gespeichert, damit Sie sie jederzeit erneut öffnen und als PDF herunterladen können.",
    heroFirstCome: "Sechs-Systeme-Kreuzdeutung",
    heroPriceFallback: "₩30,000",
    heroPricePrefix: "pro Deutung ",
    heroWordCount: "Über 20.000 Zeichen",
    heroSaveNote: "Gespeichert · Wieder öffenbar · PDF",
    chatLead: "Fusion AI informiert Sie direkt auf diesem Bildschirm, sobald jedes der sechs Systeme fertig ist.",
    readingFlowAriaLabel: "Die Reihenfolge, in der diese Fusion-Deutung abläuft",
    readingFlowLead: "Der Weg, den diese Beratung nimmt",
    readingFlowFinalTitle: "Eine Kreuzdeutung",
    readingFlowFinalDesc: "Übereinstimmende Signale werden zum Kernmuster; abweichende Signale werden zu situativen Optionen.",
    statusScopeLabel: "Was diese Deutung abdeckt",
    statusScopeValue: "Sechs Systeme · Über 20.000 Zeichen",
    statusScopeNote: "Liest Saju, Ziwei Doushu, vedische Astrologie, Sukuyo, westliche Astrologie und Tarot separat und liest sie am Ende dann kreuzweise.",
    statusMethodLabel: "Abrechnungsart",
    statusMethodValue: "Pro Deutung bezahlt",
    statusMethodNote: "An der Kasse können Sie einen Pass, eine Einmalzahlung oder einen Mondstein gemeinsam auswählen. Familienpässe sind abgedeckt.",
    coreButtonLabel: "Sehen, wie Fusion Core funktioniert",
    formIntroHeading: "Verbinden Sie alle sechs Systeme mit Ihrer genauen Geburtszeit",
    formIntroDesc: "Die von Ihnen eingegebenen Informationen werden weder im Ergebnistext noch in der geteilten Zusammenfassung angezeigt.",
    systemsLegendLabel: "Die sechs Experten, die sich diese Deutung teilen",
    profileReloadCta: "Mein gespeichertes Profil neu laden",
    formSectionBirth: "Sagen Sie uns den Moment Ihrer Geburt",
    birthDateLabel: "Geburtsdatum",
    birthTimeLabel: "Geburtszeit",
    birthTimeUnknownLabel: "Ich kenne meine Geburtszeit nicht",
    birthTimeUnknownNote: "Wenn unbekannt, werden wir zeitbasierte Deutungen wie Geburtshoroskop, Lagna, Aszendent oder Häuser nicht behaupten.",
    birthPlaceLabel: "Geburtsort",
    birthPlaceUnknownOption: "Ich kenne meinen Geburtsort nicht",
    birthPlaceNote: "Wird für die Standortberechnungen in vedischer und westlicher Astrologie verwendet.",
    calendarTypeLabel: "Kalendertyp",
    calendarSolarLabel: "Solar",
    calendarLunarLabel: "Lunar",
    genderLabel: "Geschlecht ",
    optionalTag: "(optional)",
    genderUnspecifiedOption: "Möchte ich nicht angeben",
    genderFemaleOption: "Weiblich",
    genderMaleOption: "Männlich",
    formSectionMind: "Sagen Sie uns, was Ihnen gerade durch den Kopf geht",
    nicknameLabel: "Spitzname ",
    nicknamePlaceholder: "Name, der in Ihrem Ergebnis verwendet wird",
    topicLabel: "Interessensthema",
    topicOptionOverall: "Allgemeiner Lebensfluss",
    topicOptionLove: "Liebe und Beziehungen",
    topicOptionWorkMoney: "Arbeit und Geld",
    topicOptionMind: "Geist und Erholung",
    concernLabel: "Anliegen ",
    concernPlaceholder: "Bitte geben Sie keine personenbezogenen Informationen an.",
    pendingRequestNoticePrefix: "Es gibt noch eine bereits bezahlte Anfrage, die wartet. Wenn Sie unten auf die Schaltfläche klicken, erhalten Sie das Ergebnis für dieselbe Anfrage ",
    pendingRequestNoticeBold: "ohne zusätzliche Kosten",
    pendingRequestNoticeSuffix: ".",
    statusRetryCta: "Nutzungsstatus erneut prüfen",
    threadHeadingFailure: "Die Beratung wurde mittendrin gestoppt",
    threadHeadingDefault: "Die sechs Experten antworten der Reihe nach",
    threadSubResultSaved: "Dies ist eine in Ihrem Konto gespeicherte Beratung. Sie können sie direkt von diesem Bildschirm aus als PDF herunterladen.",
    threadSubResultFresh: "Ein Gespräch, das alle sechs Systeme separat liest und sie am Ende zu einem zusammenführt.",
    threadSubFailure: "Wir haben alles so belassen, wie weit es gekommen ist. Sie können unten fortfahren und es erneut versuchen.",
    threadSubIdle: "Bereitet sich vor, alle sechs Systeme aufzurufen.",
    stagesCompletedPrefix: "",
    stagesCompletedSuffix: " von sechs Systemen abgeschlossen",
    speakerFusionLabel: "Fusion Core",
    speakerCompletedBadge: "Fertig",
    speakerWritingBadge: "Wird geschrieben",
    composeRepairSuffix: " Gruppe repariert",
    composeDoneSuffix: " Lesegruppe fertig",
    composeRepairNote: "Wir schreiben nur die Gruppen neu, die zu kurz ausgefallen sind. Bereits fertige Gruppen bleiben unverändert.",
    composeNormalNote: "Dies umfasst über 20.000 Zeichen, daher schreiben wir vier Gruppen gleichzeitig. Welche zuerst fertig ist, wird zuerst angezeigt.",
    stalledNotice: "Die Verbindung ist seit einer Weile still. Ihr Ergebnis wird sofort nach Fertigstellung in Ihrem Konto gespeichert. Wenn der Bildschirm also festzuhängen scheint, prüfen Sie unten Ihr Archiv.",
    waitingSuffix: " warten an der Reihe",
    qualityNoticeHeading: "Hinweis zur Länge",
    failureHeading: "Die Erstellung wurde gestoppt",
    failureReasonPrefix: "Grundcode ",
    failureReasonSuffix: " — falls dies weiterhin auftritt, geben Sie diesen Code bitte bei Ihrer Kontaktaufnahme an.",
    failureRetryCta: "Ohne zusätzliche Kosten erneut versuchen",
    cancelGenerationCta: "Analyse stoppen",
    pdfMakingLabel: "Ihr PDF wird erstellt…",
    pdfSaveCta: "Als PDF speichern",
    shareCta: "Zusammenfassung teilen (ohne persönliche Daten)",
    copyReopenLinkCta: "Link zum erneuten Öffnen kopieren",
    continueGuardianLink: "Mit dem heutigen Wohltäter fortfahren",
    dialogCloseAria: "Fusion-Core-Erklärung schließen",
    dialogCloseLabel: "Schließen",
    dialogKicker: "Fusion Core",
    dialogHeading: "Nur abgeschlossene Analysen werden verbunden",
    dialogDesc: "Saju, Ziwei Doushu, Sukuyo, vedische Astrologie, westliche Astrologie und Tarot werden jeweils separat abgeschlossen und am Ende zu einer Deutung verschmolzen.",
    dialogNote: "Wenn eine Analyse unterbrochen wird oder fehlschlägt, wird sie durch erneutes Senden derselben Anfrage ohne zusätzliche Kosten fortgesetzt.",
  },
  nl: {
    statusInvalidMessage: "De gebruiksstatusreactie is ongeldig.",
    statusUnavailableMessage: "We konden je gebruiksstatus niet controleren. Probeer het later opnieuw.",
    fieldSystemsAllTitle: "Systemen die dit lezen: alle zes systemen",
    fieldSystemsAllSrOnly: "De systemen die deze informatie lezen: alle zes systemen",
    fieldSystemsTitle: (label) => `Systemen die dit lezen: ${label}`,
    fieldSystemsSrOnly: (label) => `De systemen die deze informatie lezen: ${label}`,
    serverResponseInvalidMessage: "We konden de serverreactie niet bevestigen.",
    streamStartFailedMessage: "We konden de analyseverbinding niet starten.",
    analysisFailedMessage: "We konden de analyse niet voltooien.",
    noResultReceivedMessage: "We hebben geen analyseresultaat ontvangen. Probeer het opnieuw.",
    storedResultLoadFailedMessage: "We konden het opgeslagen resultaat niet laden.",
    guardianHandoffNotice: "We hebben alleen het onderwerp overgenomen dat Yeoni heeft achtergelaten. Controleer hier je geboorte-informatie en vraag opnieuw.",
    guardianHandoffPrefix: "We hebben alleen het onderwerp ",
    guardianHandoffSuffix: " overgenomen dat Yeoni heeft achtergelaten. Het privégesprek en het oorspronkelijke resultaat zijn niet overgenomen.",
    birthInputRequiredMessage: "Voer je geboortedatum en -tijd in, of selecteer de optie dat je je geboortetijd niet kent.",
    paymentReason: "Eén Fusion Fortune-consult",
    paymentFailedMessage: "We konden de betaling niet voltooien. Probeer het later opnieuw.",
    stageDefaultProgressMessage: "Je Fusion Fortune-lezing wordt samengesteld.",
    resultGenerationFailedMessage: "We konden het resultaat niet genereren.",
    resultCompletedNotice: "Je resultaat is voltooid. Het is opgeslagen in je account, zodat je het altijd opnieuw kunt openen.",
    analysisCancelledNotice: "De analyse is gestopt. Opnieuw proberen met hetzelfde verzoek brengt geen extra kosten met zich mee.",
    shareSuccessNotice: "Een samenvatting zonder persoonlijke informatie is gedeeld.",
    shareFailedMessage: "We konden dit niet delen. Probeer het later opnieuw.",
    copyLinkSuccessNotice: "Er is een link gekopieerd die je opnieuw kunt openen. Je moet inloggen met je eigen account om deze te bekijken.",
    copyLinkFailedMessage: "We konden de link niet kopiëren.",
    pdfCoverFallbackTitle: "Fusion Fortune",
    pdfCoverSubtitle: (topic) => `Zes-systemen kruislezing · ${topic}`,
    pdfSavedNotice: "Opgeslagen als PDF.",
    pdfFailedMessage: "We konden de PDF niet maken. Probeer het later opnieuw.",
    buttonLoadingLabel: "De lezingen van de zes experts worden samengeweven…",
    buttonPayingLabel: "Je betaling wordt bevestigd",
    buttonLoginLabel: "Log in om te beginnen",
    buttonResumeLabel: "Doorgaan zonder extra kosten",
    buttonSubmitLabel: "Genereer mijn Fusion Fortune",
    navAriaLabel: "Fusion Fortune verkenning",
    threadAriaLabel: "Fusion Fortune consultgesprek",
    navBack: "Terug",
    navHome: "Home",
    guardianLinkText: "Een premium lezing die doorgaat vanuit De Weldoener van Vandaag",
    heroTitleLine1: "Zes lezingen,",
    heroTitleLine2: "één consult",
    heroDesc: "We lezen Saju, Ziwei Doushu, Vedische astrologie, Sukuyo, Westerse astrologie en Tarot elk diepgaand in hun eigen taal, en brengen ze vervolgens samen in één kruislezing. Je voltooide consult wordt opgeslagen in je account, zodat je het altijd opnieuw kunt openen en als PDF kunt downloaden.",
    heroFirstCome: "Zes-systemen kruislezing",
    heroPriceFallback: "₩30,000",
    heroPricePrefix: "per lezing ",
    heroWordCount: "Meer dan 20.000 tekens",
    heroSaveNote: "Opgeslagen · Opnieuw te openen · PDF",
    chatLead: "Fusion AI laat het je precies op dit scherm weten zodra elk van de zes systemen klaar is.",
    readingFlowAriaLabel: "De volgorde waarin deze Fusion-lezing verloopt",
    readingFlowLead: "Het pad dat dit consult volgt",
    readingFlowFinalTitle: "Eén kruislezing",
    readingFlowFinalDesc: "Signalen die overeenkomen worden het kernpatroon; signalen die verschillen worden situationele opties.",
    statusScopeLabel: "Wat deze lezing dekt",
    statusScopeValue: "Zes systemen · Meer dan 20.000 tekens",
    statusScopeNote: "Leest Saju, Ziwei Doushu, Vedische astrologie, Sukuyo, Westerse astrologie en Tarot afzonderlijk, en leest ze aan het einde kruiselings.",
    statusMethodLabel: "Hoe het wordt gefactureerd",
    statusMethodValue: "Per lezing betaald",
    statusMethodNote: "Bij het afrekenen kun je een pas, een eenmalige betaling of een Maansteen samen kiezen. Gezinspassen worden gedekt.",
    coreButtonLabel: "Bekijk hoe Fusion Core werkt",
    formIntroHeading: "Verbind alle zes systemen met je exacte geboortetijd",
    formIntroDesc: "De informatie die je invoert wordt niet weergegeven in de resultaattekst of de gedeelde samenvatting.",
    systemsLegendLabel: "De zes experts die deze lezing delen",
    profileReloadCta: "Mijn opgeslagen profiel opnieuw laden",
    formSectionBirth: "Vertel ons het moment waarop je geboren bent",
    birthDateLabel: "Geboortedatum",
    birthTimeLabel: "Geboortetijd",
    birthTimeUnknownLabel: "Ik ken mijn geboortetijd niet",
    birthTimeUnknownNote: "Indien onbekend, zullen we tijdgebaseerde lezingen zoals de geboortehoroscoop, Lagna, Ascendant of huizen niet bevestigen.",
    birthPlaceLabel: "Geboorteplaats",
    birthPlaceUnknownOption: "Ik ken mijn geboorteplaats niet",
    birthPlaceNote: "Wordt gebruikt voor locatieberekeningen in Vedische en Westerse astrologie.",
    calendarTypeLabel: "Kalendertype",
    calendarSolarLabel: "Zonnekalender",
    calendarLunarLabel: "Maankalender",
    genderLabel: "Geslacht ",
    optionalTag: "(optioneel)",
    genderUnspecifiedOption: "Liever niet zeggen",
    genderFemaleOption: "Vrouw",
    genderMaleOption: "Man",
    formSectionMind: "Vertel ons wat je nu bezighoudt",
    nicknameLabel: "Bijnaam ",
    nicknamePlaceholder: "Naam om in je resultaat te gebruiken",
    topicLabel: "Onderwerp van interesse",
    topicOptionOverall: "Algemene levensstroom",
    topicOptionLove: "Liefde en relaties",
    topicOptionWorkMoney: "Werk en geld",
    topicOptionMind: "Geest en herstel",
    concernLabel: "Zorg ",
    concernPlaceholder: "Vermeld geen persoonlijk identificeerbare informatie.",
    pendingRequestNoticePrefix: "Er is nog een reeds betaald verzoek in behandeling. Als je op de knop hieronder drukt, krijg je het resultaat voor hetzelfde verzoek ",
    pendingRequestNoticeBold: "zonder extra kosten",
    pendingRequestNoticeSuffix: ".",
    statusRetryCta: "Gebruiksstatus opnieuw controleren",
    threadHeadingFailure: "Het consult is halverwege gestopt",
    threadHeadingDefault: "De zes experts antwoorden om de beurt",
    threadSubResultSaved: "Dit is een consult dat is opgeslagen in je account. Je kunt het rechtstreeks vanaf dit scherm als PDF downloaden.",
    threadSubResultFresh: "Een gesprek dat alle zes systemen afzonderlijk leest en ze aan het einde kruiselings tot één samenvoegt.",
    threadSubFailure: "We hebben alles bewaard tot waar het is gekomen. Je kunt hieronder doorgaan met opnieuw proberen.",
    threadSubIdle: "Bereidt zich voor om alle zes systemen op te roepen.",
    stagesCompletedPrefix: "",
    stagesCompletedSuffix: " van zes systemen voltooid",
    speakerFusionLabel: "Fusion Core",
    speakerCompletedBadge: "Klaar",
    speakerWritingBadge: "Wordt geschreven",
    composeRepairSuffix: " groep hersteld",
    composeDoneSuffix: " leesgroep voltooid",
    composeRepairNote: "We herschrijven alleen de groepen die tekortschoten. Reeds voltooide groepen blijven ongewijzigd.",
    composeNormalNote: "Dit overschrijdt de 20.000 tekens, dus we schrijven vier groepen tegelijk. Welke het eerst klaar is, wordt het eerst getoond.",
    stalledNotice: "De verbinding is al een tijdje stil. Je resultaat wordt opgeslagen in je account zodra het klaar is, dus als het scherm vastzit, controleer dan je archief hieronder.",
    waitingSuffix: " wachten op hun beurt",
    qualityNoticeHeading: "Kennisgeving over lengte",
    failureHeading: "Het genereren is gestopt",
    failureReasonPrefix: "Redencode ",
    failureReasonSuffix: " — als dit blijft gebeuren, vermeld dan deze code wanneer je contact met ons opneemt.",
    failureRetryCta: "Opnieuw proberen zonder extra kosten",
    cancelGenerationCta: "Analyse stoppen",
    pdfMakingLabel: "Je PDF wordt gemaakt…",
    pdfSaveCta: "Opslaan als PDF",
    shareCta: "Samenvatting delen (zonder persoonlijke informatie)",
    copyReopenLinkCta: "Link om opnieuw te openen kopiëren",
    continueGuardianLink: "Doorgaan met De Weldoener van Vandaag",
    dialogCloseAria: "Fusion Core-uitleg sluiten",
    dialogCloseLabel: "Sluiten",
    dialogKicker: "Fusion Core",
    dialogHeading: "Alleen voltooide analyses worden verbonden",
    dialogDesc: "Saju, Ziwei Doushu, Sukuyo, Vedische astrologie, Westerse astrologie en Tarot worden elk afzonderlijk voltooid en aan het einde samengevoegd tot één lezing.",
    dialogNote: "Als een analyse wordt onderbroken of mislukt, gaat deze door zonder extra kosten wanneer je hetzelfde verzoek opnieuw verzendt.",
  },
  ms: {
    statusInvalidMessage: "Respons status penggunaan tidak sah.",
    statusUnavailableMessage: "Kami tidak dapat menyemak status penggunaan anda. Sila cuba lagi sebentar lagi.",
    fieldSystemsAllTitle: "Sistem yang membaca ini: kesemua enam sistem",
    fieldSystemsAllSrOnly: "Sistem yang membaca maklumat ini: kesemua enam sistem",
    fieldSystemsTitle: (label) => `Sistem yang membaca ini: ${label}`,
    fieldSystemsSrOnly: (label) => `Sistem yang membaca maklumat ini: ${label}`,
    serverResponseInvalidMessage: "Kami tidak dapat mengesahkan respons pelayan.",
    streamStartFailedMessage: "Kami tidak dapat memulakan sambungan analisis.",
    analysisFailedMessage: "Kami tidak dapat menyelesaikan analisis.",
    noResultReceivedMessage: "Kami tidak menerima hasil analisis. Sila cuba lagi.",
    storedResultLoadFailedMessage: "Kami tidak dapat memuatkan hasil tersimpan.",
    guardianHandoffNotice: "Kami hanya membawa topik yang ditinggalkan oleh Yeoni. Sila semak semula maklumat kelahiran dan soalan anda di sini.",
    guardianHandoffPrefix: "Kami hanya membawa topik ",
    guardianHandoffSuffix: " yang ditinggalkan oleh Yeoni. Perbualan peribadi dan hasil asal tidak dibawa.",
    birthInputRequiredMessage: "Sila masukkan tarikh dan masa lahir anda, atau pilih pilihan tidak mengetahui masa lahir anda.",
    paymentReason: "Satu perundingan Takdir Gabungan",
    paymentFailedMessage: "Kami tidak dapat menyelesaikan pembayaran. Sila cuba lagi sebentar lagi.",
    stageDefaultProgressMessage: "Sedang menyusun bacaan Takdir Gabungan anda.",
    resultGenerationFailedMessage: "Kami tidak dapat menjana hasil.",
    resultCompletedNotice: "Hasil anda telah selesai. Ia disimpan dalam akaun anda supaya anda boleh membukanya semula pada bila-bila masa.",
    analysisCancelledNotice: "Analisis telah dihentikan. Mencuba semula dengan permintaan yang sama tidak akan dikenakan caj tambahan.",
    shareSuccessNotice: "Ringkasan yang tidak termasuk maklumat peribadi telah dikongsi.",
    shareFailedMessage: "Kami tidak dapat berkongsi ini. Sila cuba lagi sebentar lagi.",
    copyLinkSuccessNotice: "Pautan yang boleh anda buka semula telah disalin. Anda perlu log masuk dengan akaun anda sendiri untuk melihatnya.",
    copyLinkFailedMessage: "Kami tidak dapat menyalin pautan.",
    pdfCoverFallbackTitle: "Takdir Gabungan",
    pdfCoverSubtitle: (topic) => `Bacaan silang enam sistem · ${topic}`,
    pdfSavedNotice: "Disimpan sebagai PDF.",
    pdfFailedMessage: "Kami tidak dapat mencipta PDF. Sila cuba lagi sebentar lagi.",
    buttonLoadingLabel: "Sedang menganyam bacaan enam pakar bersama-sama…",
    buttonPayingLabel: "Sedang mengesahkan pembayaran anda",
    buttonLoginLabel: "Log masuk untuk bermula",
    buttonResumeLabel: "Teruskan tanpa caj tambahan",
    buttonSubmitLabel: "Jana Takdir Gabungan saya",
    navAriaLabel: "Penerokaan Takdir Gabungan",
    threadAriaLabel: "Perbualan perundingan Takdir Gabungan",
    navBack: "Kembali",
    navHome: "Laman Utama",
    guardianLinkText: "Bacaan premium yang bersambung daripada Penderma Hari Ini",
    heroTitleLine1: "Enam bacaan,",
    heroTitleLine2: "satu perundingan",
    heroDesc: "Kami membaca Saju, Ziwei Doushu, astrologi Veda, Sukuyo, astrologi Barat dan Tarot secara mendalam, masing-masing dalam bahasanya sendiri, kemudian menggabungkannya menjadi satu bacaan silang. Perundingan anda yang selesai disimpan dalam akaun anda supaya anda boleh membukanya semula pada bila-bila masa dan memuat turunnya sebagai PDF.",
    heroFirstCome: "Bacaan silang enam sistem",
    heroPriceFallback: "₩30,000",
    heroPricePrefix: "setiap bacaan ",
    heroWordCount: "Lebih 20,000 aksara",
    heroSaveNote: "Disimpan · Boleh dibuka semula · PDF",
    chatLead: "Fusion AI memberitahu anda, terus di skrin ini, apabila setiap satu daripada enam sistem selesai.",
    readingFlowAriaLabel: "Susunan bacaan Fusion ini berlangsung",
    readingFlowLead: "Laluan yang diikuti perundingan ini",
    readingFlowFinalTitle: "Satu bacaan silang",
    readingFlowFinalDesc: "Isyarat yang sepadan menjadi corak teras; isyarat yang berbeza menjadi pilihan mengikut situasi.",
    statusScopeLabel: "Apa yang diliputi bacaan ini",
    statusScopeValue: "Enam sistem · Lebih 20,000 aksara",
    statusScopeNote: "Membaca Saju, Ziwei Doushu, astrologi Veda, Sukuyo, astrologi Barat dan Tarot secara berasingan, kemudian membaca secara silang pada akhirnya.",
    statusMethodLabel: "Cara pengebilan",
    statusMethodValue: "Dibayar setiap bacaan",
    statusMethodNote: "Semasa pembayaran anda boleh memilih pas, pembayaran sekali, atau Batu Bulan bersama-sama. Pas keluarga turut diliputi.",
    coreButtonLabel: "Lihat cara Fusion Core berfungsi",
    formIntroHeading: "Hubungkan kesemua enam sistem dengan masa lahir anda yang tepat",
    formIntroDesc: "Maklumat yang anda masukkan tidak dipaparkan dalam teks hasil atau ringkasan yang dikongsi.",
    systemsLegendLabel: "Enam pakar yang berkongsi bacaan ini",
    profileReloadCta: "Muat semula profil tersimpan saya",
    formSectionBirth: "Beritahu kami saat anda dilahirkan",
    birthDateLabel: "Tarikh lahir",
    birthTimeLabel: "Masa lahir",
    birthTimeUnknownLabel: "Saya tidak tahu masa lahir saya",
    birthTimeUnknownNote: "Jika tidak diketahui, kami tidak akan menegaskan bacaan berasaskan masa seperti carta kelahiran, Lagna, Ascendant, atau rumah.",
    birthPlaceLabel: "Tempat lahir",
    birthPlaceUnknownOption: "Saya tidak tahu tempat lahir saya",
    birthPlaceNote: "Digunakan untuk pengiraan lokasi dalam astrologi Veda dan Barat.",
    calendarTypeLabel: "Jenis kalendar",
    calendarSolarLabel: "Suria",
    calendarLunarLabel: "Lunar",
    genderLabel: "Jantina ",
    optionalTag: "(pilihan)",
    genderUnspecifiedOption: "Tidak mahu nyatakan",
    genderFemaleOption: "Perempuan",
    genderMaleOption: "Lelaki",
    formSectionMind: "Beritahu kami apa yang ada dalam fikiran anda sekarang",
    nicknameLabel: "Nama panggilan ",
    nicknamePlaceholder: "Nama untuk digunakan dalam hasil anda",
    topicLabel: "Topik yang diminati",
    topicOptionOverall: "Aliran keseluruhan kehidupan",
    topicOptionLove: "Cinta dan hubungan",
    topicOptionWorkMoney: "Kerja dan wang",
    topicOptionMind: "Minda dan pemulihan",
    concernLabel: "Kebimbangan ",
    concernPlaceholder: "Sila jangan sertakan maklumat yang boleh mengenal pasti peribadi.",
    pendingRequestNoticePrefix: "Terdapat permintaan yang telah dibayar masih menunggu. Menekan butang di bawah akan memberikan anda hasil untuk permintaan yang sama ",
    pendingRequestNoticeBold: "tanpa caj tambahan",
    pendingRequestNoticeSuffix: ".",
    statusRetryCta: "Semak semula status penggunaan",
    threadHeadingFailure: "Perundingan terhenti di tengah jalan",
    threadHeadingDefault: "Enam pakar sedang menjawab secara bergilir",
    threadSubResultSaved: "Ini adalah perundingan yang disimpan dalam akaun anda. Anda boleh memuat turunnya sebagai PDF terus dari skrin ini.",
    threadSubResultFresh: "Perbualan yang membaca kesemua enam sistem secara berasingan, kemudian membacanya secara silang menjadi satu pada akhirnya.",
    threadSubFailure: "Kami telah mengekalkan segalanya sehingga ke tahap ia terhenti. Anda boleh mencuba semula dan meneruskan di bawah.",
    threadSubIdle: "Bersedia untuk memanggil kesemua enam sistem.",
    stagesCompletedPrefix: "",
    stagesCompletedSuffix: " daripada enam sistem selesai",
    speakerFusionLabel: "Fusion Core",
    speakerCompletedBadge: "Selesai",
    speakerWritingBadge: "Sedang menulis",
    composeRepairSuffix: " kumpulan telah dibaiki",
    composeDoneSuffix: " kumpulan bacaan selesai",
    composeRepairNote: "Kami hanya menulis semula kumpulan yang tidak mencukupi. Kumpulan yang telah selesai kekal seperti sedia ada.",
    composeNormalNote: "Ini melebihi 20,000 aksara, jadi kami menulis empat kumpulan serentak. Yang mana siap dahulu akan dipaparkan dahulu.",
    stalledNotice: "Sambungan telah senyap untuk seketika. Hasil anda disimpan ke akaun anda sebaik sahaja selesai, jadi jika skrin kelihatan tersekat, sila semak arkib anda di bawah.",
    waitingSuffix: " menunggu giliran",
    qualityNoticeHeading: "Notis panjang kandungan",
    failureHeading: "Penjanaan terhenti",
    failureReasonPrefix: "Kod sebab ",
    failureReasonSuffix: " — jika ini terus berlaku, sila sertakan kod ini semasa menghubungi kami.",
    failureRetryCta: "Cuba lagi tanpa caj tambahan",
    cancelGenerationCta: "Hentikan analisis",
    pdfMakingLabel: "Sedang mencipta PDF anda…",
    pdfSaveCta: "Simpan sebagai PDF",
    shareCta: "Kongsi ringkasan (tanpa maklumat peribadi)",
    copyReopenLinkCta: "Salin pautan buka semula",
    continueGuardianLink: "Teruskan dengan Penderma Hari Ini",
    dialogCloseAria: "Tutup penjelasan Fusion Core",
    dialogCloseLabel: "Tutup",
    dialogKicker: "Fusion Core",
    dialogHeading: "Hanya analisis yang selesai disambungkan",
    dialogDesc: "Saju, Ziwei Doushu, Sukuyo, astrologi Veda, astrologi Barat dan Tarot masing-masing selesai secara berasingan, kemudian digabungkan menjadi satu bacaan pada akhirnya.",
    dialogNote: "Jika analisis terganggu atau gagal, menghantar semula permintaan yang sama akan meneruskannya tanpa caj tambahan.",
  },
};

function getFusionFortuneCopy(locale: LoadingLocale): FusionFortuneCopy {
  return FUSION_FORTUNE_COPY[locale] || FUSION_FORTUNE_EN;
}

function useFusionFortuneCopy(): FusionFortuneCopy {
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
  return getFusionFortuneCopy(locale);
}

export function FusionFortuneClient({ seoContent, valuePreview }: { seoContent?: ReactNode; valuePreview?: ReactNode }) {
  const copy = useFusionFortuneCopy();
  const sharedCopy = useFusionSharedCopy();
  const fusionStages = useMemo(() => buildFusionStages(sharedCopy), [sharedCopy]);
  const apiBase = getApiBaseUrl();
  const { ensurePaidAccess, isPaying } = useCoinGate();
  const [status, setStatus] = useState<Status>(EMPTY_STATUS);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  /** refresh() 가 실패해 status 가 EMPTY_STATUS(nextAction:"disabled")에 갇혔을 때만 켠다 —
   *  이때는 새로고침 없이 재확인할 방법이 폼 안에 없으면 생성 자체가 영구히 막힌다. */
  const [statusUnavailable, setStatusUnavailable] = useState(false);
  const [birthPlaces, setBirthPlaces] = useState<BirthPlaceOption[]>(DEFAULT_BIRTH_PLACES);
  /**
   * 결제 증빙은 requestId 에 묶인다. 생성이 실패하면 **같은 id 로** 다시 보내야
   * 추가 결제 없이 결과를 받는다(worker/lib/fusion-fortune.js 의 retryRequestId 계약).
   */
  const paidRequestIdRef = useRef("");
  const requestAbortRef = useRef<AbortController | null>(null);
  const profileTouchedRef = useRef(false);
  const coreDialogRef = useRef<HTMLDialogElement>(null);
  const { seed: profileSeed, seedVersion, reload: reloadProfileSeed } = useAiProfileSeed();
  const [stageStates, setStageStates] = useState<Record<FusionStageKey, FusionStageState>>(initialStageStates);
  /** 융합 단계의 하위 진행 — 서버가 네 그룹을 병렬로 쓰고 끝나는 대로 알려 준다.
   *  phase 가 "repair" 면 미달 묶음을 보완하는 국면이라 카운터의 총량이 다르다. */
  const [composeProgress, setComposeProgress] = useState<{ completed: number; total: number; label: string; phase: string } | null>(null);
  /** 스트림이 조용해진 지 얼마나 됐는지 판정한다. 서버 심박(ping)이 오면 다시 false 가 된다. */
  const [stalled, setStalled] = useState(false);
  const lastEventAtRef = useRef(0);
  /** 결제는 끝났는데 결과를 못 받은 요청이 남아 있는가. 새로고침을 건너 살아남는다. */
  const [pendingPaidRequest, setPendingPaidRequest] = useState(false);
  /** 목표 분량에 못 미친 채 배달된 결과의 안내. 재열람에서도 같은 문구가 붙는다. */
  const [qualityNotice, setQualityNotice] = useState("");
  /** 재열람으로 연 보관본의 입력 요약. PDF 표지가 폼 대신 이걸 본다. */
  const [openedSummary, setOpenedSummary] = useState<{ topic?: string; nickname?: string } | null>(null);
  const [openSection, setOpenSection] = useState<string>("");
  /** 생성 실패는 폼이 아니라 대화 안에 남는다 — 어디까지 진행됐는지와 함께 봐야 재시도를 고른다. */
  const [failure, setFailure] = useState<{ message: string; retryable: boolean; reason?: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const threadRef = useRef<HTMLElement>(null);
  const [guardianHandoff, setGuardianHandoff] = useState<{ topic: string; category: string } | null>(null);
  const [form, setForm] = useState({ birthDate: "", birthTime: "", birthTimeUnknown: false, birthPlaceKey: "", calendarType: "solar", gender: "unspecified", nickname: "", topic: "삶의 전반적인 흐름", concern: "" });
  /** 보관본 — 재열람 목록과 지금 화면에 열린 보관본 id. */
  const [recentList, setRecentList] = useState<FusionRecentItem[]>([]);
  const [openedConsultationId, setOpenedConsultationId] = useState("");
  const [reopeningId, setReopeningId] = useState("");
  /** PDF 캡처 중에는 접힌 섹션을 전부 펼치고 애니메이션을 끈다(백지 PDF 방지). */
  const [exporting, setExporting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await authFetch(`${apiBase}/api/fusion-fortune/status`, { credentials: "include" }, { retryOn401: true, apiBase });
      const payload = await parseJson<Status & { ok?: boolean }>(response, copy);
      // response.ok 이지만 payload.ok 가 아닌 경우도 조용히 넘기면 status 가 EMPTY_STATUS 에
      // 머물러 제출 버튼이 말없이 계속 비활성 상태로 남는다 — 아래 catch 로 합쳐서 항상
      // 사용자에게 재확인할 방법을 준다.
      if (!response.ok || !payload.ok) throw new Error(copy.statusInvalidMessage);
      setStatus(payload);
      setStatusUnavailable(false);
    } catch {
      setStatusUnavailable(true);
      setError(copy.statusUnavailableMessage);
    }
  }, [apiBase, copy]);

  useEffect(() => { void refresh(); }, [refresh]);

  /** 결제 증빙 id 를 ref·저장소·화면 상태에 한꺼번에 반영한다. 세 곳이 어긋나면 이중 결제가 난다. */
  const rememberPaidRequestId = useCallback((value: string) => {
    paidRequestIdRef.current = value;
    storePaidRequestId(value);
    setPendingPaidRequest(Boolean(value));
  }, []);

  // 새로고침으로 돌아온 사용자의 결제 증빙을 되살린다 — 이게 없으면 다음 제출이 재결제다.
  useEffect(() => {
    const stored = readStoredPaidRequestId();
    if (!stored) return;
    paidRequestIdRef.current = stored;
    setPendingPaidRequest(true);
  }, []);

  // 스트림 무음 감시. 서버가 15초마다 심박을 보내므로 45초 침묵은 연결이 끊겼다는 뜻이다.
  // 🔴 이 화면에는 타임아웃이 하나도 없어서, 스트림이 조용히 죽으면 사용자는 영원히 기다렸다.
  useEffect(() => {
    if (!loading) { setStalled(false); return undefined; }
    lastEventAtRef.current = Date.now();
    const timer = window.setInterval(() => {
      setStalled(Date.now() - lastEventAtRef.current > STREAM_SILENCE_MS);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [loading]);

  /** 보관본 목록 새로고침. 비로그인·장애는 조용히 넘긴다 — 재열람은 부가 기능이다. */
  const loadRecentList = useCallback(async () => {
    try {
      const response = await authFetch(`${apiBase}/api/fusion-fortune/result`, { credentials: "include" }, { retryOn401: true, apiBase });
      if (!response.ok) return;
      const payload = await parseJson<{ ok?: boolean; consultations?: FusionRecentItem[] }>(response, copy);
      if (payload.ok && Array.isArray(payload.consultations)) setRecentList(payload.consultations);
    } catch {
      // 목록을 못 불러와도 생성은 그대로 할 수 있어야 한다.
    }
  }, [apiBase, copy]);

  /** 저장된 결과를 연다. 이미 결제한 본인 결과라 추가 결제가 없다. */
  const openConsultation = useCallback(async (id: string) => {
    if (!id) return;
    setReopeningId(id);
    setError("");
    try {
      const response = await authFetch(`${apiBase}/api/fusion-fortune/result?id=${encodeURIComponent(id)}`, { credentials: "include" }, { retryOn401: true, apiBase });
      const payload = await parseJson<{ ok?: boolean; consultation?: { id: string; result: Result; qualityTier?: string; qualityNotice?: string; inputSummary?: { topic?: string; nickname?: string } }; message?: string }>(response, copy);
      if (!response.ok || !payload.ok || !payload.consultation?.result) throw new Error(payload.message || copy.storedResultLoadFailedMessage);
      setResult(payload.consultation.result);
      // 재열람 PDF 의 표지는 폼이 아니라 보관본의 요약에서 온다 — 새 탭에서 열면 폼이 비어 있다.
      setOpenedSummary(payload.consultation.inputSummary || null);
      // 강등 배달이었으면 다시 열었을 때도 같은 안내가 붙는다 — 화면에서만 알리면 근거가 사라진다.
      setQualityNotice(payload.consultation.qualityTier === "degraded" ? (payload.consultation.qualityNotice || "") : "");
      setFailure(null);
      setOpenSection("");
      setOpenedConsultationId(payload.consultation.id);
      rememberConsultationUrl(payload.consultation.id);
      threadRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.storedResultLoadFailedMessage);
    } finally {
      setReopeningId("");
    }
  }, [apiBase, copy]);

  // 첫 진입: ?cid= 가 있으면 그 보관본을 열고, 이어서 목록을 채운다.
  // useSearchParams 를 쓰면 정적 내보내기에서 이 페이지가 통째로 CSR 로 떨어지므로 URL 을 직접 읽는다.
  useEffect(() => {
    const cid = new URLSearchParams(window.location.search).get("cid") || "";
    if (cid) void openConsultation(cid);
    void loadRecentList();
  }, [openConsultation, loadRecentList]);

  useEffect(() => {
    if (!profileSeed || profileTouchedRef.current) return;
    setForm((previous) => ({
      ...previous,
      birthDate: previous.birthDate || profileSeed.birthDate || "",
      birthTime: previous.birthTime || profileSeed.birthTime || "",
      birthTimeUnknown: previous.birthTime || profileSeed.birthTime ? false : Boolean(profileSeed.birthTimeUnknown),
      calendarType: previous.calendarType === "lunar" ? "lunar" : profileSeed.calendarType || previous.calendarType,
      gender: previous.gender !== "unspecified" ? previous.gender : profileSeed.gender === "female" || profileSeed.gender === "male" ? profileSeed.gender : previous.gender,
      nickname: previous.nickname || profileSeed.name || "",
    }));
  }, [profileSeed, seedVersion]);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(FUSION_HANDOFF_KEY);
      window.sessionStorage.removeItem(FUSION_HANDOFF_KEY);
      if (!raw) return;
      const handoff = JSON.parse(raw) as { version?: number; source?: string; topic?: string; category?: string; createdAt?: number };
      const fresh = Number.isFinite(Number(handoff.createdAt)) && Date.now() - Number(handoff.createdAt) < 30 * 60 * 1000;
      const allowedCategories = ["saju", "ziwei", "sukuyo", "vedic", "astrology", "tarot"];
      if (handoff.version !== 1 || handoff.source !== "guardian" || !fresh || !allowedCategories.includes(String(handoff.category))) return;
      const topics: Record<string, string> = {
        love: "연애와 관계",
        money_work: "돈과 일",
        relationship: "연애와 관계",
        mind: "마음과 회복",
        decision: "삶의 전반적인 흐름",
        daily: "삶의 전반적인 흐름",
      };
      setGuardianHandoff({ topic: String(handoff.topic || "daily"), category: String(handoff.category) });
      setForm((previous) => ({ ...previous, topic: topics[String(handoff.topic)] || previous.topic }));
      setNotice(copy.guardianHandoffNotice);
    } catch {
      // A malformed or unavailable handoff is discarded without affecting access.
    }
    // sessionStorage 키를 즉시 지우므로 copy 변경으로 재실행돼도 raw 가 없어 안전하다(멱등).
  }, [copy]);

  useEffect(() => {
    const applyPlaces = () => {
      const places = (window.BIRTH_PLACE_GROUPS || []).flatMap((group) => Array.isArray(group.places) ? group.places : [])
        .filter((place) => place?.label && place?.tz && Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lon)))
        .map((place) => ({ ...place, country: place.country || String(place.label).split("·")[0].trim() }));
      if (places.length) setBirthPlaces(places);
    };
    if (window.BIRTH_PLACE_GROUPS?.length) { applyPlaces(); return; }
    const existing = document.querySelector<HTMLScriptElement>('script[data-fusion-birth-places="true"]');
    if (existing) { existing.addEventListener("load", applyPlaces, { once: true }); return; }
    const script = document.createElement("script");
    script.src = "/js/birth-place-groups.js";
    script.defer = true;
    script.dataset.fusionBirthPlaces = "true";
    script.addEventListener("load", applyPlaces, { once: true });
    document.head.appendChild(script);
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setNotice(""); setFailure(null); setQualityNotice(""); setOpenedSummary(null);
    // useSearchParams 를 쓰면 정적 내보내기에서 이 페이지 전체가 CSR 로 떨어져
    // (BAILOUT_TO_CLIENT_SIDE_RENDERING) 히어로 H1 을 포함한 서버 렌더 HTML 이 통째로 사라진다.
    // 이 값은 제출 시점에만 필요하므로 그때 URL 에서 직접 읽는다.
    const fortuneChatSessionId = new URLSearchParams(window.location.search).get("fortuneChatSession") || "";
    if (status.nextAction === "login") { window.location.assign(status.cta?.targetPath || "/auth/login"); return; }
    if (!form.birthDate || (!form.birthTime && !form.birthTimeUnknown)) { setError(copy.birthInputRequiredMessage); return; }

    // 앞선 시도가 결제까지 끝났다면 그 requestId 를 재사용한다 — 새 id 로 보내면 증빙을
    // 못 찾아 이미 낸 3만원이 사라진다. 저장소까지 보는 이유는 새로고침으로 ref 가 비기 때문이다.
    let requestId = paidRequestIdRef.current || readStoredPaidRequestId();
    if (!requestId) {
      requestId = `${PAID_FEATURE_KEY}:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const gate = await ensurePaidAccess({
        featureKey: PAID_FEATURE_KEY,
        coinPrice: PAID_COIN_PRICE,
        amountKRW: PAID_AMOUNT_KRW,
        reason: copy.paymentReason,
        requestId,
      });
      if (!gate.ok) {
        if (gate.code === "AUTH_REQUIRED") { window.location.assign("/auth/login"); return; }
        if (gate.code !== "PAYMENT_CANCELLED") setError(gate.message || copy.paymentFailedMessage);
        return;
      }
      rememberPaidRequestId(requestId);
    }

    requestAbortRef.current?.abort();
    const controller = new AbortController();
    requestAbortRef.current = controller;
    setStageStates(initialStageStates());
    setComposeProgress(null);
    setOpenedConsultationId("");
    setLoading(true);
    try {
      const selectedPlace = birthPlaces.find((place) => place.label === form.birthPlaceKey);
      const requestBody = {
        birthDate: form.birthDate,
        birthTime: form.birthTimeUnknown ? "" : form.birthTime,
        birthTimeUnknown: form.birthTimeUnknown,
        calendarType: form.calendarType,
        gender: form.gender,
        nickname: form.nickname,
        topic: form.topic,
        concern: form.concern,
        ...(selectedPlace ? { birthPlace: { city: selectedPlace.label, country: selectedPlace.country, latitude: selectedPlace.lat, longitude: selectedPlace.lon, timezone: selectedPlace.tz } } : {}),
      };
      const response = await authFetch(`${apiBase}/api/fusion-fortune/generate/stream`, {
        method: "POST", credentials: "include", signal: controller.signal,
        headers: { "Content-Type": "application/json", Accept: "text/event-stream", "Idempotency-Key": requestId },
        body: JSON.stringify({ ...requestBody, requestId }),
      }, { retryOn401: true, apiBase });
      const payload = await consumeFusionStream(response, copy, (streamEvent, streamPayload) => {
        // 심박(ping)을 포함한 **모든** 이벤트가 무음 감시를 되돌린다.
        lastEventAtRef.current = Date.now();
        if (streamEvent !== "stage" || typeof streamPayload.stage !== "string") return;
        if (streamPayload.stage === "compose") {
          setComposeProgress({
            completed: Number(streamPayload.completedGroups) || 0,
            total: Number(streamPayload.totalGroups) || 4,
            label: String(streamPayload.groupLabel || ""),
            phase: String(streamPayload.phase || "compose"),
          });
          setStageStates((current) => ({ ...current, fusion: "active" }));
          return;
        }
        const completed = streamPayload.stage as FusionStageKey;
        if (!fusionStages.some((stage) => stage.key === completed)) return;
        setStageStates(() => {
          const completedIndex = fusionStages.findIndex((stage) => stage.key === completed);
          return fusionStages.reduce((next, stage, index) => ({
            ...next,
            [stage.key]: index <= completedIndex ? "completed" : index === completedIndex + 1 ? "active" : "pending",
          }), {} as Record<FusionStageKey, FusionStageState>);
        });
        if (fortuneChatSessionId) {
          void authFetch(`${apiBase}/api/fortune-chat/sessions/${encodeURIComponent(fortuneChatSessionId)}`, {
            method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ append: true, mode: "fusion_deep_reading", paymentStatus: "completed", generationStatus: "running", messages: [{ id: `fusion-stage-${completed}`, speaker: "assistant", kind: "progress", text: fusionStages.find((stage) => stage.key === completed)?.message || copy.stageDefaultProgressMessage }] }),
          }, { retryOn401: true, apiBase });
        }
      });
      const streamResult = payload.result as Result | undefined;
      const fusionStatus = payload.fusionStatus as Status | undefined;
      if (!streamResult || !fusionStatus) throw new Error(String(payload.message || copy.resultGenerationFailedMessage));
      setResult(streamResult); setStatus(fusionStatus); setNotice(copy.resultCompletedNotice);
      // 목표 분량에 못 미친 채 배달됐으면 숨기지 않고 그대로 말한다.
      setQualityNotice(payload.qualityTier === "degraded" ? String(payload.qualityNotice || "") : "");
      // 보관본 id 가 오면 같은 링크로 다시 열 수 있게 URL 에 남기고 목록도 갱신한다.
      const savedId = String(payload.consultationId || "");
      if (savedId) {
        setOpenedConsultationId(savedId);
        rememberConsultationUrl(savedId);
        void loadRecentList();
      }
      if (fortuneChatSessionId) {
        void authFetch(`${apiBase}/api/fortune-chat/sessions/${encodeURIComponent(fortuneChatSessionId)}`, {
          method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ append: true, mode: "fusion_deep_reading", paymentStatus: "completed", generationStatus: "completed", messages: [{ id: `fusion-${payload.requestId || Date.now()}`, speaker: "assistant", kind: "fusion_result", text: streamResult.openingMessage, detail: streamResult.executiveSummary, result: streamResult }] }),
        }, { retryOn401: true, apiBase });
        window.setTimeout(() => window.location.assign(`/fortune-chat?session=${encodeURIComponent(fortuneChatSessionId)}`), 300);
      }
      // 결과를 받았으면 이 결제는 소진됐다. 다음 상담은 새로 결제한다.
      rememberPaidRequestId("");
    } catch (cause) {
      // 결제는 생성 전에 끝났다. "차감되지 않았다"고 말하면 거짓이므로, 실제로 안전한 것
      // (같은 requestId 재시도에 추가 결제가 없다는 점)만 안내한다.
      if ((cause as Error)?.name === "AbortError") setNotice(copy.analysisCancelledNotice);
      else setFailure({
        message: cause instanceof Error ? cause.message : copy.resultGenerationFailedMessage,
        // 결제 증빙이 남아 있으면(=paidRequestIdRef) 같은 id 재시도에 추가 결제가 없다.
        retryable: Boolean(paidRequestIdRef.current) || (cause as { retryable?: boolean })?.retryable === true,
        reason: [(cause as { errorCode?: string })?.errorCode, ...((cause as { issues?: string[] })?.issues || [])]
          .filter(Boolean).join(" · "),
      });
    } finally {
      if (requestAbortRef.current === controller) requestAbortRef.current = null;
      setLoading(false);
    }
  };

  const cancelGeneration = () => requestAbortRef.current?.abort();

  const share = async () => {
    if (!result) return;
    const data = { title: result.title, text: result.shareText || result.executiveSummary.slice(0, 220), url: `${location.origin}/fusion-fortune` };
    try {
      if (navigator.share) await navigator.share(data);
      else await navigator.clipboard.writeText(`${data.text}\n${data.url}`);
      setNotice(copy.shareSuccessNotice);
    } catch (cause) { if ((cause as Error)?.name !== "AbortError") setError(copy.shareFailedMessage); }
  };

  const copyReopenLink = async () => {
    if (!openedConsultationId) return;
    try {
      await navigator.clipboard.writeText(`${location.origin}/fusion-fortune?cid=${encodeURIComponent(openedConsultationId)}`);
      setNotice(copy.copyLinkSuccessNotice);
    } catch {
      setError(copy.copyLinkFailedMessage);
    }
  };

  /**
   * PDF 저장.
   *
   * 본문은 결과 JSON 에서 직접 조판한다(글자 선택·검색 가능, 용량은 캡처 방식의 수십분의 1).
   * 도표만 그림이라 그 블록 하나를 캡처하므로, 캡처 전에 exporting 을 켜 지연 렌더를 풀고
   * 두 프레임 + 여유를 기다린다(인생의 책과 같은 관용구).
   *
   * 🔴 R2 한글 폰트를 못 실으면 텍스트 조판은 통째로 깨진다. 그때만 기존 캡처 방식으로
   *    되돌아간다 — 읽을 수 없는 문서를 내려주는 것보다 무거운 이미지 PDF 가 낫다.
   */
  const downloadPdf = async () => {
    if (!result || exporting) return;
    setError("");
    setExporting(true);
    const fileName = `fusion-fortune-${openedConsultationId || new Date().toISOString().slice(0, 10)}.pdf`;
    try {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await new Promise((resolve) => setTimeout(resolve, 120));
      const { exportFusionReportPdf, FusionPdfFontError } = await import("../../lib/pdf/export-fusion-report-pdf");
      try {
        await exportFusionReportPdf({
          result,
          fileName,
          topic: openedSummary?.topic || form.topic,
          nickname: openedSummary?.nickname || form.nickname || undefined,
          date: new Date().toLocaleDateString(INTL_LOCALE_BY_LOADING_LOCALE[getCurrentLoadingLocale()]),
          qualityNotice,
          visualizationSelector: "[data-fusion-visual]",
        });
      } catch (cause) {
        if (!(cause instanceof FusionPdfFontError)) throw cause;
        const { exportResultPdf } = await import("../../lib/pdf/export-result-pdf");
        await exportResultPdf({
          captureTargets: ["[data-fusion-pdf-section]"],
          fileName,
          backgroundColor: "#12102a",
          cover: {
            title: result.title || copy.pdfCoverFallbackTitle,
            subtitle: copy.pdfCoverSubtitle(openedSummary?.topic || form.topic),
            name: openedSummary?.nickname || form.nickname || undefined,
            date: new Date().toLocaleDateString(INTL_LOCALE_BY_LOADING_LOCALE[getCurrentLoadingLocale()]),
          },
          watermarkText: "CODE DESTINY",
        });
      }
      setNotice(copy.pdfSavedNotice);
    } catch {
      setError(copy.pdfFailedMessage);
    } finally {
      setExporting(false);
    }
  };

  const buttonLabel = loading
    ? copy.buttonLoadingLabel
    : isPaying
      ? copy.buttonPayingLabel
      : status.nextAction === "login"
        ? copy.buttonLoginLabel
        : pendingPaidRequest
          ? copy.buttonResumeLabel
          : copy.buttonSubmitLabel;
  // 결제 결정이 실제로 일어나는 지점은 이 버튼이다 — 여기까지 금액이 따라오지 않으면
  // 사용자는 일반적인 이름의 버튼을 누른 뒤에야 결제창에서 금액을 처음 본다. 재개·로그인·
  // 진행 중 상태는 결제가 아니므로 붙이지 않는다(재개는 추가 결제가 없다).
  const showSubmitPrice = !loading && !isPaying && status.nextAction !== "login" && !pendingPaidRequest;
  const toggleSection = (key: string) => setOpenSection((current) => current === key ? "" : key);
  const completedStageCount = useMemo(
    () => fusionStages.filter((stage) => stage.key !== "fusion" && stageStates[stage.key] === "completed").length,
    [fusionStages, stageStates],
  );
  const leaveExperience = useCallback(() => {
    const fallback = "/#fortuneGatewayEntry";
    if (typeof window === "undefined") return;
    try {
      const previous = document.referrer ? new URL(document.referrer) : null;
      if (previous?.origin === window.location.origin && window.history.length > 1) {
        window.history.back();
        return;
      }
    } catch {
      // A malformed or unavailable referrer should keep the user in the service.
    }
    window.location.assign(fallback);
  }, []);

  return <main className={styles.page}>
    <nav className={styles.experienceNav} aria-label={copy.navAriaLabel}>
      <button type="button" onClick={leaveExperience}>{copy.navBack}</button>
      <Link href="/#fortuneGatewayEntry">{copy.navHome}</Link>
    </nav>
    <section className={styles.hero}>
      <Image className={styles.heroImage} src="/images/fusion-fortune/fusion-guardian-celestial-hero.webp" alt="" fill priority sizes="(max-width: 720px) 100vw, 1080px" />
      <div className={styles.heroVeil} />
      <div className={styles.heroCopy}>
        <Link className={styles.guardianLink} href="/#guardian-fortune">{copy.guardianLinkText}</Link>
        <h1>{copy.heroTitleLine1}<br />{copy.heroTitleLine2}</h1>
        <p>{copy.heroDesc}</p>
        <div className={styles.heroMeta}>
          <span className={styles.firstCome}>{copy.heroFirstCome}</span>
          <PriceBadge featureKey={PAID_FEATURE_KEY} fallbackLabel={copy.heroPriceFallback} prefix={copy.heroPricePrefix} className={styles.heroPrice} />
          <span>{copy.heroWordCount}</span>
          <span>{copy.heroSaveNote}</span>
        </div>
        <p className={styles.chatLead}>{copy.chatLead}</p>
      </div>
      <FusionOrb orbCoreAlt={sharedCopy.orbCoreAlt} />
    </section>

    {/* 여섯 체계를 카드 세 장으로 요약하는 대신, 실제로 지나가는 순서를 그대로 보여 준다.
        같은 색(fusionOrbs tint)이 아래 생성 화면의 말풍선에서 다시 등장해 한 흐름으로 읽힌다. */}
    <section className={styles.readingFlow} aria-label={copy.readingFlowAriaLabel}>
      <p className={styles.readingFlowLead}>{copy.readingFlowLead}</p>
      <ol className={styles.readingFlowList}>
        {FUSION_ORBS.map((orb) => (
          <li key={orb.key} style={{ "--tint": orb.tint } as React.CSSProperties}>
            <i aria-hidden className={styles.systemDot} />
            <strong>{orb.label}</strong>
          </li>
        ))}
        <li className={styles.readingFlowFinal}>
          <strong>{copy.readingFlowFinalTitle}</strong>
          <span>{copy.readingFlowFinalDesc}</span>
        </li>
      </ol>
    </section>

    <FusionRecentList items={recentList} activeId={openedConsultationId} busyId={reopeningId} onOpen={(id) => void openConsultation(id)} />

    {valuePreview}

    <section className={styles.panel}>
      <div className={styles.status}>
        <div><span>{copy.statusScopeLabel}</span><strong>{copy.statusScopeValue}</strong><small>{copy.statusScopeNote}</small></div>
        <div><span>{copy.statusMethodLabel}</span><strong>{copy.statusMethodValue}</strong><small>{copy.statusMethodNote}</small></div>
        <button className={styles.coreButton} type="button" onClick={() => coreDialogRef.current?.showModal()} aria-haspopup="dialog">{copy.coreButtonLabel}</button>
      </div>
      {<form ref={formRef} className={styles.form} onSubmit={submit} onInputCapture={() => { profileTouchedRef.current = true; }}>
        <div className={styles.formIntro}>
          <h2>{copy.formIntroHeading}</h2>
          <p>{copy.formIntroDesc}</p>
          <p className={styles.systemsLegend}>{copy.systemsLegendLabel}
            <span className={styles.systemsLegendList}>
              {FUSION_ORBS.map((orb) => (
                <span key={orb.key} className={styles.systemsLegendItem}>
                  <i aria-hidden className={styles.systemDot} style={{ "--tint": orb.tint } as React.CSSProperties} />{orb.label}
                </span>
              ))}
            </span>
          </p>
          {guardianHandoff && <p className={styles.handoffNotice}>{copy.guardianHandoffPrefix}<strong>{guardianHandoff.topic}</strong>{copy.guardianHandoffSuffix}</p>}
          <button className={styles.profileReload} type="button" onClick={() => void reloadProfileSeed()}>{copy.profileReloadCta}</button>
        </div>
        <p className={styles.formSectionFirst}>{copy.formSectionBirth}</p>
        <label><span className={styles.labelRow}>{copy.birthDateLabel}<FieldSystems field="birthDate" copy={copy} /></span><input required {...birthDateTextInputProps(form.birthDate, (nextBirthDate) => setForm({ ...form, birthDate: nextBirthDate }))} /></label>
        <label><span className={styles.labelRow}>{copy.birthTimeLabel}<FieldSystems field="birthTime" copy={copy} /></span><input type="time" required={!form.birthTimeUnknown} disabled={form.birthTimeUnknown} value={form.birthTime} onChange={(event) => setForm({ ...form, birthTime: event.target.value })} /><span className={styles.inlineCheck}><input type="checkbox" checked={form.birthTimeUnknown} onChange={(event) => setForm({ ...form, birthTimeUnknown: event.target.checked, birthTime: event.target.checked ? "" : form.birthTime })} /> {copy.birthTimeUnknownLabel}</span><small>{copy.birthTimeUnknownNote}</small></label>
        <label><span className={styles.labelRow}>{copy.birthPlaceLabel}<FieldSystems field="birthPlace" copy={copy} /></span><select value={form.birthPlaceKey} onChange={(event) => setForm({ ...form, birthPlaceKey: event.target.value })}><option value="">{copy.birthPlaceUnknownOption}</option>{birthPlaces.map((place) => <option key={`${place.label}-${place.lat}-${place.lon}`} value={place.label}>{place.label}</option>)}</select><small>{copy.birthPlaceNote}</small></label>
        <fieldset><legend><span className={styles.labelRow}>{copy.calendarTypeLabel}<FieldSystems field="calendarType" copy={copy} /></span></legend><label><input type="radio" checked={form.calendarType === "solar"} onChange={() => setForm({ ...form, calendarType: "solar" })} /> {copy.calendarSolarLabel}</label><label><input type="radio" checked={form.calendarType === "lunar"} onChange={() => setForm({ ...form, calendarType: "lunar" })} /> {copy.calendarLunarLabel}</label></fieldset>
        <label><span className={styles.labelRow}><span>{copy.genderLabel}<em>{copy.optionalTag}</em></span><FieldSystems field="gender" copy={copy} /></span><select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}><option value="unspecified">{copy.genderUnspecifiedOption}</option><option value="female">{copy.genderFemaleOption}</option><option value="male">{copy.genderMaleOption}</option></select></label>
        <p className={styles.formSection}>{copy.formSectionMind}</p>
        <label>{copy.nicknameLabel}<em>{copy.optionalTag}</em><input maxLength={40} value={form.nickname} onChange={(event) => setForm({ ...form, nickname: event.target.value })} placeholder={copy.nicknamePlaceholder} /></label>
        <label><span className={styles.labelRow}>{copy.topicLabel}<FieldSystems field="topic" copy={copy} /></span><select value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value })}><option value="삶의 전반적인 흐름">{copy.topicOptionOverall}</option><option value="연애와 관계">{copy.topicOptionLove}</option><option value="일과 돈">{copy.topicOptionWorkMoney}</option><option value="마음과 회복">{copy.topicOptionMind}</option></select></label>
        <label className={styles.wide}><span className={styles.labelRow}><span>{copy.concernLabel}<em>{copy.optionalTag}</em></span><FieldSystems field="concern" copy={copy} /></span><textarea maxLength={1000} value={form.concern} onChange={(event) => setForm({ ...form, concern: event.target.value })} placeholder={copy.concernPlaceholder} /></label>
        {status.message && <p className={styles.notice}>{status.message}</p>}{notice && <p className={styles.success} role="status">{notice}</p>}
        {/* 결제는 끝났는데 결과를 못 받은 요청이 남아 있으면 그것부터 알린다 — 이 안내가 없으면
            사용자는 처음부터 다시 하는 줄 알고 결제를 한 번 더 한다. */}
        {pendingPaidRequest && !loading && !result && <p className={`${styles.wide} ${styles.notice}`} role="status">
          {copy.pendingRequestNoticePrefix}<b>{copy.pendingRequestNoticeBold}</b>{copy.pendingRequestNoticeSuffix}
        </p>}
        {error && <div className={styles.wide}>
          <p className={styles.error} role="alert">{error}</p>
          {statusUnavailable && <button type="button" className={styles.profileReload} onClick={() => { setError(""); void refresh(); }}>{copy.statusRetryCta}</button>}
        </div>}
        <button disabled={loading || isPaying || status.nextAction === "disabled"} type="submit">
          <span>{buttonLabel}</span>
          {showSubmitPrice && <PriceBadge featureKey={PAID_FEATURE_KEY} fallbackLabel={copy.heroPriceFallback} prefix={copy.heroPricePrefix} className={styles.submitPrice} />}
        </button>
      </form>}
    </section>

    {/* 생성과 결과는 끊기지 않는 하나의 대화다. 진행 표시는 서버가 실제로 보낸 stage/compose
        이벤트에서만 오고, 결과 말풍선의 순차 등장은 진행 흉내가 아니라 등장 연출이다. */}
    {(loading || result || failure) && <section
      ref={threadRef}
      aria-label={copy.threadAriaLabel}
      className="relative z-[2] mx-auto mb-[26px] w-full max-w-[1080px] overflow-hidden rounded-[28px] border border-[rgba(200,177,235,0.27)] bg-[linear-gradient(145deg,rgba(24,19,48,0.94),rgba(13,11,29,0.97))] shadow-[0_24px_70px_rgba(0,0,0,0.3)]"
    >
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(120%_100%_at_50%_0%,rgba(160,92,214,0.24),transparent_72%)]" />

      <header className="relative flex items-center gap-5 border-b border-white/[0.07] px-4 py-6 sm:px-9">
        <div className="hidden w-[7.5rem] shrink-0 sm:block"><FusionOrb stageStates={stageStates} orbCoreAlt={sharedCopy.orbCoreAlt} /></div>
        <div className="min-w-0">
          <h2 className={`m-0 ${styles.readingTitle} text-[clamp(1.32rem,3.9vw,2.05rem)] leading-snug text-[var(--fx-ink-1)]`}>
            {result ? result.title : failure ? copy.threadHeadingFailure : copy.threadHeadingDefault}
          </h2>
          <p className="m-0 mt-2.5 max-w-[56ch] text-[0.9rem] leading-[1.8] text-[var(--fx-ink-3)]" role={loading ? "status" : undefined} aria-live={loading ? "polite" : "off"}>
            {result
              ? openedConsultationId && !loading
                ? copy.threadSubResultSaved
                : copy.threadSubResultFresh
              : failure
                ? copy.threadSubFailure
                : fusionStages.find((stage) => stageStates[stage.key] === "active")?.message || copy.threadSubIdle}
          </p>
          {!result && loading && <p className="m-0 mt-2 text-[0.82rem] text-[var(--fx-ink-4)]">{copy.stagesCompletedPrefix}<b className="font-display text-[var(--fx-gold)]">{completedStageCount}</b>{copy.stagesCompletedSuffix}</p>}
        </div>
      </header>

      <ol className="relative m-0 grid list-none gap-5 px-4 py-7 sm:px-9 sm:py-9">
        {/* 대화의 척추. 좌표 = 목록 좌우 여백(16/36px) + 아바타 반지름(18px). */}
        <span aria-hidden className="pointer-events-none absolute bottom-12 left-[34px] top-12 w-px bg-[linear-gradient(180deg,transparent,rgba(201,181,243,0.3),transparent)] sm:left-[54px]" />

        {/* 생성 중에는 끝난 체계와 지금 쓰는 체계만 말한다. 아직 없는 내용을 자리로 약속하지 않는다. */}
        {!result && fusionStages.map((stage, index) => {
          const state = stageStates[stage.key];
          if (state === "pending") return null;
          const systemKey = stage.key === "fusion" ? "fusion" : stage.key as FusionSystemKey;
          return <ThreadRow key={stage.key} systemKey={systemKey} index={index} dataState={state}>
            <ThreadBubble systemKey={systemKey}>
              <ThreadSpeaker
                label={stage.key === "fusion" ? copy.speakerFusionLabel : stage.label}
                note={state === "completed"
                  ? <span className="rounded-full bg-[var(--tint-veil)] px-2.5 py-0.5 text-[0.7rem] text-white/80">{copy.speakerCompletedBadge}</span>
                  : <span className="inline-flex items-center gap-2 rounded-full bg-[var(--tint-veil)] px-2.5 py-0.5 text-[0.7rem] text-white/80"><TypingDots />{copy.speakerWritingBadge}</span>}
              />
              <p className={`m-0 max-w-[72ch] ${styles.reading} text-[1rem] leading-[1.9] text-[var(--fx-ink-2)]`}>{state === "completed" ? stage.done : stage.message}</p>
              {stage.key === "fusion" && composeProgress && <div className="mt-4 rounded-xl border border-white/[0.08] bg-black/25 px-4 py-3.5">
                <p className="m-0 text-[0.85rem] text-[var(--fx-ink-3)]">
                  <strong className="font-display text-[var(--fx-gold)]">{composeProgress.completed} / {composeProgress.total}</strong>
                  {composeProgress.phase === "repair" ? copy.composeRepairSuffix : copy.composeDoneSuffix}{composeProgress.label ? ` · ${composeProgress.label}` : ""}
                </p>
                <span aria-hidden className="mt-2.5 block h-1.5 overflow-hidden rounded-full bg-white/[0.09]">
                  <em className="block h-full origin-left rounded-full bg-[linear-gradient(90deg,var(--fx-violet),var(--fx-gold-2))] transition-transform duration-700 ease-out motion-reduce:transition-none" style={{ transform: `scaleX(${Math.min(1, composeProgress.completed / Math.max(1, composeProgress.total))})` }} />
                </span>
                <small className="mt-2.5 block text-[0.78rem] leading-relaxed text-[var(--fx-ink-4)]">
                  {composeProgress.phase === "repair"
                    ? copy.composeRepairNote
                    : copy.composeNormalNote}
                </small>
                {stalled && <p className="m-0 mt-3 border-t border-white/[0.08] pt-3 text-[0.78rem] leading-relaxed text-[var(--fx-rose)]">
                  {copy.stalledNotice}
                </p>}
              </div>}
            </ThreadBubble>
          </ThreadRow>;
        })}

        {!result && loading && fusionStages.some((stage) => stageStates[stage.key] === "pending") && <li className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-x-3.5">
          <span aria-hidden className="grid size-9 place-items-center"><i className="size-1.5 rounded-full bg-white/30" /></span>
          <p className="m-0 text-[0.84rem] leading-relaxed text-white/55">
            {fusionStages.filter((stage) => stageStates[stage.key] === "pending").map((stage) => stage.label).join(" · ")}{copy.waitingSuffix}
          </p>
        </li>}

        {result && qualityNotice && <li>
          <div role="status" className="rounded-[1.375rem] border border-[rgba(232,213,163,0.3)] bg-[rgba(232,213,163,0.08)] px-5 py-4 sm:px-6">
            <p className="m-0 font-display text-[0.82rem] text-[var(--fx-gold)]">{copy.qualityNoticeHeading}</p>
            <p className="m-0 mt-1.5 max-w-[64ch] text-[0.9rem] leading-[1.8] text-[var(--fx-gold-2)]">{qualityNotice}</p>
          </div>
        </li>}

        {result && <FusionResultThread result={result} openSection={openSection} onToggleSection={toggleSection} exporting={exporting} />}

        {failure && <li className="animate-fade-in-up opacity-0 motion-reduce:animate-none motion-reduce:opacity-100">
          <div role="alert" className="relative overflow-hidden rounded-[1.375rem] border border-[rgba(244,190,209,0.34)] bg-[rgba(74,24,47,0.34)] px-5 py-5 sm:px-6">
            <p className="m-0 font-display text-[0.85rem] text-[var(--fx-rose)]">{copy.failureHeading}</p>
            <p className="m-0 mt-2 max-w-[64ch] text-[0.95rem] leading-[1.8] text-[var(--fx-rose)]">{failure.message}</p>
            {failure.reason && <p className="m-0 mt-2 text-[0.75rem] leading-relaxed text-[var(--fx-rose-dim)]">{copy.failureReasonPrefix}<code className="font-mono">{failure.reason}</code>{copy.failureReasonSuffix}</p>}
            {failure.retryable && <button
              type="button"
              onClick={() => formRef.current?.requestSubmit()}
              className="mt-4 min-h-11 rounded-full border border-[rgba(244,190,209,0.45)] bg-[rgba(244,190,209,0.14)] px-5 text-[0.9rem] text-[var(--fx-rose)] transition-colors hover:bg-[rgba(244,190,209,0.24)] motion-reduce:transition-none"
            >{copy.failureRetryCta}</button>}
          </div>
        </li>}
      </ol>

      {(loading || result) && <footer className="relative flex flex-wrap gap-3 border-t border-white/[0.07] px-4 py-5 sm:px-9">
        {loading
          ? <button type="button" onClick={cancelGeneration} className="min-h-11 rounded-full border border-white/[0.18] px-5 text-[0.88rem] text-[var(--fx-ink-3)] transition-colors hover:border-[var(--fx-violet-soft)] hover:text-[var(--fx-ink-1)] motion-reduce:transition-none">{copy.cancelGenerationCta}</button>
          : <>
            <button
              type="button"
              onClick={() => void downloadPdf()}
              disabled={exporting}
              className="min-h-11 rounded-full border border-[rgba(232,213,163,0.42)] bg-[rgba(232,213,163,0.12)] px-5 text-[0.9rem] font-bold text-[var(--fx-gold)] transition-colors hover:bg-[rgba(232,213,163,0.2)] disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
            >{exporting ? copy.pdfMakingLabel : copy.pdfSaveCta}</button>
            <button type="button" onClick={() => void share()} className="min-h-11 rounded-full border border-white/[0.16] px-5 text-[0.9rem] text-[var(--fx-ink-3)] transition-colors hover:border-[var(--fx-violet-soft)] hover:text-[var(--fx-ink-1)] motion-reduce:transition-none">{copy.shareCta}</button>
            {openedConsultationId && <button type="button" onClick={() => void copyReopenLink()} className="min-h-11 rounded-full border border-white/[0.16] px-5 text-[0.9rem] text-[var(--fx-ink-3)] transition-colors hover:border-[var(--fx-violet-soft)] hover:text-[var(--fx-ink-1)] motion-reduce:transition-none">{copy.copyReopenLinkCta}</button>}
            <Link href="/#guardian-fortune" className="inline-flex min-h-11 items-center rounded-full border border-white/[0.16] px-5 text-[0.9rem] text-[var(--fx-ink-3)] transition-colors hover:border-[var(--fx-violet-soft)] hover:text-[var(--fx-ink-1)] motion-reduce:transition-none">{copy.continueGuardianLink}</Link>
          </>}
      </footer>}
    </section>}
    <dialog ref={coreDialogRef} className={styles.coreDialog} aria-labelledby="fusion-core-dialog-title">
      <form method="dialog"><button className={styles.dialogClose} aria-label={copy.dialogCloseAria}>{copy.dialogCloseLabel}</button></form>
      <p className={styles.kicker}>{copy.dialogKicker}</p><h2 id="fusion-core-dialog-title">{copy.dialogHeading}</h2>
      <p>{copy.dialogDesc}</p>
      <ol>{fusionStages.map((stage) => <li key={stage.key}><strong>{stage.label}</strong><span>{stage.message}</span></li>)}</ol>
      <p className={styles.dialogNote}>{copy.dialogNote}</p>
    </dialog>
    {seoContent}
  </main>;
}

/** 같은 링크로 다시 열 수 있게 주소만 갱신한다(히스토리를 쌓지 않는다). */
function rememberConsultationUrl(id: string) {
  if (typeof window === "undefined" || !id) return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("cid", id);
    window.history.replaceState(null, "", url.toString());
  } catch {
    // 주소를 못 바꿔도 결과 자체는 이미 화면에 있다.
  }
}
