"use client";
import React, { useState, useCallback, useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────────────────
interface VedicPlanet {
  name: string; nameKo: string; longitude: number;
  sign: number; signName: string; signSanskrit: string; signKo: string; signEmoji: string;
  degree: number; house: number; dignity: string; isRetrograde: boolean;
  nakshatra: string; nakshatraKo: string; nakshatraPada: number; nakshatraLord: string;
}
interface DashaPeriod { planet: string; startDate: string; endDate: string; remainYears: number; }
interface VedicChart {
  lagna: { sign:number; signName:string; signSanskrit:string; signKo:string; signEmoji:string; degree:number; };
  planets: Record<string, VedicPlanet>;
  moonNakshatra: { name:string; ko:string; symbol:string; deity:string; lord:string; pada:number; degreeInNak:number; moonSign:string; moonSignKo:string; };
  atmakaraka: { planet:string; nameKo:string; degree:number; sign:string; signKo:string; };
  vimshottariDasha: { current: DashaPeriod; upcoming: DashaPeriod | null; antar: DashaPeriod; };
  yogas: Array<{ name:string; nameKo:string; description:string; planets:string[]; }>;
  d9: Record<string, { sign:number; signName:string; signKo:string; }>;
  d10: Record<string, { sign:number; signName:string; signKo:string; }>;
  ayanamsa: number;
  houseTable: string[];
}
interface ChapterMeta { num:number; title:string; subtitle:string; icon:string; }
interface ChapterResult { chapter:number; chapterMeta:ChapterMeta; text:string; sections:{title:string;body:string}[]; }
type ChapterStep = "idle"|"loading"|"done"|"error";
interface ChapterState { step:ChapterStep; result:ChapterResult|null; }

type PremiumSectionProps = {
  showIntro?: boolean;
  onStartGeneration?: () => void | Promise<void>;
  generationLoading?: boolean;
};

// ─────────────────────────────────────────────────────────────────
// 챕터 메타
// ─────────────────────────────────────────────────────────────────
const CHAPTER_META: ChapterMeta[] = [
  { num:1,  title:"라그나와 영혼의 목적",           subtitle:"Lagna & Atmakaraka",                icon:"🕉️" },
  { num:2,  title:"나크샤트라 — 무의식의 27가지 빛", subtitle:"Moon Nakshatra 심층 분析",           icon:"🌙" },
  { num:3,  title:"다샤 — 인생의 웅장한 계절",       subtitle:"Vimshottari Dasha 전략",             icon:"⏳" },
  { num:4,  title:"부와 번영의 정렬",                subtitle:"Artha & 2·11하우스 다나 요가",       icon:"💰" },
  { num:5,  title:"카르마와 천직",                   subtitle:"Dharma & 10하우스 · D9 · D10",      icon:"👑" },
  { num:6,  title:"나밤샤 — 영혼의 성숙도",           subtitle:"D9 숨겨진 잠재력",                  icon:"💎" },
  { num:7,  title:"관계의 거울 — 아슈타 쿠타",       subtitle:"Ashta Koota 궁합 분析",             icon:"🔮" },
  { num:8,  title:"인연의 깊이와 카르믹 계약",       subtitle:"7하우스 · 금성/화성",               icon:"💞" },
  { num:9,  title:"생명력과 정화",                   subtitle:"Health 6·8·12하우스 · 아유르베다",   icon:"🌿" },
  { num:10, title:"요가 — 특별한 축복의 조합",       subtitle:"차트의 천부적 재능과 치트키",        icon:"✨" },
  { num:11, title:"우파야 — 운명을 바꾸는 실천",     subtitle:"행성 에너지 정화 비책",              icon:"🙏" },
  { num:12, title:"마스터플랜 — 카르마를 넘어선 자유", subtitle:"총결산 & 북극성 선언",              icon:"🌟" },
];

const VEDIC_STORAGE_KEY = "premium:vedic:session:v1";

/** 사용자 프로필 스토리지에서 베다 점성술 입력값 읽기 */
function readVedicProfile(): { year: string; month: string; day: string; hour: string; minute: string; lat: string; lon: string; timezone: string } | null {
  try {
    for (const store of [sessionStorage, localStorage] as Storage[]) {
      const raw = store.getItem("FORTUNE_APP_VEDIC_PAYLOAD");
      if (raw) {
        const p = JSON.parse(raw);
        if (p?.birth?.year) return {
          year: String(p.birth.year), month: String(p.birth.month ?? 1),
          day: String(p.birth.day ?? 1), hour: String(p.birth.hour ?? 12),
          minute: String(p.birth.minute ?? 0),
          lat: p.location?.lat != null ? String(p.location.lat) : "37.5665",
          lon: p.location?.lng != null ? String(p.location.lng) : "126.9780",
          timezone: p.location?.tzOffset != null ? String(p.location.tzOffset) : "9",
        };
      }
    }
    const listRaw = localStorage.getItem("FORTUNE_APP_USER_PROFILES.list");
    const currentId = localStorage.getItem("FORTUNE_APP_USER_PROFILES.current");
    if (listRaw) {
      const list = JSON.parse(listRaw) as { id?: string; birth?: { year?: number; month?: number; day?: number; hour?: number; minute?: number }; location?: { lat?: number; lng?: number; tzOffset?: number } }[];
      const profile = (currentId ? list.find((p) => p.id === currentId) : undefined) ?? list[0];
      if (profile?.birth?.year) return {
        year: String(profile.birth.year), month: String(profile.birth.month ?? 1),
        day: String(profile.birth.day ?? 1), hour: String(profile.birth.hour ?? 12),
        minute: String(profile.birth.minute ?? 0),
        lat: profile.location?.lat != null ? String(profile.location.lat) : "37.5665",
        lon: profile.location?.lng != null ? String(profile.location.lng) : "126.9780",
        timezone: profile.location?.tzOffset != null ? String(profile.location.tzOffset) : "9",
      };
    }
  } catch (_) {}
  return null;
}

// ─────────────────────────────────────────────────────────────────
// 로더
// ─────────────────────────────────────────────────────────────────
function OmLoader({ message }: { message?: string }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16, padding:"40px 0" }}>
      <div style={{ position:"relative", width:68, height:68 }}>
        <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:"2px solid rgba(212,160,23,0.3)", animation:"vedic-spin 2s linear infinite" }} />
        <div style={{ position:"absolute", inset:8, borderRadius:"50%", border:"2px solid rgba(167,139,250,0.4)", animation:"vedic-spin 3s linear infinite reverse" }} />
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, color:"#d4a017" }}>🕉️</div>
      </div>
      <p style={{ color:"rgba(212,160,23,0.9)", fontSize:"0.82rem", fontWeight:600, letterSpacing:"0.2em", textAlign:"center" }}>{message ?? "베다 에너지 계산 중"}</p>
      <p style={{ color:"rgba(148,163,184,0.5)", fontSize:"0.72rem", letterSpacing:"0.1em", textAlign:"center" }}>Jyotish 마스터가 카르마 청사진을 작성하고 있습니다…</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// 텍스트 렌더러
// ─────────────────────────────────────────────────────────────────
function renderTextBlock(text: string) {
  if (!text) return null;
  return text.split(/\n{2,}/).map((para, i) => (
    <p key={i} style={{ lineHeight:2.0, letterSpacing:"0.025em", color:"rgba(203,213,225,0.88)", fontSize:"0.95rem", marginBottom:"1.2em" }}>
      {para.replace(/\n/g," ")}
    </p>
  ));
}

// ─────────────────────────────────────────────────────────────────
// 행성 배지
// ─────────────────────────────────────────────────────────────────
function PlanetBadge({ label, info }: { label:string; info:VedicPlanet }) {
  const dignityColor = info.dignity === "Exalted" ? "rgba(212,160,23,1)" : info.dignity === "Own Sign" ? "rgba(167,139,250,1)" : info.dignity === "Debilitated" ? "rgba(239,68,68,0.85)" : "rgba(147,197,253,0.9)";
  return (
    <span style={{ borderRadius:9999, padding:"4px 12px", fontSize:"0.76rem", fontWeight:700, background:"rgba(212,160,23,0.10)", border:"1px solid rgba(212,160,23,0.25)", color:dignityColor, display:"inline-flex", alignItems:"center", gap:4 }}>
      {info.signEmoji} {label}: {info.signSanskrit} {info.degree}° / {info.house}H / {info.nakshatraKo}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────
// 베다 차트 요약
// ─────────────────────────────────────────────────────────────────
function VedicChartSummary({ chart }: { chart:VedicChart }) {
  const mainPlanets = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"];
  return (
    <div style={{ borderRadius:14, padding:"18px", marginBottom:18, background:"rgba(4,3,15,0.85)", border:"1px solid rgba(212,160,23,0.18)" }}>
      <p style={{ color:"rgba(212,160,23,0.6)", fontSize:"0.62rem", letterSpacing:"0.22em", textTransform:"uppercase", marginBottom:10 }}>
        VEDIC BIRTH CHART — LAHIRI AYANAMSA {chart.ayanamsa}°
      </p>
      {/* 라그나 정보 */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
        <span style={{ borderRadius:9999, padding:"4px 14px", fontSize:"0.78rem", fontWeight:800, background:"rgba(212,160,23,0.2)", border:"1px solid rgba(212,160,23,0.45)", color:"#d4a017" }}>
          {chart.lagna.signEmoji} 라그나: {chart.lagna.signSanskrit} {chart.lagna.degree}°
        </span>
        <span style={{ borderRadius:9999, padding:"4px 14px", fontSize:"0.78rem", fontWeight:700, background:"rgba(99,102,241,0.15)", border:"1px solid rgba(99,102,241,0.3)", color:"rgba(196,181,253,0.9)" }}>
          🌙 달 낙샤트라: {chart.moonNakshatra.ko}({chart.moonNakshatra.name}) pada{chart.moonNakshatra.pada}
        </span>
        <span style={{ borderRadius:9999, padding:"4px 14px", fontSize:"0.78rem", fontWeight:700, background:"rgba(245,158,11,0.15)", border:"1px solid rgba(245,158,11,0.3)", color:"rgba(252,211,77,0.9)" }}>
          🕉 아트마카라카: {chart.atmakaraka.nameKo}
        </span>
      </div>
      {/* 다샤 정보 */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
        <span style={{ borderRadius:9999, padding:"3px 12px", fontSize:"0.74rem", fontWeight:600, background:"rgba(16,185,129,0.12)", border:"1px solid rgba(16,185,129,0.25)", color:"rgba(52,211,153,0.9)" }}>
          ⏳ 대운: {chart.vimshottariDasha.current?.planet ?? "-"} (종료: {chart.vimshottariDasha.current?.endDate ?? "-"})
        </span>
        <span style={{ borderRadius:9999, padding:"3px 12px", fontSize:"0.74rem", fontWeight:600, background:"rgba(16,185,129,0.08)", border:"1px solid rgba(16,185,129,0.18)", color:"rgba(110,231,183,0.8)" }}>
          세운: {chart.vimshottariDasha.antar?.planet ?? "-"} (종료: {chart.vimshottariDasha.antar?.endDate ?? "-"})
        </span>
      </div>
      {/* 행성 목록 */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
        {mainPlanets.map(pName => {
          const pl = chart.planets[pName]; if (!pl) return null;
          return <PlanetBadge key={pName} label={pl.nameKo.split("(")[0]} info={pl} />;
        })}
      </div>
      {/* 요가 */}
      {chart.yogas.length > 0 && (
        <div style={{ marginTop:10, paddingTop:8, borderTop:"1px solid rgba(212,160,23,0.10)" }}>
          <p style={{ color:"rgba(212,160,23,0.5)", fontSize:"0.62rem", letterSpacing:"0.18em", marginBottom:6, textTransform:"uppercase" }}>검출된 요가 (Yoga)</p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
            {chart.yogas.map((y, i) => (
              <span key={i} style={{ borderRadius:8, padding:"3px 10px", fontSize:"0.72rem", fontWeight:700, background:"rgba(99,102,241,0.12)", border:"1px solid rgba(99,102,241,0.25)", color:"rgba(167,139,250,0.9)" }}>
                ✦ {y.nameKo}
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
function ChapterCard({ meta, state, onGenerate }: { meta:ChapterMeta; state:ChapterState; onGenerate:()=>void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ borderRadius:14, overflow:"hidden", background:"rgba(4,3,15,0.80)", border:`1.5px solid ${state.step==="done"?"rgba(212,160,23,0.40)":"rgba(100,116,139,0.22)"}`, boxShadow:state.step==="done"?"0 4px 24px rgba(212,160,23,0.08)":"none", transition:"border-color 0.3s" }}>
      {/* 헤더 */}
      <div style={{ padding:"14px 16px", background:"rgba(212,160,23,0.03)", borderBottom:"1px solid rgba(100,116,139,0.12)", display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:20 }}>{meta.icon}</span>
          <div>
            <p style={{ color:"rgba(212,160,23,0.55)", fontSize:"0.58rem", letterSpacing:"0.2em", textTransform:"uppercase", margin:0 }}>CHAPTER {meta.num}</p>
            <p style={{ color:"#fff", fontWeight:800, fontSize:"0.93rem", margin:0, lineHeight:1.3 }}>{meta.title}</p>
            <p style={{ color:"rgba(148,163,184,0.55)", fontSize:"0.7rem", margin:0 }}>{meta.subtitle}</p>
          </div>
        </div>
        <div style={{ display:"flex", gap:7, flexShrink:0 }}>
          {state.step==="done" && (
            <button onClick={()=>setExpanded(v=>!v)} style={{ borderRadius:9, padding:"5px 12px", fontSize:"0.72rem", fontWeight:700, background:"rgba(212,160,23,0.12)", border:"1px solid rgba(212,160,23,0.3)", color:"rgba(253,230,138,0.9)", cursor:"pointer" }}>
              {expanded?"접기 ▲":"보기 ▼"}
            </button>
          )}
          {state.step==="idle" && (
            <button onClick={onGenerate} style={{ borderRadius:9, padding:"5px 15px", fontSize:"0.73rem", fontWeight:800, background:"linear-gradient(135deg,#d4a017,#b5850e)", border:"none", color:"#1a0f00", cursor:"pointer", transition:"opacity 0.2s" }}>
              ✦ 분析
            </button>
          )}
          {state.step==="loading" && (
            <button disabled style={{ borderRadius:9, padding:"5px 15px", fontSize:"0.73rem", fontWeight:800, background:"rgba(100,116,139,0.3)", border:"none", color:"rgba(148,163,184,0.5)", cursor:"not-allowed" }}>
              생성 중…
            </button>
          )}
          {state.step==="error" && (
            <button onClick={onGenerate} style={{ borderRadius:9, padding:"5px 14px", fontSize:"0.72rem", fontWeight:800, background:"rgba(239,68,68,0.18)", border:"1px solid rgba(239,68,68,0.35)", color:"rgba(252,165,165,0.9)", cursor:"pointer" }}>재시도</button>
          )}
        </div>
      </div>
      {/* 로딩 */}
      {state.step==="loading" && <OmLoader message={`챕터 ${meta.num}: ${meta.title} 분析 중`} />}
      {/* 에러 */}
      {state.step==="error" && (
        <div style={{ padding:"14px 16px" }}>
          <p style={{ color:"rgba(252,165,165,0.8)", fontSize:"0.82rem" }}>⚠ AI 생성에 실패했습니다. 잠시 후 재시도해 주세요.</p>
        </div>
      )}
      {/* 결과 */}
      {state.step==="done" && state.result && expanded && (
        <div style={{ padding:"16px 18px" }}>
          {state.result.sections.length > 0
            ? state.result.sections.map((sec, i) => (
                <div key={i} style={{ marginBottom:22 }}>
                  <h4 style={{ color:"rgba(212,160,23,0.95)", fontWeight:800, fontSize:"0.93rem", marginBottom:8, paddingBottom:5, borderBottom:"1px solid rgba(212,160,23,0.12)" }}>
                    {sec.title}
                  </h4>
                  {renderTextBlock(sec.body)}
                </div>
              ))
            : renderTextBlock(state.result.text)
          }
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// PDF 다운로드 버튼
// ─────────────────────────────────────────────────────────────────
function PDFDownloadButton({
  chapters, chart, userName, birthDate
}: {
  chapters: Record<number, ChapterState>;
  chart: VedicChart | null;
  userName?: string;
  birthDate?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const doneChapters = CHAPTER_META.filter(m => chapters[m.num]?.step === "done");

  const handleDownload = useCallback(async () => {
    if (doneChapters.length === 0) { setError("먼저 챕터를 하나 이상 생성해 주세요."); return; }
    setLoading(true); setError("");
    try {
      const chaptersData = doneChapters.map(m => {
        const r = chapters[m.num].result!;
        return { chapter: m.num, title: m.title, subtitle: m.subtitle, icon: m.icon, text: r.text, sections: r.sections };
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfModule = await import("@react-pdf/renderer" as any).catch(() => null);
      if (!pdfModule) {
        throw new Error("PDF 라이브러리를 로드할 수 없습니다.");
      }

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
          backgroundColor: "#07091a",
          color: "#e2e8f0",
          padding: 34,
        },
        coverTitle: { fontSize: 24, fontWeight: "bold", color: "#d4a017", textAlign: "center", marginBottom: 8 },
        coverSub: { fontSize: 11, color: "#a78bfa", textAlign: "center", marginBottom: 4 },
        coverMeta: { fontSize: 10, color: "#94a3b8", textAlign: "center", marginBottom: 2 },
        divider: { borderBottomWidth: 1, borderBottomColor: "#1e2a4a", marginVertical: 14 },
        chapterTitle: { fontSize: 16, fontWeight: "bold", color: "#f8fafc", marginBottom: 4, marginTop: 12 },
        chapterSub: { fontSize: 10, color: "#93c5fd", marginBottom: 8 },
        sectionTitle: { fontSize: 12, fontWeight: "bold", color: "#d4a017", marginBottom: 4, marginTop: 8 },
        body: { fontSize: 10, color: "#cbd5e1", lineHeight: 1.7, marginBottom: 6 },
      });

      const chartInfo = chart
        ? [
            `라그나: ${chart.lagna.signSanskrit} ${chart.lagna.degree}°`,
            `달 낙샤트라: ${chart.moonNakshatra.ko}(${chart.moonNakshatra.name}) pada${chart.moonNakshatra.pada}`,
            `아트마카라카: ${chart.atmakaraka.nameKo}`,
            `현재 대운: ${chart.vimshottariDasha.current?.planet ?? "-"}`,
          ]
        : [];

      const doc = (
        <Document>
          <Page size="A4" style={styles.page}>
            <Text style={styles.coverTitle}>Karmic Blueprint</Text>
            <Text style={styles.coverSub}>CODE : DESTINY · VEDIC PREMIUM REPORT</Text>
            {birthDate ? <Text style={styles.coverMeta}>출생일: {birthDate}</Text> : null}
            {userName ? <Text style={styles.coverMeta}>이름: {userName}</Text> : null}
            {chartInfo.map((line: string, i: number) => (
              <Text key={`chart-${i}`} style={styles.coverMeta}>{line}</Text>
            ))}
            <View style={styles.divider} />

            {chaptersData.map((ch, idx: number) => (
              <View key={`ch-${ch.chapter}-${idx}`}>
                <Text style={styles.chapterTitle}>{ch.icon} Chapter {String(ch.chapter).padStart(2, "0")} · {ch.title}</Text>
                <Text style={styles.chapterSub}>{ch.subtitle}</Text>
                {Array.isArray(ch.sections) && ch.sections.length > 0
                  ? ch.sections.map((sec: { title: string; body: string }, sIdx: number) => (
                      <View key={`sec-${ch.chapter}-${sIdx}`}>
                        <Text style={styles.sectionTitle}>{sec.title}</Text>
                        <Text style={styles.body}>{sec.body || ""}</Text>
                      </View>
                    ))
                  : <Text style={styles.body}>{ch.text || ""}</Text>}
                <View style={styles.divider} />
              </View>
            ))}
          </Page>
        </Document>
      );

      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `vedic-karmic-blueprint-${Date.now()}.pdf`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF 생성 중 오류");
    } finally { setLoading(false); }
  }, [doneChapters, chapters, chart, userName, birthDate]);

  return (
    <div style={{ textAlign:"center" }}>
      <button
        onClick={handleDownload}
        disabled={loading || doneChapters.length === 0}
        style={{
          display:"inline-flex", alignItems:"center", gap:8,
          borderRadius:12, padding:"12px 28px", fontSize:"0.9rem", fontWeight:800,
          background: doneChapters.length === 0 ? "rgba(100,116,139,0.3)" : loading ? "rgba(100,116,139,0.4)" : "linear-gradient(135deg,#d4a017,#8b6914)",
          border: "1px solid rgba(212,160,23,0.4)",
          color: doneChapters.length === 0 ? "rgba(148,163,184,0.5)" : "#fff",
          cursor: doneChapters.length === 0 || loading ? "not-allowed" : "pointer",
          boxShadow: doneChapters.length > 0 && !loading ? "0 4px 20px rgba(212,160,23,0.25)" : "none",
          transition:"all 0.2s",
        }}
      >
        {loading ? "📄 PDF 생성 중…" : `📥 PDF 다운로드 (${doneChapters.length}/12챕터)`}
      </button>
      {error && <p style={{ color:"rgba(252,165,165,0.85)", fontSize:"0.78rem", marginTop:8 }}>⚠ {error}</p>}
      {doneChapters.length > 0 && (
        <p style={{ color:"rgba(148,163,184,0.45)", fontSize:"0.7rem", marginTop:6 }}>
          완료된 {doneChapters.length}개 챕터를 포함한 카르마 청사진 PDF를 생성합니다
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────────────────────────
export default function HPremiumVedicSection({
  showIntro = false,
  onStartGeneration,
  generationLoading = false,
}: PremiumSectionProps) {
  const createEmptyChapters = () =>
    Object.fromEntries(CHAPTER_META.map((m) => [m.num, { step: "idle" as ChapterStep, result: null }]));

  console.log("[DEBUG] 섹션 컴포넌트 내부 진입 성공: 베다 프리미엄");
  const [birthYear,   setBirthYear]   = useState("");
  const [birthMonth,  setBirthMonth]  = useState("");
  const [birthDay,    setBirthDay]    = useState("");
  const [birthHour,   setBirthHour]   = useState("12");
  const [birthMinute, setBirthMinute] = useState("0");
  const [timezone,    setTimezone]    = useState("9");
  const [lat,         setLat]         = useState("37.5665");
  const [lon,         setLon]         = useState("126.9780");

  const [chart,    setChart]    = useState<VedicChart|null>(null);
  const [chapters, setChapters] = useState<Record<number,ChapterState>>(
    () => createEmptyChapters()
  );
  const [calcError,   setCalcError]   = useState("");
  const [calcLoading, setCalcLoading] = useState(false);
  const [requestError, setRequestError] = useState("");
  const storageReadyRef = useRef(false);
  const autoComputeRef = useRef(false);

  const resetVedicState = useCallback((resetInputs = false) => {
    setChart(null);
    setChapters(createEmptyChapters());
    setCalcError("");
    setCalcLoading(false);
    setRequestError("");
    if (resetInputs) {
      setBirthYear("");
      setBirthMonth("");
      setBirthDay("");
      setBirthHour("12");
      setBirthMinute("0");
      setTimezone("9");
      setLat("37.5665");
      setLon("126.9780");
      try {
        localStorage.removeItem(VEDIC_STORAGE_KEY);
      } catch {
        // ignore storage cleanup errors
      }
    }
  }, []);

  useEffect(() => {
    if (showIntro) return;
    try {
      const raw = localStorage.getItem(VEDIC_STORAGE_KEY);
      if (!raw) {
        // 저장된 세션 없으면 사용자 프로필 스토리지에서 폴백 로드
        const profile = readVedicProfile();
        if (profile) {
          setBirthYear(profile.year);
          setBirthMonth(profile.month);
          setBirthDay(profile.day);
          setBirthHour(profile.hour);
          setBirthMinute(profile.minute);
          setTimezone(profile.timezone);
          setLat(profile.lat);
          setLon(profile.lon);
          autoComputeRef.current = true;
        }
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
        lat?: string;
        lon?: string;
        chart?: VedicChart | null;
        chapters?: Record<number, ChapterState>;
      };

      if (saved.birthYear) setBirthYear(saved.birthYear);
      if (saved.birthMonth) setBirthMonth(saved.birthMonth);
      if (saved.birthDay) setBirthDay(saved.birthDay);
      if (saved.birthHour) setBirthHour(saved.birthHour);
      if (saved.birthMinute) setBirthMinute(saved.birthMinute);
      if (saved.timezone) setTimezone(saved.timezone);
      if (saved.lat) setLat(saved.lat);
      if (saved.lon) setLon(saved.lon);
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
        VEDIC_STORAGE_KEY,
        JSON.stringify({
          birthYear,
          birthMonth,
          birthDay,
          birthHour,
          birthMinute,
          timezone,
          lat,
          lon,
          chart,
          chapters,
        })
      );
    } catch {
      // ignore storage quota errors
    }
  }, [birthYear, birthMonth, birthDay, birthHour, birthMinute, timezone, lat, lon, chart, chapters, showIntro]);

  useEffect(() => {
    if (showIntro) {
      resetVedicState(false);
    }
  }, [showIntro, resetVedicState]);

  // 프로필에서 자동 로드된 경우 즉시 계산
  useEffect(() => {
    if (showIntro) return;
    if (!autoComputeRef.current) return;
    if (!birthYear || !birthMonth || !birthDay) return;
    autoComputeRef.current = false;
    handleCalcChart();
  }, [showIntro, birthYear, birthMonth, birthDay, handleCalcChart]);

  const postVedicJson = useCallback(async (payload: unknown) => {
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 65000);
      try {
        const res = await fetch("/api/premium/vedic-life", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || "베다 요청 처리 중 오류가 발생했습니다.");
        }
        return data;
      } catch (e) {
        lastError = e;
        if (attempt === 2) break;
      } finally {
        clearTimeout(timeoutId);
      }
    }
    throw lastError instanceof Error ? lastError : new Error("베다 요청 처리 중 오류가 발생했습니다.");
  }, []);

  // 차트 미리 계산 (chapter 1 분析으로 대체)
  const handleCalcChart = useCallback(async () => {
    console.log("클릭됨: 베다 차트 계산");
    const y=parseInt(birthYear,10), m=parseInt(birthMonth,10), d=parseInt(birthDay,10);
    if (!y||!m||!d){ setCalcError("생년월일을 입력해 주세요."); return; }
    if (y<1900||y>2100||m<1||m>12||d<1||d>31){ setCalcError("올바른 날짜를 입력해 주세요."); return; }
    setCalcError(""); setRequestError(""); setCalcLoading(true);
    try {
      const data = await postVedicJson({ year:y, month:m, day:d, hour:parseInt(birthHour,10), minute:parseInt(birthMinute,10), timezone:parseFloat(timezone), lat:parseFloat(lat), lon:parseFloat(lon), chapter:1 });
      setChart(data.chart);
      setChapters(prev => ({ ...prev, 1: { step:"done", result:{ chapter:1, chapterMeta:data.chapterMeta, text:data.text, sections:data.sections } } }));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "차트 계산 중 오류";
      setCalcError(message);
      setRequestError(message);
    } finally { setCalcLoading(false); }
  }, [birthYear,birthMonth,birthDay,birthHour,birthMinute,timezone,lat,lon,postVedicJson]);

  const handleGenerateChapter = useCallback(async (chNum:number) => {
    console.log(`클릭됨: 베다 챕터 ${chNum}`);
    setRequestError("");
    setChapters(prev=>({...prev,[chNum]:{step:"loading",result:null}}));
    try {
      const data = await postVedicJson({ year:parseInt(birthYear,10), month:parseInt(birthMonth,10), day:parseInt(birthDay,10), hour:parseInt(birthHour,10), minute:parseInt(birthMinute,10), timezone:parseFloat(timezone), lat:parseFloat(lat), lon:parseFloat(lon), chapter:chNum });
      setChapters(prev=>({...prev,[chNum]:{step:"done",result:{chapter:chNum,chapterMeta:data.chapterMeta,text:data.text,sections:data.sections}}}));
      if (data.chart&&!chart) setChart(data.chart);
    } catch (e: unknown) {
      setRequestError(e instanceof Error ? e.message : "챕터 생성 중 오류가 발생했습니다.");
      setChapters(prev=>({...prev,[chNum]:{step:"error",result:null}}));
    }
  }, [birthYear,birthMonth,birthDay,birthHour,birthMinute,timezone,lat,lon,chart,postVedicJson]);

  const handleGenerateAll = useCallback(async () => {
    console.log("클릭됨: 베다 전체 챕터 생성");
    // 현재 스냅샷 기준으로 미완료된 챕터만 순차 생성
    const pending = CHAPTER_META.filter(m => chapters[m.num]?.step !== "done");
    for (const meta of pending) {
      await handleGenerateChapter(meta.num);
    }
  }, [chapters, handleGenerateChapter]);

  const inputStyle: React.CSSProperties = {
    background:"rgba(4,3,15,0.85)", border:"1px solid rgba(212,160,23,0.22)", borderRadius:9,
    color:"#e2e8f0", fontSize:"0.9rem", padding:"9px 13px", outline:"none", width:"100%",
  };
  const labelStyle: React.CSSProperties = {
    color:"rgba(212,160,23,0.65)", fontSize:"0.66rem", letterSpacing:"0.15em",
    textTransform:"uppercase", display:"block", marginBottom:4,
  };
  const doneCount = Object.values(chapters).filter(c=>c.step==="done").length;
  const birthDate = (birthYear&&birthMonth&&birthDay) ? `${birthYear}.${birthMonth}.${birthDay}` : undefined;

  if (showIntro) {
    return (
      <section style={{ background:"linear-gradient(145deg,#04030f 0%,#080b1e 50%,#040310 100%)", border:"1px solid rgba(212,160,23,0.20)", borderRadius:24, overflow:"hidden", boxShadow:"0 12px 50px rgba(212,160,23,0.06),inset 0 1px 0 rgba(255,255,255,0.03)" }}>
        <img src="/fuctionassets/premium%20veda.webp" alt="베다 점성술 프리미엄 소개" style={{ width:"100%", maxHeight:280, objectFit:"cover", opacity:0.44 }} />
        <div style={{ padding:"18px 18px 22px" }}>
          <p style={{ color:"rgba(212,160,23,0.7)", fontSize:"0.66rem", letterSpacing:"0.28em", margin:0 }}>JYOTISH MASTER · DETAIL INTRO</p>
          <h3 style={{ color:"#fff", fontWeight:900, fontSize:"1.5rem", margin:"8px 0 6px" }}>Karmic Blueprint</h3>
          <p style={{ color:"rgba(203,213,225,0.72)", fontSize:"0.88rem", lineHeight:1.8, margin:0 }}>
            베다 점성술 12챕터 카테고리를 먼저 확인하고, 버튼 클릭 시 PDF 리포트 생성을 시작합니다.
          </p>
          <div style={{ display:"grid", gap:8, marginTop:12 }}>
            {CHAPTER_META.map((ch) => (
              <div key={ch.num} style={{ borderRadius:12, border:"1px solid rgba(212,160,23,0.2)", background:"rgba(4,3,15,0.65)", padding:"10px 12px" }}>
                <p style={{ margin:0, color:"rgba(253,230,138,0.92)", fontSize:"0.82rem", fontWeight:700 }}>
                  {ch.icon} CHAPTER {ch.num}. {ch.title}
                </p>
                <p style={{ margin:"4px 0 0", color:"rgba(148,163,184,0.76)", fontSize:"0.74rem" }}>{ch.subtitle}</p>
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
              borderRadius:11,
              padding:"14px",
              fontSize:"0.96rem",
              fontWeight:900,
              background: generationLoading ? "rgba(50,35,10,0.6)" : "linear-gradient(135deg,#d4a017,#8b6914)",
              border:"none",
              color: generationLoading ? "rgba(148,163,184,0.5)" : "#1a0f00",
              cursor: generationLoading ? "wait" : "pointer",
              letterSpacing:"0.08em",
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
    <section style={{ background:"linear-gradient(145deg,#04030f 0%,#080b1e 50%,#040310 100%)", border:"1px solid rgba(212,160,23,0.20)", borderRadius:24, overflow:"hidden", boxShadow:"0 12px 50px rgba(212,160,23,0.06),inset 0 1px 0 rgba(255,255,255,0.03)" }}>
      <style>{`
        @keyframes vedic-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes vedic-pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>

      {/* ── 헤더 */}
      <div style={{ padding:"26px 22px 18px", background:"linear-gradient(135deg,rgba(212,160,23,0.10) 0%,rgba(99,102,241,0.06) 100%)", borderBottom:"1px solid rgba(212,160,23,0.10)", display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
        <img src="/fuctionassets/premium%20veda.webp" alt="베다 점성술 프리미엄" style={{ width:70, height:70, borderRadius:16, objectFit:"cover", boxShadow:"0 4px 20px rgba(212,160,23,0.35)", flexShrink:0, border:"1.5px solid rgba(212,160,23,0.4)" }} />
        <div>
          <p style={{ color:"rgba(212,160,23,0.60)", fontSize:"0.62rem", letterSpacing:"0.30em", fontWeight:700, textTransform:"uppercase", marginBottom:5 }}>CODE : DESTINY · JYOTISH MASTER</p>
          <h2 style={{ color:"#fff", fontWeight:900, fontSize:"clamp(1.2rem,3.5vw,1.65rem)", lineHeight:1.25, margin:0 }}>
            🕉️ Karmic Blueprint
          </h2>
          <p style={{ color:"rgba(167,139,250,0.65)", fontSize:"0.84rem", marginTop:5, fontWeight:300, lineHeight:1.6 }}>
            베다 점성술 프리미엄 리포트 · AI 12챕터 주티쉬 분析 · Lahiri 사이드리얼 엔진
          </p>
        </div>
        {doneCount > 0 && (
          <div style={{ marginLeft:"auto", textAlign:"center", flexShrink:0 }}>
            <p style={{ color:"rgba(212,160,23,0.6)", fontSize:"0.62rem", letterSpacing:"0.15em" }}>완료</p>
            <p style={{ color:"#d4a017", fontWeight:900, fontSize:"1.4rem" }}>{doneCount}/12</p>
          </div>
        )}
      </div>

      <div style={{ padding:"18px 18px 26px" }}>

        {/* ── 입력 폼 */}
        {!chart && (
          <div style={{ borderRadius:14, padding:"18px", marginBottom:18, background:"rgba(4,3,15,0.75)", border:"1px solid rgba(212,160,23,0.18)" }}>
            <p style={{ color:"#fff", fontWeight:800, fontSize:"0.97rem", marginBottom:14 }}>🕉️ 출생 정보 입력</p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"11px", marginBottom:12 }} className="vedic-input-grid">
              <style>{`@media(max-width:560px){.vedic-input-grid{grid-template-columns:1fr 1fr!important}}`}</style>
              <div><span style={labelStyle}>출생 연도</span><input style={inputStyle} type="number" placeholder="1990" value={birthYear} onChange={e=>setBirthYear(e.target.value)} /></div>
              <div><span style={labelStyle}>월</span><input style={inputStyle} type="number" placeholder="1" min={1} max={12} value={birthMonth} onChange={e=>setBirthMonth(e.target.value)} /></div>
              <div><span style={labelStyle}>일</span><input style={inputStyle} type="number" placeholder="1" min={1} max={31} value={birthDay} onChange={e=>setBirthDay(e.target.value)} /></div>
              <div><span style={labelStyle}>출생 시 (0-23)</span><input style={inputStyle} type="number" placeholder="12" min={0} max={23} value={birthHour} onChange={e=>setBirthHour(e.target.value)} /></div>
              <div><span style={labelStyle}>출생 분</span><input style={inputStyle} type="number" placeholder="0" min={0} max={59} value={birthMinute} onChange={e=>setBirthMinute(e.target.value)} /></div>
              <div><span style={labelStyle}>시간대 (UTC+)</span><input style={inputStyle} type="number" placeholder="9" step={0.5} value={timezone} onChange={e=>setTimezone(e.target.value)} /></div>
              <div><span style={labelStyle}>위도 (기본: 서울)</span><input style={inputStyle} type="number" placeholder="37.5665" step={0.01} value={lat} onChange={e=>setLat(e.target.value)} /></div>
              <div><span style={labelStyle}>경도</span><input style={inputStyle} type="number" placeholder="126.9780" step={0.01} value={lon} onChange={e=>setLon(e.target.value)} /></div>
            </div>
            {calcError && <p style={{ color:"rgba(252,165,165,0.85)", fontSize:"0.8rem", marginBottom:10 }}>⚠ {calcError}</p>}
            {requestError && <p style={{ color:"rgba(252,165,165,0.85)", fontSize:"0.8rem", marginBottom:10 }}>⚠ {requestError}</p>}
            <button
              onClick={handleCalcChart}
              disabled={calcLoading}
              style={{ width:"100%", borderRadius:11, padding:"12px", fontSize:"0.9rem", fontWeight:800, background:calcLoading?"rgba(100,116,139,0.3)":"linear-gradient(135deg,#d4a017,#8b6914)", border:"none", color:calcLoading?"rgba(148,163,184,0.5)":"#1a0f00", cursor:calcLoading?"not-allowed":"pointer", letterSpacing:"0.08em" }}
            >
              {calcLoading ? "🕉️ 베다 차트 계산 중…" : "🕉️ 카르마 청사진 시작"}
            </button>
            <p style={{ color:"rgba(148,163,184,0.4)", fontSize:"0.68rem", marginTop:8, lineHeight:1.6, textAlign:"center" }}>
              Lahiri 아야남샤 · Whole Sign 하우스 · 빔쇼타리 다샤 · 27 낙샤트라 계산
            </p>
          </div>
        )}

        {/* ── 차트 요약 */}
        {chart && <VedicChartSummary chart={chart} />}

        {/* ── 챕터 목록 */}
        {chart && (
          <>
            {/* 전체 생성 버튼 */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:10 }}>
              <p style={{ color:"rgba(212,160,23,0.7)", fontSize:"0.82rem", fontWeight:700 }}>
                🕉️ 챕터 분析 ({doneCount}/12)
              </p>
              <div style={{ display:"flex", gap:8 }}>
                <button
                  onClick={handleGenerateAll}
                  style={{ borderRadius:10, padding:"7px 16px", fontSize:"0.76rem", fontWeight:800, background:"linear-gradient(135deg,rgba(212,160,23,0.25),rgba(99,102,241,0.15))", border:"1px solid rgba(212,160,23,0.4)", color:"rgba(253,230,138,0.95)", cursor:"pointer" }}
                >
                  ✦ 전체 생성 (12챕터)
                </button>
                <button
                  onClick={()=>{ resetVedicState(true); }}
                  style={{ borderRadius:10, padding:"7px 14px", fontSize:"0.72rem", fontWeight:600, background:"rgba(100,116,139,0.15)", border:"1px solid rgba(100,116,139,0.25)", color:"rgba(148,163,184,0.8)", cursor:"pointer" }}
                >
                  🔄 초기화
                </button>
              </div>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {CHAPTER_META.map(meta => (
                <ChapterCard key={meta.num} meta={meta} state={chapters[meta.num]} onGenerate={()=>handleGenerateChapter(meta.num)} />
              ))}
            </div>

            {/* PDF 다운로드 */}
            {doneCount > 0 && (
              <div style={{ marginTop:24, padding:"20px", borderRadius:14, background:"rgba(4,3,15,0.7)", border:"1px solid rgba(212,160,23,0.20)" }}>
                <p style={{ color:"rgba(212,160,23,0.7)", fontSize:"0.72rem", letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:10, textAlign:"center" }}>KARMIC BLUEPRINT PDF</p>
                <p style={{ color:"rgba(203,213,225,0.65)", fontSize:"0.82rem", lineHeight:1.7, marginBottom:14, textAlign:"center" }}>
                  완성된 챕터를 고급스러운 베다 점성술 PDF 리포트로 다운로드하세요.<br/>
                  목차 · 12챕터 분析 · 요가 해설 · 수료증이 포함됩니다.
                </p>
                <PDFDownloadButton chapters={chapters} chart={chart} birthDate={birthDate} />
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
