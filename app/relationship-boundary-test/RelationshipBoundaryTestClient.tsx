"use client";

import Image from "next/image";
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
import { chapterScene, gradeScene, type Grade } from "./scenes";

const FEATURE_KEY = "relationship-boundary-test";
const RESUME_KIND = "relationship-boundary-test";
type TargetInfo = { gender: "male" | "female" | ""; birthDate: string; birthTime: string; birthTimeUnknown: boolean; calendarType: "solar" | "lunar"; isLeapMonth: boolean };
type Result = { status?: string; completedParts?: string[]; totalParts?: number; sessionId: string; score: number; grade: Grade; character: { title: string; caption: string }; scoreFactors: string[]; summary: string; sections: Array<{ title: string; body: string }>; finalMessage: string };

type ApiResult = Partial<Result> & { ok?: boolean; message?: string; reason?: string; retryable?: boolean; resumeBody?: Record<string, unknown> };

const EMPTY_TARGET: TargetInfo = { gender: "", birthDate: "", birthTime: "", birthTimeUnknown: false, calendarType: "solar", isLeapMonth: false };
function RelationshipCover() {
  return <figure className="rt-visual"><Image src="/fuctionassets/saju-relationship-temptation-768.webp" alt="식당에서 대화하는 두 사람과 이를 바라보는 연인을 그린 웹툰 장면" width={768} height={576} sizes="(max-width: 760px) 100vw, 760px" priority /><figcaption>한 장면으로 단정하지 않고, 관계를 지키는 선택을 함께 읽습니다.</figcaption></figure>;
}

function createRequestId() { return typeof crypto !== "undefined" && crypto.randomUUID ? `rbt-${crypto.randomUUID()}` : `rbt-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
const wait = (ms: number) => new Promise((resolve) => { setTimeout(resolve, ms); });
function text(value: unknown) { return String(value ?? "").trim(); }
function payloadFor(targetInfo: TargetInfo, idempotencyKey: string) { return { targetInfo: { ...targetInfo, birthTime: targetInfo.birthTimeUnknown ? "" : targetInfo.birthTime, isLeapMonth: targetInfo.calendarType === "lunar" ? targetInfo.isLeapMonth : false }, idempotencyKey }; }
function paymentGranted(value: unknown) {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  if (record.ok === false) return false;
  return Boolean(record.transactionId || record.paymentId || record.purchaseId || record.data || record.payload || record.accessGrant || record.consume);
}

export default function RelationshipBoundaryTestClient({ embedded = false }: { embedded?: boolean }) {
  const [target, setTarget] = useState<TargetInfo>(EMPTY_TARGET);
  const [phase, setPhase] = useState<"form" | "checking" | "payment" | "generating" | "result">("form");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const requestIdRef = useRef("");
  const busyRef = useRef(false);
  const [working, setWorking] = useState(false);
  const [readingChapter, setReadingChapter] = useState(0);
  const { user } = useAuthStore();
  const owner = String(user?.id || user?.userId || user?._id || user?.uid || "");
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
    setResult(null); setError(""); setPhase("form"); setWorking(false); setTarget(EMPTY_TARGET);
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

  function patch(partial: Partial<TargetInfo>) { setTarget((current) => ({ ...current, ...partial })); setError(""); }
  function validate() {
    if (!target.gender || !target.birthDate || (!target.birthTimeUnknown && !target.birthTime)) return "대상자의 성별·생년월일·출생 시각을 확인해 주세요.";
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
    const payload = payloadFor(target, idempotencyKey); setPhase("checking");
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
    const gradeLabel = result.grade === "high" ? "경계를 선명하게 할 때" : result.grade === "medium" ? "거리 조절을 살펴볼 때" : "약속을 이어 가는 힘";
    const hero = gradeScene(result.grade);
    return <main className={embedded ? "rt-page rt-page--embedded" : "rt-page"}><article className="rt-shell">
      {/* 등급 컷이 히어로다 — 8장 중 유일하게 결과값에 따라 달라지고, 유일한 16:9 라 모바일에서 점수를 가리지 않는다. */}
      <figure className="rt-hero-scene">
        <Image src={hero.src} alt={hero.alt} width={hero.width} height={hero.height} sizes="(max-width: 760px) 100vw, 760px" priority={!embedded} />
        <figcaption className="rt-hero-overlay">
          <div className="rt-score-row"><div><p className="rt-score-label">관계 경계 지수</p><h2 className="rt-score-level">{gradeLabel}</h2></div><div className="rt-score-number">{result.score}<small> / 100</small></div></div>
          <div className="rt-gauge" role="meter" aria-label="관계 경계 지수" aria-valuemin={0} aria-valuemax={100} aria-valuenow={result.score}><span style={{width: result.score + "%"}} /></div>
        </figcaption>
      </figure>
      <div className="rt-body">
        {!complete && <div className="rt-summary" aria-live="polite"><p>{result.completedParts?.length || 0}/{result.totalParts || 11} 부분 저장 · {working ? "다음 장면을 쓰고 있어요." : "저장된 장면부터 읽을 수 있어요."}</p>{error && <p role="alert">{error}</p>}<button type="button" disabled={working} className="min-h-11 underline" onClick={() => void recover()}>{working ? "이어서 작성 중" : "같은 결과 이어서 생성하기"}</button></div>}
        {!embedded && <h1 className="rt-title">그 사람의 바람끼는?</h1>}
        <p className="rt-subtitle">대상자의 사주로 관계 밖 자극에 반응하는 경향과 한 사람에게 머무는 힘을 함께 읽습니다. 실제 외도 여부를 판정하지 않습니다.</p>
        <div className="rt-summary"><h2>{result.character.title}</h2><p>{result.character.caption}</p><p>{result.summary}</p></div>
        <h2 className="rt-why-title">이 사람은 왜 이런 흐름이 나왔을까?</h2>
        <ul className="rt-factor-list">{result.scoreFactors.map((factor, index) => <li className="rt-factor-item" key={index}><Sparkles aria-hidden="true" size={16} /><p>{factor}</p></li>)}</ul>
        <nav aria-label="리포트 목차" className="my-6 flex flex-wrap gap-x-4 gap-y-2">{result.sections.map((section, index) => <a className="min-h-11 py-2 underline" key={index} href={`#relationship-chapter-${index}`} onClick={() => { setReadingChapter(index); if (readingKey) try { localStorage.setItem(readingKey, String(index)); } catch {} }}>{index + 1}. {section.title}</a>)}<a className="min-h-11 py-2 underline" href={`#relationship-chapter-${readingChapter}`}>읽던 장으로 이동</a></nav>
        <div className="rt-reading">{result.sections.map((section, index) => {
          // 🔴 임베드(iframe)에서는 장면을 그리지 않는다. 부모가 iframe 높이를 콘텐츠 전체
          //    높이로 맞춰 두어서 lazy 로딩도 sticky 도 성립하지 않는다.
          const scene = embedded ? null : chapterScene(index);
          return <section className="rt-reading-chapter" id={`relationship-chapter-${index}`} style={{ scrollMarginTop: "7rem" }} key={index}>
            {scene && <figure className="rt-scene"><Image src={scene.src} alt={scene.alt} width={scene.width} height={scene.height} sizes="(max-width: 760px) 100vw, 760px" loading="lazy" decoding="async" /></figure>}
            <span className="rt-chapter-number">{String(index + 1).padStart(2, "0")}</span><h2>{section.title}</h2>
            {!section.body && <p>이 장면을 작성하고 있어요.</p>}
            {section.body.split(/\n\s*\n/).filter(Boolean).map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}
          </section>;
        })}</div>
        {complete && <><aside className="rt-one-line"><strong>관계를 위한 마지막 메시지</strong><p>{result.finalMessage}</p></aside><button type="button" className="mt-6 min-h-11 underline" onClick={() => { remember(null, ""); requestIdRef.current = ""; setResult(null); setTarget(EMPTY_TARGET); setPhase("form"); setError(""); const url = new URL(location.href); url.searchParams.delete("sessionId"); history.replaceState(history.state, "", url); }}>새 대상 분석하기</button></>}
      </div>
    </article></main>;
  }

  const busy = phase !== "form";
  return <main className={embedded ? "rt-page rt-page--embedded" : "rt-page"}><div className="rt-shell">{!embedded && <RelationshipCover />}<div className="rt-body">
    <h1 className="rt-title">{embedded ? "대상자 생년 정보" : "그 사람의 바람끼는?"}</h1><p className="mt-4 leading-7 text-[var(--rt-muted)]">본인이 아닌 <strong className="text-[var(--rt-ink)]">대상자</strong>의 생년 정보로 관계 경계와 외부 자극에 흔들릴 수 있는 경향을 읽습니다. 실제 외도나 마음을 단정하지 않습니다.</p>
    <section className="rt-input-panel mt-7"><div className="flex items-start gap-3 rounded-2xl border border-[var(--rt-accent)]/25 bg-[var(--rt-accent)]/10 p-4 text-sm leading-6 text-[var(--rt-ink)]"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />입력하는 정보는 대상자의 사주 분석에만 사용됩니다. 본인 정보로 자동 입력되지 않습니다.</div>
      <fieldset className="mt-6"><legend className="text-sm font-bold">대상자 성별</legend><div className="mt-3 grid grid-cols-2 gap-3">{([['female','여성'],['male','남성']] as const).map(([value,label]) => <button key={value} type="button" aria-pressed={target.gender === value} onClick={() => patch({ gender: value })} className={`min-h-12 rounded-xl border px-4 font-bold ${target.gender === value ? 'border-[var(--rt-accent)] bg-[var(--rt-accent)]/15 text-[var(--rt-ink)]' : 'border-[var(--rt-border)] text-[var(--rt-muted)]'}`}>{label}</button>)}</div></fieldset>
      <label className="mt-6 block text-sm font-bold" htmlFor="target-birth-date">대상자 생년월일</label><input id="target-birth-date" className="mt-3 min-h-12 w-full rounded-xl border border-[var(--rt-border)] bg-[var(--rt-surface)] px-4 text-[var(--rt-ink)] outline-none focus:border-[var(--rt-accent)]" {...birthDateTextInputProps(target.birthDate, (birthDate) => patch({ birthDate }))} />
      <fieldset className="mt-6"><legend className="text-sm font-bold">달력 기준</legend><div className="mt-3 grid grid-cols-2 gap-3">{([['solar','양력'],['lunar','음력']] as const).map(([value,label]) => <button key={value} type="button" aria-pressed={target.calendarType === value} onClick={() => patch({ calendarType: value, isLeapMonth: value === 'lunar' ? target.isLeapMonth : false })} className={`min-h-12 rounded-xl border px-4 font-bold ${target.calendarType === value ? 'border-[var(--rt-accent)] bg-[var(--rt-accent)]/15 text-[var(--rt-ink)]' : 'border-[var(--rt-border)] text-[var(--rt-muted)]'}`}>{label}</button>)}</div>{target.calendarType === "lunar" && <label className="mt-3 flex gap-2 text-sm text-[var(--rt-muted)]"><input type="checkbox" checked={target.isLeapMonth} onChange={(event) => patch({ isLeapMonth: event.target.checked })} />윤달입니다</label>}</fieldset>
      <label className="mt-6 block text-sm font-bold" htmlFor="target-birth-time">대상자 출생 시각</label><input id="target-birth-time" type="time" disabled={target.birthTimeUnknown} value={target.birthTime} onChange={(event) => patch({ birthTime: event.target.value })} className="mt-3 min-h-12 w-full rounded-xl border border-[var(--rt-border)] bg-[var(--rt-surface)] px-4 text-[var(--rt-ink)] outline-none disabled:opacity-50 focus:border-[var(--rt-accent)]" /><label className="mt-3 flex gap-2 text-sm text-[var(--rt-muted)]"><input type="checkbox" checked={target.birthTimeUnknown} onChange={(event) => patch({ birthTimeUnknown: event.target.checked, birthTime: event.target.checked ? '' : target.birthTime })} />출생 시각을 모릅니다</label>
      <div className="mt-7 rounded-2xl border border-[var(--rt-border)] bg-[var(--rt-soft)] p-4"><h2 className="font-bold text-[var(--rt-accent)]">분석 기준</h2><p className="mt-2 text-sm leading-6 text-[var(--rt-muted)]">도화·홍염·합충형해·십성의 흐름을 관계 경계의 패턴으로 번역합니다. 점수는 서버에서 계산하며, 결과는 참고용입니다.</p></div>
      {error && <p role="alert" className="mt-5 text-sm text-[var(--rt-accent)]">{error}</p>}<button type="button" onClick={() => void submit()} disabled={busy} className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--rt-accent)] px-5 font-bold text-[var(--rt-surface)] disabled:opacity-60">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}{phase === "payment" ? "결제 확인 중" : phase === "generating" ? "리포트를 쓰는 중" : pendingRef.current ? "같은 결과 이어서 생성하기" : <>결제하고 결과 보기 <PriceBadge featureKey={FEATURE_KEY} className="shrink-0 whitespace-nowrap rounded-full bg-[var(--rt-surface)]/15 px-2 py-1 text-xs" /></>} {!busy && <ChevronRight className="h-5 w-5" />}</button>
    </section>
  </div></div></main>;
}
