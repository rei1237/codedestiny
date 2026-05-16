"use client";

import React from "react";
import dynamic from "next/dynamic";

// Dynamically import the engine to optimize bundle size
const LoveSimulationEngine = dynamic(
  () => import("./_components/LoveSimulationEngine").then((mod) => mod.LoveSimulationEngine),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 animate-pulse">운명의 코드를 분석 중입니다...</p>
        </div>
      </div>
    ),
  }
);

export default function LoveSimulationClient() {
  return <LoveSimulationEngine />;
}
