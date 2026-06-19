import { buildImageCandidates, getTarotCardByAnyId, TAROT_CARDS } from "./tarot-cards.mjs";

const POSITIONS = [
  {
    pos_id: 1,
    pos_name: "원석의 첫 번째 빛",
    role: "현재 당신의 에너지",
    oneLineLead: "지금 당신 안에는",
  },
  {
    pos_id: 2,
    pos_name: "가려진 면",
    role: "의식하지 못한 영향",
    oneLineLead: "아직 들여다보지 않은 부분이",
  },
  {
    pos_id: 3,
    pos_name: "원석이 보내는 경고",
    role: "지금 조심할 것",
    oneLineLead: "지금 조심해야 할 패턴은",
  },
  {
    pos_id: 4,
    pos_name: "크리스탈의 처방",
    role: "원석이 권하는 방향",
    oneLineLead: "오늘의 처방은",
  },
  {
    pos_id: 5,
    pos_name: "빛이 열어줄 문",
    role: "가까운 가능성",
    oneLineLead: "가까운 문은",
  },
];

const GEM_FRAMES = {
  amethyst: {
    name: "자수정",
    core: "직관과 보호, 내면 정화",
    lens: "직관에 어떤 신호가 닿는지",
    color: "#a855f7",
    glow: "#a855f7",
    intro:
      "자수정의 기운이 열렸습니다. 직관과 보호의 빛이 오늘 당신의 카드 위로 내려앉습니다. 질문을 마음속에 담고 카드를 한 장씩 열어 주세요.",
    advice: "오늘은 크게 밀어붙이기보다, 먼저 마음이 조용해지는 선택을 붙잡으세요.",
  },
  rose_quartz: {
    name: "장미수정",
    core: "자기애와 감정 치유, 수용",
    lens: "당신이 자신을 대하는 방식",
    color: "#f472b6",
    glow: "#f472b6",
    intro:
      "장미수정의 결이 부드럽게 열렸습니다. 마음을 재촉하지 않는 사랑이 오늘의 카드 위에 머무릅니다. 자신에게 건네고 싶은 말을 품고 한 장씩 열어 주세요.",
    advice: "오늘은 남의 기준보다, 스스로를 덜 몰아붙이는 방향을 먼저 선택하세요.",
  },
  obsidian: {
    name: "흑요석",
    core: "진실 직면과 경계, 에너지 차단",
    lens: "직면해야 할 진실과 놓아야 할 것",
    color: "#57534e",
    glow: "#57534e",
    intro:
      "흑요석의 검은 빛이 조용히 깨어났습니다. 피하고 있던 진실과 필요한 경계가 카드 위에 선명하게 드러납니다. 마음을 단단히 세우고 한 장씩 열어 주세요.",
    advice: "오늘은 애매한 친절보다, 지켜야 할 선을 분명히 하는 편이 안전합니다.",
  },
  moonstone: {
    name: "문스톤",
    core: "감수성과 사이클, 변화 수용",
    lens: "감정 사이클의 현재 단계",
    color: "#a5b4fc",
    glow: "#a5b4fc",
    intro:
      "문스톤의 푸른 달빛이 열렸습니다. 감정의 물결과 변화의 때가 오늘의 카드 위에 잔잔히 머무릅니다. 서두르지 말고 한 장씩 열어 주세요.",
    advice: "오늘은 결론을 고정하지 말고, 마음의 주기가 바뀌는 소리를 기다리세요.",
  },
  lapis: {
    name: "라피스라줄리",
    core: "지혜와 진실된 소통, 명료함",
    lens: "말해야 할 것과 듣고 싶지 않던 진실",
    color: "#3b82f6",
    glow: "#3b82f6",
    intro:
      "라피스라줄리의 깊은 푸른 빛이 열렸습니다. 말해야 할 진실과 들어야 할 대답이 카드 위에 또렷하게 드러납니다. 마음속 질문을 분명히 하고 한 장씩 열어 주세요.",
    advice: "오늘은 돌려 말하지 말고, 품위 있게 정확한 말을 선택하세요.",
  },
  citrine: {
    name: "시트린",
    core: "풍요와 행동력, 자신감",
    lens: "지금 움직여야 할 방향",
    color: "#f59e0b",
    glow: "#f59e0b",
    intro:
      "시트린의 밝은 결이 열렸습니다. 움츠린 마음을 지나 실제로 움직일 수 있는 방향이 카드 위에 떠오릅니다. 오늘의 첫 행동을 떠올리며 한 장씩 열어 주세요.",
    advice: "오늘은 작아도 실행 가능한 선택을 바로 현실 위에 올려놓으세요.",
  },
  black_tourmaline: {
    name: "블랙투르말린",
    core: "차단과 접지, 안정",
    lens: "흔드는 것으로부터 자신을 보호하는 법",
    color: "#166534",
    glow: "#166534",
    intro:
      "블랙투르말린의 묵직한 결이 열렸습니다. 흔들림을 막고 다시 뿌리내릴 자리가 카드 위에 드러납니다. 몸과 마음을 낮게 세우고 한 장씩 열어 주세요.",
    advice: "오늘은 확장보다 안정입니다. 불필요한 자극을 줄이고 자신의 자리를 지키세요.",
  },
};

const MAJOR_NAMES = {
  M00: ["바보", "The Fool", "절벽 앞의 여행자가 흰 꽃을 들고 첫 걸음을 내딛는 장면"],
  M01: ["마법사", "The Magician", "하늘과 땅을 잇는 마법사가 네 도구를 펼쳐 둔 장면"],
  M02: ["여사제", "The High Priestess", "두 기둥 사이에 앉은 여사제가 감춰진 두루마리를 품은 장면"],
  M03: ["여황제", "The Empress", "풍요로운 들판의 여황제가 편안히 앉아 생명을 품는 장면"],
  M04: ["황제", "The Emperor", "돌 왕좌의 황제가 흔들리지 않는 질서를 세우는 장면"],
  M05: ["교황", "The Hierophant", "두 제자 앞에서 교황이 전통의 열쇠를 들어 보이는 장면"],
  M06: ["연인", "The Lovers", "천사의 시선 아래 두 사람이 선택의 문 앞에 서 있는 장면"],
  M07: ["전차", "The Chariot", "두 스핑크스를 거느린 전차가 의지를 한 방향으로 모으는 장면"],
  M08: ["힘", "Strength", "여인이 사자의 입을 부드럽게 다스리는 장면"],
  M09: ["은둔자", "The Hermit", "등불을 든 은둔자가 산 위에서 길을 비추는 장면"],
  M10: ["운명의 수레바퀴", "Wheel of Fortune", "거대한 수레바퀴가 하늘의 생물들 사이에서 도는 장면"],
  M11: ["정의", "Justice", "검과 저울을 든 인물이 균형의 자리에 앉은 장면"],
  M12: ["매달린 사람", "The Hanged Man", "거꾸로 매달린 사람이 고요한 깨달음을 받아들이는 장면"],
  M13: ["죽음", "Death", "검은 갑옷의 기수가 낡은 시간을 지나가는 장면"],
  M14: ["절제", "Temperance", "천사가 두 컵 사이로 물을 옮기며 균형을 맞추는 장면"],
  M15: ["악마", "The Devil", "사슬에 묶인 두 사람이 어둠의 집착 앞에 선 장면"],
  M16: ["탑", "The Tower", "번개 맞은 탑에서 낡은 구조가 무너져 내리는 장면"],
  M17: ["별", "The Star", "밤하늘 아래 여인이 두 물줄기를 조용히 붓는 장면"],
  M18: ["달", "The Moon", "달빛 아래 늑대와 개가 울고 물가에서 가재가 오르는 장면"],
  M19: ["태양", "The Sun", "아이와 흰 말이 태양 아래 환하게 드러나는 장면"],
  M20: ["심판", "Judgement", "천사의 나팔 소리에 사람들이 다시 일어나는 장면"],
  M21: ["세계", "The World", "월계관 속 인물이 완성의 춤을 추는 장면"],
};

const SUIT_NAMES = {
  W: ["완드", "Wands", "불꽃이 깃든 지팡이"],
  C: ["컵", "Cups", "물결을 품은 잔"],
  S: ["소드", "Swords", "하늘을 가르는 검"],
  P: ["펜타클", "Pentacles", "흙 위에 놓인 금화"],
};

const RANK_NAMES = {
  "01": ["에이스", "Ace", "하늘에서 내민 손이 새로운 씨앗을 건네는 장면"],
  "02": ["2", "Two", "두 상징이 서로의 무게를 재며 균형을 찾는 장면"],
  "03": ["3", "Three", "세 힘이 만나 다음 지평을 바라보는 장면"],
  "04": ["4", "Four", "네 모서리가 한 자리를 지키며 안정과 정지를 만드는 장면"],
  "05": ["5", "Five", "흔들림과 결핍이 드러나며 진짜 기준을 묻는 장면"],
  "06": ["6", "Six", "지난 시간을 건너 회복과 교환이 일어나는 장면"],
  "07": ["7", "Seven", "여러 가능성 앞에서 방어와 선택이 동시에 필요한 장면"],
  "08": ["8", "Eight", "반복되는 움직임이 집중과 전환을 요구하는 장면"],
  "09": ["9", "Nine", "거의 완성된 자리에서 마음의 마지막 문턱을 보는 장면"],
  "10": ["10", "Ten", "쌓인 결과가 끝과 다음 책임을 함께 부르는 장면"],
  "11": ["페이지", "Page", "젊은 전령이 새 소식을 들고 조심스럽게 서 있는 장면"],
  "12": ["나이트", "Knight", "기사가 한 방향으로 움직이며 의지를 시험하는 장면"],
  "13": ["퀸", "Queen", "여왕이 자기 세계의 감각을 깊고 섬세하게 다스리는 장면"],
  "14": ["킹", "King", "왕이 한 세계의 책임과 결정을 받아들이는 장면"],
};

const SUIT_TONES = {
  W: "행동의 불씨",
  C: "감정의 물결",
  S: "생각의 칼날",
  P: "현실의 무게",
};

export const CRYSTAL_SOUL_SYSTEM_PROMPT = `당신은 크리스탈 에너지와 웨이트-스미스 타로를 통합해 상담하는 원석 타로이스트입니다.
내담자가 고른 원석은 오늘의 에너지 바탕이며, 타로 카드는 그 에너지 위에서 구체적인 방향을 드러냅니다.
원석별 에너지 프레임을 모든 해석에 일관 적용하고, 5개 포지션을 빠짐없이 상담사 톤으로 해석합니다.
각 카드의 핵심 시각 이미지를 최소 1개 이상 녹이며, 같은 원석이라도 카드가 다르면 해석이 달라야 합니다.
종합 리딩은 5장을 원석 에너지로 꿰는 하나의 이야기로 쓰고, 오늘 원석이 건네는 한 문장으로 마무리합니다.
문체는 차분하고 깊은 타로 상담 어조이며, 단락은 최대 3문장입니다.`;

function normalizeGemType(value) {
  const key = String(value || "").trim();
  return GEM_FRAMES[key] ? key : "amethyst";
}

function cardInfoFromCode(code) {
  const normalized = String(code || "").trim().toUpperCase();
  if (MAJOR_NAMES[normalized]) {
    const [nameKo, nameEn, scene] = MAJOR_NAMES[normalized];
    return { code: normalized, nameKo, nameEn, scene, tone: "인생의 큰 전환" };
  }

  const suitKey = normalized.charAt(0);
  const rankKey = normalized.slice(1);
  const suit = SUIT_NAMES[suitKey] || SUIT_NAMES.W;
  const rank = RANK_NAMES[rankKey] || RANK_NAMES["01"];
  return {
    code: normalized,
    nameKo: `${suit[0]} ${rank[0]}`,
    nameEn: `${rank[1]} of ${suit[1]}`,
    scene: `${rank[2]} ${suit[2]}의 결이 함께 놓입니다.`,
    tone: SUIT_TONES[suitKey] || "카드의 상징",
  };
}

function normalizeDrawnCards(inputCards = []) {
  const cards = [];
  const seen = new Set();

  for (const item of Array.isArray(inputCards) ? inputCards : []) {
    const raw = typeof item === "string" ? item : item?.cardId || item?.code || item?.id || item?.name;
    const model = getTarotCardByAnyId(raw);
    const code = String(model?.code || raw || "").trim().toUpperCase();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    cards.push({
      code,
      orientation: item?.orientation === "reversed" ? "reversed" : Math.random() < 0.5 ? "upright" : "reversed",
    });
    if (cards.length >= 5) break;
  }

  const pool = TAROT_CARDS.slice();
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  for (const card of pool) {
    if (cards.length >= 5) break;
    if (!card?.code || seen.has(card.code)) continue;
    seen.add(card.code);
    cards.push({
      code: card.code,
      orientation: Math.random() < 0.5 ? "upright" : "reversed",
    });
  }

  return cards.slice(0, 5);
}

function buildReadingText({ gem, position, cardInfo, direction }) {
  const reversed = direction === "역방향";
  if (position.pos_id === 1) {
    return `지금 당신 안에는 ${gem.core}이 실제로 움직이고 있습니다. ${cardInfo.scene} ${cardInfo.nameKo} ${direction}은 ${gem.lens}를 묻고, ${reversed ? "조용히 틀어진 감각을 바로잡으라고 가리킵니다." : "이미 알고 있던 감각을 믿어도 된다고 드러납니다."}`;
  }
  if (position.pos_id === 2) {
    return `아직 들여다보지 않은 부분이 ${cardInfo.tone} 속에 머무릅니다. ${cardInfo.scene} ${gem.name}은 그 장면을 통해 ${reversed ? "외면한 마음의 습관을 부드럽게 마주하라" : "놓쳤던 신호를 차분히 확인하라"}고 가리킵니다.`;
  }
  if (position.pos_id === 3) {
    return `지금 ${reversed ? "확신 없이 미루는 태도" : "익숙한 방식으로만 밀어붙이는 선택"}을 조심하세요. ${cardInfo.scene} ${cardInfo.nameKo}은 ${gem.core}의 보호 아래, 같은 패턴을 반복하기 전에 한 걸음 멈추라고 드러납니다.`;
  }
  if (position.pos_id === 4) {
    return `${gem.name}이 권하는 처방은 ${reversed ? "힘을 덜어내고 기준을 다시 세우는 일" : "작게라도 분명한 행동을 선택하는 일"}입니다. ${cardInfo.scene} ${cardInfo.nameKo}은 오늘 당신에게 ${gem.lens}를 따라 정리할 한 가지를 남깁니다.`;
  }
  return `가까운 2~4주 안에 ${reversed ? "닫힌 줄 알았던 문을 다른 방식으로 다시 만질 수 있는 가능성" : "준비해 온 빛이 현실의 문턱까지 다가오는 가능성"}이 보입니다. ${cardInfo.scene} ${gem.name}은 그 문을 성급히 열기보다 알맞은 때에 알아보게 합니다.`;
}

function buildOneLine({ position, gem, cardInfo, direction }) {
  const candidates = {
    1: `${gem.name}이 현재의 신호를 맑힙니다`,
    2: `가려진 마음이 ${cardInfo.nameKo}으로 드러납니다`,
    3: `반복되는 선택을 조심하세요`,
    4: `${gem.name}은 작은 정리를 권합니다`,
    5: `${direction}의 문이 가까이 열립니다`,
  };
  return candidates[position.pos_id] || `${gem.name}의 빛을 따르세요`;
}

function buildSynthesis(gem, cards) {
  const names = cards.map((card) => card.card_name).join(", ");
  const first = cards[0]?.card_name || "첫 카드";
  const last = cards[cards.length - 1]?.card_name || "마지막 카드";
  return {
    body:
      `${gem.name}이 오늘의 바탕으로 놓이자 ${names}의 상징이 하나의 길로 이어집니다. ${first}에서 시작된 신호는 숨은 영향과 경고를 지나, 지금 필요한 처방을 더 선명하게 만듭니다. ${last}이 보여 주는 가까운 문은 성급한 결론보다 ${gem.lens}를 따라 움직일 때 자연스럽게 열립니다.`,
    gem_message: `오늘 ${gem.name}이 당신에게 건네는 한 문장: ${gem.advice}`,
  };
}

function buildReadingPlainText(readingData) {
  const lines = [];
  lines.push(`${readingData.gem_name}이 전하는 오늘의 완성된 메시지`);
  lines.push(readingData.synthesis.body);
  lines.push(readingData.synthesis.gem_message);
  for (const card of readingData.cards) {
    lines.push(`${card.pos_id}. ${card.pos_name} · ${card.card_name} ${card.direction}`);
    lines.push(card.reading);
    lines.push(card.one_line);
  }
  return lines.join("\n\n");
}

export function buildCrystalSoulV3Reading(body = {}) {
  const gemType = normalizeGemType(body?.gem?.id || body?.gem || body?.gemType);
  const gem = GEM_FRAMES[gemType];
  const drawn = normalizeDrawnCards(body?.cards);
  const cards = drawn.map((drawnCard, index) => {
    const position = POSITIONS[index];
    const cardInfo = cardInfoFromCode(drawnCard.code);
    const direction = drawnCard.orientation === "reversed" ? "역방향" : "정방향";
    const imageCandidates = buildImageCandidates(drawnCard.code);
    return {
      pos_id: position.pos_id,
      pos_name: position.pos_name,
      position_role: position.role,
      card_id: drawnCard.code,
      card_name: cardInfo.nameKo,
      card_name_en: cardInfo.nameEn,
      direction,
      orientation: drawnCard.orientation,
      imageUrl: imageCandidates[0],
      localImageUrl: imageCandidates[0],
      imageCandidates,
      visual_symbol: cardInfo.scene,
      reading: buildReadingText({ gem, position, cardInfo, direction }),
      one_line: buildOneLine({ position, gem, cardInfo, direction }),
    };
  });

  const readingData = {
    gem: gemType,
    gem_name: gem.name,
    gem_color: gem.color,
    gem_glow: gem.glow,
    intro: gem.intro,
    cards,
    synthesis: buildSynthesis(gem, cards),
    prompt_version: "crystal-soul-v3",
  };

  return {
    ok: true,
    source: "crystal-soul-v3-local",
    readingSource: "deterministic",
    model: "local-crystal-soul-v3",
    reading: buildReadingPlainText(readingData),
    readingData,
    promptApplied: CRYSTAL_SOUL_SYSTEM_PROMPT,
  };
}
