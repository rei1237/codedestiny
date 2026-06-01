import { SajuAnalysis, SajuElement } from "../_types";

export interface PersonaTraits {
  tone: string;
  attractionPoints: string[];
  conflictStyle: string;
  idealType: string;
}

export function derivePersonaFromSaju(saju: SajuAnalysis): PersonaTraits {
  const dm = saju.dayMasterElement;
  const isStrong = saju.isStrong;

  // 1. 말투 (Tone)
  let tone = "차분한 말투";
  if (dm === "화") tone = isStrong ? "열정적이고 확신에 찬 말투" : "밝고 사교적인 말투";
  if (dm === "수") tone = isStrong ? "깊이 있고 신중한 말투" : "유연하고 부드러운 말투";
  if (dm === "목") tone = isStrong ? "직설적이고 리더십 있는 말투" : "성장 지향적이고 다정한 말투";
  if (dm === "금") tone = isStrong ? "냉철하고 단호한 말투" : "섬세하고 예의 바른 말투";
  if (dm === "토") tone = isStrong ? "묵직하고 신뢰감 있는 말투" : "포용력 있고 편안한 말투";

  // 2. 호감 포인트 (Attraction Points)
  const attractionPoints: string[] = [];
  if (saju.yongshin.includes("화")) attractionPoints.push("밝은 에너지", "열정적인 모습");
  if (saju.yongshin.includes("수")) attractionPoints.push("차분한 지성", "유연한 대처");
  if (saju.yongshin.includes("목")) attractionPoints.push("새로운 도전", "성장하는 모습");
  if (saju.yongshin.includes("금")) attractionPoints.push("깔끔한 정리", "원칙을 지키는 모습");
  if (saju.yongshin.includes("토")) attractionPoints.push("든든한 안정감", "한결같은 마음");

  if (attractionPoints.length === 0) {
    attractionPoints.push("솔직한 대화", "서로를 존중하는 마음");
  }

  const dominantElement = Object.entries(saju.elements || {})
    .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))[0]?.[0] as SajuElement | undefined;

  // 3. 갈등 패턴 (Conflict Style)
  let conflictStyle = "대화로 풀어나가려는 편";
  if (dm === "금" || dm === "화") conflictStyle = "문제를 즉시 해결하고 싶어 하는 편";
  if (dm === "수" || dm === "토") conflictStyle = "시간을 두고 감정을 정리한 뒤 대화하는 편";
  if (isStrong) conflictStyle += " (자기 주관이 뚜렷함)";
  if (dominantElement === "수") conflictStyle += " / 감정 소모가 크면 잠시 침묵";
  if (dominantElement === "화") conflictStyle += " / 감정 온도 변화가 빠름";

  // 4. 이상형 (Ideal Type)
  let idealType = "나와 가치관이 비슷한 사람";
  const elements = saju.elements;
  const weakElement = Object.entries(elements).sort((a, b) => a[1] - b[1])[0][0] as SajuElement;
  
  if (weakElement === "화") idealType = "따뜻하고 밝은 에너지를 가진 사람";
  if (weakElement === "수") idealType = "지혜롭고 유연한 사고를 가진 사람";
  if (weakElement === "목") idealType = "생동감 넘치고 꿈이 있는 사람";
  if (weakElement === "금") idealType = "결단력 있고 기준이 명확한 사람";
  if (weakElement === "토") idealType = "포용력 있고 나를 지지해주는 사람";

  if (saju.kishin.includes("수")) idealType += " · 감정 회피 없이 대화하는 사람";
  if (saju.kishin.includes("화")) idealType += " · 감정 기복을 존중해주는 사람";

  return {
    tone,
    attractionPoints: attractionPoints.slice(0, 2),
    conflictStyle,
    idealType,
  };
}
