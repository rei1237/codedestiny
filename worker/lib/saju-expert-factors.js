import * as sajuAnalysis from "./saju-ai-prompt.js";

// Reuse the established advanced-factor rules; never recalculate pillars here.
export function buildLifeBookExpertFactors(saju) {
  const pillars = Object.fromEntries(["year", "month", "day", "hour"].map((key) => {
    const pillar = String(saju[`${key}Pillar`] || "");
    return [key, pillar ? { gan: pillar[0], zhi: pillar[1] } : null];
  }));
  return sajuAnalysis.buildSajuAdvancedFactors({
    pillars,
    daewoon: (saju.majorLuck?.cycles || []).map((cycle) => ({ ganji: cycle.pillar, startAge: cycle.startAge, scope: "daewoon" })),
    yearlyLuck: (saju.yearlyLuck || []).map((row) => ({ ganji: row.pillar, year: row.year, scope: "sewoon" })),
    power: {
      yongshin: [String(saju.usefulGod || "")[0]].filter(Boolean),
      kijishin: [String(saju.unfavorableGod || "")[0]].filter(Boolean),
    },
  });
}
