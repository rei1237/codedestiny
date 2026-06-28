"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Download, HeartHandshake, Loader2, Moon, Orbit, Sparkles, X } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import { runBillingCoinGate } from "@/app/_lib/billing-client";
import { readAiProfileSeed } from "@/app/_lib/ai-prefill-seed";
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
type ScoreKey = "destiny" | "harmony" | "emotion" | "growth" | "stability";
type CompatPersonMeta = {
  name: string;
  sukuyo: string;
  sukuyo_hanja: string;
  group: string;
  element: string;
  yin_yang: string;
  guardian: string;
  keyword: string;
};
type CompatResult = {
  meta: {
    person_a: CompatPersonMeta;
    person_b: CompatPersonMeta;
    relation: {
      type_a_to_b: string;
      type_b_to_a: string;
      distance: number;
      intensity: string;
    };
    scores: Record<ScoreKey, number> & { total: number };
  };
  sections: Record<string, { title: string; body: string }>;
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
const STEPS = ["내 달자리", "상대의 달자리"];
const LOADING_STAGES = [
  { phase: "🌑", label: "두 사람의 본명숙을 비추는 중입니다", sub: "본명숙 산출" },
  { phase: "🌒", label: "관계 거리를 따라 마음의 리듬을 읽는 중입니다", sub: "관계 유형 판정" },
  { phase: "🌓", label: "끌림과 갈등의 결을 차분히 살피는 중입니다", sub: "기질 분석" },
  { phase: "🌔", label: "AI 상담 문장을 정리하고 있습니다", sub: "종합 해석 생성" },
  { phase: "🌕", label: "두 사람에게 전할 달빛 답장을 완성하는 중입니다", sub: "최종 검토" },
];
const SECTION_ICONS: Record<string, string> = {
  essence: "☽",
  chemistry: "✦",
  conflict: "〜",
  timing: "◎",
  caution: "⚠",
  strength: "◈",
  prescription: "♡",
};
const SCORE_AXES: { key: ScoreKey; label: string; angle: number }[] = [
  { key: "destiny", label: "운명 인연", angle: -90 },
  { key: "harmony", label: "기질 조화", angle: -18 },
  { key: "emotion", label: "감정 공명", angle: 54 },
  { key: "growth", label: "성장 시너지", angle: 126 },
  { key: "stability", label: "장기 안정", angle: 198 },
];
const BAR_LABELS: Record<ScoreKey, string> = {
  destiny: "운명 인연도",
  harmony: "기질 조화도",
  emotion: "감정 공명도",
  growth: "성장 시너지",
  stability: "장기 안정도",
};
const MOON_PARTICLES = [
  { top: 12, left: 18, delay: 0.2, opacity: 0.68 },
  { top: 22, left: 74, delay: 1.1, opacity: 0.44 },
  { top: 34, left: 14, delay: 2.6, opacity: 0.5 },
  { top: 18, left: 48, delay: 3.2, opacity: 0.72 },
  { top: 42, left: 86, delay: 1.8, opacity: 0.36 },
  { top: 58, left: 22, delay: 0.7, opacity: 0.58 },
  { top: 64, left: 66, delay: 2.2, opacity: 0.62 },
  { top: 76, left: 38, delay: 3.7, opacity: 0.46 },
  { top: 82, left: 82, delay: 1.4, opacity: 0.55 },
  { top: 8, left: 88, delay: 2.9, opacity: 0.4 },
  { top: 48, left: 52, delay: 0.4, opacity: 0.64 },
  { top: 70, left: 8, delay: 3.4, opacity: 0.34 },
];

const EMPTY_PERSON: PersonForm = {
  name: "",
  gender: "unknown",
  birthDate: "",
  birthTime: "",
  calendarType: "solar",
};

function buildInitialPersonA(): PersonForm {
  const profile = readAiProfileSeed();
  if (!profile.name && !profile.gender && !profile.birthDate && !profile.birthTime && !profile.calendarType) {
    return { ...EMPTY_PERSON };
  }
  return {
    ...EMPTY_PERSON,
    name: profile.name || EMPTY_PERSON.name,
    gender: (profile.gender as PersonForm["gender"]) || EMPTY_PERSON.gender,
    birthDate: profile.birthDate || EMPTY_PERSON.birthDate,
    birthTime: profile.birthTimeUnknown === true ? "" : profile.birthTime || EMPTY_PERSON.birthTime,
    calendarType: profile.calendarType || EMPTY_PERSON.calendarType,
  };
}

const ERROR_TEXT: Record<string, string> = {
  LOGIN_REQUIRED: "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.",
  PAYMENT_REQUIRED: "숙요점 궁합 AI 상담 이용권이 필요합니다. 결제창을 열어드릴게요.",
  PAYMENT_VERIFY_FAILED: "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.",
  INVALID_INPUT: "상담에 필요한 정보가 부족해요. 두 사람의 생년월일과 달력 기준을 다시 확인해 주세요.",
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

function parseCompatResult(content: string): CompatResult | null {
  const source = content.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(source.slice(start, end + 1)) as CompatResult;
    if (!parsed?.meta?.person_a || !parsed?.meta?.person_b || !parsed?.meta?.scores || !parsed?.sections) return null;
    return parsed;
  } catch {
    return null;
  }
}

function latestAssistantJson(consultation: Consultation | null) {
  const message = [...(consultation?.messages || [])].reverse().find((item) => item.role === "assistant");
  return message ? parseCompatResult(message.content) : null;
}

function MoonLoadingScreen() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const intervals = [3000, 5000, 4000, 5000, 3000];
    let elapsed = 0;
    const timers = intervals.map((duration, index) => {
      elapsed += duration;
      return window.setTimeout(() => setStage(index), elapsed - duration);
    });
    return () => {
      timers.forEach(window.clearTimeout);
    };
  }, []);

  return (
    <div className={styles.loadingScreen} role="status" aria-live="polite">
      <div className={styles.loadingAura} aria-hidden="true" />
      <div className={styles.loadingStars} aria-hidden="true">
        {MOON_PARTICLES.map((particle, index) => (
          <span
            key={index}
            style={{
              top: `${particle.top}%`,
              left: `${particle.left}%`,
              animationDelay: `${particle.delay}s`,
              opacity: particle.opacity,
            }}
          />
        ))}
      </div>
      <div className={styles.loadingMoonWrap}>
        <div className={styles.loadingMoon}>{LOADING_STAGES[stage].phase}</div>
        <svg className={styles.loadingRing} viewBox="0 0 160 160" aria-hidden="true">
          <circle cx="80" cy="80" r="72" fill="none" stroke="url(#moonRing)" strokeWidth="1" strokeDasharray="3 12" />
          <defs>
            <linearGradient id="moonRing" gradientTransform="rotate(90)">
              <stop offset="0%" stopColor="#F4D98B" stopOpacity="0.62" />
              <stop offset="50%" stopColor="#AFA4FF" stopOpacity="0.34" />
              <stop offset="100%" stopColor="#F4D98B" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className={styles.loadingText}>
        <p>{LOADING_STAGES[stage].label}</p>
        <span>{LOADING_STAGES[stage].sub}</span>
      </div>
      <div className={styles.loadingDots}>
        {LOADING_STAGES.map((item, index) => (
          <span key={item.sub} className={index <= stage ? styles.loadingDotActive : styles.loadingDot}>
            <b>{item.phase}</b>
            <i />
          </span>
        ))}
      </div>
      <div className={styles.loadingBar}>
        <span />
      </div>
      <p className={styles.loadingFoot}>달빛이 두 사람의 관계 리듬을 차분히 읽고 있습니다</p>
    </div>
  );
}

function StarCard({ person }: { person: CompatPersonMeta }) {
  return (
    <div className={styles.starCard}>
      <span>{person.name}</span>
      <strong>{person.sukuyo}</strong>
      <em>{person.sukuyo_hanja}</em>
      <p>{person.keyword}</p>
    </div>
  );
}

function ScoreRadarChart({ scores }: { scores: CompatResult["meta"]["scores"] }) {
  const radius = 100;
  const cx = 160;
  const cy = 160;
  const toXY = (angle: number, r: number) => ({
    x: cx + r * Math.cos((angle * Math.PI) / 180),
    y: cy + r * Math.sin((angle * Math.PI) / 180),
  });
  const dataPoints = SCORE_AXES.map((axis) => toXY(axis.angle, radius * ((scores[axis.key] || 0) / 20)));
  const dataPath = `${dataPoints.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ")} Z`;

  return (
    <svg viewBox="0 0 320 320" className={styles.radarChart} aria-label="궁합 분석 차트">
      {[0.25, 0.5, 0.75, 1].map((ratio) => {
        const points = SCORE_AXES.map((axis) => toXY(axis.angle, radius * ratio));
        return <polygon key={ratio} points={points.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />;
      })}
      {SCORE_AXES.map((axis) => {
        const end = toXY(axis.angle, radius);
        return <line key={axis.key} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />;
      })}
      <path d={dataPath} fill="rgba(124,58,237,0.22)" stroke="rgba(167,139,250,0.78)" strokeWidth="1.5" />
      {dataPoints.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="3" fill="#a78bfa" />)}
      {SCORE_AXES.map((axis) => {
        const pos = toXY(axis.angle, radius + 22);
        return (
          <text key={axis.key} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="rgba(255,255,255,0.48)">
            {axis.label}
          </text>
        );
      })}
    </svg>
  );
}

function ScoreBarChart({ scores }: { scores: CompatResult["meta"]["scores"] }) {
  return (
    <div className={styles.scoreBars}>
      {(Object.entries(BAR_LABELS) as [ScoreKey, string][]).map(([key, label]) => {
        const score = scores[key] || 0;
        return (
          <div key={key} className={styles.scoreBarRow}>
            <div>
              <span>{label}</span>
              <strong>{score} / 20</strong>
            </div>
            <i><b style={{ width: `${(score / 20) * 100}%` }} /></i>
          </div>
        );
      })}
    </div>
  );
}

function TraitCompareTable({ a, b }: { a: CompatPersonMeta; b: CompatPersonMeta }) {
  const rows = [
    { label: "본명숙", va: `${a.sukuyo} ${a.sukuyo_hanja}`, vb: `${b.sukuyo} ${b.sukuyo_hanja}` },
    { label: "숙 그룹", va: a.group, vb: b.group },
    { label: "오행", va: a.element, vb: b.element },
    { label: "음양", va: a.yin_yang, vb: b.yin_yang },
    { label: "수호신", va: a.guardian, vb: b.guardian },
    { label: "핵심 기질", va: a.keyword, vb: b.keyword },
  ];
  return (
    <div className={styles.traitTable}>
      <div className={styles.traitHead}>
        <span>{a.name}</span>
        <span>구분</span>
        <span>{b.name}</span>
      </div>
      {rows.map((row) => (
        <div key={row.label} className={styles.traitRow}>
          <span>{row.va}</span>
          <em>{row.label}</em>
          <strong>{row.vb}</strong>
        </div>
      ))}
    </div>
  );
}

function chunkReadingSections(sections: Record<string, { title: string; body: string }>) {
  const entries = Object.entries(sections);
  return [
    entries.slice(0, 3),
    entries.slice(3, 5),
    entries.slice(5, 7),
  ].filter((group) => group.length);
}

function CompatResultModal({ result, onClose, onDownloadError }: { result: CompatResult; onClose: () => void; onDownloadError: (message: string) => void }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { meta, sections } = result;
  const readingPages = useMemo(() => chunkReadingSections(sections), [sections]);

  const handlePDF = async () => {
    const element = document.getElementById("compat-result-body");
    if (!element || isDownloading) return;
    setIsDownloading(true);
    try {
      const [{ default: html2canvas }, jsPdfModule] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const JsPDF = jsPdfModule.default || jsPdfModule.jsPDF;
      const pdf = new JsPDF("p", "mm", "a4");
      const pageWidth = 210;
      const pageHeight = 297;
      const pdfSections = Array.from(element.querySelectorAll<HTMLElement>("[data-pdf-section]"));
      for (const [index, section] of pdfSections.entries()) {
        const canvas = await html2canvas(section, {
          backgroundColor: "#060412",
          scale: 2,
          useCORS: true,
        });
        const imageData = canvas.toDataURL("image/png");
        const imageHeight = Math.min(pageHeight, (canvas.height / canvas.width) * pageWidth);
        if (index > 0) pdf.addPage();
        pdf.addImage(imageData, "PNG", 0, 0, pageWidth, imageHeight);
      }
      const fileName = `달빛궁합_${meta.person_a.name}_${meta.person_b.name}_${new Date().toLocaleDateString("ko-KR").replace(/\./g, "").replace(/ /g, "")}.pdf`.replace(/[\\/:*?"<>|]/g, "_");
      pdf.save(fileName);
    } catch {
      onDownloadError("PDF 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className={styles.resultModal} role="dialog" aria-modal="true" aria-label="달빛 궁합 답장">
      <header className={styles.modalHeader}>
        <div>
          <h1>달빛 궁합 답장</h1>
          <p>
            {meta.person_a.name} · {meta.person_a.sukuyo}
            <span>✦</span>
            {meta.person_b.name} · {meta.person_b.sukuyo}
          </p>
        </div>
        <div className={styles.modalActions}>
          <button type="button" onClick={handlePDF} disabled={isDownloading}>
            {isDownloading ? <Loader2 size={16} className={styles.spin} /> : <Download size={16} />}
            PDF 저장
          </button>
          <button type="button" onClick={onClose} aria-label="결과 닫기">
            <X size={16} />
            닫기
          </button>
        </div>
      </header>

      <div id="compat-result-body" className={styles.modalBody}>
        <section className={`${styles.coverSection} ${styles.pdfPage} ${styles.pdfCoverPage}`} data-pdf-section>
          <div className={styles.pdfMoonImage} aria-hidden="true">
            <span />
          </div>
          <div className={styles.pdfCoverDate}>{new Date().toLocaleDateString("ko-KR")}</div>
          <div className={styles.starPair}>
            <StarCard person={meta.person_a} />
            <div className={styles.relationBridge}>
              <span>{meta.relation.type_a_to_b.match(/\((.)\)/)?.[1] || "合"}</span>
              <em>{meta.relation.type_a_to_b}</em>
            </div>
            <StarCard person={meta.person_b} />
          </div>
          <div className={styles.pdfCoverScore}>
            <span>종합 궁합</span>
            <strong>{meta.scores.total}</strong>
            <em>/ 100</em>
          </div>
        </section>

        <section className={`${styles.chartSection} ${styles.pdfPage}`} data-pdf-section>
          <h2>궁합 분석 차트</h2>
          <ScoreRadarChart scores={meta.scores} />
          <div className={styles.totalBadge}>
            <span>종합 궁합</span>
            <strong>{meta.scores.total}</strong>
            <em>/ 100</em>
          </div>
          <ScoreBarChart scores={meta.scores} />
          <TraitCompareTable a={meta.person_a} b={meta.person_b} />
        </section>

        {readingPages.map((group, pageIndex) => (
          <section key={pageIndex} className={`${styles.pdfPage} ${styles.pdfReadingPage}`} data-pdf-section>
            {group.map(([key, section]) => (
              <article key={key} className={styles.readingSection}>
                <div>
                  <span>{SECTION_ICONS[key] || "✦"}</span>
                  <h3>{section.title}</h3>
                </div>
                <p>{section.body}</p>
              </article>
            ))}
          </section>
        ))}

        <footer className={`${styles.modalFooter} ${styles.pdfPage} ${styles.pdfFooterPage}`} data-pdf-section>
          <strong>Code Destiny</strong>
          <span>숙요점 궁합 · {new Date().toLocaleDateString("ko-KR")}</span>
          <p>이 해석은 숙요점 상징 체계를 바탕으로 관계의 흐름을 비추는 참고용 상담입니다. 현실의 선택, 동의, 경계, 건강과 법률·재정 판단은 당사자의 충분한 대화와 전문 검토를 함께 따라야 합니다.</p>
        </footer>
      </div>
    </div>
  );
}

export default function SukuyoCompatibilityAiClient() {
  const [step, setStep] = useState(0);
  const [personA, setPersonA] = useState<PersonForm>(() => buildInitialPersonA());
  const [personB, setPersonB] = useState<PersonForm>({ ...EMPTY_PERSON });
  const relationshipType = "연인";
  const topic = "전체 궁합";
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [phase, setPhase] = useState<"idle" | "access" | "payment" | "start" | "chat">("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const submitKeyRef = useRef("");

  const busy = phase === "access" || phase === "payment" || phase === "start";
  const consultationType: ConsultationType = "compatibility";
  const stepLabels = STEPS;
  const lastStep = stepLabels.length - 1;
  const result = useMemo(() => latestAssistantJson(consultation), [consultation]);

  useEffect(() => {
    document.body.classList.add(styles.fullscreenBody);
    return () => document.body.classList.remove(styles.fullscreenBody);
  }, []);

  const phaseText = useMemo(() => {
    if (phase === "access") return "달빛 상담 준비를 확인하고 있습니다";
    if (phase === "payment") return "결제창을 확인해 주세요";
    if (phase === "start") return "숙요점 상담문을 생성하고 있습니다";
    return "";
  }, [phase]);

  const hiddenQuestion = useMemo(() => {
    const a = personA.name.trim() || "나";
    const b = personB.name.trim() || "상대";
    return `${a}와 ${b}의 숙요점 궁합을 본명숙, 관계 유형, 갈등, 시기, 관계 처방까지 전체적으로 읽어 주세요.`;
  }, [personA.name, personB.name]);

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
    question: hiddenQuestion,
    locale: "ko",
    serviceType: "sukyo-ai-consultation",
  }), [consultationType, personA, personB, relationshipType, topic, hiddenQuestion]);

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

  function validatePayload() {
    if (!personA.birthDate || !personA.gender || !personA.calendarType) return false;
    if (consultationType === "compatibility" && (!personB.birthDate || !personB.gender || !personB.calendarType)) return false;
    return Boolean(topic && (consultationType === "personal" || relationshipType));
  }

  function getPersonValidationMessage(target: "a" | "b", value: PersonForm) {
    const owner = target === "a" ? "내" : "상대의";
    if (!value.birthDate) return `${owner} 생년월일을 입력해 주세요.`;
    if (!value.gender) return `${owner} 성별을 선택해 주세요.`;
    if (!value.calendarType) return `${owner} 달력 기준을 선택해 주세요.`;
    return "";
  }

  function getStepValidationMessage(index = step) {
    if (index === 0) return getPersonValidationMessage("a", personA);
    if (consultationType === "compatibility" && index === 1) return getPersonValidationMessage("b", personB);
    return validatePayload() ? "" : ERROR_TEXT.INVALID_INPUT;
  }

  function getPayloadValidationMessage() {
    return getPersonValidationMessage("a", personA) || getPersonValidationMessage("b", personB) || ERROR_TEXT.INVALID_INPUT;
  }

  function isStepComplete(index: number) {
    if (index === 0) return !getPersonValidationMessage("a", personA);
    if (index === 1) return !getPersonValidationMessage("b", personB);
    return false;
  }

  function handleStepClick(index: number) {
    if (busy) return;
    if (index > step) {
      const message = getStepValidationMessage(step);
      if (message) {
        setError(message);
        return;
      }
    }
    setError("");
    setStep(index);
  }

  function handleNextStep() {
    const message = getStepValidationMessage(step);
    if (message) {
      setError(message);
      return;
    }
    setError("");
    setStep((current) => Math.min(lastStep, current + 1));
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
      setError(getPayloadValidationMessage());
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

  const renderPersonFields = (target: "a" | "b", value: PersonForm) => {
    const prefix = target === "a" ? "self" : "partner";
    const owner = target === "a" ? "내" : "상대의";
    return (
      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label htmlFor={`${prefix}-name`}>이름 또는 닉네임</label>
          <input
            id={`${prefix}-name`}
            value={value.name}
            onChange={(event) => updatePerson(target, { name: event.target.value })}
            maxLength={80}
            disabled={busy}
            placeholder={target === "a" ? "나를 부르는 이름" : "상대를 부르는 이름"}
            autoComplete="name"
          />
          <span className={styles.fieldHint}>이름을 입력하면 상담 문장이 더 자연스러워져요.</span>
        </div>
        <div className={styles.field}>
          <label htmlFor={`${prefix}-gender`}>성별</label>
          <select id={`${prefix}-gender`} value={value.gender} onChange={(event) => updatePerson(target, { gender: event.target.value })} disabled={busy}>
            <option value="">선택</option>
            <option value="female">여성</option>
            <option value="male">남성</option>
            <option value="unknown">비공개</option>
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor={`${prefix}-birth-date`}>생년월일</label>
          <input id={`${prefix}-birth-date`} type="date" value={value.birthDate} onChange={(event) => updatePerson(target, { birthDate: event.target.value })} disabled={busy} />
          {!value.birthDate && <span className={styles.fieldHint}>{owner} 생년월일을 입력해 주세요.</span>}
        </div>
        <div className={styles.field}>
          <label htmlFor={`${prefix}-birth-time`}>출생시간</label>
          <div className={styles.timeControl}>
            <input id={`${prefix}-birth-time`} type="time" value={value.birthTime} onChange={(event) => updatePerson(target, { birthTime: event.target.value })} disabled={busy} />
            <button type="button" className={styles.timeUnknownButton} onClick={() => updatePerson(target, { birthTime: "" })} disabled={busy || !value.birthTime}>
              모름
            </button>
          </div>
          <span className={styles.fieldHint}>출생시간을 모르면 비워두셔도 괜찮아요.</span>
        </div>
        <div className={styles.fieldWide}>
          <span>달력 기준</span>
          <div className={styles.segmented} role="group" aria-label={`${owner} 달력 기준`}>
            {(["solar", "lunar"] as CalendarType[]).map((calendarType) => (
              <button
                key={calendarType}
                type="button"
                className={value.calendarType === calendarType ? styles.segmentActive : styles.segment}
                onClick={() => updatePerson(target, { calendarType })}
                disabled={busy}
                aria-pressed={value.calendarType === calendarType}
              >
                {calendarType === "solar" ? "양력" : "음력"}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className={styles.screen} data-sukuyo-ai-consultation>
      <div className={styles.threadLine} />
      <div className={styles.starField} aria-hidden="true" />
      <section className={styles.shell}>
        <aside className={styles.visualPanel}>
          <img src="/fuctionassets/sukyo_premium.webp" alt="숙요점 궁합 AI 상담" className={styles.visualImage} />
          <div className={styles.visualVeil} aria-hidden="true">
            <span className={styles.moonDisc} />
            <span className={styles.moonPath} />
          </div>
          <div className={styles.visualCopy}>
            <p className={styles.eyebrow}><Moon size={15} /> ☾ 27숙 달빛 궁합</p>
            <h1>숙요점 궁합 AI 상담</h1>
            <p>두 사람의 본명숙과 관계 거리를 따라 끌림, 갈등, 오래 머무는 마음의 리듬을 달빛처럼 차분히 비춥니다.</p>
            <div className={styles.heroMeta} aria-label="상담 기준">
              <span><Orbit size={14} /> 본명숙</span>
              <span><CalendarDays size={14} /> 관계 거리</span>
              <span><HeartHandshake size={14} /> 궁합 해석</span>
              <span><Sparkles size={14} /> 갈등 포인트</span>
            </div>
          </div>
        </aside>

        <section className={styles.workPanel}>
          {!consultation ? (
            <>
              <div className={styles.panelHeader}>
                <p><Sparkles size={15} /> Moonlight Compatibility</p>
                <h2>두 사람의 달빛 자리를 엽니다</h2>
                <span>숙요점의 본명숙과 관계 거리를 바탕으로 서로의 끌림, 갈등, 마음의 속도를 AI 상담 형식으로 차분히 풀어드립니다.</span>
              </div>
              <div className={styles.stepTabs}>
                {stepLabels.map((label, index) => {
                  const complete = isStepComplete(index);
                  const stepClass = index === step ? styles.stepActive : complete ? styles.stepComplete : styles.step;
                  return (
                    <button key={label} type="button" className={stepClass} onClick={() => handleStepClick(index)} disabled={busy} aria-current={index === step ? "step" : undefined}>
                      <span>{complete && index !== step ? "✓" : index + 1}</span>{label}
                    </button>
                  );
                })}
              </div>

              <div className={styles.formPanel}>
                {step === 0 && renderPersonFields("a", personA)}
                {step === 1 && renderPersonFields("b", personB)}
              </div>

              <div className={styles.actions}>
                <button type="button" className={styles.ghostButton} onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={busy || step === 0} aria-label="이전 단계">
                  <ChevronLeft size={18} />
                  이전
                </button>
                {step < lastStep ? (
                  <button type="button" className={styles.primaryButton} onClick={handleNextStep} disabled={busy}>
                    다음 <ChevronRight size={18} />
                  </button>
                ) : (
                  <button type="button" className={styles.primaryButton} onClick={handleSubmit} disabled={busy}>
                    {busy ? <Loader2 size={18} className={styles.spin} /> : <Sparkles size={18} />}
                    달빛 궁합 열기
                  </button>
                )}
              </div>
            </>
          ) : !result ? (
            <div className={styles.resultPanel}>
              <div className={styles.resultHeader}>
                <p><Moon size={15} /> 상담실이 열렸습니다</p>
                <h2>두 사람의 달빛 결을 이어 읽습니다</h2>
              </div>
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
            </div>
          ) : (
            <div className={styles.resultPanel}>
              <div className={styles.resultHeader}>
                <p><Moon size={15} /> 달빛 답장이 완성되었습니다</p>
                <h2>결과 레이어에서 궁합을 확인하고 PDF로 저장할 수 있습니다</h2>
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
      {phase === "start" && <MoonLoadingScreen />}
      {result && (
        <CompatResultModal
          result={result}
          onClose={() => {
            setConsultation(null);
            setStep(0);
            submitKeyRef.current = "";
          }}
          onDownloadError={setError}
        />
      )}
    </main>
  );
}
