type StaticOAuthCallbackRedirectProps = {
  provider: "google" | "naver" | "kakao";
};

const AUTH_SYNC_CHANNEL = "code-destiny-auth-sync";
const CONFIGURED_API_BASE = process.env.NEXT_PUBLIC_EFFECTIVE_API_BASE_URL || "";

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
    const isDev = /(^localhost$|^127\\.0\\.0\\.1$|\\.local$)/i.test(String(window.location.hostname || ""));

    function setStatus(text) {
      if (statusNode) statusNode.textContent = String(text || "");
    }

    function debugAuth() {
      if (!isDev || typeof console === "undefined" || typeof console.debug !== "function") return;
      try {
        console.debug.apply(console, arguments);
      } catch (e) {}
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
      } catch (e) {
        return value.replace(/\\/api\\/?$/, "").replace(/\\/$/, "");
      }
    }

    function isLocalBaseUrl(rawValue) {
      const value = normalizeBaseUrl(rawValue);
      if (!value) return false;
      try {
        const hostname = new URL(value).hostname.toLowerCase();
        return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
      } catch (e) {
        return /^https?:\\/\\/(localhost|127\\.0\\.0\\.1|\\[::1\\])(?::\\d+)?$/i.test(value);
      }
    }

    function isWorkersDevBaseUrl(rawValue) {
      const value = normalizeBaseUrl(rawValue);
      if (!value) return false;
      try {
        const hostname = new URL(value).hostname.toLowerCase();
        return hostname === "workers.dev" || hostname.endsWith(".workers.dev");
      } catch (e) {
        return /workers\\.dev/i.test(value);
      }
    }

    function resolveApiBase() {
      let runtimeBase = "";
      try {
        runtimeBase = normalizeBaseUrl(window.CODE_DESTINY_API_BASE_URL);
      } catch (e) {
        runtimeBase = "";
      }

      const currentOrigin = normalizeBaseUrl(window.location.origin);
      const currentHostIsWorkersDev = isWorkersDevBaseUrl(currentOrigin);

      if (isLocalBaseUrl(currentOrigin)) return currentOrigin;
      if (runtimeBase && !isLocalBaseUrl(runtimeBase)) return runtimeBase;

      const configured = normalizeBaseUrl(configuredApiBase);
      if (configured && !isLocalBaseUrl(configured) && (!isWorkersDevBaseUrl(configured) || currentHostIsWorkersDev)) return configured;

      return currentOrigin || window.location.origin;
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
      } catch (e) {
        const contentType = (response.headers.get("content-type") || "").toLowerCase();
        const looksLikeHtml = contentType.includes("text/html") || /^\\s*</.test(rawText);
        if (looksLikeHtml) throw new Error("response_is_html");
        throw new Error("response_parse_error");
      }
    }

    function sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async function fetchWithTimeout(url, init, timeoutMs) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        return await fetch(url, {
          ...init,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }
    }

    function publishAuthSync(event) {
      const payload = { source: "oauth-callback", event, at: Date.now() };
      try {
        window.dispatchEvent(new CustomEvent("cd:auth-changed", { detail: payload }));
      } catch (e) {}
      try {
        if (typeof BroadcastChannel !== "undefined") {
          const channel = new BroadcastChannel(${JSON.stringify(AUTH_SYNC_CHANNEL)});
          channel.postMessage(payload);
          channel.close();
        }
      } catch (e) {}
    }

    function clearStaleGuestCache() {
      const staleKeys = [
        "fortune_auth_user",
        "fortune_profile_subscription",
        "fortune_profile_subscription_owner",
        "fortune_user_points",
      ];
      for (let i = 0; i < staleKeys.length; i += 1) {
        try { localStorage.removeItem(staleKeys[i]); } catch (e) {}
      }
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
        try { localStorage.removeItem("fortune_auth_user"); } catch (e) {}
        return null;
      }

      try {
        localStorage.setItem("fortune_auth_user", JSON.stringify(safe));
      } catch (e) {}

      return safe;
    }

    function persistAuthFromCallback(payload) {
      try {
        localStorage.removeItem("fortune_auth_token");
      } catch (e) {}

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
      } catch (e) {}
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

    // 아직 계정이 없는 소셜 신원. 생년월일을 받아야 계정을 만들 수 있어 가입 마무리 화면으로 보낸다.
    var socialSignupTicket = params.get("social_signup");
    if (socialSignupTicket) {
      var signupParams = new URLSearchParams({ social_signup: socialSignupTicket });
      var signupNext = params.get("next");
      if (signupNext) signupParams.set("next", signupNext);
      // 공급자가 번호를 넘겼다는 표시를 그대로 옮긴다 — 빠뜨리면 가입 마무리 화면이 이미 확보된
      // 번호를 다시 묻는다(서버는 티켓 값을 쓰므로 그 입력값은 어차피 버려진다).
      if (params.get("social_phone") === "1") signupParams.set("social_phone", "1");
      window.location.replace("/signup?" + signupParams.toString());
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
      } catch (e) {
        intentProvider = "";
      }

      if (intentProvider && intentProvider !== provider) {
        clearIntent();
        window.location.replace("/login?error=provider_mismatch");
        return;
      }

      setStatus("우주의 좌표를 동기화하는 중... 잠시만 기다려 주세요.");
      debugAuth("[auth] login started");
      clearStaleGuestCache();

      const completeUrl = apiBase + "/api/auth/oauth/complete";
      const meUrl = apiBase + "/api/auth/me";
      const MAX_RETRIES = 3;
      const RETRY_BASE_DELAY_MS = 250;
      // OAuth 완료(/oauth/complete)·/me는 워커가 인증+세션생성으로 콜드 시 ~12s+ 걸린다. 12000이면
      // 정상 완료를 클라가 먼저 끊어 계정전환/로그인이 실패한다(index.html resolveTimeoutMs는 이 콜백
      // 페이지가 안 타므로 여기서 직접 올려야 실효가 있다).
      const REQUEST_TIMEOUT_MS = 20000;
      const flowSeq = Number(window.__cdOAuthFlowSeq || 0) + 1;
      window.__cdOAuthFlowSeq = flowSeq;
      function isStaleFlow() {
        return Number(window.__cdOAuthFlowSeq || 0) !== flowSeq;
      }

      // 이번 로그인이 의도한 사용자(B)의 id — social_grant(JWT)의 payload에서 읽는다. 서명 검증은
      // 서버(/oauth/complete)가 하며, 여기선 stale 세션 판별용으로만 payload를 디코드한다(신뢰 아님).
      // ⚠️ 이 함수는 buildInlineScript 템플릿 리터럴(문자열) 안이라 브라우저에 그대로 주입된다 —
      //    TypeScript 타입 표기(: string 등)를 절대 넣지 말 것(브라우저 SyntaxError로 로그인 전체가 죽는다).
      function decodeGrantUserId(grant) {
        try {
          const parts = String(grant || "").split(".");
          if (parts.length < 2 || !parts[1]) return "";
          let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
          while (b64.length % 4) b64 += "=";
          const obj = JSON.parse(atob(b64));
          return String((obj && (obj.userId || obj.sub)) || "").trim();
        } catch (e) {
          return "";
        }
      }
      const intendedUserId = decodeGrantUserId(socialGrant);

      async function tryLoadMe() {
        try {
          const meResponse = await fetchWithTimeout(meUrl, {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }, REQUEST_TIMEOUT_MS);
          if (meResponse.ok) {
            const mePayload = await parseJsonResponse(meResponse);
            if (mePayload && mePayload.user && mePayload.user.id) {
              // 신원 대조: /me가 반환한 사용자가 이번 로그인(grant)이 의도한 B와 다르면 = 직전 계정 A의
              // 살아있는 세션이다. 이를 채택하면 B 로그인이 조용히 A로 남는다(계정 전환 실패). 거부한다.
              // (grant 디코드가 실패해 intendedUserId가 비면 기존 동작 유지 — 해피패스를 깨지 않기 위함.)
              if (intendedUserId && String(mePayload.user.id) !== intendedUserId) {
                debugAuth("[auth] /me identity mismatch — stale session ignored");
                return null;
              }
              return { ...mePayload, nextPath: resolveNextPathFromQuery(params) };
            }
          }
        } catch (e) {
          // ignore probe errors
        }
        return null;
      }

      (async () => {
        let payload = null;
        let lastError = null;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
          // 재시도 전, 직전 시도가 이미 성공했는데 응답만 유실된 상황인지 /me로 확인한다.
          // 이미 로그인됐다면 socialGrant를 다시 교환(중복 refresh 세션 생성)하지 않고 종료.
          if (attempt > 0) {
            const mePayload = await tryLoadMe();
            if (mePayload) {
              payload = mePayload;
              debugAuth("[auth] me loaded via pre-retry probe", mePayload.user.id);
              break;
            }
          }
          try {
            const response = await fetchWithTimeout(completeUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ socialGrant }),
            }, REQUEST_TIMEOUT_MS);

            const parsed = await parseJsonResponse(response);
            if (!response.ok || !parsed || !parsed.user || !parsed.user.id) {
              const retryable = response.status >= 500;
              if (retryable && attempt < MAX_RETRIES - 1) {
                await sleep(RETRY_BASE_DELAY_MS * (attempt + 1));
                continue;
              }
              throw new Error((parsed && parsed.message) || "oauth_complete_failed");
            }

            payload = parsed;
            debugAuth("[auth] login api success");
            break;
          } catch (error) {
            lastError = error;
            const message = String(error && error.message ? error.message : "");
            const retryable = (
              message === "response_is_html"
              || message.includes("network")
              || message.includes("timeout")
              || message.includes("abort")
              || message.includes("Failed to fetch")
              || message.includes("oauth_service_unavailable")
            );

            if (retryable && attempt < MAX_RETRIES - 1) {
              await sleep(RETRY_BASE_DELAY_MS * (attempt + 1));
              continue;
            }
          }
        }

        if (!payload || !payload.user || !payload.user.id) {
          const mePayload = await tryLoadMe();
          if (mePayload) {
            payload = mePayload;
            debugAuth("[auth] me loaded", mePayload.user.id);
          }
        }

        if (isStaleFlow()) {
          return;
        }

        if (payload && payload.user && payload.user.id) {
          debugAuth("[auth] me loaded", payload.user.id);
        }

        if (!payload || !payload.user || !payload.user.id) {
          clearIntent();
          const reason = encodeURIComponent(String((lastError && lastError.message) || "oauth_failed"));
          window.location.replace("/login?error=" + reason);
          return;
        }

        persistAuthFromCallback(payload);
        debugAuth("[auth] auth store updated");


        if (isStaleFlow()) {
          return;
        }

        setStatus("별빛 여정이 시작되었습니다.");
        const nextPath = sanitizeNextPath(payload.nextPath || null) || resolveNextPathFromQuery(params);
        clearIntent();
        debugAuth("[auth] redirect to home");

        if (nextPath === "/" || nextPath === "/index.html") {
          window.location.replace("/");
          return;
        }

        window.location.replace(nextPath);
      })();
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
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 18px",
        color: "#f8fafc",
        background: "radial-gradient(120% 95% at 14% 10%, rgba(87,103,255,0.22) 0%, rgba(7,12,27,0.0) 44%), radial-gradient(130% 120% at 86% 22%, rgba(197,80,255,0.22) 0%, rgba(7,12,27,0) 44%), linear-gradient(165deg, #050914 0%, #0b1224 44%, #221744 80%, #2e1a4a 100%)",
        fontFamily: "Pretendard, Noto Sans KR, Segoe UI, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          textAlign: "center",
          lineHeight: 1.65,
          borderRadius: "28px",
          border: "1px solid rgba(173,190,255,0.25)",
          background: "linear-gradient(180deg, rgba(9,13,30,0.68) 0%, rgba(8,11,26,0.78) 100%)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          boxShadow: "0 28px 70px rgba(7,10,26,0.65)",
          padding: "38px 26px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: "-20% 10% auto",
            height: "220px",
            background: "radial-gradient(circle, rgba(255,255,255,0.24) 0%, rgba(139,92,246,0.0) 62%)",
            filter: "blur(4px)",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            margin: "0 auto 16px",
            width: "96px",
            height: "96px",
            borderRadius: "999px",
            border: "1px solid rgba(196,181,253,0.45)",
            boxShadow: "0 0 0 8px rgba(99,102,241,0.08), 0 0 42px rgba(147,197,253,0.28)",
            position: "relative",
          }}
        >
          <span
            style={{
              position: "absolute",
              inset: "12px",
              borderRadius: "999px",
              borderTop: "2px solid rgba(253,224,71,0.95)",
              borderRight: "2px solid transparent",
              animation: "spin 1.2s linear infinite",
              display: "block",
            }}
          />
          <span
            style={{
              position: "absolute",
              inset: "26px",
              borderRadius: "999px",
              borderTop: "2px solid rgba(165,180,252,0.95)",
              borderLeft: "2px solid transparent",
              animation: "spin 1.7s linear infinite reverse",
              display: "block",
            }}
          />
          <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: "26px", color: "#fde68a" }}>✶</span>
        </div>
        <p id="oauth-callback-status" style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 10px", letterSpacing: "0.01em" }}>
          우주의 좌표를 동기화하는 중...
        </p>
        <p style={{ opacity: 0.88, margin: 0, color: "rgba(224,231,255,0.92)", fontSize: "14px" }}>
          잠시만 기다려 주세요. 당신의 운명 데이터를 안전하게 불러오고 있습니다.
        </p>
        <p style={{ marginTop: "18px", fontSize: "14px", opacity: 0.9, color: "rgba(199,210,254,0.9)" }}>
          자동 이동이 되지 않으면 <a id="oauth-callback-fallback-link" href={callbackPath} style={{ textDecoration: "underline" }}>콜백 계속</a>
        </p>
        <style>{"@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }"}</style>
      </div>
      <script dangerouslySetInnerHTML={{ __html: buildInlineScript(provider) }} />
    </main>
  );
}
