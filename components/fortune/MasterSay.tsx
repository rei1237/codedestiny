/* eslint-disable @next/next/no-img-element -- Pre-sized WebP in a static export, same as ConsultationIllustration. */
import Link from "next/link";
import { getExpertCharacter, getExpertMoodSprite, isExpertCharacterEnabled, type ExpertMood } from "@/src/features/expert-characters";
import { masterSayFor } from "@/lib/master-say/master-say.mjs";
import styles from "./master-say.module.css";

export type MasterSayInput = { domain: "sukuyo" | "astrology" | "vedic" | "nakshatra" | "saju" | "humanDesign" | "healingTarot" | "mingriTarot" | "numerology"; sectionKey?: string; index?: number; total?: number };

/**
 * 결과 장 사이에 끼는 마스터 말풍선: 표정 그림 + 한마디. 본문(LLM 원문)은 바꾸지 않는 장식이라 서버 컴포넌트로도 쓴다.
 * 캐릭터가 꺼져 있거나(enabled=false) 지원하지 않는 분야면 아무것도 그리지 않아 기존 화면이 그대로 남는다.
 */
/** 같은 달 위치를 다른 체계로 이어 읽는 교차 링크. 달 풀이의 정본은 베다라, 풀이를 되풀이하는 대신 마지막 장 끝에서 이어 준다. */
// 나크샤트라 결정판은 화면 자체가 동양·인도 교차 대조라 링크를 두지 않는다.
const CROSS_LINK: Partial<Record<MasterSayInput["domain"], { href: string; label: string }>> = {
  sukuyo: { href: "/vedic/", label: "같은 달을 베다 나크샤트라로 깊게 읽기" },
  astrology: { href: "/vedic/", label: "달을 나크샤트라와 다샤로 더 깊게 읽기" },
  vedic: { href: "/sukuyo/", label: "같은 달을 숙요 27수로 읽어 두 사람 사이 보기" },
};

function isClosing({ domain, sectionKey, index = 0, total = 0 }: MasterSayInput) {
  if (domain === "nakshatra") return false;
  return domain === "sukuyo" ? sectionKey === "closingLetter" : total > 1 && index >= total - 1;
}

export default function MasterSay({ say }: { say: MasterSayInput }) {
  const line = masterSayFor(say);
  if (!line || !isExpertCharacterEnabled(line.character)) return null;
  const character = getExpertCharacter(line.character);
  const sprite = getExpertMoodSprite(line.character, line.mood as ExpertMood);
  const cross = isClosing(say) ? CROSS_LINK[line.domain as MasterSayInput["domain"]] : undefined;
  return (
    <aside className={styles.say} data-master-say={line.domain} data-master={line.character} data-mood={line.mood} data-fit={character.spriteFit}>
      <span className={styles.frame} style={{ aspectRatio: character.spriteAspect }}>
        <img src={sprite.src} alt="" width={96} height={Math.round(96 / aspectValue(character.spriteAspect))} loading="lazy" decoding="async" />
      </span>
      <p className={styles.bubble}>
        <b>{character.name.ko}</b>
        {line.text}
        {cross ? <Link className={styles.cross} href={cross.href}>{cross.label} →</Link> : null}
      </p>
    </aside>
  );
}

/** "341 / 512" → 0.666… (이미지 height 속성용, 레이아웃은 CSS aspect-ratio 가 잡는다). */
function aspectValue(aspect: string) {
  const [w, h] = aspect.split("/").map((part) => Number(part.trim()));
  return w && h ? w / h : 1;
}
