"use client";

import { useMemo, useState } from "react";
import { usePaymentProcessing } from "./PaymentProcessingContext";
import { getAssetUrlFromPublicPath } from "@/lib/r2-public-url";
import { friendlyErrorMessage } from "@/app/_lib/friendly-error";

const H_PREMIUM_NAMING_TEXT_TRANSLATIONS = {
  ko: {
    "hPremiumNaming.invalidBirth": "출생 정보를 정확히 입력해 주세요.",
    "hPremiumNaming.analysisError": "사주 분석 중 오류가 발생했습니다.",
    "hPremiumNaming.analysisRequired": "먼저 사주 분석을 완료해 주세요.",
    "hPremiumNaming.printTitle": "명운 프리미엄 작명 추천",
    "hPremiumNaming.printBadge": "CODE : DESTINY · NAMING PREMIUM",
    "hPremiumNaming.printHeading": "명운(命運) 프리미엄 작명 추천",
    "hPremiumNaming.featureSaju": "사주 만세력 기반 용신 분석",
    "hPremiumNaming.featureSuri": "원격·형격 수리 검증",
    "hPremiumNaming.featureElements": "오행 상생 배치",
    "hPremiumNaming.featureCandidates": "9개 최적 후보 추천",
  },
} as const;

function hPremiumNamingText(key: keyof typeof H_PREMIUM_NAMING_TEXT_TRANSLATIONS.ko): string {
  return H_PREMIUM_NAMING_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}

type PremiumSectionProps = {
  showIntro?: boolean;
  onStartGeneration?: () => void | Promise<void>;
  generationLoading?: boolean;
};

type Pillar = {
  gan: string;
  zhi: string;
  ganKr: string;
  zhiKr: string;
};

type AnalysisResponse = {
  pillars: {
    year: Pillar;
    month: Pillar;
    day: Pillar;
    hour: Pillar;
  };
  elemCount: Record<string, number>;
  yongshin: string;
};

type NameChar = {
  c: string;
  k: string;
  s: number;
  o: "목" | "화" | "토" | "금" | "수";
  m: string;
};

type NameCandidate = {
  name: string;
  c1: NameChar;
  c2: NameChar;
  score: number;
  won: number;
  hyeong: number;
};

const STEM_TO_ELEMENT: Record<string, "목" | "화" | "토" | "금" | "수"> = {
  갑: "목", 을: "목", 병: "화", 정: "화", 무: "토", 기: "토", 경: "금", 신: "금", 임: "수", 계: "수",
};

const SURNAME_DB: Record<string, { hanja: string; s: number; balpum: "목" | "화" | "토" | "금" | "수" }> = {
  김: { hanja: "金", s: 8, balpum: "목" },
  이: { hanja: "李", s: 7, balpum: "토" },
  박: { hanja: "朴", s: 6, balpum: "수" },
  최: { hanja: "崔", s: 11, balpum: "금" },
  정: { hanja: "鄭", s: 15, balpum: "금" },
  강: { hanja: "姜", s: 9, balpum: "목" },
  조: { hanja: "趙", s: 14, balpum: "금" },
  윤: { hanja: "尹", s: 4, balpum: "토" },
  장: { hanja: "張", s: 11, balpum: "화" },
  임: { hanja: "林", s: 8, balpum: "토" },
  오: { hanja: "吳", s: 7, balpum: "토" },
  한: { hanja: "韓", s: 17, balpum: "토" },
};

const CHAR_POOL: NameChar[] = [
  { c: "俊", k: "준", s: 9, o: "목", m: "뛰어날 준" },
  { c: "彬", k: "빈", s: 11, o: "목", m: "빛날 빈" },
  { c: "秀", k: "수", s: 7, o: "목", m: "빼어날 수" },
  { c: "建", k: "건", s: 9, o: "목", m: "세울 건" },
  { c: "松", k: "송", s: 8, o: "목", m: "소나무 송" },
  { c: "英", k: "영", s: 11, o: "목", m: "꽃부리 영" },
  { c: "茂", k: "무", s: 11, o: "목", m: "무성할 무" },
  { c: "明", k: "명", s: 8, o: "화", m: "밝을 명" },
  { c: "昊", k: "호", s: 8, o: "화", m: "하늘 호" },
  { c: "炫", k: "현", s: 9, o: "화", m: "빛날 현" },
  { c: "煥", k: "환", s: 13, o: "화", m: "빛날 환" },
  { c: "恩", k: "은", s: 10, o: "화", m: "은혜 은" },
  { c: "志", k: "지", s: 7, o: "화", m: "뜻 지" },
  { c: "景", k: "경", s: 12, o: "화", m: "빛 경" },
  { c: "宇", k: "우", s: 6, o: "토", m: "집 우" },
  { c: "峻", k: "준", s: 10, o: "토", m: "높을 준" },
  { c: "德", k: "덕", s: 15, o: "토", m: "덕 덕" },
  { c: "均", k: "균", s: 7, o: "토", m: "고를 균" },
  { c: "基", k: "기", s: 11, o: "토", m: "터 기" },
  { c: "安", k: "안", s: 6, o: "토", m: "편안 안" },
  { c: "錫", k: "석", s: 16, o: "금", m: "주석 석" },
  { c: "鎭", k: "진", s: 18, o: "금", m: "진정할 진" },
  { c: "宣", k: "선", s: 9, o: "금", m: "베풀 선" },
  { c: "瑞", k: "서", s: 14, o: "금", m: "상서 서" },
  { c: "珍", k: "진", s: 10, o: "금", m: "보배 진" },
  { c: "成", k: "성", s: 7, o: "금", m: "이룰 성" },
  { c: "河", k: "하", s: 8, o: "수", m: "물 하" },
  { c: "海", k: "해", s: 10, o: "수", m: "바다 해" },
  { c: "潤", k: "윤", s: 16, o: "수", m: "윤택할 윤" },
  { c: "源", k: "원", s: 14, o: "수", m: "근원 원" },
  { c: "慧", k: "혜", s: 15, o: "수", m: "지혜 혜" },
  { c: "承", k: "승", s: 8, o: "수", m: "이을 승" },
];

const SANGSAENG: Record<string, string> = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };
const SANGGEUK: Record<string, string> = { 목: "토", 토: "수", 수: "화", 화: "금", 금: "목" };

const CHOSUNG_LIST = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const BALPUM_MAP: Record<string, "목" | "화" | "토" | "금" | "수"> = {
  "ㄱ": "목", "ㄲ": "목", "ㅋ": "목",
  "ㄴ": "화", "ㄷ": "화", "ㄸ": "화", "ㄹ": "화", "ㅌ": "화",
  "ㅇ": "토", "ㅎ": "토",
  "ㅅ": "금", "ㅆ": "금", "ㅈ": "금", "ㅉ": "금", "ㅊ": "금",
  "ㅁ": "수", "ㅂ": "수", "ㅃ": "수", "ㅍ": "수",
};

function getChosung(ch: string) {
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return "ㅇ";
  return CHOSUNG_LIST[Math.floor(code / 588)] || "ㅇ";
}

function getBalpum(korean: string): "목" | "화" | "토" | "금" | "수" {
  return BALPUM_MAP[getChosung(korean)] || "토";
}

function normSuri(n: number) {
  const r = ((n - 1) % 81) + 1;
  return r <= 0 ? 81 : r;
}

function calcSuriGrade(n: number): "대길" | "길" | "반흉" | "흉" {
  const g = new Set([1, 3, 5, 6, 8, 11, 13, 15, 16, 18, 21, 23, 24, 29, 31, 32, 33, 37, 39, 41, 45, 47, 48, 52, 57, 58, 61, 63, 65, 67, 68, 81]);
  const b = new Set([2, 4, 10, 12, 14, 20, 28, 34, 44, 54, 59, 60, 62, 64, 66, 69, 70, 74, 76, 79, 80]);
  if (g.has(n)) return "대길";
  if (b.has(n)) return "흉";
  if (n % 2 === 0) return "반흉";
  return "길";
}

function seededShuffle<T>(arr: T[], seed: number) {
  const copy = [...arr];
  let s = seed >>> 0;
  for (let i = copy.length - 1; i > 0; i -= 1) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function generateNames(surname: string, yongshin: "목" | "화" | "토" | "금" | "수", seed: number): NameCandidate[] {
  const si = SURNAME_DB[surname] || SURNAME_DB["김"];
  const pool = seededShuffle(CHAR_POOL, seed);
  const out: NameCandidate[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < pool.length && out.length < 18; i += 1) {
    for (let j = 0; j < pool.length && out.length < 18; j += 1) {
      if (i === j) continue;
      const c1 = pool[i];
      const c2 = pool[j];

      if (c1.o !== yongshin && c2.o !== yongshin) continue;

      const sb = si.balpum;
      const b1 = getBalpum(c1.k);
      const b2 = getBalpum(c2.k);
      if (SANGGEUK[sb] === b1 || SANGGEUK[b1] === b2) continue;

      const won = normSuri(si.s + c1.s);
      const hyeong = normSuri(c1.s + c2.s);
      const wonGrade = calcSuriGrade(won);
      const hyeongGrade = calcSuriGrade(hyeong);
      if (wonGrade === "흉" || hyeongGrade === "흉") continue;

      if (si.s % 2 === c1.s % 2 && c1.s % 2 === c2.s % 2) continue;

      const key = `${surname}-${c1.c}-${c2.c}`;
      if (seen.has(key)) continue;
      seen.add(key);

      let score = 0;
      if (wonGrade === "대길") score += 4;
      if (hyeongGrade === "대길") score += 4;
      if (c1.o === yongshin) score += 3;
      if (c2.o === yongshin) score += 3;
      if (SANGSAENG[sb] === b1) score += 2;
      if (SANGSAENG[b1] === b2) score += 2;

      out.push({
        name: `${surname}${c1.k}${c2.k}`,
        c1,
        c2,
        score,
        won,
        hyeong,
      });
    }
  }

  return out.sort((a, b) => b.score - a.score).slice(0, 9);
}

function elementBadgeColor(e: string) {
  if (e === "목") return "#4ade80";
  if (e === "화") return "#f87171";
  if (e === "토") return "#fbbf24";
  if (e === "금") return "#c8a85e";
  return "#60a5fa";
}

export default function HPremiumNamingSection({
  showIntro = false,
  onStartGeneration,
  generationLoading = false,
}: PremiumSectionProps) {
  const [surname, setSurname] = useState("김");
  const [gender, setGender] = useState("male");
  const [year, setYear] = useState("1990");
  const [month, setMonth] = useState("5");
  const [day, setDay] = useState("15");
  const [hour, setHour] = useState("12");

  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [names, setNames] = useState<NameCandidate[]>([]);
  const { startProcessing, stopProcessing } = usePaymentProcessing();


  const yongshinElement = useMemo(() => {
    if (!analysis?.yongshin) return null;
    const key = analysis.yongshin as "목" | "화" | "토" | "금" | "수";
    if (["목", "화", "토", "금", "수"].includes(key)) return key;
    return null;
  }, [analysis]);

  const analyzeSaju = async () => {
    setError("");
    setNames([]);
    const y = Number(year);
    const m = Number(month);
    const d = Number(day);
    const h = Number(hour);
    if (!y || m < 1 || m > 12 || d < 1 || d > 31 || h < 0 || h > 23) {
      setError(hPremiumNamingText("hPremiumNaming.invalidBirth"));
      return;
    }

    setAnalyzing(true);
    startProcessing("출생 사주를 분석하여 용신 오행과 에너지를 조율하고 있습니다...");
    try {
      const res = await fetch("/api/love-saju-pillar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: y,
          month: m,
          day: d,
          hour: h,
          name: `${surname}OO`,
          gender,
        }),
      });
      const data = (await res.json()) as AnalysisResponse & { error?: string; message?: string };
      if (!res.ok || !data?.pillars) {
        throw new Error(data?.message || data?.error || "사주 분석에 실패했습니다.");
      }
      setAnalysis(data);
    } catch (e) {
      setError(friendlyErrorMessage(e, hPremiumNamingText("hPremiumNaming.analysisError")));
    } finally {
      setAnalyzing(false);
      stopProcessing();
    }
  };


  const makeRecommendations = () => {
    if (!yongshinElement) {
      setError(hPremiumNamingText("hPremiumNaming.analysisRequired"));
      return;
    }
    setError("");
    const seed = Date.now() + Math.floor(Math.random() * 100000);
    setNames(generateNames(surname, yongshinElement, seed));
  };

  const handlePrintNames = () => {
    if (names.length === 0) return;
    const escH = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const cardsHtml = names.map((n, i) => {
      const c1color = n.c1.o === "목" ? "#4ade80" : n.c1.o === "화" ? "#f87171" : n.c1.o === "토" ? "#fbbf24" : n.c1.o === "금" ? "#c8a85e" : "#60a5fa";
      const c2color = n.c2.o === "목" ? "#4ade80" : n.c2.o === "화" ? "#f87171" : n.c2.o === "토" ? "#fbbf24" : n.c2.o === "금" ? "#c8a85e" : "#60a5fa";
      return `<div class="card" style="page-break-inside:avoid">
  <div class="rank">${i + 1}위</div>
  <div class="name">${escH(n.name)}</div>
  <div class="hanja">${escH(n.c1.c)}(${escH(n.c1.m)}) · ${escH(n.c2.c)}(${escH(n.c2.m)})</div>
  <div class="badges"><span style="color:${c1color};border-color:${c1color}55">${escH(n.c1.o)}</span><span style="color:${c2color};border-color:${c2color}55">${escH(n.c2.o)}</span></div>
  <div class="meta">원격 ${n.won} · 형격 ${n.hyeong} · 점수 ${n.score}</div>
</div>`;
    }).join("");
    const pillarsLine = analysis ? `년주 ${escH(analysis.pillars.year.gan)}${escH(analysis.pillars.year.zhi)} · 월주 ${escH(analysis.pillars.month.gan)}${escH(analysis.pillars.month.zhi)} · 일주 ${escH(analysis.pillars.day.gan)}${escH(analysis.pillars.day.zhi)} · 시주 ${escH(analysis.pillars.hour.gan)}${escH(analysis.pillars.hour.zhi)}` : "";
    const fullHtml = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"/><title>${hPremiumNamingText("hPremiumNaming.printTitle")}</title><style>
@font-face{font-family:'CodeDestinyPremium';src:url('https://assets.code-destiny.com/The%20Jamsil%20OTF%204%20Medium.otf') format('opentype');font-weight:500;font-style:normal;font-display:optional}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'CodeDestinyPremium','Apple SD Gothic Neo','Malgun Gothic',system-ui,sans-serif;background:#07091a;color:#e2e8f0;padding:32px}
.cover{text-align:center;padding:48px 0 32px}
.cover-badge{font-size:0.65rem;letter-spacing:0.3em;color:rgba(212,175,55,0.7);text-transform:uppercase;margin-bottom:16px}
.cover-title{font-size:2rem;font-weight:700;color:#d4af37;margin-bottom:10px}
.cover-meta{font-size:0.88rem;color:rgba(212,175,55,0.6);margin:4px 0}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;max-width:800px;margin:32px auto 0}
.card{border-radius:14px;border:1px solid rgba(212,175,55,0.25);background:rgba(2,8,23,0.85);padding:16px;text-align:center}
.rank{font-size:0.7rem;letter-spacing:0.2em;color:rgba(212,175,55,0.6);margin-bottom:6px}
.name{font-size:1.6rem;font-weight:700;color:#f5e27a;margin-bottom:6px}
.hanja{font-size:0.78rem;color:#94a3b8;margin-bottom:10px}
.badges{display:flex;gap:6px;justify-content:center;margin-bottom:8px}
.badges span{border-radius:999px;border:1px solid;padding:2px 10px;font-size:0.72rem}
.meta{font-size:0.72rem;color:rgba(148,163,184,0.6)}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;background:#07091a!important}}
</style></head><body>
<div class="cover">
  <p class="cover-badge">${hPremiumNamingText("hPremiumNaming.printBadge")}</p>
  <h1 class="cover-title">${hPremiumNamingText("hPremiumNaming.printHeading")}</h1>
  ${pillarsLine ? `<p class="cover-meta">${pillarsLine}</p>` : ""}
  ${analysis?.yongshin ? `<p class="cover-meta">용신: ${escH(analysis.yongshin)}</p>` : ""}
</div>
<div class="grid">${cardsHtml}</div>
</body></html>`;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) { alert("팝업이 차단됐습니다. 허용 후 재시도해 주세요."); return; }
    win.document.open(); win.document.write(fullHtml); win.document.close();
    win.focus();
    setTimeout(() => { try { win.print(); } catch (_) {} }, 1200);
  };

  if (showIntro) {
    const namingImageUrl = getAssetUrlFromPublicPath("/fuctionassets/naming.webp");

    return (
      <section style={{ width:"100%", maxWidth:820, margin:"0 auto", padding:"0 0 24px", fontFamily:"'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif" }}>
        <div style={{ borderRadius:24, overflow:"hidden", border:"1px solid rgba(212,175,55,0.25)", background:"linear-gradient(145deg, rgba(2,8,23,0.96) 0%, rgba(15,23,42,0.86) 100%)" }}>
          <img src={namingImageUrl} alt="명운 프리미엄 작명" width={1200} height={675} loading="lazy" decoding="async" style={{ width:"100%", maxHeight:260, objectFit:"cover", opacity:0.42 }} />
          <div style={{ padding:"20px 20px 24px" }}>
            <p style={{ color:"rgba(212,175,55,0.7)", fontSize:"0.66rem", letterSpacing:"0.28em", margin:0 }}>NAMING PREMIUM · 사주 작명</p>
            <h3 style={{ color:"#fff", fontWeight:900, fontSize:"1.5rem", margin:"8px 0 6px" }}>명운(明運) 사주 프리미엄 작명</h3>
            <p style={{ color:"rgba(226,232,240,0.72)", fontSize:"0.88rem", lineHeight:1.8, margin:"0 0 16px" }}>
              출생 사주 기반 용신 오행을 분석하여 원격·형격 수리까지 검증한 9가지 최적 이름을 추천합니다.
            </p>
            <div style={{ display:"grid", gap:8, marginBottom:16 }}>
              {[
                { icon:"🧮", title:hPremiumNamingText("hPremiumNaming.featureSaju"), desc:"AI 엔진으로 용신 오행 자동 계산" },
                { icon:"🔢", title:hPremiumNamingText("hPremiumNaming.featureSuri"), desc:"81수리 흉수 완전 필터링" },
                { icon:"☯️", title:hPremiumNamingText("hPremiumNaming.featureElements"), desc:"성씨·이름 오행 상생 원칙 준수" },
                { icon:"📊", title:hPremiumNamingText("hPremiumNaming.featureCandidates"), desc:"점수 순 정렬, 한자·뜻 풀이 제공" },
              ].map((f) => (
                <div key={f.title} style={{ borderRadius:12, border:"1px solid rgba(212,175,55,0.2)", background:"rgba(2,12,30,0.55)", padding:"10px 12px", display:"flex", alignItems:"flex-start", gap:10 }}>
                  <span style={{ fontSize:"1.1rem", marginTop:1 }}>{f.icon}</span>
                  <div>
                    <p style={{ margin:0, color:"rgba(212,175,55,0.94)", fontSize:"0.82rem", fontWeight:700 }}>{f.title}</p>
                    <p style={{ margin:"3px 0 0", color:"rgba(148,163,184,0.76)", fontSize:"0.74rem" }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onStartGeneration?.()}
              disabled={generationLoading}
              style={{
                width:"100%", padding:"14px 0", borderRadius:14,
                border: generationLoading ? "1px solid rgba(100,116,139,0.3)" : "1px solid rgba(212,175,55,0.5)",
                background: generationLoading ? "rgba(20,30,50,0.6)" : "linear-gradient(135deg, rgba(45,30,5,0.92) 0%, rgba(20,18,5,0.92) 100%)",
                color: generationLoading ? "rgba(148,163,184,0.5)" : "rgba(212,175,55,0.98)",
                fontSize:"0.96rem", fontWeight:800, letterSpacing:"0.1em",
                cursor: generationLoading ? "wait" : "pointer", opacity: generationLoading ? 0.72 : 1,
              }}
            >
              {generationLoading ? "결제 확인 중…" : "프리미엄 작명 시작하기"}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section style={{ width:"100%", maxWidth:820, margin:"0 auto", padding:"0 0 32px", fontFamily:"'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <div style={{ borderRadius:24, border:"1px solid rgba(212,175,55,0.2)", background:"linear-gradient(145deg, rgba(2,8,23,0.95) 0%, rgba(15,23,42,0.85) 100%)", padding:"28px 24px", display:"grid", gap:20 }}>

        {/* 헤더 */}
        <div>
          <p style={{ color:"rgba(212,175,55,0.65)", fontSize:"0.66rem", letterSpacing:"0.28em", margin:"0 0 6px", textTransform:"uppercase" }}>NAMING PREMIUM · 사주 작명</p>
          <h3 style={{ color:"#fff", fontWeight:900, fontSize:"1.3rem", margin:0 }}>명운(明運) 사주 프리미엄 작명</h3>
        </div>

        {/* 입력 폼 */}
        <div style={{ borderRadius:16, border:"1px solid rgba(212,175,55,0.15)", background:"rgba(2,8,23,0.5)", padding:"18px 16px" }}>
          <p style={{ color:"rgba(212,175,55,0.7)", fontSize:"0.75rem", fontWeight:700, letterSpacing:"0.12em", margin:"0 0 12px", textTransform:"uppercase" }}>출생 정보 입력</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:10 }}>
            {[
              { label:"성씨", content: <select value={surname} onChange={(e) => setSurname(e.target.value)} style={{ width:"100%", marginTop:4, borderRadius:8, background:"rgba(2,8,23,0.9)", color:"#e5e7eb", border:"1px solid rgba(148,163,184,0.3)", padding:"8px 10px", fontSize:"0.85rem" }}>{Object.keys(SURNAME_DB).map((sn) => (<option key={sn} value={sn}>{sn}({SURNAME_DB[sn].hanja})</option>))}</select> },
              { label:"성별", content: <select value={gender} onChange={(e) => setGender(e.target.value)} style={{ width:"100%", marginTop:4, borderRadius:8, background:"rgba(2,8,23,0.9)", color:"#e5e7eb", border:"1px solid rgba(148,163,184,0.3)", padding:"8px 10px", fontSize:"0.85rem" }}><option value="male">남성</option><option value="female">여성</option></select> },
              { label:"출생연", content: <input value={year} onChange={(e) => setYear(e.target.value)} type="number" min={1900} max={2099} style={{ width:"100%", marginTop:4, borderRadius:8, background:"rgba(2,8,23,0.9)", color:"#e5e7eb", border:"1px solid rgba(148,163,184,0.3)", padding:"8px 10px", fontSize:"0.85rem" }} /> },
              { label:"월", content: <input value={month} onChange={(e) => setMonth(e.target.value)} type="number" min={1} max={12} style={{ width:"100%", marginTop:4, borderRadius:8, background:"rgba(2,8,23,0.9)", color:"#e5e7eb", border:"1px solid rgba(148,163,184,0.3)", padding:"8px 10px", fontSize:"0.85rem" }} /> },
              { label:"일", content: <input value={day} onChange={(e) => setDay(e.target.value)} type="number" min={1} max={31} style={{ width:"100%", marginTop:4, borderRadius:8, background:"rgba(2,8,23,0.9)", color:"#e5e7eb", border:"1px solid rgba(148,163,184,0.3)", padding:"8px 10px", fontSize:"0.85rem" }} /> },
              { label:"시(0-23)", content: <input value={hour} onChange={(e) => setHour(e.target.value)} type="number" min={0} max={23} style={{ width:"100%", marginTop:4, borderRadius:8, background:"rgba(2,8,23,0.9)", color:"#e5e7eb", border:"1px solid rgba(148,163,184,0.3)", padding:"8px 10px", fontSize:"0.85rem" }} /> },
            ].map(({ label, content }) => (
              <label key={label} style={{ fontSize:"0.78rem", color:"rgba(148,163,184,0.85)", fontWeight:600 }}>{label}{content}</label>
            ))}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <button type="button" onClick={analyzeSaju} disabled={analyzing}
            style={{ flex:1, minWidth:120, border:0, borderRadius:12, padding:"12px 0", background: analyzing ? "rgba(30,58,138,0.5)" : "linear-gradient(135deg,#1d4ed8,#2563eb)", color:"white", fontWeight:800, fontSize:"0.9rem", cursor: analyzing ? "not-allowed" : "pointer", opacity: analyzing ? 0.65 : 1 }}>
            {analyzing ? "사주 분석 중…" : "🔮 사주 분석"}
          </button>
          <button type="button" onClick={makeRecommendations} disabled={!analysis}
            style={{ flex:1, minWidth:120, border:"1px solid rgba(212,175,55,0.4)", borderRadius:12, padding:"12px 0", background: !analysis ? "rgba(20,30,50,0.5)" : "linear-gradient(135deg, rgba(45,30,5,0.92), rgba(20,18,5,0.92))", color: !analysis ? "rgba(148,163,184,0.4)" : "rgba(212,175,55,0.98)", fontWeight:800, fontSize:"0.9rem", cursor: !analysis ? "not-allowed" : "pointer" }}>
            ✨ 이름 추천 생성
          </button>
        </div>

        {error ? <p style={{ margin:0, color:"rgba(252,165,165,0.88)", fontSize:"0.84rem" }}>⚠ {error}</p> : null}

        {/* 사주 분석 결과 */}
        {analysis ? (
          <div style={{ borderRadius:14, border:"1px solid rgba(212,175,55,0.22)", background:"rgba(2,8,23,0.55)", padding:"14px 16px" }}>
            <p style={{ margin:"0 0 10px", fontWeight:800, color:"rgba(212,175,55,0.9)", fontSize:"0.8rem", letterSpacing:"0.15em", textTransform:"uppercase" }}>만세력 분석 결과</p>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
              {(["year", "month", "day", "hour"] as const).map((k, i) => {
                const labels = ["년주", "월주", "일주", "시주"];
                const p = analysis.pillars[k];
                return (
                  <span key={k} style={{ borderRadius:10, border:"1px solid rgba(212,175,55,0.2)", background:"rgba(10,20,40,0.7)", padding:"6px 12px", fontSize:"0.82rem", color:"rgba(226,232,240,0.88)" }}>
                    <span style={{ color:"rgba(212,175,55,0.65)", fontSize:"0.7rem", marginRight:4 }}>{labels[i]}</span>
                    {p.ganKr || p.gan}{p.zhiKr || p.zhi}
                  </span>
                );
              })}
            </div>
            <p style={{ margin:0, fontSize:"0.88rem", color:"#e2e8f0" }}>
              용신 오행: <strong style={{ color:"#f5e27a", fontSize:"1rem" }}>{analysis.yongshin}</strong>
            </p>
          </div>
        ) : null}

        {/* 추천 이름 목록 */}
        {names.length > 0 ? (
          <div style={{ display:"grid", gap:14 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
              <p style={{ margin:0, color:"rgba(212,175,55,0.9)", fontSize:"0.8rem", fontWeight:800, letterSpacing:"0.15em", textTransform:"uppercase" }}>추천 이름 {names.length}개</p>
              <button type="button" onClick={handlePrintNames}
                style={{ border:"1px solid rgba(212,175,55,0.4)", borderRadius:10, padding:"8px 16px", background:"rgba(45,30,5,0.7)", color:"rgba(212,175,55,0.9)", fontWeight:700, fontSize:"0.82rem", cursor:"pointer" }}>
                📄 인쇄 / 결과 저장
              </button>
            </div>
            <div style={{ display:"grid", gap:10, gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))" }}>
              {names.map((n, i) => (
                <article key={`${n.name}-${n.c1.c}-${n.c2.c}`}
                  style={{ borderRadius:14, border:"1px solid rgba(212,175,55,0.2)", background:"rgba(2,8,23,0.7)", padding:"14px 16px" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                    <span style={{ fontSize:"1.4rem", fontWeight:900, color:"#f5e27a" }}>{n.name}</span>
                    <span style={{ fontSize:"0.68rem", color:"rgba(212,175,55,0.55)", letterSpacing:"0.1em" }}>#{i + 1}</span>
                  </div>
                  <p style={{ margin:"0 0 8px", fontSize:"0.78rem", color:"#94a3b8" }}>{n.c1.c}({n.c1.m}) · {n.c2.c}({n.c2.m})</p>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:8 }}>
                    <span style={{ borderRadius:999, border:`1px solid ${elementBadgeColor(n.c1.o)}55`, padding:"2px 10px", fontSize:"0.72rem", color:elementBadgeColor(n.c1.o) }}>{n.c1.o}</span>
                    <span style={{ borderRadius:999, border:`1px solid ${elementBadgeColor(n.c2.o)}55`, padding:"2px 10px", fontSize:"0.72rem", color:elementBadgeColor(n.c2.o) }}>{n.c2.o}</span>
                  </div>
                  <p style={{ margin:0, fontSize:"0.74rem", color:"rgba(148,163,184,0.65)" }}>원격 {n.won} · 형격 {n.hyeong} · 점수 {n.score}</p>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
