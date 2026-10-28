// 별빛 운영본부 표기 규칙 — 금액은 실제 통화로, 시각은 KST 로, XP 는 부호를 붙여 고객 재화(월정석·이용권)와 섞이지 않게 한다.

const KST = "Asia/Seoul";

export function formatKRW(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "자료 없음";
  return `${Math.round(Number(value)).toLocaleString("ko-KR")}원`;
}

/** 원통화 금액. USD 는 센트가 아니라 달러 단위로 받는다(서버 amountOriginal). */
export function formatMoney(value: number | null | undefined, currency = "KRW"): string {
  if (value == null || Number.isNaN(Number(value))) return "자료 없음";
  if (currency === "KRW") return formatKRW(value);
  try {
    return new Intl.NumberFormat("ko-KR", { style: "currency", currency }).format(Number(value));
  } catch {
    return `${Number(value).toLocaleString("ko-KR")} ${currency}`;
  }
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return Number(value).toLocaleString("ko-KR");
}

/** 운영 XP. "XP" 단위를 항상 붙여 월정석과 헷갈리지 않게 한다. */
export function formatXp(value: number, { signed = false } = {}): string {
  const n = Math.round(Number(value) || 0);
  const sign = signed && n > 0 ? "+" : "";
  return `${sign}${n.toLocaleString("ko-KR")} XP`;
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ko-KR", { timeZone: KST, month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}

/** "10/14 (화)" — 날짜 키(YYYY-MM-DD)는 이미 KST 기준이다. */
export function formatDateKey(key: string | null | undefined, { weekday = true } = {}): string {
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return "—";
  const [, m, d] = key.split("-").map(Number);
  const day = new Date(`${key}T00:00:00Z`).getUTCDay();
  return `${m}/${d}${weekday ? ` (${"일월화수목금토"[day]})` : ""}`;
}

export function formatAgo(value: string | null | undefined, now = Date.now()): string {
  if (!value) return "기록 없음";
  const minutes = Math.round((now - new Date(value).getTime()) / 60000);
  if (Number.isNaN(minutes)) return "기록 없음";
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}시간 전`;
  return `${Math.floor(minutes / 1440)}일 전`;
}

/** 직전 기간 대비 변화율. 직전이 0 이면 비교하지 않는다(무한대 % 를 보여 주지 않는다). */
export function changeRate(current: number, previous: number): number | null {
  if (!previous) return null;
  return (current - previous) / Math.abs(previous);
}

export function formatRate(rate: number | null): string {
  if (rate == null) return "비교 불가";
  const pct = Math.round(rate * 1000) / 10;
  return `${pct > 0 ? "+" : ""}${pct}%`;
}

/** KST 오늘 날짜 키. */
export function kstToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: KST, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function addDays(key: string, days: number): string {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** 월요일 시작 주. */
export function weekStart(key: string): string {
  const day = new Date(`${key}T00:00:00Z`).getUTCDay();
  return addDays(key, -((day + 6) % 7));
}
