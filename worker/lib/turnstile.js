const TURNSTILE_SITE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TURNSTILE_VERIFY_TIMEOUT_MS = 4500;

function sanitizeTurnstileToken(raw) {
  const token = String(raw || "").trim();
  if (!token) return "";
  if (token.length < 20 || token.length > 2048) return "";
  if (/\s/.test(token)) return "";
  return token;
}

export function extractTurnstileToken(body = {}) {
  return sanitizeTurnstileToken(
    body?.turnstileToken || body?.["cf-turnstile-response"] || body?.cfTurnstileResponse || "",
  );
}

async function runTurnstileRequest(payload, timeoutMs = TURNSTILE_VERIFY_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const form = new URLSearchParams(payload);

  try {
    const response = await fetch(TURNSTILE_SITE_VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        success: false,
        code: "turnstile_verify_http_error",
        message: "Turnstile siteverify request failed.",
        status: response.status,
      };
    }

    const data = await response.json();
    const errors = Array.isArray(data["error-codes"]) ? data["error-codes"] : [];
    const firstError = String(errors[0] || "").trim();
    if (!data?.success) {
      return {
        success: false,
        code: firstError || "turnstile_verification_failed",
        message: firstError
          ? `Turnstile verification failed: ${firstError}.`
          : "Turnstile verification failed.",
        status: 403,
      };
    }

    return {
      success: true,
      hostname: String(data.hostname || ""),
      action: String(data.action || ""),
      cdata: String(data.cdata || ""),
      code: "",
      message: "Turnstile verification succeeded.",
      status: 200,
    };
  } catch (error) {
    const timeoutText = error?.name === "AbortError" ? "Turnstile verification timed out." : "Turnstile verification request failed.";
    return {
      success: false,
      code: error?.name === "AbortError" ? "turnstile_verify_timeout" : "turnstile_verify_exception",
      message: timeoutText,
      status: 403,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function verifyTurnstileToken({
  secret,
  response,
  remoteip,
  timeoutMs = TURNSTILE_VERIFY_TIMEOUT_MS,
}) {
  const normalizedToken = sanitizeTurnstileToken(response);
  const normalizedSecret = String(secret || "").trim();
  if (!normalizedSecret) {
    return {
      success: false,
      code: "turnstile_secret_missing",
      message: "Turnstile secret key is not configured.",
      status: 500,
    };
  }

  if (!normalizedToken) {
    return {
      success: false,
      code: "turnstile_token_invalid",
      message: "Turnstile token is missing or malformed.",
      status: 401,
    };
  }

  const payload = {
    secret: normalizedSecret,
    response: normalizedToken,
  };
  if (remoteip) payload.remoteip = String(remoteip).slice(0, 120);

  return runTurnstileRequest(payload, timeoutMs);
}
