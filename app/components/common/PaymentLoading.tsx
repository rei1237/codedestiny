"use client";

import { useEffect, useState } from "react";
import { getAssetUrlFromPublicPath } from "@/lib/r2-public-url";
import {
  FALLBACK_LOADING_MESSAGE,
  getCurrentLoadingLocale,
  resolveLoadingMessage,
  type LoadingLocale,
  type LoadingStage,
  type PaymentType,
} from "@/constants/loadingMessages";

export type PaymentLoadingProps = {
  open: boolean;
  variant?:
    | "payment"
    | "checkout"
    | "confirm"
    | "monthly"
    | "subscription"
    | "unlock-saving"
    | "payment-complete"
    | "refund"
    | "pass-checking"
    | "pass-applied";
  title?: string;
  description?: string;
  statusMessage?: string;
  stage?: LoadingStage;
  paymentType?: PaymentType;
};

const DEFAULT_TITLE = FALLBACK_LOADING_MESSAGE.title;
const DEFAULT_DESCRIPTION = FALLBACK_LOADING_MESSAGE.sub;
const KKULKKUL_LOGO_PUBLIC_PATH =
  "/icons/%EA%BF%80%EA%BF%80%20%EC%9A%B4%EC%84%B8%20%EB%A1%9C%EA%B3%A0.webp?v=20260618-react-paid-gate";
const KKULKKUL_LOGO_URL = getAssetUrlFromPublicPath(KKULKKUL_LOGO_PUBLIC_PATH);
const UNIFIED_PAYMENT_MARKER = "cd-react-static-matched-payment-ui-v20260618";

function resolveLoadingContextFromVariant(variant: NonNullable<PaymentLoadingProps["variant"]>): { stage: LoadingStage; paymentType: PaymentType } | null {
  if (variant === "pass-checking") return { stage: "access_check", paymentType: "pass" };
  if (variant === "pass-applied") return { stage: "result_loading", paymentType: "pass" };
  if (variant === "subscription") return { stage: "pg_processing", paymentType: "subscription" };
  if (variant === "monthly") return { stage: "access_check", paymentType: "subscription" };
  if (variant === "checkout" || variant === "confirm") return { stage: "pg_processing", paymentType: "single" };
  if (variant === "payment-complete" || variant === "unlock-saving") return { stage: "result_loading", paymentType: "single" };
  if (variant === "payment") return { stage: "access_check", paymentType: "single" };
  return null;
}

const PAYMENT_STATUS_COPY: Record<LoadingLocale, {
  secureLabel: string;
  complete: string;
  passChecking: string;
  passApplied: string;
  delayed8s: string;
  delayed20s: string;
}> = {
  ko: {
    secureLabel: "secure check",
    complete: "잠시 후 콘텐츠로 이어집니다.",
    passChecking: "이용권 적용 여부를 확인하고 있습니다.",
    passApplied: "콘텐츠 문을 여는 중입니다.",
    delayed8s: "결제 확인이 조금 지연되고 있습니다. 곧 자동으로 이어집니다.",
    delayed20s: "확인이 길어지고 있습니다. 같은 창에서 계속 안전하게 재확인 중입니다.",
  },
  en: {
    secureLabel: "secure check",
    complete: "Your content will open shortly",
    passChecking: "Checking whether your pass can be applied.",
    passApplied: "Opening the content for you.",
    delayed8s: "Payment confirmation is taking a little longer. It will continue automatically.",
    delayed20s: "Confirmation is still in progress. Please stay in this window while we keep checking safely.",
  },
  ja: {
    secureLabel: "安全確認",
    complete: "まもなくコンテンツへ進みます",
    passChecking: "利用券を適用できるか確認しています。",
    passApplied: "コンテンツの扉を開いています。",
    delayed8s: "お支払い確認に少し時間がかかっています。まもなく自動で続きます。",
    delayed20s: "確認が長引いています。この画面のまま安全に確認を続けています。",
  },
  "zh-CN": {
    secureLabel: "安全确认",
    complete: "即将进入内容",
    passChecking: "正在确认通行券是否可用。",
    passApplied: "正在为您打开内容。",
    delayed8s: "支付确认稍有延迟，系统会自动继续。",
    delayed20s: "确认仍在进行中。请停留在此窗口，我们会继续安全检查。",
  },
  "zh-TW": {
    secureLabel: "安全確認",
    complete: "即將進入內容",
    passChecking: "正在確認通行券是否可用。",
    passApplied: "正在為您開啟內容。",
    delayed8s: "付款確認稍有延遲，系統會自動繼續。",
    delayed20s: "確認仍在進行中。請停留在此視窗，我們會繼續安全檢查。",
  },
  vi: {
    secureLabel: "kiểm tra an toàn",
    complete: "Nội dung sẽ mở ngay sau đây",
    passChecking: "Đang kiểm tra vé có thể áp dụng hay không.",
    passApplied: "Đang mở nội dung cho bạn.",
    delayed8s: "Xác nhận thanh toán đang chậm hơn một chút. Hệ thống sẽ tự tiếp tục.",
    delayed20s: "Việc xác nhận vẫn đang diễn ra. Vui lòng ở lại cửa sổ này để chúng tôi kiểm tra an toàn.",
  },
  hi: {
    secureLabel: "सुरक्षित जाँच",
    complete: "सामग्री थोड़ी देर में खुलेगी",
    passChecking: "जाँचा जा रहा है कि आपका पास लागू हो सकता है या नहीं.",
    passApplied: "आपके लिए सामग्री खोली जा रही है.",
    delayed8s: "भुगतान पुष्टि में थोड़ा समय लग रहा है. यह अपने आप आगे बढ़ेगा.",
    delayed20s: "पुष्टि अभी जारी है. कृपया इसी विंडो में रहें, हम सुरक्षित रूप से जाँच कर रहे हैं.",
  },
  es: {
    secureLabel: "verificación segura",
    complete: "El contenido se abrirá en breve",
    passChecking: "Comprobando si tu pase puede aplicarse.",
    passApplied: "Abriendo el contenido para ti.",
    delayed8s: "La confirmación del pago tarda un poco más. Continuará automáticamente.",
    delayed20s: "La confirmación sigue en curso. Permanece en esta ventana mientras verificamos con seguridad.",
  },
  fr: {
    secureLabel: "vérification sécurisée",
    complete: "Le contenu va s'ouvrir sous peu",
    passChecking: "Vérification de l'application de votre pass.",
    passApplied: "Ouverture du contenu en cours.",
    delayed8s: "La confirmation du paiement prend un peu plus de temps. La suite sera automatique.",
    delayed20s: "La confirmation est toujours en cours. Restez dans cette fenêtre pendant la vérification sécurisée.",
  },
  de: {
    secureLabel: "sichere Prüfung",
    complete: "Der Inhalt öffnet sich gleich",
    passChecking: "Es wird geprüft, ob dein Pass angewendet werden kann.",
    passApplied: "Der Inhalt wird für dich geöffnet.",
    delayed8s: "Die Zahlungsbestätigung dauert etwas länger. Es geht automatisch weiter.",
    delayed20s: "Die Bestätigung läuft noch. Bitte bleib in diesem Fenster, während wir sicher weiter prüfen.",
  },
  nl: {
    secureLabel: "veilige controle",
    complete: "De inhoud opent zo",
    passChecking: "We controleren of je pas kan worden toegepast.",
    passApplied: "De inhoud wordt voor je geopend.",
    delayed8s: "De betaalbevestiging duurt iets langer. Het gaat automatisch verder.",
    delayed20s: "De bevestiging loopt nog. Blijf in dit venster terwijl we veilig blijven controleren.",
  },
  ms: {
    secureLabel: "semakan selamat",
    complete: "Kandungan akan dibuka sebentar lagi",
    passChecking: "Menyemak sama ada pas anda boleh digunakan.",
    passApplied: "Membuka kandungan untuk anda.",
    delayed8s: "Pengesahan bayaran mengambil sedikit masa. Sistem akan teruskan secara automatik.",
    delayed20s: "Pengesahan masih berjalan. Sila kekal di tetingkap ini sementara kami menyemak dengan selamat.",
  },
};

export default function PaymentLoading({
  open,
  variant = "payment",
  title,
  description,
  statusMessage,
  stage,
  paymentType,
}: PaymentLoadingProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [locale, setLocale] = useState<LoadingLocale>("ko");

  useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined") return;
    const img = new window.Image();
    img.decoding = "async";
    img.src = KKULKKUL_LOGO_URL;
  }, [open]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setLocale(getCurrentLoadingLocale());
  }, [open]);

  useEffect(() => {
    if (!open) {
      setElapsedMs(0);
      return;
    }

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [open]);

  if (!open) return null;

  const isPaymentComplete = variant === "payment-complete" || variant === "unlock-saving" || variant === "pass-applied";
  const isPassAppliedVariant = variant === "pass-applied";
  const variantContext = resolveLoadingContextFromVariant(variant);
  const resolvedStage = stage || variantContext?.stage;
  const resolvedPaymentType = paymentType || variantContext?.paymentType;
  const hasLoadingContext = Boolean(resolvedStage && resolvedPaymentType);
  const copy = resolveLoadingMessage(resolvedStage, resolvedPaymentType, locale);
  const fallbackCopy = resolveLoadingMessage(undefined, undefined, locale);
  const uiCopy = PAYMENT_STATUS_COPY[locale] || PAYMENT_STATUS_COPY.ko;
  const statusMap: Partial<Record<NonNullable<PaymentLoadingProps["variant"]>, string>> = {
    "payment-complete": uiCopy.complete,
    "pass-checking": uiCopy.passChecking,
    "pass-applied": uiCopy.passApplied,
  };
  const cleanedStatus = String(statusMessage || "").trim();
  const statusLooksKorean = /[가-힣]/.test(cleanedStatus);
  const canUseStatusMessage = locale === "ko" || !statusLooksKorean;
  const passLines = isPassAppliedVariant && !description && cleanedStatus && canUseStatusMessage
    ? cleanedStatus.split(/\n+/).map((line) => line.trim()).filter(Boolean)
    : [];
  const resolvedTitle = title || (passLines.length > 1 ? passLines[0] : "") || copy.title || fallbackCopy.title || DEFAULT_TITLE;
  const resolvedDescription = description
    || (passLines.length > 1 ? passLines.slice(1).join("\n") : "")
    || (hasLoadingContext ? copy.sub : (copy.sub || fallbackCopy.sub || DEFAULT_DESCRIPTION));
  const shouldShowDescription = resolvedDescription.trim().length > 0;
  const isFamilyPassVariant = isPassAppliedVariant && [resolvedTitle, resolvedDescription, cleanedStatus].join(" ").toUpperCase().includes("FAMILY");
  const normalizedResolvedCopy = [resolvedTitle, shouldShowDescription ? resolvedDescription : ""].filter(Boolean).join("\n").trim();
  const shouldUseCleanedStatus = cleanedStatus
    && canUseStatusMessage
    && cleanedStatus !== resolvedTitle
    && cleanedStatus !== resolvedDescription
    && cleanedStatus !== normalizedResolvedCopy;
  const resolvedStatus = elapsedMs >= 20000
    ? uiCopy.delayed20s
    : elapsedMs >= 8000
      ? uiCopy.delayed8s
      : isPassAppliedVariant
        ? statusMap[variant]
      : shouldUseCleanedStatus
        ? cleanedStatus
        : statusMap[variant];
  const showSkeleton = !isPaymentComplete;

  return (
    <div
      role={isPassAppliedVariant ? "dialog" : "alertdialog"}
      aria-modal="true"
      aria-live={isPassAppliedVariant ? "polite" : "assertive"}
      data-payment-loading-variant={variant}
      data-payment-loading-marker={UNIFIED_PAYMENT_MARKER}
      className="fixed inset-0 z-[2147483003] flex items-end justify-center bg-[linear-gradient(180deg,rgba(3,6,18,.50),rgba(2,6,23,.72))] px-0 backdrop-blur-[14px] sm:items-center sm:px-4"
    >
      <div className={`relative w-full overflow-hidden rounded-t-[8px] border border-white/20 bg-[radial-gradient(circle_at_82%_10%,rgba(254,240,138,.16),transparent_32%),linear-gradient(145deg,rgba(15,23,42,.82),rgba(30,41,59,.68))] p-5 text-left text-white shadow-[0_26px_90px_rgba(2,6,23,.58),inset_0_1px_0_rgba(255,255,255,.18)] backdrop-blur-[22px] sm:max-w-[440px] sm:rounded-[8px] sm:p-6 ${isFamilyPassVariant ? "ring-1 ring-amber-200/30" : ""}`}>
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20 sm:hidden" />
        {isPassAppliedVariant ? (
          <div className="pointer-events-none absolute inset-0 opacity-80">
            <span className="absolute left-[18%] top-[18%] h-1 w-1 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,.8)]" />
            <span className="absolute right-[22%] top-[24%] h-1.5 w-1.5 rounded-full bg-amber-100 shadow-[0_0_14px_rgba(253,230,138,.82)]" />
            <span className="absolute bottom-[26%] left-[24%] h-1 w-1 rounded-full bg-cyan-100 shadow-[0_0_12px_rgba(207,250,254,.75)]" />
            <span className="absolute bottom-[30%] right-[18%] h-1 w-1 rounded-full bg-fuchsia-100 shadow-[0_0_12px_rgba(250,232,255,.7)]" />
          </div>
        ) : null}

        <div className="relative mx-auto mb-4 h-24 w-24 rounded-full shadow-[0_0_34px_rgba(251,191,36,.18)] isolate">
          <span className="absolute -inset-3 rounded-full bg-[radial-gradient(circle,rgba(254,243,199,.36),transparent_62%)] blur-[1px]" />
          <div
            className="relative h-full w-full bg-contain bg-center bg-no-repeat drop-shadow-[0_14px_22px_rgba(86,47,21,.2)]"
            style={{ backgroundImage: `url("${KKULKKUL_LOGO_URL}")` }}
          />
        </div>

        <div>
          <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-cyan-200/80">{uiCopy.secureLabel}</p>
          <h2 className="m-0 text-[22px] font-black leading-[1.24] tracking-normal text-white">{resolvedTitle}</h2>
        </div>
        {shouldShowDescription ? (
          <p className="mt-4 whitespace-pre-line text-sm leading-[1.7] text-slate-200/90">{resolvedDescription}</p>
        ) : null}

        {showSkeleton ? (
          <div className="mt-5 grid gap-[9px]" aria-hidden="true">
            <span className="h-3 w-full animate-pulse rounded-full bg-white/10" />
            <span className="h-3 w-[82%] animate-pulse rounded-full bg-white/10" />
            <span className="h-3 w-[64%] animate-pulse rounded-full bg-white/10" />
          </div>
        ) : null}

        {resolvedStatus ? (
          <p className="mt-4 inline-flex rounded-full border border-amber-200/30 bg-amber-300/10 px-3 py-1 text-xs font-extrabold text-amber-100">{resolvedStatus}</p>
        ) : null}
      </div>
    </div>
  );
}
