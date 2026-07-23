// 운명의 섬 — 궁 간 공명(Resonance) 계산. 순수 함수, 1-pass.
// 공명 보정은 base 점수만으로 계산해 resonanceBonus에 별도 누적한다.
// (bonus가 다시 입력으로 쓰이지 않으므로 순환/무한 루프가 구조적으로 불가능)

const TRIAD_EDGE_DIVISOR = 5;
const TRIAD_EDGE_CLAMP = 8;
const OPPOSITE_EDGE_DIVISOR = 8;
const OPPOSITE_EDGE_CLAMP = 5;
const SIHUA_EDGE_WEIGHT = { 화록: 8, 화권: 6, 화과: 5, 화기: -8 };
const BONUS_MIN = -20;
const BONUS_MAX = 30;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function centeredWeight(score, divisor, limit) {
  return clamp(Math.round((score - 50) / divisor), -limit, limit);
}

/**
 * chart: calculateZiweiAiChart() 결과 (읽기 전용)
 * baseScores: { [palaceName]: 0~100 } — island-weights.scorePalace 산출값
 * → { edges: [{from,to,type,star?,weight}], bonusByPalace: {[palaceName]: int} }
 */
export function buildResonance(chart, baseScores) {
  const edges = [];
  const bonusByPalace = {};
  const byPalace = chart?.sanFangSiZheng?.byPalace || {};
  const palaces = Array.isArray(chart?.palaces) ? chart.palaces : [];

  for (const palace of palaces) {
    const info = byPalace[palace.name];
    if (!info) continue;
    const oppositeName = info.opposite || "";
    const related = (info.palaceNames || []).filter((name) => name && name !== palace.name);
    for (const fromName of related) {
      if (!Object.prototype.hasOwnProperty.call(baseScores, fromName)) continue;
      const isOpposite = fromName === oppositeName;
      const weight = isOpposite
        ? centeredWeight(baseScores[fromName], OPPOSITE_EDGE_DIVISOR, OPPOSITE_EDGE_CLAMP)
        : centeredWeight(baseScores[fromName], TRIAD_EDGE_DIVISOR, TRIAD_EDGE_CLAMP);
      if (weight === 0) continue;
      edges.push({ from: fromName, to: palace.name, type: isOpposite ? "opposite" : "triad", weight });
    }
  }

  // 사화 4성: 별이 앉은 궁(숙주궁) → 명궁으로 기운이 흐른다. 명궁 자체 착궁은 base 점수에 이미 반영되어 있으므로 self-edge 금지.
  for (const palace of palaces) {
    for (const entry of palace.transformations || []) {
      const sep = String(entry).indexOf(":");
      if (sep <= 0) continue;
      const label = String(entry).slice(0, sep);
      const star = String(entry).slice(sep + 1);
      const weight = SIHUA_EDGE_WEIGHT[label];
      if (!weight || palace.name === "명궁") continue;
      edges.push({ from: palace.name, to: "명궁", type: "sihua", star: `${label}:${star}`, weight });
    }
  }

  for (const palace of palaces) {
    const incoming = edges.filter((edge) => edge.to === palace.name);
    bonusByPalace[palace.name] = clamp(
      incoming.reduce((sum, edge) => sum + edge.weight, 0),
      BONUS_MIN,
      BONUS_MAX
    );
  }

  return { edges, bonusByPalace };
}
