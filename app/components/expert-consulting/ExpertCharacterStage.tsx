"use client";

import Image from "next/image";
import { useSpritePlaybackGate } from "@/src/hooks/useSpritePlaybackGate";
import {
  getExpertCharacter,
  getExpertCharacterName,
  getExpertMoodSprite,
  type ExpertCharacterKey,
  type ExpertMood,
  type ExpertSprite,
} from "@/src/features/expert-characters";
import styles from "./ExpertCharacterStage.module.css";

export type ExpertStagePlacement = "hero" | "inline" | "loading" | "result";

type ExpertCharacterStageProps = {
  character: ExpertCharacterKey;
  mood?: ExpertMood;
  /** 이미 로케일이 적용된 대사. 없으면 대사창을 그리지 않는다. */
  line?: string;
  placement?: ExpertStagePlacement;
  locale?: string;
  /** 무성의 깃털 단계처럼 mood 표정 대신 보여 줄 컷. */
  spriteOverride?: ExpertSprite;
  className?: string;
};

const SPRITE_SIZES: Record<ExpertStagePlacement, string> = {
  hero: "(max-width: 720px) 200px, 260px",
  inline: "80px",
  loading: "128px",
  result: "96px",
};

/**
 * 전문가 상담 캐릭터 무대. 네오 NeoSpriteActor 를 일반화했다.
 * - 프레임은 스프라이트 원본 비율로 고정해 표정이 바뀌어도 레이아웃이 흔들리지 않는다.
 * - aria-live 는 로딩·오류 대사에만 건다(장식 대사는 읽지 않게).
 * - 화면 밖·탭 숨김·reduced-motion 이면 숨쉬기 모션을 끈다.
 */
export default function ExpertCharacterStage({
  character,
  mood = "idle",
  line,
  placement = "inline",
  locale = "ko",
  spriteOverride,
  className = "",
}: ExpertCharacterStageProps) {
  const gate = useSpritePlaybackGate<HTMLElement>();
  const config = getExpertCharacter(character);
  if (!config.enabled) return null;

  const sprite = spriteOverride ?? getExpertMoodSprite(character, mood);
  const name = getExpertCharacterName(character, locale);
  const announces = placement === "loading" || mood === "error";
  const isHero = placement === "hero";

  return (
    <figure
      ref={gate.ref}
      className={`${styles.stage} ${className}`.trim()}
      data-character={character}
      data-placement={placement}
      data-mood={mood}
      data-fit={config.spriteFit}
      data-motion={gate.canAnimate ? "on" : "off"}
    >
      <div className={styles.frame} style={{ aspectRatio: config.spriteAspect }}>
        <Image
          key={sprite.src}
          className={styles.sprite}
          src={sprite.src}
          alt={sprite.alt}
          fill
          sizes={SPRITE_SIZES[placement]}
          priority={isHero}
          loading={isHero ? undefined : "lazy"}
          unoptimized
        />
      </div>
      {line ? (
        <figcaption className={styles.bubble} aria-live={announces ? "polite" : undefined}>
          <span className={styles.name}>{name}</span>
          <p>{line}</p>
        </figcaption>
      ) : null}
    </figure>
  );
}
