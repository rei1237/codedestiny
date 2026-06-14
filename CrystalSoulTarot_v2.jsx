import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCoinGate } from "./app/hooks/useCoinGate";

const CRYSTAL_COST = 50;

const FLOWER_ADMIN_TOKEN_RE = /^[A-Za-z0-9_-]{20,}\.[0-9a-f]{64}$/;

const GEMSTONES = [
  {
    id: "tigers-eye",
    name: "호안석",
    color: "#c8960c",
    glow: "#daa520",
    keywords: ["결단", "보호", "현실 판단"],
    meaning: "흔들린 판단을 기준의 빛으로 가라앉히는 원석",
  },
  {
    id: "rose-quartz",
    name: "로즈 쿼츠",
    color: "#e8789a",
    glow: "#ff69b4",
    keywords: ["치유", "수용", "애정"],
    meaning: "관계에서 굳은 감정을 풀고 대화의 온도를 회복시키는 원석",
  },
  {
    id: "amethyst",
    name: "애머지스트",
    color: "#9b6fd4",
    glow: "#b57bee",
    keywords: ["통찰", "직관", "정화"],
    meaning: "복잡한 감정과 생각을 정리해 본질을 보게 하는 원석",
  },
  {
    id: "citrine",
    name: "시트린",
    color: "#e8b830",
    glow: "#ffd700",
    keywords: ["풍요", "활력", "자기표현"],
    meaning: "작은 활력을 기회와 자신감의 빛으로 밝히는 원석",
  },
  {
    id: "lapis",
    name: "라피스 라줄리",
    color: "#2856b0",
    glow: "#4169e1",
    keywords: ["전략", "판단력", "진실"],
    meaning: "보이지 않는 구조를 읽고 장기 전략을 세우게 하는 원석",
  },
  {
    id: "black-tourmaline",
    name: "블랙 토르말린",
    color: "#5a6070",
    glow: "#708090",
    keywords: ["보호", "경계", "정리"],
    meaning: "소모적 자극을 차단하고 관계 에너지의 경계를 세우는 원석",
  },
  {
    id: "green-fluorite",
    name: "그린 플로라이트",
    color: "#2e9e5e",
    glow: "#3cb371",
    keywords: ["정리", "균형", "회복"],
    meaning: "흩어진 선택지를 정돈해 우선순위를 세우는 원석",
  },
];

const TOPICS = [
  {
    id: "overall",
    title: "전체 흐름 · 오늘의 메시지",
    subtitle: "오늘의 핵심, 우선순위, 마지막 조언을 한 번에 정리합니다.",
    icon: "☉",
    themeCrystal: "애머지스트",
    themeKeywords: ["정리", "우선순위", "방향성"],
    spread: [
      { order: 1, title: "오늘의 핵심 기운", question: "오늘 가장 먼저 느껴야 할 흐름은 무엇인가?" },
      { order: 2, title: "지금 눈앞의 주제", question: "지금 즉시 다뤄야 할 중심 문제는 무엇인가?" },
      { order: 3, title: "흐름을 막는 요소", question: "에너지 흐름을 흔드는 변수는 무엇인가?" },
      { order: 4, title: "오늘의 선택", question: "오늘 어떤 태도와 선택이 도움이 되는가?" },
      { order: 5, title: "마무리 메시지", question: "오늘의 흐름이 남기는 최종 메시지는 무엇인가?" },
    ],
  },
  {
    id: "wealth",
    title: "재물 · 사업",
    subtitle: "돈의 흐름, 사업의 기회, 현실적 결단을 비춰봅니다.",
    icon: "◆",
    themeCrystal: "호안석",
    themeKeywords: ["수익 흐름", "리스크", "실행"],
    spread: [
      { order: 1, title: "현재 재물운", question: "지금 돈과 사업의 흐름은 어떤 상태인가?" },
      { order: 2, title: "기회·가능성", question: "어디에서 수익과 성장의 기회가 열리는가?" },
      { order: 3, title: "방해 요소", question: "돈의 흐름을 막는 습관이나 외부 변수는 무엇인가?" },
      { order: 4, title: "조언의 방향", question: "현실적으로 어떤 선택을 해야 하는가?" },
      { order: 5, title: "최종 결과", question: "이 흐름이 어떤 재물·사업 결과로 이어질 가능성이 큰가?" },
    ],
  },
  {
    id: "love",
    title: "연애 · 감정",
    subtitle: "마음의 온도, 끌림, 관계의 감정선을 읽습니다.",
    icon: "♡",
    themeCrystal: "로즈 쿼츠",
    themeKeywords: ["감정 온도", "표현", "균형"],
    spread: [
      { order: 1, title: "현재 감정 상태", question: "내 마음 또는 관계의 감정 온도는 어떤가?" },
      { order: 2, title: "상대 또는 인연의 기류", question: "상대나 인연의 에너지는 어떻게 흐르는가?" },
      { order: 3, title: "감정의 방해 요소", question: "사랑을 어렵게 만드는 내면의 패턴은 무엇인가?" },
      { order: 4, title: "마음의 조언", question: "지금 어떤 태도로 사랑을 바라봐야 하는가?" },
      { order: 5, title: "관계의 가능성", question: "앞으로 감정 흐름은 어디로 향하는가?" },
    ],
  },
  {
    id: "reunion",
    title: "재회 · 인연",
    subtitle: "끊어진 듯 남아 있는 인연의 실과 가능성을 봅니다.",
    icon: "∞",
    themeCrystal: "애머지스트",
    themeKeywords: ["미련", "재접근", "회복 조건"],
    spread: [
      { order: 1, title: "남아 있는 인연의 온도", question: "두 사람 사이에 아직 남은 감정은 무엇인가?" },
      { order: 2, title: "상대의 숨은 마음", question: "상대가 겉으로 드러내지 않는 속마음은 무엇인가?" },
      { order: 3, title: "재회를 막는 이유", question: "다시 이어지기 어려운 핵심 원인은 무엇인가?" },
      { order: 4, title: "다가갈 방법", question: "지금 내가 취해야 할 태도는 무엇인가?" },
      { order: 5, title: "재회 가능성", question: "이 인연은 다시 연결될 가능성이 있는가?" },
    ],
  },
  {
    id: "move",
    title: "이동수 · 변화",
    subtitle: "이사, 여행, 환경 변화, 새로운 흐름의 징조를 읽습니다.",
    icon: "➤",
    themeCrystal: "라피스 라줄리",
    themeKeywords: ["타이밍", "환경 변화", "새 출발"],
    spread: [
      { order: 1, title: "현재 변화의 기운", question: "지금 내 삶은 움직일 준비가 되어 있는가?" },
      { order: 2, title: "이동의 기회", question: "이사, 여행, 환경 변화의 좋은 흐름은 어디에 있는가?" },
      { order: 3, title: "변화를 막는 요소", question: "움직임을 지연시키는 현실적·심리적 이유는 무엇인가?" },
      { order: 4, title: "움직임의 조언", question: "지금은 기다려야 하는가, 움직여야 하는가?" },
      { order: 5, title: "변화 이후의 흐름", question: "움직인 뒤 삶은 어떤 방향으로 바뀌는가?" },
    ],
  },
  {
    id: "career",
    title: "직업 · 진로",
    subtitle: "직업운, 진로 선택, 성장 방향을 비춰봅니다.",
    icon: "✦",
    themeCrystal: "그린 플로라이트",
    themeKeywords: ["진로 선택", "성장", "평가"],
    spread: [
      { order: 1, title: "현재 직업운", question: "현재 일과 진로의 에너지는 어떤가?" },
      { order: 2, title: "성장 가능성", question: "어떤 방향에서 커리어 기회가 열리는가?" },
      { order: 3, title: "진로의 장애물", question: "내 직업 흐름을 막는 가장 큰 요인은 무엇인가?" },
      { order: 4, title: "선택의 조언", question: "지금 어떤 선택과 준비가 필요한가?" },
      { order: 5, title: "진로의 결과", question: "이 흐름은 어떤 커리어 결과로 이어지는가?" },
    ],
  },
  {
    id: "health",
    title: "건강 · 에너지",
    subtitle: "몸과 마음의 에너지 상태, 회복의 방향을 살핍니다.",
    icon: "✿",
    themeCrystal: "시트린",
    themeKeywords: ["생활 리듬", "회복", "감정 피로"],
    spread: [
      { order: 1, title: "현재 에너지 상태", question: "몸과 마음의 에너지는 어떤 상태인가?" },
      { order: 2, title: "회복 가능성", question: "어디에서 회복의 힘이 생기는가?" },
      { order: 3, title: "에너지 소모 원인", question: "나를 지치게 만드는 핵심 원인은 무엇인가?" },
      { order: 4, title: "몸과 마음의 조언", question: "지금 어떤 회복 방식이 필요한가?" },
      { order: 5, title: "회복의 흐름", question: "앞으로 에너지는 어떻게 회복될 가능성이 큰가?" },
    ],
  },
  {
    id: "relation",
    title: "대인관계",
    subtitle: "주변 사람들과의 기류, 갈등, 신뢰의 흐름을 읽습니다.",
    icon: "⊙",
    themeCrystal: "블랙 토르말린",
    themeKeywords: ["신뢰", "경계", "갈등 조율"],
    spread: [
      { order: 1, title: "현재 관계의 기류", question: "주변 인간관계의 에너지는 어떤가?" },
      { order: 2, title: "도움이 되는 인연", question: "나에게 힘이 되는 사람이나 관계는 무엇인가?" },
      { order: 3, title: "갈등의 씨앗", question: "관계를 어렵게 만드는 말, 태도, 오해는 무엇인가?" },
      { order: 4, title: "관계 조율의 조언", question: "어떻게 말하고 행동해야 관계가 정리되는가?" },
      { order: 5, title: "관계의 최종 흐름", question: "이 인간관계는 어떤 방향으로 흘러갈 가능성이 큰가?" },
    ],
  },
];

const TAROT_CARDS = [
  "The Fool", "The Magician", "The High Priestess", "The Empress", "The Emperor",
  "The Hierophant", "The Lovers", "The Chariot", "Strength", "The Hermit",
  "Wheel of Fortune", "Justice", "The Hanged Man", "Death", "Temperance",
  "The Devil", "The Tower", "The Star", "The Moon", "The Sun",
  "Judgement", "The World", "Ace of Wands", "Two of Wands", "Three of Wands",
  "Five of Wands", "Seven of Wands", "Nine of Wands", "King of Wands",
  "Ace of Cups", "Three of Cups", "Five of Cups", "Seven of Cups", "Nine of Cups",
  "Page of Cups", "Knight of Cups", "Queen of Cups", "King of Cups",
  "Ace of Swords", "Three of Swords", "Five of Swords", "Seven of Swords",
  "Nine of Swords", "Page of Swords", "Queen of Swords", "King of Swords",
  "Ace of Pentacles", "Three of Pentacles", "Five of Pentacles", "Seven of Pentacles",
  "Nine of Pentacles", "Page of Pentacles", "Queen of Pentacles", "King of Pentacles",
];

const CARD_KR = {
  "The Fool": "광대",
  "The Magician": "마법사",
  "The High Priestess": "여사제",
  "The Empress": "여황제",
  "The Emperor": "황제",
  "The Hierophant": "교황",
  "The Lovers": "연인",
  "The Chariot": "전차",
  Strength: "힘",
  "The Hermit": "은자",
  "Wheel of Fortune": "운명의 수레바퀴",
  Justice: "정의",
  "The Hanged Man": "매달린 남자",
  Death: "죽음",
  Temperance: "절제",
  "The Devil": "악마",
  "The Tower": "탑",
  "The Star": "별",
  "The Moon": "달",
  "The Sun": "태양",
  Judgement: "심판",
  "The World": "세계",
  "Ace of Wands": "완드 에이스",
  "Two of Wands": "완드 2",
  "Three of Wands": "완드 3",
  "Five of Wands": "완드 5",
  "Seven of Wands": "완드 7",
  "Nine of Wands": "완드 9",
  "King of Wands": "완드 킹",
  "Ace of Cups": "컵 에이스",
  "Three of Cups": "컵 3",
  "Five of Cups": "컵 5",
  "Seven of Cups": "컵 7",
  "Nine of Cups": "컵 9",
  "Page of Cups": "컵 시종",
  "Knight of Cups": "컵 기사",
  "Queen of Cups": "컵 여왕",
  "King of Cups": "컵 킹",
  "Ace of Swords": "소드 에이스",
  "Three of Swords": "소드 3",
  "Five of Swords": "소드 5",
  "Seven of Swords": "소드 7",
  "Nine of Swords": "소드 9",
  "Page of Swords": "소드 시종",
  "Queen of Swords": "소드 여왕",
  "King of Swords": "소드 킹",
  "Ace of Pentacles": "펜타클 에이스",
  "Three of Pentacles": "펜타클 3",
  "Five of Pentacles": "펜타클 5",
  "Seven of Pentacles": "펜타클 7",
  "Nine of Pentacles": "펜타클 9",
  "Page of Pentacles": "펜타클 시종",
  "Queen of Pentacles": "펜타클 여왕",
  "King of Pentacles": "펜타클 킹",
};

function isAdminSessionClient() {
  if (typeof window === "undefined") return false;
  try {
    if (window.__cdAdminBypass) return true;
  } catch (e) {}
  try {
    const userRaw = localStorage.getItem("fortune_auth_user");
    if (userRaw) {
      const user = JSON.parse(userRaw);
      if (String(user?.role || "").toLowerCase() === "admin") return true;
    }
  } catch (e) {}
  try {
    const userRaw = localStorage.getItem("cd_user");
    if (userRaw) {
      const user = JSON.parse(userRaw);
      if (String(user?.role || "").toLowerCase() === "admin") return true;
    }
  } catch (e) {}
  try {
    const roleMatch = document.cookie.match(/(?:^|;\s*)cd_role=([^;]+)/);
    if (roleMatch && decodeURIComponent(roleMatch[1]).toLowerCase() === "admin") return true;
  } catch (e) {}
  try {
    const tok = String(sessionStorage.getItem("flower_admin_token") || "");
    if (FLOWER_ADMIN_TOKEN_RE.test(tok)) return true;
  } catch (e) {}
  try {
    const tok = String(localStorage.getItem("flower_admin_token") || "");
    if (FLOWER_ADMIN_TOKEN_RE.test(tok)) return true;
  } catch (e) {}
  return false;
}

function pickUniqueCards(count) {
  const pool = [...TAROT_CARDS];
  const picked = [];
  while (picked.length < count && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    const [card] = pool.splice(index, 1);
    picked.push(card);
  }
  return picked;
}

function findGemByName(name) {
  return GEMSTONES.find((gem) => gem.name === name) || GEMSTONES[0];
}

function findGemById(id) {
  return GEMSTONES.find((gem) => gem.id === id) || GEMSTONES[0];
}

function StarField() {
  const stars = useRef(Array.from({ length: 55 }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 1.4 + 0.4,
    opacity: Math.random() * 0.35 + 0.08,
    dur: Math.random() * 4 + 3,
    delay: Math.random() * 6,
  }))).current;

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
      {stars.map((star, idx) => (
        <div
          key={`star-${idx}`}
          style={{
            position: "absolute",
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            borderRadius: "50%",
            background: "#d4c5a9",
            opacity: star.opacity,
            animation: `cdGlowPulse ${star.dur}s ${star.delay}s ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  );
}

function buildAssignments(coreGemId, cardsLength) {
  const ids = GEMSTONES.map((gem) => gem.id);
  const assignments = {};
  for (let i = 0; i < cardsLength; i += 1) {
    if (i === 0) {
      assignments[i] = coreGemId;
      continue;
    }
    const fallback = ids[Math.floor(Math.random() * ids.length)];
    assignments[i] = fallback;
  }
  return assignments;
}

const LOCAL_CRYSTAL_TOPIC_LENSES = {
  overall: {
    axis: "오늘 가장 먼저 정리할 기준",
    risk: "여러 신호를 모두 붙잡으려는 마음",
    action: "가장 먼저 끝낼 일 하나를 정하기",
    oracle: "흐린 감각을 작은 결단으로 바꾸는 날입니다.",
  },
  wealth: {
    axis: "돈이 들어오고 나가는 조건",
    risk: "기대 수익만 보고 비용과 책임을 흐리는 태도",
    action: "지킬 돈과 움직일 돈을 분리하기",
    oracle: "재물의 문은 감이 아니라 조건을 밝히는 손끝에서 열립니다.",
  },
  love: {
    axis: "마음의 온도와 표현의 속도",
    risk: "감정을 증명하려는 조급함",
    action: "서운함을 비난이 아닌 요청으로 바꾸기",
    oracle: "사랑의 문은 강한 말보다 안전한 온도에서 열립니다.",
  },
  reunion: {
    axis: "남은 감정과 다시 만날 조건의 차이",
    risk: "변하지 않은 방식으로 다시 시작하려는 마음",
    action: "그리움과 실제 회복 조건을 나누어 적기",
    oracle: "다시 이어질 인연은 달라진 태도를 먼저 알아봅니다.",
  },
  move: {
    axis: "움직임의 욕구와 도착 이후의 현실 조건",
    risk: "준비되지 않은 변화에 기대를 모두 실어 버리는 태도",
    action: "이동 뒤에도 지킬 루틴 하나를 정하기",
    oracle: "좋은 변화는 도착한 뒤의 생활에서 증명됩니다.",
  },
  career: {
    axis: "역할, 실력, 평가 기준이 만나는 지점",
    risk: "비교와 불안 때문에 자신의 기준을 잃는 태도",
    action: "강점이 실제 성과로 이어지는 지점을 적기",
    oracle: "진로의 문은 오늘 끝낸 하나의 증거로 열립니다.",
  },
  health: {
    axis: "몸의 신호와 마음의 피로가 만나는 지점",
    risk: "무리를 정상으로 착각하고 피로를 미루는 태도",
    action: "오늘의 피로를 키우는 행동 하나를 멈추기",
    oracle: "회복의 문은 몸이 보낸 작은 신호를 존중할 때 열립니다.",
  },
  relation: {
    axis: "신뢰와 경계가 균형을 찾는 자리",
    risk: "모든 사람을 살피느라 자신의 선을 잃는 태도",
    action: "지켜야 할 경계와 건넬 수 있는 호의를 따로 정하기",
    oracle: "좋은 인연은 나를 잃지 않는 선 위에서 오래 머뭅니다.",
  },
};

function getLocalCrystalTopicLens(topicId) {
  return LOCAL_CRYSTAL_TOPIC_LENSES[topicId] || LOCAL_CRYSTAL_TOPIC_LENSES.overall;
}

function getLocalCardTone(cardName) {
  if (/Wands/i.test(cardName)) return "완드의 불빛은 의지와 행동의 속도를 묻습니다.";
  if (/Cups/i.test(cardName)) return "컵의 물결은 감정의 진심과 관계의 온도를 비춥니다.";
  if (/Swords/i.test(cardName)) return "소드의 바람은 말, 판단, 거리 두기의 기준을 세웁니다.";
  if (/Pentacles/i.test(cardName)) return "펜타클의 흙은 돈, 몸, 일상의 증거를 확인하게 합니다.";
  return "메이저 아르카나의 빛은 지금 흐름이 인생의 큰 축과 닿아 있음을 알립니다.";
}

function getLocalPositionRole(order) {
  const roles = {
    1: "현재 파동을 읽는 입구",
    2: "가능성이 열리는 통로",
    3: "반복 패턴을 드러내는 그림자",
    4: "현실 조언이 내려오는 손",
    5: "흐름이 향하는 마지막 문",
  };
  return roles[order] || roles[1];
}

function buildLocalFallback(topic, coreGem, cards) {
  const lens = getLocalCrystalTopicLens(topic.id);
  const lines = [];
  lines.push(`${topic.title} 크리스탈 소울 리딩`);
  lines.push(`핵심 원석: ${coreGem.name}`);
  lines.push(`상담 축: ${lens.axis}`);
  lines.push("");
  cards.forEach((card, idx) => {
    const spread = topic.spread[idx];
    const cardLabel = CARD_KR[card] || card;
    const positionRole = getLocalPositionRole(spread.order);
    lines.push(`${idx + 1}. ${spread.title}`);
    lines.push(`카드: ${cardLabel}`);
    lines.push(`질문: ${spread.question}`);
    lines.push(`${positionRole}에 놓인 ${cardLabel}는 ${lens.axis}을 다시 보라고 말합니다. ${getLocalCardTone(card)}`);
    lines.push(`${coreGem.name}의 ${coreGem.keywords.slice(0, 2).join(" · ")} 기운은 ${coreGem.meaning}입니다. 이 원석은 ${lens.risk}이 올라올 때 감정을 낮추고 판단의 손잡이를 되찾게 합니다.`);
    lines.push(`오늘의 조언은 ${lens.action}입니다. 결론을 서두르기보다, 확인 가능한 기준 1개와 실제 행동 1개를 분리해 적어 보세요.`);
    lines.push(`오늘의 의식: ${spread.title}와 연결된 작은 행동을 하나 끝내고, 끝낸 뒤의 감각을 메모로 남기세요.`);
    lines.push("");
  });
  lines.push("종합 조언");
  lines.push(`지금의 흐름은 막힘이 아니라 재정렬의 신호입니다. ${topic.title}에서는 ${lens.axis}이 가장 중요하고, ${coreGem.name}가 보여 주는 핵심은 "${coreGem.meaning}"입니다. ${lens.oracle} 추상적 기대보다 오늘 바로 확인할 수 있는 행동을 하나 남기는 쪽이 더 강하게 작동합니다.`);
  return lines.join("\n");
}

function useBodyLock(active) {
  useEffect(() => {
    if (!active || typeof document === "undefined") return undefined;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.classList.add("crystal-soul-active");
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.classList.remove("crystal-soul-active");
    };
  }, [active]);
}

function TopicCard({ topic, onSelect }) {
  const gem = findGemByName(topic.themeCrystal);
  return (
    <button
      type="button"
      onClick={() => onSelect(topic)}
      style={{
        width: "100%",
        textAlign: "left",
        borderRadius: 18,
        border: `1px solid ${gem.color}55`,
        background: `linear-gradient(160deg, rgba(255,255,255,.04), ${gem.color}18 42%, rgba(5,5,10,.96) 92%)`,
        padding: "18px 16px",
        boxShadow: `0 0 0 1px rgba(255,255,255,.04), 0 18px 48px ${gem.glow}1f`,
        color: "#f2e8da",
        cursor: "pointer",
        transition: "transform .24s ease, box-shadow .24s ease, border-color .24s ease",
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.transform = "translateY(-3px)";
        event.currentTarget.style.boxShadow = `0 0 0 1px rgba(255,255,255,.08), 0 24px 56px ${gem.glow}44`;
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.transform = "translateY(0)";
        event.currentTarget.style.boxShadow = `0 0 0 1px rgba(255,255,255,.04), 0 18px 48px ${gem.glow}1f`;
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 20, color: gem.glow }}>{topic.icon}</span>
        <span style={{ fontSize: 11, color: "#dac7aa", letterSpacing: ".08em" }}>{topic.themeCrystal}</span>
      </div>
      <div style={{ fontFamily: "Noto Serif KR,serif", fontSize: 18, lineHeight: 1.45, marginBottom: 8 }}>{topic.title}</div>
      <div style={{ fontSize: 12, color: "#c7b7a1", lineHeight: 1.65, marginBottom: 12 }}>{topic.subtitle}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {topic.themeKeywords.slice(0, 3).map((keyword) => (
          <span
            key={keyword}
            style={{
              fontSize: 11,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,.18)",
              padding: "3px 8px",
              color: "#e5d7c3",
              background: "rgba(255,255,255,.05)",
            }}
          >
            {keyword}
          </span>
        ))}
      </div>
    </button>
  );
}

function GemCard({ gem, selected, recommended, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(gem)}
      style={{
        position: "relative",
        width: "100%",
        borderRadius: 18,
        border: `1px solid ${selected ? gem.glow : recommended ? gem.color + "88" : "rgba(255,255,255,.08)"}`,
        background: selected
          ? `linear-gradient(160deg, ${gem.color}28, rgba(5,5,10,.96) 78%)`
          : recommended
            ? `linear-gradient(160deg, ${gem.color}18, rgba(5,5,10,.96) 80%)`
            : "rgba(255,255,255,.03)",
        padding: "16px 14px 14px",
        color: "#f4ebdd",
        cursor: "pointer",
        boxShadow: selected ? `0 0 0 1px rgba(255,255,255,.08), 0 20px 50px ${gem.glow}44` : `0 10px 28px rgba(0,0,0,.24)`,
        transition: "transform .22s ease, box-shadow .22s ease, border-color .22s ease",
        textAlign: "left",
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: gem.glow, boxShadow: `0 0 10px ${gem.glow}` }} />
          <span style={{ fontSize: 11, color: "#d9c7ab", letterSpacing: ".08em" }}>{selected ? "선택됨" : recommended ? "추천" : "원석"}</span>
        </div>
        <span style={{ fontSize: 18, color: gem.glow }}>✦</span>
      </div>
      <div style={{ fontFamily: "Noto Serif KR,serif", fontSize: 17, marginBottom: 6 }}>{gem.name}</div>
      <div style={{ fontSize: 11, color: "#d4c1a7", lineHeight: 1.6, marginBottom: 10 }}>{gem.meaning}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {gem.keywords.map((keyword) => (
          <span key={keyword} style={{ fontSize: 10, color: "#efe0c6", borderRadius: 999, padding: "3px 7px", border: "1px solid rgba(255,255,255,.14)" }}>
            {keyword}
          </span>
        ))}
      </div>
    </button>
  );
}

function ResultFlipCard({ section }) {
  return (
    <div
      className="cd-crystal-flip"
      style={{
        borderRadius: 14,
        minHeight: 132,
        perspective: 900,
      }}
    >
      <div
        className="cd-crystal-flip__inner"
        style={{
          position: "relative",
          width: "100%",
          minHeight: 132,
          transformStyle: "preserve-3d",
          transition: "transform .72s cubic-bezier(.4,0,.2,1)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,.12)",
            background: "linear-gradient(148deg,#140e18 0%,#1e1228 50%,#140e18 100%)",
            boxShadow: "0 10px 22px rgba(0,0,0,.28)",
            padding: 10,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 10, color: "#ceb89a" }}>{section.positionTitle}</div>
          <div style={{ fontSize: 12, color: "#f1e5d2" }}>{section.cardNameKo}</div>
          <div style={{ fontSize: 10, color: "#b9a689", lineHeight: 1.45 }}>
            {section.keywordVisual || `타로: ${(section.tarotKeywords || []).slice(0, 2).join(", ")}`}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,.16)",
            background: "rgba(255,255,255,.06)",
            boxShadow: "0 10px 24px rgba(0,0,0,.24)",
            padding: 10,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <div style={{ width: 36, height: 58, borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,.2)", background: "#111", flexShrink: 0 }}>
            {section.cardImageUrl ? (
              <img
                src={section.cardImageUrl}
                alt={section.cardNameKo}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : null}
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#c6b091", marginBottom: 2 }}>{section.orientation === "reversed" ? "역방향" : "정방향"}</div>
            <div style={{ fontSize: 10, color: "#c6b091", marginBottom: 3 }}>{section.crystalName}</div>
            <div style={{ fontSize: 10, color: "#b9a689", lineHeight: 1.45 }}>타로: {(section.tarotKeywords || []).slice(0, 2).join(", ")}</div>
            <div style={{ fontSize: 10, color: "#b9a689", lineHeight: 1.45 }}>원석: {(section.crystalKeywords || []).slice(0, 2).join(", ")}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReadingAccordion({ section, expanded, onToggle }) {
  const actionItems = Array.isArray(section.practicalActions) && section.practicalActions.length
    ? section.practicalActions
    : String(section.action || "")
        .split(" / ")
        .map((item) => item.trim())
        .filter(Boolean);

  return (
    <article style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 18, background: "rgba(11,11,18,.82)", overflow: "hidden", boxShadow: "0 12px 28px rgba(0,0,0,.22)" }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          textAlign: "left",
          background: "linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.015))",
          color: "#f0e3d1",
          border: "none",
          padding: "14px 14px 12px",
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 46, height: 76, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,.18)", background: "#111" }}>
              {section.cardImageUrl ? (
                <img
                  src={section.cardImageUrl}
                  alt={section.cardNameKo}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : null}
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#c9b390", marginBottom: 4 }}>{section.order}번 카드 · {section.positionTitle}</div>
              <div style={{ fontFamily: "Noto Serif KR,serif", fontSize: 16 }}>
                {section.cardNameKo} <span style={{ fontSize: 12, color: "#d7c7b0" }}>({section.orientation === "reversed" ? "역방향" : "정방향"})</span>
              </div>
              <div style={{ fontSize: 11, color: "#bba88d", marginTop: 4 }}>{section.crystalName}</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: "#d8c7af" }}>{expanded ? "접기" : "펼치기"}</div>
        </div>
      </button>

      {expanded && (
        <div style={{ padding: 14 }}>
          {section.keywordVisual ? (
            <p style={{ color: "#d9c6a9", fontSize: 12, lineHeight: 1.75, margin: "0 0 8px" }}>{section.keywordVisual}</p>
          ) : null}
          <p style={{ color: "#efe2d0", fontSize: 13, lineHeight: 1.9, margin: "0 0 12px" }}>{section.categoryReading}</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10, marginBottom: 12 }}>
            <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", padding: 12 }}>
              <div style={{ fontSize: 11, color: "#d7c3a4", marginBottom: 6 }}>한 줄 핵심</div>
              <div style={{ color: "#f5ebdc", fontSize: 13, lineHeight: 1.8 }}>{section.oneLineSummary}</div>
            </div>
            <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", padding: 12 }}>
              <div style={{ fontSize: 11, color: "#d7c3a4", marginBottom: 6 }}>원석 에너지</div>
              <div style={{ color: "#f5ebdc", fontSize: 13, lineHeight: 1.8 }}>{section.crystalEnergy}</div>
            </div>
            <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", padding: 12 }}>
              <div style={{ fontSize: 11, color: "#d7c3a4", marginBottom: 6 }}>카드가 보여주는 흐름</div>
              <div style={{ color: "#f5ebdc", fontSize: 13, lineHeight: 1.8 }}>{section.cardFlow}</div>
            </div>
            <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", padding: 12 }}>
              <div style={{ fontSize: 11, color: "#d7c3a4", marginBottom: 6 }}>지금의 심리</div>
              <div style={{ color: "#f5ebdc", fontSize: 13, lineHeight: 1.8 }}>{section.currentPulse}</div>
            </div>
            <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", padding: 12 }}>
              <div style={{ fontSize: 11, color: "#d7c3a4", marginBottom: 6 }}>조심할 점</div>
              <div style={{ color: "#f5ebdc", fontSize: 13, lineHeight: 1.8 }}>{section.caution}</div>
            </div>
            <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", padding: 12 }}>
              <div style={{ fontSize: 11, color: "#d7c3a4", marginBottom: 6 }}>좋게 살리는 방법</div>
              <div style={{ color: "#f5ebdc", fontSize: 13, lineHeight: 1.8 }}>{section.uplift}</div>
            </div>
          </div>

          <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", padding: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#d7c3a4", marginBottom: 6 }}>오늘의 의식</div>
            <ol style={{ margin: 0, paddingLeft: 18, color: "#f5ebdc", fontSize: 13, lineHeight: 1.8 }}>
              {actionItems.map((item, idx) => (
                <li key={`${idx}-${item}`}>{item}</li>
              ))}
            </ol>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
            <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", padding: 12 }}>
              <div style={{ fontSize: 11, color: "#d7c3a4", marginBottom: 6 }}>네오 한마디</div>
              <div style={{ color: "#f5ebdc", fontSize: 13, lineHeight: 1.8 }}>{section.neoLine}</div>
            </div>
            <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", padding: 12 }}>
              <div style={{ fontSize: 11, color: "#d7c3a4", marginBottom: 6 }}>연이 한마디</div>
              <div style={{ color: "#f5ebdc", fontSize: 13, lineHeight: 1.8 }}>{section.younLine}</div>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export default function CrystalSoulTarot() {
  const [stage, setStage] = useState("topic");
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedGem, setSelectedGem] = useState(null);
  const [selectedCards, setSelectedCards] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [readingPayload, setReadingPayload] = useState(null);
  const [readingText, setReadingText] = useState("");
  const [expandedSet, setExpandedSet] = useState(new Set([0]));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paid, setPaid] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [paidTxId, setPaidTxId] = useState("");
  const [syncEnergy, setSyncEnergy] = useState(0);
  const [isCharging, setIsCharging] = useState(false);
  const [syncParticles, setSyncParticles] = useState([]);
  const typeTimerRef = useRef(null);
  const chargeAreaRef = useRef(null);
  const lastPointRef = useRef(null);
  const particleIdRef = useRef(0);
  const { ensurePaidAccess, isPaying } = useCoinGate();

  useBodyLock(true);

  const coreGem = useMemo(() => {
    if (!selectedTopic) return null;
    return selectedGem || findGemByName(selectedTopic.themeCrystal);
  }, [selectedGem, selectedTopic]);

  const resetReadingState = useCallback(() => {
    if (typeTimerRef.current) {
      window.clearInterval(typeTimerRef.current);
      typeTimerRef.current = null;
    }
    setReadingPayload(null);
    setReadingText("");
    setExpandedSet(new Set([0]));
    setLoading(false);
    setError("");
    setPaid(false);
    setPaying(false);
    setPayError("");
    setPaidTxId("");
  }, []);

  const resetAll = useCallback(() => {
    setStage("topic");
    setSelectedTopic(null);
    setSelectedGem(null);
    setSelectedCards([]);
    setAssignments({});
    setSyncEnergy(0);
    setIsCharging(false);
    lastPointRef.current = null;
    resetReadingState();
  }, [resetReadingState]);

  const onSelectTopic = useCallback((topic) => {
    setSelectedTopic(topic);
    setSelectedGem(findGemByName(topic.themeCrystal));
    setSelectedCards([]);
    setAssignments({});
    setSyncEnergy(0);
    setIsCharging(false);
    lastPointRef.current = null;
    setStage("gem");
    resetReadingState();
  }, [resetReadingState]);

  const onSelectGem = useCallback((gem) => {
    if (!selectedTopic) return;
    const cards = pickUniqueCards(5);
    setSelectedGem(gem);
    setSelectedCards(cards);
    setAssignments(buildAssignments(gem.id, cards.length));
    setSyncEnergy(0);
    setIsCharging(false);
    lastPointRef.current = null;
    setStage("sync");
    resetReadingState();
  }, [resetReadingState, selectedTopic]);

  const autoRefundCrystal = useCallback(async () => {
    const txId = String(paidTxId || "").trim();
    if (!txId) return false;
    const token = localStorage.getItem("fortune_auth_token") || localStorage.getItem("cdToken") || "";
    if (!token) return false;

    const adminToken = (() => {
      try {
        const raw = String(sessionStorage.getItem("flower_admin_token") || localStorage.getItem("flower_admin_token") || "");
        return FLOWER_ADMIN_TOKEN_RE.test(raw) ? raw : "";
      } catch (e) {
        return "";
      }
    })();

    const adminTier = (() => {
      try {
        return String(localStorage.getItem("flower_admin_test_tier") || "").toLowerCase();
      } catch (e) {
        return "";
      }
    })();

    try {
      const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };
      if (adminToken) headers["x-admin-token"] = adminToken;
      if (adminToken && (adminTier === "standard" || adminTier === "premium" || adminTier === "vvip")) {
        headers["x-admin-subscription-tier"] = adminTier;
      }

      const rr = await fetch("/api/billing/refund", {
        method: "POST",
        headers,
        body: JSON.stringify({
          cost: CRYSTAL_COST,
          reason: "크리스탈 소울 타로 API 실패 자동 환불",
          featureKey: "tarot-crystal-soul-reading",
          sourceTransactionId: txId,
          requestId: `refund:tarot-crystal-soul:${txId}`,
        }),
      });

      const rd = await rr.json().catch(() => ({}));
      if (!rr.ok && !rd?.alreadyRefunded) return false;
      if (rd?.user && typeof rd.user.points === "number") {
        try {
          const user = JSON.parse(localStorage.getItem("fortune_auth_user") || "null") || {};
          user.points = Number(rd.user.points);
          localStorage.setItem("fortune_auth_user", JSON.stringify(user));
        } catch (e) {}
      }
      setPaidTxId("");
      setPaid(false);
      return true;
    } catch (e) {
      return false;
    }
  }, [paidTxId]);

  const playTypewriter = useCallback((text) => {
    const fullText = String(text || "").trim();
    if (!fullText) {
      setLoading(false);
      return;
    }
    setStage("result");
    if (typeTimerRef.current) window.clearInterval(typeTimerRef.current);
    let index = 0;
    setReadingText("");
    typeTimerRef.current = window.setInterval(() => {
      index += 4;
      if (index >= fullText.length) {
        setReadingText(fullText);
        window.clearInterval(typeTimerRef.current);
        typeTimerRef.current = null;
        setLoading(false);
      } else {
        setReadingText(fullText.slice(0, index));
      }
    }, 22);
  }, []);

  useEffect(() => {
    return () => {
      if (typeTimerRef.current) window.clearInterval(typeTimerRef.current);
    };
  }, []);

  const requestReading = useCallback(async () => {
    if (!selectedTopic || !coreGem || selectedCards.length !== 5) return;
    setStage("result");
    setLoading(true);
    setError("");
    setReadingPayload(null);
    setReadingText("");

    try {
      const res = await fetch("/api/tarot/crystal-soul", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: {
            id: selectedTopic.id,
            name: selectedTopic.title,
            spread: { type: "cross5", positions: selectedTopic.spread.map((item) => item.title) },
            hint: selectedTopic.subtitle,
          },
          gem: { id: coreGem.id, name: coreGem.name, theme: coreGem.meaning },
          cards: selectedCards,
          assignments,
          positions: selectedTopic.spread.map((item) => item.title),
          gemstonesMap: Object.fromEntries(GEMSTONES.map((gem) => [gem.id, { name: gem.name, theme: gem.meaning }])) ,
        }),
      });

      const data = await res.json().catch(() => ({}));
      const payload = data?.readingData && Array.isArray(data.readingData?.sections) ? data.readingData : null;
      const text = String(data?.reading || "").trim() || buildLocalFallback(selectedTopic, coreGem, selectedCards);

      if (payload) {
        setReadingPayload(payload);
        setStage("result");
        setLoading(false);
      } else {
        playTypewriter(text);
      }
    } catch (e) {
      const fallback = buildLocalFallback(selectedTopic, coreGem, selectedCards);
      playTypewriter(fallback);
      if (!fallback) {
        await autoRefundCrystal();
        setError("크리스탈 문을 열지 못했습니다. 잠시 후 다시 시도해 주세요.");
        setLoading(false);
      }
    }
  }, [assignments, autoRefundCrystal, coreGem, playTypewriter, selectedCards, selectedTopic]);

  const handlePay = useCallback(async () => {
    if (!selectedTopic) return;
    setPayError("");
    setPaying(true);

    const adminMode = isAdminSessionClient();
    if (adminMode) {
      setPaid(true);
      await requestReading();
      setPaying(false);
      return;
    }

    try {
      const paymentResult = await ensurePaidAccess({
        featureKey: "tarot-crystal-soul-reading",
        reason: "크리스탈 소울 타로 리딩",
        forceDeduct: true,
        requestId: `tarot-crystal-soul-reading:req:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        onPaid: async ({ transactionId }) => {
          setPaidTxId(String(transactionId || ""));
          setPaid(true);
          await requestReading();
        },
      });

      if (!paymentResult.ok) {
        if (paymentResult.code === "AUTH_REQUIRED") {
          setPayError("로그인이 필요합니다.");
          setTimeout(() => {
            window.location.href = "/login?next=%2Ftarot%2Fcrystal-soul";
          }, 600);
          return;
        }
        setPayError(paymentResult.message || "결제를 완료하지 못했습니다.");
        return;
      }
    } catch (e) {
      setPayError("크리스탈 문을 여는 과정에서 오류가 발생했습니다.");
    } finally {
      setPaying(false);
    }
  }, [ensurePaidAccess, requestReading, selectedTopic]);

  const toggleSection = useCallback((index) => {
    setExpandedSet((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const handleChargeStart = useCallback((event) => {
    if (!chargeAreaRef.current || stage !== "sync") return;
    setIsCharging(true);
    lastPointRef.current = { x: event.clientX, y: event.clientY };
  }, [stage]);

  const handleChargeMove = useCallback((event) => {
    if (!isCharging || !chargeAreaRef.current || stage !== "sync") return;
    const rect = chargeAreaRef.current.getBoundingClientRect();
    const current = { x: event.clientX, y: event.clientY };
    const last = lastPointRef.current || current;
    const dx = Math.abs(current.x - last.x);
    const dy = Math.abs(current.y - last.y);
    lastPointRef.current = current;
    const delta = Math.min(100 - syncEnergy, Math.max(1.5, (dx + dy) * 0.42));
    if (delta <= 0) return;

    const particleId = ++particleIdRef.current;
    const px = current.x - rect.left;
    const py = current.y - rect.top;
    const tx = (Math.random() - 0.5) * 80;
    const ty = -(Math.random() * 60 + 18);
    setSyncParticles((prev) => [...prev.slice(-24), { id: particleId, x: px, y: py, tx, ty }]);
    window.setTimeout(() => {
      setSyncParticles((prev) => prev.filter((p) => p.id !== particleId));
    }, 920);

    setSyncEnergy((prev) => Math.min(100, prev + delta));
    if (syncEnergy + delta >= 99) {
      setIsCharging(false);
      lastPointRef.current = null;
    }
    if (rect) {
      const inBounds = current.x >= rect.left && current.x <= rect.right && current.y >= rect.top && current.y <= rect.bottom;
      if (!inBounds) {
        setIsCharging(false);
        lastPointRef.current = null;
      }
    }
  }, [isCharging, stage, syncEnergy]);

  const handleChargeEnd = useCallback(() => {
    setIsCharging(false);
    lastPointRef.current = null;
  }, []);

  const selectedGemSource = coreGem || (selectedTopic ? findGemByName(selectedTopic.themeCrystal) : null);
  const syncReady = syncEnergy >= 88;

  const stageLabel = stage === "topic"
    ? "주제 선택"
    : stage === "gem"
      ? "원석 선택"
      : stage === "sync"
        ? "원석 올리기"
      : "빛의 문 열기";

  const summaryLine = useMemo(() => {
    if (!readingPayload?.summary) return "";
    const summary = readingPayload.summary;
    return summary.oracleMessage || summary.opportunity || summary.risk || summary.overallFlow || "";
  }, [readingPayload]);

  return (
    <section
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        minHeight: "100dvh",
        overflowY: "auto",
        overscrollBehavior: "contain",
        background: "radial-gradient(circle at 50% -10%, #271a3d 0%, #0b0914 46%, #040407 100%)",
        color: "#f5ebdc",
      }}
    >
      <style>{`
        @keyframes cdGlowPulse { 0%, 100% { opacity: .45; } 50% { opacity: 1; } }
        @keyframes cdFadeUp { from { opacity: 0; transform: translateY(18px);} to { opacity: 1; transform: translateY(0);} }
        @keyframes cdRippleOut { 0% { transform: scale(.3); opacity: .9; } 100% { transform: scale(4.6); opacity: 0; } }
        @keyframes cdParticleUp { 0% { opacity: 1; transform: translate(0,0) scale(1); } 100% { opacity: 0; transform: translate(var(--tx),var(--ty)) scale(0); } }
        .cd-scroll-surface { scrollbar-width: thin; scrollbar-color: rgba(214,174,96,.62) rgba(255,255,255,.08); }
        .cd-scroll-surface::-webkit-scrollbar { width: 8px; height: 8px; }
        .cd-scroll-surface::-webkit-scrollbar-track { background: rgba(255,255,255,.08); border-radius: 999px; }
        .cd-scroll-surface::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(223,189,121,.85), rgba(166,123,56,.72));
          box-shadow: 0 0 10px rgba(223,189,121,.45);
        }
        .cd-crystal-flip:hover .cd-crystal-flip__inner,
        .cd-crystal-flip:focus-within .cd-crystal-flip__inner { transform: rotateY(180deg); }
        .cd-result-enter { animation: cdFadeUp .75s cubic-bezier(.16,1,.3,1) both; }
        @media (max-width: 920px) {
          .cd-result-header-grid { grid-template-columns: minmax(0,1fr) !important; }
          .cd-sync-grid { grid-template-columns: minmax(0,1fr) !important; }
        }
      `}</style>
      <StarField />
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: -120, left: "14%", width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(130,93,196,.18), transparent 68%)" }} />
        <div style={{ position: "absolute", top: "22%", right: "8%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(218,165,32,.14), transparent 70%)" }} />
      </div>
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "18px 16px calc(56px + env(safe-area-inset-bottom))",
          minHeight: "100dvh",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <button
            type="button"
            onClick={selectedTopic ? resetAll : () => window.history.back()}
            style={{
              border: "1px solid rgba(255,255,255,.22)",
              borderRadius: 999,
              background: "rgba(0,0,0,.32)",
              color: "#e8d8c2",
              fontSize: 12,
              padding: "7px 11px",
              cursor: "pointer",
            }}
          >
            {selectedTopic ? "다른 카테고리" : "뒤로가기"}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <div style={{ fontSize: 11, color: "#ceb89a", letterSpacing: ".14em" }}>CRYSTAL SOUL TAROT</div>
            <div style={{ fontSize: 11, color: "#f1dcc0", borderRadius: 999, border: "1px solid rgba(255,255,255,.15)", padding: "4px 10px", background: "rgba(255,255,255,.05)" }}>{stageLabel}</div>
          </div>
        </div>

        {!selectedTopic && (
          <div>
            <header style={{ marginBottom: 22 }}>
              <h1 style={{ fontFamily: "Noto Serif KR,serif", fontSize: "clamp(24px,4.6vw,38px)", fontWeight: 400, lineHeight: 1.45, marginBottom: 10 }}>
                손끝의 원석이 카드의 속삭임을 깨우는 타로
              </h1>
              <p style={{ color: "#d6c4ab", fontSize: 13, lineHeight: 1.85, maxWidth: 720 }}>
                주제를 고른 뒤 원석을 선택하고 빛을 채우면, 카드와 원석이 함께 말하는 깊은 오라클 리딩이 열립니다.
              </p>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
              {TOPICS.map((topic) => (
                <TopicCard key={topic.id} topic={topic} onSelect={onSelectTopic} />
              ))}
            </div>
          </div>
        )}

        {selectedTopic && stage === "gem" && (
          <div>
            <header style={{ border: `1px solid ${(selectedGemSource?.color || "#c8960c")}66`, borderRadius: 20, background: "rgba(8,8,14,.82)", padding: 16, marginBottom: 16, boxShadow: `0 0 36px ${(selectedGemSource?.glow || "#daa520")}22` }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                <div style={{ minWidth: 220 }}>
                  <div style={{ color: "#d8c5a9", fontSize: 11, marginBottom: 6 }}>선택한 문</div>
                  <div style={{ fontFamily: "Noto Serif KR,serif", fontSize: 24, marginBottom: 8 }}>{selectedTopic.title}</div>
                  <div style={{ color: "#cbb69a", fontSize: 12, lineHeight: 1.75 }}>{selectedTopic.subtitle}</div>
                </div>
                <div style={{ minWidth: 220 }}>
                  <div style={{ color: "#d8c5a9", fontSize: 11, marginBottom: 6 }}>추천 원석</div>
                  <div style={{ fontSize: 16, marginBottom: 6 }}>{selectedTopic.themeCrystal}</div>
                  <div style={{ color: "#cbb69a", fontSize: 12, lineHeight: 1.65 }}>원하는 원석을 직접 골라도 됩니다. 원석의 감각을 먼저 맞추는 단계입니다.</div>
                </div>
              </div>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
              {GEMSTONES.map((gem) => (
                <GemCard
                  key={gem.id}
                  gem={gem}
                  selected={coreGem?.id === gem.id}
                  recommended={selectedTopic.themeCrystal === gem.name}
                  onSelect={onSelectGem}
                />
              ))}
            </div>
          </div>
        )}

        {selectedTopic && stage === "sync" && (
          <div>
            <header style={{ border: `1px solid ${(selectedGemSource?.color || "#c8960c")}66`, borderRadius: 20, background: "rgba(8,8,14,.82)", padding: 16, marginBottom: 16, boxShadow: `0 0 42px ${(selectedGemSource?.glow || "#daa520")}22` }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "flex-start" }}>
                <div style={{ minWidth: 220 }}>
                  <div style={{ color: "#d8c5a9", fontSize: 11, marginBottom: 6 }}>선택 카테고리</div>
                  <div style={{ fontFamily: "Noto Serif KR,serif", fontSize: 24, marginBottom: 8 }}>{selectedTopic.title}</div>
                  <div style={{ color: "#cbb69a", fontSize: 12, lineHeight: 1.75 }}>{selectedTopic.subtitle}</div>
                </div>
                <div style={{ minWidth: 220 }}>
                  <div style={{ color: "#d8c5a9", fontSize: 11, marginBottom: 6 }}>현재 원석</div>
                  <div style={{ fontSize: 16, marginBottom: 6 }}>{selectedGemSource?.name}</div>
                  <div style={{ color: "#cbb69a", fontSize: 12, lineHeight: 1.65 }}>{selectedGemSource?.meaning}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                {(selectedTopic.themeKeywords || []).map((keyword) => (
                  <span key={keyword} style={{ fontSize: 11, color: "#e4d4bf", borderRadius: 999, border: "1px solid rgba(255,255,255,.2)", padding: "3px 9px" }}>{keyword}</span>
                ))}
              </div>
            </header>

            <div className="cd-sync-grid" style={{ display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 16, alignItems: "start" }}>
              <div
                ref={chargeAreaRef}
                style={{
                  position: "relative",
                  borderRadius: 24,
                  border: "1px solid rgba(255,255,255,.12)",
                  background: "linear-gradient(180deg, rgba(255,255,255,.05), rgba(0,0,0,.22))",
                  padding: 18,
                  minHeight: 520,
                  overflow: "hidden",
                }}
                onPointerDown={handleChargeStart}
                onPointerMove={handleChargeMove}
                onPointerUp={handleChargeEnd}
                onPointerLeave={handleChargeEnd}
              >
                <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 30%, ${(selectedGemSource?.glow || "#daa520")}18, transparent 48%)`, pointerEvents: "none" }} />
                <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 280, gap: 12 }}>
                  <div style={{ color: "#ead8c1", fontSize: 11, letterSpacing: ".18em" }}>원석 이미지를 문질러 빛을 깨우세요</div>
                  <div style={{ position: "relative", width: 240, height: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1px solid ${(selectedGemSource?.glow || "#daa520")}22`, boxShadow: `0 0 30px ${(selectedGemSource?.glow || "#daa520")}22`, background: "radial-gradient(circle, rgba(255,255,255,.05), rgba(0,0,0,.1))" }} />
                    <div style={{ position: "absolute", inset: 18, borderRadius: "50%", border: `1px solid ${(selectedGemSource?.glow || "#daa520")}18` }} />
                    <div style={{ position: "absolute", inset: 40, borderRadius: "50%", border: `1px dashed ${(selectedGemSource?.glow || "#daa520")}24` }} />
                    <div style={{ position: "relative", width: 148, height: 148, borderRadius: 40, border: `1px solid ${(selectedGemSource?.color || "#c8960c")}88`, overflow: "hidden", boxShadow: `0 0 26px ${(selectedGemSource?.glow || "#daa520")}44, inset 0 1px 0 rgba(255,255,255,.12)` }}>
                      <img
                        src="/fuctionassets/stonetaro.webp"
                        alt={selectedGemSource?.name || "원석 이미지"}
                        draggable={false}
                        style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.92, userSelect: "none", pointerEvents: "none" }}
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${selectedGemSource?.color || "#c8960c"}22, rgba(8,8,14,.78))` }} />
                      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, textAlign: "center" }}>
                        <div style={{ fontSize: 19, color: selectedGemSource?.glow || "#daa520" }}>✦</div>
                        <div style={{ fontFamily: "Noto Serif KR,serif", fontSize: 20 }}>{selectedGemSource?.name}</div>
                        <div style={{ fontSize: 11, color: "#ddccb7", lineHeight: 1.55, padding: "0 12px" }}>{selectedGemSource?.keywords?.slice(0, 3).join(" · ")}</div>
                      </div>
                    </div>

                    {syncParticles.map((particle) => (
                      <div
                        key={particle.id}
                        style={{
                          position: "absolute",
                          left: particle.x,
                          top: particle.y,
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: selectedGemSource?.color || "#c8960c",
                          boxShadow: `0 0 10px ${selectedGemSource?.glow || "#daa520"}`,
                          animation: "cdParticleUp .9s ease forwards",
                          "--tx": `${particle.tx}px`,
                          "--ty": `${particle.ty}px`,
                          pointerEvents: "none",
                          zIndex: 3,
                          marginLeft: -3.5,
                          marginTop: -3.5,
                        }}
                      />
                    ))}

                    {syncEnergy >= 100 && [1, 2, 3].map((idx) => (
                      <div
                        key={`sync-ripple-${idx}`}
                        style={{
                          position: "absolute",
                          inset: `-${idx * 12}px`,
                          borderRadius: "50%",
                          background: `radial-gradient(circle, ${(selectedGemSource?.glow || "#daa520")}33 0%, transparent 70%)`,
                          animation: `cdRippleOut ${0.34 + idx * 0.18}s ${idx * 0.12}s ease forwards`,
                          pointerEvents: "none",
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ width: "100%", maxWidth: 360, height: 4, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.08)" }}>
                    <div style={{ width: `${syncEnergy}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg, ${(selectedGemSource?.color || "#c8960c")}99, ${(selectedGemSource?.glow || "#daa520")})`, boxShadow: `0 0 14px ${(selectedGemSource?.glow || "#daa520")}aa`, transition: "width .08s linear" }} />
                  </div>
                  <div style={{ color: syncEnergy >= 88 ? (selectedGemSource?.glow || "#daa520") : "#d0c0a7", fontSize: 12, letterSpacing: ".08em" }}>
                    {syncEnergy >= 88 ? "의식이 활성화되었습니다." : `${Math.floor(syncEnergy)}% 충전 중`}
                  </div>
                </div>

                <div style={{ marginTop: 26, position: "relative", zIndex: 1 }}>
                  <div style={{ color: "#d8c5a9", fontSize: 11, marginBottom: 10 }}>배치된 카드</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 10 }}>
                    {selectedCards.map((card, idx) => (
                      <div key={`${card}-${idx}`} style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", padding: 10, minHeight: 92 }}>
                        <div style={{ fontSize: 10, color: "#c8b28f", marginBottom: 6 }}>{selectedTopic.spread[idx]?.title}</div>
                        <div style={{ fontSize: 12, color: "#f1e5d2", marginBottom: 6 }}>{CARD_KR[card] || card}</div>
                        <div style={{ fontSize: 10, color: "#bda98b", lineHeight: 1.45 }}>{GEMSTONES.find((gem) => gem.id === assignments[idx])?.name || selectedGemSource?.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <aside style={{ borderRadius: 24, border: "1px solid rgba(255,255,255,.12)", background: "rgba(8,8,14,.8)", padding: 18, minHeight: 520 }}>
                <div style={{ fontSize: 11, color: "#d8c5a9", marginBottom: 6 }}>의식 가이드</div>
                <div style={{ fontFamily: "Noto Serif KR,serif", fontSize: 23, marginBottom: 12 }}>원석이 충분히 올라오면 리딩을 열 수 있습니다</div>
                <p style={{ color: "#d5c7b0", fontSize: 13, lineHeight: 1.9, marginBottom: 16 }}>
                  원석을 누르고 문지르듯 움직이면 빛이 차오릅니다. 빛이 어느 정도 모이면 카드의 의미와 원석의 상징이 함께 묶여 결과 화면으로 넘어갑니다.
                </p>

                <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", padding: 14, marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: "#d7c3a4", marginBottom: 6 }}>현재 원석</div>
                  <div style={{ fontSize: 18, marginBottom: 8 }}>{selectedGemSource?.name}</div>
                  <div style={{ fontSize: 12, color: "#ddceb8", lineHeight: 1.75 }}>{selectedGemSource?.meaning}</div>
                </div>

                <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", padding: 14, marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: "#d7c3a4", marginBottom: 6 }}>충전 상태</div>
                  <div style={{ width: "100%", height: 8, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.08)", marginBottom: 8 }}>
                    <div style={{ width: `${syncEnergy}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg, ${(selectedGemSource?.color || "#c8960c")}90, ${(selectedGemSource?.glow || "#daa520")})`, boxShadow: `0 0 12px ${(selectedGemSource?.glow || "#daa520")}88` }} />
                  </div>
                  <div style={{ color: syncEnergy >= 88 ? (selectedGemSource?.glow || "#daa520") : "#d0c0a7", fontSize: 12 }}>{syncEnergy >= 88 ? "빛의 문이 열렸습니다" : `${Math.floor(syncEnergy)}%`}</div>
                </div>

                <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                  <button
                    type="button"
                    onClick={handlePay}
                    disabled={paying || isPaying || !syncReady}
                    style={{
                      borderRadius: 999,
                      border: `1px solid ${(selectedGemSource?.color || "#c8960c")}88`,
                      background: paying || isPaying || !syncReady ? "rgba(255,255,255,.06)" : `${selectedGemSource?.color || "#c8960c"}28`,
                      color: paying || isPaying || !syncReady ? "#9f927e" : "#f2e4d1",
                      fontSize: 13,
                      letterSpacing: ".06em",
                      padding: "12px 18px",
                      cursor: paying || isPaying || !syncReady ? "not-allowed" : "pointer",
                    }}
                  >
                    {paying || isPaying ? "크리스탈 문을 여는 중..." : syncReady ? `크리스탈 문 열기 (${CRYSTAL_COST}코인)` : "원석을 조금 더 올려주세요"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStage("gem")}
                    style={{
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,.16)",
                      background: "transparent",
                      color: "#e7d8c2",
                      fontSize: 12,
                      padding: "10px 16px",
                      cursor: "pointer",
                    }}
                  >
                    원석 다시 고르기
                  </button>
                </div>

                {payError && <p style={{ color: "#ff9f9f", fontSize: 12, marginTop: 12, marginBottom: 0 }}>{payError}</p>}
              </aside>
            </div>
          </div>
        )}

        {selectedTopic && stage === "result" && (
          <div>
            <header style={{ border: `1px solid ${(selectedGemSource?.color || "#c8960c")}66`, borderRadius: 24, background: "rgba(8,8,14,.56)", backdropFilter: "blur(14px)", padding: 18, marginBottom: 16, boxShadow: `0 0 48px ${(selectedGemSource?.glow || "#daa520")}24` }}>
              <div className="cd-result-header-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,1.15fr) minmax(280px,.85fr)", gap: 16, alignItems: "stretch" }}>
                <div>
                  <div style={{ color: "#d8c5a9", fontSize: 11, marginBottom: 6 }}>선택 카테고리</div>
                  <div style={{ fontFamily: "Noto Serif KR,serif", fontSize: 26, marginBottom: 10 }}>{selectedTopic.title}</div>
                  <div style={{ color: "#cbb69a", fontSize: 12, lineHeight: 1.75, marginBottom: 12 }}>{selectedTopic.subtitle}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                    {selectedTopic.themeKeywords.map((keyword) => (
                      <span key={keyword} style={{ fontSize: 11, color: "#e4d4bf", borderRadius: 999, border: "1px solid rgba(255,255,255,.2)", padding: "3px 9px" }}>{keyword}</span>
                    ))}
                  </div>
                  <div style={{ color: "#f2e2c6", fontSize: 13, lineHeight: 1.85, borderRadius: 16, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", padding: 14 }}>
                    {summaryLine || "원석과 카드가 함께 밝힌 빛의 결이 아래의 깊은 리딩으로 이어집니다."}
                  </div>
                </div>
                <div style={{ borderRadius: 22, border: "1px solid rgba(255,255,255,.12)", background: `linear-gradient(160deg, ${(selectedGemSource?.color || "#c8960c")}24, rgba(8,8,14,.82) 74%)`, backdropFilter: "blur(10px)", padding: 18, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ color: "#d8c5a9", fontSize: 11, marginBottom: 6 }}>선택 원석</div>
                    <div style={{ fontFamily: "Noto Serif KR,serif", fontSize: 24, marginBottom: 8 }}>{selectedGemSource?.name}</div>
                    <div style={{ color: "#d0c0ab", fontSize: 12, lineHeight: 1.75 }}>{selectedGemSource?.meaning}</div>
                  </div>
                  <div style={{ marginTop: 16, borderRadius: 16, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", padding: 12 }}>
                    <div style={{ fontSize: 11, color: "#d7c3a4", marginBottom: 6 }}>원석 키워드</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {selectedGemSource?.keywords.map((keyword) => (
                        <span key={keyword} style={{ fontSize: 10, color: "#efe0c6", borderRadius: 999, padding: "3px 7px", border: "1px solid rgba(255,255,255,.14)" }}>{keyword}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
                {selectedCards.map((card, idx) => (
                  <div key={`${card}-${idx}`} style={{ borderRadius: 14 }}>
                    <div className="cd-crystal-flip" style={{ borderRadius: 14, perspective: 900 }}>
                      <div className="cd-crystal-flip__inner" style={{ position: "relative", minHeight: 124, transformStyle: "preserve-3d", transition: "transform .72s cubic-bezier(.4,0,.2,1)" }}>
                        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", borderRadius: 14, border: "1px solid rgba(255,255,255,.12)", background: "linear-gradient(148deg,#140e18 0%,#1e1228 50%,#140e18 100%)", padding: 10 }}>
                          <div style={{ fontSize: 10, color: "#c8b28f", marginBottom: 6 }}>{selectedTopic.spread[idx]?.title}</div>
                          <div style={{ fontSize: 12, color: "#f1e5d2", marginBottom: 4 }}>{CARD_KR[card] || card}</div>
                          <div style={{ fontSize: 10, color: "#c0ac8d" }}>{GEMSTONES.find((gem) => gem.id === assignments[idx])?.name || selectedGemSource?.name}</div>
                        </div>
                        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg)", borderRadius: 14, border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.08)", padding: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#dfcaa7", lineHeight: 1.6, textAlign: "center" }}>
                          선택된 카드의 상징을
                          <br />
                          원석의 빛으로 읽는 중
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </header>

            {loading && (
              <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,.12)", padding: 20, background: "rgba(0,0,0,.45)", marginBottom: 14 }}>
                <p style={{ color: "#d8c7ad", fontSize: 13, margin: 0 }}>원석의 빛과 카드의 상징으로 크리스탈 문을 열고 있습니다...</p>
              </div>
            )}

            {!!error && (
              <div style={{ borderRadius: 18, border: "1px solid rgba(255,120,120,.5)", padding: 14, background: "rgba(40,0,0,.35)", marginBottom: 14 }}>
                <p style={{ color: "#ffb0b0", fontSize: 12, margin: 0 }}>{error}</p>
              </div>
            )}

            {readingPayload && (
              <div style={{ marginBottom: 16 }} className="cd-result-enter">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10, marginBottom: 12 }}>
                  {readingPayload.sections.map((section, index) => (
                    <ResultFlipCard key={`summary-${index}`} section={section} />
                  ))}
                </div>

                <div className="cd-scroll-surface" style={{ display: "grid", gap: 10, maxHeight: "56vh", overflowY: "auto", paddingRight: 4 }}>
                  {readingPayload.sections.map((section, index) => (
                    <ReadingAccordion
                      key={`${section.positionTitle}-${index}`}
                      section={section}
                      expanded={expandedSet.has(index)}
                      onToggle={() => toggleSection(index)}
                    />
                  ))}
                </div>

                {Array.isArray(readingPayload.masterChapters) && readingPayload.masterChapters.length ? (
                  <div className="cd-scroll-surface" style={{ marginTop: 12, borderRadius: 18, border: "1px solid rgba(255,255,255,.14)", background: "rgba(8,8,14,.62)", backdropFilter: "blur(12px)", padding: 14, maxHeight: "46vh", overflowY: "auto" }}>
                    <h4 style={{ margin: 0, marginBottom: 10, fontFamily: "Noto Serif KR,serif", fontSize: 18 }}>일곱 개의 크리스탈 문</h4>
                    <div style={{ display: "grid", gap: 10 }}>
                      {readingPayload.masterChapters.map((chapter) => (
                        <article key={chapter.no || chapter.title} style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", padding: 12 }}>
                          <div style={{ fontSize: 11, color: "#d8c5a9", marginBottom: 5 }}>{chapter.title}</div>
                          {chapter.keywordVisual ? (
                            <div style={{ fontSize: 12, color: "#e2cfad", marginBottom: 7 }}>{chapter.keywordVisual}</div>
                          ) : null}
                          <div style={{ fontSize: 13, color: "#f3e6d2", lineHeight: 1.88, whiteSpace: "pre-wrap" }}>{chapter.content}</div>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {!readingPayload && !!readingText && (
              <div className="cd-scroll-surface" style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 18, background: "rgba(8,8,14,.72)", padding: 16, marginBottom: 14, maxHeight: "56vh", overflowY: "auto" }}>
                <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "Noto Serif KR,serif", lineHeight: 1.95, color: "#e8dbc8", fontSize: 13 }}>{readingText}</pre>
              </div>
            )}

            {readingPayload?.summary && (
              <footer style={{ border: "1px solid rgba(255,255,255,.14)", borderRadius: 20, background: "rgba(8,8,14,.82)", padding: 16, marginBottom: 16 }}>
                <h3 style={{ margin: 0, marginBottom: 12, fontFamily: "Noto Serif KR,serif", fontSize: 20 }}>원석 오라 종합 리딩</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10, marginBottom: 12 }}>
                  {[
                    ["전체 흐름", readingPayload.summary.overallFlow],
                    ["가장 강한 신호", readingPayload.summary.strongestSignal],
                    ["기회", readingPayload.summary.opportunity],
                    ["주의할 점", readingPayload.summary.risk],
                    ["타이밍 조언", readingPayload.summary.timingAdvice],
                  ].map(([label, value]) => (
                    <div key={String(label)} style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", padding: 12 }}>
                      <div style={{ fontSize: 11, color: "#d7c3a4", marginBottom: 6 }}>{label}</div>
                      <div style={{ color: "#f5ebdc", fontSize: 13, lineHeight: 1.85 }}>{value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 13, color: "#f2e5d1", marginBottom: 6 }}><strong>오늘의 작은 의식</strong></div>
                  <ol style={{ margin: 0, paddingLeft: 18, color: "#e9dcc8", fontSize: 13, lineHeight: 1.8 }}>
                    {(readingPayload.summary.practicalActions || []).map((item, idx) => (
                      <li key={`${idx}-${item}`}>{item}</li>
                    ))}
                  </ol>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10, marginBottom: 12 }}>
                  <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", padding: 12 }}>
                    <div style={{ fontSize: 11, color: "#d7c3a4", marginBottom: 6 }}>네오 & 연이</div>
                    <div style={{ color: "#f5ebdc", fontSize: 13, lineHeight: 1.85 }}>{readingPayload.summary.neoLine}</div>
                    <div style={{ color: "#f5ebdc", fontSize: 13, lineHeight: 1.85, marginTop: 8 }}>{readingPayload.summary.younLine}</div>
                  </div>
                  <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", padding: 12 }}>
                    <div style={{ fontSize: 11, color: "#d7c3a4", marginBottom: 6 }}>크리스탈 오라클 메시지</div>
                    <div style={{ color: "#f5ebdc", fontSize: 13, lineHeight: 1.85 }}>{readingPayload.summary.oracleMessage}</div>
                  </div>
                </div>
              </footer>
            )}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handlePay}
                disabled={loading || paying || isPaying}
                style={{
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,.24)",
                  background: "rgba(255,255,255,.06)",
                  color: "#e7d8c2",
                  fontSize: 12,
                  padding: "8px 12px",
                  cursor: loading || paying || isPaying ? "not-allowed" : "pointer",
                }}
              >
                다시 열람하기 ({CRYSTAL_COST}코인)
              </button>
              <button
                type="button"
                onClick={resetAll}
                style={{
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,.24)",
                  background: "transparent",
                  color: "#e7d8c2",
                  fontSize: 12,
                  padding: "8px 12px",
                  cursor: "pointer",
                }}
              >
                다른 카테고리 보기
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
