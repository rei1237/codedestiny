import { escapeTelegramHtml, sendTelegramMessage } from "./telegram.js";

/**
 * 일일 크론 세트에서 **태스크가 통째로 던진** 경우를 사람에게 알린다.
 *
 * 🔴 왜 필요한가: 2026-08-31 실측에서 일일 운세 구독 문서는 2026-08-19T22:00Z(=08-20 07:00 KST)
 * 이후 **한 번도 갱신되지 않았다** — 발송 성공도, 실패 표식(lastMailError)도 없다. 즉 그 12일은
 * "보내다 403 을 받은" 것이 아니라 **루프에 닿기 전에 죽은** 것이다. 그 경로는 지금
 * `console.error("[cron:<name>] task failed:")` 한 줄이 전부라 아무에게도 도달하지 않는다
 * (worker/lib/daily-fortune-task.js 의 설정 오류 알림은 발송을 시도한 뒤에만 울린다).
 *
 * 🔴 실행 1회당 최대 1건. 태스크마다 보내면 커넥션 장애 한 번이 6통이 된다.
 * 🔴 10분 크론(payments-reconcile)에는 붙이지 않는다 — 하루 144회라 알림이 소음이 된다.
 * 🔴 throw 하지 않는다 — 알림 실패가 크론을 죽이면 안 된다(telegram.js 와 같은 계약).
 *
 * @param {object} env
 * @param {Array<{name: string, message: string}>} failures 던진 태스크 목록
 * @param {{ fetchImpl?: Function }} [options] fetchImpl — 실발행 없이 계약을 확인하는 주입구
 * @returns {Promise<{ok: boolean, status: number, error?: string, skipped?: boolean}>}
 */
export async function notifyCronTaskFailures(env, failures, options = {}) {
  const rows = Array.isArray(failures) ? failures.filter((item) => item && item.name) : [];
  if (rows.length === 0) return { ok: true, status: 0, skipped: true };

  const text = [
    "🔴 <b>일일 크론 태스크가 실행 중 죽었다</b>",
    "",
    ...rows.map(({ name, message }) => `• ${escapeTelegramHtml(String(name))}: ${escapeTelegramHtml(String(message || "unknown").slice(0, 200))}`),
    "",
    "이 태스크들은 이번 실행에서 아무 일도 하지 않았다. 일일 운세 메일이 여기 있으면 오늘 발송은 0통이다.",
  ].join("\n");

  const result = await sendTelegramMessage(env, { text, disablePreview: true, fetchImpl: options.fetchImpl });
  if (!result.ok) {
    console.error(`[cron] 태스크 실패 알림 발행 실패 — ${result.error || "unknown"}`);
  }
  return result;
}
