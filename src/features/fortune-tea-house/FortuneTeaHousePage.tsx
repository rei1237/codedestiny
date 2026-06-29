"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import FortuneTeaHouseImmersiveShell from "./components/FortuneTeaHouseImmersiveShell";
import FortuneTeaHouseLanding from "./components/FortuneTeaHouseLanding";
import QuestionInputScene from "./components/QuestionInputScene";
import ScentLoadingScene from "./components/ScentLoadingScene";
import TarotRevealScene from "./components/TarotRevealScene";
import FortuneTeaHouseDebugPanel from "./components/FortuneTeaHouseDebugPanel";
import TeaCupRitualScene from "./components/TeaCupRitualScene";
import TeaCupSelectionScene from "./components/TeaCupSelectionScene";
import AssetImage from "./components/AssetImage";
import TeaHouseEntryScene from "./components/TeaHouseEntryScene";
import TeaHouseButton from "./components/TeaHouseButton";
import TeaHouseResultSheet from "./components/TeaHouseResultSheet";
import HoneyDropRewardOverlay from "./components/HoneyDropRewardOverlay";
import { fortuneTeaHouseAssets } from "./data/assets";
import type { FortuneTeaHouseConsultRequest, FortuneTeaHouseConsultResponse, FortuneTeaHouseHoneyDropsState, FortuneTeaHouseQuestionInput } from "./data/consult";
import { isTeaHouseEntryStage } from "./data/entryStory";
import { teaHouseCtaCopy, type TeaHouseStage } from "./data/story";
import type { TeaHouseCup } from "./data/teaCups";
import { buildFortuneTeaHouseConsultResult } from "./lib/buildConsultResult";
import {
  applyGuestHoneyDropReward,
  attachHoneyBonusAdvice,
  createFortuneTeaAttemptId,
  normalizeHoneyDropsState,
  pickHoneyDropMessage,
  readGuestHoneyDrops,
} from "./lib/honeyDrops";
import styles from "./styles/fortune-tea-house.module.css";

const FORTUNE_TEA_BGM_TRACKS = {
  moonlitTeaHouse: {
    key: "moonlit-tea-house",
    url: "https://music.code-destiny.com/DestinyCafe/Moonlit%20Tea%20House.mp3",
    volume: 0.28,
  },
  gentleOrientalGirl: {
    key: "gentle-oriental-girl",
    url: "https://music.code-destiny.com/DestinyCafe/Gentle%20Oriental%20Girl.mp3",
    volume: 0.24,
  },
  moonlightTea: {
    key: "moonlight-tea",
    url: "https://music.code-destiny.com/DestinyCafe/Moonlight%20Tea.mp3",
    volume: 0.26,
  },
  kindness: {
    key: "kindness",
    url: "https://music.code-destiny.com/DestinyCafe/Kindness.mp3",
    volume: 0.26,
  },
  moonlitDestinyRoom: {
    key: "moonlit-destiny-room",
    url: "https://music.code-destiny.com/DestinyCafe/Moonlit%20Destiny%20Room.mp3",
    volume: 0.26,
  },
  fortuneReveal: {
    key: "fortune-reveal",
    url: "https://music.code-destiny.com/DestinyCafe/Fortune%20Reveal.mp3",
    volume: 0.25,
  },
} as const;

const FORTUNE_TEA_BGM_STORAGE_KEY = "code-destiny-fortune-tea-house-bgm";
const FORTUNE_TEA_LOADING_PLAYLIST = [
  FORTUNE_TEA_BGM_TRACKS.moonlightTea,
  FORTUNE_TEA_BGM_TRACKS.moonlitDestinyRoom,
  FORTUNE_TEA_BGM_TRACKS.fortuneReveal,
] as const;

type FortuneTeaBgmTrack = (typeof FORTUNE_TEA_BGM_TRACKS)[keyof typeof FORTUNE_TEA_BGM_TRACKS];

type FortuneTeaHouseConsultApiResponse = {
  ok?: boolean;
  result?: FortuneTeaHouseConsultResponse;
  honeyDrops?: FortuneTeaHouseHoneyDropsState;
  message?: string;
  generationMeta?: {
    mode?: "gemini" | "local_fallback";
    provider?: string;
    model?: string;
    reason?: string;
    generatedAt?: string;
  };
};

type BrowserIdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function getFortuneTeaBgmTrack(stage: TeaHouseStage) {
  if (stage === "scentLoading") return FORTUNE_TEA_BGM_TRACKS.moonlightTea;
  if (stage === "tarotReveal" || stage === "result") return FORTUNE_TEA_BGM_TRACKS.kindness;
  if (stage === "yeoniReveal" || stage === "teaIntro" || stage === "teaSelect" || stage === "teaCupRitual" || stage === "questionInput") {
    return FORTUNE_TEA_BGM_TRACKS.gentleOrientalGirl;
  }
  return FORTUNE_TEA_BGM_TRACKS.moonlitTeaHouse;
}

function logSubmitStep(message: string, payload?: unknown) {
  if (process.env.NODE_ENV !== "production") {
    if (typeof payload === "undefined") console.info(`[FortuneTeaHouse Submit] ${message}`);
    else console.info(`[FortuneTeaHouse Submit] ${message}`, payload);
  }
}

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
  const [honeyDrops, setHoneyDrops] = useState<FortuneTeaHouseHoneyDropsState | null>(null);
  const [honeyRewardBurstKey, setHoneyRewardBurstKey] = useState(0);
  const [honeyRewardMessage, setHoneyRewardMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [loadingBgmIndex, setLoadingBgmIndex] = useState(0);
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const enterTimerRef = useRef<number | null>(null);
  const consultRunRef = useRef(0);
  const submitLockRef = useRef(false);
  const loadingBgmIndexRef = useRef(0);
  const currentBgmTrack = stage === "scentLoading" ? FORTUNE_TEA_LOADING_PLAYLIST[loadingBgmIndex] : getFortuneTeaBgmTrack(stage);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const audio = bgmAudioRef.current;
    if (audio) audio.volume = FORTUNE_TEA_BGM_TRACKS.moonlitTeaHouse.volume;

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
    let cancelled = false;
    const abortController = new AbortController();
    setHoneyDrops(readGuestHoneyDrops());

    const syncServerHoneyDrops = () => {
      fetch("/api/fortune-tea-house/honey-drops", {
        cache: "no-store",
        signal: abortController.signal,
      })
        .then(async (response) => {
          if (!response.ok) return null;
          const payload = (await response.json().catch(() => null)) as { ok?: boolean; honeyDrops?: FortuneTeaHouseHoneyDropsState } | null;
          return payload?.ok ? normalizeHoneyDropsState(payload.honeyDrops) : null;
        })
        .then((serverHoneyDrops) => {
          if (!cancelled && serverHoneyDrops?.authenticated) setHoneyDrops(serverHoneyDrops);
        })
        .catch(() => {
          void 0;
        });
    };

    const idleWindow = window as BrowserIdleWindow;
    const idleCallbackId = idleWindow.requestIdleCallback?.(syncServerHoneyDrops, { timeout: 2500 }) ?? null;
    const fallbackTimerId = idleCallbackId === null ? window.setTimeout(syncServerHoneyDrops, 1200) : null;

    return () => {
      cancelled = true;
      abortController.abort();
      if (idleCallbackId !== null) idleWindow.cancelIdleCallback?.(idleCallbackId);
      if (fallbackTimerId !== null) window.clearTimeout(fallbackTimerId);
    };
  }, []);

  useEffect(() => {
    setNotice("");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [stage]);

  const playBgm = useCallback(async (forceEnabled = false, trackOverride?: FortuneTeaBgmTrack) => {
    const audio = bgmAudioRef.current;
    if (!audio || (!forceEnabled && !bgmEnabled) || !isBgmPreferenceReady) return;
    const nextTrack = trackOverride ?? currentBgmTrack;
    try {
      audio.volume = nextTrack.volume;
      if (audio.src !== nextTrack.url) {
        audio.src = nextTrack.url;
        audio.load();
      }
      await audio.play();
      setBgmStatus("playing");
    } catch {
      setBgmStatus("blocked");
    }
  }, [bgmEnabled, currentBgmTrack.url, currentBgmTrack.volume, isBgmPreferenceReady]);

  useEffect(() => {
    loadingBgmIndexRef.current = 0;
    setLoadingBgmIndex(0);
  }, [stage]);

  useEffect(() => {
    const audio = bgmAudioRef.current;
    if (!audio) return;

    const playNextLoadingTrack = () => {
      if (stage !== "scentLoading" || !bgmEnabled) return;
      const nextIndex = (loadingBgmIndexRef.current + 1) % FORTUNE_TEA_LOADING_PLAYLIST.length;
      const nextTrack = FORTUNE_TEA_LOADING_PLAYLIST[nextIndex];
      loadingBgmIndexRef.current = nextIndex;
      setLoadingBgmIndex(nextIndex);
      void playBgm(false, nextTrack);
    };

    audio.addEventListener("ended", playNextLoadingTrack);
    return () => {
      audio.removeEventListener("ended", playNextLoadingTrack);
    };
  }, [bgmEnabled, playBgm, stage]);

  useEffect(() => {
    const audio = bgmAudioRef.current;
    if (!audio || !isBgmPreferenceReady) return;
    if (!bgmEnabled) {
      audio.pause();
      setBgmStatus("off");
      return;
    }
    if (!audio.paused) {
      void playBgm();
      return;
    }
    setBgmStatus("idle");
  }, [bgmEnabled, currentBgmTrack.key, isBgmPreferenceReady, playBgm]);

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
      void playBgm(true);
    }
  }

  function enterTeaHouse() {
    if (isEnteringTeaHouse) return;
    void playBgm();
    setIsEnteringTeaHouse(true);
    enterTimerRef.current = window.setTimeout(() => {
      setIsEnteringTeaHouse(false);
      goToStage("doorOpened");
    }, 1280);
  }

  function restartConsultation() {
    consultRunRef.current += 1;
    submitLockRef.current = false;
    setIsSubmitting(false);
    setSubmitError("");
    setQuestionInput({});
    setConsultResult(null);
    setStage("teaSelect");
  }

  function returnToLanding() {
    consultRunRef.current += 1;
    submitLockRef.current = false;
    if (enterTimerRef.current) {
      window.clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }
    setIsEnteringTeaHouse(false);
    setSelectedCup(null);
    setQuestionInput({});
    setConsultResult(null);
    setIsSubmitting(false);
    setSubmitError("");
    setStage("landing");
  }

  function showReadyNotice(message: string = teaHouseCtaCopy.notice) {
    setNotice(message);
  }

  function selectTeaCup(cup: TeaHouseCup) {
    setSelectedCup(cup);
    setConsultResult(null);
    setSubmitError("");
    goToStage("teaCupRitual");
  }

  async function submitQuestion(nextQuestionInput: FortuneTeaHouseQuestionInput) {
    if (isSubmitting || submitLockRef.current) return;
    logSubmitStep("start");
    logSubmitStep("selectedCup", selectedCup);
    logSubmitStep("input", nextQuestionInput);

    if (!selectedCup) {
      goToStage("teaSelect");
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    setSubmitError("");
    setQuestionInput(nextQuestionInput);
    setConsultResult(null);
    goToStage("scentLoading");
    const consultRunId = consultRunRef.current + 1;
    consultRunRef.current = consultRunId;

    try {
      const startedAt = Date.now();
      const localDraft = buildFortuneTeaHouseConsultResult({
        consultationMode: nextQuestionInput.consultationMode,
        selectedTeaCupId: selectedCup.id,
        selectedTeaCupName: selectedCup.name,
        selectedTeaCupTopic: selectedCup.topic,
        nickname: nextQuestionInput.nickname,
        concernTopic: nextQuestionInput.concernTopic,
        birthInfo: nextQuestionInput.birthInfo,
        birthDate: nextQuestionInput.birthDate,
        birthTime: nextQuestionInput.birthTime,
        gender: nextQuestionInput.gender,
        calendarType: nextQuestionInput.calendarType,
        sukuyo: nextQuestionInput.sukuyo,
        question: nextQuestionInput.question,
      });
      const requestPayload: FortuneTeaHouseConsultRequest = {
        consultationMode: nextQuestionInput.consultationMode,
        selectedTeaCupId: selectedCup.id,
        selectedTeaCupName: selectedCup.name,
        selectedTeaCupTopic: selectedCup.topic,
        nickname: nextQuestionInput.nickname,
        concernTopic: nextQuestionInput.concernTopic,
        birthInfo: nextQuestionInput.birthInfo,
        birthDate: nextQuestionInput.birthDate,
        birthTime: nextQuestionInput.birthTime,
        gender: nextQuestionInput.gender,
        calendarType: nextQuestionInput.calendarType,
        sukuyo: nextQuestionInput.sukuyo,
        question: nextQuestionInput.question,
      };
      const attemptId = createFortuneTeaAttemptId(requestPayload);
      const requestPayloadWithAttempt: FortuneTeaHouseConsultRequest = {
        ...requestPayload,
        attemptId,
      };
      logSubmitStep("api result start");
      const response = await fetch("/api/fortune-tea-house/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...requestPayloadWithAttempt, draftResult: localDraft }),
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as FortuneTeaHouseConsultApiResponse;
      if (!response.ok || !payload.ok || !payload.result) {
        throw new Error(payload.message || "연이가 상담문을 엮는 중 잠시 멈췄어요. 다시 한 번만 건네주세요.");
      }
      logSubmitStep("api result success", payload.generationMeta);

      const remainingDelay = Math.max(0, 1300 - (Date.now() - startedAt));
      if (remainingDelay > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, remainingDelay));
      }

      if (consultRunRef.current !== consultRunId) return;
      const resultId = payload.result.resultId || attemptId;
      const serverHoneyDrops = normalizeHoneyDropsState(payload.honeyDrops);
      const nextHoneyDrops = serverHoneyDrops || applyGuestHoneyDropReward(resultId);
      const nextResult = attachHoneyBonusAdvice(
        { ...payload.result, resultId, consultationMode: nextQuestionInput.consultationMode },
        nextHoneyDrops,
      );
      setHoneyDrops(nextHoneyDrops);
      if (nextHoneyDrops.earnedThisResult) {
        setHoneyRewardMessage(pickHoneyDropMessage(nextHoneyDrops));
        setHoneyRewardBurstKey((key) => key + 1);
      }
      setConsultResult(nextResult);
      if (payload.generationMeta?.mode === "local_fallback") {
        setNotice(
          nextQuestionInput.consultationMode === "saju"
            ? "연이가 사주의 드러난 흐름을 먼저 짚어 상담을 이어갔어요."
            : nextQuestionInput.consultationMode === "sukuyo"
              ? "연이가 27숙 인연의 흐름을 먼저 짚어 상담을 이어갔어요."
              : "연이가 타로의 향을 먼저 엮어 상담을 이어갔어요.",
        );
      }
      if (nextQuestionInput.consultationMode === "saju" || nextQuestionInput.consultationMode === "sukuyo") {
        logSubmitStep("go result");
        goToStage("result");
        return;
      }
      logSubmitStep("go tarotReveal");
      goToStage("tarotReveal");
    } catch (error) {
      if (consultRunRef.current !== consultRunId) return;
      logSubmitStep("error", error);
      setSubmitError("찻잔의 향이 잠시 흐려졌어요. 다시 한 번만 건네주세요.");
      goToStage("questionInput");
    } finally {
      if (consultRunRef.current === consultRunId) {
        setIsSubmitting(false);
        submitLockRef.current = false;
      }
    }
  }

  function renderRecoveryCard(message: string) {
    return (
      <section className={styles.consultErrorScene} aria-labelledby="fortuneTeaRecoveryTitle">
        <div className={styles.consultErrorCard}>
          <p className={styles.sceneEyebrow}>달빛이 잠시 흐려졌어요</p>
          <h2 id="fortuneTeaRecoveryTitle">빈 화면 대신 찻잔을 다시 데울게요</h2>
          <p>{message}</p>
          <div className={styles.storyActions}>
            <TeaHouseButton variant="ghost" onClick={() => goToStage("teaSelect")}>
              찻잔 다시 고르기
            </TeaHouseButton>
          </div>
        </div>
      </section>
    );
  }

  function renderScene() {
    if (stage === "landing") {
      return (
        <FortuneTeaHouseLanding
          onEnter={enterTeaHouse}
          onShowHistory={() => showReadyNotice("상담 기록은 아직 준비 중이에요.")}
        />
      );
    }

    if (isTeaHouseEntryStage(stage)) {
      return <TeaHouseEntryScene stage={stage} onStageChange={goToStage} onComplete={() => goToStage("teaSelect")} />;
    }

    if (stage === "teaSelect") {
      return <TeaCupSelectionScene selectedCupId={selectedCup?.id} onSelect={selectTeaCup} />;
    }

    if (stage === "teaCupRitual" && selectedCup) {
      return <TeaCupRitualScene selectedCup={selectedCup} onBack={() => goToStage("teaSelect")} onConfirm={() => goToStage("questionInput")} />;
    }

    if (stage === "questionInput" && selectedCup) {
      return (
        <QuestionInputScene
          selectedCup={selectedCup}
          initialInput={questionInput}
          onBack={() => goToStage("teaSelect")}
          onSubmit={submitQuestion}
          isSubmitting={isSubmitting}
          submitError={submitError}
        />
      );
    }

    if (stage === "scentLoading") {
      return <ScentLoadingScene selectedCup={selectedCup} consultationMode={questionInput.consultationMode} />;
    }

    if (stage === "tarotReveal" && consultResult) {
      return <TarotRevealScene result={consultResult} onComplete={() => goToStage("result")} />;
    }

    if (stage === "tarotReveal") {
      return renderRecoveryCard("카드가 떠오르기 전에 상담 결과가 사라졌어요. 찻잔을 다시 골라 이어갈게요.");
    }

    if (stage === "result" && consultResult) {
      return (
        <TeaHouseResultSheet
          result={consultResult}
          onRestart={restartConsultation}
          onReady={() => showReadyNotice("저장은 아직 준비 중이에요. 오늘은 이 결과를 화면에서 천천히 읽어 주세요.")}
          onShowTarot={() => goToStage("tarotReveal")}
          onEditBirthInfo={() => goToStage("questionInput")}
        />
      );
    }

    if (stage === "result") {
      return renderRecoveryCard("결과 시트가 열리기 전에 상담 기록이 흐려졌어요. 다시 한 번 차를 데워볼게요.");
    }

    return <TeaCupSelectionScene selectedCupId={selectedCup?.id} onSelect={selectTeaCup} />;
  }

  return (
    <FortuneTeaHouseImmersiveShell stage={stage} notice={notice} onBackToLanding={returnToLanding}>
      <audio
        ref={bgmAudioRef}
        className={styles.bgmAudio}
        data-track={currentBgmTrack.key}
        loop={stage !== "scentLoading"}
        preload="none"
      />
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

      {stage === "landing" ? (
        <HoneyDropRewardOverlay
          honeyDrops={honeyDrops}
          burstKey={honeyRewardBurstKey}
          message={honeyRewardMessage}
        />
      ) : null}

      <div className={styles.entryTransition} data-active={isEnteringTeaHouse ? "true" : "false"} aria-hidden>
        <AssetImage
          className={`${styles.entryTransitionImage} ${styles.entryTransitionImageDesktop}`}
          imageClassName={styles.entryTransitionImageAsset}
          src={fortuneTeaHouseAssets.backgrounds.loadingDesktop}
          alt=""
          priority
        />
        <AssetImage
          className={`${styles.entryTransitionImage} ${styles.entryTransitionImageMobile}`}
          imageClassName={styles.entryTransitionImageAsset}
          src={fortuneTeaHouseAssets.backgrounds.loadingMobile}
          alt=""
          priority
        />
        <span className={styles.entryTransitionRing} />
        <div className={styles.entryLoadingPanel}>
          <strong>LOADING...</strong>
          <p className={styles.entryLoadingPanelMessage}>달빛이 찻집의 문을 조용히 열고 있어요.</p>
          <p>달빛 찻집의 문이 열립니다</p>
          <i />
        </div>
      </div>

      <div className={styles.sceneFrame} aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={stage}
            className={styles.sceneStage}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.992 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.996 }}
            transition={{ duration: reduceMotion ? 0.16 : 0.36, ease: [0.22, 1, 0.36, 1] }}
          >
            {renderScene()}
          </motion.div>
        </AnimatePresence>
      </div>
      <FortuneTeaHouseDebugPanel
        stage={stage}
        selectedCup={selectedCup}
        questionInput={questionInput}
        consultResult={consultResult}
        lastError={submitError}
        isSubmitting={isSubmitting}
      />
    </FortuneTeaHouseImmersiveShell>
  );
}
