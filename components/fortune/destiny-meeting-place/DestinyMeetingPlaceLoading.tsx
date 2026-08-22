"use client";

import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

interface DestinyMeetingPlaceLoadingCopy {
  title: string;
  subtitle: string;
  lines: string[];
}

const DESTINY_MEETING_PLACE_LOADING_COPY_EN: DestinyMeetingPlaceLoadingCopy = {
  title: "Scanning your meeting coordinates",
  subtitle: "The starlight neon engine is combining place, timing, and style signals from your input.",
  lines: [
    "Precisely analyzing your saju energy and the direction vector of your connection...",
    "Mapping high-probability meeting places onto the starlight map in order.",
    "Combining five-element flow with seasonal timing to build real, actionable recommendations.",
  ],
};

const DESTINY_MEETING_PLACE_LOADING_COPY: Partial<Record<LoadingLocale, DestinyMeetingPlaceLoadingCopy>> = {
  ko: {
    title: "인연 좌표 스캔 중",
    subtitle: "별빛 네온 엔진이 입력 데이터를 바탕으로 장소, 시기, 스타일 신호를 결합하고 있습니다.",
    lines: [
      "당신의 사주 에너지와 인연의 방향 벡터를 정밀 분석 중...",
      "별빛 지도에 만남 확률이 높은 장소를 순서대로 매핑하고 있어요.",
      "오행 흐름과 계절 타이밍을 결합해 실제 행동 가능한 추천을 정리하고 있어요.",
    ],
  },
  en: DESTINY_MEETING_PLACE_LOADING_COPY_EN,
  ja: {
    title: "縁の座標をスキャン中",
    subtitle: "星明かりのネオンエンジンが入力データをもとに場所・時期・スタイルの信号を組み合わせています。",
    lines: [
      "あなたの四柱エネルギーと縁の方向ベクトルを精密分析中...",
      "星明かりの地図に出会いの確率が高い場所を順に配置しています。",
      "五行の流れと季節のタイミングを組み合わせ、実際に行動できるおすすめを整理しています。",
    ],
  },
  "zh-CN": {
    title: "正在扫描缘分坐标",
    subtitle: "星光霓虹引擎正基于您的输入数据，组合地点、时机与风格信号。",
    lines: [
      "正在精密分析您的四柱能量与缘分方向向量...",
      "正在星光地图上依序标注相遇概率较高的地点。",
      "正在结合五行流向与季节时机，整理真正可行动的推荐。",
    ],
  },
  "zh-TW": {
    title: "正在掃描緣分座標",
    subtitle: "星光霓虹引擎正基於您的輸入資料，組合地點、時機與風格信號。",
    lines: [
      "正在精密分析您的四柱能量與緣分方向向量...",
      "正在星光地圖上依序標註相遇機率較高的地點。",
      "正在結合五行流向與季節時機，整理真正可行動的推薦。",
    ],
  },
};

function getDestinyMeetingPlaceLoadingCopy(locale: LoadingLocale): DestinyMeetingPlaceLoadingCopy {
  return { ...DESTINY_MEETING_PLACE_LOADING_COPY_EN, ...(DESTINY_MEETING_PLACE_LOADING_COPY[locale] || {}) };
}

export default function DestinyMeetingPlaceLoading() {
  const copy = getDestinyMeetingPlaceLoadingCopy(getCurrentLoadingLocale());
  return (
    <section className="relative overflow-hidden rounded-3xl border border-[#9ad7ff]/30 bg-[linear-gradient(155deg,rgba(16,20,52,0.7),rgba(31,16,56,0.56))] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_20px_42px_rgba(7,8,28,0.52)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.6)_0.8px,transparent_0.8px)] [background-size:3px_3px]" />
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full border-2 border-[#ffd36e]/80 border-t-transparent shadow-[0_0_12px_rgba(255,211,110,0.65)] motion-safe:animate-spin motion-reduce:animate-none" />
        <div>
          <h4 className="text-lg font-black text-white [text-shadow:0_0_12px_rgba(145,216,255,0.52)]">{copy.title}</h4>
          <p className="text-xs text-[#d5d9ff]">{copy.subtitle}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {copy.lines.map((line) => (
          <p key={line} className="rounded-2xl border border-[#c2dcff]/22 bg-[#110d2c]/60 px-3 py-2 text-sm text-[#eef2ff]">
            {line}
          </p>
        ))}
      </div>
    </section>
  );
}
