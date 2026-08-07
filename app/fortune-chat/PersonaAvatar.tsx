"use client";

import { PERSONA_SPRITE, personaSpriteStyle, type Persona, type PersonaMood } from "./personaSprite";
import styles from "./fortune-chat.module.css";

/**
 * 상담자 표정 아바타. 시트 한 장에서 셀 하나를 잘라 보여준다.
 *
 * 장식이 아니라 상태 표시다 — 듣는 중/읽어주는 중/기다리는 중이 표정으로 구분된다.
 * 이미지가 못 오면 배경만 비므로, 의미 전달은 항상 옆의 텍스트가 맡는다(aria-hidden).
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
      style={personaSpriteStyle(persona, mood)}
      data-persona={persona}
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": label })}
    />
  );
}
