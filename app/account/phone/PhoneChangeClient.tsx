"use client";

import Link from "next/link";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { getApiBaseUrl } from "../../_lib/api-config";
import { authFetch, mobileAppAuthHeaders } from "../../_lib/auth-client";
import { formatKoreanPhoneInput, normalizeKoreanPhoneNumber } from "../../_lib/korean-phone";

const COPY = {
  title: "휴대폰 번호 변경",
  description:
    "계정 확인과 카드 결제 진행에 사용하는 번호예요. 국내 휴대폰 번호(010…)만 등록할 수 있어요.",
  current: "현재 등록된 번호",
  none: "등록된 번호가 없어요.",
  next: "새 휴대폰 번호",
  // 🔴 개인정보처리방침 2항의 이용 목적과 같은 범위여야 한다. 여기만 넓히면 고지 없는 수집이 된다.
  consent: "수집 항목 · 휴대폰 번호 / 이용 목적 · 회원 식별 및 계정 관리, 결제 진행 / 보유·이용 기간 · 회원 탈퇴 시까지(법령상 보존 의무가 있는 거래기록은 그 기간)",
  submit: "번호 변경",
  processing: "변경 중...",
  invalid: "휴대폰 번호를 정확히 입력해 주세요.",
  same: "지금 등록된 번호와 같아요.",
  duplicate: "이미 다른 계정에서 사용 중인 번호예요.",
  rateLimited: "번호 변경을 너무 자주 시도했어요. 잠시 후 다시 시도해 주세요.",
  network: "연결이 불안정해 변경하지 못했어요. 잠시 후 다시 시도해 주세요.",
  needLogin: "로그인이 만료됐어요. 다시 로그인한 뒤 시도해 주세요.",
  done: "휴대폰 번호를 바꿨어요.",
  back: "홈으로",
} as const;

type PhonePayload = {
  ok?: boolean;
  code?: string;
  message?: string;
  updated?: boolean;
  hasPhone?: boolean;
  maskedPhone?: string;
};

export default function PhoneChangeClient() {
  const [maskedPhone, setMaskedPhone] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // 현재 번호는 마스킹된 형태로만 받아 화면에 띄운다(원문을 굳이 이 화면까지 끌고 오지 않는다).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const apiBase = String(getApiBaseUrl() || "").trim();
        const response = await authFetch(`${apiBase}/api/auth/me/payment-phone`, {
          credentials: "include",
          headers: { ...mobileAppAuthHeaders() },
        });
        const payload = await response.json().catch(() => ({})) as PhonePayload;
        if (!cancelled && response.ok) setMaskedPhone(String(payload.maskedPhone || ""));
      } catch {
        /* 현재 번호를 못 읽어도 변경 자체는 할 수 있다 — 조회 실패로 화면을 막지 않는다 */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;

    const normalized = normalizeKoreanPhoneNumber(phone);
    if (!normalized) { setError(COPY.invalid); setDone(false); return; }

    setBusy(true);
    setError("");
    setDone(false);
    try {
      const apiBase = String(getApiBaseUrl() || "").trim();
      const response = await authFetch(`${apiBase}/api/auth/me/phone-number`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...mobileAppAuthHeaders() },
        body: JSON.stringify({ phoneNumber: normalized }),
      });
      const payload = await response.json().catch(() => ({})) as PhonePayload;
      if (!response.ok) {
        if (response.status === 401) setError(COPY.needLogin);
        else if (payload.code === "duplicate_phone") setError(COPY.duplicate);
        else if (response.status === 429) setError(COPY.rateLimited);
        else setError(payload.message || COPY.network);
        return;
      }
      setMaskedPhone(String(payload.maskedPhone || ""));
      setPhone("");
      if (payload.updated === false) setError(COPY.same);
      else setDone(true);
    } catch {
      setError(COPY.network);
    } finally {
      setBusy(false);
    }
  };

  return <main className="relative min-h-[100dvh] overflow-x-hidden bg-[#090b1a] px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))] text-white [color-scheme:dark] sm:px-6">
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(125,92,190,.32),transparent_42%),linear-gradient(180deg,#11132a_0%,#090b1a_72%)]" />
    <div className="relative mx-auto flex min-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2.5rem)] w-full max-w-[440px] items-center py-3">
      <section className="w-full rounded-[24px] border border-[#c9b7f0]/20 bg-[#12152b] p-5 shadow-[0_24px_70px_rgba(0,0,0,.38)] sm:p-7" aria-labelledby="phone-title">
        <header className="text-center">
          <h1 id="phone-title" className="text-balance text-[1.55rem] font-black tracking-[-0.025em]">{COPY.title}</h1>
          <p className="mx-auto mt-2 max-w-[38ch] text-pretty text-sm leading-6 text-[#d8d0ea]">{COPY.description}</p>
        </header>

        <div className="my-4 min-h-6" aria-live="polite">
          {error ? <p id="phone-error" role="alert" className="rounded-xl border border-[#ff8ca5]/40 bg-[#421d2a] px-3 py-2.5 text-sm text-[#ffd7df]">{error}</p> : null}
          {done ? <p role="status" className="rounded-xl border border-[#8ce0b0]/40 bg-[#123326] px-3 py-2.5 text-sm text-[#d7ffe9]">{COPY.done}</p> : null}
        </div>

        <p className="rounded-xl border border-[#c9b7f0]/18 bg-[#0d1022] px-3 py-2.5 text-sm leading-6 text-[#cfc4e5]">
          <span className="font-bold text-[#e7def7]">{COPY.current}</span>{" · "}
          <span>{loaded ? (maskedPhone || COPY.none) : "…"}</span>
        </p>

        <form onSubmit={submit} className="mt-4 space-y-4" noValidate aria-describedby={error ? "phone-error" : undefined}>
          <Field id="phone-next" label={COPY.next}>
            <input id="phone-next" type="tel" inputMode="numeric" autoComplete="tel" maxLength={13} placeholder="010-1234-5678" value={phone} onChange={(event) => setPhone(formatKoreanPhoneInput(event.target.value))} className={inputClass} />
          </Field>

          <p className="rounded-xl border border-[#c9b7f0]/18 bg-[#0d1022] px-3 py-2.5 text-xs leading-5 text-[#cfc4e5]">{COPY.consent}</p>

          <button type="submit" disabled={busy} aria-busy={busy} className="min-h-12 w-full rounded-xl border border-[#b89ae8]/45 bg-[#7c5cbf] px-4 text-sm font-black text-white shadow-[0_10px_28px_rgba(65,42,116,.36)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dbc9ff] disabled:opacity-55">{busy ? COPY.processing : COPY.submit}</button>
        </form>

        <p className="mt-5 text-center text-sm text-[#cfc4e1]">
          <Link href="/privacy" target="_blank" className="min-h-11 font-black text-[#d7c1ff] underline underline-offset-4">개인정보처리방침 전문</Link>
          <span className="mx-2 text-[#8e84a2]">·</span>
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
