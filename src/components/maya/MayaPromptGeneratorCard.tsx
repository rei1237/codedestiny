"use client";

import { useMemo, useState } from "react";
import { Copy, LockKeyhole, RefreshCw, WandSparkles } from "lucide-react";
import { openPaidFeatureGate, runBillingCoinGate } from "@/app/_lib/billing-client";
import type { MayaCalendarResult } from "@/src/lib/maya-calendar";
import { generateMayaReadingPrompt, MAYA_PROMPT_TOPICS } from "@/src/lib/maya-prompt-generator";

type Props = {
  result: MayaCalendarResult;
};

const FEATURE_KEY = "maya-prompt-generator";
const FEATURE_REASON = "마야점 상담 프롬프트 생성";
const FEATURE_COST = 30;

export default function MayaPromptGeneratorCard({ result }: Props) {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [topic, setTopic] = useState<string>(MAYA_PROMPT_TOPICS[0]);
  const [concern, setConcern] = useState("");
  const [prompt, setPrompt] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const buttonLabel = useMemo(() => {
    if (loading) return "이용권 확인 중";
    if (prompt) return "다시 생성하기";
    return "마야점 프롬프트 생성하기";
  }, [loading, prompt]);

  function buildPrompt() {
    return generateMayaReadingPrompt({
      name,
      birthDate,
      targetDate: result.gregorian.labelKo.replace(` ${result.gregorian.weekdayKo}`, ""),
      weekdayKo: result.gregorian.weekdayKo,
      topic,
      concern,
      longCount: result.longCount.label,
      tzolkinNumber: result.tzolkin.number,
      tzolkinSign: result.tzolkin.sign,
      tzolkinKo: result.tzolkin.ko,
      tzolkinKeywords: result.tzolkin.keywords,
      haabDay: result.haab.day,
      haabMonth: result.haab.month,
      haabKo: result.haab.ko,
      haabKeywords: result.haab.keywords,
    });
  }

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
        title: "마야점 프롬프트 생성",
        message: "이용권과 결제 가능 여부를 확인하고 있습니다.",
      });

      try {
        const gate = await runBillingCoinGate({
          featureKey: FEATURE_KEY,
          reason: FEATURE_REASON,
          forceDeduct: true,
          requestId,
          cost: FEATURE_COST,
          coinPrice: FEATURE_COST,
          membershipCreditCost: FEATURE_COST * 10,
        });

        if (!gate.ok) {
          const code = String(gate.error?.code || "").toUpperCase();
          if (code === "AUTH_REQUIRED") {
            setError("로그인 후 이용권 또는 결제를 확인할 수 있습니다.");
          } else if (code === "INSUFFICIENT_COINS") {
            setError("결제 가능 금액이 부족합니다. 결제 페이지에서 충전 후 다시 시도해 주세요.");
          } else {
            setError(gate.error?.message || "결제 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.");
          }
          return;
        }

        setUnlocked(true);
      } catch {
        setError("결제 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      } finally {
        setLoading(false);
      }
    }

    setPrompt(buildPrompt());
    setMessage("아래 프롬프트를 복사해 원하는 AI에게 붙여넣으면 마야점 상담을 받을 수 있습니다.");
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
    setMessage("프롬프트를 복사했습니다.");
  }

  return (
    <section className="rounded-lg border border-violet-200/20 bg-white/[0.07] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.24)] backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-violet-200/12 px-3 py-1 text-xs font-black text-violet-100">
            <WandSparkles className="h-4 w-4" />
            유료 프롬프트
          </p>
          <h2 className="mt-3 text-2xl font-black text-white">마야점 프롬프트 생성</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-200">
            선택한 날짜의 마야 달력 코드를 바탕으로 AI에게 물어볼 수 있는 상담 프롬프트를 생성합니다.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/25 bg-amber-200/10 px-4 py-2 text-xs font-black text-amber-50">
          <LockKeyhole className="h-4 w-4" />
          {FEATURE_COST}코인
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-bold text-slate-100">
          이름 또는 닉네임
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 w-full rounded-lg border border-white/12 bg-slate-950/65 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200"
            placeholder="미입력 가능"
          />
        </label>
        <label className="block text-sm font-bold text-slate-100">
          생년월일, 선택
          <input
            type="date"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
            className="mt-2 w-full rounded-lg border border-white/12 bg-slate-950/65 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200"
          />
        </label>
        <label className="block text-sm font-bold text-slate-100 md:col-span-2">
          상담 주제
          <select
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            className="mt-2 w-full rounded-lg border border-white/12 bg-slate-950/65 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-200"
          >
            {MAYA_PROMPT_TOPICS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-bold text-slate-100 md:col-span-2">
          현재 고민 또는 질문
          <textarea
            value={concern}
            onChange={(event) => setConcern(event.target.value)}
            rows={4}
            className="mt-2 w-full resize-none rounded-lg border border-white/12 bg-slate-950/65 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-amber-200"
            placeholder="선택 입력입니다. 서버로 전송되지 않고 브라우저에서 프롬프트에만 반영됩니다."
          />
        </label>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-rose-200/30 bg-rose-500/12 p-3 text-sm font-bold text-rose-100">{error}</p>
      ) : null}
      {message ? (
        <p className="mt-4 rounded-lg border border-emerald-200/25 bg-emerald-400/10 p-3 text-sm font-bold text-emerald-100">{message}</p>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-amber-200 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-100 disabled:cursor-wait disabled:opacity-70"
        >
          {prompt ? <RefreshCw className="h-4 w-4" /> : <WandSparkles className="h-4 w-4" />}
          {buttonLabel}
        </button>
        <button
          type="button"
          onClick={copyPrompt}
          disabled={!prompt}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-5 py-3 text-sm font-black text-white transition hover:bg-white/[0.13] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Copy className="h-4 w-4" />
          프롬프트 복사하기
        </button>
      </div>

      {prompt ? (
        <textarea
          value={prompt}
          readOnly
          rows={18}
          className="mt-5 w-full resize-y rounded-lg border border-amber-200/20 bg-slate-950/76 p-4 text-sm leading-7 text-slate-100 outline-none"
        />
      ) : null}
    </section>
  );
}
