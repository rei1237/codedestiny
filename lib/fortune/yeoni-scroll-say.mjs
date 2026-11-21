// 두루마리 하단 연이 말풍선 — 고정 문구, 입력·LLM 없음(master-say 와 같은 규칙).
// 🔴 문구 규칙: 60자 이하, 2문장 이하, 해요체, 단정어(반드시·절대·틀림없이 등)·이모지·공포 표현 금지. test 가 검사한다.
// 같은 (날짜, 키, 톤, 오늘/내일) 은 같은 문구라 SSR·재열람·공유 이미지가 일치한다.
import { dayRotationPick } from './daily-pick.mjs';

export const YEONI_SCROLL_SAY_VERSION = 'yeoni-scroll-say-v1';

/** 총운 점수(0~10) 또는 상태 → 톤. 점수를 모르면 mid. */
export function toneForScore(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return 'mid';
  if (n >= 7) return 'high';
  if (n >= 5) return 'mid';
  return 'low';
}

const TODAY = {
  high: [
    '오늘은 결이 부드러워요. 하고 싶던 일을 하나 꺼내 봐요.',
    '흐름이 가벼운 날이에요. 작은 용기를 내 보기 좋아요.',
    '좋은 기운이 머무는 날이에요. 천천히 즐겨도 괜찮아요.',
    '마음이 가는 쪽으로 한 걸음만 가 봐요. 오늘은 그게 잘 맞아요.',
    '오늘의 기운은 열려 있어요. 먼저 인사를 건네 봐요.',
    '가볍게 시작해도 좋은 날이에요. 부담은 내려놓아요.',
  ],
  mid: [
    '오늘은 차분하게 가요. 한 번에 하나씩이면 충분해요.',
    '무리하지 않아도 되는 날이에요. 내 속도를 지켜 봐요.',
    '잔잔한 하루예요. 작은 루틴이 힘이 돼요.',
    '서두르지 않아도 괜찮아요. 순서대로 해 봐요.',
    '오늘은 정리하는 날로 써 봐요. 마음이 가벼워져요.',
    '평소대로 가도 좋은 날이에요. 여유를 챙겨 봐요.',
  ],
  low: [
    '오늘은 조심조심 가요. 쉬어 가도 괜찮아요.',
    '힘이 좀 필요한 날이에요. 나를 먼저 챙겨 줘요.',
    '큰 결정은 잠시 미뤄 두어도 좋아요. 물 한 잔부터 마셔요.',
    '속도를 낮추면 편해져요. 오늘은 작게 해요.',
    '무거운 마음은 내려놓아요. 따뜻한 차 한 잔이 도움이 돼요.',
    '오늘은 쉬엄쉬엄 가요. 내일은 또 다른 하루예요.',
  ],
};

const TOMORROW = {
  high: [
    '내일은 흐름이 가벼워 보여요. 미리 마음의 준비를 해 둬요.',
    '내일은 해 보고 싶던 일을 꺼내 봐요. 오늘은 가볍게 준비만 해요.',
    '내일의 기운이 열려 있어요. 일찍 쉬고 상쾌하게 맞아요.',
    '내일은 먼저 손을 내밀어 봐요. 좋은 만남이 이어질 수 있어요.',
    '내일은 가볍게 시작해 봐요. 오늘 밤은 편히 쉬어요.',
    '내일을 기대하며 오늘을 마무리해요. 작은 계획 하나면 충분해요.',
  ],
  mid: [
    '내일은 차분히 가요. 해야 할 일을 미리 적어 둬요.',
    '내일도 내 속도로 가면 돼요. 오늘 밤은 마음을 비워요.',
    '잔잔한 하루가 올 거예요. 작은 루틴을 챙겨 봐요.',
    '내일은 서두르지 않아도 괜찮아요. 순서만 정해 둬요.',
    '내일은 정리하기 좋은 날이에요. 오늘은 가볍게 쉬어요.',
    '내일은 평소대로 가도 좋아요. 여유를 한 줌 챙겨 봐요.',
  ],
  low: [
    '내일은 조심조심 가요. 일정에 여유를 두어 봐요.',
    '내일은 힘이 필요할 수 있어요. 오늘 밤 푹 쉬어 둬요.',
    '큰 결정은 내일 미뤄 두어도 좋아요. 마음부터 가볍게 해요.',
    '내일은 속도를 낮춰 봐요. 따뜻한 한 끼를 챙겨요.',
    '내일은 쉬엄쉬엄 가요. 오늘은 일찍 잠자리에 들어요.',
    '내일은 작게 시작해요. 한 가지만 해내면 충분해요.',
  ],
};

/** 모든 문구(테스트·감사용). */
export function allYeoniScrollLines() {
  const rows = [];
  for (const [when, table] of [['today', TODAY], ['tomorrow', TOMORROW]]) {
    for (const [tone, pool] of Object.entries(table)) pool.forEach((text, i) => rows.push({ when, tone, index: i, text }));
  }
  return rows;
}

/**
 * 두루마리 연이 한마디.
 * @param {{dateKey:string, key:string, tomorrow?:boolean, score?:number}} input dateKey = 대상 날짜(KST), key = 띠·체계 키
 * @returns {{text:string, tone:'high'|'mid'|'low'}}
 */
export function yeoniScrollSay({ dateKey, key, tomorrow = false, score } = {}) {
  const tone = toneForScore(score);
  const pool = (tomorrow ? TOMORROW : TODAY)[tone];
  return { text: dayRotationPick(dateKey, `${key}|yeoni-say|${tone}`, pool), tone };
}
