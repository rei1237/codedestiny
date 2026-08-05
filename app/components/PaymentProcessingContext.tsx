­r‡^Ñf¥–Ø¦{OlyÊ'vÃ®¶›­"use client";

import dynamic from "next/dynamic";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { PaymentLoadingProps } from "./common/PaymentLoading";
import LoadingProgressMotion, {
  type LoadingMotionPhase,
  type LoadingMotionTone,
} from "./common/LoadingProgressMotion";
import { PaymentPigVisual } from "./common/PaymentPigVisual";

type PaymentLoadingVariant = NonNullable<PaymentLoadingProps["variant"]>;
type LoadingStage = "pg_processing" | "result_loading" | "access_check";
type PaymentType = "subscription" | "single" | "pass";
type PaymentProcessingAction = {
  label: string;
  onClick: () => void;
};

const PAYMENT_LOADING_LOCALES = ["ko", "en", "ja", "zh-CN", "zh-TW", "vi", "hi", "es", "fr", "de", "nl", "ms"] as const;
type LoadingLocale = (typeof PAYMENT_LOADING_LOCALES)[number];
type LoadingMessage = { title: string; sub: string };

function normalizeLoadingLocale(value?: string | null): LoadingLocale {
  const normalized = String(value || "").trim().replace("_", "-").toLowerCase();
  if (normalized === "zh" || normalized === "zh-cn" || normalized === "zh-hans") return "zh-CN";
  if (normalized === "zh-tw" || normalized === "zh-hant" || normalized === "zh-hk" || normalized === "zh-mo") return "zh-TW";
  if (normalized === "vi-vn") return "vi";
  return PAYMENT_LOADING_LOCALES.find((locale) => locale.toLowerCase() === normalized) || "ko";
}

function getCurrentLoadingLocale(): LoadingLocale {
  if (typeof window === "undefined") return "ko";
  try {
    const runtimeLang = (window as typeof window & { cdGetCurrentLanguage?: () => string }).cdGetCurrentLanguage?.();
    if (runtimeLang) return normalizeLoadingLocale(runtimeLang);
  } catch {}
  try {
    const params = new URLSearchParams(window.location.search || "");
    const fromQuery = params.get("lang");
    if (fromQuery) return normalizeLoadingLocale(fromQuery);
  } catch {}
  try {
    const fromStorage = window.localStorage.getItem("cd_lang");
    if (fromStorage) return normalizeLoadingLocale(fromStorage);
  } catch {}
  try {
    const match = document.cookie.match(/(?:^|;\s*)cd_locale=([^;]+)/);
    if (match?.[1]) return normalizeLoadingLocale(decodeURIComponent(match[1]));
  } catch {}
  return "ko";
}

function PaymentOverlayFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[2147483001] flex items-end justify-center bg-slate-950/62 px-0 backdrop-blur-sm sm:items-center sm:px-4"
    >
      <div
        className="w-full rounded-t-[8px] border border-white/15 bg-slate-950/92 p-5 text-white shadow-[0_18px_60px_rgba(2,6,23,.5)] sm:max-w-[420px] sm:rounded-[8px]"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20 sm:hidden" />
        <p className="m-0 text-sm font-black">ê²°ì œ í™•ì¸ í™”ë©´ì„ ì—¬ëŠ” ì¤‘ì…ë‹ˆë‹¤.</p>
        <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-300">
          ì°½ì„ ë‹«ì§€ ë§ê³  ì ì‹œë§Œ ê¸°ë‹¤ë ¤ ì£¼ì„¸ìš”.
        </p>
      </div>
    </div>
  );
}

const DeferredPaymentProcessingOverlay = dynamic<PaymentLoadingProps>(
  () => import("./PaymentProcessingOverlay"),
  {
    ssr: false,
    loading: () => <PaymentOverlayFallback />,
  },
);

type PaymentProcessingContextValue = {
  isProcessing: boolean;
  isPaymentLoading: boolean;
  processingMessage: string;
  startProcessing: (message?: string, variant?: PaymentLoadingVariant) => void;
  stopProcessing: () => void;
  setProcessingMessage: (message: string) => void;
  setProcessingAction: (action: PaymentProcessingAction | null) => void;
  startPayment: (message?: string, variant?: PaymentLoadingVariant) => void;
  endPayment: () => void;
  setPaymentMessage: (message: string) => void;
};

type PaymentProcessingProviderProps = {
  children: React.ReactNode;
};

type PaidFeatureGateStatus =
  | "idle"
  | "opening"
  | "checkingEntitlement"
  | "hasEntitlement"
  | "noEntitlement"
  | "loadingProducts"
  | "readyToPay"
  | "paymentProcessing"
  | "paymentSuccess"
  | "paymentFailed"
  | "error"
  | "paymentPreparing"
  | "paymentWindowOpen"
  | "savingUnlock"
  | "unlockSaving"
  | "cancelled";

type PaidFeatureGateDetail = {
  featureId?: string;
  featureKey?: string;
  requestId?: string;
  title?: string;
  message?: string;
  status?: PaidFeatureGateStatus;
  cost?: number;
  paymentMode?: string;
  accessType?: string;
  accessMethod?: string;
  paymentMethod?: string;
  startedAt?: number;
};

type PaidFeatureGateState = Required<Pick<PaidFeatureGateDetail, "featureId" | "requestId" | "title" | "message">> & {
  open: boolean;
  status: PaidFeatureGateStatus;
  cost: number | null;
  seq: number;
  startedAt: number;
};

type PaidFeatureGateContextValue = {
  state: PaidFeatureGateState;
  open: (detail: PaidFeatureGateDetail) => number;
  update: (detail: PaidFeatureGateDetail) => void;
  close: (requestId?: string) => void;
  preload: () => void;
};

const DEFAULT_PROCESSING_MESSAGE = "ì²˜ë¦¬ ì¤‘ì´ì—ìš”\nì ì‹œë§Œ ê¸°ë‹¤ë ¤ ì£¼ì„¸ìš”";

const PAID_GATE_DEFAULT_TITLE = "ê²°ì œ/ì´ìš©ê¶Œ í™•ì¸";
const ACCESS_CHECKING_MESSAGE = "ì´ìš©ê¶Œ í™•ì¸ ì¤‘ì´ì—ìš”\nì ì‹œë§Œ ê¸°ë‹¤ë ¤ ì£¼ì„¸ìš”";
const PAID_GATE_DEFAULT_MESSAGE = ACCESS_CHECKING_MESSAGE;

type PaidGateCopy = { label: string; title: string; message: string };
type PaidGateUiCopy = {
  closeLabel: string;
  costPrefix: string;
  costSuffix: string;
  payAction: string;
  genericLabel: string;
  progressLabel: string;
  progressSteps: readonly [string, string, string];
};

const KOREAN_TEXT_PATTERN = /[ê°€-í£]/;

const PAID_GATE_COPY: Record<PaidFeatureGateStatus, PaidGateCopy> = {
  idle: { label: "ëŒ€ê¸°", title: PAID_GATE_DEFAULT_TITLE, message: PAID_GATE_DEFAULT_MESSAGE },
  opening: { label: "ì¤€ë¹„", title: "ì´ìš©ê¶Œ í™•ì¸", message: ACCESS_CHECKING_MESSAGE },
  checkingEntitlement: { label: "í™•ì¸ ì¤‘", title: "ì´ìš©ê¶Œ í™•ì¸", message: ACCESS_CHECKING_MESSAGE },
  hasEntitlement: { label: "ì´ìš© ê°€ëŠ¥", title: "ì´ìš©ê¶Œ í™•ì¸ ì™„ë£Œ", message: "ì´ìš©ê¶Œ í™•ì¸ì´ ëë‚¬ì–´ìš”\nê²°ê³¼ë¥¼ ì¤€ë¹„í•˜ê³  ìˆì–´ìš”" },
  noEntitlement: { label: "ê²°ì œ í•„ìš”", title: PAID_GATE_DEFAULT_TITLE, message: "ì‚¬ìš© ê°€ëŠ¥í•œ ì´ìš©ê¶Œì´ ì—†ì–´ ê²°ì œê°€ í•„ìš”í•©ë‹ˆë‹¤." },
  loadingProducts: { label: "í™•ì¸ ì¤‘", title: "ì´ìš©ê¶Œ/ê²°ì œ í™•ì¸", message: ACCESS_CHECKING_MESSAGE },
  readyToPay: { label: "ì„ íƒ ëŒ€ê¸°", title: "ê²°ì œ ìˆ˜ë‹¨ ì„ íƒ", message: "ì´ ì½˜í…ì¸ ë¥¼ ì—´ ìˆ˜ ìˆëŠ” ê²°ì œ ìˆ˜ë‹¨ì„ ì„ íƒí•´ ì£¼ì„¸ìš”." },
  paymentProcessing: { label: "ì²˜ë¦¬ ì¤‘", title: "ê²°ì œ ì²˜ë¦¬ ì¤‘", message: "ê²°ì œ ìŠ¹ì¸ê³¼ ì´ìš© ê¶Œí•œì„ í™•ì¸í•˜ê³  ìˆì–´ìš”\nì°½ì„ ë‹«ì§€ ë§ì•„ ì£¼ì„¸ìš”" },
  paymentSuccess: { label: "ì™„ë£Œ", title: "ê²°ì œ ì™„ë£Œ", message: "ê²°ì œê°€ ì™„ë£Œëì–´ìš”\nê²°ê³¼ë¥¼ ì¤€ë¹„í•˜ê³  ìˆì–´ìš”" },
  paymentFailed: { label: "ì‹¤íŒ¨", title: "ê²°ì œ í™•ì¸ ì‹¤íŒ¨", message: "ê²°ì œë¥¼ ì™„ë£Œí•˜ì§€ ëª»í–ˆìŠµë‹ˆë‹¤. ë‹¤ì‹œ ì‹œë„í•´ ì£¼ì„¸ìš”." },
  error: { label: "ì˜¤ë¥˜", title: "í™•ì¸ ì‹¤íŒ¨", message: "ì´ìš©ê¶Œ í™•ì¸ì— ì‹¤íŒ¨í–ˆìŠµë‹ˆë‹¤. ì ì‹œ í›„ ë‹¤ì‹œ ì‹œë„í•´ ì£¼ì„¸ìš”." },
  paymentPreparing: { label: "ê²°ì œ ì¤€ë¹„", title: "ë‹¨ê±´ ê²°ì œ ì¤€ë¹„ ì¤‘", message: "ì£¼ë¬¸ ì •ë³´ì™€ ì¸ì¦ íë¦„ì´ ì¡°ìš©íˆ ë§ì¶°ì§€ê³  ìˆì–´ìš”\nì°½ì„ ë‹«ì§€ ë§ì•„ ì£¼ì„¸ìš”" },
  paymentWindowOpen: { label: "ê²°ì œ ì§„í–‰", title: "ë‹¨ê±´ ê²°ì œ ì¤€ë¹„ ì¤‘", message: "ì£¼ë¬¸ ì •ë³´ì™€ ì¸ì¦ íë¦„ì´ ì¡°ìš©íˆ ë§ì¶°ì§€ê³  ìˆì–´ìš”\nì°½ì„ ë‹«ì§€ ë§ì•„ ì£¼ì„¸ìš”" },
  savingUnlock: { label: "ì €ì¥ ì¤‘", title: "ì´ìš© ê¶Œí•œ ì €ì¥ ì¤‘", message: "ê²°ê³¼ í™”ë©´ìœ¼ë¡œ ì´ì–´ì§€ë„ë¡ ì´ìš© ê¶Œí•œì„ ì €ì¥í•˜ê³  ìˆìŠµë‹ˆë‹¤." },
  unlockSaving: { label: "ì €ì¥ ì¤‘", title: "ì´ìš© ê¶Œí•œ ì €ì¥ ì¤‘", message: "ê²°ê³¼ í™”ë©´ìœ¼ë¡œ ì´ì–´ì§€ë„ë¡ ì´ìš© ê¶Œí•œì„ ì €ì¥í•˜ê³  ìˆìŠµë‹ˆë‹¤." },
  cancelled: { label: "ì·¨ì†Œë¨", title: "ê²°ì œ ì„ íƒ ì·¨ì†Œ", message: "ê²°ì œ ì„ íƒì´ ì·¨ì†Œë˜ì—ˆìŠµë‹ˆë‹¤. í•„ìš”í•  ë•Œ ë‹¤ì‹œ ì§„í–‰í•  ìˆ˜ ìˆìŠµë‹ˆë‹¤." },
};

const PAID_GATE_LOCALIZED_COPY: Record<Exclude<LoadingLocale, "ko">, Partial<Record<PaidFeatureGateStatus, PaidGateCopy>>> = {
  en: {
    idle: { label: "Waiting", title: "Payment/pass check", message: "Checking your pass." },
    noEntitlement: { label: "Payment needed", title: "Payment/pass check", message: "No usable pass was found." },
    readyToPay: { label: "Choose payment", title: "Choose a payment method", message: "Select a payment method to open this content." },
    paymentFailed: { label: "Failed", title: "Payment check failed", message: "Payment could not be completed." },
    error: { label: "Error", title: "Check failed", message: "Please check your network and try again." },
    cancelled: { label: "Cancelled", title: "Payment selection cancelled", message: "You can try again whenever needed." },
  },
  ja: {
    idle: { label: "å¾…æ©Ÿä¸­", title: "æ±ºæ¸ˆãƒ»åˆ©ç”¨åˆ¸ã®ç¢ºèª", message: "åˆ©ç”¨åˆ¸ã‚’ç¢ºèªã—ã¦ã„ã¾ã™ã€‚" },
    noEntitlement: { label: "æ±ºæ¸ˆãŒå¿…è¦", title: "æ±ºæ¸ˆãƒ»åˆ©ç”¨åˆ¸ã®ç¢ºèª", message: "åˆ©ç”¨ã§ãã‚‹åˆ©ç”¨åˆ¸ãŒè¦‹ã¤ã‹ã‚Šã¾ã›ã‚“ã§ã—ãŸã€‚" },
    readyToPay: { label: "é¸æŠå¾…ã¡", title: "æ±ºæ¸ˆæ–¹æ³•ã®é¸æŠ", message: "ã“ã®ã‚³ãƒ³ãƒ†ãƒ³ãƒ„ã‚’é–‹ãæ±ºæ¸ˆæ–¹æ³•ã‚’é¸ã‚“ã§ãã ã•ã„ã€‚" },
    paymentFailed: { label: "å¤±æ•—", title: "æ±ºæ¸ˆç¢ºèªã«å¤±æ•—ã—ã¾ã—ãŸ", message: "ãŠæ”¯æ‰•ã„ã‚’å®Œäº†ã§ãã¾ã›ã‚“ã§ã—ãŸã€‚" },
    error: { label: "ã‚¨ãƒ©ãƒ¼", title: "ç¢ºèªã«å¤±æ•—ã—ã¾ã—ãŸ", message: "é€šä¿¡çŠ¶æ³ã‚’ç¢ºèªã—ã¦ã€ã‚‚ã†ä¸€åº¦ãŠè©¦ã—ãã ã•ã„ã€‚" },
    cancelled: { label: "ã‚­ãƒ£ãƒ³ã‚»ãƒ«", title: "æ±ºæ¸ˆé¸æŠã‚’ã‚­ãƒ£ãƒ³ã‚»ãƒ«ã—ã¾ã—ãŸ", message: "å¿…è¦ãªã¨ãã«ã‚‚ã†ä¸€åº¦é€²ã‚ã‚‰ã‚Œã¾ã™ã€‚" },
  },
  "zh-CN": {
    idle: { label: "ç­‰å¾…", title: "æ”¯ä»˜/é€šè¡Œåˆ¸ç¡®è®¤", message: "æ­£åœ¨ç¡®è®¤é€šè¡Œåˆ¸ã€‚" },
    noEntitlement: { label: "éœ€è¦æ”¯ä»˜", title: "æ”¯ä»˜/é€šè¡Œåˆ¸ç¡®è®¤", message: "æœªæ‰¾åˆ°å¯ç”¨çš„é€šè¡Œåˆ¸ã€‚" },
    readyToPay: { label: "ç­‰å¾…é€‰æ‹©", title: "é€‰æ‹©æ”¯ä»˜æ–¹å¼", message: "è¯·é€‰æ‹©å¯æ‰“å¼€æ­¤å†…å®¹çš„æ”¯ä»˜æ–¹å¼ã€‚" },
    paymentFailed: { label: "å¤±è´¥", title: "æ”¯ä»˜ç¡®è®¤å¤±è´¥", message: "æœªèƒ½å®Œæˆæ”¯ä»˜ã€‚" },
    error: { label: "é”™è¯¯", title: "ç¡®è®¤å¤±è´¥", message: "è¯·æ£€æŸ¥ç½‘ç»œçŠ¶æ€åé‡è¯•ã€‚" },
    cancelled: { label: "å·²å–æ¶ˆ", title: "å·²å–æ¶ˆæ”¯ä»˜é€‰æ‹©", message: "éœ€è¦æ—¶å¯ä»¥å†æ¬¡ç»§ç»­ã€‚" },
  },
  "zh-TW": {
    idle: { label: "ç­‰å¾…", title: "ä»˜æ¬¾/é€šè¡Œåˆ¸ç¢ºèª", message: "æ­£åœ¨ç¢ºèªé€šè¡Œåˆ¸ã€‚" },
    noEntitlement: { label: "éœ€è¦ä»˜æ¬¾", title: "ä»˜æ¬¾/é€šè¡Œåˆ¸ç¢ºèª", message: "æ‰¾ä¸åˆ°å¯ç”¨çš„é€šè¡Œåˆ¸ã€‚" },
    readyToPay: { label: "ç­‰å¾…é¸æ“‡", title: "é¸æ“‡ä»˜æ¬¾æ–¹å¼", message: "è«‹é¸æ“‡å¯é–‹å•Ÿæ­¤å…§å®¹çš„ä»˜æ¬¾æ–¹å¼ã€‚" },
    paymentFailed: { label: "å¤±æ•—", title: "ä»˜æ¬¾ç¢ºèªå¤±æ•—", message: "æœªèƒ½å®Œæˆä»˜æ¬¾ã€‚" },
    error: { label: "éŒ¯èª¤", title: "ç¢ºèªå¤±æ•—", message: "è«‹æª¢æŸ¥ç¶²è·¯ç‹€æ…‹å¾Œå†è©¦ä¸€æ¬¡ã€‚" },
    cancelled: { label: "å·²å–æ¶ˆ", title: "å·²å–æ¶ˆä»˜æ¬¾é¸æ“‡", message: "éœ€è¦æ™‚å¯ä»¥å†æ¬¡ç¹¼çºŒã€‚" },
  },
  vi: {
    idle: { label: "Äang chá»", title: "Kiá»ƒm tra thanh toÃ¡n/vÃ©", message: "Äang kiá»ƒm tra vÃ© sá»­ dá»¥ng." },
    noEntitlement: { label: "Cáº§n thanh toÃ¡n", title: "Kiá»ƒm tra thanh toÃ¡n/vÃ©", message: "KhÃ´ng tÃ¬m tháº¥y vÃ© cÃ³ thá»ƒ dÃ¹ng." },
    readyToPay: { label: "Chá» chá»n", title: "Chá»n phÆ°Æ¡ng thá»©c thanh toÃ¡n", message: "Chá»n phÆ°Æ¡ng thá»©c thanh toÃ¡n Ä‘á»ƒ má»Ÿ ná»™i dung nÃ y." },
    paymentFailed: { label: "Tháº¥t báº¡i", title: "XÃ¡c nháº­n thanh toÃ¡n tháº¥t báº¡i", message: "KhÃ´ng thá»ƒ hoÃ n táº¥t thanh toÃ¡n." },
    error: { label: "Lá»—i", title: "Kiá»ƒm tra tháº¥t báº¡i", message: "Vui lÃ²ng kiá»ƒm tra máº¡ng rá»“i thá»­ láº¡i." },
    cancelled: { label: "ÄÃ£ há»§y", title: "ÄÃ£ há»§y lá»±a chá»n thanh toÃ¡n", message: "Báº¡n cÃ³ thá»ƒ thá»±c hiá»‡n láº¡i khi cáº§n." },
  },
  hi: {
    idle: { label: "à¤ªà¥à¤°à¤¤à¥€à¤•à¥à¤·à¤¾", title: "à¤­à¥à¤—à¤¤à¤¾à¤¨/à¤ªà¤¾à¤¸ à¤œà¤¾à¤à¤š", message: "à¤†à¤ªà¤•à¤¾ à¤ªà¤¾à¤¸ à¤œà¤¾à¤à¤šà¤¾ à¤œà¤¾ à¤°à¤¹à¤¾ à¤¹à¥ˆ." },
    noEntitlement: { label: "à¤­à¥à¤—à¤¤à¤¾à¤¨ à¤†à¤µà¤¶à¥à¤¯à¤•", title: "à¤­à¥à¤—à¤¤à¤¾à¤¨/à¤ªà¤¾à¤¸ à¤œà¤¾à¤à¤š", message: "à¤‰à¤ªà¤¯à¥‹à¤— à¤¯à¥‹à¤—à¥à¤¯ à¤ªà¤¾à¤¸ à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤²à¤¾." },
    readyToPay: { label: "à¤šà¤¯à¤¨ à¤ªà¥à¤°à¤¤à¥€à¤•à¥à¤·à¤¾", title: "à¤­à¥à¤—à¤¤à¤¾à¤¨ à¤µà¤¿à¤§à¤¿ à¤šà¥à¤¨à¥‡à¤‚", message: "à¤‡à¤¸ à¤¸à¤¾à¤®à¤—à¥à¤°à¥€ à¤•à¥‹ à¤–à¥‹à¤²à¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤ à¤­à¥à¤—à¤¤à¤¾à¤¨ à¤µà¤¿à¤§à¤¿ à¤šà¥à¤¨à¥‡à¤‚." },
    paymentFailed: { label: "à¤µà¤¿à¤«à¤²", title: "à¤­à¥à¤—à¤¤à¤¾à¤¨ à¤ªà¥à¤·à¥à¤Ÿà¤¿ à¤µà¤¿à¤«à¤²", message: "à¤­à¥à¤—à¤¤à¤¾à¤¨ à¤ªà¥‚à¤°à¤¾ à¤¨à¤¹à¥€à¤‚ à¤¹à¥‹ à¤¸à¤•à¤¾." },
    error: { label: "à¤¤à¥à¤°à¥à¤Ÿà¤¿", title: "à¤œà¤¾à¤à¤š à¤µà¤¿à¤«à¤²", message: "à¤•à¥ƒà¤ªà¤¯à¤¾ à¤¨à¥‡à¤Ÿà¤µà¤°à¥à¤• à¤¸à¥à¤¥à¤¿à¤¤à¤¿ à¤œà¤¾à¤à¤šà¤•à¤° à¤«à¤¿à¤° à¤ªà¥à¤°à¤¯à¤¾à¤¸ à¤•à¤°à¥‡à¤‚." },
    cancelled: { label: "à¤°à¤¦à¥à¤¦", title: "à¤­à¥à¤—à¤¤à¤¾à¤¨ à¤šà¤¯à¤¨ à¤°à¤¦à¥à¤¦ à¤¹à¥à¤†", message: "à¤œà¤¼à¤°à¥‚à¤°à¤¤ à¤ªà¤¡à¤¼à¤¨à¥‡ à¤ªà¤° à¤«à¤¿à¤° à¤¸à¥‡ à¤†à¤—à¥‡ à¤¬à¤¢à¤¼ à¤¸à¤•à¤¤à¥‡ à¤¹à¥ˆà¤‚." },
  },
  es: {
    idle: { label: "En espera", title: "ComprobaciÃ³n de pago/pase", message: "Comprobando tu pase." },
    noEntitlement: { label: "Pago necesario", title: "ComprobaciÃ³n de pago/pase", message: "No se encontrÃ³ un pase disponible." },
    readyToPay: { label: "Elegir pago", title: "Elige un mÃ©todo de pago", message: "Selecciona un mÃ©todo de pago para abrir este contenido." },
    paymentFailed: { label: "FallÃ³", title: "FallÃ³ la confirmaciÃ³n del pago", message: "No se pudo completar el pago." },
    error: { label: "Error", title: "FallÃ³ la comprobaciÃ³n", message: "Revisa la conexiÃ³n e intÃ©ntalo de nuevo." },
    cancelled: { label: "Cancelado", title: "SelecciÃ³n de pago cancelada", message: "Puedes intentarlo de nuevo cuando lo necesites." },
  },
  fr: {
    idle: { label: "En attente", title: "VÃ©rification paiement/pass", message: "VÃ©rification de votre pass." },
    noEntitlement: { label: "Paiement requis", title: "VÃ©rification paiement/pass", message: "Aucun pass utilisable n'a Ã©tÃ© trouvÃ©." },
    readyToPay: { label: "Choix du paiement", title: "Choisir un moyen de paiement", message: "SÃ©lectionnez un moyen de paiement pour ouvrir ce contenu." },
    paymentFailed: { label: "Ã‰chec", title: "Ã‰chec de la confirmation du paiement", message: "Le paiement n'a pas pu Ãªtre terminÃ©.×n»æÚ$z{-®éÜj×‚ÓãRrÓ"&÷VæFVBÖgVÆÂ&r×v†—FRó#6Ó¦†–FFVâ"óàĞ¢Å–ÖVçE–uf—7VÂFöæS×¶vFTÖ÷F–öåFöæWÒóàĞ¢ÆF—b6Æ74æÖSÒ&Ö"ÓBfÆW‚—FV×2×7F'B§W7F–g’Ö&WGvVVâvÓB#àĞ¢ÆF—càĞ¢Ç6Æ74æÖSÒ&Ö"ÓãRFW‡BÕ³…ÒföçBÖW‡G&&öÆBWW&66RG&6¶–ærÕ³ãFVÕÒFW‡BÖ7–âÓ#óƒ#ç¶6÷’æÆ&VÇÓÂ÷àĞ¢Æƒ"6Æ74æÖSÒ&ÒÓFW‡BÕ³#'…ÒföçBÖ&Æ6²ÆVF–ærÕ³ã#EÒG&6¶–ærÖæ÷&ÖÂFW‡B×v†—FR#ç¶6÷’çF—FÆWÓÂöƒ#àĞ¢ÂöF—càĞ¢Æ'WGFöàĞ¢G—SÒ&'WGFöâ Ğ¢&–ÖÆ&VÃ×¶vFUV”6÷’æ6Æ÷6TÆ&VÇĞĞ¢öä6Æ–6³×²‚’Óâ6Æ÷6R‡7FFRç&WVW7D–B—ĞĞ¢6Æ74æÖSÒ&w&–B‚ÓrÓ6‡&–æ²ÓÆ6RÖ—FV×2Ö6VçFW"&÷VæFVBÖgVÆÂ&÷&FW"&÷&FW"×v†—FRóR&r×v†—FRóFW‡BÖÆrföçBÖ&öÆBFW‡B×v†—FRóƒ Ğ¢àĞ¢9pĞ¢Âö'WGFöãàĞ¢ÂöF—càĞ¢Ç6Æ74æÖSÒ'v†—FW76R×&RÖÆ–æRFW‡B×6ÒÆVF–ærÕ³ãuÒFW‡B×6ÆFRÓ#ó“#ç¶6÷’æÖW76vWÓÂ÷àĞ¢·6†÷u6¶VÆWFöâò€Ğ¢ÄÆöF–æu&öw&W74Ö÷F–öàĞ¢†6S×¶ÆöF–æu†6WĞĞ¢7FW×¶vFU&öw&W757FWĞĞ¢FöæS×¶vFTÖ÷F–öåFöæWĞĞ¢Æ&VÃ×¶vFUV”6÷’ç&öw&W74Æ&VÇĞĞ¢Æ&VÇ3×¶vFUV”6÷’ç&öw&W757FW7ĞĞ¢óàĞ¢’¢çVÆÇĞĞ¢·7FFRæ6÷7BÓÒçVÆÂò€Ğ¢Ç6Æ74æÖSÒ&×BÓ2–æÆ–æRÖfÆW‚&÷VæFVBÖgVÆÂ&÷&FW"&÷&FW"ÖÖ&W"Ó#ó3&rÖÖ&W"Ó3ó‚Ó2’ÓFW‡B×‡2föçBÖW‡G&&öÆBFW‡BÖÖ&W"Ó#àĞ¢¶vFUV”6÷’æ6÷7E&Vf—‡Ò¶f÷&ÖE–DvFT6÷7B‡7FFRæ6÷7BÂÆö6ÆR—ĞĞ¢Â÷àĞ¢’¢çVÆÇĞĞ¢·6†÷u6¶VÆWFöâò€Ğ¢ÆF—b6Æ74æÖSÒ&×BÓRw&–BvÕ³—…Ò#àĞ¢Ç7â6Æ74æÖSÒ&‚Ó2rÖgVÆÂæ–ÖFR×VÇ6R&÷VæFVBÖgVÆÂ&r×v†—FRó"óàĞ¢Ç7â6Æ74æÖSÒ&‚Ó2rÕ³ƒ"UÒæ–ÖFR×VÇ6R&÷VæFVBÖgVÆÂ&r×v†—FRó"óàĞ¢Ç7â6Æ74æÖSÒ&‚Ó2rÕ³cBUÒæ–ÖFR×VÇ6R&÷VæFVBÖgVÆÂ&r×v†—FRó"óàĞ¢ÂöF—càĞ¢’¢çVÆÇĞĞ¢·6†÷u”7F–öâò€Ğ¢Æ'WGFöàĞ¢G—SÒ&'WGFöâ Ğ¢öä6Æ–6³×²‚’Óâ°Ğ¢v–æF÷ræÆö6F–öâæ‡&VbÒ÷ö–çG3öfVGW&SÒG¶Væ6öFUU$”6ö×öæVçB‡7FFRæfVGW&T–B—Ö°Ğ¢×ĞĞ¢6Æ74æÖSÒ&×BÓRÖ–âÖ‚Ó"rÖgVÆÂ&÷VæFVBÕ³‡…Ò&rÖÖ&W"Ó‚ÓBFW‡B×6ÒföçBÖ&Æ6²FW‡B×6ÆFRÓ“S Ğ¢àĞ¢¶vFUV”6÷’ç”7F–öçĞĞ¢Âö'WGFöãàĞ¢’¢çVÆÇĞĞ¢ÂöF—càĞ¢ÂöF—càĞ¢’¢çVÆÇĞĞ¢Âõ–DfVGW&TvFT6öçFW‡Bå&÷f–FW#àĞ¢“°Ğ§ĞĞ Ğ¦W‡÷'BgVæ7F–öâ–ÖVçE&ö6W76–æu&÷f–FW"‡°Ğ¢6†–ÆG&VâÀĞ§Ó¢–ÖVçE&ö6W76–æu&÷f–FW%&÷2’°Ğ¢6öç7B¶—5&ö6W76–ærÂ6WD—5&ö6W76–æuÒÒW6U7FFR†fÇ6R“°Ğ¢6öç7B·&ö6W76–æuf&–çBÂ6WE&ö6W76–æuf&–çEÒÒW6U7FFSÅ–ÖVçDÆöF–æuf&–çCâ‚'–ÖVçB"“°Ğ¢6öç7B&ö6W76–æuf&–çE&VbÒW6U&VcÅ–ÖVçDÆöF–æuf&–çCâ‚'–ÖVçB"“°Ğ¢6öç7B÷fW&Æ•7FFU&VbÒW6U&Vb‡²÷Vã¢fÇ6RÂÖW76vS¢""ÂÖöFS¢""Ò“°Ğ¢6öç7B6ö×ÆWF–öä6Æ÷6UF–ÖW%&VbÒW6U&VcÅ&WGW&åG—SÇG—Vöb6WEF–ÖV÷WCâÂçVÆÃâ†çVÆÂ“°Ğ¢6öç7B·&ö6W76–ætÖW76vRÂ6WE&ö6W76–ætÖW76vU7FFUÒÒW6U7FFR€Ğ¢DTdTÅEõ$ô4U54”äuôÔU54tRÀĞ¢“°Ğ¢6öç7B·&ö6W76–æt7F–öâÂ6WE&ö6W76–æt7F–öåÒÒW6U7FFSÅ–ÖVçE&ö6W76–æt7F–öâÂçVÆÃâ†çVÆÂ“°Ğ Ğ¢òòÉÊº8ÂÉZÈYÉØB¸ˆNº[N«‹.ÊB.Éy«ZÎ¸øRÈªN¸8^È;~ÉØB¸ÛÉ¸Â¹N¸ºBâÈªN¸8^È;~ÉÛBÙ™ÎÈKÉÛNº›BÉÛNÉª«hÂ»;NÉÊÉé¸©BÈIÎ»(BÉ™^»;RÉxnÉÛ@Ğ¢òòÊhÈ¹ÂØk^«;ÎÙY«:‡'Vä&–ÆÆ–æt6ö–ävF^ÉÙ‚¸)«Hf7B×F‚’Â«{¹éÈIÂÈIÎ»(N«¸©ºk¸*Éy¸øB«+Ê	ÎËŞÉËÎºÂÈ8ÊxÉX®¸©N¸ºBàĞ¢òòÊx«ˆ«˜ÎÊx¸©BW6T6ö–ävFRºxÉ«NØ«ÉyÈIÎºxÂÉ¸Î»ŞÙ[B«{‚Ù¸^ÉØBÉ;ÊxÉX®¸©BÙ™Nº›B„’È8¸»B¹;ÉÛBÊN»h»šÊ‚ÉèÉx¸ºBàĞ¢òòÉzÎ«‹É[ÊNÉzÒ&÷f–FW"’ÙYÂ«;>Éy¹º›BÙ™Nº›Nºx¸ºB»ÈJÙY¸©BÊI»;^ÉÛBÉxn¸ºBâÉÛNºû‚ÈºÈJÙYÂÈªN¸8^È;~ÉÛBÉèÉËÎº›@Ğ¢òòv&Õ7V'67&—F–öå6æ6†÷DöäVçG'«Ê«‹»	Ù™ÙYºøºÂÈºNÊ	ÂÉ©NË*ŞÉØEDÎ¸»’Ù¨Î¸ºBàĞ¢òò&–ÆÆ–ærÖ6Æ–VçBöWF‚×7F÷&^¸©B¸ùÊ–×÷'NºÎºxÂËÊÙYÎ¸ºB(	Bº:Ø«‚ºÉÛNÉXNÉ¸2»(¹:NÉØBØ*NÉ«ÊxÉX®«‹ÉÈNÙ[NÈIÎ¸ºBàĞ¢W6TVffV7B‚‚’Óâ°Ğ¢–b‡G—Vöbv–æF÷rÓÓÒ'VæFVf–æVB"’&WGW&ã°Ğ¢ÆWB6æ6VÆÆVBÒfÇ6S°Ğ¢ÆWBVç7V'67&–&S¢‚‚’Óâfö–B’ÂçVÆÂÒçVÆÃ°Ğ¢ÆWB–FÆT†æFÆS¢çVÖ&W"ÂçVÆÂÒçVÆÃ°Ğ Ğ¢6öç7Bv&Ô–dWF†VçF–6FVBÒ7–æ2‚’Óâ°Ğ¢–b†6æ6VÆÆVB’&WGW&ã°Ğ¢G'’°Ğ¢6öç7B²vWDWF…7FFRÒÒv—B–×÷'B‚"ââõöÆ–"öWF‚×7F÷&R"“°Ğ¢–b†6æ6VÆÆVBÇÂvWDWF…7FFR‚’æ—4WF†VçF–6FVB’&WGW&ã°Ğ¢6öç7B²v&Õ7V'67&—F–öå6æ6†÷DöäVçG'’ÒÒv—B–×÷'B‚"ââõöÆ–"ö&–ÆÆ–ærÖ6Æ–VçB"“°Ğ¢–b‚6æ6VÆÆVB’fö–Bv&Õ7V'67&—F–öå6æ6†÷DöäVçG'’‚“°Ğ¢Ò6F6‚°Ğ¢òòÉ¸Î»ÒÈºNØÊ¸©BºËNÈ¹ÎÙYÎ¸ºB(	BË*²ÉÊº8ÂÉZÈYÉÛBÊ(^ÊN¸ÈºÂÈIÎ»(BØÉÊ	^ÉËÎºÂØûN»ÙYÎ¸ºBàĞ¢ĞĞ¢Ó°Ğ Ğ¢òòËYÎËH‚ÊxNÉèRÈ¹ÎÊ	ÉyBÉÛÊiŞÉÛBÉXNÊxÙYÉÛN¹9ÎºÉÛNÈY‚ÊNÉÛÂÈ‰‚ÉèÉkBÂÉÛÊiÒÈ8Ø9Â»8Ù™NÉy¸øBÙYÂ»(‚¸ÙBÈ¹Î¸øNÙYÎ¸ºBàĞ¢fö–Bv&Ô–dWF†VçF–6FVB‚“°Ğ¢fö–B†7–æ2‚’Óâ°Ğ¢G'’°Ğ¢6öç7B²7V'67&–&TWF‚ÒÒv—B–×÷'B‚"ââõöÆ–"öWF‚×7F÷&R"“°Ğ¢–b†6æ6VÆÆVB’&WGW&ã°Ğ¢Vç7V'67&–&RÒ7V'67&–&TWF‚‚‚’Óâ²fö–Bv&Ô–dWF†VçF–6FVB‚“²Ò“°Ğ¢Ò6F6‚°Ğ¢òò«ZÎ¸øRÈºNØÊ‚È¹ÎÉyBÉÈBÙ¨ÂÈ¹Î¸øNºxÎÉËÎºÂ¹N¸ºBàĞ¢ĞĞ¢Ò’‚“°Ğ Ğ¢òò	ùKBºxÎº8Îº[Âº™NÉ«¸©BÉêÎÉ¸Î»ÒâÉÛNÉª«hÂºû»;NÉÊÈªN¸8^È;rEDÎÉØcËH‚»;NÉÊÉé¸©B^»hBÉÛ¸ÛÉˆÉ{NÉÛBÊxNÉèRÙ¨Î»ùÉÛN¹ÛÂÀĞ¢òò»hB¸I«(ÂÉÛŞ¸ºN«¸ˆNº[N¸©BÈ*ÎÉªÉé¸©BºzN»(‚ÈIÎ»(BÉ™^»;R²«{«(Â¸©ºjÎº›B.«+Ê	ÂË)ºjÂÊI"Ù™Nº›N«˜ÎÊx«	N¸ºBàĞ¢òò¸©ºk«+ŞºÎ«ºû»;NÉÊÉéÊNÉªÉÛNÉx¸Ù‚ÉÛNÉÊ«ÉÛBEDÂ»˜N¸ÈËšŞÉÛN¸ºBâÊ	^ÊÈ[ÉÛB3#ÉyÈIÂ«	ÉØºËÊ	Îº[ÀĞ¢òòÉÊÙËB¾ÉÙ¸øB‡ö–çFW&F÷vâ’ÉˆÉ{NºÂÙ[N«+Ùh«:Â&V7B«+ŞºÎÉy¸øB«	ÉØ»
È¹ŞÉØB¹N¸ºBàĞ¢òòÈ8‚Ëú¸ºNÉ«L+~È8‚FVGWÉØBºxÎ¹:NÊxÉX®¸©N¸ºB(	Bv&Õ7V'67&—F–öå6æ6†÷DöäVçG'«ÈºÈJÙYÂÈªN¸8^È;~ÉÛBÉèÉËÎº›@Ğ¢òòÊ«‹»	Ù™ÙY«:–âÖfÆ–v‡BÊI»;^¸øBÈªNÈªNºÂºxÉËÎºøºÂÂÈºNÊ	ÂÉ©NË*ŞÉØ~ºxÎº8Î¹	ÉØB¹XÎºxÂr¸)«N¸ºBÉé«‹Ê	ÎÙYÎÊ’àĞ¢òòEDÂÉéË+N¸©B¸©ºjÎÊxÉX®¸©N¸ºC¢ÉÛNÉª«hÂ«ZÎºzBÊxÙ¸BºËNÙªÙ™BÙ¸^ÉÛBÉxnÉkB¸©ºjÎº›B»
«ˆ‚È+È*ÎÉªÉé«~ºû»;NÉÊ~ºÂ¸*¸©N¸ºBàĞ¢6öç7Bv&Ôöä–çFVçBÒ‚’Óâ²fö–Bv&Ô–dWF†VçF–6FVB‚“²Ó°Ğ¢6öç7B–FÆUv–æF÷rÒv–æF÷r2v–æF÷rb°Ğ¢&WVW7D–FÆT6ÆÆ&6³ó¢†6#¢‚’Óâfö–BÂ÷G3ó¢²F–ÖV÷WCó¢çVÖ&W"Ò’ÓâçVÖ&W#°Ğ¢6æ6VÄ–FÆT6ÆÆ&6³ó¢††æFÆS¢çVÖ&W"’Óâfö–C°Ğ¢Ó°Ğ¢–b‡G—Vöb–FÆUv–æF÷rç&WVW7D–FÆT6ÆÆ&6²ÓÓÒ&gVæ7F–öâ"’°Ğ¢–FÆT†æFÆRÒ–FÆUv–æF÷rç&WVW7D–FÆT6ÆÆ&6²‡v&Ôöä–çFVçBÂ²F–ÖV÷WC¢CÒ“°Ğ¢ĞĞ Ğ¢&WGW&â‚’Óâ°Ğ¢6æ6VÆÆVBÒG'VS°Ğ¢–b‡Vç7V'67&–&R’Vç7V'67&–&R‚“°Ğ¢–b†–FÆT†æFÆRÓÒçVÆÂbbG—Vöb–FÆUv–æF÷ræ6æ6VÄ–FÆT6ÆÆ&6²ÓÓÒ&gVæ7F–öâ"’°Ğ¢–FÆUv–æF÷ræ6æ6VÄ–FÆT6ÆÆ&6²†–FÆT†æFÆR“°Ğ¢ĞĞ¢Ó°Ğ¢ÒÂµÒ“°Ğ Ğ¢6öç7B6WE–ÖVçDÆöF–æuf&–çBÒW6T6ÆÆ&6²‚‡f&–çC¢–ÖVçDÆöF–æuf&–çB’Óâ°Ğ¢&ö6W76–æuf&–çE&Vbæ7W'&VçBÒf&–çC°Ğ¢6WE&ö6W76–æuf&–çB‡f&–çB“°Ğ¢ÒÂµÒ“°Ğ Ğ¢6öç7B6ÆV$6ö×ÆWF–öä6Æ÷6UF–ÖW"ÒW6T6ÆÆ&6²‚‚’Óâ°Ğ¢–b†6ö×ÆWF–öä6Æ÷6UF–ÖW%&Vbæ7W'&VçB’°Ğ¢6ÆV%F–ÖV÷WB†6ö×ÆWF–öä6Æ÷6UF–ÖW%&Vbæ7W'&VçB“°Ğ¢6ö×ÆWF–öä6Æ÷6UF–ÖW%&Vbæ7W'&VçBÒçVÆÃ°Ğ¢ĞĞ¢ÒÂµÒ“°Ğ Ğ¢6öç7B6Æ÷6U&ö6W76–ætæ÷rÒW6T6ÆÆ&6²‚‚’Óâ°Ğ¢6ÆV$6ö×ÆWF–öä6Æ÷6UF–ÖW"‚“°Ğ¢÷fW&Æ•7FFU&Vbæ7W'&VçBÒ²÷Vã¢fÇ6RÂÖW76vS¢""ÂÖöFS¢""Ó°Ğ¢6WD—5&ö6W76–ær†fÇ6R“°Ğ¢6WE–ÖVçDÆöF–æuf&–çB‚'–ÖVçB"“°Ğ¢6WE&ö6W76–ætÖW76vU7FFR„DTdTÅEõ$ô4U54”äuôÔU54tR“°Ğ¢6WE&ö6W76–æt7F–öâ†çVÆÂ“°Ğ¢ÒÂ¶6ÆV$6ö×ÆWF–öä6Æ÷6UF–ÖW"Â6WE–ÖVçDÆöF–æuf&–çEÒ“°Ğ Ğ¢6öç7B7F'E&ö6W76–ærÒW6T6ÆÆ&6²‚†ÖW76vSó¢7G&–ærÂf&–çCó¢–ÖVçDÆöF–æuf&–çB’Óâ°Ğ¢6ÆV$6ö×ÆWF–öä6Æ÷6UF–ÖW"‚“°Ğ¢–b‡G—VöbÖW76vRÓÓÒ'7G&–ær"bbÖW76vRçG&–Ò‚’’°Ğ¢6WE&ö6W76–ætÖW76vU7FFR†ÖW76vR“°Ğ¢ĞĞ¢6WE–ÖVçDÆöF–æuf&–çB‡f&–çBÇÂ&W6öÇfU–ÖVçDÆöF–æuf&–çB†ÖW76vR’“°Ğ¢6WD—5&ö6W76–ær‡G'VR“°Ğ¢ÒÂ¶6ÆV$6ö×ÆWF–öä6Æ÷6UF–ÖW"Â6WE–ÖVçDÆöF–æuf&–çEÒ“°Ğ Ğ¢6öç7B7F÷&ö6W76–ærÒW6T6ÆÆ&6²‚‚’Óâ°Ğ¢–b†—5–ÖVçD6ö×ÆWF–öåf&–çB‡&ö6W76–æuf&–çE&Vbæ7W'&VçB’bbG—Vöbv–æF÷rÓÒ'VæFVf–æVB"’°Ğ¢6ÆV$6ö×ÆWF–öä6Æ÷6UF–ÖW"‚“°Ğ¢6ö×ÆWF–öä6Æ÷6UF–ÖW%&Vbæ7W'&VçBÒ6WEF–ÖV÷WB‚‚’Óâ°Ğ¢6Æ÷6U&ö6W76–ætæ÷r‚“°Ğ¢ÒÂ&ö6W76–æuf&–çE&Vbæ7W'&VçBÓÓÒ'72ÖÆ–VB"òƒ¢s“°Ğ¢&WGW&ã°Ğ¢ĞĞ¢6Æ÷6U&ö6W76–ætæ÷r‚“°Ğ¢ÒÂ¶6ÆV$6ö×ÆWF–öä6Æ÷6UF–ÖW"Â6Æ÷6U&ö6W76–ætæ÷uÒ“°Ğ Ğ¢6öç7B6WE&ö6W76–ætÖW76vRÒW6T6ÆÆ&6²‚†ÖW76vS¢7G&–ær’Óâ°Ğ¢–b‚ÖW76vRÇÂÖW76vRçG&–Ò‚’’°Ğ¢6WE&ö6W76–ætÖW76vU7FFR„DTdTÅEõ$ô4U54”äuôÔU54tR“°Ğ¢6WE–ÖVçDÆöF–æuf&–çB‚'–ÖVçB"“°Ğ¢&WGW&ã°Ğ¢ĞĞ¢6WE&ö6W76–ætÖW76vU7FFR†ÖW76vR“°Ğ¢6WE–ÖVçDÆöF–æuf&–çB‡&W6öÇfU–ÖVçDÆöF–æuf&–çB†ÖW76vR’“°Ğ¢ÒÂ·6WE–ÖVçDÆöF–æuf&–çEÒ“°Ğ Ğ¢W6TVffV7B‚‚’Óâ°Ğ¢&WGW&â‚’Óâ6ÆV$6ö×ÆWF–öä6Æ÷6UF–ÖW"‚“°Ğ¢ÒÂ¶6ÆV$6ö×ÆWF–öä6Æ÷6UF–ÖW%Ò“°Ğ Ğ¢6öç7BÇ•&V7E–ÖVçD÷fW&Æ’ÒW6T6ÆÆ&6²‚‡6†÷s¢&ööÆVâÂÖW76vSó¢7G&–ærÂÖöFSó¢7G&–ær’Óâ°Ğ¢6öç7BæW‡DÖW76vRÒ7G&–ær†ÖW76vRÇÂ""’çG&–Ò‚’ÇÂDTdTÅEõ$ô4U54”äuôÔU54tS°Ğ¢6öç7BæW‡DÖöFRÒ7G&–ær†ÖöFRÇÂ""’çG&–Ò‚“°Ğ¢6öç7B&Wf–÷W2Ò÷fW&Æ•7FFU&Vbæ7W'&VçC°Ğ¢–b‡6†÷r’°Ğ¢òò	ùKB«+Ê	ÎËŞ«;Â¸È«‹Ù™Nº›NÉÛB«+Ë™ÊxÉX®«(ÂÙYÎ¸ºBâÈ[ÉÙ‚ö6E6WD6ö–ävFT÷fW&Æ’Ë*²ÊHN«;Â«	ÉØØÉÊ	^ÉÛNº›ÀĞ¢òòÉÛB&÷f–FW"««{‚ÙZÈ‰º[Â«ÉXNË™É«¸©BØ9>ÉyØÉÊ	^ÉÛBÉ«Ù¨Î¹	¸Ù‚«(>ÉØB¹	È+Nºk«(>ÉÛN¸ºBàĞ¢–b†—5–ÖVçEv—EV”&Æö6¶VB†æW‡DÖöFR’’&WGW&ã°Ğ¢–b‡&Wf–÷W2æ÷Vâbb&Wf–÷W2æÖW76vRÓÓÒæW‡DÖW76vRbb&Wf–÷W2æÖöFRÓÓÒæW‡DÖöFR’&WGW&ã°Ğ¢÷fW&Æ•7FFU&Vbæ7W'&VçBÒ²÷Vã¢G'VRÂÖW76vS¢æW‡DÖW76vRÂÖöFS¢æW‡DÖöFRÓ°Ğ¢6Æ÷6U7FF–5–ÖVçD÷fW&Æ’‚“°Ğ¢6ÆV$6ö×ÆWF–öä6Æ÷6UF–ÖW"‚“°Ğ¢6öç7BæW‡Ef&–çBÒ&W6öÇfU–ÖVçDÆöF–æuf&–çB†æW‡DÖW76vRÂæW‡DÖöFR“°Ğ¢6WE–ÖVçDÆöF–æuf&–çB†æW‡Ef&–çB“°Ğ¢6WE&ö6W76–ætÖW76vU7FFR†æW‡DÖW76vR“°Ğ¢6WD—5&ö6W76–ær‡G'VR“°Ğ¢&WGW&ã°Ğ¢ĞĞ¢–b‚&Wf–÷W2æ÷Vâ’°Ğ¢6Æ÷6U&ö6W76–ætæ÷r‚“°Ğ¢&WGW&ã°Ğ¢ĞĞ¢7F÷&ö6W76–ær‚“°Ğ¢ÒÂ¶6ÆV$6ö×ÆWF–öä6Æ÷6UF–ÖW"Â6Æ÷6U&ö6W76–ætæ÷rÂ6WE–ÖVçDÆöF–æuf&–çBÂ7F÷&ö6W76–æuÒ“°Ğ Ğ¢W6TVffV7B‚‚’Óâ°Ğ¢–b‡G—Vöbv–æF÷rÓÓÒ'VæFVf–æVB"’&WGW&ã°Ğ¢6öç7B÷fW&Æ•v–æF÷rÒv–æF÷r2–ÖVçD÷fW&Æ•v–æF÷s°Ğ¢6öç7B&Wf–÷W4÷fW&Æ’Ò÷fW&Æ•v–æF÷råö6E6WD6ö–ävFT÷fW&Æ“°Ğ¢6öç7Böå–ÖVçDÆöF–æu7FFRÒ†WfVçC¢WfVçB’Óâ°Ğ¢6öç7BFWF–ÂÒ†WfVçB27W7FöÔWfVçCÇ²÷Vãó¢&ööÆVã²ÖW76vSó¢7G&–æs²ÖöFSó¢7G&–ærÓâ’æFWF–ÂÇÂ·Ó°Ğ¢Ç•&V7E–ÖVçD÷fW&Æ’„&ööÆVâ†FWF–Âæ÷Vâ’ÂFWF–ÂæÖW76vRÂFWF–ÂæÖöFR“°Ğ¢Ó°Ğ¢÷fW&Æ•v–æF÷råõô4Eõ$T5Eõ”ÔTåEôõdU$Ä•ôõtäU%õòÒG'VS°Ğ¢6Æ÷6U7FF–5–ÖVçD÷fW&Æ’‚“°Ğ¢÷fW&Æ•v–æF÷råö6E6WD6ö–ävFT÷fW&Æ’ÒÇ•&V7E–ÖVçD÷fW&Æ“°Ğ¢v–æF÷ræFDWfVçDÆ—7FVæW"‚&6C§–ÖVçBÖÆöF–ær×7FFR"Âöå–ÖVçDÆöF–æu7FFR“°Ğ¢&WGW&â‚’Óâ°Ğ¢v–æF÷rç&VÖ÷fTWfVçDÆ—7FVæW"‚&6C§–ÖVçBÖÆöF–ær×7FFR"Âöå–ÖVçDÆöF–æu7FFR“°Ğ¢–b†÷fW&Æ•v–æF÷råö6E6WD6ö–ävFT÷fW&Æ’ÓÓÒÇ•&V7E–ÖVçD÷fW&Æ’’°Ğ¢÷fW&Æ•v–æF÷råö6E6WD6ö–ävFT÷fW&Æ’Ò&Wf–÷W4÷fW&Æ“°Ğ¢ĞĞ¢–b†÷fW&Æ•v–æF÷råõô4Eõ$T5Eõ”ÔTåEôõdU$Ä•ôõtäU%õò’°Ğ¢FVÆWFR÷fW&Æ•v–æF÷råõô4Eõ$T5Eõ”ÔTåEôõdU$Ä•ôõtäU%õó°Ğ¢ĞĞ¢Ó°Ğ¢ÒÂ¶Ç•&V7E–ÖVçD÷fW&Æ•Ò“°Ğ Ğ¢W6TVffV7B‚‚’Óâ°Ğ¢–b‡G—Vöbv–æF÷rÓÓÒ'VæFVf–æVB"’&WGW&ã°Ğ Ğ¢6öç7B'VçF–ÖUv–æF÷rÒv–æF÷r2Væ¶æ÷vâ2&V6÷&CÇ7G&–ærÂVæ¶æ÷vãã°Ğ¢'VçF–ÖUv–æF÷råõô4Eõ”ÔTåEõ$ô4U54”äuõòÒ—5&ö6W76–æs°Ğ Ğ¢–b†Fö7VÖVçCòæ&öG’’°Ğ¢–b†—5&ö6W76–ær’°Ğ¢Fö7VÖVçBæ&öG’æFF6WBæ6EfW'6–öäwV&D'W7’Ò##°Ğ¢ÒVÇ6R°Ğ¢FVÆWFRFö7VÖVçBæ&öG’æFF6WBæ6EfW'6–öäwV&D'W7“°Ğ¢ĞĞ¢ĞĞ Ğ¢v–æF÷ræF—7F6„WfVçB†æWr7W7FöÔWfVçB‚&6C¦7&—F–6ÂÖ÷W&F–öâ×7FFR"Â°Ğ¢FWF–Ã¢°Ğ¢—5–ÖVçE&ö6W76–æs¢—5&ö6W76–ærÀĞ¢ÒÀĞ¢Ò’“°Ğ Ğ¢&WGW&â‚’Óâ°Ğ¢'VçF–ÖUv–æF÷råõô4Eõ”ÔTåEõ$ô4U54”äuõòÒfÇ6S°Ğ¢–b†Fö7VÖVçCòæ&öG’’°Ğ¢FVÆWFRFö7VÖVçBæ&öG’æFF6WBæ6EfW'6–öäwV&D'W7“°Ğ¢ĞĞ¢Ó°Ğ¢ÒÂ¶—5&ö6W76–æuÒ“°Ğ Ğ¢W6TVffV7B‚‚’Óâ°Ğ¢–b‚—5&ö6W76–ærÇÂG—Vöbv–æF÷rÓÓÒ'VæFVf–æVB"’&WGW&ã°Ğ Ğ¢6öç7B†æFÆT&Vf÷&UVæÆöBÒ†WfVçC¢&Vf÷&UVæÆöDWfVçB’Óâ°Ğ¢òòr…÷'DöæR¸©Bºª»	NÉÛÎÉyÈIÂ«+Ê	Îº[ÂÈ8ÉÈBÙHNºÉèBºjÎ¸ºNÉÛNºØ«ºÂË)ºjÎÙYÎ¸ºB(	B«{«BÉÙ¸øN¹	ÂÉÛN¸ùÉÛNºøºÀĞ¢òòºxÉËÎº›B.È*ÎÉÛNØ«º[Â¸)«È¹Î«*È«^¸¸«˜Ãò.«¹Ê«¸)‚ÉÛN¸ù’ÉéË+N«ËzÈhÎ¹	ÉkB«+Ê	ÎËŞÉÛBÉX‚É{Nºk«(>Ë)¹ûÂ»;NÉÛ¸ºBàĞ¢òò«+Ê	Â¹ûØ8ÉèNÉÛB&WVW7E–ÖVçBÊxÊNÉyÉÛBÙHÎ¹é«{º[ÂÈKÉ«N¸ºBâ—5&ö6W76–ærÉÛBfÇ6RºÂfÇW6‚¹	¸©@Ğ¢òòØ8ÉÛN»ŞÉyÉÙÊNÙYÊxÉX®ÉËÎº
N«:»8N¸øBÙHÎ¹é«{º[ÂÉ;N¸ºBàĞ¢–b‚‡v–æF÷r2Væ¶æ÷vâ2²õö6E7W&W75–ÖVçEVæÆöD&Æö6³ó¢&ööÆVâÒ’åõö6E7W&W75–ÖVçEVæÆöD&Æö6²ÓÓÒG'VR’&WGW&ã°Ğ¢WfVçBç&WfVçDFVfVÇB‚“°Ğ¢WfVçBç&WGW&åfÇVRÒ"#°Ğ¢Ó°Ğ Ğ¢v–æF÷ræFDWfVçDÆ—7FVæW"‚&&Vf÷&WVæÆöB"Â†æFÆT&Vf÷&UVæÆöB“°Ğ¢&WGW&â‚’Óâ°Ğ¢v–æF÷rç&VÖ÷fTWfVçDÆ—7FVæW"‚&&Vf÷&WVæÆöB"Â†æFÆT&Vf÷&UVæÆöB“°Ğ¢Ó°Ğ¢ÒÂ¶—5&ö6W76–æuÒ“°Ğ Ğ¢6öç7BfÇVRÒW6TÖVÖò€Ğ¢‚’Óâ‡°Ğ¢—5&ö6W76–ærÀĞ¢—5–ÖVçDÆöF–æs¢—5&ö6W76–ærÀĞ¢&ö6W76–ætÖW76vRÀĞ¢7F'E&ö6W76–ærÀĞ¢7F÷&ö6W76–ærÀĞ¢6WE&ö6W76–ætÖW76vRÀĞ¢6WE&ö6W76–æt7F–öâÀĞ¢7F'E–ÖVçC¢7F'E&ö6W76–ærÀĞ¢VæE–ÖVçC¢7F÷&ö6W76–ærÀĞ¢6WE–ÖVçDÖW76vS¢6WE&ö6W76–ætÖW76vRÀĞ¢Ò’ÀĞ¢°Ğ¢—5&ö6W76–ærÀĞ¢&ö6W76–ætÖW76vRÀĞ¢7F'E&ö6W76–ærÀĞ¢7F÷&ö6W76–ærÀĞ¢6WE&ö6W76–ætÖW76vRÀĞ¢6WE&ö6W76–æt7F–öâÀĞ¢ÒÀĞ¢“°Ğ Ğ¢&WGW&â€Ğ¢Å–ÖVçE&ö6W76–æt6öçFW‡Bå&÷f–FW"fÇVS×·fÇVWÓàĞ¢Å–DfVGW&TvFU&÷f–FW#àĞ¢¶6†–ÆG&VçĞĞ¢¶—5&ö6W76–ærò€Ğ¢ÄFVfW'&VE–ÖVçE&ö6W76–æt÷fW&ÆĞ¢÷VàĞ¢f&–çC×·&ö6W76–æuf&–çGĞĞ¢7FvS×·&W6öÇfU–ÖVçDÆöF–æu7FvR‡&ö6W76–æuf&–çBÂ&ö6W76–ætÖW76vR—ĞĞ¢–ÖVçEG—S×·&W6öÇfU–ÖVçDÆöF–æuG—R‡&ö6W76–æuf&–çBÂ&ö6W76–ætÖW76vR—ĞĞ¢7FGW4ÖW76vS×·&ö6W76–ætÖW76vWĞĞ¢7F–öäÆ&VÃ×·&ö6W76–æt7F–öãòæÆ&VÇĞĞ¢öä7F–öã×·&ö6W76–æt7F–öãòæöä6Æ–6·ĞĞ¢óàĞ¢’¢çVÆÇĞĞ¢Âõ–DfVGW&TvFU&÷f–FW#àĞ¢Âõ–ÖVçE&ö6W76–æt6öçFW‡Bå&÷f–FW#àĞ¢“°Ğ§ĞĞ Ğ¦W‡÷'BgVæ7F–öâW6U–ÖVçE&ö6W76–ær‚’°Ğ¢6öç7B6öçFW‡BÒW6T6öçFW‡B…–ÖVçE&ö6W76–æt6öçFW‡B“°Ğ¢–b‚6öçFW‡B’°Ğ¢F‡&÷ræWrW'&÷"‚'W6U–ÖVçE&ö6W76–ær×W7B&RW6VBv—F†–â–ÖVçE&ö6W76–æu&÷f–FW""“°Ğ¢ĞĞ¢&WGW&â6öçFW‡C°Ğ§ĞĞ Ğ¦W‡÷'B6öç7BW6U–ÖVçBÒW6U–ÖVçE&ö6W76–æs°Ğ Ğ¦W‡÷'BgVæ7F–öâW6U–DfVGW&TvFR‚’°Ğ¢6öç7B6öçFW‡BÒW6T6öçFW‡B…–DfVGW&TvFT6öçFW‡B“°Ğ¢–b‚6öçFW‡B’°Ğ¢F‡&÷ræWrW'&÷"‚'W6U–DfVGW&TvFR×W7B&RW6VBv—F†–â–DfVGW&TvFU&÷f–FW""“°Ğ¢ĞĞ¢&WGW&â6öçFW‡C°Ğ§ĞĞ