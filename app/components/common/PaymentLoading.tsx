"use client";

import { useEffect, useState } from "react";
import LoadingProgressMotion, {
  type LoadingMotionPhase,
  type LoadingMotionTone,
} from "./LoadingProgressMotion";
import {
  FALLBACK_LOADING_MESSAGE,
  getCurrentLoadingLocale,
  resolveLoadingMessage,
  type LoadingLocale,
  type LoadingStage,
  type PaymentType,
} from "@/constants/loadingMessages";
import { PaymentPigVisual, PAYMENT_PIG_LOGO_URL } from "./PaymentPigVisual";

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
  actionLabel?: string;
  onAction?: () => void;
};

const DEFAULT_TITLE = FALLBACK_LOADING_MESSAGE.title;
const DEFAULT_DESCRIPTION = FALLBACK_LOADING_MESSAGE.sub;
const UNIFIED_PAYMENT_MARKER = "cd-react-static-matched-payment-ui-v20260618";

function resolveLoadingContextFromVariant(variant: NonNullable<PaymentLoadingProps["variant"]>): { stage: LoadingStage; paymentType: PaymentType } | null {
  if (variant === "pass-checking") return { stage: "access_check", paymentType: "pass" };
  if (variant === "pass-applied") return { stage: "result_loading", paymentType: "pass" };
  if (variant === "subscription") return { stage: "pg_processing", paymentType: "subscription" };
  if (variant === "monthly") return { stage: "access_check", paymentType: "subscription" };
  if (variant === "checkout" || variant === "confirm") return { stage: "pg_processing", paymentType: "single" };
  if (variant === "payment-complete" || variant === "unlock-saving") return { stage: "result_loading", paymentType: "single" };
  // 🔴 variant 'payment' 은 결제 수단이 확정되지 않은 기본 상태다(기본 prop · 초기 state · 리셋값).
  // access_check × single 로 두면 "단건으로 카드 결제를 준비 중이에요" 가 렌더돼, 아직 카드 결제를
  // 고르지도 않은 사용자에게 카드 결제를 준비한다고 말한다. 중립 카피(이용권 확인)로 둔다.
  if (variant === "payment") return { stage: "access_check", paymentType: "pass" };
  return null;
}

const PAYMENT_STATUS_COPY: Record<LoadingLocale, {
  secureLabel: string;
  complete: string;
  passChecking: string;
  passApplied: string;
  pgLoading: string;
  delayed8s: string;
  delayed20s: string;
  progressLabel: string;
  passProgressSteps: readonly [string, string, string];
}> = {
  ko: {
    secureLabel: "secure check",
    complete: "잠시 후 콘텐츠로 이어집니다.",
    passChecking: "이용권 적용 여부를 확인하고 있습니다.",
    passApplied: "콘텐츠 문을 여는 중입니다.",
    pgLoading: "PG사 결제창을 로드하는 중입니다.",
    delayed8s: "결제 확인이 조금 지연되고 있습니다. 곧 자동으로 이어집니다.",
    delayed20s: "확인이 길어지고 있습니다. 같은 창에서 계속 안전하게 재확인 중입니다.",
    progressLabel: "이용권 확인 진행 상태",
    passProgressSteps: ["이용권 확인", "혜택 적용", "결과 준비"],
  },
  en: {
    secureLabel: "secure check",
    complete: "Your content will open shortly",
    passChecking: "Checking whether your pass can be applied.",
    passApplied: "Opening the content for you.",
    pgLoading: "Loading the payment gateway window",
    delayed8s: "Payment confirmation is taking a little longer. It will continue automatically.",
    delayed20s: "Confirmation is still in progress. Please stay in this window while we keep checking safely.",
    progressLabel: "Pass check progress",
    passProgressSteps: ["Check pass", "Apply benefit", "Prepare result"],
  },
  ja: {
    secureLabel: "安全確認",
    complete: "まもなくコンテンツへ進みます",
    passChecking: "利用券を適用できるか確認しています。",
    passApplied: "コンテンツの扉を開いています。",
    pgLoading: "決済代行会社の決済画面を読み込んでいます。",
    delayed8s: "お支払い確認に少し時間がかかっています。まもなく自動で続きます。",
    delayed20s: "確認が長引いています。この画面のまま安全に確認を続けています。",
    progressLabel: "利用券確認の進行状況",
    passProgressSteps: ["利用券確認", "特典適用", "結果準備"],
  },
  "zh-CN": {
    secureLabel: "安全确认",
    complete: "即将进入内容",
    passChecking: "正在确认通行券是否可用。",
    passApplied: "正在为您打开内容。",
    pgLoading: "正在加载支付网关窗口。",
    delayed8s: "支付确认稍有延迟，系统会自动继续。",
    delayed20s: "确认仍在进行中。请停留在此窗口，我们会继续安全检查。",
    progressLabel: "通行券确认进度",
    passProgressSteps: ["确认通行券", "应用权益", "准备结果"],
  },
  "zh-TW": {
    secureLabel: "安全確認",
    complete: "即將進入內容",
    passChecking: "正在確認通行券是否可用。",
    passApplied: "正在為您開啟內容。",
    pgLoading: "正在載入支付閘道視窗。",
    delayed8s: "付款確認稍有延遲，系統會自動繼續。",
    delayed20s: "確認仍在進行中。請停留在此視窗，我們會繼續安全檢查。",
    progressLabel: "通行券確認進度",
    passProgressSteps: ["確認通行券", "套用權益", "準備結果"],
  },
  vi: {
    secureLabel: "kiểm tra an toàn",
    complete: "Nội dung sẽ mở ngay sau đây",
    passChecking: "Đang kiểm tra vé có thể áp dụng hay không.",
    passApplied: "Đang mở nội dung cho bạn.",
    pgLoading: "Đang tải cửa sổ thanh toán của cổng thanh toán",
    delayed8s: "Xác nhận thanh toán đang chậm hơn một chút. Hệ thống sẽ tự tiếp tục.",
    delayed20s: "Việc xác nhận vẫn đang diễn ra. Vui lòng ở lại cửa sổ này để chúng tôi kiểm tra an toàn.",
    progressLabel: "Tiến trình kiểm tra vé",
    passProgressSteps: ["Kiểm tra vé", "Áp dụng quyền", "Chuẩn bị kết quả"],
  },
  hi: {
    secureLabel: "सुरक्षित जाँच",
    complete: "सामग्री थोड़ी देर में खुलेगी",
    passChecking: "जाँचा जा रहा है कि आपका पास लागू हो सकता है या नहीं.",
    passApplied: "आपके लिए सामग्री खोली जा रही है.",
    pgLoading: "भुगतान गेटवे विंडो लोड हो रही है",
    delayed8s: "भुगतान पुष्टि में थोड़ा समय लग रहा है. यह अपने आप आगे बढ़ेगा.",
    delayed20s: "पुष्टि अभी जारी है. कृपया इसी विंडो में रहें, हम सुरक्षित रूप से जाँच कर रहे हैं.",
    progressLabel: "पास जाँच प्रगति",
    passProgressSteps: ["पास जाँच", "लाभ लागू", "परिणाम तैयार"],
  },
  es: {
    secureLabel: "verificación segura",
    complete: "El contenido se abrirá en breve",
    passChecking: "Comprobando si tu pase puede aplicarse.",
    passApplied: "Abriendo el contenido para ti.",
    pgLoading: "Cargando la ventana de pago de la pasarela",
    delayed8s: "La confirmación del pago tarda un poco más. Continuará automáticamente.",
    delayed20s: "La confirmación sigue en curso. Permanece en esta ventana mientras verificamos con seguridad.",
    progressLabel: "Progreso de verificación del pase",
    passProgressSteps: ["Comprobar pase", "Aplicar beneficio", "Preparar resultado"],
  },
  fr: {
    secureLabel: "vérification sécurisée",
    complete: "Le contenu va s'ouvrir sous peu",
    passChecking: "Vérification de l'application de votre pass.",
    passApplied: "Ouverture du contenu en cours.",
    pgLoading: "Chargement de la fenêtre de paiement",
    delayed8s: "La confirmation du paiement prend un peu plus de temps. La suite sera automatique.",
    delayed20s: "La confirmation est toujours en cours. Restez dans cette fenêtre pendant la vérification sécurisée.",
    progressLabel: "Progression de vérification du pass",
    passProgressSteps: ["Vérifier le pass", "Appliquer l'avantage", "Préparer le résultat"],
  },
  de: {
    secureLabel: "sichere Prüfung",
    complete: "Der Inhalt öffnet sich gleich",
    passChecking: "Es wird geprüft, ob dein Pass angewendet werden kann.",
    passApplied: "Der Inhalt wird für dich geöffnet.",
    pgLoading: "Zahlungsfenster des Anbieters wird geladen",
    delayed8s: "Die Zahlungsbestätigung dauert etwas länger. Es geht automatisch weiter.",
    delayed20s: "Die Bestätigung läuft noch. Bitte bleib in diesem Fenster, während wir sicher weiter prüfen.",
    progressLabel: "Fortschritt der Passprüfung",
    passProgressSteps: ["Pass prüfen", "Vorteil anwenden", "Ergebnis vorbereiten"],
  },
  nl: {
    secureLabel: "veilige controle",
    complete: "De inhoud opent zo",
    passChecking: "We controleren of je pas kan worden toegepast.",
    passApplied: "De inhoud wordt voor je geopend.",
    pgLoading: "Betaalvenster van de provider wordt geladen",
    delayed8s: "De betaalbevestiging duurt iets langer. Het gaat automatisch verder.",
    delayed20s: "De bevestiging loopt nog. Blijf in dit venster terwijl we veilig blijven controleren.",
    progressLabel: "Voortgang pascontrole",
    passProgressSteps: ["Pas controleren", "Voordeel toepassen", "Resultaat voorbereiden"],
  },
  ms: {
    secureLabel: "semakan selamat",
    complete: "Kandungan akan dibuka sebentar lagi",
    passChecking: "Menyemak sama ada pas anda boleh digunakan.",
    passApplied: "Membuka kandungan untuk anda.",
    pgLoading: "Memuatkan tetingkap pembayaran gerbang",
    delayed8s: "Pengesahan bayaran mengambil sedikit masa. Sistem akan teruskan secara automatik.",
    delayed20s: "Pengesahan masih berjalan. Sila kekal di tetingkap ini sementara kami menyemak dengan selamat.",
    progressLabel: "Kemajuan semakan pas",
    passProgressSteps: ["Semak pas", "Guna manfaat", "Sedia hasil"],
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
  actionLabel,
  onAction,
}: PaymentLoadingProps) {
  const [loadingPhase, setLoadingPhase] = useState<LoadingMotionPhase>("fresh");
  const [locale, setLocale] = useState<LoadingLocale>("ko");

  useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined") return;
    const img = new window.Image();
    img.decoding = "async";
    img.src = PAYMENT_PIG_LOGO_URL;
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

  const isPaymentComplete = variant === "payment-complete" || variant === "unlock-saving" || variant === "pass-applied";
  // 이용권 확인 구간은 정상이면 서버 왕복 0~1회라 8초는 너무 늦다 — 정적 셸(2.5초/6초)과 같은 시점에
  // 안내한다. 반대로 PG 승인 확인(checkout/confirm)은 원래 십수 초가 걸리는 구간이라, 거기까지
  // 2.5초에 "지연되고 있습니다"를 띄우면 정상 흐름을 문제처럼 보이게 만든다. 그래서 구간별로 나눈다.
  const isPassCheckingVariant = variant === "pass-checking" || variant === "payment" || variant === "monthly";
  const warmDelayMs = isPassCheckingVariant ? 2500 : 8000;
  const slowDelayMs = isPassCheckingVariant ? 6000 : 20000;

  useEffect(() => {
    if (!open) {
      setLoadingPhase("fresh");
      return;
    }

    setLoadingPhase("fresh");
    if (isPaymentComplete) return;

    const warmTimer = window.setTimeout(() => setLoadingPhase("warming"), warmDelayMs);
    const slowTimer = window.setTimeout(() => setLoadingPhase("slow"), slowDelayMs);

    return () => {
      window.clearTimeout(warmTimer);
      window.clearTimeout(slowTimer);
    };
  }, [isPaymentComplete, open, warmDelayMs, slowDelayMs]);

  if (!open) return null;

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
  // 🔴 variant 'checkout' = 단건 확정 → PG 결제창이 실제로 뜨기까지의 구간(셸 mode 'card').
  // stage 매핑상 pg_processing.single("결제를 처리하고 있어요")로 떨어지는데, 이 구간은 결제가
  // 시작되지도 않았고 PG창도 아직 없다. 셸 mode 'card' 정본 카피와 같은 문구를 쓴다.
  const pgLoadingTitle = variant === "checkout" ? uiCopy.pgLoading : "";
  const resolvedTitle = title || pgLoadingTitle || (passLines.length > 1 ? passLines[0] : "") || copy.title || fallbackCopy.title || DEFAULT_TITLE;
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
  const loadingTone: LoadingMotionTone = isPassAppliedVariant || resolvedPaymentType === "pass"
    ? "pass"
    : isPaymentComplete
      ? "result"
      : "payment";
  const resolvedStatus = loadingPhase === "slow"
    ? uiCopy.delayed20s
    : loadingPhase === "warming"
      ? uiCopy.delayed8s
      : isPassAppliedVariant
        ? statusMap[variant]
      : shouldUseCleanedStatus
        ? cleanedStatus
        : statusMap[variant];
  const showSkeleton = !isPaymentComplete;
  // 🔴 진행 단계는 경과 시간이 아니라 **실제 단계**로만 움직인다. 예전에는 8초/20초 타이머 하나가
  // 지연 안내 문구와 단계 인덱스를 함께 올려서, 이용권이 없어 서버 답만 기다리는 사용자에게도
  // '혜택 적용 → 결과 준비'가 차례로 켜졌다(있지도 않은 혜택을 적용하는 것처럼 보였다).
  // 지연 안내 문구(delayed8s/20s)는 시간 기반 그대로 둔다 — 그건 정직한 정보다.
  const progressStep = resolvedStage === "result_loading" ? 2 : resolvedStage === "pg_processing" ? 1 : 0;

  return (
    <div
      role={isPassAppliedVariant ? "dialog" : "alertdialog"}
      aria-modal="true"
      aria-live={isPassAppliedVariant ? "polite" : "assertive"}
      aria-busy="true"
      data-payment-loading-variant={variant}
      data-loading-phase={loadingPhase}
      data-payment-loading-marker={UNIFIED_PAYMENT_MARKER}
      className="fixed inset-0 z-[2147483003] flex items-end justify-center bg-[linear-gradient(180deg,rgba(3,6,18,.50),rgba(2,6,23,.72))] px-0 backdrop-blur-[14px] sm:items-center sm:px-4"
    >
      <div className={`relative w-full overflow-hidden rounded-t-[8px] border border-white/20 bg-[radial-gradient(circle_at_82%_10%,rgba(254,240,138,.16),transparent_32%),linear-gradient(145deg,rgba(15,23,42,.82),rgba(30,41,59,.68))] p-5 text-left text-white shadow-[0_26px_90px_rgba(2,6,23,.58),inset_0_1px_0_rgba(255,255,255,.18)] backdrop-blur-[22px] sm:max-w-[440px] sm:rounded-[8px] sm:p-6 ${isFamilyPassVariant ? "ring-1 ring-amber-200/30" : ""}`}>
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20 sm:hidden" />
        <div className="pointer-events-none absolute inset-0 opacity-80" aria-hidden="true">
          <span className="absolute left-[18%] top-[18%] h-1 w-1 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,.8)]" />
          <span className="absolute right-[22%] top-[24%] h-1.5 w-1.5 rounded-full bg-amber-100 shadow-[0_0_14px_rgba(253,230,138,.82)]" />
          <span className="absolute bottom-[26%] left-[24%] h-1 w-1 rounded-full bg-cyan-100 shadow-[0_0_12px_rgba(207,250,254,.75)]" />
          <span className="absolute bottom-[30%] right-[18%] h-1 w-1 rounded-full bg-fuchsia-100 shadow-[0_0_12px_rgba(250,232,255,.7)]" />
        </div>

        <PaymentPigVisual tone={loadingTone} />

        <div>
          <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-cyan-200/80">{uiCopy.secureLabel}</p>
          <h2 className="m-0 text-[22px] font-black leading-[1.24] tracking-normal text-white">{resolvedTitle}</h2>
        </div>
        {shouldShowDescription ? (
          <p className="mt-4 whitespace-pre-line text-sm leading-[1.7] text-slate-200/90">{resolvedDescription}</p>
        ) : null}

        {!isPaymentComplete ? (
          <LoadingProgressMotion
            phase={loadingPhase}
            step={progressStep}
            tone={loadingTone}
            label={resolvedPaymentType === "pass" ? uiCopy.progressLabel : undefined}
            labels={resolvedPaymentType === "pass" ? uiCopy.passProgressSteps : undefined}
          />
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
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="mt-5 min-h-12 w-full rounded-[8px] border border-amber-100/50 bg-amber-100 px-4 text-sm font-black text-slate-950 shadow-[0_10px_28px_rgba(254,240,138,.18)] transition hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
