"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "../_lib/api-config";
import { clearAuthError, login as loginWithStore } from "../_lib/auth-store";

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

function resolveNextPathFromQuery(params: URLSearchParams): string {
  return sanitizeNextPath(params.get("returnTo")) || sanitizeNextPath(params.get("next")) || sanitizeNextPath(params.get("redirect")) || "/";
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

function normalizeSocialAuthError(rawReason: string | null): string {
  const reason = String(rawReason || "").trim().toLowerCase();
  if (!reason) return "소셜 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  if (reason === "oauth_failed") return "소셜 로그인 처리 중 오류가 발생했습니다. 다시 시도해 주세요.";
  if (reason === "oauth_service_unavailable") return "소셜 로그인 서버가 일시적으로 불안정합니다. 잠시 후 다시 시도해 주세요.";
  if (reason === "response_is_html") return "인증 서버 응답이 일시적으로 불안정합니다. 잠시 후 다시 시도해 주세요.";
  if (reason === "missing_oauth_params") return "소셜 인증 정보가 누락되었습니다. 다시 로그인해 주세요.";
  if (reason.includes("token_exchange_failed")) return "소셜 인증 토큰 교환에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  if (reason === "oauth_not_configured") return "소셜 로그인 설정이 아직 완료되지 않았습니다. 관리자에게 문의해 주세요.";
  if (reason === "invalid_callback" || reason === "provider_mismatch") return "소셜 인증 콜백이 유효하지 않습니다. 다시 시도해 주세요.";
  return "소셜 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.";
}

function fallbackDisplayNameFromLoginId(rawId: string) {
  const normalized = rawId.trim();
  if (!normalized) return "탐험가";
  const candidate = normalized.split("@")[0]?.trim();
  return candidate || "탐험가";
}

export default function LoginPage() {
  const router = useRouter();

  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [oauthRedirecting, setOauthRedirecting] = useState<SocialProvider | null>(null);
  const [callbackProcessing] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>("");

  const authApiBase = useMemo(() => getApiBaseUrl(), []);

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error") || params.get("social_error");
    if (oauthError) {
      setError(normalizeSocialAuthError(oauthError));
      authWarn("[AUTH] oauth callback failed", oauthError);
    }

    if (params.get("social_grant")) {
      setError("소셜 로그인 콜백이 만료되었거나 경로가 올바르지 않습니다. 소셜 로그인을 다시 시도해 주세요.");
    }
  }, []);

  const handleLocalLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loginSubmitting || oauthRedirecting !== null || callbackProcessing) return;

    const form = event.currentTarget;
    const submittedLoginId = String(
      ((form.elements.namedItem("login-id") as HTMLInputElement | null)?.value || loginId),
    ).trim();
    const submittedPassword = String(
      ((form.elements.namedItem("login-password") as HTMLInputElement | null)?.value || password),
    );

    if (submittedLoginId !== loginId) setLoginId(submittedLoginId);
    if (submittedPassword !== password) setPassword(submittedPassword);

    const normalizedId = submittedLoginId;
    if (!normalizedId || submittedPassword.length < 8) {
      setError("아이디(이메일)와 비밀번호를 확인해 주세요.");
      return;
    }

    setError("");
    clearAuthError();
    setLoginSubmitting(true);

    try {
      const params = new URLSearchParams(window.location.search);
      const nextPath = resolveNextPathFromQuery(params);
      const loginResult = await loginWithStore({
        email: normalizedId,
        password: submittedPassword,
        nextPath,
        apiBase: authApiBase,
      });

      const resolvedNextPath = sanitizeNextPath(loginResult.nextPath || null) || nextPath;
      if (IS_DEV) console.debug("[auth] redirect to home");
      redirectAfterAuth(resolvedNextPath, loginResult.user as LoginResult["user"]);
    } catch (e) {
      const message = e instanceof Error ? e.message : "로그인 처리 중 오류가 발생했습니다.";
      authWarn("[AUTH] email login failed", message);
      if (message === "Failed to fetch") {
        setError("로그인 서버에 연결하지 못했습니다. 네트워크 상태 또는 API 배포 라우팅(/api) 설정을 확인해 주세요.");
        return;
      }
      setError(message);
    } finally {
      setLoginSubmitting(false);
    }
  };

  const startSocialLogin = (provider: SocialProvider) => {
    if (typeof window === "undefined") return;
    if (loginSubmitting || oauthRedirecting !== null || callbackProcessing) return;

    setError("");
    clearAuthError();
    setOauthRedirecting(provider);
    authInfo("[AUTH] oauth redirect start");

    try {
      sessionStorage.setItem("cd_oauth_intent", JSON.stringify({ provider, flow: "login", at: Date.now() }));
    } catch {
      // ignore storage failures
    }

    const params = new URLSearchParams(window.location.search);
    const nextPath = resolveNextPathFromQuery(params);
    authInfo("[AUTH] redirect target", nextPath);
    const startUrl = buildSocialStartUrl(authApiBase, provider, "login", nextPath);
    window.location.href = startUrl;
  };

  const isBusy = loginSubmitting || oauthRedirecting !== null || callbackProcessing;
  const formDisabled = isBusy;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#0a0e27_0%,#1a0a2e_25%,#16213e_50%,#0f3460_75%,#0a1428_100%)] px-4 py-10 text-slate-100">
      {/* 우주 배경 - 행성 배치 */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 rounded-full bg-gradient-to-br from-purple-600/20 via-purple-800/10 to-transparent blur-3xl opacity-60" />
      <div className="pointer-events-none absolute top-1/3 -right-32 w-80 h-80 rounded-full bg-gradient-to-br from-cyan-500/15 via-blue-600/10 to-transparent blur-3xl opacity-50" />
      <div className="pointer-events-none absolute -bottom-20 left-1/4 w-72 h-72 rounded-full bg-gradient-to-br from-indigo-600/15 via-purple-700/10 to-transparent blur-3xl opacity-40" />
      <div className="pointer-events-none absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-gradient-to-br from-amber-600/12 via-orange-700/8 to-transparent blur-3xl opacity-35" />
      
      {/* 별 필드 */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,rgba(147,197,253,0.25)_0.5px,transparent_0.5px),radial-gradient(circle_at_60%_45%,rgba(199,210,254,0.2)_0.3px,transparent_0.3px),radial-gradient(circle_at_80%_70%,rgba(168,85,247,0.22)_0.4px,transparent_0.4px)] [background-size:82px_82px,123px_123px,156px_156px] opacity-40 animate-twinkle" />
      
      {/* 심층 우주 그리드 */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_10%,rgba(139,92,246,0.15),transparent_35%),radial-gradient(circle_at_75%_35%,rgba(34,211,238,0.12),transparent_40%),radial-gradient(circle_at_50%_80%,rgba(249,115,22,0.08),transparent_45%)]" />

      <div className="relative mx-auto w-full max-w-md opacity-0 animate-fade-in-up">
        <div className="rounded-3xl bg-gradient-to-br from-violet-400/30 via-indigo-500/25 to-blue-600/20 p-[2px] shadow-[0_0_60px_rgba(139,92,246,0.3),0_0_40px_rgba(34,211,238,0.2)] backdrop-blur-sm">
          <section className="rounded-3xl border border-violet-300/25 bg-gradient-to-br from-slate-900/70 via-slate-950/60 to-slate-900/70 p-6 backdrop-blur-2xl [color-scheme:dark] sm:p-8 shadow-inner">
            <header className="mb-6 text-center">
              <p className="mb-2 inline-flex rounded-full border border-violet-300/50 bg-violet-500/15 px-3 py-1 text-[11px] font-semibold tracking-[0.25em] text-violet-200">
                ✦ COSMIC PORTAL ✦
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-lg sm:text-4xl bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 bg-clip-text text-transparent">운명의 문을 열다</h1>
              <p className="mt-3 text-sm leading-6 text-violet-100/85">
                우주의 신비로운 에너지와 함께 당신의 운명을 탐색하세요.
              </p>
              <div className="mt-5 inline-flex rounded-full border border-violet-300/35 bg-violet-950/40 p-1 shadow-lg shadow-violet-500/10">
                <span className="min-h-0 min-w-0 rounded-full bg-gradient-to-r from-violet-500/30 to-indigo-500/30 px-3 py-1.5 text-xs font-semibold text-violet-100">
                  로그인
                </span>
                <Link
                  href="/signup"
                  className="min-h-0 min-w-0 rounded-full px-3 py-1.5 text-xs font-semibold text-violet-100/70 transition hover:text-violet-50"
                >
                  회원가입
                </Link>
              </div>
            </header>

            {error ? (
              <p className="mb-4 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200 shadow-lg shadow-rose-500/10">{error}</p>
            ) : null}

            <form className="space-y-3" onSubmit={handleLocalLogin}>
              <div>
                <label htmlFor="login-id" className="mb-1 block text-xs font-semibold tracking-[0.16em] text-violet-100/80">이메일 주소</label>
                <input
                  id="login-id"
                  name="login-id"
                  type="email"
                  autoComplete="email"
                  value={loginId}
                  onChange={(event) => setLoginId(event.target.value)}
                  disabled={formDisabled}
                  placeholder="name@example.com"
                  className="h-12 w-full rounded-xl border border-violet-300/30 bg-violet-950/30 px-4 text-sm text-slate-100 outline-none transition focus:border-violet-400/70 focus:ring-2 focus:ring-violet-400/40 disabled:cursor-not-allowed disabled:opacity-60 placeholder:text-violet-300/50"
                />
                <p className="mt-1.5 text-[11px] text-violet-100/70">가입할 때 사용한 이메일을 입력해 주세요.</p>
              </div>
              <div>
                <label htmlFor="login-password" className="mb-1 block text-xs font-semibold tracking-[0.16em] text-violet-100/80">비밀번호</label>
                <div className="relative">
                  <input
                    id="login-password"
                    name="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={formDisabled}
                    placeholder="비밀번호 입력"
                    className="h-12 w-full rounded-xl border border-violet-300/30 bg-violet-950/30 px-4 pr-14 text-sm text-slate-100 outline-none transition focus:border-violet-400/70 focus:ring-2 focus:ring-violet-400/40 disabled:cursor-not-allowed disabled:opacity-60 placeholder:text-violet-300/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={formDisabled}
                    className="absolute right-2 top-1/2 h-8 min-h-0 min-w-0 -translate-y-1/2 rounded-md border border-violet-400/40 bg-violet-500/15 px-2 py-1 text-[11px] font-semibold text-violet-100 hover:bg-violet-500/25 disabled:opacity-60 transition"
                    aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
                  >
                    {showPassword ? "숨김" : "보기"}
                  </button>
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setError("비밀번호 재설정 기능은 준비 중입니다. 잠시만 기다려 주세요.")}
                    className="min-h-0 min-w-0 px-0 py-0 text-xs font-semibold text-violet-100/85 underline decoration-violet-400/60 underline-offset-4 hover:text-violet-50 transition"
                  >
                    비밀번호를 잊으셨나요?
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={formDisabled}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-violet-300/50 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-sm font-semibold text-white shadow-[0_0_30px_rgba(139,92,246,0.4),0_8px_16px_rgba(99,102,241,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_40px_rgba(139,92,246,0.5),0_12px_24px_rgba(99,102,241,0.4)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loginSubmitting ? "로그인 중..." : "로그인"}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-violet-300/30 to-transparent" />
              <span className="text-[11px] font-semibold tracking-[0.2em] text-violet-100/70">소셜 로그인</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-violet-300/30 to-transparent" />
            </div>

            <div className="space-y-2.5">
              <a
                href={buildSocialStartPath("google", "login", "/")}
                onClick={(event) => {
                  if (formDisabled) {
                    event.preventDefault();
                    return;
                  }
                  event.preventDefault();
                  startSocialLogin("google");
                }}
                aria-disabled={formDisabled}
                className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/30 bg-gradient-to-r from-white/10 to-gray-100/10 text-[14px] font-semibold text-white shadow-[0_8px_20px_rgba(255,255,255,.08)] backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(255,255,255,.12)] ${formDisabled ? "pointer-events-none opacity-60" : ""}`}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[15px] font-bold text-[#4285F4]">G</span>
                {oauthRedirecting === "google" ? "Google 인증 중..." : "Google로 시작하기"}
              </a>

              <a
                href={buildSocialStartPath("naver", "login", "/")}
                onClick={(event) => {
                  if (formDisabled) {
                    event.preventDefault();
                    return;
                  }
                  event.preventDefault();
                  startSocialLogin("naver");
                }}
                aria-disabled={formDisabled}
                className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#00c73c]/50 bg-gradient-to-r from-[#03C75A]/90 to-[#06d344] text-[14px] font-semibold text-white shadow-[0_8px_20px_rgba(3,199,90,.25)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_12px_28px_rgba(3,199,90,.32)] ${formDisabled ? "pointer-events-none opacity-60" : ""}`}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[15px] font-black text-[#03C75A]">N</span>
                {oauthRedirecting === "naver" ? "네이버 인증 중..." : "네이버로 시작하기"}
              </a>

              <a
                href={buildSocialStartPath("kakao", "login", "/")}
                onClick={(event) => {
                  if (formDisabled) {
                    event.preventDefault();
                    return;
                  }
                  event.preventDefault();
                  startSocialLogin("kakao");
                }}
                aria-disabled={formDisabled}
                className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#f0d200]/60 bg-gradient-to-r from-[#FEE500]/95 to-[#fef000] text-[14px] font-semibold text-[#191919] shadow-[0_8px_20px_rgba(254,229,0,.28)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_12px_28px_rgba(254,229,0,.35)] ${formDisabled ? "pointer-events-none opacity-60" : ""}`}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#191919] text-[15px] font-black text-[#FEE500]">K</span>
                {oauthRedirecting === "kakao" ? "카카오 인증 중..." : "카카오로 시작하기"}
              </a>
            </div>

            <footer className="mt-5 text-center text-xs text-violet-50/70">
              아직 회원이 아니신가요? {" "}
              <Link href="/signup" className="font-semibold text-violet-100 underline decoration-violet-400/70 underline-offset-4 hover:text-violet-50 transition">
                지금 가입하기
              </Link>
            </footer>
          </section>
        </div>
      </div>
    </main>
  );
}
