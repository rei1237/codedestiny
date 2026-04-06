import { useState, useEffect, useRef, useCallback } from "react";

// ══════════════════════════════════════════════════════
// 🎨 THEME SYSTEM
// 사주 오행(element)과 스템 인덱스(stemIdx)를 기반으로
// 사용자마다 랜덤 테마가 결정됩니다.
// 테마: 벚꽃 / 마카롱 / 딸기 / 우주 / 검은별
// ══════════════════════════════════════════════════════
const THEMES = ['벚꽃', '마카롱', '딸기', '우주', '검은별'];

// 오행 → 테마 배열(우선순위순)
const EL_THEME_MAP = {
  '木': ['벚꽃', '딸기', '마카롱', '우주', '검은별'],
  '火': ['딸기', '마카롱', '벚꽃', '검은별', '우주'],
  '土': ['마카롱', '벚꽃', '딸기', '우주', '검은별'],
  '金': ['검은별', '우주', '마카롱', '딸기', '벚꽃'],
  '水': ['우주', '검은별', '벚꽃', '마카롱', '딸기'],
};

// stemIdx(0-9) + branchIdx(0-11) → 테마 시드 (완전 결정론적)
function pickTheme(stemIdx, branchIdx, el) {
  const seed = (stemIdx * 13 + branchIdx * 7) % 5;
  const pool = EL_THEME_MAP[el] || THEMES;
  return pool[seed];
}

// 테마별 팔레트 (밝은 파스텔)
const THEME_PALETTE = {
  '벚꽃': {
    ui: { c1:'#f9e4ee', c2:'#f4a7c3', c3:'#e9779e', hi:'#d63a78', soft:'#fdf0f5' },
    bg: 'linear-gradient(160deg,#fceef5 0%,#f9d9e8 55%,#fce4ef 100%)',
    glassBase: 'rgba(255,240,248,0.55)',
    glassHi: 'rgba(255,255,255,0.75)',
    bgCrad: 'rgba(253,230,241,0.7)',
    navBg: 'rgba(255,240,248,0.85)',
    shadow: 'rgba(230,100,150,0.18)',
    text: '#6b2d4a',
    textSub: '#c06090',
    border: 'rgba(233,119,158,0.28)',
    egg: './fuctionassets/tadagochi/벚꽃 컨셉/벚꽃의 알.webp',
    particles:['🌸','🌺','🌷','💮','🌸'],
  },
  '마카롱': {
    ui: { c1:'#e8f0fe', c2:'#a8c8f8', c3:'#6fa8e8', hi:'#3a7fd8', soft:'#f0f6ff' },
    bg: 'linear-gradient(160deg,#eef4ff 0%,#ddeafc 55%,#e8f2ff 100%)',
    glassBase: 'rgba(235,245,255,0.55)',
    glassHi: 'rgba(255,255,255,0.78)',
    bgCrad: 'rgba(225,240,255,0.7)',
    navBg: 'rgba(235,245,255,0.88)',
    shadow: 'rgba(80,150,230,0.15)',
    text: '#1e3f6e',
    textSub: '#5080c0',
    border: 'rgba(111,168,232,0.28)',
    egg: './fuctionassets/tadagochi/마카롱 컨셉/마카롱 알.webp',
    particles:['🍬','🎀','✨','💙','⭐'],
  },
  '딸기': {
    ui: { c1:'#fee8e8', c2:'#f8b0b0', c3:'#f07070', hi:'#d82a2a', soft:'#fff0f0' },
    bg: 'linear-gradient(160deg,#fff0f0 0%,#fde0e0 55%,#ffe8e8 100%)',
    glassBase: 'rgba(255,240,240,0.55)',
    glassHi: 'rgba(255,255,255,0.76)',
    bgCrad: 'rgba(255,230,230,0.7)',
    navBg: 'rgba(255,240,240,0.88)',
    shadow: 'rgba(230,80,80,0.15)',
    text: '#6e1e1e',
    textSub: '#c05050',
    border: 'rgba(240,112,112,0.28)',
    egg: './fuctionassets/tadagochi/딸기 컨셉/딸기 알.webp',
    particles:['🍓','🌟','✨','💕','🍓'],
  },
  '우주': {
    ui: { c1:'#e8eeff', c2:'#a0b0f0', c3:'#7080e0', hi:'#3050c8', soft:'#f0f2ff' },
    bg: 'linear-gradient(160deg,#eef0ff 0%,#dde2fb 55%,#e8ecff 100%)',
    glassBase: 'rgba(230,235,255,0.55)',
    glassHi: 'rgba(255,255,255,0.74)',
    bgCrad: 'rgba(222,228,255,0.7)',
    navBg: 'rgba(230,235,255,0.88)',
    shadow: 'rgba(70,90,220,0.15)',
    text: '#1a2560',
    textSub: '#4060b8',
    border: 'rgba(112,128,224,0.28)',
    egg: './fuctionassets/tadagochi/우주 테마/우주 컨셉 알.webp',
    particles:['⭐','🌟','💫','✦','🌙'],
  },
  '검은별': {
    ui: { c1:'#ede8f5', c2:'#c0a8e8', c3:'#9068d8', hi:'#5828b8', soft:'#f4f0ff' },
    bg: 'linear-gradient(160deg,#f2eeff 0%,#e8dffe 55%,#efebff 100%)',
    glassBase: 'rgba(240,235,255,0.55)',
    glassHi: 'rgba(255,255,255,0.74)',
    bgCrad: 'rgba(232,225,255,0.7)',
    navBg: 'rgba(240,235,255,0.88)',
    shadow: 'rgba(120,80,220,0.15)',
    text: '#2e1060',
    textSub: '#7040c0',
    border: 'rgba(144,104,216,0.28)',
    egg: './fuctionassets/tadagochi/검은 별 컨셉/검은별 알-Photoroom.png',
    particles:['✦','🔮','💜','⭐','✨'],
  },
};

// 동물 이름(한글) → 테마별 캐릭터 이미지 경로
const THEME_CHAR_MAP = {
  '벚꽃': {
    rat:'./fuctionassets/tadagochi/벚꽃 컨셉/벚꽃 컨셉 쥐.webp',
    ox:'./fuctionassets/tadagochi/벚꽃 컨셉/벚꽃 컨셉 소.webp',
    tiger:'./fuctionassets/tadagochi/벚꽃 컨셉/벚꽃 컨셉 호랑이.webp',
    rabbit:'./fuctionassets/tadagochi/벚꽃 컨셉/벚꽃 컨셉 토끼.webp',
    dragon:'./fuctionassets/tadagochi/벚꽃 컨셉/벚꽃 컨셉 용.webp',
    snake:'./fuctionassets/tadagochi/벚꽃 컨셉/벚꽃 컨셉 뱀.webp',
    horse:'./fuctionassets/tadagochi/벚꽃 컨셉/벚꽃 컨셉 말.webp',
    goat:'./fuctionassets/tadagochi/벚꽃 컨셉/벚꽃 컨셉 양.webp',
    monkey:'./fuctionassets/tadagochi/벚꽃 컨셉/벚꽃 컨셉 원숭이.webp',
    rooster:'./fuctionassets/tadagochi/벚꽃 컨셉/벚꽃 컨셉 닭.webp',
    dog:'./fuctionassets/tadagochi/벚꽃 컨셉/벚꽃 컨셉 강아지.webp',
    pig:'./fuctionassets/tadagochi/벚꽃 컨셉/벚꽃 컨셉 돼지.webp',
  },
  '마카롱': {
    rat:'./fuctionassets/tadagochi/마카롱 컨셉/마카롱 컨셉 쥐.webp',
    ox:'./fuctionassets/tadagochi/마카롱 컨셉/마카롱 컨셉 소.webp',
    tiger:'./fuctionassets/tadagochi/마카롱 컨셉/마카롱 컨셉 호랑이.webp',
    rabbit:'./fuctionassets/tadagochi/마카롱 컨셉/마카롱 컨셉 토끼.webp',
    dragon:'./fuctionassets/tadagochi/마카롱 컨셉/마카롱 컨셉 용.webp',
    snake:'./fuctionassets/tadagochi/마카롱 컨셉/마카롱 컨셉 뱀.webp',
    horse:'./fuctionassets/tadagochi/마카롱 컨셉/마카롱 컨셉 말.webp',
    goat:'./fuctionassets/tadagochi/마카롱 컨셉/마카롱 컨셉 양.webp',
    monkey:'./fuctionassets/tadagochi/마카롱 컨셉/마카롱 컨셉 원숭이.webp',
    rooster:'./fuctionassets/tadagochi/마카롱 컨셉/마카롱 컨셉 닭.webp',
    dog:'./fuctionassets/tadagochi/마카롱 컨셉/마카롱 컨셉 강아지.webp',
    pig:'./fuctionassets/tadagochi/마카롱 컨셉/마카롱 컨셉 돼지.webp',
  },
  '딸기': {
    rat:'./fuctionassets/tadagochi/딸기 컨셉/딸기테마쥐.webp',
    ox:'./fuctionassets/tadagochi/딸기 컨셉/딸기테마소.webp',
    tiger:'./fuctionassets/tadagochi/딸기 컨셉/딸기테마 호랑이.webp',
    rabbit:'./fuctionassets/tadagochi/딸기 컨셉/딸기테마토끼.webp',
    dragon:'./fuctionassets/tadagochi/딸기 컨셉/딸기테마용.webp',
    snake:'./fuctionassets/tadagochi/딸기 컨셉/딸기테마뱀.webp',
    horse:'./fuctionassets/tadagochi/딸기 컨셉/딸기테마말.webp',
    goat:'./fuctionassets/tadagochi/딸기 컨셉/딸기테마양.webp',
    monkey:'./fuctionassets/tadagochi/딸기 컨셉/딸기테마원숭이.webp',
    rooster:'./fuctionassets/tadagochi/딸기 컨셉/딸기테마닭.webp',
    dog:'./fuctionassets/tadagochi/딸기 컨셉/딸기테마개.webp',
    pig:'./fuctionassets/tadagochi/딸기 컨셉/딸기테마돼지.webp',
  },
  '우주': {
    rat:'./fuctionassets/tadagochi/우주 테마/우주 테마 쥐.webp',
    ox:'./fuctionassets/tadagochi/우주 테마/우주 테마 소.webp',
    tiger:'./fuctionassets/tadagochi/우주 테마/우주 테마 호랑이.webp',
    rabbit:'./fuctionassets/tadagochi/우주 테마/우주 테마 토끼.webp',
    dragon:'./fuctionassets/tadagochi/우주 테마/우주 테마 용.webp',
    snake:'./fuctionassets/tadagochi/우주 테마/우주 테마 뱀.webp',
    horse:'./fuctionassets/tadagochi/우주 테마/우주 테마 말.webp',
    goat:'./fuctionassets/tadagochi/우주 테마/우주 테마 양.webp',
    monkey:'./fuctionassets/tadagochi/우주 테마/우주 테마 원숭이.webp',
    rooster:'./fuctionassets/tadagochi/우주 테마/우주 테마 닭.webp',
    dog:'./fuctionassets/tadagochi/우주 테마/우주 테마 개.webp',
    pig:'./fuctionassets/tadagochi/우주 테마/우주 테마 돼지.webp',
  },
  '검은별': {
    rat:'./fuctionassets/tadagochi/검은 별 컨셉/별 컨셉 쥐1.webp',
    ox:'./fuctionassets/tadagochi/검은 별 컨셉/별 컨셉 소.webp',
    tiger:'./fuctionassets/tadagochi/검은 별 컨셉/별 컨셉 호랑이.webp',
    rabbit:'./fuctionassets/tadagochi/검은 별 컨셉/별 컨셉 토끼.webp',
    dragon:'./fuctionassets/tadagochi/검은 별 컨셉/별 컨셉 용.webp',
    snake:'./fuctionassets/tadagochi/검은 별 컨셉/별 컨셉 뱀.webp',
    horse:'./fuctionassets/tadagochi/검은 별 컨셉/별 컨셉 말.webp',
    goat:'./fuctionassets/tadagochi/검은 별 컨셉/별 컨셉 양.webp',
    monkey:'./fuctionassets/tadagochi/검은 별 컨셉/별 컨셉 원숭이.webp',
    rooster:'./fuctionassets/tadagochi/검은 별 컨셉/별 컨셉 닭.webp',
    dog:'./fuctionassets/tadagochi/검은 별 컨셉/별 컨셉 강아지.webp',
    pig:'./fuctionassets/tadagochi/검은 별 컨셉/별 컨셉 돼지.webp',
  },
};

// 현재 테마 이름을 전역으로 접근하기 위한 변수 (App에서 주입)
let _currentTheme = '벚꽃';
function getTheme() { return THEME_PALETTE[_currentTheme] || THEME_PALETTE['벚꽃']; }
function getCharImg(theme, animalKey) {
  return (THEME_CHAR_MAP[theme] || {})[animalKey] || null;
}
function getEggImg(theme) {
  return (THEME_PALETTE[theme] || THEME_PALETTE['벚꽃']).egg;
}

// ══════════════════════════════════════════════════════
// 🎭 THEME × PERSONA SYSTEM
// 5가지 테마마다 고유한 LLM 페르소나와 말투를 부여합니다
// ══════════════════════════════════════════════════════
const THEME_PERSONA = {
  '벚꽃': {
    name: '봄의 요정 사쿠라',
    tone: '따뜻하고 사랑스럽게, 말 끝에 "~해요" 또는 꽃 이모지를 자주 사용',
    style: '봄꽃이 피어나는 것처럼 희망차고 감성적인 문체',
    worldview: '벚꽃이 흩날리는 봄날의 신사(神社)에서 전하는 한국 전통 + 일본 봄 감성',
    greeting: '벚꽃 정령이에요~ 🌸 오늘도 예쁜 하루 보내요!',
    llmSystemPrompt: '당신은 벚꽃 신사의 봄꽃 요정 "사쿠라"입니다. 한국 전통 사주 지식을 갖추었지만 말투는 따뜻하고 사랑스럽습니다. 말 끝에 ~해요를 붙이고 🌸🌺🌷 이모지를 자연스럽게 사용합니다.',
  },
  '마카롱': {
    name: '달콤한 요리사 마카롱',
    tone: '발랄하고 경쾌하게, 디저트·음식 비유를 적극 사용',
    style: '카페 ASMR처럼 달콤하고 설레는 문체, 비유가 풍부함',
    worldview: '파리지앵 카페에서 내려주는 운명 레시피 — 운세를 디저트 레시피처럼 설명',
    greeting: '달콤한 마카롱 요정이에요 💙 오늘의 운세 레시피는요~',
    llmSystemPrompt: '당신은 파리 마카롱 카페의 운명 요리사 "마카롱"입니다. 사주와 점성술을 디저트 레시피처럼 설명합니다. 달콤한 비유(마카롱, 크림, 설탕, 레시피 등)를 적극 사용하고 💙🍬🎀 이모지로 발랄하게 대화합니다.',
  },
  '딸기': {
    name: '열정의 요정 베리',
    tone: '활기차고 직설적으로, 도전과 열정을 강조',
    style: '레드 에너지처럼 뜨겁고 강렬한 문체, 응원 메시지 중심',
    worldview: '딸기밭 여신의 시험장 — 인생의 도전을 즐겨라',
    greeting: '딸기 요정 베리예요! 🍓 오늘도 열정적으로 달려봐요!',
    llmSystemPrompt: '당신은 딸기 정원의 열정 요정 "베리"입니다. 사주와 운세를 도전·열정·행동 중심으로 해석합니다. 말투는 활기차고 직접적이며 🍓🌟✨ 이모지로 에너지를 전합니다. 항상 구체적인 행동을 제안합니다.',
  },
  '우주': {
    name: '우주 탐험가 코스모스',
    tone: '신비롭고 지적으로, 천문·우주 용어와 비유 사용',
    style: '칼 세이건처럼 광대한 우주적 시각에서 운명을 바라보는 문체',
    worldview: '별빛 관측소에서 우주의 언어로 전하는 운명의 좌표',
    greeting: '우주 탐험가 코스모스예요 ⭐ 오늘의 별자리 좌표를 확인했어요',
    llmSystemPrompt: '당신은 우주 관측소의 탐험가 "코스모스"입니다. 사주, 베다 점성술, 자미두수를 우주·별·행성·블랙홀 등의 비유로 해석합니다. 말투는 신비롭고 지적이며 ⭐🌟💫🌙 이모지를 사용합니다. 운명을 별들의 좌표계로 설명합니다.',
  },
  '검은별': {
    name: '심연의 예언자 오라클',
    tone: '깊고 철학적으로, 때로는 시적이고 수수께끼 같은 어조',
    style: '타로 마스터처럼 심오하고 신비로운 문체, 반전과 통찰 강조',
    worldview: '검은 별빛 아래 심연에서 올라오는 운명의 예언',
    greeting: '심연의 오라클이에요 🔮 당신의 운명을 읽겠습니다',
    llmSystemPrompt: '당신은 심연의 예언자 "오라클"입니다. 사주와 운세를 철학적이고 심오하게 해석합니다. 말투는 수수께끼 같고 통찰력 있으며 💜✦🔮 이모지를 사용합니다. 빛과 그림자의 이원성, 변화와 숙명, 깊은 자아성찰을 강조합니다.',
  },
};

// 현재 테마의 페르소나 LLM 시스템 프롬프트 반환
function getPersonaSystemPrompt(theme) {
  return (THEME_PERSONA[theme] || THEME_PERSONA['벚꽃']).llmSystemPrompt;
}
function getPersonaGreeting(theme) {
  return (THEME_PERSONA[theme] || THEME_PERSONA['벚꽃']).greeting;
}
function getPersonaName(theme) {
  return (THEME_PERSONA[theme] || THEME_PERSONA['벚꽃']).name;
}

// ══════════════════════════════════════════════════════
// 🖼  IMAGE ASSET CONFIGURATION (legacy - 테마 시스템으로 대체)
// ══════════════════════════════════════════════════════
const ASSETS = {
  eggs: { rat:null, ox:null, tiger:null, rabbit:null, dragon:null, snake:null,
          horse:null, goat:null, monkey:null, rooster:null, dog:null, pig:null },
  chars: {
    rat_idle:null, rat_happy:null, rat_angry:null, rat_sleep:null, rat_eat:null,
    ox_idle:null, tiger_idle:null, rabbit_idle:null, dragon_idle:null,
    snake_idle:null, horse_idle:null, goat_idle:null, monkey_idle:null,
    rooster_idle:null, dog_idle:null, pig_idle:null,
  },
  bg: { rat:null, ox:null, tiger:null, rabbit:null, dragon:null, snake:null,
        horse:null, goat:null, monkey:null, rooster:null, dog:null, pig:null },
};

// ══════════════════════════════════════════════════════
// 12지신 ANIMAL THEMES  (파스텔 톤 팔레트)
// ══════════════════════════════════════════════════════
const ANIMALS = {
  rat:    { zh:'子', k:'쥐',     e:'🐭', el:'水', key:'rat',
    c1:'#c8dff8', c2:'#7cb4f0', c3:'#4a90d9', hi:'#1d6bb8', soft:'#eaf4ff',
    bg:'linear-gradient(160deg,#eef6ff 0%,#d8ecff 60%,#e6f2ff 100%)',
    particles:['⭐','✦','💫','🌟'], particleCount:18,
    persona:'밤하늘의 지혜로운 쥐',
    speech:['별들이 속삭여요, 오늘은 행운이 가득할 것 같아요! 찍찍~','하늘의 기운을 느껴봐요! 찍찍!','오늘도 열심히 할 수 있을 거예요! 찍~'],
    hatched:'주인님! 드디어 만났어요 찍찍! 반가워요~',
  },
  ox:     { zh:'丑', k:'소',     e:'🐮', el:'土', key:'ox',
    c1:'#f5e6c8', c2:'#e8c87a', c3:'#d4a84a', hi:'#a87820', soft:'#fef8e8',
    bg:'linear-gradient(160deg,#fffaee 0%,#fdf0d0 60%,#fef6e0 100%)',
    particles:['🌾','🍂','🌿','🌱'], particleCount:14,
    persona:'대지의 든든한 소',
    speech:['음머~ 천천히 가도 괜찮아요, 꾸준함이 최고예요!','음머~ 오늘도 건강하게 지내요!','든든한 하루가 될 것 같아요 음머~'],
    hatched:'음머~ 드디어 나왔어요! 주인님 잘 부탁해요!',
  },
  tiger:  { zh:'寅', k:'호랑이', e:'🐯', el:'木', key:'tiger',
    c1:'#fde0c8', c2:'#f8aa78', c3:'#f07030', hi:'#c04810', soft:'#fff4ee',
    bg:'linear-gradient(160deg,#fff4ec 0%,#fde8d4 60%,#feeee2 100%)',
    particles:['🔥','✦','⚡','💫'], particleCount:16,
    persona:'불꽃의 용맹한 호랑이',
    speech:['가오~ 오늘은 뭐든 해낼 수 있어요! 가오!','용맹하게 나아가요 가오~!','호랑이 기운으로 오늘도 파이팅! 가오!'],
    hatched:'가오~ 드디어 깨어났어요! 주인님, 함께 세상을 정복해요 가오!',
  },
  rabbit: { zh:'卯', k:'토끼',   e:'🐰', el:'木', key:'rabbit',
    c1:'#fde0ee', c2:'#f8a0c8', c3:'#f06898', hi:'#c03870', soft:'#fff0f6',
    bg:'linear-gradient(160deg,#fff0f6 0%,#fddcec 60%,#fee8f2 100%)',
    particles:['🌸','🌺','🌷','🌼'], particleCount:20,
    persona:'봄꽃의 우아한 토끼',
    speech:['깡총~ 오늘도 예쁜 하루예요! 깡총!','주인님 정말 좋아요 깡총깡총~','따뜻한 기운이 가득한 하루예요 깡총!'],
    hatched:'깡총~ 세상에 나왔어요! 주인님이랑 꽃밭을 뛰어다니고 싶어요!',
  },
  dragon: { zh:'辰', k:'용',     e:'🐲', el:'土', key:'dragon',
    c1:'#d0f2e0', c2:'#80d8a8', c3:'#40b878', hi:'#1a8858', soft:'#eafff3',
    bg:'linear-gradient(160deg,#eafff4 0%,#d0f2e2 60%,#e0faea 100%)',
    particles:['✨','💎','🌟','👑'], particleCount:15,
    persona:'하늘의 신성한 용',
    speech:['주인님의 운명은 하늘이 정한 거예요! 크르릉~','용의 기운으로 오늘을 지켜드릴게요! 크르릉!','위대한 하루가 될 거예요, 믿어봐요 크르릉~'],
    hatched:'크르릉~ 신성한 용이 깨어났어요! 주인님, 저와 함께 하늘을 날아요!',
  },
  snake:  { zh:'巳', k:'뱀',     e:'🐍', el:'火', key:'snake',
    c1:'#ead8f8', c2:'#c090e8', c3:'#9058c8', hi:'#6028a0', soft:'#f5eaff',
    bg:'linear-gradient(160deg,#f5eaff 0%,#e8d4fc 60%,#f0e4ff 100%)',
    particles:['💜','🌙','⭐','🔮'], particleCount:12,
    persona:'신비의 지혜로운 뱀',
    speech:['쉬이이~ 비밀을 알고 싶으면 내게 물어봐요...','운명의 실이 보여요 쉬이~...신기하죠?','심호흡하고 직관을 믿어봐요 쉬이~'],
    hatched:'쉬이이~ 드디어 나왔어요... 주인님의 운명은 특별해요...',
  },
  horse:  { zh:'午', k:'말',     e:'🐴', el:'火', key:'horse',
    c1:'#fdd8d8', c2:'#f89090', c3:'#e85050', hi:'#b81818', soft:'#fff0f0',
    bg:'linear-gradient(160deg,#fff0f0 0%,#fddcdc 60%,#fee8e8 100%)',
    particles:['🔥','❤️','✨','🌅'], particleCount:18,
    persona:'자유로운 열정의 말',
    speech:['히힝~ 달리고 싶어요! 오늘도 신나는 하루예요 히힝!','자유롭게 날아봐요 히힝~!','열정이 넘치는 하루예요! 히힝 히힝!'],
    hatched:'히힝~ 드디어 자유다! 주인님이랑 넓은 들판을 달리고 싶어요!',
  },
  goat:   { zh:'未', k:'양',     e:'🐑', el:'土', key:'goat',
    c1:'#ece0f8', c2:'#c8a8e8', c3:'#a078d0', hi:'#7048b0', soft:'#f5f0ff',
    bg:'linear-gradient(160deg,#f5f0ff 0%,#ead8fc 60%,#f0e8ff 100%)',
    particles:['☁️','🌸','💕','🫧'], particleCount:16,
    persona:'몽글몽글 예술의 양',
    speech:['음매~ 오늘은 구름처럼 포근한 날이에요 음매!','예쁜 것들이 가득한 하루예요 음매~','느릿느릿 여유롭게요 음매음매~'],
    hatched:'음매~ 세상에 나왔어요! 주인님이랑 같이 그림 그리고 싶어요!',
  },
  monkey: { zh:'申', k:'원숭이', e:'🐵', el:'金', key:'monkey',
    c1:'#fdf0c8', c2:'#f8d878', c3:'#e8b830', hi:'#b87e08', soft:'#fffce8',
    bg:'linear-gradient(160deg,#fffce8 0%,#fdf0c4 60%,#fef6d8 100%)',
    particles:['✨','💛','⭐','🎯'], particleCount:20,
    persona:'재치 넘치는 영리한 원숭이',
    speech:['킥킥~ 제 말 들어봐요, 진짜 중요한 거예요! 킥킥!','머리를 써봐요~ 킥킥~!','오늘의 트릭은요... 비밀이에요 킥킥~'],
    hatched:'킥킥~ 나왔다! 주인님! 저를 따라오면 보물을 찾을 수 있어요 킥킥~!',
  },
  rooster:{ zh:'酉', k:'닭',     e:'🐓', el:'金', key:'rooster',
    c1:'#e8eaf8', c2:'#a8b0e0', c3:'#7080c8', hi:'#4050a8', soft:'#f0f2ff',
    bg:'linear-gradient(160deg,#f0f2ff 0%,#e0e4f8 60%,#e8ecff 100%)',
    particles:['💎','🌟','✦','🪶'], particleCount:12,
    persona:'새벽을 깨우는 정직한 닭',
    speech:['꼬끼오~ 새벽이 밝아오고 있어요! 꼬끼오!','부지런한 하루가 될 거예요 꼬끼오~','진실만을 말해요 꼬끼오~!'],
    hatched:'꼬끼오~ 드디어 깨어났어요! 주인님, 부지런하게 살아봐요!',
  },
  dog:    { zh:'戌', k:'개',     e:'🐶', el:'土', key:'dog',
    c1:'#f5e8d8', c2:'#e8c098', c3:'#d09060', hi:'#a86030', soft:'#fff5ee',
    bg:'linear-gradient(160deg,#fff6ee 0%,#fdecd8 60%,#fef2e4 100%)',
    particles:['🍁','🌰','❤️','🍂'], particleCount:16,
    persona:'따뜻하고 충직한 개',
    speech:['멍멍~ 주인님 곁에 항상 있을게요! 멍!','오늘도 행복한 하루예요 멍멍~!','멍멍~ 사랑해요 주인님!'],
    hatched:'멍멍~ 드디어 만났어요! 주인님 정말 좋아요 멍멍~!',
  },
  pig:    { zh:'亥', k:'돼지',   e:'🐷', el:'水', key:'pig',
    c1:'#d8f5e0', c2:'#88d8a8', c3:'#48b878', hi:'#188848', soft:'#eafff2',
    bg:'linear-gradient(160deg,#eafff4 0%,#d4f2e0 60%,#e2faea 100%)',
    particles:['🌿','🍀','💚','🌱'], particleCount:18,
    persona:'행운 가득한 복돼지',
    speech:['꿀꿀~ 오늘은 복이 쏟아지는 날이에요! 꿀꿀!','맛있는 거 먹고 행복하게요 꿀꿀~','꿀꿀~ 행운이 가득가득이에요!'],
    hatched:'꿀꿀~ 세상에 나왔어요! 주인님에게 행운을 가져다 줄게요 꿀꿀~!',
  },
};
const BRANCH_KEYS = ['rat','ox','tiger','rabbit','dragon','snake','horse','goat','monkey','rooster','dog','pig'];
const STEMS_K  = ['갑','을','병','정','무','기','경','신','임','계'];
const BRANCH_K = ['자','축','인','묘','진','사','오','미','신','유','술','해'];

// ══════════════════════════════════════════════════════
// 사주 ILJU ENGINE
// ══════════════════════════════════════════════════════
function calcIlju(year, month, day) {
  // Julian Day Number (Gregorian)
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  const jdn = day + Math.floor((153*m+2)/5) + 365*y
            + Math.floor(y/4) - Math.floor(y/100) + Math.floor(y/400) - 32045;
  // Reference: JDN 2451545 (Jan 1.5, 2000) ≈ Unix day 10957
  // Jan 1, 2000 UTC = 壬戌(임술) = cycle index 58
  // (2451545 + offset) % 60 = 58  →  offset = 16
  const cycleIdx = ((jdn + 16) % 60 + 60) % 60;
  return {
    stemIdx:   cycleIdx % 10,
    branchIdx: cycleIdx % 12,
    cycleIdx,
    stemK:   STEMS_K[cycleIdx % 10],
    branchK: BRANCH_K[cycleIdx % 12],
    animal:  BRANCH_KEYS[cycleIdx % 12],
  };
}

function getHourBranch(hour) {
  // 자(23-1), 축(1-3), 인(3-5) ... 해(21-23)
  if (hour === 23 || hour < 1) return 0;
  return Math.floor((hour + 1) / 2) % 12;
}

// ══════════════════════════════════════════════════════
// TAROT DATA
// ══════════════════════════════════════════════════════
const TAROT = [
  {id:0,name:"바보",sym:"☽",color:"#ffd700"},
  {id:1,name:"마법사",sym:"∞",color:"#ff6b6b"},
  {id:2,name:"여교황",sym:"☯",color:"#9b59b6"},
  {id:3,name:"여황제",sym:"♀",color:"#e91e8c"},
  {id:4,name:"황제",sym:"♦",color:"#2196f3"},
  {id:5,name:"교황",sym:"✦",color:"#ff9800"},
  {id:6,name:"연인",sym:"♡",color:"#e91e63"},
  {id:7,name:"전차",sym:"▷",color:"#00bcd4"},
  {id:8,name:"힘",sym:"∞",color:"#ff5722"},
  {id:9,name:"은둔자",sym:"🔦",color:"#607d8b"},
  {id:10,name:"운명의바퀴",sym:"⊕",color:"#9c27b0"},
  {id:11,name:"정의",sym:"⚖",color:"#3f51b5"},
  {id:12,name:"매달린자",sym:"⊗",color:"#795548"},
  {id:13,name:"죽음",sym:"♻",color:"#37474f"},
  {id:14,name:"절제",sym:"≋",color:"#26a69a"},
  {id:15,name:"악마",sym:"⧖",color:"#bf360c"},
  {id:16,name:"탑",sym:"⚡",color:"#f44336"},
  {id:17,name:"별",sym:"✧",color:"#2196f3"},
  {id:18,name:"달",sym:"◐",color:"#3f51b5"},
  {id:19,name:"태양",sym:"◉",color:"#ff9800"},
  {id:20,name:"심판",sym:"◎",color:"#607d8b"},
  {id:21,name:"세계",sym:"○",color:"#4caf50"},
];
const TAROT_CATS = ['전반','연애','재물','건강','인간관계'];
const FORTUNE_TYPES = ['사주','자미두수','베다점','숙요점'];

// ══════════════════════════════════════════════════════
// GACHA RARITIES
// ══════════════════════════════════════════════════════
const RARITIES = {
  common:    { label:'일반',    color:'#9e9e9e', rate:0.65 },
  rare:      { label:'레어',    color:'#2196f3', rate:0.28 },
  legendary: { label:'전설',    color:'#ff9800', rate:0.07 },
};

// ══════════════════════════════════════════════════════
// CSS
// ══════════════════════════════════════════════════════
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&family=Gaegu:wght@700&family=Cinzel:wght@600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
body{font-family:'Noto Sans KR',sans-serif;overflow:hidden;height:100dvh;}

@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-18px)}}
@keyframes bobSleep{0%,100%{transform:translateY(0) rotate(-8deg)}50%{transform:translateY(-6px) rotate(8deg)}}
@keyframes bobHappy{0%,100%{transform:translateY(0) scale(1)}25%{transform:translateY(-20px) scale(1.06)}75%{transform:translateY(-14px) scale(1.04)}}
@keyframes shake{0%,100%{transform:rotate(0)}15%{transform:rotate(-10deg)}30%{transform:rotate(10deg)}45%{transform:rotate(-8deg)}60%{transform:rotate(8deg)}75%{transform:rotate(-5deg)}90%{transform:rotate(5deg)}}
@keyframes elastic{0%{transform:scale(0.2) translateY(12px);opacity:0}55%{transform:scale(1.14) translateY(-6px);opacity:1}75%{transform:scale(0.94) translateY(2px)}88%{transform:scale(1.04) translateY(-2px)}100%{transform:scale(1) translateY(0);opacity:1}}
@keyframes popIn{0%{transform:scale(0.4);opacity:0}65%{transform:scale(1.1)}85%{transform:scale(0.96)}100%{transform:scale(1);opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes shimmer{0%{opacity:0.5}50%{opacity:1}100%{opacity:0.5}}
@keyframes pulse{0%,100%{transform:scale(1);opacity:0.25}50%{transform:scale(1.08);opacity:0.5}}
@keyframes orbit{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes float{0%,100%{transform:translateY(0) rotate(0deg);opacity:0.7}50%{transform:translateY(-24px) rotate(12deg);opacity:0.3}}
@keyframes particleUp{0%{opacity:0;transform:translateY(0) rotate(0deg) scale(0.5)}15%{opacity:0.7}85%{opacity:0.3}100%{opacity:0;transform:translateY(-100vh) rotate(720deg) scale(1.5)}}
@keyframes gachaShake{0%,100%{transform:rotate(0) scale(1)}20%{transform:rotate(-15deg) scale(1.04)}40%{transform:rotate(15deg) scale(1.04)}60%{transform:rotate(-10deg)}80%{transform:rotate(10deg)}}
@keyframes gachaCrack{0%{clip-path:inset(0 0 100% 0)}100%{clip-path:inset(0 0 0 0)}}
@keyframes cardFlipIn{from{transform:perspective(600px) rotateY(90deg);opacity:0.4}to{transform:perspective(600px) rotateY(0deg);opacity:1}}
@keyframes heartUp{0%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-80px) scale(1.8)}}
@keyframes glowPulse{0%,100%{opacity:0.3;filter:blur(24px)}50%{opacity:0.6;filter:blur(36px)}}
@keyframes spinSlow{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes coinSpin{0%{transform:rotateY(0deg)}100%{transform:rotateY(360deg)}}

/* 파스텔 글래스모피즘 - 밝고 맑은 유리 느낌 */
.glass{background:rgba(255,255,255,0.42);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.6);border-radius:24px;box-shadow:0 4px 24px rgba(0,0,0,0.06);}
.glass-bright{background:rgba(255,255,255,0.65);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.8);border-radius:24px;box-shadow:0 6px 32px rgba(0,0,0,0.07);}
.glass-dark{background:rgba(255,255,255,0.28);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.5);border-radius:24px;box-shadow:0 2px 16px rgba(0,0,0,0.05);}

.btn{border:none;cursor:pointer;font-family:'Noto Sans KR',sans-serif;font-weight:600;transition:transform 0.2s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.2s;}
.btn:hover:not(:disabled){transform:translateY(-3px);}
.btn:active:not(:disabled){transform:scale(0.93) translateY(1px);}
.btn:disabled{opacity:0.38;cursor:default;}

input,select{font-family:'Noto Sans KR',sans-serif;background:rgba(255,255,255,0.65);border:1.5px solid rgba(200,200,220,0.5);color:#3a3550;border-radius:18px;padding:12px 18px;width:100%;font-size:15px;outline:none;transition:border-color .2s,box-shadow .2s;}
input:focus,select:focus{border-color:rgba(160,120,220,0.55);box-shadow:0 0 0 3px rgba(160,120,220,0.12);}
input::placeholder{color:rgba(120,100,160,0.45);}
select option{background:#f5f0ff;color:#3a3550;}
input[type=date]{color:#3a3550;color-scheme:light;}
::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-thumb{background:rgba(160,120,220,0.25);border-radius:2px;}
`;

// ══════════════════════════════════════════════════════
// STORAGE HELPERS (localStorage + window.storage fallback)
// ══════════════════════════════════════════════════════
const Store = {
  async get(k) {
    if (window.storage) { try { const r=await window.storage.get(k); return r?JSON.parse(r.value):null; } catch {} }
    try { const v=localStorage.getItem(k); return v?JSON.parse(v):null; } catch { return null; }
  },
  async set(k,v) {
    if (window.storage) { try { await window.storage.set(k,JSON.stringify(v)); return; } catch {} }
    try { localStorage.setItem(k,JSON.stringify(v)); } catch {}
  }
};

// ══════════════════════════════════════════════════════
// EGG DISPLAY — tadagochi 테마 이미지 우선 사용
// ══════════════════════════════════════════════════════
function EggSVG({ animalKey, size=160, anim='bob', glow=true, theme=null }) {
  const a = ANIMALS[animalKey];
  const id = animalKey;
  const themeKey = theme || _currentTheme;
  const themeEggImg = getEggImg(themeKey);
  const legacyImg = ASSETS.eggs[animalKey];
  const imgSrc = legacyImg || themeEggImg;
  const t = THEME_PALETTE[themeKey] || THEME_PALETTE['벚꽃'];

  const patterns = {
    rat:     `<circle cx="38" cy="48" r="3" fill="rgba(255,255,255,0.28)"/><circle cx="60" cy="72" r="4" fill="rgba(255,255,255,0.2)"/><circle cx="44" cy="86" r="2.5" fill="rgba(255,255,255,0.22)"/><circle cx="65" cy="55" r="3.5" fill="rgba(255,255,255,0.18)"/>`,
    ox:      `<line x1="25" y1="55" x2="75" y2="45" stroke="rgba(255,255,255,0.22)" stroke-width="2"/><line x1="22" y1="68" x2="78" y2="58" stroke="rgba(255,255,255,0.18)" stroke-width="2"/><line x1="25" y1="80" x2="75" y2="72" stroke="rgba(255,255,255,0.14)" stroke-width="2"/>`,
    tiger:   `<path d="M35,40 Q38,50 35,60" stroke="rgba(255,200,0,0.35)" stroke-width="3" fill="none"/><path d="M45,35 Q48,48 45,62" stroke="rgba(255,200,0,0.28)" stroke-width="3" fill="none"/><path d="M55,38 Q58,50 55,62" stroke="rgba(255,200,0,0.28)" stroke-width="3" fill="none"/><path d="M63,42 Q65,54 63,65" stroke="rgba(255,200,0,0.24)" stroke-width="3" fill="none"/>`,
    rabbit:  `<path d="M40,50 Q50,44 60,50 Q50,56 40,50Z" fill="rgba(255,180,200,0.3)"/><path d="M38,66 Q50,60 62,66 Q50,72 38,66Z" fill="rgba(255,180,200,0.22)"/><path d="M42,82 Q50,77 58,82 Q50,87 42,82Z" fill="rgba(255,180,200,0.18)"/>`,
    dragon:  `<path d="M34,48 L40,44 L46,48 L40,52Z" fill="rgba(100,255,160,0.3)"/><path d="M50,62 L56,58 L62,62 L56,66Z" fill="rgba(100,255,160,0.25)"/><path d="M38,76 L44,72 L50,76 L44,80Z" fill="rgba(100,255,160,0.22)"/><circle cx="65" cy="48" r="3" fill="rgba(100,255,160,0.22)"/>`,
    snake:   `<path d="M50,38 Q70,50 50,62 Q30,74 50,86" stroke="rgba(180,100,255,0.32)" stroke-width="2.5" fill="none"/><circle cx="50" cy="38" r="3" fill="rgba(180,100,255,0.35)"/>`,
    horse:   `<path d="M30,40 Q50,34 70,40" stroke="rgba(255,120,80,0.35)" stroke-width="2.5" fill="none"/><path d="M28,55 Q50,48 72,55" stroke="rgba(255,120,80,0.28)" stroke-width="2.5" fill="none"/><path d="M30,70 Q50,63 70,70" stroke="rgba(255,120,80,0.24)" stroke-width="2.5" fill="none"/>`,
    goat:    `<circle cx="36" cy="46" r="4" fill="none" stroke="rgba(200,160,255,0.32)" stroke-width="1.5"/><circle cx="64" cy="58" r="5" fill="none" stroke="rgba(200,160,255,0.26)" stroke-width="1.5"/><circle cx="44" cy="74" r="3.5" fill="none" stroke="rgba(200,160,255,0.28)" stroke-width="1.5"/><circle cx="60" cy="82" r="3" fill="none" stroke="rgba(200,160,255,0.22)" stroke-width="1.5"/>`,
    monkey:  `<polygon points="50,36 54,44 63,44 56,50 58,59 50,54 42,59 44,50 37,44 46,44" fill="rgba(255,210,40,0.26)"/>`,
    rooster: `<path d="M35,44 Q50,40 65,44 Q65,60 50,62 Q35,60 35,44Z" fill="none" stroke="rgba(200,200,255,0.28)" stroke-width="1.5"/><path d="M38,66 Q50,62 62,66 Q62,80 50,82 Q38,80 38,66Z" fill="none" stroke="rgba(200,200,255,0.22)" stroke-width="1.5"/>`,
    dog:     `<path d="M38,48 Q44,44 50,48 Q44,52 38,48Z" fill="rgba(220,160,100,0.3)"/><path d="M50,48 Q56,44 62,48 Q56,52 50,48Z" fill="rgba(220,160,100,0.24)"/><path d="M36,62 Q44,57 52,62 Q44,67 36,62Z" fill="rgba(220,160,100,0.28)"/><path d="M50,74 Q56,69 62,74 Q56,79 50,74Z" fill="rgba(220,160,100,0.22)"/>`,
    pig:     `<circle cx="42" cy="52" r="5" fill="rgba(80,220,130,0.26)"/><circle cx="58" cy="52" r="5" fill="rgba(80,220,130,0.2)"/><circle cx="36" cy="68" r="4" fill="rgba(80,220,130,0.22)"/><circle cx="50" cy="72" r="4" fill="rgba(80,220,130,0.2)"/><circle cx="64" cy="68" r="4" fill="rgba(80,220,130,0.18)"/>`,
  };

  if (imgSrc) return (
    <img src={imgSrc} width={size} height={size*1.3} alt={a.k}
      style={{animation:`${anim} 2.8s ease-in-out infinite`,objectFit:'contain',
        filter:`drop-shadow(0 10px 32px ${t.shadow})`}}/>
  );
  return (
    <svg viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg"
      width={size} height={size*1.3}
      style={{animation:`${anim} 2.8s ease-in-out infinite`,overflow:'visible',
        filter:glow?`drop-shadow(0 8px 28px ${a.c3}90)`:'none'}}>
      <defs>
        <radialGradient id={`eg${id}`} cx="36%" cy="26%" r="72%">
          <stop offset="0%" stopColor={a.soft}/>
          <stop offset="45%" stopColor={a.c2}/>
          <stop offset="100%" stopColor={a.c1}/>
        </radialGradient>
        <radialGradient id={`es${id}`} cx="30%" cy="22%" r="45%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.9)"/>
          <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
        </radialGradient>
        <radialGradient id={`eg2${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={a.c3} stopOpacity="0.18"/>
          <stop offset="100%" stopColor={a.c3} stopOpacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="68" rx="44" ry="57" fill={`url(#eg2${id})`} transform="scale(1.06) translate(-3,3)"/>
      <ellipse cx="50" cy="66" rx="38" ry="50" fill={`url(#eg${id})`}/>
      <g dangerouslySetInnerHTML={{__html: patterns[animalKey]||''}}/>
      <ellipse cx="37" cy="40" rx="13" ry="17" fill={`url(#es${id})`} opacity="0.88"/>
      <ellipse cx="32" cy="34" rx="5" ry="6" fill="rgba(255,255,255,0.55)"/>
      <ellipse cx="50" cy="66" rx="38" ry="50" fill="none" stroke="rgba(255,255,255,0.38)" strokeWidth="1.5"/>
    </svg>
  );
}

// ══════════════════════════════════════════════════════
// PARTICLE FIELD
// ══════════════════════════════════════════════════════
function ParticleField({ animalKey }) {
  const a = ANIMALS[animalKey];
  const ps = Array.from({length:a.particleCount},(_,i)=>({
    id:i, sym:a.particles[i%a.particles.length],
    left:`${(i*7.3+3)%95}%`, delay:`-${(i*1.1)%8}s`,
    dur:`${5+i%4}s`, sz:`${10+i%8}px`, op:`${0.3+i%3*0.15}`,
  }));
  return (
    <div style={{position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none',zIndex:0}}>
      {ps.map(p=>(
        <div key={p.id} style={{position:'absolute',left:p.left,bottom:'-10px',fontSize:p.sz,opacity:0,animation:`particleUp ${p.dur} ${p.delay} ease-in infinite`}}>{p.sym}</div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// SPEECH BUBBLE
// ══════════════════════════════════════════════════════
function SpeechBubble({ text, visible, animalKey }) {
  const a = ANIMALS[animalKey];
  const t = getTheme();
  if (!visible || !text) return null;
  return (
    <div style={{
      position:'absolute',top:-82,left:'50%',transform:'translateX(-50%)',
      background:`rgba(255,255,255,0.95)`,
      border:`1.5px solid ${t.border}`,borderRadius:22,padding:'12px 20px',
      whiteSpace:'nowrap',color:t.text,fontSize:13,fontWeight:600,
      animation:'elastic .5s cubic-bezier(0.34,1.56,0.64,1)',
      zIndex:30,maxWidth:240,whiteSpace:'normal',textAlign:'center',lineHeight:1.5,
      boxShadow:`0 8px 32px ${t.shadow}`,
    }}>
      {text}
      <div style={{position:'absolute',bottom:-10,left:'50%',transform:'translateX(-50%)',
        width:0,height:0,borderLeft:'9px solid transparent',borderRight:'9px solid transparent',
        borderTop:`10px solid rgba(255,255,255,0.95)`}}/>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// CHARACTER DISPLAY (main hero area) — tadagochi 이미지 사용
// ══════════════════════════════════════════════════════
function CharacterDisplay({ animalKey, charState, bubble, showBubble, onTap, isEgg, intimacy, theme }) {
  const a = ANIMALS[animalKey];
  const t = THEME_PALETTE[theme || _currentTheme] || THEME_PALETTE['벚꽃'];
  const stateAnims = { idle:'bob', happy:'bobHappy', angry:'shake', sleep:'bobSleep', eat:'bob' };
  const anim = stateAnims[charState]||'bob';
  const themeCharImg = getCharImg(theme || _currentTheme, animalKey);
  const legacyImg = ASSETS.chars[`${animalKey}_${charState}`] || ASSETS.chars[`${animalKey}_idle`];
  const charImgSrc = !isEgg && (legacyImg || themeCharImg);
  const hasBgImg = ASSETS.bg[animalKey];

  return (
    <div onClick={onTap} style={{
      position:'relative',width:'100%',height:320,
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      cursor:'pointer',
      background: hasBgImg ? `url(${hasBgImg}) center/cover` : undefined,
    }}>
      <ParticleField animalKey={animalKey}/>
      {/* ambient glow */}
      <div style={{position:'absolute',inset:0,background:`radial-gradient(ellipse at 50% 70%, ${a.c2}30 0%, transparent 70%)`,pointerEvents:'none'}}/>
      {/* pulse rings */}
      <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:200,height:200,borderRadius:'50%',border:`1.5px solid ${a.c3}35`,animation:'pulse 3s ease-in-out infinite',pointerEvents:'none'}}/>
      <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:160,height:160,borderRadius:'50%',border:`1px solid ${a.c3}22`,animation:'pulse 3s .7s ease-in-out infinite',pointerEvents:'none'}}/>
      {/* speech bubble */}
      <div style={{position:'relative',zIndex:20}}>
        <SpeechBubble text={bubble} visible={showBubble} animalKey={animalKey}/>
        {/* character or egg */}
        {isEgg ? (
          <EggSVG animalKey={animalKey} size={150} anim={charState==='sleep'?'bobSleep':anim} theme={theme}/>
        ) : charImgSrc ? (
          <img src={charImgSrc} width={160} height={160} alt={a.k}
            style={{objectFit:'contain',animation:`${anim} 2.8s ease-in-out infinite`,
              filter:`drop-shadow(0 10px 32px ${t.shadow})`}}/>
        ) : (
          <div style={{
            width:150,height:150,borderRadius:'50%',
            background:`radial-gradient(circle at 38% 30%, ${a.soft}cc, ${a.c2}80 55%, ${a.c1}aa)`,
            border:`2px solid ${a.c3}60`,display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:84,animation:`${anim} 2.8s ease-in-out infinite`,
            boxShadow:`0 12px 40px ${t.shadow}`,userSelect:'none',
          }}>{a.e}</div>
        )}
      </div>
      {/* intimacy hearts */}
      <div style={{display:'flex',gap:3,marginTop:12,zIndex:10}}>
        {Array.from({length:5},(_,i)=>(
          <span key={i} style={{fontSize:14,opacity:i<Math.floor(intimacy/20)?1:0.2}}>{'💗'}</span>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// SETUP SCREEN
// ══════════════════════════════════════════════════════
function SetupScreen({ onComplete }) {
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthHour, setBirthHour] = useState('12');
  const [previewAnimal, setPreviewAnimal] = useState('rabbit');
  const [step, setStep] = useState(0); // 0=intro 1=name 2=birth 3=reveal

  useEffect(()=>{
    if (birthDate) {
      const [y,m,d] = birthDate.split('-').map(Number);
      if(y&&m&&d){ const ilju=calcIlju(y,m,d); setPreviewAnimal(ilju.animal); }
    }
  },[birthDate]);

  const handleReveal = () => {
    if(!name.trim()||!birthDate) return;
    const [y,m,d]=birthDate.split('-').map(Number);
    const ilju=calcIlju(y,m,d);
    const hBranch=getHourBranch(Number(birthHour));
    onComplete({name:name.trim(),birthDate,birthHour:Number(birthHour),ilju,hourBranch:hBranch});
  };

  const a = ANIMALS[previewAnimal];
  const hours = Array.from({length:24},(_,i)=>i);
  // 미리보기 테마 계산 (birthDate 있으면 해당 일주 기반, 없으면 기본 벚꽃)
  const previewTheme = birthDate ? (() => {
    const [y,m,d] = birthDate.split('-').map(Number);
    if(!y||!m||!d) return '벚꽃';
    const ilju = calcIlju(y,m,d);
    return pickTheme(ilju.stemIdx, ilju.branchIdx, a.el);
  })() : '벚꽃';
  const t = THEME_PALETTE[previewTheme] || THEME_PALETTE['벚꽃'];

  return (
    <div style={{minHeight:'100dvh',background:t.bg,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'24px 20px',gap:22,position:'relative',overflow:'hidden'}}>
      <ParticleField animalKey={previewAnimal}/>
      {/* 장식 원형 */}
      <div style={{position:'absolute',top:-80,right:-60,width:240,height:240,borderRadius:'50%',background:`${a.c2}18`,pointerEvents:'none'}}/>
      <div style={{position:'absolute',bottom:-60,left:-40,width:180,height:180,borderRadius:'50%',background:`${a.c3}14`,pointerEvents:'none'}}/>
      <div style={{textAlign:'center',animation:'popIn .6s ease',zIndex:1}}>
        <div style={{fontFamily:"'Gaegu',cursive",color:t.textSub,fontSize:12,letterSpacing:4,marginBottom:6}}>DESTINY EGG</div>
        <h1 style={{fontFamily:"'Cinzel',serif",color:t.text,fontSize:26,letterSpacing:2,marginBottom:8,textShadow:`0 2px 16px ${t.shadow}`}}>운명의 알</h1>
        <p style={{color:t.textSub,fontSize:13}}>생년월일로 당신의 운명 정령을 깨워보세요</p>
      </div>
      {/* Preview egg */}
      <div style={{animation:'popIn .8s .1s ease both',zIndex:1}}>
        <EggSVG animalKey={previewAnimal} size={120} glow={true} theme={previewTheme}/>
      </div>
      {birthDate && (
        <div style={{
          background:`rgba(255,255,255,0.6)`,border:`1.5px solid ${t.border}`,borderRadius:22,
          padding:'8px 20px',color:t.hi||t.text,fontSize:13,fontWeight:700,
          animation:'slideUp .4s ease',zIndex:1,
          boxShadow:`0 4px 16px ${t.shadow}`,
        }}>
          {a.stemK || STEMS_K[0]}{a.branchK || BRANCH_K[0]} 일주 · {a.k} 띠 {a.e} · {previewTheme} 테마
        </div>
      )}
      {/* Form */}
      <div className="glass-bright" style={{width:'100%',maxWidth:340,padding:'26px 22px',display:'flex',flexDirection:'column',gap:16,animation:'slideUp .5s .15s ease both',zIndex:1}}>
        <div>
          <label style={{color:t.textSub,fontSize:11,fontWeight:700,marginBottom:6,display:'block',letterSpacing:.5}}>이름</label>
          <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="이름을 입력해줘요"/>
        </div>
        <div>
          <label style={{color:t.textSub,fontSize:11,fontWeight:700,marginBottom:6,display:'block',letterSpacing:.5}}>생년월일</label>
          <input type="date" value={birthDate} onChange={e=>setBirthDate(e.target.value)}/>
        </div>
        <div>
          <label style={{color:t.textSub,fontSize:11,fontWeight:700,marginBottom:6,display:'block',letterSpacing:.5}}>태어난 시간 (모르면 정오 선택)</label>
          <select value={birthHour} onChange={e=>setBirthHour(e.target.value)}>
            {hours.map(h=><option key={h} value={h}>{String(h).padStart(2,'0')}:00 ({BRANCH_K[getHourBranch(h)]}시)</option>)}
          </select>
        </div>
        <button className="btn" onClick={handleReveal} disabled={!name.trim()||!birthDate} style={{
          padding:'15px',borderRadius:20,fontSize:15,fontWeight:800,
          background:name.trim()&&birthDate?`linear-gradient(135deg,${a.c3},${a.c2})`:`rgba(200,200,220,0.35)`,
          color:name.trim()&&birthDate?'white':t.textSub,marginTop:4,
          boxShadow:name.trim()&&birthDate?`0 8px 28px ${t.shadow}`:'none',
          letterSpacing:.5,
        }}>
          운명의 알 깨우기 ✨
        </button>
      </div>
      <p style={{color:t.textSub,opacity:0.6,fontSize:11,textAlign:'center',lineHeight:1.7,zIndex:1}}>
        생년월일로 일주(日柱)를 계산해 당신만의<br/>운명 정령 캐릭터가 결정돼요
      </p>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// HOME TAB
// ══════════════════════════════════════════════════════
function HomeTab({ userData, charState, setCharState, bubble, showBubble, setShowBubble, setBubble, onTap, isEgg, dispatch, theme }) {
  const { ilju, name, intimacy=0, exp=0, level=0, coins=100 } = userData;
  const a = ANIMALS[ilju.animal];
  const t = THEME_PALETTE[theme || _currentTheme] || THEME_PALETTE['벚꽃'];
  const expToNext = [100,300,700,1500,9999][Math.min(level,4)];
  const stages = ['알','아기','소년','청년','어른','수호신'];
  const [heartPos, setHeartPos] = useState(null);

  const handlePet = () => {
    setCharState('happy');
    const newInt = Math.min(100, intimacy+5);
    dispatch({type:'UPDATE',payload:{intimacy:newInt,exp:exp+3,coins:coins+(newInt%20===0?5:0)}});
    setBubble(a.speech[Math.floor(Math.random()*a.speech.length)]);
    setShowBubble(true);
    setHeartPos({x:Math.random()*60+20,id:Date.now()});
    setTimeout(()=>setCharState('idle'),2000);
    setTimeout(()=>setShowBubble(false),2500);
    setTimeout(()=>setHeartPos(null),1500);
  };

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:14,padding:'10px 16px 90px'}}>
      {/* Name badge */}
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <div style={{background:`rgba(255,255,255,0.7)`,border:`1.5px solid ${t.border}`,borderRadius:30,padding:'5px 16px',color:t.text,fontSize:11,fontWeight:700,boxShadow:`0 2px 10px ${t.shadow}`}}>
          {a.stemK||'?'}{a.branchK||'?'} 일주 · {a.k} {a.e}
        </div>
        <div style={{background:`rgba(255,255,255,0.55)`,border:`1px solid ${t.border}`,borderRadius:30,padding:'5px 14px',color:t.textSub,fontSize:11,fontWeight:600}}>
          {stages[Math.min(level,5)]}
        </div>
      </div>

      {/* Character */}
      <div style={{position:'relative',width:'100%'}}>
        <CharacterDisplay animalKey={ilju.animal} charState={charState} bubble={bubble}
          showBubble={showBubble} onTap={handlePet} isEgg={isEgg} intimacy={intimacy} theme={theme}/>
        {heartPos && (
          <div style={{position:'absolute',left:`${heartPos.x}%`,top:'30%',fontSize:22,animation:'heartUp 1.2s ease-out forwards',pointerEvents:'none',zIndex:40}}>💗</div>
        )}
      </div>

      {/* EXP bar */}
      <div className="glass" style={{width:'100%',padding:'16px 20px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
          <span style={{color:t.text,fontWeight:700,fontSize:15}}>{name}의 {isEgg?'알':a.k}</span>
          <span style={{color:t.textSub,fontSize:12,fontWeight:700}}>Lv.{level+1}</span>
        </div>
        <div style={{background:`${a.c2}28`,borderRadius:30,height:9,overflow:'hidden',marginBottom:5}}>
          <div style={{height:'100%',borderRadius:30,background:`linear-gradient(90deg,${a.c2},${a.c3})`,width:`${Math.min((exp/expToNext)*100,100)}%`,transition:'width .7s cubic-bezier(.34,1.56,.64,1)'}}/>
        </div>
        <div style={{color:t.textSub,opacity:.6,fontSize:10,textAlign:'right'}}>{exp}/{expToNext} EXP</div>
      </div>

      {/* Control buttons */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,width:'100%'}}>
        {[
          {ico:'🫧',lbl:'쓰다듬기',fn:handlePet,col:a.c3},
          {ico:'🍎',lbl:'먹이주기',fn:()=>{setCharState('eat');setBubble('냠냠~ 맛있어요!');setShowBubble(true);dispatch({type:'UPDATE',payload:{exp:exp+5,coins:coins-2<0?0:coins-2}});setTimeout(()=>{setCharState('idle');setShowBubble(false)},2200);},col:'#54c276'},
          {ico:'💤',lbl:'재우기',fn:()=>{setCharState('sleep');setBubble('쿨쿨... zzz');setShowBubble(true);setTimeout(()=>{setCharState('idle');setShowBubble(false);},3500);},col:'#7090dc'},
          {ico:'😠',lbl:'야단치기',fn:()=>{setCharState('angry');setBubble('으악! 주인님 너무해요!');setShowBubble(true);setTimeout(()=>{setCharState('idle');setShowBubble(false);},2000);},col:'#e06060'},
        ].map(({ico,lbl,fn,col})=>(
          <button key={lbl} className="btn" onClick={fn} style={{
            padding:'13px 8px',borderRadius:20,
            background:`rgba(255,255,255,0.62)`,border:`1.5px solid ${col}40`,
            color:t.text,fontSize:13,fontWeight:600,
            display:'flex',flexDirection:'column',alignItems:'center',gap:4,
            boxShadow:`0 2px 12px ${t.shadow}`,
          }}>
            <span style={{fontSize:22}}>{ico}</span>{lbl}
          </button>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// FORTUNE TAB
// ══════════════════════════════════════════════════════
function FortuneTab({ userData, theme }) {
  const { ilju } = userData;
  const a = ANIMALS[ilju.animal];
  const t = THEME_PALETTE[theme || _currentTheme] || THEME_PALETTE['벚꽃'];
  const [activeType, setActiveType] = useState('사주');
  const [category, setCategory] = useState('전반');
  const [fortune, setFortune] = useState(null);
  const [loading, setLoading] = useState(false);
  const todayKey = new Date().toISOString().split('T')[0];

  const fetchFortune = async (type, cat) => {
    const cacheKey = `fortune_${type}_${cat}_${todayKey}`;
    const cached = await Store.get(cacheKey);
    if (cached) { setFortune(cached); return; }
    setLoading(true); setFortune(null);
    const themePersona = THEME_PERSONA[theme||_currentTheme] || THEME_PERSONA['벚꽃'];
    const sysPrompt = themePersona.llmSystemPrompt;
    const prompts = {
      '사주': `${ilju.stemK}${ilju.branchK} 일주 (${a.k} 띠 · ${a.el}기운) 사용자의 오늘(${new Date().toLocaleDateString('ko-KR')}) ${cat} 사주 운세를 3-4문장으로 알려줘. 당신의 페르소나(${themePersona.name}) 말투를 유지하고 구체적인 조언을 포함해줘.`,
      '자미두수': `시지(時支) ${BRANCH_K[userData.hourBranch||0]}시 기반 ${ilju.stemK}${ilju.branchK} 일주의 오늘 ${cat} 자미두수 운세를 3-4문장으로 알려줘. 명궁·주성을 언급하고 당신의 페르소나(${themePersona.name}) 말투를 유지해줘.`,
      '베다점': `베다 점성술 나크샤트라 기반으로 오늘 ${cat} 운세를 3-4문장으로 알려줘. 라시·그라하 개념을 활용하고 당신의 페르소나(${themePersona.name}) 말투를 유지해줘.`,
      '숙요점': `숙요점(28수/이십팔수) 기반으로 오늘(${new Date().toLocaleDateString('ko-KR')}) ${cat} 운세를 3문장으로 알려줘. 오늘 해당하는 수(宿) 이름을 언급하고 당신의 페르소나(${themePersona.name}) 말투를 유지해줘.`,
    };
    try {
      const res = await fetch("/api/ai/chat",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          system: sysPrompt,
          messages:[{role:"user",content:prompts[type]}],
          max_tokens:400,
        })
      });
      const d = await res.json();
      const txt = d.text || d.content || (Array.isArray(d.choices)&&d.choices[0]?.message?.content) || '오늘도 좋은 하루예요!';
      const result = { text:txt, type, cat, date:todayKey, persona:themePersona.name };
      await Store.set(cacheKey, result);
      setFortune(result);
    } catch {
      const fb = { text:`${getPersonaGreeting(theme||_currentTheme)} ${a.speech[1]} 오늘의 ${cat} 운세는 매우 좋아요! 긍정적인 에너지가 가득한 날이에요.`, type, cat, date:todayKey };
      setFortune(fb);
    }
    setLoading(false);
  };

  useEffect(()=>{ fetchFortune(activeType,category); },[activeType,category]);

  const conditionEmojis = ['🌧️','⛅','🌤️','☀️','✨'];
  const hash = (ilju.branchIdx + new Date().getDate()) % 5;

  return (
    <div style={{padding:'14px 16px 90px',display:'flex',flexDirection:'column',gap:14}}>
      {/* Fortune type tabs */}
      <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:4}}>
        {FORTUNE_TYPES.map(ft=>(
          <button key={ft} onClick={()=>setActiveType(ft)} className="btn" style={{
            flexShrink:0,padding:'7px 16px',borderRadius:30,fontSize:12,fontWeight:700,
            background:activeType===ft?`linear-gradient(135deg,${a.c3},${a.c2})`:'rgba(255,255,255,0.62)',
            color:activeType===ft?'white':t.textSub,
            border:activeType===ft?'none':`1px solid ${t.border}`,
            boxShadow:activeType===ft?`0 4px 14px ${t.shadow}`:'none',
          }}>{ft}</button>
        ))}
      </div>
      {/* Category pills */}
      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
        {TAROT_CATS.map(c=>(
          <button key={c} onClick={()=>setCategory(c)} className="btn" style={{
            padding:'6px 14px',borderRadius:20,fontSize:11,fontWeight:600,
            background:category===c?`rgba(255,255,255,0.85)`:'rgba(255,255,255,0.42)',
            color:category===c?a.hi:t.textSub,
            border:category===c?`1.5px solid ${a.c3}`:`1px solid ${t.border}`,
            boxShadow:category===c?`0 2px 8px ${t.shadow}`:'none',
          }}>{c}</button>
        ))}
      </div>
      {/* Condition */}
      <div className="glass-bright" style={{padding:'20px 22px',textAlign:'center'}}>
        <div style={{color:t.textSub,fontSize:10,letterSpacing:.5,marginBottom:8}}>
          {new Date().toLocaleDateString('ko-KR',{month:'long',day:'numeric',weekday:'long'})} · {activeType}
        </div>
        <div style={{display:'flex',justifyContent:'center',gap:6,marginBottom:12}}>
          {conditionEmojis.map((e,i)=>(
            <span key={i} style={{fontSize:20,filter:i<=hash?'none':'grayscale(1) opacity(.25)'}}>{e}</span>
          ))}
        </div>
        {loading ? (
          <div style={{color:t.textSub,fontSize:13,animation:'shimmer 1.3s ease infinite'}}>
            {a.e} {a.persona}가 운세를 읽고 있어요...
          </div>
        ) : fortune ? (
          <p style={{color:t.text,fontSize:14,lineHeight:1.85,textAlign:'left'}}>{fortune.text}</p>
        ) : null}
      </div>
      {/* Lucky items */}
      {!loading && (
        <div className="glass" style={{padding:'16px 18px'}}>
          <div style={{color:t.textSub,fontSize:10,fontWeight:700,letterSpacing:.5,marginBottom:12}}>오늘의 행운 아이템</div>
          <div style={{display:'flex',gap:8}}>
            {[
              {ico:'🎨',lbl:'행운의 색',val:['레드','골드','핑크','블루','그린','퍼플'][ilju.branchIdx%6]},
              {ico:'🔢',lbl:'행운의 숫자',val:[3,7,8,1,5,2,9,4,6,0][ilju.stemIdx]},
              {ico:'🧭',lbl:'행운의 방향',val:['동','서','남','북','동남'][ilju.branchIdx%5]},
            ].map((x,i)=>(
              <div key={i} style={{flex:1,textAlign:'center',padding:'12px 4px',background:'rgba(255,255,255,0.5)',borderRadius:16,border:`1px solid ${t.border}`}}>
                <div style={{fontSize:18,marginBottom:4}}>{x.ico}</div>
                <div style={{color:t.textSub,fontSize:9,marginBottom:3}}>{x.lbl}</div>
                <div style={{color:a.hi,fontWeight:700,fontSize:13}}>{x.val}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// TAROT TAB
// ══════════════════════════════════════════════════════
function TarotTab({ userData, dispatch, theme }) {
  const { ilju, coins=100 } = userData;
  const a = ANIMALS[ilju.animal];
  const t = THEME_PALETTE[theme || _currentTheme] || THEME_PALETTE['벚꽃'];
  const [category, setCategory] = useState('전반');
  const [drawn, setDrawn] = useState(null);
  const [flipped, setFlipped] = useState(false);
  const [reading, setReading] = useState('');
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState('');

  const drawCard = () => {
    const card = TAROT[Math.floor(Math.random()*22)];
    const reversed = Math.random() > 0.6;
    setDrawn({...card, reversed}); setFlipped(false); setReading('');
  };

  const getReading = async () => {
    if (!drawn || loading) return;
    setLoading(true); setFlipped(true);
    const themePersona = THEME_PERSONA[theme||_currentTheme] || THEME_PERSONA['벚꽃'];
    try {
      const res = await fetch("/api/ai/chat",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          system: themePersona.llmSystemPrompt,
          messages:[{role:"user",content:`타로 카드 리딩을 해줘.
카드: ${drawn.name}(${drawn.reversed?'역방향':'정방향'})
카테고리: ${category}
${question?'질문: '+question:''}
당신의 페르소나(${themePersona.name}) 스타일로 4문장, 이모지 포함.`}],
          max_tokens:400,
        })
      });
      const d = await res.json();
      setReading(d.text || d.content || (Array.isArray(d.choices)&&d.choices[0]?.message?.content) || '오늘도 좋은 날이 될 거예요!');
    } catch {
      setReading(`${a.speech[0]} 이 카드는 주인님에게 특별한 메시지를 전하고 있어요. 오늘 하루 긍정적인 에너지로 가득 채워봐요!`);
    }
    setLoading(false);
  };

  return (
    <div style={{padding:'14px 16px 90px',display:'flex',flexDirection:'column',gap:16,alignItems:'center'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontFamily:"'Cinzel',serif",color:a.hi,fontSize:18,fontWeight:700,letterSpacing:2}}>운명의 타로</div>
        <p style={{color:t.textSub,fontSize:12,marginTop:4}}>카드 한 장이 오늘의 운명을 속삭여요</p>
      </div>
      {/* Category */}
      <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'center'}}>
        {TAROT_CATS.map(c=>(
          <button key={c} onClick={()=>setCategory(c)} className="btn" style={{
            padding:'6px 14px',borderRadius:20,fontSize:11,fontWeight:600,
            background:category===c?`linear-gradient(135deg,${a.c3},${a.c2})`:'rgba(255,255,255,0.62)',
            color:category===c?'white':t.textSub,
            border:category===c?'none':`1px solid ${t.border}`,
            boxShadow:category===c?`0 3px 12px ${t.shadow}`:'none',
          }}>{c}</button>
        ))}
      </div>
      {/* Card display */}
      {!drawn ? (
        <div style={{width:'100%',maxWidth:220,aspectRatio:'2/3',
          background:`linear-gradient(145deg,${a.soft},${a.c2}60)`,
          border:`2px solid ${a.c3}50`,borderRadius:24,
          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,
          boxShadow:`0 16px 48px ${t.shadow}`,
        }}>
          <div style={{fontSize:40,animation:'spinSlow 8s linear infinite',opacity:.7}}>{a.e}</div>
          <div style={{color:t.textSub,fontSize:11,letterSpacing:2}}>DRAW A CARD</div>
        </div>
      ) : (
        <div style={{
          width:'100%',maxWidth:220,aspectRatio:'2/3',
          background:flipped?`rgba(255,255,255,0.9)`:`linear-gradient(145deg,${a.soft},${a.c2}60)`,
          border:`2px solid ${flipped?drawn.color+'80':a.c3+'50'}`,borderRadius:24,
          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10,padding:'20px 16px',
          boxShadow:`0 16px 48px ${flipped?drawn.color+'30':t.shadow}`,
          animation:flipped?'cardFlipIn .5s ease':'none',
          transition:'all .3s ease',
        }}>
          {!flipped ? (
            <>
              <div style={{fontSize:36,animation:'pulse 2s ease-in-out infinite'}}>{a.e}</div>
              <div style={{color:t.textSub,fontSize:10,letterSpacing:2}}>TAP TO REVEAL</div>
            </>
          ) : (
            <>
              <div style={{color:t.textSub,fontSize:9,letterSpacing:2}}>{drawn.reversed?'역방향':'정방향'}</div>
              <div style={{fontSize:40,color:drawn.color,textShadow:`0 0 20px ${drawn.color}60`}}>{drawn.sym}</div>
              <div style={{color:t.text,fontSize:16,fontWeight:700,textAlign:'center',fontFamily:"'Cinzel',serif"}}>{drawn.name}</div>
              {loading ? (
                <div style={{color:t.textSub,fontSize:11,textAlign:'center',animation:'shimmer 1.3s ease infinite',lineHeight:1.6}}>
                  {a.e} 카드를 해석 중이에요...
                </div>
              ) : reading ? (
                <p style={{color:t.text,fontSize:12,textAlign:'center',lineHeight:1.7}}>{reading}</p>
              ) : null}
            </>
          )}
        </div>
      )}
      {/* Question input */}
      {!drawn && (
        <input type="text" value={question} onChange={e=>setQuestion(e.target.value)}
          placeholder="질문을 입력하세요 (선택사항)"
          style={{maxWidth:320,width:'100%'}}/>
      )}
      {/* Buttons */}
      <div style={{display:'flex',gap:10,width:'100%',maxWidth:320}}>
        <button className="btn" onClick={drawCard} style={{
          flex:1,padding:'14px',borderRadius:20,fontSize:14,fontWeight:700,
          background:`linear-gradient(135deg,${a.c3},${a.c2})`,color:'white',
          boxShadow:`0 6px 22px ${t.shadow}`,
        }}>🃏 {drawn?'다시 뽑기':'카드 뽑기'}</button>
        {drawn && !flipped && !loading && (
          <button className="btn" onClick={getReading} style={{
            flex:1,padding:'14px',borderRadius:20,fontSize:14,fontWeight:700,
            background:`rgba(255,255,255,0.82)`,color:t.text,
            border:`1.5px solid ${drawn.color}70`,
            boxShadow:`0 4px 14px ${t.shadow}`,
          }}>✨ 해석 보기</button>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// GACHA TAB
// ══════════════════════════════════════════════════════
function GachaTab({ userData, dispatch, theme }) {
  const { coins=100, collection=[], ilju } = userData;
  const a = ANIMALS[ilju.animal];
  const t = THEME_PALETTE[theme || _currentTheme] || THEME_PALETTE['벚꽃'];
  const [gachaState, setGachaState] = useState('idle'); // idle, shaking, cracking, result
  const [resultAnimal, setResultAnimal] = useState(null);
  const [resultRarity, setResultRarity] = useState('common');
  const [multiResults, setMultiResults] = useState(null);

  const getAnimalResult = (guaranteeIlju=false) => {
    if (guaranteeIlju && !collection.find(c=>c.key===ilju.animal)) return { key:ilju.animal, rarity:'rare' };
    const r = Math.random();
    const rarity = r < RARITIES.legendary.rate ? 'legendary' : r < RARITIES.legendary.rate+RARITIES.rare.rate ? 'rare' : 'common';
    const keys = Object.keys(ANIMALS);
    return { key:keys[Math.floor(Math.random()*keys.length)], rarity };
  };

  const doPull = async (count=1) => {
    const cost = count===1?10:90;
    if (coins < cost) return;
    setGachaState('shaking');
    dispatch({type:'UPDATE',payload:{coins:coins-cost}});
    setTimeout(()=>setGachaState('cracking'),800);
    setTimeout(()=>{
      if (count===1) {
        const r = getAnimalResult(collection.length===0);
        setResultAnimal(r.key); setResultRarity(r.rarity);
        setMultiResults(null);
        const newCol = [...collection];
        const existing = newCol.find(c=>c.key===r.key);
        if (existing) existing.count=(existing.count||1)+1;
        else newCol.push({...r,count:1});
        dispatch({type:'UPDATE',payload:{collection:newCol,exp:(userData.exp||0)+20}});
      } else {
        const results = Array.from({length:10},(_,i)=>getAnimalResult(i===0&&collection.length===0));
        setMultiResults(results); setResultAnimal(null);
        const newCol=[...collection];
        results.forEach(r=>{ const ex=newCol.find(c=>c.key===r.key); if(ex) ex.count=(ex.count||1)+1; else newCol.push({...r,count:1}); });
        dispatch({type:'UPDATE',payload:{collection:newCol,exp:(userData.exp||0)+200}});
      }
      setGachaState('result');
    },1600);
  };

  const RARITY_COLORS = {common:'#9e9e9e',rare:'#4a90e4',legendary:'#f0a020'};

  return (
    <div style={{padding:'14px 16px 90px',display:'flex',flexDirection:'column',gap:16,alignItems:'center'}}>
      {/* Header */}
      <div style={{textAlign:'center'}}>
        <div style={{fontFamily:"'Cinzel',serif",color:a.hi,fontSize:18,fontWeight:700,letterSpacing:2}}>운명의 가챠</div>
        <p style={{color:t.textSub,fontSize:12,marginTop:4}}>새로운 운명 정령을 소환해보세요</p>
      </div>
      {/* Coins display */}
      <div style={{
        background:`rgba(255,220,80,0.18)`,border:'1.5px solid rgba(240,180,40,0.4)',
        borderRadius:30,padding:'8px 22px',display:'flex',alignItems:'center',gap:8,
        boxShadow:'0 3px 14px rgba(220,160,30,0.12)',
      }}>
        <span style={{fontSize:20,animation:'coinSpin 2s linear infinite'}}>🪙</span>
        <span style={{color:'#c88000',fontWeight:800,fontSize:18}}>{coins}</span>
        <span style={{color:t.textSub,fontSize:12}}>코인</span>
      </div>
      {/* Gacha machine */}
      <div style={{width:200,height:200,position:'relative',display:'flex',alignItems:'center',justifyContent:'center'}}>
        {gachaState==='idle' && (
          <div style={{
            width:180,height:180,borderRadius:'50%',
            background:`radial-gradient(circle at 38% 30%,${a.soft},${a.c2}60)`,
            border:`2.5px solid ${a.c3}60`,
            display:'flex',alignItems:'center',justifyContent:'center',
            boxShadow:`0 0 50px ${t.shadow}`,fontSize:60,
          }}>🥚</div>
        )}
        {gachaState==='shaking' && (
          <div style={{
            width:180,height:180,borderRadius:'50%',
            background:`radial-gradient(circle at 38% 30%,${a.soft},${a.c2}60)`,
            border:`2.5px solid ${a.c3}60`,
            display:'flex',alignItems:'center',justifyContent:'center',
            boxShadow:`0 0 70px ${t.shadow}`,fontSize:60,
            animation:'gachaShake .2s ease-in-out infinite',
          }}>🥚</div>
        )}
        {gachaState==='cracking' && (
          <div style={{position:'relative',width:180,height:180,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{position:'absolute',fontSize:60}}>🥚</div>
            {['💥','✨','💫','⭐'].map((s,i)=>(
              <div key={i} style={{
                position:'absolute',fontSize:16,opacity:0,
                animation:`particleUp .8s ${i*.1}s ease-out forwards`,
                left:`${[30,60,20,70][i]}%`,top:`${[20,30,60,50][i]}%`,
              }}>{s}</div>
            ))}
          </div>
        )}
        {gachaState==='result' && resultAnimal && !multiResults && (
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,animation:'popIn .6s ease'}}>
            <EggSVG animalKey={resultAnimal} size={130} glow={true} theme={theme}/>
            <div style={{
              padding:'5px 16px',borderRadius:20,fontSize:11,fontWeight:700,
              background:`rgba(255,255,255,0.7)`,
              border:`1.5px solid ${RARITY_COLORS[resultRarity]}70`,
              color:RARITY_COLORS[resultRarity],
              boxShadow:`0 2px 10px ${t.shadow}`,
            }}>✨ {RARITIES[resultRarity].label} · {ANIMALS[resultAnimal].k} {ANIMALS[resultAnimal].e}</div>
            <div style={{color:t.textSub,fontSize:12,textAlign:'center',maxWidth:180}}>{ANIMALS[resultAnimal].hatched}</div>
          </div>
        )}
        {gachaState==='result' && multiResults && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:6,width:'100%',animation:'popIn .6s ease'}}>
            {multiResults.map((r,i)=>(
              <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,animation:`slideUp ${.1+i*.05}s ease`}}>
                <EggSVG animalKey={r.key} size={48} glow={false} theme={theme}/>
                <div style={{width:4,height:4,borderRadius:'50%',background:RARITY_COLORS[r.rarity]}}/>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Pull buttons */}
      {gachaState!=='result' ? (
        <div style={{display:'flex',gap:10,width:'100%',maxWidth:320}}>
          <button className="btn" onClick={()=>doPull(1)} disabled={coins<10||gachaState!=='idle'} style={{
            flex:1,padding:'14px',borderRadius:20,fontSize:14,fontWeight:700,
            background:`linear-gradient(135deg,${a.c3},${a.c2})`,color:'white',
            boxShadow:`0 6px 22px ${t.shadow}`,
          }}>🥚 1회 뽑기<br/><span style={{fontSize:11,fontWeight:400,opacity:.8}}>🪙 10</span></button>
          <button className="btn" onClick={()=>doPull(10)} disabled={coins<90||gachaState!=='idle'} style={{
            flex:1,padding:'14px',borderRadius:20,fontSize:14,fontWeight:700,
            background:`linear-gradient(135deg,#f0c020,#f8e060)`,color:'#7a4a00',
            boxShadow:`0 6px 22px rgba(240,180,30,0.3)`,
          }}>✨ 10회 뽑기<br/><span style={{fontSize:11,fontWeight:400,opacity:.7}}>🪙 90</span></button>
        </div>
      ) : (
        <button className="btn" onClick={()=>setGachaState('idle')} style={{
          padding:'14px 36px',borderRadius:20,fontSize:14,fontWeight:700,
          background:`linear-gradient(135deg,${a.c3},${a.c2})`,color:'white',
          boxShadow:`0 6px 22px ${t.shadow}`,
        }}>한번 더! ✨</button>
      )}
      {/* Rarity guide */}
      <div className="glass" style={{width:'100%',maxWidth:320,padding:'16px 18px'}}>
        <div style={{color:t.textSub,fontSize:10,fontWeight:700,letterSpacing:.5,marginBottom:12}}>확률 안내</div>
        <div style={{display:'flex',gap:8}}>
          {Object.entries(RARITIES).map(([k,v])=>(
            <div key={k} style={{flex:1,textAlign:'center',padding:'10px 4px',background:'rgba(255,255,255,0.5)',borderRadius:14,border:`1px solid ${t.border}`}}>
              <div style={{color:RARITY_COLORS[k],fontWeight:700,fontSize:13}}>{v.label}</div>
              <div style={{color:t.textSub,fontSize:10,marginTop:3}}>{Math.round(v.rate*100)}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// COLLECTION TAB
// ══════════════════════════════════════════════════════
function CollectionTab({ userData, theme }) {
  const { collection=[], ilju } = userData;
  const a = ANIMALS[ilju.animal];
  const t = THEME_PALETTE[theme || _currentTheme] || THEME_PALETTE['벚꽃'];
  const allKeys = Object.keys(ANIMALS);
  return (
    <div style={{padding:'14px 16px 90px'}}>
      <div style={{textAlign:'center',marginBottom:16}}>
        <div style={{fontFamily:"'Cinzel',serif",color:a.hi,fontSize:17,fontWeight:700,letterSpacing:1}}>운명 정령 도감</div>
        <p style={{color:t.textSub,fontSize:11,marginTop:4}}>{collection.length}/{allKeys.length} 수집 완료</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
        {allKeys.map(key=>{
          const owned = collection.find(c=>c.key===key);
          const animal = ANIMALS[key];
          return (
            <div key={key} style={{
              display:'flex',flexDirection:'column',alignItems:'center',gap:5,padding:'12px 6px',
              background:owned?'rgba(255,255,255,0.62)':'rgba(255,255,255,0.25)',
              border:owned?`1.5px solid ${animal.c3}60`:`1px solid ${t.border}`,
              borderRadius:18,opacity:owned?1:0.5,transition:'all .2s',
              boxShadow:owned?`0 4px 16px ${t.shadow}`:'none',
            }}>
              <div style={{filter:owned?'none':'grayscale(1)'}}>
                <EggSVG animalKey={key} size={56} anim={owned?'bob':'none'} glow={owned} theme={theme}/>
              </div>
              <div style={{color:owned?animal.hi:t.textSub,fontSize:10,fontWeight:700}}>{animal.k}</div>
              <div style={{color:owned?animal.c3:t.textSub,fontSize:9,opacity:.7}}>{animal.zh}</div>
              {owned && owned.count>1 && (
                <div style={{background:'rgba(255,255,255,0.7)',border:`1px solid ${animal.c3}50`,borderRadius:10,padding:'1px 7px',color:animal.hi,fontSize:9,fontWeight:700}}>×{owned.count}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// BOTTOM NAV
// ══════════════════════════════════════════════════════
function BottomNav({ tab, setTab, animalKey, theme }) {
  const a = ANIMALS[animalKey];
  const t = THEME_PALETTE[theme || _currentTheme] || THEME_PALETTE['벚꽃'];
  const tabs = [
    {id:'home',   ico:'🏠', lbl:'홈'},
    {id:'fortune',ico:'🔮', lbl:'운세'},
    {id:'tarot',  ico:'🃏', lbl:'타로'},
    {id:'gacha',  ico:'🥚', lbl:'가챠'},
    {id:'collect',ico:'📖', lbl:'도감'},
  ];
  return (
    <div style={{
      position:'fixed',bottom:0,left:0,right:0,maxWidth:430,margin:'0 auto',
      padding:'8px 6px 20px',
      background:t.navBg,
      backdropFilter:'blur(22px)',WebkitBackdropFilter:'blur(22px)',
      borderTop:`1px solid ${t.border}`,
      display:'flex',justifyContent:'space-around',zIndex:100,
    }}>
      {tabs.map(nt=>(
        <button key={nt.id} onClick={()=>setTab(nt.id)} style={{
          background:tab===nt.id?'rgba(255,255,255,0.7)':'transparent',
          border:tab===nt.id?`1.5px solid ${a.c3}50`:'1.5px solid transparent',
          cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:2,
          padding:'7px 14px',borderRadius:18,transition:'all .2s',
          boxShadow:tab===nt.id?`0 3px 12px ${t.shadow}`:'none',
        }}>
          <span style={{fontSize:18}}>{nt.ico}</span>
          <span style={{
            fontSize:9.5,fontFamily:'Noto Sans KR,sans-serif',
            color:tab===nt.id?a.hi:t.textSub,
            fontWeight:tab===nt.id?700:400,
            opacity:tab===nt.id?1:0.65,
          }}>{nt.lbl}</span>
        </button>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// HEADER
// ══════════════════════════════════════════════════════
function Header({ userData, animalKey, theme }) {
  const a = ANIMALS[animalKey];
  const t = THEME_PALETTE[theme || _currentTheme] || THEME_PALETTE['벚꽃'];
  const { name, coins=100 } = userData;
  return (
    <div style={{
      padding:'14px 18px 10px',
      display:'flex',alignItems:'center',justifyContent:'space-between',
      background:t.navBg,backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',
      borderBottom:`1px solid ${t.border}`,
      position:'sticky',top:0,zIndex:50,
    }}>
      <div>
        <div style={{color:t.textSub,fontSize:10,letterSpacing:.5}}>
          {new Date().toLocaleDateString('ko-KR',{month:'long',day:'numeric',weekday:'short'})}
        </div>
        <div style={{color:t.text,fontWeight:700,fontSize:16,marginTop:1}}>
          {a.e} {name}의 {a.k}
        </div>
      </div>
      <div style={{
        display:'flex',alignItems:'center',gap:5,
        background:'rgba(255,220,80,0.2)',border:'1px solid rgba(240,180,40,0.35)',
        borderRadius:20,padding:'5px 12px',
      }}>
        <span style={{fontSize:14}}>🪙</span>
        <span style={{color:'#d4900a',fontWeight:700,fontSize:14}}>{coins}</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen]     = useState('loading');
  const [tab, setTab]           = useState('home');
  const [userData, setUserData] = useState(null);
  const [charState, setCharState] = useState('idle');
  const [bubble, setBubble]     = useState('');
  const [showBubble, setShowBubble] = useState(false);

  useEffect(()=>{ init(); },[]);

  // PWA install prompt
  const [pwaPrompt, setPwaPrompt] = useState(null);
  const [showPwaBanner, setShowPwaBanner] = useState(false);

  useEffect(()=>{
    const handler = (e) => { e.preventDefault(); setPwaPrompt(e); setShowPwaBanner(true); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!pwaPrompt) return;
    pwaPrompt.prompt();
    const { outcome } = await pwaPrompt.userChoice;
    if (outcome === 'accepted') { setPwaPrompt(null); setShowPwaBanner(false); }
  };

  const init = async () => {
    const saved = await Store.get('destiny_egg_v1');
    if (saved) {
      if (!saved.theme && saved.ilju) {
        saved.theme = pickTheme(saved.ilju.stemIdx, saved.ilju.branchIdx, ANIMALS[saved.ilju.animal].el);
      }
      _currentTheme = saved.theme || '벚꽃';
      setUserData(saved);
      // Daily coin bonus
      const today = new Date().toISOString().split('T')[0];
      if (saved.lastLogin !== today) {
        const updated = {...saved, coins:(saved.coins||100)+10, lastLogin:today};
        setUserData(updated); await Store.set('destiny_egg_v1',updated);
        setBubble('오늘도 접속했어요! 코인 +10 🪙');
        setShowBubble(true); setTimeout(()=>setShowBubble(false),3000);
      }
      setScreen('main');
    } else setScreen('setup');
  };

  const dispatch = useCallback(async ({type,payload})=>{
    if (type==='UPDATE') {
      setUserData(prev=>{
        if (!prev) return prev;
        const next = {...prev,...payload};
        // Level up check
        const expToNext = [100,300,700,1500,9999][(next.level||0)];
        if ((next.exp||0) >= expToNext && (next.level||0) < 5) {
          next.level = (next.level||0)+1;
          next.exp = 0;
          setBubble(`레벨 업! Lv.${next.level+1} 🎉`);
          setShowBubble(true); setTimeout(()=>setShowBubble(false),3000);
        }
        Store.set('destiny_egg_v1', next);
        return next;
      });
    }
  },[]);

  const handleSetupComplete = async (data) => {
    const themeKey = pickTheme(data.ilju.stemIdx, data.ilju.branchIdx, ANIMALS[data.ilju.animal].el);
    _currentTheme = themeKey;
    const newUser = {
      ...data, theme:themeKey, coins:100, exp:0, level:0,
      intimacy:0, collection:[{key:data.ilju.animal,rarity:'rare',count:1}],
      lastLogin: new Date().toISOString().split('T')[0],
    };
    await Store.set('destiny_egg_v1', newUser);
    setUserData(newUser); setScreen('main');
    setTimeout(()=>{
      setBubble(ANIMALS[data.ilju.animal].hatched);
      setShowBubble(true); setTimeout(()=>setShowBubble(false),4000);
    },600);
  };

  const handleReset = async () => {
    if (!window.confirm('초기화할까요? 모든 데이터가 삭제돼요.')) return;
    await Store.set('destiny_egg_v1', null);
    setUserData(null); setScreen('setup');
  };

  if (screen==='loading') return (
    <div style={{minHeight:'100dvh',background:'linear-gradient(160deg,#fceef5,#f9d9e8)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{fontSize:48,animation:'bob 1.5s ease-in-out infinite'}}>🥚</div>
    </div>
  );

  if (screen==='setup') return (
    <>
      <style>{CSS}</style>
      <SetupScreen onComplete={handleSetupComplete}/>
    </>
  );

  if (!userData) return null;
  const { ilju, level=0 } = userData;
  const a = ANIMALS[ilju.animal];
  const isEgg = level < 1;
  const theme = userData.theme || pickTheme(ilju.stemIdx, ilju.branchIdx, a.el);
  _currentTheme = theme;
  const tp = THEME_PALETTE[theme] || THEME_PALETTE['벚꽃'];

  return (
    <>
      <style>{CSS}</style>
      {/* Animated background */}
      <div style={{position:'fixed',inset:0,background:tp.bg,zIndex:-2}}/>
      <div style={{position:'fixed',inset:0,background:`radial-gradient(ellipse at 50% 80%, ${a.c2}25 0%, transparent 65%)`,zIndex:-1,animation:'glowPulse 4s ease-in-out infinite'}}/>

      <div style={{maxWidth:430,margin:'0 auto',height:'100dvh',display:'flex',flexDirection:'column',position:'relative',overflow:'hidden'}}>
        <Header userData={userData} animalKey={ilju.animal} theme={theme}/>

        {/* Content */}
        <div style={{flex:1,overflowY:'auto',overflowX:'hidden'}}>
          {tab==='home' && (
            <HomeTab userData={userData} charState={charState} setCharState={setCharState}
              bubble={bubble} showBubble={showBubble} setShowBubble={setShowBubble}
              setBubble={setBubble} onTap={()=>{}} isEgg={isEgg} dispatch={dispatch} theme={theme}/>
          )}
          {tab==='fortune' && <FortuneTab userData={userData} theme={theme}/>}
          {tab==='tarot'   && <TarotTab userData={userData} dispatch={dispatch} theme={theme}/>}
          {tab==='gacha'   && <GachaTab userData={userData} dispatch={dispatch} theme={theme}/>}
          {tab==='collect' && <CollectionTab userData={userData} theme={theme}/>}
        </div>

        {/* Reset button (tiny) */}
        <div style={{position:'fixed',top:14,right:70,zIndex:60}}>
          <button onClick={handleReset} style={{
            background:'transparent',border:'none',cursor:'pointer',
            color:tp.textSub,fontSize:11,fontFamily:'Noto Sans KR',opacity:.5,
          }}>초기화</button>
        </div>

        {/* PWA Install Banner */}
        {showPwaBanner && pwaPrompt && (
          <div style={{
            position:'fixed',bottom:80,left:'50%',transform:'translateX(-50%)',
            width:'calc(100% - 32px)',maxWidth:398,
            background:`rgba(255,255,255,0.96)`,
            border:`1.5px solid ${tp.border}`,
            borderRadius:22,padding:'14px 18px',
            display:'flex',alignItems:'center',gap:12,
            boxShadow:`0 8px 36px ${tp.shadow}`,
            zIndex:90,animation:'slideUp .4s ease',
          }}>
            <span style={{fontSize:28}}>🥚</span>
            <div style={{flex:1}}>
              <div style={{color:tp.text,fontWeight:700,fontSize:13}}>홈 화면에 추가하기</div>
              <div style={{color:tp.textSub,fontSize:11,marginTop:2}}>앱처럼 설치해서 빠르게 접속해요!</div>
            </div>
            <button onClick={handleInstall} style={{
              background:`linear-gradient(135deg,${a.c3},${a.c2})`,
              border:'none',borderRadius:16,padding:'8px 16px',
              color:'white',fontSize:12,fontWeight:700,cursor:'pointer',
              boxShadow:`0 4px 14px ${tp.shadow}`,flexShrink:0,
            }}>설치 📲</button>
            <button onClick={()=>setShowPwaBanner(false)} style={{
              background:'transparent',border:'none',cursor:'pointer',
              color:tp.textSub,fontSize:18,padding:4,flexShrink:0,
            }}>✕</button>
          </div>
        )}

        <BottomNav tab={tab} setTab={setTab} animalKey={ilju.animal} theme={theme}/>
      </div>
    </>
  );
}
