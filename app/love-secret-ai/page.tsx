"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Heart, Loader2, Moon, Send, Sparkles, WalletCards } from "lucide-react";
import { useCallback, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { authFetch } from "@/app/_lib/auth-client";
import { runBillingCoinGate } from "@/app/_lib/billing-client";

type AccessType = "pass" | "paid" | "subscription" | "admin";
type CalendarType = "solar" | "lunar";
type GenderType = "male" | "female" | "other" | "";
type Phase = "idle" | "reading" | "payment" | "generating" | "ready" | "chat" | "error";

type PersonInfo = {
  name: string;
  gender: GenderType;
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  calendarType: CalendarType;
};

type ConsultationForm = {
  myInfo: PersonInfo;
  partnerInfo: PersonInfo;
  relationshipStatus: string;
  topic: string;
  userQuestion: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};

type BillingPaymentPayload = {
  storeId: string;
  channelKey: string;
  paymentId?: string;
  merchantUid?: string;
  orderName: string;
  totalAmount?: number;
  paymentAmount?: number;
  amountKRW?: number;
  coinPrice?: number;
  membershipCreditCost?: number;
  currency?: string;
  payMethod?: string;
  customer?: Record<string, unknown>;
  customData?: Record<string, unknown>;
  noticeUrl?: string;
  noticeUrls?: string[];
  runtimeGate?: Record<string, unknown>;
};

type EnsureAccessResult =
  | { ok: true; accessToken: string; accessType: AccessType }
  | { ok: false; reason: "PAYMENT_REQUIRED"; paymentPayload: BillingPaymentPayload }
  | { ok: false; reason: "LOGIN_REQUIRED"; message?: string }
  | { ok: false; reason: "INVALID_INPUT"; message: string }
  | { ok: false; reason?: string; message?: string };

type ConsultationResult = {
  ok: boolean;
  sessionId?: string;
  accessType?: AccessType;
  status?: string;
  keywords?: string[];
  strategy?: string;
  messages?: ChatMessage[];
  reason?: string;
  message?: string;
};

const RELATIONSHIP_STATUSES = [
  "짝사랑",
  "썸",
  "연애 중",
  "장기 연애",
  "이별 직후",
  "재회 고민",
  "연락이 끊긴 상태",
  "결혼 고민",
  "부부 관계",
  "관계 정리 고민",
  "상대방 마음이 궁금한 상태",
];

const TOPICS = [
  "전체 연애 흐름",
  "상대방 마음",
  "연락 타이밍",
  "고백 타이밍",
  "재회 가능성",
  "관계 회복 전략",
  "장기 연애 유지법",
  "결혼 가능성",
  "갈등 원인",
  "나의 연애 패턴",
  "상대방과의 궁합",
  "지금 밀어야 할지 기다려야 할지",
  "이 관계를 계속해도 되는지",
];

const LOGIN_REQUIRED_MESSAGE = "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.";
const PAYMENT_REQUIRED_MESSAGE = "연애 비책 AI 상담 이용권이 필요합니다. 결제창을 열어드릴게요.";
const PAYMENT_VERIFY_FAILED_MESSAGE = "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.";
const INVALID_INPUT_MESSAGE = "생년월일과 연애 상담 정보를 다시 확인해 주세요.";
const SERVER_ERROR_MESSAGE = "상담을 준비하는 중 문제가 발생했습니다. 결제 금액은 차감되지 않았습니다.";
const LLM_ERROR_MESSAGE = "AI 상담 답변을 생성하지 못했습니다. 이용권 또는 결제 권한은 보존되었으니 다시 시도해 주세요.";

const emptyPerson = (): PersonInfo => ({
  name: "",
  gender: "",
  birthDate: "",
  birthTime: "",
  birthTimeUnknown: false,
  calendarType: "solar",
});

const defaultForm = (): ConsultationForm => ({
  myInfo: emptyPerson(),
  partnerInfo: emptyPerson(),
  relationshipStatus: "썸",
  topic: "전체 연애 흐름",
  userQuestion: "",
});

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return `lsai-${crypto.randomUUID()}`;
  return `lsai-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function hasPartnerInfo(partner: PersonInfo) {
  return Boolean(partner.name.trim() || partner.gender || partner.birthDate || partner.birthTime);
}

function buildPayload(form: ConsultationForm) {
  return {
    myInfo: {
      ...form.myInfo,
      name: form.myInfo.name.trim(),
      birthTime: form.myInfo.birthTimeUnknown ? "" : form.myInfo.birthTime,
    },
    partnerInfo: hasPartnerInfo(form.partnerInfo)
      ? {
        ...form.partnerInfo,
        name: form.partnerInfo.name.trim(),
        birthTime: form.partnerInfo.birthTimeUnknown ? "" : form.partnerInfo.birthTime,
      }
      : undefined,
    relationshipStatus: form.relationshipStatus,
    topic: form.topic,
    userQuestion: form.userQuestion.trim(),
  };
}

async function postJson<T>(path: string, body: Record<string, unknown>, idempotencyKey?: string): Promise<{ response: Response; payload: T }> {
  const response = await authFetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
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

function isPaymentRequiredResult(result: EnsureAccessResult): result is Extract<EnsureAccessResult, { reason: "PAYMENT_REQUIRED" }> {
  return !result.ok && result.reason === "PAYMENT_REQUIRED" && "paymentPayload" in result;
}

function toNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function runtimePayload(result: unknown) {
  const record = asRecord(result);
  const payload = asRecord(record.payload);
  const data = asRecord(record.data);
  return Object.keys(payload).length ? payload : (Object.keys(data).length ? data : record);
}

function isPaymentGranted(result: unknown) {
  const record = asRecord(result);
  const payload = runtimePayload(result);
  const status = toText(record.status || payload.status || payload.paymentStatus).toLowerCase();
  const denied = new Set(["error", "failed", "failure", "payment_required", "cancelled", "canceled"]);
  if (record.ok === false || payload.ok === false || denied.has(status)) return false;
  if (["granted", "paid", "success", "succeeded", "confirmed", "complete", "completed", "approved"].includes(status)) return true;
  return Boolean(
    record.transactionId
    || record.paymentId
    || record.purchaseId
    || payload.transactionId
    || payload.paymentId
    || payload.purchaseId
    || Object.keys(asRecord(payload.accessGrant)).length
    || Object.keys(asRecord(payload.consume)).length,
  );
}

function extractPayment(result: unknown, fallbackRequestId: string) {
  const record = asRecord(result);
  const payload = runtimePayload(result);
  const payment = asRecord(payload.payment);
  const accessGrant = asRecord(payload.accessGrant);
  const consume = asRecord(payload.consume);
  const transactionId = toText(record.transactionId || payload.transactionId || accessGrant.transactionId || consume.transactionId);
  const purchaseId = toText(record.purchaseId || payload.purchaseId || accessGrant.purchaseId || consume.purchaseId);
  const ledgerId = toText(record.ledgerId || payload.ledgerId || accessGrant.ledgerId || consume.ledgerId);
  const paymentId = toText(
    record.paymentId
    || transactionId
    || purchaseId
    || payload.paymentId
    || payment.paymentId
    || payment.impUid
    || payment.merchantUid
    || accessGrant.paymentId
    || ledgerId
    || fallbackRequestId,
  );
  return {
    paymentId,
    transactionId,
    purchaseId,
    ledgerId,
    requestId: fallbackRequestId,
    payment: { ...payment, paymentId, requestId: fallbackRequestId },
    accessGrant,
    consume,
  };
}

async function runLoveSecretPaymentGate(paymentPayload: BillingPaymentPayload, idempotencyKey: string) {
  const runtimeGate = asRecord(paymentPayload.runtimeGate);
  const gateResult = await runBillingCoinGate({
    categoryKey: toText(runtimeGate.categoryKey) || "premium-consultation",
    subFeatureKey: "love-secret-ai-consultation",
    featureKey: "love-secret-ai-consultation",
    reason: toText(runtimeGate.reason || paymentPayload.orderName) || "연애 비책 AI 상담",
    forceDeduct: true,
    requestId: idempotencyKey,
    idempotencyKey,
    cost: toNumber(runtimeGate.cost ?? runtimeGate.coinPrice, 300),
    coinPrice: toNumber(runtimeGate.coinPrice ?? runtimeGate.cost, 300),
    amountKRW: toNumber(runtimeGate.amountKRW ?? paymentPayload.amountKRW ?? paymentPayload.paymentAmount, 30000),
    membershipCreditCost: toNumber(runtimeGate.membershipCreditCost, 3000),
    productId: toText(runtimeGate.productId) || "love-secret-ai",
    productType: toText(runtimeGate.productType) || "love-secret-ai",
    serviceType: toText(runtimeGate.serviceType) || "love-secret-ai",
  });
  if (!isPaymentGranted(gateResult)) throw new Error(PAYMENT_VERIFY_FAILED_MESSAGE);
  return extractPayment(gateResult, idempotencyKey);
}

export default function LoveSecretAiPage() {
  const [form, setForm] = useState<ConsultationForm>(() => defaultForm());
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [accessType, setAccessType] = useState<AccessType | "">("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [strategy, setStrategy] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [followUp, setFollowUp] = useState("");
  const startLockRef = useRef(false);
  const idempotencyKeyRef = useRef(createIdempotencyKey());

  const busy = phase === "reading" || phase === "payment" || phase === "generating";
  const chatBusy = phase === "chat";
  const canAskFollowUp = Boolean(sessionId && messages.length && !busy && !chatBusy);

  const phaseText = useMemo(() => {
    if (phase === "reading") return "당신의 연애 흐름을 읽고 있습니다";
    if (phase === "payment") return "결제창을 확인해 주세요";
    if (phase === "generating") return "연애 비책 상담을 준비하고 있습니다";
    if (phase === "chat") return "상담을 이어가고 있습니다";
    return "";
  }, [phase]);

  const resetAttempt = useCallback(() => {
    if (busy || chatBusy) return;
    idempotencyKeyRef.current = createIdempotencyKey();
    setSessionId("");
    setAccessType("");
    setKeywords([]);
    setStrategy("");
    setMessages([]);
    setNotice("");
    setError("");
    setPhase("idle");
  }, [busy, chatBusy]);

  const updatePerson = (target: "myInfo" | "partnerInfo", field: keyof PersonInfo) => (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const value = field === "birthTimeUnknown" && event.target instanceof HTMLInputElement
      ? event.target.checked
      : event.target.value;
    setForm((current) => ({
      ...current,
      [target]: {
        ...current[target],
        [field]: value,
        ...(field === "birthTimeUnknown" && value === true ? { birthTime: "" } : {}),
      },
    }));
    resetAttempt();
  };

  const updateField = (field: "relationshipStatus" | "topic" | "userQuestion") => (
    event: ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    resetAttempt();
  };

  function validateCurrentStep() {
    if (step === 0) return Boolean(form.myInfo.gender && form.myInfo.birthDate && form.myInfo.calendarType);
    if (step === 1) return true;
    return Boolean(form.relationshipStatus && form.topic);
  }

  async function startConsultation(
    payload: ReturnType<typeof buildPayload>,
    idempotencyKey: string,
    access: Record<string, unknown>,
  ) {
    setPhase("generating");
    const { payload: result } = await postJson<ConsultationResult>("/api/love-secret-ai/start", {
      ...payload,
      ...access,
    }, idempotencyKey);

    if (result.ok && Array.isArray(result.messages) && result.messages.length) {
      setSessionId(result.sessionId || "");
      setAccessType(result.accessType || "");
      setKeywords(Array.isArray(result.keywords) ? result.keywords.slice(0, 3) : []);
      setStrategy(result.strategy || "");
      setMessages(result.messages);
      setNotice("");
      setError("");
      setPhase("ready");
      return;
    }
    if (result.ok && result.status === "generating") {
      setNotice(result.message || "연애 비책 상담을 준비하고 있습니다");
      setPhase("generating");
      return;
    }
    if (result.reason === "PAYMENT_VERIFY_FAILED") throw new Error(PAYMENT_VERIFY_FAILED_MESSAGE);
    if (result.reason === "LLM_ERROR") throw new Error(LLM_ERROR_MESSAGE);
    throw new Error(result.message || SERVER_ERROR_MESSAGE);
  }

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (startLockRef.current || busy || chatBusy) return;
    if (!form.myInfo.gender || !form.myInfo.birthDate || !form.relationshipStatus || !form.topic) {
      setError(INVALID_INPUT_MESSAGE);
      return;
    }
    startLockRef.current = true;
    const idempotencyKey = idempotencyKeyRef.current;
    const payload = buildPayload(form);
    setError("");
    setNotice("");
    setPhase("reading");

    try {
      const { payload: access } = await postJson<EnsureAccessResult>("/api/love-secret-ai/ensure-access", payload, idempotencyKey);
      if (access.ok) {
        await startConsultation(payload, idempotencyKey, { accessToken: access.accessToken });
        return;
      }
      if (access.reason === "LOGIN_REQUIRED") throw new Error(LOGIN_REQUIRED_MESSAGE);
      if (access.reason === "INVALID_INPUT") throw new Error(access.message || INVALID_INPUT_MESSAGE);
      if (isPaymentRequiredResult(access)) {
        setNotice(PAYMENT_REQUIRED_MESSAGE);
        setPhase("payment");
        const payment = await runLoveSecretPaymentGate(access.paymentPayload, idempotencyKey);
        await startConsultation(payload, idempotencyKey, payment);
        return;
      }
      throw new Error(("message" in access && access.message) || SERVER_ERROR_MESSAGE);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : SERVER_ERROR_MESSAGE;
      setError(message || SERVER_ERROR_MESSAGE);
      setPhase("error");
    } finally {
      startLockRef.current = false;
    }
  }

  async function handleFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = followUp.trim();
    if (!message || !sessionId || chatBusy) return;
    setPhase("chat");
    setError("");
    try {
      const { payload } = await postJson<ConsultationResult>("/api/love-secret-ai/message", { sessionId, message });
      if (!payload.ok || !Array.isArray(payload.messages)) throw new Error(payload.message || LLM_ERROR_MESSAGE);
      setMessages(payload.messages);
      setFollowUp("");
      setPhase("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : LLM_ERROR_MESSAGE);
      setPhase("ready");
    }
  }

  const renderPersonFields = (target: "myInfo" | "partnerInfo", label: string, required: boolean) => {
    const value = form[target];
    return (
      <div className="lsai-grid">
        <label>
          <span>{label} 이름 또는 닉네임{required ? "" : " · 선택"}</span>
          <input value={value.name} onChange={updatePerson(target, "name")} maxLength={80} disabled={busy} />
        </label>
        <label>
          <span>{label} 성별{required ? "" : " · 선택"}</span>
          <select value={value.gender} onChange={updatePerson(target, "gender")} required={required} disabled={busy}>
            <option value="">선택</option>
            <option value="female">여성</option>
            <option value="male">남성</option>
            <option value="other">기타</option>
          </select>
        </label>
        <label>
          <span>{label} 생년월일{required ? "" : " · 선택"}</span>
          <input type="date" value={value.birthDate} onChange={updatePerson(target, "birthDate")} required={required} disabled={busy} />
        </label>
        <label>
          <span>{label} 출생시간{required ? " · 선택" : " · 선택"}</span>
          <input type="time" value={value.birthTime} onChange={updatePerson(target, "birthTime")} disabled={busy || value.birthTimeUnknown} />
        </label>
        <label className="lsai-check">
          <input type="checkbox" checked={value.birthTimeUnknown} onChange={updatePerson(target, "birthTimeUnknown")} disabled={busy} />
          <span>출생시간 모름</span>
        </label>
        <label>
          <span>{label} 양력/음력</span>
          <select value={value.calendarType} onChange={updatePerson(target, "calendarType")} disabled={busy}>
            <option value="solar">양력</option>
            <option value="lunar">음력</option>
          </select>
        </label>
      </div>
    );
  };

  return (
    <main className="lsai-page" data-cd-marker="love-secret-ai-page-v20260627">
      <section className="lsai-hero">
        <div className="lsai-visual">
          <img src="/fuctionassets/lovebible.webp" alt="연애 비책 AI 상담" />
        </div>
        <div className="lsai-copy">
          <p className="lsai-kicker"><Moon size={16} /> Moonlight Love Consultation</p>
          <h1>연애 비책 AI 상담</h1>
          <p>생년월일과 지금의 관계 흐름을 바탕으로, 마음을 잃지 않으면서 현실적으로 움직일 수 있는 연애 전략을 함께 읽습니다.</p>
          <div className="lsai-status" data-phase={phase}>
            {(busy || chatBusy) ? <Loader2 size={16} className="lsai-spin" /> : <Sparkles size={16} />}
            <span>{phaseText || "달빛 아래 조용히 상담을 열어두었습니다"}</span>
          </div>
        </div>
      </section>

      <section className="lsai-shell">
        <form className="lsai-form" onSubmit={handleSubmit}>
          <div className="lsai-steps">
            {["내 정보", "상대방 정보", "상담 주제"].map((item, index) => (
              <button key={item} type="button" className={step === index ? "active" : ""} onClick={() => setStep(index)} disabled={busy}>
                <span>{index + 1}</span>{item}
              </button>
            ))}
          </div>

          <div className="lsai-panel">
            <div className="lsai-title"><CalendarDays size={18} /><h2>{step === 0 ? "내 정보" : step === 1 ? "상대방 정보" : "연애 상담 정보"}</h2></div>
            {step === 0 && renderPersonFields("myInfo", "내", true)}
            {step === 1 && renderPersonFields("partnerInfo", "상대방", false)}
            {step === 2 && (
              <div className="lsai-final">
                <label>
                  <span>현재 관계 상태</span>
                  <select value={form.relationshipStatus} onChange={updateField("relationshipStatus")} disabled={busy}>
                    {RELATIONSHIP_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label>
                  <span>상담 주제</span>
                  <select value={form.topic} onChange={updateField("topic")} disabled={busy}>
                    {TOPICS.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label>
                  <span>현재 가장 궁금한 질문</span>
                  <textarea value={form.userQuestion} onChange={updateField("userQuestion")} maxLength={1200} disabled={busy} placeholder="지금 이 관계에서 가장 알고 싶은 마음과 상황을 적어 주세요." />
                </label>
              </div>
            )}
          </div>

          {(notice || error) && <p className={error ? "lsai-error" : "lsai-notice"}>{error || notice}</p>}

          <div className="lsai-actions">
            <button type="button" className="lsai-secondary" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={busy || step === 0} aria-label="이전 단계">
              <ChevronLeft size={18} />
            </button>
            {step < 2 ? (
              <button type="button" className="lsai-primary" onClick={() => validateCurrentStep() ? setStep((current) => Math.min(2, current + 1)) : setError(INVALID_INPUT_MESSAGE)} disabled={busy}>
                다음 <ChevronRight size={18} />
              </button>
            ) : (
              <button type="submit" className="lsai-primary" disabled={busy}>
                {busy ? <Loader2 size={18} className="lsai-spin" /> : <WalletCards size={18} />}
                <span>{busy ? phaseText : "연애 비책 AI 상담 받기"}</span>
              </button>
            )}
          </div>
        </form>

        <section className="lsai-result" aria-live="polite">
          {messages.length > 0 ? (
            <>
              <div className="lsai-summary">
                <article>
                  <span>이 관계의 핵심 키워드 3개</span>
                  <div>{keywords.map((item) => <b key={item}>{item}</b>)}</div>
                </article>
                <article>
                  <span>지금의 연애 전략</span>
                  <p>{strategy || "상담 답변 안에서 지금 필요한 속도와 거리감을 함께 짚었습니다."}</p>
                </article>
              </div>
              <div className="lsai-chat">
                {messages.map((message, index) => (
                  <article key={`${message.role}-${index}`} className={message.role === "assistant" ? "assistant" : "user"}>
                    <span>{message.role === "assistant" ? "상담가" : "나"}</span>
                    <p>{message.content}</p>
                  </article>
                ))}
              </div>
              <form className="lsai-follow" onSubmit={handleFollowUp}>
                <textarea value={followUp} onChange={(event) => setFollowUp(event.target.value)} maxLength={1200} disabled={!canAskFollowUp} placeholder="조금 더 묻고 싶은 상황을 이어서 적어 주세요." />
                <button type="submit" disabled={!canAskFollowUp || !followUp.trim()}>
                  {chatBusy ? <Loader2 size={18} className="lsai-spin" /> : <Send size={18} />}
                </button>
              </form>
            </>
          ) : (
            <div className="lsai-empty">
              <Heart size={34} />
              <h2>상담 카드가 이곳에 열립니다</h2>
              <p>내 정보만으로도 연애 패턴을 볼 수 있고, 상대방 생년월일을 넣으면 두 사람의 관계 흐름까지 함께 읽습니다.</p>
            </div>
          )}
        </section>
      </section>

      <style jsx>{`
        .lsai-page {
          min-height: 100vh;
          padding: clamp(14px, 3vw, 38px);
          color: #fff7ed;
          background:
            linear-gradient(135deg, rgba(24, 6, 24, .94), rgba(79, 18, 42, .9) 48%, rgba(32, 20, 45, .96)),
            radial-gradient(circle at 22% 16%, rgba(244, 114, 182, .18), transparent 32%),
            radial-gradient(circle at 82% 12%, rgba(250, 204, 21, .11), transparent 28%);
          font-family: CodeDestinyBody, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .lsai-hero,
        .lsai-shell {
          max-width: 1180px;
          margin: 0 auto;
        }
        .lsai-hero {
          display: grid;
          grid-template-columns: minmax(220px, 330px) minmax(0, 1fr);
          gap: clamp(18px, 4vw, 44px);
          align-items: center;
          margin-bottom: 22px;
        }
        .lsai-visual {
          aspect-ratio: 1 / 1;
          overflow: hidden;
          border: 1px solid rgba(253, 186, 116, .32);
          border-radius: 8px;
          box-shadow: 0 24px 76px rgba(0,0,0,.38);
        }
        .lsai-visual img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .lsai-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin: 0;
          color: #fed7aa;
          font-weight: 800;
        }
        .lsai-copy h1 {
          margin: 12px 0;
          font-family: CodeDestinyDisplay, CodeDestinyBody, serif;
          font-size: clamp(36px, 5.8vw, 76px);
          line-height: 1.02;
          letter-spacing: 0;
        }
        .lsai-copy p:not(.lsai-kicker) {
          max-width: 690px;
          margin: 0;
          color: rgba(255, 247, 237, .78);
          line-height: 1.75;
        }
        .lsai-status {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 36px;
          margin-top: 18px;
          padding: 8px 12px;
          border: 1px solid rgba(253, 186, 116, .22);
          border-radius: 8px;
          background: rgba(255,255,255,.08);
          color: #ffedd5;
          font-size: 14px;
        }
        .lsai-shell {
          display: grid;
          grid-template-columns: minmax(320px, 440px) minmax(0, 1fr);
          gap: 18px;
        }
        .lsai-panel,
        .lsai-result {
          border: 1px solid rgba(253, 186, 116, .2);
          border-radius: 8px;
          background: rgba(24, 9, 28, .72);
          box-shadow: 0 20px 70px rgba(0,0,0,.26);
          backdrop-filter: blur(18px);
        }
        .lsai-panel {
          padding: 18px;
        }
        .lsai-steps {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin-bottom: 12px;
        }
        .lsai-steps button,
        .lsai-secondary,
        .lsai-primary,
        .lsai-follow button {
          border: 0;
          border-radius: 8px;
          font: inherit;
          cursor: pointer;
        }
        .lsai-steps button {
          min-height: 42px;
          background: rgba(255,255,255,.08);
          color: rgba(255,247,237,.72);
          font-size: 13px;
          font-weight: 800;
        }
        .lsai-steps button span {
          margin-right: 6px;
          color: #fdba74;
        }
        .lsai-steps button.active {
          background: rgba(244, 114, 182, .24);
          color: #fff7ed;
        }
        .lsai-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
          color: #fed7aa;
        }
        .lsai-title h2 {
          margin: 0;
          font-size: 18px;
          letter-spacing: 0;
        }
        .lsai-grid,
        .lsai-final {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .lsai-final label:last-child {
          grid-column: 1 / -1;
        }
        label {
          display: grid;
          gap: 7px;
          color: rgba(255,247,237,.78);
          font-size: 13px;
          font-weight: 800;
        }
        input,
        select,
        textarea {
          width: 100%;
          border: 1px solid rgba(253, 186, 116, .22);
          border-radius: 8px;
          background: rgba(255,255,255,.09);
          color: #fff7ed;
          font: inherit;
          outline: 0;
        }
        input,
        select {
          min-height: 44px;
          padding: 0 12px;
        }
        select option {
          color: #23101c;
        }
        textarea {
          min-height: 130px;
          padding: 12px;
          resize: vertical;
          line-height: 1.65;
        }
        .lsai-check {
          display: flex;
          align-items: center;
          gap: 9px;
          min-height: 44px;
          padding: 0 2px;
        }
        .lsai-check input {
          width: 18px;
          min-height: 18px;
        }
        .lsai-actions {
          display: grid;
          grid-template-columns: 52px minmax(0, 1fr);
          gap: 10px;
          margin-top: 12px;
        }
        .lsai-secondary,
        .lsai-primary,
        .lsai-follow button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 48px;
          font-weight: 900;
        }
        .lsai-secondary {
          background: rgba(255,255,255,.1);
          color: #fff7ed;
        }
        .lsai-primary,
        .lsai-follow button {
          background: linear-gradient(90deg, #fb7185, #f9a8d4, #fdba74);
          color: #2b0c16;
        }
        button:disabled,
        input:disabled,
        select:disabled,
        textarea:disabled {
          opacity: .58;
          cursor: not-allowed;
        }
        .lsai-notice,
        .lsai-error {
          margin: 12px 0 0;
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 14px;
          line-height: 1.55;
        }
        .lsai-notice {
          background: rgba(253, 186, 116, .13);
          color: #ffedd5;
        }
        .lsai-error {
          background: rgba(190, 18, 60, .22);
          color: #ffe4e6;
        }
        .lsai-result {
          min-height: 620px;
          padding: 18px;
          display: flex;
          flex-direction: column;
        }
        .lsai-empty {
          display: grid;
          place-content: center;
          min-height: 520px;
          text-align: center;
          color: rgba(255,247,237,.72);
        }
        .lsai-empty svg {
          margin: 0 auto 12px;
          color: #f9a8d4;
        }
        .lsai-empty h2 {
          margin: 0 0 8px;
          color: #ffedd5;
          font-size: 22px;
        }
        .lsai-empty p {
          max-width: 430px;
          margin: 0 auto;
          line-height: 1.7;
        }
        .lsai-summary {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 12px;
          margin-bottom: 14px;
        }
        .lsai-summary article {
          border: 1px solid rgba(253, 186, 116, .2);
          border-radius: 8px;
          background: rgba(255,255,255,.07);
          padding: 13px;
        }
        .lsai-summary span {
          display: block;
          margin-bottom: 8px;
          color: #fed7aa;
          font-size: 12px;
          font-weight: 900;
        }
        .lsai-summary div {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .lsai-summary b {
          border-radius: 999px;
          background: rgba(244, 114, 182, .22);
          padding: 6px 9px;
          color: #fff7ed;
          font-size: 13px;
        }
        .lsai-summary p {
          margin: 0;
          line-height: 1.65;
        }
        .lsai-chat {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 12px;
          overflow: auto;
          padding-right: 4px;
        }
        .lsai-chat article {
          max-width: min(760px, 94%);
          border-radius: 8px;
          padding: 14px;
          white-space: pre-wrap;
          line-height: 1.76;
        }
        .lsai-chat article span {
          display: block;
          margin-bottom: 7px;
          color: #fed7aa;
          font-size: 12px;
          font-weight: 900;
        }
        .lsai-chat article p {
          margin: 0;
        }
        .lsai-chat .assistant {
          align-self: flex-start;
          border: 1px solid rgba(253, 186, 116, .2);
          background: rgba(255,255,255,.08);
        }
        .lsai-chat .user {
          align-self: flex-end;
          border: 1px solid rgba(244, 114, 182, .24);
          background: rgba(244, 114, 182, .16);
        }
        .lsai-follow {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 54px;
          gap: 10px;
          margin-top: 14px;
        }
        .lsai-follow textarea {
          min-height: 66px;
        }
        .lsai-spin {
          animation: lsaiSpin 1s linear infinite;
        }
        @keyframes lsaiSpin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 900px) {
          .lsai-page {
            padding: 12px;
          }
          .lsai-hero,
          .lsai-shell,
          .lsai-summary {
            grid-template-columns: 1fr;
          }
          .lsai-visual {
            aspect-ratio: 16 / 9;
            max-height: 270px;
          }
          .lsai-grid,
          .lsai-final {
            grid-template-columns: 1fr;
          }
          .lsai-result {
            min-height: 500px;
          }
          .lsai-empty {
            min-height: 340px;
          }
        }
        @media (max-width: 520px) {
          .lsai-steps {
            grid-template-columns: 1fr;
          }
          .lsai-copy h1 {
            font-size: 36px;
          }
          .lsai-actions {
            grid-template-columns: 44px minmax(0, 1fr);
          }
        }
      `}</style>
    </main>
  );
}
