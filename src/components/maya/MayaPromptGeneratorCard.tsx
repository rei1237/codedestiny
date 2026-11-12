"use client";

import { birthDateTextInputProps } from "@/lib/birthDateInputProps";
import { FEATURE_KEY_PRICE_TABLE } from "@/worker/lib/paid-feature-registry.js";
import { normalizeMayaConsultationInput } from "@/lib/maya-consultation-input.mjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, LockKeyhole, RefreshCw, WandSparkles } from "lucide-react";
import { openPaidFeatureGate, runBillingCoinGate } from "@/app/_lib/billing-client";
import { authFetch } from "@/app/_lib/auth-client";
import { getAuthState, useAuthStore } from "@/app/_lib/auth-store";
import { continueOracleDelivery, registerPaidNarrativeIntent, type OracleDeliveryResponse } from "@/app/_lib/oracle-delivery";
import { usePaidResume, packPaidResumeArg, unpackPaidResumeArg } from "@/app/hooks/usePaidResume";
import { type MayaCalendarResult } from "@/src/lib/maya-calendar";
import { MAYA_PROMPT_TOPICS } from "@/src/lib/maya-prompt-generator";
import { useMayaCopy } from "./_lib/copy";

type Props = { result: MayaCalendarResult };
type HistoryEntry = { resultId: string; question: string; status: string; createdAt: string };
type MayaDelivery = OracleDeliveryResponse & { consultation?: { question: string; answer: string; facts?: { target: MayaCalendarResult; birth: MayaCalendarResult | null } }; message?: string };
const FEATURE_KEY = "maya-prompt-generator";
const FEATURE_COST = FEATURE_KEY_PRICE_TABLE[FEATURE_KEY].cost;
const FEATURE_PRICE_KRW = FEATURE_KEY_PRICE_TABLE[FEATURE_KEY].amountKRW;
const ENDPOINT = "/api/maya-consultation";
const DISPLAY_FONT_CLASS = "[font-family:'Noto_Serif_KR','Noto_Serif',Georgia,serif]";
const CODE_FONT_CLASS = "[font-family:Georgia,'Times_New_Roman',serif]";
function currentOwner() { const user = getAuthState().user; return String(user?.id || user?.userId || user?._id || ""); }

export default function MayaPromptGeneratorCard({ result }: Props) {
  const copy = useMayaCopy();
  const auth = useAuthStore();
  const owner = String(auth.user?.id || auth.user?.userId || auth.user?._id || "");
  const promptResultRef = useRef<HTMLDivElement | null>(null);
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [topic, setTopic] = useState<string>(MAYA_PROMPT_TOPICS[0]);
  const [question, setQuestion] = useState("");
  const [prompt, setPrompt] = useState("");
  const [calculationPrompt, setCalculationPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [paymentPending, setPaymentPending] = useState(false);
  const [canRetry, setCanRetry] = useState(false);
  const busyRef = useRef(false);
  const activeRef = useRef(true);
  const paidBodyRef = useRef<Record<string, unknown> | null>(null);
  const resultIdRef = useRef("");
  const buttonLabel = useMemo(() => loading ? copy.buttonOpening : prompt ? copy.buttonRegenerate
    : canRetry ? copy.retryDelivery : copy.buttonGenerate, [loading, prompt, canRetry, copy]);

  async function loadHistory(expectedOwner = currentOwner()) {
    if (!expectedOwner) return;
    try {
      const response = await authFetch(`${ENDPOINT}/history`);
      const data = await response.json();
      if (response.ok && activeRef.current && currentOwner() === expectedOwner) setHistory(data.records || []);
    } catch { /* 저장 이력 조회 실패는 현재 상담을 지우지 않는다. */ }
  }
  useEffect(() => {
    activeRef.current = true;
    paidBodyRef.current = null; resultIdRef.current = ""; busyRef.current = false;
    setName(""); setBirthDate(""); setQuestion("");
    setPrompt(""); setCalculationPrompt(""); setHistory([]); setError(""); setMessage(""); setLoading(false); setCanRetry(false); setPaymentPending(false);
    void loadHistory(owner);
    return () => { activeRef.current = false; };
  }, [owner]);
  useEffect(() => {
    if (!prompt) return;
    const frame = window.requestAnimationFrame(() => promptResultRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start",
    }));
    return () => window.cancelAnimationFrame(frame);
  }, [prompt]);

  function acceptResult(data: MayaDelivery) {
    if (!data.saved || data.status !== "completed" || !data.consultation?.answer) return false;
    setPrompt(data.consultation.answer);
    setCalculationPrompt([data.consultation.facts?.target, data.consultation.facts?.birth]
      .filter((chart): chart is MayaCalendarResult => Boolean(chart))
      .map(chart => `${chart.gregorian.iso}\n${copy.tzolkinName}: ${chart.tzolkin.label}\n${copy.haabName}: ${chart.haab.label}\n${copy.longCountName}: ${chart.longCount.label}`).join("\n\n"));
    setQuestion(data.consultation.question);
    setCanRetry(false); setPaymentPending(false); setMessage(copy.successGenerated); return true;
  }
  async function fetchConsultation(body: Record<string, unknown>) {
    const expectedOwner = currentOwner();
    busyRef.current = true; setLoading(true); setError(""); setPaymentPending(false); paidBodyRef.current = body;
    try {
      const data = await continueOracleDelivery({ body: resultIdRef.current ? { resumeResultId: resultIdRef.current } : body,
        endpoint: ENDPOINT, fetcher: authFetch, active: () => activeRef.current && currentOwner() === expectedOwner,
        progress: value => { if (value.resultId) resultIdRef.current = value.resultId; },
      }) as MayaDelivery | null;
      if (!data) return false;
      if (acceptResult(data)) { void loadHistory(expectedOwner); return true; }
      setCanRetry(data.retryable !== false); setError(data.message || (data.retryable === false ? copy.deliveryReview : copy.deliveryRetry));
      void loadHistory(expectedOwner); return false;
    } finally {
      if (activeRef.current && currentOwner() === expectedOwner) { setLoading(false); busyRef.current = false; }
    }
  }
  const buildResume = usePaidResume(FEATURE_KEY, async (args, grant) => {
    if (busyRef.current) return false;
    const body = unpackPaidResumeArg<Record<string, unknown>>(args.body);
    if (!body?.requestId) return false;
    resultIdRef.current = "";
    return fetchConsultation({ ...body, paymentId: grant?.merchantUid || "" });
  });
  async function openSaved(resultId: string) {
    if (busyRef.current) return;
    const expectedOwner = currentOwner(); busyRef.current = true; setLoading(true); setError("");
    try {
      const response = await authFetch(`${ENDPOINT}/result?resultId=${encodeURIComponent(resultId)}`);
      const data: MayaDelivery = await response.json();
      if (!activeRef.current || currentOwner() !== expectedOwner) return;
      if (!response.ok) { setError(data.message || copy.deliveryRetry); return; }
      resultIdRef.current = resultId; paidBodyRef.current = { resumeResultId: resultId };
      if (!acceptResult(data)) { setPrompt(""); setCalculationPrompt(""); setCanRetry(data.retryable !== false); setError(data.retryable === false ? copy.deliveryReview : copy.deliveryRetry); }
    } catch { if (currentOwner() === expectedOwner) setError(copy.deliveryRetry); }
    finally { if (activeRef.current && currentOwner() === expectedOwner) { busyRef.current = false; setLoading(false); } }
  }
  async function handleGenerate() {
    if (busyRef.current || paymentPending) return;
    setError(""); setMessage("");
    if (prompt) {
      paidBodyRef.current = null; resultIdRef.current = ""; setPrompt(""); setCalculationPrompt(""); setQuestion(""); setCanRetry(false); return;
    }
    if (paidBodyRef.current) { await fetchConsultation(paidBodyRef.current); return; }
    let input;
    try { input = normalizeMayaConsultationInput({ name, birthDate, topic, question, year: result.gregorian.year, month: result.gregorian.month, day: result.gregorian.day }); }
    catch (failure) { setError(failure instanceof Error ? failure.message : copy.errorInterrupted); return; }
    const expectedOwner = currentOwner();
    if (!expectedOwner) { setError(copy.errorLoginRequired); return; }
    const requestId = `${FEATURE_KEY}:${crypto.randomUUID()}`;
    const body = { ...input, requestId };
    busyRef.current = true; setLoading(true);
    try {
      await registerPaidNarrativeIntent(FEATURE_KEY, body);
      if (!activeRef.current || currentOwner() !== expectedOwner) return;
      openPaidFeatureGate({ featureKey: FEATURE_KEY, requestId, cost: FEATURE_COST, paymentMode: "pass", title: copy.gateTitle, message: copy.gateCheckingMessage });
      const gate = await runBillingCoinGate({ featureKey: FEATURE_KEY, reason: copy.promptFeatureReason, requestId,
        cost: FEATURE_COST, coinPrice: FEATURE_COST, priceKRW: FEATURE_PRICE_KRW, amountKRW: FEATURE_PRICE_KRW,
        membershipCreditCost: FEATURE_COST * 10, resume: buildResume({ body: packPaidResumeArg(body) }),
      });
      if (!activeRef.current || currentOwner() !== expectedOwner) return;
      if (!gate.ok) {
        const code = String(gate.error?.code || "");
        setPaymentPending(["PG_PAYMENT_NOT_PAID", "PG_UNAVAILABLE", "GRANT_PENDING", "PENDING_CONFIRMATION"].includes(code));
        setError(gate.error?.message || copy.errorPaymentFailedFallback); return;
      }
      const evidence = gate.data as Record<string, unknown> | undefined;
      await fetchConsultation({ ...body, paymentId: evidence?.merchantUid || evidence?.paymentId || "" });
    } catch { if (currentOwner() === expectedOwner) setError(copy.errorInterrupted); }
    finally { if (activeRef.current && currentOwner() === expectedOwner) { setLoading(false); busyRef.current = false; } }
  }

  async function copyPrompt() {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = prompt;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setMessage(copy.successCopied);
  }

  return (
    <section className="relative min-w-0 overflow-hidden rounded-lg border border-[#d8b56d]/24 bg-[#04100d]/92 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.34)] backdrop-blur">
      <div className="pointer-events-none absolute inset-0 opacity-42 [background-image:radial-gradient(circle_at_90%_0%,rgba(216,181,109,0.18),transparent_34%),radial-gradient(circle_at_12%_4%,rgba(111,191,154,0.13),transparent_32%),linear-gradient(135deg,rgba(216,181,109,0.05)_1px,transparent_1px)] [background-size:auto,auto,48px_48px]" />
      <div className="pointer-events-none absolute inset-3 rounded-lg border border-[#d8b56d]/14" />
      <div className="pointer-events-none absolute -right-20 top-16 h-44 w-44 rounded-full border border-dashed border-[#d8b56d]/20 shadow-[0_0_60px_rgba(216,181,109,0.10)]" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="relative min-w-0">
          <p className={`inline-flex items-center gap-2 rounded-full border border-[#d8b56d]/30 bg-[#081812]/78 px-3 py-1 text-xs font-black text-[#f5d48f] ${CODE_FONT_CLASS}`}>
            <WandSparkles className="h-4 w-4" />
            Maya Consultation
          </p>
          <h2 className={`mt-3 text-2xl font-black text-[#f8efd2] ${DISPLAY_FONT_CLASS}`}>{copy.promptHeading}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[#e6dcc1]">
            {copy.promptDesc}
          </p>
        </div>
        <span className="relative inline-flex items-center gap-2 rounded-lg border border-[#d8b56d]/34 bg-[#020706]/72 px-4 py-2 text-xs font-black text-[#f5d48f] shadow-[0_0_24px_rgba(216,181,109,0.14)]">
          <LockKeyhole className="h-4 w-4" />
          {copy.promptPriceLabel}
        </span>
      </div>

      <fieldset disabled={loading || Boolean(paidBodyRef.current) || paymentPending} className="relative mt-5 grid min-w-0 gap-4 border-0 p-0 md:grid-cols-2">
        <label className="block min-w-0 text-sm font-bold text-[#eee5cb]">
          {copy.nameLabel}
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 w-full rounded-lg border border-[#d8b56d]/22 bg-[#020706] px-4 py-3 text-sm text-[#f8efd2] outline-none transition placeholder:text-[#e6dcc1]/38 focus:border-[#d8b56d] focus-visible:ring-2 focus-visible:ring-[#f5d48f]/70"
            placeholder={copy.namePlaceholder}
          />
        </label>
        <label className="block min-w-0 text-sm font-bold text-[#eee5cb]">
          {copy.birthDateLabel}
          <input {...birthDateTextInputProps(birthDate, (nextBirthDate) => setBirthDate(nextBirthDate))} className="mt-2 w-full rounded-lg border border-[#d8b56d]/22 bg-[#020706] px-4 py-3 text-sm text-[#f8efd2] outline-none transition focus:border-[#d8b56d] focus-visible:ring-2 focus-visible:ring-[#f5d48f]/70" />
        </label>
        <label className="block min-w-0 text-sm font-bold text-[#eee5cb] md:col-span-2">
          {copy.topicLabel}
          <select
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            className="mt-2 w-full rounded-lg border border-[#d8b56d]/22 bg-[#020706] px-4 py-3 text-sm text-[#f8efd2] outline-none transition focus:border-[#d8b56d] focus-visible:ring-2 focus-visible:ring-[#f5d48f]/70"
          >
            {MAYA_PROMPT_TOPICS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="block min-w-0 text-sm font-bold text-[#eee5cb] md:col-span-2">
          {copy.questionLabel}
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={4}
            maxLength={500}
            className="mt-2 w-full resize-none rounded-lg border border-[#d8b56d]/22 bg-[#020706] px-4 py-3 text-sm leading-6 text-[#f8efd2] outline-none transition placeholder:text-[#e6dcc1]/38 focus:border-[#d8b56d] focus-visible:ring-2 focus-visible:ring-[#f5d48f]/70"
            placeholder={copy.questionPlaceholder}
          />
        </label>
      </fieldset>

      {error ? (
        <p className="relative mt-4 rounded-lg border border-rose-200/30 bg-rose-500/12 p-3 text-sm font-bold text-rose-100" role="alert">{error}</p>
      ) : null}
      {message ? (
        <p className="relative mt-4 rounded-lg border border-[#6fbf9a]/28 bg-[#052018]/62 p-3 text-sm font-bold text-[#f0efd5]" aria-live="polite">{message}</p>
      ) : null}

      <div className="relative mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || paymentPending || Boolean(paidBodyRef.current && !canRetry && !prompt)}
          aria-label={buttonLabel}
          className="relative inline-flex min-h-12 items-center justify-center gap-2 overflow-hidden rounded-lg border border-[#d8b56d]/38 bg-[linear-gradient(135deg,#0c2c22_0%,#c89542_54%,#ead59c_100%)] px-5 py-3 text-sm font-black text-[#10130d] shadow-[0_16px_44px_rgba(200,149,66,0.24)] transition hover:brightness-110 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5d48f] disabled:cursor-wait disabled:border-[#8a7a5d]/24 disabled:bg-[#263028] disabled:text-[#e6dcc1]/55 disabled:shadow-none motion-reduce:transition-none"
        >
          <span className="absolute inset-0 opacity-0 transition hover:opacity-100 motion-reduce:transition-none [background-image:radial-gradient(circle_at_50%_0%,rgba(245,239,217,0.42),transparent_44%)]" />
          {loading ? (
            <RefreshCw className="relative h-4 w-4 animate-spin motion-reduce:animate-none" />
          ) : prompt ? (
            <RefreshCw className="relative h-4 w-4" />
          ) : (
            <WandSparkles className="relative h-4 w-4" />
          )}
          <span className="relative">{buttonLabel}</span>
        </button>
        <button
          type="button"
          onClick={copyPrompt}
          disabled={!prompt}
          aria-label={copy.copyButton}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#d8b56d]/22 bg-[#020706]/72 px-5 py-3 text-sm font-black text-[#f8efd2] transition hover:border-[#d8b56d]/48 hover:bg-[#082018]/72 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5d48f]/70 disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none"
        >
          <Copy className="h-4 w-4" />
          {copy.copyButton}
        </button>
      </div>

      {prompt ? (
        <div
          ref={promptResultRef}
          className="relative mt-5 min-w-0 scroll-mt-24 overflow-x-hidden rounded-lg border border-[#d8b56d]/34 bg-[#020706]/92 shadow-[0_0_42px_rgba(216,181,109,0.12),inset_0_1px_0_rgba(245,239,217,0.06)]"
        >
          <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(135deg,rgba(216,181,109,0.08)_1px,transparent_1px),radial-gradient(1px_1px_at_18%_28%,rgba(245,239,217,0.14),transparent)] [background-size:22px_22px,48px_48px]" />
          <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-[#d8b56d]/18 bg-[#04100d]/62 px-4 py-3">
            <div className="min-w-0">
              <h3 className={`relative text-base font-black text-[#f8efd2] ${DISPLAY_FONT_CLASS}`}>{copy.resultHeading}</h3>
              <p className="mt-1 text-xs leading-5 text-[#e6dcc1]">
                {copy.resultDesc}
              </p>
            </div>
            <button
              type="button"
              onClick={copyPrompt}
              aria-label={copy.copyButton}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#d8b56d]/24 bg-[#081812]/72 px-4 py-2 text-xs font-black text-[#f5d48f] transition hover:bg-[#0f2c22]/78 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5d48f]/70 motion-reduce:transition-none"
            >
              <Copy className="h-4 w-4" />
              {copy.copyButton}
            </button>
          </div>
          <pre className="relative whitespace-pre-wrap break-words p-4 text-sm leading-7 text-[#f5efd9] [overflow-wrap:anywhere]">
            {prompt}
          </pre>
          {calculationPrompt ? <details className="relative border-t border-[#d8b56d]/18 p-4 text-sm text-[#e6dcc1]">
            <summary className="min-h-11 cursor-pointer">{copy.calcBasisLabel}</summary>
            <pre className="whitespace-pre-wrap break-words leading-7 [overflow-wrap:anywhere]">{calculationPrompt}</pre>
          </details> : null}
          <div className="relative flex justify-end border-t border-[#d8b56d]/16 bg-[#04100d]/54 px-4 py-3">
            <button
              type="button"
              onClick={copyPrompt}
              aria-label={copy.copyButton}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#d8b56d]/28 bg-[#081812]/78 px-4 py-2 text-xs font-black text-[#f5d48f] transition hover:border-[#f5d48f]/58 hover:bg-[#0f2c22]/82 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5d48f]/70 motion-reduce:transition-none"
            >
              <Copy className="h-4 w-4" />
              {copy.copyButton}
            </button>
          </div>
        </div>
      ) : (
        <div className="relative mt-5 overflow-hidden rounded-lg border border-[#d8b56d]/18 bg-[#020706]/66 p-5 text-sm leading-7 text-[#e6dcc1]">
          <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_50%_0%,rgba(216,181,109,0.15),transparent_34%),linear-gradient(135deg,rgba(216,181,109,0.07)_1px,transparent_1px)] [background-size:auto,26px_26px]" />
          <div className="relative mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#d8b56d]/24 bg-[#081812]/74 text-[#f5d48f]">
            <WandSparkles className="h-5 w-5" />
          </div>
          <p className={`relative font-bold text-[#f8efd2] ${DISPLAY_FONT_CLASS}`}>{copy.emptyStateTitle}</p>
          <p className="relative mt-1">
            {copy.emptyStateDesc}
          </p>
        </div>
      )}
      {history.length ? <section className="relative mt-6 border-t border-[#d8b56d]/22 pt-4 text-[#f8efd2]" aria-label={copy.historyTitle}>
        <h3 className="text-base font-bold">{copy.historyTitle}</h3>
        <ul className="mt-2 space-y-2">{history.map(item => <li key={item.resultId}>
          <button type="button" disabled={loading} onClick={() => { void openSaved(item.resultId); }} className="min-h-12 w-full rounded-lg border border-[#d8b56d]/22 px-3 py-2 text-left text-sm leading-6 focus-visible:ring-2 focus-visible:ring-[#f5d48f]">
            {item.question} · {copy.readAgain}
          </button>
        </li>)}</ul>
      </section> : null}
      {error ? <a className="relative mt-3 inline-flex min-h-11 items-center text-sm text-[#f5d48f] underline" href="/contact/#payment-help">{copy.supportLink}</a> : null}
    </section>
  );
}
