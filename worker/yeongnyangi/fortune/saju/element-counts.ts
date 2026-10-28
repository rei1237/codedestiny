import { buildHiddenStemDetails } from "../../../lib/life-book-ai-saju.js";

// calcNatalElement counts the month branch twice (월령 가중), so its total is 9 and the chart and the prose
// disagree with the eight characters a customer can count. The counts here are the visible characters only;
// `weighted` keeps the 월령 emphasis and the 지장간 are listed per branch without being tallied.
export const ELEMENT_COUNT_RULE =
  "counts·ratios는 눈에 보이는 원국 글자(천간·지지, 시주를 모르면 6글자)만 센 개수다. 오행 개수를 말할 때는 counts만 쓴다. 지장간(hiddenStems)은 지지 속에 숨은 기운으로 따로 설명하고 개수에 더하지 않는다. 월지는 계절(월령)이라 강약 판단에서 더 무겁게 보지만(weighted) 개수는 바꾸지 않는다.";

const ORDER = ["wood", "fire", "earth", "metal", "water"] as const;
const ELEMENT: Record<string, (typeof ORDER)[number]> = {
  甲: "wood", 乙: "wood", 丙: "fire", 丁: "fire", 戊: "earth", 己: "earth", 庚: "metal", 辛: "metal", 壬: "water", 癸: "water",
  寅: "wood", 卯: "wood", 巳: "fire", 午: "fire", 辰: "earth", 戌: "earth", 丑: "earth", 未: "earth", 申: "metal", 酉: "metal", 亥: "water", 子: "water",
};
const PILLARS = [["y", "year"], ["m", "month"], ["d", "day"], ["h", "hour"]] as const;
type Pillar = { g: string; j: string };

export function surfaceElements(p: Record<string, Pillar>, weightedDominant: string) {
  const counts = Object.fromEntries(ORDER.map((e) => [e, 0])) as Record<(typeof ORDER)[number], number>;
  let visibleCharacters = 0;
  for (const [k] of PILLARS) for (const c of [p[k].g, p[k].j]) if (ELEMENT[c]) { counts[ELEMENT[c]]++; visibleCharacters++; }
  const total = visibleCharacters || 1;
  const ratios = Object.fromEntries(ORDER.map((e) => [e, (counts[e] / total) * 100]));
  // Same tie order as calcNatalElement: the first element in 목→수 order with the highest count.
  const dominant = ORDER.reduce((best, e) => (counts[e] > counts[best] ? e : best), ORDER[0]);
  const hiddenStems = PILLARS.filter(([k]) => p[k].j).map(([k, pillar]) => ({ pillar, branch: p[k].j, stems: buildHiddenStemDetails(p.d.g, p[k].j) }));
  // Only what the 월령 weighting changes; its own counts (total 9) are left out so they cannot be quoted as counts.
  const weighted = { monthBranch: p.m.j, monthElement: ELEMENT[p.m.j] || null, dominant: weightedDominant };
  return { dominant, ratios, counts, countBasis: "surface" as const, visibleCharacters, weighted, hiddenStems, rule: ELEMENT_COUNT_RULE };
}
