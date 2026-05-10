"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../../_lib/api-config";
import { persistSanitizedAuthUser } from "../../_lib/auth-storage";

type StaticOAuthCallbackRedirectProps = {
  provider: "google" | "naver" | "kakao";
};

type OAuthCompletePayload = {
  ok?: boolean;
  message?: string;
  nextPath?: string;
  accessToken?: string;
  user?: {
    id?: string;
    role?: string;
  };
};

const AUTH_SYNC_CHANNEL = "code-destiny-auth-sync";
const IS_DEV = process.env.NODE_ENV !== "production";

function authInfo(...args: unknown[]) {
  if (!IS_DEV) return;
  console.info(...args);
}

function authWarn(...args: unknown[]) {
  if (!IS_DEV) return;
  console.warn(...args);
}

function sanitizeNextPath(rawNext: string | null) {
  if (!rawNext) return null;
  if (!rawNext.startsWith("/") || rawNext.startsWith("//")) return null;
  return rawNext;
}

function resolveNextPathFromQuery(params: URLSearchParams) {
  return sanitizeNextPath(params.get("returnTo")) || sanitizeNextPath(params.get("next")) || sanitizeNextPath(params.get("redirect")) || "/";
}

function parseOAuthError(rawReason: string | null): string {
  const reason = String(rawReason || "").trim().toLowerCase();
  if (!reason) return "oauth_failed";
  if (reason === "invalid_callback" || reason === "provider_mismatch") return reason;
  if (reason === "missing_oauth_params") return reason;
  return "oauth_failed";
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const rawText = await response.text();
  if (!rawText) return {} as T;

  try {
    return JSON.parse(rawText) as T;
  } catch {
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    const looksLikeHtml = contentType.includes("text/html") || /^\s*</.test(rawText);

    if (looksLikeHtml) {
      throw new Error("서버가 JSON 대신 HTML을 반환했습니다. 배포/캐시 상태를 확인해 주세요.");
    }

    throw new Error("서버 응답 파싱 중 오류가 발생했습니다.");
  }
}

function publishAuthSync(event: "login" | "logout") {
  if (typeof window === "undefined") return;
  const payload = { source: "oauth-callback", event, at: Date.now() };

  try {
    window.dispatchEvent(new CustomEvent("cd:auth-changed", { detail: payload }));
  } catch {
    // ignore
  }

  try {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(AUTH_SYNC_CHANNEL);
      channel.postMessage(payload);
      channel.close();
    }
  } catch {
    // ignore
  }
}

function persistAuthFromCallback(payload: OAuthCompletePayload) {
  if (typeof window === "undefined") return;

  if (payload.accessToken) {
    try {
      localStorage.setItem("fortune_auth_token", String(payload.accessToken));
    } catch {
      // ignore storage failures
    }
  }

  if (payload.user) {
    const safeUser = persistSanitizedAuthUser(payload.user);
    const role = String((safeUser && safeUser.role) || payload.user.role || "user");
    document.cookie = `fortune_auth_role=${encodeURIComponent(role)}; path=/; max-age=604800; samesite=lax`;
    publishAuthSync("login");
  }
}

export default function StaticOAuthCallbackRedirect({ provider }: StaticOAuthCallbackRedirectProps) {
  const apiBase = useMemo(() => getApiBaseUrl(), []);
  const baseTarget = `${apiBase}/api/auth/oauth/${provider}/callback`;
  const [statusText, setStatusText] = useState("콜백 상태를 확인하고 있습니다...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error") || params.get("social_error");
    const socialGrant = params.get("social_grant");
    const code = params.get("code");
    const state = params.get("state");

    const storedIntentRaw = (() => {
      try {
        return sessionStorage.getItem("cd_oauth_intent");
      } catch {
        return "";
      }
    })();

    if (oauthError) {
      authWarn("[AUTH] oauth callback failed", oauthError);
      const reason = parseOAuthError(oauthError);
      window.location.replace(`/login?error=${encodeURIComponent(reason)}`);
      return;
    }

    if (socialGrant) {
      let intentProvider = "";
      if (storedIntentRaw) {
        try {
          const parsed = JSON.parse(storedIntentRaw) as { provider?: string };
          intentProvider = String(parsed?.provider || "").trim().toLowerCase();
        } catch {
          intentProvider = "";
        }
      }

      if (intentProvider && intentProvider !== provider) {
        try {
          sessionStorage.removeItem("cd_oauth_intent");
        } catch {
          // ignore
        }
        authWarn("[AUTH] oauth callback failed", "provider_mismatch");
        window.location.replace("/login?error=provider_mismatch");
        return;
      }

      setStatusText("소셜 로그인 완료를 처리하고 있습니다...");
      authInfo("[AUTH] oauth callback processing");

      fetch(`${apiBase}/api/auth/oauth/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ socialGrant }),
      })
        .then(async (response) => {
          const payload = await parseJsonResponse<OAuthCompletePayload>(response);
          if (!response.ok || !payload?.user?.id) {
            throw new Error(payload?.message || "oauth_complete_failed");
          }

          persistAuthFromCallback(payload);
          const nextPath = sanitizeNextPath(payload.nextPath || null) || resolveNextPathFromQuery(params);
          authInfo("[AUTH] oauth callback success");
          authInfo("[AUTH] redirect target", nextPath);

          try {
            sessionStorage.removeItem("cd_oauth_intent");
          } catch {
            // ignore
          }

          if (nextPath === "/" || nextPath === "/index.html") {
            window.location.replace("/");
            return;
          }
          window.location.replace(nextPath);
        })
        .catch((error) => {
          authWarn("[AUTH] oauth callback failed", error instanceof Error ? error.message : error);
          try {
            sessionStorage.removeItem("cd_oauth_intent");
          } catch {
            // ignore
          }
          window.location.replace("/login?error=oauth_failed");
        });
      return;
    }

    if (!code || !state) {
      window.location.replace("/login?error=missing_oauth_params");
      return;
    }

    setStatusText("인증 서버로 콜백을 전달하고 있습니다...");
    authInfo("[AUTH] oauth callback processing");
    const query = window.location.search || "";
    window.location.replace(`${baseTarget}${query}`);
  }, [baseTarget]);

  return (
    <main style={{ padding: "24px", fontFamily: "sans-serif" }}>
      <p>{statusText}</p>
      <p>
        If you are not redirected, continue to <a href={baseTarget}>callback</a>.
      </p>
    </main>
  );
}
