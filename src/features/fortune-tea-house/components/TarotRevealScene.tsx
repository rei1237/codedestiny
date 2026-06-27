"use client";

import { useEffect, useState } from "react";
import type { FortuneTeaHouseConsultResponse } from "../data/consult";
import { usePrefersReducedMotion } from "../lib/usePrefersReducedMotion";
import TarotCardBack from "./TarotCardBack";
import TarotAssetCard from "./TarotAssetCard";
import TarotRevealAnimation from "./TarotRevealAnimation";
import TeaHouseButton from "./TeaHouseButton";
import TeaHouseDialogueBox from "./TeaHouseDialogueBox";
import YeoniDialogueActor from "./YeoniDialogueActor";
import styles from "../styles/fortune-tea-house.module.css";

type TarotRevealSceneProps = {
  result: FortuneTeaHouseConsultResponse;
  onComplete: () => void;
};

export default function TarotRevealScene({ result, onComplete }: TarotRevealSceneProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [isFlipped, setIsFlipped] = useState(prefersReducedMotion);
  const [isSpeaking, setIsSpeaking] = useState(true);

  useEffect(() => {
    setIsFlipped(prefersReducedMotion);
    setIsSpeaking(true);
    const timer = window.setTimeout(() => setIsSpeaking(false), 2500);
    return () => window.clearTimeout(timer);
  }, [prefersReducedMotion, result.tarot.cardId, result.tarot.orientation]);

  function revealCard() {
    setIsFlipped(true);
    setIsSpeaking(true);
    window.setTimeout(() => setIsSpeaking(false), prefersReducedMotion ? 0 : 1800);
  }

  return (
    <section className={styles.tarotRevealScene} aria-labelledby="tarotRevealTitle">
      <div className={styles.tarotRevealActor}>
        <YeoniDialogueActor mood={isFlipped ? "serious" : "welcome"} isSpeaking={isSpeaking} className={styles.yeoniPortrait} priority />
      </div>
      <div className={styles.tarotRevealPanel}>
        <p className={styles.sceneEyebrow}>찻잔이 고른 한 장</p>
        <h2 id="tarotRevealTitle">운명의 카드가 펼쳐집니다</h2>
        <TeaHouseDialogueBox
          speaker="연이"
          text={
            isFlipped
              ? `${result.tarot.nameKo} ${result.tarot.orientation === "upright" ? "정방향" : "역방향"}이 나왔어요.\n이제 이 카드가 찻잔의 향과 어떻게 이어지는지 읽어볼게요.`
              : "이제 찻잔이 답을 보여주려고 해요.\n운세는 당신을 겁주기 위해 있는 게 아니에요. 지금 보지 못하고 지나친 마음의 방향을 조금 더 선명하게 보여주는 작은 등불에 가까워요.\n그러니까 결과가 무엇이든, 오늘은 당신 편에서 읽어볼게요."
          }
        />
        <div className={styles.tarotStage}>
          {!isFlipped && !prefersReducedMotion ? <TarotRevealAnimation className={styles.tarotRevealStageAnimation} /> : null}
          <div className={styles.tarotFlipCard} data-flipped={isFlipped ? "true" : "false"}>
            <div className={styles.tarotFlipInner}>
              <TarotCardBack className={styles.tarotFlipBack} animated={!isFlipped && !prefersReducedMotion} />
              <TarotAssetCard
                className={styles.tarotFlipFront}
                cardId={result.tarot.cardId}
                number={result.tarot.number}
                nameKo={result.tarot.nameKo}
                nameEn={result.tarot.nameEn}
                orientation={result.tarot.orientation}
                keywords={result.tarot.keywords}
                meaning={result.tarot.meaning}
              />
            </div>
          </div>
        </div>
        <div className={styles.storyActions}>
          <span className={styles.storyProgress}>{isFlipped ? "카드 공개 완료" : "카드 공개 전"}</span>
          {isFlipped ? <TeaHouseButton onClick={onComplete}>결과 시트 보기</TeaHouseButton> : <TeaHouseButton onClick={revealCard}>카드 펼치기</TeaHouseButton>}
        </div>
      </div>
    </section>
  );
}
