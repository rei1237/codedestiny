"use client";

import Image from "next/image";
import "./relationship-boundary.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import { runBillingCoinGate } from "@/app/_lib/billing-client";
import { PriceBadge } from "@/app/components/PriceBadge";
import { packPaidResumeArg, unpackPaidResumeArg, usePaidResume, type PaidResumeGrant } from "@/app/hooks/usePaidResume";
import { isRetriableResultPollFailure } from "@/app/_lib/consultationResultPolling";
import { birthDateTextInputProps } from "@/lib/birthDateInputProps";
import { chapterScene, gradeScene, type Grade } from "./scenes";

const FEATURE_KEY = "relationship-boundary-test";
const RESUME_KIND = "relationship-boundary-test";
const REQUEST_ID_STORAGE_KEY = "cd:relationship-boundary-test:requestId";
const POLL_INTERVAL_MS = 2500;
const POLL_BUDGET_MS = 180000;
type TargetInfo = { gender: "male" | "female" | ""; birthDate: string; birthTime: string; birthTimeUnknown: boolean; calendarType: "solar" | "lunar"; isLeapMonth: boolean };
type Result = { sessionId: string; score: number; grade: Grade; character: { title: string; caption: string }; scoreFactors: string[]; summary: string; sections: Array<{ title: string; body: string }>; finalMessage: string };

type ApiResult = Partial<Result> & { ok?: boolean; message?: string; reason?: string };

const EMPTY_TARGET: TargetInfo = { gender: "", birthDate: "", birthTime: "", birthTimeUnknown: false, calendarType: "solar", isLeapMonth: false };
// 🔴 워커의 모든 오류 응답에는 message 가 실려 있다. message 가 없다는 것은 JSON 자체가
//    안 왔다는 뜻(엣지 컷 등)이므로, 같은 증상이 재발해도 무엇이 끊겼는지 구분되게 상태를 남긴다.
function failureMessage(status: number) {
  if (status === 0 || !status) return "결과 생성에 실패했어요. 연결 상태를 확인한 뒤 다시 시도해 주세요.";
  return `결과 생성에 실패했어요. 잠시 후 다시 시도해 주세요. (코드 ${status})`;
}
function RelationshipCover() {
  return <figure className="rt-visual"><Image src="/fuctionassets/saju-relationship-temptation-768.webp" alt="식당에서 대화하는 두 사람과 이를 바라보는 연인을 그린 웹툰 장면" width={768} height={576} sizes="(max-width: 760px) 100vw, 760px" priority /><figcaption>한 장면으로 단정하지 않고, 관계를 지키는 선택을 함께 읽습니다.</figcaption></figure>;
}

function createRequestId() { return typeof crypto !== "undefined" && crypto.randomUUID ? `rbt-${crypto.randomUUID()}` : `rbt-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
// 🔴 결제 리디렉트·새로고침 뒤에 requestId 가 새로 생기면 이미 낸 결제의 증빙을 못 찾아
//    두 번째 결제를 요구하게 된다. 결과를 받을 때까지 탭 안에서 같은 키를 유지한다.
function readStoredRequestId() { try { return text(window.sessionStorage.getItem(REQUEST_ID_STORAGE_KEY)); } catch { return ""; } }
function storeRequestId(value: string) { try { window.sessionStorage.setItem(REQUEST_ID_STORAGE_KEY, value); } catch { /* 프라이빗 모드 등에서는 저장을 포기하고 진행한다. */ } }
function clearStoredRequestId() { try { window.sessionStorage.removeItem(REQUEST_ID_STORAGE_KEY); } catch { /* 저장소 접근 실패는 무시한다. */ } }
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

  // 이미 진행 중인 생성(202)을 만나면 저장된 세션에서 결과를 회수한다.
  const pollResult = useCallback(async (sessionId: string) => {
    const until = Date.now() + POLL_BUDGET_MS;
    while (Date.now() < until) {
      await wait(POLL_INTERVAL_MS);
      const response = await authFetch(`/api/relationship-boundary-test/result?sessionId=${encodeURIComponent(sessionId)}`, { method: "GET" }, { retryOn401: false });
      const data = await response.json().catch(() => ({})) as ApiResult;
      if (response.ok && data.ok && data.sessionId) return data as Result;
      // 생성 실패는 재시도 가능한 503로 내려오지만 이 세션에서는 확정 결과다 — 폴링을 끝낸다.
      if (data.reason === "GENERATION_FAILED") throw new Error(data.message || failureMessage(response.status));
      if (data.reason !== "GENERATING" && !isRetriableResultPollFailure(response.status, data)) throw new Error(data.message || failureMessage(response.status));
    }
    throw new Error("결과 작성이 예상보다 길어지고 있어요. 잠시 후 다시 열어 주세요.");
  }, []);

  const generate = useCallback(async (payload: Record<string, unknown>, grant?: PaidResumeGrant | null) => {
    const requestId = text(payload.idempotencyKey); if (!requestId) throw new Error("요청 정보를 다시 확인해 주세요.");
    setPhase("generating");
    const response = await authFetch("/api/relationship-boundary-test/generate", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": requestId }, body: JSON.stringify({ ...payload, ...(grant ? { paymentEvidence: grant } : {}) }) }, { retryOn401: false });
    const data = await response.json().catch(() => ({})) as ApiResult;
    if (response.status === 202 && data.sessionId) { const polled = await pollResult(data.sessionId); setResult(polled); setPhase("result"); clearStoredRequestId(); return; }
    if (!response.ok || !data.ok || !data.sessionId) throw new Error(data.message || failureMessage(response.status));
    setResult(data as Result); setPhase("result"); clearStoredRequestId();
  }, [pollResult]);

  const buildResume = usePaidResume(RESUME_KIND, async (args, grant) => {
    if (busyRef.current) return false;
    const restored = unpackPaidResumeArg<Record<string, unknown>>(args.payload);
    if (!restored) return false;
    busyRef.current = true; setError("");
    try { await generate(restored, grant); return true; } catch (caught) { setError(caught instanceof Error ? caught.message : "결과를 다시 열지 못했어요."); setPhase("form"); return false; } finally { busyRef.current = false; }
  });

  function patch(partial: Partial<TargetInfo>) { setTarget((current) => ({ ...current, ...partial })); setError(""); }
  function validate() {
    if (!target.gender || !target.birthDate || (!target.birthTimeUnknown && !target.birthTime)) return "대상자의 성별·생년월일·출생 시각을 확인해 주세요.";
    return "";
  }

  async function submit() {
    if (busyRef.current) return;
    const invalid = validate(); if (invalid) { setError(invalid); return; }
    busyRef.current = true; setError("");
    const idempotencyKey = requestIdRef.current || readStoredRequestId() || createRequestId();
    requestIdRef.current = idempotencyKey; storeRequestId(idempotencyKey);
    const payload = payloadFor(target, idempotencyKey); setPhase("checking");
    try {
      const prepare = await authFetch("/api/relationship-boundary-test/prepare", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }, body: JSON.stringify(payload) }, { retryOn401: false });
      const prepared = await prepare.json().catch(() => ({})) as { reason?: string; message?: string; paymentPayload?: Record<string, unknown> };
      if (prepared.reason !== "PAYMENT_REQUIRED" || !prepared.paymentPayload) throw new Error(prepared.message || "결제 정보를 준비하지 못했어요.");
      setPhase("payment");
      const gate = await runBillingCoinGate({ ...prepared.paymentPayload, featureKey: FEATURE_KEY, requestId: idempotencyKey, idempotencyKey, resume: buildResume({ idempotencyKey, payload: packPaidResumeArg(payload) }) });
      if (!paymentGranted(gate)) throw new Error("결제가 완료되지 않았어요. 결제 상태를 확인해 주세요.");
      await generate(payload);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "상담 준비 중 문제가 생겼어요."); setPhase("form"); }
    finally { busyRef.current = false; }
  }

  if (result) {
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
        {!embedded && <h1 className="rt-title">그 사람의 바람끼는?</h1>}
        <p className="rt-subtitle">대상자의 사주로 관계 밖 자극에 반응하는 경향과 한 사람에게 머무는 힘을 함께 읽습니다. 실제 외도 여부를 판정하지 않습니다.</p>
        <div className="rt-summary"><h2>{result.character.title}</h2><p>{result.character.caption}</p><p>{result.summary}</p></div>
        <h2 className="rt-why-title">이 사람은 왜 이런 흐름이 나왔을까?</h2>
        <ul className="rt-factor-list">{result.scoreFactors.map((factor, index) => <li className="rt-factor-item" key={index}><Sparkles aria-hidden="true" size={16} /><p>{factor}</p></li>)}</ul>
        <div className="rt-reading">{result.sections.map((section, index) => {
          // 🔴 임베드(iframe)에서는 장면을 그리지 않는다. 부모가 iframe 높이를 콘텐츠 전체
          //    높이로 맞춰 두어서 lazy 로딩도 sticky 도 성립하지 않는다.
          const scene = embedded ? null : chapterScene(index);
          return <section className="rt-reading-chapter" key={index}>
            {scene && <figure className="rt-scene"><Image src={scene.src} alt={scene.alt} width={scene.width} height={scene.height} sizes="(max-width: 760px) 100vw, 760px" loading="lazy" decoding="async" /></figure>}
            <span className="rt-chapter-number">{String(index + 1).padStart(2, "0")}</span><h2>{section.title}</h2>
            {section.body.split(/\n\s*\n/).filter(Boolean).map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}
          </section>;
        })}</div>
        <aside className="rt-one-line"><strong>관계를 위한 마지막 메시지</strong><p>{result.finalMessage}</p></aside>
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
      {error && <p role="alert" className="mt-5 text-sm text-[var(--rt-accent)]">{error}</p>}<button type="button" onClick={() => void submit()} disabled={busy} className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--rt-accent)] px-5 font-bold text-[var(--rt-surface)] disabled:opacity-60">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}{phase === "payment" ? "결제 확인 중" : phase === "generating" ? "리포트를 쓰는 중" : <>결제하고 결과 보기 <PriceBadge featureKey={FEATURE_KEY} className="shrink-0 whitespace-nowrap rounded-full bg-[var(--rt-surface)]/15 px-2 py-1 text-xs" /></>} {!busy && <ChevronRight className="h-5 w-5" />}</button>
    </section>
  </div></div></main>;
}
