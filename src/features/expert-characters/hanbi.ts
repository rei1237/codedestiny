import { defineLines } from "./lines";
import type { ExpertCharacter, ExpertSprite } from "./types";

/* 서한비 — 숙요점 궁합 AI. 27 달집 사원에서 고리를 끊은 '개심 이후'의 서한비만 그린다.
   🔴 "박지은"은 영구 금지(바이블 L68). R2 「박지은 *.webp」 세트·remaster/pje 악역기 의상은 쓰지 않는다.
   🔴 public/images/novel/hanbi/* 는 이름과 달리 호랑이(tiger) 캐릭터다 — 쓰지 않는다.
   인연의 서 '마스터'(버건디)와 구분: 빗빛 인디고·은빛·옅은 금빛, 화자는 항상 "서한비". */
const SPRITE_BASE = "/images/expert-characters/hanbi";

function sprite(file: string, alt: string): ExpertSprite {
  return { src: `${SPRITE_BASE}/${file}.webp`, alt };
}

export const hanbiCharacter: ExpertCharacter = {
  key: "hanbi",
  enabled: true,
  name: { ko: "서한비", en: "Seo Hanbi" },
  title: { ko: "두 달집 사이의 거리를 재는 사람", en: "She measures the distance between two lunar mansions" },
  spriteFit: "card",
  spriteAspect: "2 / 3",
  moods: {
    idle: sprite("composed", "장부를 덮고 차분히 기다리는 서한비"),
    greet: sprite("smile", "부드럽게 맞이하는 서한비"),
    thinking: sprite("thinking", "두 사람의 장부를 읽는 서한비"),
    reveal: sprite("resolve", "두 달집의 거리를 짚는 서한비"),
    caution: sprite("caution", "쌓이는 자리를 조용히 경고하는 서한비"),
    comfort: sprite("comfort", "다정하게 위로하는 서한비"),
    error: sprite("comfort", "잠시 멈춰 사과하는 서한비"),
    empty: sprite("smile", "나머지 한 사람을 기다리는 서한비"),
  },
  hero: {
    src: "/images/expert-characters/hanbi/hero.webp",
    alt: "두 달집의 실이 이어진 달밤의 다리 위에서 덮인 장부를 든 서한비",
    width: 1536,
    height: 1024,
  },
  lines: defineLines("hanbi", [
    ["hero", "greet", "두 분의 달이 어디에 머물렀는지부터 볼게요. 서두르지 않아도 돼요."],
    ["hero.sub", "idle", "반복되는 엇갈림을 쌓이는 빚으로 읽고, 갚는 법을 함께 찾아요."],
    ["empty", "empty", "아직 한 사람의 생일만 적혀 있네요. 인연은 두 줄이 있어야 읽혀요."],
    ["loading", "thinking", "두 달집 사이의 거리를 재고 있어요."],
    ["caution", "caution", "이 자리는 그냥 두면 불어나요."],
    ["error", "error", "빗줄기가 잠시 엉켰어요. 장부는 그대로 있으니 다시 펼쳐 볼게요."],
    ["result.open", "reveal", "두 분 사이의 장부를 펼쳤어요. 쌓인 것과 갚을 수 있는 것을 함께 볼게요."],
    ["result.signoff", "comfort", "— 서한비"],
  ]),
  linesEn: {
    hero: "Let's first see where each of your moons was resting. There's no need to hurry.",
    "hero.sub": "I read your recurring missteps as debts that pile up — and find how to repay them together.",
    empty: "Only one birthday is written so far. A bond needs two lines to be read.",
    loading: "Measuring the distance between your two lunar mansions.",
    caution: "Left alone, this place keeps growing.",
    error: "The rain tangled for a moment. The ledger is safe — let's open it again.",
    "result.open": "I've opened the ledger between you two: what has piled up, and what can be repaid.",
    "result.signoff": "— Seo Hanbi",
  },
};
