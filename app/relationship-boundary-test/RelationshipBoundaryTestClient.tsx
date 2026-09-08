"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { AlertCircle, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import { runBillingCoinGate } from "@/app/_lib/billing-client";
import { PriceBadge } from "@/app/components/PriceBadge";
import { packPaidResumeArg, unpackPaidResumeArg, usePaidResume, type PaidResumeGrant } from "@/app/hooks/usePaidResume";
import { birthDateTextInputProps } from "@/lib/birthDateInputProps";

const FEATURE_KEY = "relationship-boundary-test";
const RESUME_KIND = "relationship-boundary-test";
type Grade = "low" | "medium" | "high";
type TargetInfo = { gender: "male" | "female" | ""; birthDate: string; birthTime: string; birthTimeUnknown: boolean; calendarType: "solar" | "lunar"; isLeapMonth: boolean };
type Result = { sessionId: string; score: number; grade: Grade; character: { title: string; caption: string }; scoreFactors: string[]; summary: string; sections: Array<{ title: string; body: string }>; finalMessage: string };

const EMPTY_TARGET: TargetInfo = { gender: "", birthDate: "", birthTime: "", birthTimeUnknown: false, calendarType: "solar", isLeapMonth: false };
const ART: Record<Grade, { src: string; label: string; title: string; caption: string }> = {
  low: { src: "/images/relationship-boundary-test/low.webp", label: "서로의 말을 듣는 두 사람", title: "선명한 약속의 장면", caption: "관계를 지키는 기준이 생활 속 대화로 이어지기 쉬운 흐름입니다." },
  medium: { src: "/images/relationship-boundary-test/medium.webp", label: "떠나는 열차를 바라보는 인물", title: "거리 조절이 필요한 장면", caption: "말하지 않은 거리감이 길어지기 전에, 서로의 속도를 확인할 필요가 있습니다." },
  high: { src: "/images/relationship-boundary-test/high.webp", label: "두 갈림길 앞에 선 인물", title: "선택이 선명해지는 장면", caption: "외부 자극보다 관계 안의 약속을 먼저 정리할 때 흔들림을 줄일 수 있습니다." },
};
const SCENE_ART: Record<string, { src: string; alt: string }> = {
  "프롤로그: 첫 장면": { src: "/images/relationship-boundary-test/opening.webp", alt: "비 오는 저녁, 휴대폰을 내려놓고 집으로 돌아온 인물" },
  "시선이 머무는 이유": { src: "/images/relationship-boundary-test/attention.webp", alt: "카페 테이블 위 알림을 망설이며 바라보는 손" },
  "흔들리는 조건": { src: "/images/relationship-boundary-test/tension.webp", alt: "비 내리는 밤의 지하철 플랫폼에 선 인물" },
  "관계를 지키는 힘": { src: "/images/relationship-boundary-test/trust.webp", alt: "아침 부엌 테이블에서 차를 앞에 두고 대화하는 두 사람" },
  "에필로그: 현실적인 선택": { src: "/images/relationship-boundary-test/choice.webp", alt: "새벽의 보행교를 따라 앞으로 걸어가는 인물" },
};

function createRequestId() { return typeof crypto !== "undefined" && crypto.randomUUID ? `rbt-${crypto.randomUUID()}` : `rbt-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function text(value: unknown) { return String(value ?? "").trim(); }
function payloadFor(targetInfo: TargetInfo, idempotencyKey: string) { return { targetInfo: { ...targetInfo, birthTime: targetInfo.birthTimeUnknown ? "" : targetInfo.birthTime, isLeapMonth: targetInfo.calendarType === "lunar" ? targetInfo.isLeapMonth : false }, idempotencyKey }; }
function paymentGranted(value: unknown) {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  if (record.ok === false) return false;
  return Boolean(record.transactionId || record.paymentId || record.purchaseId || record.data || record.payload || record.accessGrant || record.consume);
}

export default function RelationshipBoundaryTestClient() {
  const [target, setTarget] = useState<TargetInfo>(EMPTY_TARGET);
  const [phase, setPhase] = useState<"form" | "checking" | "payment" | "generating" | "result">("form");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const requestIdRef = useRef("");
  const busyRef = useRef(false);

  const generate = useCallback(async (payload: Record<string, unknown>, grant?: PaidResumeGrant | null) => {
    const requestId = text(payload.idempotencyKey); if (!requestId) throw new Error("요청 정보를 다시 확인해 주세요.");
    setPhase("generating");
    const response = await authFetch("/api/relationship-boundary-test/generate", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": requestId }, body: JSON.stringify({ ...payload, ...(grant ? { paymentEvidence: grant } : {}) }) }, { retryOn401: false });
    const data = await response.json().catch(() => ({})) as Result & { ok?: boolean; message?: string };
    if (!response.ok || !data.ok || !data.sessionId) throw new Error(data.message || "결과 생성에 실패했어요. 잠시 후 다시 시도해 주세요.");
    setResult(data); setPhase("result");
  }, []);

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
    const idempotencyKey = requestIdRef.current || createRequestId(); requestIdRef.current = idempotencyKey;
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
    const art = ART[result.grade];
    return <main className="min-h-screen bg-[#0a0818] px-4 py-10 text-[#f4eeff] sm:px-6"><div className="mx-auto max-w-3xl">
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">그 사람의 바람끼는?</h1>
      <p className="mt-3 max-w-2xl leading-7 text-[#c8aaff]">이 결과는 실제 행동이나 외도를 판정하지 않습니다. 관계 경계와 외부 자극에 반응할 수 있는 경향을 사주 흐름으로 읽습니다.</p>
      <section className="mt-8 overflow-hidden rounded-[28px] border border-[#c4b5fd]/30 bg-[#13102a]"><div className="relative aspect-[16/9]"><Image src={art.src} alt={art.label} fill sizes="(max-width: 768px) 100vw, 768px" className="object-cover" priority /><div className="absolute inset-0 bg-gradient-to-t from-[#0a0818] via-transparent to-transparent" /></div><div className="relative -mt-20 p-6 sm:p-8"><span className="inline-flex rounded-full border border-[#e8d5a3]/50 bg-[#0a0818]/80 px-3 py-1 text-xs font-bold text-[#e8d5a3]">{result.grade.toUpperCase()} · {result.score}점</span><h2 className="mt-3 text-2xl font-bold">{result.character.title}</h2><p className="mt-2 leading-7 text-[#d9ceef]">{result.character.caption}</p><p className="mt-3 text-sm leading-6 text-[#c8aaff]">{art.title} · {art.caption}</p></div></section>
      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6"><h2 className="text-lg font-bold">핵심 해석</h2><p className="mt-3 leading-8 text-[#e9e2f6]">{result.summary}</p><ul className="mt-5 space-y-3">{result.scoreFactors.map((factor) => <li key={factor} className="flex gap-3 text-sm leading-6 text-[#c8aaff]"><Sparkles className="mt-1 h-4 w-4 shrink-0 text-[#e8d5a3]" />{factor}</li>)}</ul></section>
      <div className="mt-6 space-y-6">{result.sections.map((section) => {
        const scene = SCENE_ART[section.title];
        return <article key={section.title} className="overflow-hidden rounded-3xl border border-white/10 bg-[#13102a]">
          {scene && <div className="relative aspect-[4/3] border-b border-white/10"><Image src={scene.src} alt={scene.alt} fill sizes="(max-width: 768px) 100vw, 768px" className="object-cover" /></div>}
          <div className="p-6"><h2 className="text-xl font-bold text-[#e8d5a3]">{section.title}</h2><p className="mt-3 whitespace-pre-line leading-8 text-[#e9e2f6]">{section.body}</p></div>
        </article>;
      })}</div>
      <p className="my-8 rounded-2xl border border-[#c4b5fd]/30 bg-[#c4b5fd]/10 p-5 leading-7 text-[#f4eeff]">{result.finalMessage}</p>
    </div></main>;
  }

  const busy = phase !== "form";
  return <main className="min-h-screen bg-[#0a0818] px-4 py-10 text-[#f4eeff] sm:px-6"><div className="mx-auto max-w-xl">
    <h1 className="text-3xl font-bold tracking-tight">그 사람의 바람끼는?</h1><p className="mt-4 leading-7 text-[#c8aaff]">본인이 아닌 <strong className="text-[#f4eeff]">대상자</strong>의 생년 정보로 관계 경계와 외부 자극에 흔들릴 수 있는 경향을 읽습니다. 실제 외도나 마음을 단정하지 않습니다.</p>
    <section className="mt-7 rounded-[28px] border border-[#c4b5fd]/25 bg-[#13102a] p-5 sm:p-7"><div className="flex items-start gap-3 rounded-2xl border border-[#e8d5a3]/25 bg-[#e8d5a3]/10 p-4 text-sm leading-6 text-[#f8ecc9]"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />입력하는 정보는 대상자의 사주 분석에만 사용됩니다. 본인 정보로 자동 입력되지 않습니다.</div>
      <fieldset className="mt-6"><legend className="text-sm font-bold">대상자 성별</legend><div className="mt-3 grid grid-cols-2 gap-3">{([['female','여성'],['male','남성']] as const).map(([value,label]) => <button key={value} type="button" aria-pressed={target.gender === value} onClick={() => patch({ gender: value })} className={`min-h-12 rounded-xl border px-4 font-bold ${target.gender === value ? 'border-[#e8d5a3] bg-[#e8d5a3]/15 text-[#fff5d8]' : 'border-white/15 text-[#c8aaff]'}`}>{label}</button>)}</div></fieldset>
      <label className="mt-6 block text-sm font-bold" htmlFor="target-birth-date">대상자 생년월일</label><input id="target-birth-date" className="mt-3 min-h-12 w-full rounded-xl border border-white/15 bg-[#0a0818] px-4 text-[#f4eeff] outline-none focus:border-[#c4b5fd]" {...birthDateTextInputProps(target.birthDate, (birthDate) => patch({ birthDate }))} />
      <fieldset className="mt-6"><legend className="text-sm font-bold">달력 기준</legend><div className="mt-3 grid grid-cols-2 gap-3">{([['solar','양력'],['lunar','음력']] as const).map(([value,label]) => <button key={value} type="button" aria-pressed={target.calendarType === value} onClick={() => patch({ calendarType: value, isLeapMonth: value === 'lunar' ? target.isLeapMonth : false })} className={`min-h-12 rounded-xl border px-4 font-bold ${target.calendarType === value ? 'border-[#e8d5a3] bg-[#e8d5a3]/15 text-[#fff5d8]' : 'border-white/15 text-[#c8aaff]'}`}>{label}</button>)}</div>{target.calendarType === "lunar" && <label className="mt-3 flex gap-2 text-sm text-[#c8aaff]"><input type="checkbox" checked={target.isLeapMonth} onChange={(event) => patch({ isLeapMonth: event.target.checked })} />윤달입니다</label>}</fieldset>
      <label className="mt-6 block text-sm font-bold" htmlFor="target-birth-time">대상자 출생 시각</label><input id="target-birth-time" type="time" disabled={target.birthTimeUnknown} value={target.birthTime} onChange={(event) => patch({ birthTime: event.target.value })} className="mt-3 min-h-12 w-full rounded-xl border border-white/15 bg-[#0a0818] px-4 text-[#f4eeff] outline-none disabled:opacity-50 focus:border-[#c4b5fd]" /><label className="mt-3 flex gap-2 text-sm text-[#c8aaff]"><input type="checkbox" checked={target.birthTimeUnknown} onChange={(event) => patch({ birthTimeUnknown: event.target.checked, birthTime: event.target.checked ? '' : target.birthTime })} />출생 시각을 모릅니다</label>
      <div className="mt-7 rounded-2xl border border-white/10 bg-black/20 p-4"><h2 className="font-bold text-[#e8d5a3]">분석 기준</h2><p className="mt-2 text-sm leading-6 text-[#c8aaff]">도화·홍염·합충형해·십성의 흐름을 관계 경계의 패턴으로 번역합니다. 점수는 서버에서 계산하며, 결과는 참고용입니다.</p></div>
      {error && <p role="alert" className="mt-5 text-sm text-[#fbb6ce]">{error}</p>}<button type="button" onClick={() => void submit()} disabled={busy} className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#e8d5a3] px-5 font-bold text-[#0a0818] disabled:opacity-60">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}{phase === "payment" ? "결제 확인 중" : phase === "generating" ? "리포트를 쓰는 중" : <>결제하고 결과 보기 <PriceBadge featureKey={FEATURE_KEY} className="rounded-full bg-[#0a0818]/15 px-2 py-1 text-xs" /></>} {!busy && <ChevronRight className="h-5 w-5" />}</button>
    </section>
  </div></main>;
}
