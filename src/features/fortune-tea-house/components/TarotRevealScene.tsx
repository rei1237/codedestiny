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

  const dialogueText = isFlipped
    ? `${result.tarot.nameKo} ${result.tarot.orientation === "upright" ? "정방향" : "역방향"}이 찻잔 위에 떠올랐어요.\n이제 인간 상담사 연이가 이 카드의 상징이 사주의 흐름과 어디에서 만나는지 읽어볼게요.`
    : "이 카드는 정답을 명령하지 않아요.\n다만 지금 당신의 마음이 어디를 바라보고 있는지 조용히 보여줄 뿐이에요.\n그러니까 결과가 무엇이든, 오늘은 당신 편에서 읽어볼게요.";

  return (
    <section className={styles.tarotRevealScene} aria-labelledby="tarotRevealTitle">
      <div className={styles.tarotRevealActor}>
        <YeoniDialogueActor
          mood={isFlipped ? "serious" : "welcome"}
          isSpeaking={isSpeaking}
          cueText={dialogueText}
          className={styles.yeoniPortrait}
          priority
        />
      </div>
      <div className={styles.tarotRevealPanel}>
        <p className={styles.sceneEyebrow}>타로가 보여준 지금의 상징</p>
        <h2 id="tarotRevealTitle">찻잔 위에 카드가 떠올랐어요</h2>
        <TeaHouseDialogueBox
          speaker="연이"
          text={dialogueText}
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
