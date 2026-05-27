"use client";
import React, { useState, useCallback, useEffect, useRef } from "react";
import { getVedicPdfChapters } from "@/app/_lib/vedic/pdf/vedicPdfChapters";
import { sanitizePremiumSections, sanitizePremiumText } from "@/app/_lib/vedic/premium/guards/premiumTextGuard";
import PremiumPdfHistoryPanel from "./PremiumPdfHistoryPanel";


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
interface ChapterResult {
  chapter:number;
  chapterMeta:ChapterMeta;
  text:string;
  sections:{title:string;body:string}[];
  fallbackUsed?: boolean;
  missingFields?: string[];
  warnings?: string[];
}
type ChapterStep = "idle"|"loading"|"done"|"error";
interface ChapterState { step:ChapterStep; result:ChapterResult|null; }
type VedaPdfFlowState = "generating_pdf" | "success" | "error";
type VedicApiError = Error & {
  status?: number;
  code?: string;
  details?: unknown;
  refunded?: boolean;
  refundMessage?: string;
};

type PremiumSectionProps = {
  showIntro?: boolean;
  onStartGeneration?: () => void | Promise<void>;
  generationLoading?: boolean;
  onPdfFlowStateChange?: (state: VedaPdfFlowState, message?: string) => void;
};

// ─────────────────────────────────────────────────────────────────
// 챕터 메타
// ─────────────────────────────────────────────────────────────────
const PERSONAL_CHAPTER_META: ChapterMeta[] = getVedicPdfChapters("personal").map((chapter) => ({
  num: chapter.number,
  title: chapter.titleKo,
  subtitle: chapter.subtitleKo,
  icon: chapter.icon,
}));
function getChapterMetaByMode(): ChapterMeta[] {
  return PERSONAL_CHAPTER_META;
}

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

  const renderChapterBody = () => {
    if (!state.result) return null;

    const safeText = sanitizePremiumText(state.result.text, "해석 데이터를 준비 중입니다.");
    const safeSections = sanitizePremiumSections(state.result.sections, "섹션 데이터가 아직 준비되지 않았습니다.");

    return safeSections.length > 0
      ? safeSections.map((sec, i) => (
          <div key={i} style={{ marginBottom:22 }}>
            <h4 style={{ color:"rgba(212,160,23,0.95)", fontWeight:800, fontSize:"0.93rem", marginBottom:8, paddingBottom:5, borderBottom:"1px solid rgba(212,160,23,0.12)" }}>
              {sec.title}
            </h4>
            {renderTextBlock(sec.body)}
          </div>
        ))
      : renderTextBlock(safeText);
  };

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
          {state.step === "done" && state.result?.fallbackUsed && (
            <span style={{ borderRadius: 999, padding: "4px 9px", fontSize: "0.66rem", fontWeight: 800, background: "rgba(245,158,11,0.18)", border: "1px solid rgba(245,158,11,0.35)", color: "rgba(252,211,77,0.95)" }}>
              fallback
            </span>
          )}
          {state.step==="done" && (
            <button onClick={()=>setExpanded(v=>!v)} style={{ borderRadius:9, padding:"5px 12px", fontSize:"0.72rem", fontWeight:700, background:"rgba(212,160,23,0.12)", border:"1px solid rgba(212,160,23,0.3)", color:"rgba(253,230,138,0.9)", cursor:"pointer" }}>
              {expanded?"접기 ▲":"보기 ▼"}
            </button>
          )}
          {state.step==="idle" && (
            <button onClick={onGenerate} style={{ borderRadius:9, padding:"5px 15px", fontSize:"0.73rem", fontWeight:800, background:"linear-gradient(135deg,#d4a017,#b5850e)", border:"none", color:"#1a0f00", cursor:"pointer", transition:"opacity 0.2s" }}>
              ✦ 분석
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
      {state.step==="loading" && <OmLoader message={`챕터 ${meta.num}: ${meta.title} 분석 중`} />}
      {/* 에러 */}
      {state.step==="error" && (
        <div style={{ padding:"14px 16px" }}>
          <p style={{ color:"rgba(252,165,165,0.8)", fontSize:"0.82rem" }}>⚠ AI 생성에 실패했습니다. 잠시 후 재시도해 주세요.</p>
        </div>
      )}
      {/* 결과 */}
      {state.step==="done" && state.result && expanded && (
        <div style={{ padding:"16px 18px" }}>
          {renderChapterBody()}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// PDF 다운로드 버튼
// ─────────────────────────────────────────────────────────────────
function PDFDownloadButton({
  chapters, chart, userName, birthDate, chapterMeta, totalChapters
}: {
  chapters: Record<number, ChapterState>;
  chart: VedicChart | null;
  userName?: string;
  birthDate?: string;
  chapterMeta: ChapterMeta[];
  totalChapters: number;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const doneChapters = chapterMeta.filter(m => chapters[m.num]?.step === "done");

  const handleDownload = useCallback(() => {
    if (doneChapters.length !== totalChapters) {
      setError(`전체 ${totalChapters}개 챕터 생성 완료 후 PDF를 다운로드할 수 있습니다.`);
      return;
    }
    setLoading(true); setError("");
    try {
      const escH = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const nl2p = (s: unknown) => String(s ?? "").split(/\n{2,}/).map(p => `<p>${escH(p).replace(/\n/g, "<br/>")}</p>`).join("");
      const chaptersHtml = doneChapters.map((m, i) => {
        const r = chapters[m.num].result!;
        const secHtml = Array.isArray(r.sections) && r.sections.length > 0
          ? r.sections.map(s => `<div class="sec"><h3 class="sh">${escH(s.title)}</h3><div class="sb">${nl2p(s.body)}</div></div>`).join("")
          : `<div class="sec">${nl2p(r.text)}</div>`;
        return `<div class="ch" style="page-break-before:${i > 0 ? "always" : "auto"}"><div class="ch-hdr"><span class="cn">${escH(m.icon)} CHAPTER ${m.num}</span><h2 class="ct">${escH(m.title)}</h2><p class="cs">${escH(m.subtitle)}</p></div><div class="ch-body">${secHtml}</div></div>`;
      }).join("");
      const chartMeta = chart ? [
        `라그나: ${chart.lagna?.signSanskrit ?? "-"} ${chart.lagna?.degree ?? ""}°`,
        `달 낙샤트라: ${chart.moonNakshatra?.ko ?? "-"}`,
        `아트마카라카: ${chart.atmakaraka?.nameKo ?? "-"}`,
        `현재 대운: ${chart.vimshottariDasha?.current?.planet ?? "-"}`,
      ] : [];
      const fullHtml = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"/><title>베다 점성술 Karmic Blueprint</title><style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600;700&family=Noto+Sans+KR:wght@400;500;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Noto Serif KR','Noto Sans KR',serif;background:#07091a;color:#e2e8f0}
.cover{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:48px 40px;background:linear-gradient(160deg,#07091a 0%,#1a0e00 100%)}
.cover-badge{font-size:0.65rem;letter-spacing:0.3em;color:rgba(212,160,23,0.7);text-transform:uppercase;margin-bottom:20px}
.cover-title{font-size:2.4rem;font-weight:700;color:#d4a017;line-height:1.3;margin-bottom:12px}
.cover-sub{font-size:0.95rem;color:rgba(148,163,184,0.8);letter-spacing:0.08em;margin-bottom:8px}
.cover-meta{font-size:0.88rem;color:rgba(251,191,36,0.65);margin:4px 0}
.ch{max-width:760px;margin:0 auto;padding:40px 40px 32px}
.ch-hdr{margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid rgba(212,160,23,0.15)}
.cn{font-size:0.7rem;letter-spacing:0.25em;text-transform:uppercase;color:rgba(212,160,23,0.6)}
.ct{font-size:1.8rem;font-weight:700;color:#f8fafc;margin:10px 0 8px;line-height:1.3}
.cs{font-size:0.88rem;color:rgba(212,160,23,0.75)}
.ch-body{color:rgba(203,213,225,0.9);font-size:0.97rem;line-height:2.0}
.sec{margin-bottom:28px}
.sh{font-size:1.1rem;font-weight:600;color:#d4a017;margin-bottom:12px;padding-left:12px;border-left:3px solid rgba(212,160,23,0.5)}
.sb p,.sec p{font-size:0.95rem;line-height:2.0;color:rgba(203,213,225,0.9);margin-bottom:12px}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;background:#07091a!important}.ch{page-break-before:always}.cover{page-break-after:always;min-height:auto;padding:80px 40px}}
</style></head><body>
<div class="cover">
  <p class="cover-badge">CODE : DESTINY · VEDIC PREMIUM REPORT</p>
  <h1 class="cover-title">🕉️ Karmic Blueprint</h1>
  <p class="cover-sub">베다 점성술 심층 분석 · Jyotish Astrology</p>
  ${birthDate ? `<p class="cover-meta">출생일: ${escH(birthDate)}</p>` : ""}
  ${userName ? `<p class="cover-meta">이름: ${escH(userName)}</p>` : ""}
  ${chartMeta.map(l => `<p class="cover-meta">${escH(l)}</p>`).join("")}
</div>
${chaptersHtml}
</body></html>`;
      const win = window.open("", "_blank", "width=900,height=700");
      if (!win) { setError("팝업이 차단됐습니다. 브라우저 주소창에서 팝업을 허용 후 재시도해 주세요."); return; }
      win.document.open(); win.document.write(fullHtml); win.document.close();
      win.focus();
      setTimeout(() => { try { win.print(); } catch (_) {} }, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF 생성 중 오류");
    } finally { setLoading(false); }
  }, [doneChapters, chapters, chart, userName, birthDate, totalChapters]);

  // 모바일 스크롤 중 오작동 방지: touchmove 감지 시 클릭 방지
  const btnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;
    let moved = false;
    const handleTouchStart = () => { moved = false; };
    const handleTouchMove = () => { moved = true; };
    const handleTouchEnd = (e: TouchEvent) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      return true;
    };
    btn.addEventListener('touchstart', handleTouchStart);
    btn.addEventListener('touchmove', handleTouchMove);
    btn.addEventListener('touchend', handleTouchEnd, { passive: false });
    return () => {
      btn.removeEventListener('touchstart', handleTouchStart);
      btn.removeEventListener('touchmove', handleTouchMove);
      btn.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return (
    <div style={{ textAlign:"center" }}>
      <button
        ref={btnRef}
        onClick={handleDownload}
        disabled={loading || doneChapters.length !== totalChapters}
        style={{
          display:"inline-flex", alignItems:"center", gap:8,
          borderRadius:12, padding:"12px 28px", fontSize:"0.9rem", fontWeight:800,
          background: doneChapters.length !== totalChapters ? "rgba(100,116,139,0.3)" : loading ? "rgba(100,116,139,0.4)" : "linear-gradient(135deg,#d4a017,#8b6914)",
          border: "1px solid rgba(212,160,23,0.4)",
          color: doneChapters.length !== totalChapters ? "rgba(148,163,184,0.5)" : "#fff",
          cursor: doneChapters.length !== totalChapters || loading ? "not-allowed" : "pointer",
          boxShadow: doneChapters.length === totalChapters && !loading ? "0 4px 20px rgba(212,160,23,0.25)" : "none",
          transition:"all 0.2s",
        }}
      >
        {loading ? "📄 PDF 생성 중…" : `📥 PDF 다운로드 (${doneChapters.length}/${totalChapters}챕터)`}
      </button>
      {error && <p style={{ color:"rgba(252,165,165,0.85)", fontSize:"0.78rem", marginTop:8 }}>⚠ {error}</p>}
      {doneChapters.length > 0 && (
        <p style={{ color:"rgba(148,163,184,0.45)", fontSize:"0.7rem", marginTop:6 }}>
          전체 {totalChapters}개 챕터 완료 후 카르마 청사진 PDF를 생성할 수 있습니다 ({doneChapters.length}/{totalChapters})
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
  onPdfFlowStateChange,
}: PremiumSectionProps) {
  const [birthYear,   setBirthYear]   = useState("");
  const [birthMonth,  setBirthMonth]  = useState("");
  const [birthDay,    setBirthDay]    = useState("");
  const [birthHour,   setBirthHour]   = useState("12");
  const [birthMinute, setBirthMinute] = useState("0");
  const [birthPlace,  setBirthPlace]  = useState("");
  const [timezone,    setTimezone]    = useState("9");
  const [lat,         setLat]         = useState("37.5665");
  const [lon,         setLon]         = useState("126.9780");
  const [reportMode] = useState<"personal">("personal");
  const chapterMeta = getChapterMetaByMode();
  const totalChapters = chapterMeta.length;
  const createEmptyChapters = () =>
    Object.fromEntries(getChapterMetaByMode().map((m) => [m.num, { step: "idle" as ChapterStep, result: null }]));

  const [chart,    setChart]    = useState<VedicChart|null>(null);
  const [chapters, setChapters] = useState<Record<number,ChapterState>>(
    () => createEmptyChapters()
  );
  const [calcError,   setCalcError]   = useState("");
  const [calcLoading, setCalcLoading] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [flowMessage, setFlowMessage] = useState("");
  const storageReadyRef = useRef(false);
  const reportIdRef = useRef("");

  const autoComputeRef = useRef(false);

  const resetVedicState = useCallback((resetInputs = false) => {
    reportIdRef.current = "";
    setChart(null);
    setChapters(createEmptyChapters());
    setCalcError("");
    setCalcLoading(false);
    setRequestError("");
    setFlowMessage("");
    if (resetInputs) {
      setBirthYear("");
      setBirthMonth("");
      setBirthDay("");
      setBirthHour("12");
      setBirthMinute("0");
      setBirthPlace("");
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
        birthPlace?: string;
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
      if (saved.birthPlace) setBirthPlace(saved.birthPlace);
      if (saved.timezone) setTimezone(saved.timezone);
      if (saved.lat) setLat(saved.lat);
      if (saved.lon) setLon(saved.lon);
      if (saved.chart) setChart(saved.chart);
      if (saved.chapters) {
        const normalized = Object.fromEntries(
          getChapterMetaByMode().map((meta) => {
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
          birthPlace,
          timezone,
          lat,
          lon,
          reportMode,
          chart,
          chapters,
        })
      );
    } catch {
      // ignore storage quota errors
    }
  }, [birthYear, birthMonth, birthDay, birthHour, birthMinute, birthPlace, timezone, lat, lon, reportMode, chart, chapters, showIntro]);

  useEffect(() => {
    if (showIntro) {
      resetVedicState(false);
    }
  }, [showIntro, resetVedicState]);

  const toVedicUiError = useCallback((error: unknown) => {
    const err = error as VedicApiError;
    const status = Number(err?.status || 0);
    const code = String(err?.code || "");
    const fallback = err instanceof Error ? err.message : "베다 요청 처리 중 오류가 발생했습니다.";
    const refundSuffix = err?.refunded
      ? " (추가 차감 코인은 자동 복구 처리되었습니다.)"
      : (err?.refundMessage ? ` (${err.refundMessage})` : "");

    if (status === 400) return "입력값이 올바르지 않습니다. 생년월일/시간/좌표를 확인해 주세요.";
    if (status === 402) return "코인이 부족합니다. 결제 후 다시 시도해 주세요.";
    if (status === 409) return "이미 처리 중인 요청입니다. 잠시 후 다시 시도해 주세요.";
    if (status === 422) {
      if (code === "VEDIC_CHAPTER_UNAVAILABLE") return "요청한 챕터를 생성할 수 없습니다. 챕터 조건을 먼저 충족해 주세요.";
      if (code === "VEDIC_CANONICAL_VALIDATION_FAILED") return "필수 베다 계산 데이터가 부족하여 PDF를 생성할 수 없습니다.";
      return "베다 계산/검증 데이터가 부족하여 챕터를 생성할 수 없습니다.";
    }
    if (status === 503) return `베다 계산 API에 일시적으로 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.${refundSuffix}`;
    if (status >= 500) return `서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.${refundSuffix}`;
    return `${fallback}${refundSuffix}`;
  }, []);


  const postVedicJson = useCallback(async (payload: unknown) => {
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 65000);
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("fortune_auth_token") : "";
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch("/api/premium/vedic-life", {
          method:"POST",
          headers,
          credentials: "include",
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok) {
          const status = Number(res.status || 500);
          const code = String(data?.code || "");
          const genericMessage = typeof data?.message === "string"
            ? data.message
            : (typeof data?.error === "string" ? data.error : "베다 요청 처리 중 오류가 발생했습니다.");

          let mappedMessage = genericMessage;
          if (status === 400) mappedMessage = "입력값이 올바르지 않습니다. 생년월일/시간/좌표를 확인해 주세요.";
          if (status === 402) mappedMessage = "코인이 부족합니다. 결제 후 다시 시도해 주세요.";
          if (status === 409) mappedMessage = "이미 처리 중인 요청입니다. 잠시 후 다시 시도해 주세요.";
          if (status === 422) {
            if (code === "VEDIC_CHAPTER_UNAVAILABLE") mappedMessage = "요청한 챕터를 생성할 수 없습니다. 챕터 조건을 확인해 주세요.";
            else if (code === "VEDIC_CANONICAL_VALIDATION_FAILED") mappedMessage = "필수 베다 계산 데이터가 부족하여 PDF를 생성할 수 없습니다.";
            else mappedMessage = "베다 계산/검증 데이터가 부족하여 챕터를 생성할 수 없습니다.";
          }
          if (status === 503) mappedMessage = "베다 계산 API에 일시적으로 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.";

          const err = new Error(mappedMessage) as VedicApiError;
          err.status = status;
          err.code = code;
          err.details = data?.details || data?.missingFields || null;
          throw err;
        }
        return data;
      } catch (e) {
        lastError = e;
        const status = Number((e as VedicApiError)?.status || 0);
        const retryableStatus = [408, 409, 429, 500, 502, 503, 504];
        const retryable = (e instanceof Error && e.name === "AbortError") || !status || retryableStatus.includes(status);
        if (attempt === 4 || !retryable) break;
        await new Promise((resolve) => setTimeout(resolve, Math.min(700 * (2 ** (attempt - 1)), 2600)));
      } finally {
        clearTimeout(timeoutId);
      }
    }
    throw lastError instanceof Error ? lastError : new Error("베다 요청 처리 중 오류가 발생했습니다.");
  }, []);

  const buildRequestPayload = useCallback((chapterNum: number) => {
    const previousChapterTexts = chapterMeta
      .map((meta) => chapters[meta.num]?.result)
      .filter((result): result is ChapterResult => !!result && result.chapter < chapterNum)
      .sort((a, b) => a.chapter - b.chapter)
      .map((result) => result.text)
      .filter((text) => typeof text === "string" && text.trim().length > 0);

    const payload: Record<string, unknown> = {
      year: parseInt(birthYear, 10),
      month: parseInt(birthMonth, 10),
      day: parseInt(birthDay, 10),
      hour: parseInt(birthHour, 10),
      minute: parseInt(birthMinute, 10),
      timezone: parseFloat(timezone),
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      birthPlace,
      chapter: chapterNum,
      reportType: "personal",
      reportId: reportIdRef.current || undefined,
      previousChapterTexts,
    };
    return payload;
  }, [birthYear, birthMonth, birthDay, birthHour, birthMinute, timezone, lat, lon, birthPlace, chapterMeta, chapters]);

  const ensureCompatibilityAddonCharged = useCallback(async () => {
    return;
  }, []);

  const tryRefundCompatibilityAddon = useCallback(async (_reason: string) => {
    return { refunded: false, message: "" };
  }, []);

  // 차트 미리 계산 (chapter 1 분석으로 대체)
  const handleCalcChart = useCallback(async () => {
    const y=parseInt(birthYear,10), m=parseInt(birthMonth,10), d=parseInt(birthDay,10);
    if (!y||!m||!d){ setCalcError("생년월일을 입력해 주세요."); return; }
    if (y<1900||y>2100||m<1||m>12||d<1||d>31){ setCalcError("올바른 날짜를 입력해 주세요."); return; }
    setCalcError(""); setRequestError(""); setCalcLoading(true);
    setFlowMessage("1/7 입력 검증 완료");
    onPdfFlowStateChange?.("generating_pdf");
    try {
      setFlowMessage("2/7 권한 및 추가 과금 확인 중");
      await ensureCompatibilityAddonCharged();
      setFlowMessage("3/7 베다 차트 데이터 준비 중");
      const data = await postVedicJson({
        ...buildRequestPayload(1),
        precomputeAll: true,
      });
      if (typeof data?.reportId === "string" && data.reportId) {
        reportIdRef.current = data.reportId;
      }
      setChart(data.chart);
      setChapters(prev => ({ ...prev, 1: { step:"done", result:{
        chapter:1,
        chapterMeta:data.chapterMeta,
        text:sanitizePremiumText(data.text, "차트 총론 데이터를 준비 중입니다."),
        sections:sanitizePremiumSections(data.sections, "챕터 섹션 데이터를 준비 중입니다."),
        fallbackUsed: Boolean(data?.usedFallback),
        missingFields: Array.isArray(data?.missingFields) ? data.missingFields : [],
        warnings: Array.isArray(data?.warnings) ? data.warnings : [],
      } } }));
      const batchResults = data?.chapterResultsById || data?.chapterJsonById || null;
      if (batchResults && typeof batchResults === "object") {
        setChapters((prev) => {
          const next = { ...prev };
          for (const meta of chapterMeta) {
            const result = (batchResults as Record<string, any>)[String(meta.num)];
            if (!result) continue;
            next[meta.num] = {
              step: "done",
              result: {
                chapter: Number(result.chapter ?? meta.num),
                chapterMeta: result.chapterMeta ?? meta,
                text: sanitizePremiumText(result.text ?? "", "챕터 해석 데이터를 준비 중입니다."),
                sections: sanitizePremiumSections(Array.isArray(result.sections) ? result.sections : [], "챕터 섹션 데이터를 준비 중입니다."),
                fallbackUsed: Boolean(result?.usedFallback),
                missingFields: Array.isArray(result?.missingFields) ? result.missingFields : [],
                warnings: Array.isArray(result?.warnings) ? result.warnings : [],
              },
            };
          }
          return next;
        });
      }
      setFlowMessage(data?.usedFallback ? "7/7 챕터 완성 (fallback 적용)" : "7/7 챕터 완성");
      onPdfFlowStateChange?.("success");
    } catch (e: unknown) {
      setFlowMessage("실패 복구 처리 중");
      const refund = await tryRefundCompatibilityAddon("베다 차트 생성 실패");
      const enriched = e as VedicApiError;
      enriched.refunded = refund.refunded;
      enriched.refundMessage = refund.message;
      const message = toVedicUiError(enriched);
      setCalcError(message);
      setRequestError(message);
      onPdfFlowStateChange?.("error", message);
      setFlowMessage("");
    } finally {
      setCalcLoading(false);
    }
  }, [birthYear,birthMonth,birthDay,postVedicJson,ensureCompatibilityAddonCharged,buildRequestPayload,onPdfFlowStateChange,toVedicUiError,tryRefundCompatibilityAddon]);

  // 프로필에서 자동 로드된 경우 즉시 계산
  useEffect(() => {
    if (showIntro) return;
    if (!autoComputeRef.current) return;
    if (!birthYear || !birthMonth || !birthDay) return;
    autoComputeRef.current = false;
    handleCalcChart();
  }, [showIntro, birthYear, birthMonth, birthDay, handleCalcChart]);



  const handleGenerateChapter = useCallback(async (chNum:number) => {
    if (chapters[chNum]?.step === "done") return;
    setRequestError("");
    setChapters(prev=>({...prev,[chNum]:{step:"loading",result:null}}));
    setFlowMessage(`1/7 CHAPTER ${chNum} 입력 검증`);
    onPdfFlowStateChange?.("generating_pdf");
    try {
      setFlowMessage(`2/7 CHAPTER ${chNum} 권한/과금 확인`);
      await ensureCompatibilityAddonCharged();
      setFlowMessage(`3/7 CHAPTER ${chNum} 데이터 정규화`);
      const data = await postVedicJson(buildRequestPayload(chNum));
      if (typeof data?.reportId === "string" && data.reportId) {
        reportIdRef.current = data.reportId;
      }
      setChapters(prev=>({...prev,[chNum]:{step:"done",result:{
        chapter: chNum,
        chapterMeta: data.chapterMeta,
        text: sanitizePremiumText(data.text, "챕터 해석 데이터를 준비 중입니다."),
        sections: sanitizePremiumSections(data.sections, "챕터 섹션 데이터를 준비 중입니다."),
        fallbackUsed: Boolean(data?.usedFallback),
        missingFields: Array.isArray(data?.missingFields) ? data.missingFields : [],
        warnings: Array.isArray(data?.warnings) ? data.warnings : [],
      }}}));

      setFlowMessage(data?.usedFallback ? `7/7 CHAPTER ${chNum} 완성 (fallback 적용)` : `7/7 CHAPTER ${chNum} 완성`);
      onPdfFlowStateChange?.("success");
    } catch (e: unknown) {
      setFlowMessage(`CHAPTER ${chNum} 실패 복구 처리 중`);
      const refund = await tryRefundCompatibilityAddon(`베다 챕터 ${chNum} 생성 실패`);
      const enriched = e as VedicApiError;
      enriched.refunded = refund.refunded;
      enriched.refundMessage = refund.message;
      const message = toVedicUiError(enriched);
      setRequestError(message);
      setChapters(prev => ({
        ...prev,
        [chNum]: {
          step: "error",
          result: prev[chNum]?.result ?? null,
        },
      }));
      onPdfFlowStateChange?.("error", message);
      setFlowMessage("");
    }
  }, [postVedicJson, ensureCompatibilityAddonCharged, buildRequestPayload, onPdfFlowStateChange, toVedicUiError, tryRefundCompatibilityAddon]);


  const handleGenerateAll = useCallback(async () => {
    // 현재 스냅샷 기준으로 미완료된 챘터만 순차 생성
    const pending = chapterMeta.filter(m => chapters[m.num]?.step !== "done");
    for (const meta of pending) {
      await handleGenerateChapter(meta.num);
    }
  }, [chapterMeta, chapters, handleGenerateChapter]);

  const inputStyle: React.CSSProperties = {
    background:"rgba(4,3,15,0.85)", border:"1px solid rgba(212,160,23,0.22)", borderRadius:9,
    color:"#e2e8f0", fontSize:"0.9rem", padding:"9px 13px", outline:"none", width:"100%",
  };
  const labelStyle: React.CSSProperties = {
    color:"rgba(212,160,23,0.65)", fontSize:"0.66rem", letterSpacing:"0.15em",
    textTransform:"uppercase", display:"block", marginBottom:4,
  };
  const doneCount = chapterMeta.filter((m) => chapters[m.num]?.step === "done").length;
  const birthDate = (birthYear&&birthMonth&&birthDay) ? `${birthYear}.${birthMonth}.${birthDay}` : undefined;

  if (showIntro) {
    return (
      <section style={{ background:"linear-gradient(145deg,#04030f 0%,#080b1e 50%,#040310 100%)", border:"1px solid rgba(212,160,23,0.20)", borderRadius:24, overflow:"hidden", boxShadow:"0 12px 50px rgba(212,160,23,0.06),inset 0 1px 0 rgba(255,255,255,0.03)" }}>
        <img src="/fuctionassets/premium%20veda.webp" alt="베다 점성술 프리미엄 소개" width={1200} height={675} loading="lazy" decoding="async" style={{ width:"100%", maxHeight:280, objectFit:"cover", opacity:0.44 }} />
        <div style={{ padding:"18px 18px 22px" }}>
          <p style={{ color:"rgba(212,160,23,0.7)", fontSize:"0.66rem", letterSpacing:"0.28em", margin:0 }}>JYOTISH MASTER · DETAIL INTRO</p>
          <h3 style={{ color:"#fff", fontWeight:900, fontSize:"1.5rem", margin:"8px 0 6px" }}>Karmic Blueprint</h3>
          <p style={{ color:"rgba(203,213,225,0.72)", fontSize:"0.88rem", lineHeight:1.8, margin:0 }}>
            베다 점성술 {totalChapters}챕터 카테고리를 먼저 확인하고, 버튼 클릭 시 PDF 리포트 생성을 시작합니다.
          </p>
          <div style={{ display:"grid", gap:8, marginTop:12 }}>
            {chapterMeta.map((ch) => (
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
        <img src="/fuctionassets/premium%20veda.webp" alt="베다 점성술 프리미엄" width={70} height={70} loading="lazy" decoding="async" style={{ width:70, height:70, borderRadius:16, objectFit:"cover", boxShadow:"0 4px 20px rgba(212,160,23,0.35)", flexShrink:0, border:"1.5px solid rgba(212,160,23,0.4)" }} />
        <div>
          <p style={{ color:"rgba(212,160,23,0.60)", fontSize:"0.62rem", letterSpacing:"0.30em", fontWeight:700, textTransform:"uppercase", marginBottom:5 }}>CODE : DESTINY · JYOTISH MASTER</p>
          <h2 style={{ color:"#fff", fontWeight:900, fontSize:"clamp(1.2rem,3.5vw,1.65rem)", lineHeight:1.25, margin:0 }}>
            🕉️ Karmic Blueprint
          </h2>
          <p style={{ color:"rgba(167,139,250,0.65)", fontSize:"0.84rem", marginTop:5, fontWeight:300, lineHeight:1.6 }}>
            베다 점성술 프리미엄 리포트 · AI {totalChapters}챕터 주티쉬 분석 · Lahiri 사이드리얼 엔진
          </p>
        </div>
        {doneCount > 0 && (
          <div style={{ marginLeft:"auto", textAlign:"center", flexShrink:0 }}>
            <p style={{ color:"rgba(212,160,23,0.6)", fontSize:"0.62rem", letterSpacing:"0.15em" }}>완료</p>
            <p style={{ color:"#d4a017", fontWeight:900, fontSize:"1.4rem" }}>{doneCount}/{totalChapters}</p>
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
              <div style={{ gridColumn:"1 / -1" }}><span style={labelStyle}>태어난 도시</span><input style={inputStyle} type="text" placeholder="예: Seoul" value={birthPlace} onChange={e=>setBirthPlace(e.target.value)} /></div>
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

        {flowMessage && (
          <div style={{
            borderRadius: 10,
            padding: "10px 12px",
            marginBottom: 12,
            background: "rgba(15,23,42,0.55)",
            border: "1px solid rgba(212,160,23,0.28)",
          }}>
            <p style={{ margin: 0, color: "rgba(253,230,138,0.92)", fontSize: "0.78rem", fontWeight: 700 }}>
              진행 상태: {flowMessage}
            </p>
          </div>
        )}

        {/* ── 챕터 목록 */}
        {chart && (
          <>
            {/* 전체 생성 버튼 */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:10 }}>
              <p style={{ color:"rgba(212,160,23,0.7)", fontSize:"0.82rem", fontWeight:700 }}>
                🕉️ 챕터 분석 ({doneCount}/{totalChapters})
              </p>
              <div style={{ display:"flex", gap:8 }}>
                <button
                  onClick={handleGenerateAll}
                  style={{ borderRadius:10, padding:"7px 16px", fontSize:"0.76rem", fontWeight:800, background:"linear-gradient(135deg,rgba(212,160,23,0.25),rgba(99,102,241,0.15))", border:"1px solid rgba(212,160,23,0.4)", color:"rgba(253,230,138,0.95)", cursor:"pointer" }}
                >
                  ✦ 전체 생성 ({totalChapters}챕터)
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
              {chapterMeta.map(meta => (
                <ChapterCard key={meta.num} meta={meta} state={chapters[meta.num]} onGenerate={()=>handleGenerateChapter(meta.num)} />
              ))}
            </div>

            {/* PDF 다운로드 */}
            {doneCount > 0 && (
              <div style={{ marginTop:24, padding:"20px", borderRadius:14, background:"rgba(4,3,15,0.7)", border:"1px solid rgba(212,160,23,0.20)" }}>
                <p style={{ color:"rgba(212,160,23,0.7)", fontSize:"0.72rem", letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:10, textAlign:"center" }}>KARMIC BLUEPRINT PDF</p>
                <p style={{ color:"rgba(203,213,225,0.65)", fontSize:"0.82rem", lineHeight:1.7, marginBottom:14, textAlign:"center" }}>
                  완성된 챕터를 고급스러운 베다 점성술 PDF 리포트로 다운로드하세요.<br/>
                  목차 · {totalChapters}챕터 분석 · 요가 해설 · 수료증이 포함됩니다.
                </p>
                <PDFDownloadButton chapters={chapters} chart={chart} birthDate={birthDate} chapterMeta={chapterMeta} totalChapters={totalChapters} />
              </div>
            )}

            <PremiumPdfHistoryPanel
              title="베다 PDF 히스토리"
              sessionKinds={["vedic"]}
              limit={12}
            />
          </>
        )}
      </div>
    </section>
  );
}
