import { fortuneTeaHouseAssets } from "./assets";

export type YeoniMood =
  | "welcome"
  | "gentle"
  | "serious"
  | "thinking"
  | "comfort"
  | "playful"
  | "surprised"
  | "closing";

export const yeoniSpriteSheets = {
  sprite1: {
    src: fortuneTeaHouseAssets.yeoni.transparent.sprite1,
    columns: 4,
    rows: 2,
    frameCount: 8,
    aspectRatio: "4 / 5",
  },
  sprite2: {
    src: fortuneTeaHouseAssets.yeoni.transparent.sprite2,
    columns: 4,
    rows: 2,
    frameCount: 8,
    aspectRatio: "4 / 5",
  },
  sprite3: {
    src: fortuneTeaHouseAssets.yeoni.transparent.sprite3,
    columns: 4,
    rows: 2,
    frameCount: 8,
    aspectRatio: "4 / 5",
  },
  sprite4: {
    src: fortuneTeaHouseAssets.yeoni.transparent.sprite4,
    columns: 4,
    rows: 2,
    frameCount: 8,
    aspectRatio: "4 / 5",
  },
  sprite5: {
    src: fortuneTeaHouseAssets.yeoni.transparent.sprite5,
    columns: 4,
    rows: 2,
    frameCount: 8,
    aspectRatio: "4 / 5",
  },
  sprite6: {
    src: fortuneTeaHouseAssets.yeoni.transparent.sprite6,
    columns: 4,
    rows: 2,
    frameCount: 8,
    aspectRatio: "4 / 5",
  },
  sprite7: {
    src: fortuneTeaHouseAssets.yeoni.transparent.sprite7,
    columns: 4,
    rows: 2,
    frameCount: 8,
    aspectRatio: "4 / 5",
  },
} as const;

export type YeoniSpriteSheetId = keyof typeof yeoniSpriteSheets;

export type YeoniSpriteFrame = {
  id: string;
  sheet: YeoniSpriteSheetId;
  col: number;
  row: number;
  label: string;
  mood: readonly YeoniMood[];
};

export const yeoniSpriteFrames = [
  { id: "welcome-idle", sheet: "sprite1", col: 0, row: 0, label: "기본 미소와 환영", mood: ["welcome", "gentle"] },
  { id: "welcome-talk", sheet: "sprite1", col: 1, row: 0, label: "입을 열고 반갑게 말함", mood: ["welcome"] },
  { id: "welcome-blink", sheet: "sprite1", col: 2, row: 0, label: "부드러운 눈 깜빡임", mood: ["welcome", "gentle"] },
  { id: "gentle-talk", sheet: "sprite1", col: 3, row: 0, label: "차분한 안내", mood: ["gentle"] },
  { id: "serious-idle", sheet: "sprite2", col: 0, row: 0, label: "진지한 상담 표정", mood: ["serious", "thinking"] },
  { id: "serious-talk", sheet: "sprite2", col: 1, row: 0, label: "진지하게 설명함", mood: ["serious"] },
  { id: "thinking-talk", sheet: "sprite2", col: 2, row: 0, label: "생각의 결을 짚어 줌", mood: ["thinking"] },
  { id: "serious-blink", sheet: "sprite2", col: 3, row: 0, label: "차분한 눈 깜빡임", mood: ["serious", "thinking"] },
  { id: "comfort-idle", sheet: "sprite5", col: 0, row: 0, label: "위로하는 눈빛", mood: ["comfort"] },
  { id: "comfort-talk", sheet: "sprite5", col: 1, row: 0, label: "따뜻하게 위로함", mood: ["comfort"] },
  { id: "comfort-blink", sheet: "sprite5", col: 2, row: 0, label: "안심시키는 눈 깜빡임", mood: ["comfort"] },
  { id: "playful-idle", sheet: "sprite6", col: 0, row: 0, label: "장난기 있는 미소", mood: ["playful", "surprised"] },
  { id: "playful-talk", sheet: "sprite6", col: 1, row: 0, label: "살짝 웃으며 말함", mood: ["playful"] },
  { id: "surprised-talk", sheet: "sprite6", col: 2, row: 0, label: "작게 반응함", mood: ["surprised"] },
  { id: "playful-blink", sheet: "sprite6", col: 3, row: 0, label: "귀여운 눈 깜빡임", mood: ["playful", "surprised"] },
  { id: "closing-idle", sheet: "sprite7", col: 0, row: 0, label: "상담을 마무리하는 미소", mood: ["closing"] },
  { id: "closing-talk", sheet: "sprite7", col: 1, row: 0, label: "마무리 안내", mood: ["closing"] },
  { id: "closing-blink", sheet: "sprite7", col: 2, row: 0, label: "마무리 눈 깜빡임", mood: ["closing"] },
] as const satisfies readonly YeoniSpriteFrame[];

export type YeoniSpriteFrameId = (typeof yeoniSpriteFrames)[number]["id"];

const frameById = yeoniSpriteFrames.reduce(
  (frames, frame) => {
    frames[frame.id] = frame;
    return frames;
  },
  {} as Record<YeoniSpriteFrameId, YeoniSpriteFrame>,
);

export const yeoniMoodFrameMap: Record<
  YeoniMood,
  {
    idle: YeoniSpriteFrameId;
    speaking: YeoniSpriteFrameId[];
    blink: YeoniSpriteFrameId;
  }
> = {
  welcome: {
    idle: "welcome-idle",
    speaking: ["welcome-talk", "welcome-idle", "gentle-talk"],
    blink: "welcome-blink",
  },
  gentle: {
    idle: "welcome-idle",
    speaking: ["gentle-talk", "welcome-idle", "welcome-talk"],
    blink: "welcome-blink",
  },
  serious: {
    idle: "serious-idle",
    speaking: ["serious-talk", "serious-idle", "thinking-talk"],
    blink: "serious-blink",
  },
  thinking: {
    idle: "serious-idle",
    speaking: ["thinking-talk", "serious-idle", "serious-talk"],
    blink: "serious-blink",
  },
  comfort: {
    idle: "comfort-idle",
    speaking: ["comfort-talk", "comfort-idle", "gentle-talk"],
    blink: "comfort-blink",
  },
  playful: {
    idle: "playful-idle",
    speaking: ["playful-talk", "playful-idle", "welcome-talk"],
    blink: "playful-blink",
  },
  surprised: {
    idle: "playful-idle",
    speaking: ["surprised-talk", "playful-idle", "playful-talk"],
    blink: "playful-blink",
  },
  closing: {
    idle: "closing-idle",
    speaking: ["closing-talk", "closing-idle", "comfort-talk"],
    blink: "closing-blink",
  },
};

export function getYeoniSpriteFrame(frameId: YeoniSpriteFrameId) {
  return frameById[frameId];
}
