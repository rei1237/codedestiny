"use client";
import SavedBirthProfilePicker from "@/app/components/SavedBirthProfilePicker";
import BirthTimeInput from "@/app/components/BirthTimeInput";


import Image from "next/image";
import CraftedProductDisclosure from "@/app/components/CraftedProductDisclosure";
import "./relationship-boundary.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import { runBillingCoinGate } from "@/app/_lib/billing-client";
import { PriceBadge } from "@/app/components/PriceBadge";
import { packPaidResumeArg, unpackPaidResumeArg, usePaidResume, type PaidResumeGrant } from "@/app/hooks/usePaidResume";
import { useAuthStore, refreshAuth } from "@/app/_lib/auth-store";
import { usePaidDeliveryScope } from "@/app/hooks/usePaidDeliveryScope";
import { runRelationshipReader } from "@/lib/relationship-paid-reader.js";
import { birthDateTextInputProps } from "@/lib/birthDateInputProps";
import { type Grade } from "./scenes";
import { RelationshipReportHero, RelationshipReportChapters } from "./RelationshipReportParts";

const FEATURE_KEY = "relationship-boundary-test";
const RESUME_KIND = "relationship-boundary-test";
type TargetInfo = { gender: "male" | "female" | ""; birthDate: string; birthTime: string; birthTimeUnknown: boolean; calendarType: "solar" | "lunar"; isLeapMonth: boolean };
type Result = { mode?: "target" | "couple"; sceneIds?: string[]; status?: string; completedParts?: string[]; totalParts?: number; sessionId: string; score: number; grade: Grade; character: { title: string; caption: string }; scoreFactors: string[]; summary: string; sections: Array<{ title: string; body: string }>; finalMessage: string };

type ApiResult = Partial<Result> & { ok?: boolean; message?: string; reason?: string; retryable?: boolean; resumeBody?: Record<string, unknown> };

const EMPTY_TARGET: TargetInfo = { gender: "", birthDate: "", birthTime: "", birthTimeUnknown: false, calendarType: "solar", isLeapMonth: false };
function RelationshipCover() {
  return <figure className="rt-visual"><Image src="/fuctionassets/saju-relationship-temptation-768.webp" alt="식당에서 대화하는 두 사람과 이를 바라보는 연인을 그린 웹툰 장면" width={768} height={576} sizes="(max-width: 760px) 100vw, 760px" priority /><figcaption>한 장면으로 단정하지 않고, 관계를 지키는 선택을 함께 읽습니다.</figcaption></figure>;
}

function createRequestId() { return typeof crypto !== "undefined" && crypto.randomUUID ? `rbt-${crypto.randomUUID()}` : `rbt-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
const wait = (ms: number) => new Promise((resolve) => { setTimeout(resolve, ms); });
function text(value: unknown) { return String(value ?? "").trim(); }
function payloadFor(targetInfo: TargetInfo, idempotencyKey: string, selfInfo?: TargetInfo) { return { ...(selfInfo ? { selfInfo: { ...selfInfo, birthTime: selfInfo.birthTimeUnknown ? "" : selfInfo.birthTime, isLeapMonth: selfInfo.calendarType === "lunar" && selfInfo.isLeapMonth } } : {}), targetInfo: { ...targetInfo, birthTime: targetInfo.birthTimeUnknown ? "" : targetInfo.birthTime, isLeapMonth: targetInfo.calendarType === "lunar" ? targetInfo.isLeapMonth : false }, idempotencyKey }; }
function paymentGranted(value: unknown) {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  if (record.ok === false) return false;
  return Boolean(record.transactionId || record.paymentId || record.purchaseId || record.data || record.payload || record.accessGrant || record.consume);
}

export default function RelationshipBoundaryTestClient({ embedded = false }: { embedded?: boolean }) {
  const [target, setTarget] = useState<TargetInfo>(EMPTY_TARGET);
  const [selfInfo, setSelfInfo] = useState<TargetInfo>(EMPTY_TARGET);
  const [includeSelf, setIncludeSelf] = useState(false);
  const [phase, setPhase] = useState<"form" | "checking" | "payment" | "generating" | "result">("form");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const requestIdRef = useRef("");
  const busyRef = useRef(false);
  const [working, setWorking] = useState(false);
  const [readingChapter, setReadingChapter] = useState(0);
  const { user } = useAuthStore();
  const owner = String(user?.id || user?.userId || user?._id || user?.uid || "");
  useEffect(() => {
    if (!owner) return;
    try {
      const raw = sessionStorage.getItem('cd:relationship-self-prefill');
      sessionStorage.removeItem('cd:relationship-self-prefill');
      const saved = raw ? JSON.parse(raw) : null;
      if (saved?.createdAt > Date.now() - 300000 && saved.info?.birthDate) { setSelfInfo(saved.info); setIncludeSelf(true); }
    } catch {}
  }, [owner]);
  const storageKey = owner ? `cd:relationship-delivery:v2:${encodeURIComponent(owner)}` : "";
  const readingKey = storageKey && result?.sessionId ? `${storageKey}:reading:${result.sessionId}` : "";
  useEffect(() => {
    let chapter = 0;
    try { const saved = Number(readingKey && localStorage.getItem(readingKey)); if (Number.isInteger(saved) && saved >= 0 && saved < 5) chapter = saved; } catch {}
    setReadingChapter(chapter);
  }, [readingKey]);
  const pendingRef = useRef<Record<string, unknown> | null>(null);
  const lastSessionRef = useRef("");
  const captureDelivery = usePaidDeliveryScope(() => {
    setResult(null); setError(""); setPhase("form"); setWorking(false); setTarget(EMPTY_TARGET); setSelfInfo(EMPTY_TARGET); setIncludeSelf(false);
    busyRef.current = false; requestIdRef.current = ""; pendingRef.current = null; lastSessionRef.current = "";
  });
  useEffect(() => { void refreshAuth({ silent: true }).catch(() => {}); }, []);
  const remember = useCallback((payload: Record<string, unknown> | null, sessionId = lastSessionRef.current) => {
    pendingRef.current = payload; lastSessionRef.current = sessionId;
    if (storageKey) try { localStorage.setItem(storageKey, JSON.stringify({ payload, sessionId })); } catch {}
  }, [storageKey]);
  useEffect(() => {
    if (!embedded || window.parent === window) return;
    const page = document.querySelector('.rt-page');
    if (!page) return;
    const reportSize = () => window.parent.postMessage({ type: 'cd:relationship-card-height', height: Math.ceil(page.getBoundingClientRect().height) }, window.location.origin);
    const observer = new ResizeObserver(reportSize);
    observer.observe(page);
    reportSize();
    return () => observer.disconnect();
  }, [embedded, result]);

  const generate = useCallback(async (payload: Record<string, unknown> | null, grant?: PaidResumeGrant | null) => {
    const active = captureDelivery();
    setPhase("generating"); setWorking(true);
    const read = async (url: string, value?: Record<string, unknown>) => {
      const response = await authFetch(url, value ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) } : { method: "GET" }, { retryOn401: false });
      return { status: response.status, data: await response.json().catch(() => ({})) as ApiResult };
    };
    try {
      const complete = await runRelationshipReader(payload ? { ...payload, ...(grant ? { paymentEvidence: grant } : {}) } : null, {
        get: () => read(`/api/relationship-boundary-test/result?${lastSessionRef.current ? `sessionId=${encodeURIComponent(lastSessionRef.current)}` : "pending=1"}`),
        post: (value: Record<string, unknown>) => read("/api/relationship-boundary-test/generate", value),
        show: (value: Result) => { if (active()) { setResult(value); lastSessionRef.current = value.sessionId; } },
        persist: (value: Record<string, unknown>) => { if (active()) remember(value, text(value.resumeSessionId)); },
        active, visible: () => document.visibilityState !== "hidden" && navigator.onLine !== false, wait,
      });
      if (!active()) return false;
      setPhase(complete ? "result" : "form");
      if (complete) remember(null);
      return complete;
    } finally { if (active()) setWorking(false); }
  }, [captureDelivery, remember]);

  const recover = useCallback(async () => {
    if (!owner || busyRef.current || document.visibilityState === "hidden" || navigator.onLine === false) return;
    const active = captureDelivery(); busyRef.current = true; setError("");
    try { await generate(pendingRef.current); }
    catch (caught) { if (active()) { setError(caught instanceof Error ? caught.message : "저장된 결과를 다시 확인해 주세요."); setPhase("form"); } }
    finally { if (active()) busyRef.current = false; }
  }, [owner, generate, captureDelivery]);
  useEffect(() => {
    if (!storageKey) return;
    try { const saved = JSON.parse(localStorage.getItem(storageKey) || "null"); const linkedSession = new URL(location.href).searchParams.get("sessionId"); pendingRef.current = linkedSession ? null : saved?.payload || null; lastSessionRef.current = text(linkedSession || saved?.sessionId); requestIdRef.current = text(saved?.payload?.idempotencyKey); } catch {}
    void recover();
  }, [storageKey, recover]);
  useEffect(() => {
    const resume = () => { void recover(); };
    window.addEventListener("online", resume); document.addEventListener("visibilitychange", resume);
    return () => { window.removeEventListener("online", resume); document.removeEventListener("visibilitychange", resume); };
  }, [recover]);

  const buildResume = usePaidResume(RESUME_KIND, async (args, grant) => {
    if (busyRef.current) return false;
    const restored = unpackPaidResumeArg<Record<string, unknown>>(args.payload);
    if (!restored) return false;
    const active = captureDelivery(); busyRef.current = true; setError(""); remember(restored);
    try { return await generate(restored, grant); } catch (caught) { if (active()) { setError(caught instanceof Error ? caught.message : "결과를 다시 열지 못했어요."); setPhase("form"); } return false; } finally { if (active()) busyRef.current = false; }
  });

  function patch(partial: Partial<TargetInfo>) { if (busyRef.current || pendingRef.current) return; requestIdRef.current = ""; setTarget((current) => ({ ...current, ...partial })); setError(""); }
  function validate() {
    if (!target.gender || !target.birthDate || (!target.birthTimeUnknown && !target.birthTime)) return "대상자의 성별·생년월일·출생 시각을 확인해 주세요.";
    if (includeSelf && (!selfInfo.gender || !selfInfo.birthDate || (!selfInfo.birthTimeUnknown && !selfInfo.birthTime))) return "본인의 성별·생년월일·출생 시각을 확인해 주세요.";
    return "";
  }

  async function submit() {
    if (busyRef.current) return;
    if (pendingRef.current) { await recover(); return; }
    const invalid = validate(); if (invalid) { setError(invalid); return; }
    busyRef.current = true; setError("");
    const active = captureDelivery();
    const idempotencyKey = requestIdRef.current || createRequestId();
    requestIdRef.current = idempotencyKey;
    const payload = payloadFor(target, idempotencyKey, includeSelf ? selfInfo : undefined); setPhase("checking");
    try {
      const prepare = await authFetch("/api/relationship-boundary-test/prepare", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }, body: JSON.stringify(payload) }, { retryOn401: false });
      const prepared = await prepare.json().catch(() => ({})) as { reason?: string; message?: string; paymentPayload?: Record<string, unknown> };
      if (!active()) return;
      if (prepared.reason !== "PAYMENT_REQUIRED" || !prepared.paymentPayload) throw new Error(prepared.message || "결제 정보를 준비하지 못했어요.");
      setPhase("payment");
      const gate = await runBillingCoinGate({ ...prepared.paymentPayload, featureKey: FEATURE_KEY, requestId: idempotencyKey, idempotencyKey, resume: buildResume({ idempotencyKey, payload: packPaidResumeArg(payload) }) });
      if (!active()) return;
      if (!paymentGranted(gate)) throw new Error("결제가 완료되지 않았어요. 결제 상태를 확인해 주세요.");
      remember(payload); await generate(payload);
    } catch (caught) { if (active()) { setError(caught instanceof Error ? caught.message : "상담 준비 중 문제가 생겼어요."); setPhase("form"); } }
    finally { if (active()) busyRef.current = false; }
  }

  if (result) {
    const complete = result.status === "completed";
    return <main className={embedded ? "rt-page rt-page--embedded" : "rt-page"}><article className="rt-shell">
      {/* 등급 컷이 히어로다 — 8장 중 유일하게 결과값에 따라 달라지고, 유일한 16:9 라 모바일에서 점수를 가리지 않는다. */}
      <RelationshipReportHero grade={result.grade} score={result.score} priority={!embedded} />
      <div className="rt-body">
        {!complete && <div className="rt-summary" aria-live="polite"><p>{result.completedParts?.length || 0}/{result.totalParts || 11} 부분 저장 · {working ? "다음 장면을 쓰고 있어요." : "저장된 장면부터 읽을 수 있어요."}</p>{error && <p role="alert">{error}</p>}<button type="button" disabled={working} className="min-h-11 underline" onClick={() => void recover()}>{working ? "이어서 작성 중" : "같은 결과 이어서 생성하기"}</button></div>}
        {!embedded && <h1 className="rt-title">그 사람의 바람끼는?</h1>}
        <p className="rt-subtitle">{result.mode === "couple" ? "두 사람의 끌림·소통·생활 리듬·갈등과 장기 관계를 함께 읽습니다. 경계 지수는 대상자의 성향이며 궁합 점수나 외도 확률이 아닙니다." : "대상자의 사주로 관계 밖 자극에 반응하는 경향과 한 사람에게 머무는 힘을 함께 읽습니다. 실제 외도 여부를 판정하지 않습니다."}</p>
        <div className="rt-summary"><h2>{result.character.title}</h2><p>{result.character.caption}</p><p>{result.summary}</p></div>
        <h2 className="rt-why-title">이 사람은 왜 이런 흐름이 나왔을까?</h2>
        <ul className="rt-factor-list">{result.scoreFactors.map((factor, index) => <li className="rt-factor-item" key={index}><Sparkles aria-hidden="true" size={16} /><p>{factor}</p></li>)}</ul>
        <nav aria-label="리포트 목차" className="my-6 flex flex-wrap gap-x-4 gap-y-2">{result.sections.map((section, index) => <a className="min-h-11 py-2 underline" key={index} href={`#relationship-chapter-${index}`} onClick={() => { setReadingChapter(index); if (readingKey) try { localStorage.setItem(readingKey, String(index)); } catch {} }}>{index + 1}. {section.title}</a>)}<a className="min-h-11 py-2 underline" href={`#relationship-chapter-${readingChapter}`}>읽던 장으로 이동</a></nav>
        <RelationshipReportChapters sections={result.sections} embedded={embedded} mode={result.mode} sceneIds={result.sceneIds} />
        {complete && <><aside className="rt-one-line"><strong>관계를 위한 마지막 메시지</strong><p>{result.finalMessage}</p></aside><button type="button" className="mt-6 min-h-11 underline" onClick={() => { remember(null, ""); requestIdRef.current = ""; setResult(null); setTarget(EMPTY_TARGET); setPhase("form"); setError(""); const url = new URL(location.href); url.searchParams.delete("sessionId"); history.replaceState(history.state, "", url); }}>새 대상 분석하기</button></>}
      </div>
    </article></main>;
  }

  const busy = phase !== "form";
  return <main className={embedded ? "rt-page rt-page--embedded" : "rt-page"}><div className="rt-shell">{!embedded && <RelationshipCover />}<div style={{ width: "100%", maxWidth: 540, margin: "0 auto" }}><CraftedProductDisclosure featureKey={FEATURE_KEY} /></div><div className="rt-body">
    <h1 className="rt-title">{embedded ? "대상자 생년 정보" : "그 사람의 바람끼는?"}</h1><p className="mt-4 leading-7 text-[var(--rt-muted)]">본인이 아닌 <strong className="text-[var(--rt-ink)]">대상자</strong>의 생년 정보로 관계 경계와 외부 자극에 흔들릴 수 있는 경향을 읽습니다. 실제 외도나 마음을 단정하지 않습니다.</p>
    <section className="rt-input-panel mt-7"><div className="flex items-start gap-3 rounded-2xl border border-[var(--rt-accent)]/25 bg-[var(--rt-accent)]/10 p-4 text-sm leading-6 text-[var(--rt-ink)]"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />대상자만 입력하면 관계 성향을, 본인 정보도 추가하면 두 사람의 종합 연애 궁합을 같은 1회 요금으로 제공합니다.</div>
      <fieldset data-moonlit-form="" disabled={busy || Boolean(pendingRef.current)}><legend className="sr-only">대상자 정보</legend><SavedBirthProfilePicker calendarMode="lunar" label="상대의 저장된 프로필" disabled={busy || Boolean(pendingRef.current)} onSelect={seed=>patch({gender:seed.gender === "male" || seed.gender === "female" ? seed.gender : "", birthDate:seed.birthDate || "", birthTime:seed.birthTime || "", birthTimeUnknown:Boolean(seed.birthTimeUnknown), calendarType:seed.calendarType || "solar", isLeapMonth:Boolean(seed.isLeapMonth)})} /><fieldset className="mt-6"><legend className="text-sm font-bold">대상자 성별</legend><div className="mt-3 grid grid-cols-2 gap-3">{([['female','여성'],['male','남성']] as const).map(([value,label]) => <button key={value} type="button" aria-pressed={target.gender === value} onClick={() => patch({ gender: value })} className={`min-h-12 rounded-xl border px-4 font-bold ${target.gender === value ? 'border-[var(--rt-accent)] bg-[var(--rt-accent)]/15 text-[var(--rt-ink)]' : 'border-[var(--rt-border)] text-[var(--rt-muted)]'}`}>{label}</button>)}</div></fieldset>
      <label className="mt-6 block text-sm font-bold" htmlFor="target-birth-date">대상자 생년월일</label><input id="target-birth-date" className="mt-3 min-h-12 w-full rounded-xl border border-[var(--rt-border)] bg-[var(--rt-surface)] px-4 text-[var(--rt-ink)] outline-none focus:border-[var(--rt-accent)]" {...birthDateTextInputProps(target.birthDate, (birthDate) => patch({ birthDate }))} />
      <fieldset className="mt-6"><legend className="text-sm font-bold">달력 기준</legend><div className="mt-3 grid grid-cols-2 gap-3">{([['solar','양력'],['lunar','음력']] as const).map(([value,label]) => <button key={value} type="button" aria-pressed={target.calendarType === value} onClick={() => patch({ calendarType: value, isLeapMonth: value === 'lunar' ? target.isLeapMonth : false })} className={`min-h-12 rounded-xl border px-4 font-bold ${target.calendarType === value ? 'border-[var(--rt-accent)] bg-[var(--rt-accent)]/15 text-[var(--rt-ink)]' : 'border-[var(--rt-border)] text-[var(--rt-muted)]'}`}>{label}</button>)}</div>{target.calendarType === "lunar" && <label className="mt-3 flex gap-2 text-sm text-[var(--rt-muted)]"><input type="checkbox" checked={target.isLeapMonth} onChange={(event) => patch({ isLeapMonth: event.target.checked })} />윤달입니다</label>}</fieldset>
      <label className="mt-6 block text-sm font-bold" htmlFor="target-birth-time">대상자 출생 시각</label><BirthTimeInput id="target-birth-time"  disabled={target.birthTimeUnknown} value={target.birthTime} onChange={(event) => patch({ birthTime: event.target.value })} className="mt-3 min-h-12 w-full rounded-xl border border-[var(--rt-border)] bg-[var(--rt-surface)] px-4 text-[var(--rt-ink)] outline-none disabled:opacity-50 focus:border-[var(--rt-accent)]" /><label className="mt-3 flex gap-2 text-sm text-[var(--rt-muted)]"><input type="checkbox" checked={target.birthTimeUnknown} onChange={(event) => patch({ birthTimeUnknown: event.target.checked, birthTime: event.target.checked ? '' : target.birthTime })} />출생 시각을 모릅니다</label>
      </fieldset>
      <fieldset disabled={busy || Boolean(pendingRef.current)} className="rt-self-input">
        <legend>본인 정보 · 선택</legend>
        <label className="rt-check"><input type="checkbox" checked={includeSelf} onChange={event => { setIncludeSelf(event.target.checked); requestIdRef.current = ""; }} />본인 정보로 두 사람 궁합도 함께 보기</label>
        {includeSelf && <SelfBirthFields value={selfInfo} onChange={partial => { setSelfInfo(current => ({ ...current, ...partial })); requestIdRef.current = ""; setError(""); }} />}
        <p>본인 정보를 확인·수정한 뒤 상담을 시작해 주세요. 결제 후에는 같은 입력으로 이어서 생성합니다.</p>
      </fieldset>
      <div className="mt-7 rounded-2xl border border-[var(--rt-border)] bg-[var(--rt-soft)] p-4"><h2 className="font-bold text-[var(--rt-accent)]">분석 기준</h2><p className="mt-2 text-sm leading-6 text-[var(--rt-muted)]">도화·홍염·합충형해·십성의 흐름을 관계 경계의 패턴으로 번역합니다. 점수는 서버에서 계산하며, 결과는 참고용입니다.</p></div>
      {error && <p role="alert" className="mt-5 text-sm text-[var(--rt-accent)]">{error}</p>}<button type="button" onClick={() => void submit()} disabled={busy} className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--rt-accent)] px-5 font-bold text-[var(--rt-surface)] disabled:opacity-60">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}{phase === "payment" ? "결제 확인 중" : phase === "generating" ? "리포트를 쓰는 중" : pendingRef.current ? "같은 결과 이어서 생성하기" : <>결제하고 결과 보기 <PriceBadge featureKey={FEATURE_KEY} className="shrink-0 whitespace-nowrap rounded-full bg-[var(--rt-surface)]/15 px-2 py-1 text-xs" /></>} {!busy && <ChevronRight className="h-5 w-5" />}</button>
    </section>
  </div></div></main>;
}

function SelfBirthFields({ value, onChange }: { value: TargetInfo; onChange: (partial: Partial<TargetInfo>) => void }) {
  return <div className="rt-self-fields" data-moonlit-form=""><SavedBirthProfilePicker calendarMode="lunar" label="나의 저장된 프로필" onSelect={seed=>onChange({gender:seed.gender === "male" || seed.gender === "female" ? seed.gender : "", birthDate:seed.birthDate || "", birthTime:seed.birthTime || "", birthTimeUnknown:Boolean(seed.birthTimeUnknown), calendarType:seed.calendarType || "solar", isLeapMonth:Boolean(seed.isLeapMonth)})} />
    <label htmlFor="self-gender">본인 성별</label><select id="self-gender" value={value.gender} onChange={e => onChange({ gender: e.target.value as TargetInfo['gender'] })}><option value="">선택해 주세요</option><option value="female">여성</option><option value="male">남성</option></select>
    <label htmlFor="self-birth-date">본인 생년월일</label><input id="self-birth-date" {...birthDateTextInputProps(value.birthDate, birthDate => onChange({ birthDate }))} />
    <label htmlFor="self-calendar">달력 기준</label><select id="self-calendar" value={value.calendarType} onChange={e => onChange({ calendarType: e.target.value as TargetInfo['calendarType'], isLeapMonth: false })}><option value="solar">양력</option><option value="lunar">음력</option></select>
    {value.calendarType === 'lunar' && <label className="rt-check"><input type="checkbox" checked={value.isLeapMonth} onChange={e => onChange({ isLeapMonth: e.target.checked })} />윤달입니다</label>}
    <label htmlFor="self-birth-time">본인 출생 시각</label><BirthTimeInput id="self-birth-time"  value={value.birthTime} disabled={value.birthTimeUnknown} onChange={e => onChange({ birthTime: e.target.value })} />
    <label className="rt-check"><input type="checkbox" checked={value.birthTimeUnknown} onChange={e => onChange({ birthTimeUnknown: e.target.checked, birthTime: e.target.checked ? '' : value.birthTime })} />출생 시각을 모릅니다</label>
  </div>;
}
