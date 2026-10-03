// 작명 엔진 v2 공통 타입·오행 관계. 설계서 docs/design/naming-engine-v2/README.md §4.
// 엔진은 I/O 가 없다 — 같은 입력·프리셋·데이터 버전이면 같은 출력.

export type Element = "wood" | "fire" | "earth" | "metal" | "water";
export type Grade = "good" | "half" | "bad";
export type Relation = "generate" | "same" | "control";
export type YinYang = "yang" | "yin";

export const ELEMENTS: readonly Element[] = ["wood", "fire", "earth", "metal", "water"];

/** 상생: 키가 값을 생한다. */
export const GENERATES: Readonly<Record<Element, Element>> = {
  wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood",
};
/** 상극: 키가 값을 극한다. */
export const CONTROLS: Readonly<Record<Element, Element>> = {
  wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood",
};

/** 용신을 생하는 오행(설계서 §6.7 보조 오행). */
export function parentOf(element: Element): Element {
  return ELEMENTS.find((e) => GENERATES[e] === element) as Element;
}

/** 두 오행의 인접 관계. 오행 둘은 같거나, 한쪽이 다른 쪽을 생하거나, 극한다 — 방향은 보지 않는다. */
export function relationOf(a: Element, b: Element): Relation {
  if (a === b) return "same";
  if (GENERATES[a] === b || GENERATES[b] === a) return "generate";
  return "control";
}

export class NamingEngineError extends Error {
  readonly code: string;
  constructor(code: string, message?: string) {
    super(message || code);
    this.name = "NamingEngineError";
    this.code = code;
  }
}

/** FNV-1a 32비트. 동점 정렬과 입력 해시에만 쓴다(보안 용도 아님). */
export function fnv1a(text: string, seed = 0x811c9dc5): number {
  let hash = seed >>> 0;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}
