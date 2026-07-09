// 첫 방문 전용 환영 문구 — 커플 이름 기반 결정적 해시로 선택(매번 랜덤이면 1회만 노출되므로 의미 없음)
export const WELCOME_QUOTES: string[] = [
  "달빛은 두 사람의 거리를 가늠하지 않고, 다만 함께 걷는 길을 비출 뿐이에요.",
  "궁합은 정답이 아니라, 서로를 더 다정하게 바라보는 질문이에요.",
  "인연의 결은 다르지만, 그 결을 함께 매만지는 손길이 관계를 만들어요.",
  "오늘의 별자리는 두 사람이 나눌 이야기의 첫 문장일 뿐이에요.",
  "가장 좋은 궁합은, 다른 점을 두려워하지 않는 마음에서 시작돼요.",
  "별의 거리보다, 마주 보는 오늘의 대화가 관계를 가깝게 만들어요.",
];

export function pickWelcomeQuote(nameA: string, nameB: string): string {
  const key = `${nameA}·${nameB}`;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return WELCOME_QUOTES[hash % WELCOME_QUOTES.length];
}
