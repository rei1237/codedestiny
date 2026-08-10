import { buildImageCandidates, getTarotCardByAnyId, TAROT_CARDS } from "./tarot-cards.mjs";
import { buildTopicLockPromptBlock } from "./topic-lock.mjs";

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
    meaning: "자수정은 흩어진 직관을 맑게 하고 마음의 소음을 낮춰 보호의 결을 세우는 원석입니다.",
    energy: "보랏빛 파동은 불안하게 앞서가는 생각을 가라앉히고, 이미 알고 있던 내면의 대답을 조용히 떠오르게 합니다.",
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
    meaning: "장미수정은 마음의 긴장을 풀고 상처 입은 감정을 부드럽게 감싸는 사랑의 원석입니다.",
    energy: "분홍빛 파동은 자신을 몰아붙이는 마음을 누그러뜨리고, 관계 속에서 필요한 온기와 수용을 다시 흐르게 합니다.",
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
    meaning: "흑요석은 숨겨진 진실을 비추고 소모적인 기운을 끊어 내는 보호의 원석입니다.",
    energy: "검은빛 파동은 흔들리는 감정을 단단히 붙잡아 주며, 더 이상 끌려가지 않아야 할 선을 선명하게 드러냅니다.",
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
    meaning: "문스톤은 감정의 주기와 변화의 때를 읽게 하는 달빛의 원석입니다.",
    energy: "은푸른 파동은 서두른 결론을 늦추고, 마음이 차오르고 비워지는 리듬을 자연스럽게 받아들이게 합니다.",
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
    meaning: "라피스라줄리는 진실한 말과 깊은 통찰을 열어 주는 지혜의 원석입니다.",
    energy: "짙은 푸른 파동은 흐릿한 생각을 정돈하고, 말해야 할 진심과 들어야 할 대답을 품위 있게 마주하게 합니다.",
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
    meaning: "시트린은 움츠린 의지를 깨우고 현실의 풍요를 향해 움직이게 하는 태양빛 원석입니다.",
    energy: "금빛 파동은 망설임을 가볍게 덜어 내며, 지금 손에 잡히는 기회와 실행의 감각을 밝게 살립니다.",
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
    meaning: "블랙투르말린은 외부의 흔들림을 낮추고 몸과 마음을 현실에 단단히 접지시키는 원석입니다.",
    energy: "짙은 초록빛 파동은 흩어진 에너지를 아래로 내려 보내며, 불필요한 자극에서 벗어나 자기 자리를 지키게 합니다.",
    color: "#166534",
    glow: "#166534",
    intro:
      "블랙투르말린의 묵직한 결이 열렸습니다. 흔들림을 막고 다시 뿌리내릴 자리가 카드 위에 드러납니다. 몸과 마음을 낮게 세우고 한 장씩 열어 주세요.",
    advice: "오늘은 확장보다 안정입니다. 불필요한 자극을 줄이고 자신의 자리를 지키세요.",
  },
  tiger_eye: {
    name: "호안석",
    core: "용기와 통찰, 현실 판단",
    lens: "지금 무엇을 정확히 보고 움직여야 하는지",
    meaning: "호안석은 두려움과 충동 사이에서 중심을 잡고 현실을 꿰뚫어 보게 하는 원석입니다.",
    energy: "황금빛 줄무늬 파동은 흔들리는 마음에 담력을 세우고, 감정에 가려진 사실과 선택의 방향을 선명하게 드러냅니다.",
    color: "#c47a28",
    glow: "#f59e0b",
    intro:
      "호안석의 날카롭고 따뜻한 결이 열렸습니다. 두려움보다 분명한 눈으로 보아야 할 현실이 오늘의 카드 위에 떠오릅니다. 마음을 단단히 모으고 한 장씩 열어 주세요.",
    advice: "오늘은 감으로만 움직이지 말고, 보이는 증거와 마음의 용기를 함께 붙잡으세요.",
  },
  clear_quartz: {
    name: "백수정",
    core: "정화와 증폭, 명료한 집중",
    lens: "흐린 신호 중 무엇을 맑게 키워야 하는지",
    meaning: "백수정은 흩어진 기운을 정화하고 필요한 신호를 크게 증폭시키는 투명한 원석입니다.",
    energy: "맑은 빛의 파동은 복잡한 생각을 씻어 내며, 작지만 정확한 가능성을 더 선명하게 키웁니다.",
    color: "#dbeafe",
    glow: "#bfdbfe",
    intro:
      "백수정의 투명한 빛이 열렸습니다. 흐린 감정과 생각이 걷히고, 오늘 꼭 키워야 할 신호가 카드 위에 맑게 비칩니다. 숨을 고르고 한 장씩 열어 주세요.",
    advice: "오늘은 많은 것을 붙잡기보다, 가장 맑게 남는 한 가지를 크게 키우세요.",
  },
  green_aventurine: {
    name: "그린 아벤츄린",
    core: "기회와 회복, 성장",
    lens: "닫힌 듯 보인 문이 어디서 다시 열리는지",
    meaning: "그린 아벤츄린은 지친 마음을 회복시키고 새 기회의 싹을 부드럽게 틔우는 원석입니다.",
    energy: "초록빛 파동은 무리한 돌파보다 자연스럽게 자라는 흐름을 살리며, 작은 가능성을 현실의 성장으로 이어 줍니다.",
    color: "#22c55e",
    glow: "#86efac",
    intro:
      "그린 아벤츄린의 싱그러운 결이 열렸습니다. 닫혔다고 느낀 자리에도 아직 자랄 수 있는 기회가 남아 있습니다. 마음의 힘을 천천히 회복하며 한 장씩 열어 주세요.",
    advice: "오늘은 무리해서 증명하지 말고, 다시 자랄 수 있는 작은 자리를 돌보세요.",
  },
  garnet: {
    name: "가넷",
    core: "열정과 생명력, 결단",
    lens: "끝까지 지켜야 할 의지와 다시 데워야 할 마음",
    meaning: "가넷은 식어 있던 생명력을 깨우고 마음 깊은 곳의 결단을 붉게 살리는 원석입니다.",
    energy: "붉은 파동은 미뤄 둔 의지를 다시 데우며, 쉽게 식지 않는 집중과 정직한 욕망을 드러냅니다.",
    color: "#b91c1c",
    glow: "#ef4444",
    intro:
      "가넷의 붉은 빛이 깊게 깨어났습니다. 식어 있던 의지와 다시 붙잡아야 할 열정이 카드 위에 선명하게 올라옵니다. 가슴의 온도를 느끼며 한 장씩 열어 주세요.",
    advice: "오늘은 마음이 식은 척하지 말고, 아직 뜨겁게 남아 있는 진심을 인정하세요.",
  },
  labradorite: {
    name: "래브라도라이트",
    core: "변신과 보호, 숨은 빛",
    lens: "아직 드러나지 않은 재능과 변화의 문",
    meaning: "래브라도라이트는 어둠 속에 숨어 있던 빛을 드러내고 변화의 문턱을 보호하는 원석입니다.",
    energy: "푸른 섬광의 파동은 익숙한 자아 뒤에 감춰진 가능성을 비추며, 새로운 모습으로 넘어가는 용기를 조용히 지켜 줍니다.",
    color: "#2563eb",
    glow: "#67e8f9",
    intro:
      "래브라도라이트의 푸른 섬광이 열렸습니다. 아직 드러나지 않은 재능과 변화의 문이 오늘의 카드 위에서 은밀히 빛납니다. 낯선 가능성을 두려워하지 말고 한 장씩 열어 주세요.",
    advice: "오늘은 익숙한 모습에만 머물지 말고, 안쪽에서 반짝이는 새로운 가능성을 믿으세요.",
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
원석은 만능 부적이나 치료 도구처럼 말하지 않고, 사용자가 감정과 선택을 정렬하는 상징으로만 다룹니다.
연이는 등장하지 않습니다. 문체는 차분하고 깊은 타로 상담 어조이며, 단락은 최대 3문장입니다.
불안을 키우는 단정, 의료/법률/투자 확정 판단, 공포 자극, 기계적인 결과 설명 문장은 쓰지 않습니다.`;

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

// 포지션 테마(첫 빛=현재 / 가려진 면=무의식 / 경고 / 처방 / 열릴 문=가능성)에 맞춰
// 개선된 카드 데이터에서 정/역방향별 해석을 뽑아 원석 리딩에 녹인다.
function crystalCardMeaning(code, orientation) {
  const model = getTarotCardByAnyId(code);
  if (!model) return {};
  const m = orientation === "reversed" ? model.reversed : model.upright;
  if (!m || typeof m !== "object") return {};
  const pick = (arr) => (Array.isArray(arr) && arr.length ? String(arr[0] || "").trim() : "");
  const str = (v) => String(v || "").trim();
  return {
    1: pick(m.currentMind) || pick(m.general) || str(m.coreMeaning),
    2: str(m.psychologicalMeaning) || pick(m.shadow) || pick(m.general),
    3: pick(m.caution) || pick(m.shadow) || str(m.shadowText),
    4: pick(m.advice),
    5: pick(m.future) || pick(m.general),
  };
}

function finalConsonantIndex(value) {
  const char = String(value || "").trim().slice(-1);
  const code = char.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return 0;
  return (code - 0xac00) % 28;
}

function josa(value, pair) {
  const finalIndex = finalConsonantIndex(value);
  if (pair === "으로/로") return finalIndex && finalIndex !== 8 ? "으로" : "로";
  const [withFinal, withoutFinal] = pair.split("/");
  return finalIndex ? withFinal : withoutFinal;
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

function buildReadingText({ gem, position, cardInfo, direction, cardMeaning }) {
  const meaning = String(cardMeaning || "").trim();
  const tail = meaning ? ` ${meaning}` : "";
  if (position.pos_id === 1) {
    return `지금 당신 안에는 ${gem.core}${josa(gem.core, "이/가")} 흐르고 있습니다. ${cardInfo.scene} ${cardInfo.nameKo} ${direction}은 ${gem.lens}${josa(gem.lens, "을/를")} 비춥니다.${tail}`;
  }
  if (position.pos_id === 2) {
    return `아직 들여다보지 않은 결이 ${cardInfo.tone} 속에 머무릅니다. ${cardInfo.scene} ${cardInfo.nameKo} ${direction}은 ${gem.name}의 빛 아래에서 미처 마주하지 못한 부분을 드러냅니다.${tail}`;
  }
  if (position.pos_id === 3) {
    return `${gem.name}이 지금 조용히 건네는 경고가 있습니다. ${cardInfo.scene} ${cardInfo.nameKo} ${direction}은 ${gem.core}의 보호 아래, 같은 패턴을 반복하기 전에 한 걸음 멈추라고 드러냅니다.${tail}`;
  }
  if (position.pos_id === 4) {
    return `${gem.name}이 오늘 건네는 처방입니다. ${cardInfo.scene} ${cardInfo.nameKo} ${direction}은 ${gem.lens}${josa(gem.lens, "을/를")} 따라 정리할 방향을 남깁니다.${tail}`;
  }
  return `가까운 시간 안에 열릴 가능성이 보입니다. ${cardInfo.scene} ${cardInfo.nameKo} ${direction}은 ${gem.name}의 빛과 만나 그 문을 알맞은 때에 알아보게 합니다.${tail}`;
}

function buildGemReading({ gem, position, cardInfo, direction }) {
  const reversed = direction === "역방향";
  const bridge = reversed
    ? "안으로 말린 에너지를 바로 세우며, 서두른 판단보다 먼저 회복해야 할 결을 비춥니다."
    : "밖으로 열린 에너지를 현실로 옮기며, 이미 흐르기 시작한 신호를 더 또렷하게 비춥니다.";
  return `${gem.meaning} ${gem.energy} ${position.pos_name}에 놓인 ${cardInfo.nameKo} ${direction}과 만나 ${gem.lens}를 중심에 놓고 ${bridge}`;
}

function buildGemDetail({ gem, position, cardInfo, direction }) {
  const reversed = direction === "역방향";
  const positionFocus = {
    1: "오늘 몸과 마음에 가장 먼저 떠오르는 신호를 맑히는 자리",
    2: "겉으로는 조용하지만 안쪽에서 선택을 흔드는 감정의 뿌리",
    3: "같은 흐름을 반복하지 않기 위해 낮춰야 할 반응",
    4: "오늘 실제로 손에 쥐어야 할 작은 처방",
    5: "가까운 시간 안에 열릴 가능성의 문턱",
  }[position.pos_id] || "카드가 놓인 자리의 핵심 결";
  const shadow = reversed
    ? `${gem.name}의 기운이 약해지면 ${cardInfo.nameKo}의 그림자는 망설임, 과잉 해석, 늦어진 결단으로 나타날 수 있습니다.`
    : `${gem.name}의 기운이 지나치게 강해지면 ${cardInfo.nameKo}의 빛은 속도, 확신, 기대 쪽으로 기울 수 있습니다.`;
  const alignment = reversed
    ? `${gem.lens}를 다시 묻고, 오늘은 크게 움직이기보다 마음이 흐려진 지점을 먼저 정돈하세요.`
    : `${gem.lens}를 기준으로 삼으면, 카드가 보여 준 가능성을 무리 없이 현실의 한 걸음으로 옮길 수 있습니다.`;
  return {
    gem_focus: `원석 작용: ${gem.name}은 ${positionFocus}에서 ${gem.core}의 결을 살립니다.`,
    gem_shadow: `그림자: ${shadow}`,
    gem_alignment: `정렬: ${alignment}`,
  };
}

function buildOneLine({ position, gem, cardInfo, direction }) {
  const candidates = {
    1: `${gem.name}이 현재의 신호를 맑힙니다`,
    2: `가려진 마음이 ${cardInfo.nameKo}${josa(cardInfo.nameKo, "으로/로")} 드러납니다`,
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
    gem_profile: `${gem.name}의 의미와 에너지: ${gem.meaning} ${gem.energy}`,
    body:
      `${gem.name}이 오늘의 바탕으로 놓이자 ${names}의 상징이 하나의 길로 이어집니다. ${first}에서 시작된 신호는 숨은 영향과 경고를 지나, 지금 필요한 처방을 더 선명하게 만듭니다. ${last}${josa(last, "이/가")} 보여 주는 가까운 문은 성급한 결론보다 ${gem.lens}를 따라 움직일 때 자연스럽게 열립니다.`,
    gem_message: `오늘 ${gem.name}이 당신에게 건네는 한 문장: ${gem.advice}`,
  };
}

function buildAiFortunePrompt(readingData) {
  const cardLines = readingData.cards.map((card) => [
    `${card.pos_id}. ${card.pos_name}`,
    `카드: ${card.card_name} ${card.direction}`,
    `원석 리딩: ${card.gem_reading}`,
    card.gem_focus,
    card.gem_shadow,
    card.gem_alignment,
    `카드 리딩: ${card.reading}`,
    `한 줄 신호: ${card.one_line}`,
  ].join("\n")).join("\n\n");

  const positionOutline = readingData.cards
    .map((card) => `${card.pos_id}) ${card.pos_name} — ${card.position_role}`)
    .join(" / ");

  return [
    "당신은 원석 에너지와 웨이트-스미스 타로를 함께 읽는 전문 타로 리더입니다.",
    "아래 원석 소울 타로의 흐름을 이어, 사용자가 오늘 마음에 지니고 갈 수 있는 상담문을 작성해 주세요.",
    "원석은 만능 부적이나 치료 도구가 아니라 감정과 선택을 정렬하는 상징입니다. 원석의 결을 카드 의미 위에 억지로 덮지 말고, 카드가 보여 준 현실 흐름과 자연스럽게 엮습니다.",
    "문체는 전문적이고 신비로우며 감정적으로 자연스럽게 유지합니다. 차가운 안내문, 판정식 표현, 기능 설명처럼 보이는 문장은 피합니다.",
    "연이는 등장하지 않습니다. 불안을 키우는 단정, 의료/법률/투자 확정 판단, 공포 자극, 같은 비유의 반복은 쓰지 않습니다.",
    // 예전에는 "사랑과 관계 / 일과 재물"을 목차로 못 박아, 카드가 그 얘기를 하지 않아도
    // 두 도메인이 매번 강제로 등장했다. 이제 실제로 뽑힌 자리를 따라간다.
    `출력은 뽑힌 자리의 순서를 그대로 따릅니다: ${positionOutline}. 마지막에 "원석이 건네는 마지막 문장"을 덧붙입니다.`,
    "각 자리는 그 자리의 역할이 묻는 것에만 답합니다. 카드가 가리키지 않는 영역(연애, 금전, 직업 등)을 목차를 채우려고 끌어오지 마세요.",
    "각 항목은 2~4문장으로 쓰고, 원석의 의미와 에너지가 카드 해석 안에 자연스럽게 흐르게 합니다. 조율이 필요한 신호는 겁주는 결론이 아니라 현실적인 행동으로 씁니다.",
    "",
    buildTopicLockPromptBlock("general"),
    "",
    `선택 원석: ${readingData.gem_name}`,
    readingData.synthesis.gem_profile,
    "",
    "카드 흐름",
    cardLines,
    "",
    "종합 흐름",
    readingData.synthesis.body,
    readingData.synthesis.gem_message,
  ].join("\n");
}

function buildReadingPlainText(readingData) {
  const lines = [];
  lines.push(`${readingData.gem_name}이 전하는 오늘의 완성된 메시지`);
  lines.push(readingData.synthesis.gem_profile);
  lines.push(readingData.synthesis.body);
  lines.push(readingData.synthesis.gem_message);
  for (const card of readingData.cards) {
    lines.push(`${card.pos_id}. ${card.pos_name} · ${card.card_name} ${card.direction}`);
    lines.push(card.gem_reading);
    lines.push(card.gem_focus);
    lines.push(card.gem_shadow);
    lines.push(card.gem_alignment);
    lines.push(card.reading);
    lines.push(card.one_line);
  }
  lines.push("AI 추가 운세 프롬프트");
  lines.push(readingData.ai_fortune_prompt);
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
    const meaningByPos = crystalCardMeaning(drawnCard.code, drawnCard.orientation);
    const cardMeaning = meaningByPos[position.pos_id] || "";
    const gemDetail = buildGemDetail({ gem, position, cardInfo, direction });
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
      reading: buildReadingText({ gem, position, cardInfo, direction, cardMeaning }),
      gem_meaning: gem.meaning,
      gem_energy: gem.energy,
      gem_reading: buildGemReading({ gem, position, cardInfo, direction }),
      ...gemDetail,
      one_line: buildOneLine({ position, gem, cardInfo, direction }),
    };
  });

  const readingData = {
    gem: gemType,
    gem_name: gem.name,
    gem_color: gem.color,
    gem_glow: gem.glow,
    gem_meaning: gem.meaning,
    gem_energy: gem.energy,
    intro: gem.intro,
    cards,
    synthesis: buildSynthesis(gem, cards),
    prompt_version: "crystal-soul-v3",
  };
  readingData.ai_fortune_prompt = buildAiFortunePrompt(readingData);

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
