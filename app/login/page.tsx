"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "../_lib/api-config";
import { persistSanitizedAuthUser } from "../_lib/auth-storage";

declare global {
  interface Window {
    CODE_DESTINY_API_BASE_URL?: string;
  }
}

type LoginResult = {
  message?: string;
  code?: string;
  error?: string;
  nextPath?: string;
  accessToken?: string;
  tokenType?: string;
  accessTokenExpiresInSec?: number;
  provider?: "google" | "naver" | "kakao";
  user?: {
    id: string;
    name: string;
    email: string;
    birthDate: string;
    birthTime: string;
    gender: string;
    role: "user" | "admin";
    points?: number;
    joinedAt: string;
  };
};

type SocialProvider = "google" | "naver" | "kakao";

const AUTH_SYNC_CHANNEL = "code-destiny-auth-sync";
const LOCAL_AUTH_TIMEOUT_MS = 20000;

function sanitizeNextPath(rawNext: string | null) {
  if (!rawNext) return null;
  if (!rawNext.startsWith("/") || rawNext.startsWith("//")) return null;
  return rawNext;
}

function resolveNextPathFromQuery(params: URLSearchParams): string {
  return sanitizeNextPath(params.get("next")) || sanitizeNextPath(params.get("redirect")) || "/";
}

function buildSocialStartPath(provider: SocialProvider, flow: "login" | "signup", nextPath: string) {
  const safeNext = sanitizeNextPath(nextPath) || "/";
  return `/api/auth/oauth/${provider}/start?flow=${flow}&next=${encodeURIComponent(safeNext)}`;
}

function buildSocialStartUrl(
  authApiBase: string,
  provider: SocialProvider,
  flow: "login" | "signup",
  nextPath: string,
) {
  return `${authApiBase}${buildSocialStartPath(provider, flow, nextPath)}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs = LOCAL_AUTH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function publishAuthSync(event: "login" | "logout") {
  if (typeof window === "undefined") return;
  const payload = {
    source: "login",
    event,
    at: Date.now(),
  };
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

function normalizeSocialAuthError(rawReason: string | null): string {
  const reason = String(rawReason || "").trim().toLowerCase();
  if (!reason) return "소셜 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  if (reason.includes("token_exchange_failed")) return "소셜 인증 토큰 교환에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  if (reason === "oauth_not_configured") return "소셜 로그인 설정이 아직 완료되지 않았습니다. 관리자에게 문의해 주세요.";
  if (reason === "invalid_callback" || reason === "provider_mismatch") return "소셜 인증 콜백이 유효하지 않습니다. 다시 시도해 주세요.";
  return "소셜 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.";
}

function normalizeAuthApiError(payload: LoginResult & { errors?: string[] }, fallbackMessage: string): string {
  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    return payload.errors.join(" ");
  }

  const code = String(payload.code || payload.error || "").trim().toUpperCase();
  if (code === "EMAIL_ALREADY_REGISTERED" || code === "DUPLICATE_EMAIL") {
    return "이미 가입된 이메일입니다. 회원가입 대신 로그인해 주세요.";
  }

  return payload.message || fallbackMessage;
}

export default function LoginPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string>("");
  const socialCompleteOnceRef = useRef(false);
  const authCommittedRef = useRef(false);
  const bootstrapAuthCheckControllerRef = useRef<AbortController | null>(null);

  const authApiBase = useMemo(() => getApiBaseUrl(), []);

  const socialCompleteEndpoint = `${authApiBase}/api/auth/oauth/complete`;

  const abortBootstrapAuthCheck = useCallback(() => {
    const activeController = bootstrapAuthCheckControllerRef.current;
    if (activeController) {
      activeController.abort();
      bootstrapAuthCheckControllerRef.current = null;
    }
  }, []);

  const persistAuth = (user?: LoginResult["user"], accessToken?: string) => {
    if (user || accessToken) {
      authCommittedRef.current = true;
    }
    if (accessToken) {
      try {
        localStorage.setItem("fortune_auth_token", String(accessToken));
      } catch {
        // ignore storage failures
      }
    }
    if (user) {
      const safeUser = persistSanitizedAuthUser(user);
      const role = String((safeUser && safeUser.role) || user.role || "user");
      document.cookie = `fortune_auth_role=${encodeURIComponent(role)}; path=/; max-age=604800; samesite=lax`;
      publishAuthSync("login");
    }
  };

  const redirectAfterAuth = useCallback((nextPath: string, user?: LoginResult["user"]) => {
    if (user?.role === "admin" && nextPath === "/") {
      router.replace("/admin");
      return;
    }

    if (nextPath === "/" || nextPath === "/index.html") {
      window.location.replace("/");
      return;
    }

    router.replace(nextPath);
  }, [router]);

  // 마운트 직후: 이미 로그인된 사용자 → 홈으로 리다이렉트
  // 소셜 그랜트가 있는 URL의 경우는 이 effect에서 처리하지 않음 (socialEffect가 담당)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("social_grant") || params.get("social_error")) return;

    const controller = new AbortController();
    bootstrapAuthCheckControllerRef.current = controller;
    let timer: ReturnType<typeof setTimeout> | null = null;

    fetch(`${authApiBase}/api/auth/me`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return parseJsonResponse<LoginResult>(response);
      })
      .then((payload) => {
        if (!payload?.user) return;
        persistAuth(payload.user, payload.accessToken);
        const nextPath = resolveNextPathFromQuery(params);
        setIsRedirecting(true);
        timer = setTimeout(() => redirectAfterAuth(nextPath, payload.user), 400);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        // Ignore bootstrap auth-check failures to avoid login-page redirect loops.
      });

    return () => {
      if (bootstrapAuthCheckControllerRef.current === controller) {
        bootstrapAuthCheckControllerRef.current = null;
      }
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [authApiBase, redirectAfterAuth]);

  // 소셜 OAuth 그랜트 처리 (네트워크 호출 중복 방지: socialCompleteOnceRef)
  useEffect(() => {
    if (socialCompleteOnceRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const socialGrant = params.get("social_grant");
    const socialError = params.get("social_error");

    if (!socialGrant && !socialError) return;

    if (socialError) {
      socialCompleteOnceRef.current = true;
      setError(normalizeSocialAuthError(socialError));
      return;
    }

    if (!socialGrant) return;

    abortBootstrapAuthCheck();
    socialCompleteOnceRef.current = true;
    setLoading(true);

    (async () => {
      let response: Response | null = null;
      let lastFetchError: Error | null = null;

      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const nextResponse = await fetch(socialCompleteEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ socialGrant }),
          });

          if (nextResponse.status >= 500 && attempt === 0) {
            await sleep(250);
            continue;
          }

          response = nextResponse;
          break;
        } catch (err) {
          lastFetchError = err instanceof Error ? err : new Error("네트워크 오류가 발생했습니다.");
          if (attempt === 0) {
            await sleep(250);
            continue;
          }
        }
      }

      if (!response) {
        throw (lastFetchError || new Error("소셜 로그인 처리 중 오류가 발생했습니다."));
      }

      return response;
    })()
      .then(async (response) => {
        const payload = await parseJsonResponse<LoginResult & { errors?: string[] }>(response);

        if (!response.ok) {
          throw new Error(normalizeAuthApiError(payload, "소셜 로그인 처리에 실패했습니다."));
        }

        persistAuth(payload.user, payload.accessToken);
        const nextFromQuery = resolveNextPathFromQuery(params);
        const nextPath = sanitizeNextPath(payload.nextPath || null) || nextFromQuery || "/";

        redirectAfterAuth(nextPath, payload.user);
      })
      .catch((e: Error) => {
        setError(e.message || "소셜 로그인 처리 중 오류가 발생했습니다.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [abortBootstrapAuthCheck, redirectAfterAuth, socialCompleteEndpoint]);

  const handleLocalLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading || socialLoading !== null) return;

    abortBootstrapAuthCheck();

    const normalizedId = loginId.trim();
    if (!normalizedId || password.length < 8) {
      setError("아이디(이메일)와 비밀번호를 확인해 주세요.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const params = new URLSearchParams(window.location.search);
      const nextPath = resolveNextPathFromQuery(params);

      let response: Response | null = null;
      let lastFetchError: Error | null = null;

      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const nextResponse = await fetchWithTimeout(`${authApiBase}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              email: normalizedId,
              password,
              nextPath,
            }),
          });

          if (nextResponse.status >= 500 && attempt === 0) {
            await sleep(250);
            continue;
          }

          response = nextResponse;
          break;
        } catch (error) {
          lastFetchError = error instanceof Error ? error : new Error("네트워크 오류가 발생했습니다.");
          if (attempt === 0) {
            await sleep(250);
            continue;
          }
        }
      }

      if (!response) {
        throw (lastFetchError || new Error("로그인 처리 중 오류가 발생했습니다."));
      }

      const payload = await parseJsonResponse<LoginResult & { errors?: string[] }>(response);
      if (!response.ok) {
        throw new Error(normalizeAuthApiError(payload, "로그인에 실패했습니다."));
      }

      persistAuth(payload.user, payload.accessToken);
      const resolvedNextPath = sanitizeNextPath(payload.nextPath || null) || nextPath;

      redirectAfterAuth(resolvedNextPath, payload.user);
    } catch (e) {
      const message = e instanceof Error ? e.message : "로그인 처리 중 오류가 발생했습니다.";
      if (message === "Failed to fetch") {
        setError("로그인 서버에 연결하지 못했습니다. 네트워크 상태 또는 API 배포 라우팅(/api) 설정을 확인해 주세요.");
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const startSocialLogin = (provider: SocialProvider) => {
    if (typeof window === "undefined") return;
    abortBootstrapAuthCheck();
    setError("");
    setSocialLoading(provider);

    const params = new URLSearchParams(window.location.search);
    const nextPath = resolveNextPathFromQuery(params);
    const startUrl = buildSocialStartUrl(authApiBase, provider, "login", nextPath);
    window.location.href = startUrl;
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#0b1225] via-[#1b1745] to-[#2f0a4f] px-4 py-10 text-slate-100">
      {/* 코즈믹 로딩 오버레이 — API 처리 중 또는 리다이렉트 중 */}
      {(loading || isRedirecting) && (
        <div className="fixed inset-0 z-[9998] flex flex-col items-center justify-center" style={{ background: 'linear-gradient(135deg, #0b1225 0%, #1b1745 50%, #2f0a4f 100%)' }}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:60px_60px] opacity-35" />
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute top-1/3 left-1/4 h-56 w-56 rounded-full bg-indigo-600/20 blur-3xl animate-pulse" />
            <div className="absolute bottom-1/3 right-1/4 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl animate-pulse" style={{ animationDelay: '0.9s' }} />
          </div>
          <div className="relative z-10 flex flex-col items-center gap-6">
            <div className="relative h-20 w-20">
              <div className="absolute inset-0 rounded-full border border-indigo-500/20" />
              <div className="absolute inset-0 rounded-full border-t-2 border-indigo-400 animate-spin" />
              <div className="absolute inset-[5px] rounded-full border-t-2 border-violet-400/70 animate-spin" style={{ animationDuration: '1.4s', animationDirection: 'reverse' }} />
              <div className="absolute inset-0 flex items-center justify-center text-2xl text-indigo-300 animate-pulse">✶</div>
            </div>
            <div className="text-center">
              <p className="text-base font-bold tracking-wide text-white">
                {isRedirecting ? '별빛 여정으로 이동 중...' : '별빛 로그인 포털을 열고 있습니다'}
              </p>
              <p className="mt-1 text-sm text-indigo-200/60">잠시만 기다려 주세요...</p>
            </div>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:64px_64px] opacity-40 animate-twinkle" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(168,85,247,0.30),transparent_28%),radial-gradient(circle_at_15%_80%,rgba(99,102,241,0.22),transparent_33%)]" />

      <div className="relative mx-auto w-full max-w-md opacity-0 animate-fade-in-up">
        <div className="rounded-3xl bg-gradient-to-br from-violet-300/35 via-fuchsia-300/10 to-slate-200/35 p-[1px] shadow-violet-neon">
          <section className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-xl [color-scheme:dark] sm:p-8">
            <header className="mb-6 text-center">
              <p className="mb-2 inline-flex rounded-full border border-violet-300/40 bg-violet-400/10 px-3 py-1 text-[11px] font-semibold tracking-[0.25em] text-violet-200">
                TWILIGHT LOGIN
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">별빛 로그인 포털</h1>
              <p className="mt-2 text-sm leading-6 text-violet-100/80">
                아이디(이메일)/비밀번호 또는 소셜 계정으로 로그인할 수 있습니다.
              </p>
              <div className="mt-4 inline-flex rounded-full border border-violet-200/25 bg-slate-950/30 p-1">
                <span className="min-h-0 min-w-0 rounded-full bg-violet-400/20 px-3 py-1.5 text-xs font-semibold text-violet-100">
                  로그인
                </span>
                <Link
                  href="/signup"
                  className="min-h-0 min-w-0 rounded-full px-3 py-1.5 text-xs font-semibold text-violet-200/85 transition hover:text-violet-100"
                >
                  회원가입
                </Link>
              </div>
            </header>

            {error ? (
              <p className="mb-4 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>
            ) : null}

            <form className="space-y-3" onSubmit={handleLocalLogin}>
              <div>
                <label htmlFor="login-id" className="mb-1 block text-xs font-semibold tracking-[0.16em] text-violet-100/75">ID / EMAIL</label>
                <input
                  id="login-id"
                  type="email"
                  autoComplete="email"
                  value={loginId}
                  onChange={(event) => setLoginId(event.target.value)}
                  disabled={loading || socialLoading !== null}
                  placeholder="name@example.com"
                  className="h-12 w-full rounded-xl border border-violet-200/25 bg-slate-950/45 px-4 text-sm text-slate-100 outline-none transition focus:border-violet-300/60 focus:ring-2 focus:ring-violet-300/30 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <p className="mt-1.5 text-[11px] text-violet-100/65">가입할 때 사용한 이메일 아이디를 입력해 주세요.</p>
              </div>
              <div>
                <label htmlFor="login-password" className="mb-1 block text-xs font-semibold tracking-[0.16em] text-violet-100/75">PASSWORD</label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={loading || socialLoading !== null}
                    placeholder="비밀번호 입력"
                    className="h-12 w-full rounded-xl border border-violet-200/25 bg-slate-950/45 px-4 pr-14 text-sm text-slate-100 outline-none transition focus:border-violet-300/60 focus:ring-2 focus:ring-violet-300/30 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={loading || socialLoading !== null}
                    className="absolute right-2 top-1/2 h-8 min-h-0 min-w-0 -translate-y-1/2 rounded-md border border-violet-300/30 bg-violet-400/10 px-2 py-1 text-[11px] font-semibold text-violet-100 hover:bg-violet-400/20 disabled:opacity-60"
                    aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
                  >
                    {showPassword ? "숨김" : "보기"}
                  </button>
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setError("비밀번호 재설정 기능은 준비 중입니다. 잠시만 기다려 주세요.")}
                    className="min-h-0 min-w-0 px-0 py-0 text-xs font-semibold text-violet-200/85 underline decoration-violet-300/60 underline-offset-4 hover:text-violet-100"
                  >
                    비밀번호를 잊으셨나요?
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || socialLoading !== null}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-violet-200/30 bg-gradient-to-r from-violet-500/80 via-fuchsia-500/70 to-indigo-500/75 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(109,40,217,.32)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "로그인 중..." : "아이디/비밀번호로 로그인"}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-violet-100/20" />
              <span className="text-[11px] font-semibold tracking-[0.2em] text-violet-100/60">SOCIAL LOGIN</span>
              <div className="h-px flex-1 bg-violet-100/20" />
            </div>

            <div className="space-y-2.5">
              <a
                href={buildSocialStartPath("google", "login", "/")}
                onClick={(event) => {
                  if (loading || socialLoading !== null) {
                    event.preventDefault();
                    return;
                  }
                  event.preventDefault();
                  startSocialLogin("google");
                }}
                aria-disabled={loading || socialLoading !== null}
                className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white text-[14px] font-semibold text-slate-800 shadow-[0_10px_24px_rgba(15,23,42,.15)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(15,23,42,.22)] ${(loading || socialLoading !== null) ? "pointer-events-none opacity-60" : ""}`}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[15px] font-bold text-[#4285F4]">G</span>
                {socialLoading === "google" ? "Google 인증으로 이동 중..." : "Google로 계속하기"}
              </a>

              <a
                href={buildSocialStartPath("naver", "login", "/")}
                onClick={(event) => {
                  if (loading || socialLoading !== null) {
                    event.preventDefault();
                    return;
                  }
                  event.preventDefault();
                  startSocialLogin("naver");
                }}
                aria-disabled={loading || socialLoading !== null}
                className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#0ea05a] bg-[#03C75A] text-[14px] font-semibold text-white shadow-[0_10px_24px_rgba(3,199,90,.28)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_16px_30px_rgba(3,199,90,.35)] ${(loading || socialLoading !== null) ? "pointer-events-none opacity-60" : ""}`}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[15px] font-black text-[#03C75A]">N</span>
                {socialLoading === "naver" ? "네이버 인증으로 이동 중..." : "네이버로 계속하기"}
              </a>

              <a
                href={buildSocialStartPath("kakao", "login", "/")}
                onClick={(event) => {
                  if (loading || socialLoading !== null) {
                    event.preventDefault();
                    return;
                  }
                  event.preventDefault();
                  startSocialLogin("kakao");
                }}
                aria-disabled={loading || socialLoading !== null}
                className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#f0d200] bg-[#FEE500] text-[14px] font-semibold text-[#191919] shadow-[0_10px_24px_rgba(254,229,0,.32)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_16px_30px_rgba(254,229,0,.4)] ${(loading || socialLoading !== null) ? "pointer-events-none opacity-60" : ""}`}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#191919] text-[15px] font-black text-[#FEE500]">K</span>
                {socialLoading === "kakao" ? "카카오 인증으로 이동 중..." : "카카오로 계속하기"}
              </a>
            </div>

            <footer className="mt-5 text-center text-xs text-violet-100/75">
              회원가입에서 아이디/비밀번호 또는 소셜 계정을 선택할 수 있습니다. {" "}
              <Link href="/signup" className="font-semibold text-violet-200 underline decoration-violet-300/70 underline-offset-4 hover:text-violet-100">
                회원가입
              </Link>
            </footer>
          </section>
        </div>
      </div>
    </main>
  );
}
