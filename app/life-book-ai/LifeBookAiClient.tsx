"use client";

import { BookOpen, CalendarDays, Clock3, Loader2, Moon, Send, Sparkles, UserRound, WalletCards } from "lucide-react";
import { useCallback, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { openPaidFeatureGate, runBillingCoinGate } from "@/app/_lib/billing-client";

type AccessType = "pass" | "paid" | "subscription" | "admin";
type CalendarType = "solar" | "lunar";
type GenderType = "male" | "female" | "other" | "";
type FlowStatus = "idle" | "opening" | "payment" | "reading" | "ready" | "error";

type ConsultationForm = {
  name: string;
  gender: GenderType;
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  calendarType: CalendarType;
  topic: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};

type EnsureAccessResult =
  | { ok: true; accessToken: string; accessType: AccessType }
  | { ok: false; reason: "PAYMENT_REQUIRED"; paymentPayload?: Record<string, unknown> }
  | { ok: false; reason: "LOGIN_REQUIRED"; message?: string }
  | { ok: false; reason: "INVALID_INPUT"; message: string }
  | { ok: false; reason?: string; message?: string };

type ConsultationResult = {
  ok: boolean;
  sessionId?: string;
  consultationId?: string;
  accessType?: AccessType;
  status?: string;
  title?: string;
  keywords?: string[];
  messages?: ChatMessage[];
  reason?: string;
  message?: string;
};

const FEATURE_KEY = "life-book-ai-consultation";
const FEATURE_COST = 500;
const FEATURE_AMOUNT_KRW = 50000;
const FEATURE_MEMBERSHIP_CREDIT_COST = 5000;
const FEATURE_REASON = "인생의 책 AI 상담";

const TOPICS = [
  "전체 인생 흐름",
  "타고난 성향",
  "인생의 사명",
  "직업/사업 방향",
  "재물 흐름",
  "연애와 결혼",
  "인간관계",
  "가족과 상처",
  "현재 인생의 전환점",
  "앞으로의 기회",
  "반복되는 실패 패턴",
  "나에게 맞는 삶의 방식",
] as const;

const ACCESS_LABELS: Record<AccessType, string> = {
  pass: "이용권",
  paid: "단건 결제",
  subscription: "월정석",
  admin: "관리자",
};

const LOGIN_REQUIRED_MESSAGE = "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.";
const PAYMENT_REQUIRED_MESSAGE = "인생의 책 AI 상담 이용권이 필요합니다. 결제창을 열어드릴게요.";
const PAYMENT_VERIFY_FAILED_MESSAGE = "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.";
const INVALID_INPUT_MESSAGE = "생년월일과 상담 정보를 다시 확인해 주세요.";
const SERVER_ERROR_MESSAGE = "상담을 준비하는 중 문제가 발생했습니다. 결제 금액은 차감되지 않았습니다.";
const LLM_ERROR_MESSAGE = "AI 상담 답변을 생성하지 못했습니다. 이용권 또는 결제 권한은 보존되었으니 다시 시도해 주세요.";
const CALCULATION_ERROR_MESSAGE = "명식 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.";

const defaultForm = (): ConsultationForm => ({
  name: "",
  gender: "",
  birthDate: "",
  birthTime: "",
  birthTimeUnknown: false,
  calendarType: "solar",
  topic: "전체 인생 흐름",
});

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `lbai-${crypto.randomUUID()}`;
  return `lbai-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function toText(value: unknown) {
  return String(value || "").trim();
}

function toNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

function buildConsultationPayload(form: ConsultationForm) {
  return {
    birthInfo: {
      name: form.name.trim(),
      gender: form.gender,
      birthDate: form.birthDate,
      birthTime: form.birthTimeUnknown ? "" : form.birthTime,
      birthTimeUnknown: form.birthTimeUnknown,
      calendarType: form.calendarType,
    },
    topic: form.topic,
  };
}

function buildBillingGateInput(paymentPayload: Record<string, unknown>, idempotencyKey: string) {
  const runtimeGate = asRecord(paymentPayload.runtimeGate);
  const cost = toNumber(runtimeGate.cost ?? runtimeGate.coinPrice ?? paymentPayload.cost ?? paymentPayload.coinPrice, FEATURE_COST);
  const amountKRW = toNumber(runtimeGate.amountKRW ?? runtimeGate.amountKrw ?? paymentPayload.amountKRW ?? paymentPayload.amountKrw ?? paymentPayload.paymentAmount, FEATURE_AMOUNT_KRW);
  return {
    categoryKey: toText(runtimeGate.categoryKey ?? paymentPayload.categoryKey) || "premium-consultation",
    subFeatureKey: toText(runtimeGate.subFeatureKey ?? paymentPayload.subFeatureKey) || FEATURE_KEY,
    featureKey: toText(runtimeGate.featureKey ?? paymentPayload.featureKey) || FEATURE_KEY,
    reason: toText(runtimeGate.reason ?? paymentPayload.reason) || FEATURE_REASON,
    productId: toText(runtimeGate.productId ?? paymentPayload.productId) || "life-book-ai",
    productType: toText(runtimeGate.productType ?? paymentPayload.productType) || "life-book-ai",
    serviceType: toText(runtimeGate.serviceType ?? paymentPayload.serviceType) || "life-book-ai",
    forceDeduct: true,
    deferUsage: true,
    usagePolicy: "apply_after_success",
    executionKey: `life-book-ai:${idempotencyKey}`,
    requestId: idempotencyKey,
    idempotencyKey,
    cost,
    coinPrice: cost,
    amountKRW,
    amountKrw: amountKRW,
    paymentAmount: amountKRW,
    membershipCreditCost: toNumber(runtimeGate.membershipCreditCost ?? paymentPayload.membershipCreditCost, FEATURE_MEMBERSHIP_CREDIT_COST),
  };
}

async function postJson<T>(path: string, body: Record<string, unknown>, idempotencyKey?: string): Promise<{ response: Response; payload: T }> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    credentials: "include",
    body: JSON.stringify(idempotencyKey ? { ...body, idempotencyKey } : body),
  });
  const payload = await response.json().catch(() => ({})) as T;
  return { response, payload };
}

function firstAssistantMessage(messages: ChatMessage[]) {
  return messages.find((message) => message.role === "assistant")?.content || "";
}

function fallbackTitle(name: string) {
  return `${name.trim() || "당신"}의 인생 책`;
}

function compactLines(content: string) {
  return String(content || "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
}

export default function LifeBookAiClient() {
  const [form, setForm] = useState<ConsultationForm>(() => defaultForm());
  const [status, setStatus] = useState<FlowStatus>("idle");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [accessType, setAccessType] = useState<AccessType | "">("");
  const [title, setTitle] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [followUp, setFollowUp] = useState("");
  const [sending, setSending] = useState(false);
  const startLockRef = useRef(false);
  const idempotencyKeyRef = useRef(createIdempotencyKey());

  const statusText = useMemo(() => {
    if (status === "opening") return "당신의 인생 책을 펼치고 있습니다";
    if (status === "payment") return "결제창을 확인해 주세요";
    if (status === "reading") return "삶의 흐름을 읽고 있습니다";
    if (status === "ready") return "상담이 이어지고 있습니다";
    return "달빛 서재가 조용히 열려 있습니다";
  }, [status]);

  const isBusy = status === "opening" || status === "payment" || status === "reading";
  const canAskFollowUp = Boolean(sessionId && messages.length && !sending && !isBusy);
  const assistantIntro = firstAssistantMessage(messages);
  const displayTitle = title || fallbackTitle(form.name);
  const displayKeywords = keywords.length ? keywords : [form.topic, "자기 이해", "전환"].slice(0, 3);

  const resetAttempt = useCallback(() => {
    if (isBusy) return;
    idempotencyKeyRef.current = createIdempotencyKey();
    setSessionId("");
    setAccessType("");
    setTitle("");
    setKeywords([]);
    setMessages([]);
    setError("");
    setNotice("");
    setStatus("idle");
  }, [isBusy]);

  const updateField = (field: keyof ConsultationForm) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = field === "birthTimeUnknown"
      ? (event.target as HTMLInputElement).checked
      : event.target.value;
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "birthTimeUnknown" && value === true ? { birthTime: "" } : {}),
    }));
    resetAttempt();
  };

  const startConsultation = useCallback(async (
    payload: ReturnType<typeof buildConsultationPayload>,
    idempotencyKey: string,
    access: { accessToken?: string; billingGate?: Record<string, unknown> },
  ) => {
    setStatus("reading");
    const { payload: result } = await postJson<ConsultationResult>("/api/life-book-ai/start", {
      ...payload,
      ...access,
    }, idempotencyKey);

    if (result.ok && Array.isArray(result.messages) && result.messages.length) {
      setSessionId(result.sessionId || result.consultationId || "");
      setAccessType(result.accessType || "");
      setTitle(result.title || fallbackTitle(form.name));
      setKeywords(Array.isArray(result.keywords) ? result.keywords.slice(0, 3) : []);
      setMessages(result.messages);
      setStatus("ready");
      setNotice("");
      setError("");
      return;
    }

    if (result.status === "generating") {
      setNotice("삶의 흐름을 읽고 있습니다");
      return;
    }

    const reason = String(result.reason || "");
    if (reason === "LLM_ERROR") throw new Error(LLM_ERROR_MESSAGE);
    if (reason === "PAYMENT_VERIFY_FAILED") throw new Error(PAYMENT_VERIFY_FAILED_MESSAGE);
    if (reason === "CALCULATION_ERROR") throw new Error(CALCULATION_ERROR_MESSAGE);
    throw new Error(result.message || SERVER_ERROR_MESSAGE);
  }, [form.name]);

  const submit = useCallback(async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (startLockRef.current || isBusy) return;
    const payload = buildConsultationPayload(form);
    if (!form.gender || !form.birthDate || !form.topic || (!form.birthTimeUnknown && form.birthTime && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(form.birthTime))) {
      setError(INVALID_INPUT_MESSAGE);
      setStatus("error");
      return;
    }

    startLockRef.current = true;
    const idempotencyKey = idempotencyKeyRef.current;
    setError("");
    setNotice("");
    setStatus("opening");

    try {
      const { payload: access } = await postJson<EnsureAccessResult>("/api/life-book-ai/ensure-access", payload, idempotencyKey);
      if (access.ok) {
        await startConsultation(payload, idempotencyKey, { accessToken: access.accessToken });
        return;
      }
      const denied = access as Exclude<EnsureAccessResult, { ok: true }>;
      if (denied.reason === "LOGIN_REQUIRED") {
        setError(denied.message || LOGIN_REQUIRED_MESSAGE);
        setStatus("error");
        return;
      }
      if (denied.reason === "INVALID_INPUT") {
        setError(denied.message || INVALID_INPUT_MESSAGE);
        setStatus("error");
        return;
      }
      if (denied.reason === "PAYMENT_REQUIRED") {
        setNotice(PAYMENT_REQUIRED_MESSAGE);
        setStatus("payment");
        const paymentPayload = "paymentPayload" in denied ? denied.paymentPayload : undefined;
        const billingInput = buildBillingGateInput(asRecord(paymentPayload), idempotencyKey);
        openPaidFeatureGate({
          featureKey: billingInput.featureKey,
          requestId: idempotencyKey,
          cost: billingInput.cost,
          paymentMode: "pass",
          message: PAYMENT_REQUIRED_MESSAGE,
        });
        const gate = await runBillingCoinGate(billingInput);
        if (!gate.ok || !gate.data) {
          const code = String(gate.error?.code || "").toUpperCase();
          if (code === "AUTH_REQUIRED" || code === "LOGIN_REQUIRED") throw new Error(LOGIN_REQUIRED_MESSAGE);
          throw new Error(PAYMENT_VERIFY_FAILED_MESSAGE);
        }
        await startConsultation(payload, idempotencyKey, { billingGate: gate.data as Record<string, unknown> });
        return;
      }
      throw new Error(("message" in denied && denied.message) ? denied.message : SERVER_ERROR_MESSAGE);
    } catch (err) {
      setError(err instanceof Error ? err.message : SERVER_ERROR_MESSAGE);
      setStatus("error");
    } finally {
      startLockRef.current = false;
    }
  }, [form, isBusy, startConsultation]);

  const sendFollowUp = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = followUp.trim();
    if (!canAskFollowUp || content.length < 2) return;
    setSending(true);
    setError("");
    try {
      const idempotencyKey = `${idempotencyKeyRef.current}:msg:${Date.now().toString(36)}`;
      const { payload } = await postJson<ConsultationResult>("/api/life-book-ai/message", {
        sessionId,
        message: content,
      }, idempotencyKey);
      if (!payload.ok) throw new Error(payload.message || LLM_ERROR_MESSAGE);
      if (Array.isArray(payload.messages)) setMessages(payload.messages);
      setFollowUp("");
    } catch (err) {
      setError(err instanceof Error ? err.message : LLM_ERROR_MESSAGE);
    } finally {
      setSending(false);
    }
  }, [canAskFollowUp, followUp, sessionId]);

  return (
    <main className="min-h-screen bg-[#101626] text-[#fff8ed]">
      <section className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(244,197,94,.22),transparent_28%),radial-gradient(circle_at_82%_8%,rgba(45,212,191,.16),transparent_24%),linear-gradient(135deg,#101626_0%,#23172a_48%,#0e1f27_100%)]" />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#f8d88922] to-transparent" />
        <div className="relative mx-auto grid min-h-[calc(100vh-48px)] w-full max-w-6xl gap-5 lg:grid-cols-[0.92fr_1.08fr]">
          <aside className="flex min-h-[360px] flex-col justify-between overflow-hidden rounded-[8px] border border-[#f0d48a33] bg-[#131927cc] p-5 shadow-2xl shadow-black/30 sm:p-7">
            <div>
              <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-[#f8d889]">
                <BookOpen size={18} />
                <span>인생의 책 AI 상담</span>
              </div>
              <h1 className="max-w-[12ch] text-4xl font-black leading-tight tracking-normal sm:text-5xl">
                달빛 서재에서 펼쳐지는 나의 삶
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-[#eadfc9]">
                명식의 구조와 지금의 질문을 함께 놓고, 당신의 삶이 어떤 문장으로 이어져 왔는지 차분히 읽어드립니다.
              </p>
            </div>
            <div className="mt-8 overflow-hidden rounded-[8px] border border-[#f0d48a2b] bg-[#080d18]">
              <img
                src="/fuctionassets/lifebook.webp"
                alt="인생의 책"
                className="h-auto w-full object-cover"
                loading="eager"
                decoding="async"
              />
            </div>
          </aside>

          <section className="grid min-h-[520px] gap-4">
            <div className="rounded-[8px] border border-[#f0d48a2f] bg-[#fff8ed10] p-4 shadow-2xl shadow-black/20 sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-bold text-[#f8d889]">
                  {isBusy ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                  <span>{statusText}</span>
                </div>
                {accessType && <span className="rounded-full border border-[#8be0d433] px-3 py-1 text-xs font-bold text-[#b6f3ea]">{ACCESS_LABELS[accessType]}</span>}
              </div>

              {messages.length === 0 ? (
                <form onSubmit={submit} className="grid gap-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm font-bold">
                      <span className="flex items-center gap-2 text-[#f6e6c4]"><UserRound size={16} /> 이름 또는 닉네임</span>
                      <input value={form.name} onChange={updateField("name")} className="min-h-11 rounded-[8px] border border-[#ffffff24] bg-[#0b1220] px-3 text-[#fff8ed] outline-none focus:border-[#f8d889]" placeholder="이름" />
                    </label>
                    <label className="grid gap-2 text-sm font-bold">
                      <span className="text-[#f6e6c4]">성별</span>
                      <select value={form.gender} onChange={updateField("gender")} className="min-h-11 rounded-[8px] border border-[#ffffff24] bg-[#0b1220] px-3 text-[#fff8ed] outline-none focus:border-[#f8d889]">
                        <option value="">선택</option>
                        <option value="female">여성</option>
                        <option value="male">남성</option>
                        <option value="other">기타</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm font-bold">
                      <span className="flex items-center gap-2 text-[#f6e6c4]"><CalendarDays size={16} /> 생년월일</span>
                      <input type="date" value={form.birthDate} onChange={updateField("birthDate")} className="min-h-11 rounded-[8px] border border-[#ffffff24] bg-[#0b1220] px-3 text-[#fff8ed] outline-none focus:border-[#f8d889]" />
                    </label>
                    <label className="grid gap-2 text-sm font-bold">
                      <span className="flex items-center gap-2 text-[#f6e6c4]"><Moon size={16} /> 양력/음력</span>
                      <select value={form.calendarType} onChange={updateField("calendarType")} className="min-h-11 rounded-[8px] border border-[#ffffff24] bg-[#0b1220] px-3 text-[#fff8ed] outline-none focus:border-[#f8d889]">
                        <option value="solar">양력</option>
                        <option value="lunar">음력</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                    <label className="grid gap-2 text-sm font-bold">
                      <span className="flex items-center gap-2 text-[#f6e6c4]"><Clock3 size={16} /> 출생시간</span>
                      <input type="time" value={form.birthTime} onChange={updateField("birthTime")} disabled={form.birthTimeUnknown} className="min-h-11 rounded-[8px] border border-[#ffffff24] bg-[#0b1220] px-3 text-[#fff8ed] outline-none focus:border-[#f8d889] disabled:opacity-50" />
                    </label>
                    <label className="flex min-h-11 items-center gap-2 rounded-[8px] border border-[#ffffff20] bg-[#0b1220] px-3 text-sm font-bold text-[#eadfc9]">
                      <input type="checkbox" checked={form.birthTimeUnknown} onChange={updateField("birthTimeUnknown")} className="h-4 w-4 accent-[#f8d889]" />
                      출생시간 모름
                    </label>
                  </div>

                  <label className="grid gap-2 text-sm font-bold">
                    <span className="text-[#f6e6c4]">상담하고 싶은 인생 주제</span>
                    <select value={form.topic} onChange={updateField("topic")} className="min-h-11 rounded-[8px] border border-[#ffffff24] bg-[#0b1220] px-3 text-[#fff8ed] outline-none focus:border-[#f8d889]">
                      {TOPICS.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
                    </select>
                  </label>

                  <button type="submit" disabled={isBusy} className="mt-1 flex min-h-12 items-center justify-center gap-2 rounded-[8px] bg-[#f4cc78] px-5 font-black text-[#15110a] shadow-lg shadow-[#00000033] transition hover:bg-[#ffe0a2] disabled:cursor-not-allowed disabled:opacity-60">
                    {isBusy ? <Loader2 size={18} className="animate-spin" /> : <WalletCards size={18} />}
                    인생의 책 AI 상담 받기
                  </button>
                </form>
              ) : (
                <div className="grid gap-4">
                  <div className="rounded-[8px] border border-[#f0d48a36] bg-[#0b1220cc] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f8d889]">당신의 인생 책 제목</p>
                    <h2 className="mt-2 text-2xl font-black leading-tight text-[#fff8ed]">{displayTitle}</h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {displayKeywords.map((keyword) => (
                        <span key={keyword} className="rounded-full border border-[#8be0d433] bg-[#0f2a2dcc] px-3 py-1 text-xs font-bold text-[#b6f3ea]">{keyword}</span>
                      ))}
                    </div>
                  </div>

                  <div className="max-h-[56vh] space-y-3 overflow-y-auto pr-1">
                    {messages.map((message, index) => (
                      <article key={`${message.role}-${index}`} className={`rounded-[8px] border p-4 leading-7 ${message.role === "assistant" ? "border-[#f0d48a2f] bg-[#fff8ed12] text-[#fff8ed]" : "border-[#8be0d426] bg-[#0b2228cc] text-[#dffbf7]"}`}>
                        {compactLines(message.content).map((line, lineIndex) => (
                          <p key={lineIndex} className={lineIndex === 0 && message.role === "assistant" ? "font-bold text-[#f8d889]" : "mt-2 first:mt-0"}>{line}</p>
                        ))}
                      </article>
                    ))}
                  </div>

                  <form onSubmit={sendFollowUp} className="flex gap-2">
                    <input value={followUp} onChange={(event) => setFollowUp(event.target.value)} disabled={!canAskFollowUp} className="min-h-12 min-w-0 flex-1 rounded-[8px] border border-[#ffffff24] bg-[#0b1220] px-3 text-[#fff8ed] outline-none focus:border-[#f8d889] disabled:opacity-50" placeholder="지금 마음에 남은 질문을 적어 주세요" />
                    <button type="submit" disabled={!canAskFollowUp || sending} className="grid min-h-12 w-12 place-items-center rounded-[8px] bg-[#8be0d4] text-[#082226] disabled:cursor-not-allowed disabled:opacity-50" aria-label="추가 질문 보내기">
                      {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                  </form>
                </div>
              )}

              {(notice || error) && (
                <div className={`mt-4 rounded-[8px] border px-4 py-3 text-sm font-semibold ${error ? "border-[#fb718540] bg-[#3b111bcc] text-[#fecdd3]" : "border-[#f0d48a38] bg-[#302513cc] text-[#ffe8b0]"}`}>
                  {error || notice}
                </div>
              )}
            </div>

            {assistantIntro && (
              <div className="rounded-[8px] border border-[#ffffff18] bg-[#0b1220aa] p-4 text-sm leading-7 text-[#eadfc9]">
                {compactLines(assistantIntro).slice(0, 2).join(" ")}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
