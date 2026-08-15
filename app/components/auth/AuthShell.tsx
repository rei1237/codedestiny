"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import { trackEvent } from "@/lib/analytics";
import { getApiBaseUrl } from "../../_lib/api-config";
import {
  authFetch,
  isMobileAppRuntime,
  mobileAppAuthHeaders,
  persistMobileAppAccessToken,
  persistMobileAppRefreshToken,
} from "../../_lib/auth-client";
import { resolveAuthReturnPath, sanitizeAuthReturnPath } from "../../_lib/auth-return";
import { hydrateAuthSuccessUser, login } from "../../_lib/auth-store";

type AuthMode = "login" | "signup";
type SocialProvider = "google" | "naver" | "kakao";
type AuthUser = { role?: string; [key: string]: unknown };

/** worker/lib/validation.js 의 MIN_NEW_PASSWORD_LENGTH 와 같은 값이어야 한다(가입·변경 전용). */
const MIN_NEW_PASSWORD_LENGTH = 10;

/* 가입 직후 프로필 카드가 서버 왕복을 기다리지 않게 하는 1회성 힌트.
   handleRegister(worker/routes/auth.js) 는 ProfileCard 를 한 장도 만들지 않으므로, "방금 가입했다"는
   곧 "카드 0장"이 확정이라는 뜻이다. 그 사실을 홈 셸에 넘겨 로딩 카드를 건너뛰게 한다.
   🔴 로그인에는 절대 쓰지 말 것 — 로그인 계정은 카드가 있을 수 있고, 그러면 "작성하세요"가 잘못 뜬다.
   읽는 쪽 정본은 js/destiny-profile.js 의 _dpConsumeFreshSignupHint 다. 키·형식이 그쪽과 같아야 한다. */
const FRESH_SIGNUP_HINT_KEY = "cd_fresh_signup_v1";

function markFreshSignup(user?: AuthUser) {
  const scope = String(user?.id || user?.userId || user?._id || user?.uid || "").trim().toLowerCase();
  if (!scope) return;
  try {
    sessionStorage.setItem(FRESH_SIGNUP_HINT_KEY, JSON.stringify({ scope, at: Date.now() }));
  } catch { /* 저장 실패는 기존 로딩 카드 경로로 폴백될 뿐이라 조용히 넘어간다 */ }
}

type Copy = {
  loginTitle: string; signupTitle: string; loginDescription: string; signupDescription: string;
  socialLabel: string; google: string; naver: string; kakao: string; moving: string; orEmail: string;
  email: string; password: string; name: string;
  showPassword: string; hidePassword: string; capsLock: string; passwordHint: string; login: string; signup: string;
  processing: string; switchToSignup: string; switchToLogin: string; noAccount: string; hasAccount: string;
  privacy: string; privacySummary: string; terms: string; age: string; required: string; finishTitle: string;
  finishDescription: string; finish: string; invalidEmail: string; invalidSignup: string;
  credentialsError: string; network: string; unavailable: string; providerPolicy: string;
};

const EN: Copy = {
  loginTitle: "Welcome back", signupTitle: "Save your destiny safely",
  loginDescription: "Continue quickly with a social account or email.",
  signupDescription: "Sign up and get 500 moonstones (worth ₩5,000) right away, usable on paid readings for 30 days. We only ask for the essentials.",
  socialLabel: "Continue with a social account", google: "Continue with Google", naver: "Continue with Naver",
  kakao: "Continue with Kakao", moving: "Opening authentication…", orEmail: "or use email",
  email: "Email", password: "Password", name: "Name",
  showPassword: "Show password", hidePassword: "Hide password", capsLock: "Caps Lock is on.",
  passwordHint: `At least ${MIN_NEW_PASSWORD_LENGTH} characters. Passwords found in known breaches are rejected.`,
  login: "Log in", signup: "Create account", processing: "Checking securely…",
  switchToSignup: "Create account", switchToLogin: "Log in", noAccount: "New here?", hasAccount: "Already have an account?",
  privacy: "I agree to the collection and use of personal information.",
  privacySummary: "Name and email / account management / until account deletion, except where law requires retention.",
  terms: "I agree to the Terms of Service.",
  age: "I confirm that I am at least 14 years old.", required: "Required agreements",
  finishTitle: "One last check", finishDescription: "We only need your name and the required agreements.",
  finish: "Finish and continue", invalidEmail: "Enter a valid email address.",
  invalidSignup: "Check your name, password, and required agreements.",
  credentialsError: "Check your email or password.", network: "The connection is unstable. Your entries are still here.",
  unavailable: "Authentication is temporarily unavailable. Try again shortly.",
  providerPolicy: "Your social provider’s account security policy also applies.",
};

const COPY: Partial<Record<LoadingLocale, Copy>> = {
  ko: {
    loginTitle: "다시 만나서 반가워요", signupTitle: "운명의 기록을 안전하게 저장해 보세요",
    loginDescription: "소셜 계정 또는 이메일로 빠르게 이어갈 수 있어요.",
    signupDescription: "가입하면 월정석 500개(5,000원 상당)를 바로 드려요 — 30일 안에 유료 콘텐츠에 쓸 수 있어요. 계정에는 꼭 필요한 정보만 받아요.",
    socialLabel: "소셜 계정으로 계속하기", google: "Google로 계속하기", naver: "네이버로 계속하기",
    kakao: "카카오로 계속하기", moving: "인증 화면으로 이동 중…", orEmail: "또는 이메일로 계속하기",
    email: "이메일", password: "비밀번호", name: "이름",
    showPassword: "비밀번호 보기", hidePassword: "비밀번호 숨기기", capsLock: "Caps Lock이 켜져 있어요.",
    passwordHint: `${MIN_NEW_PASSWORD_LENGTH}자 이상이어야 하고, 이미 유출된 것으로 알려진 비밀번호는 쓸 수 없어요.`,
    login: "로그인", signup: "가입하고 바로 시작하기", processing: "안전하게 확인 중…",
    switchToSignup: "회원가입", switchToLogin: "로그인", noAccount: "처음 오셨나요?", hasAccount: "이미 계정이 있나요?",
    privacy: "개인정보 수집·이용에 동의합니다.",
    privacySummary: "수집: 이름·이메일 / 목적: 계정 관리 / 보유: 탈퇴 시까지(법령상 보존 제외)",
    terms: "이용약관에 동의합니다.",
    age: "만 14세 이상임을 확인합니다.", required: "필수 동의",
    finishTitle: "마지막으로 조금만 확인할게요", finishDescription: "이름과 필수 동의만 확인하면 바로 이용할 수 있어요.",
    finish: "확인하고 바로 시작하기", invalidEmail: "이메일 형식을 확인해 주세요.",
    invalidSignup: "이름·비밀번호와 필수 동의를 확인해 주세요.",
    credentialsError: "이메일 또는 비밀번호를 다시 확인해 주세요.",
    network: "잠시 연결이 불안정해요. 입력한 내용은 그대로 유지했어요.",
    unavailable: "인증 서비스가 잠시 불안정해요. 잠시 후 다시 시도해 주세요.",
    providerPolicy: "소셜 인증 제공자의 계정 보안 정책도 함께 적용됩니다.",
  },
  ja: { ...EN, loginTitle: "おかえりなさい", signupTitle: "運命の記録を安全に保存しましょう", login: "ログイン", signup: "登録して始める", email: "メールアドレス", password: "パスワード", name: "お名前", age: "14歳以上であることを確認します。", required: "必須同意" },
  "zh-CN": { ...EN, loginTitle: "欢迎回来", signupTitle: "安全保存你的命运记录", login: "登录", signup: "注册并开始", email: "电子邮箱", password: "密码", name: "姓名", age: "我确认已满14周岁。", required: "必选同意" },
  "zh-TW": { ...EN, loginTitle: "歡迎回來", signupTitle: "安全保存你的命運記錄", login: "登入", signup: "註冊並開始", email: "電子郵件", password: "密碼", name: "姓名", age: "我確認已滿14歲。", required: "必要同意" },
};

function getCopy(locale: LoadingLocale): Copy { return COPY[locale] || EN; }
function isValidEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()); }
// 5xx 는 사용자가 고칠 수 없는 서버 문제라 안내 문구는 그대로 두되, 서버가 준 code·requestId 만
// 괄호로 덧붙인다. 이게 없으면 원인을 알아내려고 개발자도구를 열어야 한다(2026-08 가입 500 사례:
// 화면에는 "일시적으로 사용할 수 없다"만 뜨고 진짜 원인은 응답 본문에만 있었다).
// 🔴 서버 내부 메시지·스택은 절대 싣지 않는다.
function withServerDiagnostics(message: string, payload: { code?: string; requestId?: string }) {
  const parts = [payload?.code, payload?.requestId].filter(Boolean).map(String);
  return parts.length > 0 ? `${message} (${parts.join(" · ")})` : message;
}
export default function AuthShell({ initialMode }: { initialMode: AuthMode }) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const [ticket, setTicket] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [terms, setTerms] = useState(false);
  const [age, setAge] = useState(false);
  const [busy, setBusy] = useState(false);
  const [socialBusy, setSocialBusy] = useState<SocialProvider | null>(null);
  const [error, setError] = useState("");
  const copy = getCopy(locale);
  const apiBase = useMemo(() => getApiBaseUrl(), []);

  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    window.addEventListener("languagechange", sync);
    document.addEventListener("cd:language-change", sync);
    return () => { window.removeEventListener("languagechange", sync); document.removeEventListener("cd:language-change", sync); };
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTicket(params.get("social_signup") || params.get("socialSignupTicket") || "");
    if (params.get("error") || params.get("social_error")) setError(copy.unavailable);
  }, [copy.unavailable]);

  const nextPath = () => resolveAuthReturnPath(new URLSearchParams(window.location.search));
  const redirect = (raw?: string, role?: string) => {
    const target = sanitizeAuthReturnPath(raw) || nextPath();
    if (role === "admin" && target === "/") router.replace("/admin");
    else if (target === "/" || target === "/index.html") window.location.replace("/");
    else router.replace(target);
  };
  const completeClientLogin = (payload: { accessToken?: string; refreshToken?: string; user?: AuthUser }) => {
    if (isMobileAppRuntime() && payload.accessToken) {
      persistMobileAppAccessToken(payload.accessToken);
      persistMobileAppRefreshToken(payload.refreshToken || "");
    }
    if (payload.user) hydrateAuthSuccessUser(payload.user);
  };

  const startSocial = (provider: SocialProvider) => {
    if (socialBusy || busy) return;
    setError(""); setSocialBusy(provider);
    const native = (window as unknown as {
      CodeDestinyNative?: {
        openAuth?: (input: { provider: SocialProvider; nextPath?: string; flow?: AuthMode }) => Promise<{ ok?: boolean; message?: string }>;
      };
    }).CodeDestinyNative;
    if (typeof native?.openAuth === "function") {
      void native.openAuth({ provider, nextPath: nextPath(), flow: mode }).then((result) => {
        if (result?.ok === false) { setError(result.message || copy.unavailable); setSocialBusy(null); }
      }).catch(() => { setError(copy.network); setSocialBusy(null); });
      return;
    }
    const params = new URLSearchParams({ flow: mode, next: nextPath() });
    const current = new URLSearchParams(window.location.search);
    for (const key of ["ref", "rs", "via"]) { const value = current.get(key); if (value) params.set(key, value); }
    window.location.assign(`${apiBase}/api/auth/oauth/${provider}/start?${params.toString()}`);
  };

  const submitEmail = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!isValidEmail(email)) { setError(copy.invalidEmail); return; }
    // 🔴 로그인은 8자 그대로다. 기존 회원이 8~9자로 가입했을 수 있어 여기서 올리면 로그인이 막힌다.
    // 가입만 서버(worker/lib/validation.js MIN_NEW_PASSWORD_LENGTH)와 같은 10자를 요구한다.
    const minPasswordLength = mode === "signup" ? MIN_NEW_PASSWORD_LENGTH : 8;
    if (password.length < minPasswordLength || (mode === "signup" && (name.trim().length < 2 || !privacy || !terms || !age))) {
      setError(mode === "login" ? copy.credentialsError : copy.invalidSignup); return;
    }
    setBusy(true); setError("");
    try {
      if (mode === "login") {
        const result = await login({ email: email.trim(), password, nextPath: nextPath(), apiBase });
        trackEvent("login", { method: "password" });
        redirect(result.nextPath, result.user?.role);
        return;
      }
      const current = new URLSearchParams(window.location.search);
      const response = await authFetch(`${apiBase}/api/auth/register`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json", ...mobileAppAuthHeaders() },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, privacyAccepted: privacy, termsAccepted: terms, ageAttested: age, nextPath: nextPath(), referralCode: current.get("ref") || undefined, referralShareToken: current.get("rs") || undefined, referralSource: current.get("via") || undefined }),
      });
      const payload = await response.json().catch(() => ({})) as { message?: string; code?: string; requestId?: string; nextPath?: string; accessToken?: string; refreshToken?: string; user?: AuthUser };
      // 🔴 5xx 를 throw 로 넘기지 않는다 — 아래 catch 의 /failed|invalid|.../ 정규식이 진단 꼬리표
      // (예: db_write_failed)에 걸려 문구를 통째로 갈아치운다.
      if (!response.ok && response.status >= 500) { setError(withServerDiagnostics(copy.unavailable, payload)); return; }
      if (!response.ok) throw new Error(payload.message || copy.invalidSignup);
      completeClientLogin(payload);
      markFreshSignup(payload.user);
      trackEvent("signup", { method: "password" });
      redirect(payload.nextPath, payload.user?.role);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : copy.network;
      setError(/status|unauthorized|invalid|failed/i.test(message) ? (mode === "login" ? copy.credentialsError : copy.invalidSignup) : message);
    } finally { setBusy(false); }
  };

  const finishSocialSignup = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (name.trim().length < 2 || !privacy || !terms || !age) { setError(copy.invalidSignup); return; }
    setBusy(true); setError("");
    try {
      const response = await authFetch(`${apiBase}/api/auth/oauth/complete-signup`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json", ...mobileAppAuthHeaders() },
        body: JSON.stringify({ socialSignupTicket: ticket, name: name.trim(), privacyAccepted: privacy, termsAccepted: terms, ageAttested: age, nextPath: nextPath() }),
      });
      const payload = await response.json().catch(() => ({})) as { message?: string; code?: string; requestId?: string; nextPath?: string; appRedirectUrl?: string; accessToken?: string; refreshToken?: string; user?: AuthUser };
      if (!response.ok && response.status >= 500) { setError(withServerDiagnostics(copy.unavailable, payload)); return; }
      if (!response.ok) throw new Error(payload.message || copy.invalidSignup);
      completeClientLogin(payload);
      markFreshSignup(payload.user);
      trackEvent("signup", { method: "social" });
      if (payload.appRedirectUrl) window.location.assign(payload.appRedirectUrl); else redirect(payload.nextPath, payload.user?.role);
    } catch (reason) { setError(reason instanceof Error ? reason.message : copy.network); }
    finally { setBusy(false); }
  };

  const isSignup = mode === "signup" || Boolean(ticket);
  return <main className="relative min-h-[100dvh] overflow-x-hidden bg-[#090b1a] px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))] text-white [color-scheme:dark] sm:px-6">
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(125,92,190,.32),transparent_42%),linear-gradient(180deg,#11132a_0%,#090b1a_72%)]" />
    <div className="relative mx-auto flex min-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2.5rem)] w-full max-w-[440px] items-center py-3">
      <section className="w-full rounded-[24px] border border-[#c9b7f0]/20 bg-[#12152b] p-5 shadow-[0_24px_70px_rgba(0,0,0,.38)] sm:p-7" aria-labelledby="auth-title">
        <header className="text-center"><img src="/icons/app-logo-96.png" width="52" height="52" alt="" className="mx-auto h-[52px] w-[52px] rounded-2xl" /><h1 id="auth-title" className="mt-4 text-balance text-[1.55rem] font-black tracking-[-0.025em]">{ticket ? copy.finishTitle : isSignup ? copy.signupTitle : copy.loginTitle}</h1><p className="mx-auto mt-2 max-w-[38ch] text-pretty text-sm leading-6 text-[#d8d0ea]">{ticket ? copy.finishDescription : isSignup ? copy.signupDescription : copy.loginDescription}</p></header>
        <div className="my-4 min-h-6" aria-live="polite">{error ? <p id="auth-error" role="alert" className="rounded-xl border border-[#ff8ca5]/40 bg-[#421d2a] px-3 py-2.5 text-sm text-[#ffd7df]">{error}</p> : null}</div>
        {!ticket && <><section aria-label={copy.socialLabel}><div className="grid gap-3">{(["google", "naver", "kakao"] as const).map((provider) => <button key={provider} type="button" disabled={Boolean(socialBusy) || busy} onClick={() => startSocial(provider)} className={`min-h-12 rounded-xl border px-4 text-sm font-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-55 ${provider === "google" ? "border-[#d9dce5] bg-white text-[#252735]" : provider === "naver" ? "border-[#03a94d] bg-[#03C75A] text-white" : "border-[#e3cb00] bg-[#FEE500] text-[#191919]"}`}>{socialBusy === provider ? copy.moving : provider === "google" ? copy.google : provider === "naver" ? copy.naver : copy.kakao}</button>)}</div><p className="mt-3 text-center text-xs leading-5 text-[#a99dbd]">{copy.providerPolicy}</p></section><div className="my-5 flex items-center gap-3 text-xs text-[#aa9fbd]"><span className="h-px flex-1 bg-[#c9b7f0]/15" /><span>{copy.orEmail}</span><span className="h-px flex-1 bg-[#c9b7f0]/15" /></div></>}
        <form onSubmit={ticket ? finishSocialSignup : submitEmail} className="space-y-4" noValidate aria-describedby={error ? "auth-error" : undefined}>
          {isSignup && <Field id="auth-name" label={copy.name}><input id="auth-name" type="text" autoComplete="name" maxLength={40} value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /></Field>}
          {!ticket && <><Field id="auth-email" label={copy.email}><input id="auth-email" type="email" inputMode="email" autoComplete={isSignup ? "email" : "username"} value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} /></Field><Field id="auth-password" label={copy.password}><div className="relative"><input id="auth-password" type={showPassword ? "text" : "password"} autoComplete={isSignup ? "new-password" : "current-password"} minLength={isSignup ? MIN_NEW_PASSWORD_LENGTH : 8} value={password} onChange={(event) => setPassword(event.target.value)} onKeyUp={(event) => setCapsLock(event.getModifierState("CapsLock"))} className={`${inputClass} pr-14`} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? copy.hidePassword : copy.showPassword} className="absolute inset-y-0 right-0 min-w-12 px-3 text-xs font-bold text-[#d6c9eb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#dbc9ff]">{showPassword ? "Hide" : "Show"}</button></div>{isSignup && <p className="mt-1.5 text-xs leading-5 text-[#b9aecf]">{copy.passwordHint}</p>}{capsLock && <p className="mt-1.5 text-xs text-[#ffd18a]">{copy.capsLock}</p>}</Field></>}
          {isSignup && <fieldset className="space-y-2 rounded-xl border border-[#c9b7f0]/18 bg-[#0d1022] p-3"><legend className="px-1 text-xs font-bold text-[#cfc4e5]">{copy.required}</legend><Check id="auth-privacy" checked={privacy} onChange={setPrivacy}><Link href="/privacy" target="_blank" className="underline underline-offset-4">{copy.privacy}</Link></Check><p className="pl-9 text-[11px] leading-5 text-[#aa9fbd]">{copy.privacySummary}</p><Check id="auth-terms" checked={terms} onChange={setTerms}><Link href="/terms" target="_blank" className="underline underline-offset-4">{copy.terms}</Link></Check><Check id="auth-age" checked={age} onChange={setAge}>{copy.age}</Check></fieldset>}
          <button type="submit" disabled={busy || Boolean(socialBusy)} aria-busy={busy} className="min-h-12 w-full rounded-xl border border-[#b89ae8]/45 bg-[#7c5cbf] px-4 text-sm font-black text-white shadow-[0_10px_28px_rgba(65,42,116,.36)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dbc9ff] disabled:opacity-55">{busy ? copy.processing : ticket ? copy.finish : isSignup ? copy.signup : copy.login}</button>
        </form>
        {!ticket && <p className="mt-5 text-center text-sm text-[#cfc4e1]">{isSignup ? copy.hasAccount : copy.noAccount} <Link href={isSignup ? `/login?next=${encodeURIComponent(nextPath())}` : `/signup?next=${encodeURIComponent(nextPath())}`} onClick={() => { setMode(isSignup ? "login" : "signup"); setError(""); }} className="ml-1 min-h-11 font-black text-[#d7c1ff] underline underline-offset-4">{isSignup ? copy.switchToLogin : copy.switchToSignup}</Link></p>}
      </section>
    </div>
  </main>;
}

const inputClass = "min-h-12 w-full rounded-xl border border-[#c9b7f0]/25 bg-[#090b1a] px-3 text-base text-white outline-none placeholder:text-[#8e84a2] focus:border-[#b89ae8] focus:ring-2 focus:ring-[#8f6ccc]/35";
function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) { return <div><label htmlFor={id} className="mb-1.5 block text-sm font-bold text-[#e7def7]">{label}</label>{children}</div>; }
function Check({ id, checked, onChange, children }: { id: string; checked: boolean; onChange: (value: boolean) => void; children: ReactNode }) { return <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-1 text-sm leading-5 text-[#ddd4ec]"><input id={id} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 shrink-0 accent-[#8f6ccc]" /><span>{children}</span></label>; }
