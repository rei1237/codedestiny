"use client";

/**
 * 마스터 운명 연애 비책 — 프롤로그 렌더러.
 *
 * stage 는 부모가 소유하고(리프트), 이 컴포넌트는 씬 안의 line 커서만 갖는다.
 * "question" 씬에서만 선택지 4종을 노출하고, 고른 값을 부모로 올린다.
 */

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import CodexDialogueBox from "./CodexDialogueBox";
import { getNarratorAsset, masterLoveCodexAssets } from "../data/assets";
import {
  codexPrologueChoices,
  codexPrologueScenes,
  getCodexPrologueScene,
  getNextCodexPrologueStage,
  type CodexPrologueChoiceKey,
  type CodexPrologueStage,
} from "../data/prologue";

interface CodexPrologueSceneProps {
  stage: CodexPrologueStage;
  onStageChange: (stage: CodexPrologueStage) => void;
  onChoice: (choice: CodexPrologueChoiceKey) => void;
  onComplete: () => void;
  onSkip: () => void;
}

export default function CodexPrologueScene({ stage, onStageChange, onChoice, onComplete, onSkip }: CodexPrologueSceneProps) {
  const scene = useMemo(() => getCodexPrologueScene(stage), [stage]);
  const [lineIndex, setLineIndex] = useState(0);
  const [textComplete, setTextComplete] = useState(false);
  const [choiceKey, setChoiceKey] = useState<CodexPrologueChoiceKey | null>(null);

  useEffect(() => {
    setLineIndex(0);
    setTextComplete(false);
    setChoiceKey(null);
  }, [stage]);

  const line = scene.lines[Math.min(lineIndex, scene.lines.length - 1)];
  const isLastLine = lineIndex >= scene.lines.length - 1;
  const isChoiceStage = scene.stage === "question";
  const sceneNumber = codexPrologueScenes.findIndex((item) => item.stage === scene.stage) + 1;

  function goNext() {
    if (isChoiceStage && !choiceKey) return;
    if (!isLastLine) {
      setLineIndex((current) => current + 1);
      return;
    }
    const next = getNextCodexPrologueStage(scene.stage);
    if (next) {
      onStageChange(next);
      return;
    }
    onComplete();
  }

  function selectChoice(key: CodexPrologueChoiceKey) {
    setChoiceKey(key);
    onChoice(key);
  }

  const selectedReply = choiceKey ? codexPrologueChoices.find((item) => item.key === choiceKey)?.reply || "" : "";
  const backgroundUrl = masterLoveCodexAssets.backgrounds[scene.background];

  return (
    <section className="relative flex min-h-[100svh] flex-col overflow-hidden bg-[#0d0714]" aria-label="마스터 운명 연애 비책 프롤로그">
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
        style={{
          backgroundImage: `url("${backgroundUrl}")`,
          opacity: scene.effect === "stars" ? 0.18 : scene.effect === "candle" ? 0.38 : 0.62,
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            scene.effect === "candle"
              ? "radial-gradient(circle at 50% 62%, rgba(255,206,140,.26), transparent 46%), linear-gradient(180deg, rgba(13,7,20,.94), rgba(13,7,20,.78) 40%, rgba(13,7,20,.96))"
              : "radial-gradient(circle at 50% 18%, rgba(196,141,255,.14), transparent 52%), linear-gradient(180deg, rgba(13,7,20,.9), rgba(13,7,20,.62) 38%, rgba(13,7,20,.97))",
        }}
        aria-hidden="true"
      />
      {scene.effect === "stars" ? <StarField /> : null}

      <div className="relative z-10 flex flex-1 flex-col justify-between px-5 pb-6 pt-6 sm:px-8 sm:pb-10 sm:pt-10">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.3em] text-amber-100/70">{scene.eyebrow}</p>
            <h1 className="font-display mt-2 max-w-md text-lg font-black leading-snug text-rose-50 sm:text-2xl">{scene.title}</h1>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="rounded-full border border-amber-200/25 px-3 py-1 text-[11px] font-bold text-amber-100/70">
              {sceneNumber} / {codexPrologueScenes.length}
            </span>
            <button
              type="button"
              onClick={onSkip}
              className="rounded-full border border-rose-100/20 px-3 py-1 text-[11px] font-bold text-rose-100/60 transition hover:border-rose-100/40 hover:text-rose-50"
            >
              건너뛰기
            </button>
          </div>
        </header>

        <div className="pointer-events-none flex flex-1 items-end justify-center pb-4">
          {scene.actor === "narrator" ? (
            <Image
              src={getNarratorAsset(line?.mood)}
              alt="운명의 안내자 박지은"
              width={520}
              height={720}
              unoptimized
              priority
              className="h-[38svh] w-auto max-w-[78vw] object-contain drop-shadow-[0_24px_48px_rgba(0,0,0,.6)] transition-opacity duration-500 sm:h-[46svh]"
            />
          ) : null}
          {scene.actor === "book" ? (
            <Image
              src={masterLoveCodexAssets.cover}
              alt="마스터 운명 연애 비책"
              width={640}
              height={427}
              unoptimized
              className="w-[min(80vw,420px)] rounded-2xl border border-amber-200/30 object-cover shadow-[0_30px_70px_-24px_rgba(0,0,0,.85)]"
            />
          ) : null}
        </div>

        <div className="mx-auto w-full max-w-2xl space-y-4">
          {isChoiceStage ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {codexPrologueChoices.map((choice) => (
                <button
                  key={choice.key}
                  type="button"
                  onClick={() => selectChoice(choice.key)}
                  aria-pressed={choiceKey === choice.key}
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${
                    choiceKey === choice.key
                      ? "border-amber-200/70 bg-amber-200/15 text-amber-50"
                      : "border-rose-100/20 bg-[#150b1e]/70 text-rose-50/85 hover:border-amber-200/45 hover:text-amber-50"
                  }`}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          ) : null}

          <CodexDialogueBox
            speaker={line?.speaker || "narration"}
            text={isChoiceStage && selectedReply ? selectedReply : line?.text || ""}
            cta={isChoiceStage ? "책을 펼치기" : line?.cta}
            onAdvance={goNext}
            isAdvanceDisabled={isChoiceStage && !choiceKey}
            onTextComplete={setTextComplete}
          />

          {isChoiceStage && !choiceKey ? (
            <p className="text-center text-xs text-rose-100/55">한 가지를 고르면 박지은이 답합니다.</p>
          ) : null}

          {!isChoiceStage && textComplete ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={goNext}
                className="rounded-full bg-gradient-to-r from-amber-200 via-rose-200 to-amber-100 px-6 py-2.5 text-sm font-black text-[#2b1020] shadow-[0_14px_30px_-14px_rgba(255,214,150,.7)] transition hover:brightness-105"
              >
                {line?.cta || "계속"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/** 암전 씬 전용 별빛. 좌표는 고정 배열이라 매 렌더 흔들리지 않는다. */
const STAR_POSITIONS = [
  { top: "12%", left: "18%", delay: "0s" }, { top: "22%", left: "72%", delay: ".4s" },
  { top: "31%", left: "38%", delay: ".9s" }, { top: "18%", left: "54%", delay: "1.3s" },
  { top: "44%", left: "82%", delay: ".2s" }, { top: "38%", left: "12%", delay: "1.1s" },
  { top: "56%", left: "64%", delay: ".7s" }, { top: "27%", left: "88%", delay: "1.6s" },
  { top: "49%", left: "46%", delay: "1.9s" }, { top: "62%", left: "26%", delay: ".5s" },
];

function StarField() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {STAR_POSITIONS.map((star) => (
        <span
          key={`${star.top}-${star.left}`}
          className="absolute h-1 w-1 rounded-full bg-amber-100 shadow-[0_0_10px_2px_rgba(255,236,190,.55)] motion-safe:animate-pulse"
          style={{ top: star.top, left: star.left, animationDelay: star.delay }}
        />
      ))}
    </div>
  );
}
