"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Gem, Heart, Orbit, Sparkles, Star } from "lucide-react";
import stageStyles from "./stage.module.css";

type LoadingLocale = "ko" | "en" | "ja" | "zh-CN" | "zh-TW" | "vi" | "es" | "fr" | "de";

const orbitronClassName = "[font-family:'Orbitron','Rajdhani','Arial_Narrow',system-ui,sans-serif]";
const notoKrClassName = "[font-family:'Noto_Sans_KR','Apple_SD_Gothic_Neo','Malgun_Gothic',system-ui,sans-serif]";

function normalizeStageLocale(value?: string | null): LoadingLocale {
  const locale = (value || "").toLowerCase();
  if (locale.startsWith("en")) return "en";
  if (locale.startsWith("ja") || locale.startsWith("jp")) return "ja";
  if (locale.startsWith("zh-tw") || locale.startsWith("zh-hant") || locale.includes("traditional")) return "zh-TW";
  if (locale.startsWith("zh")) return "zh-CN";
  if (locale.startsWith("vi")) return "vi";
  if (locale.startsWith("es")) return "es";
  if (locale.startsWith("fr")) return "fr";
  if (locale.startsWith("de")) return "de";
  return "ko";
}

function getCurrentStageLocale(): LoadingLocale {
  if (typeof window === "undefined") return "ko";
  const runtimeLanguage = (window as typeof window & { cdGetCurrentLanguage?: () => string }).cdGetCurrentLanguage?.();
  if (runtimeLanguage) return normalizeStageLocale(runtimeLanguage);
  try {
    const stored = window.localStorage.getItem("cd_locale") || window.localStorage.getItem("code-destiny-locale");
    if (stored) return normalizeStageLocale(stored);
  } catch (_) {}
  return normalizeStageLocale(document.documentElement.lang || navigator.language);
}

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

function StageProgressMeter({ loading }: { loading: string }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const advance = () => {
      if (document.hidden) return;
      setProgress((prev) => (prev >= 100 ? 0 : Math.min(100, prev + 4)));
    };
    const id = window.setInterval(advance, 140);
    document.addEventListener("visibilitychange", advance);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", advance);
    };
  }, []);

  return (
    <div className="mt-7">
      <p className={`${stageStyles.pulse} mb-2 text-[11px] tracking-[0.24em] text-fuchsia-200/90 ${orbitronClassName}`}>
        {loading}
      </p>
      <div className="h-2 overflow-hidden rounded-full bg-white/10 ring-1 ring-purple-300/35">
        <div
          className="h-full rounded-full bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-300 shadow-[0_0_20px_rgba(236,72,153,0.86)]"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2 text-right text-xs font-semibold text-cyan-200/90">{progress}%</div>
    </div>
  );
}

export default function DestinyBiasStagePage() {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentStageLocale());
  const copy = getDestinyBiasStageCopy(locale);

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentStageLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    window.addEventListener("storage", syncLocale);
    return () => {
      window.removeEventListener("cd:locale-ready", syncLocale);
      window.removeEventListener("storage", syncLocale);
    };
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
    <div className={`relative min-h-[100dvh] overflow-hidden bg-slate-950 text-white ${notoKrClassName}`}>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-900/80 via-purple-900/75 to-fuchsia-900/80" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(236,72,153,.34),transparent_35%),radial-gradient(circle_at_82%_16%,rgba(56,189,248,.28),transparent_38%),radial-gradient(circle_at_50%_84%,rgba(192,132,252,.25),transparent_42%)]" />

      <div className={`${stageStyles.rayA} pointer-events-none absolute -left-20 top-20 h-[2px] w-[42rem] bg-gradient-to-r from-transparent via-fuchsia-300/80 to-transparent blur-[1px]`} />
      <div className={`${stageStyles.rayB} pointer-events-none absolute -right-28 top-44 h-[2px] w-[38rem] bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent blur-[1px]`} />

      {stars.map((star) => (
        <div
          key={star.id}
          className={`${stageStyles.star} pointer-events-none absolute rounded-full bg-white/90`}
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            "--stage-star-duration": `${star.duration}s`,
            "--stage-star-delay": `${star.delay}s`,
          } as CSSProperties}
        />
      ))}

      <main
        className={`${stageStyles.shell} relative z-10 mx-auto grid min-h-[100dvh] w-full max-w-[1520px] grid-cols-1 gap-8 px-5 py-8 sm:px-7 lg:grid-cols-[320px_1fr_560px] lg:px-10`}
      >
        <section
          className={`${stageStyles.panel} ${stageStyles.child} ${stageStyles.d1} self-start rounded-3xl border border-purple-400/50 bg-black/40 p-5 backdrop-blur-md shadow-[0_0_15px_rgba(192,132,252,0.5)]`}
        >
          <p className="text-xs tracking-[0.22em] text-purple-100/85">{copy.sideEyebrow}</p>
          <p className="mt-1 text-sm font-semibold text-pink-200">{copy.sideTitle}</p>

          <div className="mt-6 flex items-center justify-center gap-4">
            <div className={stageStyles.floatA}>
              <Heart className="h-6 w-6 fill-pink-400 text-pink-300 drop-shadow-[0_0_12px_rgba(244,114,182,0.95)]" />
            </div>
            <div className={stageStyles.floatB}>
              <Star className="h-7 w-7 fill-violet-300 text-violet-200 drop-shadow-[0_0_14px_rgba(167,139,250,0.95)]" />
            </div>
            <div className={stageStyles.floatC}>
              <Heart className="h-6 w-6 fill-pink-400 text-pink-300 drop-shadow-[0_0_12px_rgba(244,114,182,0.95)]" />
            </div>
          </div>

          <StageProgressMeter loading={copy.loading} />
        </section>

        <section
          className={`${stageStyles.child} ${stageStyles.d2} relative flex min-h-[430px] items-end justify-center`}
        >
          <div className={`${stageStyles.orbA} absolute left-1/2 top-8 h-40 w-40 -translate-x-[112%] rounded-full bg-fuchsia-500/20 blur-3xl`} />
          <div className={`${stageStyles.orbB} absolute left-1/2 top-6 h-44 w-44 translate-x-[20%] rounded-full bg-cyan-500/20 blur-3xl`} />

          <div
            className={`${stageStyles.cardA} absolute bottom-28 left-[34%] flex h-44 w-32 items-center justify-center rounded-[2rem] border border-pink-300/45 bg-black/35 backdrop-blur-sm shadow-[0_0_28px_rgba(236,72,153,0.45)]`}
          >
            <div className="absolute -bottom-5 h-5 w-20 rounded-full bg-pink-300/30 blur-md" />
            <div className="text-center">
              <Sparkles className="mx-auto h-6 w-6 text-pink-200 drop-shadow-[0_0_12px_rgba(244,114,182,0.96)]" />
              <p className="mt-2 text-xs tracking-wide text-pink-100/90">{copy.idolLabel}</p>
            </div>
          </div>

          <div
            className={`${stageStyles.cardB} absolute bottom-24 right-[32%] flex h-40 w-28 items-center justify-center rounded-[2rem] border border-cyan-300/45 bg-black/35 backdrop-blur-sm shadow-[0_0_28px_rgba(34,211,238,0.42)]`}
          >
            <div className="absolute -bottom-5 h-5 w-20 rounded-full bg-cyan-300/30 blur-md" />
            <div className="text-center">
              <Sparkles className="mx-auto h-6 w-6 text-cyan-100 drop-shadow-[0_0_12px_rgba(34,211,238,0.96)]" />
              <p className="mt-2 text-xs tracking-wide text-cyan-100/90">{copy.fanLabel}</p>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-7 left-1/2 h-40 w-[88%] -translate-x-1/2 [perspective:1000px]">
            <div className={`${stageStyles.ring} absolute inset-0 rounded-[100%] border border-fuchsia-300/35 bg-gradient-to-r from-fuchsia-500/25 via-purple-500/20 to-cyan-400/25 [transform:rotateX(70deg)]`} />
            <div className="absolute inset-x-[11%] bottom-2 h-7 rounded-full bg-fuchsia-300/20 blur-xl [transform:rotateX(70deg)]" />
          </div>
        </section>

        <section className={`${stageStyles.child} ${stageStyles.d3} self-center`}>
          <div
            className={`${stageStyles.panel} ${stageStyles.pulseSoft} inline-flex items-center gap-2 rounded-full border border-purple-300/45 bg-black/30 px-5 py-2 text-xs tracking-wide text-purple-100 backdrop-blur-md shadow-[0_0_14px_rgba(192,132,252,0.45)]`}
          >
            <Star className="h-4 w-4 fill-yellow-300 text-yellow-200" />
            {copy.heroBadge}
          </div>

          <div className="mt-5">
            <h1
              className={`${stageStyles.title} text-6xl font-black leading-none tracking-tight sm:text-7xl lg:text-8xl ${orbitronClassName} bg-gradient-to-b from-pink-300 via-purple-400 to-indigo-500 bg-clip-text text-transparent drop-shadow-[0_0_28px_rgba(236,72,153,0.74)]`}
            >
              {copy.heroTitle}
            </h1>
            <p className="mt-3 text-lg font-medium tracking-[0.28em] text-purple-100/90 drop-shadow-[0_0_12px_rgba(167,139,250,.9)]">
              {copy.heroSubtitle}
            </p>
          </div>

          <div
            className={`${stageStyles.panel} mt-8 rounded-3xl border border-purple-400/50 bg-purple-950/50 p-5 backdrop-blur-md shadow-[0_0_15px_rgba(192,132,252,0.5)]`}
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
                    className={`${stageStyles.featureCard} relative px-4 py-6 text-center`}
                    style={{
                      "--stage-feature-duration": `${2.35 + idx * 0.35}s`,
                      "--stage-feature-delay": `${idx * 0.2}s`,
                    } as CSSProperties}
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
