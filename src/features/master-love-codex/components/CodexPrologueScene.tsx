"use client";

/**
 * 프롤로그 렌더러.
 *
 * stage 는 부모가 소유하고(리프트), 여기서는 씬 안의 line 커서만 갖는다.
 * "question" 씬에서만 선택지 4종을 노출하고 고른 값을 부모로 올린다.
 * 배경 잉크와 별빛은 CodexShell 이 담당하므로 여기서는 도서관 사진만 은은히 겹친다.
 */

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import CodexDialogueBox from "./CodexDialogueBox";
import CodexReveal from "./CodexReveal";
import { getNarratorAsset, masterLoveCodexAssets } from "../data/assets";
import {
  codexPrologueChoices,
  codexPrologueScenes,
  getNextCodexPrologueStage,
  type CodexPrologueChoiceKey,
  type CodexPrologueStage,
} from "../data/prologue";
import { useMasterLoveCodexCopy } from "../_lib/copy";
import { useCodexContentCopy } from "../_lib/contentCopy";
import styles from "../styles/codex.module.css";

interface CodexPrologueSceneProps {
  stage: CodexPrologueStage;
  onStageChange: (stage: CodexPrologueStage) => void;
  onChoice: (choice: CodexPrologueChoiceKey) => void;
  onComplete: () => void;
  onSkip: () => void;
}

/**
 * 사전이 덮으면 안 되는 필드. 🔴 `stage`·`effect`·`background`·`actor` 는 흐름과 연출을 가르는
 * 판별자이고, `speaker`·`mood` 는 대사창 스타일과 화자 이미지를 고르는 키다. `key` 는 선택지
 * 식별자로 부모에게 올라간다 — 사전이 덮으면 씬이 안 넘어가거나 선택이 안 잡힌다.
 * (화면에 그리는 화자 이름은 `_lib/copy.ts` 의 `narratorName` 이 따로 갖는다.)
 */
const PROLOGUE_SKIP_KEYS = ["stage", "actor", "background", "effect", "speaker", "mood", "key"];

/** 씬 연출 강도 → 도서관 사진 투명도 */
const BACKDROP_OPACITY: Record<string, number> = {
  stars: 0.08,
  candle: 0.2,
  reveal: 0.34,
  none: 0.3,
};

export default function CodexPrologueScene({ stage, onStageChange, onChoice, onComplete, onSkip }: CodexPrologueSceneProps) {
  const copy = useMasterLoveCodexCopy();
  const scenes = useCodexContentCopy("prologueScenes", codexPrologueScenes, { skipKeys: PROLOGUE_SKIP_KEYS });
  const choices = useCodexContentCopy("prologueChoices", codexPrologueChoices, { skipKeys: PROLOGUE_SKIP_KEYS });
  const scene = useMemo(() => scenes.find((item) => item.stage === stage) || scenes[0], [scenes, stage]);
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
  const sceneNumber = scenes.findIndex((item) => item.stage === scene.stage) + 1;

  function goNext() {
    if (isChoiceStage && !choiceKey) return;
    if (!isLastLine) {
      setLineIndex((current) => current + 1);
      return;
    }
    const next = getNextCodexPrologueStage(scene.stage);
    if (next) { onStageChange(next); return; }
    onComplete();
  }

  function selectChoice(key: CodexPrologueChoiceKey) {
    setChoiceKey(key);
    onChoice(key);
  }

  const selectedReply = choiceKey ? choices.find((item) => item.key === choiceKey)?.reply || "" : "";

  return (
    <section className="relative flex min-h-[100svh] flex-col" aria-label={copy.prologueAriaLabel}>
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
        style={{
          backgroundImage: `url("${masterLoveCodexAssets.backgrounds[scene.background]}")`,
          opacity: BACKDROP_OPACITY[scene.effect] ?? 0.28,
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-1 flex-col">
        <header className="flex items-start justify-between gap-6 px-[var(--codex-gutter)] pt-6">
          <p className={`${styles.numeral} text-[0.6875rem]`} style={{ letterSpacing: "0.24em", color: "var(--codex-ink-text-muted)" }}>
            {sceneNumber} / {scenes.length}
          </p>
          <button type="button" onClick={onSkip} className={styles.quiet}>
            {copy.prologueSkipButton}
          </button>
        </header>

        <div className="pointer-events-none flex flex-1 items-end justify-center px-[var(--codex-gutter)] pb-6">
          {scene.actor === "narrator" ? (
            <Image
              src={getNarratorAsset(line?.mood)}
              alt={copy.narratorName}
              width={520}
              height={720}
              unoptimized
              priority
              className="h-[36svh] w-auto max-w-[78vw] object-contain transition-opacity duration-500 sm:h-[44svh]"
              style={{ filter: "drop-shadow(0 26px 52px rgba(0,0,0,.7))" }}
            />
          ) : null}
          {scene.actor === "book" ? (
            <Image
              src={masterLoveCodexAssets.cover}
              alt={copy.prologueSceneAlt(scene.title)}
              width={640}
              height={427}
              unoptimized
              className="w-[min(78vw,420px)] object-cover"
              style={{ borderRadius: 2, boxShadow: "0 0 40px -5px rgba(216,179,108,.35)" }}
            />
          ) : null}
        </div>

        <div className={`${styles.measure} pb-12`}>
          <CodexReveal>
            <p className={`${styles.numeral} text-[0.6875rem]`} style={{ letterSpacing: "0.24em", color: "var(--codex-gold-dim)" }}>
              {scene.eyebrow}
            </p>
            <h2 className={`${styles.chapterTitle} mt-3`}>{scene.title}</h2>
          </CodexReveal>

          {isChoiceStage ? (
            <div className="mt-8 grid gap-2 sm:grid-cols-2">
              {choices.map((choice) => (
                <button
                  key={choice.key}
                  type="button"
                  onClick={() => selectChoice(choice.key)}
                  aria-pressed={choiceKey === choice.key}
                  className={`${styles.choice} text-left`}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-8">
            <CodexDialogueBox
              speaker={line?.speaker || "narration"}
              text={isChoiceStage && selectedReply ? selectedReply : line?.text || ""}
              cta={isChoiceStage ? copy.prologueOpenBookButton : line?.cta}
              onAdvance={goNext}
              isAdvanceDisabled={isChoiceStage && !choiceKey}
              onTextComplete={setTextComplete}
            />
          </div>

          {isChoiceStage && !choiceKey ? (
            <p className="mt-6 text-center text-[0.8125rem]" style={{ color: "var(--codex-ink-text-muted)" }}>
              {copy.prologueChoiceHint}
            </p>
          ) : null}

          {textComplete && (!isChoiceStage || choiceKey) ? (
            <div className="mt-9 flex justify-center">
              <button type="button" onClick={goNext} className={styles.cta}>
                {isChoiceStage ? copy.prologueOpenBookButton : line?.cta || copy.prologueContinueButton}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
