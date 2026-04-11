"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";

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
  { num: 1,  title: "영혼의 원형",           subtitle: "당신의 별자리가 새긴 운명 코드",     icon: "🌑" },
  { num: 2,  title: "감정의 조수간만",        subtitle: "달의 주기가 만들어내는 정서 파동",   icon: "🌊" },
  { num: 3,  title: "페르소나와 브랜딩",      subtitle: "세상이 당신을 기억하는 방식",        icon: "🎭" },
  { num: 4,  title: "자산의 중력",            subtitle: "부를 끌어당기는 달빛 전략",         icon: "💰" },
  { num: 5,  title: "보이지 않는 톱니바퀴",  subtitle: "성공 뒤에 숨겨진 협력 역학",        icon: "⚙️" },
  { num: 6,  title: "관계의 정밀 레이더",     subtitle: "6대 숙요 관계 역학 완전 분석",      icon: "📡" },
  { num: 7,  title: "파괴적 혁신",           subtitle: "위기를 기회로 전환하는 달빛 전략",  icon: "💥" },
  { num: 8,  title: "조화로운 성장",         subtitle: "나를 살리는 공간과 환경의 법칙",    icon: "🌿" },
  { num: 9,  title: "정서적 유대",           subtitle: "깊은 연결을 만드는 감정 지능",      icon: "❤️" },
  { num: 10, title: "운명적 거리",           subtitle: "가까이해야 할 것과 멀리해야 할 것", icon: "🧭" },
  { num: 11, title: "달의 주기",            subtitle: "월령 에너지 사이클 완전 攻略",       icon: "🌙" },
  { num: 12, title: "관계를 정화하는 연금술", subtitle: "인연의 독소를 황금으로 바꾸는 법", icon: "⚗️" },
  { num: 13, title: "영혼의 마스터플랜",     subtitle: "달빛 전략가의 10년 로드맵",         icon: "🗺️" },
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
  console.log("[DEBUG] 섹션 컴포넌트 내부 진입 성공: 숙요 프리미엄");
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
  const resultRef = useRef<HTMLDivElement>(null);
  const pdfBtnRef = useRef<HTMLButtonElement>(null);
  const storageReadyRef = useRef(false);

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
  }, [birthDate, isValidPartnerDate, partnerDateFilled, partnerBirthDate, partnerName, partnerGender, parseHour, parseNumberOr]);

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
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 65000);
      try {
        const res = await fetch("/api/premium/sukuyo-life", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || "숙요 요청 처리 중 오류가 발생했습니다.");
        }
        return data;
      } catch (e) {
        lastError = e;
        if (attempt === 2) break;
      } finally {
        clearTimeout(timeoutId);
      }
    }
    throw lastError instanceof Error ? lastError : new Error("숙요 요청 처리 중 오류가 발생했습니다.");
  }, []);

  // 숙요 초기화 (챕터 없이 숙요 정보만)
  const handleInitSukuyo = useCallback(async () => {
    console.log("클릭됨: 숙요 초기 분석");
    if (!isValidDate || !isValidPartnerDate) return;
    setInitLoading(true);
    setInitError("");
    setRequestError("");
    try {
      const data = await postSukuyoJson(buildSukuyoPayload(1));
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
      console.log(`클릭됨: 숙요 챕터 ${chapter}`);
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
    console.log("클릭됨: 숙요 전체 챕터 생성");
    if (!sukuyo || allGenerating) return;
    setAllGenerating(true);
    setRequestError("");
    for (let ch = 2; ch <= 13; ch++) {
      const idx = ch - 1;
      if (chapters[idx].step === "done") continue;
      setChapters((prev) => {
        const next = [...prev];
        next[idx] = { step: "loading", result: null };
        return next;
      });
      try {
        const data = await postSukuyoJson(buildSukuyoPayload(ch));
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

  // PDF 다운로드 (텍스트 기반 간이)
  const handleDownloadPDF = useCallback(async () => {
    if (!sukuyo) return;
    const doneChapters = chapters.filter((c) => c.step === "done" && c.result);
    if (!doneChapters.length) return;

    // 동적 import로 @react-pdf/renderer 로드
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfModule = await import("@react-pdf/renderer" as any).catch(() => null);
    if (!pdfModule) { alert("PDF 라이브러리를 로드할 수 없습니다."); return; }
    const { pdf, Document, Page, Text, View, StyleSheet, Font } = pdfModule;
    // 한글 렌더링을 위한 나눔고딕 폰트 등록
    try {
      Font.register({
        family: "NanumGothic",
        src: "https://fonts.gstatic.com/s/nanumgothic/v21/PN_3Rfi-oW3hYwmKDpxS7F_z_6Ij4h6Y.woff2",
      });
    } catch { /* 폰트 로드 실패 시 기본 폰트 사용 */ }
    const styles = StyleSheet.create({
      page: {
        fontFamily: "NanumGothic",
        backgroundColor: "#0a0f1e",
        color: "#e2e8f0",
        padding: 40,
      },
      coverTitle: { fontSize: 26, fontWeight: "bold", color: "#7dd3fc", marginBottom: 8, textAlign: "center" },
      coverSub: { fontSize: 12, color: "#94a3b8", textAlign: "center", marginBottom: 4 },
      coverMansion: { fontSize: 16, color: "#fff", textAlign: "center", marginTop: 12, marginBottom: 4 },
      chapterTitle: { fontSize: 18, fontWeight: "bold", color: "#7dd3fc", marginBottom: 8, marginTop: 24 },
      sectionTitle: { fontSize: 13, fontWeight: "bold", color: "#bae6fd", marginBottom: 4, marginTop: 14 },
      bodyText: { fontSize: 10, color: "#cbd5e1", lineHeight: 1.85, marginBottom: 6 },
      divider: { borderBottomWidth: 1, borderBottomColor: "#1e3a5f", marginVertical: 16 },
    });

    const MyDoc = (
      <Document>
        <Page size="A4" style={styles.page}>
          {/* 커버 */}
          <Text style={styles.coverTitle}>숙요점 · Moonlight Strategy Report</Text>
          <Text style={styles.coverSub}>달빛 전략 심층 분석 · 27수 완전 해석</Text>
          <Text style={styles.coverMansion}>
            {sukuyo.icon} {sukuyo.mansion}숙({sukuyo.mansionCh}宿) · {sukuyo.direction}방 · {sukuyo.element}
          </Text>
          <Text style={styles.coverSub}>음력 {sukuyo.lunarMonth}월 {sukuyo.lunarDay}일 탄생</Text>
          <View style={styles.divider} />

          {/* 챕터별 내용 */}
          {doneChapters.map((cs) => {
            const r = cs.result!;
            const meta = CHAPTER_META[r.chapter - 1];
            return (
              <View key={r.chapter}>
                <Text style={styles.chapterTitle}>
                  {meta.icon} Chapter {String(r.chapter).padStart(2, "0")}. {meta.title}
                </Text>
                <Text style={styles.bodyText}>{meta.subtitle}</Text>
                {r.sections.length > 0
                  ? r.sections.map((sec, si) => (
                      <View key={si}>
                        <Text style={styles.sectionTitle}>{sec.title}</Text>
                        <Text style={styles.bodyText}>{sec.body}</Text>
                      </View>
                    ))
                  : <Text style={styles.bodyText}>{r.text}</Text>}
                <View style={styles.divider} />
              </View>
            );
          })}
        </Page>
      </Document>
    );

    const blob = await pdf(MyDoc).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `숙요점_달빛전략_${sukuyo.mansion}숙_${birthDate.year}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
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
          <img src="/fuctionassets/sukyo_premium.webp" alt="숙요점 프리미엄 소개" style={{ width: "100%", maxHeight: 280, objectFit: "cover", opacity: 0.42 }} />
          <div style={{ padding: "18px 18px 22px" }}>
            <p style={{ color: "rgba(125,211,252,0.7)", fontSize: "0.66rem", letterSpacing: "0.28em", margin: 0 }}>MOONLIGHT STRATEGY · DETAIL INTRO</p>
            <h3 style={{ color: "#fff", fontWeight: 900, fontSize: "1.5rem", margin: "8px 0 6px" }}>숙요점 달빛 전략 리포트</h3>
            <p style={{ color: "rgba(186,230,253,0.72)", fontSize: "0.88rem", lineHeight: 1.8, margin: 0 }}>
              27수 별자리 흐름을 13개 챕터로 먼저 확인하고, 버튼 클릭 시 PDF 생성 단계로 진입합니다.
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
        {["13챕터 심층 분석", "27수 완전 해석", "6대 관계 역학", "달의 주기 전략", "PDF 다운로드"].map((tag) => (
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
                  style={{
                    padding: "12px 24px",
                    borderRadius: 12,
                    border: "1px solid rgba(251,191,36,0.4)",
                    background: "linear-gradient(135deg, rgba(120,53,15,0.5) 0%, rgba(30,27,75,0.5) 100%)",
                    color: "rgba(251,191,36,0.9)",
                    fontSize: "0.88rem",
                    fontWeight: 700,
                    cursor: "pointer",
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
        </div>
      )}
    </div>
  );
}
