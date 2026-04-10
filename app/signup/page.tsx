"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { showToast } from "../components/Toast";

declare global {
  interface Window {
    CODE_DESTINY_API_BASE_URL?: string;
  }
}

type SignupFormState = {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
  birthDate: string;
  birthTime: string;
  gender: "M" | "F" | "OTHER";
  agreeTerms: boolean;
  agreePrivacy: boolean;
};

type SignupResult = {
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

const INITIAL_FORM: SignupFormState = {
  name: "",
  email: "",
  password: "",
  passwordConfirm: "",
  birthDate: "",
  birthTime: "",
  gender: "OTHER",
  agreeTerms: false,
  agreePrivacy: false,
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState<SignupFormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
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

  const endpoint = `${apiBase}/api/auth/register`;
  const socialCompleteEndpoint = `${apiBase}/api/auth/oauth/complete`;

  const persistAuth = (token?: string, user?: SignupResult["user"]) => {
    if (token) {
      localStorage.setItem("fortune_auth_token", token);
      document.cookie = `fortune_auth_token=${encodeURIComponent(token)}; path=/; max-age=604800; samesite=lax`;
    }

    if (user) {
      localStorage.setItem("fortune_auth_user", JSON.stringify(user));
      document.cookie = `fortune_auth_role=${encodeURIComponent(user.role)}; path=/; max-age=604800; samesite=lax`;
    }
  };

  const onChange = <K extends keyof SignupFormState>(key: K, value: SignupFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // 실시간 필드 유효성 상태
  const fieldValid = useMemo(
    () => ({
      name: form.name.trim().length >= 2,
      email: emailRegex.test(form.email.trim()),
      password: form.password.length >= 8,
      passwordConfirm:
        form.passwordConfirm.length > 0 && form.password === form.passwordConfirm,
      birthDate: !!form.birthDate,
      birthTime: !!form.birthTime,
      agreeTerms: form.agreeTerms,
      agreePrivacy: form.agreePrivacy,
    }),
    [form],
  );

  const markTouched = (field: string) =>
    setFieldTouched((prev) => ({ ...prev, [field]: true }));

  // 입력필드 border 클래스 동적 기준
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

  // 필드 오류 메시지
  const fe = (field: keyof typeof fieldValid, msg: string) =>
    fieldTouched[field] && !fieldValid[field] ? (
      <p className="mt-1.5 text-[11px] font-medium text-rose-300/90">⚠️ {msg}</p>
    ) : null;

  // 마운트 직후 인증 상태 판별 (이미 로그인된 경우 리다이렉트)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("social_grant") || params.get("social_error")) return;
    let token = "";
    try { token = localStorage.getItem("fortune_auth_token") || ""; } catch {}
    if (!token) return;
    setIsRedirecting(true);
    const timer = setTimeout(() => router.replace("/"), 400);
    return () => clearTimeout(timer);
  }, [router]);

  // 소셜 OAuth 그랜트 처리
  useEffect(() => {
    if (socialCompleteOnceRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const socialGrant = params.get("social_grant");
    const socialError = params.get("social_error");

    if (!socialGrant && !socialError) return;

    if (socialError) {
      socialCompleteOnceRef.current = true;
      setError("소셜 회원가입 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    if (!socialGrant) return;

    socialCompleteOnceRef.current = true;
    setLoading(true);

    fetch(socialCompleteEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ socialGrant }),
    })
      .then(async (response) => {
        const payload = await parseJsonResponse<SignupResult & { errors?: string[] }>(response);

        if (!response.ok) {
          if (Array.isArray(payload.errors) && payload.errors.length > 0) {
            throw new Error(payload.errors.join(" "));
          }
          throw new Error(payload.message || "소셜 회원가입 처리에 실패했습니다.");
        }

        persistAuth(payload.token, payload.user);
        setSuccess(payload.message || "소셜 회원가입에 성공했습니다.");

        const nextFromQuery = sanitizeNextPath(params.get("next"));
        const nextPath = sanitizeNextPath(payload.nextPath || null) || nextFromQuery || "/";

        if (payload.user?.role === "admin" && nextPath === "/") {
          router.replace("/admin");
          return;
        }

        router.replace(nextPath);
      })
      .catch((e: Error) => {
        setError(e.message || "소셜 회원가입 처리 중 오류가 발생했습니다.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router, socialCompleteEndpoint]);

  const startSocialSignup = (provider: SocialProvider) => {
    if (typeof window === "undefined") return;

    setError("");
    setSuccess("");
    setSocialLoading(provider);

    const params = new URLSearchParams(window.location.search);
    const nextPath = sanitizeNextPath(params.get("next")) || "/";
    const startUrl = `${apiBase}/api/auth/oauth/${provider}/start?flow=signup&next=${encodeURIComponent(nextPath)}`;
    window.location.href = startUrl;
  };

  const validate = () => {
    if (!form.name.trim() || form.name.trim().length < 2) {
      return "이름은 최소 2자 이상 입력해 주세요.";
    }

    if (!emailRegex.test(form.email.trim())) {
      return "이메일 형식이 올바르지 않습니다.";
    }

    if (form.password.length < 8) {
      return "비밀번호는 최소 8자 이상이어야 합니다.";
    }

    if (form.password !== form.passwordConfirm) {
      return "비밀번호 확인이 일치하지 않습니다.";
    }

    if (!form.birthDate) {
      return "생년월일을 입력해 주세요.";
    }

    if (!form.birthTime) {
      return "태어난 시간을 입력해 주세요.";
    }

    if (!form.agreeTerms) {
      return "이용약관에 동의해 주세요.";
    }

    if (!form.agreePrivacy) {
      return "개인정보 처리방침에 동의해 주세요.";
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
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          birthDate: form.birthDate,
          birthTime: form.birthTime,
          gender: form.gender,
        }),
      });

      const payload = await parseJsonResponse<SignupResult & {
        errors?: string[];
      }>(response);

      if (!response.ok) {
        if (Array.isArray(payload.errors) && payload.errors.length > 0) {
          setError(payload.errors.join(" "));
        } else if (response.status === 503) {
          setError("서버가 준비 중입니다. 잠시 후 다시 시도해 주세요.");
        } else {
          setError(payload.message || "회원가입에 실패했습니다.");
        }
        return;
      }

      persistAuth(payload.token, payload.user);

      const name = payload.user?.name ?? "회원님";
      const pts = payload.user?.points ?? 50;
      try { sessionStorage.setItem('fortune_just_logged_in', name); } catch (_) {}
      showToast(
        `✦ 환영합니다 ${name}! 별빛 여정을 시작합니다 — ${pts}P 지급 완료!`,
        "success",
      );
      setForm(INITIAL_FORM);
      setFieldTouched({});
      setIsRedirecting(true);
      setTimeout(() => router.replace("/"), 700);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(msg || "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#3b0764] px-4 py-10 text-slate-100">
      {/* 코즈믹 로딩 오버레이 — API 처리 중 또는 리다이렉트 중 */}
      {(loading || isRedirecting) && (
        <div className="fixed inset-0 z-[9998] flex flex-col items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #3b0764 100%)' }}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:60px_60px] opacity-35" />
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute top-1/3 left-1/4 h-56 w-56 rounded-full bg-violet-600/20 blur-3xl animate-pulse" />
            <div className="absolute bottom-1/3 right-1/4 h-40 w-40 rounded-full bg-fuchsia-500/20 blur-3xl animate-pulse" style={{ animationDelay: '0.9s' }} />
          </div>
          <div className="relative z-10 flex flex-col items-center gap-6">
            <div className="relative h-20 w-20">
              <div className="absolute inset-0 rounded-full border border-violet-500/20" />
              <div className="absolute inset-0 rounded-full border-t-2 border-violet-400 animate-spin" />
              <div className="absolute inset-[5px] rounded-full border-t-2 border-fuchsia-400/70 animate-spin" style={{ animationDuration: '1.4s', animationDirection: 'reverse' }} />
              <div className="absolute inset-0 flex items-center justify-center text-2xl text-violet-300 animate-pulse">✦</div>
            </div>
            <div className="text-center">
              <p className="text-base font-bold tracking-wide text-white">
                {isRedirecting ? '별빛 여정으로 이동 중...' : '별빛 여정을 준비하고 있습니다'}
              </p>
              <p className="mt-1 text-sm text-violet-200/60">잠시만 기다려 주세요...</p>
            </div>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.20)_1px,transparent_1px)] [background-size:64px_64px] opacity-40 animate-twinkle" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(168,85,247,0.32),transparent_28%),radial-gradient(circle_at_15%_80%,rgba(147,51,234,0.22),transparent_33%)]" />

      <div className="relative mx-auto w-full max-w-xl opacity-0 animate-fade-in-up">
        <div className="rounded-3xl bg-gradient-to-br from-violet-300/35 via-fuchsia-300/10 to-slate-200/35 p-[1px] shadow-violet-neon">
          <section className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-xl sm:p-8">
            <header className="mb-6 text-center">
              <p className="mb-2 inline-flex rounded-full border border-violet-300/40 bg-violet-400/10 px-3 py-1 text-[11px] font-semibold tracking-[0.25em] text-violet-200">
                TWILIGHT SIGN UP
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">신비로운 별빛 회원가입</h1>
              <p className="mt-2 text-sm leading-6 text-violet-100/80">
                입력한 정보는 사주 · 자미두수 · 숙요 · 점성술 데이터 추출에 사용됩니다.
              </p>
              <p className="mt-3 text-sm text-violet-100/75">
                이미 계정이 있다면{" "}
                <Link href="/login" className="font-semibold text-violet-200 underline decoration-violet-300/70 underline-offset-4 hover:text-violet-100">
                  로그인
                </Link>
                으로 이동하세요.
              </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* 이름 */}
                <div className="sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-semibold tracking-wide text-violet-100/85">이름</span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => onChange("name", e.target.value)}
                    onBlur={() => markTouched("name")}
                    placeholder="홍길동"
                    className={ib("name")}
                    autoComplete="name"
                  />
                  {fe("name", "이름은 최소 2자 이상 입력해 주세요.")}
                </div>

                {/* 이메일 */}
                <div className="sm:col-span-2">
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

                {/* 비밀번호 */}
                <div className="sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-semibold tracking-wide text-violet-100/85">비밀번호</span>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => onChange("password", e.target.value)}
                    onBlur={() => markTouched("password")}
                    placeholder="최소 8자 이상"
                    className={ib("password")}
                    autoComplete="new-password"
                  />
                  {fe("password", "비밀번호는 최소 8자 이상이어야 합니다.")}
                </div>

                {/* 비밀번호 확인 */}
                <div className="sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-semibold tracking-wide text-violet-100/85">비밀번호 확인</span>
                  <input
                    type="password"
                    value={form.passwordConfirm}
                    onChange={(e) => onChange("passwordConfirm", e.target.value)}
                    onBlur={() => markTouched("passwordConfirm")}
                    placeholder="비밀번호를 다시 입력해 주세요"
                    className={ib("passwordConfirm")}
                    autoComplete="new-password"
                  />
                  {fe("passwordConfirm", "비밀번호가 일치하지 않습니다.")}
                </div>

                {/* 생년월일 */}
                <div>
                  <span className="mb-1.5 block text-xs font-semibold tracking-wide text-violet-100/85">생년월일</span>
                  <input
                    type="date"
                    value={form.birthDate}
                    onChange={(e) => onChange("birthDate", e.target.value)}
                    onBlur={() => markTouched("birthDate")}
                    className={ib("birthDate")}
                  />
                  {fe("birthDate", "생년월일을 선택해 주세요.")}
                </div>

                {/* 태어난 시간 */}
                <div>
                  <span className="mb-1.5 block text-xs font-semibold tracking-wide text-violet-100/85">태어난 시간</span>
                  <input
                    type="time"
                    value={form.birthTime}
                    onChange={(e) => onChange("birthTime", e.target.value)}
                    onBlur={() => markTouched("birthTime")}
                    className={ib("birthTime")}
                  />
                  {fe("birthTime", "태어난 시간을 선택해 주세요.")}
                </div>

                {/* 성별 */}
                <div className="sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-semibold tracking-wide text-violet-100/85">성별</span>
                  <select
                    value={form.gender}
                    onChange={(e) => onChange("gender", e.target.value as SignupFormState["gender"])}
                    className="w-full rounded-xl border border-violet-200/20 bg-slate-950/30 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition-all duration-300 focus:border-violet-300/70 focus:ring-2 focus:ring-violet-400/50"
                  >
                    <option value="OTHER">기타 / 응답하지 않음</option>
                    <option value="F">여성</option>
                    <option value="M">남성</option>
                  </select>
                </div>
              </div>

              {/* 신규가입 혜택 안내 */}
              <div className="flex items-center gap-2 rounded-xl border border-fuchsia-400/25 bg-fuchsia-500/10 px-3.5 py-2.5">
                <span className="text-sm text-fuchsia-200">✦</span>
                <p className="text-xs text-fuchsia-100/90">신규 가입 시 <strong>50P</strong>가 무료 지급됩니다!</p>
              </div>

              {/* 약관 동의 */}
              <div className="space-y-2.5 rounded-2xl border border-violet-300/15 bg-violet-900/20 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300/70">약관 동의</p>

                {/* 전체 동의 */}
                <label className="group flex cursor-pointer items-center gap-3 rounded-xl border border-violet-300/20 bg-violet-400/10 px-3.5 py-2.5 transition-colors hover:bg-violet-400/15">
                  <input
                    type="checkbox"
                    checked={form.agreeTerms && form.agreePrivacy}
                    onChange={(e) => {
                      onChange("agreeTerms", e.target.checked);
                      onChange("agreePrivacy", e.target.checked);
                    }}
                    className="h-4 w-4 shrink-0 cursor-pointer appearance-none rounded border border-violet-300/50 bg-slate-900/40 checked:border-violet-400 checked:bg-violet-500 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400/40
                    [&:checked]:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 10 10%22><polyline points=%221.5,5 4,8 8.5,2%22 stroke=%22white%22 stroke-width=%221.5%22 fill=%22none%22 stroke-linecap=%22round%22/></svg>')]
                    [&:checked]:bg-center [&:checked]:bg-no-repeat [&:checked]:bg-[length:75%]"
                  />
                  <span className="text-sm font-semibold text-violet-100">전체 동의 (필수 항목 모두 포함)</span>
                </label>

                <div className="ml-1 space-y-2 border-l border-violet-300/15 pl-3">
                  {/* 이용약관 동의 */}
                  <label className="group flex cursor-pointer items-start gap-3 py-1">
                    <input
                      type="checkbox"
                      checked={form.agreeTerms}
                      onChange={(e) => onChange("agreeTerms", e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer appearance-none rounded border border-violet-300/50 bg-slate-900/40 checked:border-violet-400 checked:bg-violet-500 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400/40
                      [&:checked]:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 10 10%22><polyline points=%221.5,5 4,8 8.5,2%22 stroke=%22white%22 stroke-width=%221.5%22 fill=%22none%22 stroke-linecap=%22round%22/></svg>')]
                      [&:checked]:bg-center [&:checked]:bg-no-repeat [&:checked]:bg-[length:75%]"
                    />
                    <span className="flex flex-wrap items-center gap-x-1.5 text-sm text-violet-100/90">
                      <span className="text-rose-300 text-[10px] font-bold tracking-wide">[필수]</span>
                      <span>이용약관에 동의합니다</span>
                      <Link
                        href="/terms-of-service"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-medium text-violet-300/80 underline underline-offset-2 hover:text-violet-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        보기 ↗
                      </Link>
                    </span>
                  </label>

                  {/* 개인정보 처리방침 동의 */}
                  <label className="group flex cursor-pointer items-start gap-3 py-1">
                    <input
                      type="checkbox"
                      checked={form.agreePrivacy}
                      onChange={(e) => onChange("agreePrivacy", e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer appearance-none rounded border border-violet-300/50 bg-slate-900/40 checked:border-violet-400 checked:bg-violet-500 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400/40
                      [&:checked]:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 10 10%22><polyline points=%221.5,5 4,8 8.5,2%22 stroke=%22white%22 stroke-width=%221.5%22 fill=%22none%22 stroke-linecap=%22round%22/></svg>')]
                      [&:checked]:bg-center [&:checked]:bg-no-repeat [&:checked]:bg-[length:75%]"
                    />
                    <span className="flex flex-wrap items-center gap-x-1.5 text-sm text-violet-100/90">
                      <span className="text-rose-300 text-[10px] font-bold tracking-wide">[필수]</span>
                      <span>개인정보 처리방침에 동의합니다</span>
                      <Link
                        href="/privacy-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-medium text-violet-300/80 underline underline-offset-2 hover:text-violet-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        보기 ↗
                      </Link>
                    </span>
                  </label>
                </div>
              </div>

              {error ? (
                <p className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>
              ) : null}

              <button
                type="submit"
                disabled={loading || !form.agreeTerms || !form.agreePrivacy}
                className="mt-2 inline-flex w-full items-center justify-center rounded-xl border border-violet-200/45 bg-gradient-to-r from-violet-600/70 via-fuchsia-600/70 to-indigo-600/70 px-4 py-3 text-sm font-semibold tracking-wide text-white shadow-[0_8px_30px_rgba(76,29,149,.35)] transition-all duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "별빛 정보를 수집하는 중..." : "회원가입하고 운세 시작하기"}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-violet-100/20" />
              <span className="text-[11px] font-semibold tracking-[0.2em] text-violet-100/60">SOCIAL SIGN UP</span>
              <div className="h-px flex-1 bg-violet-100/20" />
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => startSocialSignup("google")}
                disabled={loading || socialLoading !== null}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white text-[14px] font-semibold text-slate-800 shadow-[0_10px_24px_rgba(15,23,42,.15)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(15,23,42,.22)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[15px] font-bold text-[#4285F4]">G</span>
                {socialLoading === "google" ? "Google 인증으로 이동 중..." : "Google로 빠른 회원가입"}
              </button>

              <button
                type="button"
                onClick={() => startSocialSignup("naver")}
                disabled={loading || socialLoading !== null}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#0ea05a] bg-[#03C75A] text-[14px] font-semibold text-white shadow-[0_10px_24px_rgba(3,199,90,.28)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_16px_30px_rgba(3,199,90,.35)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[15px] font-black text-[#03C75A]">N</span>
                {socialLoading === "naver" ? "네이버 인증으로 이동 중..." : "네이버로 빠른 회원가입"}
              </button>

              <button
                type="button"
                onClick={() => startSocialSignup("kakao")}
                disabled={loading || socialLoading !== null}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#f0d200] bg-[#FEE500] text-[14px] font-semibold text-[#191919] shadow-[0_10px_24px_rgba(254,229,0,.32)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_16px_30px_rgba(254,229,0,.4)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#191919] text-[15px] font-black text-[#FEE500]">K</span>
                {socialLoading === "kakao" ? "카카오 인증으로 이동 중..." : "카카오로 빠른 회원가입"}
              </button>
            </div>

            <footer className="mt-5 text-center text-xs text-violet-100/50">
              회원가입 시 입력하신 정보는 운세 서비스 제공 목적으로만 사용됩니다.
            </footer>
          </section>
        </div>
      </div>
    </main>
  );
}
