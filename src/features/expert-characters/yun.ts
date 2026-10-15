import { defineLines } from "./lines";
import type { ExpertCharacter, ExpertSprite } from "./types";

/* 윤달 — 점성술 AI. 원작 3부 점성술 아크의 천문대 하늘배 안내자, "누구에게나 생시부터 묻는다".
   🔴 void(공망 스포일러)·pain 스프라이트는 쓰지 않는다. */
const SPRITE_BASE = "/images/novel/remaster/yun";

function sprite(file: string, alt: string): ExpertSprite {
  return { src: `${SPRITE_BASE}/${file}.webp`, alt };
}

export const yunCharacter: ExpertCharacter = {
  key: "yun",
  enabled: true,
  name: { ko: "윤달", en: "Yundal" },
  title: { ko: "생시부터 묻는 점성술사", en: "The astrologer who asks your birth minute first" },
  spriteFit: "cutout",
  spriteAspect: "341 / 512",
  moods: {
    idle: sprite("base", "접부채를 든 점성술사 윤달"),
    greet: sprite("laugh", "반갑게 웃는 윤달"),
    thinking: sprite("serious", "차트를 읽으며 진지해진 윤달"),
    reveal: sprite("surprise", "하늘의 배치를 발견한 윤달"),
    caution: sprite("serious", "조심할 자리를 짚는 윤달"),
    comfort: sprite("sad", "다정하게 마음을 쓰는 윤달"),
    error: sprite("sad", "잠시 멈춰 사과하는 윤달"),
    empty: sprite("sly", "장난스럽게 생시를 묻는 윤달"),
  },
  hero: {
    src: "/images/expert-characters/yun/hero.webp",
    alt: "천문대 하늘배 갑판에서 접부채를 열두 집 차트에 겹쳐 펼친 윤달과 흰 고양이",
    width: 1536,
    height: 1024,
  },
  lines: defineLines("yun", [
    ["hero", "greet", "어서 와요. 먼저 몇 시에 태어났어요? 분까지요."],
    ["hero.sub", "idle", "태어난 분이 정확할수록 상승궁과 열두 집이 또렷해져요."],
    ["birth.known", "reveal", "좋아요, 분까지 알면 상승궁이 흔들리지 않아요."],
    ["birth.unknown", "comfort", "생시를 모르면 상승궁이 흔들려요. 그래도 읽을 수 있는 하늘부터 볼게요."],
    ["loading.calculating", "thinking", "태어난 분의 하늘을 계산하고 있어요."],
    ["loading.generating", "thinking", "열두 집 문을 하나씩 두드리는 중이에요."],
    ["error", "error", "하늘배가 구름에 잠깐 걸렸어요."],
    ["result.open", "reveal", "당신이 태어난 그 분의 하늘을 펼쳤어요."],
    ["result.close", "comfort", "열두 집 문은 다 열어 뒀어요. 궁금할 때 다시 들러요."],
  ]),
  linesEn: {
    hero: "Welcome. First things first — what time were you born? To the minute.",
    "hero.sub": "The more exact your birth minute, the clearer your rising sign and twelve houses.",
    "birth.known": "Good. With the minute, your rising sign stays steady.",
    "birth.unknown": "Without a birth time the rising sign wobbles. Let's start with the sky we can still read.",
    "loading.calculating": "Calculating the sky of the minute you were born.",
    "loading.generating": "Knocking on the twelve houses, one door at a time.",
    error: "The sky-ship snagged on a cloud for a moment.",
    "result.open": "Here is the sky of the minute you were born.",
    "result.close": "I've left all twelve doors open. Drop by whenever you wonder.",
  },
};
