import type { TarotSpreadPosition } from "../types";

const PRESET_LAYOUTS: Record<number, Array<[number, number, number]>> = {
  4: [
    [24, 34, -8],
    [50, 22, 0],
    [76, 34, 8],
    [50, 68, 0],
  ],
  5: [
    [18, 50, -10],
    [38, 26, -4],
    [50, 50, 0],
    [62, 26, 4],
    [82, 50, 10],
  ],
  6: [
    [20, 30, -8],
    [50, 18, 0],
    [80, 30, 8],
    [20, 70, -8],
    [50, 82, 0],
    [80, 70, 8],
  ],
  7: [
    [16, 50, -10],
    [33, 24, -6],
    [50, 16, 0],
    [50, 50, 0],
    [67, 24, 6],
    [84, 50, 10],
    [50, 82, 0],
  ],
  8: [
    [16, 34, -10],
    [34, 18, -6],
    [50, 12, 0],
    [66, 18, 6],
    [84, 34, 10],
    [70, 72, 8],
    [50, 86, 0],
    [30, 72, -8],
  ],
  9: [
    [16, 28, -10],
    [34, 16, -6],
    [50, 10, 0],
    [66, 16, 6],
    [84, 28, 10],
    [22, 62, -8],
    [40, 78, -3],
    [60, 78, 3],
    [78, 62, 8],
  ],
  10: [
    [14, 24, -10],
    [30, 14, -7],
    [50, 10, 0],
    [70, 14, 7],
    [86, 24, 10],
    [18, 58, -8],
    [34, 74, -4],
    [50, 82, 0],
    [66, 74, 4],
    [82, 58, 8],
  ],
  12: [
    [14, 20, -10],
    [28, 12, -7],
    [44, 8, -3],
    [56, 8, 3],
    [72, 12, 7],
    [86, 20, 10],
    [16, 58, -8],
    [30, 74, -5],
    [44, 84, -2],
    [56, 84, 2],
    [70, 74, 5],
    [84, 58, 8],
  ],
  14: [
    [12, 18, -10],
    [24, 11, -8],
    [38, 7, -5],
    [50, 5, 0],
    [62, 7, 5],
    [76, 11, 8],
    [88, 18, 10],
    [14, 54, -8],
    [26, 70, -6],
    [38, 82, -3],
    [50, 88, 0],
    [62, 82, 3],
    [74, 70, 6],
    [86, 54, 8],
  ],
};

function buildFallbackLayout(cardCount: number): Array<[number, number, number]> {
  return Array.from({ length: cardCount }, (_, index) => {
    const angle = (-90 + (360 / cardCount) * index) * (Math.PI / 180);
    const radiusX = cardCount >= 10 ? 38 : 34;
    const radiusY = cardCount >= 10 ? 30 : 26;
    const x = 50 + Math.cos(angle) * radiusX;
    const y = 50 + Math.sin(angle) * radiusY;
    const rotate = Math.max(-10, Math.min(10, Math.sin(angle) * 10));
    return [Number(x.toFixed(2)), Number(y.toFixed(2)), Number(rotate.toFixed(2))];
  });
}

export function layoutSpreadPositions(labels: string[]): TarotSpreadPosition[] {
  const layout = PRESET_LAYOUTS[labels.length] || buildFallbackLayout(labels.length);
  const centerIndex = Math.floor(labels.length / 2);

  return labels.map((rawLabel, index) => {
    const [x, y, rotate] = layout[index] || [50, 50, 0];
    const label = rawLabel.replace(/^\d+\.\s*/, "").trim();
    return {
      index: index + 1,
      label,
      description: label,
      x,
      y,
      rotate,
      emphasis: index === centerIndex,
    };
  });
}