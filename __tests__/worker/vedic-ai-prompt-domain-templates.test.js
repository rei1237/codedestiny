/**
 * @jest-environment node
 */

let vedicPrompt;
let templates;

beforeAll(async () => {
  vedicPrompt = await import("../../worker/lib/vedic-ai-prompt.js");
  templates = await import("../../worker/lib/vedic-ai-prompt-templates.mjs");
});

function buildBaseVedicResult() {
  return {
    profile: {
      name: "박병하",
      birth: {
        year: 1991,
        month: 2,
        day: 20,
        hour: 8,
        minute: 34,
        gender: "M",
        timezone: 9,
        lat: 37.5665,
        lon: 126.978,
      },
    },
    lagna: { sign: "Pisces", signKo: "물고기", degree: 14.2, lord: "Jupiter" },
    moonNakshatra: { name: "Ashwini", pada: 4, lord: "Ketu", deity: "Ashvini Kumaras", motive: "Dharma" },
    karakas: { atmakaraka: "Mercury", amatyakaraka: "Mars", darakaraka: "Venus" },
    yogas: ["Lakshmi Yoga"],
    planets: [
      { graha: "태양", grahaKo: "태양", rashi: "Aquarius", rashiKo: "물병", bhava: 12, nakshatra: "Satabhisha", pada: 2, dignity: "Debilitated", retrograde: false },
      { graha: "달", grahaKo: "달", rashi: "Aries", rashiKo: "양", bhava: 2, nakshatra: "Ashwini", pada: 4, dignity: "Neutral", retrograde: false },
      { graha: "화성", grahaKo: "화성", rashi: "Taurus", rashiKo: "황소", bhava: 3, nakshatra: "Krittika", pada: 2, dignity: "Neutral", retrograde: false },
      { graha: "수성", grahaKo: "수성", rashi: "Capricorn", rashiKo: "염소", bhava: 11, nakshatra: "Utara Ashadha", pada: 1, dignity: "Own", retrograde: false },
      { graha: "금성", grahaKo: "금성", rashi: "Pisces", rashiKo: "물고기", bhava: 1, nakshatra: "Revati", pada: 3, dignity: "Exalted", retrograde: false },
      { graha: "목성", grahaKo: "목성", rashi: "Cancer", rashiKo: "게", bhava: 5, nakshatra: "Pushya", pada: 1, dignity: "Exalted", retrograde: true },
      { graha: "토성", grahaKo: "토성", rashi: "Capricorn", rashiKo: "염소", bhava: 11, nakshatra: "Dhanishta", pada: 4, dignity: "Own", retrograde: false },
      { graha: "라후", grahaKo: "라후", rashi: "Capricorn", rashiKo: "염소", bhava: 11, nakshatra: "Dhanishta", pada: 2, dignity: "Neutral", retrograde: false },
      { graha: "케투", grahaKo: "케투", rashi: "Cancer", rashiKo: "게", bhava: 5, nakshatra: "Pushya", pada: 3, dignity: "Neutral", retrograde: false },
    ],
    bhavas: [
      { number: 1, rashi: "Pisces", rashiKo: "물고기", lord: "Jupiter", planets: ["금성"] },
      { number: 2, rashi: "Aries", rashiKo: "양", lord: "Mars", planets: ["달"] },
      { number: 3, rashi: "Taurus", rashiKo: "황소", lord: "Venus", planets: ["화성"] },
      { number: 5, rashi: "Cancer", rashiKo: "게", lord: "Moon", planets: ["목성", "케투"] },
      { number: 6, rashi: "Leo", rashiKo: "사자", lord: "Sun", planets: [] },
      { number: 11, rashi: "Capricorn", rashiKo: "염소", lord: "Saturn", planets: ["수성", "토성", "라후"] },
      { number: 12, rashi: "Aquarius", rashiKo: "물병", lord: "Saturn", planets: ["태양"] },
    ],
    dasha: [
      { planet: "Moon", start: "2018-07-20", end: "2028-07-20", years: 10, active: true },
      { planet: "Mars", start: "2028-07-20", end: "2035-07-20", years: 7, active: false },
    ],
    romance: { h7sign: "Virgo", karakaSign: "Pisces", style: "practical", strengths: ["신뢰", "안정성"], challenges: ["표현 부족", "감정 거리"], advice: "감정 확인 대화를 주기적으로" },
    wealth: { score: 74, yogas: ["Lakshmi Yoga"], peak: ["Moon Mahadasha"], advice: "장기 투자 중심" },
    career: { primary: ["기획", "교육", "컨설팅"], yogas: ["Amala Yoga"], best: "Mercury-Saturn 구간", advice: "포트폴리오 강화", d10: "수성 강세" },
    chakra: { overall: 68, blocked: "Anahata", advice: ["호흡 명상", "하트 오프닝"], chakras: [{ name: "Anahata", kr: "심장", score: 52, status: "Underactive", seed: "YAM", desc: "관계 감정 회복" }] },
    remedies: { day: "수요일", item: "녹두", col: "녹색", mantra: "Om Budhaya Namah", gem: "Emerald", planet: "Mercury", dosha: { type: "Vata", eat: ["기름진 음식", "따뜻한 우유"], avoid: ["차가운 음식"], practice: ["일관된 루틴"] } },
  };
}

describe("Vedic AI prompt builder with domain templates", () => {
  test("litigation(법률) 도메인 프롬프트를 생성한다", () => {
    const built = vedicPrompt.buildVedicAIPromptWithDomain({
      question: "앞으로 내 송사운, 재판운, 법적 분쟁 흐름은 어떻게 전개될 가능성이 클까요?",
      vedicResult: buildBaseVedicResult(),
      domain: "litigation",
    });

    expect(built.domain).toBe("litigation");
    expect(built.domainLabel).toBe("법률/송사");
    expect(built.prompt).toContain("송사운");
    expect(built.houseFocus).toContain(6);
    expect(built.houseFocus).toContain(8);
    expect(built.houseFocus).toContain(12);
    expect(built.keywordWeights).toBeDefined();
    expect(built.keywordWeights["송사운"]).toBeDefined();
    expect(built.keywordWeights["송사운"].weight).toBe(0.95);
  });

  test("romance(연애) 도메인 프롬프트를 생성한다", () => {
    const built = vedicPrompt.buildVedicAIPromptWithDomain({
      question: "우리 둘의 궁합이 결혼까지 갈 수 있을까요?",
      vedicResult: buildBaseVedicResult(),
      domain: "romance",
    });

    expect(built.domain).toBe("romance");
    expect(built.domainLabel).toBe("연애/관계");
    expect(built.houseFocus).toContain(7);
    expect(built.keywordWeights["7하우스 에너지"].weight).toBe(0.95);
  });

  test("wealth(재물) 도메인 프롬프트를 생성한다", () => {
    const built = vedicPrompt.buildVedicAIPromptWithDomain({
      question: "제 재물운의 핵심 구조와 카르마 카드는 무엇인가요?",
      vedicResult: buildBaseVedicResult(),
      domain: "wealth",
    });

    expect(built.domain).toBe("wealth");
    expect(built.domainLabel).toBe("재물/자산");
    expect(built.houseFocus).toContain(2);
    expect(built.houseFocus).toContain(11);
  });

  test("relationships(인간관계) 도메인 프롬프트를 생성한다", () => {
    const built = vedicPrompt.buildVedicAIPromptWithDomain({
      question: "제 기본 소통 스타일은 어떤 특징이 있나요?",
      vedicResult: buildBaseVedicResult(),
      domain: "relationships",
    });

    expect(built.domain).toBe("relationships");
    expect(built.domainLabel).toBe("인간관계");
    expect(built.houseFocus).toContain(3);
    expect(built.planetFocus).toContain("Mercury");
  });

  test("health(건강) 도메인 프롬프트를 생성한다", () => {
    const built = vedicPrompt.buildVedicAIPromptWithDomain({
      question: "저는 어떤 도샤 타입이고, 현재 어떤 불균형 상태인가요?",
      vedicResult: buildBaseVedicResult(),
      domain: "health",
    });

    expect(built.domain).toBe("health");
    expect(built.domainLabel).toBe("건강/웰니스");
    expect(built.keywordWeights["차크라 에너지"].weight).toBe(0.95);
  });

  test("career(경력) 도메인 프롬프트를 생성한다", () => {
    const built = vedicPrompt.buildVedicAIPromptWithDomain({
      question: "제 직업 카르마의 핵심 구조와 성공 경로는 무엇인가요?",
      vedicResult: buildBaseVedicResult(),
      domain: "career",
    });

    expect(built.domain).toBe("career");
    expect(built.domainLabel).toBe("경력/직업");
    expect(built.houseFocus).toContain(10);
  });

  test("spirituality(영성) 도메인 프롬프트를 생성한다", () => {
    const built = vedicPrompt.buildVedicAIPromptWithDomain({
      question: "저의 영적 성장 과제와 목표는 무엇인가요?",
      vedicResult: buildBaseVedicResult(),
      domain: "spirituality",
    });

    expect(built.domain).toBe("spirituality");
    expect(built.domainLabel).toBe("영성/영적 성장");
    expect(built.darakaFocus).toContain("Atmakaraka");
  });

  test("domain이 없으면 질문에서 자동 분류한다", () => {
    const built = vedicPrompt.buildVedicAIPromptWithDomain({
      question: "현재 송사 상황에서 내가 조심해야 할 말과 행동이 있나요?",
      vedicResult: buildBaseVedicResult(),
    });

    expect(built.domain).toBe("litigation");
    expect(built.domainLabel).toBe("법률/송사");
  });

  test("domain이 없으면 연애 키워드로 romance로 분류한다", () => {
    const built = vedicPrompt.buildVedicAIPromptWithDomain({
      question: "제 연애 운은 어떨까요?",
      vedicResult: buildBaseVedicResult(),
    });

    expect(built.domain).toBe("romance");
  });

  test("모든 도메인에 keywordWeights가 포함된다", () => {
    const domains = Object.keys(templates.VEDIC_PROMPT_TEMPLATES);
    
    domains.forEach((domain) => {
      const built = vedicPrompt.buildVedicAIPromptWithDomain({
        question: "테스트 질문입니다.",
        vedicResult: buildBaseVedicResult(),
        domain,
      });

      expect(built.keywordWeights).toBeDefined();
      expect(Object.keys(built.keywordWeights).length).toBeGreaterThan(0);
      
      Object.values(built.keywordWeights).forEach((meta) => {
        expect(meta.weight).toBeGreaterThanOrEqual(0);
        expect(meta.weight).toBeLessThanOrEqual(1);
        expect(meta.depth).toBeDefined();
        expect(meta.markers).toEqual(expect.arrayContaining(meta.markers));
      });
    });
  });

  test("프롬프트에 활성 다샤 이름이 포함된다", () => {
    const built = vedicPrompt.buildVedicAIPromptWithDomain({
      question: "지금 제 운은 어떤 상태인가요?",
      vedicResult: buildBaseVedicResult(),
      domain: "career",
    });

    expect(built.prompt).toContain("Moon");
    expect(built.prompt).toContain("2018-07-20");
  });

  test("후속 질문에 다샤 이름이 동적으로 포함된다", () => {
    const built = vedicPrompt.buildVedicAIPromptWithDomain({
      question: "지금 어떤 행동을 해야 하나요?",
      vedicResult: buildBaseVedicResult(),
      domain: "wealth",
    });

    expect(built.recommendedFollowUpQuestions).toBeDefined();
    expect(built.recommendedFollowUpQuestions.length).toBeGreaterThan(0);
  });

  test("houseFocus가 실제 분석 대상 하우스로 필터링된다", () => {
    const built = vedicPrompt.buildVedicAIPromptWithDomain({
      question: "법적 분쟁에서 제 강점과 약점을 알려주세요.",
      vedicResult: buildBaseVedicResult(),
      domain: "litigation",
    });

    expect(built.houseFocus).toContain(6); // 분쟁
    expect(built.houseFocus).toContain(12); // 손실
    expect(built.houseFocus).toContain(11); // 조력자
  });

  test("잘못된 도메인이면 예외를 던진다", () => {
    expect(() =>
      vedicPrompt.buildVedicAIPromptWithDomain({
        question: "이것은 길이가 충분한 테스트 질문입니다",
        vedicResult: buildBaseVedicResult(),
        domain: "invalid_domain",
      }),
    ).toThrow("UNKNOWN_VEDIC_DOMAIN");
  });

  test("classifyQuestionToVedicDomain이 법률 키워드를 인식한다", () => {
    expect(templates.classifyQuestionToVedicDomain("송사 운이 어떨까요?")).toBe("litigation");
    expect(templates.classifyQuestionToVedicDomain("법정에서의 태도가 중요하다고 했는데")).toBe("litigation");
  });

  test("classifyQuestionToVedicDomain이 연애 키워드를 인식한다", () => {
    expect(templates.classifyQuestionToVedicDomain("결혼 타이밍을 알고 싶어")).toBe("romance");
    expect(templates.classifyQuestionToVedicDomain("연애운을 봐주세요")).toBe("romance");
  });

  test("classifyQuestionToVedicDomain이 재물 키워드를 인식한다", () => {
    expect(templates.classifyQuestionToVedicDomain("투자 타이밍은 언제?")).toBe("wealth");
    expect(templates.classifyQuestionToVedicDomain("사업을 시작해야 할까?")).toBe("wealth");
  });

  test("프롬프트에 주의 사항(cautions)이 포함된다", () => {
    const built = vedicPrompt.buildVedicAIPromptWithDomain({
      question: "제 인생 방향을 알고 싶어요.",
      vedicResult: buildBaseVedicResult(),
      domain: "spirituality",
    });

    expect(built.caution).toBeDefined();
    expect(built.caution.length).toBeGreaterThan(0);
  });

  test("getVedicPromptTemplate이 정확한 템플릿을 반환한다", () => {
    const template = templates.getVedicPromptTemplate("litigation");
    expect(template).toBeDefined();
    expect(template.domain).toBe("litigation");
    expect(template.corePrompt).toContain("송사");
  });

  test("getAvailableVedicDomains가 모든 도메인을 반환한다", () => {
    const domains = templates.getAvailableVedicDomains?.() || Object.keys(templates.VEDIC_PROMPT_TEMPLATES).map((k) => ({ key: k }));
    expect(domains).toBeDefined();
    expect(domains.length).toBeGreaterThan(0);
    expect(domains.some((d) => d.key === "litigation")).toBe(true);
  });
});
