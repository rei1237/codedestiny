/**
 * 이용권 만료일 표시 규칙(2026-10-11 기간 없는 이용권).
 *
 * 서버는 기간 없는 이용권의 expiresAt 을 "활성화 + 100년" 센티널로 내려준다. 남은 기간이 10년을
 * 넘으면 날짜·D-day 대신 "기간 제한 없음 · 자동 갱신 없음"을 보여 준다. 판정은 서버 정본
 * worker/lib/profile-limits.js isOpenEndedPassExpiry 를 그대로 쓴다(임계값 사본을 만들지 않는다).
 * 옛 이용권(실제 날짜)은 마이그레이션 전까지 날짜가 그대로 보인다.
 */
import { isOpenEndedPassExpiry as isOpenEndedPassExpiryCanonical } from "@/worker/lib/profile-limits";

export function isOpenEndedPassExpiry(value: string | number | Date | null | undefined, now: number | Date = Date.now()): boolean {
  return isOpenEndedPassExpiryCanonical(value, now instanceof Date ? now.getTime() : now);
}

const OPEN_ENDED_PASS_LABELS: Record<string, string> = {
  ko: "기간 제한 없음 · 자동 갱신 없음",
  en: "No expiry · no auto-renewal",
  ja: "期間制限なし · 自動更新なし",
  "zh-cn": "不限期限 · 不自动续费",
  "zh-tw": "不限期限 · 不自動續費",
  vi: "Không giới hạn thời gian · không tự động gia hạn",
  hi: "कोई समय सीमा नहीं · स्वतः नवीनीकरण नहीं",
  es: "Sin caducidad · sin renovación automática",
  fr: "Sans date d'expiration · sans renouvellement automatique",
  de: "Kein Ablaufdatum · keine automatische Verlängerung",
  nl: "Geen vervaldatum · geen automatische verlenging",
  ms: "Tiada tarikh luput · tiada pembaharuan automatik",
};

function normalizeLocale(locale: string | undefined): string {
  const normalized = String(locale || "ko").trim().toLowerCase().replace("_", "-");
  if (normalized === "zh" || normalized === "zh-hans") return "zh-cn";
  if (normalized === "zh-hant") return "zh-tw";
  if (OPEN_ENDED_PASS_LABELS[normalized]) return normalized;
  const base = normalized.split("-")[0];
  return OPEN_ENDED_PASS_LABELS[base] ? base : "en";
}

/** 기간 없는 이용권의 만료일 자리에 넣는 문구. */
export function openEndedPassLabel(locale?: string): string {
  return OPEN_ENDED_PASS_LABELS[normalizeLocale(locale)];
}
