"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const MOCK_STATE = {
  userCosmicProfile: {
    lagna: {
      sign: "물병자리",
      element: "Air",
      color: "#00BFFF",
      description: "당신의 영혼은 고정된 틀보다는 가능성과 실험을 향해 열려 있습니다.",
    },
    nakshatra: {
      star: "사타비샤",
      rulingPlanet: "Rahu",
      description: "무의식 깊은 곳에서 진실과 치유를 갈망하는 에너지가 흐르고 있습니다.",
    },
  },
  currentDasha: {
    mainPlanet: "Saturn",
    period: "2024 - 2043",
    theme: "카르마의 정화와 인내",
    sadeSati: false,
  },
  chakras: [
    {
      id: "root",
      status: "blocked",
      relatedPlanet: "Mars",
      energyColor: "#FF3B30",
      upaya: "붉은 산호 보석을 왼손 약지에 착용하고, 꾸준히 걷기 운동을 해 주세요.",
    },
    {
      id: "sacral",
      status: "balanced",
      relatedPlanet: "Venus",
      energyColor: "#FF9500",
      upaya: "물과 예술 활동을 통해 감정을 부드럽게 흐르게 해 주세요.",
    },
    {
      id: "solar",
      status: "active",
      relatedPlanet: "Sun",
      energyColor: "#FFD60A",
      upaya: "매일 아침, 가슴을 펴고 햇빛을 3분만 바라보며 호흡하세요.",
    },
    {
      id: "heart",
      status: "blocked",
      relatedPlanet: "Moon",
      energyColor: "#34C759",
      upaya: "감정을 억누르지 말고, 믿을 수 있는 사람과 진심을 나눠 보세요.",
    },
    {
      id: "throat",
      status: "balanced",
      relatedPlanet: "Mercury",
      energyColor: "#0A84FF",
      upaya: "하루에 한 번, 스스로에게 솔직한 편지를 써 보세요.",
    },
    {
      id: "thirdEye",
      status: "active",
      relatedPlanet: "Saturn",
      energyColor: "#5E5CE6",
      upaya: "명상을 통해 하루를 되돌아보고, 배운 점을 조용히 정리해 보세요.",
    },
    {
      id: "crown",
      status: "active",
      relatedPlanet: "Jupiter",
      energyColor: "#E0B0FF",
      upaya: "작은 기부나 봉사를 통해 우주와의 연결감을 느껴 보세요.",
    },
  ],
  destinyInsights: {
    career: "D-10 차트에서 토성이 강하게 작용해, 책임과 구조를 세우는 역할에 천직성이 드러납니다.",
    wealth: "D-2 차트 상 금성과 목성이 조합을 이뤄, 신뢰 기반의 관계에서 재물 운이 열립니다.",
  },
};

const ORBIT_ITEMS = [
  { id: "blueprint", label: "청사진" },
  { id: "timing", label: "타이밍" },
  { id: "relations", label: "인연" },
  { id: "deep", label: "심층 분석" },
  { id: "upaya", label: "개운법" },
] as const;

type OrbitId = (typeof ORBIT_ITEMS)[number]["id"];

export default function VedaMainDashboard() {
  const [selectedOrbit, setSelectedOrbit] = useState<OrbitId>("blueprint");
  const [loading, setLoading] = useState(false);

  const { userCosmicProfile, currentDasha, chakras, destinyInsights } = MOCK_STATE;

  const nebulaStyle = useMemo(() => {
    const base = userCosmicProfile.lagna.color;
    return {
      backgroundImage: `
        radial-gradient(circle at 10% 0%, ${base}33, transparent 55%),
        radial-gradient(circle at 80% 20%, rgba(129,140,248,0.35), transparent 60%),
        radial-gradient(circle at 20% 80%, rgba(236,72,153,0.35), transparent 60%),
        radial-gradient(1200px 900px at 50% 50%, #020617, #020617)
      `,
    };
  }, [userCosmicProfile.lagna.color]);

  const tone = useMemo<"saturn" | "jupiter" | "default">(() => {
    const p = currentDasha.mainPlanet.toLowerCase();
    if (p.includes("saturn")) return "saturn";
    if (p.includes("jupiter")) return "jupiter";
    return "default";
  }, [currentDasha.mainPlanet]);

  const handleOrbitClick = (id: OrbitId) => {
    setLoading(true);
    setSelectedOrbit(id);
    setTimeout(() => setLoading(false), 800);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#020617] text-slate-50">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0" style={nebulaStyle} />
        <div className="absolute inset-0 opacity-55 mix-blend-screen">
          <div className="absolute -inset-[40%] bg-[radial-gradient(1px_1px_at_10%_20%,rgba(248,250,252,0.9),transparent),radial-gradient(1px_1px_at_30%_80%,rgba(148,163,184,0.7),transparent),radial-gradient(1px_1px_at_70%_30%,rgba(226,232,240,0.8),transparent),radial-gradient(1px_1px_at_80%_60%,rgba(148,163,184,0.85),transparent)] animate-[cosmicStars_80s_linear_infinite]" />
        </div>
      </div>

      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-6">
        <header className="mb-6 text-center">
          <p className="text-xs tracking-[0.28em] text-slate-300/80">VEDIC COSMIC ORACLE</p>
          <h1 className="mt-2 text-lg font-semibold tracking-[0.32em] text-slate-100/90">
            우주와 7개의 차크라, 당신의 베다 청사진
          </h1>
        </header>

        <section className="grid w-full max-w-6xl grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <CosmicOrbit
            selected={selectedOrbit}
            onSelect={handleOrbitClick}
            currentDasha={currentDasha}
          />

          <CosmicPanel
            selected={selectedOrbit}
            loading={loading}
            tone={tone}
            profile={userCosmicProfile}
            currentDasha={currentDasha}
            chakras={chakras}
            destinyInsights={destinyInsights}
          />
        </section>
      </main>
    </div>
  );
}

type CosmicOrbitProps = {
  selected: OrbitId;
  onSelect: (id: OrbitId) => void;
  currentDasha: (typeof MOCK_STATE)["currentDasha"];
};

function CosmicOrbit({ selected, onSelect, currentDasha }: CosmicOrbitProps) {
  return (
    <section className="veda-orbit-root">
      <div className="veda-orbit-core">
        <div className="veda-orbit-core-inner" />
        <div className="veda-orbit-core-ring veda-orbit-core-ring--1" />
        <div className="veda-orbit-core-ring veda-orbit-core-ring--2" />
      </div>

      <div className="veda-orbit-ring veda-orbit-ring--inner" />
      <div className="veda-orbit-ring veda-orbit-ring--mid" />
      <div className="veda-orbit-ring veda-orbit-ring--outer" />

      <div className="veda-orbit-orbs">
        {ORBIT_ITEMS.map((item, idx) => {
          const angleDeg = -90 + idx * (360 / ORBIT_ITEMS.length);
          const radiusClass =
            idx % 3 === 0
              ? "veda-orbit-radius-inner"
              : idx % 3 === 1
                ? "veda-orbit-radius-mid"
                : "veda-orbit-radius-outer";

          const isTiming = item.id === "timing";
          const isHighlight =
            isTiming && currentDasha.mainPlanet.toLowerCase().includes("saturn");

          return (
            <motion.button
              key={item.id}
              type="button"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelect(item.id)}
              className={`veda-orbit-orb ${radiusClass}`}
              style={{ "--vedic-angle": `${angleDeg}deg` } as React.CSSProperties}
            >
              <motion.div
                className={`veda-orbit-orb-glow ${
                  isHighlight ? "ring-2 ring-sky-200/80" : ""
                } ${selected === item.id ? "scale-110" : ""}`}
                animate={
                  isHighlight
                    ? { scale: [1, 1.08, 1] }
                    : { scale: selected === item.id ? 1.05 : 1 }
                }
                transition={{
                  duration: isHighlight ? 1.6 : 1.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <div className="veda-orbit-orb-core" />
              </motion.div>
              <span
                className={`veda-orbit-orb-label ${
                  selected === item.id ? "text-sky-100" : "text-slate-300/80"
                }`}
              >
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}

type CosmicPanelProps = {
  selected: OrbitId;
  loading: boolean;
  tone: "saturn" | "jupiter" | "default";
  profile: (typeof MOCK_STATE)["userCosmicProfile"];
  currentDasha: (typeof MOCK_STATE)["currentDasha"];
  chakras: (typeof MOCK_STATE)["chakras"];
  destinyInsights: (typeof MOCK_STATE)["destinyInsights"];
};

function CosmicPanel({
  selected,
  loading,
  tone,
  profile,
  currentDasha,
  chakras,
  destinyInsights,
}: CosmicPanelProps) {
  const cardToneClass =
    tone === "saturn"
      ? "from-slate-900/90 via-indigo-950/85 to-slate-950/95 border-indigo-500/60"
      : tone === "jupiter"
        ? "from-yellow-900/70 via-amber-900/70 to-slate-950/95 border-amber-400/70"
        : "from-slate-900/80 via-slate-900/80 to-slate-950/95 border-slate-500/40";

  const titleGlow =
    tone === "jupiter" ? "shadow-[0_0_30px_rgba(250,250,210,0.5)]" : "";

  return (
    <section className="relative w-full max-w-xl">
      <motion.div
        key={selected}
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -15, scale: 0.98 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={`relative overflow-hidden rounded-3xl border ${cardToneClass} bg-gradient-to-br bg-clip-padding shadow-[0_28px_80px_rgba(15,23,42,0.98)] backdrop-blur-2xl`}
      >
        <div className="pointer-events-none absolute inset-0 opacity-80 mix-blend-screen">
          <div className="absolute -inset-[40%] bg-[conic-gradient(from_200deg_at_50%_0%,rgba(56,189,248,0.22),rgba(14,165,233,0),rgba(244,114,182,0.3),rgba(254,240,138,0.25),rgba(56,189,248,0.3))] blur-3xl" />
        </div>

        <div className="relative space-y-5 px-6 py-6 sm:px-8 sm:py-8">
          <header className="space-y-1">
            <p className="text-[11px] tracking-[0.22em] text-slate-200/85">
              CURRENT DASHA · {currentDasha.mainPlanet} · {currentDasha.period}
            </p>
            <h2
              className={`text-lg font-semibold tracking-[0.2em] text-slate-50 ${titleGlow}`}
            >
              {currentDasha.theme}
            </h2>
          </header>

          {loading ? (
            <LoadingScene />
          ) : (
            <ContentByOrbit
              selected={selected}
              tone={tone}
              profile={profile}
              chakras={chakras}
              destinyInsights={destinyInsights}
            />
          )}
        </div>
      </motion.div>
    </section>
  );
}

function LoadingScene() {
  return (
    <div className="flex min-h-[140px] flex-col items-center justify-center gap-3 text-xs text-slate-200/90">
      <p>당신의 출생 차트를 우주와 동기화하는 중입니다...</p>
      <div className="relative h-16 w-16">
        <motion.div
          className="absolute inset-2 rounded-full border border-sky-300/50"
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_0%,rgba(248,250,252,0.9),transparent_60%),radial-gradient(circle_at_80%_100%,rgba(56,189,248,0.8),transparent_60%)] opacity-70"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}

type ContentByOrbitProps = {
  selected: OrbitId;
  tone: "saturn" | "jupiter" | "default";
  profile: (typeof MOCK_STATE)["userCosmicProfile"];
  chakras: (typeof MOCK_STATE)["chakras"];
  destinyInsights: (typeof MOCK_STATE)["destinyInsights"];
};

function ContentByOrbit({
  selected,
  tone,
  profile,
  chakras,
  destinyInsights,
}: ContentByOrbitProps) {
  const typeSpeed = tone === "saturn" ? 40 : tone === "jupiter" ? 18 : 26;
  const baseText =
    selected === "blueprint"
      ? `당신의 라그나는 ${profile.lagna.sign} 에 속한 Air 에너지입니다.\n\n${profile.lagna.description}\n\n${profile.nakshatra.description}`
      : selected === "timing"
        ? `지금은 별들이 말하는 '타이밍'의 챕터입니다.\n\n중요한 결정은 서두르기보다, 몸과 마음이 동시에 '괜찮다'고 말해 줄 때를 기다려 주세요.`
        : selected === "relations"
          ? `당신의 인연은 '비슷한 길을 걸어온 사람'보다, '서로 다른 길을 존중해 줄 수 있는 사람'에게서 더 깊이 피어날 수 있습니다.`
          : selected === "deep"
            ? `차크라의 상태를 통해, 요즘 당신의 에너지가 어디에 쌓여 있고 어디가 메말라 있는지 살펴봅니다.\n\n아래 차크라 얼라인먼트 패널을 한 줄씩 읽어 내려가며, 지금 가장 마음이 머무는 곳이 어디인지 느껴 보세요.`
            : `오늘의 처방(Upaya)은 거창한 의식이 아니라, 일상에서 마음을 다시 맑게 정돈해 주는 작은 루틴에 가깝습니다.\n\n지금 마음에 남는 문장을 하나 골라, 오늘 하루에 꼭 한 번만 실천해 보세요.`;

  return (
    <div className="space-y-5">
      <TypewriterText text={baseText} speedMs={typeSpeed} tone={tone} />
      {selected === "deep" && <ChakraColumn chakras={chakras} />}
      {selected === "upaya" && <UpayaList chakras={chakras} />}
      {selected === "blueprint" && (
        <div className="mt-2 rounded-2xl bg-slate-900/70 px-4 py-3 text-xs text-slate-200/95">
          <p>
            커리어: {destinyInsights.career}
            <br />
            재물운: {destinyInsights.wealth}
          </p>
        </div>
      )}
    </div>
  );
}

function ChakraColumn({ chakras }: { chakras: typeof MOCK_STATE.chakras }) {
  return (
    <div className="mt-2 flex flex-col items-center gap-2">
      {chakras.map((c) => {
        const isBlocked = c.status === "blocked";
        const isActive = c.status === "active";

        return (
          <motion.div
            key={c.id}
            className="flex w-full max-w-xs items-center gap-3 rounded-full bg-slate-950/60 px-3 py-1.5"
          >
            <motion.div
              className="h-7 w-7 rounded-full"
              style={{ background: `radial-gradient(circle at 30% 0%,#fff,${c.energyColor})` }}
              animate={
                isBlocked
                  ? { rotate: [0, -8, 0] }
                  : isActive
                    ? { rotate: [0, 12, 0] }
                    : { rotate: 0 }
              }
              transition={{
                duration: isBlocked ? 6 : isActive ? 3 : 0,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <div className="flex-1 text-[11px] leading-snug text-slate-200/90">
              <p className="font-semibold capitalize">
                {c.id} chakra · {c.relatedPlanet}
              </p>
              <p className="text-[10px] text-slate-300/90">
                상태:{" "}
                {c.status === "blocked"
                  ? "에너지가 막혀 있음"
                  : c.status === "active"
                    ? "활성화"
                    : "안정적"}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function UpayaList({ chakras }: { chakras: typeof MOCK_STATE.chakras }) {
  return (
    <div className="mt-2 grid gap-2 text-xs text-slate-100/95 sm:grid-cols-2">
      {chakras.map((c) => (
        <div
          key={c.id}
          className="rounded-2xl bg-slate-950/60 px-3 py-2 shadow-[0_0_18px_rgba(148,163,184,0.4)]"
        >
          <p className="mb-1 text-[11px] font-semibold capitalize">
            {c.id} chakra · {c.relatedPlanet}
          </p>
          <p className="text-[10px] leading-relaxed text-slate-200/90">{c.upaya}</p>
        </div>
      ))}
    </div>
  );
}

type TypewriterProps = {
  text: string;
  speedMs: number;
  tone: "saturn" | "jupiter" | "default";
};

function TypewriterText({ text, speedMs, tone }: TypewriterProps) {
  const [visible, setVisible] = useState("");

  useEffect(() => {
    let i = 0;
    setVisible("");
    const id = window.setInterval(() => {
      i += 1;
      setVisible(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, speedMs);
    return () => window.clearInterval(id);
  }, [text, speedMs]);

  const glowClass =
    tone === "jupiter"
      ? "shadow-[0_0_18px_rgba(250,250,210,0.5)]"
      : tone === "saturn"
        ? "shadow-[0_0_12px_rgba(79,70,229,0.5)]"
        : "";

  return (
    <p
      className={`whitespace-pre-line text-sm leading-relaxed text-slate-100/95 ${glowClass}`}
    >
      {visible}
      <span className="ml-0.5 inline-block h-4 w-[1px] translate-y-[2px] bg-sky-200/80 align-middle animate-pulse" />
    </p>
  );
}

