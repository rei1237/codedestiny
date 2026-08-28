import { getEnv } from "./env.js";

/**
 * Telegram Bot 발행 유틸.
 *
 * 🔴 계약은 worker/lib/resend.js 와 같다 — 키가 없든 API 가 거절하든 **절대 throw 하지 않고**
 * 결과 객체를 돌려준다. 이 모듈의 호출부는 일일 크론이고, 거기서 던지면 같은 실행을 공유하는
 * 나머지 태스크(운세 발송·구독 정산 등)까지 위험해진다.
 *
 * 🔴 봇 토큰은 URL 경로에 들어간다. 그래서 이 파일은 요청 URL 을 절대 로그에 남기지 않는다 —
 * 상태 코드와 API 가 준 description 만 남긴다.
 *
 * fetchImpl 을 주입받는 이유는 검증 스크립트가 **실제 발행 없이** 계약을 확인하기 위해서다
 * (정본 패턴: scripts/verify-mindscan-reading.mjs).
 */

const TELEGRAM_API_BASE = "https://api.telegram.org";

// Telegram sendMessage 의 본문 상한. 넘기면 API 가 400 으로 거절하므로 보내기 전에 자른다.
const TELEGRAM_TEXT_LIMIT = 4096;

/** parse_mode:"HTML" 이 해석하는 세 글자만 막는다. 나머지는 Telegram 이 평문으로 둔다. */
export function escapeTelegramHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function truncateForTelegram(text) {
  const normalized = String(text || "");
  if (normalized.length <= TELEGRAM_TEXT_LIMIT) return normalized;
  return normalized.slice(0, TELEGRAM_TEXT_LIMIT - 1) + "…";
}

function describeTelegramError(payload, fallback) {
  const description = payload && typeof payload === "object" ? payload.description : "";
  return String(description || fallback || "telegram_error");
}

/**
 * @param {Object} env 워커 env (또는 process.env 스타일 객체)
 * @param {Object} options
 * @param {string} options.text 발행 본문. parse_mode 는 항상 HTML 이므로 호출부가 escapeTelegramHtml 로 감싼다.
 * @param {string} [options.chatId] 없으면 TELEGRAM_CHAT_ID 를 쓴다.
 * @param {boolean} [options.disablePreview] 링크 미리보기 억제
 * @param {Function} [options.fetchImpl] 검증용 주입구. 기본값은 전역 fetch.
 * @returns {Promise<{ok: boolean, status: number, error?: string, data?: unknown}>}
 */
export async function sendTelegramMessage(env, options = {}) {
  const { text, chatId, disablePreview = false, fetchImpl } = options;

  const token = getEnv(env, "TELEGRAM_BOT_TOKEN");
  if (!token) {
    console.error("[TELEGRAM] TELEGRAM_BOT_TOKEN 이 없다 — 발행을 건너뛴다.");
    return { ok: false, status: 0, error: "missing_bot_token" };
  }

  const targetChatId = String(chatId || getEnv(env, "TELEGRAM_CHAT_ID") || "").trim();
  if (!targetChatId) {
    console.error("[TELEGRAM] TELEGRAM_CHAT_ID 가 없다 — 발행을 건너뛴다.");
    return { ok: false, status: 0, error: "missing_chat_id" };
  }

  const body = truncateForTelegram(text);
  if (!body.trim()) {
    console.error("[TELEGRAM] 본문이 비어 있다 — 발행을 건너뛴다.");
    return { ok: false, status: 0, error: "empty_text" };
  }

  const doFetch = typeof fetchImpl === "function" ? fetchImpl : fetch;

  try {
    const response = await doFetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: body,
        parse_mode: "HTML",
        disable_web_page_preview: Boolean(disablePreview),
      }),
    });

    const raw = await response.text();
    let payload = null;
    if (raw) {
      try {
        payload = JSON.parse(raw);
      } catch (_parseError) {
        payload = null;
      }
    }

    if (!response.ok || !(payload && payload.ok)) {
      const error = describeTelegramError(payload, `http_${response.status}`);
      // 🔴 URL 을 찍지 않는다 — 경로에 봇 토큰이 들어 있다.
      console.error("[TELEGRAM] 발행 실패:", { status: response.status, error });
      return { ok: false, status: response.status, error, data: payload };
    }

    return { ok: true, status: response.status, data: payload };
  } catch (error) {
    console.error("[TELEGRAM] 요청 자체가 실패:", error?.message || error);
    return { ok: false, status: 0, error: String(error?.message || "telegram_request_failed") };
  }
}
