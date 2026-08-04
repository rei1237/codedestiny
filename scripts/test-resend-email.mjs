import { config } from "dotenv";
import { sendEmail } from "../worker/lib/resend.js";

config({ path: ".env.local" });

const live = process.argv.includes("--live");
const to = String(process.env.AUTH_EMAIL_TEST_TO || "").trim();
const apiKey = String(process.env.RESEND_API_KEY || process.env.emailapi || "").trim();

if (!live) {
  console.log("DRY RUN: add --live to send a real test email.");
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
  process.exit(1);
}

console.log(`Email test accepted (status=${Number(result.status || 0)}).`);
