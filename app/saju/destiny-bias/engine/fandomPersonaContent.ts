// 「빠순사주」 덕질 성향 콘텐츠 텍스트 풀 (LLM 미사용 · 정적 생성)
// 톤: favoriteDestinyContent.ts 와 동일 — 다정한 존댓말 + 팬덤 언어. 오행/십성 원문은 절대 노출하지 않고
// tenGodGroup 등 내부 분기 키로만 쓴다. "사주상 ~때문" 반복, 100%/무조건 단정, 랜덤 생성을 금지한다.

import { josa } from "./favoriteDestinyContent";

export type TenGodGroup = "mirror" | "muse" | "realist" | "growth" | "shelter";

const TEN_GOD_GROUP_MAP: Record<string, TenGodGroup> = {
  비견: "mirror",
  겁재: "mirror",
  식신: "muse",
  상관: "muse",
  편재: "realist",
  정재: "realist",
  편관: "growth",
  정관: "growth",
  편인: "shelter",
  정인: "shelter",
};

export function tenGodGroup(tenGod: string): TenGodGroup {
  return TEN_GOD_GROUP_MAP[tenGod] || "shelter";
}

function hasCharmKeyword(charmSignals: string[], keyword: string) {
  return charmSignals.some((signal) => signal.includes(keyword));
}

// ① 나의 덕질 체질
const CHARACTER_MODIFIER: Record<TenGodGroup, { label: string; clause: string }> = {
  mirror: { label: "동질형", clause: "이유는 잘 몰라도 '어 저거 나잖아' 싶으면 이미 마음이 넘어가 있는 편이라," },
  muse: { label: "직진형", clause: "꽂히는 순간 이유를 따지지 않고 바로 행동부터 나가는 편이라," },
  realist: { label: "선택형", clause: "괜히 끌리는 것보다 이 정도면 믿을 만하다는 확신이 서야 움직이는 편이라," },
  growth: { label: "관찰형", clause: "지켜보다가 확실해졌다 싶을 때 훅 들어가는 편이라," },
  shelter: { label: "루틴형", clause: "화력을 크게 내세우진 않아도 한번 자리 잡으면 잘 안 흔들리는 편이라," },
};

type CharacterBase = "몰입" | "지속" | "교감";

function characterBaseFromScores(scores: {
  emotion: number;
  excitement: number;
  stability: number;
  fanBias: number;
  longTerm: number;
  communication: number;
}): CharacterBase {
  const axes: Array<[CharacterBase, number]> = [
    ["몰입", Math.max(scores.excitement, scores.fanBias)],
    ["지속", Math.max(scores.stability, scores.longTerm)],
    ["교감", Math.max(scores.emotion, scores.communication)],
  ];
  return axes.sort((a, b) => b[1] - a[1])[0][0];
}

const CHARACTER_BASE_CLAUSE: Record<CharacterBase, string> = {
  몰입: "한번 스위치가 켜지면 텐션이 확 올라가는 타입이에요.",
  지속: "화력을 크게 티 내지 않아도 꾸준함으로 오래 버티는 타입이에요.",
  교감: "일방적으로 좋아하기보다 주고받는 느낌이 있어야 편한 타입이에요.",
};

export function buildBiasCharacter(params: {
  group: TenGodGroup;
  scores: Parameters<typeof characterBaseFromScores>[0];
  favName: string;
}): { title: string; oneLiner: string } {
  const modifier = CHARACTER_MODIFIER[params.group];
  const base = characterBaseFromScores(params.scores);
  const title = `${modifier.label} ${base}덕후`;
  const oneLiner = `${modifier.clause} ${CHARACTER_BASE_CLAUSE[base]} ${josa(params.favName, "을를")} 볼 때도 이 결이 그대로 나와요.`;
  return { title, oneLiner };
}

// ② 입덕 유형
export function buildEntryType(params: {
  dayMasterRelation: string;
  charmSignals: string[];
  conflictSignals: string[];
  longTermSignals: string[];
  excitement: number;
  favName: string;
}): { type: string; text: string } {
  const { dayMasterRelation, charmSignals, conflictSignals, longTermSignals, excitement, favName } = params;

  if (charmSignals.length >= 1 && excitement >= 72) {
    return {
      type: "번개입덕형",
      text: `스크롤하다 멈추는 게 아니라 손이 먼저 저장 버튼을 누르는 타입이에요. ${josa(favName, "이가")} 딱 그런 순간을 만들어준 셈이죠. 이유는 나중에 붙어요 ⚡`,
    };
  }

  if (dayMasterRelation.includes("상생") || longTermSignals.length >= 1) {
    return {
      type: "서서히스며듦형",
      text: `처음엔 '그냥 좋다' 정도였는데, ${favName}의 자잘한 순간들이 하나씩 쌓이다 어느 날 보니 최애가 되어 있는 편이에요.`,
    };
  }

  if ((dayMasterRelation.includes("주도형") || dayMasterRelation.includes("훈련형")) && conflictSignals.length >= 2) {
    return {
      type: "밀당검증형",
      text: `처음엔 '내 스타일 아닌데' 했다가도, 몇 번 부딪히고 나서야 진짜다 싶어지는 편이에요. ${favName}도 검증을 거치고 나서야 마음을 열었을 거예요.`,
    };
  }

  return {
    type: "역주행입덕형",
    text: `처음엔 그냥 스쳐 지나갔는데, 뒤늦게 ${josa(favName, "이가")} 다시 보인 순간부터 급발진하는 편이에요. 남들보다 입덕이 항상 한 박자 늦어요.`,
  };
}

// ③ 취향 — 첫끌림 / 오래가는 이유
export function buildTasteFirstAttraction(params: { charmSignals: string[]; scores: { excitement: number; stability: number }; favName: string }): string {
  const { charmSignals, scores, favName } = params;
  if (hasCharmKeyword(charmSignals, "도화")) {
    return `${favName}의 화려함, 눈에 확 들어오는 텐션에 먼저 낚였어요.`;
  }
  if (hasCharmKeyword(charmSignals, "화개")) {
    return `말로 설명하기 어려운 분위기, ${josa(favName, "이가")} 가진 살짝 신비로운 여백에 먼저 끌렸어요.`;
  }
  // excitement 중앙값(약 72) 기준 — 두 축을 서로 비교하지 않는다. excitement가 stability보다
  // 구조적으로 늘 높게 나오는 점수식 특성상, 상대 비교로 가르면 한쪽 문장이 사실상 안 나온다.
  if (scores.excitement >= 72) {
    return `화려함보다 직접적인 텐션, 눈에 확 들어오는 순간에 먼저 반응했어요.`;
  }
  return `텐션보다 볼수록 편안하게 스며드는 느낌, 안정감 있는 쪽에 먼저 반응했어요.`;
}

const TASTE_LONG_TERM_REASON: Record<TenGodGroup, string> = {
  mirror: "취향이나 결이 나랑 겹치는 부분이 계속 보여서예요. 동질감이 오래가는 힘이 되는 편이죠.",
  muse: "볼 때마다 표현이 계속 새로워져서예요. 질릴 틈을 안 줘요.",
  realist: "겉멋보다 실속 있게 행보를 쌓아가는 게 보여서예요. 믿음이 오래가는 힘이 되는 편이죠.",
  growth: "가만히 있지 않고 계속 나아지는 게 보여서예요. 성장하는 모습이 오래가는 힘이 되는 편이죠.",
  shelter: "특별한 이벤트가 없어도 채워지는 안정감 때문이에요. 편안함이 오래가는 힘이 되는 편이죠.",
};

export function buildTasteLongTermReason(params: { group: TenGodGroup; favName: string }): string {
  return `${josa(params.favName, "을를")} 오래 좋아하게 만드는 건 ${TASTE_LONG_TERM_REASON[params.group]}`;
}

// ④ 덕질 방식 / 정보 수집 유형
export function buildDeepDivePattern(params: {
  scores: { excitement: number; communication: number; stability: number };
  harmonySignals: string[];
}): { type: string; text: string } {
  const { scores, harmonySignals } = params;

  if (scores.excitement >= 77) {
    return {
      type: "실시간반응형",
      text: "라이브·댓글창에서 실시간으로 반응하는 걸 제일 좋아해요. 지나간 자료보다 지금 이 순간이 중요한 타입이죠.",
    };
  }
  if (scores.communication >= 53 && scores.stability >= 55) {
    return {
      type: "아카이브형",
      text: "짤이랑 영상은 일단 다 저장해두고 나중에 정주행하는 타입이에요. 폴더 용량이 곧 애정의 크기죠.",
    };
  }
  if (scores.communication < 40) {
    return {
      type: "직관몰입형",
      text: "분석보다 그냥 느낌으로 좋은 걸 먼저 알아채는 편이에요. 이유는 나중에 천천히 붙어요.",
    };
  }
  if (scores.communication >= 53 && harmonySignals.length >= 1) {
    return {
      type: "커뮤니티확산형",
      text: "혼자 조용히 좋아하기보다 같이 덕질할 사람을 찾는 편이에요. 감상을 나눌 때 애정이 더 커져요.",
    };
  }
  return {
    type: "기록수집형",
    text: "본 것들을 하나씩 기록해두고, 나중에 꺼내보면서 다시 곱씹는 타입이에요.",
  };
}

// ⑤ 관계성 유형
export function buildRelationshipLens(params: {
  group: TenGodGroup;
  branchKinds: string[];
  charmSignals: string[];
}): { type: string; text: string } {
  const { group, branchKinds, charmSignals } = params;

  if (branchKinds.includes("harmony") && branchKinds.includes("clash")) {
    return {
      type: "서사관찰형",
      text: "둘이 만들어내는 케미 자체가 콘텐츠예요. 그 사람 하나보다 관계 속에서 보이는 모습에 더 오래 붙잡히는 편이죠.",
    };
  }
  if (hasCharmKeyword(charmSignals, "화개") || hasCharmKeyword(charmSignals, "귀문")) {
    return {
      type: "페어링형",
      text: "짝을 지어 놨을 때 생기는 여백과 신비로움을 즐기는 편이에요. 상상할 거리가 있어야 재밌어져요.",
    };
  }
  if ((group === "realist" || group === "shelter") && branchKinds.length === 0) {
    return {
      type: "인물중심형",
      text: "그 사람 자체가 최애지, 누구랑 있느냐엔 크게 영향받지 않는 편이에요.",
    };
  }
  return {
    type: "동료관찰형",
    text: "혼자보다 곁에 있는 사람들과 어떻게 지내는지를 은근히 신경 쓰는 편이에요.",
  };
}

// ⑥ 과몰입 포인트
const OBSESSION_BASE: Record<TenGodGroup, { type: string; text: string }> = {
  mirror: { type: "공감포인트형", text: "나랑 닮았다 싶은 포인트, 공감되는 순간에서 크게 반응해요." },
  muse: { type: "디테일포착형", text: "표현력이나 무대 위 디테일, 특히 작은 표정 변화에서 훅 꽂혀요." },
  realist: { type: "실속중시형", text: "화려한 이벤트보다 비하인드나 실제 행보의 실속에서 더 크게 반응해요." },
  growth: { type: "성장서사형", text: "가만히 있지 않고 나아지는 모습, 노력하는 과정 자체에서 크게 무너져요." },
  shelter: { type: "분위기몰입형", text: "목소리 톤이나 분위기처럼 은근한 것에서 훅 꽂혀요." },
};

export function buildObsessionPoint(params: { group: TenGodGroup; charmSignals: string[] }): { type: string; text: string } {
  const base = OBSESSION_BASE[params.group];
  const prefix = hasCharmKeyword(params.charmSignals, "도화")
    ? "텐션이 확 오르는 순간엔 특히, "
    : hasCharmKeyword(params.charmSignals, "화개")
      ? "설명하기 애매한 여백의 순간엔 특히, "
      : "";
  return { type: base.type, text: `${prefix}${base.text}` };
}

// ⑦ 덕질 지속력 — 강도 × 기간
export function buildPersistence(params: {
  scores: { excitement: number; fanBias: number; longTerm: number; stability: number };
}): { intensity: string; duration: string; text: string } {
  const { scores } = params;
  const intensity = scores.excitement >= 72 || scores.fanBias >= 61 ? "강한몰입형" : "잔잔지속형";
  const duration = scores.longTerm >= 64 && scores.stability >= 55 ? "오래가는형" : "리듬변화형";

  const TEXT: Record<string, string> = {
    "강한몰입형|오래가는형": "처음부터 풀파워로 들어가는데, 신기하게 그 텐션이 그대로 오래 가는 편이에요.",
    "강한몰입형|리듬변화형": "처음엔 확 붙어서 몰아치듯 좋아하다가도, 또 한동안 잠잠해지는 걸 반복해요. 온도차가 큰 편이죠.",
    "잔잔지속형|오래가는형": "화력을 크게 티 내지 않아도, 마음속에서는 제일 오래 남는 편이에요. 조용히 버티는 타입이죠.",
    "잔잔지속형|리듬변화형": "평소엔 잔잔하다가도 어떤 계기가 오면 확 타오르고, 다시 가라앉기를 반복해요. 파도 같은 온도예요.",
  };

  return { intensity, duration, text: TEXT[`${intensity}|${duration}`] };
}

// ⑧ 탈덕 이유 / 방식
export function buildDetachmentReason(params: {
  group: TenGodGroup;
  conflictSignals: string[];
  harmonySignals: string[];
  elementGap: number;
  scores: { stability: number; longTerm: number };
}): { type: string; text: string } {
  const { group, conflictSignals, harmonySignals, elementGap, scores } = params;

  if (conflictSignals.length >= 2 && scores.stability < 55) {
    return {
      type: "실망누적형",
      text: "작은 실망이 반복해서 쌓이다가 어느 순간 마음이 정리되는 편이에요. '싫어져서' 멀어지는 쪽에 가까워요.",
    };
  }
  if (group === "growth" && scores.longTerm < 60) {
    return {
      type: "동력소진형",
      text: "싫어지는 게 아니라 더 설렐 이유가 안 생겨서예요. 새로 발견할 게 없어지면 자연히 관심이 옅어져요.",
    };
  }
  if (elementGap >= 0.9) {
    return {
      type: "채움부족형",
      text: "결정적으로 실망하는 사건이 있다기보다, 계속 아쉬운 지점이 남아서 조금씩 마음이 빠지는 편이에요.",
    };
  }
  if (harmonySignals.length >= 1 && scores.longTerm >= 64) {
    return {
      type: "권태희박형",
      text: "탈덕 계기가 잘 안 보이는 편이에요. 어지간해선 마음이 잘 안 식어요.",
    };
  }
  return {
    type: "무드전환형",
    text: "결정적 계기 없이도, 관심이 자연스럽게 다른 곳으로 옮겨가면서 서서히 멀어지는 편이에요.",
  };
}

export function buildDetachmentStyle(params: {
  scores: { excitement: number; communication: number; stability: number };
}): { type: string; text: string } {
  const { scores } = params;

  if (scores.excitement >= 72 && scores.communication >= 48) {
    return {
      type: "선언형",
      text: "실망이 쌓이면 조용히 넘어가기보다, 정리하는 마음을 한 번은 남기고 가는 편이에요.",
    };
  }
  if (scores.communication < 40) {
    return {
      type: "조용한정리형",
      text: "티 내지 않고 말없이 관심 빈도가 줄어드는 편이에요. 주변에서는 탈덕한지도 잘 몰라요.",
    };
  }
  if (scores.stability >= 58) {
    return {
      type: "거리두기형",
      text: "완전히 정리하기보다 빈도만 확 줄이는 편이에요. 아예 끊기보다 멀찍이 두는 쪽이죠.",
    };
  }
  return {
    type: "쿨한전환형",
    text: "미련을 오래 끌기보다, 관심이 옮겨가면 깔끔하게 다음으로 넘어가는 편이에요.",
  };
}

// ⑨ 최종 결론
const PHILOSOPHY_WORD: Record<TenGodGroup, string> = {
  mirror: "공감",
  muse: "신선함",
  realist: "진정성",
  growth: "성장",
  shelter: "안정감",
};

const PERSISTENCE_CLOSING: Record<string, string> = {
  "강한몰입형|오래가는형": "처음부터 세게 붙는데 그 텐션이 오래 가기까지 하니, 한번 최애로 정하면 웬만해선 안 흔들려요.",
  "강한몰입형|리듬변화형": "다만 온도차가 있는 편이라, 잠잠한 시기가 와도 그게 끝이 아니라 리듬이라는 걸 알아두면 편해요.",
  "잔잔지속형|오래가는형": "화력을 크게 안 드러내도 마음속에서는 제일 오래 남는 쪽이라, 남들 눈엔 안 보여도 진심은 진심이에요.",
  "잔잔지속형|리듬변화형": "평소엔 잔잔하다가 계기가 오면 확 타오르는 파도형이라, 그 파도를 즐길 줄 알면 덕질이 훨씬 편해져요.",
};

export function buildFinalPhilosophy(params: { group: TenGodGroup; intensity: string; duration: string; favName: string }): string {
  const word = PHILOSOPHY_WORD[params.group];
  const closing = PERSISTENCE_CLOSING[`${params.intensity}|${params.duration}`] || "";
  return `결국 너는 완벽해서 ${josa(params.favName, "을를")} 좋아하는 게 아니라, 계속 ${word}을 발견할 수 있어서 좋아하는 사람에 가까워요. ${closing} 그래서 네 덕질에서 제일 중요한 건 '완벽함'이 아니라 '${word}'이에요.`;
}
