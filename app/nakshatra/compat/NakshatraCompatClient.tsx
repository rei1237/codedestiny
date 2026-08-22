"use client";

import { useEffect, useRef, useState } from "react";
import { useCoinGate } from "../../hooks/useCoinGate";
import { postPaidBody } from "../nakshatra-fetch";
import CompatResultView, { type CompatResult } from "./CompatResultView";
import { useNakshatraCopy } from "../_lib/copy";
import { getCurrentLoadingLocale } from "@/constants/loadingMessages";

const FEATURE_KEY = "nakshatra-compat";
const CITY = [
  { label: "서울", lat: 37.5665, lon: 126.978 }, { label: "부산", lat: 35.1796, lon: 129.0756 },
  { label: "대구", lat: 35.8714, lon: 128.6014 }, { label: "인천", lat: 37.4563, lon: 126.7052 },
  { label: "광주", lat: 35.1595, lon: 126.8526 }, { label: "대전", lat: 36.3504, lon: 127.3845 },
  { label: "제주", lat: 33.4996, lon: 126.5312 },
];

interface P { name: string; year: string; month: string; day: string; hour: string; minute: string; timeUnknown: boolean; gender: "" | "male" | "female"; cityIndex: number }
const emptyP = (): P => ({ name: "", year: "", month: "", day: "", hour: "", minute: "", timeUnknown: false, gender: "", cityIndex: 0 });
const valid = (p: P) => Number(p.year) > 0 && Number(p.month) >= 1 && Number(p.month) <= 12 && Number(p.day) >= 1 && Number(p.day) <= 31;
function payload(p: P) {
  const c = CITY[p.cityIndex] || CITY[0];
  return { year: +p.year, month: +p.month, day: +p.day, hour: p.timeUnknown ? 12 : +(p.hour || 12), minute: p.timeUnknown ? 0 : +(p.minute || 0), timezone: 9, lat: c.lat, lon: c.lon, timeUnknown: p.timeUnknown, gender: p.gender || undefined };
}
const enc = (p: P) => { try { return btoa(encodeURIComponent(JSON.stringify(p))); } catch { return ""; } };
const dec = (s: string): P | null => { try { return JSON.parse(decodeURIComponent(atob(s))); } catch { return null; } };

const IN = "w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2.5 text-slate-100 placeholder:text-slate-500 outline-none focus:border-amber-200/60";
const LB = "mb-1.5 block text-xs font-semibold text-amber-100/80";

function Person({ v, set, locked, title }: { v: P; set: (p: P) => void; locked?: boolean; title: string }) {
  const { compat: copy } = useNakshatraCopy();
  const u = (patch: Partial<P>) => set({ ...v, ...patch });
  const dg = (x: string, n: number) => x.replace(/\D/g, "").slice(0, n);
  return (
    <fieldset disabled={locked} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 disabled:opacity-70">
      <legend className="px-2 text-sm font-bold text-slate-100">{title}{locked && <span className="ml-2 text-xs font-normal text-amber-100/80">{copy.invitedLockedBadge}</span>}</legend>
      <input className={`${IN} mb-3`} value={v.name} onChange={(e) => u({ name: e.target.value.slice(0, 20) })} placeholder={copy.namePlaceholder} />
      <div className="mb-3 grid grid-cols-3 gap-2">
        <input className={IN} inputMode="numeric" value={v.year} onChange={(e) => u({ year: dg(e.target.value, 4) })} placeholder={copy.yearPlaceholder} />
        <input className={IN} inputMode="numeric" value={v.month} onChange={(e) => u({ month: dg(e.target.value, 2) })} placeholder={copy.monthPlaceholder} />
        <input className={IN} inputMode="numeric" value={v.day} onChange={(e) => u({ day: dg(e.target.value, 2) })} placeholder={copy.dayPlaceholder} />
      </div>
      <div className="mb-2 grid grid-cols-2 gap-2">
        <input className={IN} inputMode="numeric" disabled={v.timeUnknown} value={v.hour} onChange={(e) => u({ hour: dg(e.target.value, 2) })} placeholder={copy.hourPlaceholder} />
        <input className={IN} inputMode="numeric" disabled={v.timeUnknown} value={v.minute} onChange={(e) => u({ minute: dg(e.target.value, 2) })} placeholder={copy.minutePlaceholder} />
      </div>
      <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm text-slate-200">
        <input type="checkbox" className="h-4 w-4 accent-amber-300" checked={v.timeUnknown} onChange={(e) => u({ timeUnknown: e.target.checked })} /> {copy.timeUnknownLabel}
      </label>
      <div className="grid grid-cols-2 gap-2">
        <select className={IN} value={v.gender} onChange={(e) => u({ gender: e.target.value as P["gender"] })}>
          <option value="" className="bg-slate-900">{copy.genderNotSet}</option>
          <option value="male" className="bg-slate-900">{copy.genderMale}</option>
          <option value="female" className="bg-slate-900">{copy.genderFemale}</option>
        </select>
        <select className={IN} value={v.cityIndex} onChange={(e) => u({ cityIndex: +e.target.value })}>
          {CITY.map((c, i) => <option key={c.label} value={i} className="bg-slate-900">{c.label}</option>)}
        </select>
      </div>
    </fieldset>
  );
}

export default function NakshatraCompatClient() {
  const { compat: copy } = useNakshatraCopy();
  const locale = getCurrentLoadingLocale();
  const { ensurePaidAccess, isPaying } = useCoinGate();
  const [a, setA] = useState<P>(emptyP);
  const [b, setB] = useState<P>(emptyP);
  const [aLocked, setALocked] = useState(false);
  const [result, setResult] = useState<CompatResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 결제는 끝났는데 본문만 못 받은 상태 — 재결제 없이 다시 받을 수 있게 입력을 붙들어 둔다.
  const [canRetry, setCanRetry] = useState(false);
  const paidRef = useRef<{ a: unknown; b: unknown; requestId: string } | null>(null);
  const busyRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get("invite");
      const d = q ? dec(q) : null;
      if (d && valid(d)) { setA(d); setALocked(true); }
    } catch { /* ignore */ }
  }, []);

  async function submit() {
    // 🔴 disabled={loading || isPaying} 는 리렌더 이후에야 먹는다. 그 한 프레임 사이의 두 번째 클릭이
    //    새 requestId 로 게이트를 한 번 더 열 수 있어, 동기 ref 로 먼저 막는다(집안 표준: busyRef).
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      await submitOnce();
    } finally {
      busyRef.current = false;
    }
  }

  async function submitOnce() {
    setError(null);
    if (!valid(a) || !valid(b)) { setError(copy.invalidBirthDatesError); return; }
    // 결제에 쓴 requestId 를 그대로 들고 간다 — 서버가 이 값으로 차감·결제 기록을 되찾는다.
    const requestId = `${FEATURE_KEY}:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const gate = await ensurePaidAccess({ featureKey: FEATURE_KEY, cost: 100, amountKRW: 10000, reason: "나크샤트라 동서 통합 궁합", requestId });
    if (!gate || !gate.ok) { setError((gate && gate.message) || copy.paymentNotCompletedError); return; }
    // 🔴 결제가 끝났다. 여기서부터는 실패해도 재결제를 요구하지 않는다 —
    //    일시 장애는 자동 재시도하고, 그래도 안 되면 '다시 받기'로 같은 결제를 재사용한다.
    paidRef.current = { a: payload(a), b: payload(b), requestId };
    await fetchCompat(paidRef.current);
  }

  // 결제 뒤의 본문 요청만 담당한다. 결제는 다시 하지 않는다.
  async function fetchCompat(paid: { a: unknown; b: unknown; requestId: string }) {
    setLoading(true);
    setError(null);
    try {
      const { data, status, transient } = await postPaidBody("/api/nakshatra/compat", paid as Record<string, unknown>);
      if (data && data.ok) { setResult(data as unknown as CompatResult); setCanRetry(false); return; }
      if (status === 401) { setError(copy.loginRequiredError); setCanRetry(true); return; }
      if (transient) {
        setError(copy.connectionUnstableRetryError);
        setCanRetry(true);
        return;
      }
      setError(String(data?.message || copy.genericFailedError));
      setCanRetry(true);
    } finally {
      setLoading(false);
    }
  }

  function copyInvite() {
    if (!valid(a)) { setError(copy.needMyBirthDateError); return; }
    try {
      navigator.clipboard.writeText(`${window.location.origin}/nakshatra/compat?invite=${enc(a)}`);
      setCopied(true); setTimeout(() => setCopied(false), 2500);
    } catch { /* ignore */ }
  }

  if (result) return <CompatResultView result={result} onReset={() => setResult(null)} />;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="grid gap-4">
        <Person title={copy.myTitle} v={a} set={setA} locked={aLocked} />
        <Person title={copy.partnerTitle} v={b} set={setB} />
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">{error}</p>}
      {canRetry && paidRef.current && !result && (
        <button
          type="button"
          onClick={() => { void fetchCompat(paidRef.current!); }}
          disabled={loading}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-amber-200/40 px-4 text-sm font-bold text-amber-100 transition hover:bg-amber-200/10 disabled:opacity-55"
        >
          {loading ? copy.retryButtonLoading : copy.retryButtonIdle}
        </button>
      )}
      <button onClick={submit} disabled={loading || isPaying}
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-amber-200 px-5 text-sm font-bold text-slate-950 transition hover:bg-amber-100 disabled:opacity-60">
        {loading ? copy.submitButtonLoading : isPaying ? copy.submitButtonVerifying : (locale === "ko" ? copy.submitButtonIdleKo : copy.submitButtonIdleOther)}
      </button>
      <button onClick={copyInvite} type="button"
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-5 text-sm font-semibold text-slate-100 transition hover:border-amber-200/50">
        {copied ? copy.linkCopiedLabel : copy.copyInviteLabel}
      </button>
      <p className="mt-3 text-center text-xs leading-6 text-slate-300">
        {copy.footerNote}
      </p>
    </div>
  );
}
