"use client";

import { useEffect, useMemo, useState } from "react";
import { Gem, Heart, Orbit, Sparkles, Star } from "lucide-react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

const orbitronClassName = "[font-family:'Orbitron','Rajdhani','Arial_Narrow',system-ui,sans-serif]";
const notoKrClassName = "[font-family:'Noto_Sans_KR','Apple_SD_Gothic_Neo','Malgun_Gothic',system-ui,sans-serif]";

const DESTINY_BIAS_STAGE_TEXT_TRANSLATIONS = {
  ko: {
    sideEyebrow: "당신의 운명 속",
    sideTitle: "✨ 최애를 만나는 순간 ✨",
    loading: "DESTINY LOADING...",
    fanLabel: "FAN",
    idolLabel: "IDOL",
    heroBadge: "⭐ 내 안의 운명 ✨ 최애와 연결되는 시간 ⭐",
    heroTitle: "최애운명",
    heroSubtitle: "✦ My Destiny Bias ✦",
    featureHeading: "내 사주 에너지가 최애에게 닿는 방식",
    favoriteAnalysisTitle: "최애 성향 분석",
    favoriteAnalysisSubtitle: "Heart Gem Reading",
    matchTitle: "운명 궁합 매칭",
    matchSubtitle: "Stellar Match Signal",
    reportTitle: "에너지 연결 리포트",
    reportSubtitle: "Cosmic Orbit Report",
  },
  en: {
    sideEyebrow: "Inside your destiny",
    sideTitle: "✨ The moment you meet your bias ✨",
    loading: "DESTINY LOADING...",
    fanLabel: "FAN",
    idolLabel: "IDOL",
    heroBadge: "⭐ Inner Destiny ✨ Time to connect with your bias ⭐",
    heroTitle: "Bias Destiny",
    heroSubtitle: "✦ My Destiny Bias ✦",
    featureHeading: "How your Saju energy reaches your bias",
    favoriteAnalysisTitle: "Bias Personality Reading",
    favoriteAnalysisSubtitle: "Heart Gem Reading",
    matchTitle: "Destiny Match Signal",
    matchSubtitle: "Stellar Match Signal",
    reportTitle: "Energy Connection Report",
    reportSubtitle: "Cosmic Orbit Report",
  },
  ja: {
    sideEyebrow: "あなたの運命の中で",
    sideTitle: "✨ 推しに出会う瞬間 ✨",
    loading: "DESTINY LOADING...",
    fanLabel: "FAN",
    idolLabel: "IDOL",
    heroBadge: "⭐ 内なる運命 ✨ 推しとつながる時間 ⭐",
    heroTitle: "推し運命",
    heroSubtitle: "✦ My Destiny Bias ✦",
    featureHeading: "あなたの四柱エネルギーが推しへ届く方式",
    favoriteAnalysisTitle: "推し性向分析",
    favoriteAnalysisSubtitle: "Heart Gem Reading",
    matchTitle: "運命相性マッチング",
    matchSubtitle: "Stellar Match Signal",
    reportTitle: "エネルギー接続レポート",
    reportSubtitle: "Cosmic Orbit Report",
  },
  "zh-CN": {
    sideEyebrow: "在你的命运之中",
    sideTitle: "✨ 遇见本命的瞬间 ✨",
    loading: "DESTINY LOADING...",
    fanLabel: "FAN",
    idolLabel: "IDOL",
    heroBadge: "⭐ 我心中的命运 ✨ 与本命连接的时间 ⭐",
    heroTitle: "本命命运",
    heroSubtitle: "✦ My Destiny Bias ✦",
    featureHeading: "你的四柱能量触达本命的方式",
    favoriteAnalysisTitle: "本命性格分析",
    favoriteAnalysisSubtitle: "Heart Gem Reading",
    matchTitle: "命运合盘匹配",
    matchSubtitle: "Stellar Match Signal",
    reportTitle: "能量连接报告",
    reportSubtitle: "Cosmic Orbit Report",
  },
  "zh-TW": {
    sideEyebrow: "在你的命運之中",
    sideTitle: "✨ 遇見本命的瞬間 ✨",
    loading: "DESTINY LOADING...",
    fanLabel: "FAN",
    idolLabel: "IDOL",
    heroBadge: "⭐ 我心中的命運 ✨ 與本命連結的時間 ⭐",
    heroTitle: "本命命運",
    heroSubtitle: "✦ My Destiny Bias ✦",
    featureHeading: "你的四柱能量觸達本命的方式",
    favoriteAnalysisTitle: "本命性格分析",
    favoriteAnalysisSubtitle: "Heart Gem Reading",
    matchTitle: "命運合盤匹配",
    matchSubtitle: "Stellar Match Signal",
    reportTitle: "能量連結報告",
    reportSubtitle: "Cosmic Orbit Report",
  },
} as const;

function getDestinyBiasStageCopy(locale: LoadingLocale) {
  if (locale === "en" || locale === "ja" || locale === "zh-CN" || locale === "zh-TW") {
    return DESTINY_BIAS_STAGE_TEXT_TRANSLATIONS[locale];
  }
  return DESTINY_BIAS_STAGE_TEXT_TRANSLATIONS.ko;
}

export default function DestinyBiasStagePage() {
  const [progress, setProgress] = useState(0);
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const copy = getDestinyBiasStageCopy(locale);

  useEffect(() => {
    const id = window.setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 0 : prev + 1));
    }, 38);

    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    return () => window.removeEventListener("cd:locale-ready", syncLocale);
  }, []);

  const stars = useMemo(
    () =>
      Array.from({ length: 34 }, (_, idx) => ({
        id: idx,
        left: `${(idx * 23 + 11) % 100}%`,
        top: `${(idx * 17 + 7) % 100}%`,
        size: idx % 3 === 0 ? 3 : idx % 2 === 0 ? 2 : 1.6,
        duration: 1.7 + (idx % 6) * 0.33,
        delay: (idx % 7) * 0.19,
      })),
    []
  );

  const features = [
    {
      title: copy.favoriteAnalysisTitle,
      subtitle: copy.favoriteAnalysisSubtitle,
      icon: Gem,
      gradient: "from-pink-400 via-fuchsia-400 to-violet-400",
      glow: "shadow-[0_0_30px_rgba(236,72,153,0.58)]",
    },
    {
      title: copy.matchTitle,
      subtitle: copy.matchSubtitle,
      icon: Star,
      gradient: "from-violet-400 via-purple-400 to-indigo-400",
      glow: "shadow-[0_0_30px_rgba(167,139,250,0.58)]",
    },
    {
      title: copy.reportTitle,
      subtitle: copy.reportSubtitle,
      icon: Orbit,
      gradient: "from-cyan-400 via-sky-400 to-indigo-400",
      glow: "shadow-[0_0_30px_rgba(34,211,238,0.58)]",
    },
  ];

  return (
    <div className={`relative min-h-screen overflow-hidden bg-slate-950 text-white ${notoKrClassName}`}>
      <style jsx global>{`
        @keyframes db-stage-ray-a {
          0%, 100% { transform: translateX(0) rotate(16deg); opacity: 0.35; }
          35% { transform: translateX(16px) rotate(16deg); opacity: 0.92; }
          70% { transform: translateX(-8px) rotate(16deg); opacity: 0.45; }
        }
        @keyframes db-stage-ray-b {
          0%, 100% { transform: translateX(0) rotate(-19deg); opacity: 0.34; }
          35% { transform: translateX(-18px) rotate(-19deg); opacity: 0.96; }
          70% { transform: translateX(10px) rotate(-19deg); opacity: 0.5; }
        }
        @keyframes db-stage-star {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.25); }
        }
        @keyframes db-stage-fade-up {
          from { opacity: 0; transform: translateY(24px); filter: blur(8px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        @keyframes db-stage-float-a {
          0%, 100% { transform: translateY(0) rotate(0); }
          50% { transform: translateY(-6px) rotate(-7deg); }
        }
        @keyframes db-stage-float-b {
          0%, 100% { transform: translateY(0) rotate(0); }
          50% { transform: translateY(-7px) rotate(9deg); }
        }
        @keyframes db-stage-float-c {
          0%, 100% { transform: translateY(0) rotate(0); }
          50% { transform: translateY(-6px) rotate(7deg); }
        }
        @keyframes db-stage-orb-a {
          0%, 100% { transform: translate(0, 0); opacity: 0.38; }
          50% { transform: translate(-16px, 12px); opacity: 0.82; }
        }
        @keyframes db-stage-orb-b {
          0%, 100% { transform: translate(0, 0); opacity: 0.33; }
          50% { transform: translate(18px, 8px); opacity: 0.75; }
        }
        @keyframes db-stage-card-a {
          0%, 100% { transform: translateY(0) rotate(0); }
          50% { transform: translateY(-15px) rotate(-1.5deg); }
        }
        @keyframes db-stage-card-b {
          0%, 100% { transform: translateY(0) rotate(0); }
          50% { transform: translateY(-13px) rotate(1.3deg); }
        }
        @keyframes db-stage-ring {
          0%, 100% { box-shadow: 0 0 18px rgba(236,72,153,.35), inset 0 0 18px rgba(59,130,246,.18); }
          50% { box-shadow: 0 0 34px rgba(236,72,153,.6), inset 0 0 26px rgba(59,130,246,.3); }
        }
        @keyframes db-stage-pulse {
          0%, 100% { opacity: 0.72; }
          50% { opacity: 1; }
        }
        @keyframes db-stage-title {
          0%, 100% { opacity: 1; }
          35% { opacity: 0.86; }
          70% { opacity: 0.9; }
        }
        @keyframes db-stage-feature {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .db-stage-ray-a { animation: db-stage-ray-a 5.2s ease-in-out infinite; }
        .db-stage-ray-b { animation: db-stage-ray-b 5.5s ease-in-out infinite; }
        .db-stage-shell { animation: db-stage-pulse .01s linear 1 both; }
        .db-stage-child { animation: db-stage-fade-up .75s cubic-bezier(.22,1,.36,1) both; }
        .db-stage-d1 { animation-delay: .2s; }
        .db-stage-d2 { animation-delay: .35s; }
        .db-stage-d3 { animation-delay: .5s; }
        .db-stage-float-a { animation: db-stage-float-a 2.2s ease-in-out infinite; }
        .db-stage-float-b { animation: db-stage-float-b 1.9s ease-in-out infinite; }
        .db-stage-float-c { animation: db-stage-float-c 2.1s ease-in-out .16s infinite; }
        .db-stage-orb-a { animation: db-stage-orb-a 5.3s ease-in-out infinite; }
        .db-stage-orb-b { animation: db-stage-orb-b 5.1s ease-in-out infinite; }
        .db-stage-card-a { animation: db-stage-card-a 3.3s ease-in-out infinite; }
        .db-stage-card-b { animation: db-stage-card-b 3.1s ease-in-out .34s infinite; }
        .db-stage-ring { animation: db-stage-ring 2.7s ease-in-out infinite; }
        .db-stage-pulse { animation: db-stage-pulse 1.9s ease-in-out infinite; }
        .db-stage-pulse-soft { animation: db-stage-pulse 2.1s ease-in-out infinite; }
        .db-stage-title { animation: db-stage-title 2.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .db-stage-ray-a,
          .db-stage-ray-b,
          .db-stage-child,
          .db-stage-float-a,
          .db-stage-float-b,
          .db-stage-float-c,
          .db-stage-orb-a,
          .db-stage-orb-b,
          .db-stage-card-a,
          .db-stage-card-b,
          .db-stage-ring,
          .db-stage-pulse,
          .db-stage-pulse-soft,
          .db-stage-title {
            animation: none !important;
          }
        }
      `}</style>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-900/80 via-purple-900/75 to-fuchsia-900/80" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(236,72,153,.34),transparent_35%),radial-gradient(circle_at_82%_16%,rgba(56,189,248,.28),transparent_38%),radial-gradient(circle_at_50%_84%,rgba(192,132,252,.25),transparent_42%)]" />

      <div className="db-stage-ray-a pointer-events-none absolute -left-20 top-20 h-[2px] w-[42rem] bg-gradient-to-r from-transparent via-fuchsia-300/80 to-transparent blur-[1px]" />
      <div className="db-stage-ray-b pointer-events-none absolute -right-28 top-44 h-[2px] w-[38rem] bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent blur-[1px]" />

      {stars.map((star) => (
        <div
          key={star.id}
          className="pointer-events-none absolute rounded-full bg-white/90"
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            animation: `db-stage-star ${star.duration}s ease-in-out ${star.delay}s infinite`,
          }}
        />
      ))}

      <main
        className="db-stage-shell relative z-10 mx-auto grid min-h-screen w-full max-w-[1520px] grid-cols-1 gap-8 px-5 py-8 sm:px-7 lg:grid-cols-[320px_1fr_560px] lg:px-10"
      >
        <section
          className="db-stage-child db-stage-d1 self-start rounded-3xl border border-purple-400/50 bg-black/40 p-5 backdrop-blur-md shadow-[0_0_15px_rgba(192,132,252,0.5)]"
        >
          <p className="text-xs tracking-[0.22em] text-purple-100/85">{copy.sideEyebrow}</p>
          <p className="mt-1 text-sm font-semibold text-pink-200">{copy.sideTitle}</p>

          <div className="mt-6 flex items-center justify-center gap-4">
            <div className="db-stage-float-a">
              <Heart className="h-6 w-6 fill-pink-400 text-pink-300 drop-shadow-[0_0_12px_rgba(244,114,182,0.95)]" />
            </div>
            <div className="db-stage-float-b">
              <Star className="h-7 w-7 fill-violet-300 text-violet-200 drop-shadow-[0_0_14px_rgba(167,139,250,0.95)]" />
            </div>
            <div className="db-stage-float-c">
              <Heart className="h-6 w-6 fill-pink-400 text-pink-300 drop-shadow-[0_0_12px_rgba(244,114,182,0.95)]" />
            </div>
          </div>

          <div className="mt-7">
            <p
              className={`db-stage-pulse mb-2 text-[11px] tracking-[0.24em] text-fuchsia-200/90 ${orbitronClassName}`}
            >
              {copy.loading}
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-white/10 ring-1 ring-purple-300/35">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-300 shadow-[0_0_20px_rgba(236,72,153,0.86)]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 text-right text-xs font-semibold text-cyan-200/90">{progress}%</div>
          </div>
        </section>

        <section
          className="db-stage-child db-stage-d2 relative flex min-h-[430px] items-end justify-center"
        >
          <div className="db-stage-orb-a absolute left-1/2 top-8 h-40 w-40 -translate-x-[112%] rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="db-stage-orb-b absolute left-1/2 top-6 h-44 w-44 translate-x-[20%] rounded-full bg-cyan-500/20 blur-3xl" />

          <div
            className="db-stage-card-a absolute bottom-28 left-[34%] flex h-44 w-32 items-center justify-center rounded-[2rem] border border-pink-300/45 bg-black/35 backdrop-blur-sm shadow-[0_0_28px_rgba(236,72,153,0.45)]"
          >
            <div className="absolute -bottom-5 h-5 w-20 rounded-full bg-pink-300/30 blur-md" />
            <div className="text-center">
              <Sparkles className="mx-auto h-6 w-6 text-pink-200 drop-shadow-[0_0_12px_rgba(244,114,182,0.96)]" />
              <p className="mt-2 text-xs tracking-wide text-pink-100/90">{copy.idolLabel}</p>
            </div>
          </div>

          <div
            className="db-stage-card-b absolute bottom-24 right-[32%] flex h-40 w-28 items-center justify-center rounded-[2rem] border border-cyan-300/45 bg-black/35 backdrop-blur-sm shadow-[0_0_28px_rgba(34,211,238,0.42)]"
          >
            <div className="absolute -bottom-5 h-5 w-20 rounded-full bg-cyan-300/30 blur-md" />
            <div className="text-center">
              <Sparkles className="mx-auto h-6 w-6 text-cyan-100 drop-shadow-[0_0_12px_rgba(34,211,238,0.96)]" />
              <p className="mt-2 text-xs tracking-wide text-cyan-100/90">{copy.fanLabel}</p>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-7 left-1/2 h-40 w-[88%] -translate-x-1/2 [perspective:1000px]">
            <div className="db-stage-ring absolute inset-0 rounded-[100%] border border-fuchsia-300/35 bg-gradient-to-r from-fuchsia-500/25 via-purple-500/20 to-cyan-400/25 [transform:rotateX(70deg)]" />
            <div className="absolute inset-x-[11%] bottom-2 h-7 rounded-full bg-fuchsia-300/20 blur-xl [transform:rotateX(70deg)]" />
          </div>
        </section>

        <section className="db-stage-child db-stage-d3 self-center">
          <div
            className="db-stage-pulse-soft inline-flex items-center gap-2 rounded-full border border-purple-300/45 bg-black/30 px-5 py-2 text-xs tracking-wide text-purple-100 backdrop-blur-md shadow-[0_0_14px_rgba(192,132,252,0.45)]"
          >
            <Star className="h-4 w-4 fill-yellow-300 text-yellow-200" />
            {copy.heroBadge}
          </div>

          <div className="mt-5">
            <h1
              className={`db-stage-title text-6xl font-black leading-none tracking-tight sm:text-7xl lg:text-8xl ${orbitronClassName} bg-gradient-to-b from-pink-300 via-purple-400 to-indigo-500 bg-clip-text text-transparent drop-shadow-[0_0_28px_rgba(236,72,153,0.74)]`}
            >
              {copy.heroTitle}
            </h1>
            <p className="mt-3 text-lg font-medium tracking-[0.28em] text-purple-100/90 drop-shadow-[0_0_12px_rgba(167,139,250,.9)]">
              {copy.heroSubtitle}
            </p>
          </div>

          <div
            className="mt-8 rounded-3xl border border-purple-400/50 bg-purple-950/50 p-5 backdrop-blur-md shadow-[0_0_15px_rgba(192,132,252,0.5)]"
          >
            <div className="mb-5 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-fuchsia-200 drop-shadow-[0_0_10px_rgba(236,72,153,.94)]" />
              <h2 className="text-sm font-semibold tracking-[0.08em] text-fuchsia-100">
                {copy.featureHeading}
              </h2>
            </div>

            <div className="grid grid-cols-1 divide-y divide-purple-300/20 rounded-2xl border border-white/10 bg-black/25 md:grid-cols-3 md:divide-x md:divide-y-0">
              {features.map((feature, idx) => {
                const Icon = feature.icon;

                return (
                  <div
                    key={feature.title}
                    className="relative px-4 py-6 text-center"
                    style={{
                      animation: `db-stage-feature ${2.35 + idx * 0.35}s ease-in-out ${idx * 0.2}s infinite`,
                    }}
                  >
                    <div
                      className={`relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.gradient} ${feature.glow}`}
                    >
                      <Icon className="h-8 w-8 text-white" />
                      <div className="absolute -bottom-3 h-3 w-10 rounded-full bg-white/30 blur-md" />
                    </div>
                    <p className="text-sm font-semibold text-purple-50">{feature.title}</p>
                    <p className="mt-1 text-[11px] tracking-wide text-purple-200/70">{feature.subtitle}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
