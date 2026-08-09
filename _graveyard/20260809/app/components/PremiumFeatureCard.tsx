"use client";
/**
 * PremiumFeatureCard — 마이크로 인터랙션이 살아있는 프리미엄 기능 카드
 * 효과: hover 시 골드 빛 스윕 + 3D 틸트 + 오행 카드 뒤집기 애니메이션
 *
 */

import { useEffect, useState } from "react";
import { m, useMotionValue, useSpring, useTransform } from "framer-motion";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

/* ─────────────────────────────────────────
   타입
───────────────────────────────────────── */
interface PremiumFeatureCardProps {
  title: string;
  subtitle?: string;
  icon?: string;
  /** 잠금 여부 */
  locked?: boolean;
  /** 뒷면 콘텐츠 (뒤집기 애니메이션) */
  backContent?: React.ReactNode;
  /** 앞면 콘텐츠 */
  frontContent?: React.ReactNode;
  /** 잠금 클릭 콜백 */
  onUnlock?: () => void;
  /** 카드 크기 */
  size?: "sm" | "md" | "lg";
  /** 색상 테마 */
  theme?: "gold" | "violet" | "teal";
  className?: string;
}

/* ─────────────────────────────────────────
   테마 설정
───────────────────────────────────────── */
const THEMES = {
  gold: {
    glow: "rgba(212,168,67,0.4)",
    border: "rgba(212,168,67,0.3)",
    bg: "rgba(212,168,67,0.06)",
    accent: "#d4a843",
    gradient: "linear-gradient(135deg,#d4a843,#f0c060)",
  },
  violet: {
    glow: "rgba(167,139,250,0.45)",
    border: "rgba(167,139,250,0.28)",
    bg: "rgba(167,139,250,0.06)",
    accent: "#a78bfa",
    gradient: "linear-gradient(135deg,#a78bfa,#7c3aed)",
  },
  teal: {
    glow: "rgba(45,212,191,0.35)",
    border: "rgba(45,212,191,0.25)",
    bg: "rgba(45,212,191,0.05)",
    accent: "#2dd4bf",
    gradient: "linear-gradient(135deg,#2dd4bf,#0891b2)",
  },
};

type OhangElement = "wood" | "fire" | "earth" | "metal" | "water";

const PREMIUM_FEATURE_CARD_COPY: Record<LoadingLocale, {
  flipHint: string;
  unlock: string;
  scoreSuffix: string;
  strengths: string;
  caution: string;
  ohang: Record<OhangElement, {
    label: string;
    pos: string;
    neg: string;
    tip: string;
  }>;
}> = {
  ko: {
    flipHint: "클릭해서 뒤집기 ↻",
    unlock: "해금하기",
    scoreSuffix: "점",
    strengths: "강점",
    caution: "주의",
    ohang: {
      wood: { label: "목(木)", pos: "성장·추진", neg: "과잉 시 분노", tip: "봄·동쪽·간장" },
      fire: { label: "화(火)", pos: "열정·표현", neg: "과잉 시 과격", tip: "여름·남쪽·심장" },
      earth: { label: "토(土)", pos: "안정·신뢰", neg: "과잉 시 집착", tip: "환절기·중앙·비장" },
      metal: { label: "금(金)", pos: "결단·정밀", neg: "과잉 시 냉혹", tip: "가을·서쪽·폐" },
      water: { label: "수(水)", pos: "지혜·유연", neg: "과잉 시 우유부단", tip: "겨울·북쪽·신장" },
    },
  },
  en: {
    flipHint: "Click to flip ↻",
    unlock: "Unlock",
    scoreSuffix: " pts",
    strengths: "Strengths",
    caution: "Caution",
    ohang: {
      wood: { label: "Wood (木)", pos: "Growth · Drive", neg: "Excess may stir anger", tip: "Spring · East · Liver" },
      fire: { label: "Fire (火)", pos: "Passion · Expression", neg: "Excess may turn intense", tip: "Summer · South · Heart" },
      earth: { label: "Earth (土)", pos: "Stability · Trust", neg: "Excess may cling too tightly", tip: "Seasonal transitions · Center · Spleen" },
      metal: { label: "Metal (金)", pos: "Decision · Precision", neg: "Excess may feel cold", tip: "Autumn · West · Lungs" },
      water: { label: "Water (水)", pos: "Wisdom · Flexibility", neg: "Excess may blur decisions", tip: "Winter · North · Kidneys" },
    },
  },
  ja: {
    flipHint: "タップして裏返す ↻",
    unlock: "解錠する",
    scoreSuffix: "点",
    strengths: "強み",
    caution: "注意",
    ohang: {
      wood: { label: "木(木)", pos: "成長・推進", neg: "過剰になると怒りが出やすい", tip: "春・東・肝" },
      fire: { label: "火(火)", pos: "情熱・表現", neg: "過剰になると激しさが出やすい", tip: "夏・南・心" },
      earth: { label: "土(土)", pos: "安定・信頼", neg: "過剰になると執着しやすい", tip: "季節の変わり目・中央・脾" },
      metal: { label: "金(金)", pos: "決断・精密さ", neg: "過剰になると冷たく映りやすい", tip: "秋・西・肺" },
      water: { label: "水(水)", pos: "知恵・柔軟性", neg: "過剰になると迷いやすい", tip: "冬・北・腎" },
    },
  },
  "zh-CN": {
    flipHint: "点击翻面 ↻",
    unlock: "解锁",
    scoreSuffix: "分",
    strengths: "优势",
    caution: "注意",
    ohang: {
      wood: { label: "木(木)", pos: "成长·推进", neg: "过旺时易生怒气", tip: "春·东方·肝" },
      fire: { label: "火(火)", pos: "热情·表达", neg: "过旺时容易激烈", tip: "夏·南方·心" },
      earth: { label: "土(土)", pos: "稳定·信任", neg: "过旺时容易执着", tip: "季节转换·中央·脾" },
      metal: { label: "金(金)", pos: "决断·精密", neg: "过旺时容易冷硬", tip: "秋·西方·肺" },
      water: { label: "水(水)", pos: "智慧·柔韧", neg: "过旺时容易犹豫", tip: "冬·北方·肾" },
    },
  },
  "zh-TW": {
    flipHint: "點擊翻面 ↻",
    unlock: "解鎖",
    scoreSuffix: "分",
    strengths: "優勢",
    caution: "注意",
    ohang: {
      wood: { label: "木(木)", pos: "成長·推進", neg: "過旺時易生怒氣", tip: "春·東方·肝" },
      fire: { label: "火(火)", pos: "熱情·表達", neg: "過旺時容易激烈", tip: "夏·南方·心" },
      earth: { label: "土(土)", pos: "穩定·信任", neg: "過旺時容易執著", tip: "季節轉換·中央·脾" },
      metal: { label: "金(金)", pos: "決斷·精密", neg: "過旺時容易冷硬", tip: "秋·西方·肺" },
      water: { label: "水(水)", pos: "智慧·柔韌", neg: "過旺時容易猶豫", tip: "冬·北方·腎" },
    },
  },
  vi: {
    flipHint: "Chạm để lật ↻",
    unlock: "Mở khóa",
    scoreSuffix: " điểm",
    strengths: "Điểm mạnh",
    caution: "Lưu ý",
    ohang: {
      wood: { label: "Mộc (木)", pos: "Tăng trưởng · Thúc đẩy", neg: "Quá mạnh dễ sinh nóng giận", tip: "Xuân · Đông · Gan" },
      fire: { label: "Hỏa (火)", pos: "Đam mê · Biểu đạt", neg: "Quá mạnh dễ trở nên gay gắt", tip: "Hạ · Nam · Tim" },
      earth: { label: "Thổ (土)", pos: "Ổn định · Tin cậy", neg: "Quá mạnh dễ chấp giữ", tip: "Giao mùa · Trung tâm · Tỳ" },
      metal: { label: "Kim (金)", pos: "Quyết đoán · Tinh chuẩn", neg: "Quá mạnh dễ lạnh lùng", tip: "Thu · Tây · Phổi" },
      water: { label: "Thủy (水)", pos: "Trí tuệ · Linh hoạt", neg: "Quá mạnh dễ do dự", tip: "Đông · Bắc · Thận" },
    },
  },
  hi: {
    flipHint: "पलटने के लिए टैप करें ↻",
    unlock: "अनलॉक करें",
    scoreSuffix: " अंक",
    strengths: "बल",
    caution: "सावधानी",
    ohang: {
      wood: { label: "लकड़ी (木)", pos: "विकास · आगे बढ़ना", neg: "अधिकता में क्रोध उभर सकता है", tip: "वसंत · पूर्व · यकृत" },
      fire: { label: "अग्नि (火)", pos: "उत्साह · अभिव्यक्ति", neg: "अधिकता में तीखापन बढ़ सकता है", tip: "ग्रीष्म · दक्षिण · हृदय" },
      earth: { label: "पृथ्वी (土)", pos: "स्थिरता · भरोसा", neg: "अधिकता में आसक्ति बढ़ सकती है", tip: "ऋतु-संधि · केंद्र · प्लीहा" },
      metal: { label: "धातु (金)", pos: "निर्णय · सूक्ष्मता", neg: "अधिकता में कठोरता आ सकती है", tip: "शरद · पश्चिम · फेफड़े" },
      water: { label: "जल (水)", pos: "बुद्धि · लचीलापन", neg: "अधिकता में निर्णय धुंधला हो सकता है", tip: "शीत · उत्तर · गुर्दे" },
    },
  },
  es: {
    flipHint: "Toca para girar ↻",
    unlock: "Desbloquear",
    scoreSuffix: " pts",
    strengths: "Fortalezas",
    caution: "Cuidado",
    ohang: {
      wood: { label: "Madera (木)", pos: "Crecimiento · Impulso", neg: "En exceso puede despertar ira", tip: "Primavera · Este · Hígado" },
      fire: { label: "Fuego (火)", pos: "Pasión · Expresión", neg: "En exceso puede volverse intenso", tip: "Verano · Sur · Corazón" },
      earth: { label: "Tierra (土)", pos: "Estabilidad · Confianza", neg: "En exceso puede aferrarse", tip: "Entrecambios estacionales · Centro · Bazo" },
      metal: { label: "Metal (金)", pos: "Decisión · Precisión", neg: "En exceso puede sentirse frío", tip: "Otoño · Oeste · Pulmones" },
      water: { label: "Agua (水)", pos: "Sabiduría · Flexibilidad", neg: "En exceso puede traer duda", tip: "Invierno · Norte · Riñones" },
    },
  },
  fr: {
    flipHint: "Touchez pour retourner ↻",
    unlock: "Déverrouiller",
    scoreSuffix: " pts",
    strengths: "Forces",
    caution: "Attention",
    ohang: {
      wood: { label: "Bois (木)", pos: "Croissance · Élan", neg: "En excès, la colère peut monter", tip: "Printemps · Est · Foie" },
      fire: { label: "Feu (火)", pos: "Passion · Expression", neg: "En excès, l'intensité peut déborder", tip: "Été · Sud · Cœur" },
      earth: { label: "Terre (土)", pos: "Stabilité · Confiance", neg: "En excès, l'attachement peut peser", tip: "Transitions saisonnières · Centre · Rate" },
      metal: { label: "Métal (金)", pos: "Décision · Précision", neg: "En excès, la froideur peut se voir", tip: "Automne · Ouest · Poumons" },
      water: { label: "Eau (水)", pos: "Sagesse · Souplesse", neg: "En excès, l'hésitation peut grandir", tip: "Hiver · Nord · Reins" },
    },
  },
  de: {
    flipHint: "Zum Umdrehen tippen ↻",
    unlock: "Freischalten",
    scoreSuffix: " Pkt.",
    strengths: "Stärken",
    caution: "Achtung",
    ohang: {
      wood: { label: "Holz (木)", pos: "Wachstum · Antrieb", neg: "Im Übermaß kann Zorn aufsteigen", tip: "Frühling · Osten · Leber" },
      fire: { label: "Feuer (火)", pos: "Leidenschaft · Ausdruck", neg: "Im Übermaß kann es heftig werden", tip: "Sommer · Süden · Herz" },
      earth: { label: "Erde (土)", pos: "Stabilität · Vertrauen", neg: "Im Übermaß kann Festhalten entstehen", tip: "Jahreszeitenwechsel · Mitte · Milz" },
      metal: { label: "Metall (金)", pos: "Entscheidung · Präzision", neg: "Im Übermaß kann Kälte spürbar werden", tip: "Herbst · Westen · Lunge" },
      water: { label: "Wasser (水)", pos: "Weisheit · Beweglichkeit", neg: "Im Übermaß kann Unentschlossenheit wachsen", tip: "Winter · Norden · Nieren" },
    },
  },
  nl: {
    flipHint: "Tik om te draaien ↻",
    unlock: "Ontgrendelen",
    scoreSuffix: " pnt",
    strengths: "Kracht",
    caution: "Let op",
    ohang: {
      wood: { label: "Hout (木)", pos: "Groei · Vooruitgang", neg: "Te veel kan boosheid oproepen", tip: "Lente · Oost · Lever" },
      fire: { label: "Vuur (火)", pos: "Passie · Expressie", neg: "Te veel kan fel worden", tip: "Zomer · Zuid · Hart" },
      earth: { label: "Aarde (土)", pos: "Stabiliteit · Vertrouwen", neg: "Te veel kan vasthouden versterken", tip: "Seizoensovergang · Midden · Milt" },
      metal: { label: "Metaal (金)", pos: "Besluit · Precisie", neg: "Te veel kan koel aanvoelen", tip: "Herfst · West · Longen" },
      water: { label: "Water (水)", pos: "Wijsheid · Flexibiliteit", neg: "Te veel kan twijfel brengen", tip: "Winter · Noord · Nieren" },
    },
  },
  ms: {
    flipHint: "Ketik untuk terbalik ↻",
    unlock: "Buka kunci",
    scoreSuffix: " mata",
    strengths: "Kekuatan",
    caution: "Perhatian",
    ohang: {
      wood: { label: "Kayu (木)", pos: "Pertumbuhan · Dorongan", neg: "Jika berlebihan mudah menimbulkan marah", tip: "Musim bunga · Timur · Hati" },
      fire: { label: "Api (火)", pos: "Semangat · Ekspresi", neg: "Jika berlebihan mudah menjadi keras", tip: "Musim panas · Selatan · Jantung" },
      earth: { label: "Tanah (土)", pos: "Kestabilan · Kepercayaan", neg: "Jika berlebihan mudah melekat", tip: "Peralihan musim · Tengah · Limpa" },
      metal: { label: "Logam (金)", pos: "Keputusan · Ketelitian", neg: "Jika berlebihan mudah terasa dingin", tip: "Musim luruh · Barat · Paru-paru" },
      water: { label: "Air (水)", pos: "Kebijaksanaan · Kelenturan", neg: "Jika berlebihan mudah ragu-ragu", tip: "Musim sejuk · Utara · Buah pinggang" },
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

/* ─────────────────────────────────────────
   3D 틸트 훅
───────────────────────────────────────── */
function useTilt() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 200, damping: 20 });

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const onMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return { rotateX, rotateY, onMouseMove, onMouseLeave };
}

/* ─────────────────────────────────────────
   카드 뒤집기 (오행 설명용)
───────────────────────────────────────── */
function FlipCard({ front, back, locked, onUnlock }: {
  front: React.ReactNode;
  back: React.ReactNode;
  locked?: boolean;
  onUnlock?: () => void;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="relative w-full h-full cursor-pointer"
      style={{ perspective: "1000px" }}
      onClick={() => locked ? onUnlock?.() : setFlipped(!flipped)}
    >
      <m.div
        className="relative w-full h-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* 앞면 */}
        <div className="absolute inset-0 rounded-xl overflow-hidden" style={{ backfaceVisibility: "hidden" }}>
          {front}
        </div>
        {/* 뒷면 */}
        <div className="absolute inset-0 rounded-xl overflow-hidden" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
          {back}
        </div>
      </m.div>
    </div>
  );
}

/* ─────────────────────────────────────────
   메인 컴포넌트
───────────────────────────────────────── */
export default function PremiumFeatureCard({
  title,
  subtitle,
  icon = "✦",
  locked = false,
  backContent,
  frontContent,
  onUnlock,
  size = "md",
  theme = "gold",
  className = "",
}: PremiumFeatureCardProps) {
  const { rotateX, rotateY, onMouseMove, onMouseLeave } = useTilt();
  const [isHovering, setIsHovering] = useState(false);
  const themeConfig = THEMES[theme];
  const locale = useResolvedLoadingLocale();
  const copy = PREMIUM_FEATURE_CARD_COPY[locale] || PREMIUM_FEATURE_CARD_COPY.ko;

  const sizeClasses = {
    sm: "p-4 min-h-[120px]",
    md: "p-5 min-h-[160px]",
    lg: "p-6 min-h-[200px]",
  };

  const FrontContent = () => (
    <div className={`relative flex flex-col h-full ${sizeClasses[size]}`}>
      {/* 아이콘 + 잠금 오버레이 */}
      <div className="flex items-start justify-between mb-3">
        <m.span
          className="text-3xl"
          animate={isHovering ? { scale: 1.15, rotate: [0, -5, 5, 0] } : { scale: 1, rotate: 0 }}
          transition={{ duration: 0.4 }}
        >
          {icon}
        </m.span>
        {locked && (
          <m.div
            className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
            style={{ background: "rgba(212,168,67,0.15)", border: "1px solid rgba(212,168,67,0.3)" }}
            animate={{ boxShadow: ["0 0 6px rgba(212,168,67,0.2)", "0 0 16px rgba(212,168,67,0.5)", "0 0 6px rgba(212,168,67,0.2)"] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            🔒
          </m.div>
        )}
        {backContent && !locked && (
          <m.div
            className="text-[10px] text-violet-400/40 mt-1"
            animate={isHovering ? { opacity: 1 } : { opacity: 0 }}
          >
            {copy.flipHint}
          </m.div>
        )}
      </div>

      {/* 제목 */}
      <h3 className={`font-bold leading-tight mb-1 ${size === "sm" ? "text-sm" : "text-base"}`}
        style={{ color: isHovering ? themeConfig.accent : "#e2e8f0" }}>
        {title}
      </h3>
      {subtitle && (
        <p className="text-xs text-violet-300/50 leading-relaxed">{subtitle}</p>
      )}

      {/* 커스텀 앞면 콘텐츠 */}
      {frontContent && <div className="mt-2 flex-1">{frontContent}</div>}

      {/* 잠금 상태 안내 */}
      {locked && (
        <m.div
          className="mt-auto pt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovering ? 1 : 0.6 }}
        >
          <div className="text-[11px] font-semibold flex items-center gap-1.5"
            style={{ color: themeConfig.accent }}>
            <span>{copy.unlock}</span>
            <m.span
              animate={{ x: isHovering ? [0, 4, 0] : 0 }}
              transition={{ duration: 0.5, repeat: isHovering ? Infinity : 0 }}
            >
              →
            </m.span>
          </div>
        </m.div>
      )}
    </div>
  );

  const BackContentWrapper = () => (
    <div className={`relative flex flex-col h-full ${sizeClasses[size]}`}
      style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.2),rgba(8,5,20,0.95))" }}>
      {backContent}
    </div>
  );

  return (
    <m.div
      className={`relative rounded-xl overflow-hidden select-none ${className}`}
      style={{
        background: `linear-gradient(160deg,${themeConfig.bg},rgba(8,5,20,0.92))`,
        border: `1px solid ${themeConfig.border}`,
        transformStyle: "preserve-3d",
        rotateX,
        rotateY,
      }}
      onMouseMove={onMouseMove}
      onMouseLeave={() => { onMouseLeave(); setIsHovering(false); }}
      onMouseEnter={() => setIsHovering(true)}
      whileHover={{
        boxShadow: `0 8px 40px ${themeConfig.glow}, 0 2px 16px rgba(0,0,0,0.5)`,
        borderColor: themeConfig.accent,
      }}
      transition={{ duration: 0.25 }}
      onClick={locked ? onUnlock : undefined}
    >
      {/* 배경 빛 효과 */}
      <m.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 0%,${themeConfig.glow.replace("0.4)", "0.12)")},transparent 70%)` }}
        animate={isHovering ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.3 }}
      />

      {/* 버튼 빛 스윕 */}
      {isHovering && (
        <m.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `linear-gradient(105deg,transparent 40%,${themeConfig.accent}18 50%,transparent 60%)` }}
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />
      )}

      {backContent ? (
        <FlipCard
          front={<FrontContent />}
          back={<BackContentWrapper />}
          locked={locked}
          onUnlock={onUnlock}
        />
      ) : (
        <FrontContent />
      )}
    </m.div>
  );
}

/* ─────────────────────────────────────────
   오행 뒤집기 카드 preset
───────────────────────────────────────── */
const OHANG_META: Record<OhangElement, { color: string; element: string }> = {
  wood: { color: "#4ade80", element: "🌳" },
  fire: { color: "#f97316", element: "🔥" },
  earth: { color: "#fbbf24", element: "🪨" },
  metal: { color: "#94a3b8", element: "⚔️" },
  water: { color: "#60a5fa", element: "💧" },
};

export function OhangFlipCard({ element, score }: { element: OhangElement; score: number }) {
  const meta = OHANG_META[element];
  const locale = useResolvedLoadingLocale();
  const copy = PREMIUM_FEATURE_CARD_COPY[locale] || PREMIUM_FEATURE_CARD_COPY.ko;
  const ohang = copy.ohang[element] || PREMIUM_FEATURE_CARD_COPY.ko.ohang[element];

  const BackInner = (
    <div className="p-4 flex flex-col justify-center h-full text-center">
      <div className="text-2xl mb-2">🔮</div>
      <div className="text-xs font-bold mb-1" style={{ color: meta.color }}>{copy.strengths}</div>
      <div className="text-[11px] text-violet-200/70 mb-2">{ohang.pos}</div>
      <div className="text-xs font-bold mb-1 text-violet-400/60">{copy.caution}</div>
      <div className="text-[11px] text-violet-300/50 mb-2">{ohang.neg}</div>
      <div className="text-[10px] text-amber-400/50 mt-1 border-t border-violet-700/20 pt-2">
        {ohang.tip}
      </div>
    </div>
  );

  return (
    <PremiumFeatureCard
      title={ohang.label}
      icon={meta.element}
      size="sm"
      theme={element === "fire" ? "teal" : element === "water" ? "violet" : "gold"}
      backContent={BackInner}
      frontContent={
        <div>
          <div className="text-[11px] text-violet-300/50 mb-2">{ohang.pos}</div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <m.div className="h-full rounded-full" style={{ background: meta.color }}
              initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 0.7 }} />
          </div>
          <div className="text-[10px] mt-1" style={{ color: meta.color }}>{score}{copy.scoreSuffix}</div>
        </div>
      }
    />
  );
}
