// Asia/Seoul 날짜 계산. 한국은 서머타임이 없어 고정 +09:00 으로 충분하다.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function kstDateKey(value = new Date()) {
  const ms = new Date(value).getTime();
  if (!Number.isFinite(ms)) return null;
  return new Date(ms + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** "2026-10-12" + "12:30" → Date. 시각이 비거나 "08:30/12:00/20:30" 같은 복합값이면 첫 시각을 쓴다. */
export function kstDateTime(dateKey, time = "00:00") {
  const first = /^(\d{2}):(\d{2})/.exec(String(time || "").trim());
  const hhmm = first ? `${first[1]}:${first[2]}` : "00:00";
  const date = new Date(`${dateKey}T${hhmm}:00+09:00`);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function addDaysKey(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** 그 날짜가 속한 주의 월요일(KST 기준 날짜 키). */
export function weekStartKey(dateKey) {
  const day = new Date(`${dateKey}T00:00:00Z`).getUTCDay();
  return addDaysKey(dateKey, -((day + 6) % 7));
}
