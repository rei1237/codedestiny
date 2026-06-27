"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, HeartHandshake, Loader2, Moon, Send, Sparkles } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import { runBillingCoinGate } from "@/app/_lib/billing-client";
import styles from "./SukuyoCompatibilityAiClient.module.css";

type CalendarType = "solar" | "lunar";
type ConsultationType = "personal" | "compatibility";
type PersonForm = {
  name: string;
  gender: string;
  birthDate: string;
  birthTime: string;
  calendarType: CalendarType;
};
type ConsultationMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};
type Consultation = {
  id: string;
  consultationType?: ConsultationType;
  personA: { name?: string; shuku?: string };
  personB: { name?: string; shuku?: string };
  sukuyoResult: {
    personAShuku?: string;
    personBShuku?: string;
    relationType?: string;
    distance?: "near" | "middle" | "far" | "";
    distanceLabel?: string;
    direction?: string;
  };
  relationshipType: string;
  topic: string;
  messages: ConsultationMessage[];
};
type EnsureAccessResult =
  | { ok: true; accessToken: string; accessType: "pass" | "paid" | "subscription" | "admin" }
  | { ok: false; reason: "PAYMENT_REQUIRED"; paymentPayload: Record<string, unknown> }
  | { ok: false; reason: "LOGIN_REQUIRED" }
  | { ok: false; reason: "INVALID_INPUT"; message: string }
  | { ok: false; reason?: string; message?: string };

const FEATURE_KEY = "sukuyo-compatibility-ai";
const FEATURE_REASON = "숙요점 궁합 AI 상담";
const FEATURE_COST = 490;
const FEATURE_AMOUNT_KRW = 49000;
const FEATURE_MEMBERSHIP_CREDIT_COST = 4900;
const RELATIONSHIP_TYPES = ["연인", "썸", "부부", "재회", "짝사랑", "비즈니스 파트너", "친구", "가족"];
const TOPICS = ["전체 궁합", "연애 궁합", "결혼 가능성", "재회 가능성", "갈등 원인", "속궁합/정서적 친밀감", "장기 관계 가능성", "상대의 마음", "관계 유지 전략"];
const STEPS = ["내 정보", "상대방 정보", "관계와 질문"];
const PERSONAL_STEPS = ["내 정보", "상담 질문"];

const EMPTY_PERSON: PersonForm = {
  name: "",
  gender: "unknown",
  birthDate: "",
  birthTime: "",
  calendarType: "solar",
};

const ERROR_TEXT: Record<string, string> = {
  LOGIN_REQUIRED: "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.",
  PAYMENT_REQUIRED: "숙요점 궁합 AI 상담 이용권이 필요합니다. 결제창을 열어드릴게요.",
  PAYMENT_VERIFY_FAILED: "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.",
  INVALID_INPUT: "상담에 필요한 정보가 부족해요. 생년월일과 상담 질문을 다시 확인해 주세요.",
  CALCULATION_FAILED: "숙요점 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.",
  SERVER_ERROR: "상담 준비 중 문제가 발생했어요. 결제나 이용권은 차감되지 않았습니다.",
  LLM_FAILED: "AI 상담문을 생성하는 중 문제가 발생했어요. 차감된 내역이 있다면 자동 복구됩니다.",
  NETWORK_ERROR: "연결이 불안정해요. 잠시 후 다시 시도해 주세요.",
};

function makeIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `sukuyo-ai-${crypto.randomUUID()}`;
  }
  return `sukuyo-ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
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
    serviceType: toText(runtimeGate.serviceType ?? paymentPayload.serviceType) || "sukyo-ai-consultation",
    forceDeduct: true,
    deferUsage: true,
    usagePolicy: "apply_after_success",
    executionKey: `${FEATURE_KEY}:${idempotencyKey}`,
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

async function postJson<T>(path: string, body: Record<string, unknown>, idempotencyKey?: string) {
  const response = await authFetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data: data as T };
}

function distanceLabel(value?: string) {
  if (value === "near") return "근거리";
  if (value === "middle") return "중거리";
  if (value === "far") return "원거리";
  return "";
}

export default function SukuyoCompatibilityAiClient() {
  const [step, setStep] = useState(0);
  const [consultationType, setConsultationType] = useState<ConsultationType>("compatibility");
  const [personA, setPersonA] = useState<PersonForm>({ ...EMPTY_PERSON });
  const [personB, setPersonB] = useState<PersonForm>({ ...EMPTY_PERSON });
  const [relationshipType, setRelationshipType] = useState("연인");
  const [topic, setTopic] = useState("전체 궁합");
  const [question, setQuestion] = useState("");
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [phase, setPhase] = useState<"idle" | "access" | "payment" | "start" | "chat">("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [chatInput, setChatInput] = useState("");
  const submitKeyRef = useRef("");

  const busy = phase === "access" || phase === "payment" || phase === "start";
  const chatBusy = phase === "chat";
  const stepLabels = consultationType === "personal" ? PERSONAL_STEPS : STEPS;
  const lastStep = stepLabels.length - 1;

  useEffect(() => {
    document.body.classList.add(styles.fullscreenBody);
    return () => document.body.classList.remove(styles.fullscreenBody);
  }, []);

  const phaseText = useMemo(() => {
    if (phase === "access") return "달빛 상담 준비를 확인하고 있습니다";
    if (phase === "payment") return "결제창을 확인해 주세요";
    if (phase === "start") return "숙요점 상담문을 생성하고 있습니다";
    if (phase === "chat") return "상담 답변을 이어가고 있습니다";
    return "";
  }, [phase]);

  const payload = useMemo(() => ({
    consultationType,
    userName: personA.name,
    gender: personA.gender,
    birthDate: personA.birthDate,
    birthTime: personA.birthTime,
    calendarType: personA.calendarType,
    partnerName: consultationType === "compatibility" ? personB.name : "",
    partnerGender: consultationType === "compatibility" ? personB.gender : "",
    partnerBirthDate: consultationType === "compatibility" ? personB.birthDate : "",
    partnerBirthTime: consultationType === "compatibility" ? personB.birthTime : "",
    partnerCalendarType: consultationType === "compatibility" ? personB.calendarType : "",
    relationshipType,
    topic,
    question,
    locale: "ko",
    serviceType: "sukyo-ai-consultation",
  }), [consultationType, personA, personB, relationshipType, topic, question]);

  function resetAttempt() {
    if (busy) return;
    submitKeyRef.current = "";
    setError("");
    setNotice("");
    setConsultation(null);
  }

  function updatePerson(target: "a" | "b", patch: Partial<PersonForm>) {
    resetAttempt();
    if (target === "a") setPersonA((current) => ({ ...current, ...patch }));
    if (target === "b") setPersonB((current) => ({ ...current, ...patch }));
  }

  function updateConsultationType(next: ConsultationType) {
    if (busy) return;
    resetAttempt();
    setConsultationType(next);
    setStep(0);
  }

  function updateQuestion(value: string) {
    resetAttempt();
    setQuestion(value);
  }

  function validatePayload() {
    if (!personA.birthDate || !personA.gender || !personA.calendarType || question.trim().length < 2) return false;
    if (consultationType === "compatibility" && (!personB.birthDate || !personB.gender || !personB.calendarType)) return false;
    return Boolean(topic && (consultationType === "personal" || relationshipType));
  }

  function validateCurrentStep() {
    if (step === 0) return Boolean(personA.birthDate && personA.gender && personA.calendarType);
    if (consultationType === "compatibility" && step === 1) return Boolean(personB.birthDate && personB.gender && personB.calendarType);
    return validatePayload();
  }

  async function startConsultation(idempotencyKey: string, access: Record<string, unknown>, paymentWasRequired = false) {
    setPhase("start");
    const { status, data } = await postJson<{ ok?: boolean; reason?: string; message?: string; consultation?: Consultation }>(
      "/api/sukuyo-compatibility-ai/generate",
      { ...payload, ...access, idempotencyKey },
      idempotencyKey,
    );
    if (data.ok && data.consultation) {
      setConsultation(data.consultation);
      setError("");
      setNotice("");
      setPhase("idle");
      submitKeyRef.current = "";
      return;
    }
    if (status === 402 && paymentWasRequired) throw new Error("PAYMENT_VERIFY_FAILED");
    if (data.reason === "LLM_FAILED") throw new Error("LLM_FAILED");
    if (data.reason === "CALCULATION_FAILED") throw new Error("CALCULATION_FAILED");
    if (data.reason === "INVALID_INPUT") throw new Error("INVALID_INPUT");
    throw new Error(toText(data.reason) || (status === 401 ? "LOGIN_REQUIRED" : "SERVER_ERROR"));
  }

  async function handleSubmit() {
    if (busy) return;
    if (!validatePayload()) {
      setError(ERROR_TEXT.INVALID_INPUT);
      return;
    }
    const idempotencyKey = submitKeyRef.current || makeIdempotencyKey();
    submitKeyRef.current = idempotencyKey;
    setError("");
    setNotice("");
    setPhase("access");
    try {
      const { data } = await postJson<EnsureAccessResult>(
        "/api/sukuyo-compatibility-ai/prepare",
        { ...payload, idempotencyKey },
        idempotencyKey,
      );
      if (data.ok) {
        await startConsultation(idempotencyKey, { accessToken: data.accessToken, accessType: data.accessType });
        return;
      }
      const denied = data as Exclude<EnsureAccessResult, { ok: true }>;
      if (denied.reason === "LOGIN_REQUIRED") throw new Error("LOGIN_REQUIRED");
      if (denied.reason === "INVALID_INPUT") throw new Error("INVALID_INPUT");
      if (denied.reason !== "PAYMENT_REQUIRED") throw new Error(toText(denied.reason) || "SERVER_ERROR");
      setNotice(ERROR_TEXT.PAYMENT_REQUIRED);
      setPhase("payment");
      const paymentPayload = asRecord("paymentPayload" in denied ? denied.paymentPayload : {});
      const runtimeResult = await runBillingCoinGate(buildBillingGateInput(paymentPayload, idempotencyKey));
      if (!isPaymentGranted(runtimeResult)) throw new Error("PAYMENT_VERIFY_FAILED");
      const payment = extractPayment(runtimeResult, idempotencyKey);
      await startConsultation(idempotencyKey, { ...payment, billingGate: asRecord(runtimeResult.data) }, true);
    } catch (caught) {
      const code = caught instanceof TypeError ? "NETWORK_ERROR" : caught instanceof Error ? caught.message : "SERVER_ERROR";
      setError(ERROR_TEXT[code] || ERROR_TEXT.SERVER_ERROR);
      setPhase("idle");
    }
  }

  async function handleSendMessage() {
    if (!consultation || chatBusy || chatInput.trim().length < 2) return;
    const message = chatInput.trim();
    setChatInput("");
    setError("");
    setPhase("chat");
    try {
      const { status, data } = await postJson<{ ok?: boolean; reason?: string; message?: ConsultationMessage; consultation?: Consultation }>(
        "/api/sukuyo-compatibility-ai/message",
        { sessionId: consultation.id, message },
      );
      if (data.ok && data.consultation) {
        setConsultation(data.consultation);
        setPhase("idle");
        return;
      }
      throw new Error(toText(data.reason) || (status === 401 ? "LOGIN_REQUIRED" : "SERVER_ERROR"));
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "SERVER_ERROR";
      setError(ERROR_TEXT[code] || ERROR_TEXT.SERVER_ERROR);
      setPhase("idle");
    }
  }

  const renderPersonFields = (target: "a" | "b", value: PersonForm) => (
    <div className={styles.formGrid}>
      <label className={styles.field}>
        <span>{target === "a" ? "내 이름 또는 닉네임" : "상대방 이름 또는 닉네임"}</span>
        <input value={value.name} onChange={(event) => updatePerson(target, { name: event.target.value })} maxLength={80} disabled={busy} />
      </label>
      <label className={styles.field}>
        <span>{target === "a" ? "내 성별" : "상대방 성별"}</span>
        <select value={value.gender} onChange={(event) => updatePerson(target, { gender: event.target.value })} disabled={busy}>
          <option value="">선택</option>
          <option value="female">여성</option>
          <option value="male">남성</option>
          <option value="unknown">비공개</option>
        </select>
      </label>
      <label className={styles.field}>
        <span>{target === "a" ? "내 생년월일" : "상대방 생년월일"}</span>
        <input type="date" value={value.birthDate} onChange={(event) => updatePerson(target, { birthDate: event.target.value })} disabled={busy} />
      </label>
      <label className={styles.field}>
        <span>{target === "a" ? "내 출생시간" : "상대방 출생시간"}</span>
        <input type="time" value={value.birthTime} onChange={(event) => updatePerson(target, { birthTime: event.target.value })} disabled={busy} />
      </label>
      <div className={styles.fieldWide}>
        <span>달력 기준</span>
        <div className={styles.segmented}>
          {(["solar", "lunar"] as CalendarType[]).map((calendarType) => (
            <button
              key={calendarType}
              type="button"
              className={value.calendarType === calendarType ? styles.segmentActive : styles.segment}
              onClick={() => updatePerson(target, { calendarType })}
              disabled={busy}
            >
              {calendarType === "solar" ? "양력" : "음력"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <main className={styles.screen} data-sukuyo-ai-consultation>
      <div className={styles.threadLine} />
      <div className={styles.starField} aria-hidden="true" />
      <section className={styles.shell}>
        <aside className={styles.visualPanel}>
          <img src="/fuctionassets/sukyo_premium.webp" alt="숙요점 궁합 AI 상담" className={styles.visualImage} />
          <div className={styles.visualCopy}>
            <p className={styles.eyebrow}><Moon size={15} /> 27숙 달빛 상담</p>
            <h1>숙요점 AI 상담</h1>
            <p>태어난 날의 달빛 자리를 따라 지금의 질문과 관계의 결을 부드럽게 읽습니다.</p>
          </div>
        </aside>

        <section className={styles.workPanel}>
          {!consultation ? (
            <>
              <div className={styles.modeSwitch} aria-label="상담 유형">
                <button type="button" className={consultationType === "personal" ? styles.modeActive : styles.modeButton} onClick={() => updateConsultationType("personal")} disabled={busy}>
                  개인 상담
                </button>
                <button type="button" className={consultationType === "compatibility" ? styles.modeActive : styles.modeButton} onClick={() => updateConsultationType("compatibility")} disabled={busy}>
                  궁합 상담
                </button>
              </div>
              <div className={styles.stepTabs}>
                {stepLabels.map((label, index) => (
                  <button key={label} type="button" className={index === step ? styles.stepActive : styles.step} onClick={() => setStep(index)} disabled={busy}>
                    <span>{index + 1}</span>{label}
                  </button>
                ))}
              </div>

              <div className={styles.formPanel}>
                {step === 0 && renderPersonFields("a", personA)}
                {consultationType === "compatibility" && step === 1 && renderPersonFields("b", personB)}
                {step === lastStep && (
                  <div className={styles.finalStep}>
                    {consultationType === "compatibility" && (
                      <div className={styles.optionGroup}>
                        <span>관계 유형</span>
                        <div className={styles.chipGrid}>
                          {RELATIONSHIP_TYPES.map((item) => (
                            <button key={item} type="button" className={relationshipType === item ? styles.chipActive : styles.chip} onClick={() => { resetAttempt(); setRelationshipType(item); }} disabled={busy}>
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className={styles.optionGroup}>
                      <span>상담 주제</span>
                      <div className={styles.chipGrid}>
                        {TOPICS.map((item) => (
                          <button key={item} type="button" className={topic === item ? styles.chipActive : styles.chip} onClick={() => { resetAttempt(); setTopic(item); }} disabled={busy}>
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className={styles.questionBox}>
                      <span>상담 질문</span>
                      <textarea value={question} onChange={(event) => updateQuestion(event.target.value)} maxLength={1200} disabled={busy} placeholder="지금 가장 알고 싶은 흐름을 적어 주세요." />
                    </label>
                  </div>
                )}
              </div>

              <div className={styles.actions}>
                <button type="button" className={styles.ghostButton} onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={busy || step === 0} aria-label="이전 단계">
                  <ChevronLeft size={18} />
                </button>
                {step < lastStep ? (
                  <button type="button" className={styles.primaryButton} onClick={() => validateCurrentStep() ? setStep((current) => Math.min(lastStep, current + 1)) : setError(ERROR_TEXT.INVALID_INPUT)} disabled={busy}>
                    다음 <ChevronRight size={18} />
                  </button>
                ) : (
                  <button type="button" className={styles.primaryButton} onClick={handleSubmit} disabled={busy}>
                    {busy ? <Loader2 size={18} className={styles.spin} /> : <Sparkles size={18} />}
                    AI 상담 받기
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className={styles.resultPanel}>
              <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                  <span>{consultation.personA?.name || "나"}</span>
                  <strong>{consultation.sukuyoResult?.personAShuku || consultation.personA?.shuku || "-"}</strong>
                </div>
                <div className={styles.summaryCard}>
                  <span>{consultation.consultationType === "personal" ? "오늘의 달빛 결론" : `${consultation.relationshipType} · ${consultation.topic}`}</span>
                  <strong>{consultation.sukuyoResult?.relationType || "-"}</strong>
                  <em>{consultation.sukuyoResult?.distanceLabel || distanceLabel(consultation.sukuyoResult?.distance) || "출생 정보 기준으로 본 흐름"}</em>
                </div>
                {consultation.consultationType !== "personal" && (
                  <div className={styles.summaryCard}>
                    <span>{consultation.personB?.name || "상대"}</span>
                    <strong>{consultation.sukuyoResult?.personBShuku || consultation.personB?.shuku || "-"}</strong>
                  </div>
                )}
              </div>

              <div className={styles.chatList}>
                {consultation.messages.map((item, index) => (
                  <article key={`${item.role}-${index}`} className={item.role === "assistant" ? styles.assistantMessage : styles.userMessage}>
                    <span>{item.role === "assistant" ? "상담" : "나"}</span>
                    <p>{item.content}</p>
                  </article>
                ))}
              </div>

              <div className={styles.chatComposer}>
                <textarea value={chatInput} onChange={(event) => setChatInput(event.target.value)} maxLength={1600} disabled={chatBusy} />
                <button type="button" onClick={handleSendMessage} disabled={chatBusy || chatInput.trim().length < 2} aria-label="추가 질문 보내기">
                  {chatBusy ? <Loader2 size={18} className={styles.spin} /> : <Send size={18} />}
                </button>
              </div>
            </div>
          )}

          {(phaseText || notice || error) && (
            <div className={error ? styles.statusError : styles.statusInfo} role="status">
              {phaseText && <span><HeartHandshake size={16} /> {phaseText}</span>}
              {!phaseText && notice && <span>{notice}</span>}
              {error && <span>{error}</span>}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
