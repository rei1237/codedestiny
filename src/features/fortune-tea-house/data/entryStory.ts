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

/**
 * 🔴 마스코트가 말하는 줄은 `mood` 가 필수다. `story.ts` 의 `TeaHouseStoryStep` 과 같은 계약이고
 * 이유도 같다 — 표정을 대사의 한국어 키워드로 되추측하던 코드를 없앴으므로, mood 가 비면 그 줄은
 * 조용히 기본 표정으로 주저앉는다(에러도 테스트 실패도 없다). 대사를 로케일화하면 되추측할
 * 단서조차 사라지므로 타입으로 막는다.
 *
 * 나레이션은 마스코트를 그리지 않으므로 mood 를 갖지 않는다(`never` 로 막아, 붙여도 의미가
 * 없다는 것이 타입에 드러나게 한다).
 */
export type TeaHouseEntryLine =
  | {
      speaker: "narration";
      text: string;
      cta?: string;
      mood?: never;
    }
  | {
      speaker: Exclude<TeaHouseEntrySpeaker, "narration">;
      text: string;
      cta?: string;
      mood: YeoniMood;
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
        text: "문이 밀리자, 바깥 골목의 소리가 찻잎처럼 천천히 가라앉습니다.\n달빛은 먼지 하나까지 조용히 비추고, 오래 닫혀 있던 마음의 숨결이 안쪽으로 스며듭니다.",
        cta: "안으로 들어가기",
      },
      {
        speaker: "narration",
        text: "테이블마다 아직 손대지 않은 찻잔들이 놓여 있습니다.\n잔마다 다른 빛이 떠 있고, 그 빛은 당신이 미처 이름 붙이지 못한 질문을 기다리는 듯합니다. 사랑과 일, 돈과 마음의 회복처럼 서로 다른 밤의 주제가 잔마다 조용히 머물러 있습니다.",
        cta: "조심히 둘러보기",
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
        text: "드디어 왔네.\n문이 먼저 네 한숨을 알아보고 열렸어. 운명의 찻집은 오래 품은 질문을 찻잔 위에 내려놓는 사람에게만 조용히 문을 열어.",
        cta: "인사하기",
        mood: "welcome",
      },
      {
        speaker: "꽃돼지?",
        text: "나? 이 찻집의 문지기이자 첫 안내자.\n다들 나를 꽃돼지라고 부르지만, 사실 내 진짜 이름은 연이야.",
        cta: "꽃돼지? 바라보기",
        mood: "playful",
      },
      {
        speaker: "꽃돼지?",
        text: "여긴 아무나 들어오는 곳이 아니야.\n마음속에 오래 머문 질문이 있고, 그 질문을 더는 혼자만 데리고 있기 어려운 사람만 이 문을 찾게 되거든.",
        cta: "계속 들어보기",
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
        text: "네 마음에서는 여러 향이 나.\n조금 달고, 조금 쓰고, 조금은 끝까지 참고 있는 향.",
        cta: "가만히 듣기",
        mood: "thinking",
      },
      {
        speaker: "꽃돼지?",
        text: "말하지 못한 이름도 있고, 보내지 못한 문장도 있고, 괜찮은 척 접어 둔 기대도 있네.\n이곳에서는 그런 마음을 차와 카드, 사주와 인연의 흐름에 비추어 한 겹씩 읽어.",
        cta: "숨 고르기",
        mood: "comfort",
      },
      {
        speaker: "꽃돼지?",
        text: "괜찮아.\n여기서는 잘 말하지 못해도 돼.\n마음은 말보다 먼저 찻잔 위에 도착하고, 연이는 그 미세한 떨림부터 읽으니까.",
        cta: "조용히 바라보기",
        mood: "comfort",
      },
      {
        speaker: "꽃돼지?",
        text: "다만 이 향을 끝까지 읽으려면, 나도 잠깐 본래의 결로 돌아가야 해.\n달빛이 찻잔에 닿는 순간, 네 마음의 방향이 더 또렷하게 들리거든.",
        cta: "달빛에 맡기기",
        mood: "gentle",
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
        text: "찻잔 위로 은은한 달빛이 쏟아지자, 꽃돼지의 작은 몸이 부드러운 빛에 감싸입니다.\n둥글던 몸이 빛 속에서 천천히, 사람의 모습으로 바뀌어 갑니다.",
        cta: "달빛을 바라보기",
      },
      {
        speaker: "narration",
        text: "빛이 걷히자 그 자리에는 긴 머리를 늘어뜨린 아름다운 여성이 서 있습니다.\n방금까지 꽃돼지였다는 게 믿기지 않을 만큼, 우아하고 차분한 모습입니다.",
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
        text: "어서 와요. 저는 연이예요.\n아까의 꽃돼지?도 저예요. 조금 놀랐다면, 찻잔이 먼저 웃은 셈으로 해둘게요.",
        cta: "연이 바라보기",
        mood: "welcome",
      },
      {
        speaker: "연이",
        text: "문 앞에서는 조금 작고 둥근 모습으로 손님의 첫 숨을 살피지만…\n사람의 마음에서 피어나는 운명의 향을 읽는 데에는 꽤 오래 마음을 들여 왔답니다.",
        cta: "고개 끄덕이기",
        mood: "playful",
      },
      {
        speaker: "연이",
        text: "당신이 가져온 질문은 단순한 고민이 아니라, 이미 안쪽에서 답을 찾기 시작한 마음의 움직임이에요.\n연이는 그 흐름을 겁주지 않고, 부드럽지만 선명하게 비춰 드릴게요.",
        cta: "마음 맡기기",
        mood: "comfort",
      },
      {
        speaker: "연이",
        text: "그러니까 지금부터는 편하게 말해도 돼요.\n저는 당신의 이야기를 판단하러 온 게 아니라, 당신이 다시 자기 마음을 믿을 수 있도록 옆에 앉으러 온 거예요.",
        cta: "찻잔을 보기",
        mood: "gentle",
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
        text: "이제부터는 타로와 사주, 그리고 인연의 흐름 중 오늘 가장 필요한 길을 직접 골라볼 거예요.\n어느 길을 열든, 연이는 선택한 상징을 따라 깊고 차분하게 읽어드립니다.",
        cta: "상담 방식 듣기",
        mood: "gentle",
      },
      {
        speaker: "연이",
        text: "먼저 차를 한 잔 골라볼까요?\n어떤 찻잔을 고르느냐에 따라, 오늘 당신의 고민을 비추는 달빛의 결이 조금씩 달라진답니다.",
        cta: "찻잔 살펴보기",
        mood: "welcome",
      },
      {
        speaker: "연이",
        text: "답을 억지로 정하지 않아도 괜찮아요.\n손끝이 머무는 잔, 눈길이 오래 가는 빛, 이유 없이 마음이 놓이는 향이 오늘의 문을 열어 줄 거예요.",
        cta: "찻잔 고르러 가기",
        mood: "closing",
      },
    ],
  },
] as const;

export const flowerPigIdleLines: TeaHouseEntryLine[] = [
  {
    speaker: "꽃돼지?",
    text: "기다리는 동안에도 찻잔은 조금씩 밝아져.\n마음이 천천히 도착하는 속도라면, 그 속도도 오늘의 답에 가까워.",
    mood: "comfort",
  },
  {
    speaker: "꽃돼지?",
    text: "방금 달빛이 살짝 흔들렸어.\n누군가 꺼내지 못한 말을 마음속으로 만지작거릴 때, 찻집은 먼저 알아차리거든.",
    mood: "thinking",
  },
  {
    speaker: "꽃돼지?",
    text: "오래 남아 있는 고민은 대체로 마음이 아직 포기하지 않았다는 뜻이야.\n나는 그런 마음을 꽤 좋아해. 이 찻집은 바로 그런 진심을 억지로 밀어내지 않고, 천천히 읽어 주는 곳이거든.",
    mood: "playful",
  },
  {
    speaker: "꽃돼지?",
    text: "말을 고르지 못해도 괜찮아.\n이곳에서는 침묵도 찻잎처럼 천천히 우러나와. 급하게 삼키면 향을 놓치거든.",
    mood: "comfort",
  },
  {
    speaker: "꽃돼지?",
    text: "저 문 너머에는 답보다 먼저 온기가 있어.\n차가 식기 전에, 네 마음도 조금은 덜 단단해졌으면 좋겠어.",
    mood: "welcome",
  },
  {
    speaker: "꽃돼지?",
    text: "가끔은 아주 작은 망설임 하나가 큰 방향을 바꿔.\n그래서 나는 손님의 첫 숨을 오래 듣는 편이야. 숨은 거짓말을 잘 못하거든.",
    mood: "thinking",
  },
  {
    speaker: "꽃돼지?",
    text: "지금 반짝인 찻잔 봤어?\n아직 고르지 않았는데도, 너를 알아보려는 빛이 먼저 움직였어. 꽤 예의 바른 빛이지?",
    mood: "surprised",
  },
  {
    speaker: "꽃돼지?",
    text: "오늘의 밤은 조금 다정해.\n그래도 너무 빨리 괜찮아지려고 애쓰지는 마. 마음도 데우는 시간이 필요해.",
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
