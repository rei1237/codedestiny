import { createHmac } from "node:crypto";
import { getEnv } from "./env.js";
import { sendEmail } from "./resend.js";

// 개인정보보호법 제22조의2 — 만 14세 미만 아동의 개인정보를 처리하려면 법정대리인의 동의를 받아야 한다.
// 동의 확인 방법 중 "동의 내용을 법정대리인 이메일로 보내고 회신(확인)받는 방법"을 구현한다.
export const GUARDIAN_CONSENT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getConsentSecret(env) {
  return getEnv(env, "JWT_SECRET") || getEnv(env, "AUTH_SECRET") || "";
}

function base64UrlEncode(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(text) {
  const padded = String(text || "").replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function signPayload(env, encodedPayload) {
  return createHmac("sha256", getConsentSecret(env)).update(encodedPayload).digest("hex");
}

function safeEquals(a, b) {
  const left = String(a || "");
  const right = String(b || "");
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * 보호자 동의 링크에 실을 서명 토큰을 만든다.
 * @returns {string} `<payload>.<signature>` 형식
 */
export function createGuardianConsentToken(env, { userId, guardianEmail, issuedAt = Date.now() }) {
  const payload = {
    uid: String(userId || ""),
    gem: String(guardianEmail || "").toLowerCase(),
    iat: issuedAt,
    exp: issuedAt + GUARDIAN_CONSENT_TTL_MS,
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  return `${encoded}.${signPayload(env, encoded)}`;
}

/**
 * @returns {{ ok: boolean, code?: string, payload?: { uid: string, gem: string, iat: number, exp: number } }}
 */
export function verifyGuardianConsentToken(env, token) {
  if (!getConsentSecret(env)) return { ok: false, code: "secret_missing" };

  const raw = String(token || "").trim();
  const separatorIndex = raw.lastIndexOf(".");
  if (separatorIndex <= 0) return { ok: false, code: "malformed_token" };

  const encoded = raw.slice(0, separatorIndex);
  const signature = raw.slice(separatorIndex + 1);
  if (!safeEquals(signature, signPayload(env, encoded))) return { ok: false, code: "invalid_signature" };

  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(encoded));
  } catch (error) {
    return { ok: false, code: "malformed_payload" };
  }

  if (!payload || typeof payload !== "object" || !payload.uid) return { ok: false, code: "malformed_payload" };
  if (!Number.isFinite(Number(payload.exp)) || Number(payload.exp) < Date.now()) return { ok: false, code: "expired" };

  return { ok: true, payload };
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// 이 페이지·메일은 워커가 단독으로 서빙하는 자립형 HTML이라 Tailwind를 쓸 수 없어 인라인 스타일을 쓴다.
const PAGE_SHELL_STYLE = "margin:0;padding:32px 16px;background:#0a0818;color:#f5f3ff;font-family:'SUIT','Apple SD Gothic Neo','Malgun Gothic',sans-serif;line-height:1.7;";
const CARD_STYLE = "max-width:560px;margin:0 auto;padding:28px 24px;border:1px solid rgba(196,181,253,.35);border-radius:20px;background:#13102a;";
const BUTTON_STYLE = "display:inline-block;min-width:180px;padding:14px 20px;border:0;border-radius:12px;background:linear-gradient(90deg,#a78bfa,#c4b5fd);color:#1a1333;font-size:15px;font-weight:700;text-align:center;text-decoration:none;cursor:pointer;";

function pageShell(title, innerHtml) {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escapeHtml(title)} · Code Destiny</title></head><body style="${PAGE_SHELL_STYLE}"><main style="${CARD_STYLE}">${innerHtml}</main></body></html>`;
}

/**
 * 보호자가 동의 링크를 열었을 때 보여줄 동의 요청 페이지.
 */
export function buildGuardianConsentRequestPage({ token, childName, childEmail, birthDate, actionUrl }) {
  return pageShell("법정대리인 동의", `
    <p style="margin:0 0 6px;font-size:12px;letter-spacing:.18em;color:#c4b5fd;">CODE DESTINY</p>
    <h1 style="margin:0 0 18px;font-size:22px;color:#f5f3ff;">자녀의 회원가입에 대한 법정대리인 동의</h1>
    <p style="margin:0 0 16px;font-size:14px;color:#ded9f7;">아래 아동이 Code Destiny(운세·사주 서비스) 회원가입을 신청했습니다. 개인정보 보호법 제22조의2에 따라 만 14세 미만 아동의 개인정보를 처리하려면 법정대리인의 동의가 필요합니다.</p>
    <dl style="margin:0 0 18px;padding:16px;border-radius:14px;background:rgba(167,139,250,.12);font-size:14px;">
      <dt style="color:#c4b5fd;font-size:12px;">이름</dt><dd style="margin:2px 0 10px;">${escapeHtml(childName)}</dd>
      <dt style="color:#c4b5fd;font-size:12px;">아이디(이메일)</dt><dd style="margin:2px 0 10px;">${escapeHtml(childEmail)}</dd>
      <dt style="color:#c4b5fd;font-size:12px;">생년월일</dt><dd style="margin:2px 0 0;">${escapeHtml(birthDate)}</dd>
    </dl>
    <h2 style="margin:0 0 8px;font-size:15px;color:#e8d5a3;">수집·이용 내역</h2>
    <ul style="margin:0 0 18px;padding-left:18px;font-size:13px;color:#ded9f7;">
      <li>수집 항목: 이름, 이메일, 생년월일·태어난 시각, 성별, 휴대폰 번호</li>
      <li>이용 목적: 회원 식별 및 사주·타로·점성술 운세 결과 제공</li>
      <li>보유 기간: 회원 탈퇴 시까지(관계 법령상 보존 의무가 있는 경우 해당 기간)</li>
      <li>동의를 거부할 수 있으며, 이 경우 회원가입이 완료되지 않습니다</li>
    </ul>
    <p style="margin:0 0 18px;padding:12px 14px;border-radius:12px;background:rgba(232,213,163,.12);font-size:13px;color:#f3e7c8;">만 14세 미만 계정은 <strong>유료 결제를 이용할 수 없습니다</strong>(미성년자 결제 관련 분쟁 예방). 무료 기능만 이용할 수 있습니다.</p>
    <form method="POST" action="${escapeHtml(actionUrl)}" style="margin:0;">
      <input type="hidden" name="token" value="${escapeHtml(token)}">
      <button type="submit" name="action" value="approve" style="${BUTTON_STYLE}">동의하고 가입 완료하기</button>
      <button type="submit" name="action" value="reject" style="display:inline-block;min-width:120px;margin-left:8px;padding:14px 18px;border:1px solid rgba(244,190,209,.4);border-radius:12px;background:transparent;color:#f6c6d8;font-size:14px;cursor:pointer;">동의하지 않음</button>
    </form>
    <p style="margin:18px 0 0;font-size:12px;color:#a89fd0;">본인이 신청한 적이 없다면 이 메일을 무시하시거나 admin@code-destiny.com 으로 알려 주세요. 동의 후에도 언제든 회원 탈퇴 또는 문의를 통해 동의를 철회하고 개인정보 삭제를 요청할 수 있습니다.</p>
  `);
}

export function buildGuardianConsentResultPage({ heading, message, tone = "ok" }) {
  const accent = tone === "ok" ? "#a7f3d0" : "#f6c6d8";
  return pageShell(heading, `
    <p style="margin:0 0 6px;font-size:12px;letter-spacing:.18em;color:#c4b5fd;">CODE DESTINY</p>
    <h1 style="margin:0 0 14px;font-size:21px;color:${accent};">${escapeHtml(heading)}</h1>
    <p style="margin:0;font-size:14px;color:#ded9f7;">${escapeHtml(message)}</p>
  `);
}

export function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export async function sendGuardianConsentEmail(env, { guardianEmail, childName, childEmail, consentUrl }) {
  const html = `
    <div style="max-width:560px;margin:0 auto;padding:24px;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;line-height:1.7;color:#1f1b33;">
      <h1 style="margin:0 0 14px;font-size:20px;">자녀의 Code Destiny 회원가입 동의 요청</h1>
      <p style="margin:0 0 14px;font-size:14px;">${escapeHtml(childName)}(${escapeHtml(childEmail)}) 님이 Code Destiny 회원가입을 신청했습니다.</p>
      <p style="margin:0 0 20px;font-size:14px;">개인정보 보호법 제22조의2에 따라 만 14세 미만 아동의 회원가입에는 법정대리인의 동의가 필요합니다. 아래 버튼을 눌러 수집·이용 내역을 확인하고 동의 여부를 선택해 주세요.</p>
      <p style="margin:0 0 20px;"><a href="${escapeHtml(consentUrl)}" style="display:inline-block;padding:14px 22px;border-radius:12px;background:#6d28d9;color:#ffffff;font-weight:700;text-decoration:none;">동의 내용 확인하기</a></p>
      <p style="margin:0 0 8px;font-size:12px;color:#6b6485;">이 링크는 7일간 유효합니다. 동의하지 않으면 회원가입은 완료되지 않으며 입력된 정보는 이용되지 않습니다.</p>
      <p style="margin:0;font-size:12px;color:#6b6485;">신청한 적이 없다면 이 메일을 무시하셔도 됩니다. 문의: admin@code-destiny.com</p>
    </div>
  `;

  return await sendEmail(env, {
    to: guardianEmail,
    subject: "[Code Destiny] 자녀 회원가입 법정대리인 동의 요청",
    html,
  });
}
