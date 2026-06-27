"use client";

import { CalendarDays, Loader2, Moon, Send, Sparkles, WalletCards } from "lucide-react";
import { useCallback, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { openPaidFeatureGate, runBillingCoinGate } from "@/app/_lib/billing-client";

type AccessType = "pass" | "paid" | "subscription" | "admin";
type CalendarType = "solar" | "lunar";
type GenderType = "male" | "female" | "other" | "";
type FlowStatus = "idle" | "preparing" | "payment" | "reading" | "ready" | "error";

type ConsultationForm = {
  name: string;
  gender: GenderType;
  birthDate: string;
  birthTime: string;
  calendarType: CalendarType;
  year: string;
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
  accessType?: AccessType;
  status?: string;
  messages?: ChatMessage[];
  reason?: string;
  message?: string;
};

const LOGIN_REQUIRED_MESSAGE = "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.";
const PAYMENT_REQUIRED_MESSAGE = "신년운세 AI 상담 이용권이 필요합니다. 결제창을 열어드릴게요.";
const PAYMENT_VERIFY_FAILED_MESSAGE = "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.";
const SERVER_ERROR_MESSAGE = "상담을 준비하는 중 문제가 발생했습니다. 결제 금액은 차감되지 않았습니다.";
const LLM_ERROR_MESSAGE = "AI 상담 답변을 생성하지 못했습니다. 이용권 또는 결제 권한은 보존되었으니 다시 시도해 주세요.";
const FEATURE_KEY = "new-year-ai-consultation";
const FEATURE_COST = 300;
const FEATURE_AMOUNT_KRW = 30000;
const FEATURE_MEMBERSHIP_CREDIT_COST = 3000;
const FEATURE_REASON = "신년운세 AI 상담";

const defaultForm = (): ConsultationForm => ({
  name: "",
  gender: "",
  birthDate: "",
  birthTime: "",
  calendarType: "solar",
  year: String(new Date().getFullYear()),
  topic: "",
});

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `nyai-${crypto.randomUUID()}`;
  return `nyai-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function buildConsultationPayload(form: ConsultationForm) {
  return {
    year: Number(form.year),
    birthInfo: {
      name: form.name.trim(),
      gender: form.gender,
      birthDate: form.birthDate,
      birthTime: form.birthTime,
      calendarType: form.calendarType,
    },
    topic: form.topic.trim(),
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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function toText(value: unknown) {
  return String(value || "").trim();
}

function toNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function buildBillingGateInput(paymentPayload: Record<string, unknown>, idempotencyKey: string) {
  const runtimeGate = asRecord(paymentPayload.runtimeGate);
  return {
    categoryKey: toText(runtimeGate.categoryKey || paymentPayload.categoryKey) || "premium-consultation",
    subFeatureKey: toText(runtimeGate.subFeatureKey || paymentPayload.subFeatureKey) || FEATURE_KEY,
    featureKey: toText(runtimeGate.featureKey || paymentPayload.featureKey) || FEATURE_KEY,
    reason: toText(runtimeGate.reason || paymentPayload.reason) || FEATURE_REASON,
    productId: toText(runtimeGate.productId || paymentPayload.productId) || "new-year-ai",
    productType: toText(runtimeGate.productType || paymentPayload.productType) || "new-year-ai",
    serviceType: toText(runtimeGate.serviceType || paymentPayload.serviceType) || "new-year-ai",
    forceDeduct: true,
    requestId: idempotencyKey,
    idempotencyKey,
    cost: toNumber(runtimeGate.cost ?? paymentPayload.coinPrice, FEATURE_COST),
    coinPrice: toNumber(runtimeGate.coinPrice ?? paymentPayload.coinPrice, FEATURE_COST),
    amountKRW: toNumber(runtimeGate.amountKRW ?? paymentPayload.amountKRW, FEATURE_AMOUNT_KRW),
    membershipCreditCost: toNumber(runtimeGate.membershipCreditCost ?? paymentPayload.membershipCreditCost, FEATURE_MEMBERSHIP_CREDIT_COST),
  };
}

export default function NewYearAiConsultationPage() {
  const [form, setForm] = useState<ConsultationForm>(() => defaultForm());
  const [status, setStatus] = useState<FlowStatus>("idle");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [accessType, setAccessType] = useState<AccessType | "">("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [followUp, setFollowUp] = useState("");
  const [sending, setSending] = useState(false);
  const startLockRef = useRef(false);
  const idempotencyKeyRef = useRef(createIdempotencyKey());

  const statusText = useMemo(() => {
    if (status === "preparing") return "상담을 준비하고 있습니다";
    if (status === "payment") return "결제창을 확인해 주세요";
    if (status === "reading") return "올해의 흐름을 읽고 있습니다";
    if (status === "ready") return "상담이 이어지고 있습니다";
    return "달빛 아래 상담소가 열려 있습니다";
  }, [status]);

  const isBusy = status === "preparing" || status === "payment" || status === "reading";
  const canAskFollowUp = Boolean(sessionId && messages.length && !sending && !isBusy);

  const resetAttempt = useCallback(() => {
    if (isBusy) return;
    idempotencyKeyRef.current = createIdempotencyKey();
    setSessionId("");
    setAccessType("");
    setMessages([]);
    setError("");
    setNotice("");
    setStatus("idle");
  }, [isBusy]);

  const updateField = (field: keyof ConsultationForm) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    resetAttempt();
  };

  const startConsultation = useCallback(async (
    payload: ReturnType<typeof buildConsultationPayload>,
    idempotencyKey: string,
    access: { accessToken?: string; billingGate?: Record<string, unknown> },
  ) => {
    setStatus("reading");
    const { payload: result } = await postJson<ConsultationResult>("/api/new-year-ai/start", {
      ...payload,
      ...access,
    }, idempotencyKey);

    if (result.ok && Array.isArray(result.messages) && result.messages.length) {
      setSessionId(result.sessionId || "");
      setAccessType(result.accessType || "");
      setMessages(result.messages);
      setNotice("");
      setError("");
      setStatus("ready");
      return;
    }
    if (result.ok && result.status === "generating") {
      setNotice(result.message || "올해의 흐름을 읽고 있습니다");
      setStatus("reading");
      return;
    }
    if (result.reason === "PAYMENT_VERIFY_FAILED") throw new Error(PAYMENT_VERIFY_FAILED_MESSAGE);
    if (result.reason === "LLM_ERROR") throw new Error(LLM_ERROR_MESSAGE);
    throw new Error(result.message || SERVER_ERROR_MESSAGE);
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (startLockRef.current || isBusy) return;
    startLockRef.current = true;
    const idempotencyKey = idempotencyKeyRef.current;
    const payload = buildConsultationPayload(form);
    let paymentAttempted = false;
    setError("");
    setNotice("");
    setStatus("preparing");

    try {
      const { payload: access } = await postJson<EnsureAccessResult>("/api/new-year-ai/ensure-access", payload, idempotencyKey);
      if (access.ok) {
        await startConsultation(payload, idempotencyKey, { accessToken: access.accessToken });
        return;
      }
      const denied = access as Exclude<EnsureAccessResult, { ok: true }>;
      if (denied.reason === "LOGIN_REQUIRED") {
        throw new Error(LOGIN_REQUIRED_MESSAGE);
      }
      if (denied.reason === "PAYMENT_REQUIRED") {
        paymentAttempted = true;
        setNotice(PAYMENT_REQUIRED_MESSAGE);
        setStatus("payment");
        const paymentPayload = "paymentPayload" in denied ? denied.paymentPayload : {};
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
      throw new Error("message" in denied ? denied.message || SERVER_ERROR_MESSAGE : SERVER_ERROR_MESSAGE);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : SERVER_ERROR_MESSAGE;
      setError(
        message === LOGIN_REQUIRED_MESSAGE
          || message === PAYMENT_VERIFY_FAILED_MESSAGE
          || message === LLM_ERROR_MESSAGE
          ? message
          : paymentAttempted
            ? PAYMENT_VERIFY_FAILED_MESSAGE
          : message.includes("payment")
            ? PAYMENT_VERIFY_FAILED_MESSAGE
            : message || SERVER_ERROR_MESSAGE,
      );
      setStatus("error");
    } finally {
      startLockRef.current = false;
    }
  };

  const handleFollowUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = followUp.trim();
    if (!message || !sessionId || sending) return;
    setSending(true);
    setError("");
    try {
      const { payload } = await postJson<ConsultationResult>("/api/new-year-ai/message", { sessionId, message });
      if (!payload.ok || !Array.isArray(payload.messages)) throw new Error(payload.message || LLM_ERROR_MESSAGE);
      setMessages(payload.messages);
      setFollowUp("");
      setStatus("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : LLM_ERROR_MESSAGE);
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="nyai-page">
      <section className="nyai-panel nyai-intro" aria-label="신년운세 AI 상담">
        <div className="nyai-image-shell">
          <img src="/fuctionassets/신년운세.webp" alt="신년운세 AI 상담" />
        </div>
        <div className="nyai-intro-copy">
          <div className="nyai-kicker"><Moon size={16} /> 신년운세 AI 상담</div>
          <h1>달빛이 문을 열면, 올해의 흐름이 조용히 드러납니다.</h1>
          <p>생년월일과 상담 주제를 바탕으로 재물, 사랑, 일, 관계, 마음의 흐름을 한 자리에서 살펴봅니다.</p>
          <div className="nyai-status" data-status={status}>
            {isBusy && <Loader2 size={16} className="nyai-spin" />}
            {!isBusy && <Sparkles size={16} />}
            <span>{statusText}</span>
          </div>
          {accessType && <p className="nyai-access">이용 방식: {accessType}</p>}
        </div>
      </section>

      <section className="nyai-workspace">
        <form className="nyai-form nyai-panel" onSubmit={handleSubmit}>
          <div className="nyai-form-title">
            <CalendarDays size={18} />
            <h2>상담 정보</h2>
          </div>
          <div className="nyai-grid">
            <label>
              이름 또는 닉네임
              <input value={form.name} onChange={updateField("name")} placeholder="예: 하린" maxLength={80} />
            </label>
            <label>
              성별
              <select value={form.gender} onChange={updateField("gender")} required>
                <option value="">선택</option>
                <option value="female">여성</option>
                <option value="male">남성</option>
                <option value="other">기타</option>
              </select>
            </label>
            <label>
              생년월일
              <input type="date" value={form.birthDate} onChange={updateField("birthDate")} required />
            </label>
            <label>
              출생시간
              <input type="time" value={form.birthTime} onChange={updateField("birthTime")} />
            </label>
            <label>
              양력/음력
              <select value={form.calendarType} onChange={updateField("calendarType")} required>
                <option value="solar">양력</option>
                <option value="lunar">음력</option>
              </select>
            </label>
            <label>
              상담 연도
              <input type="number" value={form.year} min="1900" max="2100" onChange={updateField("year")} required />
            </label>
          </div>
          <label className="nyai-topic">
            상담 주제
            <textarea value={form.topic} onChange={updateField("topic")} placeholder="올해 일과 재물 흐름이 가장 궁금해요." minLength={2} maxLength={1000} required />
          </label>
          {notice && <p className="nyai-notice">{notice}</p>}
          {error && <p className="nyai-error">{error}</p>}
          <button className="nyai-primary" type="submit" disabled={isBusy}>
            {isBusy ? <Loader2 size={18} className="nyai-spin" /> : <WalletCards size={18} />}
            <span>{isBusy ? statusText : "신년운세 AI 상담 받기"}</span>
          </button>
        </form>

        <section className="nyai-chat nyai-panel" aria-live="polite">
          <div className="nyai-chat-head">
            <Sparkles size={18} />
            <h2>상담 카드</h2>
          </div>
          <div className="nyai-messages">
            {messages.length === 0 ? (
              <div className="nyai-empty">
                <p>운명의 문 앞에서 조용히 기다리고 있습니다.</p>
                <span>상담이 시작되면 올해의 흐름이 이곳에 펼쳐집니다.</span>
              </div>
            ) : messages.map((message, index) => (
              <article key={`${message.role}-${index}`} className={`nyai-message nyai-message--${message.role}`}>
                <span>{message.role === "assistant" ? "상담가" : "나"}</span>
                <p>{message.content}</p>
              </article>
            ))}
          </div>
          <form className="nyai-follow" onSubmit={handleFollowUp}>
            <textarea
              value={followUp}
              onChange={(event) => setFollowUp(event.target.value)}
              placeholder="더 깊게 보고 싶은 흐름을 물어보세요."
              disabled={!canAskFollowUp}
              maxLength={1200}
            />
            <button type="submit" disabled={!canAskFollowUp || !followUp.trim()}>
              {sending ? <Loader2 size={18} className="nyai-spin" /> : <Send size={18} />}
              <span>질문하기</span>
            </button>
          </form>
        </section>
      </section>

      <style jsx>{`
        .nyai-page {
          min-height: 100vh;
          padding: clamp(18px, 3vw, 42px);
          color: #f8f2de;
          background:
            linear-gradient(120deg, rgba(9, 13, 22, .96), rgba(31, 18, 34, .92) 48%, rgba(13, 38, 39, .94)),
            repeating-linear-gradient(90deg, rgba(255,255,255,.05) 0 1px, transparent 1px 84px);
          font-family: CodeDestinyBody, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .nyai-panel {
          border: 1px solid rgba(242, 212, 143, .22);
          border-radius: 8px;
          background: rgba(11, 15, 24, .76);
          box-shadow: 0 24px 70px rgba(0, 0, 0, .28);
          backdrop-filter: blur(18px);
        }

        .nyai-intro {
          display: grid;
          grid-template-columns: minmax(210px, 340px) minmax(0, 1fr);
          gap: clamp(18px, 4vw, 46px);
          align-items: center;
          max-width: 1180px;
          margin: 0 auto clamp(18px, 3vw, 30px);
          padding: clamp(16px, 3vw, 30px);
        }

        .nyai-image-shell {
          overflow: hidden;
          aspect-ratio: 1 / 1;
          border-radius: 8px;
          border: 1px solid rgba(249, 218, 146, .26);
          background: #10141e;
        }

        .nyai-image-shell img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .nyai-intro-copy h1 {
          max-width: 780px;
          margin: 14px 0 12px;
          font-family: CodeDestinyDisplay, CodeDestinyBody, serif;
          font-size: clamp(30px, 4.7vw, 64px);
          line-height: 1.08;
          letter-spacing: 0;
        }

        .nyai-intro-copy p {
          max-width: 680px;
          margin: 0;
          color: rgba(248, 242, 222, .78);
          font-size: 16px;
          line-height: 1.7;
        }

        .nyai-kicker,
        .nyai-status,
        .nyai-form-title,
        .nyai-chat-head {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .nyai-kicker {
          color: #f5d58d;
          font-weight: 700;
        }

        .nyai-status {
          margin-top: 18px;
          min-height: 34px;
          padding: 8px 10px;
          border-radius: 8px;
          background: rgba(245, 213, 141, .1);
          color: #ffe7a8;
          font-size: 14px;
        }

        .nyai-access {
          margin-top: 8px !important;
          font-size: 13px !important;
          color: rgba(178, 238, 222, .82) !important;
        }

        .nyai-workspace {
          display: grid;
          grid-template-columns: minmax(300px, 440px) minmax(0, 1fr);
          gap: clamp(16px, 3vw, 28px);
          max-width: 1180px;
          margin: 0 auto;
        }

        .nyai-form,
        .nyai-chat {
          padding: clamp(16px, 2.6vw, 24px);
        }

        .nyai-form-title,
        .nyai-chat-head {
          margin-bottom: 16px;
          color: #f5d58d;
        }

        .nyai-form-title h2,
        .nyai-chat-head h2 {
          margin: 0;
          font-size: 18px;
          letter-spacing: 0;
        }

        .nyai-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .nyai-form label {
          display: grid;
          gap: 7px;
          color: rgba(248, 242, 222, .76);
          font-size: 13px;
          font-weight: 700;
        }

        .nyai-form input,
        .nyai-form select,
        .nyai-form textarea,
        .nyai-follow textarea {
          width: 100%;
          border: 1px solid rgba(242, 212, 143, .22);
          border-radius: 8px;
          background: rgba(255, 255, 255, .08);
          color: #fff7df;
          font: inherit;
          outline: none;
        }

        .nyai-form input,
        .nyai-form select {
          min-height: 44px;
          padding: 0 12px;
        }

        .nyai-form select option {
          color: #141922;
        }

        .nyai-topic {
          margin-top: 12px;
        }

        .nyai-form textarea,
        .nyai-follow textarea {
          min-height: 118px;
          padding: 12px;
          resize: vertical;
          line-height: 1.6;
        }

        .nyai-notice,
        .nyai-error {
          margin: 14px 0 0;
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 14px;
          line-height: 1.55;
        }

        .nyai-notice {
          color: #ffe7a8;
          background: rgba(245, 213, 141, .1);
        }

        .nyai-error {
          color: #ffd8d8;
          background: rgba(164, 40, 57, .22);
        }

        .nyai-primary,
        .nyai-follow button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 46px;
          border: 0;
          border-radius: 8px;
          color: #17120a;
          background: #f5d58d;
          font-weight: 800;
          cursor: pointer;
        }

        .nyai-primary {
          width: 100%;
          margin-top: 16px;
        }

        .nyai-primary:disabled,
        .nyai-follow button:disabled,
        .nyai-follow textarea:disabled {
          cursor: not-allowed;
          opacity: .62;
        }

        .nyai-chat {
          min-height: 560px;
          display: flex;
          flex-direction: column;
        }

        .nyai-messages {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 12px;
          overflow: auto;
          padding-right: 4px;
        }

        .nyai-empty {
          display: grid;
          place-content: center;
          min-height: 330px;
          text-align: center;
          color: rgba(248, 242, 222, .72);
        }

        .nyai-empty p {
          margin: 0 0 8px;
          color: #f5d58d;
          font-size: 18px;
          font-weight: 800;
        }

        .nyai-empty span {
          font-size: 14px;
        }

        .nyai-message {
          max-width: min(720px, 94%);
          padding: 14px 15px;
          border-radius: 8px;
          white-space: pre-wrap;
          line-height: 1.72;
        }

        .nyai-message span {
          display: block;
          margin-bottom: 7px;
          color: #f5d58d;
          font-size: 12px;
          font-weight: 800;
        }

        .nyai-message p {
          margin: 0;
          color: #fff8e6;
        }

        .nyai-message--assistant {
          align-self: flex-start;
          background: rgba(245, 213, 141, .1);
          border: 1px solid rgba(245, 213, 141, .2);
        }

        .nyai-message--user {
          align-self: flex-end;
          background: rgba(76, 191, 168, .14);
          border: 1px solid rgba(76, 191, 168, .24);
        }

        .nyai-follow {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 118px;
          gap: 10px;
          margin-top: 16px;
        }

        .nyai-follow textarea {
          min-height: 64px;
        }

        .nyai-spin {
          animation: nyaiSpin 1s linear infinite;
        }

        @keyframes nyaiSpin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 860px) {
          .nyai-page {
            padding: 12px;
          }

          .nyai-intro,
          .nyai-workspace {
            grid-template-columns: 1fr;
          }

          .nyai-image-shell {
            max-height: 260px;
            aspect-ratio: 16 / 9;
          }

          .nyai-grid {
            grid-template-columns: 1fr;
          }

          .nyai-chat {
            min-height: 460px;
          }

          .nyai-follow {
            grid-template-columns: 1fr;
          }

          .nyai-follow button {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}
