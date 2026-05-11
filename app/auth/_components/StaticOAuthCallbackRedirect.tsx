type StaticOAuthCallbackRedirectProps = {
  provider: "google" | "naver" | "kakao";
};

const AUTH_SYNC_CHANNEL = "code-destiny-auth-sync";
const CONFIGURED_API_BASE = process.env.NEXT_PUBLIC_AUTH_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "";

function buildInlineScript(provider: StaticOAuthCallbackRedirectProps["provider"]) {
  const providerLiteral = JSON.stringify(provider);
  const configuredApiBaseLiteral = JSON.stringify(String(CONFIGURED_API_BASE || ""));
  const fallbackCallbackPathLiteral = JSON.stringify(`/api/auth/oauth/${provider}/callback`);

  return `(() => {
    const provider = ${providerLiteral};
    const configuredApiBase = ${configuredApiBaseLiteral};
    const fallbackCallbackPath = ${fallbackCallbackPathLiteral};
    const statusNode = document.getElementById("oauth-callback-status");
    const fallbackLinkNode = document.getElementById("oauth-callback-fallback-link");

    function setStatus(text) {
      if (statusNode) statusNode.textContent = String(text || "");
    }

    function normalizeBaseUrl(rawValue) {
      const value = String(rawValue || "").trim();
      if (!value) return "";
      try {
        const parsed = new URL(value);
        parsed.pathname = parsed.pathname.replace(/\\/api\\/?$/, "");
        parsed.search = "";
        parsed.hash = "";
        return parsed.toString().replace(/\\/$/, "");
      } catch {
        return value.replace(/\\/api\\/?$/, "").replace(/\\/$/, "");
      }
    }

    function resolveApiBase() {
      let runtimeBase = "";
      try {
        runtimeBase = normalizeBaseUrl(window.CODE_DESTINY_API_BASE_URL);
      } catch {
        runtimeBase = "";
      }

      if (runtimeBase) return runtimeBase;

      const configured = normalizeBaseUrl(configuredApiBase);
      if (configured) return configured;

      return window.location.origin;
    }

    function sanitizeNextPath(rawNext) {
      if (!rawNext) return null;
      const value = String(rawNext);
      if (!value.startsWith("/") || value.startsWith("//")) return null;
      return value;
    }

    function resolveNextPathFromQuery(params) {
      return sanitizeNextPath(params.get("returnTo")) || sanitizeNextPath(params.get("next")) || sanitizeNextPath(params.get("redirect")) || "/";
    }

    function parseOAuthError(rawReason) {
      const reason = String(rawReason || "").trim().toLowerCase();
      if (!reason) return "oauth_failed";
      if (reason === "invalid_callback" || reason === "provider_mismatch") return reason;
      if (reason === "missing_oauth_params") return reason;
      return "oauth_failed";
    }

    async function parseJsonResponse(response) {
      const rawText = await response.text();
      if (!rawText) return {};

      try {
        return JSON.parse(rawText);
      } catch {
        const contentType = (response.headers.get("content-type") || "").toLowerCase();
        const looksLikeHtml = contentType.includes("text/html") || /^\\s*</.test(rawText);
        if (looksLikeHtml) throw new Error("response_is_html");
        throw new Error("response_parse_error");
      }
    }

    function publishAuthSync(event) {
      const payload = { source: "oauth-callback", event, at: Date.now() };
      try {
        window.dispatchEvent(new CustomEvent("cd:auth-changed", { detail: payload }));
      } catch {}
      try {
        if (typeof BroadcastChannel !== "undefined") {
          const channel = new BroadcastChannel(${JSON.stringify(AUTH_SYNC_CHANNEL)});
          channel.postMessage(payload);
          channel.close();
        }
      } catch {}
    }

    function sanitizeAndPersistAuthUser(input) {
      if (!input || typeof input !== "object") return null;
      const source = input;
      const safe = {};

      const copyString = (key) => {
        const value = source[key];
        if (typeof value === "string") {
          const trimmed = value.trim();
          if (trimmed) safe[key] = trimmed;
        }
      };

      copyString("id");
      copyString("userId");
      copyString("_id");
      copyString("uid");
      copyString("name");
      copyString("email");
      copyString("image");
      copyString("role");
      copyString("plan");

      if (typeof source.hasLocalAuth === "boolean") safe.hasLocalAuth = source.hasLocalAuth;

      const points = Number(source.points);
      if (Number.isFinite(points) && points >= 0) safe.points = points;

      const profileSubscription = source.profileSubscription;
      if (profileSubscription && typeof profileSubscription === "object") {
        const sub = profileSubscription;
        safe.profileSubscription = {
          tier: typeof sub.tier === "string" ? sub.tier : "free",
          isActive: !!sub.isActive,
          expiresAt: typeof sub.expiresAt === "string" ? sub.expiresAt : null,
          profileLimit: Number.isFinite(Number(sub.profileLimit)) ? Number(sub.profileLimit) : undefined,
        };
      }

      if (!Object.keys(safe).length) {
        try { localStorage.removeItem("fortune_auth_user"); } catch {}
        return null;
      }

      try {
        localStorage.setItem("fortune_auth_user", JSON.stringify(safe));
      } catch {}

      return safe;
    }

    function persistAuthFromCallback(payload) {
      if (payload && payload.accessToken) {
        try {
          localStorage.setItem("fortune_auth_token", String(payload.accessToken));
        } catch {}
      }

      if (payload && payload.user) {
        const safeUser = sanitizeAndPersistAuthUser(payload.user);
        const role = String((safeUser && safeUser.role) || payload.user.role || "user");
        document.cookie = "fortune_auth_role=" + encodeURIComponent(role) + "; path=/; max-age=604800; samesite=lax";
        publishAuthSync("login");
      }
    }

    function clearIntent() {
      try {
        sessionStorage.removeItem("cd_oauth_intent");
      } catch {}
    }

    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error") || params.get("social_error");
    const socialGrant = params.get("social_grant");
    const code = params.get("code");
    const state = params.get("state");

    const apiBase = resolveApiBase();
    const baseTarget = apiBase + fallbackCallbackPath;
    if (fallbackLinkNode && baseTarget) fallbackLinkNode.setAttribute("href", baseTarget);

    if (oauthError) {
      window.location.replace("/login?error=" + encodeURIComponent(parseOAuthError(oauthError)));
      return;
    }

    if (socialGrant) {
      let intentProvider = "";
      try {
        const rawIntent = sessionStorage.getItem("cd_oauth_intent");
        if (rawIntent) {
          const parsed = JSON.parse(rawIntent);
          intentProvider = String((parsed && parsed.provider) || "").trim().toLowerCase();
        }
      } catch {
        intentProvider = "";
      }

      if (intentProvider && intentProvider !== provider) {
        clearIntent();
        window.location.replace("/login?error=provider_mismatch");
        return;
      }

      setStatus("소셜 로그인 완료를 처리하고 있습니다...");
      fetch(apiBase + "/api/auth/oauth/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ socialGrant }),
      })
        .then(async (response) => {
          const payload = await parseJsonResponse(response);
          if (!response.ok || !payload || !payload.user || !payload.user.id) {
            throw new Error((payload && payload.message) || "oauth_complete_failed");
          }

          persistAuthFromCallback(payload);
          const nextPath = sanitizeNextPath(payload.nextPath || null) || resolveNextPathFromQuery(params);
          clearIntent();

          if (nextPath === "/" || nextPath === "/index.html") {
            window.location.replace("/");
            return;
          }

          window.location.replace(nextPath);
        })
        .catch(() => {
          clearIntent();
          window.location.replace("/login?error=oauth_failed");
        });
      return;
    }

    if (!code || !state) {
      window.location.replace("/login?error=missing_oauth_params");
      return;
    }

    setStatus("인증 서버로 콜백을 전달하고 있습니다...");
    const query = window.location.search || "";
    window.location.replace(baseTarget + query);
  })();`;
}

export default function StaticOAuthCallbackRedirect({ provider }: StaticOAuthCallbackRedirectProps) {
  const callbackPath = `/api/auth/oauth/${provider}/callback`;

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        color: "#f8fafc",
        background: "radial-gradient(120% 90% at 20% 10%, #1f2a44 0%, #0f172a 45%, #020617 100%)",
        fontFamily: "Pretendard, Noto Sans KR, Segoe UI, sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: "460px", textAlign: "center", lineHeight: 1.6 }}>
        <p id="oauth-callback-status" style={{ fontSize: "18px", fontWeight: 600, margin: "0 0 10px" }}>
          소셜 로그인 연결 중입니다...
        </p>
        <p style={{ opacity: 0.85, margin: 0 }}>잠시만 기다려 주세요. 자동으로 이동합니다.</p>
        <p style={{ marginTop: "16px", fontSize: "14px", opacity: 0.9 }}>
          자동 이동이 되지 않으면 <a id="oauth-callback-fallback-link" href={callbackPath} style={{ textDecoration: "underline" }}>콜백 계속</a>
        </p>
      </div>
      <script dangerouslySetInnerHTML={{ __html: buildInlineScript(provider) }} />
    </main>
  );
}
