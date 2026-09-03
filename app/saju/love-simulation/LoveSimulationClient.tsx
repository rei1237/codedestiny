"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

const LOVE_SIMULATION_LOADING_EN = "Preparing your Love Code...";
const LOVE_SIMULATION_LOADING_COPY: Partial<Record<LoadingLocale, string>> = {
  ko: "러브 코드를 준비 중입니다...",
  ja: "ラブコードを準備しています...",
  "zh-CN": "正在准备恋爱代码...",
  "zh-TW": "正在準備戀愛代碼...",
  vi: "Đang chuẩn bị Love Code...",
  hi: "लव कोड तैयार किया जा रहा है...",
  es: "Preparando tu Love Code...",
  fr: "Préparation de votre Love Code...",
  de: "Dein Love Code wird vorbereitet...",
  nl: "Je Love Code wordt voorbereid...",
  ms: "Sedang menyediakan Love Code anda...",
};

function LoveSimulationLoading() {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    window.addEventListener("languagechange", sync);
    window.addEventListener("cd:locale-ready", sync);
    return () => {
      window.removeEventListener("languagechange", sync);
      window.removeEventListener("cd:locale-ready", sync);
    };
  }, []);
  return (
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 animate-pulse">{LOVE_SIMULATION_LOADING_COPY[locale] || LOVE_SIMULATION_LOADING_EN}</p>
      </div>
    </div>
  );
}

const LoveSimulationEngine = dynamic(
  () => import("./_components/LoveSimulationEngine").then((mod) => mod.LoveSimulationEngine),
  {
    ssr: false,
    loading: () => <LoveSimulationLoading />,
  }
);

// 진입 시 해금 검사를 하지 않는다. 예전에는 미해금이면 /index.html?action=openLoveSimulation 으로
// replace 했는데, 셸의 그 액션은 다시 이 라우트로 assign 하므로 두 화면이 서로를 무한 왕복했다
// (= '러브 코드가 아예 실행되지 않음'). 결제 게이트는 시뮬레이션 시작 CTA 한 곳에서만 돈다.
export default function LoveSimulationClient() {
  return <LoveSimulationEngine />;
}
