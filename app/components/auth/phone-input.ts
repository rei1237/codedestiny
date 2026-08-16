/**
 * 휴대폰 번호 입력 표시/정규화 — 가입 마무리 화면과 /onboarding 이 공유한다.
 *
 * 🔴 저장 규칙의 정본은 서버(worker/lib/pii-crypto.js 의 normalizeKoreanPhoneNumber)다.
 * 여기서는 같은 판정을 클라이언트에서 미리 해 잘못된 값을 보내지 않게만 한다 —
 * 두 곳의 규칙이 어긋나면 화면은 통과시켰는데 서버가 400 을 내는 상태가 된다.
 *
 * 서버가 받는 형태는 하이픈 없는 숫자열이다. 화면에만 하이픈을 넣고 전송 직전에 벗긴다.
 */

/** 서버 스키마(worker/lib/models.js:22)와 같은 허용 범위 — 10자리(011·016 등)와 11자리(010) 둘 다. */
const STORED_PHONE_PATTERN = /^01\d{8,9}$/;

/** 82 국가번호로 들어온 값을 로컬 표기로 되돌린다(pii-crypto.js:71 과 같은 규칙). */
function toLocalDigits(value: string): string {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.startsWith("82") && /^821\d{8,9}$/.test(digits) ? `0${digits.slice(2)}` : digits;
}

/**
 * 입력 중인 값을 `010-1234-5678` 모양으로 만든다. 아직 다 치지 않은 값도 그대로 돌려주므로
 * onChange 마다 불러도 커서가 튀지 않는다(자리수가 늘어날 때만 하이픈이 붙는다).
 */
export function formatKoreanPhoneInput(value: string): string {
  const digits = toLocalDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  // 10자리는 3-3-4, 11자리는 3-4-4. 11번째 자리가 들어오는 순간 가운데 묶음이 4자리로 늘어난다.
  const middleLength = digits.length > 10 ? 4 : 3;
  if (digits.length <= 3 + middleLength) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 3 + middleLength)}-${digits.slice(3 + middleLength)}`;
}

/**
 * 전송용 숫자열. 유효하지 않으면 "" 를 돌려준다 —
 * 호출자는 "빈 값 = 입력 안 함"과 "빈 값 = 형식 오류"를 스스로 구분해야 한다(입력이 비어 있었는지로).
 */
export function toStoredPhoneDigits(value: string): string {
  const digits = toLocalDigits(value);
  return STORED_PHONE_PATTERN.test(digits) ? digits : "";
}

/** 사용자가 무언가 입력하긴 했는지 — 공백만 친 경우는 미입력으로 본다. */
export function hasPhoneInput(value: string): boolean {
  return String(value || "").replace(/\D/g, "").length > 0;
}
