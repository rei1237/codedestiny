/**
 * 한국 휴대폰 번호 정규화·표시 포맷 — **프론트 정본**.
 *
 * 규칙은 서버 정본(worker/lib/pii-crypto.js normalizeKoreanPhoneNumber)과 글자 그대로 같아야
 * 한다. 프론트가 통과시킨 표기를 서버가 다시 ""로 접으면, 사용자에게는 정상으로 보인 입력이
 * 400 으로 되돌아온다.
 *
 * 🔴 새 화면에서 이 규칙을 다시 적으로 만들지 말 것 — 정적 셸(`_cdNormalizeKoreanPhoneNumber`)과
 * 독립 폴백(`js/destiny-profile.js`)에 이미 같은 규칙의 사본이 있고, 그 둘은 모듈을 못 읽는
 * 인라인 스크립트라 어쩔 수 없이 따로 있는 것이다. 모듈을 읽을 수 있는 곳은 여기를 쓴다.
 */

/** `+82 10-1234-5678` · `010-1234-5678` · `01012345678` → `01012345678`. 형식이 어긋나면 "". */
export function normalizeKoreanPhoneNumber(value: string | null | undefined): string {
  const digits = String(value == null ? "" : value).replace(/\D/g, "");
  const localDigits = digits.startsWith("82") && /^821\d{8,9}$/.test(digits) ? `0${digits.slice(2)}` : digits;
  return /^01\d{8,9}$/.test(localDigits) ? localDigits : "";
}

/**
 * 입력 중인 값을 `010-1234-5678` 모양으로 만든다. 저장 직전에 normalizeKoreanPhoneNumber 가
 * 하이픈을 다시 벗기므로 표시 전용이다(셸 `_cdFormatKoreanPhoneInput` 과 같은 규칙).
 */
export function formatKoreanPhoneInput(value: string | null | undefined): string {
  const digits = String(value == null ? "" : value).replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  const middleLength = digits.length > 10 ? 4 : 3;
  if (digits.length <= 3 + middleLength) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 3 + middleLength)}-${digits.slice(3 + middleLength)}`;
}
