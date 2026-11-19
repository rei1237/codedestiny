import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

// 2026-11-19 다시 시도 우선(웹 전용): 생성 실패는 바로 환불하지 않고, 같은 결제 건으로 남은 부분을 무료로 다시 쓴다.
// 기한(일수)·날짜는 약속하지 않는다 — 기한이 지나면 서버가 알아서 환불로 닫는다. 버튼은 상담 id 만 보내고
// 결제·코인 게이트·/points 로 보내지 않는다. 토스 미니앱은 이 흐름을 쓰지 않는다(서버도 409 로 막는다).
export type LoveSecretRetryCopy = {
  offer: string;
  retryLabel: string;
  retryStarted: string;
  retryFailed: string;
  refundRequestLabel: string;
  refundRequested: string;
  refunded: string;
  refundRequestFailed: string;
  refundClosed: string;
};

const EN: LoveSecretRetryCopy = {
  offer: "We couldn't finish part of your love strategy reading. We'll keep what is already written and rewrite only the rest. There is no extra charge or deduction.",
  retryLabel: "Try again · no extra charge",
  retryStarted: "Rewriting the unfinished part. There is no extra charge or deduction.",
  retryFailed: "We couldn't start the retry. Please tap again in a moment. There is no extra charge or deduction.",
  refundRequestLabel: "Request a refund instead",
  refundRequested: "We received your refund request. Your pass or payment will be returned once it is processed.",
  refunded: "Your pass or payment has been returned.",
  refundRequestFailed: "We couldn't send your refund request. Please tap again in a moment.",
  refundClosed: "This reading is being refunded. Your pass or payment will be returned once it is processed.",
};

export const LOVE_SECRET_RETRY_COPY: Record<LoadingLocale, LoveSecretRetryCopy> = {
  ko: {
    offer: "연애 비책 상담문 일부를 완성하지 못했어요. 이미 쓴 내용은 그대로 두고 남은 부분만 다시 써 드려요. 추가 결제·차감은 없어요.",
    retryLabel: "다시 시도 · 추가 결제·차감 없음",
    retryStarted: "남은 부분을 다시 쓰고 있어요. 추가 결제·차감은 없어요.",
    retryFailed: "다시 시도를 시작하지 못했어요. 잠시 뒤 다시 눌러 주세요. 추가 결제·차감은 없어요.",
    refundRequestLabel: "다시 시도 대신 환불 요청",
    refundRequested: "환불 요청을 받았습니다. 처리가 끝나면 이용권과 결제가 되돌아갑니다.",
    refunded: "이용권과 결제를 되돌려 드렸습니다.",
    refundRequestFailed: "환불 요청을 전하지 못했습니다. 잠시 뒤 다시 눌러 주세요.",
    refundClosed: "이 상담은 환불로 처리되고 있어요. 처리가 끝나면 이용권과 결제가 되돌아갑니다.",
  },
  en: EN,
  ja: {
    offer: "恋愛秘策の鑑定文の一部を完成できませんでした。書き終えた内容はそのままに、残りの部分だけを書き直します。追加の支払い・差し引きはありません。",
    retryLabel: "もう一度試す · 追加料金なし",
    retryStarted: "残りの部分を書き直しています。追加の支払い・差し引きはありません。",
    retryFailed: "再試行を開始できませんでした。少ししてからもう一度押してください。追加の支払い・差し引きはありません。",
    refundRequestLabel: "再試行の代わりに返金を申請",
    refundRequested: "返金申請を受け付けました。処理が終わると利用券とお支払いが戻ります。",
    refunded: "利用券とお支払いをお戻ししました。",
    refundRequestFailed: "返金申請を送れませんでした。少ししてからもう一度押してください。",
    refundClosed: "この鑑定は返金処理中です。処理が終わると利用券とお支払いが戻ります。",
  },
  "zh-CN": {
    offer: "恋爱秘策解读有一部分未能完成。已写好的内容会保留，只重写剩余部分。不会额外收费或扣除。",
    retryLabel: "重试 · 不额外收费",
    retryStarted: "正在重写剩余部分。不会额外收费或扣除。",
    retryFailed: "未能开始重试。请稍后再点一次。不会额外收费或扣除。",
    refundRequestLabel: "改为申请退款",
    refundRequested: "已收到退款申请。处理完成后，使用券和付款将退回。",
    refunded: "使用券和付款已退回。",
    refundRequestFailed: "未能发送退款申请。请稍后再点一次。",
    refundClosed: "此解读正在退款处理中。处理完成后，使用券和付款将退回。",
  },
  "zh-TW": {
    offer: "戀愛秘策解讀有一部分未能完成。已寫好的內容會保留，只重寫剩餘部分。不會額外收費或扣除。",
    retryLabel: "重試 · 不額外收費",
    retryStarted: "正在重寫剩餘部分。不會額外收費或扣除。",
    retryFailed: "未能開始重試。請稍後再點一次。不會額外收費或扣除。",
    refundRequestLabel: "改為申請退款",
    refundRequested: "已收到退款申請。處理完成後，使用券和付款將退回。",
    refunded: "使用券和付款已退回。",
    refundRequestFailed: "未能送出退款申請。請稍後再點一次。",
    refundClosed: "此解讀正在退款處理中。處理完成後，使用券和付款將退回。",
  },
  vi: {
    offer: "Chúng tôi chưa hoàn thành được một phần bài luận giải bí quyết tình yêu. Phần đã viết được giữ nguyên, chỉ viết lại phần còn lại. Không thu thêm phí hay trừ thêm.",
    retryLabel: "Thử lại · không thu thêm phí",
    retryStarted: "Đang viết lại phần còn lại. Không thu thêm phí hay trừ thêm.",
    retryFailed: "Chưa thể bắt đầu thử lại. Vui lòng nhấn lại sau giây lát. Không thu thêm phí hay trừ thêm.",
    refundRequestLabel: "Yêu cầu hoàn tiền thay vì thử lại",
    refundRequested: "Đã nhận yêu cầu hoàn tiền. Vé sử dụng và khoản thanh toán sẽ được hoàn lại khi xử lý xong.",
    refunded: "Vé sử dụng và khoản thanh toán đã được hoàn lại.",
    refundRequestFailed: "Chưa gửi được yêu cầu hoàn tiền. Vui lòng nhấn lại sau giây lát.",
    refundClosed: "Bài luận giải này đang được hoàn tiền. Vé sử dụng và khoản thanh toán sẽ được hoàn lại khi xử lý xong.",
  },
  hi: {
    offer: "प्रेम रणनीति रीडिंग का कुछ हिस्सा पूरा नहीं हो सका। जो लिखा जा चुका है वह वैसा ही रहेगा, केवल बाकी हिस्सा दोबारा लिखा जाएगा। कोई अतिरिक्त शुल्क या कटौती नहीं है।",
    retryLabel: "फिर से प्रयास करें · कोई अतिरिक्त शुल्क नहीं",
    retryStarted: "बाकी हिस्सा दोबारा लिखा जा रहा है। कोई अतिरिक्त शुल्क या कटौती नहीं है।",
    retryFailed: "दोबारा प्रयास शुरू नहीं हो सका। कृपया थोड़ी देर बाद फिर दबाएँ। कोई अतिरिक्त शुल्क या कटौती नहीं है।",
    refundRequestLabel: "दोबारा प्रयास के बजाय रिफ़ंड माँगें",
    refundRequested: "आपका रिफ़ंड अनुरोध मिल गया है। प्रक्रिया पूरी होने पर पास और भुगतान लौटा दिए जाएँगे।",
    refunded: "आपका पास और भुगतान लौटा दिया गया है।",
    refundRequestFailed: "रिफ़ंड अनुरोध नहीं भेजा जा सका। कृपया थोड़ी देर बाद फिर दबाएँ।",
    refundClosed: "इस रीडिंग का रिफ़ंड हो रहा है। प्रक्रिया पूरी होने पर पास और भुगतान लौटा दिए जाएँगे।",
  },
  es: {
    offer: "No pudimos terminar una parte de tu lectura de estrategia amorosa. Conservamos lo ya escrito y solo reescribimos el resto. Sin cargos ni descuentos adicionales.",
    retryLabel: "Reintentar · sin cargo adicional",
    retryStarted: "Reescribiendo la parte pendiente. Sin cargos ni descuentos adicionales.",
    retryFailed: "No pudimos iniciar el reintento. Vuelve a pulsar en un momento. Sin cargos ni descuentos adicionales.",
    refundRequestLabel: "Solicitar reembolso en su lugar",
    refundRequested: "Recibimos tu solicitud de reembolso. Tu pase o pago se devolverá cuando se procese.",
    refunded: "Tu pase o pago ha sido devuelto.",
    refundRequestFailed: "No pudimos enviar tu solicitud de reembolso. Vuelve a pulsar en un momento.",
    refundClosed: "Esta lectura se está reembolsando. Tu pase o pago se devolverá cuando se procese.",
  },
  fr: {
    offer: "Une partie de votre lecture de stratégie amoureuse n'a pas pu être terminée. Ce qui est déjà écrit est conservé et seul le reste sera réécrit. Aucun frais ni débit supplémentaire.",
    retryLabel: "Réessayer · sans frais supplémentaires",
    retryStarted: "Réécriture de la partie restante. Aucun frais ni débit supplémentaire.",
    retryFailed: "Impossible de lancer la nouvelle tentative. Appuyez de nouveau dans un instant. Aucun frais ni débit supplémentaire.",
    refundRequestLabel: "Demander un remboursement à la place",
    refundRequested: "Votre demande de remboursement est reçue. Votre pass ou paiement sera rendu une fois le traitement terminé.",
    refunded: "Votre pass ou paiement a été rendu.",
    refundRequestFailed: "Impossible d'envoyer votre demande de remboursement. Appuyez de nouveau dans un instant.",
    refundClosed: "Cette lecture est en cours de remboursement. Votre pass ou paiement sera rendu une fois le traitement terminé.",
  },
  de: {
    offer: "Ein Teil deiner Liebesstrategie-Deutung konnte nicht fertiggestellt werden. Bereits Geschriebenes bleibt erhalten, nur der Rest wird neu geschrieben. Es fallen keine zusätzlichen Kosten oder Abzüge an.",
    retryLabel: "Erneut versuchen · ohne Zusatzkosten",
    retryStarted: "Der fehlende Teil wird neu geschrieben. Es fallen keine zusätzlichen Kosten oder Abzüge an.",
    retryFailed: "Der erneute Versuch konnte nicht starten. Bitte tippe gleich noch einmal. Es fallen keine zusätzlichen Kosten oder Abzüge an.",
    refundRequestLabel: "Stattdessen Erstattung anfordern",
    refundRequested: "Deine Erstattungsanfrage ist eingegangen. Pass oder Zahlung werden nach der Bearbeitung zurückgegeben.",
    refunded: "Dein Pass oder deine Zahlung wurde zurückgegeben.",
    refundRequestFailed: "Deine Erstattungsanfrage konnte nicht gesendet werden. Bitte tippe gleich noch einmal.",
    refundClosed: "Diese Deutung wird erstattet. Pass oder Zahlung werden nach der Bearbeitung zurückgegeben.",
  },
  nl: {
    offer: "Een deel van je liefdesstrategie-lezing kon niet worden afgemaakt. Wat al geschreven is blijft staan; alleen de rest wordt opnieuw geschreven. Er zijn geen extra kosten of afschrijvingen.",
    retryLabel: "Opnieuw proberen · geen extra kosten",
    retryStarted: "Het resterende deel wordt opnieuw geschreven. Er zijn geen extra kosten of afschrijvingen.",
    retryFailed: "De nieuwe poging kon niet starten. Tik zo meteen nog eens. Er zijn geen extra kosten of afschrijvingen.",
    refundRequestLabel: "In plaats daarvan terugbetaling aanvragen",
    refundRequested: "Je terugbetalingsverzoek is ontvangen. Je pas of betaling wordt teruggegeven zodra het is verwerkt.",
    refunded: "Je pas of betaling is teruggegeven.",
    refundRequestFailed: "Je terugbetalingsverzoek kon niet worden verzonden. Tik zo meteen nog eens.",
    refundClosed: "Deze lezing wordt terugbetaald. Je pas of betaling wordt teruggegeven zodra het is verwerkt.",
  },
  ms: {
    offer: "Sebahagian bacaan strategi cinta anda tidak dapat disiapkan. Bahagian yang sudah ditulis dikekalkan, hanya bakinya ditulis semula. Tiada caj atau potongan tambahan.",
    retryLabel: "Cuba lagi · tiada caj tambahan",
    retryStarted: "Sedang menulis semula bahagian yang tinggal. Tiada caj atau potongan tambahan.",
    retryFailed: "Cubaan semula tidak dapat dimulakan. Sila tekan sekali lagi sebentar nanti. Tiada caj atau potongan tambahan.",
    refundRequestLabel: "Minta bayaran balik sebagai ganti",
    refundRequested: "Permintaan bayaran balik anda telah diterima. Pas atau bayaran anda akan dikembalikan selepas diproses.",
    refunded: "Pas atau bayaran anda telah dikembalikan.",
    refundRequestFailed: "Permintaan bayaran balik tidak dapat dihantar. Sila tekan sekali lagi sebentar nanti.",
    refundClosed: "Bacaan ini sedang dibayar balik. Pas atau bayaran anda akan dikembalikan selepas diproses.",
  },
};

export function getLoveSecretRetryCopy(locale: LoadingLocale = getCurrentLoadingLocale()): LoveSecretRetryCopy {
  return LOVE_SECRET_RETRY_COPY[locale] || EN;
}

// 서버가 연 무료 다시 시도(같은 결제 건)의 상담 id. 최상위 retryable(=계속 폴링)과는 다른 필드다.
export function loveSecretRetryOffer(body: { ok?: boolean; sessionId?: string; retry?: { available?: boolean; sessionId?: string } } | null | undefined): string {
  if (!body || body.ok === true || body.retry?.available !== true) return "";
  return String(body.retry.sessionId || body.sessionId || "");
}

// 다시 시도 기간이 지났거나 환불이 이미 시작된 건은 환불로 닫힌다.
export function loveSecretRetryClosed(body: { reason?: string } | null | undefined): boolean {
  return body?.reason === "RETRY_WINDOW_EXPIRED" || body?.reason === "REFUND_STARTED";
}
