"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import { getApiBaseUrl } from "../_lib/api-config";
import { authFetch, mobileAppAuthHeaders } from "../_lib/auth-client";
import { resolveAuthReturnPath } from "../_lib/auth-return";
import { hydrateAuthSuccessUser, primeAuthFromCache, refreshAuth, useAuthStore } from "../_lib/auth-store";
import { formatKoreanPhoneInput, hasPhoneInput, toStoredPhoneDigits } from "../components/auth/phone-input";

/**
 * 프로필 보완 화면 — 번호가 없는 회원을 로그인 직후 **딱 한 번** 붙잡는 자리.
 *
 * 진입은 서버가 결정한다(worker/routes/auth.js applyProfileCompletionGate). 여기서 다시
 * "번호가 없나?"를 판정하지 않는다 — 이중 판정은 서버가 이미 표식을 남긴 뒤라 어긋나기만 한다.
 *
 * 🔴 두 입력 모두 선택이고 [나중에 하기]가 항상 열려 있다. 2026-08-15 에 번호를 가입에서 뺀
 * 이유가 이탈이었으므로, 여기서 다시 막으면 그 결정을 되돌리는 셈이 된다.
 */

const PROVIDER_PLACEHOLDER_NAME = /^(google|naver|kakao)\s+user$/i;

type Copy = {
  title: string; description: string; name: string; namePlaceholder: string;
  phone: string; phoneOptional: string; phoneHint: string; phoneInvalid: string; phoneConsent: string;
  invalidName: string; save: string; saving: string; skip: string; network: string; unavailable: string;
  privacyLink: string;
};

const EN: Copy = {
  title: "One last step",
  description: "Add the details we need to open paid readings without interrupting you later. Both fields are optional.",
  name: "Name", namePlaceholder: "Your name",
  phone: "Phone number", phoneOptional: "optional",
  phoneHint: "Only used for card payments. You can add it later at checkout instead.",
  phoneInvalid: "Enter a valid mobile number.",
  phoneConsent: "I agree to the collection and use of my phone number for payment processing.",
  invalidName: "Enter at least 2 characters.",
  save: "Save and continue", saving: "Saving…", skip: "Do this later",
  network: "The connection is unstable. Your entries are still here.",
  unavailable: "We could not save that just now. Please try again shortly.",
  privacyLink: "Privacy policy",
};

const COPY: Partial<Record<LoadingLocale, Copy>> = {
  ko: {
    title: "마지막으로 하나만 더",
    description: "유료 콘텐츠를 열 때 흐름이 끊기지 않도록 미리 받아 둘게요. 둘 다 선택이라 지금 넘어가도 괜찮아요.",
    name: "이름", namePlaceholder: "이름을 입력해 주세요",
    phone: "휴대폰 번호", phoneOptional: "선택",
    phoneHint: "단건 결제(KG이니시스)에 필요한 정보예요. 지금 넣지 않아도 결제할 때 다시 여쭤봐요.",
    phoneInvalid: "휴대폰 번호를 정확히 입력해 주세요.",
    phoneConsent: "결제 진행 목적의 휴대폰 번호 수집·이용에 동의합니다.",
    invalidName: "이름을 2자 이상 입력해 주세요.",
    save: "저장하고 계속하기", saving: "저장 중…", skip: "나중에 하기",
    network: "잠시 연결이 불안정해요. 입력한 내용은 그대로 유지했어요.",
    unavailable: "지금은 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
    privacyLink: "개인정보처리방침",
  },
  ja: { ...EN, title: "最後にもう一つ", name: "お名前", save: "保存して続ける", skip: "後で行う" },
  "zh-CN": { ...EN, title: "最后一步", name: "姓名", save: "保存并继续", skip: "稍后再说" },
  "zh-TW": { ...EN, title: "最後一步", name: "姓名", save: "儲存並繼續", skip: "稍後再說" },
};

function getCopy(locale: LoadingLocale): Copy { return COPY[locale] || EN; }

export default function OnboardingClient() {
  const router = useRouter();
  const { user, authReady, isAuthenticated } = useAuthStore();
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const [name, setName] = useState("");
  const [namePrefilled, setNamePrefilled] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneConsent, setPhoneConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const copy = getCopy(locale);
  const apiBase = useMemo(() => getApiBaseUrl(), []);

  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    window.addEventListener("languagechange", sync);
    document.addEventListener("cd:language-change", sync);
    return () => { window.removeEventListener("languagechange", sync); document.removeEventListener("cd:language-change", sync); };
  }, []);

  // 🔴 몰입형(chromeless) 라우트에는 GlobalHeader → AuthWidget 이 없어 아무도 세션을 불러오지 않는다.
  // 이걸 빼면 authReady 가 영영 false 로 남는다(app/feedback/FeedbackClient.tsx 에 기록된 함정).
  useEffect(() => {
    primeAuthFromCache();
    void refreshAuth();
  }, []);

  // 현재 이름을 프리필하되, 공급자가 붙인 자리표시자("kakao user")면 비워 둔다 — 그대로 두면
  // 사용자가 자기 이름이라고 착각하고 넘어간다.
  useEffect(() => {
    if (namePrefilled || !user) return;
    const current = String(user.name || "").trim();
    setName(PROVIDER_PLACEHOLDER_NAME.test(current) ? "" : current);
    setNamePrefilled(true);
  }, [user, namePrefilled]);

  const nextPath = () => resolveAuthReturnPath(new URLSearchParams(window.location.search));
  const leave = () => {
    const target = nextPath();
    if (target === "/" || target === "/index.html") window.location.replace("/");
    else router.replace(target);
  };

  // 세션이 없으면 여기 있을 이유가 없다. 로그인으로 보내되 원래 목적지는 그대로 이어 준다.
  useEffect(() => {
    if (!authReady || isAuthenticated) return;
    router.replace(`/login?next=${encodeURIComponent(nextPath())}`);
  }, [authReady, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const trimmedName = name.trim();
    if (trimmedName && trimmedName.length < 2) { setError(copy.invalidName); return; }
    const phoneNumber = toStoredPhoneDigits(phone);
    if (hasPhoneInput(phone) && !phoneNumber) { setError(copy.phoneInvalid); return; }
    if (phoneNumber && !phoneConsent) { setError(copy.phoneConsent); return; }

    setBusy(true); setError("");
    try {
      const response = await authFetch(`${apiBase}/api/me/profile-completion`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", ...mobileAppAuthHeaders() },
        body: JSON.stringify({ name: trimmedName, phoneNumber }),
      });
      const payload = await response.json().catch(() => ({})) as { message?: string; user?: Record<string, unknown> };
      if (!response.ok) { setError(payload.message || copy.unavailable); return; }
      if (payload.user) hydrateAuthSuccessUser(payload.user);
      leave();
    } catch {
      setError(copy.network);
    } finally { setBusy(false); }
  };

  return <main className="relative min-h-[100dvh] overflow-x-hidden bg-[#090b1a] px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))] text-white [color-scheme:dark] sm:px-6">
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(125,92,190,.32),transparent_42%),linear-gradient(180deg,#11132a_0%,#090b1a_72%)]" />
    <div className="relative mx-auto flex min-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2.5rem)] w-full max-w-[440px] items-center py-3">
      <section className="w-full rounded-[24px] border border-[#c9b7f0]/20 bg-[#12152b] p-5 shadow-[0_24px_70px_rgba(0,0,0,.38)] sm:p-7" aria-labelledby="onboarding-title">
        <header className="text-center">
          <img src="/icons/app-logo-96.png" width="52" height="52" alt="" className="mx-auto h-[52px] w-[52px] rounded-2xl" />
          <h1 id="onboarding-title" className="mt-4 text-balance text-[1.55rem] font-black tracking-[-0.025em]">{copy.title}</h1>
          <p className="mx-auto mt-2 max-w-[38ch] text-pretty text-sm leading-6 text-[#d8d0ea]">{copy.description}</p>
        </header>
        <div className="my-4 min-h-6" aria-live="polite">{error ? <p id="onboarding-error" role="alert" className="rounded-xl border border-[#ff8ca5]/40 bg-[#421d2a] px-3 py-2.5 text-sm text-[#ffd7df]">{error}</p> : null}</div>
        <form onSubmit={submit} className="space-y-4" noValidate aria-describedby={error ? "onboarding-error" : undefined}>
          <Field id="onboarding-name" label={copy.name}>
            <input id="onboarding-name" type="text" autoComplete="name" maxLength={40} placeholder={copy.namePlaceholder} value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
          </Field>
          <Field id="onboarding-phone" label={`${copy.phone} (${copy.phoneOptional})`}>
            <input id="onboarding-phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={13} placeholder="010-1234-5678" value={phone} onChange={(event) => setPhone(formatKoreanPhoneInput(event.target.value))} className={inputClass} />
            <p className="mt-1.5 text-xs leading-5 text-[#b9aecf]">{copy.phoneHint}</p>
          </Field>
          {hasPhoneInput(phone) && <label htmlFor="onboarding-phone-consent" className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-[#c9b7f0]/18 bg-[#0d1022] px-3 text-sm leading-5 text-[#ddd4ec]">
            <input id="onboarding-phone-consent" type="checkbox" checked={phoneConsent} onChange={(event) => setPhoneConsent(event.target.checked)} className="h-5 w-5 shrink-0 accent-[#8f6ccc]" />
            <span>{copy.phoneConsent}</span>
          </label>}
          <button type="submit" disabled={busy} aria-busy={busy} className="min-h-12 w-full rounded-xl border border-[#b89ae8]/45 bg-[#7c5cbf] px-4 text-sm font-black text-white shadow-[0_10px_28px_rgba(65,42,116,.36)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dbc9ff] disabled:opacity-55">{busy ? copy.saving : copy.save}</button>
          {/* 서버가 이미 "물어봤다" 표식을 남겼으므로 건너뛰기는 네트워크 없이 그냥 이동한다. */}
          <button type="button" onClick={leave} disabled={busy} className="min-h-11 w-full rounded-xl px-4 text-sm font-bold text-[#cfc4e1] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dbc9ff] disabled:opacity-55">{copy.skip}</button>
        </form>
        <p className="mt-5 text-center text-xs leading-5 text-[#a99dbd]">
          <Link href="/privacy" target="_blank" className="underline underline-offset-4">{copy.privacyLink}</Link>
        </p>
      </section>
    </div>
  </main>;
}

const inputClass = "min-h-12 w-full rounded-xl border border-[#c9b7f0]/25 bg-[#090b1a] px-3 text-base text-white outline-none placeholder:text-[#8e84a2] focus:border-[#b89ae8] focus:ring-2 focus:ring-[#8f6ccc]/35";
function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return <div><label htmlFor={id} className="mb-1.5 block text-sm font-bold text-[#e7def7]">{label}</label>{children}</div>;
}
