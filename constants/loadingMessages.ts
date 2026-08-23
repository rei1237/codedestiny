export const LOADING_MESSAGES = {
  pg_processing: {
    subscription: { title: "연이의 월정석 · 결제를 처리하고 있어요", sub: "잠시만 기다려 주세요" },
    single: { title: "결제를 처리하고 있어요", sub: "창을 닫지 말아 주세요" },
    pass: { title: "이용권 적용을 확인하고 있어요", sub: "잠시만 기다려 주세요" },
  },
  result_loading: {
    subscription: { title: "연이의 월정석 · 깃들고 있어요", sub: "곧 이용 가능해져요" },
    single: { title: "결제가 완료됐어요", sub: "달의 인도자가 결과를 불러오는 중이에요" },
    pass: { title: "이용권을 확인했어요", sub: "결과를 불러오는 중이에요" },
  },
  access_check: {
    subscription: { title: "연이의 월정석 · 정보를 확인하는 중이에요", sub: "안전하게 접근 권한을 맞춰보고 있어요" },
    single: { title: "단건으로 카드 결제를 준비 중이에요", sub: "결제 가능 여부를 살피고 있어요" },
    pass: { title: "이용권을 확인하는 중이에요", sub: "이용 가능 여부를 살피고 있어요" },
  },
} as const;

export type LoadingStage = keyof typeof LOADING_MESSAGES;
export type PaymentType = "subscription" | "single" | "pass";
export type LoadingLocale = "ko" | "en" | "ja" | "zh-CN" | "zh-TW" | "vi" | "hi" | "es" | "fr" | "de" | "nl" | "ms";

/**
 * `Intl.NumberFormat`/`toLocaleDateString` 등에 넘길 BCP-47 로케일.
 * `app/components/PaymentProcessingContext.tsx`(`PAID_GATE_NUMBER_LOCALE`)·`app/points/PointsClient.tsx`·
 * `app/points/history/PointHistoryClient.tsx`(둘 다 `FORMAT_LOCALE_BY_LANG`)가 이미 각자 이 표를
 * 복제해 두고 있었다 — 새로 `Intl` 포맷을 로케일화하는 곳은 그 셋을 또 복제하지 말고 이 표를 쓴다.
 */
export const INTL_LOCALE_BY_LOADING_LOCALE: Record<LoadingLocale, string> = {
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

type LoadingMessage = { title: string; sub: string };
type LoadingMessageMap = Record<LoadingStage, Record<PaymentType, LoadingMessage>>;

export const FALLBACK_LOADING_MESSAGE = {
  title: "처리 중이에요",
  sub: "잠시만 기다려 주세요",
} as const;

const LOCALIZED_LOADING_MESSAGES: Record<Exclude<LoadingLocale, "ko">, LoadingMessageMap> = {
  en: {
    pg_processing: {
      subscription: { title: "Processing your moonstone payment", sub: "Please stay with us for a moment" },
      single: { title: "Processing your payment", sub: "Please do not close this window" },
      pass: { title: "Checking your pass access", sub: "Please stay with us for a moment" },
    },
    result_loading: {
      subscription: { title: "Moonstone access is opening", sub: "You will be able to enter soon" },
      single: { title: "Payment is complete", sub: "Loading your result" },
      pass: { title: "Your pass has been confirmed", sub: "Loading your result" },
    },
    access_check: {
      subscription: { title: "Checking moonstone access", sub: "Confirming your access safely" },
      single: { title: "Preparing your card payment", sub: "Confirming whether payment can continue" },
      pass: { title: "Checking your pass", sub: "Confirming whether your pass can be used" },
    },
  },
  ja: {
    pg_processing: {
      subscription: { title: "月光石のお支払いを処理しています", sub: "少しだけお待ちください" },
      single: { title: "お支払いを処理しています", sub: "この画面を閉じずにお待ちください" },
      pass: { title: "利用券の適用を確認しています", sub: "少しだけお待ちください" },
    },
    result_loading: {
      subscription: { title: "月光石がそっと灯っています", sub: "まもなくご利用いただけます" },
      single: { title: "お支払いが完了しました", sub: "結果を読み込んでいます" },
      pass: { title: "利用券を確認しました", sub: "結果を読み込んでいます" },
    },
    access_check: {
      subscription: { title: "月光石の情報を確認しています", sub: "安全にご利用状況を確認しています" },
      single: { title: "カード決済を準備しています", sub: "お支払いに進めるか確認しています" },
      pass: { title: "利用券を確認しています", sub: "利用券を使えるか確認しています" },
    },
  },
  "zh-CN": {
    pg_processing: {
      subscription: { title: "正在处理月光石支付", sub: "请稍候" },
      single: { title: "正在处理支付", sub: "请不要关闭窗口" },
      pass: { title: "正在确认通行券权限", sub: "请稍候" },
    },
    result_loading: {
      subscription: { title: "月光石正在点亮", sub: "即将可以使用" },
      single: { title: "支付已完成", sub: "正在载入结果" },
      pass: { title: "已确认通行券", sub: "正在载入结果" },
    },
    access_check: {
      subscription: { title: "正在确认月光石信息", sub: "正在安全确认使用权限" },
      single: { title: "正在准备银行卡支付", sub: "正在确认是否可以继续支付" },
      pass: { title: "正在确认通行券", sub: "正在确认通行券是否可用" },
    },
  },
  "zh-TW": {
    pg_processing: {
      subscription: { title: "正在處理月光石付款", sub: "請稍候" },
      single: { title: "正在處理付款", sub: "請不要關閉視窗" },
      pass: { title: "正在確認通行券權限", sub: "請稍候" },
    },
    result_loading: {
      subscription: { title: "月光石正在點亮", sub: "即將可以使用" },
      single: { title: "付款已完成", sub: "正在載入結果" },
      pass: { title: "已確認通行券", sub: "正在載入結果" },
    },
    access_check: {
      subscription: { title: "正在確認月光石資訊", sub: "正在安全確認使用權限" },
      single: { title: "正在準備信用卡付款", sub: "正在確認是否可以繼續付款" },
      pass: { title: "正在確認通行券", sub: "正在確認通行券是否可用" },
    },
  },
  vi: {
    pg_processing: {
      subscription: { title: "Đang xử lý thanh toán đá trăng", sub: "Xin chờ trong giây lát" },
      single: { title: "Đang xử lý thanh toán", sub: "Vui lòng không đóng cửa sổ" },
      pass: { title: "Đang kiểm tra quyền dùng vé", sub: "Xin chờ trong giây lát" },
    },
    result_loading: {
      subscription: { title: "Đá trăng đang được thắp sáng", sub: "Bạn sẽ dùng được ngay sau đây" },
      single: { title: "Thanh toán đã hoàn tất", sub: "Đang tải kết quả" },
      pass: { title: "Đã xác nhận vé sử dụng", sub: "Đang tải kết quả" },
    },
    access_check: {
      subscription: { title: "Đang kiểm tra thông tin đá trăng", sub: "Đang xác nhận quyền truy cập an toàn" },
      single: { title: "Đang chuẩn bị thanh toán bằng thẻ", sub: "Đang xác nhận có thể tiếp tục thanh toán" },
      pass: { title: "Đang kiểm tra vé sử dụng", sub: "Đang xác nhận vé có thể dùng được" },
    },
  },
  hi: {
    pg_processing: {
      subscription: { title: "मूनस्टोन भुगतान संसाधित हो रहा है", sub: "कृपया थोड़ी देर प्रतीक्षा करें" },
      single: { title: "भुगतान संसाधित हो रहा है", sub: "कृपया यह विंडो बंद न करें" },
      pass: { title: "पास की अनुमति जाँची जा रही है", sub: "कृपया थोड़ी देर प्रतीक्षा करें" },
    },
    result_loading: {
      subscription: { title: "मूनस्टोन पहुँच खुल रही है", sub: "आप जल्द ही उपयोग कर सकेंगे" },
      single: { title: "भुगतान पूरा हो गया", sub: "आपका परिणाम लोड हो रहा है" },
      pass: { title: "आपका पास पुष्टि हो गया", sub: "आपका परिणाम लोड हो रहा है" },
    },
    access_check: {
      subscription: { title: "मूनस्टोन जानकारी जाँची जा रही है", sub: "आपकी पहुँच सुरक्षित रूप से पुष्टि की जा रही है" },
      single: { title: "आपका कार्ड भुगतान तैयार किया जा रहा है", sub: "भुगतान जारी रह सकता है या नहीं, यह देखा जा रहा है" },
      pass: { title: "पास जाँचा जा रहा है", sub: "पास इस्तेमाल हो सकता है या नहीं, यह देखा जा रहा है" },
    },
  },
  es: {
    pg_processing: {
      subscription: { title: "Procesando el pago con piedra lunar", sub: "Espera un momento" },
      single: { title: "Procesando el pago", sub: "No cierres esta ventana" },
      pass: { title: "Comprobando tu pase", sub: "Espera un momento" },
    },
    result_loading: {
      subscription: { title: "La piedra lunar se está activando", sub: "Podrás entrar en breve" },
      single: { title: "Pago completado", sub: "Cargando tu resultado" },
      pass: { title: "Pase confirmado", sub: "Cargando tu resultado" },
    },
    access_check: {
      subscription: { title: "Comprobando la piedra lunar", sub: "Confirmando tu acceso de forma segura" },
      single: { title: "Preparando tu pago con tarjeta", sub: "Confirmando si el pago puede continuar" },
      pass: { title: "Comprobando tu pase", sub: "Confirmando si tu pase puede usarse" },
    },
  },
  fr: {
    pg_processing: {
      subscription: { title: "Traitement du paiement pierre de lune", sub: "Veuillez patienter un instant" },
      single: { title: "Traitement du paiement", sub: "Ne fermez pas cette fenêtre" },
      pass: { title: "Vérification de votre pass", sub: "Veuillez patienter un instant" },
    },
    result_loading: {
      subscription: { title: "La pierre de lune s'allume", sub: "L'accès sera bientôt disponible" },
      single: { title: "Paiement terminé", sub: "Chargement du résultat" },
      pass: { title: "Votre pass est confirmé", sub: "Chargement du résultat" },
    },
    access_check: {
      subscription: { title: "Vérification de la pierre de lune", sub: "Confirmation sécurisée de votre accès" },
      single: { title: "Préparation de votre paiement par carte", sub: "Confirmation de la poursuite du paiement" },
      pass: { title: "Vérification du pass", sub: "Confirmation de l'utilisation du pass" },
    },
  },
  de: {
    pg_processing: {
      subscription: { title: "Mondstein-Zahlung wird verarbeitet", sub: "Bitte einen Moment warten" },
      single: { title: "Zahlung wird verarbeitet", sub: "Bitte dieses Fenster nicht schließen" },
      pass: { title: "Pass-Zugang wird geprüft", sub: "Bitte einen Moment warten" },
    },
    result_loading: {
      subscription: { title: "Mondstein-Zugang öffnet sich", sub: "Du kannst ihn gleich nutzen" },
      single: { title: "Zahlung abgeschlossen", sub: "Ergebnis wird geladen" },
      pass: { title: "Pass bestätigt", sub: "Ergebnis wird geladen" },
    },
    access_check: {
      subscription: { title: "Mondstein-Information wird geprüft", sub: "Dein Zugang wird sicher bestätigt" },
      single: { title: "Kartenzahlung wird vorbereitet", sub: "Es wird bestätigt, ob die Zahlung fortgesetzt werden kann" },
      pass: { title: "Pass wird geprüft", sub: "Es wird bestätigt, ob dein Pass genutzt werden kann" },
    },
  },
  nl: {
    pg_processing: {
      subscription: { title: "Maansteenbetaling wordt verwerkt", sub: "Wacht heel even" },
      single: { title: "Betaling wordt verwerkt", sub: "Sluit dit venster niet" },
      pass: { title: "Je pas wordt gecontroleerd", sub: "Wacht heel even" },
    },
    result_loading: {
      subscription: { title: "Maansteen-toegang opent", sub: "Je kunt zo verder" },
      single: { title: "Betaling voltooid", sub: "Resultaat wordt geladen" },
      pass: { title: "Je pas is bevestigd", sub: "Resultaat wordt geladen" },
    },
    access_check: {
      subscription: { title: "Maansteeninformatie wordt gecontroleerd", sub: "Je toegang wordt veilig bevestigd" },
      single: { title: "Kaartbetaling wordt voorbereid", sub: "We bevestigen of de betaling kan doorgaan" },
      pass: { title: "Pas wordt gecontroleerd", sub: "We bevestigen of je pas kan worden gebruikt" },
    },
  },
  ms: {
    pg_processing: {
      subscription: { title: "Memproses bayaran batu bulan", sub: "Sila tunggu sebentar" },
      single: { title: "Memproses bayaran", sub: "Sila jangan tutup tetingkap ini" },
      pass: { title: "Menyemak akses pas", sub: "Sila tunggu sebentar" },
    },
    result_loading: {
      subscription: { title: "Akses batu bulan sedang terbuka", sub: "Anda boleh menggunakannya sebentar lagi" },
      single: { title: "Bayaran selesai", sub: "Memuatkan keputusan" },
      pass: { title: "Pas anda telah disahkan", sub: "Memuatkan keputusan" },
    },
    access_check: {
      subscription: { title: "Menyemak maklumat batu bulan", sub: "Akses anda sedang disahkan dengan selamat" },
      single: { title: "Menyediakan pembayaran kad anda", sub: "Mengesahkan sama ada bayaran boleh diteruskan" },
      pass: { title: "Menyemak pas", sub: "Mengesahkan sama ada pas anda boleh digunakan" },
    },
  },
};

export function normalizeLoadingLocale(value?: string | null): LoadingLocale {
  const normalized = String(value || "").trim().replace("_", "-").toLowerCase();
  if (normalized === "zh" || normalized === "zh-cn" || normalized === "zh-hans") return "zh-CN";
  if (normalized === "zh-tw" || normalized === "zh-hant" || normalized === "zh-hk" || normalized === "zh-mo") return "zh-TW";
  if (normalized === "vi-vn") return "vi";
  return (["ko", "en", "ja", "vi", "hi", "es", "fr", "de", "nl", "ms"] as LoadingLocale[]).find((locale) => locale.toLowerCase() === normalized) || "ko";
}

export function getCurrentLoadingLocale(): LoadingLocale {
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

export function resolveLoadingMessage(stage?: LoadingStage, paymentType?: PaymentType, locale?: LoadingLocale | string | null) {
  const activeLocale = normalizeLoadingLocale(locale || "ko");
  const messages = activeLocale === "ko" ? LOADING_MESSAGES : LOCALIZED_LOADING_MESSAGES[activeLocale];
  if (!stage || !paymentType) return activeLocale === "ko" ? FALLBACK_LOADING_MESSAGE : (LOCALIZED_FALLBACK_LOADING_MESSAGE[activeLocale] || FALLBACK_LOADING_MESSAGE);
  return messages?.[stage]?.[paymentType] ?? (activeLocale === "ko" ? FALLBACK_LOADING_MESSAGE : (LOCALIZED_FALLBACK_LOADING_MESSAGE[activeLocale] || FALLBACK_LOADING_MESSAGE));
}

const LOCALIZED_FALLBACK_LOADING_MESSAGE: Record<Exclude<LoadingLocale, "ko">, LoadingMessage> = {
  en: { title: "Processing", sub: "Please stay with us for a moment" },
  ja: { title: "処理しています", sub: "少しだけお待ちください" },
  "zh-CN": { title: "正在处理", sub: "请稍候" },
  "zh-TW": { title: "正在處理", sub: "請稍候" },
  vi: { title: "Đang xử lý", sub: "Xin chờ trong giây lát" },
  hi: { title: "प्रक्रिया जारी है", sub: "कृपया थोड़ी देर प्रतीक्षा करें" },
  es: { title: "Procesando", sub: "Espera un momento" },
  fr: { title: "Traitement en cours", sub: "Veuillez patienter un instant" },
  de: { title: "Verarbeitung läuft", sub: "Bitte einen Moment warten" },
  nl: { title: "Bezig met verwerken", sub: "Wacht heel even" },
  ms: { title: "Sedang diproses", sub: "Sila tunggu sebentar" },
};
