/**
 * 출생시간 직접 타이핑 규칙 — js/destiny-profile.js 의 _dpNormalizeBirthTimeText 와 글자 그대로 같아야 한다.
 * 화면마다 다르면 같은 값을 치고도 다른 결과를 본다. 24시간제(0~23)로 해석하고 HH:mm 을 돌려준다.
 */
export function normalizeBirthTime(raw: string): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  let hour: string;
  let minute: string;
  if (digits.length === 1 || digits.length === 2) { hour = digits; minute = "0"; }
  else if (digits.length === 3) { hour = digits.slice(0, 1); minute = digits.slice(1); }
  else if (digits.length === 4) { hour = digits.slice(0, 2); minute = digits.slice(2); }
  else return "";
  const h = parseInt(hour, 10);
  const m = parseInt(minute, 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return "";
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}

/**
 * 입력 중 자동 콜론. 사용자가 콜론을 직접 쳤으면 그 위치를 존중하고("8:30"),
 * 숫자만 치면 두 자리 뒤에 콜론을 붙인다("0830" → "08:30"). 최종 해석은 normalizeBirthTime 이 한다.
 */
export function maskBirthTimeInput(raw: string): string {
  const text = String(raw ?? "");
  if (text.includes(":")) {
    const [head, ...rest] = text.split(":");
    return head.replace(/\D/g, "").slice(0, 2) + ":" + rest.join("").replace(/\D/g, "").slice(0, 2);
  }
  const digits = text.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  /* "830" 처럼 앞 두 자리가 시가 될 수 없으면 한 자리 시 + 두 자리 분으로 읽는다(normalizeBirthTime 과 같은 해석). */
  if (digits.length === 3 && Number(digits.slice(0, 2)) > 23) return digits[0] + ":" + digits.slice(1);
  return digits.slice(0, 2) + ":" + digits.slice(2);
}

/** 저장된 HH:mm 값을 입력창에 보여줄 텍스트로. 해석할 수 없으면 빈 칸. */
export function formatBirthTime(value: string): string {
  return /^\d{1,2}:\d{2}$/.test(String(value ?? "")) ? normalizeBirthTime(value) : "";
}
