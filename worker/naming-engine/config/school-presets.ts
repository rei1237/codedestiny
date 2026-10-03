// 학파 프리셋(설계서 §5). 숫자 한자 수의 획수는 데이터의 won 에 이미 들어 있고 pil 은 실획이다.

export type SoundMapping = "modern" | "hunminjeongeum";
export type StrokeMethod = "won" | "pil";

export interface SchoolPreset {
  id: string;
  soundMapping: SoundMapping;
  strokeMethod: StrokeMethod;
  /** 성별 차등 수리 해석. 모든 프리셋 기본 끔 — 점수에 쓰지 않는다. */
  genderNote: false;
}

export const SCHOOL_PRESETS: Readonly<Record<string, SchoolPreset>> = Object.freeze({
  "kr-modern": { id: "kr-modern", soundMapping: "modern", strokeMethod: "won", genderNote: false },
  "kr-hunminjeongeum": { id: "kr-hunminjeongeum", soundMapping: "hunminjeongeum", strokeMethod: "won", genderNote: false },
  "kr-pil": { id: "kr-pil", soundMapping: "modern", strokeMethod: "pil", genderNote: false },
});

export const DEFAULT_SCHOOL_PRESET = "kr-modern";
