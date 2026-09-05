// 공개 API 응답에 실리는 표시 이름 마스킹.
//
// 🔴 이 레포의 User.name 은 가입 시 **이메일 로컬파트에서 파생된다**
//    (worker/lib/validation.js 의 deriveNameFromEmail — 가입 화면에 이름 칸이 없어서
//    서버가 이메일 아이디로 표시 이름을 만든다). 그래서 표시 이름을 그대로 내보내면
//    "seongbae555@gmail.com" 가입자의 이메일 아이디가 화면에 통째로 공개된다.
//    소셜 로그인 계정은 공급자 실명이 그대로 실린다.
//
// 마스킹은 반드시 **응답을 만드는 서버 쪽**에서 한다. 프론트에서 가리면 원본이 이미
// 클라이언트로 전송된 뒤라 개발자도구·네트워크 탭에서 그대로 보인다.

/**
 * 표시 이름의 첫 글자만 남기고 가린다.
 *
 * 별을 원본 길이만큼이 아니라 3개로 고정하는 이유는 길이 정보조차 남기지 않기 위해서다.
 * 형식은 이 레포에 이미 있는 로그 마스킹 선례(worker/routes/life-book-ai.js 의 maskName,
 * `홍***`)와 같게 맞춰 두 곳의 표기가 갈라지지 않게 한다.
 *
 * @param {unknown} value 원본 표시 이름
 * @returns {string} 마스킹된 이름. 값이 없으면 빈 문자열(호출부의 기존 폴백이 받는다).
 */
export function maskDisplayName(value) {
  // 🔴 slice 가 아니라 Array.from 을 쓴다 — 이모지·서로게이트 페어를 slice 로 자르면
  //    반쪽짜리 코드 유닛이 응답에 실려 깨진 글자가 렌더된다.
  const chars = Array.from(String(value ?? "").trim());
  if (chars.length === 0) return "";
  // 1글자짜리 이름은 첫 글자를 남기는 순간 원본이 전부 드러난다.
  if (chars.length === 1) return "*";
  return `${chars[0]}***`;
}
