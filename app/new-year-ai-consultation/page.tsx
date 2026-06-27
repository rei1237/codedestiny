"use client";

import { CalendarDays, Loader2, Moon, Sparkles, WalletCards } from "lucide-react";
import { useCallback, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { openPaidFeatureGate, runBillingCoinGate } from "@/app/_lib/billing-client";

type AccessType = "pass" | "paid" | "subscription" | "admin";
type CalendarType = "solar" | "lunar";
type GenderType = "male" | "female" | "unknown" | "";
type FocusAreaType = "overall" | "love" | "money" | "career" | "health" | "relationship" | "study" | "custom";
type FlowStatus = "idle" | "preparing" | "payment" | "reading" | "ready" | "error";

type ConsultationForm = {
  userName: string;
  gender: GenderType;
  birthDate: string;
  birthTime: string;
  calendarType: CalendarType;
  targetYear: string;
  focusArea: FocusAreaType;
  question: string;
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
const LLM_ERROR_MESSAGE = "AI 상담문을 생성하는 중 문제가 발생했어요. 차감된 내역이 있다면 같은 요청 권한으로 다시 이어집니다.";
const REQUIRED_INPUT_MESSAGE = "신년운세 상담에 필요한 정보가 부족해요. 생년월일, 성별, 달력 기준을 다시 확인해 주세요.";
const TARGET_YEAR_REQUIRED_MESSAGE = "상담할 연도를 선택해 주세요.";
const CUSTOM_QUESTION_REQUIRED_MESSAGE = "직접 질문을 선택했다면 궁금한 내용을 짧게 적어 주세요.";
const FEATURE_KEY = "new-year-ai-consultation";
const FEATURE_COST = 300;
const FEATURE_AMOUNT_KRW = 30000;
const FEATURE_MEMBERSHIP_CREDIT_COST = 3000;
const FEATURE_REASON = "신년운세 AI 상담";
const FOCUS_AREA_OPTIONS: Array<{ value: FocusAreaType; label: string; prompt: string; glyph: string }> = [
  { value: "overall", label: "종합운", glyph: "年", prompt: "새해 전반적인 기운과 가장 중요한 선택 기준을 알려주세요." },
  { value: "love", label: "연애/재회", glyph: "緣", prompt: "올해 연애운과 재회 가능성, 마음의 흐름을 깊게 봐주세요." },
  { value: "money", label: "재물/수입", glyph: "財", prompt: "올해 재물운과 수입 흐름, 지출에서 조심할 시기를 알려주세요." },
  { value: "career", label: "직업/이직", glyph: "官", prompt: "올해 직업운, 이직운, 커리어 전환 타이밍을 봐주세요." },
  { value: "health", label: "건강/멘탈", glyph: "身", prompt: "올해 건강운과 멘탈 흐름에서 조심해야 할 부분을 봐주세요." },
  { value: "relationship", label: "가족/관계", glyph: "和", prompt: "올해 가족과 인간관계에서 좋은 흐름과 조심할 흐름을 알려주세요." },
  { value: "study", label: "학업/성장", glyph: "文", prompt: "올해 공부, 자격, 성장운에서 힘을 쓰기 좋은 방향을 알려주세요." },
  { value: "custom", label: "직접 질문", glyph: "問", prompt: "새해에 가장 깊게 보고 싶은 흐름을 직접 적어 주세요." },
];

const defaultForm = (): ConsultationForm => ({
  userName: "",
  gender: "",
  birthDate: "",
  birthTime: "",
  calendarType: "solar",
  targetYear: String(new Date().getFullYear() + 1),
  focusArea: "overall",
  question: "",
});

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `nyai-${crypto.randomUUID()}`;
  return `nyai-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function buildConsultationPayload(form: ConsultationForm) {
  return {
    serviceType: FEATURE_KEY,
    consultationType: "newYearFortune",
    userName: form.userName.trim(),
    gender: form.gender,
    birthDate: form.birthDate,
    birthTime: form.birthTime,
    calendarType: form.calendarType,
    targetYear: Number(form.targetYear),
    focusArea: form.focusArea,
    question: form.question.trim(),
    locale: "ko",
  };
}

function validateConsultationForm(form: ConsultationForm) {
  if (!form.birthDate || !form.gender || !form.calendarType) return REQUIRED_INPUT_MESSAGE;
  const year = Number(form.targetYear);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return TARGET_YEAR_REQUIRED_MESSAGE;
  if (form.focusArea === "custom" && form.question.trim().length < 2) return CUSTOM_QUESTION_REQUIRED_MESSAGE;
  return "";
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

function splitAssistantSections(content: string) {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  const chunks = normalized.split(/\n{2,}/).map((chunk) => chunk.trim()).filter(Boolean);
  return chunks.map((chunk, index) => {
    const lines = chunk.split("\n").map((line) => line.trim()).filter(Boolean);
    const first = lines[0] || "";
    const headingMatch = first.match(/^(?:#{1,3}\s*)?(?:\d+[.)]\s*)?(.{2,42}?)(?:[:：])?$/);
    const hasHeading = Boolean(headingMatch && lines.length > 1 && first.length <= 44);
    return {
      title: hasHeading ? headingMatch?.[1]?.replace(/\*\*/g, "").trim() || `새해 상담 편지 ${index + 1}` : `새해 상담 편지 ${index + 1}`,
      body: hasHeading ? lines.slice(1).join("\n") : chunk,
    };
  });
}

function AssistantMessageContent({ content }: { content: string }) {
  const sections = splitAssistantSections(content);
  if (!sections.length) return <p>{content}</p>;
  return (
    <div className="nyai-section-list">
      {sections.map((section, index) => (
        <section className="nyai-result-section" key={`${section.title}-${index}`}>
          <h3>{section.title}</h3>
          <p>{section.body}</p>
        </section>
      ))}
    </div>
  );
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
    serviceType: toText(runtimeGate.serviceType || paymentPayload.serviceType) || FEATURE_KEY,
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
  const [accessType, setAccessType] = useState<AccessType | "">("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const startLockRef = useRef(false);
  const idempotencyKeyRef = useRef(createIdempotencyKey());

  const statusText = useMemo(() => {
    if (status === "preparing") return "상담을 준비하고 있습니다";
    if (status === "payment") return "결제창을 확인해 주세요";
    if (status === "reading") return "새해의 기운을 읽는 중...";
    if (status === "ready") return "새해의 답장이 도착했습니다";
    return "새해 상담소가 조용히 열려 있습니다";
  }, [status]);

  const isBusy = status === "preparing" || status === "payment" || status === "reading";
  const selectedFocusOption = useMemo(
    () => FOCUS_AREA_OPTIONS.find((option) => option.value === form.focusArea) || FOCUS_AREA_OPTIONS[0],
    [form.focusArea],
  );
  const assistantMessages = useMemo(() => messages.filter((message) => message.role === "assistant"), [messages]);

  const resetAttempt = useCallback(() => {
    if (isBusy) return;
    idempotencyKeyRef.current = createIdempotencyKey();
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

  const selectFocusArea = useCallback((value: FocusAreaType) => {
    setForm((prev) => ({
      ...prev,
      focusArea: value,
      question: !prev.question.trim() || FOCUS_AREA_OPTIONS.some((option) => option.prompt === prev.question)
        ? FOCUS_AREA_OPTIONS.find((option) => option.value === value)?.prompt || ""
        : prev.question,
    }));
    resetAttempt();
  }, [resetAttempt]);

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
    const validationMessage = validateConsultationForm(form);
    if (validationMessage) {
      setNotice("");
      setError(validationMessage);
      setStatus("error");
      return;
    }
    startLockRef.current = true;
    const idempotencyKey = idempotencyKeyRef.current;
    const payload = {
      ...buildConsultationPayload(form),
      requestId: idempotencyKey,
    };
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

  return (
    <main className="nyai-page">
      <section className="nyai-panel nyai-intro" aria-label="신년운세 AI 상담">
        <div className="nyai-orbit" aria-hidden="true" />
        <div className="nyai-image-shell">
          <img src="/fuctionassets/신년운세.webp" alt="신년운세 AI 상담" />
          <span className="nyai-image-badge">AI Consultation</span>
        </div>
        <div className="nyai-intro-copy">
          <div className="nyai-kicker"><Moon size={16} /> 신년운세 AI 상담</div>
          <h1>신년운세 AI 상담</h1>
          <p>새해의 기운이 당신에게 건네는 첫 번째 조언을 명식과 세운의 흐름으로 차분히 살펴드립니다.</p>
          <div className="nyai-hero-badges" aria-label="상담 구성">
            <span>사주 원국</span>
            <span>세운 분석</span>
            <span>월별 흐름</span>
            <span>행동 전략</span>
          </div>
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
            <h2>새해 상담에 필요한 정보를 알려주세요</h2>
          </div>
          <div className="nyai-grid">
            <label>
              이름 또는 닉네임
              <input value={form.userName} onChange={updateField("userName")} placeholder="예: 하린" maxLength={80} />
            </label>
            <label>
              성별
              <select value={form.gender} onChange={updateField("gender")} required>
                <option value="">선택</option>
                <option value="female">여성</option>
                <option value="male">남성</option>
                <option value="unknown">비공개</option>
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
              <input type="number" value={form.targetYear} min="1900" max="2100" onChange={updateField("targetYear")} required />
            </label>
          </div>
          <div className="nyai-focus-panel">
            <div className="nyai-focus-head">
              <strong>집중 상담 분야</strong>
              <span>{selectedFocusOption.label}</span>
            </div>
            <div className="nyai-category-grid" role="radiogroup" aria-label="집중 상담 분야">
              {FOCUS_AREA_OPTIONS.map((option) => (
                <button
                  type="button"
                  className={`nyai-category-chip${form.focusArea === option.value ? " is-active" : ""}`}
                  key={option.value}
                  onClick={() => selectFocusArea(option.value)}
                  role="radio"
                  aria-checked={form.focusArea === option.value}
                  disabled={isBusy}
                >
                  <span>{option.glyph}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <label className="nyai-topic">
            더 깊게 보고 싶은 흐름
            <textarea
              value={form.question}
              onChange={updateField("question")}
              placeholder={selectedFocusOption.prompt}
              minLength={form.focusArea === "custom" ? 2 : undefined}
              maxLength={1000}
              required={form.focusArea === "custom"}
            />
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
            <h2>새해의 첫 번째 답장</h2>
          </div>
          <div className="nyai-messages">
            {assistantMessages.length === 0 ? (
              <div className="nyai-empty">
                <p>붉은 비단 위에 아직 첫 문장이 놓이지 않았습니다.</p>
                <span>상담이 시작되면 올해 당신에게 들어오는 기운이 이곳에 펼쳐집니다.</span>
              </div>
            ) : assistantMessages.map((message, index) => (
              <article key={`${message.role}-${index}`} className="nyai-message nyai-message--assistant">
                <span>새해 상담 편지</span>
                <AssistantMessageContent content={message.content} />
              </article>
            ))}
          </div>
        </section>
      </section>

      <style>{`
        .nyai-page {
          min-height: 100vh;
          padding: clamp(18px, 3vw, 42px);
          color: #fff7e3;
          background:
            radial-gradient(circle at 12% 12%, rgba(255, 217, 118, .28), transparent 26%),
            radial-gradient(circle at 88% 10%, rgba(134, 28, 47, .46), transparent 34%),
            radial-gradient(circle at 76% 84%, rgba(98, 32, 88, .32), transparent 32%),
            linear-gradient(140deg, #21090c 0%, #71151f 36%, #331022 68%, #130d09 100%);
          font-family: CodeDestinyBody, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          position: relative;
          overflow-x: hidden;
        }

        .nyai-page::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: .24;
          background:
            linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px),
            linear-gradient(0deg, rgba(255,255,255,.05) 1px, transparent 1px),
            radial-gradient(circle at 30% 20%, rgba(255, 229, 160, .32) 0 1px, transparent 2px);
          background-size: 42px 42px, 42px 42px, 96px 96px;
          mix-blend-mode: soft-light;
        }

        .nyai-panel {
          border: 1px solid rgba(246, 203, 115, .28);
          border-radius: 8px;
          background:
            linear-gradient(180deg, rgba(255, 248, 226, .14), rgba(67, 17, 22, .74)),
            repeating-linear-gradient(135deg, rgba(255,255,255,.035) 0 1px, transparent 1px 12px),
            rgba(29, 18, 16, .86);
          box-shadow: 0 24px 70px rgba(28, 5, 8, .38), inset 0 1px 0 rgba(255, 244, 205, .12);
          backdrop-filter: blur(16px);
        }

        .nyai-intro {
          display: grid;
          grid-template-columns: minmax(210px, 340px) minmax(0, 1fr);
          gap: clamp(18px, 4vw, 46px);
          align-items: center;
          max-width: 1180px;
          margin: 0 auto clamp(18px, 3vw, 30px);
          padding: clamp(16px, 3vw, 30px);
          position: relative;
          overflow: hidden;
        }

        .nyai-intro::before,
        .nyai-intro::after {
          content: "";
          position: absolute;
          pointer-events: none;
        }

        .nyai-intro::before {
          inset: 12px;
          border: 1px solid rgba(246, 203, 115, .18);
          border-radius: 8px;
        }

        .nyai-intro::after {
          width: 190px;
          height: 190px;
          right: -46px;
          top: -54px;
          border-radius: 50%;
          background:
            radial-gradient(circle, rgba(255, 218, 122, .4) 0 2px, transparent 3px),
            conic-gradient(from 20deg, transparent 0 18deg, rgba(255, 214, 119, .2) 18deg 24deg, transparent 24deg 48deg);
          background-size: 24px 24px, 100% 100%;
          opacity: .7;
        }

        .nyai-orbit {
          position: absolute;
          width: 118px;
          height: 118px;
          right: 32px;
          bottom: 28px;
          border: 1px solid rgba(255, 218, 122, .28);
          border-radius: 50%;
          box-shadow: inset 0 0 0 12px rgba(255, 218, 122, .04);
          animation: nyaiSpin 16s linear infinite;
          pointer-events: none;
        }

        .nyai-orbit::before,
        .nyai-orbit::after {
          content: "";
          position: absolute;
          border-radius: 50%;
          background: #ffd976;
        }

        .nyai-orbit::before {
          width: 7px;
          height: 7px;
          left: 12px;
          top: 14px;
        }

        .nyai-orbit::after {
          width: 4px;
          height: 4px;
          right: 20px;
          bottom: 18px;
        }

        .nyai-image-shell {
          overflow: hidden;
          aspect-ratio: 1 / 1;
          border-radius: 8px;
          border: 1px solid rgba(255, 222, 144, .34);
          background: #2a100f;
          position: relative;
          z-index: 1;
        }

        .nyai-image-shell::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, transparent 44%, rgba(36, 10, 8, .48));
          pointer-events: none;
        }

        .nyai-image-shell img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .nyai-image-badge {
          position: absolute;
          left: 12px;
          bottom: 12px;
          z-index: 2;
          min-height: 28px;
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid rgba(255, 229, 160, .46);
          background: rgba(47, 15, 12, .72);
          color: #ffe8a8;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: .02em;
          backdrop-filter: blur(8px);
        }

        .nyai-intro-copy h1 {
          max-width: 780px;
          margin: 14px 0 12px;
          font-family: CodeDestinyDisplay, CodeDestinyBody, serif;
          font-size: clamp(36px, 5.2vw, 72px);
          line-height: 1.08;
          letter-spacing: 0;
          color: #fff0bf;
          text-shadow: 0 12px 34px rgba(48, 6, 10, .42);
        }

        .nyai-intro-copy p {
          max-width: 680px;
          margin: 0;
          color: rgba(255, 247, 227, .82);
          font-size: 16px;
          line-height: 1.7;
        }

        .nyai-hero-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 16px;
        }

        .nyai-hero-badges span {
          min-height: 28px;
          padding: 6px 10px;
          border: 1px solid rgba(255, 224, 154, .26);
          border-radius: 8px;
          background: rgba(255, 248, 226, .08);
          color: #ffedc0;
          font-size: 12px;
          font-weight: 800;
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
          color: #ffe09a;
          font-weight: 700;
        }

        .nyai-status {
          margin-top: 18px;
          min-height: 34px;
          padding: 8px 10px;
          border-radius: 8px;
          background: rgba(255, 235, 174, .13);
          color: #ffe7a8;
          font-size: 14px;
          border: 1px solid rgba(255, 218, 122, .18);
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
          color: #ffe09a;
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
          color: rgba(255, 247, 227, .78);
          font-size: 13px;
          font-weight: 700;
        }

        .nyai-form input,
        .nyai-form select,
        .nyai-form textarea {
          width: 100%;
          border: 1px solid rgba(246, 203, 115, .28);
          border-radius: 8px;
          background: rgba(255, 250, 235, .1);
          color: #fff8e6;
          font: inherit;
          outline: none;
        }

        .nyai-form input:focus,
        .nyai-form select:focus,
        .nyai-form textarea:focus {
          border-color: rgba(255, 218, 122, .72);
          box-shadow: 0 0 0 3px rgba(255, 218, 122, .12);
        }

        .nyai-form input,
        .nyai-form select {
          min-height: 44px;
          padding: 0 12px;
        }

        .nyai-form select option {
          color: #141922;
        }

        .nyai-focus-panel {
          display: grid;
          gap: 10px;
          margin-top: 12px;
          padding: 12px;
          border: 1px solid rgba(253, 230, 138, .22);
          border-radius: 8px;
          background: rgba(12, 10, 9, .28);
        }

        .nyai-focus-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          color: #ffedc0;
          font-size: 13px;
        }

        .nyai-focus-head span {
          color: #fcd34d;
          font-weight: 900;
        }

        .nyai-category-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .nyai-category-chip {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-height: 36px;
          padding: 0 11px;
          border: 1px solid rgba(253, 230, 138, .28);
          border-radius: 8px;
          background: rgba(255, 255, 255, .08);
          color: #fef3c7;
          font: inherit;
          font-size: 13px;
          font-weight: 850;
          cursor: pointer;
        }

        .nyai-category-chip span {
          display: inline-grid;
          place-items: center;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: radial-gradient(circle at 32% 24%, #fff7d6, #fbbf24 55%, #92400e);
          color: #40100d;
          font-size: 12px;
          font-weight: 900;
        }

        .nyai-category-chip.is-active {
          border-color: rgba(253, 230, 138, .72);
          background: rgba(245, 158, 11, .2);
          color: #fff7ed;
          box-shadow: 0 0 0 3px rgba(245, 158, 11, .1);
        }

        .nyai-topic {
          margin-top: 12px;
        }

        .nyai-form textarea {
          min-height: 132px;
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
          background: rgba(245, 213, 141, .12);
          border: 1px solid rgba(245, 213, 141, .16);
        }

        .nyai-error {
          color: #ffd8d8;
          background: rgba(117, 24, 54, .32);
          border: 1px solid rgba(255, 168, 168, .18);
        }

        .nyai-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 46px;
          border: 0;
          border-radius: 8px;
          color: #2a100f;
          background: linear-gradient(135deg, #ffe8a8, #d89a38 48%, #ffd976);
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 12px 28px rgba(74, 17, 13, .26);
        }

        .nyai-primary {
          width: 100%;
          margin-top: 16px;
        }

        .nyai-primary:disabled,
        .nyai-category-chip:disabled {
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
          color: rgba(255, 247, 227, .72);
        }

        .nyai-empty p {
          margin: 0 0 8px;
          color: #ffe09a;
          font-size: 18px;
          font-weight: 800;
        }

        .nyai-empty span {
          font-size: 14px;
        }

        .nyai-message {
          max-width: 100%;
          padding: 14px 15px;
          border-radius: 8px;
          white-space: pre-wrap;
          line-height: 1.72;
        }

        .nyai-message span {
          display: block;
          margin-bottom: 7px;
          color: #ffe09a;
          font-size: 12px;
          font-weight: 800;
        }

        .nyai-message p {
          margin: 0;
          color: #fff8e6;
        }

        .nyai-message--assistant {
          align-self: flex-start;
          background: rgba(255, 248, 226, .09);
          border: 1px solid rgba(245, 213, 141, .22);
        }

        .nyai-message--user {
          align-self: flex-end;
          background: rgba(58, 31, 48, .42);
          border: 1px solid rgba(255, 224, 154, .16);
        }

        .nyai-section-list {
          display: grid;
          gap: 10px;
        }

        .nyai-result-section {
          padding: 15px;
          border: 1px solid rgba(255, 224, 154, .22);
          border-radius: 8px;
          background:
            linear-gradient(180deg, rgba(255, 250, 235, .1), rgba(255, 250, 235, .045)),
            rgba(46, 19, 15, .34);
        }

        .nyai-result-section h3 {
          margin: 0 0 8px;
          color: #ffe09a;
          font-size: 15px;
          line-height: 1.35;
          letter-spacing: 0;
        }

        .nyai-result-section p {
          margin: 0;
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
        }
      `}</style>
    </main>
  );
}
