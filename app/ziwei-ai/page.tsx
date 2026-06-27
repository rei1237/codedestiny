"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { Loader2, MessageCircle, Moon, Send, Sparkles, Stars, WalletCards } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import { runBillingCoinGate } from "@/app/_lib/billing-client";

type AccessType = "pass" | "paid" | "subscription" | "admin";
type CalendarType = "solar" | "lunar";
type Gender = "female" | "male" | "unknown" | "";
type FocusArea = "overall" | "love" | "money" | "career" | "health" | "relationship" | "personality" | "custom";
type Phase = "idle" | "checking" | "payment" | "reading" | "ready" | "chat";

type BirthInfo = {
  name?: string;
  gender: string;
  birthDate: string;
  birthTime?: string;
  birthTimeUnknown?: boolean;
  calendarType: CalendarType;
  isLeapMonth?: boolean;
};

type ZiweiPalace = {
  name: string;
  earthlyBranch?: string;
  mainStars?: string[];
  assistantStars?: string[];
  maleficStars?: string[];
  transformations?: string[];
  brightness?: Record<string, string>;
};

type ZiweiChart = {
  lifePalace?: string;
  bodyPalace?: string;
  palaces?: ZiweiPalace[];
  fourTransformations?: {
    huaLu?: string;
    huaQuan?: string;
    huaKe?: string;
    huaJi?: string;
  };
};

type ConsultationMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};

type Consultation = {
  id: string;
  status?: string;
  accessType?: AccessType;
  birthInfo?: BirthInfo;
  topic?: string;
  userQuestion?: string;
  summaryCards?: {
    lifePalace?: string;
    bodyPalace?: string;
    keyStars?: string[];
    keywords?: string[];
  };
  ziweiChart?: ZiweiChart;
  messages?: ConsultationMessage[];
};

type ApiResult = {
  ok?: boolean;
  reason?: string;
  message?: string;
  accessToken?: string;
  accessType?: AccessType;
  sessionId?: string;
  status?: string;
  consultation?: Consultation;
  paymentPayload?: Record<string, unknown>;
};

type FormState = {
  name: string;
  gender: Gender;
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  calendarType: CalendarType;
  isLeapMonth: boolean;
  focusArea: FocusArea;
  question: string;
};

const FEATURE_KEY = "ziwei-ai-consultation";
const FEATURE_REASON = "자미두수 AI 상담";
const FEATURE_COST = 300;
const FEATURE_AMOUNT_KRW = 30000;
const FEATURE_MEMBERSHIP_CREDIT_COST = 3000;

const ERROR_TEXT: Record<string, string> = {
  LOGIN_REQUIRED: "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.",
  PAYMENT_REQUIRED: "이용권 또는 결제가 필요한 상담입니다. 결제 정보를 확인해 주세요.",
  PAYMENT_VERIFY_FAILED: "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.",
  INVALID_INPUT: "자미두수 상담에 필요한 정보가 부족해요. 생년월일, 성별, 출생시간 정보를 다시 확인해 주세요.",
  BIRTH_TIME_MISSING: "자미두수는 출생시간이 중요해요. 출생시간을 입력하거나 ‘출생시간 모름’을 선택해 주세요.",
  CUSTOM_QUESTION_REQUIRED: "별궁에 묻고 싶은 질문을 조금 더 구체적으로 적어 주세요.",
  CALCULATION_FAILED: "자미두수 명반 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.",
  SERVER_ERROR: "자미두수 상담을 준비하는 중 문제가 발생했어요. 결제나 이용권은 차감되지 않았습니다.",
  LLM_ERROR: "AI 상담문을 생성하는 중 문제가 발생했어요. 차감된 내역이 있다면 자동으로 복구됩니다.",
  NETWORK_ERROR: "연결이 불안정해요. 잠시 후 다시 시도해 주세요.",
};

const FOCUS_OPTIONS: Array<{ value: FocusArea; label: string }> = [
  { value: "overall", label: "전체 명반 해석" },
  { value: "personality", label: "타고난 성향" },
  { value: "career", label: "직업/사업운" },
  { value: "money", label: "재물운" },
  { value: "love", label: "연애/결혼운" },
  { value: "relationship", label: "인간관계" },
  { value: "health", label: "건강/멘탈" },
  { value: "custom", label: "현재 고민 상담" },
];

const FOCUS_TOPIC: Record<FocusArea, string> = FOCUS_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {} as Record<FocusArea, string>);

const defaultForm: FormState = {
  name: "",
  gender: "",
  birthDate: "",
  birthTime: "",
  birthTimeUnknown: false,
  calendarType: "solar",
  isLeapMonth: false,
  focusArea: "overall",
  question: "",
};

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `zwai-${crypto.randomUUID()}`;
  return `zwai-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

async function postJson<T>(url: string, body: Record<string, unknown>, idempotencyKey?: string): Promise<{ status: number; data: T }> {
  const response = await authFetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    credentials: "include",
    body: JSON.stringify(body),
  }, { retryOn401: true });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data: data as T };
}

function toText(value: unknown) {
  return String(value || "").trim();
}

function toNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function buildConsultationPayload(form: FormState, requestId: string) {
  const topic = FOCUS_TOPIC[form.focusArea] || FOCUS_TOPIC.overall;
  return {
    serviceType: FEATURE_KEY,
    consultationType: "ziwei",
    userName: form.name.trim() || undefined,
    gender: form.gender,
    birthDate: form.birthDate,
    birthTime: form.birthTimeUnknown ? "" : form.birthTime,
    birthTimeUnknown: form.birthTimeUnknown,
    calendarType: form.calendarType,
    isLeapMonth: form.calendarType === "lunar" ? form.isLeapMonth : false,
    focusArea: form.focusArea,
    question: form.question.trim(),
    locale: "ko",
    requestId,
    idempotencyKey: requestId,
    birthInfo: {
      name: form.name.trim(),
      gender: form.gender,
      birthDate: form.birthDate,
      birthTime: form.birthTimeUnknown ? "" : form.birthTime,
      birthTimeUnknown: form.birthTimeUnknown,
      calendarType: form.calendarType,
      isLeapMonth: form.calendarType === "lunar" ? form.isLeapMonth : false,
    },
    topic,
    userQuestion: form.question.trim(),
  };
}

function validateForm(form: FormState) {
  if (!form.birthDate || !form.gender || !form.calendarType) return ERROR_TEXT.INVALID_INPUT;
  if (!form.birthTimeUnknown && !form.birthTime) return ERROR_TEXT.BIRTH_TIME_MISSING;
  if (form.focusArea === "custom" && form.question.trim().length < 2) return ERROR_TEXT.CUSTOM_QUESTION_REQUIRED;
  return "";
}

function mapError(result: ApiResult, status = 0) {
  const reason = String(result?.reason || "").toUpperCase();
  if (reason && ERROR_TEXT[reason]) return ERROR_TEXT[reason];
  if (status === 401) return ERROR_TEXT.LOGIN_REQUIRED;
  if (status === 402) return ERROR_TEXT.PAYMENT_VERIFY_FAILED;
  return result?.message || ERROR_TEXT.SERVER_ERROR;
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
    || Object.keys(asRecord(payload.consume)).length
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
    || fallbackRequestId
  );
  return {
    paymentId,
    transactionId,
    purchaseId,
    ledgerId,
    requestId: fallbackRequestId,
    billingEvidence: {
      ...payload,
      paymentId,
      transactionId,
      purchaseId,
      ledgerId,
      payment: { ...payment, paymentId, requestId: fallbackRequestId },
      accessGrant,
      consume,
    },
    payment: { ...payment, paymentId, requestId: fallbackRequestId },
    accessGrant,
    consume,
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
    productId: toText(runtimeGate.productId ?? paymentPayload.productId) || FEATURE_KEY,
    productType: toText(runtimeGate.productType ?? paymentPayload.productType) || FEATURE_KEY,
    serviceType: toText(runtimeGate.serviceType ?? paymentPayload.serviceType) || FEATURE_KEY,
    forceDeduct: true,
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

function splitAssistantSections(content: string) {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  const fallbackTitles = [
    "명반의 핵심 결론",
    "명궁이 말하는 나의 기질",
    "지금 질문과 연결된 별",
    "12궁으로 보는 흐름",
    "조심해야 할 패턴",
    "오늘의 선택 조언",
    "별궁의 마지막 한마디",
  ];
  const chunks = normalized.split(/\n{2,}/).map((chunk) => chunk.trim()).filter(Boolean);
  return chunks.map((chunk, index) => {
    const lines = chunk.split("\n").map((line) => line.trim()).filter(Boolean);
    const first = lines[0] || "";
    const headingMatch = first.match(/^(?:#{1,3}\s*)?(?:\d+[.)]\s*)?(.{2,42}?)(?:[:：])?$/);
    const hasHeading = Boolean(headingMatch && lines.length > 1 && first.length <= 44);
    return {
      title: hasHeading ? headingMatch?.[1]?.replace(/\*\*/g, "").trim() || fallbackTitles[index % fallbackTitles.length] : fallbackTitles[index % fallbackTitles.length],
      body: hasHeading ? lines.slice(1).join("\n") : chunk,
    };
  });
}

export default function ZiweiAiPage() {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [chatInput, setChatInput] = useState("");
  const idempotencyRef = useRef("");
  const busyRef = useRef(false);

  const busy = phase === "checking" || phase === "payment" || phase === "reading" || phase === "chat";
  const summary = consultation?.summaryCards || {};
  const palaces = consultation?.ziweiChart?.palaces || [];
  const assistantMessages = consultation?.messages?.filter((message) => message.role === "assistant") || [];
  const assistantSections = useMemo(() => assistantMessages.flatMap((message, messageIndex) => (
    splitAssistantSections(message.content).map((section, sectionIndex) => ({
      ...section,
      key: `${message.createdAt || messageIndex}-${sectionIndex}`,
    }))
  )), [assistantMessages]);
  const isLoadingConsultation = !consultation && (phase === "checking" || phase === "payment" || phase === "reading");

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    if (!busyRef.current) {
      idempotencyRef.current = "";
      setConsultation(null);
      setError("");
      setNotice("");
      setPhase("idle");
    }
  }

  async function generateConsultation(idempotencyKey: string, payload: ReturnType<typeof buildConsultationPayload>, extra: Record<string, unknown>) {
    setPhase("reading");
    setNotice("명궁과 신궁의 흐름을 맞춰보는 중...");
    const { status, data } = await postJson<ApiResult>("/api/ziwei-ai/generate", {
      ...payload,
      ...extra,
      idempotencyKey,
    }, idempotencyKey);
    if (data.ok && data.consultation) {
      setConsultation(data.consultation);
      setPhase("ready");
      setNotice("");
      return;
    }
    if (status === 202) {
      setNotice("12궁의 별자리를 펼치는 중...");
      return;
    }
    throw new Error(mapError(data, status));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true;
    const idempotencyKey = idempotencyRef.current || createIdempotencyKey();
    idempotencyRef.current = idempotencyKey;
    setError("");
    setNotice("별궁을 열기 위한 정보를 확인하고 있습니다");
    setPhase("checking");

    try {
      const validationMessage = validateForm(form);
      if (validationMessage) {
        throw new Error(validationMessage);
      }
      const payload = buildConsultationPayload(form, idempotencyKey);
      const { status, data } = await postJson<ApiResult>("/api/ziwei-ai/prepare", payload, idempotencyKey);
      if (data.ok) {
        await generateConsultation(idempotencyKey, payload, { accessToken: data.accessToken, accessType: data.accessType });
        return;
      }
      if (data.reason === "LOGIN_REQUIRED" || status === 401) throw new Error(ERROR_TEXT.LOGIN_REQUIRED);
      if (data.reason === "INVALID_INPUT") throw new Error(mapError(data, status));
      if (data.reason !== "PAYMENT_REQUIRED") throw new Error(mapError(data, status));

      setPhase("payment");
      setNotice("결제창을 확인해 주세요");
      const gate = await runBillingCoinGate(buildBillingGateInput(asRecord(data.paymentPayload), idempotencyKey));

      if (!isPaymentGranted(gate)) {
        const code = String(gate.error?.code || "").toUpperCase();
        if (code === "AUTH_REQUIRED" || code === "LOGIN_REQUIRED") throw new Error(ERROR_TEXT.LOGIN_REQUIRED);
        if (code === "PAYMENT_CANCELLED" || code === "PAYMENT_REQUIRED" || gate.status === 402) throw new Error(ERROR_TEXT.PAYMENT_VERIFY_FAILED);
        throw new Error(gate.error?.message || ERROR_TEXT.SERVER_ERROR);
      }

      await generateConsultation(idempotencyKey, payload, extractPayment(gate, idempotencyKey));
    } catch (caught) {
      setError(caught instanceof TypeError ? ERROR_TEXT.NETWORK_ERROR : caught instanceof Error ? caught.message : ERROR_TEXT.SERVER_ERROR);
      setNotice("");
      setPhase("idle");
    } finally {
      busyRef.current = false;
    }
  }

  async function handleSendMessage() {
    if (!consultation || busy || chatInput.trim().length < 2) return;
    const message = chatInput.trim();
    setChatInput("");
    setError("");
    setNotice("당신의 질문과 별의 흐름을 연결하는 중...");
    setPhase("chat");
    try {
      const { status, data } = await postJson<ApiResult>("/api/ziwei-ai/message", {
        sessionId: consultation.id,
        message,
      });
      if (data.ok && data.consultation) {
        setConsultation(data.consultation);
        setPhase("ready");
        setNotice("");
        return;
      }
      throw new Error(mapError(data, status));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : ERROR_TEXT.SERVER_ERROR);
      setPhase("ready");
      setNotice("");
    }
  }

  return (
    <main className="ziweiAiShell">
      <section className="ziweiHero">
        <div className="heroMedia" aria-hidden="true">
          <img src="/fuctionassets/jamipremiun.webp" alt="" />
        </div>
        <div className="heroBackdropText" aria-hidden="true">紫微斗數</div>
        <div className="heroCopy">
          <p className="eyebrow"><Stars size={16} /> 紫微斗數 · 별궁 AI 상담</p>
          <h1>자미두수 AI 상담</h1>
          <p>명궁과 12궁의 별 흐름을 따라 지금 가장 궁금한 질문을 차분히 풀어드립니다.</p>
        </div>
        <div className="heroSeparator" aria-hidden="true" />
      </section>

      <section className="workspace">
        <form className="consultForm" onSubmit={handleSubmit}>
          <div className="formHeader">
            <Sparkles size={20} />
            <strong>별궁을 열기 위한 정보</strong>
          </div>

          <label>
            <span>이름 또는 닉네임</span>
            <input value={form.name} onChange={(event) => update("name", event.target.value)} maxLength={80} disabled={busy} />
          </label>

          <div className="fieldRow">
            <label>
              <span>성별</span>
              <select value={form.gender} onChange={(event) => update("gender", event.target.value as Gender)} disabled={busy}>
                <option value="">선택</option>
                <option value="female">여성</option>
                <option value="male">남성</option>
                <option value="unknown">비공개</option>
              </select>
            </label>
            <label>
              <span>생년월일</span>
              <input type="date" value={form.birthDate} onChange={(event) => update("birthDate", event.target.value)} disabled={busy} />
            </label>
          </div>

          <div className="fieldRow">
            <label>
              <span>출생시간</span>
              <input type="time" value={form.birthTime} onChange={(event) => update("birthTime", event.target.value)} disabled={busy || form.birthTimeUnknown} />
            </label>
            <label>
              <span>양력/음력</span>
              <select value={form.calendarType} onChange={(event) => update("calendarType", event.target.value as CalendarType)} disabled={busy}>
                <option value="solar">양력</option>
                <option value="lunar">음력</option>
              </select>
            </label>
          </div>

          <div className="toggles">
            <label className="check">
              <input type="checkbox" checked={form.birthTimeUnknown} onChange={(event) => update("birthTimeUnknown", event.target.checked)} disabled={busy} />
              <span>출생시간 모름</span>
            </label>
            {form.calendarType === "lunar" && (
              <label className="check">
                <input type="checkbox" checked={form.isLeapMonth} onChange={(event) => update("isLeapMonth", event.target.checked)} disabled={busy} />
                <span>윤달</span>
              </label>
            )}
          </div>

          <label>
            <span>상담 주제</span>
            <select value={form.focusArea} onChange={(event) => update("focusArea", event.target.value as FocusArea)} disabled={busy}>
              {FOCUS_OPTIONS.map((topic) => <option key={topic.value} value={topic.value}>{topic.label}</option>)}
            </select>
          </label>

          <label>
            <span>별궁에 묻고 싶은 질문</span>
            <textarea
              value={form.question}
              onChange={(event) => update("question", event.target.value)}
              maxLength={1200}
              rows={5}
              disabled={busy}
              placeholder="지금 마음에 가장 크게 떠오르는 고민을 적어 주세요."
            />
          </label>

          <button className="primaryBtn" type="submit" disabled={busy}>
            {busy ? <Loader2 className="spin" size={18} /> : <WalletCards size={18} />}
            {busy ? "명반의 별을 읽는 중..." : "별궁 AI 상담 받기"}
          </button>

          {notice && <p className="notice"><Moon size={16} />{notice}</p>}
          {error && <p className="error">{error}</p>}
        </form>

        <div className="resultPane">
          {isLoadingConsultation ? (
            <div className="loadingState">
              <div className="palaceSigil isSpinning" aria-hidden="true">
                {Array.from({ length: 12 }).map((_, index) => <span key={index} />)}
              </div>
              <strong>{phase === "payment" ? "이용권을 확인하는 중..." : "명궁과 신궁의 흐름을 맞춰보는 중..."}</strong>
              <span>{phase === "reading" ? "당신의 질문과 별의 흐름을 연결하는 중..." : "12궁의 별자리를 펼치는 중..."}</span>
            </div>
          ) : !consultation ? (
            <div className="emptyState">
              <div className="palaceSigil" aria-hidden="true">
                {Array.from({ length: 12 }).map((_, index) => <span key={index} />)}
              </div>
              <strong>별궁을 펼칠 준비가 되어 있습니다</strong>
              <span>입력한 정보 기준으로 명반을 세우고 상담이 이어집니다.</span>
            </div>
          ) : (
            <>
              <div className="summaryGrid">
                <div><span>명궁</span><strong>{summary.lifePalace || consultation.ziweiChart?.lifePalace || "-"}</strong></div>
                <div><span>신궁</span><strong>{summary.bodyPalace || consultation.ziweiChart?.bodyPalace || "-"}</strong></div>
                <div><span>핵심 별</span><strong>{(summary.keyStars || []).slice(0, 3).join(" · ") || "-"}</strong></div>
                <div><span>상담 키워드</span><strong>{(summary.keywords || []).slice(0, 3).join(" · ") || consultation.topic}</strong></div>
              </div>

              <div className="palaceGrid">
                {palaces.slice(0, 12).map((palace) => (
                  <article key={`${palace.name}-${palace.earthlyBranch}`} className="palaceCard">
                    <div>
                      <strong>{palace.name}</strong>
                      <span>{palace.earthlyBranch || ""}</span>
                    </div>
                    <p>{(palace.mainStars || []).join(" · ") || "주성 없음"}</p>
                    <small>{[...(palace.transformations || []), ...(palace.maleficStars || []).slice(0, 2)].join(" · ")}</small>
                  </article>
                ))}
              </div>

              <div className="chatList">
                {assistantSections.map((section) => (
                  <article className="chatCard" key={section.key}>
                    <div className="chatCardTitle">
                      <MessageCircle size={18} />
                      <h3>{section.title}</h3>
                    </div>
                    <p>{section.body}</p>
                  </article>
                ))}
              </div>

              <div className="chatInput">
                <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} onKeyDown={(event) => {
                  if (event.key === "Enter") handleSendMessage();
                }} placeholder="더 묻고 싶은 흐름을 적어 주세요" disabled={busy} />
                <button type="button" onClick={handleSendMessage} disabled={busy || chatInput.trim().length < 2} aria-label="추가 질문 보내기">
                  {phase === "chat" ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      <style>{`
        .ziweiAiShell{position:relative;min-height:100dvh;overflow:hidden;background:radial-gradient(ellipse at 22% 6%,rgba(116,82,170,.42),transparent 34%),radial-gradient(ellipse at 78% 18%,rgba(212,175,95,.20),transparent 28%),radial-gradient(ellipse at 52% 92%,rgba(83,121,177,.22),transparent 38%),linear-gradient(145deg,#050714 0%,#0d1027 42%,#161033 72%,#060712 100%);color:#f8fafc;padding:22px;font-family:var(--font-body)}
        .ziweiAiShell::before{content:"";position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,255,255,.72) 0 1px,transparent 1.4px),radial-gradient(circle,rgba(250,235,182,.58) 0 1px,transparent 1.2px);background-size:92px 92px,137px 137px;background-position:12px 18px,54px 36px;opacity:.22;pointer-events:none}
        .ziweiAiShell::after{content:"";position:absolute;inset:-15% -10%;background:linear-gradient(112deg,transparent 12%,rgba(183,180,232,.10) 36%,rgba(236,204,132,.13) 48%,rgba(130,111,190,.10) 62%,transparent 84%);filter:blur(18px);transform:rotate(-7deg);pointer-events:none}
        .ziweiHero,.workspace{position:relative;z-index:1}
        .ziweiHero{position:relative;min-height:315px;display:flex;align-items:flex-end;overflow:hidden;border:1px solid rgba(226,214,255,.24);border-radius:8px;background:#070817;box-shadow:0 28px 86px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.12)}
        .heroMedia{position:absolute;inset:0}
        .heroMedia img{width:100%;height:100%;object-fit:cover;object-position:center;opacity:.34;filter:saturate(115%) contrast(106%) brightness(.86)}
        .heroMedia::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(5,7,20,.96),rgba(8,9,26,.74) 46%,rgba(8,9,26,.42)),linear-gradient(0deg,rgba(5,7,20,.86),rgba(5,7,20,.2) 54%,rgba(5,7,20,.56))}
        .heroBackdropText{position:absolute;right:4%;bottom:8%;color:rgba(235,229,255,.075);font-family:var(--font-premium);font-size:clamp(58px,13vw,172px);font-weight:900;line-height:.82;white-space:nowrap;text-shadow:0 0 38px rgba(216,180,254,.12)}
        .heroCopy{position:relative;max-width:760px;padding:42px 40px 54px}
        .eyebrow{display:inline-flex;align-items:center;gap:8px;margin:0 0 14px;color:#fde8a7;font-size:13px;font-weight:850}
        .heroCopy h1{margin:0;color:#fffaf0;font-family:var(--font-premium);font-size:clamp(40px,7vw,78px);line-height:1.03;letter-spacing:0;text-shadow:0 0 28px rgba(252,211,77,.18)}
        .heroCopy p:last-child{max-width:650px;margin:16px 0 0;color:#e6e0ff;font-size:17px;line-height:1.76;text-shadow:0 2px 18px rgba(3,5,14,.92)}
        .heroSeparator{position:absolute;left:0;right:0;bottom:0;height:54px;background:radial-gradient(ellipse at 30% 100%,rgba(244,214,148,.24),transparent 46%),linear-gradient(180deg,transparent,rgba(9,10,30,.84));pointer-events:none}
        .workspace{display:grid;grid-template-columns:minmax(320px,446px) minmax(0,1fr);gap:18px;max-width:1360px;margin:18px auto 0}
        .consultForm,.resultPane{border:1px solid rgba(224,210,255,.24);border-radius:8px;background:linear-gradient(180deg,rgba(24,23,58,.78),rgba(9,11,30,.88));box-shadow:0 20px 62px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.10);backdrop-filter:blur(22px) saturate(1.18);-webkit-backdrop-filter:blur(22px) saturate(1.18)}
        .consultForm{display:grid;gap:14px;align-self:start;padding:20px;position:sticky;top:16px}
        .formHeader{display:flex;align-items:center;gap:9px;color:#fff0b8;font-family:var(--font-display);font-size:18px}
        .consultForm label{display:grid;gap:7px;color:#ded8ff;font-size:13px;font-weight:820}
        .consultForm input,.consultForm select,.consultForm textarea,.chatInput input{width:100%;min-height:46px;border:1px solid rgba(224,210,255,.26);border-radius:8px;background:rgba(5,8,24,.70);color:#fffaf0;padding:11px 12px;font:inherit;outline:none;box-shadow:inset 0 1px 0 rgba(255,255,255,.06);transition:border-color .18s ease,box-shadow .18s ease,background .18s ease}
        .consultForm textarea{resize:vertical;min-height:132px;line-height:1.62}
        .consultForm input:hover,.consultForm select:hover,.consultForm textarea:hover,.chatInput input:hover{border-color:rgba(244,214,148,.42);background:rgba(9,12,32,.82)}
        .consultForm input:focus,.consultForm select:focus,.consultForm textarea:focus,.chatInput input:focus{border-color:#f5d991;box-shadow:0 0 0 3px rgba(245,217,145,.16),0 0 24px rgba(181,152,255,.14)}
        .consultForm textarea::placeholder,.chatInput input::placeholder{color:rgba(226,214,255,.54)}
        .fieldRow{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .toggles{display:flex;gap:10px;flex-wrap:wrap}
        .check{display:inline-flex;grid-template-columns:auto 1fr;align-items:center;gap:9px;border:1px solid rgba(224,210,255,.20);border-radius:8px;background:rgba(255,255,255,.055);padding:10px 11px}
        .check input{width:17px;min-width:17px;height:17px;min-height:17px;padding:0;accent-color:#f5d991}
        .primaryBtn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:50px;border:0;border-radius:8px;background:linear-gradient(135deg,#fff0b8,#d9c7ff 47%,#8fa7ff);color:#0c1024;font-family:var(--font-display);font-weight:950;cursor:pointer;box-shadow:0 18px 36px rgba(105,88,198,.30),0 0 30px rgba(244,214,148,.16);transition:transform .18s ease,box-shadow .18s ease,filter .18s ease}
        .primaryBtn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 22px 44px rgba(105,88,198,.38),0 0 36px rgba(244,214,148,.22);filter:saturate(1.05)}
        .primaryBtn:disabled{cursor:not-allowed;opacity:.68}
        .notice,.error{display:flex;align-items:center;gap:7px;margin:0;border-radius:8px;padding:10px 11px;font-size:13px;line-height:1.5}
        .notice{border:1px solid rgba(245,217,145,.30);background:rgba(245,217,145,.10);color:#fff0b8}
        .error{border:1px solid rgba(248,113,113,.38);background:rgba(127,29,29,.30);color:#fecaca}
        .resultPane{min-height:640px;padding:18px}
        .emptyState,.loadingState{min-height:584px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:13px;text-align:center;color:#d7ceff}
        .emptyState strong,.loadingState strong{color:#fffaf0;font-family:var(--font-display);font-size:21px}
        .emptyState span,.loadingState span{max-width:360px;color:#beb8df;line-height:1.65}
        .palaceSigil{position:relative;width:168px;aspect-ratio:1;border:1px solid rgba(245,217,145,.30);border-radius:999px;background:radial-gradient(circle,rgba(245,217,145,.18),transparent 27%),radial-gradient(circle,rgba(143,167,255,.16),transparent 56%);box-shadow:0 0 42px rgba(168,147,255,.18),inset 0 0 28px rgba(245,217,145,.08)}
        .palaceSigil::before,.palaceSigil::after{content:"";position:absolute;inset:22px;border:1px solid rgba(224,210,255,.18);border-radius:999px}
        .palaceSigil::after{inset:52px;background:rgba(245,217,145,.18);box-shadow:0 0 18px rgba(245,217,145,.30)}
        .palaceSigil span{position:absolute;left:50%;top:50%;width:7px;height:7px;border-radius:999px;background:#fff0b8;box-shadow:0 0 16px rgba(245,217,145,.82);transform:rotate(calc(var(--i,0)*30deg)) translateY(-72px)}
        .palaceSigil span:nth-child(1){--i:0}.palaceSigil span:nth-child(2){--i:1}.palaceSigil span:nth-child(3){--i:2}.palaceSigil span:nth-child(4){--i:3}.palaceSigil span:nth-child(5){--i:4}.palaceSigil span:nth-child(6){--i:5}.palaceSigil span:nth-child(7){--i:6}.palaceSigil span:nth-child(8){--i:7}.palaceSigil span:nth-child(9){--i:8}.palaceSigil span:nth-child(10){--i:9}.palaceSigil span:nth-child(11){--i:10}.palaceSigil span:nth-child(12){--i:11}
        .palaceSigil.isSpinning{animation:ziweiSpin 9s linear infinite}
        .summaryGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px}
        .summaryGrid div{min-height:94px;border:1px solid rgba(245,217,145,.22);border-radius:8px;background:linear-gradient(145deg,rgba(245,217,145,.12),rgba(125,103,209,.12));padding:13px}
        .summaryGrid span{display:block;color:#cfc7f8;font-size:12px;font-weight:820}
        .summaryGrid strong{display:block;margin-top:9px;color:#fffaf0;font-size:16px;line-height:1.45;word-break:keep-all}
        .palaceGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-bottom:15px}
        .palaceCard{min-height:116px;border:1px solid rgba(224,210,255,.18);border-radius:8px;background:rgba(255,255,255,.055);padding:11px;box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}
        .palaceCard div{display:flex;justify-content:space-between;gap:8px;color:#fff0b8}
        .palaceCard div span{color:#cfc7f8;font-size:12px}
        .palaceCard p{margin:12px 0 8px;color:#fff;font-size:13px;line-height:1.45}
        .palaceCard small{color:#d9c7ff;line-height:1.4}
        .chatList{display:grid;gap:12px}
        .chatCard{display:grid;gap:10px;border:1px solid rgba(224,210,255,.22);border-radius:8px;background:linear-gradient(145deg,rgba(8,11,30,.92),rgba(28,26,64,.78));padding:16px;color:#f8fafc}
        .chatCardTitle{display:flex;align-items:center;gap:8px;color:#fff0b8}
        .chatCardTitle h3{margin:0;font-family:var(--font-display);font-size:16px;line-height:1.35;color:#fff0b8}
        .chatCardTitle svg{color:#f5d991}
        .chatCard p{margin:0;white-space:pre-wrap;line-height:1.84;font-size:15px;color:#f3efff}
        .chatInput{display:grid;grid-template-columns:1fr 48px;gap:8px;margin-top:14px}
        .chatInput button{border:0;border-radius:8px;background:#fff0b8;color:#10142a;cursor:pointer}
        .chatInput button:disabled{opacity:.55;cursor:not-allowed}
        .spin{animation:ziweiSpin 1s linear infinite}
        @keyframes ziweiSpin{to{transform:rotate(360deg)}}
        @media(max-width:980px){.workspace{grid-template-columns:1fr}.consultForm{position:static}.summaryGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.palaceGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.resultPane{min-height:520px}.emptyState,.loadingState{min-height:430px}}
        @media(max-width:620px){.ziweiAiShell{padding:10px}.ziweiHero{min-height:248px}.heroCopy{padding:24px 20px 44px}.heroBackdropText{right:-10%;bottom:14%;font-size:76px}.fieldRow,.summaryGrid,.palaceGrid{grid-template-columns:1fr}.resultPane{min-height:420px;padding:12px}.emptyState,.loadingState{min-height:340px}.palaceSigil{width:138px}.palaceSigil span{transform:rotate(calc(var(--i,0)*30deg)) translateY(-58px)}}
      `}</style>
    </main>
  );
}
