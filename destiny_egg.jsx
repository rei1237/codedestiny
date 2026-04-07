import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";

const STORAGE_KEY = "destiny_tamagochi_v3";
const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY || "";

const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const BRANCH_ANIMAL_KEYS = ["rat", "ox", "tiger", "rabbit", "dragon", "snake", "horse", "goat", "monkey", "rooster", "dog", "pig"];

const ANIMALS = {
  rat: { ko: "쥐", emoji: "🐭", personality: "영리하고 호기심 많은", cry: "찍찍!" },
  ox: { ko: "소", emoji: "🐮", personality: "성실하고 든든한", cry: "음메!" },
  tiger: { ko: "호랑이", emoji: "🐯", personality: "용맹하고 결단력 있는", cry: "어흥!" },
  rabbit: { ko: "토끼", emoji: "🐰", personality: "다정하고 감성적인", cry: "깡총!" },
  dragon: { ko: "용", emoji: "🐲", personality: "카리스마 넘치고 스케일 큰", cry: "크르릉!" },
  snake: { ko: "뱀", emoji: "🐍", personality: "직관적이고 집중력 높은", cry: "쉬익!" },
  horse: { ko: "말", emoji: "🐴", personality: "열정적이고 자유로운", cry: "히힝!" },
  goat: { ko: "양", emoji: "🐑", personality: "온화하고 창의적인", cry: "메에!" },
  monkey: { ko: "원숭이", emoji: "🐵", personality: "재치 있고 순발력 좋은", cry: "끼익!" },
  rooster: { ko: "닭", emoji: "🐓", personality: "부지런하고 꼼꼼한", cry: "꼬끼오!" },
  dog: { ko: "개", emoji: "🐶", personality: "충직하고 따뜻한", cry: "멍멍!" },
  pig: { ko: "돼지", emoji: "🐷", personality: "복을 부르고 낙천적인", cry: "꿀꿀!" },
};

const THEMES = {
  blossom: {
    name: "벚꽃",
    folder: "벚꽃 컨셉",
    sky: "#87CEEB",
    grass: "#7BC67E",
    accent: "#E8A0BF",
    egg: "/fuctionassets/tadagochi/벚꽃 컨셉/벚꽃의 알.webp",
  },
  macaron: {
    name: "마카롱",
    folder: "마카롱 컨셉",
    sky: "#91D4FF",
    grass: "#81C97B",
    accent: "#FFD700",
    egg: "/fuctionassets/tadagochi/마카롱 컨셉/마카롱 알.webp",
  },
  strawberry: {
    name: "딸기",
    folder: "딸기 컨셉",
    sky: "#A3D8FF",
    grass: "#7BC67E",
    accent: "#FF8C42",
    egg: "/fuctionassets/tadagochi/딸기 컨셉/딸기 알.webp",
  },
  space: {
    name: "우주",
    folder: "우주 테마",
    sky: "#7FB9FF",
    grass: "#75C280",
    accent: "#FFD700",
    egg: "/fuctionassets/tadagochi/우주 테마/우주 컨셉 알.webp",
  },
  blackstar: {
    name: "검은별",
    folder: "검은 별 컨셉",
    sky: "#9BBEF2",
    grass: "#72BA77",
    accent: "#FF8C42",
    egg: "/fuctionassets/tadagochi/검은 별 컨셉/검은별 알-Photoroom.png",
  },
};

const SPRITE_LAYOUT = {
  blossom: {
    cols: 6,
    rows: 4,
    blend: false,
    states: {
      idle: [0, 1],
      happy: [6, 12],
      sad: [7],
      surprised: [8],
      sleep: [14, 15],
      eating: [13],
      dance: [16, 20],
      worried: [11],
      excited: [18],
    },
  },
  macaron: {
    cols: 5,
    rows: 4,
    blend: false,
    states: {
      idle: [0, 1],
      happy: [5, 10],
      sad: [6],
      surprised: [7],
      sleep: [15, 16],
      eating: [11],
      dance: [19],
      worried: [9],
      excited: [18],
    },
  },
  strawberry: {
    cols: 7,
    rows: 3,
    blend: true,
    states: {
      idle: [0, 1],
      happy: [7, 14],
      sad: [8],
      surprised: [9],
      sleep: [16, 17],
      eating: [15],
      dance: [18, 25],
      worried: [12],
      excited: [21],
    },
  },
  space: {
    cols: 6,
    rows: 3,
    blend: true,
    states: {
      idle: [0, 1],
      happy: [6],
      sad: [7],
      surprised: [8],
      sleep: [13],
      eating: [15],
      dance: [12, 17],
      worried: [11],
      excited: [16],
    },
  },
  blackstar: {
    cols: 6,
    rows: 4,
    blend: false,
    states: {
      idle: [0, 1],
      happy: [6, 12],
      sad: [7],
      surprised: [8],
      sleep: [14, 15],
      eating: [13],
      dance: [16, 20],
      worried: [11],
      excited: [18],
    },
  },
};

const SHEET_FILES = {
  blossom: {
    rat: ["벚꽃 컨셉 쥐.webp"],
    ox: ["벚꽃 컨셉 소.webp"],
    tiger: ["벚꽃 컨셉 호랑이.webp"],
    rabbit: ["벚꽃 컨셉 토끼.webp"],
    dragon: ["벚꽃 컨셉 용.webp"],
    snake: ["벚꽃 컨셉 뱀.webp"],
    horse: ["벚꽃 컨셉 말.webp"],
    goat: ["벚꽃 컨셉 양.webp"],
    monkey: ["벚꽃 컨셉 원숭이.webp"],
    rooster: ["벚꽃 컨셉 닭.webp"],
    dog: ["벚꽃 컨셉 강아지.webp"],
    pig: ["벚꽃 컨셉 돼지.webp"],
  },
  macaron: {
    rat: ["마카롱 컨셉 쥐.webp"],
    ox: ["마카롱 컨셉 소.webp"],
    tiger: ["마카롱 컨셉 호랑이.webp"],
    rabbit: ["마카롱 컨셉 토끼.webp"],
    dragon: ["마카롱 컨셉 용.webp"],
    snake: ["마카롱 컨셉 뱀.webp"],
    horse: ["마카롱 컨셉 말.webp"],
    goat: ["마카롱 컨셉 양.webp"],
    monkey: ["마카롱 컨셉 원숭이.webp"],
    rooster: ["마카롱 컨셉 닭.webp"],
    dog: ["마카롱 컨셉 강아지.webp"],
    pig: ["마카롱 컨셉 돼지.webp"],
  },
  strawberry: {
    rat: ["딸기테마쥐.webp"],
    ox: ["딸기테마소.webp"],
    tiger: ["딸기테마 호랑이.webp"],
    rabbit: ["딸기테마토끼.webp"],
    dragon: ["딸기테마용.webp"],
    snake: ["딸기테마뱀.webp"],
    horse: ["딸기테마말.webp"],
    goat: ["딸기테마양.webp"],
    monkey: ["딸기테마원숭이.webp"],
    rooster: ["딸기테마닭.webp"],
    dog: ["딸기테마개.webp"],
    pig: ["딸기테마돼지.webp"],
  },
  space: {
    rat: ["우주 테마 쥐.webp"],
    ox: ["우주 테마 소.webp"],
    tiger: ["우주 테마 호랑이.webp"],
    rabbit: ["우주 테마 토끼.webp"],
    dragon: ["우주 테마 용.webp"],
    snake: ["우주 테마 뱀.webp"],
    horse: ["우주 테마 말.webp"],
    goat: ["우주 테마 양.webp"],
    monkey: ["우주 테마 원숭이.webp"],
    rooster: ["우주 테마 닭.webp"],
    dog: ["우주 테마 개.webp"],
    pig: ["우주 테마 돼지.webp"],
  },
  blackstar: {
    rat: ["별 컨셉 쥐1.webp", "별 컨셉 쥐2.webp", "별 컨셉 쥐3.webp", "별 컨셉 쥐4.webp"],
    ox: ["별 컨셉 소.webp", "별 컨셉 소2.webp"],
    tiger: ["별 컨셉 호랑이.webp"],
    rabbit: ["별 컨셉 토끼.webp"],
    dragon: ["별 컨셉 용.webp", "별 컨셉 용2.webp"],
    snake: ["별 컨셉 뱀.webp", "별 컨셉 뱀2.webp"],
    horse: ["별 컨셉 말.webp", "별 컨셉 말2.webp"],
    goat: ["별 컨셉 양.webp"],
    monkey: ["별 컨셉 원숭이.webp"],
    rooster: ["별 컨셉 닭.webp"],
    dog: ["별 컨셉 강아지.webp"],
    pig: ["별 컨셉 돼지.webp", "별 컨셉 돼지2.webp"],
  },
};

const ANIMAL_EGG_MAP = {
  rat: [THEMES.blossom.egg, THEMES.macaron.egg, THEMES.blackstar.egg],
  ox: [THEMES.macaron.egg, THEMES.strawberry.egg, THEMES.space.egg],
  tiger: [THEMES.strawberry.egg, THEMES.blackstar.egg, THEMES.blossom.egg],
  rabbit: [THEMES.blossom.egg, THEMES.strawberry.egg, THEMES.macaron.egg],
  dragon: [THEMES.space.egg, THEMES.blackstar.egg, THEMES.macaron.egg],
  snake: [THEMES.blackstar.egg, THEMES.space.egg, THEMES.strawberry.egg],
  horse: [THEMES.strawberry.egg, THEMES.macaron.egg, THEMES.blossom.egg],
  goat: [THEMES.macaron.egg, THEMES.blossom.egg, THEMES.space.egg],
  monkey: [THEMES.blackstar.egg, THEMES.macaron.egg, THEMES.space.egg],
  rooster: [THEMES.macaron.egg, THEMES.blackstar.egg, THEMES.blossom.egg],
  dog: [THEMES.blossom.egg, THEMES.strawberry.egg, THEMES.blackstar.egg],
  pig: [THEMES.strawberry.egg, THEMES.macaron.egg, THEMES.space.egg],
};

const HOUR_BRANCHES = [
  { value: "자", label: "자시", icon: "🌙", range: "23-01", hour: 23 },
  { value: "축", label: "축시", icon: "🐂", range: "01-03", hour: 1 },
  { value: "인", label: "인시", icon: "🐯", range: "03-05", hour: 3 },
  { value: "묘", label: "묘시", icon: "🐇", range: "05-07", hour: 5 },
  { value: "진", label: "진시", icon: "🐉", range: "07-09", hour: 7 },
  { value: "사", label: "사시", icon: "🐍", range: "09-11", hour: 9 },
  { value: "오", label: "오시", icon: "☀️", range: "11-13", hour: 11 },
  { value: "미", label: "미시", icon: "🐐", range: "13-15", hour: 13 },
  { value: "신", label: "신시", icon: "🐒", range: "15-17", hour: 15 },
  { value: "유", label: "유시", icon: "🐓", range: "17-19", hour: 17 },
  { value: "술", label: "술시", icon: "🐕", range: "19-21", hour: 19 },
  { value: "해", label: "해시", icon: "🐗", range: "21-23", hour: 21 },
];

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
  return {
    stemIdx: cycleIdx % 10,
    branchIdx: cycleIdx % 12,
    ilju: `${STEMS[cycleIdx % 10]}${BRANCHES[cycleIdx % 12]}`,
    animalKey: BRANCH_ANIMAL_KEYS[cycleIdx % 12],
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
    map[ilju] = {
      ilju,
      animalKey,
      animal: ANIMALS[animalKey].ko,
      element: `${STEM_ELEMENT[stemIdx]}${BRANCH_ELEMENT[branchIdx]}`,
      personality: ANIMALS[animalKey].personality,
      imagePath: "/fuctionassets/tadagochi",
    };
  }
  return map;
})();

function pickTheme(stemIdx, branchIdx) {
  const keys = Object.keys(THEMES);
  return keys[(stemIdx * 7 + branchIdx * 3) % keys.length];
}

function getSheetPath(themeKey, animalKey, variantIndex = 0) {
  const files = SHEET_FILES[themeKey]?.[animalKey] || [];
  const safe = Math.min(Math.max(variantIndex, 0), files.length - 1);
  const file = files[safe] || files[0];
  return `/fuctionassets/tadagochi/${THEMES[themeKey].folder}/${file}`;
}

function getVariantIndex(themeKey, animalKey, state) {
  const variants = SHEET_FILES[themeKey]?.[animalKey] || [];
  if (variants.length <= 1) return 0;
  if (themeKey !== "blackstar") return 0;
  if (animalKey === "rat") {
    if (state === "eating") return 1;
    if (state === "dance" || state === "excited") return 2;
    if (state === "worried") return 3;
    return 0;
  }
  if (["ox", "dragon", "snake", "horse", "pig"].includes(animalKey) && (state === "dance" || state === "excited" || state === "eating")) {
    return 1;
  }
  return 0;
}

function getEggByAnimal(animalKey, randomSeed = 0) {
  const list = ANIMAL_EGG_MAP[animalKey] || [THEMES.blossom.egg];
  return list[randomSeed % list.length];
}

function buildFortunePrompt(mode, category, subCategory, profile, serviceContext) {
  return `당신은 code-destiny의 통합 운세 마스터입니다.
사용자 일주: ${profile.iljuInfo.ilju} (${profile.iljuInfo.animal}), 오행 ${profile.iljuInfo.element}
성격 키워드: ${profile.iljuInfo.personality}
질문: ${category} > ${subCategory}
분석 모드: ${mode}
연동 데이터: ${serviceContext}

요구사항:
1) 최소 450자 이상, 최대 900자 이내로 충분히 길게 작성
2) 오늘/1주/1달 실행전략을 각각 제시
3) 리스크 경고 1개 + 기회 포인트 2개 포함
4) 마지막 줄에 행운 아이템 1개 + 피해야 할 행동 1개를 함께 제시`;
}

function buildChatSystemPrompt(iljuInfo, petName) {
  return `당신은 사용자의 수호 동물 ${iljuInfo.animal}입니다. 이름은 ${petName}.
성격: ${iljuInfo.personality}
말투: 친근한 반말, 감탄사 ${ANIMALS[iljuInfo.animalKey].cry}
규칙:
- 응답은 2~4문장
- 어려운 사주 질문도 쉬운 말로
- 희망적으로 마무리`;
}

async function askAi(systemPrompt, userPrompt) {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system: systemPrompt, messages: [{ role: "user", content: userPrompt }], max_tokens: 1200 }),
  });
  const json = await res.json();
  return json.text || json.content || json?.choices?.[0]?.message?.content || "오늘은 천천히 갈수록 더 멀리 간다.";
}

function useTypingText(text, speed = 23) {
  const [out, setOut] = useState("");
  useEffect(() => {
    if (!text) {
      setOut("");
      return;
    }
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(t);
    }, speed);
    return () => clearInterval(t);
  }, [text, speed]);
  return out;
}

function ensureKakaoSdk() {
  return new Promise((resolve) => {
    if (!KAKAO_JS_KEY || typeof window === "undefined") {
      resolve(false);
      return;
    }
    const win = window;
    if (win.Kakao && typeof win.Kakao.isInitialized === "function") {
      if (!win.Kakao.isInitialized()) win.Kakao.init(KAKAO_JS_KEY);
      resolve(true);
      return;
    }
    const exists = document.getElementById("kakao-js-sdk");
    if (exists) {
      exists.addEventListener("load", () => {
        if (win.Kakao && typeof win.Kakao.init === "function" && !win.Kakao.isInitialized()) win.Kakao.init(KAKAO_JS_KEY);
        resolve(!!win.Kakao);
      });
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "kakao-js-sdk";
    script.src = "https://developers.kakao.com/sdk/js/kakao.min.js";
    script.onload = () => {
      if (win.Kakao && typeof win.Kakao.init === "function" && !win.Kakao.isInitialized()) win.Kakao.init(KAKAO_JS_KEY);
      resolve(!!win.Kakao);
    };
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

function CloudBackground({ themeKey }) {
  const theme = THEMES[themeKey] || THEMES.blossom;
  return (
    <div className="ac-bg" style={{ ["--sky"]: theme.sky, ["--grass"]: theme.grass }}>
      <div className="sky-layer" />
      <div className="cloud c1" />
      <div className="cloud c2" />
      <div className="cloud c3" />
      <div className="grass-layer" />
    </div>
  );
}

function CharacterSprite({ themeKey, animalKey, state }) {
  const layout = SPRITE_LAYOUT[themeKey] || SPRITE_LAYOUT.blossom;
  const frameList = layout.states[state] || layout.states.idle;
  const [frameIdx, setFrameIdx] = useState(0);
  const variantIdx = getVariantIndex(themeKey, animalKey, state);
  const imagePath = getSheetPath(themeKey, animalKey, variantIdx);

  useEffect(() => {
    const timer = setInterval(() => setFrameIdx((p) => (p + 1) % frameList.length), 520);
    return () => clearInterval(timer);
  }, [frameList.length]);

  const idx = frameList[frameIdx];
  const col = idx % layout.cols;
  const row = Math.floor(idx / layout.cols);
  const x = layout.cols <= 1 ? 0 : (col / (layout.cols - 1)) * 100;
  const y = layout.rows <= 1 ? 0 : (row / (layout.rows - 1)) * 100;

  return (
    <div
      className="sprite"
      style={{
        backgroundImage: `url(${imagePath})`,
        backgroundSize: `${layout.cols * 100}% ${layout.rows * 100}%`,
        backgroundPosition: `${x}% ${y}%`,
        mixBlendMode: layout.blend ? "multiply" : "normal",
      }}
    />
  );
}

function FortuneCalendar({ ilju, onSelect }) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i += 1) cells.push(null);
  for (let d = 1; d <= days; d += 1) cells.push(d);

  const score = (d) => (d * 17 + ilju.stemIdx * 7 + ilju.branchIdx * 11) % 100;
  const icon = (s) => {
    if (s > 82) return "🌟";
    if (s > 65) return "💰";
    if (s > 46) return "💕";
    if (s < 22) return "⚡";
    return "✨";
  };

  const top3 = [...Array(days).keys()].map((i) => i + 1).sort((a, b) => score(b) - score(a)).slice(0, 3);

  return (
    <div>
      <div className="calendar-grid">
        {cells.map((d, i) => {
          if (!d) return <div key={`e-${i}`} className="cell empty" />;
          const sc = score(d);
          return (
            <button key={d} className={`cell ${top3.includes(d) ? "best" : ""}`} onClick={() => onSelect(d, icon(sc), sc)}>
              <span>{d}</span>
              <small>{icon(sc)}</small>
            </button>
          );
        })}
      </div>
      <p className="hint">이번 달 추천일: {top3.join(", ")}일</p>
    </div>
  );
}

function ReactionGame({ onEnd }) {
  const [running, setRunning] = useState(false);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [starOn, setStarOn] = useState(false);

  useEffect(() => {
    if (!running) return;
    if (round >= 7) {
      onEnd(score);
      setRunning(false);
      return;
    }
    setStarOn(false);
    const delay = 600 + Math.floor(Math.random() * 1200);
    const show = setTimeout(() => setStarOn(true), delay);
    const hide = setTimeout(() => {
      if (starOn) setStarOn(false);
      setRound((p) => p + 1);
    }, delay + 900);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [running, round, score, starOn, onEnd]);

  return (
    <div className="mini-wrap">
      <h4>놀아주기 미니게임: 별 반응 테스트</h4>
      <p>별이 뜨면 바로 터치! 라운드 {round}/7 · 점수 {score}</p>
      <div className="reaction-zone">
        {starOn ? (
          <button className="star-btn" onClick={() => { setScore((p) => p + 10); setStarOn(false); setRound((p) => p + 1); }}>⭐</button>
        ) : (
          <span>대기중...</span>
        )}
      </div>
      {!running && <button className="ac-btn" onClick={() => { setRound(0); setScore(0); setRunning(true); }}>시작</button>}
    </div>
  );
}

function FeedGame({ onEnd }) {
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(15);
  const [foods, setFoods] = useState([]);

  useEffect(() => {
    if (!running) return;
    if (time <= 0) {
      onEnd(score);
      setRunning(false);
      return;
    }
    const t = setTimeout(() => setTime((p) => p - 1), 1000);
    const spawn = setInterval(() => {
      setFoods((prev) => {
        const next = [...prev, { id: `${Date.now()}-${Math.random()}`, x: Math.random() * 82 + 4, y: Math.random() * 68 + 8, icon: ["🍎", "🥕", "🍓", "🍪"][Math.floor(Math.random() * 4)] }];
        return next.slice(-14);
      });
    }, 600);
    return () => {
      clearTimeout(t);
      clearInterval(spawn);
    };
  }, [running, time, score, onEnd]);

  return (
    <div className="mini-wrap">
      <h4>먹이주기 미니게임: 간식 모으기</h4>
      <p>제한 시간 {time}초 · 점수 {score}</p>
      <div className="feed-zone">
        {foods.map((f) => (
          <button
            key={f.id}
            className="food-item"
            style={{ left: `${f.x}%`, top: `${f.y}%` }}
            onClick={() => {
              setScore((p) => p + 5);
              setFoods((p) => p.filter((x) => x.id !== f.id));
            }}
          >
            {f.icon}
          </button>
        ))}
      </div>
      {!running && <button className="ac-btn" onClick={() => { setScore(0); setTime(15); setFoods([]); setRunning(true); }}>시작</button>}
    </div>
  );
}

export default function App() {
  const [phase, setPhase] = useState("setup");
  const [step, setStep] = useState(0);
  const [birth, setBirth] = useState({ year: "", month: "", day: "", hourBranch: "" });
  const [petName, setPetName] = useState("");
  const [profile, setProfile] = useState(null);
  const [mood, setMood] = useState("normal");
  const [panel, setPanel] = useState("fortune");
  const [bubble, setBubble] = useState("");
  const typedBubble = useTypingText(bubble, 20);

  const [fortuneMain, setFortuneMain] = useState(Object.keys(FORTUNE_CATEGORIES)[0]);
  const [fortuneSub, setFortuneSub] = useState(FORTUNE_CATEGORIES[Object.keys(FORTUNE_CATEGORIES)[0]].sub[0]);
  const [fortuneMode, setFortuneMode] = useState("saju");
  const [fortuneResult, setFortuneResult] = useState("");
  const [fortuneLoading, setFortuneLoading] = useState(false);
  const [fortuneCtx, setFortuneCtx] = useState("");

  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  const [calendarPreview, setCalendarPreview] = useState("");
  const shareRef = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setProfile(parsed);
      setPhase("main");
      setBubble(`${parsed.petName}: 오늘도 반가워! ${ANIMALS[parsed.iljuInfo.animalKey].cry}`);
      setChatMessages([{ role: "pet", text: `${parsed.petName} 왔어! 오늘도 같이 운세 보자.` }]);
    } catch {}
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const h = new Date().getHours();
      if (h < 6) setMood("sleepy");
      else if (h < 12) setMood("happy");
      else if (h < 19) setMood("normal");
      else setMood("worried");
    }, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const spriteState = useMemo(() => {
    if (mood === "sleepy") return "sleep";
    if (mood === "happy") return "happy";
    if (mood === "excited") return "dance";
    if (mood === "worried") return "sad";
    return "idle";
  }, [mood]);

  const themeKey = profile?.theme || "blossom";
  const currentTheme = THEMES[themeKey] || THEMES.blossom;

  function saveProfile(next) {
    setProfile(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }

  function finishSetup() {
    const y = Number(birth.year);
    const m = Number(birth.month);
    const d = Number(birth.day);
    if (!y || !m || !d || !birth.hourBranch) return;

    const ilju = calcIlju(y, m, d);
    const iljuInfo = ILJU_ANIMAL_MAP[ilju.ilju];
    const theme = pickTheme(ilju.stemIdx, ilju.branchIdx);

    const hourInfo = HOUR_BRANCHES.find((h) => h.value === birth.hourBranch) || HOUR_BRANCHES[0];
    const seed = (y + m + d + ilju.stemIdx + ilju.branchIdx) % 3;

    const next = {
      birthInfo: { year: y, month: m, day: d, hourBranch: birth.hourBranch, hourLabel: `${hourInfo.label} (${hourInfo.range}시)`, hour: hourInfo.hour },
      ilju,
      iljuInfo,
      theme,
      petName: petName.trim() || `${iljuInfo.animal}이`,
      eggImage: getEggByAnimal(iljuInfo.animalKey, seed),
      affection: 0,
      feedBest: 0,
      playBest: 0,
    };

    saveProfile(next);
    setBubble("당신의 운명의 알이 나타났습니다!");
    setPhase("hatching");

    setTimeout(() => {
      setPhase("main");
      setBubble(`안녕! 나는 ${iljuInfo.ilju} ${iljuInfo.animal}야! ${iljuInfo.personality} 성격이지~`);
      setChatMessages([{ role: "pet", text: `${next.petName} 부화 완료! ${ANIMALS[iljuInfo.animalKey].cry}` }]);
    }, 3200);
  }

  function bumpMood(nextMood, text, affectionPlus = 1) {
    setMood(nextMood);
    setBubble(text);
    if (profile) {
      saveProfile({ ...profile, affection: (profile.affection || 0) + affectionPlus });
    }
    setTimeout(() => setMood("normal"), 2200);
  }

  async function loadServiceContext(mode) {
    if (!profile) return "없음";
    try {
      if (mode === "vedic") {
        const res = await fetch("/api/vedic/planets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            year: profile.birthInfo.year,
            month: profile.birthInfo.month,
            day: profile.birthInfo.day,
            hour: profile.birthInfo.hour,
            minute: 0,
            timezone: 9,
          }),
        });
        const d = await res.json();
        if (!d?.ok) return "베다 행성 데이터 없음";
        return `Sun:${d.planets?.Sun?.toFixed?.(2)} Moon:${d.planets?.Moon?.toFixed?.(2)} Jupiter:${d.planets?.Jupiter?.toFixed?.(2)} Saturn:${d.planets?.Saturn?.toFixed?.(2)}`;
      }

      if (mode === "solar") {
        const res = await fetch(`/api/astro/solar-terms?year=${profile.birthInfo.year}&all24=true`);
        const d = await res.json();
        if (!d?.ok) return "절기 데이터 없음";
        const nearest = (d.terms || []).slice(0, 6).map((x) => `${x.name}:${x.kstMonth}/${x.kstDay}`).join(", ");
        return `절기스냅샷 ${nearest}`;
      }

      if (mode === "tarot") {
        const drawRes = await fetch("/api/tarot/draw", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spreadType: "one_card" }),
        });
        const draw = await drawRes.json();
        if (!draw?.ok || !draw.cards?.length) return "타로 카드 없음";

        const readingRes = await fetch("/api/tarot/reading", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category: "general", spreadType: draw.spreadType || "one_card", cards: draw.cards }),
        });
        const reading = await readingRes.json();
        if (!reading?.ok) return "타로 리딩 실패";

        const story = reading.reading?.story || "";
        const advice = reading.reading?.advice || "";
        return `카드:${reading.cards?.[0]?.nameKr || reading.cards?.[0]?.name || "-"} | ${story} ${advice}`;
      }

      return "사주/자미두수/숙요 프롬프트 확장 모드";
    } catch {
      return "연동 데이터 로드 실패";
    }
  }

  async function handleFortune() {
    if (!profile || fortuneLoading) return;
    setFortuneLoading(true);
    setFortuneResult("");

    try {
      const context = await loadServiceContext(fortuneMode);
      setFortuneCtx(context);

      if (fortuneMode === "tarot" && context.startsWith("카드:")) {
        setFortuneResult(context);
        bumpMood("excited", `${profile.petName}: 타로까지 같이 봤어! 🔮`, 2);
        return;
      }

      const prompt = buildFortunePrompt(fortuneMode, fortuneMain, fortuneSub, profile, context);
      const system = `너는 code-destiny 멀티 운세 어시스턴트다. 응답은 너무 짧지 않게, 실전 행동 조언 중심으로 작성.`;
      const text = await askAi(system, prompt);
      setFortuneResult(text);
      bumpMood("excited", `${profile.petName}: 연동 운세 분석 완료!`, 2);
    } catch {
      setFortuneResult("오늘은 1) 아침 정리 2) 오후 집중 3) 저녁 회복 루틴이 핵심이야. 작은 결정은 빠르게, 큰 결정은 밤에 미루는 게 좋아. 행운 아이템은 노란 노트, 피해야 할 행동은 즉흥 소비야.");
    } finally {
      setFortuneLoading(false);
    }
  }

  async function sendChat() {
    if (!chatInput.trim() || !profile || chatLoading) return;
    const text = chatInput.trim();
    setChatInput("");
    setChatMessages((p) => [...p, { role: "me", text }]);
    setChatLoading(true);

    try {
      const system = buildChatSystemPrompt(profile.iljuInfo, profile.petName);
      const answer = await askAi(system, text);
      setChatMessages((p) => [...p, { role: "pet", text: answer }]);
      if (/(슬프|걱정|힘들|불안)/.test(answer)) setMood("worried");
      else if (/(축하|좋아|행운|신나|최고)/.test(answer)) setMood("happy");
      else setMood("normal");
    } catch {
      setChatMessages((p) => [...p, { role: "pet", text: "잠깐 네트워크가 흔들렸어. 그래도 넌 잘하고 있어!" }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => setMood("normal"), 2000);
    }
  }

  async function downloadShareCard() {
    if (!shareRef.current) return;
    const canvas = await html2canvas(shareRef.current, { backgroundColor: "#f5f0e8" });
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "destiny-passport.png";
    a.click();
    return dataUrl;
  }

  async function shareKakao() {
    if (!profile) return;
    const ok = await ensureKakaoSdk();
    const url = `${location.origin}/destiny-egg`;
    const desc = `${profile.iljuInfo.ilju} ${profile.iljuInfo.animal} 수호동물과 오늘의 운세를 확인했어!`;

    if (ok && window.Kakao?.Share?.sendDefault && window.Kakao?.isInitialized?.()) {
      try {
        window.Kakao.Share.sendDefault({
          objectType: "feed",
          content: {
            title: `${profile.petName}의 운세 다마고치`,
            description: desc,
            imageUrl: profile.eggImage || THEMES.blossom.egg,
            link: { mobileWebUrl: url, webUrl: url },
          },
          buttons: [{ title: "나도 해보기", link: { mobileWebUrl: url, webUrl: url } }],
        });
        return;
      } catch {}
    }

    const sharer = `https://sharer.kakao.com/talk/friends/picker/link?url=${encodeURIComponent(url)}&text=${encodeURIComponent(desc)}`;
    window.open(sharer, "_blank", "noopener,noreferrer");
  }

  if (phase === "setup") {
    return (
      <div className="app-shell">
        <style>{CSS}</style>
        <CloudBackground themeKey="blossom" />
        <section className="setup-stage">
          <h1>운세 다마고치</h1>
          <p>연도 → 월 → 일 → 시간(12지지) 순으로 입력해줘</p>

          {step === 0 && (
            <div className="step-card slide-in">
              <h3>수호동물 이름</h3>
              <input value={petName} onChange={(e) => setPetName(e.target.value)} placeholder="예: 서연이" />
              <button className="ac-btn" onClick={() => setStep(1)}>Next</button>
            </div>
          )}

          {step === 1 && (
            <div className="step-card slide-in">
              <h3>태어난 연도</h3>
              <input type="number" value={birth.year} onChange={(e) => setBirth((p) => ({ ...p, year: e.target.value }))} />
              <button className="ac-btn" onClick={() => setStep(2)}>Next</button>
            </div>
          )}

          {step === 2 && (
            <div className="step-card slide-in">
              <h3>태어난 월</h3>
              <input type="number" value={birth.month} onChange={(e) => setBirth((p) => ({ ...p, month: e.target.value }))} />
              <button className="ac-btn" onClick={() => setStep(3)}>Next</button>
            </div>
          )}

          {step === 3 && (
            <div className="step-card slide-in">
              <h3>태어난 일</h3>
              <input type="number" value={birth.day} onChange={(e) => setBirth((p) => ({ ...p, day: e.target.value }))} />
              <button className="ac-btn" onClick={() => setStep(4)}>Next</button>
            </div>
          )}

          {step === 4 && (
            <div className="step-card slide-in">
              <h3>태어난 시간대 (12지지)</h3>
              <div className="hour-grid">
                {HOUR_BRANCHES.map((h) => (
                  <button key={h.value} className={`hour-btn ${birth.hourBranch === h.value ? "on" : ""}`} onClick={() => setBirth((p) => ({ ...p, hourBranch: h.value }))}>
                    <strong>{h.icon} {h.label}</strong>
                    <small>{h.range}시</small>
                  </button>
                ))}
              </div>
              <button className="ac-btn" disabled={!birth.hourBranch} onClick={finishSetup}>운명의 알 생성</button>
            </div>
          )}
        </section>
      </div>
    );
  }

  if (phase === "hatching" && profile) {
    return (
      <div className="app-shell">
        <style>{CSS}</style>
        <CloudBackground themeKey={profile.theme} />
        <section className="hatch-stage">
          <div className="egg-rise"><img src={profile.eggImage} alt="egg" className="egg-img" /></div>
          <div className="speech">{typedBubble || "당신의 운명의 알이 나타났습니다!"}</div>
        </section>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="app-shell">
      <style>{CSS}</style>
      <CloudBackground themeKey={themeKey} />

      <section className="main-stage">
        <header className="top-card">
          <div>
            <h2>{profile.petName}</h2>
            <p>{profile.iljuInfo.ilju} {profile.iljuInfo.animal} · {profile.iljuInfo.element}</p>
          </div>
          <span>호감도 {profile.affection}</span>
        </header>

        <div className="character-zone" onClick={() => bumpMood("happy", `${profile.petName}: 오늘도 반가워! ${ANIMALS[profile.iljuInfo.animalKey].cry}`, 1)}>
          <CharacterSprite themeKey={themeKey} animalKey={profile.iljuInfo.animalKey} state={spriteState} />
          <div className="speech">{typedBubble}</div>
        </div>

        <nav className="toolbar">
          <button onClick={() => setPanel("fortune")}>🔮 오늘의 운세</button>
          <button onClick={() => setPanel("chat")}>💬 대화하기</button>
          <button onClick={() => setPanel("feed")}>🍎 먹이주기</button>
          <button onClick={() => setPanel("play")}>🎵 놀아주기</button>
          <button onClick={() => setPanel("calendar")}>📅 운세 달력</button>
          <button onClick={() => setPanel("profile")}>⚙️ 내 정보</button>
        </nav>

        <div className="panel-card">
          {panel === "fortune" && (
            <div>
              <h3>통합 운세 센터</h3>

              <div className="mode-row">
                {["saju", "ziwei", "vedic", "sukyo", "solar", "tarot"].map((m) => (
                  <button key={m} className={fortuneMode === m ? "on" : ""} onClick={() => setFortuneMode(m)}>{m}</button>
                ))}
              </div>

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

              <button className="ac-btn" onClick={handleFortune} disabled={fortuneLoading}>{fortuneLoading ? "연동 분석 중..." : "운세 보기"}</button>

              {fortuneCtx ? <p className="service-ctx">연동 데이터: {fortuneCtx}</p> : null}
              {fortuneResult ? <p className="fortune-result">{fortuneResult}</p> : null}
            </div>
          )}

          {panel === "chat" && (
            <div>
              <h3>수호동물 대화</h3>
              <div className="chat-box">
                {chatMessages.map((m, i) => (
                  <div key={i} className={`msg ${m.role}`}>
                    <span>{m.role === "pet" ? profile.petName : "나"}</span>
                    <p>{m.text}</p>
                  </div>
                ))}
                {chatLoading && <div className="msg pet"><span>{profile.petName}</span><p>...</p></div>}
              </div>
              <div className="chat-input-row">
                <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="오늘 고민이나 질문을 입력" />
                <button onClick={sendChat}>보내기</button>
              </div>
            </div>
          )}

          {panel === "feed" && (
            <FeedGame
              onEnd={(score) => {
                const reward = Math.floor(score / 10);
                const next = { ...profile, affection: profile.affection + reward, feedBest: Math.max(profile.feedBest || 0, score) };
                saveProfile(next);
                bumpMood("happy", `${profile.petName}: 냠냠! 점수 ${score}점, 호감도 +${reward}`, reward);
              }}
            />
          )}

          {panel === "play" && (
            <ReactionGame
              onEnd={(score) => {
                const reward = Math.floor(score / 8);
                const next = { ...profile, affection: profile.affection + reward, playBest: Math.max(profile.playBest || 0, score) };
                saveProfile(next);
                bumpMood("excited", `${profile.petName}: 놀이 완료! ${score}점, 호감도 +${reward}`, reward);
              }}
            />
          )}

          {panel === "calendar" && (
            <div>
              <h3>월별 운세 달력</h3>
              <FortuneCalendar
                ilju={profile.ilju}
                onSelect={(d, icon, score) => {
                  const tone = score < 24 ? "무리한 결정은 미루고" : "새로운 시도를 하기에";
                  setCalendarPreview(`${d}일 ${icon} · ${tone} 좋은 흐름이야.`);
                }}
              />
              {calendarPreview ? <p className="fortune-result">{calendarPreview}</p> : null}

              <div className="share-row">
                <button className="ac-btn" onClick={downloadShareCard}>이미지 저장</button>
                <button className="ac-btn kakao" onClick={shareKakao}>카카오 공유</button>
              </div>
            </div>
          )}

          {panel === "profile" && (
            <div>
              <h3>내 정보</h3>
              <ul className="profile-list">
                <li>생년월일: {profile.birthInfo.year}-{String(profile.birthInfo.month).padStart(2, "0")}-{String(profile.birthInfo.day).padStart(2, "0")}</li>
                <li>시간: {profile.birthInfo.hourLabel}</li>
                <li>일주: {profile.iljuInfo.ilju} ({profile.iljuInfo.animal})</li>
                <li>오행: {profile.iljuInfo.element}</li>
                <li>성격: {profile.iljuInfo.personality}</li>
                <li>먹이주기 최고점: {profile.feedBest || 0}</li>
                <li>놀아주기 최고점: {profile.playBest || 0}</li>
                <li>호감도 단계: {profile.affection > 180 ? "단짝" : profile.affection > 70 ? "친구" : "낯선이"}</li>
              </ul>
              <button className="ac-btn danger" onClick={() => { localStorage.removeItem(STORAGE_KEY); location.reload(); }}>처음부터 다시</button>
            </div>
          )}
        </div>

        <div className="share-card" ref={shareRef}>
          <h4>Animal Crossing Destiny Passport</h4>
          <img src={profile.eggImage} alt="egg" className="share-egg" />
          <div className="share-char"><CharacterSprite themeKey={themeKey} animalKey={profile.iljuInfo.animalKey} state="happy" /></div>
          <p>{profile.iljuInfo.ilju} {profile.iljuInfo.animal} · {profile.iljuInfo.element}</p>
          <p className="small">{fortuneResult || "오늘은 작은 행동 하나가 큰 흐름을 만든다."}</p>
          <strong>code-destiny.com</strong>
        </div>
      </section>
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
.sky-layer { position:absolute; inset:0; background:linear-gradient(180deg, var(--sky) 0%, #d7f2ff 58%, #f5f0e8 100%); }
.cloud { position:absolute; background:rgba(255,255,255,0.92); border-radius:999px; filter:drop-shadow(0 8px 12px rgba(0,0,0,.07)); }
.cloud:before, .cloud:after { content:''; position:absolute; background:rgba(255,255,255,0.92); border-radius:999px; }
.cloud.c1 { width:146px; height:42px; top:10%; left:-20%; animation:cloudMove 38s linear infinite; }
.cloud.c1:before { width:68px; height:58px; left:18px; top:-22px; }
.cloud.c1:after { width:72px; height:72px; right:16px; top:-30px; }
.cloud.c2 { width:182px; height:50px; top:20%; left:-24%; animation:cloudMove 50s linear infinite; animation-delay:-12s; }
.cloud.c2:before { width:68px; height:68px; left:20px; top:-27px; }
.cloud.c2:after { width:84px; height:84px; right:26px; top:-34px; }
.cloud.c3 { width:130px; height:36px; top:31%; left:-16%; animation:cloudMove 33s linear infinite; animation-delay:-8s; }
.cloud.c3:before { width:48px; height:48px; left:12px; top:-16px; }
.cloud.c3:after { width:58px; height:58px; right:14px; top:-24px; }
.grass-layer { position:absolute; left:0; right:0; bottom:0; height:24vh; background:var(--grass); border-top-left-radius:42px; border-top-right-radius:42px; box-shadow:inset 0 8px 24px rgba(255,255,255,.3); }
.grass-layer:before { content:''; position:absolute; inset:0; opacity:.24; background-image:url("data:image/svg+xml,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 22c4-6 6-6 10 0M8 22c4-8 6-8 10 0M14 22c3-5 4-5 8 0' stroke='%23fff' stroke-width='1.2' fill='none'/%3E%3C/svg%3E"); }

.setup-stage, .hatch-stage, .main-stage { max-width:980px; margin:0 auto; padding:20px 16px 88px; }
.setup-stage h1, .main-stage h2 { margin:8px 0 4px; font-family:'Jua', sans-serif; }
.setup-stage p { margin:0 0 12px; opacity:.85; }

.step-card { width:min(760px, 100%); background:rgba(245,240,232,.94); border:3px solid var(--ink); border-radius:24px; box-shadow:0 12px 28px rgba(61,43,31,.16), inset 0 4px 12px rgba(255,255,255,.55); padding:16px; transform:rotate(-.4deg); }
.step-card h3 { margin:0 0 10px; font-family:'Jua', sans-serif; }
.step-card input { width:100%; border:2px solid #b79477; border-radius:16px; padding:12px 14px; font-size:16px; }
.slide-in { animation:slideIn .35s ease; }

.hour-grid { display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; margin:8px 0 10px; }
.hour-btn { border:2px solid #b79477; border-radius:14px; padding:8px; background:#fff7ea; cursor:pointer; }
.hour-btn.on { border-color:var(--carrot); background:#ffefde; transform:translateY(-2px); }
.hour-btn small { display:block; opacity:.7; margin-top:3px; }

.ac-btn { border-radius:20px; border:3px solid var(--ink); background:#ffe0bf; color:#3d2b1f; font-weight:800; padding:10px 18px; cursor:pointer; box-shadow:0 6px 0 #d3a57e; transition:.15s ease; }
.ac-btn:hover { transform:translateY(-2px); }
.ac-btn:active { transform:translateY(1px); box-shadow:0 3px 0 #d3a57e; }
.ac-btn:disabled { opacity:.5; cursor:not-allowed; }
.ac-btn.danger { background:#ffd2d2; box-shadow:0 6px 0 #d09a9a; }
.ac-btn.kakao { background:#FEE500; box-shadow:0 6px 0 #d3bc00; }

.hatch-stage { min-height:76dvh; display:grid; place-items:center; }
.egg-rise { animation:eggRise 1.2s ease forwards, eggWiggle 1s ease-in-out 1.2s infinite; }
.egg-img { width:min(52vw, 280px); filter:drop-shadow(0 14px 20px rgba(0,0,0,.22)); }

.top-card { display:flex; justify-content:space-between; align-items:center; background:rgba(245,240,232,.95); border:3px solid var(--ink); border-radius:20px; padding:11px 14px; box-shadow:0 8px 18px rgba(61,43,31,.12); margin-bottom:10px; }
.top-card p { margin:2px 0 0; opacity:.75; font-size:13px; }

.character-zone { position:relative; min-height:300px; border:3px solid #a68469; border-radius:28px; padding:16px; background:linear-gradient(180deg, rgba(255,255,255,.52), rgba(255,255,255,.24)); display:grid; place-items:center; margin-bottom:10px; cursor:pointer; }
.sprite { width:min(58vw, 240px); aspect-ratio:1/1; background-repeat:no-repeat; image-rendering:auto; filter:drop-shadow(0 12px 24px rgba(0,0,0,.2)); animation:charBob 2.8s ease-in-out infinite; }
.speech { margin-top:10px; background:#fff; border:3px solid var(--ink); border-radius:22px; padding:10px 16px; max-width:690px; line-height:1.55; box-shadow:0 8px 20px rgba(61,43,31,.15); }

.toolbar { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:10px; }
.toolbar button { border:3px solid var(--ink); border-radius:18px; background:#fff5e7; padding:10px 7px; font-weight:700; cursor:pointer; box-shadow:0 5px 0 #d5b79d; }
.toolbar button:hover { transform:translateY(-2px); }

.panel-card { background:rgba(255,255,255,.94); border:3px solid var(--ink); border-radius:22px; padding:14px; box-shadow:0 10px 24px rgba(61,43,31,.12); }
.panel-card h3 { margin:0 0 10px; font-family:'Jua', sans-serif; }
.mode-row { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px; }
.mode-row button { border:2px solid #b79374; background:#fff8ef; border-radius:14px; padding:6px 9px; cursor:pointer; text-transform:uppercase; font-size:12px; }
.mode-row button.on { border-color:var(--carrot); background:#ffefde; }
.tabs-row { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px; }
.tabs-row button, .sub-grid button { border:2px solid #b79374; background:#fff8ef; border-radius:14px; padding:7px 10px; cursor:pointer; }
.tabs-row button.on, .sub-grid button.on { border-color:var(--carrot); background:#ffefde; }
.sub-grid { display:grid; grid-template-columns:repeat(2, 1fr); gap:6px; margin-bottom:10px; }
.service-ctx { margin-top:10px; font-size:12px; background:#eef8ff; border:2px solid #aacde9; border-radius:12px; padding:8px 10px; }
.fortune-result { margin-top:10px; background:#fff9ef; border:2px solid #d7b692; border-radius:14px; padding:10px; line-height:1.62; white-space:pre-wrap; }

.chat-box { max-height:250px; overflow:auto; display:flex; flex-direction:column; gap:8px; padding-right:4px; }
.msg { max-width:84%; border-radius:14px; padding:8px 10px; }
.msg span { display:block; font-size:11px; opacity:.7; margin-bottom:3px; }
.msg p { margin:0; line-height:1.5; }
.msg.pet { background:#fff6eb; border:2px solid #d7b692; }
.msg.me { align-self:flex-end; background:#eaf6ff; border:2px solid #9ec7eb; }
.chat-input-row { margin-top:8px; display:flex; gap:6px; }
.chat-input-row input { flex:1; border:2px solid #b79374; border-radius:14px; padding:10px; }
.chat-input-row button { border:2px solid var(--ink); border-radius:14px; background:#ffe1c5; font-weight:700; padding:0 12px; }

.calendar-grid { display:grid; grid-template-columns:repeat(7, 1fr); gap:6px; }
.cell { min-height:58px; border:2px solid #c8a88c; border-radius:12px; background:#fffaf2; display:grid; place-items:center; cursor:pointer; }
.cell.empty { opacity:0; pointer-events:none; }
.cell.best { border-color:var(--star); box-shadow:0 0 0 2px rgba(255,215,0,.35) inset; }
.cell span { font-weight:700; }
.cell small { opacity:.7; }
.hint { margin:8px 0 0; font-size:13px; opacity:.78; }
.share-row { display:flex; gap:8px; margin-top:10px; }

.profile-list { margin:0; padding-left:18px; line-height:1.8; }

.mini-wrap { background:#fffaf2; border:2px solid #c9ab8f; border-radius:16px; padding:12px; }
.mini-wrap h4 { margin:0 0 6px; font-family:'Jua', sans-serif; }
.mini-wrap p { margin:0 0 8px; }
.feed-zone { height:240px; border:2px dashed #cfb59a; border-radius:12px; position:relative; background:linear-gradient(180deg, #f8fbff, #fff8ec); overflow:hidden; }
.food-item { position:absolute; border:none; background:transparent; font-size:28px; cursor:pointer; }
.reaction-zone { height:220px; border:2px dashed #cfb59a; border-radius:12px; display:grid; place-items:center; background:linear-gradient(180deg, #f8fbff, #fff8ec); }
.star-btn { border:none; background:transparent; font-size:64px; cursor:pointer; animation:starPulse .6s infinite alternate; }

.share-card { position:fixed; left:-9999px; top:0; width:330px; background:#fdf5ea; border:3px solid #3d2b1f; border-radius:22px; padding:12px; }
.share-card h4 { margin:0 0 8px; font-family:'Jua', sans-serif; }
.share-egg { width:66px; height:66px; object-fit:contain; display:block; margin:0 auto 8px; }
.share-char { display:grid; place-items:center; background:#fff; border-radius:16px; border:2px solid #cab097; margin-bottom:8px; }
.share-card .small { font-size:13px; line-height:1.5; }

@keyframes cloudMove { from { transform:translateX(0); } to { transform:translateX(130vw); } }
@keyframes slideIn { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
@keyframes eggRise { 0% { transform:translateY(100px) scale(.7); opacity:0; } 70% { transform:translateY(-10px) scale(1.08); opacity:1; } 100% { transform:translateY(0) scale(1); opacity:1; } }
@keyframes eggWiggle { 0%,100% { transform:rotate(0deg); } 25% { transform:rotate(-6deg); } 75% { transform:rotate(6deg); } }
@keyframes charBob { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-8px); } }
@keyframes starPulse { from { transform:scale(1); } to { transform:scale(1.12); } }

@media (max-width: 760px) {
  .toolbar { grid-template-columns:repeat(2,1fr); }
  .sub-grid { grid-template-columns:1fr; }
  .hour-grid { grid-template-columns:repeat(2,1fr); }
  .share-row { flex-direction:column; }
}
`;
