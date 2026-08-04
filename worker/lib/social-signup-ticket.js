import { signJwt, verifyJwt } from "./jwt.js";

/**
 * 소셜 가입 티켓 — 아직 계정이 없는 소셜 신원을 담아 프론트로 넘긴다.
 *
 * 만 14세 미만인지 알기 전에는 계정을 만들 수 없다(개인정보보호법 제22조의2: 법정대리인 동의).
 * 그래서 OAuth 콜백은 계정을 만드는 대신 이 티켓을 발급하고, 가입 마무리 화면에서
 * 생년월일(+보호자 이메일)을 받은 뒤에야 계정이 만들어진다.
 *
 * 가입 마무리 화면에서 입력할 시간을 줘야 하므로 social grant(3분)보다 길게 잡는다.
 */
export const SOCIAL_SIGNUP_TICKET_EXPIRES_IN_SEC = 600;

const TICKET_PURPOSE = "social-oauth-signup";

export async function signSocialSignupTicket(payload, secret, issuer) {
  return await signJwt(
    {
      purpose: TICKET_PURPOSE,
      ...payload,
      jti: crypto.randomUUID(),
    },
    secret,
    { expiresIn: `${SOCIAL_SIGNUP_TICKET_EXPIRES_IN_SEC}s`, issuer },
  );
}

export async function verifySocialSignupTicket(token, secret, issuer) {
  const payload = await verifyJwt(token, secret, { issuer });
  if (!payload || payload.purpose !== TICKET_PURPOSE || !payload.providerId) {
    throw new Error("invalid_social_signup_ticket");
  }
  return payload;
}

/**
 * 티켓을 다시 소셜 프로필 모양으로 되돌린다. 이메일 연결 판정
 * 기존 계정 이메일 연결은 명시적으로 확인된 이메일만 허용하므로 true/false/unknown을 보존한다.
 */
export function socialProfileFromSignupTicket(ticket) {
  return {
    providerId: String(ticket?.providerId || ""),
    email: String(ticket?.email || ""),
    name: String(ticket?.name || ""),
    image: String(ticket?.image || ""),
    phoneNumber: String(ticket?.phoneNumber || ""),
    emailVerified: ticket?.emailVerified === true ? true : (ticket?.emailVerified === false ? false : null),
  };
}

/**
 * 가입 마무리 화면 URL. 앱(Capacitor) 경로도 딥링크 대신 이 웹 화면을 거친다 —
 * 패키징된 구버전 앱 브릿지는 social_grant 만 이해하므로, 계정이 만들어진 뒤 딥링크로 돌려보낸다.
 */
export function buildSocialSignupRedirectUrl(frontendBase, ticket, { nextPath, flow } = {}) {
  const params = new URLSearchParams({ social_signup: ticket, flow: flow || "signup" });
  if (nextPath && nextPath !== "/") params.set("next", nextPath);
  return `${String(frontendBase || "").replace(/\/+$/, "")}/signup?${params.toString()}`;
}
