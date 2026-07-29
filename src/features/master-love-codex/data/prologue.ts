/**
 * 마스터 인연의 서 — 프롤로그 스크립트.
 *
 * 운명 찻집(entryStory.ts)의 2단 구조(씬 배열 → 라인 배열)를 그대로 따른다.
 * 프롤로그는 전면 무료이며 결제 이전에 재생된다.
 */
import type { CodexNarratorMood } from "./assets";

export type CodexPrologueStage =
  | "darkness"
  | "candle"
  | "library"
  | "narratorEnter"
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

export function getCodexPrologueScene(stage: CodexPrologueStage) {
  return codexPrologueScenes.find((scene) => scene.stage === stage) || codexPrologueScenes[0];
}

export function getNextCodexPrologueStage(stage: CodexPrologueStage): CodexPrologueStage | null {
  const index = codexPrologueStageOrder.indexOf(stage);
  if (index < 0 || index >= codexPrologueStageOrder.length - 1) return null;
  return codexPrologueStageOrder[index + 1];
}
