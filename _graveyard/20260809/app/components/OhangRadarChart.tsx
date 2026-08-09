"use client";
/**
 * OhangRadarChart — 오행(五行) 분포 시각화 컴포넌트
 * CRO 전략: 텍스트 대신 고급스러운 데이터 시각화로 "3만 원 이상의 가치" 증명.
 *
 * 사용법:
 *   <OhangRadarChart data={{ wood: 35, fire: 20, earth: 15, metal: 25, water: 5 }} />
 *   <OhangRadarChart data={userOhangData} showBalance showDominant />
 */

import { useEffect, useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

/* ─────────────────────────────────────────
   타입 & 상수
───────────────────────────────────────── */
export interface OhangData {
  wood: number;   // 목(木)
  fire: number;   // 화(火)
  earth: number;  // 토(土)
  metal: number;  // 금(金)
  water: number;  // 수(水)
}

interface Props {
  data: OhangData;
  showBalance?: boolean;
  showDominant?: boolean;
  showBarView?: boolean;
  className?: string;
}

type OhangKey = keyof OhangData;

const OHANG_META: Record<OhangKey, { emoji: string; color: string; element: string }> = {
  wood: { emoji: "🌳", color: "#4ade80", element: "木" },
  fire: { emoji: "🔥", color: "#f97316", element: "火" },
  earth: { emoji: "🪨", color: "#fbbf24", element: "土" },
  metal: { emoji: "⚔️", color: "#94a3b8", element: "金" },
  water: { emoji: "💧", color: "#60a5fa", element: "水" },
};

const OHANG_CHART_COPY: Record<LoadingLocale, {
  title: string;
  subtitle: string;
  viewRadar: string;
  viewBar: string;
  radarName: string;
  dominant: string;
  needsSupport: string;
  balanceIndex: string;
  balanceGood: string;
  balanceSome: string;
  balanceLow: string;
  supportNote: (desc: string) => string;
  elements: Record<OhangKey, { label: string; desc: string }>;
}> = {
  ko: {
    title: "오행(五行) 분포 분석",
    subtitle: "에너지 속성 · 음양오행 균형 진단",
    viewRadar: "🕸 레이더",
    viewBar: "📊 막대",
    radarName: "오행",
    dominant: "지배 오행",
    needsSupport: "보완 필요",
    balanceIndex: "오행 균형 지수",
    balanceGood: "균형이 잘 잡혀 있습니다",
    balanceSome: "일부 오행 보완이 권장됩니다",
    balanceLow: "오행 불균형 — 상세 분석이 필요합니다",
    supportNote: (desc) => `${desc} 강화 권장`,
    elements: {
      wood: { label: "목(木)", desc: "성장·추진력" },
      fire: { label: "화(火)", desc: "열정·표현력" },
      earth: { label: "토(土)", desc: "안정·신뢰성" },
      metal: { label: "금(金)", desc: "결단·정밀성" },
      water: { label: "수(水)", desc: "지혜·유연성" },
    },
  },
  en: {
    title: "Five Elements Distribution",
    subtitle: "Energy qualities · Yin-yang balance reading",
    viewRadar: "🕸 Radar",
    viewBar: "📊 Bars",
    radarName: "Five Elements",
    dominant: "Dominant Element",
    needsSupport: "Needs Support",
    balanceIndex: "Five Elements Balance",
    balanceGood: "Your elemental balance is steady",
    balanceSome: "Some elements would benefit from support",
    balanceLow: "Elemental imbalance needs a closer reading",
    supportNote: (desc) => `Strengthen ${desc}`,
    elements: {
      wood: { label: "Wood (木)", desc: "Growth · Drive" },
      fire: { label: "Fire (火)", desc: "Passion · Expression" },
      earth: { label: "Earth (土)", desc: "Stability · Trust" },
      metal: { label: "Metal (金)", desc: "Decision · Precision" },
      water: { label: "Water (水)", desc: "Wisdom · Flexibility" },
    },
  },
  ja: {
    title: "五行分布分析",
    subtitle: "エネルギー特性・陰陽五行のバランス診断",
    viewRadar: "🕸 レーダー",
    viewBar: "📊 棒グラフ",
    radarName: "五行",
    dominant: "強く出ている五行",
    needsSupport: "補うとよい五行",
    balanceIndex: "五行バランス指数",
    balanceGood: "五行の巡りは穏やかに整っています",
    balanceSome: "一部の五行を補うと流れが整います",
    balanceLow: "五行の偏りがあり、詳しい読み解きが必要です",
    supportNote: (desc) => `${desc}を整えるとよい流れです`,
    elements: {
      wood: { label: "木(木)", desc: "成長・推進力" },
      fire: { label: "火(火)", desc: "情熱・表現力" },
      earth: { label: "土(土)", desc: "安定・信頼性" },
      metal: { label: "金(金)", desc: "決断・精密さ" },
      water: { label: "水(水)", desc: "知恵・柔軟性" },
    },
  },
  "zh-CN": {
    title: "五行分布分析",
    subtitle: "能量属性 · 阴阳五行平衡诊断",
    viewRadar: "🕸 雷达",
    viewBar: "📊 柱状",
    radarName: "五行",
    dominant: "主导五行",
    needsSupport: "需要补强",
    balanceIndex: "五行平衡指数",
    balanceGood: "五行流转较为平衡",
    balanceSome: "部分五行建议适度补强",
    balanceLow: "五行偏斜，需要进一步细读",
    supportNote: (desc) => `建议补强${desc}`,
    elements: {
      wood: { label: "木(木)", desc: "成长·推动力" },
      fire: { label: "火(火)", desc: "热情·表达力" },
      earth: { label: "土(土)", desc: "稳定·信赖感" },
      metal: { label: "金(金)", desc: "决断·精密度" },
      water: { label: "水(水)", desc: "智慧·柔韧性" },
    },
  },
  "zh-TW": {
    title: "五行分布分析",
    subtitle: "能量屬性 · 陰陽五行平衡診斷",
    viewRadar: "🕸 雷達",
    viewBar: "📊 長條",
    radarName: "五行",
    dominant: "主導五行",
    needsSupport: "需要補強",
    balanceIndex: "五行平衡指數",
    balanceGood: "五行流轉較為平衡",
    balanceSome: "部分五行建議適度補強",
    balanceLow: "五行偏斜，需要進一步細讀",
    supportNote: (desc) => `建議補強${desc}`,
    elements: {
      wood: { label: "木(木)", desc: "成長·推動力" },
      fire: { label: "火(火)", desc: "熱情·表達力" },
      earth: { label: "土(土)", desc: "穩定·信賴感" },
      metal: { label: "金(金)", desc: "決斷·精密度" },
      water: { label: "水(水)", desc: "智慧·柔韌性" },
    },
  },
  vi: {
    title: "Phân tích phân bố Ngũ hành",
    subtitle: "Tính chất năng lượng · Cân bằng âm dương ngũ hành",
    viewRadar: "🕸 Radar",
    viewBar: "📊 Cột",
    radarName: "Ngũ hành",
    dominant: "Hành chủ đạo",
    needsSupport: "Cần bổ sung",
    balanceIndex: "Chỉ số cân bằng Ngũ hành",
    balanceGood: "Dòng Ngũ hành đang khá hài hòa",
    balanceSome: "Một vài hành nên được bồi đắp thêm",
    balanceLow: "Ngũ hành lệch rõ, cần đọc sâu hơn",
    supportNote: (desc) => `Nên bồi đắp ${desc}`,
    elements: {
      wood: { label: "Mộc (木)", desc: "Tăng trưởng · Thúc đẩy" },
      fire: { label: "Hỏa (火)", desc: "Đam mê · Biểu đạt" },
      earth: { label: "Thổ (土)", desc: "Ổn định · Tin cậy" },
      metal: { label: "Kim (金)", desc: "Quyết đoán · Tinh chuẩn" },
      water: { label: "Thủy (水)", desc: "Trí tuệ · Linh hoạt" },
    },
  },
  hi: {
    title: "पंच तत्व वितरण विश्लेषण",
    subtitle: "ऊर्जा गुण · यिन-यांग पंच तत्व संतुलन",
    viewRadar: "🕸 रडार",
    viewBar: "📊 बार",
    radarName: "पंच तत्व",
    dominant: "प्रमुख तत्व",
    needsSupport: "सहयोग चाहिए",
    balanceIndex: "पंच तत्व संतुलन सूचक",
    balanceGood: "तत्वों का संतुलन स्थिर है",
    balanceSome: "कुछ तत्वों को सहारा देना शुभ रहेगा",
    balanceLow: "तत्वों में झुकाव है, गहरी व्याख्या चाहिए",
    supportNote: (desc) => `${desc} को सहारा दें`,
    elements: {
      wood: { label: "लकड़ी (木)", desc: "विकास · आगे बढ़ना" },
      fire: { label: "अग्नि (火)", desc: "उत्साह · अभिव्यक्ति" },
      earth: { label: "पृथ्वी (土)", desc: "स्थिरता · भरोसा" },
      metal: { label: "धातु (金)", desc: "निर्णय · सूक्ष्मता" },
      water: { label: "जल (水)", desc: "बुद्धि · लचीलापन" },
    },
  },
  es: {
    title: "Análisis de los Cinco Elementos",
    subtitle: "Cualidades energéticas · Equilibrio yin-yang",
    viewRadar: "🕸 Radar",
    viewBar: "📊 Barras",
    radarName: "Cinco Elementos",
    dominant: "Elemento dominante",
    needsSupport: "Necesita apoyo",
    balanceIndex: "Equilibrio de los Cinco Elementos",
    balanceGood: "El equilibrio elemental se mantiene sereno",
    balanceSome: "Conviene reforzar algunos elementos",
    balanceLow: "Hay un desequilibrio que pide una lectura más profunda",
    supportNote: (desc) => `Reforzar ${desc}`,
    elements: {
      wood: { label: "Madera (木)", desc: "Crecimiento · Impulso" },
      fire: { label: "Fuego (火)", desc: "Pasión · Expresión" },
      earth: { label: "Tierra (土)", desc: "Estabilidad · Confianza" },
      metal: { label: "Metal (金)", desc: "Decisión · Precisión" },
      water: { label: "Agua (水)", desc: "Sabiduría · Flexibilidad" },
    },
  },
  fr: {
    title: "Analyse des Cinq Éléments",
    subtitle: "Qualités énergétiques · Équilibre yin-yang",
    viewRadar: "🕸 Radar",
    viewBar: "📊 Barres",
    radarName: "Cinq Éléments",
    dominant: "Élément dominant",
    needsSupport: "À soutenir",
    balanceIndex: "Équilibre des Cinq Éléments",
    balanceGood: "L'équilibre élémentaire est bien posé",
    balanceSome: "Certains éléments gagneraient à être soutenus",
    balanceLow: "Un déséquilibre demande une lecture plus fine",
    supportNote: (desc) => `Soutenir ${desc}`,
    elements: {
      wood: { label: "Bois (木)", desc: "Croissance · Élan" },
      fire: { label: "Feu (火)", desc: "Passion · Expression" },
      earth: { label: "Terre (土)", desc: "Stabilité · Confiance" },
      metal: { label: "Métal (金)", desc: "Décision · Précision" },
      water: { label: "Eau (水)", desc: "Sagesse · Souplesse" },
    },
  },
  de: {
    title: "Fünf-Elemente-Verteilung",
    subtitle: "Energiequalitäten · Yin-Yang-Balance",
    viewRadar: "🕸 Radar",
    viewBar: "📊 Balken",
    radarName: "Fünf Elemente",
    dominant: "Dominantes Element",
    needsSupport: "Braucht Stärkung",
    balanceIndex: "Fünf-Elemente-Balance",
    balanceGood: "Die Elemente sind ruhig ausbalanciert",
    balanceSome: "Einige Elemente dürfen gestärkt werden",
    balanceLow: "Die Elemente sind unausgewogen und brauchen eine tiefere Lesung",
    supportNote: (desc) => `${desc} stärken`,
    elements: {
      wood: { label: "Holz (木)", desc: "Wachstum · Antrieb" },
      fire: { label: "Feuer (火)", desc: "Leidenschaft · Ausdruck" },
      earth: { label: "Erde (土)", desc: "Stabilität · Vertrauen" },
      metal: { label: "Metall (金)", desc: "Entscheidung · Präzision" },
      water: { label: "Wasser (水)", desc: "Weisheit · Beweglichkeit" },
    },
  },
  nl: {
    title: "Vijf Elementen verdeling",
    subtitle: "Energiekwaliteiten · Yin-yang balans",
    viewRadar: "🕸 Radar",
    viewBar: "📊 Balken",
    radarName: "Vijf Elementen",
    dominant: "Dominant element",
    needsSupport: "Heeft steun nodig",
    balanceIndex: "Balans van de Vijf Elementen",
    balanceGood: "De elementen zijn mooi in evenwicht",
    balanceSome: "Enkele elementen mogen meer steun krijgen",
    balanceLow: "Er is duidelijke onbalans die dieper gelezen moet worden",
    supportNote: (desc) => `${desc} versterken`,
    elements: {
      wood: { label: "Hout (木)", desc: "Groei · Vooruitgang" },
      fire: { label: "Vuur (火)", desc: "Passie · Expressie" },
      earth: { label: "Aarde (土)", desc: "Stabiliteit · Vertrouwen" },
      metal: { label: "Metaal (金)", desc: "Besluit · Precisie" },
      water: { label: "Water (水)", desc: "Wijsheid · Flexibiliteit" },
    },
  },
  ms: {
    title: "Analisis taburan Lima Unsur",
    subtitle: "Sifat tenaga · Keseimbangan yin-yang",
    viewRadar: "🕸 Radar",
    viewBar: "📊 Bar",
    radarName: "Lima Unsur",
    dominant: "Unsur dominan",
    needsSupport: "Perlu disokong",
    balanceIndex: "Indeks keseimbangan Lima Unsur",
    balanceGood: "Aliran unsur berada dalam keseimbangan lembut",
    balanceSome: "Sebahagian unsur elok diperkukuh",
    balanceLow: "Ketidakseimbangan unsur memerlukan bacaan lebih mendalam",
    supportNote: (desc) => `Perkukuh ${desc}`,
    elements: {
      wood: { label: "Kayu (木)", desc: "Pertumbuhan · Dorongan" },
      fire: { label: "Api (火)", desc: "Semangat · Ekspresi" },
      earth: { label: "Tanah (土)", desc: "Kestabilan · Kepercayaan" },
      metal: { label: "Logam (金)", desc: "Keputusan · Ketelitian" },
      water: { label: "Air (水)", desc: "Kebijaksanaan · Kelenturan" },
    },
  },
};

function useResolvedLoadingLocale() {
  const [locale, setLocale] = useState<LoadingLocale>("ko");

  useEffect(() => {
    setLocale(getCurrentLoadingLocale());
  }, []);

  return locale;
}

type PolarTickProps = {
  x?: number | string;
  y?: number | string;
  payload?: {
    value?: string;
  };
};

/* ─────────────────────────────────────────
   균형 지수 계산
───────────────────────────────────────── */
function calcBalance(data: OhangData): number {
  const vals = Object.values(data);
  const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
  const variance = vals.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / vals.length;
  const stddev = Math.sqrt(variance);
  return Math.max(0, Math.round(100 - (stddev / avg) * 60));
}

/* ─────────────────────────────────────────
   메인 컴포넌트
───────────────────────────────────────── */
export default function OhangRadarChart({ data, showBalance = true, showDominant = true, showBarView = false, className = "" }: Props) {
  const [viewMode, setViewMode] = useState<"radar" | "bar">(showBarView ? "bar" : "radar");
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const locale = useResolvedLoadingLocale();
  const copy = OHANG_CHART_COPY[locale] || OHANG_CHART_COPY.ko;

  /* 레이더 차트 데이터 */
  const radarData = (Object.keys(data) as OhangKey[]).map((key) => ({
    key,
    subject: copy.elements[key].label,
    value: data[key],
    fullMark: 100,
  }));

  /* 바 차트 데이터 */
  const barData = [...radarData].sort((a, b) => b.value - a.value);

  /* 균형 지수 */
  const balanceScore = calcBalance(data);

  /* 지배 오행 */
  const dominant = (Object.entries(data) as [OhangKey, number][]).reduce((a, b) => a[1] > b[1] ? a : b);
  const dominated = (Object.entries(data) as [OhangKey, number][]).reduce((a, b) => a[1] < b[1] ? a : b);
  const dominantMeta = OHANG_META[dominant[0]];
  const dominatedMeta = OHANG_META[dominated[0]];
  const dominantCopy = copy.elements[dominant[0]];
  const dominatedCopy = copy.elements[dominated[0]];

  return (
    <m.div
      className={`relative rounded-2xl overflow-hidden ${className}`}
      style={{ background: "linear-gradient(160deg,rgba(20,12,50,0.95),rgba(8,5,20,0.98))", border: "1px solid rgba(167,139,250,0.18)" }}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-amber-400 text-sm">☯</span>
            <h3 className="text-sm font-bold text-white tracking-wide">{copy.title}</h3>
          </div>
          <p className="text-[11px] text-violet-400/60">{copy.subtitle}</p>
        </div>

        {/* 뷰 전환 */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
          {(["radar", "bar"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className="px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all duration-200"
              style={viewMode === mode
                ? { background: "rgba(212,168,67,0.2)", color: "#d4a843", border: "1px solid rgba(212,168,67,0.35)" }
                : { color: "rgba(167,139,250,0.5)" }}
            >
              {mode === "radar" ? copy.viewRadar : copy.viewBar}
            </button>
          ))}
        </div>
      </div>

      {/* 차트 영역 */}
      <AnimatePresence mode="wait">
        <m.div
          key={viewMode}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.3 }}
          className="px-3"
        >
          {viewMode === "radar" ? (
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
                <PolarGrid stroke="rgba(167,139,250,0.15)" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={({ x = 0, y = 0, payload }: PolarTickProps) => {
                    const tickX = typeof x === "number" ? x : Number(x);
                    const tickY = typeof y === "number" ? y : Number(y);
                    const key = radarData.find(d => d.subject === payload?.value)?.key;
                    const meta = key ? OHANG_META[key] : null;
                    return (
                      <text x={tickX} y={tickY} fill={meta?.color ?? "#a78bfa"} fontSize={11} fontWeight="600" textAnchor="middle" dominantBaseline="central">
                        {meta?.element ?? payload?.value}
                      </text>
                    );
                  }}
                />
                <Radar
                  name={copy.radarName}
                  dataKey="value"
                  stroke="rgba(212,168,67,0.8)"
                  fill="rgba(212,168,67,0.15)"
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="px-2 py-2">
              {barData.map(({ key, value }, i) => {
                const meta = OHANG_META[key];
                const elementCopy = copy.elements[key];
                return (
                  <m.div
                    key={key}
                    className="flex items-center gap-3 mb-2.5"
                    initial={{ x: -16, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.07 }}
                    onHoverStart={() => setHoveredKey(key)}
                    onHoverEnd={() => setHoveredKey(null)}
                  >
                    <div className="w-8 text-center text-sm font-bold" style={{ color: meta.color }}>
                      {meta.element}
                    </div>
                    <div className="flex-1 h-6 rounded-lg overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <m.div
                        className="h-full rounded-lg flex items-center justify-end pr-2"
                        style={{
                          background: hoveredKey === key
                            ? meta.color
                            : `linear-gradient(90deg,${meta.color}60,${meta.color}90)`,
                          transition: "background 0.2s",
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${value}%` }}
                        transition={{ duration: 0.7, delay: i * 0.07, ease: "easeOut" }}
                      >
                        <span className="text-[10px] font-bold text-white/80">{value}</span>
                      </m.div>
                    </div>
                    <div className="w-16 text-[10px] text-violet-300/50 leading-tight">{elementCopy.desc}</div>
                  </m.div>
                );
              })}
            </div>
          )}
        </m.div>
      </AnimatePresence>

      {/* 분석 카드 */}
      <div className="grid grid-cols-2 gap-2 px-4 pb-4 mt-1">
        {/* 지배 오행 */}
        {showDominant && (
          <m.div
            className="rounded-xl p-3 col-span-1"
            style={{ background: `linear-gradient(135deg,${dominantMeta.color}18,rgba(8,5,20,0.6))`, border: `1px solid ${dominantMeta.color}30` }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="text-[10px] text-violet-400/60 mb-1 tracking-wide">{copy.dominant}</div>
            <div className="font-bold text-sm" style={{ color: dominantMeta.color }}>
              {dominantMeta.emoji} {dominantCopy.label}
            </div>
            <div className="text-[10px] text-violet-200/60 mt-0.5">{dominantCopy.desc}</div>
          </m.div>
        )}

        {/* 부족 오행 */}
        {showDominant && (
          <m.div
            className="rounded-xl p-3 col-span-1"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(167,139,250,0.15)" }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="text-[10px] text-violet-400/60 mb-1 tracking-wide">{copy.needsSupport}</div>
            <div className="font-bold text-sm text-violet-300">
              {dominatedMeta.emoji} {dominatedCopy.label}
            </div>
            <div className="text-[10px] text-violet-200/60 mt-0.5">{copy.supportNote(dominatedCopy.desc)}</div>
          </m.div>
        )}

        {/* 균형 지수 */}
        {showBalance && (
          <m.div
            className="rounded-xl p-3 col-span-2"
            style={{ background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.2)" }}
            whileHover={{ scale: 1.01 }}
            >
              <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] text-amber-400/70 tracking-wide font-semibold">{copy.balanceIndex}</div>
              <div className="text-xl font-bold" style={{ background: "linear-gradient(135deg,#d4a843,#f0c060)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {balanceScore}
              </div>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(212,168,67,0.15)" }}>
              <m.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg,#d4a843,#f0c060,#d4a843)" }}
                initial={{ width: 0 }}
                animate={{ width: `${balanceScore}%` }}
                transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
              />
            </div>
            <div className="text-[10px] text-amber-400/40 mt-1">
              {balanceScore >= 75 ? copy.balanceGood : balanceScore >= 50 ? copy.balanceSome : copy.balanceLow}
            </div>
          </m.div>
        )}
      </div>
    </m.div>
  );
}
