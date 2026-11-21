/* eslint-disable @next/next/no-img-element -- Pre-sized WebP in a static export, same as ConsultationIllustration. */
import { getExpertCharacter, getExpertMoodSprite, isExpertCharacterEnabled, type ExpertMood } from "@/src/features/expert-characters";
import { masterSayFor } from "@/lib/master-say/master-say.mjs";
import styles from "./master-say.module.css";

export type MasterSayInput = { domain: "sukuyo" | "astrology" | "vedic"; sectionKey?: string; index?: number; total?: number };

/**
 * 결과 장 사이에 끼는 마스터 말풍선: 표정 그림 + 한마디. 본문(LLM 원문)은 바꾸지 않는 장식이라 서버 컴포넌트로도 쓴다.
 * 캐릭터가 꺼져 있거나(enabled=false) 지원하지 않는 분야면 아무것도 그리지 않아 기존 화면이 그대로 남는다.
 */
export default function MasterSay({ say }: { say: MasterSayInput }) {
  const line = masterSayFor(say);
  if (!line || !isExpertCharacterEnabled(line.character)) return null;
  const character = getExpertCharacter(line.character);
  const sprite = getExpertMoodSprite(line.character, line.mood as ExpertMood);
  return (
    <aside className={styles.say} data-master-say={line.domain} data-master={line.character} data-mood={line.mood} data-fit={character.spriteFit}>
      <span className={styles.frame} style={{ aspectRatio: character.spriteAspect }}>
        <img src={sprite.src} alt="" width={96} height={Math.round(96 / aspectValue(character.spriteAspect))} loading="lazy" decoding="async" />
      </span>
      <p className={styles.bubble}>
        <b>{character.name.ko}</b>
        {line.text}
      </p>
    </aside>
  );
}

/** "341 / 512" → 0.666… (이미지 height 속성용, 레이아웃은 CSS aspect-ratio 가 잡는다). */
function aspectValue(aspect: string) {
  const [w, h] = aspect.split("/").map((part) => Number(part.trim()));
  return w && h ? w / h : 1;
}
