"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "../_lib/api-config";

declare global {
  interface Window {
    CODE_DESTINY_API_BASE_URL?: string;
  }
}

type LoginResult = {
  message?: string;
  token?: string;
  nextPath?: string;
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

function normalizeApiBase(rawBase: string | undefined | null) {
  const value = String(rawBase || "").trim();
  if (!value) return "";
  return value.replace(/\/+$/, "");
}

function sanitizeNextPath(rawNext: string | null) {
  if (!rawNext) return null;
  if (!rawNext.startsWith("/") || rawNext.startsWith("//")) return null;
  return rawNext;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function publishAuthSync(event: "login" | "logout", token?: string) {
  if (typeof window === "undefined") return;
  const payload = {
    source: "login",
    event,
    token: token ? "updated" : "none",
    at: Date.now(),
  };
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

export default function LoginPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string>("");
  const socialCompleteOnceRef = useRef(false);

  const authApiBase = useMemo(() => getApiBaseUrl(), []);

  const socialCompleteEndpoint = `${authApiBase}/api/auth/oauth/complete`;

  const persistAuth = (token?: string, user?: LoginResult["user"]) => {
    if (token) {
      localStorage.setItem("fortune_auth_token", token);
      document.cookie = `fortune_auth_token=${encodeURIComponent(token)}; path=/; max-age=604800; samesite=lax`;
      publishAuthSync("login", token);
    }

    if (user) {
      localStorage.setItem("fortune_auth_user", JSON.stringify(user));
      document.cookie = `fortune_auth_role=${encodeURIComponent(user.role)}; path=/; max-age=604800; samesite=lax`;
    }
  };

  // 마운트 직후: 이미 로그인된 사용자 → 홈으로 리다이렉트
  // 소셜 그랜트가 있는 URL의 경우는 이 effect에서 처리하지 않음 (socialEffect가 담당)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("social_grant") || params.get("social_error")) return;

    let token = "";
    try {
      token = localStorage.getItem("fortune_auth_token") || "";
    } catch {
      // localStorage 접근 실패 시 무시 (부라우저링 등 예외 케이스)
    }

    if (!token) return;

    setIsRedirecting(true);
    const timer = setTimeout(() => router.replace("/"), 400);
    return () => clearTimeout(timer);
  }, [router]);

  // 소셜 OAuth 그랜트 처리 (네트워크 호출 중복 방지: socialCompleteOnceRef)
  useEffect(() => {
    if (socialCompleteOnceRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const socialGrant = params.get("social_grant");
    const socialError = params.get("social_error");

    if (!socialGrant && !socialError) return;

    if (socialError) {
      socialCompleteOnceRef.current = true;
      setError("소셜 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    if (!socialGrant) return;

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
          if (Array.isArray(payload.errors) && payload.errors.length > 0) {
            throw new Error(payload.errors.join(" "));
          }
          throw new Error(payload.message || "소셜 로그인 처리에 실패했습니다.");
        }

        persistAuth(payload.token, payload.user);
        const nextFromQuery = sanitizeNextPath(params.get("next"));
        const nextPath = sanitizeNextPath(payload.nextPath || null) || nextFromQuery || "/";

        if (payload.user?.role === "admin" && nextPath === "/") {
          router.replace("/admin");
          return;
        }

        router.replace(nextPath);
      })
      .catch((e: Error) => {
        setError(e.message || "소셜 로그인 처리 중 오류가 발생했습니다.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router, socialCompleteEndpoint]);

  const handleLocalLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading || socialLoading !== null) return;

    const normalizedId = loginId.trim();
    if (!normalizedId || password.length < 8) {
      setError("아이디(이메일)와 비밀번호를 확인해 주세요.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const params = new URLSearchParams(window.location.search);
      const nextPath = sanitizeNextPath(params.get("next")) || "/";

      const response = await fetch(`${authApiBase}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedId,
          password,
          nextPath,
        }),
      });

      const payload = await parseJsonResponse<LoginResult & { errors?: string[] }>(response);
      if (!response.ok) {
        if (Array.isArray(payload.errors) && payload.errors.length > 0) {
          throw new Error(payload.errors.join(" "));
        }
        throw new Error(payload.message || "로그인에 실패했습니다.");
      }

      persistAuth(payload.token, payload.user);
      const resolvedNextPath = sanitizeNextPath(payload.nextPath || null) || nextPath;

      if (payload.user?.role === "admin" && resolvedNextPath === "/") {
        router.replace("/admin");
        return;
      }

      router.replace(resolvedNextPath);
    } catch (e) {
      const message = e instanceof Error ? e.message : "로그인 처리 중 오류가 발생했습니다.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const startSocialLogin = (provider: SocialProvider) => {
    if (typeof window === "undefined") return;
    setError("");
    setSocialLoading(provider);

    const params = new URLSearchParams(window.location.search);
    const nextPath = sanitizeNextPath(params.get("next")) || "/";
    const startUrl = `${authApiBase}/api/auth/oauth/${provider}/start?flow=login&next=${encodeURIComponent(nextPath)}`;
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
          <section className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-xl sm:p-8">
            <header className="mb-6 text-center">
              <p className="mb-2 inline-flex rounded-full border border-violet-300/40 bg-violet-400/10 px-3 py-1 text-[11px] font-semibold tracking-[0.25em] text-violet-200">
                TWILIGHT LOGIN
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">별빛 로그인 포털</h1>
              <p className="mt-2 text-sm leading-6 text-violet-100/80">
                아이디(이메일)/비밀번호 또는 소셜 계정으로 로그인할 수 있습니다.
              </p>
            </header>

            {error ? (
              <p className="mb-4 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>
            ) : null}

            <form className="space-y-3" onSubmit={handleLocalLogin}>
              <div>
                <label htmlFor="login-id" className="mb-1 block text-xs font-semibold tracking-[0.16em] text-violet-100/75">ID / EMAIL</label>
                <input
                  id="login-id"
                  type="text"
                  autoComplete="username"
                  value={loginId}
                  onChange={(event) => setLoginId(event.target.value)}
                  disabled={loading || socialLoading !== null}
                  placeholder=""
                  className="h-12 w-full rounded-xl border border-violet-200/25 bg-slate-950/45 px-4 text-sm text-slate-100 outline-none transition focus:border-violet-300/60 focus:ring-2 focus:ring-violet-300/30 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
              <div>
                <label htmlFor="login-password" className="mb-1 block text-xs font-semibold tracking-[0.16em] text-violet-100/75">PASSWORD</label>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={loading || socialLoading !== null}
                  placeholder="비밀번호 입력"
                  className="h-12 w-full rounded-xl border border-violet-200/25 bg-slate-950/45 px-4 text-sm text-slate-100 outline-none transition focus:border-violet-300/60 focus:ring-2 focus:ring-violet-300/30 disabled:cursor-not-allowed disabled:opacity-60"
                />
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
              <button
                type="button"
                onClick={() => startSocialLogin("google")}
                disabled={loading || socialLoading !== null}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white text-[14px] font-semibold text-slate-800 shadow-[0_10px_24px_rgba(15,23,42,.15)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(15,23,42,.22)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[15px] font-bold text-[#4285F4]">G</span>
                {socialLoading === "google" ? "Google 인증으로 이동 중..." : "Google로 계속하기"}
              </button>

              <button
                type="button"
                onClick={() => startSocialLogin("naver")}
                disabled={loading || socialLoading !== null}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#0ea05a] bg-[#03C75A] text-[14px] font-semibold text-white shadow-[0_10px_24px_rgba(3,199,90,.28)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_16px_30px_rgba(3,199,90,.35)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[15px] font-black text-[#03C75A]">N</span>
                {socialLoading === "naver" ? "네이버 인증으로 이동 중..." : "네이버로 계속하기"}
              </button>

              <button
                type="button"
                onClick={() => startSocialLogin("kakao")}
                disabled={loading || socialLoading !== null}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#f0d200] bg-[#FEE500] text-[14px] font-semibold text-[#191919] shadow-[0_10px_24px_rgba(254,229,0,.32)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_16px_30px_rgba(254,229,0,.4)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#191919] text-[15px] font-black text-[#FEE500]">K</span>
                {socialLoading === "kakao" ? "카카오 인증으로 이동 중..." : "카카오로 계속하기"}
              </button>
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
