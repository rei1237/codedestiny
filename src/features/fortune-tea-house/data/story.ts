import { cmsLines, cmsText } from "@/lib/cms/build-text";

import type { PigExpressionId, YeoniMood } from "./yeoniSprites";

export type TeaHouseStage =
  | "landing"
  | "doorOpened"
  | "pigGreeting"
  | "pigDialogue"
  | "transformPreview"
  | "yeoniReveal"
  | "teaIntro"
  | "pigIntro"
  | "transform"
  | "yeoniIntro"
  | "teaSelect"
  | "teaCupRitual"
  | "questionInput"
  | "scentLoading"
  | "tarotReveal"
  | "result";

export type TeaHouseSpeaker = "narration" | "꽃돼지?" | "연이";
export type TeaHouseVisual = "pig" | "transform" | "yeoni" | "tea-house";

type TeaHouseStoryStepBase = {
  id: string;
  stage: TeaHouseStage;
  text: string;
  visual: TeaHouseVisual;
  cta?: string;
};

/**
 * 🔴 마스코트가 말하는 줄은 `mood` 가 필수다.
 *
 * 예전에는 선택 항목이었고, 비어 있으면 컴포넌트가 **대사의 한국어 키워드로 표정을
 * 되추측**했다(꿀 이야기면 honey, 위로하는 말이면 comfort 처럼). 두 가지가 잘못이었다 —
 * 표정은 연출 의도인데 문장에서 역산했고, 대사가 로케일화되는 순간 어떤 키워드도 안 걸려
 * 모든 줄이 기본 표정으로 주저앉는다. 에러도 안 나고 테스트도 안 깨진다.
 *
 * 나레이션은 마스코트를 그리지 않으므로 mood 를 갖지 않는다(`never` 로 막아,
 * 붙여도 의미가 없다는 것이 타입에 드러나게 한다).
 */
export type TeaHouseStoryStep =
  | (TeaHouseStoryStepBase & {
      speaker?: "narration";
      mood?: never;
      pigFrame?: never;
    })
  | (TeaHouseStoryStepBase & {
      speaker: Exclude<TeaHouseSpeaker, "narration">;
      mood: YeoniMood;
      /** mood 로는 모자라는 한 줄만 프레임을 직접 지정한다(예: 찻집 문을 여는 장면). */
      pigFrame?: PigExpressionId;
    });

export const teaHouseStageOrder: TeaHouseStage[] = [
  "landing",
  "doorOpened",
  "pigGreeting",
  "pigDialogue",
  "transformPreview",
  "yeoniReveal",
  "teaIntro",
  "pigIntro",
  "transform",
  "yeoniIntro",
  "teaSelect",
  "teaCupRitual",
  "questionInput",
  "scentLoading",
  "tarotReveal",
  "result",
];

// 랜딩 문구는 관리자 CMS(feature-copy / fortune-tea-house:landing.*)에서 편집할 수 있다.
// 폴백 우선 — CMS 값이 없으면 아래 원문이 그대로 쓰인다.
const teaHouseLandingCopyDefault = {
  eyebrow: "달빛이 닿은 골목 끝",
  title: "운명의 찻집",
  lead: "연이가 달빛 찻잔과 카드, 사주와 인연의 흐름으로 당신의 고민을 차분히 비춰드립니다.",
  prologue: [
    "달빛이 깊은 밤, 당신은 낯선 골목 끝에서 작은 찻집을 발견합니다.",
    "잠들기에는 마음이 너무 시끄럽고, 누군가에게 털어놓기에는 말이 너무 엉켜 있던 밤이었습니다.",
    "휴대폰 화면을 몇 번이고 껐다 켜도, 마음속 질문 하나는 끝내 지워지지 않았습니다.",
    "그 사람은 아직 나를 생각할까. 이 선택을 해도 괜찮을까. 나는 왜 이렇게 자꾸 흔들릴까.",
    "답이 없는 질문들은 밤이 깊어질수록 더 또렷해졌고, 어디선가 아주 작은 종소리가 들려왔습니다.",
    "문 앞에는 연꽃을 머리에 단 꽃돼지?가 앉아 있습니다. 이곳의 첫 문지기이자, 마음이 어떤 찻잔 앞에서 멈추는지 가장 먼저 알아보는 안내자입니다.",
    "꽃돼지?는 당신을 보자마자 코끝을 살짝 움직였습니다. 마치 당신이 말하기도 전에, 마음속 고민이 어떤 향으로 번지는지 먼저 느낀 것처럼요.",
    "문틈 사이로는 따뜻한 차 향이 새어 나왔습니다. 연꽃 향, 오래된 책장 냄새, 그리고 비가 오기 전 밤하늘처럼 조용한 달빛의 향.",
    "운명의 찻집은 마음에 오래 남은 질문을 찻잔 위에 내려놓는 곳입니다. 연애와 재회, 새로운 인연, 진로와 사업, 돈의 흐름, 마음의 회복, 이별과 위기까지 각기 다른 잔이 당신의 밤을 기다립니다.",
    "찻잔 위로 달빛이 차오르는 순간, 꽃돼지?는 인간 모습의 연이로 변신합니다.",
    "운명의 찻집은 단순히 결과를 보여주는 운세가 아닙니다. 당신은 손님이 되고, 연이는 찻집 주인이 되어 고민을 듣고, 찻잔과 카드와 마음의 향을 엮어 조금 더 다정한 답을 건넵니다.",
    "테이블 위에는 여섯 개의 찻잔이 조용히 떠오릅니다. 재회와 인연, 설렘과 가능성, 진로와 사업, 돈의 흐름, 마음의 회복, 그리고 끝내야 할 것을 구분하는 밤의 차가 차례로 빛납니다.",
    "연이는 말합니다. 오늘 필요한 찻잔은 머리보다 마음이 먼저 알아볼 거라고요. 그래서 이곳의 상담은 정답을 명령하지 않고, 당신이 덜 다치는 다음 한 걸음을 함께 비춥니다.",
    "달빛 연꽃차는 아직 끝나지 않은 감정과 재회의 가능성을, 꿀복숭아차는 이름 붙이지 못한 설렘과 새로운 인연의 온도를 읽습니다. 별가루 홍차는 진로와 사업의 방향을, 황금 계피차는 돈의 흐름과 현실적인 기회를 비춥니다.",
    "백련 치유차는 불안과 자존감처럼 오래 눌러둔 마음을 다독이고, 흑월 현미차는 이별과 위기 앞에서 끝내야 할 것과 지켜야 할 것을 구분하게 합니다. 어떤 찻잔을 고르든 연이는 먼저 당신의 마음이 내는 향을 듣습니다.",
    "상담이 시작되면 찻잔 위로 글자와 꽃잎이 떠오르고, 달빛 카드는 천천히 뒤집힙니다. 결과는 겁을 주기 위한 예언이 아니라, 지금 보지 못하고 지나친 마음의 방향을 조금 더 선명하게 보여주는 작은 등불처럼 다가옵니다.",
    "꽃돼지?였던 연이는 당신이 고른 찻잔, 말로 적은 고민, 아직 문장으로 정리하지 못한 감정의 결을 함께 읽습니다. 그래서 같은 질문이라도 어떤 차를 고르느냐에 따라 상담의 시선은 달라지고, 타로 카드의 의미도 다른 온도로 펼쳐집니다.",
    "연애와 재회를 묻는 밤에는 오래 머문 마음의 방향을, 썸과 인연을 묻는 밤에는 아직 이름 붙지 않은 가능성을 조심스럽게 살핍니다. 진로와 사업을 묻는 밤에는 선택 앞에서 흔들리는 이유를, 금전운을 묻는 밤에는 현실의 흐름과 놓치기 쉬운 기회를 비춥니다.",
    "마음 회복을 찾는 손님에게는 스스로를 너무 오래 차갑게 대하지 않도록 다정한 문장을 건네고, 이별과 위기 앞에 선 손님에게는 끝내야 할 것과 아직 지켜도 되는 것을 차분히 나누어 줍니다.",
    "연이는 단정적으로 명령하지 않습니다. 대신 찻잔 위에 떠오른 달빛과 카드의 상징을 따라, 당신이 이미 알고 있었지만 혼자서는 바라보기 어려웠던 마음을 조금 덜 아프게 마주하도록 곁에 앉습니다.",
    "그 순간 이 찻집이 평범한 운세의 방이 아니라, 오직 당신의 밤을 위해 열린 작은 달빛 상담실이라는 것이 조용히 드러납니다. 이곳에서 연이는 손님이 스스로의 마음을 더 분명히 듣도록, 조용하지만 깊은 한 잔을 내어드립니다.",
  ],
  cta: "찻집에 들어가기",
} as const;

export const teaHouseLandingCopy = {
  eyebrow: cmsText("feature-copy", "fortune-tea-house:landing.eyebrow", "text", teaHouseLandingCopyDefault.eyebrow),
  title: cmsText("feature-copy", "fortune-tea-house:landing.title", "text", teaHouseLandingCopyDefault.title),
  lead: cmsText("feature-copy", "fortune-tea-house:landing.lead", "text", teaHouseLandingCopyDefault.lead),
  prologue: cmsLines("feature-copy", "fortune-tea-house:landing.prologue", "lines", [...teaHouseLandingCopyDefault.prologue]),
  cta: cmsText("feature-copy", "fortune-tea-house:landing.cta", "text", teaHouseLandingCopyDefault.cta),
};

export const teaHouseCtaCopyDefault = {
  title: "오늘의 운세를 한 잔 따라볼까요?",
  text: "연이는 찻잔의 온도와 마음의 향을 맞추며, 당신이 꺼내고 싶은 이야기를 조용히 기다립니다.",
  cta: "상담 준비하기",
  reset: "처음 밤으로 돌아가기",
  notice: "찻잔은 아직 따뜻해지는 중이에요. 곧 연이가 이야기를 이어갈게요.",
} as const;

export const teaHouseCtaCopy = {
  title: cmsText("feature-copy", "fortune-tea-house:cta.title", "text", teaHouseCtaCopyDefault.title),
  text: cmsText("feature-copy", "fortune-tea-house:cta.text", "text", teaHouseCtaCopyDefault.text),
  cta: cmsText("feature-copy", "fortune-tea-house:cta.cta", "text", teaHouseCtaCopyDefault.cta),
  reset: cmsText("feature-copy", "fortune-tea-house:cta.reset", "text", teaHouseCtaCopyDefault.reset),
  notice: cmsText("feature-copy", "fortune-tea-house:cta.notice", "text", teaHouseCtaCopyDefault.notice),
};

export const teaHouseFlowCards = [
  {
    id: "cup",
    title: "찻잔 선택",
    text: "마음이 먼저 알아보는 잔을 고릅니다.",
    assetKey: "selection",
  },
  {
    id: "question",
    title: "고민의 향",
    text: "말이 엉켜 있어도 괜찮아요. 연이는 숨은 결을 천천히 읽습니다.",
    assetKey: "bubble",
  },
  {
    id: "emotion",
    title: "마음의 농도",
    text: "달고 쓴 감정의 기울기가 찻물 위에 드러납니다.",
    assetKey: "emotionGauge",
  },
  {
    id: "reading",
    title: "운명의 첫 모금",
    text: "오늘 필요한 한 문장이 따뜻하게 떠오릅니다.",
    assetKey: "buttons",
  },
] as const;

export const teaHouseStorySteps: TeaHouseStoryStep[] = [
  {
    id: "entry-1",
    stage: "pigIntro",
    speaker: "narration",
    visual: "tea-house",
    text: "달빛이 유난히 선명한 밤이었습니다.\n잠들기에는 마음이 너무 시끄럽고, 누군가에게 털어놓기에는 말이 너무 엉켜 있던 밤.",
  },
  {
    id: "entry-2",
    stage: "pigIntro",
    speaker: "narration",
    visual: "tea-house",
    text: "그 사람은 아직 나를 생각할까.\n이 선택을 해도 괜찮을까.\n나는 왜 이렇게 자꾸 흔들릴까.",
  },
  {
    id: "entry-3",
    stage: "pigIntro",
    speaker: "narration",
    visual: "tea-house",
    text: "어디선가 아주 작은 종소리가 들렸습니다.\n딸랑.\n낡은 골목 끝, 평소에는 본 적 없던 좁은 길 하나가 달빛에 젖어 있었습니다.",
  },
  {
    id: "entry-4",
    stage: "pigIntro",
    speaker: "narration",
    visual: "tea-house",
    text: "길 끝에는 작은 찻집이 있었습니다.\n문은 닫혀 있었지만, 창문 안쪽에서는 분홍빛과 금빛이 조용히 흔들렸습니다.",
  },
  {
    id: "entry-5",
    stage: "pigIntro",
    speaker: "narration",
    visual: "tea-house",
    text: "문패에는 이렇게 적혀 있었습니다.\n운명의 찻집\n그리고 그 문 앞에는, 연꽃을 머리에 단 작은 꽃돼지?가 앉아 있었습니다.",
  },
  {
    id: "pig-1",
    stage: "pigIntro",
    speaker: "narration",
    visual: "pig",
    text: "꽃돼지?는 당신을 보자마자 코끝을 살짝 움직였습니다.\n마치 당신이 말하기도 전에, 마음속에 숨겨둔 고민을 먼저 맡아버린 것처럼.",
  },
  {
    id: "pig-2",
    stage: "pigIntro",
    speaker: "꽃돼지?",
    mood: "welcome",
    visual: "pig",
    text: "드디어 왔네.\n오늘은 그냥 지나칠 수 없는 마음이구나.\n여기는 오래 품은 질문을 찻잔 위에 내려놓고, 그 향과 빛으로 다음 길을 읽는 운명의 찻집이야.",
  },
  {
    id: "pig-3",
    stage: "pigIntro",
    speaker: "꽃돼지?",
    mood: "comfort",
    visual: "pig",
    text: "놀랐어? 괜찮아.\n여기 처음 오는 사람들은 다들 그런 표정을 지어.",
  },
  {
    id: "pig-4",
    stage: "pigIntro",
    speaker: "꽃돼지?",
    mood: "gentle",
    pigFrame: "doorway",
    visual: "pig",
    text: "운명의 찻집은 아무 때나 열리지 않아.\n마음속에 오래 머문 질문이 있고, 그 질문을 더는 혼자 들고 있기 어려울 때만 문이 열리거든.",
  },
  {
    id: "pig-5",
    stage: "pigIntro",
    speaker: "꽃돼지?",
    mood: "thinking",
    visual: "pig",
    text: "네 마음에서는 여러 향이 나.\n조금 달고, 조금 쓰고, 조금은 참고 있는 향.\n연이는 그 결을 찻잔과 카드, 사주와 인연의 흐름에 비추어 조심스럽게 읽어.",
  },
  {
    id: "pig-6",
    stage: "pigIntro",
    speaker: "꽃돼지?",
    mood: "thinking",
    visual: "pig",
    text: "아마 누군가를 생각하고 있거나,\n중요한 선택 앞에서 오래 망설이고 있겠지.",
  },
  {
    id: "pig-7",
    stage: "pigIntro",
    speaker: "꽃돼지?",
    mood: "comfort",
    visual: "pig",
    text: "괜찮아. 여기서는 잘 말하지 못해도 돼.\n마음은 말보다 먼저 향으로 도착하니까.",
  },
  {
    id: "door-1",
    stage: "pigIntro",
    speaker: "narration",
    visual: "tea-house",
    text: "꽃돼지?가 문 앞에 놓인 작은 방울을 건드리자, 찻집 문이 천천히 열렸습니다.\n딸랑.",
  },
  {
    id: "door-2",
    stage: "pigIntro",
    speaker: "narration",
    visual: "tea-house",
    text: "안쪽은 생각보다 넓었습니다.\n둥근 테이블 위에는 아직 아무도 마시지 않은 찻잔들이 놓여 있었고, 천장에는 별빛처럼 작은 등불들이 떠 있었습니다.\n잔마다 다른 빛이 고여 있어, 사랑과 일, 돈과 마음처럼 서로 다른 질문을 기다리는 듯했습니다.",
  },
  {
    id: "door-3",
    stage: "pigIntro",
    speaker: "꽃돼지?",
    mood: "gentle",
    visual: "pig",
    text: "여긴 네가 잊고 있던 마음을 잠깐 꺼내놓는 곳이야.",
  },
  {
    id: "door-4",
    stage: "pigIntro",
    speaker: "꽃돼지?",
    mood: "playful",
    visual: "pig",
    text: "그건 곧 알게 될 거야.",
    cta: "변신 보기",
  },
  {
    id: "transform-1",
    stage: "transform",
    speaker: "narration",
    visual: "transform",
    text: "찻잔 위로 작은 달이 떠오릅니다.\n달빛은 물결처럼 번져 테이블을 감싸고, 카드와 찻잎, 꽃잎들이 천천히 공중으로 떠오릅니다.",
  },
  {
    id: "transform-2",
    stage: "transform",
    speaker: "꽃돼지?",
    mood: "playful",
    visual: "transform",
    text: "손님을 제대로 맞이할 때는,\n나도 조금 다른 모습이 필요하거든.",
  },
  {
    id: "transform-3",
    stage: "transform",
    speaker: "꽃돼지?",
    mood: "gentle",
    visual: "transform",
    text: "놀라지 마.\n처음부터 너를 기다리고 있었으니까.",
    cta: "연이를 만난다",
  },
  {
    id: "transform-4",
    stage: "transform",
    speaker: "narration",
    visual: "transform",
    text: "달빛이 한 번 크게 흔들립니다.\n연꽃잎들이 흰 안개처럼 피어오르고, 그 안에서 작은 꽃돼지?의 모습이 서서히 사라집니다.",
  },
  {
    id: "yeoni-1",
    stage: "yeoniIntro",
    speaker: "narration",
    visual: "yeoni",
    text: "달빛이 한 번 크게 흔들리는 순간, 작은 꽃돼지?의 모습은 꽃잎 사이로 사라집니다.",
  },
  {
    id: "yeoni-2",
    stage: "yeoniIntro",
    speaker: "narration",
    visual: "yeoni",
    text: "꽃잎 사이에서 작은 그림자가 사라지고, 긴 분홍빛 머리카락을 가진 소녀가 조용히 서 있습니다.",
  },
  {
    id: "yeoni-3",
    stage: "yeoniIntro",
    speaker: "연이",
    visual: "yeoni",
    mood: "welcome",
    text: "어서 와요. 저는 연이예요.",
  },
  {
    id: "yeoni-4",
    stage: "yeoniIntro",
    speaker: "연이",
    visual: "yeoni",
    mood: "playful",
    text: "방금 본 꽃돼지?가 신경 쓰이나요?\n괜찮아요. 운명의 찻집에서는 문을 지키는 모습과 상담을 여는 모습이 조금 다르게 드러나거든요.",
  },
  {
    id: "yeoni-5",
    stage: "yeoniIntro",
    speaker: "연이",
    visual: "yeoni",
    mood: "gentle",
    text: "맞아요. 아까의 꽃돼지?도 저예요.",
  },
  {
    id: "yeoni-6",
    stage: "yeoniIntro",
    speaker: "연이",
    visual: "yeoni",
    mood: "playful",
    text: "문 앞에서는 작고 둥근 모습으로 손님의 첫 숨을 살피고,\n이 안에서는 연이의 모습으로 당신의 질문을 마주하지만…",
  },
  {
    id: "yeoni-7",
    stage: "yeoniIntro",
    speaker: "연이",
    visual: "yeoni",
    mood: "welcome",
    text: "사람의 마음에서 나는 운명의 향을 읽는 데에는 꽤 자신이 있답니다.",
  },
  {
    id: "yeoni-8",
    stage: "yeoniIntro",
    speaker: "연이",
    visual: "yeoni",
    mood: "serious",
    text: "사람들은 꽃돼지?에게 고민을 털어놓는 것보다,\n사람의 눈을 마주 보고 말할 때 조금 더 솔직해지기도 하거든요.",
  },
  {
    id: "yeoni-9",
    stage: "yeoniIntro",
    speaker: "연이",
    visual: "yeoni",
    mood: "comfort",
    text: "하지만 걱정하지 마세요.\n저는 당신의 이야기를 판단하러 온 게 아니에요.",
  },
  {
    id: "yeoni-10",
    stage: "yeoniIntro",
    speaker: "연이",
    visual: "yeoni",
    mood: "comfort",
    text: "당신이 이미 오래 품고 있던 마음을,\n조금 덜 아프게 바라볼 수 있도록 도와드리려는 거예요.",
  },
  {
    id: "yeoni-11",
    stage: "yeoniIntro",
    speaker: "연이",
    visual: "yeoni",
    mood: "gentle",
    text: "앉으세요. 이 찻집에서는 급하게 말할 필요가 없어요.\n이곳에서는 당신이 고른 차가 오늘의 운명을 비춰준답니다. 어떤 잔 앞에서 마음이 멈추는지 천천히 바라봐 주세요.",
    cta: "찻잔 고르러 가기",
  },
];

export function getTeaHouseSteps(stage: TeaHouseStage) {
  return teaHouseStorySteps.filter((step) => step.stage === stage);
}
