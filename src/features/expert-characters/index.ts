import { hanbiCharacter } from "./hanbi";
import { musungCharacter, MUSUNG_FEATHER_ASPECT, MUSUNG_FEATHER_STAGES } from "./musung";
import { yeoniCharacter } from "./yeoni";
import { yunCharacter } from "./yun";
import type { ExpertCharacter, ExpertCharacterKey, ExpertLine, ExpertLocale, ExpertMood, ExpertSprite } from "./types";

export type { ExpertCharacter, ExpertCharacterKey, ExpertLine, ExpertLocale, ExpertMood, ExpertSprite } from "./types";
export { MUSUNG_FEATHER_ASPECT, MUSUNG_FEATHER_STAGES };

export const EXPERT_CHARACTERS: Record<ExpertCharacterKey, ExpertCharacter> = {
  yun: yunCharacter,
  musung: musungCharacter,
  hanbi: hanbiCharacter,
  yeoni: yeoniCharacter,
};

export function getExpertCharacter(key: ExpertCharacterKey): ExpertCharacter {
  return EXPERT_CHARACTERS[key];
}

export function isExpertCharacterEnabled(key: ExpertCharacterKey) {
  return Boolean(EXPERT_CHARACTERS[key]?.enabled);
}

export function getExpertCharacterName(key: ExpertCharacterKey, locale: ExpertLocale = "ko") {
  const { name } = EXPERT_CHARACTERS[key];
  return locale === "ko" ? name.ko : name.en;
}

export function getExpertCharacterTitle(key: ExpertCharacterKey, locale: ExpertLocale = "ko") {
  const { title } = EXPERT_CHARACTERS[key];
  return locale === "ko" ? title.ko : title.en;
}

export function getExpertMoodSprite(key: ExpertCharacterKey, mood: ExpertMood): ExpertSprite {
  const { moods } = EXPERT_CHARACTERS[key];
  return moods[mood] ?? moods.idle;
}

/** 대사 한 줄. ko 가 정본, 그 외 로케일은 영어 → 한국어 원문 순으로 내려간다. */
export function getExpertLine(key: ExpertCharacterKey, id: string, locale: ExpertLocale = "ko"): ExpertLine {
  const character = EXPERT_CHARACTERS[key];
  const entry = character.lines[id] ?? character.lines.hero;
  if (locale === "ko") return entry;
  const translated = character.linesEn[entry.id];
  return translated ? { ...entry, text: translated } : entry;
}
