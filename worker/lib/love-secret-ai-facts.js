// 계산 결과 → 프롬프트 투영.
//
// 왜 필요한가: 명식 전체(life-book 20.8KB) + 고급 요소(40.1KB) + 90일 캘린더(19.7KB)를
// 6개 그룹 프롬프트에 그대로 실으면 입력만 39만 자가 된다. 그래서 그룹이 실제로 쓰는
// 값만 골라 3,500자 이하로 투영한다.
//
// buildLoveSecretGroundingFacts 는 **6개 그룹 전부**에 같은 문자열로 들어간다.
// 병렬 생성물끼리 일간·격국·용신·대운을 다르게 서술하는 것을 막는 앵커이며
// (new-year-ai.js:1243 buildCanonicalNewYearFacts 선례), 날짜 날조를 막는 유일한 근거다.

const ELEMENT_KO = Object.freeze({ wood: "목", fire: "화", earth: "토", metal: "금", water: "수" });

function clean(value, maxLength = 0) {
  const text = String(value ?? "").trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
}

function distributionText(counts = {}) {
  return Object.entries(counts || {})
    .filter(([, value]) => Number.isFinite(Number(value)))
    .map(([name, value]) => `${name} ${Number(value)}`)
    .join(" · ");
}

function pillarLine(chart = {}) {
  const hour = clean(chart.hourPillar) || "시 미상";
  return `${clean(chart.yearPillar)} ${clean(chart.monthPillar)} ${clean(chart.dayPillar)} ${hour}`;
}

function stageOf(chart = {}, position) {
  return (chart.twelveLifeStages || []).find((row) => row.position === position) || null;
}

function hiddenStemText(detail) {
  return (detail?.hiddenStems || [])
    .map((hidden) => `${hidden.stem}(${hidden.tenGod || "-"})`)
    .join(", ");
}

function interactionLines(natalInteractions = {}, limit = 6) {
  const buckets = [
    ["천간합", natalInteractions.stemCombinations],
    ["천간충", natalInteractions.stemClashes],
    ["지지합", natalInteractions.branchCombinations],
    ["지지충", natalInteractions.branchClashes],
    ["해", natalInteractions.branchHarms],
    ["파", natalInteractions.branchBreaks],
    ["형", natalInteractions.branchPunishments],
    ["삼합", natalInteractions.threeHarmony],
    ["방합", natalInteractions.directionalGroups],
  ];
  const out = [];
  buckets.forEach(([label, list]) => {
    (Array.isArray(list) ? list : []).forEach((item) => {
      if (out.length >= limit) return;
      const where = (item?.pillarLabels || item?.pillars || []).join("·");
      out.push(`${label} ${clean(item?.label || item?.values?.join("") || "")}${where ? ` (${where})` : ""}`);
    });
  });
  return out;
}

function luckLine(chart = {}) {
  const cycle = chart.majorLuck?.currentCycle;
  if (!cycle?.pillar) {
    return chart.majorLuck?.available === false ? `대운: ${clean(chart.majorLuck.reason, 80)}` : "대운: 미상";
  }
  return `현재 대운: ${cycle.startAge}~${cycle.endAge}세 ${cycle.pillar} (일간 기준 ${cycle.stemTenGod || "-"}, ${chart.majorLuck?.direction || ""})`;
}

function yearlyLines(chart = {}, limit = 3) {
  return (chart.yearlyLuck || []).slice(0, limit).map((row) => {
    const tension = [
      (row.natalInteractions?.branchClashes || []).length ? "충" : "",
      (row.natalInteractions?.branchCombinations || []).length ? "합" : "",
      (row.natalInteractions?.branchPunishments || []).length ? "형" : "",
    ].filter(Boolean).join("·");
    return `${row.year} ${row.pillar} — ${row.stemTenGod || "-"}${tension ? `, 원국과 ${tension}` : ""}`;
  });
}

function calendarBestLine(calendar = {}, limit = 6) {
  return (calendar.best || []).slice(0, limit)
    .map((day) => `${day.date}(${day.ganji}/${day.grade})`)
    .join(" ");
}

function calendarCautionLine(calendar = {}, limit = 4) {
  return (calendar.caution || []).slice(0, limit)
    .map((day) => `${day.date}(${day.ganji})`)
    .join(" ");
}

function monthlyFlowLine(calendar = {}) {
  return (calendar.monthlyFlow || [])
    .map((month) => `${month.monthLabel} 평균 ${month.avgScore}(${month.grade})`)
    .join(" · ");
}

/**
 * 6개 그룹 프롬프트에 공통으로 주입되는 계산 확정값.
 * 여기 적힌 값과 다르게 서술하는 것은 프롬프트에서 금지되며, 날짜는 이 목록 밖으로 나갈 수 없다.
 */
export function buildLoveSecretGroundingFacts(sajuResult = {}) {
  const my = sajuResult.myChart || {};
  const partner = sajuResult.partnerChart || null;
  const calendar = sajuResult.calendar || {};
  const reference = my.reference || {};
  const dayDetail = my.pillarDetails?.day || null;
  const monthDetail = my.pillarDetails?.month || null;
  const dayStage = stageOf(my, "day");

  const lines = [
    `내 사주(연월일시): ${pillarLine(my)}`,
    `일간: ${reference.dayMasterLabel || my.dayMaster} — ${reference.dayElementLabel || ""}, ${my.strength || ""}`,
    dayDetail
      ? `일지(배우자궁): ${dayDetail.earthlyBranch} — 십이운성 ${dayStage?.stage || "미상"}, 지장간 ${hiddenStemText(dayDetail) || "없음"}`
      : "",
    monthDetail ? `월지(월령): ${monthDetail.earthlyBranch} — 지장간 ${hiddenStemText(monthDetail) || "없음"}` : "",
    my.seasonalBalance ? `조후: ${my.seasonalBalance.season || ""} ${my.seasonalBalance.climate || ""} — ${my.seasonalBalance.dayMasterSeasonalState || ""}` : "",
    `오행 분포: ${distributionText(my.fiveElements)}`,
    `십성 분포: ${distributionText(my.tenGods)} (두드러진 십성 ${reference.dominantTenGod || "-"})`,
    my.gyeokguk?.finalGyeokguk ? `격국: ${my.gyeokguk.finalGyeokguk} — ${my.gyeokguk.judgmentReason || ""}` : "",
    `용신: ${reference.yongshinElementLabel || ELEMENT_KO[reference.yongshinElement] || "-"} / 기신 방향: ${ELEMENT_KO[my.unfavorableElement] || "-"}`,
    my.shinsal?.summaryLines?.length ? `신살: ${my.shinsal.summaryLines.join(" / ")}` : "신살: 성립한 항목 없음",
    luckLine(my),
    ...yearlyLines(my, 2).map((line) => `세운 ${line}`),
    partner
      ? `상대 사주: ${pillarLine(partner)} — 일간 ${partner.reference?.dayMasterLabel || partner.dayMaster}, ${partner.strength || ""}`
      : "상대 정보 없음(단독 상담)",
    sajuResult.compatibility?.spousePalaceRelation
      ? `일지 궁합: 내 ${sajuResult.compatibility.spousePalaceRelation.myDayBranch} ↔ 상대 ${sajuResult.compatibility.spousePalaceRelation.partnerDayBranch} — ${(sajuResult.compatibility.spousePalaceRelation.relations || []).join("·") || "직접 관계 없음"}, 일간 ${sajuResult.compatibility.spousePalaceRelation.stemRelation || "-"}`
      : "",
    calendar.available
      ? `좋은 날짜(계산 확정, 이 목록 밖의 날짜를 쓰지 말 것): ${calendarBestLine(calendar)}`
      : "",
    calendar.available ? `조심할 날짜: ${calendarCautionLine(calendar)}` : "",
    calendar.available ? `월별 흐름: ${monthlyFlowLine(calendar)}` : "",
    (sajuResult.uncertainty || []).length ? `불확실 요소: ${sajuResult.uncertainty.join(", ")}` : "",
  ];

  return lines.map((line) => clean(line, 400)).filter(Boolean);
}

const GROUP_FACT_BUILDERS = Object.freeze({
  core(my, partner, sajuResult) {
    return {
      일간: my.reference?.dayMasterLabel || my.dayMaster,
      일간강약: my.strength,
      사주: pillarLine(my),
      오행분포: my.fiveElements,
      조후: my.seasonalBalance,
      격국: my.gyeokguk,
      십이운성: my.twelveLifeStages,
      원국관계요약: my.relationSummary,
      용신: my.reference?.yongshinElementLabel,
      연애정체성: {
        요약: my.loveReference?.identity?.summary,
        본능: my.loveReference?.identity?.instinct,
        무의식: my.loveReference?.identity?.unconscious,
        약점: my.loveReference?.identity?.weakness,
      },
      강약운영팁: my.loveReference?.strengthTip,
      상담모드: sajuResult.consultationMode,
    };
  },
  self(my) {
    return {
      일간: my.reference?.dayMasterLabel || my.dayMaster,
      십성분포: my.tenGods,
      주별십성: my.tenGodsByPillar,
      지장간투출: my.hiddenStemExposures,
      신살: my.shinsal?.summaryLines || [],
      신살의미: (my.shinsal?.stars || []).filter((star) => star.present).map((star) => `${star.name}(${star.state}): ${star.loveMeaning}`),
      연애정체성: my.loveReference?.identity,
      십성통계: my.loveReference?.tenGodStats,
      정밀지표: my.loveReference?.precisionMetrics,
      주의신호: my.loveReference?.risks,
    };
  },
  partner(my, partner, sajuResult) {
    return {
      상담모드: sajuResult.consultationMode,
      내일주: `${my.dayPillar} (일지 ${my.pillarDetails?.day?.earthlyBranch || "-"}, 지장간 ${hiddenStemText(my.pillarDetails?.day) || "없음"})`,
      내일지십이운성: stageOf(my, "day")?.stage || "",
      이상형: my.loveReference?.idealPartner,
      끌림지표: my.loveReference?.precisionMetrics,
      상대명식: partner
        ? {
          사주: pillarLine(partner),
          일간: partner.reference?.dayMasterLabel || partner.dayMaster,
          일간강약: partner.strength,
          오행분포: partner.fiveElements,
          십성분포: partner.tenGods,
          일지지장간: hiddenStemText(partner.pillarDetails?.day),
          연애정체성: partner.loveReference?.identity,
        }
        : null,
      궁합: sajuResult.compatibility
        ? {
          일지관계: sajuResult.compatibility.spousePalaceRelation,
          일간관계: sajuResult.compatibility.dayStemRelation,
          오행보완: sajuResult.compatibility.elementBalance,
          십성상호: sajuResult.compatibility.tenGodInteraction,
          용신지원: sajuResult.compatibility.yongshinSupport,
          축점수: sajuResult.compatibility.axisScores,
          신살교차: sajuResult.compatibility.shinsalCross,
        }
        : null,
      참고궁합: my.loveReference?.compatibility,
    };
  },
  risk(my, partner, sajuResult) {
    return {
      원국관계: interactionLines(my.natalInteractions, 8),
      관계요약: my.relationSummary,
      신살: (my.shinsal?.stars || [])
        .filter((star) => star.present && ["도화살", "홍염살", "역마살", "귀문관살", "원진살", "양인살", "괴강살", "백호살", "공망"].includes(star.name))
        .map((star) => ({ 이름: star.name, 자리: star.hits.map((hit) => hit.label), 상태: star.state, 연애의미: star.loveMeaning })),
      신살강도: my.shinsal?.intensity,
      주의신호: my.loveReference?.risks,
      파격요소: my.gyeokguk?.breakFactors,
      궁합긴장: sajuResult.compatibility
        ? {
          일지관계: sajuResult.compatibility.spousePalaceRelation,
          긴장축: sajuResult.compatibility.branchRelations,
        }
        : null,
    };
  },
  timing(my, partner, sajuResult) {
    const calendar = sajuResult.calendar || {};
    return {
      대운방향: my.majorLuck?.direction,
      현재대운: my.majorLuck?.currentCycle
        ? {
          기간: `${my.majorLuck.currentCycle.startAge}~${my.majorLuck.currentCycle.endAge}세 (${my.majorLuck.currentCycle.startYear}~${my.majorLuck.currentCycle.endYear})`,
          간지: my.majorLuck.currentCycle.pillar,
          십성: my.majorLuck.currentCycle.stemTenGod,
          지장간: (my.majorLuck.currentCycle.hiddenStems || []).map((hidden) => `${hidden.stem}(${hidden.tenGod})`),
        }
        : null,
      다음대운: (my.majorLuck?.cycles || [])
        .filter((cycle) => cycle.startYear > (my.majorLuck?.currentYear || 0))
        .slice(0, 2)
        .map((cycle) => `${cycle.startAge}~${cycle.endAge}세 ${cycle.pillar}(${cycle.stemTenGod})`),
      세운: yearlyLines(my, 3),
      결혼적기: my.loveReference?.marriageWindow,
      월별연애창: my.loveReference?.monthlyWindows,
      // 아래 두 값이 "좋은 날짜"의 유일한 출처다. 이 목록에 없는 날짜는 쓸 수 없다.
      계산된좋은날짜: (calendar.best || []).map((day) => ({ 날짜: day.date, 요일: day.weekday, 간지: day.ganji, 등급: day.grade, 근거: day.tags })),
      계산된조심할날짜: (calendar.caution || []).map((day) => ({ 날짜: day.date, 간지: day.ganji, 근거: day.tags })),
      월별흐름: calendar.monthlyFlow,
    };
  },
  action(my, partner, sajuResult) {
    const calendar = sajuResult.calendar || {};
    return {
      일간: my.reference?.dayMasterLabel || my.dayMaster,
      용신: my.reference?.yongshinElementLabel,
      개운법: my.loveReference?.gaeun,
      이상형: my.loveReference?.idealPartner,
      강약운영팁: my.loveReference?.strengthTip,
      도화홍염: {
        도화: my.shinsal?.byName?.도화살?.hits?.map((hit) => hit.label) || [],
        홍염: my.shinsal?.byName?.홍염살?.hits?.map((hit) => hit.label) || [],
        강도: { 도화: my.shinsal?.intensity?.dohwa, 홍염: my.shinsal?.intensity?.hongyeom },
      },
      가까운좋은날: (calendar.best || []).slice(0, 3).map((day) => `${day.date}(${day.ganji}, ${day.grade})`),
      궁합전략: sajuResult.compatibility
        ? { 끌림: sajuResult.compatibility.attractionPattern, 축점수: sajuResult.compatibility.axisScores }
        : null,
      상담모드: sajuResult.consultationMode,
    };
  },
});

/** 그룹이 실제로 쓰는 계산 데이터만 투영한다. JSON 3,500자 이하를 목표로 한다. */
export function buildLoveSecretGroupFacts(sajuResult = {}, groupKey = "core") {
  const builder = GROUP_FACT_BUILDERS[groupKey] || GROUP_FACT_BUILDERS.core;
  const my = sajuResult.myChart || {};
  const partner = sajuResult.partnerChart || null;
  return builder(my, partner, sajuResult);
}

/**
 * 후속 질문(handleMessage)용 압축본.
 * 기존 프롬프트는 sajuResult 전체를 넣었는데 v2 는 60~80KB라 5,000토큰 호출을 그대로 삼킨다.
 */
export function compactSajuForFollowUp(sajuResult = {}) {
  const my = sajuResult.myChart || {};
  const partner = sajuResult.partnerChart || null;
  return {
    내명식: pillarLine(my),
    일간: my.reference?.dayMasterLabel || my.dayMaster,
    일간강약: my.strength,
    오행: my.fiveElements,
    십성: my.tenGods,
    격국: my.gyeokguk?.finalGyeokguk || "",
    용신: my.reference?.yongshinElementLabel || "",
    신살: my.shinsal?.summaryLines || [],
    현재대운: my.majorLuck?.currentCycle
      ? `${my.majorLuck.currentCycle.startAge}~${my.majorLuck.currentCycle.endAge}세 ${my.majorLuck.currentCycle.pillar}(${my.majorLuck.currentCycle.stemTenGod})`
      : "",
    세운: yearlyLines(my, 2),
    상대명식: partner ? `${pillarLine(partner)} — 일간 ${partner.reference?.dayMasterLabel || partner.dayMaster}` : null,
    궁합요약: sajuResult.compatibility?.summary || null,
    일지궁합: sajuResult.compatibility?.spousePalaceRelation || null,
    좋은날짜: (sajuResult.calendar?.best || []).slice(0, 5).map((day) => `${day.date}(${day.ganji})`),
    상담모드: sajuResult.consultationMode,
  };
}
