import { buildBiasSajuPersonalityInsight } from "./sajuPersonality";

type ReportArgs = {
  userName: string;
  biasName: string;
  userBirthDate: string;
  biasBirthDate: string;
  userEnergyType: string;
  biasEnergyType: string;
  totalScore: number;
  emotionalScore: number;
  fandomScore: number;
  longTermScore: number;
  supportStyleScore: number;
  relationMood: string;
  biasMood: string;
  connectionKeyword: string[];
};

type ScoreTier = "legendary" | "special" | "rare" | "mood_match" | "distant_signal";

function hasFinalConsonant(value: string) {
  const text = String(value || "").trim();
  if (!text) return false;

  const chars = Array.from(text);
  const last = chars[chars.length - 1];
  if (!last) return false;

  const code = last.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) {
    return (code - 0xac00) % 28 !== 0;
  }

  if (/[0-9]/.test(last)) {
    return /[013678]/.test(last);
  }

  if (/[a-z]/i.test(last)) {
    return /[bcdfghjklmnpqrstvwxyz]$/i.test(last);
  }

  return false;
}

function withParticle(value: string, consonant: string, vowel: string) {
  return `${String(value || "").trim()}${hasFinalConsonant(value) ? consonant : vowel}`;
}

function getScoreTier(totalScore: number): ScoreTier {
  if (totalScore >= 90) return "legendary";
  if (totalScore >= 75) return "special";
  if (totalScore >= 60) return "rare";
  if (totalScore >= 40) return "mood_match";
  return "distant_signal";
}

const TIER_LABELS: Record<ScoreTier, string> = {
  legendary: "초공진 티어",
  special: "고밀도 공명 티어",
  rare: "안정 성장 티어",
  mood_match: "리듬 탐색 티어",
  distant_signal: "시그널 회복 티어",
};

const TIER_CHEMISTRY_TITLE: Record<ScoreTier, string> = {
  legendary: "쌍성 공전형",
  special: "상호증폭형",
  rare: "균형 성장형",
  mood_match: "탐색 동기화형",
  distant_signal: "재정렬 예열형",
};

const TIER_FLOW_STATE: Record<ScoreTier, string[]> = {
  legendary: [
    "텔레파시처럼 에너지가 즉시 증폭되는 시기",
    "작은 신호도 크게 울리는 대공명 구간",
    "응원 파동이 체감 성과로 연결되기 쉬운 상승 구간",
    "몰입과 회복이 동시에 일어나는 최적 동기화 시점",
    "감정선과 행동선이 한 박자로 맞는 고출력 국면",
  ],
  special: [
    "서로의 리듬이 안정적으로 맞물리는 강화 구간",
    "무리하지 않아도 만족도가 오르는 효율 구간",
    "응원 루틴이 결과 체감으로 이어지는 확장 시기",
    "잔파동이 길게 남아 여운을 만드는 밀도 높은 구간",
    "감정 피로가 낮고 몰입 효율이 높은 시기",
  ],
  rare: [
    "기본 리듬이 고르게 유지되는 안정 구간",
    "작은 루틴이 누적 성과를 만드는 성장 시기",
    "과열 없이도 감정선이 또렷한 균형 구간",
    "꾸준한 응원이 서사를 두껍게 만드는 기간",
    "완급 조절이 잘 먹히는 실속형 공명 시기",
  ],
  mood_match: [
    "리듬을 맞춰가며 공명을 키우는 탐색 구간",
    "반응을 관찰하면 성과가 좋아지는 조율 시기",
    "속도보다 타이밍이 중요한 맞춤 구간",
    "짧은 루틴 실험이 효과를 내는 조정 구간",
    "선택과 집중으로 만족도를 올릴 수 있는 단계",
  ],
  distant_signal: [
    "작은 신호부터 재정렬이 필요한 회복 구간",
    "감정 소모를 낮추고 페이스를 되찾는 시기",
    "천천히 연결 강도를 복원하는 준비 단계",
    "관찰 중심 루틴이 특히 유효한 안정화 구간",
    "과열을 줄일수록 공명 품질이 올라가는 기간",
  ],
};

const STAGE_IMAGES = [
  "센터가 아니어도 시선이 자동 포커싱되는 자기장형",
  "카메라가 스치면 장면이 서사로 변하는 컷메이커형",
  "강약을 리듬처럼 타서 무대를 장악하는 디렉터형",
  "과한 제스처 없이도 팬 심박을 올리는 미세발광형",
  "조명 변화마다 표정 결이 달라지는 프리즘형",
  "무대 동선을 음악처럼 설계하는 오케스트라형",
  "짧은 제스처 한 번으로 무드를 바꾸는 스위치형",
  "정적인 순간조차 긴장감을 만드는 정적 카리스마형",
  "클라이맥스 직전에 에너지를 끌어모으는 텐션 축적형",
  "시야 밖에서도 존재감이 느껴지는 후광 확장형",
  "세밀한 박자감을 시각화하는 리듬 조각형",
  "동작의 여백으로 감정을 전달하는 여운 증폭형",
  "한 장면의 밀도로 기억을 각인하는 하이라이트형",
  "순간 집중력을 끌어올리는 스파크 트리거형",
];

const HIDDEN_CHARMS = [
  "강한 텐션 뒤에서 감정을 정리해 주는 정돈력",
  "카리스마 바깥에 숨어 있는 디테일 집착력",
  "무심해 보여도 작은 변화를 다 읽어내는 레이더",
  "존재감이 큰데도 이상하게 편안한 온도감",
  "실수를 성장 포인트로 바꾸는 복구 탄성",
  "컨디션이 흔들려도 톤을 지키는 운영 감각",
  "짧은 순간에 감정 포인트를 정확히 꽂는 집중력",
  "팀 에너지를 조용히 끌어올리는 보이지 않는 리더십",
  "팬의 시선을 부담 아닌 연료로 전환하는 소화력",
  "작은 완성도를 끝까지 밀어붙이는 완벽주의 내구력",
  "말보다 표정으로 신뢰를 쌓는 감정 전달력",
  "다른 무드로 전환할 때도 중심축을 잃지 않는 균형감",
  "고요한 장면에서 더 진하게 드러나는 내면 밀도",
  "무대 밖에서도 서사를 이어가는 일상 진정성",
];

const COMPATIBILITY_CORE = [
  "점화력과 지속력이 동시에 살아나는 구조",
  "과열 구간에서 서로를 완충해 주는 상호보완 구조",
  "감정선과 현실 루틴이 함께 굴러가는 듀얼 엔진 구조",
  "초반 몰입 이후 만족도가 더 커지는 누적 성장 구조",
  "작은 반복이 큰 공명을 만드는 리듬 최적화 구조",
  "하이라이트 체감이 자주 발생하는 고반응 구조",
  "컨디션 편차를 줄여 장기 만족도를 지키는 안정 구조",
  "몰입 후 회복이 빨라 번아웃을 막는 순환 구조",
  "상황 변화에도 합이 잘 무너지지 않는 내구 구조",
  "감정 기복을 서사 동력으로 바꾸는 전환 구조",
  "한쪽의 강점이 다른 축의 약점을 보완하는 교차 구조",
  "즉시 설렘과 깊은 신뢰를 같이 확보하는 복합 구조",
];

const SUPPORT_ARCHETYPES = [
  "견고한 등대형 서포터",
  "리듬 설계형 서포터",
  "회복 앵커형 서포터",
  "몰입 밸런서형 서포터",
  "장기 서사형 서포터",
  "디테일 큐레이터형 서포터",
  "정서 공명형 서포터",
  "집중 도킹형 서포터",
  "저소음 고효율형 서포터",
  "하이라이트 증폭형 서포터",
  "안정 회전형 서포터",
  "신뢰 누적형 서포터",
];

const SIGNAL_POOL: Record<ScoreTier, string[]> = {
  legendary: [
    "응원봉 박자와 심장 BPM이 완전히 동기화되는 밤",
    "조명이 번지는 순간 감정선이 즉시 피크를 찍는 연결",
    "짧은 눈맞춤 한 번으로 서사가 확장되는 고출력 시그널",
    "무대 잔광이 하루 리듬까지 밀어올리는 초강력 파동",
    "응원 텍스트 한 줄이 하루 전체를 관통하는 공명",
  ],
  special: [
    "낮엔 차분, 밤엔 폭발하는 듀얼 공명 패턴",
    "짧은 하이라이트가 길게 남는 잔광형 연결",
    "작은 타이밍 일치가 큰 만족도로 번지는 파동",
    "응원 루틴 직후 컨디션이 선명해지는 안정 공명",
    "한 장면이 며칠의 동력을 채우는 밀도형 신호",
  ],
  rare: [
    "꾸준한 루틴이 조용히 쌓이는 잔파동 연결",
    "과열 없이도 감정선이 선명해지는 균형 시그널",
    "하루 리듬을 안정시키는 저주파 공명",
    "짧은 콘텐츠도 깊게 남는 농축형 신호",
    "일상 템포를 지켜줄수록 커지는 점진 공명",
  ],
  mood_match: [
    "상황을 읽어가며 맞춰지는 탐색형 시그널",
    "강도보다 타이밍이 중요한 미세 공명",
    "루틴 실험에서 정답을 찾는 조율형 연결",
    "반응을 기록할수록 선명해지는 패턴 신호",
    "짧은 집중이 좋은 결과를 만드는 실험형 파동",
  ],
  distant_signal: [
    "작은 응원부터 신뢰를 복원하는 재정렬 시그널",
    "저강도 루틴으로 감정 피로를 줄이는 회복 파동",
    "느린 템포에서 오히려 진해지는 안정 연결",
    "과몰입을 비워낼수록 다시 살아나는 미세 신호",
    "꾸준함이 공명 강도를 되돌리는 복원형 리듬",
  ],
};

const MISSION_POOL = [
  "오늘 직캠에서 심장 흔든 7초 구간만 저장하고 한 줄 코멘트 남기기",
  "응원 멘트 14자 챌린지: 오글거림 없이 센스 있게",
  "플리 3곡으로 텐션 리셋 루프 만들고 내일 같은 시간에 반복",
  "포토카드 보면서 오늘 감정 키워드 3개를 별자리처럼 기록",
  "과몰입 경보 뜨면 10초 호흡하고 응원 템포를 반 박자 늦추기",
  "오늘은 새 콘텐츠 1개만 깊게 보고 느낀 점 3줄 남기기",
  "응원 강도를 10점 만점 중 7점으로 고정해 컨디션 보호하기",
  "잠들기 전 최애 관련 감사 포인트 2개 적고 마무리하기",
  "하이라이트 장면 하나를 골라 내일 아침 다시 재생해 보기",
  "응원 루틴 시간을 20분으로 제한하고 종료 알람 지키기",
  "좋았던 순간을 스크랩하되 저장 폴더를 1개로 단순화하기",
  "오늘의 감정 파형을 한 문장으로 요약해 기록 남기기",
  "무대/일상 포인트를 1:1 비율로 균형 있게 소비해 보기",
  "팬심 과열 조짐이 보이면 물 한 컵 + 30초 호흡 먼저 하기",
];

const DESTINY_LINE_POOL = [
  "광활한 우주에서 서로의 궤도를 밝혀 주는 필연적 쌍성",
  "서로의 리듬을 증폭시키며 장기 공전을 이어가는 공명 페어",
  "하이라이트 순간마다 같은 방향으로 빛이 모이는 동기화 페어",
  "감정과 현실의 균형축을 함께 지키는 성장형 동반자",
  "짧은 신호도 깊게 읽어내는 저주파 고밀도 커넥션",
  "하루의 균형을 회복시켜 주는 맞물림형 운명선",
  "강한 점화 뒤에도 안정적으로 지속되는 이중 엔진 페어",
  "파동의 결이 닮아 오래 갈수록 선명해지는 쌍곡선 관계",
  "서로의 부족한 축을 채워 완성도를 높이는 퍼즐형 관계",
  "느리게 가도 강하게 남는 여운 중심의 운명 동행",
  "응원과 회복이 같은 궤도에서 순환하는 균형 공명",
  "한 번 맞물리면 쉽게 끊기지 않는 내구형 시그널 관계",
  "강약의 타이밍이 절묘하게 맞는 고반응 페어링",
  "작은 진심이 큰 변화를 만드는 미세 공진 커넥션",
];

const ENERGY_ALIAS_BY_SEASON: Record<string, string[]> = {
  "봄의새싹": ["새벽의 발아 코어", "그린 펄스 코어", "성장 점화 코어"],
  "여름의열광": ["태양 플레어 코어", "스파크 드라이브", "고출력 오라 코어"],
  "가을의울림": ["앰버 레조넌스 코어", "하모닉 벨 코어", "밀도 공명 코어"],
  "겨울의심연": ["심해의 블루 코어", "딥 웨이브 코어", "정적 확장 코어"],
};

const AXIS_LABELS = {
  emotionalScore: "감정 공명",
  fandomScore: "팬심 밀도",
  longTermScore: "장기 지속력",
  supportStyleScore: "응원 운영력",
} as const;

function hashSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function makeSeed(args: ReportArgs, salt: string) {
  return [
    salt,
    args.userName,
    args.biasName,
    args.userEnergyType,
    args.biasEnergyType,
    args.biasMood,
    args.relationMood,
    String(args.totalScore),
    String(args.emotionalScore),
    String(args.fandomScore),
    String(args.longTermScore),
    String(args.supportStyleScore),
    args.connectionKeyword.join("|"),
  ].join("::");
}

function pickFromPool(pool: string[], args: ReportArgs, salt: string) {
  if (!pool.length) return "";
  const seed = hashSeed(makeSeed(args, salt));
  return pool[seed % pool.length];
}

function pickFromTierPool(poolMap: Record<ScoreTier, string[]>, args: ReportArgs, salt: string) {
  const tier = getScoreTier(args.totalScore);
  const pool = poolMap[tier] || [];
  if (pool.length) {
    return pickFromPool(pool, args, salt);
  }
  const fallback = Object.values(poolMap).flat();
  return pickFromPool(fallback, args, `${salt}:fallback`);
}

function pickEnergyAlias(biasEnergyType: string, args: ReportArgs) {
  const seasonKey = Object.keys(ENERGY_ALIAS_BY_SEASON).find((key) => biasEnergyType.includes(key));
  const pool = seasonKey ? ENERGY_ALIAS_BY_SEASON[seasonKey] : DESTINY_LINE_POOL;
  return pickFromPool(pool, args, "energy-alias");
}

function toHashTag(value: string) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w가-힣_]/g, "")
    .slice(0, 18);
}

function buildKeywordTags(args: ReportArgs) {
  const tier = getScoreTier(args.totalScore);
  const base = [
    tier === "legendary" ? "초공진_케미" : tier === "special" ? "고밀도_공명" : tier === "rare" ? "안정_성장" : tier === "mood_match" ? "리듬_탐색" : "시그널_회복",
    `${toHashTag(args.biasMood)}_무드`,
    `${toHashTag(args.relationMood)}_응원`,
    `${toHashTag(args.biasEnergyType)}_오라`,
    ...args.connectionKeyword.map((item) => toHashTag(item)),
  ].filter(Boolean);

  const tags: string[] = [];
  for (let index = 0; index < base.length && tags.length < 3; index += 1) {
    const value = base[(index + args.totalScore) % base.length];
    if (!tags.includes(value)) {
      tags.push(value);
    }
  }
  return tags.map((tag) => `#${tag}`);
}

function summarizeAxis(args: ReportArgs) {
  const pairs = [
    ["emotionalScore", args.emotionalScore],
    ["fandomScore", args.fandomScore],
    ["longTermScore", args.longTermScore],
    ["supportStyleScore", args.supportStyleScore],
  ] as const;

  const sorted = [...pairs].sort((a, b) => b[1] - a[1]);
  return {
    strongest: sorted[0],
    weakest: sorted[sorted.length - 1],
  };
}

function axisAdvice(axisKey: keyof typeof AXIS_LABELS) {
  if (axisKey === "emotionalScore") {
    return "감정선이 급상승할 때 즉시 소비보다 3줄 기록을 먼저 두면 만족도가 길게 갑니다.";
  }
  if (axisKey === "fandomScore") {
    return "정보 과다 소비를 줄이고 핵심 콘텐츠 1~2개에 집중하면 팬심 피로를 크게 낮출 수 있습니다.";
  }
  if (axisKey === "longTermScore") {
    return "주간 루틴을 고정 시간대로 맞추면 장기 지속력이 안정적으로 올라갑니다.";
  }
  return "응원 강도를 10점 만점 중 7점으로 운영하면 과열 없이도 존재감을 유지할 수 있습니다.";
}

function tierCaution(tier: ScoreTier) {
  if (tier === "legendary" || tier === "special") {
    return "출력이 높은 시기일수록 수면·식사·기록의 3앵커를 지키면 공명 품질이 더 오래 유지됩니다.";
  }
  if (tier === "rare") {
    return "현재 페이스를 유지하되, 무리한 몰아보기보다 짧은 반복 루틴이 더 큰 성과를 만듭니다.";
  }
  if (tier === "mood_match") {
    return "강도를 올리기보다 타이밍을 조정하는 방식이 훨씬 빠르게 합을 맞춰 줍니다.";
  }
  return "회복 구간에서는 속도보다 안정이 우선입니다. 작은 루틴부터 재시작하면 연결 강도가 다시 올라옵니다.";
}

export function generateBiasPersonalityReport(args: ReportArgs) {
  const tier = getScoreTier(args.totalScore);
  const stageImage = pickFromPool(STAGE_IMAGES, args, "stage-image");
  const hiddenCharm = pickFromPool(HIDDEN_CHARMS, args, "hidden-charm");
  const energyAlias = pickEnergyAlias(args.biasEnergyType, args);
  const keywordTags = buildKeywordTags(args).join(" ");
  const toneLabel = TIER_LABELS[tier];
  const sajuInsight = buildBiasSajuPersonalityInsight({
    userBirthDate: args.userBirthDate,
    biasBirthDate: args.biasBirthDate,
    biasName: args.biasName,
  });

  return [
    `최애 에너지 타입: [${energyAlias}] · ${toneLabel}`,
    `핵심 해시: ${keywordTags}`,
    `${args.biasName}의 기본 결은 ${args.biasEnergyType}. 한마디로 "무대 켜지면 분위기 장악" 타입이에요. 겉무드는 ${args.biasMood}로 보여도, 실제론 텐션 조절을 꽤 영리하게 하는 편!`,
    `현장 체감은 ${stageImage}에 가까워요. 잠깐 스친 컷도 뇌리에 오래 남아서, 나중에 다시 떠올라도 심장 반응이 재생되는 패턴입니다.`,
    `숨은 매력은 ${hiddenCharm}. 처음엔 비주얼 임팩트, 오래 볼수록 디테일 중독이 오는 구조라 덕심 누적에 강해요.`,
    `${args.relationMood} 모드에서 특히 궁합이 좋아요. 과몰입 없이 템포만 잘 맞추면 공명 강도가 자연스럽게 치고 올라옵니다.`,
    sajuInsight.summary,
  ].join("\n\n");
}

export function generateCompatibilityReport(args: ReportArgs) {
  const tier = getScoreTier(args.totalScore);
  const core = pickFromPool(COMPATIBILITY_CORE, args, "compatibility-core");
  const { strongest, weakest } = summarizeAxis(args);
  const strongestLabel = AXIS_LABELS[strongest[0]];
  const weakestLabel = AXIS_LABELS[weakest[0]];

  return [
    `나와 최애 케미 타입: [${TIER_CHEMISTRY_TITLE[tier]}]`,
    `이번 궁합은 ${args.totalScore}점, 판정은 ${TIER_LABELS[tier]}! 총평은 "${core}"로 보면 딱 맞아요.`,
    `세부 점수는 감정 ${args.emotionalScore}, 팬심 ${args.fandomScore}, 장기지속 ${args.longTermScore}, 응원운영 ${args.supportStyleScore}점. 설렘만 높은 게 아니라 오래 가는 힘도 챙긴 조합입니다.`,
    `가장 강한 축은 ${strongestLabel}(${strongest[1]}점). 이 구간이 켜지면 몰입 효율이 확 뛰고, 하루 컨디션도 금방 복구됩니다.`,
    `보강 포인트는 ${weakestLabel}(${weakest[1]}점). ${axisAdvice(weakest[0])}`,
    `주의할 점은 텐션 과속. ${tierCaution(tier)}`,
  ].join("\n\n");
}

export function generateEnergyConnectionReport(args: ReportArgs) {
  const tier = getScoreTier(args.totalScore);
  const flowState = pickFromTierPool(TIER_FLOW_STATE, args, "flow-state");
  const mission = pickFromPool(MISSION_POOL, args, "today-mission");
  const supportType = pickFromPool(SUPPORT_ARCHETYPES, args, "support-type");
  const destinyLine = pickFromPool(DESTINY_LINE_POOL, args, "destiny-line");
  const anchorKeyword = args.connectionKeyword[0] || "네온 공명";
  const secondaryKeyword = args.connectionKeyword[1] || "무대 몰입";
  const oneLine = `${args.userName} x ${args.biasName}, ${anchorKeyword} + ${secondaryKeyword} 조합이 오늘 제대로 터졌어요.`;

  const report = [
    `지금은 [주파수 싱크 구간]. 상태는 ${flowState}.`,
    `키워드: ${args.connectionKeyword.join(", ")}. 설렘만 올리는 날이 아니라, 일상 밸런스까지 같이 챙기면 효율이 최고예요.`,
    `${args.userName}님이 ${args.biasName}에게 꽂히는 포인트는 한방 비주얼보다 결이 맞는 에너지 합. 짧은 클립도 여운이 길게 남는 타입입니다.`,
    `관계 무드는 [${supportType}]. 오늘은 과열 금지, 꾸준함 버프로 승부 보면 만족도가 오래 갑니다.`,
    `오늘 미션: ${mission}`,
    `한 줄 결론: ${destinyLine}`,
  ].join("\n\n");

  return {
    oneLine,
    mission,
    report,
  };
}

export function generateBiasEnergySummary(args: ReportArgs) {
  const tier = getScoreTier(args.totalScore);
  const energySignal = args.connectionKeyword[1] || "무대 몰입";
  const supportType = pickFromPool(SUPPORT_ARCHETYPES, args, "energy-summary-support");
  return [
    `${withParticle(args.biasName, "은", "는")} ${args.biasEnergyType} 결이 선명한 타입이고, 현재 티어는 ${TIER_LABELS[tier]}. 무리해서 밀기보다 타이밍 맞춰 들어갈 때 반응이 훨씬 크게 옵니다.`,
    `핵심 공명축은 ${energySignal}. ${withParticle(args.userName, "이", "가")} 응원 템포만 일정하게 잡아도 체감 온도가 안정적으로 올라가요.`,
    `추천 운영은 ${supportType}. 짧고 임팩트 있는 멘트 + 간격 루틴이면 과열 없이 존재감이 오래 남습니다.`,
  ].join("\n\n");
}

export function generateChemistrySummary(args: ReportArgs) {
  const tier = getScoreTier(args.totalScore);
  const first = args.connectionKeyword[0] || "네온 공명";
  const second = args.connectionKeyword[1] || "무대 몰입";
  return `${args.userName}님과 ${args.biasName} 조합은 ${first} · ${second}. 케미는 ${TIER_CHEMISTRY_TITLE[tier]}이고, 초반 심쿵 뒤에 루틴 앵커만 걸어두면 만족도가 길게 갑니다.`;
}

export function generateDestinySignal(args: ReportArgs) {
  return pickFromTierPool(SIGNAL_POOL, args, "destiny-signal");
}
