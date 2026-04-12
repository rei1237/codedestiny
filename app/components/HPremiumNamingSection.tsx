"use client";

import { useMemo, useState } from "react";

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
      setError("출생 정보를 정확히 입력해 주세요.");
      return;
    }

    setAnalyzing(true);
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
      setError(e instanceof Error ? e.message : "사주 분석 중 오류가 발생했습니다.");
    } finally {
      setAnalyzing(false);
    }
  };

  const makeRecommendations = () => {
    if (!yongshinElement) {
      setError("먼저 사주 분석을 완료해 주세요.");
      return;
    }
    setError("");
    const seed = Date.now() + Math.floor(Math.random() * 100000);
    setNames(generateNames(surname, yongshinElement, seed));
  };

  if (showIntro) {
    return (
      <section style={{ padding: "26px 22px", color: "#e2e8f0" }}>
        <div style={{ display: "grid", gap: 16 }}>
          <img
            src="/fuctionassets/naming.webp"
            alt="명운 프리미엄 작명"
            style={{ width: "100%", borderRadius: 16, border: "1px solid rgba(212,175,55,0.35)", objectFit: "cover", maxHeight: 280 }}
          />
          <p style={{ margin: 0, fontSize: "0.72rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(212,175,55,0.85)", fontWeight: 700 }}>
            Naming Premium
          </p>
          <h3 style={{ margin: 0, fontSize: "1.35rem", lineHeight: 1.35, color: "#fff", fontWeight: 900 }}>
            명운(明運) 사주 프리미엄 작명
          </h3>
          <p style={{ margin: 0, color: "rgba(226,232,240,0.78)", fontSize: "0.92rem", lineHeight: 1.8 }}>
            이 기능은 서비스 만세력 엔진 결과를 기준으로 용신을 계산해 이름을 추천합니다. 무료 미리보기는 제공하지 않으며,
            결과 열람은 코인 게이트를 통과한 뒤 가능합니다.
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, padding: "7px 14px", background: "rgba(212,175,55,0.14)", border: "1px solid rgba(212,175,55,0.42)", color: "#f5e27a", fontWeight: 800, fontSize: "0.8rem" }}>
              🐷 이용 코인 700
            </span>
            <button
              type="button"
              onClick={onStartGeneration}
              disabled={generationLoading}
              style={{ border: 0, borderRadius: 12, padding: "11px 18px", background: "linear-gradient(135deg,#d4af37,#9f7a1a)", color: "#0b1220", fontWeight: 900, cursor: generationLoading ? "not-allowed" : "pointer", opacity: generationLoading ? 0.6 : 1 }}
            >
              {generationLoading ? "코인 확인 중..." : "700코인으로 작명 시작"}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section style={{ padding: "24px 20px", color: "#e2e8f0" }}>
      <div style={{ display: "grid", gap: 14 }}>
        <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#fff", fontWeight: 900 }}>명운 작명 생성</h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10 }}>
          <label style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>
            성씨
            <select value={surname} onChange={(e) => setSurname(e.target.value)} style={{ width: "100%", marginTop: 4, borderRadius: 8, background: "#101827", color: "#e5e7eb", border: "1px solid rgba(148,163,184,0.4)", padding: "8px 10px" }}>
              {Object.keys(SURNAME_DB).map((sn) => (
                <option key={sn} value={sn}>{sn}({SURNAME_DB[sn].hanja})</option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>
            성별
            <select value={gender} onChange={(e) => setGender(e.target.value)} style={{ width: "100%", marginTop: 4, borderRadius: 8, background: "#101827", color: "#e5e7eb", border: "1px solid rgba(148,163,184,0.4)", padding: "8px 10px" }}>
              <option value="male">남성</option>
              <option value="female">여성</option>
            </select>
          </label>
          <label style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>
            출생연
            <input value={year} onChange={(e) => setYear(e.target.value)} type="number" min={1900} max={2099} style={{ width: "100%", marginTop: 4, borderRadius: 8, background: "#101827", color: "#e5e7eb", border: "1px solid rgba(148,163,184,0.4)", padding: "8px 10px" }} />
          </label>
          <label style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>
            월
            <input value={month} onChange={(e) => setMonth(e.target.value)} type="number" min={1} max={12} style={{ width: "100%", marginTop: 4, borderRadius: 8, background: "#101827", color: "#e5e7eb", border: "1px solid rgba(148,163,184,0.4)", padding: "8px 10px" }} />
          </label>
          <label style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>
            일
            <input value={day} onChange={(e) => setDay(e.target.value)} type="number" min={1} max={31} style={{ width: "100%", marginTop: 4, borderRadius: 8, background: "#101827", color: "#e5e7eb", border: "1px solid rgba(148,163,184,0.4)", padding: "8px 10px" }} />
          </label>
          <label style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>
            시(0-23)
            <input value={hour} onChange={(e) => setHour(e.target.value)} type="number" min={0} max={23} style={{ width: "100%", marginTop: 4, borderRadius: 8, background: "#101827", color: "#e5e7eb", border: "1px solid rgba(148,163,184,0.4)", padding: "8px 10px" }} />
          </label>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={analyzeSaju} disabled={analyzing} style={{ border: 0, borderRadius: 10, padding: "10px 14px", background: "linear-gradient(135deg,#1d4ed8,#2563eb)", color: "white", fontWeight: 800, cursor: analyzing ? "not-allowed" : "pointer", opacity: analyzing ? 0.6 : 1 }}>
            {analyzing ? "사주 분석 중..." : "사주 분석"}
          </button>
          <button type="button" onClick={makeRecommendations} disabled={!analysis} style={{ border: 0, borderRadius: 10, padding: "10px 14px", background: "linear-gradient(135deg,#d4af37,#9f7a1a)", color: "#0b1220", fontWeight: 900, cursor: !analysis ? "not-allowed" : "pointer", opacity: !analysis ? 0.55 : 1 }}>
            이름 추천 생성
          </button>
        </div>

        {error ? <p style={{ margin: 0, color: "#fda4af", fontSize: "0.85rem" }}>⚠ {error}</p> : null}

        {analysis ? (
          <div style={{ borderRadius: 12, border: "1px solid rgba(212,175,55,0.24)", background: "rgba(15,23,42,0.55)", padding: "12px 14px" }}>
            <p style={{ margin: "0 0 8px", fontWeight: 800, color: "#f5e27a", fontSize: "0.85rem" }}>만세력 분석 결과</p>
            <p style={{ margin: "0 0 8px", fontSize: "0.84rem", color: "#cbd5e1" }}>
              년주 {analysis.pillars.year.gan}{analysis.pillars.year.zhi} · 월주 {analysis.pillars.month.gan}{analysis.pillars.month.zhi} · 일주 {analysis.pillars.day.gan}{analysis.pillars.day.zhi} · 시주 {analysis.pillars.hour.gan}{analysis.pillars.hour.zhi}
            </p>
            <p style={{ margin: 0, fontSize: "0.84rem", color: "#e2e8f0" }}>
              용신: <strong style={{ color: "#f5e27a" }}>{analysis.yongshin}</strong>
            </p>
          </div>
        ) : null}

        {names.length > 0 ? (
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
            {names.map((n) => (
              <article key={`${n.name}-${n.c1.c}-${n.c2.c}`} style={{ borderRadius: 12, border: "1px solid rgba(148,163,184,0.25)", background: "rgba(2,6,23,0.65)", padding: "12px 14px" }}>
                <p style={{ margin: 0, fontSize: "1.25rem", fontWeight: 900, color: "#fff" }}>{n.name}</p>
                <p style={{ margin: "4px 0 8px", fontSize: "0.78rem", color: "#94a3b8" }}>{n.c1.c}({n.c1.m}) · {n.c2.c}({n.c2.m})</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  <span style={{ borderRadius: 999, border: `1px solid ${elementBadgeColor(n.c1.o)}55`, padding: "2px 8px", fontSize: "0.72rem", color: elementBadgeColor(n.c1.o) }}>{n.c1.o}</span>
                  <span style={{ borderRadius: 999, border: `1px solid ${elementBadgeColor(n.c2.o)}55`, padding: "2px 8px", fontSize: "0.72rem", color: elementBadgeColor(n.c2.o) }}>{n.c2.o}</span>
                </div>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#cbd5e1" }}>원격 {n.won} · 형격 {n.hyeong} · 점수 {n.score}</p>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
