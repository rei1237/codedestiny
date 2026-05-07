function scoreDepth(depth) {
  if (depth === "deep") return 3;
  if (depth === "medium") return 2;
  if (depth === "faint") return 1;
  return null;
}

function scoreLength(length) {
  if (length === "long") return 3;
  if (length === "medium") return 2;
  if (length === "short") return 1;
  return null;
}

function scoreFateStrength(strength) {
  if (strength === "strong") return 3;
  if (strength === "medium") return 2;
  if (strength === "weak") return 1;
  if (strength === "none") return 0;
  return null;
}

function scoreMinorStrength(strength) {
  const s = String(strength || "").toLowerCase();
  if (!s) return null;
  if (s.includes("strong") || s.includes("high")) return 3;
  if (s.includes("medium") || s.includes("normal")) return 2;
  if (s.includes("weak") || s.includes("low") || s.includes("faint")) return 1;
  return null;
}

function scoreMountFullness(fullness) {
  if (fullness === "strong") return 3;
  if (fullness === "medium") return 2;
  if (fullness === "weak") return 1;
  return null;
}

function safeAverage(values) {
  const valid = values.filter((v) => Number.isFinite(v));
  if (valid.length === 0) return null;
  return valid.reduce((acc, cur) => acc + cur, 0) / valid.length;
}

function roleLabel(role) {
  if (role === "innate") return "선천적 손";
  if (role === "acquired") return "후천적 손";
  if (role === "mixed") return "선후천 혼합 해석 손";
  return "역할 미확정 손";
}

function sideLabel(side) {
  return side === "left" ? "왼손" : "오른손";
}

function toShapeClass(direction) {
  if (direction === "straight") return "straight";
  if (direction === "curved" || direction === "downward") return "curved";
  return null;
}

function compareLifeLine(innate, acquired) {
  const iDepth = scoreDepth(innate?.majorLines?.lifeLine?.depth);
  const aDepth = scoreDepth(acquired?.majorLines?.lifeLine?.depth);
  const iDetected = Boolean(innate?.majorLines?.lifeLine?.detected);
  const aDetected = Boolean(acquired?.majorLines?.lifeLine?.detected);

  if (!iDetected || !aDetected || iDepth == null || aDepth == null) {
    return "생명선은 비교 확정 신호가 부족해 에너지 운용 변화만 보수적으로 관찰합니다.";
  }

  if (iDepth > aDepth) {
    return "본래 회복력은 좋지만 현재는 에너지 소모가 커진 상태로 읽힙니다.";
  }

  if (iDepth < aDepth) {
    return "후천적 자기관리와 생활 루틴이 잘 형성된 상태로 읽힙니다.";
  }

  return "선천과 후천의 생명선 깊이가 유사해, 회복 리듬이 크게 흔들리지 않는 흐름입니다.";
}

function compareHeadLine(innate, acquired) {
  const iDir = toShapeClass(innate?.majorLines?.headLine?.direction);
  const aDir = toShapeClass(acquired?.majorLines?.headLine?.direction);

  if (!iDir || !aDir) {
    return "두뇌선은 사고 방향 신호가 충분하지 않아 판단 습관 변화를 보수적으로 해석합니다.";
  }

  if (iDir === "curved" && aDir === "straight") {
    return "본래 감수성이 강하지만 현재는 현실 판단이 강화됨으로 읽힙니다.";
  }

  if (iDir === "straight" && aDir === "curved") {
    return "본래 이성적이지만 현재는 직관과 감성 사용이 늘어남으로 읽힙니다.";
  }

  return "두뇌선의 기본 방향은 유지되며, 상황에 맞춘 판단 속도 조절이 핵심입니다.";
}

function compareHeartLine(innate, acquired) {
  const iLine = innate?.majorLines?.heartLine;
  const aLine = acquired?.majorLines?.heartLine;

  if (!iLine?.detected || !aLine?.detected) {
    return "감정선은 비교 데이터가 제한되어 관계 온도 변화를 단정하지 않고 관찰 중심으로 봅니다.";
  }

  const iRich = safeAverage([
    scoreLength(iLine.length),
    2 + Number(iLine.branches || 0) * 0.2 - Number(iLine.breaks || 0) * 0.2,
  ]);
  const aRich = safeAverage([
    scoreLength(aLine.length),
    2 + Number(aLine.branches || 0) * 0.2 - Number(aLine.breaks || 0) * 0.2,
  ]);

  if (iRich == null || aRich == null) {
    return "감정선의 풍부도 지표가 제한되어 감정 표현 변화는 보수적으로만 읽습니다.";
  }

  if (iRich > aRich + 0.35) {
    return "본래 감정은 깊지만 현재는 표현을 조절하거나 방어적으로 바뀐 흐름이 보입니다.";
  }

  if (aRich > iRich + 0.35) {
    return "관계 경험을 통해 감정 표현이 열린 상태로 읽힙니다.";
  }

  return "감정선의 결이 크게 다르지 않아 관계 표현 방식이 안정적으로 이어지는 편입니다.";
}

function compareFateLine(innate, acquired) {
  const i = scoreFateStrength(innate?.majorLines?.fateLine?.strength);
  const a = scoreFateStrength(acquired?.majorLines?.fateLine?.strength);
  const iDetected = Boolean(innate?.majorLines?.fateLine?.detected);
  const aDetected = Boolean(acquired?.majorLines?.fateLine?.detected);

  if (!iDetected || !aDetected || i == null || a == null) {
    return "운명선은 비교 근거가 부족해 직업 방향 변화는 보수적 문장으로만 제시합니다.";
  }

  if (a > i) {
    return "현재 삶에서 목표의식과 사회적 방향성이 강화됨으로 읽힙니다.";
  }

  if (i > a) {
    return "본래 목표의식은 강했지만 현재는 방향을 재정비 중인 흐름으로 읽힙니다.";
  }

  return "선천과 후천의 목표 축이 유사해, 방향 전환보다 지속 정비가 중요한 시기입니다.";
}

function compareSunMoney(innate, acquired) {
  const iSun = innate?.minorLines?.sunLine;
  const aSun = acquired?.minorLines?.sunLine;
  const iMoney = innate?.minorLines?.moneyLine;
  const aMoney = acquired?.minorLines?.moneyLine;

  const iSunScore = safeAverage([iSun?.detected ? 2 : null, scoreMinorStrength(iSun?.strength)]);
  const aSunScore = safeAverage([aSun?.detected ? 2 : null, scoreMinorStrength(aSun?.strength)]);
  const iMoneyScore = safeAverage([iMoney?.detected ? 2 : null, scoreMinorStrength(iMoney?.strength)]);
  const aMoneyScore = safeAverage([aMoney?.detected ? 2 : null, scoreMinorStrength(aMoney?.strength)]);

  const iTotal = safeAverage([iSunScore, iMoneyScore]);
  const aTotal = safeAverage([aSunScore, aMoneyScore]);

  if (iTotal == null || aTotal == null) {
    return "태양선/재물선은 확정 비교 지표가 부족해 표현력과 거래 감각의 변화를 보수적으로 해석합니다.";
  }

  if (aTotal > iTotal + 0.3) {
    return "후천적 흐름에서 표현력과 가치화 습관이 강화되어, 성과를 현실로 연결하는 힘이 커졌습니다.";
  }

  if (iTotal > aTotal + 0.3) {
    return "본래 표현 감각과 가치 창출 잠재력이 크며, 현재는 이를 생활 구조에 안정적으로 연결하는 단계입니다.";
  }

  return "태양선/재물선의 결이 유사해, 표현과 수익화의 균형 감각이 안정적으로 유지됩니다.";
}

function compareLoveFlow(innate, acquired) {
  const iHeart = innate?.majorLines?.heartLine;
  const aHeart = acquired?.majorLines?.heartLine;
  const iMarriage = innate?.minorLines?.marriageLine;
  const aMarriage = acquired?.minorLines?.marriageLine;
  const iVenus = scoreMountFullness(innate?.mounts?.venus?.fullness);
  const aVenus = scoreMountFullness(acquired?.mounts?.venus?.fullness);

  const iScore = safeAverage([
    iHeart?.detected ? 2 + Number(iHeart.branches || 0) * 0.15 - Number(iHeart.breaks || 0) * 0.1 : null,
    iMarriage?.detected ? 2 : null,
    scoreMinorStrength(iMarriage?.strength),
    iVenus,
  ]);

  const aScore = safeAverage([
    aHeart?.detected ? 2 + Number(aHeart.branches || 0) * 0.15 - Number(aHeart.breaks || 0) * 0.1 : null,
    aMarriage?.detected ? 2 : null,
    scoreMinorStrength(aMarriage?.strength),
    aVenus,
  ]);

  if (iScore == null || aScore == null) {
    return "연애 흐름은 비교 지표가 충분하지 않아, 감정 표현과 약속 방식은 신중하게 관찰하는 단계입니다.";
  }

  if (aScore > iScore + 0.3) {
    return "현재는 관계 경험을 통해 감정 표현과 약속 조율 능력이 더 실전적으로 강화된 흐름입니다.";
  }

  if (iScore > aScore + 0.3) {
    return "본래는 정서의 깊이와 애착 에너지가 강하며, 현재는 그 깊이를 안전하게 표현하는 연습이 필요합니다.";
  }

  return "연애 흐름의 선후천 균형이 비슷해, 관계에서는 속도보다 일관된 신뢰 표현이 핵심입니다.";
}

function compareCareerFlow(innate, acquired) {
  const iFate = scoreFateStrength(innate?.majorLines?.fateLine?.strength);
  const aFate = scoreFateStrength(acquired?.majorLines?.fateLine?.strength);
  const iHead = toShapeClass(innate?.majorLines?.headLine?.direction);
  const aHead = toShapeClass(acquired?.majorLines?.headLine?.direction);
  const iSun = safeAverage([
    innate?.minorLines?.sunLine?.detected ? 2 : null,
    scoreMinorStrength(innate?.minorLines?.sunLine?.strength),
  ]);
  const aSun = safeAverage([
    acquired?.minorLines?.sunLine?.detected ? 2 : null,
    scoreMinorStrength(acquired?.minorLines?.sunLine?.strength),
  ]);

  const iScore = safeAverage([iFate, iSun, iHead === "straight" ? 2.5 : iHead === "curved" ? 2 : null]);
  const aScore = safeAverage([aFate, aSun, aHead === "straight" ? 2.5 : aHead === "curved" ? 2 : null]);

  if (iScore == null || aScore == null) {
    return "직업 흐름은 비교 근거가 제한되어, 현재는 목표-실행 루틴 점검을 우선하는 보수적 해석을 권장합니다.";
  }

  if (aScore > iScore + 0.3) {
    return "현재 삶에서 목표 설정과 사회적 실행력이 강화되어, 직업 방향이 더 선명해지는 흐름입니다.";
  }

  if (iScore > aScore + 0.3) {
    return "본래 직업 잠재력은 높으며, 현재는 방향 재정렬을 통해 강점을 다시 고정하는 구간입니다.";
  }

  return "직업 흐름은 선후천 차이가 크지 않아, 속도보다 지속 가능한 실행 구조가 성과를 만듭니다.";
}

function compareWealthFlow(innate, acquired) {
  const iMoney = safeAverage([
    innate?.minorLines?.moneyLine?.detected ? 2 : null,
    scoreMinorStrength(innate?.minorLines?.moneyLine?.strength),
  ]);
  const aMoney = safeAverage([
    acquired?.minorLines?.moneyLine?.detected ? 2 : null,
    scoreMinorStrength(acquired?.minorLines?.moneyLine?.strength),
  ]);
  const iMercury = scoreMountFullness(innate?.mounts?.mercury?.fullness);
  const aMercury = scoreMountFullness(acquired?.mounts?.mercury?.fullness);
  const iFate = scoreFateStrength(innate?.majorLines?.fateLine?.strength);
  const aFate = scoreFateStrength(acquired?.majorLines?.fateLine?.strength);

  const iScore = safeAverage([iMoney, iMercury, iFate]);
  const aScore = safeAverage([aMoney, aMercury, aFate]);

  if (iScore == null || aScore == null) {
    return "재물 흐름은 확정 지표가 부족해, 지출 기준과 거래 기록을 먼저 쌓는 보수적 접근이 필요합니다.";
  }

  if (aScore > iScore + 0.3) {
    return "현재는 돈 관리 습관과 거래 감각이 강화되어, 가치 창출을 실질 수익으로 연결하는 힘이 커졌습니다.";
  }

  if (iScore > aScore + 0.3) {
    return "본래 자원 감각은 좋으며, 현재는 돈의 흐름을 더 구조화하면 안정감이 크게 올라가는 구간입니다.";
  }

  return "재물 흐름은 선후천 균형이 비슷해, 일관된 기준 유지가 장기 안정성을 높입니다.";
}

function resolveInnateAcquired(params) {
  const {
    leftHandReading,
    rightHandReading,
    leftHandRole,
    rightHandRole,
  } = params;

  const candidates = [
    { side: "left", role: leftHandRole, reading: leftHandReading },
    { side: "right", role: rightHandRole, reading: rightHandReading },
  ].filter((x) => !!x.reading);

  const innate = candidates.find((x) => x.role === "innate") || null;
  const acquired = candidates.find((x) => x.role === "acquired") || null;

  return { innate, acquired, candidates };
}

function oneHandRoleCard(uploaded, role) {
  const side = uploaded === "left" ? "왼손" : "오른손";
  const roleText = role === "acquired"
    ? "후천적 손"
    : role === "innate"
      ? "선천적 손"
      : "선후천 혼합 해석 손";

  const detail = role === "acquired"
    ? "이 손은 현재의 삶 속에서 만들어진 성향과 습관을 더 강하게 보여줍니다."
    : role === "innate"
      ? "이 손은 타고난 기질과 무의식적 반응의 결을 더 강하게 보여줍니다."
      : "이 손은 선천성과 후천성이 함께 섞인 흐름으로 읽혀, 단정 대신 관찰 중심 해석이 필요합니다.";

  const text = `이번에 업로드한 ${side}은(는) 당신이 주로 쓰는 손의 판별 기준으로 ${roleText}에 해당합니다. ${detail}`;

  return {
    enabled: false,
    innateSummary: `타고난 당신의 손: ${role === "innate" ? text : "이번 입력에서는 선천적 손 비교 데이터가 충분하지 않습니다."}`,
    acquiredSummary: `현재 살아가는 당신의 손: ${role === "acquired" ? text : "이번 입력에서는 후천적 손 비교 데이터가 충분하지 않습니다."}`,
    differenceSummary: `타고난 나와 현재의 나, 무엇이 달라졌나: 양손 동시 비교가 아니므로 변화 차이는 단정하지 않습니다.`,
    growthSummary: "당신이 더 살려야 할 본래 기질: 단일 손 데이터에서는 본래 기질을 과장하지 말고, 생활 기록과 함께 다음 비교를 준비하세요.",
    loveSummary: "연애 흐름 비교: 한 손 데이터 기준으로 감정선 해석은 현재 손의 성향 중심 참고값입니다.",
    careerSummary: "현재 삶에서 강화된 힘: 한 손 데이터 기준으로 현재 습관 신호만 제한적으로 읽힙니다.",
    wealthSummary: "재물 흐름 비교: 단일 손 데이터에서는 돈 관리 습관을 보수적으로 점검하는 수준으로 해석합니다.",
  };
}

function buildBothHandsComparison(params) {
  const {
    uploadedHands,
    dominantHand,
    leftHandRole,
    rightHandRole,
    leftHandReading,
    rightHandReading,
  } = params;

  if (!Array.isArray(uploadedHands) || uploadedHands.length < 2) {
    const uploaded = Array.isArray(uploadedHands) && uploadedHands[0] ? uploadedHands[0] : "right";
    const role = uploaded === "left" ? leftHandRole : rightHandRole;
    return oneHandRoleCard(uploaded, role);
  }

  if (dominantHand === "both") {
    return {
      enabled: false,
      innateSummary: "타고난 당신의 손: dominantHand가 both로 입력되어 선천/후천 분리를 보수적으로 유보합니다.",
      acquiredSummary: "현재 살아가는 당신의 손: dominantHand가 both인 경우 현재 변화 해석도 단정하지 않습니다.",
      differenceSummary: "타고난 나와 현재의 나, 무엇이 달라졌나: 양손 고정 해석을 피하기 위해 비교를 제한합니다.",
      growthSummary: "당신이 더 살려야 할 본래 기질: 우선 주로 쓰는 손을 지정한 뒤 재분석하면 해석 정확도가 높아집니다.",
      loveSummary: "연애 흐름 비교: 선후천 분리 판독이 보류되어 관계 해석은 참고 수준으로 제공합니다.",
      careerSummary: "현재 삶에서 강화된 힘: 직업 흐름 비교는 주손 지정 후에 더 선명해집니다.",
      wealthSummary: "재물 흐름 비교: 거래/재정 습관 비교는 선후천 분리 데이터가 필요합니다.",
    };
  }

  const { innate, acquired } = resolveInnateAcquired({
    leftHandReading,
    rightHandReading,
    leftHandRole,
    rightHandRole,
  });

  if (!innate || !acquired) {
    return {
      enabled: false,
      innateSummary: "타고난 당신의 손: 선천적 손 데이터를 확정하기 어려워 보수적으로 해석합니다.",
      acquiredSummary: "현재 살아가는 당신의 손: 후천적 손 데이터를 확정하기 어려워 보수적으로 해석합니다.",
      differenceSummary: "타고난 나와 현재의 나, 무엇이 달라졌나: 현재 입력에서는 선후천 비교 근거가 충분하지 않습니다.",
      growthSummary: "당신이 더 살려야 할 본래 기질: 라인 감지 품질을 높여 다시 비교하면 더 구체화됩니다.",
      loveSummary: "연애 흐름 비교: 감정선 비교 근거가 제한되어 단정 대신 관찰을 권장합니다.",
      careerSummary: "현재 삶에서 강화된 힘: 직업 흐름은 일부 신호만으로는 과장하지 않습니다.",
      wealthSummary: "재물 흐름 비교: 재물선/수성구 데이터가 충분하지 않아 보수적으로 해석합니다.",
    };
  }

  const lifeDiff = compareLifeLine(innate.reading, acquired.reading);
  const headDiff = compareHeadLine(innate.reading, acquired.reading);
  const heartDiff = compareHeartLine(innate.reading, acquired.reading);
  const fateDiff = compareFateLine(innate.reading, acquired.reading);
  const sunMoneyDiff = compareSunMoney(innate.reading, acquired.reading);
  const loveFlow = compareLoveFlow(innate.reading, acquired.reading);
  const careerFlow = compareCareerFlow(innate.reading, acquired.reading);
  const wealthFlow = compareWealthFlow(innate.reading, acquired.reading);

  const innateTitle = `${sideLabel(innate.side)}(${roleLabel(innate.role)})`;
  const acquiredTitle = `${sideLabel(acquired.side)}(${roleLabel(acquired.role)})`;

  const innateSignals = [];
  if (innate.reading?.majorLines?.lifeLine?.detected) innateSignals.push("회복 리듬 신호가 살아 있습니다");
  if (innate.reading?.majorLines?.headLine?.detected) innateSignals.push("사고 원형이 비교적 명확합니다");
  if (innate.reading?.majorLines?.heartLine?.detected) innateSignals.push("감정 반응의 기본 결이 보입니다");
  if (innate.reading?.majorLines?.fateLine?.detected) innateSignals.push("목표 의식의 본래 축이 감지됩니다");

  const acquiredSignals = [];
  if (acquired.reading?.majorLines?.lifeLine?.detected) acquiredSignals.push("생활 루틴이 에너지 관리에 반영됩니다");
  if (acquired.reading?.majorLines?.headLine?.detected) acquiredSignals.push("현재 판단 패턴이 또렷합니다");
  if (acquired.reading?.majorLines?.heartLine?.detected) acquiredSignals.push("관계 표현 습관이 형성되어 있습니다");
  if (acquired.reading?.majorLines?.fateLine?.detected) acquiredSignals.push("사회적 실행 축이 강화된 흐름입니다");

  return {
    enabled: true,
    innateSummary: `타고난 당신의 손: ${innateTitle}은(는) ${innateSignals[0] || "본래 성향 신호를 보수적으로만 확인합니다"}. ${innateSignals[1] || "무의식적 반응 패턴은 추가 데이터가 필요합니다"}.`,
    acquiredSummary: `현재 살아가는 당신의 손: ${acquiredTitle}은(는) ${acquiredSignals[0] || "현재 습관 신호를 보수적으로 읽습니다"}. ${acquiredSignals[1] || "사회적 자아의 변화는 과장 없이 관찰합니다"}.`,
    differenceSummary: `타고난 나와 현재의 나, 무엇이 달라졌나: ${lifeDiff} ${headDiff} ${heartDiff} ${fateDiff} ${sunMoneyDiff}`,
    growthSummary: "당신이 더 살려야 할 본래 기질: 선천적 손에서 읽힌 강점은 무리하게 바꾸기보다, 현재 루틴 안에서 재사용 가능한 습관으로 옮길 때 안정적으로 살아납니다.",
    loveSummary: `연애 흐름 비교: ${loveFlow}`,
    careerSummary: `현재 삶에서 강화된 힘: ${careerFlow}`,
    wealthSummary: `재물 흐름 비교: ${wealthFlow}`,
  };
}

module.exports = {
  buildBothHandsComparison,
};
