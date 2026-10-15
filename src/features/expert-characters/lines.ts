import { cmsText } from "@/lib/cms/build-text";
import type { ExpertCharacterKey, ExpertLine, ExpertMood } from "./types";

/* 대사는 관리자 CMS 오버라이드(feature-copy / expert-<key>:<id>)를 한국어에만 허용한다.
   폴백 우선: CMS 값이 없으면 아래 인자로 넘어온 원문을 그대로 쓴다. */
export function expertLine(character: ExpertCharacterKey, id: string, mood: ExpertMood, text: string): ExpertLine {
  return {
    id,
    mood,
    text: cmsText("feature-copy", `expert-${character}:${id}`, "text", text),
  };
}

export function defineLines(character: ExpertCharacterKey, entries: Array<[string, ExpertMood, string]>) {
  return Object.fromEntries(
    entries.map(([id, mood, text]) => [id, expertLine(character, id, mood, text)]),
  ) as Record<string, ExpertLine>;
}
