"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { readYeonProfileSeed, type YeonProfileSeed } from "@/lib/yeon/profileSeed";

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
  const [birthDateEdited, setBirthDateEdited] = useState(false);
  const [profileSeed, setProfileSeed] = useState<YeonProfileSeed | null>(null);
  const [loading, setLoading] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [result, setResult] = useState<YeonMessageOutput | null>(null);

  const storyRef = useRef<HTMLDivElement>(null);
  const squareRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLElement>(null);

  const themeKey = useMemo(() => getTimeThemeByLocalHour(new Date()), []);
  const theme = timeThemeMap[themeKey];

  const applyBirthDateToZodiac = useCallback((targetBirthDate: string) => {
    const zodiac = getZodiacFromBirthDate(targetBirthDate);
    if (zodiac) setSelectedSign(zodiac);
  }, []);

  const syncProfileSeed = useCallback(
    (force = false) => {
      const nextSeed = readYeonProfileSeed();
      setProfileSeed(nextSeed);

      if (!nextSeed.birthDate) return;
      if (force || !birthDateEdited || !birthDate) {
        setBirthDate(nextSeed.birthDate);
        applyBirthDateToZodiac(nextSeed.birthDate);
      }
    },
    [applyBirthDateToZodiac, birthDate, birthDateEdited]
  );

  useEffect(() => {
    syncProfileSeed(false);

    const onProfileEvent = () => syncProfileSeed(false);
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key.startsWith("FORTUNE_APP_USER_PROFILES") || event.key === "fortune_auth_user") {
        syncProfileSeed(false);
      }
    };

    window.addEventListener("destinyProfileChanged", onProfileEvent as EventListener);
    window.addEventListener("cd:auth-changed", onProfileEvent as EventListener);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("destinyProfileChanged", onProfileEvent as EventListener);
      window.removeEventListener("cd:auth-changed", onProfileEvent as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, [syncProfileSeed]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      const target = fullscreenRef.current;
      if (target && typeof target.requestFullscreen === "function") {
        await target.requestFullscreen();
      }
    } catch (e) {
      // 전체화면 API 실패 시 기본 화면으로 그대로 진행한다.
    }
  }

  async function handleGenerate() {
    setLoading(true);
    const input: AstrologyEngineInput = {
      userName: profileSeed?.name || "사용자",
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

    await new Promise((resolve) => window.setTimeout(resolve, 650));
    const generated = generateYeonMessageFromAstrology(input);
    setResult(generated);
    setLoading(false);
  }

  return (
    <main
      ref={fullscreenRef}
      className="relative min-h-screen overflow-x-clip bg-[#070d24] text-white"
      style={{ background: theme.background }}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_16%,rgba(255,225,156,0.19),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(107,145,255,0.24),transparent_36%),radial-gradient(circle_at_55%_100%,rgba(182,123,255,0.2),transparent_42%)]" />
        {Array.from({ length: 14 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute text-[11px]"
            style={{ left: `${(i * 7) % 96}%`, top: `${(i * 13) % 92}%` }}
            animate={{ opacity: [0.16, 0.9, 0.16] }}
            transition={{ duration: 2.8 + (i % 5) * 0.55, repeat: Infinity, ease: "easeInOut" }}
          >
            ✦
          </motion.span>
        ))}
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1260px] px-4 py-5 md:px-8 md:py-8">
        <section className="rounded-[34px] border border-white/35 bg-[linear-gradient(135deg,rgba(12,16,43,0.76),rgba(22,17,59,0.72),rgba(10,22,48,0.78))] p-5 shadow-[0_24px_80px_rgba(8,11,32,0.55)] backdrop-blur-2xl md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-white/80">YEON STAR HUG LAB</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => syncProfileSeed(true)}
                className="rounded-full border border-white/45 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white"
              >
                프로필 카드 동기화
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="rounded-full border border-[#ffe4a5]/65 bg-[#ffd67b]/20 px-3 py-1.5 text-xs font-bold text-[#fff1cf]"
              >
                {fullscreen ? "전체화면 종료" : "전체화면 시작"}
              </button>
            </div>
          </div>

          <div className="mt-5 grid items-center gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div>
              <h1 className="text-3xl font-black leading-tight md:text-4xl">연이의 마음 별자리, 몰입형 상담 모드</h1>
              <p className="mt-3 max-w-3xl text-sm text-white/90 md:text-base">
                프로필 카드 정보로 별자리를 자동 인식하고, 감정 흐름과 결합한 점성술 중심 상담을 제공합니다. 스프라이트 시트 기반 연이
                애니메이션으로 화면 전체에서 부드럽게 몰입해 보세요.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-white/45 bg-white/10 px-3 py-1.5">현재 테마: {theme.label}</span>
                <span className="rounded-full border border-white/45 bg-white/10 px-3 py-1.5">자동 판별 별자리: {selectedSign}</span>
                {profileSeed?.birthDate ? (
                  <span className="rounded-full border border-[#9dd0ff]/55 bg-[#7eb7ff]/15 px-3 py-1.5">
                    프로필 생년월일: {profileSeed.birthDate}
                  </span>
                ) : (
                  <span className="rounded-full border border-[#ffd7b0]/50 bg-[#ffb979]/15 px-3 py-1.5">프로필 생년월일 없음</span>
                )}
              </div>
            </div>
            <YeonFloatingCharacter mood={selectedMood} sign={selectedSign} />
          </div>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1.04fr_0.96fr]">
          <article className="rounded-[30px] border border-white/30 bg-white/10 p-5 shadow-[0_14px_44px_rgba(10,12,36,0.45)] backdrop-blur-xl md:p-7">
            <h2 className="mb-2 text-xl font-bold">감정 선택</h2>
            <p className="mb-4 text-xs text-white/80">감정 상태를 고르면 연이의 말투와 처방 문장이 함께 달라져요.</p>
            <YeonEmotionSelector selectedMood={selectedMood} onSelectMood={setSelectedMood} />

            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="mt-5 min-h-11 w-full rounded-full border border-[#ffe9b6]/75 bg-[linear-gradient(90deg,rgba(255,208,121,0.34),rgba(154,184,255,0.28),rgba(197,147,255,0.28))] px-5 text-sm font-bold text-white"
            >
              {loading ? "연이가 별빛 흐름을 정리 중이에요..." : "고품질 마음 별자리 상담 시작"}
            </button>
            <p className="mt-2 text-xs text-white/80">점성술 데이터만 활용하며 사주 정보는 혼합하지 않습니다.</p>
          </article>

          <article className="rounded-[30px] border border-white/30 bg-white/10 p-5 shadow-[0_14px_44px_rgba(10,12,36,0.45)] backdrop-blur-xl md:p-7">
            <h2 className="mb-2 text-xl font-bold">별자리 자동 판별</h2>
            <p className="mb-4 text-xs text-white/80">프로필 카드 생년월일을 우선 사용하고, 필요하면 직접 수정할 수 있어요.</p>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={birthDate}
                onChange={(e) => {
                  const next = e.target.value;
                  setBirthDate(next);
                  setBirthDateEdited(true);
                }}
                className="min-h-11 flex-1 rounded-xl border border-white/40 bg-white/12 px-3 text-sm text-white outline-none [color-scheme:dark]"
              />
              <button
                type="button"
                onClick={() => applyBirthDateToZodiac(birthDate)}
                className="min-h-11 rounded-full border border-white/45 bg-white/20 px-4 text-sm font-semibold"
              >
                별자리 계산
              </button>
            </div>

            {profileSeed ? (
              <p className="mb-3 rounded-2xl border border-white/25 bg-black/15 px-3 py-2 text-xs text-white/88">
                {profileSeed.name ? `${profileSeed.name}님의 ` : ""}
                데이터 소스: {profileSeed.source === "profile-card" ? "프로필 카드" : profileSeed.source === "auth-user" ? "계정 정보" : "없음"}
              </p>
            ) : null}

            <YeonZodiacSelector selectedSign={selectedSign} onSelectSign={setSelectedSign} />
          </article>
        </section>

        {loading ? (
          <section className="mt-4 rounded-[30px] border border-white/30 bg-white/10 p-6 backdrop-blur-xl">
            <p className="text-sm">연이가 별빛을 주워 담고 있어요...</p>
            <p className="text-sm text-white/85">감정선, 별자리, 원소 흐름을 맞춰 정밀 상담 문장을 구성하는 중입니다.</p>
          </section>
        ) : null}

        {result ? (
          <section className="mt-4 grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
            <article className="rounded-[30px] border border-white/30 bg-white/10 p-5 backdrop-blur-xl md:p-7">
              <h2 className="mb-4 text-xl font-bold">결과 타임라인</h2>
              <YeonMessageTimeline message={result} />
            </article>

            <article className="rounded-[30px] border border-white/30 bg-white/10 p-5 backdrop-blur-xl md:p-7">
              <h2 className="mb-4 text-xl font-bold">오늘의 마음 카드 만들기</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <YeonShareCard
                  mode="story"
                  mood={selectedMood}
                  sign={selectedSign}
                  message={result}
                  background={theme.background}
                  ref={storyRef}
                />
                <YeonShareCard
                  mode="square"
                  mood={selectedMood}
                  sign={selectedSign}
                  message={result}
                  background={theme.background}
                  ref={squareRef}
                />
              </div>
              <div className="mt-4">
                <YeonCardDownloadButton storyRef={storyRef} squareRef={squareRef} baseFileName={`yeon-${selectedSign}`} />
              </div>
            </article>
          </section>
        ) : null}
      </div>
    </main>
  );
}
