import type { CanonicalPalmReading, PalmAnalysisPurpose, PalmHandReading } from "@/types/palm-reading";
import {
  CARD_TITLE_BY_KEY,
  FORBIDDEN_POLICY_WORDS,
  FORBIDDEN_RENDER_PATTERNS,
  HAND_SHAPE_TONE,
  PURPOSE_FOCUS_COPY,
  SECTION_LABELS,
  SOFT_UNCERTAIN_COPY,
} from "@/lib/palm/easy-palm-reading-templates";

export type NarrativeCardKey =
  | "lifeLine"
  | "headLine"
  | "heartLine"
  | "fateLine"
  | "sunLine"
  | "moneyLine"
  | "marriageLine"
  | "mounts";

export type PalmNarrativeCard = {
  key: NarrativeCardKey;
  title: string;
  oneLiner: string;
  details: string[];
  strengths: string[];
  cautions: string[];
  todayAdvice: string;
  sevenDayPractice: string;
  emphasisScore: number;
};

export type PalmNarrativeSection = {
  key: "overall" | "love" | "wealth" | "career" | "personality" | "healthEnergy" | "relationship" | "advice";
  title: string;
  summary: string;
  detail: string;
  advice: string;
};

export type PalmNarrativeBundle = {
  oneLiner: string;
  focusSummary: string;
  sections: PalmNarrativeSection[];
  cards: PalmNarrativeCard[];
  report: {
    oneLiner: string;
    summary: string;
    love: string;
    wealth: string;
    career: string;
    personality: string;
    healthEnergy: string;
    relationship: string;
    advice: string;
    tips: string[];
  };
  forbiddenMatches: string[];
};

const EMPHASIS_BY_PURPOSE: Record<PalmAnalysisPurpose, Partial<Record<NarrativeCardKey, number>>> = {
  general: {},
  love: { heartLine: 3, marriageLine: 3, mounts: 2 },
  wealth: { moneyLine: 3, mounts: 2, fateLine: 2 },
  career: { fateLine: 3, headLine: 2, sunLine: 2 },
  personality: { headLine: 3, heartLine: 2, mounts: 2 },
  relationship: { heartLine: 3, marriageLine: 3, mounts: 2 },
};

function purposeEmphasis(key: NarrativeCardKey, purpose: PalmAnalysisPurpose): number {
  return 1 + (EMPHASIS_BY_PURPOSE[purpose][key] || 0);
}

function uniqTop(list: Array<string | null | undefined>, count: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of list) {
    const line = String(value || "").trim();
    if (!line || seen.has(line)) continue;
    seen.add(line);
    out.push(line);
    if (out.length >= count) break;
  }
  return out;
}

function pickPrimaryReading(canonical: CanonicalPalmReading): PalmHandReading | null {
  const dominant = canonical.profile.dominantHand;
  if (dominant === "left") return canonical.leftHandReading || canonical.rightHandReading;
  if (dominant === "right") return canonical.rightHandReading || canonical.leftHandReading;
  return canonical.rightHandReading || canonical.leftHandReading;
}

function shapeTone(reading: PalmHandReading | null): string {
  const key = String(reading?.handShape?.type || "unknown");
  return HAND_SHAPE_TONE[key] || HAND_SHAPE_TONE.unknown;
}

function lifeTone(reading: PalmHandReading | null): { summary: string; detail: string; advice: string; shortTag: string } {
  const life = reading?.majorLines.lifeLine;
  if (!life?.detected) {
    return {
      summary: SOFT_UNCERTAIN_COPY.health,
      detail:
        "에너지를 억지로 끌어올리기보다 수면, 식사, 짧은 산책처럼 기본 리듬을 안정시키면 운의 체감이 훨씬 좋아져요.",
      advice: "오늘은 무리한 일정 하나를 덜어내고, 쉬는 시간을 먼저 캘린더에 넣어 주세요.",
      shortTag: "회복 리듬 조정형",
    };
  }

  if (life.length === "long" && life.depth === "deep") {
    return {
      summary:
        "당신은 쉽게 무너지는 타입이 아니라, 힘들어도 다시 일어나는 회복력이 좋은 편이에요. 한 번 마음먹은 일은 오래 끌고 갈 수 있어요.",
      detail:
        "다만 참는 힘이 좋은 사람일수록 한 번에 지칠 수 있으니, 버티는 것만큼 멈춰 쉬는 타이밍을 같이 관리하면 더 안정적으로 올라갑니다.",
      advice: "집중 90분 뒤 10분 회복 규칙을 오늘 하루만이라도 꼭 지켜보세요.",
      shortTag: "오래 버티는 회복형",
    };
  }

  if (life.breaks > 0) {
    return {
      summary:
        "에너지가 한 방향으로만 흐르기보다, 중간중간 페이스를 바꾸며 적응하는 손이에요. 변화 구간을 잘 넘기면 오히려 더 단단해집니다.",
      detail:
        "중요한 건 속도를 올리는 것보다 내 컨디션에 맞는 리듬을 찾는 거예요. 생활 패턴이 정리될수록 운도 같이 정돈됩니다.",
      advice: "오늘 해야 할 일을 3개가 아니라 1개만 확실히 끝내는 쪽으로 조정해 보세요.",
      shortTag: "페이스 전환형",
    };
  }

  return {
    summary:
      "에너지는 급하게 불태우기보다 꾸준히 관리할 때 더 좋아지는 손이에요. 큰 파도보다 잔잔한 지속력이 강점입니다.",
    detail:
      "내 리듬을 지키면 일이 쌓이고, 일이 쌓이면 자신감도 같이 올라오는 흐름이에요. 작은 루틴이 생각보다 큰 차이를 만듭니다.",
    advice: "오늘은 시작 시간을 고정하고, 끝난 뒤에는 짧게라도 회복 시간을 꼭 챙겨 주세요.",
    shortTag: "꾸준한 지속형",
  };
}

function loveTone(reading: PalmHandReading | null): { summary: string; detail: string; advice: string; shortTag: string } {
  const heart = reading?.majorLines.heartLine;
  const marriage = reading?.minorLines.marriageLine;

  if (!heart?.detected && !marriage?.detected) {
    return {
      summary: SOFT_UNCERTAIN_COPY.love,
      detail:
        "지금은 빨리 결론을 내리기보다, 나를 편하게 해주는 사람의 기준을 먼저 분명히 세우는 게 연애운을 살리는 포인트예요.",
      advice: "애매한 신호를 혼자 해석하지 말고, 짧고 부드러운 질문으로 바로 확인해 보세요.",
      shortTag: "기준을 세우는 탐색형",
    };
  }

  if (heart?.curvature === "strong") {
    return {
      summary:
        "감정이 얕지 않은 편이라 한 번 마음이 가면 오래 가는 타입이에요. 가벼운 설렘보다 진짜 안정감을 더 중요하게 봅니다.",
      detail:
        "상대의 작은 말투에도 오래 생각할 수 있으니, 마음이 흔들릴수록 확인 대화를 빨리 하는 게 관계를 지키는 핵심이에요.",
      advice: "오늘은 기대하는 한 가지를 요청 문장으로 바꿔 전달해 보세요.",
      shortTag: "마음이 깊은 안정형",
    };
  }

  if (heart?.curvature === "straight") {
    return {
      summary:
        "연애에서 감정 과열보다 신뢰와 일관성을 중요하게 보는 타입이에요. 말보다 태도로 마음을 보여주는 편입니다.",
      detail:
        "차분함이 장점이지만 표현이 적으면 오해가 생길 수 있어요. 작은 애정 표현을 자주 하면 관계운이 더 부드러워집니다.",
      advice: "고마운 마음 하나를 짧게라도 먼저 전해 보세요.",
      shortTag: "차분한 신뢰형",
    };
  }

  return {
    summary:
      "좋아하는 사람이 생기면 쉽게 식지 않고 오래 마음을 쓰는 편이에요. 설렘만큼 편안함을 중요하게 보는 흐름입니다.",
    detail:
      "관계가 애매해질 때 혼자 결론을 만들면 피로가 커질 수 있어요. 솔직한 질문 하나가 관계의 방향을 빠르게 정리해 줍니다.",
    advice: "오늘은 밀당보다 편안한 톤의 대화를 먼저 열어 보세요.",
    shortTag: "천천히 깊어지는 진심형",
  };
}

function wealthTone(reading: PalmHandReading | null): { summary: string; detail: string; advice: string; shortTag: string } {
  const money = reading?.minorLines.moneyLine;
  const score = Number(reading?.scores?.wealth ?? NaN);

  if (!money?.detected) {
    return {
      summary: SOFT_UNCERTAIN_COPY.wealth,
      detail:
        "내가 잘 아는 분야를 꾸준히 쌓아 수익으로 연결할 때 돈 흐름이 안정돼요. 속도보다 관리 습관이 먼저입니다.",
      advice: "오늘 결제 한 건은 금액보다 목적을 먼저 적고 진행해 보세요.",
      shortTag: "차근차근 축적형",
    };
  }

  if (Number.isFinite(score) && score >= 72) {
    return {
      summary:
        "돈 운은 한 번에 터지는 타입보다, 실력과 신뢰를 수익으로 바꾸는 흐름이 강해요. 작은 기회를 크게 키우는 감각이 있습니다.",
      detail:
        "특히 경험, 정보, 상담, 콘텐츠처럼 사람의 문제를 해결하는 방식에서 수익 연결이 좋아질 수 있어요.",
      advice: "오늘은 지출을 필수/성장/위안으로 나눠서 한 줄만 기록해 보세요.",
      shortTag: "실력 수익화형",
    };
  }

  return {
    summary:
      "재물운은 무리한 승부보다 꾸준한 관리에서 힘이 붙는 손이에요. 흐름이 붙는 순간은 보통 준비가 쌓였을 때 옵니다.",
    detail:
      "조급함만 줄이면 돈의 흐름이 더 매끈해져요. 작은 금액이라도 반복되는 습관을 정리하면 체감이 빠르게 달라집니다.",
    advice: "이번 주에는 충동 지출 하나만 줄이는 목표를 잡아 보세요.",
    shortTag: "관리 중심 안정형",
  };
}

function careerTone(reading: PalmHandReading | null): { summary: string; detail: string; advice: string; shortTag: string } {
  const fate = reading?.majorLines.fateLine;

  if (!fate?.detected) {
    return {
      summary: SOFT_UNCERTAIN_COPY.career,
      detail:
        "처음부터 완벽한 길을 찾으려 하기보다, 작은 프로젝트로 나에게 맞는 방향을 확인해 가는 방식이 더 잘 맞아요.",
      advice: "오늘은 다음 2주 동안 밀고 갈 목표 하나를 한 문장으로 적어 보세요.",
      shortTag: "탐색 기반 성장형",
    };
  }

  if (fate.strength === "strong") {
    return {
      summary:
        "남이 정해준 길보다 내가 직접 만든 방식에서 힘이 커지는 손이에요. 시간이 갈수록 신뢰를 얻는 타입입니다.",
      detail:
        "초반 속도가 느려 보여도 쌓인 실력이 결국 평가를 바꿔요. 방향만 흔들리지 않으면 후반에 강해집니다.",
      advice: "오늘은 현재 업무를 '반복 가능한 나만의 방식'으로 한 줄 정리해 보세요.",
      shortTag: "자기 방식 완성형",
    };
  }

  return {
    summary:
      "직업운은 단거리 질주보다 중장기 축적에 강해요. 경험이 쌓일수록 결과가 더 선명해지는 흐름입니다.",
    detail:
      "지금은 화려함보다 실력을 쌓는 시기라 생각하면 편해요. 루틴을 지키는 사람이 결국 속도를 가져갑니다.",
      advice: "오늘은 미뤄둔 일 하나를 끝내며 마감 감각을 회복해 보세요.",
    shortTag: "늦게 강해지는 신뢰형",
  };
}

function personalityTone(reading: PalmHandReading | null): { summary: string; detail: string; advice: string; shortTag: string } {
  const head = reading?.majorLines.headLine;
  const base = shapeTone(reading);

  const thinking = !head?.detected
    ? "생각이 많아질 때는 단순한 기준부터 세우는 편이 유리해요."
    : head.direction === "straight"
    ? "판단할 때 현실 기준을 먼저 세우는 편이라 실수가 적은 타입이에요."
    : head.direction === "downward"
    ? "감각과 직관이 좋아서 보이지 않는 분위기도 잘 읽는 편이에요."
    : "현실감과 상상력을 함께 쓰는 균형형 사고가 강점이에요.";

  return {
    summary: `당신은 ${base}으로 읽혀요. 첫인상보다 가까워질수록 깊이가 느껴지는 타입입니다.`,
    detail: `${thinking} 그래서 느려 보여도 한 번 방향을 잡으면 끝까지 밀고 가는 힘이 있어요.`,
    advice: "오늘은 고민만 하던 선택 하나를 70% 확신으로 실행해 보세요.",
    shortTag: "묵직한 신뢰 매력형",
  };
}

function relationshipTone(reading: PalmHandReading | null): { summary: string; detail: string; advice: string; shortTag: string } {
  const mercury = reading?.minorLines.mercuryLine;
  const heart = reading?.majorLines.heartLine;

  if (!heart?.detected && !mercury?.detected) {
    return {
      summary: SOFT_UNCERTAIN_COPY.relationship,
      detail:
        "좋은 관계운의 핵심은 누가 맞느냐보다, 나를 편하게 만드는 대화 방식을 먼저 찾는 거예요.",
      advice: "오늘은 답을 내리기보다, 상대의 진짜 의도를 묻는 질문 하나를 던져 보세요.",
      shortTag: "유연한 가능성형",
    };
  }

  return {
    summary:
      "관계에서는 겉으로 밝은 사람보다 마음이 편한 사람에게 더 끌리는 흐름이에요. 오래 갈 관계를 고르는 감각이 있는 편입니다.",
    detail:
      "다만 상대 반응을 혼자 해석하면 에너지가 빨리 빠질 수 있어요. 확인 대화가 많을수록 관계운이 더 안정됩니다.",
    advice: "오늘은 연락을 기다리기보다 가볍고 따뜻한 톤으로 먼저 분위기를 열어 보세요.",
    shortTag: "편안함을 고르는 안정형",
  };
}

function buildAdviceSection(sections: {
  overall: ReturnType<typeof lifeTone>;
  love: ReturnType<typeof loveTone>;
  wealth: ReturnType<typeof wealthTone>;
  career: ReturnType<typeof careerTone>;
  personality: ReturnType<typeof personalityTone>;
  relationship: ReturnType<typeof relationshipTone>;
}): { summary: string; detail: string; advice: string; tips: string[] } {
  const tips = uniqTop([
    "큰 결정보다 미뤄둔 작은 일 하나를 끝내며 흐름을 열어 보세요.",
    sections.love.advice,
    sections.wealth.advice,
    sections.career.advice,
    "마음이 복잡할수록 혼자 결론 내리지 말고 짧게라도 대화를 시작해 보세요.",
  ], 3);

  return {
    summary: "오늘은 완벽한 답을 찾기보다, 작게 움직이며 흐름을 살리는 날이에요.",
    detail: "한 번에 인생을 바꾸는 선택보다 지금 당장 실천 가능한 한 걸음이 운을 더 빠르게 움직입니다.",
    advice: tips.join(" "),
    tips,
  };
}

function sanitizeText(raw: string, found: Set<string>): string {
  let out = String(raw || "");
  for (const token of FORBIDDEN_POLICY_WORDS) {
    if (out.includes(token)) {
      found.add(token);
    }
  }
  for (const row of FORBIDDEN_RENDER_PATTERNS) {
    out = out.replace(row.pattern, row.replacement);
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

function sanitizeList(values: string[], found: Set<string>): string[] {
  return values.map((line) => sanitizeText(line, found));
}

function cardFromSection(input: {
  key: NarrativeCardKey;
  section: PalmNarrativeSection;
  purpose: PalmAnalysisPurpose;
  oneLiner: string;
}): PalmNarrativeCard {
  const details = uniqTop([input.section.summary, input.section.detail], 4);
  const strengths = uniqTop([
    "내 흐름을 알고 움직일수록 결과가 더 안정됩니다.",
    "작은 반복을 지키면 운의 체감이 빠르게 좋아집니다.",
    "지금의 장점을 꾸준히 쓰면 신뢰가 쌓이는 타입이에요.",
  ], 3);
  const cautions = uniqTop([
    "혼자 해석만 오래하면 에너지가 빠질 수 있어요.",
    "한 번에 큰 결론을 내리기보다 확인 대화를 먼저 해보세요.",
    "무리한 속도보다 내 리듬을 지키는 편이 훨씬 유리해요.",
  ], 3);

  return {
    key: input.key,
    title: CARD_TITLE_BY_KEY[input.key],
    oneLiner: input.oneLiner,
    details,
    strengths,
    cautions,
    todayAdvice: input.section.advice,
    sevenDayPractice: "7일 동안 하루 1줄로 기분/지출/일 진행 상황을 기록해 패턴을 확인해 보세요.",
    emphasisScore: purposeEmphasis(input.key, input.purpose),
  };
}

export function buildPalmNarrativeBundle(canonical: CanonicalPalmReading): PalmNarrativeBundle {
  const purpose = canonical.profile.analysisPurpose || "general";
  const reading = pickPrimaryReading(canonical);

  const personality = personalityTone(reading);
  const life = lifeTone(reading);
  const love = loveTone(reading);
  const wealth = wealthTone(reading);
  const career = careerTone(reading);
  const relationship = relationshipTone(reading);

  const oneLiner = `당신의 손은 \"${personality.shortTag}\", 연애에서는 \"${love.shortTag}\", 일에서는 \"${career.shortTag}\" 흐름에 가까워요.`;

  const overallSection: PalmNarrativeSection = {
    key: "overall",
    title: SECTION_LABELS.overall,
    summary:
      "지금은 완전히 새로운 걸 억지로 시작하기보다, 이미 가진 강점을 정리해 제대로 쓰면 운이 안정되는 시기예요.",
    detail: `${personality.detail} ${career.detail}`,
    advice: "남의 속도보다 내 리듬을 우선으로 잡아 보세요. 그게 가장 빠른 길이 됩니다.",
  };

  const loveSection: PalmNarrativeSection = {
    key: "love",
    title: SECTION_LABELS.love,
    summary: love.summary,
    detail: love.detail,
    advice: love.advice,
  };

  const wealthSection: PalmNarrativeSection = {
    key: "wealth",
    title: SECTION_LABELS.wealth,
    summary: wealth.summary,
    detail: wealth.detail,
    advice: wealth.advice,
  };

  const careerSection: PalmNarrativeSection = {
    key: "career",
    title: SECTION_LABELS.career,
    summary: career.summary,
    detail: career.detail,
    advice: career.advice,
  };

  const personalitySection: PalmNarrativeSection = {
    key: "personality",
    title: SECTION_LABELS.personality,
    summary: personality.summary,
    detail: personality.detail,
    advice: personality.advice,
  };

  const healthSection: PalmNarrativeSection = {
    key: "healthEnergy",
    title: SECTION_LABELS.healthEnergy,
    summary: life.summary,
    detail: life.detail,
    advice: life.advice,
  };

  const relationshipSection: PalmNarrativeSection = {
    key: "relationship",
    title: SECTION_LABELS.relationship,
    summary: relationship.summary,
    detail: relationship.detail,
    advice: relationship.advice,
  };

  const adviceMeta = buildAdviceSection({
    overall: life,
    love,
    wealth,
    career,
    personality,
    relationship,
  });

  const adviceSection: PalmNarrativeSection = {
    key: "advice",
    title: SECTION_LABELS.advice,
    summary: adviceMeta.summary,
    detail: adviceMeta.detail,
    advice: adviceMeta.advice,
  };

  const cardBase = [
    cardFromSection({ key: "lifeLine", section: healthSection, purpose, oneLiner: healthSection.summary }),
    cardFromSection({ key: "headLine", section: personalitySection, purpose, oneLiner: personalitySection.summary }),
    cardFromSection({ key: "heartLine", section: loveSection, purpose, oneLiner: loveSection.summary }),
    cardFromSection({ key: "fateLine", section: careerSection, purpose, oneLiner: careerSection.summary }),
    cardFromSection({ key: "sunLine", section: personalitySection, purpose, oneLiner: "사람들이 기억하는 나만의 분위기를 키우는 흐름이 좋아요." }),
    cardFromSection({ key: "moneyLine", section: wealthSection, purpose, oneLiner: wealthSection.summary }),
    cardFromSection({ key: "marriageLine", section: relationshipSection, purpose, oneLiner: relationshipSection.summary }),
    cardFromSection({ key: "mounts", section: overallSection, purpose, oneLiner: overallSection.summary }),
  ];

  const found = new Set<string>();

  const sections = [
    overallSection,
    loveSection,
    wealthSection,
    careerSection,
    personalitySection,
    healthSection,
    relationshipSection,
    adviceSection,
  ].map((section) => ({
    ...section,
    title: sanitizeText(section.title, found),
    summary: sanitizeText(section.summary, found),
    detail: sanitizeText(section.detail, found),
    advice: sanitizeText(section.advice, found),
  }));

  const cards = cardBase
    .map((card) => ({
      ...card,
      title: sanitizeText(card.title, found),
      oneLiner: sanitizeText(card.oneLiner, found),
      details: sanitizeList(card.details, found),
      strengths: sanitizeList(card.strengths, found),
      cautions: sanitizeList(card.cautions, found),
      todayAdvice: sanitizeText(card.todayAdvice, found),
      sevenDayPractice: sanitizeText(card.sevenDayPractice, found),
    }))
    .sort((a, b) => b.emphasisScore - a.emphasisScore);

  const report = {
    oneLiner: sanitizeText(oneLiner, found),
    summary: sections.find((x) => x.key === "overall")?.summary || "손금 흐름을 쉽게 정리했어요.",
    love: sections.find((x) => x.key === "love")?.summary || "연애 흐름을 읽어봤어요.",
    wealth: sections.find((x) => x.key === "wealth")?.summary || "돈 흐름을 읽어봤어요.",
    career: sections.find((x) => x.key === "career")?.summary || "일과 진로 흐름을 읽어봤어요.",
    personality: sections.find((x) => x.key === "personality")?.summary || "성격과 매력을 읽어봤어요.",
    healthEnergy: sections.find((x) => x.key === "healthEnergy")?.summary || "에너지 흐름을 읽어봤어요.",
    relationship: sections.find((x) => x.key === "relationship")?.summary || "관계운을 읽어봤어요.",
    advice: sections.find((x) => x.key === "advice")?.advice || "오늘은 작은 행동 하나를 끝내며 흐름을 살려 보세요.",
    tips: sanitizeList(adviceMeta.tips, found),
  };

  return {
    oneLiner: report.oneLiner,
    focusSummary: sanitizeText(PURPOSE_FOCUS_COPY[purpose], found),
    sections,
    cards,
    report,
    forbiddenMatches: Array.from(found),
  };
}
