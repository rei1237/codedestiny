// 최애운명 결과 콘텐츠 텍스트 풀 (LLM 미사용 · 정적 생성)
// 톤: 다정한 명리학자의 존댓말. 전문용어는 첫 등장 시 쉬운 말로 풀고 이후 쉬운 표현 사용.
// 충/형/상극도 반드시 긍정적으로 재해석. 단정("~할 운명") 대신 "~한 흐름/기운".

export type ContentElementKey = "wood" | "fire" | "earth" | "metal" | "water";

// user(나) 일간 기준 최애 일간과의 오행 관계
export type ElementRelation = "same" | "generates" | "generated_by" | "controls" | "controlled_by";

export const BOTTOM_NOTICE = "이 콘텐츠는 전통 명리학을 재미있게 재해석한 엔터테인먼트입니다 🌙";

type ElementInfo = {
  ko: string; // 목/화/토/금/수
  han: string; // 木/火/土/金/水
  emoji: string;
  nature: string; // "쭉쭉 뻗는 나무" — 자연 비유 명사구
  easy: string; // "성장하는 기운" — 쉬운 대체 표현
  gloss: string; // 첫 등장 시 풀이
  color: string; // 부스터 색
  numbers: string; // 부스터 숫자
  direction: string; // 부스터 방향
};

export const ELEMENT_INFO: Record<ContentElementKey, ElementInfo> = {
  wood: {
    ko: "목",
    han: "木",
    emoji: "🌿",
    nature: "쭉쭉 뻗어 올라가는 나무",
    easy: "성장하는 기운",
    gloss: "목(木) — 나무처럼 위로 자라며 뻗어 나가는 기운",
    color: "초록색·연둣빛",
    numbers: "3, 8이 붙는 숫자",
    direction: "동쪽",
  },
  fire: {
    ko: "화",
    han: "火",
    emoji: "🔥",
    nature: "환하게 타오르는 불",
    easy: "뜨거운 기운",
    gloss: "화(火) — 불처럼 밝고 뜨겁게 타오르는 기운",
    color: "빨간색·주황빛",
    numbers: "2, 7이 붙는 숫자",
    direction: "남쪽",
  },
  earth: {
    ko: "토",
    han: "土",
    emoji: "🪨",
    nature: "넓게 품어 안는 흙",
    easy: "든든한 기운",
    gloss: "토(土) — 흙처럼 감싸 안고 중심을 잡아주는 기운",
    color: "노란색·황금빛",
    numbers: "5, 0이 붙는 숫자",
    direction: "남서쪽",
  },
  metal: {
    ko: "금",
    han: "金",
    emoji: "✨",
    nature: "단단하게 벼려진 쇠",
    easy: "야무진 기운",
    gloss: "금(金) — 쇠처럼 단단하고 야무지게 마무리하는 기운",
    color: "흰색·은색",
    numbers: "4, 9가 붙는 숫자",
    direction: "서쪽",
  },
  water: {
    ko: "수",
    han: "水",
    emoji: "🌊",
    nature: "유연하게 흐르는 물",
    easy: "유연한 기운",
    gloss: "수(水) — 물처럼 깊고 유연하게 흐르는 기운",
    color: "파란색·검은빛",
    numbers: "1, 6이 붙는 숫자",
    direction: "북쪽",
  },
};

// 상생: 낳아주는 쪽 → 받는 쪽 비유 (from이 to를 키움)
const GENERATE_METAPHOR: Record<string, string> = {
  "wood>fire": "나무가 불을 살려내듯",
  "fire>earth": "타고 남은 재가 흙을 기름지게 하듯",
  "earth>metal": "흙이 금을 품어 길러내듯",
  "metal>water": "차가운 쇠에 물방울이 맺히듯",
  "water>wood": "물이 나무를 쑥쑥 키우듯",
};

// 상극: 다스리는 쪽 → 받는 쪽 (긍정 재해석)
const CONTROL_METAPHOR: Record<string, string> = {
  "wood>earth": "나무 뿌리가 흙을 단단히 붙잡아 주듯",
  "earth>water": "흙이 물길을 잡아 넘치지 않게 하듯",
  "water>fire": "물이 불의 열기를 식혀 더 오래 타게 하듯",
  "fire>metal": "불이 쇠를 녹여 새 모양을 빚어내듯",
  "metal>wood": "잘 벼린 날이 나무를 다듬어 모양을 잡아주듯",
};

function gen(fromEl: ContentElementKey, toEl: ContentElementKey) {
  return GENERATE_METAPHOR[`${fromEl}>${toEl}`] || "서로의 기운을 북돋우듯";
}
function ctrl(fromEl: ContentElementKey, toEl: ContentElementKey) {
  return CONTROL_METAPHOR[`${fromEl}>${toEl}`] || "서로 다른 결이 팽팽하게 맞물리듯";
}

// 오행 관계 표기 (수생목, 화극금 등)
function relationNotation(userEl: ContentElementKey, favEl: ContentElementKey, relation: ElementRelation) {
  const u = ELEMENT_INFO[userEl].ko;
  const f = ELEMENT_INFO[favEl].ko;
  if (relation === "generates") return `${u}생${f}(${u}生${f})`;
  if (relation === "generated_by") return `${f}생${u}(${f}生${u})`;
  if (relation === "controls") return `${u}극${f}(${u}克${f})`;
  if (relation === "controlled_by") return `${f}극${u}(${f}克${u})`;
  return `같은 ${u} 기운`;
}

// ① 한줄 케미 요약
export function buildOneLineChemi(params: {
  userEl: ContentElementKey;
  favEl: ContentElementKey;
  relation: ElementRelation;
  favName: string;
}): string {
  const { userEl, favEl, relation, favName } = params;
  const u = ELEMENT_INFO[userEl];
  const f = ELEMENT_INFO[favEl];
  if (relation === "same") {
    return `같은 ${u.nature}의 기운을 나눠 가진 당신과 ${favName}. 결이 닮아 말하지 않아도 통하는, 동지 같은 인연이에요 ${u.emoji}`;
  }
  if (relation === "generates") {
    return `${u.nature} 같은 당신이, ${f.nature} 같은 ${favName}에게 ${gen(userEl, favEl)} 따뜻한 응원이 되어주는 사이예요 ${f.emoji}`;
  }
  if (relation === "generated_by") {
    return `${f.nature} 같은 ${favName}가, ${u.nature} 같은 당신을 ${gen(favEl, userEl)} 든든하게 채워주는 사이예요 ${u.emoji}`;
  }
  if (relation === "controls") {
    return `${u.nature} 같은 당신과 ${f.nature} 같은 ${favName}, ${ctrl(userEl, favEl)} 서로를 기분 좋게 자극하는 사이예요 ${u.emoji}${f.emoji}`;
  }
  // controlled_by
  return `${f.nature} 같은 ${favName}와 ${u.nature} 같은 당신, ${ctrl(favEl, userEl)} 서로를 한 뼘씩 자라게 하는 사이예요 ${u.emoji}${f.emoji}`;
}

// ② 오행 궁합 분석
export function buildElementCompat(params: {
  userEl: ContentElementKey;
  favEl: ContentElementKey;
  relation: ElementRelation;
  favName: string;
}): string {
  const { userEl, favEl, relation, favName } = params;
  const u = ELEMENT_INFO[userEl];
  const f = ELEMENT_INFO[favEl];
  const notation = relationNotation(userEl, favEl, relation);

  if (relation === "same") {
    return `당신의 중심 기운은 ${u.gloss}이에요. ${favName}도 같은 ${u.ko} 기운을 타고났죠. 같은 결을 가진 두 사람이라, 취향도 템포도 비슷해서 편안한 동지 같은 궁합이에요. 가끔은 둘 다 비슷한 지점에서 지칠 수 있으니, 서로 다른 기운을 하나씩 채워주면 더 단단해져요 ${u.emoji}`;
  }
  if (relation === "generates") {
    return `당신의 중심 기운은 ${u.gloss}이에요. ${favName}는 ${f.gloss}을 지녔는데, ${notation} — ${gen(userEl, favEl)}, 당신의 ${u.easy}이 ${favName}에게 진짜 힘이 되어주는 구조예요. 응원하는 당신이 곧 ${favName}의 에너지원이 되는, 주는 기쁨이 큰 궁합이에요 ${f.emoji}`;
  }
  if (relation === "generated_by") {
    return `당신의 중심 기운은 ${u.gloss}이에요. ${favName}는 ${f.gloss}을 지녔는데, ${notation} — ${gen(favEl, userEl)}, ${favName}의 ${f.easy}이 당신을 가만히 채워주는 구조예요. ${favName}를 보는 것만으로 마음이 충전되는, 받는 위로가 큰 궁합이에요 ${u.emoji}`;
  }
  if (relation === "controls") {
    return `당신의 중심 기운은 ${u.gloss}이에요. ${favName}는 ${f.gloss}을 지녔죠. ${notation} 관계라 얼핏 결이 반대 같지만, 부딪히는 게 아니라 ${ctrl(userEl, favEl)} 서로에게 없는 부분을 자극해 주는 사이예요. 다른 에너지라서 오히려 배울 게 많은, 자극이 되는 궁합이에요 ${f.emoji}`;
  }
  // controlled_by
  return `당신의 중심 기운은 ${u.gloss}이에요. ${favName}는 ${f.gloss}을 지녔죠. ${notation} 관계라 결이 달라 보여도, ${ctrl(favEl, userEl)} ${favName}가 당신의 균형을 잡아주는 흐름이에요. 서로 다른 기운이 만나 시야가 넓어지는, 성장의 궁합이에요 ${u.emoji}`;
}

// 십성 → 관계 유형 번역 (10종)
type TenGod =
  | "비견" | "겁재" | "식신" | "상관" | "편재" | "정재" | "편관" | "정관" | "편인" | "정인";

const TEN_GOD_ROLE: Record<TenGod, { type: string; asFavorite: string; asMe: string }> = {
  // 비겁 — 거울 같은 사이
  비견: {
    type: "거울 같은 사이",
    asFavorite: "나와 결이 꼭 닮은 거울 같은 존재예요. 보고 있으면 '내 얘기 같다' 싶은 순간이 많죠",
    asMe: "나 역시 그에게 편안한 동료 같은 사람이에요. 닮아서 통하지만, 가끔은 같은 고집이 부딪힐 수도",
  },
  겁재: {
    type: "거울 같은 사이",
    asFavorite: "묘하게 나를 닮았는데 한 끗 다른, 라이벌 같기도 한 거울 같은 존재예요",
    asMe: "나도 그에게 자극이 되는 닮은 꼴이에요. 함께라 든든하지만 서로 페이스는 지켜주는 게 좋아요",
  },
  // 식상 — 뮤즈 같은 사이
  식신: {
    type: "뮤즈 같은 사이",
    asFavorite: "내 표현욕과 창의력을 살살 자극하는 뮤즈 같은 존재예요. 보고 있으면 뭔가 만들고 싶어지죠",
    asMe: "나는 그에게 편안한 안식처가 되어줘요. 내가 응원하는 만큼 그의 세계가 넓어져요",
  },
  상관: {
    type: "뮤즈 같은 사이",
    asFavorite: "내 안의 끼와 아이디어를 톡톡 끌어내는 뮤즈 같은 존재예요. 덕질이 곧 자기표현이 되는 사이죠",
    asMe: "나는 그를 든든하게 받쳐주는 사람이에요. 재능을 알아봐 주는 첫 번째 팬이 되어줘요",
  },
  // 재성 — 현실 파트너
  편재: {
    type: "현실 파트너",
    asFavorite: "함께하면 구체적인 결과물이 나오는 현실 파트너 같은 존재예요. 덕질에도 알찬 실속이 붙죠",
    asMe: "나는 그에게 성장의 계기를 주는 사람이에요. 내 응원이 그를 한 걸음 더 나아가게 해요",
  },
  정재: {
    type: "현실 파트너",
    asFavorite: "곁에 두면 마음이 안정되고 계획이 척척 굴러가는 현실 파트너예요. 꾸준함이 잘 맞는 사이죠",
    asMe: "나는 그에게 믿음직한 버팀목이 되어줘요. 서두르지 않아도 오래가는 신뢰가 쌓여요",
  },
  // 관성 — 성장 촉진제
  편관: {
    type: "성장 촉진제",
    asFavorite: "나를 긴장시키면서도 더 단단하게 만들어주는 성장 촉진제 같은 존재예요. 자극이 곧 성장이 되죠",
    asMe: "나는 그에게 새로운 영감을 주는 사람이에요. 서로를 밀어 올려주는 관계예요",
  },
  정관: {
    type: "성장 촉진제",
    asFavorite: "나를 반듯하게 다잡아 주는, 존경심이 드는 성장 촉진제 같은 존재예요. 닮고 싶어지는 사이죠",
    asMe: "나는 그에게 안정감을 주는 든든한 사람이에요. 서로 예의를 지키며 깊어지는 관계예요",
  },
  // 인성 — 안식처 같은 사이
  편인: {
    type: "안식처 같은 사이",
    asFavorite: "함께 있으면 이상하게 마음이 편안해지는 안식처 같은 존재예요. 지친 날 더 생각나죠",
    asMe: "나는 그에게 신선한 자극을 주는 사람이에요. 편안함과 설렘이 함께 가는 관계예요",
  },
  정인: {
    type: "안식처 같은 사이",
    asFavorite: "곁에 있으면 마음이 포근해지는, 치유가 되는 안식처 같은 존재예요. 무한 응원을 주고받는 사이죠",
    asMe: "나는 그에게 힘을 북돋아 주는 사람이에요. 서로에게 안정과 위로가 되는 관계예요",
  },
};

export const TEN_GOD_ROLE_KEYS = Object.keys(TEN_GOD_ROLE) as TenGod[];

// ③ 일간(日干)으로 보는 관계의 결
export function buildDayMasterRelation(params: {
  forwardTenGod: string; // 나 기준 최애가 무슨 십성인가 (나에게 최애는 ~)
  reverseTenGod: string; // 최애 기준 내가 무슨 십성인가 (최애에게 나는 ~)
  favName: string;
}): string {
  const { favName } = params;
  const fwd = TEN_GOD_ROLE[params.forwardTenGod as TenGod] || TEN_GOD_ROLE["비견"];
  const rev = TEN_GOD_ROLE[params.reverseTenGod as TenGod] || TEN_GOD_ROLE["비견"];
  const intro = `일간(日干) — 태어난 날의 기운으로 보는 '나라는 사람의 중심'이에요. 이 둘이 만나면 이런 결이 흘러요.`;
  return `${intro} 나에게 ${favName}는 '${fwd.type}' — ${fwd.asFavorite}. 반대로 ${favName}에게 나는 '${rev.type}' — ${rev.asMe}. 서로가 서로에게 다른 역할이 되어주는 게 이 관계의 매력이에요 ✨`;
}

// ④ 지지(地支) 케미 포인트
export type BranchKind = "harmony" | "clash" | "punish" | "break" | "harm";

export function buildBranchChemi(params: { kinds: BranchKind[]; favName: string }): { text: string; action?: string } {
  const { kinds, favName } = params;
  const has = (k: BranchKind) => kinds.includes(k);
  const intro = `지지(地支) — 태어난 해와 날의 '바탕 기운'이에요. 두 사람의 바탕이 어떻게 맞물리는지 볼게요.`;

  if (kinds.length === 0) {
    return {
      text: `${intro} 특별히 부딪히는 지점 없이 자연스럽게 흐르는 인연이에요. 큰 파도 없이 잔잔하게 이어지는 편이라, 오히려 오래 곁에 두기 좋은 결이에요 🌿`,
    };
  }
  const lines: string[] = [];
  if (has("harmony")) {
    lines.push(`${favName}와 자연스럽게 통하는 포인트가 있어요! 바탕 기운이 서로 손을 맞잡는 '합(合)' 신호라, 함께 있을 때 유독 편안하고 안정감이 들어요 🤝`);
  }
  if (has("clash")) {
    lines.push(`서로 다른 방향을 바라보는 '충(沖)' 신호가 있어요. 부딪힘이 아니라, 덕분에 내가 못 보던 시야가 넓어지는 자극제 같은 관계예요`);
  }
  if (has("punish") || has("break") || has("harm")) {
    lines.push(`살짝 엇갈릴 수 있는 지점(형·파·해)도 보여요. 겁낼 건 전혀 없어요 — 서로의 다름을 한 번 이해하고 나면 오히려 더 깊어지는 인연이에요`);
  }
  return {
    text: `${intro} ${lines.join(" ")}`,
    action: has("clash") || has("punish") || has("break") || has("harm")
      ? "엇갈리는 날엔 '왜 저럴까' 대신 '나랑 결이 다르구나' 하고 한 박자 쉬어가면, 케미가 금세 다시 살아나요 🎯"
      : "잘 통하는 이 흐름을 놓치지 말고, 좋았던 순간을 기록해 두면 오래오래 힘이 돼요 📌",
  };
}

// ⑤ 케미 부스터 팁
export function buildBoosterTips(params: { deficientEls: ContentElementKey[]; favName: string }): string {
  const { deficientEls } = params;
  if (deficientEls.length === 0) {
    // 오행이 고루 갖춰진 드문 경우
    const e = ELEMENT_INFO.earth;
    return `두 분은 오행이 꽤 고르게 갖춰진 편이에요. 그래도 관계의 중심을 잡아주는 ${e.ko} 기운을 살짝 더하면 좋아요 — ${e.color} 아이템, ${e.numbers}, ${e.direction} 방향의 에너지가 조화를 도와줘요 ${e.emoji}`;
  }
  const tips = deficientEls.slice(0, 2).map((el) => {
    const info = ELEMENT_INFO[el];
    return `${info.ko}(${info.easy})을 보충하면 좋아요 — ${info.color} 아이템을 곁에 두거나, ${info.numbers}를 활용하고, ${info.direction} 방향의 에너지를 떠올려 보세요 ${info.emoji}`;
  });
  const lead = deficientEls.length >= 2
    ? "두 분 사이에 조금 옅은 기운이 있어요. 이걸 채우면 궁합이 한층 부드러워져요."
    : "두 분 사이에 살짝 옅은 기운이 있어요. 이걸 채우면 균형이 잘 잡혀요.";
  return `${lead} ${tips.join(" 그리고 ")}`;
}
