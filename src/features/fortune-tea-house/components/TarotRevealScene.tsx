"use client";

import { useEffect, useMemo, useState } from "react";
import type { FortuneTeaHouseConsultResponse, FortuneTeaTarotSpreadCard } from "../data/consult";
import { getFortuneTeaHouseRevealButtonLabel } from "../data/consultPricing";
import { getTeaHouseCupById, teaHouseCups } from "../data/teaCups";
import { majorArcanaCards } from "../data/tarotCards";
import { localizeConsultResult } from "../lib/localizeConsultResult";
import { tarotSpreadPositions } from "../lib/tarotAdapter";
import { usePrefersReducedMotion } from "../lib/usePrefersReducedMotion";
import TarotCardBack from "./TarotCardBack";
import TarotAssetCard from "./TarotAssetCard";
import TeaHouseButton from "./TeaHouseButton";
import TeaHouseDialogueBox from "./TeaHouseDialogueBox";
import styles from "../styles/fortune-tea-house.module.css";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";

type TarotRevealSceneProps = {
  result: FortuneTeaHouseConsultResponse;
  onComplete: () => void;
};

type TarotRevealPhase = "preparing" | "shuffling" | "choosing" | "complete";

const deckSlotsByCount: Record<number, string[]> = {
  3: ["left", "center", "right"],
  5: ["far-left", "left", "center", "right", "far-right"],
};
const tarotRevealSceneUi =
  "relative isolate min-h-svh overflow-hidden bg-[#080511] text-[#fffaf1] antialiased";
const tarotRevealPanelUi =
  "relative overflow-hidden rounded-[30px] border border-[#f6dfb7]/25 bg-gradient-to-br from-[#241337]/90 via-[#12091f]/90 to-[#080511]/95 shadow-[0_38px_108px_rgba(4,2,12,0.54),0_0_62px_rgba(206,196,255,0.14),inset_0_1px_0_rgba(255,255,255,0.16)] ring-1 ring-white/10 backdrop-blur-2xl";
const tarotDialogueUi =
  "border-[#d7d4ff]/25 bg-[#12091f]/70 shadow-[0_24px_70px_rgba(4,2,12,0.36),0_0_44px_rgba(206,196,255,0.14),inset_0_1px_0_rgba(255,255,255,0.14)]";
const tarotDeckUi =
  "rounded-[28px] border border-[#f6dfb7]/10 bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_20px_64px_rgba(4,2,12,0.18)]";
const tarotDeckCardUi =
  "drop-shadow-[0_24px_34px_rgba(4,2,12,0.38)] transition duration-500 focus-visible:ring-2 focus-visible:ring-[#ffe8a6]/80 focus-visible:ring-offset-4 focus-visible:ring-offset-[#080511]";
const tarotActionBarUi =
  "rounded-2xl border border-[#f6dfb7]/20 bg-[#0e0719]/60 px-4 py-3 shadow-[0_18px_48px_rgba(4,2,12,0.24),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-white/5 backdrop-blur-xl";

const getInitialRevealPhase = (prefersReducedMotion: boolean): TarotRevealPhase => (prefersReducedMotion ? "choosing" : "preparing");

function buildRevealCards(result: FortuneTeaHouseConsultResponse): FortuneTeaTarotSpreadCard[] {
  if (result.tarotSpreadCards?.length) return result.tarotSpreadCards;

  return [
    {
      ...result.tarot,
      positionId: "representative",
      positionLabel: "대표",
      positionMeaning: "지금 질문에 가장 먼저 떠오른 카드입니다.",
      reading: result.tarot.reading,
      source: "existing-card-data",
    },
  ];
}

/** 화면에 보이는 한국어 원문. 사전에 같은 경로의 값이 있으면 그것이 이긴다.
    {count}·{total}·{name}·{orientation}·{label}·{state} 는 런타임 치환 자리다 — 모든 로케일에서 그대로 둘 것.
    스프레드가 한 장뿐일 때 세우는 대표 카드의 위치 문구도 여기 있다(representativeLabel·representativeMeaning). */
/* 찻잔 상수의 id·CSS 토큰은 문구가 아니다. */
const CUP_SKIP_KEYS = ["id", "particleTone", "accent"];
/* 카드 정체성(id·영문명)과 주제 매칭 힌트는 화면 문구가 아니다. */
const CONSULT_CARD_SKIP_KEYS = ["id", "nameEn", "topicHints"];
const SPREAD_POSITION_SKIP_KEYS = ["positionId"];

const KO = {
  upright: "정방향",
  representativeLabel: "대표",
  representativeMeaning: "지금 질문에 가장 먼저 떠오른 카드입니다.",
  reversed: "역방향",
  title: "찻잔 위에 카드가 떠올랐어요",
  deckAria: "운명의 카드 선택",
  cardAria: "{label} 카드 {state}",
  revealed: "공개됨",
  flip: "뒤집기",
  choiceHint: "카드는 한 장씩 뒤집히고, 모두 열리면 결과가 준비돼요.",
  dialogue: {
    preparing: "카드는 정답을 명령하지 않아요.\n지금 마음이 바라보는 방향을 조용히 비출 뿐이에요.",
    shuffling: "달빛 아래에서 카드들이 섞이고 있어요.\n질문의 향을 한 장씩 내려놓는 중이에요.",
    choosingSome: "{count}장을 펼쳤어요.\n남은 카드도 마음이 닿는 순서대로 천천히 열어 주세요.",
    choosingNone: "{total}장의 카드가 같은 질문을 바라보고 있어요.\n마음이 먼저 닿는 카드부터 하나씩 열어 주세요.",
    complete: "{name} {orientation}을 중심으로 {total}장의 흐름이 모두 열렸어요.\n이제 연이가 각 자리의 뜻을 묶어 읽어볼게요.",
  },
  phase: {
    shuffling: "카드가 섞이는 중",
    choosing: "{count}/{total}장 공개",
    complete: "모든 카드 공개 완료",
  },
};

export default function TarotRevealScene({ result: rawResult, onComplete }: TarotRevealSceneProps) {
  const copy = useTeaHouseCopy("tarotReveal", KO);
  const cups = useTeaHouseCopy("teaCups", teaHouseCups, { skipKeys: CUP_SKIP_KEYS });
  const consultCards = useTeaHouseCopy("consultTarotCards", majorArcanaCards, { skipKeys: CONSULT_CARD_SKIP_KEYS });
  const spreadPositions = useTeaHouseCopy("tarotSpreadPositions", tarotSpreadPositions, { skipKeys: SPREAD_POSITION_SKIP_KEYS });
  const prefersReducedMotion = usePrefersReducedMotion();
  // 카드 정체성·찻잔은 워커가 LLM 출력으로 덮지 않고 한국어 초안 그대로 고정한다.
  // 그래서 그리기 직전에 id 로 사전을 다시 조회한다 — payload 자체는 건드리지 않는다.
  const result = useMemo(
    () => localizeConsultResult(rawResult, {
      cups,
      cards: consultCards,
      positions: spreadPositions,
      representativePosition: { positionLabel: copy.representativeLabel, positionMeaning: copy.representativeMeaning },
    }),
    [rawResult, cups, consultCards, spreadPositions, copy.representativeLabel, copy.representativeMeaning],
  );
  const spreadCards = useMemo(() => buildRevealCards(result), [result]);
  const spreadSignature = spreadCards.map((card) => `${card.positionId}:${card.cardId}:${card.orientation}`).join("|");
  const [phase, setPhase] = useState<TarotRevealPhase>(() => getInitialRevealPhase(prefersReducedMotion));
  const [revealedPositions, setRevealedPositions] = useState<string[]>([]);
  const selectedCup = getTeaHouseCupById(result.teaCup.id);
  const resultButtonLabel = getFortuneTeaHouseRevealButtonLabel();
  const revealedCount = revealedPositions.length;
  const allCardsRevealed = spreadCards.length > 0 && revealedCount >= spreadCards.length;
  const orientationLabel = result.tarot.orientation === "upright" ? copy.upright : copy.reversed;

  useEffect(() => {
    setPhase(getInitialRevealPhase(prefersReducedMotion));
    setRevealedPositions([]);
    const timers = prefersReducedMotion
      ? []
      : [
          window.setTimeout(() => setPhase("shuffling"), 720),
          window.setTimeout(() => setPhase("choosing"), 2250),
        ];

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [prefersReducedMotion, spreadSignature]);

  function revealCard(positionId: string) {
    if (phase !== "choosing") return;
    if (revealedPositions.includes(positionId)) return;

    setRevealedPositions([...revealedPositions, positionId]);
    if (revealedPositions.length + 1 >= spreadCards.length) setPhase("complete");
  }

  const dialogueTextByPhase: Record<TarotRevealPhase, string> = {
    preparing: selectedCup?.tarotBeforeLine || copy.dialogue.preparing,
    shuffling: copy.dialogue.shuffling,
    choosing: revealedCount > 0
      ? copy.dialogue.choosingSome.replace("{count}", String(revealedCount))
      : copy.dialogue.choosingNone.replace("{total}", String(spreadCards.length)),
    complete: copy.dialogue.complete
      .replace("{name}", result.tarot.nameKo)
      .replace("{orientation}", orientationLabel)
      .replace("{total}", String(spreadCards.length)),
  };
  const phaseLabelByPhase: Record<TarotRevealPhase, string> = {
    preparing: "",
    shuffling: copy.phase.shuffling,
    choosing: copy.phase.choosing.replace("{count}", String(revealedCount)).replace("{total}", String(spreadCards.length)),
    complete: copy.phase.complete,
  };
  const dialogueText = dialogueTextByPhase[phase];
  const phaseLabel = phase === "preparing" ? "" : phaseLabelByPhase[phase];

  return (
    <section className={`${styles.tarotRevealScene} ${tarotRevealSceneUi}`} data-accent={selectedCup?.accent || "pink"} aria-labelledby="tarotRevealTitle">
      <div className={`${styles.tarotRevealPanel} ${tarotRevealPanelUi}`}>
        <p className={styles.sceneEyebrow}>{selectedCup?.visualMotif || "moonlit tarot"}</p>
        <h2 id="tarotRevealTitle">{selectedCup?.tarotRevealTitle || copy.title}</h2>
        <TeaHouseDialogueBox
          speaker="연이"
          text={dialogueText}
          className={tarotDialogueUi}
        />
        <div className={styles.tarotStage} data-phase={phase}>
          <div className={`${styles.tarotDeck} ${tarotDeckUi}`} data-count={spreadCards.length} role="group" aria-label={copy.deckAria}>
            {spreadCards.map((card, index) => {
              const revealId = card.positionId || `position-${index}`;
              const isRevealed = revealedPositions.includes(revealId);
              const slot = deckSlotsByCount[spreadCards.length]?.[index] || "center";

              return (
                <button
                  key={`${revealId}-${card.cardId}`}
                  type="button"
                  className={`${styles.tarotDeckCard} ${tarotDeckCardUi}`}
                  data-slot={slot}
                  data-index={index}
                  data-phase={phase}
                  data-selected={isRevealed ? "true" : "false"}
                  data-muted="false"
                  data-revealed={isRevealed ? "true" : "false"}
                  aria-label={copy.cardAria.replace("{label}", card.positionLabel).replace("{state}", isRevealed ? copy.revealed : copy.flip)}
                  aria-pressed={isRevealed}
                  disabled={phase !== "choosing" || isRevealed}
                  onClick={() => revealCard(revealId)}
                >
                  <span className={styles.tarotDeckCardInner}>
                    <TarotCardBack className={styles.tarotDeckBack} animated={phase === "shuffling" && !prefersReducedMotion} />
                    <TarotAssetCard
                      className={styles.tarotDeckFace}
                      cardId={card.cardId}
                      number={card.number}
                      nameKo={card.nameKo}
                      nameEn={card.nameEn}
                      orientation={card.orientation}
                      keywords={card.keywords}
                      meaning={card.meaning}
                      size="lg"
                      compact
                      visualOnly
                    />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className={`${styles.storyActions} ${styles.tarotActionBar} ${tarotActionBarUi}`}>
          {phaseLabel ? <span className={styles.storyProgress}>{phaseLabel}</span> : null}
          {phase === "choosing" ? <span className={styles.tarotChoiceHint}>{copy.choiceHint}</span> : null}
          <TeaHouseButton onClick={onComplete} disabled={!allCardsRevealed}>
            {resultButtonLabel}
          </TeaHouseButton>
        </div>
      </div>
    </section>
  );
}
