"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
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
  /** spriteOverride 가 표정 컷과 비율이 다를 때(무성 깃털 240/870) 프레임 비율. */
  spriteAspect?: string;
  className?: string;
};

const SPRITE_SIZES: Record<ExpertStagePlacement, string> = {
  hero: "(max-width: 720px) 200px, 260px",
  inline: "80px",
  loading: "128px",
  result: "96px",
};

/** 말하기 프레임 한 번 돌리는 길이. 대사 길이에 비례하되 짧게 끊어 계속 떠드는 느낌을 피한다. */
const TALK_STEP_MS = 180;
const talkSteps = (line: string) => Math.min(12, Math.max(4, Math.round(line.length / 4)));

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
  spriteAspect,
  className = "",
}: ExpertCharacterStageProps) {
  const gate = useSpritePlaybackGate<HTMLElement>();
  const config = getExpertCharacter(character);
  const sprite = spriteOverride ?? getExpertMoodSprite(character, mood);
  // 말하기 프레임은 idle 컷과 같은 캔버스에서 입만 바꾼 그림이라, idle 컷이 보일 때만 겹친다.
  const talkFrames = config.talkFrames ?? [];
  const canTalk = Boolean(line) && !spriteOverride && talkFrames.length > 0 && sprite.src === config.moods.idle.src && gate.canAnimate;
  const [talkStep, setTalkStep] = useState(-1);

  useEffect(() => {
    if (!canTalk || !line) {
      setTalkStep(-1);
      return;
    }
    const steps = talkSteps(line);
    let step = -1;
    setTalkStep(-1);
    const timer = window.setInterval(() => {
      step += 1;
      if (step >= steps) {
        window.clearInterval(timer);
        setTalkStep(-1);
        return;
      }
      setTalkStep(step);
    }, TALK_STEP_MS);
    return () => window.clearInterval(timer);
  }, [canTalk, line]);

  if (!config.enabled) return null;

  // a → b → 다문 입(idle) 순서로 돈다. 겹침 컷은 이미지를 바꾸지 않고 불투명도만 바꿔 moodIn 이 다시 돌지 않는다.
  const talkFrameIndex = talkStep < 0 ? -1 : talkStep % (talkFrames.length + 1);
  const name = getExpertCharacterName(character, locale);
  const announces = placement === "loading" || mood === "error";
  const isHero = placement === "hero";
  // 결과 표지·끝맺음은 PDF 캡처 대상 안에 있다. 지연 로드면 화면 밖 컷이 빈 칸으로 찍힌다.
  const loading = isHero ? undefined : placement === "result" ? "eager" : "lazy";

  return (
    <figure
      ref={gate.ref}
      className={`${styles.stage} ${className}`.trim()}
      data-character={character}
      data-placement={placement}
      data-mood={mood}
      data-fit={config.spriteFit}
      data-motion={gate.canAnimate ? "on" : "off"}
      data-aspect={spriteAspect ? "custom" : undefined}
    >
      <div className={styles.frame} style={{ aspectRatio: spriteAspect ?? config.spriteAspect }}>
        <Image
          key={sprite.src}
          className={styles.sprite}
          src={sprite.src}
          alt={sprite.alt}
          fill
          sizes={SPRITE_SIZES[placement]}
          priority={isHero}
          loading={loading}
          unoptimized
        />
        {canTalk
          ? talkFrames.map((frame, index) => (
              <Image
                key={frame.src}
                className={styles.talk}
                data-on={talkFrameIndex === index ? "true" : undefined}
                src={frame.src}
                alt=""
                aria-hidden
                fill
                sizes={SPRITE_SIZES[placement]}
                loading={loading}
                unoptimized
              />
            ))
          : null}
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
