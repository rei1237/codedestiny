import type { DevPreviewState } from "@/lib/dev-preview/core";

const SECTION_TITLES = [
  "별자리 상담 요약",
  "태양·달·상승궁 해석",
  "개인 행성 해석",
  "사회 행성 해석",
  "세대 행성 해석",
  "원소와 모드 분석",
  "주요 각도 해석",
  "하우스 해석",
  "현재 트랜짓 흐름",
  "상담 주제별 맞춤 해석",
  "실천 조언",
  "마무리 메시지",
];

function buildParagraph(title: string): string {
  return `${title}과 관련해 출생 차트를 살펴보면, 전반적으로 안정적인 흐름 속에서 스스로의 방향을 찾아가는 시기임을 알 수 있습니다. 태양과 달의 배치가 조화를 이루고 있어 감정과 의지가 크게 부딪히지 않는 편입니다. 지금은 서두르기보다 꾸준히 쌓아가는 태도가 좋은 결과로 이어집니다.`;
}

function buildSuccessText(): string {
  return SECTION_TITLES.map((title) => `**${title}**\n\n${buildParagraph(title)}`).join("\n\n");
}

export function buildAstrologyPreviewPayload(state: DevPreviewState) {
  if (state === "failed") {
    return { ok: false, reason: "LLM_ERROR", message: "AI 상담문을 생성하는 중 문제가 발생했어요. 차감된 내역이 있다면 자동으로 복구됩니다." };
  }

  const fullText = buildSuccessText();
  // 뒤쪽 2개 헤딩(실천 조언/마무리 메시지)이 통째로 사라지고, 그 앞 파트(상담 주제별 맞춤 해석)의
  // 본문이 문장 중간에서 끊긴 실제 잘림 패턴을 재현한다.
  const truncateAt = fullText.indexOf("**실천 조언**");
  const content = state === "truncated"
    ? `${fullText.slice(0, truncateAt)}**상담 주제별 맞춤 해석**\n\n상담 주제별 맞춤 해석과 관련해 출생 차트를 살펴보면, 전반적으로 안정적인 흐름 속에서`
    : fullText;

  // 하우스는 상승궁(게자리 3.1°=절대경도 93.1°)에서 30°씩 등분 배치(데모용 단순화)한
  // 뒤 각 커스프 절대경도로부터 실제 조디악 사인을 역산해 채운다 — 12하우스가 전부
  // 같은 별자리로 나오던 이전 버전의 비현실성을 없앰.
  const ZODIAC = [
    { sign: "aries", signKo: "양자리" }, { sign: "taurus", signKo: "황소자리" },
    { sign: "gemini", signKo: "쌍둥이자리" }, { sign: "cancer", signKo: "게자리" },
    { sign: "leo", signKo: "사자자리" }, { sign: "virgo", signKo: "처녀자리" },
    { sign: "libra", signKo: "천칭자리" }, { sign: "scorpio", signKo: "전갈자리" },
    { sign: "sagittarius", signKo: "사수자리" }, { sign: "capricorn", signKo: "염소자리" },
    { sign: "aquarius", signKo: "물병자리" }, { sign: "pisces", signKo: "물고기자리" },
  ];
  const signAt = (absDegree: number) => ZODIAC[Math.floor(((absDegree % 360) + 360) % 360 / 30)];
  const ascDegree = 93.1;

  return {
    ok: true,
    id: "dev-preview-astrology",
    status: "completed",
    birthInfo: { name: "민준", gender: "male", birthDate: "1989-04-12", birthTime: "08:30" },
    topic: "종합 운세",
    astrologyChart: {
      zodiacType: "tropical",
      houseSystem: "placidus",
      sun: { sign: "aries", signKo: "양자리", degree: 21.4, house: 10 },
      moon: { sign: "cancer", signKo: "게자리", degree: 8.2, house: 1 },
      ascendant: { sign: "cancer", signKo: "게자리", degree: 3.1, house: 1 },
      chartRuler: "달",
      planets: [
        { name: "Sun", label: "태양", sign: "aries", signKo: "양자리", degree: 21.4, house: 10 },
        { name: "Moon", label: "달", sign: "cancer", signKo: "게자리", degree: 8.2, house: 1 },
        { name: "Mercury", label: "수성", sign: "pisces", signKo: "물고기자리", degree: 15.0, house: 9 },
        { name: "Venus", label: "금성", sign: "taurus", signKo: "황소자리", degree: 3.5, house: 11 },
        { name: "Mars", label: "화성", sign: "capricorn", signKo: "염소자리", degree: 27.8, house: 7 },
        { name: "Jupiter", label: "목성", sign: "leo", signKo: "사자자리", degree: 12.1, house: 2 },
        { name: "Saturn", label: "토성", sign: "aquarius", signKo: "물병자리", degree: 19.6, house: 8 },
        { name: "Uranus", label: "천왕성", sign: "taurus", signKo: "황소자리", degree: 25.0, house: 11 },
        { name: "Neptune", label: "해왕성", sign: "pisces", signKo: "물고기자리", degree: 28.9, house: 9 },
        { name: "Pluto", label: "명왕성", sign: "capricorn", signKo: "염소자리", degree: 26.3, house: 7 },
      ],
      houses: Array.from({ length: 12 }, (_, index) => {
        const cuspDegree = (ascDegree + index * 30) % 360;
        const zodiac = signAt(cuspDegree);
        return { house: index + 1, sign: zodiac.sign, signKo: zodiac.signKo, cuspDegree, planets: index === 0 ? ["달"] : [] };
      }),
      elementBalance: { fire: 3, earth: 2, air: 3, water: 4 },
      modalityBalance: { cardinal: 5, fixed: 4, mutable: 3 },
      majorAspects: [
        { planetA: "태양", aspect: "trine", planetB: "달", orb: 2.1 },
        { planetA: "태양", aspect: "square", planetB: "토성", orb: 3.4 },
        { planetA: "달", aspect: "opposition", planetB: "화성", orb: 1.8 },
        { planetA: "금성", aspect: "sextile", planetB: "목성", orb: 2.6 },
        { planetA: "수성", aspect: "conjunction", planetB: "해왕성", orb: 1.2 },
      ],
    },
    messages: [{ role: "assistant", content, createdAt: "2026-07-08T09:00:00.000Z" }],
  };
}
