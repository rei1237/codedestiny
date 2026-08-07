"use client";

import Image from "next/image";
import { PERSONA_SPRITE, personaImage, type Persona, type PersonaMood } from "./personaSprite";
import styles from "./fortune-chat.module.css";

/**
 * 상담자 표정 아바타. 미리 잘라 둔 컷 하나를 그대로 보여준다.
 *
 * 장식이 아니라 상태 표시다 — 듣는 중/읽어주는 중/기다리는 중이 다른 얼굴로 나온다.
 * 이미지가 못 오면 자리만 비므로, 의미 전달은 항상 옆의 텍스트가 맡는다(aria-hidden).
 */
export function PersonaAvatar({
  persona,
  mood = "listen",
  size = "md",
  decorative = false,
}: {
  persona: Persona;
  mood?: PersonaMood;
  size?: "sm" | "md" | "lg";
  decorative?: boolean;
}) {
  const label = PERSONA_SPRITE[persona].alt;
  return (
    <span
      className={`${styles.avatar} ${styles[`avatar_${size}`]}`}
      data-persona={persona}
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": label })}
    >
      <Image src={personaImage(persona, mood)} alt="" fill sizes="192px" />
    </span>
  );
}
