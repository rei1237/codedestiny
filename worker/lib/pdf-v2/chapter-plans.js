import { getPremiumSpecByReportType } from "../premium-pdf-specs.js";

const REQUIRED_FIELDS_BY_REPORT = Object.freeze({
  ziweiPremium: [
    ["chart.mingGong", "chart.shenGong", "palaces", "palaces[].palaceName", "palaces[].branch", "palaces[].mainStars", "palaces[].mainStars[].name", "palaces[].mainStars[].strengthSymbol", "palaces[].minorStars", "fourTransformations"],
    ["chart.shenGong", "palaces", "palaces[].palaceName", "palaces[].mainStars"],
    ["palaces", "palaces[].palaceName", "palaces[].mainStars"],
    ["palaces", "palaces[].palaceName", "palaces[].mainStars"],
    ["palaces", "palaces[].palaceName", "palaces[].mainStars"],
    ["palaces", "palaces[].palaceName", "palaces[].mainStars"],
    ["palaces", "palaces[].palaceName", "palaces[].mainStars"],
    ["palaces", "palaces[].palaceName", "palaces[].auxiliaryStars"],
    ["palaces", "palaces[].palaceName", "palaces[].mainStars"],
    ["palaces", "palaces[].palaceName", "palaces[].mainStars"],
    ["luckCycles.decadeLuck"],
    ["luckCycles.annualLuck"],
    ["analysis.personality", "analysis.lifeTheme", "analysis.careerPattern"],
  ],
  sookyoPremium: [
    ["宿曜.birthMansion", "宿曜.coreNature"],
    ["mansionAnalysis.personality"],
    ["mansionAnalysis.relationshipStyle"],
    ["mansionAnalysis.workStyle", "mansionAnalysis.wealthStyle"],
    ["compatibility.relationType", "compatibility.distance"],
    ["compatibility.summary", "mansionAnalysis.growthAdvice"],
    ["mansionAnalysis.weakness"],
    ["mansionAnalysis.growthAdvice"],
    ["fortuneCycles.daily", "fortuneCycles.monthly"],
    ["fortuneCycles.yearly"],
    ["fortuneCycles", "mansionAnalysis"],
    ["compatibility", "mansionAnalysis"],
    ["宿曜.birthMansion", "mansionAnalysis.growthAdvice"],
  ],
  lifeBook: [
    ["profile", "chart.dayMaster", "chart.fourPillars", "chart.tenGods", "elements", "luckCycles.daewoon"],
    ["personality.coreTemperament", "chart.tenGods", "elements"],
    ["usefulGods.analysisBasis", "lifeThemes.growth"],
    ["lifeThemes.career", "personality.workPattern"],
    ["lifeThemes.wealth", "elements"],
    ["lifeThemes.relationship", "personality.relationshipPattern"],
    ["lifeThemes.health", "elements.weakElements"],
    ["luckCycles.daewoon", "luckCycles.yearlyLuck"],
    ["elements.dominantElements", "chart.twelveStages"],
    ["elements.weakElements", "chart.hiddenStems"],
    ["analysis.personality", "analysis.lifeTheme"],
    ["luckCycles", "analysis"],
    ["analysis", "usefulGods"],
  ],
  loveSecret: [
    ["chart.dayMaster", "chart.spousePalace", "chart.tenGods"],
    ["chart.relationshipStars", "chart.peachBlossom", "chart.hongyeom", "chart.hwagae"],
    ["lovePattern.conflictPattern", "chart.tenGods"],
    ["lovePattern.idealPartnerType", "lovePattern.attachmentStyle"],
    ["chart.hongyeom", "chart.hwagae"],
    ["datingAdvice.communicationAdvice"],
    ["datingAdvice.longTermRelationshipAdvice"],
    ["datingAdvice.risksInLove"],
    ["luckCycles.loveDaewoon", "luckCycles.loveYearlyLuck"],
    ["analysis", "datingAdvice"],
  ],
  vedicPremium: [
    ["chart.lagna", "chart.nakshatra", "chart.atmakaraka", "chart.planets", "chart.houses", "dasha.timeline"],
    ["analysis.personality"],
    ["analysis.spiritualGrowth"],
    ["analysis.karmaTheme"],
    ["analysis.relationship"],
    ["analysis.career", "analysis.wealth"],
    ["dasha.timeline"],
    ["chart.planets", "chart.houses"],
    ["chart.lagna", "chart.moonSign"],
    ["analysis.spiritualGrowth", "analysis.karmaTheme"],
    ["chart.planets", "analysis.wealth"],
    ["dasha.currentDasha", "dasha.timeline"],
    ["dasha.timeline", "analysis.career"],
    ["analysis", "chart", "dasha"],
  ],
  westernAstrologyPremium: [
    ["natalChart.sunSign", "natalChart.moonSign", "natalChart.ascendant", "natalChart.planets", "natalChart.houses", "natalChart.aspects"],
    ["natalChart.moonSign", "analysis.emotionPattern"],
    ["natalChart.planets", "natalChart.houses"],
    ["analysis.lovePattern"],
    ["natalChart.aspects"],
    ["analysis.careerPattern"],
    ["analysis.lifeTheme"],
    ["natalChart.planets", "analysis.personality"],
    ["transits.currentTransits"],
    ["analysis", "natalChart"],
    ["natalChart.planets", "natalChart.houses", "natalChart.aspects"],
    ["transits", "analysis.careerPattern"],
    ["analysis", "natalChart", "transits"],
  ],
});

function normalizeMode(reportType, mode) {
  if (reportType !== "loveSecret") return "";
  const token = String(mode || "").trim().toLowerCase();
  return token.includes("compat") || token.includes("couple") ? "compatibility" : "solo";
}

function normalizeChapterTitle(order, title) {
  const safeTitle = String(title || "").trim() || `챕터 ${order}`;
  return `CH.${String(order).padStart(2, "0")} ${safeTitle}`;
}

function toPromptTemplateId(reportType, order) {
  const prefix = String(reportType || "premium")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase();
  return `${prefix}-ch-${String(order).padStart(2, "0")}`;
}

export function getPremiumPdfV2ChapterPlan(reportType, mode = "") {
  const spec = getPremiumSpecByReportType(reportType, normalizeMode(reportType, mode));
  const chapters = Array.isArray(spec?.chapters) ? spec.chapters : [];
  const requiredMatrix = REQUIRED_FIELDS_BY_REPORT[String(reportType || "")] || [];

  return chapters.map((chapter, index) => {
    const order = index + 1;
    const requiredFields = Array.isArray(requiredMatrix[index]) && requiredMatrix[index].length
      ? requiredMatrix[index]
      : ["analysis", "profile"];

    return {
      chapterId: String(chapter?.id || `${String(reportType || "premium")}-${String(order).padStart(2, "0")}`),
      title: normalizeChapterTitle(order, chapter?.title),
      order,
      requiredFields,
      promptTemplateId: toPromptTemplateId(reportType, order),
      minChars: Number(chapter?.minChars || 3000),
      maxChars: Number(chapter?.targetChars || chapter?.minChars || 4500),
    };
  });
}

export function getPremiumPdfV2ChapterPlanMap(reportType, mode = "") {
  const chapterPlan = getPremiumPdfV2ChapterPlan(reportType, mode);
  return Object.fromEntries(chapterPlan.map((chapter) => [chapter.order, chapter]));
}
