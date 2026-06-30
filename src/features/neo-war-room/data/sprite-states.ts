import {
  type NeoWarRoomAsset,
  getNeoWarRoomSpriteAsset,
  neoWarRoomAssets,
} from "./assets";

export type NeoWarRoomEmotionState =
  | "idle"
  | "welcome"
  | "analyzing"
  | "blunt"
  | "curious"
  | "reality_check"
  | "encouragement"
  | "completed";

export type NeoWarRoomSpriteVariant = "transparent" | "with-background" | "fullbody";
export type NeoWarRoomSpriteMotion = "still" | "fade" | "slide" | "bounce";

export type NeoWarRoomSpriteStateConfig = {
  state: NeoWarRoomEmotionState;
  dialogue: string;
  asset: NeoWarRoomAsset;
  fallbackAsset: NeoWarRoomAsset;
  variant: NeoWarRoomSpriteVariant;
  motion: NeoWarRoomSpriteMotion;
  alt: string;
};

const fallbackAsset = neoWarRoomAssets.hero.fullbody;

export const neoWarRoomSpriteStates: Record<NeoWarRoomEmotionState, NeoWarRoomSpriteStateConfig> = {
  idle: {
    state: "idle",
    dialogue: "기다리는 중이다. 질문부터 제대로 꺼내 봐라.",
    asset: getNeoWarRoomSpriteAsset("transparent", 1),
    fallbackAsset,
    variant: "transparent",
    motion: "fade",
    alt: "네오가 조용히 기다리는 표정",
  },
  welcome: {
    state: "welcome",
    dialogue: "왔냐. 앉아라.",
    asset: neoWarRoomAssets.hero.fullbody,
    fallbackAsset,
    variant: "fullbody",
    motion: "slide",
    alt: "네오가 작전실로 맞이하는 전신 일러스트",
  },
  analyzing: {
    state: "analyzing",
    dialogue: "운명의 작전 지도를 펼치는 중이다.",
    asset: getNeoWarRoomSpriteAsset("withBackground", 3),
    fallbackAsset,
    variant: "with-background",
    motion: "bounce",
    alt: "네오가 운명의 작전 지도를 살피는 표정",
  },
  blunt: {
    state: "blunt",
    dialogue: "좋은 말만 듣고 싶으면 여기 오면 안 된다.",
    asset: getNeoWarRoomSpriteAsset("transparent", 4),
    fallbackAsset,
    variant: "transparent",
    motion: "slide",
    alt: "네오가 단호하게 바라보는 표정",
  },
  curious: {
    state: "curious",
    dialogue: "말을 흐리지 마라. 지금 네가 진짜 묻고 싶은 걸 써라.",
    asset: getNeoWarRoomSpriteAsset("transparent", 2),
    fallbackAsset,
    variant: "transparent",
    motion: "fade",
    alt: "네오가 질문을 읽으며 주시하는 표정",
  },
  reality_check: {
    state: "reality_check",
    dialogue: "그래서 묻는 거다. 너, 진짜 그렇게 살고 있냐?",
    asset: getNeoWarRoomSpriteAsset("withBackground", 5),
    fallbackAsset,
    variant: "with-background",
    motion: "slide",
    alt: "네오가 현실 점검을 요구하는 표정",
  },
  encouragement: {
    state: "encouragement",
    dialogue: "흥. 그래도 여기까지 온 건 나쁘지 않다.",
    asset: getNeoWarRoomSpriteAsset("transparent", 5),
    fallbackAsset,
    variant: "transparent",
    motion: "bounce",
    alt: "네오가 퉁명스럽게 격려하는 표정",
  },
  completed: {
    state: "completed",
    dialogue: "작전 명령서의 첫 줄은 잡혔다. 이제 도망가지 마라.",
    asset: getNeoWarRoomSpriteAsset("withBackground", 7),
    fallbackAsset,
    variant: "with-background",
    motion: "fade",
    alt: "네오가 작전 준비 완료를 알리는 표정",
  },
};

export function getNeoWarRoomSpriteStateConfig(state: NeoWarRoomEmotionState) {
  return neoWarRoomSpriteStates[state] ?? neoWarRoomSpriteStates.idle;
}
