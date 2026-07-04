import type { NeoWarRoomConsultMode } from "./assets";
import type { NeoWarRoomIntensityId } from "./input-flow";
import type { NeoWarRoomEmotionState } from "./sprite-states";

export type NeoDialogueCategory =
  | "hero"
  | "entrance"
  | "methodSelect"
  | "topicSelect"
  | "birthCheck"
  | "intensitySelect"
  | "questionInput"
  | "loading"
  | "initialResult"
  | "realityCheck"
  | "refinedResult"
  | "badge"
  | "closing"
  | "error";

export type NeoOperationDialogue = {
  key: string;
  category: NeoDialogueCategory;
  text: string;
  emotionState: NeoWarRoomEmotionState;
  spriteFrame?: number;
};

type DialogueMap = Record<string, NeoOperationDialogue[]>;

function dialogue(
  key: string,
  category: NeoDialogueCategory,
  text: string,
  emotionState: NeoWarRoomEmotionState,
  spriteFrame?: number,
): NeoOperationDialogue {
  return { key, category, text, emotionState, spriteFrame };
}

export const neoOperationDialogues = {
  hero: [
    dialogue("hero.core", "hero", "위로보다 진단, 감정보다 작전.", "welcome", 1),
    dialogue("hero.pattern", "hero", "운명이 막힌 게 아니다. 네가 같은 선택 앞에서 계속 멈추고 있는 거다.", "blunt", 2),
    dialogue("hero.seal", "hero", "사자 휘장을 들어라. 오늘은 네 운명의 자세를 다시 본다.", "encouragement", 3),
  ],
  entrance: [
    dialogue("entrance.first", "entrance", "왔냐. 위로받으러 온 거면 길을 잘못 들었다. 그래도 앉아라.", "welcome", 1),
    dialogue("entrance.room", "entrance", "여긴 네가 망친 선택, 모른 척한 패턴, 계속 반복한 회피를 찾는 작전실이다.", "blunt", 2),
    dialogue("entrance.ready", "entrance", "무서워할 필요는 없다. 널 부수려는 게 아니라, 네가 스스로를 망치는 방식을 부수려는 거니까.", "encouragement", 3),
  ],
  methodSelect: {
    default: [
      dialogue("method.default", "methodSelect", "어떤 전선부터 볼 거냐. 사주, 자미두수, 베다점, 점성술. 보는 지도는 달라도 목적은 하나다.", "curious", 2),
    ],
    saju: [
      dialogue("method.saju", "methodSelect", "사주로 본다는 건 네 인생의 기본 전투 방식을 보는 거다. 타고난 무기를 제대로 쓰고 있는지 확인하지.", "curious", 3),
    ],
    ziwei: [
      dialogue("method.ziwei", "methodSelect", "자미두수는 인생의 지휘도를 펼치는 방식이다. 어디서 막히고 어디서 힘이 새는지 보겠다.", "analyzing", 4),
    ],
    vedic: [
      dialogue("method.vedic", "methodSelect", "베다점은 네가 반복해서 끌려가는 흐름을 본다. 이상하게 같은 장면으로 돌아간다면 여기서 잡힌다.", "reality_check", 5),
    ],
    astrology: [
      dialogue("method.astrology", "methodSelect", "점성술은 네 마음의 궤도와 선택 습관을 본다. 감정이라고 다 진짜 방향은 아니다.", "curious", 6),
    ],
  } satisfies DialogueMap,
  topicSelect: {
    default: [
      dialogue("topic.default", "topicSelect", "이번 작전의 전선을 골라라. 애매하게 다 괴롭다고 말하면 작전이 아니라 안개가 된다.", "curious", 2),
    ],
    "연애 / 재회": [
      dialogue("topic.love", "topicSelect", "연애 전선이냐. 마음보다 먼저 봐야 할 건 네가 같은 방식으로 흔들리는 이유다.", "blunt", 3),
    ],
    "직업 / 이직": [
      dialogue("topic.career", "topicSelect", "일 문제군. 버티는 건지, 도망치는 건지, 먼저 그 경계부터 자르겠다.", "curious", 4),
    ],
    "돈 / 재물": [
      dialogue("topic.money", "topicSelect", "돈 문제를 감정으로 보면 망한다. 흐름, 습관, 반복 지출부터 본다.", "blunt", 5),
    ],
    인간관계: [
      dialogue("topic.relationship", "topicSelect", "사람 문제군. 관계를 지키고 싶은 건지, 인정받고 싶은 건지부터 분리한다.", "reality_check", 6),
    ],
    "멘탈 / 자기관리": [
      dialogue("topic.mental", "topicSelect", "멘탈이 무너진 게 부끄러운 일은 아니다. 문제는 무너지는 방식을 매번 똑같이 반복하는 거다.", "encouragement", 7),
    ],
    "인생 방향": [
      dialogue("topic.direction", "topicSelect", "방향을 잃은 게 아니다. 나침반을 들고도 계속 눈을 감고 있었을 가능성이 크다.", "curious", 1),
    ],
    "지금 선택": [
      dialogue("topic.choice", "topicSelect", "선택을 묻는 거냐. 좋다. 원하는 답과 필요한 답을 따로 보겠다.", "blunt", 2),
    ],
    "내가 반복하는 실수": [
      dialogue("topic.pattern", "topicSelect", "그 질문은 마음에 든다. 자기 반복을 보는 사람은 아직 끝난 게 아니다.", "encouragement", 3),
    ],
  } satisfies DialogueMap,
  birthCheck: [
    dialogue("birth.check", "birthCheck", "좌표가 부족하면 작전이 아니라 감으로 때려 맞히는 소리가 된다. 출생 정보는 가능한 정확히 넣어라.", "reality_check", 4),
    dialogue("birth.unknownTime", "birthCheck", "출생시간을 모르면 일부 전선은 흐릿해진다. 그래도 가능한 범위 안에서 작전은 짠다.", "curious", 5),
  ],
  intensitySelect: {
    soft: [
      dialogue("intensity.soft", "intensitySelect", "순한맛이군. 좋다. 아프게 찌르진 않겠다. 대신 필요한 말은 뺄 생각 없다.", "encouragement", 1),
    ],
    standard: [
      dialogue("intensity.standard", "intensitySelect", "기본맛이면 충분하다. 기분은 조금 상할 수 있다. 그래도 그 정도는 들어야 판이 보인다.", "blunt", 2),
    ],
    roar: [
      dialogue("intensity.roar", "intensitySelect", "사자 포효맛. 네가 고른 거다. 널 부수려는 게 아니라 네 회피를 부수려는 거다.", "blunt", 3),
    ],
  } satisfies Partial<Record<NeoWarRoomIntensityId, NeoOperationDialogue[]>>,
  questionInput: [
    dialogue("question.prompt", "questionInput", "지금 네가 가장 듣기 싫은 문제를 적어라. 거기에 작전의 핵심이 숨어 있을 가능성이 높다.", "curious", 4),
    dialogue("question.honest", "questionInput", "변명도 적어라. 괜찮다. 내가 알아서 걸러낸다.", "blunt", 5),
  ],
  loading: {
    default: [
      dialogue("loading.map", "loading", "네오가 운명의 작전 지도를 펼치는 중...", "analyzing", 1),
      dialogue("loading.seal", "loading", "사자 휘장이 네 운명의 전선을 감지하는 중...", "analyzing", 2),
      dialogue("loading.pattern", "loading", "반복되는 선택을 추적하는 중...", "analyzing", 3),
      dialogue("loading.truth", "loading", "듣기 좋은 말과 필요한 말을 분리하는 중...", "blunt", 4),
      dialogue("loading.core", "loading", "네가 피하고 있던 핵심을 찾는 중...", "reality_check", 5),
      dialogue("loading.briefing", "loading", "작전 브리핑을 작성하는 중...", "completed", 6),
    ],
    saju: [
      dialogue("loading.saju.pillars", "loading", "사주의 네 기둥을 전술 지도에 배치하는 중...", "analyzing", 5),
      dialogue("loading.saju.elements", "loading", "오행의 기울어진 흐름을 확인하는 중...", "analyzing", 6),
      dialogue("loading.saju.ten-gods", "loading", "십성의 움직임에서 반복되는 선택을 추적하는 중...", "curious", 7),
    ],
    ziwei: [
      dialogue("loading.ziwei.command", "loading", "명궁과 신궁의 지휘 체계를 확인하는 중...", "analyzing", 1),
      dialogue("loading.ziwei.board", "loading", "인생판에서 힘이 약해진 자리를 찾는 중...", "reality_check", 2),
      dialogue("loading.ziwei.fude", "loading", "복덕궁의 버티는 힘을 점검하는 중...", "curious", 3),
    ],
    vedic: [
      dialogue("loading.vedic.lagna", "loading", "라그나의 방향과 반복되는 삶의 습관을 대조하는 중...", "analyzing", 4),
      dialogue("loading.vedic.nakshatra", "loading", "나크샤트라가 남긴 마음의 흔적을 읽는 중...", "curious", 5),
      dialogue("loading.vedic.signal", "loading", "익숙한 불안과 진짜 신호를 분리하는 중...", "blunt", 6),
    ],
    astrology: [
      dialogue("loading.astrology.orbit", "loading", "행성의 궤도와 네 감정의 흔들림을 대조하는 중...", "analyzing", 7),
      dialogue("loading.astrology.sun-moon", "loading", "태양과 달의 충돌 지점을 확인하는 중...", "reality_check", 1),
      dialogue("loading.astrology.strategy", "loading", "별자리 위에 숨은 심리 작전을 정리하는 중...", "curious", 2),
    ],
  } satisfies DialogueMap,
  initialResult: [
    dialogue("result.initial", "initialResult", "좋다. 여기까지가 네 운명의 기본 설계다. 그런데 너, 실제로 그렇게 살고 있냐?", "reality_check", 5),
  ],
  realityCheck: [
    dialogue("reality.enter", "realityCheck", "작전 지도만 봐서는 부족하다. 이제 네 실제 현장을 보고해라.", "reality_check", 6),
    dialogue("reality.answer", "realityCheck", "반박해도 된다. 대신 구체적으로 해라. 작전에는 핑계보다 자료가 필요하다.", "curious", 7),
  ],
  refinedResult: [
    dialogue("result.refined", "refinedResult", "답변까지 반영했다. 이제 좀 현실적인 작전이 됐다.", "completed", 3),
  ],
  badge: [
    dialogue("badge.today", "badge", "오늘의 휘장은 칭찬이 아니다. 네가 다시 움직일 수 있다는 증거다.", "completed", 4),
  ],
  closing: [
    dialogue("closing.one", "closing", "흥. 그래도 여기서 끝날 사람은 아니다. 그러니까 하나만 제대로 해라.", "encouragement", 5),
    dialogue("closing.two", "closing", "감동만 하지 마라. 오늘 작전은 하나라도 실행해야 의미가 있다.", "encouragement", 6),
    dialogue("closing.three", "closing", "지금 엉망인 게 끝났다는 뜻은 아니다. 같은 선택만 반복하지 않으면 된다.", "encouragement", 7),
  ],
  error: {
    missingInput: [
      dialogue("error.missingInput", "error", "정보가 부족하다. 이 정도로는 작전이 아니라 감으로 찔러 맞히는 소리가 된다.", "reality_check", 1),
    ],
    auth: [
      dialogue("error.auth", "error", "사자 휘장이 아직 열리지 않았다. 권한 확인부터 끝내라.", "reality_check", 2),
    ],
    generatingFailed: [
      dialogue("error.generatingFailed", "error", "작전 지도가 잠시 흐트러졌다. 네 문제가 약해서가 아니라 연결이 흔들린 거다. 다시 시도해라.", "encouragement", 3),
    ],
  },
} as const;

export function pickNeoDialogue(dialogues: readonly NeoOperationDialogue[] | undefined, seed = 0) {
  if (!dialogues?.length) return neoOperationDialogues.entrance[0];
  const index = Math.abs(seed) % dialogues.length;
  return dialogues[index];
}

export function getNeoMethodDialogue(method: NeoWarRoomConsultMode | "", seed = 0) {
  if (!method) return neoOperationDialogues.methodSelect.default[0];
  return pickNeoDialogue(neoOperationDialogues.methodSelect[method], seed);
}

export function getNeoTopicDialogue(topic: string, seed = 0) {
  return pickNeoDialogue(neoOperationDialogues.topicSelect[topic] || neoOperationDialogues.topicSelect.default, seed);
}

export function getNeoIntensityDialogue(intensity: NeoWarRoomIntensityId | "", seed = 0) {
  return intensity ? pickNeoDialogue(neoOperationDialogues.intensitySelect[intensity], seed) : neoOperationDialogues.intensitySelect.standard[0];
}

export function getNeoLoadingDialogue(method: NeoWarRoomConsultMode | "", stageIndex: number) {
  const methodDialogues = method ? neoOperationDialogues.loading[method] : undefined;
  return pickNeoDialogue([...(methodDialogues || []), ...neoOperationDialogues.loading.default], stageIndex);
}
