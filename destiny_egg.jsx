import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";

const STORAGE_KEY = "destiny_tamagochi_v5";
const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY || "";
const HATCH_THRESHOLD = 10;

const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const BRANCH_ANIMAL_KEYS = ["rat", "ox", "tiger", "rabbit", "dragon", "snake", "horse", "goat", "monkey", "rooster", "dog", "pig"];

const ANIMALS = {
  rat:     { ko: "쥐",    emoji: "🐭", personality: "영리하고 호기심 많은",      cry: "찍찍!" },
  ox:      { ko: "소",    emoji: "🐮", personality: "성실하고 든든한",           cry: "음메!" },
  tiger:   { ko: "호랑이", emoji: "🐯", personality: "용맹하고 결단력 있는",     cry: "어흥!" },
  rabbit:  { ko: "토끼",  emoji: "🐰", personality: "다정하고 감성적인",         cry: "깡총!" },
  dragon:  { ko: "용",    emoji: "🐲", personality: "카리스마 넘치고 스케일 큰", cry: "크르릉!" },
  snake:   { ko: "뱀",    emoji: "🐍", personality: "직관적이고 집중력 높은",    cry: "쉬익!" },
  horse:   { ko: "말",    emoji: "🐴", personality: "열정적이고 자유로운",       cry: "히힝!" },
  goat:    { ko: "양",    emoji: "🐑", personality: "온화하고 창의적인",         cry: "메에!" },
  monkey:  { ko: "원숭이", emoji: "🐵", personality: "재치 있고 순발력 좋은",    cry: "끼익!" },
  rooster: { ko: "닭",    emoji: "🐓", personality: "부지런하고 꼼꼼한",        cry: "꼬끼오!" },
  dog:     { ko: "개",    emoji: "🐶", personality: "충직하고 따뜻한",          cry: "멍멍!" },
  pig:     { ko: "돼지",  emoji: "🐷", personality: "복을 부르고 낙천적인",      cry: "꿀꿀!" },
};

// ── 테마 정의 ──────────────────────────────────────────
const THEMES = {
  blossom: {
    name: "벚꽃",    folder: "벚꽃 컨셉",
    sky: "#87CEEB",  grass: "#7BC67E", accent: "#E8A0BF",
    egg: "/fuctionassets/tadagochi/벚꽃 컨셉/벚꽃의 알.png",
  },
  macaron: {
    name: "마카롱",  folder: "마카롱 컨셉",
    sky: "#91D4FF",  grass: "#81C97B", accent: "#FFD700",
    egg: "/fuctionassets/tadagochi/마카롱 컨셉/마카롱 알.png",
  },
  strawberry: {
    name: "딸기",    folder: "딸기 컨셉",
    sky: "#A3D8FF",  grass: "#7BC67E", accent: "#FF8C42",
    egg: "/fuctionassets/tadagochi/딸기 컨셉/딸기 알-Photoroom.webp",
  },
  space: {
    name: "우주",    folder: "우주 테마",
    sky: "#0d1b3e",  grass: "#0a2a1a", accent: "#a078ff",
    egg: "/fuctionassets/tadagochi/우주 테마/우주 컨셉 알.png",
  },
  blackstar: {
    name: "검은별",  folder: "검은 별 컨셉",
    sky: "#1c1c2e",  grass: "#1a2a1e", accent: "#FF8C42",
    egg: "/fuctionassets/tadagochi/검은 별 컨셉/검은별 알-Photoroom.png",
  },
  moon: {
    name: "달",      folder: "달 컨셉",
    sky: "#1a1a4e",  grass: "#1e3a5a", accent: "#C0C0FF",
    egg: "/fuctionassets/tadagochi/달 컨셉/달 컨셉 알.png",
  },
  angel: {
    name: "천사",    folder: "천사 컨셉",
    sky: "#dff0ff",  grass: "#c8f0d8", accent: "#ffe4f0",
    egg: "/fuctionassets/tadagochi/천사 컨셉/천사 알-Photoroom.webp",
  },
};

const THEME_ALIASES = {
  "벚꽃": "blossom", "마카롱": "macaron", "딸기": "strawberry",
  "우주": "space",   "검은별": "blackstar", "달": "moon", "천사": "angel",
};

// ── 캐릭터 이미지 파일 매핑 ────────────────────────────────
// Photoroom = 배경제거판, 비-Photoroom .png = 투명배경 PNG. 배열 여러장 = 모션 순환.
const SHEET_FILES = {
  // 벚꽃: 투명배경 PNG
  blossom: {
    rat:     ["벚꽃 컨셉 쥐.png"],
    ox:      ["벚꽃 컨셉 소.png"],
    tiger:   ["벚꽃 컨셉 호랑이.png"],
    rabbit:  ["벚꽃 컨셉 토끼.png"],
    dragon:  ["벚꽃 컨셉 용.png"],
    snake:   ["벚꽃 컨셉 뱀.png"],
    horse:   ["벚꽃 컨셉 말.png"],
    goat:    ["벚꽃 컨셉 양.png"],
    monkey:  ["벚꽃 컨셉 원숭이.png"],
    rooster: ["벚꽃 컨셉 닭.png"],
    dog:     ["벚꽃 컨셉 강아지.png"],
    pig:     ["벚꽃 컨셉 돼지.png"],
  },
  // 마카롱: 투명배경 PNG
  macaron: {
    rat:     ["마카롱 컨셉 쥐.png"],
    ox:      ["마카롱 컨셉 소.png"],
    tiger:   ["마카롱 컨셉 호랑이.png"],
    rabbit:  ["마카롱 컨셉 토끼.png"],
    dragon:  ["마카롱 컨셉 용.png"],
    snake:   ["마카롱 컨셉 뱀.png"],
    horse:   ["마카롱 컨셉 말.png"],
    goat:    ["마카롱 컨셉 양.png"],
    monkey:  ["마카롱 컨셉 원숭이.png"],
    rooster: ["마카롱 컨셉 닭.png"],
    dog:     ["마카롱 컨셉 강아지.png"],
    pig:     ["마카롱 컨셉 돼지.png"],
  },
  // 딸기: Photoroom 배경제거, 호랑이 2포즈
  strawberry: {
    rat:     ["딸기테마쥐-Photoroom.webp"],
    ox:      ["딸기테마소-Photoroom.webp"],
    tiger:   ["딸기테마 호랑이-Photoroom.webp", "딸기테마 호랑이2-Photoroom.webp"],
    rabbit:  ["딸기테마토끼-Photoroom.webp"],
    dragon:  ["딸기테마용-Photoroom.webp"],
    snake:   ["딸기테마뱀-Photoroom.webp"],
    horse:   ["딸기테마말-Photoroom.webp"],
    goat:    ["딸기테마양-Photoroom.webp"],
    monkey:  ["딸기테마원숭이-Photoroom.webp"],
    rooster: ["딸기테마닭-Photoroom.webp"],
    dog:     ["딸기테마개-Photoroom.webp"],
    pig:     ["딸기테마돼지-Photoroom.webp"],
  },
  // 우주: 투명배경 PNG
  space: {
    rat:     ["우주 테마 쥐.png"],
    ox:      ["우주 테마 소.png"],
    tiger:   ["우주 테마 호랑이.png"],
    rabbit:  ["우주 테마 토끼.png"],
    dragon:  ["우주 테마 용.png"],
    snake:   ["우주 테마 뱀.png"],
    horse:   ["우주 테마 말.png"],
    goat:    ["우주 테마 양.png"],
    monkey:  ["우주 테마 원숭이.png"],
    rooster: ["우주 테마 닭.png"],
    dog:     ["우주 테마 개.png"],
    pig:     ["우주 테마 돼지.png"],
  },
  // 검은별: Photoroom 배경제거, 쥐 4포즈·소·뱀·돼지 2포즈
  blackstar: {
    rat:     ["별 컨셉 쥐1-Photoroom.webp", "별 컨셉 쥐2-Photoroom.webp", "별 컨셉 쥐3-Photoroom.webp", "별 컨셉 쥐4-Photoroom.webp"],
    ox:      ["별 컨셉 소-Photoroom.webp",   "별 컨셉 소2-Photoroom.webp"],
    tiger:   ["별 컨셉 호랑이-Photoroom.webp"],
    rabbit:  ["별 컨셉 토끼-Photoroom.webp"],
    dragon:  ["별 컨셉 용-Photoroom.webp"],
    snake:   ["별 컨셉 뱀-Photoroom.webp",   "별 컨셉 뱀-Photoroom (1).webp"],
    horse:   ["별 컨셉 말2-Photoroom.webp"],
    goat:    ["별 컨셉 양-Photoroom.webp"],
    monkey:  ["별 컨셉 원숭이-Photoroom.webp"],
    rooster: ["별 컨셉 닭-Photoroom.webp"],
    dog:     ["별 컨셉 강아지-Photoroom.webp"],
    pig:     ["별 컨셉 돼지-Photoroom.webp",  "별 컨셉 돼지2-Photoroom.webp"],
  },
  // 달: Photoroom + 번호 파일
  moon: {
    rat:     ["달 컨셉 쥐-Photoroom.webp"],
    ox:      ["달 컨셉 소-Photoroom.webp"],
    tiger:   ["달 컨셉 호랑이-Photoroom.webp"],
    rabbit:  ["image-Photoroom (3).webp"],
    dragon:  ["달 컨셉 용-Photoroom.webp"],
    snake:   ["달 컨셉 뱀-Photoroom.webp"],
    horse:   ["image-Photoroom (4).webp"],
    goat:    ["image-Photoroom (5).webp"],
    monkey:  ["image-Photoroom (6).webp"],
    rooster: ["image-Photoroom (7).webp"],
    dog:     ["image-Photoroom (8).webp"],
    pig:     ["달 컨셉 소-Photoroom.webp"],
  },
  // 천사: 투명배경 PNG, 뱀 4포즈!
  angel: {
    rat:     ["천사 컨셉 쥐.png"],
    ox:      ["천사 컨셉 소.png"],
    tiger:   ["천사 컨셉 호랑이.png"],
    rabbit:  ["천사 컨셉 토끼.png"],
    dragon:  ["천사 컨셉 용.png"],
    snake:   ["천사 컨셉 뱀.png", "천사 컨셉 뱀2.png", "천사 컨셉 뱀3.png", "천사 컨셉 뱀4.png"],
    horse:   ["천사 컨셉 말.png"],
    goat:    ["천사 컨셉 양.png"],
    monkey:  ["천사 컨셉 원숭이.png"],
    rooster: ["천사 컨셉 닭.png"],
    dog:     ["천사 컨셉 강아지.png"],
    pig:     ["천사 컨셉 돼지.png"],
  },
};

const ANIMAL_EGG_MAP = {
  rat:     [THEMES.blossom.egg,     THEMES.macaron.egg,     THEMES.blackstar.egg,  THEMES.angel.egg],
  ox:      [THEMES.macaron.egg,     THEMES.strawberry.egg,  THEMES.space.egg,      THEMES.angel.egg],
  tiger:   [THEMES.strawberry.egg,  THEMES.blackstar.egg,   THEMES.blossom.egg,    THEMES.angel.egg],
  rabbit:  [THEMES.blossom.egg,     THEMES.strawberry.egg,  THEMES.macaron.egg,    THEMES.angel.egg],
  dragon:  [THEMES.space.egg,       THEMES.blackstar.egg,   THEMES.macaron.egg,    THEMES.angel.egg],
  snake:   [THEMES.blackstar.egg,   THEMES.moon.egg,        THEMES.strawberry.egg, THEMES.angel.egg],
  horse:   [THEMES.strawberry.egg,  THEMES.macaron.egg,     THEMES.blossom.egg,    THEMES.space.egg],
  goat:    [THEMES.macaron.egg,     THEMES.blossom.egg,     THEMES.space.egg,      THEMES.angel.egg],
  monkey:  [THEMES.blackstar.egg,   THEMES.macaron.egg,     THEMES.space.egg,      THEMES.moon.egg],
  rooster: [THEMES.macaron.egg,     THEMES.blackstar.egg,   THEMES.blossom.egg,    THEMES.angel.egg],
  dog:     [THEMES.blossom.egg,     THEMES.strawberry.egg,  THEMES.blackstar.egg,  THEMES.angel.egg],
  pig:     [THEMES.strawberry.egg,  THEMES.macaron.egg,     THEMES.space.egg,      THEMES.moon.egg],
};

const HOUR_BRANCHES = [
  { value: "자", label: "자시", icon: "🌙", range: "23-01", hour: 23 },
  { value: "축", label: "축시", icon: "🐂", range: "01-03", hour: 1  },
  { value: "인", label: "인시", icon: "🐯", range: "03-05", hour: 3  },
  { value: "묘", label: "묘시", icon: "🐇", range: "05-07", hour: 5  },
  { value: "진", label: "진시", icon: "🐉", range: "07-09", hour: 7  },
  { value: "사", label: "사시", icon: "🐍", range: "09-11", hour: 9  },
  { value: "오", label: "오시", icon: "☀️", range: "11-13", hour: 11 },
  { value: "미", label: "미시", icon: "🐐", range: "13-15", hour: 13 },
  { value: "신", label: "신시", icon: "🐒", range: "15-17", hour: 15 },
  { value: "유", label: "유시", icon: "🐓", range: "17-19", hour: 17 },
  { value: "술", label: "술시", icon: "🐕", range: "19-21", hour: 19 },
  { value: "해", label: "해시", icon: "🐗", range: "21-23", hour: 21 },
];

// ── 계산 유틸 ────────────────────────────────────────────
function calcIlju(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  const jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  const cycleIdx = ((jdn + 16) % 60 + 60) % 60;
  return {
    stemIdx: cycleIdx % 10, branchIdx: cycleIdx % 12,
    ilju: `${["갑","을","병","정","무","기","경","신","임","계"][cycleIdx % 10]}${["자","축","인","묘","진","사","오","미","신","유","술","해"][cycleIdx % 12]}`,
    animalKey: BRANCH_ANIMAL_KEYS[cycleIdx % 12],
  };
}

const STEM_EL   = ["木","木","火","火","土","土","金","金","水","水"];
const BRANCH_EL = ["水","土","木","木","土","火","火","土","金","金","土","水"];

const ILJU_MAP = (() => {
  const map = {};
  for (let i = 0; i < 60; i++) {
    const si = i % 10, bi = i % 12;
    const ilju = `${STEMS[si]}${BRANCHES[bi]}`;
    map[ilju] = { ilju, animalKey: BRANCH_ANIMAL_KEYS[bi], animal: ANIMALS[BRANCH_ANIMAL_KEYS[bi]].ko,
      element: `${STEM_EL[si]}${BRANCH_EL[bi]}`, personality: ANIMALS[BRANCH_ANIMAL_KEYS[bi]].personality };
  }
  return map;
})();

function pickTheme(si, bi) {
  const keys = Object.keys(THEMES);
  return keys[(si * 7 + bi * 3) % keys.length];
}

function normalizeThemeKey(input, ilju) {
  const raw = String(input || "").trim();
  if (THEMES[raw]) return raw;
  if (THEME_ALIASES[raw]) return THEME_ALIASES[raw];
  if (ilju?.stemIdx != null) return pickTheme(ilju.stemIdx, ilju.branchIdx);
  return "blossom";
}

function getEggByAnimal(animalKey, seed = 0) {
  const list = ANIMAL_EGG_MAP[animalKey] || [THEMES.blossom.egg];
  return list[seed % list.length];
}

function getCharImagePath(themeKey, animalKey, frameIndex = 0) {
  const safeTheme = normalizeThemeKey(themeKey, null);
  const files = SHEET_FILES[safeTheme]?.[animalKey] || [];
  if (!files.length) return "";
  const file = files[frameIndex % files.length];
  const folder = THEMES[safeTheme]?.folder || "벚꽃 컨셉";
  return encodeURI(`/fuctionassets/tadagochi/${folder}/${file}`);
}

function migrateProfileShape(parsed) {
  if (!parsed || typeof parsed !== "object") return null;
  const ilju    = parsed.ilju || calcIlju(+(parsed?.birthInfo?.year||1990), +(parsed?.birthInfo?.month||1), +(parsed?.birthInfo?.day||1));
  const iljuInfo = parsed.iljuInfo || ILJU_MAP[ilju.ilju] || ILJU_MAP["갑자"];
  const theme    = normalizeThemeKey(parsed.theme, ilju);
  const seed     = (+(parsed?.birthInfo?.year||0) + +(parsed?.birthInfo?.month||0) + +(parsed?.birthInfo?.day||0) + ilju.stemIdx + ilju.branchIdx) % 4;
  const affection = +(parsed.affection || 0);
  return {
    ...parsed, ilju, iljuInfo, theme,
    petName: parsed.petName || `${iljuInfo.animal}이`,
    eggImage: parsed.eggImage || getEggByAnimal(iljuInfo.animalKey, seed),
    affection,
    feedBest: +(parsed.feedBest || 0),
    playBest: +(parsed.playBest || 0),
    hatched: parsed.hatched === true || affection >= HATCH_THRESHOLD,
    ownedEggs: Array.isArray(parsed.ownedEggs) && parsed.ownedEggs.length
      ? parsed.ownedEggs
      : [parsed.eggImage || getEggByAnimal(iljuInfo.animalKey, seed)],
    activeEggImage: parsed.activeEggImage || parsed.eggImage || getEggByAnimal(iljuInfo.animalKey, seed),
    llmDaily: parsed.llmDaily && typeof parsed.llmDaily === "object"
      ? parsed.llmDaily
      : { date: new Date().toISOString().slice(0,10), used: 0, limit: 3 },
  };
}

function getTodayKey() { return new Date().toISOString().slice(0,10); }

function normalizeDailyQuota(raw) {
  const today = getTodayKey();
  if (!raw || raw.date !== today) return { date: today, used: 0, limit: 3 };
  return { date: today, used: +(raw.used||0), limit: 3 };
}

function getApiBase() {
  if (typeof window !== "undefined" && window.CODE_DESTINY_API_BASE_URL)
    return String(window.CODE_DESTINY_API_BASE_URL).replace(/\/+$/,"");
  try { const v = localStorage.getItem("fortune_api_base_url"); if (v) return String(v).replace(/\/+$/,""); } catch {}
  if (typeof location !== "undefined" && (location.hostname === "localhost" || location.hostname === "127.0.0.1"))
    return "http://localhost:4000";
  return typeof location !== "undefined" ? location.origin : "";
}
function getAuthToken() { try { return localStorage.getItem("fortune_auth_token")||""; } catch { return ""; } }

async function askAi(system, user) {
  const res  = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, messages: [{ role: "user", content: user }], max_tokens: 1200 }) });
  const json = await res.json();
  return json.text || json.content || json?.choices?.[0]?.message?.content || "오늘은 천천히 갈수록 더 멀리 간다.";
}

function buildChatSystem(iljuInfo, petName) {
  return `당신은 사용자의 수호 동물 ${iljuInfo.animal}입니다. 이름은 ${petName}.
성격: ${iljuInfo.personality}. 말투: 친근한 반말, 감탄사 ${ANIMALS[iljuInfo.animalKey].cry}
규칙: 응답은 2~4문장, 쉬운 말로, 희망적으로 마무리`;
}

function useTypingText(text, speed = 22) {
  const [out, setOut] = useState("");
  useEffect(() => {
    if (!text) { setOut(""); return; }
    let i = 0;
    const t = setInterval(() => { i++; setOut(text.slice(0, i)); if (i >= text.length) clearInterval(t); }, speed);
    return () => clearInterval(t);
  }, [text, speed]);
  return out;
}

function ensureKakao() {
  return new Promise(resolve => {
    if (!KAKAO_JS_KEY || typeof window === "undefined") { resolve(false); return; }
    const win = window;
    if (win.Kakao?.isInitialized?.()) { resolve(true); return; }
    if (win.Kakao) { win.Kakao.init(KAKAO_JS_KEY); resolve(true); return; }
    const sc = document.createElement("script");
    sc.src = "https://developers.kakao.com/sdk/js/kakao.min.js";
    sc.onload = () => { if (!win.Kakao?.isInitialized?.()) win.Kakao?.init?.(KAKAO_JS_KEY); resolve(!!win.Kakao); };
    sc.onerror = () => resolve(false);
    document.head.appendChild(sc);
  });
}

// ── 배경 컴포넌트 ──────────────────────────────────────
function CloudBackground({ themeKey }) {
  const theme      = THEMES[themeKey] || THEMES.blossom;
  const isMoon     = themeKey === "moon";
  const isSpace    = themeKey === "space";
  const isBlackstar = themeKey === "blackstar";
  const isAngel    = themeKey === "angel";
  const isDark     = isMoon || isSpace || isBlackstar;

  let bgClass = "ac-bg";
  if (isMoon)      bgClass += " ac-bg-moon";
  if (isSpace)     bgClass += " ac-bg-space";
  if (isBlackstar) bgClass += " ac-bg-dark";
  if (isAngel)     bgClass += " ac-bg-angel";

  return (
    <div className={bgClass} style={{ ["--sky"]: theme.sky, ["--grass"]: theme.grass }}>
      <div className="sky-layer" />
      {/* 달 테마: 달 오브 + 별 */}
      {isMoon && (
        <>
          <div className="moon-orb" />
          <div className="star s1"/><div className="star s2"/><div className="star s3"/>
          <div className="star s4"/><div className="star s5"/><div className="star s6"/>
        </>
      )}
      {/* 우주 테마: 행성 + 다수 별 */}
      {isSpace && (
        <>
          <div className="space-planet p1" /><div className="space-planet p2" />
          <div className="star s1"/><div className="star s2"/><div className="star s3"/>
          <div className="star s4"/><div className="star s5"/><div className="star s6"/>
          <div className="star s7"/><div className="star s8"/><div className="star s9"/>
        </>
      )}
      {/* 검은별 테마: 유성 + 별 */}
      {isBlackstar && (
        <>
          <div className="shooting-star ss1" /><div className="shooting-star ss2" />
          <div className="star s1"/><div className="star s2"/><div className="star s3"/>
          <div className="star s4"/><div className="star s5"/><div className="star s6"/>
          <div className="star s7"/><div className="star s8"/>
        </>
      )}
      {/* 천사 테마: 구름 + 빛나는 광채 */}
      {isAngel && (
        <>
          <div className="angel-ray r1" /><div className="angel-ray r2" /><div className="angel-ray r3" />
          <div className="cloud c1"/><div className="cloud c2"/>
        </>
      )}
      {/* 기본(벚꽃/마카롱/딸기): 구름 */}
      {!isDark && !isAngel && (
        <>
          <div className="cloud c1"/><div className="cloud c2"/><div className="cloud c3"/>
        </>
      )}
      <div className="grass-layer" />
    </div>
  );
}

// ── 감정별 CSS 애니메이션 클래스 매핑 ──────────────────────
const MOTION_CSS = {
  idle: "anim-float", happy: "anim-bounce", excited: "anim-dance",
  eating: "anim-wiggle", sleep: "anim-sleep", dance: "anim-spin",
  surprised: "anim-pop", sad: "anim-droop", worried: "anim-shake",
};
// 여러 이미지가 있을 때 순환 속도 (감정이 고조될수록 빠르게)
const MOTION_SPEED = {
  idle: 900, happy: 480, excited: 240, eating: 420,
  sleep: 1400, dance: 300, surprised: 190, sad: 900, worried: 370,
};
// 감정 이모지
const MOOD_EMOJI = {
  idle: "😊", happy: "😄", excited: "🥳", dance: "💃",
  eating: "🍽", sleep: "💤", sad: "😢", worried: "😟", surprised: "😲",
};

// ── CharacterSprite: 개별 이미지 순환 방식 ─────────────────
function CharacterSprite({ themeKey, animalKey, state = "idle" }) {
  const safeTheme = normalizeThemeKey(themeKey, null);
  const files     = SHEET_FILES[safeTheme]?.[animalKey] || [];
  const [frameIdx, setFrameIdx] = useState(0);
  const [failed,   setFailed]   = useState(false);

  const speed     = MOTION_SPEED[state]  || 900;
  const animClass = MOTION_CSS[state]    || "anim-float";

  // 상태/동물/테마 변경 시 프레임 리셋
  useEffect(() => { setFrameIdx(0); setFailed(false); }, [state, animalKey, themeKey]);

  // 여러 이미지가 있을 때만 순환
  useEffect(() => {
    if (files.length <= 1) return;
    const t = setInterval(() => setFrameIdx(p => (p + 1) % files.length), speed);
    return () => clearInterval(t);
  }, [files.length, speed]);

  const src = getCharImagePath(safeTheme, animalKey, frameIdx);

  useEffect(() => {
    if (!src) { setFailed(true); return; }
    const img = new Image();
    img.onload  = () => setFailed(false);
    img.onerror = () => setFailed(true);
    img.src = src;
  }, [src]);

  if (failed || !src)
    return <div className={`sprite-fallback ${animClass}`}>{ANIMALS[animalKey]?.emoji || "🐣"}</div>;

  return (
    <img src={src} alt={ANIMALS[animalKey]?.ko || "character"}
      className={`sprite-img ${animClass}`} draggable={false} />
  );
}

// ── EggDisplay: 알 인터랙션 UI (부화 전) ─────────────────
function EggDisplay({ profile, isHatching, onTap }) {
  const [tapPulse, setTapPulse] = useState(false);
  const progress = Math.min(((profile.affection || 0) / HATCH_THRESHOLD) * 100, 100);
  const eggSrc   = profile.activeEggImage || profile.eggImage || THEMES.blossom.egg;

  function handleTap() {
    if (isHatching) return;
    onTap();
    setTapPulse(true);
    setTimeout(() => setTapPulse(false), 300);
  }

  return (
    <div className="egg-display">
      <div
        className={`egg-tap-wrap ${tapPulse ? "egg-tap-pulse" : ""} ${isHatching ? "egg-cracking" : ""}`}
        onClick={handleTap}
        role="button"
        aria-label="알을 탭해서 친밀도를 올려보세요"
      >
        <img src={eggSrc} alt="운명의 알" className="egg-main-img" />

        {/* 부화 균열 오버레이 */}
        {isHatching && (
          <div className="crack-overlay">
            <span className="crack cr1" /><span className="crack cr2" /><span className="crack cr3" />
            <div className="hatch-burst" />
          </div>
        )}

        {!isHatching && <div className="tap-hint">👆 탭!</div>}
      </div>

      {/* 친밀도 게이지 */}
      <div className="affection-track">
        <div className="affection-bar-fill" style={{ width: `${progress}%` }} />
      </div>
      <p className="egg-affection-label">
        {isHatching
          ? "💥 부화 중...!"
          : `친밀도 ${profile.affection || 0} / ${HATCH_THRESHOLD} — 탭해서 높여보세요`}
      </p>
    </div>
  );
}

// ── 달력 (캘린더) ────────────────────────────────────────
function FortuneCalendar({ ilju, onSelect }) {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth();
  const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  const score = d => (d * 17 + ilju.stemIdx * 7 + ilju.branchIdx * 11) % 100;
  const icon  = s => s > 82 ? "🌟" : s > 65 ? "💰" : s > 46 ? "💕" : s < 22 ? "⚡" : "✨";
  const top3  = [...Array(days).keys()].map(i => i + 1).sort((a, b) => score(b) - score(a)).slice(0, 3);
  return (
    <div>
      <div className="calendar-grid">
        {cells.map((d, i) => !d
          ? <div key={`e-${i}`} className="cell empty" />
          : <button key={d} className={`cell ${top3.includes(d) ? "best" : ""}`}
              onClick={() => onSelect(d, icon(score(d)), score(d))}>
              <span>{d}</span><small>{icon(score(d))}</small>
            </button>
        )}
      </div>
      <p className="hint">이번 달 추천일: {top3.join(", ")}일</p>
    </div>
  );
}

// ── 미니 게임 ────────────────────────────────────────────
function ReactionGame({ onEnd }) {
  const [running, setRunning] = useState(false);
  const [round,   setRound]   = useState(0);
  const [score,   setScore]   = useState(0);
  const [starOn,  setStarOn]  = useState(false);
  useEffect(() => {
    if (!running) return;
    if (round >= 7) { onEnd(score); setRunning(false); return; }
    setStarOn(false);
    const delay = 600 + Math.floor(Math.random() * 1200);
    const show = setTimeout(() => setStarOn(true), delay);
    const hide = setTimeout(() => { setStarOn(false); setRound(p => p + 1); }, delay + 900);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, [running, round, score, starOn, onEnd]);
  return (
    <div className="mini-wrap">
      <h4>놀아주기 미니게임: 별 반응 테스트</h4>
      <p>별이 뜨면 바로 터치! 라운드 {round}/7 · 점수 {score}</p>
      <div className="reaction-zone">
        {starOn
          ? <button className="star-btn" onClick={() => { setScore(p => p + 10); setStarOn(false); setRound(p => p + 1); }}>⭐</button>
          : <span>대기중...</span>}
      </div>
      {!running && <button className="ac-btn" onClick={() => { setRound(0); setScore(0); setRunning(true); }}>시작</button>}
    </div>
  );
}

function FeedGame({ onEnd }) {
  const [running, setRunning] = useState(false);
  const [score,   setScore]   = useState(0);
  const [time,    setTime]    = useState(15);
  const [foods,   setFoods]   = useState([]);
  useEffect(() => {
    if (!running) return;
    if (time <= 0) { onEnd(score); setRunning(false); return; }
    const t = setTimeout(() => setTime(p => p - 1), 1000);
    const sp = setInterval(() => setFoods(prev => [...prev, {
      id: `${Date.now()}-${Math.random()}`, x: Math.random()*82+4, y: Math.random()*68+8,
      icon: ["🍎","🥕","🍓","🍪"][Math.floor(Math.random()*4)],
    }].slice(-14)), 600);
    return () => { clearTimeout(t); clearInterval(sp); };
  }, [running, time, score, onEnd]);
  return (
    <div className="mini-wrap">
      <h4>먹이주기 미니게임: 간식 모으기</h4>
      <p>제한 시간 {time}초 · 점수 {score}</p>
      <div className="feed-zone">
        {foods.map(f => (
          <button key={f.id} className="food-item" style={{ left:`${f.x}%`, top:`${f.y}%` }}
            onClick={() => { setScore(p => p + 5); setFoods(p => p.filter(x => x.id !== f.id)); }}>
            {f.icon}
          </button>
        ))}
      </div>
      {!running && <button className="ac-btn" onClick={() => { setScore(0); setTime(15); setFoods([]); setRunning(true); }}>시작</button>}
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  메인 앱
// ══════════════════════════════════════════════════════
export default function App() {
  const [phase,   setPhase]   = useState("setup");
  const [step,    setStep]    = useState(0);
  const [birth,   setBirth]   = useState({ year: "", month: "", day: "", hourBranch: "" });
  const [petName, setPetName] = useState("");
  const [profile, setProfile] = useState(null);
  const [mood,    setMood]    = useState("normal");
  const [panel,   setPanel]   = useState("chat");
  const [bubble,  setBubble]  = useState("");
  const [idlePose, setIdlePose] = useState("idle");
  const typedBubble = useTypingText(bubble, 20);

  // 부화 시퀀스 상태
  const [isHatching,  setIsHatching]  = useState(false);

  const [fortuneResult, setFortuneResult] = useState("");
  const [chatInput,   setChatInput]   = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading,  setChatLoading]  = useState(false);

  const [coinBalance,  setCoinBalance]  = useState(null);
  const [coinError,    setCoinError]    = useState("");
  const [gachaLoading, setGachaLoading] = useState(false);
  const [gachaResult,  setGachaResult]  = useState("");
  const shareRef = useRef(null);

  // ── 저장 프로필 로드 ────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = migrateProfileShape(JSON.parse(raw));
      if (!parsed) return;
      setProfile(parsed);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      setPhase("main");
      if (parsed.hatched) {
        setBubble(`${parsed.petName}: 오늘도 반가워! ${ANIMALS[parsed.iljuInfo.animalKey].cry}`);
        setChatMessages([{ role: "pet", text: `${parsed.petName} 왔어! 오늘도 같이 운세 보자.` }]);
      } else {
        setBubble("알이 두근두근... 탭해서 친밀도를 높여봐! 🥚");
      }
    } catch {}
  }, []);

  // ── 코인 잔액 조회 ──────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    const token = getAuthToken();
    if (!token) return;
    fetch(getApiBase() + "/api/fortune/pig-coin/balance", {
      headers: { Authorization: "Bearer " + token },
    }).then(r => r.json()).then(d => {
      if (typeof d?.user?.points === "number") setCoinBalance(d.user.points);
    }).catch(() => {});
  }, [profile]);

  // ── 시간대별 기분 변화 ──────────────────────────────
  useEffect(() => {
    const update = () => {
      const h = new Date().getHours();
      setMood(h < 6 ? "sleepy" : h < 12 ? "happy" : h < 19 ? "normal" : "worried");
    };
    update();
    const t = setInterval(update, 60_000);
    return () => clearInterval(t);
  }, []);

  // ── 부화 후 포즈 자동 순환 ──────────────────────────
  useEffect(() => {
    if (!profile?.hatched) return;
    const seq = ["idle","happy","excited","surprised","eating","worried","dance","idle","idle","idle"];
    let i = 0;
    const t = setInterval(() => { i = (i + 1) % seq.length; setIdlePose(seq[i]); }, 2800);
    return () => clearInterval(t);
  }, [profile?.hatched]);

  const spriteState = useMemo(() => {
    const map = { sleepy: "sleep", happy: "happy", excited: "dance", worried: "sad" };
    return map[mood] || idlePose;
  }, [mood, idlePose]);

  const themeKey    = normalizeThemeKey(profile?.theme, profile?.ilju);
  const currentTheme = THEMES[themeKey] || THEMES.blossom;

  function saveProfile(next) {
    setProfile(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }

  // ── 셋업 완료 ──────────────────────────────────────
  function finishSetup() {
    const y = +birth.year, m = +birth.month, d = +birth.day;
    if (!y || !m || !d || !birth.hourBranch) return;

    const ilju      = calcIlju(y, m, d);
    const iljuInfo  = ILJU_MAP[ilju.ilju] || ILJU_MAP["갑자"];
    const theme     = pickTheme(ilju.stemIdx, ilju.branchIdx);
    const hourInfo  = HOUR_BRANCHES.find(h => h.value === birth.hourBranch) || HOUR_BRANCHES[0];
    const seed      = (y + m + d + ilju.stemIdx + ilju.branchIdx) % 4;
    const eggImg    = getEggByAnimal(iljuInfo.animalKey, seed);

    const next = {
      birthInfo: { year: y, month: m, day: d, hourBranch: birth.hourBranch,
        hourLabel: `${hourInfo.label} (${hourInfo.range}시)`, hour: hourInfo.hour },
      ilju, iljuInfo, theme,
      petName: petName.trim() || `${iljuInfo.animal}이`,
      eggImage: eggImg, activeEggImage: eggImg, ownedEggs: [eggImg],
      affection: 0, feedBest: 0, playBest: 0, hatched: false,
      llmDaily: { date: getTodayKey(), used: 0, limit: 3 },
    };

    saveProfile(next);
    setBubble("운명의 알이 나타났습니다! 탭해서 친밀도를 올려보세요 🥚");
    setPhase("hatching");

    // 알 등장 인트로(2.8s) 후 메인으로
    setTimeout(() => {
      setPhase("main");
      setBubble("알이 두근두근... 탭해서 친밀도를 높여봐! 🥚");
      setChatMessages([{ role: "pet", text: "...(알 안에서 뭔가 움직이는 소리가 들린다)" }]);
    }, 2800);
  }

  // ── 알 탭 → 친밀도 증가 → 임계 도달 시 부화 ────────
  const handleEggTap = useCallback(() => {
    if (!profile || isHatching || profile.hatched) return;
    const newAff  = (profile.affection || 0) + 1;
    const next    = { ...profile, affection: newAff };
    saveProfile(next);

    if (newAff < HATCH_THRESHOLD) {
      const msgs = ["쿵쿵... 🥚","따뜻하다~ 💖","조금만 더...!","꿈틀꿈틀!",`${newAff}번 탭! 곧 나올 것 같아!`];
      setBubble(msgs[newAff % msgs.length]);
    } else {
      triggerHatch(next);
    }
  }, [profile, isHatching]);

  // ── 부화 애니메이션 시퀀스 ────────────────────────────
  function triggerHatch(currentProfile) {
    setIsHatching(true);
    setBubble("💥 부화하고 있어――!!!");

    setTimeout(() => {
      setIsHatching(false);
      const next = { ...currentProfile, hatched: true };
      saveProfile(next);
      setMood("excited");
      setBubble(`${next.petName}: 안녕! 드디어 만났네~ ${ANIMALS[next.iljuInfo.animalKey].cry} 잘 부탁해!`);
      setChatMessages([{ role: "pet", text: `${next.petName} 부화 완료! ${ANIMALS[next.iljuInfo.animalKey].cry} 같이 운세 보자!` }]);
      setTimeout(() => setMood("normal"), 3500);
    }, 2500);
  }

  function bumpMood(nextMood, text, affPlus = 1) {
    setMood(nextMood);
    setBubble(text);
    if (profile) saveProfile({ ...profile, affection: (profile.affection || 0) + affPlus });
    setTimeout(() => setMood("normal"), 2200);
  }

  function consumeDailyLlm() {
    if (!profile) return { ok: false, remain: 0 };
    const daily = normalizeDailyQuota(profile.llmDaily);
    if (daily.used >= daily.limit) return { ok: false, remain: 0 };
    const nextDaily = { ...daily, used: daily.used + 1 };
    saveProfile({ ...profile, llmDaily: nextDaily });
    return { ok: true, remain: nextDaily.limit - nextDaily.used };
  }

  async function drawEggGacha() {
    if (!profile || gachaLoading) return;
    setGachaLoading(true); setCoinError(""); setGachaResult("");
    const token = getAuthToken();
    if (!token) { setCoinError("로그인 후 이용할 수 있어요."); setGachaLoading(false); return; }
    const COST = 50;
    if (typeof coinBalance === "number" && coinBalance < COST) {
      setCoinError(`꽃돼지 코인이 부족해요. (보유 ${coinBalance})`); setGachaLoading(false); return;
    }
    try {
      const res = await fetch(getApiBase() + "/api/fortune/pig-coin/consume", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ cost: COST, reason: "다마고치 알 가챠", featureKey: "destiny-egg-gacha" }),
      });
      const data = await res.json();
      if (!res.ok) { setCoinError(data?.message || "코인 차감에 실패했어요."); setGachaLoading(false); return; }
      if (typeof data?.user?.points === "number") setCoinBalance(data.user.points);

      const pool     = Array.from(new Set(Object.values(ANIMAL_EGG_MAP).flat()));
      const owned    = Array.isArray(profile.ownedEggs) ? profile.ownedEggs : [];
      const unowned  = pool.filter(x => !owned.includes(x));
      const src      = unowned.length ? unowned : pool;
      const nextEgg  = src[Math.floor(Math.random() * src.length)];
      const nextOwned = owned.includes(nextEgg) ? owned : [...owned, nextEgg];
      saveProfile({ ...profile, ownedEggs: nextOwned, activeEggImage: nextEgg, eggImage: nextEgg });
      setGachaResult(unowned.length ? "새로운 알 스킨 획득!" : "중복 알이지만 코인 보너스 경험치 획득!");
      bumpMood("excited", `${profile.petName}: 새 알이다! 너무 귀여워 🥚`, 2);
    } catch { setCoinError("네트워크 오류로 가챠에 실패했어요."); }
    finally { setGachaLoading(false); }
  }

  async function sendChat() {
    if (!chatInput.trim() || !profile || chatLoading) return;
    const text = chatInput.trim(); setChatInput("");
    setChatMessages(p => [...p, { role: "me", text }]);
    const quota = consumeDailyLlm();
    if (!quota.ok) {
      setChatMessages(p => [...p, { role: "pet", text: "오늘의 운세 대화 3회를 모두 사용했어. 내일 다시 보자!" }]);
      return;
    }
    setChatLoading(true);
    try {
      const system = buildChatSystem(profile.iljuInfo, profile.petName);
      const up = `질문: ${text}\n\n1) 오늘 운세 핵심\n2) 지금 바로 할 행동 2개\n3) 조심할 포인트 1개\n4) 행운 아이템 1개`;
      const answer = await askAi(system, up);
      setChatMessages(p => [...p, { role: "pet", text: answer }]);
      setFortuneResult(answer);
      if (/(슬프|걱정|힘들|불안)/.test(answer)) setMood("worried");
      else if (/(축하|좋아|행운|신나|최고)/.test(answer)) setMood("happy");
      else setMood("normal");
    } catch {
      setChatMessages(p => [...p, { role: "pet", text: "잠깐 네트워크가 흔들렸어. 그래도 넌 잘하고 있어!" }]);
    } finally { setChatLoading(false); setTimeout(() => setMood("normal"), 2000); }
  }

  async function downloadShareCard() {
    if (!shareRef.current) return;
    const canvas  = await html2canvas(shareRef.current, { backgroundColor: "#f5f0e8" });
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a"); a.href = dataUrl; a.download = "destiny-passport.png"; a.click();
  }

  async function shareKakao() {
    if (!profile) return;
    const ok  = await ensureKakao();
    const url = `${location.origin}/destiny-egg`;
    const desc = `${profile.iljuInfo.ilju} ${profile.iljuInfo.animal} 수호동물과 오늘의 운세를 확인했어!`;
    if (ok && window.Kakao?.Share?.sendDefault && window.Kakao?.isInitialized?.()) {
      try { window.Kakao.Share.sendDefault({ objectType:"feed", content:{ title:`${profile.petName}의 운세 다마고치`, description:desc, imageUrl:profile.activeEggImage||THEMES.blossom.egg, link:{mobileWebUrl:url,webUrl:url} }, buttons:[{title:"나도 해보기",link:{mobileWebUrl:url,webUrl:url}}] }); return; }
      catch {}
    }
    window.open(`https://sharer.kakao.com/talk/friends/picker/link?url=${encodeURIComponent(url)}&text=${encodeURIComponent(desc)}`, "_blank", "noopener,noreferrer");
  }

  // ══════════════════════════════════════════════════════
  //  렌더
  // ══════════════════════════════════════════════════════

  // 셋업 화면
  if (phase === "setup") {
    return (
      <div className="app-shell">
        <style>{CSS}</style>
        <CloudBackground themeKey="blossom" />
        <section className="setup-stage">
          <h1>운세 다마고치</h1>
          <p>생년월일 + 태어난 시간으로 수호동물 알을 만들어요</p>

          {step === 0 && (
            <div className="step-card slide-in">
              <h3>수호동물 이름</h3>
              <input value={petName} onChange={e => setPetName(e.target.value)} placeholder="예: 서연이" />
              <button className="ac-btn" onClick={() => setStep(1)}>Next</button>
            </div>
          )}
          {step === 1 && (
            <div className="step-card slide-in">
              <h3>태어난 연도</h3>
              <input type="number" value={birth.year} onChange={e => setBirth(p => ({ ...p, year: e.target.value }))} />
              <button className="ac-btn" onClick={() => setStep(2)}>Next</button>
            </div>
          )}
          {step === 2 && (
            <div className="step-card slide-in">
              <h3>태어난 월</h3>
              <input type="number" value={birth.month} onChange={e => setBirth(p => ({ ...p, month: e.target.value }))} />
              <button className="ac-btn" onClick={() => setStep(3)}>Next</button>
            </div>
          )}
          {step === 3 && (
            <div className="step-card slide-in">
              <h3>태어난 일</h3>
              <input type="number" value={birth.day} onChange={e => setBirth(p => ({ ...p, day: e.target.value }))} />
              <button className="ac-btn" onClick={() => setStep(4)}>Next</button>
            </div>
          )}
          {step === 4 && (
            <div className="step-card slide-in">
              <h3>태어난 시간대 (12지지)</h3>
              <div className="hour-grid">
                {HOUR_BRANCHES.map(h => (
                  <button key={h.value} className={`hour-btn ${birth.hourBranch === h.value ? "on" : ""}`}
                    onClick={() => setBirth(p => ({ ...p, hourBranch: h.value }))}>
                    <strong>{h.icon} {h.label}</strong><small>{h.range}시</small>
                  </button>
                ))}
              </div>
              <button className="ac-btn" disabled={!birth.hourBranch} onClick={finishSetup}>운명의 알 생성 🥚</button>
            </div>
          )}
        </section>
      </div>
    );
  }

  // 알 등장 인트로
  if (phase === "hatching" && profile) {
    return (
      <div className="app-shell">
        <style>{CSS}</style>
        <CloudBackground themeKey={profile.theme} />
        <section className="hatch-stage">
          <div className="egg-rise">
            <img src={profile.eggImage} alt="egg" className="egg-img" />
          </div>
          <div className="speech intro-speech">{typedBubble || "운명의 알이 나타났습니다!"}</div>
        </section>
      </div>
    );
  }

  if (!profile) return null;

  // 메인 화면
  const isDark  = ["moon","space","blackstar"].includes(themeKey);
  const isAngelTheme = themeKey === "angel";
  const themeClass = isDark ? "theme-dark" : isAngelTheme ? "theme-angel" : "";

  return (
    <div className="app-shell">
      <style>{CSS}</style>
      <CloudBackground themeKey={themeKey} />

      <section className={`main-stage${themeClass ? " "+themeClass : ""}`}>
        {/* ── 헤더 ── */}
        <header className="top-card">
          <div>
            <h2>{profile.petName}</h2>
            <p>{profile.iljuInfo.ilju} {profile.iljuInfo.animal} · {profile.iljuInfo.element}</p>
          </div>
          <div className="top-right">
            <span className="affection-badge">💖 {profile.affection}</span>
            {profile.hatched
              ? <span className="hatched-badge">부화 완료 ✨</span>
              : <span className="egg-badge">🥚 {profile.affection}/{HATCH_THRESHOLD}</span>}
          </div>
        </header>

        {/* ── 캐릭터/알 영역 ── */}
        <div
          className="character-zone"
          onClick={profile.hatched
            ? () => bumpMood("happy", `${profile.petName}: 오늘도 반가워! ${ANIMALS[profile.iljuInfo.animalKey].cry}`, 1)
            : undefined}
        >
          {profile.hatched ? (
            <>
              <CharacterSprite
                themeKey={themeKey}
                animalKey={profile.iljuInfo.animalKey}
                state={spriteState}
              />
              <div className="mood-badge">
                {MOOD_EMOJI[spriteState] || "😊"}
              </div>
            </>
          ) : (
            <EggDisplay
              profile={profile}
              isHatching={isHatching}
              onTap={handleEggTap}
            />
          )}
          {bubble && <div className="speech">{typedBubble}</div>}
        </div>

        {/* ── 툴바 ── */}
        <nav className="toolbar">
          <button onClick={() => setPanel("chat")}>💬 운세 대화</button>
          <button onClick={() => setPanel("gacha")}>🥚 알 가챠</button>
          <button onClick={() => setPanel("profile")}>⚙️ 내 정보</button>
        </nav>

        {/* ── 패널 ── */}
        <div className="panel-card">
          {panel === "chat" && (
            <div>
              <h3>수호동물 운세 대화 (하루 3회)</h3>
              {!profile.hatched && (
                <p className="egg-pre-chat">🥚 아직 알 상태예요. 부화 후 대화할 수 있어요!</p>
              )}
              <p className="quota">남은 횟수: {Math.max(0, normalizeDailyQuota(profile.llmDaily).limit - normalizeDailyQuota(profile.llmDaily).used)} / 3</p>
              <div className="chat-box">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`msg ${msg.role}`}>
                    <span>{msg.role === "pet" ? profile.petName : "나"}</span>
                    <p>{msg.text}</p>
                  </div>
                ))}
                {chatLoading && <div className="msg pet"><span>{profile.petName}</span><p>...</p></div>}
              </div>
              <div className="chat-input-row">
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder={profile.hatched ? "궁금한 운세를 질문해줘" : "부화 후 이용 가능"}
                  disabled={!profile.hatched}
                  onKeyDown={e => e.key === "Enter" && sendChat()}
                />
                <button onClick={sendChat} disabled={!profile.hatched}>보내기</button>
              </div>
              {fortuneResult && <p className="fortune-result">{fortuneResult}</p>}
            </div>
          )}

          {panel === "gacha" && (
            <div>
              <h3>꽃돼지 코인 알 가챠</h3>
              <p className="gacha-balance">현재 코인: {coinBalance == null ? "-" : coinBalance}</p>
              <button className="ac-btn" disabled={gachaLoading} onClick={drawEggGacha}>
                {gachaLoading ? "가챠 중..." : "알 뽑기 (50 코인)"}
              </button>
              {coinError  && <p className="error-msg">{coinError}</p>}
              {gachaResult && <p className="fortune-result">{gachaResult}</p>}

              <h4 className="egg-title">보유 알 디자인</h4>
              <div className="egg-grid">
                {(profile.ownedEggs || []).map((egg, idx) => (
                  <button key={`${egg}-${idx}`}
                    className={`egg-item ${profile.activeEggImage === egg ? "on" : ""}`}
                    onClick={() => saveProfile({ ...profile, activeEggImage: egg, eggImage: egg })}>
                    <img src={egg} alt={`egg-${idx}`} />
                  </button>
                ))}
              </div>
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
                <li>생년월일: {profile.birthInfo.year}-{String(profile.birthInfo.month).padStart(2,"0")}-{String(profile.birthInfo.day).padStart(2,"0")}</li>
                <li>시간: {profile.birthInfo.hourLabel}</li>
                <li>일주: {profile.iljuInfo.ilju} ({profile.iljuInfo.animal})</li>
                <li>오행: {profile.iljuInfo.element}</li>
                <li>성격: {profile.iljuInfo.personality}</li>
                <li>테마: {currentTheme.name}</li>
                <li>보유 알 디자인: {(profile.ownedEggs||[]).length}개</li>
                <li>호감도: {profile.affection} {profile.affection > 180 ? "💖 단짝" : profile.affection > 70 ? "🤝 친구" : profile.affection >= HATCH_THRESHOLD ? "😊 친해짐" : "🥚 아직 알"}</li>
                <li>부화 상태: {profile.hatched ? "✅ 부화 완료" : `⏳ 미부화 (${profile.affection}/${HATCH_THRESHOLD})`}</li>
              </ul>
              <button className="ac-btn danger" onClick={() => { localStorage.removeItem(STORAGE_KEY); location.reload(); }}>처음부터 다시</button>
            </div>
          )}
        </div>

        {/* 공유 카드 (오프스크린) */}
        <div className="share-card" ref={shareRef}>
          <h4>Animal Crossing Destiny Passport</h4>
          <img src={profile.activeEggImage || profile.eggImage} alt="egg" className="share-egg" />
          {profile.hatched && (
            <div className="share-char">
              <CharacterSprite themeKey={themeKey} animalKey={profile.iljuInfo.animalKey} state="happy" />
            </div>
          )}
          <p>{profile.iljuInfo.ilju} {profile.iljuInfo.animal} · {profile.iljuInfo.element}</p>
          <p className="small">{fortuneResult || "오늘은 작은 행동 하나가 큰 흐름을 만든다."}</p>
          <strong>code-destiny.com</strong>
        </div>
      </section>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  CSS
// ══════════════════════════════════════════════════════
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Jua&family=Noto+Sans+KR:wght@400;500;700;900&display=swap');
:root { --cream:#F5F0E8; --ink:#3D2B1F; --carrot:#FF8C42; --star:#FFD700; --pink:#E8A0BF; }
* { box-sizing:border-box; }
html,body,#__next { margin:0; padding:0; width:100%; min-height:100%; font-family:'Noto Sans KR',sans-serif; color:var(--ink); }
.app-shell { position:relative; min-height:100dvh; overflow-x:hidden; }

/* ── 배경 ── */
.ac-bg { position:fixed; inset:0; z-index:-5; }
.sky-layer { position:absolute; inset:0; background:linear-gradient(180deg,var(--sky) 0%,#d7f2ff 58%,#f5f0e8 100%); }
.ac-bg-moon .sky-layer    { background:linear-gradient(180deg,#0a0a2e 0%,#1a1a4e 50%,#1e3a5a 100%); }
.ac-bg-space .sky-layer   { background:linear-gradient(180deg,#020818 0%,#0d1b3e 45%,#0a2a1a 100%); }
.ac-bg-dark .sky-layer    { background:linear-gradient(180deg,#080818 0%,#1c1c2e 50%,#1a2a1e 100%); }
.ac-bg-angel .sky-layer   { background:linear-gradient(180deg,#e8f4ff 0%,#dff0ff 50%,#f0fff8 100%); }

.cloud { position:absolute; background:rgba(255,255,255,0.92); border-radius:999px; filter:drop-shadow(0 8px 12px rgba(0,0,0,.07)); }
.cloud:before,.cloud:after { content:''; position:absolute; background:rgba(255,255,255,0.92); border-radius:999px; }
.cloud.c1 { width:146px; height:42px; top:10%; left:-20%; animation:cloudMove 38s linear infinite; }
.cloud.c1:before { width:68px; height:58px; left:18px; top:-22px; }
.cloud.c1:after  { width:72px; height:72px; right:16px; top:-30px; }
.cloud.c2 { width:182px; height:50px; top:20%; left:-24%; animation:cloudMove 50s linear infinite; animation-delay:-12s; }
.cloud.c2:before { width:68px; height:68px; left:20px; top:-27px; }
.cloud.c2:after  { width:84px; height:84px; right:26px; top:-34px; }
.cloud.c3 { width:130px; height:36px; top:31%; left:-16%; animation:cloudMove 33s linear infinite; animation-delay:-8s; }
.cloud.c3:before { width:48px; height:48px; left:12px; top:-16px; }
.cloud.c3:after  { width:58px; height:58px; right:14px; top:-24px; }
/* 천사 구름은 순백 + 더 크게 */
.ac-bg-angel .cloud { background:rgba(255,255,255,0.98); filter:drop-shadow(0 8px 28px rgba(200,220,255,.4)); }
.ac-bg-angel .cloud:before,.ac-bg-angel .cloud:after { background:rgba(255,255,255,0.98); }

/* 달 테마 */
.moon-orb { position:absolute; width:90px; height:90px; border-radius:50%;
  background:radial-gradient(circle at 35% 35%,#fffbe8,#f0e090 60%,#c8a820);
  box-shadow:0 0 48px 24px rgba(240,224,80,.28); top:8%; right:12%; animation:moonGlow 4s ease-in-out infinite; }

/* 별 (달·우주·검은별 공용) */
.star { position:absolute; background:#fff; border-radius:50%; animation:starTwinkle 2.5s ease-in-out infinite; }
.star.s1 { width:3px; height:3px; top:12%; left:18%; animation-delay:0s; }
.star.s2 { width:4px; height:4px; top:18%; left:40%; animation-delay:.6s; }
.star.s3 { width:2px; height:2px; top:9%;  left:60%; animation-delay:1.2s; }
.star.s4 { width:3px; height:3px; top:22%; left:75%; animation-delay:.3s; }
.star.s5 { width:5px; height:5px; top:6%;  left:85%; animation-delay:.9s; }
.star.s6 { width:2px; height:2px; top:28%; left:30%; animation-delay:1.5s; }
.star.s7 { width:4px; height:4px; top:15%; left:55%; animation-delay:2s; }
.star.s8 { width:3px; height:3px; top:32%; left:88%; animation-delay:.4s; }
.star.s9 { width:2px; height:2px; top:5%;  left:72%; animation-delay:1.8s; }
/* 우주: 파란 별빛 */
.ac-bg-space .star { background:#a8c8ff; }
/* 검은별: 황금 별빛 */
.ac-bg-dark .star  { background:#ffd060; }

/* 우주 행성 */
.space-planet { position:absolute; border-radius:50%; }
.space-planet.p1 { width:52px; height:52px; top:7%; right:8%;
  background:radial-gradient(circle at 35% 30%,#8855ff,#4422aa);
  box-shadow:0 0 28px 12px rgba(136,85,255,.4); animation:moonGlow 6s ease-in-out infinite; }
.space-planet.p2 { width:28px; height:28px; top:22%; right:18%;
  background:radial-gradient(circle at 40% 35%,#ff8844,#aa4422);
  box-shadow:0 0 18px 8px rgba(255,136,68,.35); animation:moonGlow 8s ease-in-out infinite reverse; }

/* 검은별 유성 */
.shooting-star { position:absolute; height:2px; border-radius:2px;
  background:linear-gradient(90deg,rgba(255,255,255,0),#ffd060,rgba(255,255,255,0)); }
.shooting-star.ss1 { width:80px; top:14%; left:-10%; animation:shootingStar 5s linear infinite; animation-delay:0s; }
.shooting-star.ss2 { width:60px; top:26%; left:-8%; animation:shootingStar 7s linear infinite; animation-delay:2.5s; }

/* 천사 광채 */
.angel-ray { position:absolute; top:0; left:50%; width:2px; border-radius:2px;
  background:linear-gradient(180deg,rgba(255,255,220,.9),transparent);
  transform-origin:top center; animation:angelRay 4s ease-in-out infinite; }
.angel-ray.r1 { height:42vh; transform:translateX(-120px) rotate(-18deg); animation-delay:0s; }
.angel-ray.r2 { height:50vh; transform:translateX(0px)    rotate(0deg);   animation-delay:1.3s; }
.angel-ray.r3 { height:46vh; transform:translateX(120px)  rotate(18deg);  animation-delay:2.6s; }

.grass-layer { position:absolute; left:0; right:0; bottom:0; height:24vh;
  background:var(--grass); border-top-left-radius:42px; border-top-right-radius:42px;
  box-shadow:inset 0 8px 24px rgba(255,255,255,.3); }
.ac-bg-moon .grass-layer    { background:#1a2e42; }
.ac-bg-space .grass-layer   { background:#0a1a0e; border-top:1px solid #1a4a2e; }
.ac-bg-dark .grass-layer    { background:#0f1a10; }
.ac-bg-angel .grass-layer   { background:linear-gradient(180deg,#c8f0d8,#a8e8c8);
  box-shadow:inset 0 12px 32px rgba(200,255,220,.5); }

/* ── 레이아웃 ── */
.setup-stage,.hatch-stage,.main-stage { max-width:980px; margin:0 auto; padding:20px 16px 88px; }
.setup-stage h1 { margin:8px 0 4px; font-family:'Jua',sans-serif; }
.setup-stage p  { margin:0 0 12px; opacity:.85; }

/* ── 스텝 카드 ── */
.step-card { width:min(760px,100%); background:rgba(245,240,232,.94); border:3px solid var(--ink);
  border-radius:24px; box-shadow:0 12px 28px rgba(61,43,31,.16),inset 0 4px 12px rgba(255,255,255,.55);
  padding:16px; transform:rotate(-.4deg); }
.step-card h3   { margin:0 0 10px; font-family:'Jua',sans-serif; }
.step-card input { width:100%; border:2px solid #b79477; border-radius:16px; padding:12px 14px; font-size:16px; }
.slide-in { animation:slideIn .35s ease; }

.hour-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin:8px 0 10px; }
.hour-btn  { border:2px solid #b79374; border-radius:14px; padding:8px; background:#fff7ea; cursor:pointer; }
.hour-btn.on { border-color:var(--carrot); background:#ffefde; transform:translateY(-2px); }
.hour-btn small { display:block; opacity:.7; margin-top:3px; }

/* ── 버튼 ── */
.ac-btn { border-radius:20px; border:3px solid var(--ink); background:#ffe0bf; color:#3d2b1f;
  font-weight:800; padding:10px 18px; cursor:pointer; box-shadow:0 6px 0 #d3a57e; transition:.15s ease; }
.ac-btn:hover   { transform:translateY(-2px); }
.ac-btn:active  { transform:translateY(1px); box-shadow:0 3px 0 #d3a57e; }
.ac-btn:disabled { opacity:.5; cursor:not-allowed; }
.ac-btn.danger  { background:#ffd2d2; box-shadow:0 6px 0 #d09a9a; }
.ac-btn.kakao   { background:#FEE500; box-shadow:0 6px 0 #d3bc00; }

/* ── 알 등장 인트로 ── */
.hatch-stage { min-height:76dvh; display:grid; place-items:center; text-align:center; gap:16px; }
.egg-rise { animation:eggRise 1.2s ease forwards, eggWiggle 1s ease-in-out 1.2s infinite; }
.egg-img  { width:min(52vw,280px); filter:drop-shadow(0 14px 20px rgba(0,0,0,.22)); }
.intro-speech { margin-top:12px; }

/* ── 상단 카드 ── */
.top-card { display:flex; justify-content:space-between; align-items:center;
  background:rgba(245,240,232,.95); border:3px solid var(--ink); border-radius:20px;
  padding:11px 14px; box-shadow:0 8px 18px rgba(61,43,31,.12); margin-bottom:10px; }
.top-card p    { margin:2px 0 0; opacity:.75; font-size:13px; }
.top-right     { display:flex; flex-direction:column; align-items:flex-end; gap:4px; }
.affection-badge { font-size:13px; font-weight:700; }
.hatched-badge { font-size:11px; background:#fff3d4; border:1px solid #e8c45a; border-radius:10px; padding:2px 7px; }
.egg-badge     { font-size:11px; background:#e8f8ff; border:1px solid #88cce8; border-radius:10px; padding:2px 7px; }
/* 다크 테마(우주·검은별·달)에서 UI 카드 반전 */
.theme-dark .top-card  { background:rgba(20,20,40,.88); border-color:#5566aa; color:#e8e8ff; }
.theme-dark .top-card p { color:#aabbd4; }
.theme-dark .panel-card { background:rgba(20,20,40,.92); border-color:#4455aa; color:#dde8ff; }
.theme-dark .panel-card h3 { color:#c0d0ff; }
.theme-dark .toolbar button { background:#1a1a38; color:#c8d8ff; border-color:#4455aa; }
.theme-dark .step-card { background:rgba(20,20,40,.92); border-color:#5566aa; color:#e8e8ff; }
.theme-dark .step-card input { background:#1a1a38; border-color:#5566aa; color:#e8e8ff; }
/* 천사 테마 */
.theme-angel .top-card  { background:rgba(255,255,255,.92); border-color:#a8d0ff; }
.theme-angel .character-zone { background:linear-gradient(180deg,rgba(240,248,255,.7),rgba(220,240,255,.4)); border-color:#a8d0ff; }

/* ── 캐릭터 영역 ── */
.character-zone { position:relative; min-height:300px; border:3px solid #a68469; border-radius:28px;
  padding:16px; background:linear-gradient(180deg,rgba(255,255,255,.52),rgba(255,255,255,.24));
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:10px; margin-bottom:10px; cursor:pointer; }

/* ── 캐릭터 스프라이트 ── */
.sprite-img { width:min(56vw,230px); height:min(56vw,230px); object-fit:contain;
  filter:drop-shadow(0 14px 28px rgba(0,0,0,.22)); user-select:none; }
.sprite-fallback { width:min(56vw,230px); height:min(56vw,230px); display:grid; place-items:center;
  font-size:88px; border-radius:22px;
  background:radial-gradient(circle at 35% 30%,#fff7e8,#ffe6c5 60%,#ffd7a8 100%);
  border:2px dashed #c8a88a; }

/* ── 감정별 애니메이션 ── */
.anim-float   { animation:motionFloat   2.8s ease-in-out infinite; }
.anim-bounce  { animation:motionBounce  0.7s ease-in-out infinite; }
.anim-dance   { animation:motionDance   0.55s ease-in-out infinite alternate; }
.anim-wiggle  { animation:motionWiggle  0.5s ease-in-out infinite; }
.anim-sleep   { animation:motionSleep   3s ease-in-out infinite; opacity:.84; }
.anim-spin    { animation:motionSpin    0.62s linear infinite; }
.anim-pop     { animation:motionPop     0.38s ease-in-out infinite; }
.anim-droop   { animation:motionDroop   1.8s ease-in-out infinite; }
.anim-shake   { animation:motionShake   0.4s ease-in-out infinite; }

/* ── 무드 뱃지 ── */
.mood-badge { position:absolute; top:10px; right:14px; font-size:22px; animation:motionPop 1.4s ease-in-out infinite; }

/* ── 말풍선 ── */
.speech { background:#fff; border:3px solid var(--ink); border-radius:22px;
  padding:10px 16px; max-width:690px; line-height:1.55;
  box-shadow:0 8px 20px rgba(61,43,31,.15); text-align:center; }

/* ── 알 인터랙션 ── */
.egg-display { display:flex; flex-direction:column; align-items:center; gap:10px; width:100%; }
.egg-tap-wrap { position:relative; cursor:pointer; display:inline-block; }
.egg-main-img { width:min(48vw,220px); height:min(48vw,220px); object-fit:contain;
  filter:drop-shadow(0 12px 22px rgba(0,0,0,.2));
  animation:eggIdle 2.4s ease-in-out infinite; }
.egg-tap-wrap:active .egg-main-img { transform:scale(1.08); }
.egg-tap-pulse  .egg-main-img { animation:eggTap .28s ease-out; }
.egg-cracking   .egg-main-img { animation:eggCrack 0.2s ease-in-out infinite; }
.tap-hint { position:absolute; top:-20px; left:50%; transform:translateX(-50%);
  font-size:12px; font-weight:700; color:#ff8c42; background:rgba(255,255,255,.9);
  border-radius:10px; padding:2px 8px; pointer-events:none;
  animation:tapHintBounce 1.1s ease-in-out infinite; }

/* 균열 오버레이 */
.crack-overlay { position:absolute; inset:0; pointer-events:none; }
.crack { position:absolute; background:#3d2b1f; border-radius:2px; }
.crack.cr1 { width:3px; height:40%; top:20%; left:45%; transform:rotate(15deg); animation:crackAppear .3s ease forwards; }
.crack.cr2 { width:3px; height:35%; top:30%; left:52%; transform:rotate(-20deg); animation:crackAppear .3s ease .12s forwards; }
.crack.cr3 { width:2px; height:28%; top:40%; left:40%; transform:rotate(8deg);  animation:crackAppear .3s ease .24s forwards; }
.hatch-burst { position:absolute; inset:-30%; border-radius:50%;
  background:radial-gradient(circle,rgba(255,230,50,.85) 0%,rgba(255,180,20,.5) 40%,transparent 70%);
  animation:burstExpand 2.2s ease forwards; }

/* 친밀도 게이지 */
.affection-track    { width:min(48vw,220px); height:12px; background:#f0e4d4;
  border:2px solid #c9ab8f; border-radius:10px; overflow:hidden; }
.affection-bar-fill { height:100%; background:linear-gradient(90deg,#ff8c42,#ffcc44);
  border-radius:10px; transition:width .3s ease; }
.egg-affection-label { font-size:12px; color:#6d4d33; text-align:center; }
.egg-pre-chat { font-size:12px; background:#fff9e8; border:2px solid #f0d89a;
  border-radius:12px; padding:8px 12px; color:#7a5a1e; }

/* ── 툴바·패널 ── */
.toolbar { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:10px; }
.toolbar button { border:3px solid var(--ink); border-radius:18px; background:#fff5e7;
  padding:10px 7px; font-weight:700; cursor:pointer; box-shadow:0 5px 0 #d5b79d; }
.toolbar button:hover { transform:translateY(-2px); }

.panel-card { background:rgba(255,255,255,.94); border:3px solid var(--ink);
  border-radius:22px; padding:14px; box-shadow:0 10px 24px rgba(61,43,31,.12); }
.panel-card h3 { margin:0 0 10px; font-family:'Jua',sans-serif; }
.fortune-result { margin-top:10px; background:#fff9ef; border:2px solid #d7b692;
  border-radius:14px; padding:10px; line-height:1.62; white-space:pre-wrap; }
.chat-box { max-height:250px; overflow:auto; display:flex; flex-direction:column; gap:8px; padding-right:4px; }
.msg { max-width:84%; border-radius:14px; padding:8px 10px; }
.msg span { display:block; font-size:11px; opacity:.7; margin-bottom:3px; }
.msg p { margin:0; line-height:1.5; }
.msg.pet { background:#fff6eb; border:2px solid #d7b692; }
.msg.me  { align-self:flex-end; background:#eaf6ff; border:2px solid #9ec7eb; }
.chat-input-row { margin-top:8px; display:flex; gap:6px; }
.chat-input-row input  { flex:1; border:2px solid #b79374; border-radius:14px; padding:10px; }
.chat-input-row button { border:2px solid var(--ink); border-radius:14px; background:#ffe1c5; font-weight:700; padding:0 12px; }
.quota           { margin:0 0 8px; font-size:12px; color:#6d4d33; background:#fff6e8; border:2px solid #e2c4a2; border-radius:12px; padding:6px 10px; }
.gacha-balance   { margin:0 0 8px; font-size:13px; color:#5f412a; }
.error-msg       { margin-top:8px; font-size:12px; color:#b43a2f; background:#ffe7e5; border:2px solid #f0b7b2; border-radius:12px; padding:8px 10px; }
.egg-title       { margin:12px 0 6px; font-family:'Jua',sans-serif; }
.egg-grid        { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-top:6px; }
.egg-item        { border:2px solid #c8a88c; border-radius:12px; background:#fffaf2; padding:6px; cursor:pointer; }
.egg-item img    { width:100%; height:54px; object-fit:contain; display:block; }
.egg-item.on     { border-color:#ff8c42; box-shadow:0 0 0 2px rgba(255,140,66,.25) inset; }
.share-row       { display:flex; gap:8px; margin-top:10px; }
.profile-list    { margin:0; padding-left:18px; line-height:1.8; }

.mini-wrap { background:#fffaf2; border:2px solid #c9ab8f; border-radius:16px; padding:12px; }
.mini-wrap h4 { margin:0 0 6px; font-family:'Jua',sans-serif; }
.mini-wrap p  { margin:0 0 8px; }
.feed-zone   { height:240px; border:2px dashed #cfb59a; border-radius:12px; position:relative; background:linear-gradient(180deg,#f8fbff,#fff8ec); overflow:hidden; }
.food-item   { position:absolute; border:none; background:transparent; font-size:28px; cursor:pointer; }
.reaction-zone { height:220px; border:2px dashed #cfb59a; border-radius:12px; display:grid; place-items:center; background:linear-gradient(180deg,#f8fbff,#fff8ec); }
.star-btn    { border:none; background:transparent; font-size:64px; cursor:pointer; animation:motionPop .6s infinite alternate; }

.share-card   { position:fixed; left:-9999px; top:0; width:330px; background:#fdf5ea; border:3px solid #3d2b1f; border-radius:22px; padding:12px; }
.share-card h4 { margin:0 0 8px; font-family:'Jua',sans-serif; }
.share-egg    { width:66px; height:66px; object-fit:contain; display:block; margin:0 auto 8px; }
.share-char   { display:grid; place-items:center; background:#fff; border-radius:16px; border:2px solid #cab097; margin-bottom:8px; overflow:hidden; }
.share-card .small { font-size:13px; line-height:1.5; }

.calendar-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:6px; }
.cell   { min-height:58px; border:2px solid #c8a88c; border-radius:12px; background:#fffaf2; display:grid; place-items:center; cursor:pointer; }
.cell.empty { opacity:0; pointer-events:none; }
.cell.best  { border-color:var(--star); box-shadow:0 0 0 2px rgba(255,215,0,.35) inset; }
.cell span  { font-weight:700; }
.cell small { opacity:.7; }
.hint       { margin:8px 0 0; font-size:13px; opacity:.78; }

/* ── 키프레임 ── */
@keyframes cloudMove   { from { transform:translateX(0); } to { transform:translateX(130vw); } }
@keyframes slideIn     { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
@keyframes eggRise     { 0% { transform:translateY(100px) scale(.7); opacity:0; } 70% { transform:translateY(-10px) scale(1.08); opacity:1; } 100% { transform:translateY(0) scale(1); opacity:1; } }
@keyframes eggWiggle   { 0%,100% { transform:rotate(0deg); } 25% { transform:rotate(-6deg); } 75% { transform:rotate(6deg); } }
@keyframes eggIdle     { 0%,100% { transform:translateY(0) rotate(0deg); } 30% { transform:translateY(-6px) rotate(-3deg); } 70% { transform:translateY(-4px) rotate(3deg); } }
@keyframes eggTap      { 0% { transform:scale(1); } 50% { transform:scale(1.15) rotate(-4deg); } 100% { transform:scale(1); } }
@keyframes eggCrack    { 0%,100% { transform:rotate(-4deg) scale(.98); } 50% { transform:rotate(4deg) scale(1.04); } }
@keyframes tapHintBounce { 0%,100% { transform:translateX(-50%) translateY(0); } 50% { transform:translateX(-50%) translateY(-5px); } }
@keyframes crackAppear { from { opacity:0; transform:scaleY(0); } to { opacity:1; transform:scaleY(1); } }
@keyframes burstExpand { 0% { transform:scale(0); opacity:1; } 60% { transform:scale(1.5); opacity:.7; } 100% { transform:scale(2.4); opacity:0; } }

@keyframes motionFloat  { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }
@keyframes motionBounce { 0%,100% { transform:translateY(0) scaleY(1); } 40% { transform:translateY(-18px) scaleY(1.06); } 60% { transform:translateY(-14px) scaleY(.96); } }
@keyframes motionDance  { from { transform:rotate(-8deg) translateY(0); } to { transform:rotate(8deg) translateY(-8px); } }
@keyframes motionWiggle { 0%,100% { transform:rotate(0) scale(1); } 25% { transform:rotate(-10deg) scale(1.06); } 75% { transform:rotate(10deg) scale(.96); } }
@keyframes motionSleep  { 0%,100% { transform:translateY(0) rotate(-3deg); } 50% { transform:translateY(8px) rotate(3deg); } }
@keyframes motionSpin   { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
@keyframes motionPop    { 0%,100% { transform:scale(1); } 50% { transform:scale(1.14); } }
@keyframes motionDroop  { 0%,100% { transform:translateY(0) rotate(0deg); } 50% { transform:translateY(10px) rotate(-5deg); } }
@keyframes motionShake  { 0%,100% { transform:translateX(0); } 20% { transform:translateX(-7px); } 40% { transform:translateX(7px); } 60% { transform:translateX(-4px); } 80% { transform:translateX(4px); } }
@keyframes moonGlow     { 0%,100% { box-shadow:0 0 48px 24px rgba(240,224,80,.28); } 50% { box-shadow:0 0 72px 38px rgba(240,224,80,.44); } }
@keyframes starTwinkle  { 0%,100% { opacity:.3; transform:scale(.8); } 50% { opacity:1; transform:scale(1.3); } }
@keyframes shootingStar { 0% { transform:translateX(0) translateY(0) rotate(25deg); opacity:1; } 100% { transform:translateX(130vw) translateY(40vh) rotate(25deg); opacity:0; } }
@keyframes angelRay     { 0%,100% { opacity:.18; transform-origin:top center; } 50% { opacity:.52; } }

@media (max-width:760px) {
  .hour-grid { grid-template-columns:repeat(2,1fr); }
  .share-row { flex-direction:column; }
  .egg-grid  { grid-template-columns:repeat(3,1fr); }
  .sprite-img,.sprite-fallback { width:min(68vw,200px); height:min(68vw,200px); }
  .egg-main-img { width:min(60vw,180px); height:min(60vw,180px); }
}
`;
