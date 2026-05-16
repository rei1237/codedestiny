function toCardCode(entry) {
  return String(entry?.card?.code || entry?.code || entry?.cardId || "").toUpperCase();
}

function orientationOf(entry) {
  return entry?.orientation === "reversed" ? "reversed" : "upright";
}

function suitOf(entry) {
  const suit = String(entry?.card?.suit || "").toLowerCase();
  return suit && suit !== "major" ? suit : "major";
}

function rankNumberOf(entry) {
  const code = toCardCode(entry);
  if (!code || code.startsWith("M")) return null;
  const rank = Number(code.slice(1));
  if (!Number.isFinite(rank)) return null;
  return rank;
}

function hasCodes(entries, codeA, codeB) {
  const set = new Set(entries.map((entry) => toCardCode(entry)));
  return set.has(codeA) && set.has(codeB);
}

function specialPairInsights(entries, questionType) {
  const insights = [];
  const add = (title, description, type = "supportivePair") => {
    insights.push({ type, title, description });
  };

  if (hasCodes(entries, "M06", "C02")) {
    add("연인 + 컵 2", "강한 상호 호감이 확인됩니다. 감정적 접점이 분명해 재접근 대화가 열릴 가능성이 큽니다.");
  }
  if (hasCodes(entries, "M15", "M06")) {
    add("악마 + 연인", "사랑과 집착이 섞인 구도입니다. 강한 끌림이 있지만 건강한 경계가 없으면 다시 소모될 수 있습니다.", "conflictPair");
  }
  if (hasCodes(entries, "M16", "M13")) {
    const description = questionType === "reunion"
      ? "갑작스러운 단절 이후 완전한 재편이 필요합니다. 같은 방식의 재회 시도는 성공 확률이 낮습니다."
      : "기존 구조가 무너지고 새로운 규칙이 필요합니다. 과거 방식 고수는 손실을 키울 수 있습니다.";
    add("탑 + 죽음", description, "conflictPair");
  }
  if (hasCodes(entries, "M18", "S07")) {
    add("달 + 소드 7", "불안과 회피가 함께 나타납니다. 상대가 진심을 전부 드러내지 않을 가능성이 큽니다.", "conflictPair");
  }
  if (hasCodes(entries, "C06", "M20")) {
    add("컵 6 + 심판", "과거 인연이 다시 호출되는 조합입니다. 재회/재연결의 타이밍이 살아납니다.");
  }
  if (hasCodes(entries, "S08", "S02")) {
    add("소드 8 + 소드 2", "생각은 많은데 행동으로 옮기지 못하는 심리입니다. 연락하고 싶어도 스스로 막는 패턴이 강합니다.", "conflictPair");
  }
  if (hasCodes(entries, "S03", "C05")) {
    add("소드 3 + 컵 5", "상처와 후회가 크기 때문에 감정 회복이 선행되어야 합니다.", "conflictPair");
  }
  if (hasCodes(entries, "C01", "C11")) {
    add("컵 에이스 + 컵 페이지", "새 감정의 시작 신호입니다. 조심스러운 연락이나 설렘의 재점화가 가능합니다.");
  }
  if (hasCodes(entries, "W12", "W08")) {
    add("완드 나이트 + 완드 8", "급작스러운 연락과 빠른 전개 가능성이 큽니다. 단, 충동성 때문에 지속성 검증이 필요합니다.");
  }
  if (hasCodes(entries, "P10", "M05")) {
    add("펜타클 10 + 교황", "안정적 관계 또는 공식화 가능성이 큽니다. 현실 기반 합의가 강점입니다.");
  }

  return insights;
}

function analyzeTarotCombinations(entries, questionType, spread) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const totalCards = safeEntries.length || 1;
  const insights = [];

  const majorCount = safeEntries.filter((entry) => suitOf(entry) === "major").length;
  if (majorCount >= totalCards * 0.5) {
    const description = questionType === "reunion"
      ? "단순 연락 문제가 아니라 삶의 국면 전환이 먼저 요구되는 흐름입니다."
      : questionType === "love" || questionType === "relationship"
        ? "가벼운 썸보다는 인생 방향까지 흔드는 관계 이슈가 크게 작동합니다."
        : "인생 단위 전환 신호가 강해 장기 관점 판단이 필요합니다.";
    insights.push({
      type: "majorDominance",
      title: "메이저 아르카나 우세",
      description,
    });
  }

  const suitCount = { wands: 0, cups: 0, swords: 0, pentacles: 0 };
  safeEntries.forEach((entry) => {
    const suit = suitOf(entry);
    if (suitCount[suit] !== undefined) suitCount[suit] += 1;
  });

  const suitEntries = Object.entries(suitCount).sort((a, b) => b[1] - a[1]);
  const dominantSuit = suitEntries[0];
  if (dominantSuit && dominantSuit[1] >= 2) {
    const [suit, count] = dominantSuit;
    const bySuit = {
      cups: questionType === "reunion"
        ? "감정의 불씨가 남아 있어 재접근 가능성이 있습니다."
        : questionType === "exMind"
          ? "상대가 이성보다 감정에 더 묶여 있는 상태입니다."
          : "감정과 정서적 교류가 핵심입니다.",
      swords: questionType === "reunion"
        ? "오해 해소와 대화 방식 개선이 재회의 핵심 과제입니다."
        : questionType === "exMind"
          ? "상대는 감정보다 생각이 앞서 움직이지 못합니다."
          : "생각 과부하와 방어심리가 강합니다.",
      wands: questionType === "reunion"
        ? "갑작스러운 연락이나 감정 폭발 가능성이 있습니다."
        : "끌림과 행동력은 강하지만 안정성이 부족할 수 있습니다.",
      pentacles: questionType === "reunion"
        ? "감정보다 현실 조건이 재회의 핵심 장애물입니다."
        : "현실·시간·안정 조건이 결과를 결정합니다.",
    };
    insights.push({
      type: "suitDominance",
      title: `${suit.toUpperCase()} 슈트 우세 (${count}장)`,
      description: bySuit[suit] || "해당 슈트 에너지가 강합니다.",
    });
  }

  const reversedCount = safeEntries.filter((entry) => orientationOf(entry) === "reversed").length;
  if (reversedCount >= totalCards * 0.5) {
    insights.push({
      type: "reversedDominance",
      title: "역방향 비율 우세",
      description: "감정이 막혀 있거나 표현이 늦어지는 흐름입니다. 조급한 행동은 오히려 꼬일 수 있습니다.",
    });
  }

  const courtCount = safeEntries.filter((entry) => {
    const rank = rankNumberOf(entry);
    return rank !== null && rank >= 11;
  }).length;
  if (courtCount >= 2) {
    insights.push({
      type: "courtCards",
      title: "궁정 카드 집중",
      description: "실제 인물 구도, 주변 개입, 제3자 영향이 크게 작동합니다.",
    });
  }

  const rankMap = new Map();
  safeEntries.forEach((entry) => {
    const rank = rankNumberOf(entry);
    if (rank === null || rank > 10) return;
    rankMap.set(rank, (rankMap.get(rank) || 0) + 1);
  });

  const repeated = Array.from(rankMap.entries()).filter(([, count]) => count >= 2);
  repeated.forEach(([rank]) => {
    const rankMsg = {
      1: "새로운 시작과 연락의 씨앗",
      2: "선택과 균형, 눈치 보기",
      3: "소통 확장과 제3자 변수",
      4: "정체와 고집",
      5: "갈등과 상처",
      6: "회복과 추억",
      7: "방어와 거리두기",
      8: "압박과 변화 직전",
      9: "내면 집중과 마무리 직전",
      10: "완성과 종결",
    };
    insights.push({
      type: "repeatedNumber",
      title: `${rank} 숫자 반복`,
      description: rankMsg[rank] || "반복 숫자 에너지가 강조됩니다.",
    });
  });

  insights.push(...specialPairInsights(safeEntries, questionType));

  if (spread && Array.isArray(spread.positions) && safeEntries.length >= 2) {
    const first = safeEntries[0];
    const last = safeEntries[safeEntries.length - 1];
    const firstName = first?.card?.nameKo || "첫 카드";
    const lastName = last?.card?.nameKo || "마지막 카드";
    const direction = orientationOf(last) === "reversed"
      ? "결말을 서두르기보다 중간 조정이 필요합니다."
      : "중간 합의가 된다면 흐름이 점차 안정됩니다.";

    insights.push({
      type: "storyFlow",
      title: "스토리 흐름",
      description: `${firstName}에서 ${lastName}(으)로 이어지는 전개입니다. ${direction}`,
    });
  }

  if (!insights.length) {
    insights.push({
      type: "storyFlow",
      title: "기본 흐름",
      description: "카드 간 연결은 조심스럽지만 일관된 신호를 보냅니다. 작은 행동이 전체 결과를 바꿉니다.",
    });
  }

  return insights;
}

export { analyzeTarotCombinations };
