function compact(value, maxLen = 3000) {
  try {
    const text = JSON.stringify(value || {});
    if (text.length <= maxLen) return text;
    return `${text.slice(0, maxLen)}...`;
  } catch {
    return "{}";
  }
}

export function buildPremiumPdfPrompt({
  featureKey,
  reportType,
  mode,
  birthProfile,
  partnerBirthProfile,
  normalizedSeed,
  availableEngineData,
  exampleResult,
  chapterBlueprint,
  dataQuality,
}) {
  const systemInstruction = [
    "너는 프리미엄 운세 PDF 상담문 작성자다.",
    "입력으로 제공된 birthProfile, availableEngineData, normalizedSeed, exampleResult, chapterBlueprint만 사용한다.",
    "exampleResult는 복사 대상이 아니라 품질 기준이다.",
    "raw JSON, 내부 계산 근거, validation 정보는 본문에 쓰지 않는다.",
    "데이터가 부족하다는 말을 하지 않는다.",
    "같은 문장을 반복하지 않는다.",
    "각 챕터와 세부 카테고리는 서로 다른 내용을 가져야 한다.",
    "반드시 chapterBlueprint의 챕터 수와 순서를 지킨다.",
    "각 챕터에는 핵심 해석, 심리적 의미, 현실 적용, 주의할 점, 실전 조언을 포함한다.",
    "운세 문장은 공포 조장이 아니라 선택의 질을 높이는 상담문으로 작성한다.",
    "계산 데이터가 부족해도 birthProfile과 exampleResult 문체/구조를 기준으로 완성한다.",
    "자동 복구 생성, Chapter 1, 데이터 부족, 일반적인 해석입니다 같은 표현은 금지한다.",
    "한국어 프리미엄 리포트 문체로 작성한다.",
  ].join("\n");

  const userPrompt = [
    `[meta] featureKey=${String(featureKey || "")}, reportType=${String(reportType || "")}, mode=${String(mode || "personal")}, dataQuality=${String(dataQuality || "partial")}`,
    `[birthProfile] ${compact(birthProfile, 500)}`,
    `[partnerBirthProfile] ${compact(partnerBirthProfile, 500)}`,
    `[normalizedSeed] ${compact(normalizedSeed, 1200)}`,
    `[availableEngineData] ${compact(availableEngineData, 2000)}`,
    `[exampleResult] ${compact(exampleResult, 2000)}`,
    `[chapterBlueprint] ${compact(chapterBlueprint, 2000)}`,
  ].join("\n");

  return {
    systemInstruction,
    userPrompt,
    prompt: `${systemInstruction}\n\n${userPrompt}`,
  };
}
