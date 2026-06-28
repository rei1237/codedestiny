"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import FortuneTeaHouseImmersiveShell from "./components/FortuneTeaHouseImmersiveShell";
import FortuneTeaHouseLanding from "./components/FortuneTeaHouseLanding";
import HumanYeoniReveal from "./components/HumanYeoniReveal";
import QuestionInputScene from "./components/QuestionInputScene";
import ScentLoadingScene from "./components/ScentLoadingScene";
import TarotRevealScene from "./components/TarotRevealScene";
import TeaCupSelectionScene from "./components/TeaCupSelectionScene";
import TeaHouseResultSheet from "./components/TeaHouseResultSheet";
import TeaHouseStoryIntro from "./components/TeaHouseStoryIntro";
import YeoniTransformScene from "./components/YeoniTransformScene";
import { fortuneTeaHouseAssets } from "./data/assets";
import type { FortuneTeaHouseConsultResponse, FortuneTeaHouseQuestionInput } from "./data/consult";
import { getTeaHouseSteps, teaHouseCtaCopy, type TeaHouseStage, type TeaHouseStoryStep } from "./data/story";
import type { TeaHouseCup } from "./data/teaCups";
import { buildFortuneTeaHouseConsultResult } from "./lib/buildConsultResult";
import styles from "./styles/fortune-tea-house.module.css";

const FORTUNE_TEA_BGM_URL = "https://music.code-destiny.com/DestinyCafe/Moonlit%20Tea%20House.mp3";
const FORTUNE_TEA_BGM_STORAGE_KEY = "code-destiny-fortune-tea-house-bgm";

const entryStorySteps: TeaHouseStoryStep[] = [
  {
    id: "moon-entry-1",
    stage: "pigIntro",
    speaker: "narration",
    visual: "tea-house",
    text: "골목 끝에 작은 종소리가 번집니다.\n닫혀 있던 찻집 문틈으로 달빛과 따뜻한 차 향이 새어 나옵니다.",
    cta: "문 앞으로 다가가기",
  },
  {
    id: "moon-entry-2",
    stage: "pigIntro",
    speaker: "narration",
    visual: "tea-house",
    text: "문패에는 운명의 찻집이라고 적혀 있습니다.\n오늘 밤, 오래 품고 있던 질문을 잠시 내려놓아도 되는 곳입니다.",
    cta: "종소리 듣기",
  },
  {
    id: "moon-pig-welcome",
    stage: "pigIntro",
    speaker: "꽃돼지?",
    visual: "pig",
    mood: "welcome",
    text: "꿀… 어서 와.\n오늘은 그냥 지나칠 수 없는 마음을 안고 왔구나.",
    cta: "인사하기",
  },
  {
    id: "moon-pig-scent",
    stage: "pigIntro",
    speaker: "꽃돼지?",
    visual: "pig",
    mood: "thinking",
    text: "네 마음에서는 여러 향이 나.\n조금 달고, 조금 쓰고, 오래 참아온 향도 섞여 있어.",
    cta: "가만히 듣기",
  },
  {
    id: "moon-pig-comfort",
    stage: "pigIntro",
    speaker: "꽃돼지?",
    visual: "pig",
    mood: "comfort",
    text: "괜찮아. 여기서는 잘 말하지 못해도 돼.\n마음은 말보다 먼저 찻잔 위에 도착하니까.",
    cta: "찻집 문 열기",
  },
];

export default function FortuneTeaHousePage() {
  const [stage, setStage] = useState<TeaHouseStage>("landing");
  const [notice, setNotice] = useState("");
  const [isEnteringTeaHouse, setIsEnteringTeaHouse] = useState(false);
  const [bgmEnabled, setBgmEnabled] = useState(true);
  const [isBgmPreferenceReady, setIsBgmPreferenceReady] = useState(false);
  const [bgmStatus, setBgmStatus] = useState<"idle" | "playing" | "blocked" | "off">("idle");
  const [selectedCup, setSelectedCup] = useState<TeaHouseCup | null>(null);
  const [questionInput, setQuestionInput] = useState<Partial<FortuneTeaHouseQuestionInput>>({});
  const [consultResult, setConsultResult] = useState<FortuneTeaHouseConsultResponse | null>(null);
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const enterTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const audio = bgmAudioRef.current;
    if (audio) audio.volume = 0.28;

    try {
      const savedPreference = window.localStorage.getItem(FORTUNE_TEA_BGM_STORAGE_KEY);
      if (savedPreference === "off") setBgmEnabled(false);
    } catch {
      void 0;
    }
    setIsBgmPreferenceReady(true);

    return () => {
      if (audio) audio.pause();
      if (enterTimerRef.current) window.clearTimeout(enterTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setNotice("");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [stage]);

  const playBgm = useCallback(async () => {
    const audio = bgmAudioRef.current;
    if (!audio || !bgmEnabled || !isBgmPreferenceReady) return;
    try {
      audio.volume = 0.28;
      await audio.play();
      setBgmStatus("playing");
    } catch {
      setBgmStatus("blocked");
    }
  }, [bgmEnabled, isBgmPreferenceReady]);

  useEffect(() => {
    const audio = bgmAudioRef.current;
    if (!audio || !isBgmPreferenceReady) return;
    if (!bgmEnabled) {
      audio.pause();
      setBgmStatus("off");
      return;
    }
    void playBgm();
  }, [bgmEnabled, isBgmPreferenceReady, playBgm]);

  useEffect(() => {
    if (!isBgmPreferenceReady || !bgmEnabled || bgmStatus === "playing") return;
    const unlockAudio = () => {
      void playBgm();
    };
    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, [bgmEnabled, bgmStatus, isBgmPreferenceReady, playBgm]);

  function goToStage(nextStage: TeaHouseStage) {
    setStage(nextStage);
  }

  function toggleBgm() {
    const nextEnabled = !bgmEnabled;
    setBgmEnabled(nextEnabled);
    try {
      window.localStorage.setItem(FORTUNE_TEA_BGM_STORAGE_KEY, nextEnabled ? "on" : "off");
    } catch {
      void 0;
    }
    if (nextEnabled) {
      void playBgm();
    }
  }

  function enterTeaHouse() {
    if (isEnteringTeaHouse) return;
    void playBgm();
    setIsEnteringTeaHouse(true);
    enterTimerRef.current = window.setTimeout(() => {
      setIsEnteringTeaHouse(false);
      goToStage("pigIntro");
    }, 1280);
  }

  function restartConsultation() {
    setQuestionInput({});
    setConsultResult(null);
    setStage("teaSelect");
  }

  function showReadyNotice(message: string = teaHouseCtaCopy.notice) {
    setNotice(message);
  }

  function selectTeaCup(cup: TeaHouseCup) {
    setSelectedCup(cup);
    setConsultResult(null);
    goToStage("questionInput");
  }

  async function submitQuestion(nextQuestionInput: FortuneTeaHouseQuestionInput) {
    if (!selectedCup) {
      goToStage("teaSelect");
      return;
    }

    setQuestionInput(nextQuestionInput);
    setConsultResult(null);
    goToStage("scentLoading");

    try {
      const startedAt = Date.now();
      const payload = buildFortuneTeaHouseConsultResult({
        selectedTeaCupId: selectedCup.id,
        selectedTeaCupName: selectedCup.name,
        selectedTeaCupTopic: selectedCup.topic,
        nickname: nextQuestionInput.nickname,
        concernTopic: nextQuestionInput.concernTopic,
        birthInfo: nextQuestionInput.birthInfo,
        question: nextQuestionInput.question,
      });

      const remainingDelay = Math.max(0, 1300 - (Date.now() - startedAt));
      if (remainingDelay > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, remainingDelay));
      }

      setConsultResult(payload as FortuneTeaHouseConsultResponse);
      goToStage("tarotReveal");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "찻잔의 향이 잠시 흐려졌어요. 잠시 뒤 다시 물어봐 주세요.");
      goToStage("questionInput");
    }
  }

  return (
    <FortuneTeaHouseImmersiveShell stage={stage} notice={notice}>
        <audio ref={bgmAudioRef} className={styles.bgmAudio} src={FORTUNE_TEA_BGM_URL} loop preload="metadata" />
        <button
          className={styles.bgmToggle}
          type="button"
          data-active={bgmEnabled && bgmStatus === "playing" ? "true" : "false"}
          aria-label={bgmEnabled ? "운명의 찻집 배경 음악 끄기" : "운명의 찻집 배경 음악 켜기"}
          aria-pressed={bgmEnabled}
          onClick={toggleBgm}
        >
          <span aria-hidden>{bgmEnabled && bgmStatus === "playing" ? "♪" : "月"}</span>
          <strong>BGM</strong>
          <em>{bgmEnabled ? (bgmStatus === "playing" ? "ON" : "READY") : "OFF"}</em>
        </button>

        <div className={styles.entryTransition} data-active={isEnteringTeaHouse ? "true" : "false"} aria-hidden>
          <img src={fortuneTeaHouseAssets.backgrounds.loadingScene} alt="" decoding="async" />
          <span />
          <div className={styles.entryLoadingPanel}>
            <strong>LOADING...</strong>
            <p>달빛 찻집의 문이 열립니다</p>
            <i />
          </div>
        </div>

        <div className={styles.sceneFrame} aria-live="polite">
          {stage === "landing" ? <FortuneTeaHouseLanding onEnter={enterTeaHouse} /> : null}
          {stage === "pigIntro" ? (
            <TeaHouseStoryIntro
              steps={entryStorySteps}
              eyebrow="문 앞에서 들려온 작은 목소리"
              title="달빛 찻집의 문이 열립니다"
              completeLabel="변신 보기"
              onComplete={() => goToStage("transform")}
            />
          ) : null}
          {stage === "transform" ? <YeoniTransformScene onComplete={() => goToStage("yeoniIntro")} /> : null}
          {stage === "yeoniIntro" ? (
            <HumanYeoniReveal steps={getTeaHouseSteps("yeoniIntro")} onComplete={() => goToStage("teaSelect")} />
          ) : null}
          {stage === "teaSelect" ? <TeaCupSelectionScene selectedCupId={selectedCup?.id} onSelect={selectTeaCup} /> : null}
          {stage === "questionInput" && selectedCup ? (
            <QuestionInputScene
              selectedCup={selectedCup}
              initialInput={questionInput}
              onBack={() => goToStage("teaSelect")}
              onSubmit={submitQuestion}
            />
          ) : null}
          {stage === "scentLoading" ? <ScentLoadingScene selectedCup={selectedCup} /> : null}
          {stage === "tarotReveal" && consultResult ? (
            <TarotRevealScene result={consultResult} onComplete={() => goToStage("result")} />
          ) : null}
          {stage === "result" && consultResult ? (
            <TeaHouseResultSheet
              result={consultResult}
              onRestart={restartConsultation}
              onReady={() => showReadyNotice("저장은 아직 준비 중이에요. 오늘은 이 결과를 화면에서 천천히 읽어 주세요.")}
            />
          ) : null}
        </div>
    </FortuneTeaHouseImmersiveShell>
  );
}
