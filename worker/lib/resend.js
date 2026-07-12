import { getEnv } from "./env.js";

/**
 * Resend Email Utility for Cloudflare Worker.
 */
export async function sendEmail(env, { to, subject, html, from, headers }) {
  const apiKey = getEnv(env, "RESEND_API_KEY") || getEnv(env, "emailapi");
  if (!apiKey) {
    console.error("[EMAIL] Resend API key is missing. Set emailapi or RESEND_API_KEY.");
    return { ok: false, error: "missing_api_key", status: 0, data: { missing: ["emailapi", "RESEND_API_KEY"] } };
  }

  const configuredFrom = from || getEnv(env, "EMAIL_FROM") || getEnv(env, "RESEND_FROM");
  if (!configuredFrom) {
    console.warn("[EMAIL] EMAIL_FROM/RESEND_FROM missing; using default sender.");
  }

  const payload = {
    from: configuredFrom || "Code Destiny <admin@code-destiny.com>",
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
      console.error("[EMAIL] Resend API error:", {
        status: response.status,
        error: errorMessage,
        data,
      });
      return { ok: false, error: errorMessage, status: response.status, data };
    }

    return { ok: true, status: response.status, data };
  } catch (error) {
    console.error("[EMAIL] Failed to send email via Resend:", error);
    return { ok: false, error: String(error?.message || "resend_request_failed"), status: 0 };
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
