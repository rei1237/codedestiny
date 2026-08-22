"use client";

import { useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

interface DestinyBiasProgressCopy {
  ariaLabel: string;
  stepLabels: readonly string[];
}

const DESTINY_BIAS_PROGRESS_EN: DestinyBiasProgressCopy = {
  ariaLabel: "Progress step",
  stepLabels: ["01\nEnter", "02\nConnect", "03\nTheme", "04\nAnalyzing", "05\nDone!"],
};

const DESTINY_BIAS_PROGRESS_COPY: Partial<Record<LoadingLocale, DestinyBiasProgressCopy>> = {
  ko: { ariaLabel: "진행 단계", stepLabels: ["01\n입장", "02\n연결", "03\n테마", "04\n분석중", "05\n완성!"] },
  ja: { ariaLabel: "進行ステップ", stepLabels: ["01\n入場", "02\n接続", "03\nテーマ", "04\n分析中", "05\n完成!"] },
  "zh-CN": { ariaLabel: "进度步骤", stepLabels: ["01\n入场", "02\n连接", "03\n主题", "04\n分析中", "05\n完成！"] },
  "zh-TW": { ariaLabel: "進度步驟", stepLabels: ["01\n入場", "02\n連接", "03\n主題", "04\n分析中", "05\n完成！"] },
  vi: { ariaLabel: "Bước tiến trình", stepLabels: ["01\nVào", "02\nKết nối", "03\nChủ đề", "04\nĐang phân tích", "05\nHoàn tất!"] },
  hi: { ariaLabel: "प्रगति चरण", stepLabels: ["01\nप्रवेश", "02\nकनेक्ट", "03\nथीम", "04\nविश्लेषण जारी", "05\nपूर्ण!"] },
  es: { ariaLabel: "Paso de progreso", stepLabels: ["01\nEntrar", "02\nConectar", "03\nTema", "04\nAnalizando", "05\n¡Listo!"] },
  fr: { ariaLabel: "Étape de progression", stepLabels: ["01\nEntrer", "02\nConnecter", "03\nThème", "04\nAnalyse", "05\nTerminé !"] },
  de: { ariaLabel: "Fortschrittsschritt", stepLabels: ["01\nEintritt", "02\nVerbinden", "03\nThema", "04\nAnalyse läuft", "05\nFertig!"] },
  nl: { ariaLabel: "Voortgangsstap", stepLabels: ["01\nBinnenkomst", "02\nVerbinden", "03\nThema", "04\nAnalyseren", "05\nKlaar!"] },
  ms: { ariaLabel: "Langkah kemajuan", stepLabels: ["01\nMasuk", "02\nSambung", "03\nTema", "04\nSedang dianalisis", "05\nSiap!"] },
};

function getDestinyBiasProgressCopy(locale: LoadingLocale): DestinyBiasProgressCopy {
  return DESTINY_BIAS_PROGRESS_COPY[locale] || DESTINY_BIAS_PROGRESS_EN;
}

function useDestinyBiasProgressCopy(): DestinyBiasProgressCopy {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    window.addEventListener("languagechange", sync);
    document.addEventListener("cd:language-change", sync);
    return () => {
      window.removeEventListener("languagechange", sync);
      document.removeEventListener("cd:language-change", sync);
    };
  }, []);
  return getDestinyBiasProgressCopy(locale);
}

export default function DestinyBiasProgress({ current }: { current: number }) {
  const copy = useDestinyBiasProgressCopy();
  return (
    <div
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={5}
      aria-label={copy.ariaLabel}
      className="rounded-2xl border border-white/15 bg-[linear-gradient(140deg,rgba(7,4,22,0.74),rgba(26,11,63,0.54))] p-3 shadow-[0_0_30px_rgba(109,59,255,0.16)]"
    >
      <div className="grid grid-cols-5 gap-2">
        {copy.stepLabels.map((label, index) => {
          const step = index + 1;
          const active = current === step;
          const done = current > step;
          return (
            <div key={label} className="text-center">
              <div
                className={`mx-auto grid h-9 w-9 place-items-center rounded-full border text-[11px] font-black transition ${
                  active
                    ? "border-[var(--bias-gold)]/80 bg-[var(--bias-gold)]/20 text-[var(--bias-gold)] shadow-[0_0_18px_rgba(255,217,138,0.5)]"
                    : done
                    ? "border-[var(--bias-blue)]/70 bg-[var(--bias-blue)]/15 text-[var(--bias-blue)]"
                    : "border-white/20 bg-white/5 text-white/65"
                }`}
              >
                {String(step).padStart(2, "0")}
              </div>
              <p className={`mt-1 text-[10px] font-semibold tracking-[0.1em] ${active ? "text-[var(--bias-gold)]" : done ? "text-[var(--bias-blue)]/90" : "text-white/55"}`}>
                {label.replace("\n", " ")}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
