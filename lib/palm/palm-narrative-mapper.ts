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

function firstText(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
}

function lineLengthText(value: string | null | undefined): string {
  if (value === "long") return "길게 이어져 지속성과 축적력이 강한 편";
  if (value === "medium") return "중간 길이로 현실 감각과 유연성이 균형을 이루는 편";
  if (value === "short") return "짧게 모여 필요한 곳에 힘을 집중하는 편";
  return "길이 판단이 옅어 전체 손의 분위기와 함께 보아야 하는 편";
}

function lineDepthText(value: string | null | undefined): string {
  if (value === "deep") return "깊이가 선명해 의지와 체감 에너지가 강하게 드러납니다";
  if (value === "medium") return "깊이가 고르게 보여 현재 리듬을 안정적으로 유지합니다";
  if (value === "faint") return "깊이가 옅어 무리보다 회복과 정리가 먼저 필요합니다";
  return "깊이 신호가 약해 사진의 빛과 손바닥 결을 함께 참고했습니다";
}

function lineCurveText(value: string | null | undefined): string {
  if (value === "wide" || value === "strong") return "곡선이 넓어 감정과 에너지를 크게 쓰는 손입니다";
  if (value === "normal" || value === "soft") return "곡선이 부드러워 상황에 맞춰 조율하는 힘이 있습니다";
  if (value === "narrow" || value === "straight") return "흐름이 곧아 판단과 표현이 절제되는 편입니다";
  return "곡선이 옅어 주변 선의 흐름까지 함께 읽었습니다";
}

function headDirectionText(value: string | null | undefined): string {
  if (value === "straight") return "현실 판단, 분석, 계획의 힘이 먼저 작동합니다";
  if (value === "curved") return "상상력과 감각 판단이 함께 살아납니다";
  if (value === "downward") return "직관, 몰입, 내면 탐구 쪽으로 생각이 깊어집니다";
  return "생각의 방향은 한쪽으로 치우치지 않고 상황에 따라 달라집니다";
}

function headStartText(value: string | null | undefined): string {
  if (value === "joined") return "생명선과 붙어 시작해 신중함과 안정 확인 욕구가 강합니다";
  if (value === "separated") return "생명선과 떨어져 시작해 독립 판단과 자기 주도성이 강합니다";
  return "시작점이 옅어 신중함과 독립성의 균형을 함께 보았습니다";
}

function heartEndingText(value: string | null | undefined): string {
  if (value === "underIndex") return "끝이 검지 아래로 향해 이상, 신뢰, 존중을 관계의 기준으로 삼습니다";
  if (value === "underMiddle") return "끝이 중지 아래로 향해 현실적 안정과 책임감을 중시합니다";
  if (value === "between") return "끝이 검지와 중지 사이에 머물러 마음과 현실의 균형을 찾습니다";
  return "끝 지점이 옅어 애정 표현과 관계 온도를 조심스럽게 읽었습니다";
}

function fateStrengthText(value: string | null | undefined): string {
  if (value === "strong") return "운명선의 힘이 살아 목표축과 사회적 방향성이 분명합니다";
  if (value === "medium") return "운명선이 균형 있게 보여 방향을 다듬으며 성장하는 흐름입니다";
  if (value === "weak" || value === "none") return "운명선이 옅어 정해진 길보다 선택과 탐색의 운이 큽니다";
  return "운명선 신호가 약해 일의 방향은 생활 변화와 함께 보았습니다";
}

function fateStartText(value: string | null | undefined): string {
  if (value === "wrist") return "손목 쪽에서 올라와 초반부터 꾸준히 쌓는 길에 강합니다";
  if (value === "lifeLine") return "생활 기반과 자기 노력에서 직업 흐름이 열립니다";
  if (value === "moonMount") return "사람, 이동, 외부 환경에서 기회가 들어오는 손입니다";
  if (value === "middlePalm") return "경험을 거친 뒤 중반부터 방향이 또렷해지는 흐름입니다";
  return "시작점이 옅어 현재 선택과 환경의 작용을 함께 보았습니다";
}

function fateEndText(value: string | null | undefined): string {
  if (value === "saturnMount") return "책임, 전문성, 장기 과제 쪽으로 힘이 모입니다";
  if (value === "middlePalm") return "중간 과정에서 진로 조정과 역할 변화가 중요합니다";
  return "끝 지점이 옅어 목표를 고정하기보다 흐름을 살피는 편이 좋습니다";
}

function lineChangeText(label: string, branches?: number, breaks?: number): string {
  const branchCount = Math.max(0, Number(branches || 0));
  const breakCount = Math.max(0, Number(breaks || 0));
  if (branchCount > 0 && breakCount > 0) {
    return `${label}에는 가지 ${branchCount}개와 전환 ${breakCount}개가 보여, 확장 욕구와 리듬 변화가 함께 읽힙니다.`;
  }
  if (branchCount > 0) return `${label}의 가지 ${branchCount}개는 관심사의 확장, 이동, 새로운 선택지를 뜻합니다.`;
  if (breakCount > 0) return `${label}의 전환 ${breakCount}개는 흐름이 꺾이는 예언이 아니라 생활 방식의 재정비 지점입니다.`;
  return `${label}은 큰 흔들림보다 한 방향으로 이어지는 결이 더 강합니다.`;
}

function minorStrengthText(value: string | null | undefined): string {
  const raw = String(value || "").toLowerCase();
  if (raw.includes("strong") || raw.includes("high")) return "선명하게 살아 있는 보조선";
  if (raw.includes("medium") || raw.includes("normal")) return "균형 있게 드러나는 보조선";
  if (raw.includes("weak") || raw.includes("low") || raw.includes("faint")) return "아직 은은하게만 보이는 보조선";
  return "사진 흐름상 조심스럽게 참고한 보조선";
}

function mountToneText(value: string | null | undefined): string {
  if (value === "strong") return "강하게 차올라 성향의 중심으로 작동합니다";
  if (value === "medium") return "균형 있게 살아 있어 상황에 따라 힘을 냅니다";
  if (value === "weak") return "옅게 보여 의식적으로 보완하면 좋아집니다";
  return "사진상 또렷하지 않아 전체 흐름 속에서 참고했습니다";
}

function mountFocusLines(reading: PalmHandReading): string[] {
  const labelByKey: Record<keyof PalmHandReading["mounts"], string> = {
    venus: "애정과 활력 포인트",
    moon: "직관과 상상 포인트",
    jupiter: "성장과 자존 포인트",
    saturn: "책임과 인내 포인트",
    sun: "표현과 명예 포인트",
    mercury: "말과 거래 포인트",
    mars: "추진과 버티는 힘 포인트",
  };
  return (Object.entries(reading.mounts) as Array<[keyof PalmHandReading["mounts"], PalmHandReading["mounts"][keyof PalmHandReading["mounts"]]]>)
    .filter(([, mount]) => mount.fullness === "strong" || mount.fullness === "medium")
    .map(([key, mount]) => `${labelByKey[key]}는 ${mountToneText(mount.fullness)}. ${mount.summary}`)
    .slice(0, 5);
}

function cardEvidenceLines(key: NarrativeCardKey, reading: PalmHandReading | null): string[] {
  if (!reading) return [];

  if (key === "lifeLine") {
    const line = reading.majorLines.lifeLine;
    return uniqTop([
      line.summary,
      line.advice,
      line.detected
        ? `생명선은 ${lineLengthText(line.length)}이며, ${lineDepthText(line.depth)}. ${lineCurveText(line.curvature)}`
        : "이번 사진에서는 생명선이 옅어 손바닥의 큰 결, 손 형태, 회복 리듬을 함께 보정해 읽었습니다.",
      lineChangeText("생명선", line.branches, line.breaks),
      "생명선은 수명을 단정하는 선이 아니라 기운을 쓰고 회복하는 생활 방식의 결을 보여줍니다.",
    ], 6);
  }

  if (key === "headLine") {
    const line = reading.majorLines.headLine;
    return uniqTop([
      line.summary,
      line.advice,
      line.detected
        ? `두뇌선은 ${lineLengthText(line.length)}이고, ${headDirectionText(line.direction)}. ${headStartText(line.startRelationWithLifeLine)}.`
        : "두뇌선이 옅게 보이면 생각의 힘이 약하다는 뜻이 아니라, 사진 속 손 형태와 다른 선을 함께 보아 판단 흐름을 읽습니다.",
      lineChangeText("두뇌선", line.branches, line.breaks),
      "두뇌선은 지능의 높낮이가 아니라 문제를 붙잡는 방식, 결정을 확정하는 속도, 집중의 결을 보여줍니다.",
    ], 6);
  }

  if (key === "heartLine") {
    const line = reading.majorLines.heartLine;
    return uniqTop([
      line.summary,
      line.advice,
      line.detected
        ? `감정선은 ${lineLengthText(line.length)}이고, ${lineCurveText(line.curvature)}. ${heartEndingText(line.endingArea)}.`
        : "감정선이 옅을 때는 마음이 없는 손이 아니라, 표현 방식이 조심스럽고 관계의 온도를 천천히 확인하는 흐름으로 읽습니다.",
      lineChangeText("감정선", line.branches, line.breaks),
      "감정선은 사랑의 결과를 고정하지 않고, 애정 표현과 상처를 받아들이는 방식, 관계에서 기대하는 안정감을 봅니다.",
    ], 6);
  }

  if (key === "fateLine") {
    const line = reading.majorLines.fateLine;
    return uniqTop([
      line.summary,
      line.advice,
      line.detected
        ? `${fateStrengthText(line.strength)}. ${fateStartText(line.startArea)} ${fateEndText(line.endArea)}.`
        : "운명선이 옅은 손은 정해진 길이 없다는 뜻보다, 환경과 선택에 따라 길을 만들어 가는 폭이 넓다는 뜻에 가깝습니다.",
      lineChangeText("운명선", 0, line.breaks),
      "운명선은 직업의 이름을 예언하기보다 목표의식, 사회적 책임, 오래 붙잡을 과제의 방향을 보여줍니다.",
    ], 6);
  }

  if (key === "sunLine") {
    const line = reading.minorLines.sunLine;
    return uniqTop([
      line.summary,
      `태양선은 ${minorStrengthText(line.strength)}으로 읽히며, 사람들이 기억하는 이미지와 표현력의 결을 보여줍니다.`,
      "이 선은 갑작스러운 명성을 단정하기보다, 이름을 걸고 보여주는 일에서 신뢰가 쌓이는 방식을 봅니다.",
    ], 5);
  }

  if (key === "moneyLine") {
    const line = reading.minorLines.moneyLine;
    return uniqTop([
      line.summary,
      `재물선은 ${minorStrengthText(line.strength)}으로 읽히며, 돈을 끌어오는 감각보다 돈을 다루는 습관을 먼저 봅니다.`,
      "재물 흐름은 확정 금액이 아니라 기술, 정보, 말, 경험을 가치로 바꾸는 능력과 연결됩니다.",
    ], 5);
  }

  if (key === "marriageLine") {
    const line = reading.minorLines.marriageLine;
    return uniqTop([
      line.summary,
      `관계선은 ${minorStrengthText(line.strength)}으로 읽히며, 친밀감의 속도와 약속을 받아들이는 방식을 보여줍니다.`,
      "관계선은 결혼 횟수를 단정하지 않고, 마음을 여는 거리감과 안정 욕구를 조심스럽게 읽습니다.",
    ], 5);
  }

  return uniqTop([
    reading.handShape.summary,
    reading.overall.summary,
    ...mountFocusLines(reading),
    reading.mounts.venus.summary,
    reading.mounts.moon.summary,
    reading.mounts.jupiter.summary,
    reading.mounts.saturn.summary,
    reading.mounts.sun.summary,
    reading.mounts.mercury.summary,
    reading.mounts.mars.summary,
  ], 6);
}

function cardStrengthLines(key: NarrativeCardKey): string[] {
  const map: Record<NarrativeCardKey, string[]> = {
    lifeLine: [
      "생명선의 깊이를 생활 리듬에 맞추면 지치기 전에 회복할 타이밍을 잡을 수 있습니다.",
      "곡선의 폭을 알면 에너지를 넓게 쓰는 날과 좁게 모아야 하는 날을 구분할 수 있습니다.",
      "가지가 보이는 손은 이동, 배움, 새 환경에서 기운이 살아나는 장점이 있습니다.",
    ],
    headLine: [
      "두뇌선의 방향을 알면 생각이 현실형인지 감각형인지 선명해져 결정이 빨라집니다.",
      "시작점의 결을 보면 신중함과 독립성 중 어느 힘을 먼저 써야 할지 알 수 있습니다.",
      "선의 변화 지점은 생각이 흔들리는 약점이 아니라 사고 방식이 바뀌는 성장점입니다.",
    ],
    heartLine: [
      "감정선의 끝 지점은 사랑에서 무엇을 기준으로 삼는지 또렷하게 보여줍니다.",
      "곡선이 살아 있으면 마음을 표현하고 공감하는 힘을 관계의 장점으로 쓸 수 있습니다.",
      "가지가 많은 손은 섬세한 감정 감지가 강해 대화의 결을 잘 읽습니다.",
    ],
    fateLine: [
      "운명선의 힘을 알면 지금은 길을 고정할 때인지 넓게 탐색할 때인지 구분할 수 있습니다.",
      "시작 지점은 직업운이 자기 노력, 환경, 사람 중 어디서 열리는지 알려줍니다.",
      "중간 전환은 좌절보다 역할을 바꾸어 힘을 다시 세우는 신호로 활용할 수 있습니다.",
    ],
    sunLine: [
      "태양선의 결은 재능보다 사람들이 기억하는 인상과 표현의 지속성을 보여줍니다.",
      "작게라도 공개 가능한 결과물을 쌓으면 존재감의 운이 살아납니다.",
      "이름을 걸고 보여주는 일에서 신뢰와 매력이 함께 자라는 흐름입니다.",
    ],
    moneyLine: [
      "재물선은 돈을 부르는 감각보다 돈의 흐름을 붙잡는 습관을 강점으로 살립니다.",
      "말, 정보, 기술, 경험을 거래 가능한 가치로 바꾸는 힘을 키우기 좋습니다.",
      "작은 수익 구조를 반복하면 재물운의 체감이 안정적으로 붙습니다.",
    ],
    marriageLine: [
      "관계선은 마음을 여는 속도와 약속의 무게를 스스로 조율하게 도와줍니다.",
      "거리감의 기준을 알면 급하게 확정하지 않아도 안정감을 만들 수 있습니다.",
      "상대 반응보다 내 마음의 기준을 먼저 세우는 힘이 관계운을 편하게 합니다.",
    ],
    mounts: [
      "손 형태와 손바닥 포인트를 함께 보면 성격, 일, 관계의 균형이 더 또렷해집니다.",
      "강한 포인트는 재능의 출구이고 옅은 포인트는 의식적으로 보완할 영역입니다.",
      "한 가지 선보다 전체 손의 분위기를 볼수록 현실적인 운의 방향이 깊어집니다.",
    ],
  };
  return map[key];
}

function cardCautionLines(key: NarrativeCardKey): string[] {
  const map: Record<NarrativeCardKey, string[]> = {
    lifeLine: [
      "기운이 남아 보여도 회복 시간을 미루면 흐름이 둔해질 수 있습니다.",
      "무리한 일정은 운을 빠르게 쓰는 방식이므로 속도 조절이 필요합니다.",
      "생활 리듬이 흔들릴 때는 큰 결정보다 기본 루틴을 먼저 세워야 합니다.",
    ],
    headLine: [
      "생각만 길어지면 좋은 타이밍을 놓칠 수 있습니다.",
      "확신이 부족할 때도 작은 실행으로 기준을 확인해야 합니다.",
      "혼자 결론을 굳히기보다 사실 확인을 먼저 하는 편이 좋습니다.",
    ],
    heartLine: [
      "상대 반응을 혼자 해석하면 마음이 먼저 지칠 수 있습니다.",
      "애정 표현을 아끼거나 몰아치면 관계 온도가 흔들릴 수 있습니다.",
      "좋아하는 마음과 불안한 마음을 구분해 보는 시간이 필요합니다.",
    ],
    fateLine: [
      "목표가 커질수록 하루 단위의 실행 기준이 필요합니다.",
      "방향을 자주 바꾸면 힘이 흩어질 수 있으니 기준 하나를 고정하세요.",
      "성과를 빨리 단정하기보다 쌓이는 흐름을 지켜봐야 합니다.",
    ],
    sunLine: [
      "보여주는 일만 앞서면 내실이 약해질 수 있습니다.",
      "반응에 지나치게 흔들리면 표현의 결이 흐려질 수 있습니다.",
      "나를 드러내는 방식은 화려함보다 지속성이 중요합니다.",
    ],
    moneyLine: [
      "한 번의 큰 기회만 기다리면 작은 돈 흐름을 놓칠 수 있습니다.",
      "수입보다 지출 기준이 흐리면 재물운의 체감이 약해집니다.",
      "확정 수익을 단정하기보다 관리 습관을 먼저 다듬어야 합니다.",
    ],
    marriageLine: [
      "관계 결과를 빨리 확정하려 하면 자연스러운 흐름이 막힐 수 있습니다.",
      "상대에게 맞추기만 하면 내 기준이 흐려질 수 있습니다.",
      "말하지 않은 기대는 오해가 되기 쉬워 확인 대화가 필요합니다.",
    ],
    mounts: [
      "강한 기질 하나만 밀면 균형이 무너질 수 있습니다.",
      "약한 흐름을 결핍으로 보지 말고 보완 지점으로 읽어야 합니다.",
      "전체 손의 분위기는 생활 습관에 따라 충분히 달라질 수 있습니다.",
    ],
  };
  return map[key];
}

function cardSevenDayPractice(key: NarrativeCardKey): string {
  const map: Record<NarrativeCardKey, string> = {
    lifeLine: "7일 동안 수면, 식사, 회복 시간을 한 줄로 기록해 기운이 살아나는 리듬을 찾으세요.",
    headLine: "7일 동안 중요한 선택마다 기준 1개와 실행 1개를 적어 판단 흐름을 선명하게 만드세요.",
    heartLine: "7일 동안 마음이 움직인 순간과 실제로 표현한 말을 나란히 적어 관계 온도를 확인하세요.",
    fateLine: "7일 동안 매일 같은 시간에 일의 핵심 행동 1개를 끝내 목표축을 단단히 세우세요.",
    sunLine: "7일 동안 나를 보여주는 작은 결과물 1개를 남겨 존재감의 결을 키우세요.",
    moneyLine: "7일 동안 지출을 목적별로 적고, 줄일 것 1개와 키울 가치 1개를 정하세요.",
    marriageLine: "7일 동안 관계에서 편안했던 순간과 불편했던 순간을 기록해 나의 약속 기준을 찾으세요.",
    mounts: "7일 동안 에너지, 감정, 일, 돈, 관계 중 가장 강했던 흐름을 하나씩 표시해 전체 균형을 보세요.",
  };
  return map[key];
}

function cardFromSection(input: {
  key: NarrativeCardKey;
  section: PalmNarrativeSection;
  purpose: PalmAnalysisPurpose;
  oneLiner: string;
  reading: PalmHandReading | null;
}): PalmNarrativeCard {
  const evidenceLines = cardEvidenceLines(input.key, input.reading);
  const details = uniqTop([
    ...evidenceLines,
    input.section.summary,
    input.section.detail,
  ], 6);
  const strengths = uniqTop(cardStrengthLines(input.key), 3);
  const cautions = uniqTop(cardCautionLines(input.key), 3);
  const todayAdvice = firstText(input.section.advice, evidenceLines[1]);

  return {
    key: input.key,
    title: CARD_TITLE_BY_KEY[input.key],
    oneLiner: input.oneLiner,
    details,
    strengths,
    cautions,
    todayAdvice,
    sevenDayPractice: cardSevenDayPractice(input.key),
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
    cardFromSection({ key: "lifeLine", section: healthSection, purpose, oneLiner: healthSection.summary, reading }),
    cardFromSection({ key: "headLine", section: personalitySection, purpose, oneLiner: personalitySection.summary, reading }),
    cardFromSection({ key: "heartLine", section: loveSection, purpose, oneLiner: loveSection.summary, reading }),
    cardFromSection({ key: "fateLine", section: careerSection, purpose, oneLiner: careerSection.summary, reading }),
    cardFromSection({ key: "sunLine", section: personalitySection, purpose, oneLiner: "사람들이 기억하는 나만의 분위기를 키우는 흐름이 좋아요.", reading }),
    cardFromSection({ key: "moneyLine", section: wealthSection, purpose, oneLiner: wealthSection.summary, reading }),
    cardFromSection({ key: "marriageLine", section: relationshipSection, purpose, oneLiner: relationshipSection.summary, reading }),
    cardFromSection({ key: "mounts", section: overallSection, purpose, oneLiner: overallSection.summary, reading }),
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
