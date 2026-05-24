"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import { usePaymentProcessing } from "./PaymentProcessingContext";
import PremiumPdfHistoryPanel from "./PremiumPdfHistoryPanel";


// ─────────────────────────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────────────────────────
interface SukuyoInfo {
  mansionIdx: number;
  mansion: string;
  mansionCh: string;
  mansionEn: string;
  icon: string;
  direction: string;
  element: string;
  animal: string;
  lunarMonth: number;
  lunarDay: number;
  yearGan: string;
  yearZhi: string;
}

interface ChapterMeta {
  num: number;
  title: string;
  subtitle: string;
  icon: string;
}

interface ChapterResult {
  chapter: number;
  text: string;
  sections: { title: string; body: string }[];
  chapterMeta: ChapterMeta;
}

type ChapterStep = "idle" | "loading" | "done" | "error";

interface ChapterState {
  step: ChapterStep;
  result: ChapterResult | null;
}

type PremiumSectionProps = {
  showIntro?: boolean;
  onStartGeneration?: () => void | Promise<void>;
  generationLoading?: boolean;
};

// ─────────────────────────────────────────────────────────────────
// 챕터 메타데이터
// ─────────────────────────────────────────────────────────────────
const CHAPTER_META: ChapterMeta[] = [
  { num: 1,  title: "본명숙 원형 해독 — 나의 27숙 정체성", subtitle: "사용자의 본명숙 자체를 정확하게 설명",     icon: "🌑" },
  { num: 2,  title: "달의 주기와 정서 리듬 — 월상·삭망각·조도 분석", subtitle: "lunarPhase 데이터 기반 정서 리듬 해석",   icon: "🌊" },
  { num: 3,  title: "페르소나와 첫인상 — 세상이 나를 기억하는 방식", subtitle: "외부 이미지와 사회적 인상 분석",        icon: "🎭" },
  { num: 4,  title: "자산 감각과 생활 기반 — 돈을 대하는 숙요적 태도", subtitle: "돈·안정감·재정 운영 성향 분석",         icon: "💰" },
  { num: 5,  title: "협업과 조직 적응 — 보이지 않는 톱니바퀴", subtitle: "조직·협업·역할 최적화",        icon: "⚙️" },
  { num: 6,  title: "관계 감지력 — 인간관계 레이더와 거리 조절", subtitle: "개인 숙요 기준 인간관계 감각 분석",      icon: "📡" },
  { num: 7,  title: "위기와 전환 — 무너질 때 다시 살아나는 방식", subtitle: "위기 대응과 회복력",  icon: "💥" },
  { num: 8,  title: "가족과 뿌리 — 정서적 기반과 소속감", subtitle: "가족·공간·정서적 기반",    icon: "🌿" },
  { num: 9,  title: "욕망과 추진력 — 내가 움직이는 진짜 이유", subtitle: "욕망·동기·추진력",      icon: "❤️" },
  { num: 10, title: "내면 회복과 영성 — 혼자 있을 때 살아나는 힘", subtitle: "회복 루틴과 영적 성장", icon: "🧭" },
  { num: 11, title: "달의 주기 — 월령 에너지 사이클", subtitle: "한 달 주기 행동 우선순위",       icon: "🌙" },
  { num: 12, title: "영혼의 마스터플랜 — 1년·3년·10년 로드맵", subtitle: "전체 종합 결론과 실행 계획", icon: "⚗️" },
];

const SUKUYO_STORAGE_KEY = "premium:sukuyo:session:v1";

// ─────────────────────────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────────────────────────
function renderTextBlock(text: string) {
  if (!text) return null;
  return text.split(/\n{2,}/).map((para, i) => (
    <p
      key={i}
      style={{
        lineHeight: 2.05,
        letterSpacing: "0.025em",
        color: "rgba(203,213,225,0.88)",
        fontSize: "0.95rem",
        marginBottom: "1.3em",
      }}
    >
      {para.replace(/\n/g, " ")}
    </p>
  ));
}

// ─────────────────────────────────────────────────────────────────
// 달 스피너
// ─────────────────────────────────────────────────────────────────
function MoonLoader({ message }: { message?: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 20,
        padding: "48px 0",
      }}
    >
      <div style={{ position: "relative", width: 72, height: 72 }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "2px solid rgba(125,211,252,0.3)",
            animation: "spin 2s linear infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 8,
            borderRadius: "50%",
            border: "2px solid rgba(167,139,250,0.35)",
            animation: "spin 3s linear infinite reverse",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
          }}
        >
          🌙
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <p
          style={{
            fontSize: "0.82rem",
            fontWeight: 600,
            letterSpacing: "0.2em",
            color: "rgba(125,211,252,0.8)",
          }}
        >
          {message ?? "달빛 전략을 계산하는 중"}
        </p>
        <p
          style={{
            marginTop: 4,
            fontSize: "0.72rem",
            letterSpacing: "0.1em",
            color: "rgba(148,163,184,0.5)",
          }}
        >
          27수의 에너지 분석이 진행 중입니다…
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// 숙요 배지
// ─────────────────────────────────────────────────────────────────
function SukuyoBadge({ sukuyo }: { sukuyo: SukuyoInfo }) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 16,
        justifyContent: "center",
      }}
    >
      <span
        style={{
          borderRadius: 9999,
          padding: "4px 14px",
          fontSize: "0.8rem",
          fontWeight: 700,
          letterSpacing: "0.1em",
          background: "rgba(125,211,252,0.15)",
          border: "1px solid rgba(125,211,252,0.35)",
          color: "rgba(125,211,252,0.95)",
        }}
      >
        {sukuyo.icon} {sukuyo.mansion}숙({sukuyo.mansionCh}宿)
      </span>
      <span
        style={{
          borderRadius: 9999,
          padding: "4px 14px",
          fontSize: "0.8rem",
          fontWeight: 600,
          background: "rgba(167,139,250,0.12)",
          border: "1px solid rgba(167,139,250,0.25)",
          color: "rgba(196,181,253,0.85)",
        }}
      >
        {sukuyo.direction}방 · {sukuyo.element}
      </span>
      <span
        style={{
          borderRadius: 9999,
          padding: "4px 14px",
          fontSize: "0.8rem",
          background: "rgba(251,191,36,0.1)",
          border: "1px solid rgba(251,191,36,0.2)",
          color: "rgba(251,191,36,0.8)",
        }}
      >
        음력 {sukuyo.lunarMonth}월 {sukuyo.lunarDay}일
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// 단일 챕터 카드
// ─────────────────────────────────────────────────────────────────
function ChapterCard({
  meta,
  state,
  sukuyo,
  onRequest,
}: {
  meta: ChapterMeta;
  state: ChapterState;
  sukuyo: SukuyoInfo;
  onRequest: (chapter: number) => void;
}) {
  const [open, setOpen] = useState(meta.num === 1);
  const accentColor = "rgba(125,211,252,0.85)";

  // idle
  if (state.step === "idle") {
    return (
      <div
        style={{
          borderRadius: 20,
          border: "1px solid rgba(125,211,252,0.15)",
          background: "linear-gradient(145deg, rgba(2,8,23,0.6) 0%, rgba(15,23,42,0.4) 100%)",
          overflow: "hidden",
        }}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "16px 20px",
            background: "none",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 22 }}>{meta.icon}</span>
            <div>
              <p
                style={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "rgba(226,232,240,0.7)",
                  letterSpacing: "0.04em",
                }}
              >
                <span style={{ color: accentColor, marginRight: 6 }}>
                  {String(meta.num).padStart(2, "0")}.
                </span>
                {meta.title}
              </p>
              <p
                style={{
                  fontSize: "0.72rem",
                  color: "rgba(148,163,184,0.5)",
                  marginTop: 2,
                  letterSpacing: "0.08em",
                }}
              >
                {meta.subtitle}
              </p>
            </div>
          </div>
          <span
            style={{
              color: accentColor,
              fontSize: "0.8rem",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.3s",
            }}
          >
            ▾
          </span>
        </button>
        {open && (
          <div
            style={{
              padding: "0 20px 20px",
              borderTop: "1px solid rgba(125,211,252,0.1)",
            }}
          >
            <p
              style={{
                fontSize: "0.88rem",
                color: "rgba(186,230,253,0.6)",
                lineHeight: 1.9,
                marginTop: 12,
                marginBottom: 16,
              }}
            >
              {sukuyo.mansion}숙({sukuyo.mansionCh}宿)의 달빛 에너지를 기반으로 심층 분석한
              {" "}<strong style={{ color: accentColor }}>{meta.title}</strong> 리포트를 생성합니다.
            </p>
            <button
              type="button"
              onClick={() => onRequest(meta.num)}
              style={{
                width: "100%",
                padding: "12px 0",
                borderRadius: 12,
                border: "1px solid rgba(125,211,252,0.4)",
                background: "linear-gradient(135deg, rgba(2,44,84,0.8) 0%, rgba(30,27,75,0.8) 100%)",
                color: "rgba(125,211,252,0.95)",
                fontSize: "0.9rem",
                fontWeight: 700,
                letterSpacing: "0.1em",
                cursor: "pointer",
              }}
            >
              ✦ {meta.title} 분석하기
            </button>
          </div>
        )}
      </div>
    );
  }

  // loading
  if (state.step === "loading") {
    return (
      <div
        style={{
          borderRadius: 20,
          border: "1px solid rgba(125,211,252,0.2)",
          background: "rgba(2,8,23,0.7)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(125,211,252,0.1)" }}>
          <p style={{ fontSize: "1rem", fontWeight: 700, color: accentColor }}>
            {String(meta.num).padStart(2, "0")}. {meta.title}
          </p>
        </div>
        <MoonLoader message={`${meta.title} 분석 중...`} />
      </div>
    );
  }

  // error
  if (state.step === "error") {
    return (
      <div
        style={{
          borderRadius: 20,
          border: "1px solid rgba(239,68,68,0.25)",
          background: "rgba(2,8,23,0.7)",
          padding: 20,
        }}
      >
        <p style={{ color: "rgba(251,113,133,0.85)", fontSize: "0.9rem" }}>
          {meta.icon} {meta.title} 분석 중 오류가 발생했습니다.
        </p>
        <button
          type="button"
          onClick={() => onRequest(meta.num)}
          style={{
            marginTop: 12,
            padding: "8px 20px",
            borderRadius: 10,
            border: "1px solid rgba(251,113,133,0.3)",
            background: "none",
            color: "rgba(251,113,133,0.7)",
            fontSize: "0.82rem",
            cursor: "pointer",
          }}
        >
          다시 시도
        </button>
      </div>
    );
  }

  // done
  const result = state.result!;
  return (
    <div
      style={{
        borderRadius: 20,
        border: "1px solid rgba(125,211,252,0.25)",
        background:
          "linear-gradient(145deg, rgba(2,12,30,0.85) 0%, rgba(15,23,42,0.6) 100%)",
        overflow: "hidden",
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          padding: "20px 22px 16px",
          borderBottom: "1px solid rgba(125,211,252,0.12)",
          background:
            "linear-gradient(135deg, rgba(2,44,84,0.15) 0%, rgba(30,27,75,0.12) 100%)",
        }}
      >
        <p
          style={{
            fontSize: "0.65rem",
            letterSpacing: "0.25em",
            color: "rgba(125,211,252,0.6)",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          Chapter {String(meta.num).padStart(2, "0")} · Moonlight Strategy
        </p>
        <h3
          style={{
            fontSize: "clamp(1.3rem, 3.5vw, 1.8rem)",
            fontWeight: 900,
            color: "#fff",
            letterSpacing: "0.03em",
            lineHeight: 1.3,
          }}
        >
          {meta.icon} {meta.title}
        </h3>
        <p
          style={{
            marginTop: 6,
            fontSize: "0.85rem",
            color: "rgba(186,230,253,0.55)",
            letterSpacing: "0.04em",
          }}
        >
          {meta.subtitle}
        </p>
      </div>

      {/* 섹션 아코디언 */}
      {result.sections.length > 0 ? (
        <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
          {result.sections.map((sec, i) => (
            <SectionAccordion key={i} index={i} title={sec.title} body={sec.body} />
          ))}
        </div>
      ) : (
        <div style={{ padding: "16px 22px 20px" }}>{renderTextBlock(result.text)}</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// 섹션 아코디언
// ─────────────────────────────────────────────────────────────────
function SectionAccordion({
  index,
  title,
  body,
}: {
  index: number;
  title: string;
  body: string;
}) {
  const [open, setOpen] = useState(index === 0);
  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${open ? "rgba(125,211,252,0.22)" : "rgba(255,255,255,0.07)"}`,
        background: open
          ? "linear-gradient(135deg, rgba(2,44,84,0.1) 0%, rgba(30,27,75,0.08) 100%)"
          : "rgba(255,255,255,0.02)",
        overflow: "hidden",
        transition: "all 0.3s",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "13px 16px",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <p
          style={{
            fontSize: "0.92rem",
            fontWeight: 700,
            color: open ? "rgba(125,211,252,0.9)" : "rgba(226,232,240,0.65)",
            letterSpacing: "0.04em",
          }}
        >
          {title}
        </p>
        <span
          style={{
            color: "rgba(125,211,252,0.6)",
            fontSize: "0.78rem",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.3s",
            flexShrink: 0,
            marginLeft: 8,
          }}
        >
          ▾
        </span>
      </button>
      {open && (
        <div
          style={{
            padding: "4px 16px 16px",
            borderTop: "1px solid rgba(125,211,252,0.1)",
          }}
        >
          {renderTextBlock(body)}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// 히어로 섹션 (숙요 결과 표시)
// ─────────────────────────────────────────────────────────────────
function SukuyoHero({ sukuyo }: { sukuyo: SukuyoInfo }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "32px 16px 24px",
        background:
          "linear-gradient(180deg, rgba(2,8,23,0.5) 0%, rgba(15,23,42,0.2) 100%)",
        borderBottom: "1px solid rgba(125,211,252,0.1)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 20,
          justifyContent: "center",
          marginBottom: 12,
          opacity: 0.3,
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        <span style={{ fontSize: "0.7rem" }}>✦</span>
        <span style={{ fontSize: "0.85rem" }}>✦</span>
        <span style={{ fontSize: "0.7rem" }}>✦</span>
      </div>

      <div style={{ marginBottom: 16 }}>
        <span
          style={{
            fontSize: 52,
            display: "block",
            marginBottom: 8,
            filter: "drop-shadow(0 0 20px rgba(125,211,252,0.5))",
          }}
        >
          {sukuyo.icon}
        </span>
        <p
          style={{
            fontSize: "0.68rem",
            letterSpacing: "0.3em",
            color: "rgba(125,211,252,0.65)",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          {sukuyo.mansionEn} · 27 Lunar Mansions
        </p>
      </div>

      <h2
        style={{
          fontSize: "clamp(2rem, 7vw, 3.2rem)",
          fontWeight: 900,
          color: "#fff",
          letterSpacing: "0.05em",
          lineHeight: 1.2,
          textShadow: "0 0 40px rgba(125,211,252,0.35)",
        }}
      >
        {sukuyo.mansion}숙({sukuyo.mansionCh}宿)
      </h2>

      <p
        style={{
          marginTop: 12,
          fontSize: "0.9rem",
          color: "rgba(186,230,253,0.65)",
          letterSpacing: "0.06em",
          lineHeight: 1.8,
        }}
      >
        달이 이 별자리를 지날 때 탄생한 달빛 전략가
      </p>

      <SukuyoBadge sukuyo={sukuyo} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────────────────────────
export default function HPremiumSukuyoSection({
  showIntro = false,
  onStartGeneration,
  generationLoading = false,
}: PremiumSectionProps) {
  const DEFAULT_BIRTH_FORM = {
    year: "",
    month: "",
    day: "",
    hour: "12",
    minute: "0",
    timezone: "9",
    lat: "37.5665",
    lon: "126.9780",
  };

  const [birthDate, setBirthDate] = useState(DEFAULT_BIRTH_FORM);
  const [partnerBirthDate, setPartnerBirthDate] = useState(DEFAULT_BIRTH_FORM);
  const [partnerName, setPartnerName] = useState("");
  const [partnerGender, setPartnerGender] = useState<"F" | "M">("F");
  const [sukuyo, setSukuyo] = useState<SukuyoInfo | null>(null);
  const [chapters, setChapters] = useState<ChapterState[]>(
    CHAPTER_META.map(() => ({ step: "idle" as ChapterStep, result: null }))
  );
  const [generating, setGenerating] = useState(false);
  const [initLoading, setInitLoading] = useState(false);
  const [initError, setInitError] = useState("");
  const [allGenerating, setAllGenerating] = useState(false);
  const [requestError, setRequestError] = useState("");
  const { startProcessing, stopProcessing } = usePaymentProcessing();
  const resultRef = useRef<HTMLDivElement>(null);

  const pdfBtnRef = useRef<HTMLButtonElement>(null);
  const storageReadyRef = useRef(false);
  const reportIdRef = useRef("");

  const parseNumberOr = useCallback((value: string, fallback: number, min?: number, max?: number) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    let v = Math.trunc(n);
    if (typeof min === "number") v = Math.max(min, v);
    if (typeof max === "number") v = Math.min(max, v);
    return v;
  }, []);

  const parseHour = useCallback((value: string) => parseNumberOr(value, 12, 0, 23), [parseNumberOr]);

  const partnerDateFilled =
    partnerBirthDate.year.length > 0 ||
    partnerBirthDate.month.length > 0 ||
    partnerBirthDate.day.length > 0;

  const isValidDate =
    birthDate.year.length === 4 &&
    birthDate.month !== "" &&
    birthDate.day !== "";

  const isValidPartnerDate =
    !partnerDateFilled ||
    (partnerBirthDate.year.length === 4 && partnerBirthDate.month !== "" && partnerBirthDate.day !== "");

  const buildSukuyoPayload = useCallback((chapter: number) => {
    const previousChapterTexts = chapters
      .filter((state, idx) => idx + 1 < chapter && state.step === "done" && !!state.result?.text)
      .map((state) => String(state.result?.text || ""))
      .filter((text) => text.trim().length > 0);

    const payload: Record<string, unknown> = {
      year: parseNumberOr(birthDate.year, 1990),
      month: parseNumberOr(birthDate.month, 1, 1, 12),
      day: parseNumberOr(birthDate.day, 1, 1, 31),
      hour: parseHour(birthDate.hour),
      minute: parseNumberOr(birthDate.minute, 0, 0, 59),
      timezone: Number.isFinite(Number(birthDate.timezone)) ? Number(birthDate.timezone) : 9,
      lat: Number.isFinite(Number(birthDate.lat)) ? Number(birthDate.lat) : 37.5665,
      lon: Number.isFinite(Number(birthDate.lon)) ? Number(birthDate.lon) : 126.9780,
      chapter,
      reportId: reportIdRef.current || undefined,
      previousChapterTexts,
    };

    if (isValidPartnerDate && partnerDateFilled) {
      payload.partnerYear = parseNumberOr(partnerBirthDate.year, 1990);
      payload.partnerMonth = parseNumberOr(partnerBirthDate.month, 1, 1, 12);
      payload.partnerDay = parseNumberOr(partnerBirthDate.day, 1, 1, 31);
      payload.partnerHour = parseHour(partnerBirthDate.hour);
      payload.partnerName = partnerName.trim();
      payload.partnerGender = partnerGender;
    }

    return payload;
  }, [birthDate, chapters, isValidPartnerDate, partnerDateFilled, partnerBirthDate, partnerName, partnerGender, parseHour, parseNumberOr]);

  useEffect(() => {
    if (showIntro) return;
    try {
      const raw = localStorage.getItem(SUKUYO_STORAGE_KEY);
      if (!raw) {
        storageReadyRef.current = true;
        return;
      }
      const saved = JSON.parse(raw) as {
        birthDate?: typeof DEFAULT_BIRTH_FORM;
        partnerBirthDate?: typeof DEFAULT_BIRTH_FORM;
        partnerName?: string;
        partnerGender?: "F" | "M";
        sukuyo?: SukuyoInfo | null;
        chapters?: ChapterState[];
      };

      if (saved.birthDate) setBirthDate({ ...DEFAULT_BIRTH_FORM, ...saved.birthDate });
      if (saved.partnerBirthDate) setPartnerBirthDate({ ...DEFAULT_BIRTH_FORM, ...saved.partnerBirthDate });
      if (saved.partnerName) setPartnerName(saved.partnerName);
      if (saved.partnerGender === "F" || saved.partnerGender === "M") setPartnerGender(saved.partnerGender);
      if (saved.sukuyo) setSukuyo(saved.sukuyo);
      if (Array.isArray(saved.chapters) && saved.chapters.length === CHAPTER_META.length) {
        const normalized = saved.chapters.map((c) =>
          c.step === "loading" ? { step: "idle" as ChapterStep, result: c.result ?? null } : c
        );
        setChapters(normalized);
      }
    } catch {
      // ignore broken snapshots
    } finally {
      storageReadyRef.current = true;
    }
  }, [showIntro]);

  useEffect(() => {
    if (showIntro) return;
    if (!storageReadyRef.current) return;
    try {
      localStorage.setItem(
        SUKUYO_STORAGE_KEY,
        JSON.stringify({
          birthDate,
          partnerBirthDate,
          partnerName,
          partnerGender,
          sukuyo,
          chapters,
        })
      );
    } catch {
      // ignore storage quota errors
    }
  }, [birthDate, partnerBirthDate, partnerName, partnerGender, sukuyo, chapters, showIntro]);

  useEffect(() => {
    if (showIntro) {
      reportIdRef.current = "";
      setSukuyo(null);
      setChapters(CHAPTER_META.map(() => ({ step: "idle" as ChapterStep, result: null })));
      setInitError("");
      setRequestError("");
      setAllGenerating(false);
      setInitLoading(false);
    }
  }, [showIntro]);

  const postSukuyoJson = useCallback(async (payload: unknown) => {
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 65000);
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("fortune_auth_token") : "";
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch("/api/premium/sukuyo-life", {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok) {
          const err = new Error(data?.error || data?.message || "숙요 요청 처리 중 오류가 발생했습니다.") as Error & { status?: number };
          err.status = Number(res.status || 500);
          throw err;
        }
        return data;
      } catch (e) {
        lastError = e;
        const status = Number((e as { status?: number })?.status || 0);
        const retryableStatus = [0, 408, 409, 425, 429, 500, 502, 503, 504];
        const retryable = (e instanceof Error && e.name === "AbortError") || retryableStatus.includes(status);
        if (attempt === 4 || !retryable) break;
        await new Promise((resolve) => setTimeout(resolve, Math.min(600 * (2 ** (attempt - 1)), 2200)));
      } finally {
        clearTimeout(timeoutId);
      }
    }
    throw lastError instanceof Error ? lastError : new Error("숙요 요청 처리 중 오류가 발생했습니다.");
  }, []);

  // 숙요 초기화 (챕터 없이 숙요 정보만)
  const handleInitSukuyo = useCallback(async () => {
    if (!isValidDate || !isValidPartnerDate) return;
    setInitLoading(true);
    setInitError("");
    setRequestError("");
    try {
      const data = await postSukuyoJson(buildSukuyoPayload(1));
      if (typeof data?.reportId === "string" && data.reportId) {
        reportIdRef.current = data.reportId;
      }
      if (data.sukuyo) {
        setSukuyo(data.sukuyo);
        setChapters((prev) => {
          const next = [...prev];
          next[0] = {
            step: "done",
            result: {
              chapter: 1,
              text: data.text,
              sections: data.sections,
              chapterMeta: data.chapterMeta,
            },
          };
          return next;
        });
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
      } else {
        setInitError(data.error || "숙요 분석에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        setInitError("요청 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.");
      } else {
        const message = e instanceof Error ? e.message : "네트워크 오류가 발생했습니다.";
        setInitError(message);
        setRequestError(message);
      }
    } finally {
      setInitLoading(false);
    }
  }, [buildSukuyoPayload, isValidDate, isValidPartnerDate, postSukuyoJson]);

  // 단일 챕터 생성
  const handleChapterRequest = useCallback(
    async (chapter: number) => {
      if (!sukuyo) return;
      setRequestError("");
      const idx = chapter - 1;
      setChapters((prev) => {
        const next = [...prev];
        next[idx] = { step: "loading", result: null };
        return next;
      });
      try {
        const data = await postSukuyoJson(buildSukuyoPayload(chapter));
        if (typeof data?.reportId === "string" && data.reportId) {
          reportIdRef.current = data.reportId;
        }
        {
          setChapters((prev) => {
            const next = [...prev];
            next[idx] = {
              step: "done",
              result: {
                chapter,
                text: data.text,
                sections: data.sections,
                chapterMeta: data.chapterMeta,
              },
            };
            return next;
          });
        }
      } catch (e: unknown) {
        setRequestError(e instanceof Error ? e.message : "챕터 생성 중 오류가 발생했습니다.");
        setChapters((prev) => {
          const next = [...prev];
          next[idx] = { step: "error", result: null };
          return next;
        });
      }
    },
    [buildSukuyoPayload, sukuyo, postSukuyoJson]
  );

  // 전체 생성 (순차)
  const handleGenerateAll = useCallback(async () => {
    if (!sukuyo || allGenerating) return;
    setAllGenerating(true);
    setRequestError("");
    for (let ch = 2; ch <= 12; ch++) {
      const idx = ch - 1;
      if (chapters[idx].step === "done") continue;
      setChapters((prev) => {
        const next = [...prev];
        next[idx] = { step: "loading", result: null };
        return next;
      });
      try {
        const data = await postSukuyoJson(buildSukuyoPayload(ch));
        if (typeof data?.reportId === "string" && data.reportId) {
          reportIdRef.current = data.reportId;
        }
        {
          setChapters((prev) => {
            const next = [...prev];
            next[idx] = {
              step: "done",
              result: {
                chapter: ch,
                text: data.text,
                sections: data.sections,
                chapterMeta: data.chapterMeta,
              },
            };
            return next;
          });
        }
      } catch (e: unknown) {
        setRequestError(e instanceof Error ? e.message : "전체 생성 중 오류가 발생했습니다.");
        setChapters((prev) => {
          const next = [...prev];
          next[idx] = { step: "error", result: null };
          return next;
        });
      }
    }
    setAllGenerating(false);
  }, [buildSukuyoPayload, sukuyo, allGenerating, chapters, postSukuyoJson]);

  // PDF 다운로드 (인쇄 창 방식)
  const handleDownloadPDF = useCallback(() => {
    if (!sukuyo) return;
    const doneChapters = chapters.filter((c) => c.step === "done" && c.result);
    if (doneChapters.length !== CHAPTER_META.length) {
      setRequestError(`전체 ${CHAPTER_META.length}개 챕터 생성 완료 후 PDF를 다운로드할 수 있습니다.`);
      return;
    }
    try {
      const escH = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const nl2p = (s: unknown) => String(s ?? "").split(/\n{2,}/).map(p => `<p>${escH(p).replace(/\n/g, "<br/>")}</p>`).join("");
      const chaptersHtml = doneChapters.map((cs, i) => {
        const r = cs.result!;
        const meta = CHAPTER_META[r.chapter - 1];
        const secHtml = r.sections.length > 0
          ? r.sections.map(s => `<div class="sec"><h3 class="sh">${escH(s.title)}</h3><div class="sb">${nl2p(s.body)}</div></div>`).join("")
          : `<div class="sec">${nl2p(r.text)}</div>`;
        return `<div class="ch" style="page-break-before:${i > 0 ? "always" : "auto"}"><div class="ch-hdr"><span class="cn">${escH(meta.icon)} CHAPTER ${r.chapter}</span><h2 class="ct">${escH(meta.title)}</h2><p class="cs">${escH(meta.subtitle)}</p></div><div class="ch-body">${secHtml}</div></div>`;
      }).join("");
      const fullHtml = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"/><title>숙요점 달빛 전략 리포트</title><style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600;700&family=Noto+Sans+KR:wght@400;500;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Noto Serif KR','Noto Sans KR',serif;background:#060d1e;color:#e2e8f0}
.cover{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:48px 40px;background:linear-gradient(160deg,#060d1e 0%,#0c1a2e 100%)}
.cover-badge{font-size:0.65rem;letter-spacing:0.3em;color:rgba(125,211,252,0.7);text-transform:uppercase;margin-bottom:20px}
.cover-title{font-size:2.2rem;font-weight:700;color:#7dd3fc;line-height:1.3;margin-bottom:12px}
.cover-sub{font-size:0.95rem;color:rgba(148,163,184,0.8);letter-spacing:0.08em;margin-bottom:8px}
.cover-mansion{font-size:1.5rem;color:#fff;margin:20px 0 8px;font-weight:600}
.cover-meta{font-size:0.88rem;color:rgba(186,230,253,0.7);margin:3px 0}
.ch{max-width:760px;margin:0 auto;padding:40px 40px 32px}
.ch-hdr{margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid rgba(125,211,252,0.15)}
.cn{font-size:0.7rem;letter-spacing:0.25em;text-transform:uppercase;color:rgba(125,211,252,0.6)}
.ct{font-size:1.8rem;font-weight:700;color:#f8fafc;margin:10px 0 8px;line-height:1.3}
.cs{font-size:0.88rem;color:rgba(125,211,252,0.75)}
.ch-body{color:rgba(203,213,225,0.9);font-size:0.97rem;line-height:2.0}
.sec{margin-bottom:28px}
.sh{font-size:1.1rem;font-weight:600;color:#7dd3fc;margin-bottom:12px;padding-left:12px;border-left:3px solid rgba(125,211,252,0.5)}
.sb p,.sec p{font-size:0.95rem;line-height:2.0;color:rgba(203,213,225,0.9);margin-bottom:12px}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;background:#060d1e!important}.ch{page-break-before:always}.cover{page-break-after:always;min-height:auto;padding:80px 40px}}
</style></head><body>
<div class="cover">
  <p class="cover-badge">CODE : DESTINY · MOONLIGHT STRATEGY REPORT</p>
  <h1 class="cover-title">🌙 숙요점 달빛 전략 리포트</h1>
  <p class="cover-sub">27수 별자리 흐름 · 달빛 전략 심층 분석</p>
  <div class="cover-mansion">${escH(sukuyo.icon)} ${escH(sukuyo.mansion)}숙(${escH(sukuyo.mansionCh)}宿)</div>
  <p class="cover-meta">${escH(sukuyo.direction)}방 · ${escH(sukuyo.element)}</p>
  <p class="cover-meta">음력 ${escH(sukuyo.lunarMonth)}월 ${escH(sukuyo.lunarDay)}일 탄생</p>
</div>
${chaptersHtml}
</body></html>`;
      const win = window.open("", "_blank", "width=900,height=700");
      if (!win) { alert("팝업이 차단됐습니다. 브라우저 주소창에서 팝업을 허용 후 재시도해 주세요."); return; }
      win.document.open(); win.document.write(fullHtml); win.document.close();
      win.focus();
      setTimeout(() => { try { win.print(); } catch (_) {} }, 1200);
    } catch (e) {
      console.error("PDF 생성 오류", e);
    }
  }, [sukuyo, chapters, birthDate]);

  const doneCount = chapters.filter((c) => c.step === "done").length;

  if (showIntro) {
    return (
      <section
        style={{
          width: "100%",
          maxWidth: 820,
          margin: "0 auto",
          padding: "0 0 24px",
          fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <div style={{ borderRadius: 24, overflow: "hidden", border: "1px solid rgba(125,211,252,0.25)", background: "linear-gradient(145deg, rgba(2,8,23,0.96) 0%, rgba(15,23,42,0.86) 100%)" }}>
          <img src="/fuctionassets/sukyo_premium.webp" alt="숙요점 프리미엄 소개" width={1200} height={675} loading="lazy" decoding="async" style={{ width: "100%", maxHeight: 280, objectFit: "cover", opacity: 0.42 }} />
          <div style={{ padding: "18px 18px 22px" }}>
            <p style={{ color: "rgba(125,211,252,0.7)", fontSize: "0.66rem", letterSpacing: "0.28em", margin: 0 }}>MOONLIGHT STRATEGY · DETAIL INTRO</p>
            <h3 style={{ color: "#fff", fontWeight: 900, fontSize: "1.5rem", margin: "8px 0 6px" }}>숙요점 달빛 전략 리포트</h3>
            <p style={{ color: "rgba(186,230,253,0.72)", fontSize: "0.88rem", lineHeight: 1.8, margin: 0 }}>
              27수 별자리 흐름을 12개 챕터로 먼저 확인하고, 버튼 클릭 시 PDF 생성 단계로 진입합니다.
            </p>

            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              {CHAPTER_META.map((ch) => (
                <div key={ch.num} style={{ borderRadius: 12, border: "1px solid rgba(125,211,252,0.2)", background: "rgba(2,12,30,0.55)", padding: "10px 12px" }}>
                  <p style={{ margin: 0, color: "rgba(125,211,252,0.94)", fontSize: "0.82rem", fontWeight: 700 }}>
                    {ch.icon} CHAPTER {ch.num}. {ch.title}
                  </p>
                  <p style={{ margin: "4px 0 0", color: "rgba(148,163,184,0.76)", fontSize: "0.74rem" }}>{ch.subtitle}</p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => onStartGeneration?.()}
              disabled={generationLoading}
              style={{
                marginTop: 14,
                width: "100%",
                padding: "14px 0",
                borderRadius: 14,
                border: generationLoading ? "1px solid rgba(100,116,139,0.3)" : "1px solid rgba(125,211,252,0.5)",
                background: generationLoading ? "rgba(20,30,50,0.6)" : "linear-gradient(135deg, rgba(2,44,84,0.9) 0%, rgba(30,27,75,0.9) 100%)",
                color: generationLoading ? "rgba(148,163,184,0.5)" : "rgba(125,211,252,0.98)",
                fontSize: "0.96rem",
                fontWeight: 800,
                letterSpacing: "0.1em",
                cursor: generationLoading ? "wait" : "pointer",
                opacity: generationLoading ? 0.72 : 1,
              }}
            >
              {generationLoading ? "코인 확인 중…" : "프리미엄 PDF 리포트 생성하기"}
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ─── 입력 폼 ─────────────────────────────────────────────────────
  const inputForm = (
    <div
      style={{
        background:
          "linear-gradient(145deg, rgba(2,8,23,0.85) 0%, rgba(15,23,42,0.7) 100%)",
        borderRadius: 24,
        border: "1px solid rgba(125,211,252,0.2)",
        padding: "32px 24px",
        boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
      }}
    >
      {/* 히어로 이미지 영역 */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div
          style={{
            display: "inline-block",
            borderRadius: 18,
            overflow: "hidden",
            border: "1px solid rgba(125,211,252,0.2)",
            marginBottom: 20,
            maxWidth: 320,
            width: "100%",
          }}
        >
          <img
            src="/fuctionassets/sukyo_premium.webp"
            alt="숙요점 프리미엄"
            width={960}
            height={540}
            loading="lazy"
            decoding="async"
            style={{ width: "100%", display: "block" }}
          />
        </div>

        <div
          style={{
            display: "inline-block",
            background: "rgba(125,211,252,0.08)",
            border: "1px solid rgba(125,211,252,0.2)",
            borderRadius: 9999,
            padding: "4px 14px",
            fontSize: "0.7rem",
            letterSpacing: "0.2em",
            color: "rgba(125,211,252,0.7)",
            marginBottom: 12,
          }}
        >
          PREMIUM · MOONLIGHT STRATEGY
        </div>
        <h2
          style={{
            fontSize: "clamp(1.5rem, 5vw, 2.2rem)",
            fontWeight: 900,
            color: "#fff",
            letterSpacing: "0.04em",
            lineHeight: 1.3,
            marginBottom: 8,
          }}
        >
          숙요점 달빛 전략 리포트
        </h2>
        <p
          style={{
            fontSize: "0.88rem",
            color: "rgba(186,230,253,0.6)",
            lineHeight: 1.9,
            letterSpacing: "0.04em",
          }}
        >
          달이 당신의 탄생 별자리를 지날 때<br />
          새겨진 27수의 비밀을 해독합니다
        </p>
      </div>

      {requestError ? (
        <p style={{ color: "rgba(251,113,133,0.9)", fontSize: "0.82rem", marginTop: 10 }}>
          ⚠ {requestError}
        </p>
      ) : null}

      {/* 특징 배지 */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          justifyContent: "center",
          marginBottom: 28,
        }}
      >
        {["12챕터 심층 분석", "27수 완전 해석", "6대 관계 역학", "달의 주기 전략", "PDF 다운로드"].map((tag) => (
          <span
            key={tag}
            style={{
              borderRadius: 9999,
              padding: "4px 12px",
              fontSize: "0.75rem",
              background: "rgba(125,211,252,0.08)",
              border: "1px solid rgba(125,211,252,0.2)",
              color: "rgba(125,211,252,0.75)",
            }}
          >
            ✦ {tag}
          </span>
        ))}
      </div>

      {/* 날짜 입력 */}
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          borderRadius: 16,
          border: "1px solid rgba(125,211,252,0.12)",
          padding: "20px",
          marginBottom: 20,
        }}
      >
        <p
          style={{
            fontSize: "0.78rem",
            letterSpacing: "0.15em",
            color: "rgba(125,211,252,0.65)",
            marginBottom: 14,
            textAlign: "center",
          }}
        >
          🌙 본인 출생 정보
        </p>
        <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8 }}>
            <input
              type="number"
              placeholder="출생 연도"
              value={birthDate.year}
              onChange={(e) => setBirthDate((prev) => ({ ...prev, year: e.target.value }))}
              style={{
                background: "rgba(2,12,30,0.8)",
                border: "1px solid rgba(125,211,252,0.2)",
                borderRadius: 10,
                padding: "10px 8px",
                color: "#e2e8f0",
                fontSize: "0.9rem",
                textAlign: "center",
                outline: "none",
                width: "100%",
                boxSizing: "border-box",
              }}
            />
            <input
              type="number"
              placeholder="월"
              value={birthDate.month}
              onChange={(e) => setBirthDate((prev) => ({ ...prev, month: e.target.value }))}
              style={{
                background: "rgba(2,12,30,0.8)",
                border: "1px solid rgba(125,211,252,0.2)",
                borderRadius: 10,
                padding: "10px 8px",
                color: "#e2e8f0",
                fontSize: "0.9rem",
                textAlign: "center",
                outline: "none",
                width: "100%",
                boxSizing: "border-box",
              }}
            />
            <input
              type="number"
              placeholder="일"
              value={birthDate.day}
              onChange={(e) => setBirthDate((prev) => ({ ...prev, day: e.target.value }))}
              style={{
                background: "rgba(2,12,30,0.8)",
                border: "1px solid rgba(125,211,252,0.2)",
                borderRadius: 10,
                padding: "10px 8px",
                color: "#e2e8f0",
                fontSize: "0.9rem",
                textAlign: "center",
                outline: "none",
                width: "100%",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <input
              type="number"
              placeholder="시(0-23)"
              value={birthDate.hour}
              onChange={(e) => setBirthDate((prev) => ({ ...prev, hour: e.target.value }))}
              style={{
                background: "rgba(2,12,30,0.8)",
                border: "1px solid rgba(125,211,252,0.2)",
                borderRadius: 10,
                padding: "10px 8px",
                color: "#e2e8f0",
                fontSize: "0.9rem",
                textAlign: "center",
                outline: "none",
                width: "100%",
                boxSizing: "border-box",
              }}
            />
            <input
              type="number"
              placeholder="분"
              value={birthDate.minute}
              onChange={(e) => setBirthDate((prev) => ({ ...prev, minute: e.target.value }))}
              style={{
                background: "rgba(2,12,30,0.8)",
                border: "1px solid rgba(125,211,252,0.2)",
                borderRadius: 10,
                padding: "10px 8px",
                color: "#e2e8f0",
                fontSize: "0.9rem",
                textAlign: "center",
                outline: "none",
                width: "100%",
                boxSizing: "border-box",
              }}
            />
            <input
              type="number"
              placeholder="UTC(+9)"
              value={birthDate.timezone}
              onChange={(e) => setBirthDate((prev) => ({ ...prev, timezone: e.target.value }))}
              style={{
                background: "rgba(2,12,30,0.8)",
                border: "1px solid rgba(125,211,252,0.2)",
                borderRadius: 10,
                padding: "10px 8px",
                color: "#e2e8f0",
                fontSize: "0.9rem",
                textAlign: "center",
                outline: "none",
                width: "100%",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <input
              type="number"
              step="0.0001"
              placeholder="위도"
              value={birthDate.lat}
              onChange={(e) => setBirthDate((prev) => ({ ...prev, lat: e.target.value }))}
              style={{
                background: "rgba(2,12,30,0.8)",
                border: "1px solid rgba(125,211,252,0.2)",
                borderRadius: 10,
                padding: "10px 8px",
                color: "#e2e8f0",
                fontSize: "0.9rem",
                textAlign: "center",
                outline: "none",
                width: "100%",
                boxSizing: "border-box",
              }}
            />
            <input
              type="number"
              step="0.0001"
              placeholder="경도"
              value={birthDate.lon}
              onChange={(e) => setBirthDate((prev) => ({ ...prev, lon: e.target.value }))}
              style={{
                background: "rgba(2,12,30,0.8)",
                border: "1px solid rgba(125,211,252,0.2)",
                borderRadius: 10,
                padding: "10px 8px",
                color: "#e2e8f0",
                fontSize: "0.9rem",
                textAlign: "center",
                outline: "none",
                width: "100%",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        <p
          style={{
            fontSize: "0.78rem",
            letterSpacing: "0.12em",
            color: "rgba(167,139,250,0.75)",
            marginTop: 16,
            marginBottom: 12,
            textAlign: "center",
          }}
        >
          👥 상대 정보 (선택)
        </p>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <input
              type="text"
              placeholder="상대 이름"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              style={{
                background: "rgba(2,12,30,0.8)",
                border: "1px solid rgba(167,139,250,0.28)",
                borderRadius: 10,
                padding: "10px 8px",
                color: "#e2e8f0",
                fontSize: "0.9rem",
                textAlign: "center",
                outline: "none",
                width: "100%",
                boxSizing: "border-box",
              }}
            />
            <select
              value={partnerGender}
              onChange={(e) => setPartnerGender((e.target.value as "F" | "M") || "F")}
              style={{
                background: "rgba(2,12,30,0.8)",
                border: "1px solid rgba(167,139,250,0.28)",
                borderRadius: 10,
                padding: "10px 8px",
                color: "#e2e8f0",
                fontSize: "0.9rem",
                textAlign: "center",
                outline: "none",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <option value="F">여성</option>
              <option value="M">남성</option>
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8 }}>
            <input
              type="number"
              placeholder="상대 출생 연도"
              value={partnerBirthDate.year}
              onChange={(e) => setPartnerBirthDate((prev) => ({ ...prev, year: e.target.value }))}
              style={{
                background: "rgba(2,12,30,0.8)",
                border: "1px solid rgba(167,139,250,0.28)",
                borderRadius: 10,
                padding: "10px 8px",
                color: "#e2e8f0",
                fontSize: "0.9rem",
                textAlign: "center",
                outline: "none",
                width: "100%",
                boxSizing: "border-box",
              }}
            />
            <input
              type="number"
              placeholder="월"
              value={partnerBirthDate.month}
              onChange={(e) => setPartnerBirthDate((prev) => ({ ...prev, month: e.target.value }))}
              style={{
                background: "rgba(2,12,30,0.8)",
                border: "1px solid rgba(167,139,250,0.28)",
                borderRadius: 10,
                padding: "10px 8px",
                color: "#e2e8f0",
                fontSize: "0.9rem",
                textAlign: "center",
                outline: "none",
                width: "100%",
                boxSizing: "border-box",
              }}
            />
            <input
              type="number"
              placeholder="일"
              value={partnerBirthDate.day}
              onChange={(e) => setPartnerBirthDate((prev) => ({ ...prev, day: e.target.value }))}
              style={{
                background: "rgba(2,12,30,0.8)",
                border: "1px solid rgba(167,139,250,0.28)",
                borderRadius: 10,
                padding: "10px 8px",
                color: "#e2e8f0",
                fontSize: "0.9rem",
                textAlign: "center",
                outline: "none",
                width: "100%",
                boxSizing: "border-box",
              }}
            />
            <input
              type="number"
              placeholder="시"
              value={partnerBirthDate.hour}
              onChange={(e) => setPartnerBirthDate((prev) => ({ ...prev, hour: e.target.value }))}
              style={{
                background: "rgba(2,12,30,0.8)",
                border: "1px solid rgba(167,139,250,0.28)",
                borderRadius: 10,
                padding: "10px 8px",
                color: "#e2e8f0",
                fontSize: "0.9rem",
                textAlign: "center",
                outline: "none",
                width: "100%",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        <p
          style={{
            marginTop: 8,
            fontSize: "0.72rem",
            color: "rgba(148,163,184,0.45)",
            textAlign: "center",
          }}
        >
          상대 정보는 선택 입력입니다. 입력 시 연/월/일은 모두 채워야 합니다.
        </p>
      </div>

      <button
        type="button"
        onClick={handleInitSukuyo}
        disabled={!isValidDate || !isValidPartnerDate || initLoading}
        style={{
          width: "100%",
          padding: "16px 0",
          borderRadius: 14,
          border: isValidDate && isValidPartnerDate ? "1px solid rgba(125,211,252,0.5)" : "1px solid rgba(255,255,255,0.1)",
          background: isValidDate && isValidPartnerDate
            ? "linear-gradient(135deg, rgba(2,44,84,0.9) 0%, rgba(30,27,75,0.9) 100%)"
            : "rgba(255,255,255,0.04)",
          color: isValidDate && isValidPartnerDate ? "rgba(125,211,252,0.95)" : "rgba(255,255,255,0.3)",
          fontSize: "0.98rem",
          fontWeight: 700,
          letterSpacing: "0.12em",
          cursor: isValidDate && isValidPartnerDate ? "pointer" : "not-allowed",
        }}
      >
        {initLoading ? "🌙 달의 지도를 펼치는 중..." : "✦ 숙요 분석 시작하기"}
      </button>
      {!isValidPartnerDate && (
        <p style={{ marginTop: 10, color: "rgba(251,113,133,0.9)", fontSize: "0.82rem", textAlign: "center" }}>
          ⚠ 상대 정보는 연/월/일을 모두 입력해야 반영됩니다.
        </p>
      )}
      {initError && (
        <p style={{ marginTop: 10, color: "rgba(251,113,133,0.9)", fontSize: "0.85rem", textAlign: "center" }}>
          ⚠ {initError}
        </p>
      )}
    </div>
  );

  // ─── 결과 영역 ────────────────────────────────────────────────────
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 820,
        margin: "0 auto",
        padding: "0 0 60px",
        fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      {/* 진입 폼 (sukuyo 없을 때) */}
      {!sukuyo && inputForm}

      {/* 결과 영역 */}
      {sukuyo && (
        <div ref={resultRef}>
          {/* 히어로 */}
          <div
            style={{
              borderRadius: 24,
              border: "1px solid rgba(125,211,252,0.25)",
              background:
                "linear-gradient(145deg, rgba(2,8,23,0.92) 0%, rgba(15,23,42,0.8) 100%)",
              overflow: "hidden",
              marginBottom: 20,
            }}
          >
            <SukuyoHero sukuyo={sukuyo} />

            {/* 전체 생성 / PDF 버튼 */}
            <div
              style={{
                padding: "16px 20px 20px",
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                justifyContent: "center",
                borderTop: "1px solid rgba(125,211,252,0.1)",
              }}
            >
              {doneCount < 13 && (
                <button
                  type="button"
                  onClick={handleGenerateAll}
                  disabled={allGenerating}
                  style={{
                    padding: "12px 24px",
                    borderRadius: 12,
                    border: "1px solid rgba(167,139,250,0.4)",
                    background: "linear-gradient(135deg, rgba(76,29,149,0.5) 0%, rgba(30,27,75,0.5) 100%)",
                    color: "rgba(196,181,253,0.9)",
                    fontSize: "0.88rem",
                    fontWeight: 700,
                    cursor: allGenerating ? "not-allowed" : "pointer",
                    letterSpacing: "0.06em",
                  }}
                >
                  {allGenerating ? "🌙 전체 생성 중..." : `✦ 전체 ${13 - doneCount}챕터 자동 생성`}
                </button>
              )}
              {doneCount > 0 && (
                <button
                  ref={pdfBtnRef}
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={doneCount !== CHAPTER_META.length}
                  style={{
                    padding: "12px 24px",
                    borderRadius: 12,
                    border: "1px solid rgba(251,191,36,0.4)",
                    background: doneCount === CHAPTER_META.length
                      ? "linear-gradient(135deg, rgba(120,53,15,0.5) 0%, rgba(30,27,75,0.5) 100%)"
                      : "rgba(100,116,139,0.28)",
                    color: doneCount === CHAPTER_META.length ? "rgba(251,191,36,0.9)" : "rgba(148,163,184,0.6)",
                    fontSize: "0.88rem",
                    fontWeight: 700,
                    cursor: doneCount === CHAPTER_META.length ? "pointer" : "not-allowed",
                    letterSpacing: "0.06em",
                  }}
                >
                  ⬇ PDF 다운로드 ({doneCount}/13)
                </button>
              )}
            </div>

            {/* 진행 바 */}
            {doneCount > 0 && doneCount < 13 && (
              <div style={{ padding: "0 20px 16px" }}>
                <div
                  style={{
                    height: 4,
                    borderRadius: 9999,
                    background: "rgba(255,255,255,0.08)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      borderRadius: 9999,
                      background: "linear-gradient(90deg, rgba(125,211,252,0.7), rgba(167,139,250,0.7))",
                      width: `${(doneCount / 13) * 100}%`,
                      transition: "width 0.5s ease",
                    }}
                  />
                </div>
                <p
                  style={{
                    textAlign: "center",
                    marginTop: 6,
                    fontSize: "0.72rem",
                    color: "rgba(148,163,184,0.5)",
                  }}
                >
                  {doneCount} / 13 챕터 완료
                </p>
              </div>
            )}
          </div>

          {/* 챕터 카드 목록 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {CHAPTER_META.map((meta, i) => (
              <ChapterCard
                key={meta.num}
                meta={meta}
                state={chapters[i]}
                sukuyo={sukuyo}
                onRequest={handleChapterRequest}
              />
            ))}
          </div>

          <PremiumPdfHistoryPanel
            title="숙요점 PDF 히스토리"
            sessionKinds={["sukuyo"]}
            limit={12}
          />
        </div>
      )}
    </div>
  );
}
