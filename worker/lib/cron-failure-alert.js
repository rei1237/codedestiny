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
 * 🔴 "던지지 않았다"는 "일했다"가 아니다. 구독자를 하나도 못 찾은 실행은 정상 반환하면서도
 * 결과는 0통으로 같다 — 그 경로가 12일 침묵과 겉모습이 같아서, 조용히 아무것도 안 한 태스크
 * (`idle`)도 같은 한 통에 함께 싣는다. 알림 통수는 늘리지 않는다.
 *
 * @param {object} env
 * @param {Array<{name: string, message: string}>} failures 던진 태스크 목록
 * @param {{ fetchImpl?: Function, idle?: Array<{name: string, detail: string}> }} [options]
 *   fetchImpl — 실발행 없이 계약을 확인하는 주입구. idle — 던지지 않았지만 아무 일도 안 한 태스크.
 * @returns {Promise<{ok: boolean, status: number, error?: string, skipped?: boolean}>}
 */
export async function notifyCronTaskFailures(env, failures, options = {}) {
  const rows = Array.isArray(failures) ? failures.filter((item) => item && item.name) : [];
  const idleRows = Array.isArray(options.idle) ? options.idle.filter((item) => item && item.name) : [];
  if (rows.length === 0 && idleRows.length === 0) return { ok: true, status: 0, skipped: true };

  const lines = [];
  if (rows.length > 0) {
    lines.push(
      "🔴 <b>일일 크론 태스크가 실행 중 죽었다</b>",
      "",
      ...rows.map(({ name, message }) => `• ${escapeTelegramHtml(String(name))}: ${escapeTelegramHtml(String(message || "unknown").slice(0, 200))}`),
      "",
      "이 태스크들은 이번 실행에서 아무 일도 하지 않았다. 일일 운세 메일이 여기 있으면 오늘 발송은 0통이다.",
    );
  }
  if (idleRows.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push(
      "⚠️ <b>일일 크론 태스크가 던지지 않고 아무 일도 하지 않았다</b>",
      "",
      ...idleRows.map(({ name, detail }) => `• ${escapeTelegramHtml(String(name))}: ${escapeTelegramHtml(String(detail || "발송 0").slice(0, 200))}`),
      "",
      "예외가 아니므로 로그에도 실패로 남지 않는다. 대상 조회가 비었는지부터 본다.",
    );
  }
  const text = lines.join("\n");

  const result = await sendTelegramMessage(env, { text, disablePreview: true, fetchImpl: options.fetchImpl });
  if (!result.ok) {
    console.error(`[cron] 태스크 실패 알림 발행 실패 — ${result.error || "unknown"}`);
  }
  return result;
}
