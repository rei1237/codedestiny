/**
 * 두 상담자의 표정 컷.
 *
 * 🔴 예전에는 시트 한 장을 CSS 스프라이트(`background-size: 400% 400%` + 백분율 좌표)로
 *    잘라 썼는데, 꽃돼지 시트가 1056×1488(셀 264×372, 세로형)이라 정사각 아바타 박스에서
 *    캐릭터가 세로로 71%로 눌렸다. 백분율 좌표도 시트를 다시 그리면 조용히 어긋난다.
 *    이제 scripts/build-persona-avatar-assets.mjs 가 셀을 미리 잘라 두고 여기서는 그
 *    이미지를 가리키기만 한다 — 왜곡도, 좌표 취약성도 없다.
 *
 * 원본 시트는 public/images/novel/ 에 둔다. R2(assets.code-destiny.com)는 핫링크 보호가
 * 걸려 있어 localhost Referer 에 403 을 주므로 직접 물리면 로컬에서 네오만 빈 칸이 된다.
 * 백사자 원본은 R2 의 DestinyWar/전략실 네오-Photoroom.webp 이며 저 사본은 그 미러다.
 */

export type Persona = "yeoni" | "neo";
export type PersonaMood = "greet" | "listen" | "read" | "think" | "cheer";

const MOODS: PersonaMood[] = ["greet", "listen", "read", "think", "cheer"];

function cuts(persona: Persona): Record<PersonaMood, string> {
  return MOODS.reduce((map, mood) => ({
    ...map,
    [mood]: `/images/fortune-chat/persona/${persona}-${mood}.webp`,
  }), {} as Record<PersonaMood, string>);
}

export const PERSONA_SPRITE: Record<Persona, { cells: Record<PersonaMood, string>; alt: string }> = {
  yeoni: { cells: cuts("yeoni"), alt: "꽃돼지 연이" },
  neo: { cells: cuts("neo"), alt: "백사자 네오" },
};

export function personaImage(persona: Persona, mood: PersonaMood): string {
  const sprite = PERSONA_SPRITE[persona];
  return sprite.cells[mood] || sprite.cells.listen;
}
