"use client";

import Link from "next/link";
import { type FormEvent, type ReactNode, useState } from "react";
import { getApiBaseUrl } from "../../_lib/api-config";
import {
  authFetch,
  isMobileAppRuntime,
  mobileAppAuthHeaders,
  persistMobileAppAccessToken,
  persistMobileAppRefreshToken,
} from "../../_lib/auth-client";
import { hydrateAuthSuccessUser } from "../../_lib/auth-store";

/** worker/lib/validation.js 의 MIN_NEW_PASSWORD_LENGTH 와 같은 값이어야 한다. */
const MIN_NEW_PASSWORD_LENGTH = 10;

const COPY = {
  title: "비밀번호 변경",
  description:
    "새 비밀번호는 다른 사이트에서 쓰지 않는 값으로 정해 주세요. 이미 유출된 것으로 알려진 비밀번호는 저장되지 않습니다.",
  current: "현재 비밀번호",
  next: "새 비밀번호",
  confirm: "새 비밀번호 확인",
  hint: `${MIN_NEW_PASSWORD_LENGTH}자 이상, 이메일·이름을 포함하지 않아야 합니다.`,
  revokeNotice: "변경하면 다른 기기에 남아 있는 로그인이 모두 해제됩니다.",
  submit: "비밀번호 변경",
  processing: "변경 중...",
  show: "표시",
  hide: "숨김",
  mismatch: "새 비밀번호와 확인 값이 서로 달라요.",
  tooShort: `새 비밀번호는 ${MIN_NEW_PASSWORD_LENGTH}자 이상이어야 해요.`,
  same: "지금 쓰는 비밀번호와 다른 값을 정해 주세요.",
  network: "연결이 불안정해 변경하지 못했어요. 잠시 후 다시 시도해 주세요.",
  needLogin: "로그인이 만료됐어요. 다시 로그인한 뒤 시도해 주세요.",
  done: "비밀번호를 바꿨어요. 다른 기기의 로그인은 모두 해제됐습니다.",
  back: "홈으로",
} as const;

type ChangePasswordPayload = {
  ok?: boolean;
  code?: string;
  message?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: { role?: string; [key: string]: unknown };
};

export default function PasswordChangeClient() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;

    if (nextPassword.length < MIN_NEW_PASSWORD_LENGTH) { setError(COPY.tooShort); return; }
    if (nextPassword !== confirmPassword) { setError(COPY.mismatch); return; }
    if (nextPassword === currentPassword) { setError(COPY.same); return; }

    setBusy(true);
    setError("");
    try {
      const apiBase = String(getApiBaseUrl() || "").trim();
      const response = await authFetch(`${apiBase}/api/auth/password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...mobileAppAuthHeaders() },
        body: JSON.stringify({ currentPassword, newPassword: nextPassword }),
      });
      const payload = await response.json().catch(() => ({})) as ChangePasswordPayload;
      if (!response.ok) {
        setError(response.status === 401 ? COPY.needLogin : (payload.message || COPY.network));
        return;
      }
      // 서버가 다른 세션을 전부 폐기하고 이 기기에만 새 세션을 발급했다 — 로그인 성공 경로와
      // 같은 방식으로 반영하지 않으면 다음 요청이 방금 폐기된 토큰을 쓴다.
      if (isMobileAppRuntime() && payload.accessToken) {
        persistMobileAppAccessToken(payload.accessToken);
        persistMobileAppRefreshToken(payload.refreshToken || "");
      }
      if (payload.user) hydrateAuthSuccessUser(payload.user);
      setCurrentPassword("");
      setNextPassword("");
      setConfirmPassword("");
      setDone(true);
    } catch {
      setError(COPY.network);
    } finally {
      setBusy(false);
    }
  };

  return <main className="relative min-h-[100dvh] overflow-x-hidden bg-[#090b1a] px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))] text-white [color-scheme:dark] sm:px-6">
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(125,92,190,.32),transparent_42%),linear-gradient(180deg,#11132a_0%,#090b1a_72%)]" />
    <div className="relative mx-auto flex min-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2.5rem)] w-full max-w-[440px] items-center py-3">
      <section className="w-full rounded-[24px] border border-[#c9b7f0]/20 bg-[#12152b] p-5 shadow-[0_24px_70px_rgba(0,0,0,.38)] sm:p-7" aria-labelledby="password-title">
        <header className="text-center">
          <h1 id="password-title" className="text-balance text-[1.55rem] font-black tracking-[-0.025em]">{COPY.title}</h1>
          <p className="mx-auto mt-2 max-w-[38ch] text-pretty text-sm leading-6 text-[#d8d0ea]">{COPY.description}</p>
        </header>

        <div className="my-4 min-h-6" aria-live="polite">
          {error ? <p id="password-error" role="alert" className="rounded-xl border border-[#ff8ca5]/40 bg-[#421d2a] px-3 py-2.5 text-sm text-[#ffd7df]">{error}</p> : null}
          {done ? <p role="status" className="rounded-xl border border-[#8ce0b0]/40 bg-[#123326] px-3 py-2.5 text-sm text-[#d7ffe9]">{COPY.done}</p> : null}
        </div>

        <form onSubmit={submit} className="space-y-4" noValidate aria-describedby={error ? "password-error" : undefined}>
          <Field id="password-current" label={COPY.current}>
            <input id="password-current" type={reveal ? "text" : "password"} autoComplete="current-password" minLength={8} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className={inputClass} />
          </Field>
          <Field id="password-next" label={COPY.next}>
            <div className="relative">
              <input id="password-next" type={reveal ? "text" : "password"} autoComplete="new-password" minLength={MIN_NEW_PASSWORD_LENGTH} value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} className={`${inputClass} pr-16`} />
              <button type="button" onClick={() => setReveal((value) => !value)} aria-label={reveal ? COPY.hide : COPY.show} className="absolute inset-y-0 right-0 min-w-12 px-3 text-xs font-bold text-[#d6c9eb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#dbc9ff]">{reveal ? COPY.hide : COPY.show}</button>
            </div>
            <p className="mt-1.5 text-xs leading-5 text-[#b9aecf]">{COPY.hint}</p>
          </Field>
          <Field id="password-confirm" label={COPY.confirm}>
            <input id="password-confirm" type={reveal ? "text" : "password"} autoComplete="new-password" minLength={MIN_NEW_PASSWORD_LENGTH} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClass} />
          </Field>

          <p className="rounded-xl border border-[#c9b7f0]/18 bg-[#0d1022] px-3 py-2.5 text-xs leading-5 text-[#cfc4e5]">{COPY.revokeNotice}</p>

          <button type="submit" disabled={busy} aria-busy={busy} className="min-h-12 w-full rounded-xl border border-[#b89ae8]/45 bg-[#7c5cbf] px-4 text-sm font-black text-white shadow-[0_10px_28px_rgba(65,42,116,.36)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dbc9ff] disabled:opacity-55">{busy ? COPY.processing : COPY.submit}</button>
        </form>

        <p className="mt-5 text-center text-sm text-[#cfc4e1]">
          <Link href="/" className="min-h-11 font-black text-[#d7c1ff] underline underline-offset-4">{COPY.back}</Link>
        </p>
      </section>
    </div>
  </main>;
}

const inputClass = "min-h-12 w-full rounded-xl border border-[#c9b7f0]/25 bg-[#090b1a] px-3 text-base text-white outline-none placeholder:text-[#8e84a2] focus:border-[#b89ae8] focus:ring-2 focus:ring-[#8f6ccc]/35";

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return <div><label htmlFor={id} className="mb-1.5 block text-sm font-bold text-[#e7def7]">{label}</label>{children}</div>;
}
