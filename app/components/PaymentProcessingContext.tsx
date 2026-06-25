"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import PaymentLoading, { type PaymentLoadingProps } from "./common/PaymentLoading";
import LoadingProgressMotion, {
  type LoadingMotionPhase,
  type LoadingMotionTone,
} from "./common/LoadingProgressMotion";
import {
  getCurrentLoadingLocale,
  resolveLoadingMessage,
  type LoadingLocale,
  type LoadingStage,
  type PaymentType,
} from "@/constants/loadingMessages";
import { getAssetUrlFromPublicPath } from "@/lib/r2-public-url";

type PaymentLoadingVariant = NonNullable<PaymentLoadingProps["variant"]>;

type PaymentProcessingContextValue = {
  isProcessing: boolean;
  isPaymentLoading: boolean;
  processingMessage: string;
  startProcessing: (message?: string, variant?: PaymentLoadingVariant) => void;
  stopProcessing: () => void;
  setProcessingMessage: (message: string) => void;
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

const DEFAULT_PROCESSING_MESSAGE = "처리 중이에요\n잠시만 기다려 주세요";

const PAID_GATE_DEFAULT_TITLE = "결제/이용권 확인";
const PAID_GATE_DEFAULT_MESSAGE = "이용권을 확인하는 중이에요";

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

const KOREAN_TEXT_PATTERN = /[가-힣]/;

const PAID_GATE_COPY: Record<PaidFeatureGateStatus, PaidGateCopy> = {
  idle: { label: "대기", title: PAID_GATE_DEFAULT_TITLE, message: PAID_GATE_DEFAULT_MESSAGE },
  opening: { label: "준비", title: "이용권 확인", message: "이용권을 확인하는 중이에요" },
  checkingEntitlement: { label: "확인 중", title: "이용권 확인", message: "이용권을 확인하는 중이에요" },
  hasEntitlement: { label: "이용 가능", title: "이용권 확인 완료", message: "이용권을 확인했어요\n결과를 불러오는 중이에요" },
  noEntitlement: { label: "결제 필요", title: PAID_GATE_DEFAULT_TITLE, message: "이용 가능한 이용권을 찾지 못했습니다." },
  loadingProducts: { label: "확인 중", title: "이용권/결제 확인", message: "이용권 적용 여부와 결제 가능 상태를 확인하고 있어요" },
  readyToPay: { label: "선택 대기", title: "결제 수단 선택", message: "이 콘텐츠를 열 수 있는 결제 수단을 선택해 주세요." },
  paymentProcessing: { label: "처리 중", title: "결제 처리 중", message: "결제를 처리하고 있어요\n창을 닫지 말아 주세요" },
  paymentSuccess: { label: "완료", title: "결제 완료", message: "결제가 완료됐어요\n결과를 불러오는 중이에요" },
  paymentFailed: { label: "실패", title: "결제 확인 실패", message: "결제를 완료하지 못했습니다." },
  error: { label: "오류", title: "확인 실패", message: "네트워크 상태를 확인한 뒤 다시 시도해 주세요." },
  paymentPreparing: { label: "결제 준비", title: "단건 결제 준비 중", message: "주문 정보와 인증 흐름이 조용히 맞춰지고 있어요\n창을 닫지 말아 주세요" },
  paymentWindowOpen: { label: "결제 진행", title: "단건 결제 준비 중", message: "주문 정보와 인증 흐름이 조용히 맞춰지고 있어요\n창을 닫지 말아 주세요" },
  savingUnlock: { label: "저장 중", title: "잠금 해제 저장 중", message: "결과 화면으로 이어지도록 이용 권한 기록을 저장하고 있습니다." },
  unlockSaving: { label: "저장 중", title: "잠금 해제 저장 중", message: "결과 화면으로 이어지도록 이용 권한 기록을 저장하고 있습니다." },
  cancelled: { label: "취소됨", title: "결제 선택 취소", message: "결제 선택이 취소되었습니다. 필요할 때 다시 진행할 수 있습니다." },
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
    idle: { label: "待機中", title: "決済・利用券の確認", message: "利用券を確認しています。" },
    noEntitlement: { label: "決済が必要", title: "決済・利用券の確認", message: "利用できる利用券が見つかりませんでした。" },
    readyToPay: { label: "選択待ち", title: "決済方法の選択", message: "このコンテンツを開く決済方法を選んでください。" },
    paymentFailed: { label: "失敗", title: "決済確認に失敗しました", message: "お支払いを完了できませんでした。" },
    error: { label: "エラー", title: "確認に失敗しました", message: "通信状況を確認して、もう一度お試しください。" },
    cancelled: { label: "キャンセル", title: "決済選択をキャンセルしました", message: "必要なときにもう一度進められます。" },
  },
  "zh-CN": {
    idle: { label: "等待", title: "支付/通行券确认", message: "正在确认通行券。" },
    noEntitlement: { label: "需要支付", title: "支付/通行券确认", message: "未找到可用的通行券。" },
    readyToPay: { label: "等待选择", title: "选择支付方式", message: "请选择可打开此内容的支付方式。" },
    paymentFailed: { label: "失败", title: "支付确认失败", message: "未能完成支付。" },
    error: { label: "错误", title: "确认失败", message: "请检查网络状态后重试。" },
    cancelled: { label: "已取消", title: "已取消支付选择", message: "需要时可以再次继续。" },
  },
  "zh-TW": {
    idle: { label: "等待", title: "付款/通行券確認", message: "正在確認通行券。" },
    noEntitlement: { label: "需要付款", title: "付款/通行券確認", message: "找不到可用的通行券。" },
    readyToPay: { label: "等待選擇", title: "選擇付款方式", message: "請選擇可開啟此內容的付款方式。" },
    paymentFailed: { label: "失敗", title: "付款確認失敗", message: "未能完成付款。" },
    error: { label: "錯誤", title: "確認失敗", message: "請檢查網路狀態後再試一次。" },
    cancelled: { label: "已取消", title: "已取消付款選擇", message: "需要時可以再次繼續。" },
  },
  vi: {
    idle: { label: "Đang chờ", title: "Kiểm tra thanh toán/vé", message: "Đang kiểm tra vé sử dụng." },
    noEntitlement: { label: "Cần thanh toán", title: "Kiểm tra thanh toán/vé", message: "Không tìm thấy vé có thể dùng." },
    readyToPay: { label: "Chờ chọn", title: "Chọn phương thức thanh toán", message: "Chọn phương thức thanh toán để mở nội dung này." },
    paymentFailed: { label: "Thất bại", title: "Xác nhận thanh toán thất bại", message: "Không thể hoàn tất thanh toán." },
    error: { label: "Lỗi", title: "Kiểm tra thất bại", message: "Vui lòng kiểm tra mạng rồi thử lại." },
    cancelled: { label: "Đã hủy", title: "Đã hủy lựa chọn thanh toán", message: "Bạn có thể thực hiện lại khi cần." },
  },
  hi: {
    idle: { label: "प्रतीक्षा", title: "भुगतान/पास जाँच", message: "आपका पास जाँचा जा रहा है." },
    noEntitlement: { label: "भुगतान आवश्यक", title: "भुगतान/पास जाँच", message: "उपयोग योग्य पास नहीं मिला." },
    readyToPay: { label: "चयन प्रतीक्षा", title: "भुगतान विधि चुनें", message: "इस सामग्री को खोलने के लिए भुगतान विधि चुनें." },
    paymentFailed: { label: "विफल", title: "भुगतान पुष्टि विफल", message: "भुगतान पूरा नहीं हो सका." },
    error: { label: "त्रुटि", title: "जाँच विफल", message: "कृपया नेटवर्क स्थिति जाँचकर फिर प्रयास करें." },
    cancelled: { label: "रद्द", title: "भुगतान चयन रद्द हुआ", message: "ज़रूरत पड़ने पर फिर से आगे बढ़ सकते हैं." },
  },
  es: {
    idle: { label: "En espera", title: "Comprobación de pago/pase", message: "Comprobando tu pase." },
    noEntitlement: { label: "Pago necesario", title: "Comprobación de pago/pase", message: "No se encontró un pase disponible." },
    readyToPay: { label: "Elegir pago", title: "Elige un método de pago", message: "Selecciona un método de pago para abrir este contenido." },
    paymentFailed: { label: "Falló", title: "Falló la confirmación del pago", message: "No se pudo completar el pago." },
    error: { label: "Error", title: "Falló la comprobación", message: "Revisa la conexión e inténtalo de nuevo." },
    cancelled: { label: "Cancelado", title: "Selección de pago cancelada", message: "Puedes intentarlo de nuevo cuando lo necesites." },
  },
  fr: {
    idle: { label: "En attente", title: "Vérification paiement/pass", message: "Vérification de votre pass." },
    noEntitlement: { label: "Paiement requis", title: "Vérification paiement/pass", message: "Aucun pass utilisable n'a été trouvé." },
    readyToPay: { label: "Choix du paiement", title: "Choisir un moyen de paiement", message: "Sélectionnez un moyen de paiement pour ouvrir ce contenu." },
    paymentFailed: { label: "Échec", title: "Échec de la confirmation du paiement", message: "Le paiement n'a pas pu être terminé." },
    error: { label: "Erreur", title: "Échec de la vérification", message: "Vérifiez votre connexion puis réessayez." },
    cancelled: { label: "Annulé", title: "Sélection du paiement annulée", message: "Vous pourrez réessayer quand vous le souhaitez." },
  },
  de: {
    idle: { label: "Warten", title: "Zahlung/Pass wird geprüft", message: "Dein Pass wird geprüft." },
    noEntitlement: { label: "Zahlung nötig", title: "Zahlung/Pass wird geprüft", message: "Es wurde kein nutzbarer Pass gefunden." },
    readyToPay: { label: "Zahlung wählen", title: "Zahlungsmethode wählen", message: "Wähle eine Zahlungsmethode, um diesen Inhalt zu öffnen." },
    paymentFailed: { label: "Fehlgeschlagen", title: "Zahlungsprüfung fehlgeschlagen", message: "Die Zahlung konnte nicht abgeschlossen werden." },
    error: { label: "Fehler", title: "Prüfung fehlgeschlagen", message: "Bitte prüfe deine Verbindung und versuche es erneut." },
    cancelled: { label: "Abgebrochen", title: "Zahlungsauswahl abgebrochen", message: "Du kannst es bei Bedarf erneut versuchen." },
  },
  nl: {
    idle: { label: "Wachten", title: "Betaling/pas controleren", message: "Je pas wordt gecontroleerd." },
    noEntitlement: { label: "Betaling nodig", title: "Betaling/pas controleren", message: "Er is geen bruikbare pas gevonden." },
    readyToPay: { label: "Betaling kiezen", title: "Kies een betaalmethode", message: "Kies een betaalmethode om deze inhoud te openen." },
    paymentFailed: { label: "Mislukt", title: "Betaalcontrole mislukt", message: "De betaling kon niet worden voltooid." },
    error: { label: "Fout", title: "Controle mislukt", message: "Controleer je netwerk en probeer het opnieuw." },
    cancelled: { label: "Geannuleerd", title: "Betaalkeuze geannuleerd", message: "Je kunt het opnieuw proberen wanneer dat nodig is." },
  },
  ms: {
    idle: { label: "Menunggu", title: "Semakan bayaran/pas", message: "Menyemak pas anda." },
    noEntitlement: { label: "Bayaran diperlukan", title: "Semakan bayaran/pas", message: "Tiada pas yang boleh digunakan ditemui." },
    readyToPay: { label: "Pilih bayaran", title: "Pilih kaedah bayaran", message: "Pilih kaedah bayaran untuk membuka kandungan ini." },
    paymentFailed: { label: "Gagal", title: "Pengesahan bayaran gagal", message: "Bayaran tidak dapat diselesaikan." },
    error: { label: "Ralat", title: "Semakan gagal", message: "Sila semak rangkaian anda dan cuba lagi." },
    cancelled: { label: "Dibatalkan", title: "Pilihan bayaran dibatalkan", message: "Anda boleh cuba semula apabila perlu." },
  },
};

const PAID_GATE_UI_COPY: Record<LoadingLocale, PaidGateUiCopy> = {
  ko: { closeLabel: "닫기", costPrefix: "필요 금액", costSuffix: "원", payAction: "결제 상품 보기", genericLabel: "확인 중", progressLabel: "이용권 확인 진행 상태", progressSteps: ["권한 확인", "처리 진행", "결과 준비"] },
  en: { closeLabel: "Close", costPrefix: "Required amount", costSuffix: " KRW", payAction: "View payment options", genericLabel: "Checking", progressLabel: "Access check progress", progressSteps: ["Check access", "Processing", "Prepare result"] },
  ja: { closeLabel: "閉じる", costPrefix: "必要金額", costSuffix: "ウォン", payAction: "決済商品を見る", genericLabel: "確認中", progressLabel: "利用券確認の進行状況", progressSteps: ["権限確認", "処理中", "結果準備"] },
  "zh-CN": { closeLabel: "关闭", costPrefix: "所需金额", costSuffix: "韩元", payAction: "查看支付选项", genericLabel: "确认中", progressLabel: "权限确认进度", progressSteps: ["确认权限", "处理中", "准备结果"] },
  "zh-TW": { closeLabel: "關閉", costPrefix: "所需金額", costSuffix: "韓元", payAction: "查看付款選項", genericLabel: "確認中", progressLabel: "權限確認進度", progressSteps: ["確認權限", "處理中", "準備結果"] },
  vi: { closeLabel: "Đóng", costPrefix: "Số tiền cần", costSuffix: " KRW", payAction: "Xem lựa chọn thanh toán", genericLabel: "Đang kiểm tra", progressLabel: "Tiến trình kiểm tra quyền", progressSteps: ["Kiểm tra quyền", "Đang xử lý", "Chuẩn bị kết quả"] },
  hi: { closeLabel: "बंद करें", costPrefix: "आवश्यक राशि", costSuffix: " KRW", payAction: "भुगतान विकल्प देखें", genericLabel: "जाँच जारी", progressLabel: "पहुँच जाँच प्रगति", progressSteps: ["पहुँच जाँच", "प्रक्रिया", "परिणाम तैयार"] },
  es: { closeLabel: "Cerrar", costPrefix: "Importe requerido", costSuffix: " KRW", payAction: "Ver opciones de pago", genericLabel: "Comprobando", progressLabel: "Progreso de verificación", progressSteps: ["Comprobar acceso", "Procesando", "Preparar resultado"] },
  fr: { closeLabel: "Fermer", costPrefix: "Montant requis", costSuffix: " KRW", payAction: "Voir les options de paiement", genericLabel: "Vérification", progressLabel: "Progression de vérification", progressSteps: ["Vérifier l'accès", "Traitement", "Préparer le résultat"] },
  de: { closeLabel: "Schließen", costPrefix: "Erforderlicher Betrag", costSuffix: " KRW", payAction: "Zahlungsoptionen ansehen", genericLabel: "Prüfung", progressLabel: "Fortschritt der Zugriffsprüfung", progressSteps: ["Zugriff prüfen", "Verarbeitung", "Ergebnis vorbereiten"] },
  nl: { closeLabel: "Sluiten", costPrefix: "Benodigd bedrag", costSuffix: " KRW", payAction: "Betaalopties bekijken", genericLabel: "Controleren", progressLabel: "Voortgang toegangscontrole", progressSteps: ["Toegang checken", "Verwerken", "Resultaat voorbereiden"] },
  ms: { closeLabel: "Tutup", costPrefix: "Jumlah diperlukan", costSuffix: " KRW", payAction: "Lihat pilihan bayaran", genericLabel: "Menyemak", progressLabel: "Kemajuan semakan akses", progressSteps: ["Semak akses", "Memproses", "Sedia hasil"] },
};

const PAID_GATE_NUMBER_LOCALE: Record<LoadingLocale, string> = {
  ko: "ko-KR",
  en: "en-US",
  ja: "ja-JP",
  "zh-CN": "zh-CN",
  "zh-TW": "zh-TW",
  vi: "vi-VN",
  hi: "hi-IN",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  nl: "nl-NL",
  ms: "ms-MY",
};

const KKULKKUL_PAYMENT_LOGO_URL =
  getAssetUrlFromPublicPath("/icons/%EA%BF%80%EA%BF%80%20%EC%9A%B4%EC%84%B8%20%EB%A1%9C%EA%B3%A0.webp?v=20260618-react-paid-gate");

const PaidFeatureGateContext = createContext<PaidFeatureGateContextValue | undefined>(undefined);

function resolvePaymentLoadingVariant(message?: string, mode?: string): PaymentLoadingVariant {
  const normalizedMode = String(mode || "").trim().toLowerCase();
  if (["payment-complete", "paymentcomplete", "payment-success", "success", "complete"].includes(normalizedMode)) return "payment-complete";
  if (normalizedMode === "pass-applied" || normalizedMode === "passapplied") return "pass-applied";
  if (normalizedMode === "pass" || normalizedMode === "pass-checking" || normalizedMode === "membership") return "pass-checking";
  if (["checkout", "card", "prepare", "opening"].includes(normalizedMode)) return "checkout";
  if (["confirm", "verification", "payment-confirm"].includes(normalizedMode)) return "confirm";
  if (["monthly", "monthly-credit", "monthly_credit", "membership-credit", "membership_credit", "moonstone", "moonlight-stone", "moonlight_stone", "moonlight stone"].includes(normalizedMode)) return "monthly";
  if (["subscription", "subscription-confirm", "subscription-prepare"].includes(normalizedMode)) return "subscription";
  if (["unlock-saving", "savingunlock", "saving-unlock"].includes(normalizedMode)) return "unlock-saving";
  if (normalizedMode === "refund") return "refund";

  const normalizedMessage = String(message || "");
  if (/이용권을 적용|이용권 확인|30일 이용권|이용권 권한|membership_pass|pass_applied|달빛 결제 시스템/i.test(normalizedMessage)) return "pass-checking";
  if (/결제창|주문|checkout|prepare|연결|열고/i.test(normalizedMessage)) return "checkout";
  if (/결제 결과|결제 승인|카드 승인|서버 검증|검증|승인|confirm|복귀 신호/i.test(normalizedMessage)) return "confirm";
  if (/moonlight[\s_-]*stone|moonstone|monthly_credit|membership_credit/i.test(normalizedMessage)) return "monthly";
  if (/이용권 결제|월정석|subscription|플랜|활성화/i.test(normalizedMessage)) return "subscription";
  if (/권한 저장|저장|해금|잠금 해제|결과 화면/i.test(normalizedMessage)) return "unlock-saving";
  if (/환불|refund|복구/i.test(normalizedMessage)) return "refund";
  return "payment";
}

function resolvePaymentLoadingStage(variant: PaymentLoadingVariant, message?: string): LoadingStage {
  const normalizedMessage = String(message || "");
  if (/활성화되고|완료됐어요|확인했어요|결과를 불러오는 중/.test(normalizedMessage)) return "result_loading";
  if (/결제를 처리하고 있어요|창을 닫지 말아 주세요/.test(normalizedMessage)) return "pg_processing";
  if (/정보를 확인하는 중이에요|이용권을 확인하는 중이에요|결제 가능 상태를 확인하고 있어요/.test(normalizedMessage)) return "access_check";
  if (variant === "subscription" || variant === "checkout" || variant === "confirm") return "pg_processing";
  if (variant === "payment-complete" || variant === "pass-applied" || variant === "unlock-saving") return "result_loading";
  return "access_check";
}

function resolvePaymentLoadingType(variant: PaymentLoadingVariant, message?: string): PaymentType {
  const normalizedMessage = String(message || "");
  if (/이용권을 확인하는 중이에요|이용권 확인|이용권을 확인했어요|30일 이용권으로/.test(normalizedMessage)) return "pass";
  if (/월정석|활성화되고/.test(normalizedMessage)) return "subscription";
  if (/단건|결제가 완료됐어요|결제를 처리하고 있어요/.test(normalizedMessage)) return "single";
  if (variant === "subscription" || variant === "monthly") return "subscription";
  if (variant === "pass-checking" || variant === "pass-applied") return "pass";
  return "single";
}

function isPaymentCompletionVariant(variant: PaymentLoadingVariant) {
  return variant === "payment-complete" || variant === "pass-applied";
}

const PaymentProcessingContext = createContext<PaymentProcessingContextValue | undefined>(
  undefined,
);

type PaymentOverlayWindow = Window & {
  _cdSetCoinGateOverlay?: (show: boolean, overlayMessage?: string, mode?: string) => void;
  __CD_REACT_PAYMENT_OVERLAY_OWNER__?: boolean;
};

function closeStaticPaymentOverlay() {
  if (typeof document === "undefined") return;
  const overlay = document.getElementById("sajuLoaderOverlay");
  if (!overlay) return;
  const staticOverlayOpen = overlay.getAttribute("aria-hidden") !== "true" || overlay.style.display === "flex";
  overlay.setAttribute("aria-hidden", "true");
  overlay.classList.remove("is-animating", "saju-loader-overlay--front");
  overlay.style.display = "none";
  overlay.style.visibility = "hidden";
  overlay.style.opacity = "";
  overlay.style.pointerEvents = "";
  overlay.style.zIndex = "";
  if (staticOverlayOpen && document.body) document.body.style.overflow = "";
}

function emitCoinGateOverlay(open: boolean, message?: string, mode?: string) {
  if (typeof window === "undefined") return;
  const overlayWindow = window as PaymentOverlayWindow;
  overlayWindow._cdSetCoinGateOverlay?.(open, message, mode);
}

function isExternalPaymentWindowStatus(status: PaidFeatureGateStatus) {
  return status === "paymentWindowOpen";
}

function paymentLoadingOwnsPaidFeatureStatus(status: PaidFeatureGateStatus) {
  return [
    "opening",
    "checkingEntitlement",
    "hasEntitlement",
    "loadingProducts",
    "paymentProcessing",
    "paymentSuccess",
    "paymentPreparing",
    "savingUnlock",
    "unlockSaving",
  ].includes(status);
}

// 월정석 aliases: monthly_credit, membership_credit, moonlight_stone, MONTHLY, 월정석은 모두 월정석으로 처리한다.
function isMonthlyPaidFeatureDetail(detail: PaidFeatureGateDetail) {
  const haystack = [
    detail.message,
    detail.paymentMode,
    detail.accessType,
    detail.accessMethod,
    detail.paymentMethod,
  ].map((value) => String(value || "").trim().toLowerCase()).filter(Boolean).join(" ");
  return /\b(monthly|monthly_credit|membership_credit|moonlight_stone|monthly_subscription)\b|월정석/.test(haystack);
}

function isPassPaidFeatureDetail(detail: PaidFeatureGateDetail) {
  const haystack = [
    detail.message,
    detail.paymentMode,
    detail.accessType,
    detail.accessMethod,
    detail.paymentMethod,
  ].map((value) => String(value || "").trim().toLowerCase()).filter(Boolean).join(" ");
  return /\b(pass|membership_pass|license_pass|subscription_pass|family_pass|usage_pass|pass_applied)\b|이용권 확인|이용권 적용|이용권으로/.test(haystack);
}

function resolvePaidFeatureStatusOverlay(status: PaidFeatureGateStatus, detail: PaidFeatureGateDetail | string = {}) {
  const resolvedDetail = typeof detail === "string" ? { message: detail } : detail;
  const message = String(resolvedDetail.message || "");
  if (status === "checkingEntitlement") {
    return { message: "보유한 30일 이용권으로 바로 열 수 있는지 확인 중입니다.", mode: "pass" };
  }
  if (status === "hasEntitlement") {
    if (isMonthlyPaidFeatureDetail(resolvedDetail)) {
      return { message: "월정석이 깃들고 있어요", mode: "payment-complete" };
    }
    return { message: message || "이용권 적용이 완료되었습니다.", mode: "pass-applied" };
  }
  if (status === "paymentSuccess") {
    if (isMonthlyPaidFeatureDetail(resolvedDetail)) {
      return { message: "월정석이 깃들고 있어요", mode: "payment-complete" };
    }
    if (isPassPaidFeatureDetail(resolvedDetail)) {
      return { message: "이용권 적용이 완료되었습니다.", mode: "pass-applied" };
    }
    return { message: message || "이용 권한 저장이 완료되었습니다.", mode: "payment-complete" };
  }
  if (status === "opening" || status === "loadingProducts") {
    if (isPassPaidFeatureDetail(resolvedDetail)) {
      return { message: "보유한 30일 이용권으로 바로 열 수 있는지 확인 중입니다.", mode: "pass" };
    }
    if (isMonthlyPaidFeatureDetail(resolvedDetail)) {
      return { message: message || "월정석 정보를 확인하는 중이에요", mode: "monthly" };
    }
    return { message: message || "결제 가능한 수단을 확인하고 있습니다.", mode: "checkout" };
  }
  if (status === "paymentProcessing") {
    return { message: message || "결제 승인과 이용 권한을 확인하고 있습니다.", mode: resolvePaymentLoadingVariant(message, "confirm") };
  }
  if (status === "paymentPreparing") {
    return { message: message || "단건 결제 준비 중\n주문 정보와 인증 흐름을 확인하고 있어요", mode: "checkout" };
  }
  if (status === "paymentWindowOpen") {
    return { message: message || "단건 결제 준비 중\n주문 정보와 인증 흐름을 확인하고 있어요", mode: "checkout" };
  }
  if (status === "savingUnlock" || status === "unlockSaving") {
    return { message: message || "잠금 해제 권한을 저장하고 있습니다.", mode: "unlock-saving" };
  }
  return { message, mode: resolvePaymentLoadingVariant(message) };
}

function nowForPaidGate() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function markPaidGate(name: string) {
  try {
    if (typeof performance !== "undefined" && typeof performance.mark === "function") {
      performance.mark(name);
    }
  } catch (_) {}
}

function resolvePaidGateFeature(detail: PaidFeatureGateDetail) {
  return String(detail.featureId || detail.featureKey || "paid-feature").trim() || "paid-feature";
}

function resolvePaidGateLocalizedCopy(status: PaidFeatureGateStatus, locale: LoadingLocale): PaidGateCopy {
  const koFallback = PAID_GATE_COPY[status] || PAID_GATE_COPY.checkingEntitlement;
  if (locale === "ko") return koFallback;

  const localized = PAID_GATE_LOCALIZED_COPY[locale]?.[status] || PAID_GATE_LOCALIZED_COPY.en[status];
  if (localized) return localized;

  const uiCopy = PAID_GATE_UI_COPY[locale] || PAID_GATE_UI_COPY.en;
  const loadingCopy =
    status === "paymentProcessing" || status === "paymentPreparing" || status === "paymentWindowOpen"
      ? resolveLoadingMessage("pg_processing", "single", locale)
      : status === "hasEntitlement" || status === "paymentSuccess" || status === "savingUnlock" || status === "unlockSaving"
        ? resolveLoadingMessage("result_loading", "pass", locale)
        : resolveLoadingMessage("access_check", "pass", locale);

  return {
    label: uiCopy.genericLabel,
    title: loadingCopy.title,
    message: loadingCopy.sub || loadingCopy.title,
  };
}

function resolvePaidGateDisplayText(value: string, fallback: string, locale: LoadingLocale) {
  const normalized = String(value || "").trim();
  if (!normalized) return fallback;
  if (locale !== "ko" && KOREAN_TEXT_PATTERN.test(normalized)) return fallback;
  return normalized;
}

function formatPaidGateCost(cost: number, locale: LoadingLocale) {
  const uiCopy = PAID_GATE_UI_COPY[locale] || PAID_GATE_UI_COPY.ko;
  const numberLocale = PAID_GATE_NUMBER_LOCALE[locale] || PAID_GATE_NUMBER_LOCALE.ko;
  const amount = Math.max(0, Math.floor(Number(cost || 0) * 100));
  return `${new Intl.NumberFormat(numberLocale).format(amount)}${uiCopy.costSuffix}`;
}

function resolvePaidGateCopy(state: PaidFeatureGateState, locale: LoadingLocale) {
  const fallback = PAID_GATE_COPY[state.status] || PAID_GATE_COPY.checkingEntitlement;
  const localized = resolvePaidGateLocalizedCopy(state.status, locale);
  return {
    label: localized.label,
    title: resolvePaidGateDisplayText(state.title, localized.title || fallback.title, locale),
    message: resolvePaidGateDisplayText(state.message, localized.message || fallback.message, locale),
  };
}

function PaidFeatureGateProvider({ children }: PaymentProcessingProviderProps) {
  const seqRef = useRef(0);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [locale, setLocale] = useState<LoadingLocale>("ko");
  const [loadingPhase, setLoadingPhase] = useState<LoadingMotionPhase>("fresh");
  const [state, setState] = useState<PaidFeatureGateState>({
    open: false,
    status: "idle",
    featureId: "",
    requestId: "",
    title: PAID_GATE_DEFAULT_TITLE,
    message: PAID_GATE_DEFAULT_MESSAGE,
    cost: null,
    seq: 0,
    startedAt: 0,
  });
  const showSkeleton = ["opening", "checkingEntitlement", "loadingProducts", "paymentPreparing", "paymentProcessing", "savingUnlock", "unlockSaving"].includes(state.status);

  const close = useCallback((requestId?: string) => {
    setState((prev) => {
      if (requestId && prev.requestId && requestId !== prev.requestId) return prev;
      return { ...prev, open: false, status: "idle", message: PAID_GATE_DEFAULT_MESSAGE };
    });
    emitCoinGateOverlay(false);
  }, []);

  const open = useCallback((detail: PaidFeatureGateDetail) => {
    const seq = seqRef.current + 1;
    seqRef.current = seq;
    const startedAt = Number.isFinite(Number(detail.startedAt)) ? Number(detail.startedAt) : nowForPaidGate();
    const featureId = resolvePaidGateFeature(detail);
    const status = detail.status || "checkingEntitlement";
    const activeLocale = getCurrentLoadingLocale();
    const copy = resolvePaidGateLocalizedCopy(status, activeLocale);
    setLocale(activeLocale);

    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (isExternalPaymentWindowStatus(status)) {
      setState((prev) => {
        if (!prev.open) return prev;
        return { ...prev, open: false, status: "idle", message: PAID_GATE_DEFAULT_MESSAGE };
      });
      emitCoinGateOverlay(false);
      return seq;
    }

    if (paymentLoadingOwnsPaidFeatureStatus(status)) {
      const overlay = resolvePaidFeatureStatusOverlay(status, { ...detail, message: detail.message || copy.message });
      setState((prev) => {
        if (!prev.open) return prev;
        return { ...prev, open: false, status: "idle", message: PAID_GATE_DEFAULT_MESSAGE };
      });
      emitCoinGateOverlay(true, overlay.message, overlay.mode);
      if (status === "hasEntitlement" || status === "paymentSuccess") {
        window.setTimeout(() => emitCoinGateOverlay(false), status === "hasEntitlement" ? 1600 : 1100);
      }
      return seq;
    }

    markPaidGate("cd-paid-feature-gate-open-call");
    setState((prev) => {
      if (prev.open && detail.requestId && prev.requestId === detail.requestId) {
        return {
          ...prev,
          status,
          title: detail.title || prev.title || copy.title,
          message: detail.message || copy.message,
          cost: Number.isFinite(Number(detail.cost)) ? Number(detail.cost) : prev.cost,
        };
      }
      return {
        open: true,
        status,
        featureId,
        requestId: String(detail.requestId || `${featureId}:${seq}`),
        title: detail.title || copy.title,
        message: detail.message || copy.message,
        cost: Number.isFinite(Number(detail.cost)) ? Number(detail.cost) : null,
        seq,
        startedAt,
      };
    });

    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        markPaidGate("cd-paid-feature-gate-first-frame");
        try {
          const elapsed = Math.round(nowForPaidGate() - startedAt);
          if (elapsed > 100) {
            console.warn("[paid-feature-gate] first frame exceeded 100ms", { featureId, elapsed });
          }
        } catch (_) {}
      });
    }
    emitCoinGateOverlay(false);
    return seq;
  }, []);

  const update = useCallback((detail: PaidFeatureGateDetail) => {
    const requestedStatus = detail.status || "checkingEntitlement";
    const activeLocale = getCurrentLoadingLocale();
    setLocale(activeLocale);
    if (isExternalPaymentWindowStatus(requestedStatus)) {
      setState((prev) => {
        if (detail.requestId && prev.requestId && detail.requestId !== prev.requestId) return prev;
        if (!prev.open) return prev;
        return { ...prev, open: false, status: "idle", message: PAID_GATE_DEFAULT_MESSAGE };
      });
      emitCoinGateOverlay(false);
      return;
    }

    if (paymentLoadingOwnsPaidFeatureStatus(requestedStatus)) {
      const overlay = resolvePaidFeatureStatusOverlay(
        requestedStatus,
        {
          ...detail,
          message: detail.message || resolvePaidGateLocalizedCopy(detail.status || "checkingEntitlement", activeLocale).message || PAID_GATE_DEFAULT_MESSAGE,
        },
      );
      setState((prev) => {
        if (detail.requestId && prev.requestId && detail.requestId !== prev.requestId) return prev;
        if (!prev.open) return prev;
        return { ...prev, open: false, status: "idle", message: PAID_GATE_DEFAULT_MESSAGE };
      });
      emitCoinGateOverlay(true, overlay.message, overlay.mode);
      if (requestedStatus === "hasEntitlement" || requestedStatus === "paymentSuccess") {
        window.setTimeout(() => emitCoinGateOverlay(false), requestedStatus === "hasEntitlement" ? 1600 : 1100);
      }
      return;
    }

    setState((prev) => {
      if (detail.requestId && prev.requestId && detail.requestId !== prev.requestId) return prev;
      const status = detail.status || prev.status;
      const copy = resolvePaidGateLocalizedCopy(status, activeLocale);
      if (!prev.open) {
        return {
          open: true,
          status,
          featureId: detail.featureId || detail.featureKey || prev.featureId || "paid-feature",
          requestId: String(detail.requestId || prev.requestId || `paid-feature:${Date.now().toString(36)}`),
          title: detail.title || copy.title,
          message: detail.message || copy.message,
          cost: Number.isFinite(Number(detail.cost)) ? Number(detail.cost) : null,
          seq: prev.seq + 1,
          startedAt: nowForPaidGate(),
        };
      }
      return {
        ...prev,
        status,
        featureId: detail.featureId || detail.featureKey || prev.featureId,
        title: detail.title || prev.title || copy.title,
        message: detail.message || copy.message,
        cost: Number.isFinite(Number(detail.cost)) ? Number(detail.cost) : prev.cost,
      };
    });
    emitCoinGateOverlay(false);
  }, []);

  const preload = useCallback(() => {
    markPaidGate("cd-paid-feature-gate-preload");
  }, []);

  useEffect(() => {
    if (!state.open) return;
    if (!["hasEntitlement", "paymentSuccess"].includes(state.status)) return;
    closeTimerRef.current = setTimeout(() => close(state.requestId), state.status === "hasEntitlement" ? 1600 : 1100);
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [close, state.open, state.requestId, state.status]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!state.open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [state.open]);

  useEffect(() => {
    if (!state.open || !showSkeleton) {
      setLoadingPhase("fresh");
      return;
    }

    setLoadingPhase("fresh");
    const warmTimer = window.setTimeout(() => setLoadingPhase("warming"), 8000);
    const slowTimer = window.setTimeout(() => setLoadingPhase("slow"), 20000);

    return () => {
      window.clearTimeout(warmTimer);
      window.clearTimeout(slowTimer);
    };
  }, [showSkeleton, state.open, state.status]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    type PaidGateWindow = Window & {
      __cdPaidFeatureGate?: {
        open: (detail: PaidFeatureGateDetail) => number;
        update: (detail: PaidFeatureGateDetail) => void;
        close: (requestId?: string) => void;
        preload: () => void;
      };
    };
    const runtimeWindow = window as PaidGateWindow;
    runtimeWindow.__cdPaidFeatureGate = { open, update, close, preload };

    const onGateEvent = (event: Event) => {
      const detail = (event as CustomEvent<PaidFeatureGateDetail & { action?: string }>).detail || {};
      if (detail.action === "close") {
        close(detail.requestId);
        return;
      }
      if (detail.action === "update") {
        update(detail);
        return;
      }
      open(detail);
    };

    window.addEventListener("cd:paid-feature-gate", onGateEvent);
    return () => {
      window.removeEventListener("cd:paid-feature-gate", onGateEvent);
      if (runtimeWindow.__cdPaidFeatureGate?.open === open) {
        delete runtimeWindow.__cdPaidFeatureGate;
      }
    };
  }, [close, open, preload, update]);

  const contextValue = useMemo(() => ({ state, open, update, close, preload }), [close, open, preload, state, update]);
  const copy = resolvePaidGateCopy(state, locale);
  const gateUiCopy = PAID_GATE_UI_COPY[locale] || PAID_GATE_UI_COPY.ko;
  const gateMotionTone: LoadingMotionTone =
    state.status === "paymentProcessing" || state.status === "paymentPreparing" || state.status === "paymentWindowOpen"
      ? "payment"
      : state.status === "hasEntitlement" || state.status === "paymentSuccess" || state.status === "savingUnlock" || state.status === "unlockSaving"
        ? "result"
        : "pass";
  const showPayAction = state.status === "readyToPay" || state.status === "noEntitlement" || state.status === "paymentFailed" || state.status === "cancelled";

  return (
    <PaidFeatureGateContext.Provider value={contextValue}>
      {children}
      {state.open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-live="polite"
          data-paid-feature-gate-status={state.status}
          data-loading-phase={loadingPhase}
          className="fixed inset-0 z-[2147483002] flex items-end justify-center bg-[linear-gradient(180deg,rgba(3,6,18,.50),rgba(2,6,23,.72))] px-0 backdrop-blur-[14px] sm:items-center sm:px-4"
        >
          <div className="w-full rounded-t-[8px] border border-white/20 bg-[radial-gradient(circle_at_82%_10%,rgba(254,240,138,.16),transparent_32%),linear-gradient(145deg,rgba(15,23,42,.82),rgba(30,41,59,.68))] p-5 text-white shadow-[0_26px_90px_rgba(2,6,23,.58),inset_0_1px_0_rgba(255,255,255,.18)] backdrop-blur-[22px] sm:max-w-[440px] sm:rounded-[8px] sm:p-6">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20 sm:hidden" />
            <div className="relative mx-auto mb-4 h-24 w-24 rounded-full shadow-[0_0_34px_rgba(251,191,36,.18)] isolate">
              <span className="absolute -inset-4 rounded-full border border-white/10 motion-safe:animate-spin motion-reduce:animate-none" style={{ animationDuration: "12s" }} />
              <span
                className="absolute inset-2 rounded-full border border-cyan-200/20 border-t-amber-200/80 motion-safe:animate-spin motion-reduce:animate-none"
                style={{ animationDirection: "reverse", animationDuration: "4.2s" }}
              />
              <span className="absolute -inset-3 rounded-full bg-[radial-gradient(circle,rgba(254,243,199,.36),transparent_62%)] blur-[1px]" />
              <div
                className="relative h-full w-full bg-contain bg-center bg-no-repeat drop-shadow-[0_14px_22px_rgba(86,47,21,.2)]"
                style={{
                  backgroundImage: `url("${KKULKKUL_PAYMENT_LOGO_URL}")`,
                }}
              />
            </div>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-cyan-200/80">{copy.label}</p>
                <h2 className="m-0 text-[22px] font-black leading-[1.24] tracking-normal text-white">{copy.title}</h2>
              </div>
              <button
                type="button"
                aria-label={gateUiCopy.closeLabel}
                onClick={() => close(state.requestId)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 text-lg font-bold text-white/80"
              >
                ×
              </button>
            </div>
            <p className="whitespace-pre-line text-sm leading-[1.7] text-slate-200/90">{copy.message}</p>
            {showSkeleton ? (
              <LoadingProgressMotion
                phase={loadingPhase}
                tone={gateMotionTone}
                label={gateUiCopy.progressLabel}
                labels={gateUiCopy.progressSteps}
              />
            ) : null}
            {state.cost !== null ? (
              <p className="mt-3 inline-flex rounded-full border border-amber-200/30 bg-amber-300/10 px-3 py-1 text-xs font-extrabold text-amber-100">
                {gateUiCopy.costPrefix} {formatPaidGateCost(state.cost, locale)}
              </p>
            ) : null}
            {showSkeleton ? (
              <div className="mt-5 grid gap-[9px]">
                <span className="h-3 w-full animate-pulse rounded-full bg-white/10" />
                <span className="h-3 w-[82%] animate-pulse rounded-full bg-white/10" />
                <span className="h-3 w-[64%] animate-pulse rounded-full bg-white/10" />
              </div>
            ) : null}
            {showPayAction ? (
              <button
                type="button"
                onClick={() => {
                  window.location.href = `/points?feature=${encodeURIComponent(state.featureId)}`;
                }}
                className="mt-5 min-h-12 w-full rounded-[8px] bg-amber-100 px-4 text-sm font-black text-slate-950"
              >
                {gateUiCopy.payAction}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </PaidFeatureGateContext.Provider>
  );
}

export function PaymentProcessingProvider({
  children,
}: PaymentProcessingProviderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingVariant, setProcessingVariant] = useState<PaymentLoadingVariant>("payment");
  const processingVariantRef = useRef<PaymentLoadingVariant>("payment");
  const overlayStateRef = useRef({ open: false, message: "", mode: "" });
  const completionCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [processingMessage, setProcessingMessageState] = useState(
    DEFAULT_PROCESSING_MESSAGE,
  );

  const setPaymentLoadingVariant = useCallback((variant: PaymentLoadingVariant) => {
    processingVariantRef.current = variant;
    setProcessingVariant(variant);
  }, []);

  const clearCompletionCloseTimer = useCallback(() => {
    if (completionCloseTimerRef.current) {
      clearTimeout(completionCloseTimerRef.current);
      completionCloseTimerRef.current = null;
    }
  }, []);

  const closeProcessingNow = useCallback(() => {
    clearCompletionCloseTimer();
    overlayStateRef.current = { open: false, message: "", mode: "" };
    setIsProcessing(false);
    setPaymentLoadingVariant("payment");
    setProcessingMessageState(DEFAULT_PROCESSING_MESSAGE);
  }, [clearCompletionCloseTimer, setPaymentLoadingVariant]);

  const startProcessing = useCallback((message?: string, variant?: PaymentLoadingVariant) => {
    clearCompletionCloseTimer();
    if (typeof message === "string" && message.trim()) {
      setProcessingMessageState(message);
    }
    setPaymentLoadingVariant(variant || resolvePaymentLoadingVariant(message));
    setIsProcessing(true);
  }, [clearCompletionCloseTimer, setPaymentLoadingVariant]);

  const stopProcessing = useCallback(() => {
    if (isPaymentCompletionVariant(processingVariantRef.current) && typeof window !== "undefined") {
      clearCompletionCloseTimer();
      completionCloseTimerRef.current = setTimeout(() => {
        closeProcessingNow();
      }, processingVariantRef.current === "pass-applied" ? 1600 : 1100);
      return;
    }
    closeProcessingNow();
  }, [clearCompletionCloseTimer, closeProcessingNow]);

  const setProcessingMessage = useCallback((message: string) => {
    if (!message || !message.trim()) {
      setProcessingMessageState(DEFAULT_PROCESSING_MESSAGE);
      setPaymentLoadingVariant("payment");
      return;
    }
    setProcessingMessageState(message);
    setPaymentLoadingVariant(resolvePaymentLoadingVariant(message));
  }, [setPaymentLoadingVariant]);

  useEffect(() => {
    return () => clearCompletionCloseTimer();
  }, [clearCompletionCloseTimer]);

  const applyReactPaymentOverlay = useCallback((show: boolean, message?: string, mode?: string) => {
    const nextMessage = String(message || "").trim() || DEFAULT_PROCESSING_MESSAGE;
    const nextMode = String(mode || "").trim();
    const previous = overlayStateRef.current;
    if (show) {
      if (previous.open && previous.message === nextMessage && previous.mode === nextMode) return;
      overlayStateRef.current = { open: true, message: nextMessage, mode: nextMode };
      closeStaticPaymentOverlay();
      clearCompletionCloseTimer();
      const nextVariant = resolvePaymentLoadingVariant(nextMessage, nextMode);
      setPaymentLoadingVariant(nextVariant);
      setProcessingMessageState(nextMessage);
      setIsProcessing(true);
      return;
    }
    if (!previous.open) {
      closeProcessingNow();
      return;
    }
    stopProcessing();
  }, [clearCompletionCloseTimer, closeProcessingNow, setPaymentLoadingVariant, stopProcessing]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const overlayWindow = window as PaymentOverlayWindow;
    const previousOverlay = overlayWindow._cdSetCoinGateOverlay;
    const onPaymentLoadingState = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean; message?: string; mode?: string }>).detail || {};
      applyReactPaymentOverlay(Boolean(detail.open), detail.message, detail.mode);
    };
    overlayWindow.__CD_REACT_PAYMENT_OVERLAY_OWNER__ = true;
    closeStaticPaymentOverlay();
    overlayWindow._cdSetCoinGateOverlay = applyReactPaymentOverlay;
    window.addEventListener("cd:payment-loading-state", onPaymentLoadingState);
    return () => {
      window.removeEventListener("cd:payment-loading-state", onPaymentLoadingState);
      if (overlayWindow._cdSetCoinGateOverlay === applyReactPaymentOverlay) {
        overlayWindow._cdSetCoinGateOverlay = previousOverlay;
      }
      if (overlayWindow.__CD_REACT_PAYMENT_OVERLAY_OWNER__) {
        delete overlayWindow.__CD_REACT_PAYMENT_OVERLAY_OWNER__;
      }
    };
  }, [applyReactPaymentOverlay]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const runtimeWindow = window as unknown as Record<string, unknown>;
    runtimeWindow.__CD_PAYMENT_PROCESSING__ = isProcessing;

    if (document?.body) {
      if (isProcessing) {
        document.body.dataset.cdVersionGuardBusy = "1";
      } else {
        delete document.body.dataset.cdVersionGuardBusy;
      }
    }

    window.dispatchEvent(new CustomEvent("cd:critical-operation-state", {
      detail: {
        isPaymentProcessing: isProcessing,
      },
    }));

    return () => {
      runtimeWindow.__CD_PAYMENT_PROCESSING__ = false;
      if (document?.body) {
        delete document.body.dataset.cdVersionGuardBusy;
      }
    };
  }, [isProcessing]);

  useEffect(() => {
    if (!isProcessing || typeof window === "undefined") return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isProcessing]);

  const value = useMemo(
    () => ({
      isProcessing,
      isPaymentLoading: isProcessing,
      processingMessage,
      startProcessing,
      stopProcessing,
      setProcessingMessage,
      startPayment: startProcessing,
      endPayment: stopProcessing,
      setPaymentMessage: setProcessingMessage,
    }),
    [
      isProcessing,
      processingMessage,
      startProcessing,
      stopProcessing,
      setProcessingMessage,
    ],
  );

  return (
    <PaymentProcessingContext.Provider value={value}>
      {children}
      <PaymentLoading
        open={isProcessing}
        variant={processingVariant}
        stage={resolvePaymentLoadingStage(processingVariant, processingMessage)}
        paymentType={resolvePaymentLoadingType(processingVariant, processingMessage)}
        statusMessage={processingMessage}
      />
    </PaymentProcessingContext.Provider>
  );
}

export function usePaymentProcessing() {
  const context = useContext(PaymentProcessingContext);
  if (!context) {
    throw new Error("usePaymentProcessing must be used within PaymentProcessingProvider");
  }
  return context;
}

export const usePayment = usePaymentProcessing;

export function usePaidFeatureGate() {
  const context = useContext(PaidFeatureGateContext);
  if (!context) {
    throw new Error("usePaidFeatureGate must be used within PaidFeatureGateProvider");
  }
  return context;
}
