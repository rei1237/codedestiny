import { moodOpeningMap, yeonEmotionPoseMap } from "./emotionMap";
import { normalizeFortuneSignal } from "./normalizeFortuneSignal";
import { validateYeonMessage } from "./validateYeonMessage";
import { yeonSampleByKey } from "./sampleYeonMessages";
import type { AstrologyEngineInput, YeonMessageOutput, YeonMood } from "./types";

function defaultByMood(mood: YeonMood) {
  return {
    happy: "오늘은 작은 기쁨을 오래 음미해도 좋아.",
    tired: "오늘은 할 일을 줄이는 것도 중요한 성취야.",
    anxious: "불안을 줄이려면 문제를 작게 나눠보자.",
    lonely: "혼자인 마음은 안부 한 줄에서 천천히 풀릴 수 있어.",
    angry: "감정의 온도를 내리기 위해 잠깐 멈춰 숨을 고르자.",
    blank: "멍한 날엔 회복이 먼저야. 느린 속도를 허락해줘.",
    hopeful: "작은 시작 하나가 기대를 현실로 바꿔줘.",
  }[mood];
}

export function buildYeonPrompt(input: AstrologyEngineInput): string {
  const mood = input.userEmotion?.selectedMood || "blank";
  const signal = normalizeFortuneSignal(input);
  return [
    "너는 연이 캐릭터 말투로 JSON만 반환한다.",
    "사주 데이터는 사용하지 말고 astrologyData만 해석한다.",
    `별자리: ${input.zodiacSign}`,
    `감정: ${mood}`,
    `메인 에너지: ${signal.mainEnergy}`,
    `감정 테마: ${signal.emotionalTheme}`,
    `주의 테마: ${signal.cautionTheme}`,
    `회복 테마: ${signal.recoveryTheme}`,
    "yeon_is_hug.message는 4~5문장, 첫 문장은 감정별 opening 사용.",
    "공포/단정 표현 금지. short_message는 1~2문장.",
  ].join("\n");
}

export function fallbackYeonMessage(input: AstrologyEngineInput): YeonMessageOutput {
  const mood = input.userEmotion?.selectedMood || "blank";
  const opening = moodOpeningMap[mood];
  const pose = yeonEmotionPoseMap[mood];
  const signal = normalizeFortuneSignal(input);

  return {
    zodiac_sign: input.zodiacSign,
    weekly_vibe: {
      keyword: "마음의 리듬 회복",
      sub_keyword: "천천히 다시 맞추기",
      emotional_color: "소프트 스타라이트",
      summary: signal.mainEnergy,
    },
    emotion_adaptive_opening: {
      selected_mood: mood,
      first_sentence: opening,
    },
    yeon_is_hug: {
      title: "연이가 전하는 오늘의 포옹",
      message: [
        opening,
        signal.emotionalTheme,
        signal.cautionTheme,
        defaultByMood(mood),
        "내일을 전부 해결하지 않아도 괜찮아. 오늘은 이불 속 온기부터 믿어봐.",
      ],
    },
    small_joy: {
      item: "따뜻한 물 한 컵",
      action: "마시기 전에 숨을 세 번 고르기",
      reason: "작은 루틴이 마음의 속도를 안정적으로 낮춰줘요.",
    },
    gentle_advice: {
      love: "관계에서 결론을 서두르지 않아도 괜찮아요.",
      work: signal.workHint,
      money: signal.moneyHint,
      relationship: signal.relationshipHint,
    },
    yeon_illustration_prompt: {
      pose: pose.pose,
      expression: pose.expression,
      background: "파스텔 우주 그라데이션, 은은한 별빛 파티클",
      image_prompt: `Cute flower pig Yeon-i, ${pose.pose}, ${pose.expression}, dreamy pastel cosmos with starlight, emotional healing mood`,
    },
    share_card: {
      card_title: `오늘의 마음 별자리 · ${input.zodiacSign}`,
      short_message: "오늘의 속도를 조금만 낮추면, 마음이 다시 나를 따라와요.",
      hashtags: ["#연이의마음별자리", "#코드데스티니", "#오늘의위로"],
    },
  };
}

export function generateYeonMessageFromAstrology(input: AstrologyEngineInput): YeonMessageOutput {
  const mood = input.userEmotion?.selectedMood || "blank";
  const sampleKey = `${input.zodiacSign}:${mood}` as keyof typeof yeonSampleByKey;

  const candidate = yeonSampleByKey[sampleKey]
    ? JSON.parse(JSON.stringify(yeonSampleByKey[sampleKey]))
    : fallbackYeonMessage(input);

  const quality = validateYeonMessage(candidate);
  if (!quality.ok) return fallbackYeonMessage(input);
  return candidate;
}
