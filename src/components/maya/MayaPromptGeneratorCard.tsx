"use client";

import { birthDateTextInputProps } from "@/lib/birthDateInputProps";
import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, LockKeyhole, RefreshCw, WandSparkles } from "lucide-react";
import { openPaidFeatureGate, runBillingCoinGate } from "@/app/_lib/billing-client";
import { usePaidResume } from "@/app/hooks/usePaidResume";
import { calculateMayaCalendar, type MayaCalendarResult } from "@/src/lib/maya-calendar";
import { generateMayaReadingPrompt, MAYA_PROMPT_TOPICS } from "@/src/lib/maya-prompt-generator";
import { useMayaCopy } from "./_lib/copy";

type Props = {
  result: MayaCalendarResult;
};

const FEATURE_KEY = "maya-prompt-generator";
const FEATURE_COST = 30;
const FEATURE_PRICE_KRW = 3000;
const DISPLAY_FONT_CLASS = "[font-family:'Noto_Serif_KR','Noto_Serif',Georgia,serif]";
const CODE_FONT_CLASS = "[font-family:Georgia,'Times_New_Roman',serif]";

export default function MayaPromptGeneratorCard({ result }: Props) {
  const copy = useMayaCopy();
  const promptResultRef = useRef<HTMLDivElement | null>(null);
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [topic, setTopic] = useState<string>(MAYA_PROMPT_TOPICS[0]);
  const [question, setQuestion] = useState("");
  const [prompt, setPrompt] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const buttonLabel = useMemo(() => {
    if (loading) return copy.buttonOpening;
    if (prompt) return copy.buttonRegenerate;
    return copy.buttonGenerate;
  }, [loading, prompt, copy]);

  useEffect(() => {
    if (!prompt) return;
    const frame = window.requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      promptResultRef.current?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [prompt]);

  type PromptFields = { name: string; birthDate: string; topic: string; question: string };

  function buildPromptFrom(source: MayaCalendarResult, fields: PromptFields) {
    return generateMayaReadingPrompt({
      name: fields.name,
      birthDate: fields.birthDate,
      targetDate: source.gregorian.labelKo.replace(` ${source.gregorian.weekdayKo}`, ""),
      weekdayKo: source.gregorian.weekdayKo,
      topic: fields.topic,
      question: fields.question,
      longCount: source.longCount.label,
      tzolkinNumber: source.tzolkin.number,
      tzolkinSign: source.tzolkin.sign,
      tzolkinKo: source.tzolkin.ko,
      tzolkinKeywords: source.tzolkin.keywords,
      haabDay: source.haab.day,
      haabMonth: source.haab.month,
      haabKo: source.haab.ko,
      haabKeywords: source.haab.keywords,
    });
  }

  function buildPrompt() {
    return buildPromptFrom(result, { name, birthDate, topic, question });
  }

  /**
   * 결제 후 자동 재개 — 모바일 PortOne 은 상위 프레임을 리다이렉트하므로 handleGenerate 의 await 가
   * 문서와 함께 죽는다. 프롬프트는 순수 클라이언트 조립이라 입력만 되살리면 그대로 다시 만들어진다.
   * 🔴 완성된 프롬프트를 서술자에 싣지 않는다 — 결제가 끝나기 전에 유료 산출물이 브라우저 저장소에 남는다.
   * 🔴 대상 날짜는 부모(MayaCalendarView)의 선택 상태라 복귀한 새 문서에서 '오늘'로 되돌아간다 —
   *    그래서 선택 날짜를 함께 실어 여기서 다시 계산한다(안 그러면 결제하고 남의 날짜 프롬프트를 받는다).
   */
  const buildResume = usePaidResume(FEATURE_KEY, (args) => {
    const year = Number(args.year);
    const month = Number(args.month);
    const day = Number(args.day);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return false;
    const fields: PromptFields = {
      name: typeof args.name === "string" ? args.name : "",
      birthDate: typeof args.birthDate === "string" ? args.birthDate : "",
      topic: typeof args.topic === "string" ? args.topic : MAYA_PROMPT_TOPICS[0],
      question: typeof args.question === "string" ? args.question : "",
    };
    setName(fields.name);
    setBirthDate(fields.birthDate);
    setTopic(fields.topic);
    setQuestion(fields.question);
    setUnlocked(true);
    setPrompt(buildPromptFrom(calculateMayaCalendar(year, month, day), fields));
    setMessage(copy.successGenerated);
    return true;
  });

  async function handleGenerate() {
    if (loading) return;
    setError("");
    setMessage("");

    if (!unlocked) {
      setLoading(true);
      const requestId = `${FEATURE_KEY}:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      openPaidFeatureGate({
        featureKey: FEATURE_KEY,
        requestId,
        cost: FEATURE_COST,
        paymentMode: "pass",
        title: copy.gateTitle,
        message: copy.gateCheckingMessage,
      });

      try {
        const gate = await runBillingCoinGate({
          featureKey: FEATURE_KEY,
          reason: copy.promptFeatureReason,
          requestId,
          cost: FEATURE_COST,
          coinPrice: FEATURE_COST,
          priceKRW: FEATURE_PRICE_KRW,
          amountKRW: FEATURE_PRICE_KRW,
          membershipCreditCost: FEATURE_COST * 10,
          resume: buildResume({
            name,
            birthDate,
            topic,
            question,
            year: result.gregorian.year,
            month: result.gregorian.month,
            day: result.gregorian.day,
          }),
        });

        if (!gate.ok) {
          const code = String(gate.error?.code || "").toUpperCase();
          if (code === "AUTH_REQUIRED") {
            setError(copy.errorLoginRequired);
          } else if (code === "INSUFFICIENT_COINS") {
            setError(copy.errorInsufficientCoins);
          } else {
            setError(gate.error?.message || copy.errorPaymentFailedFallback);
          }
          return;
        }

        setUnlocked(true);
      } catch {
        setError(copy.errorInterrupted);
        return;
      } finally {
        setLoading(false);
      }
    }

    setPrompt(buildPrompt());
    setMessage(copy.successGenerated);
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
            Maya Prompt
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

      <div className="relative mt-5 grid min-w-0 gap-4 md:grid-cols-2">
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
            className="mt-2 w-full resize-none rounded-lg border border-[#d8b56d]/22 bg-[#020706] px-4 py-3 text-sm leading-6 text-[#f8efd2] outline-none transition placeholder:text-[#e6dcc1]/38 focus:border-[#d8b56d] focus-visible:ring-2 focus-visible:ring-[#f5d48f]/70"
            placeholder={copy.questionPlaceholder}
          />
        </label>
      </div>

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
          disabled={loading}
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
    </section>
  );
}
