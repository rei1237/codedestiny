"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import YeonEmotionSelector from "./YeonEmotionSelector";
import YeonZodiacSelector from "./YeonZodiacSelector";
import YeonFloatingCharacter from "./YeonFloatingCharacter";
import YeonMessageTimeline from "./YeonMessageTimeline";
import YeonShareCard from "./YeonShareCard";
import YeonCardDownloadButton from "./YeonCardDownloadButton";
import { getZodiacFromBirthDate } from "@/lib/yeon/zodiac";
import { getTimeThemeByLocalHour, timeThemeMap } from "@/lib/yeon/timeTheme";
import { generateYeonMessageFromAstrology } from "@/lib/yeon/generateYeonPrompt";
import type { AstrologyEngineInput, YeonMood, YeonMessageOutput, ZodiacSign } from "@/lib/yeon/types";

const zodiacElementMap: Record<ZodiacSign, "fire" | "earth" | "air" | "water"> = {
  양자리: "fire",
  황소자리: "earth",
  쌍둥이자리: "air",
  게자리: "water",
  사자자리: "fire",
  처녀자리: "earth",
  천칭자리: "air",
  전갈자리: "water",
  사수자리: "fire",
  염소자리: "earth",
  물병자리: "air",
  물고기자리: "water",
};

const moodToTheme: Record<YeonMood, string> = {
  happy: "기쁨의 여운",
  tired: "회복 우선 흐름",
  anxious: "불안 정리 단계",
  lonely: "감정 연결 회복",
  angry: "감정 온도 조절",
  blank: "느린 재정비",
  hopeful: "작은 시작의 창",
};

export default function YeonStarHugPage() {
  const [selectedMood, setSelectedMood] = useState<YeonMood>("tired");
  const [selectedSign, setSelectedSign] = useState<ZodiacSign>("양자리");
  const [birthDate, setBirthDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<YeonMessageOutput | null>(null);

  const storyRef = useRef<HTMLDivElement>(null);
  const squareRef = useRef<HTMLDivElement>(null);

  const themeKey = useMemo(() => getTimeThemeByLocalHour(new Date()), []);
  const theme = timeThemeMap[themeKey];

  function applyBirthDateToZodiac() {
    const zodiac = getZodiacFromBirthDate(birthDate);
    if (zodiac) setSelectedSign(zodiac);
  }

  async function handleGenerate() {
    setLoading(true);
    const input: AstrologyEngineInput = {
      birthDate: birthDate || undefined,
      zodiacSign: selectedSign,
      currentPeriod: "daily",
      astrologyData: {
        sunSign: selectedSign,
        moonSign: moodToTheme[selectedMood],
        ascendant: selectedSign,
        dominantElement: zodiacElementMap[selectedSign],
        currentTransits: [`${selectedSign} 에너지에서 ${moodToTheme[selectedMood]}이 중심 주제로 떠오릅니다.`],
        luckyPlanet: "작은 회복 루틴",
        tensionPlanet: "결론을 서두르는 마음",
        majorTheme: `${selectedSign}의 오늘은 감정의 속도를 부드럽게 조절하는 흐름`,
        loveTheme: "관계에서 성급한 판단보다 감정의 온도를 먼저 확인해보세요.",
        moneyTheme: "오늘의 지출은 필요와 위로를 구분하면 훨씬 가벼워집니다.",
        workTheme: "일은 가장 작은 단위를 먼저 끝내는 방식이 집중을 회복시켜줘요.",
        relationshipTheme: "가까운 사람과는 해결보다 공감 한 문장을 먼저 나눠보세요.",
      },
      userEmotion: {
        selectedMood,
        moodLabel: selectedMood,
      },
    };

    await new Promise((resolve) => window.setTimeout(resolve, 900));
    const generated = generateYeonMessageFromAstrology(input);
    setResult(generated);
    setLoading(false);
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 text-white md:px-6" style={{ background: theme.background }}>
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {Array.from({ length: 14 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute text-[10px]"
            style={{ left: `${(i * 7) % 96}%`, top: `${(i * 13) % 92}%` }}
            animate={{ opacity: [0.16, 0.9, 0.16] }}
            transition={{ duration: 2.8 + (i % 5) * 0.55, repeat: Infinity, ease: "easeInOut" }}
          >
            ✦
          </motion.span>
        ))}
      </div>

      <div className="relative z-10 mx-auto max-w-5xl space-y-4">
        <section className="rounded-[30px] border border-white/30 bg-white/12 p-5 backdrop-blur-xl md:p-8">
          <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-white/80">YEON-I'S STAR HUG MESSAGE</p>
              <h1 className="mt-2 text-3xl font-black md:text-4xl">오늘 하루 어땠어?</h1>
              <p className="mt-2 text-sm text-white/90 md:text-base">
                연이가 별빛 냄새로 네 마음을 살짝 읽어볼게. 점성술 흐름만으로 다정한 마음 메시지를 전해줄게.
              </p>
              <p className="mt-1 text-xs text-white/75">현재 테마: {theme.label}</p>
            </div>
            <YeonFloatingCharacter mood={selectedMood} />
          </div>
        </section>

        <section className="rounded-[30px] border border-white/30 bg-white/12 p-5 backdrop-blur-xl md:p-7">
          <h2 className="mb-3 text-xl font-bold">감정 선택</h2>
          <YeonEmotionSelector selectedMood={selectedMood} onSelectMood={setSelectedMood} />
        </section>

        <section className="rounded-[30px] border border-white/30 bg-white/12 p-5 backdrop-blur-xl md:p-7">
          <h2 className="mb-3 text-xl font-bold">별자리 선택</h2>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="min-h-11 rounded-xl border border-white/40 bg-white/15 px-3 text-sm text-white outline-none"
            />
            <button
              type="button"
              onClick={applyBirthDateToZodiac}
              className="min-h-11 rounded-full border border-white/45 bg-white/20 px-4 text-sm font-semibold"
            >
              생년월일로 자동 선택
            </button>
          </div>
          <YeonZodiacSelector selectedSign={selectedSign} onSelectSign={setSelectedSign} />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="mt-4 min-h-11 rounded-full border border-white/50 bg-white/30 px-5 text-sm font-bold"
          >
            {loading ? "연이가 별빛을 주워 담는 중이에요..." : "연이의 마음 메시지 받기"}
          </button>
          <p className="mt-2 text-xs text-white/80">조금만 기다려줘요.</p>
        </section>

        {loading ? (
          <section className="rounded-[30px] border border-white/30 bg-white/12 p-6 backdrop-blur-xl">
            <p className="text-sm">연이가 별빛을 주워 담는 중이에요...</p>
            <p className="text-sm">조금만 기다려줘요.</p>
          </section>
        ) : null}

        {result ? (
          <>
            <section className="rounded-[30px] border border-white/30 bg-white/12 p-5 backdrop-blur-xl md:p-7">
              <h2 className="mb-4 text-xl font-bold">결과 타임라인</h2>
              <YeonMessageTimeline message={result} />
            </section>

            <section className="rounded-[30px] border border-white/30 bg-white/12 p-5 backdrop-blur-xl md:p-7">
              <h2 className="mb-4 text-xl font-bold">오늘의 마음 카드 만들기</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <YeonShareCard mode="story" mood={selectedMood} message={result} background={theme.background} ref={storyRef} />
                <YeonShareCard mode="square" mood={selectedMood} message={result} background={theme.background} ref={squareRef} />
              </div>
              <div className="mt-4">
                <YeonCardDownloadButton storyRef={storyRef} squareRef={squareRef} baseFileName={`yeon-${selectedSign}`} />
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
