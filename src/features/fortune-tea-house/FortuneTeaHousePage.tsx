"use client";

import { useEffect, useState } from "react";
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
import type { FortuneTeaHouseConsultResponse, FortuneTeaHouseQuestionInput } from "./data/consult";
import { getTeaHouseSteps, teaHouseCtaCopy, teaHouseStageOrder, type TeaHouseStage } from "./data/story";
import type { TeaHouseCup } from "./data/teaCups";
import { buildFortuneTeaHouseConsultResult } from "./lib/buildConsultResult";
import styles from "./styles/fortune-tea-house.module.css";

const stageLabels: Record<TeaHouseStage, string> = {
  landing: "입구",
  pigIntro: "문 앞",
  transform: "변신",
  yeoniIntro: "연이",
  teaSelect: "선택",
  questionInput: "질문",
  scentLoading: "향",
  tarotReveal: "카드",
  result: "결과",
};

export default function FortuneTeaHousePage() {
  const [stage, setStage] = useState<TeaHouseStage>("landing");
  const [notice, setNotice] = useState("");
  const [selectedCup, setSelectedCup] = useState<TeaHouseCup | null>(null);
  const [questionInput, setQuestionInput] = useState<Partial<FortuneTeaHouseQuestionInput>>({});
  const [consultResult, setConsultResult] = useState<FortuneTeaHouseConsultResponse | null>(null);
  const stageIndex = teaHouseStageOrder.indexOf(stage);

  useEffect(() => {
    setNotice("");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [stage]);

  function goToStage(nextStage: TeaHouseStage) {
    setStage(nextStage);
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
        <nav className={styles.stageDots} aria-label="운명의 찻집 진행 단계">
          {teaHouseStageOrder.map((item, index) => (
            <span
              key={item}
              className={styles.stageDot}
              data-active={item === stage ? "true" : "false"}
              data-complete={index < stageIndex ? "true" : "false"}
              aria-label={stageLabels[item]}
            />
          ))}
        </nav>

        <div className={styles.sceneFrame} aria-live="polite">
          {stage === "landing" ? <FortuneTeaHouseLanding onEnter={() => goToStage("pigIntro")} /> : null}
          {stage === "pigIntro" ? (
            <TeaHouseStoryIntro
              steps={getTeaHouseSteps("pigIntro")}
              eyebrow="문 앞에서 들려온 작은 목소리"
              title="꽃돼지?가 당신의 마음 향을 맡습니다"
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
