// 운명 찻집 '마음의 향' 정본 카탈로그.
// 워커(worker/routes/fortune-tea-house.js)와 프론트(src/features/fortune-tea-house)가 같은 파일을 참조한다.
// LLM은 이 목록 밖의 향 이름을 쓸 수 없고, 위반 시 워커가 결정론 폴백으로 교체한다.

export const HEART_SCENT_CATALOG = [
  { category: "평온", scents: ["라벤더", "캐모마일", "화이트 머스크"] },
  { category: "자신감", scents: ["시더우드", "샌달우드", "베르가못"] },
  { category: "사랑", scents: ["로즈", "피오니", "자스민"] },
  { category: "치유", scents: ["유칼립투스", "세이지", "그린티"] },
  { category: "재물", scents: ["시나몬", "패출리", "오렌지", "바닐라"] },
  { category: "행운", scents: ["레몬", "유자", "베르가못"] },
  { category: "새로운 시작", scents: ["화이트 티", "코튼", "프리지아"] },
  { category: "집중", scents: ["로즈마리", "민트", "사이프러스"] },
];

export const HEART_SCENT_CATEGORIES = HEART_SCENT_CATALOG.map((entry) => entry.category);

const SCENT_NAME_TO_CATEGORIES = new Map();
for (const entry of HEART_SCENT_CATALOG) {
  for (const scent of entry.scents) {
    const list = SCENT_NAME_TO_CATEGORIES.get(scent) || [];
    list.push(entry.category);
    SCENT_NAME_TO_CATEGORIES.set(scent, list);
  }
}

/** 카탈로그에 존재하는 향 이름인지. */
export function isHeartScentName(name) {
  return SCENT_NAME_TO_CATEGORIES.has(String(name || "").trim());
}

/**
 * 향 이름이 속한 카테고리를 돌려준다.
 * 베르가못처럼 두 카테고리(자신감·행운)에 걸친 향은 hint와 일치하는 쪽을 우선한다.
 */
export function findHeartScentCategory(name, hint) {
  const categories = SCENT_NAME_TO_CATEGORIES.get(String(name || "").trim());
  if (!categories || !categories.length) return "";
  const hinted = String(hint || "").trim();
  if (hinted && categories.includes(hinted)) return hinted;
  return categories[0];
}

/** 프롬프트에 넣을 카탈로그 문자열 목록. */
export function buildHeartScentPromptCatalog() {
  return HEART_SCENT_CATALOG.map((entry) => `${entry.category}: ${entry.scents.join(", ")}`);
}

// 찻잔(주제) → 기본 향 카테고리. 질문 텍스트가 더 구체적인 결을 보이면 아래 QUESTION_CATEGORY_HINTS가 덮는다.
const TEA_CUP_CATEGORY = {
  "lotus-moon": "사랑",
  "honey-peach": "사랑",
  "star-black-tea": "자신감",
  "gold-cinnamon": "재물",
  "white-lotus-healing": "치유",
  "black-moon-brown-rice": "평온",
};

const QUESTION_CATEGORY_HINTS = [
  [/이직|퇴사|새로\s*시작|시작해도|새출발|창업|전환|이사/, "새로운 시작"],
  [/시험|합격|공부|자격증|면접|집중|산만/, "집중"],
  [/돈|재물|투자|수입|지출|빚|사업\s*자금|금전/, "재물"],
  [/운|행운|복권|기회|타이밍/, "행운"],
  [/불안|초조|잠|지침|번아웃|쉬고|휴식/, "평온"],
  [/자신감|용기|주도|리더|결단|밀어붙/, "자신감"],
  [/상처|치유|회복|아프|우울|위로/, "치유"],
  [/사랑|연애|재회|고백|썸|짝사랑|마음/, "사랑"],
];

function stableHash(seed) {
  const text = String(seed || "");
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function resolveFallbackCategory({ teaCupId, teaCupTopic, question, gaugeLabel }) {
  const source = [question, gaugeLabel, teaCupTopic].filter(Boolean).join(" ");
  for (const [pattern, category] of QUESTION_CATEGORY_HINTS) {
    if (pattern.test(source)) return category;
  }
  return TEA_CUP_CATEGORY[teaCupId] || "평온";
}

/**
 * LLM 출력이 없거나 카탈로그를 벗어났을 때 쓰는 결정론 향 선택.
 * 같은 입력이면 항상 같은 향이 나오도록 시드 해시만 사용한다.
 */
export function pickFallbackHeartScent({ teaCupId, teaCupTopic, question, gaugeLabel, seed } = {}) {
  const category = resolveFallbackCategory({ teaCupId, teaCupTopic, question, gaugeLabel });
  const entry = HEART_SCENT_CATALOG.find((item) => item.category === category) || HEART_SCENT_CATALOG[0];
  const name = entry.scents[stableHash(`${seed || ""}|${category}|${teaCupId || ""}`) % entry.scents.length];
  return { name, category: entry.category };
}

const CATEGORY_NEED_LINE = {
  평온: "지금 당신에게 필요한 것은 불안을 줄이고 마음을 가라앉히는 시간이에요",
  자신감: "지금 당신에게 필요한 것은 흔들리는 판단을 스스로 믿어주는 힘이에요",
  사랑: "지금 당신에게 필요한 것은 마음의 온도를 정직하게 들여다보는 일이에요",
  치유: "지금 당신에게 필요한 것은 남은 상처를 조용히 아물게 하는 시간이에요",
  재물: "지금 당신에게 필요한 것은 돈의 흐름을 감정이 아니라 기준으로 보는 눈이에요",
  행운: "지금 당신에게 필요한 것은 다가온 기회를 놓치지 않는 가벼운 마음이에요",
  "새로운 시작": "지금 당신에게 필요한 것은 지난 자리를 정리하고 첫 걸음을 떼는 용기예요",
  집중: "지금 당신에게 필요한 것은 흩어진 생각을 하나로 모으는 고요함이에요",
};

const CATEGORY_SCENT_LINE = {
  평온: "그 흐름을 가장 부드럽게 감싸주는 향",
  자신감: "그 흐름에 단단한 중심을 더해주는 향",
  사랑: "그 흐름의 온도를 다정하게 지켜주는 향",
  치유: "그 흐름을 천천히 회복시켜주는 향",
  재물: "그 흐름을 현실의 결실로 이어주는 향",
  행운: "그 흐름에 산뜻한 기회를 불러오는 향",
  "새로운 시작": "그 흐름을 처음처럼 맑게 열어주는 향",
  집중: "그 흐름을 한 방향으로 모아주는 향",
};

/**
 * 향 이름·카테고리·이유를 갖춘 완전한 heartScent 폴백.
 * cardNames를 반드시 한 개 이상 문장에 넣어 '결과와 연결되지 않는 향' 문제를 구조적으로 막는다.
 */
export function buildFallbackHeartScent({ teaCupId, teaCupTopic, question, gaugeLabel, seed, cardNames = [] } = {}) {
  const picked = pickFallbackHeartScent({ teaCupId, teaCupTopic, question, gaugeLabel, seed });
  const names = cardNames.map((name) => String(name || "").trim()).filter(Boolean);
  const cardLine = names.length
    ? `오늘의 카드 ${names.slice(0, 3).join(", ")}는 서두르기보다 지금의 결을 먼저 살피라는 메시지를 건네고 있어요.`
    : "오늘 펼쳐진 카드들은 서두르기보다 지금의 결을 먼저 살피라는 메시지를 건네고 있어요.";
  const reason = [
    `${CATEGORY_NEED_LINE[picked.category] || CATEGORY_NEED_LINE["평온"]}.`,
    cardLine,
    `${picked.name}은 ${CATEGORY_SCENT_LINE[picked.category] || CATEGORY_SCENT_LINE["평온"]}이라, 지금 손님의 흐름을 가장 잘 보완해 줍니다.`,
  ].join("\n");
  return { name: picked.name, category: picked.category, reason };
}
