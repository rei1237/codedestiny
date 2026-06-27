"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { CalendarDays, Loader2, MessageCircle, Moon, Send, Sparkles, Stars, WalletCards } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import { runBillingCoinGate } from "@/app/_lib/billing-client";

type AccessType = "pass" | "paid" | "subscription" | "admin";
type CalendarType = "solar" | "lunar";
type Gender = "female" | "male" | "other" | "";
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
};

type FormState = {
  name: string;
  gender: Gender;
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  calendarType: CalendarType;
  isLeapMonth: boolean;
  topic: string;
  userQuestion: string;
};

const FEATURE_KEY = "ziwei-ai-consultation";
const FEATURE_REASON = "자미두수 AI 상담";
const FEATURE_COST = 300;
const FEATURE_AMOUNT_KRW = 30000;
const FEATURE_MEMBERSHIP_CREDIT_COST = 3000;

const ERROR_TEXT: Record<string, string> = {
  LOGIN_REQUIRED: "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.",
  PAYMENT_REQUIRED: "자미두수 AI 상담 이용권이 필요합니다. 결제창을 열어드릴게요.",
  PAYMENT_VERIFY_FAILED: "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.",
  INVALID_INPUT: "생년월일과 출생시간 정보를 다시 확인해 주세요.",
  CALCULATION_FAILED: "자미두수 명반 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.",
  SERVER_ERROR: "상담을 준비하는 중 문제가 발생했습니다. 결제 금액은 차감되지 않았습니다.",
  LLM_ERROR: "AI 상담 답변을 생성하지 못했습니다. 이용권 또는 결제 권한은 보존되었으니 다시 시도해 주세요.",
};

const TOPICS = [
  "전체 명반 해석",
  "타고난 성향",
  "인생의 큰 흐름",
  "직업/사업운",
  "재물운",
  "연애/결혼운",
  "인간관계",
  "가족/부모운",
  "건강/멘탈",
  "이직/창업",
  "올해 운세",
  "대운 흐름",
  "현재 고민 상담",
];

const defaultForm: FormState = {
  name: "",
  gender: "",
  birthDate: "",
  birthTime: "",
  birthTimeUnknown: false,
  calendarType: "solar",
  isLeapMonth: false,
  topic: "전체 명반 해석",
  userQuestion: "",
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

function toPayload(form: FormState) {
  return {
    birthInfo: {
      name: form.name.trim(),
      gender: form.gender,
      birthDate: form.birthDate,
      birthTime: form.birthTimeUnknown ? "" : form.birthTime,
      birthTimeUnknown: form.birthTimeUnknown,
      calendarType: form.calendarType,
      isLeapMonth: form.calendarType === "lunar" ? form.isLeapMonth : false,
    },
    topic: form.topic,
    userQuestion: form.userQuestion.trim(),
  };
}

function mapError(result: ApiResult, status = 0) {
  const reason = String(result?.reason || "").toUpperCase();
  if (reason && ERROR_TEXT[reason]) return ERROR_TEXT[reason];
  if (status === 401) return ERROR_TEXT.LOGIN_REQUIRED;
  if (status === 402) return ERROR_TEXT.PAYMENT_VERIFY_FAILED;
  return result?.message || ERROR_TEXT.SERVER_ERROR;
}

function billingEvidenceFromGate(data: Record<string, unknown> | null | undefined) {
  const record = data && typeof data === "object" ? data : {};
  return {
    pricing: record.pricing || null,
    consume: record.consume || null,
    accessGrant: record.accessGrant || null,
    accessType: record.accessType || null,
    accessMethod: record.accessMethod || null,
    paymentMode: record.paymentMode || null,
    freeBySubscription: record.freeBySubscription === true,
    transactionId: (record.consume as Record<string, unknown> | undefined)?.transactionId || record.transactionId || "",
    paymentId: (record.accessGrant as Record<string, unknown> | undefined)?.paymentId || record.paymentId || "",
  };
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
  const payload = useMemo(() => toPayload(form), [form]);
  const summary = consultation?.summaryCards || {};
  const palaces = consultation?.ziweiChart?.palaces || [];
  const assistantMessages = consultation?.messages?.filter((message) => message.role === "assistant") || [];

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function startConsultation(idempotencyKey: string, extra: Record<string, unknown>) {
    setPhase("reading");
    setNotice("별궁의 흐름을 읽고 있습니다");
    const { status, data } = await postJson<ApiResult>("/api/ziwei-ai/start", {
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
      setNotice("별궁의 흐름을 읽고 있습니다");
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
    setNotice("자미두수 명반을 펼치고 있습니다");
    setPhase("checking");

    try {
      if (!form.birthDate || (!form.birthTimeUnknown && !form.birthTime) || !form.gender) {
        throw new Error(ERROR_TEXT.INVALID_INPUT);
      }

      setPhase("payment");
      setNotice("결제창을 확인해 주세요");
      const gate = await runBillingCoinGate({
        featureKey: FEATURE_KEY,
        reason: FEATURE_REASON,
        requestId: idempotencyKey,
        idempotencyKey,
        forceDeduct: true,
        cost: FEATURE_COST,
        coinPrice: FEATURE_COST,
        amountKRW: FEATURE_AMOUNT_KRW,
        priceKRW: FEATURE_AMOUNT_KRW,
        membershipCreditCost: FEATURE_MEMBERSHIP_CREDIT_COST,
        productId: FEATURE_KEY,
        productType: "digital_content",
        serviceType: "ziwei-ai",
      });

      if (!gate.ok || !gate.data) {
        const code = String(gate.error?.code || "").toUpperCase();
        if (code === "AUTH_REQUIRED") throw new Error(ERROR_TEXT.LOGIN_REQUIRED);
        if (code === "PAYMENT_CANCELLED" || code === "PAYMENT_REQUIRED" || gate.status === 402) throw new Error(ERROR_TEXT.PAYMENT_VERIFY_FAILED);
        throw new Error(gate.error?.message || ERROR_TEXT.SERVER_ERROR);
      }

      await startConsultation(idempotencyKey, {
        billingEvidence: billingEvidenceFromGate(gate.data as Record<string, unknown>),
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : ERROR_TEXT.SERVER_ERROR);
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
    setNotice("별궁의 흐름을 읽고 있습니다");
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
        <div className="heroCopy">
          <p className="eyebrow"><Stars size={16} /> 紫微斗數</p>
          <h1>자미두수 AI 상담</h1>
          <p>명궁과 신궁, 12궁의 별 흐름을 놓고 지금 가장 궁금한 질문부터 차분히 풀어드립니다.</p>
        </div>
      </section>

      <section className="workspace">
        <form className="consultForm" onSubmit={handleSubmit}>
          <div className="formHeader">
            <Sparkles size={20} />
            <strong>명반 정보</strong>
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
                <option value="other">기타</option>
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
            <select value={form.topic} onChange={(event) => update("topic", event.target.value)} disabled={busy}>
              {TOPICS.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
            </select>
          </label>

          <label>
            <span>현재 가장 궁금한 질문</span>
            <textarea value={form.userQuestion} onChange={(event) => update("userQuestion", event.target.value)} maxLength={1200} rows={5} disabled={busy} />
          </label>

          <button className="primaryBtn" type="submit" disabled={busy}>
            {busy ? <Loader2 className="spin" size={18} /> : <WalletCards size={18} />}
            자미두수 AI 상담 받기
          </button>

          {notice && <p className="notice"><Moon size={16} />{notice}</p>}
          {error && <p className="error">{error}</p>}
        </form>

        <div className="resultPane">
          {!consultation ? (
            <div className="emptyState">
              <CalendarDays size={34} />
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
                {assistantMessages.map((message, index) => (
                  <article className="chatCard" key={`${message.createdAt || index}`}>
                    <MessageCircle size={18} />
                    <p>{message.content}</p>
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

      <style jsx>{`
        .ziweiAiShell{min-height:100dvh;background:radial-gradient(circle at 18% 10%,rgba(168,85,247,.28),transparent 30%),radial-gradient(circle at 82% 0%,rgba(250,204,21,.14),transparent 24%),linear-gradient(160deg,#07061b 0%,#151033 45%,#090817 100%);color:#f8fafc;padding:22px}
        .ziweiHero{position:relative;min-height:270px;display:flex;align-items:flex-end;overflow:hidden;border:1px solid rgba(216,180,254,.25);border-radius:8px;background:#08071a;box-shadow:0 24px 70px rgba(0,0,0,.38)}
        .heroMedia{position:absolute;inset:0}
        .heroMedia img{width:100%;height:100%;object-fit:cover;opacity:.45;filter:saturate(115%) contrast(108%)}
        .heroMedia::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,6,27,.92),rgba(7,6,27,.54) 48%,rgba(7,6,27,.22)),linear-gradient(0deg,rgba(7,6,27,.72),transparent 44%)}
        .heroCopy{position:relative;max-width:760px;padding:34px}
        .eyebrow{display:inline-flex;align-items:center;gap:7px;margin:0 0 12px;color:#fde68a;font-size:13px;font-weight:800}
        h1{margin:0;color:#fff7ed;font-size:clamp(34px,6vw,70px);line-height:1.02;letter-spacing:0}
        .heroCopy p:last-child{max-width:610px;margin:14px 0 0;color:#ddd6fe;font-size:17px;line-height:1.7}
        .workspace{display:grid;grid-template-columns:minmax(310px,440px) minmax(0,1fr);gap:18px;max-width:1360px;margin:18px auto 0}
        .consultForm,.resultPane{border:1px solid rgba(216,180,254,.22);border-radius:8px;background:linear-gradient(180deg,rgba(24,18,55,.86),rgba(12,10,31,.9));box-shadow:0 18px 52px rgba(0,0,0,.28)}
        .consultForm{display:grid;gap:14px;align-self:start;padding:18px;position:sticky;top:16px}
        .formHeader{display:flex;align-items:center;gap:8px;color:#fef3c7;font-size:18px}
        label{display:grid;gap:7px;color:#ddd6fe;font-size:13px;font-weight:800}
        input,select,textarea{width:100%;border:1px solid rgba(216,180,254,.24);border-radius:8px;background:rgba(4,5,19,.72);color:#fff;padding:11px 12px;font:inherit;outline:none}
        textarea{resize:vertical;min-height:118px;line-height:1.55}
        input:focus,select:focus,textarea:focus{border-color:#f0abfc;box-shadow:0 0 0 3px rgba(217,70,239,.16)}
        .fieldRow{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .toggles{display:flex;gap:10px;flex-wrap:wrap}
        .check{display:inline-flex;grid-template-columns:auto 1fr;align-items:center;gap:8px;border:1px solid rgba(216,180,254,.18);border-radius:8px;background:rgba(255,255,255,.05);padding:9px 10px}
        .check input{width:16px;height:16px;padding:0}
        .primaryBtn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;border:0;border-radius:8px;background:linear-gradient(135deg,#fde68a,#d8b4fe 45%,#a78bfa);color:#111022;font-weight:950;cursor:pointer;box-shadow:0 16px 32px rgba(168,85,247,.28)}
        .primaryBtn:disabled{cursor:not-allowed;opacity:.66}
        .notice,.error{display:flex;align-items:center;gap:7px;margin:0;border-radius:8px;padding:10px 11px;font-size:13px;line-height:1.5}
        .notice{border:1px solid rgba(253,230,138,.28);background:rgba(253,230,138,.09);color:#fef3c7}
        .error{border:1px solid rgba(248,113,113,.35);background:rgba(127,29,29,.28);color:#fecaca}
        .resultPane{min-height:620px;padding:18px}
        .emptyState{min-height:560px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;color:#c4b5fd}
        .emptyState strong{color:#fff7ed;font-size:20px}
        .summaryGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px}
        .summaryGrid div{min-height:92px;border:1px solid rgba(253,230,138,.2);border-radius:8px;background:linear-gradient(145deg,rgba(253,230,138,.1),rgba(168,85,247,.12));padding:13px}
        .summaryGrid span{display:block;color:#c4b5fd;font-size:12px;font-weight:800}
        .summaryGrid strong{display:block;margin-top:9px;color:#fff7ed;font-size:16px;line-height:1.45;word-break:keep-all}
        .palaceGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-bottom:15px}
        .palaceCard{min-height:116px;border:1px solid rgba(216,180,254,.18);border-radius:8px;background:rgba(255,255,255,.055);padding:11px}
        .palaceCard div{display:flex;justify-content:space-between;gap:8px;color:#fef3c7}
        .palaceCard div span{color:#c4b5fd;font-size:12px}
        .palaceCard p{margin:12px 0 8px;color:#fff;font-size:13px;line-height:1.45}
        .palaceCard small{color:#d8b4fe;line-height:1.4}
        .chatList{display:grid;gap:12px}
        .chatCard{display:grid;grid-template-columns:auto 1fr;gap:10px;border:1px solid rgba(216,180,254,.22);border-radius:8px;background:linear-gradient(145deg,rgba(10,10,31,.92),rgba(35,26,72,.78));padding:16px;color:#f8fafc}
        .chatCard p{margin:0;white-space:pre-wrap;line-height:1.82;font-size:15px}
        .chatCard svg{margin-top:5px;color:#fcd34d}
        .chatInput{display:grid;grid-template-columns:1fr 48px;gap:8px;margin-top:14px}
        .chatInput button{border:0;border-radius:8px;background:#fef3c7;color:#171225;cursor:pointer}
        .chatInput button:disabled{opacity:.55;cursor:not-allowed}
        .spin{animation:spin 1s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:980px){.workspace{grid-template-columns:1fr}.consultForm{position:static}.summaryGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.palaceGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:620px){.ziweiAiShell{padding:10px}.ziweiHero{min-height:230px}.heroCopy{padding:22px}.fieldRow,.summaryGrid,.palaceGrid{grid-template-columns:1fr}.resultPane{min-height:420px;padding:12px}.emptyState{min-height:330px}.chatCard{grid-template-columns:1fr}.chatCard svg{display:none}}
      `}</style>
    </main>
  );
}
