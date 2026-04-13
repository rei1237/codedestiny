"use client";
import React, { useState, useCallback, useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────────────────
interface PlanetInfo {
  sign: string; signKo: string; signEmoji: string;
  degree: number; longitude: number; house: number;
}
interface AspectInfo {
  planet1: string; planet2: string;
  type: string; typeKo: string; orb: number;
}
interface ChartData {
  planets: Record<string, PlanetInfo>;
  ascendant: PlanetInfo;
  midheaven: PlanetInfo;
  aspects: AspectInfo[];
  northNode: PlanetInfo;
  southNode: PlanetInfo;
}
interface ChapterMeta { num: number; title: string; subtitle: string; icon: string; }
interface ChapterResult {
  chapter: number;
  chapterMeta: ChapterMeta;
  text: string;
  sections: { title: string; body: string }[];
}
type ChapterStep = "idle" | "loading" | "done" | "error";
interface ChapterState { step: ChapterStep; result: ChapterResult | null; }

type PremiumSectionProps = {
  showIntro?: boolean;
  onStartGeneration?: () => void | Promise<void>;
  generationLoading?: boolean;
};

// ─────────────────────────────────────────────────────────────────
// 챕터 메타 (UI 표시용)
// ─────────────────────────────────────────────────────────────────
const CHAPTER_META: ChapterMeta[] = [
  { num:  1, title: "페르소나와 존재의 핵",       subtitle: "ASC·Sun·Moon의 입체적 결합",         icon: "🌌" },
  { num:  2, title: "감정의 뿌리",                subtitle: "Moon & 4하우스",                     icon: "🌊" },
  { num:  3, title: "인지 체계와 정보의 연금술",  subtitle: "Mercury & 3·9하우스",                icon: "🧠" },
  { num:  4, title: "욕망의 미학과 가치 자산",    subtitle: "Venus & 2·7하우스",                  icon: "💎" },
  { num:  5, title: "추진력과 에너지 관리",       subtitle: "Mars & 1·8하우스",                   icon: "⚡" },
  { num:  6, title: "행운의 좌표",                subtitle: "Jupiter & 9하우스",                  icon: "🌠" },
  { num:  7, title: "업보의 한계와 마스터의 길",  subtitle: "Saturn & 10하우스",                  icon: "🏛️" },
  { num:  8, title: "세대적 변화와 개인의 혁신",  subtitle: "Uranus · Neptune · Pluto",           icon: "🌀" },
  { num:  9, title: "영혼의 나침반",              subtitle: "Lunar Nodes",                         icon: "🧭" },
  { num: 10, title: "시냅스트리 — 관계의 투사",   subtitle: "궁합 1: 심리적 행성 각도",           icon: "🔮" },
  { num: 11, title: "컴포지트 — 우리라는 운명",   subtitle: "궁합 2: 합산 차트",                  icon: "⭕" },
  { num: 12, title: "별들의 마스터플랜",           subtitle: "총결산 및 개운법",                   icon: "✨" },
];

const ASTROLOGY_STORAGE_KEY = "premium:astrology:session:v1";

// ─────────────────────────────────────────────────────────────────
// 로더
// ─────────────────────────────────────────────────────────────────
function StarLoader({ message }: { message?: string }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:20, padding:"48px 0" }}>
      <div style={{ position:"relative", width:72, height:72 }}>
        <div style={{
          position:"absolute", inset:0, borderRadius:"50%",
          border:"2px solid rgba(251,191,36,0.3)",
          animation:"spin 2s linear infinite",
        }} />
        <div style={{
          position:"absolute", inset:8, borderRadius:"50%",
          border:"2px solid rgba(167,139,250,0.35)",
          animation:"spin 3s linear infinite reverse",
        }} />
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28 }}>
          ⭐
        </div>
      </div>
      <div style={{ textAlign:"center" }}>
        <p style={{ fontSize:"0.82rem", fontWeight:600, letterSpacing:"0.2em", color:"rgba(251,191,36,0.85)" }}>
          {message ?? "별자리 에너지를 분석하는 중"}
        </p>
        <p style={{ marginTop:4, fontSize:"0.72rem", letterSpacing:"0.1em", color:"rgba(148,163,184,0.5)" }}>
          AI가 당신의 출생 차트를 해석하고 있습니다…
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// 텍스트 렌더러
// ─────────────────────────────────────────────────────────────────
function renderTextBlock(text: string) {
  if (!text) return null;
  return text.split(/\n{2,}/).map((para, i) => (
    <p key={i} style={{
      lineHeight:2.0, letterSpacing:"0.025em",
      color:"rgba(203,213,225,0.88)", fontSize:"0.95rem", marginBottom:"1.3em",
    }}>
      {para.replace(/\n/g, " ")}
    </p>
  ));
}

// ─────────────────────────────────────────────────────────────────
// 행성 배지
// ─────────────────────────────────────────────────────────────────
function PlanetBadge({ label, info }: { label: string; info: PlanetInfo }) {
  return (
    <span style={{
      borderRadius:9999, padding:"4px 12px", fontSize:"0.78rem", fontWeight:700,
      background:"rgba(251,191,36,0.12)", border:"1px solid rgba(251,191,36,0.28)",
      color:"rgba(253,230,138,0.95)", display:"inline-flex", alignItems:"center", gap:4,
    }}>
      {info.signEmoji} {label}: {info.signKo} {info.degree}° / {info.house}H
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────
// 차트 요약 패널
// ─────────────────────────────────────────────────────────────────
function ChartSummary({ chart }: { chart: ChartData }) {
  const mainPlanets: { key: string; label: string }[] = [
    { key:"Sun",     label:"☀️ 태양" },
    { key:"Moon",    label:"🌙 달" },
    { key:"Mercury", label:"☿ 수성" },
    { key:"Venus",   label:"♀ 금성" },
    { key:"Mars",    label:"♂ 화성" },
    { key:"Jupiter", label:"♃ 목성" },
    { key:"Saturn",  label:"♄ 토성" },
    { key:"Uranus",  label:"♅ 천왕성" },
    { key:"Neptune", label:"♆ 해왕성" },
    { key:"Pluto",   label:"♇ 명왕성" },
  ];
  return (
    <div style={{
      borderRadius:16, padding:"20px", marginBottom:20,
      background:"rgba(7,9,26,0.8)", border:"1px solid rgba(251,191,36,0.15)",
    }}>
      <p style={{ color:"rgba(251,191,36,0.6)", fontSize:"0.65rem", letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:12 }}>
        NATAL CHART — 출생 차트 요약
      </p>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 }}>
        <PlanetBadge label="ASC" info={chart.ascendant} />
        <PlanetBadge label="MC" info={chart.midheaven} />
        <span style={{
          borderRadius:9999, padding:"4px 12px", fontSize:"0.78rem", fontWeight:700,
          background:"rgba(99,102,241,0.15)", border:"1px solid rgba(99,102,241,0.3)",
          color:"rgba(196,181,253,0.9)",
        }}>
          {chart.northNode.signEmoji} NN: {chart.northNode.signKo} {chart.northNode.house}H
        </span>
        <span style={{
          borderRadius:9999, padding:"4px 12px", fontSize:"0.78rem", fontWeight:700,
          background:"rgba(99,102,241,0.10)", border:"1px solid rgba(99,102,241,0.2)",
          color:"rgba(148,163,184,0.75)",
        }}>
          {chart.southNode.signEmoji} SN: {chart.southNode.signKo} {chart.southNode.house}H
        </span>
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
        {mainPlanets.map(({ key, label }) => {
          const p = chart.planets[key];
          if (!p) return null;
          return <PlanetBadge key={key} label={label} info={p} />;
        })}
      </div>
      {chart.aspects.length > 0 && (
        <div style={{ marginTop:12 }}>
          <p style={{ color:"rgba(148,163,184,0.5)", fontSize:"0.65rem", letterSpacing:"0.15em", marginBottom:6 }}>
            주요 에스펙트 (orb 8° 이내)
          </p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
            {chart.aspects.slice(0,8).map((a, i) => (
              <span key={i} style={{
                borderRadius:8, padding:"3px 10px", fontSize:"0.72rem", fontWeight:600,
                background:"rgba(15,23,42,0.7)", border:"1px solid rgba(100,116,139,0.25)",
                color:"rgba(148,163,184,0.8)",
              }}>
                {a.planet1}↔{a.planet2} {a.typeKo} {a.orb}°
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// 챕터 카드
// ─────────────────────────────────────────────────────────────────
function ChapterCard({
  meta, state, onGenerate
}: { meta: ChapterMeta; state: ChapterState; onGenerate: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      borderRadius:16, overflow:"hidden",
      background:"rgba(7,9,26,0.75)",
      border:`1.5px solid ${state.step === "done" ? "rgba(251,191,36,0.35)" : "rgba(100,116,139,0.25)"}`,
      boxShadow: state.step === "done" ? "0 4px 24px rgba(251,191,36,0.08)" : "none",
      transition:"border-color 0.3s",
    }}>
      {/* 헤더 */}
      <div style={{
        padding:"16px 18px",
        background:"rgba(251,191,36,0.04)",
        borderBottom:"1px solid rgba(100,116,139,0.15)",
        display:"flex", alignItems:"center", justifyContent:"space-between", gap:12,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:22 }}>{meta.icon}</span>
          <div>
            <p style={{ color:"rgba(251,191,36,0.5)", fontSize:"0.6rem", letterSpacing:"0.18em", textTransform:"uppercase", margin:0 }}>
              CHAPTER {meta.num}
            </p>
            <p style={{ color:"#fff", fontWeight:800, fontSize:"0.95rem", margin:0, lineHeight:1.3 }}>
              {meta.title}
            </p>
            <p style={{ color:"rgba(148,163,184,0.55)", fontSize:"0.72rem", margin:0 }}>{meta.subtitle}</p>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, flexShrink:0 }}>
          {state.step === "done" && (
            <button
              onClick={() => setExpanded(v => !v)}
              style={{
                borderRadius:10, padding:"6px 14px", fontSize:"0.75rem", fontWeight:700,
                background:"rgba(251,191,36,0.12)", border:"1px solid rgba(251,191,36,0.3)",
                color:"rgba(253,230,138,0.9)", cursor:"pointer",
              }}
            >
              {expanded ? "접기 ▲" : "보기 ▼"}
            </button>
          )}
          {state.step !== "done" && (
            <button
              onClick={onGenerate}
              disabled={state.step === "loading"}
              style={{
                borderRadius:10, padding:"6px 16px", fontSize:"0.75rem", fontWeight:800,
                background: state.step === "loading"
                  ? "rgba(100,116,139,0.3)"
                  : "linear-gradient(135deg, #f59e0b, #d97706)",
                border:"none", color: state.step === "loading" ? "rgba(148,163,184,0.5)" : "#fff",
                cursor: state.step === "loading" ? "not-allowed" : "pointer",
                transition:"opacity 0.2s",
              }}
            >
              {state.step === "loading" ? "생성 중…" : "✦ 분석"}
            </button>
          )}
          {state.step === "error" && (
            <button
              onClick={onGenerate}
              style={{
                borderRadius:10, padding:"6px 16px", fontSize:"0.75rem", fontWeight:800,
                background:"rgba(239,68,68,0.2)", border:"1px solid rgba(239,68,68,0.4)",
                color:"rgba(252,165,165,0.9)", cursor:"pointer",
              }}
            >
              재시도
            </button>
          )}
        </div>
      </div>

      {/* 로딩 */}
      {state.step === "loading" && (
        <StarLoader message={`챕터 ${meta.num}: ${meta.title} 분석 중`} />
      )}

      {/* 에러 */}
      {state.step === "error" && (
        <div style={{ padding:"16px 18px" }}>
          <p style={{ color:"rgba(252,165,165,0.8)", fontSize:"0.82rem" }}>
            ⚠ AI 생성에 실패했습니다. 잠시 후 재시도해 주세요.
          </p>
        </div>
      )}

      {/* 결과 */}
      {state.step === "done" && state.result && expanded && (
        <div style={{ padding:"18px 20px" }}>
          {state.result.sections.length > 0 ? (
            state.result.sections.map((sec, i) => (
              <div key={i} style={{ marginBottom:24 }}>
                <h4 style={{
                  color:"rgba(253,230,138,0.9)", fontWeight:800, fontSize:"0.95rem",
                  marginBottom:10, paddingBottom:6,
                  borderBottom:"1px solid rgba(251,191,36,0.12)",
                }}>
                  {sec.title}
                </h4>
                {renderTextBlock(sec.body)}
              </div>
            ))
          ) : (
            renderTextBlock(state.result.text)
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────────────────────────
export default function HPremiumAstrologySection({
  showIntro = false,
  onStartGeneration,
  generationLoading = false,
}: PremiumSectionProps) {
  const createEmptyChapters = () =>
    Object.fromEntries(CHAPTER_META.map((m) => [m.num, { step: "idle" as ChapterStep, result: null }]));

  // 입력 폼
  const [birthYear,   setBirthYear]   = useState("");
  const [birthMonth,  setBirthMonth]  = useState("");
  const [birthDay,    setBirthDay]    = useState("");
  const [birthHour,   setBirthHour]   = useState("12");
  const [birthMinute, setBirthMinute] = useState("0");
  const [timezone,    setTimezone]    = useState("9");

  // 상태
  const [chart,    setChart]    = useState<ChartData | null>(null);
  const [chapters, setChapters] = useState<Record<number, ChapterState>>(
    () => createEmptyChapters()
  );
  const [calcError, setCalcError] = useState("");
  const [calcLoading, setCalcLoading] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const storageReadyRef = useRef(false);

  const resetAstrologyState = useCallback((resetInputs = false) => {
    setChart(null);
    setChapters(createEmptyChapters());
    setCalcError("");
    setCalcLoading(false);
    setRequestError("");
    setPdfLoading(false);
    setPdfError("");
    if (resetInputs) {
      setBirthYear("");
      setBirthMonth("");
      setBirthDay("");
      setBirthHour("12");
      setBirthMinute("0");
      setTimezone("9");
      try {
        localStorage.removeItem(ASTROLOGY_STORAGE_KEY);
      } catch {
        // ignore storage cleanup errors
      }
    }
  }, []);

  useEffect(() => {
    if (showIntro) return;
    try {
      const raw = localStorage.getItem(ASTROLOGY_STORAGE_KEY);
      if (!raw) {
        storageReadyRef.current = true;
        return;
      }
      const saved = JSON.parse(raw) as {
        birthYear?: string;
        birthMonth?: string;
        birthDay?: string;
        birthHour?: string;
        birthMinute?: string;
        timezone?: string;
        chart?: ChartData | null;
        chapters?: Record<number, ChapterState>;
      };

      if (saved.birthYear) setBirthYear(saved.birthYear);
      if (saved.birthMonth) setBirthMonth(saved.birthMonth);
      if (saved.birthDay) setBirthDay(saved.birthDay);
      if (saved.birthHour) setBirthHour(saved.birthHour);
      if (saved.birthMinute) setBirthMinute(saved.birthMinute);
      if (saved.timezone) setTimezone(saved.timezone);
      if (saved.chart) setChart(saved.chart);
      if (saved.chapters) {
        const normalized = Object.fromEntries(
          CHAPTER_META.map((meta) => {
            const state = saved.chapters?.[meta.num] ?? { step: "idle" as ChapterStep, result: null };
            return [meta.num, state.step === "loading" ? { step: "idle" as ChapterStep, result: state.result ?? null } : state];
          })
        ) as Record<number, ChapterState>;
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
        ASTROLOGY_STORAGE_KEY,
        JSON.stringify({
          birthYear,
          birthMonth,
          birthDay,
          birthHour,
          birthMinute,
          timezone,
          chart,
          chapters,
        })
      );
    } catch {
      // ignore storage quota errors
    }
  }, [birthYear, birthMonth, birthDay, birthHour, birthMinute, timezone, chart, chapters, showIntro]);

  useEffect(() => {
    if (showIntro) {
      resetAstrologyState(false);
    }
  }, [showIntro, resetAstrologyState]);

  const handleDownloadAstroPDF = useCallback(async () => {
    const doneChapters = CHAPTER_META.filter(m => chapters[m.num]?.step === "done");
    if (doneChapters.length === 0) { setPdfError("먼저 쳭터를 하나 이상 생성해 주세요."); return; }
    setPdfLoading(true); setPdfError("");
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfModule = await import("@react-pdf/renderer" as any).catch(() => null);
      if (!pdfModule) throw new Error("PDF 라이브러리를 로드할 수 없습니다.");
      const { pdf, Document, Page, Text, View, StyleSheet, Font } = pdfModule;
      try {
        Font.register({
          family: "NanumGothic",
          src: "https://fonts.gstatic.com/s/nanumgothic/v21/PN_3Rfi-oW3hYwmKDpxS7F_z_6Ij4h6Y.woff2",
        });
      } catch { /* 폰트 로드 실패 시 기본 폰트 사용 */ }
      const styles = StyleSheet.create({
        page: { fontFamily: "NanumGothic", backgroundColor: "#07091a", color: "#e2e8f0", padding: 38 },
        coverTitle: { fontSize: 24, fontWeight: "bold", color: "#fbbf24", textAlign: "center", marginBottom: 8 },
        coverSub: { fontSize: 11, color: "#a78bfa", textAlign: "center", marginBottom: 4 },
        divider: { borderBottomWidth: 1, borderBottomColor: "#1e2a4a", marginVertical: 14 },
        chapterTitle: { fontSize: 16, fontWeight: "bold", color: "#f8fafc", marginBottom: 4, marginTop: 14 },
        chapterSub: { fontSize: 10, color: "#fde68a", marginBottom: 8 },
        sectionTitle: { fontSize: 12, fontWeight: "bold", color: "#fbbf24", marginBottom: 4, marginTop: 10 },
        body: { fontSize: 10, color: "#cbd5e1", lineHeight: 1.8, marginBottom: 6 },
      });
      const chartLines: string[] = chart ? [
        `ASC: ${chart.ascendant?.signKo ?? "-"} ${chart.ascendant?.degree ?? ""}\u00b0`,
        `\u2600\ufe0f \ud0dc양: ${chart.planets?.Sun?.signKo ?? "-"} | \ud83c\udf19 달: ${chart.planets?.Moon?.signKo ?? "-"}`,
      ] : [];
      const MyDoc = (
        <Document>
          <Page size="A4" style={styles.page}>
            <Text style={styles.coverTitle}>점성술 프리미엄 리포트</Text>
            <Text style={styles.coverSub}>CODE : DESTINY \u00b7 ASTROLOGY PREMIUM</Text>
            {chartLines.map((l: string, i: number) => <Text key={i} style={styles.coverSub}>{l}</Text>)}
            <View style={styles.divider} />
            {doneChapters.map((ch, idx: number) => {
              const r = chapters[ch.num].result!;
              return (
                <View key={`ch-${ch.num}-${idx}`}>
                  <Text style={styles.chapterTitle}>{ch.icon} Chapter {String(ch.num).padStart(2, "0")} \u00b7 {ch.title}</Text>
                  <Text style={styles.chapterSub}>{ch.subtitle}</Text>
                  {r.sections.length > 0
                    ? r.sections.map((sec: { title: string; body: string }, si: number) => (
                        <View key={si}>
                          <Text style={styles.sectionTitle}>{sec.title}</Text>
                          <Text style={styles.body}>{sec.body ?? ""}</Text>
                        </View>
                      ))
                    : <Text style={styles.body}>{r.text ?? ""}</Text>}
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
      a.download = `점성술_프리미엄_${birthYear}-${birthMonth}-${birthDay}.pdf`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : "PDF 생성 중 오류가 발생했습니다.");
    } finally {
      setPdfLoading(false);
    }
  }, [chapters, chart, birthYear, birthMonth, birthDay]);

  const postAstroJson = useCallback(async (path: string, payload: unknown) => {
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 65000);
      try {
        const res = await fetch(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || "요청 처리 중 오류가 발생했습니다.");
        }
        return data;
      } catch (e) {
        lastError = e;
        if (attempt === 2) break;
      } finally {
        clearTimeout(timeoutId);
      }
    }
    throw lastError instanceof Error ? lastError : new Error("요청 처리 중 오류가 발생했습니다.");
  }, []);

  // 차트 계산 (chapter 0 으로 호출해 계산만)
  const handleCalcChart = useCallback(async () => {
    const y = parseInt(birthYear,  10);
    const m = parseInt(birthMonth, 10);
    const d = parseInt(birthDay,   10);
    if (!y || !m || !d) { setCalcError("생년월일을 입력해 주세요."); return; }
    if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) {
      setCalcError("올바른 날짜를 입력해 주세요."); return;
    }
    setCalcError("");
    setRequestError("");
    setCalcLoading(true);
    try {
      const data = await postAstroJson("/api/premium/astro-western", {
        year:y, month:m, day:d,
        hour:  parseInt(birthHour,   10),
        minute:parseInt(birthMinute, 10),
        timezone: parseFloat(timezone),
      });
      setChart({
        planets:   data.planets,
        ascendant: data.ascendant,
        midheaven: data.midheaven,
        aspects:   data.aspects,
        northNode: data.planets?.NorthNode ?? data.ascendant,
        southNode: data.planets?.SouthNode ?? data.ascendant,
      });
      // 상태 초기화
      setChapters(createEmptyChapters());
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "차트 계산 중 오류";
      setCalcError(message);
      setRequestError(message);
    } finally {
      setCalcLoading(false);
    }
  }, [birthYear, birthMonth, birthDay, birthHour, birthMinute, timezone, postAstroJson]);

  // 챕터 생성
  const handleGenerateChapter = useCallback(async (chNum: number) => {

    setRequestError("");
    setChapters(prev => ({ ...prev, [chNum]: { step:"loading", result:null } }));
    try {
      const data = await postAstroJson("/api/premium/astro-life", {
        year:   parseInt(birthYear,  10),
        month:  parseInt(birthMonth, 10),
        day:    parseInt(birthDay,   10),
        hour:   parseInt(birthHour,  10),
        minute: parseInt(birthMinute,10),
        timezone: parseFloat(timezone),
        chapter: chNum,
      });
      setChapters(prev => ({
        ...prev,
        [chNum]: { step:"done", result: { chapter:chNum, chapterMeta:data.chapterMeta, text:data.text, sections:data.sections } },
      }));
      // 차트 최신화 (astro-life에서도 계산 결과가 옴)
      if (data.chart && !chart) setChart(data.chart);
    } catch (e: unknown) {
      setRequestError(e instanceof Error ? e.message : "챕터 생성 중 오류가 발생했습니다.");
      setChapters(prev => ({ ...prev, [chNum]: { step:"error", result:null } }));
    }
  }, [birthYear, birthMonth, birthDay, birthHour, birthMinute, timezone, chart, postAstroJson]);

  // 전체 챕터 순차 생성
  const handleGenerateAll = useCallback(async () => {

    const pending = CHAPTER_META.filter((meta) => chapters[meta.num]?.step !== "done");
    for (const meta of pending) {
      await handleGenerateChapter(meta.num);
    }
  }, [chapters, handleGenerateChapter]);

  const inputStyle: React.CSSProperties = {
    background:"rgba(7,9,26,0.8)", border:"1px solid rgba(251,191,36,0.25)",
    borderRadius:10, color:"#e2e8f0", fontSize:"0.9rem", padding:"10px 14px",
    outline:"none", width:"100%",
  };
  const labelStyle: React.CSSProperties = {
    color:"rgba(251,191,36,0.6)", fontSize:"0.68rem", letterSpacing:"0.15em",
    textTransform:"uppercase", display:"block", marginBottom:4,
  };

  const doneCount = Object.values(chapters).filter(c => c.step === "done").length;

  if (showIntro) {
    return (
      <section style={{
        background:"linear-gradient(145deg, #07091a 0%, #0c0f24 50%, #070916 100%)",
        border:"1px solid rgba(251,191,36,0.18)",
        borderRadius:24, overflow:"hidden",
        boxShadow:"0 12px 50px rgba(251,191,36,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}>
        <div style={{ position:"relative", overflow:"hidden", borderBottom:"1px solid rgba(251,191,36,0.12)" }}>
          <img src="/fuctionassets/premiumstar.webp" alt="점성술 프리미엄 소개" style={{ width:"100%", maxHeight:280, objectFit:"cover", opacity:0.36 }} />
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg, rgba(7,9,26,0.55) 0%, rgba(7,9,26,0.96) 100%)" }} />
          <div style={{ position:"absolute", left:20, right:20, bottom:20 }}>
            <p style={{ color:"rgba(251,191,36,0.7)", fontSize:"0.66rem", letterSpacing:"0.28em", margin:0 }}>ASTROLOGY PREMIUM · DETAIL INTRO</p>
            <h3 style={{ color:"#fff", fontWeight:900, fontSize:"1.5rem", margin:"8px 0 6px" }}>점성술 프리미엄 리포트</h3>
            <p style={{ color:"rgba(203,213,225,0.75)", fontSize:"0.88rem", margin:0, lineHeight:1.8 }}>ASC/Sun/Moon 기반 12챕터 분석을 먼저 확인하고, 원할 때 PDF 생성 단계로 진입하세요.</p>
          </div>
        </div>

        <div style={{ padding:"18px 18px 22px" }}>
          <p style={{ color:"rgba(251,191,36,0.65)", fontSize:"0.72rem", letterSpacing:"0.18em", margin:"0 0 10px" }}>리포트 목차 미리보기 (12 CHAPTERS)</p>
          <div style={{ display:"grid", gap:8 }}>
            {CHAPTER_META.map((ch) => (
              <div key={ch.num} style={{ borderRadius:12, border:"1px solid rgba(251,191,36,0.18)", background:"rgba(15,23,42,0.35)", padding:"10px 12px" }}>
                <p style={{ margin:0, color:"rgba(253,230,138,0.9)", fontSize:"0.82rem", fontWeight:700 }}>
                  {ch.icon} CHAPTER {ch.num}. {ch.title}
                </p>
                <p style={{ margin:"4px 0 0", color:"rgba(148,163,184,0.75)", fontSize:"0.74rem" }}>{ch.subtitle}</p>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onStartGeneration?.()}
            disabled={generationLoading}
            style={{
              marginTop:14,
              width:"100%",
              borderRadius:12,
              padding:"14px",
              background: generationLoading ? "rgba(60,50,20,0.5)" : "linear-gradient(135deg, #f59e0b 0%, #d97706 55%, #b45309 100%)",
              border:"none",
              color: generationLoading ? "rgba(148,163,184,0.5)" : "#fff",
              fontWeight:900,
              fontSize:"0.96rem",
              letterSpacing:"0.05em",
              cursor: generationLoading ? "wait" : "pointer",
              boxShadow: generationLoading ? "none" : "0 4px 20px rgba(251,191,36,0.3)",
              opacity: generationLoading ? 0.72 : 1,
            }}
          >
            {generationLoading ? "코인 확인 중…" : "프리미엄 PDF 리포트 생성하기"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section style={{
      background:"linear-gradient(145deg, #07091a 0%, #0c0f24 50%, #070916 100%)",
      border:"1px solid rgba(251,191,36,0.18)",
      borderRadius:24, overflow:"hidden",
      boxShadow:"0 12px 50px rgba(251,191,36,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
    }}>
      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulse-gold { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>

      {/* ── 마케팅 배너 헤더 ── */}
      <div style={{ position:"relative", overflow:"hidden", borderBottom:"1px solid rgba(251,191,36,0.12)" }}>
        {/* 뒤 배경 이미지 */}
        <div style={{ position:"absolute", inset:0, zIndex:0, pointerEvents:"none" }}>
          <img src="/fuctionassets/premiumstar.webp" alt=""
            style={{ width:"100%", height:"100%", objectFit:"cover", opacity:0.10, filter:"blur(3px)" }} />
          <div style={{ position:"absolute", inset:0,
            background:"linear-gradient(to right, rgba(7,9,26,0.98) 0%, rgba(7,9,26,0.80) 60%, rgba(7,9,26,0.65) 100%)" }} />
        </div>
        {/* 콘텐츠 */}
        <div style={{ position:"relative", zIndex:1, padding:"32px 24px 28px" }}>
          <p style={{ color:"rgba(251,191,36,0.55)", fontSize:"0.6rem", letterSpacing:"0.32em", fontWeight:700, textTransform:"uppercase", marginBottom:10, margin:"0 0 10px" }}>
            CODE : DESTINY · ASTROLOGY PREMIUM
          </p>
          <h2 style={{ color:"#fff", fontWeight:900, fontSize:"clamp(1.3rem,4vw,1.9rem)", lineHeight:1.25, margin:"0 0 12px" }}>
            🌌 당신의 별자리, 진짜 의미를 아십니까?
          </h2>
          <p style={{ color:"rgba(203,213,225,0.72)", fontSize:"0.9rem", lineHeight:1.85, margin:"0 0 20px", maxWidth:540 }}>
            생년월일·시간 하나로 <strong style={{color:"rgba(253,230,138,0.9)"}}>실제 행성 좌표</strong>를 계산해
            태양궁·달궁·상승궁 삼각 에너지와 12하우스 운명 지도를 AI가 완전 분석합니다.
            별자리 앱에서는 절대 볼 수 없는 당신만의 코즈믹 청사진.
          </p>
          {/* 특징 배지 */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:"7px", marginBottom:20 }}>
            {[
              "⭐ 실제 행성 좌표 정밀 계산",
              "☀️ 태양·달·상승궁 3각 에너지",
              "🪐 12하우스 재물·사랑·직업 운세",
              "🌌 지금 트랜지트 인생 영향",
              "✨ AI 12챕터 심층 해석",
              "💫 서양 열대황도 전문 엔진",
            ].map((f,i) => (
              <span key={i} style={{
                background:"rgba(251,191,36,0.07)", border:"1px solid rgba(251,191,36,0.22)",
                color:"rgba(253,230,138,0.82)", fontSize:"0.7rem", fontWeight:600,
                padding:"4px 11px", borderRadius:20,
              }}>{f}</span>
            ))}
          </div>
          {/* 가격 & 완료 카운터 */}
          <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
            <div style={{
              background:"linear-gradient(135deg,rgba(251,191,36,0.14),rgba(253,230,138,0.07))",
              border:"1px solid rgba(251,191,36,0.35)", borderRadius:12, padding:"9px 18px",
            }}>
              <p style={{ color:"rgba(251,191,36,0.6)", fontSize:"0.58rem", letterSpacing:"0.18em", margin:0 }}>이용 요금</p>
              <p style={{ color:"#fbbf24", fontWeight:900, fontSize:"1rem", margin:0 }}>🪙 1회 390코인</p>
            </div>
            <p style={{ color:"rgba(148,163,184,0.55)", fontSize:"0.73rem", margin:0, lineHeight:1.7 }}>
              ✦ 결제 즉시 전체 12챕터 생성 시작<br/>
              ✦ AI 개인 맞춤 분석 — 동일한 결과 없음
            </p>
            {doneCount > 0 && (
              <div style={{ marginLeft:"auto", textAlign:"center", flexShrink:0 }}>
                <p style={{ color:"rgba(251,191,36,0.6)", fontSize:"0.65rem", letterSpacing:"0.15em", margin:0 }}>완료</p>
                <p style={{ color:"#fbbf24", fontWeight:900, fontSize:"1.4rem", margin:0 }}>{doneCount}/12</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding:"20px 20px 28px" }}>
        {/* ── 입력 폼 ── */}
        {!chart && (
          <div style={{
            borderRadius:16, padding:"20px", marginBottom:20,
            background:"rgba(7,9,26,0.7)", border:"1px solid rgba(251,191,36,0.18)",
          }}>
            <p style={{ color:"#fff", fontWeight:800, fontSize:"1rem", marginBottom:16 }}>
              ✨ 출생 정보 입력
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"12px" }}
              className="astro-input-grid">
              <style>{`@media(max-width:560px){.astro-input-grid{grid-template-columns:1fr 1fr!important}}`}</style>
              <div>
                <span style={labelStyle}>출생 연도</span>
                <input style={inputStyle} type="number" placeholder="1990" value={birthYear}
                  onChange={e => setBirthYear(e.target.value)} />
              </div>
              <div>
                <span style={labelStyle}>월</span>
                <input style={inputStyle} type="number" placeholder="1" min={1} max={12} value={birthMonth}
                  onChange={e => setBirthMonth(e.target.value)} />
              </div>
              <div>
                <span style={labelStyle}>일</span>
                <input style={inputStyle} type="number" placeholder="1" min={1} max={31} value={birthDay}
                  onChange={e => setBirthDay(e.target.value)} />
              </div>
              <div>
                <span style={labelStyle}>출생 시 (0-23)</span>
                <input style={inputStyle} type="number" placeholder="12" min={0} max={23} value={birthHour}
                  onChange={e => setBirthHour(e.target.value)} />
              </div>
              <div>
                <span style={labelStyle}>출생 분</span>
                <input style={inputStyle} type="number" placeholder="0" min={0} max={59} value={birthMinute}
                  onChange={e => setBirthMinute(e.target.value)} />
              </div>
              <div>
                <span style={labelStyle}>시간대 (UTC+)</span>
                <input style={inputStyle} type="number" placeholder="9" step={0.5} value={timezone}
                  onChange={e => setTimezone(e.target.value)} />
              </div>
            </div>
            {calcError && (
              <p style={{ color:"rgba(252,165,165,0.9)", fontSize:"0.82rem", marginTop:10 }}>⚠ {calcError}</p>
            )}
            {requestError && (
              <p style={{ color:"rgba(252,165,165,0.9)", fontSize:"0.82rem", marginTop:8 }}>⚠ {requestError}</p>
            )}
            <button
              onClick={handleCalcChart}
              disabled={calcLoading}
              style={{
                marginTop:16, width:"100%", borderRadius:12, padding:"14px",
                background: calcLoading
                  ? "rgba(100,116,139,0.3)"
                  : "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)",
                border:"none", color: calcLoading ? "rgba(148,163,184,0.5)" : "#fff",
                fontWeight:900, fontSize:"1rem", letterSpacing:"0.05em",
                cursor: calcLoading ? "not-allowed" : "pointer",
                boxShadow: calcLoading ? "none" : "0 4px 20px rgba(251,191,36,0.3)",
              }}
            >
              {calcLoading ? "⭐ 차트 계산 중…" : "🌌 출생 차트 계산하기"}
            </button>
          </div>
        )}

        {/* ── 차트 요약 + 재입력 ── */}
        {chart && (
          <>
            <ChartSummary chart={chart} />
            <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
              <button
                onClick={() => { resetAstrologyState(true); }}
                style={{
                  borderRadius:10, padding:"8px 18px", fontSize:"0.82rem", fontWeight:700,
                  background:"rgba(100,116,139,0.25)", border:"1px solid rgba(100,116,139,0.3)",
                  color:"rgba(148,163,184,0.85)", cursor:"pointer",
                }}
              >
                ← 재입력
              </button>
              <button
                onClick={handleGenerateAll}
                disabled={doneCount === 12}
                style={{
                  borderRadius:10, padding:"8px 20px", fontSize:"0.82rem", fontWeight:800,
                  background: doneCount === 12 ? "rgba(100,116,139,0.2)" : "linear-gradient(135deg, #9333ea, #7c3aed)",
                  border:"none", color: doneCount === 12 ? "rgba(148,163,184,0.5)" : "#fff",
                  cursor: doneCount === 12 ? "not-allowed" : "pointer",
                  boxShadow: doneCount === 12 ? "none" : "0 4px 16px rgba(147,51,234,0.35)",
                }}
              >
                ✦ 전체 12챕터 순차 생성
              </button>
            </div>

            {/* ── 챕터 리스트 ── */}
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {CHAPTER_META.map(meta => (
                <ChapterCard
                  key={meta.num}
                  meta={meta}
                  state={chapters[meta.num]}
                  onGenerate={() => handleGenerateChapter(meta.num)}
                />
              ))}
            </div>            {/* ── PDF 다운로드 ── */}
            {doneCount > 0 && (
              <div style={{ marginTop:20, padding:"16px", borderRadius:14, background:"rgba(7,9,26,0.8)", border:"1px solid rgba(251,191,36,0.22)", textAlign:"center" }}>
                <p style={{ color:"rgba(251,191,36,0.65)", fontSize:"0.68rem", letterSpacing:"0.18em", textTransform:"uppercase", margin:"0 0 10px" }}>ASTROLOGY PREMIUM PDF</p>
                <button
                  onClick={handleDownloadAstroPDF}
                  disabled={pdfLoading}
                  style={{
                    display:"inline-flex", alignItems:"center", gap:8,
                    borderRadius:12, padding:"12px 28px", fontSize:"0.9rem", fontWeight:800,
                    background: pdfLoading ? "rgba(100,116,139,0.3)" : "linear-gradient(135deg,#f59e0b,#d97706)",
                    border:"1px solid rgba(251,191,36,0.4)",
                    color: pdfLoading ? "rgba(148,163,184,0.5)" : "#fff",
                    cursor: pdfLoading ? "not-allowed" : "pointer",
                    boxShadow: !pdfLoading ? "0 4px 20px rgba(251,191,36,0.25)" : "none",
                    transition:"all 0.2s",
                  }}
                >
                  {pdfLoading ? "\ud83d\udcc4 PDF 생성 중…" : `\ud83d\udce5 PDF 다운로드 (${doneCount}/12쳭터)`}
                </button>
                {pdfError && <p style={{ color:"rgba(252,165,165,0.85)", fontSize:"0.78rem", marginTop:8 }}>⚠ {pdfError}</p>}
                <p style={{ color:"rgba(148,163,184,0.45)", fontSize:"0.7rem", marginTop:6 }}>\uc644\ub8cc\ub41c {doneCount}\uac1c \ucced\ud130\ub97c \ud3ec\ud568\ud55c \uc810\uc131\uc220 PDF \ub9ac\ud3ec\ud2b8\ub97c \uc0dd\uc131\ud569\ub2c8\ub2e4</p>
              </div>
            )}          </>
        )}
      </div>
    </section>
  );
}
