"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type SignupFormState = {
  name: string;
  email: string;
  password: string;
  birthDate: string;
  birthTime: string;
  gender: "M" | "F" | "OTHER";
};

type SignupResult = {
  message?: string;
  token?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    birthDate: string;
    birthTime: string;
    gender: string;
    role: "user" | "admin";
    joinedAt: string;
  };
};

const INITIAL_FORM: SignupFormState = {
  name: "",
  email: "",
  password: "",
  birthDate: "",
  birthTime: "",
  gender: "OTHER",
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupPage() {
  const [form, setForm] = useState<SignupFormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000",
    [],
  );

  const endpoint = `${apiBase}/api/auth/register`;

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

    if (!form.birthDate) {
      return "생년월일을 입력해 주세요.";
    }

    if (!form.birthTime) {
      return "태어난 시간을 입력해 주세요.";
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

      const payload = (await response.json()) as SignupResult & {
        errors?: string[];
      };

      if (!response.ok) {
        if (Array.isArray(payload.errors) && payload.errors.length > 0) {
          setError(payload.errors.join(" "));
        } else {
          setError(payload.message || "회원가입에 실패했습니다.");
        }
        return;
      }

      persistAuth(payload.token, payload.user);

      setSuccess(payload.message || "회원가입이 완료되었습니다.");
      setForm(INITIAL_FORM);
    } catch {
      setError("서버에 연결할 수 없습니다. API 서버 실행 상태를 확인해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#3b0764] px-4 py-10 text-slate-100">
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
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-semibold tracking-wide text-violet-100/85">이름</span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => onChange("name", e.target.value)}
                    placeholder="홍길동"
                    className="w-full rounded-xl border border-violet-200/20 bg-slate-950/30 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-300/45 outline-none transition-all duration-300 focus:border-violet-300/70 focus:shadow-violet-neon-focus focus:ring-2 focus:ring-violet-400/50"
                    autoComplete="name"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-semibold tracking-wide text-violet-100/85">이메일</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => onChange("email", e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-violet-200/20 bg-slate-950/30 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-300/45 outline-none transition-all duration-300 focus:border-violet-300/70 focus:shadow-violet-neon-focus focus:ring-2 focus:ring-violet-400/50"
                    autoComplete="email"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-semibold tracking-wide text-violet-100/85">비밀번호</span>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => onChange("password", e.target.value)}
                    placeholder="최소 8자 이상"
                    className="w-full rounded-xl border border-violet-200/20 bg-slate-950/30 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-300/45 outline-none transition-all duration-300 focus:border-violet-300/70 focus:shadow-violet-neon-focus focus:ring-2 focus:ring-violet-400/50"
                    autoComplete="new-password"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold tracking-wide text-violet-100/85">생년월일</span>
                  <input
                    type="date"
                    value={form.birthDate}
                    onChange={(e) => onChange("birthDate", e.target.value)}
                    className="w-full rounded-xl border border-violet-200/20 bg-slate-950/30 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition-all duration-300 focus:border-violet-300/70 focus:shadow-violet-neon-focus focus:ring-2 focus:ring-violet-400/50"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold tracking-wide text-violet-100/85">태어난 시간</span>
                  <input
                    type="time"
                    value={form.birthTime}
                    onChange={(e) => onChange("birthTime", e.target.value)}
                    className="w-full rounded-xl border border-violet-200/20 bg-slate-950/30 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition-all duration-300 focus:border-violet-300/70 focus:shadow-violet-neon-focus focus:ring-2 focus:ring-violet-400/50"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-semibold tracking-wide text-violet-100/85">성별</span>
                  <select
                    value={form.gender}
                    onChange={(e) => onChange("gender", e.target.value as SignupFormState["gender"])}
                    className="w-full rounded-xl border border-violet-200/20 bg-slate-950/30 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition-all duration-300 focus:border-violet-300/70 focus:shadow-violet-neon-focus focus:ring-2 focus:ring-violet-400/50"
                  >
                    <option value="OTHER">기타 / 응답하지 않음</option>
                    <option value="F">여성</option>
                    <option value="M">남성</option>
                  </select>
                </label>
              </div>

              {error ? (
                <p className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>
              ) : null}

              {success ? (
                <p className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{success}</p>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 inline-flex w-full items-center justify-center rounded-xl border border-violet-200/45 bg-gradient-to-r from-violet-600/70 via-fuchsia-600/70 to-indigo-600/70 px-4 py-3 text-sm font-semibold tracking-wide text-white shadow-[0_8px_30px_rgba(76,29,149,.35)] transition-all duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "별빛 정보를 수집하는 중..." : "회원가입하고 운세 시작하기"}
              </button>
            </form>

            <footer className="mt-5 text-center text-xs text-violet-100/65">
              API Endpoint: <span className="font-mono text-violet-200/90">{endpoint}</span>
            </footer>
          </section>
        </div>
      </div>
    </main>
  );
}
