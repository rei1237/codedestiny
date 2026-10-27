"use client";
import { useNakshatraProfileContext } from "../_lib/nakshatra-context";
import { readDestinyProfileAccountId } from "@/app/_lib/profile-card-storage";
import SavedBirthProfilePicker from "@/app/components/SavedBirthProfilePicker";
import BirthPlaceInput from "@/app/components/BirthPlaceInput";
import { cardToFormValues, ianaOffsetHours } from "../nakshatra-birth";
import BirthTimeInput from "@/app/components/BirthTimeInput";
import CraftedProductDisclosure from "@/app/components/CraftedProductDisclosure";
import { detectLocale } from "@/lib/i18n/dictionary";
import { NAKSHATRA_COMPAT_PRICING } from "../_lib/pricing";

import { authFetch } from "@/app/_lib/auth-client";
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useCoinGate } from "../../hooks/useCoinGate";
import { usePaidResume, packPaidResumeArg, unpackPaidResumeArg } from "../../hooks/usePaidResume";
import { postPaidBody } from "../nakshatra-fetch";
import { useNakshatraCopy } from "../_lib/copy";


import CompatResultView, { type CompatResult } from "./CompatResultView";

const FEATURE_KEY = "nakshatra-compat";

interface P { name: string; year: string; month: string; day: string; hour: string; minute: string; timeUnknown: boolean; gender: "" | "male" | "female"; birthPlace: string; ianaTimezone: string; latitude?: number; longitude?: number; timezone?: number }
const emptyP = (): P => ({ name: "", year: "", month: "", day: "", hour: "", minute: "", timeUnknown: false, gender: "", birthPlace: "", ianaTimezone: "" });
const valid = (p: P) => {
  const year = Number(p.year), month = Number(p.month), day = Number(p.day);
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isInteger(year) && year >= 1900 && year <= 2100 && date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    && Number.isFinite(p.latitude) && Number.isFinite(p.longitude) && (Boolean(p.ianaTimezone) || Number.isFinite(p.timezone))
    && (p.timeUnknown || (p.hour !== '' && Number(p.hour) >= 0 && Number(p.hour) <= 23 && Number(p.minute || 0) >= 0 && Number(p.minute || 0) <= 59));
};
function payload(p: P) {

  return { year: +p.year, month: +p.month, day: +p.day, hour: p.timeUnknown ? 12 : +(p.hour === "" ? 12 : p.hour), minute: p.timeUnknown ? 0 : +(p.minute || 0), timezone: p.timezone ?? ianaOffsetHours(+p.year,+p.month,+p.day,p.timeUnknown?12:+p.hour,p.timeUnknown?0:+p.minute,p.ianaTimezone,0), lat: p.latitude, lon: p.longitude, timeUnknown: p.timeUnknown, gender: p.gender || undefined };
}
const enc = (p: P) => { try { return btoa(encodeURIComponent(JSON.stringify(p))); } catch { return ""; } };
const dec = (s: string): P | null => { try {
  const value = JSON.parse(decodeURIComponent(atob(s)));
  // Previous invitation links stored a Korean city index; retain those historical inputs.
  const cities = [[37.5665,126.978],[35.1796,129.0756],[35.8714,128.6014],[37.4563,126.7052],[35.1595,126.8526],[36.3504,127.3845],[33.4996,126.5312]];
  const city = Number.isInteger(value.cityIndex) ? cities[value.cityIndex] : null;
  if (!value.ianaTimezone && city) return {...value,latitude:value.latitude ?? city[0],longitude:value.longitude ?? city[1],ianaTimezone:"Asia/Seoul",birthPlace:value.birthPlace || ""};
  return value;
} catch { return null; } };

const IN = "w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2.5 text-slate-100 placeholder:text-slate-400 outline-none focus:border-amber-200/60";
function Person({ v, set, locked, title, copy }: { v: P; set: Dispatch<SetStateAction<P>>; locked?: boolean; title: string; copy: ReturnType<typeof useNakshatraCopy> }) {
  const selection = useRef(0);
  const [profileError,setProfileError] = useState("");
  useEffect(()=>()=>{selection.current++;},[]);
  const u = (patch: Partial<P>) => { selection.current++; set(previous => ({ ...previous, ...patch })); };
  const dg = (x: string, n: number) => x.replace(/\D/g, "").slice(0, n);
  return (
    <fieldset data-moonlit-form="" disabled={locked} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 disabled:opacity-70">
      <legend className="px-2 text-sm font-bold text-slate-100">{title}{locked && <span className="ml-2 text-xs font-normal text-amber-100/80">{copy.compatInviteLockedSuffix}</span>}</legend>
      <SavedBirthProfilePicker label={title} disabled={locked} onSelect={async(seed,card)=>{const owner=readDestinyProfileAccountId();const request=++selection.current;setProfileError("");const values=await cardToFormValues(card);if(request!==selection.current || owner!==readDestinyProfileAccountId())return;if(!values){setProfileError(copy.formCardReadError);return;}set({...emptyP(),...values,gender:seed.gender === "male" || seed.gender === "female" ? seed.gender : "",latitude:values.latitude?Number(values.latitude):undefined,longitude:values.longitude?Number(values.longitude):undefined,ianaTimezone:seed.timezone || "",timeUnknown:Boolean(seed.birthTimeUnknown),timezone:undefined});}} />
      {profileError&&<p role="alert">{profileError}</p>}
      <label className="block text-xs leading-7 text-slate-300">{copy.compatNamePlaceholder}<input className={`${IN} mb-3`} value={v.name} onChange={(e) => u({ name: e.target.value.slice(0, 20) })} aria-label={copy.compatNamePlaceholder} placeholder={copy.compatNamePlaceholder} /></label>
      <div className="mb-3 grid grid-cols-3 gap-2">
        <label className="block text-xs leading-7 text-slate-300">{copy.compatYearPlaceholder}<input className={IN} inputMode="numeric" value={v.year} onChange={(e) => u({ year: dg(e.target.value, 4) })} aria-label={copy.compatYearPlaceholder} placeholder={copy.compatYearPlaceholder} /></label>
        <label className="block text-xs leading-7 text-slate-300">{copy.compatMonthPlaceholder}<input className={IN} inputMode="numeric" value={v.month} onChange={(e) => u({ month: dg(e.target.value, 2) })} aria-label={copy.compatMonthPlaceholder} placeholder={copy.compatMonthPlaceholder} /></label>
        <label className="block text-xs leading-7 text-slate-300">{copy.compatDayPlaceholder}<input className={IN} inputMode="numeric" value={v.day} onChange={(e) => u({ day: dg(e.target.value, 2) })} aria-label={copy.compatDayPlaceholder} placeholder={copy.compatDayPlaceholder} /></label>
      </div>
      <div className="mb-2 grid grid-cols-2 gap-2">
        <label className="col-span-2 block text-xs leading-7 text-slate-300">{copy.compatHourPlaceholder}
          <BirthTimeInput className={IN} disabled={v.timeUnknown} value={v.hour === "" ? "" : v.hour.padStart(2, "0") + ":" + (v.minute || "0").padStart(2, "0")}
            onChange={event => { const [hour = "", minute = ""] = event.target.value.split(":"); u({hour, minute}); }} />
        </label>
      </div>
      <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm text-slate-200">
        <input type="checkbox" className="h-4 w-4 accent-amber-300" checked={v.timeUnknown} onChange={(e) => u({ timeUnknown: e.target.checked })} /> {copy.compatTimeUnknownLabel}
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs leading-7 text-slate-300">성별<select aria-label="성별" className={IN} value={v.gender} onChange={(e) => u({ gender: e.target.value as P["gender"] })}>
          <option value="" className="bg-slate-900">{copy.compatGenderUnsetOption}</option>
          <option value="male" className="bg-slate-900">{copy.compatMaleOption}</option>
          <option value="female" className="bg-slate-900">{copy.compatFemaleOption}</option>
        </select></label>
        <label className="block text-xs leading-7 text-slate-300">태어난 도시와 국가<BirthPlaceInput value={v.birthPlace || ""} confirmed={Number.isFinite(v.latitude)&&Number.isFinite(v.longitude)&&(Boolean(v.ianaTimezone)||Number.isFinite(v.timezone))} onChange={birthPlace=>u({birthPlace,latitude:undefined,longitude:undefined,ianaTimezone:"",timezone:undefined})} onResolved={place=>u({latitude:place?.lat,longitude:place?.lng,ianaTimezone:place?.timezone || "",timezone:undefined})} /></label>
      </div>
    </fieldset>
  );
}

export default function NakshatraCompatClient() {
  const copy = useNakshatraCopy();
  const { ensurePaidAccess, isPaying } = useCoinGate();

  const profilePicker = useNakshatraProfileContext();
  const selfTouched = useRef(false);
  const [a, setA] = useState<P>(emptyP);
  const [b, setB] = useState<P>(emptyP);
  const [aLocked, setALocked] = useState(false);
  const [result, setResult] = useState<CompatResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 결제는 끝났는데 본문만 못 받은 상태 — 재결제 없이 다시 받을 수 있게 입력을 붙들어 둔다.
  const [canRetry, setCanRetry] = useState(false);
  const paidRef = useRef<{ a: unknown; b: unknown; requestId: string; accessMethod?: string } | null>(null);
  const busyRef = useRef(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('resultId');
    if (!id) return;
    let active = true;
    setLoading(true);
    authFetch('/api/nakshatra/compat?resultId=' + encodeURIComponent(id)).then(async response => {
      const data = await response.json();
      if (!response.ok || !data.personA) throw new Error(data.message || '저장한 궁합을 불러오지 못했어요. 로그인 계정과 결과 주소를 확인해 주세요.');
      if (active) setResult(data);
    }).catch(error => { if (active) setError(error.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get("invite");
      const d = q ? dec(q) : null;
      if (d && valid(d)) { setA(d); setALocked(true); }
    } catch { /* ignore */ }
  }, []);



  useEffect(()=>{
    if(aLocked || selfTouched.current || !profilePicker.birth || !profilePicker.selectionSource)return;
    const next=profilePicker.birth;
    setA(previous=>({...previous,year:String(next.year),month:String(next.month),day:String(next.day),hour:next.timeUnknown?"":String(next.hour),minute:next.timeUnknown?"":String(next.minute),timeUnknown:next.timeUnknown,gender:next.gender === "male" || next.gender === "female" ? next.gender : "",latitude:next.lat,longitude:next.lon,timezone:next.timezone,birthPlace:profilePicker.profiles.find(profile=>String(profile.id || profile.profileId)===profilePicker.selectedProfileId)?.location?.label || "",ianaTimezone:""}));
  },[aLocked,profilePicker.birth,profilePicker.selectionSource,profilePicker.profiles,profilePicker.selectedProfileId]);

  /* 결제 후 자동 재개 — 모바일 PortOne 은 상위 프레임을 리다이렉트하므로 submitOnce 의 await 가
     페이지와 함께 죽는다. 두 사람의 입력은 state 안에만 있어 복귀한 문서에서 재현할 수 없으니 결제
     직전에 서술자로 굳혀 둔다. 🔴 재개는 게이트를 다시 타는 submit 이 아니라 fetchCompat(코어)을
     부른다 — 다시 타면 결제창이 또 뜬다. */
  const buildResume = usePaidResume(FEATURE_KEY, (args) => {
    const pa = unpackPaidResumeArg<Record<string, unknown>>(args.a);
    const pb = unpackPaidResumeArg<Record<string, unknown>>(args.b);
    const requestId = String(args.requestId || "");
    if (!pa || !pb || !requestId) return false;
    paidRef.current = { a: pa, b: pb, requestId };
    return fetchCompat(paidRef.current);
  });

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
    if (!valid(a) || !valid(b)) { setError(copy.compatBothInvalidError); return; }
    // 결제에 쓴 requestId 를 그대로 들고 간다 — 서버가 이 값으로 차감·결제 기록을 되찾는다.
    const requestId = `${FEATURE_KEY}:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const gate = await ensurePaidAccess({
      featureKey: FEATURE_KEY, cost: NAKSHATRA_COMPAT_PRICING.cost, amountKRW: NAKSHATRA_COMPAT_PRICING.amountKRW, reason: copy.compatReason, requestId,
      resume: buildResume({ a: packPaidResumeArg(payload(a)), b: packPaidResumeArg(payload(b)), requestId }),
    });
    if (!gate || !gate.ok) { setError((gate && gate.message) || copy.compatGateFailedError); return; }
    // 🔴 결제가 끝났다. 여기서부터는 실패해도 재결제를 요구하지 않는다 —
    //    일시 장애는 자동 재시도하고, 그래도 안 되면 '다시 받기'로 같은 결제를 재사용한다.
    // 이용권 통과는 사용 기록을 뒤에서 쓴다 — 서버가 기다리지 않고 같은 requestId 로 이용권을 확정하게 알린다.
    paidRef.current = { a: payload(a), b: payload(b), requestId, ...(gate.code === "PASS_FREE" ? { accessMethod: "pass" } : {}) };
    await fetchCompat(paidRef.current);
  }

  // 결제 뒤의 본문 요청만 담당한다. 결제는 다시 하지 않는다.
  async function fetchCompat(paid: { a: unknown; b: unknown; requestId: string; accessMethod?: string }) {
    setLoading(true);
    setError(null);
    try {
      const { data, status, transient } = await postPaidBody("/api/nakshatra/compat", paid as Record<string, unknown>);
      if (status === 200 && data && data.ok && data.personA && data.india) { setResult(data as unknown as CompatResult); setCanRetry(false);
        if (typeof data.resultId === 'string') window.history.replaceState(null, '', '?resultId=' + encodeURIComponent(data.resultId)); return true; }
      if (status === 202) { setError('궁합 결과를 저장하고 있어요. 잠시 후 다시 받기를 눌러 주세요. 추가 결제는 하지 않습니다.'); setCanRetry(true); return false; }
      if (status === 401) { setError(copy.loginRequiredMessage); setCanRetry(true); return false; }
      if (transient) {
        setError(copy.connectionUnstableRetryMessage);
        setCanRetry(true);
        return false;
      }
      setError(String(data?.message || copy.compatFetchFailedError));
      setCanRetry(true);
      return false;
    } finally {
      setLoading(false);
    }
  }

  function copyInvite() {
    if (!valid(a)) { setError(copy.compatNeedMyBirthError); return; }
    try {
      navigator.clipboard.writeText(`${window.location.origin}/nakshatra/compat?invite=${enc(a)}`);
      setCopied(true); setTimeout(() => setCopied(false), 2500);
    } catch { /* ignore */ }
  }

  if (result) return <CompatResultView result={result} onReset={() => { setResult(null); setCanRetry(false); paidRef.current = null; window.history.replaceState(null, "", window.location.pathname); }} />;

  return (
    <div className="mx-auto w-full max-w-2xl">
      {detectLocale() === "ko" && <div style={{width:"100%",maxWidth:540,minWidth:0,margin:"0 auto 24px",background:"#efe7df",color:"#3e414d",borderRadius:12}}><CraftedProductDisclosure featureKey="nakshatra-compat" summaryLabel="동서 통합 궁합 상세 안내" /></div>}

      <div className="grid gap-4">
        <Person title={copy.compatMeLabel} v={a} set={next=>{selfTouched.current=true;setA(next);}} locked={aLocked || isPaying || loading} copy={copy} />
        <Person title={copy.compatPartnerLabel} v={b} set={setB} locked={isPaying || loading} copy={copy} />
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">{error}</p>}
      {canRetry && paidRef.current && !result && (
        <button
          type="button"
          onClick={() => { void fetchCompat(paidRef.current!); }}
          disabled={loading}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-amber-200/40 px-4 text-sm font-bold text-amber-100 transition hover:bg-amber-200/10 disabled:opacity-55"
        >
          {loading ? copy.retryingButton : copy.retryWithoutPaymentButton}
        </button>
      )}
      <button onClick={submit} disabled={loading || isPaying}
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-amber-200 px-5 text-sm font-bold text-slate-950 transition hover:bg-amber-100 disabled:opacity-60">
        {loading ? copy.compatComparingButton : isPaying ? copy.compatCheckingButton : copy.compatSubmitButton(copy.compatPriceLabel)}
      </button>
      <button onClick={copyInvite} type="button"
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-5 text-sm font-semibold text-slate-100 transition hover:border-amber-200/50">
        {copied ? copy.compatCopiedText : copy.compatSendInviteText}
      </button>
      <p className="mt-3 text-center text-xs leading-6 text-slate-300">
        {copy.compatFooterNote}
      </p>
    </div>
  );
}
