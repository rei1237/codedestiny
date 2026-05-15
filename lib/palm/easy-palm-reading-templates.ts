import type { PalmAnalysisPurpose } from "@/types/palm-reading";

export const PURPOSE_FOCUS_COPY: Record<PalmAnalysisPurpose, string> = {
  general: "전체 흐름을 가볍고 정확하게 읽어 현재 페이스를 정리했어요.",
  love: "연애에서 마음이 움직이는 방식과 관계 온도를 중심으로 읽었어요.",
  wealth: "돈이 들어오고 나가는 습관, 그리고 수익으로 이어지는 포인트를 중심으로 읽었어요.",
  career: "일의 방향, 성장 속도, 지금 밀어야 할 포인트를 중심으로 읽었어요.",
  personality: "생각 습관과 감정 반응, 타고난 매력을 중심으로 읽었어요.",
  relationship: "사람과 가까워지는 방식, 거리 조절, 소통 리듬을 중심으로 읽었어요.",
};

export const HAND_SHAPE_TONE: Record<string, string> = {
  earth: "현실 감각이 좋고 차근차근 쌓아가는 힘이 있는 편",
  fire: "시작이 빠르고 열정이 살아 있는 편",
  air: "생각이 빠르고 말의 센스가 살아 있는 편",
  water: "감정 공감이 깊고 분위기를 잘 읽는 편",
  mixed: "상황에 맞춰 유연하게 움직이는 편",
  unknown: "한 가지 성향으로 단정하기보다 여러 매력이 함께 보이는 편",
};

export const SECTION_LABELS = {
  oneLiner: "🌙 한 줄 손금 요약",
  overall: "🌟 전체 운세",
  love: "💗 연애 스타일",
  wealth: "💰 돈이 붙는 방식",
  career: "🧭 일과 진로 흐름",
  personality: "✨ 성격과 매력",
  healthEnergy: "🌱 에너지와 회복력",
  relationship: "🤝 관계운",
  advice: "🔮 오늘의 손금 조언",
} as const;

export const CARD_TITLE_BY_KEY = {
  lifeLine: "🌱 에너지와 회복력",
  headLine: "🧠 생각과 선택 스타일",
  heartLine: "💗 연애 스타일",
  fateLine: "🧭 일과 진로 흐름",
  sunLine: "✨ 매력과 존재감",
  moneyLine: "💰 돈이 붙는 방식",
  marriageLine: "🤝 관계운",
  mounts: "🌟 손금 종합 분위기",
} as const;

export const SOFT_UNCERTAIN_COPY = {
  love: "이번 사진에서는 관계 흐름이 한쪽으로 딱 고정되기보다, 앞으로의 선택에 따라 충분히 달라질 여지가 커 보여요.",
  wealth: "한 번에 크게 터지는 흐름보다 작은 기회를 차근차근 키울 때 결과가 더 좋아지는 타입으로 읽혀요.",
  career: "지금은 정답 하나를 고르는 시기라기보다, 맞는 방향을 테스트하며 나에게 맞는 속도를 찾는 시기에 가까워요.",
  health: "이번 손에서는 이 부분이 아주 강하게 드러나기보다 생활 리듬에 따라 달라지는 흐름으로 보여요.",
  relationship: "관계운은 아직 한 모양으로 굳었다기보다, 어떤 사람과 어떤 대화를 쌓는지에 따라 유연하게 바뀔 수 있어요.",
};

export const FORBIDDEN_RENDER_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\blong\b/gi, replacement: "오래 가는 흐름" },
  { pattern: /\bshort\b/gi, replacement: "짧게 집중하는 흐름" },
  { pattern: /\bmedium\b/gi, replacement: "균형 흐름" },
  { pattern: /\bdeep\b/gi, replacement: "선명한 흐름" },
  { pattern: /\bweak\b/gi, replacement: "잔잔한 흐름" },
  { pattern: /upperPalm|middlePalm|lowerPalm/gi, replacement: "손바닥 흐름" },
  { pattern: /palmRatio|fingerRatio/gi, replacement: "손 형태 흐름" },
  { pattern: /\bbranch\b|\bbreak\b/gi, replacement: "변화 포인트" },
  { pattern: /detected|not detected|confidence|raw|vector/gi, replacement: "흐름" },
  { pattern: /좌표|검출값|검출 근거|후천적 손 관점|해석 프레임|구조적 해석|보수적 해석/g, replacement: "생활 흐름 참고" },
  { pattern: /감지되지 않음|미검출/g, replacement: "아직 흐름이 또렷하지 않은 상태" },
  { pattern: /구丘|금성구|월구|목성구|토성구|태양구|수성구|화성구/g, replacement: "에너지 포인트" },
];

export const FORBIDDEN_POLICY_WORDS: readonly string[] = [
  "long",
  "short",
  "medium",
  "deep",
  "weak",
  "upperPalm",
  "middlePalm",
  "lowerPalm",
  "palmRatio",
  "fingerRatio",
  "branch",
  "break",
  "detected",
  "not detected",
  "confidence",
  "raw",
  "vector",
  "좌표",
  "검출값",
  "검출 근거",
  "후천적 손 관점",
  "해석 프레임",
  "구조적 해석",
  "보수적 해석",
  "감지되지 않음",
  "미검출",
  "구丘",
  "금성구",
  "월구",
  "목성구",
  "토성구",
  "태양구",
  "수성구",
  "화성구",
];
