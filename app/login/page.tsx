"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "../components/Toast";

declare global {
  interface Window {
    CODE_DESTINY_API_BASE_URL?: string;
  }
}

type LoginFormState = {
  email: string;
  password: string;
};

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

const INITIAL_FORM: LoginFormState = {
  email: "",
  password: "",
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeNextPath(rawNext: string | null) {
  if (!rawNext) return null;
  if (!rawNext.startsWith("/") || rawNext.startsWith("//")) return null;
  return rawNext;
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

  const [form, setForm] = useState<LoginFormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const socialCompleteOnceRef = useRef(false);
  const [fieldTouched, setFieldTouched] = useState<Record<string, boolean>>({});

  const apiBase = useMemo(() => {
    if (process.env.NEXT_PUBLIC_API_BASE_URL) return process.env.NEXT_PUBLIC_API_BASE_URL;
    if (typeof window !== "undefined") {
      if (window.CODE_DESTINY_API_BASE_URL) return window.CODE_DESTINY_API_BASE_URL;
      if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        return "http://localhost:4000";
      }
      return window.location.origin;
    }
    return "http://localhost:4000";
  }, []);

  const endpoint = `${apiBase}/api/auth/login`;
  const socialCompleteEndpoint = `${apiBase}/api/auth/oauth/complete`;

  const onChange = <K extends keyof LoginFormState>(key: K, value: LoginFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // 실시간 필드 유효성
  const fieldValid = useMemo(
    () => ({
      email: emailRegex.test(form.email.trim()),
      password: form.password.length >= 8,
    }),
    [form],
  );

  const markTouched = (field: string) =>
    setFieldTouched((prev) => ({ ...prev, [field]: true }));

  const ib = (field: keyof typeof fieldValid) => {
    const base =
      "w-full rounded-xl border bg-slate-950/30 px-3.5 py-2.5 text-sm text-slate-100 " +
      "placeholder:text-slate-300/45 outline-none transition-all duration-300 focus:ring-2 ";
    if (!fieldTouched[field])
      return base + "border-violet-200/20 focus:border-violet-300/70 focus:ring-violet-400/50";
    if (fieldValid[field])
      return base + "border-emerald-400/55 focus:border-emerald-400/70 focus:ring-emerald-400/30";
    return base + "border-rose-400/55 focus:border-rose-400/70 focus:ring-rose-400/30";
  };

  const fe = (field: keyof typeof fieldValid, msg: string) =>
    fieldTouched[field] && !fieldValid[field] ? (
      <p className="mt-1.5 text-[11px] font-medium text-rose-300/90">⚠️ {msg}</p>
    ) : null;

  const persistAuth = (token?: string, user?: LoginResult["user"]) => {
    if (token) {
      localStorage.setItem("fortune_auth_token", token);
      document.cookie = `fortune_auth_token=${encodeURIComponent(token)}; path=/; max-age=604800; samesite=lax`;
    }

    if (user) {
      localStorage.setItem("fortune_auth_user", JSON.stringify(user));
      document.cookie = `fortune_auth_role=${encodeURIComponent(user.role)}; path=/; max-age=604800; samesite=lax`;
    }
  };

  // 이미 로그인된 사용자 → 홈으로 리다이렉트
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("social_grant")) return; // 소셜 연동 콜백은 제외
    const token = localStorage.getItem("fortune_auth_token");
    if (token) {
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (socialCompleteOnceRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const socialGrant = params.get("social_grant");
    const socialError = params.get("social_error");

    if (!socialGrant && !socialError) {
      return;
    }

    if (socialError) {
      socialCompleteOnceRef.current = true;
      setError("소셜 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    if (!socialGrant) return;

    socialCompleteOnceRef.current = true;
    setLoading(true);

    fetch(socialCompleteEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ socialGrant }),
    })
      .then(async (response) => {
        const payload = await parseJsonResponse<LoginResult & { errors?: string[] }>(response);

        if (!response.ok) {
          if (Array.isArray(payload.errors) && payload.errors.length > 0) {
            throw new Error(payload.errors.join(" "));
          }
          throw new Error(payload.message || "소셜 로그인 처리에 실패했습니다.");
        }

        persistAuth(payload.token, payload.user);
        setSuccess(payload.message || "소셜 로그인에 성공했습니다.");

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

  const startSocialLogin = (provider: SocialProvider) => {
    if (typeof window === "undefined") return;
    setError("");
    setSuccess("");
    setSocialLoading(provider);

    const params = new URLSearchParams(window.location.search);
    const nextPath = sanitizeNextPath(params.get("next")) || "/";
    const startUrl = `${apiBase}/api/auth/oauth/${provider}/start?flow=login&next=${encodeURIComponent(nextPath)}`;
    window.location.href = startUrl;
  };

  const validate = () => {
    if (!emailRegex.test(form.email.trim())) {
      return "이메일 형식이 올바르지 않습니다.";
    }

    if (form.password.length < 8) {
      return "비밀번호를 다시 확인해 주세요.";
    }

    return "";
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const validationMessage = validate();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          password: form.password,
        }),
      });

      const payload = await parseJsonResponse<LoginResult & {
        errors?: string[];
      }>(response);

      if (!response.ok) {
        if (Array.isArray(payload.errors) && payload.errors.length > 0) {
          setError(payload.errors.join(" "));
        } else if (response.status === 503) {
          setError("서버가 준비 중입니다. 잠시 후 다시 시도해 주세요.");
        } else {
          setError(payload.message || "로그인에 실패했습니다.");
        }
        return;
      }

      persistAuth(payload.token, payload.user);
      const name = payload.user?.name ?? "님";
      const pts = payload.user?.points ?? 0;
      showToast(`✦ ${name}님, 환영합니다! 잔여 포인트: ${pts}P`, "success");
      setForm(INITIAL_FORM);
      setFieldTouched({});

      const nextValue =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("next")
          : null;
      const resolvedNext = sanitizeNextPath(nextValue);
      const loginDest = resolvedNext ?? (payload.user?.role === "admin" ? "/admin" : "/");
      setTimeout(() => router.replace(loginDest), 600);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(msg || "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#0b1225] via-[#1b1745] to-[#2f0a4f] px-4 py-10 text-slate-100">
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
                관리자 모드와 회원 전용 기능 접근을 위해 로그인해 주세요.
              </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <span className="mb-1.5 block text-xs font-semibold tracking-wide text-violet-100/85">이메일</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => onChange("email", e.target.value)}
                  onBlur={() => markTouched("email")}
                  placeholder="you@example.com"
                  className={ib("email")}
                  autoComplete="email"
                />
                {fe("email", "올바른 이메일 형식을 입력해 주세요.")}
              </div>

              <div>
                <span className="mb-1.5 block text-xs font-semibold tracking-wide text-violet-100/85">비밀번호</span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => onChange("password", e.target.value)}
                  onBlur={() => markTouched("password")}
                  placeholder="비밀번호"
                  className={ib("password")}
                  autoComplete="current-password"
                />
                {fe("password", "비밀번호를 다시 확인해 주세요.")}
              </div>

              {error ? (
                <p className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 inline-flex w-full items-center justify-center rounded-xl border border-violet-200/45 bg-gradient-to-r from-violet-600/70 via-fuchsia-600/70 to-indigo-600/70 px-4 py-3 text-sm font-semibold tracking-wide text-white shadow-[0_8px_30px_rgba(76,29,149,.35)] transition-all duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "인증 중..." : "로그인"}
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
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white text-[14px] font-semibold text-slate-800 shadow-[0_10px_24px_rgba(15,23,42,.15)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(15,23,42,.22)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[15px] font-bold text-[#4285F4]">G</span>
                {socialLoading === "google" ? "Google 인증으로 이동 중..." : "Google로 계속하기"}
              </button>

              <button
                type="button"
                onClick={() => startSocialLogin("naver")}
                disabled={loading || socialLoading !== null}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#0ea05a] bg-[#03C75A] text-[14px] font-semibold text-white shadow-[0_10px_24px_rgba(3,199,90,.28)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_16px_30px_rgba(3,199,90,.35)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[15px] font-black text-[#03C75A]">N</span>
                {socialLoading === "naver" ? "네이버 인증으로 이동 중..." : "네이버로 계속하기"}
              </button>

              <button
                type="button"
                onClick={() => startSocialLogin("kakao")}
                disabled={loading || socialLoading !== null}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#f0d200] bg-[#FEE500] text-[14px] font-semibold text-[#191919] shadow-[0_10px_24px_rgba(254,229,0,.32)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_16px_30px_rgba(254,229,0,.4)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#191919] text-[15px] font-black text-[#FEE500]">K</span>
                {socialLoading === "kakao" ? "카카오 인증으로 이동 중..." : "카카오로 계속하기"}
              </button>
            </div>

            <footer className="mt-5 text-center text-xs text-violet-100/75">
              계정이 없다면{" "}
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
