import { defineLines } from "./lines";
import type { ExpertCharacter, ExpertSprite } from "./types";

/* 연이 — 손금. 소설 캐주얼 연이(yeon/base.webp 꽃무늬 블라우스)를 손금 상담가로 세운다.
   🔴 찻집 한복 연이·돼지 폼은 쓰지 않는다. angry·cry·fear·sleep·onigiri 는 상담 화면에 맞지 않고,
      disappoint 는 팔짱 낀 반신 컷이라 다른 표정과 캔버스가 달라 제외했다. */
const SPRITE_BASE = "/images/expert-characters/yeoni";

function sprite(file: string, alt: string): ExpertSprite {
  return { src: `${SPRITE_BASE}/${file}.webp`, alt };
}

export const yeoniCharacter: ExpertCharacter = {
  key: "yeoni",
  enabled: true,
  name: { ko: "연이", en: "Yeoni" },
  title: { ko: "손바닥 선을 함께 들여다보는 손금 상담가", en: "The palm reader who traces your lines with you" },
  spriteFit: "cutout",
  spriteAspect: "384 / 452",
  moods: {
    idle: sprite("base", "꽃무늬 블라우스를 입은 손금 상담가 연이"),
    greet: sprite("smile", "반갑게 웃는 연이"),
    thinking: sprite("sideL", "손바닥 선을 따라가며 생각하는 연이"),
    reveal: sprite("right", "읽어 낸 선을 짚어 보이는 연이"),
    caution: sprite("left", "조심할 점을 짚는 연이"),
    comfort: sprite("smile", "다정하게 웃어 보이는 연이"),
    error: sprite("sideR", "잠시 멈추고 안내하는 연이"),
    empty: sprite("sideR", "사진을 기다리는 연이"),
  },
  hero: {
    src: "/images/expert-characters/yeoni/hero.webp",
    alt: "햇살 드는 정원 창가에서 펼친 손바닥을 들여다보는 연이",
    width: 1536,
    height: 864,
  },
  talkFrames: [
    sprite("talk-a", "말하는 연이"),
    sprite("talk-b", "말하는 연이"),
  ],
  lines: defineLines("yeoni", [
    ["hero", "greet", "어서 와요. 손바닥을 펴 보여 주시면 선을 하나씩 같이 짚어 볼게요."],
    ["upload", "idle", "손목부터 손가락 끝까지 한 장에 담아 주시면 돼요. 사진에 보이는 선만 읽고, 안 보이는 선은 안 보인다고 말씀드릴게요."],
    ["guide", "caution", "그늘이 지거나 손가락이 겹치면 선이 끊겨 보여요. 밝은 곳에서 손을 편하게 펴 주세요."],
    ["loading.preparing", "thinking", "사진 속 손바닥 윤곽부터 찾고 있어요."],
    ["loading.reading", "thinking", "생명선부터 차례로 따라가며 읽는 중이에요."],
    ["loading.paying", "idle", "다 읽었어요. 결제를 확인하는 동안 잠시만 기다려 주세요."],
    ["loading.delivering", "thinking", "읽은 내용을 정리해서 건네 드릴게요."],
    ["error", "error", "여기서 잠깐 멈췄어요. 아래 안내를 먼저 봐 주세요."],
    ["result.open", "reveal", "사진 속 선을 하나씩 짚어 봤어요. 천천히 같이 읽어요."],
    ["result.close", "comfort", "손금은 지금의 흐름을 비춰 보는 거울이에요. 마음이 가는 것부터 하나 해 봐요."],
  ]),
  linesEn: {
    hero: "Welcome. Open your palm for me and we'll trace the lines together, one by one.",
    upload: "Fit everything from your wrist to your fingertips in one shot. I only read the lines the photo shows, and I'll tell you if a line isn't visible.",
    guide: "Shadows or overlapping fingers make lines look broken. Find good light and relax your hand open.",
    "loading.preparing": "Finding the outline of your palm in the photo.",
    "loading.reading": "Following each line in turn, starting with the life line.",
    "loading.paying": "The reading is done. Please wait a moment while your payment is confirmed.",
    "loading.delivering": "Putting the reading in order to hand it to you.",
    error: "I've paused here. Please check the note below first.",
    "result.open": "I've traced each line in your photo. Let's read it slowly together.",
    "result.close": "A palm is a mirror of where you are now. Start with whatever speaks to you.",
  },
};
