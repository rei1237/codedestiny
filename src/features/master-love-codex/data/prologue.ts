/**
 * 마스터 인연의 서 — 프롤로그 스크립트.
 *
 * 운명 찻집(entryStory.ts)의 2단 구조(씬 배열 → 라인 배열)를 그대로 따른다.
 * 프롤로그는 전면 무료이며 결제 이전에 재생된다.
 *
 * 🔴 여기 한국어가 ko 정본이다. 다른 로케일은 `CodexPrologueScene` 이 걸어 둔
 * `useCodexContentCopy("prologueScenes"|"prologueChoices", …)` 가 사전
 * (`masterLoveCodex.*`, 저작 정본 `i18n/authored/masterLoveCodex-*.json`)에서 가져간다.
 * 그러니 문장을 고치면 사전 키도 같이 고쳐야 한다 — 안 고치면 한국어만 바뀌고 나머지 11개는
 * 옛 문장을 계속 서빙한다. 배열 순서를 바꾸는 것도 같다(사전 키가 인덱스다).
 */
import type { CodexNarratorMood } from "./assets";

export type CodexPrologueStage =
  | "darkness"
  | "candle"
  | "library"
  | "narratorEnter"
  | "sajuChart"
  | "ziweiChart"
  | "crossCheck"
  | "question"
  | "bookOpen";

export type CodexPrologueSpeaker = "narration" | "연애 고수";

export type CodexPrologueChoiceKey = "yes" | "unsure" | "partner" | "self";

export type CodexPrologueLine = {
  speaker: CodexPrologueSpeaker;
  text: string;
  /** 대사창 하단 진행 버튼 문구 */
  cta?: string;
  mood?: CodexNarratorMood;
};

export type CodexPrologueSceneData = {
  stage: CodexPrologueStage;
  eyebrow: string;
  title: string;
  /** none = 화자 미등장(암전·촛불·서가만) */
  actor: "none" | "narrator" | "book";
  background: "library" | "libraryDeep";
  /** 별빛·촛불 등 연출 강도 */
  effect: "stars" | "candle" | "reveal" | "none";
  lines: CodexPrologueLine[];
};

export const codexPrologueChoices: readonly { key: CodexPrologueChoiceKey; label: string; reply: string }[] = [
  {
    key: "yes",
    label: "네, 알고 싶습니다.",
    reply: "분명하시군요. 그러면 위로부터 시작하지 않겠습니다. 근거부터 보여 드리죠.",
  },
  {
    key: "unsure",
    label: "아직 잘 모르겠습니다.",
    reply: "모르겠다는 말은 아무것도 없다는 뜻이 아닙니다. 아직 이름을 못 붙였을 뿐이지요.",
  },
  {
    key: "partner",
    label: "상대방이 궁금합니다.",
    reply: "그 사람 이야기를 하겠습니다. 다만 마지막에는 반드시 당신에게로 돌아옵니다.",
  },
  {
    key: "self",
    label: "제 자신을 알고 싶습니다.",
    reply: "가장 오래 걸리지만 가장 오래 남는 답을 고르셨습니다. 그러면 당신부터 읽겠습니다.",
  },
] as const;

export const codexPrologueScenes: readonly CodexPrologueSceneData[] = [
  {
    stage: "darkness",
    eyebrow: "불이 꺼진 자리",
    title: "어둠 속에서 별이 하나씩 켜집니다",
    actor: "none",
    background: "libraryDeep",
    effect: "stars",
    lines: [
      {
        speaker: "narration",
        text: "아무것도 보이지 않습니다.\n그러다 눈이 어둠에 익을 무렵, 머리 위로 별이 하나씩 켜지기 시작합니다.",
        cta: "눈을 뜨기",
      },
      {
        speaker: "narration",
        text: "별들은 무작위로 흩어진 것이 아니었습니다.\n하나하나 이어지며, 아주 큰 책의 윤곽을 그려 냅니다.",
        cta: "별을 따라가기",
      },
    ],
  },
  {
    stage: "candle",
    eyebrow: "따뜻한 불빛 하나",
    title: "멀리서 촛불이 다가옵니다",
    actor: "none",
    background: "libraryDeep",
    effect: "candle",
    lines: [
      {
        speaker: "narration",
        text: "어둠 저편에서 작은 불빛이 흔들립니다.\n누군가 촛대를 들고 이쪽으로 걸어오고 있습니다.",
        cta: "기다리기",
      },
      {
        speaker: "narration",
        text: "발소리가 멎습니다.\n불빛이 닿은 자리에, 끝이 보이지 않는 책장이 드러납니다.",
        cta: "고개를 들기",
      },
    ],
  },
  {
    stage: "library",
    eyebrow: "끝이 보이지 않는 서가",
    title: "신비의 도서관",
    actor: "none",
    background: "library",
    effect: "reveal",
    lines: [
      {
        speaker: "narration",
        text: "천장까지 닿은 책장에는 수많은 책이 꽂혀 있습니다.\n등마다 사람의 이름이 하나씩 새겨져 있습니다.",
        cta: "책등을 살펴보기",
      },
      {
        speaker: "narration",
        text: "그중 한 칸만 비어 있습니다.\n아직 쓰이지 않은 책이 놓일 자리입니다.",
        cta: "빈자리를 바라보기",
      },
    ],
  },
  {
    stage: "narratorEnter",
    eyebrow: "수십 년째 사람의 연애를 읽어 온 사람",
    title: "연애 고수가 당신을 맞이합니다",
    actor: "narrator",
    background: "library",
    effect: "reveal",
    lines: [
      { speaker: "연애 고수", text: "오셨군요.", cta: "인사하기", mood: "calm" },
      {
        speaker: "연애 고수",
        text: "여기 있는 책은 전부 누군가의 사랑에 대한 기록입니다.\n제가 수십 년 동안 읽고, 듣고, 받아 적은 것들이지요.",
        cta: "둘러보기",
        mood: "speaking",
      },
      {
        speaker: "연애 고수",
        text: "그런데 저 한 칸만 비어 있습니다.\n아직 아무도 당신의 이야기를 읽은 적이 없어서요.",
        cta: "빈 칸을 보기",
        mood: "base",
      },
    ],
  },
  {
    stage: "sajuChart",
    eyebrow: "첫 번째 두루마리",
    title: "사주는 당신이 어떤 사람인지를 말합니다",
    actor: "narrator",
    background: "library",
    effect: "reveal",
    lines: [
      {
        speaker: "연애 고수",
        text: "고수가 책상 위에 두루마리 하나를 펼칩니다.\n적힌 것은 여덟 글자뿐입니다. 태어난 해와 달, 날과 시각이 각각 두 글자씩.",
        cta: "들여다보기",
        mood: "speaking",
      },
      {
        speaker: "연애 고수",
        text: "여기서 당신의 연애 기질이 나옵니다.\n먼저 다가가는 사람인지 기다리는 사람인지, 마음이 식는 속도가 빠른지 느린지 — 일간과 십성, 오행의 무게가 말해 줍니다.",
        cta: "두 번째 두루마리를 보기",
        mood: "speakingAlt",
      },
    ],
  },
  {
    stage: "ziweiChart",
    eyebrow: "두 번째 두루마리",
    title: "자미두수는 그 사람이 어디에 놓였는지를 봅니다",
    actor: "narrator",
    background: "library",
    effect: "reveal",
    lines: [
      {
        speaker: "연애 고수",
        text: "두 번째 두루마리에는 글자 대신 원이 하나 그려져 있습니다.\n그 원은 열두 칸으로 나뉘어 있고, 칸마다 별이 앉아 있습니다.",
        cta: "열두 칸을 보기",
        mood: "speaking",
      },
      {
        speaker: "연애 고수",
        text: "명궁·부부궁·복덕궁·천이궁 — 칸마다 이름이 있습니다.\n어떤 사람이 배우자 자리에 오는지, 인연이 어느 문에서 열리는지는 이 칸들이 말해 줍니다.",
        cta: "두 두루마리를 나란히 두기",
        mood: "base",
      },
    ],
  },
  {
    stage: "crossCheck",
    eyebrow: "두 장을 겹쳐 놓는 이유",
    title: "한 장만 보면 반드시 놓치는 자리가 생깁니다",
    actor: "narrator",
    background: "libraryDeep",
    effect: "reveal",
    lines: [
      {
        speaker: "연애 고수",
        text: "사주로는 표현이 적은 기질로 읽히는데, 명반의 부부궁은 환하게 서 있는 사람이 있습니다.\n어느 쪽이 틀린 게 아닙니다. 두 장이 서로 다른 층을 보고 있는 겁니다.",
        cta: "왜 그런지 듣기",
        mood: "speakingAlt",
      },
      {
        speaker: "연애 고수",
        text: "그래서 저는 두 장을 늘 겹쳐 놓습니다.\n같은 말을 하는 자리는 확신을 갖고 말씀드리고, 엇갈리는 자리는 왜 엇갈리는지까지 짚습니다. 스무 장 중 한 장은 이 대조에만 씁니다.",
        cta: "약속받기",
        mood: "speaking",
      },
      {
        speaker: "연애 고수",
        text: "다만 약속드리지 못하는 것도 있습니다.\n저는 정해진 결말을 모릅니다. 이 책이 하는 일은 당신이 사랑에서 반복하는 방식을 근거와 함께 보여 드리는 것까지입니다.",
        cta: "그걸로 충분합니다",
        mood: "calm",
      },
    ],
  },
  {
    stage: "question",
    eyebrow: "먼저 하나만 묻겠습니다",
    title: "당신은 사람의 마음을 알고 싶으신가요?",
    actor: "narrator",
    background: "library",
    effect: "none",
    lines: [
      {
        speaker: "연애 고수",
        text: "책을 펼치기 전에 하나만 묻겠습니다.\n당신은 사람의 마음을 알고 싶으신가요?",
        mood: "speakingAlt",
      },
    ],
  },
  {
    stage: "bookOpen",
    eyebrow: "이제 시작합니다",
    title: "책이 열립니다",
    actor: "book",
    background: "library",
    effect: "reveal",
    lines: [
      {
        speaker: "연애 고수",
        text: "그러면 우선 당신의 운명부터 읽겠습니다.\n명식과 명반을 함께 펼쳐 두고, 스무 장에 걸쳐 천천히 짚어 드리지요.",
        cta: "생년 정보 입력하기",
        mood: "speaking",
      },
    ],
  },
] as const;

export const codexPrologueStageOrder = codexPrologueScenes.map((scene) => scene.stage);

export function isCodexPrologueStage(value: string): value is CodexPrologueStage {
  return (codexPrologueStageOrder as readonly string[]).includes(value);
}

export function getNextCodexPrologueStage(stage: CodexPrologueStage): CodexPrologueStage | null {
  const index = codexPrologueStageOrder.indexOf(stage);
  if (index < 0 || index >= codexPrologueStageOrder.length - 1) return null;
  return codexPrologueStageOrder[index + 1];
}
