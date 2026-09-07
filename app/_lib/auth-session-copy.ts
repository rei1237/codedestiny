// 확정 미인증의 원인은 "다른 기기 로그인/로그아웃"일 수도, "세션 만료"일 수도 있다.
// 서버가 원인을 구분해 내려주지 않으므로(worker 는 401 code:"UNAUTHORIZED" 단일) 둘 다 포괄한다.
export const SESSION_EXPIRED_MESSAGE: Record<string, string> = {
  ko: "다른 기기 로그인 또는 세션 만료로 로그아웃되었습니다. 다시 로그인해 주세요.",
  en: "You were signed out — another device signed in, or your session expired. Please sign in again.",
  ja: "他の端末でのログイン、またはセッション期限切れによりログアウトされました。もう一度ログインしてください。",
  "zh-CN": "因其他设备登录或登录状态过期，已自动退出。请重新登录。",
  "zh-TW": "因其他裝置登入或登入狀態過期，已自動登出。請重新登入。",
  vi: "Bạn đã bị đăng xuất — thiết bị khác đã đăng nhập hoặc phiên đã hết hạn. Vui lòng đăng nhập lại.",
  hi: "आप साइन आउट हो गए — किसी अन्य डिवाइस पर साइन इन हुआ या सत्र समाप्त हो गया। कृपया फिर से साइन इन करें।",
  es: "Se cerró tu sesión: otro dispositivo inició sesión o tu sesión expiró. Vuelve a iniciar sesión.",
  fr: "Vous avez été déconnecté : un autre appareil s'est connecté ou votre session a expiré. Reconnectez-vous.",
  de: "Sie wurden abgemeldet — ein anderes Gerät hat sich angemeldet oder Ihre Sitzung ist abgelaufen. Bitte erneut anmelden.",
  nl: "Je bent uitgelogd — een ander apparaat logde in of je sessie is verlopen. Log opnieuw in.",
  ms: "Anda telah dilog keluar — peranti lain log masuk atau sesi anda tamat. Sila log masuk semula.",
};

/** 지원 로케일 하나로 반드시 수렴한다 — 표에 12개가 다 있으므로 조회가 빌 수 없다. */
export function normalizeSessionLocale(raw: string): string {
  const value = String(raw || "").trim().toLowerCase().replace("_", "-");
  if (value.startsWith("zh")) {
    return value.includes("tw") || value.includes("hant") || value.includes("hk") ? "zh-TW" : "zh-CN";
  }
  const short = value.slice(0, 2);
  return ["ko", "en", "ja", "vi", "hi", "es", "fr", "de", "nl", "ms"].includes(short) ? short : "ko";
}

