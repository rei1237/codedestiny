export function createChapterBlueprint({ featureKey, reportType, mode = "personal", chapters = [], rotatingMessages = [] }) {
  return {
    featureKey,
    reportType,
    mode,
    chapters,
    rotatingMessages,
  };
}

export function mapSimpleChapters(items = []) {
  return items.map((title, index) => ({
    chapterNo: index + 1,
    title: String(title || `Chapter ${index + 1}`).trim(),
    sections: ["핵심 해석", "심리적 의미", "현실 적용", "주의할 점", "실전 조언"],
  }));
}
