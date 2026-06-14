import { getEnv } from "./env.js";

/**
 * Resend Email Utility for Cloudflare Worker.
 */
export async function sendEmail(env, { to, subject, html, from, headers }) {
  const apiKey = getEnv(env, "emailapi");
  if (!apiKey) {
    console.error("[EMAIL] Resend API key (emailapi) is missing in environment.");
    return { ok: false, error: "missing_api_key" };
  }

  const payload = {
    from: from || "Code Destiny <noreply@code-destiny.com>",
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

    const data = await response.json();

    if (!response.ok) {
      console.error("[EMAIL] Resend API error:", data);
      return { ok: false, error: data.message || "resend_error", data };
    }

    return { ok: true, data };
  } catch (error) {
    console.error("[EMAIL] Failed to send email via Resend:", error);
    return { ok: false, error: error.message };
  }
}
