import { parseBirthDate } from "./birthEnergy";

type ElementKey = "wood" | "fire" | "earth" | "metal" | "water";

const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;

const STEM_META: Record<string, { ko: string; element: ElementKey; yinYang: "yang" | "yin" }> = {
  甲: { ko: "갑", element: "wood", yinYang: "yang" },
  乙: { ko: "을", element: "wood", yinYang: "yin" },
  丙: { ko: "병", element: "fire", yinYang: "yang" },
  丁: { ko: "정", element: "fire", yinYang: "yin" },
  戊: { ko: "무", element: "earth", yinYang: "yang" },
  己: { ko: "기", element: "earth", yinYang: "yin" },
  庚: { ko: "경", element: "metal", yinYang: "yang" },
  辛: { ko: "신", element: "metal", yinYang: "yin" },
  壬: { ko: "임", element: "water", yinYang: "yang" },
  癸: { ko: "계", element: "water", yinYang: "yin" },
};

const BRANCH_META: Record<string, { ko: string; element: ElementKey; hiddenStems: string[] }> = {
  子: { ko: "자", element: "water", hiddenStems: ["癸"] },
  丑: { ko: "축", element: "earth", hiddenStems: ["己", "癸", "辛"] },
  寅: { ko: "인", element: "wood", hiddenStems: ["甲", "丙", "戊"] },
  卯: { ko: "묘", element: "wood", hiddenStems: ["乙"] },
  辰: { ko: "진", element: "earth", hiddenStems: ["戊", "乙", "癸"] },
  // 🔴 巳 는 본기 丙 → 중기 庚 → 여기 戊 다(2026-08-28 정정). 정본 lib/saju/myeongri-tables.js 의
  // ZHI_HIDE_GAN 과 같은 순서이며, 여기서는 지장간마다 가중치가 같아 순서만 바뀌고 값은 안 움직인다.
  巳: { ko: "사", element: "fire", hiddenStems: ["丙", "庚", "戊"] },
  午: { ko: "오", element: "fire", hiddenStems: ["丁", "己"] },
  未: { ko: "미", element: "earth", hiddenStems: ["己", "丁", "乙"] },
  申: { ko: "신", element: "metal", hiddenStems: ["庚", "壬", "戊"] },
  酉: { ko: "유", element: "metal", hiddenStems: ["辛"] },
  戌: { ko: "술", element: "earth", hiddenStems: ["戊", "辛", "丁"] },
  亥: { ko: "해", element: "water", hiddenStems: ["壬", "甲"] },
};

const ELEMENT_LABELS: Record<ElementKey, string> = {
  wood: "목",
  fire: "화",
  earth: "토",
  metal: "금",
  water: "수",
};

const GENERATE_TO: Record<ElementKey, ElementKey> = {
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood",
};

const CONTROL_TO: Record<ElementKey, ElementKey> = {
  wood: "earth",
  fire: "metal",
  earth: "water",
  metal: "wood",
  water: "fire",
};

function mod(value: number, by: number) {
  return ((value % by) + by) % by;
}

function toJdn(year: number, month: number, day: number) {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524;
}

function getDayPillar(year: number, month: number, day: number) {
  const jdn = toJdn(year, month, day);
  const stem = STEMS[mod(jdn + 9, 10)];
  const branch = BRANCHES[mod(jdn + 1, 12)];
  return { stem, branch };
}

function getYearPillar(year: number, month: number, day: number) {
  const adjustedYear = month < 2 || (month === 2 && day < 4) ? year - 1 : year;
  const stem = STEMS[mod(adjustedYear - 4, 10)];
  const branch = BRANCHES[mod(adjustedYear - 4, 12)];
  return { stem, branch };
}

function addElementScore(target: Record<ElementKey, number>, element: ElementKey, weight: number) {
  target[element] += weight;
}

function buildElementScores(yearStem: string, yearBranch: string, dayStem: string, dayBranch: string) {
  const scores: Record<ElementKey, number> = {
    wood: 0,
    fire: 0,
    earth: 0,
    metal: 0,
    water: 0,
  };

  addElementScore(scores, STEM_META[yearStem].element, 1.0);
  addElementScore(scores, BRANCH_META[yearBranch].element, 0.8);
  for (const stem of BRANCH_META[yearBranch].hiddenStems) {
    addElementScore(scores, STEM_META[stem].element, 0.3);
  }

  addElementScore(scores, STEM_META[dayStem].element, 1.4);
  addElementScore(scores, BRANCH_META[dayBranch].element, 0.9);
  for (const stem of BRANCH_META[dayBranch].hiddenStems) {
    addElementScore(scores, STEM_META[stem].element, 0.4);
  }

  const sorted = (Object.keys(scores) as ElementKey[])
    .map((key) => ({ key, score: scores[key] }))
    .sort((a, b) => b.score - a.score);

  return {
    scores,
    strongest: sorted[0]?.key || "earth",
    weakest: sorted[sorted.length - 1]?.key || "earth",
  };
}

function relationBetween(from: ElementKey, to: ElementKey) {
  if (from === to) return "same";
  if (GENERATE_TO[from] === to) return "generates";
  if (GENERATE_TO[to] === from) return "generated_by";
  if (CONTROL_TO[from] === to) return "controls";
  if (CONTROL_TO[to] === from) return "controlled_by";
  return "neutral";
}

function relationLabel(from: ElementKey, to: ElementKey) {
  const relation = relationBetween(from, to);
  if (relation === "same") return "같은 결의 공명";
  if (relation === "generates") return "상생 추진형";
  if (relation === "generated_by") return "보호 수용형";
  if (relation === "controls") return "주도 실행형";
  if (relation === "controlled_by") return "훈련 성장형";
  return "중립 탐색형";
}

function dayMasterTone(stem: string) {
  const meta = STEM_META[stem];
  if (!meta) {
    return "흐름을 읽고 상황에 맞춰 템포를 조정하는 타입";
  }

  const yinYangLabel = meta.yinYang === "yang" ? "양" : "음";
  const elementLabel = ELEMENT_LABELS[meta.element];

  if (meta.element === "wood") {
    return `${yinYangLabel}${elementLabel} 일간 성향으로, 성장 욕구와 방향성이 분명하고 목표를 잡으면 밀고 나가는 힘이 강해요.`;
  }
  if (meta.element === "fire") {
    return `${yinYangLabel}${elementLabel} 일간 성향으로, 감정 표현과 현장 반응이 빠르며 분위기 점화 능력이 좋아요.`;
  }
  if (meta.element === "earth") {
    return `${yinYangLabel}${elementLabel} 일간 성향으로, 안정감과 책임감이 강하고 관계를 오래 유지하는 내구력이 좋아요.`;
  }
  if (meta.element === "metal") {
    return `${yinYangLabel}${elementLabel} 일간 성향으로, 판단이 선명하고 디테일 완성도를 끌어올리는 집중력이 좋아요.`;
  }
  return `${yinYangLabel}${elementLabel} 일간 성향으로, 감수성과 공감 능력이 높고 흐름 변화에 유연하게 적응해요.`;
}

function elementAdvice(strongest: ElementKey, weakest: ElementKey) {
  const strongestLabel = ELEMENT_LABELS[strongest];
  const weakestLabel = ELEMENT_LABELS[weakest];

  if (strongest === "fire") {
    return `강한 ${strongestLabel} 기운으로 스타성 발현은 빠르지만, ${weakestLabel} 기운 보완(루틴·휴식·리듬 고정)을 하면 컨디션 편차를 줄일 수 있어요.`;
  }
  if (strongest === "water") {
    return `강한 ${strongestLabel} 기운으로 감정 파동 감지가 뛰어나고, ${weakestLabel} 기운 보완(즉시 실행 포인트 설정)을 하면 성과 체감이 빨라져요.`;
  }
  if (strongest === "metal") {
    return `강한 ${strongestLabel} 기운으로 완성도와 선별력이 뛰어나며, ${weakestLabel} 기운 보완(유연한 감정 표현)이 관계 온도를 더 높여줘요.`;
  }
  if (strongest === "wood") {
    return `강한 ${strongestLabel} 기운으로 확장성과 성장 동력이 크고, ${weakestLabel} 기운 보완(페이스 조절)을 하면 장기 리듬이 더 안정돼요.`;
  }
  return `강한 ${strongestLabel} 기운으로 중심축을 지키는 힘이 좋고, ${weakestLabel} 기운 보완(새로운 자극·표현)을 하면 입체감이 더 살아나요.`;
}

export function buildBiasSajuPersonalityInsight(params: {
  userBirthDate: string;
  biasBirthDate: string;
  biasName: string;
}) {
  const user = parseBirthDate(params.userBirthDate);
  const bias = parseBirthDate(params.biasBirthDate);

  const userDay = getDayPillar(user.year, user.month, user.day);
  const biasDay = getDayPillar(bias.year, bias.month, bias.day);
  const biasYear = getYearPillar(bias.year, bias.month, bias.day);

  const userDayElement = STEM_META[userDay.stem].element;
  const biasDayElement = STEM_META[biasDay.stem].element;
  const relation = relationLabel(userDayElement, biasDayElement);

  const elementProfile = buildElementScores(biasYear.stem, biasYear.branch, biasDay.stem, biasDay.branch);
  const strongestLabel = ELEMENT_LABELS[elementProfile.strongest];
  const weakestLabel = ELEMENT_LABELS[elementProfile.weakest];

  const dayMasterLabel = `${biasDay.stem}${STEM_META[biasDay.stem].ko}${ELEMENT_LABELS[biasDayElement]}`;
  const yearLabel = `${biasYear.stem}${BRANCH_META[biasYear.branch].ko}`;
  const dayLabel = `${biasDay.stem}${BRANCH_META[biasDay.branch].ko}`;

  const summary = [
    `[사주 심화 성향] ${params.biasName}의 핵심 일간은 ${dayMasterLabel} (${dayLabel}일주)로 읽혀요.`,
    `연주 ${yearLabel} 기운까지 합산하면 ${strongestLabel} 기운이 중심축이고, ${weakestLabel} 기운은 의식적으로 보완할수록 성향 장점이 더 선명해집니다.`,
    dayMasterTone(biasDay.stem),
    elementAdvice(elementProfile.strongest, elementProfile.weakest),
    `나와 최애의 일간 오행 관계는 ${relation}에 가까워, 대화나 응원 템포를 맞출 때 이 축이 체감 케미를 크게 좌우해요.`,
  ].join("\n\n");

  return {
    summary,
    profile: {
      dayMasterLabel,
      dayPillar: `${biasDay.stem}${biasDay.branch}`,
      yearPillar: `${biasYear.stem}${biasYear.branch}`,
      strongestElement: strongestLabel,
      weakestElement: weakestLabel,
      relation,
    },
  };
}
