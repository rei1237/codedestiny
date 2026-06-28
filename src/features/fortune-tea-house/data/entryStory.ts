import type { YeoniMood } from "./yeoniSprites";

export type TeaHouseEntryStage =
  | "doorOpened"
  | "pigGreeting"
  | "pigDialogue"
  | "transformPreview"
  | "yeoniReveal"
  | "teaIntro";

export type TeaHouseEntrySpeaker = "narration" | "꽃돼지?" | "연이";

export type TeaHouseEntryActor = "none" | "pig" | "transform" | "yeoni" | "tea";

export type TeaHouseEntryLine = {
  speaker: TeaHouseEntrySpeaker;
  text: string;
  cta?: string;
  mood?: YeoniMood;
};

export type TeaHouseEntrySceneData = {
  stage: TeaHouseEntryStage;
  eyebrow: string;
  title: string;
  actor: TeaHouseEntryActor;
  background: "interior1" | "interior2";
  lines: TeaHouseEntryLine[];
};

export const teaHouseEntryScenes: TeaHouseEntrySceneData[] = [
  {
    stage: "doorOpened",
    eyebrow: "문 안쪽으로 번지는 달빛",
    title: "찻집 안으로 들어섭니다",
    actor: "none",
    background: "interior1",
    lines: [
      {
        speaker: "narration",
        text: "문이 열리자, 바깥의 골목 소리가 조용히 멀어집니다.\n찻집 안쪽에는 달빛을 머금은 찻잔들이 은은하게 빛나고 있습니다.",
        cta: "안으로 들어가기",
      },
    ],
  },
  {
    stage: "pigGreeting",
    eyebrow: "작고 둥근 인기척",
    title: "꽃돼지?가 당신을 바라봅니다",
    actor: "pig",
    background: "interior1",
    lines: [
      {
        speaker: "꽃돼지?",
        text: "꿀… 오늘은 그냥 지나칠 수 없는 마음이네.",
        cta: "인사하기",
        mood: "welcome",
      },
      {
        speaker: "꽃돼지?",
        text: "여긴 아무나 들어오는 곳이 아니야.\n마음속에 오래 머문 질문이 있는 사람만 이 문을 찾게 되거든.",
        cta: "계속 듣기",
        mood: "thinking",
      },
    ],
  },
  {
    stage: "pigDialogue",
    eyebrow: "마음의 향을 읽는 시간",
    title: "말보다 먼저 도착한 마음",
    actor: "pig",
    background: "interior1",
    lines: [
      {
        speaker: "꽃돼지?",
        text: "네 마음에서는 여러 향이 나.\n조금 달고, 조금 쓰고, 조금은 참고 있는 향.",
        cta: "가만히 듣기",
        mood: "thinking",
      },
      {
        speaker: "꽃돼지?",
        text: "괜찮아.\n여기서는 잘 말하지 못해도 돼.\n마음은 말보다 먼저 찻잔 위에 도착하니까.",
        cta: "찻집 안쪽으로",
        mood: "comfort",
      },
    ],
  },
  {
    stage: "transformPreview",
    eyebrow: "연꽃잎이 떠오르는 순간",
    title: "달빛이 모습을 바꿉니다",
    actor: "transform",
    background: "interior2",
    lines: [
      {
        speaker: "narration",
        text: "찻잔 위로 달빛이 고이고,\n연꽃잎들이 한 번 크게 빛납니다.",
        cta: "연이를 만난다",
      },
    ],
  },
  {
    stage: "yeoniReveal",
    eyebrow: "찻잔 너머로 드러난 이름",
    title: "연이가 당신을 맞이합니다",
    actor: "yeoni",
    background: "interior2",
    lines: [
      {
        speaker: "연이",
        text: "어서 와요. 저는 연이예요.\n아까의 꽃돼지?도 저예요. 조금 당황스러웠나요?",
        cta: "연이 바라보기",
        mood: "welcome",
      },
      {
        speaker: "연이",
        text: "제 본모습은 조금 작고, 둥글고, 가끔 꿀 냄새에 약하지만…\n사람의 마음에서 나는 운명의 향을 읽는 데에는 꽤 자신이 있답니다.",
        cta: "고개 끄덕이기",
        mood: "playful",
      },
      {
        speaker: "연이",
        text: "그러니까 지금부터는 편하게 말해도 돼요.\n저는 당신의 이야기를 판단하러 온 게 아니에요.",
        cta: "찻잔을 보기",
        mood: "comfort",
      },
    ],
  },
  {
    stage: "teaIntro",
    eyebrow: "오늘의 답을 담을 찻잔",
    title: "먼저 차를 한 잔 골라볼까요?",
    actor: "tea",
    background: "interior2",
    lines: [
      {
        speaker: "연이",
        text: "이제부터는 당신의 사주 흐름과, 지금 이 질문에 떠오르는 타로의 상징을 함께 읽어볼 거예요.\n둘은 따로 말하지 않고, 한 잔의 차 안에서 같은 방향을 비춥니다.",
        cta: "상담 방식 듣기",
        mood: "gentle",
      },
      {
        speaker: "연이",
        text: "먼저 차를 한 잔 골라볼까요?\n어떤 찻잔을 고르느냐에 따라, 오늘 당신의 고민을 비추는 달빛의 방향이 달라진답니다.",
        cta: "찻잔 고르러 가기",
        mood: "closing",
      },
    ],
  },
] as const;

export const flowerPigIdleLines: TeaHouseEntryLine[] = [
  {
    speaker: "꽃돼지?",
    text: "꿀… 기다리는 동안에도 찻잔은 조금씩 밝아져.\n마음이 천천히 도착하는 속도라면, 그 속도가 오늘의 답이야.",
    mood: "comfort",
  },
  {
    speaker: "꽃돼지?",
    text: "방금 달빛이 살짝 흔들렸어.\n누군가 숨겨 둔 말을 꺼낼 준비를 할 때, 찻집은 먼저 알아차리거든.",
    mood: "thinking",
  },
  {
    speaker: "꽃돼지?",
    text: "꿀 냄새가 나는 고민은 대체로 마음이 아직 포기하지 않았다는 뜻이야.\n나는 그런 마음을 꽤 좋아해.",
    mood: "playful",
  },
  {
    speaker: "꽃돼지?",
    text: "말을 고르지 못해도 괜찮아.\n이곳에서는 침묵도 찻잎처럼 천천히 우러나와.",
    mood: "comfort",
  },
  {
    speaker: "꽃돼지?",
    text: "저 문 너머에는 답보다 먼저 온기가 있어.\n차가 식기 전에, 너의 마음도 조금은 편해졌으면 좋겠어.",
    mood: "welcome",
  },
  {
    speaker: "꽃돼지?",
    text: "가끔은 아주 작은 망설임 하나가 큰 방향을 바꿔.\n그래서 나는 손님의 첫 숨을 오래 듣는 편이야.",
    mood: "thinking",
  },
  {
    speaker: "꽃돼지?",
    text: "지금 반짝인 찻잔 봤어?\n아직 고르지 않았는데도, 너를 알아보려는 빛이 먼저 움직였어.",
    mood: "surprised",
  },
  {
    speaker: "꽃돼지?",
    text: "꿀… 오늘의 밤은 조금 다정해.\n그래도 너무 빨리 괜찮아지려고 애쓰지는 마.",
    mood: "comfort",
  },
];

export const teaHouseEntryStageOrder = teaHouseEntryScenes.map((scene) => scene.stage);

export function isTeaHouseEntryStage(stage: string): stage is TeaHouseEntryStage {
  return teaHouseEntryStageOrder.includes(stage as TeaHouseEntryStage);
}

export function getTeaHouseEntryScene(stage: TeaHouseEntryStage) {
  return teaHouseEntryScenes.find((scene) => scene.stage === stage) || teaHouseEntryScenes[0]!;
}

export function getNextTeaHouseEntryStage(stage: TeaHouseEntryStage) {
  const currentIndex = teaHouseEntryStageOrder.indexOf(stage);
  return teaHouseEntryStageOrder[currentIndex + 1] || null;
}

export function getPreviousTeaHouseEntryStage(stage: TeaHouseEntryStage) {
  const currentIndex = teaHouseEntryStageOrder.indexOf(stage);
  return currentIndex > 0 ? teaHouseEntryStageOrder[currentIndex - 1] : null;
}
