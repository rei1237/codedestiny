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
    "stage": "doorOpened",
    "eyebrow": "달빛 골목의 마지막 불빛",
    "title": "달빛 골목의 마지막 불빛",
    "actor": "none",
    "background": "interior1",
    "lines": [
      {
        "speaker": "narration",
        "text": "돌아가는 길을 조금 벗어났을 뿐인데, 처음 보는 골목이 나타났다. 낮은 담장 너머로 꽃향기와 차 끓는 소리가 흘러왔다."
      },
      {
        "speaker": "narration",
        "text": "문패에는 ‘운명의 찻집’이라고 적혀 있었다. 문 아래로 새어 나오는 불빛이 신발 끝에 작은 자리를 내어주었다."
      },
      {
        "speaker": "narration",
        "text": "주머니 속 휴대전화가 잠잠해졌다. 보내지 못한 말도, 오늘 내내 미뤄 둔 결정도 여전히 거기 있었다."
      },
      {
        "speaker": "narration",
        "text": "손잡이에 손을 얹자 문이 가볍게 열렸다. 창호 너머 달빛이 식탁을 가로질렀고, 빈 의자 하나가 창가를 향해 놓여 있었다."
      },
      {
        "speaker": "narration",
        "text": "“늦은 시간인데, 들어가도 될까요?”\n대답은 예상보다 훨씬 낮은 곳에서 들려왔다."
      },
      {
        "speaker": "꽃돼지?",
        "text": "물론이죠. 다만 문은 살짝 닫아 주세요. 오늘은 달빛보다 바람이 먼저 들어오려고 하네요.",
        "mood": "closing"
      }
    ]
  },
  {
    "stage": "pigGreeting",
    "eyebrow": "꽃을 단 작은 문지기",
    "title": "꽃을 단 작은 문지기",
    "actor": "pig",
    "background": "interior1",
    "lines": [
      {
        "speaker": "narration",
        "text": "분홍빛 꽃돼지가 의자 뒤에서 고개를 내밀었다. 머리 위 연꽃과 보랏빛 리본이, 방금 본 문패의 무늬와 꼭 닮아 있었다."
      },
      {
        "speaker": "꽃돼지?",
        "text": "놀랐어요? 찻집 주인이 생각보다 작죠. 높은 선반의 찻잎은 조금 곤란하지만, 손님 이야기를 듣는 데에는 문제없어요.",
        "mood": "playful"
      },
      {
        "speaker": "narration",
        "text": "작은 발이 의자를 밀었다. 덜컥, 하고 난 소리에 꽃돼지는 잠깐 귀를 접더니 아무 일도 없었다는 듯 웃었다."
      },
      {
        "speaker": "꽃돼지?",
        "text": "이 자리가 좋아요. 창밖도 볼 수 있고, 말하다 잠깐 쉬어 가기에도 편하거든요.",
        "mood": "thinking"
      },
      {
        "speaker": "꽃돼지?",
        "text": "저는 연이예요. 꽃돼지라고 불러도 괜찮지만, 이름으로 불러 주면 조금 더 기쁠 것 같아요.",
        "mood": "welcome"
      },
      {
        "speaker": "narration",
        "text": "“연이.” 이름을 부르자 리본 끝이 살짝 흔들렸다. 낯선 찻집이, 아주 조금 덜 낯설어졌다."
      }
    ]
  },
  {
    "stage": "pigDialogue",
    "eyebrow": "아직 이름 붙이지 못한 마음",
    "title": "아직 이름 붙이지 못한 마음",
    "actor": "pig",
    "background": "interior1",
    "lines": [
      {
        "speaker": "꽃돼지?",
        "text": "무슨 말을 먼저 해야 할지 모르겠다면, 오늘 하루가 어땠는지부터 시작해도 좋아요.",
        "mood": "gentle"
      },
      {
        "speaker": "narration",
        "text": "괜찮았다고 말하려다가 멈췄다. 익숙한 대답인데, 이 방에서는 조금 다른 말을 해도 될 것 같았다."
      },
      {
        "speaker": "꽃돼지?",
        "text": "사실 저도 기다리는 데 서툴렀어요. 찻물이 끓기도 전에 뚜껑을 열었다가, 향을 다 놓친 날도 있었죠.",
        "mood": "comfort"
      },
      {
        "speaker": "꽃돼지?",
        "text": "그래서 지금은 물이 데워지는 동안 자리를 지켜요. 마음도 그럴 때가 있더라고요. 당장 답을 재촉하지 않아도 되는 시간.",
        "mood": "thinking"
      },
      {
        "speaker": "narration",
        "text": "연이는 질문을 덧붙이지 않았다. 작은 찻숟가락을 내려놓고, 내가 말을 고르는 동안 조용히 기다렸다."
      },
      {
        "speaker": "꽃돼지?",
        "text": "오늘 이곳에서는, 어떤 마음부터 내려놓고 싶어요?",
        "mood": "closing"
      }
    ]
  },
  {
    "stage": "transformPreview",
    "eyebrow": "찻잔에 달이 닿는 순간",
    "title": "찻잔에 달이 닿는 순간",
    "actor": "transform",
    "background": "interior2",
    "lines": [
      {
        "speaker": "꽃돼지?",
        "text": "이제 차를 준비할게요. 조금 놀랄 수도 있지만, 자리를 떠나지는 않을 거예요.",
        "mood": "gentle"
      },
      {
        "speaker": "narration",
        "text": "창호의 그림자가 천천히 움직였다. 찻잔 가장자리에 걸린 달빛이 연이의 연꽃 장식으로 번졌다."
      },
      {
        "speaker": "narration",
        "text": "작은 발끝을 감싼 빛 사이로 긴 옷자락이 내려앉았다. 보랏빛 리본은 풀리지 않은 채, 분홍빛 머리카락 사이에서 다시 흔들렸다."
      },
      {
        "speaker": "narration",
        "text": "빛이 잦아들자 한 여인이 서 있었다. 달라진 모습보다 먼저 알아본 것은, 조금 전 의자를 내어주던 다정한 눈빛이었다."
      },
      {
        "speaker": "연이",
        "text": "아까 인사한 연이예요. 모습은 달라져도, 당신 이야기를 기다리는 마음은 그대로랍니다.",
        "mood": "welcome"
      },
      {
        "speaker": "narration",
        "text": "연이는 높은 선반에서 찻잎 통을 꺼냈다. “이럴 때는 이 모습이 편하죠.” 그 말에, 나도 모르게 웃음이 났다."
      }
    ]
  },
  {
    "stage": "yeoniReveal",
    "eyebrow": "마주 앉은 연이",
    "title": "마주 앉은 연이",
    "actor": "yeoni",
    "background": "interior2",
    "lines": [
      {
        "speaker": "narration",
        "text": "연이는 맞은편에 앉아 찻잔을 돌려놓았다. 꽃이 그려진 면이 내 쪽을 향했다."
      },
      {
        "speaker": "연이",
        "text": "이 찻집에서는 미래를 한 문장으로 정해 드리지는 않아요. 대신 지금의 고민을 여러 각도에서 살펴볼 수 있도록 도와드려요.",
        "mood": "playful"
      },
      {
        "speaker": "연이",
        "text": "타로는 지금의 질문과 카드의 상징을 함께 읽어요. 상대 마음도 확답하기보다, 관계에서 살펴볼 가능성과 선택지를 이야기해요.",
        "mood": "comfort"
      },
      {
        "speaker": "연이",
        "text": "사주는 출생 정보를 바탕으로 기질과 시기의 흐름을 살펴봐요. 익숙하게 반복한 선택을 돌아보는 데에도 도움이 될 수 있어요.",
        "mood": "thinking"
      },
      {
        "speaker": "연이",
        "text": "숙요점은 두 사람의 숙과 관계 방향을 살펴보는 별도의 체계예요. 차를 고른 다음, 오늘 필요한 상담 방식을 직접 선택할 수 있어요.",
        "mood": "welcome"
      },
      {
        "speaker": "연이",
        "text": "무슨 답이 나오든, 당신이 고를 수 있는 길을 남겨둘게요. 자, 이제 오늘의 차를 만나 볼까요?",
        "mood": "closing"
      }
    ]
  },
  {
    "stage": "teaIntro",
    "eyebrow": "오늘의 마음을 담을 여섯 잔",
    "title": "오늘의 마음을 담을 여섯 잔",
    "actor": "tea",
    "background": "interior2",
    "lines": [
      {
        "speaker": "narration",
        "text": "연이가 찻잔 여섯 개를 펼쳤다. 같은 달빛 아래에서도 잔마다 다른 빛깔이 머물렀다."
      },
      {
        "speaker": "연이",
        "text": "달빛 연꽃차는 연애와 재회, 꿀복숭아차는 막 시작되는 설렘을 이야기할 때 어울려요.",
        "mood": "playful"
      },
      {
        "speaker": "연이",
        "text": "별가루 홍차에는 일과 진로의 고민을, 황금 계피차에는 수입과 지출 같은 돈의 고민을 담아 보세요.",
        "mood": "comfort"
      },
      {
        "speaker": "연이",
        "text": "백련 치유차는 지친 마음을 돌아볼 때, 흑월 현미차는 정리와 결단의 기준이 필요할 때 어울려요.",
        "mood": "thinking"
      },
      {
        "speaker": "연이",
        "text": "차는 오늘 이야기할 주제예요. 어떤 운세가 나올지를 정하는 시험은 아니니, 고민에 가까운 잔을 편하게 골라 주세요.",
        "mood": "welcome"
      },
      {
        "speaker": "연이",
        "text": "고른 뒤에도 다른 잔으로 바꿀 수 있어요. 당신 이야기가 시작될 자리를, 함께 골라 볼까요?",
        "mood": "closing"
      }
    ]
  }
];

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
