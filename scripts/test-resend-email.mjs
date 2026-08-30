import { config } from "dotenv";
import { DEFAULT_EMAIL_FROM, isResendConfigFailure, sendEmail } from "../worker/lib/resend.js";

config({ path: ".env.local" });

const live = process.argv.includes("--live");
const checkDomains = process.argv.includes("--check-domains");
const to = String(process.env.AUTH_EMAIL_TEST_TO || "").trim();
const apiKey = String(process.env.RESEND_API_KEY || process.env.emailapi || "").trim();
const sender = String(process.env.EMAIL_FROM || process.env.RESEND_FROM || "").trim() || DEFAULT_EMAIL_FROM;
const senderDomain = /@([^\s>]+)/.exec(sender)?.[1] || "";

/**
 * 🔴 --check-domains 는 메일을 한 통도 보내지 않는다. Resend 의 도메인 목록(GET /domains)만 읽어
 * "지금 이 API 키가 보는 계정에 발신 도메인이 인증돼 있는가"에 답한다.
 *
 * `403 The <domain> domain is not verified` 의 원인은 둘인데 응답만으로는 구별되지 않는다:
 *   (a) 그 도메인이 정말 미인증이다
 *   (b) 도메인은 인증돼 있지만 **워커에 들어간 키가 다른 계정/팀 소속**이다
 * 목록에 도메인이 아예 안 보이면 (b), status 가 verified 가 아니면 (a) 다.
 */
if (checkDomains) {
  if (!apiKey) {
    console.error("RESEND_API_KEY (or emailapi) is required for --check-domains.");
    process.exit(1);
  }

  const response = await fetch("https://api.resend.com/domains", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = String(payload?.message || payload?.error || `http_${response.status}`);
    console.error(`Domain lookup failed (status=${response.status}): ${message}`);
    console.error(
      isResendConfigFailure(response.status, message)
        ? "이 키로는 계정을 읽지 못한다 — 키가 폐기됐거나 다른 계정 소속이다."
        : "일시적 오류일 수 있다 — 다시 실행해 볼 것.",
    );
    process.exit(1);
  }

  const domains = Array.isArray(payload?.data) ? payload.data : [];
  console.log(`Sender: ${sender}`);
  console.log(`Domains visible to this API key: ${domains.length}`);
  for (const domain of domains) {
    console.log(`  - ${String(domain?.name || "?")}  status=${String(domain?.status || "?")}  region=${String(domain?.region || "?")}`);
  }

  const match = domains.find((domain) => String(domain?.name || "").toLowerCase() === senderDomain.toLowerCase());
  if (!match) {
    console.error(`\nFAIL: ${senderDomain} 이 이 키가 보는 계정에 없다 — 키가 다른 Resend 계정/팀 소속이다.`);
    process.exit(1);
  }
  if (String(match.status || "").toLowerCase() !== "verified") {
    console.error(`\nFAIL: ${senderDomain} 이 인증되지 않았다 (status=${match.status}) — DNS 레코드를 확인할 것.`);
    process.exit(1);
  }

  console.log(`\nPASS: ${senderDomain} verified.`);
  process.exit(0);
}

if (!live) {
  console.log("DRY RUN: add --live to send a real test email, or --check-domains to verify the sender domain without sending.");
  process.exit(0);
}

if (!apiKey || !to) {
  console.error("RESEND_API_KEY (or emailapi) and AUTH_EMAIL_TEST_TO are required for --live.");
  process.exit(1);
}

const result = await sendEmail(
  { RESEND_API_KEY: apiKey, EMAIL_FROM: process.env.EMAIL_FROM || process.env.RESEND_FROM || "" },
  {
    to,
    subject: "Code Destiny email configuration test",
    html: "<p>Email delivery is configured.</p>",
  },
);

if (!result.ok) {
  console.error(`Email test failed (status=${Number(result.status || 0)}).`);
  if (result.configError) {
    console.error("설정성 실패다 — `npm run diag:resend-domains` 로 도메인 인증 상태를 먼저 확인할 것.");
  }
  process.exit(1);
}

console.log(`Email test accepted (status=${Number(result.status || 0)}).`);
