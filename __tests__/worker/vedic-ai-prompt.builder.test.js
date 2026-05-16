/**
 * @jest-environment node
 */

let vedicPrompt;

beforeAll(async () => {
  vedicPrompt = await import("../../worker/lib/vedic-ai-prompt.js");
});

function buildBaseVedicResult() {
  return {
    profile: {
      name: "홍길동",
      birth: {
        year: 1991,
        month: 8,
        day: 17,
        hour: 9,
        minute: 20,
        gender: "M",
        timezone: 9,
        lat: 37.5665,
        lon: 126.978,
      },
    },
    lagna: { sign: "Leo", signKo: "사자", degree: 14.2, lord: "Sun" },
    moonNakshatra: { name: "Ashwini", pada: 2, lord: "Ketu", deity: "Ashvini Kumaras", motive: "Dharma" },
    karakas: { atmakaraka: "Saturn", amatyakaraka: "Mercury", darakaraka: "Venus" },
    yogas: ["Gaja Kesari Yoga"],
    planets: [
      { graha: "Sun", grahaKo: "태양", rashi: "Leo", rashiKo: "사자", bhava: 1, nakshatra: "Magha", pada: 2, dignity: "Own", retrograde: false },
      { graha: "Moon", grahaKo: "달", rashi: "Aries", rashiKo: "양", bhava: 9, nakshatra: "Ashwini", pada: 2, dignity: "Neutral", retrograde: false },
    ],
    bhavas: [
      { number: 1, rashi: "Leo", rashiKo: "사자", lord: "Sun", planets: ["Sun"] },
      { number: 10, rashi: "Taurus", rashiKo: "황소", lord: "Venus", planets: ["Mercury"] },
    ],
    dasha: [
      { planet: "Jupiter", start: "2021-04-01", end: "2037-04-01", years: 16, active: true },
      { planet: "Saturn", start: "2037-04-01", end: "2056-04-01", years: 19, active: false },
    ],
    romance: { h7sign: "Aquarius", karakaSign: "Pisces", style: "slow burn", strengths: ["신뢰"], challenges: ["표현 부족"], advice: "감정 확인 대화를 주기적으로" },
    wealth: { score: 74, yogas: ["Dhana Yoga"], peak: ["Jupiter Mahadasha"], advice: "장기 투자 중심" },
    career: { primary: ["기획", "교육"], yogas: ["Amala Yoga"], best: "목성-수성 구간", advice: "포트폴리오 강화", d10: "수성 강세" },
    chakra: { overall: 68, blocked: "Anahata", advice: ["호흡 명상"], chakras: [{ name: "Anahata", kr: "심장", score: 52, status: "Underactive", seed: "YAM", desc: "관계 감정 회복" }] },
    remedies: { day: "목요일", item: "병아리콩", col: "노랑", mantra: "Om Gurave Namah", gem: "Yellow Sapphire", planet: "Jupiter", dosha: { type: "Pitta", eat: ["오이"], avoid: ["매운 음식"], practice: ["저녁 호흡"], }, },
  };
}

describe("Vedic AI prompt builder", () => {
  test("직업 질문을 career 유형으로 분류하고 프롬프트를 생성한다", () => {
    const built = vedicPrompt.buildVedicAIPrompt({
      question: "올해 이직 타이밍과 준비 순서를 알고 싶어.",
      vedicResult: buildBaseVedicResult(),
    });

    expect(built.questionType).toBe("career");
    expect(built.prompt).toContain("베다 점성술 기반 AI 상담 프롬프트");
    expect(built.compatibilityUsed).toBe(false);
  });

  test("궁합 질문에서 궁합 데이터가 없으면 예외를 던진다", () => {
    expect(() => vedicPrompt.buildVedicAIPrompt({
      question: "우리 둘 궁합이 결혼까지 갈 수 있을까?",
      vedicResult: buildBaseVedicResult(),
      compatibilityResult: null,
    })).toThrow("MISSING_COMPATIBILITY_RESULT");
  });

  test("궁합 데이터가 있으면 compatibilityUsed=true로 생성된다", () => {
    const built = vedicPrompt.buildVedicAIPrompt({
      question: "상대와의 궁합 데이터를 기준으로 갈등 완화 전략을 알려줘.",
      vedicResult: buildBaseVedicResult(),
      compatibilityResult: {
        partner: { name: "이영희", birth: { year: 1992, month: 3, day: 15 } },
        ashtakoota: {
          total: 27,
          totalMax: 36,
          pct: 75,
          verdict: "좋은 궁합",
          breakdown: [
            { name: "Varna", score: 1, max: 1, label: "가치관" },
            { name: "Nadi", score: 8, max: 8, label: "체질" },
          ],
        },
        strengths: ["정서적 공감"],
        challenges: ["의사결정 속도 차이"],
        advice: "갈등 시 24시간 규칙을 사용",
        overallReason: "핵심 항목은 우수하나 생활 리듬 조율이 중요",
      },
    });

    expect(built.questionType).toBe("compatibility");
    expect(built.compatibilityUsed).toBe(true);
    expect(built.prompt).toContain("아쉬타쿠타 점수: 27/36");
  });
});
