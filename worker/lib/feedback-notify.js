// 버그 제보 알림 디스패처.
//
// 채널은 관리자 메일(Resend) + 선택적 웹훅(Discord/Slack)이다. env가 없으면 해당 채널은
// 목록에 들어가지도 않으므로 미설정 시 완전히 무동작이다.
//
// 🔴 이 모듈은 절대 throw 하지 않는다. 알림 실패가 제보 접수를 실패시키면 안 된다.

import { getEnv } from "./env.js";
import { sendEmail } from "./resend.js";
import {
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_PRIORITY_LABELS,
  FEEDBACK_STATUS_LABELS,
} from "./feedback-models.js";

// daily-fortune-task.js 의 동명 헬퍼를 export 하도록 고치면 제보 요청마다 크론 태스크
// 의존(구독·사주계산) 전체가 번들에 들어온다. Worker 1MB 제약 때문에 6줄을 의도적으로 복제한다.
function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function labelOf(map, key, fallback = "") {
  return map[String(key || "")] || String(key || "") || fallback;
}

function clamp(value, max) {
  const text = String(value || "").trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

// ── 웹훅 채널 ────────────────────────────────────────────────────────────────
// "스텁"을 두지 않는 이유: Discord/Slack 둘 다 단일 JSON POST 라 실구현이 스텁보다 짧다.
// 스텁을 두면 읽히지 않는 env 조회와 not_implemented 반환이 남아 데드코드가 된다.
// Telegram 은 봇 토큰 + chat_id 두 개와 다른 URL 형태가 필요해 이 표에 안 맞는다 — 필요해지면 추가한다.
const WEBHOOK_CHANNELS = Object.freeze([
  { name: "discord", envKey: "FEEDBACK_DISCORD_WEBHOOK_URL", buildBody: (text) => ({ content: text.slice(0, 1900) }) },
  { name: "slack", envKey: "FEEDBACK_SLACK_WEBHOOK_URL", buildBody: (text) => ({ text: text.slice(0, 3000) }) },
]);

async function postWebhook(url, payload) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    return { ok: response.ok, status: response.status };
  } catch (error) {
    return { ok: false, status: 0, error: String(error?.message || "webhook_failed") };
  }
}

function buildNotificationText(doc) {
  const lines = [
    `🐞 새 제보 · ${labelOf(FEEDBACK_CATEGORY_LABELS, doc?.category)}`,
    clamp(doc?.title, 80),
    doc?.url ? `URL: ${clamp(doc.url, 200)}` : "",
    clamp(doc?.content, 400),
  ];
  return lines.filter(Boolean).join("\n");
}

// ── 관리자 메일 ──────────────────────────────────────────────────────────────
function renderRow(label, value) {
  if (!value) return "";
  return `<tr>
      <td style="padding:6px 12px 6px 0;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:6px 0;color:#111827;font-size:13px;word-break:break-all;">${escapeHtml(value)}</td>
    </tr>`;
}

function buildAdminEmailHtml(doc, { attachmentUrls }) {
  const categoryLabel = labelOf(FEEDBACK_CATEGORY_LABELS, doc?.category);
  const priorityLabel = labelOf(FEEDBACK_PRIORITY_LABELS, doc?.priority);
  const statusLabel = labelOf(FEEDBACK_STATUS_LABELS, doc?.status);

  // 🔴 client 는 사용자 브라우저가 보낸 값이다. 라벨·값 모두 예외 없이 이스케이프한다.
  const clientRows = (Array.isArray(doc?.client) ? doc.client : [])
    .map((entry) => renderRow(entry?.label || entry?.key, entry?.value))
    .join("");

  const detailRows = (Array.isArray(doc?.details) ? doc.details : [])
    .map((entry) => renderRow(entry?.label || entry?.key, entry?.value))
    .join("");

  const attachmentsHtml = (attachmentUrls || []).length
    ? `<div style="margin:20px 0 0;">
        <div style="color:#6b7280;font-size:13px;margin-bottom:8px;">첨부 ${attachmentUrls.length}건</div>
        ${attachmentUrls.map((url, index) => `<a href="${escapeHtml(url)}" style="display:inline-block;margin:0 8px 8px 0;padding:8px 14px;border:1px solid #e5e7eb;border-radius:8px;color:#4f46e5;font-size:13px;text-decoration:none;">이미지 ${index + 1} 열기</a>`).join("")}
      </div>`
    : "";

  const flagsHtml = (Array.isArray(doc?.autoFlagReasons) ? doc.autoFlagReasons : []).length
    ? `<div style="margin:16px 0 0;padding:10px 14px;background:#fef3c7;border-radius:8px;color:#92400e;font-size:13px;">
        자동 플래그: ${escapeHtml(doc.autoFlagReasons.join(", "))}
      </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 12px;background:#f3f4f6;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.06);">
    <div style="padding:24px;background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);color:#ffffff;">
      <div style="font-size:12px;letter-spacing:.16em;opacity:.85;">CODE DESTINY 연구소</div>
      <div style="margin-top:8px;font-size:20px;font-weight:700;line-height:1.4;">${escapeHtml(categoryLabel)} · ${escapeHtml(clamp(doc?.title, 80))}</div>
    </div>

    <div style="padding:24px;">
      <table style="width:100%;border-collapse:collapse;">
        ${renderRow("분류", categoryLabel)}
        ${renderRow("우선순위", priorityLabel)}
        ${renderRow("상태", statusLabel)}
        ${renderRow("제보자", `${doc?.authorName || "이름 없음"}${doc?.authorEmail ? ` <${doc.authorEmail}>` : ""}`)}
        ${renderRow("회원번호", doc?.userId)}
        ${renderRow("제보 대상", doc?.url)}
        ${detailRows}
        ${clientRows}
      </table>

      <div style="margin:20px 0 0;padding:16px;background:#f9fafb;border-radius:10px;border:1px solid #e5e7eb;color:#111827;font-size:14px;line-height:1.7;white-space:pre-wrap;word-break:break-word;">${escapeHtml(doc?.content)}</div>

      ${attachmentsHtml}
      ${flagsHtml}
    </div>

    <div style="padding:16px 24px;background:#f9fafb;color:#9ca3af;font-size:12px;text-align:center;">
      이 메일은 버그 제보실 접수 알림입니다.
    </div>
  </div>
</body>
</html>`;
}

async function sendAdminEmail(env, doc, { attachmentUrls }) {
  // 하드코딩 폴백 주소를 두지 않는다(CLAUDE.md 환경변수 규칙).
  // 수신자가 없으면 제보는 정상 저장되고 알림만 건너뛴다.
  const to = String(getEnv(env, "ADMIN_FEEDBACK_EMAIL") || "").trim();
  if (!to) return { channel: "email", ok: true, skipped: "no_recipient" };

  const subject = `[제보] ${labelOf(FEEDBACK_CATEGORY_LABELS, doc?.category)} · ${clamp(doc?.title, 40)}`;
  const result = await sendEmail(env, {
    to,
    subject,
    html: buildAdminEmailHtml(doc, { attachmentUrls }),
  });

  return { channel: "email", ok: Boolean(result?.ok), status: result?.status, error: result?.error };
}

/**
 * 신규 제보 알림을 모든 설정된 채널로 보낸다.
 * 어떤 채널이 실패해도 throw 하지 않고 요약을 돌려준다.
 */
export async function notifyNewFeedback(env, doc, { attachmentUrls = [] } = {}) {
  try {
    const text = buildNotificationText(doc);

    const tasks = [sendAdminEmail(env, doc, { attachmentUrls })];
    for (const channel of WEBHOOK_CHANNELS) {
      const url = String(getEnv(env, channel.envKey) || "").trim();
      if (!url) continue;
      tasks.push(postWebhook(url, channel.buildBody(text)).then((result) => ({ channel: channel.name, ...result })));
    }

    const settled = await Promise.allSettled(tasks);
    const results = settled.map((entry) => (entry.status === "fulfilled" ? entry.value : { ok: false, error: String(entry.reason?.message || "notify_failed") }));
    const failed = results.filter((entry) => entry?.ok === false);

    return { ok: failed.length === 0, error: failed[0]?.error || "", results };
  } catch (error) {
    return { ok: false, error: String(error?.message || "notify_failed"), results: [] };
  }
}

