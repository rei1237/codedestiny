/**
 * 두 상담자의 표정 시트.
 *
 * 좌표는 비주얼 노벨(public/codedestiny-novel.html 의 PIG_CELL·NEO_CELL)이 이미 검증한 값을
 * 그대로 가져왔다. 백사자 시트는 정확한 4등분이 아니라 손으로 맞춘 값이라, 등분 계산으로
 * 대체하면 얼굴이 잘린다. 시트를 다시 자르면 두 곳을 함께 고쳐야 한다.
 *
 * 공용 YeonSpriteFrame 을 쓰지 않는 이유: 그 컴포넌트는 4×3 사람 연이 시트 한 장에 묶여
 * 있고(lib/yeon/sprite.ts), 등분 인덱스만 받는다. 여기서 필요한 건 시트별 미세 좌표다.
 *
 * 두 시트 모두 public 에 둔다. R2(assets.code-destiny.com)는 핫링크 보호가 걸려 있어
 * localhost Referer 에 403 을 주므로, R2 를 직접 물리면 로컬 개발에서 네오만 빈 원반이 된다.
 * 원본은 R2 의 DestinyWar/전략실 네오-Photoroom.webp 이며 여기 사본은 그 미러다.
 */

export type Persona = "yeoni" | "neo";
export type PersonaMood = "greet" | "listen" | "read" | "think" | "cheer";

/** 꽃돼지 연이 — 4×4 표정 시트(정확한 4등분). */
const YEONI_SHEET = "/images/novel/pig-expressions.webp";

/** 백사자 네오 — 4×4 표정 시트(투명 배경). */
const NEO_SHEET = "/images/novel/neo-strategy-sheet.webp";

const YEONI_CELLS: Record<PersonaMood, string> = {
  greet: "0% 100%",        // smile
  listen: "33.333% 0%",    // soft
  read: "66.667% 33.333%", // serene
  think: "66.667% 0%",     // calm
  cheer: "66.667% 66.667%", // happy
};

const NEO_CELLS: Record<PersonaMood, string> = {
  greet: "2.306% 97.065%",   // greet
  listen: "63.941% 65.618%", // calm
  read: "63.941% 34.172%",   // lecture
  think: "2.516% 65.618%",   // deadpan
  cheer: "95.178% 65.618%",  // smirk
};

export const PERSONA_SPRITE: Record<Persona, { sheet: string; cells: Record<PersonaMood, string>; alt: string }> = {
  yeoni: { sheet: YEONI_SHEET, cells: YEONI_CELLS, alt: "꽃돼지 연이" },
  neo: { sheet: NEO_SHEET, cells: NEO_CELLS, alt: "백사자 네오" },
};

/** 시트가 4×4 라 배경은 항상 400% 400% 로 확대한 뒤 셀 좌표로 이동한다. */
export const PERSONA_SPRITE_SIZE = "400% 400%";

export function personaSpriteStyle(persona: Persona, mood: PersonaMood) {
  const sprite = PERSONA_SPRITE[persona];
  return {
    backgroundImage: `url("${sprite.sheet}")`,
    backgroundPosition: sprite.cells[mood] || sprite.cells.listen,
    backgroundSize: PERSONA_SPRITE_SIZE,
  };
}
