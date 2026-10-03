// MMR 다양화(설계서 §8.3). 점수 순 후보에서 비슷한 이름이 몰리지 않게 고른다.
// 난수 없음 — 입력은 이미 결정론 정렬(총점 → tie)이고, MMR 동점은 앞 순서가 이긴다.

import { SEARCH } from "./config/weights";

export interface DiversifyItem {
  /** 이름(성 제외) 한글 */
  hangul: string;
  hanja: string[];
  sound: { elements: string[] };
  total: number;
}

/**
 * 0~1. 한글이 같으면 1, 아니면 같은 한자 수 0.5 씩 + 같은 첫 음절 0.3 + 같은 소리오행 배열 0.2.
 * mask = 돌림자 자리 — 모든 후보가 공유하므로 한자·첫 음절 비교에서 뺀다(빼지 않으면 다양화가 소리 패턴만 쫓는다).
 */
export function nameSimilarity(a: DiversifyItem, b: DiversifyItem, mask: number | null = null): number {
  if (a.hangul === b.hangul) return 1;
  const open = <T>(list: T[]) => (mask === null ? list : list.filter((_, i) => i !== mask));
  const hanjaB = open(b.hanja);
  const shared = new Set(open(a.hanja).filter((ch) => hanjaB.includes(ch))).size;
  const sameFirst = open(Array.from(a.hangul))[0] === open(Array.from(b.hangul))[0] ? 1 : 0;
  const samePattern = a.sound.elements.join() === b.sound.elements.join() ? 1 : 0;
  return Math.min(1, 0.5 * shared + 0.3 * sameFirst + 0.2 * samePattern);
}

/**
 * pool(높은 순)에서 count 개를 고른다. already 는 앞 단계에서 이미 고른 후보 — 유사도 비교에만 쓴다.
 * MMR = λ·(총점/100) − (1−λ)·(이미 고른 것과의 최대 유사도).
 */
export function selectDiverse<T extends DiversifyItem>(
  pool: T[],
  count: number,
  already: DiversifyItem[] = [],
  mask: number | null = null,
  lambda = SEARCH.mmrLambda,
): T[] {
  const chosen: T[] = [];
  const remaining = [...pool];
  while (chosen.length < count && remaining.length) {
    let bestIndex = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      let maxSim = 0;
      for (const other of already) maxSim = Math.max(maxSim, nameSimilarity(remaining[i], other, mask));
      for (const other of chosen) maxSim = Math.max(maxSim, nameSimilarity(remaining[i], other, mask));
      const score = lambda * (remaining[i].total / 100) - (1 - lambda) * maxSim;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }
    chosen.push(remaining.splice(bestIndex, 1)[0]);
  }
  return chosen;
}
