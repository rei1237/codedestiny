import { getEnv } from "./env.js";

export const DEFAULT_EMAIL_FROM = "Code Destiny <admin@code-destiny.com>";

/**
 * 발신 실패가 **계정 설정 문제**인지 판정한다.
 *
 * 🔴 이 구분이 없으면 배치 발송이 조용히 죽는다. 도메인 미인증(403)·키 오류(401)·발신자 형식
 * 오류(422)는 수신자와 무관하므로 다음 수신자에게 보내도 같은 응답이 온다. 실제로 2026-08-19
 * 부터 일일 운세 크론이 매일 구독자 수만큼 `403 domain is not verified` 를 받아 내고도
 * 구독자별 console.error 한 줄만 남긴 채 루프를 계속 돌아, 12일간 발송이 0이면서 요약 로그는
 * `failed=N` 으로만 보였다. 호출부는 이 값이 true 면 배치를 멈추고 사람을 부른다.
 *
 * 같은 키·같은 발신 도메인을 결제 영수증(worker/payments/receipt-email.js)과
 * 피드백 알림(worker/lib/feedback-notify.js)도 쓰므로, 이 오류는 셋을 동시에 막는다.
 *
 * @param {number} status HTTP 상태 코드
 * @param {string} message Resend 가 준 오류 메시지
 * @returns {boolean}
 */
export function isResendConfigFailure(status, message) {
  const code = Number(status) || 0;
  if (code === 401 || code === 403) return true;
  // 422 는 수신자 주소 형식 오류일 수도 있으므로 발신자/도메인을 지목한 경우만 설정 오류로 본다.
  if (code === 422 && /(^|[^a-z])from([^a-z]|$)|domain/i.test(String(message || ""))) return true;
  return false;
}

/** 로그에 남길 발신 도메인. 주소 전체 대신 도메인만 남긴다. */
function fromDomainOf(sender) {
  const match = /@([^\s>]+)/.exec(String(sender || ""));
  return match ? match[1] : "";
}

/**
 * Resend Email Utility for Cloudflare Worker.
 *
 * 🔴 throw 하지 않는다 — 호출부 하나가 일일 크론이고, 거기서 던지면 같은 실행을 공유하는
 * 나머지 태스크까지 위험해진다(worker/lib/telegram.js 와 같은 계약).
 *
 * @returns {Promise<{ok: boolean, status: number, error?: string, data?: unknown, configError?: boolean, from?: string}>}
 *   configError — 수신자가 아니라 **계정 설정**이 원인인 실패. 재시도·다음 수신자 진행이 무의미하다.
 */
export async function sendEmail(env, { to, subject, html, from, headers }) {
  const apiKey = getEnv(env, "RESEND_API_KEY") || getEnv(env, "emailapi");
  if (!apiKey) {
    console.error("[EMAIL] Resend API key is missing. Set emailapi or RESEND_API_KEY.");
    return {
      ok: false,
      error: "missing_api_key",
      status: 0,
      configError: true,
      data: { missing: ["emailapi", "RESEND_API_KEY"] },
    };
  }

  const configuredFrom = from || getEnv(env, "EMAIL_FROM") || getEnv(env, "RESEND_FROM");
  if (!configuredFrom) {
    console.warn("[EMAIL] EMAIL_FROM/RESEND_FROM missing; using default sender.");
  }

  const sender = configuredFrom || DEFAULT_EMAIL_FROM;
  const payload = {
    from: sender,
    to: Array.isArray(to) ? to : [to],
    subject: subject,
    html: html,
  };
  if (headers && typeof headers === "object") {
    payload.headers = headers;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await readResendResponse(response);

    if (!response.ok) {
      const errorMessage = getResendErrorMessage(data, "resend_error");
      const configError = isResendConfigFailure(response.status, errorMessage);
      // 🔴 발신 도메인을 함께 남긴다 — 403 의 대상이 어느 도메인인지 로그만 보고 알 수 있어야 한다.
      console.error("[EMAIL] Resend API error:", {
        status: response.status,
        error: errorMessage,
        fromDomain: fromDomainOf(sender),
        configError,
        data,
      });
      return { ok: false, error: errorMessage, status: response.status, data, configError, from: sender };
    }

    return { ok: true, status: response.status, data, from: sender };
  } catch (error) {
    console.error("[EMAIL] Failed to send email via Resend:", error);
    // 네트워크 실패는 설정 오류가 아니다 — 다음 수신자에서 성공할 수 있다.
    return { ok: false, error: String(error?.message || "resend_request_failed"), status: 0, configError: false, from: sender };
  }
}

async function readResendResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    return {
      message: "invalid_resend_response",
      raw: text.slice(0, 500),
    };
  }
}

function getResendErrorMessage(data, fallback) {
  if (typeof data?.message === "string" && data.message.trim()) return data.message.trim();
  if (typeof data?.error === "string" && data.error.trim()) return data.error.trim();
  if (typeof data?.name === "string" && data.name.trim()) return data.name.trim();
  return fallback;
}
