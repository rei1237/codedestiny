import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
    meaning: "창의성과 실행력을 현실 성과로 연결하는 원석",
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

function buildLocalFallback(topic, coreGem, cards) {
  const lines = [];
  lines.push(`${topic.title} 크리스탈 소울 리딩`);
  lines.push(`핵심 원석: ${coreGem.name}`);
  lines.push("");
  cards.forEach((card, idx) => {
    const spread = topic.spread[idx];
    lines.push(`${idx + 1}. ${spread.title}`);
    lines.push(`카드: ${CARD_KR[card] || card}`);
    lines.push(`질문: ${spread.question}`);
    lines.push(`${coreGem.name}의 기운은 지금 과도한 불안이나 기대를 잠시 내려놓고, 한 번에 하나의 실행으로 흐름을 바꿔보라고 말합니다.`);
    lines.push("오늘은 결론을 서두르기보다 기준을 세우고 검증 가능한 행동을 먼저 남겨 보세요.");
    lines.push("");
  });
  lines.push("종합 조언");
  lines.push("지금의 흐름은 막힘이 아니라 재정렬의 신호입니다. 문제를 크게 보는 대신, 오늘 움직일 수 있는 가장 작은 행동을 선택하면 리딩의 방향성이 현실에서 작동하기 시작합니다.");
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
        background: `linear-gradient(155deg, ${gem.color}1f, rgba(8,8,14,.92) 65%)`,
        padding: "18px 16px",
        boxShadow: `0 0 0 1px rgba(255,255,255,.04), 0 18px 48px ${gem.glow}22`,
        color: "#f2e8da",
        cursor: "pointer",
        transition: "transform .24s ease, box-shadow .24s ease",
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.transform = "translateY(-3px)";
        event.currentTarget.style.boxShadow = `0 0 0 1px rgba(255,255,255,.08), 0 24px 56px ${gem.glow}44`;
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.transform = "translateY(0)";
        event.currentTarget.style.boxShadow = `0 0 0 1px rgba(255,255,255,.04), 0 18px 48px ${gem.glow}22`;
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 20, color: gem.glow }}>{topic.icon}</span>
        <span style={{ fontSize: 11, color: "#dac7aa", letterSpacing: ".08em" }}>{topic.themeCrystal}</span>
      </div>
      <div style={{ fontFamily: "Noto Serif KR,serif", fontSize: 18, lineHeight: 1.45, marginBottom: 8 }}>{topic.title}</div>
      <div style={{ fontSize: 12, color: "#c7b7a1", lineHeight: 1.65, marginBottom: 10 }}>{topic.subtitle}</div>
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

function ReadingSection({ section, expanded, onToggle }) {
  return (
    <article style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 16, background: "rgba(12,12,20,.8)", overflow: "hidden" }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          textAlign: "left",
          background: "linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.01))",
          color: "#f0e3d1",
          border: "none",
          padding: "14px 14px 12px",
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 44, height: 74, borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,.2)", background: "#111" }}>
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
            </div>
          </div>
          <div style={{ fontSize: 12, color: "#d8c7af" }}>{expanded ? "접기" : "펼치기"}</div>
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: "#bba88d" }}>{section.crystalName}</div>
      </button>

      {expanded && (
        <div style={{ padding: "14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8, marginBottom: 12 }}>
            <div style={{ border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, padding: "8px 10px", fontSize: 12, color: "#dccdb8" }}>
              타로 키워드: {section.tarotKeywords.join(", ")}
            </div>
            <div style={{ border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, padding: "8px 10px", fontSize: 12, color: "#dccdb8" }}>
              원석 키워드: {section.crystalKeywords.join(", ")}
            </div>
          </div>

          <p style={{ color: "#e8dbc8", fontSize: 13, lineHeight: 1.8, marginBottom: 10 }}><strong>이 카드의 기본 의미</strong><br />{section.cardMeaning}</p>
          <p style={{ color: "#e8dbc8", fontSize: 13, lineHeight: 1.8, marginBottom: 10 }}><strong>이 원석의 기운</strong><br />{section.crystalMeaning}</p>
          <p style={{ color: "#e8dbc8", fontSize: 13, lineHeight: 1.8, marginBottom: 10 }}><strong>이 위치에서의 해석</strong><br />{section.positionInterpretation}</p>
          <p style={{ color: "#e8dbc8", fontSize: 13, lineHeight: 1.8, marginBottom: 10 }}><strong>카테고리별 상담</strong><br />{section.categoryReading}</p>
          <p style={{ color: "#e8dbc8", fontSize: 13, lineHeight: 1.8, marginBottom: 10 }}><strong>기회</strong><br />{section.opportunity}</p>
          <p style={{ color: "#e8dbc8", fontSize: 13, lineHeight: 1.8, marginBottom: 10 }}><strong>주의점</strong><br />{section.caution}</p>
          <p style={{ color: "#e8dbc8", fontSize: 13, lineHeight: 1.8 }}><strong>오늘의 행동</strong><br />{section.action}</p>
        </div>
      )}
    </article>
  );
}

export default function CrystalSoulTarot() {
  const [selectedTopic, setSelectedTopic] = useState(null);
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
  const typeTimerRef = useRef(null);

  useBodyLock(true);

  const coreGem = useMemo(() => {
    if (!selectedTopic) return null;
    return findGemByName(selectedTopic.themeCrystal);
  }, [selectedTopic]);

  const resetAll = useCallback(() => {
    setSelectedTopic(null);
    setSelectedCards([]);
    setAssignments({});
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

  const onSelectTopic = useCallback((topic) => {
    const cards = pickUniqueCards(5);
    const primaryGem = findGemByName(topic.themeCrystal);
    setSelectedTopic(topic);
    setSelectedCards(cards);
    setAssignments(buildAssignments(primaryGem.id, cards.length));
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
    const fullText = String(text || "").trim();
    if (!fullText) {
      setLoading(false);
      return;
    }
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
          gemstonesMap: Object.fromEntries(GEMSTONES.map((gem) => [gem.id, { name: gem.name, theme: gem.meaning }])),
        }),
      });

      const data = await res.json().catch(() => ({}));
      const payload = data?.readingData && Array.isArray(data.readingData?.sections) ? data.readingData : null;
      const text = String(data?.reading || "").trim() || buildLocalFallback(selectedTopic, coreGem, selectedCards);

      if (payload) {
        setReadingPayload(payload);
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

  const summaryLine = useMemo(() => {
    if (!readingPayload?.summary) return "";
    const risk = String(readingPayload.summary.risk || "").trim();
    const opportunity = String(readingPayload.summary.opportunity || "").trim();
    return opportunity || risk;
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
        background: "radial-gradient(circle at 50% -10%, #1a1329 0%, #090811 48%, #040407 100%)",
        color: "#f5ebdc",
      }}
    >
      <div
        style={{
          maxWidth: 1040,
          margin: "0 auto",
          padding: "18px 16px calc(56px + env(safe-area-inset-bottom))",
          minHeight: "100dvh",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
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
            {selectedTopic ? "카테고리로" : "뒤로가기"}
          </button>
          <div style={{ fontSize: 11, color: "#ceb89a", letterSpacing: ".14em" }}>CRYSTAL SOUL TAROT</div>
        </div>

        {!selectedTopic && (
          <div>
            <header style={{ marginBottom: 22 }}>
              <h1 style={{ fontFamily: "Noto Serif KR,serif", fontSize: "clamp(24px,4.6vw,36px)", fontWeight: 400, lineHeight: 1.45, marginBottom: 8 }}>
                독립된 신비의 리딩 공간
              </h1>
              <p style={{ color: "#d6c4ab", fontSize: 13, lineHeight: 1.8 }}>
                지금 가장 중요한 질문 카테고리를 고르면 5장의 카드와 원석 상징을 결합해 깊이 있는 상담형 리딩을 제공합니다.
              </p>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
              {TOPICS.map((topic) => (
                <TopicCard key={topic.id} topic={topic} onSelect={onSelectTopic} />
              ))}
            </div>
          </div>
        )}

        {selectedTopic && (
          <div>
            <header
              style={{
                border: `1px solid ${coreGem?.color || "#c8960c"}66`,
                borderRadius: 18,
                background: "rgba(8,8,14,.82)",
                padding: "14px",
                marginBottom: 16,
                boxShadow: `0 0 36px ${(coreGem?.glow || "#daa520")}2d`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ color: "#d8c5a9", fontSize: 11, marginBottom: 5 }}>선택 카테고리</div>
                  <div style={{ fontFamily: "Noto Serif KR,serif", fontSize: 22, marginBottom: 8 }}>{selectedTopic.title}</div>
                  <div style={{ color: "#cbb69a", fontSize: 12, lineHeight: 1.7 }}>{selectedTopic.subtitle}</div>
                </div>
                <div style={{ minWidth: 190 }}>
                  <div style={{ color: "#d8c5a9", fontSize: 11, marginBottom: 5 }}>핵심 원석</div>
                  <div style={{ fontSize: 15, marginBottom: 6 }}>{coreGem?.name}</div>
                  <div style={{ color: "#cbb69a", fontSize: 12, lineHeight: 1.65 }}>{coreGem?.meaning}</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                {selectedTopic.themeKeywords.map((keyword) => (
                  <span key={keyword} style={{ fontSize: 11, color: "#e4d4bf", borderRadius: 999, border: "1px solid rgba(255,255,255,.2)", padding: "3px 9px" }}>
                    {keyword}
                  </span>
                ))}
              </div>

              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
                {selectedCards.map((card, idx) => (
                  <div key={`${card}-${idx}`} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", padding: "8px" }}>
                    <div style={{ fontSize: 10, color: "#c8b28f", marginBottom: 4 }}>{selectedTopic.spread[idx]?.title}</div>
                    <div style={{ fontSize: 12, color: "#f1e5d2", marginBottom: 4 }}>{CARD_KR[card] || card}</div>
                    <div style={{ fontSize: 10, color: "#c0ac8d" }}>{GEMSTONES.find((gem) => gem.id === assignments[idx])?.name || coreGem?.name}</div>
                  </div>
                ))}
              </div>

              {summaryLine && <p style={{ marginTop: 12, fontSize: 12, color: "#f0debf", lineHeight: 1.7 }}>{summaryLine}</p>}
            </header>

            {!paid && (
              <div
                style={{
                  border: `1px solid ${(coreGem?.color || "#c8960c")}66`,
                  borderRadius: 16,
                  background: "rgba(3,3,7,.76)",
                  padding: "18px",
                  marginBottom: 16,
                  textAlign: "center",
                }}
              >
                <p style={{ color: "#dbc9ae", fontSize: 13, lineHeight: 1.8, marginBottom: 12 }}>
                  리딩 결과 열람 시 <strong style={{ color: coreGem?.color }}>{CRYSTAL_COST}코인</strong>이 차감됩니다.
                </p>
                {payError && <p style={{ color: "#ff9f9f", fontSize: 12, marginBottom: 10 }}>{payError}</p>}
                <button
                  type="button"
                  onClick={handlePay}
                  disabled={paying}
                  style={{
                    border: `1px solid ${(coreGem?.color || "#c8960c")}88`,
                    borderRadius: 999,
                    background: paying ? "rgba(255,255,255,.08)" : `${coreGem?.color || "#c8960c"}25`,
                    color: paying ? "#9f927e" : "#f2e4d1",
                    fontSize: 13,
                    letterSpacing: ".06em",
                    padding: "10px 18px",
                    cursor: paying ? "not-allowed" : "pointer",
                  }}
                >
                  {paying ? "처리 중..." : `리딩 열람하기 (${CRYSTAL_COST}코인)`}
                </button>
              </div>
            )}

            {paid && (
              <>
                {loading && (
                  <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.12)", padding: "20px", background: "rgba(0,0,0,.45)", marginBottom: 14 }}>
                    <p style={{ color: "#d8c7ad", fontSize: 13 }}>원석과 카드의 상징을 결합해 상담을 생성하고 있습니다...</p>
                  </div>
                )}

                {!!error && (
                  <div style={{ borderRadius: 14, border: "1px solid rgba(255,120,120,.5)", padding: "14px", background: "rgba(40,0,0,.35)", marginBottom: 14 }}>
                    <p style={{ color: "#ffb0b0", fontSize: 12 }}>{error}</p>
                  </div>
                )}

                {readingPayload && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8, marginBottom: 10 }}>
                      {readingPayload.sections.map((section, index) => (
                        <div key={`summary-${index}`} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.04)", padding: "8px" }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                            <div style={{ width: 34, height: 56, borderRadius: 6, overflow: "hidden", border: "1px solid rgba(255,255,255,.2)", background: "#111" }}>
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
                              <div style={{ fontSize: 10, color: "#d5c09f" }}>{section.positionTitle}</div>
                              <div style={{ fontSize: 12, color: "#f2e5d1" }}>{section.cardNameKo}</div>
                            </div>
                          </div>
                          <div style={{ fontSize: 10, color: "#c6b091", marginBottom: 2 }}>{section.orientation === "reversed" ? "역방향" : "정방향"}</div>
                          <div style={{ fontSize: 10, color: "#c6b091", marginBottom: 2 }}>{section.crystalName}</div>
                          <div style={{ fontSize: 10, color: "#b9a689", lineHeight: 1.45 }}>타로: {section.tarotKeywords.slice(0, 2).join(", ")}</div>
                          <div style={{ fontSize: 10, color: "#b9a689", lineHeight: 1.45 }}>원석: {section.crystalKeywords.slice(0, 2).join(", ")}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: "grid", gap: 10 }}>
                    {readingPayload.sections.map((section, index) => (
                      <ReadingSection
                        key={`${section.positionTitle}-${index}`}
                        section={section}
                        expanded={expandedSet.has(index)}
                        onToggle={() => toggleSection(index)}
                      />
                    ))}
                    </div>
                  </div>
                )}

                {!readingPayload && !!readingText && (
                  <div style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 14, background: "rgba(8,8,14,.72)", padding: "14px", marginBottom: 14 }}>
                    <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "Noto Serif KR,serif", lineHeight: 1.95, color: "#e8dbc8", fontSize: 13 }}>
                      {readingText}
                    </pre>
                  </div>
                )}

                {readingPayload?.summary && (
                  <footer style={{ border: "1px solid rgba(255,255,255,.14)", borderRadius: 16, background: "rgba(8,8,14,.82)", padding: "14px", marginBottom: 16 }}>
                    <h3 style={{ margin: 0, marginBottom: 10, fontFamily: "Noto Serif KR,serif", fontSize: 18 }}>카테고리 종합 리딩</h3>
                    <p style={{ fontSize: 13, lineHeight: 1.8, color: "#e9dcc8", marginBottom: 8 }}><strong>전체 흐름</strong><br />{readingPayload.summary.overallFlow}</p>
                    <p style={{ fontSize: 13, lineHeight: 1.8, color: "#e9dcc8", marginBottom: 8 }}><strong>가장 강한 신호</strong><br />{readingPayload.summary.strongestSignal}</p>
                    <p style={{ fontSize: 13, lineHeight: 1.8, color: "#e9dcc8", marginBottom: 8 }}><strong>기회</strong><br />{readingPayload.summary.opportunity}</p>
                    <p style={{ fontSize: 13, lineHeight: 1.8, color: "#e9dcc8", marginBottom: 8 }}><strong>주의할 점</strong><br />{readingPayload.summary.risk}</p>
                    <p style={{ fontSize: 13, lineHeight: 1.8, color: "#e9dcc8", marginBottom: 8 }}><strong>타이밍 조언</strong><br />{readingPayload.summary.timingAdvice}</p>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 13, color: "#f2e5d1", marginBottom: 4 }}><strong>실행 체크리스트</strong></div>
                      <ol style={{ margin: 0, paddingLeft: 18, color: "#e9dcc8", fontSize: 13, lineHeight: 1.8 }}>
                        {(readingPayload.summary.practicalActions || []).map((item, idx) => (
                          <li key={`${idx}-${item}`}>{item}</li>
                        ))}
                      </ol>
                    </div>
                    <p style={{ fontSize: 13, lineHeight: 1.8, color: "#f2e1c4", marginBottom: 0 }}><strong>크리스탈 오라클 메시지</strong><br />{readingPayload.summary.oracleMessage}</p>
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
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
