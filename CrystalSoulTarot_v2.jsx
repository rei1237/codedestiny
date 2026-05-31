import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion";

const CRYSTAL_COST = 50;

const FLOWER_ADMIN_TOKEN_RE = /^[A-Za-z0-9_-]{20,}\.[0-9a-f]{64}$/;

const GEMSTONES = [
  {
    id: "tigers-eye",
    name: "호안석",
    color: "#c8960c",
    glow: "#daa520",
    keywords: ["결단", "보호", "현실 판단"],
    meaning: "감정 과열을 낮추고 수치와 기준으로 선택하도록 돕는 원석",
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
    keywords: ["풍요", "활력", "매출"],
    meaning: "보이지 않는 구조를 읽고 장기 전략을 세우게 하는 원석",
  },
  {
        color: "#d98aa9",
        glow: "#f3adc7",
        keywords: ["다정함", "안심", "마음 열기"],
        meaning: "굳어 있던 마음을 부드럽게 풀어 내며 사랑받을 자격을 다시 느끼게 하는 원석",
    keywords: ["보호", "경계", "정리"],
    meaning: "소모적 자극을 차단하고 관계 에너지의 경계를 세우는 원석",
  },
        name: "자수정",
        color: "#8263c7",
        glow: "#b99bff",
        keywords: ["직관", "정화", "고요"],
        meaning: "복잡한 생각을 잠재우고 진짜 마음의 목소리에 귀 기울이게 하는 원석",
      },
      {
        id: "obsidian",
        name: "흑요석",
        color: "#2f3340",
        glow: "#7b879c",
        keywords: ["보호", "경계", "회복"],
        meaning: "흔들리는 감정을 감싸 안고 불필요한 상처의 파동을 차분히 막아 주는 원석",
    keywords: ["정리", "균형", "회복"],
    meaning: "흩어진 선택지를 정돈해 우선순위를 세우는 원석",
  },
        name: "시트린",
        color: "#d7a52d",
        glow: "#f2ce6b",
        keywords: ["희망", "활력", "풍요"],
        meaning: "지친 마음에 따뜻한 햇살 같은 기운을 더해 다시 움직일 힘을 건네는 원석",
      },
      {
        id: "moonstone",
        name: "문스톤",
        color: "#a7b8d4",
        glow: "#d5e7ff",
        keywords: ["감수성", "직감", "달빛 치유"],
        meaning: "불안으로 거칠어진 감정을 잔잔한 달빛처럼 감싸며 내면의 리듬을 회복시키는 원석",
      },
      {
        id: "tigers-eye",
        name: "호안석",
        color: "#b7862f",
        glow: "#e7bb63",
        keywords: ["결단", "용기", "집중"],
        meaning: "흔들리는 선택의 순간에 발을 단단히 디디고 현실 감각을 붙잡게 하는 원석",
    id: "overall",
    title: "전체 흐름 · 오늘의 메시지",
    subtitle: "오늘의 핵심, 우선순위, 마지막 조언을 한 번에 정리합니다.",
    icon: "☉",
        color: "#355da8",
        glow: "#7ba2ee",
        keywords: ["진실", "정돈", "방향"],
        meaning: "흐릿한 감정을 맑게 정리해 앞으로 나아갈 방향을 또렷하게 비춰 주는 원석",
      { order: 3, title: "방해 요소", question: "돈의 흐름을 막는 습관이나 외부 변수는 무엇인가?" },
      { order: 4, title: "조언의 방향", question: "현실적으로 어떤 선택을 해야 하는가?" },
      { order: 5, title: "최종 결과", question: "이 흐름이 어떤 재물·사업 결과로 이어질 가능성이 큰가?" },
    ],
  },
        id: "heart-flow",
        title: "지금 마음의 흐름",
        subtitle: "현재 감정, 숨겨진 마음, 외로움과 불안의 결을 천천히 읽어냅니다.",
        icon: "◐",
        themeCrystal: "문스톤",
        themeKeywords: ["감정 상태", "숨은 마음", "감정 피로"],
    themeKeywords: ["감정 온도", "표현", "균형"],
          { order: 1, title: "겉으로 보이는 마음", question: "요즘 내가 가장 자주 느끼는 감정은 무엇인가?" },
          { order: 2, title: "숨겨 둔 마음", question: "아무에게도 쉽게 말하지 못한 감정은 무엇인가?" },
          { order: 3, title: "외로움의 결", question: "나를 지치게 하는 외로움은 어떤 모습인가?" },
          { order: 4, title: "불안의 뿌리", question: "마음을 무겁게 만드는 근원은 어디에서 오는가?" },
          { order: 5, title: "오늘의 안정점", question: "지금 이 마음을 안전하게 지켜 줄 선택은 무엇인가?" },
      { order: 5, title: "관계의 가능성", question: "앞으로 감정 흐름은 어디로 향하는가?" },
    ],
  },
        id: "relationships",
        title: "관계와 인간관계",
        subtitle: "사람에게 상처받는 패턴과 회복 흐름, 가까워지는 방식을 들여다봅니다.",
        icon: "◍",
        themeCrystal: "흑요석",
        themeKeywords: ["상처 패턴", "경계", "회복 흐름"],
    themeKeywords: ["미련", "재접근", "회복 조건"],
          { order: 1, title: "관계의 현재 온도", question: "지금 주변 사람들과의 분위기는 어떤가?" },
          { order: 2, title: "반복되는 상처", question: "자꾸 같은 방식으로 아프게 되는 지점은 어디인가?" },
          { order: 3, title: "가까워지는 방식", question: "내가 사람과 가까워질 때 보이는 패턴은 무엇인가?" },
          { order: 4, title: "관계 피로의 원인", question: "요즘 관계에서 유난히 소모되는 이유는 무엇인가?" },
          { order: 5, title: "회복을 여는 말", question: "지금 관계를 다시 부드럽게 잇기 위한 첫 문장은 무엇인가?" },
      { order: 5, title: "재회 가능성", question: "이 인연은 다시 연결될 가능성이 있는가?" },
    ],
  },
        id: "love-flow",
        title: "연애 흐름",
        subtitle: "현재 사랑의 에너지와 감정 표현 방식, 반복되는 연애 흐름을 읽습니다.",
    subtitle: "이사, 여행, 환경 변화, 새로운 흐름의 징조를 읽습니다.",
    icon: "➤",
        themeKeywords: ["사랑 에너지", "표현 방식", "반복 패턴"],
    themeKeywords: ["타이밍", "환경 변화", "새 출발"],
          { order: 1, title: "지금의 사랑 에너지", question: "현재 내 사랑의 온도는 어떤 상태인가?" },
          { order: 2, title: "감정 표현의 방식", question: "나는 사랑을 어떤 말과 행동으로 전하는가?" },
          { order: 3, title: "끌리는 사람의 결", question: "내가 자주 끌리는 사람의 특징은 무엇인가?" },
          { order: 4, title: "반복되는 연애 패턴", question: "연애에서 다시 돌아오는 감정의 고리는 무엇인가?" },
          { order: 5, title: "관계 회복의 가능성", question: "지금 사랑이 회복되기 위해 필요한 장면은 무엇인가?" },
      { order: 5, title: "관계의 최종 흐름", question: "이 인간관계는 어떤 방향으로 흘러갈 가능성이 큰가?" },
    ],
  },
        id: "reality-money",
        title: "현실과 돈의 흐름",
        subtitle: "현실 압박과 금전 불안, 회복 타이밍을 감정의 결까지 함께 살펴봅니다.",
        icon: "◇",
        themeCrystal: "시트린",
        themeKeywords: ["현실 압박", "돈 불안", "회복 타이밍"],
        spread: [
          { order: 1, title: "현실 압박의 강도", question: "지금 무엇이 가장 크게 숨을 막히게 하는가?" },
          { order: 2, title: "돈에 대한 불안", question: "요즘 금전 문제에서 가장 두려운 장면은 무엇인가?" },
          { order: 3, title: "소비의 감정", question: "지출 뒤에 숨어 있는 감정 습관은 무엇인가?" },
          { order: 4, title: "현실을 지키는 선택", question: "당장 무너지지 않기 위해 필요한 선택은 무엇인가?" },
          { order: 5, title: "회복의 시작 시점", question: "현실의 숨통이 트이는 시그널은 어떻게 나타나는가?" },
        ],
      },
      {
        id: "healing",
        title: "마음 회복과 치유",
        subtitle: "지친 감정을 돌보고 다시 살아나는 흐름을 부드럽게 안내합니다.",
        icon: "✧",
  "The Hierophant", "The Lovers", "The Chariot", "Strength", "The Hermit",
        themeKeywords: ["자기 돌봄", "회복 포인트", "감정 재생"],
  "The Devil", "The Tower", "The Star", "The Moon", "The Sun",
          { order: 1, title: "지쳐 있는 감정", question: "내 마음이 가장 닳아 있는 지점은 어디인가?" },
          { order: 2, title: "스스로를 돌보는 법", question: "지금 나에게 실제로 필요한 돌봄은 무엇인가?" },
          { order: 3, title: "회복을 막는 습관", question: "치유를 늦추는 내 습관은 무엇인가?" },
          { order: 4, title: "회복 포인트", question: "감정이 살아나는 결정적 포인트는 어디에 있는가?" },
          { order: 5, title: "다시 살아나는 흐름", question: "앞으로 마음은 어떤 리듬으로 되살아나는가?" },
  "Nine of Swords", "Page of Swords", "Queen of Swords", "King of Swords",
  "Ace of Pentacles", "Three of Pentacles", "Five of Pentacles", "Seven of Pentacles",
  "Nine of Pentacles", "Page of Pentacles", "Queen of Pentacles", "King of Pentacles",
        id: "future-flow",
        title: "앞으로의 흐름",
        subtitle: "가까운 미래와 변화 시점, 지금 가장 중요한 선택의 방향을 짚습니다.",
        icon: "☾",
        themeCrystal: "자수정",
        themeKeywords: ["가까운 미래", "변화 시점", "선택 방향"],
  "The Empress": "여황제",
          { order: 1, title: "가까운 미래의 기류", question: "바로 앞에 다가온 흐름은 어떤 얼굴을 하고 있는가?" },
          { order: 2, title: "변화의 시점", question: "전환점은 언제, 어떤 장면으로 나타나는가?" },
          { order: 3, title: "운명의 방향성", question: "지금 흐름이 자연스럽게 향하는 방향은 어디인가?" },
          { order: 4, title: "놓치기 쉬운 신호", question: "지금 반드시 알아차려야 할 조용한 신호는 무엇인가?" },
          { order: 5, title: "가장 중요한 선택", question: "지금 이 시기에 가장 먼저 선택해야 할 것은 무엇인가?" },
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

const FORBIDDEN_TERMS = [
  "구조상",
  "패턴 분석",
  "데이터 기반",
  "시스템",
  "알고리즘",
  "일반적으로",
  "가능성이 있습니다",
  "해석 결과",
  "논리적으로",
  "AI",
  "분석 데이터",
];

function sanitizeCounselingText(input) {
  const text = String(input || "").trim();
  if (!text) return "";
  let normalized = text;
  FORBIDDEN_TERMS.forEach((term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    normalized = normalized.replace(new RegExp(escaped, "gi"), "");
  });
  normalized = normalized
    .replace(/\s{2,}/g, " ")
    .replace(/\.\s*\./g, ".")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return normalized;
}

function pickSectionValue(section, keys) {
  if (!section) return "";
  for (const key of keys) {
    const value = sanitizeCounselingText(section?.[key]);
    if (value) return value;
  }
  return "";
}

function buildCounselingCategories(payload, topic, gem) {
  const summary = payload?.summary || {};
  const sections = Array.isArray(payload?.sections) ? payload.sections : [];
  const s0 = sections[0] || null;
  const s1 = sections[1] || null;
  const s2 = sections[2] || null;
  const s3 = sections[3] || null;
  const s4 = sections[4] || null;

  const emotionalLead = sanitizeCounselingText(summary.oracleMessage) || "오늘의 카드는 당신이 오래 숨겨 둔 감정을 조용히 비추고 있어요.";
  const overallFlow = sanitizeCounselingText(summary.overallFlow);
  const strongestSignal = sanitizeCounselingText(summary.strongestSignal);
  const risk = sanitizeCounselingText(summary.risk);
  const timingAdvice = sanitizeCounselingText(summary.timingAdvice);

  const blocks = [
    {
      title: "지금 마음의 흐름",
      intro: emotionalLead,
      points: [
        pickSectionValue(s0, ["currentPulse", "categoryReading", "oneLineSummary"]),
        pickSectionValue(s1, ["categoryReading", "cardFlow", "currentPulse"]),
        overallFlow || "마음의 파도는 크지만, 당신 안에는 이미 버텨낼 힘이 남아 있습니다.",
      ].filter(Boolean),
    },
    {
      title: "관계와 인간관계",
      intro: "사람 사이에서 지치는 이유를 찾는 순간, 관계는 천천히 회복되기 시작합니다.",
      points: [
        pickSectionValue(s1, ["caution", "categoryReading", "cardFlow"]),
        pickSectionValue(s2, ["currentPulse", "caution", "categoryReading"]),
        strongestSignal || "지금은 모든 관계를 붙잡기보다, 당신을 지켜 주는 관계를 먼저 선택해도 괜찮아요.",
      ].filter(Boolean),
    },
    {
      title: "연애 흐름",
      intro: "사랑은 정답보다 리듬에 가깝습니다. 지금 당신의 리듬을 먼저 읽어 볼게요.",
      points: [
        pickSectionValue(s2, ["categoryReading", "cardFlow", "currentPulse"]),
        pickSectionValue(s3, ["oneLineSummary", "caution", "uplift"]),
        sanitizeCounselingText(summary.opportunity) || "억지로 서두르지 않아도, 진심은 천천히 제자리를 찾아옵니다.",
      ].filter(Boolean),
    },
    {
      title: "현실과 돈의 흐름",
      intro: "현실의 무게를 견디는 마음에도 따뜻한 숨구멍이 필요합니다.",
      points: [
        pickSectionValue(s3, ["caution", "categoryReading", "cardFlow"]),
        pickSectionValue(s4, ["action", "uplift", "currentPulse"]),
        risk || "지출과 불안을 같은 날에 다루지 말고, 하루에 하나씩 차분히 정리해 보세요.",
      ].filter(Boolean),
    },
    {
      title: "마음 회복과 치유",
      intro: `${gem?.name || "원석"}의 기운은 오늘 당신에게 '다시 숨 쉬어도 된다'고 말해 줍니다.`,
      points: [
        pickSectionValue(s4, ["uplift", "crystalEnergy", "categoryReading"]),
        pickSectionValue(s0, ["uplift", "action", "oneLineSummary"]),
        "조용한 밤에 내 마음을 탓하지 않고 안아 주는 시간부터 시작해 보세요.",
      ].filter(Boolean),
    },
    {
      title: "앞으로의 흐름",
      intro: "앞으로의 길은 큰 도약보다, 작지만 선명한 선택에서 열립니다.",
      points: [
        timingAdvice || "가까운 시기에 작은 전환점이 열리고, 그 순간의 선택이 흐름을 바꿉니다.",
        pickSectionValue(s4, ["cardFlow", "oneLineSummary", "categoryReading"]),
        `${topic?.title || "이번 리딩"}의 핵심은 마음을 놓치지 않은 선택입니다.`,
      ].filter(Boolean),
    },
  ];

  return blocks;
}

function buildLocalFallback(topic, coreGem, cards) {
  const cardNames = cards.map((card) => CARD_KR[card] || card).join(", ");
  const lines = [
    "CRYSTAL SOUL TAROT",
    `${topic.title}`,
    `${coreGem.name} · ${coreGem.keywords.join(" · ")}`,
    "",
    "당신의 마음은 지금 무너지려는 것이 아니라, 오래 참아 온 감정을 정직하게 꺼내려는 순간에 와 있습니다.",
    "겉으로 단단해 보이던 부분 안에서도 누군가에게 기대고 싶다는 마음이 조용히 자라나고 있었어요.",
    "",
    "오늘 펼쳐진 카드는 당신이 무엇을 포기해야 하는지가 아니라, 무엇을 먼저 지켜야 하는지를 말해 줍니다.",
    `이번 리딩에 등장한 카드: ${cardNames}`,
    "",
    "관계에서는 억지로 밝아지려 애쓰기보다, 나를 지치게 하는 말과 상황에서 한 걸음 물러나는 용기가 필요합니다.",
    "연애에서는 정답 같은 문장보다 진심이 담긴 한 문장이 흐름을 바꿉니다.",
    "현실과 돈의 문제는 불안을 크게 키우기 전에 작은 정리 하나를 끝내는 순간부터 숨통이 트이기 시작합니다.",
    "",
    `${coreGem.name}은 당신에게 '${coreGem.meaning}'의 메시지를 전하고 있습니다.`,
    "오늘 밤에는 나를 몰아붙이는 대신, 지금 버티고 있는 나를 먼저 따뜻하게 인정해 주세요.",
    "그 다정함이 내일의 선택을 더 단단하고 선명하게 만들어 줄 거예요.",
  ];
  return lines.join("\n");
}

function CrystalGemVisual({ gem, size = 220, immersive = false, showCaption = true }) {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(false);
  const gemId = gem?.id || "rose-quartz";

  const palette = {
    rose: { mid: "#f3c2d5", deep: "#d37aa4", edge: "#fce4ee" },
    amethyst: { mid: "#b9a2ff", deep: "#6f57b3", edge: "#ddd4ff" },
    obsidian: { mid: "#9ba7bd", deep: "#1f2430", edge: "#d5dde8" },
    citrine: { mid: "#f4d37c", deep: "#b98722", edge: "#fff0bc" },
    moon: { mid: "#dde7ff", deep: "#90a5d8", edge: "#ffffff" },
    default: { mid: "#d7c7aa", deep: "#7e6750", edge: "#f5eada" },
  };

  const tone = gemId === "rose-quartz"
    ? palette.rose
    : gemId === "amethyst"
      ? palette.amethyst
      : gemId === "obsidian"
        ? palette.obsidian
        : gemId === "citrine"
          ? palette.citrine
          : gemId === "moonstone"
            ? palette.moon
            : palette.default;

  const polygonPoints = gemId === "obsidian"
    ? "56,14 114,22 140,74 124,136 66,150 26,104"
    : gemId === "moonstone"
      ? "80,12 126,40 142,92 106,142 50,142 18,86 36,36"
      : gemId === "citrine"
        ? "74,10 128,32 142,82 110,146 52,136 16,80 38,30"
        : gemId === "amethyst"
          ? "78,10 126,24 146,80 116,142 48,148 18,82 34,30"
          : "70,14 130,24 144,78 118,142 58,148 16,92 32,38";

  return (
    <m.div
      onHoverStart={() => setActive(true)}
      onHoverEnd={() => setActive(false)}
      onTapStart={() => setActive(true)}
      onTapCancel={() => setActive(false)}
      onTap={() => setActive((prev) => !prev)}
      animate={reduceMotion ? { opacity: 1 } : { y: [0, -5, 0], rotate: [0, 0.7, 0] }}
      transition={reduceMotion ? { duration: 0.2 } : { duration: immersive ? 5.5 : 7, repeat: Infinity, ease: "easeInOut" }}
      style={{
        width: size,
        height: size,
        position: "relative",
        display: "grid",
        placeItems: "center",
        filter: `drop-shadow(0 0 ${immersive ? 34 : 22}px ${gem?.glow || "#d9b886"})`,
      }}
    >
      <m.div
        animate={reduceMotion ? { opacity: 0.66 } : { scale: active ? 1.08 : 1, opacity: active ? 0.92 : 0.66 }}
        transition={{ duration: 0.48, ease: "easeOut" }}
        style={{
          position: "absolute",
          inset: immersive ? 4 : 8,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${gem?.glow || tone.mid}66 0%, transparent 70%)`,
        }}
      />
      <svg width={Math.round(size * 0.78)} height={Math.round(size * 0.78)} viewBox="0 0 160 160" aria-label={gem?.name || "원석"} role="img" style={{ overflow: "visible" }}>
        <defs>
          <radialGradient id={`cd-gem-core-${gemId}`} cx="50%" cy="36%" r="74%">
            <stop offset="0%" stopColor={tone.edge} stopOpacity="0.95" />
            <stop offset="58%" stopColor={tone.mid} stopOpacity="0.9" />
            <stop offset="100%" stopColor={tone.deep} stopOpacity="0.98" />
          </radialGradient>
          <linearGradient id={`cd-gem-shimmer-${gemId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.66" />
            <stop offset="38%" stopColor="#ffffff" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={polygonPoints} fill={`url(#cd-gem-core-${gemId})`} stroke={tone.edge} strokeOpacity="0.42" strokeWidth="1.4" />
        <path d="M40 56 C66 38, 90 36, 126 56" fill="none" stroke={`url(#cd-gem-shimmer-${gemId})`} strokeWidth="5" strokeLinecap="round" />
        <path d="M56 84 C76 94, 96 94, 118 84" fill="none" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      {showCaption && (
        <m.div
          animate={reduceMotion ? { opacity: 1 } : { opacity: active ? 1 : 0.78, y: active ? 0 : 4 }}
          transition={{ duration: 0.34, ease: "easeOut" }}
          style={{
            position: "absolute",
            bottom: immersive ? -4 : -10,
            textAlign: "center",
            maxWidth: size + 40,
            pointerEvents: "none",
          }}
        >
          <div style={{ fontFamily: "Noto Serif KR,serif", fontSize: immersive ? 15 : 13, color: "#f4e7d7", marginBottom: 3 }}>{gem?.name}</div>
          <div style={{ fontSize: 11, color: "#dcc8aa", lineHeight: 1.6 }}>{(gem?.keywords || []).slice(0, 3).join(" · ")}</div>
          {active ? <div style={{ fontSize: 11, color: "#f6ddbc", marginTop: 6, lineHeight: 1.7 }}>{gem?.meaning}</div> : null}
        </m.div>
      )}
    </m.div>
  );
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
  const safeKeywordVisual = sanitizeCounselingText(section.keywordVisual);
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
            {safeKeywordVisual || `타로: ${(section.tarotKeywords || []).slice(0, 2).join(", ")}`}
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

  const safeCategoryReading = sanitizeCounselingText(section.categoryReading);
  const safeKeywordVisual = sanitizeCounselingText(section.keywordVisual);
  const safeOneLineSummary = sanitizeCounselingText(section.oneLineSummary);
  const safeCrystalEnergy = sanitizeCounselingText(section.crystalEnergy);
  const safeCardFlow = sanitizeCounselingText(section.cardFlow);
  const safeCurrentPulse = sanitizeCounselingText(section.currentPulse);
  const safeCaution = sanitizeCounselingText(section.caution);
  const safeUplift = sanitizeCounselingText(section.uplift);

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
          {safeKeywordVisual ? (
            <p style={{ color: "#d9c6a9", fontSize: 12, lineHeight: 1.75, margin: "0 0 8px" }}>{safeKeywordVisual}</p>
          ) : null}
          <p style={{ color: "#efe2d0", fontSize: 13, lineHeight: 1.9, margin: "0 0 12px" }}>{safeCategoryReading}</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10, marginBottom: 12 }}>
            <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", padding: 12 }}>
              <div style={{ fontSize: 11, color: "#d7c3a4", marginBottom: 6 }}>한 줄 핵심</div>
              <div style={{ color: "#f5ebdc", fontSize: 13, lineHeight: 1.8 }}>{safeOneLineSummary}</div>
            </div>
            <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", padding: 12 }}>
              <div style={{ fontSize: 11, color: "#d7c3a4", marginBottom: 6 }}>원석 에너지</div>
              <div style={{ color: "#f5ebdc", fontSize: 13, lineHeight: 1.8 }}>{safeCrystalEnergy}</div>
            </div>
            <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", padding: 12 }}>
              <div style={{ fontSize: 11, color: "#d7c3a4", marginBottom: 6 }}>카드가 보여주는 흐름</div>
              <div style={{ color: "#f5ebdc", fontSize: 13, lineHeight: 1.8 }}>{safeCardFlow}</div>
            </div>
            <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", padding: 12 }}>
              <div style={{ fontSize: 11, color: "#d7c3a4", marginBottom: 6 }}>지금의 심리</div>
              <div style={{ color: "#f5ebdc", fontSize: 13, lineHeight: 1.8 }}>{safeCurrentPulse}</div>
            </div>
            <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", padding: 12 }}>
              <div style={{ fontSize: 11, color: "#d7c3a4", marginBottom: 6 }}>조심할 점</div>
              <div style={{ color: "#f5ebdc", fontSize: 13, lineHeight: 1.8 }}>{safeCaution}</div>
            </div>
            <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", padding: 12 }}>
              <div style={{ fontSize: 11, color: "#d7c3a4", marginBottom: 6 }}>좋게 살리는 방법</div>
              <div style={{ color: "#f5ebdc", fontSize: 13, lineHeight: 1.8 }}>{safeUplift}</div>
            </div>
          </div>

          <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", padding: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "#d7c3a4", marginBottom: 6 }}>실전 조언</div>
            <ol style={{ margin: 0, paddingLeft: 18, color: "#f5ebdc", fontSize: 13, lineHeight: 1.8 }}>
              {actionItems.map((item, idx) => (
                <li key={`${idx}-${item}`}>{item}</li>
              ))}
            </ol>
          </div>

          <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.1)", background: "linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.02))", padding: 12 }}>
            <div style={{ fontSize: 11, color: "#d7c3a4", marginBottom: 6 }}>감정 통합 메시지</div>
            <div style={{ color: "#f5ebdc", fontSize: 13, lineHeight: 1.9 }}>
              {sanitizeCounselingText(section.neoLine || "") || sanitizeCounselingText(section.younLine || "") || sanitizeCounselingText(section.oracleMessage || "") || "지금 필요한 건 완벽한 답보다, 내 마음의 속도를 존중하는 선택입니다."}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export default function CrystalSoulTarot() {
  const reduceMotion = useReducedMotion();
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
  const lastParticleAtRef = useRef(0);

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

      const rr = await fetch("/api/fortune/pig-coin/refund", {
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
    const fullText = sanitizeCounselingText(String(text || "").trim());
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
      const text = sanitizeCounselingText(String(data?.reading || "").trim()) || buildLocalFallback(selectedTopic, coreGem, selectedCards);

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
        setError("리딩 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.");
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

    const token = localStorage.getItem("fortune_auth_token") || localStorage.getItem("cdToken") || "";
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

    if (!token) {
      setPayError("로그인이 필요합니다.");
      setPaying(false);
      setTimeout(() => {
        window.location.href = "/login?next=%2Ftarot%2Fcrystal-soul";
      }, 600);
      return;
    }

    try {
      const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };
      if (adminToken) headers["x-admin-token"] = adminToken;
      if (adminToken && (adminTier === "standard" || adminTier === "premium" || adminTier === "vvip")) {
        headers["x-admin-subscription-tier"] = adminTier;
      }

      const response = await fetch("/api/fortune/pig-coin/consume", {
        method: "POST",
        headers,
        body: JSON.stringify({ cost: CRYSTAL_COST, reason: "크리스탈 소울 타로 리딩", featureKey: "tarot-crystal-soul-reading" }),
      });

      const data = await response.json().catch(() => ({}));
      if (response.status === 402) {
        setPayError(`${CRYSTAL_COST}코인이 필요합니다. 코인을 충전해 주세요.`);
        setPaying(false);
        return;
      }
      if (!response.ok) {
        setPayError(String(data?.message || "코인 차감에 실패했습니다."));
        setPaying(false);
        return;
      }

      setPaidTxId(String(data?.transactionId || ""));
      setPaid(true);
      await requestReading();
    } catch (e) {
      setPayError("결제 처리 중 오류가 발생했습니다.");
    } finally {
      setPaying(false);
    }
  }, [requestReading, selectedTopic]);

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

    const now = Date.now();
    if (now - lastParticleAtRef.current > 44) {
      lastParticleAtRef.current = now;
      const particleId = ++particleIdRef.current;
      const px = current.x - rect.left;
      const py = current.y - rect.top;
      const tx = (Math.random() - 0.5) * 70;
      const ty = -(Math.random() * 54 + 16);
      setSyncParticles((prev) => [...prev.slice(-16), { id: particleId, x: px, y: py, tx, ty }]);
      window.setTimeout(() => {
        setSyncParticles((prev) => prev.filter((p) => p.id !== particleId));
      }, 820);
    }

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
        : "결과 보기";

  const summaryLine = useMemo(() => {
    if (!readingPayload?.summary) return "";
    const summary = readingPayload.summary;
    return sanitizeCounselingText(summary.oracleMessage || summary.opportunity || summary.risk || summary.overallFlow || "");
  }, [readingPayload]);

  const counselingBlocks = useMemo(
    () => buildCounselingCategories(readingPayload, selectedTopic, selectedGemSource),
    [readingPayload, selectedTopic, selectedGemSource]
  );

  return (
    <LazyMotion features={domAnimation}>
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
        @keyframes cdNebulaFloat { 0%,100% { transform: translate3d(0,0,0) scale(1); opacity: .58; } 50% { transform: translate3d(0,-16px,0) scale(1.08); opacity: .84; } }
        @keyframes cdLetterReveal { from { opacity: 0; letter-spacing: .18em; } to { opacity: 1; letter-spacing: .04em; } }
        @keyframes cdCardLeak { 0%,100% { opacity: .1; } 50% { opacity: .42; } }
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
        .cd-hero-emotional { animation: cdLetterReveal .72s ease-out both; }
        .cd-card-light-leak { animation: cdCardLeak 2.8s ease-in-out infinite; }
        @media (max-width: 920px) {
          .cd-result-header-grid { grid-template-columns: minmax(0,1fr) !important; }
          .cd-sync-grid { grid-template-columns: minmax(0,1fr) !important; }
        }
        @media (max-width: 680px) {
          .cd-mobile-readable { font-size: 14px !important; line-height: 1.95 !important; }
        }
      `}</style>
      <StarField />
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: -120, left: "14%", width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(130,93,196,.18), transparent 68%)", animation: "cdNebulaFloat 11s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "22%", right: "8%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(218,165,32,.14), transparent 70%)", animation: "cdNebulaFloat 13s 1.2s ease-in-out infinite" }} />
      </div>
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "calc(16px + env(safe-area-inset-top)) 16px calc(56px + env(safe-area-inset-bottom))",
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
                원석을 올리고, 빛이 켜진 자리에서 읽는 타로
              </h1>
              <p style={{ color: "#d6c4ab", fontSize: 13, lineHeight: 1.85, maxWidth: 720 }}>
                주제를 고른 뒤 원석을 선택하고, 원석을 올려 빛을 채우면 카드와 원석이 함께 말하는 상세 상담형 리딩이 열립니다.
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
                  <div style={{ color: "#d8c5a9", fontSize: 11, marginBottom: 6 }}>선택 카테고리</div>
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
                  <div style={{ position: "relative", width: 280, height: 280, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1px solid ${(selectedGemSource?.glow || "#daa520")}22`, boxShadow: `0 0 30px ${(selectedGemSource?.glow || "#daa520")}22`, background: "radial-gradient(circle, rgba(255,255,255,.05), rgba(0,0,0,.1))" }} />
                    <div style={{ position: "absolute", inset: 18, borderRadius: "50%", border: `1px solid ${(selectedGemSource?.glow || "#daa520")}18` }} />
                    <div style={{ position: "absolute", inset: 40, borderRadius: "50%", border: `1px dashed ${(selectedGemSource?.glow || "#daa520")}24` }} />
                    <CrystalGemVisual gem={selectedGemSource} size={210} immersive />

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
                  <div style={{ color: syncEnergy >= 88 ? (selectedGemSource?.glow || "#daa520") : "#d0c0a7", fontSize: 12 }}>{syncEnergy >= 88 ? "열람 준비 완료" : `${Math.floor(syncEnergy)}%`}</div>
                </div>

                <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                  <button
                    type="button"
                    onClick={handlePay}
                    disabled={paying || !syncReady}
                    style={{
                      borderRadius: 999,
                      border: `1px solid ${(selectedGemSource?.color || "#c8960c")}88`,
                      background: paying || !syncReady ? "rgba(255,255,255,.06)" : `${selectedGemSource?.color || "#c8960c"}28`,
                      color: paying || !syncReady ? "#9f927e" : "#f2e4d1",
                      fontSize: 13,
                      letterSpacing: ".06em",
                      padding: "12px 18px",
                      cursor: paying || !syncReady ? "not-allowed" : "pointer",
                    }}
                  >
                    {paying ? "처리 중..." : syncReady ? `리딩 열람하기 (${CRYSTAL_COST}코인)` : "원석을 조금 더 올려주세요"}
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
          <m.div
            initial={reduceMotion ? false : { opacity: 0, y: 22 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.52, ease: "easeOut" }}
          >
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
                  <div className="cd-hero-emotional cd-mobile-readable" style={{ color: "#f2e2c6", fontSize: 13, lineHeight: 1.85, borderRadius: 16, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", padding: 14 }}>
                    {summaryLine || "원석과 카드가 함께 정리한 전체 흐름이 아래 상세 상담으로 이어집니다."}
                  </div>
                </div>
                <div style={{ borderRadius: 22, border: "1px solid rgba(255,255,255,.12)", background: `linear-gradient(160deg, ${(selectedGemSource?.color || "#c8960c")}24, rgba(8,8,14,.82) 74%)`, backdropFilter: "blur(10px)", padding: 18, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ color: "#d8c5a9", fontSize: 11, marginBottom: 6 }}>선택 원석</div>
                    <div style={{ fontFamily: "Noto Serif KR,serif", fontSize: 24, marginBottom: 8 }}>{selectedGemSource?.name}</div>
                    <div style={{ color: "#d0c0ab", fontSize: 12, lineHeight: 1.75 }}>{selectedGemSource?.meaning}</div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", margin: "8px 0 12px" }}>
                    <CrystalGemVisual gem={selectedGemSource} size={164} />
                  </div>
                  <m.p
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                    transition={{ duration: 0.52, ease: "easeOut" }}
                    style={{
                      margin: "0 0 14px",
                      color: "#f6e9d3",
                      textAlign: "center",
                      fontFamily: "Noto Serif KR,serif",
                      letterSpacing: ".02em",
                      lineHeight: 1.8,
                      textShadow: `0 0 16px ${selectedGemSource?.glow || "#d9b886"}77`,
                    }}
                  >
                    당신의 오늘은, 약해진 마음이 아니라 깊어진 마음으로 읽히고 있어요.
                  </m.p>
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

              <div style={{ marginTop: 14, marginBottom: 6, height: 18, position: "relative" }}>
                <div style={{ position: "absolute", left: "50%", top: 0, transform: "translateX(-50%)", width: 2, height: 18, background: `linear-gradient(180deg, ${(selectedGemSource?.glow || "#daa520")}cc, transparent)` }} />
                <div style={{ position: "absolute", left: "50%", top: 8, transform: "translateX(-50%)", width: "82%", height: 1, background: `linear-gradient(90deg, transparent, ${(selectedGemSource?.glow || "#daa520")}88 14%, ${(selectedGemSource?.glow || "#daa520")}88 86%, transparent)` }} />
              </div>

              <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
                {selectedCards.map((card, idx) => (
                  <m.div
                    key={`${card}-${idx}`}
                    initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.96 }}
                    animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.42, delay: idx * 0.08, ease: "easeOut" }}
                    style={{ borderRadius: 14, position: "relative" }}
                  >
                    <div style={{ position: "absolute", inset: -3, borderRadius: 16, background: `radial-gradient(circle at 50% 36%, ${(selectedGemSource?.glow || "#daa520")}33, transparent 70%)`, pointerEvents: "none" }} />
                    <div className="cd-crystal-flip" style={{ borderRadius: 14, perspective: 900 }}>
                      <div className="cd-crystal-flip__inner" style={{ position: "relative", minHeight: 124, transformStyle: "preserve-3d", transition: "transform .72s cubic-bezier(.4,0,.2,1)" }}>
                        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", borderRadius: 14, border: "1px solid rgba(255,255,255,.12)", background: "linear-gradient(148deg,#140e18 0%,#1e1228 50%,#140e18 100%)", padding: 10 }}>
                          <div className="cd-card-light-leak" style={{ position: "absolute", inset: 0, borderRadius: 14, background: `linear-gradient(122deg, transparent 10%, ${(selectedGemSource?.glow || "#daa520")}22 44%, transparent 78%)`, pointerEvents: "none" }} />
                          <div style={{ fontSize: 10, color: "#c8b28f", marginBottom: 6 }}>{selectedTopic.spread[idx]?.title}</div>
                          <div style={{ fontSize: 12, color: "#f1e5d2", marginBottom: 4 }}>{CARD_KR[card] || card}</div>
                          <div style={{ fontSize: 10, color: "#c0ac8d" }}>{GEMSTONES.find((gem) => gem.id === assignments[idx])?.name || selectedGemSource?.name}</div>
                        </div>
                        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg)", borderRadius: 14, border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.08)", padding: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#dfcaa7", lineHeight: 1.6, textAlign: "center" }}>
                          선택된 카드의 상징을
                          <br />
                          원석의 숨결과 맞추는 중
                        </div>
                      </div>
                    </div>
                  </m.div>
                ))}
              </div>
            </header>

            {loading && (
              <div style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,.12)", padding: 20, background: "rgba(0,0,0,.45)", marginBottom: 14 }}>
                <p style={{ color: "#d8c7ad", fontSize: 13, margin: 0 }}>원석과 카드의 상징을 결합해 상담을 생성하고 있습니다...</p>
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
                    <h4 style={{ margin: 0, marginBottom: 10, fontFamily: "Noto Serif KR,serif", fontSize: 18 }}>마스터 7챕터 심층 상담</h4>
                    <div style={{ display: "grid", gap: 10 }}>
                      {readingPayload.masterChapters.map((chapter) => (
                        <article key={chapter.no || chapter.title} style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", padding: 12 }}>
                          <div style={{ fontSize: 11, color: "#d8c5a9", marginBottom: 5 }}>{chapter.title}</div>
                          {chapter.keywordVisual ? (
                            <div style={{ fontSize: 12, color: "#e2cfad", marginBottom: 7 }}>{sanitizeCounselingText(chapter.keywordVisual)}</div>
                          ) : null}
                          <div style={{ fontSize: 13, color: "#f3e6d2", lineHeight: 1.88, whiteSpace: "pre-wrap" }}>{sanitizeCounselingText(chapter.content)}</div>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {!readingPayload && !!readingText && (
              <div className="cd-scroll-surface" style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 18, background: "rgba(8,8,14,.72)", padding: 16, marginBottom: 14, maxHeight: "56vh", overflowY: "auto" }}>
                <pre className="cd-mobile-readable" style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "Noto Serif KR,serif", lineHeight: 1.95, color: "#e8dbc8", fontSize: 13 }}>{readingText}</pre>
              </div>
            )}

            {readingPayload?.summary && (
              <footer style={{ border: "1px solid rgba(255,255,255,.14)", borderRadius: 20, background: "rgba(8,8,14,.82)", padding: 16, marginBottom: 16 }}>
                <h3 style={{ margin: 0, marginBottom: 6, fontFamily: "Noto Serif KR,serif", fontSize: 20 }}>오늘 당신에게 건네는 여섯 장의 상담</h3>
                <p style={{ margin: "0 0 14px", color: "#dcc8aa", lineHeight: 1.8, fontSize: 13 }}>
                  차가운 설명 대신, 지금 당신의 마음에 직접 닿는 흐름으로 정리해 두었습니다.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 }}>
                  {counselingBlocks.map((block, idx) => (
                    <m.article
                      key={block.title}
                      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                      transition={{ duration: 0.36, delay: idx * 0.06, ease: "easeOut" }}
                      style={{
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,.1)",
                        background: "linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.02))",
                        padding: 12,
                      }}
                    >
                      <div style={{ fontSize: 12, color: "#f3dcc0", marginBottom: 8, fontFamily: "Noto Serif KR,serif" }}>{block.title}</div>
                      <div style={{ color: "#efe1cd", fontSize: 13, lineHeight: 1.85, marginBottom: 8 }}>{sanitizeCounselingText(block.intro)}</div>
                      <div style={{ display: "grid", gap: 7 }}>
                        {block.points.map((point, pointIdx) => (
                          <div key={`${block.title}-${pointIdx}`} style={{ color: "#eadcc8", fontSize: 12, lineHeight: 1.78 }}>
                            {sanitizeCounselingText(point)}
                          </div>
                        ))}
                      </div>
                    </m.article>
                  ))}
                </div>
              </footer>
            )}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={requestReading}
                disabled={loading}
                style={{
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,.24)",
                  background: "rgba(255,255,255,.06)",
                  color: "#e7d8c2",
                  fontSize: 12,
                  padding: "8px 12px",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                다시 뽑기
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
          </m.div>
        )}
      </div>
    </section>
    </LazyMotion>
  );
}
