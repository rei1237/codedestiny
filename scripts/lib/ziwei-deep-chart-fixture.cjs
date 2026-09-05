// 심화 자미두수 가드 공용 샘플 명반(A/B 두 변형).
//
// 원래 scripts/verify-ziwei-deep-counseling-quality.cjs 안에 있던 빌더를 그대로 옮긴 것이다(2026-09-05).
// verify:ziwei-deep-counseling-quality(챕터 산문) 와 verify:ziwei-chart-customer-copy(화면 해석 빌더) 가
// 같은 명반을 넣어 검사하므로, 별·사화·공궁 배치를 바꾸면 두 가드의 하한·금지어 판정이 같이 움직인다.
// ZIWEI_PALACE_NAME 은 app/_lib/ziwei-types.ts 의 것을 호출자가 로드해 넘긴다(여기서 TS 를 로드하지 않는다).

function createStar(name, symbol, transformation = null) {
  return {
    name,
    symbol,
    strengthSymbol: symbol,
    strength: symbol === "◎" ? "묘" : symbol === "O" ? "득" : symbol === "▲" ? "리" : symbol === "△" ? "평" : symbol === "X" ? "함" : "",
    transformation,
  };
}

function buildSampleChart(variant, ZIWEI_PALACE_NAME) {
  const palaceIds = Object.keys(ZIWEI_PALACE_NAME);
  const starTriples = [
    ["자미", "문창", "경양"],
    ["천기", "좌보", "화성"],
    ["태음", "우필", "지겁"],
    ["무곡", "문곡", "타라"],
    ["거문", "천괴", "경양"],
    ["천량", "천월", "화성"],
    ["탐랑", "천희", "지겁"],
    ["천동", "해신", "타라"],
    ["칠살", "좌보", "경양"],
    ["파군", "우필", "화성"],
    ["태양", "문창", "지겁"],
    ["천상", "문곡", "타라"],
  ];
  const symbols = variant === "A" ? ["◎", "O", "▲", "△", "X"] : ["O", "▲", "△", "X", "◎"];
  const transforms = [null, "화록", "화권", "화과", "화기"];

  const palaces = palaceIds.map((id, index) => {
    const [mainName, supportName, maleficName] = starTriples[index % starTriples.length];
    const mainSymbol = symbols[index % symbols.length];
    const supportSymbol = symbols[(index + 1) % symbols.length];
    const maleficSymbol = symbols[(index + 2) % symbols.length];
    const oppositePalaceId = palaceIds[(index + 6) % palaceIds.length];
    const triadPalaceIds = [palaceIds[(index + 4) % palaceIds.length], palaceIds[(index + 8) % palaceIds.length]];
    const isEmpty = variant === "B" ? index === 2 || index === 10 : index === 5;

    const mainStars = isEmpty ? [] : [createStar(mainName, mainSymbol, transforms[(index + 1) % transforms.length])];
    const auxiliaryStars = [createStar(supportName, supportSymbol, transforms[(index + 2) % transforms.length])];
    const maleficStars = [createStar(maleficName, maleficSymbol, transforms[(index + 3) % transforms.length])];
    const luckyStars = [createStar("천복", "▲", null)];
    const minorStars = [createStar("천마", index % 2 ? "△" : "X", null)];
    const fourTransformations = index % 3 === 0
      ? [{ type: "록", starName: mainName || supportName }, { type: "기", starName: maleficName }]
      : [];
    const incomingFourTransformations = index % 2 === 0
      ? [{ type: "권", starName: supportName }, { type: "과", starName: mainName || supportName }]
      : [];

    return {
      index,
      id,
      name: ZIWEI_PALACE_NAME[id],
      normalizedName: ZIWEI_PALACE_NAME[id],
      branch: ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"][index],
      earthlyBranch: ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"][index],
      mainStars,
      subStars: [...auxiliaryStars],
      minorStars,
      allStars: [...mainStars, ...auxiliaryStars, ...maleficStars, ...minorStars],
      auxiliaryStars,
      maleficStars,
      luckyStars,
      isEmptyMainStarPalace: isEmpty,
      strengthSummary: {
        strongestStars: [...mainStars, ...auxiliaryStars].filter((s) => ["◎", "O", "▲"].includes(s.strengthSymbol || "")),
        weakStars: [...mainStars, ...auxiliaryStars, ...maleficStars].filter((s) => ["△", "X"].includes(s.strengthSymbol || "")),
        hasMiaoWang: [...mainStars, ...auxiliaryStars].some((s) => s.strengthSymbol === "◎"),
        hasXianRuo: [...mainStars, ...auxiliaryStars, ...maleficStars].some((s) => ["△", "X"].includes(s.strengthSymbol || "")),
      },
      fourTransformations,
      incomingFourTransformations,
      sihua: [],
      oppositePalace: null,
      sanFangSiZheng: {
        self: ZIWEI_PALACE_NAME[id],
        wealthOrCareerRelated: ZIWEI_PALACE_NAME[triadPalaceIds[0]],
        relationshipRelated: ZIWEI_PALACE_NAME[triadPalaceIds[1]],
        opposite: ZIWEI_PALACE_NAME[oppositePalaceId],
        palaceNames: [ZIWEI_PALACE_NAME[triadPalaceIds[0]], ZIWEI_PALACE_NAME[triadPalaceIds[1]], ZIWEI_PALACE_NAME[oppositePalaceId]],
        mainStars: [...mainStars, ...auxiliaryStars].slice(0, 2),
        fourTransformations: [],
      },
      oppositePalaceId,
      triadPalaceIds,
      keywords: ["성향", "관계", "실행", ZIWEI_PALACE_NAME[id]],
      score: 70 - index,
      isEmpty,
      dahan: `${14 + (index * 10)}-${23 + (index * 10)}`,
    };
  });

  const palaceById = Object.fromEntries(palaces.map((p) => [p.id, p]));
  palaces.forEach((palace) => {
    palace.oppositePalace = palaceById[palace.oppositePalaceId] || null;
  });

  return {
    version: "ziwei-sample-counseling-v1",
    user: {
      name: `샘플${variant}`,
      birthYear: variant === "A" ? 1991 : 1994,
      birthMonth: variant === "A" ? 2 : 9,
      birthDay: variant === "A" ? 20 : 12,
      birthHour: variant === "A" ? 7 : 21,
      birthMinute: variant === "A" ? 0 : 35,
      unknownHour: false,
      gender: variant === "A" ? "M" : "F",
      calendarType: "solar",
      isLeapMonth: false,
      birthPlace: variant === "A" ? "서울" : "부산",
      timezone: "Asia/Seoul",
    },
    warnings: [],
    debugWarnings: [],
    mingGong: "명궁",
    shenGong: "오",
    birthYearStem: "갑",
    yearGan: "갑",
    yearZhi: "자",
    juInfo: "화6국",
    sihua: {
      hualu: "거문",
      huaquan: "천기",
      huake: "문창",
      huaji: "문곡",
    },
    palaces,
    fourTransformations: {
      yearStem: "갑",
      byType: { 록: null, 권: null, 과: null, 기: null },
      byPalace: {},
      byStar: {},
    },
    majorPeriods: palaces.map((p) => ({ palaceId: p.id, range: p.dahan })),
    annualFlow: {
      yearLabel: "2026",
      keyPalaces: ["ming", "wealth"],
      notes: ["핵심 궁 집중", "관계/재정 균형"],
    },
    summary: {
      keywords: ["성향", "관계", "직업", "재물"],
      strongestPalaceId: "ming",
      weakestPalaceId: "health",
      direction: "강점 확장과 리스크 관리 균형",
      strengths: ["분석력", "회복력"],
      weaknesses: ["과속", "감정 소모"],
      openingCondition: "기준 문장화",
      decisionRule: "24시간 재검토",
      palaceMatrix: palaces.map((p) => ({
        palaceId: p.id,
        palaceName: p.name,
        mainStars: p.mainStars.map((s) => s.name),
        keywords: p.keywords,
        score: p.score,
      })),
    },
  };
}

module.exports = { createStar, buildSampleChart };
