"use client";

import dynamic from "next/dynamic";

const MUSIC_ROUTE_LOCALES = ["ko", "en", "ja", "zh-CN", "zh-TW", "vi", "hi", "es", "fr", "de", "nl", "ms"] as const;
type LoadingLocale = (typeof MUSIC_ROUTE_LOCALES)[number];

function normalizeMusicRouteLocale(value?: string | null): LoadingLocale {
  const raw = String(value || "").trim();
  if (!raw) return "ko";
  const normalized = raw.replace("_", "-").toLowerCase();
  if (normalized === "zh" || normalized === "zh-cn" || normalized === "zh-hans" || normalized === "cn") return "zh-CN";
  if (normalized === "zh-tw" || normalized === "zh-hant" || normalized === "tw") return "zh-TW";
  const base = normalized.split("-")[0];
  return MUSIC_ROUTE_LOCALES.includes(base as LoadingLocale) ? (base as LoadingLocale) : "ko";
}

function getCurrentMusicRouteLocale(): LoadingLocale {
  if (typeof window === "undefined") return "ko";
  const runtimeLanguage = (window as typeof window & { __cdCurrentLang?: string }).__cdCurrentLang;
  if (runtimeLanguage) return normalizeMusicRouteLocale(runtimeLanguage);
  try {
    const stored =
      window.localStorage.getItem("cd_locale") ||
      window.localStorage.getItem("code-destiny-locale") ||
      window.localStorage.getItem("cd_lang") ||
      window.localStorage.getItem("locale");
    if (stored) return normalizeMusicRouteLocale(stored);
  } catch {}
  return normalizeMusicRouteLocale(document.documentElement.lang || navigator.language);
}

const ROUTE_FALLBACK_COPY: Record<LoadingLocale, string> = {
  ko: "달빛 음악실을 여는 중입니다.",
  en: "Opening the moonlit music room…",
  ja: "月明かりの音楽室を開いています…",
  "zh-CN": "正在打开月光音乐室…",
  "zh-TW": "正在開啟月光音樂室…",
  vi: "Đang mở phòng nhạc ánh trăng…",
  hi: "चांदनी संगीत कक्ष खोला जा रहा है…",
  es: "Abriendo la sala de música a la luz de la luna…",
  fr: "Ouverture de la salle de musique au clair de lune…",
  de: "Der Mondlicht-Musikraum wird geöffnet…",
  nl: "De maanlicht-muziekkamer wordt geopend…",
  ms: "Membuka bilik muzik cahaya bulan…",
};

function MusicRouteFallback() {
  return (
    <main aria-busy="true" className="cdMusicFallback">
      <style>{`
        .cdMusicFallback{min-height:100dvh;display:grid;place-items:center;padding:32px 18px;
          color:#f4e8ff;position:relative;overflow:hidden;
          background:radial-gradient(ellipse 70% 55% at 72% 22%,rgba(196,181,253,.16),transparent 62%),linear-gradient(180deg,#080615 0%,#120b24 58%,#06050f 100%)}
        .cdMusicFallback__inner{position:relative;z-index:1;display:grid;justify-items:center;gap:22px;text-align:center}
        .cdMusicFallback__moon{position:relative;width:72px;height:72px;border-radius:50%;
          background:radial-gradient(circle at 38% 32%,#fdf6df,#e8d5a3 46%,#b79a5e 100%);
          box-shadow:0 0 40px -4px rgba(196,181,253,.5),0 0 90px -18px rgba(147,51,234,.35),inset -14px -6px 0 -2px rgba(12,9,28,.55);
          animation:cdMusicMoonFloat 6s ease-in-out infinite}
        .cdMusicFallback__moon::before,.cdMusicFallback__moon::after{content:"";position:absolute;border-radius:50%;background:#f4eeff;box-shadow:0 0 6px rgba(196,181,253,.9)}
        .cdMusicFallback__moon::before{width:4px;height:4px;top:-14px;left:-20px;animation:cdMusicTwinkle 2.6s ease-in-out infinite}
        .cdMusicFallback__moon::after{width:3px;height:3px;bottom:-8px;right:-22px;animation:cdMusicTwinkle 3.2s ease-in-out .6s infinite}
        .cdMusicFallback__eq{display:flex;align-items:flex-end;gap:5px;height:26px}
        .cdMusicFallback__eq span{width:5px;height:8px;border-radius:3px;background:linear-gradient(180deg,#c4b5fd,#a78bfa);animation:cdMusicEq 1s ease-in-out infinite}
        .cdMusicFallback__eq span:nth-child(2){animation-delay:.15s}
        .cdMusicFallback__eq span:nth-child(3){animation-delay:.3s}
        .cdMusicFallback__eq span:nth-child(4){animation-delay:.45s}
        .cdMusicFallback__eq span:nth-child(5){animation-delay:.6s}
        .cdMusicFallback__text{margin:0;font-size:14px;font-weight:800;letter-spacing:.01em;color:#e9e0ff}
        @keyframes cdMusicMoonFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        @keyframes cdMusicTwinkle{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.4)}}
        @keyframes cdMusicEq{0%,100%{height:8px;opacity:.7}50%{height:26px;opacity:1}}
        @media (prefers-reduced-motion:reduce){
          .cdMusicFallback__moon,.cdMusicFallback__moon::before,.cdMusicFallback__moon::after,.cdMusicFallback__eq span{animation:none!important}
          .cdMusicFallback__eq span{height:18px}
        }
      `}</style>
      <div className="cdMusicFallback__inner">
        <div className="cdMusicFallback__moon" aria-hidden="true" />
        <div className="cdMusicFallback__eq" aria-hidden="true">
          <span /><span /><span /><span /><span />
        </div>
        <p className="cdMusicFallback__text">{ROUTE_FALLBACK_COPY[getCurrentMusicRouteLocale()] || ROUTE_FALLBACK_COPY.ko}</p>
      </div>
    </main>
  );
}

const MusicPlayerExample = dynamic(() => import("./MusicPlayerExample"), {
  loading: MusicRouteFallback,
});

export default function MusicRouteClient() {
  return <MusicPlayerExample />;
}
