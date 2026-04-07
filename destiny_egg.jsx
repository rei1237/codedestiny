import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";

const STORAGE_KEY = "destiny_tamagochi_v2";

const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const BRANCH_ANIMAL_KEYS = ["rat", "ox", "tiger", "rabbit", "dragon", "snake", "horse", "goat", "monkey", "rooster", "dog", "pig"];

const ANIMALS = {
  rat: { ko: "쥐", emoji: "🐭", personality: "영리하고 호기심 많은", cry: "찍찍!" },
  ox: { ko: "소", emoji: "🐮", personality: "성실하고 듬직한", cry: "음메!" },
  tiger: { ko: "호랑이", emoji: "🐯", personality: "용감하고 추진력 있는", cry: "어흥!" },
  rabbit: { ko: "토끼", emoji: "🐰", personality: "다정하고 감수성 높은", cry: "깡총!" },
  dragon: { ko: "용", emoji: "🐲", personality: "카리스마 있고 큰 그림을 보는", cry: "크르릉!" },
  snake: { ko: "뱀", emoji: "🐍", personality: "직관이 뛰어나고 섬세한", cry: "쉬익!" },
  horse: { ko: "말", emoji: "🐴", personality: "자유롭고 활기찬", cry: "히힝!" },
  goat: { ko: "양", emoji: "🐑", personality: "온화하고 예술 감각이 있는", cry: "음메에!" },
  monkey: { ko: "원숭이", emoji: "🐵", personality: "재치 있고 센스 좋은", cry: "끼익!" },
  rooster: { ko: "닭", emoji: "🐓", personality: "부지런하고 꼼꼼한", cry: "꼬끼오!" },
  dog: { ko: "개", emoji: "🐶", personality: "충직하고 배려심 깊은", cry: "멍멍!" },
  pig: { ko: "돼지", emoji: "🐷", personality: "복이 많고 낙천적인", cry: "꿀꿀!" },
};

const HOUR_BRANCHES = [
  { value: "자", label: "자시", icon: "🌙", range: "23-01" },
  { value: "축", label: "축시", icon: "🐂", range: "01-03" },
  { value: "인", label: "인시", icon: "🐯", range: "03-05" },
  { value: "묘", label: "묘시", icon: "🐇", range: "05-07" },
  { value: "진", label: "진시", icon: "🐉", range: "07-09" },
  { value: "사", label: "사시", icon: "🐍", range: "09-11" },
  { value: "오", label: "오시", icon: "☀️", range: "11-13" },
  { value: "미", label: "미시", icon: "🐐", range: "13-15" },
  { value: "신", label: "신시", icon: "🐒", range: "15-17" },
  { value: "유", label: "유시", icon: "🐓", range: "17-19" },
  { value: "술", label: "술시", icon: "🐕", range: "19-21" },
  { value: "해", label: "해시", icon: "🐗", range: "21-23" },
];

const THEMES = {
  blossom: {
    name: "벚꽃",
    sky: "#87CEEB",
    grass: "#7BC67E",
    accent: "#E8A0BF",
    egg: "/fuctionassets/tadagochi/벚꽃 컨셉/벚꽃의 알.webp",
    folder: "벚꽃 컨셉",
  },
  macaron: {
    name: "마카롱",
    sky: "#8FD0FF",
    grass: "#88CD85",
    accent: "#FFD700",
    egg: "/fuctionassets/tadagochi/마카롱 컨셉/마카롱 알.webp",
    folder: "마카롱 컨셉",
  },
  strawberry: {
    name: "딸기",
    sky: "#A6D8FF",
    grass: "#7BC67E",
    accent: "#FF8C42",
    egg: "/fuctionassets/tadagochi/딸기 컨셉/딸기 알.webp",
    folder: "딸기 컨셉",
  },
  space: {
    name: "우주",
    sky: "#7CB5FF",
    grass: "#72BE7B",
    accent: "#FFD700",
    egg: "/fuctionassets/tadagochi/우주 테마/우주 컨셉 알.webp",
    folder: "우주 테마",
  },
  blackstar: {
    name: "검은별",
    sky: "#89B4FF",
    grass: "#6FBE7E",
    accent: "#FF8C42",
    egg: "/fuctionassets/tadagochi/검은 별 컨셉/검은별 알-Photoroom.png",
    folder: "검은 별 컨셉",
  },
};

const THEME_KEYS = Object.keys(THEMES);

const SPRITE_LAYOUT = {
  blossom: { cols: 6, rows: 4, blend: false, states: { idle: [0, 1], happy: [6, 12], sad: [7], surprised: [8], sleep: [14, 15], eating: [13], dance: [16, 20], worried: [11], excited: [18] } },
  macaron: { cols: 5, rows: 4, blend: false, states: { idle: [0, 1], happy: [5, 10], sad: [6], surprised: [7], sleep: [15, 16], eating: [11], dance: [19], worried: [9], excited: [18] } },
  strawberry: { cols: 7, rows: 3, blend: true, states: { idle: [0, 1], happy: [7, 14], sad: [8], surprised: [9], sleep: [16, 17], eating: [15], dance: [18, 25], worried: [12], excited: [21] } },
  space: { cols: 6, rows: 3, blend: true, states: { idle: [0, 1], happy: [6], sad: [7], surprised: [8], sleep: [13], eating: [15], dance: [12, 17], worried: [11], excited: [16] } },
  blackstar: { cols: 6, rows: 4, blend: false, states: { idle: [0, 1], happy: [6, 12], sad: [7], surprised: [8], sleep: [14, 15], eating: [13], dance: [16, 20], worried: [11], excited: [18] } },
};

const FILE_BY_THEME = {
  blossom: { rat: "벚꽃 컨셉 쥐.webp", ox: "벚꽃 컨셉 소.webp", tiger: "벚꽃 컨셉 호랑이.webp", rabbit: "벚꽃 컨셉 토끼.webp", dragon: "벚꽃 컨셉 용.webp", snake: "벚꽃 컨셉 뱀.webp", horse: "벚꽃 컨셉 말.webp", goat: "벚꽃 컨셉 양.webp", monkey: "벚꽃 컨셉 원숭이.webp", rooster: "벚꽃 컨셉 닭.webp", dog: "벚꽃 컨셉 강아지.webp", pig: "벚꽃 컨셉 돼지.webp" },
  macaron: { rat: "마카롱 컨셉 쥐.webp", ox: "마카롱 컨셉 소.webp", tiger: "마카롱 컨셉 호랑이.webp", rabbit: "마카롱 컨셉 토끼.webp", dragon: "마카롱 컨셉 용.webp", snake: "마카롱 컨셉 뱀.webp", horse: "마카롱 컨셉 말.webp", goat: "마카롱 컨셉 양.webp", monkey: "마카롱 컨셉 원숭이.webp", rooster: "마카롱 컨셉 닭.webp", dog: "마카롱 컨셉 강아지.webp", pig: "마카롱 컨셉 돼지.webp" },
  strawberry: { rat: "딸기테마쥐.webp", ox: "딸기테마소.webp", tiger: "딸기테마 호랑이.webp", rabbit: "딸기테마토끼.webp", dragon: "딸기테마용.webp", snake: "딸기테마뱀.webp", horse: "딸기테마말.webp", goat: "딸기테마양.webp", monkey: "딸기테마원숭이.webp", rooster: "딸기테마닭.webp", dog: "딸기테마개.webp", pig: "딸기테마돼지.webp" },
  space: { rat: "우주 테마 쥐.webp", ox: "우주 테마 소.webp", tiger: "우주 테마 호랑이.webp", rabbit: "우주 테마 토끼.webp", dragon: "우주 테마 용.webp", snake: "우주 테마 뱀.webp", horse: "우주 테마 말.webp", goat: "우주 테마 양.webp", monkey: "우주 테마 원숭이.webp", rooster: "우주 테마 닭.webp", dog: "우주 테마 개.webp", pig: "우주 테마 돼지.webp" },
  blackstar: { rat: "별 컨셉 쥐1.webp", ox: "별 컨셉 소.webp", tiger: "별 컨셉 호랑이.webp", rabbit: "별 컨셉 토끼.webp", dragon: "별 컨셉 용.webp", snake: "별 컨셉 뱀.webp", horse: "별 컨셉 말.webp", goat: "별 컨셉 양.webp", monkey: "별 컨셉 원숭이.webp", rooster: "별 컨셉 닭.webp", dog: "별 컨셉 강아지.webp", pig: "별 컨셉 돼지.webp" },
};

const FORTUNE_CATEGORIES = {
  "오늘의 운세": { icon: "🌟", sub: ["종합 하루 운세", "시간대별 운세 (오전/오후/저녁)", "오늘의 조심할 것", "오늘의 행운 키워드"] },
  "연애·관계운": { icon: "💕", sub: ["현재 연애운", "짝사랑 성사 가능성", "연인과의 갈등 해소", "새로운 만남 시기", "궁합 분석", "이별 후 재회운"] },
  "직장·사업운": { icon: "💼", sub: ["취업·이직 운", "승진·인정받는 시기", "사업 시작 타이밍", "직장 내 인간관계", "창업 아이템 조언", "재테크·투자 방향"] },
  "금전·재물운": { icon: "💰", sub: ["이번 달 재물운", "횡재수·기회운", "지출 주의 시기", "부동산 운", "주식·코인 타이밍", "빌려준 돈 회수 가능성"] },
  "건강·에너지운": { icon: "🌿", sub: ["몸 컨디션 운세", "조심해야 할 신체 부위", "스트레스 해소법", "이번 달 운동 방향", "수면·휴식 조언"] },
  "가족·집안운": { icon: "🏠", sub: ["부모님과의 관계", "형제자매 운", "이사·집 구하기 운", "임신·출산 운", "반려동물 운"] },
  "학업·시험운": { icon: "📚", sub: ["수험 합격운", "집중력·공부 운", "유학·해외 연수 운", "자격증 취득 시기", "멘토 만남 운"] },
  "특별 운세": { icon: "✨", sub: ["올해의 총운", "3개월 운세", "인생 전환점 예측", "전생 인연 분석", "드림 해석", "행운의 방향·색·숫자·음식"] },
};

function calcIlju(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  const jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  const cycleIdx = ((jdn + 16) % 60 + 60) % 60;
  const stemIdx = cycleIdx % 10;
  const branchIdx = cycleIdx % 12;
  return {
    ilju: `${STEMS[stemIdx]}${BRANCHES[branchIdx]}`,
    stemIdx,
    branchIdx,
    animalKey: BRANCH_ANIMAL_KEYS[branchIdx],
  };
}

const STEM_ELEMENT = ["木", "木", "火", "火", "土", "土", "金", "金", "水", "水"];
const BRANCH_ELEMENT = ["水", "土", "木", "木", "土", "火", "火", "土", "金", "金", "土", "水"];

const ILJU_ANIMAL_MAP = (() => {
  const map = {};
  for (let i = 0; i < 60; i += 1) {
    const stemIdx = i % 10;
    const branchIdx = i % 12;
    const ilju = `${STEMS[stemIdx]}${BRANCHES[branchIdx]}`;
    const animalKey = BRANCH_ANIMAL_KEYS[branchIdx];
    const animal = ANIMALS[animalKey];
    map[ilju] = {
      ilju,
      animal: animal.ko,
      animalKey,
      element: `${STEM_ELEMENT[stemIdx]}${BRANCH_ELEMENT[branchIdx]}`,
      imagePath: "/fuctionassets/tadagochi",
      personality: animal.personality,
    };
  }
  return map;
})();

function pickTheme(stemIdx, branchIdx) {
  return THEME_KEYS[(stemIdx * 3 + branchIdx * 5) % THEME_KEYS.length];
}

function getSpritePath(themeKey, animalKey) {
  const folder = THEMES[themeKey].folder;
  const file = FILE_BY_THEME[themeKey][animalKey];
  return `/fuctionassets/tadagochi/${folder}/${file}`;
}

function buildFortunePrompt(category, subCategory, birthInfo, iljuInfo) {
  return `당신은 사주 전문가이면서 귀여운 ${iljuInfo.animal} 캐릭터입니다.
${iljuInfo.personality} 성격으로 말하며, 반말과 이모티콘을 자연스럽게 섞어 사용합니다.

사용자 정보:
- 생년월일시: ${birthInfo.year}년 ${birthInfo.month}월 ${birthInfo.day}일 ${birthInfo.hourLabel}
- 일주: ${iljuInfo.ilju} (${iljuInfo.animal})
- 오행: ${iljuInfo.element}

요청 카테고리: ${category} > ${subCategory}

위 사주 정보를 기반으로 ${subCategory}에 대한 운세를 분석해줘.
- 구체적인 시기나 방향 제시 포함
- 조언은 실천 가능한 것으로
- 150-200자 이내로 핵심만
- 마지막에 오늘의 행운 아이템 1개 제시`;
}

function buildChatSystemPrompt(iljuInfo, petName) {
  return `당신은 사용자의 일주 수호 동물 ${iljuInfo.animal}입니다.
이름은 ${petName}입니다.
성격: ${iljuInfo.personality}
말투: 친근한 반말, 가끔 동물 감탄사 사용 (${ANIMALS[iljuInfo.animalKey].cry})
역할: 사용자의 사주를 알고 있는 수호 동물로서 일상 대화, 고민 상담, 운세 조언
규칙:
1. 항상 캐릭터 성격 유지
2. 사주 질문은 쉽고 전문적으로
3. 부정적인 내용은 희망적으로 마무리
4. 응답은 3문장 이내
5. 가끔 오늘의 행운 아이템 언급`;
}

async function askAi(systemPrompt, userPrompt) {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system: systemPrompt, messages: [{ role: "user", content: userPrompt }], max_tokens: 500 }),
  });
  const json = await res.json();
  return json.text || json.content || json?.choices?.[0]?.message?.content || "오늘은 너에게 좋은 흐름이야!";
}

function useTypingText(text, speed = 24) {
  const [out, setOut] = useState("");
  useEffect(() => {
    if (!text) {
      setOut("");
      return;
    }
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);
  return out;
}

function CloudBackground({ theme }) {
  const t = THEMES[theme];
  return (
    <div className="ac-bg" style={{ ["--sky"]: t.sky, ["--grass"]: t.grass }}>
      <div className="sky-layer" />
      <div className="cloud c1" />
      <div className="cloud c2" />
      <div className="cloud c3" />
      <div className="grass-layer" />
    </div>
  );
}

function StepInput({ value, setValue, min, max, title, onNext }) {
  return (
    <div className="step-card slide-in">
      <h3>{title}</h3>
      <input type="number" value={value} onChange={(e) => setValue(e.target.value)} min={min} max={max} />
      <button className="ac-btn" onClick={onNext}>Next</button>
    </div>
  );
}

function CharacterSprite({ theme, animalKey, state }) {
  const layout = SPRITE_LAYOUT[theme];
  const spritePath = getSpritePath(theme, animalKey);
  const list = layout.states[state] || layout.states.idle;
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setFrame((p) => (p + 1) % list.length), 550);
    return () => clearInterval(timer);
  }, [list.length]);

  const idx = list[frame];
  const col = idx % layout.cols;
  const row = Math.floor(idx / layout.cols);
  const x = layout.cols <= 1 ? 0 : (col / (layout.cols - 1)) * 100;
  const y = layout.rows <= 1 ? 0 : (row / (layout.rows - 1)) * 100;

  return (
    <div
      className="sprite"
      style={{
        backgroundImage: `url(${spritePath})`,
        backgroundSize: `${layout.cols * 100}% ${layout.rows * 100}%`,
        backgroundPosition: `${x}% ${y}%`,
        mixBlendMode: layout.blend ? "multiply" : "normal",
      }}
    />
  );
}

function FortuneCalendar({ ilju, onPickDate }) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i += 1) cells.push(null);
  for (let d = 1; d <= days; d += 1) cells.push(d);

  const dayScore = (d) => (d * 7 + ilju.stemIdx * 11 + ilju.branchIdx * 13) % 100;
  const top3 = [...Array(days).keys()].map((i) => i + 1).sort((a, b) => dayScore(b) - dayScore(a)).slice(0, 3);

  const iconByScore = (s) => {
    if (s > 80) return "🌟";
    if (s > 62) return "💰";
    if (s > 45) return "💕";
    if (s < 20) return "⚡";
    return "✨";
  };

  return (
    <div className="calendar-wrap">
      <div className="calendar-grid">
        {cells.map((d, i) => {
          if (!d) return <div key={`e-${i}`} className="cell empty" />;
          const score = dayScore(d);
          return (
            <button key={d} className={`cell ${top3.includes(d) ? "best" : ""}`} onClick={() => onPickDate(d, iconByScore(score))}>
              <span>{d}</span>
              <small>{iconByScore(score)}</small>
            </button>
          );
        })}
      </div>
      <p className="hint">이번 달 추천일: {top3.join(", ")}일</p>
    </div>
  );
}

export default function App() {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState("setup");
  const [step, setStep] = useState(0);
  const [birth, setBirth] = useState({ year: "", month: "", day: "", hour: "" });
  const [petName, setPetName] = useState("쥐이");
  const [user, setUser] = useState(null);
  const [mood, setMood] = useState("normal");
  const [activePanel, setActivePanel] = useState("fortune");
  const [bubble, setBubble] = useState("");
  const typedBubble = useTypingText(bubble);
  const [fortuneMain, setFortuneMain] = useState(Object.keys(FORTUNE_CATEGORIES)[0]);
  const [fortuneSub, setFortuneSub] = useState(FORTUNE_CATEGORIES[Object.keys(FORTUNE_CATEGORIES)[0]].sub[0]);
  const [fortuneResult, setFortuneResult] = useState("");
  const [loadingFortune, setLoadingFortune] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [dayPreview, setDayPreview] = useState("");
  const shareRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setUser(parsed);
        setPhase("main");
        setMood(getAutoMood());
        setChatMessages([{ role: "pet", text: `${parsed.petName} 왔어! 오늘도 같이 놀자 ${ANIMALS[parsed.iljuInfo.animalKey].cry}` }]);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setMood(getAutoMood()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const currentTheme = user?.theme || "blossom";

  function getAutoMood() {
    const h = new Date().getHours();
    if (h >= 0 && h < 6) return "sleepy";
    if (h >= 6 && h < 12) return "happy";
    if (h >= 12 && h < 19) return "normal";
    return "worried";
  }

  function resolveState() {
    if (mood === "sleepy") return "sleep";
    if (mood === "happy") return "happy";
    if (mood === "excited") return "dance";
    if (mood === "worried") return "sad";
    return "idle";
  }

  function saveUser(next) {
    setUser(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }

  function finishSetup() {
    const y = Number(birth.year);
    const m = Number(birth.month);
    const d = Number(birth.day);
    if (!y || !m || !d || !birth.hour) return;
    const ilju = calcIlju(y, m, d);
    const iljuInfo = ILJU_ANIMAL_MAP[ilju.ilju];
    const theme = pickTheme(ilju.stemIdx, ilju.branchIdx);
    const hourInfo = HOUR_BRANCHES.find((h) => h.value === birth.hour);
    const next = {
      birthInfo: { year: y, month: m, day: d, hour: birth.hour, hourLabel: `${hourInfo.label} ${hourInfo.range}시` },
      iljuInfo,
      ilju,
      theme,
      petName: petName.trim() || `${iljuInfo.animal}이`,
      affection: 0,
    };
    saveUser(next);
    setBubble("당신의 운명의 알이 나타났습니다!");
    setPhase("hatching");
    setTimeout(() => {
      setPhase("main");
      setBubble(`안녕! 나는 ${iljuInfo.ilju} ${iljuInfo.animal}야! ${iljuInfo.personality} 성격이지~`);
      setChatMessages([{ role: "pet", text: `${next.petName}이 부화했어! ${ANIMALS[iljuInfo.animalKey].cry}` }]);
    }, 3200);
  }

  function react(state, line, affectionDelta = 1) {
    setMood(state);
    setBubble(line);
    if (user) {
      const next = { ...user, affection: Math.min(999, (user.affection || 0) + affectionDelta) };
      saveUser(next);
    }
    setTimeout(() => setMood(getAutoMood()), 2200);
  }

  async function onFortuneAsk() {
    if (!user) return;
    setLoadingFortune(true);
    try {
      const prompt = buildFortunePrompt(fortuneMain, fortuneSub, user.birthInfo, user.iljuInfo);
      const txt = await askAi("당신은 친절한 사주 상담가입니다.", prompt);
      setFortuneResult(txt);
      react("excited", "알아볼게! 잠깐만 기다려줘 ✨", 2);
    } catch {
      setFortuneResult("오늘은 네 감각을 믿어도 좋아. 작은 결정을 빠르게 하면 흐름이 열려!");
    } finally {
      setLoadingFortune(false);
    }
  }

  async function onSendChat() {
    if (!chatInput.trim() || !user || chatLoading) return;
    const text = chatInput.trim();
    setChatInput("");
    setChatMessages((p) => [...p, { role: "me", text }]);
    setChatLoading(true);
    try {
      const system = buildChatSystemPrompt(user.iljuInfo, user.petName);
      const answer = await askAi(system, text);
      setChatMessages((p) => [...p, { role: "pet", text: answer }]);
      if (/(슬프|걱정|힘들|불안)/.test(answer)) setMood("worried");
      else if (/(축하|좋아|행운|신나|최고)/.test(answer)) setMood("happy");
      else setMood("normal");
    } catch {
      setChatMessages((p) => [...p, { role: "pet", text: "네 마음 이해했어. 오늘은 한 가지만 해보자!" }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => setMood(getAutoMood()), 2000);
    }
  }

  async function onShareCard() {
    if (!shareRef.current) return;
    const canvas = await html2canvas(shareRef.current, { backgroundColor: "#f5f0e8" });
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "destiny-passport.png";
    a.click();
  }

  if (!mounted) return null;

  return (
    <div className="app-shell" style={{ ["--cream"]: "#F5F0E8", ["--ink"]: "#3D2B1F", ["--carrot"]: "#FF8C42", ["--star"]: "#FFD700", ["--pink"]: "#E8A0BF" }}>
      <style>{CSS}</style>
      <CloudBackground theme={currentTheme} />

      {phase === "setup" && (
        <section className="setup-stage">
          <h1>운세 다마고치</h1>
          <p>동물의 숲 느낌으로 너만의 운명 알을 만들자</p>
          <div className="step-wrap">
            {step === 0 && (
              <div className="step-card slide-in">
                <h3>캐릭터 이름</h3>
                <input value={petName} onChange={(e) => setPetName(e.target.value)} placeholder="예: 복실이" />
                <button className="ac-btn" onClick={() => setStep(1)}>Next</button>
              </div>
            )}
            {step === 1 && <StepInput title="태어난 연도" value={birth.year} setValue={(v) => setBirth((p) => ({ ...p, year: v }))} min={1900} max={2099} onNext={() => setStep(2)} />}
            {step === 2 && <StepInput title="태어난 월" value={birth.month} setValue={(v) => setBirth((p) => ({ ...p, month: v }))} min={1} max={12} onNext={() => setStep(3)} />}
            {step === 3 && <StepInput title="태어난 일" value={birth.day} setValue={(v) => setBirth((p) => ({ ...p, day: v }))} min={1} max={31} onNext={() => setStep(4)} />}
            {step === 4 && (
              <div className="step-card slide-in">
                <h3>태어난 시간대</h3>
                <div className="hour-grid">
                  {HOUR_BRANCHES.map((h) => (
                    <button key={h.value} className={`hour-btn ${birth.hour === h.value ? "on" : ""}`} onClick={() => setBirth((p) => ({ ...p, hour: h.value }))}>
                      <strong>{h.icon} {h.label}</strong>
                      <small>{h.range}시</small>
                    </button>
                  ))}
                </div>
                <button className="ac-btn" onClick={finishSetup} disabled={!birth.hour}>운명의 알 생성</button>
              </div>
            )}
          </div>
        </section>
      )}

      {phase === "hatching" && (
        <section className="hatch-stage">
          <div className="egg-rise">
            <img src={THEMES[currentTheme].egg} alt="egg" className="egg-img" />
          </div>
          <div className="speech">{typedBubble || "당신의 운명의 알이 나타났습니다!"}</div>
        </section>
      )}

      {phase === "main" && user && (
        <section className="main-stage">
          <header className="top-card">
            <div>
              <h2>{user.petName}</h2>
              <p>{user.iljuInfo.ilju} {user.iljuInfo.animal} · {user.iljuInfo.element}</p>
            </div>
            <span>호감도 {user.affection}</span>
          </header>

          <div className="character-zone" onClick={() => react("happy", `${user.petName}: 오늘도 반가워! ${ANIMALS[user.iljuInfo.animalKey].cry}`, 1)}>
            <CharacterSprite theme={user.theme} animalKey={user.iljuInfo.animalKey} state={resolveState()} />
            <div className="speech">{typedBubble}</div>
          </div>

          <nav className="toolbar">
            <button onClick={() => setActivePanel("fortune")}>🔮 오늘의 운세</button>
            <button onClick={() => setActivePanel("chat")}>💬 대화하기</button>
            <button onClick={() => react("happy", "냠냠! 고마워 🍎", 1)}>🍎 먹이주기</button>
            <button onClick={() => react("excited", "같이 놀자! 신난다 🎵", 2)}>🎵 놀아주기</button>
            <button onClick={() => setActivePanel("calendar")}>📅 운세 달력</button>
            <button onClick={() => setActivePanel("profile")}>⚙️ 내 정보</button>
          </nav>

          <div className="panel-card">
            {activePanel === "fortune" && (
              <div>
                <h3>운세 상점</h3>
                <div className="tabs-row">
                  {Object.keys(FORTUNE_CATEGORIES).map((k) => (
                    <button key={k} className={fortuneMain === k ? "on" : ""} onClick={() => { setFortuneMain(k); setFortuneSub(FORTUNE_CATEGORIES[k].sub[0]); }}>
                      {FORTUNE_CATEGORIES[k].icon} {k}
                    </button>
                  ))}
                </div>
                <div className="sub-grid">
                  {FORTUNE_CATEGORIES[fortuneMain].sub.map((s) => (
                    <button key={s} className={fortuneSub === s ? "on" : ""} onClick={() => setFortuneSub(s)}>{s}</button>
                  ))}
                </div>
                <button className="ac-btn" onClick={onFortuneAsk} disabled={loadingFortune}>{loadingFortune ? "분석 중..." : "운세 보기"}</button>
                {fortuneResult && <p className="fortune-result">{fortuneResult}</p>}
              </div>
            )}

            {activePanel === "chat" && (
              <div>
                <h3>대화하기</h3>
                <div className="chat-box">
                  {chatMessages.map((m, i) => (
                    <div key={i} className={`msg ${m.role}`}>
                      <span>{m.role === "pet" ? `${user.petName}` : "나"}</span>
                      <p>{m.text}</p>
                    </div>
                  ))}
                  {chatLoading && <div className="msg pet"><span>{user.petName}</span><p>...</p></div>}
                </div>
                <div className="chat-input-row">
                  <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="고민이나 일상을 말해줘" />
                  <button onClick={onSendChat}>보내기</button>
                </div>
              </div>
            )}

            {activePanel === "calendar" && (
              <div>
                <h3>월별 운세 달력</h3>
                <FortuneCalendar ilju={user.ilju} onPickDate={(d, icon) => setDayPreview(`${d}일 미리보기: ${icon} 오늘은 ${icon === "⚡" ? "무리하지 말고" : "기회를 잡기 좋은"} 날`)} />
                {dayPreview && <p className="fortune-result">{dayPreview}</p>}
                <button className="ac-btn" onClick={onShareCard}>내 일주 동물 공유하기</button>
              </div>
            )}

            {activePanel === "profile" && (
              <div>
                <h3>내 정보</h3>
                <ul className="profile-list">
                  <li>생년월일: {user.birthInfo.year}-{String(user.birthInfo.month).padStart(2, "0")}-{String(user.birthInfo.day).padStart(2, "0")}</li>
                  <li>시간: {user.birthInfo.hourLabel}</li>
                  <li>일주: {user.iljuInfo.ilju} ({user.iljuInfo.animal})</li>
                  <li>오행: {user.iljuInfo.element}</li>
                  <li>성격: {user.iljuInfo.personality}</li>
                  <li>호감도 단계: {user.affection > 140 ? "단짝" : user.affection > 60 ? "친구" : "낯선이"}</li>
                </ul>
                <button className="ac-btn danger" onClick={() => { localStorage.removeItem(STORAGE_KEY); location.reload(); }}>처음부터 다시</button>
              </div>
            )}
          </div>

          <div className="share-card" ref={shareRef}>
            <h4>Destiny Passport</h4>
            <div className="share-char">
              <CharacterSprite theme={user.theme} animalKey={user.iljuInfo.animalKey} state="happy" />
            </div>
            <p>{user.iljuInfo.ilju} {user.iljuInfo.animal} · {user.iljuInfo.element}</p>
            <p className="small">{fortuneResult || "오늘은 작은 결심 하나가 큰 흐름을 만든다."}</p>
            <strong>code-destiny.com</strong>
          </div>
        </section>
      )}
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Jua&family=Noto+Sans+KR:wght@400;500;700;900&display=swap');
:root { --cream:#F5F0E8; --ink:#3D2B1F; --carrot:#FF8C42; --star:#FFD700; --pink:#E8A0BF; }
* { box-sizing:border-box; }
html, body, #__next { margin:0; padding:0; width:100%; min-height:100%; font-family:'Noto Sans KR', sans-serif; color:var(--ink); }
.app-shell { position:relative; min-height:100dvh; overflow-x:hidden; }

.ac-bg { position:fixed; inset:0; z-index:-5; }
.sky-layer { position:absolute; inset:0; background:linear-gradient(180deg, var(--sky) 0%, #d5f1ff 55%, #f5f0e8 100%); }
.cloud { position:absolute; background:rgba(255,255,255,0.9); border-radius:999px; filter:drop-shadow(0 6px 12px rgba(0,0,0,.08)); }
.cloud:before, .cloud:after { content:''; position:absolute; background:rgba(255,255,255,0.9); border-radius:999px; }
.cloud.c1 { width:140px; height:44px; top:12%; left:-20%; animation:cloudMove 34s linear infinite; }
.cloud.c1:before { width:60px; height:60px; left:18px; top:-22px; }
.cloud.c1:after { width:72px; height:72px; right:20px; top:-28px; }
.cloud.c2 { width:180px; height:52px; top:22%; left:-25%; animation:cloudMove 46s linear infinite; animation-delay:-14s; }
.cloud.c2:before { width:72px; height:72px; left:20px; top:-30px; }
.cloud.c2:after { width:80px; height:80px; right:26px; top:-32px; }
.cloud.c3 { width:130px; height:40px; top:30%; left:-18%; animation:cloudMove 30s linear infinite; animation-delay:-7s; }
.cloud.c3:before { width:48px; height:48px; left:14px; top:-18px; }
.cloud.c3:after { width:58px; height:58px; right:18px; top:-24px; }
.grass-layer { position:absolute; left:0; right:0; bottom:0; height:26vh; background:var(--grass); border-top-left-radius:36px; border-top-right-radius:36px; box-shadow:inset 0 8px 20px rgba(255,255,255,.35); }
.grass-layer:before { content:''; position:absolute; inset:0; opacity:.25; background-image:url("data:image/svg+xml,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 22c4-6 6-6 10 0M8 22c4-8 6-8 10 0M14 22c3-5 4-5 8 0' stroke='%23fff' stroke-width='1.2' fill='none'/%3E%3C/svg%3E"); }

.setup-stage, .hatch-stage, .main-stage { max-width:960px; margin:0 auto; padding:22px 16px 90px; position:relative; }
.setup-stage h1, .main-stage h2 { font-family:'Jua', sans-serif; letter-spacing:.5px; margin:8px 0 6px; }
.setup-stage p { margin:0 0 12px; opacity:.85; }
.step-wrap { max-width:720px; }
.step-card { background:rgba(245,240,232,.95); border:3px solid var(--ink); border-radius:24px; box-shadow:0 12px 28px rgba(61,43,31,.16), inset 0 4px 12px rgba(255,255,255,.5); padding:18px; transform:rotate(-.5deg); }
.step-card h3 { margin:0 0 10px; font-family:'Jua', sans-serif; }
.step-card input { width:100%; padding:12px 14px; border-radius:16px; border:2px solid #b99b84; font-size:16px; }
.slide-in { animation:slideIn .4s ease; }

.hour-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin:10px 0 12px; }
.hour-btn { border:2px solid #b99b84; background:#fff8ee; border-radius:16px; padding:9px 8px; cursor:pointer; }
.hour-btn.on { border-color:var(--carrot); background:#fff0df; transform:translateY(-2px); }
.hour-btn small { display:block; opacity:.7; margin-top:3px; }

.ac-btn { margin-top:12px; border-radius:20px; border:3px solid var(--ink); background:#ffd8b8; color:#3d2b1f; font-weight:800; padding:11px 18px; cursor:pointer; box-shadow:0 6px 0 #d9a37e; transition:.15s ease; }
.ac-btn:hover { transform:translateY(-2px); }
.ac-btn:active { transform:translateY(1px); box-shadow:0 3px 0 #d9a37e; }
.ac-btn:disabled { opacity:.5; cursor:not-allowed; }
.ac-btn.danger { background:#ffd4d4; box-shadow:0 6px 0 #cc9a9a; }

.hatch-stage { min-height:78dvh; display:grid; place-items:center; }
.egg-rise { animation:eggRise 1.3s ease forwards, eggWiggle 1s ease-in-out 1.3s infinite; }
.egg-img { width:min(52vw,280px); filter:drop-shadow(0 16px 22px rgba(0,0,0,.22)); }
.speech { margin-top:10px; background:#fff; border:3px solid var(--ink); border-radius:22px; padding:10px 16px; max-width:680px; line-height:1.55; box-shadow:0 8px 20px rgba(61,43,31,.15); }

.top-card { display:flex; justify-content:space-between; align-items:center; background:rgba(245,240,232,.95); border:3px solid var(--ink); border-radius:20px; padding:12px 14px; box-shadow:0 8px 18px rgba(61,43,31,.12); margin-bottom:12px; }
.top-card p { margin:2px 0 0; opacity:.75; font-size:13px; }

.character-zone { position:relative; min-height:290px; background:linear-gradient(180deg, rgba(255,255,255,.45), rgba(255,255,255,.25)); border:3px solid #9f7d63; border-radius:28px; padding:16px; display:grid; place-items:center; margin-bottom:12px; cursor:pointer; }
.sprite { width:min(54vw,220px); aspect-ratio:1/1; background-repeat:no-repeat; image-rendering:auto; filter:drop-shadow(0 12px 24px rgba(0,0,0,.2)); animation:charBob 2.8s ease-in-out infinite; }

.toolbar { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:12px; }
.toolbar button { border-radius:18px; border:3px solid var(--ink); background:#fff5e7; padding:10px 8px; font-size:14px; font-weight:700; cursor:pointer; box-shadow:0 5px 0 #d5b79d; transition:.15s ease; }
.toolbar button:hover { transform:translateY(-2px); }

.panel-card { background:rgba(255,255,255,.92); border:3px solid var(--ink); border-radius:22px; padding:14px; box-shadow:0 10px 24px rgba(61,43,31,.12); }
.panel-card h3 { margin:0 0 10px; font-family:'Jua', sans-serif; }
.tabs-row { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px; }
.tabs-row button, .sub-grid button { border:2px solid #b79273; background:#fff8ef; border-radius:14px; padding:7px 10px; cursor:pointer; }
.tabs-row button.on, .sub-grid button.on { border-color:var(--carrot); background:#fff0df; }
.sub-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:6px; margin-bottom:8px; }
.fortune-result { margin-top:10px; background:#fff9ef; border:2px solid #d7b692; border-radius:14px; padding:10px; line-height:1.6; }

.chat-box { max-height:240px; overflow:auto; display:flex; flex-direction:column; gap:8px; padding-right:4px; }
.msg { max-width:82%; border-radius:14px; padding:8px 10px; }
.msg span { display:block; font-size:11px; opacity:.7; margin-bottom:3px; }
.msg p { margin:0; line-height:1.5; }
.msg.pet { background:#fff6eb; border:2px solid #d7b692; }
.msg.me { align-self:flex-end; background:#eaf6ff; border:2px solid #9ec7eb; }
.chat-input-row { margin-top:8px; display:flex; gap:6px; }
.chat-input-row input { flex:1; border:2px solid #b79273; border-radius:14px; padding:10px; }
.chat-input-row button { border:2px solid var(--ink); border-radius:14px; background:#ffe1c5; font-weight:700; padding:0 12px; }

.calendar-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:6px; }
.cell { min-height:58px; border:2px solid #c8a88c; border-radius:12px; background:#fffaf2; display:grid; place-items:center; cursor:pointer; }
.cell.empty { opacity:0; pointer-events:none; }
.cell.best { border-color:var(--star); box-shadow:0 0 0 2px rgba(255,215,0,.35) inset; }
.cell span { font-weight:700; }
.cell small { opacity:.7; }
.hint { margin:8px 0 0; font-size:13px; opacity:.78; }

.profile-list { margin:0; padding-left:18px; line-height:1.8; }

.share-card { position:fixed; left:-9999px; top:0; width:320px; background:#fdf5ea; border:3px solid #3d2b1f; border-radius:22px; padding:12px; }
.share-card h4 { margin:0 0 8px; font-family:'Jua', sans-serif; }
.share-char { display:grid; place-items:center; background:#fff; border-radius:16px; border:2px solid #cab097; margin-bottom:8px; }
.share-card .small { font-size:13px; line-height:1.5; }

@keyframes cloudMove { from { transform:translateX(0); } to { transform:translateX(130vw); } }
@keyframes slideIn { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
@keyframes eggRise { 0% { transform:translateY(100px) scale(.7); opacity:0; } 70% { transform:translateY(-10px) scale(1.08); opacity:1; } 100% { transform:translateY(0) scale(1); opacity:1; } }
@keyframes eggWiggle { 0%,100% { transform:rotate(0deg); } 25% { transform:rotate(-6deg); } 75% { transform:rotate(6deg); } }
@keyframes charBob { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-8px); } }

@media (max-width: 720px) {
  .toolbar { grid-template-columns:repeat(2,1fr); }
  .sub-grid { grid-template-columns:1fr; }
  .hour-grid { grid-template-columns:repeat(2,1fr); }
}
`;
