import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";

const STORAGE_KEY = "destiny_tamagochi_v6";
const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY || "";
const HATCH_THRESHOLD = 60;
const EGG_TAP_COOLDOWN_MIN = 30;    // 탭 사이 최소 간격 (분)
const EGG_MAX_DAILY_TAPS = 5;       // 하루 최대 유효 탭 수
const FEED_COOLDOWN_MIN = 120;       // 밥주기 쿨다운 (분)
const PLAY_COOLDOWN_MIN = 60;        // 놀기 쿨다운 (분)
const PET_COOLDOWN_MIN = 15;         // 쓰다듬기 쿨다운 (분)
const NAP_COOLDOWN_MIN = 240;        // 낮잠 쿨다운 (분)

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
// 알 이미지: /fuctionassets/tadagochi-local/ (배경 제거 로컬 버전)
const THEMES = {
  blossom: {
    name: "벚꽃",    folder: "벚꽃 컨셉",
    sky: "#87CEEB",  grass: "#7BC67E", accent: "#E8A0BF",
    egg: "/fuctionassets/tadagochi-local/벚꽃 컨셉/벚꽃의 알.png",
  },
  macaron: {
    name: "마카롱",  folder: "마카롱 컨셉",
    sky: "#91D4FF",  grass: "#81C97B", accent: "#FFD700",
    egg: "/fuctionassets/tadagochi-local/마카롱 컨셉/마카롱 알.png",
  },
  strawberry: {
    name: "딸기",    folder: "딸기 컨셉",
    sky: "#A3D8FF",  grass: "#7BC67E", accent: "#FF8C42",
    egg: "/fuctionassets/tadagochi-local/딸기 컨셉/딸기 알-Photoroom.webp",
  },
  space: {
    name: "우주",    folder: "우주 테마",
    sky: "#0d1b3e",  grass: "#0a2a1a", accent: "#a078ff",
    egg: "/fuctionassets/tadagochi-local/우주 테마/우주 컨셉 알.png",
  },
  blackstar: {
    name: "검은별",  folder: "검은 별 컨셉",
    sky: "#1c1c2e",  grass: "#1a2a1e", accent: "#FF8C42",
    egg: "/fuctionassets/tadagochi-local/검은 별 컨셉/검은별 알-Photoroom.png",
  },
  moon: {
    name: "달",      folder: "달 컨셉",
    sky: "#1a1a4e",  grass: "#1e3a5a", accent: "#C0C0FF",
    egg: "/fuctionassets/tadagochi-local/달 컨셉/달 컨셉 알.png",
  },
  angel: {
    name: "천사",    folder: "천사 컨셉",
    sky: "#dff0ff",  grass: "#c8f0d8", accent: "#ffe4f0",
    egg: "/fuctionassets/tadagochi-local/천사 컨셉/천사 알-Photoroom.webp",
  },
};

const THEME_ALIASES = {
  "벚꽃": "blossom", "마카롱": "macaron", "딸기": "strawberry",
  "우주": "space",   "검은별": "blackstar", "달": "moon", "천사": "angel",
};

// ── 완전 스프라이트 시트 매핑 ─────────────────────────────────────────────────
// c=cols, r=rows, tag=시트 종류 (emotion|activity|food|art|activity2|activity3)
// emotion=6×3 감정시트 / activity=7×3 활동시트 / food=7×3 음식시트(쥐2) / art=7×3 예술시트(쥐3)
// 배경없는 로컬 이미지: /fuctionassets/tadagochi-local/{folder}/{f}
const SPRITE_SHEETS = {
  blossom: {
    rat:     [{ f:"벚꽃 컨셉 쥐.png",      c:6,r:3 }],
    ox:      [{ f:"벚꽃 컨셉 소.png",      c:6,r:3 }],
    tiger:   [{ f:"벚꽃 컨셉 호랑이.png",  c:6,r:3 }],
    rabbit:  [{ f:"벚꽃 컨셉 토끼.png",    c:6,r:3 }],
    dragon:  [{ f:"벚꽃 컨셉 용.png",      c:6,r:3 }],
    snake:   [{ f:"벚꽃 컨셉 뱀.png",      c:6,r:3 }],
    horse:   [{ f:"벚꽃 컨셉 말.png",      c:6,r:3 }],
    goat:    [{ f:"벚꽃 컨셉 양.png",      c:6,r:3 }],
    monkey:  [{ f:"벚꽃 컨셉 원숭이.png",  c:6,r:3 }],
    rooster: [{ f:"벚꽃 컨셉 닭.png",      c:6,r:3 }],
    dog:     [{ f:"벚꽃 컨셉 강아지.png",  c:6,r:3 }],
    pig:     [{ f:"벚꽃 컨셉 돼지.png",    c:6,r:3 }],
  },
  macaron: {
    rat:     [{ f:"마카롱 컨셉 쥐.png",     c:5,r:4 }],
    ox:      [{ f:"마카롱 컨셉 소.png",     c:5,r:4 }],
    tiger:   [{ f:"마카롱 컨셉 호랑이.png", c:5,r:4 }],
    rabbit:  [{ f:"마카롱 컨셉 토끼.png",   c:5,r:4 }],
    dragon:  [{ f:"마카롱 컨셉 용.png",     c:5,r:4 }],
    snake:   [{ f:"마카롱 컨셉 뱀.png",     c:5,r:4 }],
    horse:   [{ f:"마카롱 컨셉 말.png",     c:5,r:4 }],
    goat:    [{ f:"마카롱 컨셉 양.png",     c:5,r:4 }],
    monkey:  [{ f:"마카롱 컨셉 원숭이.png", c:5,r:4 }],
    rooster: [{ f:"마카롱 컨셉 닭.png",     c:5,r:4 }],
    dog:     [{ f:"마카롱 컨셉 강아지.png", c:5,r:4 }],
    pig:     [{ f:"마카롱 컨셉 돼지.png",   c:5,r:4 }],
  },
  strawberry: {
    rat:     [{ f:"딸기테마쥐-Photoroom.webp",         c:6,r:3 }],
    ox:      [{ f:"딸기테마소-Photoroom.webp",          c:6,r:3 }],
    tiger:   [{ f:"딸기테마 호랑이-Photoroom.webp",    c:6,r:3, tag:"emotion" },
              { f:"딸기테마 호랑이2-Photoroom.webp",   c:7,r:3, tag:"activity" }],
    rabbit:  [{ f:"딸기테마토끼-Photoroom.webp",       c:6,r:3 }],
    dragon:  [{ f:"딸기테마용-Photoroom.webp",          c:6,r:3 }],
    snake:   [{ f:"딸기테마뱀-Photoroom.webp",          c:6,r:3 }],
    horse:   [{ f:"딸기테마말-Photoroom.webp",          c:6,r:3 }],
    goat:    [{ f:"딸기테마양-Photoroom.webp",          c:6,r:3 }],
    monkey:  [{ f:"딸기테마원숭이-Photoroom.webp",     c:6,r:3 }],
    rooster: [{ f:"딸기테마닭-Photoroom.webp",          c:6,r:3 }],
    dog:     [{ f:"딸기테마개-Photoroom.webp",          c:6,r:3 }],
    pig:     [{ f:"딸기테마돼지-Photoroom.webp",        c:6,r:3 }],
  },
  space: {
    rat:     [{ f:"우주 테마 쥐.png",       c:6,r:3 }],
    ox:      [{ f:"우주 테마 소.png",       c:6,r:3 }],
    tiger:   [{ f:"우주 테마 호랑이.png",   c:6,r:3 }],
    rabbit:  [{ f:"우주 테마 토끼.png",     c:6,r:3 }],
    dragon:  [{ f:"우주 테마 용.png",       c:6,r:3 }],
    snake:   [{ f:"우주 테마 뱀.png",       c:6,r:3 }],
    horse:   [{ f:"우주 테마 말.png",       c:6,r:3 }],
    goat:    [{ f:"우주 테마 양.png",       c:6,r:3 }],
    monkey:  [{ f:"우주 테마 원숭이.png",   c:6,r:3 }],
    rooster: [{ f:"우주 테마 닭.png",       c:6,r:3 }],
    dog:     [{ f:"우주 테마 개.png",       c:6,r:3 }],
    pig:     [{ f:"우주 테마 돼지.png",     c:6,r:3 }],
  },
  blackstar: {
    // 쥐: 4 시트 (감정+음식+활동+활동2), 소/돼지/뱀: 2 시트, 강아지/말: 활동 1 시트
    rat:     [{ f:"별 컨셉 쥐1-Photoroom.webp", c:6,r:3, tag:"emotion"   },
              { f:"별 컨셉 쥐2-Photoroom.webp", c:7,r:3, tag:"food"      },
              { f:"별 컨셉 쥐3-Photoroom.webp", c:7,r:3, tag:"art"       },
              { f:"별 컨셉 쥐4-Photoroom.webp", c:7,r:3, tag:"activity2" }],
    ox:      [{ f:"별 컨셉 소-Photoroom.webp",   c:6,r:3, tag:"emotion"   },
              { f:"별 컨셉 소2-Photoroom.webp",  c:7,r:3, tag:"activity"  }],
    tiger:   [{ f:"별 컨셉 호랑이-Photoroom.webp", c:6,r:3 }],
    rabbit:  [{ f:"별 컨셉 토끼-Photoroom.webp",   c:6,r:3 }],
    dragon:  [{ f:"별 컨셉 용-Photoroom.webp",      c:6,r:3 }],
    snake:   [{ f:"별 컨셉 뱀-Photoroom.webp",     c:6,r:3, tag:"emotion"  },
              { f:"별 컨셉 뱀 2.webp",             c:7,r:3, tag:"activity" },
              { f:"별 컨셉 뱀-Photoroom (1).webp", c:6,r:3, tag:"variant"  }],
    horse:   [{ f:"별 컨셉 말2-Photoroom.webp",   c:7,r:3, tag:"activity" }],
    goat:    [{ f:"별 컨셉 양-Photoroom.webp",     c:6,r:3 }],
    monkey:  [{ f:"별 컨셉 원숭이-Photoroom.webp",  c:6,r:3 }],
    rooster: [{ f:"별 컨셉 닭-Photoroom.webp",      c:6,r:3 }],
    dog:     [{ f:"별 컨셉 강아지-Photoroom.webp",  c:7,r:3, tag:"activity" }],
    pig:     [{ f:"별 컨셉 돼지-Photoroom.webp",   c:6,r:3, tag:"emotion"  },
              { f:"별 컨셉 돼지2-Photoroom.webp",  c:7,r:3, tag:"activity" }],
  },
  moon: {
    // 달 테마 모든 동물: 7×3 활동 시트 (토끼 없음→쥐 폴백)
    rat:     [{ f:"달 컨셉 쥐-Photoroom.webp",      c:7,r:3, tag:"activity" }],
    ox:      [{ f:"달 컨셉 소-Photoroom.webp",       c:7,r:3, tag:"activity" }],
    tiger:   [{ f:"달 컨셉 호랑이-Photoroom.webp",  c:7,r:3, tag:"activity" }],
    rabbit:  [{ f:"달 컨셉 쥐-Photoroom.webp",      c:7,r:3, tag:"activity" }],
    dragon:  [{ f:"달 컨셉 용-Photoroom.webp",       c:7,r:3, tag:"activity" }],
    snake:   [{ f:"달 컨셉 뱀-Photoroom.webp",       c:7,r:3, tag:"activity" }],
    horse:   [{ f:"image-Photoroom (6).webp",         c:7,r:3, tag:"activity" }],
    goat:    [{ f:"image-Photoroom (7).webp",         c:7,r:3, tag:"activity" }],
    monkey:  [{ f:"image-Photoroom (8).webp",         c:7,r:3, tag:"activity" }],
    rooster: [{ f:"image-Photoroom (4).webp",         c:7,r:3, tag:"activity" }],
    dog:     [{ f:"image-Photoroom (3).webp",         c:7,r:3, tag:"activity" }],
    pig:     [{ f:"image-Photoroom (5).webp",         c:7,r:3, tag:"activity" }],
  },
  angel: {
    // 뱀: 4 시트 (감정+활동×3), 나머지: 6×3 감정 시트
    rat:     [{ f:"천사 컨셉 쥐.png",      c:6,r:3 }],
    ox:      [{ f:"천사 컨셉 소.png",      c:6,r:3 }],
    tiger:   [{ f:"천사 컨셉 호랑이.png",  c:6,r:3 }],
    rabbit:  [{ f:"천사 컨셉 토끼.png",    c:6,r:3 }],
    dragon:  [{ f:"천사 컨셉 용.png",      c:6,r:3 }],
    snake:   [{ f:"천사 컨셉 뱀.png",   c:6,r:3, tag:"emotion"    },
              { f:"천사 컨셉 뱀2.png",  c:7,r:3, tag:"activity"   },
              { f:"천사 컨셉 뱀3.png",  c:7,r:3, tag:"activity2"  },
              { f:"천사 컨셉 뱀4.png",  c:7,r:3, tag:"activity3"  }],
    horse:   [{ f:"천사 컨셉 말.png",      c:6,r:3 }],
    goat:    [{ f:"천사 컨셉 양.png",      c:6,r:3 }],
    monkey:  [{ f:"천사 컨셉 원숭이.png",  c:6,r:3 }],
    rooster: [{ f:"천사 컨셉 닭.png",      c:6,r:3 }],
    dog:     [{ f:"천사 컨셉 강아지.png",  c:6,r:3 }],
    pig:     [{ f:"천사 컨셉 돼지.png",    c:6,r:3 }],
  },
};

// ── 그리드 타입별 포즈 위치 테이블 ──────────────────────────────────────────
// 6×3 감정 시트 (우주테마 라벨 실측 기준)
// Row0: idle/walk/side_l/side_r/rear/rear_walk  Row1: happy/sad/surprised/shy/angry/curious
// Row2: jump/sleep/read/play/side_sit/special (우주테마 개 라벨 실측 확정)
const POSES_6x3 = {
  idle:[0,0], walk:[1,0], side_l:[2,0], side_r:[3,0], rear:[4,0], rear_walk:[5,0],
  happy:[0,1], sad:[1,1], surprised:[2,1], shy:[3,1], angry:[4,1], curious:[5,1],
  jump:[0,2], sleep:[1,2], read:[2,2], play:[3,2], side_sit:[4,2], special:[5,2],
};
// 7×3 활동 시트 (검은별 강아지, 달 전동물, 소2/돼지2/말2 등 공통)
// Row0: meditate/cook/knit/read_desk/guitar/drink/magnify
// Row1: jump_rope/flowers/laptop/sofa/board_game/umbrella/fishing
// Row2: bed_sleep/dance/trumpet/bicycle/bake/rest/special2
const POSES_7x3_ACT = {
  meditate:[0,0], cook:[1,0], knit:[2,0], read_desk:[3,0], guitar:[4,0], drink:[5,0], magnify:[6,0],
  jump_rope:[0,1], flowers:[1,1], laptop:[2,1], sofa:[3,1], board_game:[4,1], umbrella:[5,1], fishing:[6,1],
  bed_sleep:[0,2], dance:[1,2], trumpet:[2,2], bicycle:[3,2], bake:[4,2], rest:[5,2], special2:[6,2],
};
// 7×3 음식 시트 (검은별 쥐2)
const POSES_7x3_FOOD = {
  happy2:[0,0], surprised2:[1,0], cry:[2,0], shocked:[3,0], cheese:[4,0], milk:[5,0], wand:[6,0],
  love:[0,1], cupcake:[1,1], apple:[2,1], donut:[3,1], angry2:[4,1], sweat:[5,1], pizza:[6,1],
  love_jump:[0,2], strawberry:[1,2], zzz:[2,2], zzz_curl:[3,2], book:[4,2], balloon:[5,2], cosmic:[6,2],
};
// 5×4 마카롱 시트
const POSES_5x4 = {
  idle:[0,0], happy:[1,0], shy:[2,0], surprised:[3,0], curious:[4,0],
  love:[0,1], sad:[1,1], play:[2,1], angry:[3,1], walk:[4,1],
  sleep:[0,2], eat:[1,2], jump:[2,2], special:[3,2], read2:[4,2],
  sleep2:[0,3], sleep3:[1,3], read:[2,3], wave:[3,3], star:[4,3],
};

// ── 액션 애니메이션 시퀀스 ──────────────────────────────────────────────────
// 각 프레임: { tag: 시트 태그, pose: 포즈명, ms: 지속시간(ms) }
// tag가 없으면 emotion 또는 첫 번째 시트로 폴백
const ACTION_SEQS = {
  idle: [
    { tag:"emotion", pose:"idle",      ms:1100 },
    { tag:"emotion", pose:"idle",      ms:1100 },
    { tag:"emotion", pose:"walk",      ms:420  },
    { tag:"emotion", pose:"side_l",    ms:380  },
    { tag:"emotion", pose:"side_r",    ms:380  },
    { tag:"emotion", pose:"idle",      ms:800  },
    { tag:"emotion", pose:"curious",   ms:600  },
    { tag:"emotion", pose:"idle",      ms:900  },
  ],
  // 돌봄 액션
  eating: [
    { tag:"food",    pose:"cupcake",   ms:650  },
    { tag:"food",    pose:"apple",     ms:650  },
    { tag:"food",    pose:"donut",     ms:650  },
    { tag:"food",    pose:"pizza",     ms:650  },
    { tag:"emotion", pose:"happy",     ms:750  },
    { tag:"emotion", pose:"idle",      ms:600  },
  ],
  playing: [
    { tag:"activity", pose:"jump_rope", ms:380 },
    { tag:"emotion",  pose:"jump",      ms:380 },
    { tag:"activity", pose:"dance",     ms:420 },
    { tag:"activity", pose:"board_game",ms:480 },
    { tag:"emotion",  pose:"happy",     ms:600 },
  ],
  sleeping: [
    { tag:"activity", pose:"bed_sleep", ms:1200 },
    { tag:"emotion",  pose:"sleep",     ms:1200 },
    { tag:"emotion",  pose:"side_sit", ms:1200 },
  ],
  petting: [
    { tag:"emotion", pose:"happy",     ms:380 },
    { tag:"emotion", pose:"shy",       ms:650 },
    { tag:"emotion", pose:"happy",     ms:380 },
    { tag:"emotion", pose:"special",   ms:700 },
  ],
  // 감정 반응
  happy: [
    { tag:"emotion", pose:"happy",     ms:320 },
    { tag:"emotion", pose:"jump",      ms:380 },
    { tag:"emotion", pose:"happy",     ms:320 },
    { tag:"emotion", pose:"special",   ms:650 },
    { tag:"emotion", pose:"happy",     ms:400 },
  ],
  sad: [
    { tag:"emotion", pose:"sad",       ms:900 },
    { tag:"emotion", pose:"idle",      ms:600 },
    { tag:"emotion", pose:"sad",       ms:900 },
  ],
  worried: [
    { tag:"emotion", pose:"shy",       ms:700 },
    { tag:"emotion", pose:"sad",       ms:700 },
    { tag:"emotion", pose:"curious",   ms:500 },
  ],
  surprised: [
    { tag:"emotion", pose:"surprised", ms:380 },
    { tag:"emotion", pose:"idle",      ms:480 },
    { tag:"emotion", pose:"surprised", ms:380 },
  ],
  // 주변 활동 (ambient) — 7×3 활동시트 있으면 우선, 없으면 감정 시트 폴백
  cook:       [{ tag:"activity", pose:"cook",       ms:900 },  { tag:"emotion",  pose:"happy",    ms:550 }, { tag:"activity", pose:"cook",      ms:900 }],
  meditate:   [{ tag:"activity", pose:"meditate",   ms:1800 }, { tag:"activity", pose:"meditate", ms:1800 }],
  read_desk:  [{ tag:"activity", pose:"read_desk",  ms:1400 }, { tag:"emotion",  pose:"curious",  ms:500 }, { tag:"activity", pose:"read_desk", ms:1400 }],
  guitar:     [{ tag:"activity", pose:"guitar",     ms:650 },  { tag:"activity", pose:"drink",    ms:480 }, { tag:"activity", pose:"guitar",    ms:650 }],
  fishing:    [{ tag:"activity", pose:"fishing",    ms:1300 }, { tag:"emotion",  pose:"curious",  ms:420 }, { tag:"activity", pose:"fishing",   ms:1300 }],
  dance:      [{ tag:"activity", pose:"dance",      ms:480 },  { tag:"emotion",  pose:"happy",    ms:380 }, { tag:"activity", pose:"dance",     ms:480 }],
  jump_rope:  [{ tag:"activity", pose:"jump_rope",  ms:380 },  { tag:"emotion",  pose:"jump",     ms:380 }, { tag:"activity", pose:"jump_rope", ms:380 }, { tag:"emotion", pose:"happy", ms:500 }],
  laptop:     [{ tag:"activity", pose:"laptop",     ms:1100 }, { tag:"emotion",  pose:"curious",  ms:420 }, { tag:"activity", pose:"laptop",    ms:1100 }],
  flowers:    [{ tag:"activity", pose:"flowers",    ms:1100 }, { tag:"emotion",  pose:"happy",    ms:480 }, { tag:"activity", pose:"flowers",   ms:1100 }],
  bicycle:    [{ tag:"activity", pose:"bicycle",    ms:550 },  { tag:"activity", pose:"bicycle",  ms:550 }, { tag:"emotion",  pose:"happy",     ms:500 }],
  knit:       [{ tag:"activity", pose:"knit",       ms:900 },  { tag:"activity", pose:"knit",     ms:900 }, { tag:"emotion",  pose:"happy",     ms:500 }],
  bake:       [{ tag:"activity", pose:"bake",       ms:900 },  { tag:"emotion",  pose:"happy",    ms:500 }, { tag:"activity", pose:"bake",      ms:900 }],
  // 추가 활동 (7×3 활동 시트 나머지 포즈 활용)
  sofa:       [{ tag:"activity", pose:"sofa",       ms:1400 }, { tag:"emotion",  pose:"idle",     ms:700  }, { tag:"activity", pose:"sofa",       ms:1400 }],
  umbrella:   [{ tag:"activity", pose:"umbrella",   ms:1200 }, { tag:"emotion",  pose:"curious",  ms:500  }, { tag:"activity", pose:"umbrella",   ms:1200 }],
  magnify:    [{ tag:"activity", pose:"magnify",    ms:900  }, { tag:"emotion",  pose:"surprised",ms:480  }, { tag:"activity", pose:"magnify",    ms:900  }],
  drink:      [{ tag:"activity", pose:"drink",      ms:700  }, { tag:"emotion",  pose:"happy",    ms:500  }, { tag:"activity", pose:"drink",      ms:700  }],
  rest:       [{ tag:"activity", pose:"rest",       ms:1500 }, { tag:"emotion",  pose:"side_sit", ms:900  }, { tag:"activity", pose:"rest",       ms:1500 }],
  trumpet:    [{ tag:"activity", pose:"trumpet",    ms:550  }, { tag:"activity", pose:"dance",    ms:450  }, { tag:"activity", pose:"trumpet",    ms:550  }, { tag:"emotion",  pose:"happy",    ms:500 }],
  board_game: [{ tag:"activity", pose:"board_game", ms:1100 }, { tag:"emotion",  pose:"curious",  ms:420  }, { tag:"activity", pose:"board_game", ms:1100 }],
  // 감정 시트만 사용하는 행동 (모든 동물 공통 지원)
  stretch:    [{ tag:"emotion", pose:"rear",        ms:600  }, { tag:"emotion",  pose:"side_sit", ms:700  }, { tag:"emotion",  pose:"idle",       ms:500  }, { tag:"emotion",  pose:"rear_walk", ms:400 }],
  explore:    [{ tag:"emotion", pose:"side_l",      ms:380  }, { tag:"emotion",  pose:"side_r",   ms:380  }, { tag:"emotion",  pose:"rear_walk",  ms:440  }, { tag:"emotion",  pose:"curious",   ms:600  }, { tag:"emotion",  pose:"idle",      ms:500 }],
  peek:       [{ tag:"emotion", pose:"rear",        ms:480  }, { tag:"emotion",  pose:"rear_walk",ms:420  }, { tag:"emotion",  pose:"side_r",     ms:380  }, { tag:"emotion",  pose:"surprised", ms:550  }, { tag:"emotion",  pose:"idle",      ms:600 }],
  nap:        [{ tag:"emotion", pose:"side_sit",    ms:900  }, { tag:"emotion",  pose:"sleep",    ms:1600 }, { tag:"emotion",  pose:"side_sit",   ms:900  }],
  celebrate:  [{ tag:"emotion", pose:"happy",       ms:320  }, { tag:"emotion",  pose:"jump",     ms:320  }, { tag:"emotion",  pose:"special",    ms:600  }, { tag:"emotion",  pose:"happy",     ms:320  }, { tag:"emotion",  pose:"jump",      ms:320 }],
  angry_idle: [{ tag:"emotion", pose:"angry",       ms:650  }, { tag:"emotion",  pose:"idle",     ms:500  }, { tag:"emotion",  pose:"angry",      ms:650  }],
};

// ── 액션별 CSS 애니메이션 클래스 ──────────────────────────────────────────────
const ACTION_CSS = {
  idle:"anim-float",      eating:"anim-wiggle",    playing:"anim-bounce",
  sleeping:"anim-sleep",  petting:"anim-bounce",   happy:"anim-bounce",
  sad:"anim-droop",       worried:"anim-shake",    surprised:"anim-pop",
  cook:"anim-wiggle",     meditate:"anim-float",   read_desk:"anim-float",
  guitar:"anim-dance",    fishing:"anim-float",    dance:"anim-dance",
  jump_rope:"anim-bounce",laptop:"anim-float",     flowers:"anim-float",
  bicycle:"anim-spin",    knit:"anim-float",       bake:"anim-wiggle",
  sofa:"anim-float",      umbrella:"anim-float",   magnify:"anim-wiggle",
  drink:"anim-bounce",    rest:"anim-sleep",       trumpet:"anim-dance",
  board_game:"anim-wiggle",stretch:"anim-float",   explore:"anim-float",
  peek:"anim-bounce",     nap:"anim-sleep",        celebrate:"anim-bounce",
  angry_idle:"anim-shake",
};

// ── 주변 활동 풀 및 표시 라벨 ────────────────────────────────────────────────
// 기본 공통 풀 (21종) — 스탯 상태에 따라 가중치 조정
const AMBIENT_ACTIVITIES = [
  "cook","read_desk","guitar","fishing","dance","jump_rope","laptop","flowers","meditate","bicycle","knit","bake",
  "sofa","umbrella","magnify","drink","rest","trumpet","board_game","stretch","explore",
];
// 에너지 높을 때 선호 행동
const AMBIENT_ACTIVE = ["dance","jump_rope","explore","celebrate","trumpet","bicycle","guitar","flowers"];
// 에너지 낮을 때 선호 행동
const AMBIENT_REST   = ["nap","rest","sofa","meditate","stretch","fishing","knit","read_desk"];
// 기분 좋을 때
const AMBIENT_HAPPY  = ["celebrate","dance","flowers","trumpet","jump_rope","cook","bake"];
// 기분 안 좋을 때
const AMBIENT_GLOOMY = ["nap","rest","stretch","meditate","magnify","umbrella"];
// 호기심 (배고플 때 음식 찾는 행동)
const AMBIENT_CURIOUS = ["magnify","explore","peek","laptop","read_desk","cook","umbrella"];

const ACTIVITY_LABELS = {
  cook:"요리 중 🍳",  read_desk:"독서 중 📚", guitar:"기타 연주 🎸",
  fishing:"낚시 중 🎣", dance:"춤추는 중 💃",  jump_rope:"줄넘기 중 🪢",
  laptop:"컴퓨터 중 💻", flowers:"꽃꽂이 중 🌸", meditate:"명상 중 🧘",
  bicycle:"자전거 중 🚲", knit:"뜨개질 중 🧶",  bake:"빵 굽는 중 🍞",
  sofa:"소파에서 쉬는 중 🛋", umbrella:"우산 쓰고 산책 ☂️", magnify:"탐구 중 🔍",
  drink:"음료 마시는 중 ☕", rest:"편히 쉬는 중 🤗", trumpet:"트럼펫 연주 🎺",
  board_game:"보드게임 중 🎲", stretch:"스트레칭 중 🙆", explore:"탐험 중 🗺️",
  peek:"두리번거리는 중 👀", nap:"낮잠 중 😴",    celebrate:"신나게 뛰는 중 🎉",
  angry_idle:"투덜거리는 중 😤",
};

// ── 포즈 좌표 조회 ────────────────────────────────────────────────────────────
function getPoseCoords(sheet, poseName) {
  const { c, r, tag } = sheet;
  let map;
  if      (c === 6 && r === 3)           map = POSES_6x3;
  else if (c === 7 && r === 3 && tag === "food") map = POSES_7x3_FOOD;
  else if (c === 7 && r === 3)           map = POSES_7x3_ACT;
  else if (c === 5 && r === 4)           map = POSES_5x4;
  else                                   map = POSES_6x3;
  return map[poseName] || [0, 0];
}

// ── 시트 배열 조회 (테마+동물 → url 포함 시트 배열) ──────────────────────────
function getAnimalSheets(themeKey, animalKey) {
  const safe   = normalizeThemeKey(themeKey, null) || "blossom";
  const folder = THEMES[safe]?.folder || "벚꽃 컨셉";
  const defs   = SPRITE_SHEETS[safe]?.[animalKey] || SPRITE_SHEETS.blossom?.[animalKey] || [];
  return defs.map(s => ({
    ...s,
    url: encodeURI(`/fuctionassets/tadagochi-local/${folder}/${s.f}`),
  }));
}

// ── 액션 시퀀스 빌드 ──────────────────────────────────────────────────────────
function buildActionSequence(sheets, action) {
  const specs = ACTION_SEQS[action] || ACTION_SEQS.idle;
  const result = [];
  for (const spec of specs) {
    let sheet = sheets.find(s => s.tag === spec.tag);
    if (!sheet) sheet = sheets.find(s => s.tag === "emotion") || sheets[0];
    if (!sheet) continue;
    const [col, row] = getPoseCoords(sheet, spec.pose);
    result.push({ sheet, col, row, ms: spec.ms || 800 });
  }
  return result.length ? result : [{ sheet: sheets[0] || { c:6,r:3,url:"" }, col:0, row:0, ms:1000 }];
}

// 地支(일주 지지) → 테마: 오행 성질 반영 ─────────────────────────────────
// 子亥(水)→달, 寅卯(木)→벚꽃, 午巳(火)→딸기/검은별, 丑未(土)→마카롱, 辰申(土金)→우주, 酉(金)→천사, 戌(土)→검은별
const BRANCH_KEY_THEME = {
  rat:     "moon",        // 子 水 — 달빛·수면
  ox:      "macaron",     // 丑 土 — 대지·풍요
  tiger:   "blossom",    // 寅 木 — 봄·성장
  rabbit:  "blossom",    // 卯 木 — 벚꽃·감성
  dragon:  "space",      // 辰 土 — 신비·우주
  snake:   "blackstar",  // 巳 火 — 검은별·직관
  horse:   "strawberry", // 午 火 — 열정·여름
  goat:    "macaron",    // 未 土 — 온화·마카롱
  monkey:  "space",      // 申 金 — 은하·기민
  rooster: "angel",      // 酉 金 — 순수·천사
  dog:     "blackstar",  // 戌 土 — 충직·검은별
  pig:     "moon",       // 亥 水 — 달·꿈
};

// 가챠 풀 = 전 테마 알 (7종)
const GACHA_EGG_POOL = Object.values(THEMES).map(t => t.egg);

// legacy compat: getEggByAnimal에서 사용 (기존 저장 데이터 마이그레이션용)
const ANIMAL_EGG_MAP = Object.fromEntries(BRANCH_ANIMAL_KEYS.map(k => [k, GACHA_EGG_POOL]));

// ── 캔버스 기반 알 자동 커스터마이징 ─────────────────────────────────────────
// 베이스 테마 알 위에 ① 시주 색조 오버레이 ② 일주 인장 ③ 수호동물 이모지 합성
// → 같은 날 다른 시간 출생자도 색조가 달라져 60×12 = 720가지 고유 알 이미지 생성
async function generateBirthEgg(baseEggUrl, iljuStr, animalKey, hourBranchIdx) {
  if (typeof document === "undefined") return baseEggUrl; // SSR 방지
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      try {
        const S = 360;
        const cv = document.createElement("canvas");
        cv.width = S; cv.height = S;
        const ctx = cv.getContext("2d");
        // 1) 베이스 알 이미지 렌더
        ctx.drawImage(img, 0, 0, S, S);
        // 2) 시주(hour) 색조 그라데이션 오버레이 — 0°~330° 12단계
        const hue = Math.max(0, hourBranchIdx) * 30;
        const g = ctx.createRadialGradient(S/2, S*.44, S*.06, S/2, S*.44, S*.44);
        g.addColorStop(0, `hsla(${hue},75%,70%,0.28)`);
        g.addColorStop(1, `hsla(${hue},55%,50%,0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(S/2, S*.44, S*.41, S*.43, 0, 0, Math.PI*2);
        ctx.fill();
        // 3) 일주 인장 (중앙 하단) — 두 글자 한자
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.font = `bold ${Math.round(S*.13)}px 'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif`;
        ctx.shadowColor = "rgba(255,255,255,0.9)"; ctx.shadowBlur = 10;
        ctx.fillStyle = `hsl(${hue},55%,22%)`;
        ctx.fillText(iljuStr, S*.5, S*.73);
        ctx.shadowBlur = 0;
        // 4) 수호동물 이모지 뱃지 (우상단)
        ctx.font = `${Math.round(S*.108)}px serif`;
        ctx.shadowColor = "rgba(255,255,255,0.9)"; ctx.shadowBlur = 7;
        ctx.fillText(ANIMALS[animalKey]?.emoji || "🐣", S*.78, S*.22);
        resolve(cv.toDataURL("image/png"));
      } catch { resolve(baseEggUrl); }
    };
    img.onerror = () => resolve(baseEggUrl);
    img.src = baseEggUrl;
  });
}

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

// 일주 지지 인덱스 → 오행 기반 테마 결정 (si 천간 인덱스는 동점 시 타이브레이킹)
function pickTheme(_si, bi) {
  return BRANCH_KEY_THEME[BRANCH_ANIMAL_KEYS[bi % 12]] || "blossom";
}

function normalizeThemeKey(input, ilju) {
  const raw = String(input || "").trim();
  if (THEMES[raw]) return raw;
  if (THEME_ALIASES[raw]) return THEME_ALIASES[raw];
  if (ilju?.stemIdx != null) return pickTheme(ilju.stemIdx, ilju.branchIdx);
  return "blossom";
}

// 일주 동물에 매칭되는 테마 알을 반환 (seed 인자 유지 — 구버전 호출 호환)
function getEggByAnimal(animalKey) {
  const themeKey = BRANCH_KEY_THEME[animalKey] || "blossom";
  return THEMES[themeKey]?.egg || THEMES.blossom.egg;
}

function getCharImagePath(themeKey, animalKey) {
  const safeTheme = normalizeThemeKey(themeKey, null);
  const file = SHEET_FILES[safeTheme]?.[animalKey];
  if (!file) return "";
  const folder = THEMES[safeTheme]?.folder || "벚꽃 컨셉";
  return encodeURI(`/fuctionassets/tadagochi-local/${folder}/${file}`);
}

function migrateProfileShape(parsed) {
  if (!parsed || typeof parsed !== "object") return null;
  const ilju    = parsed.ilju || calcIlju(+(parsed?.birthInfo?.year||1990), +(parsed?.birthInfo?.month||1), +(parsed?.birthInfo?.day||1));
  const iljuInfo = parsed.iljuInfo || ILJU_MAP[ilju.ilju] || ILJU_MAP["갑자"];
  const theme    = normalizeThemeKey(parsed.theme, ilju);
  const affection = +(parsed.affection || 0);
  const matchedEgg = getEggByAnimal(iljuInfo.animalKey);
  const rawStats = parsed.stats && typeof parsed.stats === "object" ? parsed.stats : getDefaultStats();
  const stats = applyStatDecay(rawStats);
  return {
    ...parsed, ilju, iljuInfo, theme,
    petName: parsed.petName || `${iljuInfo.animal}이`,
    eggImage: parsed.eggImage || matchedEgg,
    affection,
    feedBest: +(parsed.feedBest || 0),
    playBest: +(parsed.playBest || 0),
    hatched: parsed.hatched === true || affection >= HATCH_THRESHOLD,
    ownedEggs: Array.isArray(parsed.ownedEggs) && parsed.ownedEggs.length
      ? parsed.ownedEggs
      : [parsed.eggImage || matchedEgg],
    activeEggImage: parsed.activeEggImage || parsed.eggImage || matchedEgg,
    llmDaily: parsed.llmDaily && typeof parsed.llmDaily === "object"
      ? parsed.llmDaily
      : { date: new Date().toISOString().slice(0,10), used: 0, limit: 3 },
    stats,
  };
}

function getTodayKey() { return new Date().toISOString().slice(0,10); }

function normalizeDailyQuota(raw) {
  const today = getTodayKey();
  if (!raw || raw.date !== today) return { date: today, used: 0, limit: 3 };
  return { date: today, used: +(raw.used||0), limit: 3 };
}

// ── 스탯 시스템 유틸 ─────────────────────────────────────────────────────────
function getDefaultStats() {
  return {
    hunger: 80, mood: 70, energy: 100,
    lastUpdate: Date.now(),
    feedCooldown: 0, playCooldown: 0, petCooldown: 0, napCooldown: 0,
    eggTapCooldown: 0, eggTapDate: getTodayKey(), eggTapsToday: 0,
  };
}

function applyStatDecay(stats) {
  if (!stats) return getDefaultStats();
  const now = Date.now();
  const hrsElapsed = Math.min((now - (stats.lastUpdate || now)) / 3600000, 24);
  if (hrsElapsed < 0.005) return stats;
  return {
    ...stats,
    hunger: Math.max(0, Math.round((stats.hunger ?? 80) - hrsElapsed * 10)),
    mood:   Math.max(0, Math.round((stats.mood   ?? 70) - hrsElapsed * 6)),
    energy: Math.max(0, Math.round((stats.energy ?? 100) - hrsElapsed * 5)),
    lastUpdate: now,
  };
}

function calcAfflictionPenalty(stats) {
  let penalty = 0;
  if ((stats?.hunger ?? 80) < 15) penalty += 5;
  else if ((stats?.hunger ?? 80) < 30) penalty += 2;
  if ((stats?.mood ?? 70) < 15) penalty += 3;
  else if ((stats?.mood ?? 70) < 30) penalty += 1;
  return penalty;
}

function cooldownRemainMin(tsMs) {
  const remain = tsMs - Date.now();
  return remain > 0 ? Math.ceil(remain / 60000) : 0;
}

function statColor(val) {
  if (val >= 60) return "#4caf50";
  if (val >= 30) return "#ff9800";
  return "#f44336";
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

// 감정 이모지
const MOOD_EMOJI = {
  idle:"😊", happy:"😄", excited:"🥳", dance:"💃",
  eating:"🍽", sleeping:"💤", sad:"😢", worried:"😟", surprised:"😲",
  cook:"🍳", read_desk:"📚", guitar:"🎸", fishing:"🎣", jump_rope:"🪢",
  laptop:"💻", flowers:"🌸", meditate:"🧘", bicycle:"🚲", knit:"🧶", bake:"🍞",
  sofa:"🛋", umbrella:"☂️", magnify:"🔍", drink:"☕", rest:"🤗",
  trumpet:"🎺", board_game:"🎲", stretch:"🙆", explore:"🗺️",
  peek:"👀", nap:"😴", celebrate:"🎉", angry_idle:"😤",
};

// ── 스탯 기반 주변 행동 선택 ──────────────────────────────────────────────────
// 배고픔/기분/에너지에 따라 어울리는 행동 풀을 가중치로 합산해 랜덤 선택
function pickAmbientAction(stats) {
  const hunger = stats?.hunger ?? 80;
  const mood   = stats?.mood   ?? 70;
  const energy = stats?.energy ?? 100;

  let pool = [...AMBIENT_ACTIVITIES];

  if (energy > 65) {
    // 에너지 충분 → 활동적 행동 가중치 증가
    pool.push(...AMBIENT_ACTIVE, ...AMBIENT_ACTIVE);
  } else if (energy < 35) {
    // 에너지 부족 → 휴식 행동 가중치 증가
    pool.push(...AMBIENT_REST, ...AMBIENT_REST);
  }

  if (mood > 65) {
    pool.push(...AMBIENT_HAPPY);
  } else if (mood < 35) {
    pool.push(...AMBIENT_GLOOMY);
    // 기분 매우 낮으면 투덜거리기도 가끔
    if (mood < 20) pool.push("angry_idle");
  }

  if (hunger < 35) {
    // 배고플 때 탐색/호기심 행동 선호
    pool.push(...AMBIENT_CURIOUS);
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

// 행동별 지속시간(ms) 반환 — 활동 성격에 따라 차별화
function getAmbientDuration(act) {
  if (["nap","rest","sofa","meditate","sleeping","sleeping"].includes(act))  return 8000 + Math.random() * 5000;
  if (["fishing","knit","read_desk","laptop","umbrella","board_game"].includes(act)) return 6000 + Math.random() * 4000;
  if (["dance","jump_rope","celebrate","trumpet","bicycle"].includes(act))   return 3000 + Math.random() * 2000;
  return 4000 + Math.random() * 3000;
}

// ── CharacterSprite: 다중 시트 + 프레임 애니메이션 (핵심 컴포넌트) ──────────
function CharacterSprite({ themeKey, animalKey, action = "idle", size = 240 }) {
  const safeTheme = normalizeThemeKey(themeKey, null);
  const sheets = useMemo(() => getAnimalSheets(safeTheme, animalKey), [safeTheme, animalKey]);
  const seq    = useMemo(() => buildActionSequence(sheets, action), [sheets, action]);

  const [fIdx, setFIdx] = useState(0);
  const timerRef = useRef(null);

  // 액션/캐릭터 변경 시 첫 프레임으로 리셋
  useEffect(() => { setFIdx(0); }, [action, safeTheme, animalKey]);

  // 프레임 타이머 — 현재 프레임 ms 후 다음 프레임으로
  useEffect(() => {
    if (!seq.length) return;
    const curr = seq[fIdx % seq.length];
    timerRef.current = setTimeout(() => setFIdx(i => (i + 1) % seq.length), curr.ms);
    return () => clearTimeout(timerRef.current);
  }, [fIdx, seq]);

  const animClass = ACTION_CSS[action] || "anim-float";

  if (!sheets.length) {
    return <div className={`sprite-fallback ${animClass}`} style={{ width: `min(${size}px,58vw)`, height: `min(${size}px,58vw)` }}>{ANIMALS[animalKey]?.emoji || "🐣"}</div>;
  }

  const frame = seq[fIdx % seq.length] || seq[0];
  const sh    = frame.sheet;
  const xPct  = sh.c <= 1 ? 0 : (frame.col / (sh.c - 1)) * 100;
  const yPct  = sh.r <= 1 ? 0 : (frame.row / (sh.r - 1)) * 100;

  return (
    <div
      className={`sprite-bg ${animClass}`}
      style={{
        width: `min(${size}px,58vw)`, height: `min(${size}px,58vw)`,
        backgroundImage: `url('${sh.url}')`,
        backgroundSize: `${sh.c * 100}% ${sh.r * 100}%`,
        backgroundPosition: `${xPct}% ${yPct}%`,
        backgroundRepeat: "no-repeat",
        flexShrink: 0,
      }}
      role="img"
      aria-label={ANIMALS[animalKey]?.ko || "character"}
    />
  );
}

// ── EggDisplay: 알 인터랙션 UI (부화 전) ─────────────────
function EggDisplay({ profile, isHatching, onTap, cooldownRemain, dailyTapsLeft }) {
  const [tapPulse, setTapPulse] = useState(false);
  const progress = Math.min(((profile.affection || 0) / HATCH_THRESHOLD) * 100, 100);
  const eggSrc   = profile.activeEggImage || profile.eggImage || THEMES.blossom.egg;
  const canTap   = cooldownRemain === 0 && dailyTapsLeft > 0 && !isHatching;

  function handleTap() {
    if (!canTap) return;
    onTap();
    setTapPulse(true);
    setTimeout(() => setTapPulse(false), 300);
  }

  return (
    <div className="egg-display">
      <div
        className={`egg-tap-wrap ${tapPulse ? "egg-tap-pulse" : ""} ${isHatching ? "egg-cracking" : ""} ${!canTap ? "egg-disabled" : ""}`}
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

        {!isHatching && canTap && <div className="tap-hint">👆 탭!</div>}
        {!isHatching && cooldownRemain > 0 && <div className="tap-hint cooldown-hint">⏱ {cooldownRemain}분 후</div>}
        {!isHatching && cooldownRemain === 0 && dailyTapsLeft <= 0 && <div className="tap-hint cooldown-hint">오늘 완료!</div>}
      </div>

      {/* 부화 진행 게이지 */}
      <div className="affection-track">
        <div className="affection-bar-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="egg-info-row">
        <span className="egg-affection-label">
          {isHatching ? "💥 부화 중...!" : `친밀도 ${profile.affection || 0} / ${HATCH_THRESHOLD}`}
        </span>
        <span className="egg-tap-badge">
          오늘 남은 탭: {dailyTapsLeft}/{EGG_MAX_DAILY_TAPS}
        </span>
      </div>
      <p className="egg-guide-text">
        {profile.affection < HATCH_THRESHOLD
          ? `하루 최대 ${EGG_MAX_DAILY_TAPS}번, 탭 간격 ${EGG_TAP_COOLDOWN_MIN}분 — 운세 보기·대화도 도움이 돼요`
          : "💥 부화 준비 완료!"}
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
  const [birth,   setBirth]   = useState({ dateStr: "", hourBranch: "" });
  const [petName, setPetName] = useState("");
  const [profile, setProfile] = useState(null);
  const [mood,    setMood]    = useState("normal");
  const [panel,   setPanel]   = useState("chat");
  const [bubble,  setBubble]  = useState("");
  const [spriteAction, setSpriteAction] = useState("idle");
  const [ambientAction, setAmbientAction] = useState("idle");
  const [pendingAction, setPendingAction] = useState(null);
  const ambientTimerRef = useRef(null);
  const pendingTimerRef = useRef(null);
  const statsRef        = useRef(null); // 최신 stats를 스케줄러에서 참조
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
  // 가챠 오버레이 단계: idle → spinning → cracking → reveal → done
  const [gachaPhase,   setGachaPhase]   = useState("idle");
  const [gachaRevealEgg, setGachaRevealEgg] = useState("");
  const [gachaIsNew,   setGachaIsNew]   = useState(false);
  const [generating,   setGenerating]   = useState(false); // 알 생성 중 로딩
  const shareRef = useRef(null);

  // ── 셋업 화면 실시간 예측 (날짜 입력 즉각 반영) ────────────────────────────
  const setupPreview = useMemo(() => {
    if (!birth.dateStr) return null;
    const parts = birth.dateStr.split("-").map(Number);
    const [py, pm, pd] = parts;
    if (!py || !pm || !pd) return null;
    const pIlju     = calcIlju(py, pm, pd);
    const pIljuInfo = ILJU_MAP[pIlju.ilju] || ILJU_MAP["갑자"];
    const pThemeKey = pickTheme(pIlju.stemIdx, pIlju.branchIdx);
    const pTheme    = THEMES[pThemeKey];
    const pEggSrc   = getEggByAnimal(pIljuInfo.animalKey);
    return { ilju: pIlju, iljuInfo: pIljuInfo, themeKey: pThemeKey, theme: pTheme, eggSrc: pEggSrc };
  }, [birth.dateStr]);

  // ── 저장 프로필 로드 + 사주 프로필 자동연동 ────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = migrateProfileShape(JSON.parse(raw));
        if (parsed) {
          setProfile(parsed);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          setPhase("main");
          if (parsed.hatched) {
            setBubble(`${parsed.petName}: 오늘도 반가워! ${ANIMALS[parsed.iljuInfo.animalKey].cry}`);
            setChatMessages([{ role: "pet", text: `${parsed.petName} 왔어! 오늘도 같이 운세 보자.` }]);
          } else {
            setBubble("알이 두근두근... 탭해서 친밀도를 높여봐! 🥚");
          }
          return;
        }
      }
      // 저장된 다마고치 없음 → fortune_auth_user에서 자동 생성 시도
      const authRaw = localStorage.getItem("fortune_auth_user");
      if (!authRaw) return;
      const user = JSON.parse(authRaw);
      if (!user.birthDate) return;
      const [y, m, d] = user.birthDate.split("-").map(Number);
      if (!y || !m || !d) return;
      // 시간 → 12지지 변환
      let hourBranch = "자";
      if (user.birthTime) {
        const hh = parseInt(user.birthTime.split(":")[0], 10);
        const found = HOUR_BRANCHES.find(hb =>
          hb.value === "자" ? (hh >= 23 || hh < 1) : (hh >= hb.hour && hh < hb.hour + 2)
        );
        if (found) hourBranch = found.value;
      }
      // birth 상태 자동 채움 (입력 폼 표시용)
      setBirth({ dateStr: user.birthDate, hourBranch });
      // 자동 다마고치 생성
      const ilju     = calcIlju(y, m, d);
      const iljuInfo = ILJU_MAP[ilju.ilju] || ILJU_MAP["갑자"];
      const theme    = pickTheme(ilju.stemIdx, ilju.branchIdx);
      const hourInfo = HOUR_BRANCHES.find(h => h.value === hourBranch) || HOUR_BRANCHES[0];
      const baseEgg  = getEggByAnimal(iljuInfo.animalKey);
      const autoName = user.name ? `${iljuInfo.animal}(${user.name})` : `${iljuInfo.animal}이`;
      const next = {
        birthInfo: { year: y, month: m, day: d, hourBranch: hourInfo.value,
          hourLabel: `${hourInfo.label} (${hourInfo.range}시)`, hour: hourInfo.hour },
        ilju, iljuInfo, theme,
        petName: autoName,
        eggImage: baseEgg, activeEggImage: baseEgg, ownedEggs: [baseEgg],
        affection: 0, feedBest: 0, playBest: 0, hatched: false,
        llmDaily: { date: getTodayKey(), used: 0, limit: 3 },
        stats: getDefaultStats(),
      };
      setProfile(next);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      setBubble("운명의 알이 나타났습니다! 탭해서 친밀도를 올려보세요 🥚");
      setPhase("hatching");
      setTimeout(() => {
        setPhase("main");
        setBubble("알이 두근두근... 탭해서 친밀도를 높여봐! 🥚");
        setChatMessages([{ role: "pet", text: "...(알 안에서 뭔가 움직이는 소리가 들린다)" }]);
      }, 2800);
      // 시주 색조 합성 알로 백그라운드 업그레이드
      const hIdx = HOUR_BRANCHES.findIndex(h => h.value === hourBranch);
      generateBirthEgg(baseEgg, ilju.ilju, iljuInfo.animalKey, hIdx).then(generatedEgg => {
        if (generatedEgg !== baseEgg) {
          const upgraded = { ...next, eggImage: generatedEgg, activeEggImage: generatedEgg, ownedEggs: [generatedEgg] };
          setProfile(upgraded);
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(upgraded)); } catch {}
        }
      }).catch(() => {});
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

  // ── statsRef 동기화 — 스케줄러가 최신 스탯을 참조할 수 있도록 ──────────
  useEffect(() => {
    statsRef.current = profile?.stats ?? null;
  }, [profile?.stats]);

  // ── 주변 활동(ambient) 타이머 — 스탯 기반 행동 선택, 10~25초 간격 ──────
  useEffect(() => {
    if (!profile?.hatched) return;
    const scheduleAmbient = () => {
      if (ambientTimerRef.current) clearTimeout(ambientTimerRef.current);
      ambientTimerRef.current = setTimeout(() => {
        const act = pickAmbientAction(statsRef.current);
        setAmbientAction(act);
        ambientTimerRef.current = setTimeout(() => {
          setAmbientAction("idle");
          scheduleAmbient();
        }, getAmbientDuration(act));
      }, 10000 + Math.random() * 15000);
    };
    scheduleAmbient();
    return () => { if (ambientTimerRef.current) clearTimeout(ambientTimerRef.current); };
  }, [profile?.hatched]);

  // ── 최종 spriteAction (pendingAction > 감정 > ambient) ─────────────────
  const finalSpriteAction = useMemo(() => {
    if (pendingAction) return pendingAction;
    if (mood === "sleepy") return "sleeping";
    if (mood === "happy")  return "happy";
    if (mood === "excited") return "happy";
    if (mood === "worried") return "worried";
    if (mood === "sleep")  return "sleeping";
    return ambientAction || "idle";
  }, [pendingAction, mood, ambientAction]);

  function triggerPendingAction(act, durationMs) {
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    setPendingAction(act);
    pendingTimerRef.current = setTimeout(() => setPendingAction(null), durationMs);
  }

  const themeKey    = normalizeThemeKey(profile?.theme, profile?.ilju);
  const currentTheme = THEMES[themeKey] || THEMES.blossom;

  function saveProfile(next) {
    setProfile(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }

  // ── 셋업 완료 ──────────────────────────────────────
  async function finishSetup() {
    const dateStr = birth.dateStr;
    if (!dateStr || !birth.hourBranch) return;
    const parts = dateStr.split("-").map(Number);
    const y = parts[0], m = parts[1], d = parts[2];
    if (!y || !m || !d) return;

    setGenerating(true);
    const ilju      = calcIlju(y, m, d);
    const iljuInfo  = ILJU_MAP[ilju.ilju] || ILJU_MAP["갑자"];
    const theme     = pickTheme(ilju.stemIdx, ilju.branchIdx);
    const hourInfo  = HOUR_BRANCHES.find(h => h.value === birth.hourBranch) || HOUR_BRANCHES[0];
    const baseEgg   = getEggByAnimal(iljuInfo.animalKey);
    const hIdx      = HOUR_BRANCHES.findIndex(h => h.value === birth.hourBranch);
    // 일주+시주 캔버스 합성 → 고유 알 이미지 생성
    const eggImg    = await generateBirthEgg(baseEgg, ilju.ilju, iljuInfo.animalKey, hIdx);
    setGenerating(false);

    const next = {
      birthInfo: { year: y, month: m, day: d, hourBranch: birth.hourBranch,
        hourLabel: `${hourInfo.label} (${hourInfo.range}시)`, hour: hourInfo.hour },
      ilju, iljuInfo, theme,
      petName: petName.trim() || `${iljuInfo.animal}이`,
      eggImage: eggImg, activeEggImage: eggImg, ownedEggs: [eggImg],
      affection: 0, feedBest: 0, playBest: 0, hatched: false,
      llmDaily: { date: getTodayKey(), used: 0, limit: 3 },
      stats: getDefaultStats(),
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

  // ── 알 탭 → 쿨다운/일일 제한 있는 친밀도 증가 ────────
  const handleEggTap = useCallback(() => {
    if (!profile || isHatching || profile.hatched) return;
    const now = Date.now();
    const stats = profile.stats || getDefaultStats();
    const today = getTodayKey();

    // 쿨다운 체크 (30분)
    const cdMs = (stats.eggTapCooldown || 0) + EGG_TAP_COOLDOWN_MIN * 60000;
    if (now < cdMs) {
      const mins = Math.ceil((cdMs - now) / 60000);
      setBubble(`🥚 ${mins}분 후에 다시 탭할 수 있어요!`);
      return;
    }
    // 일일 한도 체크
    const tapDate   = stats.eggTapDate || today;
    const tapsToday = tapDate === today ? (stats.eggTapsToday || 0) : 0;
    if (tapsToday >= EGG_MAX_DAILY_TAPS) {
      setBubble(`오늘은 ${EGG_MAX_DAILY_TAPS}번 모두 탭했어요. 내일 또 돌봐주세요 🌙`);
      return;
    }

    const newAff = (profile.affection || 0) + 1;
    const newStats = { ...stats, eggTapCooldown: now, eggTapDate: today, eggTapsToday: tapsToday + 1 };
    const next = { ...profile, affection: newAff, stats: newStats };
    saveProfile(next);

    const remain = EGG_MAX_DAILY_TAPS - (tapsToday + 1);
    if (newAff < HATCH_THRESHOLD) {
      const msgs = [
        `쿵쿵... 🥚 (오늘 남은 탭: ${remain})`,
        `따뜻하다~ 💖 (친밀도 ${newAff}/${HATCH_THRESHOLD})`,
        `조금만 더...! 오늘 남은 탭: ${remain}`,
        `꿈틀꿈틀! (${newAff}/${HATCH_THRESHOLD})`,
        remain > 0 ? `${remain}번 더 탭 가능!` : "오늘 탭 완료! 내일 또 봐요",
      ];
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

  // ── 스탯 시간 감소 타이머 (1분 주기) ──────────────────────────────────────
  useEffect(() => {
    if (!profile?.hatched) return;
    const t = setInterval(() => {
      setProfile(prev => {
        if (!prev?.hatched) return prev;
        const newStats = applyStatDecay(prev.stats || getDefaultStats());
        const penalty  = calcAfflictionPenalty(newStats);
        const newAff   = Math.max(HATCH_THRESHOLD, (prev.affection || 0) - (penalty > 0 ? 1 : 0));
        const next = { ...prev, affection: newAff, stats: newStats };
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
        return next;
      });
    }, 60000);
    return () => clearInterval(t);
  }, [profile?.hatched]);

  // ── 돌보기 핸들러들 ──────────────────────────────────────────────────────
  function handleFeed() {
    if (!profile?.hatched) return;
    const stats = profile.stats || getDefaultStats();
    const cdMin = cooldownRemainMin((stats.feedCooldown || 0) + FEED_COOLDOWN_MIN * 60000);
    if (cdMin > 0) { setBubble(`아직 안 배고파! ${cdMin}분 뒤에 줘~ 😊`); return; }
    if ((stats.hunger ?? 80) > 85) { setBubble("배 완전 불러! 나중에 줘~ 😄"); return; }
    const newStats = { ...stats, hunger: Math.min(100, (stats.hunger ?? 80) + 30), feedCooldown: Date.now() };
    const newAff   = Math.min(999, (profile.affection || 0) + 3);
    saveProfile({ ...profile, affection: newAff, stats: newStats });
    setMood("happy"); setPanel("care");
    triggerPendingAction("eating", 3000);
    setBubble(`${profile.petName}: 맛있다!! ${ANIMALS[profile.iljuInfo.animalKey].cry} (+3 친밀도)`);
    setTimeout(() => setMood("normal"), 2500);
  }

  function handlePlay() {
    if (!profile?.hatched) return;
    const stats = profile.stats || getDefaultStats();
    const cdMin = cooldownRemainMin((stats.playCooldown || 0) + PLAY_COOLDOWN_MIN * 60000);
    if (cdMin > 0) { setBubble(`잠깐 쉴게... ${cdMin}분 뒤에 놀자~`); return; }
    if ((stats.energy ?? 100) < 20) { setBubble("너무 피곤해! 먼저 재워줘 💤"); return; }
    const newStats = {
      ...stats,
      mood:   Math.min(100, (stats.mood   ?? 70 ) + 30),
      energy: Math.max(0,   (stats.energy ?? 100) - 15),
      playCooldown: Date.now(),
    };
    const newAff = Math.min(999, (profile.affection || 0) + 3);
    saveProfile({ ...profile, affection: newAff, stats: newStats });
    setMood("excited"); setPanel("play");
    triggerPendingAction("playing", 2500);
    setBubble(`${profile.petName}: 같이 놀자! 신나~! (+3 친밀도)`);
    setTimeout(() => setMood("normal"), 2500);
  }

  function handlePet() {
    if (!profile?.hatched) return;
    const stats = profile.stats || getDefaultStats();
    const cdMin = cooldownRemainMin((stats.petCooldown || 0) + PET_COOLDOWN_MIN * 60000);
    if (cdMin > 0) { setBubble(`간지러워! ${cdMin}분 뒤에 다시~`); return; }
    const newStats = { ...stats, mood: Math.min(100, (stats.mood ?? 70) + 15), petCooldown: Date.now() };
    const newAff   = Math.min(999, (profile.affection || 0) + 2);
    saveProfile({ ...profile, affection: newAff, stats: newStats });
    setMood("happy");
    triggerPendingAction("petting", 1800);
    setBubble(`${profile.petName}: 좋아~ ${ANIMALS[profile.iljuInfo.animalKey].cry} (+2 친밀도)`);
    setTimeout(() => setMood("normal"), 1800);
  }

  function handleNap() {
    if (!profile?.hatched) return;
    const stats = profile.stats || getDefaultStats();
    const cdMin = cooldownRemainMin((stats.napCooldown || 0) + NAP_COOLDOWN_MIN * 60000);
    if (cdMin > 0) { setBubble(`이미 잘 쉬었어! ${cdMin}분 뒤에~`); return; }
    if ((stats.energy ?? 100) > 75) { setBubble("별로 안 피곤해~ 좀 더 놀자!"); return; }
    const newStats = { ...stats, energy: Math.min(100, (stats.energy ?? 100) + 40), napCooldown: Date.now() };
    const newAff   = Math.min(999, (profile.affection || 0) + 2);
    saveProfile({ ...profile, affection: newAff, stats: newStats });
    setMood("sleep");
    triggerPendingAction("sleeping", 4000);
    setBubble(`${profile.petName}: 냠냠... 잘 잘게 💤 (+2 친밀도)`);
    setTimeout(() => setMood("normal"), 4000);
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
    if (!profile || gachaLoading || gachaPhase !== "idle") return;
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

      const pool    = GACHA_EGG_POOL;
      const owned   = Array.isArray(profile.ownedEggs) ? profile.ownedEggs : [];
      const unowned = pool.filter(x => !owned.includes(x));
      const src     = unowned.length ? unowned : pool;
      const nextEgg = src[Math.floor(Math.random() * src.length)];
      const isNew   = !owned.includes(nextEgg);
      const nextOwned = isNew ? [...owned, nextEgg] : owned;

      setGachaRevealEgg(nextEgg);
      setGachaIsNew(isNew);
      setGachaPhase("spinning");

      setTimeout(() => setGachaPhase("cracking"), 1600);
      setTimeout(() => {
        setGachaPhase("reveal");
        saveProfile({ ...profile, ownedEggs: nextOwned, activeEggImage: nextEgg, eggImage: nextEgg });
        bumpMood("excited", isNew ? `${profile.petName}: 새 알이다! 너무 귀여워 🥚` : `${profile.petName}: 보너스 획득! 🎁`, 2);
      }, 2700);
      setTimeout(() => setGachaPhase("done"), 3400);
    } catch { setCoinError("네트워크 오류로 가챠에 실패했어요."); }
    finally { setGachaLoading(false); }
  }

  function closeGacha() { setGachaPhase("idle"); setGachaRevealEgg(""); }

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

          <div className="step-card slide-in">
            <h3>수호동물 정보 입력</h3>
            <label style={{display:"block",marginBottom:"0.35rem",fontSize:"0.82rem",color:"#888"}}>생년월일 (생년월일시 한번에 입력)</label>
            <input
              type="date"
              value={birth.dateStr}
              onChange={e => setBirth(p => ({ ...p, dateStr: e.target.value }))}
              style={{width:"100%",marginBottom:"1.1rem",padding:"0.5rem 0.75rem",borderRadius:"0.6rem",border:"1px solid #ccc",fontSize:"1rem"}}
            />
            <label style={{display:"block",marginBottom:"0.35rem",fontSize:"0.82rem",color:"#888"}}>태어난 시간대 (12지지)</label>
            <div className="hour-grid">
              {HOUR_BRANCHES.map(h => (
                <button key={h.value} className={`hour-btn ${birth.hourBranch === h.value ? "on" : ""}`}
                  onClick={() => setBirth(p => ({ ...p, hourBranch: h.value }))}>
                  <strong>{h.icon} {h.label}</strong><small>{h.range}시</small>
                </button>
              ))}
            </div>

            {/* ── 실시간 운명 미리보기 ── */}
            {setupPreview && (
              <div className="setup-preview-card">
                <div className="setup-preview-left">
                  <img src={setupPreview.eggSrc} alt="예측 알" className="setup-preview-egg" />
                  <div className="setup-preview-theme-badge"
                    style={{ background: setupPreview.theme?.accent || "#c8a88c" }}>
                    {setupPreview.theme?.name} 테마
                  </div>
                </div>
                <div className="setup-preview-right">
                  <div className="setup-preview-row">
                    <span className="badge-ilju">{setupPreview.ilju.ilju}</span>
                    <span className="setup-preview-animal">
                      {ANIMALS[setupPreview.iljuInfo.animalKey]?.emoji} {setupPreview.iljuInfo.animal}
                    </span>
                  </div>
                  <div className="setup-preview-element">
                    🌿 오행: {setupPreview.iljuInfo.element}
                  </div>
                  <div className="setup-preview-personality">
                    💡 {setupPreview.iljuInfo.personality} 성격
                  </div>
                  {birth.hourBranch && (() => {
                    const hIdx = HOUR_BRANCHES.findIndex(h => h.value === birth.hourBranch);
                    const hueBadges = ["🔵","🟢","🟡","🟠","🔴","🟣","⚫","⚪","🟤","💙","💚","💛"];
                    return (
                      <div className="setup-preview-hour">
                        {hueBadges[hIdx] || "⭐"} {birth.hourBranch}시 — 알에 색조 적용 예정
                      </div>
                    );
                  })()}
                  <div className="setup-preview-hint">✨ 생성 시 일주+시주로 색조가 합성됩니다</div>
                </div>
              </div>
            )}

            <label style={{display:"block",marginTop:"1rem",marginBottom:"0.35rem",fontSize:"0.82rem",color:"#888"}}>수호동물 이름 (선택)</label>
            <input
              value={petName}
              onChange={e => setPetName(e.target.value)}
              placeholder="예: 서연이"
              style={{width:"100%",marginBottom:"1.1rem",padding:"0.5rem 0.75rem",borderRadius:"0.6rem",border:"1px solid #ccc",fontSize:"1rem"}}
            />
            <button className="ac-btn" disabled={!birth.dateStr || !birth.hourBranch || generating} onClick={finishSetup}>
              {generating ? "✨ 알 생성 중..." : "운명의 알 생성 🥚"}
            </button>
          </div>
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

  // 알 상태 관련 계산값
  const eggStats      = profile.stats || getDefaultStats();
  const eggCdRemain   = !profile.hatched
    ? cooldownRemainMin((eggStats.eggTapCooldown || 0) + EGG_TAP_COOLDOWN_MIN * 60000) : 0;
  const eggTapsLeft   = !profile.hatched
    ? Math.max(0, EGG_MAX_DAILY_TAPS - (eggStats.eggTapDate === getTodayKey() ? eggStats.eggTapsToday || 0 : 0)) : 0;

  const feedCdMin = profile.hatched ? cooldownRemainMin((eggStats.feedCooldown || 0) + FEED_COOLDOWN_MIN * 60000) : 0;
  const playCdMin = profile.hatched ? cooldownRemainMin((eggStats.playCooldown || 0) + PLAY_COOLDOWN_MIN * 60000) : 0;
  const petCdMin  = profile.hatched ? cooldownRemainMin((eggStats.petCooldown  || 0) + PET_COOLDOWN_MIN  * 60000) : 0;
  const napCdMin  = profile.hatched ? cooldownRemainMin((eggStats.napCooldown  || 0) + NAP_COOLDOWN_MIN  * 60000) : 0;

  const hunger = eggStats.hunger ?? 80;
  const mood2  = eggStats.mood   ?? 70;
  const energy = eggStats.energy ?? 100;

  return (
    <div className="app-shell">
      <style>{CSS}</style>
      <CloudBackground themeKey={themeKey} />

      {/* ══ 가챠 전체화면 오버레이 ══ */}
      {gachaPhase !== "idle" && (
        <div className="gacha-overlay" onClick={gachaPhase === "done" ? closeGacha : undefined}>
          <div className="gacha-bg-dim" />
          <div className="gacha-content">
            {gachaPhase === "spinning" && (
              <div className="gacha-spin-stage">
                <div className="gacha-spin-label">✨ 운명의 알 소환 중... ✨</div>
                <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",width:280,height:280}}>
                  <div className="gacha-ring" />
                  <div className="gacha-ring2" />
                  {gachaRevealEgg && <img src={gachaRevealEgg} className="gacha-egg-spin" alt="gacha egg" />}
                </div>
              </div>
            )}
            {gachaPhase === "cracking" && (
              <div className="gacha-crack-stage">
                <div className="gacha-spin-label">💥 균열이 생기고 있어...!</div>
                <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",width:280,height:280}}>
                  <div className="gacha-burst-lines">
                    {[...Array(8)].map((_,i) => <span key={i} />)}
                  </div>
                  {gachaRevealEgg && <img src={gachaRevealEgg} className="gacha-egg-crack" alt="cracking egg" />}
                </div>
              </div>
            )}
            {(gachaPhase === "reveal" || gachaPhase === "done") && (
              <div className="gacha-reveal-stage">
                <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",width:300,height:300}}>
                  <div className="gacha-sparkles">
                    {["⭐","✨","🌟","💫","⭐","✨","🌟","💫"].map((s,i) => <span key={i}>{s}</span>)}
                  </div>
                  {gachaRevealEgg && <img src={gachaRevealEgg} className="gacha-reveal-egg" alt="egg reveal" />}
                </div>
                {gachaIsNew
                  ? <div className="gacha-new-badge">NEW! ✨ 새 알 획득!</div>
                  : <div className="gacha-dup-badge">BONUS 🎁 코인 보너스!</div>
                }
                {gachaPhase === "done" && <div className="gacha-tap-hint">탭하면 닫혀요</div>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ 게임 프레임 ══ */}
      <div className={`game-frame${themeClass ? " "+themeClass : ""}`}>

        {/* ─ 상단 HUD ─ */}
        <header className="game-hud">
          <div className="hud-left">
            <span className="hud-name">{profile.petName}</span>
            <span className="hud-ilju">{profile.iljuInfo.ilju} · {profile.iljuInfo.element}</span>
          </div>
          <div className="hud-right">
            <span className="hud-aff">💖 {profile.affection}</span>
            <span className="hud-badge">{
              profile.affection > 200 ? "👑 영혼의 짝" :
              profile.affection > 150 ? "💜 단짝" :
              profile.affection > 100 ? "🤝 친한 친구" :
              profile.affection > 60  ? "😊 친구" :
              profile.hatched         ? "🌱 막 부화" :
              `🥚 ${profile.affection}/${HATCH_THRESHOLD}`
            }</span>
          </div>
        </header>

        {/* ─ 게임 씬 ─ */}
        <div className="game-scene">

          {/* 스탯 스트립 */}
          {profile.hatched && (
            <div className="stat-strip">
              <div className="stat-row">
                <span className="stat-label">🍴</span>
                <div className="stat-track"><div className="stat-fill" style={{ width:`${hunger}%`, background:statColor(hunger) }} /></div>
                <span className="stat-val">{hunger}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">😊</span>
                <div className="stat-track"><div className="stat-fill" style={{ width:`${mood2}%`, background:statColor(mood2) }} /></div>
                <span className="stat-val">{mood2}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">⚡</span>
                <div className="stat-track"><div className="stat-fill" style={{ width:`${energy}%`, background:statColor(energy) }} /></div>
                <span className="stat-val">{energy}</span>
              </div>
            </div>
          )}

          {/* 캐릭터 스테이지 */}
          <div className="char-stage" onClick={profile.hatched ? () => handlePet() : undefined}>
            {profile.hatched ? (
              <>
                <CharacterSprite
                  themeKey={themeKey}
                  animalKey={profile.iljuInfo.animalKey}
                  action={finalSpriteAction}
                  size={290}
                />
                {ACTIVITY_LABELS[finalSpriteAction] && (
                  <div className="activity-label">
                    <span>{ACTIVITY_LABELS[finalSpriteAction]}</span>
                  </div>
                )}
                <div className="mood-badge">{MOOD_EMOJI[finalSpriteAction] || MOOD_EMOJI[mood] || "😊"}</div>
              </>
            ) : (
              <EggDisplay
                profile={profile}
                isHatching={isHatching}
                onTap={handleEggTap}
                cooldownRemain={eggCdRemain}
                dailyTapsLeft={eggTapsLeft}
              />
            )}
            {bubble && <div className="speech">{typedBubble}</div>}
          </div>

          {/* 케어 독 */}
          {profile.hatched && (
            <div className="care-dock">
              <button className={`care-btn ${feedCdMin>0?"care-cd":hunger<30?"care-urgent":""}`} onClick={handleFeed}>
                <span>🍎</span>{feedCdMin>0?`${feedCdMin}분`:"밥주기"}
              </button>
              <button className={`care-btn ${playCdMin>0?"care-cd":mood2<30?"care-urgent":""}`} onClick={handlePlay}>
                <span>🎮</span>{playCdMin>0?`${playCdMin}분`:"놀기"}
              </button>
              <button className={`care-btn ${petCdMin>0?"care-cd":""}`} onClick={handlePet}>
                <span>🤗</span>{petCdMin>0?`${petCdMin}분`:"쓰다듬"}
              </button>
              <button className={`care-btn ${napCdMin>0?"care-cd":energy<30?"care-urgent":""}`} onClick={handleNap}>
                <span>💤</span>{napCdMin>0?`${napCdMin}분`:"낮잠"}
              </button>
              <button className="care-btn" onClick={() => setPanel(p => p === "chat" ? null : "chat")}>
                <span>💬</span>운세
              </button>
            </div>
          )}

          {/* 패널 드로어 */}
          {panel && (
            <div className="game-panel">
              <button className="panel-close" onClick={() => setPanel(null)}>✕</button>

              {panel === "care" && (
                <div>
                  <h3>🐾 돌보기</h3>
                  {!profile.hatched ? (
                    <p className="egg-pre-chat">🥚 부화 후 돌보기를 이용할 수 있어요!</p>
                  ) : (
                    <>
                      <p style={{fontSize:"12px",opacity:".72",margin:"0 0 10px"}}>스탯이 낮아지면 친밀도가 감소해요!</p>
                      <div className="stat-bars" style={{marginBottom:"12px"}}>
                        <div className="stat-row"><span className="stat-label">🍴배고픔</span><div className="stat-track"><div className="stat-fill" style={{width:`${hunger}%`,background:statColor(hunger)}}/></div><span className="stat-val">{hunger}</span></div>
                        <div className="stat-row"><span className="stat-label">😊기분</span><div className="stat-track"><div className="stat-fill" style={{width:`${mood2}%`,background:statColor(mood2)}}/></div><span className="stat-val">{mood2}</span></div>
                        <div className="stat-row"><span className="stat-label">⚡에너지</span><div className="stat-track"><div className="stat-fill" style={{width:`${energy}%`,background:statColor(energy)}}/></div><span className="stat-val">{energy}</span></div>
                      </div>
                      <div className="care-grid">
                        <button className={`care-panel-btn ${feedCdMin>0?"care-cd":hunger<30?"care-urgent":""}`} onClick={handleFeed}>
                          <span>🍎</span><strong>밥주기</strong><small>{feedCdMin>0?`${feedCdMin}분 후`:"배고픔 +30 · 친밀도 +3"}</small>
                        </button>
                        <button className={`care-panel-btn ${playCdMin>0?"care-cd":mood2<30?"care-urgent":""}`} onClick={handlePlay}>
                          <span>🎮</span><strong>같이 놀기</strong><small>{playCdMin>0?`${playCdMin}분 후`:"기분 +30 · 친밀도 +3"}</small>
                        </button>
                        <button className={`care-panel-btn ${petCdMin>0?"care-cd":""}`} onClick={handlePet}>
                          <span>🤗</span><strong>쓰다듬기</strong><small>{petCdMin>0?`${petCdMin}분 후`:"기분 +15 · 친밀도 +2"}</small>
                        </button>
                        <button className={`care-panel-btn ${napCdMin>0?"care-cd":energy<30?"care-urgent":""}`} onClick={handleNap}>
                          <span>💤</span><strong>낮잠 재우기</strong><small>{napCdMin>0?`${napCdMin}분 후`:"에너지 +40 · 친밀도 +2"}</small>
                        </button>
                      </div>
                      <div className="care-guide">
                        <p>⚠️ 스탯 30 미만이면 친밀도가 서서히 줄어요!</p>
                        <p>🎯 60부화 → 100친구 → 150단짝 → 200영혼의 짝</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {panel === "play" && profile.hatched && (
                <div>
                  <h3>🎮 같이 놀기!</h3>
                  <ReactionGame onEnd={score => {
                    const bonus = Math.floor(score / 10);
                    const newAff = Math.min(999, (profile.affection || 0) + bonus);
                    saveProfile({ ...profile, affection: newAff });
                    setPanel(null);
                    setBubble(`${profile.petName}: 최고야! 미니게임 보너스 +${bonus} 친밀도!`);
                  }} />
                </div>
              )}

              {panel === "chat" && (
                <div>
                  <h3>💬 수호동물 운세 대화</h3>
                  {!profile.hatched && <p className="egg-pre-chat">🥚 부화 후 대화할 수 있어요!</p>}
                  <p className="quota">🔮 오늘 남은 대화: {Math.max(0, normalizeDailyQuota(profile.llmDaily).limit - normalizeDailyQuota(profile.llmDaily).used)} / 3</p>
                  <div className="chat-box">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`msg ${msg.role}`}>
                        <span>{msg.role === "pet" ? profile.petName : "나"}</span>
                        <p>{msg.text}</p>
                      </div>
                    ))}
                    {chatLoading && <div className="msg pet"><span>{profile.petName}</span><p>생각 중...</p></div>}
                  </div>
                  <div className="chat-input-row">
                    <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                      placeholder={profile.hatched ? "궁금한 운세를 질문해줘" : "부화 후 이용 가능"}
                      disabled={!profile.hatched} onKeyDown={e => e.key === "Enter" && sendChat()} />
                    <button onClick={sendChat} disabled={!profile.hatched}>보내기</button>
                  </div>
                  {fortuneResult && <p className="fortune-result">{fortuneResult}</p>}
                </div>
              )}

              {panel === "gacha" && (
                <div>
                  <div className="gacha-hero">
                    <div className="gacha-hero-title">🥚 운명의 알 가챠</div>
                    <div className="gacha-hero-balance">꽃돼지 코인: {coinBalance == null ? "—" : `${coinBalance}개`}</div>
                  </div>
                  <button className="gacha-pull-btn" disabled={gachaLoading || gachaPhase !== "idle"} onClick={drawEggGacha}>
                    {gachaLoading ? "✨ 소환 중..." : "🌟 알 소환 (50 코인)"}
                  </button>
                  <p className="gacha-cost-hint">★ 보유하지 않은 알이 나올 확률이 높아요</p>
                  {coinError && <p className="error-msg">{coinError}</p>}
                  <h4 className="egg-title">보유 알 컬렉션 ({(profile.ownedEggs||[]).length}/{GACHA_EGG_POOL.length})</h4>
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
                    <button className="ac-btn" onClick={downloadShareCard}>📷 이미지 저장</button>
                    <button className="ac-btn kakao" onClick={shareKakao}>💬 카카오 공유</button>
                  </div>
                </div>
              )}

              {panel === "profile" && (
                <div>
                  <h3>⚙️ 내 정보</h3>
                  <ul className="profile-list">
                    <li>📅 생년월일: {profile.birthInfo.year}-{String(profile.birthInfo.month).padStart(2,"0")}-{String(profile.birthInfo.day).padStart(2,"0")}</li>
                    <li>⏰ 시간: {profile.birthInfo.hourLabel}</li>
                    <li>🔮 일주: {profile.iljuInfo.ilju} ({profile.iljuInfo.animal})</li>
                    <li>🌿 오행: {profile.iljuInfo.element}</li>
                    <li>💡 성격: {profile.iljuInfo.personality}</li>
                    <li>🎨 테마: {currentTheme.name}</li>
                    <li>🥚 보유 알: {(profile.ownedEggs||[]).length}개</li>
                    <li>💖 호감도: {profile.affection} — {
                      profile.affection > 200 ? "👑 영혼의 짝" :
                      profile.affection > 150 ? "💜 단짝" :
                      profile.affection > 100 ? "🤝 친한 친구" :
                      profile.affection >= HATCH_THRESHOLD ? "😊 친구" : "🥚 아직 알"
                    }</li>
                    <li>🐣 상태: {profile.hatched ? "✅ 부화 완료" : `⏳ 미부화 (${profile.affection}/${HATCH_THRESHOLD})`}</li>
                    {profile.hatched && <li>📊 배고픔 {hunger} / 기분 {mood2} / 에너지 {energy}</li>}
                  </ul>
                  <button className="ac-btn danger" style={{width:"100%",marginTop:12}}
                    onClick={() => { localStorage.removeItem(STORAGE_KEY); location.reload(); }}>
                    🔄 처음부터 다시 시작
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─ 하단 게임 네비게이션 ─ */}
        <nav className="game-nav">
          <button className={panel === "chat" ? "active" : ""} onClick={() => setPanel(p => p === "chat" ? null : "chat")}>
            <span>💬</span>운세대화
          </button>
          <button className={panel === "care" ? "active" : ""} onClick={() => setPanel(p => p === "care" ? null : "care")}>
            <span>🐾</span>돌보기
          </button>
          <button className="gacha-nav-btn" onClick={drawEggGacha} disabled={gachaLoading || gachaPhase !== "idle"}>
            <span>🥚</span>알가챠
          </button>
          <button className={panel === "profile" ? "active" : ""} onClick={() => setPanel(p => p === "profile" ? null : "profile")}>
            <span>⚙️</span>내정보
          </button>
        </nav>

        {/* 공유 카드 (오프스크린) */}
        <div className="share-card" ref={shareRef}>
          <h4>Destiny Tamagotchi Passport</h4>
          <img src={profile.activeEggImage || profile.eggImage} alt="egg" className="share-egg" />
          {profile.hatched && (
            <div className="share-char">
              <CharacterSprite themeKey={themeKey} animalKey={profile.iljuInfo.animalKey} action="happy" size={120} />
            </div>
          )}
          <p>{profile.iljuInfo.ilju} {profile.iljuInfo.animal} · {profile.iljuInfo.element}</p>
          <p className="small">{fortuneResult || "오늘은 작은 행동 하나가 큰 흐름을 만든다."}</p>
          <strong>code-destiny.com</strong>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  CSS — Nintendo / Animal Crossing 완전 리스타일
// ══════════════════════════════════════════════════════
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Jua&family=Noto+Sans+KR:wght@400;500;700;900&display=swap');
:root { --cream:#F5F0E8; --ink:#2a1a0e; --ink2:#6a4a2e; --carrot:#FF7B2C; --star:#FFD700; --pink:#FF69A0; --panel-bg:rgba(255,250,242,0.97); }
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
html,body,#__next{margin:0;padding:0;width:100%;height:100%;font-family:'Noto Sans KR',sans-serif;color:var(--ink);}
/* ── App shell: 전체화면 게임 결계 ── */
.app-shell{position:fixed;inset:0;overflow:hidden;background:#1a0a05;}
/* ── 배경 ── */
.ac-bg{position:absolute;inset:0;z-index:0;}
.sky-layer{position:absolute;inset:0;background:linear-gradient(180deg,#87CEEB 0%,#d7f2ff 58%,#f5f5e8 100%);}
.ac-bg-moon .sky-layer{background:linear-gradient(180deg,#040418 0%,#0e0e2e 50%,#121830 100%);}
.ac-bg-space .sky-layer{background:linear-gradient(180deg,#010210 0%,#050d1e 45%,#081208 100%);}
.ac-bg-dark .sky-layer{background:linear-gradient(180deg,#040418 0%,#111122 50%,#0f180f 100%);}
.ac-bg-angel .sky-layer{background:linear-gradient(180deg,#d8eeff 0%,#e8f8ff 50%,#f0fff5 100%);}
.grass-layer{position:absolute;left:0;right:0;bottom:0;height:22vh;background:#6ab56a;border-top-left-radius:48px;border-top-right-radius:48px;box-shadow:inset 0 8px 24px rgba(255,255,255,.3);}
.ac-bg-moon .grass-layer{background:#122840;}
.ac-bg-space .grass-layer{background:#061408;border-top:2px solid #1a3d1a;}
.ac-bg-dark .grass-layer{background:#0a1209;}
.ac-bg-angel .grass-layer{background:linear-gradient(180deg,#a8f0c8,#80e8a0);box-shadow:inset 0 12px 32px rgba(200,255,220,.5);}
/* ── 구름 ── */
.cloud{position:absolute;background:rgba(255,255,255,0.92);border-radius:999px;filter:drop-shadow(0 8px 12px rgba(0,0,0,.07));}
.cloud:before,.cloud:after{content:'';position:absolute;background:rgba(255,255,255,0.92);border-radius:999px;}
.cloud.c1{width:146px;height:42px;top:12%;left:-24%;animation:cloudMove 38s linear infinite;}
.cloud.c1:before{width:68px;height:58px;left:18px;top:-22px;}.cloud.c1:after{width:72px;height:72px;right:16px;top:-30px;}
.cloud.c2{width:182px;height:50px;top:22%;left:-28%;animation:cloudMove 50s linear infinite;animation-delay:-12s;}
.cloud.c2:before{width:68px;height:68px;left:20px;top:-27px;}.cloud.c2:after{width:84px;height:84px;right:26px;top:-34px;}
.cloud.c3{width:130px;height:36px;top:33%;left:-18%;animation:cloudMove 33s linear infinite;animation-delay:-8s;}
.cloud.c3:before{width:48px;height:48px;left:12px;top:-16px;}.cloud.c3:after{width:58px;height:58px;right:14px;top:-24px;}
.ac-bg-angel .cloud{background:rgba(255,255,255,0.98);filter:drop-shadow(0 8px 28px rgba(200,220,255,.4));}
.ac-bg-angel .cloud:before,.ac-bg-angel .cloud:after{background:rgba(255,255,255,0.98);}
/* ── 우주/달/검은별 오브젝트 ── */
.moon-orb{position:absolute;width:88px;height:88px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fffbe8,#f0e090 60%,#c8a820);box-shadow:0 0 48px 24px rgba(240,224,80,.28);top:8%;right:12%;animation:moonGlow 4s ease-in-out infinite;}
.star{position:absolute;background:#fff;border-radius:50%;animation:starTwinkle 2.5s ease-in-out infinite;}
.star.s1{width:3px;height:3px;top:12%;left:18%;}.star.s2{width:4px;height:4px;top:18%;left:40%;animation-delay:.6s;}.star.s3{width:2px;height:2px;top:9%;left:60%;animation-delay:1.2s;}.star.s4{width:3px;height:3px;top:22%;left:75%;animation-delay:.3s;}.star.s5{width:5px;height:5px;top:6%;left:85%;animation-delay:.9s;}.star.s6{width:2px;height:2px;top:28%;left:30%;animation-delay:1.5s;}.star.s7{width:4px;height:4px;top:15%;left:55%;animation-delay:2s;}.star.s8{width:3px;height:3px;top:32%;left:88%;animation-delay:.4s;}.star.s9{width:2px;height:2px;top:5%;left:72%;animation-delay:1.8s;}
.ac-bg-space .star{background:#a8c8ff;}.ac-bg-dark .star{background:#ffd060;}
.space-planet{position:absolute;border-radius:50%;}
.space-planet.p1{width:52px;height:52px;top:7%;right:8%;background:radial-gradient(circle at 35% 30%,#8855ff,#4422aa);box-shadow:0 0 28px 12px rgba(136,85,255,.4);animation:moonGlow 6s ease-in-out infinite;}
.space-planet.p2{width:28px;height:28px;top:22%;right:18%;background:radial-gradient(circle at 40% 35%,#ff8844,#aa4422);box-shadow:0 0 18px 8px rgba(255,136,68,.35);animation:moonGlow 8s ease-in-out infinite reverse;}
.shooting-star{position:absolute;height:2px;border-radius:2px;background:linear-gradient(90deg,rgba(255,255,255,0),#ffd060,rgba(255,255,255,0));}
.shooting-star.ss1{width:80px;top:14%;left:-10%;animation:shootingStar 5s linear infinite;}.shooting-star.ss2{width:60px;top:26%;left:-8%;animation:shootingStar 7s linear infinite;animation-delay:2.5s;}
.angel-ray{position:absolute;top:0;left:50%;width:2px;border-radius:2px;background:linear-gradient(180deg,rgba(255,255,220,.9),transparent);transform-origin:top center;animation:angelRay 4s ease-in-out infinite;}
.angel-ray.r1{height:42vh;transform:translateX(-120px) rotate(-18deg);}.angel-ray.r2{height:50vh;transform:translateX(0px) rotate(0deg);animation-delay:1.3s;}.angel-ray.r3{height:46vh;transform:translateX(120px) rotate(18deg);animation-delay:2.6s;}
/* ══ 게임 프레임 (메인 레이아웃) ══ */
.game-frame{position:relative;z-index:1;height:100dvh;max-width:540px;margin:0 auto;display:flex;flex-direction:column;overflow:hidden;}
/* ─ 상단 HUD ─ */
.game-hud{flex-shrink:0;padding:10px 14px 8px;background:rgba(255,250,242,0.94);border-bottom:3px solid var(--ink);display:flex;justify-content:space-between;align-items:center;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);}
.hud-left{display:flex;flex-direction:column;gap:1px;}
.hud-name{font-family:'Jua',sans-serif;font-size:19px;color:var(--ink);line-height:1.1;}
.hud-ilju{font-size:11px;color:#8a6040;opacity:.9;}
.hud-right{display:flex;flex-direction:column;align-items:flex-end;gap:3px;}
.hud-aff{font-size:14px;font-weight:900;color:#e8505a;}
.hud-badge{font-family:'Jua',sans-serif;font-size:10px;padding:2px 10px;border:2.5px solid var(--ink);border-radius:14px;background:#ffe866;box-shadow:0 2px 0 var(--ink);color:var(--ink);}
.theme-dark .game-hud{background:rgba(10,10,22,0.94);border-color:#4455aa;color:#d8e8ff;}
.theme-dark .hud-name{color:#e0eeff;}.theme-dark .hud-ilju{color:#8899cc;}
.theme-dark .hud-aff{color:#ff9ab0;}
.theme-dark .hud-badge{background:#44336a;border-color:#7766cc;color:#d0c0ff;box-shadow:0 2px 0 #7766cc;}
.theme-angel .game-hud{background:rgba(240,248,255,0.96);border-color:#88b0ff;}
/* ─ 게임 씬 ─ */
.game-scene{flex:1;overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;padding:8px 12px 6px;gap:8px;scrollbar-width:none;}
.game-scene::-webkit-scrollbar{display:none;}
/* ─ 스탯 스트립 ─ */
.stat-strip{flex-shrink:0;display:flex;gap:6px;background:rgba(255,255,255,0.9);border:3px solid var(--ink);border-radius:16px;padding:7px 12px;box-shadow:0 4px 0 rgba(0,0,0,0.28);}
.stat-strip .stat-row{flex:1;display:flex;align-items:center;gap:4px;}
.stat-strip .stat-label{font-size:14px;flex-shrink:0;}
.stat-strip .stat-track{flex:1;height:10px;background:#ddd;border-radius:6px;overflow:hidden;border:1.5px solid rgba(0,0,0,0.18);}
.stat-strip .stat-fill{height:100%;border-radius:6px;transition:width .5s ease;}
.stat-strip .stat-val{width:22px;text-align:right;font-size:10px;font-weight:900;color:var(--ink);}
.theme-dark .stat-strip{background:rgba(10,10,26,0.9);border-color:#4455aa;}
.theme-dark .stat-strip .stat-track{background:#1e1e3e;border-color:#334;}
.theme-dark .stat-strip .stat-val{color:#c0d0ff;}
/* ─ 캐릭터 스테이지 ─ */
.char-stage{flex:1;min-height:50vw;max-height:58vh;position:relative;border:4px solid var(--ink);border-radius:28px;background:linear-gradient(180deg,rgba(255,255,255,0.42) 0%,rgba(255,255,255,0.12) 100%);box-shadow:0 8px 0 rgba(0,0,0,0.32),inset 0 2px 8px rgba(255,255,255,0.55);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;cursor:pointer;overflow:hidden;}
.char-stage::before{content:'';position:absolute;inset:0;border-radius:24px;background:linear-gradient(180deg,rgba(255,255,255,0.18) 0%,transparent 55%);pointer-events:none;}
.theme-dark .char-stage{background:linear-gradient(180deg,rgba(20,20,60,0.5) 0%,rgba(10,10,30,0.3) 100%);box-shadow:0 8px 0 rgba(0,0,0,0.55),inset 0 2px 8px rgba(100,100,255,0.12);border-color:#4466cc;}
.theme-angel .char-stage{background:linear-gradient(180deg,rgba(240,248,255,0.65) 0%,rgba(220,240,255,0.35) 100%);border-color:#88aaff;box-shadow:0 8px 0 rgba(100,150,255,0.32);}
/* ─ 스프라이트 ─ */
.sprite-bg{border-radius:8px;display:block;flex-shrink:0;filter:drop-shadow(0 12px 24px rgba(0,0,0,0.24));user-select:none;}
.sprite-fallback{display:grid;place-items:center;font-size:96px;border-radius:24px;background:radial-gradient(circle at 35% 30%,#fff7e8,#ffe6c5 60%,#ffd7a8 100%);border:3px dashed #c8a88a;}
/* ─ 활동 라벨 ─ */
.activity-label{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.68);border-radius:20px;padding:4px 16px;backdrop-filter:blur(6px);border:1.5px solid rgba(255,255,255,0.22);animation:slideIn .25s ease;}
.activity-label span{font-family:'Jua',sans-serif;font-size:12px;color:#fff;white-space:nowrap;}
/* ─ 무드 뱃지 ─ */
.mood-badge{position:absolute;top:10px;right:13px;font-size:24px;animation:motionPop 1.4s ease-in-out infinite;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.22));}
/* ─ 말풍선 ─ */
.speech{background:#fff;border:3px solid var(--ink);border-radius:22px;padding:10px 16px;max-width:min(88%,320px);line-height:1.55;box-shadow:0 6px 0 rgba(0,0,0,0.28),0 12px 20px rgba(0,0,0,0.1);text-align:center;font-size:14px;font-weight:600;position:relative;z-index:2;}
.theme-dark .speech{background:#1e1e3c;color:#d8e8ff;border-color:#5566cc;box-shadow:0 6px 0 #2233aa;}
/* ─ 케어 독 ─ */
.care-dock{flex-shrink:0;display:grid;grid-template-columns:repeat(5,1fr);gap:5px;}
.care-btn{border:3px solid var(--ink);border-radius:16px;padding:9px 2px 7px;font-family:'Jua',sans-serif;font-size:11px;cursor:pointer;background:#fff9ee;box-shadow:0 5px 0 var(--ink);display:flex;flex-direction:column;align-items:center;gap:2px;transition:transform .08s ease,box-shadow .08s ease;}
.care-btn span{font-size:20px;line-height:1.1;}
.care-btn:active{transform:translateY(4px);box-shadow:0 1px 0 var(--ink);}
.care-btn.care-cd{opacity:.5;background:#eee;box-shadow:0 5px 0 #aaa;border-color:#aaa;}
.care-btn.care-urgent{background:#ffe0e0;border-color:#cc3333;box-shadow:0 5px 0 #aa2222;animation:motionShake .5s ease-in-out 3;}
.theme-dark .care-btn{background:#1a1a3a;color:#c0d0ff;border-color:#5566cc;box-shadow:0 5px 0 #334488;}
.theme-dark .care-btn.care-cd{background:#141420;border-color:#334;box-shadow:0 5px 0 #222;}
/* ─ 패널 드로어 ─ */
.game-panel{border:4px solid var(--ink);border-radius:28px 28px 20px 20px;background:var(--panel-bg);box-shadow:0 -4px 0 rgba(0,0,0,0.2),0 12px 32px rgba(0,0,0,0.18);animation:panelSlideIn .3s cubic-bezier(.25,.46,.45,.94);padding:16px 14px 14px;position:relative;}
.game-panel h3{font-family:'Jua',sans-serif;font-size:18px;margin:0 0 12px;color:var(--ink);text-align:center;letter-spacing:.03em;}
.panel-close{position:absolute;top:12px;right:14px;width:34px;height:34px;border-radius:50%;border:3px solid var(--ink);background:#ffe0bf;box-shadow:0 3px 0 var(--ink);font-size:14px;font-weight:900;cursor:pointer;display:grid;place-items:center;transition:.08s ease;}
.panel-close:active{transform:translateY(2px);box-shadow:0 1px 0 var(--ink);}
.theme-dark .game-panel{background:rgba(12,12,28,0.97);border-color:#4455aa;color:#d8e8ff;}
.theme-dark .game-panel h3{color:#c0d8ff;}
.theme-dark .panel-close{background:#222244;border-color:#5566cc;color:#c0d0ff;box-shadow:0 3px 0 #334488;}
/* ─ 하단 게임 네비 ─ */
.game-nav{flex-shrink:0;display:grid;grid-template-columns:repeat(4,1fr);border-top:4px solid var(--ink);background:rgba(255,250,242,0.98);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);}
.game-nav button{border:none;background:transparent;padding:10px 4px 12px;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;font-family:'Jua',sans-serif;font-size:10px;color:#9a7860;border-right:2px solid rgba(0,0,0,0.07);transition:.1s ease;}
.game-nav button:last-child{border-right:none;}
.game-nav button span{font-size:22px;line-height:1;display:block;}
.game-nav button.active{background:#ffe8cc;color:var(--ink);}
.game-nav button.active span{transform:scale(1.18);display:inline-block;}
.game-nav button:active{background:rgba(255,140,66,0.2);}
.game-nav .gacha-nav-btn{background:linear-gradient(180deg,#ff9a3c,#ff6a0a)!important;color:#fff!important;border-top:4px solid var(--ink);margin-top:-4px;box-shadow:inset 0 -4px 0 rgba(0,0,0,0.3);}
.game-nav .gacha-nav-btn:disabled{opacity:.5;}
.game-nav .gacha-nav-btn span{filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));}
.theme-dark .game-nav{background:rgba(8,8,20,0.98);border-color:#4455aa;}
.theme-dark .game-nav button{color:#7888bb;border-right-color:rgba(255,255,255,0.07);}
.theme-dark .game-nav button.active{background:rgba(80,100,200,0.35);color:#c0d8ff;}
/* ─ 공통 버튼 ─ */
.ac-btn{border-radius:20px;border:3px solid var(--ink);background:#ffe0bf;color:var(--ink);font-family:'Jua',sans-serif;font-size:15px;padding:11px 20px;cursor:pointer;box-shadow:0 6px 0 var(--ink);transition:.1s ease;display:inline-block;}
.ac-btn:hover{transform:translateY(-2px);}
.ac-btn:active{transform:translateY(4px);box-shadow:0 2px 0 var(--ink);}
.ac-btn:disabled{opacity:.45;cursor:not-allowed;}
.ac-btn.danger{background:#ffb0b0;box-shadow:0 6px 0 #aa2222;border-color:#aa2222;color:#ffeaea;}
.ac-btn.kakao{background:#FEE500;box-shadow:0 6px 0 #c8b800;border-color:#a09000;}
/* ─ 셋업 화면 ─ */
.setup-stage{position:relative;z-index:1;max-width:540px;margin:0 auto;padding:20px 14px 100px;min-height:100dvh;display:flex;flex-direction:column;align-items:center;}
.setup-stage h1{margin:10px 0 4px;font-family:'Jua',sans-serif;font-size:28px;color:var(--ink);}
.setup-stage > p{margin:0 0 16px;opacity:.75;font-size:14px;}
.step-card{width:100%;background:rgba(255,250,242,0.97);border:4px solid var(--ink);border-radius:24px;box-shadow:0 8px 0 var(--ink),0 12px 28px rgba(0,0,0,.18);padding:18px 16px;transform:rotate(-.3deg);}
.step-card h3{margin:0 0 12px;font-family:'Jua',sans-serif;font-size:18px;}
.step-card input{width:100%;border:3px solid #b89070;border-radius:14px;padding:12px 14px;font-size:16px;background:#fff9f0;}
.slide-in{animation:slideIn .35s ease;}
.hour-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0 12px;}
.hour-btn{border:3px solid #b89070;border-radius:14px;padding:9px;background:#fff7e6;cursor:pointer;box-shadow:0 4px 0 #c09070;}
.hour-btn.on{border-color:var(--carrot);background:#ffe8d0;box-shadow:0 4px 0 #cc6020;transform:translateY(-2px);}
.hour-btn strong{display:block;font-size:13px;}.hour-btn small{display:block;font-size:10px;opacity:.7;margin-top:2px;}
/* ─ 알 등장 인트로 ─ */
.hatch-stage{position:relative;z-index:1;min-height:100dvh;display:grid;place-items:center;text-align:center;gap:20px;padding:20px;}
.egg-rise{animation:eggRise 1.2s ease forwards,eggWiggle 1s ease-in-out 1.2s infinite;}
.egg-img{width:min(52vw,280px);filter:drop-shadow(0 16px 24px rgba(0,0,0,.3));}
.intro-speech{background:rgba(255,255,255,0.94);border:3px solid var(--ink);border-radius:22px;padding:12px 20px;box-shadow:0 6px 0 var(--ink);font-size:16px;font-weight:700;}
/* ─ 알 인터랙션 ─ */
.egg-display{display:flex;flex-direction:column;align-items:center;gap:10px;width:100%;}
.egg-tap-wrap{position:relative;cursor:pointer;display:inline-block;user-select:none;}
.egg-main-img{width:min(50vw,230px);height:min(50vw,230px);object-fit:contain;filter:drop-shadow(0 14px 24px rgba(0,0,0,.24));animation:eggIdle 2.4s ease-in-out infinite;}
.egg-tap-wrap:active .egg-main-img{transform:scale(1.08);}
.egg-tap-pulse .egg-main-img{animation:eggTap .28s ease-out;}
.egg-cracking .egg-main-img{animation:eggCrack 0.18s ease-in-out infinite;}
.tap-hint{position:absolute;top:-26px;left:50%;transform:translateX(-50%);font-family:'Jua',sans-serif;font-size:13px;color:var(--carrot);background:rgba(255,255,255,0.96);border:2px solid var(--carrot);border-radius:12px;padding:3px 10px;pointer-events:none;box-shadow:0 3px 0 rgba(0,0,0,0.15);animation:tapHintBounce 1.1s ease-in-out infinite;}
.egg-disabled{opacity:.75;cursor:not-allowed;}
.cooldown-hint{color:#888!important;border-color:#aaa!important;background:rgba(240,240,240,.96)!important;}
.crack-overlay{position:absolute;inset:0;pointer-events:none;}
.crack{position:absolute;background:var(--ink);border-radius:2px;}
.crack.cr1{width:3px;height:40%;top:20%;left:45%;transform:rotate(15deg);animation:crackAppear .3s ease forwards;}
.crack.cr2{width:3px;height:35%;top:30%;left:52%;transform:rotate(-20deg);animation:crackAppear .3s ease .12s forwards;}
.crack.cr3{width:2px;height:28%;top:40%;left:40%;transform:rotate(8deg);animation:crackAppear .3s ease .24s forwards;}
.hatch-burst{position:absolute;inset:-30%;border-radius:50%;background:radial-gradient(circle,rgba(255,230,50,.9) 0%,rgba(255,180,20,.5) 40%,transparent 70%);animation:burstExpand 2.2s ease forwards;}
.affection-track{width:min(50vw,230px);height:14px;background:#f0e4d4;border:2.5px solid var(--ink);border-radius:10px;overflow:hidden;box-shadow:0 3px 0 var(--ink);}
.affection-bar-fill{height:100%;background:linear-gradient(90deg,#ff7b2c,#ffc82c);border-radius:8px;transition:width .3s ease;}
.egg-info-row{display:flex;justify-content:space-between;align-items:center;width:min(50vw,230px);margin-top:4px;}
.egg-affection-label{font-family:'Jua',sans-serif;font-size:11px;color:var(--ink2);}
.egg-tap-badge{font-size:10px;background:#e8f0ff;border:2px solid #8899cc;border-radius:8px;padding:2px 6px;font-weight:700;}
.egg-guide-text{font-size:10px;opacity:.62;text-align:center;max-width:260px;margin:2px 0 0;line-height:1.5;}
.egg-pre-chat{font-size:12px;background:#fff9e8;border:2px solid #f0d89a;border-radius:12px;padding:8px 12px;color:#7a5a1e;}
/* ─ 스탯 바 (패널 내부) ─ */
.stat-bars{display:flex;flex-direction:column;gap:6px;margin-bottom:10px;background:rgba(255,255,255,.85);border:3px solid var(--ink);border-radius:16px;padding:10px 12px;box-shadow:0 4px 0 var(--ink);}
.stat-row{display:flex;align-items:center;gap:8px;}
.stat-label{width:4.4rem;font-size:11px;font-weight:700;flex-shrink:0;}
.stat-track{flex:1;height:12px;background:#e8ddd0;border-radius:8px;overflow:hidden;border:1.5px solid rgba(0,0,0,0.15);}
.stat-fill{height:100%;border-radius:8px;transition:width .5s ease;}
.stat-val{width:2.4rem;text-align:right;font-size:11px;font-weight:800;}
.theme-dark .stat-bars{background:rgba(12,12,26,.85);border-color:#4455aa;}
.theme-dark .stat-track{background:#1e1e3a;}
/* ─ 돌보기 패널 ─ */
.care-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:10px;}
.care-panel-btn{border:3px solid var(--ink);border-radius:18px;padding:14px 8px;background:#fffaf2;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:5px;box-shadow:0 5px 0 var(--ink);transition:.1s ease;}
.care-panel-btn span{font-size:32px;}
.care-panel-btn strong{font-family:'Jua',sans-serif;font-size:14px;color:var(--ink);}
.care-panel-btn small{font-size:10px;opacity:.72;text-align:center;}
.care-panel-btn:active{transform:translateY(4px);box-shadow:0 1px 0 var(--ink);}
.care-panel-btn.care-cd{opacity:.5;background:#f0f0f0;box-shadow:0 5px 0 #999;border-color:#999;}
.care-panel-btn.care-urgent{background:#ffe0e0;border-color:#cc3333;box-shadow:0 5px 0 #aa2222;}
.care-guide{background:#fffaee;border:2.5px solid #f0cc80;border-radius:14px;padding:10px 12px;}
.care-guide p{margin:4px 0;font-size:11px;opacity:.85;}
.theme-dark .care-panel-btn{background:#18183a;border-color:#4455aa;color:#d0e0ff;box-shadow:0 5px 0 #2233aa;}
/* ─ 채팅 패널 ─ */
.chat-box{max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding-right:2px;scrollbar-width:thin;}
.msg{max-width:88%;border-radius:16px;padding:9px 12px;font-size:13px;}
.msg span{display:block;font-size:10px;opacity:.65;margin-bottom:3px;font-weight:700;}
.msg p{margin:0;line-height:1.55;}
.msg.pet{background:#fffaee;border:2.5px solid #e0c898;box-shadow:0 3px 0 rgba(0,0,0,0.1);}
.msg.me{align-self:flex-end;background:#e0f0ff;border:2.5px solid #88bbee;}
.chat-input-row{margin-top:10px;display:flex;gap:8px;}
.chat-input-row input{flex:1;border:3px solid var(--ink);border-radius:14px;padding:10px 12px;font-size:14px;background:#fffaf2;}
.chat-input-row button{border:3px solid var(--ink);border-radius:14px;background:#ffe0bf;font-family:'Jua',sans-serif;font-size:14px;padding:0 14px;box-shadow:0 4px 0 var(--ink);cursor:pointer;}
.chat-input-row button:active{transform:translateY(2px);box-shadow:0 2px 0 var(--ink);}
.quota{margin:0 0 10px;font-size:12px;color:var(--ink2);background:#fff6e8;border:2.5px solid #e8c480;border-radius:12px;padding:6px 10px;font-weight:700;}
.fortune-result{margin-top:10px;background:#fffaef;border:2.5px solid #d4b060;border-radius:14px;padding:12px;line-height:1.65;white-space:pre-wrap;font-size:13px;}
.theme-dark .chat-input-row input{background:#161630;border-color:#4455aa;color:#d0e0ff;}
.theme-dark .msg.pet{background:#1a1a30;border-color:#4455aa;color:#c0d0ff;}
/* ─ 가챠 패널 ─ */
.gacha-hero{background:linear-gradient(135deg,#1a0832,#3a1060);border:3px solid #9944ee;border-radius:20px;padding:18px 14px;margin-bottom:14px;text-align:center;box-shadow:0 0 32px rgba(180,80,255,0.35),inset 0 1px 0 rgba(255,255,255,0.1);}
.gacha-hero-title{font-family:'Jua',sans-serif;font-size:22px;color:#f5d0ff;letter-spacing:.08em;margin-bottom:4px;text-shadow:0 0 20px rgba(220,100,255,.9);}
.gacha-hero-balance{font-size:14px;color:#ffc060;font-weight:700;}
.gacha-pull-btn{width:100%;padding:16px;margin-bottom:6px;border:4px solid #ffe866;border-radius:20px;background:linear-gradient(135deg,#8833dd,#cc33ff);color:#fff;font-family:'Jua',sans-serif;font-size:20px;text-shadow:0 2px 4px rgba(0,0,0,.45);cursor:pointer;box-shadow:0 8px 0 #440099,0 0 32px rgba(180,80,255,.55);transition:.1s ease;}
.gacha-pull-btn:active{transform:translateY(6px);box-shadow:0 2px 0 #440099;}
.gacha-pull-btn:disabled{opacity:.5;cursor:not-allowed;}
.gacha-cost-hint{font-size:11px;color:#aaa;margin-bottom:14px;text-align:center;}
.error-msg{margin-top:8px;font-size:12px;color:#ff6655;background:rgba(255,80,60,.1);border:2px solid #ff6655;border-radius:12px;padding:8px 12px;}
.egg-title{margin:4px 0 8px;font-family:'Jua',sans-serif;font-size:16px;color:var(--ink);}
.egg-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:6px;}
.egg-item{border:2.5px solid #c8a88c;border-radius:14px;background:#fffaf2;padding:6px;cursor:pointer;box-shadow:0 4px 0 rgba(0,0,0,0.15);transition:.1s ease;}
.egg-item img{width:100%;height:56px;object-fit:contain;display:block;}
.egg-item.on{border-color:var(--carrot);box-shadow:0 4px 0 var(--carrot);transform:translateY(-2px);}
.share-row{display:flex;gap:8px;margin-top:12px;}
.profile-list{margin:0;padding-left:18px;line-height:2;font-size:13px;}
/* ── 가챠 전체화면 오버레이 ── */
.gacha-overlay{position:fixed;inset:0;z-index:999;display:flex;align-items:center;justify-content:center;overflow:hidden;}
.gacha-bg-dim{position:absolute;inset:0;background:rgba(4,0,20,0.93);backdrop-filter:blur(10px);}
.gacha-content{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:20px;padding:20px;width:min(400px,92vw);}
.gacha-spin-stage,.gacha-crack-stage,.gacha-reveal-stage{display:flex;flex-direction:column;align-items:center;gap:24px;}
.gacha-spin-label{font-family:'Jua',sans-serif;font-size:22px;color:#f5d0ff;text-shadow:0 0 22px rgba(220,100,255,1);animation:gachaLabelPulse .8s ease-in-out infinite;text-align:center;}
.gacha-egg-spin{width:180px;height:180px;object-fit:contain;filter:drop-shadow(0 0 30px rgba(180,80,255,.85));animation:gachaSpin 1.6s linear infinite;}
.gacha-ring{position:absolute;width:240px;height:240px;border-radius:50%;border:4px solid transparent;border-top-color:#cc44ff;border-right-color:#ff44cc;animation:gachaSpin 1.0s linear infinite;}
.gacha-ring2{position:absolute;width:280px;height:280px;border-radius:50%;border:2px solid transparent;border-bottom-color:#4488ff;border-left-color:#44ffcc;animation:gachaSpin 1.6s linear infinite reverse;}
.gacha-egg-crack{width:200px;height:200px;object-fit:contain;filter:drop-shadow(0 0 24px rgba(255,200,80,.9));animation:eggCrack .15s ease-in-out infinite;}
.gacha-burst-lines{position:absolute;width:280px;height:280px;}
.gacha-burst-lines span{position:absolute;top:50%;left:50%;width:2px;height:120px;background:linear-gradient(#ffe044,transparent);transform-origin:top center;border-radius:2px;}
.gacha-burst-lines span:nth-child(1){transform:rotate(0deg) translateY(-60px);}.gacha-burst-lines span:nth-child(2){transform:rotate(45deg) translateY(-60px);}.gacha-burst-lines span:nth-child(3){transform:rotate(90deg) translateY(-60px);}.gacha-burst-lines span:nth-child(4){transform:rotate(135deg) translateY(-60px);}.gacha-burst-lines span:nth-child(5){transform:rotate(180deg) translateY(-60px);}.gacha-burst-lines span:nth-child(6){transform:rotate(225deg) translateY(-60px);}.gacha-burst-lines span:nth-child(7){transform:rotate(270deg) translateY(-60px);}.gacha-burst-lines span:nth-child(8){transform:rotate(315deg) translateY(-60px);}
.gacha-reveal-egg{width:220px;height:220px;object-fit:contain;filter:drop-shadow(0 0 40px rgba(255,220,60,1));animation:gachaReveal .5s cubic-bezier(.175,.885,.32,1.275) forwards;}
.gacha-sparkles{position:absolute;width:320px;height:320px;pointer-events:none;}
.gacha-sparkles span{position:absolute;font-size:18px;animation:sparkleFloat 1.2s ease-out infinite;}
.gacha-sparkles span:nth-child(1){top:5%;left:8%;animation-delay:.0s;}.gacha-sparkles span:nth-child(2){top:10%;left:85%;animation-delay:.15s;}.gacha-sparkles span:nth-child(3){top:80%;left:6%;animation-delay:.30s;}.gacha-sparkles span:nth-child(4){top:85%;left:82%;animation-delay:.45s;}.gacha-sparkles span:nth-child(5){top:0%;left:45%;animation-delay:.10s;}.gacha-sparkles span:nth-child(6){top:90%;left:48%;animation-delay:.55s;}.gacha-sparkles span:nth-child(7){top:40%;left:2%;animation-delay:.20s;}.gacha-sparkles span:nth-child(8){top:45%;left:90%;animation-delay:.35s;}
.gacha-new-badge{font-family:'Jua',sans-serif;font-size:24px;background:linear-gradient(135deg,#ff6b6b,#ff9f43);color:#fff;padding:8px 24px;border-radius:50px;border:3px solid #fff;box-shadow:0 6px 0 rgba(200,50,0,.5),0 0 30px rgba(255,100,50,.7);animation:gachaBadgePop .4s cubic-bezier(.175,.885,.32,1.275) forwards;letter-spacing:.1em;}
.gacha-dup-badge{font-family:'Jua',sans-serif;font-size:18px;background:linear-gradient(135deg,#6c5ce7,#a29bfe);color:#fff;padding:8px 20px;border-radius:50px;border:3px solid #fff;box-shadow:0 6px 0 rgba(50,0,150,.45);animation:gachaBadgePop .4s cubic-bezier(.175,.885,.32,1.275) forwards;}
.gacha-tap-hint{font-family:'Jua',sans-serif;font-size:15px;color:rgba(255,255,255,.75);animation:motionPop 1.2s ease-in-out infinite;}
/* ─ 미니 게임 ─ */
.mini-wrap{background:#fffaf2;border:3px solid #c9ab8f;border-radius:16px;padding:12px;box-shadow:0 5px 0 rgba(0,0,0,.15);}
.mini-wrap h4{margin:0 0 6px;font-family:'Jua',sans-serif;}.mini-wrap p{margin:0 0 8px;font-size:13px;}
.feed-zone{height:220px;border:3px dashed #cfb59a;border-radius:14px;position:relative;background:linear-gradient(180deg,#f0f8ff,#fff8ec);overflow:hidden;}
.food-item{position:absolute;border:none;background:transparent;font-size:28px;cursor:pointer;}
.reaction-zone{height:200px;border:3px dashed #cfb59a;border-radius:14px;display:grid;place-items:center;background:linear-gradient(180deg,#f0f8ff,#fff8ec);}
.star-btn{border:none;background:transparent;font-size:64px;cursor:pointer;animation:motionPop .6s infinite alternate;}
/* ─ 캘린더 ─ */
.calendar-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;}
.cell{min-height:52px;border:2.5px solid #c8a88c;border-radius:12px;background:#fffaf2;display:grid;place-items:center;cursor:pointer;box-shadow:0 3px 0 rgba(0,0,0,0.1);}
.cell.empty{opacity:0;pointer-events:none;}.cell.best{border-color:#ffcc00;background:#fffde8;box-shadow:0 3px 0 #cc9900;}
.cell span{font-weight:800;font-size:13px;}.cell small{opacity:.75;font-size:11px;}.hint{margin:8px 0 0;font-size:13px;opacity:.78;}
/* ─ 공유 카드 ─ */
.share-card{position:fixed;left:-9999px;top:0;width:330px;background:#fdf5ea;border:3px solid #3d2b1f;border-radius:22px;padding:12px;}
.share-card h4{margin:0 0 8px;font-family:'Jua',sans-serif;}.share-egg{width:66px;height:66px;object-fit:contain;display:block;margin:0 auto 8px;}
.share-char{display:grid;place-items:center;background:#fff;border-radius:16px;border:2px solid #cab097;margin-bottom:8px;overflow:hidden;}
.share-card .small{font-size:13px;line-height:1.5;}
/* ── 애니메이션 클래스 ── */
.anim-float{animation:motionFloat 2.8s ease-in-out infinite;}
.anim-bounce{animation:motionBounce 0.7s ease-in-out infinite;}
.anim-dance{animation:motionDance 0.55s ease-in-out infinite alternate;}
.anim-wiggle{animation:motionWiggle 0.5s ease-in-out infinite;}
.anim-sleep{animation:motionSleep 3s ease-in-out infinite;opacity:.85;}
.anim-spin{animation:motionSpin 0.62s linear infinite;}
.anim-pop{animation:motionPop 0.38s ease-in-out infinite;}
.anim-droop{animation:motionDroop 1.8s ease-in-out infinite;}
.anim-shake{animation:motionShake 0.4s ease-in-out infinite;}
/* ──── 키프레임 ──── */
@keyframes cloudMove{from{transform:translateX(0);}to{transform:translateX(130vw);}}
@keyframes slideIn{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
@keyframes panelSlideIn{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
@keyframes eggRise{0%{transform:translateY(80px) scale(.7);opacity:0;}70%{transform:translateY(-10px) scale(1.08);opacity:1;}100%{transform:translateY(0) scale(1);opacity:1;}}
@keyframes eggWiggle{0%,100%{transform:rotate(0deg);}25%{transform:rotate(-6deg);}75%{transform:rotate(6deg);}}
@keyframes eggIdle{0%,100%{transform:translateY(0) rotate(0deg);}30%{transform:translateY(-6px) rotate(-3deg);}70%{transform:translateY(-4px) rotate(3deg);}}
@keyframes eggTap{0%{transform:scale(1);}50%{transform:scale(1.16) rotate(-4deg);}100%{transform:scale(1);}}
@keyframes eggCrack{0%,100%{transform:rotate(-4deg) scale(.98);}50%{transform:rotate(4deg) scale(1.04);}}
@keyframes tapHintBounce{0%,100%{transform:translateX(-50%) translateY(0);}50%{transform:translateX(-50%) translateY(-5px);}}
@keyframes crackAppear{from{opacity:0;transform:scaleY(0);}to{opacity:1;transform:scaleY(1);}}
@keyframes burstExpand{0%{transform:scale(0);opacity:1;}60%{transform:scale(1.5);opacity:.7;}100%{transform:scale(2.4);opacity:0;}}
@keyframes motionFloat{0%,100%{transform:translateY(0);}50%{transform:translateY(-10px);}}
@keyframes motionBounce{0%,100%{transform:translateY(0) scaleY(1);}40%{transform:translateY(-18px) scaleY(1.06);}60%{transform:translateY(-14px) scaleY(.96);}}
@keyframes motionDance{from{transform:rotate(-8deg) translateY(0);}to{transform:rotate(8deg) translateY(-8px);}}
@keyframes motionWiggle{0%,100%{transform:rotate(0) scale(1);}25%{transform:rotate(-10deg) scale(1.06);}75%{transform:rotate(10deg) scale(.96);}}
@keyframes motionSleep{0%,100%{transform:translateY(0) rotate(-3deg);}50%{transform:translateY(8px) rotate(3deg);}}
@keyframes motionSpin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
@keyframes motionPop{0%,100%{transform:scale(1);}50%{transform:scale(1.15);}}
@keyframes motionDroop{0%,100%{transform:translateY(0) rotate(0deg);}50%{transform:translateY(10px) rotate(-5deg);}}
@keyframes motionShake{0%,100%{transform:translateX(0);}20%{transform:translateX(-7px);}40%{transform:translateX(7px);}60%{transform:translateX(-4px);}80%{transform:translateX(4px);}}
@keyframes moonGlow{0%,100%{box-shadow:0 0 48px 24px rgba(240,224,80,.28);}50%{box-shadow:0 0 72px 38px rgba(240,224,80,.44);}}
@keyframes starTwinkle{0%,100%{opacity:.3;transform:scale(.8);}50%{opacity:1;transform:scale(1.3);}}
@keyframes shootingStar{0%{transform:translateX(0) translateY(0) rotate(25deg);opacity:1;}100%{transform:translateX(130vw) translateY(40vh) rotate(25deg);opacity:0;}}
@keyframes angelRay{0%,100%{opacity:.18;}50%{opacity:.52;}}
@keyframes gachaSpin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
@keyframes gachaReveal{0%{transform:scale(0) rotate(-20deg);opacity:0;}60%{transform:scale(1.2) rotate(5deg);}100%{transform:scale(1) rotate(0deg);opacity:1;}}
@keyframes gachaBadgePop{0%{transform:scale(0);opacity:0;}70%{transform:scale(1.18);}100%{transform:scale(1);opacity:1;}}
@keyframes gachaLabelPulse{0%,100%{opacity:.8;text-shadow:0 0 20px rgba(220,100,255,.8);}50%{opacity:1;text-shadow:0 0 40px rgba(220,100,255,1);}}
@keyframes sparkleFloat{0%{transform:translateY(0) scale(1);opacity:1;}100%{transform:translateY(-40px) scale(1.5);opacity:0;}}
@media(max-width:480px){
  .hour-grid{grid-template-columns:repeat(2,1fr);}
  .game-nav button{font-size:9px;padding:8px 2px 10px;}
  .game-nav button span{font-size:20px;}
  .care-dock{gap:4px;}
  .care-btn{font-size:10px;padding:8px 1px 6px;}
  .care-btn span{font-size:18px;}
  .gacha-pull-btn{font-size:17px;padding:13px;}
}
/* ── 셋업 미리보기 카드 ── */
.setup-preview-card{width:100%;display:flex;gap:13px;align-items:stretch;background:rgba(255,252,242,0.97);border:3px solid var(--ink);border-radius:20px;padding:13px;box-shadow:0 6px 0 var(--ink);margin:14px 0 4px;animation:slideIn .3s ease;overflow:hidden;}
.setup-preview-left{display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0;}
.setup-preview-egg{width:80px;height:80px;object-fit:contain;border-radius:12px;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.2));}
.setup-preview-theme-badge{font-family:'Jua',sans-serif;font-size:10px;color:#fff;border-radius:10px;padding:2px 8px;font-weight:700;text-shadow:0 1px 2px rgba(0,0,0,0.4);white-space:nowrap;}
.setup-preview-right{display:flex;flex-direction:column;gap:5px;min-width:0;flex:1;}
.setup-preview-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.badge-ilju{font-family:'Jua',sans-serif;font-size:20px;background:#1a0a44;color:#fff;border-radius:9px;padding:2px 11px;letter-spacing:0.08em;flex-shrink:0;}
.setup-preview-animal{font-size:18px;font-weight:900;color:var(--ink);}
.setup-preview-element{font-size:12px;color:#5a8060;font-weight:700;}
.setup-preview-personality{font-size:12px;color:var(--ink2);line-height:1.4;}
.setup-preview-hour{font-size:12px;background:#fff8e8;border:2px solid #f0d080;border-radius:10px;padding:3px 9px;color:#7a5a10;font-weight:700;}
.setup-preview-hint{font-size:10px;color:#aaa;font-style:italic;margin-top:2px;}`
