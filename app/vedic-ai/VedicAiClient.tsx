"use client";

import { useMemo, useRef, useState } from "react";
import { CalendarDays, Clock3, Compass, Loader2, MapPin, Moon, Send, Sparkles, Star } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import { runBillingCoinGate } from "@/app/_lib/billing-client";
import styles from "./VedicAiClient.module.css";

type Gender = "male" | "female" | "other" | "";
type Phase = "idle" | "access" | "payment" | "start" | "chat";
type Message = {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};
type BirthPlace = {
  city: string;
  country: string;
  timezone: string;
  latitude?: number;
  longitude?: number;
};
type FormState = {
  name: string;
  gender: Gender;
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  birthPlace: BirthPlace;
  topic: string;
  userQuestion: string;
};
type SummaryCards = {
  lagna?: string;
  moonSign?: string;
  nakshatra?: string;
  currentDasha?: string;
  keywords?: string[];
  d1?: Record<string, unknown> | null;
  d9?: Record<string, unknown> | null;
};
type Consultation = {
  id: string;
  status: string;
  birthInfo: Record<string, unknown>;
  topic: string;
  userQuestion?: string;
  vedicChart: Record<string, unknown>;
  accessType: "pass" | "paid" | "subscription";
  paymentId?: string;
  messages: Message[];
  summaryCards?: SummaryCards;
};
type EnsureAccessResult =
  | { ok: true; accessToken: string; accessType: "pass" | "paid" | "subscription"; consultation?: Consultation }
  | { ok: false; reason: "PAYMENT_REQUIRED"; paymentPayload: Record<string, unknown>; message?: string }
  | { ok: false; reason: "LOGIN_REQUIRED"; message?: string }
  | { ok: false; reason: "INVALID_INPUT"; message: string };

const FEATURE_KEY = "vedic-ai-consultation";
const FEATURE_COST = 300;
const AMOUNT_KRW = 30000;
const REASON = "베다점 AI 상담";

const TOPICS = [
  "전체 인생 흐름",
  "타고난 성향",
  "영혼의 방향성",
  "직업/사업운",
  "재물운",
  "연애/결혼운",
  "인간관계",
  "가족/부모운",
  "건강/멘탈",
  "이직/창업",
  "올해 운세",
  "다샤 흐름",
  "현재 고민 상담",
  "인생 전환기 상담",
];

const PLACE_PRESETS: BirthPlace[] = [
  { city: "서울", country: "한국", timezone: "Asia/Seoul", latitude: 37.5665, longitude: 126.9780 },
  { city: "부산", country: "한국", timezone: "Asia/Seoul", latitude: 35.1796, longitude: 129.0756 },
  { city: "인천", country: "한국", timezone: "Asia/Seoul", latitude: 37.4563, longitude: 126.7052 },
  { city: "대구", country: "한국", timezone: "Asia/Seoul", latitude: 35.8714, longitude: 128.6014 },
  { city: "제주", country: "한국", timezone: "Asia/Seoul", latitude: 33.4996, longitude: 126.5312 },
  { city: "Tokyo", country: "Japan", timezone: "Asia/Tokyo", latitude: 35.6762, longitude: 139.6503 },
  { city: "New York", country: "USA", timezone: "America/New_York", latitude: 40.7128, longitude: -74.0060 },
  { city: "Los Angeles", country: "USA", timezone: "America/Los_Angeles", latitude: 34.0522, longitude: -118.2437 },
  { city: "Delhi", country: "India", timezone: "Asia/Kolkata", latitude: 28.6139, longitude: 77.2090 },
  { city: "Mumbai", country: "India", timezone: "Asia/Kolkata", latitude: 19.0760, longitude: 72.8777 },
];

const ERROR_TEXT: Record<string, string> = {
  LOGIN_REQUIRED: "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.",
  PAYMENT_REQUIRED: "베다점 AI 상담 이용권이 필요합니다. 결제창을 열어드릴게요.",
  PAYMENT_VERIFY_FAILED: "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.",
  INVALID_INPUT: "생년월일, 출생시간, 출생지 정보를 다시 확인해 주세요.",
  BIRTH_PLACE_INVALID: "출생지 정보를 확인하지 못했습니다. 도시와 국가를 다시 입력해 주세요.",
  CHART_CALCULATION_FAILED: "베다 차트 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.",
  SERVER_ERROR: "상담을 준비하는 중 문제가 발생했습니다. 결제 금액은 차감되지 않았습니다.",
  LLM_FAILED: "AI 상담 답변을 생성하지 못했습니다. 이용권 또는 결제 권한은 보존되었으니 다시 시도해 주세요.",
};

const initialForm: FormState = {
  name: "",
  gender: "",
  birthDate: "",
  birthTime: "12:00",
  birthTimeUnknown: false,
  birthPlace: { ...PLACE_PRESETS[0] },
  topic: TOPICS[0],
  userQuestion: "",
};

function makeIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `vedic-ai-${crypto.randomUUID()}`;
  }
  return `vedic-ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
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
    || Object.keys(asRecord(payload.consume)).length
  );
}

function extractPayment(result: unknown, fallbackRequestId: string) {
  const record = asRecord(result);
  const payload = runtimePayload(result);
  const payment = asRecord(payload.payment);
  const accessGrant = asRecord(payload.accessGrant);
  const consume = asRecord(payload.consume);
  const paymentId = toText(
    record.paymentId
    || record.transactionId
    || record.purchaseId
    || payload.paymentId
    || payload.transactionId
    || payload.purchaseId
    || payment.paymentId
    || payment.impUid
    || payment.merchantUid
    || accessGrant.paymentId
    || accessGrant.purchaseId
    || fallbackRequestId
  );
  return {
    paymentId,
    transactionId: paymentId,
    paymentEvidence: payload,
    payment: { ...payment, paymentId, requestId: fallbackRequestId },
    accessGrant,
    consume,
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

function chartPoint(chart: Record<string, unknown>, key: string) {
  return asRecord(chart[key]);
}

function planetSummary(chart: Record<string, unknown>, name: string) {
  const planets = Array.isArray(chart.planets) ? chart.planets : [];
  const found = planets.map(asRecord).find((planet) => toText(planet.name) === name);
  if (!found) return "";
  return [found.sign, found.house ? `${found.house}H` : "", found.nakshatra].filter(Boolean).join(" · ");
}

function vargaPlanetSign(chart: Record<string, unknown>, chartKey: string, planetName: string) {
  const divisionalCharts = asRecord(chart.divisionalCharts);
  const varga = asRecord(divisionalCharts[chartKey]);
  return toText(asRecord(varga[planetName]).sign);
}

export default function VedicAiClient() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [chatInput, setChatInput] = useState("");
  const submitKeyRef = useRef("");

  const busy = phase === "access" || phase === "payment" || phase === "start";
  const chatBusy = phase === "chat";
  const payload = useMemo(() => ({
    birthInfo: {
      name: form.name,
      gender: form.gender,
      birthDate: form.birthDate,
      birthTime: form.birthTimeUnknown ? "" : form.birthTime,
      birthTimeUnknown: form.birthTimeUnknown,
      birthPlace: form.birthPlace,
    },
    topic: form.topic,
    userQuestion: form.userQuestion,
  }), [form]);

  const phaseText = useMemo(() => {
    if (phase === "access") return "베다 차트를 펼치고 있습니다";
    if (phase === "payment") return "결제창을 확인해 주세요";
    if (phase === "start") return "별과 다샤의 흐름을 읽고 있습니다";
    if (phase === "chat") return "상담의 흐름을 이어가고 있습니다";
    return "";
  }, [phase]);

  const canSubmit = Boolean(form.gender && form.birthDate && form.topic && (form.birthTimeUnknown || form.birthTime) && (form.birthPlace.city || form.birthPlace.latitude));

  function updateForm(patch: Partial<FormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function updatePlace(patch: Partial<BirthPlace>) {
    setForm((current) => ({ ...current, birthPlace: { ...current.birthPlace, ...patch } }));
  }

  function applyPreset(value: string) {
    const preset = PLACE_PRESETS.find((place) => `${place.city}, ${place.country}` === value);
    if (preset) updatePlace({ ...preset });
  }

  async function startConsultation(idempotencyKey: string, access: Record<string, unknown>, paymentWasRequired = false) {
    setPhase("start");
    const { status, data } = await postJson<{ ok?: boolean; reason?: string; message?: string; consultation?: Consultation }>(
      "/api/vedic-ai/start",
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
    throw new Error(toText(data.reason) || (status === 401 ? "LOGIN_REQUIRED" : "SERVER_ERROR"));
  }

  async function handleSubmit() {
    if (busy) return;
    if (!canSubmit) {
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
        "/api/vedic-ai/ensure-access",
        { ...payload, idempotencyKey },
        idempotencyKey,
      );
      if (data.ok) {
        if (data.consultation) {
          setConsultation(data.consultation);
          setPhase("idle");
          submitKeyRef.current = "";
          return;
        }
        await startConsultation(idempotencyKey, { accessToken: data.accessToken, accessType: data.accessType });
        return;
      }
      if (data.reason === "LOGIN_REQUIRED") throw new Error("LOGIN_REQUIRED");
      if (data.reason === "INVALID_INPUT") throw new Error("INVALID_INPUT");
      setNotice(ERROR_TEXT.PAYMENT_REQUIRED);
      setPhase("payment");
      const paymentPayload = asRecord(data.paymentPayload);
      const gate = await runBillingCoinGate({
        featureKey: FEATURE_KEY,
        subFeatureKey: FEATURE_KEY,
        productId: toText(paymentPayload.productId) || FEATURE_KEY,
        serviceType: "vedic-ai",
        reason: toText(paymentPayload.reason) || REASON,
        forceDeduct: true,
        requestId: idempotencyKey,
        idempotencyKey,
        cost: toNumber(paymentPayload.cost ?? paymentPayload.coinPrice, FEATURE_COST),
        coinPrice: toNumber(paymentPayload.coinPrice ?? paymentPayload.cost, FEATURE_COST),
        amountKRW: toNumber(paymentPayload.amountKRW ?? paymentPayload.amountKrw ?? paymentPayload.paymentAmount, AMOUNT_KRW),
        membershipCreditCost: toNumber(paymentPayload.membershipCreditCost, FEATURE_COST * 10),
      });
      if (!isPaymentGranted(gate)) throw new Error("PAYMENT_VERIFY_FAILED");
      await startConsultation(idempotencyKey, extractPayment(gate, idempotencyKey), true);
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "SERVER_ERROR";
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
      const { status, data } = await postJson<{ ok?: boolean; reason?: string; consultation?: Consultation }>(
        "/api/vedic-ai/message",
        { consultationId: consultation.id, message },
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

  const chart = consultation?.vedicChart || {};
  const summary = consultation?.summaryCards || {};
  const lagna = chartPoint(chart, "lagna");
  const moon = chartPoint(chart, "moon");

  return (
    <main className={styles.shell}>
      <section className={styles.hero}>
        <div className={styles.backdrop} />
        <div className={styles.heroInner}>
          <div className={styles.copy}>
            <span className={styles.eyebrow}><Sparkles size={16} /> Jyotish Consultation</span>
            <h1>베다점 AI 상담</h1>
            <p>출생 순간의 라그나, 문 사인, 낙샤트라와 다샤 흐름을 바탕으로 지금의 질문을 깊게 읽어드립니다.</p>
            <div className={styles.pricePill}>30,000원 · 이용권 · 월정석 · 단건결제</div>
          </div>
          <div className={styles.imagePanel} aria-hidden="true">
            <img src="/fuctionassets/veda.webp" alt="" />
          </div>
        </div>
      </section>

      <section className={styles.workspace}>
        <form className={styles.formPanel} onSubmit={(event) => { event.preventDefault(); void handleSubmit(); }}>
          <div className={styles.panelHeader}>
            <span><Star size={18} /> 출생정보</span>
            <strong>{FEATURE_COST}코인</strong>
          </div>

          <div className={styles.formGrid}>
            <label>
              <span>이름 또는 닉네임</span>
              <input value={form.name} onChange={(event) => updateForm({ name: event.target.value })} maxLength={80} disabled={busy} placeholder="상담에서 부를 이름" />
            </label>
            <label>
              <span>성별</span>
              <select value={form.gender} onChange={(event) => updateForm({ gender: event.target.value as Gender })} disabled={busy}>
                <option value="">선택</option>
                <option value="female">여성</option>
                <option value="male">남성</option>
                <option value="other">기타/비공개</option>
              </select>
            </label>
            <label>
              <span><CalendarDays size={15} /> 생년월일</span>
              <input type="date" value={form.birthDate} onChange={(event) => updateForm({ birthDate: event.target.value })} disabled={busy} />
            </label>
            <label>
              <span><Clock3 size={15} /> 출생시간</span>
              <input type="time" value={form.birthTime} onChange={(event) => updateForm({ birthTime: event.target.value })} disabled={busy || form.birthTimeUnknown} />
            </label>
          </div>

          <label className={styles.checkRow}>
            <input type="checkbox" checked={form.birthTimeUnknown} onChange={(event) => updateForm({ birthTimeUnknown: event.target.checked })} disabled={busy} />
            <span>출생시간을 정확히 모릅니다</span>
          </label>
          {form.birthTimeUnknown && (
            <p className={styles.softNotice}>출생시간이 불확실하면 라그나와 하우스는 조심스럽게 보고, Moon Chart 중심으로 상담합니다.</p>
          )}

          <div className={styles.formGrid}>
            <label>
              <span><MapPin size={15} /> 출생지</span>
              <input
                list="vedic-place-presets"
                value={`${form.birthPlace.city}${form.birthPlace.country ? `, ${form.birthPlace.country}` : ""}`}
                onChange={(event) => {
                  applyPreset(event.target.value);
                  const [city, country = form.birthPlace.country] = event.target.value.split(",").map((item) => item.trim());
                  updatePlace({ city, country });
                }}
                disabled={busy}
                placeholder="도시, 국가"
              />
              <datalist id="vedic-place-presets">
                {PLACE_PRESETS.map((place) => <option key={`${place.city}-${place.country}`} value={`${place.city}, ${place.country}`} />)}
              </datalist>
            </label>
            <label>
              <span><Compass size={15} /> 시간대</span>
              <input value={form.birthPlace.timezone} onChange={(event) => updatePlace({ timezone: event.target.value })} disabled={busy} placeholder="Asia/Seoul" />
            </label>
          </div>

          <div className={styles.formGrid}>
            <label>
              <span>위도</span>
              <input type="number" step="0.0001" value={form.birthPlace.latitude ?? ""} onChange={(event) => updatePlace({ latitude: Number(event.target.value) })} disabled={busy} placeholder="37.5665" />
            </label>
            <label>
              <span>경도</span>
              <input type="number" step="0.0001" value={form.birthPlace.longitude ?? ""} onChange={(event) => updatePlace({ longitude: Number(event.target.value) })} disabled={busy} placeholder="126.9780" />
            </label>
          </div>

          <label>
            <span>상담 주제</span>
            <select value={form.topic} onChange={(event) => updateForm({ topic: event.target.value })} disabled={busy}>
              {TOPICS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <label>
            <span>현재 가장 궁금한 질문</span>
            <textarea value={form.userQuestion} onChange={(event) => updateForm({ userQuestion: event.target.value })} maxLength={1500} disabled={busy} placeholder="지금 가장 알고 싶은 흐름을 자유롭게 적어 주세요." />
          </label>

          {(error || notice || phaseText) && (
            <div className={error ? styles.errorBox : styles.noticeBox}>
              {phaseText && <Loader2 className={styles.spin} size={16} />}
              <span>{error || phaseText || notice}</span>
            </div>
          )}

          <button type="submit" className={styles.primaryButton} disabled={busy || !canSubmit}>
            {busy ? <Loader2 className={styles.spin} size={18} /> : <Moon size={18} />}
            베다점 AI 상담 받기
          </button>
        </form>

        <section className={styles.resultPanel}>
          {!consultation ? (
            <div className={styles.emptyState}>
              <Sparkles size={32} />
              <h2>차트를 펼치면 이곳에서 상담이 시작됩니다.</h2>
              <p>라그나, 문 사인, 낙샤트라, 현재 다샤의 핵심이 먼저 드러나고 이어서 대화가 열립니다.</p>
            </div>
          ) : (
            <>
              <div className={styles.summaryGrid}>
                <article><span>Lagna</span><strong>{summary.lagna || toText(lagna.sign) || "Moon Chart"}</strong></article>
                <article><span>Moon Sign</span><strong>{summary.moonSign || toText(moon.sign) || "-"}</strong></article>
                <article><span>Nakshatra</span><strong>{summary.nakshatra || toText(moon.nakshatra) || "-"}</strong></article>
                <article><span>현재 Dasha</span><strong>{summary.currentDasha || "-"}</strong></article>
              </div>

              <div className={styles.keywordRow}>
                {(summary.keywords || []).slice(0, 3).map((keyword) => <span key={keyword}>{keyword}</span>)}
              </div>

              <div className={styles.chartCards}>
                <article>
                  <span>D1 Rashi</span>
                  <strong>{planetSummary(chart, "Sun") || "Sun 흐름 준비됨"}</strong>
                  <p>{planetSummary(chart, "Rahu") || "Rahu/Ketu 축이 상담에 반영됩니다."}</p>
                </article>
                <article>
                  <span>D9 Navamsa</span>
                  <strong>{toText(asRecord(asRecord(summary.d9).Venus).sign) || vargaPlanetSign(chart, "d9", "Venus") || "내면의 성숙 흐름"}</strong>
                  <p>관계, 성숙, 후천적으로 열리는 운명의 질감을 함께 봅니다.</p>
                </article>
              </div>

              <div className={styles.chatList}>
                {consultation.messages.map((message, index) => (
                  <article key={`${message.role}-${index}`} className={message.role === "assistant" ? styles.assistantMsg : styles.userMsg}>
                    <span>{message.role === "assistant" ? "상담가" : "나"}</span>
                    <p>{message.content}</p>
                  </article>
                ))}
              </div>

              <div className={styles.chatInput}>
                <textarea value={chatInput} onChange={(event) => setChatInput(event.target.value)} disabled={chatBusy} placeholder="이어 묻고 싶은 내용을 적어 주세요." />
                <button type="button" onClick={() => void handleSendMessage()} disabled={chatBusy || chatInput.trim().length < 2}>
                  {chatBusy ? <Loader2 className={styles.spin} size={18} /> : <Send size={18} />}
                </button>
              </div>
            </>
          )}
        </section>
      </section>
    </main>
  );
}
